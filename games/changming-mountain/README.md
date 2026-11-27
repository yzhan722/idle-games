# 长明山（暂名）

原创修仙放置新作的小样：在山的剖面图上布灯，让三种火的光混出不同光色，弟子坐在光里修行，定时来的黑潮会让照不到的灯蒙灰。

立项草案：仓库根目录 `docs/xianxia-remake-plan.md`。开发规则与隔离规则：[AGENTS.md](AGENTS.md)。

```powershell
npm install          # 在仓库根目录或本目录执行
npm run dev          # 本地试玩 http://localhost:5186
npm run verify       # 权利检查、类型检查、测试、数值模拟
npm run build        # 产物在 dist/
```

- `src/core`：纯逻辑（布灯、混色、灯谱、黑潮、守夜、离线、存档）。
- `src/ui`：画面与界面；`src/art` 是美术图（AI 生图加一张 CC0 古画），来源见 `ASSETS_LICENSE.md`。
- `scripts/simulate.ts`：三种水平的模拟玩家各玩二十一局，卡死或平均过快过慢会报错；另有「照提示」「乱摆」两种新手，检查照提示能守住第一夜、修到第三层，乱摆多半不能，两种都不会卡在五盏灯。
