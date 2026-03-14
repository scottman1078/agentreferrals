'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/dashboard', label: 'Map', icon: '🗺' },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: '📊' },
  { href: '/dashboard/recruiting', label: 'Find', icon: '🔍' },
  { href: '/dashboard/roi', label: 'ROI', icon: '💰' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <div
      className="md:hidden h-[58px] flex"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
    >
      {items.map((item) => {
        const isActive = item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-[family-name:var(--font-d)] font-semibold uppercase tracking-wide transition-colors"
            style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
