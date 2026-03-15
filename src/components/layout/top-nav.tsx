'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import BrokerageSwitcher from './brokerage-switcher'
import { Map, BarChart3, Search, FileText, TrendingUp, Settings, Plus, UserPlus, Handshake, CreditCard } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Map', icon: Map, id: 'map' },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: BarChart3, id: 'pipeline' },
  { href: '/dashboard/recruiting', label: 'Recruiting', icon: Search, id: 'recruiting' },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText, id: 'documents' },
  { href: '/dashboard/partnerships', label: 'Partners', icon: Handshake, id: 'partnerships' },
  { href: '/dashboard/roi', label: 'ROI', icon: TrendingUp, id: 'roi' },
  { href: '/dashboard/invite', label: 'Invite', icon: UserPlus, id: 'invite' },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard, id: 'billing' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, id: 'settings' },
]

export default function TopNav({ onInvite }: { onInvite: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="h-14 min-h-14 flex items-center px-4 gap-1 relative z-[1100] border-b border-border bg-card">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-extrabold text-xs text-primary-foreground">
          A
        </div>
        <span className="font-extrabold text-[15px] tracking-tight hidden sm:block">
          Agent<span className="text-primary">Referrals</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="hidden lg:flex items-center gap-0.5 flex-1">
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 ml-auto">
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
  )
}
