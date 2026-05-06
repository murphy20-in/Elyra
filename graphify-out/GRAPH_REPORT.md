# Graph Report - Elyra-main  (2026-05-06)

## Corpus Check
- 153 files · ~98,515 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1041 nodes · 1996 edges · 46 communities detected
- Extraction: 59% EXTRACTED · 41% INFERRED · 0% AMBIGUOUS · INFERRED: 817 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]

## God Nodes (most connected - your core abstractions)
1. `User` - 59 edges
2. `TrustSafetyService` - 59 edges
3. `NotificationService` - 54 edges
4. `PaymentService` - 47 edges
5. `AIClient` - 46 edges
6. `PublicProfile` - 42 edges
7. `UserEmbedding` - 38 edges
8. `AuthService` - 37 edges
9. `ChatService` - 36 edges
10. `ProfileService` - 34 edges

## Surprising Connections (you probably didn't know these)
- `AIClient` --uses--> `Tests for the moderation AI service (respx-mocked).`  [INFERRED]
  codebase/app/backend/core/ai_client.py → codebase/app/backend/tests/ai/test_moderation.py
- `AIClient` --calls--> `ai_client()`  [INFERRED]
  codebase/app/backend/core/ai_client.py → codebase/app/backend/tests/ai/test_fake_profile.py
- `AIClient` --calls--> `ai_client()`  [INFERRED]
  codebase/app/backend/core/ai_client.py → codebase/app/backend/tests/ai/test_moderation.py
- `run_migrations_online()` --calls--> `connect()`  [INFERRED]
  codebase/app/backend/alembic/env.py → codebase/app/backend/websocket/manager.py
- `_validate_phone()` --calls--> `Match`  [INFERRED]
  codebase/app/backend/schemas/safety.py → codebase/app/backend/models/match.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (88): AIClient, Extract and validate JWT from the socket.io auth dict.      auth dict comes from, Base, Base, TimestampMixin, DeclarativeBase, UserEmbedding, EventPublisher (+80 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (90): ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, OAuthLoginRequest, _password_strength(), ResetPasswordRequest, SendOTPRequest, TokenRefreshRequest (+82 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (79): AnonymousMessageFilter, get_or_create_alias(), get_real_user_id(), Anonymous message identity mapping. When a ChatThread has is_anonymous=True, sen, Handles anonymous identity mapping for chat threads.     Each user gets a stable, transform_message(), WebSocket JWT auth helper. Used exclusively by the socket.io connect event., Extract and validate JWT from the socket.io auth dict.      auth dict comes from (+71 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): AuditLog, change_password(), forgot_password(), login(), logout(), oauth_login(), refresh(), register() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (29): BaseHTTPMiddleware, get_db(), health_detailed(), liveness(), Always 200 - proves the process is alive., Checks all three databases., readiness(), configure_logging() (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (18): _cached_encode(), EmbeddingModel, create_access_token(), create_refresh_token(), decrypt_field(), encrypt_field(), get_encryption_key(), _new_jti() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (28): PreferenceCreate, Preference schemas (re-exported by schemas.profile for the /profiles router)., Same shape as PreferenceUpdate for now — preferences are upserted., PreferenceUpdate, delete_photo(), get_my_profile(), get_preferences(), OwnProfileResponse (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (22): publish_event(), block_user(), check_in(), create_report(), create_safe_session(), end_session(), get_active_session(), list_reports() (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.36
Nodes (27): add_bg(), add_ellipse(), add_rect(), add_text(), brand_mark(), chip(), footer(), glass_card() (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.1
Nodes (11): discover(), like_user(), pass_user(), unmatch(), _compute_match_score(), _haversine_km(), MatchingService, get_redis() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (7): API tests for /api/v1/auth/* endpoints., TestChangePassword, TestLogin, TestLogout, TestMe, TestRefreshToken, TestRegister

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (8): _is_circuit_open(), _post_with_retry(), _record_failure(), _record_success(), ai_client(), Tests for the fake profile AI service (respx-mocked)., TestFakeProfileHeuristics, TestFakeProfileService

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (9): $(), activatePanel(), renderCandidate(), setupAuthModal(), setupChat(), setupIdentityReveal(), setupMatching(), setupSafeDate() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (5): ABC, LLMClient, LLMProvider, LocalProvider, OpenAIProvider

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (6): API tests for /api/v1/profiles/* endpoints., TestOtherUserProfile, TestOwnProfile, TestPreferences, TestPrivateProfile, TestProfileReveal

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (7): RegisterRequest, PublicProfileUpdate, SafeSessionCreate, Unit tests for Pydantic schema validation., TestPublicProfileSchema, TestRegisterSchema, TestSafeSessionSchema

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (9): check_high_risk(), check_immediate_block(), check_spam_bio(), is_disposable_email(), ToxicityClassifier, moderate_text(), ai_client(), Tests for the moderation AI service (respx-mocked). (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (9): $(), setupAuthModal(), setupChat(), setupDemoShortcuts(), setupIntentSelection(), setupMatching(), setupPrivateReveal(), setupSafeSession() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (6): API tests for /api/v1/matches/* endpoints., TestDiscover, TestGetMatches, TestLike, TestPass, TestUnmatch

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (6): $(), setupChatModeration(), setupIdentityUnlock(), setupMatchGeneration(), setupSafeDate(), setupTrustAnimation()

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (4): API tests for /api/v1/safety/* endpoints., TestBlocks, TestReports, TestSafeSession

### Community 21 - "Community 21"
Cohesion: 0.2
Nodes (8): admin_headers(), auth_headers(), client(), httpx_response(), moderator_headers(), _register_and_get_headers(), second_user_headers(), _get_client()

### Community 22 - "Community 22"
Cohesion: 0.21
Nodes (7): get_auth_token(), WebSocket event tests for the socket.io chat system., Note: Full WS testing requires actual server. This is a placeholder., TestHeartbeat, TestTypingIndicator, TestWebSocketConnection, TestWebSocketMessaging

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (4): Security: RBAC bypass, cross-user data access, token validation., TestCrossUserIsolation, TestRBACEnforcement, TestTokenValidation

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (3): HttpUser, ElyraUser, Locust load test for Elyra.

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (4): API tests for /api/v1/payments/* endpoints., TestPlans, TestRazorpayWebhook, TestSubscription

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (3): API tests for /api/v1/chat/* REST endpoints., TestMessages, TestThreadList

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (4): Security: SQL injection, XSS, oversized payloads., TestOversizedPayloads, TestSQLInjection, TestXSSPrevention

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (2): Unit tests for risk score calculation in trust_safety_service.py., TestRiskScoring

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (2): BaseSettings, Settings

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (2): Integration: complete registration → profile → discovery flow., TestRegistrationFlow

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (2): API tests for /api/v1/notifications/* endpoints., TestNotifications

### Community 32 - "Community 32"
Cohesion: 0.47
Nodes (4): _create_enum_if_missing(), _enum(), initial schema  Revision ID: 0001 Revises: Create Date: 2024-01-01 00:00:00.0000, upgrade()

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (2): Integration: like → mutual match → chat thread → unmatch flow., TestMatchingFlow

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (2): Integration: create safe session → check-in → SOS → end., TestSafeDateFlow

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (3): Security: rate limiting enforcement tests., TestAuthRateLimiting, TestMessageRateLimiting

### Community 36 - "Community 36"
Cohesion: 0.4
Nodes (2): Integration: send toxic message → moderation → flag/block., TestModerationFlow

### Community 37 - "Community 37"
Cohesion: 0.4
Nodes (2): Alembic async migration environment for Elyra., run_migrations_online()

### Community 38 - "Community 38"
Cohesion: 0.83
Nodes (3): _init_firebase(), send_push(), send_single_push()

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (1): FastAPI routers for the Elyra API.

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (1): Get or create a stable anonymous alias for a user in a thread.         First use

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): Replace sender_id with anon alias in the outbound message dict.         Returns

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): Reverse lookup: get real user_id from alias.

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): Input: { "thread_id": str }     await sio.leave_room(sid, f"thread_{thread_id}")

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): Input: { "user_ids": [str] }   (max 50 user_ids per call)

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): 1. get_user_id_for_sid(sid) → user_id (may be None if connect failed early)

## Knowledge Gaps
- **68 isolated node(s):** `Elyra — Investor Pitch Deck (PPTX generator, v2) Strict layout grid · refined gl`, `A glassmorphic card: dark fill + thin stroke + 1-pt top inner highlight.`, `Locust load test for Elyra.`, `Security primitives: AES-256-GCM field encryption, bcrypt password hashing, JWT`, `Resolve the AES-256 key from settings.      Accepts the key as:       * 64-char` (+63 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 28`** (8 nodes): `test_risk_scoring.py`, `Unit tests for risk score calculation in trust_safety_service.py.`, `TestRiskScoring`, `.test_many_upheld_reports_high_risk()`, `.test_new_account_higher_risk()`, `.test_score_normalized_0_to_1()`, `.test_verified_user_lower_risk_than_unverified()`, `.test_zero_reports_low_risk()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (7 nodes): `BaseSettings`, `config.py`, `DATABASE_URL()`, `MONGO_URL()`, `REDIS_URL()`, `Settings`, `SYNC_DATABASE_URL()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (7 nodes): `test_registration_flow.py`, `Integration: complete registration → profile → discovery flow.`, `TestRegistrationFlow`, `.test_full_profile_setup()`, `.test_register_creates_preferences()`, `.test_register_creates_user_and_profile()`, `.test_register_to_discovery()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (7 nodes): `test_notifications.py`, `API tests for /api/v1/notifications/* endpoints.`, `TestNotifications`, `.test_get_notifications_empty()`, `.test_mark_notification_read()`, `.test_register_device_token()`, `.test_unauth_notifications_returns_401()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (6 nodes): `test_matching_flow.py`, `Integration: like → mutual match → chat thread → unmatch flow.`, `TestMatchingFlow`, `.test_mutual_like_creates_match_thread_and_notification()`, `.test_one_way_like_no_match()`, `.test_unmatch_closes_thread()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (6 nodes): `test_safe_date_flow.py`, `Integration: create safe session → check-in → SOS → end.`, `TestSafeDateFlow`, `.test_cannot_create_two_active_sessions()`, `.test_full_safe_session_lifecycle()`, `.test_sos_creates_safety_event()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (5 nodes): `test_moderation_flow.py`, `Integration: send toxic message → moderation → flag/block.`, `TestModerationFlow`, `.test_clean_message_allowed()`, `.test_toxic_message_moderation_mock()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (5 nodes): `env.py`, `do_run_migrations()`, `Alembic async migration environment for Elyra.`, `run_migrations_offline()`, `run_migrations_online()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (3 nodes): `__init__.py`, `__init__.py`, `FastAPI routers for the Elyra API.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `Get or create a stable anonymous alias for a user in a thread.         First use`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `Replace sender_id with anon alias in the outbound message dict.         Returns`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `Reverse lookup: get real user_id from alias.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `Input: { "thread_id": str }     await sio.leave_room(sid, f"thread_{thread_id}")`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `Input: { "user_ids": [str] }   (max 50 user_ids per call)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `1. get_user_id_for_sid(sid) → user_id (may be None if connect failed early)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `create_access_token()` connect `Community 5` to `Community 0`, `Community 3`, `Community 7`, `Community 10`, `Community 23`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `TrustSafetyService` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 7`, `Community 11`, `Community 28`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `User` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 7`, `Community 9`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 56 inferred relationships involving `User` (e.g. with `EventPublisher` and `EventSubscriber`) actually correct?**
  _`User` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 50 inferred relationships involving `TrustSafetyService` (e.g. with `EventPublisher` and `EventSubscriber`) actually correct?**
  _`TrustSafetyService` has 50 INFERRED edges - model-reasoned connections that need verification._
- **Are the 44 inferred relationships involving `NotificationService` (e.g. with `EventPublisher` and `EventSubscriber`) actually correct?**
  _`NotificationService` has 44 INFERRED edges - model-reasoned connections that need verification._
- **Are the 39 inferred relationships involving `PaymentService` (e.g. with `EventPublisher` and `EventSubscriber`) actually correct?**
  _`PaymentService` has 39 INFERRED edges - model-reasoned connections that need verification._