const Database = require('./database');
const winston = require('winston');
const OpenAI = require('openai');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class ContextManager {
  constructor() {
    this.db = Database;
    this.embeddingClient = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Initialize embedding client (using OpenAI for embeddings)
    if (process.env.OPENAI_API_KEY) {
      this.embeddingClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    this.initialized = true;
    logger.info('Context manager initialized');
  }

  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text) {
    if (!this.embeddingClient) {
      logger.warn('Embedding client not configured, returning null embedding');
      return null;
    }

    try {
      const response = await this.embeddingClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000) // Limit to 8k chars
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      return null;
    }
  }

  /**
   * Save a conversation to memory
   */
  async saveConversation(data) {
    const { userMessage, agentResponse, modelUsed, taskCategory, relatedProject, tokensUsed, costEstimate, metadata } = data;

    // Generate embedding for the conversation
    const combinedText = `User: ${userMessage}\nAssistant: ${agentResponse}`;
    const embedding = await this.generateEmbedding(combinedText);

    return await this.db.saveConversation({
      userMessage,
      agentResponse,
      modelUsed,
      taskCategory: taskCategory || this.categorizeMessage(userMessage),
      relatedProject,
      tokensUsed,
      costEstimate,
      embedding,
      metadata
    });
  }

  /**
   * Search conversations by semantic similarity
   */
  async searchConversations(query, limit = 10) {
    const queryEmbedding = await this.generateEmbedding(query);

    if (!queryEmbedding) {
      // Fallback to recent conversations if embedding fails
      return await this.db.getRecentConversations(limit);
    }

    return await this.db.searchConversations(queryEmbedding, limit);
  }

  /**
   * Get recent conversations
   */
  async getRecentConversations(limit = 50) {
    return await this.db.getRecentConversations(limit);
  }

  /**
   * Save a memory node
   */
  async saveMemory(data) {
    const { content, category, tags, source, importance, relatedNodes, metadata } = data;

    const embedding = await this.generateEmbedding(content);

    return await this.db.saveMemory({
      content,
      category: category || this.categorizeMessage(content),
      tags: tags || this.extractTags(content),
      source: source || 'manual',
      importance: importance || 5,
      relatedNodes: relatedNodes || [],
      embedding,
      metadata
    });
  }

  /**
   * Search memories by semantic similarity
   */
  async searchMemories(query, limit = 10, category = null) {
    const queryEmbedding = await this.generateEmbedding(query);

    if (!queryEmbedding) {
      logger.warn('Could not generate embedding for search query');
      return [];
    }

    return await this.db.searchMemories(queryEmbedding, limit, category);
  }

  /**
   * Get memories by tags
   */
  async getMemoriesByTags(tags) {
    return await this.db.getMemoriesByTags(tags);
  }

  /**
   * Build context for a conversation
   * Retrieves relevant past conversations and memories
   */
  async buildContext(currentMessage, options = {}) {
    const {
      includeConversations = true,
      includeMemories = true,
      maxConversations = 5,
      maxMemories = 10,
      relatedProject = null
    } = options;

    const context = {
      recentConversations: [],
      relevantMemories: [],
      projectContext: null
    };

    // Get relevant past conversations
    if (includeConversations) {
      context.recentConversations = await this.searchConversations(currentMessage, maxConversations);
    }

    // Get relevant memories
    if (includeMemories) {
      context.relevantMemories = await this.searchMemories(currentMessage, maxMemories);
    }

    // Get project context if specified
    if (relatedProject) {
      const projects = await this.db.getActiveProjects();
      context.projectContext = projects.find(p =>
        p.name.toLowerCase().includes(relatedProject.toLowerCase())
      );
    }

    return context;
  }

  /**
   * Format context into a string for LLM consumption
   */
  formatContextForLLM(context) {
    let formatted = '';

    if (context.recentConversations && context.recentConversations.length > 0) {
      formatted += '## Relevant Past Conversations\n\n';
      context.recentConversations.forEach((conv, idx) => {
        formatted += `### Conversation ${idx + 1} (${new Date(conv.timestamp).toLocaleDateString()})\n`;
        formatted += `User: ${conv.user_message}\n`;
        formatted += `Assistant: ${conv.agent_response}\n\n`;
      });
    }

    if (context.relevantMemories && context.relevantMemories.length > 0) {
      formatted += '## Relevant Memories\n\n';
      context.relevantMemories.forEach((mem, idx) => {
        formatted += `- [${mem.category}] ${mem.content}`;
        if (mem.tags && mem.tags.length > 0) {
          formatted += ` (Tags: ${mem.tags.join(', ')})`;
        }
        formatted += '\n';
      });
      formatted += '\n';
    }

    if (context.projectContext) {
      formatted += '## Current Project Context\n\n';
      formatted += `Project: ${context.projectContext.name}\n`;
      formatted += `Description: ${context.projectContext.description}\n`;
      formatted += `Status: ${context.projectContext.status}\n\n`;
    }

    return formatted;
  }

  /**
   * Automatically categorize a message
   */
  categorizeMessage(message) {
    const lowerMessage = message.toLowerCase();

    // Technical categories
    if (lowerMessage.includes('deploy') || lowerMessage.includes('gcp') || lowerMessage.includes('aws')) {
      return 'deployment';
    }
    if (lowerMessage.includes('code') || lowerMessage.includes('function') || lowerMessage.includes('bug')) {
      return 'technical';
    }
    if (lowerMessage.includes('chatgpt') || lowerMessage.includes('browser') || lowerMessage.includes('website')) {
      return 'browser_automation';
    }

    // Project categories
    if (lowerMessage.includes('project') || lowerMessage.includes('build') || lowerMessage.includes('create')) {
      return 'project';
    }

    // Personal categories
    if (lowerMessage.includes('remind') || lowerMessage.includes('note') || lowerMessage.includes('remember')) {
      return 'personal';
    }

    // Financial
    if (lowerMessage.includes('$') || lowerMessage.includes('pay') || lowerMessage.includes('cost')) {
      return 'finance';
    }

    return 'general';
  }

  /**
   * Extract tags from content
   */
  extractTags(content) {
    const tags = [];
    const lowerContent = content.toLowerCase();

    // Technology tags
    const techKeywords = ['react', 'node', 'python', 'gcp', 'aws', 'docker', 'kubernetes', 'postgres', 'redis'];
    techKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        tags.push(keyword);
      }
    });

    // Platform tags
    const platformKeywords = ['chatgpt', 'claude', 'gemini', 'github', 'replit', 'antigravity'];
    platformKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        tags.push(keyword);
      }
    });

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Import data from iOS Reminders or other sources
   */
  async importData(data, source = 'ios_reminders') {
    const imported = [];

    for (const item of data) {
      try {
        const memory = await this.saveMemory({
          content: item.title || item.content,
          category: item.category || 'imported',
          tags: item.tags || [],
          source: source,
          importance: item.importance || 5,
          metadata: {
            originalId: item.id,
            importedAt: new Date().toISOString(),
            ...item.metadata
          }
        });

        imported.push(memory);
      } catch (error) {
        logger.error('Failed to import item:', { item, error: error.message });
      }
    }

    logger.info(`Imported ${imported.length} items from ${source}`);
    return imported;
  }

  /**
   * Get context summary for the user
   */
  async getSummary() {
    const [conversations, memories, projects] = await Promise.all([
      this.db.query('SELECT COUNT(*) as count FROM conversations'),
      this.db.query('SELECT COUNT(*) as count FROM memory_nodes'),
      this.db.getActiveProjects()
    ]);

    return {
      totalConversations: parseInt(conversations.rows[0].count),
      totalMemories: parseInt(memories.rows[0].count),
      activeProjects: projects.length,
      projects: projects.map(p => ({
        name: p.name,
        status: p.status,
        lastUpdated: p.updated_at
      }))
    };
  }
}

module.exports = new ContextManager();
