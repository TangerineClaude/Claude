# 1211 Situation Planner

A Next.js application that helps users navigate complex, messy real-life situations by providing structured clarity through AI-powered analysis.

## What It Does

- Helps users navigate real-life situations that feel complex, vague, or messy
- Takes freeform user input describing their situation
- Returns structured clarity: what's happening, what they want, and what to do next

## Features

- **Neutral Summary**: Get a clear, fact-based summary of the situation
- **Goal Tree**: Identify main goals and break them into actionable sub-goals
- **Action Plan**: Receive step-by-step guidance with if/then branches
- **Ready-to-Use Scripts**: Get templates for emails, messages, or conversations
- **Session History**: All analyses are automatically saved and retrievable
- **Copy Functionality**: Easily copy plans and scripts to clipboard

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: NextAuth.js (Google OAuth + Email)
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4 and Anthropic Claude 3.5 Sonnet
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key or Anthropic API key (or both)
- Google OAuth credentials (for sign-in)

### Installation

1. Clone the repository
2. Navigate to the situation-planner directory:
   ```bash
   cd situation-planner
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

5. Edit `.env` and add your credentials:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
   - `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`: Your AI provider API key
   - `AI_PROVIDER`: Set to "claude" or "openai" (default: "claude")

6. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

7. Run the development server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

## Database Setup

This app uses PostgreSQL. You can use:
- Local PostgreSQL installation
- [Supabase](https://supabase.com) (free tier available)
- [Neon](https://neon.tech) (free tier available)
- [Railway](https://railway.app)

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

Make sure to:
- Set `NEXTAUTH_URL` to your production domain
- Add your production domain to Google OAuth allowed URLs
- Set up a production PostgreSQL database

## Project Structure

```
situation-planner/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── analyze/       # AI analysis endpoint
│   │   ├── auth/          # NextAuth endpoints
│   │   └── sessions/      # Session management
│   ├── auth/              # Auth pages
│   ├── history/           # History pages
│   ├── planner/           # Main planner interface
│   └── page.tsx           # Landing page
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility functions
│   ├── ai.ts             # AI integration logic
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client
│   └── utils.ts          # Helper functions
├── prisma/               # Database schema
└── public/               # Static assets
```

## Usage

1. **Sign In**: Use Google OAuth to sign in
2. **Describe Situation**: Write what's happening in your own words
3. **Get Clarity**: Click "Get Clarity" to analyze the situation
4. **Review Results**: See summary, goals, action plan, and script in 3-panel layout
5. **Copy & Save**: Copy plans/scripts to clipboard; sessions save automatically
6. **View History**: Access all past analyses from the History page

## AI Providers

The app supports both OpenAI and Anthropic Claude:

- **Claude (default)**: Uses `claude-3-5-sonnet-20241022` for grounded, practical advice
- **OpenAI**: Uses `gpt-4-turbo-preview` with structured JSON output

Set your preferred provider with the `AI_PROVIDER` environment variable.

## Design Philosophy

- **Goal-First Clarity**: Start from what the user really wants
- **Calming, Non-Buzzy Tone**: Smart, grounded second brain
- **Practical Action**: Focus on what to do, not just advice
- **On Your Side**: Built to help, not judge

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
