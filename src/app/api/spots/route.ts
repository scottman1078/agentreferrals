import { NextResponse } from 'next/server'

const TOTAL_FOUNDING_SPOTS = 1000

// GET /api/spots — returns founding member spots remaining
// Counts real paid subscribers (subscription_tier != 'free' and != null)
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Count real users (non-demo) as claimed spots
    const { count, error } = await supabase
      .from('ar_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_demo', false)

    if (error) throw error

    const claimed = count ?? 0
    const remaining = Math.max(0, TOTAL_FOUNDING_SPOTS - claimed)
    return NextResponse.json({
      total: TOTAL_FOUNDING_SPOTS,
      claimed,
      remaining,
    })
  } catch {
    return NextResponse.json({
      total: TOTAL_FOUNDING_SPOTS,
      claimed: 0,
      remaining: TOTAL_FOUNDING_SPOTS,
    })
  }
}
