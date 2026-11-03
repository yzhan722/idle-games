-- WorkLife 游戏内容数据种子文件
-- 此文件包含所有游戏静态内容的定义

-- ============================================
-- 游戏内容表结构
-- ============================================

-- 职业定义表
CREATE TABLE game_classes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('gatherer', 'crafter', 'fighter')),
    description TEXT,
    icon_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 技能定义表
CREATE TABLE game_skills (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) NOT NULL REFERENCES game_classes(id),
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    max_level INTEGER NOT NULL DEFAULT 200,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 物品定义表
CREATE TABLE game_items (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    type VARCHAR(20) NOT NULL CHECK (type IN ('currency', 'material', 'weapon', 'armor', 'consumable', 'tool', 'quest')),
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier >= 0 AND tier <= 10),
    description TEXT,
    icon_url VARCHAR(255),
    max_stack INTEGER NOT NULL DEFAULT 999,
    is_tradeable BOOLEAN DEFAULT TRUE,
    base_price INTEGER,
    -- 装备属性
    atk INTEGER DEFAULT 0,
    def INTEGER DEFAULT 0,
    mag INTEGER DEFAULT 0,
    hp INTEGER DEFAULT 0,
    mp INTEGER DEFAULT 0,
    -- 耐久度
    base_durability INTEGER DEFAULT 100,
    -- 其他属性
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_game_items_type ON game_items(type);
CREATE INDEX idx_game_items_tier ON game_items(tier);
CREATE INDEX idx_game_items_tradeable ON game_items(is_tradeable);

-- 动作定义表
CREATE TABLE game_actions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    skill_id VARCHAR(50) NOT NULL REFERENCES game_skills(id),
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('gather', 'craft', 'combat', 'fish', 'mine', 'chop')),
    duration INTEGER NOT NULL, -- 毫秒
    xp_reward INTEGER NOT NULL DEFAULT 0,
    required_skill_level INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_game_actions_skill ON game_actions(skill_id);
CREATE INDEX idx_game_actions_type ON game_actions(action_type);
CREATE INDEX idx_game_actions_level ON game_actions(required_skill_level);

-- 动作消耗表
CREATE TABLE game_action_consumes (
    id BIGSERIAL PRIMARY KEY,
    action_id VARCHAR(100) NOT NULL REFERENCES game_actions(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL REFERENCES game_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    UNIQUE(action_id, item_id)
);

-- 动作产出表
CREATE TABLE game_action_yields (
    id BIGSERIAL PRIMARY KEY,
    action_id VARCHAR(100) NOT NULL REFERENCES game_actions(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL REFERENCES game_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    chance NUMERIC(5, 4) NOT NULL DEFAULT 1.0 CHECK (chance > 0 AND chance <= 1),
    UNIQUE(action_id, item_id)
);
