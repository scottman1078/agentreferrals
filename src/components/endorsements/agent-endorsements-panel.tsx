'use client'

import { useState } from 'react'
import {
  getAgentEndorsements,
  getEndorsementCount,
  ALL_ENDORSEMENT_SKILLS,
  ENDORSEMENT_ICONS,
} from '@/data/endorsements'
import type { EndorsementSkill } from '@/data/endorsements'
import { getInitials } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { submitEndorsement } from '@/hooks/use-endorsements'
import { ThumbsUp, X, Check, ChevronDown, ChevronUp, Plus } from 'lucide-react'

export function AgentEndorsementsPanel({
  agentId,
  agentName,
}: {
  agentId: string
  agentName: string
}) {
  const grouped = getAgentEndorsements(agentId)
  const totalCount = getEndorsementCount(agentId)
  const [expanded, setExpanded] = useState(false)
  const [showEndorseForm, setShowEndorseForm] = useState(false)

  const displayed = expanded ? grouped : grouped.slice(0, 4)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ThumbsUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">{totalCount} Endorsement{totalCount !== 1 ? 's' : ''}</span>
          <span className="text-xs text-muted-foreground">
            from {new Set(grouped.flatMap((g) => g.endorsers.map((e) => e.name))).size} agents
          </span>
        </div>
        <button
          onClick={() => setShowEndorseForm(!showEndorseForm)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3 h-3" />
          Endorse
        </button>
      </div>

      {/* Endorse form */}
      {showEndorseForm && (
        <EndorseForm
          agentId={agentId}
          agentName={agentName}
          onClose={() => setShowEndorseForm(false)}
        />
      )}

      {/* Skill pills */}
      {totalCount > 0 ? (
        <div className="space-y-2">
          {displayed.map((group) => (
            <EndorsementSkillRow key={group.skill} group={group} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No endorsements yet. Be the first to endorse {agentName.split(' ')[0]}!
        </p>
      )}

      {grouped.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" /> Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Show All {grouped.length} Skills
            </>
          )}
        </button>
      )}
    </div>
  )
}

function EndorsementSkillRow({
  group,
}: {
  group: { skill: EndorsementSkill; count: number; endorsers: { name: string; color: string }[] }
}) {
  const [showEndorsers, setShowEndorsers] = useState(false)

  return (
    <div>
      <button
        onClick={() => setShowEndorsers(!showEndorsers)}
        className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{ENDORSEMENT_ICONS[group.skill]}</span>
          <span className="text-sm font-semibold">{group.skill}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Stacked avatars */}
          <div className="flex -space-x-1.5">
            {group.endorsers.slice(0, 4).map((endorser, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-2 ring-card"
                style={{ background: endorser.color }}
                title={endorser.name}
              >
                {getInitials(endorser.name)}
              </div>
            ))}
            {group.endorsers.length > 4 && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold bg-muted text-muted-foreground ring-2 ring-card">
                +{group.endorsers.length - 4}
              </div>
            )}
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {group.count}
          </span>
        </div>
      </button>

      {/* Expanded endorser list */}
      {showEndorsers && (
        <div className="ml-4 sm:ml-8 mt-1 mb-2 space-y-1">
          {group.endorsers.map((endorser, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                style={{ background: endorser.color }}
              >
                {getInitials(endorser.name)}
              </div>
              <span>{endorser.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Endorse Form ──
function EndorseForm({ agentId, agentName, onClose }: { agentId: string; agentName: string; onClose: () => void }) {
  const [selected, setSelected] = useState<EndorsementSkill[]>([])
  const [submitted, setSubmitted] = useState(false)
  let userId: string | undefined
  try { const auth = useAuth(); userId = auth.user?.id } catch { /* no auth */ }

  function toggle(skill: EndorsementSkill) {
    setSelected((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  async function handleSubmit() {
    if (selected.length === 0) return
    if (userId) {
      await submitEndorsement(agentId, userId, selected)
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Endorsement Submitted!</p>
            <p className="text-xs text-muted-foreground">
              You endorsed {agentName} for {selected.length} skill{selected.length !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-primary/[0.02] mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Endorse {agentName}</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Select the skills you can vouch for based on your experience working with {agentName.split(' ')[0]}.
      </p>
      <div className="flex flex-wrap gap-2">
        {ALL_ENDORSEMENT_SKILLS.map((skill) => (
          <button
            key={skill}
            onClick={() => toggle(skill)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              selected.includes(skill)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            <span>{ENDORSEMENT_ICONS[skill]}</span>
            {skill}
          </button>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={selected.length === 0}
        className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        Endorse ({selected.length})
      </button>
    </div>
  )
}

/** Compact inline badge showing top endorsement skills. Use on agent cards. */
export function AgentEndorsementBadge({ agentId }: { agentId: string }) {
  const grouped = getAgentEndorsements(agentId)
  if (grouped.length === 0) return null

  const top = grouped.slice(0, 3)
  const total = getEndorsementCount(agentId)

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {top.map((g) => (
          <span key={g.skill} className="text-xs" title={`${g.skill} (${g.count})`}>
            {ENDORSEMENT_ICONS[g.skill]}
          </span>
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">{total} endorsements</span>
    </div>
  )
}
