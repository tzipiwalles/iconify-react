"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Copy, Check, Code, Image, Globe, Link as LinkIcon, Sparkles, Palette } from "lucide-react"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  asset: {
    component_name: string
    react_component: string
    svg_url: string
    visibility: string
    detected_colors?: string[]
  }
  baseUrl: string
}

type CopyType = "url" | "img" | "react" | "html" | "prompt" | null

export function ShareModal({ isOpen, onClose, asset, baseUrl }: ShareModalProps) {
  const [copied, setCopied] = useState<CopyType>(null)
  const [includeColors, setIncludeColors] = useState(false)

  if (!isOpen) return null

  // All assets are public in MVP
  const svgEndpoint = `${baseUrl}/api/assets/${encodeURIComponent(asset.component_name)}/svg`
  const jsonEndpoint = `${baseUrl}/api/assets/${encodeURIComponent(asset.component_name)}`

  // Format colors for the prompt
  const hasColors = asset.detected_colors && asset.detected_colors.length > 0
  const colorsSection = hasColors && includeColors ? `

🎨 BRAND COLORS (use these exact colors for consistency):
${asset.detected_colors!.map((color, i) => `  ${i + 1}. ${color}`).join('\n')}

When styling buttons, backgrounds, text, or accents, use ONLY these brand colors.
CSS variables you can use:
${asset.detected_colors!.map((color, i) => `  --brand-color-${i + 1}: ${color};`).join('\n')}` : ''

  // AI Prompt content
  const aiPromptContent = `When generating code that needs my "${asset.component_name}" logo/icon, use this image URL:
${svgEndpoint}

Example usage in React/HTML:
<img src="${svgEndpoint}" alt="${asset.component_name}" />

DO NOT generate or create the logo as inline SVG.
ALWAYS use the URL above - it's hosted and publicly accessible.${colorsSection}`

  const embedOptions = [
    {
      id: "url" as CopyType,
      title: "Direct URL",
      description: "Use anywhere as image source",
      icon: LinkIcon,
      code: svgEndpoint,
    },
    {
      id: "prompt" as CopyType,
      title: "AI Prompt",
      description: includeColors && hasColors ? "With brand colors" : "For Claude, ChatGPT, Cursor",
      icon: Sparkles,
      code: aiPromptContent,
      highlight: true,
      hasColorToggle: true,
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

        {/* Embed options */}
        <div className="space-y-4">
          {embedOptions.map((option) => (
            <div
              key={option.id}
              className={`rounded-xl border p-4 ${
                option.highlight 
                  ? "border-purple-500/30 bg-purple-500/5" 
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <option.icon className={`h-4 w-4 ${option.highlight ? "text-purple-400" : "text-primary"}`} />
                  <span className={`font-medium ${option.highlight ? "text-purple-400" : ""}`}>{option.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
                <Button
                  onClick={() => handleCopy(option.id, option.code)}
                  variant="outline"
                  size="sm"
                  className={`gap-2 ${option.highlight ? "border-purple-500/30 text-purple-400 hover:bg-purple-500/10" : ""}`}
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
              
              {/* Color toggle for AI Prompt */}
              {option.hasColorToggle && hasColors && (
                <div className="mb-3 flex items-center justify-between rounded-lg bg-black/30 p-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-purple-300">Include brand colors in prompt</span>
                    <div className="flex gap-1 ml-2">
                      {asset.detected_colors!.slice(0, 4).map((color, i) => (
                        <div
                          key={i}
                          className="h-4 w-4 rounded-full border border-white/20"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setIncludeColors(!includeColors)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      includeColors ? "bg-purple-500" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        includeColors ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              )}
              
              <pre className="overflow-x-auto rounded-lg bg-black/50 p-3 text-xs text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                <code>{option.code}</code>
              </pre>
            </div>
          ))}
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
