-- Extend ar_affiliate_rewards for Stripe integration
-- Add new status values: 'applied', 'banked'
-- Add columns for tracking Stripe subscription linkage

-- Drop and re-create the status check (if one exists) to support new values
-- Note: the original table uses TEXT without a CHECK constraint, so we just
-- need to add the new columns.

-- Track when a reward was applied to a Stripe subscription
ALTER TABLE ar_affiliate_rewards
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

-- Track which Stripe subscription the discount was applied to
ALTER TABLE ar_affiliate_rewards
  ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- Add stripe_customer_id to ar_profiles for linking users to Stripe
ALTER TABLE ar_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add stripe_subscription_id to ar_profiles for the main subscription
ALTER TABLE ar_profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index for looking up profiles by Stripe customer
CREATE INDEX IF NOT EXISTS idx_ar_profiles_stripe_customer
  ON ar_profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Allow service role to update rewards (for applying discounts)
CREATE POLICY "Service role can update rewards"
  ON ar_affiliate_rewards FOR UPDATE
  USING (true)
  WITH CHECK (true);
