import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text, channel } = await request.json()
    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json({ skipped: true, reason: 'No SLACK_WEBHOOK_URL configured' })
    }

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, ...(channel ? { channel } : {}) }),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Slack Notify] Error:', error)
    return NextResponse.json({ error: 'Failed to send Slack notification' }, { status: 500 })
  }
}
