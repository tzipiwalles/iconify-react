"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"
import { 
  Zap, 
  ArrowLeft, 
  Trash2, 
  Download, 
  Copy, 
  Check,
  Globe,
  Building2,
  Lock,
  MoreVertical,
  Share2,
  Coffee
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShareModal } from "@/components/share-modal"

interface Asset {
  id: string
  original_filename: string
  original_url: string
  mode: "icon" | "logo"
  component_name: string
  svg_url: string
  react_component: string
  detected_colors: string[]
  visibility: "private" | "organization" | "public"
  created_at: string
}

export default function MyAssetsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [shareAsset, setShareAsset] = useState<Asset | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadAssets()
    }
  }, [user])

  const loadAssets = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setAssets(data || [])
    } catch (err) {
      console.error("Error loading assets:", err)
      setError(err instanceof Error ? err.message : "Failed to load assets")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyComponent = async (asset: Asset) => {
    try {
      await navigator.clipboard.writeText(asset.react_component)
      setCopiedId(asset.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error("Copy failed:", err)
    }
  }

  const handleDownloadSvg = async (asset: Asset) => {
    try {
      const response = await fetch(asset.svg_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${asset.component_name}.svg`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Download failed:", err)
    }
  }

  const handleDelete = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return

    try {
      setDeletingId(assetId)
      const supabase = createClient()
      
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", assetId)

      if (error) throw error
      
      setAssets(assets.filter(a => a.id !== assetId))
    } catch (err) {
      console.error("Delete failed:", err)
      setError(err instanceof Error ? err.message : "Failed to delete asset")
    } finally {
      setDeletingId(null)
      setMenuOpenId(null)
    }
  }

  const handleVisibilityChange = async (assetId: string, visibility: Asset["visibility"]) => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from("assets")
        .update({ visibility })
        .eq("id", assetId)

      if (error) throw error
      
      setAssets(assets.map(a => 
        a.id === assetId ? { ...a, visibility } : a
      ))
      setMenuOpenId(null)
    } catch (err) {
      console.error("Update failed:", err)
    }
  }

  const getVisibilityIcon = (visibility: Asset["visibility"]) => {
    switch (visibility) {
      case "public":
        return <Globe className="h-4 w-4 text-emerald-400" />
      case "organization":
        return <Building2 className="h-4 w-4 text-blue-400" />
      default:
        return <Lock className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (authLoading || (!user && !authLoading)) {
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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/20">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">My Assets</h1>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {assets.length} saved conversion{assets.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Buy Me a Coffee Button */}
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2 rounded-xl border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
              asChild
            >
              <a
                href="https://buymeacoffee.com/tzipiw"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Coffee className="h-4 w-4" />
                <span className="hidden sm:inline">Buy me a coffee</span>
              </a>
            </Button>
            
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        {error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 h-32 rounded-xl bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">No assets yet</h2>
            <p className="mb-6 text-muted-foreground">
              Convert an image and save it to see it here.
            </p>
            <Link href="/">
              <Button className="gap-2 rounded-xl">
                <Zap className="h-4 w-4" />
                Start Converting
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map(asset => (
              <div
                key={asset.id}
                className="group relative rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
              >
                {/* Preview */}
                <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-muted/50 p-6">
                  <img
                    src={asset.svg_url}
                    alt={asset.component_name}
                    className="h-full w-full object-contain"
                  />
                  
                  {/* Mode badge */}
                  <span className={`absolute left-3 top-3 rounded-lg px-2 py-1 text-xs font-medium ${
                    asset.mode === "icon" 
                      ? "bg-primary/20 text-primary" 
                      : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {asset.mode}
                  </span>

                  {/* Visibility */}
                  <div className="absolute right-3 top-3">
                    {getVisibilityIcon(asset.visibility)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{asset.component_name}</h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {asset.original_filename}
                      </p>
                    </div>

                    {/* Menu button */}
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === asset.id ? null : asset.id)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {menuOpenId === asset.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuOpenId(null)}
                          />
                          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-card p-1 shadow-xl">
                            <button
                              onClick={() => handleVisibilityChange(asset.id, "private")}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted ${asset.visibility === "private" ? "text-primary" : ""}`}
                            >
                              <Lock className="h-4 w-4" />
                              Private
                            </button>
                            <button
                              onClick={() => handleVisibilityChange(asset.id, "organization")}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted ${asset.visibility === "organization" ? "text-primary" : ""}`}
                            >
                              <Building2 className="h-4 w-4" />
                              Organization
                            </button>
                            <button
                              onClick={() => handleVisibilityChange(asset.id, "public")}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted ${asset.visibility === "public" ? "text-primary" : ""}`}
                            >
                              <Globe className="h-4 w-4" />
                              Public
                            </button>
                            <hr className="my-1 border-border" />
                            <button
                              onClick={() => handleDelete(asset.id)}
                              disabled={deletingId === asset.id}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                            >
                              {deletingId === asset.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive/30 border-t-destructive" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Colors */}
                  {asset.detected_colors && asset.detected_colors.length > 0 && (
                    <div className="mb-3 flex gap-1">
                      {asset.detected_colors.slice(0, 4).map((color, i) => (
                        <div
                          key={i}
                          className="h-4 w-4 rounded border border-white/20"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShareAsset(asset)}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2 rounded-lg bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share & Embed
                    </Button>
                    <Button
                      onClick={() => handleDownloadSvg(asset)}
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-lg"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Date */}
                <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  {new Date(asset.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Share Modal */}
      {shareAsset && (
        <ShareModal
          isOpen={!!shareAsset}
          onClose={() => setShareAsset(null)}
          asset={shareAsset}
          baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
        />
      )}
    </div>
  )
}
