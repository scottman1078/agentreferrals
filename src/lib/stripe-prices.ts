/**
 * Stripe price configuration.
 *
 * Price IDs are populated via environment variables after running the
 * /api/stripe/create-products endpoint (or creating products manually
 * in the Stripe dashboard).
 *
 * Set the following in .env.local:
 *   STRIPE_PRICE_GROWTH=price_xxx
 *   STRIPE_PRICE_PRO=price_xxx
 *   STRIPE_PRICE_ELITE=price_xxx
 *   STRIPE_PRICE_GROWTH_FOUNDING=price_xxx
 *   STRIPE_PRICE_PRO_FOUNDING=price_xxx
 *   STRIPE_PRICE_ELITE_FOUNDING=price_xxx
 *   STRIPE_FOUNDING_COUPON_ID=coupon_xxx
 */

export type PaidTier = 'growth' | 'pro' | 'elite'

export interface PriceConfig {
  monthly: string       // regular monthly price ID
  founding: string      // founding-member price ID (50 % off)
  amount: number        // amount in cents
  foundingAmount: number
  productName: string
}

export const PRICE_CONFIG: Record<PaidTier, PriceConfig> = {
  growth: {
    monthly: process.env.STRIPE_PRICE_GROWTH ?? '',
    founding: process.env.STRIPE_PRICE_GROWTH_FOUNDING ?? '',
    amount: 2900,
    foundingAmount: 1450,
    productName: 'ZTR Growth',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO ?? '',
    founding: process.env.STRIPE_PRICE_PRO_FOUNDING ?? '',
    amount: 5900,
    foundingAmount: 2950,
    productName: 'ZTR Pro',
  },
  elite: {
    monthly: process.env.STRIPE_PRICE_ELITE ?? '',
    founding: process.env.STRIPE_PRICE_ELITE_FOUNDING ?? '',
    amount: 14900,
    foundingAmount: 7450,
    productName: 'ZTR Elite',
  },
}

/** Max number of founding-member subscribers */
export const FOUNDING_MEMBER_LIMIT = 1000

/** Founding coupon: 50 % off for 6 months */
export const FOUNDING_COUPON_ID = process.env.STRIPE_FOUNDING_COUPON_ID ?? ''
