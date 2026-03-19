-- Track which setup step the user has completed
-- 'intake' | 'service_area' | 'invites' | NULL (not started)
ALTER TABLE ar_profiles ADD COLUMN IF NOT EXISTS setup_step TEXT;

-- Mark existing users who completed onboarding as having finished intake
UPDATE ar_profiles SET setup_step = 'intake' WHERE primary_area IS NOT NULL AND setup_step IS NULL;

-- Mark users with territory as having finished service_area
UPDATE ar_profiles SET setup_step = 'service_area'
WHERE territory_zips IS NOT NULL AND array_length(territory_zips, 1) > 1 AND setup_step IS NOT NULL;

-- Mark fully completed users
UPDATE ar_profiles SET setup_step = 'complete'
WHERE setup_completed_at IS NOT NULL;
