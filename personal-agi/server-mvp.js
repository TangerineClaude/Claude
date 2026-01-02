const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Initialize Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('frontend/chat-interface'));

// Initialize database table
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_message TEXT NOT NULL,
        agent_response TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('Database init error:', error);
  } finally {
    client.release();
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('📨 Received:', message);

    // Get conversation history
    const historyResult = await pool.query(
      'SELECT user_message, agent_response FROM conversations ORDER BY timestamp DESC LIMIT 10'
    );

    // Build context from history
    let context = '';
    if (historyResult.rows.length > 0) {
      context = 'Previous conversation:\n';
      historyResult.rows.reverse().forEach(row => {
        context += `User: ${row.user_message}\nAssistant: ${row.agent_response}\n\n`;
      });
    }

    // Create prompt with context
    const fullPrompt = `You are a helpful personal AI assistant with memory of past conversations.

${context}

Current message from user: ${message}

Respond naturally and helpfully. Remember and reference past conversations when relevant.`;

    // Get response from Gemini
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const agentMessage = response.text();

    console.log('🤖 Response:', agentMessage);

    // Save to database
    await pool.query(
      'INSERT INTO conversations (user_message, agent_response) VALUES ($1, $2)',
      [message, agentMessage]
    );

    res.json({
      success: true,
      message: agentMessage,
      model: 'gemini-2.0-flash-exp'
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message
    });
  }
});

// Get conversation history
app.get('/api/history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM conversations ORDER BY timestamp DESC LIMIT 50'
    );

    res.json({
      success: true,
      conversations: result.rows
    });
  } catch (error) {
    console.error('❌ History error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Start server
async function start() {
  try {
    await initDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════╗
║   🤖 Personal AGI MVP                  ║
║   Port: ${PORT}                        ║
║   Status: RUNNING                      ║
╚════════════════════════════════════════╝

Open: http://localhost:${PORT}
      `);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

start();
