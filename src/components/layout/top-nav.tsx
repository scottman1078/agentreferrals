'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import BrokerageSwitcher from './brokerage-switcher'

const navItems = [
  { href: '/dashboard', label: '🗺 Map', id: 'map' },
  { href: '/dashboard/pipeline', label: '📊 Pipeline', id: 'pipeline' },
  { href: '/dashboard/recruiting', label: '🔍 Recruiting', id: 'recruiting' },
  { href: '/dashboard/documents', label: '📄 Documents', id: 'documents' },
  { href: '/dashboard/roi', label: '💰 ROI', id: 'roi' },
  { href: '/dashboard/settings', label: '⚙️ Settings', id: 'settings' },
]

export default function TopNav({ onInvite }: { onInvite: () => void }) {
  const pathname = usePathname()

  return (
    <nav
      className="h-[60px] min-h-[60px] flex items-center px-5 gap-1 relative z-[100]"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4 shrink-0">
        <div
          className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center font-[family-name:var(--font-d)] font-extrabold text-sm"
          style={{ background: 'linear-gradient(135deg, var(--accent), #d4880a)', color: '#0f1117' }}
        >
          A
        </div>
        <div className="font-[family-name:var(--font-d)] font-extrabold text-[17px] tracking-tight hidden sm:block">
          Agent<span style={{ color: 'var(--accent)' }}>Referrals</span><span className="text-[11px] font-medium ml-0.5" style={{ color: 'var(--text-muted)' }}>.ai</span>
        </div>
      </div>

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
                'px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap font-[family-name:var(--font-d)] transition-all',
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              )}
              style={isActive ? { background: 'var(--accent-bg)' } : { background: 'none' }}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3 ml-auto">
        <BrokerageSwitcher />

        <button
          onClick={onInvite}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold font-[family-name:var(--font-d)] transition-all"
          style={{
            background: 'var(--accent-bg)',
            border: '1px solid rgba(240,165,0,0.3)',
            color: 'var(--accent)',
          }}
        >
          <span className="text-sm">＋</span>
          <span className="hidden md:inline">Invite</span>
        </button>
        <Link
          href="/dashboard/settings"
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-[family-name:var(--font-d)] font-bold text-[13px] shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--orange))', color: '#0f1117' }}
          title="Jason O'Brien"
        >
          JO
        </Link>
      </div>
    </nav>
  )
}
