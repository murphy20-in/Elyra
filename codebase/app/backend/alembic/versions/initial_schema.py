"""initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE IF NOT EXISTS user_role AS ENUM ('user', 'premium_user', 'verified_user', 'moderator', 'admin')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS intent_type AS ENUM ('exploring', 'serious', 'discreet', 'friendship')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS match_status AS ENUM ('pending', 'matched', 'unmatched', 'expired')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS safety_event_type AS ENUM ('sos_triggered', 'location_shared', 'check_in_missed', 'suspicious_activity')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS report_reason AS ENUM ('harassment', 'fake_profile', 'inappropriate_content', 'spam', 'threatening', 'other')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS subscription_tier AS ENUM ('free', 'plus', 'premium', 'elite')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS subscription_status AS ENUM ('active', 'cancelled', 'expired', 'paused')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS notification_type AS ENUM ('match', 'message', 'safety', 'payment', 'system')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS device_platform AS ENUM ('ios', 'android', 'web')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS safe_session_status AS ENUM ('active', 'completed', 'sos_triggered', 'expired')"
    )

    op.create_table(
        "users",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("user", "premium_user", "verified_user", "moderator", "admin", name="user_role"), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_banned", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("failed_login_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_user_email", "users", ["email"], unique=True)
    op.create_index("idx_user_phone", "users", ["phone"], unique=True)
    op.create_index("idx_user_role", "users", ["role"])
    op.create_index("idx_user_is_active", "users", ["is_active"])
    op.create_index("idx_user_deleted_at", "users", ["deleted_at"])

    op.create_table(
        "public_profiles",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("gender_identity", sa.String(50), nullable=False),
        sa.Column("sexual_orientation", sa.String(50), nullable=False),
        sa.Column("pronouns", sa.String(30), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("profile_photo_url", sa.String(500), nullable=True),
        sa.Column("photos", sa.JSONB(), server_default="[]"),
        sa.Column("intent", sa.Enum("exploring", "serious", "discreet", "friendship", name="intent_type"), nullable=False),
        sa.Column("is_visible", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_public_profile_city", "public_profiles", ["city"])
    op.create_index("idx_public_profile_intent", "public_profiles", ["intent"])
    op.create_index("idx_public_profile_is_visible", "public_profiles", ["is_visible"])
    op.create_index("idx_public_profile_location", "public_profiles", ["latitude", "longitude"])

    op.create_table(
        "private_profiles",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("real_name_enc", sa.LargeBinary(), nullable=True),
        sa.Column("phone_enc", sa.LargeBinary(), nullable=True),
        sa.Column("address_enc", sa.LargeBinary(), nullable=True),
        sa.Column("id_document_enc", sa.LargeBinary(), nullable=True),
        sa.Column("reveal_to", sa.JSONB(), server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "user_preferences",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("preferred_genders", sa.JSONB(), server_default="[]"),
        sa.Column("preferred_orientations", sa.JSONB(), server_default="[]"),
        sa.Column("age_min", sa.Integer(), server_default="18"),
        sa.Column("age_max", sa.Integer(), server_default="50"),
        sa.Column("max_distance_km", sa.Integer(), server_default="50"),
        sa.Column("preferred_intents", sa.JSONB(), server_default="[]"),
        sa.Column("deal_breakers", sa.JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "user_embeddings",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("embedding", sa.LargeBinary(), nullable=True),
        sa.Column("source_text", sa.Text(), nullable=True),
        sa.Column("model_version", sa.String(50), server_default="v1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_user_embedding_user_id", "user_embeddings", ["user_id"])

    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_embeddings_hnsw "
        "ON user_embeddings USING hnsw (embedding vector_cosine_ops) "
        "WITH (m=16, ef_construction=64);"
    )

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("tier", sa.Enum("free", "plus", "premium", "elite", name="subscription_tier"), nullable=False, server_default="free"),
        sa.Column("status", sa.Enum("active", "cancelled", "expired", "paused", name="subscription_status"), nullable=False, server_default="active"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("auto_renew", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("idx_subscription_user_id", "subscriptions", ["user_id"])
    op.create_index("idx_subscription_status", "subscriptions", ["status"])
    op.create_index("idx_subscription_expires_at", "subscriptions", ["expires_at"])

    op.create_table(
        "payments",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("subscription_id", sa.UUID(as_uuid=True), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="INR"),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column("payment_gateway", sa.String(50), nullable=True),
        sa.Column("gateway_txn_id", sa.String(255), nullable=True),
        sa.Column("status", sa.Enum("pending", "completed", "failed", "refunded", name="payment_status"), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"]),
    )
    op.create_index("idx_payment_user_id", "payments", ["user_id"])
    op.create_index("idx_payment_subscription_id", "payments", ["subscription_id"])
    op.create_index("idx_payment_status", "payments", ["status"])

    op.create_table(
        "matches",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id_1", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id_2", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.Enum("pending", "matched", "unmatched", "expired", name="match_status"), nullable=False, server_default="pending"),
        sa.Column("liked_by_1", sa.Boolean(), server_default="false"),
        sa.Column("liked_by_2", sa.Boolean(), server_default="false"),
        sa.Column("match_score", sa.Float(), nullable=True),
        sa.Column("matched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id_1"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id_2"], ["users.id"]),
        sa.UniqueConstraint("user_id_1", "user_id_2", name="uq_match_pair"),
    )
    op.execute("ALTER TABLE matches ADD CONSTRAINT ck_ordered_pair CHECK (user_id_1 < user_id_2)")
    op.create_index("idx_match_status", "matches", ["status"])
    op.create_index("idx_match_matched_at", "matches", ["matched_at"])

    op.create_table(
        "chat_threads",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("match_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("participant_1", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("participant_2", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("is_anonymous", sa.Boolean(), server_default="false"),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.ForeignKeyConstraint(["participant_1"], ["users.id"]),
        sa.ForeignKeyConstraint(["participant_2"], ["users.id"]),
    )
    op.create_index("idx_chat_thread_participant_1", "chat_threads", ["participant_1"])
    op.create_index("idx_chat_thread_participant_2", "chat_threads", ["participant_2"])
    op.create_index("idx_chat_thread_last_message_at", "chat_threads", ["last_message_at"])

    op.create_table(
        "safe_sessions",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("match_id", sa.UUID(as_uuid=True), nullable=True),
        sa.Column("emergency_contact_name", sa.String(100), nullable=False),
        sa.Column("emergency_contact_phone", sa.String(20), nullable=False),
        sa.Column("meeting_location", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_in_interval_min", sa.Integer(), server_default="30"),
        sa.Column("last_check_in", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.Enum("active", "completed", "sos_triggered", "expired", name="safe_session_status"), nullable=False, server_default="active"),
        sa.Column("live_location_enabled", sa.Boolean(), server_default="false"),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
    )
    op.create_index("idx_safe_session_user_id", "safe_sessions", ["user_id"])
    op.create_index("idx_safe_session_status", "safe_sessions", ["status"])
    op.create_index("idx_safe_session_scheduled_at", "safe_sessions", ["scheduled_at"])

    op.create_table(
        "safety_events",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.Enum("sos_triggered", "location_shared", "check_in_missed", "suspicious_activity", name="safety_event_type"), nullable=False),
        sa.Column("metadata", sa.JSONB(), server_default="{}"),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("resolved", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("idx_safety_event_user_id", "safety_events", ["user_id"])
    op.create_index("idx_safety_event_type", "safety_events", ["event_type"])
    op.create_index("idx_safety_event_resolved", "safety_events", ["resolved"])
    op.create_index("idx_safety_event_created_at", "safety_events", ["created_at"])

    op.create_table(
        "reports",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("reporter_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("reported_user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.Enum("harassment", "fake_profile", "inappropriate_content", "spam", "threatening", "other", name="report_reason"), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("evidence_urls", sa.JSONB(), server_default="[]"),
        sa.Column("status", sa.Enum("pending", "reviewing", "resolved", "dismissed", name="report_status"), nullable=False, server_default="pending"),
        sa.Column("reviewed_by", sa.UUID(as_uuid=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reported_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
    )
    op.create_index("idx_report_reported_user_id", "reports", ["reported_user_id"])
    op.create_index("idx_report_reporter_id", "reports", ["reporter_id"])
    op.create_index("idx_report_status", "reports", ["status"])
    op.create_index("idx_report_created_at", "reports", ["created_at"])

    op.create_table(
        "blocks",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("blocker_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("blocked_user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["blocker_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["blocked_user_id"], ["users.id"]),
        sa.UniqueConstraint("blocker_id", "blocked_user_id", name="uq_block_pair"),
    )
    op.create_index("idx_block_blocker_id", "blocks", ["blocker_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.Enum("match", "message", "safety", "payment", "system", name="notification_type"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("data", sa.JSONB(), server_default="{}"),
        sa.Column("is_read", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("idx_notification_user_is_read", "notifications", ["user_id", "is_read"])
    op.create_index("idx_notification_created_at", "notifications", ["created_at"])

    op.create_table(
        "device_tokens",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("token", sa.String(500), nullable=False),
        sa.Column("platform", sa.Enum("ios", "android", "web", name="device_platform"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_device_token_user_id", "device_tokens", ["user_id"])
    op.create_index("idx_device_token_is_active", "device_tokens", ["is_active"])

    op.create_table(
        "email_verifications",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_email_verification_token_hash", "email_verifications", ["token_hash"])

    op.create_table(
        "phone_verifications",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("otp_hash", sa.String(255), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_password_reset_token_hash", "password_reset_tokens", ["token_hash"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_id", sa.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=True),
        sa.Column("target_id", sa.UUID(as_uuid=True), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("extra", sa.JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
    )
    op.create_index("idx_audit_log_actor_id", "audit_logs", ["actor_id"])
    op.create_index("idx_audit_log_action", "audit_logs", ["action"])
    op.create_index("idx_audit_log_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("password_reset_tokens")
    op.drop_table("phone_verifications")
    op.drop_table("email_verifications")
    op.drop_table("device_tokens")
    op.drop_table("notifications")
    op.drop_table("blocks")
    op.drop_table("reports")
    op.drop_table("safety_events")
    op.drop_table("safe_sessions")
    op.drop_table("chat_threads")
    op.drop_table("matches")
    op.drop_table("payments")
    op.drop_table("subscriptions")
    op.drop_table("user_embeddings")
    op.drop_table("user_preferences")
    op.drop_table("private_profiles")
    op.drop_table("public_profiles")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS safe_session_status")
    op.execute("DROP TYPE IF EXISTS device_platform")
    op.execute("DROP TYPE IF EXISTS notification_type")
    op.execute("DROP TYPE IF EXISTS payment_status")
    op.execute("DROP TYPE IF EXISTS subscription_status")
    op.execute("DROP TYPE IF EXISTS subscription_tier")
    op.execute("DROP TYPE IF EXISTS report_status")
    op.execute("DROP TYPE IF EXISTS report_reason")
    op.execute("DROP TYPE IF EXISTS safety_event_type")
    op.execute("DROP TYPE IF EXISTS match_status")
    op.execute("DROP TYPE IF EXISTS intent_type")
    op.execute("DROP TYPE IF EXISTS user_role")