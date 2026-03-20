import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe-server'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle.
 * Requires STRIPE_WEBHOOK_SECRET env var.
 */

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const stripe = getStripeServer()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan

        if (!userId || !plan) {
          console.warn('[stripe/webhook] checkout.session.completed missing metadata', { userId, plan })
          break
        }

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription | null)?.id

        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : (session.customer as Stripe.Customer | Stripe.DeletedCustomer | null)?.id

        const { error } = await supabase
          .from('ar_profiles')
          .update({
            subscription_tier: plan,
            stripe_subscription_id: subscriptionId ?? null,
            stripe_customer_id: customerId ?? null,
          })
          .eq('id', userId)

        if (error) {
          console.error('[stripe/webhook] Failed to update profile on checkout:', error)
        } else {
          console.log(`[stripe/webhook] User ${userId} upgraded to ${plan}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        const plan = subscription.metadata?.plan

        if (!userId) {
          // Try to find user by stripe_customer_id
          const customerId =
            typeof subscription.customer === 'string'
              ? subscription.customer
              : (subscription.customer as Stripe.Customer)?.id

          if (customerId) {
            const { data: profile } = await supabase
              .from('ar_profiles')
              .select('id')
              .eq('stripe_customer_id', customerId)
              .single()

            if (profile && plan) {
              await supabase
                .from('ar_profiles')
                .update({ subscription_tier: plan })
                .eq('id', profile.id)
              console.log(`[stripe/webhook] Subscription updated for user ${profile.id} to ${plan}`)
            }
          }
          break
        }

        if (plan) {
          await supabase
            .from('ar_profiles')
            .update({ subscription_tier: plan })
            .eq('id', userId)
          console.log(`[stripe/webhook] Subscription updated for user ${userId} to ${plan}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : (subscription.customer as Stripe.Customer)?.id

        if (userId) {
          await supabase
            .from('ar_profiles')
            .update({
              subscription_tier: 'starter',
              stripe_subscription_id: null,
            })
            .eq('id', userId)
          console.log(`[stripe/webhook] User ${userId} downgraded to starter (subscription deleted)`)
        } else if (customerId) {
          const { data: profile } = await supabase
            .from('ar_profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()

          if (profile) {
            await supabase
              .from('ar_profiles')
              .update({
                subscription_tier: 'starter',
                stripe_subscription_id: null,
              })
              .eq('id', profile.id)
            console.log(`[stripe/webhook] User ${profile.id} downgraded to starter (subscription deleted)`)
          }
        }
        break
      }

      default:
        console.log(`[stripe/webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error('[stripe/webhook] Error processing event:', err)
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
