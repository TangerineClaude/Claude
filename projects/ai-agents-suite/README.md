# AI Agents Suite

## Overview
Collection of specialized AI agents for automation, banking operations, customer service, and intelligent chat applications.

## Agents

### 1. Banking Agent
- Account inquiry automation
- Transaction processing
- Fraud detection alerts
- Customer support for banking queries
- Compliance and regulatory reporting

### 2. Customer Service Agent
- Multi-channel support (chat, email, phone)
- Ticket routing and prioritization
- Sentiment analysis
- Automated responses for common queries
- Escalation management

### 3. Automation Agent
- Workflow automation
- Data processing and transformation
- Scheduled task execution
- API integration orchestration
- Report generation

### 4. Chat Agent
- Conversational AI
- Context-aware responses
- Multi-language support
- Integration with messaging platforms
- Custom knowledge base

## Tech Stack
- Backend: Python 3.9+
- AI: Claude API, OpenAI API
- Framework: LangChain
- Database: PostgreSQL
- Queue: Celery/Redis
- API: FastAPI

## Status
🚧 **In Development**

## Getting Started

### Prerequisites
- Python 3.9+
- PostgreSQL 14+
- Redis 7+

### Installation
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

### Configuration
Set up your `.env` file with:
- `ANTHROPIC_API_KEY`: Claude API key
- `OPENAI_API_KEY`: OpenAI API key (optional)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection URL

### Running Agents
```bash
# Start all agents
python run_agents.py

# Start specific agent
python -m agents.banking_agent
```

## Agent Architecture
```
agents/
├── banking_agent/
├── customer_service_agent/
├── automation_agent/
└── chat_agent/
```

## Documentation
See `docs/` for detailed agent documentation and integration guides.
