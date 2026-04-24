# Hermes Agent

Claude-powered communication and message orchestration agent. Named after the Greek messenger god, Hermes receives messages from any channel, intelligently routes them to the right sub-agent, generates a response with Claude, and delivers the reply through the appropriate outbound channel.

## Architecture

```
Incoming Message
      │
      ▼
 MessageRouter  ──── Claude classifies intent, selects agent & channel
      │
      ▼
 HermesAgent  ──── Claude generates response with specialised system prompt
      │
      ▼
ChannelManager ──── Delivers reply (API | Email | Webhook)
      │
      ▼
ConversationMemory ── Persists exchange for context continuity
```

### Sub-agents

| Agent | Best for |
|-------|----------|
| `general` | Everyday Q&A and conversation |
| `research` | Deep analysis and synthesis |
| `code` | Code generation and review |
| `summarize` | Condensing documents or threads |
| `translate` | Language translation |
| `schedule` | Calendar events and reminders |
| `alert` | Urgency evaluation and escalation |

### Channels

| Channel | When used |
|---------|-----------|
| `api` | Default — response returned in the HTTP reply |
| `email` | Router selects email; requires SMTP config |
| `webhook` | Deliver reply via HTTP POST to a URL |

## Quick Start

```bash
cd projects/hermes-agent
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

uvicorn server:app --reload --port 8000
```

## API

### Send a message

```http
POST /messages
Content-Type: application/json

{
  "message": "Summarise the key points of transformer architectures",
  "session_id": "user-abc",          // optional — auto-generated if omitted
  "reply_to": null,                  // email addr or webhook URL for outbound delivery
  "channel": null                    // override channel: "api" | "email" | "webhook"
}
```

**Response:**
```json
{
  "session_id": "user-abc",
  "message": "Transformer architectures rely on...",
  "route": {
    "intent": "query",
    "agent": "summarize",
    "channel": "api",
    "priority": "normal",
    "requires_human": false,
    "summary": "Summarise transformer architecture"
  },
  "delivery_success": true,
  "delivery_channel": "api",
  "latency_ms": 1240.5,
  "tokens_used": 892
}
```

### Other endpoints

```
GET    /sessions              List active session IDs
GET    /sessions/{id}         Session metadata
DELETE /sessions/{id}         Clear session history
GET    /health                Health check
```

Interactive docs: `http://localhost:8000/docs`

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | **Required.** Anthropic API key |
| `HERMES_MODEL` | `claude-sonnet-4-6` | Claude model to use |
| `HERMES_MAX_TOKENS` | `2048` | Max tokens per response |
| `SMTP_HOST` | `localhost` | SMTP server for email channel |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username (enables email channel) |
| `SMTP_PASS` | — | SMTP password |
| `EMAIL_FROM` | = SMTP_USER | Sender address |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |

## Running Tests

```bash
pip install pytest
pytest tests/ -v
```
