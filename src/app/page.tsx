'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('jason@jobrienhomes.com')
  const [password, setPassword] = useState('••••••••••')

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    router.push('/dashboard')
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      {/* Grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(240,165,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240,165,0,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%)',
        }}
      />
      {/* Radial glows */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 60% 40%, rgba(240,165,0,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 50% 80% at 10% 90%, rgba(99,102,241,0.05) 0%, transparent 60%)
          `,
        }}
      />

      {/* Login card */}
      <form
        onSubmit={handleLogin}
        className="relative z-10 w-[420px] max-w-[calc(100vw-32px)]"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border2)',
          borderRadius: 'var(--r-lg)',
          padding: '48px 40px 40px',
          boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(240,165,0,0.08)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-[38px] h-[38px] rounded-[9px] flex items-center justify-center font-[family-name:var(--font-d)] font-extrabold text-lg"
            style={{ background: 'linear-gradient(135deg, var(--accent), #d4880a)', color: '#0f1117' }}
          >
            A
          </div>
          <div className="font-[family-name:var(--font-d)] font-extrabold text-2xl tracking-tight">
            Agent<span style={{ color: 'var(--accent)' }}>Referrals</span><span className="text-sm font-medium ml-0.5" style={{ color: 'var(--text-muted)' }}>.ai</span>
          </div>
        </div>
        <div className="text-[13px] mb-9" style={{ color: 'var(--text-dim)' }}>
          AI-powered referral network for real estate agents
        </div>

        {/* Fields */}
        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3.5 py-2.5 text-sm transition-colors"
          style={{
            background: 'var(--surf2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            color: 'var(--text)',
          }}
        />

        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3.5 py-2.5 text-sm transition-colors"
          style={{
            background: 'var(--surf2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            color: 'var(--text)',
          }}
        />

        <button
          type="submit"
          className="w-full py-3.5 mt-1 font-[family-name:var(--font-d)] font-bold text-[15px] transition-opacity hover:opacity-90 active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, var(--accent), #d4880a)',
            color: '#0f1117',
            borderRadius: 'var(--r-sm)',
          }}
        >
          Sign In to AgentReferrals.ai
        </button>

        <div className="text-center mt-5 text-xs" style={{ color: 'var(--text-muted)' }}>
          Demo credentials pre-filled — <span style={{ color: 'var(--accent)', fontWeight: 500 }}>click Sign In to explore</span>
        </div>

        {/* Powered by */}
        <div className="flex items-center justify-center gap-2 mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Powered by</span>
          <span className="font-[family-name:var(--font-d)] font-bold text-[12px]" style={{ color: 'var(--accent)' }}>✦ NORA AI</span>
        </div>
      </form>
    </div>
  )
}
