# Personal AGI Deployment - To-Do List for Claude Code

## Current Situation
- Personal AGI MVP is ready to deploy
- All code files exist in this directory
- Using Google Cloud Run + Cloud SQL PostgreSQL + Gemini API
- Previous deployment failed due to Cloud Shell authentication timeout
- Database instance `agi-db` already exists in us-central1

## Project Details
- **GCP Project**: illusion-of-vm
- **Gemini API Key**: AIzaSyCSagEQr3hP61X_v28KDW9gy2Ku6yrk_q4
- **Database Instance**: illusion-of-vm:us-central1:agi-db
- **Database Name**: agidb
- **Database Password**: Pass123
- **Deploy Region**: us-east1
- **Service Name**: personal-agi

## Features Implemented
✅ Chat interface with pulsing orb UI
✅ Google AI Studio-style settings panel
✅ Model selection (Gemini 2.0 Flash, Gemini 2.5 Pro, etc.)
✅ Custom system instructions
✅ Temperature, Top P, Top K, Max Tokens controls
✅ Conversation memory (PostgreSQL)
✅ Voice recording (hold button to record, release to transcribe)
✅ LocalStorage settings persistence

## Files to Deploy
The deployment script `SIMPLE-DEPLOY.sh` creates:
- `package.json` - ES module config with dependencies
- `server.js` - Express server with Gemini + PostgreSQL + all features
- `index.html` - Complete UI with settings modal

## Tasks to Complete

### 1. Authenticate with Google Cloud
```bash
# Set project
gcloud config set project illusion-of-vm

# Verify authentication
gcloud auth list

# If no active account, authenticate
gcloud auth login
```

### 2. Verify Database Exists
```bash
# Check if agi-db instance exists
gcloud sql instances describe agi-db --format="value(connectionName)"

# If it exists, verify database 'agidb' exists
gcloud sql databases list --instance=agi-db | grep agidb

# If database doesn't exist, create it
gcloud sql databases create agidb --instance=agi-db
```

### 3. Deploy Using SIMPLE-DEPLOY.sh
```bash
# Make script executable
chmod +x SIMPLE-DEPLOY.sh

# Run deployment (creates files in ~/personal-agi-deploy and deploys)
bash SIMPLE-DEPLOY.sh
```

**Expected Output**:
- Creates ~/personal-agi-deploy directory
- Writes package.json, server.js, index.html
- Deploys to Cloud Run
- Returns live URL

### 4. If SIMPLE-DEPLOY.sh Fails, Manual Deployment
```bash
# Create deployment directory
mkdir -p ~/personal-agi-manual
cd ~/personal-agi-manual

# Copy the complete files from SIMPLE-DEPLOY.sh
# (Create package.json, server.js, index.html with ES modules)

# Deploy to Cloud Run
gcloud run deploy personal-agi \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=AIzaSyCSagEQr3hP61X_v28KDW9gy2Ku6yrk_q4" \
  --add-cloudsql-instances illusion-of-vm:us-central1:agi-db \
  --set-env-vars "DATABASE_URL=postgresql://postgres:Pass123@/agidb?host=/cloudsql/illusion-of-vm:us-central1:agi-db" \
  --memory 1Gi
```

### 5. Verify Deployment
```bash
# Get service URL
gcloud run services describe personal-agi \
  --region us-east1 \
  --format="value(status.url)"

# Check service logs
gcloud run services logs read personal-agi --region us-east1 --limit 50

# Test health endpoint
SERVICE_URL=$(gcloud run services describe personal-agi --region us-east1 --format="value(status.url)")
curl $SERVICE_URL/health
```

### 6. Test the Application
- Open the service URL in browser
- Verify pulsing orb appears
- Click settings button (⚙️) to verify settings panel works
- Send a test message
- Check if conversation memory works (send follow-up message)
- Test voice recording (if in browser with microphone)

### 7. Common Issues and Fixes

**Issue**: IAM permissions error for Cloud Build
**Fix**:
```bash
PROJECT_NUMBER=$(gcloud projects describe illusion-of-vm --format="value(projectNumber)")
gcloud projects add-iam-policy-binding illusion-of-vm \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"
```

**Issue**: Container failed to start
**Check**: Server logs for errors
```bash
gcloud run services logs read personal-agi --region us-east1 --limit 100
```

**Issue**: Database connection failed
**Check**: Database is running and connection string is correct
```bash
gcloud sql instances describe agi-db
```

## Success Criteria
✅ Service deploys without errors
✅ Service URL is accessible
✅ Health endpoint returns `{"status":"ok"}`
✅ Chat interface loads with pulsing orb
✅ Settings panel opens and closes
✅ Can send messages and receive AI responses
✅ Conversation memory persists (follow-up messages reference previous context)

## Next Steps After Deployment
1. Test all features thoroughly
2. Add custom features as needed
3. Monitor logs for any errors
4. Scale up resources if needed (currently 1Gi memory)

## Notes
- All code uses ES modules (`import` not `require`)
- Settings stored in browser LocalStorage
- Database auto-initializes tables on first run
- Voice transcription uses Gemini's multimodal capabilities
- UI uses Tailwind CSS via CDN (no build step needed)
