-- ═══ Mark all existing profiles as demo data ═══
-- ar_profiles already has is_demo column from migration 20260315000002.
-- Mark all current profiles as demo, except real user accounts.

-- Mark ALL existing profiles as demo
UPDATE ar_profiles SET is_demo = true WHERE is_demo = false OR is_demo IS NULL;

-- Unmark known real users (keep these as NOT demo)
-- scott@agentdashboards.com, scott.molluso@gmail.com, and the demo login
UPDATE ar_profiles SET is_demo = false
WHERE email IN (
  'scott@agentdashboards.com',
  'scott.molluso@gmail.com',
  'demo@onspec.ai'
);

-- Add is_demo to ar_referrals
ALTER TABLE ar_referrals ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Mark all existing referrals as demo
UPDATE ar_referrals SET is_demo = true;

-- Add is_demo to ar_brokerages
ALTER TABLE ar_brokerages ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Mark all existing brokerages as demo
UPDATE ar_brokerages SET is_demo = true;

-- Add is_demo to ar_invites
ALTER TABLE ar_invites ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Mark all existing invites as demo
UPDATE ar_invites SET is_demo = true;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_ar_profiles_is_demo ON ar_profiles(is_demo);
CREATE INDEX IF NOT EXISTS idx_ar_referrals_is_demo ON ar_referrals(is_demo);
