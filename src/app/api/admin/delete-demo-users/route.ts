import { NextResponse } from 'next/server'

// POST /api/admin/delete-demo-users
// Deletes all ar_profiles where is_demo = true
export async function POST() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ar_profiles')
      .delete()
      .eq('is_demo', true)
      .select('id')

    if (error) {
      console.error('[admin/delete-demo-users] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const count = data?.length ?? 0
    console.log(`[admin/delete-demo-users] Deleted ${count} demo users`)

    return NextResponse.json({ success: true, count })
  } catch (err) {
    console.error('[admin/delete-demo-users] Unexpected error:', err)
    return NextResponse.json({ error: 'Failed to delete demo users' }, { status: 500 })
  }
}
