# Memory Mind - Personal Knowledge Base

## Overview
Persistent personal knowledge base that captures and recalls facts across all apps: people, commitments, receipts, notes, and contextual information.

## Outcome
Never forget important details again. Memory Mind learns from your interactions, automatically captures key information, and surfaces relevant memories when you need them.

## MVP Features

### Core Functionality
- **Entity Recognition**: Automatically detect people, places, organizations, dates, commitments
- **Knowledge Graph**: Interconnected facts and relationships
- **Smart Search**: Natural language queries ("When did I last talk to Sarah?")
- **Auto-Capture**: Extract information from emails, messages, calendars
- **Manual Entry**: Add facts via chat interface
- **Context Surfacing**: Proactively show relevant memories
- **Timeline View**: See all interactions with a person or about a topic
- **Reminders**: Set commitments and follow-ups

### Privacy & Security
- Local-first architecture (sync optional)
- End-to-end encryption
- Zero knowledge architecture
- No data used for model training
- User owns all data

## Tech Stack

### Frontend
- **Web App**: React/TypeScript with Next.js
- **Mobile**: React Native
- **Desktop**: Electron

### Backend
- **API**: Python/FastAPI
- **Database**: PostgreSQL + PostGIS
- **Vector Store**: Qdrant or Weaviate for semantic search
- **Graph DB**: Neo4j (optional) for relationship mapping
- **Cache**: Redis

### AI/ML
- **NER**: Claude API or spaCy for entity extraction
- **Embeddings**: OpenAI embeddings or sentence-transformers
- **Semantic Search**: Vector similarity search
- **Summarization**: Claude API

### Integrations
- **Email**: Gmail/Outlook API for auto-capture
- **Calendar**: Google/Microsoft Calendar
- **Notes**: Notion, Evernote, Apple Notes (via export)
- **Messaging**: WhatsApp, Telegram (via export)

## Architecture

```
┌─────────────────┐
│   Client Apps   │
│ (Web/Mobile/CLI)│
└────────┬────────┘
         │
    ┌────▼─────┐
    │   API    │
    │ (FastAPI)│
    └────┬─────┘
         │
    ┌────▼──────────────────────┐
    │                           │
┌───▼────┐  ┌──────┐  ┌────────▼─┐
│ Vector │  │ Graph│  │Postgres  │
│ Store  │  │  DB  │  │(Metadata)│
└───┬────┘  └───┬──┘  └────┬─────┘
    │           │           │
    └───────┬───┴──────┬────┘
            │          │
       ┌────▼────┐ ┌──▼─────┐
       │ Claude  │ │ Email/ │
       │   API   │ │Calendar│
       └─────────┘ └────────┘
```

## Getting Started

### Prerequisites
- Python 3.9+
- PostgreSQL 14+
- Redis 7+
- Qdrant (vector store)
- Node.js 18+ (for web client)

### Installation

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Database setup
python manage.py migrate

# Start services
docker-compose up -d  # Postgres, Redis, Qdrant
python main.py

# Frontend
cd ../frontend
npm install
npm run dev
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/memory_mind
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333

# AI
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key  # for embeddings

# Integrations
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Features
ENABLE_AUTO_CAPTURE=true
ENABLE_EMAIL_INTEGRATION=true
ENABLE_CALENDAR_INTEGRATION=true
```

## API Endpoints

### Memories
- `POST /api/memories` - Create memory manually
- `GET /api/memories` - Search memories
- `GET /api/memories/:id` - Get memory details
- `PUT /api/memories/:id` - Update memory
- `DELETE /api/memories/:id` - Delete memory

### Entities
- `GET /api/entities/people` - List people
- `GET /api/entities/:id` - Get entity details
- `GET /api/entities/:id/timeline` - Get entity timeline
- `POST /api/entities/:id/note` - Add note to entity

### Search
- `POST /api/search/semantic` - Semantic search
- `POST /api/search/exact` - Exact keyword search
- `POST /api/search/ask` - Natural language question

### Integrations
- `POST /api/integrations/email/connect` - Connect email
- `POST /api/integrations/email/sync` - Sync emails
- `POST /api/integrations/calendar/connect` - Connect calendar
- `GET /api/integrations/status` - Integration status

### Chat
- `POST /api/chat` - Chat interface for adding/querying memories

## Database Schema

```sql
-- Memories
CREATE TABLE memories (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  source VARCHAR(50),  -- manual, email, calendar, chat
  source_id VARCHAR(255),  -- external source ID
  created_at TIMESTAMP DEFAULT NOW(),
  occurred_at TIMESTAMP,
  embedding VECTOR(1536),  -- for semantic search
  metadata JSONB
);

-- Entities
CREATE TABLE entities (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50),  -- person, organization, place, event
  name VARCHAR(255) NOT NULL,
  attributes JSONB,  -- email, phone, address, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Relationships
CREATE TABLE relationships (
  id UUID PRIMARY KEY,
  memory_id UUID REFERENCES memories(id),
  entity_id UUID REFERENCES entities(id),
  relationship_type VARCHAR(50),  -- mentioned_in, involves, located_at
  created_at TIMESTAMP DEFAULT NOW()
);

-- Commitments
CREATE TABLE commitments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_id UUID REFERENCES memories(id),
  description TEXT,
  due_date DATE,
  status VARCHAR(20),  -- pending, completed, cancelled
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Features

### 1. Auto-Capture from Email
```python
# Example: Extract entities from email
email = fetch_email("msg-123")
memories = extract_memories(email.content)

# Creates:
# - Memory: "Meeting with John about Q1 budget on March 15"
# - Entity: Person(name="John", email="john@company.com")
# - Commitment: "Prepare budget slides by March 14"
```

### 2. Natural Language Search
```python
# Example queries:
"When did I last talk to Sarah?"
"What commitments do I have this week?"
"Where did I meet John?"
"What restaurants has Alice recommended?"
"Show me all conversations about the Python project"
```

### 3. Knowledge Graph
```
    [You]
     / | \
    /  |  \
[Sarah] [John] [Project X]
   |      |        |
[Coffee] [Meeting] [Deadline: May 1]
   |
[Blue Bottle - Recommended by Sarah]
```

### 4. Timeline View
```python
# Example: Timeline for entity "Sarah"
timeline = get_entity_timeline("sarah-entity-id")

# Returns:
# [
#   { date: "2024-12-15", event: "Coffee chat at Blue Bottle" },
#   { date: "2024-11-20", event: "Recommended book: Atomic Habits" },
#   { date: "2024-10-05", event: "Met at conference" }
# ]
```

### 5. Smart Reminders
- Commitment deadlines
- Follow-up reminders ("You said you'd call John this week")
- Context-based ("Sarah mentioned she'd be in town this month")
- Recurring patterns ("You usually review finances on the 1st")

## Entity Types

### People
- Name, email, phone, social profiles
- Relationships (colleague, friend, family)
- Interaction history
- Notes and preferences

### Organizations
- Company name, industry
- Contacts within organization
- Interaction history
- Notes

### Places
- Name, address, coordinates
- Type (restaurant, office, landmark)
- Associated memories
- Recommendations

### Events
- Date, time, location
- Participants
- Notes and outcomes
- Follow-ups

## Privacy Features

1. **Local-First**: All data stored locally, sync optional
2. **Encryption**: E2E encryption for sync
3. **Zero Knowledge**: Server can't read your data
4. **Data Export**: Export all data as JSON
5. **Selective Sync**: Choose what to sync
6. **Auto-Deletion**: Set retention policies

## Testing

```bash
# Unit tests
pytest tests/unit

# Integration tests
pytest tests/integration

# Entity extraction accuracy
pytest tests/ner_accuracy.py
```

## Deployment

### Self-Hosted
```bash
docker-compose up -d
# Includes: Postgres, Redis, Qdrant, API, Web UI
```

### Cloud
- **Backend**: Google Cloud Run or AWS Fargate
- **Database**: Supabase or AWS RDS
- **Vector Store**: Qdrant Cloud or Pinecone
- **Storage**: S3 or Google Cloud Storage

## Roadmap

### Phase 1 (MVP) - 8 weeks
- [x] Entity extraction (people, dates, places)
- [x] Manual memory creation via chat
- [x] Basic search (keyword + semantic)
- [x] Email integration
- [x] Timeline view
- [x] Web UI

### Phase 2 - 12 weeks
- [ ] Calendar integration
- [ ] Commitment tracking
- [ ] Smart reminders
- [ ] Knowledge graph visualization
- [ ] Mobile apps
- [ ] Voice input

### Phase 3 - 16 weeks
- [ ] Advanced NER (custom entities)
- [ ] Auto-categorization
- [ ] Relationship inference
- [ ] Collaborative memories (shared with family/team)
- [ ] API for third-party apps
- [ ] Browser extension

## Use Cases

1. **Networking**: Remember everyone you meet and context
2. **Projects**: Track all project-related information
3. **Personal CRM**: Maintain relationships
4. **Commitments**: Never forget a promise
5. **Receipts & Warranties**: Store purchase info
6. **Recommendations**: Remember suggestions from friends
7. **Research**: Accumulate knowledge on topics

## License

Proprietary - All rights reserved

---

**Status**: 🚧 In Development
**Target Launch**: Q3 2025
