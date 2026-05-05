You are a senior staff engineer and system architect.

Your task is to design and implement a production-grade, scalable, AI-enabled LGBTQIA+ dating platform focused on India, with a strong emphasis on privacy, safety, and trust.

You MUST follow a structured execution plan and generate a COMPLETE working codebase with backend, frontend, database, AI modules, and deployment configs.

---

# 🎯 PRODUCT REQUIREMENTS

Build a platform with the following unique features:

1. Dual Identity System

   * Public profile (safe, visible)
   * Private profile (encrypted, reveal-based access)

2. Intent-Based Matching

   * Users select intent: exploring, serious, discreet, friendship
   * Matching algorithm based on intent + preferences + embeddings

3. AI Trust & Safety Layer

   * Fake profile detection
   * Chat toxicity detection
   * Risk scoring system

4. Privacy-first Chat

   * Real-time messaging
   * AI moderation
   * Optional anonymous mode

5. Safe Date Feature

   * Emergency contact
   * Live location sharing

6. Monetization

   * Subscription tiers
   * Paid verification badge
   * Premium privacy controls

---

# 🧱 TECH STACK (MANDATORY)

Backend:

* FastAPI (Python)
* PostgreSQL (primary DB)
* Redis (cache + pub/sub)
* MongoDB (chat storage)
* pgvector (embeddings)

Frontend:

* React (Next.js)
* Tailwind CSS

Mobile (optional scaffold):

* React Native

AI Layer:

* Python microservices
* OpenAI or open-source LLM
* CV model placeholders (face verification, nudity detection)

Infra:

* Dockerized services
* Kubernetes-ready configs
* NGINX gateway

---

# 🗄️ DATABASE SCHEMA

Use the following schema EXACTLY (implement migrations):

* users
* public_profiles
* private_profiles (encrypted fields)
* user_preferences
* matches
* chat_threads
* safety_events
* reports
* blocks
* user_embeddings (pgvector)
* subscriptions
* payments
* notifications
* safe_sessions

---

# ⚙️ SYSTEM ARCHITECTURE

Follow microservices architecture:

* API Gateway
* Auth Service
* Profile Service
* Matching Service
* Chat Service
* Trust & Safety Service
* Payment Service
* Notification Service

Each service must:

* Be independently deployable
* Have its own router/module
* Use async patterns

---

# 🔐 SECURITY REQUIREMENTS

* JWT authentication (access + refresh tokens)
* AES-256 encryption for private profile fields
* Role-based access control
* Input validation everywhere
* Rate limiting middleware

---

# 🧠 AI FEATURES (IMPLEMENT MINIMAL WORKING VERSION)

1. User Embeddings

   * Convert bio + preferences → vector
   * Store in pgvector

2. Matching Algorithm

   * Combine:

     * intent match
     * distance
     * embedding similarity

3. Moderation

   * Toxicity classifier (basic placeholder)
   * Image moderation stub

4. Risk Scoring

   * Based on reports + behavior

---

# 💬 CHAT SYSTEM

* WebSocket-based real-time messaging
* Store messages in MongoDB
* Redis pub/sub for scaling
* Message moderation hook

---

# 📦 PROJECT STRUCTURE

Generate a clean monorepo:

/app
/backend
/services
/models
/schemas
/routes
/core
/frontend
/components
/pages
/ai-services
/infra
docker-compose.yml
k8s/
/scripts
README.md

---

# 🧪 TESTING

* Unit tests (pytest)
* API tests
* Basic integration tests

---

# 🚀 DEPLOYMENT

* Dockerize all services
* Provide docker-compose for local dev
* Provide Kubernetes YAML for production
* Include environment variable templates (.env.example)

---

# 🧾 EXECUTION STRATEGY (VERY IMPORTANT)

You MUST proceed in phases:

PHASE 1: Architecture planning

* Output system design
* Confirm modules

PHASE 2: Database models + migrations

PHASE 3: Backend APIs (service by service)

PHASE 4: AI modules

PHASE 5: Chat system

PHASE 6: Frontend

PHASE 7: Integration

PHASE 8: Deployment configs

PHASE 9: Testing

At each phase:

* Generate complete working code
* Ensure no missing dependencies
* Validate imports and structure

---

# ⚠️ RULES

* DO NOT skip steps
* DO NOT leave TODO placeholders
* DO NOT generate pseudo-code
* ALWAYS produce runnable code
* ENSURE consistency across services

---

# 🎯 OUTPUT FORMAT

* Step-by-step generation
* Provide file paths before code
* Ensure code is complete and executable
* Use best practices

---

# 🔥 FINAL GOAL

By the end, I should be able to:

1. Run docker-compose up
2. Access backend APIs
3. Open frontend
4. Register users
5. Match users
6. Send messages
7. See AI moderation working

---

⚡ Final Winner Strategy (Best Move)

Pick:
👉 Primary brand (global) → Elyra
👉 Internal product philosophy → “Pehchaan Layer”

This gives you:

Global appeal 🌍
Deep emotional core 🧠
Strong differentiation 💥
🚀 Bonus: Brand Positioning

Instead of:

Dating app

Position as:

“A safer way to connect, explore identity, and build real connections.”
