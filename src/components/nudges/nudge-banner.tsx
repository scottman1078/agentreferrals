'use client'

import { useState } from 'react'
import { X, MessageSquare } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { getActiveNudges } from '@/data/nudges'
import type { Nudge } from '@/data/nudges'
import SmartComposer from '@/components/nudges/smart-composer'

interface NudgeBannerProps {
  nudges: Nudge[]
  onDismiss: (nudgeId: string) => void
  onMessageSent: (agentId: string, message: string) => void
}

export default function NudgeBanner({ nudges, onDismiss, onMessageSent }: NudgeBannerProps) {
  const [composerNudge, setComposerNudge] = useState<Nudge | null>(null)

  const activeNudges = getActiveNudges(nudges)
  if (activeNudges.length === 0) return null

  const currentNudge = activeNudges[0]

  const priorityStyles = {
    high: 'border-amber-500/30',
    medium: 'border-blue-500/20',
    low: 'border-border',
  }

  const priorityIcon = {
    high: '🔥',
    medium: '💬',
    low: '💡',
  }

  return (
    <>
      <div className={`fixed top-[72px] left-1/2 -translate-x-1/2 z-[500] max-w-[600px] w-[calc(100%-2rem)]`}>
        <div className={`flex items-center gap-3 px-4 py-2.5 bg-card/95 backdrop-blur-xl rounded-xl shadow-lg border ${priorityStyles[currentNudge.priority]}`}>
          {/* Priority icon */}
          <span className="text-base shrink-0">{priorityIcon[currentNudge.priority]}</span>

          {/* Agent avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[9px] text-white shrink-0"
            style={{ background: currentNudge.agentColor }}
          >
            {getInitials(currentNudge.agentName)}
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{currentNudge.title}</div>
          </div>

          {/* Send check-in button */}
          {currentNudge.suggestedMessages.length > 0 && (
            <button
              onClick={() => setComposerNudge(currentNudge)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity shrink-0"
            >
              <MessageSquare className="w-3 h-3" />
              Send Check-in
            </button>
          )}

          {/* Dismiss */}
          <button
            onClick={() => onDismiss(currentNudge.id)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Remaining count */}
        {activeNudges.length > 1 && (
          <div className="text-center mt-1">
            <span className="text-[10px] text-muted-foreground">
              +{activeNudges.length - 1} more suggestion{activeNudges.length - 1 > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Smart composer modal */}
      {composerNudge && (
        <SmartComposer
          agentId={composerNudge.agentId}
          agentName={composerNudge.agentName}
          agentColor={composerNudge.agentColor}
          agentArea={composerNudge.agentArea}
          initialMessage={composerNudge.suggestedMessages[0] || ''}
          suggestedMessages={composerNudge.suggestedMessages}
          onSend={(message) => {
            onMessageSent(composerNudge.agentId, message)
            onDismiss(composerNudge.id)
            setComposerNudge(null)
          }}
          onClose={() => setComposerNudge(null)}
        />
      )}
    </>
  )
}
