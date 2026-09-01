-- WorkLife 游戏数据库设计
-- PostgreSQL 14+

-- ============================================
-- 核心用户表
-- ============================================

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_device_id VARCHAR(255) UNIQUE,
    google_sub VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    CONSTRAINT check_auth_method CHECK (
        guest_device_id IS NOT NULL OR google_sub IS NOT NULL
    )
);

CREATE INDEX idx_users_guest_device ON users(guest_device_id);
CREATE INDEX idx_users_google_sub ON users(google_sub);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================
-- 玩家状态表
-- ============================================

-- 玩家主状态表
CREATE TABLE player_states (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    content_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    active_class_id VARCHAR(50) NOT NULL DEFAULT 'woodcutter',
    mode VARCHAR(20) NOT NULL DEFAULT 'idle' CHECK (mode IN ('idle', 'life_action', 'combat_farm')),
    combat_level INTEGER NOT NULL DEFAULT 1 CHECK (combat_level >= 1 AND combat_level <= 200),
    combat_xp INTEGER NOT NULL DEFAULT 0 CHECK (combat_xp >= 0),
    last_simulated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_states_active_class ON player_states(active_class_id);
CREATE INDEX idx_player_states_mode ON player_states(mode);
CREATE INDEX idx_player_states_combat_level ON player_states(combat_level);

-- 玩家职业技能表
CREATE TABLE player_skills (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id VARCHAR(50) NOT NULL,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 200),
    xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    enhancement_level INTEGER NOT NULL DEFAULT 0 CHECK (enhancement_level >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_id)
);

CREATE INDEX idx_player_skills_user ON player_skills(user_id);
CREATE INDEX idx_player_skills_skill_id ON player_skills(skill_id);
CREATE INDEX idx_player_skills_level ON player_skills(level);

-- 玩家已解锁配方/技能节点表
CREATE TABLE player_unlocked_recipes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id VARCHAR(50) NOT NULL,
    recipe_id VARCHAR(100) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_id, recipe_id)
);

CREATE INDEX idx_player_unlocked_recipes_user ON player_unlocked_recipes(user_id);
CREATE INDEX idx_player_unlocked_recipes_skill ON player_unlocked_recipes(skill_id);

-- ============================================
-- 背包和物品表
-- ============================================

-- 玩家背包表
CREATE TABLE player_inventory (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_id)
);

CREATE INDEX idx_player_inventory_user ON player_inventory(user_id);
CREATE INDEX idx_player_inventory_item ON player_inventory(item_id);
CREATE INDEX idx_player_inventory_quantity ON player_inventory(quantity);

-- 玩家装备表
CREATE TABLE player_equipment (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot VARCHAR(20) NOT NULL CHECK (slot IN ('main_hand', 'off_hand', 'head', 'chest', 'legs', 'feet', 'accessory1', 'accessory2')),
    item_id VARCHAR(100),
    enhancement_level INTEGER NOT NULL DEFAULT 0 CHECK (enhancement_level >= 0 AND enhancement_level <= 10),
    durability INTEGER NOT NULL DEFAULT 100 CHECK (durability >= 0),
    max_durability INTEGER NOT NULL DEFAULT 100 CHECK (max_durability > 0),
    equipped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, slot)
);

CREATE INDEX idx_player_equipment_user ON player_equipment(user_id);
CREATE INDEX idx_player_equipment_item ON player_equipment(item_id);
CREATE INDEX idx_player_equipment_durability ON player_equipment(durability);

-- ============================================
-- 活动状态表
-- ============================================

-- 玩家职业活动状态表
CREATE TABLE player_life_actions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    action_id VARCHAR(100) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_life_actions_action ON player_life_actions(action_id);
CREATE INDEX idx_player_life_actions_started ON player_life_actions(started_at);

-- 玩家战斗状态表
CREATE TABLE player_combat_states (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    stage_id VARCHAR(100) NOT NULL,
    seed VARCHAR(100) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_combat_states_stage ON player_combat_states(stage_id);
CREATE INDEX idx_player_combat_states_started ON player_combat_states(started_at);

-- 玩家活动队列表（离线进度）
CREATE TABLE player_activity_queue (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_id VARCHAR(100) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    estimated_duration INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_activity_queue_user ON player_activity_queue(user_id);
CREATE INDEX idx_player_activity_queue_priority ON player_activity_queue(priority DESC);

-- ============================================
-- 交易系统表
-- ============================================

-- 市场挂单表
CREATE TABLE market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_unit INTEGER NOT NULL CHECK (price_per_unit > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'cancelled')),
    listed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sold_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_market_listings_seller ON market_listings(seller_id);
CREATE INDEX idx_market_listings_item ON market_listings(item_id);
CREATE INDEX idx_market_listings_status ON market_listings(status);
CREATE INDEX idx_market_listings_price ON market_listings(price_per_unit);
CREATE INDEX idx_market_listings_expires ON market_listings(expires_at);
CREATE INDEX idx_market_listings_listed ON market_listings(listed_at DESC);

-- 交易历史表
CREATE TABLE trade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES market_listings(id),
    item_id VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    price_per_unit INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    fee INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trade_history_buyer ON trade_history(buyer_id);
CREATE INDEX idx_trade_history_seller ON trade_history(seller_id);
CREATE INDEX idx_trade_history_item ON trade_history(item_id);
CREATE INDEX idx_trade_history_completed ON trade_history(completed_at DESC);

-- 价格历史表（每日统计）
CREATE TABLE price_history (
    id BIGSERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    record_date DATE NOT NULL,
    average_price NUMERIC(10, 2) NOT NULL,
    min_price INTEGER NOT NULL,
    max_price INTEGER NOT NULL,
    volume INTEGER NOT NULL DEFAULT 0,
    trade_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, record_date)
);

CREATE INDEX idx_price_history_item ON price_history(item_id);
CREATE INDEX idx_price_history_date ON price_history(record_date DESC);
CREATE INDEX idx_price_history_volume ON price_history(volume DESC);

-- ============================================
-- 组队系统表
-- ============================================

-- 队伍表
CREATE TABLE parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    max_members INTEGER NOT NULL DEFAULT 6 CHECK (max_members >= 2 AND max_members <= 6),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    disbanded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_parties_leader ON parties(leader_id);
CREATE INDEX idx_parties_active ON parties(is_active);
CREATE INDEX idx_parties_created ON parties(created_at DESC);

-- 队伍成员表
CREATE TABLE party_members (
    id BIGSERIAL PRIMARY KEY,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
    is_online BOOLEAN DEFAULT TRUE,
    is_ready BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(party_id, user_id)
);

CREATE INDEX idx_party_members_party ON party_members(party_id);
CREATE INDEX idx_party_members_user ON party_members(user_id);
CREATE INDEX idx_party_members_online ON party_members(is_online);

-- 队伍活动表
CREATE TABLE party_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('combat', 'group_craft')),
    stage_id VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    rewards JSONB
);

CREATE INDEX idx_party_activities_party ON party_activities(party_id);
CREATE INDEX idx_party_activities_type ON party_activities(activity_type);
CREATE INDEX idx_party_activities_started ON party_activities(started_at DESC);

-- ============================================
-- 强化系统表
-- ============================================

-- 强化服务请求表
CREATE TABLE enhancement_service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    target_level INTEGER NOT NULL CHECK (target_level >= 1 AND target_level <= 10),
    service_fee INTEGER NOT NULL,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
    response_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_enhancement_requests_requester ON enhancement_service_requests(requester_id);
CREATE INDEX idx_enhancement_requests_provider ON enhancement_service_requests(provider_id);
CREATE INDEX idx_enhancement_requests_status ON enhancement_service_requests(status);
CREATE INDEX idx_enhancement_requests_created ON enhancement_service_requests(created_at DESC);

-- 强化服务统计表
CREATE TABLE enhancement_service_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    completed_services INTEGER NOT NULL DEFAULT 0,
    total_rating NUMERIC(10, 2) NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    average_rating NUMERIC(3, 2) GENERATED ALWAYS AS (
        CASE WHEN rating_count > 0 THEN total_rating / rating_count ELSE 0 END
    ) STORED,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enhancement_stats_rating ON enhancement_service_stats(average_rating DESC);
CREATE INDEX idx_enhancement_stats_completed ON enhancement_service_stats(completed_services DESC);

-- ============================================
-- 游戏日志表
-- ============================================

-- 玩家日志表
CREATE TABLE player_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_text TEXT NOT NULL,
    log_type VARCHAR(20) DEFAULT 'info' CHECK (log_type IN ('info', 'success', 'warning', 'error', 'combat', 'trade', 'level_up')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_logs_user ON player_logs(user_id);
CREATE INDEX idx_player_logs_type ON player_logs(log_type);
CREATE INDEX idx_player_logs_created ON player_logs(created_at DESC);

-- 分区表：按月分区日志
CREATE TABLE player_logs_y2025m01 PARTITION OF player_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ============================================
-- 聊天系统表
-- ============================================

-- 聊天消息表
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('world', 'profession', 'party', 'private')),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
    profession_id VARCHAR(50),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_channel_context CHECK (
        (channel = 'private' AND recipient_id IS NOT NULL) OR
        (channel = 'party' AND party_id IS NOT NULL) OR
        (channel = 'profession' AND profession_id IS NOT NULL) OR
        (channel = 'world')
    )
);

CREATE INDEX idx_chat_messages_channel ON chat_messages(channel);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_recipient ON chat_messages(recipient_id);
CREATE INDEX idx_chat_messages_party ON chat_messages(party_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);

-- ============================================
-- 游戏统计表
-- ============================================

-- 玩家统计表
CREATE TABLE player_statistics (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_play_time INTEGER NOT NULL DEFAULT 0, -- 秒
    total_actions_completed INTEGER NOT NULL DEFAULT 0,
    total_monsters_defeated INTEGER NOT NULL DEFAULT 0,
    total_bosses_defeated INTEGER NOT NULL DEFAULT 0,
    total_items_crafted INTEGER NOT NULL DEFAULT 0,
    total_items_gathered INTEGER NOT NULL DEFAULT 0,
    total_gold_earned BIGINT NOT NULL DEFAULT 0,
    total_gold_spent BIGINT NOT NULL DEFAULT 0,
    total_trades_completed INTEGER NOT NULL DEFAULT 0,
    highest_combat_level INTEGER NOT NULL DEFAULT 1,
    highest_skill_level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_statistics_play_time ON player_statistics(total_play_time DESC);
CREATE INDEX idx_player_statistics_combat_level ON player_statistics(highest_combat_level DESC);

-- ============================================
-- 系统配置表
-- ============================================

-- 游戏配置表
CREATE TABLE game_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- 维护模式配置
INSERT INTO game_config (key, value, description) VALUES
    ('maintenance_mode', '{"enabled": false, "message": ""}', '维护模式开关'),
    ('max_inventory_size', '{"value": 1000}', '背包最大容量'),
    ('trading_fee_rate', '{"value": 0.05}', '交易手续费率'),
    ('max_party_size', '{"value": 6}', '队伍最大人数'),
    ('max_enhancement_level', '{"value": 10}', '装备最大强化等级');

-- ============================================
-- 触发器和函数
-- ============================================

-- 更新 updated_at 时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有需要的表添加 updated_at 触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_states_updated_at BEFORE UPDATE ON player_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_skills_updated_at BEFORE UPDATE ON player_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_inventory_updated_at BEFORE UPDATE ON player_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_equipment_updated_at BEFORE UPDATE ON player_equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_listings_updated_at BEFORE UPDATE ON market_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON parties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhancement_requests_updated_at BEFORE UPDATE ON enhancement_service_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 自动计算强化服务平均评分的触发器
CREATE OR REPLACE FUNCTION update_enhancement_service_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE enhancement_service_stats
        SET completed_services = completed_services + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.provider_id;
        
        -- 如果记录不存在，创建新记录
        INSERT INTO enhancement_service_stats (user_id, completed_services)
        VALUES (NEW.provider_id, 1)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enhancement_stats_on_complete
    AFTER UPDATE ON enhancement_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_enhancement_service_stats();

-- ============================================
-- 视图
-- ============================================

-- 玩家完整状态视图
CREATE VIEW v_player_full_state AS
SELECT 
    ps.user_id,
    ps.content_version,
    ps.active_class_id,
    ps.mode,
    ps.combat_level,
    ps.combat_xp,
    ps.last_simulated_at,
    u.created_at as user_created_at,
    u.last_login_at,
    COUNT(DISTINCT psk.skill_id) as total_skills,
    SUM(pi.quantity) as total_items,
    COALESCE(pi_gold.quantity, 0) as gold,
    COUNT(DISTINCT pe.slot) as equipped_items
FROM player_states ps
JOIN users u ON ps.user_id = u.id
LEFT JOIN player_skills psk ON ps.user_id = psk.user_id
LEFT JOIN player_inventory pi ON ps.user_id = pi.user_id
LEFT JOIN player_inventory pi_gold ON ps.user_id = pi_gold.user_id AND pi_gold.item_id = 'gold'
LEFT JOIN player_equipment pe ON ps.user_id = pe.user_id AND pe.item_id IS NOT NULL
GROUP BY ps.user_id, ps.content_version, ps.active_class_id, ps.mode, 
         ps.combat_level, ps.combat_xp, ps.last_simulated_at, 
         u.created_at, u.last_login_at, pi_gold.quantity;

-- 活跃市场挂单视图
CREATE VIEW v_active_market_listings AS
SELECT 
    ml.*,
    u.guest_device_id as seller_device_id,
    EXTRACT(EPOCH FROM (ml.expires_at - CURRENT_TIMESTAMP)) as seconds_until_expiry
FROM market_listings ml
JOIN users u ON ml.seller_id = u.id
WHERE ml.status = 'active' 
  AND ml.expires_at > CURRENT_TIMESTAMP
ORDER BY ml.listed_at DESC;

-- 强化服务提供者排行视图
CREATE VIEW v_top_enhancement_providers AS
SELECT 
    ess.user_id,
    ess.completed_services,
    ess.average_rating,
    ps.active_class_id,
    COUNT(DISTINCT psk.skill_id) as total_skills,
    MAX(psk.level) as highest_skill_level
FROM enhancement_service_stats ess
JOIN player_states ps ON ess.user_id = ps.user_id
LEFT JOIN player_skills psk ON ess.user_id = psk.user_id
WHERE ess.completed_services > 0
GROUP BY ess.user_id, ess.completed_services, ess.average_rating, ps.active_class_id
ORDER BY ess.average_rating DESC, ess.completed_services DESC;

-- ============================================
-- 性能优化
-- ============================================

-- 定期清理过期的市场挂单
CREATE OR REPLACE FUNCTION cleanup_expired_listings()
RETURNS void AS $$
BEGIN
    UPDATE market_listings
    SET status = 'expired',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active'
      AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 定期聚合价格历史数据
CREATE OR REPLACE FUNCTION aggregate_daily_prices()
RETURNS void AS $$
BEGIN
    INSERT INTO price_history (item_id, record_date, average_price, min_price, max_price, volume, trade_count)
    SELECT 
        item_id,
        CURRENT_DATE - INTERVAL '1 day' as record_date,
        AVG(price_per_unit)::numeric(10,2) as average_price,
        MIN(price_per_unit) as min_price,
        MAX(price_per_unit) as max_price,
        SUM(quantity) as volume,
        COUNT(*) as trade_count
    FROM trade_history
    WHERE DATE(completed_at) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY item_id
    ON CONFLICT (item_id, record_date) DO UPDATE
    SET average_price = EXCLUDED.average_price,
        min_price = EXCLUDED.min_price,
        max_price = EXCLUDED.max_price,
        volume = EXCLUDED.volume,
        trade_count = EXCLUDED.trade_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 权限设置
-- ============================================

-- 创建应用用户
-- CREATE USER worklife_app WITH PASSWORD 'your_secure_password_here';

-- 授予权限
-- GRANT CONNECT ON DATABASE worklife TO worklife_app;
-- GRANT USAGE ON SCHEMA public TO worklife_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO worklife_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO worklife_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO worklife_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO worklife_app;

-- ============================================
-- 注释
-- ============================================

COMMENT ON TABLE users IS '用户账户表';
COMMENT ON TABLE player_states IS '玩家主状态表';
COMMENT ON TABLE player_skills IS '玩家职业技能表';
COMMENT ON TABLE player_inventory IS '玩家背包表';
COMMENT ON TABLE player_equipment IS '玩家装备表';
COMMENT ON TABLE market_listings IS '交易市场挂单表';
COMMENT ON TABLE trade_history IS '交易历史记录表';
COMMENT ON TABLE price_history IS '物品价格历史统计表';
COMMENT ON TABLE parties IS '队伍表';
COMMENT ON TABLE party_members IS '队伍成员表';
COMMENT ON TABLE enhancement_service_requests IS '装备强化服务请求表';
COMMENT ON TABLE player_logs IS '玩家游戏日志表';
COMMENT ON TABLE chat_messages IS '聊天消息表';
COMMENT ON TABLE player_statistics IS '玩家统计数据表';
