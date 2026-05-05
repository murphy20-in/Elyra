# Phase 2: Database Models + Migrations

> **Goal**: Implement all SQLAlchemy models, set up Alembic migrations, create the MongoDB schema for chat, and configure pgvector for embeddings. Every table from the PrimaryPrompt schema must be implemented.

---

## 2.1 Database Architecture Overview

| Database | Tables / Collections | Purpose |
|----------|---------------------|---------|
| PostgreSQL + pgvector | 13 tables | All relational data + vector embeddings |
| MongoDB | 1 collection (`messages`) | Chat message storage |
| Redis | N/A (key-value) | Cache, sessions, pub/sub |

---

## 2.2 PostgreSQL Schema — Complete Table Definitions

### 2.2.1 `users` Table
```python
# File: app/backend/models/user.py

class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    phone           = Column(String(20), unique=True, nullable=True, index=True)
    password_hash   = Column(String(255), nullable=False)
    role            = Column(Enum('user','premium_user','verified_user','moderator','admin', name='user_role'), default='user', nullable=False)
    is_active       = Column(Boolean, default=True, nullable=False)
    is_verified     = Column(Boolean, default=False, nullable=False)        # photo / ID verified badge
    email_verified  = Column(Boolean, default=False, nullable=False)        # email confirmed
    phone_verified  = Column(Boolean, default=False, nullable=False)        # phone OTP confirmed
    is_banned       = Column(Boolean, default=False, nullable=False)
    failed_login_count = Column(Integer, default=0, nullable=False)
    locked_until    = Column(DateTime(timezone=True), nullable=True)        # brute-force lockout
    last_login      = Column(DateTime(timezone=True), nullable=True)
    last_seen       = Column(DateTime(timezone=True), nullable=True)        # online presence
    deleted_at      = Column(DateTime(timezone=True), nullable=True)        # soft delete (GDPR)
    created_at      = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())
```
- **Indexes**: `email` (unique), `phone` (unique), `role`, `is_active`, `deleted_at`
- **Relationships**: has_one `public_profile`, `private_profile`, `user_preferences`, `user_embeddings`; has_many `subscriptions`, `payments`, `notifications`, `safety_events`, `safe_sessions`, `device_tokens`

### 2.2.2 `public_profiles` Table
```python
# File: app/backend/models/profile.py

class PublicProfile(Base):
    __tablename__ = "public_profiles"

    id              = Column(UUID, primary_key=True, default=uuid4)
    user_id         = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    display_name    = Column(String(100), nullable=False)
    age             = Column(Integer, nullable=False)
    gender_identity = Column(String(50), nullable=False)    # e.g. man, woman, non-binary, genderqueer
    sexual_orientation = Column(String(50), nullable=False) # e.g. gay, lesbian, bisexual, pansexual, queer
    pronouns        = Column(String(30), nullable=True)
    bio             = Column(Text, nullable=True)
    city            = Column(String(100), nullable=True)
    state           = Column(String(100), nullable=True)
    latitude        = Column(Float, nullable=True)
    longitude       = Column(Float, nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    photos          = Column(JSONB, default=[])              # Array of photo URLs
    intent          = Column(Enum('exploring','serious','discreet','friendship'), nullable=False)
    is_visible      = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())
```
- **Indexes**: user_id (unique FK), city, intent, is_visible, (latitude, longitude) composite

### 2.2.3 `private_profiles` Table (Encrypted Fields)
```python
# File: app/backend/models/profile.py

class PrivateProfile(Base):
    __tablename__ = "private_profiles"

    id              = Column(UUID, primary_key=True, default=uuid4)
    user_id         = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    real_name_enc   = Column(LargeBinary, nullable=True)    # AES-256-GCM encrypted
    phone_enc       = Column(LargeBinary, nullable=True)    # AES-256-GCM encrypted
    address_enc     = Column(LargeBinary, nullable=True)    # AES-256-GCM encrypted
    id_document_enc = Column(LargeBinary, nullable=True)    # AES-256-GCM encrypted
    reveal_to       = Column(JSONB, default=[])              # List of user_ids who can view
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())
```
- All `_enc` fields are encrypted using AES-256-GCM via `core/security.py`
- **reveal_to**: JSON array of UUIDs; only listed users can decrypt and view

### 2.2.4 `user_preferences` Table
```python
# File: app/backend/models/preference.py

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id                     = Column(UUID, primary_key=True, default=uuid4)
    user_id                = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    preferred_genders      = Column(JSONB, default=[])       # e.g. ["man", "non-binary"]
    preferred_orientations = Column(JSONB, default=[])
    age_min                = Column(Integer, default=18)
    age_max                = Column(Integer, default=50)
    max_distance_km        = Column(Integer, default=50)
    preferred_intents      = Column(JSONB, default=[])       # e.g. ["serious", "friendship"]
    deal_breakers          = Column(JSONB, default={})
    created_at             = Column(DateTime(timezone=True), server_default=func.now())
    updated_at             = Column(DateTime(timezone=True), onupdate=func.now())
```

### 2.2.5 `matches` Table
```python
# File: app/backend/models/match.py

class Match(Base):
    __tablename__ = "matches"

    id           = Column(UUID, primary_key=True, default=uuid4)
    user_id_1    = Column(UUID, ForeignKey("users.id"), nullable=False)
    user_id_2    = Column(UUID, ForeignKey("users.id"), nullable=False)
    status       = Column(Enum('pending','matched','unmatched','expired'), default='pending')
    liked_by_1   = Column(Boolean, default=False)  # user_1 liked user_2
    liked_by_2   = Column(Boolean, default=False)  # user_2 liked user_1
    match_score  = Column(Float, nullable=True)
    matched_at   = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('user_id_1', 'user_id_2', name='uq_match_pair'),
        CheckConstraint('user_id_1 < user_id_2', name='ck_ordered_pair'),
    )
```
- **Constraint**: user_id_1 < user_id_2 ensures no duplicate pairs

### 2.2.6 `chat_threads` Table
```python
# File: app/backend/models/chat.py

class ChatThread(Base):
    __tablename__ = "chat_threads"

    id             = Column(UUID, primary_key=True, default=uuid4)
    match_id       = Column(UUID, ForeignKey("matches.id"), nullable=False)
    participant_1  = Column(UUID, ForeignKey("users.id"), nullable=False)
    participant_2  = Column(UUID, ForeignKey("users.id"), nullable=False)
    is_active      = Column(Boolean, default=True)
    is_anonymous   = Column(Boolean, default=False)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
```

### 2.2.7 `safety_events` Table
```python
# File: app/backend/models/safety.py

class SafetyEvent(Base):
    __tablename__ = "safety_events"

    id          = Column(UUID, primary_key=True, default=uuid4)
    user_id     = Column(UUID, ForeignKey("users.id"), nullable=False)
    event_type  = Column(Enum('sos_triggered','location_shared','check_in_missed','suspicious_activity'), nullable=False)
    event_metadata = Column("metadata", JSONB, default={})  # column name "metadata" but Python attr renamed
    latitude    = Column(Float, nullable=True)
    longitude   = Column(Float, nullable=True)
    resolved    = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
```
> **Naming note**: SQLAlchemy reserves the attribute `metadata` on the declarative `Base`. Use `event_metadata` (or `extra`) as the **Python attribute name** while preserving the **SQL column name** `metadata` via the explicit first-arg form `Column("metadata", ...)`. Apply the same pattern in any other model that needs a JSONB `metadata` column.

### 2.2.8 `reports` Table
```python
# File: app/backend/models/safety.py

class Report(Base):
    __tablename__ = "reports"

    id              = Column(UUID, primary_key=True, default=uuid4)
    reporter_id     = Column(UUID, ForeignKey("users.id"), nullable=False)
    reported_user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    reason          = Column(Enum('harassment','fake_profile','inappropriate_content','spam','threatening','other'), nullable=False)
    description     = Column(Text, nullable=True)
    evidence_urls   = Column(JSONB, default=[])
    status          = Column(Enum('pending','reviewing','resolved','dismissed'), default='pending')
    reviewed_by     = Column(UUID, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at     = Column(DateTime(timezone=True), nullable=True)
```

### 2.2.9 `blocks` Table
```python
# File: app/backend/models/safety.py

class Block(Base):
    __tablename__ = "blocks"

    id              = Column(UUID, primary_key=True, default=uuid4)
    blocker_id      = Column(UUID, ForeignKey("users.id"), nullable=False)
    blocked_user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('blocker_id', 'blocked_user_id', name='uq_block_pair'),
    )
```

### 2.2.10 `user_embeddings` Table (pgvector)
```python
# File: app/backend/models/embedding.py
from pgvector.sqlalchemy import Vector

class UserEmbedding(Base):
    __tablename__ = "user_embeddings"

    id          = Column(UUID, primary_key=True, default=uuid4)
    user_id     = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    embedding   = Column(Vector(384))   # 384-dim for all-MiniLM-L6-v2
    source_text = Column(Text, nullable=True)  # bio + preferences text used
    model_version = Column(String(50), default="v1")
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
```
- **Index**: HNSW index on embedding column for fast similarity search
- **Dimension**: 384 (matching sentence-transformers all-MiniLM-L6-v2)

### 2.2.11 `subscriptions` Table
```python
# File: app/backend/models/subscription.py

class Subscription(Base):
    __tablename__ = "subscriptions"

    id          = Column(UUID, primary_key=True, default=uuid4)
    user_id     = Column(UUID, ForeignKey("users.id"), nullable=False)
    tier        = Column(Enum('free','plus','premium','elite'), default='free')
    status      = Column(Enum('active','cancelled','expired','paused'), default='active')
    started_at  = Column(DateTime(timezone=True), server_default=func.now())
    expires_at  = Column(DateTime(timezone=True), nullable=True)
    auto_renew  = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
```

### 2.2.12 `payments` Table
```python
# File: app/backend/models/payment.py

class Payment(Base):
    __tablename__ = "payments"

    id                = Column(UUID, primary_key=True, default=uuid4)
    user_id           = Column(UUID, ForeignKey("users.id"), nullable=False)
    subscription_id   = Column(UUID, ForeignKey("subscriptions.id"), nullable=True)
    amount            = Column(Numeric(10, 2), nullable=False)
    currency          = Column(String(3), default="INR")
    payment_method    = Column(String(50), nullable=True)   # UPI, card, etc.
    payment_gateway   = Column(String(50), nullable=True)   # Razorpay, Stripe
    gateway_txn_id    = Column(String(255), nullable=True)
    status            = Column(Enum('pending','completed','failed','refunded'), default='pending')
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
```

### 2.2.13 `notifications` Table
```python
# File: app/backend/models/notification.py

class Notification(Base):
    __tablename__ = "notifications"

    id          = Column(UUID, primary_key=True, default=uuid4)
    user_id     = Column(UUID, ForeignKey("users.id"), nullable=False)
    type        = Column(Enum('match','message','safety','payment','system'), nullable=False)
    title       = Column(String(255), nullable=False)
    body        = Column(Text, nullable=True)
    data        = Column(JSONB, default={})
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
```

### 2.2.14 Auxiliary Tables (Required by other phases)

#### `device_tokens` (push notifications, Phase 3 §3.8)
```python
# File: app/backend/models/notification.py (same file as Notification)

class DeviceToken(Base):
    __tablename__ = "device_tokens"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id     = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token       = Column(String(500), unique=True, nullable=False)
    platform    = Column(Enum('ios','android','web', name='device_platform'), nullable=False)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)
```

#### `email_verifications` / `phone_verifications`
```python
# File: app/backend/models/verification.py

class EmailVerification(Base):
    __tablename__ = "email_verifications"
    id           = Column(UUID, primary_key=True, default=uuid4)
    user_id      = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash   = Column(String(255), nullable=False, index=True)   # store hash, not raw
    expires_at   = Column(DateTime(timezone=True), nullable=False)
    used_at      = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

class PhoneVerification(Base):
    __tablename__ = "phone_verifications"
    id           = Column(UUID, primary_key=True, default=uuid4)
    user_id      = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    otp_hash     = Column(String(255), nullable=False)
    attempts     = Column(Integer, default=0)
    expires_at   = Column(DateTime(timezone=True), nullable=False)
    used_at      = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
```

#### `password_reset_tokens`
```python
# File: app/backend/models/verification.py

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id           = Column(UUID, primary_key=True, default=uuid4)
    user_id      = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash   = Column(String(255), nullable=False, index=True)
    expires_at   = Column(DateTime(timezone=True), nullable=False)
    used_at      = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
```

#### `audit_logs` (security & compliance)
```python
# File: app/backend/models/audit.py

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id          = Column(UUID, primary_key=True, default=uuid4)
    actor_id    = Column(UUID, ForeignKey("users.id"), nullable=True)
    action      = Column(String(100), nullable=False)   # e.g. "private_profile.reveal"
    target_type = Column(String(50), nullable=True)     # e.g. "user"
    target_id   = Column(UUID, nullable=True)
    ip_address  = Column(String(45), nullable=True)
    user_agent  = Column(String(255), nullable=True)
    extra       = Column(JSONB, default={})
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), index=True)
```

---

### 2.2.15 `safe_sessions` Table
```python
# File: app/backend/models/safe_session.py

class SafeSession(Base):
    __tablename__ = "safe_sessions"

    id                  = Column(UUID, primary_key=True, default=uuid4)
    user_id             = Column(UUID, ForeignKey("users.id"), nullable=False)
    match_id            = Column(UUID, ForeignKey("matches.id"), nullable=True)
    emergency_contact_name  = Column(String(100), nullable=False)
    emergency_contact_phone = Column(String(20), nullable=False)
    meeting_location    = Column(Text, nullable=True)
    scheduled_at        = Column(DateTime(timezone=True), nullable=True)
    check_in_interval_min = Column(Integer, default=30)
    last_check_in       = Column(DateTime(timezone=True), nullable=True)
    status              = Column(Enum('active','completed','sos_triggered','expired'), default='active')
    live_location_enabled = Column(Boolean, default=False)
    latitude            = Column(Float, nullable=True)
    longitude           = Column(Float, nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    ended_at            = Column(DateTime(timezone=True), nullable=True)
```

---

## 2.3 MongoDB Schema — Messages Collection

```python
# Collection: messages (in MongoDB database: elyra_chat)
# File: app/backend/models/chat_message.py (Pydantic model, not SQLAlchemy)

message_document = {
    "_id": ObjectId,
    "thread_id": str,          # UUID string of ChatThread
    "sender_id": str,          # UUID string of User
    "content": str,            # Message text
    "message_type": str,       # "text", "image", "location", "system"
    "is_moderated": bool,      # Flag set by moderation service
    "moderation_result": {     # Populated by AI moderation
        "is_toxic": bool,
        "toxicity_score": float,
        "categories": [str]
    },
    "is_deleted": bool,
    "read_by": [str],          # List of user_id strings who read it
    "metadata": {},            # Extensible metadata
    "created_at": datetime,
    "updated_at": datetime
}
```
- **Indexes**: `thread_id + created_at` (compound), `sender_id`, `created_at` (TTL optional)

---

## 2.4 Alembic Setup Instructions

### Step-by-step:
1. **Initialize Alembic** in `app/backend/` (run once locally, then commit):
   ```bash
   cd app/backend
   alembic init -t async alembic
   ```

2. **Configure `alembic.ini`** — set `sqlalchemy.url` to be filled at runtime from env:
   ```ini
   # alembic.ini (relevant lines)
   script_location = alembic
   sqlalchemy.url =                          ; left blank — overridden in env.py
   file_template = %%(year)d_%%(month).2d_%%(day).2d_%%(hour).2d%%(minute).2d-%%(rev)s_%%(slug)s
   ```

3. **Configure `alembic/env.py`** (full async-aware template):
   ```python
   import asyncio
   from logging.config import fileConfig
   from sqlalchemy import pool
   from sqlalchemy.engine import Connection
   from sqlalchemy.ext.asyncio import async_engine_from_config
   from alembic import context

   from core.config import settings
   from core.database import Base

   # Import every model so autogenerate sees the metadata
   from models.user import User
   from models.profile import PublicProfile, PrivateProfile
   from models.preference import UserPreference
   from models.match import Match
   from models.chat import ChatThread
   from models.safety import SafetyEvent, Report, Block
   from models.embedding import UserEmbedding
   from models.subscription import Subscription
   from models.payment import Payment
   from models.notification import Notification, DeviceToken
   from models.safe_session import SafeSession
   from models.verification import EmailVerification, PhoneVerification, PasswordResetToken
   from models.audit import AuditLog

   config = context.config
   config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
   if config.config_file_name:
       fileConfig(config.config_file_name)

   target_metadata = Base.metadata

   def do_run_migrations(connection: Connection):
       context.configure(
           connection=connection,
           target_metadata=target_metadata,
           compare_type=True,
           compare_server_default=True,
           include_schemas=False,
       )
       with context.begin_transaction():
           context.run_migrations()

   async def run_migrations_online():
       connectable = async_engine_from_config(
           config.get_section(config.config_ini_section, {}),
           prefix="sqlalchemy.",
           poolclass=pool.NullPool,
       )
       async with connectable.connect() as connection:
           await connection.run_sync(do_run_migrations)
       await connectable.dispose()

   def run_migrations_offline():
       context.configure(
           url=settings.DATABASE_URL,
           target_metadata=target_metadata,
           literal_binds=True,
           dialect_opts={"paramstyle": "named"},
       )
       with context.begin_transaction():
           context.run_migrations()

   if context.is_offline_mode():
       run_migrations_offline()
   else:
       asyncio.run(run_migrations_online())
   ```

4. **Pre-migration: enable extensions** — must run before `alembic upgrade head`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
   This is performed by `infra/scripts/init-db.sh` during PostgreSQL container init (Phase 8 §8.7).

5. **Generate initial migration**:
   ```bash
   alembic revision --autogenerate -m "initial_schema"
   ```
   - Inspect the generated file in `alembic/versions/` and **add manually** the HNSW index on `user_embeddings.embedding` (autogenerate cannot detect pgvector index ops):
     ```python
     op.execute("CREATE INDEX IF NOT EXISTS idx_user_embeddings_hnsw "
                "ON user_embeddings USING hnsw (embedding vector_cosine_ops) "
                "WITH (m=16, ef_construction=64);")
     ```

6. **Apply migration** (also run by `infra/scripts/run-migrations.sh` in container):
   ```bash
   alembic upgrade head
   ```

7. **Downgrade safety**: every revision must implement `downgrade()` properly (drop indexes, drop enums, drop tables in reverse FK order).

---

## 2.5 Database Connection Setup

### PostgreSQL (`core/database.py`)
```python
# Create async engine with asyncpg
# Create async sessionmaker
# Create Base declarative class
# Provide get_db() dependency for FastAPI

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with async_session() as session:
        yield session
```

### MongoDB (`core/mongodb.py`)
```python
# Motor async client
# Provide get_mongo_db() dependency

client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.MONGO_DB]

async def get_mongo_db():
    return db
```

### Redis (`core/redis_client.py`)
```python
# aioredis / redis.asyncio connection pool
# Provide get_redis() dependency

redis_pool = redis.asyncio.from_url(settings.REDIS_URL, decode_responses=True)

async def get_redis():
    return redis_pool
```

---

## 2.6 pgvector Extension Setup

```sql
-- Run during database initialization (infra/scripts/init-db.sh)
CREATE EXTENSION IF NOT EXISTS vector;

-- After creating user_embeddings table, add HNSW index:
CREATE INDEX idx_user_embeddings_hnsw ON user_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

---

## 2.7 Encryption Utilities (`core/security.py`)

```python
# AES-256-GCM encryption/decryption functions for private profile fields

def encrypt_field(plaintext: str, key: bytes) -> bytes:
    """Encrypt a string field using AES-256-GCM. Returns nonce + ciphertext + tag."""

def decrypt_field(encrypted: bytes, key: bytes) -> str:
    """Decrypt an AES-256-GCM encrypted field. Extracts nonce, ciphertext, tag."""

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str: ...
def verify_password(plain: str, hashed: str) -> bool: ...

# JWT utilities
def create_access_token(data: dict) -> str: ...
def create_refresh_token(data: dict) -> str: ...
def decode_token(token: str) -> dict: ...
```

---

## 2.8 SQLAlchemy Base Model

```python
# File: app/backend/models/base.py

from sqlalchemy.orm import DeclarativeBase
import uuid
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

---

## 2.9 Phase 2 File Creation Checklist

| # | File | Contents |
|---|------|----------|
| 1 | `backend/models/__init__.py` | Import all models so Alembic discovers them |
| 2 | `backend/models/base.py` | `Base` (DeclarativeBase) + `TimestampMixin` |
| 3 | `backend/models/user.py` | `User` model (incl. email/phone verified, locked_until) |
| 4 | `backend/models/profile.py` | `PublicProfile` + `PrivateProfile` |
| 5 | `backend/models/preference.py` | `UserPreference` |
| 6 | `backend/models/match.py` | `Match` |
| 7 | `backend/models/chat.py` | `ChatThread` |
| 8 | `backend/models/chat_message.py` | MongoDB message schema (Pydantic) + indexes spec |
| 9 | `backend/models/safety.py` | `SafetyEvent` (uses `event_metadata` attr) + `Report` + `Block` |
| 10 | `backend/models/embedding.py` | `UserEmbedding` (pgvector Vector(384)) |
| 11 | `backend/models/subscription.py` | `Subscription` |
| 12 | `backend/models/payment.py` | `Payment` |
| 13 | `backend/models/notification.py` | `Notification` + `DeviceToken` |
| 14 | `backend/models/safe_session.py` | `SafeSession` |
| 15 | `backend/models/verification.py` | `EmailVerification` + `PhoneVerification` + `PasswordResetToken` |
| 16 | `backend/models/audit.py` | `AuditLog` |
| 17 | `backend/core/database.py` | Async PG engine + session + `get_db` dependency |
| 18 | `backend/core/mongodb.py` | Motor async client + `get_mongo_db` |
| 19 | `backend/core/redis_client.py` | Redis async pool + `get_redis` |
| 20 | `backend/core/security.py` | AES-256-GCM, bcrypt, JWT |
| 21 | `backend/alembic.ini` | Alembic configuration (async-aware) |
| 22 | `backend/alembic/env.py` | Full async migration env from §2.4 step 3 |
| 23 | `backend/alembic/versions/{auto}_initial_schema.py` | Initial migration (includes manual HNSW op) |
| 24 | `infra/scripts/init-db.sh` | `CREATE EXTENSION uuid-ossp, vector` |

### Test database
Add `TEST_DATABASE_URL=postgresql+asyncpg://elyra_user:elyra_dev_pass@postgres:5432/elyra_test` to `.env.example`. The `init-db.sh` script must also create `elyra_test` and enable `vector` extension on it.

---

## 2.9b Comprehensive Index Plan

| Table | Indexes |
|---|---|
| `users` | UNIQUE(email), UNIQUE(phone), idx(role), idx(is_active), idx(deleted_at) |
| `public_profiles` | UNIQUE(user_id), idx(city), idx(intent), idx(is_visible), idx(latitude, longitude) |
| `private_profiles` | UNIQUE(user_id) |
| `user_preferences` | UNIQUE(user_id) |
| `matches` | UNIQUE(user_id_1, user_id_2), idx(status), idx(matched_at), CHECK(user_id_1 < user_id_2) |
| `chat_threads` | UNIQUE(match_id), idx(participant_1), idx(participant_2), idx(last_message_at) |
| `safety_events` | idx(user_id), idx(event_type), idx(resolved), idx(created_at) |
| `reports` | idx(reported_user_id), idx(reporter_id), idx(status), idx(created_at) |
| `blocks` | UNIQUE(blocker_id, blocked_user_id), idx(blocker_id) |
| `user_embeddings` | UNIQUE(user_id), HNSW(embedding) — manual SQL op |
| `subscriptions` | idx(user_id), idx(status), idx(expires_at) |
| `payments` | idx(user_id), idx(subscription_id), idx(status), UNIQUE(gateway_txn_id) |
| `notifications` | idx(user_id, is_read), idx(created_at) |
| `safe_sessions` | idx(user_id), idx(status), idx(scheduled_at) |
| `device_tokens` | UNIQUE(token), idx(user_id), idx(is_active) |
| `audit_logs` | idx(actor_id), idx(action), idx(created_at) |

---

## 2.10 Entity Relationship Summary

```
users ──1:1──> public_profiles
users ──1:1──> private_profiles
users ──1:1──> user_preferences
users ──1:1──> user_embeddings
users ──1:N──> subscriptions
users ──1:N──> payments
users ──1:N──> notifications
users ──1:N──> safety_events
users ──1:N──> safe_sessions
users ──M:N──> matches (via user_id_1, user_id_2)
users ──M:N──> blocks (via blocker_id, blocked_user_id)
users ──1:N──> reports (as reporter)
users ──1:N──> reports (as reported)
matches ──1:1──> chat_threads
chat_threads ──1:N──> messages (MongoDB)
subscriptions ──1:N──> payments
```

---

*Phase 2 complete. Proceed to Phase 3: Backend APIs (service by service).*
