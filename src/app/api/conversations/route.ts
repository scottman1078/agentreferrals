import { NextRequest, NextResponse } from 'next/server'

// GET /api/conversations?userId=xxx — list user's conversations
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Check if admin
    const { data: profile } = await supabase
      .from('ar_profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()

    let query = supabase
      .from('ar_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })

    if (!profile?.is_admin) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ conversations: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/conversations — create a new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, subject, message, channel } = body

    if (!userId || !message) {
      return NextResponse.json({ error: 'userId and message required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('ar_conversations')
      .insert({
        user_id: userId,
        subject: subject || message.substring(0, 100),
        channel: channel || 'chat',
        status: 'open',
      })
      .select()
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: convError?.message || 'Failed to create' }, { status: 500 })
    }

    // Create first message
    const { error: msgError } = await supabase
      .from('ar_chat_messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: userId,
        sender_role: 'user',
        content: message,
      })

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Update last_message_at
    await supabase
      .from('ar_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id)

    // Slack notification
    try {
      const { data: profile } = await supabase
        .from('ar_profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()

      const webhookUrl = process.env.SLACK_WEBHOOK_URL
      if (webhookUrl) {
        const name = profile?.full_name || profile?.email || 'Unknown'
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔔 New support message from ${name}: "${message.substring(0, 200)}"`,
          }),
        })
      }
    } catch { /* Slack is best-effort */ }

    return NextResponse.json({ conversation })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
