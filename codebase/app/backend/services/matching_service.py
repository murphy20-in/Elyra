import math
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.backend.core.events import MATCH_CREATED, publish_event
from app.backend.models.profile import PublicProfile
from app.backend.models.preference import UserPreference
from app.backend.models.match import Match
from app.backend.models.chat import ChatThread
from app.backend.models.embedding import UserEmbedding
from app.backend.models.audit import AuditLog


class MatchingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        return R * 2 * math.asin(math.sqrt(a))

    @staticmethod
    def _compute_match_score(
        user_prefs: UserPreference,
        user_profile: PublicProfile,
        candidate_profile: PublicProfile,
        embedding_similarity: float,
    ) -> float:
        intent_score = 0.0
        preferred_intents = user_prefs.preferred_intents or []
        if candidate_profile.intent in preferred_intents:
            intent_score = 1.0
        elif preferred_intents:
            intent_score = 0.5

        distance_score = 0.0
        if user_profile.latitude and user_profile.longitude and candidate_profile.latitude and candidate_profile.longitude:
            distance = MatchingService._haversine_km(
                user_profile.latitude,
                user_profile.longitude,
                candidate_profile.latitude,
                candidate_profile.longitude,
            )
            max_dist = user_prefs.max_distance_km or 50
            if distance <= 5:
                distance_score = 1.0
            elif distance <= max_dist:
                distance_score = 1.0 - (distance - 5) / (max_dist - 5)

        preference_score = 0.0
        pref_genders = user_prefs.preferred_genders or []
        if candidate_profile.gender_identity in pref_genders or not pref_genders:
            preference_score += 0.5

        pref_orientations = user_prefs.preferred_orientations or []
        if candidate_profile.sexual_orientation in pref_orientations or not pref_orientations:
            preference_score += 0.5

        age_min = user_prefs.age_min or 18
        age_max = user_prefs.age_max or 50
        if age_min <= candidate_profile.age <= age_max:
            preference_score = preference_score * 0.15 / 0.5

        return (
            intent_score * 0.30 +
            embedding_similarity * 0.35 +
            distance_score * 0.20 +
            preference_score * 0.15
        )

    async def get_candidates(
        self,
        user_id: UUID,
        page: int,
        per_page: int,
    ):
        user_pref_result = await self.db.execute(
            select(UserPreference).where(UserPreference.user_id == user_id)
        )
        user_prefs = user_pref_result.scalar_one_or_none()

        user_profile_result = await self.db.execute(
            select(PublicProfile).where(PublicProfile.user_id == user_id)  # noqa: F823
        )
        user_profile = user_profile_result.scalar_one_or_none()

        blocked_result = await self.db.execute(
            text("""
                SELECT blocked_user_id FROM blocks WHERE blocker_id = :user_id
                UNION
                SELECT user_id_2 FROM matches WHERE user_id_1 = :user_id
                UNION
                SELECT user_id_1 FROM matches WHERE user_id_2 = :user_id
            """),
            {"user_id": str(user_id)}
        )
        blocked_ids = [row[0] for row in blocked_result.fetchall()]

        redis_passed_key = f"elyra:passed:{user_id}"
        from app.backend.core.redis_client import get_redis
        redis = await get_redis()
        passed_ids = await redis.smembers(redis_passed_key)
        all_excluded = blocked_ids + list(passed_ids)

        embedding_result = await self.db.execute(
            select(UserEmbedding).where(UserEmbedding.user_id == user_id)
        )
        user_embedding = embedding_result.scalar_one_or_none()

        if user_embedding and user_embedding.embedding:
            embedding_bytes = user_embedding.embedding
            result = await self.db.execute(
                text("""
                    SELECT ue.user_id, ue.embedding, pp.id, pp.display_name, pp.age,
                           pp.gender_identity, pp.bio, pp.city, pp.state,
                           pp.latitude, pp.longitude, pp.intent, pp.profile_photo_url,
                           (ue.embedding <=> :user_embedding::vector) as similarity
                    FROM user_embeddings ue
                    JOIN public_profiles pp ON pp.user_id = ue.user_id
                    WHERE ue.user_id != :user_id
                    AND pp.is_visible = true
                    AND (:excluded_ids::text[] IS NULL OR ue.user_id NOT IN (:excluded_ids))
                    ORDER BY similarity
                    LIMIT 200
                """),
                {
                    "user_id": str(user_id),
                    "user_embedding": embedding_bytes.hex(),
                    "excluded_ids": ",".join(all_excluded) if all_excluded else None,
                }
            )
        else:
            result = await self.db.execute(
                select(PublicProfile)
                .where(PublicProfile.user_id != user_id)
                .where(PublicProfile.is_visible.is_(True))
                .limit(200)
            )

        candidates = []
        for row in result.fetchall():
            if isinstance(row, PublicProfile):
                candidate = row
                similarity = 0.5
            else:
                from app.backend.models.profile import PublicProfile
                candidate = PublicProfile(
                    id=row[2],
                    user_id=row[0],
                    display_name=row[3],
                    age=row[4],
                    gender_identity=row[5],
                    bio=row[6],
                    city=row[7],
                    state=row[8],
                    latitude=row[9],
                    longitude=row[10],
                    intent=row[11],
                    profile_photo_url=row[12],
                    sexual_orientation="",
                    pronouns=None,
                    photos=[],
                    is_visible=True,
                )
                similarity = 1.0 - (row[13] or 0.5)

            if user_prefs:
                age_min = user_prefs.age_min or 18
                age_max = user_prefs.age_max or 50
                if not age_min <= candidate.age <= age_max:
                    continue

            if user_profile and candidate.latitude and candidate.longitude:
                distance = self._haversine_km(
                    user_profile.latitude, user_profile.longitude,
                    candidate.latitude, candidate.longitude,
                )
            else:
                distance = None

            score = self._compute_match_score(user_prefs, user_profile, candidate, similarity)

            candidates.append({
                "user_id": candidate.user_id,
                "display_name": candidate.display_name,
                "age": candidate.age,
                "gender_identity": candidate.gender_identity,
                "bio": candidate.bio,
                "city": candidate.city,
                "intent": candidate.intent,
                "profile_photo_url": candidate.profile_photo_url,
                "compatibility_score": score,
                "distance_km": distance,
            })

        candidates.sort(key=lambda x: x["compatibility_score"], reverse=True)

        total = len(candidates)
        start = (page - 1) * per_page
        end = start + per_page
        paginated = candidates[start:end]
        total_pages = (total + per_page - 1) // per_page

        return {
            "candidates": paginated,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        }

    async def like_user(
        self,
        liker_id: UUID,
        liked_id: UUID,
    ) -> dict:
        if liker_id == liked_id:
            raise ValueError("Cannot like yourself")

        user1_id, user2_id = sorted([str(liker_id), str(liked_id)])

        result = await self.db.execute(
            select(Match).where(
                Match.user_id_1 == user1_id,
                Match.user_id_2 == user2_id,
            )
        )
        existing_match = result.scalar_one_or_none()

        is_liker_1 = str(liker_id) == user1_id

        if existing_match:
            if is_liker_1:
                existing_match.liked_by_1 = True
            else:
                existing_match.liked_by_2 = True

            if existing_match.liked_by_1 and existing_match.liked_by_2:
                existing_match.status = "matched"
                existing_match.matched_at = datetime.now(timezone.utc)
                existing_match.match_score = 1.0

                thread = ChatThread(
                    match_id=existing_match.id,
                    participant_1=user1_id,
                    participant_2=user2_id,
                    is_active=True,
                )
                self.db.add(thread)

                await publish_event(MATCH_CREATED, {
                    "match_id": str(existing_match.id),
                    "user_id_1": user1_id,
                    "user_id_2": user2_id,
                })
        else:
            new_match = Match(
                user_id_1=user1_id,
                user_id_2=user2_id,
                liked_by_1=is_liker_1,
                liked_by_2=not is_liker_1,
                status="pending",
            )
            self.db.add(new_match)
            await self.db.flush()
            existing_match = new_match

        await self.db.commit()

        is_mutual = (
            existing_match.status == "matched" and
            existing_match.liked_by_1 and
            existing_match.liked_by_2
        )

        return {
            "matched": is_mutual,
            "match_id": str(existing_match.id) if is_mutual else None,
        }

    async def pass_user(self, passer_id: UUID, passed_id: UUID) -> None:
        from app.backend.core.redis_client import get_redis
        redis = await get_redis()
        key = f"elyra:passed:{passer_id}"
        await redis.sadd(key, str(passed_id))

    async def unmatch(self, match_id: UUID, user_id: UUID) -> None:
        result = await self.db.execute(
            select(Match).where(Match.id == match_id)
        )
        match = result.scalar_one_or_none()

        if not match:
            raise ValueError("Match not found")

        if str(user_id) != match.user_id_1 and str(user_id) != match.user_id_2:
            raise ValueError("Not authorized to unmatch")

        match.status = "unmatched"

        thread_result = await self.db.execute(
            select(ChatThread).where(ChatThread.match_id == match_id)
        )
        thread = thread_result.scalar_one_or_none()
        if thread:
            thread.is_active = False

        audit = AuditLog(
            actor_id=user_id,
            action="match.unmatch",
            target_type="match",
            target_id=match_id,
        )
        self.db.add(audit)
        await self.db.commit()