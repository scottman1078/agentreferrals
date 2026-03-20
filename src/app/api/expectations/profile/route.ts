import { NextRequest, NextResponse } from 'next/server'

// GET /api/expectations/profile?agentId=xxx — get an agent's selected expectations
export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get('agentId')
    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get agent's selections with the full expectation item details
    const { data, error } = await supabase
      .from('ar_profile_expectations')
      .select(`
        side,
        expectation:ar_expectation_items(
          id, category, event_key, label, description, trigger_type
        )
      `)
      .eq('agent_id', agentId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also get their preferred update method / response time
    const { data: profileData } = await supabase
      .from('ar_profiles')
      .select('referral_update_method, referral_response_time')
      .eq('id', agentId)
      .single()

    const send = (data ?? []).filter((d) => d.side === 'send').map((d) => d.expectation)
    const receive = (data ?? []).filter((d) => d.side === 'receive').map((d) => d.expectation)

    return NextResponse.json({
      send,
      receive,
      updateMethod: profileData?.referral_update_method ?? 'email',
      responseTime: profileData?.referral_response_time ?? '24hrs',
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
