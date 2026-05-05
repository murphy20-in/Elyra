import pytest
import pytest_asyncio
import asyncio
import uuid
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport, Response
from sqlalchemy.ext.asyncio import (
    create_async_engine, async_sessionmaker, AsyncSession
)
import fakeredis.aioredis
import respx
from unittest.mock import AsyncMock, patch

import os
os.environ.setdefault("DATABASE_URL",    "postgresql+asyncpg://elyra_user:elyra_test_pass@localhost:5433/elyra_test")
os.environ.setdefault("MONGODB_URL",     "mongodb://elyra_user:elyra_test_pass@localhost:27018")
os.environ.setdefault("REDIS_URL",       "redis://localhost:6380/0")
os.environ.setdefault("JWT_SECRET_KEY",  "test-secret-key-minimum-32-characters-here")
os.environ.setdefault("AES_ENCRYPTION_KEY", "0" * 64)
os.environ.setdefault("APP_ENV",         "testing")
os.environ.setdefault("SENTRY_DSN",      "")
os.environ.setdefault("EMBEDDING_SERVICE_URL",    "http://embedding-service-mock:9001")
os.environ.setdefault("MODERATION_SERVICE_URL",   "http://moderation-service-mock:9002")
os.environ.setdefault("IMAGE_SERVICE_URL",        "http://image-service-mock:9003")
os.environ.setdefault("FAKE_PROFILE_SERVICE_URL", "http://fake-profile-service-mock:9004")

from core.database import Base, get_async_session
from main import fastapi_app


def httpx_response(status_code: int, json_data: dict):
    return Response(status_code, json=json_data)


TEST_USER_1 = {
    "email":              "testuser1@test.elyra.app",
    "password":           "TestPass123!",
    "display_name":       "Test User One",
    "age":                25,
    "gender_identity":    "non-binary",
    "sexual_orientation": "pansexual",
    "intent":             "exploring",
    "city":               "Mumbai",
    "bio":                "Test bio for user one",
}

TEST_USER_2 = {
    "email":              "testuser2@test.elyra.app",
    "password":           "TestPass123!",
    "display_name":       "Test User Two",
    "age":                27,
    "gender_identity":    "woman",
    "sexual_orientation": "bisexual",
    "intent":             "serious",
    "city":               "Bangalore",
    "bio":                "Test bio for user two",
}

TEST_USER_ADMIN = {
    "email":              "admin@test.elyra.app",
    "password":           "AdminPass123!",
    "display_name":       "Test Admin",
    "age":                30,
    "gender_identity":    "man",
    "sexual_orientation": "gay",
    "intent":             "exploring",
    "city":               "Delhi",
}


@pytest_asyncio.fixture(scope="session")
async def engine():
    from core.config import settings
    test_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_size=5,
        max_overflow=10,
    )
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield test_engine
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        async with session.begin_nested() as savepoint:
            yield session
            await savepoint.rollback()


@pytest_asyncio.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    fastapi_app.dependency_overrides[get_async_session] = override_get_db

    async with respx.mock(assert_all_called=False):
        respx.post("http://embedding-service-mock:9001/embed").mock(
            return_value=httpx_response(200, {"embedding": [0.1] * 384})
        )
        respx.get("http://embedding-service-mock:9001/health").mock(
            return_value=httpx_response(200, {"status": "ok"})
        )
        respx.post("http://moderation-service-mock:9002/moderate/text").mock(
            return_value=httpx_response(200, {
                "is_toxic": False,
                "toxicity_score": 0.05,
                "categories": [],
                "action": "allow"
            })
        )
        respx.get("http://moderation-service-mock:9002/health").mock(
            return_value=httpx_response(200, {"status": "ok"})
        )
        respx.post("http://image-service-mock:9003/moderate/image").mock(
            return_value=httpx_response(200, {"is_safe": True, "action": "allow"})
        )
        respx.post("http://fake-profile-service-mock:9004/score").mock(
            return_value=httpx_response(200, {"is_fake": False, "confidence": 0.05})
        )

        async with AsyncClient(
            transport=ASGITransport(app=fastapi_app),
            base_url="http://testserver",
        ) as ac:
            yield ac

    fastapi_app.dependency_overrides.clear()


async def _register_and_get_headers(client: AsyncClient, user_data: dict) -> dict:
    resp = await client.post("/api/v1/auth/register", json=user_data)
    if resp.status_code == 409:
        resp = await client.post("/api/v1/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
    assert resp.status_code in (200, 201), f"Auth failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict:
    return await _register_and_get_headers(client, TEST_USER_1)


@pytest_asyncio.fixture
async def second_user_headers(client: AsyncClient) -> dict:
    return await _register_and_get_headers(client, TEST_USER_2)


@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    headers = await _register_and_get_headers(client, TEST_USER_ADMIN)
    from models.user import User
    from sqlalchemy import update
    await db_session.execute(
        update(User)
        .where(User.email == TEST_USER_ADMIN["email"])
        .values(role="admin")
    )
    await db_session.flush()
    resp = await client.post("/api/v1/auth/login", json={
        "email": TEST_USER_ADMIN["email"],
        "password": TEST_USER_ADMIN["password"],
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def moderator_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    mod_data = {**TEST_USER_ADMIN, "email": "moderator@test.elyra.app"}
    headers = await _register_and_get_headers(client, mod_data)
    from models.user import User
    from sqlalchemy import update
    await db_session.execute(
        update(User)
        .where(User.email == mod_data["email"])
        .values(role="moderator")
    )
    await db_session.flush()
    resp = await client.post("/api/v1/auth/login", json={
        "email": mod_data["email"], "password": mod_data["password"],
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest_asyncio.fixture
async def match_and_thread(client, auth_headers, second_user_headers, db_session):
    me1 = await client.get("/api/v1/auth/me", headers=auth_headers)
    me2 = await client.get("/api/v1/auth/me", headers=second_user_headers)
    user1_id = me1.json()["id"]
    user2_id = me2.json()["id"]

    await client.post(f"/api/v1/matches/{user2_id}/like", headers=auth_headers)
    resp = await client.post(f"/api/v1/matches/{user1_id}/like", headers=second_user_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("matched") is True

    return {
        "match_id":  data["match"]["id"],
        "thread_id": data["thread_id"],
        "user1_id":  user1_id,
        "user2_id":  user2_id,
    }