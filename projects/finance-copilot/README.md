# Finance Copilot

## Overview
Clear cashflow, budgets, net worth tracking, and subscription cleanup - a Copilot/Origin-style personal finance management system.

## Outcome
Provide users with crystal-clear visibility into their financial health: cashflow trends, budget adherence, net worth tracking, and automated subscription cleanup.

## MVP Features

### Core Functionality
- **Account Linking**: Connect bank accounts, credit cards, investments (read-only)
- **Auto-Categorization**: Intelligent transaction categorization using ML
- **Cashflow Analysis**: Visual trends and patterns
- **Budget Tracking**: Set and monitor budgets by category
- **Net Worth Dashboard**: Real-time asset and liability tracking
- **Subscription Management**: Identify and manage recurring charges
- **Smart Alerts**: Unusual spending, bill reminders, budget warnings

### Privacy & Security
- Read-only account access
- End-to-end encryption for financial data
- No data used for model training
- SOC 2 Type II compliance ready
- Multi-factor authentication

## Tech Stack

### Frontend
- **iOS App**: Swift/SwiftUI
- **Web App**: React/TypeScript with Vite
- **Mobile Web**: Progressive Web App (PWA)

### Backend
- **API**: Node.js/Express or Python/FastAPI
- **Database**: PostgreSQL for structured data
- **Cache**: Redis for real-time data
- **Queue**: Bull/BullMQ for async processing

### Integrations
- **Plaid API**: Bank account connections (US/Canada)
- **Yodlee**: International banking support
- **Stripe**: Payment processing (if premium features)

### AI/ML
- **Transaction Categorization**: Claude API or fine-tuned model
- **Anomaly Detection**: Scikit-learn for unusual spending patterns
- **Forecasting**: Prophet for cashflow predictions

## Architecture

```
┌─────────────┐
│  iOS App    │
│  (Swift)    │
└──────┬──────┘
       │
┌──────┴──────┐         ┌──────────────┐
│  Web App    │────────▶│   API Layer  │
│  (React)    │         │  (FastAPI)   │
└─────────────┘         └──────┬───────┘
                               │
                        ┌──────┴───────┐
                        │              │
                   ┌────▼────┐    ┌───▼────┐
                   │ Plaid   │    │ Claude │
                   │   API   │    │  API   │
                   └─────────┘    └────────┘
                        │
                   ┌────▼─────┐
                   │PostgreSQL│
                   │  + Redis │
                   └──────────┘
```

## Getting Started

### Prerequisites
- Node.js 18+ or Python 3.9+
- PostgreSQL 14+
- Redis 7+
- Plaid API credentials
- iOS development environment (for mobile app)

### Installation

#### Backend
```bash
cd backend
npm install  # or pip install -r requirements.txt
cp .env.example .env
# Configure Plaid credentials in .env
npm run dev
```

#### iOS App
```bash
cd ios
pod install
open FinanceCopilot.xcworkspace
# Build and run in Xcode
```

#### Web App
```bash
cd web
npm install
npm run dev
```

## Environment Variables

```env
# Plaid Configuration
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox  # or development, production

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/finance_copilot
REDIS_URL=redis://localhost:6379

# AI
ANTHROPIC_API_KEY=your_claude_api_key

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Features
ENABLE_SUBSCRIPTION_DETECTION=true
ENABLE_CASHFLOW_FORECASTING=true
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Accounts
- `GET /api/accounts` - List all linked accounts
- `POST /api/accounts/link` - Link new account via Plaid
- `DELETE /api/accounts/:id` - Unlink account
- `POST /api/accounts/sync` - Force sync transactions

### Transactions
- `GET /api/transactions` - List transactions with filters
- `GET /api/transactions/:id` - Get transaction details
- `PUT /api/transactions/:id/category` - Update category
- `POST /api/transactions/categorize` - Bulk categorize

### Analytics
- `GET /api/analytics/cashflow` - Cashflow analysis
- `GET /api/analytics/spending` - Spending breakdown
- `GET /api/analytics/networth` - Net worth over time
- `GET /api/analytics/subscriptions` - Detected subscriptions

### Budgets
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plaid_account_id VARCHAR(255),
  name VARCHAR(255),
  type VARCHAR(50),  -- checking, savings, credit, investment
  balance DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  plaid_transaction_id VARCHAR(255),
  date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(12,2),
  category VARCHAR(100),
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  category VARCHAR(100),
  amount DECIMAL(12,2),
  period VARCHAR(20),  -- monthly, weekly, yearly
  start_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Features Roadmap

### Phase 1 (MVP) - 8 weeks
- [x] Plaid integration
- [x] Account linking
- [x] Transaction sync
- [x] Basic categorization
- [x] Simple budgets
- [x] iOS app skeleton
- [x] Web dashboard

### Phase 2 - 12 weeks
- [ ] Advanced categorization (AI-powered)
- [ ] Subscription detection
- [ ] Cashflow forecasting
- [ ] Net worth tracking
- [ ] Bill reminders
- [ ] Export to CSV/PDF

### Phase 3 - 16 weeks
- [ ] Investment tracking
- [ ] Tax optimization insights
- [ ] Savings goals
- [ ] Family sharing
- [ ] Premium features
- [ ] Android app

## Security Considerations

1. **Data Encryption**: All financial data encrypted at rest (AES-256)
2. **Transport Security**: TLS 1.3 for all API calls
3. **Access Control**: JWT-based authentication with short expiry
4. **PII Protection**: Tokenization for sensitive data
5. **Audit Logging**: All financial operations logged
6. **Rate Limiting**: Prevent abuse and brute force
7. **Plaid Security**: Use Plaid Link for secure account linking

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Security audit
npm audit
```

## Deployment

### Backend
- **Platform**: AWS ECS/Fargate or Google Cloud Run
- **Database**: AWS RDS PostgreSQL or Google Cloud SQL
- **Cache**: AWS ElastiCache Redis
- **CDN**: CloudFront or Cloudflare

### iOS App
- **Distribution**: App Store
- **Beta**: TestFlight
- **CI/CD**: GitHub Actions + Fastlane

### Web App
- **Hosting**: Vercel or Netlify
- **CDN**: Included
- **SSL**: Auto-provisioned

## Compliance & Legal

- **PSD2** (EU): Open banking compliance
- **GDPR**: Data protection and privacy
- **CCPA** (California): Consumer privacy
- **SOC 2 Type II**: Security and availability
- **Terms of Service**: Required
- **Privacy Policy**: Required

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact support@financeco pilot.app

---

**Status**: 🚧 In Development
**Target Launch**: Q2 2025
