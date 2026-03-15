'use client'

import { useState, useMemo } from 'react'
import {
  MapPinned,
  Search,
  ChevronDown,
  Users,
  Crown,
  ShieldCheck,
  X,
  Zap,
  Star,
  Eye,
  Bot,
  Bell,
  Check,
  Clock,
  Trash2,
  ArrowUpDown,
} from 'lucide-react'
import { markets, TIER_CONFIG, US_STATES, type Market } from '@/data/markets'
import { VerifiedBadge } from '@/components/ui/verified-badge'
import { cn } from '@/lib/utils'

type TierFilter = 'all' | 'rural' | 'suburban' | 'urban' | 'major_metro'
type SortOption = 'availability' | 'price-asc' | 'population'

function formatPopulation(pop: number): string {
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}k`
  return pop.toLocaleString()
}

// ── Market Detail Modal ──
function MarketDetailModal({
  market,
  isClaimed,
  onClose,
  onClaim,
}: {
  market: Market
  isClaimed: boolean
  onClose: () => void
  onClaim: (id: string) => void
}) {
  const tier = TIER_CONFIG[market.tier]
  const slotsLeft = market.maxVerifiedAgents - market.currentVerifiedCount
  const isFull = slotsLeft <= 0

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-card/95 backdrop-blur-xl rounded-t-2xl">
          <div>
            <h2 className="font-bold text-lg">
              {market.countyName}, {market.stateCode}
            </h2>
            {market.metroArea && (
              <p className="text-xs text-muted-foreground">{market.metroArea}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-secondary">
              <div className="font-bold text-lg">{formatPopulation(market.population)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Population</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary">
              <div className="font-bold text-lg">${market.monthlyPrice}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Per Month</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary">
              <div className={cn('font-bold text-lg', isFull ? 'text-red-500' : slotsLeft <= 1 ? 'text-amber-500' : 'text-emerald-500')}>
                {slotsLeft}/{market.maxVerifiedAgents}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Slots Open</div>
            </div>
          </div>

          {/* Tier badge */}
          <div className="flex items-center gap-2">
            <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', tier.bgClass)}>
              {tier.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {tier.populationLabel} population range
            </span>
          </div>

          {/* Current verified agents */}
          {market.verifiedAgents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Verified Agents ({market.currentVerifiedCount}/{market.maxVerifiedAgents})
              </h3>
              <div className="space-y-2">
                {market.verifiedAgents.map((agent, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{agent.name}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">
                          {agent.brokerageId === 'real' ? 'Real Broker' : agent.brokerageId === 'kw' ? 'Keller Williams' : agent.brokerageId === 'compass' ? 'Compass' : agent.brokerageId === 'exp' ? 'eXp Realty' : agent.brokerageId === 'bhhs' ? 'Berkshire Hathaway' : agent.brokerageId === 'sothebys' ? "Sotheby's" : agent.brokerageId === 'remax' ? 'RE/MAX' : agent.brokerageId === 'coldwell' ? 'Coldwell Banker' : agent.brokerageId}
                        </div>
                      </div>
                    </div>
                    <VerifiedBadge size="sm" showLabel />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What you get */}
          <div>
            <h3 className="text-sm font-semibold mb-2.5">What You Get</h3>
            <div className="space-y-2">
              {[
                { icon: ShieldCheck, label: 'Verified badge on your profile and search results', color: 'text-amber-500' },
                { icon: Star, label: 'Priority placement in search rankings', color: 'text-primary' },
                { icon: Bot, label: 'Featured agent in NORA AI recommendations', color: 'text-purple-500' },
                { icon: Bell, label: 'Coverage gap alerts when agents need your market', color: 'text-blue-500' },
                { icon: Eye, label: 'Profile views boost — up to 5x more visibility', color: 'text-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <item.icon className={cn('w-4 h-4 mt-0.5 shrink-0', item.color)} />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          {isClaimed ? (
            <div className="flex items-center justify-center gap-2 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-sm">
              <Check className="w-4 h-4" />
              You&apos;ve Claimed This Market
            </div>
          ) : isFull ? (
            <button className="w-full h-12 rounded-xl bg-secondary text-foreground font-bold text-sm hover:bg-accent transition-colors">
              Join Waitlist
            </button>
          ) : (
            <button
              onClick={() => onClaim(market.id)}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Claim This Market — ${market.monthlyPrice}/mo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──
export default function MarketsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('availability')
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set())
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  const handleClaim = (marketId: string) => {
    setClaimedIds((prev) => new Set(prev).add(marketId))
    setSelectedMarket(null)
  }

  const handleUnclaim = (marketId: string) => {
    setClaimedIds((prev) => {
      const next = new Set(prev)
      next.delete(marketId)
      return next
    })
  }

  // Filter + sort
  const filteredMarkets = useMemo(() => {
    let result = [...markets]

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.countyName.toLowerCase().includes(q) ||
          m.stateCode.toLowerCase().includes(q) ||
          m.stateName.toLowerCase().includes(q) ||
          (m.metroArea && m.metroArea.toLowerCase().includes(q))
      )
    }

    // State filter
    if (stateFilter !== 'all') {
      result = result.filter((m) => m.stateCode === stateFilter)
    }

    // Tier filter
    if (tierFilter !== 'all') {
      result = result.filter((m) => m.tier === tierFilter)
    }

    // Sort
    switch (sortOption) {
      case 'availability':
        result.sort(
          (a, b) =>
            (b.maxVerifiedAgents - b.currentVerifiedCount) -
            (a.maxVerifiedAgents - a.currentVerifiedCount)
        )
        break
      case 'price-asc':
        result.sort((a, b) => a.monthlyPrice - b.monthlyPrice)
        break
      case 'population':
        result.sort((a, b) => b.population - a.population)
        break
    }

    return result
  }, [searchQuery, stateFilter, tierFilter, sortOption])

  // My claimed markets
  const myMarkets = markets.filter((m) => claimedIds.has(m.id))
  const totalMonthlyCost = myMarkets.reduce((sum, m) => sum + m.monthlyPrice, 0)
  const discount = myMarkets.length >= 3 ? 0.2 : 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <MapPinned className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-lg sm:text-xl">Claim Your Market</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Become the verified agent for your county. Priority placement, verified badge, NORA AI featured.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="text-right">
                <div className="font-bold text-base sm:text-lg">{claimedIds.size}</div>
                <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Claimed</div>
              </div>
              {totalMonthlyCost > 0 && (
                <div className="text-right">
                  <div className="font-bold text-base sm:text-lg text-primary">
                    ${discount > 0 ? Math.round(totalMonthlyCost * (1 - discount)) : totalMonthlyCost}/mo
                  </div>
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">
                    {discount > 0 ? (
                      <span className="text-emerald-500">20% off</span>
                    ) : (
                      'Monthly'
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by county, city, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground"
              />
            </div>

            {/* State dropdown */}
            <div className="relative">
              <button
                onClick={() => { setShowStateDropdown(!showStateDropdown); setShowSortDropdown(false) }}
                className="h-9 px-3 rounded-lg border border-input bg-background text-sm flex items-center gap-1.5 hover:bg-accent transition-colors"
              >
                {stateFilter === 'all' ? 'All States' : stateFilter}
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {showStateDropdown && (
                <div className="absolute top-full mt-1 left-0 z-50 w-36 max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                  <button
                    onClick={() => { setStateFilter('all'); setShowStateDropdown(false) }}
                    className={cn('w-full text-left px-3 py-2 text-sm hover:bg-accent', stateFilter === 'all' && 'text-primary font-semibold')}
                  >
                    All States
                  </button>
                  {US_STATES.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStateFilter(s); setShowStateDropdown(false) }}
                      className={cn('w-full text-left px-3 py-2 text-sm hover:bg-accent', stateFilter === s && 'text-primary font-semibold')}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tier filter pills */}
            <div className="flex items-center gap-1">
              {(['all', 'rural', 'suburban', 'urban', 'major_metro'] as const).map((t) => {
                const active = tierFilter === t
                const label = t === 'all' ? 'All' : TIER_CONFIG[t].label
                const price = t === 'all' ? null : `$${TIER_CONFIG[t].price}`
                return (
                  <button
                    key={t}
                    onClick={() => setTierFilter(t)}
                    className={cn(
                      'h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {label}
                    {price && <span className="ml-1 opacity-70">{price}</span>}
                  </button>
                )
              })}
            </div>

            {/* Sort dropdown */}
            <div className="relative ml-auto">
              <button
                onClick={() => { setShowSortDropdown(!showSortDropdown); setShowStateDropdown(false) }}
                className="h-9 px-3 rounded-lg border border-input bg-background text-sm flex items-center gap-1.5 hover:bg-accent transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                Sort
              </button>
              {showSortDropdown && (
                <div className="absolute top-full mt-1 right-0 z-50 w-48 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                  {([
                    { value: 'availability', label: 'Most Available' },
                    { value: 'price-asc', label: 'Price: Low to High' },
                    { value: 'population', label: 'Population' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortOption(opt.value); setShowSortDropdown(false) }}
                      className={cn(
                        'w-full text-left px-3 py-2.5 text-sm hover:bg-accent',
                        sortOption === opt.value && 'text-primary font-semibold'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Claimed Markets */}
          {myMarkets.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-500" />
                Your Claimed Markets
                {discount > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                    20% multi-market discount applied
                  </span>
                )}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {myMarkets.map((m) => {
                  const tier = TIER_CONFIG[m.tier]
                  const discountedPrice = discount > 0 ? Math.round(m.monthlyPrice * (1 - discount)) : m.monthlyPrice
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <VerifiedBadge size="sm" />
                        <div>
                          <div className="text-sm font-semibold">
                            {m.countyName}, {m.stateCode}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold', tier.bgClass)}>
                              {tier.label}
                            </span>
                            <span>
                              ${discountedPrice}/mo
                              {discount > 0 && (
                                <span className="line-through ml-1 opacity-50">${m.monthlyPrice}</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnclaim(m.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Cancel claim"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 px-1">
                <span className="text-xs text-muted-foreground">
                  Total: <span className="font-bold text-foreground">
                    ${discount > 0 ? Math.round(totalMonthlyCost * (1 - discount)) : totalMonthlyCost}/mo
                  </span>
                  {discount > 0 && (
                    <span className="line-through ml-1.5 opacity-50">${totalMonthlyCost}/mo</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Multi-market discount banner */}
          {myMarkets.length > 0 && myMarkets.length < 3 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 mb-5">
              <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Claim {3 - myMarkets.length} more market{3 - myMarkets.length > 1 ? 's' : ''} to save 20%.</span>{' '}
                Multi-market agents get a 20% discount on all market subscriptions.
              </div>
            </div>
          )}

          {/* Pricing reference */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <span className="text-[11px] text-muted-foreground font-medium mr-1">Pricing:</span>
            {Object.entries(TIER_CONFIG).map(([key, tier]) => (
              <span
                key={key}
                className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', tier.bgClass)}
              >
                {tier.label} ${tier.price}/mo
              </span>
            ))}
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">
              {filteredMarkets.length} market{filteredMarkets.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Market cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredMarkets.map((market) => {
              const tier = TIER_CONFIG[market.tier]
              const slotsLeft = market.maxVerifiedAgents - market.currentVerifiedCount
              const isFull = slotsLeft <= 0
              const almostFull = slotsLeft === 1
              const isClaimed = claimedIds.has(market.id)

              return (
                <div
                  key={market.id}
                  className={cn(
                    'relative rounded-xl border bg-card overflow-hidden hover:shadow-md transition-all cursor-pointer group',
                    isFull
                      ? 'border-border opacity-75 hover:opacity-100'
                      : isClaimed
                      ? 'border-emerald-500/30 ring-1 ring-emerald-500/20'
                      : 'border-border hover:border-primary/20'
                  )}
                  style={{ borderLeftWidth: '3px', borderLeftColor: tier.color }}
                  onClick={() => setSelectedMarket(market)}
                >
                  <div className="p-4">
                    {/* Top row: name + badges */}
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate">
                          {market.countyName}, {market.stateCode}
                        </h3>
                        {market.metroArea && (
                          <p className="text-[11px] text-muted-foreground truncate">{market.metroArea}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isClaimed && <VerifiedBadge size="sm" showLabel />}
                        {isFull && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-500">
                            FULL
                          </span>
                        )}
                        {almostFull && !isFull && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            1 slot left!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tier + population */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold', tier.bgClass)}>
                        {tier.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Pop. {formatPopulation(market.population)}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="text-lg font-extrabold mb-3">
                      ${market.monthlyPrice}
                      <span className="text-xs font-normal text-muted-foreground">/mo</span>
                    </div>

                    {/* Availability bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>{market.currentVerifiedCount} of {market.maxVerifiedAgents} claimed</span>
                        <span className={cn(
                          'font-bold',
                          isFull ? 'text-red-500' : slotsLeft <= 2 ? 'text-amber-500' : 'text-emerald-500'
                        )}>
                          {slotsLeft} open
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            isFull
                              ? 'bg-red-500'
                              : market.currentVerifiedCount >= 4
                              ? 'bg-amber-500'
                              : 'bg-primary'
                          )}
                          style={{ width: `${(market.currentVerifiedCount / market.maxVerifiedAgents) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Verified agents avatars */}
                    {market.verifiedAgents.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="flex -space-x-1.5">
                          {market.verifiedAgents.slice(0, 4).map((agent, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full bg-amber-500/10 border-2 border-card flex items-center justify-center"
                              title={agent.name}
                            >
                              <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400">
                                {agent.name.split(' ').map((n) => n[0]).join('')}
                              </span>
                            </div>
                          ))}
                          {market.verifiedAgents.length > 4 && (
                            <div className="w-6 h-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center">
                              <span className="text-[8px] font-bold text-muted-foreground">
                                +{market.verifiedAgents.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">verified</span>
                      </div>
                    )}

                    {/* CTA button */}
                    {isClaimed ? (
                      <div className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 font-bold text-xs">
                        <Check className="w-3.5 h-3.5" />
                        Claimed
                      </div>
                    ) : isFull ? (
                      <button
                        onClick={(e) => { e.stopPropagation() }}
                        className="w-full h-9 rounded-lg bg-secondary text-muted-foreground font-bold text-xs hover:bg-accent transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Join Waitlist
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleClaim(market.id)
                        }}
                        className="w-full h-9 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        Claim This Market
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredMarkets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <MapPinned className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-base mb-1.5">No markets found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Try adjusting your search or filters to find available markets.
              </p>
            </div>
          )}

          {/* Pricing table */}
          <div className="mt-10 mb-6">
            <h2 className="text-lg font-bold mb-1">Market Pricing</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pricing is based on county population size. Claim 3+ markets to save 20% on all subscriptions.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.entries(TIER_CONFIG) as [keyof typeof TIER_CONFIG, typeof TIER_CONFIG[keyof typeof TIER_CONFIG]][]).map(([key, tier]) => (
                <div
                  key={key}
                  className="rounded-xl border border-border bg-card p-4"
                  style={{ borderTopWidth: '3px', borderTopColor: tier.color }}
                >
                  <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold mb-2', tier.bgClass)}>
                    {tier.label}
                  </span>
                  <div className="text-2xl font-extrabold mb-1">
                    ${tier.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{tier.populationLabel} population</div>
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    {['Verified badge', 'Priority search', 'NORA AI featured', 'Coverage alerts', '5x visibility'].map(
                      (feature) => (
                        <div key={feature} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          {feature}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-foreground">Multi-market discount:</span>{' '}
                <span className="text-muted-foreground">Claim 3+ markets and save 20% on all subscriptions. Limited to 5 verified agents per county.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selectedMarket && (
        <MarketDetailModal
          market={selectedMarket}
          isClaimed={claimedIds.has(selectedMarket.id)}
          onClose={() => setSelectedMarket(null)}
          onClaim={handleClaim}
        />
      )}
    </div>
  )
}
