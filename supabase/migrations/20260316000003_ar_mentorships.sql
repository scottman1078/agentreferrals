-- ══════════════════════════════════════
-- Mentor Match: mentorships table + profile columns
-- ══════════════════════════════════════

-- 1. Add mentor columns to ar_profiles
ALTER TABLE ar_profiles
  ADD COLUMN IF NOT EXISTS mentor_available BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentor_capacity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mentor_specializations TEXT[];

-- 2. Create mentorships table
CREATE TABLE IF NOT EXISTS ar_mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES ar_profiles(id),
  mentee_id UUID NOT NULL REFERENCES ar_profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'declined', 'completed')),
  specialization TEXT,
  message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, mentee_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_ar_mentorships_mentor_id ON ar_mentorships(mentor_id);
CREATE INDEX IF NOT EXISTS idx_ar_mentorships_mentee_id ON ar_mentorships(mentee_id);
CREATE INDEX IF NOT EXISTS idx_ar_mentorships_status ON ar_mentorships(status);
