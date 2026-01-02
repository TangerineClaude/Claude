# Personal Dashboard

## Overview
Your "Today View" - A unified dashboard showing tasks, calendar, finance snapshot, and unread priorities all in one place.

## Outcome
Start every day with complete visibility: what's due, what's happening, what needs attention. Reduce app-switching and context-switching overhead.

## MVP Features

### Widgets
1. **Inbox Zero Widget**: Unread email count, priority messages
2. **Bills Due Widget**: Upcoming bills and payment due dates
3. **Calendar Widget**: Today's meetings and schedule
4. **Top Alerts Widget**: Important notifications across all apps
5. **Tasks Widget**: Today's to-dos and priorities
6. **Finance Snapshot**: Account balances, recent transactions
7. **Weather Widget**: Current conditions and forecast
8. **Quick Actions**: Common tasks (send email, create task, etc.)

### Features
- **Customizable Layout**: Drag-and-drop widget arrangement
- **Dark Mode**: Eye-friendly viewing
- **Refresh Controls**: Manual or auto-refresh
- **Widget Pinning**: Keep important widgets visible
- **Quick Search**: Universal search across all integrations
- **Notifications**: Desktop/mobile push notifications

### Privacy & Security
- OAuth for all integrations
- Minimal data storage (cache only)
- No third-party analytics
- Local-first where possible

## Tech Stack

### Frontend
- **Web**: React/TypeScript with Next.js
- **Mobile**: React Native
- **Desktop**: Electron
- **UI**: TailwindCSS + shadcn/ui

### Backend
- **API**: Node.js/Express or Next.js API routes
- **Cache**: Redis for widget data
- **Database**: PostgreSQL for user preferences
- **Queue**: Bull for background sync

### Integrations
- **Email**: Gmail/Outlook API (via Email Copilot)
- **Finance**: Plaid API (via Finance Copilot)
- **Calendar**: Google/Microsoft Calendar API
- **Tasks**: Todoist, Notion, Apple Reminders
- **Weather**: OpenWeatherMap or Weather.gov

## Architecture

```
┌─────────────────────────────────┐
│      Dashboard Frontend         │
│   (React + Widget System)       │
└────────────┬────────────────────┘
             │
        ┌────▼────┐
        │   API   │
        │ Gateway │
        └────┬────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼─────┐
│ Widget │      │  Redis   │
│ Plugins│      │  Cache   │
└───┬────┘      └──────────┘
    │
┌───▼──────────────────────────┐
│  External Service Connectors │
├──────────────────────────────┤
│ Email │ Finance │ Calendar   │
│ Tasks │ Weather │ News       │
└──────────────────────────────┘
```

## Getting Started

### Prerequisites
- Node.js 18+
- Redis 7+
- OAuth credentials for integrations

### Installation

```bash
cd projects/personal-dashboard
npm install
cp .env.example .env

# Configure OAuth and API keys in .env

# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Start development
npm run dev
```

Open http://localhost:3000

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dashboard
REDIS_URL=redis://localhost:6379

# Email Integration
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
OUTLOOK_CLIENT_ID=your_client_id
OUTLOOK_CLIENT_SECRET=your_client_secret

# Calendar Integration
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret

# Finance Integration
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox

# Weather
OPENWEATHER_API_KEY=your_api_key

# Tasks
TODOIST_CLIENT_ID=your_client_id
TODOIST_CLIENT_SECRET=your_client_secret

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Features
ENABLE_AUTO_REFRESH=true
REFRESH_INTERVAL_MINUTES=15
ENABLE_PUSH_NOTIFICATIONS=true
```

## Widget System

### Widget Interface
```typescript
interface Widget {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large';
  refreshInterval?: number;
  config: Record<string, any>;
}

interface WidgetPlugin {
  id: string;
  name: string;
  description: string;
  defaultSize: 'small' | 'medium' | 'large';
  configSchema: JSONSchema;

  // Lifecycle methods
  fetch: (config: any) => Promise<WidgetData>;
  render: (data: WidgetData) => ReactNode;
}
```

### Built-in Widgets

#### 1. Inbox Zero Widget
```typescript
{
  id: 'inbox-zero',
  name: 'Inbox Zero',
  size: 'medium',
  data: {
    unreadCount: 12,
    priorityMessages: [
      { from: 'john@example.com', subject: 'Q1 Review', preview: '...' }
    ],
    goal: 0,
    progress: 88  // % toward goal
  }
}
```

#### 2. Bills Due Widget
```typescript
{
  id: 'bills-due',
  name: 'Bills Due',
  size: 'medium',
  data: {
    upcomingBills: [
      { name: 'Netflix', amount: 15.99, dueDate: '2025-01-05', status: 'pending' },
      { name: 'Electric', amount: 120.50, dueDate: '2025-01-10', status: 'pending' }
    ],
    totalDue: 136.49
  }
}
```

#### 3. Calendar Widget
```typescript
{
  id: 'calendar-today',
  name: 'Today\'s Calendar',
  size: 'large',
  data: {
    events: [
      { time: '09:00', title: 'Team Standup', duration: 30, location: 'Zoom' },
      { time: '14:00', title: '1:1 with Sarah', duration: 60, location: 'Office' }
    ],
    totalEvents: 2,
    nextEvent: { time: '09:00', title: 'Team Standup' }
  }
}
```

#### 4. Finance Snapshot Widget
```typescript
{
  id: 'finance-snapshot',
  name: 'Finance Snapshot',
  size: 'medium',
  data: {
    totalBalance: 12450.75,
    accounts: [
      { name: 'Checking', balance: 3200.50 },
      { name: 'Savings', balance: 9250.25 }
    ],
    recentTransactions: [
      { date: '2025-01-02', description: 'Grocery Store', amount: -85.32 }
    ]
  }
}
```

#### 5. Tasks Widget
```typescript
{
  id: 'tasks-today',
  name: 'Today\'s Tasks',
  size: 'medium',
  data: {
    tasks: [
      { id: '1', title: 'Review PRs', priority: 'high', completed: false },
      { id: '2', title: 'Prepare slides', priority: 'medium', completed: false }
    ],
    completedCount: 3,
    totalCount: 5
  }
}
```

## API Endpoints

### Dashboard
- `GET /api/dashboard` - Get user dashboard config
- `PUT /api/dashboard` - Update dashboard layout
- `POST /api/dashboard/widget` - Add widget
- `DELETE /api/dashboard/widget/:id` - Remove widget

### Widgets
- `GET /api/widgets/available` - List available widgets
- `GET /api/widgets/:id/data` - Fetch widget data
- `POST /api/widgets/:id/refresh` - Force refresh widget

### Integrations
- `GET /api/integrations` - List connected integrations
- `POST /api/integrations/:type/connect` - Connect integration
- `DELETE /api/integrations/:id` - Disconnect integration
- `GET /api/integrations/:id/status` - Check integration health

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Dashboard Layouts
CREATE TABLE dashboard_layouts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  layout_config JSONB,  -- widget positions and sizes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Widgets
CREATE TABLE widgets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(100),
  title VARCHAR(255),
  config JSONB,
  position INTEGER,
  size VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Widget Cache
CREATE TABLE widget_cache (
  widget_id UUID REFERENCES widgets(id),
  data JSONB,
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  PRIMARY KEY (widget_id)
);

-- Integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50),  -- gmail, calendar, finance, tasks
  credentials JSONB,  -- encrypted OAuth tokens
  status VARCHAR(20),  -- active, error, disconnected
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Features

### 1. Drag-and-Drop Layout
```typescript
// Example: Update widget positions
const onDragEnd = (result) => {
  const { source, destination } = result;

  const newLayout = reorderWidgets(
    widgets,
    source.index,
    destination.index
  );

  await updateDashboardLayout(newLayout);
};
```

### 2. Quick Actions
```typescript
const quickActions = [
  { id: 'send-email', icon: 'mail', label: 'Send Email' },
  { id: 'create-task', icon: 'check', label: 'Create Task' },
  { id: 'new-meeting', icon: 'calendar', label: 'Schedule Meeting' },
  { id: 'pay-bill', icon: 'dollar', label: 'Pay Bill' }
];
```

### 3. Universal Search
```typescript
// Example: Search across all widgets
const results = await search({
  query: 'meeting with John',
  sources: ['calendar', 'email', 'tasks', 'notes']
});
```

### 4. Smart Refresh
```typescript
// Widget refresh strategies:
const refreshStrategies = {
  'inbox-zero': 5 * 60 * 1000,      // 5 minutes
  'calendar-today': 15 * 60 * 1000, // 15 minutes
  'finance-snapshot': 60 * 60 * 1000, // 1 hour
  'weather': 30 * 60 * 1000         // 30 minutes
};
```

## Customization

### Theme Support
```typescript
const themes = {
  light: {
    background: '#ffffff',
    foreground: '#000000',
    accent: '#0070f3'
  },
  dark: {
    background: '#000000',
    foreground: '#ffffff',
    accent: '#0070f3'
  }
};
```

### Widget Sizes
- **Small**: 1x1 (e.g., weather, quick stat)
- **Medium**: 2x1 (e.g., inbox, tasks)
- **Large**: 2x2 (e.g., calendar, finance details)

## Performance

1. **Caching**: Redis cache for widget data
2. **Lazy Loading**: Load widgets on-demand
3. **Background Sync**: Queue-based data refresh
4. **Optimistic Updates**: Instant UI feedback
5. **Code Splitting**: Load widget code dynamically

## Testing

```bash
# Unit tests
npm test

# Widget tests
npm run test:widgets

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Deployment

### Web App
- **Hosting**: Vercel or Netlify
- **CDN**: Included
- **SSL**: Auto-provisioned

### Mobile App
- **iOS**: App Store
- **Android**: Google Play Store

### Desktop App
- **Distribution**: Auto-updater via Electron
- **Platforms**: macOS, Windows, Linux

## Roadmap

### Phase 1 (MVP) - 6 weeks
- [x] Basic widget system
- [x] 5 core widgets (inbox, calendar, tasks, finance, weather)
- [x] Drag-and-drop layout
- [x] Dark mode
- [x] Web app

### Phase 2 - 10 weeks
- [ ] Additional widgets (news, habits, notes)
- [ ] Quick actions
- [ ] Universal search
- [ ] Mobile responsive design
- [ ] Push notifications

### Phase 3 - 14 weeks
- [ ] Custom widgets (user-created)
- [ ] Widget marketplace
- [ ] Mobile apps
- [ ] Desktop app
- [ ] Collaborative dashboards
- [ ] AI-powered insights

## License

Proprietary - All rights reserved

---

**Status**: 🚧 In Development
**Target Launch**: Q2 2025
