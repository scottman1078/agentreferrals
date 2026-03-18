export type EndorsementSkill =
  | 'Fast Closer'
  | 'Luxury Buyers'
  | 'Great with Relocations'
  | 'Excellent Communicator'
  | 'New Construction Expert'
  | 'First-Time Buyer Specialist'
  | 'Investment Properties'
  | 'Negotiation Pro'
  | 'Market Knowledge'
  | 'Client Advocacy'
  | 'Cross-Border Expert'
  | 'Responsive & Reliable'

export const ALL_ENDORSEMENT_SKILLS: EndorsementSkill[] = [
  'Fast Closer',
  'Luxury Buyers',
  'Great with Relocations',
  'Excellent Communicator',
  'New Construction Expert',
  'First-Time Buyer Specialist',
  'Investment Properties',
  'Negotiation Pro',
  'Market Knowledge',
  'Client Advocacy',
  'Cross-Border Expert',
  'Responsive & Reliable',
]

export const ENDORSEMENT_ICONS: Record<EndorsementSkill, string> = {
  'Fast Closer': '⚡',
  'Luxury Buyers': '💎',
  'Great with Relocations': '📦',
  'Excellent Communicator': '💬',
  'New Construction Expert': '🏗',
  'First-Time Buyer Specialist': '🏡',
  'Investment Properties': '📈',
  'Negotiation Pro': '🤝',
  'Market Knowledge': '🗺',
  'Client Advocacy': '❤️',
  'Cross-Border Expert': '🌐',
  'Responsive & Reliable': '✅',
}

export interface Endorsement {
  id: string
  agentId: string        // agent being endorsed
  endorserId: string     // agent giving the endorsement
  endorserName: string
  endorserBrokerage: string
  endorserColor: string
  skill: EndorsementSkill
  date: string
}

export const endorsements: Endorsement[] = [
  // Ashley Monroe endorsements
  { id: 'end-1', agentId: 'ashley', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Fast Closer', date: '2025-03-10' },
  { id: 'end-2', agentId: 'ashley', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Excellent Communicator', date: '2025-03-10' },
  { id: 'end-3', agentId: 'ashley', endorserId: 'tomas', endorserName: 'Tomás Reyes', endorserBrokerage: 'Real Broker LLC', endorserColor: '#10b981', skill: 'Great with Relocations', date: '2025-02-28' },
  { id: 'end-4', agentId: 'ashley', endorserId: 'tomas', endorserName: 'Tomás Reyes', endorserBrokerage: 'Real Broker LLC', endorserColor: '#10b981', skill: 'Fast Closer', date: '2025-02-28' },
  { id: 'end-5', agentId: 'ashley', endorserId: 'omar', endorserName: 'Omar Hassan', endorserBrokerage: 'eXp Realty', endorserColor: '#38bdf8', skill: 'Market Knowledge', date: '2025-01-15' },
  { id: 'end-6', agentId: 'ashley', endorserId: 'omar', endorserName: 'Omar Hassan', endorserBrokerage: 'eXp Realty', endorserColor: '#38bdf8', skill: 'Responsive & Reliable', date: '2025-01-15' },
  { id: 'end-7', agentId: 'ashley', endorserId: 'marcus', endorserName: 'Marcus Reid', endorserBrokerage: 'Compass Chicago', endorserColor: '#818cf8', skill: 'Luxury Buyers', date: '2025-02-20' },

  // Carlos Vega endorsements
  { id: 'end-8', agentId: 'carlos', endorserId: 'marcus', endorserName: 'Marcus Reid', endorserBrokerage: 'Compass Chicago', endorserColor: '#818cf8', skill: 'Luxury Buyers', date: '2025-03-08' },
  { id: 'end-9', agentId: 'carlos', endorserId: 'marcus', endorserName: 'Marcus Reid', endorserBrokerage: 'Compass Chicago', endorserColor: '#818cf8', skill: 'Market Knowledge', date: '2025-03-08' },
  { id: 'end-10', agentId: 'carlos', endorserId: 'brendan', endorserName: 'Brendan Walsh', endorserBrokerage: "Sotheby's Boston", endorserColor: '#7c3aed', skill: 'Luxury Buyers', date: '2025-02-10' },
  { id: 'end-11', agentId: 'carlos', endorserId: 'brendan', endorserName: 'Brendan Walsh', endorserBrokerage: "Sotheby's Boston", endorserColor: '#7c3aed', skill: 'Negotiation Pro', date: '2025-02-10' },
  { id: 'end-12', agentId: 'carlos', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Fast Closer', date: '2025-01-20' },

  // Darius King endorsements
  { id: 'end-13', agentId: 'darius', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'New Construction Expert', date: '2025-02-22' },
  { id: 'end-14', agentId: 'darius', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Market Knowledge', date: '2025-02-22' },
  { id: 'end-15', agentId: 'darius', endorserId: 'lily', endorserName: 'Lily Park', endorserBrokerage: 'Real Broker LLC', endorserColor: '#059669', skill: 'Excellent Communicator', date: '2025-01-30' },
  { id: 'end-16', agentId: 'darius', endorserId: 'lily', endorserName: 'Lily Park', endorserBrokerage: 'Real Broker LLC', endorserColor: '#059669', skill: 'Great with Relocations', date: '2025-01-30' },

  // Rachel Kim endorsements
  { id: 'end-17', agentId: 'rachel', endorserId: 'sofia', endorserName: 'Sofia Chen', endorserBrokerage: 'RE/MAX Seattle', endorserColor: '#14b8a6', skill: 'Luxury Buyers', date: '2025-03-05' },
  { id: 'end-18', agentId: 'rachel', endorserId: 'sofia', endorserName: 'Sofia Chen', endorserBrokerage: 'RE/MAX Seattle', endorserColor: '#14b8a6', skill: 'Market Knowledge', date: '2025-03-05' },
  { id: 'end-19', agentId: 'rachel', endorserId: 'elena', endorserName: 'Elena Vasquez', endorserBrokerage: 'Compass Miami', endorserColor: '#16a34a', skill: 'Client Advocacy', date: '2025-02-18' },
  { id: 'end-20', agentId: 'rachel', endorserId: 'elena', endorserName: 'Elena Vasquez', endorserBrokerage: 'Compass Miami', endorserColor: '#16a34a', skill: 'Negotiation Pro', date: '2025-02-18' },
  { id: 'end-21', agentId: 'rachel', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Luxury Buyers', date: '2025-03-01' },

  // Tanya Hill endorsements
  { id: 'end-22', agentId: 'tanya', endorserId: 'michelle', endorserName: 'Michelle Foster', endorserBrokerage: 'Compass Charlotte', endorserColor: '#e879f9', skill: 'Client Advocacy', date: '2025-03-01' },
  { id: 'end-23', agentId: 'tanya', endorserId: 'michelle', endorserName: 'Michelle Foster', endorserBrokerage: 'Compass Charlotte', endorserColor: '#e879f9', skill: 'Luxury Buyers', date: '2025-03-01' },
  { id: 'end-24', agentId: 'tanya', endorserId: 'james', endorserName: 'James Whitfield', endorserBrokerage: 'eXp Realty Orlando', endorserColor: '#06b6d4', skill: 'Market Knowledge', date: '2025-02-05' },
  { id: 'end-25', agentId: 'tanya', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Excellent Communicator', date: '2025-02-15' },
  { id: 'end-26', agentId: 'tanya', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Responsive & Reliable', date: '2025-02-15' },

  // Jason O'Brien endorsements (received from partners)
  { id: 'end-27', agentId: 'jason', endorserId: 'ashley', endorserName: 'Ashley Monroe', endorserBrokerage: 'Real Broker LLC', endorserColor: '#f472b6', skill: 'Responsive & Reliable', date: '2025-03-05' },
  { id: 'end-28', agentId: 'jason', endorserId: 'ashley', endorserName: 'Ashley Monroe', endorserBrokerage: 'Real Broker LLC', endorserColor: '#f472b6', skill: 'First-Time Buyer Specialist', date: '2025-03-05' },
  { id: 'end-29', agentId: 'jason', endorserId: 'megan', endorserName: 'Megan Torres', endorserBrokerage: 'KW Grand Rapids', endorserColor: '#ef4444', skill: 'Excellent Communicator', date: '2025-02-15' },
  { id: 'end-30', agentId: 'jason', endorserId: 'megan', endorserName: 'Megan Torres', endorserBrokerage: 'KW Grand Rapids', endorserColor: '#ef4444', skill: 'Client Advocacy', date: '2025-02-15' },
  { id: 'end-31', agentId: 'jason', endorserId: 'derek', endorserName: 'Derek Chung', endorserBrokerage: 'Real Broker LLC', endorserColor: '#14b8a6', skill: 'Market Knowledge', date: '2025-01-20' },
  { id: 'end-32', agentId: 'jason', endorserId: 'carlos', endorserName: 'Carlos Vega', endorserBrokerage: 'RE/MAX Dallas', endorserColor: '#f43f5e', skill: 'Responsive & Reliable', date: '2025-03-08' },
  { id: 'end-33', agentId: 'jason', endorserId: 'darius', endorserName: 'Darius King', endorserBrokerage: 'Real Broker LLC', endorserColor: '#d97706', skill: 'Fast Closer', date: '2025-02-22' },

  // Megan Torres endorsements
  { id: 'end-34', agentId: 'megan', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Luxury Buyers', date: '2025-02-15' },
  { id: 'end-35', agentId: 'megan', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Market Knowledge', date: '2025-02-15' },
  { id: 'end-36', agentId: 'megan', endorserId: 'derek', endorserName: 'Derek Chung', endorserBrokerage: 'Real Broker LLC', endorserColor: '#14b8a6', skill: 'Negotiation Pro', date: '2025-01-20' },

  // Marcus Reid endorsements
  { id: 'end-37', agentId: 'marcus', endorserId: 'priya', endorserName: 'Priya Nair', endorserBrokerage: 'eXp Realty', endorserColor: '#a855f7', skill: 'Fast Closer', date: '2025-02-20' },
  { id: 'end-38', agentId: 'marcus', endorserId: 'priya', endorserName: 'Priya Nair', endorserBrokerage: 'eXp Realty', endorserColor: '#a855f7', skill: 'Client Advocacy', date: '2025-02-20' },
  { id: 'end-39', agentId: 'marcus', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Luxury Buyers', date: '2025-01-05' },

  // Victoria Blake endorsements
  { id: 'end-40', agentId: 'victoria', endorserId: 'lily', endorserName: 'Lily Park', endorserBrokerage: 'Real Broker LLC', endorserColor: '#059669', skill: 'Luxury Buyers', date: '2025-03-10' },
  { id: 'end-41', agentId: 'victoria', endorserId: 'lily', endorserName: 'Lily Park', endorserBrokerage: 'Real Broker LLC', endorserColor: '#059669', skill: 'Negotiation Pro', date: '2025-03-10' },
  { id: 'end-42', agentId: 'victoria', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Market Knowledge', date: '2025-03-12' },

  // Canadian agent endorsements
  { id: 'end-43', agentId: 'sarah_t', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Cross-Border Expert', date: '2025-03-08' },
  { id: 'end-44', agentId: 'sarah_t', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Great with Relocations', date: '2025-03-08' },
  { id: 'end-45', agentId: 'sarah_t', endorserId: 'david_w', endorserName: 'David Wong', endorserBrokerage: 'Sutton Group', endorserColor: '#003366', skill: 'Market Knowledge', date: '2025-02-20' },
  { id: 'end-46', agentId: 'david_w', endorserId: 'jason', endorserName: "Jason O'Brien", endorserBrokerage: 'Real Broker LLC', endorserColor: '#f0a500', skill: 'Cross-Border Expert', date: '2025-03-01' },
  { id: 'end-47', agentId: 'david_w', endorserId: 'sofia', endorserName: 'Sofia Chen', endorserBrokerage: 'RE/MAX Seattle', endorserColor: '#14b8a6', skill: 'Great with Relocations', date: '2025-02-12' },
]

// ── Helpers ──

/** Get all endorsements for an agent, grouped by skill with count */
export function getAgentEndorsements(agentId: string) {
  const agentEndorsements = endorsements.filter((e) => e.agentId === agentId)

  // Group by skill
  const bySkill: Record<string, { skill: EndorsementSkill; count: number; endorsers: { name: string; color: string }[] }> = {}
  for (const e of agentEndorsements) {
    if (!bySkill[e.skill]) {
      bySkill[e.skill] = { skill: e.skill, count: 0, endorsers: [] }
    }
    bySkill[e.skill].count++
    bySkill[e.skill].endorsers.push({ name: e.endorserName, color: e.endorserColor })
  }

  // Sort by count descending
  return Object.values(bySkill).sort((a, b) => b.count - a.count)
}

/** Get total endorsement count for an agent */
export function getEndorsementCount(agentId: string): number {
  return endorsements.filter((e) => e.agentId === agentId).length
}

/** Get the top N skills for an agent (for badge display) */
export function getTopEndorsements(agentId: string, limit = 3) {
  return getAgentEndorsements(agentId).slice(0, limit)
}
