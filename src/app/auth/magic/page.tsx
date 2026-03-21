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

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setErrorMessage('No token provided')
      return
    }

    async function verifyAndSignIn() {
      try {
        // 1. Verify token — server sets temp password and returns it
        const res = await fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()

        if (!data.valid || !data.tempKey) {
          setStatus('error')
          setErrorMessage(data.error || 'Link expired or invalid')
          return
        }

        setStatus('signing-in')

        // 2. Sign in directly on the client Hub with the temp password
        const hub = createHubClient()
        const { data: signInData, error: signInError } = await hub.auth.signInWithPassword({
          email: data.email,
          password: data.tempKey,
        })

        if (signInError || !signInData?.session) {
          setStatus('error')
          setErrorMessage(signInError?.message || 'Failed to sign in')
          return
        }

        // 3. Session established — check if user needs onboarding
        setStatus('success')
        const product = createClient()
        try {
          const { data: arProfile } = await product
            .from('ar_profiles')
            .select('id, primary_area')
            .eq('id', signInData.session.user.id)
            .single()

          if (arProfile && arProfile.primary_area) {
            window.location.href = '/dashboard'
          } else {
            window.location.href = '/dashboard/setup'
          }
        } catch {
          window.location.href = '/dashboard/setup'
        }
      } catch {
        setStatus('error')
        setErrorMessage('Something went wrong. Please try again.')
      }
    }

    verifyAndSignIn()
  }, [searchParams, router])

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="font-bold text-lg mb-2 text-foreground">Link expired or invalid</h2>
          <p className="text-sm text-muted-foreground mb-6">{errorMessage}</p>
          <button
            onClick={() => router.push('/')}
            className="h-10 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Request a new link
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <><img src="/favicon.png" alt="AgentReferrals" width={40} height={40} className="shrink-0 animate-pulse mx-auto mb-4 dark:hidden" /><img src="/favicon-dark.png" alt="AgentReferrals" width={40} height={40} className="shrink-0 animate-pulse mx-auto mb-4 hidden dark:block" /></>
        <p className="text-sm text-muted-foreground">
          {status === 'verifying' ? 'Verifying your link...' : status === 'success' ? 'Success! Redirecting...' : 'Signing you in...'}
        </p>
      </div>
    </div>
  )
}
