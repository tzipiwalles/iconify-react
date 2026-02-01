"use client"

import { useState, useEffect } from "react"
import { UploadZone } from "@/components/upload-zone"
import { SettingsPanel, OutputMode } from "@/components/settings-panel"
import { ResultsPanel } from "@/components/results-panel"
import { Button } from "@/components/ui/button"
import { Zap } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { AuthModal } from "@/components/auth-modal"
import { SiteHeader } from "@/components/site-header"
import { trackEvent } from "@/lib/track-event"

interface ProcessedResult {
  componentName: string
  optimizedSvg: string | null
  reactComponent: string
  publicUrl: string | null
  originalFileName: string
  detectedColors?: string[]
  assetId?: string | null
  mode?: string
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
  
  const { user } = useAuth()

  // File size limits based on mode
  const getMaxFileSize = () => mode === "image" ? 5 * 1024 * 1024 : 4 * 1024 * 1024
  const getMinFileSize = () => mode === "icon" ? 500 : mode === "logo" ? 5000 : 1000
  const getRecommendedFileSize = () => mode === "icon" ? 2000 : mode === "logo" ? 30000 : 10000

  useEffect(() => {
    if (selectedFile) {
      const maxSize = getMaxFileSize()
      if (selectedFile.size > maxSize) {
        const maxMB = Math.round(maxSize / 1024 / 1024)
        setError(`File is too large (${Math.round(selectedFile.size / 1024 / 1024)}MB). Maximum size is ${maxMB}MB.`)
        setWarning(null)
        return
      }
      
      setError(null)
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
    
    const maxSize = getMaxFileSize()
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / 1024 / 1024)
      setError(`File is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is ${maxMB}MB.`)
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
    setComponentName(baseName || (mode === "image" ? "MyImage" : "CustomIcon"))
  }

  const handleClear = () => {
    setSelectedFile(null)
    setResult(null)
    setError(null)
    setWarning(null)
    setComponentName("")
  }

  const handleProcess = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setError(null)

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

      // API returns { success, data: { ... } } - use data.data
      setResult({
        ...data.data,
        originalFileName: selectedFile.name,
      })

      trackEvent("generate_success", {
        mode,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        componentName: data.data.componentName,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsProcessing(false)
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
      <SiteHeader 
        showBackButton={true} 
        onLoginClick={() => setShowAuthModal(true)}
        title="Create Asset"
        subtitle="Convert your image to SVG"
      />

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
              className="group relative h-12 w-full gap-2 overflow-hidden rounded-xl text-base font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
            >
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 via-fuchsia-500 to-primary bg-[length:200%_100%] animate-[gradient_3s_ease-in-out_infinite]" />
              <span className="relative flex items-center justify-center gap-2">
                {isProcessing ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    {mode === "image" ? "Upload Image" : "Generate Logo"}
                  </>
                )}
              </span>
            </Button>

            {/* Success message when asset is created */}
            {result?.assetId && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <p className="text-sm font-medium text-emerald-400">
                  ✓ {mode === "image" ? "Image uploaded" : "Logo created"} successfully!
                </p>
                {user ? (
                  <Link href="/my-assets" className="mt-2 inline-block text-xs text-emerald-400/70 hover:underline">
                    View in My Assets →
                  </Link>
                ) : (
                  <button 
                    onClick={() => setShowAuthModal(true)}
                    className="mt-2 inline-block text-xs text-emerald-400/70 hover:underline"
                  >
                    Sign in to manage your assets →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        conversionCount={0}
      />
    </div>
  )
}
