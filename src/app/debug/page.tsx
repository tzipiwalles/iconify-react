"use client"

import { useState } from "react"
import { UploadZone } from "@/components/upload-zone"
import { ResultsPanel } from "@/components/results-panel"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ColorPicker } from "@/components/ui/color-picker"
import { cn } from "@/lib/utils"
import { SiteHeader } from "@/components/site-header"

interface ProcessedResult {
  componentName: string
  optimizedSvg: string
  reactComponent: string
  publicUrl: string | null
  originalFileName: string
  detectedColors?: string[]
}

const COLOR_OPTIONS = [1, 2, 3, 4] // Max 4 for potrace performance

export default function DebugPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [removeBackground, setRemoveBackground] = useState(false)
  const [colorCount, setColorCount] = useState(1)
  const [customColors, setCustomColors] = useState<string[]>(["currentColor"])
  const [autoDetectColors, setAutoDetectColors] = useState(true)
  const [componentName, setComponentName] = useState("")
  const [useCurrentColor, setUseCurrentColor] = useState(true)
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
    } else if (!autoDetectColors && customColors.length < count) {
      const defaultColors = ["#3B82F6", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#6366F1"]
      const newColors = [...customColors.filter(c => c !== "currentColor")]
      while (newColors.length < count) {
        newColors.push(defaultColors[newColors.length] || "#6366F1")
      }
      setCustomColors(newColors)
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
        useCurrentColor && colorCount === 1 ? ["currentColor"] : (autoDetectColors ? [] : customColors)
      ))
      if (componentName.trim()) {
        formData.append("componentName", componentName.trim())
      }
      // Use debug mode to bypass mode logic
      formData.append("mode", colorCount === 1 && useCurrentColor ? "icon" : "logo")

      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type")
      const isJson = contentType?.includes("application/json")
      
      if (!response.ok) {
        if (isJson) {
          const data = await response.json()
          throw new Error(data.error || "Processing failed")
        } else {
          const text = await response.text()
          throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`)
        }
      }

      const data = await response.json()

      setResult(data.data)
      
      if (data.data.detectedColors && data.data.detectedColors.length > 0) {
        setCustomColors(data.data.detectedColors)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="dark min-h-screen bg-background">
      {/* Header */}
      <SiteHeader 
        showBackButton={true}
        title="Debug Mode"
        subtitle="Manual controls for development"
        showAuth={false}
      />

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-200">
            <strong>⚠️ Debug Mode:</strong> This page gives you full control over all processing parameters.
            Use this for testing and development only.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr,450px]">
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

          {/* Right column - Debug Settings */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-5 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Debug Settings
              </h3>

              <div className="space-y-5">
                {/* Remove Background Toggle */}
                <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                  <Label htmlFor="remove-bg" className="cursor-pointer text-sm font-medium">
                    Remove Background
                  </Label>
                  <Switch
                    id="remove-bg"
                    checked={removeBackground}
                    onCheckedChange={setRemoveBackground}
                    disabled={isProcessing}
                  />
                </div>

                {/* Color Count Selector */}
                <div className="rounded-xl bg-muted/50 p-4">
                  <Label className="mb-3 block text-sm font-medium">
                    Color Count: {colorCount}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((count) => (
                      <button
                        key={count}
                        onClick={() => handleColorCountChange(count)}
                        disabled={isProcessing}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-all",
                          colorCount === count
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Use currentColor Toggle */}
                {colorCount === 1 && (
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                    <Label htmlFor="use-current" className="cursor-pointer text-sm font-medium">
                      Use currentColor (themeable)
                    </Label>
                    <Switch
                      id="use-current"
                      checked={useCurrentColor}
                      onCheckedChange={setUseCurrentColor}
                      disabled={isProcessing}
                    />
                  </div>
                )}

                {/* Auto-detect colors toggle */}
                {(colorCount > 1 || !useCurrentColor) && (
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                    <Label htmlFor="auto-detect" className="cursor-pointer text-sm font-medium">
                      Auto-detect Colors
                    </Label>
                    <Switch
                      id="auto-detect"
                      checked={autoDetectColors}
                      onCheckedChange={setAutoDetectColors}
                      disabled={isProcessing}
                    />
                  </div>
                )}

                {/* Custom Color Picker */}
                {!autoDetectColors && (colorCount > 1 || !useCurrentColor) && (
                  <div className="rounded-xl bg-muted/50 p-4">
                    <Label className="mb-3 block text-sm font-medium">
                      Custom Colors
                    </Label>
                    <ColorPicker
                      colors={customColors.filter(c => c !== "currentColor")}
                      onChange={setCustomColors}
                      maxColors={colorCount}
                      disabled={isProcessing}
                    />
                  </div>
                )}

                {/* Component Name Input */}
                <div className="rounded-xl bg-muted/50 p-4">
                  <Label htmlFor="component-name" className="mb-3 block text-sm font-medium">
                    Component Name
                  </Label>
                  <Input
                    id="component-name"
                    placeholder="Auto-generated from filename"
                    value={componentName}
                    onChange={(e) => setComponentName(e.target.value)}
                    disabled={isProcessing}
                    maxLength={25}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleProcess}
              disabled={!selectedFile || isProcessing}
              className="h-14 w-full gap-3 rounded-xl bg-yellow-600 text-base font-semibold hover:bg-yellow-700"
            >
              {isProcessing ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Process (Debug)
                </>
              )}
            </Button>

            {/* Detected Colors Display */}
            {result?.detectedColors && result.detectedColors.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="mb-3 text-sm font-medium text-emerald-400">
                  Detected Colors
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.detectedColors.map((color, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded-md border border-white/20"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-mono text-muted-foreground">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debug Info */}
            <div className="rounded-xl border border-border bg-card/50 p-4">
              <h4 className="mb-3 text-sm font-semibold">Current Settings</h4>
              <pre className="overflow-auto rounded-lg bg-muted/50 p-3 text-xs font-mono text-muted-foreground">
{JSON.stringify({
  removeBackground,
  colorCount,
  useCurrentColor: colorCount === 1 && useCurrentColor,
  autoDetectColors,
  customColors: autoDetectColors ? "auto" : customColors,
  componentName: componentName || "auto",
}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
