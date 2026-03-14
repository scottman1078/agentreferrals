'use client'

import { useState } from 'react'
import { documents } from '@/data/documents'
import { formatFullCurrency } from '@/lib/utils'
import type { Document } from '@/types'

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Draft: { bg: 'rgba(90,100,120,0.2)', color: '#8892a4' },
  Sent: { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc' },
  Executed: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  Expired: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
}

export default function DocumentsPage() {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="font-[family-name:var(--font-d)] font-bold text-xl">Referral Agreements</div>
        <span className="px-2.5 py-1 rounded-md text-[11px]" style={{ background: 'var(--surf3)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
          {documents.length} documents
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {documents.map((doc) => {
          const style = STATUS_STYLES[doc.status]
          return (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="p-4.5 rounded-lg cursor-pointer transition-all hover:shadow-lg"
              style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: style.bg, color: style.color }}>
                  {doc.status}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{doc.date}</span>
              </div>
              <div className="font-semibold text-[15px] mb-1">{doc.title}</div>
              <div className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>{doc.subtitle}</div>
              <div className="flex items-center gap-2 p-2 rounded-md text-xs" style={{ background: 'var(--surf3)', color: 'var(--text-dim)' }}>
                {doc.parties.from} → {doc.parties.to}
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-1.5 rounded-md text-xs font-semibold font-[family-name:var(--font-d)] transition-all" style={{ background: 'var(--accent-bg)', border: '1px solid rgba(240,165,0,0.3)', color: 'var(--accent)' }}>
                  View
                </button>
                <button className="flex-1 py-1.5 rounded-md text-xs font-semibold font-[family-name:var(--font-d)] transition-all" style={{ background: 'var(--surf3)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                  Download
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Document detail modal */}
      {selectedDoc && (
        <div
          className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
          style={{ background: 'rgba(5,7,12,0.85)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedDoc(null) }}
        >
          <div
            className="w-full max-w-[860px] max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--r-lg)', boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="font-[family-name:var(--font-d)] font-bold text-lg">Referral Agreement</div>
              <button onClick={() => setSelectedDoc(null)} className="w-[30px] h-[30px] rounded-full flex items-center justify-center" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>✕</button>
            </div>
            <div className="px-6 py-5">
              {/* Status banner */}
              {selectedDoc.status === 'Executed' && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-md mb-4 text-[13px] font-medium" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--green)' }}>
                  ✓ Agreement fully executed by both parties
                </div>
              )}
              {selectedDoc.status === 'Sent' && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-md mb-4 text-[13px] font-medium" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                  📩 Awaiting counter-signature
                </div>
              )}

              {/* Agreement paper */}
              <div className="p-6 rounded-lg mb-4" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
                <div className="font-[family-name:var(--font-d)] font-extrabold text-base text-center uppercase tracking-wider mb-1.5" style={{ color: 'var(--accent)' }}>
                  Referral Fee Agreement
                </div>
                <div className="text-center text-xs mb-5 pb-4" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  ReferNet Platform · Generated {selectedDoc.date}
                </div>

                {[
                  { label: 'Referring Agent', value: selectedDoc.parties.from },
                  { label: 'Receiving Agent', value: selectedDoc.parties.to },
                  { label: 'Client Name', value: selectedDoc.clientName },
                  { label: 'Market / Area', value: selectedDoc.market },
                  { label: 'Est. Sale Price', value: formatFullCurrency(selectedDoc.estimatedPrice) },
                  { label: 'Referral Fee', value: selectedDoc.referralFee },
                  { label: 'Agreement Expires', value: selectedDoc.expirationDate },
                ].map((field) => (
                  <div key={field.label} className="flex items-baseline gap-2 py-2" style={{ borderBottom: '1px solid rgba(42,49,71,0.6)' }}>
                    <div className="text-[11px] font-bold uppercase tracking-wider min-w-[160px] shrink-0" style={{ color: 'var(--text-dim)' }}>{field.label}</div>
                    <div className="text-[13px]">{field.value}</div>
                  </div>
                ))}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  {[selectedDoc.parties.from, selectedDoc.parties.to].map((party) => {
                    const signed = selectedDoc.signedBy?.includes(party)
                    return (
                      <div key={party} className="p-4 text-center rounded-md" style={{ background: 'var(--surf3)', border: '1px dashed var(--border2)' }}>
                        <div className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>Signature</div>
                        <div className="font-[family-name:var(--font-d)] text-sm font-bold">{party}</div>
                        {signed && <div className="text-[11px] mt-1" style={{ color: 'var(--green)' }}>✓ Signed</div>}
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
