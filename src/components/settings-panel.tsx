"use client"

import * as React from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ColorPicker } from "@/components/ui/color-picker"
import { Eraser, Info, Palette, Layers, Sparkles, FileCode } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsPanelProps {
  removeBackground: boolean
  onRemoveBackgroundChange: (value: boolean) => void
  colorCount: number
  onColorCountChange: (value: number) => void
  customColors: string[]
  onCustomColorsChange: (colors: string[]) => void
  autoDetectColors: boolean
  onAutoDetectColorsChange: (value: boolean) => void
  componentName: string
  onComponentNameChange: (value: string) => void
  isProcessing: boolean
}

const COLOR_OPTIONS = [1, 2, 3, 4, 5]

export function SettingsPanel({
  removeBackground,
  onRemoveBackgroundChange,
  colorCount,
  onColorCountChange,
  customColors,
  onCustomColorsChange,
  autoDetectColors,
  onAutoDetectColorsChange,
  componentName,
  onComponentNameChange,
  isProcessing,
}: SettingsPanelProps) {
  // When color count changes, adjust the custom colors array
  const handleColorCountChange = (count: number) => {
    onColorCountChange(count)
    
    if (count === 1) {
      // Monochrome - reset to single color
      onCustomColorsChange(["currentColor"])
    } else if (customColors.length < count && !autoDetectColors) {
      // Add more colors if needed (only if not auto-detecting)
      const defaultColors = ["#1F2937", "#4B5563", "#9CA3AF", "#D1D5DB", "#F3F4F6"]
      const newColors = [...customColors]
      while (newColors.length < count) {
        newColors.push(defaultColors[newColors.length] || "#6366F1")
      }
      onCustomColorsChange(newColors)
    } else if (customColors.length > count) {
      // Remove extra colors
      onCustomColorsChange(customColors.slice(0, count))
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-5 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Layers className="h-3.5 w-3.5 text-primary" />
        </span>
        Processing Options
      </h3>

      <div className="space-y-5">
        {/* Remove Background Toggle */}
        <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <Eraser className="h-4 w-4 text-muted-foreground" />
            <Label
              htmlFor="remove-bg"
              className="cursor-pointer text-sm font-medium"
            >
              Remove Background
            </Label>
            <div className="group relative">
              <Info className="h-4 w-4 cursor-help text-muted-foreground/60 transition-colors hover:text-muted-foreground" />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl bg-popover p-3 text-xs leading-relaxed text-popover-foreground opacity-0 shadow-xl ring-1 ring-border transition-opacity group-hover:opacity-100">
                <p>
                  Uses AI to remove the background from your image before
                  vectorization. Requires REMOVE_BG_API_KEY.
                </p>
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
              </div>
            </div>
          </div>
          <Switch
            id="remove-bg"
            checked={removeBackground}
            onCheckedChange={onRemoveBackgroundChange}
            disabled={isProcessing}
          />
        </div>

        {/* Color Count Selector */}
        <div className="rounded-xl bg-muted/50 p-4">
          <div className="mb-3 flex items-center gap-3">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">
              Color Layers
            </Label>
          </div>
          
          <div className="flex gap-2">
            {COLOR_OPTIONS.map((count) => (
              <button
                key={count}
                onClick={() => handleColorCountChange(count)}
                disabled={isProcessing}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold transition-all",
                  colorCount === count
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  isProcessing && "cursor-not-allowed opacity-50"
                )}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground">
            {colorCount === 1 
              ? (autoDetectColors ? "Single color — detected from image" : "Monochrome — uses currentColor (themeable)")
              : `${colorCount} layers — ${autoDetectColors ? "auto-detect from image" : "custom colors"}`}
          </p>
        </div>

        {/* Auto-detect colors toggle */}
        <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <Label
              htmlFor="auto-detect"
              className="cursor-pointer text-sm font-medium"
            >
              {colorCount === 1 ? "Use Original Color" : "Auto-detect Colors"}
            </Label>
            <div className="group relative">
              <Info className="h-4 w-4 cursor-help text-muted-foreground/60 transition-colors hover:text-muted-foreground" />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl bg-popover p-3 text-xs leading-relaxed text-popover-foreground opacity-0 shadow-xl ring-1 ring-border transition-opacity group-hover:opacity-100">
                <p>
                  {colorCount === 1 
                    ? "Use the actual color from the image instead of currentColor (black). Great for colored logos!"
                    : "Automatically extracts dominant colors from your image. You can edit them after processing."
                  }
                </p>
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
              </div>
            </div>
          </div>
          <Switch
            id="auto-detect"
            checked={autoDetectColors}
            onCheckedChange={onAutoDetectColorsChange}
            disabled={isProcessing}
          />
        </div>
        
        {colorCount === 1 && !autoDetectColors && (
          <p className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Themeable mode:</strong> Uses{" "}
            <code className="rounded bg-muted px-1">currentColor</code> so the icon 
            inherits color from its parent CSS.
          </p>
        )}

        {/* Custom Color Picker - only show when NOT auto-detecting */}
        {colorCount > 1 && !autoDetectColors && (
          <div className="rounded-xl bg-muted/50 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div
                className="h-4 w-4 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${customColors.slice(0, 3).join(", ")})`
                }}
              />
              <Label className="text-sm font-medium">
                Custom Colors
              </Label>
            </div>
            
            <ColorPicker
              colors={customColors.filter(c => c !== "currentColor")}
              onChange={onCustomColorsChange}
              maxColors={colorCount}
              disabled={isProcessing}
            />
          </div>
        )}

        {/* Component Name Input */}
        <div className="rounded-xl bg-muted/50 p-4">
          <div className="mb-3 flex items-center gap-3">
            <FileCode className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="component-name" className="text-sm font-medium">
              Component Name
            </Label>
            <div className="group relative">
              <Info className="h-4 w-4 cursor-help text-muted-foreground/60 transition-colors hover:text-muted-foreground" />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl bg-popover p-3 text-xs leading-relaxed text-popover-foreground opacity-0 shadow-xl ring-1 ring-border transition-opacity group-hover:opacity-100">
                <p>
                  Optional: Set a custom name for the component. Leave empty to auto-generate from filename (max 25 chars).
                </p>
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
              </div>
            </div>
          </div>
          <Input
            id="component-name"
            placeholder="e.g. MyLogo, BrandIcon..."
            value={componentName}
            onChange={(e) => onComponentNameChange(e.target.value)}
            disabled={isProcessing}
            maxLength={25}
            className="bg-background"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {componentName ? `Will create: ${componentName.charAt(0).toUpperCase() + componentName.slice(1).replace(/[^a-zA-Z0-9]/g, "")}.tsx` : "Auto-generated from filename"}
          </p>
        </div>

        {/* Output Info */}
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">Output:</strong> Optimized SVG with{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">viewBox=&quot;0 0 24 24&quot;</code>
            {colorCount === 1 && !autoDetectColors ? (
              <> and <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">currentColor</code> fill</>
            ) : (
              <> with {colorCount} {autoDetectColors ? "auto-detected" : "custom"} color{colorCount > 1 ? "s" : ""}</>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
