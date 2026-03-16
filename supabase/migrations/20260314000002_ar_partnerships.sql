CREATE TABLE IF NOT EXISTS ar_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_agent_id UUID NOT NULL REFERENCES ar_profiles(id),
  receiving_agent_id UUID NOT NULL REFERENCES ar_profiles(id),
  requesting_market TEXT NOT NULL,
  receiving_market TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'active', 'expired')),
  message TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ar_partnerships_requesting ON ar_partnerships(requesting_agent_id);
CREATE INDEX idx_ar_partnerships_receiving ON ar_partnerships(receiving_agent_id);
CREATE INDEX idx_ar_partnerships_status ON ar_partnerships(status);

ALTER TABLE ar_partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their partnerships"
  ON ar_partnerships FOR SELECT TO authenticated
  USING (requesting_agent_id = auth.uid() OR receiving_agent_id = auth.uid());
CREATE POLICY "Users can create partnership requests"
  ON ar_partnerships FOR INSERT TO authenticated
  WITH CHECK (requesting_agent_id = auth.uid());
CREATE POLICY "Participants can update partnerships"
  ON ar_partnerships FOR UPDATE TO authenticated
  USING (requesting_agent_id = auth.uid() OR receiving_agent_id = auth.uid());
