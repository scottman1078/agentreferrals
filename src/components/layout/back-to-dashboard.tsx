'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function BackToDashboard() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Back to Map
    </Link>
  )
}
