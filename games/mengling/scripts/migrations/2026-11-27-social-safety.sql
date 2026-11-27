-- Additive migration (ML-COM3): block list, player reports, DM preference. Not executed yet; run with scripts/apply-d1-migrations.mjs.
-- 屏蔽名单：只存谁屏蔽了谁；被屏蔽的人看不到这张表
CREATE TABLE IF NOT EXISTS user_blocks (
  uid TEXT NOT NULL,
  blocked_uid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (uid, blocked_uid)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_uid);

-- 举报：原因 + 服务器自己截的快照（对方昵称、用户名、发给举报人的最近几条私信）；到期由 functions/api/_social_safety.js 清理
CREATE TABLE IF NOT EXISTS user_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_uid TEXT NOT NULL,
  target_uid TEXT NOT NULL,
  reason TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  handled_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_user_reports_created ON user_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_user_reports_pair ON user_reports(reporter_uid, target_uid, created_at);

-- 私信设置：没有这一行 = 只收好友私信（默认开）
CREATE TABLE IF NOT EXISTS social_prefs (
  uid TEXT PRIMARY KEY,
  dm_friends_only INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
