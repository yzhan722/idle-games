-- 006_metrics_daily: 匿名留存统计（backend/src/retention_metrics.ts）
-- 只有日期、事件名、人数；没有玩家编号、设备或 IP。超过 400 天的行由服务端清除。

CREATE TABLE IF NOT EXISTS metrics_daily (
    day DATE NOT NULL,
    event TEXT NOT NULL,
    count BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (day, event)
);
