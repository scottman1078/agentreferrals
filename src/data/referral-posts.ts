export type PostStatus = 'open' | 'reviewing' | 'awarded' | 'expired'
export type BidStatus = 'pending' | 'accepted' | 'declined'
export type RepresentationType = 'Buyer' | 'Seller' | 'Both'

export interface ReferralPost {
  id: string
  postingAgentId: string
  postingAgentName: string
  postingAgentBrokerage: string
  postingAgentColor: string
  // Client details (partially redacted until awarded)
  clientInitials: string          // "M.F." — privacy until match
  representation: RepresentationType
  budgetRange: string             // "$400k - $550k"
  estimatedPrice: number
  timeline: string                // "60 days", "ASAP", "flexible"
  // Target market
  market: string                  // "Nashville, TN"
  neighborhood?: string           // "Brentwood / Franklin"
  // Referral terms
  feePercent: number
  commissionRate: number
  // Description
  description: string             // what the posting agent is looking for
  clientNeeds: string[]           // ["Pre-approved", "Family of 4", "Good schools", "3+ bed"]
  // Metadata
  status: PostStatus
  postedAt: string
  expiresAt: string
  bidsCount: number
  viewCount: number
  awardedBidId?: string
}

export interface ReferralBid {
  id: string
  postId: string
  agentId: string
  agentName: string
  agentBrokerage: string
  agentColor: string
  agentReferNetScore: number
  agentClosedReferrals: number
  agentResponseTime: string
  // Bid content
  pitch: string                   // written pitch — why they're the right fit
  videoUrl: string | null         // optional video pitch
  videoDuration: number | null    // seconds
  // Qualifications highlighted
  highlights: string[]            // ["12 yrs in Nashville", "Brentwood specialist", "97 Comm Score"]
  // Metadata
  status: BidStatus
  submittedAt: string
  responseAt: string | null
}

// ══════════════════════════════════════
// MOCK REFERRAL POSTS (open marketplace)
// ══════════════════════════════════════

export const referralPosts: ReferralPost[] = [
  {
    id: 'rp-1',
    postingAgentId: 'jason',
    postingAgentName: "Jason O'Brien",
    postingAgentBrokerage: 'Real Broker LLC',
    postingAgentColor: '#f0a500',
    clientInitials: 'M.F.',
    representation: 'Buyer',
    budgetRange: '$500k - $700k',
    estimatedPrice: 600000,
    timeline: '90 days',
    market: 'Charlotte, NC',
    neighborhood: 'SouthPark / Ballantyne',
    feePercent: 25,
    commissionRate: 3,
    description: 'I have a family of 4 relocating from Michigan for a corporate transfer. They need an agent who knows the SouthPark or Ballantyne area well — great schools are a must. They\'re pre-approved and ready to move fast once they find the right agent.',
    clientNeeds: ['Pre-approved $700k', 'Family of 4', 'Top-rated schools', '4+ bedrooms', 'Corporate relocation'],
    status: 'open',
    postedAt: '2026-03-15T10:00:00Z',
    expiresAt: '2026-03-29T10:00:00Z',
    bidsCount: 3,
    viewCount: 42,
  },
  {
    id: 'rp-2',
    postingAgentId: 'jason',
    postingAgentName: "Jason O'Brien",
    postingAgentBrokerage: 'Real Broker LLC',
    postingAgentColor: '#f0a500',
    clientInitials: 'R.P.',
    representation: 'Buyer',
    budgetRange: '$800k - $1.2M',
    estimatedPrice: 950000,
    timeline: '120 days',
    market: 'Austin, TX',
    neighborhood: 'Westlake / Lakeway',
    feePercent: 25,
    commissionRate: 3,
    description: 'Retired couple selling their Michigan lake home and relocating to the Austin hill country. They want luxury finishes, a view, and a lower maintenance property. Looking for an agent with luxury and 55+ community experience.',
    clientNeeds: ['Pre-approved $1.2M', 'Retired couple', 'Luxury finishes', 'Hill country views', 'Low maintenance'],
    status: 'open',
    postedAt: '2026-03-14T14:00:00Z',
    expiresAt: '2026-03-28T14:00:00Z',
    bidsCount: 2,
    viewCount: 31,
  },
  {
    id: 'rp-3',
    postingAgentId: 'marcus',
    postingAgentName: 'Marcus Reid',
    postingAgentBrokerage: 'Compass Chicago',
    postingAgentColor: '#818cf8',
    clientInitials: 'T.J.',
    representation: 'Buyer',
    budgetRange: '$250k - $350k',
    estimatedPrice: 300000,
    timeline: '60 days',
    market: 'Grand Rapids, MI',
    neighborhood: 'East Grand Rapids / Ada',
    feePercent: 25,
    commissionRate: 3,
    description: 'Young professional leaving Chicago for a better quality of life. First-time buyer who needs patient guidance through the process. Interested in the East GR / Ada area for the walkability and community feel.',
    clientNeeds: ['First-time buyer', 'Pre-approved $350k', 'Young professional', 'Walkable neighborhood', 'Work from home'],
    status: 'open',
    postedAt: '2026-03-16T09:00:00Z',
    expiresAt: '2026-03-30T09:00:00Z',
    bidsCount: 4,
    viewCount: 56,
  },
  {
    id: 'rp-4',
    postingAgentId: 'ashley',
    postingAgentName: 'Ashley Monroe',
    postingAgentBrokerage: 'Real Broker LLC',
    postingAgentColor: '#f472b6',
    clientInitials: 'K.W.',
    representation: 'Seller',
    budgetRange: '$400k - $500k',
    estimatedPrice: 450000,
    timeline: '45 days',
    market: 'West Michigan',
    neighborhood: 'Plainwell / Otsego',
    feePercent: 25,
    commissionRate: 3,
    description: 'Nashville couple inheriting a property in the Plainwell area. They need a local agent who can assess the property, recommend improvements, and list it. They won\'t be on-site much so the agent needs to be self-sufficient.',
    clientNeeds: ['Inherited property', 'Absentee seller', 'CMA needed', 'Staging advice', 'Self-sufficient agent'],
    status: 'open',
    postedAt: '2026-03-16T11:00:00Z',
    expiresAt: '2026-03-30T11:00:00Z',
    bidsCount: 2,
    viewCount: 28,
  },
  {
    id: 'rp-5',
    postingAgentId: 'rachel',
    postingAgentName: 'Rachel Kim',
    postingAgentBrokerage: "Sotheby's — Beverly Hills",
    postingAgentColor: '#eab308',
    clientInitials: 'S.L.',
    representation: 'Buyer',
    budgetRange: '$1.5M - $2.5M',
    estimatedPrice: 2000000,
    timeline: '180 days',
    market: 'Scottsdale, AZ',
    neighborhood: 'Paradise Valley / Arcadia',
    feePercent: 25,
    commissionRate: 3,
    description: 'Entertainment industry client looking for a winter home in the Paradise Valley area. Ultra-luxury, privacy, and architectural design are top priorities. This client is very particular — need an agent who can handle high expectations and maintain discretion.',
    clientNeeds: ['Ultra-luxury', 'Privacy / gated', 'Architectural design', 'Discreet agent', 'Second home'],
    status: 'open',
    postedAt: '2026-03-13T16:00:00Z',
    expiresAt: '2026-04-13T16:00:00Z',
    bidsCount: 5,
    viewCount: 89,
  },
  // Awarded example
  {
    id: 'rp-6',
    postingAgentId: 'jason',
    postingAgentName: "Jason O'Brien",
    postingAgentBrokerage: 'Real Broker LLC',
    postingAgentColor: '#f0a500',
    clientInitials: 'D.H.',
    representation: 'Buyer',
    budgetRange: '$550k - $800k',
    estimatedPrice: 680000,
    timeline: '60 days',
    market: 'Nashville, TN',
    neighborhood: 'Franklin / Brentwood',
    feePercent: 25,
    commissionRate: 3,
    description: 'Doctor relocating from West Michigan to Nashville for Vanderbilt. Needs someone who knows the Franklin/Brentwood area and can work fast — they start in 90 days.',
    clientNeeds: ['Physician relocation', 'Pre-approved $800k', 'Franklin/Brentwood', 'Quick timeline', '4+ bedrooms'],
    status: 'awarded',
    postedAt: '2026-02-20T10:00:00Z',
    expiresAt: '2026-03-06T10:00:00Z',
    bidsCount: 4,
    viewCount: 67,
    awardedBidId: 'bid-6a',
  },
]

// ══════════════════════════════════════
// MOCK BIDS
// ══════════════════════════════════════

export const referralBids: ReferralBid[] = [
  // Bids on rp-1 (Charlotte)
  {
    id: 'bid-1a',
    postId: 'rp-1',
    agentId: 'michelle',
    agentName: 'Michelle Foster',
    agentBrokerage: 'Compass Charlotte',
    agentColor: '#e879f9',
    agentReferNetScore: 86,
    agentClosedReferrals: 7,
    agentResponseTime: '< 1hr',
    pitch: "Jason — I'm your Charlotte person. I've handled 14 corporate relocations in the SouthPark/Ballantyne corridor this year alone. I know every school district boundary, every new development, and every hidden pocket neighborhood. Your family will be in great hands. I'll have a curated list of homes ready before they even land in Charlotte.",
    videoUrl: '/videos/bid-michelle-charlotte.mp4',
    videoDuration: 74,
    highlights: ['14 corporate relocations this year', 'SouthPark specialist', 'Compass Concierge available', '86 ReferNet Score'],
    status: 'pending',
    submittedAt: '2026-03-15T14:00:00Z',
    responseAt: null,
  },
  {
    id: 'bid-1b',
    postId: 'rp-1',
    agentId: 'ryan_h',
    agentName: 'Ryan Harper',
    agentBrokerage: 'eXp Realty — Raleigh',
    agentColor: '#60a5fa',
    agentReferNetScore: 87,
    agentClosedReferrals: 9,
    agentResponseTime: '< 1hr',
    pitch: "I service both Raleigh and the southern Charlotte suburbs. While I'm based in Raleigh, I've closed 6 deals in the Ballantyne area in the past 12 months. Happy to share references from those clients. I specialize in helping families find the right school district match.",
    videoUrl: null,
    videoDuration: null,
    highlights: ['6 Ballantyne closings in 12 months', 'School district expert', '87 ReferNet Score'],
    status: 'pending',
    submittedAt: '2026-03-15T18:00:00Z',
    responseAt: null,
  },
  {
    id: 'bid-1c',
    postId: 'rp-1',
    agentId: 'real_clt1',
    agentName: 'Jordan Blake',
    agentBrokerage: 'Real Broker LLC — Charlotte',
    agentColor: '#22c55e',
    agentReferNetScore: 87,
    agentClosedReferrals: 8,
    agentResponseTime: '< 1hr',
    pitch: "As a Real Broker agent like yourself, we already share the same platform and values. I've been in SouthPark for 9 years and my kids go to the top-rated schools in the area — I literally live your client's dream. Let me show them why Charlotte is the right move.",
    videoUrl: '/videos/bid-jordan-charlotte.mp4',
    videoDuration: 62,
    highlights: ['Same brokerage — Real Broker', '9 years in SouthPark', 'Kids in local schools', '87 ReferNet Score'],
    status: 'pending',
    submittedAt: '2026-03-16T08:00:00Z',
    responseAt: null,
  },

  // Bids on rp-3 (Grand Rapids)
  {
    id: 'bid-3a',
    postId: 'rp-3',
    agentId: 'megan',
    agentName: 'Megan Torres',
    agentBrokerage: 'KW Grand Rapids',
    agentColor: '#ef4444',
    agentReferNetScore: 91,
    agentClosedReferrals: 10,
    agentResponseTime: '< 30min',
    pitch: "Marcus, I'm the #1 agent in East Grand Rapids for the past 3 years running. I specialize in helping young professionals find their first home in walkable neighborhoods. I'll set your client up with a neighborhood tour and connect them with the community before they even move. This is my bread and butter.",
    videoUrl: '/videos/bid-megan-gr.mp4',
    videoDuration: 85,
    highlights: ['#1 in East GR 3 years', 'First-time buyer specialist', '91 ReferNet Score', '< 30min response'],
    status: 'pending',
    submittedAt: '2026-03-16T10:00:00Z',
    responseAt: null,
  },
  {
    id: 'bid-3b',
    postId: 'rp-3',
    agentId: 'jason',
    agentName: "Jason O'Brien",
    agentBrokerage: 'Real Broker LLC',
    agentColor: '#f0a500',
    agentReferNetScore: 92,
    agentClosedReferrals: 8,
    agentResponseTime: '< 1hr',
    pitch: "Hey Marcus — the Ada/East GR area is adjacent to my territory. I work with a lot of young buyers coming from bigger cities and I know exactly how to manage expectations on Michigan pricing vs Chicago pricing. Happy to do a Zoom call to talk through my process.",
    videoUrl: '/videos/bid-jason-gr.mp4',
    videoDuration: 58,
    highlights: ['Adjacent territory expert', 'Chicago-to-MI relocation experience', '92 ReferNet Score', 'Homes for Heroes certified'],
    status: 'pending',
    submittedAt: '2026-03-16T11:30:00Z',
    responseAt: null,
  },

  // Bids on rp-5 (Scottsdale luxury)
  {
    id: 'bid-5a',
    postId: 'rp-5',
    agentId: 'darius',
    agentName: 'Darius King',
    agentBrokerage: 'Real Broker LLC — Arizona',
    agentColor: '#d97706',
    agentReferNetScore: 91,
    agentClosedReferrals: 11,
    agentResponseTime: '< 1hr',
    pitch: "Rachel — Paradise Valley is my specialty. I've closed $47M in luxury transactions in the PV/Arcadia corridor over the past 2 years. I understand the privacy requirements and I have off-market inventory access through my builder relationships. I can send your client pocket listings that never hit the MLS.",
    videoUrl: '/videos/bid-darius-pv.mp4',
    videoDuration: 92,
    highlights: ['$47M in PV luxury sales', 'Off-market inventory access', 'Builder relationships', '91 ReferNet Score'],
    status: 'pending',
    submittedAt: '2026-03-14T10:00:00Z',
    responseAt: null,
  },
  {
    id: 'bid-5b',
    postId: 'rp-5',
    agentId: 'patricia',
    agentName: 'Patricia Owens',
    agentBrokerage: 'BHHS — Scottsdale',
    agentColor: '#7c3aed',
    agentReferNetScore: 92,
    agentClosedReferrals: 14,
    agentResponseTime: '< 1hr',
    pitch: "This is exactly my wheelhouse. I represent 80% of the gated estate communities in Paradise Valley. My clients include several entertainment industry professionals who value discretion. I signed an NDA with every one of them. Your client will feel at home with my approach.",
    videoUrl: '/videos/bid-patricia-pv.mp4',
    videoDuration: 78,
    highlights: ['80% PV gated communities', 'Entertainment industry clients', 'NDA-standard discretion', '92 ReferNet Score'],
    status: 'pending',
    submittedAt: '2026-03-14T12:00:00Z',
    responseAt: null,
  },

  // Awarded bid on rp-6 (Nashville — already completed)
  {
    id: 'bid-6a',
    postId: 'rp-6',
    agentId: 'ashley',
    agentName: 'Ashley Monroe',
    agentBrokerage: 'Real Broker LLC — Nashville',
    agentColor: '#f472b6',
    agentReferNetScore: 95,
    agentClosedReferrals: 14,
    agentResponseTime: '< 30min',
    pitch: "Jason! You know I'm your Nashville girl. I've handled 3 physician relocations in Franklin/Brentwood this quarter alone. I have a curated list of 12 homes in their price range ready to go. Let's get them scheduled for a VIP showing weekend.",
    videoUrl: '/videos/bid-ashley-nash.mp4',
    videoDuration: 55,
    highlights: ['3 physician relocations this quarter', '12 homes ready to show', 'Franklin/Brentwood specialist', '95 ReferNet Score'],
    status: 'accepted',
    submittedAt: '2026-02-20T14:00:00Z',
    responseAt: '2026-02-21T09:00:00Z',
  },
]

// ── Helpers ──

export function getOpenPosts(): ReferralPost[] {
  return referralPosts
    .filter((p) => p.status === 'open')
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
}

export function getPostsByAgent(agentId: string): ReferralPost[] {
  return referralPosts
    .filter((p) => p.postingAgentId === agentId)
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
}

export function getPostsByMarket(market: string): ReferralPost[] {
  return referralPosts
    .filter((p) => p.status === 'open' && p.market.toLowerCase().includes(market.toLowerCase()))
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
}

export function getBidsForPost(postId: string): ReferralBid[] {
  return referralBids
    .filter((b) => b.postId === postId)
    .sort((a, b) => b.agentReferNetScore - a.agentReferNetScore)
}

export function getBidsByAgent(agentId: string): ReferralBid[] {
  return referralBids
    .filter((b) => b.agentId === agentId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
}

export function getMyBidsOnPost(postId: string, agentId: string): ReferralBid | null {
  return referralBids.find((b) => b.postId === postId && b.agentId === agentId) ?? null
}

export function getAwardedBid(post: ReferralPost): ReferralBid | null {
  if (!post.awardedBidId) return null
  return referralBids.find((b) => b.id === post.awardedBidId) ?? null
}

/** Format relative time ago */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}
