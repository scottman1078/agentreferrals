'use client'

import dynamic from 'next/dynamic'

const AgentProfileReviews = dynamic(
  () => import('./agent-profile-reviews').then(m => ({ default: m.AgentProfileReviews })),
  { ssr: false }
)
const AgentProfileMap = dynamic(
  () => import('./agent-profile-map').then(m => ({ default: m.AgentProfileMap })),
  { ssr: false }
)
const AgentNotesSection = dynamic(
  () => import('./agent-notes-section'),
  { ssr: false }
)

export function ClientReviews({ agentId, agentName }: { agentId: string; agentName: string }) {
  return <AgentProfileReviews agentId={agentId} agentName={agentName} />
}

export function ClientMap({ polygon, color, name, area }: { polygon: [number, number][]; color: string; name: string; area: string }) {
  return <AgentProfileMap polygon={polygon} color={color} name={name} area={area} />
}

export function ClientNotes({ agentId }: { agentId: string }) {
  return <AgentNotesSection agentId={agentId} />
}
