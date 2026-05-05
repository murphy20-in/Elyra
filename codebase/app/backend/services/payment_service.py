from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

import razorpay
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.backend.core.config import settings
from app.backend.core.events import PAYMENT_COMPLETED, publish_event
from app.backend.models.subscription import Subscription
from app.backend.models.payment import Payment
from app.backend.models.audit import AuditLog
from app.backend.schemas.payment import SubscribeRequest


SUBSCRIPTION_PLANS = [
    {
        "tier": "free",
        "name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "currency": "INR",
        "features": ["Basic matching", "5 likes/day"],
    },
    {
        "tier": "plus",
        "name": "Plus",
        "price_monthly": 499,
        "price_yearly": 4990,
        "currency": "INR",
        "features": ["Unlimited likes", "See who liked you", "No ads"],
    },
    {
        "tier": "premium",
        "name": "Premium",
        "price_monthly": 999,
        "price_yearly": 9990,
        "currency": "INR",
        "features": [
            "Unlimited likes",
            "Advanced filters",
            "Priority matching",
            "Read receipts",
        ],
    },
    {
        "tier": "elite",
        "name": "Elite",
        "price_monthly": 1999,
        "price_yearly": 19990,
        "currency": "INR",
        "features": [
            "Everything in Premium",
            "Profile boost",
            "Incognito mode",
            "Priority support",
        ],
    },
]


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.razorpay = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    def get_plans(self) -> list[dict]:
        return SUBSCRIPTION_PLANS

    async def create_subscription(
        self,
        user_id: UUID,
        data: SubscribeRequest,
    ) -> dict:
        plan = next((p for p in SUBSCRIPTION_PLANS if p["tier"] == data.tier), None)
        if not plan:
            raise ValueError("Invalid tier")

        amount = plan["price_yearly"] if data.billing_cycle == "yearly" else plan["price_monthly"]
        amount_paise = int(amount * 100)

        if amount_paise > 0:
            razorpay_order = self.razorpay.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"sub_{user_id}_{datetime.now().timestamp()}",
            })
        else:
            razorpay_order = {"id": "free_plan"}

        subscription = Subscription(
            user_id=user_id,
            tier=data.tier,
            status="active",
            expires_at=datetime.now(timezone.utc) + (timedelta(days=365) if data.billing_cycle == "yearly" else timedelta(days=30)),
            auto_renew=True,
        )
        self.db.add(subscription)
        await self.db.flush()

        payment = Payment(
            user_id=user_id,
            subscription_id=subscription.id,
            amount=amount,
            currency="INR",
            payment_method=data.payment_method,
            payment_gateway="razorpay",
            gateway_txn_id=razorpay_order.get("id", "free"),
            status="completed" if amount_paise == 0 else "pending",
        )
        self.db.add(payment)

        await self.db.commit()

        return {
            "order_id": razorpay_order.get("id"),
            "amount": amount,
            "currency": "INR",
            "subscription_id": str(subscription.id),
        }

    async def handle_webhook(
        self,
        data: dict,
        signature: str,
        body: bytes,
    ) -> None:
        try:
            self.razorpay.utility.verify_webhook_signature(
                body, signature, settings.RAZORPAY_WEBHOOK_SECRET
            )
        except Exception as e:
            raise ValueError(f"Invalid signature: {e}")

        gateway_txn_id = data.get("order_id") or data.get("id")
        payment_result = await self.db.execute(
            select(Payment).where(Payment.gateway_txn_id == gateway_txn_id)
        )
        payment = payment_result.scalar_one_or_none()

        if not payment:
            return

        event = data.get("event")
        if event == "payment.captured":
            payment.status = "completed"

            if payment.subscription_id:
                sub_result = await self.db.execute(
                    select(Subscription).where(Subscription.id == payment.subscription_id)
                )
                subscription = sub_result.scalar_one_or_none()
                if subscription:
                    subscription.status = "active"

                await publish_event(PAYMENT_COMPLETED, {
                    "user_id": str(payment.user_id),
                    "tier": subscription.tier if subscription else "unknown",
                })

                audit = AuditLog(
                    actor_id=payment.user_id,
                    action="payment.completed",
                    target_type="payment",
                    target_id=payment.id,
                )
                self.db.add(audit)

        elif event == "payment.failed":
            payment.status = "failed"

        await self.db.commit()

    async def cancel_subscription(self, user_id: UUID) -> None:
        result = await self.db.execute(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.status == "active",
            )
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            raise ValueError("No active subscription found")

        subscription.status = "cancelled"
        subscription.auto_renew = False

        audit = AuditLog(
            actor_id=user_id,
            action="subscription.cancel",
            target_type="subscription",
            target_id=subscription.id,
        )
        self.db.add(audit)
        await self.db.commit()

    async def get_current_subscription(
        self,
        user_id: UUID,
    ) -> Optional[Subscription]:
        result = await self.db.execute(
            select(Subscription)
            .where(
                Subscription.user_id == user_id,
                Subscription.status == "active",
            )
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_payment_history(
        self,
        user_id: UUID,
        page: int,
        per_page: int,
    ):
        offset = (page - 1) * per_page

        result = await self.db.execute(
            select(Payment)
            .where(Payment.user_id == user_id)
            .order_by(Payment.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        payments = result.scalars().all()

        count_result = await self.db.execute(
            select(Payment).where(Payment.user_id == user_id)
        )
        total = len(count_result.scalars().all())

        return {"payments": payments, "total": total}