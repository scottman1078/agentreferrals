import { NextRequest, NextResponse } from 'next/server'

const DISCOUNT_PER_REFERRAL = 10 // 10% per referral
const MAX_DISCOUNT = 100 // Cap at 100%
const REWARDS_PER_FREE_MONTH = MAX_DISCOUNT / DISCOUNT_PER_REFERRAL // 10 rewards = 1 free month

// GET /api/affiliate/rewards?userId=xxx
// Returns the user's affiliate reward summary including discount calculations
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
      .select('id, reward_type, amount, status, earned_at, paid_at, applied_at, subscription_id')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    if (error) {
      console.error('[affiliate/rewards] Query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const allRewards = rewards ?? []

    const totalEarned = allRewards
      .filter((r) => r.status === 'earned' || r.status === 'paid' || r.status === 'applied')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    const totalPending = allRewards
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    const totalPaid = allRewards
      .filter((r) => r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    // Discount calculations (for subscription_discount rewards)
    const earnedUnapplied = allRewards.filter(
      (r) => r.status === 'earned' && r.reward_type === 'subscription_discount'
    )
    const appliedRewards = allRewards.filter(
      (r) => r.status === 'applied' && r.reward_type === 'subscription_discount'
    )
    const bankedRewards = allRewards.filter(
      (r) => r.status === 'banked' && r.reward_type === 'subscription_discount'
    )

    // Unapplied earned discount (what they can apply next)
    const unappliedDiscountRaw = earnedUnapplied.length * DISCOUNT_PER_REFERRAL
    const discountPercent = Math.min(unappliedDiscountRaw, MAX_DISCOUNT)

    // Currently active applied discount
    const activeDiscount = Math.min(appliedRewards.length * DISCOUNT_PER_REFERRAL, MAX_DISCOUNT)

    // Banked credits: each set of 10 banked rewards = 1 free month
    const bankedCredits = bankedRewards.length
    const bankedMonths = Math.floor(bankedCredits / REWARDS_PER_FREE_MONTH)

    // Get the user's referral code for their shareable link
    const { data: profile } = await supabase
      .from('ar_profiles')
      .select('referral_code')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      rewards: allRewards,
      summary: {
        totalEarned,
        totalPending,
        totalPaid,
        count: allRewards.length,
      },
      discount: {
        /** Unapplied earned discount percent (ready to apply) */
        discountPercent,
        /** Currently active applied discount on their subscription */
        activeDiscount,
        /** Number of banked reward credits */
        bankedCredits,
        /** Free months earned from banked credits */
        bankedMonths,
        /** Max discount cap */
        maxDiscount: MAX_DISCOUNT,
        /** Number of unapplied earned rewards */
        unappliedCount: earnedUnapplied.length,
      },
      referralCode: profile?.referral_code ?? null,
    })
  } catch (error) {
    console.error('[affiliate/rewards] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
