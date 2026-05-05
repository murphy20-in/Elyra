# Elyra - Privacy-First Dating Platform

<p align="center">
  <strong>A privacy-first, AI-enabled dating platform with intelligent matching, real-time chat, and comprehensive safety features.</strong>
</p>

<p align="center">
  <a href="https://github.com/elyra-platform/elyra">
    <img src="https://img.shields.io/badge/Version-2.0.0-blue.svg" alt="Version" />
  </a>
  <a href="https://github.com/elyra-platform/elyra/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-Proprietary-green.svg" alt="License" />
  </a>
  <a href="https://discord.gg/elyra">
    <img src="https://img.shields.io/badge/Join-Discord-5865F2?style=flat&logo=discord" alt="Discord" />
  </a>
</p>

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Technology Stack](#4-technology-stack)
5. [Backend Documentation](#5-backend-documentation)
6. [Frontend Documentation](#6-frontend-documentation)
7. [AI Services](#7-ai-services)
8. [Database Layer](#8-database-layer)
9. [Setup and Installation](#9-setup-and-installation)
10. [Running the Application](#10-running-the-application)
11. [Environment Variables](#11-environment-variables)
12. [API Reference](#12-api-reference)
13. [Deployment](#13-deployment)
14. [Security](#14-security)
15. [Developer Guide](#15-developer-guide)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Project Overview

### 1.1 What is Elyra?

Elyra is a modern, privacy-first dating platform that connects people through AI-powered matching while maintaining strict data privacy and safety standards. The platform enables users to discover meaningful connections with robust safety features including AI-based fake profile detection, content moderation, anonymous chat modes, and emergency safety sessions.

### 1.2 Core Features

The platform encompasses several interconnected systems that work together to create a secure and engaging dating experience:

**User Authentication and Security**

Elyra implements comprehensive authentication with JWT-based access and refresh tokens, supporting multiple authentication methods including email/password, phone/OTP, and OAuth providers (Google, Apple). The platform includes account security features such as failed login attempt lockout, password strength validation, and optional two-factor authentication through authenticator apps.

**Profile and Discovery**

Users create detailed profiles with public and private information categories. Public profiles contain information visible to other users (photos, bio, interests), while private profiles store sensitive data (real name, phone number, address, government ID) encrypted at rest using AES-256-GCM encryption. The discovery system uses vector embeddings with pgvector to find compatible matches based on preferences, location, and shared interests.

**Matching System**

The intelligent matching algorithm combines multiple signals to surface relevant profiles: user-declared intent (30%), embedding similarity (35%), geographic proximity (20%), and preference alignment (15%). The system uses HNSW indexing for efficient approximate nearest neighbor queries on 384-dimensional embedding vectors.

**Real-time Chat**

The messaging system provides real-time communication through WebSocket connections using Socket.IO. Messages are persisted in MongoDB for message history while thread metadata lives in PostgreSQL. The system supports anonymous chat modes where user identities are revealed only when both parties opt-in to identity reveal.

**Safety and Trust**

Elyra prioritizes user safety through multiple layers of protection: AI-based fake profile detection during registration, text and image content moderation, user reporting and blocking systems, safe sessions with check-in reminders, and emergency SOS triggers that can send the user's live location to emergency contacts via SMS.

**Payments and Subscriptions**

The platform supports a freemium model with optional subscription tiers unlocking premium features. Payment processing uses Razorpay for Indian market integration, supporting multiple subscription tiers with different feature access levels.

### 1.3 Design Principles

Several core principles guide the development and evolution of the Elyra platform:

**Privacy-First Architecture**

All sensitive user data is encrypted at rest using AES-256-GCM. Private profile information is only accessible through explicit reveal permissions granted by users. The platform maintains strict data minimization practices, collecting only necessary information and providing users complete control over their data.

**Security by Design**

Every component follows security best practices including least-privilege access, defense in depth, and zero-trust networking internally. All API endpoints require authentication with appropriate authorization checks. Rate limiting prevents abuse while allowing legitimate usage.

**Scalability**

The architecture supports horizontal scaling across all tiers. Stateless backend services enable deployment behind load balancers with auto-scaling. Redis provides caching and session management. PostgreSQL with pgvector handles relational data and vector similarity search. MongoDB stores high-volume chat messages with efficient pagination.

---

## 2. Architecture

### 2.1 High-Level System Architecture

Elyra follows a microservices-inspired architecture with clearly defined service boundaries while deploying as a unified application. The system consists of five primary tiers: frontend web and mobile clients, API gateway and load balancing, backend services, data persistence, and AI inference services.

```
                                    ┌─────────────────────────────┐
                                    │    Frontend (Web/Mobile)     │
                                    │    Next.js / React Native   │
                                    └──────────────┬──────────────┘
                                                   │
                                    ┌──────────────▼──────────────┐
                                    │     Nginx Reverse Proxy    │
                                    │  (TLS termination, rate    │
                                    │   limiting, caching)       │
                                    └──────────────┬──────────────┘
                                                   │
                         ┌─────────────────────────┼─────────────────────────┐
                         │                         │                         │
            ┌────────────▼────────────┐  ┌─────────▼─────────┐  ┌──────────▼──────────┐
            │    Backend API (FastAPI)│  │  WebSocket Server  │  │  Celery Workers     │
            │    (uvicorn + uvloop)   │  │   (Socket.IO)     │  │  (Async tasks)       │
            └────────────┬────────────┘  └─────────┬─────────┘  └──────────┬──────────┘
                        │                          │                        │
          ┌─────────────┼─────────────┐  ┌────────┴────────┐  ┌────────────┴────────────┐
          │             │             │  │                │  │                        │
    ┌─────▼──────┐ ┌───▼────┐ ┌─────▼──▼┐ ┌───▼─────┐  ┌───▼──────┐  ┌─────────▼─────────┐
    │ PostgreSQL │  │ Redis  │  │ MongoDB │  │   S3    │  │  Email   │  │    AI Services    │
    │ (pgvector)│  │        │  │         │  │ (MinIO) │  │  (SMTP)  │  │  (Embedding,     │
    └───────────┘  └────────┘  └─────────┘  └─────────┘  │  (Twilio)│  │   Moderation,     │
                                                           │  (FCM)   │  │   Image, Fake)   │
                                                           └─────────┘  └───────────────────┘
```

### 2.2 Request Flow

Understanding the request flow through the system helps with debugging and optimization:

**HTTP API Request Flow**

A typical API request follows this path through the system components:

Clients send HTTPS requests to the Nginx reverse proxy, which terminates TLS and applies initial rate limiting based on IP and endpoint category. Nginx forwards requests to the FastAPI backend running under uvicorn with uvloop for high-performance async handling.

The backend validates JWT tokens through dependency injection, checking access token validity and extracting user context. Request data flows through Pydantic schema validation. Business logic executes within service functions, coordinating with various data stores and AI services as needed. Responses return through the same chain with structured error handling.

**WebSocket Connection Flow**

Real-time messaging uses a different path optimized for bidirectional communication:

The client initiates a WebSocket connection to the Socket.IO endpoint at /socket.io. Nginx proxies the connection with proper upgrade headers to the backend Socket.IO server. On connection, the client sends an auth object containing the JWT token. The server validates the token and extracts user identity, storing the connection in the Redis-backed presence system.

Messages flow through a publish-subscribe model where sending clients publish to channels consumed by recipient connections. The system maintains presence state (online/offline/typing) in Redis for efficient status queries.

### 2.3 Data Flow

**User Registration and Profile Creation**

When a user registers, the system creates a new user record in PostgreSQL, generates a verification token, and sends appropriate verification emails or SMS. Upon email or phone verification, the user can complete their profile by adding photos, bio, and preference settings.

The system generates embedding vectors for the user's bio and interests through the embedding service, storing these in PostgreSQL using pgvector for similarity search. The matching service indexes these embeddings in the HNSW index for efficient discovery queries.

**Matching Discovery Flow**

The discover endpoint executes a multi-stage query across the data stores:

First, the matching service applies hard filters based on user preferences: age range, maximum distance, and gender preferences. These filters narrow the candidate pool before more expensive similarity computations.

Next, the service computes embedding similarity using pgvector's cosine distance function across indexed vectors. The system retrieves the top candidates based on combined weighted scoring.

Finally, the service applies additional ranking based on activity recency and subscription tier, returning a paginated result set to the client.

### 2.4 Service Interaction Diagram

The following diagram shows how services interact to fulfill common use cases:

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───▶│   Nginx  │───▶│ Backend  │───▶│AuthService│
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                      │
                                                      ▼
                                            ┌────────────────┐
                                            │ PostgreSQL     │
                                            │ (Users,       │
                                            │ Profiles,     │
                                            │ Matches)      │
                                            └──────┬───────┘
                                                   │
         ┌─────────────────────────────────────────────┼─────────────────────┐
         │                   │                   │                   │
         ▼                   ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│MatchingService│  │ProfileService│  │PaymentService│  │TrustSafety  │
│              │  │              │  │              │  │Service     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                 │
       ▼                ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Embedding    │  │Storage     │  │Razorpay    │  │Moderation   │
│Service     │  │Service    │  │API        │  │Service     │
│(AI)        │  │(S3/MinIO) │  │           │  │(AI)        │
└────────────┘  └───────────┘  └───────────┘  └────────────┘
```

---

## 3. Directory Structure

### 3.1 Root Directory

The Elyra repository contains the complete application organized by component:

```
elyra/
├── app/                          # Main application code
│   ├── backend/                  # FastAPI backend
│   ├── frontend/                # Next.js web frontend
│   ├── mobile/                 # React Native mobile app
│   ├── ai-services/            # AI microservices
│   ├── infra/               # Infrastructure scripts
│   └── docker-compose.yml
├── infra/                       # Kubernetes configurations
│   ├── k8s/                 # K8s manifests
│   ├── nginx/                 # Nginx configs
│   └── scripts/               # Infra scripts
├── tests/                     # End-to-end tests
│   └── load/                 # Load testing
├── scripts/                   # Setup scripts
└── docker-compose.yml         # Development orchestration
```

### 3.2 Backend Structure

The backend follows a layered architecture with clear separation of concerns:

```
app/backend/
├── main.py                     # FastAPI application entry point
├── __init__.py
├── core/                      # Core functionality
│   ├── __init__.py
│   ├── config.py              # Configuration management (Pydantic Settings)
│   ├── database.py           # SQLAlchemy async database setup
│   ├── security.py           # Encryption, JWT, password hashing
│   ├── metrics.py           # Prometheus metrics
│   ├── middleware.py        # Request/response middleware
│   └── llm_client.py       # LLM API client
├── models/                   # SQLAlchemy ORM models
│   ├── __init__.py
│   ├── base.py              # Base model class
│   ├── user.py             # User model and enum types
│   ├── profile.py          # Public/private profile models
│   ├── match.py           # Match model
│   ├── chat.py             # Chat thread model
│   ├── preference.py       # User preference model
│   ├── payment.py         # Payment transaction model
│   ├── subscription.py    # Subscription model
│   ├── notification.py    # Notification model
│   ├── safety.py          # Safety event/report/block models
│   ├── embedding.py      # User embedding model
│   ├── audit.py         # Audit log model
│   ├── safe_session.py  # Safe session model
│   └── verification.py  # Verification token models
├── schemas/                 # Pydantic request/response schemas
│   ├── __init__.py
│   ├── user.py
│   ├── profile.py
│   ├── match.py
│   ├── chat.py
│   ├── preference.py
│   ├── payment.py
│   ├── notification.py
│   └── safety.py
├── routes/                  # API route handlers
│   ├── __init__.py
│   ├── auth.py            # Authentication endpoints
│   ├── profile.py          # Profile management endpoints
│   ├── match.py          # Matching/discovery endpoints
│   ├── chat.py           # Messaging endpoints
│   ├── safety.py         # Safety features endpoints
│   ├── payment.py       # Payment endpoints
│   ├── notification.py  # Notification endpoints
│   └── health.py        # Health check endpoints
├── services/               # Business logic layer
│   ├── __init__.py
│   ├── auth_service.py    # Authentication logic
│   ├── matching_service.py # Matching algorithm
│   ├── profile_service.py # Profile management
│   ├── chat_service.py  # Messaging logic
│   ├── safety_service.py # Safety features
│   ├── payment_service.py # Payment processing
│   ├── storage_service.py # S3 file management
│   ├── email_service.py  # Email sending
│   ├── sms_service.py   # SMS sending
│   ├── push_service.py   # Push notifications
│   ├── notification_service.py # Notification management
│   └── trust_safety_service.py # Trust and safety logic
├── websocket/              # WebSocket handlers
│   ├── __init__.py
│   ├── manager.py         # Socket.IO server manager
│   ├── auth.py           # JWT authentication
│   ├── handlers.py       # Event handlers
│   ├── rate_limit.py     # Rate limiting
│   ├── presence.py      # Online status
│   └── anonymous.py    # Anonymous messaging
├── workers/               # Celery async tasks
│   ├── __init__.py
│   ├── celery_app.py     # Celery configuration
│   └── tasks.py        # Background tasks
├── dependencies/          # FastAPI dependencies
│   ├── __init__.py
│   └── auth.py          # Authentication dependencies
├── middleware/           # Custom middleware
│   └── __init__.py
├── alembic/              # Database migrations
│   ├── versions/
│   │   └── initial_schema.py
│   └── env.py
├── tests/                 # Test suite
│   ├── __init__.py
│   ├── conftest.py       # Pytest configuration
│   ├── unit/           # Unit tests
│   ├── api/            # API endpoint tests
│   ├── integration/     # Integration tests
│   ├── security/       # Security tests
│   ├── websocket/       # WebSocket tests
│   └── ai/            # AI service tests
├── Dockerfile
└── requirements.txt
```

### 3.3 Frontend Structure

The Next.js frontend uses the modern App Router architecture:

```
app/frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/           # Authenticated routes
│   │   ├── (public)/         # Public routes
│   │   ├── api/             # API routes
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx        # Home page
│   ├── components/            # React components
│   │   ├── ui/              # Base UI components
│   │   ├── features/         # Feature-specific components
│   │   └── layouts/          # Layout components
│   ├── lib/                  # Utilities
│   │   ├── api.ts           # API client
│   │   ├── auth.ts          # Auth utilities
│   │   ├── socket.ts        # Socket.IO client
│   │   └── utils.ts         # Helper functions
│   ├── hooks/                # Custom React hooks
│   ├── stores/              # Zustand state stores
│   └── i18n/               # Internationalization
├── e2e/                      # Playwright tests
├── public/                    # Static assets
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── Dockerfile
```

### 3.4 AI Services Structure

Each AI service runs as an independent microservice:

```
app/ai-services/
├── embedding-service/          # Vector embedding generation (port 9001)
│   ├── main.py
│   ├── model.py            # Sentence-transformers model
│   ├── schemas.py
│   ├── requirements.txt
│   └── Dockerfile
├── moderation-service/        # Content moderation (port 9002)
│   ├── main.py
│   ├── classifier.py       # Detoxify model + keyword fallback
│   ├── blocklist.py
│   ├── schemas.py
│   ├── requirements.txt
│   └── Dockerfile
├── image-service/            # Image analysis (port 9003)
│   ├── main.py
│   ├── schemas.py
│   ├── requirements.txt
│   └── Dockerfile
└── fake-profile-service/     # Fake profile detection (port 9004)
    ├── main.py
    ├── detector.py       # Anomaly detection
    ├── blocklist.py
    ├── schemas.py
    ├── requirements.txt
    └── Dockerfile
```

---

## 4. Technology Stack

### 4.1 Backend Technologies

The backend leverages modern Python async technologies for high performance:

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web Framework | FastAPI 0.109+ | Async API framework with automatic OpenAPI documentation |
| ASGI Server | uvicorn + uvloop | High-performance ASGI server with event loop |
| Database | PostgreSQL 16 + pgvector | Relational database with vector similarity search |
| ORM | SQLAlchemy 2.0 (async) | Async ORM with type safety |
| Message History | MongoDB 7 | High-volume chat message storage |
| Cache/Sessions | Redis 7 | Caching, sessions, rate limiting, pub/sub |
| Task Queue | Celery + Redis | Background task processing |
| Validation | Pydantic 2.0 | Request/response validation |
| Authentication | python-jose + passlib | JWT tokens, password hashing |
| WebSocket | socketio | Real-time messaging |
| File Storage | MinIO / S3 | Object storage for media |

### 4.2 Frontend Technologies

The web frontend uses modern JavaScript frameworks:

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 14.2.x |
| UI Library | React | 18.x |
| Styling | Tailwind CSS | 3.4.x |
| State Management | Zustand | 4.x |
| HTTP Client | axios | 1.x |
| Real-time | socket.io-client | 4.x |
| Animations | framer-motion | 11.x |
| Error Tracking | @sentry/nextjs | 7.x |
| Testing | Playwright | 1.x |

### 4.3 AI/ML Technologies

The AI services use purpose-built models:

| Service | Model | Framework | Output |
|---------|-------|----------|--------|
| Embedding | sentence-transformers/all-MiniLM-L6-v2 | PyTorch | 384-dim vectors |
| Moderation | detoxify | PyTorch | Toxicity scores + labels |
| Image | stub (vision model placeholder) | - | - |
| Fake Profile | Isolation Forest + heuristics | scikit-learn | Risk scores |

### 4.4 Infrastructure Technologies

Deployment uses container orchestration:

| Component | Technology |
|-----------|------------|
| Container Runtime | Docker |
| Orchestration | Kubernetes |
| Reverse Proxy | Nginx |
| Service Mesh | (Built into K8s) |
| Monitoring | Prometheus + Grafana |
| Database Backup | Custom CronJobs |
| Load Testing | Locust |

---

## 5. Backend Documentation

### 5.1 Application Entry Point

The FastAPI application initializes in main.py with several critical components:

**Startup Sequence**

On application startup, the lifespan context manager executes initialization steps in sequence. First, it establishes the database connection pool. Second, it initializes the Redis connection. Third, it connects to MongoDB. Fourth, it creates required database indexes for efficient queries. Fifth, it starts the Socket.IO server for WebSocket handling.

**Middleware Stack**

The backend applies middleware in this order:

CORS middleware handles cross-origin requests with configurable allowed origins. RateLimitMiddleware applies per-user rate limiting to prevent abuse. SecurityHeadersMiddleware adds HTTP security headers. RequestLoggingMiddleware records all requests for debugging and analytics. RequestIdMiddleware adds correlation IDs for request tracing.

**Route Registration**

The application registers API routers in priority order: health endpoints first for load balancer checks, then authenticated endpoints requiring valid tokens, and finally public endpoints like registration.

### 5.2 Configuration Management

All configuration flows through the Settings class in core/config.py, which extends Pydantic BaseSettings for automatic environment variable loading:

**Database Configuration**

PostgreSQL connection strings follow asyncpg format: postgresql+asyncpg://user:password@host:port/database. The pool is configured with appropriate min and max connections for the expected load.

Redis configuration includes host, port, password for authentication, and db number for isolation. The system uses Redis for caching, session storage, rate limiting, and Socket.IO adapter backing.

**JWT Configuration**

JWT tokens use HS256 algorithm by default with configurable secret key and expiration times. Access tokens expire in 15 minutes for security, while refresh tokens last 7 days to enable persistent sessions.

**AI Service URLs**

Each AI service has a configurable URL enabling independent scaling and deployment. Services communicate over internal networks in production.

### 5.3 Security Implementation

**Password Handling**

Passwords are hashed using bcrypt with a work factor of 12 (adaptive complexity). The verify_password function performs constant-time comparison to prevent timing attacks.

**Encryption**

Sensitive profile fields use AES-256-GCM encryption. The encrypt_field function generates a random 96-bit nonce for each encryption operation, producing ciphertext that includes the nonce for decryption. The encryption key is stored in environment variables.

**JWT Tokens**

Access tokens contain user ID and roles in the payload. The decode_token function validates signature and expiration, raising appropriate errors for invalid or expired tokens.

### 5.4 Database Models

The SQLAlchemy models define the complete data schema:

**User Model**

The User model stores account information including email, phone, password hash, and OAuth provider details. The model includes fields for account lockout (locked_until timestamp), verification status, and role (user, moderator, admin). Soft deletion uses an is_deleted flag rather than permanent removal.

**Profile Models**

The platform separates public and private profile data. PublicProfile contains information visible to other users: photos, bio, interests, birthdate, and location coordinates. PrivateProfile stores sensitive information encrypted at rest: real name, phone number, address, and government ID documents.

**Match Model**

Matches represent connections between users with status tracking: pending (awaiting mutual interest), matched (mutual interest), unmatched (one party unmatched), and expired (system-expired after 30 days). The model stores match metadata including who initiated and timestamps.

**Chat Model**

ChatThread represents a messaging channel between matched users. The model tracks participants, last message for efficient listing, and thread status. Individual messages are stored in MongoDB for horizontal scaling of message volume.

### 5.5 Services

The business logic layer encapsulates all complex operations:

**AuthService**

The AuthService handles all authentication operations including user registration with validation, login with failed attempt tracking, token refresh with rotation, and password reset flows.

**MatchingService**

The MatchingService implements the discovery algorithm using pgvector for similarity search. The service computes weighted scores combining intent matching, embedding similarity, geographic distance, and preference alignment. Results are paginated and filtered by user subscription tiers.

**ProfileService**

ProfileService manages profile CRUD operations including encryption of private fields, photo upload handling, and the reveal-to permission system for controlled private information sharing.

**ChatService**

ChatService coordinates message storage in MongoDB and real-time delivery through Socket.IO. The service handles thread creation when matches occur and maintains read status.

**TrustSafetyService**

This critical service implements safety features: fake profile risk scoring, report processing, block management, and overall trust scoring for the platform.

### 5.6 WebSocket Implementation

Real-time messaging uses Socket.IO for cross-platform compatibility:

**Connection Handling**

The Socket.IO server runs embedded in the FastAPI application. On connection, clients send an auth object with their JWT token. The auth.py module validates tokens and attaches user context to the connection.

**Message Flow**

When a user sends a message, the handler validates they have a valid match with the recipient, retrieves the recipient's active connections, and delivers the message in real-time. Messages are simultaneously persisted to MongoDB for history.

**Presence System**

The presence module tracks online status in Redis using sorted sets. When connections connect or disconnect, presence updates. This enables efficient "user is online" queries without database lookups.

**Anonymous Mode**

The anonymous.py module provides stripped identity messaging where real user IDs are replaced with temporary identifiers visible only to the message recipient until both parties opt in to identity reveal.

---

## 6. Frontend Documentation

### 6.1 Application Structure

The Next.js frontend uses the App Router with route groups for organization:

**(auth) Route Group**

Authenticated routes require valid JWT tokens. Users accessing these routes without authentication redirect to login. The group includes the main application pages: match discovery, chat, profile management, and settings.

**(public) Route Group**

Public routes are accessible without authentication. These include landing pages, authentication (login/register), and password recovery flows.

### 6.2 Pages and Components

**Authentication Pages**

LoginScreen and RegisterScreen handle user authentication. The login form accepts email or phone with password. Registration collects necessary information and triggers email verification. OAuth buttons connect with Google and Apple accounts.

**Discovery Screen**

The discovery interface presents potential matches from the API. Users swipe or tap action buttons to indicate interest. The interface shows profile photos, basic information, and compatibility indicators.

**Chat Screen**

Each matched user has a chat thread accessed from either the match list or notification. Messages load with infinite scroll pagination. Real-time delivery shows typing indicators and read receipts.

**Profile Screen**

Users view and edit their own profiles, controlling what information is visible to others. Privacy settings control profile visibility and data sharing.

### 6.3 State Management

The application uses Zustand stores for client-side state:

**authStore**

The auth store manages authentication state including JWT tokens, user profile data, and authentication loading/errors.

**matchStore**

Match discovery state includes current candidates, liked/passed history, and match notifications.

**chatStore**

Chat state tracks active conversations, unread counts, and real-time message updates.

**uiStore**

UI state manages theme, language preferences, and interface configuration.

### 6.4 API Client

The API client wraps axios with authentication handling:

**Request Interceptors**

The client automatically attaches JWT Bearer tokens to authenticated requests. On 401 responses, it attempts token refresh. Failed refresh redirects to login.

**Response Handling**

The client transforms API errors into user-friendly messages. Validation errors display inline next to form fields.

**WebSocket Integration**

The socket client connects on authentication with token payload. Handles reconnection on network issues.

---

## 7. AI Services

### 7.1 Embedding Service

The embedding service generates vector embeddings for semantic similarity matching:

**Model**

The service uses sentence-transformers/all-MiniLM-L6-v2, producing 384-dimensional dense vectors. This model balances quality and performance for social discovery applications.

**Endpoints**

POST /embed generates embeddings for input text. The service handles batching for efficiency at scale. POST /similarity computes cosine similarity between embedding pairs.

**Integration**

The matching service queries user embedding similarity during discovery. The system regenerates embeddings when users update their bio or interests.

### 7.2 Moderation Service

Content moderation protects users from harmful interactions:

**Model**

The service uses detoxify for toxicity classification across multiple categories: toxicity, severe toxicity, obscene, threatening, insulting, and identity attack. The model provides probabilistic scores enabling tunable thresholds.

**Blocklist Enhancement**

A custom blocklist catches domain-specific terms that bypass general-purpose models. The blocklist updates based on platform abuse patterns.

**Batch Processing**

The /moderate/batch endpoint processes multiple texts efficiently for queue-based checking of user-generated content.

### 7.3 Image Service

Image analysis provides content safety for uploaded photos:

**Current Implementation**

The service currently returns stub responses. Production deployment would integrate computer vision models for explicit content detection and face verification.

**Planned Features**

Planned capabilities include image moderation for explicit content, face detection for profile verification against ID documents, and image authenticity detection.

### 7.4 Fake Profile Service

Fake profile detection identifies inauthentic registrations:

**Detection Approach**

The service combines multiple signals: embedding anomaly detection (registration using unusual text patterns compared to historical authentications), blocklist matching (known fake profile patterns), and heuristic scoring (completeness, photo quality, behavioral signals).

**Risk Scoring**

The service outputs risk scores per category, enabling nuanced handling: mild signals trigger additional verification while severe signals block registration outright.

**Integration**

Registration flows call the fake profile service, storing risk scores for later analysis. High-risk registrations may require additional verification steps.

---

## 8. Database Layer

### 8.1 PostgreSQL Schema

**Users Table**

The users table stores account credentials and status:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email |
| phone | VARCHAR(20) | E.164 phone format |
| password_hash | VARCHAR(255) | bcrypt hash |
| role | USER_ROLE enum | user, moderator, admin |
| is_verified | BOOLEAN | Email/phone verified |
| is_banned | BOOLEAN | ban status |
| locked_until | TIMESTAMP | Account lockout |
| created_at | TIMESTAMP | Registration time |
| updated_at | TIMESTAMP | Last update |

**Profiles Tables**

Public and private profiles store user information:

| Table | Columns |
|-------|--------|
| public_profiles | user_id, photos (JSON array), bio, interests (array), birthdate, gender, location (point) |
| private_profiles | user_id (FK), real_name, phone, address, id_document (encrypted) |

**Matches Table**

Match records track connections:

| Column | Type |
|--------|------|
| id | UUID |
| user1_id | UUID (FK) |
| user2_id | UUID (FK) |
| status | MATCH_STATUS enum |
| initiated_by | UUID |
| matched_at | TIMESTAMP |
| unmatched_at | TIMESTAMP |

**User Embeddings Table**

Vector embeddings use pgvector:

| Column | Type |
|--------|------|
| id | UUID |
| user_id | UUID (FK) |
| embedding | vector(384) |
| created_at | TIMESTAMP |

### 8.2 MongoDB Collections

**messages Collection**

Chat messages use high-volume storage:

| Field | Type |
|-------|------|
| _id | ObjectId |
| thread_id | UUID |
| sender_id | UUID |
| recipient_id | UUID |
| content | String |
| message_type | text, image, reveal |
| created_at | ISODate |
| read_at | ISODate (nullable) |

**Indexes**: thread_id + created_at for efficient pagination.

### 8.3 Redis Usage

Redis provides multiple functions:

**Session Cache**

User sessions store JWT refresh tokens for fast validation without database round-trips.

**Rate Limiting**

Sliding window rate limiters track request counts per user/IP for API protection.

**Socket.IO Adapter**

Redis pub/sub enables horizontal WebSocket scaling across multiple backend instances.

**Presence**

Sorted sets track user online status with connection timestamps.

### 8.4 Database Migrations

Alembic manages schema changes with the initial migration creating all tables:

The migration creates PostgreSQL ENUM types for role, gender, match_status, and payment_status. It creates all tables with foreign keys and appropriate indexes. The migration adds HNSW index on user_embeddings.embedding for efficient similarity search.

---

## 9. Setup and Installation

### 9.1 Prerequisites

Before setting up the development environment, install all required tools:

**Required Software**

Developers need Docker and Docker Compose for containerized services. Git is required for version control. Python 3.11+ manages backend development. Node.js 20 LTS handles frontend development.

For local development without Docker, install PostgreSQL 16 with pgvector extension, MongoDB 7, and Redis 7 directly.

### 9.2 Clone and Setup

Clone the repository and navigate to the codebase:

```bash
git clone https://github.com/elyra-platform/elyra.git
cd elyra/codebase
```

### 9.3 Environment Configuration

Copy the example environment file and configure:

```bash
cp app/.env.example app/backend/.env
```

Edit the .env file with appropriate values for your local environment. At minimum, configure:

- SECRET_KEY: Generate a secure random key
- JWT_SECRET_KEY: Separate key for JWT operations
- AES_ENCRYPTION_KEY: 32-byte key for field encryption
- POSTGRES_PASSWORD: Strong database password

### 9.4 Docker Compose Setup

Start all services using Docker Compose:

```bash
cd app
docker-compose up -d
```

This starts PostgreSQL, Redis, MongoDB, MinIO, all AI services, the backend, frontend, Nginx, and monitoring tools.

**Wait for Services**

Services typically start within 30-60 seconds. Check status:

```bash
docker-compose ps
```

**View Logs**

Monitor specific service logs:

```bash
docker-compose logs -f backend
```

### 9.5 Database Setup

Initialize the database with migrations:

```bash
docker-compose exec backend python -m alembic upgrade head
```

Seed initial data for development:

```bash
docker-compose exec backend python app/infra/scripts/seed_data.py
```

### 9.6 Alternative: Local Development

For local development without Docker, create Python virtual environments:

**Backend Virtual Environment**

```bash
cd app/backend
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

**Configure Local Environment**

Edit .env with localhost service URLs:

```
POSTGRES_HOST=localhost
REDIS_HOST=localhost
MONGO_HOST=localhost
```

**Start Services**

Start PostgreSQL, Redis, and MongoDB locally, then run the backend:

```bash
cd app/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 10. Running the Application

### 10.1 Development Mode

After starting Docker Compose, access services at these URLs:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost | Next.js web application |
| Backend API | http://localhost:8000 | FastAPI with OpenAPI docs |
| API Docs | http://localhost:8000/docs | Interactive API documentation |
| MinIO Console | http://localhost:9001 | Media storage console |
| Prometheus | http://localhost:9091 | Metrics dashboard |
| Grafana | http://localhost:3001 | Monitoring dashboards |

### 10.2 Testing the Application

**API Health Check**

Verify the backend is responding:

```bash
curl http://localhost:8000/api/v1/health/liveness
```

**Registration Flow**

Use the interactive API docs at http://localhost:8000/docs to test endpoints, or use curl:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "birthdate": "1990-01-15",
    "gender": "male",
    "interested_in": ["female"]
  }'
```

**Login and Get Token**

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "SecurePassword123!"}'
```

Use the returned access_token for authenticated requests:

```bash
curl -X GET http://localhost:8000/api/v1/profiles/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 10.3 Running Tests

The test suite validates functionality:

**Backend Unit Tests**

```bash
docker-compose exec backend pytest app/backend/tests/unit -v
```

**Backend API Tests**

```bash
docker-compose exec backend pytest app/backend/tests/api -v
```

**Integration Tests**

```bash
docker-compose exec backend pytest app/backend/tests/integration -v
```

**Load Testing**

```bash
docker-compose -f docker-compose.test.yml up -d
docker-compose exec locust -f tests/load/locustfile.py --host http://backend
```

### 10.4 Stopping Services

Stop all running services:

```bash
docker-compose down
```

To remove volumes (data will be lost):

```bash
docker-compose down -v
```

---

## 11. Environment Variables

### 11.1 Application Configuration

| Variable | Example | Description |
|----------|---------|-------------|
| APP_NAME | Elyra | Application name |
| APP_ENV | development | Environment: development, staging, production |
| SECRET_KEY | abc123... | Flask secret key |
| DEBUG | false | Debug mode flag |

### 11.2 Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| POSTGRES_HOST | postgres | PostgreSQL hostname |
| POSTGRES_PORT | 5432 | PostgreSQL port |
| POSTGRES_DB | elyra_db | Database name |
| POSTGRES_USER | elyra_user | Database user |
| POSTGRES_PASSWORD | | Database password |
| REDIS_HOST | redis | Redis hostname |
| REDIS_PORT | 6379 | Redis port |
| REDIS_PASSWORD | | Redis password (optional) |
| MONGO_HOST | mongodb | MongoDB hostname |
| MONGO_PORT | 27017 | MongoDB port |
| MONGO_DB | elyra_chat | MongoDB database |

### 11.3 JWT Configuration

| Variable | Example | Description |
|----------|---------|-------------|
| JWT_SECRET_KEY | | Secret for JWT signing |
| JWT_ALGORITHM | HS256 | JWT algorithm |
| ACCESS_TOKEN_EXPIRE_MINUTES | 15 | Access token expiry |
| REFRESH_TOKEN_EXPIRE_DAYS | 7 | Refresh token expiry |

### 11.4 Encryption Configuration

| Variable | Description |
|----------|-------------|
| AES_ENCRYPTION_KEY | 32-byte key for field encryption (base64) |

### 11.5 AI Services

| Variable | Default | Description |
|----------|---------|-------------|
| EMBEDDING_SERVICE_URL | http://embedding-service:9001 | Embedding service URL |
| MODERATION_SERVICE_URL | http://moderation-service:9002 | Moderation service URL |
| IMAGE_SERVICE_URL | http://image-service:9003 | Image service URL |
| FAKE_PROFILE_SERVICE_URL | http://fake-profile-service:9004 | Fake profile service URL |

### 11.6 LLM Configuration

| Variable | Example | Description |
|----------|---------|-------------|
| LLM_PROVIDER | openai | LLM provider (openai, anthropic) |
| OPENAI_API_KEY | | OpenAI API key |
| OPENAI_MODEL | gpt-4o-mini | Model name |

### 11.7 Storage Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| S3_ENDPOINT | http://minio:9000 | S3/MinIO endpoint |
| S3_BUCKET | elyra-media | Storage bucket |
| S3_ACCESS_KEY | | S3 access key |
| S3_SECRET_KEY | | S3 secret key |

### 11.8 Email Configuration

| Variable | Description |
|----------|-------------|
| SMTP_HOST | SMTP server hostname |
| SMTP_PORT | 587 | SMTP port |
| SMTP_USER | SMTP username |
| SMTP_PASSWORD | SMTP password |
| EMAIL_FROM | noreply@elyra.app | From address |

### 11.9 SMS Configuration

| Variable | Description |
|----------|-------------|
| TWILIO_SID | Twilio Account SID |
| TWILIO_AUTH_TOKEN | Twilio Auth Token |
| TWILIO_FROM_NUMBER | Twilio phone number |

### 11.10 Push Notifications

| Variable | Description |
|----------|-------------|
| FCM_SERVER_KEY | Firebase Cloud Messaging key |

### 11.11 Payment Configuration

| Variable | Description |
|----------|-------------|
| RAZORPAY_KEY_ID | Razorpay key ID |
| RAZORPAY_KEY_SECRET | Razorpay key secret |
| RAZORPAY_WEBHOOK_SECRET | Razorpay webhook secret |

### 11.12 Observability

| Variable | Description |
|----------|-------------|
| SENTRY_DSN | Sentry DSN for error tracking |
| PROMETHEUS_ENABLED | true | Enable Prometheus metrics |

---

## 12. API Reference

### 12.1 Authentication Endpoints

The auth routes handle user registration and sessions:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/auth/register | Register new user | No |
| POST | /api/v1/auth/login | User login | No |
| POST | /api/v1/auth/refresh | Refresh token | No |
| POST | /api/v1/auth/logout | User logout | Yes |
| POST | /api/v1/auth/forgot-password | Password reset request | No |
| POST | /api/v1/auth/reset-password | Password reset | No |
| POST | /api/v1/auth/verify-email | Email verification | No |
| POST | /api/v1/auth/verify-phone | Phone verification | No |
| POST | /api/v1/auth/oauth/google | Google OAuth | No |
| POST | /api/v1/auth/oauth/apple | Apple OAuth | No |

### 12.2 Profile Endpoints

Profile routes manage user profiles:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/profiles/me | Get own profile | Yes |
| PUT | /api/v1/profiles/me | Update own profile | Yes |
| GET | /api/v1/profiles/me/public | Get public profile | Yes |
| GET | /api/v1/profiles/me/private | Get private profile | Yes |
| GET | /api/v1/profiles/{id} | Get other user profile | Yes |
| POST | /api/v1/profiles/me/photos | Upload photo | Yes |
| DELETE | /api/v1/profiles/me/photos/{id} | Delete photo | Yes |
| POST | /api/v1/profiles/me/reveal | Reveal private info | Yes |

### 12.3 Matching Endpoints

Match routes handle discovery:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/matches/discover | Get discovery candidates | Yes |
| POST | /api/v1/matches/like | Like a user | Yes |
| POST | /api/v1/matches/pass | Pass on a user | Yes |
| GET | /api/v1/matches | List matches | Yes |
| GET | /api/v1/matches/{id} | Get match details | Yes |
| DELETE | /api/v1/matches/{id} | Unmatch user | Yes |
| POST | /api/v1/matches/preferences | Update preferences | Yes |
| GET | /api/v1/matches/preferences | Get preferences | Yes |

### 12.4 Chat Endpoints

Chat routes manage messaging:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/chat/threads | List chat threads | Yes |
| GET | /api/v1/chat/threads/{id} | Get thread messages | Yes |
| GET | /api/v1/chat/threads/{id}/messages | Get messages with pagination | Yes |
| POST | /api/v1/chat/threads/{id}/messages | Send message | Yes |
| PUT | /api/v1/chat/threads/{id}/read | Mark as read | Yes |

### 12.5 Safety Endpoints

Safety routes handle reports and blocks:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/safety/report | Report user | Yes |
| POST | /api/v1/safety/block | Block user | Yes |
| DELETE | /api/v1/safety/block/{id} | Unblock user | Yes |
| GET | /api/v1/safety/blocks | List blocked users | Yes |
| POST | /api/v1/safety/session | Start safe session | Yes |
| POST | /api/v1/safety/session/checkin | Safe session check-in | Yes |
| POST | /api/v1/safety/sos | SOS emergency trigger | Yes |

### 12.6 Payment Endpoints

Payment routes handle subscriptions:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/payments/subscribe | Start subscription | Yes |
| GET | /api/v1/payments/subscription | Get subscription | Yes |
| POST | /api/v1/payments/webhook | Razorpay webhook | No |
| DELETE | /api/v1/payments/subscription | Cancel subscription | Yes |

### 12.7 Notification Endpoints

Notification routes handle alerts:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/notifications | List notifications | Yes |
| PUT | /api/v1/notifications/read | Mark as read | Yes |

### 12.8 Health Endpoints

Health routes for monitoring:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/health/liveness | Liveness probe | No |
| GET | /api/v1/health/readiness | Readiness probe | No |

---

## 13. Deployment

### 13.1 Docker Production Build

Build production Docker images:

```bash
# Backend
docker build -f app/backend/Dockerfile -t elyra/backend:latest app/backend

# Frontend
docker build -f app/frontend/Dockerfile -t elyra/frontend:latest app/frontend

# AI Services
docker build -f app/ai-services/embedding-service/Dockerfile -t elyra/embedding:latest app/ai-services/embedding-service
docker build -f app/ai-services/moderation-service/Dockerfile -t elyra/moderation:latest app/ai-services/moderation-service
```

### 13.2 Kubernetes Deployment

The infrastructure includes Kubernetes manifests for production:

**Namespace**

All resources deploy to the elyra namespace defined in k8s/base/namespace.yaml.

**Deployments**

Backend and frontend deploy as Kubernetes Deployments with Horizontal Pod Autoscaling configured. The backend scales between 2-10 replicas based on CPU utilization. AI services deploy as separate Deployments for independent scaling.

**Services**

ClusterIP services expose backend and frontend internally. The nginx-ingress.yaml defines Ingress resources for external access with TLS.

**Database**

PostgreSQL, Redis, and MongoDB deploy as StatefulSets with persistent volume claims for data persistence.

**Configuration**

Environment variables come from a ConfigMap (non-secret values) and Secrets (sensitive values). The secrets.yaml references external secret sources like AWS Secrets Manager or HashiCorp Vault.

### 13.3 Network Policies

Kubernetes NetworkPolicies implement zero-trust networking:

- Default deny all ingress traffic
- Allow ingress-nginx to backend and frontend
- Allow backend to databases and AI services
- Allow Prometheus for metrics collection
- Block unauthorized inter-service communication

### 13.4 Database Backups

Automated CronJobs execute daily PostgreSQL backups:

The backup-cronjob.yaml defines scheduled backup jobs. Backups upload to S3 with retention policies. Restore procedures document recovery steps.

### 13.5 Monitoring

Prometheus collects metrics from all services:

- Backend exposes /metrics endpoint
- Grafana dashboards visualize key metrics
- Alerting rules trigger on error rate spikes and latency degradation

### 13.6 Production Checklist

Before production deployment:

1. Generate strong keys for SECRET_KEY, JWT_SECRET_KEY, and AES_ENCRYPTION_KEY
2. Configure TLS certificates
3. Set up monitoring and alerting
4. Configure backup retention policies
5. Test disaster recovery procedures
6. Verify rate limiting configuration
7. Confirm all security headers configured

---

## 14. Security

### 14.1 Authentication Security

The platform implements defense in depth for authentication:

**Password Requirements**

Minimum 8 characters required. Common password blocklist prevents weak passwords. Password strength scoring provides feedback.

**Account Lockout**

After 5 failed login attempts over 15 minutes, accounts lock for 15 minutes. Administrators can unlock accounts through admin panel.

**Token Security**

Access tokens expire in 15 minutes to limit exposure. Refresh tokens are rotated on each use. Token blacklist enables immediate logout.

### 14.2 Data Encryption

Sensitive data protection includes encryption at rest:

**Field-Level Encryption**

Private profile fields encrypt using AES-256-GCM. Each encryption generates unique nonces. Encrypted values include authentication tag.

**Transport Encryption**

All production traffic uses TLS 1.2+. Certificate rotation follows best practices.

### 14.3 API Security

API endpoints include multiple security layers:

**Rate Limiting**

General API: 100 requests/minute. Authentication endpoints: 10/minute. WebSocket connections: 20/user. IP-based blocking on sustained abuse.

**Input Validation**

Pydantic schemas validate all input. SQL injection impossible through ORM. Additional input sanitization where needed.

**Authorization**

Every endpoint verifies user ownership of requested resources. Admin endpoints require admin role. IDOR protections prevent unauthorized access.

### 14.4 WebSocket Security

Real-time connections secure:

**Token Validation**

WebSocket auth passes JWT in auth object during connection. Invalid tokens close connection before message handling.

**Message Validation**

Message senders must have valid match. Anonymous messages strip identity appropriately. Content moderates before delivery.

### 14.5 Infrastructure Security

Production deployment follows security best practices:

- Non-root container users
- Read-only root filesystems where possible
- Network policies enforce communication boundaries
- Secrets injected from secure sources
- Regular security scanning in CI/CD

### 14.6 Security Headers

HTTP security headers protect against common attacks:

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy (configurable)

---

## 15. Developer Guide

### 15.1 Adding New Features

The following process guides feature development:

**1. Design Phase**

Document the feature in a design document. Include API contract (request/response schemas), database schema changes, and security considerations. Get design review from team lead.

**2. Backend Implementation**

Add database models if needed in models/. Create Pydantic schemas in schemas/. Implement service logic in services/. Add route handlers in routes/. Add tests in appropriate test directories.

**3. Frontend Implementation**

Add API client methods in lib/api.ts. Create or update components in appropriate directories. Add Zustand store if needed. Connect to backend APIs.

**4. Testing**

Write unit tests covering business logic. Write API integration tests. Test edge cases and error handling.

### 15.2 Code Conventions

The project follows consistent conventions:

**Python (Backend)**

Follow PEP 8 with type hints. Use async/await for I/O operations. Import organization: stdlib, third-party, local. Maximum line length: 100 characters.

**TypeScript/JavaScript (Frontend)**

Follow ESLint configuration. Use TypeScript for new code. Prefer functional components with hooks. Maximum line length: 100 characters.

**Database**

Use meaningful table and column names. Add indexes for query performance. Include audit columns (created_at, updated_at) on all tables.

### 15.3 Git Workflow

Development follows Git feature branch workflow:

1. Create feature branch from main: git checkout -b feature/description
2. Make commits with meaningful messages
3. Create pull request for review
4. Address feedback and update
5. Squash merge on approval

### 15.4 Database Migrations

Create migrations for schema changes:

```bash
docker-compose exec backend alembic revision --autogenerate -m "description"
docker-compose exec backend alembic upgrade head
```

Test migrations locally before merging.

### 15.5 API Versioning

The API prefix /api/v1/ indicates version. Future versions become /api/v2/, etc., without breaking existing clients.

---

## 16. Troubleshooting

### 16.1 Common Issues

**Database Connection Refused**

Ensure database containers are running: docker-compose ps. Check logs: docker-compose logs postgres. Verify connection string in .env.

**WebSocket Connection Fails**

Verify backend is running. Check browser console for errors. Ensure Nginx proxies WebSocket with upgrade headers (already configured). Check Redis is running for Socket.IO adapter.

**Authentication Errors**

Verify JWT_SECRET_KEY consistency across services. Check token expiration configuration. Ensure Authorization header format: "Bearer <token>".

**AI Service Unavailable**

Check service containers are running: docker-compose ps. Verify service URLs in configuration. Check for model download issues in logs.

### 16.2 Debugging tips

**View Backend Logs**

```bash
docker-compose logs -f backend
```

**View Specific Service**

```bash
docker-compose logs -f embedding-service
```

**Database Query**

```bash
docker-compose exec postgres psql -U elyra_user -d elyra_db -c "SELECT * FROM users;"
```

**Redis Cache Inspection**

```bash
docker-compose exec redis redis-cli
```

### 16.3 Performance Issues

**Slow Discovery Queries**

Check HNSW index exists on embeddings: SELECT * FROM pg_indexes WHERE indexname LIKE '%embedding%'. Verify query uses index with EXPLAIN ANALYZE.

**High Memory Usage**

Check for N+1 queries in code. Optimize database connection pool size. Use pagination for list endpoints.

### 16.4 Getting Help

For additional support:

- Check GitHub Issues for known problems
- Review API documentation at /docs endpoint
- Consult internal documentation wiki

---

## Quick Reference

### Development URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| API Docs | http://localhost:8000/docs |
| MinIO | http://localhost:9001 |
| Grafana | http://localhost:3001 |

### Key Commands

```bash
# Start development
docker-compose up -d

# View logs
docker-compose logs -f backend

# Run tests
docker-compose exec backend pytest app/backend/tests -v

# Create migration
docker-compose exec backend alembic revision --autogenerate -m "description"
```

### Service Ports

| Service | Port |
|---------|------|
| Backend API | 8000 |
| Frontend | 3000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MongoDB | 27017 |
| MinIO API | 9000 |
| MinIO Console | 9001 |
| Embedding Service | 9001 |
| Moderation Service | 9002 |
| Image Service | 9003 |
| Fake Profile Service | 9004 |
| Prometheus | 9091 |
| Grafana | 3001 |

---

**End of README**

<p align="center">
  <subbuilt by Elyra Platform Team</sub>
</p>