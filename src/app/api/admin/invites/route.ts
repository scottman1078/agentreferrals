import { NextResponse } from 'next/server'

// GET /api/admin/invites — admin overview of all invites + affiliate rewards
export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Fetch all invites with inviter profile info
    const { data: invites, error: invitesError } = await supabase
      .from('ar_invites')
      .select('id, referral_code, invitee_name, invitee_email, status, created_at, signed_up_at, signed_up_user_id, invited_by')
      .order('created_at', { ascending: false })
      .limit(500)

    if (invitesError) {
      console.error('[admin/invites] Invites query error:', invitesError.message)
      return NextResponse.json({ error: invitesError.message }, { status: 500 })
    }

    // Gather unique inviter IDs to fetch their names
    const inviterIds = [...new Set((invites ?? []).map((i) => i.invited_by).filter(Boolean))]
    let inviterMap: Record<string, string> = {}

    if (inviterIds.length > 0) {
      const { data: inviters } = await supabase
        .from('ar_profiles')
        .select('id, full_name')
        .in('id', inviterIds)

      if (inviters) {
        inviterMap = Object.fromEntries(inviters.map((p) => [p.id, p.full_name || 'Unknown']))
      }
    }

    // Fetch all affiliate rewards
    const { data: rewards, error: rewardsError } = await supabase
      .from('ar_affiliate_rewards')
      .select('id, user_id, amount, status, reward_type, earned_at, paid_at')
      .order('earned_at', { ascending: false })
      .limit(500)

    if (rewardsError) {
      console.error('[admin/invites] Rewards query error:', rewardsError.message)
    }

    const allRewards = rewards ?? []

    const totalEarned = allRewards
      .filter((r) => r.status === 'earned' || r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    const totalPaid = allRewards
      .filter((r) => r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    // Enrich invites with inviter name, exclude placeholder records
    const enrichedInvites = (invites ?? [])
      .filter((inv) => !inv.invitee_email?.includes('@pending.invite'))
      .map((inv) => ({
        ...inv,
        inviter_name: inv.invited_by ? (inviterMap[inv.invited_by] || 'Unknown') : 'Unknown',
      }))

    const totalSent = enrichedInvites.length
    const signedUp = enrichedInvites.filter(
      (i) => i.status === 'signed_up' || i.status === 'active'
    ).length
    const conversionRate = totalSent > 0 ? ((signedUp / totalSent) * 100).toFixed(1) : '0.0'

    // Build referrer earnings breakdown
    const referrerEarnings: Record<string, { name: string; invitesSent: number; signedUp: number; earned: number; paid: number }> = {}
    for (const inv of enrichedInvites) {
      if (!inv.invited_by) continue
      if (!referrerEarnings[inv.invited_by]) {
        referrerEarnings[inv.invited_by] = {
          name: inv.inviter_name,
          invitesSent: 0,
          signedUp: 0,
          earned: 0,
          paid: 0,
        }
      }
      referrerEarnings[inv.invited_by].invitesSent++
      if (inv.status === 'signed_up' || inv.status === 'active') {
        referrerEarnings[inv.invited_by].signedUp++
      }
    }
    for (const r of allRewards) {
      if (!r.user_id || !referrerEarnings[r.user_id]) continue
      if (r.status === 'earned' || r.status === 'applied') {
        referrerEarnings[r.user_id].earned += Number(r.amount)
      }
      if (r.status === 'paid') {
        referrerEarnings[r.user_id].paid += Number(r.amount)
      }
    }

    return NextResponse.json({
      invites: enrichedInvites,
      stats: {
        totalSent,
        signedUp,
        conversionRate,
        pending: enrichedInvites.filter((i) => i.status === 'pending').length,
      },
      rewards: {
        totalEarned,
        totalPaid,
        outstanding: totalEarned - totalPaid,
        count: allRewards.length,
      },
      referrers: Object.values(referrerEarnings).sort((a, b) => b.earned - a.earned),
    })
  } catch (error) {
    console.error('[admin/invites] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
