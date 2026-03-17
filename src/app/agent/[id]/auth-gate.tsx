'use client'

import { useAuth } from '@/contexts/auth-context'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'

interface AuthGateProps {
  children: ReactNode
  agentName: string
  /** Short label for what this section contains, e.g. "contact info" */
  section?: string
}

/**
 * Wraps content that should only show to authenticated users.
 * Renders a sign-in prompt overlay for unauthenticated visitors.
 */
export default function AuthGate({ children, agentName, section }: AuthGateProps) {
  const { isAuthenticated, isLoading } = useAuth()

  // While loading, show a minimal skeleton so layout doesn't jump
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-3" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  // Unauthenticated: show locked overlay
  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden">
      {/* Blurred background hint */}
      <div className="p-6 blur-[6px] opacity-30 pointer-events-none select-none" aria-hidden>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm px-6 text-center">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="font-semibold text-sm mb-1">
          Sign in to view {section ?? 'this section'}
        </p>
        <p className="text-xs text-muted-foreground mb-4 max-w-xs">
          Create a free account to see {agentName.split(' ')[0]}&apos;s full profile and connect directly.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Sign in to view full profile
        </Link>
      </div>
    </div>
  )
}
