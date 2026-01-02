# Agent Control - Cloud PWA

AI Agent Swarm Control Center - A ruthless autonomous agent orchestration platform.

**🌐 Deploy as PWA | 🤖 Agents work in the cloud | 📱 Install on any device**

## Features

- **Progressive Web App**: Install on phone, tablet, or desktop - works offline
- **Cloud-First Architecture**: All agent processing happens in the cloud
- **Real-time Notifications**: Get notified when missions complete
- **AI Agent Management**: Create and configure autonomous AI agents with specific roles and goals
- **Mission Control**: Define complex missions with natural language instructions
- **Automatic Task Planning**: AI automatically breaks down missions into executable steps
- **Live Monitoring**: Real-time logs and status updates stream to your device
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

## Quick Start - Deploy to Cloud

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed cloud deployment instructions.

**Fastest deploy (Railway):**
```bash
npm install -g @railway/cli
railway login
railway init
railway add --plugin postgresql
railway up
```

**Then:**
1. Set `GEMINI_API_KEY` in Railway dashboard (get free key at https://makersuite.google.com/app/apikey)
2. Visit your deployed URL
3. Click "Install" to add to your device
4. Create agents and missions - they run in the cloud FREE!

## Local Development

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
# Edit .env with your database URL and Gemini API key
# Get free Gemini key: https://makersuite.google.com/app/apikey
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

## PWA Installation

### On Mobile (iOS/Android)
1. Visit your deployed URL in Safari/Chrome
2. Tap the "Share" button (iOS) or menu (Android)
3. Select "Add to Home Screen"
4. The app installs like a native app!

### On Desktop
1. Visit your deployed URL in Chrome/Edge
2. Click the install icon in address bar
3. Or click "Install" button in the app
4. App opens in its own window

### PWA Benefits
- ✅ **Offline Access**: View cached missions and data
- ✅ **Push Notifications**: Get alerted when missions complete
- ✅ **Background Sync**: Auto-updates when online
- ✅ **Native Feel**: Runs in standalone window
- ✅ **No App Store**: Direct install from web

## How It Works

1. **You create a mission** (e.g., "Research competitors and create a report")
2. **AI plans the execution** - breaks it into 5-8 steps automatically
3. **Agents work in the cloud** - executing each step using GPT models
4. **You get notified** - real-time updates via SSE and notifications
5. **Results delivered** - view detailed logs and outputs

All heavy lifting happens in the cloud. Your device just displays results.

## Architecture

```
┌─────────────┐
│   PWA UI    │ ← Installed on user's device
│  (React)    │ ← Lightweight, offline-capable
└──────┬──────┘
       │ HTTPS/SSE
       │
┌──────▼──────────────────┐
│   Cloud Server          │
│  ┌──────────────────┐   │
│  │  Express API     │   │ ← RESTful + SSE
│  └────────┬─────────┘   │
│           │             │
│  ┌────────▼─────────┐   │
│  │  Agent Engine    │   │ ← Autonomous execution
│  │  • Task planning │   │
│  │  • AI execution  │   │
│  │  • Notifications │   │
│  └────────┬─────────┘   │
│           │             │
│  ┌────────▼─────────┐   │
│  │  PostgreSQL      │   │ ← Mission data
│  └──────────────────┘   │
└─────────────────────────┘
```

## Cost Estimate (Monthly)

**With Gemini (Recommended)**:
- **Hosting**: $5-7 (Railway/Render)
- **Database**: Included in hosting
- **Gemini API**: FREE (generous free tier)
- **Total**: ~$5-7/month for unlimited missions! 🎉

**With OpenAI**:
- **Hosting**: $5-7 (Railway/Render)
- **Database**: Included in hosting
- **OpenAI API**: ~$2-10 (depends on usage)
- **Total**: ~$10-20/month

## License

MIT
