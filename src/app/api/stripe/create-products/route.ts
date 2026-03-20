export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe-server'

/**
 * POST /api/stripe/create-products
 *
 * Idempotently creates the 3 paid Stripe products + monthly prices,
 * plus a founding-member coupon (50 % off for 6 months).
 *
 * Returns the created/existing price IDs so they can be stored in .env.local.
 */

interface PlanDef {
  tier: string
  name: string
  amount: number // cents
}

const PLANS: PlanDef[] = [
  { tier: 'growth', name: 'ZTR Growth', amount: 2900 },
  { tier: 'pro', name: 'ZTR Pro', amount: 5900 },
  { tier: 'elite', name: 'ZTR Elite', amount: 14900 },
]

export async function POST() {
  try {
    const stripe = getStripeServer()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const results: Record<string, { productId: string; priceId: string; foundingPriceId: string }> = {}

    for (const plan of PLANS) {
      // Check if product already exists by metadata
      const existing = await stripe.products.search({
        query: `metadata['ztr_tier']:'${plan.tier}'`,
      })

      let productId: string

      if (existing.data.length > 0) {
        productId = existing.data[0].id
      } else {
        const product = await stripe.products.create({
          name: plan.name,
          metadata: { ztr_tier: plan.tier },
          description: `${plan.name} monthly subscription`,
        })
        productId = product.id
      }

      // Check for existing regular price
      const existingPrices = await stripe.prices.list({
        product: productId,
        active: true,
        type: 'recurring',
      })

      let regularPriceId: string | undefined
      let foundingPriceId: string | undefined

      for (const p of existingPrices.data) {
        if (p.unit_amount === plan.amount && !p.metadata?.founding) {
          regularPriceId = p.id
        }
        if (p.unit_amount === Math.round(plan.amount / 2) && p.metadata?.founding === 'true') {
          foundingPriceId = p.id
        }
      }

      // Create regular monthly price if missing
      if (!regularPriceId) {
        const price = await stripe.prices.create({
          product: productId,
          unit_amount: plan.amount,
          currency: 'usd',
          recurring: { interval: 'month' },
          metadata: { ztr_tier: plan.tier },
        })
        regularPriceId = price.id
      }

      // Create founding-member price (50% off) if missing
      if (!foundingPriceId) {
        const price = await stripe.prices.create({
          product: productId,
          unit_amount: Math.round(plan.amount / 2),
          currency: 'usd',
          recurring: { interval: 'month' },
          metadata: { ztr_tier: plan.tier, founding: 'true' },
        })
        foundingPriceId = price.id
      }

      results[plan.tier] = { productId, priceId: regularPriceId, foundingPriceId }
    }

    // Create founding-member coupon if it doesn't exist
    let couponId: string | undefined
    try {
      const existingCoupons = await stripe.coupons.list({ limit: 100 })
      const foundingCoupon = existingCoupons.data.find(
        (c) => c.metadata?.type === 'ztr_founding_member'
      )
      if (foundingCoupon) {
        couponId = foundingCoupon.id
      }
    } catch {
      // ignore
    }

    if (!couponId) {
      const coupon = await stripe.coupons.create({
        percent_off: 50,
        duration: 'repeating',
        duration_in_months: 6,
        name: 'Founding Member — 50% off for 6 months',
        metadata: { type: 'ztr_founding_member' },
      })
      couponId = coupon.id
    }

    return NextResponse.json({
      success: true,
      message: 'Products, prices, and coupon created/verified. Add these to .env.local:',
      envVars: {
        STRIPE_PRICE_GROWTH: results.growth.priceId,
        STRIPE_PRICE_PRO: results.pro.priceId,
        STRIPE_PRICE_ELITE: results.elite.priceId,
        STRIPE_PRICE_GROWTH_FOUNDING: results.growth.foundingPriceId,
        STRIPE_PRICE_PRO_FOUNDING: results.pro.foundingPriceId,
        STRIPE_PRICE_ELITE_FOUNDING: results.elite.foundingPriceId,
        STRIPE_FOUNDING_COUPON_ID: couponId,
      },
      products: results,
    })
  } catch (err) {
    console.error('[create-products] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
