-- The product DB client uses anon role since auth lives on Hub.
-- Allow anon to SELECT from all tables that the dashboard needs.

-- ar_profiles: already has anon select from earlier migration, but ensure it exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_profiles' AND policyname = 'ar_profiles_anon_select'
  ) THEN
    CREATE POLICY ar_profiles_anon_select ON ar_profiles FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ar_brokerages: allow anon select
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_brokerages' AND policyname = 'ar_brokerages_anon_select'
  ) THEN
    CREATE POLICY ar_brokerages_anon_select ON ar_brokerages FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ar_referrals: allow anon select (dashboard pipeline)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_referrals' AND policyname = 'ar_referrals_anon_select'
  ) THEN
    CREATE POLICY ar_referrals_anon_select ON ar_referrals FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ar_partnerships: allow anon select
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_partnerships' AND policyname = 'ar_partnerships_anon_select'
  ) THEN
    CREATE POLICY ar_partnerships_anon_select ON ar_partnerships FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ar_invites: allow anon select (for invite tracking)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_invites' AND policyname = 'ar_invites_anon_select'
  ) THEN
    CREATE POLICY ar_invites_anon_select ON ar_invites FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ar_agreements: allow anon select
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_agreements' AND policyname = 'ar_agreements_anon_select'
  ) THEN
    CREATE POLICY ar_agreements_anon_select ON ar_agreements FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ar_messages: allow anon select
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_messages' AND policyname = 'ar_messages_anon_select'
  ) THEN
    CREATE POLICY ar_messages_anon_select ON ar_messages FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ar_reviews: allow anon select
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_reviews' AND policyname = 'ar_reviews_anon_select'
  ) THEN
    CREATE POLICY ar_reviews_anon_select ON ar_reviews FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ar_nora_conversations: allow anon select
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_nora_conversations' AND policyname = 'ar_nora_anon_select'
  ) THEN
    CREATE POLICY ar_nora_anon_select ON ar_nora_conversations FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Also allow anon INSERT/UPDATE on ar_profiles for client-side updates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_profiles' AND policyname = 'ar_profiles_anon_insert'
  ) THEN
    CREATE POLICY ar_profiles_anon_insert ON ar_profiles FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_profiles' AND policyname = 'ar_profiles_anon_update'
  ) THEN
    CREATE POLICY ar_profiles_anon_update ON ar_profiles FOR UPDATE TO anon USING (true);
  END IF;
END $$;
