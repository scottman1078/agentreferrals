'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, ArrowRight } from 'lucide-react'
import { useAppData } from '@/lib/data-provider'

export default function SettingsPage() {
  const { profile, isAuthenticated } = useAppData()
  const [notifications, setNotifications] = useState({ agreementSigned: true, clientIntroduced: true, referralCloses: true, feeReceived: false })
  const toggleNotif = (key: keyof typeof notifications) => setNotifications((p) => ({ ...p, [key]: !p[key] }))

  // Use profile data if authenticated, otherwise demo defaults
  const fullName = profile?.full_name || "Jason O'Brien"
  const brokerageName = profile?.brokerage?.name || 'PREMIERE Group at Real Broker LLC'
  const email = profile?.email || 'jason@jobrienhomes.com'
  const phone = profile?.phone || '(269) 555-0147'
  const serviceArea = profile?.markets_served?.join(', ') || 'Plainwell / Allegan County, MI'

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="max-w-[700px]">
        <h1 className="font-bold text-xl mb-6">Settings</h1>

        <div className="p-6 rounded-xl border border-border bg-card mb-4">
          <div className="font-bold text-base mb-5 pb-3 border-b border-border">Your Profile</div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name</label>
              <input defaultValue={fullName} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Brokerage</label>
              <input defaultValue={brokerageName} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
                <input defaultValue={email} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Phone</label>
                <input defaultValue={phone} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Service Area</label>
              <input defaultValue={serviceArea} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div className="text-right">
              <button className="h-9 px-5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity">Save Changes</button>
            </div>
          </div>
        </div>

        <Link href="/dashboard/billing" className="block p-6 rounded-xl border border-border bg-card mb-4 group hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-base">Subscription & Billing</div>
                <div className="text-xs text-muted-foreground">Manage your plan, payment method, and invoices</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Link>

        <div className="p-6 rounded-xl border border-border bg-card mb-4">
          <div className="font-bold text-base mb-5 pb-3 border-b border-border">Referral Defaults</div>
          {[
            { label: 'Default Referral Fee %', sub: 'Applied when creating new agreements', defaultVal: '25%', w: 'w-20' },
            { label: 'Agreement Expiration', sub: 'Days before agreement expires', defaultVal: '180 days', w: 'w-24' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div><div className="text-sm font-medium">{item.label}</div><div className="text-[11px] text-muted-foreground">{item.sub}</div></div>
              <input defaultValue={item.defaultVal} className={`${item.w} text-center h-9 px-3 rounded-lg border border-input bg-background text-sm`} />
            </div>
          ))}
        </div>

        <div className="p-6 rounded-xl border border-border bg-card">
          <div className="font-bold text-base mb-5 pb-3 border-b border-border">Notifications</div>
          {([
            { key: 'agreementSigned' as const, label: 'Referral agreement signed', sub: 'Email when a partner signs' },
            { key: 'clientIntroduced' as const, label: 'Client introduced', sub: 'Notify when partner introduces client' },
            { key: 'referralCloses' as const, label: 'Referral closes', sub: 'Alert when a referral reaches closing' },
            { key: 'feeReceived' as const, label: 'Fee received', sub: 'Confirm when referral fee arrives' },
          ]).map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div><div className="text-sm font-medium">{item.label}</div><div className="text-[11px] text-muted-foreground">{item.sub}</div></div>
              <button
                onClick={() => toggleNotif(item.key)}
                className={`w-10 h-[22px] rounded-full relative transition-colors ${notifications[item.key] ? 'bg-primary' : 'bg-secondary border border-border'}`}
              >
                <div className="w-4 h-4 rounded-full bg-white absolute top-[2px] transition-transform" style={{ left: '2px', transform: notifications[item.key] ? 'translateX(18px)' : 'translateX(0)' }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
