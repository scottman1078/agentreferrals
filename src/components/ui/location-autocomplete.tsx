'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { geocodeAddress, type GeoResult } from '@/lib/geocode'
import { MapPin, Loader2 } from 'lucide-react'

interface LocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  helpText?: string
  required?: boolean
}

export function LocationAutocomplete({ value, onChange, placeholder = 'City, State', helpText, required }: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<GeoResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value
  useEffect(() => { setQuery(value) }, [value])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setIsOpen(false); return }
    setIsLoading(true)
    try {
      const data = await geocodeAddress(q)
      // Simplify display names — extract city, county, state
      const simplified = data.map((r) => {
        const parts = r.display_name.split(', ')
        // Try to get "City, State" or "City, County, State"
        let short = r.display_name
        if (parts.length >= 3) {
          // Find the state (usually 2nd to last or has a state abbreviation)
          const city = parts[0]
          const state = parts.find((p) => /^[A-Z]{2}$/.test(p.trim())) || parts[parts.length - 3] || parts[parts.length - 2]
          const county = parts.find((p) => p.includes('County'))
          short = county ? `${city}, ${county}, ${state}` : `${city}, ${state}`
        }
        return { ...r, short }
      })
      setResults(simplified as (GeoResult & { short: string })[])
      setIsOpen(simplified.length > 0)
      setSelectedIndex(-1)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  function handleInput(val: string) {
    setQuery(val)
    onChange(val) // update parent immediately for manual typing
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  function selectResult(result: GeoResult & { short?: string }) {
    const displayValue = result.short || result.display_name
    setQuery(displayValue)
    onChange(displayValue)
    setIsOpen(false)
    setResults([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      selectResult(results[selectedIndex] as GeoResult & { short?: string })
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className="w-full h-10 pl-9 pr-9 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>
      {helpText && <p className="text-[11px] text-muted-foreground mt-1">{helpText}</p>}

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          {(results as (GeoResult & { short?: string })[]).map((result, i) => (
            <button
              key={i}
              onClick={() => selectResult(result)}
              className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                i === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
              }`}
            >
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">{result.short || result.display_name}</div>
                {result.short && result.short !== result.display_name && (
                  <div className="text-[11px] text-muted-foreground truncate max-w-[300px]">{result.display_name}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
