"use client"

import { useState, useEffect } from "react"

const STORAGE_KEY = "asset-bridge-conversion-count"
const FREE_CONVERSIONS = 1

export function useConversionCount() {
  const [count, setCount] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setCount(parseInt(stored, 10))
    }
    setIsLoaded(true)
  }, [])

  const incrementCount = () => {
    const newCount = count + 1
    setCount(newCount)
    localStorage.setItem(STORAGE_KEY, newCount.toString())
    return newCount
  }

  const resetCount = () => {
    setCount(0)
    localStorage.removeItem(STORAGE_KEY)
  }

  const hasUsedFreeConversion = count >= FREE_CONVERSIONS
  const remainingFreeConversions = Math.max(0, FREE_CONVERSIONS - count)

  return {
    count,
    incrementCount,
    resetCount,
    hasUsedFreeConversion,
    remainingFreeConversions,
    isLoaded,
    FREE_CONVERSIONS,
  }
}
