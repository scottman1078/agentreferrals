import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/notifications/new-partners?userId=xxx
// Returns recent invite sign-ups for the given user (last 7 days)
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Query invites where this user invited someone who signed up recently
    const { data: invites, error } = await supabase
      .from('ar_invites')
      .select('id, signed_up_user_id, signed_up_at, invitee_name, invitee_email')
      .eq('invited_by', userId)
      .in('status', ['active', 'signed_up'])
      .gte('signed_up_at', sevenDaysAgo.toISOString())
      .order('signed_up_at', { ascending: false })

    if (error) {
      console.error('[notifications/new-partners] Query failed:', error.message)
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    if (!invites || invites.length === 0) {
      return NextResponse.json({ partners: [] })
    }

    // Enrich with profile data for each signed-up user
    const enrichedPartners = []
    for (const invite of invites) {
      if (!invite.signed_up_user_id) continue

      const { data: profile } = await supabase
        .from('ar_profiles')
        .select('id, full_name, primary_area, brokerage_id')
        .eq('id', invite.signed_up_user_id)
        .single()

      // Handle race condition: profile might not be fully set up yet
      const name = profile?.full_name || invite.invitee_name || 'A new agent'
      const area = profile?.primary_area || ''

      let brokerageName = ''
      if (profile?.brokerage_id) {
        const { data: brokerage } = await supabase
          .from('ar_brokerages')
          .select('name')
          .eq('id', profile.brokerage_id)
          .single()
        if (brokerage) brokerageName = brokerage.name
      }

      enrichedPartners.push({
        inviteId: invite.id,
        userId: invite.signed_up_user_id,
        name,
        area,
        brokerage: brokerageName,
        signedUpAt: invite.signed_up_at,
      })
    }

    return NextResponse.json({ partners: enrichedPartners })
  } catch (error) {
    console.error('[notifications/new-partners] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
