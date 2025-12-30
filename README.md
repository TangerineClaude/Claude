# Claude Projects Monorepo

A consolidated repository containing multiple AI-powered applications and automation tools developed by TangerineClaude.

## 📁 Repository Structure

```
Claude/
├── projects/           # All application projects
├── shared/            # Shared utilities and components
├── docs/              # Consolidated documentation
├── tools/             # Development and deployment tools
├── README.md          # This file
└── CLAUDE.md          # Comprehensive Claude AI documentation
```

## 🚀 Projects

### 📱 Personal Productivity Suite

#### 1. **Finance Copilot** 🆕
**Location:** `projects/finance-copilot/`
Clear cashflow, budgets, net worth tracking, and subscription cleanup - a Copilot/Origin-style personal finance management system.

**Features:** Account linking (Plaid), auto-categorization, cashflow analysis, budget tracking, subscription management, smart alerts

[View Documentation →](projects/finance-copilot/README.md)

#### 2. **Email Copilot + Unified Inbox** 🆕
**Location:** `projects/email-copilot/`
One place to read, triage, and reply across Gmail, Outlook, and iCloud with AI assistance.

**Features:** Multi-account support, smart classification, thread summarization, safe reply drafting, one-click unsubscribe, bulk cleanup

[View Documentation →](projects/email-copilot/README.md)

#### 3. **Memory Mind** 🆕
**Location:** `projects/memory-mind/`
Personal knowledge base that persists and recalls facts across all apps.

**Features:** Entity recognition, knowledge graph, smart search, auto-capture from emails/calendar, timeline view, reminders

[View Documentation →](projects/memory-mind/README.md)

#### 4. **Personal Dashboard** 🆕
**Location:** `projects/personal-dashboard/`
Your "Today View" - unified dashboard with inbox, calendar, finance, and alerts.

**Features:** Inbox Zero widget, bills due, calendar, finance snapshot, tasks, customizable layout, quick actions

[View Documentation →](projects/personal-dashboard/README.md)

### 🤖 AI Agents & Automation

#### 5. **Marketplace Agent**
**Location:** `projects/marketplace-agent/`
Reusable autonomous marketplace sales agent system with multi-channel support.

**Features:** Multi-channel communication (Slack, email, SMS), product catalog, automated lead qualification, CRM integration

[View Documentation →](projects/marketplace-agent/README.md)

#### 6. **AI Agents Suite**
**Location:** `projects/ai-agents-suite/`
Collection of specialized AI agents for automation, banking, customer service, and chat.

**Features:** Banking agent, customer service agent, automation agent, chat agent

[View Documentation →](projects/ai-agents-suite/README.md)

#### 7. **Personal Automation Agent**
**Location:** `projects/personal-automation-agent/`
Multi-mode personal automation agent for task management and workflow automation.

**Features:** Task manager mode, workflow automation, personal assistant mode, data processing mode

[View Documentation →](projects/personal-automation-agent/README.md)

#### 8. **Actions Framework** 🆕
**Location:** `projects/actions-framework/`
Let AI execute real actions: send emails, create calendar events, post notes, trigger webhooks.

**Features:** Action registry, approval flow, undo support, audit log, email/calendar/notes/tasks actions, Zapier/Make integration

[View Documentation →](projects/actions-framework/README.md)

### 📱 Mobile Utilities

#### 9. **Screenshot OCR + Link Opener** 🆕
**Location:** `projects/screenshot-ocr-tool/`
Extract text from tall screenshots and automatically detect and open TikTok/YouTube links.

**Features:** OCR processing, link detection, one-tap open, text export, multi-language, share sheet integration

[View Documentation →](projects/screenshot-ocr-tool/README.md)

#### 10. **Privacy Redaction Tool** 🆕
**Location:** `projects/privacy-redaction-tool/`
Remove PII (emails, phones, addresses, credit cards) from text and images before sharing.

**Features:** PII detection, smart redaction (blur/black box/pixelate), preview, batch processing, custom patterns

[View Documentation →](projects/privacy-redaction-tool/README.md)

#### 11. **Scroll Capture Tool** 🆕
**Location:** `projects/scroll-capture-tool/`
Samsung-style scroll capture for long screens - capture entire pages as one image.

**Features:** Auto-scroll capture, assistive overlay, seamless stitching, manual control, crop tool

[View Documentation →](projects/scroll-capture-tool/README.md)

### ⌨️ Keyboard & Input Tools

#### 12. **SuperWhisper Keyboard** 🆕
**Location:** `projects/superwhisper-keyboard/`
System-wide voice dictation keyboard with punctuation and commands for iOS.

**Features:** Push-to-talk, live transcription, auto-punctuation, voice commands, multi-language, offline mode, emoji support

[View Documentation →](projects/superwhisper-keyboard/README.md)

#### 13. **Keyboard Copilot** 🆕
**Location:** `projects/keyboard-copilot/`
AI-powered keyboard for rewriting, summarizing, translating, and web research from any app.

**Features:** Rewrite (polish/casual/concise), summarize, translate, fix grammar, expand, web search, custom prompts

[View Documentation →](projects/keyboard-copilot/README.md)

### 🛠️ Developer & Infrastructure Tools

#### 14. **AutoDeploy DevHub**
**Location:** `projects/autodeploy-devhub/`
Automated deployment hub for managing and deploying applications to Vercel, Netlify, AWS, and other platforms.

**Features:** Multi-platform deployment, Git integration, CI/CD pipelines, environment management, rollback, deployment logs

[View Documentation →](projects/autodeploy-devhub/README.md)

#### 15. **Cloud Docs Vault** 🆕
**Location:** `projects/cloud-docs-vault/`
Secure document vault where AI can read and learn from your docs for Q&A and insights.

**Features:** Document upload (PDF/DOCX/TXT/MD), intelligent chunking, vector search, AI Q&A, summarization, citations

[View Documentation →](projects/cloud-docs-vault/README.md)

### 🌐 Web & Business Applications

#### 16. **1211 Situation Planner App**
**Location:** `projects/1211-situation-planner/`
Emergency response and situation planning application with real-time coordination features.

**Features:** Real-time monitoring, emergency response coordination, resource allocation, multi-agency collaboration, GIS integration

[View Documentation →](projects/1211-situation-planner/README.md)

#### 17. **Kooperkai Aquatics Website**
**Location:** `projects/kooperkai-aquatics/`
Modern, responsive website for Kooperkai Aquatics built with TypeScript, Vite, and Cloudflare Pages.

**Tech Stack:** TypeScript, Vite, Cloudflare Pages

[View Documentation →](projects/kooperkai-aquatics/README.md)

### 🤖 AI Assistants

#### 18. **Personal Gemini Assistant PWA** 🆕
**Location:** `projects/personal-gemini-assistant/`
Progressive Web App powered by Google's Gemini AI for personal assistance and productivity.

**Features:** Natural language task management, smart scheduling, email/calendar integration, voice interaction, offline functionality, multi-device sync

[View Documentation →](projects/personal-gemini-assistant/README.md)

---

**Total Projects:** 18 (7 Original + 11 New MVP-Ready Projects)

See [PROJECTS.md](PROJECTS.md) for detailed descriptions of all projects.

## 🛠️ Development

### Prerequisites
- Node.js 18+ (for web applications)
- Python 3.9+ (for Python-based agents)
- Git

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/TangerineClaude/Claude.git
cd Claude
```

2. Navigate to a specific project:
```bash
cd projects/[project-name]
```

3. Follow the project-specific README for setup instructions.

## 📦 Shared Resources

The `shared/` directory contains:
- Common utilities and helper functions
- Reusable UI components
- Shared types and interfaces
- Configuration templates

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Comprehensive documentation about Claude AI capabilities
- **[docs/](docs/)** - Additional technical documentation and guides

## 🔧 Tools

The `tools/` directory contains:
- Deployment scripts
- Testing utilities
- Development automation tools

## 🤝 Contributing

Each project maintains its own contribution guidelines. See individual project READMEs for details.

## 📄 License

Each project may have its own licensing. Refer to individual project directories for specific license information.

## 📞 Contact

For questions or support, please open an issue in the relevant project directory.

---

**Built with ❤️ by TangerineClaude**
