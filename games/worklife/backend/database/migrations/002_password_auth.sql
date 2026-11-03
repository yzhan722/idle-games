-- 账号密码登录：users 增加 username + password_hash
-- username 大小写不敏感唯一（用小写函数索引约束，允许 NULL）

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));

ALTER TABLE users DROP CONSTRAINT IF EXISTS check_auth_method;
ALTER TABLE users ADD CONSTRAINT check_auth_method CHECK (
    guest_device_id IS NOT NULL OR google_sub IS NOT NULL OR username IS NOT NULL
);
