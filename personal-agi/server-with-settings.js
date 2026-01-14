const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.static('.'));

// Initialize database
pool.query(`
  CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_message TEXT,
    agent_response TEXT,
    model_used VARCHAR(100),
    timestamp TIMESTAMP DEFAULT NOW()
  )
`).catch(console.error);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/chat', async (req, res) => {
  try {
    const { message, settings = {} } = req.body;

    // Get settings with defaults
    const modelName = settings.model || 'gemini-2.0-flash-exp';
    const systemInstructions = settings.systemInstructions || 'You are a helpful AI assistant with memory.';
    const temperature = settings.temperature !== undefined ? settings.temperature : 1.0;
    const topP = settings.topP !== undefined ? settings.topP : 0.95;
    const maxTokens = settings.maxTokens || 8192;
    const topK = settings.topK || 40;

    console.log('🤖 Using model:', modelName);
    console.log('⚙️ Settings:', { temperature, topP, maxTokens, topK });

    // Get conversation history
    const history = await pool.query(
      'SELECT * FROM conversations ORDER BY timestamp DESC LIMIT 10'
    );

    // Build context from history
    let context = systemInstructions + '\n\n';

    if (history.rows.length > 0) {
      context += 'Previous conversation:\n';
      history.rows.reverse().forEach(row => {
        context += `User: ${row.user_message}\nAssistant: ${row.agent_response}\n\n`;
      });
    }

    context += `Current message from user: ${message}`;

    // Get the model with settings
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: temperature,
        topP: topP,
        topK: topK,
        maxOutputTokens: maxTokens,
      }
    });

    // Generate response
    const result = await model.generateContent(context);
    const response = result.response.text();

    console.log('✅ Response generated');

    // Save to database
    await pool.query(
      'INSERT INTO conversations (user_message, agent_response, model_used) VALUES ($1, $2, $3)',
      [message, response, modelName]
    );

    res.json({
      success: true,
      message: response,
      model: modelName
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: error.message,
      details: error.toString()
    });
  }
});

// Get conversation history
app.get('/api/history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM conversations ORDER BY timestamp DESC LIMIT 50'
    );
    res.json({ success: true, conversations: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🤖 Personal AGI with Settings        ║
║   Port: ${PORT}                        ║
║   Status: RUNNING                      ║
╚════════════════════════════════════════╝
  `);
});
