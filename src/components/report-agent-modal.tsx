'use client'

import { useState } from 'react'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import { X, Flag, AlertTriangle, ShieldOff } from 'lucide-react'
import { REPORT_REASON_LABELS, type ReportReason } from '@/data/report-block'

interface ReportAgentModalProps {
  agentId: string
  agentName: string
  onClose: () => void
  onSubmit: (reason: ReportReason, description: string) => void
}

export default function ReportAgentModal({
  agentId,
  agentName,
  onClose,
  onSubmit,
}: ReportAgentModalProps) {
  const [reason, setReason] = useState<ReportReason>('spam')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const demoGuard = useDemoGuard()

  function handleSubmit() {
    if (demoGuard()) return
    onSubmit(reason, description)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="w-full max-w-[400px] rounded-2xl border border-border bg-card shadow-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <ShieldOff className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="font-bold text-lg mb-1">Report Submitted</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Thank you for helping keep AgentReferrals safe. We&apos;ll review your report shortly.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" />
            <span className="font-bold text-base">Report {agentName}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            >
              {(Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional details..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground resize-none"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Reports are reviewed by our team. False reports may result in account restrictions.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  )
}
