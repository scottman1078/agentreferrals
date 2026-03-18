'use client'

import { useState, useCallback } from 'react'
import { Check, ChevronRight, ChevronLeft, Plus, X, Mail, MapPin, Users, Sparkles, Loader2 } from 'lucide-react'
import TerritorySelector, { type TerritoryData } from '@/components/onboarding/territory-selector'
import type { ArProfile } from '@/contexts/auth-context'

interface SetupWizardProps {
  onComplete: () => void
  profile: ArProfile | null
}

const STEPS = ['Service Area', 'Invites', 'Done'] as const

export default function SetupWizard({ onComplete, profile }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Step 1: Territory
  const [territory, setTerritory] = useState<TerritoryData>({
    mode: 'zip',
    selectedCounties: [],
    selectedZips: profile?.territory_zips ?? [],
    drawnPolygon: [],
    polygon: (profile?.polygon as TerritoryData['polygon']) ?? [],
  })

  // Step 2: Invites
  const [emails, setEmails] = useState<string[]>([''])
  const [invitesSent, setInvitesSent] = useState(0)
  const [sendingInvites, setSendingInvites] = useState(false)
  const [inviteError, setInviteError] = useState('')

  // Animation direction
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left')

  const goNext = useCallback(() => {
    setSlideDir('left')
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
  }, [])

  const goBack = useCallback(() => {
    setSlideDir('right')
    setCurrentStep((s) => Math.max(s - 1, 0))
  }, [])

  // Save territory
  const handleSaveTerritory = useCallback(async () => {
    if (!profile?.id) return

    const hasZips = territory.selectedZips.length > 0
    const hasPolygon = territory.polygon.length > 0
    if (!hasZips && !hasPolygon) {
      setSaveError('Please add at least one zip code or draw a service area.')
      return
    }

    setSaving(true)
    setSaveError('')

    try {
      const res = await fetch('/api/territory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          polygon: territory.polygon,
          territory_zips: territory.selectedZips,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save territory')
      }

      goNext()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [profile?.id, territory, goNext])

  // Send invites
  const handleSendInvites = useCallback(async () => {
    const validEmails = emails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes('@') && e.includes('.'))

    if (validEmails.length === 0) {
      setInviteError('Please enter at least one valid email address.')
      return
    }

    setSendingInvites(true)
    setInviteError('')

    try {
      const res = await fetch('/api/onboarding-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id,
          userName: profile?.full_name,
          emails: validEmails,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invites')
      }

      setInvitesSent(data.sent ?? validEmails.length)
      goNext()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invites. Please try again.')
    } finally {
      setSendingInvites(false)
    }
  }, [emails, profile?.id, profile?.full_name, goNext])

  const addEmailRow = useCallback(() => {
    setEmails((prev) => [...prev, ''])
  }, [])

  const updateEmail = useCallback((index: number, value: string) => {
    setEmails((prev) => prev.map((e, i) => (i === index ? value : e)))
  }, [])

  const removeEmailRow = useCallback((index: number) => {
    setEmails((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-card shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Compact header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-3 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Define Your Service Area</h2>
            {/* Step dots */}
            <div className="flex items-center gap-2">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full transition-all ${
                      i < currentStep
                        ? 'bg-green-500'
                        : i === currentStep
                        ? 'bg-primary ring-2 ring-primary/20'
                        : 'bg-muted-foreground/30'
                    }`}
                    title={label}
                  />
                  {i < STEPS.length - 1 && (
                    <div className={`w-6 h-px ${i < currentStep ? 'bg-green-500' : 'bg-border'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Step 1: Territory */}
          {currentStep === 0 && (
            <div className={`animate-in ${slideDir === 'left' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'} duration-300`}>
              {/* Free tier callout */}
              <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                  You&apos;re on the free plan — only agents in your direct network will see your service area.{' '}
                  <button
                    onClick={() => {
                      // Will navigate after wizard completes
                      onComplete()
                      window.location.href = '/dashboard/settings?tab=subscription'
                    }}
                    className="underline font-semibold hover:text-amber-800 dark:hover:text-amber-300"
                  >
                    Upgrade to be visible to all agents
                  </button>
                </p>
              </div>

              <div className="min-h-[400px]">
                <TerritorySelector
                  value={territory}
                  onChange={setTerritory}
                  initialCenter={profile?.primary_area || undefined}
                />
              </div>

              {saveError && (
                <p className="mt-3 text-sm text-destructive font-medium">{saveError}</p>
              )}
            </div>
          )}

          {/* Step 2: Invites */}
          {currentStep === 1 && (
            <div className={`animate-in ${slideDir === 'left' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'} duration-300`}>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Invite Your Referral Partners</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  The more agents in your network, the more valuable AgentReferrals becomes for everyone.
                </p>
              </div>

              {/* Stat callout */}
              <div className="mb-5 p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                <p className="text-xs text-primary font-medium">
                  Agents who invite 5+ partners see 3x more referral opportunities
                </p>
              </div>

              {/* Email inputs */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email addresses</label>
                {emails.map((email, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addEmailRow()
                          }
                        }}
                        placeholder="agent@example.com"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    {emails.length > 1 && (
                      <button
                        onClick={() => removeEmailRow(i)}
                        className="h-10 w-10 flex items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={addEmailRow}
                  className="flex items-center gap-1.5 text-sm text-primary font-medium hover:text-primary/80 transition-colors mt-1"
                >
                  <Plus className="w-4 h-4" />
                  Add another email
                </button>
              </div>

              {inviteError && (
                <p className="mt-3 text-sm text-destructive font-medium">{inviteError}</p>
              )}
            </div>
          )}

          {/* Step 3: Completion */}
          {currentStep === 2 && (
            <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-4">
              {/* Celebration icon */}
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-5">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center animate-in zoom-in duration-500">
                  <Check className="w-8 h-8 text-green-600" strokeWidth={3} />
                </div>
                {/* Decorative sparkles */}
                <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-500 animate-bounce" />
                <Sparkles className="absolute -bottom-1 -left-2 w-4 h-4 text-primary animate-bounce delay-150" />
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-1">
                Welcome to AgentReferrals{firstName !== 'there' ? `, ${firstName}` : ''}!
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your profile is live and your service area is set. Start exploring your network.
              </p>

              {/* Setup summary */}
              <div className="inline-flex flex-col gap-2 text-left bg-muted/50 rounded-xl p-4 mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-foreground">
                    Service area: <strong>{territory.selectedZips.length} zip code{territory.selectedZips.length !== 1 ? 's' : ''} defined</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-foreground">
                    Invites sent: <strong>{invitesSent} agent{invitesSent !== 1 ? 's' : ''} invited</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 rounded-b-2xl">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div>
              {currentStep === 1 && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Skip link for step 2 */}
              {currentStep === 1 && (
                <button
                  onClick={() => {
                    setInvitesSent(0)
                    goNext()
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              )}

              {/* Primary action */}
              {currentStep === 0 && (
                <button
                  onClick={handleSaveTerritory}
                  disabled={saving}
                  className="flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save & Continue
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              {currentStep === 1 && (
                <button
                  onClick={handleSendInvites}
                  disabled={sendingInvites}
                  className="flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {sendingInvites ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Invites & Continue
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              {currentStep === 2 && (
                <button
                  onClick={onComplete}
                  className="flex items-center gap-2 h-11 px-8 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
                >
                  Explore Dashboard
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
