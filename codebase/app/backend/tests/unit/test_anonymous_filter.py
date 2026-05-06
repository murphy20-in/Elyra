"""Unit tests for websocket/anonymous.py AnonymousMessageFilter."""
import pytest
import fakeredis.aioredis
from unittest.mock import patch
from websocket.anonymous import AnonymousMessageFilter

pytestmark = pytest.mark.unit


@pytest.fixture
async def anon_filter():
    fake_redis = fakeredis.aioredis.FakeRedis()
    with patch("websocket.anonymous.get_redis", return_value=fake_redis):
        yield AnonymousMessageFilter()


class TestAnonymousFilter:
    async def test_first_user_gets_user_a(self, anon_filter):
        alias = await anon_filter.get_or_create_alias("thread-1", "real-user-id-1")
        assert alias == "user_a"

    async def test_second_user_gets_user_b(self, anon_filter):
        await anon_filter.get_or_create_alias("thread-1", "real-user-1")
        alias = await anon_filter.get_or_create_alias("thread-1", "real-user-2")
        assert alias == "user_b"

    async def test_same_user_gets_same_alias(self, anon_filter):
        a1 = await anon_filter.get_or_create_alias("thread-1", "user-x")
        a2 = await anon_filter.get_or_create_alias("thread-1", "user-x")
        assert a1 == a2

    async def test_aliases_are_thread_scoped(self, anon_filter):
        a1 = await anon_filter.get_or_create_alias("thread-A", "same-user")
        a2 = await anon_filter.get_or_create_alias("thread-B", "same-user")
        assert a1 in ("user_a", "user_b")
        assert a2 in ("user_a", "user_b")

    async def test_transform_message_replaces_sender_id(self, anon_filter):
        await anon_filter.get_or_create_alias("thread-T", "real-uid-99")
        msg = {"thread_id": "thread-T", "sender_id": "real-uid-99", "content": "hello"}
        transformed = await anon_filter.transform_message(msg, "thread-T")
        assert transformed["sender_id"] in ("user_a", "user_b")
        assert "real-uid-99" not in str(transformed["sender_id"])

    async def test_transform_does_not_mutate_original(self, anon_filter):
        await anon_filter.get_or_create_alias("thread-T2", "uid-orig")
        msg = {"thread_id": "thread-T2", "sender_id": "uid-orig", "content": "hi"}
        _ = await anon_filter.transform_message(msg, "thread-T2")
        assert msg["sender_id"] == "uid-orig"