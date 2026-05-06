"""Security primitives: AES-256-GCM field encryption, bcrypt password hashing, JWT issuance."""
from __future__ import annotations

import base64
import hashlib
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.backend.core.config import settings


# ── AES-256-GCM field encryption ─────────────────────────────────────────────


def get_encryption_key() -> bytes:
    """Resolve the AES-256 key from settings.

    Accepts the key as:
      * 64-char hex string (32 bytes)
      * base64 (urlsafe or standard, 32 bytes decoded)
      * raw 32-byte UTF-8 string
      * any other string — derived via SHA-256 (acceptable for non-production
        local dev where rotating keys is fine)
    """
    raw = settings.AES_ENCRYPTION_KEY
    if not raw:
        raise ValueError("AES_ENCRYPTION_KEY is not set")

    # Try hex
    if len(raw) == 64:
        try:
            key = bytes.fromhex(raw)
            if len(key) == 32:
                return key
        except ValueError:
            pass

    # Try base64
    try:
        for decoder in (base64.urlsafe_b64decode, base64.b64decode):
            try:
                key = decoder(raw + "=" * (-len(raw) % 4))
                if len(key) == 32:
                    return key
            except Exception:
                continue
    except Exception:
        pass

    encoded = raw.encode("utf-8")
    if len(encoded) == 32:
        return encoded

    return hashlib.sha256(encoded).digest()


def encrypt_field(plaintext: str, key: bytes | None = None) -> bytes:
    """Encrypt with AES-256-GCM, prefixing the 12-byte random nonce.

    Layout: ``nonce(12) || ciphertext || tag(16)``.
    """
    if key is None:
        key = get_encryption_key()
    if plaintext is None:
        raise ValueError("plaintext cannot be None")
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return nonce + ciphertext


def decrypt_field(encrypted: bytes, key: bytes | None = None) -> str:
    if key is None:
        key = get_encryption_key()
    if encrypted is None or len(encrypted) < 12 + 16:
        raise ValueError("ciphertext too short")
    nonce, ciphertext = encrypted[:12], encrypted[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")


# ── Password hashing ─────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


# ── JWT issuance / verification ──────────────────────────────────────────────


def _new_jti() -> str:
    return uuid.uuid4().hex


def create_access_token(data: dict[str, Any]) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload["iat"] = datetime.now(timezone.utc)
    payload["type"] = "access"
    payload.setdefault("jti", _new_jti())
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict[str, Any]) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload["iat"] = datetime.now(timezone.utc)
    payload["type"] = "refresh"
    payload.setdefault("jti", _new_jti())
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError as exc:
        raise ValueError(f"Invalid token: {exc}") from exc
