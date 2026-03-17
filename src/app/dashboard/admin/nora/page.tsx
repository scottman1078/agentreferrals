'use client'

import { useState } from 'react'
import { Sparkles, Info, Save } from 'lucide-react'

const DEFAULT_SYSTEM_PROMPT = `You are NORA, the AI referral assistant for AgentReferrals — a platform where real estate agents find and manage referral partners across the US and Canada.

Your personality: Warm, sharp, action-oriented. You're like a brilliant assistant who knows every agent in the network. Keep responses SHORT — this is a mobile chat widget, not email.

Your capabilities:
1. **Find agents** — match by market, specialization, price range, brokerage, or ReferNet Score
2. **Draft messages** — write personalized outreach or check-in messages to partners
3. **Suggest connections** — proactively recommend agents the user should invite or partner with based on their market gaps
4. **Market insights** — identify coverage gaps and opportunities based on the agent directory
5. **Referral guidance** — help with fee structures, agreement best practices, and pipeline management
6. **Pipeline updates** — report on the user's active referrals, stages, and pending fees
7. **New agent alerts** — tell the user about new agents who recently joined in markets they care about
8. **Communication nudges** — proactively remind agents about communication with their referral partners`

const DEFAULT_BEHAVIOR_RULES = `- Recommend 1-3 agents max per query. Quality over quantity.
- Always explain WHY you're recommending someone (score, specialization, response time, volume)
- If no exact match exists, say so honestly and suggest the closest alternative
- Never make up agents or stats — only reference data you have
- Use the agent's actual name, brokerage, and stats from the data provided
- When discussing the user's pipeline, use their actual referral data
- Be proactive: if you notice opportunities, mention them`

export default function AdminNoraPage() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [behaviorRules, setBehaviorRules] = useState(DEFAULT_BEHAVIOR_RULES)
  const [toast, setToast] = useState('')

  const handleSave = () => {
    setToast('Configuration saved successfully')
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">NORA AI Configuration</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage NORA&apos;s behavior and system prompt</p>
      </div>

      {/* Info Card */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-blue-900 dark:text-blue-200">
            Changes to NORA&apos;s configuration affect all users.
          </p>
          <p className="text-blue-800 dark:text-blue-300 mt-1">
            The system prompt defines NORA&apos;s personality and capabilities. Be careful when modifying — all users interact with this same prompt.
          </p>
          <p className="text-blue-700 dark:text-blue-400 mt-1 text-xs">
            Current model: OpenRouter (configured via OPENROUTER_API_KEY)
          </p>
        </div>
      </div>

      {/* System Prompt */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold">System Prompt</h2>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={15}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono resize-y"
        />
      </div>

      {/* Behavior Rules */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-3">
        <h2 className="text-sm font-bold">Behavior Rules</h2>
        <textarea
          value={behaviorRules}
          onChange={(e) => setBehaviorRules(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono resize-y"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <Save className="w-4 h-4" />
        Save Configuration
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  )
}
