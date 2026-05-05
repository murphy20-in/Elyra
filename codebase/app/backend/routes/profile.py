from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.backend.core.database import get_db
from app.backend.core.redis_client import get_redis
from app.backend.core.dependencies import get_current_active_user
from app.backend.models.user import User
from app.backend.services.profile_service import ProfileService
from app.backend.schemas.profile import (
    PublicProfileUpdate,
    PublicProfileResponse,
    PrivateProfileUpdate,
    PreferenceUpdate,
    OwnProfileResponse,
    PreferenceResponse,
    PhotoUploadResponse,
)


router = APIRouter()


@router.get("/me", response_model=OwnProfileResponse)
async def get_my_profile(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    svc = ProfileService(db, redis)
    return await svc.get_own_profile(user.id)


@router.put("/public", response_model=PublicProfileResponse)
async def update_public_profile(
    data: PublicProfileUpdate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = ProfileService(db, redis)
        return await svc.update_public_profile(user.id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "UPDATE_FAILED"},
        )


@router.put("/private", status_code=204)
async def update_private_profile(
    data: PrivateProfileUpdate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = ProfileService(db, redis)
        await svc.update_private_profile(user.id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "UPDATE_FAILED"},
        )


@router.post("/photos", response_model=PhotoUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        content = await file.read()
        svc = ProfileService(db, redis)
        return await svc.upload_photo(user.id, content, file.content_type)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "UPLOAD_FAILED"},
        )


@router.delete("/photos/{index}", status_code=204)
async def delete_photo(
    index: int,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = ProfileService(db, redis)
        await svc.delete_photo(user.id, index)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "DELETE_FAILED"},
        )


@router.post("/reveal/{target_user_id}", status_code=204)
async def reveal_to(
    target_user_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = ProfileService(db, redis)
        await svc.reveal_private(user.id, target_user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "REVEAL_FAILED"},
        )


@router.delete("/reveal/{target_user_id}", status_code=204)
async def revoke_reveal(
    target_user_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = ProfileService(db, redis)
        await svc.revoke_reveal(user.id, target_user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "REVOKE_FAILED"},
        )


@router.get("/private/{owner_id}")
async def view_private_profile(
    owner_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = ProfileService(db, redis)
        return await svc.view_private_profile(user.id, owner_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"detail": str(e), "error_code": "ACCESS_DENIED"},
        )


@router.get("/preferences", response_model=PreferenceResponse)
async def get_preferences(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    svc = ProfileService(db, redis)
    return await svc.get_own_profile(user.id)


@router.put("/preferences", response_model=PreferenceResponse)
async def update_preferences(
    data: PreferenceUpdate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        svc = ProfileService(db, redis)
        return await svc.update_preferences(user.id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "UPDATE_FAILED"},
        )