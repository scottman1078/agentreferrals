'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Search, MapPin, Loader2, Star, Clock, Send, MessageSquare, Users, X, Command, User, Lock, Sparkles, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { geocodeAddress, type GeoResult } from '@/lib/geocode'
import { pointInPolygon } from '@/lib/geo-utils'
import { useAppData } from '@/lib/data-provider'
import { useBrokerage } from '@/contexts/brokerage-context'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { TAG_COLORS } from '@/lib/constants'
import { formatCurrency, getInitials } from '@/lib/utils'
import { maskName } from '@/lib/agent-display-name'
import type { Agent } from '@/types'

interface SearchModalProps {
  open: boolean
  onClose: () => void
  /** Called when a search result is selected on the map page */
  onResultSelect?: (lat: number, lng: number, agents: Agent[]) => void
}

type ModalPhase = 'idle' | 'loading' | 'suggestions' | 'results' | 'no-results'

/** Agents grouped by relationship tier for the discovery grid */
interface TieredAgents {
  partners: Agent[]
  oneDegree: Agent[]
  twoDegree: Agent[]
}

export default function SearchModal({ open, onClose, onResultSelect }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<ModalPhase>('idle')
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [matchedAgents, setMatchedAgents] = useState<Agent[]>([])
  const [tieredAgents, setTieredAgents] = useState<TieredAgents>({ partners: [], oneDegree: [], twoDegree: [] })
  const [agentNameMatches, setAgentNameMatches] = useState<Agent[]>([])
  const [selectedLocation, setSelectedLocation] = useState<GeoResult | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { agents } = useAppData()
  // Use tier-filtered agents — only show agents the user has access to
  const { filteredAgents, partnerIds, oneDegreeIds, twoDegreeIds } = useBrokerage()
  const { hasFeature, requiredTier } = useFeatureGate()

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setPhase('idle')
      setSuggestions([])
      setMatchedAgents([])
      setTieredAgents({ partners: [], oneDegree: [], twoDegree: [] })
      setAgentNameMatches([])
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

  // Debounced search (geocode + agent name matching)
  const debouncedSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) {
      setSuggestions([])
      setAgentNameMatches([])
      setPhase('idle')
      return
    }
    debounceRef.current = setTimeout(async () => {
      setPhase('loading')

      // Search agents by name (tier-filtered)
      const qLower = q.trim().toLowerCase()
      const nameMatches = filteredAgents.filter((agent) =>
        agent.name.toLowerCase().includes(qLower) ||
        agent.brokerage.toLowerCase().includes(qLower) ||
        agent.area.toLowerCase().includes(qLower)
      ).slice(0, 10)
      setAgentNameMatches(nameMatches)

      // Also geocode for location results
      const results = await geocodeAddress(q)
      setSuggestions(results)
      setPhase((results.length > 0 || nameMatches.length > 0) ? 'suggestions' : 'idle')
      setFocusedIndex(-1)
    }, 300)
  }, [filteredAgents])

  const handleChange = (value: string) => {
    setQuery(value)
    setSelectedLocation(null)
    setMatchedAgents([])
    setTieredAgents({ partners: [], oneDegree: [], twoDegree: [] })
    setAgentNameMatches([])
    debouncedSearch(value)
  }

  const selectSuggestion = useCallback(
    (geo: GeoResult) => {
      setSelectedLocation(geo)
      setSuggestions([])
      setAgentNameMatches([])
      setPhase('loading')

      // Search ALL agents for this location, then categorize by tier
      const allInArea = agents.filter((agent) =>
        pointInPolygon(geo.lat, geo.lng, agent.polygon)
      )
      allInArea.sort((a, b) => (b.rcsScore ?? 0) - (a.rcsScore ?? 0))

      // Categorize into tiers
      const partners: Agent[] = []
      const oneDegree: Agent[] = []
      const twoDegree: Agent[] = []

      for (const agent of allInArea) {
        if (partnerIds.includes(agent.id)) {
          partners.push(agent)
        } else if (oneDegreeIds.includes(agent.id)) {
          oneDegree.push(agent)
        } else if (twoDegreeIds.includes(agent.id)) {
          twoDegree.push(agent)
        } else {
          // Agents not in any degree go to 2nd degree bucket
          twoDegree.push(agent)
        }
      }

      setTieredAgents({ partners, oneDegree, twoDegree })
      setMatchedAgents(allInArea)

      const hasAny = partners.length > 0 || oneDegree.length > 0 || twoDegree.length > 0
      setPhase(hasAny ? 'results' : 'no-results')
      setQuery(geo.display_name.split(',').slice(0, 2).join(','))

      // Pass accessible agents to map callback
      const accessibleAgents = [
        ...partners,
        ...(hasFeature('networkDegree1') ? oneDegree : []),
        ...(hasFeature('networkDegree2') ? twoDegree : []),
      ]
      onResultSelect?.(geo.lat, geo.lng, accessibleAgents)
    },
    [agents, partnerIds, oneDegreeIds, twoDegreeIds, hasFeature, onResultSelect]
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

  const totalFound = matchedAgents.length

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — wider for grid layout */}
      <div className="relative w-full max-w-3xl mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by agent name, address, or city..."
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
        <div className="max-h-[65vh] overflow-y-auto">
          {/* Agent name matches */}
          {phase === 'suggestions' && agentNameMatches.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b border-border bg-accent/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agents</p>
              </div>
              {agentNameMatches.map((agent) => (
                <ModalAgentCard key={agent.id} agent={agent} isPartner={partnerIds.includes(agent.id)} />
              ))}
            </div>
          )}

          {/* Location suggestions */}
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

          {/* Results — Agent Discovery Grid */}
          {phase === 'results' && totalFound > 0 && (
            <div>
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-border bg-accent/30">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {totalFound} agent{totalFound !== 1 ? 's' : ''} found
                  </p>
                  {selectedLocation && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedLocation.display_name.split(',').slice(0, 2).join(',')}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 1: Direct Partners (always accessible) */}
              <AgentTierRow
                label="Your Partners"
                sublabel="Direct connections in this area"
                agents={tieredAgents.partners}
                locked={false}
                partnerIds={partnerIds}
                emptyMessage="No direct partners in this area"
              />

              {/* Row 2: 1st-Degree Connections */}
              <AgentTierRow
                label="1st-Degree Network"
                sublabel="Your partners' partners"
                agents={tieredAgents.oneDegree}
                locked={!hasFeature('networkDegree1')}
                requiredTierName={requiredTier('networkDegree1') ?? undefined}
                partnerIds={partnerIds}
                emptyMessage="No 1st-degree connections in this area"
              />

              {/* Row 3: 2nd-Degree Connections */}
              <AgentTierRow
                label="2nd-Degree Network"
                sublabel="Extended network agents"
                agents={tieredAgents.twoDegree}
                locked={!hasFeature('networkDegree2')}
                requiredTierName={requiredTier('networkDegree2') ?? undefined}
                partnerIds={partnerIds}
                emptyMessage="No 2nd-degree connections in this area"
              />
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
                Search by agent name, brokerage, address, city, or zip code
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

/* ─── Agent Tier Row (horizontally scrollable) ─── */

interface AgentTierRowProps {
  label: string
  sublabel: string
  agents: Agent[]
  locked: boolean
  requiredTierName?: string
  partnerIds: string[]
  emptyMessage: string
}

function AgentTierRow({ label, sublabel, agents, locked, requiredTierName, partnerIds, emptyMessage }: AgentTierRowProps) {
  const router = useRouter()

  return (
    <div className="border-b border-border last:border-0">
      {/* Row header */}
      <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-foreground">{label}</p>
            {locked && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
                <Lock className="w-2.5 h-2.5" />
                {requiredTierName ? `${requiredTierName} plan` : 'Upgrade'}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">{sublabel}</p>
        </div>
        {agents.length > 3 && !locked && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            Scroll for more <ChevronRight className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Agent cards or locked/empty state */}
      {agents.length === 0 ? (
        <div className="px-4 pb-3">
          <p className="text-[11px] text-muted-foreground italic">{emptyMessage}</p>
        </div>
      ) : locked ? (
        /* Blurred row with upgrade CTA */
        <div className="relative px-4 pb-3">
          {/* Blurred preview of agent cards */}
          <div className="flex gap-3 overflow-hidden select-none pointer-events-none" style={{ filter: 'blur(6px)' }}>
            {agents.slice(0, 3).map((agent) => (
              <GridAgentCard key={agent.id} agent={agent} isPartner={false} masked />
            ))}
          </div>
          {/* Overlay CTA */}
          <div className="absolute inset-0 flex items-center justify-center bg-card/60 rounded-lg">
            <button
              onClick={() => router.push('/dashboard/billing')}
              className="flex items-center gap-2 h-9 px-5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade to {requiredTierName ?? 'unlock'} to view {agents.length} agent{agents.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      ) : (
        /* Scrollable agent grid */
        <div className="px-4 pb-3">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border">
            {agents.map((agent) => (
              <GridAgentCard key={agent.id} agent={agent} isPartner={partnerIds.includes(agent.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Grid Agent Card (compact card for horizontal scroll) ─── */

function GridAgentCard({ agent, isPartner = false, masked = false }: { agent: Agent; isPartner?: boolean; masked?: boolean }) {
  const displayName = masked ? '------- -------' : isPartner ? agent.name : maskName(agent.name)
  const initials = getInitials(agent.name)
  const score = agent.rcsScore ?? 0
  const scoreColor = score >= 90 ? 'text-emerald-500' : score >= 80 ? 'text-amber-500' : 'text-muted-foreground'

  return (
    <div className="flex-shrink-0 w-52 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors p-3">
      {/* Top: avatar + name */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
          style={{ background: agent.color }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-xs truncate">{displayName}</p>
          <p className="text-[10px] text-muted-foreground truncate">{agent.brokerage}</p>
        </div>
      </div>

      {/* Score + area */}
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-muted-foreground truncate flex-1">{agent.area}</p>
        {score > 0 && (
          <span className={`text-[10px] font-bold ${scoreColor} shrink-0 ml-1`}>
            {score}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 mb-2">
        {agent.responseTime && (
          <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
            <Clock className="w-2.5 h-2.5" />
            {agent.responseTime}
          </span>
        )}
        <span className="text-[9px] text-muted-foreground">
          {agent.dealsPerYear} deals/yr
        </span>
      </div>

      {/* Tags (max 2) */}
      <div className="flex flex-wrap gap-1 mb-2.5">
        {agent.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-0.5 rounded-full text-[8px] font-semibold text-white"
            style={{ background: TAG_COLORS[tag] || '#6b7280' }}
          >
            {tag}
          </span>
        ))}
        {agent.tags.length > 2 && (
          <span className="px-1 py-0.5 text-[8px] text-muted-foreground">
            +{agent.tags.length - 2}
          </span>
        )}
      </div>

      {/* Action */}
      {!masked && (
        <button className="flex items-center justify-center gap-1.5 w-full h-7 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold hover:opacity-90 transition-opacity">
          <Send className="w-3 h-3" />
          Send Referral
        </button>
      )}
    </div>
  )
}

/* ─── Full-width Agent Card (for name search results) ─── */

function ModalAgentCard({ agent, isPartner = false }: { agent: Agent; isPartner?: boolean }) {
  const displayName = isPartner ? agent.name : maskName(agent.name)
  const initials = getInitials(agent.name)
  const score = agent.rcsScore ?? 0
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
            <span className="font-bold text-sm">{displayName}</span>
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
