import type { AgentNeedingPartner, CoverageGapOpportunity, PartnershipRequest } from '@/types'

// ══════════════════════════════════════
// AGENTS WHO NEED YOU (inbound opportunities)
// These are agents from across the country who do NOT have
// a referral partner in Plainwell / Allegan County, MI
// (Jason O'Brien's territory)
// Sorted by referNetScore descending
// ══════════════════════════════════════

export const agentsNeedingPartner: AgentNeedingPartner[] = [
  {
    id: 'anp-1', name: 'Carlos Vega', brokerage: 'RE/MAX — Dallas', brokerageId: 'remax',
    area: 'Dallas / Fort Worth, TX', dealsPerYear: 102, avgSalePrice: 780000,
    referNetScore: 94, responseTime: '< 30min', closedReferrals: 15, color: '#f43f5e',
    tags: ['Luxury', 'New Construction', 'Investment'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-2', name: 'Rachel Kim', brokerage: "Sotheby's — Beverly Hills", brokerageId: 'sothebys',
    area: 'Los Angeles Metro, CA', dealsPerYear: 95, avgSalePrice: 1650000,
    referNetScore: 97, responseTime: '< 30min', closedReferrals: 22, color: '#eab308',
    tags: ['Luxury', 'Investment'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-3', name: 'Tanya Hill', brokerage: 'BHHS Harry Norman — Atlanta', brokerageId: 'bhhs',
    area: 'Atlanta Metro, GA', dealsPerYear: 93, avgSalePrice: 685000,
    referNetScore: 96, responseTime: '< 30min', closedReferrals: 18, color: '#c084fc',
    tags: ['Luxury', 'Relocation', 'Investment'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-4', name: 'Ashley Monroe', brokerage: 'Real Broker LLC — Nashville', brokerageId: 'real',
    area: 'Nashville Metro, TN', dealsPerYear: 74, avgSalePrice: 595000,
    referNetScore: 95, responseTime: '< 30min', closedReferrals: 14, color: '#f472b6',
    tags: ['Relocation', 'New Construction', 'Luxury'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-5', name: 'Marcus Reid', brokerage: 'Compass Chicago', brokerageId: 'compass',
    area: 'Chicago Metro, IL', dealsPerYear: 88, avgSalePrice: 615000,
    referNetScore: 94, responseTime: '< 30min', closedReferrals: 16, color: '#818cf8',
    tags: ['Luxury', 'Investment', 'Relocation'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-6', name: 'Brendan Walsh', brokerage: "Sotheby's — Boston", brokerageId: 'sothebys',
    area: 'Boston Metro, MA', dealsPerYear: 71, avgSalePrice: 890000,
    referNetScore: 93, responseTime: '< 1hr', closedReferrals: 13, color: '#7c3aed',
    tags: ['Luxury', 'Investment'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-7', name: 'Steve Nakamura', brokerage: 'Keller Williams — San Diego', brokerageId: 'kw',
    area: 'San Diego, CA', dealsPerYear: 72, avgSalePrice: 875000,
    referNetScore: 91, responseTime: '< 30min', closedReferrals: 13, color: '#ef4444',
    tags: ['Luxury', 'Investment', 'Relocation'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-8', name: 'James Whitfield', brokerage: 'eXp Realty — Orlando', brokerageId: 'exp',
    area: 'Orlando / Central FL', dealsPerYear: 79, avgSalePrice: 445000,
    referNetScore: 91, responseTime: '< 1hr', closedReferrals: 12, color: '#06b6d4',
    tags: ['Investment', 'New Construction', 'Relocation'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-9', name: 'Sofia Chen', brokerage: 'RE/MAX — Seattle', brokerageId: 'remax',
    area: 'Seattle / Bellevue, WA', dealsPerYear: 82, avgSalePrice: 920000,
    referNetScore: 90, responseTime: '< 1hr', closedReferrals: 11, color: '#14b8a6',
    tags: ['Luxury', 'Investment', 'New Construction'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-10', name: 'Diana Patel', brokerage: 'eXp Realty — Houston', brokerageId: 'exp',
    area: 'Houston Metro, TX', dealsPerYear: 63, avgSalePrice: 365000,
    referNetScore: 89, responseTime: '< 1hr', closedReferrals: 10, color: '#2563eb',
    tags: ['Investment', 'New Construction', 'First-Time Buyers'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-11', name: 'Priscilla Hunt', brokerage: 'Coldwell Banker — NYC', brokerageId: 'coldwell',
    area: 'New York City Metro', dealsPerYear: 118, avgSalePrice: 2100000,
    referNetScore: 88, responseTime: '< 2hr', closedReferrals: 9, color: '#dc2626',
    tags: ['Luxury', 'Investment', 'Relocation'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-12', name: 'Ryan Harper', brokerage: 'eXp Realty — Raleigh', brokerageId: 'exp',
    area: 'Raleigh / Durham, NC', dealsPerYear: 56, avgSalePrice: 440000,
    referNetScore: 87, responseTime: '< 1hr', closedReferrals: 9, color: '#60a5fa',
    tags: ['New Construction', 'Relocation'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-13', name: 'Omar Hassan', brokerage: 'eXp Realty — Minneapolis', brokerageId: 'exp',
    area: 'Minneapolis / St. Paul, MN', dealsPerYear: 55, avgSalePrice: 420000,
    referNetScore: 87, responseTime: '< 2hr', closedReferrals: 8, color: '#38bdf8',
    tags: ['Relocation', 'First-Time Buyers'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-14', name: 'Michelle Foster', brokerage: 'Compass Charlotte', brokerageId: 'compass',
    area: 'Charlotte Metro, NC', dealsPerYear: 58, avgSalePrice: 510000,
    referNetScore: 86, responseTime: '< 1hr', closedReferrals: 7, color: '#e879f9',
    tags: ['Relocation', 'New Construction', 'Luxury'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-15', name: 'Rick Santos', brokerage: 'Coldwell Banker — Miami', brokerageId: 'coldwell',
    area: 'Miami / Broward, FL', dealsPerYear: 84, avgSalePrice: 1100000,
    referNetScore: 85, responseTime: '< 2hr', closedReferrals: 7, color: '#fb7185',
    tags: ['Luxury', 'Investment', 'Relocation'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-16', name: 'Nina Rodriguez', brokerage: 'Keller Williams — Austin', brokerageId: 'kw',
    area: 'Austin / Travis County, TX', dealsPerYear: 58, avgSalePrice: 480000,
    referNetScore: 84, responseTime: '< 1hr', closedReferrals: 7, color: '#dc2626',
    tags: ['First-Time Buyers', 'New Construction', 'Relocation'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
  {
    id: 'anp-17', name: 'Tamara Wilson', brokerage: 'eXp Realty — Tampa', brokerageId: 'exp',
    area: 'Tampa / St. Pete, FL', dealsPerYear: 49, avgSalePrice: 385000,
    referNetScore: 83, responseTime: '< 2hr', closedReferrals: 6, color: '#3b82f6',
    tags: ['Relocation', 'Investment', 'First-Time Buyers'],
    missingMarket: 'Plainwell / Allegan County, MI',
  },
]

// ══════════════════════════════════════
// YOUR COVERAGE GAPS (outbound needs)
// Markets where Jason O'Brien doesn't have a partner yet,
// with suggested agents in each market
// ══════════════════════════════════════

export const coverageGapOpportunities: CoverageGapOpportunity[] = [
  {
    id: 'gap-1',
    market: 'Dallas / Fort Worth',
    state: 'TX',
    migrationTrend: 'High',
    suggestedAgents: [
      {
        id: 'sa-1', name: 'Carlos Vega', brokerage: 'RE/MAX — Dallas', brokerageId: 'remax',
        area: 'Dallas / Fort Worth, TX', dealsPerYear: 102, avgSalePrice: 780000,
        referNetScore: 94, responseTime: '< 30min', closedReferrals: 15, color: '#f43f5e',
        tags: ['Luxury', 'New Construction', 'Investment'],
      },
      {
        id: 'sa-2', name: 'Jenna Brooks', brokerage: 'Compass — Dallas', brokerageId: 'compass',
        area: 'Plano / Frisco, TX', dealsPerYear: 67, avgSalePrice: 520000,
        referNetScore: 88, responseTime: '< 1hr', closedReferrals: 9, color: '#f97316',
        tags: ['New Construction', 'Relocation'],
      },
    ],
  },
  {
    id: 'gap-2',
    market: 'Los Angeles Metro',
    state: 'CA',
    migrationTrend: 'High',
    suggestedAgents: [
      {
        id: 'sa-3', name: 'Rachel Kim', brokerage: "Sotheby's — Beverly Hills", brokerageId: 'sothebys',
        area: 'Los Angeles Metro, CA', dealsPerYear: 95, avgSalePrice: 1650000,
        referNetScore: 97, responseTime: '< 30min', closedReferrals: 22, color: '#eab308',
        tags: ['Luxury', 'Investment'],
      },
      {
        id: 'sa-4', name: 'Andre Mitchell', brokerage: 'Keller Williams — LA', brokerageId: 'kw',
        area: 'West LA / Santa Monica', dealsPerYear: 58, avgSalePrice: 1250000,
        referNetScore: 85, responseTime: '< 1hr', closedReferrals: 7, color: '#ef4444',
        tags: ['Luxury', 'Relocation'],
      },
    ],
  },
  {
    id: 'gap-3',
    market: 'Atlanta Metro',
    state: 'GA',
    migrationTrend: 'High',
    suggestedAgents: [
      {
        id: 'sa-5', name: 'Tanya Hill', brokerage: 'BHHS Harry Norman — Atlanta', brokerageId: 'bhhs',
        area: 'Atlanta Metro, GA', dealsPerYear: 93, avgSalePrice: 685000,
        referNetScore: 96, responseTime: '< 30min', closedReferrals: 18, color: '#c084fc',
        tags: ['Luxury', 'Relocation', 'Investment'],
      },
      {
        id: 'sa-6', name: 'Sandra Mitchell', brokerage: 'Coldwell Banker — Atlanta', brokerageId: 'coldwell',
        area: 'Buckhead / Midtown, GA', dealsPerYear: 53, avgSalePrice: 620000,
        referNetScore: 85, responseTime: '< 1hr', closedReferrals: 8, color: '#4f46e5',
        tags: ['Luxury', 'Relocation'],
      },
    ],
  },
  {
    id: 'gap-4',
    market: 'Orlando / Central FL',
    state: 'FL',
    migrationTrend: 'High',
    suggestedAgents: [
      {
        id: 'sa-7', name: 'James Whitfield', brokerage: 'eXp Realty — Orlando', brokerageId: 'exp',
        area: 'Orlando / Central FL', dealsPerYear: 79, avgSalePrice: 445000,
        referNetScore: 91, responseTime: '< 1hr', closedReferrals: 12, color: '#06b6d4',
        tags: ['Investment', 'New Construction', 'Relocation'],
      },
    ],
  },
  {
    id: 'gap-5',
    market: 'Phoenix / Scottsdale',
    state: 'AZ',
    migrationTrend: 'Medium',
    suggestedAgents: [
      {
        id: 'sa-8', name: 'Darius King', brokerage: 'Real Broker LLC — Arizona', brokerageId: 'real',
        area: 'Phoenix / Scottsdale, AZ', dealsPerYear: 86, avgSalePrice: 620000,
        referNetScore: 91, responseTime: '< 1hr', closedReferrals: 11, color: '#d97706',
        tags: ['New Construction', 'Relocation', 'Investment'],
      },
      {
        id: 'sa-9', name: 'Patricia Owens', brokerage: 'BHHS — Scottsdale', brokerageId: 'bhhs',
        area: 'Scottsdale / Paradise Valley, AZ', dealsPerYear: 54, avgSalePrice: 1200000,
        referNetScore: 92, responseTime: '< 1hr', closedReferrals: 14, color: '#7c3aed',
        tags: ['Luxury', 'Land & Acreage'],
      },
    ],
  },
  {
    id: 'gap-6',
    market: 'Charlotte Metro',
    state: 'NC',
    migrationTrend: 'Medium',
    suggestedAgents: [
      {
        id: 'sa-10', name: 'Michelle Foster', brokerage: 'Compass Charlotte', brokerageId: 'compass',
        area: 'Charlotte Metro, NC', dealsPerYear: 58, avgSalePrice: 510000,
        referNetScore: 86, responseTime: '< 1hr', closedReferrals: 7, color: '#e879f9',
        tags: ['Relocation', 'New Construction', 'Luxury'],
      },
    ],
  },
  {
    id: 'gap-7',
    market: 'Seattle / Bellevue',
    state: 'WA',
    migrationTrend: 'Medium',
    suggestedAgents: [
      {
        id: 'sa-11', name: 'Sofia Chen', brokerage: 'RE/MAX — Seattle', brokerageId: 'remax',
        area: 'Seattle / Bellevue, WA', dealsPerYear: 82, avgSalePrice: 920000,
        referNetScore: 90, responseTime: '< 1hr', closedReferrals: 11, color: '#14b8a6',
        tags: ['Luxury', 'Investment', 'New Construction'],
      },
      {
        id: 'sa-12', name: 'Daniel Kim', brokerage: 'Compass — Seattle', brokerageId: 'compass',
        area: 'Bellevue / Eastside, WA', dealsPerYear: 67, avgSalePrice: 1050000,
        referNetScore: 88, responseTime: '< 1hr', closedReferrals: 8, color: '#15803d',
        tags: ['Luxury', 'New Construction'],
      },
    ],
  },
  {
    id: 'gap-8',
    market: 'Boston Metro',
    state: 'MA',
    migrationTrend: 'Low',
    suggestedAgents: [
      {
        id: 'sa-13', name: 'Brendan Walsh', brokerage: "Sotheby's — Boston", brokerageId: 'sothebys',
        area: 'Boston Metro, MA', dealsPerYear: 71, avgSalePrice: 890000,
        referNetScore: 93, responseTime: '< 1hr', closedReferrals: 13, color: '#7c3aed',
        tags: ['Luxury', 'Investment'],
      },
    ],
  },
  {
    id: 'gap-9',
    market: 'Salt Lake City / Park City',
    state: 'UT',
    migrationTrend: 'Medium',
    suggestedAgents: [
      {
        id: 'sa-14', name: 'Robert Lee', brokerage: 'Coldwell Banker — Salt Lake', brokerageId: 'coldwell',
        area: 'Salt Lake City / Park City, UT', dealsPerYear: 39, avgSalePrice: 550000,
        referNetScore: 81, responseTime: '< 2hr', closedReferrals: 5, color: '#6366f1',
        tags: ['Relocation', 'New Construction', 'Land & Acreage'],
      },
    ],
  },
  {
    id: 'gap-10',
    market: 'Minneapolis / St. Paul',
    state: 'MN',
    migrationTrend: 'Low',
    suggestedAgents: [
      {
        id: 'sa-15', name: 'Omar Hassan', brokerage: 'eXp Realty — Minneapolis', brokerageId: 'exp',
        area: 'Minneapolis / St. Paul, MN', dealsPerYear: 55, avgSalePrice: 420000,
        referNetScore: 87, responseTime: '< 2hr', closedReferrals: 8, color: '#38bdf8',
        tags: ['Relocation', 'First-Time Buyers'],
      },
    ],
  },
  // ── Canadian coverage gaps ──
  {
    id: 'gap-11',
    market: 'Calgary',
    state: 'AB',
    migrationTrend: 'Medium',
    suggestedAgents: [
      {
        id: 'sa-16', name: 'Tyler Braun', brokerage: 'RE/MAX Canada — Calgary', brokerageId: 'remax',
        area: 'Calgary, AB', dealsPerYear: 57, avgSalePrice: 550000,
        referNetScore: 88, responseTime: '< 1hr', closedReferrals: 9, color: '#003DA5',
        tags: ['New Construction', 'Investment'],
      },
    ],
  },
  {
    id: 'gap-12',
    market: 'Montreal Metro',
    state: 'QC',
    migrationTrend: 'Medium',
    suggestedAgents: [
      {
        id: 'sa-17', name: 'Jean-Philippe Bouchard', brokerage: 'Royal LePage — Montreal', brokerageId: 'royallepage',
        area: 'Montreal Metro, QC', dealsPerYear: 52, avgSalePrice: 520000,
        referNetScore: 86, responseTime: '< 1hr', closedReferrals: 8, color: '#c41230',
        tags: ['First-Time Buyers', 'Relocation'],
      },
    ],
  },
]

// ══════════════════════════════════════
// EXISTING PARTNERSHIP REQUESTS (mock state)
// ══════════════════════════════════════

export const existingRequests: PartnershipRequest[] = [
  {
    id: 'pr-1',
    requestingAgentId: 'jason',
    receivingAgentId: 'ashley',
    requestingMarket: 'Plainwell / Allegan County, MI',
    receivingMarket: 'Nashville Metro, TN',
    status: 'active',
    message: 'Would love to be your Michigan connection!',
    acceptedAt: '2026-01-15T10:00:00Z',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'pr-2',
    requestingAgentId: 'jason',
    receivingAgentId: 'lily',
    requestingMarket: 'Plainwell / Allegan County, MI',
    receivingMarket: 'Denver Metro, CO',
    status: 'active',
    acceptedAt: '2026-02-01T14:00:00Z',
    createdAt: '2026-01-28T09:00:00Z',
    updatedAt: '2026-02-01T14:00:00Z',
  },
  {
    id: 'pr-3',
    requestingAgentId: 'carlos',
    receivingAgentId: 'jason',
    requestingMarket: 'Dallas / Fort Worth, TX',
    receivingMarket: 'Plainwell / Allegan County, MI',
    status: 'active',
    acceptedAt: '2026-02-10T09:00:00Z',
    createdAt: '2026-02-05T11:00:00Z',
    updatedAt: '2026-02-10T09:00:00Z',
  },
  {
    id: 'pr-4',
    requestingAgentId: 'jason',
    receivingAgentId: 'darius',
    requestingMarket: 'Plainwell / Allegan County, MI',
    receivingMarket: 'Phoenix / Scottsdale, AZ',
    status: 'active',
    acceptedAt: '2026-02-15T16:00:00Z',
    createdAt: '2026-02-12T08:00:00Z',
    updatedAt: '2026-02-15T16:00:00Z',
  },
  {
    id: 'pr-5',
    requestingAgentId: 'megan',
    receivingAgentId: 'jason',
    requestingMarket: 'Grand Rapids / Kent County, MI',
    receivingMarket: 'Plainwell / Allegan County, MI',
    status: 'active',
    acceptedAt: '2025-12-20T10:00:00Z',
    createdAt: '2025-12-15T14:00:00Z',
    updatedAt: '2025-12-20T10:00:00Z',
  },
  {
    id: 'pr-6',
    requestingAgentId: 'jason',
    receivingAgentId: 'rachel',
    requestingMarket: 'Plainwell / Allegan County, MI',
    receivingMarket: 'Los Angeles Metro, CA',
    status: 'active',
    acceptedAt: '2026-03-01T12:00:00Z',
    createdAt: '2026-02-25T09:00:00Z',
    updatedAt: '2026-03-01T12:00:00Z',
  },
  {
    id: 'pr-7',
    requestingAgentId: 'jason',
    receivingAgentId: 'tanya',
    requestingMarket: 'Plainwell / Allegan County, MI',
    receivingMarket: 'Atlanta Metro, GA',
    status: 'active',
    acceptedAt: '2026-01-20T11:00:00Z',
    createdAt: '2026-01-18T08:00:00Z',
    updatedAt: '2026-01-20T11:00:00Z',
  },
  // ── Canadian partnerships ──
  {
    id: 'pr-8',
    requestingAgentId: 'jason',
    receivingAgentId: 'sarah_t',
    requestingMarket: 'Plainwell / Allegan County, MI',
    receivingMarket: 'Toronto / GTA, ON',
    status: 'active',
    message: 'Cross-border relocation referrals — Michigan to Toronto corridor',
    acceptedAt: '2026-03-05T10:00:00Z',
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z',
  },
  {
    id: 'pr-9',
    requestingAgentId: 'jason',
    receivingAgentId: 'david_w',
    requestingMarket: 'Plainwell / Allegan County, MI',
    receivingMarket: 'Vancouver / Lower Mainland, BC',
    status: 'active',
    message: 'West coast relocation partner — US to Canada',
    acceptedAt: '2026-03-08T14:00:00Z',
    createdAt: '2026-03-04T11:00:00Z',
    updatedAt: '2026-03-08T14:00:00Z',
  },
]

// Helper: get partner agent IDs for a given agent
export function getPartnerAgentIds(agentId: string): string[] {
  return existingRequests
    .filter((r) => r.status === 'active' && (r.requestingAgentId === agentId || r.receivingAgentId === agentId))
    .map((r) => r.requestingAgentId === agentId ? r.receivingAgentId : r.requestingAgentId)
}
