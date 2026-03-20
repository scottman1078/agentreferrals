-- ═══ Referral Expectations System ═══
-- Enables agents to define what they expect/commit to during referral transactions.
-- Expectation items act as notification trigger definitions.

-- 1. Master list of expectation items (admin-managed)
CREATE TABLE IF NOT EXISTS ar_expectation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('buyer', 'seller', 'general')),
  event_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('stage_change', 'activity', 'time_based')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  notification_template JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ar_expectation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_expectation_items_public_read"
  ON ar_expectation_items FOR SELECT USING (true);

CREATE POLICY "ar_expectation_items_admin_insert"
  ON ar_expectation_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM ar_profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "ar_expectation_items_admin_update"
  ON ar_expectation_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM ar_profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "ar_expectation_items_admin_delete"
  ON ar_expectation_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM ar_profiles WHERE id = auth.uid() AND is_admin = true));

-- 2. Agent's selected expectations (what they expect when sending / commit to when receiving)
CREATE TABLE IF NOT EXISTS ar_profile_expectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ar_profiles(id) ON DELETE CASCADE,
  expectation_id UUID NOT NULL REFERENCES ar_expectation_items(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('send', 'receive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, expectation_id, side)
);

ALTER TABLE ar_profile_expectations ENABLE ROW LEVEL SECURITY;

-- Anyone can read (shown on public profiles)
CREATE POLICY "ar_profile_expectations_public_read"
  ON ar_profile_expectations FOR SELECT USING (true);

-- Agents can manage their own
CREATE POLICY "ar_profile_expectations_own_insert"
  ON ar_profile_expectations FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "ar_profile_expectations_own_delete"
  ON ar_profile_expectations FOR DELETE
  USING (agent_id = auth.uid());

CREATE INDEX idx_ar_profile_expectations_agent ON ar_profile_expectations(agent_id);

-- 3. Activity log per referral (receiving agent logs updates)
CREATE TABLE IF NOT EXISTS ar_referral_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES ar_referrals(id) ON DELETE CASCADE,
  logged_by UUID NOT NULL REFERENCES ar_profiles(id),
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ar_referral_activities ENABLE ROW LEVEL SECURITY;

-- Visible to both agents on the referral
CREATE POLICY "ar_referral_activities_referral_read"
  ON ar_referral_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ar_referrals
      WHERE ar_referrals.id = referral_id
      AND (ar_referrals.from_agent_id = auth.uid() OR ar_referrals.to_agent_id = auth.uid())
    )
  );

CREATE POLICY "ar_referral_activities_own_insert"
  ON ar_referral_activities FOR INSERT
  WITH CHECK (logged_by = auth.uid());

CREATE INDEX idx_ar_referral_activities_referral ON ar_referral_activities(referral_id);

-- 4. Notification audit log
CREATE TABLE IF NOT EXISTS ar_referral_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES ar_referrals(id) ON DELETE CASCADE,
  expectation_id UUID REFERENCES ar_expectation_items(id) ON DELETE SET NULL,
  sent_to UUID NOT NULL REFERENCES ar_profiles(id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app', 'both')),
  subject TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ar_referral_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_referral_notifications_own_read"
  ON ar_referral_notifications FOR SELECT
  USING (sent_to = auth.uid());

CREATE INDEX idx_ar_referral_notifications_referral ON ar_referral_notifications(referral_id);

-- 5. Add preferred update method + response time to profiles
ALTER TABLE ar_profiles
  ADD COLUMN IF NOT EXISTS referral_update_method TEXT DEFAULT 'email' CHECK (referral_update_method IN ('email', 'text', 'phone', 'in_app')),
  ADD COLUMN IF NOT EXISTS referral_response_time TEXT DEFAULT '24hrs' CHECK (referral_response_time IN ('same_day', '24hrs', '48hrs'));

-- ═══ Seed expectation items ═══

-- BUYER expectations
INSERT INTO ar_expectation_items (category, event_key, label, description, sort_order, trigger_type, trigger_config, notification_template) VALUES
('buyer', 'buyer.first_contact', 'Contact client within 24 hours', 'Receiving agent will reach out to the referred client within 24 hours of receiving the referral.', 0, 'time_based',
  '{"hours_after_referral": 24}'::jsonb,
  '{"subject": "Referral Update: First Contact", "body": "{{receiving_agent}} has made first contact with {{client_name}}."}'::jsonb),

('buyer', 'buyer.preapproval_status', 'Confirm pre-approval status', 'Update on whether the client is pre-approved and with which lender.', 1, 'activity',
  '{"activity_type": "preapproval_status"}'::jsonb,
  '{"subject": "Referral Update: Pre-Approval Status", "body": "{{receiving_agent}} has provided a pre-approval status update for {{client_name}}."}'::jsonb),

('buyer', 'buyer.showing_feedback', 'Showing feedback after each showing', 'Provide feedback and notes after property showings.', 2, 'activity',
  '{"activity_type": "showing_feedback"}'::jsonb,
  '{"subject": "Referral Update: Showing Feedback", "body": "{{receiving_agent}} has logged showing feedback for {{client_name}}."}'::jsonb),

('buyer', 'buyer.weekly_updates', 'Weekly status updates', 'Provide a status update at least once per week on referral progress.', 3, 'time_based',
  '{"days_without_update": 7}'::jsonb,
  '{"subject": "Referral Update: Weekly Status", "body": "{{receiving_agent}} has provided a weekly update on {{client_name}}."}'::jsonb),

('buyer', 'buyer.offer_submitted', 'Notify when offer is submitted', 'Notification when an offer has been submitted on behalf of the client.', 4, 'activity',
  '{"activity_type": "offer_submitted"}'::jsonb,
  '{"subject": "Referral Update: Offer Submitted", "body": "{{receiving_agent}} has submitted an offer for {{client_name}}."}'::jsonb),

('buyer', 'buyer.under_contract', 'Notify when under contract', 'Notification when the client goes under contract.', 5, 'stage_change',
  '{"stage": "under_contract"}'::jsonb,
  '{"subject": "Referral Update: Under Contract!", "body": "Great news! {{client_name}} is now under contract."}'::jsonb),

('buyer', 'buyer.inspection_results', 'Share inspection results', 'Provide a summary of property inspection findings.', 6, 'activity',
  '{"activity_type": "inspection_results"}'::jsonb,
  '{"subject": "Referral Update: Inspection Results", "body": "{{receiving_agent}} has shared inspection results for {{client_name}}."}'::jsonb),

('buyer', 'buyer.closing_updates', 'Closing coordination updates', 'Updates on closing timeline, documents, and coordination.', 7, 'stage_change',
  '{"stage": "closed_fee_pending"}'::jsonb,
  '{"subject": "Referral Update: Closing!", "body": "{{client_name}} has closed! Fee payment is pending."}'::jsonb),

('buyer', 'buyer.post_close', 'Post-close confirmation & fee timeline', 'Confirmation of closing and expected timeline for referral fee payment.', 8, 'stage_change',
  '{"stage": "fee_received"}'::jsonb,
  '{"subject": "Referral Complete: Fee Received", "body": "Your referral fee for {{client_name}} has been processed."}'::jsonb)
ON CONFLICT (event_key) DO NOTHING;

-- SELLER expectations
INSERT INTO ar_expectation_items (category, event_key, label, description, sort_order, trigger_type, trigger_config, notification_template) VALUES
('seller', 'seller.first_contact', 'Contact client within 24 hours', 'Receiving agent will reach out to the referred seller within 24 hours.', 0, 'time_based',
  '{"hours_after_referral": 24}'::jsonb,
  '{"subject": "Referral Update: First Contact", "body": "{{receiving_agent}} has made first contact with {{client_name}}."}'::jsonb),

('seller', 'seller.cma_shared', 'Share CMA / market analysis', 'Provide a comparative market analysis to the client and referring agent.', 1, 'activity',
  '{"activity_type": "cma_shared"}'::jsonb,
  '{"subject": "Referral Update: CMA Shared", "body": "{{receiving_agent}} has shared a CMA for {{client_name}}''s property."}'::jsonb),

('seller', 'seller.marketing_plan', 'Share listing marketing plan', 'Outline the marketing strategy for the listing.', 2, 'activity',
  '{"activity_type": "marketing_plan"}'::jsonb,
  '{"subject": "Referral Update: Marketing Plan", "body": "{{receiving_agent}} has shared the marketing plan for {{client_name}}''s listing."}'::jsonb),

('seller', 'seller.showing_feedback', 'Showing feedback summaries', 'Summarize buyer feedback after showings.', 3, 'activity',
  '{"activity_type": "seller_showing_feedback"}'::jsonb,
  '{"subject": "Referral Update: Showing Feedback", "body": "{{receiving_agent}} has shared showing feedback for {{client_name}}''s listing."}'::jsonb),

('seller', 'seller.offer_received', 'Notify of all offers received', 'Notification when offers come in on the listing.', 4, 'activity',
  '{"activity_type": "offer_received"}'::jsonb,
  '{"subject": "Referral Update: Offer Received!", "body": "An offer has been received on {{client_name}}''s listing."}'::jsonb),

('seller', 'seller.price_adjustment', 'Price adjustment discussions', 'Communicate any recommended or actual price changes.', 5, 'activity',
  '{"activity_type": "price_adjustment"}'::jsonb,
  '{"subject": "Referral Update: Price Adjustment", "body": "{{receiving_agent}} has provided a price adjustment update for {{client_name}}''s listing."}'::jsonb),

('seller', 'seller.under_contract', 'Under contract notification', 'Notification when the listing goes under contract.', 6, 'stage_change',
  '{"stage": "under_contract"}'::jsonb,
  '{"subject": "Referral Update: Under Contract!", "body": "Great news! {{client_name}}''s listing is now under contract."}'::jsonb),

('seller', 'seller.closing_updates', 'Closing coordination updates', 'Updates on closing timeline and coordination.', 7, 'stage_change',
  '{"stage": "closed_fee_pending"}'::jsonb,
  '{"subject": "Referral Update: Closing!", "body": "{{client_name}}''s listing has closed! Fee payment is pending."}'::jsonb),

('seller', 'seller.post_close', 'Post-close confirmation & fee timeline', 'Confirmation of closing and expected timeline for referral fee payment.', 8, 'stage_change',
  '{"stage": "fee_received"}'::jsonb,
  '{"subject": "Referral Complete: Fee Received", "body": "Your referral fee for {{client_name}} has been processed."}'::jsonb)
ON CONFLICT (event_key) DO NOTHING;

-- GENERAL expectations
INSERT INTO ar_expectation_items (category, event_key, label, description, sort_order, trigger_type, trigger_config, notification_template) VALUES
('general', 'general.agreement_executed', 'Notify when agreement is signed', 'Notification when the referral agreement has been fully executed.', 0, 'stage_change',
  '{"stage": "agreement_executed"}'::jsonb,
  '{"subject": "Referral Agreement Signed", "body": "The referral agreement for {{client_name}} has been fully executed by {{receiving_agent}}."}'::jsonb),

('general', 'general.client_introduced', 'Confirm client introduction', 'Confirmation that the receiving agent has been introduced to / connected with the client.', 1, 'stage_change',
  '{"stage": "client_introduced"}'::jsonb,
  '{"subject": "Client Introduction Confirmed", "body": "{{receiving_agent}} confirms they have connected with {{client_name}}."}'::jsonb)
ON CONFLICT (event_key) DO NOTHING;
