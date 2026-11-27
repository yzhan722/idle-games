-- 004_account_deletion_and_trades: 账号注销墓碑 + 成交记录索引
-- 墓碑只存随机账号编号与注销时间，30 天后由服务端清除；不含任何可识别个人的信息。

CREATE TABLE IF NOT EXISTS account_deletions (
    user_id UUID PRIMARY KEY,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 注销时按账号找成交记录抹去身份；估价按物品取近期成交（idx_trade_history_item_date 已有）
CREATE INDEX IF NOT EXISTS idx_trade_history_buyer ON trade_history(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_seller ON trade_history(seller_id);
