'use client'

import { useState, useEffect, useCallback } from 'react'
import { invalidatePricing } from '@/hooks/use-pricing'
import {
  DollarSign,
  Loader2,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  X,
  Check,
  Pencil,
  Link as LinkIcon,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Tier {
  id: string
  slug: string
  name: string
  description: string | null
  price_cents: number
  price_label: string
  period: string
  is_recommended: boolean
  cta_label: string
  landing_features: string[]
  stripe_product_id: string | null
  stripe_price_id: string | null
  stripe_price_founding_id: string | null
  sort_order: number
  is_active: boolean
  features: Record<string, string | boolean>
}

interface Feature {
  id: string
  key: string
  label: string
  description: string | null
  category: string
  sort_order: number
  is_active: boolean
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminPricingPage() {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // Tier editing
  const [editingTierId, setEditingTierId] = useState<string | null>(null)
  const [tierDraft, setTierDraft] = useState<Partial<Tier>>({})
  const [tierSaving, setTierSaving] = useState(false)

  // Feature matrix editing
  const [matrixDraft, setMatrixDraft] = useState<Record<string, Record<string, string>>>({})
  const [matrixSaving, setMatrixSaving] = useState(false)
  const [matrixDirty, setMatrixDirty] = useState(false)

  // Add feature form
  const [showAddFeature, setShowAddFeature] = useState(false)
  const [newFeatureKey, setNewFeatureKey] = useState('')
  const [newFeatureLabel, setNewFeatureLabel] = useState('')
  const [newFeatureCategory, setNewFeatureCategory] = useState('general')
  const [addingFeature, setAddingFeature] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                     */
  /* ---------------------------------------------------------------- */

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tiersRes, featuresRes] = await Promise.all([
        fetch('/api/admin/tiers'),
        fetch('/api/admin/pricing-features'),
      ])
      const tiersData = await tiersRes.json()
      const featuresData = await featuresRes.json()

      const loadedTiers: Tier[] = tiersData.tiers ?? []
      const loadedFeatures: Feature[] = featuresData.features ?? []

      setTiers(loadedTiers)
      setFeatures(loadedFeatures)

      // Initialize matrix draft from current tier features
      const draft: Record<string, Record<string, string>> = {}
      for (const t of loadedTiers) {
        draft[t.id] = {}
        for (const f of loadedFeatures) {
          const val = t.features[f.key]
          draft[t.id][f.key] = val === true ? 'true' : val === false ? 'false' : (val as string) ?? 'false'
        }
      }
      setMatrixDraft(draft)
      setMatrixDirty(false)
    } catch {
      showToast('Failed to load pricing data')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ---------------------------------------------------------------- */
  /*  Tier editing                                                     */
  /* ---------------------------------------------------------------- */

  function startEditTier(tier: Tier) {
    setEditingTierId(tier.id)
    setTierDraft({
      name: tier.name,
      description: tier.description,
      price_cents: tier.price_cents,
      price_label: tier.price_label,
      period: tier.period,
      is_recommended: tier.is_recommended,
      cta_label: tier.cta_label,
      landing_features: [...(tier.landing_features ?? [])],
    })
  }

  function cancelEditTier() {
    setEditingTierId(null)
    setTierDraft({})
  }

  async function saveTier() {
    if (!editingTierId) return
    setTierSaving(true)
    try {
      const res = await fetch('/api/admin/tiers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTierId, ...tierDraft }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showToast(data.error || `Save failed (${res.status})`)
        setTierSaving(false)
        return
      }
      if (data.tier) {
        showToast(`Saved "${data.tier.name}"`)
        setEditingTierId(null)
        setTierDraft({})
        invalidatePricing()
        // Re-fetch all data to ensure UI is in sync with DB
        await loadData()
      } else {
        showToast('Unexpected response — please refresh')
      }
    } catch (err) {
      showToast('Network error — please try again')
    }
    setTierSaving(false)
  }

  /* ---------------------------------------------------------------- */
  /*  Landing features editor                                          */
  /* ---------------------------------------------------------------- */

  function updateLandingFeature(idx: number, value: string) {
    const lf = [...(tierDraft.landing_features ?? [])]
    lf[idx] = value
    setTierDraft((d) => ({ ...d, landing_features: lf }))
  }

  function addLandingFeature() {
    setTierDraft((d) => ({ ...d, landing_features: [...(d.landing_features ?? []), ''] }))
  }

  function removeLandingFeature(idx: number) {
    const lf = [...(tierDraft.landing_features ?? [])]
    lf.splice(idx, 1)
    setTierDraft((d) => ({ ...d, landing_features: lf }))
  }

  /* ---------------------------------------------------------------- */
  /*  Feature matrix                                                   */
  /* ---------------------------------------------------------------- */

  function updateMatrixCell(tierId: string, featureKey: string, value: string) {
    setMatrixDraft((prev) => ({
      ...prev,
      [tierId]: {
        ...(prev[tierId] ?? {}),
        [featureKey]: value,
      },
    }))
    setMatrixDirty(true)
  }

  function toggleMatrixBool(tierId: string, featureKey: string) {
    const current = matrixDraft[tierId]?.[featureKey] ?? 'false'
    const next = current === 'true' ? 'false' : 'true'
    updateMatrixCell(tierId, featureKey, next)
  }

  // Detect if a value looks boolean
  function isBooleanValue(value: string) {
    return value === 'true' || value === 'false'
  }

  // Detect value type across tiers for a feature key
  function isFeatureBoolean(featureKey: string): boolean {
    for (const t of tiers) {
      const val = matrixDraft[t.id]?.[featureKey]
      if (val && val !== 'true' && val !== 'false') return false
    }
    return true
  }

  async function saveMatrix() {
    setMatrixSaving(true)
    try {
      const promises = tiers.map((t) => {
        const featureValues: Record<string, string> = {}
        for (const f of features) {
          featureValues[f.key] = matrixDraft[t.id]?.[f.key] ?? 'false'
        }
        return fetch('/api/admin/tier-features', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tierId: t.id, features: featureValues }),
        })
      })
      await Promise.all(promises)
      showToast('Feature matrix saved')
      setMatrixDirty(false)
      invalidatePricing()
    } catch {
      showToast('Failed to save feature matrix')
    }
    setMatrixSaving(false)
  }

  /* ---------------------------------------------------------------- */
  /*  Add feature                                                      */
  /* ---------------------------------------------------------------- */

  async function handleAddFeature() {
    if (!newFeatureKey.trim() || !newFeatureLabel.trim()) return
    setAddingFeature(true)
    try {
      const res = await fetch('/api/admin/pricing-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newFeatureKey.trim(),
          label: newFeatureLabel.trim(),
          category: newFeatureCategory,
        }),
      })
      const data = await res.json()
      if (data.feature) {
        setFeatures((prev) => [...prev, data.feature])
        // Add default 'false' for all tiers in the matrix
        setMatrixDraft((prev) => {
          const next = { ...prev }
          for (const t of tiers) {
            next[t.id] = { ...(next[t.id] ?? {}), [data.feature.key]: 'false' }
          }
          return next
        })
        setNewFeatureKey('')
        setNewFeatureLabel('')
        setNewFeatureCategory('general')
        setShowAddFeature(false)
        showToast(`Added feature "${data.feature.label}"`)
        invalidatePricing()
      } else {
        showToast(data.error || 'Failed to add feature')
      }
    } catch {
      showToast('Failed to add feature')
    }
    setAddingFeature(false)
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading pricing configuration...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Pricing Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage tiers, features, and the pricing matrix
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          {toast}
        </div>
      )}

      {/* ============================================================ */}
      {/*  Section 1: Tiers                                             */}
      {/* ============================================================ */}
      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Subscription Tiers
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tiers.map((tier) => {
            const isEditing = editingTierId === tier.id
            return (
              <div
                key={tier.id}
                className={`rounded-xl border bg-card overflow-hidden transition-all ${
                  tier.is_active ? 'border-border' : 'border-border/50 opacity-60'
                } ${isEditing ? 'ring-2 ring-primary/30' : ''}`}
              >
                {/* Tier Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-accent/20">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{tier.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {tier.slug}
                    </span>
                    {tier.is_recommended && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Recommended
                      </span>
                    )}
                    {!tier.is_active && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => startEditTier(tier)}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={saveTier}
                        disabled={tierSaving}
                        className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {tierSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                      </button>
                      <button
                        onClick={cancelEditTier}
                        className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-border text-xs font-semibold hover:bg-accent transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Tier Body */}
                <div className="p-5 space-y-3">
                  {isEditing ? (
                    <>
                      {/* Editable fields */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Name</label>
                          <input
                            type="text"
                            value={tierDraft.name ?? ''}
                            onChange={(e) => setTierDraft((d) => ({ ...d, name: e.target.value }))}
                            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Price (cents)</label>
                          <input
                            type="number"
                            value={tierDraft.price_cents ?? 0}
                            onChange={(e) => setTierDraft((d) => ({ ...d, price_cents: parseInt(e.target.value) || 0 }))}
                            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Price Label</label>
                          <input
                            type="text"
                            value={tierDraft.price_label ?? ''}
                            onChange={(e) => setTierDraft((d) => ({ ...d, price_label: e.target.value }))}
                            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Period</label>
                          <input
                            type="text"
                            value={tierDraft.period ?? ''}
                            onChange={(e) => setTierDraft((d) => ({ ...d, period: e.target.value }))}
                            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Description</label>
                        <input
                          type="text"
                          value={tierDraft.description ?? ''}
                          onChange={(e) => setTierDraft((d) => ({ ...d, description: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">CTA Label</label>
                          <input
                            type="text"
                            value={tierDraft.cta_label ?? ''}
                            onChange={(e) => setTierDraft((d) => ({ ...d, cta_label: e.target.value }))}
                            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                          />
                        </div>
                        <div className="flex items-end pb-0.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tierDraft.is_recommended ?? false}
                              onChange={(e) => setTierDraft((d) => ({ ...d, is_recommended: e.target.checked }))}
                              className="w-4 h-4 rounded border-input accent-primary"
                            />
                            <span className="text-xs font-medium">Recommended</span>
                          </label>
                        </div>
                      </div>

                      {/* Landing Features */}
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                          Landing Page Bullets
                        </label>
                        <div className="space-y-1.5">
                          {(tierDraft.landing_features ?? []).map((lf, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={lf}
                                onChange={(e) => updateLandingFeature(idx, e.target.value)}
                                className="flex-1 h-8 px-2.5 rounded-lg border border-input bg-background text-xs"
                                placeholder="Bullet point text..."
                              />
                              <button
                                onClick={() => removeLandingFeature(idx)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={addLandingFeature}
                            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Add bullet
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Read-only display */}
                      <div className="flex items-baseline gap-2">
                        <span className="font-extrabold text-xl">{tier.price_label}</span>
                        <span className="text-xs text-muted-foreground">{tier.period}</span>
                      </div>
                      {tier.description && (
                        <p className="text-xs text-muted-foreground">{tier.description}</p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        CTA: <span className="font-medium text-foreground">{tier.cta_label}</span>
                      </div>

                      {/* Landing bullets */}
                      {(tier.landing_features ?? []).length > 0 && (
                        <div className="pt-1">
                          <div className="text-[11px] font-medium text-muted-foreground mb-1">Landing bullets</div>
                          <div className="space-y-1">
                            {tier.landing_features.map((lf, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs">
                                <Check className="w-3 h-3 text-primary shrink-0" />
                                {lf}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stripe sync status */}
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <LinkIcon className="w-3 h-3" />
                          Stripe Price ID:{' '}
                          {tier.stripe_price_id ? (
                            <span className="font-mono text-foreground">{tier.stripe_price_id}</span>
                          ) : (
                            <span className="text-amber-500">Not configured</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 2: Feature Matrix                                    */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Feature Matrix
          </h2>
          <div className="flex items-center gap-2">
            {matrixDirty && (
              <span className="text-[11px] font-medium text-amber-500">Unsaved changes</span>
            )}
            <button
              onClick={saveMatrix}
              disabled={matrixSaving || !matrixDirty}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {matrixSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/20">
                  <th className="text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground p-3 w-[220px] sticky left-0 bg-accent/20">
                    Feature
                  </th>
                  {tiers.filter(t => t.is_active).map((t) => (
                    <th
                      key={t.id}
                      className="text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground p-3 min-w-[120px]"
                    >
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.filter(f => f.is_active).map((feat, i) => {
                  const isBool = isFeatureBoolean(feat.key)
                  return (
                    <tr
                      key={feat.id}
                      className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-accent/10'}`}
                    >
                      <td className="p-3 sticky left-0 bg-card">
                        <div className="font-medium text-sm">{feat.label}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{feat.key}</div>
                      </td>
                      {tiers.filter(t => t.is_active).map((t) => {
                        const val = matrixDraft[t.id]?.[feat.key] ?? 'false'
                        return (
                          <td key={t.id} className="p-3 text-center">
                            {isBool ? (
                              <button
                                onClick={() => toggleMatrixBool(t.id, feat.key)}
                                className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center transition-all ${
                                  val === 'true'
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                                    : 'bg-muted/50 text-muted-foreground/40 border border-border hover:border-border/80'
                                }`}
                              >
                                {val === 'true' ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : (
                              <input
                                type="text"
                                value={isBooleanValue(val) ? '' : val}
                                placeholder={val === 'true' ? 'true' : val === 'false' ? '-' : ''}
                                onChange={(e) => updateMatrixCell(t.id, feat.key, e.target.value || 'false')}
                                className="w-full max-w-[100px] mx-auto h-8 px-2 rounded-lg border border-input bg-background text-xs text-center"
                              />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Feature */}
        <div className="mt-3">
          {showAddFeature ? (
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
              <h3 className="font-bold text-sm mb-3">Add New Feature</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Key</label>
                  <input
                    type="text"
                    placeholder="e.g. customReports"
                    value={newFeatureKey}
                    onChange={(e) => setNewFeatureKey(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Custom Reports"
                    value={newFeatureLabel}
                    onChange={(e) => setNewFeatureLabel(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
                <div className="w-32">
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Category</label>
                  <input
                    type="text"
                    placeholder="general"
                    value={newFeatureCategory}
                    onChange={(e) => setNewFeatureCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleAddFeature}
                    disabled={addingFeature || !newFeatureKey.trim() || !newFeatureLabel.trim()}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {addingFeature ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddFeature(false)}
                    className="h-9 px-3 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddFeature(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Feature
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
