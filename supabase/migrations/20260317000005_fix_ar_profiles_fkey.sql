-- Remove the foreign key constraint on ar_profiles.id that references auth.users
-- Auth lives on the Hub project, not the AR product project, so this FK is invalid.
ALTER TABLE ar_profiles DROP CONSTRAINT IF EXISTS ar_profiles_id_fkey;
