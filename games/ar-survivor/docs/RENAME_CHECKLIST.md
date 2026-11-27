# 改名清单（AR-COM1）

只列位置和方案，**没有改任何名字**，等用户定。行号是 2026-11-26 拆分 `game.js` 之后的，改之前用文末命令重新扫一遍。没有做商标检索；能不能用、算不算侵权，由用户找专业人士确认。

## 一、先说结论

- 「深度求索」：0 处。「DeepSeek」45 处 + 「deepseek」12 处，共 57 处（ENDGAME_GOALS 记的 58 处是改版前）。玩家能看到的 28 处。
- 「蓝鲸 / 鲸」：玩家能看到的文字 79 处，注释 12 处。「蓝色大肥鱼」1 处、「明明在深度思考」1 处是同一个梗。
- **只改名字不够。** 28 张角色图全部是：蓝色长发 + 深蓝女仆装 + 鲸鱼尾巴和鳍状耳 + 白围裙，正面的围裙上有一枚**深蓝实心鲸鱼图标**（带喷水，尾巴上翘）。角色叫 DeepSeek 娘时，这枚围裙图标会被直接看成那家公司的标志；改了名字，蓝发鲸尾女仆加围裙图标仍然会让熟悉的人认成同一个角色。
- 单独的鲸鱼（抱枕、沙滩球、邮票、马卡龙）是常见的可爱动物，风格也是圆滚滚的奶油手账画法，和那枚标志不像，单看问题不大；但和角色放在一起会加强联想。
- 判断（从高到低）：① 名字 ② 围裙图标 ③ 角色整体（蓝发 + 鲸尾 + 女仆）④ 「大肥鱼」「深度思考」的梗 ⑤ 25 张道具 / 背景图里的鲸鱼 ⑥ 域名、Worker 名（`ar-survivor`，不含品牌）。①②④ 必改；③ 建议改，是这款游戏 COM1 最大的一笔；⑤ 跟着方案走。
- 角色图来源查不到（见 `ASSETS_LICENSE.md`），就算没有品牌问题，商用也缺依据。

## 二、「DeepSeek / deepseek」57 处

### 1. 玩家能看到（28 处，必改）

| 文件 | 行 | 内容 |
|---|---|---|
| `index.html` | 8 | 页面标题 `AR DeepSeek娘 · 实景桌宠养成` |
| `index.html` | 43 | 头像 `alt` |
| `index.html` | 49 | 左上角名牌 |
| `index.html` | 431、746、897 | 番茄钟 / 八音盒 / 电台的说明 |
| `index.html` | 1536、1628、1650 | 贺卡落款、日记的 `aria-label`、日记落款 |
| `game.js` | 5823 | 拍立得照片上**烙进图里**的字（已经拍好的旧照片改不掉） |
| `game.js` | 5894、6098 | 下载文件名 `deepseek-ar-polaroid-…png`、`deepseek-album-…webp` |
| `game.js` | 6139、7112 | 相册空状态、掌上台词 |
| `pet-chat.js` | 224、559、567、575（2 处） | 话题选项、猜拳结果 |
| `room-ar04-06.js` | 357、363、2472 | 番茄钟、八音盒 |
| `room-ar07-09.js` | 148、463 | 电台 |
| `room-ar10-11.js` | 652、653、654 | 三档信件落款（旧信存在存档里只存档位，不用迁移） |
| `room-ar12-13.js` | 2128 | 日记落款 |

「DeepSeek」26 处 + 下载文件名「deepseek」2 处。

### 2. 内部标识（10 处，玩家看不到，但涉及存档）

| 键 | 位置 |
|---|---|
| `ar_deepseek_pet_v2`（主存档） | `save-core.js` 8（常量） |
| `ar_deepseek_pet_core_v1`（存储满时的要紧存档） | `save-core.js` 9（常量） |
| `ar_deepseek_polaroid_album_v1`（相册） | `game.js` 5949（常量）、`room-ar07-09.js` 179（**直接写死，没用常量**） |
| `ar_deepseek_camera_choice_v1` | `game.js` 6743 |
| `ar_deepseek_muted` | `audio.js` 283、325、367 |
| `ar_deepseek_bgm_track` | `audio.js` 288、307 |

改法：读的时候「新键没有就读旧键」，写只写新键，旧键留着不删一个版本；主存档、相册两处要同一次改完并写单测。不改也不影响玩家，可以放到最后。

### 3. 注释（19 处）

`game.js` 1、3303～3305、3354、3377、3682、6368、6949、7306、7322、7338、7356、7812；`index.html` 1509、1627；`data-room.js` 1276；`room-ar12-13.js` 1184；`style.css` 11154。
注意 `style.css` 11154 和 `room-ar12-13.js` 1184 的注释被 `tests/verify_ar13.mjs` 130、138 行当作段落标记查找，要一起改。

### 4. 测试

断言里的名字：`verify_ar10.mjs` 577（信件落款）、`verify_ar13.mjs` 130、138、1220。存档键：`_ar_entry_helper.mjs` 1 处、`verify_ar3`（11）、`9`（4）、`10`（4）、`11`（2）、`12`～`17`（各 1）。`verify_ar4～7` 的 `DeepSeek-chan` 只是断言说明。

### 5. 仓库里、线上

- 不归本目录改：`README.md` 1、`EXPANSION_ROADMAP.md` 14、`ENDGAME_GOALS.md` 2、`C:\Project\AGENTS.md` 1。
- 线上：域名 `ar-survivor.yinosites.com`、Worker 名 `ar-survivor` 不含品牌；定新名后要不要换由用户定。
- 页面没有 `og:` / `description` / manifest；搜索结果和分享卡片显示的就是 `<title>`。

## 三、「蓝鲸 / 鲸」

### 1. 玩家能看到的文字（79 处）

| 文件 | 处 | 行 |
|---|---|---|
| `data-room.js` | 27 | 127、195、196、199、202～204、296、297、731～733、738、754、830、1108、1315、1320、1321、1522、2318、2319、2324、2690、2691、2693（2） |
| `index.html` | 11 | 518、538、541、825、853、962、984、987、1226、1312、2358 |
| `pet-chat.js` | 10 | 104、123、129、130、140、213、230、270、273、312 |
| `room-ar04-06.js` | 10 | 668、697、699、700、739～742、781、784 |
| `game.js` | 9 | 997、1108、2369、2401、3126、3644、3658、6400、6898 |
| `mode-survivor.js` | 7 | 46、50、66、108、110、111、591 |
| `drawer.js` | 3 | 184、223、960 |
| `room-ar10-11.js` | 1 | 721 |
| `intimacy.js` | 1 | 38 |

`audio.js` 878 行注释拿两款别家游戏作比较，玩家看不到，顺手删。

其中说**她身体**的（尾巴、发饰）：`game.js` 3126，`pet-chat.js` 104、129、130——换角色图时必改，其余是道具名。同类的梗：`game.js` 3112「蓝色大肥鱼」、`pet-chat.js` 143「深度思考」、`sprites.js` 1255「AI 产币中」。「深海××」26 处是世界观用词，跟着方案定。

### 2. 内部标识 126 处、资源文件名 27 处

存进存档的 id 不能直接改名：`whale_scarf`（钩织）、`whale_macaron` 与三个组合 id（茶点、周报已发现）、`whale_stamp` / `whale`（贴纸、邮票、绣样、故事）、`whale_plush`（水彩）、`whale_lullaby`（故事）、`activeToy: 'whale'`。这些玩家看不到，**建议不改**。`superWhale` 只在班次里，可改可不改。

### 3. 图（看过全部 184 张，没有启动游戏）

- 角色 28 张 `hero_*.webp`：都有鲸尾和鳍耳；围裙图标正面的都看得清，跑步 6 张侧身只露一角。`hero_sit_edge` 还抱着一只蓝鲸玩偶；`hero_attack` 尾巴上有没抠干净的绿边。
- 明显是鲸鱼的 19 张：`furn_lamp`、`furn_musicbox`、`furn_tree`、`knit_whale_scarf`（`ui_btn_wardrobe` 是它的复制）、`pastry_whale_macaron`、`prop_cushion`、`stamp_whale`、`sticker_whale_stamp`、`toy_whale`、`ui_badge_shift`、`ui_btn_chat`、`ui_btn_musicbox`、`ui_coin`、`ui_mode_pet`、`ui_shop`、`ui_stamp_focus`、`upg_blaster`、`upg_super_whale`、`diary_sticker`。
- 画面里带一小只的 6 张：`food_cake`、`furn_pc`（杯子）、`pottery_cup`、`tea_platter_signature`、`vfx_season_summer`，以及水族馆背景 `bg_aquarium_room`（窗外 5 只）。
- 文件名带 whale 的 6 个：`knit_whale_scarf`、`pastry_whale_macaron`、`stamp_whale`、`sticker_whale_stamp`、`toy_whale`、`upg_super_whale`。

## 四、三套方案

名字都是这次新起的，没有检索过，用户选定后要先查商标、应用商店和域名。三套都要：改第二节全部、重出 28 张角色图、去掉「大肥鱼」「深度思考」两句。区别在道具和世界观。

| | 方案 A「阿澄」 | 方案 B「絮絮」 | 方案 C「栗栗」 |
|---|---|---|---|
| 游戏名 | 《阿澄在桌上》 | 《絮絮的奶油小屋》 | 《栗栗的桌边手账》 |
| 一句话 | 从海边来的小海豹女孩 | 从云上掉到桌上的女孩 | 住在手账里的女孩 |
| 角色 | 浅棕发、海军领连衣裙、小海豹帽 | 奶白发、云朵披肩、没有动物特征 | 栗色发、围兜裙、缎带，没有动物特征 |
| 世界观 | 海洋保留，「深海」不用改 | 海洋换成云和天 | 换成纸张、点心、森林 |
| 鲸鱼文字 79 处 | 「蓝鲸」→「小海豹」，大多能逐字换 | 「蓝鲸」→「小云」，约 30 句要重写 | 「蓝鲸」→「小熊」，约 30 句要重写 |
| 道具 / 背景图 | 25 张换成海豹 | 25 张换成云（已有 `knit_cloud_pillow`、`rain_cushion` 的云可照着画） | 25 张换成小熊 / 栗子 |
| 打工超武 | 「深海巨浪」留用，去掉鲸 | 「云海巨浪」 | 「墨水巨浪」 |
| 水族馆主题 | 背景里 5 只鲸换掉，副标题「蓝鲸穹顶」改字 | 收起或换背景 | 收起或换背景 |
| 和现有奶油手账美术的贴合 | 中 | 高 | 最高 |
| 工作量（文字 / 图） | 小 / 28 + 25 | 中 / 28 + 25 | 中 / 28 + 25 |

不建议的「只改名」：改第二节和梗、重修 28 张图的围裙图标和鲸尾，道具不动。图的工作量没少多少，仍会被认出来。

### 各方案都要动的文件

`index.html`、`game.js`、`pet-chat.js`、`room-ar04-06.js`、`room-ar07-09.js`、`room-ar10-11.js`、`room-ar12-13.js`、`data-room.js`、`drawer.js`、`mode-survivor.js`、`intimacy.js`、`sprites.js`（1255 一句与图的键名）、`style.css`（注释）、`privacy.html` / `terms.html`（主体名，现在是占位）、`public/assets` 的图、`tests/`。改完 `?v=` 全部加一，`split_manifest.json` 的 `baseline` 改成 `null`。

## 五、重新扫一遍

```bash
cd games/ar-survivor
grep -rnE "DeepSeek|deepseek|深度求索|大肥鱼|深度思考" public docs wrangler.toml tests
grep -rnE "鲸" public docs
grep -rnE "[wW]hale" public
```
