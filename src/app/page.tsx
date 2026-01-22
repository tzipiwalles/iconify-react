"use client"

import { useState } from "react"
import { UploadZone } from "@/components/upload-zone"
import { SettingsPanel } from "@/components/settings-panel"
import { ResultsPanel } from "@/components/results-panel"
import { Button } from "@/components/ui/button"
import { Zap, Github, Sparkles } from "lucide-react"

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
  const [removeBackground, setRemoveBackground] = useState(false)
  const [colorCount, setColorCount] = useState(1)
  const [customColors, setCustomColors] = useState<string[]>(["currentColor"])
  const [autoDetectColors, setAutoDetectColors] = useState(true)
  const [componentName, setComponentName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setResult(null)
    setError(null)
  }

  const handleClear = () => {
    setSelectedFile(null)
    setResult(null)
    setError(null)
    setCustomColors(["currentColor"])
    setAutoDetectColors(true)
    setComponentName("")
  }

  const handleColorCountChange = (count: number) => {
    setColorCount(count)
    if (count === 1) {
      setCustomColors(["currentColor"])
    } else if (!autoDetectColors && customColors.length === 1 && customColors[0] === "currentColor") {
      // Initialize with default brand colors
      const defaultColors = ["#1F2937", "#4B5563", "#9CA3AF", "#D1D5DB", "#F3F4F6"]
      setCustomColors(defaultColors.slice(0, count))
    }
  }

  const handleProcess = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("removeBackground", removeBackground.toString())
      formData.append("colorCount", colorCount.toString())
      formData.append("autoDetectColors", autoDetectColors.toString())
      formData.append("customColors", JSON.stringify(
        colorCount === 1 ? ["currentColor"] : (autoDetectColors ? [] : customColors)
      ))
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
      
      // Update custom colors with detected colors
      if (data.data.detectedColors && data.data.detectedColors.length > 0) {
        setCustomColors(data.data.detectedColors)
        // Turn off auto-detect so user can now edit
        if (autoDetectColors) {
          setAutoDetectColors(false)
        }
      }
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
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" />
              </a>
            </Button>
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
            Upload your images or SVGs and get optimized, standardized React
            components with auto-detected brand colors.
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

            <ResultsPanel result={result} />
          </div>

          {/* Right column - Settings */}
          <div className="space-y-6">
            <SettingsPanel
              removeBackground={removeBackground}
              onRemoveBackgroundChange={setRemoveBackground}
              colorCount={colorCount}
              onColorCountChange={handleColorCountChange}
              customColors={customColors}
              onCustomColorsChange={setCustomColors}
              autoDetectColors={autoDetectColors}
              onAutoDetectColorsChange={setAutoDetectColors}
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
                  {result ? "Re-process with Changes" : "Generate Component"}
                </>
              )}
            </Button>

            {/* Detected Colors Display */}
            {result?.detectedColors && result.detectedColors.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                  Detected Colors
                </div>
                <div className="flex gap-2">
                  {result.detectedColors.map((color, i) => (
                    <div
                      key={i}
                      className="group relative"
                    >
                      <div
                        className="h-8 w-8 rounded-lg border border-white/20 shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">
                        {color}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Edit colors above and click &quot;Re-process&quot; to apply changes
                </p>
              </div>
            )}

            {/* Info card */}
            <div className="rounded-xl border border-border bg-card/50 p-5">
              <h4 className="mb-3.5 text-sm font-semibold">
                Output Specifications
              </h4>
              <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
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
                    <strong className="font-medium text-foreground">Colors:</strong>{" "}
                    {colorCount === 1 ? "currentColor (themeable)" : `${colorCount} auto-detected/custom`}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span>
                    <strong className="font-medium text-foreground">Size:</strong> CSS
                    controlled (no fixed w/h)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span>
                    <strong className="font-medium text-foreground">Format:</strong>{" "}
                    React TSX component
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
    </div>
  )
}
