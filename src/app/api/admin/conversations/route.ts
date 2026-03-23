import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

// Helper to verify admin
async function verifyAdmin() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('ar_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null
  return { user, admin }
}

// GET /api/admin/conversations — list all conversations with user info
export async function GET() {
  try {
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { admin } = auth

    // Get all conversations
    const { data: conversations, error } = await admin
      .from('ar_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('[Admin Conversations] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user profiles for all conversations
    const userIds = [...new Set((conversations || []).map(c => c.user_id).filter(Boolean))]
    const assignedIds = [...new Set((conversations || []).map(c => c.assigned_to).filter(Boolean))]
    const allIds = [...new Set([...userIds, ...assignedIds])]

    let profiles: Record<string, { full_name: string; email: string; subscription_tier: string; created_at: string }> = {}
    if (allIds.length > 0) {
      const { data: profileData } = await admin
        .from('ar_profiles')
        .select('id, full_name, email, subscription_tier, created_at')
        .in('id', allIds)

      if (profileData) {
        profiles = Object.fromEntries(
          profileData.map(p => [p.id, { full_name: p.full_name, email: p.email, subscription_tier: p.subscription_tier, created_at: p.created_at }])
        )
      }
    }

    // Get last message preview for each conversation
    const convoIds = (conversations || []).map(c => c.id)
    let lastMessages: Record<string, { content: string; sender_role: string }> = {}
    if (convoIds.length > 0) {
      // Get the latest message per conversation
      const { data: msgs } = await admin
        .from('ar_chat_messages')
        .select('conversation_id, content, sender_role, created_at')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false })

      if (msgs) {
        // Group by conversation and take first (latest) per group
        for (const msg of msgs) {
          if (!lastMessages[msg.conversation_id]) {
            lastMessages[msg.conversation_id] = { content: msg.content, sender_role: msg.sender_role }
          }
        }
      }
    }

    // Get admin list for assignment dropdown
    const { data: admins } = await admin
      .from('ar_profiles')
      .select('id, full_name, email')
      .eq('is_admin', true)

    const enriched = (conversations || []).map(c => ({
      ...c,
      user: profiles[c.user_id] || null,
      assigned_user: c.assigned_to ? profiles[c.assigned_to] || null : null,
      last_message: lastMessages[c.id] || null,
    }))

    return NextResponse.json({ conversations: enriched, admins: admins || [] })
  } catch (error) {
    console.error('[Admin Conversations] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/conversations — update conversation { id, status, assigned_to, priority }
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { admin } = auth
    const { id, status, assigned_to, priority } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status !== undefined) {
      updates.status = status
      if (status === 'resolved') updates.resolved_at = new Date().toISOString()
    }
    if (assigned_to !== undefined) updates.assigned_to = assigned_to || null
    if (priority !== undefined) updates.priority = priority

    const { data, error } = await admin
      .from('ar_conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Admin Conversations] PATCH error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, conversation: data })
  } catch (error) {
    console.error('[Admin Conversations] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
