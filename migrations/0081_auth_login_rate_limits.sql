-- Durable per-client login throttling for the free single-user authentication flow.
CREATE TABLE IF NOT EXISTS auth_login_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0 CHECK (failures BETWEEN 0 AND 1000),
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_login_rate_limits_expiry
  ON auth_login_rate_limits(expires_at);

-- Separate durable limiter for authenticated state-changing API calls.
CREATE TABLE IF NOT EXISTS auth_write_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests BETWEEN 0 AND 10000),
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_write_rate_limits_expiry
  ON auth_write_rate_limits(expires_at);
