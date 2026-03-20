-- Add social media link columns to ar_profiles
ALTER TABLE ar_profiles
  ADD COLUMN IF NOT EXISTS social_instagram TEXT,
  ADD COLUMN IF NOT EXISTS social_facebook TEXT,
  ADD COLUMN IF NOT EXISTS social_linkedin TEXT,
  ADD COLUMN IF NOT EXISTS social_tiktok TEXT,
  ADD COLUMN IF NOT EXISTS social_youtube TEXT,
  ADD COLUMN IF NOT EXISTS social_twitter TEXT;
