-- CRM Integration Foundation for AgentReferrals
-- Supports Follow Up Boss (FUB) and Lofty contact sync

-- ============================================================
-- 1. ar_crm_connections — per-user CRM setup
-- ============================================================
CREATE TABLE IF NOT EXISTS ar_crm_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('fub', 'lofty')),
  api_key       TEXT,
  access_token  TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_synced_at TIMESTAMPTZ,
  contact_count INTEGER NOT NULL DEFAULT 0,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, provider)
);

-- ============================================================
-- 2. ar_crm_contacts — synced client data (the "Data Hub")
-- ============================================================
CREATE TABLE IF NOT EXISTS ar_crm_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  external_id     TEXT NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  email           TEXT,
  phone           TEXT,
  tags            TEXT[],
  lead_status     TEXT,
  lead_source     TEXT,
  property_address TEXT,
  notes           TEXT,
  raw_data        JSONB,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, provider, external_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_crm_connections_agent ON ar_crm_connections(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_connections_provider ON ar_crm_connections(provider);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_agent ON ar_crm_contacts(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_provider ON ar_crm_contacts(provider);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_external ON ar_crm_contacts(external_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON ar_crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_name ON ar_crm_contacts(last_name, first_name);

-- ============================================================
-- Updated-at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_crm_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_crm_connections_updated_at
  BEFORE UPDATE ON ar_crm_connections
  FOR EACH ROW EXECUTE FUNCTION update_crm_connections_updated_at();

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE ar_crm_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_crm_contacts ENABLE ROW LEVEL SECURITY;

-- Connections: users can only access their own
CREATE POLICY "Users can view own CRM connections"
  ON ar_crm_connections FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Users can insert own CRM connections"
  ON ar_crm_connections FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Users can update own CRM connections"
  ON ar_crm_connections FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Users can delete own CRM connections"
  ON ar_crm_connections FOR DELETE
  USING (agent_id = auth.uid());

-- Contacts: users can only access their own
CREATE POLICY "Users can view own CRM contacts"
  ON ar_crm_contacts FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Users can insert own CRM contacts"
  ON ar_crm_contacts FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Users can update own CRM contacts"
  ON ar_crm_contacts FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Users can delete own CRM contacts"
  ON ar_crm_contacts FOR DELETE
  USING (agent_id = auth.uid());
