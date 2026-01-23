"use client"

import * as React from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Eraser, Info, FileCode, Sparkles, Palette } from "lucide-react"
import { cn } from "@/lib/utils"

export type OutputMode = "icon" | "logo"

interface SettingsPanelProps {
  mode: OutputMode
  onModeChange: (mode: OutputMode) => void
  removeBackground: boolean
  onRemoveBackgroundChange: (value: boolean) => void
  componentName: string
  onComponentNameChange: (value: string) => void
  isProcessing: boolean
}

export function SettingsPanel({
  mode,
  onModeChange,
  removeBackground,
  onRemoveBackgroundChange,
  componentName,
  onComponentNameChange,
  isProcessing,
}: SettingsPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-5 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </span>
        Output Type
      </h3>

      <div className="space-y-5">
        {/* Mode Selector - Icon vs Logo */}
        <div className="grid grid-cols-2 gap-3">
          {/* Icon Mode */}
          <button
            onClick={() => onModeChange("icon")}
            disabled={isProcessing}
            className={cn(
              "relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all",
              mode === "icon"
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border bg-muted/30 hover:border-muted-foreground/30 hover:bg-muted/50",
              isProcessing && "cursor-not-allowed opacity-50"
            )}
          >
            {mode === "icon" && (
              <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                ✓
              </div>
            )}
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              mode === "icon" ? "bg-primary/10" : "bg-muted"
            )}>
              <Palette className={cn(
                "h-6 w-6",
                mode === "icon" ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="text-center">
              <p className={cn(
                "font-semibold",
                mode === "icon" ? "text-primary" : "text-foreground"
              )}>
                Standard Icon
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Single color · Themeable
              </p>
            </div>
          </button>

          {/* Logo Mode */}
          <button
            onClick={() => onModeChange("logo")}
            disabled={isProcessing}
            className={cn(
              "relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all",
              mode === "logo"
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border bg-muted/30 hover:border-muted-foreground/30 hover:bg-muted/50",
              isProcessing && "cursor-not-allowed opacity-50"
            )}
          >
            {mode === "logo" && (
              <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                ✓
              </div>
            )}
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              mode === "logo" ? "bg-primary/10" : "bg-muted"
            )}>
              <div 
                className="h-6 w-6 rounded-md"
                style={{
                  background: mode === "logo" 
                    ? "linear-gradient(135deg, #3B82F6, #8B5CF6, #EC4899)" 
                    : "linear-gradient(135deg, #6B7280, #9CA3AF, #D1D5DB)"
                }}
              />
            </div>
            <div className="text-center">
              <p className={cn(
                "font-semibold",
                mode === "logo" ? "text-primary" : "text-foreground"
              )}>
                Brand Logo
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Original colors · Auto-optimized
              </p>
            </div>
          </button>
        </div>

        {/* Mode Description */}
        <div className={cn(
          "rounded-xl p-4 text-sm",
          mode === "icon" ? "bg-blue-500/10 text-blue-200" : "bg-purple-500/10 text-purple-200"
        )}>
          {mode === "icon" ? (
            <div className="space-y-2">
              <p className="font-medium">🎯 Perfect for UI icons</p>
              <ul className="ml-4 list-disc space-y-1 text-xs opacity-80">
                <li>Uses <code className="rounded bg-black/20 px-1">currentColor</code> — inherits from CSS</li>
                <li>Standardized 24×24 viewBox</li>
                <li>Works like Lucide, Heroicons, etc.</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium">🎨 Perfect for logos & branding</p>
              <ul className="ml-4 list-disc space-y-1 text-xs opacity-80">
                <li>Preserves original brand colors</li>
                <li>Auto-optimizes to 6 color layers</li>
                <li>Maintains aspect ratio</li>
              </ul>
            </div>
          )}
        </div>

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
                  Uses remove.bg AI to remove the background from your image before
                  vectorization.
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
                  Optional: Set a custom name for the component. Leave empty to auto-generate from filename.
                </p>
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
              </div>
            </div>
          </div>
          <Input
            id="component-name"
            placeholder={mode === "icon" ? "e.g. HomeIcon, MenuIcon..." : "e.g. BrandLogo, CompanyIcon..."}
            value={componentName}
            onChange={(e) => onComponentNameChange(e.target.value)}
            disabled={isProcessing}
            maxLength={25}
            className="bg-background"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {componentName 
              ? `Will create: ${componentName.charAt(0).toUpperCase() + componentName.slice(1).replace(/[^a-zA-Z0-9]/g, "")}.tsx` 
              : "Auto-generated from filename"}
          </p>
        </div>

        {/* Output Summary */}
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">Output:</strong>{" "}
            {mode === "icon" ? (
              <>
                Optimized SVG with{" "}
                <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">viewBox=&quot;0 0 24 24&quot;</code>
                {" "}and{" "}
                <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">currentColor</code>
                {" "}fill
              </>
            ) : (
              <>
                Optimized SVG with original proportions and up to 6 auto-detected colors
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
