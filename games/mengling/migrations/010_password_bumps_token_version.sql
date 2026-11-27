-- 010: 改密码时 token_version +1（先跑 009：没有那一列时改密码会报错）
-- 现在只有管理员手工重置密码这一条路，放在触发器里，直接改库也不会漏。
-- 触发器里有分号：用 wrangler d1 execute --file 整个文件跑，不要自己按分号拆；触发器首尾两个关键字保持大写（拆语句的程序靠它认）。
-- 跑不成就先不跑，手工重置密码时自己带上 token_version = token_version + 1，效果一样；两样都做只是多加一次，没有害处。

CREATE TRIGGER IF NOT EXISTS trg_users_password_bumps_token_version
AFTER UPDATE OF password_hash ON users
WHEN NEW.password_hash <> OLD.password_hash
BEGIN
  UPDATE users SET token_version = token_version + 1 WHERE id = NEW.id;
END;
