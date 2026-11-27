# 素材与第三方来源（AR-COM1）

2026-11-26 按仓库、提交记录和 `C:\Project\_work\loop` 里的出图清单整理。查不到的写「未知，需核实」。**没有一类已经达到「可商用」标准**；不是法律意见。仓库根目录和本游戏目录都没有 `LICENSE` 文件。

## 汇总

| 类 | 数量 | 来源 | 商用依据 |
|---|---|---|---|
| 角色图 `hero_*` | 28 | 未知，需核实 | 没有；且形象与品牌联想强（`docs/RENAME_CHECKLIST.md`） |
| 其余首批图 | 49 | 未知，需核实 | 没有 |
| AR-1～AR-8 图 | 55 | 未知，需核实 | 没有 |
| AR-9～AR-15 图 | 42 | 图像模型生成（Google Antigravity 的 `generate_image`），有提示词清单 | 未知，需核实（账号、套餐、当时条款） |
| AR-16～AR-17 图 | 10 | 复制本游戏已有图 | 跟随原图 |
| 音乐 / 音效 / 环境声 | 全部 | 代码用 WebAudio 实时合成，没有音频文件 | 代码归属未写明；旋律没做过比对 |
| 语音 | 全部 | 设备自带的 `speechSynthesis` | 由设备 / 浏览器提供，没有录音 |
| 字体 | 0 个文件 | 只按名字调用系统字体 | 不随游戏分发字体 |
| 识别脚本与模型 | 4 个外部地址 | jsDelivr、Google Storage | 仓库里没有许可证原文，未知，需核实 |

## 图片（`public/assets`，184 张）

2026-11-26 有 135 张按显示尺寸缩小重存（内容不变，来源不变，明细 `docs/asset_resize.csv`），原图备份在 `C:\Project\_work\ar-survivor\assets_before_resize\`。

### 第一批 77 张：2026-11-03 一次导入（提交 `180ddb79`）

来源：未知，需核实。仓库里没有提示词、没有作者、没有购买或授权记录；导入前「一直没有版本管理」（提交说明）。

- 角色 28：`hero_*.webp`（`hero_attack` 尾巴有绿幕残边）。
- 场景、家具、食物、玩具：`bg_healing_room`、`furn_lamp`、`furn_pc`、`furn_tree`、`food_bento`、`food_cake`、`food_rice`、`food_tea`、`toy_duck`、`toy_whale`、`toy_yarn`、`prop_alarm`、`prop_cushion`。
- 装扮、怪物、目标：`item_aura`、`item_bow`、`item_crown`、`mon_bat`、`mon_boss`、`mon_elite`、`mon_slime`、`star_goal`。
- 界面与特效：`ui_btn_camera`、`ui_btn_crouch`、`ui_btn_jump`、`ui_btn_rotate`、`ui_btn_scan`、`ui_btn_sound`、`ui_coin`、`ui_food_icon`、`ui_hp_icon`、`ui_joy_base`、`ui_joy_stick`、`ui_mode_pet`、`ui_mode_star`、`ui_mode_work`、`ui_rps_paper`、`ui_rps_rock`、`ui_rps_scissors`、`ui_shop`、`upg_blade`、`upg_blaster`、`upg_boots`、`upg_magnet`、`vfx_angry`、`vfx_gem`、`vfx_heart`、`vfx_note`、`vfx_sparkle`、`vfx_zzz`。

### 第二批 55 张：AR-1～AR-8（提交 `56c0cd61`，2026-11-12～11-15）

来源：未知，需核实。路线图只写「手绘去底 / 奶油手账去底 `.webp` 贴图」，没有作者、工具或提示词。

`bg_aquarium_room`、`cocoa_marshmallow_topping`、`furn_musicbox`、`item_shell_clip`、`item_star_wreath`、`knit_cloud_pillow`、`knit_star_coaster`、`knit_whale_scarf`、`pastry_pudding_tart`、`pastry_souffle`、`pastry_whale_macaron`、`plant_blue_hydrangea`、`plant_peach_succulent`、`plant_star_lily`、`prop_study_book`、`radio_vinyl_note`、`sk_cat_lightning`、`sk_crit_charm`、`sk_frost_bubble`、`sk_onigiri_heal`、`sk_star_phantom`、`stamp_goodnight_moon`、`sticker_lace_garland`、`sticker_pressed_daisy`、`sticker_whale_stamp`、`tea_blueberry_foam`、`tea_osmanthus_milk`、`tea_peach_oolong`、`tea_platter_signature`、`ui_badge_shift`、`ui_btn_album`、`ui_btn_chat`、`ui_btn_cocoa_bar`、`ui_btn_collage_frame`、`ui_btn_cozy_radio`、`ui_btn_crochet_basket`、`ui_btn_musicbox`、`ui_btn_pomodoro`、`ui_btn_teatime`、`ui_btn_terrarium`、`ui_btn_theme`、`ui_btn_weekly_journal`、`ui_mood_blush`、`ui_pin_star`、`ui_stamp_focus`、`upg_super_teablade`、`upg_super_whale`、`vfx_season_autumn`、`vfx_season_spring`、`vfx_season_summer`、`vfx_season_winter`、`win_dusk`、`win_morning`、`win_noon`、`win_starry`。

### 第三批 42 张：AR-9～AR-15（提交 `9409d111`，2026-11-18 入库）

来源：图像模型生成。依据是每轮的出图清单（提示词逐条在内，要求用 Antigravity 的 `generate_image`）：

| 轮 | 清单 | 图 |
|---|---|---|
| AR-9 | `_work/loop/imggen-r28.md` | `ui_btn_pressed_flowers`、`ui_btn_telescope`、`pressed_sakura_bookmark`、`pressed_ginkgo_bookmark`、`pressed_babysbreath_bookmark`、`star_chart_card` |
| AR-10 | `imggen-r31.md` | `ui_btn_watercolor_easel`、`ui_btn_mailbox`、`watercolor_rainy_window`、`watercolor_palette`、`letter_envelope`、`stamp_whale` |
| AR-11 | `imggen-r34.md` | `ui_btn_bento_kitchen`、`ui_btn_memory_puzzle`、`bento_box_finished`、`onigiri_trio`、`puzzle_piece_memory`、`memory_wall_frame` |
| AR-12 | `imggen-r37.md`、`spec-r37.json` | `ui_btn_kitten_corner`、`ui_btn_greeting_card`、`kitten_ginger`、`kitten_tuxedo`、`cat_food_bowl`、`handmade_card` |
| AR-13 | `imggen-r40.md`、`spec-r40.json` | `ui_btn_picnic_basket`、`ui_btn_diary`、`picnic_blanket`、`picnic_sandwich`、`diary_page`、`diary_sticker` |
| AR-14 | `imggen-r43.md`、`spec-r43.json` | `ui_btn_pottery_wheel`、`ui_btn_aroma_table`、`pottery_cup`、`pottery_vase`、`aroma_bottle`、`aroma_diffuser` |
| AR-15 | `imggen-r46.md`、`spec-r46.json` | `ui_btn_star_projector`、`ui_btn_rain_corner`、`star_projector`、`constellation_card`、`rain_cushion`、`rain_chime` |

还缺：用的是哪个账号和套餐、生成当日的服务条款、成图会话记录（原图在 `%USERPROFILE%\.gemini\antigravity\brain\<会话>` ，没有逐张对过）。发行地若要求标注 AI 生成内容，这一批要标。

### 第四批 10 张：AR-16、AR-17 的占位图

复制自本游戏已有图（`_work/loop/art-debt.md` R49、R51），权利跟随原图：

| 图 | 复制自 | 原图属于 |
|---|---|---|
| `ui_btn_embroidery` | `ui_btn_crochet_basket` | 第二批 |
| `ui_btn_hearth_corner` | `ui_btn_cocoa_bar` | 第二批 |
| `embroidery_hoop` | `memory_wall_frame` | 第三批 |
| `embroidery_patch` | `sticker_pressed_daisy` | 第二批 |
| `floor_heater` | `knit_cloud_pillow`（记录如此，字节不同） | 第二批 |
| `roasted_snack` | `pastry_souffle` | 第二批 |
| `ui_btn_wardrobe` | `knit_whale_scarf` | 第二批 |
| `ui_btn_storybook` | `prop_study_book` | 第二批 |
| `storybook_page` | `diary_page` | 第三批 |
| `story_bookmark` | `pressed_babysbreath_bookmark` | 第三批 |

21 张图带 ICC 配置，没有作者、版权类元数据。

## 音频

`public/audio.js` 全部用 WebAudio 振荡器和噪声实时合成，`public` 里没有任何音频文件，也没有 `fetch` 音频。

- 背景音乐 3 首（晴空卡林巴、星海摇篮曲、奶油下午茶）、伴眠曲 3 首（星摇篮曲、雨后风铃、云端圆舞）、电台 3 档，旋律是代码里的频率数组。作曲来源：未知，需核实；没有和已有曲子做过旋律比对。
- 音效、雨声、炉火、风铃：同样是合成。
- 角色「气泡音」是合成音节，不是录音。

## 语音

用浏览器的 `speechSynthesis`，挑一个中文音色，音高 1.48。音色是设备或浏览器的，游戏不分发；部分浏览器的在线音色会联网合成。没有真人配音，没有克隆音色。

## 字体

`style.css` 只写了系统字体名（`PingFang SC`、`Hiragino Sans GB`、`Microsoft YaHei`、`Kaiti SC`、`STKaiti`、`KaiTi`、`BiauKai`），没有 `@font-face`，不分发字体文件。拍立得照片用这些系统字体把文字画进图里：系统字体的图像化使用条款未知，需核实。

## 识别脚本与模型

见 `docs/THIRD_PARTY.md`：`@mediapipe/tasks-vision` 0.10.14、`hand_landmarker.task`、`efficientdet_lite0.tflite`。仓库里没有许可证原文：未知，需核实；自托管前从包和模型页取原文放进仓库。

## 代码

没有引入第三方 JS 库（除上面的识别脚本）。代码的作者和许可没有写明：未知，需核实。

## 要补的

1. 第一、二批 132 张：找到来源，或整批换掉（角色 28 张无论如何要换，见改名方案）。
2. 第三批：补账号、套餐、条款截图。
3. 旋律比对一次。
4. 识别组件的许可证原文。
