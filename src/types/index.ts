export interface Brokerage {
  id: string
  name: string
  logo: string // fallback initial
  logoUrl?: string // real logo image URL
  color: string
  memberCount: number
  marketsServed: number
  description: string
  isUserBrokerage?: boolean
}

export interface Agent {
  id: string
  name: string
  brokerage: string
  brokerageId: string
  area: string
  tags: string[]
  status: 'active' | 'invited'
  phone: string
  email: string
  dealsPerYear: number
  yearsLicensed: number
  avgSalePrice: number
  polygon: [number, number][]
  color: string
  isPrimary?: boolean
  rcsScore?: number // 0-100 composite trust/performance metric (Referral Communication Score)
  responseTime?: string // "< 1hr", "< 4hr", etc.
  closedReferrals?: number
  photoUrl?: string
  totalTransactions?: number | null
  zillowProfileUrl?: string | null
  dataSources?: Record<string, string> | null // tracks where each data point came from
}

export interface Referral {
  id: string
  clientName: string
  fromAgent: string
  toAgent: string
  market: string
  feePercent: number
  estCloseDate: string
  stage: PipelineStage
  estimatedPrice: number
  notes: string
}

export type PipelineStage =
  | 'Agreement Sent'
  | 'Agreement Executed'
  | 'Client Introduced'
  | 'Under Contract'
  | 'Closed - Fee Pending'
  | 'Fee Received'

export interface CoverageGap {
  id: string
  area: string
  priority: 'High' | 'Medium' | 'Low'
  migration: string | null
  checked: boolean
}

export interface VoidZone {
  id: string
  label: string
  polygon: [number, number][]
}

export interface Document {
  id: string
  title: string
  subtitle: string
  status: 'Draft' | 'Sent' | 'Executed' | 'Expired'
  date: string
  parties: { from: string; to: string }
  referralFee: string
  market: string
  clientName: string
  estimatedPrice: number
  expirationDate: string
  signedBy?: string[]
}

export interface Candidate {
  id: string
  name: string
  brokerage: string
  brokerageId?: string
  area: string
  tags: string[]
  dealsPerYear: number
  yearsLicensed: number
  avgSalePrice: number
  phone: string
  email: string
  color: string
}

export type BrokerageScope = 'my-network' | '1-degree' | '2-degree' | 'my-brokerage' | 'all-network'

export interface NoraMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  matchedAgents?: Agent[]
}

// Partnership types
export type PartnershipStatus = 'pending' | 'accepted' | 'declined' | 'active' | 'expired'

export interface PartnershipRequest {
  id: string
  requestingAgentId: string
  receivingAgentId: string
  requestingMarket: string
  receivingMarket: string
  status: PartnershipStatus
  message?: string
  acceptedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AgentNeedingPartner {
  id: string
  name: string
  brokerage: string
  brokerageId: string
  area: string
  dealsPerYear: number
  avgSalePrice: number
  rcsScore: number
  responseTime: string
  closedReferrals: number
  color: string
  tags: string[]
  missingMarket: string // the market they lack a partner in (user's area)
}

export interface CoverageGapOpportunity {
  id: string
  market: string
  state: string
  migrationTrend: 'High' | 'Medium' | 'Low'
  suggestedAgents: SuggestedPartner[]
}

export interface SuggestedPartner {
  id: string
  name: string
  brokerage: string
  brokerageId: string
  area: string
  dealsPerYear: number
  avgSalePrice: number
  rcsScore: number
  responseTime: string
  closedReferrals: number
  color: string
  tags: string[]
}
