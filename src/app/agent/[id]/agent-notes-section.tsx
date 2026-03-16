'use client'

import AgentNotes from '@/components/agent-notes'
import { useAuth } from '@/contexts/auth-context'
import { AuthProvider } from '@/contexts/auth-context'

function AgentNotesInner({ agentId }: { agentId: string }) {
  const { profile } = useAuth()
  return <AgentNotes agentId={agentId} authorId={profile?.id ?? null} variant="full" />
}

export default function AgentNotesSection({ agentId }: { agentId: string }) {
  return (
    <AuthProvider>
      <AgentNotesInner agentId={agentId} />
    </AuthProvider>
  )
}
