// ══════════════════════════════════════
// Report & Block system — mock data and types
// ══════════════════════════════════════

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'fake_profile'
  | 'contact_harvesting'
  | 'other'

export interface Report {
  id: string
  reporterId: string
  reportedAgentId: string
  reason: ReportReason
  description: string
  status: 'pending' | 'reviewed' | 'resolved'
  createdAt: string
}

export interface BlockEntry {
  id: string
  blockerId: string
  blockedAgentId: string
  createdAt: string
}

// In-memory mock stores (reset on page reload)
export const reports: Report[] = []
export const blocks: BlockEntry[] = []

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  fake_profile: 'Fake Profile',
  contact_harvesting: 'Contact Harvesting',
  other: 'Other',
}

export function addReport(report: Omit<Report, 'id' | 'status' | 'createdAt'>): Report {
  const entry: Report = {
    ...report,
    id: `rpt-${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  reports.push(entry)
  return entry
}

export function addBlock(blockerId: string, blockedAgentId: string): BlockEntry {
  const entry: BlockEntry = {
    id: `blk-${Date.now()}`,
    blockerId,
    blockedAgentId,
    createdAt: new Date().toISOString(),
  }
  blocks.push(entry)
  return entry
}

export function isBlocked(blockerId: string, agentId: string): boolean {
  return blocks.some((b) => b.blockerId === blockerId && b.blockedAgentId === agentId)
}
