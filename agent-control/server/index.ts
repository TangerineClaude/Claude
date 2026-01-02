import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import agentsRouter from './routes/agents.js';
import missionsRouter from './routes/missions.js';
import tasksRouter from './routes/tasks.js';
import logsRouter from './routes/logs.js';
import { agentEngine } from './agent-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API routes
app.use('/api/agents', agentsRouter);
app.use('/api/missions', missionsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/logs', logsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'online' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Agent Control server running on http://localhost:${PORT}`);

  // Start the agent engine
  agentEngine.start();
});
