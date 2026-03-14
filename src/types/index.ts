export interface Agent {
  id: string
  name: string
  brokerage: string
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
  area: string
  tags: string[]
  dealsPerYear: number
  yearsLicensed: number
  avgSalePrice: number
  phone: string
  email: string
  color: string
}
