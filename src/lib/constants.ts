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
  'Probate': '#6366f1',
  'Downsizing': '#ec4899',
}

export const TAG_EMOJIS: Record<string, string> = {
  'Homes for Heroes': '🦸',
  'Luxury': '💎',
  'First-Time Buyers': '🏡',
  'Investment': '📈',
  'Relocation': '📦',
  'Land & Acreage': '🌾',
  'New Construction': '🏗',
  'Probate': '⚖️',
  'Downsizing': '📐',
}

export const ALL_TAGS = [
  'Homes for Heroes',
  'Luxury',
  'First-Time Buyers',
  'Investment',
  'Relocation',
  'Land & Acreage',
  'New Construction',
  'Probate',
  'Downsizing',
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

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
] as const
