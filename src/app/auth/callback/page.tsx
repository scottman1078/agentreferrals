'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createHubClient } from '@/lib/supabase/hub'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const hub = createHubClient()
    const product = createClient()

    // Wait briefly for Supabase to exchange URL hash tokens into a session
    const resolveSession = async (retries = 3): Promise<Session | null> => {
      const { data: { session } } = await hub.auth.getSession() as { data: { session: Session | null } }
      if (session) return session
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 500))
        return resolveSession(retries - 1)
      }
      return null
    }

    resolveSession().then(async (session) => {
      if (!session) {
        router.push('/')
        return
      }

      // Check if user has an ar_profiles row in the product DB
      const { data: arProfile } = await product
        .from('ar_profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (arProfile) {
        // Existing user — go to dashboard
        router.push('/dashboard')
      } else {
        // New user — needs onboarding to create ar_profiles row
        router.push('/onboarding')
      }
    })
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <div className="w-10 h-10 rounded-lg bg-primary mx-auto mb-4 animate-pulse" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  )
}
