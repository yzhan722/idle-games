-- 数据库索引优化迁移脚本
-- 为高频查询场景添加缺失的复合索引
-- 使用 IF NOT EXISTS 确保可重复执行

-- ============================================
-- trading_orders 表索引
-- ============================================

-- 按物品查询订单（getOrders 接口，最常用）
CREATE INDEX IF NOT EXISTS idx_trading_orders_item_created
  ON trading_orders(item_id, created_at DESC);

-- 按用户查询自己的订单（getMyOrders 接口）
CREATE INDEX IF NOT EXISTS idx_trading_orders_user_created
  ON trading_orders(user_id, created_at DESC);

-- 按类型+物品过滤（买单/卖单分开查看）
CREATE INDEX IF NOT EXISTS idx_trading_orders_type_item
  ON trading_orders(type, item_id);

-- ============================================
-- market_listings 表复合索引
-- ============================================

-- 活跃挂单按物品搜索（最常见查询：status='active' + item_id + 排序）
CREATE INDEX IF NOT EXISTS idx_market_listings_active_item
  ON market_listings(item_id, price_per_unit ASC)
  WHERE status = 'active';

-- 按卖家查询自己的活跃挂单
CREATE INDEX IF NOT EXISTS idx_market_listings_seller_active
  ON market_listings(seller_id, listed_at DESC)
  WHERE status = 'active';

-- 过期清理查询优化（cleanup_expired_listings 函数）
CREATE INDEX IF NOT EXISTS idx_market_listings_expiry_cleanup
  ON market_listings(expires_at)
  WHERE status = 'active';

-- ============================================
-- trade_history 表复合索引
-- ============================================

-- 每日价格聚合查询优化（aggregate_daily_prices 函数）
CREATE INDEX IF NOT EXISTS idx_trade_history_item_date
  ON trade_history(item_id, completed_at DESC);

-- ============================================
-- player_logs 表复合索引
-- ============================================

-- 按用户+时间查询日志（最常见场景）
CREATE INDEX IF NOT EXISTS idx_player_logs_user_created
  ON player_logs(user_id, created_at DESC);

-- ============================================
-- chat_messages 表复合索引
-- ============================================

-- 频道+时间复合索引（拉取最近消息）
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created
  ON chat_messages(channel, created_at DESC);

-- 私聊消息查询优化
CREATE INDEX IF NOT EXISTS idx_chat_messages_private
  ON chat_messages(sender_id, recipient_id, created_at DESC)
  WHERE channel = 'private';

-- ============================================
-- enhancement_service_requests 表复合索引
-- ============================================

-- 待处理请求按提供者查询
CREATE INDEX IF NOT EXISTS idx_enhancement_requests_provider_pending
  ON enhancement_service_requests(provider_id, created_at DESC)
  WHERE status = 'pending';
