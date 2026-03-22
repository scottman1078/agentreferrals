-- Bug tracker for admin panel and beta testers
CREATE TABLE IF NOT EXISTS ar_bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fixed', 'wont_fix', 'duplicate')),
  category TEXT DEFAULT 'bug' CHECK (category IN ('bug', 'feature', 'improvement', 'task')),
  reported_by UUID REFERENCES ar_profiles(id) ON DELETE SET NULL,
  reported_by_email TEXT,
  screenshot_url TEXT,
  page_url TEXT,
  ai_analysis TEXT,
  ai_suggested_files TEXT,
  fixed_at TIMESTAMPTZ,
  fixed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ar_bugs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read bugs
CREATE POLICY "ar_bugs_read" ON ar_bugs FOR SELECT USING (true);

-- Anyone authenticated can create bugs
CREATE POLICY "ar_bugs_insert" ON ar_bugs FOR INSERT WITH CHECK (true);

-- Only admins can update/delete
CREATE POLICY "ar_bugs_admin_update" ON ar_bugs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM ar_profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "ar_bugs_admin_delete" ON ar_bugs FOR DELETE
  USING (EXISTS (SELECT 1 FROM ar_profiles WHERE id = auth.uid() AND is_admin = true));

CREATE INDEX idx_ar_bugs_status ON ar_bugs(status);
CREATE INDEX idx_ar_bugs_severity ON ar_bugs(severity);
