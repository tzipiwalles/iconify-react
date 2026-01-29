"use client"

import { useState } from "react"
import { Plus, X, Check, Palette, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ColorEditorProps {
  detectedColors: string[]
  additionalColors: string[]
  onColorChange: (index: number, newColor: string) => void
  onAddColor: (color: string) => void
  onRemoveAdditionalColor: (index: number) => void
  onSave: () => void
  isSaving: boolean
  hasChanges: boolean
}

export function ColorEditor({
  detectedColors,
  additionalColors,
  onColorChange,
  onAddColor,
  onRemoveAdditionalColor,
  onSave,
  isSaving,
  hasChanges,
}: ColorEditorProps) {
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null)
  const [tempColor, setTempColor] = useState<string>("")
  const [showAddColor, setShowAddColor] = useState(false)
  const [newColor, setNewColor] = useState("#6366f1")

  const handleStartEdit = (index: number, currentColor: string) => {
    setEditingColorIndex(index)
    setTempColor(currentColor)
  }

  const handleConfirmEdit = () => {
    if (editingColorIndex !== null && tempColor) {
      onColorChange(editingColorIndex, tempColor)
      setEditingColorIndex(null)
      setTempColor("")
    }
  }

  const handleCancelEdit = () => {
    setEditingColorIndex(null)
    setTempColor("")
  }

  const handleAddNewColor = () => {
    onAddColor(newColor)
    setShowAddColor(false)
    setNewColor("#6366f1")
  }

  return (
    <div className="space-y-4">
      {/* Detected Colors (affect the logo) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium">Logo Colors</span>
          <span className="text-xs text-muted-foreground">(changes update the logo)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {detectedColors.map((color, index) => (
            <div key={index} className="relative group">
              {editingColorIndex === index ? (
                <div className="flex items-center gap-1 p-1 rounded-lg border border-primary bg-card">
                  <input
                    type="color"
                    value={tempColor}
                    onChange={(e) => setTempColor(e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={tempColor}
                    onChange={(e) => setTempColor(e.target.value)}
                    className="w-20 px-2 py-1 text-xs rounded bg-muted border border-border"
                    placeholder="#000000"
                  />
                  <button
                    onClick={handleConfirmEdit}
                    className="p-1 rounded hover:bg-primary/20 text-primary"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleStartEdit(index, color)}
                  className="relative flex items-center gap-2 p-2 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
                >
                  <div
                    className="h-6 w-6 rounded border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono">{color}</span>
                  <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Additional Colors (for prompt only) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Plus className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">Brand Colors</span>
          <span className="text-xs text-muted-foreground">(included in AI prompt only)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {additionalColors.map((color, index) => (
            <div key={index} className="relative group flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
              <div
                className="h-6 w-6 rounded border border-white/20"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-mono">{color}</span>
              <button
                onClick={() => onRemoveAdditionalColor(index)}
                className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          {/* Add color button/form */}
          {showAddColor ? (
            <div className="flex items-center gap-1 p-1 rounded-lg border border-blue-500/50 bg-card">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-8 w-8 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-20 px-2 py-1 text-xs rounded bg-muted border border-border"
                placeholder="#000000"
              />
              <button
                onClick={handleAddNewColor}
                className="p-1 rounded hover:bg-blue-500/20 text-blue-400"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowAddColor(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddColor(true)}
              className="flex items-center gap-1 p-2 rounded-lg border border-dashed border-border hover:border-blue-500/50 text-muted-foreground hover:text-blue-400 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs">Add Color</span>
            </button>
          )}
        </div>
      </div>

      {/* Save button */}
      {hasChanges && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="gap-2"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
