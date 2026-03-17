'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createHubClient } from '@/lib/supabase/hub'
import { createClient } from '@/lib/supabase/client'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Signing you in...')

  useEffect(() => {
    const hub = createHubClient()
    const product = createClient()

    const handleAuth = async () => {
      let session: Session | null = null

      // 1. Try to exchange the code from the URL (email confirmation / PKCE flow)
      const code = searchParams.get('code')
      if (code) {
        setStatus('Confirming your email...')
        try {
          const { data } = await hub.auth.exchangeCodeForSession(code)
          if (data?.session) session = data.session as Session
        } catch (err) {
          console.error('[AuthCallback] Code exchange failed:', err)
        }
      }

      // 2. Check if URL hash has tokens (magic link / implicit flow)
      if (!session) {
        const hash = window.location.hash
        if (hash && hash.includes('access_token')) {
          setStatus('Setting up your session...')
          const params = new URLSearchParams(hash.substring(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          if (accessToken && refreshToken) {
            // Use a regular Supabase client (not SSR) to set the session
            // because createBrowserClient from @supabase/ssr doesn't support setSession from hash
            const hubUrl = process.env.NEXT_PUBLIC_HUB_URL
            const hubAnonKey = process.env.NEXT_PUBLIC_HUB_ANON_KEY
            if (hubUrl && hubAnonKey) {
              const regularClient = createSupabaseClient(hubUrl, hubAnonKey)
              const { data: sessionData, error } = await regularClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })
              if (!error && sessionData?.session) {
                session = sessionData.session
                // Also set it on the SSR hub client so it persists
                try {
                  await hub.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  })
                } catch {
                  // SSR client may not support this — session is set on regular client
                }
              } else {
                console.error('[AuthCallback] setSession failed:', error?.message)
              }
            }
          }
        }
      }

      // 3. Try getSession with retries (for Google OAuth and normal sign-in flows)
      if (!session) {
        setStatus('Setting up your session...')
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data } = await hub.auth.getSession() as { data: { session: Session | null } }
          if (data.session) {
            session = data.session
            break
          }
          await new Promise((r) => setTimeout(r, 600))
        }
      }

      if (!session) {
        console.error('[AuthCallback] Could not establish session after all attempts')
        setStatus('Could not sign in. Redirecting...')
        await new Promise((r) => setTimeout(r, 1000))
        router.push('/')
        return
      }

      // 4. Session established — check if user needs onboarding
      setStatus('Almost there...')
      // Clear the hash from the URL for cleanliness
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname)
      }

      try {
        const { data: arProfile } = await product
          .from('ar_profiles')
          .select('id, primary_area')
          .eq('id', session.user.id)
          .single()

        if (arProfile && arProfile.primary_area) {
          window.location.href = '/dashboard'
        } else {
          window.location.href = '/onboarding'
        }
      } catch {
        window.location.href = '/onboarding'
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
