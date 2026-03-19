'use client'

import { useState } from 'react'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { useAuth } from '@/contexts/auth-context'
import { getInitials } from '@/lib/utils'
import {
  availableMentors,
  existingMentorships,
  mentorSpecializations,
  getMentorshipsByAgent,
  type MentorProfile,
  type MentorSpecialization,
} from '@/data/mentoring'
import BackToDashboard from '@/components/layout/back-to-dashboard'
import {
  GraduationCap,
  Search,
  Users,
  Award,
  Clock,
  Zap,
  X,
  Lock,
  Sparkles,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

type Tab = 'find' | 'my' | 'become'

// ══════════════════════════════════════
// Specialization chip colors
// ══════════════════════════════════════
const SPEC_COLORS: Record<string, string> = {
  'Luxury Market': '#f0a500',
  'First-Time Buyers': '#22c55e',
  'Investment Properties': '#a855f7',
  'Referral Network Building': '#3b82f6',
  'Negotiation': '#ef4444',
  'Lead Generation': '#f97316',
  'New Construction': '#14b8a6',
  'Relocation': '#06b6d4',
}

// ══════════════════════════════════════
// Main Page
// ══════════════════════════════════════
export default function MentoringPage() {
  const [activeTab, setActiveTab] = useState<Tab>('find')
  const tabs: { key: Tab; label: string }[] = [
    { key: 'find', label: 'Find a Mentor' },
    { key: 'my', label: 'My Mentorships' },
    { key: 'become', label: 'Become a Mentor' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 sm:px-6 pt-3">
        <BackToDashboard />
      </div>
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Mentor Match</h1>
            <p className="text-xs text-muted-foreground">
              Connect with experienced agents to grow your business
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'find' && <FindMentorTab />}
        {activeTab === 'my' && <MyMentorshipsTab />}
        {activeTab === 'become' && <BecomeMentorTab />}
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// Tab 1 — Find a Mentor
// ══════════════════════════════════════
function FindMentorTab() {
  const { hasFeature } = useFeatureGate()
  const router = useRouter()
  const canBrowse = hasFeature('mentorBrowse')
  const [filter, setFilter] = useState<string>('all')
  const [requestingMentor, setRequestingMentor] = useState<MentorProfile | null>(null)

  const filtered =
    filter === 'all'
      ? availableMentors
      : availableMentors.filter((m) => m.specializations.includes(filter as MentorSpecialization))

  if (!canBrowse) {
    return (
      <div className="relative">
        {/* Blurred cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 blur-sm pointer-events-none select-none">
          {availableMentors.slice(0, 6).map((m) => (
            <MentorCard key={m.agentId} mentor={m} onRequest={() => {}} />
          ))}
        </div>
        {/* Upgrade overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-sm text-center bg-card/95 backdrop-blur-sm p-8 rounded-2xl border border-border shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-bold text-lg mb-2">Browse Mentors</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Upgrade to the{' '}
              <span className="font-semibold text-primary">Growth</span> plan or
              higher to browse and connect with mentors.
            </p>
            <button
              onClick={() => router.push('/dashboard/billing')}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Filter */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card mb-5">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          Specialization:
        </label>
        <div className="relative flex-1">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full h-9 px-3 pr-8 rounded-lg border border-input bg-background text-sm cursor-pointer appearance-none"
          >
            <option value="all">All Specializations</option>
            {mentorSpecializations.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <MentorCard
            key={m.agentId}
            mentor={m}
            onRequest={() => setRequestingMentor(m)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <div className="font-bold text-base mb-1.5">No mentors found</div>
          <div className="text-sm">Try a different specialization filter</div>
        </div>
      )}

      {/* Request Modal */}
      {requestingMentor && (
        <RequestMentorModal
          mentor={requestingMentor}
          onClose={() => setRequestingMentor(null)}
        />
      )}
    </>
  )
}

// ══════════════════════════════════════
// Mentor Card
// ══════════════════════════════════════
function MentorCard({
  mentor,
  onRequest,
}: {
  mentor: MentorProfile
  onRequest: () => void
}) {
  const slotsUsed = mentor.activeMentees
  const slotsTotal = mentor.capacity
  const slotPercent = (slotsUsed / slotsTotal) * 100
  const isFull = slotsUsed >= slotsTotal

  return (
    <div className="p-4 rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/20 transition-all">
      {/* Top row */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
          style={{ background: mentor.color }}
        >
          {getInitials(mentor.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{mentor.name}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {mentor.brokerage}
          </div>
          <div className="text-[11px] text-muted-foreground">{mentor.area}</div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
          <Zap className="w-3 h-3" />
          {mentor.rcsScore}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {mentor.yearsLicensed} yrs
        </span>
        <span className="flex items-center gap-1">
          <Award className="w-3 h-3" />
          {mentor.dealsPerYear} deals/yr
        </span>
      </div>

      {/* Specializations */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {mentor.specializations.map((s) => (
          <span
            key={s}
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
            style={{ background: SPEC_COLORS[s] || '#6b7280' }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Capacity */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-muted-foreground">Capacity</span>
          <span className="font-semibold">
            {slotsUsed}/{slotsTotal} slots filled
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${slotPercent}%`,
              background: isFull ? '#ef4444' : '#22c55e',
            }}
          />
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onRequest}
        disabled={isFull}
        className={`w-full h-9 rounded-lg text-sm font-bold transition-all ${
          isFull
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:opacity-90'
        }`}
      >
        {isFull ? 'No Availability' : 'Request Mentor'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════
// Request Modal
// ══════════════════════════════════════
function RequestMentorModal({
  mentor,
  onClose,
}: {
  mentor: MentorProfile
  onClose: () => void
}) {
  const [specialization, setSpecialization] = useState<string>(
    mentor.specializations[0] || ''
  )
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const demoGuard = useDemoGuard()

  const handleSubmit = () => {
    if (demoGuard()) return
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-base">Request Mentorship</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="font-bold text-lg mb-2">Request Sent!</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Your mentorship request has been sent to {mentor.name}. You will be
              notified when they respond.
            </p>
            <button
              onClick={onClose}
              className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Mentor summary */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/50">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                style={{ background: mentor.color }}
              >
                {getInitials(mentor.name)}
              </div>
              <div>
                <div className="font-bold text-sm">{mentor.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {mentor.brokerage} &middot; {mentor.yearsLicensed} yrs &middot;{' '}
                  RCS {mentor.rcsScore}
                </div>
              </div>
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                What do you want to learn?
              </label>
              <div className="relative">
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full h-9 px-3 pr-8 rounded-lg border border-input bg-background text-sm cursor-pointer appearance-none"
                >
                  {mentor.specializations.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Tell them about your goals...
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="I'm looking to improve my skills in..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!message.trim()}
              className={`w-full h-10 rounded-lg text-sm font-bold transition-all ${
                message.trim()
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              Send Request
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// Tab 2 — My Mentorships
// ══════════════════════════════════════
function MyMentorshipsTab() {
  // In demo mode, show Jason's mentorships
  const myMentorships = getMentorshipsByAgent('jason')
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set())
  const demoGuard = useDemoGuard()

  const handleAction = (id: string, _action: 'accept' | 'decline') => {
    if (demoGuard()) return
    setActionedIds((prev) => new Set(prev).add(id))
  }

  if (myMentorships.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <div className="font-bold text-base mb-1.5">No mentorships yet</div>
        <div className="text-sm">
          Find a mentor to get started, or become a mentor to help others
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    declined: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  }

  return (
    <div className="space-y-3">
      {myMentorships.map((ms) => {
        const isMentor = ms.mentorId === 'jason'
        const otherName = isMentor ? ms.menteeName : ms.mentorName
        const role = isMentor ? 'Mentee' : 'Mentor'
        const isPendingForMe = ms.status === 'pending' && isMentor
        const wasActioned = actionedIds.has(ms.id)

        return (
          <div
            key={ms.id}
            className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                <span className="font-bold text-sm">{otherName}</span>
                <span className="text-[10px] text-muted-foreground">({role})</span>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  statusColors[ms.status]
                }`}
              >
                {wasActioned ? 'Accepted' : ms.status.charAt(0).toUpperCase() + ms.status.slice(1)}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
              <span className="px-2 py-0.5 rounded-full bg-accent text-foreground font-medium">
                {ms.specialization}
              </span>
              {ms.startedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Started {ms.startedAt}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{ms.message}</p>

            {/* Pending actions for mentor */}
            {isPendingForMe && !wasActioned && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => handleAction(ms.id, 'accept')}
                  className="h-8 px-4 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:opacity-90 transition-all"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleAction(ms.id, 'decline')}
                  className="h-8 px-4 rounded-lg border border-border text-xs font-bold hover:bg-accent transition-all"
                >
                  Decline
                </button>
              </div>
            )}

            {/* Pending waiting for mentee */}
            {ms.status === 'pending' && !isMentor && !wasActioned && (
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-[11px] text-amber-500 font-medium">
                  Waiting for response...
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════
// Tab 3 — Become a Mentor
// ══════════════════════════════════════
function BecomeMentorTab() {
  const { hasFeature } = useFeatureGate()
  const router = useRouter()
  const canBecome = hasFeature('mentorBecome')

  // Demo: Jason has 8 years, 92 score — meets RCS but not years
  const yearsLicensed = 8
  const rcsScore = 92
  const meetsYears = yearsLicensed >= 10
  const meetsScore = rcsScore >= 85
  const meetsRequirements = meetsYears && meetsScore

  const [available, setAvailable] = useState(false)
  const [capacity, setCapacity] = useState(2)
  const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set())
  const [bio, setBio] = useState('')
  const [saved, setSaved] = useState(false)
  const demoGuard = useDemoGuard()

  const toggleSpec = (spec: string) => {
    setSelectedSpecs((prev) => {
      const next = new Set(prev)
      if (next.has(spec)) next.delete(spec)
      else next.add(spec)
      return next
    })
  }

  const handleSave = () => {
    if (demoGuard()) return
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!canBecome) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-bold text-lg mb-2">Become a Mentor</h2>
          <p className="text-sm text-muted-foreground mb-5">
            This feature requires the{' '}
            <span className="font-semibold text-primary">Pro</span> plan or higher.
            Upgrade to share your expertise.
          </p>
          <button
            onClick={() => router.push('/dashboard/billing')}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade Plan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Requirements */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <h3 className="font-bold text-sm mb-3">Mentor Requirements</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${
                meetsYears
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              {meetsYears ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
            </div>
            <span className={meetsYears ? 'text-foreground' : 'text-muted-foreground'}>
              10+ years licensed{' '}
              <span className="text-muted-foreground text-xs">
                (you have {yearsLicensed})
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${
                meetsScore
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              {meetsScore ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
            </div>
            <span className={meetsScore ? 'text-foreground' : 'text-muted-foreground'}>
              85+ RCS{' '}
              <span className="text-muted-foreground text-xs">
                (yours is {rcsScore})
              </span>
            </span>
          </div>
        </div>
      </div>

      {!meetsRequirements && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm text-amber-700 dark:text-amber-400">
          You don&apos;t yet meet all the requirements to become a mentor. Keep building
          your experience and your RCS, and you will be eligible soon.
        </div>
      )}

      {meetsRequirements && (
        <>
          {/* Toggle */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Available for Mentoring</h3>
                <p className="text-xs text-muted-foreground">
                  Allow agents to send you mentorship requests
                </p>
              </div>
              <button
                onClick={() => setAvailable(!available)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  available ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    available ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Capacity */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <label className="block text-sm font-bold mb-1.5">Mentee Capacity</label>
            <p className="text-xs text-muted-foreground mb-3">
              How many mentees can you work with at once?
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setCapacity(n)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                    capacity === n
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-accent'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Specializations */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <label className="block text-sm font-bold mb-1.5">
              Mentoring Specializations
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Select what you can help mentees with
            </p>
            <div className="grid grid-cols-2 gap-2">
              {mentorSpecializations.map((spec) => (
                <button
                  key={spec}
                  onClick={() => toggleSpec(spec)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedSpecs.has(spec)
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'border border-border hover:bg-accent'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedSpecs.has(spec)
                        ? 'bg-primary border-primary'
                        : 'border-border'
                    }`}
                  >
                    {selectedSpecs.has(spec) && (
                      <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <label className="block text-sm font-bold mb-1.5">Mentor Bio</label>
            <p className="text-xs text-muted-foreground mb-3">
              Tell potential mentees what makes you a great mentor
            </p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="I have experience in..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
          >
            {saved ? 'Saved!' : 'Save Mentor Profile'}
          </button>
        </>
      )}
    </div>
  )
}
