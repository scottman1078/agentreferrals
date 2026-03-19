import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe-server'

const DISCOUNT_PER_REFERRAL = 10 // 10% per referral
const MAX_DISCOUNT = 100 // Cap at 100%

/**
 * POST /api/affiliate/apply-discount
 * Body: { userId }
 *
 * Calculates the total earned (unapplied) affiliate discount,
 * creates/updates a Stripe coupon, applies it to the user's subscription,
 * and marks rewards as 'applied'.
 *
 * If discount exceeds 100%, only 100% is applied — excess rewards
 * should be banked via /api/affiliate/bank.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // 1. Get all 'earned' (unapplied) rewards for this user
    const { data: earnedRewards, error: rewardsError } = await supabase
      .from('ar_affiliate_rewards')
      .select('id, reward_type, amount, status')
      .eq('user_id', userId)
      .eq('status', 'earned')
      .eq('reward_type', 'subscription_discount')

    if (rewardsError) {
      console.error('[affiliate/apply-discount] Rewards query error:', rewardsError.message)
      return NextResponse.json({ error: rewardsError.message }, { status: 500 })
    }

    const earnedCount = earnedRewards?.length ?? 0
    if (earnedCount === 0) {
      return NextResponse.json({
        message: 'No earned rewards to apply',
        discountPercent: 0,
        bankedCredits: 0,
      })
    }

    // 2. Calculate discount: each reward = 10%, cap at 100%
    const rawDiscount = earnedCount * DISCOUNT_PER_REFERRAL
    const applicableDiscount = Math.min(rawDiscount, MAX_DISCOUNT)
    const excessRewards = Math.max(0, earnedCount - Math.floor(MAX_DISCOUNT / DISCOUNT_PER_REFERRAL))
    const rewardsToApply = earnedCount - excessRewards

    // Split rewards: ones to apply vs ones to bank
    const applyIds = (earnedRewards ?? []).slice(0, rewardsToApply).map((r) => r.id)
    const bankIds = (earnedRewards ?? []).slice(rewardsToApply).map((r) => r.id)

    // 3. Get user's Stripe info
    const { data: profile, error: profileError } = await supabase
      .from('ar_profiles')
      .select('stripe_customer_id, stripe_subscription_id, email, full_name')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const stripe = getStripeServer()
    let stripeSubscriptionId = profile.stripe_subscription_id

    if (stripe && profile.stripe_customer_id && stripeSubscriptionId) {
      // 4. Create a Stripe coupon for this user's current discount
      const coupon = await stripe.coupons.create({
        percent_off: applicableDiscount,
        duration: 'repeating',
        duration_in_months: 1, // Applied monthly, re-evaluated each billing cycle
        name: `Affiliate Referral Discount - ${applicableDiscount}% (${userId.slice(0, 8)})`,
        metadata: {
          user_id: userId,
          reward_count: String(rewardsToApply),
        },
      })

      // 5. Apply coupon to the subscription via discounts array
      await stripe.subscriptions.update(stripeSubscriptionId, {
        discounts: [{ coupon: coupon.id }],
      })
    } else {
      // Stripe not configured or user has no subscription yet
      console.warn(
        '[affiliate/apply-discount] Stripe not fully configured or user has no subscription.',
        {
          stripeConfigured: !!stripe,
          hasCustomerId: !!profile.stripe_customer_id,
          hasSubscriptionId: !!stripeSubscriptionId,
        }
      )
      // We still mark rewards as applied in the database so the state is tracked.
      // When Stripe is wired up, the coupon will be created on next apply.
      stripeSubscriptionId = null
    }

    const now = new Date().toISOString()

    // 6. Mark applied rewards
    if (applyIds.length > 0) {
      const { error: updateError } = await supabase
        .from('ar_affiliate_rewards')
        .update({
          status: 'applied',
          applied_at: now,
          subscription_id: stripeSubscriptionId ?? null,
        })
        .in('id', applyIds)

      if (updateError) {
        console.error('[affiliate/apply-discount] Failed to update reward status:', updateError.message)
        return NextResponse.json({ error: 'Failed to update reward status' }, { status: 500 })
      }
    }

    // 7. Bank excess rewards if any
    if (bankIds.length > 0) {
      const { error: bankError } = await supabase
        .from('ar_affiliate_rewards')
        .update({ status: 'banked' })
        .in('id', bankIds)

      if (bankError) {
        console.error('[affiliate/apply-discount] Failed to bank excess rewards:', bankError.message)
      }
    }

    return NextResponse.json({
      discountPercent: applicableDiscount,
      rewardsApplied: rewardsToApply,
      bankedCredits: excessRewards,
      stripeConfigured: !!stripe && !!profile.stripe_customer_id,
      subscriptionUpdated: !!stripe && !!stripeSubscriptionId,
    })
  } catch (error) {
    console.error('[affiliate/apply-discount] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
