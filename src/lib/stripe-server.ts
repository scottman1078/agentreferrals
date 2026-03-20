import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

/**
 * Get the server-side Stripe SDK instance (singleton).
 * Returns null if STRIPE_SECRET_KEY is not set.
 */
export function getStripeServer(): Stripe | null {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      console.warn('[Stripe Server] No secret key found — billing features are disabled.')
      return null
    }
    stripeInstance = new Stripe(key, {
      maxNetworkRetries: 1,
      timeout: 15000,
      httpClient: Stripe.createFetchHttpClient(),
    })
  }
  return stripeInstance
}
