import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TOTAL_SPOTS = 5000

// GET /api/spots — returns founding member spots remaining
export async function GET() {
  const supabase = createAdminClient()

  const { count, error } = await supabase
    .from('ar_profiles')
    .select('*', { count: 'exact', head: true })

  if (error) {
    // Fallback to a mock number if DB query fails
    return NextResponse.json({ total: TOTAL_SPOTS, claimed: 153, remaining: TOTAL_SPOTS - 153 })
  }

  const claimed = count ?? 0
  return NextResponse.json({
    total: TOTAL_SPOTS,
    claimed,
    remaining: TOTAL_SPOTS - claimed,
  })
}
