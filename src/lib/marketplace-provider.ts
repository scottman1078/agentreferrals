'use client'

/**
 * Marketplace data provider — tries Supabase, falls back to mock data.
 * Same pattern as data-provider.ts.
 *
 * Usage: const { posts, bids, createPost, submitBid, awardBid } = useMarketplace()
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useDemo } from '@/contexts/demo-context'
import {
  getOpenPosts as mockGetOpenPosts,
  getPostsByAgent as mockGetPostsByAgent,
  getBidsForPost as mockGetBidsForPost,
  getBidsByAgent as mockGetBidsByAgent,
  getAwardedBid as mockGetAwardedBid,
} from '@/data/referral-posts'
import type { ReferralPost, ReferralBid } from '@/data/referral-posts'

interface MarketplaceData {
  // Data
  openPosts: ReferralPost[]
  myPosts: ReferralPost[]
  myBids: ReferralBid[]
  isLoading: boolean
  source: 'supabase' | 'mock'

  // Actions
  fetchBidsForPost: (postId: string) => Promise<ReferralBid[]>
  createPost: (post: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  submitBid: (bid: { postId: string; pitch: string; videoUrl?: string; videoDuration?: number; highlights?: string[] }) => Promise<{ success: boolean; error?: string }>
  awardBid: (postId: string, bidId: string) => Promise<{ success: boolean; error?: string }>
  refetch: () => void
}

export function useMarketplace(): MarketplaceData {
  const [openPosts, setOpenPosts] = useState<ReferralPost[]>([])
  const [myPosts, setMyPosts] = useState<ReferralPost[]>([])
  const [myBids, setMyBids] = useState<ReferralBid[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<'supabase' | 'mock'>('mock')

  let isAuthenticated = false
  let userId: string | undefined
  let isDemoMode = false

  try {
    const demo = useDemo()
    isDemoMode = demo.isDemoMode
  } catch { /* no DemoProvider */ }

  try {
    const auth = useAuth()
    isAuthenticated = auth.isAuthenticated && !isDemoMode
    userId = auth.user?.id
  } catch {
    // AuthProvider not available — use mock
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    if (isAuthenticated && userId) {
      try {
        // Try Supabase
        const [openRes, myPostsRes, myBidsRes] = await Promise.all([
          fetch('/api/marketplace?status=open'),
          fetch(`/api/marketplace?agentId=${userId}`),
          fetch(`/api/marketplace/bids?agentId=${userId}`),
        ])

        const [openData, myPostsData, myBidsData] = await Promise.all([
          openRes.json(),
          myPostsRes.json(),
          myBidsRes.json(),
        ])

        if (openData.source === 'supabase' && openData.posts?.length > 0) {
          // Map Supabase format to mock format for compatibility
          setOpenPosts(openData.posts.map(mapSupabasePost))
          setMyPosts((myPostsData.posts || []).map(mapSupabasePost))
          setMyBids((myBidsData.bids || []).map(mapSupabaseBid))
          setSource('supabase')
          setIsLoading(false)
          return
        }
      } catch (err) {
        console.error('[useMarketplace] Supabase fetch failed, using mock:', err)
      }
    }

    // Fall back to mock — use demo user 'jason' for mock data
    const mockUserId = userId || 'jason'
    setOpenPosts(mockGetOpenPosts())
    setMyPosts(mockGetPostsByAgent(mockUserId))
    setMyBids(mockGetBidsByAgent(mockUserId))
    setSource('mock')
    setIsLoading(false)
  }, [isAuthenticated, userId])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchBidsForPost = useCallback(async (postId: string): Promise<ReferralBid[]> => {
    if (source === 'supabase') {
      try {
        const res = await fetch(`/api/marketplace/bids?postId=${postId}`)
        const data = await res.json()
        if (data.success && data.source === 'supabase') {
          return (data.bids || []).map(mapSupabaseBid)
        }
      } catch { /* fall through */ }
    }
    return mockGetBidsForPost(postId)
  }, [source])

  const createPost = useCallback(async (post: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...post, postingAgentId: userId }),
      })
      const data = await res.json()
      if (data.success) {
        fetchData() // refetch
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'Network error' }
    }
  }, [userId, fetchData])

  const submitBidAction = useCallback(async (bid: { postId: string; pitch: string; videoUrl?: string; videoDuration?: number; highlights?: string[] }) => {
    try {
      const res = await fetch('/api/marketplace/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bid, agentId: userId }),
      })
      const data = await res.json()
      if (data.success) {
        fetchData()
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'Network error' }
    }
  }, [userId, fetchData])

  const awardBidAction = useCallback(async (postId: string, bidId: string) => {
    try {
      const res = await fetch('/api/marketplace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, status: 'awarded', awardedBidId: bidId }),
      })
      const data = await res.json()
      if (data.success) {
        fetchData()
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'Network error' }
    }
  }, [fetchData])

  return {
    openPosts,
    myPosts,
    myBids,
    isLoading,
    source,
    fetchBidsForPost,
    createPost,
    submitBid: submitBidAction,
    awardBid: awardBidAction,
    refetch: fetchData,
  }
}

// ── Mappers: Supabase format → mock-compatible format ──

function mapSupabasePost(sp: Record<string, unknown>): ReferralPost {
  const agent = sp.posting_agent as Record<string, unknown> | null
  const brokerage = agent?.brokerage as { name: string } | null

  return {
    id: sp.id as string,
    postingAgentId: sp.posting_agent_id as string,
    postingAgentName: (agent?.full_name as string) || 'Unknown',
    postingAgentBrokerage: brokerage?.name || 'Unknown',
    postingAgentColor: (agent?.color as string) || '#6366f1',
    clientInitials: sp.client_initials as string,
    representation: sp.representation as 'Buyer' | 'Seller' | 'Both',
    budgetRange: sp.budget_range as string,
    estimatedPrice: Number(sp.estimated_price) || 0,
    timeline: (sp.timeline as string) || '',
    market: sp.market as string,
    neighborhood: sp.neighborhood as string | undefined,
    feePercent: Number(sp.fee_percent) || 25,
    commissionRate: Number(sp.commission_rate) || 3,
    description: sp.description as string,
    clientNeeds: (sp.client_needs as string[]) || [],
    status: sp.status as ReferralPost['status'],
    postedAt: sp.created_at as string,
    expiresAt: sp.expires_at as string,
    decisionDeadline: sp.decision_deadline as string,
    earlyAccessUntil: sp.early_access_until as string,
    bidsCount: 0, // will be fetched separately
    viewCount: Number(sp.view_count) || 0,
    awardedBidId: sp.awarded_bid_id as string | undefined,
  }
}

function mapSupabaseBid(sb: Record<string, unknown>): ReferralBid {
  const agent = sb.agent as Record<string, unknown> | null
  const brokerage = agent?.brokerage as { name: string } | null
  const responseMinutes = Number(agent?.response_time_minutes) || 60

  return {
    id: sb.id as string,
    postId: sb.post_id as string,
    agentId: sb.agent_id as string,
    agentName: (agent?.full_name as string) || 'Unknown',
    agentBrokerage: brokerage?.name || 'Unknown',
    agentColor: (agent?.color as string) || '#6366f1',
    agentRCSScore: Number(agent?.refernet_score) || 50,
    agentClosedReferrals: Number(agent?.closed_referrals) || 0,
    agentResponseTime: responseMinutes <= 30 ? '< 30min' : responseMinutes <= 60 ? '< 1hr' : `< ${Math.ceil(responseMinutes / 60)}hr`,
    pitch: sb.pitch as string,
    videoUrl: sb.video_url as string | null,
    videoDuration: sb.video_duration as number | null,
    highlights: (sb.highlights as string[]) || [],
    status: sb.status as ReferralBid['status'],
    submittedAt: sb.created_at as string,
    responseAt: sb.response_at as string | null,
  }
}
