'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  MessageSquare, Send, Loader2, RefreshCw, User, Clock, CheckCircle2,
  AlertTriangle, Pause, ChevronDown, Circle,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface ConversationUser {
  full_name: string
  email: string
  subscription_tier: string | null
  created_at: string
}

interface LastMessage {
  content: string
  sender_role: string
}

interface Conversation {
  id: string
  user_id: string
  assigned_to: string | null
  subject: string
  status: 'open' | 'resolved' | 'snoozed' | 'waiting'
  channel: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  last_message_at: string
  resolved_at: string | null
  created_at: string
  user: ConversationUser | null
  assigned_user: ConversationUser | null
  last_message: LastMessage | null
}

interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string | null
  sender_role: 'user' | 'admin' | 'bot'
  content: string
  attachments: unknown[]
  read_at: string | null
  created_at: string
}

interface AdminUser {
  id: string
  full_name: string
  email: string
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-red-500/20 text-red-600 border-red-500/30', icon: AlertTriangle },
  waiting: { label: 'Waiting', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30', icon: Clock },
  snoozed: { label: 'Snoozed', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: Pause },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-gray-200 text-gray-600' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
}

function Pill({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold border whitespace-nowrap ${className}`}>
      {label}
    </span>
  )
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function AdminInboxPage() {
  const { profile } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('open')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/conversations')
      const data = await res.json()
      if (data.conversations) setConversations(data.conversations)
      if (data.admins) setAdmins(data.admins)
    } catch {
      showToast('Failed to load conversations')
    }
    setLoading(false)
  }, [])

  const loadMessages = useCallback(async (convoId: string) => {
    setMessagesLoading(true)
    try {
      const res = await fetch(`/api/conversations/${convoId}/messages`)
      const data = await res.json()
      if (data.messages) setMessages(data.messages)
    } catch {
      showToast('Failed to load messages')
    }
    setMessagesLoading(false)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId)
    }
  }, [selectedId, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filtered = conversations.filter(c => {
    if (filterStatus === 'all') return true
    return c.status === filterStatus
  })

  const selected = conversations.find(c => c.id === selectedId) || null

  async function sendReply() {
    if (!replyText.trim() || !selectedId) return
    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText, senderRole: 'admin' }),
      })
      const data = await res.json()
      if (data.success) {
        setReplyText('')
        loadMessages(selectedId)
        // Also trigger Slack notify
        fetch('/api/admin/slack-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `Admin replied to "${selected?.subject}" from ${selected?.user?.full_name || selected?.user?.email || 'user'}`,
          }),
        }).catch(() => {})
      } else {
        showToast(data.error || 'Failed to send reply')
      }
    } catch {
      showToast('Failed to send reply')
    }
    setSending(false)
  }

  async function updateConversation(updates: Record<string, unknown>) {
    if (!selectedId) return
    try {
      const res = await fetch('/api/admin/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, ...updates }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Updated')
        loadConversations()
      } else {
        showToast(data.error || 'Update failed')
      }
    } catch {
      showToast('Update failed')
    }
  }

  const statusCounts = {
    all: conversations.length,
    open: conversations.filter(c => c.status === 'open').length,
    waiting: conversations.filter(c => c.status === 'waiting').length,
    snoozed: conversations.filter(c => c.status === 'snoozed').length,
    resolved: conversations.filter(c => c.status === 'resolved').length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Support Inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {statusCounts.open} open conversation{statusCounts.open !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={loadConversations}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {(['open', 'waiting', 'snoozed', 'resolved', 'all'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterStatus === status
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="text-[10px] opacity-60">
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-0 border border-border rounded-xl overflow-hidden bg-card" style={{ height: 'calc(100vh - 240px)', minHeight: '500px' }}>
        {/* LEFT: Conversation list */}
        <div className="w-[340px] shrink-0 border-r border-border overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
              <MessageSquare className="w-6 h-6 mb-2 opacity-40" />
              No conversations
            </div>
          ) : (
            filtered.map(convo => {
              const isSelected = convo.id === selectedId
              const statusConf = STATUS_CONFIG[convo.status]
              return (
                <button
                  key={convo.id}
                  onClick={() => setSelectedId(convo.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                    isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        {convo.status === 'open' && (
                          <Circle className="w-2 h-2 fill-red-500 text-red-500 shrink-0" />
                        )}
                        <span className="text-sm font-semibold truncate">
                          {convo.user?.full_name || convo.user?.email || 'Unknown'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{convo.subject}</p>
                      {convo.last_message && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {convo.last_message.sender_role === 'admin' ? 'You: ' : ''}
                          {convo.last_message.content}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {timeAgo(convo.last_message_at)}
                      </span>
                      <Pill label={statusConf.label} className={statusConf.color} />
                      {convo.priority !== 'normal' && (
                        <Pill label={PRIORITY_CONFIG[convo.priority].label} className={PRIORITY_CONFIG[convo.priority].color} />
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* RIGHT: Conversation detail */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold truncate">{selected.subject}</h2>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {selected.user?.full_name || selected.user?.email || 'Unknown'}
                      </span>
                      {selected.user?.email && (
                        <span>{selected.user.email}</span>
                      )}
                      {selected.user?.subscription_tier && (
                        <Pill label={selected.user.subscription_tier} className="bg-primary/10 text-primary border-primary/20" />
                      )}
                      {selected.user?.created_at && (
                        <span>Joined {new Date(selected.user.created_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-2 mt-2.5">
                  {/* Status dropdown */}
                  <div className="relative">
                    <select
                      value={selected.status}
                      onChange={(e) => updateConversation({ status: e.target.value })}
                      className="appearance-none pl-2.5 pr-7 py-1 text-[11px] font-semibold rounded-md border border-border bg-background cursor-pointer"
                    >
                      <option value="open">Open</option>
                      <option value="waiting">Waiting</option>
                      <option value="snoozed">Snoozed</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                  </div>

                  {/* Priority dropdown */}
                  <div className="relative">
                    <select
                      value={selected.priority}
                      onChange={(e) => updateConversation({ priority: e.target.value })}
                      className="appearance-none pl-2.5 pr-7 py-1 text-[11px] font-semibold rounded-md border border-border bg-background cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                  </div>

                  {/* Assign dropdown */}
                  <div className="relative">
                    <select
                      value={selected.assigned_to || ''}
                      onChange={(e) => updateConversation({ assigned_to: e.target.value || null })}
                      className="appearance-none pl-2.5 pr-7 py-1 text-[11px] font-semibold rounded-md border border-border bg-background cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {admins.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.full_name || a.email}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                  </div>

                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {selected.channel} &middot; {new Date(selected.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
                ) : (
                  messages.map(msg => {
                    const isAdmin = msg.sender_role === 'admin'
                    const isBot = msg.sender_role === 'bot'
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-xl px-3.5 py-2.5 ${
                            isAdmin
                              ? 'bg-primary text-primary-foreground'
                              : isBot
                              ? 'bg-purple-500/10 border border-purple-500/20'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-semibold ${
                              isAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {isAdmin ? 'Admin' : isBot ? 'Bot' : selected.user?.full_name || 'User'}
                            </span>
                            <span className={`text-[10px] ${
                              isAdmin ? 'text-primary-foreground/50' : 'text-muted-foreground/70'
                            }`}>
                              {timeAgo(msg.created_at)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="px-4 py-3 border-t border-border bg-muted/20">
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendReply()
                      }
                    }}
                    placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                    className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    rows={2}
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors self-end"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[999] bg-foreground text-background px-4 py-2.5 rounded-lg text-sm font-medium shadow-xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  )
}
