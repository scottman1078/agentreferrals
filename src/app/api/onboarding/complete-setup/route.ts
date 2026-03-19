import { NextRequest, NextResponse } from 'next/server'

// POST /api/onboarding/complete-setup
// Updates the user's setup step progress in the database
export async function POST(request: NextRequest) {
  try {
    const { userId, step } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const update: Record<string, unknown> = {
      setup_step: step || 'complete',
    }

    // If completing the entire wizard, also set setup_completed_at
    if (!step || step === 'complete') {
      update.setup_completed_at = new Date().toISOString()
      update.setup_step = 'complete'
    }

    const { error } = await supabase
      .from('ar_profiles')
      .update(update)
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
