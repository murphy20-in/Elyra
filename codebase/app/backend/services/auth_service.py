import asyncio
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import httpx
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.backend.core import config
from app.backend.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.backend.core.events import (
    USER_REGISTERED,
    publish_event,
)
from app.backend.models.user import User
from app.backend.models.profile import PublicProfile, PrivateProfile
from app.backend.models.preference import UserPreference
from app.backend.models.verification import (
    EmailVerification,
    PhoneVerification,
    PasswordResetToken,
)
from app.backend.models.audit import AuditLog
from app.backend.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
)


class AuthService:
    def __init__(self, db: AsyncSession, redis):
        self.db = db
        self.redis = redis

    async def register(self, data: RegisterRequest) -> TokenResponse:
        result = await self.db.execute(
            select(User).where(User.email == data.email)
        )
        if result.scalar_one_or_none():
            raise ValueError("Email already registered")

        user = User(
            email=data.email,
            password_hash=hash_password(data.password),
            role="user",
            is_active=True,
            is_verified=False,
            email_verified=False,
            phone_verified=False,
            is_banned=False,
            failed_login_count=0,
        )
        self.db.add(user)
        await self.db.flush()

        public_profile = PublicProfile(
            user_id=user.id,
            display_name=data.display_name,
            age=data.age,
            gender_identity=data.gender_identity,
            sexual_orientation=data.sexual_orientation,
            intent=data.intent,
            is_visible=True,
        )
        self.db.add(public_profile)

        preferences = UserPreference(
            user_id=user.id,
            preferred_genders=[],
            preferred_orientations=[],
            age_min=18,
            age_max=50,
            max_distance_km=50,
            preferred_intents=[],
            deal_breakers={},
        )
        self.db.add(preferences)

        private_profile = PrivateProfile(
            user_id=user.id,
            reveal_to=[],
        )
        self.db.add(private_profile)

        await self.db.commit()

        await publish_event(USER_REGISTERED, {"user_id": str(user.id), "email": user.email})

        audit = AuditLog(
            actor_id=user.id,
            action="user.register",
            target_type="user",
            target_id=user.id,
        )
        self.db.add(audit)
        await self.db.commit()

        jti = str(uuid4())
        access_token = create_access_token({"sub": str(user.id), "jti": jti})
        refresh_token = create_refresh_token({"sub": str(user.id), "jti": jti})

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def login(self, data: LoginRequest) -> TokenResponse:
        result = await self.db.execute(
            select(User).where(User.email == data.email)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            if user:
                user.failed_login_count += 1
                if user.failed_login_count >= 5:
                    from datetime import timedelta
                    user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
                await self.db.commit()
            raise ValueError("Invalid email or password")

        if user.deleted_at is not None:
            raise ValueError("Account deleted")

        if user.is_banned:
            raise ValueError("Account banned")

        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            retry_after = int((user.locked_until - datetime.now(timezone.utc)).total_seconds())
            raise ValueError(f"Account locked. Try again in {retry_after} seconds")

        user.failed_login_count = 0
        user.locked_until = None
        user.last_login = datetime.now(timezone.utc)
        await self.db.commit()

        jti = str(uuid4())
        access_token = create_access_token({"sub": str(user.id), "jti": jti})
        refresh_token = create_refresh_token({"sub": str(user.id), "jti": jti})

        audit = AuditLog(
            actor_id=user.id,
            action="user.login",
            target_type="user",
            target_id=user.id,
        )
        self.db.add(audit)
        await self.db.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")

        jti = payload.get("jti")
        user_id = payload.get("sub")

        is_blacklisted = await self.redis.get(f"refresh_blacklist:{jti}")
        if is_blacklisted:
            raise ValueError("Token has been revoked")

        exp = payload.get("exp")
        exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc)
        remaining_ttl = max(0, int((exp_dt - datetime.now(timezone.utc)).total_seconds()))
        await self.redis.set(f"refresh_blacklist:{jti}", "1", ex=remaining_ttl)

        new_jti = str(uuid4())
        new_access_token = create_access_token({"sub": user_id, "jti": new_jti})
        new_refresh_token = create_refresh_token({"sub": user_id, "jti": new_jti})

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def logout(self, refresh_token: str, user_id: UUID) -> None:
        try:
            payload = decode_token(refresh_token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc)
            remaining_ttl = max(0, int((exp_dt - datetime.now(timezone.utc)).total_seconds()))
            await self.redis.set(f"refresh_blacklist:{jti}", "1", ex=remaining_ttl)
        except Exception:
            pass

        audit = AuditLog(
            actor_id=user_id,
            action="user.logout",
            target_type="user",
            target_id=user_id,
        )
        self.db.add(audit)
        await self.db.commit()

    async def forgot_password(self, email: str) -> None:
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()

        if not user:
            return

        raw_token = secrets.token_urlsafe(32)
        from app.backend.services.email_service import send_password_reset_email

        token_hash = hash_password(raw_token)
        expiry = datetime.now(timezone.utc) + timedelta(hours=1)

        token_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expiry,
        )
        self.db.add(token_record)
        await self.db.commit()

        asyncio.create_task(send_password_reset_email(email, raw_token))

    async def reset_password(self, token: str, new_password: str) -> None:
        token_hash = hash_password(token)
        result = await self.db.execute(
            select(PasswordResetToken)
            .where(PasswordResetToken.token_hash == token_hash)
            .where(PasswordResetToken.used_at.is_(None))
            .where(PasswordResetToken.expires_at > datetime.now(timezone.utc))
        )
        token_record = result.scalar_one_or_none()

        if not token_record:
            raise ValueError("Invalid or expired token")

        user_result = await self.db.execute(
            select(User).where(User.id == token_record.user_id)
        )
        user = user_result.scalar_one()

        user.password_hash = hash_password(new_password)
        token_record.used_at = datetime.now(timezone.utc)

        pattern = "refresh_blacklist:*"
        keys = []
        cursor = 0
        while True:
            cursor, k = await self.redis.scan(cursor, match=pattern, count=100)
            keys.extend(k)
            if cursor == 0:
                break

        if keys:
            for key in keys:
                await self.redis.delete(key)

        audit = AuditLog(
            actor_id=user.id,
            action="user.password_reset",
            target_type="user",
            target_id=user.id,
        )
        self.db.add(audit)
        await self.db.commit()

    async def change_password(self, user: User, old_password: str, new_password: str) -> None:
        if not verify_password(old_password, user.password_hash):
            raise ValueError("Current password is incorrect")

        user.password_hash = hash_password(new_password)

        cursor = 0
        keys = []
        while True:
            cursor, k = await self.redis.scan(cursor, match="refresh_blacklist:*", count=100)
            keys.extend(k)
            if cursor == 0:
                break

        if keys:
            for key in keys:
                await self.redis.delete(key)

        audit = AuditLog(
            actor_id=user.id,
            action="user.password_change",
            target_type="user",
            target_id=user.id,
        )
        self.db.add(audit)
        await self.db.commit()

    async def send_email_verification(self, user: User) -> None:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hash_password(raw_token)
        expiry = datetime.now(timezone.utc) + timedelta(hours=24)

        verification = EmailVerification(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expiry,
        )
        self.db.add(verification)
        await self.db.commit()

        from app.backend.services.email_service import send_verification_email
        asyncio.create_task(send_verification_email(user.email, raw_token, user.email))

    async def verify_email(self, token: str) -> None:
        token_hash = hash_password(token)
        result = await self.db.execute(
            select(EmailVerification)
            .where(EmailVerification.token_hash == token_hash)
            .where(EmailVerification.used_at.is_(None))
            .where(EmailVerification.expires_at > datetime.now(timezone.utc))
        )
        verification = result.scalar_one_or_none()

        if not verification:
            raise ValueError("Invalid or expired token")

        user_result = await self.db.execute(
            select(User).where(User.id == verification.user_id)
        )
        user = user_result.scalar_one()

        user.email_verified = True
        verification.used_at = datetime.now(timezone.utc)

        audit = AuditLog(
            actor_id=user.id,
            action="user.email_verified",
            target_type="user",
            target_id=user.id,
        )
        self.db.add(audit)
        await self.db.commit()

    async def send_phone_otp(self, user: User, phone: str) -> None:
        otp = f"{secrets.randbelow(1000000):06d}"
        otp_hash = hash_password(otp)
        expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

        verification = PhoneVerification(
            user_id=user.id,
            otp_hash=otp_hash,
            attempts=0,
            expires_at=expiry,
        )
        self.db.add(verification)
        await self.db.commit()

        from app.backend.services.sms_service import send_otp_sms
        asyncio.create_task(send_otp_sms(phone, otp))

    async def verify_phone_otp(self, user: User, phone: str, otp: str) -> None:
        result = await self.db.execute(
            select(PhoneVerification)
            .where(PhoneVerification.user_id == user.id)
            .where(PhoneVerification.used_at.is_(None))
            .where(PhoneVerification.expires_at > datetime.now(timezone.utc))
            .order_by(PhoneVerification.created_at.desc())
            .limit(1)
        )
        verification = result.scalar_one_or_none()

        if not verification:
            raise ValueError("No valid OTP request found")

        if not verify_password(otp, verification.otp_hash):
            verification.attempts += 1
            await self.db.commit()
            if verification.attempts >= 5:
                raise ValueError("Too many failed attempts. Please request a new OTP.")
            raise ValueError("Invalid OTP")

        user.phone = phone
        user.phone_verified = True
        verification.used_at = datetime.now(timezone.utc)

        audit = AuditLog(
            actor_id=user.id,
            action="user.phone_verified",
            target_type="user",
            target_id=user.id,
        )
        self.db.add(audit)
        await self.db.commit()

    async def oauth_login(self, provider: str, oauth_token: str) -> TokenResponse:
        if provider == "google":
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={oauth_token}"
                )
                if resp.status_code != 200:
                    raise ValueError("Invalid Google token")
                data = resp.json()
                email = data.get("email")
                name = data.get("name", "User")
        else:
            raise ValueError(f"Unsupported provider: {provider}")

        if not email:
            raise ValueError("No email in OAuth token")

        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                email=email,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                role="user",
                is_active=True,
                email_verified=True,
            )
            self.db.add(user)
            await self.db.flush()

            public_profile = PublicProfile(
                user_id=user.id,
                display_name=name,
                age=18,
                gender_identity="prefer_not_to_say",
                sexual_orientation="prefer_not_to_say",
                intent="exploring",
                is_visible=True,
            )
            self.db.add(public_profile)

            preferences = UserPreference(
                user_id=user.id,
                preferred_genders=[],
                preferred_orientations=[],
                age_min=18,
                age_max=50,
                max_distance_km=50,
                preferred_intents=[],
                deal_breakers={},
            )
            self.db.add(preferences)

            private_profile = PrivateProfile(
                user_id=user.id,
                reveal_to=[],
            )
            self.db.add(private_profile)
            await self.db.commit()

            await publish_event(USER_REGISTERED, {"user_id": str(user.id), "email": user.email})

        jti = str(uuid4())
        access_token = create_access_token({"sub": str(user.id), "jti": jti})
        refresh_token = create_refresh_token({"sub": str(user.id), "jti": jti})

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )