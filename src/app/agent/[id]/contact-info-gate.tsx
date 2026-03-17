'use client'

import { useAuth } from '@/contexts/auth-context'
import { getPartnerAgentIds } from '@/data/partnerships'
import { Lock, Phone, Mail } from 'lucide-react'
import Link from 'next/link'

interface ContactInfoGateProps {
  agentId: string
  phone: string
  email: string
}

export default function ContactInfoGate({ agentId, phone, email }: ContactInfoGateProps) {
  const { profile, isAuthenticated } = useAuth()

  // Check if current user is a direct partner of this agent
  const currentUserId = profile?.id ?? 'jason' // fallback to mock user
  const partnerIds = getPartnerAgentIds(agentId)
  const isPartner = partnerIds.includes(currentUserId)

  if (!isAuthenticated) {
    return null // Auth gate handles unauthenticated users separately
  }

  if (isPartner) {
    return (
      <div className="p-5 rounded-xl border border-border bg-card space-y-3">
        <h2 className="text-lg font-bold">Contact Information</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Phone</div>
              <div className="text-sm font-semibold">{phone}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="text-sm font-semibold">{email}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Non-partner: show blurred/locked version
  return (
    <div className="p-5 rounded-xl border border-border bg-card space-y-3">
      <h2 className="text-lg font-bold">Contact Information</h2>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Phone className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Phone</div>
            <div className="text-sm font-semibold text-muted-foreground/40 blur-[4px] select-none" aria-hidden>
              (555) 123-4567
            </div>
          </div>
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Mail className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="text-sm font-semibold text-muted-foreground/40 blur-[4px] select-none" aria-hidden>
              agent@example.com
            </div>
          </div>
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" />
          <span>Connect as a partner to view contact info</span>
        </div>
      </div>
    </div>
  )
}
