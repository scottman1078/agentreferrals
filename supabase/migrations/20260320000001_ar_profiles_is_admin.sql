-- Add is_admin boolean and update subscription_tier constraint to include 'growth' and 'starter'
ALTER TABLE ar_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Update the subscription_tier check constraint to include all tiers
ALTER TABLE ar_profiles DROP CONSTRAINT IF EXISTS ar_profiles_subscription_tier_check;
ALTER TABLE ar_profiles ADD CONSTRAINT ar_profiles_subscription_tier_check
  CHECK (subscription_tier = ANY (ARRAY['free'::text, 'starter'::text, 'growth'::text, 'pro'::text, 'elite'::text]));

-- Set existing admin
UPDATE ar_profiles SET is_admin = true WHERE email = 'scott@agentdashboards.com';
