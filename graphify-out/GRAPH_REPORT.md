# Graph Report - Elyra-main  (2026-08-21)

## Corpus Check
- 213 files · ~690,014 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1391 nodes · 3013 edges · 133 communities (113 shown, 20 thin omitted)
- Extraction: 63% EXTRACTED · 37% INFERRED · 0% AMBIGUOUS · INFERRED: 1105 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `33a1ec5b`
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
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 130|Community 130]]
- [[_COMMUNITY_Community 131|Community 131]]
- [[_COMMUNITY_Community 132|Community 132]]

## God Nodes (most connected - your core abstractions)
1. `User` - 59 edges
2. `TrustSafetyService` - 59 edges
3. `NotificationService` - 54 edges
4. `html()` - 48 edges
5. `PaymentService` - 47 edges
6. `AIClient` - 46 edges
7. `raw()` - 43 edges
8. `PublicProfile` - 42 edges
9. `icon()` - 41 edges
10. `UserEmbedding` - 38 edges

## Surprising Connections (you probably didn't know these)
- `setupTrustAnimation()` --calls--> `run()`  [INFERRED]
  POC/POC version/Final POC/ultimate.js → basecodebase/src/utils/db.js
- `login()` --calls--> `goto()`  [INFERRED]
  codebase/app/frontend/e2e/safety.spec.ts → basecodebase/tests/e2e/helpers.js
- `login()` --calls--> `goto()`  [INFERRED]
  codebase/app/frontend/e2e/chat.spec.ts → basecodebase/tests/e2e/helpers.js
- `loginAndGetCookies()` --calls--> `goto()`  [INFERRED]
  codebase/app/frontend/e2e/a11y.spec.ts → basecodebase/tests/e2e/helpers.js
- `loginAs()` --calls--> `goto()`  [INFERRED]
  codebase/app/frontend/e2e/discover.spec.ts → basecodebase/tests/e2e/helpers.js

## Communities (133 total, 20 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (36): $(), activatePanel(), animateNumber(), captureMeterTargets(), hasFinePointer(), playMeters(), prefersReducedMotion(), renderCandidate() (+28 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (35): navLink(), paintBanner(), paintNav(), renderShell(), setTopbar(), buildDialog(), icon(), bubble() (+27 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (28): PreferenceCreate, Preference schemas (re-exported by schemas.profile for the /profiles router)., Same shape as PreferenceUpdate for now — preferences are upserted., PreferenceUpdate, delete_photo(), get_my_profile(), get_preferences(), OwnProfileResponse (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (31): applyUpdate(), canInstall(), dismissInstall(), initInstallPrompt(), initServiceWorker(), installDismissed(), isIosSafari(), isStandalone() (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (18): buildSeedCandidates(), $(), setupChatModeration(), setupIdentityUnlock(), setupMatchGeneration(), setupSafeDate(), setupTrustAnimation(), dbAll() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (23): finish(), renderSafety(), startCountdown(), completeOnboarding(), createLocalAccount(), resolveAppState(), saveOnboardingProgress(), signOut() (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (20): Base, Base, TimestampMixin, DeclarativeBase, Match, DeviceToken, Notification, Payment (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (23): handleSend(), messageGroups(), paintMessagesOnly(), paintThread(), refreshUnreadCount(), renderChats(), renderChatThread(), scrollToEnd() (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (26): Extract and validate JWT from the socket.io auth dict.      auth dict comes from, UserEmbedding, handle_create_chat_thread(), handle_initial_embedding(), handle_update_embedding(), Triggered by: user.registered, Triggered by: user.registered, Triggered by: profile.updated, preferences.updated (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.36
Nodes (27): add_bg(), add_ellipse(), add_rect(), add_text(), brand_mark(), chip(), footer(), glass_card() (+19 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (25): confirmDialog(), openDialog(), openSheet(), errorState(), skeletonCard(), ensureHost(), toast(), toastError() (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.21
Nodes (25): AnonymousMessageFilter, Handles anonymous identity mapping for chat threads.     Each user gets a stable, ChatThread, Exception, socket.io event handlers. All handlers are registered on the `sio` instance from, Called via asyncio.create_task — never blocks message delivery., Called via asyncio.create_task — never blocks message delivery., Input: { "thread_id": str }      1. get_user_id_for_sid(sid)     2. Async query (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (20): WebSocket JWT auth helper. Used exclusively by the socket.io connect event., Extract and validate JWT from the socket.io auth dict.      auth dict comes from, verify_socket_token(), Alembic async migration environment for Elyra., run_migrations_online(), connect(), get_redis(), socket.io AsyncServer setup with Redis pub/sub adapter for horizontal scaling. (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (20): avatar(), avatarGradient(), compatibilityBreakdown(), intentLabel(), matchTile(), profileCard(), emptyState(), loadingBlock() (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (19): $(), clamp(), delegate(), prefersReducedMotion(), supportsObserver(), setupCounters(), setupReveal(), setupScrollButtons() (+11 more)

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (11): discover(), like_user(), pass_user(), unmatch(), _compute_match_score(), _haversine_km(), MatchingService, get_redis() (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (12): AIClient, _is_circuit_open(), _post_with_retry(), _record_failure(), _record_success(), generate_embedding(), ai_client(), Tests for the embedding AI service (respx-mocked). (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (7): API tests for /api/v1/auth/* endpoints., TestChangePassword, TestLogin, TestLogout, TestMe, TestRefreshToken, TestRegister

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (13): publish_event(), block_user(), check_in(), create_report(), create_safe_session(), end_session(), get_active_session(), list_reports() (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (13): handle_match_notification(), handle_moderator_alert(), handle_payment_notification(), Triggered by: match.created, Triggered by: report.created, safety.sos, Triggered by: payment.completed, delete_notification(), get_unread_count() (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (22): ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, OAuthLoginRequest, _password_strength(), ResetPasswordRequest, SendOTPRequest, TokenRefreshRequest (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (21): get_redis(), handle_get_online_status(), handle_join_thread(), handle_leave_thread(), handle_mark_read(), handle_send_message(), handle_typing_start(), handle_typing_stop() (+13 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (5): ABC, LLMClient, LLMProvider, LocalProvider, OpenAIProvider

### Community 23 - "Community 23"
Cohesion: 0.14
Nodes (10): ChatService, ChatService — MongoDB message persistence layer. Uses Motor (async MongoDB drive, Set is_moderated=True and moderation_result on the message.         Query by _id, Add user_id to read_by array for all specified message_ids.         Use $addToSe, Soft delete: set is_deleted=True.         Only allowed if sender_id matches user, Called once at app startup.         Create the following indexes:           1. C, MongoDB CRUD operations for chat messages., Insert message document into MongoDB.         Returns the inserted _id as string (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.24
Nodes (14): ensureSeeded(), getDeck(), likeCandidate(), listMatches(), passCandidate(), scoreFor(), distanceScore(), explainScore() (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (4): AuditLog, hash_password(), verify_password(), TestPasswordHashing

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (6): API tests for /api/v1/profiles/* endpoints., TestOtherUserProfile, TestOwnProfile, TestPreferences, TestPrivateProfile, TestProfileReveal

### Community 27 - "Community 27"
Cohesion: 0.24
Nodes (13): intentLabel(), renderProfile(), clearPrivateLayer(), completeness(), emptyProfile(), getProfile(), savePreferences(), savePrivacy() (+5 more)

### Community 28 - "Community 28"
Cohesion: 0.2
Nodes (13): change_password(), forgot_password(), login(), logout(), oauth_login(), refresh(), register(), reset_password() (+5 more)

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (7): RegisterRequest, PublicProfileUpdate, SafeSessionCreate, Unit tests for Pydantic schema validation., TestPublicProfileSchema, TestRegisterSchema, TestSafeSessionSchema

### Community 30 - "Community 30"
Cohesion: 0.19
Nodes (9): $(), setupAuthModal(), setupChat(), setupDemoShortcuts(), setupIntentSelection(), setupMatching(), setupPrivateReveal(), setupSafeSession() (+1 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (6): API tests for /api/v1/matches/* endpoints., TestDiscover, TestGetMatches, TestLike, TestPass, TestUnmatch

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (6): BaseHTTPMiddleware, Elyra FastAPI application entrypoint., RateLimitMiddleware, RequestIdMiddleware, RequestLoggingMiddleware, SecurityHeadersMiddleware

### Community 33 - "Community 33"
Cohesion: 0.19
Nodes (9): handle_activate_subscription(), Triggered by: user.registered, Triggered by: payment.completed, cancel_subscription(), create_subscription(), get_subscription(), payment_history(), PaymentService (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.16
Nodes (9): send_otp_sms(), send_sos_sms(), get_sync_db(), expire_subscriptions(), missed_checkin_check(), re_embed_user(), recompute_risk_scores(), regenerate_embedding() (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (4): API tests for /api/v1/safety/* endpoints., TestBlocks, TestReports, TestSafeSession

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (6): decrypt_field(), encrypt_field(), get_encryption_key(), Resolve the AES-256 key from settings.      Accepts the key as:       * 64-char, Encrypt with AES-256-GCM, prefixing the 12-byte random nonce.      Layout: ``non, TestAESEncryption

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (11): get_db(), health_detailed(), liveness(), Always 200 - proves the process is alive., Checks all three databases., readiness(), connect_mongodb(), disconnect_mongodb() (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.21
Nodes (7): get_or_create_alias(), get_real_user_id(), Anonymous message identity mapping. When a ChatThread has is_anonymous=True, sen, transform_message(), anon_filter(), Unit tests for websocket/anonymous.py AnonymousMessageFilter., TestAnonymousFilter

### Community 39 - "Community 39"
Cohesion: 0.19
Nodes (7): loginAndGetCookies(), login(), loginAs(), completeOnboarding(), goto(), trackConsoleErrors(), login()

### Community 40 - "Community 40"
Cohesion: 0.19
Nodes (8): handle_risk_recalculation(), handle_score_new_profile(), Triggered by: user.registered, Triggered by: match.created, Triggered by: report.created, list_blocks(), update_report(), TrustSafetyService

### Community 41 - "Community 41"
Cohesion: 0.16
Nodes (12): get_messages(), list_threads(), mark_read(), MessageListResponse, MessageResponse, Chat / thread Pydantic schemas., send_message(), SendMessageRequest (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (8): admin_headers(), auth_headers(), client(), httpx_response(), moderator_headers(), _register_and_get_headers(), second_user_headers(), _get_client()

### Community 43 - "Community 43"
Cohesion: 0.23
Nodes (6): create_access_token(), create_refresh_token(), _new_jti(), Security primitives: AES-256-GCM field encryption, bcrypt password hashing, JWT, Unit tests for core/security.py — no DB required., TestJWT

### Community 44 - "Community 44"
Cohesion: 0.15
Nodes (4): Security: RBAC bypass, cross-user data access, token validation., TestCrossUserIsolation, TestRBACEnforcement, TestTokenValidation

### Community 45 - "Community 45"
Cohesion: 0.21
Nodes (7): get_auth_token(), WebSocket event tests for the socket.io chat system., Note: Full WS testing requires actual server. This is a placeholder., TestHeartbeat, TestTypingIndicator, TestWebSocketConnection, TestWebSocketMessaging

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (3): HttpUser, ElyraUser, Locust load test for Elyra.

### Community 47 - "Community 47"
Cohesion: 0.18
Nodes (4): API tests for /api/v1/payments/* endpoints., TestPlans, TestRazorpayWebhook, TestSubscription

### Community 48 - "Community 48"
Cohesion: 0.21
Nodes (6): FakeProfileDetector, health(), lifespan(), score_profile(), connect_redis(), disconnect_redis()

### Community 49 - "Community 49"
Cohesion: 0.24
Nodes (4): ApiError, refreshTokens(), request(), toApiError()

### Community 50 - "Community 50"
Cohesion: 0.22
Nodes (4): _cached_encode(), EmbeddingModel, Integration: subscribe → webhook → tier upgrade., TestPaymentFlow

### Community 51 - "Community 51"
Cohesion: 0.31
Nodes (5): check_high_risk(), check_immediate_block(), check_spam_bio(), is_disposable_email(), ToxicityClassifier

### Community 52 - "Community 52"
Cohesion: 0.22
Nodes (3): API tests for /api/v1/chat/* REST endpoints., TestMessages, TestThreadList

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (4): Security: SQL injection, XSS, oversized payloads., TestOversizedPayloads, TestSQLInjection, TestXSSPrevention

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (8): get_plans(), PaymentCreate, PaymentResponse, PaymentWebhookRequest, Payment & subscription Pydantic schemas., SubscribeRequest, SubscriptionPlan, SubscriptionResponse

### Community 57 - "Community 57"
Cohesion: 0.25
Nodes (7): handle_moderate_message(), handle_send_email_verification(), handle_sms_emergency_contact(), Redis pub/sub event bus for Elyra., Triggered by: user.registered, Triggered by: message.sent, Triggered by: safety.sos, safety.checkin_missed

### Community 58 - "Community 58"
Cohesion: 0.29
Nodes (6): moderate_image(), verify_face(), FaceVerifyRequest, FaceVerifyResponse, ImageModerationRequest, ImageModerationResponse

### Community 59 - "Community 59"
Cohesion: 0.29
Nodes (7): DiscoverResponse, LikeAction, list_matches(), MatchCandidate, MatchListResponse, MatchResponse, Match-related Pydantic schemas.

### Community 60 - "Community 60"
Cohesion: 0.43
Nodes (4): send_email(), send_password_reset_email(), send_sos_email(), send_verification_email()

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (6): configure_logging(), get_logger(), mask_email(), _mask_pii_processor(), Mask email: 'user@example.com' → 'u***@example.com, Mask PII fields in log records.

### Community 65 - "Community 65"
Cohesion: 0.33
Nodes (4): moderate_text(), ai_client(), Tests for the moderation AI service (respx-mocked)., TestModerationService

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (3): EventSubscriber, Background task that subscribes to elyra:events and routes to handlers., _safe_call()

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (6): DeviceTokenRegister, list_notifications(), NotificationListResponse, NotificationPreferences, NotificationResponse, Notification & device-token Pydantic schemas.

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (6): User-related Pydantic schemas (re-exports auth user shape)., TokenRefreshRequest, UserCreate, UserLogin, UserResponse, UserUpdate

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (5): compute_similarity(), EmbedRequest, EmbedResponse, SimilarityRequest, SimilarityResponse

### Community 70 - "Community 70"
Cohesion: 0.47
Nodes (4): _create_enum_if_missing(), _enum(), initial schema  Revision ID: 0001 Revises: Create Date: 2024-01-01 00:00:00.0000, upgrade()

### Community 73 - "Community 73"
Cohesion: 0.33
Nodes (3): Security: rate limiting enforcement tests., TestAuthRateLimiting, TestMessageRateLimiting

### Community 74 - "Community 74"
Cohesion: 0.4
Nodes (5): moderate_batch(), BatchModerationRequest, BatchModerationResponse, TextModerationRequest, TextModerationResponse

### Community 77 - "Community 77"
Cohesion: 0.83
Nodes (3): notWired(), request(), stub()

### Community 79 - "Community 79"
Cohesion: 0.5
Nodes (3): init_sentry(), Sentry SDK initialization for the FastAPI backend., Initialize Sentry SDK.     No-op if SENTRY_DSN is empty or not set.

### Community 81 - "Community 81"
Cohesion: 0.83
Nodes (3): _init_firebase(), send_push(), send_single_push()

### Community 82 - "Community 82"
Cohesion: 0.5
Nodes (3): ChatMessage, ModerationResult, Pydantic schema for MongoDB chat message documents.  This is NOT a SQLAlchemy mo

## Knowledge Gaps
- **68 isolated node(s):** `Elyra — Investor Pitch Deck (PPTX generator, v2) Strict layout grid · refined gl`, `A glassmorphic card: dark fill + thin stroke + 1-pt top inner highlight.`, `Locust load test for Elyra.`, `Security primitives: AES-256-GCM field encryption, bcrypt password hashing, JWT`, `Resolve the AES-256 key from settings.      Accepts the key as:       * 64-char` (+63 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `emit()` connect `Community 21` to `Community 12`, `Community 7`?**
  _High betweenness centrality (0.267) - this node is a cross-community bridge._
- **Why does `moderate_message_async()` connect `Community 21` to `Community 57`, `Community 11`, `Community 23`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `ChatService` connect `Community 23` to `Community 41`, `Community 11`, `Community 48`, `Community 82`, `Community 21`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Are the 56 inferred relationships involving `User` (e.g. with `EventPublisher` and `EventSubscriber`) actually correct?**
  _`User` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 50 inferred relationships involving `TrustSafetyService` (e.g. with `EventPublisher` and `EventSubscriber`) actually correct?**
  _`TrustSafetyService` has 50 INFERRED edges - model-reasoned connections that need verification._
- **Are the 44 inferred relationships involving `NotificationService` (e.g. with `EventPublisher` and `EventSubscriber`) actually correct?**
  _`NotificationService` has 44 INFERRED edges - model-reasoned connections that need verification._
- **Are the 34 inferred relationships involving `html()` (e.g. with `navLink()` and `renderShell()`) actually correct?**
  _`html()` has 34 INFERRED edges - model-reasoned connections that need verification._