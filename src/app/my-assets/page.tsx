"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { 
  Trash2, 
  Download, 
  MoreVertical,
  Share2,
  Pencil,
  Check,
  X,
  Palette,
  Globe,
  Lock,
  Zap
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShareModal } from "@/components/share-modal"
import { ColorEditor } from "@/components/color-editor"
import { SiteHeader } from "@/components/site-header"

interface Asset {
  id: string
  original_filename: string
  original_url: string
  mode: "icon" | "logo" | "image"
  component_name: string
  svg_url: string
  react_component: string
  detected_colors: string[]
  additional_colors?: string[]
  visibility: "private" | "organization" | "public"
  created_at: string
}

export default function MyAssetsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [_copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [shareAsset, setShareAsset] = useState<Asset | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [editingColorsAsset, setEditingColorsAsset] = useState<Asset | null>(null)
  const [editedDetectedColors, setEditedDetectedColors] = useState<string[]>([])
  const [editedAdditionalColors, setEditedAdditionalColors] = useState<string[]>([])
  const [savingColors, setSavingColors] = useState(false)
  const [hasColorChanges, setHasColorChanges] = useState(false)
  const [togglingVisibility, setTogglingVisibility] = useState<string | null>(null)

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
      
      // Only load assets belonging to the current user
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user!.id)  // 🔒 Filter by user_id
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

  const _handleCopyComponent = async (asset: Asset) => {
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

  const handleStartEdit = (asset: Asset) => {
    setEditingId(asset.id)
    setEditName(asset.component_name)
    setMenuOpenId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName("")
  }

  const handleSaveEdit = async (asset: Asset) => {
    if (!editName.trim() || editName === asset.component_name) {
      handleCancelEdit()
      return
    }

    try {
      setSavingName(true)
      const response = await fetch(`/api/assets/${asset.component_name}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: editName }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || "Failed to rename asset")
        return
      }

      // Update local state
      setAssets(assets.map(a => 
        a.id === asset.id 
          ? { ...a, component_name: result.data.newName }
          : a
      ))
      
      handleCancelEdit()
    } catch (err) {
      console.error("Rename failed:", err)
      setError(err instanceof Error ? err.message : "Failed to rename asset")
    } finally {
      setSavingName(false)
    }
  }

  const handleStartEditColors = (asset: Asset) => {
    setEditingColorsAsset(asset)
    setEditedDetectedColors([...asset.detected_colors])
    setEditedAdditionalColors([...(asset.additional_colors || [])])
    setHasColorChanges(false)
    setMenuOpenId(null)
  }

  const handleColorChange = (index: number, newColor: string) => {
    const newColors = [...editedDetectedColors]
    newColors[index] = newColor
    setEditedDetectedColors(newColors)
    setHasColorChanges(true)
  }

  const handleAddAdditionalColor = (color: string) => {
    setEditedAdditionalColors([...editedAdditionalColors, color])
    setHasColorChanges(true)
  }

  const handleRemoveAdditionalColor = (index: number) => {
    const newColors = editedAdditionalColors.filter((_, i) => i !== index)
    setEditedAdditionalColors(newColors)
    setHasColorChanges(true)
  }

  const handleSaveColors = async () => {
    if (!editingColorsAsset) return

    try {
      setSavingColors(true)
      const response = await fetch(`/api/assets/${editingColorsAsset.component_name}/colors`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detectedColors: editedDetectedColors,
          additionalColors: editedAdditionalColors,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || "Failed to update colors")
        return
      }

      // Update local state
      setAssets(assets.map(a => 
        a.id === editingColorsAsset.id 
          ? { 
              ...a, 
              detected_colors: result.data.detectedColors,
              additional_colors: result.data.additionalColors,
              svg_url: result.data.svgUrl,
              react_component: result.data.reactComponent || a.react_component,
            }
          : a
      ))
      
      setHasColorChanges(false)
      setEditingColorsAsset(null)
    } catch (err) {
      console.error("Color update failed:", err)
      setError(err instanceof Error ? err.message : "Failed to update colors")
    } finally {
      setSavingColors(false)
    }
  }

  const handleCloseColorEditor = () => {
    if (hasColorChanges) {
      if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
        return
      }
    }
    setEditingColorsAsset(null)
    setHasColorChanges(false)
  }

  const handleToggleVisibility = async (asset: Asset) => {
    const newVisibility = asset.visibility === "public" ? "private" : "public"
    
    try {
      setTogglingVisibility(asset.id)
      setMenuOpenId(null)
      
      const response = await fetch(`/api/assets/${asset.component_name}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVisibility }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || "Failed to update visibility")
        return
      }

      // Update local state
      setAssets(assets.map(a => 
        a.id === asset.id 
          ? { ...a, visibility: newVisibility }
          : a
      ))
    } catch (err) {
      console.error("Visibility toggle failed:", err)
      setError(err instanceof Error ? err.message : "Failed to update visibility")
    } finally {
      setTogglingVisibility(null)
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
      <SiteHeader 
        showBackButton={true}
        title="My Assets"
        subtitle={`${assets.length} saved conversion${assets.length !== 1 ? "s" : ""}`}
      />

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
                      : asset.mode === "image"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {asset.mode}
                  </span>

                  {/* Visibility badge */}
                  <span className={`absolute right-3 top-3 rounded-lg px-2 py-1 text-xs font-medium flex items-center gap-1 ${
                    asset.visibility === "public" 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "bg-gray-500/20 text-gray-400"
                  }`}>
                    {asset.visibility === "public" ? (
                      <Globe className="h-3 w-3" />
                    ) : (
                      <Lock className="h-3 w-3" />
                    )}
                    {asset.visibility}
                  </span>

                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      {editingId === asset.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(asset)
                              if (e.key === "Escape") handleCancelEdit()
                            }}
                            className="flex-1 rounded-lg border border-primary bg-background px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                            disabled={savingName}
                          />
                          <button
                            onClick={() => handleSaveEdit(asset)}
                            disabled={savingName}
                            className="rounded-lg p-1 text-primary hover:bg-primary/10"
                          >
                            {savingName ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={savingName}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="truncate font-semibold">{asset.component_name}</h3>
                      )}
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
                          <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border border-border bg-card p-1 shadow-xl">
                            <button
                              onClick={() => handleStartEdit(asset)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                            >
                              <Pencil className="h-4 w-4" />
                              Rename
                            </button>
                            {/* Edit Colors - only for icon/logo modes with detected colors */}
                            {asset.mode !== "image" && asset.detected_colors && asset.detected_colors.length > 0 && (
                              <button
                                onClick={() => handleStartEditColors(asset)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                              >
                                <Palette className="h-4 w-4" />
                                Edit Colors
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleVisibility(asset)}
                              disabled={togglingVisibility === asset.id}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                            >
                              {togglingVisibility === asset.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                              ) : asset.visibility === "public" ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Globe className="h-4 w-4" />
                              )}
                              {asset.visibility === "public" ? "Make Private" : "Make Public"}
                            </button>
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

      {/* Color Editor Modal */}
      {editingColorsAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseColorEditor}
          />
          
          {/* Modal */}
          <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-auto rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4">
            {/* Close button */}
            <button
              onClick={handleCloseColorEditor}
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-400" />
                Edit Colors
              </h2>
              <p className="text-sm text-muted-foreground">
                Customize colors for <span className="font-medium text-foreground">{editingColorsAsset.component_name}</span>
              </p>
            </div>

            {/* Preview */}
            <div className="mb-6 rounded-xl border border-border p-4">
              <p className="mb-3 text-sm font-medium">Preview:</p>
              <div className="flex items-center justify-center rounded-lg bg-muted/50 p-6">
                <img 
                  src={editingColorsAsset.svg_url} 
                  alt={editingColorsAsset.component_name}
                  className="h-24 w-24 object-contain"
                />
              </div>
            </div>

            {/* Color Editor */}
            <ColorEditor
              detectedColors={editedDetectedColors}
              additionalColors={editedAdditionalColors}
              onColorChange={handleColorChange}
              onAddColor={handleAddAdditionalColor}
              onRemoveAdditionalColor={handleRemoveAdditionalColor}
              onSave={handleSaveColors}
              isSaving={savingColors}
              hasChanges={hasColorChanges}
            />
          </div>
        </div>
      )}
    </div>
  )
}
