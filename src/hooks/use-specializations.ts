'use client'

import { useState, useEffect } from 'react'

export interface Specialization {
  id: string
  name: string
  color: string
  emoji: string | null
  sort_order: number
}

let cachedSpecs: Specialization[] | null = null
let fetchPromise: Promise<Specialization[]> | null = null

async function fetchSpecializations(): Promise<Specialization[]> {
  try {
    const res = await fetch('/api/specializations')
    const data = await res.json()
    return data.specializations ?? []
  } catch {
    return []
  }
}

export function useSpecializations() {
  const [specs, setSpecs] = useState<Specialization[]>(cachedSpecs ?? [])
  const [loading, setLoading] = useState(!cachedSpecs)

  useEffect(() => {
    if (cachedSpecs) {
      setSpecs(cachedSpecs)
      setLoading(false)
      return
    }

    if (!fetchPromise) {
      fetchPromise = fetchSpecializations()
    }

    fetchPromise.then((data) => {
      cachedSpecs = data
      setSpecs(data)
      setLoading(false)
    })
  }, [])

  const names = specs.map((s) => s.name)
  const colorMap: Record<string, string> = {}
  const emojiMap: Record<string, string> = {}
  for (const s of specs) {
    colorMap[s.name] = s.color
    if (s.emoji) emojiMap[s.name] = s.emoji
  }

  return { specs, names, colorMap, emojiMap, loading }
}

/** Invalidate cache so next mount re-fetches */
export function invalidateSpecializations() {
  cachedSpecs = null
  fetchPromise = null
}
