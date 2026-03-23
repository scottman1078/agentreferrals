import { NextRequest, NextResponse } from 'next/server'

// GET /api/conversations/[id]/messages — list messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data: messages, error } = await supabase
      .from('ar_chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ messages: messages ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/conversations/[id]/messages — send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { content, senderId, senderRole } = await request.json()

    if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data: message, error } = await supabase
      .from('ar_chat_messages')
      .insert({
        conversation_id: id,
        sender_id: senderId || null,
        sender_role: senderRole || 'user',
        content,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update conversation last_message_at
    await supabase
      .from('ar_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', id)

    // Slack notification for user messages
    if ((senderRole || 'user') === 'user') {
      try {
        const webhookUrl = process.env.SLACK_WEBHOOK_URL
        if (webhookUrl && senderId) {
          const { data: profile } = await supabase
            .from('ar_profiles')
            .select('full_name, email')
            .eq('id', senderId)
            .single()
          const name = profile?.full_name || profile?.email || 'User'
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: `💬 ${name}: "${content.substring(0, 200)}"` }),
          })
        }
      } catch { /* Slack is best-effort */ }
    }

    return NextResponse.json({ message })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
