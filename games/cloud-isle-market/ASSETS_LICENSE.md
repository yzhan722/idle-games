# 素材与依赖来源登记

收费或上架前逐行复核一次。「待换」的在换掉之前不得用于商店页和收费版本。

## 引擎与字体

| 项目 | 来源 | 可商用依据 |
|---|---|---|
| Godot Engine 4.3 | 官方发行版 | MIT 许可，随包附许可文本 |
| `assets/fonts/NotoSansSC-*.otf` | Noto Sans SC | SIL OFL 1.1，全文在 `assets/fonts/LICENSE-OFL.txt`，随包附带 |

## 声音

| 文件 | 来源 | 可商用依据 |
|---|---|---|
| `assets/sfx/*.wav`（11 个） | 自己写的合成脚本 `tools/generate_sfx.py` 生成，没有采样别人的录音 | 自有 |

## 图片

全部像素图由 AI 生图工具生成后裁切、抠图、缩放得到，没有使用他人作品的文件。生图工具为 Google Antigravity 的 `generate_image`；按 Google 生成式 AI 条款，Google 不主张对生成内容的所有权，上架前按当时条款复核，并在商店页披露 AI 内容。

| 类别 | 提示词依据 | 状态 |
|---|---|---|
| 2026-11-17 起新增的图（建筑、道具、菜品、图标、天气、节庆） | `C:\Project\_work\loop\imggen-r28.md` 起各清单，提示词自写，不点名任何作品 | 可用 |
| `assets/pixel_art/guests/`（16 张） | 由上面的现有图改色得到（`_work/cloud-isle-ui/guests/recolor.py`） | 临时，等正式图 |
| 最早一批：岛屿、六种伙伴、旅人、农舍、摊位、果树、树屋、凉亭、研钵、坩埚、菜品图集、底栏与按钮外框 | 2026-11-03 之前的生图，提示词没有留存；成品看过，没有现有作品的角色、标志或文字 | 来源不全，建议重出 |
| `assets/pixel_art/crops/crops_sheet*.png` | 原始图文件名里带有现有网络游戏的名字，说明当时的提示词点过名 | **待换** |
| `assets/pixel_art/ui/icons_ui.png` | 同上（金币、蓝星、六个按钮图案切自那张图） | **待换** |
| `assets/pixel_art/buildings/decor_scarecrow.png` | 稻草人戴橙色斑点蘑菇帽、蘑菇脸，和一款现有网络游戏的怪物相近 | **待换** |

## 已移出工程（2026-11-26）

- `assets/pixel_art/raw_sheets/` 四张原始图：里面有和现有网络游戏怪物几乎一样的绿水滴、橙蘑菇、蝴蝶结小猪，以及希腊柱云岛和枫叶界面。游戏没有用到这几张，但以前会被打进安装包。
- `tools/generate_pixel_art.py`、`tools/slice_maple_assets.py`：生成和裁切上述图的旧脚本。

备份在 `C:\Project\_work\cloud-isle-ui\retired\`，不再进仓库。
