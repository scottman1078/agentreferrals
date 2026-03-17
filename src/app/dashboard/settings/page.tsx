'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CreditCard, ArrowRight, Loader2, Check, LogOut, User, Bell, FileText, MapPin, Settings as SettingsIcon, Camera } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LocationAutocomplete } from '@/components/ui/location-autocomplete'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import TerritorySelector, { type TerritoryData } from '@/components/onboarding/territory-selector'

type Tab = 'profile' | 'territory' | 'billing' | 'referrals' | 'notifications'

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'territory', label: 'Territory', icon: MapPin },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'referrals', label: 'Referral Defaults', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

export default function SettingsPage() {
  const { profile, isAuthenticated, refreshProfile, signOut } = useAuth()
  const { tier, plan } = useFeatureGate()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  // Form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [brokerageName, setBrokerageName] = useState('')

  const [territory, setTerritory] = useState<TerritoryData>({
    mode: 'zip',
    selectedCounties: [],
    selectedZips: [],
    drawnPolygon: [],
    polygon: [],
  })
  const [savingTerritory, setSavingTerritory] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveToast, setSaveToast] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [notifications, setNotifications] = useState({
    agreementSigned: true,
    clientIntroduced: true,
    referralCloses: true,
    feeReceived: false,
  })
  const toggleNotif = (key: keyof typeof notifications) =>
    setNotifications((p) => ({ ...p, [key]: !p[key] }))

  // Pre-fill form from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setEmail(profile.email || '')
      setPhone(profile.phone || '')
      setServiceArea(profile.primary_area || '')
      setBrokerageName(profile.brokerage?.name || '')
      setAvatarUrl(profile.avatar_url || null)
      // Load existing territory polygon and zips
      if (profile.polygon && Array.isArray(profile.polygon) && profile.polygon.length > 0) {
        setTerritory((prev) => ({
          ...prev,
          polygon: profile.polygon as [number, number][][],
          selectedZips: (profile.territory_zips as string[]) || [],
        }))
      } else if (profile.territory_zips && Array.isArray(profile.territory_zips)) {
        setTerritory((prev) => ({
          ...prev,
          selectedZips: profile.territory_zips as string[],
        }))
      }
    } else if (!isAuthenticated) {
      setFullName("Jason O'Brien")
      setEmail('jason@jobrienhomes.com')
      setPhone('(269) 555-0147')
      setServiceArea('Plainwell / Allegan County, MI')
      setBrokerageName('PREMIERE Group at Real Broker LLC')
    }
  }, [profile, isAuthenticated])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingAvatar(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `avatars/${profile.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('ar-assets')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        // Storage bucket might not exist — upload to a mock URL instead
        console.error('[Avatar] Upload error:', uploadError.message)
        // Fallback: use a data URL
        const reader = new FileReader()
        reader.onload = async () => {
          const dataUrl = reader.result as string
          await supabase
            .from('ar_profiles')
            .update({ avatar_url: dataUrl })
            .eq('id', profile.id)
          setAvatarUrl(dataUrl)
          await refreshProfile()
          setSaveToast('Photo updated')
          setTimeout(() => setSaveToast(''), 3000)
        }
        reader.readAsDataURL(file)
        setUploadingAvatar(false)
        return
      }

      const { data: urlData } = supabase.storage.from('ar-assets').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      await supabase
        .from('ar_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      setAvatarUrl(publicUrl)
      await refreshProfile()
      setSaveToast('Photo updated')
      setTimeout(() => setSaveToast(''), 3000)
    } catch (err) {
      console.error('[Avatar] Error:', err)
      setSaveToast('Failed to upload photo')
      setTimeout(() => setSaveToast(''), 3000)
    }
    setUploadingAvatar(false)
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setSaveToast('')

    const supabase = createClient()

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

    await refreshProfile()
    setSaveToast('Settings saved successfully')
    setTimeout(() => setSaveToast(''), 3000)
  }

  return (
    <div className="overflow-y-auto h-full p-4 sm:p-6">
      <div className="max-w-[960px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-xl">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 mb-6">
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ═══ Profile Tab ═══ */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="font-bold text-sm mb-5 pb-3 border-b border-border">
                Your Profile
              </div>

              {/* Avatar upload */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {fullName ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AG'}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">{fullName || 'Your Name'}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-primary font-medium hover:underline mt-1"
                  >
                    {avatarUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                </div>
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
                <div className="text-right pt-2">
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

            {/* Logout */}
            <button
              onClick={async () => {
                await signOut()
                window.location.href = '/'
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}

        {/* ═══ Territory Tab ═══ */}
        {activeTab === 'territory' && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="font-bold text-sm mb-2 pb-3 border-b border-border">
                Your Territory
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Define your service area by zip code, county, or by drawing a boundary on the map.
              </p>
              <TerritorySelector
                value={territory}
                onChange={setTerritory}
                initialCenter={serviceArea}
              />
              <div className="text-right pt-4">
                <button
                  onClick={async () => {
                    if (!profile) return
                    setSavingTerritory(true)
                    const supabase = createClient()
                    const { error } = await supabase
                      .from('ar_profiles')
                      .update({
                        polygon: territory.polygon,
                        territory_zips: territory.selectedZips.length > 0 ? territory.selectedZips : null,
                      })
                      .eq('id', profile.id)
                    setSavingTerritory(false)
                    if (error) {
                      setSaveToast('Failed to save territory.')
                    } else {
                      await refreshProfile()
                      setSaveToast('Territory saved successfully')
                    }
                    setTimeout(() => setSaveToast(''), 3000)
                  }}
                  disabled={savingTerritory || !isAuthenticated || territory.polygon.length === 0}
                  className="h-9 px-5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {savingTerritory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {savingTerritory ? 'Saving...' : 'Save Territory'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Billing Tab ═══ */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            {/* Current plan summary */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-sm capitalize">{plan.name} Plan</div>
                    <div className="text-xs text-muted-foreground">
                      {tier === 'starter' ? 'Free forever' : plan.priceLabel}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  Current
                </span>
              </div>
            </div>

            <Link
              href="/dashboard/billing"
              className="flex items-center justify-between p-5 rounded-xl border border-border bg-card group hover:border-primary/30 transition-colors"
            >
              <div>
                <div className="font-bold text-sm">Manage Subscription</div>
                <div className="text-xs text-muted-foreground">
                  Change plan, payment method, and view invoices
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        )}

        {/* ═══ Referral Defaults Tab ═══ */}
        {activeTab === 'referrals' && (
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="font-bold text-sm mb-5 pb-3 border-b border-border">
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
                className="flex items-center justify-between py-4 border-b border-border last:border-0"
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
        )}

        {/* ═══ Notifications Tab ═══ */}
        {activeTab === 'notifications' && (
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="font-bold text-sm mb-5 pb-3 border-b border-border">
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
                className="flex items-center justify-between py-4 border-b border-border last:border-0"
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
        )}
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
