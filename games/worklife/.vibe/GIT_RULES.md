# GIT RULES — WorkLife v1.0.1 Acceptance/Hardening

## 开发前

```bash
git status
git branch
git log --oneline -5
```

如果 Git 不可用，必须目录备份。

## Commit 节奏

Acceptance/Hardening 模式下，验收文档完成后做一次 commit；
如有修复补丁，每个 fix 独立一个 commit。

推荐格式：

```txt
type(scope): short description
```

示例：
- `docs(vibe): add acceptance documentation suite`
- `fix(trading): prevent double-refund on cancel order`
- `fix(auth): use exact path matching for public routes`

## 可以 commit 的条件

- 当前 TODO 完成
- 验收标准满足
- `tsc --noEmit` 通过（前后端）
- 没有越界修改（不改无关文件）
- 没有破坏旧功能
- 文档同步更新

## 不能 commit 的情况

- 编译有 error
- 改了无关文件
- 顺手做了后续任务（如偷偷加新功能）
- 协议（PROTOCOL）改了但文档没更新
- 功能看似好了但旧功能坏了

## 必须 rollback 的情况

- AI 大范围重构（本次验收模式不做重构）
- 已完成能力被改崩
- 协议被偷偷改了
- 当前任务边界失控
- 安全红线触发（引入 SQL 拼接、移除认证检查等）

## 分支策略

本次验收在当前分支执行（main 或 dev），不创建新分支。
验收文档（.vibe/ 目录）作为项目知识资产保留。
