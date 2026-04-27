#!/usr/bin/env bash
# Hermes Agent — start script
# Sets up venv automatically and runs the bot.

set -e
cd "$(dirname "$0")"

# Create venv if missing
if [ ! -d venv ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install / update dependencies
pip install -q -r requirements.txt

# Run setup wizard if .env is missing or has no bot token
if [ ! -f .env ] || ! grep -q "TELEGRAM_BOT_TOKEN=." .env 2>/dev/null; then
    echo ""
    echo "No configuration found. Running setup wizard..."
    echo ""
    python setup_wizard.py
fi

# Run doctor check first
echo ""
echo "Running health check..."
python doctor.py
echo ""

# Start the bot
exec python telegram_gateway.py
