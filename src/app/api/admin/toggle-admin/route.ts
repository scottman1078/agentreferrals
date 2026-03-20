import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin/toggle-admin
// Toggles a user's admin status by setting subscription_tier to 'admin' or their previous tier
export async function POST(request: NextRequest) {
  try {
    const { userId, makeAdmin } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    if (makeAdmin) {
      // Set subscription_tier to 'admin'
      const { error } = await supabase
        .from('ar_profiles')
        .update({ subscription_tier: 'admin' })
        .eq('id', userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Remove admin — set back to 'free'
      const { error } = await supabase
        .from('ar_profiles')
        .update({ subscription_tier: 'free' })
        .eq('id', userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/toggle-admin] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
