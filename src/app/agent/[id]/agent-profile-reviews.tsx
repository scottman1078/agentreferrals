'use client'

import { AgentReviewsPanel } from '@/components/reviews/agent-reviews-panel'

export function AgentProfileReviews({ agentId, agentName }: { agentId: string; agentName: string }) {
  return <AgentReviewsPanel agentId={agentId} agentName={agentName} />
}
