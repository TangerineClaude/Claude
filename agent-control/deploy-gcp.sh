#!/bin/bash

# GCP Free Tier Deployment Script for Agent Control
# This script deploys to Google Cloud Platform's free tier

set -e

echo "🚀 Deploying Agent Control to GCP (FREE tier)"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project ID
read -p "Enter your GCP Project ID: " PROJECT_ID
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "📦 Enabling required APIs..."
gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com

# Get Gemini API key
echo ""
echo "🔑 Setting up Gemini API key..."
echo "Get your FREE Gemini API key at: https://makersuite.google.com/app/apikey"
read -p "Enter your Gemini API key: " GEMINI_KEY

# Store in Secret Manager (free)
echo "Storing Gemini API key in Secret Manager..."
echo -n "$GEMINI_KEY" | gcloud secrets create GEMINI_API_KEY \
    --data-file=- \
    --replication-policy="automatic" \
    2>/dev/null || \
echo -n "$GEMINI_KEY" | gcloud secrets versions add GEMINI_API_KEY \
    --data-file=-

# Create Cloud SQL instance (free tier eligible)
echo ""
echo "🗄️  Creating PostgreSQL database (this may take 5-10 minutes)..."
INSTANCE_NAME="agent-control-db"

# Check if instance already exists
if gcloud sql instances describe $INSTANCE_NAME &>/dev/null; then
    echo "Database instance already exists, skipping creation..."
else
    gcloud sql instances create $INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=us-central1 \
        --storage-type=HDD \
        --storage-size=10GB \
        --no-backup
fi

# Create database
echo "Creating database..."
gcloud sql databases create agent_control \
    --instance=$INSTANCE_NAME \
    2>/dev/null || echo "Database already exists"

# Get database connection string
DB_CONNECTION=$(gcloud sql instances describe $INSTANCE_NAME \
    --format='value(connectionName)')

# Create database user
echo "Setting database password..."
read -sp "Enter database password: " DB_PASSWORD
echo ""

gcloud sql users create postgres \
    --instance=$INSTANCE_NAME \
    --password="$DB_PASSWORD" \
    2>/dev/null || \
gcloud sql users set-password postgres \
    --instance=$INSTANCE_NAME \
    --password="$DB_PASSWORD"

# Store database URL in Secret Manager
DB_URL="postgresql://postgres:${DB_PASSWORD}@/agent_control?host=/cloudsql/${DB_CONNECTION}"
echo -n "$DB_URL" | gcloud secrets create DATABASE_URL \
    --data-file=- \
    --replication-policy="automatic" \
    2>/dev/null || \
echo -n "$DB_URL" | gcloud secrets versions add DATABASE_URL \
    --data-file=-

# Build and deploy to Cloud Run
echo ""
echo "🏗️  Building and deploying to Cloud Run..."

# Build container
gcloud builds submit --tag gcr.io/$PROJECT_ID/agent-control

# Deploy to Cloud Run with Cloud SQL connection
gcloud run deploy agent-control \
    --image gcr.io/$PROJECT_ID/agent-control \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 3000 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 1 \
    --add-cloudsql-instances $DB_CONNECTION \
    --set-env-vars NODE_ENV=production \
    --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,DATABASE_URL=DATABASE_URL:latest

# Get service URL
SERVICE_URL=$(gcloud run services describe agent-control \
    --region=us-central1 \
    --format='value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your Agent Control PWA is live at:"
echo "   $SERVICE_URL"
echo ""
echo "📱 Visit the URL and click 'Install' to add it to your device!"
echo ""
echo "💰 Cost: FREE! (within GCP free tier limits)"
echo ""
echo "📊 Free tier includes:"
echo "   - 2 million Cloud Run requests/month"
echo "   - 180,000 vCPU-seconds/month"
echo "   - Cloud SQL f1-micro instance"
echo "   - Gemini API (60 requests/minute)"
echo ""
