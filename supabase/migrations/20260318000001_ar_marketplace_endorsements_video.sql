-- ═══════════════════════════════════════════════════════════════
-- AgentReferrals.ai — Marketplace, Endorsements, Video Intros
-- 2026-03-18
-- ═══════════════════════════════════════════════════════════════

-- ─── MARKETPLACE POSTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_marketplace_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_agent_id UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  -- Client details (privacy-redacted until awarded)
  client_initials TEXT NOT NULL,
  representation TEXT NOT NULL CHECK (representation IN ('Buyer', 'Seller', 'Both')),
  budget_range TEXT NOT NULL,
  estimated_price NUMERIC(14,2),
  timeline TEXT,
  -- Target market
  market TEXT NOT NULL,
  neighborhood TEXT,
  -- Referral terms
  fee_percent NUMERIC(5,2) DEFAULT 25.00,
  commission_rate NUMERIC(5,2) DEFAULT 3.00,
  -- Description
  description TEXT NOT NULL,
  client_needs TEXT[] DEFAULT '{}',
  -- Timing
  decision_deadline TIMESTAMPTZ NOT NULL,
  early_access_until TIMESTAMPTZ NOT NULL, -- paid members see first
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'awarded', 'expired', 'cancelled')),
  awarded_bid_id UUID, -- set when a bid is accepted
  -- Metrics
  view_count INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ─── MARKETPLACE BIDS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_marketplace_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES ar_marketplace_posts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  -- Bid content
  pitch TEXT NOT NULL,
  video_url TEXT,
  video_duration INTEGER, -- seconds
  highlights TEXT[] DEFAULT '{}',
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  response_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One bid per agent per post
  UNIQUE (post_id, agent_id)
);

-- ─── ENDORSEMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  endorser_id UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One endorsement per skill per pair
  UNIQUE (agent_id, endorser_id, skill)
);

-- ─── VIDEO INTROS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_video_intros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE UNIQUE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER NOT NULL, -- seconds
  title TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ZOOM INTERVIEWS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_zoom_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  interviewee_id UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'declined', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  zoom_link TEXT,
  recording_url TEXT,
  is_public BOOLEAN DEFAULT false,
  duration INTEGER, -- minutes
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

-- Marketplace Posts
ALTER TABLE ar_marketplace_posts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read open posts (respecting early access)
CREATE POLICY "marketplace_posts_select" ON ar_marketplace_posts
  FOR SELECT TO authenticated
  USING (true);

-- Anon can read open posts (for public browsing)
CREATE POLICY "marketplace_posts_anon_select" ON ar_marketplace_posts
  FOR SELECT TO anon
  USING (status = 'open' AND early_access_until < NOW());

-- Only the posting agent can insert
CREATE POLICY "marketplace_posts_insert" ON ar_marketplace_posts
  FOR INSERT TO authenticated
  WITH CHECK (posting_agent_id = auth.uid());

-- Only the posting agent can update their own post
CREATE POLICY "marketplace_posts_update" ON ar_marketplace_posts
  FOR UPDATE TO authenticated
  USING (posting_agent_id = auth.uid());

-- Marketplace Bids
ALTER TABLE ar_marketplace_bids ENABLE ROW LEVEL SECURITY;

-- Post owner and bid owner can read bids
CREATE POLICY "marketplace_bids_select" ON ar_marketplace_bids
  FOR SELECT TO authenticated
  USING (
    agent_id = auth.uid()
    OR post_id IN (SELECT id FROM ar_marketplace_posts WHERE posting_agent_id = auth.uid())
  );

-- Authenticated users can create bids
CREATE POLICY "marketplace_bids_insert" ON ar_marketplace_bids
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

-- Bid owner can update (withdraw), post owner can update (accept/decline)
CREATE POLICY "marketplace_bids_update" ON ar_marketplace_bids
  FOR UPDATE TO authenticated
  USING (
    agent_id = auth.uid()
    OR post_id IN (SELECT id FROM ar_marketplace_posts WHERE posting_agent_id = auth.uid())
  );

-- Endorsements
ALTER TABLE ar_endorsements ENABLE ROW LEVEL SECURITY;

-- Anyone can read endorsements
CREATE POLICY "endorsements_select" ON ar_endorsements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "endorsements_anon_select" ON ar_endorsements
  FOR SELECT TO anon
  USING (true);

-- Authenticated users can endorse (not themselves)
CREATE POLICY "endorsements_insert" ON ar_endorsements
  FOR INSERT TO authenticated
  WITH CHECK (endorser_id = auth.uid() AND agent_id != auth.uid());

-- Can delete your own endorsements
CREATE POLICY "endorsements_delete" ON ar_endorsements
  FOR DELETE TO authenticated
  USING (endorser_id = auth.uid());

-- Video Intros
ALTER TABLE ar_video_intros ENABLE ROW LEVEL SECURITY;

-- Anyone can read video intros
CREATE POLICY "video_intros_select" ON ar_video_intros
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "video_intros_anon_select" ON ar_video_intros
  FOR SELECT TO anon
  USING (true);

-- Only the agent can manage their own video
CREATE POLICY "video_intros_insert" ON ar_video_intros
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "video_intros_update" ON ar_video_intros
  FOR UPDATE TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "video_intros_delete" ON ar_video_intros
  FOR DELETE TO authenticated
  USING (agent_id = auth.uid());

-- Zoom Interviews
ALTER TABLE ar_zoom_interviews ENABLE ROW LEVEL SECURITY;

-- Both participants can read
CREATE POLICY "zoom_interviews_select" ON ar_zoom_interviews
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR interviewee_id = auth.uid());

-- Anyone can read public completed recordings (for profile display)
CREATE POLICY "zoom_interviews_public_select" ON ar_zoom_interviews
  FOR SELECT TO authenticated
  USING (status = 'completed' AND is_public = true);

CREATE POLICY "zoom_interviews_anon_public_select" ON ar_zoom_interviews
  FOR SELECT TO anon
  USING (status = 'completed' AND is_public = true);

-- Authenticated can request interviews
CREATE POLICY "zoom_interviews_insert" ON ar_zoom_interviews
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Both participants can update (schedule, complete, make public)
CREATE POLICY "zoom_interviews_update" ON ar_zoom_interviews
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR interviewee_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_marketplace_posts_status ON ar_marketplace_posts(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_posts_market ON ar_marketplace_posts(market);
CREATE INDEX IF NOT EXISTS idx_marketplace_posts_posting_agent ON ar_marketplace_posts(posting_agent_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_posts_created ON ar_marketplace_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_posts_deadline ON ar_marketplace_posts(decision_deadline);

CREATE INDEX IF NOT EXISTS idx_marketplace_bids_post ON ar_marketplace_bids(post_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_bids_agent ON ar_marketplace_bids(agent_id);

CREATE INDEX IF NOT EXISTS idx_endorsements_agent ON ar_endorsements(agent_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_endorser ON ar_endorsements(endorser_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_skill ON ar_endorsements(agent_id, skill);

CREATE INDEX IF NOT EXISTS idx_video_intros_agent ON ar_video_intros(agent_id);

CREATE INDEX IF NOT EXISTS idx_zoom_interviews_requester ON ar_zoom_interviews(requester_id);
CREATE INDEX IF NOT EXISTS idx_zoom_interviews_interviewee ON ar_zoom_interviews(interviewee_id);
CREATE INDEX IF NOT EXISTS idx_zoom_interviews_public ON ar_zoom_interviews(status, is_public) WHERE status = 'completed' AND is_public = true;

-- ═══════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Auto-set early_access_until to 2 hours after creation
CREATE OR REPLACE FUNCTION set_early_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.early_access_until IS NULL THEN
    NEW.early_access_until := NEW.created_at + INTERVAL '2 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marketplace_post_early_access
  BEFORE INSERT ON ar_marketplace_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_early_access();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_marketplace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marketplace_posts_updated
  BEFORE UPDATE ON ar_marketplace_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_timestamp();

CREATE TRIGGER trg_marketplace_bids_updated
  BEFORE UPDATE ON ar_marketplace_bids
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_timestamp();

-- Increment view count (called via RPC)
CREATE OR REPLACE FUNCTION increment_post_views(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ar_marketplace_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get bid count for a post
CREATE OR REPLACE FUNCTION get_bid_count(target_post_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM ar_marketplace_bids WHERE post_id = target_post_id AND status != 'withdrawn');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
