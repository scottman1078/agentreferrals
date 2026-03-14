'use client'

import { useState } from 'react'
import { ALL_TAGS, TAG_COLORS } from '@/lib/constants'

export default function InviteModal({ onClose }: { onClose: () => void }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,7,12,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto animate-[modal-in_0.2s_ease]"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border2)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="font-[family-name:var(--font-d)] font-bold text-lg">Invite Agent to Network</div>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-base transition-all"
            style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>First Name</label>
              <input className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} placeholder="First" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Last Name</label>
              <input className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} placeholder="Last" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Email Address</label>
            <input className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} placeholder="agent@brokerage.com" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Brokerage</label>
            <input className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} placeholder="Brokerage name" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Primary Service Area</label>
            <input className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} placeholder="City / County" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Deals / Year</label>
              <input type="number" className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} placeholder="e.g. 30" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Years Licensed</label>
              <input type="number" className="w-full px-3 py-2.5 text-sm rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} placeholder="e.g. 7" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Specialization Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={{
                    border: selectedTags.includes(tag) ? 'none' : '1px solid var(--border2)',
                    background: selectedTags.includes(tag) ? TAG_COLORS[tag] : 'transparent',
                    color: selectedTags.includes(tag) ? '#0f1117' : 'var(--text-dim)',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Personal Note (optional)</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2.5 text-sm rounded-md resize-none"
              style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="Add a personal message to the invitation..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 justify-end px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-md font-[family-name:var(--font-d)] font-semibold text-sm transition-all"
            style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-md font-[family-name:var(--font-d)] font-bold text-sm transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, var(--accent), #d4880a)', color: '#0f1117' }}
          >
            Send Invitation
          </button>
        </div>
      </div>
    </div>
  )
}
