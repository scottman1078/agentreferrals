import { NextRequest, NextResponse } from 'next/server'

// GET /api/affiliate/rewards?userId=xxx
// Returns the user's affiliate reward summary
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get all rewards for this user
    const { data: rewards, error } = await supabase
      .from('ar_affiliate_rewards')
      .select('id, reward_type, amount, status, earned_at, paid_at')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    if (error) {
      console.error('[affiliate/rewards] Query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalEarned = (rewards ?? [])
      .filter((r) => r.status === 'earned' || r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    const totalPending = (rewards ?? [])
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    const totalPaid = (rewards ?? [])
      .filter((r) => r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    // Get the user's referral code for their shareable link
    const { data: profile } = await supabase
      .from('ar_profiles')
      .select('referral_code')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      rewards: rewards ?? [],
      summary: {
        totalEarned,
        totalPending,
        totalPaid,
        count: rewards?.length ?? 0,
      },
      referralCode: profile?.referral_code ?? null,
    })
  } catch (error) {
    console.error('[affiliate/rewards] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
