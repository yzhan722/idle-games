-- 007_chat_moderation: 聊天屏蔽名单与举报（backend/src/chat_moderation.ts）
-- 屏蔽名单随账号走；举报存举报人、被举报人、原因、频道和举报当时内存里该频道最近 20 条（重启后没有就是空数组）。
-- 举报 90 天后由服务端定时清除；任一方注销时随 users 级联删除。聊天本身仍不落库。

CREATE TABLE IF NOT EXISTS chat_blocks (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, blocked_user_id)
);

CREATE TABLE IF NOT EXISTS chat_reports (
    id UUID PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    channel TEXT NOT NULL,
    snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_reports_created ON chat_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_reports_reporter ON chat_reports(reporter_id, created_at);
