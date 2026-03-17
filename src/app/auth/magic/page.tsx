'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function MagicLinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setErrorMessage('No token provided')
      return
    }

    async function verifyToken() {
      try {
        const res = await fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()

        if (data.valid && data.actionLink) {
          // Redirect to Supabase's action link which sets up the session
          // then redirects to /auth/callback
          window.location.href = data.actionLink
        } else {
          setStatus('error')
          setErrorMessage(data.error || 'Link expired or invalid')
        }
      } catch {
        setStatus('error')
        setErrorMessage('Something went wrong. Please try again.')
      }
    }

    verifyToken()
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
          <p className="text-sm text-muted-foreground mb-6">
            {errorMessage}
          </p>
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

  // Verifying state (loading)
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <div className="w-10 h-10 rounded-lg bg-primary mx-auto mb-4 animate-pulse" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  )
}
