export interface PastReferralEntry {
  direction: 'sent' | 'received'
  partnerName: string
  partnerEmail: string
  market: string
  salePrice: number
  closeYear: number
}

export interface OnboardingData {
  brokerageId: string | null
  customBrokerage: string
  teamName: string
  isOnTeam: boolean
  fullName: string
  phone: string
  yearsLicensed: number | null
  referralsPerYear: number | null
  primaryArea: string
  avgSalePrice: number | null
  avgReferralFee: number
  specializations: string[]
  licenseNumber: string
  inviteEmails: string[]
  pastReferrals: PastReferralEntry[]
}

export type InteractiveType =
  | { kind: 'chips'; options: string[]; selected?: string }
  | { kind: 'brokerage' }
  | { kind: 'brokerageAutocomplete' }
  | { kind: 'multiSelect'; options: string[]; selected: string[] }
  | { kind: 'input'; placeholder: string; type?: string }
  | { kind: 'licenseInput' }
  | { kind: 'dualInput'; fields: { key: string; placeholder: string; type?: string }[] }
  | { kind: 'emailList' }
  | { kind: 'buttons'; options: { label: string; value: string; primary?: boolean }[] }
  | { kind: 'pastReferralForm' }
  | { kind: 'photoUpload' }
  | { kind: 'phoneInput' }
  | { kind: 'phoneCode' }
  | { kind: 'profileSummary' }

export interface ChatMessage {
  id: string
  role: 'nora' | 'user'
  content: string
  interactive?: InteractiveType
  resolved?: boolean
}

export type OnboardingStep =
  | 'welcome'
  | 'brokerage'
  | 'custom_brokerage'
  | 'team'
  | 'team_name'
  | 'experience'
  | 'referral_volume'
  | 'service_area'
  | 'specializations'
  | 'avg_price'
  | 'referral_fee'
  | 'name_phone'
  | 'license_number'
  | 'photo_upload'
  | 'phone_verify'
  | 'phone_code'
  | 'summary'
  | 'complete'
