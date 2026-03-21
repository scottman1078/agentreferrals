'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createHubClient } from '@/lib/supabase/hub'
import { createClient } from '@/lib/supabase/client'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { UserPlus, LogIn } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Signing you in...')
  const [showNoAccount, setShowNoAccount] = useState(false)
  const [userName, setUserName] = useState('')

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
                try {
                  await hub.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  })
                } catch {
                  // SSR client may not support this
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
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname)
      }

      // Get user's name for the interstitial
      const name = (session.user.user_metadata?.full_name as string)
        || session.user.email?.split('@')[0]
        || ''
      setUserName(name)

      try {
        const { data: arProfile } = await product
          .from('ar_profiles')
          .select('id, primary_area')
          .eq('id', session.user.id)
          .single()

        if (arProfile && arProfile.primary_area) {
          // Existing AR user — go to dashboard
          window.location.href = '/dashboard'
        } else {
          // No AR profile — show interstitial instead of silent redirect
          setShowNoAccount(true)
        }
      } catch {
        setShowNoAccount(true)
      }
    }

    handleAuth()
  }, [router, searchParams])

  // Interstitial: no AgentReferrals account found
  if (showNoAccount) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}!
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            You don&apos;t have an AgentReferrals account yet. Would you like to create one? It only takes a few minutes.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { window.location.href = '/dashboard/setup' }}
              className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <UserPlus className="w-4 h-4" />
              Create My Account
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Back to Home
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-4">
            If you already have an account, you may have signed up with a different email address.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <><img src="/favicon.png" alt="AgentReferrals" width={40} height={40} className="shrink-0 animate-pulse mx-auto mb-4 dark:hidden" /><img src="/favicon-dark.png" alt="AgentReferrals" width={40} height={40} className="shrink-0 animate-pulse mx-auto mb-4 hidden dark:block" /></>
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
    </div>
  )
}
