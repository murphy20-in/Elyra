from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.backend.core.database import get_db
from app.backend.core.dependencies import get_current_active_user
from app.backend.core.dependencies import require_active_subscription
from app.backend.models.user import User
from app.backend.services.payment_service import PaymentService, SUBSCRIPTION_PLANS
from app.backend.schemas.payment import (
    SubscribeRequest,
    PaymentResponse,
    SubscriptionResponse,
    PaymentWebhookRequest,
    SubscriptionPlan,
)


router = APIRouter()


@router.get("/plans", response_model=list[SubscriptionPlan])
async def get_plans():
    return [SubscriptionPlan(**p) for p in SUBSCRIPTION_PLANS]


@router.post("/subscribe")
async def create_subscription(
    data: SubscribeRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = PaymentService(db)
        return await svc.create_subscription(user.id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "SUBSCRIBE_FAILED"},
        )


@router.post("/webhook", status_code=200)
async def webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    import json
    data = json.loads(body)

    try:
        svc = PaymentService(db)
        await svc.handle_webhook(data, signature, body)
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "WEBHOOK_FAILED"},
        )


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PaymentService(db)
    subscription = await svc.get_current_subscription(user.id)
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription")
    return SubscriptionResponse.model_validate(subscription)


@router.post("/cancel", status_code=204)
async def cancel_subscription(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        svc = PaymentService(db)
        await svc.cancel_subscription(user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": str(e), "error_code": "CANCEL_FAILED"},
        )


@router.get("/history", response_model=list[PaymentResponse])
async def payment_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PaymentService(db)
    result = await svc.get_payment_history(user.id, page, per_page)
    return [PaymentResponse.model_validate(p) for p in result["payments"]]


@router.get("/premium-only")
async def premium_only(
    user: User = Depends(require_active_subscription),
):
    return {"message": "Premium content"}