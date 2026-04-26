"""
Hermes Agent — Claude-powered communication and message orchestration agent.

Workflow for each incoming message:
  1. MessageRouter classifies intent and selects the right sub-agent + reply channel
  2. HermesAgent generates a response, calling tools if Claude requests them
  3. ChannelManager delivers the reply
  4. ConversationMemory records the exchange for future context
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
from .tools import ToolRegistry

logger = logging.getLogger(__name__)

AGENT_PROMPTS: dict[str, str] = {
    "general": (
        "You are Hermes, a helpful and concise AI assistant. "
        "Respond clearly and directly. Be conversational but efficient."
    ),
    "research": (
        "You are Hermes in research mode. Provide thorough, well-sourced analysis. "
        "Structure complex answers with headers and bullet points. "
        "Use the web_search tool to find current information when relevant."
    ),
    "code": (
        "You are Hermes in code mode. Write clean, production-ready code with minimal comments. "
        "Prefer working solutions over lengthy explanations unless asked."
    ),
    "summarize": (
        "You are Hermes in summarization mode. Condense content into key points using bullet points. "
        "Be ruthlessly concise."
    ),
    "translate": (
        "You are Hermes in translation mode. Translate accurately, preserving tone and nuance. "
        "Ask for the target language if ambiguous."
    ),
    "schedule": (
        "You are Hermes in scheduling mode. Help parse, create, and manage calendar events. "
        "Output structured data when creating events."
    ),
    "alert": (
        "You are Hermes in alert mode. Evaluate incoming signals for urgency and actionability. "
        "Flag anything requiring immediate human attention clearly."
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

    The `message` parameter to `process()` accepts either:
      - str:  plain text
      - list: Claude content blocks (for images, mixed text+image, etc.)
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
        self.tools = ToolRegistry()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process(
        self,
        message: str | list,
        session_id: str | None = None,
        reply_to: str | None = None,
        channel_override: str | None = None,
    ) -> HermesResponse:
        """
        Process an incoming message end-to-end.

        Args:
            message:          Text string or a list of Claude content blocks.
            session_id:       Conversation session identifier. Auto-generated if omitted.
            reply_to:         Recipient address for outbound delivery.
            channel_override: Force a specific outbound channel.
        """
        session_id = session_id or str(uuid.uuid4())
        t0 = time.perf_counter()

        text_for_routing = message if isinstance(message, str) else _extract_text(message)
        history = self.memory.get_history(session_id)

        route = self.router.route(text_for_routing, context=history)
        logger.info("Routed: %r → session=%s", route, session_id)

        system_prompt = AGENT_PROMPTS.get(route.agent, AGENT_PROMPTS["general"])
        reply_text, tokens_used = self._generate(message, system_prompt, history)

        self.memory.add(session_id, role="user", content=text_for_routing, channel=route.channel)
        self.memory.add(session_id, role="assistant", content=reply_text, channel=route.channel)

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
    # Internal: generation with tool-use loop
    # ------------------------------------------------------------------

    def _generate(
        self,
        user_message: str | list,
        system_prompt: str,
        history: list[dict],
    ) -> tuple[str, int]:
        messages = list(history)
        messages.append({"role": "user", "content": user_message})

        # Cache the system prompt — saves cost on repeated calls with the same prompt
        system = [{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}]

        claude_tools = self.tools.get_claude_tools()
        total_tokens = 0

        while True:
            kwargs: dict = {
                "model": self.model,
                "max_tokens": self.max_tokens,
                "system": system,
                "messages": messages,
            }
            if claude_tools:
                kwargs["tools"] = claude_tools

            response = self.client.messages.create(**kwargs)
            total_tokens += response.usage.input_tokens + response.usage.output_tokens

            if response.stop_reason == "tool_use":
                # Append assistant turn (may include both text and tool_use blocks)
                messages.append({"role": "assistant", "content": response.content})

                # Execute every tool Claude requested, collect results
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = self.tools.execute(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        })

                messages.append({"role": "user", "content": tool_results})
                # Loop: Claude will now read the tool results and continue

            else:
                # end_turn — extract the final text response
                text = next(
                    (block.text for block in response.content if hasattr(block, "text")),
                    "",
                )
                return text, total_tokens


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_text(content_blocks: list) -> str:
    """Pull plain text out of a Claude content-block list."""
    return " ".join(
        b["text"] for b in content_blocks if isinstance(b, dict) and b.get("type") == "text"
    )
