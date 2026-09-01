---
inclusion: always
---

# 🎯 高效提问模板

> 使用这些模板可以减少上下文消耗，加快任务完成速度。

## 原则

1. **精确引用文件** - 使用 `#文件路径` 而不是描述
2. **指定行号范围** - 大文件时指定关注区域
3. **单一任务聚焦** - 一次对话处理一个模块
4. **先说目标** - 让 AI 快速理解意图

## 模板示例

### ✅ 修改特定功能

```
修改 #backend/src/storage_pg.ts 的 createParty 方法，
添加队伍人数上限检查（最多6人）
```

### ✅ 添加新功能

```
在 #frontend/src/components/panels/ 添加一个 CraftingPanel 组件，
参考 GatheringPanel.tsx 的结构
```

### ✅ 修复 Bug

```
#frontend/src/contexts/GameContext.tsx 第 200-250 行
startLifeAction 函数在网络错误时没有正确处理，帮我修复
```

### ✅ 代码审查

```
审查 #backend/src/routes/trading.ts 的安全性，
检查是否有输入验证问题
```

### ✅ 重构代码

```
将 #frontend/src/components/NewGameInterface.tsx 第 1600-1900 行
的战斗界面代码提取到 panels/BattlePanel.tsx
```

## ❌ 避免的提问方式

```
❌ "帮我看看后端代码有什么问题"
   → 太宽泛，需要读取大量文件

❌ "优化整个项目"
   → 任务太大，应该分批处理

❌ "帮我修复那个 bug"
   → 不明确，需要额外探索

❌ "代码写得不好，帮我改改"
   → 没有具体目标
```

## 任务拆分建议

### 大任务拆分示例

**原任务**: "帮我完善交易系统"

**拆分后**:
1. "修改 #backend/src/routes/trading.ts 添加价格验证"
2. "修改 #frontend/src/components/trading/TradingPanel.tsx 添加确认弹窗"
3. "修改 #backend/src/storage_pg.ts 的 purchaseItem 添加事务"

### 按模块分批处理

| 批次 | 任务 | 涉及文件 |
|------|------|----------|
| 1 | 后端 API | `routes/*.ts` |
| 2 | 存储层 | `storage_*.ts` |
| 3 | 前端组件 | `components/*.tsx` |
| 4 | 状态管理 | `contexts/*.tsx` |

## 上下文节省技巧

### 1. 使用文件引用
```
✅ 修改 #backend/src/types.ts 添加 PartyInvite 类型
❌ 帮我在后端类型文件里添加一个新类型
```

### 2. 指定行号
```
✅ 看 #frontend/src/components/NewGameInterface.tsx 第 1800-2000 行
❌ 帮我看看 NewGameInterface 的战斗部分
```

### 3. 提供上下文摘要
```
✅ 我在做交易功能，需要修改 purchaseItem 方法添加手续费计算
❌ 帮我改改购买功能
```

### 4. 分步骤请求
```
第一步: "先帮我设计 API 接口"
第二步: "现在实现后端逻辑"
第三步: "最后做前端界面"
```

## 常见任务快捷方式

| 任务 | 快捷提问 |
|------|----------|
| 添加 API | "在 #backend/src/routes/[模块].ts 添加 [功能] 接口" |
| 添加组件 | "在 #frontend/src/components/panels/ 创建 [名称]Panel.tsx" |
| 修改类型 | "在 #backend/src/types.ts 添加 [类型名] 类型" |
| 修复诊断 | "修复 #[文件路径] 的 TypeScript 错误" |
| 代码审查 | "审查 #[文件路径] 的 [安全性/性能/可读性]" |
