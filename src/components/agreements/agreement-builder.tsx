'use client'

import { useState } from 'react'
import { useAppData } from '@/lib/data-provider'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Send,
  FileText,
  Upload,
  Loader2,
} from 'lucide-react'
import AgreementPreview from './agreement-preview'

type FeeMode = 'percent' | 'flat'
type SourceMode = 'template' | 'upload'

interface AgreementData {
  referringAgentName: string
  referringAgentBrokerage: string
  referringAgentEmail: string
  receivingAgentName: string
  receivingAgentBrokerage: string
  receivingAgentEmail: string
  clientName: string
  market: string
  estimatedPrice: string
  feeMode: FeeMode
  feePercent: number
  feeFlat: string
  expirationDate: string
  additionalTerms: string
}

interface AgreementBuilderProps {
  onClose: () => void
  prefill?: {
    receivingAgentName?: string
    receivingAgentBrokerage?: string
    receivingAgentEmail?: string
    clientName?: string
    market?: string
    estimatedPrice?: number
    feePercent?: number
  }
}

const STEPS = ['Source', 'Details', 'Review & Send'] as const
type Step = 0 | 1 | 2

export default function AgreementBuilder({ onClose, prefill }: AgreementBuilderProps) {
  const { agents } = useAppData()
  const currentUser = agents.find((a) => a.isPrimary) || agents[0]

  const [step, setStep] = useState<Step>(0)
  const [sourceMode, setSourceMode] = useState<SourceMode>('template')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const demoGuard = useDemoGuard()

  const [data, setData] = useState<AgreementData>({
    referringAgentName: currentUser?.name || '',
    referringAgentBrokerage: currentUser?.brokerage || '',
    referringAgentEmail: currentUser?.email || '',
    receivingAgentName: prefill?.receivingAgentName || '',
    receivingAgentBrokerage: prefill?.receivingAgentBrokerage || '',
    receivingAgentEmail: prefill?.receivingAgentEmail || '',
    clientName: prefill?.clientName || '',
    market: prefill?.market || '',
    estimatedPrice: prefill?.estimatedPrice ? String(prefill.estimatedPrice) : '',
    feeMode: 'percent',
    feePercent: prefill?.feePercent || 25,
    feeFlat: '',
    expirationDate: defaultExpiration(),
    additionalTerms: '',
  })

  function defaultExpiration(): string {
    const d = new Date()
    d.setMonth(d.getMonth() + 6)
    return d.toISOString().split('T')[0]
  }

  function updateField<K extends keyof AgreementData>(key: K, value: AgreementData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  const parsedPrice = parseInt(data.estimatedPrice.replace(/[^0-9]/g, ''), 10) || 0

  const canAdvance = (s: Step): boolean => {
    switch (s) {
      case 0:
        return sourceMode === 'template' || uploadedFile !== null
      case 1:
        return (
          data.receivingAgentName.trim().length > 0 &&
          data.receivingAgentEmail.trim().length > 0 &&
          data.clientName.trim().length > 0 &&
          data.market.trim().length > 0
        )
      case 2:
        return true
      default:
        return false
    }
  }

  function handleNext() {
    if (step < 2 && canAdvance(step)) {
      setStep((step + 1) as Step)
    }
  }

  function handleBack() {
    if (step > 0) setStep((step - 1) as Step)
  }

  async function handleSend() {
    if (demoGuard()) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/agreements/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${data.referringAgentName} / ${data.receivingAgentName} Referral Agreement`,
          subject: `Referral Agreement — ${data.clientName}`,
          message: `Please review and sign the referral fee agreement for ${data.clientName} (${data.market}).`,
          signerEmail: data.receivingAgentEmail,
          signerName: data.receivingAgentName,
          senderEmail: data.referringAgentEmail,
          senderName: data.referringAgentName,
          referralFee: data.feeMode === 'percent' ? `${data.feePercent}%` : `$${data.feeFlat}`,
          estimatedPrice: parsedPrice,
          clientName: data.clientName,
          market: data.market,
        }),
      })
      if (!res.ok) throw new Error('Send failed')
      setSent(true)
    } catch {
      setSendError('Failed to send agreement. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file)
    }
  }

  function formatPriceInput(value: string): string {
    const digits = value.replace(/[^0-9]/g, '')
    if (!digits) return ''
    return parseInt(digits, 10).toLocaleString()
  }

  // ---------- Success State ----------
  if (sent) {
    return (
      <div
        className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="font-bold text-xl mb-2">Agreement Sent!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Your referral agreement for{' '}
              <span className="font-semibold text-foreground">{data.clientName}</span>{' '}
              has been sent to
            </p>
            <p className="text-sm font-semibold text-primary mb-6">{data.receivingAgentName}</p>
            <p className="text-xs text-muted-foreground mb-6">
              They will receive an email with the agreement to review and sign.
            </p>
            <button
              onClick={onClose}
              className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- Main Modal ----------
  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="font-bold text-lg">Create Referral Agreement</div>
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
                    className={`text-[11px] font-semibold hidden sm:block ${
                      i === step ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 mx-2 ${i < step ? 'bg-emerald-500' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1: Source */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose how you want to create the agreement.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Standard Template */}
                <button
                  onClick={() => { setSourceMode('template'); setUploadedFile(null) }}
                  className={`p-5 rounded-xl border text-left transition-all ${
                    sourceMode === 'template'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      sourceMode === 'template' ? 'bg-primary/10' : 'bg-secondary'
                    }`}>
                      <FileText className={`w-5 h-5 ${sourceMode === 'template' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Use Standard Template</div>
                      <div className="text-[11px] text-muted-foreground">Professional referral agreement</div>
                    </div>
                    {sourceMode === 'template' && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use the built-in AgentReferrals agreement template. You can customize all the details in the next step.
                  </p>
                </button>

                {/* Upload */}
                <button
                  onClick={() => setSourceMode('upload')}
                  className={`p-5 rounded-xl border text-left transition-all ${
                    sourceMode === 'upload'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      sourceMode === 'upload' ? 'bg-primary/10' : 'bg-secondary'
                    }`}>
                      <Upload className={`w-5 h-5 ${sourceMode === 'upload' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Upload Your Agreement</div>
                      <div className="text-[11px] text-muted-foreground">PDF format</div>
                    </div>
                    {sourceMode === 'upload' && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload your own referral agreement PDF. It will be sent via Dropbox Sign for e-signatures.
                  </p>
                </button>
              </div>

              {sourceMode === 'upload' && (
                <div className="p-4 rounded-xl border border-dashed border-border bg-secondary/50">
                  <label className="flex flex-col items-center gap-2 cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      {uploadedFile ? uploadedFile.name : 'Click to select a PDF file'}
                    </span>
                    <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                  </label>
                  {uploadedFile && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-emerald-500 justify-center">
                      <Check className="w-3.5 h-3.5" />
                      File selected: {uploadedFile.name}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Details + Preview */}
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div className="space-y-4">
                {/* Referring Agent (pre-filled) */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Referring Agent (You)
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="text-sm font-semibold">{data.referringAgentName}</div>
                    <div className="text-xs text-muted-foreground">{data.referringAgentBrokerage}</div>
                    <div className="text-xs text-muted-foreground">{data.referringAgentEmail}</div>
                  </div>
                </div>

                {/* Receiving Agent */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Receiving Agent
                  </div>
                  <div className="space-y-2">
                    <input
                      value={data.receivingAgentName}
                      onChange={(e) => updateField('receivingAgentName', e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Agent name *"
                    />
                    <input
                      value={data.receivingAgentEmail}
                      onChange={(e) => updateField('receivingAgentEmail', e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Agent email *"
                    />
                    <input
                      value={data.receivingAgentBrokerage}
                      onChange={(e) => updateField('receivingAgentBrokerage', e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Brokerage"
                    />
                  </div>
                </div>

                {/* Client & Market */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Client Name *
                    </label>
                    <input
                      value={data.clientName}
                      onChange={(e) => updateField('clientName', e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Client name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Market / Area *
                    </label>
                    <input
                      value={data.market}
                      onChange={(e) => updateField('market', e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. Nashville, TN"
                    />
                  </div>
                </div>

                {/* Estimated Price */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Estimated Sale Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input
                      value={data.estimatedPrice}
                      onChange={(e) => updateField('estimatedPrice', formatPriceInput(e.target.value))}
                      className="w-full h-10 pl-7 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="620,000"
                    />
                  </div>
                </div>

                {/* Fee Mode Toggle */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Referral Fee
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => updateField('feeMode', 'percent')}
                      className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all border ${
                        data.feeMode === 'percent'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                    >
                      Percentage
                    </button>
                    <button
                      onClick={() => updateField('feeMode', 'flat')}
                      className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all border ${
                        data.feeMode === 'flat'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                    >
                      Flat Amount
                    </button>
                  </div>

                  {data.feeMode === 'percent' ? (
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="range"
                          min={1}
                          max={50}
                          value={data.feePercent}
                          onChange={(e) => updateField('feePercent', parseInt(e.target.value))}
                          className="flex-1 h-2 rounded-full appearance-none bg-secondary accent-primary cursor-pointer"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={data.feePercent}
                            onChange={(e) => updateField('feePercent', Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                            className="w-16 h-10 px-2 rounded-lg border border-input bg-background text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          <span className="text-sm font-bold text-muted-foreground">%</span>
                        </div>
                      </div>
                      {parsedPrice > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Estimated fee: <span className="font-semibold text-emerald-500">${Math.round(parsedPrice * data.feePercent / 100 * 0.03).toLocaleString()}</span>
                          {' '}(assuming 3% commission)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <input
                        value={data.feeFlat}
                        onChange={(e) => updateField('feeFlat', formatPriceInput(e.target.value))}
                        className="w-full h-10 pl-7 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="5,000"
                      />
                    </div>
                  )}
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Agreement Expiration
                  </label>
                  <input
                    type="date"
                    value={data.expirationDate}
                    onChange={(e) => updateField('expirationDate', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Additional Terms */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Additional Terms (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={data.additionalTerms}
                    onChange={(e) => updateField('additionalTerms', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Any special conditions or notes..."
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="hidden lg:block">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Live Preview
                </div>
                <div className="max-h-[600px] overflow-y-auto rounded-lg">
                  <AgreementPreview
                    referringAgentName={data.referringAgentName}
                    referringAgentBrokerage={data.referringAgentBrokerage}
                    referringAgentEmail={data.referringAgentEmail}
                    receivingAgentName={data.receivingAgentName}
                    receivingAgentBrokerage={data.receivingAgentBrokerage}
                    receivingAgentEmail={data.receivingAgentEmail}
                    clientName={data.clientName}
                    market={data.market}
                    estimatedPrice={parsedPrice}
                    feeMode={data.feeMode}
                    feePercent={data.feePercent}
                    feeFlat={parseInt(data.feeFlat.replace(/[^0-9]/g, ''), 10) || 0}
                    expirationDate={data.expirationDate}
                    additionalTerms={data.additionalTerms}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Send */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Agreement Summary
                  </div>

                  {/* Parties */}
                  <div className="rounded-xl border border-border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">From</div>
                        <div className="text-sm font-semibold">{data.referringAgentName}</div>
                        <div className="text-xs text-muted-foreground">{data.referringAgentBrokerage}</div>
                        <div className="text-xs text-muted-foreground">{data.referringAgentEmail}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">To</div>
                        <div className="text-sm font-semibold">{data.receivingAgentName}</div>
                        <div className="text-xs text-muted-foreground">{data.receivingAgentBrokerage}</div>
                        <div className="text-xs text-muted-foreground">{data.receivingAgentEmail}</div>
                      </div>
                    </div>
                  </div>

                  {/* Deal */}
                  <div className="rounded-xl border border-border p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Client', value: data.clientName },
                        { label: 'Market', value: data.market },
                        { label: 'Est. Price', value: parsedPrice > 0 ? `$${parsedPrice.toLocaleString()}` : '---' },
                        { label: 'Referral Fee', value: data.feeMode === 'percent' ? `${data.feePercent}%` : `$${data.feeFlat}` },
                        { label: 'Expires', value: data.expirationDate ? new Date(data.expirationDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '---' },
                        { label: 'Source', value: sourceMode === 'template' ? 'Standard Template' : uploadedFile?.name || 'Uploaded PDF' },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{item.label}</div>
                          <div className="text-sm font-semibold">{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {data.additionalTerms && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Additional Terms</div>
                        <div className="text-xs text-muted-foreground">{data.additionalTerms}</div>
                      </div>
                    )}
                  </div>

                  {/* Email verification note */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs">
                    <Send className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-indigo-400">
                      <strong>{data.receivingAgentName}</strong> will receive an email at{' '}
                      <strong>{data.receivingAgentEmail}</strong> with the agreement to sign electronically.
                    </div>
                  </div>

                  {sendError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                      {sendError}
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Document Preview
                  </div>
                  <div className="max-h-[500px] overflow-y-auto rounded-lg">
                    <AgreementPreview
                      referringAgentName={data.referringAgentName}
                      referringAgentBrokerage={data.referringAgentBrokerage}
                      referringAgentEmail={data.referringAgentEmail}
                      receivingAgentName={data.receivingAgentName}
                      receivingAgentBrokerage={data.receivingAgentBrokerage}
                      receivingAgentEmail={data.receivingAgentEmail}
                      clientName={data.clientName}
                      market={data.market}
                      estimatedPrice={parsedPrice}
                      feeMode={data.feeMode}
                      feePercent={data.feePercent}
                      feeFlat={parseInt(data.feeFlat.replace(/[^0-9]/g, ''), 10) || 0}
                      expirationDate={data.expirationDate}
                      additionalTerms={data.additionalTerms}
                    />
                  </div>
                </div>
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
            {step < 2 ? (
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
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-1.5 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send for Signature
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
