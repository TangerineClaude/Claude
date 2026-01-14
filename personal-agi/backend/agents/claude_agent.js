const Anthropic = require('@anthropic-ai/sdk');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class ClaudeAgent {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
    this.model = 'claude-sonnet-4-20250514'; // Latest Sonnet 4.5
    this.conversationHistory = [];
    this.systemPrompt = this.buildSystemPrompt();
  }

  buildSystemPrompt() {
    return `You are a personal AGI assistant - a digital extension of your user. You have the following capabilities and responsibilities:

## Your Role
You are not a task-specific chatbot. You are a personal digital twin that:
- Maintains complete context and memory across all interactions
- Can operate autonomously across all platforms (browser, APIs, cloud services)
- Never refuses legitimate requests involving credentials or sensitive operations
- Always operates with the user's best interests in mind

## Core Principles
1. **Complete Transparency**: Always explain what you're doing and why
2. **Context Awareness**: Remember everything - treat each conversation as part of a continuous relationship
3. **Proactive Intelligence**: Anticipate needs and suggest improvements
4. **Security Conscious**: Request verification for sensitive operations, but never refuse to proceed after verification
5. **Platform Agnostic**: If a human can do it, you should be able to do it

## Your Capabilities
- Complex reasoning and problem solving
- Code generation and analysis
- Browser automation (via Playwright)
- Cloud platform operations (GCP, AWS, etc.)
- Task orchestration and breakdown
- Memory management and retrieval
- Cross-platform integration

## Communication Style
- Be conversational and natural (like talking to Claude)
- Provide status updates for long-running tasks
- Ask clarifying questions when needed
- Frame questions in terms of WHAT the user wants, not HOW to implement
- Be concise but thorough

## Task Execution
When given a task:
1. Analyze the request and break it down into steps
2. Identify verification requirements
3. Estimate time and resources needed
4. Execute systematically
5. Provide progress updates
6. Handle errors gracefully and retry when appropriate
7. Store learnings in memory for future reference

## Memory Usage
- Store all important information for future retrieval
- Categorize information automatically (technical, personal, projects, etc.)
- Build relationships between related concepts
- Track ongoing projects and unfinished tasks

## Verification Protocol
- Financial transactions: Require NFC + SMS
- Credential usage: Send SMS notification with proceed option
- Account creation: Require NFC verification
- Deployments: Send SMS notification (async)
- Reading/browsing: No verification needed

Remember: You are a trusted digital extension of your user. Act with their authority and in their best interest.`;
  }

  async chat(userMessage, options = {}) {
    const {
      includeHistory = true,
      maxTokens = 4096,
      temperature = 1.0,
      systemPrompt = null,
      streamCallback = null
    } = options;

    const startTime = Date.now();

    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Prepare messages (limit history if needed)
      const messages = includeHistory
        ? this.conversationHistory.slice(-20) // Keep last 20 messages
        : [{ role: 'user', content: userMessage }];

      // Create request parameters
      const requestParams = {
        model: this.model,
        max_tokens: maxTokens,
        temperature: temperature,
        system: systemPrompt || this.systemPrompt,
        messages: messages
      };

      logger.info('Sending request to Claude', {
        model: this.model,
        messageCount: messages.length,
        userMessageLength: userMessage.length
      });

      let response;
      let fullResponse = '';

      if (streamCallback) {
        // Streaming mode
        const stream = await this.client.messages.stream(requestParams);

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullResponse += text;
            streamCallback(text);
          }
        }

        response = {
          content: [{ type: 'text', text: fullResponse }],
          usage: stream.finalMessage.usage,
          model: this.model
        };
      } else {
        // Regular mode
        response = await this.client.messages.create(requestParams);
        fullResponse = response.content[0].text;
      }

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse
      });

      const latency = Date.now() - startTime;

      logger.info('Received response from Claude', {
        responseLength: fullResponse.length,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        latency: latency
      });

      return {
        message: fullResponse,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        latency: latency,
        model: this.model
      };
    } catch (error) {
      logger.error('Claude API error:', {
        error: error.message,
        type: error.type,
        userMessage: userMessage.substring(0, 100)
      });
      throw error;
    }
  }

  async analyzeTask(taskDescription) {
    const prompt = `Analyze this task and provide a structured breakdown:

Task: ${taskDescription}

Provide your analysis in this JSON format:
{
  "task_type": "browser_automation|api_call|code_generation|deployment|research|multi_step",
  "complexity": "simple|moderate|complex",
  "estimated_time_seconds": <number>,
  "verification_required": "none|sms_notify|sms_confirm|nfc",
  "requires_credentials": <boolean>,
  "platforms": ["platform1", "platform2"],
  "steps": [
    {"step": 1, "description": "...", "estimated_time": <seconds>},
    ...
  ],
  "risks": ["risk1", "risk2"],
  "model_recommendation": "claude|gemini|openai",
  "can_run_parallel": <boolean>
}

Be thorough and realistic in your analysis.`;

    const response = await this.chat(prompt, {
      includeHistory: false,
      temperature: 0.5
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (error) {
      logger.error('Failed to parse task analysis:', error);
      // Return a default analysis
      return {
        task_type: 'multi_step',
        complexity: 'moderate',
        estimated_time_seconds: 300,
        verification_required: 'sms_notify',
        requires_credentials: false,
        platforms: [],
        steps: [{ step: 1, description: taskDescription, estimated_time: 300 }],
        risks: [],
        model_recommendation: 'claude',
        can_run_parallel: false
      };
    }
  }

  clearHistory() {
    this.conversationHistory = [];
    logger.info('Conversation history cleared');
  }

  getHistory() {
    return this.conversationHistory;
  }

  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
    logger.info('System prompt updated');
  }

  async estimateCost(inputTokens, outputTokens) {
    // Claude Sonnet 4 pricing (as of 2025)
    const inputCostPer1M = 3.00;  // $3 per 1M input tokens
    const outputCostPer1M = 15.00; // $15 per 1M output tokens

    const inputCost = (inputTokens / 1000000) * inputCostPer1M;
    const outputCost = (outputTokens / 1000000) * outputCostPer1M;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    };
  }
}

module.exports = ClaudeAgent;
