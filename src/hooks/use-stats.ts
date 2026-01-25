"use client"

import { useState, useEffect } from "react"

interface Stats {
  users: number
  icons: number
  logos: number
  totalAssets: number
}

export function useStats() {
  const [stats, setStats] = useState<Stats>({ users: 0, icons: 0, logos: 0, totalAssets: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats")
        const data = await response.json()
        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, loading }
}
