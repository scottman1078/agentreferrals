-- Add video_intro_url column to ar_profiles
ALTER TABLE ar_profiles ADD COLUMN IF NOT EXISTS video_intro_url TEXT;
