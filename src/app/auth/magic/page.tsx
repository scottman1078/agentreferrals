'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function MagicLinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  const log = (msg: string) => {
    console.log(`[MagicLink] ${msg}`)
    setDebugLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`])
  }

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setErrorMessage('No token provided in URL')
      return
    }

    log(`Token found: ${token.slice(0, 8)}...`)

    async function verifyAndRedirect() {
      try {
        // 1. Verify our custom token and get session tokens from server
        log('Step 1: Verifying token...')
        const res = await fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()
        log(`Step 1: valid=${data.valid}, hasAccessToken=${!!data.access_token}, error=${data.error || 'none'}`)

        if (!data.valid || !data.access_token) {
          setStatus('error')
          setErrorMessage(data.error || 'Link expired or invalid')
          return
        }

        // 2. Redirect to auth/callback with tokens in the URL hash
        // This mimics Supabase's implicit auth flow — the callback page
        // and the Hub client will pick up the tokens from the hash
        log('Step 2: Redirecting to callback with session tokens...')

        const hashParams = new URLSearchParams({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: String(data.expires_in || 3600),
          token_type: 'bearer',
          type: 'magiclink',
        })

        window.location.href = `/auth/callback#${hashParams.toString()}`
      } catch (err) {
        log(`Fatal error: ${err}`)
        setStatus('error')
        setErrorMessage(`Unexpected error: ${err}`)
      }
    }

    verifyAndRedirect()
  }, [searchParams, router])

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="font-bold text-lg mb-2 text-foreground">Sign-in failed</h2>
          <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
          <button
            onClick={() => router.push('/')}
            className="h-10 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Request a new link
          </button>

          {debugLogs.length > 0 && (
            <div className="mt-6 p-3 rounded-lg bg-card border border-border text-left max-h-60 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Debug Log</p>
              {debugLogs.map((l, i) => (
                <p key={i} className="text-[11px] text-muted-foreground font-mono leading-relaxed">{l}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <div className="w-10 h-10 rounded-lg bg-primary mx-auto mb-4 animate-pulse" />
        <p className="text-sm text-muted-foreground">Verifying your link...</p>
      </div>
    </div>
  )
}
