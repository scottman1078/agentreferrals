'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'

interface Specialization {
  id: string
  name: string
  color: string
  emoji: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export default function AdminSpecializationsPage() {
  const [specs, setSpecs] = useState<Specialization[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [newEmoji, setNewEmoji] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<Specialization | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const loadSpecs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/specializations')
      const data = await res.json()
      setSpecs(data.specializations || [])
    } catch {
      showToast('Failed to load specializations')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSpecs()
  }, [loadSpecs])

  async function handleAdd() {
    if (!newName.trim() || !newColor) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/admin/specializations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor, emoji: newEmoji || null }),
      })
      const data = await res.json()
      if (data.specialization) {
        setSpecs((prev) => [...prev, data.specialization])
        setNewName('')
        setNewColor('#3b82f6')
        setNewEmoji('')
        setShowAdd(false)
        showToast(`Added "${data.specialization.name}"`)
      } else {
        showToast(data.error || 'Failed to add')
      }
    } catch {
      showToast('Failed to add specialization')
    }
    setAddLoading(false)
  }

  async function handleDelete(spec: Specialization) {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/specializations?id=${spec.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setSpecs((prev) => prev.filter((s) => s.id !== spec.id))
        showToast(`Deleted "${spec.name}"`)
      } else {
        showToast(data.error || 'Failed to delete')
      }
    } catch {
      showToast('Failed to delete')
    }
    setDeleteLoading(false)
    setConfirmDelete(null)
  }

  async function handleToggleActive(spec: Specialization) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/specializations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: spec.id, is_active: !spec.is_active }),
      })
      const data = await res.json()
      if (data.specialization) {
        setSpecs((prev) => prev.map((s) => (s.id === spec.id ? data.specialization : s)))
        showToast(`${data.specialization.is_active ? 'Activated' : 'Deactivated'} "${spec.name}"`)
      }
    } catch {
      showToast('Failed to update')
    }
    setSaving(false)
  }

  async function handleMove(spec: Specialization, direction: 'up' | 'down') {
    const idx = specs.findIndex((s) => s.id === spec.id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= specs.length) return

    const other = specs[swapIdx]
    setSaving(true)
    try {
      // Swap sort_order values
      await Promise.all([
        fetch('/api/admin/specializations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: spec.id, sort_order: other.sort_order }),
        }),
        fetch('/api/admin/specializations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: other.id, sort_order: spec.sort_order }),
        }),
      ])

      // Reorder locally
      const updated = [...specs]
      const tempOrder = updated[idx].sort_order
      updated[idx] = { ...updated[idx], sort_order: updated[swapIdx].sort_order }
      updated[swapIdx] = { ...updated[swapIdx], sort_order: tempOrder }
      updated.sort((a, b) => a.sort_order - b.sort_order)
      setSpecs(updated)
    } catch {
      showToast('Failed to reorder')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Specializations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage agent specialization tags used across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSpecs}
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
            Add Specialization
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
          <h2 className="font-bold text-sm mb-3">New Specialization</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Name (e.g. Luxury)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Color:</label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-input cursor-pointer"
              />
              <span className="text-xs text-muted-foreground font-mono">{newColor}</span>
            </div>
            <input
              type="text"
              placeholder="Emoji (optional)"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              maxLength={4}
              className="w-24 h-10 px-3 rounded-lg border border-input bg-background text-sm text-center"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd}
                disabled={addLoading || !newName.trim()}
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

      {/* Specializations List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading specializations...
        </div>
      ) : specs.length === 0 ? (
        <div className="p-8 rounded-xl border border-border bg-card text-center">
          <p className="text-sm text-muted-foreground">No specializations found. Add one to get started.</p>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="space-y-1">
            {specs.map((spec, idx) => (
              <div
                key={spec.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  spec.is_active
                    ? 'border-border bg-background'
                    : 'border-border/50 bg-muted/30 opacity-60'
                }`}
              >
                {/* Color swatch */}
                <div
                  className="w-8 h-8 rounded-lg shrink-0 border border-border/50"
                  style={{ backgroundColor: spec.color }}
                />

                {/* Emoji */}
                <span className="text-xl w-8 text-center shrink-0">{spec.emoji || ''}</span>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm">{spec.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">{spec.color}</span>
                </div>

                {/* Active badge */}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    spec.is_active
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {spec.is_active ? 'Active' : 'Inactive'}
                </span>

                {/* Toggle active */}
                <button
                  onClick={() => handleToggleActive(spec)}
                  disabled={saving}
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title={spec.is_active ? 'Deactivate' : 'Activate'}
                >
                  {spec.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                {/* Move up/down */}
                <div className="flex flex-col">
                  <button
                    onClick={() => handleMove(spec, 'up')}
                    disabled={idx === 0 || saving}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(spec, 'down')}
                    disabled={idx === specs.length - 1 || saving}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => setConfirmDelete(spec)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete specialization"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-md mx-4 p-6 rounded-xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold">Delete Specialization</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">
                  {confirmDelete.emoji} {confirmDelete.name}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-10 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteLoading}
                className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
