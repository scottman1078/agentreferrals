-- ═══════════════════════════════════════════════════════════════
-- AgentReferrals.ai — Foundation Schema
-- Prefix: ar_*
-- Project: crtmgxqszenhmbhnvsoi
-- ═══════════════════════════════════════════════════════════════

-- ─── BROKERAGES (create first — profiles references this) ────
CREATE TABLE IF NOT EXISTS ar_brokerages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  logo_emoji TEXT DEFAULT 'B',
  color TEXT DEFAULT '#f59e0b',
  description TEXT,
  member_count INTEGER DEFAULT 0,
  markets_served INTEGER DEFAULT 0,
  website TEXT,
  admin_user_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROFILES (extends Supabase auth.users) ───────────────────
CREATE TABLE IF NOT EXISTS ar_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  brokerage_id UUID REFERENCES ar_brokerages(id),
  primary_area TEXT,
  bio TEXT,
  tags TEXT[] DEFAULT '{}',
  deals_per_year INTEGER DEFAULT 0,
  years_licensed INTEGER DEFAULT 0,
  avg_sale_price NUMERIC(12,2) DEFAULT 0,
  refernet_score INTEGER DEFAULT 50,
  response_time_minutes INTEGER,
  closed_referrals INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive', 'suspended')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'elite')),
  polygon JSONB, -- GeoJSON polygon for territory
  color TEXT DEFAULT '#f59e0b',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REFERRALS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  from_agent_id UUID NOT NULL REFERENCES ar_profiles(id),
  to_agent_id UUID REFERENCES ar_profiles(id),
  market TEXT,
  fee_percent NUMERIC(5,2) DEFAULT 25.00,
  estimated_price NUMERIC(14,2),
  est_close_date DATE,
  actual_close_date DATE,
  stage TEXT DEFAULT 'agreement_sent' CHECK (stage IN (
    'agreement_sent', 'agreement_executed', 'client_introduced',
    'under_contract', 'closed_fee_pending', 'fee_received', 'expired', 'cancelled'
  )),
  notes TEXT,
  platform_fee_percent NUMERIC(5,2) DEFAULT 5.00,
  platform_fee_amount NUMERIC(10,2),
  referral_fee_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REFERRAL AGREEMENTS (documents) ─────────────────────────
CREATE TABLE IF NOT EXISTS ar_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES ar_referrals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'executed', 'expired', 'cancelled')),
  from_agent_id UUID NOT NULL REFERENCES ar_profiles(id),
  to_agent_id UUID REFERENCES ar_profiles(id),
  client_name TEXT,
  market TEXT,
  estimated_price NUMERIC(14,2),
  referral_fee TEXT DEFAULT '25%',
  expiration_date DATE,
  signed_by_from BOOLEAN DEFAULT FALSE,
  signed_by_to BOOLEAN DEFAULT FALSE,
  signed_at_from TIMESTAMPTZ,
  signed_at_to TIMESTAMPTZ,
  document_url TEXT, -- PDF storage path
  terms JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INVITES (agent-to-agent platform invitations) ───────────
CREATE TABLE IF NOT EXISTS ar_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES ar_profiles(id),
  invitee_name TEXT,
  invitee_email TEXT NOT NULL,
  invitee_phone TEXT,
  invitee_brokerage TEXT,
  invitee_market TEXT,
  method TEXT DEFAULT 'email' CHECK (method IN ('email', 'sms', 'link')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'opened', 'signed_up', 'active', 'expired')),
  referral_code TEXT,
  message TEXT, -- personal note
  opened_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  signed_up_user_id UUID REFERENCES ar_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COVERAGE GAPS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_coverage_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  migration_status TEXT, -- 'High Inflow', null, etc.
  polygon JSONB, -- GeoJSON for void zone
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES ar_profiles(id),
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES ar_profiles(id),
  brokerage_id UUID REFERENCES ar_brokerages(id), -- null = global
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NORA CONVERSATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_nora_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ar_profiles(id),
  messages JSONB DEFAULT '[]',
  matched_agents UUID[] DEFAULT '{}',
  resulted_in_referral UUID REFERENCES ar_referrals(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AGENT REVIEWS (two-way after referral closes) ───────────
CREATE TABLE IF NOT EXISTS ar_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES ar_referrals(id),
  reviewer_id UUID NOT NULL REFERENCES ar_profiles(id),
  reviewee_id UUID NOT NULL REFERENCES ar_profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  client_care_rating INTEGER CHECK (client_care_rating >= 1 AND client_care_rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MESSAGES (agent-to-agent direct messaging) ──────────────
CREATE TABLE IF NOT EXISTS ar_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES ar_profiles(id),
  to_user_id UUID NOT NULL REFERENCES ar_profiles(id),
  referral_id UUID REFERENCES ar_referrals(id), -- optional: tied to a referral
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_ar_profiles_brokerage ON ar_profiles(brokerage_id);
CREATE INDEX IF NOT EXISTS idx_ar_profiles_status ON ar_profiles(status);
CREATE INDEX IF NOT EXISTS idx_ar_profiles_referral_code ON ar_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_ar_referrals_from_agent ON ar_referrals(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_ar_referrals_to_agent ON ar_referrals(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_ar_referrals_stage ON ar_referrals(stage);
CREATE INDEX IF NOT EXISTS idx_ar_agreements_referral ON ar_agreements(referral_id);
CREATE INDEX IF NOT EXISTS idx_ar_agreements_status ON ar_agreements(status);
CREATE INDEX IF NOT EXISTS idx_ar_invites_invited_by ON ar_invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_ar_invites_email ON ar_invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_ar_invites_status ON ar_invites(status);
CREATE INDEX IF NOT EXISTS idx_ar_reviews_referral ON ar_reviews(referral_id);
CREATE INDEX IF NOT EXISTS idx_ar_reviews_reviewee ON ar_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_ar_messages_to ON ar_messages(to_user_id, read);
CREATE INDEX IF NOT EXISTS idx_ar_messages_referral ON ar_messages(referral_id);
CREATE INDEX IF NOT EXISTS idx_ar_coverage_gaps_priority ON ar_coverage_gaps(priority, resolved);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE ar_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_brokerages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_coverage_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_nora_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update their own
CREATE POLICY "Profiles are viewable by all authenticated users"
  ON ar_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON ar_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON ar_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Brokerages: readable by all authenticated
CREATE POLICY "Brokerages are viewable by all authenticated users"
  ON ar_brokerages FOR SELECT TO authenticated USING (true);

-- Referrals: visible to from/to agents
CREATE POLICY "Users can see their referrals"
  ON ar_referrals FOR SELECT TO authenticated
  USING (from_agent_id = auth.uid() OR to_agent_id = auth.uid());
CREATE POLICY "Users can create referrals"
  ON ar_referrals FOR INSERT TO authenticated
  WITH CHECK (from_agent_id = auth.uid());
CREATE POLICY "Participants can update referrals"
  ON ar_referrals FOR UPDATE TO authenticated
  USING (from_agent_id = auth.uid() OR to_agent_id = auth.uid());

-- Agreements: visible to from/to agents
CREATE POLICY "Users can see their agreements"
  ON ar_agreements FOR SELECT TO authenticated
  USING (from_agent_id = auth.uid() OR to_agent_id = auth.uid());
CREATE POLICY "Users can create agreements"
  ON ar_agreements FOR INSERT TO authenticated
  WITH CHECK (from_agent_id = auth.uid());
CREATE POLICY "Participants can update agreements"
  ON ar_agreements FOR UPDATE TO authenticated
  USING (from_agent_id = auth.uid() OR to_agent_id = auth.uid());

-- Invites: users can see invites they sent
CREATE POLICY "Users can see their invites"
  ON ar_invites FOR SELECT TO authenticated
  USING (invited_by = auth.uid());
CREATE POLICY "Users can create invites"
  ON ar_invites FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid());

-- Coverage gaps: readable by all authenticated
CREATE POLICY "Coverage gaps are viewable by all"
  ON ar_coverage_gaps FOR SELECT TO authenticated USING (true);

-- NORA conversations: own only
CREATE POLICY "Users can see their NORA conversations"
  ON ar_nora_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can create NORA conversations"
  ON ar_nora_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Reviews: readable by all, writable by reviewer
CREATE POLICY "Reviews are viewable by all authenticated"
  ON ar_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create reviews"
  ON ar_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- Messages: visible to sender/receiver
CREATE POLICY "Users can see their messages"
  ON ar_messages FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "Users can send messages"
  ON ar_messages FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "Recipients can update messages (mark read)"
  ON ar_messages FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_ar_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ar_profiles (id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'AR-' || UPPER(LEFT(MD5(NEW.id::text), 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_ar_auth_user_created ON auth.users;
CREATE TRIGGER on_ar_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_ar_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION ar_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ar_profiles_updated_at BEFORE UPDATE ON ar_profiles FOR EACH ROW EXECUTE FUNCTION ar_update_timestamp();
CREATE TRIGGER ar_referrals_updated_at BEFORE UPDATE ON ar_referrals FOR EACH ROW EXECUTE FUNCTION ar_update_timestamp();
CREATE TRIGGER ar_agreements_updated_at BEFORE UPDATE ON ar_agreements FOR EACH ROW EXECUTE FUNCTION ar_update_timestamp();
CREATE TRIGGER ar_nora_updated_at BEFORE UPDATE ON ar_nora_conversations FOR EACH ROW EXECUTE FUNCTION ar_update_timestamp();
