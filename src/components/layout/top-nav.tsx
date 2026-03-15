'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import BrokerageSwitcher from './brokerage-switcher'
import SearchModal from '@/components/search/search-modal'
import { Map, BarChart3, Search, FileText, TrendingUp, Settings, Plus, UserPlus, Handshake, CreditCard, MessageSquare, Command } from 'lucide-react'
import { AppLogo } from '@/components/ui/app-logo'
import { getUnreadCount } from '@/data/messages'

const navItems = [
  { href: '/dashboard', label: 'Map', icon: Map, id: 'map' },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: BarChart3, id: 'pipeline' },
  { href: '/dashboard/recruiting', label: 'Recruiting', icon: Search, id: 'recruiting' },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText, id: 'documents' },
  { href: '/dashboard/partnerships', label: 'Partners', icon: Handshake, id: 'partnerships' },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, id: 'messages' },
  { href: '/dashboard/roi', label: 'ROI', icon: TrendingUp, id: 'roi' },
  { href: '/dashboard/invite', label: 'Invite', icon: UserPlus, id: 'invite' },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard, id: 'billing' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, id: 'settings' },
]

export default function TopNav({ onInvite }: { onInvite: () => void }) {
  const pathname = usePathname()
  const unreadCount = getUnreadCount()
  const [searchOpen, setSearchOpen] = useState(false)

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

  return (
    <>
    <nav className="h-14 min-h-14 flex items-center px-4 gap-1 relative z-[1100] border-b border-border bg-card">
      {/* Logo */}
      <div className="mr-4 shrink-0 hidden sm:block">
        <AppLogo size="sm" href="/" />
      </div>
      <div className="mr-4 shrink-0 sm:hidden">
        <AppLogo size="sm" href="/" showWordmark={false} />
      </div>

      {/* Nav links */}
      <div className="hidden lg:flex items-center gap-0.5 flex-1">
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          const showBadge = item.id === 'messages' && unreadCount > 0
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
              {showBadge && (
                <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Search button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          title="Search for referral partners (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground">
            <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px] flex items-center gap-0.5">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </span>
        </button>

        <div className="hidden lg:block">
          <BrokerageSwitcher />
        </div>
        <ThemeToggle />
        <Link
          href="/dashboard/invite"
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Invite</span>
        </Link>
        <Link
          href="/dashboard/settings"
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-[11px] text-primary-foreground shrink-0"
          title="Jason O'Brien"
        >
          JO
        </Link>
      </div>
    </nav>

    {/* Search modal (Cmd+K) */}
    <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
