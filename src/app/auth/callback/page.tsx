'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createHubClient } from '@/lib/supabase/hub'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Signing you in...')

  useEffect(() => {
    const hub = createHubClient()
    const product = createClient()

    const handleAuth = async () => {
      // 1. Try to exchange the code from the URL (email confirmation / PKCE flow)
      const code = searchParams.get('code')
      if (code) {
        setStatus('Confirming your email...')
        try {
          await hub.auth.exchangeCodeForSession(code)
        } catch (err) {
          console.error('[AuthCallback] Code exchange failed:', err)
        }
      }

      // 2. Resolve the session with extended retries
      setStatus('Setting up your session...')
      let session: Session | null = null
      for (let attempt = 0; attempt < 8; attempt++) {
        const { data } = await hub.auth.getSession() as { data: { session: Session | null } }
        if (data.session) {
          session = data.session
          break
        }
        await new Promise((r) => setTimeout(r, 600))
      }

      if (!session) {
        // Last resort: check if the URL hash has tokens (implicit flow)
        const hash = window.location.hash
        if (hash && hash.includes('access_token')) {
          // Let Supabase handle the hash
          await new Promise((r) => setTimeout(r, 1500))
          const { data } = await hub.auth.getSession() as { data: { session: Session | null } }
          session = data.session
        }
      }

      if (!session) {
        console.error('[AuthCallback] Could not establish session after all attempts')
        setStatus('Could not sign in. Redirecting...')
        await new Promise((r) => setTimeout(r, 1000))
        router.push('/')
        return
      }

      // 3. Check if user has completed onboarding
      setStatus('Almost there...')
      try {
        const { data: arProfile } = await product
          .from('ar_profiles')
          .select('id, primary_area')
          .eq('id', session.user.id)
          .single()

        if (arProfile && arProfile.primary_area) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding')
        }
      } catch {
        // No profile — needs onboarding
        router.push('/onboarding')
      }
    }

    handleAuth()
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <div className="w-10 h-10 rounded-lg bg-primary mx-auto mb-4 animate-pulse" />
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
    </div>
  )
}
