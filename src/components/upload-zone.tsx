"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { Upload, FileImage, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadZoneProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onClear: () => void
  isProcessing: boolean
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg"]

export function UploadZone({
  onFileSelect,
  selectedFile,
  onClear,
  isProcessing,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): boolean => {
    const isValidType = ACCEPTED_TYPES.includes(file.type)
    const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    )
    return isValidType || hasValidExtension
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const validFile = files.find(validateFile)

      if (validFile) {
        onFileSelect(validFile)
      }
    },
    [onFileSelect, validateFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files[0] && validateFile(files[0])) {
        onFileSelect(files[0])
      }
    },
    [onFileSelect, validateFile]
  )

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  if (selectedFile) {
    return (
      <div className="relative rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/15">
              <FileImage className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">{selectedFile.name}</p>
              <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB •{" "}
                {selectedFile.type || "Unknown type"}
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClear}
              className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {isProcessing && (
          <div className="mt-5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/20">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
            </div>
            <p className="mt-2.5 text-center text-sm font-medium text-muted-foreground">
              Processing your asset...
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all duration-300",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-5">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
            isDragging
              ? "bg-primary/15 scale-110"
              : "bg-muted/80 group-hover:bg-primary/10"
          )}
        >
          <Upload
            className={cn(
              "h-7 w-7 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"
            )}
          />
        </div>

        <div>
          <p className="text-lg font-semibold text-foreground">
            {isDragging ? "Drop your file here" : "Drag & drop your asset"}
          </p>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            or click to browse • PNG, JPG, SVG
          </p>
        </div>

        <div className="flex gap-2">
          {["PNG", "JPG", "SVG"].map((format) => (
            <span
              key={format}
              className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"
            >
              {format}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
