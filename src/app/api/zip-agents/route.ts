import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/api-protection'

// GET /api/zip-agents?zip=78734
// Returns count and list of agents who have this zip in their territory
// Contact info (phone, email) is intentionally omitted for scraping protection
export async function GET(req: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const ip = getClientIp(req.headers)
  if (!checkRateLimit(ip, 30, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

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

  // Return only safe public fields — no phone, email, or other PII
  const safeAgents = (data ?? []).map((agent) => ({
    id: agent.id,
    full_name: agent.full_name,
    primary_area: agent.primary_area,
    avatar_url: agent.avatar_url,
    tags: agent.tags,
    refernet_score: agent.refernet_score,
  }))

  return NextResponse.json({
    zip,
    count: safeAgents.length,
    agents: safeAgents,
  })
}
