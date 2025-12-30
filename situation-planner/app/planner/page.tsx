"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Copy, Loader2, History, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

interface Analysis {
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
}

export default function PlannerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [situation, setSituation] = useState("")
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (status === "loading") {
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

  const handleAnalyze = async () => {
    if (!situation.trim()) {
      setError("Please describe your situation")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ situation }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze situation")
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      setError("Something went wrong. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">1211</h1>
            <p className="text-sm text-slate-600">Situation Planner</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/history")}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Describe Your Situation</CardTitle>
              <CardDescription>
                Share what's going on in your own words. Be as detailed as you need.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="situation">What's happening?</Label>
                <Textarea
                  id="situation"
                  placeholder="Example: I need to have a difficult conversation with my manager about taking on too many projects. I'm feeling overwhelmed but don't want to seem incapable..."
                  className="min-h-[200px] resize-none"
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={loading || !situation.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Get Clarity"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          {analysis && (
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
                    <p className="text-sm leading-relaxed">{analysis.summary}</p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium text-sm text-slate-600 mb-2">
                      Main Goal
                    </h4>
                    <p className="text-sm font-medium">{analysis.goalTree.mainGoal}</p>
                  </div>

                  {analysis.goalTree.subGoals.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-slate-600 mb-2">
                        Sub-Goals
                      </h4>
                      <ul className="space-y-2">
                        {analysis.goalTree.subGoals.map((goal, idx) => (
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
                      const planText = analysis.actionPlan
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
                    {analysis.actionPlan.map((step) => (
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
                    onClick={() => copyToClipboard(analysis.script)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50 rounded-md p-4 border">
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {analysis.script}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
