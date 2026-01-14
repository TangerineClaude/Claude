#!/bin/bash

# Quick Deploy Script for Personal AGI MVP
# Run this on your LOCAL machine (with gcloud installed)

set -e

PROJECT_ID="illusion-of-vm"
REGION="us-central1"
SERVICE_NAME="personal-agi"
GEMINI_API_KEY="AIzaSyCSagEQr3hP61X_v28KDW9gy2Ku6yrk_q4"

echo "🚀 Deploying Personal AGI MVP to Cloud Run"
echo "=========================================="

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "📦 Enabling APIs..."
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    sqladmin.googleapis.com

# Create Cloud SQL instance if it doesn't exist
echo "🗄️  Setting up Cloud SQL..."
if ! gcloud sql instances describe personal-agi-db 2>/dev/null; then
    echo "Creating Cloud SQL instance..."
    gcloud sql instances create personal-agi-db \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --root-password=temp-password-change-me

    echo "Creating database..."
    gcloud sql databases create personal_agi_mvp --instance=personal-agi-db
fi

# Get Cloud SQL connection name
CONNECTION_NAME=$(gcloud sql instances describe personal-agi-db --format="value(connectionName)")
echo "✅ Database connection: $CONNECTION_NAME"

# Build and deploy to Cloud Run
echo "🏗️  Building and deploying..."
gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars "GEMINI_API_KEY=$GEMINI_API_KEY" \
    --set-env-vars "NODE_ENV=production" \
    --add-cloudsql-instances $CONNECTION_NAME \
    --set-env-vars "DATABASE_URL=postgresql://postgres:temp-password-change-me@/$personal_agi_mvp?host=/cloudsql/$CONNECTION_NAME" \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 3 \
    --timeout 300

# Get the URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo ""
echo "✨ DEPLOYMENT COMPLETE! ✨"
echo "=========================="
echo ""
echo "🌐 Your Personal AGI is live at:"
echo "   $SERVICE_URL"
echo ""
echo "🎉 Go check it out NOW!"
echo ""
