# 🚀 Personal AGI - MVP Quick Deploy

## What You Have

A **super simple** Personal AGI that:
- ✅ Has a clean chat interface
- ✅ Remembers all conversations
- ✅ Uses Gemini 2.0 Flash (your credits!)
- ✅ Deploys to Cloud Run (free tier)

## Deploy NOW (5 minutes)

### Option 1: One-Click Deploy (Recommended)

On your **local machine** (with gcloud installed):

```bash
cd personal-agi
bash deploy-mvp.sh
```

That's it! It will:
1. Enable GCP APIs
2. Create Cloud SQL database
3. Build and deploy to Cloud Run
4. Give you a live URL

### Option 2: Manual Deploy

If you want to do it manually:

```bash
# Set project
gcloud config set project illusion-of-vm

# Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com sqladmin.googleapis.com

# Create database
gcloud sql instances create personal-agi-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1

gcloud sql databases create personal_agi_mvp --instance=personal-agi-db

# Deploy to Cloud Run
gcloud run deploy personal-agi \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars "GEMINI_API_KEY=AIzaSyCSagEQr3hP61X_v28KDW9gy2Ku6yrk_q4"
```

## Test Locally First (Optional)

If you want to test before deploying:

```bash
# Install dependencies
npm install express cors body-parser @google/generative-ai pg dotenv

# Start local server
node server-mvp.js

# Open http://localhost:8080
```

## What's Different from Full Version

**Kept:**
- ✅ Chat interface
- ✅ Conversation memory
- ✅ PostgreSQL database

**Removed:**
- ❌ Claude/OpenAI (just Gemini)
- ❌ SMS/Twilio
- ❌ Browser automation
- ❌ Complex verification
- ❌ 90% of dependencies

**Result:** Clean, simple, FAST to deploy.

## After Deploy

You'll get a URL like:
```
https://personal-agi-xxxxx.run.app
```

Open it and start chatting! Your AGI will:
- Remember everything you tell it
- Reference past conversations
- Just work™

## Cost

**Free tier covers:**
- Cloud Run: 2M requests/month free
- Cloud SQL: $7/month for db-f1-micro
- Gemini API: You have credits!

**Total: ~$7/month** (or free if you use Cloud Run with different DB)

## Files Created

- `server-mvp.js` - Simplified backend (150 lines)
- `index-mvp.html` - Clean chat UI
- `deploy-mvp.sh` - One-click deploy script
- `Dockerfile.mvp` - Minimal container

## Next Steps

After it's live:
1. Chat with your AGI
2. See it remember conversations
3. Feel proud! 🎉
4. Then we can add features later

---

**Ready?** Run `bash deploy-mvp.sh` and you'll be live in 5 minutes! 🚀
