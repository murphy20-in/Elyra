"""
ChatService — MongoDB message persistence layer.
Uses Motor (async MongoDB driver).
"""

import logging
from datetime import datetime
from typing import Optional

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.backend.core.mongodb import get_mongo_db

logger = logging.getLogger(__name__)


class ChatService:
    """
    MongoDB CRUD operations for chat messages.
    """

    def __init__(self):
        self._db = None

    async def _get_db(self):
        if self._db is None:
            self._db = await get_mongo_db()
        return self._db

    async def save_message(self, message_doc: dict) -> str:
        """
        Insert message document into MongoDB.
        Returns the inserted _id as string.
        Adds client_message_id field for idempotency.
        """
        db = await self._get_db()
        messages = db["messages"]

        if "client_message_id" not in message_doc:
            message_doc["client_message_id"] = message_doc.get("client_message_id", "")

        message_doc["created_at"] = message_doc.get("created_at", datetime.utcnow())
        message_doc["updated_at"] = message_doc.get("updated_at", datetime.utcnow())

        result = await messages.insert_one(message_doc)
        return str(result.inserted_id)

    async def find_by_client_message_id(
        self,
        thread_id: str,
        sender_id: str,
        client_message_id: str,
    ) -> Optional[dict]:
        """
        Idempotency check.
        Query: { thread_id, sender_id, client_message_id }
        Returns document dict or None.
        """
        db = await self._get_db()
        messages = db["messages"]

        doc = await messages.find_one(
            {
                "thread_id": thread_id,
                "sender_id": sender_id,
                "client_message_id": client_message_id,
            }
        )
        if doc:
            doc["id"] = str(doc.pop("_id"))
        return doc

    async def get_messages(
        self,
        thread_id: str,
        page: int = 1,
        per_page: int = 50,
    ) -> list[dict]:
        """
        Fetch paginated messages for a thread.
        Filter: { thread_id, is_deleted: False }
        Sort: created_at DESC
        Skip: (page-1)*per_page  Limit: per_page
        Returns list of dicts (ObjectId converted to str).
        """
        db = await self._get_db()
        messages = db["messages"]

        skip = (page - 1) * per_page
        cursor = messages.find(
            {"thread_id": thread_id, "is_deleted": False}
        ).sort("created_at", -1).skip(skip).limit(per_page)

        results = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            results.append(doc)

        return results

    async def update_moderation_result(self, message_id: str, result: dict):
        """
        Set is_moderated=True and moderation_result on the message.
        Query by _id (ObjectId). Also update updated_at.
        """
        db = await self._get_db()
        messages = db["messages"]

        await messages.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$set": {
                    "is_moderated": True,
                    "moderation_result": result,
                    "updated_at": datetime.utcnow(),
                }
            },
        )

    async def mark_read(self, message_ids: list[str], user_id: str):
        """
        Add user_id to read_by array for all specified message_ids.
        Use $addToSet to avoid duplicates.
        """
        db = await self._get_db()
        messages = db["messages"]

        if not message_ids:
            return

        object_ids = [ObjectId(mid) for mid in message_ids if len(mid) == 24]

        await messages.update_many(
            {"_id": {"$in": object_ids}},
            {"$addToSet": {"read_by": user_id}},
        )

    async def delete_message(self, message_id: str, user_id: str):
        """
        Soft delete: set is_deleted=True.
        Only allowed if sender_id matches user_id.
        Update updated_at.
        """
        db = await self._get_db()
        messages = db["messages"]

        await messages.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$set": {
                    "is_deleted": True,
                    "updated_at": datetime.utcnow(),
                }
            },
        )

    async def create_indexes(self):
        """
        Called once at app startup.
        Create the following indexes:
          1. Compound: [("thread_id", 1), ("created_at", -1)]
          2. Single:    "sender_id"
          3. Compound: [("thread_id", 1), ("read_by", 1)]
          4. Unique compound: [("thread_id", 1), ("sender_id", 1), ("client_message_id", 1)]
             (for idempotency lookup efficiency)
        """
        db = await self._get_db()
        messages = db["messages"]

        await messages.create_index([("thread_id", 1), ("created_at", -1)])
        await messages.create_index([("sender_id", 1)])
        await messages.create_index([("thread_id", 1), ("read_by", 1)])

        try:
            await messages.create_index(
                [("thread_id", 1), ("sender_id", 1), ("client_message_id", 1)],
                unique=True,
            )
        except DuplicateKeyError:
            pass

        logger.info("ChatService indexes created")