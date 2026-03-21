'use client'

import { useState, useEffect } from 'react'
import { Save, AlertTriangle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

/* ── Affiliate Program settings ────────────────────────────── */
interface AffiliateField {
  key: string
  label: string
  suffix: string
  min: number
  max: number
  defaultValue: number
}

const AFFILIATE_FIELDS: AffiliateField[] = [
  { key: 'affiliate_commission_rate', label: 'Commission Rate', suffix: '%', min: 1, max: 100, defaultValue: 10 },
  { key: 'affiliate_commission_duration_months', label: 'Commission Duration', suffix: 'months', min: 1, max: 120, defaultValue: 24 },
  { key: 'affiliate_max_discount', label: 'Max Discount Cap', suffix: '%', min: 1, max: 100, defaultValue: 100 },
]

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function AdminSettingsPage() {
  const [foundingSpots, setFoundingSpots] = useState(5000)
  const [waitlistMode, setWaitlistMode] = useState(true)
  const [inviteOnly, setInviteOnly] = useState(true)
  const [noraEnabled, setNoraEnabled] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [toast, setToast] = useState('')

  // Affiliate settings state
  const [affValues, setAffValues] = useState<Record<string, number>>({})
  const [affOriginal, setAffOriginal] = useState<Record<string, number>>({})
  const [affLoading, setAffLoading] = useState(true)
  const [affSaving, setAffSaving] = useState(false)
  const [affFeedback, setAffFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchAffiliateSettings()
  }, [])

  async function fetchAffiliateSettings() {
    setAffLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      const settings = data.settings ?? {}
      const vals: Record<string, number> = {}
      for (const field of AFFILIATE_FIELDS) {
        const stored = settings[field.key]
        vals[field.key] = typeof stored?.value === 'number' ? stored.value : field.defaultValue
      }
      setAffValues(vals)
      setAffOriginal(vals)
    } catch {
      setAffFeedback({ type: 'error', message: 'Failed to load affiliate settings' })
    }
    setAffLoading(false)
  }

  function handleAffChange(key: string, raw: string) {
    const num = parseInt(raw, 10)
    if (!isNaN(num)) {
      setAffValues((prev) => ({ ...prev, [key]: num }))
    }
  }

  const affHasChanges = AFFILIATE_FIELDS.some((f) => affValues[f.key] !== affOriginal[f.key])

  async function handleAffSave() {
    setAffSaving(true)
    setAffFeedback(null)
    try {
      const changed = AFFILIATE_FIELDS.filter((f) => affValues[f.key] !== affOriginal[f.key])
      for (const field of changed) {
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: field.key, value: affValues[field.key] }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Failed to save')
      }
      setAffOriginal({ ...affValues })
      setAffFeedback({ type: 'success', message: `Saved ${changed.length} setting${changed.length > 1 ? 's' : ''}` })
      setTimeout(() => setAffFeedback(null), 4000)
    } catch (err) {
      setAffFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save' })
      setTimeout(() => setAffFeedback(null), 4000)
    }
    setAffSaving(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const featureFlags = [
    {
      label: 'Waitlist Mode',
      description: 'New signups are added to a waitlist instead of getting immediate access',
      checked: waitlistMode,
      onChange: setWaitlistMode,
    },
    {
      label: 'Invite-Only Registration',
      description: 'Users must have a valid invite code to create an account',
      checked: inviteOnly,
      onChange: setInviteOnly,
    },
    {
      label: 'NORA AI Enabled',
      description: 'Enable the NORA AI chat assistant for all users',
      checked: noraEnabled,
      onChange: setNoraEnabled,
    },
    {
      label: 'Maintenance Mode',
      description: 'Show a maintenance page to all non-admin users',
      checked: maintenanceMode,
      onChange: setMaintenanceMode,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Global platform configuration</p>
      </div>

      {/* Platform Settings */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-4">
        <h2 className="text-sm font-bold">Platform Settings</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Platform Name</label>
            <input
              type="text"
              value="AgentReferrals"
              readOnly
              className="w-full h-10 px-3 rounded-lg border border-input bg-muted text-sm cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Domain</label>
            <input
              type="text"
              value="agentreferrals.ai"
              readOnly
              className="w-full h-10 px-3 rounded-lg border border-input bg-muted text-sm cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Total Founding Spots</label>
            <input
              type="number"
              value={foundingSpots}
              onChange={(e) => setFoundingSpots(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Shown on the <a href="/" target="_blank" className="text-primary hover:underline">landing page</a> founding member counter.</p>
          </div>
        </div>

        <button
          onClick={() => showToast('Settings saved')}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>

      {/* Affiliate Program */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-4">
        <h2 className="text-sm font-bold">Affiliate Program</h2>

        {affLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading affiliate settings...
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {AFFILIATE_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-sm font-medium w-48 shrink-0">{field.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={affValues[field.key] ?? field.defaultValue}
                      onChange={(e) => handleAffChange(field.key, e.target.value)}
                      className="w-24 h-10 px-3 rounded-lg border border-input bg-background text-sm text-right"
                    />
                    <span className="text-sm text-muted-foreground">{field.suffix}</span>
                    {affValues[field.key] !== affOriginal[field.key] && (
                      <span className="text-[10px] font-semibold text-orange-500">changed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <button
                onClick={handleAffSave}
                disabled={!affHasChanges || affSaving}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {affSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {affSaving ? 'Saving...' : 'Save Affiliate Settings'}
              </button>

              {affFeedback && (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  affFeedback.type === 'success'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {affFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  {affFeedback.message}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Feature Flags */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-4">
        <h2 className="text-sm font-bold">Feature Flags</h2>

        <div className="space-y-4">
          {featureFlags.map((flag) => (
            <div key={flag.label} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{flag.label}</div>
                <div className="text-xs text-muted-foreground">{flag.description}</div>
              </div>
              <Toggle checked={flag.checked} onChange={flag.onChange} />
            </div>
          ))}
        </div>

        <button
          onClick={() => showToast('Feature flags saved')}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Save className="w-4 h-4" />
          Save Feature Flags
        </button>
      </div>

      {/* Danger Zone */}
      <div className="p-5 rounded-xl border-2 border-red-300 dark:border-red-900/60 bg-card space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => showToast('Demo data has been reset')}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Reset Demo Data
          </button>
          <button
            onClick={() => showToast('Waitlist cleared')}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Clear Waitlist
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  )
}
