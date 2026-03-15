'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CreditCard, ArrowRight, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { LocationAutocomplete } from '@/components/ui/location-autocomplete'

export default function SettingsPage() {
  const { profile, isAuthenticated, refreshProfile } = useAuth()

  // Form state — controlled inputs
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [brokerageName, setBrokerageName] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveToast, setSaveToast] = useState('')

  const [notifications, setNotifications] = useState({
    agreementSigned: true,
    clientIntroduced: true,
    referralCloses: true,
    feeReceived: false,
  })
  const toggleNotif = (key: keyof typeof notifications) =>
    setNotifications((p) => ({ ...p, [key]: !p[key] }))

  // Pre-fill form from profile when it loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setEmail(profile.email || '')
      setPhone(profile.phone || '')
      setServiceArea(profile.primary_area || '')
      setBrokerageName(profile.brokerage?.name || '')
    } else if (!isAuthenticated) {
      // Demo defaults
      setFullName("Jason O'Brien")
      setEmail('jason@jobrienhomes.com')
      setPhone('(269) 555-0147')
      setServiceArea('Plainwell / Allegan County, MI')
      setBrokerageName('PREMIERE Group at Real Broker LLC')
    }
  }, [profile, isAuthenticated])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setSaveToast('')

    const supabase = createClient()

    // Parse comma-separated service area into array
    const marketsArray = serviceArea
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean)

    const { error } = await supabase
      .from('ar_profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        primary_area: serviceArea.trim() || null,
      })
      .eq('id', profile.id)

    setSaving(false)

    if (error) {
      setSaveToast('Failed to save. Please try again.')
      setTimeout(() => setSaveToast(''), 4000)
      return
    }

    // Refresh the profile in auth context so the rest of the app sees updated data
    await refreshProfile()
    setSaveToast('Settings saved successfully')
    setTimeout(() => setSaveToast(''), 3000)
  }

  return (
    <div className="overflow-y-auto h-full p-4 sm:p-6">
      <div className="max-w-[700px]">
        <h1 className="font-bold text-xl mb-6">Settings</h1>

        <div className="p-4 sm:p-6 rounded-xl border border-border bg-card mb-4">
          <div className="font-bold text-base mb-5 pb-3 border-b border-border">
            Your Profile
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Full Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Brokerage
              </label>
              <input
                value={brokerageName}
                readOnly
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Email
                </label>
                <input
                  value={email}
                  readOnly
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Service Area
              </label>
              <LocationAutocomplete
                value={serviceArea}
                onChange={setServiceArea}
                placeholder="City, State"
              />
            </div>
            <div className="text-right">
              <button
                onClick={handleSave}
                disabled={saving || !isAuthenticated}
                className="h-9 px-5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/billing"
          className="block p-4 sm:p-6 rounded-xl border border-border bg-card mb-4 group hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-base">Subscription & Billing</div>
                <div className="text-xs text-muted-foreground">
                  Manage your plan, payment method, and invoices
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Link>

        <div className="p-4 sm:p-6 rounded-xl border border-border bg-card mb-4">
          <div className="font-bold text-base mb-5 pb-3 border-b border-border">
            Referral Defaults
          </div>
          {[
            {
              label: 'Default Referral Fee %',
              sub: 'Applied when creating new agreements',
              defaultVal: '25%',
              w: 'w-20',
            },
            {
              label: 'Agreement Expiration',
              sub: 'Days before agreement expires',
              defaultVal: '180 days',
              w: 'w-24',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-[11px] text-muted-foreground">{item.sub}</div>
              </div>
              <input
                defaultValue={item.defaultVal}
                className={`${item.w} text-center h-9 px-3 rounded-lg border border-input bg-background text-sm`}
              />
            </div>
          ))}
        </div>

        <div className="p-4 sm:p-6 rounded-xl border border-border bg-card">
          <div className="font-bold text-base mb-5 pb-3 border-b border-border">
            Notifications
          </div>
          {(
            [
              {
                key: 'agreementSigned' as const,
                label: 'Referral agreement signed',
                sub: 'Email when a partner signs',
              },
              {
                key: 'clientIntroduced' as const,
                label: 'Client introduced',
                sub: 'Notify when partner introduces client',
              },
              {
                key: 'referralCloses' as const,
                label: 'Referral closes',
                sub: 'Alert when a referral reaches closing',
              },
              {
                key: 'feeReceived' as const,
                label: 'Fee received',
                sub: 'Confirm when referral fee arrives',
              },
            ] as const
          ).map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-[11px] text-muted-foreground">{item.sub}</div>
              </div>
              <button
                onClick={() => toggleNotif(item.key)}
                className={`w-10 h-[22px] rounded-full relative transition-colors ${
                  notifications[item.key]
                    ? 'bg-primary'
                    : 'bg-secondary border border-border'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white absolute top-[2px] transition-transform"
                  style={{
                    left: '2px',
                    transform: notifications[item.key]
                      ? 'translateX(18px)'
                      : 'translateX(0)',
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Toast */}
      {saveToast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-full text-white text-sm font-semibold shadow-lg flex items-center gap-2 ${
            saveToast.includes('Failed') ? 'bg-destructive' : 'bg-emerald-500'
          }`}
        >
          {!saveToast.includes('Failed') && <Check className="w-4 h-4" />}
          {saveToast}
        </div>
      )}
    </div>
  )
}
