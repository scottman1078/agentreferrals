-- The product DB client uses anon role since auth lives on Hub.
-- Allow anon to INSERT and UPDATE ar_messages for client-side messaging.

-- ar_messages: allow anon insert (sending messages)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_messages' AND policyname = 'ar_messages_anon_insert'
  ) THEN
    CREATE POLICY ar_messages_anon_insert ON ar_messages FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- ar_messages: allow anon update (marking messages as read)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ar_messages' AND policyname = 'ar_messages_anon_update'
  ) THEN
    CREATE POLICY ar_messages_anon_update ON ar_messages FOR UPDATE TO anon USING (true);
  END IF;
END $$;
