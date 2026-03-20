export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeServer } from '@/lib/stripe-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PRICE_CONFIG, FOUNDING_COUPON_ID, FOUNDING_MEMBER_LIMIT, type PaidTier } from '@/lib/stripe-prices'

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session in subscription mode.
 * Body: { userId: string, plan: 'growth' | 'pro' | 'elite', useFoundingPrice?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeServer()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { userId, plan } = body as { userId?: string; plan?: string }

    if (!userId || !plan) {
      return NextResponse.json({ error: 'userId and plan are required' }, { status: 400 })
    }

    if (!['growth', 'pro', 'elite'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan. Must be growth, pro, or elite' }, { status: 400 })
    }

    const tier = plan as PaidTier
    const priceConfig = PRICE_CONFIG[tier]

    if (!priceConfig.monthly) {
      return NextResponse.json(
        { error: 'Stripe prices not configured. Run /api/stripe/create-products first.' },
        { status: 500 }
      )
    }

    // Fetch user profile
    const supabase = createAdminClient()
    const { data: profile, error: profileError } = await supabase
      .from('ar_profiles')
      .select('stripe_customer_id, email, full_name, subscription_tier')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Resolve or create Stripe customer
    let customerId = profile.stripe_customer_id as string | null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email ?? undefined,
        name: profile.full_name ?? undefined,
        metadata: { userId },
      })
      customerId = customer.id

      // Persist customer ID
      await supabase
        .from('ar_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Check founding-member eligibility
    let isFoundingEligible = false
    if (FOUNDING_COUPON_ID) {
      const { count } = await supabase
        .from('ar_profiles')
        .select('id', { count: 'exact', head: true })
        .not('stripe_subscription_id', 'is', null)

      isFoundingEligible = (count ?? 0) < FOUNDING_MEMBER_LIMIT
    }

    // Build line items -- always use regular price, apply coupon for founding
    const lineItems = [{ price: priceConfig.monthly, quantity: 1 }]

    // Build checkout session params
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${origin}/dashboard/settings?tab=billing&billing=success`,
      cancel_url: `${origin}/dashboard/settings?tab=billing&billing=cancelled`,
      subscription_data: {
        metadata: { userId, plan: tier },
      },
      metadata: { userId, plan: tier },
    }

    // Apply founding-member coupon if eligible, otherwise allow promo codes
    if (isFoundingEligible && FOUNDING_COUPON_ID) {
      sessionParams.discounts = [{ coupon: FOUNDING_COUPON_ID }]
    } else {
      sessionParams.allow_promotion_codes = true
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
