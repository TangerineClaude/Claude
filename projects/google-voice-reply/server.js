require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const REDIRECT_URI = `http://localhost:${PORT}/auth/callback`;
const TOKEN_PATH = path.join(__dirname, '.tokens.json');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Auto-refresh tokens on expiry
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    const existing = loadStoredTokens() || {};
    saveTokens({ ...existing, ...tokens });
  } else {
    const existing = loadStoredTokens() || {};
    saveTokens({ ...existing, access_token: tokens.access_token, expiry_date: tokens.expiry_date });
  }
});

function loadStoredTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    }
  } catch (_) {}
  return null;
}

function loadTokens() {
  const tokens = loadStoredTokens();
  if (tokens) {
    oauth2Client.setCredentials(tokens);
    return true;
  }
  return false;
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

function isAuthenticated() {
  return loadTokens() && !!oauth2Client.credentials.access_token;
}

function getGmail() {
  loadTokens();
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function extractBody(payload) {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain') {
        const text = extractBody(part);
        if (text) return text;
      }
    }
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }
  return '';
}

function getHeader(headers, name) {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

// Clean up Google Voice email bodies — they contain the SMS text followed by footer
function parseGVBody(raw) {
  const text = raw.trim();
  // GV emails have the SMS content before a long separator/footer
  const footerMarkers = [
    /^-+\s*$/m,
    /^_{3,}/m,
    /Reply to this email/i,
    /Google Voice/i,
    /To respond/i,
    /You received a text/i,
  ];
  let cutAt = text.length;
  for (const marker of footerMarkers) {
    const match = text.search(marker);
    if (match > 0 && match < cutAt) cutAt = match;
  }
  return text.slice(0, cutAt).trim();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth ──────────────────────────────────────────────────────────────────────

app.get('/auth/login', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    prompt: 'consent',
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    saveTokens(tokens);
    res.redirect('/');
  } catch (err) {
    res.status(500).send(`Auth failed: ${err.message}`);
  }
});

app.get('/auth/logout', (req, res) => {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  oauth2Client.revokeCredentials().catch(() => {});
  res.json({ success: true });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: isAuthenticated() });
});

// ── Messages ──────────────────────────────────────────────────────────────────

app.get('/api/threads', async (req, res) => {
  if (!isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const gmail = getGmail();

    // Google Voice sends SMS notifications from these senders
    const query = 'from:(voice-noreply@google.com OR txt.voice.google.com OR voice@msg.google.com)';

    const listResp = await gmail.users.threads.list({
      userId: 'me',
      q: query,
      maxResults: 30,
    });

    const threadList = listResp.data.threads || [];
    const threads = [];

    for (const t of threadList) {
      const threadDetail = await gmail.users.threads.get({
        userId: 'me',
        id: t.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'Date', 'From'],
      });

      const msgs = threadDetail.data.messages || [];
      if (!msgs.length) continue;

      const lastMsg = msgs[msgs.length - 1];
      const headers = lastMsg.payload.headers;
      const subject = getHeader(headers, 'Subject');
      const date = getHeader(headers, 'Date');

      // Extract phone number from subject like "Text message from +12025551234"
      const phoneMatch = subject.match(/(\+?1?\s*[\d\s\-\(\)]{7,})/);
      const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : 'Unknown';

      threads.push({
        threadId: t.id,
        phone,
        subject,
        date,
        messageCount: msgs.length,
        snippet: threadDetail.data.snippet || '',
      });
    }

    res.json({ threads });
  } catch (err) {
    console.error('Error fetching threads:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/thread/:threadId', async (req, res) => {
  if (!isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const gmail = getGmail();
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: req.params.threadId,
      format: 'full',
    });

    const messages = (thread.data.messages || []).map((msg) => {
      const headers = msg.payload.headers;
      return {
        id: msg.id,
        date: getHeader(headers, 'Date'),
        from: getHeader(headers, 'From'),
        subject: getHeader(headers, 'Subject'),
        messageId: getHeader(headers, 'Message-ID'),
        body: parseGVBody(extractBody(msg.payload)),
      };
    });

    const lastHeaders = thread.data.messages.at(-1)?.payload?.headers || [];
    res.json({
      threadId: req.params.threadId,
      subject: getHeader(lastHeaders, 'Subject'),
      from: getHeader(lastHeaders, 'From'),
      messages,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Suggestion ─────────────────────────────────────────────────────────────

app.post('/api/suggest', async (req, res) => {
  if (!isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { messages, phone } = req.body;

    const history = messages
      .map((m) => {
        const isMe = m.from.toLowerCase().includes('me') || !m.from.includes('voice');
        return `${isMe ? 'Me' : phone || 'Them'}: ${m.body}`;
      })
      .join('\n');

    const latest = messages.at(-1)?.body || '';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system:
        'You draft short, natural SMS replies. Match the tone of the conversation. Reply with only the message text — no quotes, no labels, no explanation.',
      messages: [
        {
          role: 'user',
          content: `Conversation:\n${history}\n\nWrite a reply to their last message: "${latest}"`,
        },
      ],
    });

    res.json({ suggestion: response.content[0].text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Send Reply ────────────────────────────────────────────────────────────────

app.post('/api/send', async (req, res) => {
  if (!isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { threadId, to, subject, body, messageId } = req.body;
    const gmail = getGmail();

    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    const emailLines = [
      `To: ${to}`,
      `Subject: ${replySubject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
    ];

    if (messageId) {
      emailLines.push(`In-Reply-To: ${messageId}`);
      emailLines.push(`References: ${messageId}`);
    }

    emailLines.push('', body);

    const raw = Buffer.from(emailLines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw, threadId },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🎙  Google Voice Reply System`);
  console.log(`   http://localhost:${PORT}\n`);
  if (!isAuthenticated()) {
    console.log(`   ⚠️  Not signed in — visit /auth/login to connect Gmail`);
  }
});
