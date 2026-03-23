export interface Invite {
  id: string
  name: string
  email: string
  brokerage: string
  market: string
  status: 'pending' | 'opened' | 'signed_up' | 'active'
  sentDate: string
  method: 'email' | 'link' | 'sms'
  referralCode?: string
}

export const invites: Invite[] = [
  { id: 'inv1', name: 'Jake Morrison', email: 'jmorrison@kwlt.com', brokerage: 'Keller Williams Lake Travis', market: 'Austin, TX', status: 'signed_up', sentDate: 'Mar 10, 2025', method: 'email' },
  { id: 'inv2', name: 'Emily Watson', email: 'ewatson@compass.com', brokerage: 'Compass Austin', market: 'Austin, TX', status: 'active', sentDate: 'Mar 5, 2025', method: 'email' },
  { id: 'inv3', name: 'Mike Patterson', email: 'mpatterson@smith.com', brokerage: 'Smith & Associates', market: 'Tampa, FL', status: 'opened', sentDate: 'Mar 12, 2025', method: 'email' },
  { id: 'inv4', name: 'Sarah Mitchell', email: 'smitchell@compass.com', brokerage: 'Compass Raleigh', market: 'Raleigh, NC', status: 'pending', sentDate: 'Mar 13, 2025', method: 'link' },
  { id: 'inv5', name: 'Amanda Graves', email: 'agraves@reecenichols.com', brokerage: 'ReeceNichols Real Estate', market: 'Kansas City, MO', status: 'pending', sentDate: 'Mar 14, 2025', method: 'sms' },
  { id: 'inv6', name: 'Tyler Jensen', email: 'tjensen@windermere.com', brokerage: 'Windermere Utah', market: 'Salt Lake City, UT', status: 'opened', sentDate: 'Mar 11, 2025', method: 'email' },
  { id: 'inv7', name: 'Ana Sofia Reyes', email: 'areyes@realtyaustin.com', brokerage: 'Realty Austin', market: 'Round Rock, TX', status: 'active', sentDate: 'Feb 28, 2025', method: 'email' },
  { id: 'inv8', name: 'Lisa Chen', email: 'lchen@kwstpete.com', brokerage: 'Keller Williams St. Pete', market: 'St. Petersburg, FL', status: 'signed_up', sentDate: 'Mar 8, 2025', method: 'link' },
]

export const REFERRAL_CODE = 'JOBRIEN-REF-2025'
export const REFERRAL_LINK = 'https://agentreferrals.ai/invite/JOBRIEN-REF-2025'
