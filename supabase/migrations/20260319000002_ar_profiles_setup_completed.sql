-- Add setup_completed_at to ar_profiles so setup state persists across devices
ALTER TABLE ar_profiles ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;

-- Mark existing users who have territory as setup-complete
UPDATE ar_profiles
SET setup_completed_at = updated_at
WHERE primary_area IS NOT NULL
  AND territory_zips IS NOT NULL
  AND array_length(territory_zips, 1) > 1;
