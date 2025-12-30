"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Copy, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface PlanSession {
  id: string
  situation: string
  summary: string
  goalTree: {
    mainGoal: string
    subGoals: string[]
  }
  actionPlan: Array<{
    step: number
    action: string
    branches?: Array<{
      condition: string
      thenDo: string
    }>
  }>
  script: string
  createdAt: string
  aiProvider: string
}

export default function SessionDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [planSession, setPlanSession] = useState<PlanSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "authenticated" && params.id) {
      fetchSession()
    }
  }, [status, params.id])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${params.id}`)
      if (!response.ok) throw new Error("Failed to fetch session")
      const data = await response.json()
      setPlanSession(data)
    } catch (error) {
      console.error("Error fetching session:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin")
    return null
  }

  if (!planSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Session not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/history")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Situation */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Original Situation</CardTitle>
                  <p className="text-sm text-slate-600 mt-2">
                    {formatDistanceToNow(new Date(planSession.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{planSession.situation}</p>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Summary & Goals */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Summary & Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-slate-600 mb-2">
                    What's Happening
                  </h4>
                  <p className="text-sm leading-relaxed">{planSession.summary}</p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-sm text-slate-600 mb-2">
                    Main Goal
                  </h4>
                  <p className="text-sm font-medium">{planSession.goalTree.mainGoal}</p>
                </div>

                {planSession.goalTree.subGoals.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-slate-600 mb-2">
                      Sub-Goals
                    </h4>
                    <ul className="space-y-2">
                      {planSession.goalTree.subGoals.map((goal, idx) => (
                        <li key={idx} className="text-sm flex gap-2">
                          <span className="text-slate-400">•</span>
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Plan */}
            <Card className="md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Action Plan</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const planText = planSession.actionPlan
                      .map((step) => {
                        let text = `${step.step}. ${step.action}`
                        if (step.branches) {
                          step.branches.forEach((branch) => {
                            text += `\n   - ${branch.condition}: ${branch.thenDo}`
                          })
                        }
                        return text
                      })
                      .join("\n\n")
                    copyToClipboard(planText)
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {planSession.actionPlan.map((step) => (
                    <li key={step.step} className="space-y-2">
                      <div className="flex gap-3">
                        <span className="font-semibold text-primary shrink-0">
                          {step.step}.
                        </span>
                        <p className="text-sm">{step.action}</p>
                      </div>
                      {step.branches && step.branches.length > 0 && (
                        <div className="ml-6 space-y-1 border-l-2 border-slate-200 pl-3">
                          {step.branches.map((branch, idx) => (
                            <div key={idx} className="text-xs text-slate-600">
                              <span className="font-medium">{branch.condition}:</span>{" "}
                              {branch.thenDo}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Script */}
            <Card className="md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Ready-to-Use Script</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(planSession.script)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-md p-4 border">
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {planSession.script}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
