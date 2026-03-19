'use client'

import { useState, useMemo } from 'react'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import { useAppData } from '@/lib/data-provider'
import { TAG_COLORS } from '@/lib/constants'
import { formatCurrency, getInitials } from '@/lib/utils'
import { AgentReviewBadge } from '@/components/reviews/agent-review-badge'
import {
  X,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  User,
  Users,
  FileText,
  Send,
  Star,
  DollarSign,
} from 'lucide-react'
import type { Agent, PipelineStage } from '@/types'

type RepresentationType = 'Buyer' | 'Seller' | 'Both'

interface ClientInfo {
  name: string
  email: string
  phone: string
  representation: RepresentationType
  budget: string
  notes: string
}

interface ReferralTerms {
  market: string
  feePercent: number
  estCloseDate: string
  agreementExpDays: number
  personalNote: string
  estimatedPrice: number
  commissionRate: number
}

interface CreateReferralModalProps {
  onClose: () => void
  preselectedAgentId?: string
  onCreated?: () => void
}

const STEPS = ['Client Info', 'Select Agent', 'Terms', 'Review & Send'] as const
type Step = 0 | 1 | 2 | 3

function formatNumberWithCommas(value: number): string {
  if (!value) return ''
  return value.toLocaleString('en-US')
}

function parseFormattedNumber(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, '')
  return parseInt(cleaned) || 0
}

export default function CreateReferralModal({
  onClose,
  preselectedAgentId,
  onCreated,
}: CreateReferralModalProps) {
  const [step, setStep] = useState<Step>(preselectedAgentId ? 0 : 0)
  const [submitted, setSubmitted] = useState(false)
  const { agents } = useAppData()
  const demoGuard = useDemoGuard()

  // Step 1 — Client Info
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    email: '',
    phone: '',
    representation: 'Buyer',
    budget: '',
    notes: '',
  })

  // Step 2 — Agent Selection
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    preselectedAgentId ?? null
  )

  // Step 3 — Terms
  const [terms, setTerms] = useState<ReferralTerms>({
    market: '',
    feePercent: 25,
    estCloseDate: '',
    agreementExpDays: 180,
    personalNote: '',
    estimatedPrice: 0,
    commissionRate: 3,
  })

  // Display state for the price input (formatted with commas)
  const [priceDisplay, setPriceDisplay] = useState('')

  // Derived
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [selectedAgentId]
  )

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents.filter((a) => a.id !== 'jason') // exclude self
    const q = searchQuery.toLowerCase()
    return agents
      .filter((a) => a.id !== 'jason') // exclude self
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.area.toLowerCase().includes(q) ||
          a.brokerage.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      )
  }, [searchQuery])

  // Fee calculations
  const commission = terms.estimatedPrice * (terms.commissionRate / 100)
  const referralFee = commission * (terms.feePercent / 100)

  // Validation
  const canAdvance = (s: Step): boolean => {
    switch (s) {
      case 0:
        return clientInfo.name.trim().length > 0
      case 1:
        return selectedAgentId !== null
      case 2:
        return terms.market.trim().length > 0 && terms.feePercent > 0
      case 3:
        return true
      default:
        return false
    }
  }

  function handleNext() {
    if (step < 3 && canAdvance(step)) {
      const next = (step + 1) as Step
      // Pre-fill market from selected agent when entering terms step
      if (next === 2 && selectedAgent && !terms.market) {
        setTerms((prev) => ({ ...prev, market: selectedAgent.area }))
      }
      setStep(next)
    }
  }

  function handleBack() {
    if (step > 0) setStep((step - 1) as Step)
  }

  function handleSubmit() {
    if (demoGuard()) return
    // In the future, insert into ar_referrals via Supabase
    // For now, just show success state
    setSubmitted(true)
  }

  function handleSelectAgent(agent: Agent) {
    setSelectedAgentId(agent.id)
  }

  function handlePriceChange(value: string) {
    const num = parseFormattedNumber(value)
    setTerms((p) => ({ ...p, estimatedPrice: num }))
    setPriceDisplay(num > 0 ? formatNumberWithCommas(num) : '')
  }

  // ---------- Success State ----------
  if (submitted) {
    return (
      <div
        className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="font-bold text-xl mb-2">Referral Sent!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Your referral for{' '}
              <span className="font-semibold text-foreground">
                {clientInfo.name}
              </span>{' '}
              has been sent to
            </p>
            <p className="text-sm font-semibold text-primary mb-6">
              {selectedAgent?.name}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onCreated?.()
                  onClose()
                }}
                className="h-10 px-5 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors"
              >
                View in Pipeline
              </button>
              <button
                onClick={() => {
                  // Reset everything for another referral
                  setSubmitted(false)
                  setStep(0)
                  setClientInfo({
                    name: '',
                    email: '',
                    phone: '',
                    representation: 'Buyer',
                    budget: '',
                    notes: '',
                  })
                  setSelectedAgentId(null)
                  setSearchQuery('')
                  setTerms({
                    market: '',
                    feePercent: 25,
                    estCloseDate: '',
                    agreementExpDays: 180,
                    personalNote: '',
                    estimatedPrice: 0,
                    commissionRate: 3,
                  })
                  setPriceDisplay('')
                }}
                className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---------- Main Modal ----------
  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[680px] max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="font-bold text-lg">New Referral</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4 pb-3 shrink-0">
          <div className="flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      i < step
                        ? 'bg-emerald-500 text-white'
                        : i === step
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span
                    className={`text-[11px] font-semibold whitespace-nowrap ${
                      i === step
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px flex-1 mx-2 ${
                      i < step ? 'bg-emerald-500' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1: Client Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Client Name *
                </label>
                <input
                  value={clientInfo.name}
                  onChange={(e) =>
                    setClientInfo((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Full name"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={clientInfo.email}
                    onChange={(e) =>
                      setClientInfo((p) => ({ ...p, email: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="client@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={clientInfo.phone}
                    onChange={(e) =>
                      setClientInfo((p) => ({ ...p, phone: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="(555) 555-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Agent Representation *
                </label>
                <div className="flex gap-2">
                  {(['Buyer', 'Seller', 'Both'] as RepresentationType[]).map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() =>
                          setClientInfo((p) => ({ ...p, representation: type }))
                        }
                        className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all border ${
                          clientInfo.representation === type
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        {type}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Budget / Price Range
                </label>
                <input
                  value={clientInfo.budget}
                  onChange={(e) =>
                    setClientInfo((p) => ({ ...p, budget: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. $300k - $450k"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Notes About the Client
                </label>
                <textarea
                  rows={3}
                  value={clientInfo.notes}
                  onChange={(e) =>
                    setClientInfo((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Pre-approval status, timeline, preferences..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Select Agent */}
          {step === 1 && (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, area, brokerage, or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
              </div>
              <div className="text-[11px] text-muted-foreground">
                {filteredAgents.length} agent
                {filteredAgents.length !== 1 ? 's' : ''} found
              </div>

              {/* Agent List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredAgents.map((agent) => {
                  const isSelected = selectedAgentId === agent.id
                  return (
                    <button
                      key={agent.id}
                      onClick={() => handleSelectAgent(agent)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-background hover:border-primary/30 hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                          style={{ background: agent.color }}
                        >
                          {getInitials(agent.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-sm">
                              {agent.name}
                            </span>
                            {agent.rcsScore && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  agent.rcsScore >= 90
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-primary/10 text-primary'
                                }`}
                              >
                                {agent.rcsScore}
                              </span>
                            )}
                            <AgentReviewBadge agentId={agent.id} size="sm" />
                          </div>
                          <div className="text-[11px] text-muted-foreground mb-1">
                            {agent.brokerage}
                          </div>
                          <div className="text-[11px] text-muted-foreground mb-1.5">
                            {agent.area}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {agent.tags.map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white"
                                style={{ background: TAG_COLORS[t] }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {agent.closedReferrals !== undefined && (
                            <div className="text-[10px] font-bold text-emerald-500">
                              {agent.closedReferrals} closed
                            </div>
                          )}
                          {agent.responseTime && (
                            <div className="text-[9px] text-muted-foreground">
                              {agent.responseTime}
                            </div>
                          )}
                          {isSelected && (
                            <div className="mt-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center ml-auto">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Terms */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Market / Area *
                </label>
                <input
                  value={terms.market}
                  onChange={(e) =>
                    setTerms((p) => ({ ...p, market: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Nashville, TN"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Estimated Sale Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={priceDisplay}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. 450,000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Commission %
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0.5}
                      max={10}
                      step={0.25}
                      value={terms.commissionRate}
                      onChange={(e) =>
                        setTerms((p) => ({
                          ...p,
                          commissionRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full h-10 px-3 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Referral Fee %
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={terms.feePercent}
                      onChange={(e) =>
                        setTerms((p) => ({
                          ...p,
                          feePercent: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full h-10 px-3 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Est. Close Date
                  </label>
                  <input
                    type="date"
                    value={terms.estCloseDate}
                    onChange={(e) =>
                      setTerms((p) => ({
                        ...p,
                        estCloseDate: e.target.value,
                      }))
                    }
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Fee Calculator */}
              {terms.estimatedPrice > 0 && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2.5">
                    Fee Calculator
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Commission ({terms.commissionRate}% of ${formatNumberWithCommas(terms.estimatedPrice)})
                      </span>
                      <span className="text-sm font-semibold">
                        ${formatNumberWithCommas(Math.round(commission))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Your Referral Fee ({terms.feePercent}% of commission)
                      </span>
                      <span className="text-sm font-bold text-primary">
                        ${formatNumberWithCommas(Math.round(referralFee))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Agreement Expiration
                </label>
                <div className="flex gap-2">
                  {[90, 180, 365].map((days) => (
                    <button
                      key={days}
                      onClick={() =>
                        setTerms((p) => ({ ...p, agreementExpDays: days }))
                      }
                      className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all border ${
                        terms.agreementExpDays === days
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Personal Note to Agent
                </label>
                <textarea
                  rows={3}
                  value={terms.personalNote}
                  onChange={(e) =>
                    setTerms((p) => ({ ...p, personalNote: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Hey! I have a great client for you..."
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Client Summary */}
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Client
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="font-semibold text-sm">{clientInfo.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {clientInfo.representation}
                    {clientInfo.budget ? ` \u00B7 ${clientInfo.budget}` : ''}
                  </div>
                  {clientInfo.email && (
                    <div className="text-xs text-muted-foreground">
                      {clientInfo.email}
                    </div>
                  )}
                  {clientInfo.phone && (
                    <div className="text-xs text-muted-foreground">
                      {clientInfo.phone}
                    </div>
                  )}
                  {clientInfo.notes && (
                    <div className="text-xs text-muted-foreground mt-2 italic">
                      &ldquo;{clientInfo.notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Agent Summary */}
              {selectedAgent && (
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Receiving Agent
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                      style={{ background: selectedAgent.color }}
                    >
                      {getInitials(selectedAgent.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">
                        {selectedAgent.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {selectedAgent.brokerage}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {selectedAgent.area}
                      </div>
                    </div>
                    {selectedAgent.rcsScore && (
                      <div className="ml-auto">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            selectedAgent.rcsScore >= 90
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {selectedAgent.rcsScore} RS
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Terms Summary */}
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Terms
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                      Market
                    </div>
                    <div className="text-sm font-semibold">{terms.market}</div>
                  </div>
                  {terms.estimatedPrice > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                        Est. Sale Price
                      </div>
                      <div className="text-sm font-semibold">
                        ${formatNumberWithCommas(terms.estimatedPrice)}
                      </div>
                    </div>
                  )}
                  {terms.estimatedPrice > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                        Commission ({terms.commissionRate}%)
                      </div>
                      <div className="text-sm font-semibold">
                        ${formatNumberWithCommas(Math.round(commission))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                      Referral Fee
                    </div>
                    <div className="text-sm font-semibold">
                      {terms.feePercent}%
                      {terms.estimatedPrice > 0 && (
                        <span className="text-primary ml-1">
                          (${formatNumberWithCommas(Math.round(referralFee))})
                        </span>
                      )}
                    </div>
                  </div>
                  {terms.estCloseDate && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                        Est. Close
                      </div>
                      <div className="text-sm font-semibold">
                        {new Date(terms.estCloseDate).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                      Agreement Expires
                    </div>
                    <div className="text-sm font-semibold">
                      {terms.agreementExpDays} days
                    </div>
                  </div>
                </div>
                {terms.personalNote && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Note to Agent
                    </div>
                    <div className="text-xs text-muted-foreground italic">
                      &ldquo;{terms.personalNote}&rdquo;
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <div>
            {step > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 h-10 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-10 px-5 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={!canAdvance(step)}
                className="flex items-center gap-1.5 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-1.5 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
                Send Referral
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
