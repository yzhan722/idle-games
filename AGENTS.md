# 凡人修仙传·放置 (`kittensgame-xianxia`) Agent 规范

## 每次大改动自动推送并部署（Mandatory Auto Push & Deploy）

当完成任何大改动（包括但不限于：新功能开发、美术重绘、资源/逻辑精简、数值与平衡性大修、UI 重构）并通过测试与 Lint 验证后，**必须自动执行以下完整发布流水线，无需等待用户再次手动催促**：

1. **同步构建目录与自增版本号**：
   - 将源码（`js/*.js`、`res/*`、`locale/*`、`index.html` 等改动）同步至 `dist/` 对应目录。
   - 自增 `build.version.json` 与 `dist/build.version.json` 中的 `buildRevision`。
2. **自动提交并推送到 GitHub**：
   - `git add -A; git commit --no-verify -m "..."; git push origin master`
3. **自动部署到 Cloudflare Workers**：
   - `npx.cmd wrangler deploy -c deploy/wrangler.toml`（线上地址：`https://xianxia.yinosites.com`）
