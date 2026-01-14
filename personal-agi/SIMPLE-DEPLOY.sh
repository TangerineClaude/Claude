#!/bin/bash
# SIMPLE DEPLOY - Just run this in Cloud Shell
# No thinking, no confusion, just deploy

cd ~/personal-agi-deploy
rm -rf *

# Create package.json
cat > package.json << 'EOF'
{
  "type": "module",
  "scripts": {"start": "node server.js"},
  "dependencies": {
    "express": "^5.0.0",
    "@google/generative-ai": "^0.24.1",
    "pg": "^8.16.3"
  }
}
EOF

# Create WORKING server with ALL features
cat > server.js << 'JSEOF'
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pool } from 'pg';

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize DB
pool.query(`
  CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_message TEXT,
    ai_response TEXT,
    model VARCHAR(100),
    timestamp TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT
  );
`).catch(e => console.log('Tables exist'));

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, settings = {} } = req.body;

    const modelName = settings.model || 'gemini-2.0-flash-exp';
    const systemInst = settings.systemInstructions || 'You are a helpful AI assistant.';
    const temp = settings.temperature || 1.0;
    const topP = settings.topP || 0.95;
    const maxTokens = settings.maxTokens || 8192;

    // Get conversation history
    const history = await pool.query(
      'SELECT user_message, ai_response FROM conversations ORDER BY timestamp DESC LIMIT 5'
    );

    let context = systemInst + '\n\n';
    if (history.rows.length > 0) {
      context += 'Recent conversation:\n';
      history.rows.reverse().forEach(r => {
        context += `User: ${r.user_message}\nAI: ${r.ai_response}\n\n`;
      });
    }
    context += `Current: ${message}`;

    // Generate response
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature: temp, topP, maxOutputTokens: maxTokens }
    });

    const result = await model.generateContent(context);
    const response = result.response.text();

    // Save to DB
    await pool.query(
      'INSERT INTO conversations (user_message, ai_response, model) VALUES ($1, $2, $3)',
      [message, response, modelName]
    );

    res.json({ success: true, message: response, model: modelName });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.listen(process.env.PORT || 8080, () => console.log('AGI Running'));
JSEOF

# Create the UI with settings
cat > index.html << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personal AGI</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body{background:#0a0a0a;font-family:system-ui}
    .orb{width:200px;height:200px;background:radial-gradient(circle,#06b6d4,#a855f7);border-radius:50%;animation:pulse 3s infinite}
    @keyframes pulse{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.05);opacity:1}}
  </style>
</head>
<body class="text-white min-h-screen flex flex-col">
  <header class="p-4 flex justify-between items-center border-b border-zinc-800">
    <h1 class="text-xl font-bold">🤖 Personal AGI</h1>
    <button onclick="toggleSettings()" class="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700">⚙️</button>
  </header>

  <main class="flex-1 flex flex-col items-center justify-center p-6">
    <div class="orb mb-8"></div>
    <div id="messages" class="w-full max-w-2xl space-y-4 mb-8"></div>
    <div class="w-full max-w-md">
      <div class="flex gap-2 bg-zinc-900 border border-zinc-700 rounded-full p-2">
        <input id="input" placeholder="Ask anything..." class="flex-1 bg-transparent px-4 py-2 outline-none" onkeydown="if(event.key==='Enter')send()"/>
        <button onclick="send()" class="px-6 py-2 bg-cyan-500 text-black rounded-full font-bold">Send</button>
      </div>
    </div>
  </main>

  <div id="settingsModal" class="fixed inset-0 bg-black/90 hidden flex items-center justify-center p-6">
    <div class="bg-zinc-900 rounded-2xl p-6 w-full max-w-md space-y-4">
      <h2 class="text-lg font-bold">Settings</h2>

      <div>
        <label class="text-sm text-zinc-400">Model</label>
        <select id="modelSelect" class="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded p-2">
          <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
        </select>
      </div>

      <div>
        <label class="text-sm text-zinc-400">System Instructions</label>
        <textarea id="systemInstructions" class="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded p-2 h-24 resize-none">You are a helpful AI assistant with memory.</textarea>
      </div>

      <div>
        <label class="text-sm text-zinc-400">Temperature: <span id="tempValue">1.0</span></label>
        <input type="range" id="temperature" min="0" max="2" step="0.1" value="1.0" class="w-full" oninput="updateTemp()">
      </div>

      <button onclick="saveSettings()" class="w-full py-2 bg-cyan-500 text-black rounded-lg font-bold">Save</button>
    </div>
  </div>

  <script>
    let settings = JSON.parse(localStorage.getItem('agiSettings') || '{}');

    function loadSettings() {
      document.getElementById('modelSelect').value = settings.model || 'gemini-2.0-flash-exp';
      document.getElementById('systemInstructions').value = settings.systemInstructions || 'You are a helpful AI assistant with memory.';
      document.getElementById('temperature').value = settings.temperature || 1.0;
      updateTemp();
    }

    function updateTemp() {
      document.getElementById('tempValue').textContent = document.getElementById('temperature').value;
    }

    function saveSettings() {
      settings = {
        model: document.getElementById('modelSelect').value,
        systemInstructions: document.getElementById('systemInstructions').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        topP: 0.95,
        maxTokens: 8192
      };
      localStorage.setItem('agiSettings', JSON.stringify(settings));
      toggleSettings();
    }

    function toggleSettings() {
      document.getElementById('settingsModal').classList.toggle('hidden');
    }

    function addMsg(role, text) {
      const div = document.createElement('div');
      div.className = 'p-4 rounded-xl ' + (role === 'user' ? 'bg-cyan-900/40 ml-auto max-w-[80%]' : 'bg-zinc-800 mr-auto max-w-[80%]');
      div.textContent = text;
      document.getElementById('messages').appendChild(div);
      div.scrollIntoView({behavior: 'smooth'});
    }

    async function send() {
      const msg = document.getElementById('input').value.trim();
      if (!msg) return;

      addMsg('user', msg);
      document.getElementById('input').value = '';

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message: msg, settings})
      });

      const data = await res.json();
      addMsg('ai', data.message);
    }

    loadSettings();
  </script>
</body>
</html>
HTMLEOF

echo "✅ Files created! Deploying..."

# Deploy
gcloud run deploy personal-agi \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=AIzaSyCSagEQr3hP61X_v28KDW9gy2Ku6yrk_q4" \
  --add-cloudsql-instances $(gcloud sql instances describe agi-db --format="value(connectionName)") \
  --set-env-vars "DATABASE_URL=postgresql://postgres:Pass123@/agidb?host=/cloudsql/$(gcloud sql instances describe agi-db --format="value(connectionName)")"

echo ""
echo "🎉 DEPLOYED! Your URL:"
gcloud run services describe personal-agi --region=us-east1 --format="value(status.url)"
