-- Add verification_token column to ar_verified_referrals
-- Enables token-based verification flow for partners via email link

ALTER TABLE ar_verified_referrals
  ADD COLUMN IF NOT EXISTS verification_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_verified_referrals_token
  ON ar_verified_referrals(verification_token);

-- Allow anonymous users to read referrals by token (for verification page)
CREATE POLICY "Anon can read referrals by token"
  ON ar_verified_referrals FOR SELECT
  USING (verification_token IS NOT NULL);

-- Allow anonymous users to update referrals by token (confirm/dispute)
CREATE POLICY "Anon can update referrals by token"
  ON ar_verified_referrals FOR UPDATE
  USING (verification_token IS NOT NULL);
