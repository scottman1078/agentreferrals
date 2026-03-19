import { NextRequest, NextResponse } from 'next/server'

const DISCOUNT_PER_REFERRAL = 10 // 10% per referral
const MAX_DISCOUNT = 100 // 100% = 1 free month
const REWARDS_PER_FREE_MONTH = MAX_DISCOUNT / DISCOUNT_PER_REFERRAL // 10 rewards = 1 free month

/**
 * POST /api/affiliate/bank
 * Body: { userId }
 *
 * When a user's earned rewards exceed the 100% discount cap,
 * excess rewards are banked. Each 100% worth (10 rewards) = 1 free month.
 *
 * This endpoint:
 * 1. Counts all 'earned' rewards that exceed the 100% cap
 * 2. Marks excess as 'banked'
 * 3. Returns banked month count and remaining earned rewards
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get all 'earned' rewards
    const { data: earnedRewards, error: earnedError } = await supabase
      .from('ar_affiliate_rewards')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'earned')
      .eq('reward_type', 'subscription_discount')
      .order('earned_at', { ascending: true })

    if (earnedError) {
      console.error('[affiliate/bank] Earned query error:', earnedError.message)
      return NextResponse.json({ error: earnedError.message }, { status: 500 })
    }

    // Get already banked rewards to calculate total banked months
    const { count: existingBankedCount, error: bankedError } = await supabase
      .from('ar_affiliate_rewards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'banked')

    if (bankedError) {
      console.error('[affiliate/bank] Banked count error:', bankedError.message)
      return NextResponse.json({ error: bankedError.message }, { status: 500 })
    }

    const earnedCount = earnedRewards?.length ?? 0
    const maxApplicable = Math.floor(MAX_DISCOUNT / DISCOUNT_PER_REFERRAL) // 10
    const excessCount = Math.max(0, earnedCount - maxApplicable)

    if (excessCount === 0) {
      const totalBanked = existingBankedCount ?? 0
      return NextResponse.json({
        message: 'No excess rewards to bank',
        earnedCount,
        bankedThisTime: 0,
        totalBankedRewards: totalBanked,
        bankedMonths: Math.floor(totalBanked / REWARDS_PER_FREE_MONTH),
        activeDiscount: earnedCount * DISCOUNT_PER_REFERRAL,
      })
    }

    // Bank the excess (oldest earned rewards first since we sorted ascending)
    // Keep the most recent rewards as "earned" for the active discount
    const rewardsToBankIds = (earnedRewards ?? [])
      .slice(0, excessCount)
      .map((r) => r.id)

    const { error: updateError } = await supabase
      .from('ar_affiliate_rewards')
      .update({ status: 'banked' })
      .in('id', rewardsToBankIds)

    if (updateError) {
      console.error('[affiliate/bank] Bank update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to bank rewards' }, { status: 500 })
    }

    const totalBankedRewards = (existingBankedCount ?? 0) + excessCount
    const bankedMonths = Math.floor(totalBankedRewards / REWARDS_PER_FREE_MONTH)
    const remainingEarned = earnedCount - excessCount

    return NextResponse.json({
      bankedThisTime: excessCount,
      totalBankedRewards,
      bankedMonths,
      remainingEarned,
      activeDiscount: remainingEarned * DISCOUNT_PER_REFERRAL,
    })
  } catch (error) {
    console.error('[affiliate/bank] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
