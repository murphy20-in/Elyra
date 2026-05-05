# Phase 5: Chat System

> **Goal**: Implement the complete real-time chat system using WebSocket (socket.io), MongoDB message storage, Redis pub/sub for scaling, and AI moderation integration.

---

## 5.1 Chat Architecture

```
┌──────────┐     WebSocket      ┌──────────────┐     Pub/Sub     ┌───────┐
│  Client   │ ◄──────────────► │ Chat Service  │ ◄────────────► │ Redis │
│ (browser) │                   │ (socket.io)   │                │       │
└──────────┘                   └──────┬───────┘                └───────┘
                                      │
                          ┌───────────┼───────────┐
                          │           │           │
                    ┌─────▼───┐ ┌────▼────┐ ┌───▼──────────┐
                    │ MongoDB │ │ Moderation│ │ Notification │
                    │ (store) │ │ Service  │ │   Service    │
                    └─────────┘ └─────────┘ └──────────────┘
```

---

## 5.2 WebSocket Server (`backend/websocket/manager.py`)

```python
import socketio

# Create socket.io server with Redis adapter for horizontal scaling
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=settings.CORS_ORIGINS.split(","),
    client_manager=socketio.AsyncRedisManager(settings.REDIS_URL)
)

# Mount as ASGI app alongside FastAPI
socket_app = socketio.ASGIApp(sio, other_app=fastapi_app)
```

### Connection Lifecycle

```python
@sio.event
async def connect(sid, environ, auth):
    """
    1. Extract JWT from auth header or query param (auth.token)
    2. Decode and validate token (reject expired or blacklisted refresh-derived tokens)
    3. Reject if user.is_banned or is_active=False (raise ConnectionRefusedError)
    4. Apply per-user connection rate limit (Redis: ws_connect:{user_id}, max 10/min)
    5. Fetch user from database
    6. Store session mapping in Redis:
         HSET ws_sessions sid user_id
         SADD ws_user:{user_id} sid           # user can have multiple concurrent connections
         SET online:{user_id} 1 EX 60         # heartbeat-extended online flag
    7. Join user to all their active thread rooms (sio.enter_room for each thread_id)
    8. Emit 'user_online' to thread rooms where this user is a participant
    9. Send queued offline messages (if any) from Redis list 'offline_queue:{user_id}'
    """

@sio.event
async def disconnect(sid):
    """
    1. Get user_id from Redis sid mapping
    2. SREM ws_user:{user_id} sid; if no other sids → SETEX online:{user_id} 0 0, set users.last_seen=now()
    3. HDEL ws_sessions sid
    4. Emit 'user_offline' to relevant rooms (only when last sid removed)
    """

@sio.event
async def heartbeat(sid):
    """
    Client sends every 30 s.
    Refresh online:{user_id} TTL to 60 s.
    """
```

### Presence Schema (Redis)
| Key | Type | TTL | Purpose |
|---|---|---|---|
| `ws_sessions` | HASH | — | sid → user_id |
| `ws_user:{user_id}` | SET | — | all sids for a user |
| `online:{user_id}` | STRING | 60 s | heartbeat-extended online flag |
| `typing:{thread_id}` | SET | 5 s | active-typer user_ids |
| `offline_queue:{user_id}` | LIST | 7 days | queued events to deliver on next connect |
| `anon_map:{thread_id}:{user_id}` | STRING | thread lifetime | user_id → "anon_1"/"anon_2" |

---

## 5.3 Message Handlers (`backend/websocket/handlers.py`)

### Send Message
```python
@sio.on('send_message')
async def handle_send_message(sid, data):
    """
    Input data: {
        "thread_id": str,
        "content": str,
        "message_type": "text" | "image" | "location",
        "client_message_id": str   # idempotency key from the client
    }

    Steps:
    1. Authenticate: get user_id from sid; reject if missing.
    2. Per-user rate limit (Redis sliding window, key 'ws_msg:{user_id}'): max 30/min — emit 'error' with code='rate_limited' on overflow.
    3. Validate sizes/types:
         - content text length 1..2000 chars
         - message_type in allowed enum
         - if 'image' → content is an S3 URL belonging to the same user (signed-url verification)
         - if 'location' → content is JSON {lat, lng}, both floats in valid ranges
    4. Validate: user is a participant in thread_id (PostgreSQL ChatThread).
    5. Check: thread.is_active is True; else emit 'error' code='thread_inactive'.
    6. Check: neither participant has blocked the other (Block table). If blocked → emit 'error' code='blocked'.
    7. Idempotency: lookup MongoDB by (thread_id, sender_id, client_message_id); if exists, re-emit existing message.
    8. Anonymous mode: if thread.is_anonymous, transform sender_id via AnonymousMessageFilter.
    9. Insert message document in MongoDB messages collection (schema in §2.3).
    10. Update ChatThread.last_message_at in PostgreSQL.
    11. Emit 'new_message' to the thread room (Redis pub/sub broadcasts to all server instances).
    12. Trigger async moderation:
        - asyncio.create_task(moderate_message_async(message_id, content, thread_id))
        - If action=='block' → mark is_deleted=True, emit 'message_moderated' code='blocked'
        - If action=='flag'  → emit 'message_moderated' code='flagged', auto-create Report
    13. If recipient offline (no online:{recipient_id} key) → push notification (FCM) and append to 'offline_queue:{recipient_id}'.
    14. Append toxicity score to user-level rolling window for risk scoring.
    """
```

### Typing Indicator
```python
@sio.on('typing_start')
async def handle_typing_start(sid, data):
    """Emit 'user_typing' to thread room with { user_id, thread_id }"""

@sio.on('typing_stop')
async def handle_typing_stop(sid, data):
    """Emit 'user_stopped_typing' to thread room"""
```

### Read Receipt
```python
@sio.on('mark_read')
async def handle_mark_read(sid, data):
    """
    Input: { "thread_id": str, "message_ids": [str] }
    1. Update read_by in MongoDB for listed messages
    2. Emit 'messages_read' to thread room with { user_id, message_ids }
    """
```

### Presence
```python
@sio.on('get_online_status')
async def handle_get_online_status(sid, data):
    """
    Input: { "user_ids": [str] }
    Check Redis for online status of each user.
    Return: { "statuses": { "user_id": { "online": bool, "last_seen": datetime } } }
    """
```

---

## 5.4 Socket.io Events Reference

### Client → Server Events
| Event | Payload | Description |
|-------|---------|-------------|
| `send_message` | `{ thread_id, content, message_type }` | Send a message |
| `typing_start` | `{ thread_id }` | User started typing |
| `typing_stop` | `{ thread_id }` | User stopped typing |
| `mark_read` | `{ thread_id, message_ids }` | Mark messages as read |
| `get_online_status` | `{ user_ids }` | Query online status |
| `join_thread` | `{ thread_id }` | Join a specific room |
| `leave_thread` | `{ thread_id }` | Leave a specific room |

### Server → Client Events
| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | Message document | New message received |
| `message_moderated` | `{ message_id, action, reason }` | Message was flagged/blocked |
| `user_typing` | `{ user_id, thread_id }` | Other user typing |
| `user_stopped_typing` | `{ user_id, thread_id }` | Other user stopped |
| `messages_read` | `{ user_id, message_ids }` | Read receipt |
| `user_online` | `{ user_id }` | User came online |
| `user_offline` | `{ user_id, last_seen }` | User went offline |
| `match_notification` | `{ match_id, user }` | New match alert |
| `error` | `{ code, message }` | Error occurred |

---

## 5.5 Anonymous Mode Implementation

```python
# When a ChatThread has is_anonymous = True:

class AnonymousMessageFilter:
    """
    Filters message data before broadcasting in anonymous threads:
    - Replace sender_id with a consistent anonymous identifier (e.g., "anon_1", "anon_2")
    - Strip any location metadata
    - Prevent sharing of images in anonymous mode
    - Remove any profile references

    Mapping stored in Redis:
      key: "anon_map:{thread_id}:{user_id}" → "anon_1"
    """
```

---

## 5.6 Redis Pub/Sub for Scaling

```python
# socketio.AsyncRedisManager handles this automatically:
# - When a message is emitted, it's published to Redis
# - All connected socket.io server instances subscribe to Redis
# - Messages are broadcast to local clients from each instance

# Custom channels for non-socket events:
CHANNELS = {
    "moderation_result": "elyra:moderation:{thread_id}",
    "user_presence": "elyra:presence",
    "notifications": "elyra:notifications:{user_id}",
}
```

---

## 5.7 MongoDB Operations (`services/chat_service.py`)

```python
class ChatService:
    def __init__(self, mongo_db):
        self.messages = mongo_db["messages"]

    async def store_message(self, message: dict) -> str:
        """Insert message document, return inserted_id as string."""
        result = await self.messages.insert_one(message)
        return str(result.inserted_id)

    async def get_messages(self, thread_id: str, page: int = 1, per_page: int = 50) -> list:
        """
        Fetch paginated messages for a thread, sorted newest-first.
        Skips deleted messages (is_deleted = False).
        """
        cursor = self.messages.find(
            {"thread_id": thread_id, "is_deleted": False}
        ).sort("created_at", -1).skip((page - 1) * per_page).limit(per_page)
        return await cursor.to_list(length=per_page)

    async def update_moderation_result(self, message_id: str, result: dict):
        """Update message with moderation result from AI service."""
        await self.messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"is_moderated": True, "moderation_result": result, "updated_at": datetime.utcnow()}}
        )

    async def mark_read(self, message_ids: list[str], user_id: str):
        """Add user_id to read_by array for specified messages."""
        await self.messages.update_many(
            {"_id": {"$in": [ObjectId(mid) for mid in message_ids]}},
            {"$addToSet": {"read_by": user_id}}
        )

    async def delete_message(self, message_id: str, user_id: str):
        """Soft-delete: set is_deleted = True (only by sender)."""
        await self.messages.update_one(
            {"_id": ObjectId(message_id), "sender_id": user_id},
            {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
        )
```

---

## 5.8 Moderation Hook Integration

```python
async def moderate_message_async(message_id: str, content: str, thread_id: str):
    """
    Called after message is stored and delivered.
    Runs asynchronously to not block message delivery.

    1. POST to moderation-service:9002/moderate/text
    2. Get result: { is_toxic, toxicity_score, categories, action }
    3. Update MongoDB message with moderation_result
    4. If action == "block":
       - Emit 'message_moderated' to thread room with action="blocked"
       - The frontend will hide/blur the message
    5. If action == "flag":
       - Create a Report record in PostgreSQL
       - Emit 'message_moderated' with action="flagged"
    6. Log moderation event for risk scoring
    """
```

---

## 5.9 Main App Integration

```python
# File: app/backend/main.py (updated)

from websocket.manager import sio, socket_app

# The main ASGI app is the socket_app which wraps FastAPI
app = socket_app

# Alternative approach using Starlette mount:
# app.mount("/ws", socketio.ASGIApp(sio))
```

---

## 5.9b WebSocket Security & Limits

| Concern | Implementation |
|---|---|
| Auth | JWT in `auth.token` at connect; verified before `connect` accepts. |
| Token expiry mid-session | Server sends `token_expiring` event 60s before exp; client must call REST `/auth/refresh` and reconnect. |
| Connection rate limit | Max 10 connections/min per user_id (Redis). |
| Message rate limit | Max 30 messages/min per user (sliding window). |
| Payload size | socket.io `maxHttpBufferSize = 64KB` to block oversize payloads. |
| Image upload via WS | NOT allowed — images must be uploaded via REST (`/profiles/me/photos` for profile, future `/chat/threads/{id}/upload` for chat) and only the resulting S3 URL is sent through WS. |
| Origin check | socket.io `cors_allowed_origins` matches `CORS_ORIGINS`. |
| Idempotency | All `send_message` events require `client_message_id`; server dedupes. |
| Reconnection | Client uses socket.io built-in reconnection with exponential backoff (1s → 2s → 4s → … max 30s); on reconnect, replays `offline_queue:{user_id}` from Redis. |
| Thread join authorization | `join_thread` event verifies user is in `chat_threads.participant_*`. |

---

## 5.10 MongoDB Indexes

```python
# Create indexes on startup (in main.py startup event)

async def create_mongo_indexes():
    db = get_mongo_db()
    messages = db["messages"]

    # Compound index for thread message queries
    await messages.create_index([("thread_id", 1), ("created_at", -1)])

    # Index for sender queries
    await messages.create_index("sender_id")

    # Index for unread message queries
    await messages.create_index([("thread_id", 1), ("read_by", 1)])

    # TTL index (optional: auto-delete messages older than 1 year)
    # await messages.create_index("created_at", expireAfterSeconds=31536000)
```

---

## 5.11 Phase 5 File Creation Checklist

| # | File | Contents |
|---|------|----------|
| 1 | `backend/websocket/__init__.py` | Package init |
| 2 | `backend/websocket/manager.py` | socket.io server setup + Redis adapter + connect/disconnect/heartbeat |
| 3 | `backend/websocket/handlers.py` | Event handlers (send, typing, read, presence, join/leave) with rate-limit + idempotency |
| 4 | `backend/websocket/anonymous.py` | Anonymous mode message filter + Redis mapping |
| 5 | `backend/websocket/auth.py` | JWT verify helper for socket connect |
| 6 | `backend/websocket/rate_limit.py` | Per-user sliding-window limiter (Redis) |
| 7 | `backend/websocket/presence.py` | online_users helper + heartbeat tick |
| 8 | Update `backend/services/chat_service.py` | MongoDB CRUD ops + idempotency lookup |
| 9 | Update `backend/core/events.py` | Moderation hook + event channels |
| 10 | Update `backend/main.py` | Mount socket.io ASGI app correctly (sio.ASGIApp wraps FastAPI) |
| 11 | Update `backend/models/chat_message.py` | `moderation_result` Pydantic + `client_message_id` field |

---

*Phase 5 complete. Proceed to Phase 6: Frontend.*
