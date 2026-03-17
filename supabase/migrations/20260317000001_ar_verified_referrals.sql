-- Verified Referrals — peer-verified referral history
-- Agents can submit past referral deals and have the other agent confirm them

CREATE TABLE IF NOT EXISTS ar_verified_referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id    UUID REFERENCES ar_profiles(id) NOT NULL,
  partner_email   TEXT NOT NULL,
  partner_id      UUID REFERENCES ar_profiles(id),
  partner_name    TEXT,
  direction       TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  client_name     TEXT,
  market          TEXT,
  sale_price      NUMERIC(12,2),
  referral_fee_percent INTEGER DEFAULT 25,
  close_date      DATE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'disputed')),
  verified_at     TIMESTAMPTZ,
  invite_sent     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_verified_referrals_submitter ON ar_verified_referrals(submitter_id);
CREATE INDEX idx_verified_referrals_partner   ON ar_verified_referrals(partner_id);
CREATE INDEX idx_verified_referrals_email     ON ar_verified_referrals(partner_email);
CREATE INDEX idx_verified_referrals_status    ON ar_verified_referrals(status);

-- RLS
ALTER TABLE ar_verified_referrals ENABLE ROW LEVEL SECURITY;

-- Agents can view referrals they submitted or are partners on
CREATE POLICY "Users can view own referrals"
  ON ar_verified_referrals FOR SELECT
  USING (auth.uid() = submitter_id OR auth.uid() = partner_id);

-- Agents can insert referrals they submit
CREATE POLICY "Users can insert own referrals"
  ON ar_verified_referrals FOR INSERT
  WITH CHECK (auth.uid() = submitter_id);

-- Partners can update referrals to verify/dispute
CREATE POLICY "Partners can confirm referrals"
  ON ar_verified_referrals FOR UPDATE
  USING (auth.uid() = partner_id OR auth.uid() = submitter_id);
