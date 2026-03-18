import { agents } from './agents'

// ══════════════════════════════════════
// Mentor Specializations
// ══════════════════════════════════════
export const mentorSpecializations = [
  'Luxury Market',
  'First-Time Buyers',
  'Investment Properties',
  'Referral Network Building',
  'Negotiation',
  'Lead Generation',
  'New Construction',
  'Relocation',
] as const

export type MentorSpecialization = (typeof mentorSpecializations)[number]

// ══════════════════════════════════════
// Mentor Profile
// ══════════════════════════════════════
export interface MentorProfile {
  agentId: string
  name: string
  brokerage: string
  area: string
  color: string
  referNetScore: number
  yearsLicensed: number
  dealsPerYear: number
  specializations: MentorSpecialization[]
  capacity: number
  activeMentees: number
  available: boolean
  bio: string
}

// ══════════════════════════════════════
// Available Mentors — 10+ years, 85+ ReferNet
// ══════════════════════════════════════
export const availableMentors: MentorProfile[] = [
  {
    agentId: 'tanya',
    name: 'Tanya Hill',
    brokerage: 'BHHS Harry Norman — Atlanta',
    area: 'Atlanta Metro, GA',
    color: '#c084fc',
    referNetScore: 96,
    yearsLicensed: 16,
    dealsPerYear: 93,
    specializations: ['Luxury Market', 'Referral Network Building', 'Negotiation'],
    capacity: 3,
    activeMentees: 2,
    available: true,
    bio: 'Passionate about helping new agents build sustainable referral-based businesses. 16 years of luxury market expertise.',
  },
  {
    agentId: 'rachel',
    name: 'Rachel Kim',
    brokerage: "Sotheby's — Beverly Hills",
    area: 'Los Angeles Metro, CA',
    color: '#eab308',
    referNetScore: 97,
    yearsLicensed: 16,
    dealsPerYear: 95,
    specializations: ['Luxury Market', 'Investment Properties', 'Negotiation'],
    capacity: 2,
    activeMentees: 1,
    available: true,
    bio: 'Top-producing luxury agent offering mentorship in high-end transactions and client relationship management.',
  },
  {
    agentId: 'marcus',
    name: 'Marcus Reid',
    brokerage: 'Compass Chicago',
    area: 'Chicago Metro, IL',
    color: '#818cf8',
    referNetScore: 94,
    yearsLicensed: 15,
    dealsPerYear: 88,
    specializations: ['Referral Network Building', 'Investment Properties', 'Lead Generation'],
    capacity: 3,
    activeMentees: 1,
    available: true,
    bio: 'Built a 16-agent referral network from scratch. Happy to share strategies for scaling your business through partnerships.',
  },
  {
    agentId: 'carlos',
    name: 'Carlos Vega',
    brokerage: 'RE/MAX — Dallas',
    area: 'Dallas / Fort Worth, TX',
    color: '#f43f5e',
    referNetScore: 94,
    yearsLicensed: 17,
    dealsPerYear: 102,
    specializations: ['New Construction', 'Lead Generation', 'Investment Properties'],
    capacity: 4,
    activeMentees: 2,
    available: true,
    bio: '100+ deals a year and counting. I mentor agents on volume-based business models and new construction pipelines.',
  },
  {
    agentId: 'elena',
    name: 'Elena Vasquez',
    brokerage: 'Compass — Miami',
    area: 'Miami Metro, FL',
    color: '#16a34a',
    referNetScore: 95,
    yearsLicensed: 15,
    dealsPerYear: 91,
    specializations: ['Luxury Market', 'Relocation', 'Referral Network Building'],
    capacity: 3,
    activeMentees: 2,
    available: true,
    bio: 'Specializing in international relocation and luxury waterfront properties. Love helping agents break into the luxury tier.',
  },
  {
    agentId: 'ashley',
    name: 'Ashley Monroe',
    brokerage: 'Real Broker LLC — Nashville',
    area: 'Nashville Metro, TN',
    color: '#f472b6',
    referNetScore: 95,
    yearsLicensed: 13,
    dealsPerYear: 74,
    specializations: ['Relocation', 'New Construction', 'First-Time Buyers'],
    capacity: 2,
    activeMentees: 1,
    available: true,
    bio: 'Nashville market expert with deep relocation experience. I help agents master the art of relocation referrals.',
  },
  {
    agentId: 'victoria',
    name: 'Victoria Blake',
    brokerage: "Sotheby's — Aspen",
    area: 'Aspen, CO',
    color: '#0d9488',
    referNetScore: 98,
    yearsLicensed: 20,
    dealsPerYear: 28,
    specializations: ['Luxury Market', 'Negotiation', 'Referral Network Building'],
    capacity: 2,
    activeMentees: 0,
    available: true,
    bio: '20 years in ultra-luxury resort markets. I mentor on high-touch client service and negotiation at the top tier.',
  },
  {
    agentId: 'steve',
    name: 'Steve Nakamura',
    brokerage: 'Keller Williams — San Diego',
    area: 'San Diego Metro, CA',
    color: '#ef4444',
    referNetScore: 91,
    yearsLicensed: 14,
    dealsPerYear: 72,
    specializations: ['Investment Properties', 'Lead Generation', 'Relocation'],
    capacity: 3,
    activeMentees: 1,
    available: true,
    bio: 'Investor-focused agent with a proven lead generation system. I teach agents how to build consistent deal flow.',
  },
  {
    agentId: 'james_w',
    name: 'James Wellington',
    brokerage: "Sotheby's — Palm Beach",
    area: 'Palm Beach, FL',
    color: '#0f766e',
    referNetScore: 96,
    yearsLicensed: 16,
    dealsPerYear: 42,
    specializations: ['Luxury Market', 'Investment Properties', 'Negotiation'],
    capacity: 2,
    activeMentees: 1,
    available: true,
    bio: 'Palm Beach luxury specialist. I help agents learn how to service ultra-high-net-worth clients with excellence.',
  },
  {
    agentId: 'patricia',
    name: 'Patricia Owens',
    brokerage: 'BHHS — Scottsdale',
    area: 'Scottsdale, AZ',
    color: '#7c3aed',
    referNetScore: 92,
    yearsLicensed: 18,
    dealsPerYear: 54,
    specializations: ['Luxury Market', 'First-Time Buyers', 'Referral Network Building'],
    capacity: 3,
    activeMentees: 1,
    available: true,
    bio: '18 years of real estate experience across all price points. I enjoy helping agents find their niche and grow.',
  },
]

// ══════════════════════════════════════
// Mentorship type
// ══════════════════════════════════════
export type MentorshipStatus = 'pending' | 'active' | 'declined' | 'completed'

export interface Mentorship {
  id: string
  mentorId: string
  mentorName: string
  menteeId: string
  menteeName: string
  status: MentorshipStatus
  specialization: MentorSpecialization
  message: string
  startedAt: string | null
  createdAt: string
}

// ══════════════════════════════════════
// Existing Mentorships — Jason has a mentor
// ══════════════════════════════════════
export const existingMentorships: Mentorship[] = [
  {
    id: 'ms-1',
    mentorId: 'marcus',
    mentorName: 'Marcus Reid',
    menteeId: 'jason',
    menteeName: "Jason Smith",
    status: 'active',
    specialization: 'Referral Network Building',
    message: 'I want to grow my referral network beyond Michigan. Marcus has the network I aspire to build.',
    startedAt: '2026-01-15',
    createdAt: '2026-01-10',
  },
  {
    id: 'ms-2',
    mentorId: 'ashley',
    mentorName: 'Ashley Monroe',
    menteeId: 'jason',
    menteeName: "Jason Smith",
    status: 'active',
    specialization: 'Relocation',
    message: 'Looking to learn relocation referral strategies for agents moving to/from West Michigan.',
    startedAt: '2026-02-01',
    createdAt: '2026-01-28',
  },
  {
    id: 'ms-3',
    mentorId: 'tanya',
    mentorName: 'Tanya Hill',
    menteeId: 'derek',
    menteeName: 'Derek Chung',
    status: 'active',
    specialization: 'Negotiation',
    message: 'I admire Tanya\'s negotiation skills and want to sharpen mine.',
    startedAt: '2026-02-10',
    createdAt: '2026-02-05',
  },
  {
    id: 'ms-4',
    mentorId: 'carlos',
    mentorName: 'Carlos Vega',
    menteeId: 'omar',
    menteeName: 'Omar Hassan',
    status: 'pending',
    specialization: 'Lead Generation',
    message: 'Want to learn how Carlos generates 100+ deals per year. Excited to apply his methods in Minneapolis.',
    startedAt: null,
    createdAt: '2026-03-10',
  },
]

// ══════════════════════════════════════
// Helper functions
// ══════════════════════════════════════

/** Get mentor profile by agent ID */
export function getMentorProfile(agentId: string): MentorProfile | undefined {
  return availableMentors.find((m) => m.agentId === agentId)
}

/** Get mentorships where agent is mentor or mentee */
export function getMentorshipsByAgent(agentId: string): Mentorship[] {
  return existingMentorships.filter(
    (m) => m.mentorId === agentId || m.menteeId === agentId
  )
}
