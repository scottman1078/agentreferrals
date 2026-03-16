-- Add license verification columns to ar_profiles
ALTER TABLE ar_profiles
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS license_state TEXT,
  ADD COLUMN IF NOT EXISTS license_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_expiration DATE,
  ADD COLUMN IF NOT EXISTS license_type TEXT;

-- Index for quick lookup by license number + state
CREATE INDEX IF NOT EXISTS idx_ar_profiles_license
  ON ar_profiles (license_state, license_number)
  WHERE license_number IS NOT NULL;
