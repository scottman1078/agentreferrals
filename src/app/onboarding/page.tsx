'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { brokerages } from '@/data/brokerages'
import { ALL_TAGS, TAG_COLORS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  User,
  Sparkles,
  CheckCircle2,
  Loader2,
} from 'lucide-react'

const TOTAL_STEPS = 4

interface OnboardingData {
  brokerageId: string | null
  customBrokerage: string
  fullName: string
  phone: string
  primaryArea: string
  yearsLicensed: number | null
  dealsPerYear: number | null
  avgSalePrice: number | null
  specializations: string[]
}

const STEP_LABELS = ['Brokerage', 'Profile', 'Specializations', 'Review']
const STEP_ICONS = [Building2, User, Sparkles, CheckCircle2]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userName, setUserName] = useState<string>('')

  const [data, setData] = useState<OnboardingData>({
    brokerageId: null,
    customBrokerage: '',
    fullName: '',
    phone: '',
    primaryArea: '',
    yearsLicensed: null,
    dealsPerYear: null,
    avgSalePrice: null,
    specializations: [],
  })

  // Load user info on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string; email?: string | null; user_metadata?: Record<string, string> } | null } }) => {
      if (!user) {
        router.push('/')
        return
      }
      setUserId(user.id)
      setUserEmail(user.email ?? '')
      const name = user.user_metadata?.full_name ?? ''
      setUserName(name)
      setData((prev) => ({ ...prev, fullName: name }))
    })
  }, [supabase, router])

  const updateField = <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  const toggleSpecialization = (tag: string) => {
    setData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(tag)
        ? prev.specializations.filter((t) => t !== tag)
        : [...prev.specializations, tag],
    }))
  }

  // Validation per step
  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return data.brokerageId !== null
      case 2:
        return (
          data.fullName.trim().length > 0 &&
          data.primaryArea.trim().length > 0
        )
      case 3:
        return data.specializations.length >= 1
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    if (!userId) return
    setIsSubmitting(true)
    setSubmitError(null)

    // Resolve brokerage: if "other", it's custom text; otherwise look up the ar_brokerages ID
    let brokerageIdForDb: string | null = null

    if (data.brokerageId && data.brokerageId !== 'other') {
      // Look up the ar_brokerages row by matching the static brokerage name
      const selectedBrokerage = brokerages.find(
        (b) => b.id === data.brokerageId
      )
      if (selectedBrokerage) {
        const { data: brokerageRow } = await supabase
          .from('ar_brokerages')
          .select('id')
          .eq('name', selectedBrokerage.name)
          .single()
        brokerageIdForDb = brokerageRow?.id ?? null
      }
    }

    const updatePayload = {
      full_name: data.fullName.trim(),
      phone: data.phone.trim() || null,
      brokerage_id: brokerageIdForDb,
      primary_area: data.primaryArea.trim(),
      years_licensed: data.yearsLicensed,
      deals_per_year: data.dealsPerYear,
      avg_sale_price: data.avgSalePrice,
      tags: data.specializations,
      status: 'active',
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('ar_profiles')
      .update(updatePayload)
      .eq('user_id', userId)

    if (error) {
      setSubmitError(error.message)
      setIsSubmitting(false)
      return
    }

    router.push('/dashboard')
  }

  const getBrokerageName = (): string => {
    if (data.brokerageId === 'other') return data.customBrokerage || 'Other'
    const match = brokerages.find((b) => b.id === data.brokerageId)
    return match?.name ?? 'Not selected'
  }

  // ─── Progress bar ───
  const progressPercent = (step / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="h-14 min-h-14 flex items-center px-6 border-b border-border bg-card">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-extrabold text-xs text-primary-foreground">
            A
          </div>
          <span className="font-extrabold text-[15px] tracking-tight">
            Agent<span className="text-primary">Referrals</span>
            <span className="text-muted-foreground text-xs font-medium">
              .ai
            </span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-3 py-6">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1
          const Icon = STEP_ICONS[i]
          const isActive = step === stepNum
          const isComplete = step > stepNum
          return (
            <div key={label} className="flex items-center gap-3">
              {i > 0 && (
                <div
                  className={`w-8 h-px ${
                    isComplete ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isComplete
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'bg-primary/10 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    isActive
                      ? 'text-foreground'
                      : isComplete
                        ? 'text-primary'
                        : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-2xl">
          {/* ═══ STEP 1: Brokerage ═══ */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h1 className="font-extrabold text-3xl tracking-tight mb-2">
                  Welcome to AgentReferrals.ai
                </h1>
                <p className="text-muted-foreground">
                  Let&apos;s set up your profile so agents can find you
                </p>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Select your brokerage
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {brokerages.map((b) => {
                  const isSelected = data.brokerageId === b.id
                  return (
                    <button
                      key={b.id}
                      onClick={() => updateField('brokerageId', b.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-card hover:border-primary/30'
                      }`}
                    >
                      {b.logoUrl ? (
                        <div className="w-12 h-12 rounded-xl bg-white border border-border flex items-center justify-center p-1.5 overflow-hidden mb-2">
                          <img src={b.logoUrl} alt={b.name} className="w-12 h-12 object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-xs text-white mb-2" style={{ background: b.color }}>
                          {b.logo}
                        </div>
                      )}
                      <div className="font-bold text-sm">{b.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {b.memberCount.toLocaleString()} agents
                      </div>
                      {isSelected && (
                        <div className="mt-2">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </button>
                  )
                })}

                {/* Other / Independent */}
                <button
                  onClick={() => updateField('brokerageId', 'other')}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                    data.brokerageId === 'other'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-xs bg-muted text-muted-foreground mb-2">
                    +
                  </div>
                  <div className="font-bold text-sm">
                    Other / Independent
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Not listed above
                  </div>
                  {data.brokerageId === 'other' && (
                    <div className="mt-2">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </button>
              </div>

              {/* Custom brokerage input */}
              {data.brokerageId === 'other' && (
                <div className="mt-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Brokerage Name
                  </label>
                  <input
                    type="text"
                    value={data.customBrokerage}
                    onChange={(e) =>
                      updateField('customBrokerage', e.target.value)
                    }
                    placeholder="Enter your brokerage name"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: Profile ═══ */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h1 className="font-extrabold text-3xl tracking-tight mb-2">
                  Your Profile
                </h1>
                <p className="text-muted-foreground">
                  Help other agents learn about your business
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={data.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder="Your full name"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={data.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Primary Service Area *
                  </label>
                  <input
                    type="text"
                    value={data.primaryArea}
                    onChange={(e) =>
                      updateField('primaryArea', e.target.value)
                    }
                    placeholder="e.g. Kalamazoo, MI"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    City and state where you primarily work
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Years Licensed
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={data.yearsLicensed ?? ''}
                      onChange={(e) =>
                        updateField(
                          'yearsLicensed',
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      placeholder="5"
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Deals / Year
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={data.dealsPerYear ?? ''}
                      onChange={(e) =>
                        updateField(
                          'dealsPerYear',
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      placeholder="20"
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Avg Sale Price
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={data.avgSalePrice ?? ''}
                      onChange={(e) =>
                        updateField(
                          'avgSalePrice',
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      placeholder="350000"
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Specializations ═══ */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h1 className="font-extrabold text-3xl tracking-tight mb-2">
                  Your Specializations
                </h1>
                <p className="text-muted-foreground">
                  Select at least one area of expertise so we can match you
                  with the right referrals
                </p>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                {ALL_TAGS.map((tag) => {
                  const isSelected = data.specializations.includes(tag)
                  const color = TAG_COLORS[tag] ?? '#6b7280'
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleSpecialization(tag)}
                      className={`px-5 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        isSelected
                          ? 'shadow-md scale-105'
                          : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                      }`}
                      style={
                        isSelected
                          ? {
                              borderColor: color,
                              backgroundColor: `${color}10`,
                              color: color,
                            }
                          : undefined
                      }
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 inline mr-1.5" />}
                      {tag}
                    </button>
                  )
                })}
              </div>

              {data.specializations.length === 0 && (
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Select at least 1 specialization to continue
                </p>
              )}
            </div>
          )}

          {/* ═══ STEP 4: Review ═══ */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h1 className="font-extrabold text-3xl tracking-tight mb-2">
                  Almost Done!
                </h1>
                <p className="text-muted-foreground">
                  Review your information and complete setup
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                {/* Brokerage */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Brokerage
                    </div>
                    <div className="font-bold">{getBrokerageName()}</div>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="h-px bg-border" />

                {/* Profile */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Profile
                    </div>
                    <div>
                      <span className="font-bold">{data.fullName}</span>
                      {userEmail && (
                        <span className="text-sm text-muted-foreground ml-2">
                          {userEmail}
                        </span>
                      )}
                    </div>
                    {data.phone && (
                      <div className="text-sm text-muted-foreground">
                        {data.phone}
                      </div>
                    )}
                    <div className="text-sm">{data.primaryArea}</div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {data.yearsLicensed != null && (
                        <span>{data.yearsLicensed} yrs licensed</span>
                      )}
                      {data.dealsPerYear != null && (
                        <span>{data.dealsPerYear} deals/yr</span>
                      )}
                      {data.avgSalePrice != null && (
                        <span>{formatCurrency(data.avgSalePrice)} avg</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="h-px bg-border" />

                {/* Specializations */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Specializations
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.specializations.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `${TAG_COLORS[tag] ?? '#6b7280'}15`,
                            color: TAG_COLORS[tag] ?? '#6b7280',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(3)}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {submitError && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                  {submitError}
                </div>
              )}
            </div>
          )}

          {/* ═══ Navigation Buttons ═══ */}
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 h-10 px-5 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance()}
                className="flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
