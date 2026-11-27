-- 005_player_rankings: 真人排行榜（总等级 / 战斗等级 / 最远区域）
-- 只有起过名字的真人有一行；分数由服务端存档算出，账号注销时随 users 级联删除。
-- 已有存档不用在这里回填：服务端启动时分页补一遍（只做一次，做完记在 data_backfills），之后每次存档分数有变就更新。

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

-- 一次性的数据补录做没做完（中途重启要能接着补）
CREATE TABLE IF NOT EXISTS data_backfills (
    name TEXT PRIMARY KEY,
    done_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
