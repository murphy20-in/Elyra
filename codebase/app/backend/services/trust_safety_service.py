from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from fastapi import HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.backend.core.events import REPORT_CREATED, publish_event
from app.backend.core.redis_client import get_redis
from app.backend.models.safety import Report, Block
from app.backend.models.match import Match
from app.backend.models.audit import AuditLog
from app.backend.models.user import User
from app.backend.schemas.safety import ReportCreate, BlockCreate, RiskScoreResponse


class TrustSafetyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_report(
        self,
        reporter_id: UUID,
        data: ReportCreate,
    ) -> Report:
        if reporter_id == data.reported_user_id:
            raise ValueError("Cannot report yourself")

        report = Report(
            reporter_id=reporter_id,
            reported_user_id=data.reported_user_id,
            reason=data.reason,
            description=data.description,
            evidence_urls=data.evidence_urls or [],
            status="pending",
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)

        await publish_event(REPORT_CREATED, {
            "reporter_id": str(reporter_id),
            "reported_user_id": str(data.reported_user_id),
            "reason": data.reason,
        })

        audit = AuditLog(
            actor_id=reporter_id,
            action="report.create",
            target_type="report",
            target_id=report.id,
            extra={"reason": data.reason},
        )
        self.db.add(audit)
        await self.db.commit()

        return report

    async def list_reports(
        self,
        page: int,
        per_page: int,
        status: Optional[str] = None,
    ):
        offset = (page - 1) * per_page

        query = select(Report).order_by(Report.created_at.desc())

        if status:
            query = query.where(Report.status == status)

        result = await self.db.execute(
            query.offset(offset).limit(per_page)
        )
        reports = result.scalars().all()

        count_query = select(Report)
        if status:
            count_query = count_query.where(Report.status == status)
        count_result = await self.db.execute(count_query)
        total = len(count_result.scalars().all())

        return {"reports": reports, "total": total}

    async def update_report_status(
        self,
        report_id: UUID,
        status: str,
        reviewer_id: UUID,
    ) -> Report:
        result = await self.db.execute(
            select(Report).where(Report.id == report_id)
        )
        report = result.scalar_one_or_none()

        if not report:
            raise ValueError("Report not found")

        report.status = status
        report.reviewed_by = reviewer_id

        if status in ["resolved", "dismissed"]:
            report.resolved_at = datetime.now(timezone.utc)

        audit = AuditLog(
            actor_id=reviewer_id,
            action="report.update_status",
            target_type="report",
            target_id=report_id,
            extra={"status": status},
        )
        self.db.add(audit)
        await self.db.commit()

        return report

    async def block_user(
        self,
        blocker_id: UUID,
        data: BlockCreate,
    ) -> Block:
        if blocker_id == data.blocked_user_id:
            raise ValueError("Cannot block yourself")

        existing = await self.db.execute(
            select(Block).where(
                Block.blocker_id == blocker_id,
                Block.blocked_user_id == data.blocked_user_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Already blocked")

        block = Block(
            blocker_id=blocker_id,
            blocked_user_id=data.blocked_user_id,
        )
        self.db.add(block)

        match_result = await self.db.execute(
            select(Match).where(
                ((Match.user_id_1 == str(blocker_id)) & (Match.user_id_2 == str(data.blocked_user_id))) |
                ((Match.user_id_1 == str(data.blocked_user_id)) & (Match.user_id_2 == str(blocker_id)))
            )
        )
        match = match_result.scalar_one_or_none()
        if match:
            match.status = "unmatched"

        audit = AuditLog(
            actor_id=blocker_id,
            action="user.block",
            target_type="block",
            extra={"blocked_user_id": str(data.blocked_user_id)},
        )
        self.db.add(audit)
        await self.db.commit()

        return block

    async def unblock_user(
        self,
        blocker_id: UUID,
        blocked_id: UUID,
    ) -> None:
        result = await self.db.execute(
            select(Block).where(
                Block.blocker_id == blocker_id,
                Block.blocked_user_id == blocked_id,
            )
        )
        block = result.scalar_one_or_none()

        if block:
            await self.db.delete(block)
            await self.db.commit()

    async def get_blocks(self, user_id: UUID) -> list[Block]:
        result = await self.db.execute(
            select(Block).where(Block.blocker_id == user_id)
        )
        return result.scalars().all()

    async def calculate_risk_score(
        self,
        user_id: UUID,
    ) -> RiskScoreResponse:
        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        total_reports_result = await self.db.execute(
            select(func.count()).where(Report.reported_user_id == user_id)
        )
        total_reports = total_reports_result.scalar() or 0

        upheld_result = await self.db.execute(
            select(func.count()).where(
                Report.reported_user_id == user_id,
                Report.status == 'resolved'
            )
        )
        upheld_reports = upheld_result.scalar() or 0

        report_score = min(total_reports / 10.0, 1.0)

        upheld_ratio = (upheld_reports / total_reports) if total_reports > 0 else 0.0

        account_age_days = (datetime.now(timezone.utc) - user.created_at).days
        if account_age_days < 7:
            age_score = 1.0
        elif account_age_days < 30:
            age_score = 0.5
        else:
            age_score = 0.0

        verification_penalty = 0.0 if user.is_verified else 0.5

        redis = await get_redis()
        toxicity_scores_raw = await redis.lrange(f"toxicity_history:{user_id}", 0, 49)
        if toxicity_scores_raw:
            scores = [float(s) for s in toxicity_scores_raw]
            avg_toxicity = sum(scores) / len(scores)
        else:
            avg_toxicity = 0.0

        final_score = (
            report_score    * 0.30 +
            upheld_ratio    * 0.25 +
            avg_toxicity    * 0.20 +
            age_score       * 0.10 +
            verification_penalty * 0.15
        )
        final_score = min(max(final_score, 0.0), 1.0)

        factors = []
        if total_reports > 0:
            factors.append(f"{total_reports}_reports_received")
        if upheld_reports > 0:
            factors.append(f"{upheld_reports}_upheld_reports")
        if avg_toxicity > 0.3:
            factors.append(f"high_chat_toxicity_avg_{avg_toxicity:.2f}")
        if account_age_days < 7:
            factors.append("account_under_7_days")
        if not user.is_verified:
            factors.append("not_verified")

        return RiskScoreResponse(
            user_id=user_id,
            risk_score=round(final_score, 4),
            report_count=total_reports,
            factors=factors,
        )