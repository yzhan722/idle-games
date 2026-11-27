# 素材与依赖来源登记

每个放进 `public/` 或 `src/` 的素材文件都要在下表登记一行，`npm run guard` 会核对。

## 现成素材（CC0）

| 文件 | 类型 | 来源 | 可商用依据 |
|---|---|---|---|
| `src/art/scroll.webp` | 远景画 | 陈汝言《仙山图》（元，14 世纪），克利夫兰艺术博物馆藏 1997.95，Open Access 全分辨率扫描的局部；裁切、调色（处理脚本 `C:\Project\_work\changming-art\tools\scroll.py`） | 博物馆标注 CC0，可商用、可修改、不强制署名（游戏里还没有制作名单，出处目前只写在本表）；页面：clevelandart.org/art/1997.95，2026-11-25 取得 |

## AI 生成的图

以下各张都由 Google Antigravity 的 `generate_image` 工具在 2026-11-25 生成的六张原图裁切、抠图、调色得到。工具没有标出底层图像型号，这里不替它填。

- 风格参考：`imggen-cm1.md` 把上面那张 CC0《仙山图》的局部（`ref\xianshan_ref.jpg`）列为可选参考，只取矿物颜料的颜色和山石笔法；`imggen-cm2a.md` 用的是自家生成的 `ref\key_ref.jpg`。除这两样外没有用别人的作品当参考，也没有裁用别人的画面。

- 提示词：`C:\Project\_work\changming-art\imggen-cm1.md`、`imggen-cm2a.md`（全文都是自己写的，不点名任何作品、作者或现有游戏）。
- 原图：`C:\Project\_work\changming-art\raw\`、`ref\`；处理脚本：`tools\build_assets.py`、`tools\matte.py`，可以从原图重新生成全部成品。
- 可商用依据：按 Google 生成式 AI 条款，Google 不主张对生成内容的所有权。**收费或上架前要按当时的条款复核一次**，并在商店页披露 AI 内容。

| 文件 | 用处 | 由哪张原图、怎样得到 |
|---|---|---|
| `src/art/scene.webp` | 三层山台整图 | `cm_scene_a`（提示词 `imggen-cm2a.md` 第 1 条），放大、四边羽化 |
| `src/art/pine.webp` | 老松 | `cm_scene_a`（提示词 `imggen-cm2a.md` 第 1 条） 裁切抠图 |
| `src/art/windrock.webp` | 迎风脊山石 | `cm_scene_a`（提示词 `imggen-cm2a.md` 第 1 条） 裁切抠图 |
| `src/art/spring.webp` | 寒泉 | `cm_scene_a`（提示词 `imggen-cm2a.md` 第 1 条） 裁切抠图 |
| `src/art/mist.webp` | 雾 | `cm_scene_a`（提示词 `imggen-cm2a.md` 第 1 条） 取雾的浓淡 |
| `src/art/tide.webp` | 黑潮 | `cm_key` 第二张（提示词 `imggen-cm1.md` 第 1 条） 裁谷底黑雾，去明暗、压成墨色 |
| `src/art/lamp1_dawn.webp` | 一档灯 晨火 | `cm_lamp_probe` 第一张（提示词 `imggen-cm1.md` 第 2 条） 抠图 |
| `src/art/lamp2_dawn.webp` | 二档灯 晨火 | `cm_lamp_probe` 第二张（提示词 `imggen-cm1.md` 第 2 条） 抠图 |
| `src/art/lamp3_dawn.webp` | 三档灯 晨火 | `cm_lamp_probe` 第二张（提示词 `imggen-cm1.md` 第 2 条） 抠图、铜件鎏金 |
| `src/art/lamp1_verdant.webp` | 一档灯 青火 | `cm_lamp_probe` 第一张（提示词 `imggen-cm1.md` 第 2 条） 抠图，灯火转色 |
| `src/art/lamp2_verdant.webp` | 二档灯 青火 | `cm_lamp_probe` 第二张（提示词 `imggen-cm1.md` 第 2 条） 抠图，灯火转色 |
| `src/art/lamp3_verdant.webp` | 三档灯 青火 | `cm_lamp_probe` 第二张（提示词 `imggen-cm1.md` 第 2 条） 抠图、铜件鎏金，灯火转色 |
| `src/art/lamp1_frost.webp` | 一档灯 霜火 | `cm_lamp_probe` 第一张（提示词 `imggen-cm1.md` 第 2 条） 抠图，灯火转色 |
| `src/art/lamp2_frost.webp` | 二档灯 霜火 | `cm_lamp_probe` 第二张（提示词 `imggen-cm1.md` 第 2 条） 抠图，灯火转色 |
| `src/art/lamp3_frost.webp` | 三档灯 霜火 | `cm_lamp_probe` 第二张（提示词 `imggen-cm1.md` 第 2 条） 抠图、铜件鎏金，灯火转色 |
| `src/art/d_ayan.webp` | 弟子 阿檐 | `cm_disciple_probe`（提示词 `imggen-cm1.md` 第 3 条） 抠图、换衣色 |
| `src/art/d_shilou.webp` | 弟子 石漏 | `cm_disciple_probe`（提示词 `imggen-cm1.md` 第 3 条） 抠图、换衣色 |
| `src/art/d_tingshuang.webp` | 弟子 听霜 | `cm_disciple_probe`（提示词 `imggen-cm1.md` 第 3 条） 抠图、换衣色 |
| `src/art/d_douqing.webp` | 弟子 豆青 | `cm_disciple_probe`（提示词 `imggen-cm1.md` 第 3 条） 抠图、换衣色 |
| `src/art/i_oil.webp` | 图标 灯油 | `cm_lamp_probe` 第一张（提示词 `imggen-cm1.md` 第 2 条） 裁灯火 |
| `src/art/i_star.webp` | 图标 星屑 | `cm_lamp_probe` 第二张（提示词 `imggen-cm1.md` 第 2 条） 裁灯顶宝珠，转色 |
| `src/art/i_insight.webp` | 图标 悟 | `cm_disciple_probe`（提示词 `imggen-cm1.md` 第 3 条） 裁结印的手 |
| `src/art/i_wish.webp` | 图标 愿 | `cm_lamp_probe` 第一张（提示词 `imggen-cm1.md` 第 2 条） 裁莲座，鎏金 |
| `src/art/i_tide.webp` | 图标 黑潮 | `cm_key` 第二张（提示词 `imggen-cm1.md` 第 1 条） 裁黑雾 |
| `src/art/ui_silk.webp` | 面板绢底 | `cm_key`（提示词 `imggen-cm1.md` 第 1 条） 裁夜空绢纹，拼成可平铺 |
| `src/art/ui_frieze.webp` | 云纹石边 | `cm_scene_a`（提示词 `imggen-cm2a.md` 第 1 条） 裁台沿 |
| `src/art/ui_ochre.webp` | 按钮底 | `cm_scene_a`（提示词 `imggen-cm2a.md` 第 1 条） 裁台面 |
| `src/art/realm.webp` | 突破插画 | `cm_key`（提示词 `imggen-cm1.md` 第 1 条） |
| `src/art/offline.webp` | 离线插画 | `cm_key` 第二张（提示词 `imggen-cm1.md` 第 1 条） |

## 程序绘制

- 光照、光晕、火星、脚下影子、灯位光圈、选中圈：`src/ui/` 下的 Canvas 2D 代码实时绘制，本项目自写。这些只做光效和操作提示，不当美术素材。
- 字体：使用玩家系统自带的楷体、黑体类字体，不随包分发。

## 依赖

运行时零依赖。开发依赖为 `vite`、`typescript`、`@types/node` 及其下级包，许可由 `scripts/check-licenses.mjs` 逐个检查，不进发行包。
