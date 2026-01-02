# 🆓 FREE Google Cloud Platform Deployment

Deploy Agent Control to GCP's **100% FREE tier** and run unlimited AI missions!

## What You Get (FREE)

- ✅ **Cloud Run**: 2 million requests/month
- ✅ **Cloud SQL**: PostgreSQL f1-micro instance
- ✅ **Gemini API**: 60 requests/minute
- ✅ **Secret Manager**: Free for small usage
- ✅ **Container Registry**: 0.5GB free storage
- ✅ **Total cost**: $0/month (within free tier)

## Prerequisites

1. **Google Cloud Account**
   - Sign up at: https://cloud.google.com
   - $300 free credits for new users (not required for this deployment)

2. **gcloud CLI**
   ```bash
   # Install gcloud CLI
   # macOS
   brew install google-cloud-sdk

   # Linux
   curl https://sdk.cloud.google.com | bash

   # Windows
   # Download from: https://cloud.google.com/sdk/docs/install
   ```

3. **Gemini API Key** (FREE)
   - Get at: https://makersuite.google.com/app/apikey
   - No credit card required!

## Quick Deploy (5 minutes)

### Option 1: Automated Script (Easiest)

```bash
# Make script executable
chmod +x deploy-gcp.sh

# Run deployment
./deploy-gcp.sh
```

The script will:
1. ✅ Enable required GCP APIs
2. ✅ Create Cloud SQL PostgreSQL database
3. ✅ Store secrets in Secret Manager
4. ✅ Build container image
5. ✅ Deploy to Cloud Run
6. ✅ Give you the live URL!

### Option 2: Manual Deployment

#### 1. Set up GCP Project

```bash
# Login
gcloud auth login

# Create project (or use existing)
gcloud projects create agent-control-123
gcloud config set project agent-control-123

# Enable APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

#### 2. Create Database

```bash
# Create Cloud SQL instance (f1-micro is FREE tier)
gcloud sql instances create agent-control-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=HDD \
  --storage-size=10GB \
  --no-backup

# Create database
gcloud sql databases create agent_control \
  --instance=agent-control-db

# Set password
gcloud sql users set-password postgres \
  --instance=agent-control-db \
  --password=YOUR_PASSWORD
```

#### 3. Store Secrets

```bash
# Store Gemini API key
echo -n "YOUR_GEMINI_KEY" | gcloud secrets create GEMINI_API_KEY \
  --data-file=- \
  --replication-policy="automatic"

# Get database connection name
DB_CONNECTION=$(gcloud sql instances describe agent-control-db \
  --format='value(connectionName)')

# Store database URL
echo -n "postgresql://postgres:YOUR_PASSWORD@/agent_control?host=/cloudsql/${DB_CONNECTION}" | \
gcloud secrets create DATABASE_URL \
  --data-file=- \
  --replication-policy="automatic"
```

#### 4. Deploy to Cloud Run

```bash
# Build container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/agent-control

# Deploy
gcloud run deploy agent-control \
  --image gcr.io/YOUR_PROJECT_ID/agent-control \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1 \
  --add-cloudsql-instances YOUR_DB_CONNECTION \
  --set-env-vars NODE_ENV=production \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,DATABASE_URL=DATABASE_URL:latest
```

#### 5. Get Your URL

```bash
gcloud run services describe agent-control \
  --region=us-central1 \
  --format='value(status.url)'
```

## Post-Deployment

### Initialize Database

```bash
# Connect to your Cloud Run service
SERVICE_URL=$(gcloud run services describe agent-control \
  --region=us-central1 \
  --format='value(status.url)')

# The database will auto-initialize on first request
# Or manually run migrations (optional)
gcloud run services update agent-control \
  --command="npm,run,db:push"
```

### Install as PWA

1. Visit your Cloud Run URL
2. Click "Install" in browser
3. App installs on your device
4. Start creating AI missions!

## Monitoring (FREE)

```bash
# View logs
gcloud run services logs read agent-control \
  --region=us-central1 \
  --limit=50

# View metrics
gcloud run services describe agent-control \
  --region=us-central1
```

## Free Tier Limits

**Cloud Run (FREE tier)**:
- 2 million requests/month
- 180,000 vCPU-seconds/month
- 360,000 GiB-seconds/month
- With our config: ~100,000+ missions/month

**Cloud SQL (FREE tier eligible)**:
- f1-micro: 0.6GB RAM, shared CPU
- 10GB storage
- Perfect for agent data

**Gemini API (FREE tier)**:
- 60 requests/minute
- ~2,500 missions/day

**Total missions/month**: ~75,000 (FREE!)

## Cost After Free Tier

If you exceed free tier (unlikely for personal use):
- Cloud Run: $0.000024/vCPU-second
- Cloud SQL: $0.017/hour = ~$12/month
- Gemini: Still very cheap after free tier

**Even if you exceed free tier: ~$12-15/month max**

## CI/CD (Optional)

### Auto-deploy on git push

```bash
# Connect GitHub repo
gcloud builds triggers create github \
  --repo-name=YOUR_REPO \
  --repo-owner=YOUR_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

Now every push to main auto-deploys!

## Troubleshooting

### Database connection issues

```bash
# Check Cloud SQL status
gcloud sql instances describe agent-control-db

# Test connection
gcloud sql connect agent-control-db --user=postgres
```

### Cloud Run errors

```bash
# View logs
gcloud run services logs read agent-control --limit=100

# Check secrets
gcloud secrets versions access latest --secret=GEMINI_API_KEY
```

### Out of memory

```bash
# Increase memory (still free tier)
gcloud run services update agent-control \
  --memory 1Gi \
  --region us-central1
```

## Cleanup (if needed)

```bash
# Delete everything
gcloud run services delete agent-control --region=us-central1
gcloud sql instances delete agent-control-db
gcloud secrets delete GEMINI_API_KEY
gcloud secrets delete DATABASE_URL
```

## Next Steps

1. ✅ Deploy using script or manual steps
2. ✅ Visit your Cloud Run URL
3. ✅ Install as PWA on your devices
4. ✅ Create your first AI agent
5. ✅ Run unlimited missions for FREE!

## Support

- GCP Free Tier: https://cloud.google.com/free
- Cloud Run Docs: https://cloud.google.com/run/docs
- Gemini API: https://ai.google.dev/

---

**You now have a production-grade AI agent swarm running 100% FREE on Google Cloud! 🎉**
