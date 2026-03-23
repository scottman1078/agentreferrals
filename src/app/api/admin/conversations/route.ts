import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/conversations — list all conversations with user info
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    const { data: conversations, error } = await admin
      .from('ar_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get user profiles
    const userIds = [...new Set((conversations || []).map((c: { user_id: string }) => c.user_id).filter(Boolean))]
    const assignedIds = [...new Set((conversations || []).map((c: { assigned_to: string | null }) => c.assigned_to).filter(Boolean))]
    const allIds = [...new Set([...userIds, ...assignedIds])]

    let profiles: Record<string, { full_name: string; email: string; subscription_tier: string; created_at: string }> = {}
    if (allIds.length > 0) {
      const { data: profileData } = await admin
        .from('ar_profiles')
        .select('id, full_name, email, subscription_tier, created_at')
        .in('id', allIds)

      if (profileData) {
        profiles = Object.fromEntries(
          profileData.map((p: { id: string; full_name: string; email: string; subscription_tier: string; created_at: string }) => [p.id, { full_name: p.full_name, email: p.email, subscription_tier: p.subscription_tier, created_at: p.created_at }])
        )
      }
    }

    // Get last message preview for each conversation
    const convoIds = (conversations || []).map((c: { id: string }) => c.id)
    const lastMessages: Record<string, { content: string; sender_role: string }> = {}
    if (convoIds.length > 0) {
      const { data: msgs } = await admin
        .from('ar_chat_messages')
        .select('conversation_id, content, sender_role, created_at')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false })

      if (msgs) {
        for (const msg of msgs) {
          if (!lastMessages[msg.conversation_id]) {
            lastMessages[msg.conversation_id] = { content: msg.content, sender_role: msg.sender_role }
          }
        }
      }
    }

    // Admin list for assignment
    const { data: admins } = await admin
      .from('ar_profiles')
      .select('id, full_name, email')
      .eq('is_admin', true)

    const enriched = (conversations || []).map((c: Record<string, unknown>) => ({
      ...c,
      user: profiles[c.user_id as string] || null,
      assigned_user: c.assigned_to ? profiles[c.assigned_to as string] || null : null,
      last_message: lastMessages[c.id as string] || null,
    }))

    return NextResponse.json({ conversations: enriched, admins: admins || [] })
  } catch (err) {
    console.error('[Admin Conversations] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/conversations — update conversation
export async function PATCH(request: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    const { id, status, assigned_to, priority } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, conversation: data })
  } catch (err) {
    console.error('[Admin Conversations] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
