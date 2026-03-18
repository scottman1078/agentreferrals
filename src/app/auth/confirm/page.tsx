'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createHubClient } from '@/lib/supabase/hub'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('No confirmation token found.')
      return
    }

    const verify = async () => {
      try {
        // Verify the token (reuses magic link verify endpoint)
        const res = await fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()

        if (!data.valid) {
          setStatus('error')
          setErrorMsg(data.error || 'This confirmation link is expired or invalid.')
          return
        }

        // Sign in with temp password
        const hub = createHubClient()
        const { error: signInError } = await hub.auth.signInWithPassword({
          email: data.email,
          password: data.tempKey,
        })

        if (signInError) {
          setStatus('error')
          setErrorMsg('Failed to sign in. Please try again.')
          return
        }

        // Rotate temp password
        fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'cleanup', userId: data.userId }),
        }).catch(() => {})

        setStatus('success')

        // Redirect to dashboard/onboarding after a moment
        setTimeout(() => {
          window.location.href = '/auth/callback'
        }, 1500)
      } catch {
        setStatus('error')
        setErrorMsg('Something went wrong. Please try again.')
      }
    }

    verify()
  }, [searchParams])

  return (
    <div className="flex items-center justify-center h-screen bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-8 text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <h2 className="font-bold text-lg mb-2">Confirming your email...</h2>
            <p className="text-sm text-muted-foreground">Just a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
            <h2 className="font-bold text-lg mb-2">Email Confirmed!</h2>
            <p className="text-sm text-muted-foreground">Redirecting you now...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h2 className="font-bold text-lg mb-2">Confirmation Failed</h2>
            <p className="text-sm text-muted-foreground mb-4">{errorMsg}</p>
            <a
              href="/"
              className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Back to Home
            </a>
          </>
        )}
      </div>
    </div>
  )
}
