'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import BrokerageSwitcher from './brokerage-switcher'
import SearchModal from '@/components/search/search-modal'
import { Search, Command, LogOut, Gift, Shield, ChevronDown } from 'lucide-react'
import { AppLogo } from '@/components/ui/app-logo'
import { useAuth } from '@/contexts/auth-context'
import { useDemo } from '@/contexts/demo-context'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { usePricing } from '@/hooks/use-pricing'
import { PLANS, type SubscriptionTier } from '@/lib/stripe'

export default function TopBar() {
  const pathname = usePathname()
  const isMapPage = pathname === '/dashboard'
  const [searchOpen, setSearchOpen] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const avatarMenuRef = useRef<HTMLDivElement>(null)
  const { profile, signOut } = useAuth()
  const { isDemoMode } = useDemo()
  const { canSwitchTier, tier, setAdminTier } = useFeatureGate()
  const { tiers: dbTiers, isLoading: pricingLoading } = usePricing()
  const [showTierMenu, setShowTierMenu] = useState(false)

  // Use DB tiers for the switcher if available, else fallback to hardcoded PLANS
  const switcherPlans = useMemo(() => {
    if (dbTiers.length > 0 && !pricingLoading) {
      return dbTiers.map((t) => ({
        id: t.slug as SubscriptionTier,
        name: t.name,
        priceLabel: t.price_label,
      }))
    }
    return PLANS.map((p) => ({ id: p.id, name: p.name, priceLabel: p.priceLabel }))
  }, [dbTiers, pricingLoading])

  const TIER_COLORS: Record<SubscriptionTier, string> = {
    starter: 'bg-gray-500',
    growth: 'bg-blue-500',
    pro: 'bg-violet-500',
    elite: 'bg-amber-500',
  }

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close avatar menu on outside click
  useEffect(() => {
    if (!showAvatarMenu) return
    function handleClick(e: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showAvatarMenu])

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'JS'

  const displayName = profile?.full_name || 'Jason Smith'

  return (
    <>
      <nav
        className={cn(
          'flex items-center h-[52px] px-4 gap-3 z-[600] transition-all duration-200',
          isMapPage
            ? 'fixed top-3 left-3 right-3 bg-card/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border'
            : 'relative bg-card border-b border-border'
        )}
      >
        {/* Left: Logo + Search + Legend */}
        <div className="shrink-0 hidden sm:block">
          <AppLogo size="sm" href="/" />
        </div>
        <div className="shrink-0 sm:hidden">
          <AppLogo size="sm" href="/" showWordmark={false} />
        </div>

        {/* Search bar — right of logo */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 h-9 w-full max-w-[280px] px-3 rounded-xl border border-border bg-background text-foreground/70 hover:text-foreground hover:bg-background transition-all"
          title="Search for referral partners (Cmd+K)"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="text-sm truncate">Search address or city...</span>
          <kbd className="ml-auto hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted font-mono text-[10px] text-muted-foreground shrink-0">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        {/* Invite link */}
        <Link
          href="/dashboard/invite"
          className="flex items-center gap-1.5 h-8 px-2 sm:px-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all shrink-0"
          title="Invite Agents"
        >
          <Gift className="w-3.5 h-3.5 text-primary" />
          <span className="hidden md:inline text-[11px] font-semibold text-primary">Invite Agents</span>
        </Link>

        <div className="flex-1" />

        {/* Right: Controls */}
        <div className="flex items-center gap-2 shrink-0">

          <div className="hidden lg:block">
            <BrokerageSwitcher />
          </div>
          <ThemeToggle />

          {/* Avatar dropdown */}
          <div className="relative" ref={avatarMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowAvatarMenu(!showAvatarMenu)
              }}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-[11px] text-primary-foreground shrink-0 hover:opacity-90 transition-opacity overflow-hidden"
              title={displayName}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : isDemoMode ? (
                <img src="/demo/avatar-jason.jpg" alt={displayName} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </button>

            {showAvatarMenu && (
              <div className="absolute top-full right-0 mt-2 w-[200px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-[9999]" style={{ position: 'fixed', top: 60, right: 16 }}>
                <div className="px-4 py-3 border-b border-border">
                  <div className="font-semibold text-sm">{displayName}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {profile?.email || 'jason@sweethomerealty.com'}
                  </div>
                </div>
                <div className="p-1">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setShowAvatarMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    Settings
                  </Link>
                  {canSwitchTier && (
                    <>
                      <div className="mx-2 my-1 border-t border-border" />
                      <button
                        onClick={() => setShowTierMenu(!showTierMenu)}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="flex-1 text-left">Tier: <span className="font-semibold capitalize">{tier}</span></span>
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showTierMenu ? 'rotate-180' : ''}`} />
                      </button>
                      {showTierMenu && (
                        <div className="px-1 pb-1">
                          {switcherPlans.map((plan) => (
                            <button
                              key={plan.id}
                              onClick={() => {
                                setAdminTier(plan.id)
                                setShowTierMenu(false)
                                setShowAvatarMenu(false)
                                setTimeout(() => window.location.reload(), 100)
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                tier === plan.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${TIER_COLORS[plan.id] ?? 'bg-gray-500'}`} />
                              <span>{plan.name}</span>
                              <span className="ml-auto text-[10px] text-muted-foreground">{plan.priceLabel}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="mx-2 my-1 border-t border-border" />
                  <button
                    onClick={async () => {
                      setShowAvatarMenu(false)
                      await signOut?.()
                      window.location.href = '/'
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Search modal (Cmd+K) */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
