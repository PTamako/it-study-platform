-- Stage B only (UNEXECUTED). Keep 0177 reserved for independent FE #112 PR #178.
-- Purely additive: no change to old single-user progress, exams, dictionary,
-- saved vocabulary, questions, language cards or personal caches.
-- Do not merge/apply to production until all four D1/R2 full encrypted backups
-- and isolated restore verification are complete.
CREATE TABLE IF NOT EXISTS homeflow_identity_links (
  homeflow_user_id TEXT PRIMARY KEY NOT NULL,
  homeflow_household_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner','member')),
  display_name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','revoked')),
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_hf_owner
  ON homeflow_identity_links(homeflow_household_id) WHERE role='owner';
CREATE TRIGGER IF NOT EXISTS trg_study_hf_link_immutable
  BEFORE UPDATE OF homeflow_user_id,homeflow_household_id,role ON homeflow_identity_links
  BEGIN SELECT RAISE(ABORT,'immutable HomeFlow study identity'); END;
CREATE TABLE IF NOT EXISTS homeflow_oauth_pending (
  state_hash TEXT PRIMARY KEY NOT NULL,
  resume_hash TEXT NOT NULL,
  verifier_cipher TEXT NOT NULL,
  verifier_iv TEXT NOT NULL,
  code_cipher TEXT,
  code_iv TEXT,
  has_legacy_owner_proof INTEGER NOT NULL DEFAULT 0 CHECK(has_legacy_owner_proof IN (0,1)),
  origin TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','consumed','failed')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_study_hf_pending_expiry ON homeflow_oauth_pending(expires_at);
CREATE TABLE IF NOT EXISTS homeflow_identity_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  homeflow_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id),
  assertion_cipher TEXT NOT NULL,
  assertion_iv TEXT NOT NULL,
  assertion_scope TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_study_hf_session_user
  ON homeflow_identity_sessions(homeflow_user_id,expires_at);
CREATE TABLE IF NOT EXISTS homeflow_identity_audit (
  event_id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES homeflow_identity_links(homeflow_user_id),
  kind TEXT NOT NULL CHECK(kind IN ('account_linked','sso_login','sso_logout')),
  created_at INTEGER NOT NULL
);
