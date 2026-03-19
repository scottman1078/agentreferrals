-- ar_settings: key-value store for configurable parameters
CREATE TABLE IF NOT EXISTS ar_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default values
INSERT INTO ar_settings (key, value) VALUES
  ('affiliate_commission_rate', '{"value": 10}'),
  ('affiliate_commission_duration_months', '{"value": 24}'),
  ('affiliate_max_discount', '{"value": 100}')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE ar_settings ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "ar_settings_public_read"
  ON ar_settings FOR SELECT
  USING (true);

-- Admin-only write (service role key bypasses RLS, but this guards
-- against authenticated non-admin users)
CREATE POLICY "ar_settings_admin_write"
  ON ar_settings FOR ALL
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('scott@agentdashboards.com')
  )
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('scott@agentdashboards.com')
  );
