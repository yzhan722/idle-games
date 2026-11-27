-- 009: 登录令牌可提前吊销 —— users / sessions 加 token_version
-- users.token_version 在「退出所有设备」与改密码时 +1；会话里的版本对不上就失效。
-- sessions.token_version 允许 NULL：迁移前签发的令牌，账号没吊销过时认一次并补成 0。
-- 只能跑一次（SQLite 的 ADD COLUMN 没有 IF NOT EXISTS）；没跑之前接口按旧写法工作。
-- 万一只成了一条：接口照样按旧写法工作，把没成的那一条单独再跑一次就行（整个文件重跑会停在第一条）。

ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE sessions ADD COLUMN token_version INTEGER;
