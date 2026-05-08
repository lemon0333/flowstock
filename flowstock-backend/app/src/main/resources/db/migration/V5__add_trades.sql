-- ── Trades (거래 기록 + 공개 leaderboard) ──
CREATE TABLE trades (
    id            BIGSERIAL PRIMARY KEY,
    member_id     BIGINT       NOT NULL REFERENCES members (id),
    stock_code    VARCHAR(20)  NOT NULL,
    stock_name    VARCHAR(100) NOT NULL,
    action        VARCHAR(10)  NOT NULL,
    price         BIGINT       NOT NULL,
    quantity      INTEGER      NOT NULL,
    realized_pnl  BIGINT,
    memo          TEXT,
    is_public     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(255),
    updated_by    VARCHAR(255)
);

CREATE INDEX idx_trades_member_id            ON trades (member_id);
CREATE INDEX idx_trades_is_public_created_at ON trades (is_public, created_at DESC);
CREATE INDEX idx_trades_stock_code           ON trades (stock_code);
