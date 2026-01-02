const ClaudeAgent = require('./claude_agent');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class ModelRouter {
  constructor() {
    this.claudeAgent = new ClaudeAgent();
    this.geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
    this.openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

    // Pricing per 1M tokens (approximate as of 2025)
    this.pricing = {
      'claude-sonnet-4': { input: 3.00, output: 15.00, speed: 'medium', quality: 'excellent' },
      'claude-opus-4': { input: 15.00, output: 75.00, speed: 'slow', quality: 'best' },
      'claude-haiku-3': { input: 0.25, output: 1.25, speed: 'fast', quality: 'good' },
      'gemini-2.5-pro': { input: 1.25, output: 5.00, speed: 'fast', quality: 'excellent' },
      'gemini-2.0-flash': { input: 0.10, output: 0.40, speed: 'very_fast', quality: 'good' },
      'gpt-4': { input: 30.00, output: 60.00, speed: 'slow', quality: 'excellent' },
      'gpt-3.5-turbo': { input: 0.50, output: 1.50, speed: 'fast', quality: 'good' }
    };
  }

  /**
   * Select the best model for a given task
   */
  selectModel(taskAnalysis, userPreference = null) {
    // User can override model selection
    if (userPreference) {
      logger.info(`Using user-specified model: ${userPreference}`);
      return this.normalizeModelName(userPreference);
    }

    const { task_type, complexity, requires_credentials } = taskAnalysis;

    // Decision logic based on task characteristics

    // Browser automation - use Gemini (user has credits, fast, cost-effective)
    if (task_type === 'browser_automation') {
      return 'gemini-2.0-flash';
    }

    // Complex reasoning - use Claude Sonnet 4 (best reasoning)
    if (complexity === 'complex' || task_type === 'code_generation') {
      return 'claude-sonnet-4';
    }

    // Deployment/infrastructure - use Claude (better at DevOps)
    if (task_type === 'deployment' || task_type === 'infrastructure') {
      return 'claude-sonnet-4';
    }

    // Research tasks - use Gemini Pro (good quality, user has credits)
    if (task_type === 'research') {
      return 'gemini-2.5-pro';
    }

    // Simple tasks - use Gemini Flash (very cheap, fast)
    if (complexity === 'simple') {
      return 'gemini-2.0-flash';
    }

    // Default to Claude Sonnet for anything uncertain
    return 'claude-sonnet-4';
  }

  normalizeModelName(modelName) {
    const normalized = modelName.toLowerCase();

    if (normalized.includes('claude') && normalized.includes('sonnet')) return 'claude-sonnet-4';
    if (normalized.includes('claude') && normalized.includes('opus')) return 'claude-opus-4';
    if (normalized.includes('claude') && normalized.includes('haiku')) return 'claude-haiku-3';
    if (normalized.includes('gemini') && normalized.includes('pro')) return 'gemini-2.5-pro';
    if (normalized.includes('gemini') && normalized.includes('flash')) return 'gemini-2.0-flash';
    if (normalized.includes('gpt-4')) return 'gpt-4';
    if (normalized.includes('gpt-3.5')) return 'gpt-3.5-turbo';

    return 'claude-sonnet-4'; // Default
  }

  async chat(message, options = {}) {
    const { model = 'claude-sonnet-4', streamCallback, ...otherOptions } = options;
    const startTime = Date.now();

    try {
      let response;
      let usage = {};
      let actualModel = model;

      if (model.startsWith('claude')) {
        response = await this.useClaude(message, model, streamCallback, otherOptions);
        usage = response.usage;
        actualModel = response.model;
      } else if (model.startsWith('gemini')) {
        response = await this.useGemini(message, model, streamCallback);
        usage = response.usage;
        actualModel = model;
      } else if (model.startsWith('gpt')) {
        response = await this.useOpenAI(message, model, streamCallback);
        usage = response.usage;
        actualModel = model;
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }

      const latency = Date.now() - startTime;
      const cost = this.calculateCost(actualModel, usage.inputTokens, usage.outputTokens);

      logger.info('Model response received', {
        model: actualModel,
        latency,
        tokens: usage.totalTokens,
        cost: cost.totalCost
      });

      return {
        message: response.message,
        model: actualModel,
        usage,
        latency,
        cost
      };
    } catch (error) {
      logger.error('Model router error:', {
        model,
        error: error.message
      });
      throw error;
    }
  }

  async useClaude(message, model, streamCallback, options) {
    // Update Claude agent model if needed
    if (model === 'claude-opus-4') {
      this.claudeAgent.model = 'claude-opus-4-20250514';
    } else if (model === 'claude-haiku-3') {
      this.claudeAgent.model = 'claude-3-5-haiku-20241022';
    } else {
      this.claudeAgent.model = 'claude-sonnet-4-20250514';
    }

    return await this.claudeAgent.chat(message, { ...options, streamCallback });
  }

  async useGemini(message, model, streamCallback) {
    if (!this.geminiClient) {
      throw new Error('Gemini API key not configured');
    }

    const modelName = model === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.0-flash';
    const geminiModel = this.geminiClient.getGenerativeModel({ model: modelName });

    if (streamCallback) {
      const result = await geminiModel.generateContentStream(message);
      let fullText = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        streamCallback(chunkText);
      }

      const response = await result.response;
      const usage = response.usageMetadata;

      return {
        message: fullText,
        usage: {
          inputTokens: usage.promptTokenCount || 0,
          outputTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0
        }
      };
    } else {
      const result = await geminiModel.generateContent(message);
      const response = result.response;
      const usage = response.usageMetadata;

      return {
        message: response.text(),
        usage: {
          inputTokens: usage.promptTokenCount || 0,
          outputTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0
        }
      };
    }
  }

  async useOpenAI(message, model, streamCallback) {
    if (!this.openaiClient) {
      throw new Error('OpenAI API key not configured');
    }

    const messages = [{ role: 'user', content: message }];

    if (streamCallback) {
      const stream = await this.openaiClient.chat.completions.create({
        model: model,
        messages: messages,
        stream: true
      });

      let fullText = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullText += content;
        streamCallback(content);
      }

      // Note: streaming doesn't provide usage data directly
      return {
        message: fullText,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0
        }
      };
    } else {
      const response = await this.openaiClient.chat.completions.create({
        model: model,
        messages: messages
      });

      return {
        message: response.choices[0].message.content,
        usage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        }
      };
    }
  }

  calculateCost(model, inputTokens, outputTokens) {
    const pricing = this.pricing[model] || this.pricing['claude-sonnet-4'];

    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      model,
      inputTokens,
      outputTokens
    };
  }

  getModelInfo(model) {
    return {
      model,
      ...this.pricing[model]
    };
  }

  getAllModels() {
    return Object.keys(this.pricing).map(model => this.getModelInfo(model));
  }
}

module.exports = ModelRouter;
