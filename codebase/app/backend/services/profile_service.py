import uuid
from io import BytesIO

import httpx
from PIL import Image

from app.backend.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.backend.core.security import get_encryption_key, encrypt_field, decrypt_field
from app.backend.core.events import PROFILE_UPDATED, PREFERENCES_UPDATED, publish_event
from app.backend.models.profile import PublicProfile, PrivateProfile
from app.backend.models.preference import UserPreference
from app.backend.models.audit import AuditLog
from app.backend.schemas.profile import (
    PublicProfileUpdate,
    PrivateProfileUpdate,
    PreferenceUpdate,
    OwnProfileResponse,
    PublicProfileResponse,
    PrivateProfileResponse,
    PreferenceResponse,
    PhotoUploadResponse,
)
from app.backend.services.storage_service import upload_file, delete_file, compute_file_hash


class ProfileService:
    def __init__(self, db: AsyncSession, redis):
        self.db = db
        self.redis = redis

    async def get_own_profile(self, user_id: uuid.UUID) -> OwnProfileResponse:
        profile_result = await self.db.execute(
            select(PublicProfile).where(PublicProfile.user_id == user_id)
        )
        public_profile = profile_result.scalar_one_or_none()

        private_result = await self.db.execute(
            select(PrivateProfile).where(PrivateProfile.user_id == user_id)
        )
        private_profile = private_result.scalar_one_or_none()

        pref_result = await self.db.execute(
            select(UserPreference).where(UserPreference.user_id == user_id)
        )
        preferences = pref_result.scalar_one_or_none()

        if not public_profile or not preferences:
            raise ValueError("Profile not found")

        decrypted_private = None
        if private_profile:
            enc_key = get_encryption_key()
            decrypted_private = PrivateProfileResponse(
                real_name=decrypt_field(private_profile.real_name_enc, enc_key).decode() if private_profile.real_name_enc else None,
                phone=decrypt_field(private_profile.phone_enc, enc_key).decode() if private_profile.phone_enc else None,
                address=decrypt_field(private_profile.address_enc, enc_key).decode() if private_profile.address_enc else None,
                reveal_to=private_profile.reveal_to or [],
            )

        return OwnProfileResponse(
            public=PublicProfileResponse(
                id=public_profile.id,
                user_id=public_profile.user_id,
                display_name=public_profile.display_name,
                age=public_profile.age,
                gender_identity=public_profile.gender_identity,
                sexual_orientation=public_profile.sexual_orientation,
                pronouns=public_profile.pronouns,
                bio=public_profile.bio,
                city=public_profile.city,
                state=public_profile.state,
                intent=public_profile.intent,
                profile_photo_url=public_profile.profile_photo_url,
                photos=public_profile.photos or [],
                is_visible=public_profile.is_visible,
                is_verified=False,
            ),
            private=decrypted_private,
            preferences=PreferenceResponse(
                id=preferences.id,
                user_id=preferences.user_id,
                preferred_genders=preferences.preferred_genders or [],
                preferred_orientations=preferences.preferred_orientations or [],
                age_min=preferences.age_min,
                age_max=preferences.age_max,
                max_distance_km=preferences.max_distance_km,
                preferred_intents=preferences.preferred_intents or [],
                deal_breakers=preferences.deal_breakers or {},
            ),
        )

    async def update_public_profile(
        self,
        user_id: uuid.UUID,
        data: PublicProfileUpdate,
    ) -> PublicProfileResponse:
        result = await self.db.execute(
            select(PublicProfile).where(PublicProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            raise ValueError("Profile not found")

        if data.bio:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{settings.MODERATION_SERVICE_URL}/moderate/text",
                    json={"text": data.bio},
                    timeout=5.0,
                )
                if resp.status_code == 200:
                    moderation = resp.json()
                    if moderation.get("action") == "block":
                        raise ValueError("Profile content violates community guidelines")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)

        await self.db.commit()
        await self.db.refresh(profile)

        await publish_event(PROFILE_UPDATED, {"user_id": str(user_id)})

        audit = AuditLog(
            actor_id=user_id,
            action="profile.update",
            target_type="public_profile",
            target_id=profile.id,
        )
        self.db.add(audit)
        await self.db.commit()

        return PublicProfileResponse(
            id=profile.id,
            user_id=profile.user_id,
            display_name=profile.display_name,
            age=profile.age,
            gender_identity=profile.gender_identity,
            sexual_orientation=profile.sexual_orientation,
            pronouns=profile.pronouns,
            bio=profile.bio,
            city=profile.city,
            state=profile.state,
            latitude=profile.latitude,
            longitude=profile.longitude,
            intent=profile.intent,
            profile_photo_url=profile.profile_photo_url,
            photos=profile.photos or [],
            is_visible=profile.is_visible,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )

    async def update_private_profile(
        self,
        user_id: uuid.UUID,
        data: PrivateProfileUpdate,
    ) -> None:
        result = await self.db.execute(
            select(PrivateProfile).where(PrivateProfile.user_id == user_id)
        )
        private = result.scalar_one_or_none()

        if not private:
            raise ValueError("Private profile not found")

        enc_key = get_encryption_key()

        if data.real_name is not None:
            private.real_name_enc = encrypt_field(data.real_name, enc_key)
        if data.phone is not None:
            private.phone_enc = encrypt_field(data.phone, enc_key)
        if data.address is not None:
            private.address_enc = encrypt_field(data.address, enc_key)
        if data.reveal_to is not None:
            private.reveal_to = data.reveal_to

        await self.db.commit()

        audit = AuditLog(
            actor_id=user_id,
            action="private_profile.update",
            target_type="private_profile",
            target_id=private.id,
        )
        self.db.add(audit)
        await self.db.commit()

    async def upload_photo(
        self,
        user_id: uuid.UUID,
        file_content: bytes,
        content_type: str,
    ) -> PhotoUploadResponse:
        if content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise ValueError("Invalid image type. Allowed: JPEG, PNG, WebP")

        if len(file_content) > settings.MAX_PHOTO_SIZE_MB * 1024 * 1024:
            raise ValueError(f"File too large. Max size: {settings.MAX_PHOTO_SIZE_MB}MB")

        try:
            img = Image.open(BytesIO(file_content))
            img.verify()
        except Exception:
            raise ValueError("Invalid or corrupted image file")

        img = Image.open(BytesIO(file_content))
        data = list(img.getdata())
        image_without_exif = Image.new(img.mode, img.size)
        image_without_exif.putdata(data)

        max_dim = max(img.width, img.height)
        if max_dim > 1600:
            ratio = 1600 / max_dim
            new_width = int(img.width * ratio)
            new_height = int(img.height * ratio)
            resized: Image.Image = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            img = resized

        output = BytesIO()
        img.save(output, format="JPEG", quality=85)
        file_content = output.getvalue()

        file_hash = compute_file_hash(file_content)
        is_blocked = await self.redis.get(f"elyra:blocked_images:{file_hash}")
        if is_blocked:
            raise ValueError("This image has been flagged as inappropriate")

        async with httpx.AsyncClient() as client:
            files = {"image": ("photo.jpg", file_content, "image/jpeg")}
            resp = await client.post(
                f"{settings.IMAGE_SERVICE_URL}/moderate/image",
                files=files,
                timeout=10.0,
            )
            if resp.status_code == 200:
                moderation = resp.json()
                if moderation.get("action") == "block":
                    await self.redis.set(f"elyra:blocked_images:{file_hash}", "1", ex=86400)
                    raise ValueError("Image violates community guidelines")

        key = f"profiles/{user_id}/{uuid.uuid4()}.jpg"
        url = await upload_file(file_content, key, "image/jpeg")

        result = await self.db.execute(
            select(PublicProfile).where(PublicProfile.user_id == user_id)
        )
        profile = result.scalar_one()

        photos = profile.photos or []
        if len(photos) >= 6:
            raise ValueError("Maximum 6 photos allowed")

        photos.append(url)
        profile.photos = photos

        if not profile.profile_photo_url:
            profile.profile_photo_url = url

        await self.db.commit()

        return PhotoUploadResponse(
            url=url,
            index=len(photos) - 1,
            total_photos=len(photos),
        )

    async def delete_photo(self, user_id: uuid.UUID, index: int) -> None:
        result = await self.db.execute(
            select(PublicProfile).where(PublicProfile.user_id == user_id)
        )
        profile = result.scalar_one()

        photos = profile.photos or []
        if index < 0 or index >= len(photos):
            raise ValueError("Invalid photo index")

        url = photos[index]
        key = url.split(f"{settings.S3_BUCKET}/")[-1]
        await delete_file(key)

        photos.pop(index)
        profile.photos = photos

        if profile.profile_photo_url == url:
            profile.profile_photo_url = photos[0] if photos else None

        await self.db.commit()

    async def reveal_private(
        self,
        owner_id: uuid.UUID,
        target_user_id: uuid.UUID,
    ) -> None:
        result = await self.db.execute(
            select(PrivateProfile).where(PrivateProfile.user_id == owner_id)
        )
        private = result.scalar_one()

        reveal_list = private.reveal_to or []
        if str(target_user_id) not in reveal_list:
            reveal_list.append(str(target_user_id))
            private.reveal_to = reveal_list
            await self.db.commit()

        audit = AuditLog(
            actor_id=owner_id,
            action="private_profile.reveal",
            target_type="private_profile",
            target_id=private.id,
            extra={"revealed_to": str(target_user_id)},
        )
        self.db.add(audit)
        await self.db.commit()

        from app.backend.services.notification_service import NotificationService
        notif_svc = NotificationService(self.db)
        await notif_svc.create_notification(
            target_user_id,
            "system",
            "Profile Revealed",
            "Someone has revealed their private information to you",
            {"owner_id": str(owner_id)},
        )

    async def revoke_reveal(
        self,
        owner_id: uuid.UUID,
        target_user_id: uuid.UUID,
    ) -> None:
        result = await self.db.execute(
            select(PrivateProfile).where(PrivateProfile.user_id == owner_id)
        )
        private = result.scalar_one()

        reveal_list = private.reveal_to or []
        if str(target_user_id) in reveal_list:
            reveal_list.remove(str(target_user_id))
            private.reveal_to = reveal_list
            await self.db.commit()

        audit = AuditLog(
            actor_id=owner_id,
            action="private_profile.revoke",
            target_type="private_profile",
            target_id=private.id,
            extra={"revoked_from": str(target_user_id)},
        )
        self.db.add(audit)
        await self.db.commit()

    async def view_private_profile(
        self,
        requester_id: uuid.UUID,
        owner_id: uuid.UUID,
    ) -> PrivateProfileResponse:
        result = await self.db.execute(
            select(PrivateProfile).where(PrivateProfile.user_id == owner_id)
        )
        private = result.scalar_one_or_none()

        if not private:
            raise ValueError("Private profile not found")

        reveal_list = private.reveal_to or []
        if str(requester_id) not in reveal_list:
            raise ValueError("You don't have permission to view this profile")

        enc_key = get_encryption_key()

        audit = AuditLog(
            actor_id=requester_id,
            action="private_profile.viewed",
            target_type="private_profile",
            target_id=private.id,
        )
        self.db.add(audit)
        await self.db.commit()

        return PrivateProfileResponse(
            real_name=decrypt_field(private.real_name_enc, enc_key).decode() if private.real_name_enc else None,
            phone=decrypt_field(private.phone_enc, enc_key).decode() if private.phone_enc else None,
            address=decrypt_field(private.address_enc, enc_key).decode() if private.address_enc else None,
            reveal_to=private.reveal_to or [],
        )

    async def update_preferences(
        self,
        user_id: uuid.UUID,
        data: PreferenceUpdate,
    ) -> PreferenceResponse:
        result = await self.db.execute(
            select(UserPreference).where(UserPreference.user_id == user_id)
        )
        prefs = result.scalar_one_or_none()

        if not prefs:
            raise ValueError("Preferences not found")

        if data.age_min is not None and data.age_max is not None:
            if data.age_min > data.age_max:
                raise ValueError("Minimum age cannot be greater than maximum age")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(prefs, field, value)

        await self.db.commit()
        await self.db.refresh(prefs)

        await publish_event(PREFERENCES_UPDATED, {"user_id": str(user_id)})

        return PreferenceResponse(
            id=prefs.id,
            user_id=prefs.user_id,
            preferred_genders=prefs.preferred_genders or [],
            preferred_orientations=prefs.preferred_orientations or [],
            age_min=prefs.age_min,
            age_max=prefs.age_max,
            max_distance_km=prefs.max_distance_km,
            preferred_intents=prefs.preferred_intents or [],
            deal_breakers=prefs.deal_breakers or {},
        )