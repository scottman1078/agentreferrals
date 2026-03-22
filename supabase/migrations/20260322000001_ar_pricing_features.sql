-- ============================================================
-- Dynamic pricing tables: ar_features, ar_tiers, ar_tier_features
-- ============================================================

-- 1. ar_features — master feature list
CREATE TABLE IF NOT EXISTS ar_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ar_tiers — subscription tiers
CREATE TABLE IF NOT EXISTS ar_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  price_label TEXT NOT NULL DEFAULT 'Free',
  period TEXT DEFAULT '/month',
  is_recommended BOOLEAN DEFAULT FALSE,
  cta_label TEXT DEFAULT 'Get Started',
  landing_features JSONB DEFAULT '[]'::jsonb,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  stripe_price_founding_id TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ar_tier_features — junction table
CREATE TABLE IF NOT EXISTS ar_tier_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES ar_tiers(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES ar_features(id) ON DELETE CASCADE,
  value TEXT NOT NULL DEFAULT 'false',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tier_id, feature_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ar_tier_features_tier ON ar_tier_features(tier_id);
CREATE INDEX IF NOT EXISTS idx_ar_tier_features_feature ON ar_tier_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_ar_tiers_sort ON ar_tiers(sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ar_features_sort ON ar_features(sort_order) WHERE is_active = true;

-- ============================================================
-- RLS: public read, admin write
-- ============================================================

-- ar_features
ALTER TABLE ar_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_features_public_read"
  ON ar_features FOR SELECT
  USING (true);

CREATE POLICY "ar_features_admin_insert"
  ON ar_features FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

CREATE POLICY "ar_features_admin_update"
  ON ar_features FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

CREATE POLICY "ar_features_admin_delete"
  ON ar_features FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

-- ar_tiers
ALTER TABLE ar_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_tiers_public_read"
  ON ar_tiers FOR SELECT
  USING (true);

CREATE POLICY "ar_tiers_admin_insert"
  ON ar_tiers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

CREATE POLICY "ar_tiers_admin_update"
  ON ar_tiers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

CREATE POLICY "ar_tiers_admin_delete"
  ON ar_tiers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

-- ar_tier_features
ALTER TABLE ar_tier_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_tier_features_public_read"
  ON ar_tier_features FOR SELECT
  USING (true);

CREATE POLICY "ar_tier_features_admin_insert"
  ON ar_tier_features FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

CREATE POLICY "ar_tier_features_admin_update"
  ON ar_tier_features FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

CREATE POLICY "ar_tier_features_admin_delete"
  ON ar_tier_features FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ar_profiles
      WHERE ar_profiles.id = auth.uid()
      AND ar_profiles.is_admin = true
    )
  );

-- ============================================================
-- Seed: ar_features (from FEATURE_LABELS in stripe.ts)
-- ============================================================
INSERT INTO ar_features (key, label, category, sort_order) VALUES
  ('networkSize',          'Network size',              'network',      0),
  ('agentProfile',         'Agent profile',             'profile',      1),
  ('noraAiMatching',       'NORA AI matching',          'ai',           2),
  ('pipelineTracking',     'Pipeline tracking',         'pipeline',     3),
  ('smartAgreements',      'Smart agreements',          'pipeline',     4),
  ('roiAnalytics',         'ROI analytics',             'analytics',    5),
  ('crmIntegration',       'CRM integration',           'integration',  6),
  ('partnershipRequests',  'Partnership requests',      'network',      7),
  ('reviews',              'Reviews',                   'network',      8),
  ('networkDegree1',       '1-Degree Network',          'network',      9),
  ('networkDegree2',       '2-Degree Network',          'network',     10),
  ('brokerageNetwork',     'Brokerage Network',         'network',     11),
  ('allNetwork',           'Full Network View',         'network',     12),
  ('marketExclusivity',    'Market exclusivity',        'premium',     13),
  ('whiteLabelPage',       'White-label page',          'premium',     14),
  ('brokerageAdmin',       'Brokerage admin',           'premium',     15),
  ('apiAccess',            'API access',                'premium',     16),
  ('mentorBrowse',         'Browse mentors',            'mentoring',   17),
  ('mentorRequest',        'Mentor matching',           'mentoring',   18),
  ('mentorBecome',         'Become a mentor',           'mentoring',   19),
  ('commScore',            'Communication Score',       'analytics',   20),
  ('marketplaceBrowse',    'Browse marketplace',        'marketplace', 21),
  ('marketplaceBid',       'Bid on referrals',          'marketplace', 22),
  ('marketplacePost',      'Post referral opportunities','marketplace', 23),
  ('marketplaceVideoPitch','Video pitch on bids',       'marketplace', 24),
  ('invitesPerMonth',      'Invites per month',         'network',     25),
  ('support',              'Support',                   'general',     26)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Seed: ar_tiers (from PLANS in stripe.ts + landing page)
-- ============================================================
INSERT INTO ar_tiers (slug, name, description, price_cents, price_label, period, is_recommended, cta_label, landing_features, sort_order) VALUES
  (
    'starter', 'Starter', 'Get started with referral basics',
    0, 'Free forever', '/forever', false, 'Get Started Free',
    '["Browse the agent network","Basic agent profile","Up to 2 active referrals","Direct messaging","Coverage gap alerts"]'::jsonb,
    0
  ),
  (
    'growth', 'Growth', 'Scale your referral pipeline',
    2900, '$29/mo', '/month', false, 'Start Growth',
    '["Everything in Starter","Up to 10 active referrals","Referral pipeline tracking","Partnership requests","Agent reviews","Invite up to 25 agents/mo"]'::jsonb,
    1
  ),
  (
    'pro', 'Pro', 'AI-powered referral intelligence',
    5900, '$59/mo', '/month', true, 'Start Pro Trial',
    '["Everything in Growth","NORA AI matching","Unlimited referrals","Smart agreements & e-sign","ROI analytics dashboard","CRM integration","Priority in search results"]'::jsonb,
    2
  ),
  (
    'elite', 'Elite', 'Enterprise-grade referral platform',
    14900, '$149/mo', '/month', false, 'Contact Sales',
    '["Everything in Pro","Market exclusivity (limited slots)","Verified Elite badge","White-label referral page","Brokerage admin tools","API access","Dedicated success manager"]'::jsonb,
    3
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Seed: ar_tier_features (junction — from PLANS features)
-- ============================================================
-- We use a DO block to look up IDs dynamically
DO $$
DECLARE
  v_starter UUID;
  v_growth  UUID;
  v_pro     UUID;
  v_elite   UUID;
  v_feat    RECORD;
BEGIN
  SELECT id INTO v_starter FROM ar_tiers WHERE slug = 'starter';
  SELECT id INTO v_growth  FROM ar_tiers WHERE slug = 'growth';
  SELECT id INTO v_pro     FROM ar_tiers WHERE slug = 'pro';
  SELECT id INTO v_elite   FROM ar_tiers WHERE slug = 'elite';

  -- Helper: insert a feature value for each tier
  -- Format: (tier_id, feature_key, value)
  FOR v_feat IN
    SELECT * FROM (VALUES
      -- STARTER
      (v_starter, 'networkSize',          '10'),
      (v_starter, 'agentProfile',         'Basic'),
      (v_starter, 'noraAiMatching',       'false'),
      (v_starter, 'pipelineTracking',     'false'),
      (v_starter, 'smartAgreements',      'false'),
      (v_starter, 'roiAnalytics',         'false'),
      (v_starter, 'crmIntegration',       'false'),
      (v_starter, 'partnershipRequests',  'false'),
      (v_starter, 'reviews',              'false'),
      (v_starter, 'networkDegree1',       'false'),
      (v_starter, 'networkDegree2',       'false'),
      (v_starter, 'brokerageNetwork',     'false'),
      (v_starter, 'allNetwork',           'false'),
      (v_starter, 'marketExclusivity',    'false'),
      (v_starter, 'whiteLabelPage',       'false'),
      (v_starter, 'brokerageAdmin',       'false'),
      (v_starter, 'apiAccess',            'false'),
      (v_starter, 'mentorBrowse',         'false'),
      (v_starter, 'mentorRequest',        'false'),
      (v_starter, 'mentorBecome',         'false'),
      (v_starter, 'commScore',            'false'),
      (v_starter, 'marketplaceBrowse',    'true'),
      (v_starter, 'marketplacePost',      'true'),
      (v_starter, 'marketplaceBid',       'false'),
      (v_starter, 'marketplaceVideoPitch','false'),
      (v_starter, 'invitesPerMonth',      '5'),
      (v_starter, 'support',              'Community'),
      -- GROWTH
      (v_growth, 'networkSize',          '25'),
      (v_growth, 'agentProfile',         'Enhanced'),
      (v_growth, 'noraAiMatching',       'false'),
      (v_growth, 'pipelineTracking',     'true'),
      (v_growth, 'smartAgreements',      'false'),
      (v_growth, 'roiAnalytics',         'false'),
      (v_growth, 'crmIntegration',       'false'),
      (v_growth, 'partnershipRequests',  'true'),
      (v_growth, 'reviews',              'true'),
      (v_growth, 'networkDegree1',       'true'),
      (v_growth, 'networkDegree2',       'true'),
      (v_growth, 'brokerageNetwork',     'true'),
      (v_growth, 'allNetwork',           'false'),
      (v_growth, 'marketExclusivity',    'false'),
      (v_growth, 'whiteLabelPage',       'false'),
      (v_growth, 'brokerageAdmin',       'false'),
      (v_growth, 'apiAccess',            'false'),
      (v_growth, 'mentorBrowse',         'true'),
      (v_growth, 'mentorRequest',        '1'),
      (v_growth, 'mentorBecome',         'false'),
      (v_growth, 'commScore',            'true'),
      (v_growth, 'marketplaceBrowse',    'true'),
      (v_growth, 'marketplaceBid',       'true'),
      (v_growth, 'marketplacePost',      'false'),
      (v_growth, 'marketplaceVideoPitch','false'),
      (v_growth, 'invitesPerMonth',      '25'),
      (v_growth, 'support',              'Email'),
      -- PRO
      (v_pro, 'networkSize',          'Unlimited'),
      (v_pro, 'agentProfile',         'Priority'),
      (v_pro, 'noraAiMatching',       'true'),
      (v_pro, 'pipelineTracking',     'true'),
      (v_pro, 'smartAgreements',      'true'),
      (v_pro, 'roiAnalytics',         'true'),
      (v_pro, 'crmIntegration',       'true'),
      (v_pro, 'partnershipRequests',  'true'),
      (v_pro, 'reviews',              'true'),
      (v_pro, 'networkDegree1',       'true'),
      (v_pro, 'networkDegree2',       'true'),
      (v_pro, 'brokerageNetwork',     'true'),
      (v_pro, 'allNetwork',           'false'),
      (v_pro, 'marketExclusivity',    'false'),
      (v_pro, 'whiteLabelPage',       'false'),
      (v_pro, 'brokerageAdmin',       'false'),
      (v_pro, 'apiAccess',            'false'),
      (v_pro, 'mentorBrowse',         'true'),
      (v_pro, 'mentorRequest',        '2'),
      (v_pro, 'mentorBecome',         'true'),
      (v_pro, 'commScore',            'true'),
      (v_pro, 'marketplaceBrowse',    'true'),
      (v_pro, 'marketplaceBid',       'true'),
      (v_pro, 'marketplacePost',      'true'),
      (v_pro, 'marketplaceVideoPitch','true'),
      (v_pro, 'invitesPerMonth',      'Unlimited'),
      (v_pro, 'support',              'Priority'),
      -- ELITE
      (v_elite, 'networkSize',          'Unlimited'),
      (v_elite, 'agentProfile',         'Verified Elite'),
      (v_elite, 'noraAiMatching',       'true'),
      (v_elite, 'pipelineTracking',     'true'),
      (v_elite, 'smartAgreements',      'true'),
      (v_elite, 'roiAnalytics',         'true'),
      (v_elite, 'crmIntegration',       'true'),
      (v_elite, 'partnershipRequests',  'true'),
      (v_elite, 'reviews',              'true'),
      (v_elite, 'networkDegree1',       'true'),
      (v_elite, 'networkDegree2',       'true'),
      (v_elite, 'brokerageNetwork',     'true'),
      (v_elite, 'allNetwork',           'true'),
      (v_elite, 'marketExclusivity',    'true'),
      (v_elite, 'whiteLabelPage',       'true'),
      (v_elite, 'brokerageAdmin',       'true'),
      (v_elite, 'apiAccess',            'true'),
      (v_elite, 'mentorBrowse',         'true'),
      (v_elite, 'mentorRequest',        '3'),
      (v_elite, 'mentorBecome',         'true'),
      (v_elite, 'commScore',            'true'),
      (v_elite, 'marketplaceBrowse',    'true'),
      (v_elite, 'marketplaceBid',       'true'),
      (v_elite, 'marketplacePost',      'true'),
      (v_elite, 'marketplaceVideoPitch','true'),
      (v_elite, 'invitesPerMonth',      'Unlimited'),
      (v_elite, 'support',              'Dedicated CSM')
    ) AS t(tid, fkey, fval)
  LOOP
    INSERT INTO ar_tier_features (tier_id, feature_id, value)
    SELECT v_feat.tid, f.id, v_feat.fval
    FROM ar_features f
    WHERE f.key = v_feat.fkey
    ON CONFLICT (tier_id, feature_id) DO NOTHING;
  END LOOP;
END $$;
