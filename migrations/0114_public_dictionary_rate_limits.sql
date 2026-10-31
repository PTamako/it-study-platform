-- Rotating salted anonymous lookup buckets. Only hashes are stored (no IPs).
-- The existing questions and all user learning records are untouched.
CREATE TABLE IF NOT EXISTS public_dictionary_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests BETWEEN 0 AND 31),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_public_dictionary_rate_limits_expires
  ON public_dictionary_rate_limits (expires_at);
