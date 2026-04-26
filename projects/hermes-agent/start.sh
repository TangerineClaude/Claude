#!/usr/bin/env bash
# Start the Hermes Telegram Gateway (foreground, for testing)
# For 24/7 operation install the systemd service instead.

set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
    echo "Error: .env not found. Copy .env.example to .env and fill in your keys."
    exit 1
fi

if [ ! -d venv ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install -q -r requirements.txt
fi

echo "Starting Hermes Telegram Gateway..."
exec ./venv/bin/python telegram_gateway.py
