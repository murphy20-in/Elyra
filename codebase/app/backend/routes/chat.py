from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.backend.core.database import get_db
from app.backend.core.dependencies import get_current_active_user
from app.backend.core.mongodb import get_mongo_db
from app.backend.models.user import User
from app.backend.services.chat_service import ChatService
from app.backend.schemas.chat import (
    SendMessageRequest,
    MessageResponse,
    ThreadResponse,
    ThreadListResponse,
    MessageListResponse,
    ThreadUpdateRequest,
)


router = APIRouter()


@router.get("/threads", response_model=ThreadListResponse)
async def list_threads(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    mongo_db=Depends(get_mongo_db),
):
    svc = ChatService(db, mongo_db)
    result = await svc.list_threads(user.id, page, per_page)
    return ThreadListResponse(
        threads=[ThreadResponse.model_validate(t) for t in result["threads"]],
        total=result["total"],
    )


@router.get("/threads/{thread_id}/messages", response_model=MessageListResponse)
async def get_messages(
    thread_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    mongo_db=Depends(get_mongo_db),
):
    try:
        svc = ChatService(db, mongo_db)
        result = await svc.get_messages(thread_id, user.id, page, per_page)
        return MessageListResponse(
            messages=result["messages"],
            total=result["total"],
            page=result["page"],
            has_more=result["has_more"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "GET_MESSAGES_FAILED"},
        )


@router.post("/threads/{thread_id}/messages", response_model=MessageResponse)
async def send_message(
    thread_id: UUID,
    data: SendMessageRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    mongo_db=Depends(get_mongo_db),
):
    try:
        svc = ChatService(db, mongo_db)
        message = await svc.send_message(
            thread_id, user.id, data.content, data.message_type
        )
        return MessageResponse(**message)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "SEND_FAILED"},
        )


@router.post("/threads/{thread_id}/read", status_code=204)
async def mark_read(
    thread_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    mongo_db=Depends(get_mongo_db),
):
    svc = ChatService(db, mongo_db)
    await svc.mark_messages_read(thread_id, user.id)


@router.patch("/threads/{thread_id}", response_model=ThreadResponse)
async def update_thread(
    thread_id: UUID,
    data: ThreadUpdateRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    mongo_db=Depends(get_mongo_db),
):
    try:
        svc = ChatService(db, mongo_db)
        thread = await svc.update_thread(
            thread_id, user.id, is_anonymous=data.is_anonymous
        )
        return ThreadResponse.model_validate(thread)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "UPDATE_FAILED"},
        )