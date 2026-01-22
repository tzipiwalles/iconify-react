"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Plus, X } from "lucide-react"

interface ColorPickerProps {
  colors: string[]
  onChange: (colors: string[]) => void
  maxColors?: number
  disabled?: boolean
}

const PRESET_COLORS = [
  "#000000", "#FFFFFF", "#EF4444", "#F97316", "#EAB308", 
  "#22C55E", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899",
]

export function ColorPicker({
  colors,
  onChange,
  maxColors = 5,
  disabled = false,
}: ColorPickerProps) {
  const handleAddColor = () => {
    if (colors.length < maxColors) {
      // Add a default color that's not already in the list
      const availableColor = PRESET_COLORS.find(c => !colors.includes(c)) || "#6366F1"
      onChange([...colors, availableColor])
    }
  }

  const handleRemoveColor = (index: number) => {
    if (colors.length > 1) {
      onChange(colors.filter((_, i) => i !== index))
    }
  }

  const handleColorChange = (index: number, newColor: string) => {
    const newColors = [...colors]
    newColors[index] = newColor
    onChange(newColors)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {colors.map((color, index) => (
          <div key={index} className="group relative">
            <label
              className={cn(
                "flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-2 transition-all",
                "hover:scale-105 hover:shadow-md",
                disabled && "cursor-not-allowed opacity-50"
              )}
              style={{ 
                backgroundColor: color,
                borderColor: color === "#FFFFFF" ? "#e5e7eb" : color 
              }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(index, e.target.value)}
                disabled={disabled}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            {colors.length > 1 && !disabled && (
              <button
                onClick={() => handleRemoveColor(index)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        
        {colors.length < maxColors && !disabled && (
          <button
            onClick={handleAddColor}
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-all hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Preset colors */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((presetColor) => (
          <button
            key={presetColor}
            onClick={() => {
              if (colors.length < maxColors && !colors.includes(presetColor)) {
                onChange([...colors, presetColor])
              }
            }}
            disabled={disabled || colors.includes(presetColor) || colors.length >= maxColors}
            className={cn(
              "h-6 w-6 rounded-md border transition-all hover:scale-110",
              colors.includes(presetColor) && "ring-2 ring-primary ring-offset-1",
              (disabled || colors.length >= maxColors) && "cursor-not-allowed opacity-30"
            )}
            style={{ 
              backgroundColor: presetColor,
              borderColor: presetColor === "#FFFFFF" ? "#e5e7eb" : presetColor
            }}
          />
        ))}
      </div>
    </div>
  )
}
