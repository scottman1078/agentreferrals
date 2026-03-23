-- Add hidden flag and delete support for partnerships
-- Supports "Hide Agent" (soft-hide from view) and "Remove from Network" (delete partnership)

-- Add is_hidden columns for each side of the partnership
ALTER TABLE ar_partnerships ADD COLUMN IF NOT EXISTS hidden_by_requesting BOOLEAN DEFAULT FALSE;
ALTER TABLE ar_partnerships ADD COLUMN IF NOT EXISTS hidden_by_receiving BOOLEAN DEFAULT FALSE;

-- Allow users to delete their own partnerships
CREATE POLICY "Users can delete their partnerships"
  ON ar_partnerships FOR DELETE TO authenticated
  USING (requesting_agent_id = auth.uid() OR receiving_agent_id = auth.uid());
