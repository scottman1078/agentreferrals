'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Map,
  BarChart3,
  Handshake,
  MessageSquare,
  TrendingUp,
  MoreHorizontal,
  Search,
  FileText,
  UserPlus,
  CreditCard,
  Settings,
  MapPinned,
} from 'lucide-react'
import { getUnreadCount } from '@/data/messages'

const pillItems = [
  { href: '/dashboard', icon: Map, label: 'Map' },
  { href: '/dashboard/pipeline', icon: BarChart3, label: 'Pipeline' },
  { href: '/dashboard/partnerships', icon: Handshake, label: 'Partners' },
  { href: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  { href: '/dashboard/roi', icon: TrendingUp, label: 'ROI' },
]

const moreItems = [
  { href: '/dashboard/markets', icon: MapPinned, label: 'Markets' },
  { href: '/dashboard/recruiting', icon: Search, label: 'Recruiting' },
  { href: '/dashboard/documents', icon: FileText, label: 'Documents' },
  { href: '/dashboard/invite', icon: UserPlus, label: 'Invite' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export default function PillNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const unreadCount = getUnreadCount()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const isMoreActive =
    moreItems.some((item) => isActive(item.href)) || showMore

  // Close popover on outside click
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500]" ref={menuRef}>
      {/* More popover — opens upward */}
      {showMore && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[200px] rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {moreItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? 'text-primary bg-primary/5'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Pill nav bar */}
      <div className="flex items-center gap-0.5 h-[52px] px-2 bg-card/95 backdrop-blur-xl shadow-2xl border border-border rounded-full">
        {pillItems.map((item) => {
          const active = isActive(item.href)
          const showBadge = item.label === 'Messages' && unreadCount > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center w-14 h-11 rounded-full transition-all ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none mt-0.5">
                {item.label}
              </span>
              {/* Active dot indicator */}
              {active && (
                <span className="absolute bottom-0 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setShowMore(!showMore)}
          className={`relative flex flex-col items-center justify-center w-14 h-11 rounded-full transition-all ${
            isMoreActive
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none mt-0.5">
            More
          </span>
          {isMoreActive && !showMore && (
            <span className="absolute bottom-0 w-1 h-1 rounded-full bg-primary" />
          )}
        </button>
      </div>
    </div>
  )
}
