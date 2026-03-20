'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, Loader2, ShoppingCart, Home, Settings, ChevronDown, ChevronUp } from 'lucide-react'

interface ExpectationItem {
  id: string
  category: 'buyer' | 'seller' | 'general'
  event_key: string
  label: string
  description: string | null
  trigger_type: string
}

interface ExpectationsSelectorProps {
  agentId: string
  /** 'send' = what I expect when I refer out, 'receive' = what I commit to when I receive */
  side: 'send' | 'receive'
  /** Called when selections change */
  onSelectionsChange?: (ids: string[]) => void
  /** If true, saves to DB on change. If false, parent manages saving. */
  autoSave?: boolean
  /** Pre-selected IDs (for setup wizard before DB save) */
  initialSelectedIds?: string[]
  /** Compact mode for setup wizard */
  compact?: boolean
}

const CATEGORY_META = {
  buyer: { label: 'Buyer Referrals', icon: ShoppingCart, color: '#3b82f6' },
  seller: { label: 'Seller Referrals', icon: Home, color: '#22c55e' },
  general: { label: 'General', icon: Settings, color: '#f59e0b' },
} as const

export default function ExpectationsSelector({
  agentId,
  side,
  onSelectionsChange,
  autoSave = false,
  initialSelectedIds,
  compact = false,
}: ExpectationsSelectorProps) {
  const [items, setItems] = useState<ExpectationItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds ?? []))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['buyer', 'seller', 'general']))

  // Load available expectation items
  useEffect(() => {
    fetch('/api/expectations')
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Load agent's existing selections (if not using initialSelectedIds)
  useEffect(() => {
    if (initialSelectedIds || !agentId) return

    fetch(`/api/expectations/profile?agentId=${agentId}`)
      .then((res) => res.json())
      .then((data) => {
        const existing = side === 'send' ? data.send : data.receive
        if (existing && Array.isArray(existing)) {
          setSelectedIds(new Set(existing.map((e: { id: string }) => e.id)))
        }
      })
      .catch(() => {})
  }, [agentId, side, initialSelectedIds])

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Notify parent of changes
  useEffect(() => {
    onSelectionsChange?.(Array.from(selectedIds))
  }, [selectedIds, onSelectionsChange])

  // Auto-save to DB when selections change
  useEffect(() => {
    if (!autoSave || !agentId || loading) return
    // Debounce save
    const timer = setTimeout(async () => {
      setSaving(true)
      try {
        await fetch('/api/expectations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId,
            selections: {
              [side]: Array.from(selectedIds),
            },
          }),
        })
      } catch {}
      setSaving(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [selectedIds, autoSave, agentId, side, loading])

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const selectAll = (category: string) => {
    const catItems = items.filter((i) => i.category === category)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      catItems.forEach((i) => next.add(i.id))
      return next
    })
  }

  const deselectAll = (category: string) => {
    const catItemIds = new Set(items.filter((i) => i.category === category).map((i) => i.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      catItemIds.forEach((id) => next.delete(id))
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading expectations...
      </div>
    )
  }

  const categories = ['buyer', 'seller', 'general'] as const

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {saving && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </div>
      )}

      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat)
        if (catItems.length === 0) return null
        const meta = CATEGORY_META[cat]
        const isExpanded = expandedCategories.has(cat)
        const selectedCount = catItems.filter((i) => selectedIds.has(i.id)).length

        return (
          <div key={cat} className={`rounded-xl border border-border ${compact ? '' : 'bg-card'}`}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-accent/50 transition-colors rounded-t-xl"
            >
              <meta.icon className="w-4 h-4 shrink-0" style={{ color: meta.color }} />
              <span className="font-bold text-sm flex-1">{meta.label}</span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {selectedCount}/{catItems.length} selected
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-3">
                {/* Select all / none */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => selectAll(cat)}
                    className="text-[10px] text-primary font-semibold hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground text-[10px]">|</span>
                  <button
                    onClick={() => deselectAll(cat)}
                    className="text-[10px] text-muted-foreground font-semibold hover:underline"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-1">
                  {catItems.map((item) => {
                    const isSelected = selectedIds.has(item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-primary/10 border border-primary/20'
                            : 'border border-transparent hover:bg-accent/50'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'border-2 border-muted-foreground/30'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {item.label}
                          </span>
                          {item.description && !compact && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <p className="text-[10px] text-muted-foreground">
        {side === 'send'
          ? 'These are the updates you want to receive when you refer a client to another agent.'
          : 'These are the updates you commit to providing when you receive a referral from another agent.'}
      </p>
    </div>
  )
}
