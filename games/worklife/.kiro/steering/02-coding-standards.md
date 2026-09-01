---
inclusion: always
---

# 代码规范

## TypeScript规范

### 命名规范
- **组件**: PascalCase (例: `NewGameInterface`, `EnhancementPanel`)
- **函数/变量**: camelCase (例: `startLifeAction`, `playerState`)
- **常量**: UPPER_SNAKE_CASE (例: `MAX_LEVEL`, `DEFAULT_HP`)
- **类型/接口**: PascalCase (例: `PlayerState`, `ActiveTab`)
- **文件名**: 
  - 组件: PascalCase.tsx (例: `NewGameInterface.tsx`)
  - 工具/服务: camelCase.ts (例: `api.ts`, `storage.ts`)

### 类型定义
- 优先使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型和复杂类型
- 避免使用 `any`，使用 `unknown` 或具体类型
- 为函数参数和返回值添加类型注解

### 代码风格
```typescript
// ✅ 好的写法
interface PlayerState {
  id: string;
  level: number;
  inventory: Record<string, number>;
}

const getPlayerLevel = (player: PlayerState): number => {
  return player.level;
};

// ❌ 避免的写法
const getPlayerLevel = (player: any) => {
  return player.level;
};
```

## React规范

### 组件结构
```typescript
// 1. 导入
import { useState, useEffect } from 'react'
import { useGame } from '../contexts/GameContext'
import './Component.css'

// 2. 类型定义
interface Props {
  title: string;
  onAction: () => void;
}

// 3. 组件定义
export default function Component({ title, onAction }: Props) {
  // 4. Hooks
  const [state, setState] = useState(0)
  
  // 5. 副作用
  useEffect(() => {
    // ...
  }, [])
  
  // 6. 事件处理函数
  const handleClick = () => {
    // ...
  }
  
  // 7. 渲染
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### Hooks使用
- 遵循 Hooks 规则（只在顶层调用）
- 使用 `useCallback` 优化回调函数
- 使用 `useMemo` 优化计算密集型操作
- 正确设置依赖数组

### 状态管理
- 使用 Context 管理全局状态
- 组件内部状态使用 `useState`
- 避免过度使用全局状态

## CSS规范

### 命名规范
- 使用 kebab-case (例: `game-container`, `battle-log`)
- 使用 BEM 命名法（可选）
- 避免使用 ID 选择器

### 样式组织
```css
/* 1. 布局 */
.game-container {
  display: flex;
  flex-direction: column;
}

/* 2. 尺寸 */
.game-container {
  width: 100%;
  height: 100vh;
}

/* 3. 外观 */
.game-container {
  background: #1e1e1e;
  color: #fff;
}

/* 4. 动画 */
.game-container {
  transition: all 0.2s ease;
}
```

### 响应式设计
```css
/* 移动优先 */
.container {
  padding: 16px;
}

/* 平板 */
@media (min-width: 768px) {
  .container {
    padding: 24px;
  }
}

/* 桌面 */
@media (min-width: 1024px) {
  .container {
    padding: 32px;
  }
}
```

## 代码质量

### 避免的做法
- ❌ **不要创建多余的 Markdown 文档文件**（除非该文件是开发所必需的依赖文件）
- ❌ 不要使用 `console.log` 进行调试（使用 `console.error` 记录错误）
- ❌ 不要留下注释掉的代码
- ❌ 不要留下 TODO 注释（使用 TODO.md 文件）
- ❌ 不要使用魔法数字（定义常量）
- ❌ 不要写超过 300 行的组件（拆分）

### 推荐的做法
- ✅ 使用有意义的变量名
- ✅ 函数保持单一职责
- ✅ 添加必要的注释说明复杂逻辑
- ✅ 使用 TypeScript 严格模式
- ✅ 处理所有错误情况
- ✅ 使用 `async/await` 而不是 Promise 链

## 性能优化

### 前端优化
- 使用 `React.memo` 避免不必要的重渲染
- 使用 `useCallback` 和 `useMemo` 优化性能
- 避免在渲染函数中创建新对象/数组
- 使用 `requestAnimationFrame` 进行平滑动画

### 后端优化
- 使用连接池管理数据库连接
- 实现适当的缓存策略
- 避免 N+1 查询问题
- 使用批量操作减少数据库调用

## Git提交规范

### 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type类型
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

### 示例
```
feat(battle): 添加连续战斗功能

- 实现自动继续战斗逻辑
- 添加战斗场次计数
- 优化战斗奖励显示

Closes #123
```
