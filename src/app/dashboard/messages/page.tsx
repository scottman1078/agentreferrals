'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import { useDemo } from '@/contexts/demo-context'
import Link from 'next/link'
import { getInitials } from '@/lib/utils'
import { useAppData } from '@/lib/data-provider'
import { createClient } from '@/lib/supabase/client'
import {
  conversations as mockConversations,
  getLastMessage,
  getUnreadCount,
  formatTimeAgo,
  formatMessageTime,
  formatDateDivider,
} from '@/data/messages'
import type { Conversation, Message } from '@/data/messages'
import {
  MessageSquare,
  MessageSquareMore,
  Send,
  Search,
  X,
  Plus,
  ArrowLeft,
  ExternalLink,
  Check,
  Users,
} from 'lucide-react'
import BackToDashboard from '@/components/layout/back-to-dashboard'
import SuggestedOutreach from '@/components/nudges/suggested-outreach'
import { nudges as initialNudges } from '@/data/nudges'
import { getCommNudges } from '@/data/comm-nudges'
import { getPartnerAgentIds, getConnectionPath } from '@/data/partnerships'
import type { Nudge } from '@/data/nudges'

// ─── New Message Modal (supports single + group) ───

function NewMessageModal({
  onClose,
  onSelect,
  onCreateGroup,
  existingConversationIds,
  agents,
  currentUserId,
}: {
  onClose: () => void
  onSelect: (agentId: string) => void
  onCreateGroup: (agentIds: string[]) => void
  existingConversationIds: Set<string>
  agents: { id: string; name: string; brokerage: string; area: string; color: string }[]
  currentUserId?: string
}) {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [groupName, setGroupName] = useState('')

  const filteredAgents = useMemo(() => {
    // Filter out the current user from the list
    const selfIds = new Set(['jason', ...(currentUserId ? [currentUserId] : [])])
    const available = agents.filter((a) => !selfIds.has(a.id))
    if (!search) return available.slice(0, 10)
    const q = search.toLowerCase()
    return available
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.brokerage.toLowerCase().includes(q) ||
          a.area.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [search, agents, currentUserId])

  function toggleAgent(agentId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(agentId)) next.delete(agentId)
      else next.add(agentId)
      return next
    })
  }

  const demoGuardCompose = useDemoGuard()
  function handleStart() {
    if (demoGuardCompose()) return
    if (selectedIds.size === 1) {
      onSelect([...selectedIds][0])
    } else if (selectedIds.size > 1) {
      onCreateGroup([...selectedIds])
    }
  }

  const selectedAgents = agents.filter((a) => selectedIds.has(a.id))
  const isGroupMode = selectedIds.size > 1

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="font-bold text-lg">New Message</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-4">
          {/* Selected agents chips */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedAgents.map((agent) => (
                <span
                  key={agent.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                    style={{ background: agent.color }}
                  >
                    {getInitials(agent.name)}
                  </span>
                  {agent.name.split(' ')[0]}
                  <button
                    onClick={() => toggleAgent(agent.id)}
                    className="ml-0.5 hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Group name input (when 2+ selected) */}
          {isGroupMode && (
            <div className="mb-3">
              <input
                type="text"
                placeholder="Group name (optional)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground"
              />
            </div>
          )}

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, brokerage, or market..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto -mx-2">
            {filteredAgents.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No agents found
              </div>
            )}
            {filteredAgents.map((agent) => {
              const hasConversation = existingConversationIds.has(agent.id)
              const isSelected = selectedIds.has(agent.id)
              return (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors text-left ${
                    isSelected ? 'bg-primary/5' : 'hover:bg-accent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] text-white"
                      style={{ background: agent.color }}
                    >
                      {getInitials(agent.name)}
                    </div>
                    {isSelected && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{agent.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {agent.brokerage} &middot; {agent.area}
                    </div>
                  </div>
                  {hasConversation && !isSelected && (
                    <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
                      Existing
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Start conversation button */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleStart}
              className="w-full mt-4 flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
              {isGroupMode
                ? `Start Group Chat (${selectedIds.size} agents)`
                : 'Start Conversation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Message Bubble ───

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[75%]">
        <div
          className={`px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
              : 'bg-secondary text-foreground rounded-2xl rounded-bl-sm'
          }`}
        >
          {message.content}
        </div>
        <div
          className={`text-[10px] text-muted-foreground mt-1 ${
            isOwn ? 'text-right' : 'text-left'
          }`}
        >
          {formatMessageTime(message.createdAt)}
        </div>
      </div>
    </div>
  )
}

// ─── Date Divider ───

function DateDivider({ dateStr }: { dateStr: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-semibold text-muted-foreground">
        {dateStr}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ─── Conversation List Item ───

function ConversationItem({
  conversation,
  isActive,
  onClick,
  currentUserId,
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
  currentUserId: string
}) {
  const lastMsg = conversation.messages.length > 0 ? getLastMessage(conversation) : null
  const unreadCount = conversation.messages.filter(
    (m) => !m.read && m.toUserId === currentUserId
  ).length
  const isOwn = lastMsg ? lastMsg.fromUserId === currentUserId : false
  const preview = lastMsg
    ? isOwn ? `You: ${lastMsg.content}` : lastMsg.content
    : 'No messages yet'

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isActive
          ? 'bg-primary/10 border-l-2 border-primary'
          : 'hover:bg-accent border-l-2 border-transparent'
      }`}
    >
      <div className="relative shrink-0">
        {conversation.isGroup ? (
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <Users className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[11px] text-white"
            style={{ background: conversation.color }}
          >
            {getInitials(conversation.agentName)}
          </div>
        )}
        {unreadCount > 0 && (
          <div className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] rounded-full bg-primary flex items-center justify-center">
            <span className="text-[9px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={`text-sm truncate ${
              unreadCount > 0 ? 'font-bold' : 'font-semibold'
            }`}
          >
            {conversation.agentName}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {lastMsg ? formatTimeAgo(lastMsg.createdAt) : ''}
          </span>
        </div>
        <div
          className={`text-xs truncate ${
            unreadCount > 0
              ? 'text-foreground font-medium'
              : 'text-muted-foreground'
          }`}
        >
          {preview}
        </div>
      </div>
    </button>
  )
}

// ─── Main Messages Page ───

export default function MessagesPage() {
  const demoGuard = useDemoGuard()
  const { agents, isAuthenticated, userId } = useAppData()
  const { isDemoMode } = useDemo()
  // Read ?agent= param from window.location on mount (avoids useSearchParams Suspense issues)
  const [preselectedAgent, setPreselectedAgent] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setPreselectedAgent(params.get('agent'))
  }, [])

  const [conversationList, setConversationList] = useState<Conversation[]>(isDemoMode ? mockConversations : [])
  const [activeConvId, setActiveConvId] = useState<string | null>(
    isDemoMode ? (mockConversations[0]?.agentId || null) : null
  )
  const [messagesLoaded, setMessagesLoaded] = useState(false)

  // Load real messages from Supabase for authenticated users
  useEffect(() => {
    if (isDemoMode || !isAuthenticated || !userId || messagesLoaded) return

    async function loadMessages() {
      try {
        const supabase = createClient()
        const { data: messages, error } = await supabase
          .from('ar_messages')
          .select('*')
          .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
          .order('created_at', { ascending: true })

        if (error || !messages || messages.length === 0) {
          setMessagesLoaded(true)
          return
        }

        // Group messages by the other participant
        const convMap = new Map<string, Message[]>()
        for (const msg of messages) {
          const otherId = msg.from_user_id === userId ? msg.to_user_id : msg.from_user_id
          if (!convMap.has(otherId)) convMap.set(otherId, [])
          convMap.get(otherId)!.push({
            id: msg.id,
            fromUserId: msg.from_user_id,
            toUserId: msg.to_user_id,
            referralId: msg.referral_id || undefined,
            content: msg.content,
            read: msg.read ?? true,
            readAt: msg.read_at || undefined,
            createdAt: msg.created_at,
          })
        }

        // Build conversations, look up agent info
        const convs: Conversation[] = []
        for (const [otherId, msgs] of convMap) {
          const agent = agents.find((a) => a.id === otherId)
          convs.push({
            agentId: otherId,
            agentName: agent?.name || 'Unknown Agent',
            brokerage: agent?.brokerage || '',
            color: agent?.color || '#6b7280',
            messages: msgs,
          })
        }

        // Sort by most recent message
        convs.sort((a, b) => {
          const aTime = a.messages.length ? new Date(a.messages[a.messages.length - 1].createdAt).getTime() : 0
          const bTime = b.messages.length ? new Date(b.messages[b.messages.length - 1].createdAt).getTime() : 0
          return bTime - aTime
        })

        setConversationList(convs)
        if (convs.length > 0) setActiveConvId(convs[0].agentId)
      } catch (err) {
        console.error('[Messages] Failed to load:', err)
      }
      setMessagesLoaded(true)
    }

    loadMessages()
  }, [isDemoMode, isAuthenticated, userId, agents, messagesLoaded])
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [showMobileChat, setShowMobileChat] = useState(false)

  // Handle preselected agent from URL
  useEffect(() => {
    if (preselectedAgent) {
      setActiveConvId(preselectedAgent)
      setShowMobileChat(true)
    }
  }, [preselectedAgent])
  const [nudgeList, setNudgeList] = useState<Nudge[]>(initialNudges)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Listen for nudge messages from the banner
  useEffect(() => {
    function handleNudgeMessage(e: Event) {
      const { agentId, message } = (e as CustomEvent).detail
      sendMessageToAgent(agentId, message)
    }
    window.addEventListener('nudge-message-sent', handleNudgeMessage)
    return () => window.removeEventListener('nudge-message-sent', handleNudgeMessage)
  }, [conversationList])

  function sendMessageToAgent(agentId: string, content: string) {
    if (demoGuard()) return
    const senderId = isAuthenticated && userId ? userId : 'jason'
    // Ensure conversation exists
    let convExists = conversationList.find((c) => c.agentId === agentId)
    if (!convExists) {
      const agent = agents.find((a) => a.id === agentId)
      if (!agent) return
      const newConv: Conversation = {
        agentId: agent.id,
        agentName: agent.name,
        brokerage: agent.brokerage,
        color: agent.color,
        messages: [],
      }
      setConversationList((prev) => [newConv, ...prev])
      convExists = newConv
    }

    const msg: Message = {
      id: `m-nudge-${Date.now()}`,
      fromUserId: senderId,
      toUserId: agentId,
      content,
      read: true,
      createdAt: new Date().toISOString(),
    }

    setConversationList((prev) =>
      prev.map((c) =>
        c.agentId === agentId
          ? { ...c, messages: [...c.messages, msg] }
          : c
      )
    )
    setActiveConvId(agentId)
    setShowMobileChat(true)

    // Persist to Supabase for authenticated users
    if (isAuthenticated && userId && !isDemoMode) {
      try {
        const supabase = createClient()
        if (supabase) {
          supabase
            .from('ar_messages')
            .insert({
              from_user_id: userId,
              to_user_id: agentId,
              content,
            })
            .then(({ error }: { error: unknown }) => {
              if (error) console.error('[Messages] Failed to save:', error)
            })
            .catch((err: unknown) => {
              console.error('[Messages] Network error saving message:', err)
            })
        }
      } catch (err) {
        console.error('[Messages] Error persisting message:', err)
      }
    }
  }

  function handleDismissNudge(nudgeId: string) {
    setNudgeList((prev) => prev.map((n) => n.id === nudgeId ? { ...n, dismissed: true } : n))
  }

  function handleNudgeSendMessage(agentId: string, message: string) {
    sendMessageToAgent(agentId, message)
  }

  function handleNudgeCustomize(agentId: string, prefillMessage: string) {
    // Navigate to the conversation and pre-fill the input
    handleSelectAgent(agentId)
    setNewMessage(prefillMessage)
  }

  const activeConversation = conversationList.find(
    (c) => c.agentId === activeConvId
  )

  const existingConversationIds = useMemo(
    () => new Set(conversationList.map((c) => c.agentId)),
    [conversationList]
  )

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversationList
    const q = searchQuery.toLowerCase()
    return conversationList.filter(
      (c) =>
        c.agentName.toLowerCase().includes(q) ||
        c.brokerage.toLowerCase().includes(q)
    )
  }, [conversationList, searchQuery])

  // Sort by most recent message
  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      const aLast = getLastMessage(a)
      const bLast = getLastMessage(b)
      const aTime = aLast?.createdAt ? new Date(aLast.createdAt).getTime() : 0
      const bTime = bLast?.createdAt ? new Date(bLast.createdAt).getTime() : 0
      return bTime - aTime
    })
  }, [filteredConversations])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConvId, conversationList])

  // Group messages by date for dividers
  function getMessageGroups(messages: Message[]) {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''
    for (const msg of messages) {
      const dateStr = formatDateDivider(msg.createdAt)
      if (dateStr !== currentDate) {
        currentDate = dateStr
        groups.push({ date: dateStr, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }
    return groups
  }

  function handleSelectAgent(agentId: string) {
    // If conversation exists, navigate to it
    const existing = conversationList.find((c) => c.agentId === agentId)
    if (existing) {
      setActiveConvId(agentId)
      setShowNewMessage(false)
      setShowMobileChat(true)
      return
    }

    // Create new empty conversation
    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return

    const newConv: Conversation = {
      agentId: agent.id,
      agentName: agent.name,
      brokerage: agent.brokerage,
      color: agent.color,
      messages: [],
    }
    setConversationList((prev) => [newConv, ...prev])
    setActiveConvId(agentId)
    setShowNewMessage(false)
    setShowMobileChat(true)
  }

  function handleCreateGroup(agentIds: string[]) {
    const groupAgents = agentIds.map((id) => agents.find((a) => a.id === id)).filter(Boolean) as typeof agents
    if (groupAgents.length < 2) return

    const groupId = `group-${Date.now()}`
    const names = groupAgents.map((a) => a.name.split(' ')[0])
    const defaultName = names.join(', ')

    const newConv: Conversation = {
      agentId: groupId,
      agentName: defaultName,
      brokerage: `${groupAgents.length} agents`,
      color: groupAgents[0].color,
      messages: [],
      isGroup: true,
      groupName: defaultName,
      participantIds: agentIds,
      participantNames: groupAgents.map((a) => a.name),
      participantColors: groupAgents.map((a) => a.color),
    }
    setConversationList((prev) => [newConv, ...prev])
    setActiveConvId(groupId)
    setShowNewMessage(false)
    setShowMobileChat(true)
  }

  function handleSend() {
    if (demoGuard()) return
    if (!newMessage.trim() || !activeConvId) return

    const senderId = isAuthenticated && userId ? userId : 'jason'

    const msg: Message = {
      id: `m-new-${Date.now()}`,
      fromUserId: senderId,
      toUserId: activeConvId,
      content: newMessage.trim(),
      read: true,
      createdAt: new Date().toISOString(),
    }

    setConversationList((prev) =>
      prev.map((c) =>
        c.agentId === activeConvId
          ? { ...c, messages: [...c.messages, msg] }
          : c
      )
    )
    setNewMessage('')

    // Persist to Supabase for authenticated users (skip group conversations)
    if (isAuthenticated && userId && !isDemoMode && !activeConvId.startsWith('group-')) {
      try {
        const supabase = createClient()
        if (supabase) {
          supabase
            .from('ar_messages')
            .insert({
              from_user_id: userId,
              to_user_id: activeConvId,
              content: msg.content,
            })
            .then(({ error }: { error: unknown }) => {
              if (error) console.error('[Messages] Failed to save:', error)
            })
            .catch((err: unknown) => {
              console.error('[Messages] Network error saving message:', err)
            })
        }
      } catch (err) {
        console.error('[Messages] Error persisting message:', err)
      }
    }
  }

  const unreadTotal = getUnreadCount()

  // ─── Mobile: show chat view or list view ───

  const conversationListPanel = (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* List header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg">Messages</h1>
            {unreadTotal > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                {unreadTotal}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowNewMessage(true)}
            className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-xs placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Partners waiting on updates banner — demo only (no real nudge data yet) */}
      {isDemoMode && (() => {
        const commNudges = getCommNudges('jason').filter((n) => n.agentId !== 'jason')
        if (commNudges.length === 0) return null
        return (
          <div className="border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs">
              <MessageSquareMore className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {commNudges.length} partner{commNudges.length !== 1 ? 's' : ''} waiting on updates
              </span>
            </div>
          </div>
        )
      })()}

      {/* Suggested Outreach from NORA — demo only (no real nudge data yet) */}
      {isDemoMode && (
        <SuggestedOutreach
          nudges={nudgeList}
          onDismiss={handleDismissNudge}
          onSendMessage={handleNudgeSendMessage}
          onCustomize={handleNudgeCustomize}
        />
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {sortedConversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
            <div className="text-sm font-semibold mb-1">No conversations</div>
            <div className="text-xs text-muted-foreground">
              Start a conversation with an agent
            </div>
          </div>
        )}
        {sortedConversations.map((conv) => (
          <ConversationItem
            key={conv.agentId}
            conversation={conv}
            isActive={activeConvId === conv.agentId}
            currentUserId={isAuthenticated && userId ? userId : 'jason'}
            onClick={() => {
              setActiveConvId(conv.agentId)
              setShowMobileChat(true)
            }}
          />
        ))}
      </div>
    </div>
  )

  const chatPanel = activeConversation ? (
    <div className="flex flex-col h-full bg-background">
      {/* Chat header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button
          onClick={() => setShowMobileChat(false)}
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {activeConversation.isGroup ? (
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
            style={{ background: activeConversation.color }}
          >
            {getInitials(activeConversation.agentName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">
            {activeConversation.groupName || activeConversation.agentName}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {activeConversation.isGroup
              ? activeConversation.participantNames?.join(', ')
              : activeConversation.brokerage}
          </div>
        </div>
        {!activeConversation.isGroup && (
          <Link
            href={`/agent/${activeConversation.agentId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-accent transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">View Profile</span>
          </Link>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeConversation.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white mb-3"
              style={{ background: activeConversation.color }}
            >
              {getInitials(activeConversation.agentName)}
            </div>
            <div className="font-semibold text-sm mb-1">
              {activeConversation.agentName}
            </div>
            <div className="text-xs text-muted-foreground mb-4">
              {activeConversation.brokerage}
            </div>
            <div className="text-xs text-muted-foreground">
              Send a message to start the conversation
            </div>
          </div>
        )}
        {getMessageGroups(activeConversation.messages).map((group) => (
          <div key={group.date}>
            <DateDivider dateStr={group.date} />
            <div className="space-y-2">
              {group.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.fromUserId === (isAuthenticated && userId ? userId : 'jason')}
                />
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar — with partnership gate */}
      {(() => {
        // Skip gate for group chats
        if (activeConversation.isGroup) {
          return (
            <div className="shrink-0 px-4 py-3 border-t border-border bg-card">
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                  placeholder={`Message ${activeConversation.agentName.split(' ')[0]}...`}
                  className="flex-1 h-10 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button onClick={handleSend} disabled={!newMessage.trim()} className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        }

        const partnerIds = getPartnerAgentIds('jason')
        const isPartner = partnerIds.includes(activeConversation.agentId)

        if (isPartner) {
          return (
            <div className="shrink-0 px-4 py-3 border-t border-border bg-card">
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                  placeholder={`Message ${activeConversation.agentName.split(' ')[0]}...`}
                  className="flex-1 h-10 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button onClick={handleSend} disabled={!newMessage.trim()} className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        }

        // Non-partner: check if 1-degree (has a mutual connection)
        const connectionPath = getConnectionPath('jason', activeConversation.agentId)
        if (connectionPath && connectionPath.length === 3) {
          // 1-degree: there's a mutual connection in the middle
          const mutualId = connectionPath[1]
          const mutualAgent = agents.find((a) => a.id === mutualId)
          const mutualName = mutualAgent?.name ?? mutualId
          return (
            <div className="shrink-0 px-4 py-3 border-t border-border bg-card">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                <Users className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Request an introduction through {mutualName} first
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    You&apos;re connected through a mutual partner. Ask for an intro to start messaging.
                  </p>
                </div>
              </div>
            </div>
          )
        }

        // Unconnected agent
        return (
          <div className="shrink-0 px-4 py-3 border-t border-border bg-card">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
              <Users className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-primary">
                  Send a partnership request to message this agent
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Connect with {activeConversation.agentName.split(' ')[0]} as a referral partner to unlock direct messaging.
                </p>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full bg-background text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <MessageSquare className="w-7 h-7 text-muted-foreground" />
      </div>
      <div className="font-bold text-lg mb-1">Your Messages</div>
      <div className="text-sm text-muted-foreground mb-4 max-w-sm">
        Select a conversation or start a new one to connect with agents about
        referrals, partnerships, and client updates.
      </div>
      <button
        onClick={() => setShowNewMessage(true)}
        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        New Message
      </button>
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 sm:px-6 pt-3 shrink-0">
        <BackToDashboard />
      </div>
      <div className="flex flex-1 overflow-hidden">
      {/* Left panel: conversation list */}
      <div
        className={`w-full lg:w-[320px] lg:min-w-[320px] shrink-0 ${
          showMobileChat ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'
        }`}
      >
        {conversationListPanel}
      </div>

      {/* Right panel: active conversation */}
      <div
        className={`flex-1 ${
          showMobileChat ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
        }`}
      >
        {chatPanel}
      </div>

      {/* New message modal */}
      {showNewMessage && (
        <NewMessageModal
          onClose={() => setShowNewMessage(false)}
          onSelect={handleSelectAgent}
          onCreateGroup={handleCreateGroup}
          existingConversationIds={existingConversationIds}
          agents={agents}
          currentUserId={userId}
        />
      )}
      </div>
    </div>
  )
}
