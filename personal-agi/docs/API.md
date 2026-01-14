# Personal AGI API Documentation

## Base URL

- **Local Development**: `http://localhost:3000`
- **Production**: `https://your-service.run.app` (GCP Cloud Run)

## Authentication

Currently, the MVP does not require authentication. For production deployment, you should implement JWT-based authentication.

## Endpoints

### Health Check

#### GET `/health`

Check server health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-02T10:30:00.000Z",
  "uptime": 12345
}
```

---

## Conversation Endpoints

### Send Message

#### POST `/api/conversation/chat`

Send a message to the AGI and get a response.

**Request Body:**
```json
{
  "message": "Export my ChatGPT chats as PDFs",
  "options": {
    "model": "claude-sonnet-4",  // optional, defaults to auto-select
    "stream": false               // optional, future feature
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "I'll log into your ChatGPT account and export all chats...",
  "model": "claude-sonnet-4",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 200,
    "totalTokens": 350
  },
  "cost": {
    "inputCost": 0.00045,
    "outputCost": 0.003,
    "totalCost": 0.00345
  },
  "latency": 1234,
  "taskAnalysis": {
    "task_type": "browser_automation",
    "complexity": "moderate",
    "estimated_time_seconds": 900,
    "verification_required": "sms_notify"
  }
}
```

**Error Response:**
```json
{
  "error": "Failed to process message",
  "message": "Detailed error message"
}
```

---

### Get Conversation History

#### GET `/api/conversation/history?limit=50`

Retrieve recent conversation history.

**Query Parameters:**
- `limit` (optional): Number of conversations to return (default: 50)

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "uuid",
      "timestamp": "2025-01-02T10:30:00.000Z",
      "userMessage": "Export my ChatGPT chats",
      "agentResponse": "I'll help you with that...",
      "model": "claude-sonnet-4",
      "category": "browser_automation"
    }
  ]
}
```

---

### Search Conversations

#### POST `/api/conversation/search`

Search past conversations by semantic similarity.

**Request Body:**
```json
{
  "query": "GCP deployment issues from last month",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid",
      "timestamp": "2024-12-15T08:20:00.000Z",
      "userMessage": "Help me deploy to GCP",
      "agentResponse": "Let's troubleshoot the deployment...",
      "similarity": 0.87
    }
  ]
}
```

---

### Get Context Summary

#### GET `/api/conversation/summary`

Get overview of stored context and memory.

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalConversations": 1234,
    "totalMemories": 567,
    "activeProjects": 3,
    "projects": [
      {
        "name": "Personal AGI",
        "status": "active",
        "lastUpdated": "2025-01-02T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Memory Endpoints

### Save Memory

#### POST `/api/memory/save`

Save a memory node to long-term storage.

**Request Body:**
```json
{
  "content": "Remember that GCP deployments require 'roles/run.admin' permission",
  "category": "technical",
  "tags": ["gcp", "deployment", "permissions"],
  "importance": 8,
  "metadata": {
    "source": "manual",
    "project": "personal-agi"
  }
}
```

**Response:**
```json
{
  "success": true,
  "memory": {
    "id": "uuid",
    "content": "Remember that GCP deployments...",
    "category": "technical",
    "tags": ["gcp", "deployment", "permissions"],
    "importance": 8,
    "created_at": "2025-01-02T10:30:00.000Z"
  }
}
```

---

### Search Memories

#### POST `/api/memory/search`

Search memories by semantic similarity.

**Request Body:**
```json
{
  "query": "GCP permission problems",
  "limit": 10,
  "category": "technical"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid",
      "content": "GCP deployments require 'roles/run.admin'...",
      "category": "technical",
      "tags": ["gcp", "deployment"],
      "importance": 8,
      "createdAt": "2025-01-01T12:00:00.000Z",
      "similarity": 0.92
    }
  ]
}
```

---

### Get Memories by Tags

#### POST `/api/memory/tags`

Retrieve memories matching specific tags.

**Request Body:**
```json
{
  "tags": ["gcp", "deployment"]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid",
      "content": "Memory content...",
      "tags": ["gcp", "deployment"],
      "created_at": "2025-01-01T12:00:00.000Z"
    }
  ]
}
```

---

### Import Data

#### POST `/api/memory/import`

Import data from external sources (iOS Reminders, etc.)

**Request Body:**
```json
{
  "data": [
    {
      "title": "Fix GCP permissions",
      "content": "Need to add roles/run.admin",
      "category": "technical",
      "tags": ["gcp"],
      "importance": 7
    }
  ],
  "source": "ios_reminders"
}
```

**Response:**
```json
{
  "success": true,
  "imported": 15,
  "message": "Imported 15 items from ios_reminders"
}
```

---

## Task Endpoints

### Create Task

#### POST `/api/tasks/create`

Create a new task for the AGI to execute.

**Request Body:**
```json
{
  "description": "Export ChatGPT chats as PDFs",
  "priority": 7,
  "verificationRequired": true,
  "metadata": {
    "platform": "chatgpt",
    "outputFormat": "pdf"
  }
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "id": "uuid",
    "description": "Export ChatGPT chats as PDFs",
    "status": "pending",
    "priority": 7,
    "created_at": "2025-01-02T10:30:00.000Z"
  }
}
```

---

### List Active Tasks

#### GET `/api/tasks/list`

Get all active (pending or in-progress) tasks.

**Response:**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "uuid",
      "description": "Export ChatGPT chats",
      "status": "in_progress",
      "priority": 7,
      "created_at": "2025-01-02T10:30:00.000Z",
      "started_at": "2025-01-02T10:31:00.000Z"
    }
  ]
}
```

---

### Execute Task

#### POST `/api/tasks/execute`

Execute a specific task.

**Request Body:**
```json
{
  "taskId": "uuid",
  "taskType": "chatgpt_export",
  "params": {
    "outputDir": "/tmp/exports"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "exportedChats": [
      {
        "title": "AI Conversation",
        "path": "/tmp/exports/ai_conversation.pdf",
        "index": 1
      }
    ],
    "totalChats": 25
  }
}
```

---

## Verification Endpoints

### SMS Webhook

#### POST `/api/verification/sms-webhook`

Twilio webhook for incoming SMS messages.

**Request Body (from Twilio):**
```
From=+1234567890
Body=STOP
```

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Action cancelled</Message>
</Response>
```

---

### Approve Verification

#### POST `/api/verification/approve`

Manually approve a pending verification.

**Request Body:**
```json
{
  "verificationId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification approved"
}
```

---

### Reject Verification

#### POST `/api/verification/reject`

Manually reject a pending verification.

**Request Body:**
```json
{
  "verificationId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification rejected"
}
```

---

### Verify Code

#### POST `/api/verification/verify-code`

Verify an SMS confirmation code.

**Request Body:**
```json
{
  "verificationId": "uuid",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification approved"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (missing parameters) |
| 401 | Unauthorized (not implemented in MVP) |
| 500 | Internal Server Error |

## Rate Limiting

Currently not implemented in MVP. For production, implement rate limiting based on your needs.

## WebSockets (Future)

Real-time streaming responses will be available via WebSockets in a future release:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.send(JSON.stringify({
  type: 'chat',
  message: 'Hello AGI'
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.chunk); // Streaming response
};
```

## Examples

### Complete Workflow Example

```javascript
// 1. Send a complex request
const response = await fetch('http://localhost:3000/api/conversation/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Research AI agent frameworks and create a comparison doc'
  })
});

const data = await response.json();
console.log(data.taskAnalysis); // See how AGI will approach this

// 2. Check active tasks
const tasks = await fetch('http://localhost:3000/api/tasks/list');
const taskData = await tasks.json();
console.log(taskData.tasks); // Monitor progress

// 3. Search for related memories
const memories = await fetch('http://localhost:3000/api/memory/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'AI agent frameworks',
    limit: 5
  })
});

const memoryData = await memories.json();
console.log(memoryData.results); // See what AGI already knows
```

---

For more examples, see the [README](../README.md) and frontend implementation in `/frontend/chat-interface/app.js`.
