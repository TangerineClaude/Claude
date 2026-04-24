"""
Hermes Agent — Claude-powered communication and message orchestration agent.

Named after the Greek messenger god, Hermes receives messages from any channel,
intelligently routes them to the right sub-agent, generates a response with Claude,
and delivers the reply through the appropriate outbound channel.
"""

import logging
import os
import time
import uuid
from dataclasses import dataclass

import anthropic

from .channels import ChannelManager, DeliveryResult
from .memory import ConversationMemory
from .router import MessageRouter, RouteDecision

logger = logging.getLogger(__name__)

# System prompts keyed by agent specialisation
AGENT_PROMPTS: dict[str, str] = {
    "general": (
        "You are Hermes, a helpful and concise AI assistant. "
        "Respond clearly and directly. Be conversational but efficient."
    ),
    "research": (
        "You are Hermes in research mode. Provide thorough, well-sourced analysis. "
        "Structure complex answers with headers and bullet points."
    ),
    "code": (
        "You are Hermes in code mode. Write clean, production-ready code with minimal comments. "
        "Prefer working solutions over explanations unless asked."
    ),
    "summarize": (
        "You are Hermes in summarization mode. Condense the provided content into the key points. "
        "Use bullet points. Be ruthlessly concise."
    ),
    "translate": (
        "You are Hermes in translation mode. Translate accurately, preserving tone and nuance. "
        "If the target language is ambiguous, ask before translating."
    ),
    "schedule": (
        "You are Hermes in scheduling mode. Help parse, create, and manage calendar events and reminders. "
        "Output structured data when creating events."
    ),
    "alert": (
        "You are Hermes in alert mode. Evaluate incoming signals for urgency and actionability. "
        "Flag anything that requires immediate human attention clearly."
    ),
}


@dataclass
class HermesResponse:
    session_id: str
    message: str
    route: RouteDecision
    delivery: DeliveryResult
    latency_ms: float
    tokens_used: int


class HermesAgent:
    """
    Core Hermes orchestration agent.

    Workflow for each incoming message:
      1. Router classifies intent, selects sub-agent and reply channel
      2. Claude generates a response using the appropriate system prompt
      3. ChannelManager delivers the reply to the outbound channel
      4. ConversationMemory records the exchange for context continuity
    """

    def __init__(self):
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError("ANTHROPIC_API_KEY environment variable is required")

        self.model = os.environ.get("HERMES_MODEL", "claude-sonnet-4-6")
        self.max_tokens = int(os.environ.get("HERMES_MAX_TOKENS", "2048"))

        self.client = anthropic.Anthropic(api_key=api_key)
        self.router = MessageRouter(client=self.client, model=self.model)
        self.channels = ChannelManager()
        self.memory = ConversationMemory()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process(
        self,
        message: str,
        session_id: str | None = None,
        reply_to: str | None = None,
        channel_override: str | None = None,
    ) -> HermesResponse:
        """
        Process an incoming message end-to-end.

        Args:
            message:          The user's message text.
            session_id:       Conversation session identifier. Auto-generated if omitted.
            reply_to:         Recipient address for outbound delivery (email addr, webhook URL, etc.)
            channel_override: Force a specific outbound channel instead of the router's choice.

        Returns:
            HermesResponse with the generated reply, routing decision, and delivery result.
        """
        session_id = session_id or str(uuid.uuid4())
        t0 = time.perf_counter()

        # 1. Retrieve conversation context
        history = self.memory.get_history(session_id)

        # 2. Route the message
        route = self.router.route(message, context=history)
        logger.info("Routed: %r → session=%s", route, session_id)

        # 3. Generate a response with Claude
        system_prompt = AGENT_PROMPTS.get(route.agent, AGENT_PROMPTS["general"])
        reply_text, tokens_used = self._generate(message, system_prompt, history)

        # 4. Persist to memory
        self.memory.add(session_id, role="user", content=message, channel=route.channel)
        self.memory.add(session_id, role="assistant", content=reply_text, channel=route.channel)

        # 5. Deliver through appropriate channel
        outbound_channel = channel_override or route.channel
        delivery = self.channels.send(
            channel_name=outbound_channel,
            recipient=reply_to or "api",
            subject=f"Hermes: {route.summary or 'Reply'}",
            body=reply_text,
        )

        latency_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "Processed session=%s agent=%s channel=%s latency=%.0fms tokens=%d",
            session_id, route.agent, outbound_channel, latency_ms, tokens_used,
        )

        return HermesResponse(
            session_id=session_id,
            message=reply_text,
            route=route,
            delivery=delivery,
            latency_ms=latency_ms,
            tokens_used=tokens_used,
        )

    def clear_session(self, session_id: str) -> None:
        self.memory.clear(session_id)

    def session_info(self, session_id: str) -> dict:
        return self.memory.session_info(session_id)

    def list_sessions(self) -> list[str]:
        return self.memory.list_sessions()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _generate(self, user_message: str, system_prompt: str, history: list[dict]) -> tuple[str, int]:
        messages = list(history)  # shallow copy
        messages.append({"role": "user", "content": user_message})

        response = self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            system=system_prompt,
            messages=messages,
        )
        text = response.content[0].text
        tokens = response.usage.input_tokens + response.usage.output_tokens
        return text, tokens
