-- Historical migration identifier retained for Wrangler tracking.
-- Production progress must never be removed by automatic deployments.
-- This migration is intentionally a no-op for databases that have not applied it.
-- The former one-time reset is archived at scripts/manual-launch-reset.sql.
SELECT 1 AS preserve_existing_learning_history;
