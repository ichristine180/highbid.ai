-- Add is_active and expires_at columns to api_tokens table
ALTER TABLE api_tokens
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create index for active tokens
CREATE INDEX IF NOT EXISTS idx_api_tokens_is_active ON api_tokens(is_active);

-- Add comments
COMMENT ON COLUMN api_tokens.is_active IS 'Whether the token is currently active and can be used';
COMMENT ON COLUMN api_tokens.expires_at IS 'Optional expiration date for the token';
