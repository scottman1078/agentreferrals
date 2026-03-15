'use client'

import { useState } from 'react'
import { X, Send, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { smartMessageTemplates, fillTemplate, categoryLabels } from '@/data/smart-messages'
import type { SmartMessageTemplate } from '@/data/smart-messages'

interface SmartComposerProps {
  agentId: string
  agentName: string
  agentColor: string
  agentArea: string
  initialMessage: string
  suggestedMessages?: string[]
  onSend: (message: string) => void
  onClose: () => void
}

export default function SmartComposer({
  agentName,
  agentColor,
  agentArea,
  initialMessage,
  suggestedMessages = [],
  onSend,
  onClose,
}: SmartComposerProps) {
  const [message, setMessage] = useState(initialMessage)
  const [sent, setSent] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  function handleSend() {
    if (!message.trim()) return
    setSent(true)
    setTimeout(() => {
      onSend(message.trim())
    }, 1200)
  }

  function applyTemplate(template: SmartMessageTemplate) {
    const filled = fillTemplate(template.template, {
      partnerName: agentName.split(' ')[0],
      partnerMarket: agentArea,
      yourName: 'Jason',
      yourMarket: 'Plainwell / Allegan County, MI',
    })
    setMessage(filled)
    setShowTemplates(false)
  }

  // Group templates by category
  const categories = Array.from(new Set(smartMessageTemplates.map((t) => t.category)))

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
            style={{ background: agentColor }}
          >
            {getInitials(agentName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">Message {agentName}</div>
            <div className="text-[11px] text-muted-foreground truncate">{agentArea}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sent state */}
        {sent ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="font-bold text-sm mb-1">Message sent to {agentName.split(' ')[0]}</div>
            <div className="text-xs text-muted-foreground">Your message has been delivered</div>
          </div>
        ) : (
          <>
            {/* Suggested quick-picks from nudge */}
            {suggestedMessages.length > 1 && (
              <div className="px-5 pt-3 pb-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Suggestions</div>
                <div className="flex flex-col gap-1.5">
                  {suggestedMessages.map((sm, i) => (
                    <button
                      key={i}
                      onClick={() => setMessage(sm)}
                      className={`text-left px-3 py-2 rounded-lg text-xs transition-colors border ${
                        message === sm
                          ? 'border-primary/30 bg-primary/5 text-foreground'
                          : 'border-border hover:bg-accent text-muted-foreground'
                      }`}
                    >
                      {sm}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Template browser toggle */}
            <div className="px-5 pt-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
              >
                {showTemplates ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Browse templates
              </button>
            </div>

            {/* Template browser */}
            {showTemplates && (
              <div className="px-5 pt-2 pb-1 max-h-[200px] overflow-y-auto">
                {categories.map((cat) => (
                  <div key={cat} className="mb-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {categoryLabels[cat]}
                    </div>
                    <div className="flex flex-col gap-1">
                      {smartMessageTemplates
                        .filter((t) => t.category === cat)
                        .map((t) => (
                          <button
                            key={t.id}
                            onClick={() => applyTemplate(t)}
                            className="text-left px-2.5 py-1.5 rounded-md text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <span className="mr-1.5">{t.emoji}</span>
                            {t.label}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Message editor */}
            <div className="px-5 py-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Write a message to ${agentName.split(' ')[0]}...`}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 pb-4">
              <button
                onClick={onClose}
                className="h-9 px-4 rounded-lg text-sm font-semibold border border-border hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
