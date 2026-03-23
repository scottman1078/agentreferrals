import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

// GET /api/conversations — list user's conversations (or all for admin)
export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Check if admin
    const { data: profile } = await admin
      .from('ar_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    let query = admin
      .from('ar_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })

    if (!profile?.is_admin) {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Conversations] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversations: data })
  } catch (error) {
    console.error('[Conversations] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/conversations — create a new conversation { subject, message }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { subject, message, channel } = await request.json()
    if (!subject || !message) {
      return NextResponse.json({ error: 'subject and message are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Get user profile for Slack notification
    const { data: profile } = await admin
      .from('ar_profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    // Create conversation
    const { data: convo, error: convoError } = await admin
      .from('ar_conversations')
      .insert({
        user_id: user.id,
        subject,
        channel: channel || 'chat',
        status: 'open',
      })
      .select()
      .single()

    if (convoError) {
      console.error('[Conversations] POST convo error:', convoError)
      return NextResponse.json({ error: convoError.message }, { status: 500 })
    }

    // Create first message
    const { error: msgError } = await admin
      .from('ar_chat_messages')
      .insert({
        conversation_id: convo.id,
        sender_id: user.id,
        sender_role: 'user',
        content: message,
      })

    if (msgError) {
      console.error('[Conversations] POST msg error:', msgError)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Fire Slack notification (non-blocking)
    const userName = profile?.full_name || profile?.email || 'Unknown user'
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
      fetch(`${baseUrl}/api/admin/slack-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `New support message from ${userName}: "${subject}"`,
        }),
      }).catch(() => {}) // ignore Slack errors
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, conversation: convo })
  } catch (error) {
    console.error('[Conversations] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
