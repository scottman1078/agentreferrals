'use client'

import { useState } from 'react'

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    agreementSigned: true,
    clientIntroduced: true,
    referralCloses: true,
    feeReceived: false,
  })

  const toggleNotif = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="max-w-[700px]">
        <div className="font-[family-name:var(--font-d)] font-bold text-xl mb-6">Settings</div>

        {/* Profile */}
        <div className="p-6 rounded-lg mb-4" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
          <div className="font-[family-name:var(--font-d)] font-bold text-[15px] mb-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            Your Profile
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Full Name</label>
            <input defaultValue="Jason O'Brien" className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Brokerage</label>
            <input defaultValue="PREMIERE Group at Real Broker LLC" className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Email</label>
              <input defaultValue="jason@jobrienhomes.com" className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Phone</label>
              <input defaultValue="(269) 555-0147" className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Primary Service Area</label>
            <input defaultValue="Plainwell / Allegan County, MI" className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="text-right mt-2">
            <button className="px-4.5 py-2 rounded-md font-[family-name:var(--font-d)] font-bold text-[13px] transition-opacity hover:opacity-90" style={{ background: 'linear-gradient(135deg, var(--accent), #d4880a)', color: '#0f1117' }}>
              Save Changes
            </button>
          </div>
        </div>

        {/* Referral defaults */}
        <div className="p-6 rounded-lg mb-4" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
          <div className="font-[family-name:var(--font-d)] font-bold text-[15px] mb-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            Referral Defaults
          </div>
          <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="text-[13px] font-medium">Default Referral Fee %</div>
              <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Applied when creating new referral agreements</div>
            </div>
            <input defaultValue="25%" className="w-20 text-center px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="flex items-center justify-between py-2.5">
            <div>
              <div className="text-[13px] font-medium">Agreement Expiration</div>
              <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Days before agreement expires</div>
            </div>
            <input defaultValue="180 days" className="w-24 text-center px-3 py-2 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
        </div>

        {/* Notifications */}
        <div className="p-6 rounded-lg" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
          <div className="font-[family-name:var(--font-d)] font-bold text-[15px] mb-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            Notifications
          </div>
          {([
            { key: 'agreementSigned' as const, label: 'Referral agreement signed', sub: 'Email me when a partner signs an agreement' },
            { key: 'clientIntroduced' as const, label: 'Client introduced', sub: 'Notify when partner introduces client' },
            { key: 'referralCloses' as const, label: 'Referral closes', sub: 'Alert when a referral reaches closing' },
            { key: 'feeReceived' as const, label: 'Fee received', sub: 'Confirm when referral fee payment arrives' },
          ]).map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="text-[13px] font-medium">{item.label}</div>
                <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{item.sub}</div>
              </div>
              <button
                onClick={() => toggleNotif(item.key)}
                className="w-10 h-[22px] rounded-full relative transition-colors"
                style={{
                  background: notifications[item.key] ? 'var(--accent)' : 'var(--surf3)',
                  border: notifications[item.key] ? '1px solid var(--accent)' : '1px solid var(--border2)',
                }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white absolute top-[2px] transition-transform"
                  style={{ left: '2px', transform: notifications[item.key] ? 'translateX(18px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
