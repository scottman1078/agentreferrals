'use client'

import { useState } from 'react'
import { useBrokerage } from '@/contexts/brokerage-context'
import { agents } from '@/data/agents'

export default function BrokerageSwitcher() {
  const { currentBrokerage, allBrokerages, scope, setScope, switchBrokerage } = useBrokerage()
  const [showDropdown, setShowDropdown] = useState(false)

  const myAgentCount = agents.filter((a) => a.brokerageId === currentBrokerage.id).length
  const allAgentCount = agents.length

  return (
    <div className="relative">
      {/* Scope toggle + brokerage selector */}
      <div className="flex items-center gap-2">
        {/* Scope toggle */}
        <div
          className="flex rounded-full p-0.5"
          style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setScope('my-brokerage')}
            className="px-3 py-1 rounded-full text-[11px] font-semibold font-[family-name:var(--font-d)] transition-all"
            style={{
              background: scope === 'my-brokerage' ? currentBrokerage.color : 'transparent',
              color: scope === 'my-brokerage' ? '#0f1117' : 'var(--text-dim)',
            }}
          >
            My Brokerage ({myAgentCount})
          </button>
          <button
            onClick={() => setScope('all-network')}
            className="px-3 py-1 rounded-full text-[11px] font-semibold font-[family-name:var(--font-d)] transition-all"
            style={{
              background: scope === 'all-network' ? 'var(--accent)' : 'transparent',
              color: scope === 'all-network' ? '#0f1117' : 'var(--text-dim)',
            }}
          >
            All Network ({allAgentCount})
          </button>
        </div>

        {/* Brokerage selector */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
          style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
            style={{ background: currentBrokerage.color, color: '#0f1117' }}
          >
            {currentBrokerage.logo}
          </div>
          <span className="hidden xl:inline">{currentBrokerage.name}</span>
          <span className="text-[10px]">▾</span>
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-[800]" onClick={() => setShowDropdown(false)} />
          <div
            className="absolute top-full right-0 mt-2 w-[320px] rounded-lg overflow-hidden z-[801]"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border2)',
              boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="font-[family-name:var(--font-d)] font-bold text-sm">Switch Brokerage Space</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>View agents within a specific brokerage</div>
            </div>
            <div className="max-h-[360px] overflow-y-auto p-2">
              {allBrokerages.map((b) => {
                const count = agents.filter((a) => a.brokerageId === b.id).length
                const isActive = b.id === currentBrokerage.id
                return (
                  <button
                    key={b.id}
                    onClick={() => { switchBrokerage(b.id); setScope('my-brokerage'); setShowDropdown(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all"
                    style={{
                      background: isActive ? `${b.color}15` : 'transparent',
                      border: isActive ? `1px solid ${b.color}30` : '1px solid transparent',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: b.color, color: '#0f1117' }}
                    >
                      {b.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold flex items-center gap-2">
                        {b.name}
                        {b.isUserBrokerage && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                            YOURS
                          </span>
                        )}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {count} agents on ReferNet · {b.marketsServed} markets
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-sm" style={{ color: b.color }}>✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
