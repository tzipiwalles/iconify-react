"use client"

import { useState, useEffect } from "react"
import { UploadZone } from "@/components/upload-zone"
import { SettingsPanel, OutputMode } from "@/components/settings-panel"
import { ResultsPanel } from "@/components/results-panel"
import { Button } from "@/components/ui/button"
import { Zap, Github, ArrowLeft, Save, LogIn } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useConversionCount } from "@/hooks/use-conversion-count"
import { useSavedAsset } from "@/hooks/use-saved-asset"
import { AuthModal } from "@/components/auth-modal"
import { UserMenu } from "@/components/user-menu"
import { createClient } from "@/lib/supabase/client"
import { trackEvent } from "@/lib/track-event"

// Brand logo component name
const BRAND_LOGO_NAME = "ABmini"

interface ProcessedResult {
  componentName: string
  optimizedSvg: string
  reactComponent: string
  publicUrl: string | null
  originalFileName: string
  detectedColors?: string[]
}

export default function CreatePage() {
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
  const { asset: brandLogo } = useSavedAsset(BRAND_LOGO_NAME)

  const MAX_FILE_SIZE = 4 * 1024 * 1024
  const getMinFileSize = () => mode === "icon" ? 500 : 5000
  const getRecommendedFileSize = () => mode === "icon" ? 2000 : 30000

  useEffect(() => {
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(`File is too large (${Math.round(selectedFile.size / 1024 / 1024)}MB). Maximum size is 4MB.`)
        setWarning(null)
        return
      }
      
      const minSize = getMinFileSize()
      const recommendedSize = getRecommendedFileSize()
      
      if (selectedFile.size < minSize) {
        setWarning(`⚠️ Image is very small (${Math.round(selectedFile.size / 1000)}KB). Results may vary.`)
      } else if (selectedFile.size < recommendedSize && mode === "logo") {
        setWarning(`💡 Image is ${Math.round(selectedFile.size / 1000)}KB. For better color accuracy in Logo mode, we recommend larger images.`)
      } else {
        setWarning(null)
      }
    }
  }, [mode, selectedFile])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setResult(null)
    setError(null)
    
    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 4MB.`)
      setWarning(null)
      return
    }
    
    const minSize = getMinFileSize()
    const recommendedSize = getRecommendedFileSize()
    
    if (file.size < minSize) {
      setWarning(`⚠️ Image is very small (${Math.round(file.size / 1000)}KB). Results may vary.`)
    } else if (file.size < recommendedSize && mode === "logo") {
      setWarning(`💡 Image is ${Math.round(file.size / 1000)}KB. For better color accuracy in Logo mode, we recommend larger images.`)
    } else {
      setWarning(null)
    }
    
    const baseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .replace(/^\d+/, "")
    setComponentName(baseName || "CustomIcon")
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

    if (!countLoaded) return
    
    if (!user && hasUsedFreeConversion) {
      setShowAuthModal(true)
      return
    }

    setIsProcessing(true)
    setError(null)
    setSavedAssetId(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("mode", mode)
      formData.append("removeBackground", removeBackground.toString())
      formData.append("componentName", componentName || "CustomIcon")

      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Processing failed")
      }

      setResult({
        componentName: data.componentName,
        optimizedSvg: data.optimizedSvg,
        reactComponent: data.reactComponent,
        publicUrl: data.publicUrl,
        originalFileName: selectedFile.name,
        detectedColors: data.detectedColors,
      })

      incrementCount()
      
      trackEvent("generate_success", {
        mode,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        componentName: data.componentName,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveAsset = async () => {
    if (!user || !result || !selectedFile) return
    
    setIsSaving(true)
    setError(null)

    try {
      const supabase = createClient()

      const originalFileName = `${user.id}/${Date.now()}_${selectedFile.name}`
      const { error: uploadOriginalError } = await supabase.storage
        .from("assets")
        .upload(`originals/${originalFileName}`, selectedFile)

      if (uploadOriginalError) throw uploadOriginalError

      const { data: { publicUrl: originalUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(`originals/${originalFileName}`)

      const svgFileName = `${user.id}/${result.componentName}_${Date.now()}.svg`
      const { error: uploadSvgError } = await supabase.storage
        .from("assets")
        .upload(`outputs/${svgFileName}`, new Blob([result.optimizedSvg], { type: "image/svg+xml" }))

      if (uploadSvgError) throw uploadSvgError

      const { data: { publicUrl: svgUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(`outputs/${svgFileName}`)

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
          visibility: "public",
        })
        .select()
        .single()

      if (dbError) throw dbError

      setSavedAssetId(asset.id)
      
      trackEvent("save_asset", {
        mode,
        componentName: result.componentName,
      })
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
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3.5">
              <div className={`flex items-center justify-center rounded-xl shadow-lg overflow-hidden ${
                brandLogo?.svgUrl 
                  ? "h-9 w-9 sm:h-12 sm:w-12 bg-black p-0.5 sm:p-1" 
                  : "h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-primary to-purple-600 shadow-primary/20"
              }`}>
                {brandLogo?.svgUrl ? (
                  <img 
                    src={brandLogo.svgUrl} 
                    alt="Asset-Bridge Logo" 
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                )}
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold tracking-tight">
                  Create Asset
                </div>
                <p className="hidden sm:block text-[11px] font-medium text-muted-foreground">
                  Convert your image to SVG
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 sm:h-10 sm:w-10" asChild>
              <a
                href="https://github.com/tzipiwalles/iconify-react"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </Button>
            
            {!authLoading && (
              user ? (
                <UserMenu />
              ) : (
                <Button
                  onClick={() => setShowAuthModal(true)}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm px-2.5 sm:px-4"
                >
                  <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Sign in</span>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Create Your{" "}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Icon or Logo
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Upload an image and convert it to a clean SVG with a permanent hosted URL.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr,380px]">
          {/* Left column - Upload and Results */}
          <div className="space-y-4">
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

            {result && (
              <ResultsPanel 
                result={result} 
                onLoginClick={() => setShowAuthModal(true)}
              />
            )}
          </div>

          {/* Right column - Settings */}
          <div className="lg:sticky lg:top-24 lg:h-fit space-y-4">
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
              disabled={!selectedFile || isProcessing || !!error}
              className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              {isProcessing ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Convert to SVG
                </>
              )}
            </Button>

            {result && !savedAssetId && (
              <Button
                onClick={user ? handleSaveAsset : () => setShowAuthModal(true)}
                disabled={isSaving}
                variant="outline"
                className="h-12 w-full gap-2 rounded-xl text-base font-semibold"
              >
                {isSaving ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                    Saving...
                  </>
                ) : user ? (
                  <>
                    <Save className="h-5 w-5" />
                    Save & Get Permanent URL
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Sign in to Save
                  </>
                )}
              </Button>
            )}

            {savedAssetId && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <p className="text-sm font-medium text-emerald-400">
                  ✓ Asset saved successfully!
                </p>
                <Link href="/my-assets" className="mt-2 inline-block text-xs text-emerald-400/70 hover:underline">
                  View in My Assets →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        conversionCount={conversionCount}
      />
    </div>
  )
}
