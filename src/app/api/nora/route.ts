import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return NextResponse.json({ fallback: true }, { status: 200 })
  }

  try {
    const { message, userId } = (await req.json()) as {
      message: string
      userId?: string
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // ── Fetch live data from Supabase in parallel ──
    const [
      { data: agents },
      { data: referrals },
      { data: partnerships },
      { data: invites },
      { data: recentAgents },
      { data: userProfile },
    ] = await Promise.all([
      // All active agents with brokerages
      supabase
        .from('ar_profiles')
        .select('id, full_name, email, primary_area, tags, deals_per_year, years_licensed, avg_sale_price, refernet_score, response_time_minutes, closed_referrals, status, created_at, brokerage:ar_brokerages(name)')
        .eq('status', 'active')
        .order('refernet_score', { ascending: false })
        .limit(100),

      // User's referrals (if userId provided)
      userId
        ? supabase
            .from('ar_referrals')
            .select('id, client_name, market, stage, fee_percent, estimated_price, from_agent_id, to_agent_id, created_at')
            .or(`from_agent_id.eq.${userId},to_agent_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),

      // User's partnerships
      userId
        ? supabase
            .from('ar_partnerships')
            .select('id, requesting_agent_id, receiving_agent_id, status, requesting_market, receiving_market')
            .or(`requesting_agent_id.eq.${userId},receiving_agent_id.eq.${userId}`)
            .eq('status', 'active')
            .limit(50)
        : Promise.resolve({ data: [] }),

      // User's pending invites
      userId
        ? supabase
            .from('ar_invites')
            .select('id, invitee_name, invitee_email, invitee_market, status, created_at')
            .eq('invited_by', userId)
            .limit(20)
        : Promise.resolve({ data: [] }),

      // Agents who joined in the last 14 days
      supabase
        .from('ar_profiles')
        .select('id, full_name, primary_area, tags, created_at, brokerage:ar_brokerages(name)')
        .eq('status', 'active')
        .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10),

      // Current user's profile
      userId
        ? supabase
            .from('ar_profiles')
            .select('id, full_name, primary_area, tags, brokerage:ar_brokerages(name)')
            .eq('id', userId)
            .single()
        : Promise.resolve({ data: null }),
    ])

    // ── Build context blocks for the system prompt ──
    const agentSummary = (agents || [])
      .map((a) => {
        const brokerageName = (a.brokerage as unknown as { name: string } | null)?.name || 'Independent'
        return `- ${a.full_name} (id: "${a.id}") | ${brokerageName} | ${a.primary_area || 'N/A'} | Tags: ${(a.tags || []).join(', ')} | ${a.deals_per_year || 0} deals/yr | ${a.years_licensed || 0} yrs | Avg: $${(a.avg_sale_price || 0).toLocaleString()} | Score: ${a.refernet_score ?? 'N/A'} | Response: ${a.response_time_minutes ? `${a.response_time_minutes} min` : 'N/A'} | Closed: ${a.closed_referrals || 0}`
      })
      .join('\n')

    const referralSummary = (referrals || []).length > 0
      ? `\n\nUSER'S REFERRAL PIPELINE (${referrals!.length} total):\n` +
        referrals!
          .map((r) => `- ${r.client_name} | ${r.market || 'N/A'} | Stage: ${r.stage} | Fee: ${r.fee_percent}% | Est: $${(r.estimated_price || 0).toLocaleString()}`)
          .join('\n')
      : ''

    const partnerSummary = (partnerships || []).length > 0
      ? `\n\nUSER'S ACTIVE PARTNERSHIPS (${partnerships!.length}):\n` +
        partnerships!
          .map((p) => {
            const partnerId = p.requesting_agent_id === userId ? p.receiving_agent_id : p.requesting_agent_id
            const partner = (agents || []).find((a) => a.id === partnerId)
            return partner ? `- ${partner.full_name} (${partner.primary_area})` : `- Agent ${partnerId}`
          })
          .join('\n')
      : ''

    const newAgentsSummary = (recentAgents || []).length > 0
      ? `\n\nNEW AGENTS (joined last 14 days):\n` +
        recentAgents!
          .map((a) => {
            const bName = (a.brokerage as unknown as { name: string } | null)?.name || 'Independent'
            return `- ${a.full_name} | ${bName} | ${a.primary_area || 'N/A'} | Tags: ${(a.tags || []).join(', ')}`
          })
          .join('\n')
      : ''

    const inviteSummary = (invites || []).length > 0
      ? `\n\nUSER'S INVITES (${invites!.length}):\n` +
        invites!
          .map((i) => `- ${i.invitee_name} (${i.invitee_market || 'N/A'}) — ${i.status}`)
          .join('\n')
      : ''

    const userContext = userProfile
      ? `\n\nCURRENT USER: ${userProfile.full_name} | ${(userProfile.brokerage as unknown as { name: string } | null)?.name || 'Independent'} | ${userProfile.primary_area || 'N/A'} | Specializations: ${(userProfile.tags || []).join(', ')}`
      : ''

    const systemPrompt = `You are NORA, the AI referral assistant for AgentReferrals — a platform where real estate agents find and manage referral partners across the US and Canada.

Your personality: Warm, sharp, action-oriented. You're like a brilliant assistant who knows every agent in the network. Keep responses SHORT — this is a mobile chat widget, not email.
${userContext}

AGENTS IN THE NETWORK:
${agentSummary}
${referralSummary}${partnerSummary}${newAgentsSummary}${inviteSummary}

Your capabilities:
1. **Find agents** — match by market, specialization, price range, brokerage, or ReferNet Score
2. **Draft messages** — write personalized outreach or check-in messages to partners
3. **Suggest connections** — proactively recommend agents the user should invite or partner with based on their market gaps
4. **Market insights** — identify coverage gaps and opportunities based on the agent directory
5. **Referral guidance** — help with fee structures, agreement best practices, and pipeline management
6. **Pipeline updates** — report on the user's active referrals, stages, and pending fees
7. **New agent alerts** — tell the user about new agents who recently joined in markets they care about
8. **Communication nudges** — proactively remind agents about communication with their referral partners. If they haven't sent updates on active referrals, suggest they reach out

Rules:
- Recommend 1-3 agents max per query. Quality over quantity.
- Always explain WHY you're recommending someone (score, specialization, response time, volume)
- If no exact match exists, say so honestly and suggest the closest alternative
- Never make up agents or stats — only reference data you have
- Use the agent's actual name, brokerage, and stats from the data provided
- When discussing the user's pipeline, use their actual referral data
- Be proactive: if you notice opportunities (new agents in their market, partners they should reconnect with), mention them

IMPORTANT: At the very end of your response, on its own line, include a hidden comment with matched agent IDs in this exact format:
<!-- MATCHED_AGENTS: ["agent_id_1", "agent_id_2"] -->
Only include agent IDs that you specifically recommended. If you didn't recommend any specific agents, use an empty array: <!-- MATCHED_AGENTS: [] -->`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://agentreferrals.ai',
        'X-Title': 'AgentReferrals NORA',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
    })

    if (!response.ok) {
      console.error('OpenRouter error:', response.status, await response.text())
      return NextResponse.json({ fallback: true }, { status: 200 })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''

    // Extract matched agent IDs from the hidden comment
    const matchRegex = /<!-- MATCHED_AGENTS: (\[.*?\]) -->/
    const match = text.match(matchRegex)
    let matchedAgentIds: string[] = []

    if (match) {
      try {
        matchedAgentIds = JSON.parse(match[1])
      } catch {
        // Ignore parse errors
      }
    }

    // Remove the hidden comment from the visible response
    const cleanText = text.replace(matchRegex, '').trim()

    return NextResponse.json({
      response: cleanText,
      matchedAgentIds,
    })
  } catch (error) {
    console.error('NORA API error:', error)
    return NextResponse.json({ fallback: true }, { status: 200 })
  }
}
