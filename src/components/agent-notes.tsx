'use client'

import { useState, useEffect, useCallback } from 'react'
import { StickyNote, Send, Trash2, Loader2 } from 'lucide-react'
import { useDemoGuard } from '@/hooks/use-demo-guard'

interface NoteEntry {
  id: string
  content: string
  created_at: string
}

interface AgentNotesProps {
  agentId: string
  /** The logged-in user's profile ID — passed in so we don't need AuthProvider */
  authorId?: string | null
  /** Compact inline mode for peek cards vs full mode for profile pages */
  variant?: 'inline' | 'full'
}

export default function AgentNotes({ agentId, authorId, variant = 'inline' }: AgentNotesProps) {
  const demoGuard = useDemoGuard()
  const [notes, setNotes] = useState<NoteEntry[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Load existing notes via API
  useEffect(() => {
    if (!authorId) { setLoading(false); return }
    fetch(`/api/notes?authorId=${authorId}&agentId=${agentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setNotes(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authorId, agentId])

  const saveNote = useCallback(async () => {
    if (demoGuard()) return
    if (!authorId || !newNote.trim()) return
    setSaving(true)

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorId, agentId, content: newNote.trim() }),
    })
    const data = await res.json()

    if (res.ok && data.id) {
      setNotes((prev) => [data as NoteEntry, ...prev])
      setNewNote('')
    }
    setSaving(false)
  }, [authorId, agentId, newNote])

  const deleteNote = useCallback(async (noteId: string) => {
    if (demoGuard()) return
    if (!authorId) return
    await fetch(`/api/notes?id=${noteId}&authorId=${authorId}`, { method: 'DELETE' })
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }, [authorId])

  // Don't render if not authenticated or viewing own profile
  if (!authorId || agentId === authorId) return null

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // ─── Inline variant (peek card) ───
  if (variant === 'inline') {
    if (!expanded) {
      return (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <StickyNote className="w-3 h-3" />
          {notes.length > 0 ? `${notes.length} note${notes.length !== 1 ? 's' : ''}` : 'Add note'}
          {loading && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
        </button>
      )
    }

    return (
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <StickyNote className="w-3 h-3" />
            Private Notes
          </span>
          <button
            onClick={() => setExpanded(false)}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Hide
          </button>
        </div>

        {/* Input + save */}
        <div className="flex gap-1.5">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && saveNote()}
            placeholder="Add a note..."
            className="flex-1 h-7 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={saveNote}
            disabled={saving || !newNote.trim()}
            className="h-7 px-2 rounded-md bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </button>
        </div>

        {/* Recent notes (show max 2 inline) */}
        {notes.length > 0 && (
          <div className="mt-1.5 space-y-1 max-h-[80px] overflow-y-auto">
            {notes.slice(0, 2).map((n) => (
              <div key={n.id} className="flex items-start gap-1.5 text-[10px]">
                <span className="text-muted-foreground shrink-0">{formatDate(n.created_at).split(' at ')[0]}:</span>
                <span className="text-foreground flex-1">{n.content}</span>
              </div>
            ))}
            {notes.length > 2 && (
              <span className="text-[10px] text-primary font-medium">+{notes.length - 2} more</span>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── Full variant (agent detail page) ───
  return (
    <div className="p-5 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-4">
        <StickyNote className="w-4 h-4 text-primary" />
        <span className="font-bold text-sm">Private Notes</span>
        <span className="text-xs text-muted-foreground">Only visible to you</span>
      </div>

      {/* Input + save button */}
      <div className="flex gap-2 mb-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote() }
          }}
          placeholder="Write a note about this agent..."
          rows={2}
          className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60"
        />
        <button
          onClick={saveNote}
          disabled={saving || !newNote.trim()}
          className="self-end h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>

      {/* Note log */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No notes yet. Add your first note above.
        </p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {notes.map((n) => (
            <div key={n.id} className="group flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">{n.content}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
              </div>
              <button
                onClick={() => deleteNote(n.id)}
                className="opacity-0 group-hover:opacity-100 shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                title="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
