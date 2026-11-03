# 《沉默侦探：千纸鹤的约定》— 运行与开发说明

一款基于 **Ren'Py 8.5.3** 引擎的校园推理 AVG（文字冒险游戏），改编 / 续写自 `AVG项目喂料文档.md`。

主线：**沉默侦探 + 校园推理**。沉默寡言的天才侦探少女「墨墨」，与一个走到哪儿倒霉到哪儿的转学生（玩家），在「万事屋」一起接案，层层揭开她四年前那桩「幼女侦探」旧案的真相。

---

## 一、目录结构（自包含，引擎 SDK 就在项目里）

```
avg/
├─ run.bat / lint.bat / test.bat / build.bat   # 一键：启动 / 静态检查 / 全部测试与门禁 / 打包（win+mac+linux）
├─ icon.ico                   # Windows exe 图标（gen_gui.py 由窗口图标生成）
├─ renpy-8.5.3-sdk/           # Ren'Py 引擎（已随项目放置，不需要另装）
├─ dists/                     # 打包产物（SilentDetective-1.0.0-win.zip / -mac.zip / -linux.tar.bz2）
├─ game/                      # Ren'Py 工程本体
│  ├─ options.rpy             # 工程配置 + 打包排除规则 + 启动画面
│  ├─ definitions.rpy         # 角色 / 变量 / 结局判定 / 立绘与背景注册 / 线索与羁绊反馈
│  ├─ gameplay.rpy            # 推理玩法：证据栏、羁绊面板、推理反馈、艾丽丝提示、线索提示条
│  ├─ extra.rpy               # 章节选择、鉴赏页（结局 / 画廊 / 音乐室）、进度与成就自动记录
│  ├─ achievements.rpy        # 14 项成就的定义、解锁提示条、成就分页
│  ├─ credits.rpy             # 结局后的制作人员滚动字幕
│  ├─ script.rpy              # 入口 label start + 序章
│  ├─ chapter1.rpy ~ chapter6.rpy   # 第一至五章 + 终章（五种结局 + 隐藏后日谈）
│  ├─ interlude.rpy           # 两段间章
│  ├─ screens.rpy / gui.rpy   # 界面
│  ├─ tl/schinese/common.rpy  # 引擎内置字串的简体中文翻译（复制自 SDK 启动器）
│  ├─ images/ audio/ fonts/ gui/
│  ├─ lighting.rpy            # 由 tools/bg_lighting.py 生成：每张背景的立绘色温/亮度表 BG_LIGHT
│  ├─ presplash.png           # 引擎加载期的启动图（黑底纸鹤 + 标题，gen_gui.py 一并生成）
│  └─ tests/                  # 自动化用例（不会被打进发行包）：autoplay.rpy 通关/截图，ui_shots.rpy 界面回归截图
├─ tools/                     # Python 工具（需要 Pillow + numpy）
│  ├─ slice_sprites.py        # 绿幕表情表 → 抠像切片 → 统一胸像立绘（核心流水线）
│  ├─ place_bg.py             # 素材/bg1~10.png → 1280x720 的 10 张手绘背景
│  ├─ place_generated.py      # 素材/generated/ 的 AI 生成 CG/背景 → 裁 16:9 → 1280x720
│  ├─ audit_assets.py         # 素材门禁：144 立绘 + 144 侧头像 / 19 背景 / 18 CG / 27 音频 / 41 GUI + presplash + icon.ico / 字体 全量体检
│  ├─ audit_alpha.py          # 体检：立绘透明度 / 白边残留
│  ├─ fix_typography.py       # 文案门禁：台词内 ASCII 引号 → “ ”、省略号/破折号/全角标点规范化（--check 只报告）
│  ├─ check_lines.py          # 台词长度门禁：超过 --max（默认 120 字）的 say 行
│  ├─ bg_lighting.py          # 分析每张背景中央区域的色温/明度 → 写出 game/lighting.rpy（立绘随场景调色）
│  ├─ gen_gui.py / gen_audio.py                # GUI 41 张纹理 + presplash + icon.ico 合成、BGM/SFX 编曲渲染
│  ├─ gen_art.py / gen_cg.py                   # 早期程序化占位图生成器（已不再使用，保留用于校准门禁）
│  └─ rename_sprite_tags.py   # 一次性迁移脚本（立绘 tag 改名，已执行过）
├─ 素材/                      # 原始素材：绿幕表情表、墨墨/主角透明图、背景原图、generated/（AI 生成 CG 与背景原图）
├─ 设计文档/                  # 01_人物设定.md、02_章节大纲与结局.md
├─ AVG项目喂料文档.md  素材需求.md
```

## 二、运行 / 检查 / 测试 / 打包

| 操作 | 方式 |
|---|---|
| 直接玩 | 双击 `run.bat`（等价于 `renpy-8.5.3-sdk\renpy.exe <项目目录>`） |
| Ren'Py 启动器 | 双击 `renpy-8.5.3-sdk\renpy.exe`，首次会让你选"项目目录"，选 `avg` 的**上级目录**（如 `D:\project`），列表里就有 `avg` |
| 静态检查 | `lint.bat`，检查未定义的图片 / 标签 / 变量 |
| 自动通关测试 + 全部门禁 | `test.bat`，见下文（routes / shots / uiaudit / 素材 / 文案 / 台词长度） |
| 打包 | `build.bat` 同时产出 Windows / macOS / Linux 三个包到 `dists\`（`build.bat win` 只打 Windows）；SDK / 素材 / 工具 / 文档 / 测试都已在 `options.rpy` 里排除 |
| 调试 | 游戏内 **Shift+O** 控制台，**Shift+R** 重载脚本 |

### 自动化通关测试

`game/tests/autoplay.rpy` 用 Ren'Py 自带的 testcase 系统把游戏从头到尾跑四遍，各自按一种策略选择选项，
并断言到达的结局：

| 策略 | 选项规则 | 预期结局 |
|---|---|---|
| best | 全选第一项 | TRUE END + 隐藏结局 |
| no_truth | 同上，但第三章不说出对周可的怀疑 | GOOD END |
| mixed | 推理全对，其余选项首/末交替 | NORMAL END |
| worst | 全选最后一项（推理连错） | BAD END |

四条路线全部跑完约 10 秒。另有 `shots` 套件把主菜单、序章前两幕、序章千纸鹤 CG、第一章签名书 CG 与章末夕阳字幕、
隐藏结局的万事屋场景与双鹤 CG、终章对峙 CG 与旧楼场景截到 `tests/screenshots/`，用来人工核对立绘比例、站位、
CG 关键主体与对话框的遮挡关系；`uiaudit` 套件（`game/tests/ui_shots.rpy`）则把全部界面截成 `ui_*.png`：
主菜单 / 读档 / 设置 / 帮助 / 关于 / 章节选择 / 结局收集 / 画廊与放大查看 / 退出确认、起名输入框、对话 + HUD、
羁绊面板、证据面板、历史、存档与自动存档页、提示条、选项、章节卡、结局卡。改界面后先跑它再看图。
命令行等价写法：

```
renpy-8.5.3-sdk\lib\py3-windows-x86_64\python.exe renpy-8.5.3-sdk\renpy.py . test routes --report-detailed
renpy-8.5.3-sdk\lib\py3-windows-x86_64\python.exe renpy-8.5.3-sdk\renpy.py . test shots --overwrite-screenshots
renpy-8.5.3-sdk\lib\py3-windows-x86_64\python.exe renpy-8.5.3-sdk\renpy.py . test uiaudit --overwrite-screenshots
```

## 三、玩法说明

- **调查**：序章（问询四人）、第二、三、四章需要把本章全部线索点都查看完，才会出现「开始推理」；收集齐全会小幅提升艾丽丝信任。
- **推理**：列出几条说法，需选出真正的疑点 / 矛盾点。
  - 选对：推进剧情，奖励好感或线索。
  - 选错：记一次「失误」并消耗一次「直觉」（每章重置为 3），可重试；失误累计 ≥ 2 直接导向 BE。
  - 艾丽丝信任 ≥ 8 时，重试前她会给出提示（信任来源：序章答应付代价、各章破案、调查收集齐全）。
- **抉择**：分支对话影响 `墨墨好感(mo_favor)`、`艾丽丝信任(alice_favor)` 等数值，右上角 HUD 可随时查看。
- **真相暗线**：第三章可选择是否对「周可」起疑，开启 `truth_route`，是通向真结局的必经之路。
- **情报线**：发小张子谦从第二章开始提供情报（三班转学生、活动室窗外的身影、旧楼地形），第五章校长室的谈话会把第一章的奖牌伏笔收束。

## 四、五种结局与达成条件（终章统一结算，见 `definitions.rpy: decide_ending`）

| 结局 | 条件 |
|---|---|
| **BE 坏结局「迟来的真相」** | 推理失误累计 ≥ 2，或 `mo_favor < 45`（全程只选冷淡选项约 30 分） |
| **TE 真结局「重新发声」** | `mo_favor ≥ 80` 且 `kako_clue ≥ 4` 且 走了真相线 |
| **HE 好结局「无言的心意」** | `mo_favor ≥ 80`（未走真相线） |
| **NE 普通结局「洗清的冤屈」** | `mo_favor` 介于 45~79 |
| **隐藏结局「第二只千纸鹤」** | 达成 TE 后解锁，可在 TE 结尾直接观看，或从主菜单「隐藏后日谈」进入 |

全程可得的墨墨好感上限 100（自动测试实测：best 100 / no_truth 100 / mixed 66 / worst 30；mixed 策略为"推理全对、
其余菜单按好感恒温（<50 选最优，否则选最差）"，不受菜单增删影响）。
扩写后全程约 52 个菜单（含调查菜单循环），`tests/autoplay.rpy` 的路线测试留了 70 轮。

文本量（lint 统计）：6,842 句台词 / 185,184 字符（约 15.5 万汉字），原版为 548 句 / 16,856 字符；分章大纲与新增场景清单见
`设计文档/03_剧本扩写规范与分章大纲.md`。两段纯日常的间章（`game/interlude.rpy`）用于调节节奏，均可在章节选择里单独重玩：
第一章之后的「间章 · 万事屋的第一天」（代价簿、小卖部每周二少二十块、张记的"体检"），第三章之后的「间章 · 日常的一天」
（食堂二楼的午餐、图书馆贴磁条、雨夜的一把伞）。

## 四·补 界面（v2 菜单重做）

- 所有菜单页共用一张模糊压暗的背景（`gui/game_menu.png`），正文放在右侧 820×594 的深色圆角面板里，不再压在立绘上；
  左侧 300px 导航列，按钮 54px 高、左侧竖条指示悬停/选中，"开始游戏"为更高更亮的主按钮并带呼吸高光；
  "退出 / 回到主菜单 / 返回"固定在导航列底部。
- 设置页改为卡片分组（画面 / 跳过 / 文本 / 声音），单选与开关用胶囊按钮；存读档为 3×2 卡片（224×126 缩略图，
  `config.thumbnail_*` 已同步）；章节选择为带章节徽记与一句话简介的卡片；历史为逐条卡片；确认框、证据栏、羁绊面板同一套面板纹理。
- 主菜单有标题淡入、主按钮呼吸高光与低透明度的飘升纸鹤；菜单进出与页间切换为 0.15~0.2s 溶解；导航、胶囊、选项、
  快捷栏与 HUD 按钮均有点击音反馈；快捷栏整合为一条半透明横条并按功能分组，HUD 的"证据 / 羁绊"用同一套胶囊底片。
- 纹理全部由 `tools/gen_gui.py` 生成（`panel_dark / panel_card(_hover) / nav_*(idle|hover|selected|primary) / pill_* / title_band / crane_particle / hud_chip`），
  改配色只需改脚本重跑。对话框正文区 300~1240px、28 号字，四行正文仍在快捷菜单之上（修复了长句与快捷菜单重叠）。

## 四·补二 界面与演出（v3 商业化打磨）

- **字体**：正文 Noto Sans SC Regular / Bold，标题与人名 Noto Serif SC Bold（`game/fonts/`，SIL OFL 1.1，许可文件随包分发），
  替换掉此前的 SimHei 副本；`gui.text_font / name_text_font / interface_font / bold_font / title_font` 集中在 `gui.rpy` 顶部。
- **主菜单**：主视觉（`素材/generated/keyvisual_mainmenu_v1.png`）裁 16:9 + 左侧压暗渐变 + 暗角，18 s 一个周期的缓慢推拉；
  英文 kicker「SILENT DETECTIVE」+ 宋体 84 号「沉默侦探」+ 渐隐分隔线 + 副标题「千纸鹤的约定」；四只低透明度纸鹤飘升；
  左下进度、右下版本号。导航新增「画廊 (n/7)」；`presplash.png` 与 `splashscreen`（奇点游戏工作室 · 剧本 高泽坤 · AI制作 张鹰南 PRESENTS，约 3.1 s）。
- **对话演出**：说话人高亮（非说话立绘压暗 20%、去饱和 25%，0.25 s 过渡；`Character(image=tag)` + `renpy.get_say_image_tag()`）；
  立绘首次出现从下方 14 px 淡入上浮、hide 时淡出下沉，换表情不触发；4 s 一周期 0.6% 的呼吸缩放；
  **场景调色**：`game/lighting.rpy` 的 `BG_LIGHT` 按当前 `bg` 属性给立绘叠色温与亮度（夕阳/关东煮偏暖、天台/旧楼偏冷），
  由 `tools/bg_lighting.py` 分析背景中央 60% 区域生成，换背景后重跑即可。
- **文本框**：默认 50 字/秒逐字显示（设置里可拉到立即显示）；右下角纸鹤 CTC 呼吸闪烁；人名框加深、十三个角色名色提亮以保证对比；
  旁白 `centered` 走专用 `centered_say` 屏：普通字幕为半透明横带，「第 N 章 · 标题」「第 N 章 · 完 / 接下来」「TRUE END · 重新发声」
  三类卡片自动识别并分别排版（宋体大标题、渐隐分隔线、结局种类配色、纸鹤徽记），全部带 0.4~1.0 s 的错落入场。
- **即时反馈**：新线索入手 → 左上角提示条「线索入手 / 线索名」+ `sfx_clue`（两声玻璃音）；「过去的碎片 n/4」同样提示；
  墨墨好感变化 → 右上 HUD 旁浮出「羁绊 +2 / −1」；HUD 右侧胶囊内嵌 96 px 迷你羁绊条（`AnimatedValue` 平滑）。
  这些只在对局内（HUD 已显示）触发，菜单和测试探针里不弹。
- **二级菜单**：存档卡空位显示纸鹤占位、有档显示缩略图 + 时间 + 章节名（`save_name` 由章节回调自动写入）；章节选择卡带 152×76 的场景缩略图；
  设置页"文字速度"下方有实时逐字预览句、滑条有填充色、无配音因此不再显示"语音"滑条；历史页人名按角色色显示；
  确认框全部中文；选项按钮 0.08 s 错落滑入；跳过指示 / 提示条为同一套胶囊 + 动态省略号；所有按钮悬停有 `sfx_hover` 轻响。
- **画廊**：7 张 CG 按 `renpy.seen_image` 解锁（任一周目演出过即算），3×3 卡片，点击全屏查看（底部说明条：标题 · 出处），
  点击任意处或 Esc 返回。
- **声音**：SFX 增至 7 个（`sfx_hover` 50 ms 悬停、`sfx_clue` 0.9 s 线索），`gen_audio.py --sfx-only` 单独重渲染音效。

## 四·补三 内容完整度（v4～v6：全角色全表情 / 侧边情绪徽章 / 18 CG / 室内乐与拟音 / 鉴赏 / 成就）

- **鉴赏（Extras）**：主菜单的「结局收集」「画廊」合并为一个「鉴赏 (n/61)」入口（`game/extra.rpy: screen extras`），
  页内四个胶囊分页——结局 / 画廊 / 音乐室 / 成就，上次看的分页记在 `persistent.extras_tab`。分母 61 = 5 结局 + 42 CG + 14 成就。
- **成就**（`game/achievements.rpy`）：14 项，基于 Ren'Py 自带 `achievement` 模块（persistent 存储，已预绑定 `steam=` ID 与 `achievement.sync()`）。
  解锁点全部挂在 `extra.rpy` 的 label 回调与 `definitions.rpy: add_kako` 上，剧本零改动：
  里程碑（完成序章 / 序章折鹤 / 抵达第四章 / 开启真相线 / 集齐四片过去）、五个结局各一项、全结局、全 CG，
  以及只在从「开始游戏」一路玩下来的完整周目结算的「零失误」「羁绊 100」（`full_run` 标记，章节选择与回放不计）。
  解锁时顶部居中弹金色提示条 + `sfx_ach`（三声上行钟音）。
- **音乐室**：Ren'Py `MusicRoom`，13 首 BGM 在剧情里播放过即解锁（主题曲常开），有上一曲 / 下一曲 / 停止；
  离开鉴赏页或回放结束时自动接回主菜单主题曲（`config.after_replay_callback`）。
- **制作人员**（`game/credits.rpy`）：四个结局在 `return` 前 `call credits`，黑底滚动字幕约 35 s，点击任意处跳过，
  音乐沿用当前结局 BGM；TE 滚完后才进入隐藏后日谈的询问。
- **重温结局**改为 Ren'Py 回放模式 `Replay(label, scope={"player_name": persistent.last_player_name})`：
  沿用上次输入的名字、不写存档、菜单里有「结束回放」；起名输入框默认值也改为上次的名字。
- **引擎内置字串全部中文**：`game/tl/schinese/common.rpy`（复制自 SDK 启动器的官方翻译，285 条）+ `define config.language = "schinese"`，
  覆盖无障碍菜单（Shift+A）、开发者提示等；截图提示改为「截图已保存：文件名」（`config.screenshot_callback`）。
  设置页「声音」卡片支持 **音乐 / 音效（含试听）/ 语音（含试听）** 三路独立并排调音（`config.has_voice = True`）。
- **真结局与隐藏结局高潮语音（CV）**：`tools/gen_voice.py` 生成 `game/audio/voice/v_mo_01.ogg` ～ `v_mo_30.ogg` 共 **30 条** 48kHz 立体声母带级中文语音，完整覆盖沉默四年的女主角「墨墨」在终章真结局与隐藏结局首次开口说话的核心台词。
- **动态镜头与微演出**：`definitions.rpy` 内置舞台推拉摇移（`cam_zoom_in` / `cam_zoom_close` / `cam_pan_left` / `cam_pan_right` / `cam_reset`）与角色微动作（`sprite_jump` / `sprite_nod` / `sprite_tremble` + `_SpeakFX` 开口微缩放呼吸），在各章推理破局与终章对峙高潮处强化演出张力。
- **Steam 商店与库全套视觉套件**：`tools/gen_steam_kit.py` 一键生成 `steam_kit/` 下 **7 张** Valve 官方规格胶囊与库资产（`header_capsule_460x215.png`、`small_capsule_231x87.png`、`main_capsule_616x353.png`、`vertical_capsule_374x448.png`、`library_600x900.png`、`library_hero_3840x1240.png`、`library_logo_1280x720.png`）及 `steam_appid.txt` 联调模板。
- **打包**：`icon.ico`（由 `gen_gui.py` 从窗口图标生成，7 个尺寸）作为 Windows exe 图标；`build.bat` 默认同时产出
  win / mac / linux 三个包（`build.bat win` 只打 Windows），并在 `options.rpy` 中将脚本/图片/音频/GUI/字体封包进 `.rpa` 档案。`test.bat` 依次跑 routes / shots / uiaudit / 素材门禁 / 文案门禁 / 台词长度门禁。
- **台词长度门禁**：`python tools/check_lines.py [--max 120]`，按"汉字 1、半角 0.5"折算，超过阈值的 say 行列出（当前 0 行超 100 字，
  仅 2 行在 80～85 字之间，均在三行以内）。

## 五、素材流水线

- **立绘与侧边头像**：18 个角色 × 8 表情（neutral / happy / sad / shock / angry / blush / think / smile）= **144 张胸像立绘** + **144 枚对话框左侧情绪圆章头像**（148×148），包含 12 名主线角色与 6 名重要配角（外婆 `waipo`、张阿姨 `zhangma`、高社长 `shezhang`、许编辑 `bianji`、黄老师 `huang`、小卖部阿姨 `ayi`）。
  - 重新生成：`python tools/slice_sprites.py`，会覆盖 `game/images/chara_*_*.png` 与 `game/images/side_*_*.png`，并在 `tools/_preview/` 输出棋盘格、深色底总览与合成场景预览。
  - 脚本里每个角色是独立的图片 tag：`show alice happy at right`、`show mo think at center`、`hide wang`。
    **不要写不带表情的 `show mo`**，Ren'Py 会沿用上一次的表情。
  - 对话框左侧 `SideImage()` 自动根据当前说话角色及舞台表情切换 148×148 圆章头像（包括第一人称主角 `mc` 以及全屏 CG 期间的发言人）。
- **背景**：19 张 1280×720 全屏场景（含 `bg_canteen` 食堂二楼、`bg_street` 林荫道、`bg_oden` 张记关东煮、`bg_mohouse` 外婆家巷口、`bg_riverside` 河堤等）。
- **CG**：**42 张**全屏剧情与人物特写插画（含 `oden_warm` / `meet` / `crane` / `lvfu` / `storeroom` / `medal` / `alice_hand` / `signing` / `alice` / `agency` / `zhang` / `banzhang_letter` / `rooftop` / `lin` / `joker` / `letter` / `alice_sunset` / `mo_note` / `deduction` / `mo_tears` / `zhouke_gate` / `riverbank` / `banzhang_curry` / `lin_strip` / `dusk` / `umbrella` / `lecture` / `lvfu_sign` / `xiang` / `mo_library_date` / `gingertea` / `past` / `waipo` / `news` / `confront` / `crisis` / `zhouke` / `badend` / `promise` / `voice` / `reunion` / `secondcrane`），由 `tools/place_generated.py` 统一调色并裁切到 1280×720，关键主体全部在对话框上沿 y=520 之上。CG 显示期间右上角 HUD 自动隐藏。
- **音乐 / 音效**：`tools/gen_audio.py` 用 mido 编曲（6 声部室内乐编制 + CC64 延音踏板 + CC11 表情包络 + 厅堂混响）→ FluidSynth + GeneralUser GS 音色库渲染 → ffmpeg 响度归一到 -20 LUFS；
  **13 首 BGM**（45–80 s，48 kHz 立体声 192 kbps）+ **14 个拟音/界面 SFX**（含 `sfx_write` 墨墨写字自动沙沙声、`sfx_page`、`sfx_bell`、`sfx_door`、`sfx_footstep`、`sfx_rain` 等）。
- **素材门禁**：`python tools/audit_assets.py`，覆盖 144 张立绘、144 枚侧边圆章头像、19 张背景、18 张 CG、27 个 BGM/SFX 音频文件、30 条墨墨高潮语音（CV）、41 张 GUI 纹理、presplash 与 icon.ico、OFL 商用字体、7 张 Steam 商店胶囊图全量检查。
- **文案门禁**：`python tools/fix_typography.py --check`，扫描剧本里含中文的字符串：ASCII 引号 ' ' / \" \" 成对替换为 “ ”
  （嵌套用 ‘ ’，章名/结局名保留「」）、单个 …/— 补成 ……/——、中文旁的半角标点转全角、重复标点去重。
