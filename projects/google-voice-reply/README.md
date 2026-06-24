# Google Voice Reply System

AI-powered dashboard to read your Google Voice texts and reply with Claude-suggested responses.

## How it works

Google Voice forwards your SMS messages to Gmail. This app reads those emails via the Gmail API, shows them as a chat, and uses Claude to draft reply suggestions. You review and edit before sending — replies go back through Gmail and Google Voice delivers them as texts.

## Setup

### 1. Google Cloud credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or use an existing one)
3. Enable the **Gmail API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URI: `http://localhost:3000/auth/callback`
7. Copy the Client ID and Client Secret

### 2. Anthropic API key

Get your key from [console.anthropic.com](https://console.anthropic.com)

### 3. Configure Google Voice email forwarding

In Google Voice settings → Voicemail & text → make sure **"Message notifications"** sends emails to your Gmail.

### 4. Run the app

```bash
cd projects/google-voice-reply
cp .env.example .env
# Fill in your keys in .env

npm install
npm start
```

Open http://localhost:3000 and click **Sign in with Google**.

## Usage

- **Left panel**: your Google Voice conversations (grouped by thread)
- **Chat area**: full message history with the contact
- **AI bar**: Claude's suggested reply — click it or "Use" to paste into the text box
- **Ctrl+Enter**: send the reply

Sent replies go through Gmail back to Google Voice, which delivers them as SMS.
