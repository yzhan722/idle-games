# 素材来源与授权（`MC-COM1`，2026-11-26）

只写查得到的依据（文件元数据、git 历史、源码）。查不到的一律写「未知，需核实」，**核实前不要当作可商用**。

## 图片（`public/`，共 187 个文件：176 个原有 + 11 个由它们缩小的小图）

| 类别 | 文件 | 来源 | 依据 | 授权 |
| :-- | :-- | :-- | :-- | :-- |
| 封面大图 | `assets/icons/title_splash_bg.jpg` | Google 生成式 AI 生成 | 文件内 C2PA 元数据：`Created by Google Generative AI`、`trainedAlgorithmicMedia`、SynthID 水印，签发方 Google LLC（**这些元数据在原图里**，见下方「重采样」） | 按当时使用的 Google 产品条款，**用的是哪个产品 / 账号未知，需核实** |
| 图标：第一批 | `assets/icons/` 98 个 + `assets/` 根目录 3 个（`icon_weapon_*`、`icon_tactical_airdrop`），上面那张封面算在 98 个里 | 未知，需核实 | 2026-11-03 随 `ddb46d6c` 一次导入；PNG 里没有任何来源元数据 | 未知，需核实 |
| 图标：第二批 | 29 个（MC-1～MC-9） | 未知，需核实 | `6c5c8d95`，2026-11-15 | 未知，需核实 |
| 图标：第三批 | 41 个（MC-10～MC-17） | 未知，需核实 | `2274b60d`，2026-11-19 | 未知，需核实 |
| 图标：第四批 | 4 个（MC-18） | 未知，需核实 | `ca35b1a4`，2026-11-20 | 未知，需核实 |
| 小图 | `race_*_sm.png` 7 个、`meta_*_sm.png` 4 个 | 由同名原图缩小 | `docs/PERF.md` 第 1 节 | 跟随原图 |
| 网站图标 | `favicon.svg` | 本项目手写 SVG 代码 | 文件是渐变 + 图形代码 | 自有 |

要点：
- 图标里有 7 个种族吉祥物（`race_*.png`）、28 个天赋图标、`hud_idol_avatar.png` 等角色图，最需要先查来源。
- 4 组是完全相同的图（原图 md5 一致，缩小后尺寸可能不同）：`decor_plant` = `ui_jungle_temple`、`env_tailwind_belt` = `vine_swing`、`hud_hammer` = `upg_card_champion`、`hud_pyro` = `upg_card_power`，属于借用已有图占位。
- `hero_stage_bg.jpg` 的引用已去掉（图一直不在仓库里，样式也一直被盖掉，从没显示过）。
- **重采样（2026-11-26）**：164 张 PNG 缩到显示尺寸的 2～3 倍，`title_splash_bg.jpg` 重编码，没有新画内容。封面重编码后 C2PA 签名失效所以没带，改写入 XMP `DigitalSourceType = trainedAlgorithmicMedia` 继续标明是 AI 生成；带完整元数据的原图在 `C:\Project\_work\mob-control-3d\assets_before_resize\`，取证用那一份。

## 3D 模型与贴图

| 类别 | 来源 | 依据 | 授权 |
| :-- | :-- | :-- | :-- |
| 波波兵、领队、Boss、机甲、场景、赛道 | 运行时用代码生成的几何 | `src/game/HumanoidModels.ts`、`World3D.ts`、`src/game/modes/`、`src/game/world/`；仓库里没有 glb / gltf / obj / fbx | 自有代码 |
| 路面、门、海面、云、阴影等贴图与着色器 | 运行时用 Canvas / GLSL 生成 | `src/game/SceneThemes.ts` | 自有代码 |
| 环境反射 | three.js 自带 `RoomEnvironment`（程序生成，不含图片） | `World3D.ts` import | MIT（随 three.js） |

## 音频

| 类别 | 来源 | 依据 | 授权 |
| :-- | :-- | :-- | :-- |
| 全部音效与背景音乐 | Web Audio 实时合成 | `src/audio/SoundManager.ts`；仓库里没有 mp3 / ogg / wav | 自有代码 |

## 字体

| 类别 | 来源 | 依据 | 授权 |
| :-- | :-- | :-- | :-- |
| 全部界面文字 | 玩家设备自带字体（PingFang SC、微软雅黑、Noto Sans SC 等按顺序取） | `src/style.css` 只有 `font-family`，没有 `@font-face`，没有字体文件 | 不打包分发，无需授权 |

## 代码依赖

| 包 | 版本 | 授权 | 依据 |
| :-- | :-- | :-- | :-- |
| three | 0.170.0 | MIT | `node_modules/three/package.json` |
| vite / typescript / @types/three | 仅开发构建用，不随游戏分发 | 见各包 | `package.json` |

## 还要做的

1. 向当时出图的人要生成记录（用的模型、账号、提示词、是否有参考图），补到上表。
2. 角色类图片优先：7 个种族、`hud_idol_avatar`、`skin_*`、`pet_*`。
3. 商用前确认所用 AI 产品的条款允许商用。
