"""MongoDB async client + chat-message indexes."""
from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.backend.core.config import settings
from app.backend.models.chat_message import MONGO_INDEXES

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_mongodb() -> None:
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGO_URL)
    _db = _client[settings.MONGO_DB]
    for idx in MONGO_INDEXES:
        await _db.messages.create_index(idx["keys"], name=idx["name"])


async def disconnect_mongodb() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
    _client = None
    _db = None


def get_mongo_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("MongoDB not connected. Call connect_mongodb() first.")
    return _client


async def get_mongo_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("MongoDB not connected. Call connect_mongodb() first.")
    return _db
