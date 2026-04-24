"""
Hermes Agent — FastAPI server

Endpoints:
  POST /messages          Send a message and get a reply
  GET  /sessions          List active sessions
  GET  /sessions/{id}     Get session info
  DELETE /sessions/{id}   Clear a session
  GET  /health            Health check
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core import HermesAgent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

agent: HermesAgent | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    agent = HermesAgent()
    logger.info("Hermes agent initialised (model=%s)", agent.model)
    yield
    logger.info("Hermes agent shutting down")


app = FastAPI(
    title="Hermes Agent",
    description="Claude-powered communication and message orchestration agent",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class MessageRequest(BaseModel):
    message: str = Field(..., min_length=1, description="The message to send to Hermes")
    session_id: str | None = Field(None, description="Conversation session ID (auto-created if omitted)")
    reply_to: str | None = Field(None, description="Recipient address for outbound delivery")
    channel: str | None = Field(None, description="Force a specific outbound channel")


class RouteInfo(BaseModel):
    intent: str
    agent: str
    channel: str
    priority: str
    requires_human: bool
    summary: str


class MessageResponse(BaseModel):
    session_id: str
    message: str
    route: RouteInfo
    delivery_success: bool
    delivery_channel: str
    latency_ms: float
    tokens_used: int


class SessionInfo(BaseModel):
    session_id: str
    message_count: int
    started_at: float | None = None
    last_activity: float | None = None
    channels_used: list[str] = []


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/messages", response_model=MessageResponse)
async def send_message(req: MessageRequest):
    """Send a message to Hermes and receive an AI-generated reply."""
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialised")

    try:
        result = agent.process(
            message=req.message,
            session_id=req.session_id,
            reply_to=req.reply_to,
            channel_override=req.channel,
        )
    except Exception as exc:
        logger.exception("Error processing message")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return MessageResponse(
        session_id=result.session_id,
        message=result.message,
        route=RouteInfo(
            intent=result.route.intent,
            agent=result.route.agent,
            channel=result.route.channel,
            priority=result.route.priority.value,
            requires_human=result.route.requires_human,
            summary=result.route.summary,
        ),
        delivery_success=result.delivery.success,
        delivery_channel=result.delivery.channel,
        latency_ms=round(result.latency_ms, 1),
        tokens_used=result.tokens_used,
    )


@app.get("/sessions", response_model=list[str])
async def list_sessions():
    """List all active session IDs."""
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialised")
    return agent.list_sessions()


@app.get("/sessions/{session_id}", response_model=SessionInfo)
async def get_session(session_id: str):
    """Get metadata for a specific session."""
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialised")
    info = agent.session_info(session_id)
    if info["message_count"] == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionInfo(**info)


@app.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    """Clear conversation history for a session."""
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialised")
    agent.clear_session(session_id)
    return {"cleared": session_id}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": agent.model if agent else None,
        "channels": agent.channels.available() if agent else [],
    }
