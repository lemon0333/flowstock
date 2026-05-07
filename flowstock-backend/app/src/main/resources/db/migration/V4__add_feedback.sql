-- ── Feedback (서비스 개선 제안) ──
CREATE TABLE feedback (
    id           BIGSERIAL PRIMARY KEY,
    member_id    BIGINT       NOT NULL REFERENCES members (id),
    title        VARCHAR(200) NOT NULL,
    content      TEXT         NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    like_count   INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by   VARCHAR(255),
    updated_by   VARCHAR(255)
);

CREATE INDEX idx_feedback_created_at ON feedback (created_at DESC);
CREATE INDEX idx_feedback_status     ON feedback (status);
CREATE INDEX idx_feedback_member_id  ON feedback (member_id);

-- ── Feedback Likes ──
CREATE TABLE feedback_likes (
    id           BIGSERIAL PRIMARY KEY,
    feedback_id  BIGINT    NOT NULL REFERENCES feedback (id) ON DELETE CASCADE,
    member_id    BIGINT    NOT NULL REFERENCES members (id),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (feedback_id, member_id)
);

CREATE INDEX idx_feedback_likes_feedback_id ON feedback_likes (feedback_id);
