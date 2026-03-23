'use client'

import { useState, useEffect } from 'react'
import { Loader2, Pencil, ClipboardCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ExpectationsSelector from '@/components/expectations/expectations-selector'

export function ReferralExpectationsEditor({
  profile,
  isAuthenticated,
  refreshProfile,
  demoGuard,
}: {
  profile: import('@/contexts/auth-context').ArProfile | null
  isAuthenticated: boolean
  refreshProfile: () => Promise<void>
  demoGuard: () => boolean
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [updateMethod, setUpdateMethod] = useState(profile?.referral_update_method || 'email')
  const [responseTime, setResponseTime] = useState(profile?.referral_response_time || '24hrs')

  useEffect(() => {
    if (profile) {
      setUpdateMethod(profile.referral_update_method || 'email')
      setResponseTime(profile.referral_response_time || '24hrs')
    }
  }, [profile])

  async function handleSavePrefs() {
    if (demoGuard()) return
    if (!profile) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('ar_profiles')
      .update({
        referral_update_method: updateMethod,
        referral_response_time: responseTime,
      })
      .eq('id', profile.id)
    setSaving(false)
    if (error) {
      setToast(`Failed to save: ${error.message}`)
      setTimeout(() => setToast(''), 6000)
      return
    }
    setEditing(false)
    await refreshProfile()
    setToast('Referral preferences updated')
    setTimeout(() => setToast(''), 3000)
  }

  const METHOD_LABELS: Record<string, string> = { email: 'Email', text: 'Text Message', phone: 'Phone Call', in_app: 'In-App' }
  const TIME_LABELS: Record<string, string> = { same_day: 'Same Day', '24hrs': 'Within 24 Hours', '48hrs': 'Within 48 Hours' }

  return (
    <div className="p-5 rounded-xl border border-border bg-card">
      {/* Prominent header with icon and description */}
      <div className="flex items-center justify-between mb-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <ClipboardCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-base">Referral Expectations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Set your communication preferences and define what you expect and commit to for referrals.</p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
      </div>

      {toast && (
        <p className={`text-xs font-semibold mb-3 ${toast.includes('Failed') ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {toast}
        </p>
      )}

      {/* Communication Preferences - always visible */}
      <div className="mt-4 mb-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Communication Preferences</h3>
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Preferred Update Method</label>
              <select
                value={updateMethod}
                onChange={(e) => setUpdateMethod(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
              >
                <option value="email">Email</option>
                <option value="text">Text Message</option>
                <option value="phone">Phone Call</option>
                <option value="in_app">In-App Notification</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Response Time Commitment</label>
              <select
                value={responseTime}
                onChange={(e) => setResponseTime(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
              >
                <option value="same_day">Same Day</option>
                <option value="24hrs">Within 24 Hours</option>
                <option value="48hrs">Within 48 Hours</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Updates via: {METHOD_LABELS[updateMethod] || updateMethod}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Response: {TIME_LABELS[responseTime] || responseTime}
            </span>
          </div>
        )}
      </div>

      {/* Expectations selectors - always visible (expanded by default) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">When I Refer Out (What I Expect)</h3>
          {profile && (
            <ExpectationsSelector agentId={profile.id} side="send" autoSave />
          )}
        </div>
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">When I Receive a Referral (What I Commit To)</h3>
          {profile && (
            <ExpectationsSelector agentId={profile.id} side="receive" autoSave />
          )}
        </div>
      </div>

      {/* Save/Cancel buttons when editing communication preferences */}
      {editing && (
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-border">
          <button
            onClick={() => {
              setUpdateMethod(profile?.referral_update_method || 'email')
              setResponseTime(profile?.referral_response_time || '24hrs')
              setEditing(false)
            }}
            className="h-8 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors"
          >
            Done
          </button>
          <button
            onClick={handleSavePrefs}
            disabled={saving || !isAuthenticated}
            className="h-8 px-4 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}
    </div>
  )
}
