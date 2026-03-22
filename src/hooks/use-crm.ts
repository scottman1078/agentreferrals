'use client'

import { useState, useEffect, useCallback } from 'react'

// --- Types ---

export interface CrmConnection {
  id: string
  provider: 'fub' | 'lofty'
  status: 'connected' | 'disconnected' | 'error'
  last_synced_at: string | null
  contact_count: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CrmContact {
  id: string
  agent_id: string
  provider: string
  external_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  tags: string[]
  lead_status: string | null
  lead_source: string | null
  property_address: string | null
  notes: string | null
  synced_at: string
}

// --- useCrmConnections ---

export function useCrmConnections() {
  const [connections, setConnections] = useState<CrmConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/crm/connections')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setConnections(data.connections ?? [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_()
  }, [fetch_])

  const connect = async (provider: string, apiKey: string) => {
    const res = await fetch('/api/crm/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Failed to connect')
    await fetch_()
    return data.connection
  }

  const disconnect = async (provider: string) => {
    const res = await fetch(`/api/crm/connections?provider=${provider}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to disconnect')
    }
    await fetch_()
  }

  const testConnection = async (provider: string, apiKey: string) => {
    const res = await fetch('/api/crm/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey }),
    })
    return res.json()
  }

  const sync = async (provider: string) => {
    const res = await fetch('/api/crm/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Sync failed')
    await fetch_()
    return data
  }

  const getConnection = (provider: string) =>
    connections.find((c) => c.provider === provider) ?? null

  return {
    connections,
    loading,
    error,
    refetch: fetch_,
    connect,
    disconnect,
    testConnection,
    sync,
    getConnection,
  }
}

// --- useCrmContacts ---

export function useCrmContacts(provider?: string, search?: string) {
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (provider) params.set('provider', provider)
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '50')

      const res = await fetch(`/api/crm/contacts?${params}`)
      if (!res.ok) throw new Error('Failed to fetch contacts')
      const data = await res.json()
      setContacts(data.contacts ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [provider, search, page])

  useEffect(() => {
    fetch_()
  }, [fetch_])

  return {
    contacts,
    total,
    loading,
    error,
    page,
    setPage,
    refetch: fetch_,
  }
}
