-- Phase 1: In-app messaging / support system
-- Tables: ar_conversations, ar_chat_messages, ar_announcements

-- ============================================================
-- 1. ar_conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS ar_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES ar_profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES ar_profiles(id) ON DELETE SET NULL,
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'snoozed', 'waiting')),
  channel TEXT DEFAULT 'chat' CHECK (channel IN ('chat', 'email', 'bug')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ar_conversations_user_id ON ar_conversations(user_id);
CREATE INDEX idx_ar_conversations_status ON ar_conversations(status);
CREATE INDEX idx_ar_conversations_created_at ON ar_conversations(created_at DESC);

-- ============================================================
-- 2. ar_chat_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS ar_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ar_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES ar_profiles(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin', 'bot')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ar_chat_messages_conversation_id ON ar_chat_messages(conversation_id);
CREATE INDEX idx_ar_chat_messages_created_at ON ar_chat_messages(created_at);

-- ============================================================
-- 3. ar_announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS ar_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'banner' CHECK (type IN ('banner', 'modal', 'tooltip')),
  target_tier TEXT[],
  target_page TEXT,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE ar_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_announcements ENABLE ROW LEVEL SECURITY;

-- ar_conversations: users read own, admins read all
CREATE POLICY "Users can read own conversations"
  ON ar_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all conversations"
  ON ar_conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM ar_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can create conversations"
  ON ar_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update conversations"
  ON ar_conversations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM ar_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ar_chat_messages: users read messages in their conversations, admins read all
CREATE POLICY "Users can read messages in own conversations"
  ON ar_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ar_conversations
      WHERE ar_conversations.id = ar_chat_messages.conversation_id
        AND ar_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all messages"
  ON ar_chat_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM ar_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON ar_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ar_conversations
      WHERE ar_conversations.id = ar_chat_messages.conversation_id
        AND ar_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert messages"
  ON ar_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM ar_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ar_announcements: public read, admin write
CREATE POLICY "Anyone can read active announcements"
  ON ar_announcements FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage announcements"
  ON ar_announcements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM ar_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow service role full access (for API routes using admin client)
CREATE POLICY "Service role full access conversations"
  ON ar_conversations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access messages"
  ON ar_chat_messages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access announcements"
  ON ar_announcements FOR ALL
  USING (auth.role() = 'service_role');
