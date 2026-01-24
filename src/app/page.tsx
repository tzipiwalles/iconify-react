"use client"

import { useState } from "react"
import { UploadZone } from "@/components/upload-zone"
import { SettingsPanel, OutputMode } from "@/components/settings-panel"
import { ResultsPanel } from "@/components/results-panel"
import { Button } from "@/components/ui/button"
import { Zap, Github, Sparkles, Save, LogIn } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useConversionCount } from "@/hooks/use-conversion-count"
import { AuthModal } from "@/components/auth-modal"
import { UserMenu } from "@/components/user-menu"
import { createClient } from "@/lib/supabase/client"

interface ProcessedResult {
  componentName: string
  optimizedSvg: string
  reactComponent: string
  publicUrl: string | null
  originalFileName: string
  detectedColors?: string[]
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mode, setMode] = useState<OutputMode>("icon")
  const [removeBackground, setRemoveBackground] = useState(false)
  const [componentName, setComponentName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null)
  
  const { user, loading: authLoading } = useAuth()
  const { count: conversionCount, incrementCount, hasUsedFreeConversion, isLoaded: countLoaded } = useConversionCount()
  
  const MIN_FILE_SIZE = 10000 // 10KB minimum for good quality
  const RECOMMENDED_FILE_SIZE = 50000 // 50KB recommended

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setResult(null)
    setError(null)
    
    // Check file size and warn if too small
    if (file.size < MIN_FILE_SIZE) {
      setWarning(`⚠️ Image is very small (${Math.round(file.size / 1000)}KB). For best results, use images larger than 50KB. Small images may lose detail and colors.`)
    } else if (file.size < RECOMMENDED_FILE_SIZE) {
      setWarning(`💡 Image is ${Math.round(file.size / 1000)}KB. For better color accuracy in Logo mode, we recommend images larger than 50KB.`)
    } else {
      setWarning(null)
    }
  }

  const handleClear = () => {
    setSelectedFile(null)
    setResult(null)
    setError(null)
    setWarning(null)
    setComponentName("")
    setSavedAssetId(null)
  }

  const handleProcess = async () => {
    if (!selectedFile) return

    // Check if user needs to sign in (used free conversion and not logged in)
    if (hasUsedFreeConversion && !user) {
      setShowAuthModal(true)
      return
    }

    setIsProcessing(true)
    setError(null)
    setSavedAssetId(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("removeBackground", removeBackground.toString())
      formData.append("mode", mode)
      if (componentName.trim()) {
        formData.append("componentName", componentName.trim())
      }

      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Processing failed")
      }

      setResult(data.data)
      
      // Increment conversion count for anonymous users
      if (!user) {
        incrementCount()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveAsset = async () => {
    if (!result || !user || !selectedFile) return

    setIsSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // 1. Upload original image to storage
      const originalFileName = `${user.id}/${Date.now()}-${selectedFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("assets")
        .upload(`originals/${originalFileName}`, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL for original
      const { data: { publicUrl: originalUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(`originals/${originalFileName}`)

      // 2. Upload SVG to storage
      const svgBlob = new Blob([result.optimizedSvg], { type: "image/svg+xml" })
      const svgFileName = `${user.id}/${Date.now()}-${result.componentName}.svg`
      const { error: svgUploadError } = await supabase.storage
        .from("assets")
        .upload(`outputs/${svgFileName}`, svgBlob)

      if (svgUploadError) throw svgUploadError

      const { data: { publicUrl: svgUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(`outputs/${svgFileName}`)

      // 3. Save asset record to database
      const { data: asset, error: dbError } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          original_filename: selectedFile.name,
          original_url: originalUrl,
          original_size_bytes: selectedFile.size,
          mode: mode,
          component_name: result.componentName,
          remove_background: removeBackground,
          svg_url: svgUrl,
          react_component: result.reactComponent,
          detected_colors: result.detectedColors || [],
          visibility: "private",
        })
        .select()
        .single()

      if (dbError) throw dbError

      setSavedAssetId(asset.id)
    } catch (err) {
      console.error("Save error:", err)
      setError(err instanceof Error ? err.message : "Failed to save asset")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="dark min-h-screen bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/8 via-purple-500/4 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 right-0 h-[800px] w-[800px] rounded-full bg-gradient-to-t from-emerald-500/6 via-teal-500/3 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Asset-Bridge
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground">
                Image → React Component
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 sm:inline-flex">
              <Sparkles className="h-3 w-3" />
              AI Workflow Ready
            </span>
            <Button variant="ghost" size="icon" className="rounded-xl" asChild>
              <a
                href="https://github.com/tzipiwalles/iconify-react"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" />
              </a>
            </Button>
            
            {/* Auth section */}
            {!authLoading && (
              user ? (
                <UserMenu />
              ) : (
                <Button
                  onClick={() => setShowAuthModal(true)}
                  variant="outline"
                  className="gap-2 rounded-xl"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Transform Assets into{" "}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              React Components
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Upload your images or SVGs and get optimized, AI-friendly React
            components — ready for any coding workflow.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
          {/* Left column - Upload and Results */}
          <div className="space-y-6">
            <UploadZone
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onClear={handleClear}
              isProcessing={isProcessing}
            />

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <strong className="font-semibold">Error:</strong> {error}
              </div>
            )}

            {warning && !error && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                {warning}
              </div>
            )}

            <ResultsPanel result={result} />
          </div>

          {/* Right column - Settings */}
          <div className="space-y-6">
            <SettingsPanel
              mode={mode}
              onModeChange={setMode}
              removeBackground={removeBackground}
              onRemoveBackgroundChange={setRemoveBackground}
              componentName={componentName}
              onComponentNameChange={setComponentName}
              isProcessing={isProcessing}
            />

            <Button
              onClick={handleProcess}
              disabled={!selectedFile || isProcessing}
              className="h-14 w-full gap-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  {result ? "Re-process" : mode === "icon" ? "Generate Icon" : "Generate Logo"}
                </>
              )}
            </Button>

            {/* Save button - only show when there's a result and user is logged in */}
            {result && user && (
              <Button
                onClick={handleSaveAsset}
                disabled={isSaving || !!savedAssetId}
                variant="outline"
                className="h-12 w-full gap-3 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
                    Saving...
                  </>
                ) : savedAssetId ? (
                  <>
                    <Save className="h-4 w-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save to My Assets
                  </>
                )}
              </Button>
            )}

            {/* Prompt to sign in to save */}
            {result && !user && (
              <Button
                onClick={() => setShowAuthModal(true)}
                variant="outline"
                className="h-12 w-full gap-3 rounded-xl border-muted"
              >
                <LogIn className="h-4 w-4" />
                Sign in to save your work
              </Button>
            )}

            {/* Detected Colors Display - only for logo mode */}
            {mode === "logo" && result?.detectedColors && result.detectedColors.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                  Auto-Detected Colors ({result.detectedColors.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.detectedColors.map((color, i) => (
                    <div
                      key={i}
                      className="group relative"
                    >
                      <div
                        className="h-8 w-8 rounded-lg border border-white/20 shadow-sm transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        {color}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info card */}
            <div className="rounded-xl border border-border bg-card/50 p-5">
              <h4 className="mb-3.5 text-sm font-semibold">
                {mode === "icon" ? "Icon Output" : "Logo Output"}
              </h4>
              <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                {mode === "icon" ? (
                  <>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>
                        <strong className="font-medium text-foreground">viewBox:</strong> 0 0 24 24
                        (standardized)
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>
                        <strong className="font-medium text-foreground">Fill:</strong>{" "}
                        currentColor (CSS themeable)
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>
                        <strong className="font-medium text-foreground">Compatible with:</strong>{" "}
                        Lucide, Heroicons, shadcn/ui
                      </span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
                      <span>
                        <strong className="font-medium text-foreground">viewBox:</strong> Original
                        aspect ratio preserved
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
                      <span>
                        <strong className="font-medium text-foreground">Colors:</strong>{" "}
                        Up to 4 auto-optimized
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
                      <span>
                        <strong className="font-medium text-foreground">Perfect for:</strong>{" "}
                        Brand logos, illustrations
                      </span>
                    </li>
                  </>
                )}
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  <span>
                    <strong className="font-medium text-foreground">Output:</strong>{" "}
                    React TSX + SVG file
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/50 py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          <p>
            Built for AI coding workflows •{" "}
            <span className="font-medium text-foreground">Asset-Bridge</span>
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        conversionCount={conversionCount}
      />
    </div>
  )
}
