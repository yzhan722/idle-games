-- WorkLife 数据库初始化脚本
-- 按顺序执行以下步骤创建完整的数据库

-- 1. 创建数据库（如果不存在）
-- CREATE DATABASE worklife WITH ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';

-- 2. 连接到数据库
-- \c worklife

-- 3. 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- 用于模糊搜索

-- 4. 执行主schema
\i schema.sql

-- 5. 执行游戏内容表
\i seed_game_content.sql

-- 6. 插入初始游戏数据
\i insert_game_data.sql

-- 7. 创建定时任务（可选）
-- SELECT cron.schedule('cleanup-expired-listings', '0 * * * *', 'SELECT cleanup_expired_listings()');
-- SELECT cron.schedule('aggregate-daily-prices', '0 1 * * *', 'SELECT aggregate_daily_prices()');

-- 8. 验证安装
SELECT 'Database initialized successfully!' as status;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as item_count FROM game_items;
SELECT COUNT(*) as action_count FROM game_actions;
