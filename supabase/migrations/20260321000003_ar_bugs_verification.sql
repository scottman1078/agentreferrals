-- Add verification fields to bug tracker
ALTER TABLE ar_bugs
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verified_status TEXT CHECK (verified_status IN ('confirmed', 'not_fixed', 'partial')),
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verification_screenshot_url TEXT;
