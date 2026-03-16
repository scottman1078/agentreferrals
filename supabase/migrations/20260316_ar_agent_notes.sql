-- ═══════════════════════════════════════════════════════════════
-- Agent Notes — private note log one agent keeps about another
-- Supports multiple timestamped notes per agent pair
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ar_agent_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_agent_notes_author ON ar_agent_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_ar_agent_notes_agent ON ar_agent_notes(author_id, agent_id);

-- RLS: users can only see/edit their own notes
ALTER TABLE ar_agent_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notes"
  ON ar_agent_notes FOR SELECT TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Users can create their own notes"
  ON ar_agent_notes FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON ar_agent_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid());
