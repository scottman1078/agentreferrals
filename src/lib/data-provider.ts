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
  return {
    id: profile.id,
    name: profile.full_name,
    brokerage: profile.brokerage?.name || 'Unknown',
    brokerageId: profile.brokerage_id || '',
    area: profile.primary_area || '',
    tags: profile.tags || [],
    status: (profile.status as 'active' | 'invited') || 'active',
    phone: '',
    email: profile.email,
    dealsPerYear: profile.deals_per_year || 0,
    yearsLicensed: profile.years_licensed || 0,
    avgSalePrice: profile.avg_sale_price || 0,
    polygon: [], // No polygon data from Supabase
    color: profile.brokerage?.color || '#6366f1',
    referNetScore: profile.refernet_score || undefined,
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
    sentDate: new Date(arInvite.sent_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
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

  // If demo mode is explicitly on, force mock data
  if (isDemoMode) {
    isAuthenticated = false
    isAuthLoading = false
  }

  // Supabase hooks — only fetch when authenticated
  const brokerageId = profile?.brokerage_id || undefined
  const {
    data: supaAgents,
    isLoading: agentsLoading,
  } = useAgents({ brokerageId: isAuthenticated ? brokerageId : undefined, scope: 'all-network' })

  const {
    data: supaReferrals,
    isLoading: referralsLoading,
  } = useReferrals({ userId: isAuthenticated ? userId : undefined })

  const {
    data: supaInvites,
    isLoading: invitesLoading,
  } = useInvites({ userId: isAuthenticated ? userId : undefined })

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

  // Decide: use Supabase data or mock fallback
  const useSupabase = isAuthenticated && !isAuthLoading
  const hasSupaAgents = useSupabase && supaAgents.length > 0
  const hasSupaReferrals = useSupabase && supaReferrals.length > 0
  const hasSupaInvites = useSupabase && supaInvites.length > 0

  return {
    isAuthenticated,
    isLoading: isAuthLoading,
    profile,
    userId,

    // Always use mock agents for now — Supabase profiles lack polygon/territory data
    // TODO: Switch to Supabase when ar_agent_profiles has polygon data populated
    agents: mockAgents,
    referrals: hasSupaReferrals ? mappedReferrals : mockReferrals,
    brokerages: mockBrokerages, // No mapping needed yet — mock brokerages used everywhere
    documents: mockDocuments, // No Supabase table for documents yet
    invites: hasSupaInvites ? mappedInvites : mockInvites,
    candidatesByZone: mockCandidatesByZone, // No Supabase table yet
    coverageGaps: mockCoverageGaps, // No Supabase table yet
    voidZones: mockVoidZones,
    agentsNeedingPartner: mockAgentsNeedingPartner, // No Supabase table yet
    coverageGapOpportunities: mockCoverageGapOpportunities,
    existingRequests: mockExistingRequests,

    referralCode: profile?.referral_code || mockReferralCode,
    referralLink: profile?.referral_code
      ? `https://agentreferrals.ai/join?ref=${profile.referral_code}`
      : mockReferralLink,

    getAgentReviews,
    getAgentReviewStats,

    agentsLoading: isAuthenticated ? agentsLoading : false,
    referralsLoading: isAuthenticated ? referralsLoading : false,
    invitesLoading: isAuthenticated ? invitesLoading : false,
  }
}
