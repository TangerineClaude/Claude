# 🤖 Personal AGI MVP

Your digital extension - a cloud-based personal AGI with full context, memory, and autonomous capabilities.

## 🌟 Overview

This is not a task-specific chatbot. This is a personal digital twin that:

- **Maintains complete context** and memory across all interactions
- **Operates autonomously** across all platforms (browser, APIs, cloud services)
- **Never refuses** legitimate requests involving credentials or sensitive operations (with proper verification)
- **Always available** - runs 24/7 in the cloud
- **Platform agnostic** - if a human can do it, the agent can do it

## ✨ Features

### Core Capabilities

- ✅ **Conversational Interface** - Natural language chat like talking to Claude
- ✅ **Persistent Memory** - Store and retrieve context across years
- ✅ **Multi-Model Router** - Auto-select between Claude, Gemini, and OpenAI
- ✅ **Browser Automation** - Navigate websites, login, extract data
- ✅ **SMS Verification** - Security checkpoints for sensitive operations
- ✅ **Secure Credential Storage** - Encrypted platform credentials
- ✅ **Task Orchestration** - Break down and execute complex multi-step tasks
- ✅ **Semantic Search** - Find past conversations and memories by meaning
- ✅ **Cost Tracking** - Monitor API usage and costs across models

### Supported Integrations

- **ChatGPT** - Export chats, interact with custom GPTs
- **Google Cloud Platform** - Deploy applications, manage resources
- **Generic Browser Automation** - Any website accessible via Playwright
- **More coming** - Extensible architecture for new platforms

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (with pgvector extension)
- Redis (optional, for task queue)
- API Keys:
  - Anthropic Claude API
  - Google Gemini API (recommended for cost savings)
  - OpenAI API (optional)
  - Twilio (for SMS verification)

### Option 1: Local Development

1. **Clone and install dependencies:**
   ```bash
   cd personal-agi
   npm install
   npm run playwright:install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and credentials
   ```

3. **Set up database:**
   ```bash
   # Create PostgreSQL database
   createdb personal_agi

   # Run schema
   npm run db:setup
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   ```
   http://localhost:3000
   ```

### Option 2: Docker

1. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

2. **Start with Docker Compose:**
   ```bash
   npm run docker:up
   ```

3. **Access the application:**
   ```
   http://localhost:3000
   ```

### Option 3: Google Cloud Platform

1. **Run setup script:**
   ```bash
   npm run gcp:setup
   ```

2. **Follow prompts to:**
   - Configure GCP project
   - Create Cloud SQL database
   - Set up secrets
   - Deploy to Cloud Run

3. **Access your deployed AGI** at the provided URL

## 📖 Usage Guide

### Basic Chat

Simply type your message in the chat interface:

```
You: "Export my ChatGPT chats as PDFs"

AGI: "I'll log into your ChatGPT account and export all chats as PDFs.
This will take about 15-20 minutes. I'm sending you an SMS - you have
30 seconds to cancel if needed. Otherwise I'll proceed."
```

### Memory and Context

The AGI automatically stores everything:

```
You: "What were those GCP permission issues from last month?"

AGI: "You had issues with Cloud Run deployment failing due to missing
'roles/run.admin' permissions. We resolved it by adding the role to
your service account..."
```

### Model Selection

By default, the AGI auto-selects the best model for each task:

- **Browser automation** → Gemini 2.0 Flash (fast, cheap)
- **Complex reasoning** → Claude Sonnet 4 (best quality)
- **Code generation** → Gemini 2.5 Pro or Claude
- **Deployments** → Claude Sonnet 4 (better at DevOps)

You can override this in the UI or by saying:
```
You: "Use Claude for this - analyze my codebase architecture"
```

### Verification System

Different actions require different verification levels:

| Action Type | Verification |
|------------|-------------|
| Reading data | None |
| Web browsing | None |
| Credential usage | SMS notification (30s to cancel) |
| Deployments | SMS notification (async) |
| Financial transactions | NFC + SMS confirmation |
| Account creation | NFC verification |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Web Chat    │  │  SMS/Voice   │  │  Mobile App  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Core AGI Engine                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Conversation │  │    Memory    │  │    Model     │     │
│  │  Manager     │  │    System    │  │   Router     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     Task     │  │ Verification │  │  Credential  │     │
│  │ Orchestrator │  │   Manager    │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Tool Ecosystem                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Browser    │  │     GCP      │  │     SMS      │     │
│  │  Automation  │  │     APIs     │  │   (Twilio)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │     Redis    │  │   Cloud VM   │     │
│  │  (+ vector)  │  │              │  │  (GCP/AWS)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ Project Structure

```
personal-agi/
├── backend/
│   ├── server.js              # Main Express server
│   ├── agents/
│   │   ├── claude_agent.js    # Claude API wrapper
│   │   ├── browser_agent.js   # Playwright automation
│   │   └── model_router.js    # Multi-model selection
│   ├── memory/
│   │   ├── database.js        # PostgreSQL connection
│   │   └── context_manager.js # Memory & context
│   ├── security/
│   │   ├── credentials.js     # Encrypted storage
│   │   └── verification.js    # SMS/NFC verification
│   └── routes/
│       ├── conversation.js    # Chat endpoints
│       ├── memory.js          # Memory endpoints
│       ├── tasks.js           # Task endpoints
│       └── verification.js    # Verification webhooks
├── frontend/
│   └── chat-interface/
│       ├── index.html         # Web UI
│       ├── styles.css         # Styling
│       └── app.js             # Frontend logic
├── infrastructure/
│   ├── database-schema.sql    # PostgreSQL schema
│   ├── Dockerfile             # Container image
│   ├── docker-compose.yml     # Local development
│   ├── cloudbuild.yaml        # GCP deployment
│   └── gcp-setup.sh           # Setup script
└── docs/
    └── API.md                 # API documentation
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following:

```bash
# AI Models
CLAUDE_API_KEY=your_claude_api_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/personal_agi
REDIS_URL=redis://localhost:6379

# Communication
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
USER_PHONE_NUMBER=+1234567890

# Security
ENCRYPTION_KEY=your_32_char_encryption_key
JWT_SECRET=your_jwt_secret

# Server
PORT=3000
NODE_ENV=development
```

### Database Setup

The system uses PostgreSQL with the pgvector extension for semantic search:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Run full schema
psql $DATABASE_URL -f infrastructure/database-schema.sql
```

## 📡 API Endpoints

### Conversation

- `POST /api/conversation/chat` - Send message to AGI
- `GET /api/conversation/history` - Get conversation history
- `POST /api/conversation/search` - Search conversations
- `GET /api/conversation/summary` - Get context summary

### Memory

- `POST /api/memory/save` - Save a memory
- `POST /api/memory/search` - Search memories
- `POST /api/memory/tags` - Get memories by tags
- `POST /api/memory/import` - Import data (iOS Reminders, etc.)

### Tasks

- `POST /api/tasks/create` - Create a task
- `GET /api/tasks/list` - List active tasks
- `POST /api/tasks/execute` - Execute a task

### Verification

- `POST /api/verification/sms-webhook` - Twilio webhook
- `POST /api/verification/approve` - Approve verification
- `POST /api/verification/reject` - Reject verification

## 🔐 Security

### Credential Storage

All credentials are encrypted using AES-256-CBC before storage:

```javascript
// Save credentials
await CredentialManager.saveCredentials('chatgpt', {
  email: 'user@example.com',
  password: 'secure_password'
});

// Retrieve credentials (auto-decrypted)
const creds = await CredentialManager.getCredentials('chatgpt');
```

### Verification Protocol

1. **None** - Reading operations, browsing
2. **SMS Notify** - Credential usage, deployments (30s to cancel)
3. **SMS Confirm** - Account creation, CAPTCHA solving
4. **NFC Required** - Financial transactions

## 💰 Cost Management

The Model Router automatically optimizes costs:

```javascript
// Gemini 2.0 Flash: $0.10 per 1M input tokens
// Claude Sonnet 4: $3.00 per 1M input tokens

// For browser automation:
Browser task → Gemini 2.0 Flash ✅ (20x cheaper)

// For complex reasoning:
Architecture design → Claude Sonnet 4 ✅ (best quality)
```

Track usage via the dashboard or API:

```bash
curl http://localhost:3000/api/conversation/summary
```

## 🧪 Testing

### Test Browser Automation

```bash
# Test ChatGPT login
curl -X POST http://localhost:3000/api/tasks/execute \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test-123",
    "taskType": "chatgpt_export",
    "params": {
      "outputDir": "/tmp/exports"
    }
  }'
```

### Test Memory Search

```bash
# Search memories
curl -X POST http://localhost:3000/api/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "GCP deployment issues",
    "limit": 5
  }'
```

## 📚 Roadmap

### MVP (Current)
- ✅ Chat interface
- ✅ Memory system
- ✅ Model router
- ✅ Browser automation (ChatGPT)
- ✅ SMS verification
- ✅ GCP deployment

### Phase 2 (Next)
- ⬜ NFC verification
- ⬜ Voice interface
- ⬜ Mobile app
- ⬜ More platform integrations (GitHub, Replit, etc.)
- ⬜ Proactive suggestions
- ⬜ Advanced task scheduling

### Phase 3 (Future)
- ⬜ Multi-user support
- ⬜ Learning from outcomes
- ⬜ Integration marketplace
- ⬜ Advanced analytics

## 🤝 Contributing

This is a personal project, but contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: Report bugs or request features via GitHub Issues
- **Documentation**: See `/docs` folder for detailed guides
- **Community**: Join discussions on Discord (link coming soon)

## 🙏 Acknowledgments

Built with:
- [Claude](https://www.anthropic.com/) - Primary reasoning engine
- [Gemini](https://deepmind.google/technologies/gemini/) - Cost-effective operations
- [Playwright](https://playwright.dev/) - Browser automation
- [PostgreSQL](https://www.postgresql.org/) - Database
- [pgvector](https://github.com/pgvector/pgvector) - Vector search
- [Twilio](https://www.twilio.com/) - SMS verification

---

**Built with ❤️ by TangerineClaude**

*Your digital extension is ready. Let's build the future together.*
