'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, BarChart3, Search, TrendingUp, Settings } from 'lucide-react'

const items = [
  { href: '/dashboard', label: 'Map', icon: Map },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: BarChart3 },
  { href: '/dashboard/recruiting', label: 'Find', icon: Search },
  { href: '/dashboard/roi', label: 'ROI', icon: TrendingUp },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <div className="lg:hidden h-14 flex border-t border-border bg-card">
      {items.map((item) => {
        const isActive = item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
