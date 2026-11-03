# WorkLife Frontend

游戏前端应用，基于React + Vite。

## 项目结构

```
src/
├── components/          # React组件
│   ├── NewGameInterface.tsx    # 主游戏界面
│   ├── NewGameInterface.css    # 游戏样式
│   └── LoginScreen.tsx         # 登录界面
├── contexts/           # React Context
│   ├── GameContext.tsx         # 游戏状态管理
│   └── AuthContext.tsx         # 认证状态管理
├── hooks/              # 自定义Hooks
│   └── useAuth.ts              # 认证Hook
├── services/           # API服务
│   └── api.ts                  # API客户端
├── utils/              # 工具函数
├── App.tsx             # 应用根组件
└── main.tsx            # 应用入口
```

## 核心组件

### NewGameInterface
主游戏界面，包含所有游戏功能：
- 职业系统
- 采集和加工
- 战斗系统
- 背包管理
- 交易市场

### 状态管理

#### GameContext
管理游戏核心状态：
```typescript
{
  playerState: EnhancedPlayerState | null;
  loading: boolean;
  refreshPlayerState: () => Promise<void>;
  startLifeAction: (actionId: string) => Promise<PlayerState | undefined>;
}
```

#### AuthContext
管理认证状态：
```typescript
{
  user: User | null;
  loading: boolean;
  login: (deviceId?: string) => Promise<void>;
  logout: () => void;
}
```

## 样式系统

### 设计原则
- 深色主题 (#1e1e1e背景)
- 半透明卡片设计
- 统一的间距和圆角
- 响应式布局

### 颜色规范
```css
/* 背景色 */
--bg-primary: #1e1e1e;
--bg-card: rgba(255, 255, 255, 0.08);
--bg-hover: rgba(255, 255, 255, 0.12);

/* 文字色 */
--text-primary: #fff;
--text-secondary: #999;
--text-gold: #FFD700;

/* 主题色 */
--color-success: #4CAF50;
--color-danger: #f44336;
--color-warning: #FFC107;
--color-info: #2196F3;
```

### 组件样式规范
- 卡片: `border-radius: 8px`, `padding: 16px`
- 按钮: `border-radius: 8px`, `padding: 12px 24px`
- 输入框: `border-radius: 8px`, `padding: 12px 16px`

## 开发指南

### 添加新页面

1. 在 `NewGameInterface.tsx` 中添加标签
```typescript
const tabs = [
  // ... existing tabs
  { id: 'newpage' as const, name: '新页面' },
];
```

2. 添加页面内容
```typescript
{activeTab === 'newpage' && (
  <div className="newpage-layout">
    <div className="page-header">
      <h2 className="section-title">新页面</h2>
      <div className="page-info">
        <p>页面描述</p>
      </div>
    </div>
    {/* 页面内容 */}
  </div>
)}
```

3. 添加样式
```css
.newpage-layout {
  max-width: 1200px;
  margin: 0 auto;
}
```

### 调用API

使用 `GameContext` 中的方法：
```typescript
const { startLifeAction, refreshPlayerState } = useGame();

// 执行动作
await startLifeAction('act_logging_1');

// 刷新状态
await refreshPlayerState();
```

### 状态更新

GameContext 会自动处理状态更新和奖励通知：
```typescript
// 自动检测金币和经验变化
// 自动显示奖励通知
// 自动更新UI
```

## 性能优化

### 防止闪烁
```css
* {
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
}

.component {
  will-change: contents;
  transform: translateZ(0);
}
```

### 减少重渲染
- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存函数
- 合理使用 `key` 属性

### 图片优化
- 使用合适的图片尺寸
- 提供fallback图标
- 懒加载图片

## 响应式设计

### 断点
```css
/* 桌面 */
@media (min-width: 1024px) { }

/* 平板 */
@media (max-width: 1024px) { }

/* 手机 */
@media (max-width: 768px) { }
```

### 移动端优化
- 触摸友好的按钮大小
- 简化的布局
- 减少列数

## 测试

### 组件测试
```bash
npm test
```

### E2E测试
```bash
npm run test:e2e
```

## 构建

### 开发构建
```bash
npm run dev
```

### 生产构建
```bash
npm run build
```

### 预览构建
```bash
npm run preview
```

## 调试

### React DevTools
安装浏览器扩展查看组件树和状态

### 网络请求
使用浏览器开发者工具查看API请求

### 性能分析
使用React Profiler分析渲染性能

## 常见问题

### 状态不更新
- 检查 `key` 属性
- 确认 API 返回正确数据
- 查看 Console 错误信息

### 样式不生效
- 检查 CSS 选择器优先级
- 确认类名拼写正确
- 清除浏览器缓存

### API 调用失败
- 检查后端服务是否运行
- 确认 API 地址正确
- 查看网络请求详情

## 代码规范

### 命名规范
- 组件: PascalCase (NewGameInterface)
- 函数: camelCase (startLifeAction)
- 常量: UPPER_SNAKE_CASE (API_BASE_URL)
- CSS类: kebab-case (game-container)

### 文件组织
- 一个文件一个组件
- 相关样式放在同名CSS文件
- 工具函数放在 utils 目录

### TypeScript
- 明确的类型定义
- 避免使用 any
- 使用接口定义props
