import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/zip-agents?zip=78734
// Returns count and list of agents who have this zip in their territory
export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get('zip')

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: 'Invalid zip code' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ar_profiles')
    .select('id, full_name, primary_area, avatar_url, tags, refernet_score')
    .contains('territory_zips', [zip])
    .eq('status', 'active')
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    zip,
    count: data?.length ?? 0,
    agents: data ?? [],
  })
}
