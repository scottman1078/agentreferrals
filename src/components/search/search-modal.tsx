'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, MapPin, Loader2, Star, Clock, Send, MessageSquare, Users, X, Command } from 'lucide-react'
import { geocodeAddress, type GeoResult } from '@/lib/geocode'
import { pointInPolygon } from '@/lib/geo-utils'
import { useAppData } from '@/lib/data-provider'
import { TAG_COLORS } from '@/lib/constants'
import { formatCurrency, getInitials } from '@/lib/utils'
import type { Agent } from '@/types'

interface SearchModalProps {
  open: boolean
  onClose: () => void
  /** Called when a search result is selected on the map page */
  onResultSelect?: (lat: number, lng: number, agents: Agent[]) => void
}

type ModalPhase = 'idle' | 'loading' | 'suggestions' | 'results' | 'no-results'

export default function SearchModal({ open, onClose, onResultSelect }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<ModalPhase>('idle')
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [matchedAgents, setMatchedAgents] = useState<Agent[]>([])
  const [selectedLocation, setSelectedLocation] = useState<GeoResult | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { agents } = useAppData()

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setPhase('idle')
      setSuggestions([])
      setMatchedAgents([])
      setSelectedLocation(null)
      setFocusedIndex(-1)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Debounced geocode
  const debouncedGeocode = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) {
      setSuggestions([])
      setPhase('idle')
      return
    }
    debounceRef.current = setTimeout(async () => {
      setPhase('loading')
      const results = await geocodeAddress(q)
      setSuggestions(results)
      setPhase(results.length > 0 ? 'suggestions' : 'idle')
      setFocusedIndex(-1)
    }, 300)
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setSelectedLocation(null)
    setMatchedAgents([])
    debouncedGeocode(value)
  }

  const selectSuggestion = useCallback(
    (geo: GeoResult) => {
      setSelectedLocation(geo)
      setSuggestions([])
      setPhase('loading')

      const found = agents.filter((agent) =>
        pointInPolygon(geo.lat, geo.lng, agent.polygon)
      )
      found.sort((a, b) => (b.referNetScore ?? 0) - (a.referNetScore ?? 0))

      setMatchedAgents(found)
      setPhase(found.length > 0 ? 'results' : 'no-results')
      setQuery(geo.display_name.split(',').slice(0, 2).join(','))

      onResultSelect?.(geo.lat, geo.lng, found)
    },
    [agents, onResultSelect]
  )

  // Keyboard nav for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (phase === 'suggestions' && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        selectSuggestion(suggestions[focusedIndex])
      }
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search any address or city to find a referral partner..."
            className="flex-1 h-14 bg-transparent text-base placeholder:text-muted-foreground focus:outline-none"
          />
          {phase === 'loading' && (
            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1 h-6 px-2 rounded-md bg-muted text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Suggestions */}
          {phase === 'suggestions' && suggestions.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b border-border bg-accent/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Locations</p>
              </div>
              {suggestions.map((geo, idx) => (
                <button
                  key={`${geo.lat}-${geo.lng}`}
                  onClick={() => selectSuggestion(geo)}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-left text-sm transition-colors ${
                    focusedIndex === idx
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{geo.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          {phase === 'results' && matchedAgents.length > 0 && (
            <div>
              <div className="px-4 py-2.5 border-b border-border bg-accent/30">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {matchedAgents.length} referral partner{matchedAgents.length !== 1 ? 's' : ''} found
                  </p>
                  {selectedLocation && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedLocation.display_name.split(',').slice(0, 2).join(',')}
                    </p>
                  )}
                </div>
              </div>
              {matchedAgents.map((agent) => (
                <ModalAgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}

          {/* No results */}
          {phase === 'no-results' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold mb-1">No referral partner found for this area</p>
              <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
                This is a coverage gap in your network. You can browse nearby agents or recruit someone for this market.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                  Browse Nearby Agents
                </button>
                <button className="h-8 px-4 rounded-lg border border-border text-xs font-semibold hover:bg-accent transition-colors">
                  Recruit for This Area
                </button>
              </div>
            </div>
          )}

          {/* Idle state */}
          {phase === 'idle' && query.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-xs text-muted-foreground">
                Type an address, city, or zip code to find referral partners in that area
              </p>
              <div className="flex items-center justify-center gap-4 mt-4">
                {['Nashville, TN', 'Kalamazoo, MI', 'Phoenix, AZ'].map((example) => (
                  <button
                    key={example}
                    onClick={() => handleChange(example)}
                    className="px-3 py-1.5 rounded-lg bg-accent text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-accent/30 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  )
}

function ModalAgentCard({ agent }: { agent: Agent }) {
  const initials = getInitials(agent.name)
  const score = agent.referNetScore ?? 0
  const scoreColor = score >= 90 ? 'text-emerald-500' : score >= 80 ? 'text-amber-500' : 'text-muted-foreground'

  return (
    <div className="px-4 py-3.5 border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
          style={{ background: agent.color }}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-sm">{agent.name}</span>
            {score > 0 && (
              <span className={`text-xs font-bold ${scoreColor}`}>
                Score: {score}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{agent.brokerage}</p>
          <p className="text-xs text-muted-foreground">{agent.area}</p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5">
            {agent.responseTime && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {agent.responseTime}
              </span>
            )}
            {agent.closedReferrals != null && agent.closedReferrals > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {agent.closedReferrals} closed
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {agent.dealsPerYear} deals/yr
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatCurrency(agent.avgSalePrice)} avg
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white"
                style={{ background: TAG_COLORS[tag] || '#6b7280' }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2.5">
            <button className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity">
              <Send className="w-3 h-3" />
              Send Referral
            </button>
            <button className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-border text-[11px] font-semibold hover:bg-accent transition-colors">
              <MessageSquare className="w-3 h-3" />
              Message
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
