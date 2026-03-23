'use client'

import { useState, useEffect, useCallback } from 'react'

export interface MarketplacePost {
  id: string
  posting_agent_id: string
  client_initials: string
  representation: string
  budget_range: string
  estimated_price: number | null
  timeline: string | null
  market: string
  neighborhood: string | null
  fee_percent: number
  commission_rate: number
  description: string
  client_needs: string[]
  decision_deadline: string
  early_access_until: string
  status: string
  awarded_bid_id: string | null
  view_count: number
  created_at: string
  expires_at: string
  posting_agent?: {
    id: string
    full_name: string
    color: string
    primary_area: string
    brokerage: { name: string } | null
  }
}

export interface MarketplaceBid {
  id: string
  post_id: string
  agent_id: string
  pitch: string
  video_url: string | null
  video_duration: number | null
  highlights: string[]
  status: string
  created_at: string
  agent?: {
    id: string
    full_name: string
    color: string
    refernet_score: number | null
    closed_referrals: number | null
    response_time_minutes: number | null
    brokerage: { name: string } | null
  }
}

export function useMarketplacePosts(options?: { agentId?: string; market?: string; status?: string }) {
  const [posts, setPosts] = useState<MarketplacePost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (options?.agentId) params.set('agentId', options.agentId)
      if (options?.market) params.set('market', options.market)
      if (options?.status) params.set('status', options.status)

      const res = await fetch(`/api/marketplace?${params}`)
      const data = await res.json()
      if (data.success) setPosts(data.posts)
    } catch (err) {
      console.error('[useMarketplacePosts] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options?.agentId, options?.market, options?.status])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  return { posts, isLoading, refetch: fetchPosts }
}

export function useMarketplaceBids(options?: { postId?: string; agentId?: string }) {
  const [bids, setBids] = useState<MarketplaceBid[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchBids = useCallback(async () => {
    if (!options?.postId && !options?.agentId) {
      setIsLoading(false)
      return
    }
    try {
      const params = new URLSearchParams()
      if (options?.postId) params.set('postId', options.postId)
      if (options?.agentId) params.set('agentId', options.agentId)

      const res = await fetch(`/api/marketplace/bids?${params}`)
      const data = await res.json()
      if (data.success) setBids(data.bids)
    } catch (err) {
      console.error('[useMarketplaceBids] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options?.postId, options?.agentId])

  useEffect(() => { fetchBids() }, [fetchBids])

  return { bids, isLoading, refetch: fetchBids }
}

export async function createMarketplacePost(post: Record<string, unknown>) {
  const res = await fetch('/api/marketplace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post),
  })
  return res.json()
}

export async function submitBid(bid: { postId: string; agentId: string; pitch: string; videoUrl?: string; videoDuration?: number; highlights?: string[] }) {
  const res = await fetch('/api/marketplace/bids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bid),
  })
  return res.json()
}

export async function updateMarketplacePost(postId: string, fields: Record<string, unknown>) {
  const res = await fetch('/api/marketplace', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, ...fields }),
  })
  return res.json()
}

export async function awardBid(postId: string, bidId: string) {
  const res = await fetch('/api/marketplace', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, status: 'awarded', awardedBidId: bidId }),
  })
  return res.json()
}
