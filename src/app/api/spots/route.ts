import { NextResponse } from 'next/server'

const TOTAL_SPOTS = 5000
const FALLBACK_CLAIMED = 153

// GET /api/spots — returns founding member spots remaining
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { count, error } = await supabase
      .from('ar_profiles')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    const claimed = count ?? 0
    return NextResponse.json({
      total: TOTAL_SPOTS,
      claimed,
      remaining: TOTAL_SPOTS - claimed,
    })
  } catch {
    // Fallback if DB is unavailable or env vars missing
    return NextResponse.json({
      total: TOTAL_SPOTS,
      claimed: FALLBACK_CLAIMED,
      remaining: TOTAL_SPOTS - FALLBACK_CLAIMED,
    })
  }
}
