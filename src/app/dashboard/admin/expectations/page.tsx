'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  ShoppingCart,
  Home,
  Settings,
} from 'lucide-react'

interface ExpectationItem {
  id: string
  category: 'buyer' | 'seller' | 'general'
  event_key: string
  label: string
  description: string | null
  sort_order: number
  is_active: boolean
  trigger_type: 'stage_change' | 'activity' | 'time_based'
  trigger_config: Record<string, unknown>
  notification_template: Record<string, unknown>
  created_at: string
}

const CATEGORY_META = {
  buyer: { label: 'Buyer Referral', icon: ShoppingCart, color: '#3b82f6' },
  seller: { label: 'Seller Referral', icon: Home, color: '#22c55e' },
  general: { label: 'General', icon: Settings, color: '#f59e0b' },
} as const

const TRIGGER_LABELS = {
  stage_change: 'Stage Change',
  activity: 'Activity Log',
  time_based: 'Time-Based',
} as const

export default function AdminExpectationsPage() {
  const [items, setItems] = useState<ExpectationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<'buyer' | 'seller' | 'general'>('buyer')

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newEventKey, setNewEventKey] = useState('')
  const [newTriggerType, setNewTriggerType] = useState<'stage_change' | 'activity' | 'time_based'>('activity')
  const [addLoading, setAddLoading] = useState(false)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<ExpectationItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/expectations')
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      showToast('Failed to load expectations')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  const filteredItems = items.filter((i) => i.category === activeCategory)

  async function handleAdd() {
    if (!newLabel.trim() || !newEventKey.trim()) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/admin/expectations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCategory,
          event_key: newEventKey.trim(),
          label: newLabel.trim(),
          description: newDescription.trim() || null,
          trigger_type: newTriggerType,
          trigger_config: {},
          notification_template: {},
        }),
      })
      const data = await res.json()
      if (data.item) {
        setItems((prev) => [...prev, data.item])
        setNewLabel('')
        setNewDescription('')
        setNewEventKey('')
        setShowAdd(false)
        showToast(`Added "${data.item.label}"`)
      } else {
        showToast(data.error || 'Failed to add')
      }
    } catch {
      showToast('Failed to add')
    }
    setAddLoading(false)
  }

  async function handleDelete(item: ExpectationItem) {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/expectations?id=${item.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setItems((prev) => prev.filter((i) => i.id !== item.id))
        showToast(`Deleted "${item.label}"`)
      } else {
        showToast(data.error || 'Failed to delete')
      }
    } catch {
      showToast('Failed to delete')
    }
    setDeleteLoading(false)
    setConfirmDelete(null)
  }

  async function handleToggleActive(item: ExpectationItem) {
    try {
      const res = await fetch('/api/admin/expectations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
      })
      const data = await res.json()
      if (data.item) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? data.item : i)))
        showToast(`${data.item.is_active ? 'Activated' : 'Deactivated'} "${item.label}"`)
      }
    } catch {
      showToast('Failed to update')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Referral Expectations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage expectation items that agents can select for buyer & seller referrals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadItems}
            disabled={loading}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
        {(['buyer', 'seller', 'general'] as const).map((cat) => {
          const meta = CATEGORY_META[cat]
          const isActive = activeCategory === cat
          const count = items.filter((i) => i.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive ? 'bg-card border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <meta.icon className="w-3.5 h-3.5" style={isActive ? { color: meta.color } : undefined} />
              {meta.label}
              <span className="text-[10px] text-muted-foreground ml-0.5">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
          <h2 className="font-bold text-sm mb-3">
            New {CATEGORY_META[activeCategory].label} Expectation
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Label (e.g. Weekly status updates)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
              />
              <input
                type="text"
                placeholder="Event key (e.g. buyer.weekly_updates)"
                value={newEventKey}
                onChange={(e) => setNewEventKey(e.target.value)}
                className="h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono"
              />
            </div>
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            />
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground font-semibold">Trigger:</label>
              {(['activity', 'stage_change', 'time_based'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewTriggerType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    newTriggerType === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {TRIGGER_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd}
                disabled={addLoading || !newLabel.trim() || !newEventKey.trim()}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 rounded-xl border border-border bg-card text-center">
          <p className="text-sm text-muted-foreground">No {CATEGORY_META[activeCategory].label.toLowerCase()} expectations yet.</p>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="space-y-1">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  item.is_active ? 'border-border bg-background' : 'border-border/50 bg-muted/30 opacity-60'
                }`}
              >
                {/* Trigger type badge */}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  item.trigger_type === 'stage_change' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30' :
                  item.trigger_type === 'time_based' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                  'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                }`}>
                  {TRIGGER_LABELS[item.trigger_type]}
                </span>

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm">{item.label}</span>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  )}
                </div>

                {/* Event key */}
                <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">{item.event_key}</span>

                {/* Active badge */}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  item.is_active
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
                }`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </span>

                {/* Toggle active */}
                <button
                  onClick={() => handleToggleActive(item)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={item.is_active ? 'Deactivate' : 'Activate'}
                >
                  {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                {/* Delete */}
                <button
                  onClick={() => setConfirmDelete(item)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-md mx-4 p-6 rounded-xl border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold">Delete Expectation</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Delete <span className="font-semibold text-foreground">{confirmDelete.label}</span>?
                Agents who selected this will lose it.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 h-10 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteLoading}
                className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
