# Personal Automation Agent

## Overview
Multi-mode personal automation agent for intelligent task management, workflow automation, and productivity enhancement.

## Modes

### 1. Task Manager Mode
- Smart task creation and organization
- Priority-based scheduling
- Deadline tracking and reminders
- Dependency management
- Progress tracking

### 2. Workflow Automation Mode
- Custom workflow creation
- Trigger-based actions
- Multi-step automation
- Integration with external services
- Template library

### 3. Personal Assistant Mode
- Natural language processing
- Context-aware suggestions
- Proactive task recommendations
- Learning user preferences
- Intelligent scheduling

### 4. Data Processing Mode
- File organization
- Data extraction and transformation
- Report generation
- Batch processing
- Archive management

## Features
- Multi-mode operation with seamless switching
- Voice command support
- Mobile and desktop apps
- Cloud sync across devices
- Customizable automation rules
- Integration with popular services (Gmail, Calendar, Slack, etc.)
- Privacy-focused (local-first architecture)

## Tech Stack
- Backend: Python/FastAPI
- Frontend: React/TypeScript
- Mobile: React Native
- AI: Claude API
- Database: SQLite (local), PostgreSQL (cloud)
- Sync: WebSocket + REST API

## Status
🚧 **In Development**

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- SQLite 3

### Installation

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Configuration
Set up your `.env` file with:
- `ANTHROPIC_API_KEY`: Claude API key
- `DATABASE_URL`: Database connection string
- `SECRET_KEY`: Application secret key

## Usage

### CLI Mode
```bash
# Create task
automation-agent task create "Buy groceries" --priority high

# Run workflow
automation-agent workflow run daily-backup

# Switch mode
automation-agent mode assistant
```

### API Mode
```bash
# Start server
python main.py

# Access at http://localhost:8000
```

## Architecture
```
personal-automation-agent/
├── backend/
│   ├── modes/
│   ├── agents/
│   ├── workflows/
│   └── api/
├── frontend/
│   ├── src/
│   └── public/
└── mobile/
```

## Documentation
See `docs/` for comprehensive guides and API documentation.
