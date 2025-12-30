import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { analyzeSituation } from "@/lib/ai"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { situation } = await request.json()

    if (!situation || typeof situation !== "string" || situation.trim().length === 0) {
      return NextResponse.json(
        { error: "Situation text is required" },
        { status: 400 }
      )
    }

    // Get AI provider from env or default to claude
    const provider = (process.env.AI_PROVIDER as "openai" | "claude") || "claude"

    // Analyze the situation using AI
    const analysis = await analyzeSituation(situation, provider)

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Save to database
    const planSession = await prisma.planSession.create({
      data: {
        userId: user.id,
        situation,
        summary: analysis.summary,
        goalTree: analysis.goalTree,
        actionPlan: analysis.actionPlan,
        script: analysis.script,
        aiProvider: provider,
      },
    })

    return NextResponse.json({
      id: planSession.id,
      analysis,
    })
  } catch (error) {
    console.error("Error analyzing situation:", error)
    return NextResponse.json(
      { error: "Failed to analyze situation" },
      { status: 500 }
    )
  }
}
