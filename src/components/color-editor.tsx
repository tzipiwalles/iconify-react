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
                <div className="flex flex-col gap-2 p-3 rounded-xl border border-primary bg-card shadow-lg">
                  {/* Large color picker */}
                  <div className="relative">
                    <input
                      type="color"
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                      className="h-24 w-full rounded-lg cursor-pointer border-2 border-border"
                      style={{ padding: 0 }}
                    />
                  </div>
                  
                  {/* Hex input and buttons */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm font-mono rounded-lg bg-muted border border-border"
                      placeholder="#000000"
                    />
                    <button
                      onClick={handleConfirmEdit}
                      className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
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
            <div className="flex flex-col gap-2 p-3 rounded-xl border border-blue-500/50 bg-card shadow-lg">
              {/* Large color picker */}
              <div className="relative">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-24 w-full rounded-lg cursor-pointer border-2 border-border"
                  style={{ padding: 0 }}
                />
              </div>
              
              {/* Hex input and buttons */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm font-mono rounded-lg bg-muted border border-border"
                  placeholder="#000000"
                />
                <button
                  onClick={handleAddNewColor}
                  className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowAddColor(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
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
