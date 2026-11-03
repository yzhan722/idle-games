-- 常用查询索引（与当前文档模型一致；player_logs/chat_messages 等旧规范化表已不存在）
CREATE INDEX IF NOT EXISTS idx_trading_orders_item_created
  ON trading_orders(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_orders_user_created
  ON trading_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_orders_type_item
  ON trading_orders(type, item_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_item_date
  ON trade_history(item_id, completed_at DESC);
