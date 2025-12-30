"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
              1211 Situation Planner
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
              Navigate Complex Situations
              <br />
              <span className="text-primary">With Clarity</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Turn messy, overwhelming situations into structured action plans.
              Get clarity on what's happening, what you want, and what to do next.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Button
                size="lg"
                onClick={() => router.push("/auth/signin")}
                className="text-lg px-8"
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/planner")}
                className="text-lg px-8"
              >
                Try Demo
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Clear Summary</h3>
                  <p className="text-sm text-slate-600">
                    Get a neutral, fact-based summary of what's actually happening in your situation.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Goal-First Clarity</h3>
                  <p className="text-sm text-slate-600">
                    Identify your main goal and concrete sub-goals to break down complexity.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Actionable Steps</h3>
                  <p className="text-sm text-slate-600">
                    Receive a step-by-step action plan with if/then branches for different scenarios.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center mx-auto font-bold">
                  1
                </div>
                <h4 className="font-semibold">Describe</h4>
                <p className="text-sm text-slate-600">
                  Write what's happening in your own words
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center mx-auto font-bold">
                  2
                </div>
                <h4 className="font-semibold">Analyze</h4>
                <p className="text-sm text-slate-600">
                  AI processes your situation with clarity
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center mx-auto font-bold">
                  3
                </div>
                <h4 className="font-semibold">Plan</h4>
                <p className="text-sm text-slate-600">
                  Get goals, steps, and ready-to-use scripts
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center mx-auto font-bold">
                  4
                </div>
                <h4 className="font-semibold">Act</h4>
                <p className="text-sm text-slate-600">
                  Copy, save, and take action with confidence
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-8">
            <Button
              size="lg"
              onClick={() => router.push("/auth/signin")}
              className="text-lg px-12"
            >
              Start Planning Now
            </Button>
            <p className="text-sm text-slate-500 mt-4">
              Free to use • Situations saved automatically • On your side
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
