import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface AgentContext {
  id: string
  name: string
  brokerage: string
  brokerageId: string
  area: string
  tags: string[]
  dealsPerYear: number
  yearsLicensed: number
  avgSalePrice: number
  referNetScore?: number
  responseTime?: string
  closedReferrals?: number
  status: string
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json({ fallback: true }, { status: 200 })
  }

  try {
    const { message, agentContext } = (await req.json()) as {
      message: string
      agentContext: AgentContext[]
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const agentSummary = agentContext
      .map(
        (a) =>
          `- ${a.name} (id: "${a.id}") | ${a.brokerage} | ${a.area} | Tags: ${a.tags.join(', ')} | ${a.dealsPerYear} deals/yr | ${a.yearsLicensed} yrs licensed | Avg price: $${a.avgSalePrice.toLocaleString()} | ReferNet Score: ${a.referNetScore ?? 'N/A'} | Response: ${a.responseTime ?? 'N/A'} | Closed referrals: ${a.closedReferrals ?? 0} | Status: ${a.status}`
      )
      .join('\n')

    const systemPrompt = `You are NORA, the AI referral assistant for AgentReferrals.ai. You help real estate agents find the perfect referral partners across the country.

You have access to the following agents in the network:
${agentSummary}

When a user asks about finding an agent:
1. Search the available agents by market, specialization, price range, etc.
2. Recommend the best matches with specific reasons why
3. Include the agent's name, area, brokerage, and key stats
4. If no exact match, suggest the closest alternatives

Always be helpful, concise, and focused on making the best match. Reference specific agent data when available.

Respond in a conversational tone. When suggesting agents, format them clearly but keep it brief — this is a chat widget, not an essay.

IMPORTANT: At the very end of your response, on its own line, include a hidden comment with matched agent IDs in this exact format:
<!-- MATCHED_AGENTS: ["agent_id_1", "agent_id_2"] -->
Only include agent IDs that you specifically recommended. If you didn't recommend any specific agents, use an empty array: <!-- MATCHED_AGENTS: [] -->`

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''

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
