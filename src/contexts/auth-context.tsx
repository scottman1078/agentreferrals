'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { createHubClient } from '@/lib/supabase/hub'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export interface ArBrokerage {
  id: string
  name: string
  logo: string | null
  color: string | null
  member_count: number | null
  markets_served: number | null
  description: string | null
}

export interface ArProfile {
  // From hub profiles table
  id: string
  email: string
  full_name: string
  phone: string | null
  avatar_url: string | null

  // From product ar_profiles table
  brokerage_id: string | null
  primary_area: string | null
  bio: string | null
  tags: string[] | null
  deals_per_year: number | null
  years_licensed: number | null
  avg_sale_price: number | null
  refernet_score: number | null
  response_time_minutes: number | null
  closed_referrals: number | null
  referral_code: string | null
  status: string | null
  subscription_tier: string | null
  polygon: unknown | null
  territory_zips: string[] | null
  color: string | null
  license_number: string | null
  license_state: string | null
  license_verified: boolean
  license_verified_at: string | null
  license_expiration: string | null
  license_type: string | null
  created_at: string
  updated_at: string

  // Joined brokerage (from product DB)
  brokerage?: ArBrokerage | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: ArProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ArProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  const hub = createHubClient()
  const product = createClient()

  const fetchProfile = useCallback(
    async (userId: string, userEmail?: string, userMeta?: Record<string, unknown>) => {
      // 1. Fetch hub profile (shared identity: name, email, avatar)
      let hubProfile: { id: string; email: string; full_name: string; phone: string | null; avatar_url: string | null } | null = null
      try {
        const { data: hubData } = await hub
          .from('profiles')
          .select('id, email, full_name, phone, avatar_url')
          .eq('id', userId)
          .single()
        hubProfile = hubData
      } catch {
        // Hub profile may not exist yet for brand-new users
      }

      // 2. Fetch product ar_profiles (AR-specific agent data)
      const { data: arData, error: arError } = await product
        .from('ar_profiles')
        .select(
          `
          *,
          brokerage:ar_brokerages(*)
        `
        )
        .eq('id', userId)
        .single()

      if (arError || !arData) {
        // No ar_profiles row — user needs onboarding
        setNeedsOnboarding(true)

        // Build a minimal profile from hub data so the app has something
        if (hubProfile) {
          setProfile({
            id: hubProfile.id,
            email: hubProfile.email || userEmail || '',
            full_name: hubProfile.full_name || (userMeta?.full_name as string) || '',
            phone: hubProfile.phone,
            avatar_url: hubProfile.avatar_url,
            brokerage_id: null,
            primary_area: null,
            bio: null,
            tags: null,
            deals_per_year: null,
            years_licensed: null,
            avg_sale_price: null,
            refernet_score: null,
            response_time_minutes: null,
            closed_referrals: null,
            referral_code: null,
            status: null,
            subscription_tier: null,
            polygon: null,
            territory_zips: null,
            color: null,
            license_number: null,
            license_state: null,
            license_verified: false,
            license_verified_at: null,
            license_expiration: null,
            license_type: null,
            created_at: '',
            updated_at: '',
            brokerage: null,
          })
        } else {
          setProfile(null)
        }
        return
      }

      setNeedsOnboarding(false)

      // 3. Merge hub profile fields onto ar_profiles data
      const merged: ArProfile = {
        ...(arData as ArProfile),
        // Hub fields take priority for shared identity
        email: hubProfile?.email || arData.email || userEmail || '',
        full_name: hubProfile?.full_name || arData.full_name || (userMeta?.full_name as string) || '',
        phone: hubProfile?.phone ?? arData.phone ?? null,
        avatar_url: hubProfile?.avatar_url ?? arData.avatar_url ?? null,
      }

      setProfile(merged)
    },
    [hub, product]
  )

  // Listen for auth state changes on the HUB client
  useEffect(() => {
    // Get initial session from hub
    hub.auth.getSession().then(({ data: { session: s } }: { data: { session: Session | null } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id, s.user.email ?? undefined, s.user.user_metadata).finally(() =>
          setIsLoading(false)
        )
      } else {
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = hub.auth.onAuthStateChange((_event: string, s: Session | null) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id, s.user.email ?? undefined, s.user.user_metadata)
      } else {
        setProfile(null)
        setNeedsOnboarding(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [hub, fetchProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await hub.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { error: error.message }
      return { error: null }
    },
    [hub]
  )

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { error } = await hub.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) return { error: error.message }
      return { error: null }
    },
    [hub]
  )

  const signInWithGoogle = useCallback(async () => {
    const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    const redirectTo = isDev
      ? 'http://localhost:5500/auth/callback'
      : 'https://agentreferrals.ai/auth/callback'

    const { error } = await hub.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) return { error: error.message }
    return { error: null }
  }, [hub])

  const signOut = useCallback(async () => {
    await hub.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setNeedsOnboarding(false)
  }, [hub])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id, user.email ?? undefined, user.user_metadata)
  }, [user, fetchProfile])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated: !!session,
        needsOnboarding,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
