"""Unit tests for Hermes agent components (no API calls required)."""

import pytest
from unittest.mock import MagicMock, patch

from core.memory import ConversationMemory
from core.router import MessageRouter, RouteDecision
from core.channels import ChannelManager, APIChannel


class TestConversationMemory:
    def test_add_and_retrieve(self):
        mem = ConversationMemory()
        mem.add("s1", "user", "Hello", "api")
        mem.add("s1", "assistant", "Hi there!", "api")
        history = mem.get_history("s1")
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[1]["role"] == "assistant"

    def test_max_messages_trimmed(self):
        mem = ConversationMemory(max_messages=4)
        for i in range(10):
            mem.add("s1", "user", f"msg {i}", "api")
        assert len(mem.get_history("s1")) == 4

    def test_clear_session(self):
        mem = ConversationMemory()
        mem.add("s1", "user", "test", "api")
        mem.clear("s1")
        assert mem.get_history("s1") == []

    def test_empty_session_returns_empty(self):
        mem = ConversationMemory()
        assert mem.get_history("nonexistent") == []

    def test_session_info(self):
        mem = ConversationMemory()
        mem.add("s1", "user", "Hello", "email")
        info = mem.session_info("s1")
        assert info["message_count"] == 1
        assert "email" in info["channels_used"]

    def test_list_sessions(self):
        mem = ConversationMemory()
        mem.add("s1", "user", "a", "api")
        mem.add("s2", "user", "b", "api")
        assert set(mem.list_sessions()) == {"s1", "s2"}


class TestRouteDecision:
    def test_defaults(self):
        decision = RouteDecision({})
        assert decision.intent == "query"
        assert decision.channel == "api"
        assert decision.agent == "general"
        assert decision.priority.value == "normal"
        assert decision.requires_human is False

    def test_full_payload(self):
        decision = RouteDecision({
            "intent": "task",
            "channel": "email",
            "agent": "code",
            "priority": "high",
            "requires_human": True,
            "summary": "User wants a Python script",
        })
        assert decision.intent == "task"
        assert decision.channel == "email"
        assert decision.agent == "code"
        assert decision.priority.value == "high"
        assert decision.requires_human is True
        assert "Python" in decision.summary


class TestMessageRouter:
    def _make_router(self, response_json: str) -> MessageRouter:
        client = MagicMock()
        response = MagicMock()
        response.content = [MagicMock(text=response_json)]
        client.messages.create.return_value = response
        return MessageRouter(client=client, model="claude-sonnet-4-6")

    def test_valid_routing(self):
        router = self._make_router(
            '{"intent": "task", "channel": "api", "agent": "code", '
            '"priority": "normal", "requires_human": false, "summary": "Write code"}'
        )
        decision = router.route("Write a Python function")
        assert decision.agent == "code"
        assert decision.channel == "api"

    def test_fallback_on_bad_json(self):
        router = self._make_router("not valid json at all")
        decision = router.route("Hello")
        assert decision.agent == "general"  # falls back to default

    def test_context_passed_to_api(self):
        router = self._make_router('{"intent":"query","channel":"api","agent":"general","priority":"normal","requires_human":false,"summary":""}')
        context = [{"role": "user", "content": "prev"}, {"role": "assistant", "content": "ok"}]
        router.route("follow-up", context=context)
        call_args = router.client.messages.create.call_args
        messages_sent = call_args.kwargs["messages"]
        assert any(m["content"] == "prev" for m in messages_sent)


class TestChannelManager:
    def test_api_channel_always_succeeds(self):
        ch = APIChannel()
        result = ch.send("api", "subject", "body")
        assert result.success is True
        assert result.channel == "api"

    def test_manager_falls_back_to_api(self):
        manager = ChannelManager()
        result = manager.send("unknown_channel", "recipient", "subject", "body")
        assert result.channel == "api"
        assert result.success is True

    def test_manager_lists_channels(self):
        manager = ChannelManager()
        channels = manager.available()
        assert "api" in channels
        assert "email" in channels
        assert "webhook" in channels

    def test_email_unconfigured_returns_failure(self):
        manager = ChannelManager()
        # Email channel has no SMTP_USER set in test env → should fail gracefully
        result = manager.send("email", "test@example.com", "Hello", "Body")
        assert result.channel == "email"
        assert result.success is False
        assert result.error is not None
