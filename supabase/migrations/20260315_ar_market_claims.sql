-- Market definitions (pre-populated with US counties)
CREATE TABLE IF NOT EXISTS ar_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_name TEXT NOT NULL,
  state_code TEXT NOT NULL, -- 2-letter state code
  state_name TEXT NOT NULL,
  metro_area TEXT, -- e.g., "Nashville Metro", "Grand Rapids Metro"
  fips_code TEXT UNIQUE, -- Federal county code
  population INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'suburban' CHECK (tier IN ('rural', 'suburban', 'urban', 'major_metro')),
  monthly_price INTEGER DEFAULT 29, -- price in dollars
  max_verified_agents INTEGER DEFAULT 5,
  current_verified_count INTEGER DEFAULT 0,
  center_lat NUMERIC(10,6),
  center_lng NUMERIC(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent market claims
CREATE TABLE IF NOT EXISTS ar_market_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ar_profiles(id),
  market_id UUID NOT NULL REFERENCES ar_markets(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  monthly_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, market_id)
);

CREATE INDEX idx_ar_market_claims_agent ON ar_market_claims(agent_id);
CREATE INDEX idx_ar_market_claims_market ON ar_market_claims(market_id);
CREATE INDEX idx_ar_markets_state ON ar_markets(state_code);
CREATE INDEX idx_ar_markets_metro ON ar_markets(metro_area);

ALTER TABLE ar_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_market_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Markets are viewable by all" ON ar_markets FOR SELECT USING (true);
CREATE POLICY "Claims are viewable by all" ON ar_market_claims FOR SELECT USING (true);
CREATE POLICY "Users can create own claims" ON ar_market_claims FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());
