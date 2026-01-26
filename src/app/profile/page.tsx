"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { 
  ArrowLeft, 
  Key, 
  Copy, 
  Check, 
  RefreshCw,
  Eye,
  EyeOff,
  User,
  Mail,
  Shield
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchApiKey()
    }
  }, [user])

  const fetchApiKey = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/user/api-key")
      
      if (!response.ok) {
        setError(`Failed to fetch API key (${response.status})`)
        return
      }

      const result = await response.json()

      if (result.success) {
        setApiKey(result.data.apiKey)
      } else {
        setError(result.error || "Failed to fetch API key")
      }
    } catch (err) {
      setError("Failed to fetch API key")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!apiKey) return
    try {
      setCopying(true)
      await navigator.clipboard.writeText(apiKey)
      setTimeout(() => setCopying(false), 2000)
    } catch (err) {
      console.error("Copy failed:", err)
      setCopying(false)
    }
  }

  const handleRefresh = async () => {
    if (!confirm("Are you sure? This will invalidate your current API key. Any URLs using the old key will stop working.")) {
      return
    }

    try {
      setRefreshing(true)
      const response = await fetch("/api/user/api-key", { method: "POST" })
      
      if (!response.ok) {
        setError(`Failed to refresh API key (${response.status})`)
        return
      }

      const result = await response.json()

      if (result.success) {
        setApiKey(result.data.apiKey)
        setShowKey(true) // Show the new key
      } else {
        setError(result.error || "Failed to refresh API key")
      }
    } catch (err) {
      setError("Failed to refresh API key")
    } finally {
      setRefreshing(false)
    }
  }

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email
  const maskedKey = apiKey ? `sk_${"•".repeat(36)}${apiKey.slice(-4)}` : ""

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold tracking-tight">Profile & Settings</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {/* Profile Info */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <User className="h-5 w-5 text-primary" />
            Account
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-2xl font-bold text-white">
                {displayName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-medium">{displayName}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Section */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Key className="h-5 w-5 text-amber-400" />
            API Key
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Use this key to access your private and organization assets via API.
          </p>

          {/* Key Display */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-border bg-muted/50 px-4 py-3 font-mono text-sm">
              {showKey ? apiKey : maskedKey}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 rounded-xl"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 rounded-xl"
              onClick={handleCopy}
              disabled={!apiKey}
            >
              {copying ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh Key"}
            </Button>
          </div>

          {/* Usage Info */}
          <div className="mt-6 rounded-xl border border-border/50 bg-muted/30 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-primary" />
              How to use
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Add your API key to access private/organization assets:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-black/50 p-3 text-xs text-gray-300">
              <code>{`# Direct SVG URL
https://assetbridge.app/api/assets/MyLogo/svg?key=${apiKey?.slice(0, 10)}...

# JSON API
https://assetbridge.app/api/assets/MyLogo?key=${apiKey?.slice(0, 10)}...`}</code>
            </pre>
            
            <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
              <strong>⚠️ Keep it secret:</strong> Anyone with this key can access your private assets.
              If compromised, refresh your key immediately.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
