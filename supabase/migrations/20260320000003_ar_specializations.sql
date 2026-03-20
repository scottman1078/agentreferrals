-- Create ar_specializations table
CREATE TABLE IF NOT EXISTS ar_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  emoji TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: public read, admin write
ALTER TABLE ar_specializations ENABLE ROW LEVEL SECURITY;

-- Anyone can read specializations
CREATE POLICY "ar_specializations_public_read"
  ON ar_specializations FOR SELECT
  USING (true);

-- Only admins (service role) can insert/update/delete
-- Since admin APIs use service role key, they bypass RLS.
-- But for extra safety, restrict mutations to authenticated admins.
CREATE POLICY "ar_specializations_admin_insert"
  ON ar_specializations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

CREATE POLICY "ar_specializations_admin_update"
  ON ar_specializations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

CREATE POLICY "ar_specializations_admin_delete"
  ON ar_specializations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

-- Seed with existing specializations
INSERT INTO ar_specializations (name, color, emoji, sort_order) VALUES
  ('Homes for Heroes', '#3b82f6', '🦸', 0),
  ('Luxury', '#f0a500', '💎', 1),
  ('First-Time Buyers', '#22c55e', '🏡', 2),
  ('Investment', '#a855f7', '📈', 3),
  ('Relocation', '#f97316', '📦', 4),
  ('Land & Acreage', '#d97706', '🌾', 5),
  ('New Construction', '#14b8a6', '🏗', 6),
  ('Probate', '#6366f1', '⚖️', 7),
  ('Downsizing', '#ec4899', '📐', 8)
ON CONFLICT (name) DO NOTHING;
