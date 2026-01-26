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
  Coffee
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
  profiles: {
    email: string
    name: string | null
  } | null
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<AdminData | null>(null)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingFeedback, setLoadingFeedback] = useState(true)
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
        console.error("Failed to fetch feedback:", response.status)
        return
      }

      const result = await response.json()
      if (result.success) {
        setFeedback(result.data)
      }
    } catch (err) {
      console.error("Failed to fetch feedback:", err)
    } finally {
      setLoadingFeedback(false)
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
                      {item.profiles ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-xs font-semibold text-white">
                            {(item.profiles.name || item.profiles.email)?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{item.profiles.email}</span>
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
