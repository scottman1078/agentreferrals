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
        // 1. Verify token — server sets a temp password and returns it
        log('Step 1: Verifying token...')
        const res = await fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()
        log(`Step 1: valid=${data.valid}, email=${data.email || 'none'}, hasTempKey=${!!data.tempKey}, error=${data.error || 'none'}`)

        if (!data.valid || !data.tempKey) {
          setStatus('error')
          setErrorMessage(data.error || 'Link expired or invalid')
          return
        }

        setStatus('signing-in')

        // 2. Sign in directly on the client Hub with the temp password
        log('Step 2: Signing in with Hub client...')
        const hub = createHubClient()

        const { data: signInData, error: signInError } = await hub.auth.signInWithPassword({
          email: data.email,
          password: data.tempKey,
        })

        log(`Step 2: session=${!!signInData?.session}, userId=${signInData?.user?.id?.slice(0, 8) || 'none'}, error=${signInError?.message || 'none'}`)

        // 3. Immediately tell server to rotate the temp password
        log('Step 3: Cleaning up temp credentials...')
        fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'cleanup', userId: data.userId }),
        }).catch(() => {}) // fire and forget

        if (signInError || !signInData?.session) {
          setStatus('error')
          setErrorMessage(`Sign-in failed: ${signInError?.message || 'No session created'}`)
          return
        }

        // 4. Session established!
        log(`Step 4: Session OK! User: ${signInData.session.user.id}`)
        setStatus('success')

        // 5. Check if user needs onboarding
        log('Step 5: Checking ar_profiles...')
        const product = createClient()
        try {
          const { data: arProfile, error: profileError } = await product
            .from('ar_profiles')
            .select('id, primary_area')
            .eq('id', signInData.session.user.id)
            .single()

          log(`Step 5: profile=${!!arProfile}, area=${arProfile?.primary_area || 'null'}, error=${profileError?.message || 'none'}`)

          if (arProfile && arProfile.primary_area) {
            log('Routing to /dashboard')
            window.location.href = '/dashboard'
          } else {
            log('Routing to /onboarding')
            window.location.href = '/onboarding'
          }
        } catch (err) {
          log(`Step 5 error: ${err}. Routing to /onboarding`)
          window.location.href = '/onboarding'
        }
      } catch (err) {
        log(`Fatal error: ${err}`)
        setStatus('error')
        setErrorMessage(`Unexpected error: ${err}`)
      }
    }

    verifyAndSignIn()
  }, [searchParams, router])

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center max-w-lg mx-auto px-4">
        {status === 'error' ? (
          <>
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
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-lg bg-primary mx-auto mb-4 animate-pulse" />
            <p className="text-sm text-muted-foreground">
              {status === 'verifying' ? 'Verifying your link...' : status === 'success' ? 'Success! Redirecting...' : 'Signing you in...'}
            </p>
          </>
        )}

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
