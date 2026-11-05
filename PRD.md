# 《云岛集市 (Cloud Isle Market)》Master PRD & 技术架构规范 (v2.0)

## 1. 项目定位与 PC 挂机窗口规范
- **项目名称**：Cloud Isle Market（云岛集市）
- **引擎版本**：Godot Engine 4.2+ (GDScript 2.0, Forward+ 或 Compatibility 渲染器)
- **平台与分辨率**：PC 横屏挂机游戏，基准分辨率 `1920x1080`（窗口默认 `1280x720`，Stretch Mode: `canvas_items`，Aspect: `expand`）。
- **像素渲染铁律**：全局默认纹理过滤必须设为 `Nearest` (`default_texture_filter = 0`)，严禁任何模糊抗锯齿。
- **核心特色功能 ——「桌面壁纸 / 透明置顶摸鱼模式 (Desktop Companion Mode)」**：
  1. 在 `project.godot` 中预开启透明视图支持：`display/window/per_pixel_transparency/allowed = true`。
  2. 游戏 HUD 提供【摸鱼模式】一键切换开关：
     - **常规模式**：显示怀旧像素蓝天白云动态背景，标准窗口层级。
     - **透明置顶模式**：隐藏天空背景层，调用以下接口实现桌面置顶与透明背景：
       ```gdscript
       get_tree().root.transparent_bg = true
       DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_TRANSPARENT, true)
       DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_ALWAYS_ON_TOP, true)
       DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_BORDERLESS, true)
       ```
     - **鼠标点击穿透 (Click-Through)**：根据三座岛屿与 UI 面板的包围盒动态更新 `DisplayServer.window_set_mouse_passthrough(polygon)`，确保玩家点击岛屿外的透明区域时，鼠标事件直接穿透到下方的桌面或工作软件。

---

## 2. Phase 0：自动化图像去背与智能切图管线 (`tools/process_assets.py`)
由于现有 `assets/pixel_art/` 下的 `*_sheet.png` 行列数与帧间距未知，且 `raw_sheets/*.jpg` 含有非透明纯色背景，**严禁 AI 在 Godot 中盲目硬编码 `hframes`/`vframes`**。必须先编写并运行 Python 预处理脚本完成资产标准化：

### 2.1 脚本职责 (`tools/process_assets.py`，依赖 `Pillow`, `numpy`)
1. **JPG 自动洪水填充去背 (`raw_sheets/*.jpg` -> `assets/pixel_art/ui/*.png`)**：
   - 读取 `maple_ui_kit.jpg` 等文件，采样图像四角像素均值作为背景基准色 $(R_0, G_0, B_0)$。
   - 使用边缘泛洪算法（Flood Fill，色差容差阈值 `tolerance = 25`）将背景替换为 `Alpha = 0`，并对边缘像素做半透明平滑去白边处理，导出为带透明通道的 `.png`。
2. **PNG 图集连通域自动切帧与清单生成 (`sprite_manifest.json`)**：
   - 扫描 `animals/*_sheet.png`、`crops/crops_sheet.png`、`buildings/delicacies_sheet.png` 的 Alpha 通道（若含有底色则同步执行去背）。
   - 通过行列投影法（Horizontal & Vertical Alpha Projection）或 2D 连通域检测（Connected Components），自动识别每个独立子图（Sprite Frame）的真实像素边界 `[x, y, w, h]`。
   - 自动将切出的帧按统一单元格尺寸（取最大帧宽高并向上取整至偶数像素，底部中心对齐）重排生成标准化网格图集 `*_normalized.png`，同时输出 `res://src/data/sprite_manifest.json`。

### 2.2 `res://src/data/sprite_manifest.json` 规范格式
```json
{
  "animals/bunny_sheet.png": {
    "cell_width": 48,
    "cell_height": 48,
    "hframes": 4,
    "vframes": 2,
    "total_frames": 8,
    "regions": [{"x": 0, "y": 0, "w": 48, "h": 48}]
  },
  "crops/crops_sheet.png": {
    "items": [
      {"id": "crop_0", "stages": [{"x": 0, "y": 0, "w": 32, "h": 32}, {"x": 32, "y": 0, "w": 32, "h": 32}, {"x": 64, "y": 0, "w": 32, "h": 32}]}
    ]
  }
}
```

---

## 3. 全景长卷式三岛空间布局与路网系统 (Panoramic Layout & Waypoints)

### 3.1 经典左中右横向一字排开 (Left-to-Right Scroll)
在 `MainWorld.tscn` 中，三座岛屿沿 X 轴从左向右一字排开，通过两座木桥相连，构成完整的横向生态长卷：
```text
[左侧地标小屋] -> [岛屿1: 射手村 Henesys] ===(木桥1)===> [岛屿2: 魔法密林 Ellinia] ===(木桥2)===> [岛屿3: 天空海岸 Orbis] <- [右侧提基地标]
 (顾客出生点A)     (基础农田+研钵+主集市)                  (中级农田+炼金坩埚)                      (高级农田+终极工坊)        (顾客出生点B)
```
- **Camera2D 横向长卷控制器**：支持鼠标右键拖拽平移、`A / D` 或 `Left / Right` 键平滑移动镜头、鼠标滚轮在 `0.6x ~ 2.0x` 之间缩放。限制镜头边界 `limit_left = -1600`, `limit_right = 2800`。

### 3.2 预置路网节点 (Waypoint Graph) —— 杜绝寻路卡死
每座岛屿内部及木桥两端预置 `Marker2D` 路点（组成一维主干道 + 建筑支线装卸点）：
- 动物移动不使用复杂物理碰撞寻路，而是沿着 `WaypointGraph` 计算最短路点序列，通过平滑插值移动，移动时附加正弦波上下颠簸动效：`sprite.offset.y = -abs(sin(time * 12.0)) * 4.0`。
- 搬运状态下的动物头顶挂载 `CarryIcon (Sprite2D)`，实时显示当前背负的原料或美食贴图。

---

## 4. 专职流水线动物分工与长周期顾客系统 (Specialized Pipeline & Customers)

### 4.1 六大动物专职流水线分工 (严格绑定职责)
所有动物共用基类 `AnimalWorker.gd`，通过 `role_type` 枚举注入不同状态机逻辑：

| 动物种类 | 资产路径 (`res://assets/pixel_art/animals/`) | 专职岗位 | 真实物理搬运与工作闭环逻辑 |
| :--- | :--- | :--- | :--- |
| **1. 兔子 (bunny)** | `bunny_sheet.png` | **专职农夫** | 巡视本岛的 `soil_plot`（耕地）与 `apple_tree`（果树）$\rightarrow$ 播种/照料 $\rightarrow$ 成熟后收割并头顶原料放到本岛的**【田边菜篮 (RawStorageBasket)】**。 |
| **2. 水獭 (otter)** | `otter_sheet.png` | **岛内物流员** | 专职本岛短途搬运：① 从本岛【田边菜篮】背起原料送入本岛【工坊输入槽】；② 从本岛【工坊成品槽】背起美食送入【集市摊位】或【桥头中转站】。 |
| **3. 巨嘴鸟 (toucan)** | `toucan_sheet.png` | **跨岛贸易专员** | 专职跨木桥长途运输：往返于 `bridge_wood`，将第 2 岛（魔法密林）、第 3 岛（天空海岸）产出的高级原料或炼金美食大批量运回主岛集市摊位。 |
| **4. 狐狸 (fox)** | `fox_sheet.png` | **初级研钵主厨** | 驻守 `workshop_mortar.png`（研钵工坊）。当输入槽有初级原料时，播放研磨动画与进度条，完成后将初级美食放入工坊成品槽。 |
| **5. 企鹅 (penguin)** | `penguin_sheet.png` | **高级坩埚炼金师** | 驻守 `workshop_cauldron.png`（坩埚工坊）。消耗高阶原料或初级美食，播放搅拌炼制动画，产出高溢价精制美食。 |
| **6. 柴犬 (shiba)** | `shiba_sheet.png` | **集市金牌店长** | 驻守 `market_stall.png`（集市摊位）。整理货架展示槽位、提供全摊位售价加成（随等级提升），并在顾客到达时播放收银结账互动。 |

### 4.2 顾客登岛慢节奏采购闭环 (Long-Cycle Customer Loop)
- **长周期刷新机制**：刷怪/刷客计时器默认间隔为 `18.0 ~ 30.0 秒`（随岛屿繁荣度微调，但始终保持舒缓不拥挤的节奏，同屏顾客上限设为 4 人）。
- **出生点**：已解锁岛屿两端的地标建筑 `landmark_left_hut.png`（左侧木屋）或 `landmark_right_tiki.png`（右侧提基雕像）。
- **顾客 AI 行为状态机 (`CustomerNPC.gd`)**：
  1. `SPAWN_AND_STROLL`：从地标缓步走出（移速约为打工动物的 60%，表现悠闲逛街感），头顶气泡显示想购买的美食图标与数量（1~3 个）。
  2. `QUEUE_AT_STALL`：抵达 `market_stall.png` 前方排队点。
  3. `PURCHASE`：
     - **若摊位库存充足**：与柴犬店长互动 1.5 秒 $\rightarrow$ 扣除摊位美食库存 $\rightarrow$ 冒出开心表情与金币抛物线飞入特效（触发 `+Gold` 飘字）$\rightarrow$ 转入离开状态。
     - **若摊位缺货**：耐心等待最多 12 秒，若水獭/巨嘴鸟及时补货则完成交易，超时则冒出遗憾省略号气泡转身离开（不扣钱，直观提醒玩家需要扩充物流或工坊产能）。
  4. `LEAVE`：沿原路慢悠悠走回地标建筑并淡出销毁。

---

## 5. 纯正放置经营数值体系 (Pure Idle Economy Math)
不设抽卡与复杂词条，纯粹依靠产线平衡（农田产出率 vs 物流运力 vs 工坊加工率 vs 摊位接待率）与等级里程碑突破驱动正反馈：
- **升级花费公式（建筑与动物通用）**：
  $$\text{Cost}(L) = \text{round}\left(\text{BaseCost} \times 1.15^{(L - 1)}\right)$$
- **产能/售价膨胀公式（含 25 级阶段翻倍突破）**：
  $$\text{Value}(L) = \text{BaseValue} \times L \times 2^{\lfloor L / 25 \rfloor}$$
- **工坊深加工增值倍率**：
  - 直接售卖初级原料（兜底机制）：$1\times$ 基础价值。
  - 经 `workshop_mortar`（狐狸研钵）加工为初级美食：价值提升 $3.5\times$。
  - 经 `workshop_cauldron`（企鹅坩埚）二次或高阶炼制为高级美食：价值提升 $12.0\times$。
- **动物升级成长维度**：
  - 兔子/狐狸/企鹅升级：缩短采集与制作耗时 $\text{Duration}(L) = \max(0.8, \text{BaseTime} \times 0.96^{(L-1)})$。
  - 水獭/巨嘴鸟升级：提升单次最大背负容量 $\text{Capacity}(L) = \text{BaseCap} + \lfloor L / 5 \rfloor$ 及移动速度。
  - 柴犬升级：提升集市最终结账售价倍率 $\text{PriceBonus}(L) = 1.0 + 0.1 \times L$。

---

## 6. 目标工程目录结构与存档规范
```text
cloud-isle-market/
├── project.godot                       # 根配置（1280x720, Nearest过滤, 允许透明窗口, 注册3个Autoload）
├── PRD.md                              # 本全局架构文档
├── tools/
│   └── process_assets.py               # [Phase 0] 自动去背与图集连通域切帧脚本
├── assets/
│   └── pixel_art/                      # 原始与标准化后的像素资产
├── src/
│   ├── data/
│   │   └── sprite_manifest.json        # [Phase 0 生成] 精确到像素的帧坐标清单
│   ├── autoload/
│   │   ├── EventBus.gd                 # 全局信号总线 (gold_changed, item_delivered, customer_paid, toggle_desktop_mode)
│   │   ├── EconomyConfig.gd            # 建筑、6类专职动物、作物、美食配方的静态数值与公式计算器
│   │   └── GameManager.gd              # 全局状态、库存字典、JSON自动存档读档、离线收益结算
│   ├── world/
│   │   ├── MainWorld.tscn & .gd        # 横向三岛长卷主场景、天空背景层、透明置顶与鼠标穿透控制
│   │   ├── WaypointGraph.gd            # 岛内与跨桥路点导航计算器
│   │   └── CameraController.gd         # 横向平滑拖拽与滚轮缩放相机
│   ├── entities/
│   │   ├── buildings/
│   │   │   ├── SoilPlot.tscn & .gd     # 农田/果树组件 + 田边菜篮缓存区 (RawStorageBasket)
│   │   │   ├── Workshop.tscn & .gd     # 研钵/坩埚工坊组件（含输入槽、加工进度条、成品槽）
│   │   │   └── MarketStall.tscn & .gd  # 集市摊位组件（货物陈列图标、排队点管理、结账逻辑）
│   │   └── units/
│   │       ├── AnimalWorker.tscn & .gd # 6种专职动物通用载体（读取 sprite_manifest + 角色职责状态机 + 头顶背负物）
│   │       └── CustomerNPC.tscn & .gd  # 登岛顾客实体（长周期生成、头顶需求气泡、排队购买）
│   └── ui/
│       ├── HUD.tscn & .gd              # 顶部金币/繁荣度栏、右上角【桌面透明置顶】开关、底部升级抽屉面板
│       └── FloatingText.tscn & .gd     # 金币与物品入库抛物线跳字特效
```

---

## 7. AI Agent 分阶段执行路线图 (Execution Milestones)
AI 助手必须严格按以下 4 个阶段顺序执行，每阶段完成后验证无语法错误再进入下一阶段：
- **Phase 0：运行资产预处理管线**：编写并执行 `tools/process_assets.py`，完成 `raw_sheets/*.jpg` 去背转 PNG，解析所有 `*_sheet.png` 并生成 `src/data/sprite_manifest.json`。
- **Phase 1：工程底座、配置单例与横向三岛长卷 (`project.godot` + `MainWorld`)**：生成 `project.godot` 与三个 Autoload（`EventBus`, `EconomyConfig`, `GameManager`）。搭建 `MainWorld.tscn`，将 `island_henesys`、`bridge_wood`、`island_ellinia`、`island_orbis_coast` 及左右地标横向排布好，挂载 `CameraController.gd` 与 `WaypointGraph.gd`，并实现一键切换【桌面透明置顶 + 鼠标穿透】功能。
- **Phase 2：农田、工坊与集市实体 (`SoilPlot`, `Workshop`, `MarketStall`)**：实现农田生长与田边菜篮、工坊输入/输出缓冲区与加工读条、集市摊位货架展示。支持玩家鼠标点击农田手动加速收获。
- **Phase 3：六大专职动物流水线与长周期顾客登岛 (`AnimalWorker`, `CustomerNPC`)**：实现兔子（种地入篮）$\rightarrow$ 水獭/巨嘴鸟（沿着路点真实背运物资）$\rightarrow$ 狐狸/企鹅（驻守加工）$\rightarrow$ 柴犬（看摊）+ 顾客每 18~30 秒从地标登岛排队买单的完整物理闭环。
- **Phase 4：冒险岛复古风 HUD、升级面板与离线存档完善 (`HUD`, `SaveSystem`)**：构建底部三分页抽屉菜单：【建筑升级】、【动物招募与升职】、【岛屿与木桥开拓】，接入 `user://savegame.json` 自动存档与重开游戏时的离线收益弹窗。


---

## 8. PRD Patch v2.1 核心玩法与交互精简升级 (已实装)

### 8.1 零手动操作与“单兔冷启动 -> 专职流水线”平滑演进 (Zero-Click Cold Start)
- **移除手动点击加速/收集**：游戏为 100% 纯正放置挂机，无需玩家手动点击农田收割。
- **开局初始配置**：新档默认在「射手村 (Henesys)」解锁 1 块农田 (`soil_plot`)、1 棵果树 (`apple_tree`)、1 座集市摊位 (`market_stall`)，并赠送 **1 只初始兔子 (`bunny`)**。
- **动态职责降级兜底（防断链核心逻辑）**：
  1. **单兔全包期（未雇佣水獭 `otter` 前）**：兔子在农田种地并收获后，若检测到本岛尚未雇佣水獭，兔子亲自头顶生鲜作物沿路点直接背到 `market_stall` 摊位上架直售（按 `1x` 基础价格售卖）。
  2. **无人自助摊位（未雇佣柴犬 `shiba` 前）**：即使集市摊位还没有柴犬店长，登岛顾客抵达摊位时只要有库存即可自助完成购买结账；雇佣柴犬店长后，激活结账加速与全摊位售价加成倍率 (`PriceBonus = 1.0 + 0.1 * L`)。
  3. **专职分工期（雇佣水獭与狐狸后）**：一旦本岛雇佣了水獭 (`otter`)，兔子立刻回归纯农夫职责（只负责种地并将作物放入田边数据缓存区），由水獭接管所有搬运工作。

### 8.2 纯数值缓存与满载智能分流 (Smart Overflow Without Visual Clutter)
- **移除库存堆叠贴图**：田边菜篮、工坊输入/输出槽、集市摊位的库存仅在后台用字典/数值维护（默认上限 `10`，随等级提升 `10 + 5*(L-1)`），不在建筑旁额外渲染堆叠的小图标，保持像素画面干净。
- **工坊满载分流**：当水獭背着原料前往工坊（`workshop_mortar` 或 `workshop_cauldron`）时，若目标工坊输入槽已满（或尚未雇佣工坊主厨），水獭不原地等待，直接改道将生鲜原料背往 `market_stall` 直售。
- **满仓休眠气泡**：仅当农田缓存区已满且无人搬运时，兔子暂停收割并在头顶显示简单的文本气泡 `"Zzz..."`。

### 8.3 三岛阶梯式供应链与皇冠富豪顾客 (3-Island Supply Chain & VIP Customers)
- **岛屿 1（射手村 Henesys）**：产出基础鲜果与初级农作物 -> 狐狸驻守 `workshop_mortar`（研钵）加工为初级美食（`3.5x` 价值） -> 就近送入主集市摊位。
- **岛屿 2（魔法密林 Ellinia）**：解锁木桥 1 后开启，产出中阶魔法作物 -> 企鹅驻守 `workshop_cauldron`（坩埚）炼制中阶魔法料理（`12x` 价值） -> 由巨嘴鸟 (`toucan`) 跨木桥批量运回岛屿 1 的主集市摊位。
- **岛屿 3（天空海岸 Orbis Coast）**：解锁木桥 2 后开启，产出顶级作物，配置研钵+坩埚双工坊联动（单品价值达 `52x`）。
- **右侧地标富豪顾客 (`VIP Customer`)**：岛屿 3 解锁后，最右侧地标 `landmark_right_tiki.png` 每隔 `35 ~ 50 秒` 刷新一位头顶带有皇冠标识的富豪顾客，单次采购量固定为 `3 ~ 5 件`，结账时额外支付 **`2.0x` 双倍金币小费**。

### 8.4 桌面透明摸鱼模式专属交互 (Desktop Companion UX)
- **视图拖拽与微缩**：在透明置顶模式下，支持按住 `Alt + 鼠标左键` 直接拖拽平移整个三岛视图在桌面上的停靠位置，并支持鼠标滚轮在 `0.4x ~ 1.5x` 范围内整体缩放。
- **胶囊悬浮窗自动折叠**：进入透明置顶模式后，自动收起常规 HUD 抽屉，仅在角落保留一个紧凑的冒险岛风格「金币胶囊悬浮球」；鼠标悬停 (`mouse_entered`) 时平滑展开升级抽屉，鼠标移开 (`mouse_exited`) 满 `3.0 秒` 后自动折叠并降为 `40%` 透明度。


---

## 9. PRD Patch v2.2 核心玩法、视觉进化与音效完整升级 (已实装)

### 9.1 建筑固定槽位、严格动物编制上限与招满转进修
- **岛屿 1（射手村 `henesys`）**：`2x 农田`, `1x 苹果树`, `1x 研钵工坊`, `1x 集市摊位`, `1x 蘑菇屋`；动物编制上限：兔子 `Max 2`、水獭 `Max 2`、狐狸 `Max 1`、柴犬 `Max 1`。
- **岛屿 2（魔法密林 `ellinia`）**：`2x 农田`, `1x 坩埚工坊`；动物编制上限：兔子 `Max 2`、水獭 `Max 1`、企鹅 `Max 1`、巨嘴鸟 `Max 2`。
- **岛屿 3（天空海岸 `orbis_coast`）**：`2x 农田`, `1x 苹果树`, `1x 研钵工坊 + 1x 坩埚工坊 (双工坊联动)`；动物编制上限：兔子 `Max 2`、水獭 `Max 2`、狐狸 `Max 1`、企鹅 `Max 1`、巨嘴鸟 `Max 2`。
- **招满转进修机制**：当某工种在已解锁岛屿达到编制上限后，UI 按钮自动由【招募】切换为【全队进修 (Lv.+1)】，直接提升该工种全队的移速、运力或加工速度。

### 9.2 每 25 级里程碑：作物/美食自动换代 + 建筑本体四阶视觉蜕变 (`BuildingVisualUpgrader.gd`)
- **自动换代**：农田与工坊每升 25 级自动切换至 `crops_sheet.png` / `delicacies_sheet.png` 的下一高阶品种，并触发 `2x` 产能翻倍。
- **建筑本体四阶蜕变**：
  - **Tier 1 (Lv.1~24)**：基础建筑贴图 + 升级 Q 弹缩放动效 (`1.22 -> 0.92 -> 1.0`)。
  - **Tier 2 (Lv.25~49)**：农田挂载 `decor_scarecrow.png`；工坊挂载 `decor_signpost.png` 并开启顶部 `CPUParticles2D` 蒸汽/炼金星火；摊位挂载 `decor_lamp.png` 与暖黄光晕。
  - **Tier 3 (Lv.50~99)**：基础缩放提升至 `1.08x`，底部浮现像素「银星徽章」底座，粒子密度翻倍。
  - **Tier 4 (Lv.100+)**：挂载自定义 `ShaderMaterial` 实现金色流光描边与环绕金色星尘粒子。

### 9.3 纯代码合成 8-Bit 复古轻音效与一键静音 (`src/autoload/SoundManager.gd`)
- 基于 `AudioStreamGenerator` 实时数学合成 `play_coin_sfx()` (B5->E6)、`play_upgrade_sfx()` (C5->E5->G5)、`play_milestone_sfx()` (四音和弦)、`play_pop_sfx()` (400Hz->600Hz)；进入桌面透明摸鱼模式自动默认静音，并在 HUD 右上角提供【🔊/🔇】一键静音开关。

---

## 10. PRD Patch v2.3 环境昼夜天气、奇遇礼盒、动物抚摸与山海图鉴 (已实装)

### 10.1 动态昼夜与四时天气轮转 (`DAY / DUSK / NIGHT / RAIN`)
- 支持晴昼 (`DAY`)、晚霞 (`DUSK`，全岛作物生长 `+25%`)、夜市 (`NIGHT`，皇冠富豪顾客刷新率 `2x` + 荷花池动态像素萤火虫)、微雨 (`RAIN`，农田免浇灌加速 + 像素斜雨丝)。
- 抽屉面板右上角提供天气轮转按钮，支持一键预览或随时间自然轮转。

### 10.2 荷花池悬浮「★奇遇礼盒」与全岛狂欢 (`Carnival Frenzy`)
- 荷花池 (`x: 1120..1250`) 上方定时刷新漂浮奇遇礼盒，点击或经过触发即时金币奖励与 `20s` 全岛 `2.0x` 狂欢加速。

### 10.3 小动物点击抚摸加速 (`+50%` 效率) 与 3 层前爪抱篮挂载
- 点击任意已雇佣小动物触发 `10s` 抚摸加速 (`+50%` 移速与采集/加工效率)，头顶浮现 `emote_heart.png` 红心气泡。
- 搬运中的农夫兔、物流水獭、跨岛巨嘴鸟采用“竹编菜篮底托 + 作物/料理图标 + 前爪握把遮罩 (`carry_front_grip`)” 3 层合成挂载。

### 10.4 山海图鉴收集册 (`unlocked_codex`)
- 收录全岛 4 阶共 8 种作物与料理（一阶晨露田园、二阶果香烘焙、三阶密林星露、四阶云海盛宴），每点亮 1 项永久提升全岛售价 `+10%`（满图鉴 `+80%`）。

### 10.5 鼠标锚点平滑缩放 (`Zoom-to-Cursor`) 与全岛五段式零交叉动线
- 滚轮缩放以鼠标光标所指的世界坐标为锚点 (`0.45x ~ 1.85x`)，支持 `1.0x` 磁吸对齐、右键惯性拖拽平移、`1/2/3` 键快速聚焦对应岛屿。
- 1 号岛采用“农夫兔 (`698..744`) -> 水獭投料 (`772..864`) -> 狐狸主厨 (`890`) -> 水獭送摊 (`932..997`) -> 顾客右侧购物步道 (`1041..1075`)”五段式顺向流水线，彻底杜绝角色与顾客动线交叉重叠。

---

## 11. 文档驱动持续开发与自动巡检看板 (Living Spec & Playtest Backlog)

> **核心工作流说明**：本文档 (`d:\project\maple-isle-idle\PRD.md`) 是《枫叶云岛物语》唯一生效的**持续开发与自动巡检主契约**。
> - **当您想要新增功能、调整数值或修改检测标准时**：只需直接修改下方 **【11.2 持续迭代待办清单】**（新增 `- [ ] 您的需求描述`）或修改 **【11.3 动态巡检断言参数表】** 中的阈值。
> - **自动同步与巡检机制**：
>   1. `src/autoload/SelfTestRunner.gd` 每次执行 `--self-test` 时都会**实时读取并解析本文件 (`res://PRD.md`)**，自动应用 `11.3` 中的最新断言阈值，并扫描 `11.2` 中的 `- [ ]` 待开发项；
>   2. 每 2 小时定时巡检任务唤醒（或您手动触发）时，AI 会首先读取本节内容：若发现任何 `- [ ]` 待办项或文档规范更新，立即在 `src/` 中原地编码实现、在 `SelfTestRunner.gd` 中补充对应验证断言、运行 `./run_godot.ps1 --self-test` 并审视真机截图，验证 100% 通过后将 `- [ ]` 自动更新为 `- [x]` 并记录至 `playtest_audit_log.md`。

### 11.2 持续迭代待办清单 (`[ ]` 待开发/待同步 | `[x]` 已实装并纳入巡检)
- [x] 隔离自动化试玩存档路径 (`user://savegame_selftest.json`)，防止 `--self-test` 污染玩家真实存档
- [x] 未解锁岛屿（岛屿 2/3）的建筑禁止提前升级，且山海图鉴不会在 `soil_1 < Lv.25` 时提前解锁 `crop_1`
- [x] 鼠标滚轮支持以光标所在像素点为锚点的平滑缩放 (`Zoom-to-Cursor`) 与 `1.0x` 磁吸复位
- [x] 全岛五段式顺向交接动线（原料筐左交右取、工坊左投中厨右出、顾客右侧步道排队买单，零交叉重叠）
- [x] `SelfTestRunner.gd` 实时解析 `PRD.md` 的 `[SPEC-ASSERTIONS]` 动态参数表与 `11.2` 待办清单

<!-- 在下方直接添加 `- [ ] 您的新需求或检测规则`，下一次巡检/开发将自动读取并落地验证： -->

### 11.3 动态巡检断言参数表 (`SelfTestRunner.gd` 实时解析)
```ini
[SPEC-ASSERTIONS]
max_sprite_frame_px = 180.0
max_building_overlap_pct = 15.0
min_building_gap_px = 28.0
min_workshop_dock_gap_px = 40.0
customer_min_x = 1035.0
customer_locked_isl3_max_x = 1080.0
min_60s_worker_move_px = 50.0
min_60s_harvest_count = 15
min_60s_items_delivered = 30
min_60s_customer_checkouts = 1
[/SPEC-ASSERTIONS]
```

