'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { agents } from '@/data/agents'
import { getPartnerAgentIds } from '@/data/partnerships'
import { getInitials } from '@/lib/utils'
import type { SubscriptionTier } from '@/lib/stripe'

const TIER_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  growth: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pro: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  elite: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  invited: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const ITEMS_PER_PAGE = 20

// Assign mock tiers based on agent stats
function getMockTier(agent: typeof agents[0]): SubscriptionTier {
  const score = agent.referNetScore ?? 0
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

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)

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
        <p className="text-sm text-muted-foreground mt-0.5">{agents.length} total agents in the network</p>
      </div>

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

      {/* Table */}
      <div className="p-5 rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Agent</th>
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden lg:table-cell">Brokerage</th>
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden md:table-cell">Market</th>
              <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">ReferNet</th>
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
                  <td className="py-2.5 font-semibold">{agent.referNetScore ?? '-'}</td>
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
