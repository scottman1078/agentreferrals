'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Raw shape from Supabase ar_invites table
interface ArInviteRow {
  id: string
  invited_by: string
  invitee_name: string | null
  invitee_email: string
  invitee_brokerage: string | null
  invitee_market: string | null
  status: 'pending' | 'opened' | 'signed_up' | 'active'
  method: 'email' | 'link' | 'sms'
  referral_code: string | null
  message: string | null
  created_at: string
}

// Mapped shape consumed by the rest of the app
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

function mapRow(row: ArInviteRow): ArInvite {
  return {
    id: row.id,
    invited_by: row.invited_by,
    name: row.invitee_name || row.invitee_email.split('@')[0],
    email: row.invitee_email,
    brokerage: row.invitee_brokerage,
    market: row.invitee_market,
    status: row.status,
    sent_date: row.created_at,
    method: row.method,
    referral_code: row.referral_code,
    created_at: row.created_at,
  }
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
      setData(((invites as ArInviteRow[]) || []).map(mapRow))
    }

    setIsLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, mutate: fetchData }
}
