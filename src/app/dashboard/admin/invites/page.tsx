'use client'

import { useState, useEffect, useMemo } from 'react'
import { Mail, DollarSign, TrendingUp, Loader2, RefreshCw, CheckCircle, Clock } from 'lucide-react'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, type ColDef } from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

interface Invite {
  id: string
  referral_code: string | null
  invitee_name: string | null
  invitee_email: string | null
  status: string
  created_at: string
  signed_up_at: string | null
  inviter_name: string
}

interface Referrer {
  name: string
  invitesSent: number
  signedUp: number
  earned: number
  paid: number
}

interface InviteStats {
  totalSent: number
  signedUp: number
  conversionRate: string
  pending: number
}

interface RewardStats {
  totalEarned: number
  totalPaid: number
  outstanding: number
  count: number
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [stats, setStats] = useState<InviteStats | null>(null)
  const [rewards, setRewards] = useState<RewardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'invites' | 'earnings'>('invites')

  function loadData() {
    setLoading(true)
    fetch('/api/admin/invites')
      .then((r) => r.json())
      .then((data) => {
        setInvites(data.invites || [])
        setReferrers(data.referrers || [])
        setStats(data.stats || null)
        setRewards(data.rewards || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  // Invite table columns
  const inviteColumns = useMemo<ColDef<Invite>[]>(() => [
    {
      field: 'inviter_name',
      headerName: 'Inviter',
      flex: 1,
      minWidth: 140,
      filter: true,
    },
    {
      field: 'invitee_email',
      headerName: 'Invitee Email',
      flex: 1.5,
      minWidth: 200,
      filter: true,
    },
    {
      field: 'referral_code',
      headerName: 'Code',
      width: 160,
      filter: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      filter: true,
      cellRenderer: (params: { value: string }) => {
        const styles: Record<string, string> = {
          pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
          signed_up: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
          active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        }
        return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles[params.value] || 'bg-muted text-muted-foreground'}">${params.value}</span>`
      },
    },
    {
      field: 'created_at',
      headerName: 'Sent',
      width: 130,
      sort: 'desc' as const,
      valueFormatter: (params: { value: string }) =>
        params.value ? new Date(params.value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
    },
    {
      field: 'signed_up_at',
      headerName: 'Signed Up',
      width: 130,
      valueFormatter: (params: { value: string | null }) =>
        params.value ? new Date(params.value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
    },
  ], [])

  // Earnings table columns
  const earningsColumns = useMemo<ColDef<Referrer>[]>(() => [
    {
      field: 'name',
      headerName: 'Referrer',
      flex: 1,
      minWidth: 160,
      filter: true,
    },
    {
      field: 'invitesSent',
      headerName: 'Invites Sent',
      width: 120,
      sort: 'desc' as const,
    },
    {
      field: 'signedUp',
      headerName: 'Conversions',
      width: 120,
    },
    {
      headerName: 'Conv. Rate',
      width: 110,
      valueGetter: (params: { data: Referrer | undefined }) => {
        if (!params.data || params.data.invitesSent === 0) return '0%'
        return `${((params.data.signedUp / params.data.invitesSent) * 100).toFixed(0)}%`
      },
    },
    {
      field: 'earned',
      headerName: 'Earned',
      width: 120,
      valueFormatter: (params: { value: number }) => `$${(params.value || 0).toFixed(2)}`,
      cellClass: 'font-semibold text-emerald-600',
    },
    {
      field: 'paid',
      headerName: 'Paid Out',
      width: 120,
      valueFormatter: (params: { value: number }) => `$${(params.value || 0).toFixed(2)}`,
    },
    {
      headerName: 'Outstanding',
      width: 120,
      valueGetter: (params: { data: Referrer | undefined }) =>
        params.data ? params.data.earned - params.data.paid : 0,
      valueFormatter: (params: { value: number }) => `$${(params.value || 0).toFixed(2)}`,
      cellClass: 'font-semibold',
    },
  ], [])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
  }), [])

  const statCards = [
    { label: 'Total Invites', value: stats?.totalSent ?? 0, icon: Mail, color: 'text-blue-500' },
    { label: 'Signed Up', value: stats?.signedUp ?? 0, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Conversion Rate', value: `${stats?.conversionRate ?? '0.0'}%`, icon: TrendingUp, color: 'text-primary' },
    { label: 'Pending', value: stats?.pending ?? 0, icon: Clock, color: 'text-amber-500' },
    { label: 'Total Earned', value: `$${rewards?.totalEarned ?? 0}`, icon: DollarSign, color: 'text-emerald-500' },
    { label: 'Outstanding', value: `$${rewards?.outstanding ?? 0}`, icon: DollarSign, color: 'text-cyan-500' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Referral Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track invitations, conversions, and affiliate earnings
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map((card) => (
              <div key={card.label} className="border border-border rounded-xl p-4">
                <card.icon className={`w-4 h-4 ${card.color} mb-2`} />
                <div className="text-2xl font-extrabold">{card.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
            <button
              onClick={() => setActiveTab('invites')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'invites'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              Invites ({invites.length})
            </button>
            <button
              onClick={() => setActiveTab('earnings')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'earnings'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              Earnings ({referrers.length})
            </button>
          </div>

          {/* Invites Tab */}
          {activeTab === 'invites' && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
                <AgGridReact
                  rowData={invites}
                  columnDefs={inviteColumns}
                  defaultColDef={defaultColDef}
                  pagination={true}
                  paginationPageSize={20}
                  quickFilterText=""
                  domLayout="normal"
                />
              </div>
            </div>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
                <AgGridReact
                  rowData={referrers}
                  columnDefs={earningsColumns}
                  defaultColDef={defaultColDef}
                  pagination={true}
                  paginationPageSize={20}
                  domLayout="normal"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
