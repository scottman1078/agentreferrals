'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import BrokerageSwitcher from './brokerage-switcher'
import SearchModal from '@/components/search/search-modal'
import { Search, Command, LogOut, Gift } from 'lucide-react'
import { AppLogo } from '@/components/ui/app-logo'
import { useAuth } from '@/contexts/auth-context'
import { useDemo } from '@/contexts/demo-context'

export default function TopBar() {
  const pathname = usePathname()
  const isMapPage = pathname === '/dashboard'
  const [searchOpen, setSearchOpen] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const avatarMenuRef = useRef<HTMLDivElement>(null)
  const { profile, signOut } = useAuth()
  const { isDemoMode } = useDemo()
  const [inviteCount, setInviteCount] = useState<number | null>(null)

  // Fetch invite count
  useEffect(() => {
    if (!profile?.id) return
    fetch(`/api/invites/mine?userId=${profile.id}`)
      .then(r => r.json())
      .then(data => setInviteCount(data.remaining ?? null))
      .catch(() => {})
  }, [profile?.id])

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
          className="flex items-center gap-2 h-9 w-full max-w-[280px] px-3 rounded-xl border border-border bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background transition-all"
          title="Search for referral partners (Cmd+K)"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="text-sm truncate">Search address or city...</span>
          <kbd className="ml-auto hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted font-mono text-[10px] text-muted-foreground shrink-0">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        {/* Invite callout */}
        {inviteCount !== null && inviteCount > 0 && (
          <Link
            href="/dashboard/invite"
            className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all shrink-0"
          >
            <Gift className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary">{inviteCount} Invite{inviteCount !== 1 ? 's' : ''} Left</span>
          </Link>
        )}

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
