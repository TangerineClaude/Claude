# Deployment Guide

## Prerequisites

Before deploying, ensure you have:
1. A Vercel account (free tier works)
2. A PostgreSQL database (Supabase/Neon/Railway recommended)
3. Google OAuth credentials
4. An API key from Anthropic or OpenAI

## Step-by-Step Deployment

### 1. Set Up PostgreSQL Database

**Option A: Supabase (Recommended for beginners)**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the "Connection string" (Transaction mode)
5. Save this as your `DATABASE_URL`

**Option B: Neon**
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Save this as your `DATABASE_URL`

### 2. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: Web application
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
   - `https://your-domain.vercel.app/api/auth/callback/google` (for production)
7. Save the Client ID and Client Secret

### 3. Get AI API Keys

**For Claude (Recommended):**
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an account and add payment method
3. Generate an API key
4. Save as `ANTHROPIC_API_KEY`

**For OpenAI (Alternative):**
1. Go to [platform.openai.com](https://platform.openai.com/)
2. Create an account and add payment method
3. Generate an API key
4. Save as `OPENAI_API_KEY`

### 4. Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-github-repo-url
   git push -u origin main
   ```

2. **Import in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `situation-planner` directory as the root

3. **Configure Environment Variables**

   In Vercel's project settings, add these environment variables:

   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=generate-new-secret-with-openssl
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   AI_PROVIDER=claude
   ANTHROPIC_API_KEY=sk-ant-...
   ```

   **Important**:
   - Generate a new `NEXTAUTH_SECRET` for production: `openssl rand -base64 32`
   - Set `NEXTAUTH_URL` to your actual Vercel domain
   - Update Google OAuth redirect URLs with your Vercel domain

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Vercel will run `prisma generate` automatically via the postinstall script

### 5. Initialize Database

After first deployment:

1. Go to your Vercel project settings
2. Navigate to the "Deployments" tab
3. Find your latest deployment
4. Click "..." → "Redeploy"
5. Or run locally against production DB:
   ```bash
   DATABASE_URL="your-production-url" npx prisma db push
   ```

### 6. Update Google OAuth

1. Go back to Google Cloud Console
2. Add your production domain to authorized URLs:
   - Authorized JavaScript origins: `https://your-app.vercel.app`
   - Authorized redirect URIs: `https://your-app.vercel.app/api/auth/callback/google`

### 7. Test Your Deployment

1. Visit your Vercel URL
2. Click "Get Started" or "Sign In"
3. Sign in with Google
4. Create a test situation
5. Verify the analysis works
6. Check that the history page shows your session

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` is correct
- Ensure your database allows connections from Vercel's IPs
- Check if Prisma migrations ran successfully

### Authentication Issues
- Verify `NEXTAUTH_URL` matches your domain exactly
- Check Google OAuth redirect URLs are correct
- Ensure `NEXTAUTH_SECRET` is set and different from local

### AI Analysis Fails
- Verify your API key is correct
- Check you have sufficient credits/quota
- Look at Vercel function logs for error details

### Build Failures
- Check all dependencies are in package.json
- Verify TypeScript has no errors: `npm run build` locally
- Check Vercel build logs for specific errors

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| NEXTAUTH_URL | Yes | Your app's URL (with https://) |
| NEXTAUTH_SECRET | Yes | Random secret for session encryption |
| GOOGLE_CLIENT_ID | Yes | From Google Cloud Console |
| GOOGLE_CLIENT_SECRET | Yes | From Google Cloud Console |
| AI_PROVIDER | No | "claude" or "openai" (default: claude) |
| ANTHROPIC_API_KEY | Conditional | Required if using Claude |
| OPENAI_API_KEY | Conditional | Required if using OpenAI |

## Post-Deployment

1. **Monitor Usage**: Check your AI provider dashboard for API usage
2. **Set Up Alerts**: Configure Vercel to alert you on errors
3. **Custom Domain**: Add a custom domain in Vercel settings (optional)
4. **Analytics**: Consider adding analytics (Vercel Analytics, etc.)

## Costs

Estimated monthly costs for moderate use:
- Vercel: $0 (free tier sufficient for personal use)
- Database: $0 (Supabase/Neon free tiers)
- Claude API: ~$5-20 depending on usage
- Google OAuth: Free

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check your database connection
3. Verify all environment variables are set
4. Review the troubleshooting section above
