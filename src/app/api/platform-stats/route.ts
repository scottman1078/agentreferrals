import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Active agents (real, non-demo, with setup complete)
    const { count: activeAgents } = await supabase
      .from('ar_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_demo', false)

    // Average RCS score (real users who have a score)
    const { data: rcsData } = await supabase
      .from('ar_profiles')
      .select('refernet_score')
      .eq('is_demo', false)
      .not('refernet_score', 'is', null)

    const avgRcs = rcsData && rcsData.length > 0
      ? Math.round(rcsData.reduce((sum, r) => sum + (r.refernet_score ?? 0), 0) / rcsData.length)
      : null

    // Average response time (real users who have response_time_minutes)
    const { data: rtData } = await supabase
      .from('ar_profiles')
      .select('response_time_minutes')
      .eq('is_demo', false)
      .not('response_time_minutes', 'is', null)

    let avgResponseLabel = '< 1hr'
    if (rtData && rtData.length > 0) {
      const avgMin = Math.round(rtData.reduce((sum, r) => sum + (r.response_time_minutes ?? 0), 0) / rtData.length)
      if (avgMin <= 30) avgResponseLabel = '< 30min'
      else if (avgMin <= 60) avgResponseLabel = '< 1hr'
      else if (avgMin <= 120) avgResponseLabel = '< 2hr'
      else if (avgMin <= 240) avgResponseLabel = '< 4hr'
      else avgResponseLabel = `${Math.round(avgMin / 60)}hr`
    }

    return NextResponse.json({
      activeAgents: activeAgents ?? 0,
      avgRcs,
      avgResponseTime: avgResponseLabel,
    })
  } catch {
    return NextResponse.json({ activeAgents: 0, avgRcs: null, avgResponseTime: '< 1hr' })
  }
}
