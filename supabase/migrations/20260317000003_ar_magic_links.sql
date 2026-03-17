-- Custom magic link tokens for branded Postmark-based auth
CREATE TABLE IF NOT EXISTS ar_magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_magic_links_token ON ar_magic_links (token) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_ar_magic_links_email ON ar_magic_links (email);
