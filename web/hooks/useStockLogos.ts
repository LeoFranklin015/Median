"use client"

import { useState, useEffect } from "react"

export function useStockLogos(): {
  logos: Record<string, string>
  loading: boolean
} {
  const [logos, setLogos] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/stocks/logos")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (!cancelled && typeof data === "object" && data !== null) {
          setLogos(data as Record<string, string>)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { logos, loading }
}
