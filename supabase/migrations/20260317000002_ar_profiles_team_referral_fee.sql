-- Add team and referral fee fields to ar_profiles
ALTER TABLE ar_profiles
  ADD COLUMN IF NOT EXISTS team_name TEXT,
  ADD COLUMN IF NOT EXISTS is_on_team BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS avg_referral_fee INTEGER DEFAULT 25;
