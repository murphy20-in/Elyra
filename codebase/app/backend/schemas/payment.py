from datetime import datetime
from decimal import Decimal
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PaymentCreate(BaseModel):
    amount: Decimal
    currency: str = "INR"
    payment_method: Optional[str] = None
    gateway_txn_id: Optional[str] = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    subscription_id: Optional[UUID]
    amount: Decimal
    currency: str
    status: str
    created_at: datetime


class SubscriptionCreate(BaseModel):
    tier: Literal["free", "plus", "premium", "elite"]


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    tier: str
    status: str
    started_at: datetime
    expires_at: Optional[datetime]
    auto_renew: bool