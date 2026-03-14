'use client'

import { useState, useRef, useEffect } from 'react'
import { useBrokerage } from '@/contexts/brokerage-context'
import { agents } from '@/data/agents'
import { ChevronDown, Check } from 'lucide-react'

export default function BrokerageSwitcher() {
  const { currentBrokerage, allBrokerages, scope, setScope, switchBrokerage } = useBrokerage()
  const [showDropdown, setShowDropdown] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })

  const myAgentCount = agents.filter((a) => a.brokerageId === currentBrokerage.id).length
  const allAgentCount = agents.length

  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [showDropdown])

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {/* Scope toggle */}
        <div className="flex rounded-lg border border-border bg-background p-0.5">
          <button
            onClick={() => setScope('my-brokerage')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
              scope === 'my-brokerage'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Brokerage ({myAgentCount})
          </button>
          <button
            onClick={() => setScope('all-network')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
              scope === 'all-network'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({allAgentCount})
          </button>
        </div>

        {/* Brokerage button */}
        <button
          ref={buttonRef}
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white" style={{ background: currentBrokerage.color }}>
            {currentBrokerage.logo.charAt(0)}
          </div>
          <span className="hidden xl:inline max-w-[100px] truncate">{currentBrokerage.name}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowDropdown(false)} />
          <div
            className="fixed w-[300px] rounded-xl border border-border bg-card shadow-2xl z-[9999] overflow-hidden"
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
          >
            <div className="px-4 py-3 border-b border-border">
              <div className="font-bold text-sm">Brokerage Spaces</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">View agents within a brokerage</div>
            </div>
            <div className="max-h-[360px] overflow-y-auto p-1.5">
              {allBrokerages.map((b) => {
                const count = agents.filter((a) => a.brokerageId === b.id).length
                const isActive = b.id === currentBrokerage.id
                return (
                  <button
                    key={b.id}
                    onClick={() => { switchBrokerage(b.id); setScope('my-brokerage'); setShowDropdown(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive ? 'bg-primary/10' : 'hover:bg-accent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: b.color }}>
                      {b.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {b.name}
                        {b.isUserBrokerage && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">YOU</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{count} agents · {b.marketsServed} markets</div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
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
