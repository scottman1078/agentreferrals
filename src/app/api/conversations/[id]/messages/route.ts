import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

// GET /api/conversations/[id]/messages — list messages in a conversation
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Verify the user owns this conversation or is admin
    const { data: profile } = await admin
      .from('ar_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const { data: convo } = await admin
      .from('ar_conversations')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (convo.user_id !== user.id && !profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: messages, error } = await admin
      .from('ar_chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Messages] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('[Messages] GET error:', error)
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
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content, senderRole } = await request.json()
    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify user owns conversation or is admin
    const { data: profile } = await admin
      .from('ar_profiles')
      .select('is_admin, full_name, email')
      .eq('id', user.id)
      .single()

    const { data: convo } = await admin
      .from('ar_conversations')
      .select('user_id, subject')
      .eq('id', id)
      .single()

    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (convo.user_id !== user.id && !profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const role = profile?.is_admin && senderRole === 'admin' ? 'admin' : 'user'

    const { data: msg, error } = await admin
      .from('ar_chat_messages')
      .insert({
        conversation_id: id,
        sender_id: user.id,
        sender_role: role,
        content,
      })
      .select()
      .single()

    if (error) {
      console.error('[Messages] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update conversation last_message_at
    await admin
      .from('ar_conversations')
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)

    // Slack notify when user sends a message (non-blocking)
    if (role === 'user') {
      const userName = profile?.full_name || profile?.email || 'Unknown user'
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000')
        fetch(`${baseUrl}/api/admin/slack-notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `New reply from ${userName} in "${convo.subject}"`,
          }),
        }).catch(() => {})
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ success: true, message: msg })
  } catch (error) {
    console.error('[Messages] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
