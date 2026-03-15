'use client'

import { useState } from 'react'
import { useAppData } from '@/lib/data-provider'
import { formatFullCurrency } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import AgreementBuilder from '@/components/agreements/agreement-builder'
import { X, Check, Clock, FileText, Plus, AlertTriangle, PenLine } from 'lucide-react'
import type { Document } from '@/types'

const STATUS_STYLES: Record<string, { bg: string; color: string; icon: typeof Check }> = {
  Draft: { bg: 'bg-secondary', color: 'text-muted-foreground', icon: PenLine },
  Sent: { bg: 'bg-indigo-500/10', color: 'text-indigo-400', icon: Clock },
  Executed: { bg: 'bg-emerald-500/10', color: 'text-emerald-500', icon: Check },
  Expired: { bg: 'bg-destructive/10', color: 'text-destructive', icon: AlertTriangle },
}

function SignatureStatus({ doc }: { doc: Document }) {
  const from = doc.parties.from
  const to = doc.parties.to
  const fromSigned = doc.signedBy?.includes(from)
  const toSigned = doc.signedBy?.includes(to)

  if (doc.status === 'Executed') {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-medium">
        <Check className="w-3 h-3" />
        Fully Signed
      </div>
    )
  }

  if (doc.status === 'Sent') {
    const pending = [
      !fromSigned ? from : null,
      !toSigned ? to : null,
    ].filter(Boolean)
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-medium">
        <Clock className="w-3 h-3" />
        Pending: {pending.join(', ')}
      </div>
    )
  }

  if (doc.status === 'Expired') {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-destructive font-medium">
        <AlertTriangle className="w-3 h-3" />
        Expired
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
      <PenLine className="w-3 h-3" />
      Not sent
    </div>
  )
}

export default function DocumentsPage() {
  const { documents } = useAppData()
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-bold text-xl">Referral Agreements</h1>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs border border-border text-muted-foreground">{documents.length} documents</span>
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Agreement
          </button>
        </div>
      </div>

      {documents.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No agreements yet"
          description="Create your first referral agreement or send a referral from the pipeline to generate one automatically."
          actionLabel="Create Agreement"
          onAction={() => setShowBuilder(true)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {documents.map((doc) => {
          const style = STATUS_STYLES[doc.status]
          const StatusIcon = style.icon
          return (
            <div key={doc.id} onClick={() => setSelectedDoc(doc)} className="p-5 rounded-xl border border-border bg-card cursor-pointer hover:shadow-md hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${style.bg} ${style.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {doc.status}
                </span>
                <span className="text-[11px] text-muted-foreground">{doc.date}</span>
              </div>
              <div className="font-semibold text-sm mb-1">{doc.title}</div>
              <div className="text-xs text-muted-foreground mb-2">{doc.subtitle}</div>
              <SignatureStatus doc={doc} />
              <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary text-xs text-muted-foreground mt-2">
                {doc.parties.from} → {doc.parties.to}
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 h-8 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">View</button>
                <button className="flex-1 h-8 rounded-lg text-xs font-semibold border border-border hover:bg-accent transition-colors">Download</button>
              </div>
            </div>
          )
        })}
      </div>

      {selectedDoc && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setSelectedDoc(null) }}>
          <div className="w-full max-w-[800px] max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <div className="font-bold text-lg">Referral Agreement</div>
              <button onClick={() => setSelectedDoc(null)} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5">
              {selectedDoc.status === 'Executed' && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium mb-4">
                  <Check className="w-4 h-4" /> Agreement fully executed
                </div>
              )}
              {selectedDoc.status === 'Sent' && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-4">
                  <Clock className="w-4 h-4" /> Awaiting counter-signature
                </div>
              )}
              {selectedDoc.status === 'Expired' && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium mb-4">
                  <AlertTriangle className="w-4 h-4" /> This agreement has expired
                </div>
              )}
              <div className="p-6 rounded-xl border border-border bg-background mb-4">
                <div className="font-extrabold text-base text-center uppercase tracking-wider text-primary mb-1.5">Referral Fee Agreement</div>
                <div className="text-center text-xs text-muted-foreground mb-5 pb-4 border-b border-border">AgentReferrals · Generated {selectedDoc.date}</div>
                {[
                  { label: 'Referring Agent', value: selectedDoc.parties.from },
                  { label: 'Receiving Agent', value: selectedDoc.parties.to },
                  { label: 'Client Name', value: selectedDoc.clientName },
                  { label: 'Market / Area', value: selectedDoc.market },
                  { label: 'Est. Sale Price', value: formatFullCurrency(selectedDoc.estimatedPrice) },
                  { label: 'Referral Fee', value: selectedDoc.referralFee },
                  { label: 'Expires', value: selectedDoc.expirationDate },
                ].map((f) => (
                  <div key={f.label} className="flex items-baseline gap-2 py-2 border-b border-border/50 last:border-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground min-w-[140px] shrink-0">{f.label}</div>
                    <div className="text-sm">{f.value}</div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                  {[selectedDoc.parties.from, selectedDoc.parties.to].map((party) => {
                    const signed = selectedDoc.signedBy?.includes(party)
                    return (
                      <div key={party} className="p-4 text-center rounded-lg border border-dashed border-border bg-secondary">
                        <div className="text-[11px] text-muted-foreground mb-2">Signature</div>
                        <div className="font-bold text-sm">{party}</div>
                        {signed ? (
                          <div className="text-[11px] text-emerald-500 mt-1 font-medium flex items-center gap-1 justify-center">
                            <Check className="w-3 h-3" /> Signed
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground mt-1 font-medium flex items-center gap-1 justify-center">
                            <Clock className="w-3 h-3" /> Pending
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBuilder && (
        <AgreementBuilder onClose={() => setShowBuilder(false)} />
      )}
    </div>
  )
}
