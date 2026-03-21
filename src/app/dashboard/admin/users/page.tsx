'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams } from 'ag-grid-community'
import { RefreshCw, Loader2, Trash2, AlertTriangle, Users, UserCheck, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

ModuleRegistry.registerModules([AllCommunityModule])

const ADMIN_EMAILS = ['scott@agentdashboards.com']

interface UserRow {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  primary_area: string | null
  status: string | null
  subscription_tier: string | null
  is_demo: boolean
  is_admin: boolean
  deals_per_year: number | null
  years_licensed: number | null
  avg_sale_price: number | null
  tags: string[] | null
  setup_completed_at: string | null
  created_at: string
  brokerage_name: string | null
}

// Cell renderers
function StatusCell({ value }: ICellRendererParams) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>
  const colors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
    invited: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${colors[value] || colors.active}`}>
      {value}
    </span>
  )
}

function TierCell({ value }: ICellRendererParams) {
  const tier = value || 'starter'
  const colors: Record<string, string> = {
    starter: 'bg-gray-200 text-gray-700 border-gray-300',
    free: 'bg-gray-200 text-gray-700 border-gray-300',
    growth: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    pro: 'bg-violet-500/20 text-violet-600 border-violet-500/30',
    elite: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${colors[tier] || colors.starter}`}>
      {tier === 'free' ? 'Starter' : tier}
    </span>
  )
}

function TypeCell({ data }: ICellRendererParams) {
  if (!data) return null
  if (data.is_admin || ADMIN_EMAILS.includes(data.email)) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">Admin</span>
  }
  if (data.is_demo) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">Demo</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-100 border border-gray-300 dark:border-gray-500">User</span>
}

function SetupCell({ value }: ICellRendererParams) {
  return value
    ? <span className="text-xs text-emerald-600">Complete</span>
    : <span className="text-xs text-muted-foreground">Incomplete</span>
}

function TagsCell({ value }: ICellRendererParams) {
  if (!value || !Array.isArray(value) || value.length === 0) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="flex gap-1 flex-wrap">
      {value.slice(0, 2).map((tag: string) => (
        <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary">{tag}</span>
      ))}
      {value.length > 2 && <span className="text-[9px] text-muted-foreground">+{value.length - 2}</span>}
    </div>
  )
}

function DateCell({ value }: ICellRendererParams) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>
  return <span className="text-xs">{new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
}

function PriceCell({ value }: ICellRendererParams) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>
  return <span className="text-xs">${(value / 1000).toFixed(0)}k</span>
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showDemo, setShowDemo] = useState(false)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserRow | null>(null)
  const [deleteToast, setDeleteToast] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('ar_profiles')
      .select('id, email, full_name, phone, primary_area, status, subscription_tier, is_demo, is_admin, deals_per_year, years_licensed, avg_sale_price, tags, setup_completed_at, created_at, brokerage:ar_brokerages(name)')
      .order('created_at', { ascending: false })

    if (!showDemo) {
      query = query.eq('is_demo', false)
    }

    const { data } = await query

    const mapped: UserRow[] = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      brokerage_name: (row.brokerage as { name: string } | null)?.name || null,
    })) as UserRow[]

    setUsers(mapped)
    setLoading(false)
  }, [showDemo])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function handleDeleteUser(user: UserRow) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      const data = await res.json()
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id))
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
    setConfirmDeleteUser(null)
  }

  async function handleToggleAdmin(user: UserRow) {
    if (!confirm(user.is_admin ? `Remove admin access for ${user.full_name}?` : `Make ${user.full_name} an admin?`)) return
    try {
      const res = await fetch('/api/admin/toggle-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, makeAdmin: !user.is_admin }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_admin: !u.is_admin } : u))
      }
    } catch { /* */ }
  }

  const realCount = users.filter((u) => !u.is_demo).length
  const demoCount = users.filter((u) => u.is_demo).length

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      headerName: 'Name',
      field: 'full_name',
      flex: 1.5,
      minWidth: 150,
      filter: true,
      cellRenderer: (params: ICellRendererParams) => (
        <span className="font-medium text-sm">{params.value || '—'}</span>
      ),
    },
    { headerName: 'Email', field: 'email', flex: 2, minWidth: 200, filter: true },
    { headerName: 'Brokerage', field: 'brokerage_name', flex: 1.5, minWidth: 150, filter: true, cellRenderer: (params: ICellRendererParams) => <span className="text-xs">{params.value || '—'}</span> },
    { headerName: 'Market', field: 'primary_area', flex: 1, minWidth: 120, filter: true, cellRenderer: (params: ICellRendererParams) => <span className="text-xs">{params.value || '—'}</span> },
    { headerName: 'Status', field: 'status', width: 100, filter: true, cellRenderer: StatusCell },
    { headerName: 'Tier', field: 'subscription_tier', width: 100, filter: true, cellRenderer: TierCell },
    { headerName: 'Type', width: 110, cellRenderer: TypeCell, sortable: false },
    { headerName: 'Deals/yr', field: 'deals_per_year', width: 90, filter: 'agNumberColumnFilter' },
    { headerName: 'Yrs Licensed', field: 'years_licensed', width: 100, filter: 'agNumberColumnFilter' },
    { headerName: 'Avg Price', field: 'avg_sale_price', width: 100, cellRenderer: PriceCell, filter: 'agNumberColumnFilter' },
    { headerName: 'Setup', field: 'setup_completed_at', width: 100, cellRenderer: SetupCell },
    { headerName: 'Joined', field: 'created_at', width: 120, sort: 'desc', cellRenderer: DateCell },
    {
      headerName: '',
      width: 80,
      sortable: false,
      cellRenderer: (params: ICellRendererParams) => {
        if (!params.data) return null
        return (
          <div className="flex items-center gap-1">
            {!ADMIN_EMAILS.includes(params.data.email) && (
              <button
                onClick={() => handleToggleAdmin(params.data)}
                className="p-1 rounded hover:bg-accent transition-colors"
                title={params.data.is_admin ? 'Remove admin' : 'Make admin'}
              >
                <Shield className={`w-3.5 h-3.5 ${params.data.is_admin ? 'text-purple-500' : 'text-muted-foreground'}`} />
              </button>
            )}
            <button
              onClick={() => setConfirmDeleteUser(params.data)}
              className="p-1 rounded hover:bg-destructive/10 transition-colors"
              title="Delete user"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        )
      },
    },
  ], [])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
  }), [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {realCount} real users{showDemo ? ` · ${demoCount} demo agents` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showDemo}
              onChange={(e) => setShowDemo(e.target.checked)}
              className="rounded border-border"
            />
            Show demo agents
          </label>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-3">
          <Users className="w-5 h-5 text-muted-foreground" />
          <div>
            <div className="text-xl font-extrabold">{realCount}</div>
            <div className="text-[10px] text-muted-foreground">Real Users</div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-3">
          <UserCheck className="w-5 h-5 text-muted-foreground" />
          <div>
            <div className="text-xl font-extrabold">{users.filter((u) => !u.is_demo && u.setup_completed_at).length}</div>
            <div className="text-[10px] text-muted-foreground">Setup Complete</div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-3">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <div>
            <div className="text-xl font-extrabold">{users.filter((u) => u.is_admin).length}</div>
            <div className="text-[10px] text-muted-foreground">Admins</div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {deleteToast && (
        <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          {deleteToast}
        </div>
      )}

      {/* AG Grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ height: 600 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
          </div>
        ) : (
          <AgGridReact
            rowData={users}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination={true}
            paginationPageSize={25}
            paginationPageSizeSelector={[25, 50, 100]}
            rowHeight={42}
            headerHeight={40}
            animateRows={true}
            suppressCellFocus={true}
            getRowId={(params) => params.data.id}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDeleteUser(null)}>
          <div className="w-full max-w-md mx-4 p-6 rounded-xl border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold">Delete User</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Delete <span className="font-semibold text-foreground">{confirmDeleteUser.full_name || confirmDeleteUser.email}</span>? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setConfirmDeleteUser(null)} className="flex-1 h-10 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDeleteUser)}
                className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
