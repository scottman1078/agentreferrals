-- Force drop ALL foreign key constraints on ar_profiles that reference auth.users
-- The constraint name might vary — try common patterns
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'ar_profiles'
      AND constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
  ) LOOP
    EXECUTE 'ALTER TABLE public.ar_profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    RAISE NOTICE 'Dropped constraint: %', r.constraint_name;
  END LOOP;
END $$;
