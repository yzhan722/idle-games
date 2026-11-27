# 《沉默侦探：千纸鹤的约定》— 运行与开发说明

基于 **Ren'Py 8.5.3** 的校园推理 AVG（文字冒险游戏），由 `AVG项目喂料文档.md` 的大纲改编、续写。

主线：**沉默侦探 + 校园推理**。沉默寡言的天才侦探少女「墨墨」，与一个走到哪儿倒霉到哪儿的转学生（玩家），在「万事屋」一起接案，层层揭开她四年前那桩「幼女侦探」旧案的真相。

> 本文件里的数量都由 `tests/verify_release.py` 和游戏数据对照，改内容后数字对不上会报错。

---

## 一、目录结构（以仓库里真实存在的为准）

```
paper-crane-detective/
├─ run.bat / lint.bat / build.bat / reset_progress.bat   # 启动 / lint / 打包 / 清本机进度（都要先准备 SDK，reset 除外）
├─ icon.ico                   # Windows exe 图标
├─ tools/build_release.ps1    # 打包脚本：查 SDK → 静态检查 → lint → 三平台打包 → 核对产物
├─ tests/                     # 纯 Python 静态检查（不需要 SDK），见第五节
├─ docs/store/steam_store.md  # 商店文案草稿
├─ ASSETS_LICENSE.md          # 素材来源与许可、上架前要用户办的事
├─ AVG项目喂料文档.md          # 原始大纲
└─ game/                      # Ren'Py 工程本体
   ├─ options.rpy             # 工程配置 + 打包规则 + 启动画面
   ├─ definitions.rpy         # 角色 / 变量 / 结局判定 / 立绘与背景注册 / 线索与羁绊反馈
   ├─ gameplay.rpy            # 推理玩法：证据栏、羁绊面板、推理反馈、艾丽丝提示、线索提示条
   ├─ extra.rpy               # 章节选择、案卷、鉴赏页、音乐室、进度与成就自动记录
   ├─ achievements.rpy        # 成就定义、解锁提示条、成就分页
   ├─ credits.rpy             # 结局后的制作人员滚动字幕
   ├─ script.rpy              # 入口 label start + 序章
   ├─ chapter1.rpy ~ chapter6.rpy   # 第一至五章 + 终章
   ├─ interlude.rpy           # 两段间章
   ├─ dlc_stories.rpy         # 两篇番外
   ├─ club_mailbox / tea_party_lexicon / bookstreet_seasons / radio_origami / stargazer_badges .rpy   # 沙龙小玩法
   ├─ vanished_shelf_album / wings_theater_capsule / yearbook_atelier_wall / zephyr_relay_casebook /
   │  zoetrope_shadow_folio / zubenelgenubi_meteor_casebook / zwembad_locker_casebook / zymase_bakeoff_casebook .rpy
   │                          # 八桩可重玩短案（及相册、时间胶囊、寄语墙、复盘本）
   ├─ screens.rpy / gui.rpy   # 界面
   ├─ lighting.rpy            # 每张背景的立绘色温 / 亮度表 BG_LIGHT
   ├─ tl/schinese/common.rpy  # 引擎内置字串的简体中文翻译
   ├─ images/ audio/ fonts/ gui/ presplash.png
   └─ tests/                  # 引擎内用例（不打进发行包）：autoplay.rpy 通关，ui_shots.rpy 界面截图
```

### 仓库里没有的东西，要用时怎么准备

| 没有的 | 影响 | 怎么准备 |
|---|---|---|
| `renpy-8.5.3-sdk/`（引擎） | 不能启动、lint、打包、跑引擎内用例 | 从 Ren'Py 官网下载 8.5.3 SDK，解压到本目录下的 `renpy-8.5.3-sdk/`（已在 `.gitignore`），或设环境变量 `RENPY_SDK` 指到解压目录。脚本不会自动下载 |
| `素材/`（绿幕表情表、背景与 CG 原图） | 不能重新切图、重裁 | 只有原作者手里有；需要时向制作方要 |
| `设计文档/`（人物设定、章节大纲、扩写规范） | 只影响查阅 | 同上；主线已冻结，游戏内文本以 `.rpy` 为准 |
| 原来的 Python 素材工具（`slice_sprites.py`、`place_bg.py`、`place_generated.py`、`gen_gui.py`、`gen_audio.py`、`gen_voice.py`、`bg_lighting.py`、`audit_assets.py`、`fix_typography.py`、`check_lines.py` 等） | 不能重新生成素材，也不能按旧门禁体检 | 找回原文件放进 `tools/`；没找回前素材以仓库现有文件为准 |
| `steam_kit/`（商店胶囊图） | 上架前要重做 | 文案见 `docs/store/steam_store.md`，图片要另外准备 |
| `test.bat` | 原来的一键测试入口 | 用第五节的命令代替 |

## 二、运行 / 检查 / 打包

| 操作 | 方式 |
|---|---|
| 直接玩 | 准备好 SDK 后双击 `run.bat` |
| 静态检查（不需要 SDK） | `python tests/rpy_syntax.py`、`python tests/verify_release.py` |
| lint（需要 SDK） | `lint.bat` |
| 打包（需要 SDK） | `build.bat`（等于 `tools\build_release.ps1`）。只打 Windows：`build.bat -Packages win`；只检查不打包：`build.bat -CheckOnly`；指定 SDK：`build.bat -SdkPath D:\renpy-8.5.3-sdk` |
| 调试 | 游戏内 **Shift+O** 控制台，**Shift+R** 重载脚本 |

打包在仓库外的临时工程里进行（默认输出 `<仓库上一级>\_release\paper-crane-detective\<版本号>\`），脚本、图片、音频、字体封进 `archive.rpa`，
测试、存档、文档、工具都不进包；完成后逐个 zip 核对，并写 `manifest.json`（文件名、大小、SHA256）。
输出目录里的 `old-game/` 是这一版编译出的脚本，**要留着**：更新已发行的版本时加 `-OldGame <上一版输出目录>\old-game`，否则玩家的旧存档对不上语句。
三个包的文件名是 `SilentDetective-<版本号>-win.zip`、`-mac.zip`、`-linux.tar.bz2`。
**打包脚本还没有在真 SDK 上跑过**；三平台实机通关也还没做。macOS 包没有 `icon.icns`，会用引擎默认图标。

## 三、玩法说明

- **调查**：序章（问询四人）、第二、三、四章需要把本章全部线索点都查看完，才会出现「开始推理」；收集齐全会小幅提升艾丽丝信任。
- **推理**：列出几条说法，需选出真正的疑点 / 矛盾点。
  - 选对：推进剧情，奖励好感或线索。
  - 选错：记一次「失误」并消耗一次「直觉」（每章重置为 3），可重试；失误累计 ≥ 2 直接导向 BE。
  - 艾丽丝信任 ≥ 8 时，重试前她会给出提示。
- **抉择**：分支对话影响 `墨墨好感(mo_favor)`、`艾丽丝信任(alice_favor)` 等数值，右上角 HUD 可随时查看。
- **真相暗线**：第三章可选择是否对「周可」起疑，开启 `truth_route`，是通向真结局的必经之路。

### 案卷（番外与可重玩短案的唯一入口）

主菜单「案卷」胶囊或鉴赏页的「案卷」签打开，一屏列出 2 篇番外与 8 桩可重玩短案。

- 番外：序章之后开放，与主线进度互不影响；后日谈的标题在通关 TRUE END 前封存。
- 八桩短案难度相同：6 条线索、4 步推理、每步 3 选 1；失误只计入本案评级，不影响主线。
- 评级只有一套：**金牌**零失误，**银牌**失误 1～2 次，**铜牌**失误 3 次及以上；案卷里显示最好评级，旧存档的成绩照常换算。

## 四、五种结局与达成条件（终章统一结算，见 `definitions.rpy: decide_ending`）

| 结局 | 条件 |
|---|---|
| **BE 坏结局「迟来的真相」** | 推理失误累计 ≥ 2，或 `mo_favor < 45` |
| **TE 真结局「重新发声」** | `mo_favor ≥ 80` 且 `kako_clue ≥ 4` 且 走了真相线 |
| **HE 好结局「无言的心意」** | `mo_favor ≥ 80`（未走真相线） |
| **NE 普通结局「洗清的冤屈」** | `mo_favor` 介于 45~79 |
| **隐藏结局「第二只千纸鹤」** | 达成 TE 后解锁，可在 TE 结尾直接观看，或从主菜单「隐藏后日谈」进入 |

主线文本约 15.5 万汉字（序章、第一至五章、终章与两段间章）。

### 鉴赏

- 主菜单「鉴赏 (n/87)」：87 = 5 结局 + 42 CG + 40 成就，分母由数据算出（`extra.rpy: extras_count_text`）。
- 分页：结局 / 画廊 / 雨夜留声机 / 成就 / 委托信箱 / 真相档案 / 折纸书签 / 关系白板 / 自由剧场，以及「侦探社沙龙」子栏。
- 成就 40 项：`achievements.rpy` 里 18 项，其余由各玩法模块登记；接 Ren'Py 自带 `achievement` 模块，已预留 Steam ID。
- 音乐室：13 首 BGM 在剧情里播放过即解锁。
- 制作人员：四个结局在 `return` 前 `call credits`，点击任意处跳过。

### 存档兼容约定（2026-11-27 起）

- 每个 `call <label>` 都必须带 `from _call_<目标>`（同一目标再出现就加 `_1`、`_2`……），`tests/rpy_syntax.py` 会查。
- **首发之后，已经发出去的 `from` 名字永远不能改、不能删、不能挪给别处用**：玩家存档里的调用栈靠这些名字找回返回点，改了就读不回档。新加的 call 只追加新名字。
- 改动或删除 label 前，先确认没有存档会停在里面；实在要删，用 `config.label_overrides` 或保留一个跳转壳。

## 五、测试

### 纯 Python（不需要 SDK，本机可跑）

| 命令 | 查什么 |
|---|---|
| `python tests/rpy_syntax.py` | 所有 `.rpy` 的缩进、引号、括号、语句块、界面语言属性、Python 片段，以及初始化顺序、界面动作的返回值 |
| `python tests/verify_release.py` | 案卷入口与评级换算、label / screen / 图片 / 音频引用、persistent 默认值、数量与本文件对照、打包规则 |
| `python tests/verify_glyphs.py` | 显示文字是否都在三个字体里 |
| `python tests/verify_pc4.py` ～ `verify_pc17.py` | 各期玩法的数据、像素预算、防剧透与四结局判定 |

### 引擎内（需要 SDK）

`game/tests/autoplay.rpy` 用 Ren'Py 的 testcase 把游戏从头到尾跑四遍并断言结局：

| 策略 | 选项规则 | 预期结局 |
|---|---|---|
| best | 全选第一项 | TRUE END + 隐藏结局 |
| no_truth | 同上，但第三章不说出对周可的怀疑 | GOOD END |
| mixed | 推理全对，其余按好感取舍 | NORMAL END |
| worst | 全选最后一项（推理连错） | BAD END |

```
<SDK>\lib\py3-windows-x86_64\python.exe <SDK>\renpy.py . test routes --report-detailed
<SDK>\lib\py3-windows-x86_64\python.exe <SDK>\renpy.py . test shots --overwrite-screenshots
<SDK>\lib\py3-windows-x86_64\python.exe <SDK>\renpy.py . test uiaudit --overwrite-screenshots
```

`shots` / `uiaudit` 把关键画面截到 `tests/screenshots/`，改界面后先跑它再看图。PC-4 之后的内容只做过静态检查，**没有在引擎里跑过**，拿到 SDK 后要先跑 lint 和这三组用例。

## 六、素材现状（来源与许可见 `ASSETS_LICENSE.md`）

- 立绘 144 张（18 个角色 × 8 表情）、对话框侧边头像 145 张、背景 19 张、剧情 CG 42 张、玩法图标 60 张、GUI 纹理 41 张。
- 音频：13 首 BGM、14 个音效、42 条配音（墨墨 30、幼年 5、周可 4、艾丽丝 3）。
- 字体：Noto Sans SC Regular / Bold、Noto Serif SC Bold（SIL OFL 1.1，许可文件 `game/fonts/LICENSE-OFL.txt` 随包）。
- 脚本里每个角色是独立的图片 tag：`show alice happy at right`、`show mo think at center`、`hide wang`。**不要写不带表情的 `show mo`**，Ren'Py 会沿用上一次的表情。
