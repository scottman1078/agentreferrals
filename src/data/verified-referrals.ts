export interface VerifiedReferral {
  id: string
  submitterId: string
  partnerEmail: string
  partnerId: string | null
  partnerName: string
  direction: 'sent' | 'received'
  clientName: string
  market: string
  salePrice: number
  referralFeePercent: number
  closeDate: string
  status: 'pending' | 'verified' | 'disputed'
  verifiedAt: string | null
  inviteSent: boolean
}

// Jason's verified referral history
export const verifiedReferrals: VerifiedReferral[] = [
  // ── VERIFIED (5) — partner confirmed ──
  {
    id: 'vr-001',
    submitterId: 'jason',
    partnerEmail: 'amonroe@realbrokerage.com',
    partnerId: 'ashley',
    partnerName: 'Ashley Monroe',
    direction: 'sent',
    clientName: 'Martinez Family',
    market: 'Nashville, TN',
    salePrice: 620000,
    referralFeePercent: 25,
    closeDate: '2025-09-15',
    status: 'verified',
    verifiedAt: '2025-09-20T14:30:00Z',
    inviteSent: true,
  },
  {
    id: 'vr-002',
    submitterId: 'jason',
    partnerEmail: 'derek.chung@realbrokerage.com',
    partnerId: 'derek',
    partnerName: 'Derek Chung',
    direction: 'sent',
    clientName: 'Dr. Hoffman',
    market: 'Holland, MI',
    salePrice: 580000,
    referralFeePercent: 25,
    closeDate: '2025-06-10',
    status: 'verified',
    verifiedAt: '2025-06-15T10:00:00Z',
    inviteSent: true,
  },
  {
    id: 'vr-003',
    submitterId: 'jason',
    partnerEmail: 'megan.torres@kwgr.com',
    partnerId: 'megan',
    partnerName: 'Megan Torres',
    direction: 'received',
    clientName: 'Sarah K.',
    market: 'Plainwell, MI',
    salePrice: 265000,
    referralFeePercent: 25,
    closeDate: '2025-04-28',
    status: 'verified',
    verifiedAt: '2025-05-02T09:15:00Z',
    inviteSent: true,
  },
  {
    id: 'vr-004',
    submitterId: 'jason',
    partnerEmail: 'dking@realbrokerage.com',
    partnerId: 'darius',
    partnerName: 'Darius King',
    direction: 'sent',
    clientName: 'Watts Couple',
    market: 'Scottsdale, AZ',
    salePrice: 785000,
    referralFeePercent: 25,
    closeDate: '2025-08-01',
    status: 'verified',
    verifiedAt: '2025-08-05T16:20:00Z',
    inviteSent: true,
  },
  {
    id: 'vr-005',
    submitterId: 'jason',
    partnerEmail: 'ncruz@realbrokerage.com',
    partnerId: 'natalie',
    partnerName: 'Natalie Cruz',
    direction: 'received',
    clientName: 'R. Thompson',
    market: 'Las Vegas, NV',
    salePrice: 410000,
    referralFeePercent: 25,
    closeDate: '2024-11-22',
    status: 'verified',
    verifiedAt: '2024-11-28T11:45:00Z',
    inviteSent: true,
  },

  // ── PENDING (4) — invite sent, waiting ──
  {
    id: 'vr-006',
    submitterId: 'jason',
    partnerEmail: 'carlos.vega@remax.com',
    partnerId: null,
    partnerName: 'Carlos Vega',
    direction: 'received',
    clientName: 'Henderson Family',
    market: 'West Michigan',
    salePrice: 395000,
    referralFeePercent: 25,
    closeDate: '2025-12-20',
    status: 'pending',
    verifiedAt: null,
    inviteSent: true,
  },
  {
    id: 'vr-007',
    submitterId: 'jason',
    partnerEmail: 'lpark@realbrokerage.com',
    partnerId: null,
    partnerName: 'Lily Park',
    direction: 'sent',
    clientName: 'Patricia N.',
    market: 'Denver, CO',
    salePrice: 710000,
    referralFeePercent: 25,
    closeDate: '2025-07-05',
    status: 'pending',
    verifiedAt: null,
    inviteSent: true,
  },
  {
    id: 'vr-008',
    submitterId: 'jason',
    partnerEmail: 'mreid@compass.com',
    partnerId: null,
    partnerName: 'Marcus Reid',
    direction: 'sent',
    clientName: 'J. Morrison',
    market: 'Chicago, IL',
    salePrice: 890000,
    referralFeePercent: 25,
    closeDate: '2026-01-15',
    status: 'pending',
    verifiedAt: null,
    inviteSent: true,
  },
  {
    id: 'vr-009',
    submitterId: 'jason',
    partnerEmail: 'bwalsh@exp.com',
    partnerId: null,
    partnerName: 'Brendan Walsh',
    direction: 'sent',
    clientName: 'K. Lawson',
    market: 'Boston, MA',
    salePrice: 1150000,
    referralFeePercent: 25,
    closeDate: '2026-02-28',
    status: 'pending',
    verifiedAt: null,
    inviteSent: true,
  },

  // ── MIXED — 3 more for variety ──
  {
    id: 'vr-010',
    submitterId: 'jason',
    partnerEmail: 'treyes@realbrokerage.com',
    partnerId: 'tomas',
    partnerName: 'Tomás Reyes',
    direction: 'sent',
    clientName: 'A. Dominguez',
    market: 'San Antonio, TX',
    salePrice: 310000,
    referralFeePercent: 25,
    closeDate: '2024-08-14',
    status: 'verified',
    verifiedAt: '2024-08-20T08:00:00Z',
    inviteSent: true,
  },
  {
    id: 'vr-011',
    submitterId: 'jason',
    partnerEmail: 'priya.nair@coldwellbanker.com',
    partnerId: null,
    partnerName: 'Priya Nair',
    direction: 'sent',
    clientName: 'Chen-Williams',
    market: 'Kalamazoo, MI',
    salePrice: 295000,
    referralFeePercent: 25,
    closeDate: '2025-05-30',
    status: 'pending',
    verifiedAt: null,
    inviteSent: true,
  },
  {
    id: 'vr-012',
    submitterId: 'jason',
    partnerEmail: 'carla.mendez@kw.com',
    partnerId: null,
    partnerName: 'Carla Mendez',
    direction: 'received',
    clientName: 'M. Patterson',
    market: 'Lansing, MI',
    salePrice: 275000,
    referralFeePercent: 25,
    closeDate: '2026-03-10',
    status: 'pending',
    verifiedAt: null,
    inviteSent: true,
  },
]

// ── Helpers ──

export function getVerifiedReferrals(agentId: string): VerifiedReferral[] {
  return verifiedReferrals.filter(
    (r) => r.submitterId === agentId || r.partnerId === agentId
  )
}

export function getVerifiedCount(agentId: string): number {
  return getVerifiedReferrals(agentId).filter((r) => r.status === 'verified').length
}

export function getPendingCount(agentId: string): number {
  return getVerifiedReferrals(agentId).filter((r) => r.status === 'pending').length
}
