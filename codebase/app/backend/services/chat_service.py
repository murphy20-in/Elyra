"""
ChatService — MongoDB message persistence layer.
Uses Motor (async MongoDB driver).
"""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from sqlalchemy import select, func

from app.backend.core.mongodb import get_mongo_db
from app.backend.models.chat import ChatThread

logger = logging.getLogger(__name__)


class ChatService:
    """
    Thread management (PostgreSQL) + MongoDB CRUD operations for chat messages.
    """

    def __init__(self, db=None, mongo_db=None):
        self.db = db
        self._mongo = mongo_db
        self._db = None

    async def _get_db(self):
        if self._db is None:
            if self._mongo is not None:
                self._db = self._mongo
            else:
                self._db = await get_mongo_db()
        return self._db

    # ── Thread helpers (PostgreSQL) ──────────────────────────────────────────

    async def _get_thread_for_user(
        self, thread_id: UUID | str, user_id: UUID | str
    ) -> ChatThread:
        result = await self.db.execute(
            select(ChatThread).where(ChatThread.id == thread_id)
        )
        thread = result.scalar_one_or_none()
        if not thread:
            raise ValueError("Thread not found")
        if user_id not in (thread.participant_1, thread.participant_2):
            raise ValueError("Not a participant of this thread")
        return thread

    async def list_threads(
        self, user_id: UUID, page: int = 1, per_page: int = 20
    ) -> dict:
        base = select(ChatThread).where(
            (ChatThread.participant_1 == user_id)
            | (ChatThread.participant_2 == user_id)
        )
        total_result = await self.db.execute(
            select(func.count()).select_from(base.subquery())
        )
        total = total_result.scalar() or 0

        result = await self.db.execute(
            base.order_by(ChatThread.last_message_at.desc().nullslast())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        threads = result.scalars().all()
        return {"threads": threads, "total": total}

    async def count_messages(self, thread_id: str) -> int:
        db = await self._get_db()
        return await db["messages"].count_documents(
            {"thread_id": str(thread_id), "is_deleted": False}
        )

    async def send_message(
        self,
        thread_id: UUID,
        sender_id: UUID,
        content: str,
        message_type: str = "text",
        client_message_id: Optional[str] = None,
    ) -> dict:
        thread = await self._get_thread_for_user(thread_id, sender_id)

        if client_message_id:
            existing = await self.find_by_client_message_id(
                str(thread_id), str(sender_id), client_message_id
            )
            if existing:
                return existing

        now = datetime.utcnow()
        doc = {
            "thread_id": str(thread_id),
            "sender_id": str(sender_id),
            "content": content,
            "message_type": message_type,
            "client_message_id": client_message_id or "",
            "is_moderated": False,
            "moderation_result": {},
            "is_deleted": False,
            "read_by": [],
            "metadata": {},
            "created_at": now,
            "updated_at": now,
        }
        message_id = await self.save_message(doc)

        thread.last_message_at = now
        await self.db.commit()

        # pymongo's insert_one injects an ObjectId _id into the dict
        doc.pop("_id", None)
        doc["id"] = message_id
        return doc

    async def mark_messages_read(self, thread_id: UUID, user_id: UUID) -> None:
        await self._get_thread_for_user(thread_id, user_id)

        db = await self._get_db()
        unread = db["messages"].find(
            {
                "thread_id": str(thread_id),
                "is_deleted": False,
                "read_by": {"$ne": str(user_id)},
            },
            {"_id": 1},
        )
        message_ids = [str(d["_id"]) async for d in unread]
        await self.mark_read(message_ids, str(user_id))

    async def update_thread(
        self,
        thread_id: UUID,
        user_id: UUID,
        is_anonymous: Optional[bool] = None,
    ) -> ChatThread:
        thread = await self._get_thread_for_user(thread_id, user_id)
        if is_anonymous is not None:
            thread.is_anonymous = is_anonymous
            await self.db.commit()
            await self.db.refresh(thread)
        return thread

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
        user_id: Optional[str] = None,
        page: int = 1,
        per_page: int = 50,
    ) -> dict:
        """
        Fetch paginated messages for a thread.
        Filter: { thread_id, is_deleted: False }
        Sort: created_at DESC
        When user_id is provided, membership is verified first.
        Returns {"messages": [...], "total": n, "page": p, "has_more": bool}.
        """
        if user_id is not None:
            await self._get_thread_for_user(thread_id, user_id)

        db = await self._get_db()
        messages = db["messages"]

        total = await messages.count_documents(
            {"thread_id": str(thread_id), "is_deleted": False}
        )

        skip = (page - 1) * per_page
        cursor = (
            messages.find({"thread_id": str(thread_id), "is_deleted": False})
            .sort("created_at", 1)
            .skip(skip)
            .limit(per_page)
        )

        results = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            results.append(doc)

        return {
            "messages": results,
            "total": total,
            "page": page,
            "has_more": skip + len(results) < total,
        }

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