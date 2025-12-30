# Personal Gemini Assistant PWA

## Overview
Progressive Web App powered by Google's Gemini AI for personal assistance, productivity enhancement, and intelligent task management.

## Features
- Natural language task management
- Smart scheduling and reminders
- Email and calendar integration
- Voice interaction support
- Offline functionality (PWA)
- Multi-device sync
- Context-aware suggestions
- Personal knowledge base
- Custom automation workflows

## Tech Stack
- Frontend: React/TypeScript with PWA capabilities
- AI: Google Gemini API
- Storage: IndexedDB for offline data
- Sync: Firebase/Supabase
- Voice: Web Speech API
- Build: Vite

## Status
🚧 **In Development**

## Getting Started

### Prerequisites
- Node.js 18+
- Google Cloud Project with Gemini API enabled
- Firebase/Supabase account (for sync)

### Installation
```bash
npm install
cp .env.example .env
npm run dev
```

### Configuration
Set up your `.env` file with:
- `VITE_GEMINI_API_KEY`: Your Gemini API key
- `VITE_FIREBASE_CONFIG`: Firebase configuration

### Build for Production
```bash
npm run build
npm run preview
```

## PWA Features
- Install as standalone app
- Offline task management
- Background sync
- Push notifications
- Service worker caching

## Documentation
See `docs/` for detailed API documentation and user guides.
