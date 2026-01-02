# Agent Control

AI Agent Swarm Control Center - A ruthless autonomous agent orchestration platform.

## Features

- **AI Agent Management**: Create and configure autonomous AI agents with specific roles and goals
- **Mission Control**: Define complex missions with natural language instructions
- **Automatic Task Planning**: AI automatically breaks down missions into executable steps
- **Real-time Monitoring**: Live logs and status updates for all running missions
- **Browser Automation**: Playwright-powered web automation capabilities
- **Terminal UI**: Sleek hacker-inspired dark interface with green-on-black aesthetic

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- TanStack React Query
- Wouter (routing)
- Tailwind CSS
- Framer Motion

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL
- Drizzle ORM
- OpenAI API
- Playwright

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and OpenAI API key
```

3. Set up the database:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

## Usage

### Creating an Agent

1. Navigate to the "Agents" page
2. Click "New Agent"
3. Fill in:
   - Name (e.g., "Research Agent")
   - Role (e.g., "Senior Researcher")
   - Goal (what this agent does)
   - Backstory (optional, gives context to the AI)

### Creating a Mission

1. Navigate to the "Tasks" page
2. Click "New Mission"
3. Provide a title and description
4. The AI will automatically:
   - Break down the mission into steps
   - Execute each step sequentially
   - Log progress in real-time

### Monitoring Execution

- View all missions on the Tasks page
- Click any mission to see:
  - Generated steps
  - Real-time execution logs
  - Current status and results

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_BASE_URL`: (Optional) Custom OpenAI-compatible endpoint
- `PORT`: Server port (default: 3000)

## Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build for production
- `npm start`: Run production build
- `npm run db:push`: Sync database schema
- `npm run db:studio`: Open Drizzle Studio

## Architecture

The platform uses an event-driven architecture:

1. **Mission Creation**: User creates a mission with a goal
2. **Task Generation**: AI breaks down the mission into steps
3. **Agent Engine**: Polls for pending tasks and executes them
4. **Task Execution**: AI agents execute tasks using GPT models
5. **Logging**: Real-time logs stream to the frontend
6. **Status Updates**: Mission status updates automatically

## License

MIT
