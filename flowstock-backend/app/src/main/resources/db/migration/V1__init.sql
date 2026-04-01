-- ── Members ──
CREATE TABLE members (
    id                   BIGSERIAL PRIMARY KEY,
    email                VARCHAR(100)  NOT NULL UNIQUE,
    password             VARCHAR(255),
    nickname             VARCHAR(50)   NOT NULL,
    role                 VARCHAR(20)   NOT NULL DEFAULT 'USER',
    google_id            VARCHAR(100),
    naver_id             VARCHAR(100),
    provider             VARCHAR(20),
    profile_image_url    VARCHAR(500),
    is_profile_completed BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by           VARCHAR(255),
    updated_by           VARCHAR(255)
);

CREATE INDEX idx_members_google_id ON members (google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_members_naver_id  ON members (naver_id)  WHERE naver_id IS NOT NULL;

-- ── Stocks ──
CREATE TABLE stocks (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    market      VARCHAR(10)  NOT NULL,
    sector      VARCHAR(100),
    industry    VARCHAR(100),
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE INDEX idx_stocks_market ON stocks (market);

-- ── Stock Prices ──
CREATE TABLE stock_prices (
    id          BIGSERIAL PRIMARY KEY,
    stock_id    BIGINT         NOT NULL REFERENCES stocks (id),
    date        DATE           NOT NULL,
    open_price  NUMERIC(15, 2) NOT NULL,
    high_price  NUMERIC(15, 2) NOT NULL,
    low_price   NUMERIC(15, 2) NOT NULL,
    close_price NUMERIC(15, 2) NOT NULL,
    volume      BIGINT         NOT NULL,
    change_rate NUMERIC(10, 4),
    created_at  TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP      NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255),
    UNIQUE (stock_id, date)
);

CREATE INDEX idx_stock_prices_stock_date ON stock_prices (stock_id, date DESC);

-- ── News ──
CREATE TABLE news (
    id           BIGSERIAL PRIMARY KEY,
    title        VARCHAR(500) NOT NULL,
    content      TEXT,
    summary      TEXT,
    source       VARCHAR(100),
    original_url VARCHAR(1000),
    published_at TIMESTAMP    NOT NULL,
    sentiment    VARCHAR(20),
    importance   INT          NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by   VARCHAR(255),
    updated_by   VARCHAR(255)
);

CREATE INDEX idx_news_published_at ON news (published_at DESC);

-- ── News ↔ Stock Relations ──
CREATE TABLE news_stock_relations (
    id            BIGSERIAL PRIMARY KEY,
    news_id       BIGINT      NOT NULL REFERENCES news (id),
    stock_id      BIGINT      NOT NULL REFERENCES stocks (id),
    relation_type VARCHAR(50) NOT NULL,
    impact_score  NUMERIC(5, 2),
    impact_reason TEXT,
    created_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(255),
    updated_by    VARCHAR(255),
    UNIQUE (news_id, stock_id)
);

CREATE INDEX idx_news_stock_relations_news  ON news_stock_relations (news_id);
CREATE INDEX idx_news_stock_relations_stock ON news_stock_relations (stock_id);
