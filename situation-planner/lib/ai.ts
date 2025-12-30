import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"

export interface SituationAnalysis {
  summary: string
  goalTree: {
    mainGoal: string
    subGoals: string[]
  }
  actionPlan: ActionStep[]
  script: string
}

export interface ActionStep {
  step: number
  action: string
  branches?: {
    condition: string
    thenDo: string
  }[]
}

const SYSTEM_PROMPT = `You are a practical situation advisor. Your role is to help people navigate complex, messy real-life situations by providing clear, structured guidance.

When analyzing a situation:
1. **Summary**: Provide a neutral, clear 2-3 sentence summary of what's happening. Focus on facts, not judgments.
2. **Goal Tree**: Identify what the person really wants (main goal) and break it into 2-4 concrete sub-goals.
3. **Action Plan**: Create a step-by-step action plan with 3-7 specific, actionable steps. Include if/then branches where relevant (e.g., "If they respond positively, then..." or "If they refuse, then...").
4. **Script**: Write a ready-to-use communication template (email, message, or conversation script) they can adapt and send.

Your tone should be:
- Calming and grounded
- Practical, not theoretical
- On the user's side
- Clear and direct, avoiding corporate buzzwords
- Focused on action, not just advice

Format your response as valid JSON with this exact structure:
{
  "summary": "Clear summary of the situation...",
  "goalTree": {
    "mainGoal": "The primary objective...",
    "subGoals": ["Sub-goal 1", "Sub-goal 2", "Sub-goal 3"]
  },
  "actionPlan": [
    {
      "step": 1,
      "action": "First concrete action to take...",
      "branches": [
        {
          "condition": "If X happens",
          "thenDo": "Do this..."
        }
      ]
    }
  ],
  "script": "Dear [Name],\\n\\nI wanted to reach out about...\\n\\nBest,\\n[Your name]"
}`

async function analyzeWithClaude(situation: string): Promise<SituationAnalysis> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `${SYSTEM_PROMPT}\n\nSituation to analyze:\n${situation}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude")
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("No JSON found in Claude response")
  }

  return JSON.parse(jsonMatch[0])
}

async function analyzeWithOpenAI(situation: string): Promise<SituationAnalysis> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Situation to analyze:\n${situation}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  })

  const content = completion.choices[0].message.content
  if (!content) {
    throw new Error("No content in OpenAI response")
  }

  return JSON.parse(content)
}

export async function analyzeSituation(
  situation: string,
  provider: "openai" | "claude" = "claude"
): Promise<SituationAnalysis> {
  if (provider === "claude") {
    return analyzeWithClaude(situation)
  } else {
    return analyzeWithOpenAI(situation)
  }
}
