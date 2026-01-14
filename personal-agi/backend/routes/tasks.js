const express = require('express');
const router = express.Router();
const Database = require('../memory/database');
const VerificationManager = require('../security/verification');
const BrowserAgent = require('../agents/browser_agent');
const CredentialManager = require('../security/credentials');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * POST /api/tasks/create
 * Create a new task
 */
router.post('/create', async (req, res) => {
  try {
    const { description, priority, verificationRequired, metadata } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const task = await Database.createTask({
      description,
      priority: priority || 5,
      verificationRequired: verificationRequired !== false,
      verificationMethod: 'sms',
      metadata
    });

    res.json({ success: true, task });
  } catch (error) {
    logger.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * GET /api/tasks/list
 * Get active tasks
 */
router.get('/list', async (req, res) => {
  try {
    const tasks = await Database.getActiveTasks();
    res.json({ success: true, tasks });
  } catch (error) {
    logger.error('List tasks error:', error);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

/**
 * POST /api/tasks/execute
 * Execute a specific task
 */
router.post('/execute', async (req, res) => {
  try {
    const { taskId, taskType, params } = req.body;

    if (!taskId || !taskType) {
      return res.status(400).json({ error: 'taskId and taskType are required' });
    }

    // Update task status
    await Database.updateTaskStatus(taskId, 'in_progress');

    let result;

    switch (taskType) {
      case 'chatgpt_export':
        result = await executeChatGPTExport(taskId, params);
        break;

      case 'browser_automation':
        result = await executeBrowserAutomation(taskId, params);
        break;

      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }

    // Update task with result
    await Database.updateTaskStatus(taskId, 'completed', result);

    res.json({ success: true, result });
  } catch (error) {
    logger.error('Execute task error:', error);

    // Update task as failed
    if (req.body.taskId) {
      await Database.updateTaskStatus(req.body.taskId, 'failed', null, error.message);
    }

    res.status(500).json({ error: 'Task execution failed', message: error.message });
  }
});

/**
 * Execute ChatGPT export task
 */
async function executeChatGPTExport(taskId, params) {
  const browserAgent = new BrowserAgent();

  try {
    // Check if we need to login first
    const hasSession = await browserAgent.loadSession('chatgpt');

    if (!hasSession) {
      // Get credentials
      const credentials = await CredentialManager.getCredentials('chatgpt');

      // Execute with verification
      await VerificationManager.executeWithVerification(
        {
          task_id: taskId,
          description: 'Logging into ChatGPT',
          requires_credentials: true
        },
        async () => {
          await browserAgent.initialize(false); // Non-headless for debugging
          await browserAgent.loginToChatGPT(credentials);
        }
      );
    } else {
      await browserAgent.initialize();
      await browserAgent.createContext('chatgpt');
    }

    // Export chats
    const outputDir = params.outputDir || '/tmp/chatgpt-exports';
    const result = await browserAgent.exportChatGPTChats(outputDir);

    return result;
  } finally {
    await browserAgent.close();
  }
}

/**
 * Execute generic browser automation task
 */
async function executeBrowserAutomation(taskId, params) {
  const browserAgent = new BrowserAgent();

  try {
    await browserAgent.initialize();

    const result = await browserAgent.navigateAndPerform(
      params.url,
      params.actions || []
    );

    return result;
  } finally {
    await browserAgent.close();
  }
}

module.exports = router;
