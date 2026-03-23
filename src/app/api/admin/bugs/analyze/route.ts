import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { bugId, title, description, page_url, screenshot_url, severity, category } = await request.json()

    if (!bugId || !title) {
      return NextResponse.json({ error: 'bugId and title required' }, { status: 400 })
    }

    // Build the prompt
    const bugDetails = [
      `Title: ${title}`,
      description && `Description: ${description}`,
      page_url && `Page: ${page_url}`,
      severity && `Severity: ${severity}`,
      category && `Category: ${category}`,
    ].filter(Boolean).join('\n')

    const content: Anthropic.Messages.ContentBlockParam[] = [
      {
        type: 'text',
        text: `You are analyzing a bug report for the AgentReferrals web application (Next.js + Supabase + TypeScript). The app is a real estate agent referral network platform.

Bug Report:
${bugDetails}

Based on this bug report, provide:
1. **Root Cause Analysis** — What is likely causing this issue? Consider common patterns in Next.js apps with Supabase backends.
2. **Suggested Fix** — Step-by-step what needs to change to fix this.
3. **Files to Check** — List the most likely file paths that need modification (use paths like src/app/..., src/components/..., src/lib/..., src/hooks/..., src/app/api/...).

Be concise and actionable. Focus on the most likely cause.`,
      },
    ]

    // If there's a screenshot, include it
    if (screenshot_url && screenshot_url.startsWith('data:image/')) {
      const [meta, base64] = screenshot_url.split(',')
      const mediaType = meta.match(/data:(image\/\w+)/)?.[1] || 'image/png'
      content.unshift({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
          data: base64,
        },
      })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    })

    const analysisText = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    // Extract file paths from the analysis
    const fileMatches = analysisText.match(/src\/[\w\-\/]+\.\w+/g)
    const suggestedFiles = fileMatches ? [...new Set(fileMatches)].join(', ') : null

    // Save analysis to the bug record
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_bugs')
      .update({
        ai_analysis: analysisText,
        ai_suggested_files: suggestedFiles,
      })
      .eq('id', bugId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message, analysis: analysisText }, { status: 500 })
    }

    return NextResponse.json({ success: true, bug: data })
  } catch (err) {
    console.error('[BugAnalyze] Error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
