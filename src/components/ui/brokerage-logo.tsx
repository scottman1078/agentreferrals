'use client'

import { useState } from 'react'
import type { Brokerage } from '@/types'

/** Renders a brokerage logo image with fallback to colored initials */
export function BrokerageLogo({ brokerage, size = 'md' }: { brokerage: Brokerage; size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = useState(false)

  const sizeMap = {
    sm: { box: 'w-8 h-8', text: 'text-[10px]', img: 'w-8 h-8' },
    md: { box: 'w-12 h-12', text: 'text-sm', img: 'w-12 h-12' },
    lg: { box: 'w-16 h-16', text: 'text-lg', img: 'w-16 h-16' },
  }

  const s = sizeMap[size]

  if (brokerage.logoUrl && !imgError) {
    return (
      <div className={`${s.box} rounded-xl bg-white border border-border flex items-center justify-center p-1.5 overflow-hidden`}>
        <img
          src={brokerage.logoUrl}
          alt={brokerage.name}
          className={`${s.img} object-contain`}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  // Fallback: colored initials
  return (
    <div
      className={`${s.box} rounded-xl flex items-center justify-center font-extrabold ${s.text} text-white`}
      style={{ background: brokerage.color }}
    >
      {brokerage.logo}
    </div>
  )
}
