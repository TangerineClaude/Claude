# Actions Framework - Let AI Use Tools

## Overview
Extensible framework that allows AI to execute real actions: send emails, create calendar events, post notes, trigger webhooks, and more.

## Outcome
AI that doesn't just suggest - it acts. With proper approvals and audit trails, let AI automate your workflows safely.

## MVP Features

### Core Capabilities
- **Action Registry**: Pluggable action system
- **Approval Flow**: User confirmation before execution
- **Undo Support**: Revert actions when possible
- **Audit Log**: Complete history of all actions
- **Rate Limiting**: Prevent abuse
- **Dry Run Mode**: Preview actions without executing

### Built-in Actions
1. **Email**: Send, reply, forward
2. **Calendar**: Create events, schedule meetings
3. **Notes**: Create, update notes
4. **Tasks**: Add to-dos
5. **Webhooks**: Trigger custom integrations
6. **Zapier/Make**: Connect to thousands of apps

### Privacy & Security
- Explicit user consent required
- Granular permissions per action
- Encrypted credentials
- Zero-trust architecture
- Complete audit trail

## Tech Stack

### Backend
- **API**: Python/FastAPI or Node.js/Express
- **Database**: PostgreSQL for audit logs
- **Queue**: Celery/Bull for async execution
- **Cache**: Redis

### Frontend
- **Web**: React/TypeScript
- **Mobile**: React Native
- **Admin Panel**: Next.js

### Integrations
- **Gmail**: OAuth + Gmail API
- **Google Calendar**: Google Calendar API
- **Notion**: Notion API
- **Todoist**: Todoist API
- **Zapier/Make**: Webhooks

### AI
- **Action Planning**: Claude API for intent detection
- **Parameter Extraction**: Claude API
- **Confirmation**: Natural language confirmation

## Architecture

```
┌─────────────────┐
│   AI Agent      │
│   (Claude)      │
└────────┬────────┘
         │
    ┌────▼────────┐
    │   Action    │
    │   Planner   │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Approval   │
    │   Engine    │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Action     │
    │  Executor   │
    └──────┬──────┘
           │
    ┌──────▼────────────────┐
    │  Action Connectors    │
    ├───────────────────────┤
    │Email│Calendar│Notes│  │
    │Tasks│Webhook │Zapier│  │
    └───────────────────────┘
```

## Getting Started

### Prerequisites
- Python 3.9+ or Node.js 18+
- PostgreSQL 14+
- Redis 7+
- OAuth credentials for integrations

### Installation

```bash
cd projects/actions-framework

# Backend (Python example)
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Database setup
alembic upgrade head

# Start services
celery -A worker worker --loglevel=info &
python main.py

# Frontend
cd ../frontend
npm install
npm run dev
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/actions_framework
REDIS_URL=redis://localhost:6379

# AI
ANTHROPIC_API_KEY=your_claude_api_key

# Email (Gmail)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Calendar
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret

# Notion
NOTION_CLIENT_ID=your_client_id
NOTION_CLIENT_SECRET=your_client_secret

# Zapier
ZAPIER_WEBHOOK_URL=your_webhook_url

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Features
REQUIRE_APPROVAL_FOR_ALL_ACTIONS=true
ENABLE_UNDO=true
ACTION_TIMEOUT_SECONDS=30
MAX_ACTIONS_PER_MINUTE=10
```

## Action System

### Action Interface

```python
# actions/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

@dataclass
class ActionParameter:
    name: str
    type: str  # string, number, boolean, array, object
    description: str
    required: bool = True
    default: Any = None

@dataclass
class ActionResult:
    success: bool
    data: Any
    error: Optional[str] = None
    undo_data: Optional[Any] = None  # Data needed to undo

class Action(ABC):
    """Base class for all actions"""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique action identifier"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable description"""
        pass

    @property
    @abstractmethod
    def parameters(self) -> list[ActionParameter]:
        """List of parameters this action accepts"""
        pass

    @property
    def requires_approval(self) -> bool:
        """Whether this action requires user approval"""
        return True

    @property
    def supports_undo(self) -> bool:
        """Whether this action can be undone"""
        return False

    @abstractmethod
    async def execute(self, params: dict, context: dict) -> ActionResult:
        """Execute the action"""
        pass

    async def undo(self, undo_data: Any, context: dict) -> ActionResult:
        """Undo the action (optional)"""
        raise NotImplementedError("Undo not supported")

    def validate_params(self, params: dict) -> tuple[bool, Optional[str]]:
        """Validate parameters"""
        for param in self.parameters:
            if param.required and param.name not in params:
                return False, f"Missing required parameter: {param.name}"
        return True, None
```

### Example Actions

#### Send Email Action

```python
# actions/email_actions.py
from .base import Action, ActionParameter, ActionResult
import httpx

class SendEmailAction(Action):
    @property
    def name(self) -> str:
        return "send_email"

    @property
    def description(self) -> str:
        return "Send an email via Gmail"

    @property
    def parameters(self) -> list[ActionParameter]:
        return [
            ActionParameter("to", "string", "Recipient email address", required=True),
            ActionParameter("subject", "string", "Email subject", required=True),
            ActionParameter("body", "string", "Email body", required=True),
            ActionParameter("cc", "array", "CC recipients", required=False),
            ActionParameter("bcc", "array", "BCC recipients", required=False),
        ]

    @property
    def requires_approval(self) -> bool:
        return True  # Always require approval for sending emails

    @property
    def supports_undo(self) -> bool:
        return False  # Can't unsend emails

    async def execute(self, params: dict, context: dict) -> ActionResult:
        try:
            # Get user's Gmail access token
            access_token = context["integrations"]["gmail"]["access_token"]

            # Build Gmail API request
            message = {
                "raw": self._encode_message(
                    to=params["to"],
                    subject=params["subject"],
                    body=params["body"],
                    cc=params.get("cc"),
                    bcc=params.get("bcc")
                )
            }

            # Send via Gmail API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                    json=message,
                    headers={"Authorization": f"Bearer {access_token}"}
                )

            if response.status_code == 200:
                return ActionResult(
                    success=True,
                    data={"message_id": response.json()["id"]}
                )
            else:
                return ActionResult(
                    success=False,
                    data=None,
                    error=f"Gmail API error: {response.text}"
                )

        except Exception as e:
            return ActionResult(success=False, data=None, error=str(e))

    def _encode_message(self, to, subject, body, cc=None, bcc=None):
        # Encode message in base64 format required by Gmail API
        import base64
        from email.mime.text import MIMEText

        message = MIMEText(body)
        message['to'] = to
        message['subject'] = subject

        if cc:
            message['cc'] = ', '.join(cc)
        if bcc:
            message['bcc'] = ', '.join(bcc)

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        return raw
```

#### Create Calendar Event Action

```python
# actions/calendar_actions.py
from .base import Action, ActionParameter, ActionResult
from datetime import datetime
import httpx

class CreateCalendarEventAction(Action):
    @property
    def name(self) -> str:
        return "create_calendar_event"

    @property
    def description(self) -> str:
        return "Create a Google Calendar event"

    @property
    def parameters(self) -> list[ActionParameter]:
        return [
            ActionParameter("title", "string", "Event title", required=True),
            ActionParameter("start_time", "string", "Start time (ISO format)", required=True),
            ActionParameter("end_time", "string", "End time (ISO format)", required=True),
            ActionParameter("description", "string", "Event description", required=False),
            ActionParameter("location", "string", "Event location", required=False),
            ActionParameter("attendees", "array", "List of attendee emails", required=False),
        ]

    @property
    def supports_undo(self) -> bool:
        return True  # Can delete created events

    async def execute(self, params: dict, context: dict) -> ActionResult:
        try:
            access_token = context["integrations"]["calendar"]["access_token"]

            event = {
                "summary": params["title"],
                "start": {"dateTime": params["start_time"], "timeZone": "UTC"},
                "end": {"dateTime": params["end_time"], "timeZone": "UTC"},
            }

            if "description" in params:
                event["description"] = params["description"]
            if "location" in params:
                event["location"] = params["location"]
            if "attendees" in params:
                event["attendees"] = [{"email": email} for email in params["attendees"]]

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    json=event,
                    headers={"Authorization": f"Bearer {access_token}"}
                )

            if response.status_code == 200:
                event_data = response.json()
                return ActionResult(
                    success=True,
                    data={"event_id": event_data["id"], "link": event_data["htmlLink"]},
                    undo_data={"event_id": event_data["id"]}
                )
            else:
                return ActionResult(
                    success=False,
                    data=None,
                    error=f"Calendar API error: {response.text}"
                )

        except Exception as e:
            return ActionResult(success=False, data=None, error=str(e))

    async def undo(self, undo_data: Any, context: dict) -> ActionResult:
        """Delete the created event"""
        try:
            access_token = context["integrations"]["calendar"]["access_token"]
            event_id = undo_data["event_id"]

            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}",
                    headers={"Authorization": f"Bearer {access_token}"}
                )

            return ActionResult(
                success=response.status_code == 204,
                data=None,
                error=None if response.status_code == 204 else "Failed to delete event"
            )

        except Exception as e:
            return ActionResult(success=False, data=None, error=str(e))
```

### Action Registry

```python
# actions/registry.py
from typing import Dict, Type
from .base import Action
from .email_actions import SendEmailAction
from .calendar_actions import CreateCalendarEventAction
from .note_actions import CreateNoteAction
# Import other actions...

class ActionRegistry:
    _actions: Dict[str, Type[Action]] = {}

    @classmethod
    def register(cls, action_class: Type[Action]):
        """Register an action"""
        action = action_class()
        cls._actions[action.name] = action_class

    @classmethod
    def get(cls, name: str) -> Action:
        """Get an action by name"""
        if name not in cls._actions:
            raise ValueError(f"Unknown action: {name}")
        return cls._actions[name]()

    @classmethod
    def list_actions(cls) -> list[dict]:
        """List all available actions"""
        return [
            {
                "name": action().name,
                "description": action().description,
                "parameters": [
                    {
                        "name": p.name,
                        "type": p.type,
                        "description": p.description,
                        "required": p.required
                    }
                    for p in action().parameters
                ]
            }
            for action in cls._actions.values()
        ]

# Register all actions
ActionRegistry.register(SendEmailAction)
ActionRegistry.register(CreateCalendarEventAction)
ActionRegistry.register(CreateNoteAction)
# Register more...
```

### Action Executor

```python
# executor.py
from typing import Optional
import uuid
from datetime import datetime
from .actions.registry import ActionRegistry
from .approval import ApprovalEngine
from .audit import AuditLogger

class ActionExecutor:
    def __init__(self):
        self.registry = ActionRegistry
        self.approval_engine = ApprovalEngine()
        self.audit_logger = AuditLogger()

    async def execute_action(
        self,
        action_name: str,
        params: dict,
        context: dict,
        dry_run: bool = False
    ) -> dict:
        """Execute an action"""

        execution_id = str(uuid.uuid4())

        try:
            # Get action
            action = self.registry.get(action_name)

            # Validate parameters
            valid, error = action.validate_params(params)
            if not valid:
                return {
                    "success": False,
                    "execution_id": execution_id,
                    "error": error
                }

            # Log intent
            await self.audit_logger.log_intent(
                execution_id=execution_id,
                action=action_name,
                params=params,
                user_id=context["user_id"]
            )

            # Dry run mode - just validate
            if dry_run:
                return {
                    "success": True,
                    "execution_id": execution_id,
                    "dry_run": True,
                    "action": action_name,
                    "params": params,
                    "message": "Dry run successful. Action not executed."
                }

            # Check if approval required
            if action.requires_approval:
                approval_result = await self.approval_engine.request_approval(
                    execution_id=execution_id,
                    action=action_name,
                    params=params,
                    context=context
                )

                if not approval_result.approved:
                    await self.audit_logger.log_rejection(execution_id)
                    return {
                        "success": False,
                        "execution_id": execution_id,
                        "error": "Action not approved by user"
                    }

            # Execute action
            result = await action.execute(params, context)

            # Log result
            await self.audit_logger.log_execution(
                execution_id=execution_id,
                result=result
            )

            return {
                "success": result.success,
                "execution_id": execution_id,
                "data": result.data,
                "error": result.error,
                "undo_token": self._generate_undo_token(execution_id, result.undo_data) if result.undo_data else None
            }

        except Exception as e:
            await self.audit_logger.log_error(execution_id, str(e))
            return {
                "success": False,
                "execution_id": execution_id,
                "error": str(e)
            }

    async def undo_action(self, undo_token: str, context: dict) -> dict:
        """Undo a previously executed action"""
        # Decode undo token
        execution_id, undo_data = self._decode_undo_token(undo_token)

        # Get original action from audit log
        execution = await self.audit_logger.get_execution(execution_id)
        action = self.registry.get(execution["action_name"])

        if not action.supports_undo:
            return {
                "success": False,
                "error": "Action does not support undo"
            }

        # Execute undo
        result = await action.undo(undo_data, context)

        # Log undo
        await self.audit_logger.log_undo(execution_id, result)

        return {
            "success": result.success,
            "error": result.error
        }

    def _generate_undo_token(self, execution_id: str, undo_data: Any) -> str:
        # Generate secure token for undo
        import jwt
        return jwt.encode(
            {"execution_id": execution_id, "undo_data": undo_data},
            "secret",  # Use proper secret from env
            algorithm="HS256"
        )

    def _decode_undo_token(self, token: str) -> tuple:
        import jwt
        data = jwt.decode(token, "secret", algorithms=["HS256"])
        return data["execution_id"], data["undo_data"]
```

## API Endpoints

### Actions
- `GET /api/actions` - List all available actions
- `POST /api/actions/execute` - Execute an action
- `POST /api/actions/dry-run` - Preview action without executing
- `POST /api/actions/undo` - Undo an action
- `GET /api/actions/history` - Get execution history

### Approvals
- `GET /api/approvals/pending` - List pending approvals
- `POST /api/approvals/:id/approve` - Approve action
- `POST /api/approvals/:id/reject` - Reject action

### Integrations
- `GET /api/integrations` - List connected integrations
- `POST /api/integrations/:type/connect` - Connect integration
- `DELETE /api/integrations/:id` - Disconnect integration

## Database Schema

```sql
-- Action Executions
CREATE TABLE action_executions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action_name VARCHAR(100) NOT NULL,
  params JSONB NOT NULL,
  result JSONB,
  status VARCHAR(20),  -- pending, approved, rejected, executed, failed, undone
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  undo_data JSONB
);

-- Approval Requests
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY,
  execution_id UUID REFERENCES action_executions(id),
  status VARCHAR(20),  -- pending, approved, rejected
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
);

-- Integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50),  -- gmail, calendar, notion, etc.
  credentials JSONB,  -- encrypted
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Features

### 1. AI Action Planning
```python
async def plan_actions(user_request: str) -> list[dict]:
    """Let AI determine which actions to take"""
    prompt = f"""
    User request: {user_request}

    Available actions:
    {json.dumps(ActionRegistry.list_actions(), indent=2)}

    Determine which actions should be executed to fulfill this request.
    Return a JSON array of actions with their parameters.
    """

    # Claude API call...
    return actions
```

### 2. Approval UI
- Clear action description
- Show all parameters
- Preview impact
- One-tap approve/reject
- Set approval preferences

### 3. Audit Trail
- Every action logged
- Timestamp, user, parameters
- Results and errors
- Undo history
- Export logs

## Security

1. **OAuth 2.0**: Secure credential storage
2. **Encryption**: All credentials encrypted at rest
3. **Rate Limiting**: Prevent abuse
4. **Approval Required**: Explicit user consent
5. **Audit Logging**: Complete transparency

## Testing

```bash
# Unit tests
pytest tests/

# Integration tests (requires test accounts)
pytest tests/integration/

# Test action execution
pytest tests/test_executor.py
```

## Roadmap

### Phase 1 (MVP) - 8 weeks
- [x] Action framework
- [x] Email and Calendar actions
- [x] Approval engine
- [x] Audit logging
- [x] Web UI

### Phase 2 - 12 weeks
- [ ] More integrations (Notion, Todoist, Slack)
- [ ] Zapier/Make webhooks
- [ ] Action chaining
- [ ] Conditional execution
- [ ] Mobile app

### Phase 3 - 16 weeks
- [ ] Custom actions (user-defined)
- [ ] Action marketplace
- [ ] Scheduled actions
- [ ] AI action recommendations
- [ ] Team collaboration

## License

Proprietary - All rights reserved

---

**Status**: 🚧 In Development
**Target Launch**: Q3 2025
