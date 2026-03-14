'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ArInvite {
  id: string
  invited_by: string
  name: string
  email: string
  brokerage: string | null
  market: string | null
  status: 'pending' | 'opened' | 'signed_up' | 'active'
  sent_date: string
  method: 'email' | 'link' | 'sms'
  referral_code: string | null
  created_at: string
}

interface UseInvitesOptions {
  userId?: string
}

interface UseInvitesReturn {
  data: ArInvite[]
  isLoading: boolean
  error: string | null
  mutate: () => Promise<void>
}

export function useInvites({ userId }: UseInvitesOptions = {}): UseInvitesReturn {
  const [data, setData] = useState<ArInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data: invites, error: fetchError } = await supabase
      .from('ar_invites')
      .select('*')
      .eq('invited_by', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setData([])
    } else {
      setData((invites as ArInvite[]) || [])
    }

    setIsLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, mutate: fetchData }
}
