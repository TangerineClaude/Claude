const express = require('express');
const router = express.Router();
const ModelRouter = require('../agents/model_router');
const ClaudeAgent = require('../agents/claude_agent');
const ContextManager = require('../memory/context_manager');
const Database = require('../memory/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const modelRouter = new ModelRouter();

/**
 * POST /api/conversation/chat
 * Main chat endpoint
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, options = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    logger.info('Received chat message', { messageLength: message.length });

    // Build context from past conversations and memories
    const context = await ContextManager.buildContext(message, {
      includeConversations: true,
      includeMemories: true,
      maxConversations: 5,
      maxMemories: 10
    });

    // Format context for LLM
    const contextString = ContextManager.formatContextForLLM(context);

    // Augment message with context
    const augmentedMessage = contextString
      ? `${contextString}\n\n---\n\nCurrent Message: ${message}`
      : message;

    // Analyze task to select appropriate model
    const claudeAgent = new ClaudeAgent();
    const taskAnalysis = await claudeAgent.analyzeTask(message);

    // Select model based on task
    const selectedModel = modelRouter.selectModel(taskAnalysis, options.model);

    logger.info('Task analyzed', {
      taskType: taskAnalysis.task_type,
      complexity: taskAnalysis.complexity,
      selectedModel
    });

    // Get response from selected model
    const response = await modelRouter.chat(augmentedMessage, {
      model: selectedModel,
      streamCallback: options.stream ? (chunk) => {
        // For streaming, we'd use Server-Sent Events or WebSockets
        // For MVP, we'll return full response
      } : null
    });

    // Save conversation to memory
    await ContextManager.saveConversation({
      userMessage: message,
      agentResponse: response.message,
      modelUsed: response.model,
      taskCategory: taskAnalysis.task_type,
      tokensUsed: response.usage.totalTokens,
      costEstimate: response.cost.totalCost,
      metadata: {
        taskAnalysis,
        context: {
          conversationsUsed: context.recentConversations.length,
          memoriesUsed: context.relevantMemories.length
        }
      }
    });

    // Track model usage
    await Database.trackModelUsage({
      modelName: response.model,
      taskId: null,
      conversationId: null,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost.totalCost,
      latencyMs: response.latency,
      success: true
    });

    res.json({
      success: true,
      message: response.message,
      model: response.model,
      usage: response.usage,
      cost: response.cost,
      latency: response.latency,
      taskAnalysis
    });
  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message
    });
  }
});

/**
 * GET /api/conversation/history
 * Get conversation history
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const conversations = await ContextManager.getRecentConversations(limit);

    res.json({
      success: true,
      conversations: conversations.map(c => ({
        id: c.id,
        timestamp: c.timestamp,
        userMessage: c.user_message,
        agentResponse: c.agent_response,
        model: c.model_used,
        category: c.task_category
      }))
    });
  } catch (error) {
    logger.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to retrieve history' });
  }
});

/**
 * POST /api/conversation/search
 * Search conversations
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await ContextManager.searchConversations(query, limit);

    res.json({
      success: true,
      results: results.map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        userMessage: r.user_message,
        agentResponse: r.agent_response,
        similarity: 1 - r.distance // Convert distance to similarity score
      }))
    });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/conversation/summary
 * Get context summary
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await ContextManager.getSummary();
    res.json({ success: true, summary });
  } catch (error) {
    logger.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

module.exports = router;
