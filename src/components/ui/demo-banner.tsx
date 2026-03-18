'use client'

import { useDemo } from '@/contexts/demo-context'
import { Eye, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function DemoBanner() {
  const { isDemoMode, disableDemo } = useDemo()
  const [dismissed, setDismissed] = useState(false)

  if (!isDemoMode || dismissed) return null

  return (
    <div className="fixed bottom-[76px] left-0 right-0 z-[800] bg-gradient-to-r from-primary via-amber-500 to-primary">
      <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold">
          <Eye className="w-4 h-4 shrink-0" />
          <span>You&apos;re viewing demo data — this is what your platform will look like with active referrals</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/auth/magic"
            onClick={() => disableDemo()}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-white text-primary text-xs font-bold hover:bg-white/90 transition-colors"
          >
            Sign Up Free
            <ArrowRight className="w-3 h-3" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
