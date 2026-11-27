-- 008_circles: 同好会（真人公会，backend/src/circle.ts）
-- 一行一个同好会：成员、申请、邀请存在 doc（jsonb）；name_key 唯一 = 名字不重（全角半角、大小写、空白不同也算重名）。
-- circle_members 的主键 user_id = 一人只在一个同好会里；解散时随 circles 级联删除，注销时随 users 级联删除。
-- 只有协作与展示，不存任何加成；团内聊天和其他聊天一样不落库。

CREATE TABLE IF NOT EXISTS circles (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL,
    doc JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_circles_name_key ON circles(name_key);
CREATE INDEX IF NOT EXISTS idx_circles_doc ON circles USING GIN (doc jsonb_path_ops);

CREATE TABLE IF NOT EXISTS circle_members (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id);
