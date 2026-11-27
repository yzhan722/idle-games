-- WorkLife 数据库结构（与 backend/src/storage_pg.ts init() 完全一致）
-- 玩家状态为文档模型：player_states.state_json 存完整快照，version 做 CAS 乐观锁。
-- 规范化设计早已废弃——不要在此加回 player_inventory 等列式表。

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_device_id TEXT UNIQUE,
    google_sub TEXT UNIQUE,
    username VARCHAR(32),
    password_hash TEXT,
    guest_resume_token_hash TEXT,
    -- 会话版本号：JWT 中的 av 必须与此一致；绑定/登出递增即吊销旧 token
    auth_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_guest_resume_token_hash_key ON users (guest_resume_token_hash);

CREATE TABLE IF NOT EXISTS player_states (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    content_version TEXT NOT NULL,
    state_json JSONB NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leader_id UUID NOT NULL REFERENCES users(id),
    name TEXT,
    members JSONB NOT NULL DEFAULT '[]',
    current_activity JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enhancement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL,
    provider_id UUID NOT NULL,
    item_id TEXT NOT NULL,
    target_level INTEGER NOT NULL,
    service_fee INTEGER NOT NULL DEFAULT 0,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    response_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sell', 'buy')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    item_id TEXT NOT NULL,
    record_date DATE NOT NULL,
    average_price NUMERIC(10,2) NOT NULL,
    min_price INTEGER NOT NULL,
    max_price INTEGER NOT NULL,
    volume INTEGER NOT NULL DEFAULT 0,
    UNIQUE (item_id, record_date)
);

-- 命令回执：operationId 幂等去重的持久化证据
CREATE TABLE IF NOT EXISTS player_command_receipts (
    user_id UUID NOT NULL,
    operation_id TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    result JSONB NOT NULL,
    state_revision BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, operation_id)
);

-- 账号注销墓碑：只有随机编号与时间，30 天后清除（见 backend/src/account_deletion.ts）
CREATE TABLE IF NOT EXISTS account_deletions (
    user_id UUID PRIMARY KEY,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 真人排行榜（backend/src/leaderboard.ts）：只有起过名字的真人有一行，分数变了才更新
CREATE TABLE IF NOT EXISTS player_rankings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_level INTEGER NOT NULL,
    combat_level INTEGER NOT NULL,
    zone_score INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_player_rankings_total ON player_rankings(total_level DESC, user_id);
CREATE INDEX IF NOT EXISTS idx_player_rankings_combat ON player_rankings(combat_level DESC, user_id);
CREATE INDEX IF NOT EXISTS idx_player_rankings_zone ON player_rankings(zone_score DESC, user_id);

-- 一次性的数据补录做没做完
CREATE TABLE IF NOT EXISTS data_backfills (
    name TEXT PRIMARY KEY,
    done_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 匿名留存统计（backend/src/retention_metrics.ts）：只有日期、事件名、人数，400 天后清除
CREATE TABLE IF NOT EXISTS metrics_daily (
    day DATE NOT NULL,
    event TEXT NOT NULL,
    count BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (day, event)
);

-- 聊天屏蔽名单与举报（backend/src/chat_moderation.ts）：举报 90 天后清除，任一方注销时级联删除
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

-- 同好会（backend/src/circle.ts）：成员、申请、邀请在 doc；一人一个会；解散 / 注销级联删除
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

-- 常用查询索引
CREATE INDEX IF NOT EXISTS idx_trading_orders_item_created ON trading_orders(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_orders_user_created ON trading_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_orders_type_item ON trading_orders(type, item_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_item_date ON trade_history(item_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_buyer ON trade_history(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_seller ON trade_history(seller_id);
