-- Fix: AR auth lives on the Hub project, not the AR project.
-- The AR product client has no session, so requests come as 'anon' role.
-- Allow anon SELECT so the auth-context can fetch ar_profiles after Hub login.
CREATE POLICY ar_profiles_anon_select ON ar_profiles FOR SELECT TO anon USING (true);
