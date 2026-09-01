# Project Brief - WorkLife 多职业放置RPG

## 项目一句话描述

基于 Web 的多职业放置类RPG游戏，支持伐木、采矿、战斗、制作、交易、组队等完整多人在线玩法。

## 当前项目路径

C:\Users\caijingyi04\Documents\trae_projects\worklife

## 当前版本

WorkLife v1.0.0 — 核心功能完成 + 安全加固完成

## 目标版本

WorkLife v1.0.1 — 最终验收（Acceptance/Hardening），确认所有已实现功能满足生产就绪标准

## 目标用户

休闲游戏玩家，偏好放置类/Idle类RPG体验，覆盖移动端和桌面端浏览器用户。

## 必须支持的平台

- 移动端浏览器（iOS Safari / Android Chrome）
- 桌面浏览器（Chrome / Firefox / Edge）
- 平板设备

## 核心功能

- 6大职业系统（伐木工/矿工/农夫/厨师/裁缝/炼金术师），每职业独立技能树
- 生活技能资源生产链（采集→加工→制作）
- 回合制战斗系统（PvE关卡，离线战斗）
- 交易行系统（市场挂单 + 挂单簿 order-book 交易）
- 装备系统（穿戴/强化/耐久度/修理）
- 组队系统（创建/加入/组队活动/奖励分配）
- 技能树系统（经验-等级-解锁配方）
- 聊天系统（世界/职业/组队/私聊频道，WebSocket）
- 背包系统（物品管理/排序/筛选）
- 进阶系统（成就/每日任务/声望/赏金/转生）
- 商店系统（签到/买卖/消耗品Buff）
- 移动端响应式适配

## MVP 范围

所有上述核心功能已完成。本次目标是验收质量（安全/并发/性能/可用性）。

## 暂不做的功能

- PWA / Service Worker 离线访问
- 公会系统
- PVP 竞技场
- 成就系统 v2（排行榜）
- 多语言 i18n

## 技术偏好

- 前端：React 18 + TypeScript + Vite 5，纯 CSS（无UI框架）
- 后端：Fastify 5 + TypeScript，Pino 日志
- 数据库：PostgreSQL 14+，单表 JSONB（player_states.state_json）+ version 列乐观锁
- 并发控制：进程内 per-user Promise 链互斥 + 跨进程 CAS 乐观锁 + 关键经济操作 SELECT FOR UPDATE 事务
- 认证：JWT（游客设备ID / Google Sub）
- 运行时验证：Zod

## 已知约束

- 单实例部署（进程内互斥依赖单进程，多实例需要分布式锁）
- 无 Redis 缓存层（直连 PG）
- 无 CI/CD 流水线
- 无自动化测试（仅手动测试 + 一个 enhancement_utils.test.ts 单测文件）
- 前端使用 15 秒轮询同步状态（非 WebSocket 推送状态）

## 安全红线

- 不允许未认证请求访问任何业务接口
- 交易/经济操作必须原子化（不允许超卖、重复退款、负数资产）
- 不暴露服务器堆栈信息到客户端（500 返回通用消息）
- 不允许 SQL 注入（全部参数化查询）
- 生产环境必须配置 CORS_ORIGIN
- JWT_SECRET 不少于 32 字符

## 希望交给什么工具执行

CatDesk (Claude) — Acceptance/Hardening 模式
