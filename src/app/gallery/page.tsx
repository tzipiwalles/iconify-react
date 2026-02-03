"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Share2, Trash2, ImageIcon } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { ShareModal } from "@/components/share-modal"
import { SiteHeader } from "@/components/site-header"
import { isAdmin } from "@/lib/admin"
import { createClient } from "@/lib/supabase/client"

interface PublicAsset {
  id: string
  componentName: string
  svgUrl: string
  mode: "icon" | "logo" | "image"
  detectedColors: string[]
  createdAt: string
}

export default function GalleryPage() {
  const [publicAssets, setPublicAssets] = useState<PublicAsset[]>([])
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [shareAsset, setShareAsset] = useState<PublicAsset | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<string | null>(null)
  
  const { user } = useAuth()
  const userIsAdmin = isAdmin(user)
  const supabase = createClient()

  const handleAdminDelete = async (asset: PublicAsset) => {
    if (!confirm(`Are you sure you want to delete "${asset.componentName}"? This action cannot be undone.`)) {
      return
    }

    setDeletingAsset(asset.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert("Not authenticated")
        return
      }

      const response = await fetch(`/api/admin/assets/${encodeURIComponent(asset.componentName)}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error
        console.error("Delete error:", data)
        alert(errorMsg || "Failed to delete asset")
        return
      }

      // Remove from local state
      setPublicAssets(prev => prev.filter(a => a.id !== asset.id))
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete asset")
    } finally {
      setDeletingAsset(null)
    }
  }

  // Load public assets
  useEffect(() => {
    const fetchPublicAssets = async () => {
      try {
        const res = await fetch("/api/assets/public")
        const data = await res.json()
        if (data.success) {
          setPublicAssets(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch public assets:", error)
      } finally {
        setLoadingAssets(false)
      }
    }
    fetchPublicAssets()
  }, [])

  return (
    <div className="dark min-h-screen bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/8 via-purple-500/4 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 right-0 h-[800px] w-[800px] rounded-full bg-gradient-to-t from-emerald-500/6 via-teal-500/3 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <SiteHeader />

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">Community Assets</h1>
              <p className="mt-2 text-muted-foreground">
                Explore logos, icons & images shared by the community
              </p>
            </div>
            <Link href="/create">
              <Button className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                Add Yours
              </Button>
            </Link>
          </div>
        </div>

        {/* Gallery Grid */}
        {loadingAssets ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-4">
                <div className="aspect-square rounded-xl bg-muted mb-3" />
                <div className="h-4 w-2/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : publicAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">No public assets yet</h3>
            <p className="mb-6 text-muted-foreground">
              Be the first to share your icon, logo or image!
            </p>
            <Link href="/create">
              <Button className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                Create First Asset
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {publicAssets.map(asset => (
              <div
                key={asset.id}
                className="group relative rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Preview */}
                <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-muted/50 p-6">
                  <img
                    src={asset.svgUrl}
                    alt={asset.componentName}
                    className="h-full w-full object-contain"
                  />
                  
                  {/* Mode badge */}
                  <span className={`absolute left-3 top-3 rounded-lg px-2 py-1 text-xs font-medium ${
                    asset.mode === "icon" 
                      ? "bg-primary/20 text-primary" 
                      : asset.mode === "image"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {asset.mode}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="truncate font-semibold mb-2">{asset.componentName}</h3>
                  
                  {/* Colors */}
                  {asset.detectedColors && asset.detectedColors.length > 0 && (
                    <div className="mb-3 flex gap-1">
                      {asset.detectedColors.slice(0, 4).map((color, i) => (
                        <div
                          key={i}
                          className="h-4 w-4 rounded border border-white/20"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Share button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setShareAsset(asset)}
                  >
                    <Share2 className="h-4 w-4" />
                    Share & Embed
                  </Button>

                  {/* Admin delete button */}
                  {userIsAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 mt-2"
                      onClick={() => handleAdminDelete(asset)}
                      disabled={deletingAsset === asset.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingAsset === asset.id ? "Deleting..." : "Delete (Admin)"}
                    </Button>
                  )}
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
          asset={{
            component_name: shareAsset.componentName,
            react_component: "",
            svg_url: shareAsset.svgUrl,
            visibility: "public",
            detected_colors: shareAsset.detectedColors,
          }}
          baseUrl="https://www.assetbridge.app"
        />
      )}
    </div>
  )
}
