import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Message:
    role: str
    content: str
    channel: str
    timestamp: float = field(default_factory=time.time)
    metadata: dict = field(default_factory=dict)


class ConversationMemory:
    """In-memory conversation state per session."""

    def __init__(self, max_messages: int = 40):
        self._sessions: dict[str, list[Message]] = {}
        self.max_messages = max_messages

    def add(self, session_id: str, role: str, content: str, channel: str = "api", metadata: dict | None = None) -> None:
        if session_id not in self._sessions:
            self._sessions[session_id] = []
        self._sessions[session_id].append(
            Message(role=role, content=content, channel=channel, metadata=metadata or {})
        )
        # Trim to keep only the most recent messages
        if len(self._sessions[session_id]) > self.max_messages:
            self._sessions[session_id] = self._sessions[session_id][-self.max_messages:]

    def get_history(self, session_id: str) -> list[dict]:
        messages = self._sessions.get(session_id, [])
        return [{"role": m.role, "content": m.content} for m in messages]

    def clear(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def list_sessions(self) -> list[str]:
        return list(self._sessions.keys())

    def session_info(self, session_id: str) -> dict:
        messages = self._sessions.get(session_id, [])
        if not messages:
            return {"session_id": session_id, "message_count": 0}
        return {
            "session_id": session_id,
            "message_count": len(messages),
            "started_at": messages[0].timestamp,
            "last_activity": messages[-1].timestamp,
            "channels_used": list({m.channel for m in messages}),
        }
