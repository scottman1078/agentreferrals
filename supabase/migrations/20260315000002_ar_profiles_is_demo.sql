-- Add is_demo flag to ar_profiles for identifying mock/demo accounts
-- When ready for production, run: DELETE FROM ar_profiles WHERE is_demo = TRUE;

ALTER TABLE ar_profiles ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN ar_profiles.is_demo IS 'True for mock/demo accounts — delete when ready for production';
