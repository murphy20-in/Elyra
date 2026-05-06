"""Payment & subscription Pydantic schemas."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


SubscriptionTier = Literal["free", "plus", "premium", "elite"]


class SubscriptionPlan(BaseModel):
    tier: SubscriptionTier
    name: str
    price_monthly: Decimal = Decimal("0")
    price_yearly: Decimal = Decimal("0")
    currency: str = "INR"
    features: list[str] = []


class SubscribeRequest(BaseModel):
    tier: SubscriptionTier
    billing_cycle: Literal["monthly", "yearly"] = "monthly"


class PaymentCreate(BaseModel):
    amount: Decimal
    currency: str = "INR"
    payment_method: Optional[str] = None
    gateway_txn_id: Optional[str] = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    subscription_id: Optional[UUID] = None
    amount: Decimal
    currency: str = "INR"
    payment_method: Optional[str] = None
    payment_gateway: Optional[str] = None
    gateway_txn_id: Optional[str] = None
    status: str
    created_at: datetime


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    tier: str
    status: str
    started_at: datetime
    expires_at: Optional[datetime] = None
    auto_renew: bool = True


class PaymentWebhookRequest(BaseModel):
    event: str
    payload: dict[str, Any] = {}
