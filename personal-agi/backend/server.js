const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const winston = require('winston');

// Import routes
const conversationRoutes = require('./routes/conversation');
const memoryRoutes = require('./routes/memory');
const taskRoutes = require('./routes/tasks');
const verificationRoutes = require('./routes/verification');

// Import core systems
const Database = require('./memory/database');
const MemoryManager = require('./memory/context_manager');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/conversation', conversationRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/verification', verificationRoutes);

// Serve frontend
app.use(express.static('../frontend/chat-interface'));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection
    await Database.initialize();
    logger.info('Database connected successfully');

    // Initialize memory system
    await MemoryManager.initialize();
    logger.info('Memory system initialized');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Personal AGI server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await Database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await Database.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
