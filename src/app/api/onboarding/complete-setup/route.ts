import { NextRequest, NextResponse } from 'next/server'

// POST /api/onboarding/complete-setup
// Marks the user's setup wizard as completed in the database
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('ar_profiles')
      .update({ setup_completed_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('[complete-setup] Update failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[complete-setup] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
