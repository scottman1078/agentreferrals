'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import { Search, MapPin, Loader2, Star, Clock, Send, MessageSquare, Users, X } from 'lucide-react'
import { geocodeAddress, type GeoResult } from '@/lib/geocode'
import { pointInPolygon } from '@/lib/geo-utils'
import { useAppData } from '@/lib/data-provider'
import { TAG_COLORS } from '@/lib/constants'
import { formatCurrency, getInitials } from '@/lib/utils'
import { maskName } from '@/lib/agent-display-name'
import type { Agent } from '@/types'

interface PartnerSearchProps {
  /** Called when a result is selected — passes the lat/lng and matched agents */
  onResultSelect?: (lat: number, lng: number, agents: Agent[]) => void
  /** Compact mode for top nav */
  compact?: boolean
}

type SearchPhase = 'idle' | 'typing' | 'suggestions' | 'loading' | 'results' | 'no-results'

export default function PartnerSearch({ onResultSelect, compact }: PartnerSearchProps) {
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<SearchPhase>('idle')
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [matchedAgents, setMatchedAgents] = useState<Agent[]>([])
  const [selectedLocation, setSelectedLocation] = useState<GeoResult | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { agents } = useAppData()

  // Debounced geocode
  const debouncedGeocode = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (q.trim().length < 2) {
        setSuggestions([])
        setPhase('idle')
        return
      }
      setPhase('typing')
      debounceRef.current = setTimeout(async () => {
        setPhase('loading')
        const results = await geocodeAddress(q)
        setSuggestions(results)
        setPhase(results.length > 0 ? 'suggestions' : 'no-results')
        setFocusedIndex(-1)
      }, 300)
    },
    []
  )

  // Handle input change
  const handleChange = (value: string) => {
    setQuery(value)
    setSelectedLocation(null)
    setMatchedAgents([])
    debouncedGeocode(value)
  }

  // Select a suggestion -> find agents
  const selectSuggestion = useCallback(
    (geo: GeoResult) => {
      setSelectedLocation(geo)
      setSuggestions([])
      setPhase('loading')

      // Point-in-polygon check against all agents
      const found = agents.filter((agent) =>
        pointInPolygon(geo.lat, geo.lng, agent.polygon)
      )

      // Sort by referNetScore descending
      found.sort((a, b) => (b.referNetScore ?? 0) - (a.referNetScore ?? 0))

      setMatchedAgents(found)
      setPhase(found.length > 0 ? 'results' : 'no-results')
      setQuery(geo.display_name.split(',').slice(0, 2).join(','))

      onResultSelect?.(geo.lat, geo.lng, found)
    },
    [agents, onResultSelect]
  )

  // Keyboard navigation
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

  // Clear
  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setMatchedAgents([])
    setSelectedLocation(null)
    setPhase('idle')
    inputRef.current?.focus()
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (phase === 'suggestions') {
          setSuggestions([])
          setPhase('idle')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [phase])

  if (compact) {
    return null // Compact mode is handled by SearchModal via Cmd+K
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search any address or city to find a referral partner..."
          className="w-full h-10 pl-10 pr-10 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {phase === 'loading' && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {phase === 'suggestions' && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-50">
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
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          <div className="px-4 py-2.5 border-b border-border bg-accent/50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {matchedAgents.length} partner{matchedAgents.length !== 1 ? 's' : ''} found
            </p>
          </div>
          {matchedAgents.map((agent) => (
            <AgentResultCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {/* No results */}
      {phase === 'no-results' && selectedLocation && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-50">
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold mb-1">No referral partner found for this area</p>
            <p className="text-xs text-muted-foreground mb-4">
              This is a coverage gap. Want to recruit an agent here?
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
        </div>
      )}
    </div>
  )
}

function AgentResultCard({ agent }: { agent: Agent }) {
  const demoGuard = useDemoGuard()
  const initials = getInitials(agent.name)
  const score = agent.referNetScore ?? 0
  const scoreColor = score >= 90 ? 'text-emerald-500' : score >= 80 ? 'text-amber-500' : 'text-muted-foreground'

  return (
    <div className="px-4 py-3 border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
          style={{ background: agent.color }}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-sm truncate">{maskName(agent.name)}</span>
            {score > 0 && (
              <span className={`text-xs font-bold ${scoreColor}`}>
                {score}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{agent.brokerage}</p>
          <p className="text-xs text-muted-foreground">{agent.area}</p>

          {/* Stars + response time */}
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
            <button onClick={() => { demoGuard() }} className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity">
              <Send className="w-3 h-3" />
              Send Referral
            </button>
            <button onClick={() => { demoGuard() }} className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-border text-[11px] font-semibold hover:bg-accent transition-colors">
              <MessageSquare className="w-3 h-3" />
              Message
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
