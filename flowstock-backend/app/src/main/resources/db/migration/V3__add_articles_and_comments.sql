-- ── Articles (커뮤니티 게시글) ──
CREATE TABLE articles (
    id           BIGSERIAL PRIMARY KEY,
    member_id    BIGINT       NOT NULL REFERENCES members (id),
    title        VARCHAR(200) NOT NULL,
    content      TEXT         NOT NULL,
    category     VARCHAR(30)  NOT NULL DEFAULT 'GENERAL',
    view_count   INTEGER      NOT NULL DEFAULT 0,
    like_count   INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by   VARCHAR(255),
    updated_by   VARCHAR(255)
);

CREATE INDEX idx_articles_created_at ON articles (created_at DESC);
CREATE INDEX idx_articles_category   ON articles (category);
CREATE INDEX idx_articles_member_id  ON articles (member_id);

-- ── Comments (게시글 댓글) ──
CREATE TABLE comments (
    id          BIGSERIAL PRIMARY KEY,
    article_id  BIGINT      NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    member_id   BIGINT      NOT NULL REFERENCES members (id),
    content     TEXT        NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE INDEX idx_comments_article_id ON comments (article_id);
CREATE INDEX idx_comments_created_at ON comments (created_at);

-- ── Article Likes (좋아요) ──
CREATE TABLE article_likes (
    id          BIGSERIAL PRIMARY KEY,
    article_id  BIGINT    NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    member_id   BIGINT    NOT NULL REFERENCES members (id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (article_id, member_id)
);

CREATE INDEX idx_article_likes_article_id ON article_likes (article_id);
