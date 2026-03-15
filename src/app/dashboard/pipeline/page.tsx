'use client'

import { useState, useEffect } from 'react'
import { useAppData } from '@/lib/data-provider'
import { PIPELINE_STAGES, STAGE_COLORS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import CreateReferralModal from '@/components/referral/create-referral-modal'
import AgreementBuilder from '@/components/agreements/agreement-builder'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, GitPullRequestArrow, FileSignature } from 'lucide-react'
import type { PipelineStage, Referral } from '@/types'

function PipelineSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
        <div className="flex items-center gap-3 sm:gap-5 mb-3 sm:mb-0">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="flex gap-4 sm:gap-5 sm:justify-end">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto overflow-y-hidden px-3 sm:px-5 py-3 sm:py-4 flex-1 items-start">
        {Array.from({ length: 6 }).map((_, col) => (
          <div key={col} className="min-w-[200px] sm:min-w-[220px] max-w-[220px] flex flex-col gap-2">
            <Skeleton className="h-9 w-full rounded-lg" />
            {Array.from({ length: col % 2 === 0 ? 3 : 2 }).map((_, row) => (
              <Skeleton key={row} className="h-[120px] w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const { referrals, referralsLoading } = useAppData()
  const [referralList, setReferralList] = useState<Referral[]>(referrals)

  // Sync when data source changes (e.g., auth state resolves)
  useEffect(() => {
    setReferralList(referrals)
  }, [referrals])
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [agreementReferral, setAgreementReferral] = useState<Referral | null>(null)

  const stageReferrals = (stage: PipelineStage) => referralList.filter((r) => r.stage === stage)
  const totalValue = referralList.reduce((s, r) => s + r.estimatedPrice, 0)
  const totalFees = referralList.reduce((s, r) => s + r.estimatedPrice * (r.feePercent / 100), 0)

  function handleDrop(stage: PipelineStage) {
    if (!draggedId) return
    setReferralList((prev) => prev.map((r) => (r.id === draggedId ? { ...r, stage } : r)))
    setDraggedId(null)
  }

  if (referralsLoading) return <PipelineSkeleton />

  if (referralList.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 border-b border-border px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
          <div className="flex items-center gap-3 sm:gap-5">
            <h1 className="font-bold text-lg sm:text-xl">Referral Pipeline</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Referral</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={GitPullRequestArrow}
            title="No referrals yet"
            description="Send your first referral to get started. Your pipeline will track every referral from agreement to fee received."
            actionLabel="Create Referral"
            onAction={() => setShowCreateModal(true)}
          />
        </div>
        {showCreateModal && (
          <CreateReferralModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => setShowCreateModal(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
        <div className="flex items-center gap-3 sm:gap-5 mb-3 sm:mb-0">
          <h1 className="font-bold text-lg sm:text-xl">Referral Pipeline</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Referral</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
        <div className="flex gap-4 sm:gap-5 sm:justify-end">
          <div className="sm:text-right">
            <div className="font-bold text-base sm:text-lg">{referralList.length}</div>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Active</div>
          </div>
          <div className="sm:text-right">
            <div className="font-bold text-base sm:text-lg">{formatCurrency(totalValue)}</div>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Volume</div>
          </div>
          <div className="sm:text-right">
            <div className="font-bold text-base sm:text-lg text-emerald-500">{formatCurrency(totalFees)}</div>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Est. Fees</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-y-auto px-3 sm:px-5 py-3 sm:py-4 flex-1 items-start">
        {PIPELINE_STAGES.map((stage) => {
          const stageColor = STAGE_COLORS[stage]
          const cards = stageReferrals(stage)
          return (
            <div key={stage} className="min-w-0 flex flex-col gap-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-1" style={{ background: `${stageColor}12` }}>
                <div className="font-bold text-[11px] font-bold uppercase tracking-wider" style={{ color: stageColor }}>{stage}</div>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-secondary text-secondary-foreground">{cards.length}</div>
              </div>
              <div
                className="min-h-[100px] rounded-lg p-0.5 transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-primary/5', 'outline', 'outline-1', 'outline-dashed', 'outline-primary/30') }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('bg-primary/5', 'outline', 'outline-1', 'outline-dashed', 'outline-primary/30') }}
                onDrop={(e) => { e.currentTarget.classList.remove('bg-primary/5', 'outline', 'outline-1', 'outline-dashed', 'outline-primary/30'); handleDrop(stage) }}
              >
                {cards.map((ref) => (
                  <div
                    key={ref.id}
                    draggable
                    onDragStart={() => setDraggedId(ref.id)}
                    className="p-3 rounded-lg mb-2 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 border border-border bg-card hover:shadow-md group"
                    style={{ borderLeftWidth: '3px', borderLeftColor: stageColor, opacity: draggedId === ref.id ? 0.25 : 1 }}
                  >
                    <div className="font-semibold text-[13px] mb-1.5">{ref.clientName}</div>
                    <div className="text-xs text-muted-foreground mb-1.5">{ref.market}</div>
                    <div className="text-[11px] text-muted-foreground">{ref.fromAgent} → {ref.toAgent}</div>
                    <div className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                      {ref.feePercent}% · {formatCurrency(ref.estimatedPrice)}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAgreementReferral(ref) }}
                      className="flex items-center gap-1 mt-2 w-full h-7 rounded-md text-[10px] font-semibold border border-border text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <FileSignature className="w-3 h-3 ml-2" />
                      Send Agreement
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showCreateModal && (
        <CreateReferralModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => setShowCreateModal(false)}
        />
      )}

      {agreementReferral && (
        <AgreementBuilder
          onClose={() => setAgreementReferral(null)}
          prefill={{
            receivingAgentName: agreementReferral.toAgent,
            clientName: agreementReferral.clientName,
            market: agreementReferral.market,
            estimatedPrice: agreementReferral.estimatedPrice,
            feePercent: agreementReferral.feePercent,
          }}
        />
      )}
    </div>
  )
}
