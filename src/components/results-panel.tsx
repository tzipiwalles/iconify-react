"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Copy,
  Check,
  Eye,
  Code2,
  Download,
  ExternalLink,
  Palette,
  Sparkles,
  Clock,
  LogIn,
  Link as LinkIcon,
  Share2,
  Globe,
  Lock,
} from "lucide-react"
import { ShareModal } from "@/components/share-modal"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

type BackgroundType = "black" | "white" | "gradient"

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

interface ResultsPanelProps {
  result: ProcessedResult | null
  onLoginClick?: () => void
}

export function ResultsPanel({ result, onLoginClick }: ResultsPanelProps) {
  const { user } = useAuth()
  const [copiedSvg, setCopiedSvg] = useState(false)
  const [copiedComponent, setCopiedComponent] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [togglingVisibility, setTogglingVisibility] = useState(false)
  
  const [background, setBackground] = useState<BackgroundType>("white")
  
  // Auto-select background based on detected colors
  // If colors are mostly dark, use white background for visibility
  const suggestedBackground = useMemo((): BackgroundType => {
    if (!result?.detectedColors?.length) return "white"
    const darkColors = result.detectedColors.filter(color => {
      const hex = color.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      return luminance < 0.5
    })
    // If most colors are dark, use white background
    return darkColors.length > result.detectedColors.length / 2 ? "white" : "black"
  }, [result?.detectedColors])
  
  // Update background when result changes
  useEffect(() => {
    setBackground(suggestedBackground)
  }, [suggestedBackground])

  // Generate the hosted URL for AI tools
  const getHostedUrl = () => {
    if (!result) return ""
    // Use the permanent API URL format
    return `https://www.assetbridge.app/api/assets/${result.componentName}/svg`
  }

  const hostedUrl = getHostedUrl()

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(hostedUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const handleCopyAiPrompt = async () => {
    const prompt = `Use this logo in the design (do not use inline SVG, use this hosted link): ${hostedUrl}`
    await navigator.clipboard.writeText(prompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  const handleSaveAndLogin = () => {
    // Save the current asset info to localStorage for claiming after login
    if (result) {
      localStorage.setItem("pendingAsset", JSON.stringify({
        componentName: result.componentName,
        timestamp: Date.now(),
      }))
    }
    onLoginClick?.()
  }

  const handleCopy = async (text: string, type: "svg" | "component") => {
    await navigator.clipboard.writeText(text)
    if (type === "svg") {
      setCopiedSvg(true)
      setTimeout(() => setCopiedSvg(false), 2000)
    } else {
      setCopiedComponent(true)
      setTimeout(() => setCopiedComponent(false), 2000)
    }
  }

  const handleToggleVisibility = async () => {
    if (!result?.assetId) return
    
    setTogglingVisibility(true)
    try {
      const response = await fetch(`/api/assets/${result.componentName}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: isPublic ? "private" : "public" }),
      })
      
      if (response.ok) {
        setIsPublic(!isPublic)
      }
    } catch (error) {
      console.error("Failed to toggle visibility:", error)
    } finally {
      setTogglingVisibility(false)
    }
  }

  const handleDownloadSvg = () => {
    if (!result) return
    const blob = new Blob([result.optimizedSvg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${result.componentName}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadComponent = () => {
    if (!result) return
    const blob = new Blob([result.reactComponent], {
      type: "text/typescript",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${result.componentName}.tsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!result) {
    return (
      <div className="flex min-h-[250px] sm:min-h-[400px] items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Eye className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Upload an asset to see the results
          </p>
        </div>
      </div>
    )
  }

  const backgroundClasses: Record<BackgroundType, string> = {
    black: "bg-black",
    white: "bg-white",
    gradient:
      "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500",
  }

  const isGuest = !user

  return (
    <div className="space-y-4">
      {/* ========== PRIORITY SECTION: Hosted URL for AI Tools ========== */}
      <div className="rounded-xl border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI-Ready Link</h3>
            <p className="text-xs text-muted-foreground">Use this URL in ChatGPT, Cursor, Claude & more</p>
          </div>
        </div>

        {/* URL Input + Copy Button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
              <LinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <input
                type="text"
                readOnly
                value={hostedUrl}
                className="w-full bg-transparent text-sm font-mono text-foreground outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 flex-shrink-0"
                onClick={handleCopyUrl}
              >
                {copiedUrl ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <Button
            onClick={handleCopyAiPrompt}
            className="h-11 gap-2 bg-gradient-to-r from-primary to-purple-600 px-5 font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
          >
            {copiedPrompt ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Copy AI Prompt
              </>
            )}
          </Button>
        </div>

        {/* Action Buttons: Share & Make Public */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={() => setShowShareModal(true)}
            variant="outline"
            size="sm"
            className="gap-2 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
          >
            <Share2 className="h-4 w-4" />
            Share & Embed
          </Button>
          
          {result?.assetId && (
            <Button
              onClick={handleToggleVisibility}
              variant="outline"
              size="sm"
              disabled={togglingVisibility}
              className={cn(
                "gap-2",
                isPublic 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" 
                  : "bg-gray-500/10 border-gray-500/30 text-gray-400 hover:bg-gray-500/20"
              )}
            >
              {togglingVisibility ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              ) : isPublic ? (
                <Globe className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {isPublic ? "Public" : "Private"}
            </Button>
          )}
        </div>

        {/* Guest Warning Banner */}
        {isGuest && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-start sm:items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0 text-amber-400 mt-0.5 sm:mt-0" />
              <p className="text-sm text-amber-200">
                <span className="font-medium">Guest Link:</span> Expires in 60 minutes. Log in to claim this link forever.
              </p>
            </div>
            <Button
              onClick={handleSaveAndLogin}
              size="sm"
              className="gap-2 bg-amber-500 text-black hover:bg-amber-400 font-medium"
            >
              <LogIn className="h-4 w-4" />
              Save & Login
            </Button>
          </div>
        )}
      </div>

      {/* ========== SECONDARY SECTION: Preview & Code ========== */}
      <div className="rounded-xl border border-border bg-card">
        <Tabs defaultValue="preview" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border px-2 sm:px-4">
            <TabsList className="h-12 sm:h-14 bg-transparent w-full sm:w-auto overflow-x-auto hide-scrollbar">
              <TabsTrigger
                value="preview"
                className="gap-1.5 sm:gap-2 data-[state=active]:bg-muted text-xs sm:text-sm px-2 sm:px-3"
              >
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Preview</span>
              </TabsTrigger>
              {/* Only show React/SVG tabs for non-image modes */}
              {result.mode !== "image" && (
                <>
                  <TabsTrigger
                    value="component"
                    className="gap-1.5 sm:gap-2 data-[state=active]:bg-muted text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Code2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">React</span>
                    <span className="sm:hidden">TSX</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="svg"
                    className="gap-1.5 sm:gap-2 data-[state=active]:bg-muted text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <svg
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    SVG
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <div className="flex items-center gap-2">
              {result.publicUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground"
                  onClick={() => window.open(result.publicUrl!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Storage URL</span>
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="preview" className="m-0">
            <div className="p-6">
            {/* Background toggle toolbar */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Palette className="h-4 w-4" />
                Preview Background
              </div>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {(["black", "white", "gradient"] as const).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setBackground(bg)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      background === bg
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {bg.charAt(0).toUpperCase() + bg.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview container */}
            <div
              className={cn(
                "flex min-h-[220px] items-center justify-center rounded-xl p-8 transition-all",
                backgroundClasses[background]
              )}
            >
              {result.mode === "image" ? (
                /* Image preview for raw images */
                <img
                  src={result.publicUrl || ""}
                  alt={result.componentName}
                  className="max-h-48 max-w-full rounded-lg object-contain"
                />
              ) : (
                /* SVG preview for icons/logos */
                <div
                  className={cn(
                    "flex h-28 w-28 items-center justify-center transition-colors [&>svg]:h-full [&>svg]:w-full",
                    background === "white" ? "text-black" : "text-white"
                  )}
                  dangerouslySetInnerHTML={{ __html: result.optimizedSvg || "" }}
                />
              )}
            </div>

            {/* Info and action bar */}
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-3">
                <p className="font-medium">{result.componentName}</p>
                <p className="text-sm text-muted-foreground">
                  From: {result.originalFileName}
                </p>
              </div>
              
              {/* Action buttons grid */}
              <div className={cn("grid gap-3", result.mode === "image" ? "grid-cols-1" : "grid-cols-2")}>
                {/* SVG Actions - Only for icon/logo modes */}
                {result.mode !== "image" && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SVG</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleCopy(result.optimizedSvg || "", "svg")}
                      >
                        {copiedSvg ? (
                          <>
                            <Check className="mr-2 h-4 w-4 text-emerald-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={handleDownloadSvg}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Image Actions - Only for image mode */}
                {result.mode === "image" && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Image</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleCopy(result.publicUrl || "", "url")}
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="mr-2 h-4 w-4 text-emerald-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Copy URL
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.open(result.publicUrl || "", "_blank")}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* React Component Actions - Only for icon/logo modes */}
                {result.mode !== "image" && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">React (.tsx)</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleCopy(result.reactComponent, "component")}
                      >
                        {copiedComponent ? (
                          <>
                            <Check className="mr-2 h-4 w-4 text-emerald-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={handleDownloadComponent}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="component" className="m-0">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Ready-to-use React TypeScript component
              </p>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700"
                  onClick={() =>
                    handleCopy(result.reactComponent, "component")
                  }
                >
                  {copiedComponent ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={handleDownloadComponent}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download .tsx
                </Button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-[#0d1117] p-5">
              <pre className="overflow-x-auto text-[13px] leading-relaxed">
                <code className="font-mono text-[#e6edf3]">
                  {result.reactComponent}
                </code>
              </pre>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="svg" className="m-0">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Optimized SVG code
              </p>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleCopy(result.optimizedSvg, "svg")}
                >
                  {copiedSvg ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={handleDownloadSvg}>
                  <Download className="mr-2 h-4 w-4" />
                  Download .svg
                </Button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-[#0d1117] p-5">
              <pre className="overflow-x-auto text-[13px] leading-relaxed">
                <code className="font-mono text-[#e6edf3]">
                  {result.optimizedSvg}
                </code>
              </pre>
            </div>
          </div>
        </TabsContent>
        </Tabs>
      </div>

      {/* Share Modal */}
      {showShareModal && result && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          asset={{
            id: result.assetId || "",
            component_name: result.componentName,
            svg_url: result.publicUrl || hostedUrl,
            react_component: result.reactComponent,
            mode: (result.mode as "icon" | "logo") || "icon",
            detected_colors: result.detectedColors || [],
            visibility: isPublic ? "public" : "private",
          }}
          baseUrl={typeof window !== "undefined" ? window.location.origin : "https://www.assetbridge.app"}
        />
      )}
    </div>
  )
}
