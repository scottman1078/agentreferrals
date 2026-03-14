export const APP_NAME = 'AgentReferrals'
export const APP_NAME_SHORT = 'AR'
export const APP_DOMAIN = 'agentreferrals.ai'
export const APP_ACCENT_WORD = 'Referrals'
export const APP_TAGLINE = 'AI-powered referral network for real estate agents'

export const TAG_COLORS: Record<string, string> = {
  'Homes for Heroes': '#3b82f6',
  'Luxury': '#f0a500',
  'First-Time Buyers': '#22c55e',
  'Investment': '#a855f7',
  'Relocation': '#f97316',
  'Land & Acreage': '#d97706',
  'New Construction': '#14b8a6',
}

export const TAG_EMOJIS: Record<string, string> = {
  'Homes for Heroes': '🦸',
  'Luxury': '💎',
  'First-Time Buyers': '🏡',
  'Investment': '📈',
  'Relocation': '📦',
  'Land & Acreage': '🌾',
  'New Construction': '🏗',
}

export const ALL_TAGS = [
  'Homes for Heroes',
  'Luxury',
  'First-Time Buyers',
  'Investment',
  'Relocation',
  'Land & Acreage',
  'New Construction',
]

export const PIPELINE_STAGES = [
  'Agreement Sent',
  'Agreement Executed',
  'Client Introduced',
  'Under Contract',
  'Closed - Fee Pending',
  'Fee Received',
] as const

export const STAGE_COLORS: Record<string, string> = {
  'Agreement Sent': '#6366f1',
  'Agreement Executed': '#8b5cf6',
  'Client Introduced': '#f59e0b',
  'Under Contract': '#f97316',
  'Closed - Fee Pending': '#22c55e',
  'Fee Received': '#10b981',
}
