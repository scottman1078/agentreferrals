import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin/toggle-admin
// Toggles a user's admin status via is_admin boolean
export async function POST(request: NextRequest) {
  try {
    const { userId, makeAdmin } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('ar_profiles')
      .update({ is_admin: !!makeAdmin })
      .eq('id', userId)

    if (error) {
      console.error('[admin/toggle-admin] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/toggle-admin] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
