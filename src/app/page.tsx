"use client"

import { useState, useEffect } from "react"
import { UploadZone } from "@/components/upload-zone"
import { SettingsPanel, OutputMode } from "@/components/settings-panel"
import { ResultsPanel } from "@/components/results-panel"
import { Button } from "@/components/ui/button"
import { Zap, Github, Sparkles, Save, LogIn, Coffee, Users, ImageIcon } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { useConversionCount } from "@/hooks/use-conversion-count"
import { useSavedAsset } from "@/hooks/use-saved-asset"
import { useStats } from "@/hooks/use-stats"
import { AuthModal } from "@/components/auth-modal"
import { FeedbackModal } from "@/components/feedback-modal"
import { UserMenu } from "@/components/user-menu"
import { ToolCompatibility } from "@/components/tool-compatibility"
import { createClient } from "@/lib/supabase/client"
import { trackEvent } from "@/lib/track-event"

// Brand logo component name - change this to use a different saved logo
const BRAND_LOGO_NAME = "ABmini"

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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null)
  
  const { user, loading: authLoading } = useAuth()
  const { count: conversionCount, incrementCount, hasUsedFreeConversion, isLoaded: countLoaded } = useConversionCount()
  const { asset: brandLogo } = useSavedAsset(BRAND_LOGO_NAME)
  const { stats } = useStats()

  // Open feedback modal if requested via localStorage
  useEffect(() => {
    const shouldShowFeedback = localStorage.getItem("openFeedback")
    if (shouldShowFeedback === "true") {
      setShowFeedbackModal(true)
      localStorage.removeItem("openFeedback")
    }
  }, [])
  
  // Size limits differ by mode - icons are naturally smaller
  const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB (Vercel serverless limit is 4.5MB)
  const getMinFileSize = () => mode === "icon" ? 500 : 5000 // 500B for icons, 5KB for logos
  const getRecommendedFileSize = () => mode === "icon" ? 2000 : 30000 // 2KB for icons, 30KB for logos

  // Re-evaluate warning when mode changes
  useEffect(() => {
    if (selectedFile) {
      // Check if too large
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
    
    // Check if file is too large
    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 4MB.`)
      setWarning(null)
      return
    }
    
    // Check file size and warn if too small (mode-aware)
    const minSize = getMinFileSize()
    const recommendedSize = getRecommendedFileSize()
    
    if (file.size < minSize) {
      setWarning(`⚠️ Image is very small (${Math.round(file.size / 1000)}KB). Results may vary.`)
    } else if (file.size < recommendedSize && mode === "logo") {
      setWarning(`💡 Image is ${Math.round(file.size / 1000)}KB. For better color accuracy in Logo mode, we recommend larger images.`)
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

    // Check file size limit
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File is too large (${Math.round(selectedFile.size / 1024 / 1024)}MB). Maximum size is 4MB.`)
      return
    }

    // Check if user needs to sign in (used free conversion and not logged in)
    if (hasUsedFreeConversion && !user) {
      setShowAuthModal(true)
      return
    }

    // 📊 Track generate button click
    trackEvent("generate_click", {
      mode,
      fileType: selectedFile.type,
      fileSize: selectedFile.size,
      componentName: componentName || undefined,
    })

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

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type")
      const isJson = contentType?.includes("application/json")
      
      if (!response.ok) {
        // Special handling for specific errors
        if (response.status === 429) {
          throw new Error("⏰ Daily limit reached! Come back tomorrow or sign in for unlimited access.")
        }
        if (response.status === 413) {
          throw new Error(`📦 File is too large (${Math.round(selectedFile.size / 1024 / 1024)}MB). Maximum size is 4MB. Try using a smaller image.`)
        }
        
        // Try to parse error message if it's JSON
        if (isJson) {
          const data = await response.json()
          throw new Error(data.error || "Processing failed")
        } else {
          // Non-JSON error (likely server error page)
          const text = await response.text()
          throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`)
        }
      }

      const data = await response.json()

      setResult(data.data)
      
      // 📊 Track successful generation
      trackEvent("generate_success", {
        mode,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      })
      
      // Increment conversion count for anonymous users
      if (!user) {
        incrementCount()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      
      // 📊 Track generation error
      trackEvent("generate_error", {
        mode,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        error: errorMessage,
      })
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
          visibility: "public", // MVP: all assets are public by default
        })
        .select()
        .single()

      if (dbError) throw dbError

      setSavedAssetId(asset.id)
      
      // 📊 Track save asset
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
                Asset-Bridge
              </div>
              <p className="hidden sm:block text-[11px] font-medium text-muted-foreground">
                Host Images for AI Previews
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 lg:inline-flex">
              <Sparkles className="h-3 w-3" />
              AI Workflow Ready
            </span>
            
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 sm:h-10 sm:w-10" asChild>
              <a
                href="https://github.com/tzipiwalles/iconify-react"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4 sm:h-5 sm:w-5" />
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
                  size="sm"
                  className="gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm px-2.5 sm:px-4"
                >
                  <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Sign in</span>
                  <span className="xs:hidden">Login</span>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Use Your Real Custom Logo in{" "}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              AI Previews
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Stop seeing broken image icons. Host your custom logos & local assets instantly — get permanent links for Cursor, ChatGPT Canvas, Base44 & more.
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

            <ResultsPanel result={result} onLoginClick={() => setShowAuthModal(true)} />
          </div>

          {/* Right column - Settings */}
          <div className="space-y-4">
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

        {/* Showcase Section - Social Proof */}
        <div className="mt-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Works flawlessly with your favorite AI tools
            </h2>
            <p className="mt-3 text-muted-foreground">
              Real examples from our users — your logos, your brand, zero broken images.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 - ChatGPT Canvas */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/chatgpt-canvas.png", alt: "Magazine cover created in ChatGPT Canvas with Asset-Bridge logo" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/chatgpt-canvas.png"
                  alt="Magazine cover created in ChatGPT Canvas with Asset-Bridge logo"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <img src="https://www.assetbridge.app/api/assets/Openai/svg" alt="" className="h-3.5 w-3.5" style={{ filter: 'brightness(0) invert(1)' }} />
                    ChatGPT Canvas
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/Blossomco/svg" 
                    alt="Blossomco logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  Brand assets integrated perfectly into marketing designs.
                </p>
              </div>
            </div>

            {/* Card 2 - Google AI Studio */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/gemini-dashboard.png", alt: "Smart home dashboard created in Google AI Studio with Asset-Bridge logo" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/gemini-dashboard.png"
                  alt="Smart home dashboard created in Google AI Studio with Asset-Bridge logo"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <span className="text-blue-400">●</span> Google AI Studio
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/NexusOS/svg" 
                    alt="NexusOS logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  Live SaaS dashboards generated with dark mode logos.
                </p>
              </div>
            </div>

            {/* Card 3 - Base44 */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/base44-ecommerce.png", alt: "E-commerce site created in Base44 with Asset-Bridge logo" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/base44-ecommerce.png"
                  alt="E-commerce site created in Base44 with Asset-Bridge logo"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <span className="text-orange-400">●</span> Base44 (No-Code)
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/Blossomco/svg" 
                    alt="Blossomco logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  Full e-commerce sites built instantly with custom branding.
                </p>
              </div>
            </div>

            {/* Card 4 - v0.dev */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/v0-quiz-app.png", alt: "Quiz app created in v0.dev with Asset-Bridge logo" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/v0-quiz-app.png"
                  alt="Quiz app created in v0.dev with Asset-Bridge logo"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <img src="https://www.assetbridge.app/api/assets/V0ByVercelLogo/svg" alt="" className="h-3.5 w-3.5" style={{ filter: 'brightness(0) invert(1)' }} />
                    v0.dev
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/QuizFlow/svg" 
                    alt="QuizFlow logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  React Components generated in v0.
                </p>
              </div>
            </div>

            {/* Card 5 - Gemini Canvas (Application) */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/gemini-canvas-sec1.png", alt: "Password Generator app created in Gemini Canvas" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/gemini-canvas-sec1.png"
                  alt="Password Generator app created in Gemini Canvas"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <span className="text-cyan-400">✦</span> Gemini Canvas
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/Sec1/svg" 
                    alt="Sec1 logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  Branded web application with custom logo integration.
                </p>
              </div>
            </div>

            {/* Card 6 - Gemini Canvas (Presentation) */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/gemini-canvas-nexus.png", alt: "Investor presentation created in Gemini Canvas" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/gemini-canvas-nexus.png"
                  alt="Investor presentation created in Gemini Canvas"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <span className="text-cyan-400">✦</span> Gemini Canvas
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/NexusOS/svg" 
                    alt="NexusOS logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  Professional investor deck with smooth transitions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tool Compatibility Section */}
        <div className="mt-16">
          <ToolCompatibility />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/50 py-4">
        <div className="mx-auto max-w-6xl px-6">
          {/* Stats */}
          <div className="mb-3 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">{stats.users}</span> users
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span className="font-medium text-foreground">{stats.totalAssets}</span> assets created
            </div>
          </div>
          {/* Credit, Coffee & Feedback */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <p className="text-sm text-muted-foreground">
              Built for AI coding workflows •{" "}
              <span className="font-medium text-foreground">Asset-Bridge</span>
            </p>
            <span className="hidden text-muted-foreground sm:inline">•</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Give Feedback
              </button>
              <span className="text-muted-foreground">•</span>
              <a
                href="https://buymeacoffee.com/tzipiw"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                <Coffee className="h-4 w-4" />
                <span>Buy me a coffee</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        conversionCount={conversionCount}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      {/* Lightbox Modal for Showcase Images */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <Image
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              width={1920}
              height={1080}
              className="max-h-[90vh] w-auto object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
