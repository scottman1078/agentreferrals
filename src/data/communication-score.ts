export interface CommScore {
  overall: number         // 0-100 composite
  pipelineActivity: number // 0-100
  messageFrequency: number // 0-100
  responseTime: number     // 0-100
  checkInConsistency: number // 0-100
  label: 'Highly Responsive' | 'Responsive' | 'Needs Improvement'
  trend: 'up' | 'stable' | 'down'
}

// Mock PCS data for all agents
// Agents with high ReferNet scores generally have high PCS but not always
const COMM_SCORES: Record<string, CommScore> = {
  // MICHIGAN — Real Broker
  jason: { overall: 74, pipelineActivity: 68, messageFrequency: 72, responseTime: 88, checkInConsistency: 62, label: 'Responsive', trend: 'down' },
  derek: { overall: 81, pipelineActivity: 82, messageFrequency: 78, responseTime: 85, checkInConsistency: 80, label: 'Responsive', trend: 'stable' },
  ashley: { overall: 96, pipelineActivity: 98, messageFrequency: 95, responseTime: 97, checkInConsistency: 90, label: 'Highly Responsive', trend: 'up' },
  tomas: { overall: 88, pipelineActivity: 90, messageFrequency: 85, responseTime: 92, checkInConsistency: 82, label: 'Responsive', trend: 'up' },
  darius: { overall: 92, pipelineActivity: 94, messageFrequency: 90, responseTime: 95, checkInConsistency: 85, label: 'Highly Responsive', trend: 'stable' },
  lily: { overall: 78, pipelineActivity: 75, messageFrequency: 80, responseTime: 82, checkInConsistency: 70, label: 'Responsive', trend: 'down' },
  natalie: { overall: 85, pipelineActivity: 88, messageFrequency: 82, responseTime: 86, checkInConsistency: 78, label: 'Responsive', trend: 'stable' },
  brent: { overall: 62, pipelineActivity: 55, messageFrequency: 60, responseTime: 72, checkInConsistency: 58, label: 'Needs Improvement', trend: 'down' },
  // KELLER WILLIAMS
  megan: { overall: 91, pipelineActivity: 92, messageFrequency: 90, responseTime: 93, checkInConsistency: 86, label: 'Highly Responsive', trend: 'up' },
  carla: { overall: 72, pipelineActivity: 70, messageFrequency: 68, responseTime: 80, checkInConsistency: 72, label: 'Responsive', trend: 'stable' },
  // COMPASS
  marcus: { overall: 95, pipelineActivity: 96, messageFrequency: 94, responseTime: 98, checkInConsistency: 88, label: 'Highly Responsive', trend: 'up' },
  michelle: { overall: 83, pipelineActivity: 80, messageFrequency: 85, responseTime: 86, checkInConsistency: 78, label: 'Responsive', trend: 'stable' },
  laura: { overall: 65, pipelineActivity: 60, messageFrequency: 62, responseTime: 75, checkInConsistency: 60, label: 'Needs Improvement', trend: 'down' },
  // eXp REALTY
  priya: { overall: 87, pipelineActivity: 85, messageFrequency: 88, responseTime: 90, checkInConsistency: 82, label: 'Responsive', trend: 'up' },
  omar: { overall: 79, pipelineActivity: 76, messageFrequency: 80, responseTime: 84, checkInConsistency: 72, label: 'Responsive', trend: 'stable' },
  james: { overall: 90, pipelineActivity: 92, messageFrequency: 88, responseTime: 93, checkInConsistency: 84, label: 'Highly Responsive', trend: 'stable' },
  kwame: { overall: 58, pipelineActivity: 50, messageFrequency: 55, responseTime: 70, checkInConsistency: 52, label: 'Needs Improvement', trend: 'down' },
  // BERKSHIRE HATHAWAY
  tanya: { overall: 97, pipelineActivity: 98, messageFrequency: 96, responseTime: 99, checkInConsistency: 92, label: 'Highly Responsive', trend: 'up' },
  faith: { overall: 76, pipelineActivity: 72, messageFrequency: 78, responseTime: 80, checkInConsistency: 70, label: 'Responsive', trend: 'stable' },
  // SOTHEBY'S
  rachel: { overall: 94, pipelineActivity: 95, messageFrequency: 92, responseTime: 97, checkInConsistency: 88, label: 'Highly Responsive', trend: 'up' },
  brendan: { overall: 86, pipelineActivity: 84, messageFrequency: 88, responseTime: 90, checkInConsistency: 78, label: 'Responsive', trend: 'stable' },
  // RE/MAX
  carlos: { overall: 93, pipelineActivity: 95, messageFrequency: 91, responseTime: 96, checkInConsistency: 86, label: 'Highly Responsive', trend: 'up' },
  sofia: { overall: 84, pipelineActivity: 82, messageFrequency: 86, responseTime: 88, checkInConsistency: 76, label: 'Responsive', trend: 'stable' },
  // COLDWELL BANKER
  priscilla: { overall: 70, pipelineActivity: 65, messageFrequency: 72, responseTime: 78, checkInConsistency: 62, label: 'Responsive', trend: 'down' },
  anthony: { overall: 63, pipelineActivity: 58, messageFrequency: 60, responseTime: 74, checkInConsistency: 58, label: 'Needs Improvement', trend: 'down' },
  rick: { overall: 77, pipelineActivity: 74, messageFrequency: 78, responseTime: 82, checkInConsistency: 70, label: 'Responsive', trend: 'stable' },
  ben: { overall: 80, pipelineActivity: 78, messageFrequency: 82, responseTime: 84, checkInConsistency: 74, label: 'Responsive', trend: 'up' },
  // ADDITIONAL US AGENTS
  tamara: { overall: 82, pipelineActivity: 80, messageFrequency: 84, responseTime: 86, checkInConsistency: 74, label: 'Responsive', trend: 'stable' },
  ryan_h: { overall: 88, pipelineActivity: 86, messageFrequency: 90, responseTime: 91, checkInConsistency: 82, label: 'Responsive', trend: 'up' },
  diana: { overall: 91, pipelineActivity: 93, messageFrequency: 89, responseTime: 92, checkInConsistency: 86, label: 'Highly Responsive', trend: 'up' },
  steve: { overall: 93, pipelineActivity: 94, messageFrequency: 92, responseTime: 96, checkInConsistency: 86, label: 'Highly Responsive', trend: 'stable' },
  nina: { overall: 75, pipelineActivity: 72, messageFrequency: 76, responseTime: 80, checkInConsistency: 68, label: 'Responsive', trend: 'stable' },
  troy: { overall: 67, pipelineActivity: 62, messageFrequency: 65, responseTime: 76, checkInConsistency: 62, label: 'Needs Improvement', trend: 'down' },
  elena: { overall: 96, pipelineActivity: 97, messageFrequency: 95, responseTime: 98, checkInConsistency: 90, label: 'Highly Responsive', trend: 'up' },
  daniel_k: { overall: 82, pipelineActivity: 80, messageFrequency: 84, responseTime: 86, checkInConsistency: 74, label: 'Responsive', trend: 'stable' },
  patricia: { overall: 89, pipelineActivity: 90, messageFrequency: 87, responseTime: 92, checkInConsistency: 84, label: 'Responsive', trend: 'up' },
  george: { overall: 73, pipelineActivity: 70, messageFrequency: 74, responseTime: 78, checkInConsistency: 66, label: 'Responsive', trend: 'down' },
  maria: { overall: 78, pipelineActivity: 75, messageFrequency: 80, responseTime: 82, checkInConsistency: 72, label: 'Responsive', trend: 'stable' },
  kevin: { overall: 81, pipelineActivity: 79, messageFrequency: 82, responseTime: 85, checkInConsistency: 76, label: 'Responsive', trend: 'stable' },
  victoria: { overall: 95, pipelineActivity: 96, messageFrequency: 94, responseTime: 98, checkInConsistency: 88, label: 'Highly Responsive', trend: 'up' },
  james_w: { overall: 92, pipelineActivity: 93, messageFrequency: 90, responseTime: 96, checkInConsistency: 86, label: 'Highly Responsive', trend: 'stable' },
  sandra: { overall: 80, pipelineActivity: 78, messageFrequency: 82, responseTime: 84, checkInConsistency: 72, label: 'Responsive', trend: 'stable' },
  robert_l: { overall: 69, pipelineActivity: 64, messageFrequency: 68, responseTime: 78, checkInConsistency: 62, label: 'Needs Improvement', trend: 'down' },
  // CANADA
  sarah_t: { overall: 90, pipelineActivity: 91, messageFrequency: 88, responseTime: 94, checkInConsistency: 84, label: 'Highly Responsive', trend: 'up' },
  jean_p: { overall: 83, pipelineActivity: 80, messageFrequency: 85, responseTime: 86, checkInConsistency: 78, label: 'Responsive', trend: 'stable' },
  heather_m: { overall: 71, pipelineActivity: 68, messageFrequency: 70, responseTime: 78, checkInConsistency: 66, label: 'Responsive', trend: 'stable' },
  david_w: { overall: 88, pipelineActivity: 86, messageFrequency: 90, responseTime: 92, checkInConsistency: 80, label: 'Responsive', trend: 'up' },
  claire_h: { overall: 76, pipelineActivity: 72, messageFrequency: 78, responseTime: 82, checkInConsistency: 68, label: 'Responsive', trend: 'stable' },
  ryan_k: { overall: 74, pipelineActivity: 70, messageFrequency: 76, responseTime: 80, checkInConsistency: 66, label: 'Responsive', trend: 'down' },
  tyler_b: { overall: 85, pipelineActivity: 84, messageFrequency: 86, responseTime: 88, checkInConsistency: 78, label: 'Responsive', trend: 'stable' },
  lisa_g: { overall: 82, pipelineActivity: 80, messageFrequency: 84, responseTime: 86, checkInConsistency: 74, label: 'Responsive', trend: 'up' },
  anika_r: { overall: 86, pipelineActivity: 84, messageFrequency: 88, responseTime: 90, checkInConsistency: 78, label: 'Responsive', trend: 'stable' },
  mark_n: { overall: 68, pipelineActivity: 62, messageFrequency: 66, responseTime: 78, checkInConsistency: 62, label: 'Needs Improvement', trend: 'down' },
  connor_d: { overall: 72, pipelineActivity: 68, messageFrequency: 74, responseTime: 78, checkInConsistency: 64, label: 'Responsive', trend: 'stable' },
  preet_s: { overall: 84, pipelineActivity: 82, messageFrequency: 86, responseTime: 88, checkInConsistency: 76, label: 'Responsive', trend: 'up' },
}

/** Get the Communication Score for an agent */
export function getCommScore(agentId: string): CommScore | null {
  return COMM_SCORES[agentId] ?? null
}

/** Get Tailwind color classes based on score */
export function getCommScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-500 bg-emerald-500/10'
  if (score >= 70) return 'text-amber-500 bg-amber-500/10'
  return 'text-red-500 bg-red-500/10'
}

/** Get the label string based on score */
export function getCommScoreLabel(score: number): 'Highly Responsive' | 'Responsive' | 'Needs Improvement' {
  if (score >= 90) return 'Highly Responsive'
  if (score >= 70) return 'Responsive'
  return 'Needs Improvement'
}
