export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  const {
    model = 'gpt-4',
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateTasksForMission(missionDescription: string): Promise<string[]> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a task planning AI. Break down complex goals into clear, actionable steps. Return ONLY a numbered list of tasks, one per line. Be specific and practical.',
    },
    {
      role: 'user',
      content: `Break down this mission into 5-8 clear steps:\n\n${missionDescription}`,
    },
  ];

  const response = await chatCompletion(messages);

  // Parse the response into tasks
  const tasks = response
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(task => task.length > 0);

  return tasks;
}

export async function executeTask(
  taskDescription: string,
  missionContext: string,
  agentRole?: string
): Promise<{ result: string; success: boolean }> {
  const systemPrompt = agentRole
    ? `You are ${agentRole}. Execute the given task and return a detailed result.`
    : 'You are a helpful AI assistant. Execute the given task and return a detailed result.';

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Mission Context: ${missionContext}\n\nTask: ${taskDescription}\n\nExecute this task and provide a detailed result.`,
    },
  ];

  try {
    const result = await chatCompletion(messages);
    return { result, success: true };
  } catch (error) {
    return {
      result: `Error executing task: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}
