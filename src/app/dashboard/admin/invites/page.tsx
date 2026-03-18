'use client'

import { useState } from 'react'
import { Mail, CheckCircle, Clock, XCircle, Send, UserPlus } from 'lucide-react'

interface Invite {
  id: string
  name: string
  email: string
  invitedBy: string
  status: 'pending' | 'accepted' | 'expired'
  acceptedBy?: string
  code: string
  sentDate: string
}

interface WaitlistEntry {
  email: string
  requestedDate: string
  position: number
}

const mockInvites: Invite[] = [
  { id: 'inv-1', name: 'Sarah Chen', email: 'sarah.chen@compass.com', invitedBy: "Jason Smith", status: 'accepted', acceptedBy: 'Sarah Chen', code: 'AR-JO-4821', sentDate: '2026-02-15' },
  { id: 'inv-2', name: 'Mike Torres', email: 'mtorres@kwrealty.com', invitedBy: "Jason Smith", status: 'accepted', acceptedBy: 'Mike Torres', code: 'AR-JO-4822', sentDate: '2026-02-16' },
  { id: 'inv-3', name: 'Lauren Webb', email: 'lwebb@remax.com', invitedBy: 'Ashley Monroe', status: 'accepted', acceptedBy: 'Lauren Webb', code: 'AR-AM-3391', sentDate: '2026-02-18' },
  { id: 'inv-4', name: 'David Park', email: 'd.park@sothebys.com', invitedBy: 'Derek Chung', status: 'pending', code: 'AR-DC-7710', sentDate: '2026-03-01' },
  { id: 'inv-5', name: 'Nina Patel', email: 'nina@exprealty.com', invitedBy: "Jason Smith", status: 'accepted', acceptedBy: 'Nina Rodriguez', code: 'AR-JO-4823', sentDate: '2026-02-20' },
  { id: 'inv-6', name: 'Brendan Walsh', email: 'bwalsh@sothebys.com', invitedBy: 'Ashley Monroe', status: 'accepted', acceptedBy: 'Brendan Walsh', code: 'AR-AM-3392', sentDate: '2026-02-22' },
  { id: 'inv-7', name: 'Rachel Kim', email: 'rkim@sothebys.com', invitedBy: "Jason Smith", status: 'accepted', acceptedBy: 'Rachel Kim', code: 'AR-JO-4824', sentDate: '2026-01-28' },
  { id: 'inv-8', name: 'Tom Nguyen', email: 'tnguyen@coldwellbanker.com', invitedBy: 'Darius King', status: 'pending', code: 'AR-DK-5501', sentDate: '2026-03-05' },
  { id: 'inv-9', name: 'James Foster', email: 'jfoster@compass.com', invitedBy: 'Lily Park', status: 'expired', code: 'AR-LP-2201', sentDate: '2025-12-01' },
  { id: 'inv-10', name: 'Alicia Gomez', email: 'agomez@remax.com', invitedBy: "Jason Smith", status: 'accepted', acceptedBy: 'Alicia Gomez', code: 'AR-JO-4825', sentDate: '2026-02-10' },
  { id: 'inv-11', name: 'Kevin Murphy', email: 'kmurphy@bhhs.com', invitedBy: 'Tanya Hill', status: 'pending', code: 'AR-TH-8801', sentDate: '2026-03-10' },
  { id: 'inv-12', name: 'Emily Zhang', email: 'ezhang@compass.com', invitedBy: 'Marcus Reid', status: 'accepted', acceptedBy: 'Emily Zhang', code: 'AR-MR-6601', sentDate: '2026-02-25' },
  { id: 'inv-13', name: 'Robert Lee', email: 'rlee@coldwell.com', invitedBy: "Jason Smith", status: 'expired', code: 'AR-JO-4826', sentDate: '2025-11-15' },
  { id: 'inv-14', name: 'Stephanie Cruz', email: 'scruz@kwrealty.com', invitedBy: 'Elena Vasquez', status: 'pending', code: 'AR-EV-4401', sentDate: '2026-03-12' },
  { id: 'inv-15', name: 'Anthony Brooks', email: 'abrooks@remax.com', invitedBy: 'Derek Chung', status: 'accepted', acceptedBy: 'Anthony Brooks', code: 'AR-DC-7711', sentDate: '2026-02-28' },
  { id: 'inv-16', name: 'Priya Sharma', email: 'psharma@exprealty.com', invitedBy: 'Ashley Monroe', status: 'pending', code: 'AR-AM-3393', sentDate: '2026-03-08' },
  { id: 'inv-17', name: 'Carlos Mendez', email: 'cmendez@remax.com', invitedBy: "Jason Smith", status: 'expired', code: 'AR-JO-4827', sentDate: '2025-12-20' },
  { id: 'inv-18', name: 'Lisa Wang', email: 'lwang@compass.com', invitedBy: 'Steve Nakamura', status: 'accepted', acceptedBy: 'Lisa Wang', code: 'AR-SN-9901', sentDate: '2026-03-02' },
  { id: 'inv-19', name: 'Tyler Jensen', email: 'tjensen@bhhs.com', invitedBy: "Jason Smith", status: 'pending', code: 'AR-JO-4828', sentDate: '2026-03-14' },
  { id: 'inv-20', name: 'Hannah Moore', email: 'hmoore@sothebys.com', invitedBy: 'Lily Park', status: 'pending', code: 'AR-LP-2202', sentDate: '2026-03-13' },
]

const mockWaitlist: WaitlistEntry[] = [
  { email: 'jessica.taylor@century21.com', requestedDate: '2026-03-10', position: 1 },
  { email: 'mark.robinson@exprealty.com', requestedDate: '2026-03-11', position: 2 },
  { email: 'amanda.chen@compass.com', requestedDate: '2026-03-12', position: 3 },
  { email: 'brian.johnson@remax.com', requestedDate: '2026-03-13', position: 4 },
  { email: 'diana.nguyen@kwrealty.com', requestedDate: '2026-03-14', position: 5 },
  { email: 'chris.anderson@coldwell.com', requestedDate: '2026-03-14', position: 6 },
  { email: 'kelly.martinez@bhhs.com', requestedDate: '2026-03-15', position: 7 },
]

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function AdminInvitesPage() {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [bulkEmails, setBulkEmails] = useState('')
  const [toast, setToast] = useState('')

  const totalSent = 47
  const accepted = mockInvites.filter((i) => i.status === 'accepted').length
  const pending = mockInvites.filter((i) => i.status === 'pending').length
  const expired = mockInvites.filter((i) => i.status === 'expired').length

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSendInvite = () => {
    if (!inviteEmail) return
    showToast(`Invite sent to ${inviteEmail}`)
    setInviteEmail('')
    setInviteName('')
  }

  const handleBulkSend = () => {
    if (!bulkEmails) return
    const count = bulkEmails.split(',').filter((e) => e.trim()).length
    showToast(`${count} invite${count > 1 ? 's' : ''} sent`)
    setBulkEmails('')
  }

  const handleWaitlistInvite = (email: string) => {
    showToast(`Invite sent to ${email}`)
  }

  const statCards = [
    { label: 'Total Invites Sent', value: totalSent, icon: Mail, color: 'text-blue-500' },
    { label: 'Accepted', value: accepted, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-500' },
    { label: 'Expired', value: expired, icon: XCircle, color: 'text-red-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Invites</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track and manage platform invitations</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="p-5 rounded-xl border border-border bg-card">
            <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
            <div className="text-2xl font-extrabold">{s.value}</div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Send Invites */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-4">
        <h2 className="text-sm font-bold">Send Invites</h2>

        {/* Single invite */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Name"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            className="h-10 px-3 rounded-lg border border-input bg-background text-sm flex-1 max-w-[200px]"
          />
          <input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="h-10 px-3 rounded-lg border border-input bg-background text-sm flex-1"
          />
          <button
            onClick={handleSendInvite}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            Send Invite
          </button>
        </div>

        {/* Bulk invite */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Bulk Invite (comma-separated emails)</label>
          <textarea
            value={bulkEmails}
            onChange={(e) => setBulkEmails(e.target.value)}
            placeholder="agent1@brokerage.com, agent2@brokerage.com, agent3@brokerage.com"
            className="w-full h-20 px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none"
          />
          <button
            onClick={handleBulkSend}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Send All
          </button>
        </div>
      </div>

      {/* Invite History Table */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <h2 className="text-sm font-bold mb-3">Invite History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Invited</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden sm:table-cell">Email</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden md:table-cell">Invited By</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Status</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden lg:table-cell">Code</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Sent</th>
              </tr>
            </thead>
            <tbody>
              {mockInvites.map((inv) => (
                <tr key={inv.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 font-medium">{inv.name}</td>
                  <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{inv.email}</td>
                  <td className="py-2.5 text-muted-foreground hidden md:table-cell">{inv.invitedBy}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_STYLES[inv.status]}`}>
                      {inv.status}
                    </span>
                    {inv.status === 'accepted' && inv.acceptedBy && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">({inv.acceptedBy})</span>
                    )}
                  </td>
                  <td className="py-2.5 text-muted-foreground font-mono text-xs hidden lg:table-cell">{inv.code}</td>
                  <td className="py-2.5 text-muted-foreground">
                    {new Date(inv.sentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Waitlist Section */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <h2 className="text-sm font-bold mb-1">Waitlist</h2>
        <p className="text-xs text-muted-foreground mb-3">{mockWaitlist.length} people waiting</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Email</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Requested</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Position</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockWaitlist.map((w) => (
                <tr key={w.email} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 font-medium">{w.email}</td>
                  <td className="py-2.5 text-muted-foreground">
                    {new Date(w.requestedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-2.5 text-muted-foreground">#{w.position}</td>
                  <td className="py-2.5">
                    <button
                      onClick={() => handleWaitlistInvite(w.email)}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity"
                    >
                      <UserPlus className="w-3 h-3" />
                      Send Invite
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  )
}
