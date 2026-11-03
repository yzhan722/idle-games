# T1 美术整体评估与外部生成需求（2026-09-03）

本文档两件事：
1. 对当前 T1 美术做一次整体评估（在场景内、按运行尺寸看，不看孤立大图）。
2. 把仓库内生成器做不了、或不该由它决定的素材写成可直接交给 GPT / 外包的需求单。

评估基于真速试玩截图（桌面 1440×900、移动 390×844）与目标尺寸对照图。合同真源仍是 `frontend/src/assets/t1/contract.ts`，文件状态由 `npm run verify:art` 生成到 `docs/art/T1_ASSET_STATUS.md`，视觉验收记录在 `docs/art/T1_ASSET_VISUAL_ACCEPTANCE.md`。

---

## 0. 结论速览

| 项目 | 结论 |
|---|---|
| 风格统一度 | 良好。Drop #1（人物/三只怪/道具）是暖色厚涂、柔和边缘光；仓库生成件（树、技能、导航、logo、金币、P1）延续了同一语言，肉眼看不出两套来源。 |
| 大插画（280 / 180 / 232px） | 伐木工立绘、史莱姆、猴、蟹、白杨全部合格。**唯一空洞：森林管家 Boss** 仍是 SVG 苦脸占位，而它坐在最大的卡（232px）和 Boss 战最大头像（240px）上，是整章视觉落差最大的一处。 |
| 道具（72 / 48 / 32px） | 原木、木板、短剑、胸甲在四个尺寸都可读，透明无底板。合格。 |
| 图标（16–40px） | 本次修了两个：`nav-logging`（原 Drop #1 版在 22–28px 发糊）、`nav-woodworking`（原手推刨在 22px 读成金块）。现在四个导航图标的辨识度一致。技能三枚、logo、金币合格。 |
| P1 图标 | 本次补齐并接线：生命/攻击/防御（角色页 18/16px）、聊天（移动端 FAB 24px）。 |
| 非合同表面 | 仍有 emoji 回退：背包物品详情（🗡️）、制作弹窗材料行（🪵 📋）、生涯菜单各面板（成就/每日/商店）。前两处是代码问题不是素材问题（见 §D）。 |
| 体积 | 22 张 WebP 共 3.5 MB，全部是 1024–1254px 母版直接下发给 16–280px 的槽位。首屏（logo、金币、4 导航、白杨、右栏立绘）约 0.9 MB。见 §D 优化方案。 |

P0 文件通道 18/19，唯一缺口是 Boss；P1 4/4。判定仍为 **ART INTEGRATION IN PROGRESS**。

---

## 1. 交付规范（所有外部生成件通用）

把这一节整段贴给 GPT，再接具体需求。

```text
DELIVERY SPEC (WorkLife T1 art)
- Style: hand-painted fantasy game art, warm palette (oak browns, moss greens, cream parchment, cool steel), soft warm rim light, thick readable shapes, slight painterly texture. No outlines heavier than a hairline. No text, no watermark, no baked UI frame, no drop shadow onto the background.
- Background: fully transparent PNG. If transparency is not available, use a flat, uniform pure magenta #FF00FF background with no gradient/vignette — we key it out. Avoid magenta/purple in the subject.
- Composition: subject centered, fills 75–85% of the canvas, never touches the canvas edge (we use object-fit: contain; anything on the edge gets clipped).
- Sizes: square unless stated. Icons ≥ 512px, items ≥ 512px, illustrations ≥ 1024px, Forest Boss ≥ 1536px on the SHORTER side.
- One subject per image. No scene, no ground plane unless the brief says so.
- Deliver as PNG (we convert to WebP ourselves). File name = the key given in each brief.
```

安装方式（我来做）：文件放到 `frontend/src/assets/t1/<key>.webp`，不改任何 React；`npm run verify:art` 检查尺寸门限并重写状态文档；`ART_CAPTURE=1 npx playwright test e2e/art-qa.spec.ts` 做尺寸/透明/视口断言。

GPT 图像尺寸提示：ChatGPT 当前原生只出 1024×1024、1024×1536、1536×1024 三种。**这意味着它做不出 1536×1536**，见 §A 的三种处理路径。

---

## A. 森林管家 Boss（P0 阻塞项，最高优先级）

**Key:** `monsters/forest_boss`  **用途：** 森林 Boss 卡（232px）、Boss 战敌方头像（240px 桌面 / 104px 移动）。  
**合同：** `masterMinPx 1536`（短边）、透明、全身、不裁头不裁武器、比小怪更"大"的体量感。

**设定：** 名字"森林管家"，Lv10，机制"六成血举起树皮盾格挡 / 三成血自然之怒变快"。它不是邪恶怪物，是这片林子的老看守：厚重、慢、像一棵会走的老树桩，怒起来枝叶炸开。它要在同一张卡上压过果冻史莱姆、捣蛋小猴、铁壳寄居蟹（这三只是可爱偏写实的厚涂风）。

**必须有的读点（在 232px 下能看见）：** ①明显比小怪高的纵向体量；②左臂/一侧有一块可读的树皮盾（呼应格挡机制）；③头部有一处亮色焦点（苔藓冠、琥珀眼或一朵与史莱姆头顶同款的小花，暗示它是史莱姆们的"管家"）。

**不要：** 恐怖脸、骷髅、发光符文、盔甲、武器（它用拳头，文案里写了"管家的拳头很重"）、背景、地面阴影。

```text
PROMPT A-1 (recommended)
A single fantasy game monster illustration, full body, centered, on a fully transparent background (or flat #FF00FF if transparency is unavailable). Subject: "the Forest Steward" — a towering, broad-shouldered treant made of an ancient oak stump: gnarled bark body, thick root-like legs planted firmly, long heavy arms with fist-like knots, a rounded crown of moss and a few golden poplar leaves on top, two warm amber eyes, a calm stern expression (not evil). Its left forearm carries a thick slab of bark shaped like a shield. Hand-painted fantasy game art, warm oak browns and moss greens with a soft warm rim light, thick readable shapes, slight painterly texture. Whole figure visible with margin on all sides (fills about 80% of the canvas), no ground, no scene, no text, no frame.
Size: 1024x1536 portrait (see note).
```

```text
PROMPT A-2 (angrier variant, for the wrath phase reference only)
Same character as A-1 but in "nature's wrath": crown leaves flaring outward, amber eyes glowing brighter, mouth open in a roar, bark plates lifted along the shoulders. Same style, same transparent background, same full-figure composition.
```

**1536 门限的三条路径（需要你拍板）：**

1. **保持合同 1536（短边）**：GPT 的 1024×1536 竖图短边只有 1024，`verify:art` 会拒收。需要用能出 ≥1536×1536 的工具（Midjourney `--ar 1:1` 出 2048、Ideogram 2K、Stable Diffusion + 原生高分辨率），或外包画师按 2048×2048 交。
2. **接受 1024×1536 竖图并把合同改成"短边 ≥1024，且长边 ≥1536"**：这是一次合同修改（`contract.ts` + `scripts/verify-art.ts` 的 `Math.min` 判定），需要你明确同意；改了之后 GPT 产物可直接进。
3. **把 Boss 门限降到 1024**：运行时最大 240px，1024 已是 4.3× 过采样（2× DPR 屏上仍有 2.1×）。同样是合同修改。仓库里已有一张 1024 候选（`t1-forest-boss-production-candidate.png`，带烘焙棋盘格，需重出透明版）。

我不会自行改门限或做放大。你选定后告诉我，我一次装好。

---

## B. 导航图标（可选：如果想让外包/GPT 出一套正式版）

本次已用仓库生成件把四个导航图标拉齐（斧劈树桩 / 手锯横木板 / 黄铜罗盘 / 伐木工半身），验收通过。如果最终希望由外部美术统一交付，用下面这条一次出四张，风格与相互体量一致：

```text
PROMPT B
Four separate game UI tab icons in one consistent style, each delivered as its own square image on a transparent (or flat #FF00FF) background, each subject filling ~80% of its canvas, designed to stay legible at 24 pixels:
1) "Work": a woodcutter's axe buried in a short tree stump, 3/4 high angle, only stump + axe.
2) "Craft": a hand saw laid diagonally across a single pale plank, only saw + plank.
3) "Adventure": a round brass compass with a small green leaf as the needle.
4) "Character": a head-and-shoulders bust of a young woodcutter with a green hood and an axe handle over one shoulder, facing slightly right.
Hand-painted fantasy game icon style, warm oak browns, cool steel, soft warm rim light. No text, no frames, no background scene.
Size: 1024x1024 each. Keys: ui/nav-logging, ui/nav-woodworking, ui/nav-adventure, ui/nav-character.
```

---

## C. T1.5 新表面（需要新增少量宿主代码，建议先拍板再生成）

这些是试玩里"没有画面"的时刻。它们不在 T1 合同里；生成后我需要为每一处加几行宿主代码和 CSS。按价值排序。

### C-1 登录页主视觉（价值最高）
现在登录页只有标题和一个 canvas 粒子，第一印象没有世界观。  
**用途：** 登录卡背后/上方的横幅。**尺寸：** 1536×1024（GPT 原生），不透明，允许场景。**Key：** `ui/login-hero`。

```text
PROMPT C-1
A wide painterly fantasy game key-art: dawn in a quiet forest clearing, a young woodcutter in a green hood seen from behind, axe on shoulder, walking a dirt path toward a small roadside poplar tree with golden leaves; a wooden signpost with a blank plank; soft morning haze, warm oak browns and moss greens, gentle light shafts. Hand-painted, calm, inviting, "first day at work" mood. No text, no UI, no characters facing camera. 1536x1024.
```

### C-2 森林区域横幅
冒险页的区域标签"呼呼大睡森林"只是文字按钮；一张 3:1 横幅能让"区域"有地方感，也为下一章"叮当响矿山（未开放）"预留同规格灰显版。  
**尺寸：** 1536×1024 出图后我裁成 3:1。**Key：** `regions/forest-banner`、`regions/mine-banner`。

```text
PROMPT C-2a (forest)
A wide painterly fantasy landscape banner of a sleepy sunlit forest edge with tall poplars, soft moss, a few drifting seeds, no characters, no creatures, no text; warm greens and golds, gentle depth haze. Composition keeps the horizon in the upper third so the bottom half can sit behind UI text. 1536x1024.

PROMPT C-2b (mine, locked chapter)
Same style: the mouth of a mountain mine at dusk, wooden support beams, a cart rail vanishing inside, a faint warm lantern glow deep in the tunnel, cool slate blues with one warm accent; no characters, no text. 1536x1024.
```

### C-3 章节完成卡 / Boss 击杀纪念
Boss 死后只有一行文字"第一章完成"。一张 4:3 的"结算卡"插画能把 11 分钟的旅程收住。  
**尺寸：** 1536×1024 或 1024×1024。**Key：** `ui/chapter1-complete`。

```text
PROMPT C-3
Painterly fantasy illustration, celebratory but quiet: the young woodcutter sitting on a fresh tree stump at the forest edge at golden hour, axe planted beside him, a small pouch of coins and a wooden shortsword laid on the stump, the forest steward's bark shield leaning against it as a trophy; soft warm light, no text, no UI. 1536x1024.
```

### C-4 战斗结果印章（胜利 / 失败）
胜利面板和失败面板都只有文字。两枚 512px 的木刻印章图标可以复用在 toast 和结算面板。  
**Key：** `ui/stamp-victory`、`ui/stamp-defeat`。透明。

```text
PROMPT C-4
Two separate game UI stamp icons on transparent backgrounds, hand-painted wood-carving style, each ~80% of a 1024x1024 canvas, no text:
1) Victory: a round carved oak medallion with a laurel of poplar leaves around a small upright axe, warm gold highlights.
2) Defeat: the same medallion shape but split by a single clean crack, leaves wilted and grey-green, cool muted tones.
```

### C-5 空装备槽剪影
角色页"主手 空 / 上衣 空"是纯文字；右栏 8 个槽位用单字占位。两枚 512px 的暗色剪影（剑形、上衣形）放在空槽里，比文字更像"这里可以放东西"。  
**Key：** `ui/slot-weapon-empty`、`ui/slot-chest-empty`。透明，单色深棕 #4a3a28，无高光。

### C-6 稀有掉落道具（仅当掉落系统真正发放后再做）
怪物弹窗承诺"微光水晶 50% / 铜矿石 50% / 小树枝 2%"，但后端目前不发放。等系统落地再出：`materials/crystal_1`（微光水晶）、`materials/ore_1`（铜矿石）、`materials/twig`（小树枝），道具规格同原木/木板（512px+，透明，72/48/32 可读）。

---

## D. 优化建议（工程侧，不需要新素材）

### D-1 体积：母版直发 → 构建期派生
当前 22 张 WebP 共 3.5 MB，例如 `armor_wood_chest.webp` 363 KB 只在 72px 槽位显示，`stat-def.webp` 270 KB 只在 18px 显示。建议：
- 保留 `frontend/src/assets/t1/**` 为母版（不动 Drop 文件）。
- 加一个 `scripts/build-art-derivatives.ts`：按 `contract.ts` 的 `runtimeDesktopPx/runtimeMobilePx` 生成 2× 尺寸的派生 WebP（图标 64px、道具 144px、插画 560px、Boss 520px），输出到 `frontend/src/assets/t1-runtime/`。
- `T1Art` 输出 `srcset`（派生为默认，母版为 3× 兜底）。
- 预期：首屏 0.9 MB → 约 90 KB；整套 3.5 MB → 约 350 KB。合同、验收、Drop 流程都不变。

### D-2 emoji 回退（两处代码问题）
- 背包物品详情弹窗（`modalType === 'item'`）用 `getItemIcon` 输出 🗡️，应改为 `T1ItemIcon`（同一文件里装备选择器已经这么做了）。
- 制作弹窗"材料需求"行用 🪵/📋，应改为 `T1ItemIcon`（32px，`item-icon-compact` 规格已存在）。
两处都在 `NewGameInterface.tsx`，该文件当前有另一份未提交改动在进行，本次没有动它，等那份改动落地后我来改。

### D-3 一致性小项
- logo（芽+斧+树桩）与 `nav-logging`（斧+树桩）在 28px 下母题接近；如果做 §B 正式版，可考虑 logo 保留"芽"为主体、把斧头缩小，拉开两者。
- 右栏 8 个装备槽（裤/鞋/副手/帽/饰品×2）在第一章没有对应道具，建议按章节隐藏，而不是为它们补图。
- 生涯菜单各面板（成就 453 条、签到 21 天、商店 30+ 商品）全部是 emoji；这是 T2+ 的体量问题，不建议在 T1 逐个补图，先解决面板本身的分批开放。

---

## E. 验收清单（每一张新素材进仓前）

- [ ] 尺寸 ≥ 合同 `masterMinPx`（短边），未放大
- [ ] 真透明（或纯 #FF00FF 可键出），主体不贴边，无烘焙底板/边框/文字
- [ ] 在运行尺寸（图标 16–40 / 道具 32–72 / 插画 140–280）下主体轮廓可读，与相邻同类素材体量一致
- [ ] `npm run verify:art` 通过，`docs/art/T1_ASSET_STATUS.md` 显示 PRODUCTION
- [ ] `ART_CAPTURE=1 npx playwright test e2e/art-qa.spec.ts` 通过（桌面 + 移动）
- [ ] `docs/art/T1_ASSET_VISUAL_ACCEPTANCE.md` 记录来源（`drop-NN` / `generated` / `gpt`）与 ACCEPTED 理由
