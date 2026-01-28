"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { 
  ArrowLeft, 
  Users, 
  ImageIcon, 
  Sparkles,
  Shield,
  Coffee,
  Activity,
  Zap,
  Target,
  TrendingUp
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface UserStats {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  createdAt: string
  totalAssets: number
  iconCount: number
  logoCount: number
}

interface AdminData {
  users: UserStats[]
  totals: {
    totalUsers: number
    totalAssets: number
    totalIcons: number
    totalLogos: number
  }
}

interface Feedback {
  id: string
  message: string
  email: string | null
  user_agent: string | null
  created_at: string
  user_id: string | null
}

interface ApiUsageStats {
  recentCalls: Array<{
    id: string
    endpoint: string
    method: string
    created_at: string
    user_id: string | null
    ip_address: string
    response_time_ms: number | null
  }>
  summary: {
    totalCalls: number
    last24h: number
    last7days: number
  }
}

interface EventStats {
  summary: {
    generateClicks: number
    generateSuccess: number
    saveAssets: number
    uniqueGenerateUsers: number
    todayGenerates: number
    conversionRate: number
  }
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<AdminData | null>(null)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [apiUsage, setApiUsage] = useState<ApiUsageStats | null>(null)
  const [eventStats, setEventStats] = useState<EventStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingFeedback, setLoadingFeedback] = useState(true)
  const [loadingApiUsage, setLoadingApiUsage] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchAdminData()
      fetchFeedback()
      fetchApiUsage()
      fetchEventStats()
    }
  }, [user])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/users")
      
      if (!response.ok) {
        if (response.status === 403) {
          setError("Access denied. Admin only.")
        } else {
          setError(`Failed to load data (${response.status})`)
        }
        return
      }

      const result = await response.json()

      setData(result.data)
    } catch (err) {
      setError("Failed to fetch admin data")
    } finally {
      setLoading(false)
    }
  }

  const fetchFeedback = async () => {
    try {
      setLoadingFeedback(true)
      const response = await fetch("/api/feedback")
      
      if (!response.ok) {
        // Silently fail if feedback table doesn't exist yet
        console.log("Feedback not available yet:", response.status)
        setFeedback([])
        return
      }

      const result = await response.json()
      if (result.success) {
        setFeedback(result.data)
      }
    } catch (err) {
      // Silently fail - feedback feature is optional
      console.log("Feedback not available:", err)
      setFeedback([])
    } finally {
      setLoadingFeedback(false)
    }
  }

  const fetchApiUsage = async () => {
    try {
      setLoadingApiUsage(true)
      const response = await fetch("/api/admin/api-usage")
      
      if (!response.ok) {
        console.log("API usage not available yet:", response.status)
        return
      }

      const result = await response.json()
      if (result.success) {
        setApiUsage(result.data)
      }
    } catch (err) {
      console.log("API usage not available:", err)
    } finally {
      setLoadingApiUsage(false)
    }
  }

  const fetchEventStats = async () => {
    try {
      setLoadingEvents(true)
      const response = await fetch("/api/admin/events")
      
      if (!response.ok) {
        console.log("Event stats not available yet:", response.status)
        return
      }

      const result = await response.json()
      if (result.success) {
        setEventStats(result.data)
      }
    } catch (err) {
      console.log("Event stats not available:", err)
    } finally {
      setLoadingEvents(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Shield className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-destructive">{error}</h1>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 shadow-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-[11px] font-medium text-muted-foreground">
                  User & Asset Analytics
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{data?.totals.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <ImageIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-3xl font-bold">{data?.totals.totalAssets || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Icons Created</p>
                <p className="text-3xl font-bold">{data?.totals.totalIcons || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
                <Coffee className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Logos Created</p>
                <p className="text-3xl font-bold">{data?.totals.totalLogos || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Engagement Stats - Generate Clicks */}
        {!loadingEvents && eventStats && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              User Engagement
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10">
                    <Zap className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Generate Clicks</p>
                    <p className="text-3xl font-bold">{eventStats.summary.generateClicks}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                    <Sparkles className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Successful</p>
                    <p className="text-3xl font-bold">{eventStats.summary.generateSuccess}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unique Users</p>
                    <p className="text-3xl font-bold">{eventStats.summary.uniqueGenerateUsers}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                    <Activity className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today</p>
                    <p className="text-3xl font-bold">{eventStats.summary.todayGenerates}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                    <TrendingUp className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-3xl font-bold">{eventStats.summary.conversionRate}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Usage Stats */}
        {!loadingApiUsage && apiUsage && (
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                  <Activity className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total API Calls</p>
                  <p className="text-3xl font-bold">{apiUsage.summary.totalCalls}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                  <Activity className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                  <p className="text-3xl font-bold">{apiUsage.summary.last24h}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                  <Activity className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last 7 Days</p>
                  <p className="text-3xl font-bold">{apiUsage.summary.last7days}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="text-lg font-semibold">All Users</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Joined</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Icons</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Logos</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {data?.users.map((userItem) => (
                  <tr key={userItem.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 text-sm font-semibold text-white">
                          {(userItem.fullName || userItem.email)?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{userItem.fullName || "No name"}</p>
                          <p className="text-xs text-muted-foreground">{userItem.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(userItem.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-medium text-primary">
                        {userItem.iconCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-purple-500/10 px-2 text-xs font-medium text-purple-400">
                        {userItem.logoCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {userItem.totalAssets}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!data?.users || data.users.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              No users yet
            </div>
          )}
        </div>

        {/* Recent API Calls Section */}
        {!loadingApiUsage && apiUsage && apiUsage.recentCalls.length > 0 && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border/50 bg-muted/30 px-6 py-4">
              <h2 className="text-lg font-semibold">Recent API Calls</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Last {apiUsage.recentCalls.length} API requests
              </p>
            </div>

            <div className="divide-y divide-border">
              {apiUsage.recentCalls.slice(0, 20).map((call) => (
                <div key={call.id} className="p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{call.method}</span>
                        <code className="rounded bg-muted px-2 py-0.5 text-xs">{call.endpoint}</code>
                        {call.response_time_ms && (
                          <span className="text-xs text-muted-foreground">
                            {call.response_time_ms}ms
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{call.ip_address}</span>
                        <span>•</span>
                        <span>{call.user_id ? "Authenticated" : "Anonymous"}</span>
                      </div>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(call.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Section */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border/50 bg-muted/30 px-6 py-4">
            <h2 className="text-lg font-semibold">User Feedback</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loadingFeedback ? "Loading..." : `${feedback.length} total submissions`}
            </p>
          </div>

          <div className="divide-y divide-border">
            {!loadingFeedback && feedback.map((item) => (
              <div key={item.id} className="p-6 hover:bg-muted/20 transition-colors">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.user_id ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-xs font-semibold text-white">
                            U
                          </div>
                          <span className="text-sm font-medium">Logged in user</span>
                        </div>
                      ) : item.email ? (
                        <span className="text-sm text-muted-foreground">{item.email}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Anonymous</span>
                      )}
                    </div>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">{item.message}</p>
                {item.user_agent && (
                  <p className="mt-2 text-xs text-muted-foreground/60">
                    {item.user_agent.substring(0, 80)}{item.user_agent.length > 80 ? "..." : ""}
                  </p>
                )}
              </div>
            ))}

            {!loadingFeedback && feedback.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No feedback yet
              </div>
            )}

            {loadingFeedback && (
              <div className="flex items-center justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
