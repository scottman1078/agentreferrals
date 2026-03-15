'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export interface ArProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  brokerage_id: string | null
  primary_area: string | null
  bio: string | null
  avatar_url: string | null
  referral_code: string | null
  refernet_score: number | null
  response_time_minutes: number | null
  closed_referrals: number | null
  deals_per_year: number | null
  years_licensed: number | null
  avg_sale_price: number | null
  tags: string[] | null
  status: string | null
  subscription_tier: string | null
  polygon: unknown | null
  color: string | null
  created_at: string
  updated_at: string
  // Joined brokerage
  brokerage?: ArBrokerage | null
}

export interface ArBrokerage {
  id: string
  name: string
  logo: string | null
  color: string | null
  member_count: number | null
  markets_served: number | null
  description: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: ArProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ArProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('ar_profiles')
        .select(
          `
          *,
          brokerage:ar_brokerages(*)
        `
        )
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Failed to fetch profile:', error.message)
        setProfile(null)
        return
      }

      setProfile(data as ArProfile)
    },
    [supabase]
  )

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }: { data: { session: Session | null } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, s: Session | null) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { error: error.message }
      return { error: null }
    },
    [supabase]
  )

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) return { error: error.message }
      return { error: null }
    },
    [supabase]
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated: !!session,
        signIn,
        signUp,
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
