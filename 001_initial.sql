-- security model
-- - rls enabled on all tables
-- - Users can only see their trades and positions
-- - Markets are public read, admin only write
-- - Balances are private to each user

-- Indexes:
-- - optimized for heavy read workload (prices queries, position lookups)
-- - covering indexes for common query patterns

-- Constratints:
-- - FK with cascade delete where appropriate
-- - Chck constratints for financial invariants
-- - Unique constratints on business keys


-- enable uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto for pass hash
CREATE EXTENSION OF NOT EXISTS "pgcrypto";

-- utc stime
SET timezone = 'UTC';

--- ENUMS
CREATE TYPE market_status AS ENUM ('PENDING', 'OPEN', 'CLOSED', 'RESOLVED');
CREATE TYPE outcome_type AS ENUM ('YES', 'NO');
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

-- users
-- stors acc with auth creds and metadata
--
-- security:
-- default role is user; only admin can create othe admins
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4()

    email VARCHAR(255) NOT NULL UNIQUE,
    passward_hash VARCHAR(255) NOT NUL,
    usernmae VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPZ NOT NULL DEFAULT NOW(),
    updates_st TIMESTAMPZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPZ,

    CONSTRAINTS user_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRATINT users_username_length CHECK (char_length(username) >= 3)
);

CREATE INDEX id_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role) WHERE role = 'ADMIN';

COMMENT ON TABLE users IS 'User accounts with authentication and profile data';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash of user password (never store plaintext)';
COMMENT ON COLUMN users.is_active IS 'Account active flag; inactive users cannot login';

-- balances
-- tracks play money balcnes for each user
--
-- INVARIANTS:
-- - Balance mus never go negative
-- - All balance changes must be audites (balance_transactions table)
-- - PrecisionL 10 decimal places (same as lsmr)

-- new users are given 5000 KES on sign up, handled by a trigger
CREATE TABLE balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- balance stored as int (representing smallest unit: 0.000 000 000 000 000 001 KES)
    -- avoids float issues
    -- to get actual KES: balance_smallest_unit /10^18
    balance_smallest_unit BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPZ NOT NULL DEFAULT NOW(),
    updates_at TIMESTAMPZ NOT NULL DEFAULT NOW(),

    CONSTRAINT balances_non_negative CHECK (balance_smallest_unit >= 0)
);

CREATE INDEX idx_balances_user_id ON balances(user_id);

COMMENT ON TABLE balances IS 'User play-money balances (integer representation for precision)';
COMMENT ON COLUMN balances.balance_smallest_unit IS 'Balance in smallest unit (10^-18 KES). Divide by 10^18 to get KES.';

-- Markets
-- stors prediction market metadata adn state
--
-- transactions enforeced by app layer and triggers
--
-- constraints
-- - closes at must be in the future
-- - liquidity_param must be positive
-- - question len 5-500 chars
CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    question TEXT NOT NULL,
    descrition TEXT,

    status market_status NOt NULL  DEFAULT 'PENDING',

    liquidity_param_smallest_unit BIGINT NOT NULL,

    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPZ NOT NULL DEFAULT NOW(),
    closes_at TIMESTAMPZ NOT NULL,

    resolved_outcome outcome_type,
    resolved_by UUID REFERENCES users(id) ON DELETE RESTRICT.
    resolved_at TIMESTAMPZ NOT NULL,

    updates_at TIMESTAMPZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT markets_question_length CHECK (char_length(question) BETWEEN 5 AND 500),
    CONSTRAINT markets_liquidity_positive CHECK (liquidity_param_smallest_unit > 0),
    CONSTRAINT markets_closes_at_future CHECK (closes_at > created_at),
    CONSTRAINT markets_resolution_complete CHECK (
        (status = 'RESOLVED' AND resolved_outcome IS NOT NULL AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
        OR
        (status != 'RESOLVED' AND resolved_outcome IS NULL AND resolved_by IS NULL AND resolved_at IS NULL)
    )
);


CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_created_by ON markets(created_by);
CREATE INDEX idx_markets_closes_at ON markets(closes_at) WHERE status IN ('PENDING', 'OPEN');
CREATE INDEX idx_markets_created_at ON markets(created_at DESC);

COMMENT ON TABLE markets IS 'Binary prediction markets with LSMR pricing';
COMMENT ON COLUMN markets.liquidity_param_smallest_unit IS 'LSMR b parameter in smallest unit';

-- trades
-- append only ledger
--
-- records are never updates after insertion
-- no deleter permissions
-- is audit trail

-- atomic
-- each trade is wrapped inside a transaction with
-- balance debit, position update adn market state update
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    outcome outcome_type NOT NULL,
    shares_bought_smallest_unit BIGINT NOT NULL,
    cost_paid_smallest_unit BIGINT NOT NULL,

    yes_price_before NUMERIC(8, 6) NOT NULL,
    yes_price_after NUMERIC(8, 6) NOT NULL,
    no_price_before NUMERIC(8, 6) NOT NULL,
    no_price_after NUMERIC(8, 6) NOT NULL,

    creates_at TIMESTAMPZ NOT NULL DEFAULT NOW(),
    -- Constraints
    CONSTRAINT trades_shares_positive CHECK (shares_bought_smallest_unit > 0),
    CONSTRAINT trades_cost_positive CHECK (cost_paid_smallest_unit > 0),
    CONSTRAINT trades_prices_range CHECK (
        yes_price_before BETWEEN 0 AND 100 AND
        yes_price_after BETWEEN 0 AND 100 AND
        no_price_before BETWEEN 0 AND 100 AND
        no_price_after BETWEEN 0 AND 100
    )
);

CREATE INDEX idx_trades_market_id ON trades(market_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX idx_trades_user_market ON trades(user_id, market_id); -- For position aggregation

COMMENT ON TABLE trades IS 'Immutable trade ledger (append-only audit trail)';
COMMENT ON COLUMN trades.created_at IS 'Trade execution timestamp (never modified)';

-- TABLE: positions
-- 
-- Aggregated user positions per market.
--
-- DENORMALIZATION:
--   - This is a materialized view of trades (for performance)
--   - Updated atomically with each trade
--   - Can be rebuilt from trades table if corrupted
--
-- FINANCIAL INVARIANTS:
--   - yes_shares >= 0
--   - no_shares >= 0
--   - total_cost_basis >= 0
--   - realized_pnl is NULL until market resolves

CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Holdings
    yes_shares_smallest_unit BIGINT NOT NULL DEFAULT 0,
    no_shares_smallest_unit BIGINT NOT NULL DEFAULT 0,
    total_cost_basis_smallest_unit BIGINT NOT NULL DEFAULT 0,
    
    -- Settlement (populated when market resolves)
    realized_pnl_smallest_unit BIGINT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positions_shares_non_negative CHECK (
        yes_shares_smallest_unit >= 0 AND
        no_shares_smallest_unit >= 0
    ),
    CONSTRAINT positions_cost_basis_non_negative CHECK (total_cost_basis_smallest_unit >= 0),
    CONSTRAINT positions_unique_user_market UNIQUE (user_id, market_id)
);

CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_market_id ON positions(market_id);
CREATE UNIQUE INDEX idx_positions_user_market_unique ON positions(user_id, market_id);

COMMENT ON TABLE positions IS 'Aggregated user positions per market (denormalized from trades)';
COMMENT ON COLUMN positions.realized_pnl_smallest_unit IS 'Profit/loss after resolution (NULL before resolution)';

-- balance_transactions

-- audit trail

-- types: initial (sign up bonus), referral bonus, trade_debit, payout_credit, admin_adnjustment
--
-- append only
-- every balance change must have a correspoding transaction

CREATE TYPE transaction_type AS ENUM (
    'INITIAL', 'REFERRAL', 'TRADE_DEBIT', 'PAYOUT_CREDIT', 'ADMIN_ADJUSTMENT'
);

CREATE TABLE balance_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Transaction details
    type transaction_type NOT NULL,
    amount_smallest_unit BIGINT NOT NULL, -- Positive for credit, negative for debit
    balance_after_smallest_unit BIGINT NOT NULL,
    
    -- Context (nullable because not all types have references)
    trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
    market_id UUID REFERENCES markets(id) ON DELETE SET NULL,
    reference_id UUID, -- Generic reference (e.g., referral code)
    
    -- Metadata
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- For admin adjustments
    
    -- Constraints
    CONSTRAINT balance_transactions_amount_nonzero CHECK (amount_smallest_unit != 0)
);

CREATE INDEX idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX idx_balance_transactions_type ON balance_transactions(type);
CREATE INDEX idx_balance_transactions_created_at ON balance_transactions(created_at DESC);
CREATE INDEX idx_balance_transactions_trade_id ON balance_transactions(trade_id) WHERE trade_id IS NOT NULL;

COMMENT ON TABLE balance_transactions IS 'Immutable audit trail of all balance changes';
COMMENT ON COLUMN balance_transactions.amount_smallest_unit IS 'Positive for credit, negative for debit';

-- refresh_tokens
--
-- tokens hashed before storage
-- expired tokens cleaned up by scheduled job
-- revoked tokens cannot be used
CREATE TABLE refresh_tokens (
    if UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL REFERENCES users(id) ON CASCADE,

    token_hash ARCHAR(64) NOT NULL UNIQUE,

    expires_at TIMESTAMPZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMPZ,

    user_agent TEXT,
    ip_address INET
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash) WHERE NOT revoked;
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at) WHERE NOT revoked;

COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens (hashed for security)';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hash of refresh token (never store plaintext)';

-- funcs and trigs

-- update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_update_at_column()
RETURNS TRIGGER AS $$

BEGIN
    NEW.updated_at = NOW();
    RETURNS NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER balances_updated_at BEFORE UPDATE ON balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER markets_updated_at BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create balance record for new users
CREATE OR REPLACE FUNCTION create_initial_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO balances (user_id, balance_smallest_unit)
    VALUES (NEW.id, 5000000000000000000000); -- 5000 KES in smallest unit
    
    -- Record the initial credit transaction
    INSERT INTO balance_transactions (
        user_id,
        type,
        amount_smallest_unit,
        balance_after_smallest_unit,
        description
    ) VALUES (
        NEW.id,
        'INITIAL',
        5000000000000000000000,
        5000000000000000000000,
        'Initial signup bonus'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_create_initial_balance
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_initial_balance();

COMMENT ON FUNCTION create_initial_balance() IS 'Automatically create balance and initial transaction for new users';

-- rls
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Users: Can read own record, admins can read all
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (
        id = current_setting('app.user_id', true)::uuid
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.user_id', true)::uuid
            AND role = 'ADMIN'
        )
    );

-- Users: Can update own record (except role)
CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (id = current_setting('app.user_id', true)::uuid);

-- Balances: Can only read own balance
CREATE POLICY balances_select_policy ON balances
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true)::uuid);

-- Markets: Public read, admin-only write
CREATE POLICY markets_select_policy ON markets
    FOR SELECT
    USING (true); -- All users can read all markets

CREATE POLICY markets_insert_policy ON markets
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.user_id', true)::uuid
            AND role = 'ADMIN'
        )
    );

-- Trades: Users can read own trades, admins can read all
CREATE POLICY trades_select_policy ON trades
    FOR SELECT
    USING (
        user_id = current_setting('app.user_id', true)::uuid
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.user_id', true)::uuid
            AND role = 'ADMIN'
        )
    );

-- Positions: Users can read own positions
CREATE POLICY positions_select_policy ON positions
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true)::uuid);

-- Balance transactions: Users can read own transactions
CREATE POLICY balance_transactions_select_policy ON balance_transactions
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true)::uuid);

-- Refresh tokens: Users can read own tokens
CREATE POLICY refresh_tokens_select_policy ON refresh_tokens
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true)::uuid);


-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create admin user (password: admin123 - CHANGE IN PRODUCTION)
-- Password hash generated with bcrypt cost 12
INSERT INTO users (email, password_hash, username, full_name, role, email_verified)
VALUES (
    'admin@fotell.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWCrm.vW', -- admin123
    'admin',
    'FoTell Admin',
    'ADMIN',
    true
);


-- VIEWS
-- 

-- Market summary view (for listings)
CREATE VIEW market_summary AS
SELECT 
    m.id,
    m.question,
    m.status,
    m.created_at,
    m.closes_at,
    m.resolved_outcome,
    m.resolved_at,
    COUNT(DISTINCT t.user_id) AS unique_traders,
    COUNT(t.id) AS total_trades,
    COALESCE(SUM(t.cost_paid_smallest_unit), 0) AS total_volume_smallest_unit,
    u.username AS created_by_username
FROM markets m
LEFT JOIN trades t ON t.market_id = m.id
LEFT JOIN users u ON u.id = m.created_by
GROUP BY m.id, u.username;

COMMENT ON VIEW market_summary IS 'Market overview with aggregate statistics';

-- User portfolio view
CREATE VIEW user_portfolio AS
SELECT 
    p.user_id,
    COUNT(p.market_id) AS active_markets,
    SUM(p.yes_shares_smallest_unit + p.no_shares_smallest_unit) AS total_shares,
    SUM(p.total_cost_basis_smallest_unit) AS total_invested,
    SUM(COALESCE(p.realized_pnl_smallest_unit, 0)) AS total_realized_pnl
FROM positions p
GROUP BY p.user_id;

COMMENT ON VIEW user_portfolio IS 'User portfolio aggregates';

-- 
-- GRANTS (Supabase service role has full access)
--

-- Grant authenticated users read access to views
GRANT SELECT ON market_summary TO authenticated;
GRANT SELECT ON user_portfolio TO authenticated;

--
-- INDEXES FOR PERFORMANCE
--

-- Composite indexes for common queries
CREATE INDEX idx_trades_market_created_desc ON trades(market_id, created_at DESC);
CREATE INDEX idx_positions_user_market_active ON positions(user_id, market_id) 
    WHERE yes_shares_smallest_unit > 0 OR no_shares_smallest_unit > 0;

-- SCHEMA VERSION
--

CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT
);

INSERT INTO schema_version (version, description)
VALUES (1, 'Initial schema with users, markets, trades, positions, balances');

COMMENT ON TABLE schema_version IS 'Database schema version tracking for migrations';
