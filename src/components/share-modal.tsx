"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Copy, Check, Code, Image, Globe, Link as LinkIcon } from "lucide-react"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  asset: {
    component_name: string
    react_component: string
    svg_url: string
    visibility: string
  }
  baseUrl: string
}

type CopyType = "url" | "img" | "react" | "html" | null

export function ShareModal({ isOpen, onClose, asset, baseUrl }: ShareModalProps) {
  const [copied, setCopied] = useState<CopyType>(null)

  if (!isOpen) return null

  const svgEndpoint = `${baseUrl}/api/assets/${encodeURIComponent(asset.component_name)}/svg`
  const svgWithBgBlack = `${baseUrl}/api/assets/${encodeURIComponent(asset.component_name)}/svg-with-bg?bg=black`
  const svgWithBgWhite = `${baseUrl}/api/assets/${encodeURIComponent(asset.component_name)}/svg-with-bg?bg=white`
  const jsonEndpoint = `${baseUrl}/api/assets/${encodeURIComponent(asset.component_name)}`

  const embedOptions = [
    {
      id: "url" as CopyType,
      title: "Direct URL",
      description: "Use anywhere as image source",
      icon: LinkIcon,
      code: svgEndpoint,
    },
    {
      id: "img" as CopyType,
      title: "HTML Image",
      description: "Simple img tag",
      icon: Image,
      code: `<img src="${svgEndpoint}" alt="${asset.component_name}" width="48" height="48" />`,
    },
    {
      id: "react" as CopyType,
      title: "React Component",
      description: "Full TSX component code",
      icon: Code,
      code: asset.react_component,
    },
    {
      id: "html" as CopyType,
      title: "React/Next.js Image",
      description: "Using next/image or img in JSX",
      icon: Globe,
      code: `{/* Option 1: Regular img */}
<img src="${svgEndpoint}" alt="${asset.component_name}" className="h-12 w-12" />

{/* Option 2: Fetch and use hook */}
// In your component:
const [svgUrl, setSvgUrl] = useState("");
useEffect(() => {
  fetch("${jsonEndpoint}")
    .then(r => r.json())
    .then(data => setSvgUrl(data.data.svgUrl));
}, []);`,
    },
  ]

  const handleCopy = async (type: CopyType, code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error("Copy failed:", err)
    }
  }

  const isPublic = asset.visibility === "public"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold">Share & Embed</h2>
          <p className="text-sm text-muted-foreground">
            Copy code to use <span className="font-medium text-foreground">{asset.component_name}</span> in your project
          </p>
        </div>

        {/* Public warning */}
        {!isPublic && (
          <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            <strong>Note:</strong> This asset is not public. The URL and API endpoints will only work for you.
            Mark it as <strong>Public</strong> to share with others.
          </div>
        )}

        {/* Embed options */}
        <div className="space-y-4">
          {embedOptions.map((option) => (
            <div
              key={option.id}
              className="rounded-xl border border-border bg-muted/30 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <option.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{option.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
                <Button
                  onClick={() => handleCopy(option.id, option.code)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {copied === option.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-black/50 p-3 text-xs text-gray-300">
                <code>{option.code.length > 500 ? option.code.slice(0, 500) + "..." : option.code}</code>
              </pre>
            </div>
          ))}
        </div>

        {/* Background Options */}
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="mb-3 text-sm font-medium text-amber-400">🎨 With Background (for favicons, logos)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">Black Background</span>
                <Button
                  onClick={() => handleCopy("url", svgWithBgBlack)}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                >
                  {copied === "url" && svgWithBgBlack ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <div className="flex items-center justify-center rounded bg-black p-3">
                <img src={svgWithBgBlack} alt="With black bg" className="h-12 w-12" />
              </div>
              <code className="mt-2 block truncate text-[10px] text-muted-foreground">
                ...svg-with-bg?bg=black
              </code>
            </div>
            
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">White Background</span>
                <Button
                  onClick={() => handleCopy("url", svgWithBgWhite)}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                >
                  {copied === "url" && svgWithBgWhite ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <div className="flex items-center justify-center rounded bg-white p-3">
                <img src={svgWithBgWhite} alt="With white bg" className="h-12 w-12" />
              </div>
              <code className="mt-2 block truncate text-[10px] text-muted-foreground">
                ...svg-with-bg?bg=white
              </code>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 rounded-xl border border-border p-4">
          <p className="mb-3 text-sm font-medium">Preview (Original):</p>
          <div className="flex items-center justify-center rounded-lg bg-muted/50 p-6">
            <img 
              src={asset.svg_url} 
              alt={asset.component_name}
              className="h-16 w-16 object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
