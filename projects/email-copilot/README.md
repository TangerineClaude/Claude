# Email Copilot + Unified Inbox

## Overview
One place to read, triage, and reply across Gmail, Outlook, and iCloud. AI-powered email management with smart classification, summarization, and safe reply drafting.

## Outcome
Unified email experience with intelligent assistance: classify emails, summarize threads, draft safe replies, unsubscribe from unwanted senders, and bulk cleanup - all in one interface.

## MVP Features

### Core Functionality
- **Multi-Account Support**: Gmail, Outlook, iCloud in one inbox
- **Smart Classification**: Auto-label (Primary, Social, Promotions, Updates, Spam)
- **Thread Summarization**: AI-powered summaries of long email chains
- **Safe Reply Drafting**: Context-aware response suggestions
- **One-Click Unsubscribe**: Detect and unsubscribe from marketing emails
- **Bulk Cleanup**: Archive/delete by category, age, sender
- **Smart Search**: Natural language email search
- **Priority Detection**: Flag important emails automatically

### Privacy & Security
- OAuth 2.0 for all email providers
- Zero email content used for model training
- End-to-end encryption for stored drafts
- Local-first processing where possible
- SOC 2 Type II compliance ready

## Tech Stack

### Frontend
- **Web App**: React/TypeScript with Next.js
- **Desktop**: Electron (optional)
- **Mobile**: React Native

### Backend
- **API**: Node.js/Express or Python/FastAPI
- **Database**: PostgreSQL for metadata, Redis for cache
- **Queue**: Bull for async email processing
- **Search**: Elasticsearch or Typesense

### Integrations
- **Gmail**: Google OAuth + Gmail API
- **Outlook**: Microsoft Graph API
- **iCloud**: IMAP/SMTP fallback
- **Unsubscribe**: List-Unsubscribe headers + pattern matching

### AI/ML
- **Classification**: Claude API for intelligent categorization
- **Summarization**: Claude API for thread summaries
- **Reply Generation**: Claude API with safety guardrails
- **Priority Detection**: Fine-tuned model on user behavior

## Architecture

```
┌─────────────────┐
│   Web Client    │
│  (Next.js/React)│
└────────┬────────┘
         │
    ┌────▼─────┐
    │   API    │
    │ Gateway  │
    └────┬─────┘
         │
    ┌────▼──────────────────────┐
    │                           │
┌───▼────┐  ┌──────┐  ┌────────▼─┐
│ Gmail  │  │Outlook│  │  iCloud │
│  API   │  │  API  │  │   IMAP  │
└───┬────┘  └───┬───┘  └────┬────┘
    │           │           │
    └───────┬───┴──────┬────┘
            │          │
       ┌────▼────┐ ┌──▼─────┐
       │ Claude  │ │  DB    │
       │   API   │ │Postgres│
       └─────────┘ └────────┘
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Elasticsearch 8+ (optional, for advanced search)
- OAuth credentials for Gmail, Outlook

### Installation

```bash
# Clone and install
cd projects/email-copilot
npm install

# Setup environment
cp .env.example .env
# Configure OAuth credentials in .env

# Database setup
npm run db:migrate

# Start development
npm run dev
```

## Environment Variables

```env
# Gmail OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/email_copilot
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# AI
ANTHROPIC_API_KEY=your_claude_api_key

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
ENCRYPTION_KEY=your_encryption_key

# Features
ENABLE_AI_REPLIES=true
ENABLE_AUTO_CATEGORIZATION=true
ENABLE_SUMMARIZATION=true
MAX_REPLY_SUGGESTIONS=3
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Gmail OAuth
- `GET /auth/microsoft` - Initiate Outlook OAuth
- `GET /auth/callback` - OAuth callback handler
- `POST /auth/logout` - Logout

### Accounts
- `GET /api/accounts` - List connected email accounts
- `POST /api/accounts/connect` - Connect new account
- `DELETE /api/accounts/:id` - Disconnect account
- `POST /api/accounts/:id/sync` - Force sync

### Emails
- `GET /api/emails` - List emails with pagination
- `GET /api/emails/:id` - Get email details
- `PUT /api/emails/:id` - Update email (mark read, archive, etc.)
- `DELETE /api/emails/:id` - Delete email
- `POST /api/emails/:id/reply` - Send reply

### AI Features
- `POST /api/ai/summarize` - Summarize email thread
- `POST /api/ai/classify` - Classify email
- `POST /api/ai/draft-reply` - Generate reply suggestions
- `POST /api/ai/search` - Natural language search

### Utilities
- `POST /api/unsubscribe/:id` - Unsubscribe from sender
- `POST /api/bulk/archive` - Bulk archive emails
- `POST /api/bulk/delete` - Bulk delete emails
- `GET /api/stats` - Email statistics

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email Accounts
CREATE TABLE email_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider VARCHAR(50),  -- gmail, outlook, icloud
  email_address VARCHAR(255) NOT NULL,
  access_token TEXT,  -- encrypted
  refresh_token TEXT,  -- encrypted
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Emails (metadata only)
CREATE TABLE emails (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES email_accounts(id),
  message_id VARCHAR(255) UNIQUE,
  thread_id VARCHAR(255),
  subject TEXT,
  from_address VARCHAR(255),
  to_addresses TEXT[],
  cc_addresses TEXT[],
  date TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  category VARCHAR(50),
  priority_score INTEGER,
  has_attachments BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(account_id, date),
  INDEX(thread_id),
  INDEX(category)
);

-- Email Summaries
CREATE TABLE email_summaries (
  id UUID PRIMARY KEY,
  email_id UUID REFERENCES emails(id),
  summary TEXT,
  key_points TEXT[],
  sentiment VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Unsubscribe Tracking
CREATE TABLE unsubscribe_tracking (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  sender_address VARCHAR(255),
  unsubscribed_at TIMESTAMP DEFAULT NOW()
);
```

## Features

### 1. Unified Inbox
```typescript
// Example: Fetch emails from all accounts
const emails = await getUnifiedInbox({
  userId: 'user-123',
  filters: {
    category: 'primary',
    isRead: false,
    limit: 50
  }
});
```

### 2. AI Summarization
```typescript
// Example: Summarize email thread
const summary = await summarizeThread({
  threadId: 'thread-abc',
  includeKeyPoints: true,
  includeSentiment: true
});

// Response:
// {
//   summary: "Meeting request for Q1 planning...",
//   keyPoints: ["Date: March 15", "Location: Zoom", "Agenda: Budget review"],
//   sentiment: "neutral",
//   actionItems: ["Confirm attendance", "Prepare budget slides"]
// }
```

### 3. Safe Reply Drafting
```typescript
// Example: Generate reply suggestions
const replies = await draftReplies({
  emailId: 'email-xyz',
  tone: 'professional',
  maxSuggestions: 3
});

// Response:
// [
//   { text: "Thank you for reaching out...", tone: "formal" },
//   { text: "Thanks! I'll review and get back...", tone: "casual" },
//   { text: "Received, will respond by EOD", tone: "brief" }
// ]
```

### 4. Smart Classification
- Primary: Personal, important emails
- Social: Social network notifications
- Promotions: Marketing, newsletters
- Updates: Receipts, confirmations, automated emails
- Spam: Unwanted emails

### 5. Bulk Cleanup
```typescript
// Example: Bulk operations
await bulkArchive({
  userId: 'user-123',
  criteria: {
    category: 'promotions',
    olderThan: '30days',
    isRead: true
  }
});
```

## Security Considerations

1. **OAuth Security**: Never store passwords, only OAuth tokens
2. **Token Encryption**: All access/refresh tokens encrypted at rest
3. **Minimal Storage**: Store only metadata, not full email content
4. **Audit Logging**: Log all email operations
5. **Rate Limiting**: Prevent API abuse
6. **Data Retention**: Configurable retention policies
7. **GDPR Compliance**: Right to deletion, data portability

## Testing

```bash
# Unit tests
npm test

# Integration tests (requires test Gmail/Outlook accounts)
npm run test:integration

# E2E tests
npm run test:e2e
```

## Deployment

### Backend
- **Platform**: Vercel, Railway, or Google Cloud Run
- **Database**: Supabase PostgreSQL or AWS RDS
- **Cache**: Upstash Redis
- **Queue**: Upstash QStash or AWS SQS

### Frontend
- **Hosting**: Vercel or Netlify
- **CDN**: Included
- **SSL**: Auto-provisioned

## Roadmap

### Phase 1 (MVP) - 6 weeks
- [x] Gmail OAuth integration
- [x] Outlook OAuth integration
- [x] Basic unified inbox
- [x] Email sync engine
- [x] Simple categorization
- [x] Web UI skeleton

### Phase 2 - 10 weeks
- [ ] AI-powered classification
- [ ] Thread summarization
- [ ] Reply suggestions
- [ ] Unsubscribe detection
- [ ] Bulk operations
- [ ] Mobile responsive design

### Phase 3 - 14 weeks
- [ ] iCloud IMAP support
- [ ] Advanced search (Elasticsearch)
- [ ] Email templates
- [ ] Scheduled sending
- [ ] Desktop app (Electron)
- [ ] Mobile apps (iOS/Android)

## Performance Optimization

1. **Incremental Sync**: Only fetch new emails since last sync
2. **Caching**: Redis cache for frequently accessed metadata
3. **Lazy Loading**: Fetch email content on-demand
4. **Search Indexing**: Elasticsearch for fast full-text search
5. **Queue Processing**: Background jobs for AI operations

## Privacy Policy

- Email content is never stored permanently
- AI processing is ephemeral (not used for training)
- Users can delete all data at any time
- OAuth tokens can be revoked
- Transparent data usage disclosures

## License

Proprietary - All rights reserved

---

**Status**: 🚧 In Development
**Target Launch**: Q2 2025
