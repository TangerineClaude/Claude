#!/bin/bash

# Personal AGI - GCP Setup Script
# This script sets up the Google Cloud Platform infrastructure

set -e

echo "🚀 Personal AGI - GCP Setup"
echo "================================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Prompt for project ID
read -p "Enter your GCP Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID is required"
    exit 1
fi

echo ""
echo "📋 Setting up project: $PROJECT_ID"
echo ""

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    containerregistry.googleapis.com

# Create Cloud SQL PostgreSQL instance
echo ""
read -p "Create Cloud SQL PostgreSQL instance? (y/n): " CREATE_DB

if [ "$CREATE_DB" = "y" ]; then
    echo "📦 Creating Cloud SQL PostgreSQL instance..."

    gcloud sql instances create personal-agi-db \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=us-central1 \
        --storage-type=SSD \
        --storage-size=10GB \
        --backup \
        --retained-backups-count=7 \
        --database-flags=cloudsql.iam_authentication=on

    # Create database
    gcloud sql databases create personal_agi --instance=personal-agi-db

    # Get connection name
    CONNECTION_NAME=$(gcloud sql instances describe personal-agi-db --format="value(connectionName)")
    echo "✅ Database created. Connection name: $CONNECTION_NAME"
fi

# Create secrets
echo ""
echo "🔐 Setting up secrets..."

# Function to create secret
create_secret() {
    local secret_name=$1
    local secret_prompt=$2

    read -sp "$secret_prompt: " secret_value
    echo ""

    if [ ! -z "$secret_value" ]; then
        echo -n "$secret_value" | gcloud secrets create $secret_name \
            --data-file=- \
            --replication-policy="automatic" 2>/dev/null || \
        echo -n "$secret_value" | gcloud secrets versions add $secret_name --data-file=-

        echo "✅ Secret $secret_name created/updated"
    fi
}

create_secret "CLAUDE_API_KEY" "Enter your Claude API key"
create_secret "GEMINI_API_KEY" "Enter your Gemini API key"
create_secret "OPENAI_API_KEY" "Enter your OpenAI API key (optional, press enter to skip)"
create_secret "TWILIO_ACCOUNT_SID" "Enter your Twilio Account SID"
create_secret "TWILIO_AUTH_TOKEN" "Enter your Twilio Auth Token"
create_secret "TWILIO_PHONE_NUMBER" "Enter your Twilio Phone Number"
create_secret "USER_PHONE_NUMBER" "Enter your phone number"

# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -base64 32)
echo -n "$ENCRYPTION_KEY" | gcloud secrets create ENCRYPTION_KEY \
    --data-file=- \
    --replication-policy="automatic" 2>/dev/null || \
echo -n "$ENCRYPTION_KEY" | gcloud secrets versions add ENCRYPTION_KEY --data-file=-
echo "✅ Encryption key generated"

# Build and deploy
echo ""
read -p "Build and deploy to Cloud Run now? (y/n): " DEPLOY_NOW

if [ "$DEPLOY_NOW" = "y" ]; then
    echo "🏗️  Building and deploying..."

    # Submit build
    gcloud builds submit --config=infrastructure/cloudbuild.yaml .

    echo ""
    echo "✅ Deployment complete!"
    echo ""

    # Get service URL
    SERVICE_URL=$(gcloud run services describe personal-agi --region=us-central1 --format="value(status.url)")
    echo "🌐 Your Personal AGI is now available at:"
    echo "   $SERVICE_URL"
fi

echo ""
echo "================================"
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up database schema:"
echo "   - Connect to Cloud SQL and run infrastructure/database-schema.sql"
echo "2. Configure Twilio webhook:"
echo "   - Set webhook URL to: \$SERVICE_URL/api/verification/sms-webhook"
echo "3. Access your Personal AGI at the service URL above"
echo ""
