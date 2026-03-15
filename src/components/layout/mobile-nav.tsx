'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, BarChart3, Handshake, UserPlus, MoreHorizontal, TrendingUp, CreditCard, FileText, Search, Settings } from 'lucide-react'

const primaryItems = [
  { href: '/dashboard', label: 'Map', icon: Map },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: BarChart3 },
  { href: '/dashboard/partnerships', label: 'Partners', icon: Handshake },
  { href: '/dashboard/invite', label: 'Invite', icon: UserPlus },
]

const moreItems = [
  { href: '/dashboard/roi', label: 'ROI', icon: TrendingUp },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/recruiting', label: 'Recruiting', icon: Search },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isMoreActive = moreItems.some((item) =>
    item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
  )

  useEffect(() => {
    if (!showMore) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMore(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMore])

  return (
    <div className="lg:hidden h-14 flex border-t border-border bg-card relative" ref={menuRef}>
      {primaryItems.map((item) => {
        const isActive = item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors min-h-[44px] ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        )
      })}

      {/* More button */}
      <button
        onClick={() => setShowMore(!showMore)}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors min-h-[44px] ${
          isMoreActive || showMore ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        <MoreHorizontal className="w-5 h-5" />
        More
      </button>

      {/* More dropdown */}
      {showMore && (
        <div className="absolute bottom-full left-0 right-0 mb-1 mx-3 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-[1000]">
          {moreItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                  isActive ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-accent'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
