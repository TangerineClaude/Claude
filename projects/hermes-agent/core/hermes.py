"""
Hermes Agent — multi-provider AI orchestration agent.

Supported providers (set HERMES_PROVIDER in .env):
  anthropic   — Claude via Anthropic API (default, paid, best quality)
  openrouter  — Any model via OpenRouter (free tier available)
  gemini      — Google Gemini via AI Studio API (generous free tier)

Workflow for each incoming message:
  1. MessageRouter classifies intent and selects the right sub-agent + reply channel
  2. HermesAgent generates a response, calling tools if the provider supports it
  3. ChannelManager delivers the reply
  4. ConversationMemory records the exchange for future context
"""

import logging
import os
import time
import uuid
from dataclasses import dataclass

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

# Free models on OpenRouter with large context windows (64K+)
OPENROUTER_FREE_MODELS = [
    "meta-llama/llama-3.1-8b-instruct:free",   # 128K ctx — recommended default
    "meta-llama/llama-3.2-3b-instruct:free",    # 131K ctx — very fast
    "google/gemma-3-12b-it:free",               # 96K ctx  — strong reasoning
    "microsoft/phi-3-mini-128k-instruct:free",  # 128K ctx — lightweight
]


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

    Set HERMES_PROVIDER=anthropic  (+ ANTHROPIC_API_KEY)  for Claude (default).
    Set HERMES_PROVIDER=openrouter (+ OPENROUTER_API_KEY) for free OpenRouter models.
    Set HERMES_PROVIDER=gemini     (+ GEMINI_API_KEY)     for Google Gemini.

    The `message` parameter to `process()` accepts either:
      - str:  plain text
      - list: Claude content blocks (for images — Anthropic provider only)
    """

    def __init__(self):
        self.provider = os.environ.get("HERMES_PROVIDER", "anthropic").lower()
        self.max_tokens = int(os.environ.get("HERMES_MAX_TOKENS", "2048"))
        self.channels = ChannelManager()
        self.memory = ConversationMemory()
        self.tools = ToolRegistry()

        if self.provider == "openrouter":
            self._init_openrouter()
        elif self.provider == "gemini":
            self._init_gemini()
        else:
            self._init_anthropic()

    # ------------------------------------------------------------------
    # Provider initialisation
    # ------------------------------------------------------------------

    def _init_anthropic(self) -> None:
        import anthropic as _anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "ANTHROPIC_API_KEY is required when HERMES_PROVIDER=anthropic (the default).\n"
                "Either add the key to .env, or switch to the free OpenRouter provider:\n"
                "  HERMES_PROVIDER=openrouter\n"
                "  OPENROUTER_API_KEY=<your key from openrouter.ai>"
            )
        self._anthropic = _anthropic.Anthropic(api_key=api_key)
        self.model = os.environ.get("HERMES_MODEL", "claude-sonnet-4-6")
        self.router: MessageRouter | None = MessageRouter(client=self._anthropic, model=self.model)
        logger.info("Provider: Anthropic — model=%s", self.model)

    def _init_gemini(self) -> None:
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY is required when HERMES_PROVIDER=gemini.\n"
                "Get a free key at https://aistudio.google.com → Get API key."
            )
        genai.configure(api_key=api_key)
        self._genai = genai
        self.model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
        self.router = None
        logger.info("Provider: Gemini — model=%s", self.model)

    def _init_openrouter(self) -> None:
        import openai as _openai
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "OPENROUTER_API_KEY is required when HERMES_PROVIDER=openrouter.\n"
                "Sign up free at https://openrouter.ai, then add the key to .env."
            )
        self._openrouter = _openai.OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        self.model = os.environ.get("OPENROUTER_MODEL", OPENROUTER_FREE_MODELS[0])
        self.router = None  # routing uses simple defaults with OpenRouter
        logger.info("Provider: OpenRouter — model=%s", self.model)

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
            message:          Text string or Claude content blocks (images — Anthropic only).
            session_id:       Conversation session identifier. Auto-generated if omitted.
            reply_to:         Recipient address for outbound delivery.
            channel_override: Force a specific outbound channel.
        """
        session_id = session_id or str(uuid.uuid4())
        t0 = time.perf_counter()

        text_for_routing = message if isinstance(message, str) else _extract_text(message)
        history = self.memory.get_history(session_id)

        if self.router:
            route = self.router.route(text_for_routing, context=history)
        else:
            route = RouteDecision({})  # neutral defaults for OpenRouter
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
    # Internal: generation (dispatches by provider)
    # ------------------------------------------------------------------

    def _generate(
        self,
        user_message: str | list,
        system_prompt: str,
        history: list[dict],
    ) -> tuple[str, int]:
        if self.provider == "gemini":
            return self._generate_gemini(user_message, system_prompt, history)
        if self.provider == "openrouter":
            return self._generate_openrouter(user_message, system_prompt, history)
        return self._generate_anthropic(user_message, system_prompt, history)

    def _generate_anthropic(
        self,
        user_message: str | list,
        system_prompt: str,
        history: list[dict],
    ) -> tuple[str, int]:
        messages = list(history)
        messages.append({"role": "user", "content": user_message})

        # Ephemeral cache on the system prompt — reduces cost on repeated calls
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

            response = self._anthropic.messages.create(**kwargs)
            total_tokens += response.usage.input_tokens + response.usage.output_tokens

            if response.stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": response.content})
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
            else:
                text = next(
                    (block.text for block in response.content if hasattr(block, "text")), ""
                )
                return text, total_tokens

    def _generate_gemini(
        self,
        user_message: str | list,
        system_prompt: str,
        history: list[dict],
    ) -> tuple[str, int]:
        # Gemini uses "model" instead of "assistant" for the AI role
        gemini_history = [
            {
                "role": "model" if msg["role"] == "assistant" else "user",
                "parts": [msg["content"]],
            }
            for msg in history
        ]
        content = user_message if isinstance(user_message, str) else _extract_text(user_message)
        model = self._genai.GenerativeModel(
            model_name=self.model,
            system_instruction=system_prompt,
        )
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(content)
        text = response.text
        tokens = (
            response.usage_metadata.total_token_count
            if response.usage_metadata else 0
        )
        return text, tokens

    def _generate_openrouter(
        self,
        user_message: str | list,
        system_prompt: str,
        history: list[dict],
    ) -> tuple[str, int]:
        # OpenRouter uses the OpenAI chat-completions format
        messages: list[dict] = [{"role": "system", "content": system_prompt}]
        messages.extend(history)

        # Flatten image content blocks to text for non-Anthropic providers
        content = user_message if isinstance(user_message, str) else _extract_text(user_message)
        messages.append({"role": "user", "content": content})

        response = self._openrouter.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=self.max_tokens,
        )
        text = response.choices[0].message.content or ""
        tokens = response.usage.total_tokens if response.usage else 0
        return text, tokens


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_text(content_blocks: list) -> str:
    """Pull plain text out of a Claude content-block list."""
    return " ".join(
        b["text"] for b in content_blocks if isinstance(b, dict) and b.get("type") == "text"
    )
