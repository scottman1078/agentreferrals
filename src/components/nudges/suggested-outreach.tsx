'use client'

import { useState } from 'react'
import { Lightbulb, ChevronDown, ChevronUp, Send, PenLine } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { getActiveNudges } from '@/data/nudges'
import type { Nudge } from '@/data/nudges'
import SmartComposer from '@/components/nudges/smart-composer'

interface SuggestedOutreachProps {
  nudges: Nudge[]
  onDismiss: (nudgeId: string) => void
  onSendMessage: (agentId: string, message: string) => void
  onCustomize: (agentId: string, prefillMessage: string) => void
}

export default function SuggestedOutreach({
  nudges,
  onDismiss,
  onSendMessage,
  onCustomize,
}: SuggestedOutreachProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [composerNudge, setComposerNudge] = useState<Nudge | null>(null)

  const activeNudges = getActiveNudges(nudges)
  if (activeNudges.length === 0) return null

  const visibleNudges = collapsed ? [] : activeNudges.slice(0, 3)
  const remainingCount = Math.max(0, activeNudges.length - 3)

  const reasonLabel = (nudge: Nudge): string => {
    switch (nudge.type) {
      case 'inactive_partner':
        return `${nudge.daysInactive} days ago`
      case 'referral_anniversary':
        return '1 year anniversary'
      case 'referral_closed':
        return 'Deal closed'
      case 'seasonal':
        return 'Seasonal'
      case 'market_activity':
        return 'Market activity'
      case 'new_search':
        return 'New search'
      default:
        return ''
    }
  }

  return (
    <>
      <div className="border-b border-border">
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-accent/50 transition-colors"
        >
          <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex-1 text-left">
            <span className="text-xs font-bold">Suggested Outreach</span>
            <span className="text-[10px] text-muted-foreground ml-2">
              {activeNudges.length} suggestion{activeNudges.length !== 1 ? 's' : ''}
            </span>
          </div>
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>

        {/* Nudge cards */}
        {!collapsed && (
          <div className="px-3 pb-3 space-y-2">
            {visibleNudges.map((nudge) => {
              const suggestedMessage = nudge.suggestedMessages[0] || ''

              return (
                <div
                  key={nudge.id}
                  className="p-3 rounded-lg border border-border bg-background"
                >
                  {/* Agent row */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                      style={{ background: nudge.agentColor }}
                    >
                      {getInitials(nudge.agentName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{nudge.agentName}</div>
                      <div className="text-[10px] text-muted-foreground">{reasonLabel(nudge)}</div>
                    </div>
                  </div>

                  {/* Suggested message preview */}
                  {suggestedMessage && (
                    <div className="text-[11px] text-muted-foreground mb-2.5 line-clamp-2 italic">
                      &ldquo;{suggestedMessage}&rdquo;
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {suggestedMessage && (
                      <button
                        onClick={() => setComposerNudge(nudge)}
                        className="flex items-center gap-1 h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity"
                      >
                        <Send className="w-3 h-3" />
                        Send
                      </button>
                    )}
                    <button
                      onClick={() => onCustomize(nudge.agentId, suggestedMessage)}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-[11px] font-semibold hover:bg-accent transition-colors"
                    >
                      <PenLine className="w-3 h-3" />
                      Customize
                    </button>
                  </div>
                </div>
              )
            })}

            {/* More count */}
            {remainingCount > 0 && !collapsed && (
              <div className="text-center py-1">
                <span className="text-[10px] text-muted-foreground">
                  +{remainingCount} more suggestion{remainingCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
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
            onSendMessage(composerNudge.agentId, message)
            onDismiss(composerNudge.id)
            setComposerNudge(null)
          }}
          onClose={() => setComposerNudge(null)}
        />
      )}
    </>
  )
}
