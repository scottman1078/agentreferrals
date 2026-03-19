-- Affiliate Rewards: track rewards earned per successful invite
CREATE TABLE IF NOT EXISTS ar_affiliate_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  invite_id UUID REFERENCES ar_invites(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL DEFAULT 'cash_back',  -- 'cash_back' | 'subscription_discount'
  amount NUMERIC(10,2) NOT NULL DEFAULT 10.00,    -- $10 per successful invite
  status TEXT NOT NULL DEFAULT 'pending',          -- 'pending' | 'earned' | 'paid'
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by user
CREATE INDEX idx_ar_affiliate_rewards_user ON ar_affiliate_rewards(user_id);

-- RLS
ALTER TABLE ar_affiliate_rewards ENABLE ROW LEVEL SECURITY;

-- Users can read their own rewards
CREATE POLICY "Users can view own rewards"
  ON ar_affiliate_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- Service role inserts (via API routes)
CREATE POLICY "Service role can insert rewards"
  ON ar_affiliate_rewards FOR INSERT
  WITH CHECK (true);

-- Anon select for API routes using admin client
CREATE POLICY "Anon can select rewards"
  ON ar_affiliate_rewards FOR SELECT
  USING (true);
