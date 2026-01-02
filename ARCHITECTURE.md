# Claude Ecosystem Architecture

## Overview

The 18 projects are organized into **3 tiers**: Standalone Apps, Integrated Suite, and Shared Infrastructure.

## 🏗️ Architecture Design

### Tier 1: Integrated Personal Suite (Core Platform)

These 4 projects form **one unified application** with a shared backend:

```
┌─────────────────────────────────────────────────────────────┐
│                    PERSONAL DASHBOARD                        │
│              (Main UI - Your "Today View")                   │
└────────┬────────────────────────────────────────────────┬────┘
         │                                                 │
    ┌────▼────────────┐                              ┌────▼────────────┐
    │  EMAIL COPILOT  │                              │ FINANCE COPILOT │
    │  (Widget/Page)  │                              │  (Widget/Page)  │
    └────────┬────────┘                              └────────┬────────┘
             │                                                 │
             └─────────────────┬───────────────────────────────┘
                               │
                        ┌──────▼──────┐
                        │ MEMORY MIND │
                        │  (Backend)  │
                        └─────────────┘

Shared Backend Infrastructure:
├── PostgreSQL (user data, emails metadata, transactions, entities)
├── Redis (caching, real-time updates)
├── Vector DB (semantic search for emails, documents, memories)
├── Claude API (AI operations)
└── Authentication (single sign-on across all modules)
```

**How it works:**
- **Personal Dashboard** is the main app (web + mobile)
- **Email Copilot** and **Finance Copilot** are modules within the dashboard
- **Memory Mind** runs in the background, capturing data from all modules
- Users navigate between modules but stay in one app
- All modules share the same database and authentication

**Tech Stack:**
- Frontend: Next.js monorepo with TurboBash
- Backend: Single FastAPI or Node.js backend
- Database: Single PostgreSQL instance
- Deploy: Vercel (frontend) + Railway/Fly.io (backend)

### Tier 2: Standalone Applications

These are **separate, independent apps**:

#### Mobile Apps (Native)
```
1. SuperWhisper Keyboard (iOS)
   - iOS keyboard extension
   - Standalone App Store app
   - Can integrate with Personal Dashboard via API

2. Keyboard Copilot (iOS/Android)
   - Keyboard extension
   - Standalone app
   - Optional: connects to Personal Dashboard for context

3. Screenshot OCR Tool (iOS/Android)
   - Share sheet extension
   - Standalone utility app

4. Privacy Redaction Tool (iOS/Android)
   - Share sheet extension
   - Standalone utility app

5. Scroll Capture Tool (Android, limited iOS)
   - Accessibility service
   - Standalone utility app
```

#### Web Applications
```
6. Kooperkai Aquatics Website
   - Completely separate
   - Static site on Cloudflare Pages

7. 1211 Situation Planner
   - Separate app for emergency management
   - Own backend and database

8. AutoDeploy DevHub
   - Developer tool
   - Own backend and database

9. Cloud Docs Vault
   - Can integrate with Personal Dashboard
   - Or standalone document management app
```

#### AI Agents
```
10. Marketplace Agent
    - Standalone sales automation system
    - Deploy as service for businesses

11. AI Agents Suite
    - Collection of microservices
    - Each agent is a separate service

12. Personal Automation Agent
    - Can run standalone or integrate with Personal Dashboard

13. Personal Gemini Assistant PWA
    - Standalone PWA
    - Could complement Personal Dashboard
```

#### Shared Framework
```
14. Actions Framework
    - Not an app - it's a library/SDK
    - Used BY other projects to enable AI actions
    - npm package or Python package
```

## 🎯 Recommended Implementation Strategy

### Phase 1: Build the Core Platform (12 weeks)

**Priority: Personal Dashboard + Modules**

```
Week 1-2: Foundation
├── Setup Next.js monorepo
├── Setup FastAPI backend
├── PostgreSQL + Redis setup
├── Authentication (Clerk or Auth0)
└── Basic dashboard UI

Week 3-4: Email Copilot Module
├── Gmail/Outlook OAuth integration
├── Email sync engine
├── Basic inbox view
├── AI summarization
└── Email copilot widget for dashboard

Week 5-6: Finance Copilot Module
├── Plaid integration
├── Transaction sync
├── Basic categorization
├── Budget tracking
└── Finance widget for dashboard

Week 7-8: Memory Mind Backend
├── Entity extraction setup
├── Vector database integration
├── Auto-capture from email/calendar
├── Search API
└── Timeline view

Week 9-10: Dashboard Integration
├── Widget system
├── Customizable layout
├── Quick actions
├── Real-time updates
└── Mobile responsive

Week 11-12: Polish + Deploy
├── Testing
├── Performance optimization
├── Production deployment
└── Beta launch
```

**Deliverable:** One unified app at `dashboard.yourdomain.com` with email, finance, and memory features.

### Phase 2: Extend with Keyboard Tools (4 weeks)

**Build standalone keyboard apps that can optionally connect to the dashboard**

```
Week 13-14: SuperWhisper Keyboard (iOS)
├── Voice input keyboard extension
├── On-device ASR
└── Optional: Connect to Memory Mind for context

Week 15-16: Keyboard Copilot (iOS + Android)
├── AI keyboard extension
├── Rewrite, translate, search features
└── Optional: Connect to Personal Dashboard for personalization
```

**Deliverable:** 2 apps on App Store / Play Store

### Phase 3: Add Mobile Utilities (4 weeks)

**Build utility apps**

```
Week 17-18: Screenshot OCR + Privacy Redaction
├── OCR tool with link detection
└── Privacy redaction tool

Week 19-20: Scroll Capture + Polish
├── Scroll capture tool
└── App Store submission
```

**Deliverable:** 3 more utility apps

### Phase 4: Add Cloud Docs Vault (4 weeks)

**Extend the Personal Dashboard with document management**

```
Week 21-24: Cloud Docs Vault
├── Document upload and processing
├── Vector search integration (reuse from Memory Mind)
├── AI Q&A with Claude
└── Add as new section to Personal Dashboard
```

**Deliverable:** Document vault integrated into main dashboard

### Phase 5: Build Actions Framework (2 weeks)

**Enable AI to take actions across all apps**

```
Week 25-26: Actions Framework
├── Action registry system
├── Approval flow
├── Audit logging
└── Integrate into Personal Dashboard
```

**Deliverable:** AI can send emails, create calendar events from dashboard

### Phase 6: Standalone Apps (As Needed)

Build these as separate projects when needed:
- AutoDeploy DevHub (developer tool)
- 1211 Situation Planner (emergency management)
- Marketplace Agent (B2B product)
- AI Agents Suite (services for other apps)
- Personal Automation Agent (workflow tool)
- Personal Gemini Assistant (alternative to dashboard)

## 💻 Development Setup

### Monorepo Structure for Core Platform

```
claude-platform/
├── apps/
│   ├── web/                    # Next.js dashboard app
│   ├── mobile/                 # React Native app (optional)
│   └── backend/                # FastAPI backend
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── database/               # Database schemas & ORM
│   ├── auth/                   # Auth utilities
│   ├── email-copilot/          # Email module
│   ├── finance-copilot/        # Finance module
│   ├── memory-mind/            # Memory module
│   └── actions-framework/      # Actions SDK
├── docker-compose.yml          # Local development
├── turbo.json                  # Turborepo config
└── package.json

# Separate repos for standalone apps:
- superwhisper-keyboard/        (iOS app)
- keyboard-copilot/             (iOS/Android)
- screenshot-ocr-tool/          (iOS/Android)
- privacy-redaction-tool/       (iOS/Android)
- scroll-capture-tool/          (Android)
- autodeploy-devhub/            (Web app)
- cloud-docs-vault/             (Could be integrated or standalone)
- marketplace-agent/            (Existing)
- kooperkai-aquatics/           (Existing)
```

### Tech Stack Summary

**Core Platform:**
- Frontend: Next.js 14 + React + TypeScript + TailwindCSS
- Backend: FastAPI (Python) or Node.js/Express
- Database: PostgreSQL + Redis + Qdrant/Pinecone
- Deploy: Vercel + Railway/Fly.io
- Monorepo: Turborepo or Nx

**Mobile Apps:**
- iOS: Swift + SwiftUI
- Android: Kotlin + Jetpack Compose
- Cross-platform option: React Native (for some apps)

**AI:**
- Claude API (primary)
- OpenAI embeddings
- Google Gemini (for Gemini Assistant)

## 🔗 Integration Architecture

### How Apps Talk to Each Other

```
┌────────────────────────────────────────────────────┐
│           Personal Dashboard (Main App)             │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │    Email     │  │   Finance    │  │  Memory  │ │
│  │   Copilot    │  │   Copilot    │  │   Mind   │ │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         │                 │                │       │
└─────────┼─────────────────┼────────────────┼───────┘
          │                 │                │
          └────────┬────────┴────────────────┘
                   │
            ┌──────▼──────┐
            │   REST API  │  ← Shared backend
            │  (FastAPI)  │
            └──────┬──────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
┌────▼────┐   ┌───▼────┐   ┌───▼──────┐
│SuperWhis│   │Keyboard│   │  Cloud   │
│per KB   │   │Copilot │   │  Docs    │
│(iOS app)│   │(Mobile)│   │  Vault   │
└─────────┘   └────────┘   └──────────┘
     │             │             │
     └─────────────┴─────────────┘
                   │
        Optional API integration
        (for personalization, context)
```

**Integration Methods:**
1. **Embedded modules** (Email, Finance in Dashboard): Share database, direct function calls
2. **REST API** (Mobile apps → Dashboard): HTTP API for data access
3. **Webhooks** (Actions Framework): Trigger actions in other apps
4. **OAuth** (Third-party integrations): Gmail, Plaid, etc.

## 🚀 Quick Start: Build the MVP First

Let's start with the **minimum viable integrated platform**:

### MVP = Personal Dashboard + Email Copilot (4 weeks)

**Week 1:**
```bash
# Setup
npx create-next-app@latest claude-platform
cd claude-platform
npm install @clerk/nextjs @tanstack/react-query tailwindcss
```

**Week 2:**
- Gmail OAuth integration
- Email sync to PostgreSQL
- Basic inbox UI

**Week 3:**
- Claude API integration for summarization
- Reply drafting
- Email categorization

**Week 4:**
- Dashboard homepage with Email widget
- Deploy to Vercel
- Beta test

**Result:** A working app people can use immediately.

Then add Finance Copilot (4 more weeks), then Memory Mind (4 more weeks).

## 🎯 Recommendation

**Start with Phase 1: The Integrated Platform**

Build ONE unified app with these modules:
1. ✅ Personal Dashboard (hub)
2. ✅ Email Copilot (most immediate value)
3. ✅ Finance Copilot (high retention)
4. ✅ Memory Mind (unique differentiator)

**Deploy as:** `app.yourdomain.com`

Then build the mobile keyboard apps and utilities as separate App Store/Play Store apps that can optionally connect to the main platform.

**Want me to start building the core platform? I can:**
1. Set up the Next.js + FastAPI monorepo
2. Build the authentication system
3. Start with Email Copilot module
4. Get you to a working MVP in 4 weeks

Which approach sounds best to you?
