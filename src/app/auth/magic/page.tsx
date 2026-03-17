'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createHubClient } from '@/lib/supabase/hub'
import { createClient } from '@/lib/supabase/client'

export default function MagicLinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'signing-in' | 'error' | 'success'>('verifying')
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

    async function verifyAndSignIn() {
      try {
        // 1. Verify our custom token
        log('Step 1: Calling /api/auth/magic-link/verify...')
        const res = await fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()
        log(`Step 1 response: ${JSON.stringify({ valid: data.valid, email: data.email, hasToken: !!data.hashedToken, hasLink: !!data.actionLink, error: data.error })}`)

        if (!data.valid) {
          setStatus('error')
          setErrorMessage(data.error || 'Link expired or invalid')
          return
        }

        setStatus('signing-in')

        // 2. Try verifyOtp with the hashed token
        log('Step 2: Calling hub.auth.verifyOtp...')
        const hub = createHubClient()

        if (!hub) {
          log('ERROR: Hub client is null')
          setStatus('error')
          setErrorMessage('Hub client not available')
          return
        }

        const { data: sessionData, error: otpError } = await hub.auth.verifyOtp({
          email: data.email,
          token: data.hashedToken,
          type: 'magiclink',
        })

        log(`Step 2 result: session=${!!sessionData?.session}, user=${sessionData?.user?.id?.slice(0, 8) || 'none'}, error=${otpError?.message || 'none'}`)

        if (otpError || !sessionData?.session) {
          log(`Step 2 failed. Trying fallback with action link...`)

          if (data.actionLink) {
            log(`Step 3 fallback: Redirecting to action link: ${data.actionLink.slice(0, 80)}...`)
            window.location.href = data.actionLink
            return
          }

          setStatus('error')
          setErrorMessage(`verifyOtp failed: ${otpError?.message || 'No session returned'}`)
          return
        }

        // 3. Session established!
        log(`Step 3: Session established! User: ${sessionData.session.user.id}`)
        setStatus('success')

        // 4. Check if user needs onboarding
        log('Step 4: Checking ar_profiles...')
        const product = createClient()
        try {
          const { data: arProfile, error: profileError } = await product
            .from('ar_profiles')
            .select('id, primary_area')
            .eq('id', sessionData.session.user.id)
            .single()

          log(`Step 4 result: profile=${!!arProfile}, primary_area=${arProfile?.primary_area || 'null'}, error=${profileError?.message || 'none'}`)

          if (arProfile && arProfile.primary_area) {
            log('Redirecting to /dashboard')
            router.push('/dashboard')
          } else {
            log('Redirecting to /onboarding')
            router.push('/onboarding')
          }
        } catch (err) {
          log(`Step 4 exception: ${err}. Redirecting to /onboarding`)
          router.push('/onboarding')
        }
      } catch (err) {
        log(`Fatal error: ${err}`)
        setStatus('error')
        setErrorMessage(`Unexpected error: ${err}`)
      }
    }

    verifyAndSignIn()
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
            className="h-10 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity mb-6"
          >
            Request a new link
          </button>

          {/* Debug logs */}
          <div className="mt-4 p-3 rounded-lg bg-card border border-border text-left max-h-60 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Debug Log</p>
            {debugLogs.map((log, i) => (
              <p key={i} className="text-[11px] text-muted-foreground font-mono leading-relaxed">{log}</p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center max-w-lg mx-auto px-4">
        <div className="w-10 h-10 rounded-lg bg-primary mx-auto mb-4 animate-pulse" />
        <p className="text-sm text-muted-foreground mb-4">
          {status === 'verifying' ? 'Verifying your link...' : status === 'success' ? 'Success! Redirecting...' : 'Signing you in...'}
        </p>

        {/* Debug logs — always visible for now */}
        {debugLogs.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-card border border-border text-left max-h-60 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Debug Log</p>
            {debugLogs.map((log, i) => (
              <p key={i} className="text-[11px] text-muted-foreground font-mono leading-relaxed">{log}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
