from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.backend.core.database import get_db
from app.backend.core.dependencies import get_current_active_user
from app.backend.models.user import User
from app.backend.services.notification_service import NotificationService
from app.backend.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    DeviceTokenRegister,
)


router = APIRouter()


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = NotificationService(db)
    result = await svc.list_notifications(user.id, page, per_page)
    return NotificationListResponse(
        notifications=[NotificationResponse.model_validate(n) for n in result["notifications"]],
        unread_count=result["unread_count"],
        total=result["total"],
        page=result["page"],
    )


@router.post("/{notification_id}/read", status_code=204)
async def mark_read(
    notification_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = NotificationService(db)
    await svc.mark_read(notification_id, user.id)


@router.post("/read-all", status_code=204)
async def mark_all_read(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = NotificationService(db)
    await svc.mark_all_read(user.id)


@router.get("/unread-count")
async def get_unread_count(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = NotificationService(db)
    count = await svc.get_unread_count(user.id)
    return {"unread_count": count}


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = NotificationService(db)
    await svc.delete_notification(notification_id, user.id)


@router.post("/devices", status_code=201)
async def register_device(
    data: DeviceTokenRegister,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = NotificationService(db)
    await svc.register_device_token(user.id, data)
    return {"message": "Device registered"}


@router.delete("/devices/{token_id}", status_code=204)
async def unregister_device(
    token_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = NotificationService(db)
    await svc.unregister_device_token(user.id, token_id)