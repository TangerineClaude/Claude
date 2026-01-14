# 🚀 Quick Start Guide

Get your Personal AGI running in under 10 minutes.

## Prerequisites Check

Before you start, make sure you have:

- [ ] Node.js 20+ installed (`node --version`)
- [ ] PostgreSQL 15+ installed (`psql --version`)
- [ ] Claude API key (from https://console.anthropic.com/)
- [ ] Gemini API key (from https://aistudio.google.com/app/apikey)
- [ ] Twilio account (for SMS - can skip for initial testing)

## 3-Step Setup

### Step 1: Install Dependencies

```bash
# Navigate to project
cd personal-agi

# Install Node packages
npm install

# Install Playwright browsers
npm run playwright:install
```

### Step 2: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env file with your details
nano .env
```

**Minimum required configuration:**

```bash
# Required for basic functionality
CLAUDE_API_KEY=sk-ant-xxxxx
GEMINI_API_KEY=xxxxx
DATABASE_URL=postgresql://postgres:password@localhost:5432/personal_agi

# Optional for MVP testing (can skip initially)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
USER_PHONE_NUMBER=+1234567890

# Auto-generated if not provided
ENCRYPTION_KEY=your_random_32_character_key_here
```

### Step 3: Set Up Database

```bash
# Create database
createdb personal_agi

# Or using psql
psql -U postgres -c "CREATE DATABASE personal_agi;"

# Run schema
npm run db:setup
```

**If you don't have PostgreSQL installed:**

Use Docker instead:

```bash
# Start all services with Docker Compose
npm run docker:up

# Database will be automatically set up
```

## Start the Server

### Option A: Local Development

```bash
npm run dev
```

### Option B: Docker

```bash
npm run docker:up
```

### Option C: Production Mode

```bash
npm start
```

## Access Your AGI

Open your browser and go to:

```
http://localhost:3000
```

You should see the chat interface! 🎉

## First Steps

### 1. Test Basic Chat

Type in the chat:
```
Hello! What can you help me with?
```

The AGI should respond with its capabilities.

### 2. Test Memory

Save a memory:
```
Remember that my favorite programming language is TypeScript
```

Later, ask:
```
What's my favorite programming language?
```

### 3. Test Model Selection

The AGI auto-selects models. Try:
```
Tell me about Claude (use Claude for this)
```

## Common Issues

### ❌ Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Make sure PostgreSQL is running: `sudo service postgresql start`
- Check DATABASE_URL in `.env` matches your PostgreSQL setup

### ❌ Missing API Key

```
Error: CLAUDE_API_KEY not configured
```

**Solution:**
- Get API key from https://console.anthropic.com/
- Add to `.env` file: `CLAUDE_API_KEY=sk-ant-xxxxx`

### ❌ Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
- Kill existing process: `lsof -ti:3000 | xargs kill -9`
- Or change port in `.env`: `PORT=3001`

### ❌ Playwright Browser Not Found

```
Error: Executable doesn't exist at /path/to/chromium
```

**Solution:**
```bash
npm run playwright:install
```

## Next Steps

### Configure Credentials

To use browser automation (e.g., ChatGPT export):

1. Navigate to settings (coming soon in UI)
2. Or use API:

```bash
curl -X POST http://localhost:3000/api/credentials/save \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "chatgpt",
    "credentials": {
      "email": "your@email.com",
      "password": "your_password"
    }
  }'
```

### Set Up SMS Verification

1. Sign up for Twilio: https://www.twilio.com/try-twilio
2. Get phone number and credentials
3. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_PHONE_NUMBER=+1234567890
   USER_PHONE_NUMBER=+1234567890
   ```
4. Configure webhook in Twilio dashboard:
   ```
   URL: http://your-domain.com/api/verification/sms-webhook
   Method: POST
   ```

### Deploy to Cloud

For always-on access, deploy to Google Cloud:

```bash
npm run gcp:setup
```

Follow the prompts to deploy to Cloud Run.

## Testing Features

### Test Memory System

```bash
# Save a memory
curl -X POST http://localhost:3000/api/memory/save \
  -H "Content-Type: application/json" \
  -d '{
    "content": "GCP deployments require roles/run.admin permission",
    "category": "technical",
    "tags": ["gcp", "deployment"]
  }'

# Search memories
curl -X POST http://localhost:3000/api/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "GCP permissions",
    "limit": 5
  }'
```

### Test Model Router

The AGI automatically selects the best model, but you can override:

```javascript
// Auto-select (recommended)
fetch('http://localhost:3000/api/conversation/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Your question here'
  })
});

// Force specific model
fetch('http://localhost:3000/api/conversation/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Your question here',
    options: { model: 'claude-sonnet-4' }
  })
});
```

### Test Browser Automation

**Note:** Requires ChatGPT credentials saved first.

```javascript
// Create task
const response = await fetch('http://localhost:3000/api/tasks/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: 'Export ChatGPT chats as PDFs',
    priority: 7
  })
});

const task = await response.json();

// Execute task
await fetch('http://localhost:3000/api/tasks/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskId: task.task.id,
    taskType: 'chatgpt_export',
    params: { outputDir: '/tmp/chatgpt-exports' }
  })
});
```

## Development Tips

### View Logs

```bash
# Local development
# Logs appear in console

# Docker
npm run docker:logs

# Follow logs
npm run docker:logs -f
```

### Database Management

```bash
# Connect to database
psql $DATABASE_URL

# View tables
\dt

# View conversations
SELECT * FROM conversations ORDER BY timestamp DESC LIMIT 10;

# View memories
SELECT * FROM memory_nodes ORDER BY created_at DESC LIMIT 10;
```

### Reset Database

```bash
# Drop and recreate
dropdb personal_agi
createdb personal_agi
npm run db:setup
```

## Performance Optimization

### Enable Redis (Optional)

For better performance with task queuing:

```bash
# Install Redis
# macOS: brew install redis
# Ubuntu: sudo apt-get install redis-server

# Start Redis
redis-server

# Update .env
REDIS_URL=redis://localhost:6379
```

### Database Optimization

After importing lots of data:

```sql
-- Rebuild indexes
REINDEX DATABASE personal_agi;

-- Analyze tables
ANALYZE conversations;
ANALYZE memory_nodes;

-- Vacuum
VACUUM ANALYZE;
```

## Getting Help

- **Documentation**: See `/docs` folder
- **API Reference**: `/docs/API.md`
- **Issues**: GitHub Issues
- **Architecture**: See README.md

## You're Ready! 🎉

Your Personal AGI is now running. Try asking it:

- "What can you help me with?"
- "Remember that I prefer dark mode"
- "Search my memories for technical issues"
- "Export my ChatGPT chats" (requires credentials)

Enjoy your digital extension! 🤖
