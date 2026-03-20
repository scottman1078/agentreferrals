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
const AgentEndorsementsPanel = dynamic(
  () => import('@/components/endorsements/agent-endorsements-panel').then(m => ({ default: m.AgentEndorsementsPanel })),
  { ssr: false }
)
const AgentVideoSection = dynamic(
  () => import('@/components/video/agent-video-section').then(m => ({ default: m.AgentVideoSection })),
  { ssr: false }
)
const AgentBioFromDB = dynamic(
  () => import('./agent-bio-video').then(m => ({ default: m.AgentBioFromDB })),
  { ssr: false }
)
const AgentVideoIntroFromDB = dynamic(
  () => import('./agent-bio-video').then(m => ({ default: m.AgentVideoIntroFromDB })),
  { ssr: false }
)
const AgentSocialLinks = dynamic(
  () => import('./agent-social-links').then(m => ({ default: m.AgentSocialLinks })),
  { ssr: false }
)
const AgentExpectationsDisplay = dynamic(
  () => import('./agent-expectations-display').then(m => ({ default: m.AgentExpectationsDisplay })),
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

export function ClientEndorsements({ agentId, agentName }: { agentId: string; agentName: string }) {
  return <AgentEndorsementsPanel agentId={agentId} agentName={agentName} />
}

export function ClientVideoSection({ agentId, agentName, agentColor }: { agentId: string; agentName: string; agentColor: string }) {
  return <AgentVideoSection agentId={agentId} agentName={agentName} agentColor={agentColor} />
}

export function ClientBioFromDB({ agentId, agentName, fallbackBio }: { agentId: string; agentName: string; fallbackBio: string }) {
  return <AgentBioFromDB agentId={agentId} agentName={agentName} fallbackBio={fallbackBio} />
}

export function ClientVideoIntroFromDB({ agentId, agentName }: { agentId: string; agentName: string }) {
  return <AgentVideoIntroFromDB agentId={agentId} agentName={agentName} />
}

export function ClientSocialLinks({ agentId }: { agentId: string }) {
  return <AgentSocialLinks agentId={agentId} />
}

export function ClientExpectationsDisplay({ agentId }: { agentId: string }) {
  return <AgentExpectationsDisplay agentId={agentId} />
}
