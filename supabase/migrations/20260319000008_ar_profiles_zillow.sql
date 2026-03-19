-- ═══════════════════════════════════════════════════════════════
-- Add Zillow profile & transaction data columns to ar_profiles
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE ar_profiles ADD COLUMN IF NOT EXISTS zillow_profile_url TEXT;
ALTER TABLE ar_profiles ADD COLUMN IF NOT EXISTS total_transactions INTEGER;
ALTER TABLE ar_profiles ADD COLUMN IF NOT EXISTS data_sources JSONB DEFAULT '{}';
