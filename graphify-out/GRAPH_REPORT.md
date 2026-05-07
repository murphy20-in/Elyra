# Graph Report - Elyra-main  (2026-05-07)

## Corpus Check
- 153 files · ~112,941 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1041 nodes · 1996 edges · 97 communities (82 shown, 15 thin omitted)
- Extraction: 59% EXTRACTED · 41% INFERRED · 0% AMBIGUOUS · INFERRED: 817 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c7c0fcfd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]

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
- `AIClient` --calls--> `ai_client()`  [INFERRED]
  codebase/app/backend/core/ai_client.py → codebase/app/backend/tests/ai/test_fake_profile.py
- `AIClient` --calls--> `ai_client()`  [INFERRED]
  codebase/app/backend/core/ai_client.py → codebase/app/backend/tests/ai/test_moderation.py
- `AIClient` --uses--> `Tests for the moderation AI service (respx-mocked).`  [INFERRED]
  codebase/app/backend/core/ai_client.py → codebase/app/backend/tests/ai/test_moderation.py
- `run_migrations_online()` --calls--> `connect()`  [INFERRED]
  codebase/app/backend/alembic/env.py → codebase/app/backend/websocket/manager.py
- `_validate_phone()` --calls--> `Match`  [INFERRED]
  codebase/app/backend/schemas/safety.py → codebase/app/backend/models/match.py

## Communities (97 total, 15 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (88): AIClient, Extract and validate JWT from the socket.io auth dict.      auth dict comes from, Base, Base, TimestampMixin, DeclarativeBase, UserEmbedding, EventPublisher (+80 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (25): AuditLog, change_password(), forgot_password(), login(), logout(), oauth_login(), refresh(), register() (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (29): BaseHTTPMiddleware, get_db(), health_detailed(), liveness(), Always 200 - proves the process is alive., Checks all three databases., readiness(), configure_logging() (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (18): _cached_encode(), EmbeddingModel, create_access_token(), create_refresh_token(), decrypt_field(), encrypt_field(), get_encryption_key(), _new_jti() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (28): PreferenceCreate, Preference schemas (re-exported by schemas.profile for the /profiles router)., Same shape as PreferenceUpdate for now — preferences are upserted., PreferenceUpdate, delete_photo(), get_my_profile(), get_preferences(), OwnProfileResponse (+20 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (22): publish_event(), block_user(), check_in(), create_report(), create_safe_session(), end_session(), get_active_session(), list_reports() (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.36
Nodes (27): add_bg(), add_ellipse(), add_rect(), add_text(), brand_mark(), chip(), footer(), glass_card() (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (11): discover(), like_user(), pass_user(), unmatch(), _compute_match_score(), _haversine_km(), MatchingService, get_redis() (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (22): WebSocket JWT auth helper. Used exclusively by the socket.io connect event., Extract and validate JWT from the socket.io auth dict.      auth dict comes from, verify_socket_token(), connect(), disconnect(), get_redis(), handle_heartbeat(), socket.io AsyncServer setup with Redis pub/sub adapter for horizontal scaling. (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.23
Nodes (24): AnonymousMessageFilter, Handles anonymous identity mapping for chat threads.     Each user gets a stable, ChatThread, Exception, socket.io event handlers. All handlers are registered on the `sio` instance from, Called via asyncio.create_task — never blocks message delivery., Called via asyncio.create_task — never blocks message delivery., Input: { "thread_id": str }      1. get_user_id_for_sid(sid)     2. Async query (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (7): API tests for /api/v1/auth/* endpoints., TestChangePassword, TestLogin, TestLogout, TestMe, TestRefreshToken, TestRegister

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (8): _is_circuit_open(), _post_with_retry(), _record_failure(), _record_success(), ai_client(), Tests for the fake profile AI service (respx-mocked)., TestFakeProfileHeuristics, TestFakeProfileService

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (19): ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, OAuthLoginRequest, _password_strength(), ResetPasswordRequest, SendOTPRequest, TokenRefreshRequest (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (11): ChatService, ChatService — MongoDB message persistence layer. Uses Motor (async MongoDB drive, Set is_moderated=True and moderation_result on the message.         Query by _id, Add user_id to read_by array for all specified message_ids.         Use $addToSe, Soft delete: set is_deleted=True.         Only allowed if sender_id matches user, Called once at app startup.         Create the following indexes:           1. C, MongoDB CRUD operations for chat messages., Insert message document into MongoDB.         Returns the inserted _id as string (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (9): $(), activatePanel(), renderCandidate(), setupAuthModal(), setupChat(), setupIdentityReveal(), setupMatching(), setupSafeDate() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (5): ABC, LLMClient, LLMProvider, LocalProvider, OpenAIProvider

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (6): API tests for /api/v1/profiles/* endpoints., TestOtherUserProfile, TestOwnProfile, TestPreferences, TestPrivateProfile, TestProfileReveal

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (7): RegisterRequest, PublicProfileUpdate, SafeSessionCreate, Unit tests for Pydantic schema validation., TestPublicProfileSchema, TestRegisterSchema, TestSafeSessionSchema

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (15): get_redis(), handle_get_online_status(), handle_join_thread(), handle_leave_thread(), handle_send_message(), handle_typing_start(), handle_typing_stop(), moderate_message_async() (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.16
Nodes (9): check_high_risk(), check_immediate_block(), check_spam_bio(), is_disposable_email(), ToxicityClassifier, moderate_text(), ai_client(), Tests for the moderation AI service (respx-mocked). (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.19
Nodes (9): $(), setupAuthModal(), setupChat(), setupDemoShortcuts(), setupIntentSelection(), setupMatching(), setupPrivateReveal(), setupSafeSession() (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (6): API tests for /api/v1/matches/* endpoints., TestDiscover, TestGetMatches, TestLike, TestPass, TestUnmatch

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (6): $(), setupChatModeration(), setupIdentityUnlock(), setupMatchGeneration(), setupSafeDate(), setupTrustAnimation()

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (4): API tests for /api/v1/safety/* endpoints., TestBlocks, TestReports, TestSafeSession

### Community 24 - "Community 24"
Cohesion: 0.21
Nodes (7): get_or_create_alias(), get_real_user_id(), Anonymous message identity mapping. When a ChatThread has is_anonymous=True, sen, transform_message(), anon_filter(), Unit tests for websocket/anonymous.py AnonymousMessageFilter., TestAnonymousFilter

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (12): get_messages(), list_threads(), mark_read(), MessageListResponse, MessageResponse, Chat / thread Pydantic schemas., send_message(), SendMessageRequest (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (12): BlockCreate, BlockResponse, get_risk_score(), LocationUpdate, Safety / Trust & Safety / SafeDate Pydantic schemas., ReportCreate, ReportResponse, RiskScoreResponse (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.2
Nodes (8): admin_headers(), auth_headers(), client(), httpx_response(), moderator_headers(), _register_and_get_headers(), second_user_headers(), _get_client()

### Community 28 - "Community 28"
Cohesion: 0.21
Nodes (7): get_auth_token(), WebSocket event tests for the socket.io chat system., Note: Full WS testing requires actual server. This is a placeholder., TestHeartbeat, TestTypingIndicator, TestWebSocketConnection, TestWebSocketMessaging

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (4): Security: RBAC bypass, cross-user data access, token validation., TestCrossUserIsolation, TestRBACEnforcement, TestTokenValidation

### Community 30 - "Community 30"
Cohesion: 0.17
Nodes (3): HttpUser, ElyraUser, Locust load test for Elyra.

### Community 31 - "Community 31"
Cohesion: 0.2
Nodes (8): compute_similarity(), generate_embedding(), health(), EmbedRequest, EmbedResponse, SimilarityRequest, SimilarityResponse, TestEmbeddingService

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (4): API tests for /api/v1/payments/* endpoints., TestPlans, TestRazorpayWebhook, TestSubscription

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (8): get_plans(), PaymentCreate, PaymentResponse, PaymentWebhookRequest, Payment & subscription Pydantic schemas., SubscribeRequest, SubscriptionPlan, SubscriptionResponse

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (3): API tests for /api/v1/chat/* REST endpoints., TestMessages, TestThreadList

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (4): Security: SQL injection, XSS, oversized payloads., TestOversizedPayloads, TestSQLInjection, TestXSSPrevention

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (7): DiscoverResponse, LikeAction, list_matches(), MatchCandidate, MatchListResponse, MatchResponse, Match-related Pydantic schemas.

### Community 37 - "Community 37"
Cohesion: 0.29
Nodes (6): moderate_image(), verify_face(), FaceVerifyRequest, FaceVerifyResponse, ImageModerationRequest, ImageModerationResponse

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (4): FakeProfileDetector, score_profile(), FakeProfileRequest, FakeProfileResponse

### Community 41 - "Community 41"
Cohesion: 0.33
Nodes (5): moderate_batch(), BatchModerationRequest, BatchModerationResponse, TextModerationRequest, TextModerationResponse

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (6): DeviceTokenRegister, list_notifications(), NotificationListResponse, NotificationPreferences, NotificationResponse, Notification & device-token Pydantic schemas.

### Community 45 - "Community 45"
Cohesion: 0.47
Nodes (4): _create_enum_if_missing(), _enum(), initial schema  Revision ID: 0001 Revises: Create Date: 2024-01-01 00:00:00.0000, upgrade()

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (3): Security: rate limiting enforcement tests., TestAuthRateLimiting, TestMessageRateLimiting

### Community 51 - "Community 51"
Cohesion: 0.5
Nodes (3): ChatMessage, ModerationResult, Pydantic schema for MongoDB chat message documents.  This is NOT a SQLAlchemy mo

### Community 52 - "Community 52"
Cohesion: 0.83
Nodes (3): _init_firebase(), send_push(), send_single_push()

## Knowledge Gaps
- **68 isolated node(s):** `Elyra — Investor Pitch Deck (PPTX generator, v2) Strict layout grid · refined gl`, `A glassmorphic card: dark fill + thin stroke + 1-pt top inner highlight.`, `Locust load test for Elyra.`, `Security primitives: AES-256-GCM field encryption, bcrypt password hashing, JWT`, `Resolve the AES-256 key from settings.      Accepts the key as:       * 64-char` (+63 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `create_access_token()` connect `Community 3` to `Community 0`, `Community 1`, `Community 5`, `Community 10`, `Community 29`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `TrustSafetyService` connect `Community 0` to `Community 1`, `Community 5`, `Community 39`, `Community 9`, `Community 11`, `Community 26`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `User` connect `Community 0` to `Community 1`, `Community 2`, `Community 5`, `Community 7`, `Community 8`, `Community 18`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 56 inferred relationships involving `User` (e.g. with `EventPublisher` and `EventSubscriber`) actually correct?**
  _`User` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 50 inferred relationships involving `TrustSafetyService` (e.g. with `EventPublisher` and `EventSubscriber`) actually correct?**
  _`TrustSafetyService` has 50 INFERRED edges - model-reasoned connections that need verification._
- **Are the 44 inferred relationships involving `NotificationService` (e.g. with `EventPublisher` and `EventSubscriber`) actually correct?**
  _`NotificationService` has 44 INFERRED edges - model-reasoned connections that need verification._
- **Are the 39 inferred relationships involving `PaymentService` (e.g. with `EventPublisher` and `EventSubscriber`) actually correct?**
  _`PaymentService` has 39 INFERRED edges - model-reasoned connections that need verification._