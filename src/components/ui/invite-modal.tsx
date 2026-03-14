'use client'

import { useState } from 'react'
import { ALL_TAGS, TAG_COLORS } from '@/lib/constants'
import { X } from 'lucide-react'

export default function InviteModal({ onClose }: { onClose: () => void }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const toggleTag = (tag: string) => setSelectedTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag])

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="font-[family-name:var(--font-d)] font-bold text-lg">Invite Agent</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">First Name</label>
              <input className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="First" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Last Name</label>
              <input className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="Last" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
            <input className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="agent@brokerage.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Brokerage</label>
            <input className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="Brokerage name" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Service Area</label>
            <input className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="City / County" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Deals/Year</label>
              <input type="number" className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="30" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Years Licensed</label>
              <input type="number" className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="7" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Specializations</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${selectedTags.includes(tag) ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:text-foreground'}`} style={selectedTags.includes(tag) ? { background: TAG_COLORS[tag] } : {}}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Note (optional)</label>
            <textarea rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none" placeholder="Personal message..." />
          </div>
        </div>
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-border">
          <button onClick={onClose} className="h-10 px-5 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors">Cancel</button>
          <button onClick={onClose} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">Send Invitation</button>
        </div>
      </div>
    </div>
  )
}
