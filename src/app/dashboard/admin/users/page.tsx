'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { agents } from '@/data/agents'
import { getPartnerAgentIds } from '@/data/partnerships'
import { getInitials } from '@/lib/utils'
import type { SubscriptionTier } from '@/lib/stripe'

const ADMIN_EMAILS = ['scott@agentdashboards.com']

const TIER_COLORS: Record<string, string> = {
  starter: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100 border border-gray-300 dark:border-gray-500',
  free: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100 border border-gray-300 dark:border-gray-500',
  growth: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30',
  pro: 'bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30',
  elite: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
  invited: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30',
}

const ITEMS_PER_PAGE = 20

// Assign mock tiers based on agent stats
function getMockTier(agent: typeof agents[0]): SubscriptionTier {
  const score = agent.rcsScore ?? 0
  if (score >= 93) return 'elite'
  if (score >= 88) return 'pro'
  if (score >= 82) return 'growth'
  return 'starter'
}

// Mock communication score based on response time
function getCommScore(agent: typeof agents[0]): number {
  const rt = agent.responseTime ?? ''
  if (rt.includes('30min')) return 98
  if (rt.includes('1hr')) return 90
  if (rt.includes('2hr')) return 82
  if (rt.includes('4hr')) return 70
  return 65
}

interface RealUser {
  id: string
  email: string
  full_name: string | null
  primary_area: string | null
  phone: string | null
  status: string | null
  subscription_tier: string | null
  phone_verified: boolean | null
  years_licensed: number | null
  deals_per_year: number | null
  created_at: string | null
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteToast, setDeleteToast] = useState<string | null>(null)

  // Real Supabase users
  const [realUsers, setRealUsers] = useState<RealUser[]>([])
  const [realUsersLoading, setRealUsersLoading] = useState(true)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<RealUser | null>(null)

  function loadRealUsers() {
    setRealUsersLoading(true)
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => setRealUsers(data.users || []))
      .catch(() => {})
      .finally(() => setRealUsersLoading(false))
  }

  useEffect(() => { loadRealUsers() }, [])

  async function handleDeleteRealUser(user: RealUser) {
    setDeletingUser(user.id)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      const data = await res.json()
      if (data.success) {
        setRealUsers(prev => prev.filter(u => u.id !== user.id))
        setDeleteToast(`Deleted ${user.full_name || user.email}`)
        setTimeout(() => setDeleteToast(null), 4000)
      } else {
        setDeleteToast(`Failed: ${data.error}`)
        setTimeout(() => setDeleteToast(null), 4000)
      }
    } catch {
      setDeleteToast('Failed to delete user')
      setTimeout(() => setDeleteToast(null), 4000)
    }
    setDeletingUser(null)
    setConfirmDeleteUser(null)
  }

  // Get unique brokerages for the filter dropdown
  const brokerages = useMemo(() => {
    const set = new Set(agents.map((a) => a.brokerageId))
    return Array.from(set).sort()
  }, [])

  const filtered = useMemo(() => {
    let result = agents
    // search filter
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)
      )
    }
    // status / brokerage filter
    if (filter === 'active') result = result.filter((a) => a.status === 'active')
    else if (filter === 'invited') result = result.filter((a) => a.status === 'invited')
    else if (filter !== 'all') result = result.filter((a) => a.brokerageId === filter)

    return result
  }, [search, filter])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paged = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{realUsers.length} real users · {agents.length} demo agents</p>
      </div>

      {/* ═══ Real Supabase Users ═══ */}
      <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">Real Users ({realUsers.length})</h2>
          <button
            onClick={loadRealUsers}
            disabled={realUsersLoading}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${realUsersLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {realUsersLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : realUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No real users yet.</p>
        ) : (
          <div className="space-y-2">
            {realUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground shrink-0">
                  {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{user.full_name || 'No name'}</div>
                  <div className="text-[11px] text-muted-foreground">{user.email}</div>
                </div>
                <div className="text-xs text-muted-foreground hidden sm:block">{user.primary_area || '—'}</div>
                <div className="text-xs text-muted-foreground hidden md:block">
                  {user.phone_verified ? '✓ Verified' : 'Unverified'}
                </div>
                <button
                  onClick={async () => {
                    const isAdmin = user.subscription_tier === 'admin' || ADMIN_EMAILS.includes(user.email)
                    if (ADMIN_EMAILS.includes(user.email) && isAdmin) return // Can't remove hardcoded super admin
                    try {
                      const res = await fetch('/api/admin/toggle-admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, makeAdmin: !isAdmin }),
                      })
                      if (res.ok) {
                        setRealUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, subscription_tier: isAdmin ? 'free' : 'admin' } : u))
                      }
                    } catch { /* */ }
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    user.subscription_tier === 'admin' || ADMIN_EMAILS.includes(user.email)
                      ? 'bg-purple-500 text-white border border-purple-500/30'
                      : 'bg-muted text-muted-foreground border border-border hover:bg-accent cursor-pointer'
                  }`}
                  title={user.subscription_tier === 'admin' || ADMIN_EMAILS.includes(user.email) ? 'Admin (click to remove)' : 'Click to make admin'}
                >
                  {user.subscription_tier === 'admin' || ADMIN_EMAILS.includes(user.email) ? 'Admin' : 'User'}
                </button>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${TIER_COLORS[user.subscription_tier || 'starter'] || TIER_COLORS.starter}`}>
                  {user.subscription_tier || 'starter'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_COLORS[user.status || 'active'] || STATUS_COLORS.active}`}>
                  {user.status || 'active'}
                </span>
                {confirmDeleteUser?.id === user.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteRealUser(user)}
                      disabled={deletingUser === user.id}
                      className="text-[10px] px-2 py-1 rounded bg-destructive text-destructive-foreground font-bold hover:opacity-90 disabled:opacity-50"
                    >
                      {deletingUser === user.id ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteUser(null)}
                      className="text-[10px] px-2 py-1 rounded border border-border font-bold hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteUser(user)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete user"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {deleteToast && (
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-2">{deleteToast}</p>
        )}
      </div>

      <div className="h-px bg-border" />
      <h2 className="font-bold text-sm text-muted-foreground">Demo Agents ({agents.length})</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(0) }}
          className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
        >
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <optgroup label="By Brokerage">
            {brokerages.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Delete Demo Users */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete All Demo Users
        </button>
        {deleteToast && (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{deleteToast}</span>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="p-4 rounded-xl border-2 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm">Delete all demo/mock users?</p>
              <p className="text-xs text-muted-foreground mt-1">
                This will remove all ar_profiles where is_demo = true from the database. Real users will not be affected.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={async () => {
                    setDeleteLoading(true)
                    try {
                      const res = await fetch('/api/admin/delete-demo-users', { method: 'POST' })
                      const data = await res.json()
                      setDeleteToast(`Deleted ${data.count ?? 0} demo users`)
                      setTimeout(() => setDeleteToast(null), 4000)
                    } catch {
                      setDeleteToast('Failed to delete demo users')
                      setTimeout(() => setDeleteToast(null), 4000)
                    }
                    setDeleteLoading(false)
                    setShowDeleteConfirm(false)
                  }}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 h-8 px-4 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete Demo Users'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-8 px-4 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="p-5 rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Agent</th>
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden lg:table-cell">Brokerage</th>
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden md:table-cell">Market</th>
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">RCS</th>
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden sm:table-cell">Comm</th>
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Tier</th>
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden sm:table-cell">Status</th>
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden md:table-cell">Network</th>
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((agent) => {
              const tier = getMockTier(agent)
              const comm = getCommScore(agent)
              const networkSize = getPartnerAgentIds(agent.id).length
              return (
                <tr key={agent.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ backgroundColor: agent.color }}
                      >
                        {getInitials(agent.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{agent.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{agent.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-muted-foreground hidden lg:table-cell text-xs">{agent.brokerage}</td>
                  <td className="py-2.5 text-muted-foreground hidden md:table-cell text-xs">{agent.area}</td>
                  <td className="py-2.5 font-semibold">{agent.rcsScore ?? '-'}</td>
                  <td className="py-2.5 font-semibold hidden sm:table-cell">{comm}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${TIER_COLORS[tier]}`}>
                      {tier}
                    </span>
                  </td>
                  <td className="py-2.5 hidden sm:table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_COLORS[agent.status]}`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted-foreground hidden md:table-cell">{networkSize}</td>
                  <td className="py-2.5">
                    <Link
                      href={`/agent/${agent.id}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold disabled:opacity-40 hover:bg-accent transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold disabled:opacity-40 hover:bg-accent transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
