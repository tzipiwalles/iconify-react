"use client"

import { useState, useEffect } from "react"

interface SavedAsset {
  id: string
  componentName: string
  reactComponent: string
  svgUrl: string
  mode: "icon" | "logo"
  detectedColors: string[]
  visibility: string
}

export function useSavedAsset(componentName: string | null) {
  const [asset, setAsset] = useState<SavedAsset | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!componentName) {
      setAsset(null)
      return
    }

    const fetchAsset = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/assets/${encodeURIComponent(componentName)}`)
        const data = await response.json()

        if (data.success) {
          setAsset(data.data)
        } else {
          setError(data.error || "Asset not found")
          setAsset(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch asset")
        setAsset(null)
      } finally {
        setLoading(false)
      }
    }

    fetchAsset()
  }, [componentName])

  return { asset, loading, error }
}
