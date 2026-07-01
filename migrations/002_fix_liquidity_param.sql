-- migrations/002_fix_liquidity_param.sql
--
-- Issue #71: Eliminate abrupt price jumps from undersized liquidity parameter b
--
-- BACKGROUND
-- ----------
-- The LSMR engine uses a liquidity parameter b that controls price sensitivity.
-- The mapping between the DB column and b is:
--
--   b = liquidity_param_smallest_unit / 100
--
-- (see: api/handlers/market_handlers.go OpenMarket — divides by 100.0)
--
-- MVP rule of thumb:  b = initial_liquidity / 100
-- Minimum safe value: liquidity_param_smallest_unit >= 10,000 cents (b >= 100)
--
-- With b < 100, a single KES 500 trade can move the price by >10%.
--
-- LIQUIDITY TIERS (for admin guidance)
-- -------------------------------------
--   Small  market:  50,000 –   200,000 cents (KES   500 – 2,000)   b = 500 – 2,000
--   Medium market: 500,000 – 2,000,000 cents (KES 5,000 – 20,000)  b = 5,000 – 20,000
--   Large  market: 5,000,000+             cents (KES 50,000+)       b = 50,000+
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- 1. Audits all markets and logs their liquidity tier.
-- 2. Corrects ALL markets (PENDING + OPEN) with liquidity_param_smallest_unit < 10,000
--    by setting them to the small-market minimum of 50,000 cents (b = 500).
--    NOTE: For OPEN markets the in-memory AMM retains the old b until server restart
--    or explicit registry reload. A WARN is emitted listing affected market IDs.
-- 3. Tightens the DB CHECK constraint from > 0 to >= 10,000.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Audit — show current state of all markets
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '=== liquidity_param audit (issue #71) ===';
    FOR r IN
        SELECT
            id,
            status,
            liquidity_param_smallest_unit,
            ROUND(liquidity_param_smallest_unit / 100.0, 2) AS b_value,
            CASE
                WHEN liquidity_param_smallest_unit < 10000   THEN 'CRITICAL  (<b=100)  – price jumps >10% on KES 500 trade'
                WHEN liquidity_param_smallest_unit < 50000   THEN 'LOW       (b<500)   – suitable only for tiny test markets'
                WHEN liquidity_param_smallest_unit < 500000  THEN 'SMALL     (b<5000)  – small community markets'
                WHEN liquidity_param_smallest_unit < 5000000 THEN 'MEDIUM    (b<50000) – good for standard markets'
                ELSE                                              'LARGE     (b>=50000)– suitable for high-volume markets'
            END AS tier
        FROM markets
        ORDER BY liquidity_param_smallest_unit ASC
    LOOP
        RAISE NOTICE '  id=% status=% param=% b=% tier=%',
            r.id, r.status, r.liquidity_param_smallest_unit, r.b_value, r.tier;
    END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Correct ALL markets with dangerously low b
--         Set to small-market minimum: 50,000 cents (b = 500)
-- ─────────────────────────────────────────────────────────────

-- Capture affected IDs before update for the warning below
CREATE TEMP TABLE _affected_markets AS
    SELECT id, status, liquidity_param_smallest_unit AS old_param
    FROM markets
    WHERE liquidity_param_smallest_unit < 10000;

UPDATE markets
SET
    liquidity_param_smallest_unit = 50000,  -- 50,000 cents = b 500
    updated_at = NOW()
WHERE liquidity_param_smallest_unit < 10000;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: Warn about OPEN markets that need an AMM reload
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
    r RECORD;
    open_count INTEGER := 0;
BEGIN
    FOR r IN
        SELECT id, old_param FROM _affected_markets WHERE status = 'OPEN'
    LOOP
        open_count := open_count + 1;
        RAISE WARNING
            'OPEN market % had liquidity_param=% (b=%). '
            'DB has been corrected to 50000 (b=500). '
            'ACTION REQUIRED: restart the API server (or call registry reload) '
            'so the in-memory AMM picks up the new b value.',
            r.id, r.old_param, ROUND(r.old_param / 100.0, 2);
    END LOOP;

    IF open_count = 0 THEN
        RAISE NOTICE 'No OPEN markets were affected.';
    ELSE
        RAISE WARNING '% OPEN market(s) corrected in DB. Server restart required.', open_count;
    END IF;
END $$;

DROP TABLE _affected_markets;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Tighten CHECK constraint – enforce minimum going forward
-- ─────────────────────────────────────────────────────────────
ALTER TABLE markets
    DROP CONSTRAINT IF EXISTS markets_liquidity_positive,
    ADD CONSTRAINT markets_liquidity_minimum
        CHECK (liquidity_param_smallest_unit >= 10000);

COMMENT ON CONSTRAINT markets_liquidity_minimum ON markets IS
    'Issue #71: minimum 10,000 cents so that b >= 100. '
    'With b=100 a KES 500 trade on a 50/50 market moves price by ~0.25%. '
    'Recommended tiers: 50k-200k (small), 500k-2M (medium), 5M+ (large).';

-- ─────────────────────────────────────────────────────────────
-- STEP 5: Record migration
-- ─────────────────────────────────────────────────────────────
INSERT INTO schema_version (version, description)
VALUES (2, 'Issue #71: enforce minimum liquidity_param >= 10000 cents (b >= 100) to prevent abrupt price jumps');

COMMIT;
