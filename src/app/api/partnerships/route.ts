import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * DELETE /api/partnerships
 * Remove a partnership (disconnect from network).
 * Body: { partnershipId: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { partnershipId } = await req.json()
    if (!partnershipId) {
      return NextResponse.json({ error: 'partnershipId is required' }, { status: 400 })
    }

    // Delete the partnership (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('ar_partnerships')
      .delete()
      .eq('id', partnershipId)

    if (error) {
      console.error('Failed to delete partnership:', error)
      return NextResponse.json({ error: 'Failed to remove partnership' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Partnership DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/partnerships
 * Update partnership properties (e.g., hide/unhide).
 * Body: { partnershipId: string, action: 'hide' | 'unhide' }
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { partnershipId, action } = await req.json()
    if (!partnershipId || !action) {
      return NextResponse.json({ error: 'partnershipId and action are required' }, { status: 400 })
    }

    if (action !== 'hide' && action !== 'unhide') {
      return NextResponse.json({ error: 'action must be "hide" or "unhide"' }, { status: 400 })
    }

    const isHide = action === 'hide'

    // Determine which side of the partnership the user is on
    const { data: partnership } = await supabase
      .from('ar_partnerships')
      .select('requesting_agent_id, receiving_agent_id')
      .eq('id', partnershipId)
      .single()

    if (!partnership) {
      return NextResponse.json({ error: 'Partnership not found' }, { status: 404 })
    }

    const updateField = partnership.requesting_agent_id === user.id
      ? 'hidden_by_requesting'
      : 'hidden_by_receiving'

    const { error } = await supabase
      .from('ar_partnerships')
      .update({ [updateField]: isHide })
      .eq('id', partnershipId)

    if (error) {
      console.error('Failed to update partnership:', error)
      return NextResponse.json({ error: 'Failed to update partnership' }, { status: 500 })
    }

    return NextResponse.json({ success: true, hidden: isHide })
  } catch (err) {
    console.error('Partnership PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
