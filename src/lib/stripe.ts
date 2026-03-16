import { loadStripe, type Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get the Stripe.js client instance (singleton).
 * Will return null until NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      console.warn('[Stripe] No publishable key found — billing features are disabled.')
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

/**
 * Stripe price IDs — update these when products are created in Stripe Dashboard.
 */
export const STRIPE_PRICES = {
  growth: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH ?? '',
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? '',
  elite: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE ?? '',
} as const

export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'elite'

export interface PlanConfig {
  id: SubscriptionTier
  name: string
  price: number
  priceLabel: string
  description: string
  recommended?: boolean
  features: Record<string, string | boolean>
}

export const PLANS: PlanConfig[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    priceLabel: 'Free forever',
    description: 'Get started with referral basics',
    features: {
      activeReferrals: '2',
      agentProfile: 'Basic',
      noraAiMatching: false,
      pipelineTracking: false,
      smartAgreements: false,
      roiAnalytics: false,
      crmIntegration: false,
      partnershipRequests: false,
      reviews: false,
      networkDegree1: false,
      networkDegree2: false,
      marketExclusivity: false,
      whiteLabelPage: false,
      brokerageAdmin: false,
      apiAccess: false,
      mentorBrowse: false,
      mentorRequest: false,
      mentorBecome: false,
      invitesPerMonth: '5',
      support: 'Community',
    },
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 29,
    priceLabel: '$29/mo',
    description: 'Scale your referral pipeline',
    features: {
      activeReferrals: '10',
      agentProfile: 'Enhanced',
      noraAiMatching: false,
      pipelineTracking: true,
      smartAgreements: false,
      roiAnalytics: false,
      crmIntegration: false,
      partnershipRequests: true,
      reviews: true,
      networkDegree1: true,
      networkDegree2: false,
      marketExclusivity: false,
      whiteLabelPage: false,
      brokerageAdmin: false,
      apiAccess: false,
      mentorBrowse: true,
      mentorRequest: '1',
      mentorBecome: false,
      invitesPerMonth: '25',
      support: 'Email',
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59,
    priceLabel: '$59/mo',
    description: 'AI-powered referral intelligence',
    recommended: true,
    features: {
      activeReferrals: 'Unlimited',
      agentProfile: 'Priority',
      noraAiMatching: true,
      pipelineTracking: true,
      smartAgreements: true,
      roiAnalytics: true,
      crmIntegration: true,
      partnershipRequests: true,
      reviews: true,
      networkDegree1: true,
      networkDegree2: true,
      marketExclusivity: false,
      whiteLabelPage: false,
      brokerageAdmin: false,
      apiAccess: false,
      mentorBrowse: true,
      mentorRequest: '2',
      mentorBecome: true,
      invitesPerMonth: 'Unlimited',
      support: 'Priority',
    },
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 149,
    priceLabel: '$149/mo',
    description: 'Enterprise-grade referral platform',
    features: {
      activeReferrals: 'Unlimited',
      agentProfile: 'Verified Elite',
      noraAiMatching: true,
      pipelineTracking: true,
      smartAgreements: true,
      roiAnalytics: true,
      crmIntegration: true,
      partnershipRequests: true,
      reviews: true,
      networkDegree1: true,
      networkDegree2: true,
      marketExclusivity: true,
      whiteLabelPage: true,
      brokerageAdmin: true,
      apiAccess: true,
      mentorBrowse: true,
      mentorRequest: '3',
      mentorBecome: true,
      invitesPerMonth: 'Unlimited',
      support: 'Dedicated CSM',
    },
  },
]

/** Human-readable labels for feature keys */
export const FEATURE_LABELS: Record<string, string> = {
  activeReferrals: 'Active referrals',
  agentProfile: 'Agent profile',
  noraAiMatching: 'NORA AI matching',
  pipelineTracking: 'Pipeline tracking',
  smartAgreements: 'Smart agreements',
  roiAnalytics: 'ROI analytics',
  crmIntegration: 'CRM integration',
  partnershipRequests: 'Partnership requests',
  reviews: 'Reviews',
  networkDegree1: '1-Degree Network',
  networkDegree2: '2-Degree Network',
  marketExclusivity: 'Market exclusivity',
  whiteLabelPage: 'White-label page',
  brokerageAdmin: 'Brokerage admin',
  apiAccess: 'API access',
  mentorBrowse: 'Browse mentors',
  mentorRequest: 'Mentor matching',
  mentorBecome: 'Become a mentor',
  invitesPerMonth: 'Invites per month',
  support: 'Support',
}
