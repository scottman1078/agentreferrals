'use client'

import { useState, useRef, useEffect } from 'react'
import { useBrokerage } from '@/contexts/brokerage-context'
import { useAppData } from '@/lib/data-provider'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { getPartnerAgentIds, get1DegreeAgentIds, get2DegreeAgentIds } from '@/data/partnerships'
import { ChevronDown, Check, Lock } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import type { BrokerageScope } from '@/types'

interface ScopeTab {
  id: BrokerageScope
  label: string
  count: number
  locked: boolean
  requiredTier?: string
}

export default function BrokerageSwitcher() {
  const { currentBrokerage, allBrokerages, scope, setScope, switchBrokerage } = useBrokerage()
  const { agents } = useAppData()
  const { hasFeature, requiredTier } = useFeatureGate()
  const router = useRouter()
  const [showDropdown, setShowDropdown] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })

  const partnerIds = getPartnerAgentIds('jason')
  const oneDegreeIds = get1DegreeAgentIds('jason')
  const twoDegreeIds = get2DegreeAgentIds('jason')

  const tabs: ScopeTab[] = [
    {
      id: 'my-network',
      label: 'My Network',
      count: agents.filter((a) => partnerIds.includes(a.id)).length,
      locked: false,
    },
    {
      id: '1-degree',
      label: '1 Degree',
      count: oneDegreeIds.length,
      locked: !hasFeature('networkDegree1'),
      requiredTier: requiredTier('networkDegree1') ?? undefined,
    },
    {
      id: '2-degree',
      label: '2 Degrees',
      count: twoDegreeIds.length,
      locked: !hasFeature('networkDegree2'),
      requiredTier: requiredTier('networkDegree2') ?? undefined,
    },
    {
      id: 'my-brokerage',
      label: currentBrokerage.name,
      count: agents.filter((a) => a.brokerageId === currentBrokerage.id).length,
      locked: false,
    },
    {
      id: 'all-network',
      label: 'All',
      count: agents.length,
      locked: false,
    },
  ]

  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [showDropdown])

  const pathname = usePathname()

  const handleTabClick = (tab: ScopeTab) => {
    if (tab.locked) {
      router.push('/dashboard/billing')
      return
    }
    setScope(tab.id)
    if (pathname !== '/dashboard') {
      router.push('/dashboard')
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {/* Scope tabs */}
        <div className="flex rounded-lg border border-border bg-background p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`relative px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                scope === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : tab.locked
                    ? 'text-muted-foreground/50 cursor-pointer hover:text-muted-foreground'
                    : 'text-muted-foreground hover:text-foreground'
              }`}
              title={tab.locked ? `Requires ${tab.requiredTier} plan` : undefined}
            >
              {tab.locked && <Lock className="w-2.5 h-2.5" />}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.id === 'my-network' ? 'Net' : tab.id === '1-degree' ? '1°' : tab.id === '2-degree' ? '2°' : tab.id === 'my-brokerage' ? 'Brk' : 'All'}</span>
              {' '}({tab.count})
            </button>
          ))}
        </div>

        {/* Brokerage button */}
        <button
          ref={buttonRef}
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {currentBrokerage.logoUrl ? (
            <div className="w-5 h-5 rounded bg-white border border-border flex items-center justify-center overflow-hidden">
              <img src={currentBrokerage.logoUrl} alt="" className="w-5 h-5 object-contain" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white" style={{ background: currentBrokerage.color }}>
              {currentBrokerage.logo.charAt(0)}
            </div>
          )}
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
                    {b.logoUrl ? (
                      <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center p-1 overflow-hidden shrink-0">
                        <img src={b.logoUrl} alt={b.name} className="w-8 h-8 object-contain" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: b.color }}>
                        {b.logo}
                      </div>
                    )}
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
