-- 003_auth_version: 会话版本号，用于 JWT 服务端吊销（登出/绑定凭据时递增）
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 1;
