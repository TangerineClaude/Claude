import json
import re
import logging
from enum import Enum

import anthropic

logger = logging.getLogger(__name__)

ROUTE_SYSTEM = """You are Hermes, an intelligent message router. Your job is to classify incoming messages and decide the best routing.

Analyze each message and respond with a JSON object only — no prose, no markdown fences:
{
  "intent": "<primary intent>",
  "channel": "<best reply channel: api|email|sms|notification|webhook>",
  "agent": "<which sub-agent should handle this: general|research|code|summarize|translate|schedule|alert>",
  "priority": "<low|normal|high|urgent>",
  "requires_human": <true|false>,
  "summary": "<one sentence summary of the request>"
}

Intent categories: query, task, notification, alert, conversation, command, error_report, feedback.
Choose the most appropriate agent based on the message content."""


class Priority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class RouteDecision:
    def __init__(self, raw: dict):
        self.intent: str = raw.get("intent", "query")
        self.channel: str = raw.get("channel", "api")
        self.agent: str = raw.get("agent", "general")
        self.priority: Priority = Priority(raw.get("priority", "normal"))
        self.requires_human: bool = raw.get("requires_human", False)
        self.summary: str = raw.get("summary", "")

    def __repr__(self) -> str:
        return (
            f"RouteDecision(intent={self.intent!r}, agent={self.agent!r}, "
            f"channel={self.channel!r}, priority={self.priority})"
        )


class MessageRouter:
    """Uses Claude to classify messages and produce routing decisions."""

    def __init__(self, client: anthropic.Anthropic, model: str):
        self.client = client
        self.model = model

    def route(self, message: str, context: list[dict] | None = None) -> RouteDecision:
        messages = []
        if context:
            messages.extend(context[-6:])  # Include recent context
        messages.append({"role": "user", "content": message})

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=256,
                system=ROUTE_SYSTEM,
                messages=messages,
            )
            raw_text = response.content[0].text.strip()
            json_match = re.search(r"\{[\s\S]*\}", raw_text)
            if json_match:
                raw = json.loads(json_match.group())
            else:
                raise ValueError("No JSON in router response")
        except Exception as exc:
            logger.warning("Router classification failed, using defaults: %s", exc)
            raw = {}

        return RouteDecision(raw)
