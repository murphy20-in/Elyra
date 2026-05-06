from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.backend.models.notification import Notification, DeviceToken
from app.backend.schemas.notification import DeviceTokenRegister
from app.backend.services.push_service import send_push


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_notification(
        self,
        user_id: UUID,
        type: str,
        title: str,
        body: str,
        data: dict = {},
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            data=data,
            is_read=False,
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)

        tokens_result = await self.db.execute(
            select(DeviceToken).where(
                DeviceToken.user_id == user_id,
                DeviceToken.is_active.is_(True),
            )
        )
        tokens = [t.token for t in tokens_result.scalars().all()]

        if tokens:
            result = await send_push(tokens, title, body, data)

            if result.get("failed_tokens"):
                for token in result["failed_tokens"]:
                    token_result = await self.db.execute(
                        select(DeviceToken).where(DeviceToken.token == token)
                    )
                    token_obj = token_result.scalar_one_or_none()
                    if token_obj:
                        token_obj.is_active = False

                await self.db.commit()

        return notification

    async def list_notifications(
        self,
        user_id: UUID,
        page: int,
        per_page: int,
    ):
        offset = (page - 1) * per_page

        result = await self.db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        notifications = result.scalars().all()

        count_result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id
            )
        )
        total = count_result.scalar()

        unread_result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        unread_count = unread_result.scalar()

        return {
            "notifications": notifications,
            "total": total,
            "unread_count": unread_count,
            "page": page,
        }

    async def mark_read(
        self,
        notification_id: UUID,
        user_id: UUID,
    ) -> None:
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notification = result.scalar_one_or_none()

        if notification:
            notification.is_read = True
            await self.db.commit()

    async def mark_all_read(self, user_id: UUID) -> None:
        result = await self.db.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        notifications = result.scalars().all()

        for n in notifications:
            n.is_read = True

        await self.db.commit()

    async def get_unread_count(self, user_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        return result.scalar()

    async def delete_notification(
        self,
        notification_id: UUID,
        user_id: UUID,
    ) -> None:
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notification = result.scalar_one_or_none()

        if notification:
            await self.db.delete(notification)
            await self.db.commit()

    async def register_device_token(
        self,
        user_id: UUID,
        data: DeviceTokenRegister,
    ) -> None:
        existing = await self.db.execute(
            select(DeviceToken).where(DeviceToken.token == data.token)
        )
        existing_token = existing.scalar_one_or_none()

        if existing_token:
            existing_token.user_id = user_id
            existing_token.platform = data.platform
            existing_token.is_active = True
        else:
            token = DeviceToken(
                user_id=user_id,
                token=data.token,
                platform=data.platform,
                is_active=True,
            )
            self.db.add(token)

        await self.db.commit()

    async def unregister_device_token(
        self,
        user_id: UUID,
        token_id: UUID,
    ) -> None:
        result = await self.db.execute(
            select(DeviceToken).where(
                DeviceToken.id == token_id,
                DeviceToken.user_id == user_id,
            )
        )
        token = result.scalar_one_or_none()

        if token:
            token.is_active = False
            await self.db.commit()