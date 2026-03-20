'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import {
  Shield,
  LayoutDashboard,
  Users,
  Mail,
  BarChart3,
  Sparkles,
  Settings,
  ArrowLeft,
  Menu,
  X,
  Funnel,
  Tag,
  ClipboardCheck,
} from 'lucide-react'

const ADMIN_EMAILS = ['scott@agentdashboards.com']

const navItems = [
  { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/admin/users', icon: Users, label: 'Users' },
  { href: '/dashboard/admin/invites', icon: Mail, label: 'Invites' },
  { href: '/dashboard/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/admin/setup-analytics', icon: Funnel, label: 'Setup Analytics' },
  { href: '/dashboard/admin/specializations', icon: Tag, label: 'Specializations' },
  { href: '/dashboard/admin/expectations', icon: ClipboardCheck, label: 'Expectations' },
  { href: '/dashboard/admin/nora', icon: Sparkles, label: 'NORA Config' },
  { href: '/dashboard/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAdmin = ADMIN_EMAILS.includes(profile?.email ?? '') || profile?.is_admin === true

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/dashboard')
    }
  }, [isLoading, isAdmin, router])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  if (isLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-8 h-8 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  const isActive = (href: string) =>
    href === '/dashboard/admin' ? pathname === '/dashboard/admin' : pathname.startsWith(href)

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <Shield className="w-5 h-5 text-primary" />
        <span className="text-sm font-extrabold tracking-tight">Super Admin</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Divider + back link */}
      <div className="border-t border-border p-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 bg-card border-r border-border flex-col">
        {sidebar}
      </aside>

      {/* Mobile top bar + overlay */}
      <div className="md:hidden fixed top-[52px] left-0 right-0 z-[550] flex items-center gap-2 h-11 px-3 bg-card border-b border-border">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-border bg-background text-sm font-semibold"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <Shield className="w-3.5 h-3.5 text-primary" />
          Admin
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-[560] bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed top-[52px] left-0 bottom-0 z-[570] w-[220px] bg-card border-r border-border">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-11">
        <div className="p-4 md:p-6 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}
