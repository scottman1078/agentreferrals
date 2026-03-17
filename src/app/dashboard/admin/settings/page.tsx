'use client'

import { useState } from 'react'
import { Save, AlertTriangle } from 'lucide-react'

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
  const [invitesPerUser, setInvitesPerUser] = useState(3)
  const [invitesPerElite, setInvitesPerElite] = useState(5)
  const [waitlistMode, setWaitlistMode] = useState(true)
  const [inviteOnly, setInviteOnly] = useState(true)
  const [noraEnabled, setNoraEnabled] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [toast, setToast] = useState('')

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
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Invite Codes Per User</label>
            <input
              type="number"
              value={invitesPerUser}
              onChange={(e) => setInvitesPerUser(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Invite Codes Per Elite</label>
            <input
              type="number"
              value={invitesPerElite}
              onChange={(e) => setInvitesPerElite(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            />
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
