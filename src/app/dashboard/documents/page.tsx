'use client'

import { useState } from 'react'
import { useAppData } from '@/lib/data-provider'
import { formatFullCurrency } from '@/lib/utils'
import { X, Check, Clock, FileText } from 'lucide-react'
import type { Document } from '@/types'

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Draft: { bg: 'bg-secondary', color: 'text-muted-foreground' },
  Sent: { bg: 'bg-indigo-500/10', color: 'text-indigo-400' },
  Executed: { bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
  Expired: { bg: 'bg-destructive/10', color: 'text-destructive' },
}

export default function DocumentsPage() {
  const { documents } = useAppData()
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-bold text-xl">Referral Agreements</h1>
        <span className="px-2.5 py-1 rounded-lg text-xs border border-border text-muted-foreground">{documents.length} documents</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {documents.map((doc) => {
          const style = STATUS_STYLES[doc.status]
          return (
            <div key={doc.id} onClick={() => setSelectedDoc(doc)} className="p-5 rounded-xl border border-border bg-card cursor-pointer hover:shadow-md hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${style.bg} ${style.color}`}>{doc.status}</span>
                <span className="text-[11px] text-muted-foreground">{doc.date}</span>
              </div>
              <div className="font-semibold text-sm mb-1">{doc.title}</div>
              <div className="text-xs text-muted-foreground mb-3">{doc.subtitle}</div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary text-xs text-muted-foreground">
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
              <div className="p-6 rounded-xl border border-border bg-background mb-4">
                <div className="font-extrabold text-base text-center uppercase tracking-wider text-primary mb-1.5">Referral Fee Agreement</div>
                <div className="text-center text-xs text-muted-foreground mb-5 pb-4 border-b border-border">AgentReferrals.ai · Generated {selectedDoc.date}</div>
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
                        <div className="font-bold text-sm font-bold">{party}</div>
                        {signed && <div className="text-[11px] text-emerald-500 mt-1 font-medium">✓ Signed</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
