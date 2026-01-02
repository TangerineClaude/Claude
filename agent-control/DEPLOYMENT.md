# Cloud Deployment Guide

This app is ready to deploy as a PWA to any cloud platform. The agents run in the background, and the frontend is a lightweight PWA that can be installed on any device.

## Architecture

- **Frontend**: Progressive Web App (installable, offline-capable)
- **Backend**: Node.js server running autonomous AI agents
- **Database**: PostgreSQL (required)
- **AI**: OpenAI API for intelligent task execution

## Quick Deploy Options

### 1. Railway (Recommended - Easiest)

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

3. Add PostgreSQL:
```bash
railway add --plugin postgresql
```

4. Set environment variables in Railway dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - Database URL is automatically set

5. Deploy:
```bash
railway up
```

Your app will be live at `https://your-app.up.railway.app`

### 2. Render

1. Create account at [render.com](https://render.com)

2. Click "New +" → "Blueprint"

3. Connect your GitHub repo

4. Render will automatically detect `render.yaml` and create:
   - Web service
   - PostgreSQL database

5. Set environment variable:
   - `OPENAI_API_KEY`: Your OpenAI API key

6. Deploy!

### 3. Fly.io

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login and launch:
```bash
fly auth login
fly launch
```

3. Add PostgreSQL:
```bash
fly postgres create
fly postgres attach
```

4. Set secrets:
```bash
fly secrets set OPENAI_API_KEY=your_key_here
```

5. Deploy:
```bash
fly deploy
```

### 4. Docker (Any Cloud)

Build and run:
```bash
docker build -t agent-control .
docker run -p 3000:3000 \
  -e DATABASE_URL=your_db_url \
  -e OPENAI_API_KEY=your_key \
  agent-control
```

## Environment Variables Required

```env
# Required
DATABASE_URL=postgresql://user:pass@host:5432/dbname
OPENAI_API_KEY=sk-...

# Optional
PORT=3000
NODE_ENV=production
```

## After Deployment

1. **Install as PWA**:
   - Visit your deployed URL
   - Click "Install" in browser
   - App will install on your device

2. **Set up database**:
```bash
# Run migrations
npm run db:push
```

3. **Create your first agent**:
   - Navigate to "Agents" page
   - Click "New Agent"
   - Fill in details

4. **Create a mission**:
   - Navigate to "Tasks" page
   - Click "New Mission"
   - AI will automatically break it down and execute

## PWA Features

Once installed:
- ✅ Works offline (cached data)
- ✅ Runs in standalone window
- ✅ Appears in app launcher
- ✅ Gets push notifications for mission updates
- ✅ Background sync when online
- ✅ Auto-updates when new version deployed

## Monitoring

The agent engine runs automatically in the background:
- Polls for new missions every 5 seconds
- Executes tasks sequentially
- Logs all activity to database
- Updates mission status in real-time

You can monitor:
- Live logs on mission detail pages
- Overall status on home dashboard
- Active/completed task counts

## Scaling

To handle more missions:
- Increase server resources (CPU/RAM)
- Add database connection pooling
- Consider running multiple instances with load balancer

## Costs

Typical monthly costs:
- **Railway**: $5/month (Hobby plan)
- **Render**: $7/month (Starter plan)
- **Fly.io**: ~$5/month (pay-as-you-go)
- **OpenAI API**: Varies by usage (~$0.002 per task)

## Support

For issues or questions:
- Check logs in your cloud platform dashboard
- Verify DATABASE_URL and OPENAI_API_KEY are set
- Ensure PostgreSQL is running and accessible
