/**
 * Smart data provider — uses Supabase hooks if authenticated, falls back to mock data.
 *
 * Data flow:
 *   1. Demo mode ON (via /demo) → always return mock data
 *   2. Authenticated user, demo OFF → Supabase data (empty states if no data)
 *   3. Not authenticated, demo OFF → mock data (backwards compatible)
 */

'use client'

import { useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useDemo } from '@/contexts/demo-context'
import { useAgents } from '@/hooks/use-agents'
import { useReferrals } from '@/hooks/use-referrals'
import { useInvites } from '@/hooks/use-invites'
import { useBrokerages } from '@/hooks/use-brokerages'
import { useProfile } from '@/hooks/use-profile'

// Mock data imports (fallbacks)
import { agents as mockAgents } from '@/data/agents'
import { referrals as mockReferrals } from '@/data/referrals'
import { brokerages as mockBrokerages } from '@/data/brokerages'
import { documents as mockDocuments } from '@/data/documents'
import { invites as mockInvites, REFERRAL_CODE as mockReferralCode, REFERRAL_LINK as mockReferralLink } from '@/data/invites'
import { candidatesByZone as mockCandidatesByZone } from '@/data/candidates'
import { coverageGaps as mockCoverageGaps, voidZones as mockVoidZones } from '@/data/coverage-gaps'
import { agentsNeedingPartner as mockAgentsNeedingPartner, coverageGapOpportunities as mockCoverageGapOpportunities, existingRequests as mockExistingRequests } from '@/data/partnerships'
import { getAgentReviews, getAgentReviewStats } from '@/data/reviews'

import type { Agent, Referral, Brokerage, Document, Candidate, CoverageGap, VoidZone } from '@/types'
import type { Invite } from '@/data/invites'
import type { ArProfile } from '@/contexts/auth-context'
import type { ArReferral } from '@/hooks/use-referrals'
import type { ArInvite } from '@/hooks/use-invites'
import type { AgentNeedingPartner, CoverageGapOpportunity, PartnershipRequest } from '@/types'

// ─── Mapping functions: Supabase → mock-compatible shapes ───

function mapProfileToAgent(profile: ArProfile): Agent {
  // Use first territory zip as the area if primary_area is empty
  const zips = profile.territory_zips || []
  const area = profile.primary_area || (zips.length > 0 ? zips.join(', ') : '')

  return {
    id: profile.id,
    name: profile.full_name,
    brokerage: profile.brokerage?.name || 'Unknown',
    brokerageId: profile.brokerage_id || '',
    area,
    tags: profile.tags || [],
    status: (profile.status as 'active' | 'invited') || 'active',
    phone: '',
    email: profile.email,
    dealsPerYear: profile.deals_per_year || 0,
    yearsLicensed: profile.years_licensed || 0,
    avgSalePrice: profile.avg_sale_price || 0,
    polygon: [], // Zip boundaries loaded separately by the map
    color: profile.brokerage?.color || '#6366f1',
    rcsScore: profile.refernet_score || undefined,
    photoUrl: profile.avatar_url || undefined,
  }
}

function mapArReferralToReferral(arRef: ArReferral): Referral {
  return {
    id: arRef.id,
    clientName: arRef.client_name,
    fromAgent: arRef.from_agent_id,
    toAgent: arRef.to_agent_id || '',
    market: arRef.market || '',
    feePercent: arRef.fee_percent || 25,
    estCloseDate: arRef.estimated_close_date || '',
    stage: arRef.stage as Referral['stage'],
    estimatedPrice: arRef.estimated_price || 0,
    notes: arRef.notes || '',
  }
}

function mapArInviteToInvite(arInvite: ArInvite): Invite {
  return {
    id: arInvite.id,
    name: arInvite.name,
    email: arInvite.email,
    brokerage: arInvite.brokerage || '',
    market: arInvite.market || '',
    status: arInvite.status,
    sentDate: arInvite.sent_date
      ? new Date(arInvite.sent_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Unknown',
    method: arInvite.method,
    referralCode: arInvite.referral_code || undefined,
  }
}

// ─── Main hook ───

interface AppData {
  // Auth state
  isAuthenticated: boolean
  isLoading: boolean
  profile: ArProfile | null
  userId: string | undefined

  // Data
  agents: Agent[]
  referrals: Referral[]
  brokerages: Brokerage[]
  documents: Document[]
  invites: Invite[]
  candidatesByZone: Record<string, Candidate[]>
  coverageGaps: CoverageGap[]
  voidZones: VoidZone[]
  agentsNeedingPartner: AgentNeedingPartner[]
  coverageGapOpportunities: CoverageGapOpportunity[]
  existingRequests: PartnershipRequest[]

  // Referral link
  referralCode: string
  referralLink: string

  // Review helpers (always mock for now — no Supabase table yet)
  getAgentReviews: typeof getAgentReviews
  getAgentReviewStats: typeof getAgentReviewStats

  // Loading states for individual data
  agentsLoading: boolean
  referralsLoading: boolean
  invitesLoading: boolean

  // Mutation helpers
  mutateReferrals: () => Promise<void>
}

export function useAppData(): AppData {
  let isAuthenticated = false
  let isAuthLoading = true
  let profile: ArProfile | null = null
  let userId: string | undefined
  let isDemoMode = false

  // Check demo mode
  try {
    const demo = useDemo()
    isDemoMode = demo.isDemoMode
  } catch {
    // DemoProvider not available
  }

  // Try to use auth — but handle case where AuthProvider is not mounted
  try {
    const auth = useAuth()
    isAuthenticated = auth.isAuthenticated
    isAuthLoading = auth.isLoading
    profile = auth.profile
    userId = auth.user?.id
  } catch {
    // AuthProvider not available — use mock data
    isAuthenticated = false
    isAuthLoading = false
  }

  // Supabase hooks — always fetch, but filter by demo flag
  const brokerageId = profile?.brokerage_id || undefined
  const {
    data: supaAgents,
    isLoading: agentsLoading,
  } = useAgents({
    brokerageId: brokerageId,
    scope: 'all-network',
    includeDemo: isDemoMode,
  })

  const {
    data: supaReferrals,
    isLoading: referralsLoading,
    mutate: mutateReferrals,
  } = useReferrals({ userId: isDemoMode ? undefined : userId })

  const {
    data: supaInvites,
    isLoading: invitesLoading,
  } = useInvites({ userId: isDemoMode ? undefined : userId })

  // Map Supabase data to app-compatible shapes
  const mappedAgents = useMemo(
    () => supaAgents.map(mapProfileToAgent),
    [supaAgents]
  )

  const mappedReferrals = useMemo(
    () => supaReferrals.map(mapArReferralToReferral),
    [supaReferrals]
  )

  const mappedInvites = useMemo(
    () => supaInvites.map(mapArInviteToInvite),
    [supaInvites]
  )

  // Demo mode: use Supabase demo data + mock fallbacks for tables without is_demo
  // Authenticated: use real Supabase data only (empty if none)
  const useRealData = isAuthenticated && !isAuthLoading && !isDemoMode

  // Empty review helpers for authenticated users (no mock reviews)
  const emptyReviews = () => []
  const emptyReviewStats = () => null

  // In demo mode, override isAuthenticated so auth state doesn't interfere
  const effectiveIsAuthenticated = isDemoMode ? false : isAuthenticated

  // Demo agent resolution:
  // - While agents are still loading in demo mode, use mock agents immediately
  //   (prevents flash of stale real agents during the includeDemo transition)
  // - Once loaded, use Supabase demo agents if available, otherwise mock fallback
  const demoAgents = (agentsLoading || mappedAgents.length === 0) ? mockAgents : mappedAgents

  return {
    isAuthenticated: effectiveIsAuthenticated,
    isLoading: isDemoMode ? false : isAuthLoading,
    profile: isDemoMode ? null : profile,
    userId: isDemoMode ? undefined : userId,

    // Agents: in demo mode use resolved demo agents; otherwise Supabase data
    agents: isDemoMode ? demoAgents : mappedAgents,

    // Referrals/invites: real data for authenticated, mock for demo
    referrals: isDemoMode ? mockReferrals : mappedReferrals,
    brokerages: mockBrokerages, // Reference data, same for everyone
    documents: isDemoMode ? mockDocuments : [],
    invites: isDemoMode ? mockInvites : mappedInvites,
    candidatesByZone: isDemoMode ? mockCandidatesByZone : {},
    coverageGaps: isDemoMode ? mockCoverageGaps : [],
    voidZones: isDemoMode ? mockVoidZones : [],
    agentsNeedingPartner: isDemoMode ? mockAgentsNeedingPartner : [],
    coverageGapOpportunities: isDemoMode ? mockCoverageGapOpportunities : [],
    existingRequests: isDemoMode ? mockExistingRequests : [],

    referralCode: profile?.referral_code || (isDemoMode ? mockReferralCode : ''),
    referralLink: profile?.referral_code
      ? `https://agentreferrals.ai/invite/${profile.referral_code}`
      : (isDemoMode ? mockReferralLink : ''),

    getAgentReviews: isDemoMode ? getAgentReviews : emptyReviews,
    getAgentReviewStats: isDemoMode ? getAgentReviewStats : emptyReviewStats,

    agentsLoading,
    referralsLoading: isDemoMode ? false : referralsLoading,
    invitesLoading: isDemoMode ? false : invitesLoading,

    mutateReferrals: isDemoMode ? (async () => {}) : mutateReferrals,
  }
}
