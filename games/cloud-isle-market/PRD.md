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

> **核心工作流说明**：本文档 (`C:\project\idle-games\games\cloud-isle-market\PRD.md`) 是《枫叶云岛物语》唯一生效的**持续开发与自动巡检主契约**。
> - **当您想要新增功能、调整数值或修改检测标准时**：只需直接修改下方 **【11.2 持续迭代待办清单】**（新增 `- [ ] 您的需求描述`）或修改 **【11.3 动态巡检断言参数表】** 中的阈值。
> - **自动同步与巡检机制**：
>   1. `src/autoload/SelfTestRunner.gd` 每次执行 `--self-test` 时都会**实时读取并解析本文件 (`res://PRD.md`)**，自动应用 `11.3` 中的最新断言阈值，并扫描 `11.2` 中的 `- [ ]` 待开发项；
>   2. 每 1 小时定时巡检任务唤醒（或您手动触发）时，AI 会首先读取本节内容：若发现任何 `- [ ]` 待办项或文档规范更新，立即在 `src/` 中原地编码实现、在 `SelfTestRunner.gd` 中补充对应验证断言、运行 `./run_godot.ps1 --self-test` 并审视真机截图，验证 100% 通过后将 `- [ ]` 自动更新为 `- [x]` 并记录至 `playtest_audit_log.md`。

### 11.2 持续迭代待办清单 (`[ ]` 待开发/待同步 | `[x]` 已实装并纳入巡检)

#### 【基座与产线防呆（已完成）】
- [x] 隔离自动化试玩存档路径 (`user://savegame_selftest.json`)，防止 `--self-test` 污染玩家真实存档
- [x] 未解锁岛屿（岛屿 2/3）的建筑禁止提前升级，且山海图鉴不会在 `soil_1 < Lv.25` 时提前解锁 `crop_1`
- [x] 鼠标滚轮支持以光标所在像素点为锚点的平滑缩放 (`Zoom-to-Cursor`) 与 `1.0x` 磁吸复位
- [x] 全岛五段式顺向交接动线（原料筐左交右取、工坊左投中厨右出、顾客右侧步道排队买单，零交叉重叠）
- [x] `SelfTestRunner.gd` 实时解析 `PRD.md` 的 `[SPEC-ASSERTIONS]` 动态参数表与 `11.2` 待办清单

#### 【阶段一（v2.4）：桌面挂机人体工学、防坏档与专注伴侣】
- [x] [v2.4-1] 双备份防坏档存档系统 (`GameManager.gd`)：`save_game()` 写入 `user://savegame.json` 前自动备份上一份有效存档至 `user://savegame.json.bak`（测试模式下为 `user://savegame_selftest.json.bak`），`load_game()` 遇主存档解析失败时自动从 `.bak` 恢复；在 `SelfTestRunner.gd` 增加双备份存档生成与恢复校验断言
- [x] [v2.4-2] 离线收益结算与欢迎回归播报 (`GameManager.gd` + `HUD.gd`)：新增 `calculate_and_apply_offline_earnings(elapsed_sec: int) -> Dictionary` 计算离线时长（`60s ~ 86400s`）并发放离线金币与预估收获件数，重开游戏时通过 `HUD` 飘字/状态提示展示离线账单；在 `SelfTestRunner.gd` 增加模拟 `600s` 离线收益计算与金币到账断言
- [x] [v2.4-3] 任务栏智能贴合、节能帧率锁与窗口透明度调节 (`WindowController.gd` + `HUD.gd`)：使用 `DisplayServer.screen_get_usable_rect()` 自动避让系统任务栏贴底停靠，新增节能帧率切换（`30 / 60 FPS`）与窗口整体透明度调节（`60% ~ 100%`）；在 `SelfTestRunner.gd` 增加帧率锁与透明度接口校验断言
- [x] [v2.4-4] 内置像素「番茄钟专注伴侣 (Pomodoro Focus Timer)」(`GameManager.gd` + `HUD.gd`)：实装 `25分钟专注 (1500s)` 计时器开关與状态显示，专注完成时自动发放「★专注晨露礼盒」（额外金币奖励 + 触发 `30s` 全岛 `2.0x` 狂欢加速）；在 `SelfTestRunner.gd` 增加番茄钟启动、快进完成与礼盒奖励结算断言

#### 【阶段二（v2.5）：中后期玩法深度、皇家契约与岛屿造景增益】
- [x] [v2.5-1] 飞艇皇家订单与二级货币「晨露琥珀」系统 (`GameManager.gd` + `HUD.gd`)：新增 `amber: int`（晨露琥珀）与循环刷新的皇家订单 `active_contract`（提交/售出指定数量作物或料理后自动完成订单，奖励金币 + `1~3` 颗晨露琥珀并刷新下一单）；在 `HUD.gd` 展示琥珀与订单进度，并在 `SelfTestRunner.gd` 增加订单完成与琥珀发放断言
- [x] [v2.5-2] 浮岛功能性微缩造景与全局被动增益 (`EconomyConfig.gd` + `GameManager.gd` + `MainWorld.gd`)：支持消耗「晨露琥珀」解锁 3 座岛屿专属增益造景（1号岛【蜜蜂花箱】农田生长 `+20%`、2号岛【荧光风铃】工坊加工 `+20%`、3号岛【招财提基灯】顾客小费 `+20%`）；在 `SelfTestRunner.gd` 增加造景解锁与倍率生效断言
- [x] [v2.5-3] 小动物进修特质词条系统 (`EconomyConfig.gd` + `AnimalWorker.gd` + `HUD.gd`)：小动物达到 `Lv.10 / Lv.25 / Lv.50` 时自动激活专属进修特质（兔子收获产量 `+1`、水獭/巨嘴鸟移速 `+20%`、狐狸/企鹅加工耗时 `-15%`、柴犬小费率 `+15%`），在动物面板显示特质标签并在 `SelfTestRunner.gd` 校验特质数值生效

#### 【阶段三（v2.6）：视听质感、环境白噪音与像素生态微剧场】
- [x] [v2.6-1] 程序化自然白噪音合成器 (`SoundManager.gd` + `HUD.gd`)：扩展基于平滑噪声合成的轻柔环境白噪音（晴昼微风、微雨雨声、夜市虫鸣），随天气切换并支持独立开关与静音联动；在 `SelfTestRunner.gd` 校验白噪音状态接口
- [x] [v2.6-2] 荷花池游动像素锦鲤与林间生态微动画 (`MainWorld.gd`)：在 1 号岛荷花池（`x: 1100..1280`）绘制悠闲游动的橙白像素小锦鲤与动态水纹互动；在 `SelfTestRunner.gd` 校验锦鲤坐标严格限制在荷花池水域内不越界

#### 【阶段四（v2.7）：Steam 商业级基建（成就系统、多语言本地化、统计看板）】
- [x] [v2.7-1] 应用内 Steam 成就系统与解锁播报 (`EconomyConfig.gd` + `GameManager.gd` + `HUD.gd`)：定义并实装 16 项核心成就（初入云岛、第一桶金、研钵飘香、密林开拓者、黄金海岸、山海全席、专注达人、皇家供货商等），达成时触发成就解锁提示并持久化存档；在 `SelfTestRunner.gd` 校验成就自动解锁逻辑
- [x] [v2.7-2] 多语言国际化字典与一键切换 (`EconomyConfig.gd` + `HUD.gd`)：支持 `zh_CN`（简中）/ `en_US`（English）/ `ja_JP`（日本語）核心 UI 文本一键实时切换；在 `SelfTestRunner.gd` 校验多语言切换后 UI 文本非空且无乱码
- [x] [v2.7-3] 云岛经营生涯统计与星级声望 (`GameManager.gd` + `HUD.gd`)：统计累计收获作物、累计制作料理、累计服务顾客、累计完成皇家订单数，并计算“云岛星级声望（1星~5星）”；在 `SelfTestRunner.gd` 校验统计计数器单调递增与声望星级计算

#### 【阶段五（v3.0）：Steam 发行就绪与三岛终局压力巡检】
- [x] [v3.0-1] 全三岛满编高负载压力自检 (`SelfTestRunner.gd`)：在自动化自检中覆盖解锁岛屿 2 与岛屿 3、招募企鹅与巨嘴鸟跨木桥运输及双工坊联动的端到端断言，确保三岛全开 0 死锁、0 穿模
- [x] [v3.0-2] Steamworks API 抽象桥接层 (`src/autoload/SteamBridge.gd` + `project.godot`)：提供无外部 DLL 依赖时自动优雅降级、挂载 `GodotSteam` 时自动同步成就与云存档的桥接单例，并纳入 `SelfTestRunner.gd` 断言
- [x] [CI-1] 摸鱼微互动——抚摸动物加速与天空热气球礼袋 (`AnimalWorker.gd` + `MainWorld.gd` + `WindowController.gd` + `SelfTestRunner.gd`)：左键点击岛上任意 6 类执勤动物触发欢快跳跃、像素爱心气泡与音效并获得 `8s`“干劲满满”移速与采集加速 Buff（带内置防鬼畜冷却）；天空定期飘过像素「云端热气球 / 许愿礼袋」（`sky_balloon_gift.png`），同步注册进 `WindowController.gd` 鼠标防穿透多边形热区，点击掉落额外金币 + 晨露琥珀并触发集市狂欢，纳入 `SelfTestRunner.gd` 自动化断言
- [x] [CI-2] 特殊访客与节庆夜市——美食评论家、云游行商与夜间「云端花火灯会」庆典 (`CustomerNPC.gd` + `GameManager.gd` + `MainWorld.gd` + `HUD.gd` + `SelfTestRunner.gd`)：新增专属像素访客「美食评论家」（指定品鉴高阶料理，满意后触发 `36s`「金牌口碑」全岛售价与小费加成并佩戴金星勋章）與「云游行商」（收购果园田头富余初级作物换取晨露琥珀与金币）；夜晚概率开启「云端花火灯会」庆典（悬挂暖金像素彩灯串 `fest_lantern_garland.png`、绽放像素烟花微粒子、客流刷新提速与富豪到访率提升），纳入 `SelfTestRunner.gd` 自动化断言
- [x] [CI-4] 浮空飞艇远洋商队大订单与二十四节气限定美食 (`EconomyConfig.gd` + `GameManager.gd` + `MainWorld.gd` + `WindowController.gd` + `HUD.gd` + `SelfTestRunner.gd`)：东港定期停靠像素「浮空货运飞艇」（`airship_caravan.png`，含防穿透多边形热区），发布多食材/料理+节气美食组合大订单并结算金币、晨露琥珀与「稀有图鉴券」；实装 24 节气流转与春分青团/夏至杨梅饮/秋分蟹粉酥/冬至暖汤圆 4 款节气限定美食（当季 `1.45x` 溢价与四时增益、图鉴券兑换食谱），纳入 `SelfTestRunner.gd` 断言 17 自动化验证
- [x] [CI-5] 云端温室奇花异草培育房与岛屿名物伴手礼礼盒 (`CloudGreenhouse.gd` + `EconomyConfig.gd` + `GameManager.gd` + `MainWorld.gd` + `CustomerNPC.gd` + `WindowController.gd` + `HUD.gd` + `SelfTestRunner.gd`)：2 号岛新增像素「云端温室奇花异草培育房」（`cloud_greenhouse.png`，底部中心锚定 `GROUND_Y = 124.0`，与邻近建筑净间距 `>= 28px`、`0.0%` 重叠并注册防穿透热区），支持奇花异草生长周期与杂交突破（星露铃兰 -> 云霓琉璃玫瑰）及全岛光环增益；支持将温室奇花与特色美食打包为「星露花语礼盒 / 皇家名物礼盒」，吸引「收藏家旅客」高溢价选购并结算金币、晨露琥珀、稀有图鉴券与岛屿声望加成，纳入 `SelfTestRunner.gd` 断言 18 自动化验证
- [x] [CI-6] 3号岛云海温泉旅馆与贵宾萌宠疗愈汤屋 (`CloudHotspringInn.gd` + `EconomyConfig.gd` + `GameManager.gd` + `MainWorld.gd` + `AnimalWorker.gd` + `CustomerNPC.gd` + `WindowController.gd` + `HUD.gd` + `SelfTestRunner.gd`)：3 号岛新增像素「云海温泉汤屋」（`cloud_hotspring_inn.png`，底部中心锚定 `GROUND_Y = 124.0`，与岛 3 全部建筑净间距 `>= 28px`、`0.0%` 重叠并注册防穿透热区），联动三岛鲜草与温室奇花熬制「艾草暖身汤 / 樱瓣云雾汤 / 星珀灵泉汤」三款浴汤，释放温泉蒸汽恢复全岛员工精力（移速与劳作提速），吸引佩戴徽记的「贵宾萌宠汤客」结算 `1.70x~1.85x` 高额小费、晨露琥珀、稀有图鉴券与岛屿声望，纳入 `SelfTestRunner.gd` 断言 19 自动化验证
- [x] [CI-8] 1号岛云端茗香制茶坊与荷塘月色画舫品茗雅集 (`CloudTeaPavilion.gd` + `EconomyConfig.gd` + `GameManager.gd` + `MainWorld.gd` + `MarketStall.gd` + `Workshop.gd` + `WaypointGraph.gd` + `AnimalWorker.gd` + `CustomerNPC.gd` + `WindowController.gd` + `HUD.gd` + `SelfTestRunner.gd`)：1 号岛 6 主建筑等距重排并新增像素「云端茗香制茶坊」（`cloud_tea_pavilion.png`，底部中心锚定 `GROUND_Y = 124.0`，全三岛 16 座主建筑净间距 `>= 28.0px`、`0.0%` 重叠），支持炒制「云雾春芽」并冲泡「云雾龙井茗茶 / 桂花乌龙香茗」上架集市与款待品茗雅客、释放「茗香清心光环」提升全岛员工移速/精力与小费倍率；荷花池（`1142..1244`）开启限时庆典「月色画舫品茗雅集」（`icon_moon_tea_boat.png` 水面往返漫游、点击领琥珀/稀有图鉴券/声望并享 `1.38x` 茗茶佳肴溢价），同步扩展山海图鉴第 10 卡「★茗香茶韵鉴(3/3)」并纳入 `SelfTestRunner.gd` 断言 21 自动化验证
- [x] [CI-9] 云海星灯祈愿水灯节与山海特级食神品鉴席 (`ChefTastingPavilion.gd` + `EconomyConfig.gd` + `GameManager.gd` + `EventBus.gd` + `MainWorld.gd` + `WaypointGraph.gd` + `Workshop.gd` + `CloudGreenhouse.gd` + `CloudWindmillBakery.gd` + `BuildingVisualUpgrader.gd` + `HUD.gd` + `SelfTestRunner.gd`)：2 号岛 6 主建筑等距重排（`[67.0..492.0]`，相邻净间距 `28.08~28.18px`）并在最右槽位落地像素「山海特级食神品鉴席」(`chef_tasting_pavilion.png`，底部中心锚定 `x=469.9, GROUND_Y=124.0`，全三岛 17 座主建筑净间距 `>= 28.0px`、重叠面积 `0.0px²`)，组合三岛既有食材/成品烹制「云海灌汤小笼 / 星光锦鲤清蒸鱼 / 山海八珍火锅」并逐道通过品鉴挑战（及格 80 分，品鉴席等级与水灯节加分），三道全过荣获「食神勋章」并扩展山海图鉴第 11 卡「★山海食神鉴(3/3)」；荷塘 3 条 + 海岸浅滩 3 条水灯航道开启限时「云海星灯祈愿水灯节」(`star_lantern.png` 漂流水灯 100% 落在岛屿贴图水面像素、零碰建筑与栈桥，点击得金币/琥珀/图鉴券/声望、每 3 盏「祈愿成真」，节庆期间全集市 `1.30x` 售价)，纳入 `SelfTestRunner.gd` 断言 22 自动化验证
- [x] [CI-10] 云海灯塔渔港与岛民名物集市拍卖会 (`LighthouseHarbor.gd` + `EconomyConfig.gd` + `GameManager.gd` + `EventBus.gd` + `MainWorld.gd` + `WaypointGraph.gd` + `Workshop.gd` + `CloudHotspringInn.gd` + `BuildingVisualUpgrader.gd` + `HUD.gd` + `SelfTestRunner.gd`)：3 号岛 6 主建筑等距重排（`[1416.0..1836.0]` 沙滩，相邻净间距 `28.04~28.10px`，双工坊按研钵+坩埚真实并集宽 `43.0px` 计入）并在第 5 槽落地像素「云海灯塔渔港」(`lighthouse_harbor.png`，底部中心锚定 `x=1743.4, GROUND_Y=124.0`，栈桥接地像素全落沙滩，全三岛 18 座主建筑净间距 `>= 28.0px`、重叠面积 `0.0px²`)；两艘渔船 (`fishing_boat.png`) 在东湾 `[1760..1794]` 航道按「靠泊 8s → 出海 6s → 远洋 20s → 归航 6s」半周期错峰轮班（同屏最多 1 艘），船体+涟漪 `35` 点足迹逐像素校验 100% 落在 `island_orbis_coast.png` 水面、零碰建筑/`Lv.` 标签/水灯航道（3 条海岸水灯航道同步迁至潟湖/浅滩/海湾），归港卸下「云海鲜渔获」(`seafood_catch.png`) 上架集市并优先供应食神品鉴席「星光锦鲤/山海火锅」；新增限时「岛民名物集市拍卖会」(`icon_auction_gavel.png` / `rare_specialty_box.png`)：3 件名物（珊瑚明珠名物匣·金币 / 云海鲜味名物篮·琥珀 / 三岛名物伴手礼盒·金币）每件 10s（2.5s 软收槌），3 位岛民按固定 1.5s 节奏轮流加价至确定性上限，玩家出价胜出获得琥珀/图鉴券/声望/藏品与 `45s` 名物热卖 `1.25x`，一场全拍下荣获「名物金槌勋章」并点亮山海图鉴第 12 卡「★名物拍卖鉴(3/3)」，纳入 `SelfTestRunner.gd` 断言 23 自动化验证
- [x] [CI-11] 云端牧场乳品工坊与星空夜市露天电影院 (`DairyWorkshop.gd` + `OpenAirCinema.gd` + `EconomyConfig.gd` + `GameManager.gd` + `EventBus.gd` + `MainWorld.gd` + `WaypointGraph.gd` + `Workshop.gd` + `MarketStall.gd` + `CloudTeaPavilion.gd` + `BuildingVisualUpgrader.gd` + `HUD.gd` + `SelfTestRunner.gd`)：1 号岛 7 主建筑等距重排（`[566.0..1046.7]` 草地，相邻净间距 `28.05~28.18px`，苹果树/蘑菇农舍/茶坊 `0.355`、乳坊 `0.38`、研钵 `0.53`、摊位 `0.375`）并在第 4 槽（农舍与研钵之间）落地像素「云端牧场乳品工坊」(`dairy_workshop.png`，底部中心锚定 `x=817.3, GROUND_Y=124.0`，接地像素全落草地，全三岛 19 座主建筑净间距 `>= 28.0px`、重叠面积 `0.0px²`)：农田篮里 1 份收获作物喂云朵奶牛挤出 2 瓶「云朵鲜奶」(`milk_bottle.png`，无饲料仅挂机放牧 1 瓶)，2 瓶鲜奶熟成「云顶熟成奶酪」(`cheese_wheel.png`)、鲜奶 + 金麦粉/红草莓/桂花糕蒸「云朵焦糖布丁」(`cloud_pudding.png`)，冷库留 1 份、余量上摊售卖，并作为食神品鉴席「山海八珍火锅」(奶酪)/「云海灌汤小笼」(鲜奶) 食材；新增只在夜市 (`NIGHT`) 出现的事件道具「星空夜市露天电影院」(`open_air_cinema.png`，锚定 1 号岛东岬草地 `x=1334.5`，距岛 1 最近建筑 `268px`，黎明收起，期间飞艇缆桩让位)：每个夜晚 42s 连映 3 部电影（12s 放映 + 2s 幕间），每场观众 8 人（CI-2 花火灯会 +4）× 影票价结算，观众购买云朵布丁/鲜奶零食 `1.35x`，开映夜全集市售价 `1.25x`、客流 `1.6x`、访客上限 +1，黎明中断场次作废无收入，一夜连映 3 部荣获「星空影迷勋章」并点亮山海图鉴第 13 卡「★星空影院鉴(3/3)」(`icon_movie_ticket.png`)，纳入 `SelfTestRunner.gd` 断言 24 自动化验证
- [x] [CI-12] 云端陶艺窑坊与岛民秋季运动会 (`PotteryKiln.gd` + `EconomyConfig.gd` + `GameManager.gd` + `EventBus.gd` + `MainWorld.gd` + `WaypointGraph.gd` + `AnimalWorker.gd` + `BuildingVisualUpgrader.gd` + `HUD.gd` + `SelfTestRunner.gd`)：空间方案——`1920x300` 桌面条在岛 2 左侧/岛 3 右侧仅余 `64px` 天空，第 4 小岛在 `1.0x` 默认视图必然出屏，故不新增岛屿、不再缩小任何建筑：像素「云端陶艺窑坊」(`pottery_kiln.png` 112x104) 接管 3 号岛第 1 槽（木桥 2 登岸处，原装饰性重复苹果树槽位，同贴图宽 112px × `0.39` = `43.68px`，底部中心锚定 `x=1437.8, GROUND_Y=124.0`，接地像素全落沙滩，窑|田净间距 `28.06px`），全三岛仍 19 座主建筑 (7+6+6) 净间距 `>= 28.0px`、重叠 `0.0px²`、槽位与实渲染缩放全部 `>= 0.35`；陶土来自既有农田循环（每次农田收获翻出 1 份「云岛陶土」`clay_lump.png`），燃料为农田篮 1 份收获作物的秸秆/果壳柴束，「云纹手作茶碗」(`tea_bowl.png`，1 土 + 1 柴) 与「青釉云纹陶花瓶」(`clay_vase.png`，2 土 + 1 柴) 交替烧制，窑架各留 1 件、余量上摊售卖，伴手礼盒优先装陶（皇家礼盒←陶花瓶、花语礼盒←茶碗）；新增限时事件「岛民秋季运动会」（不新增建筑，荷塘双栈桥赛道 `[1094..1290]`，`sports_flag.png` 起终点旗）：岛 1 至少 2 种员工组队（月兔/水獭/狐狸/柴犬队）自动按 210s 冷却开幕（首届 75s），6s 入场 → 接力赛 / 湖心拔河 / 丰收搬运赛各 12s（间隔 2s）→ 4s 金丝带颁奖，共 50s；员工本体切换运动员模式真实走上赛道比赛、赛后回到原任务，名次由物种属性 + 等级 + (队伍/项目/届次) 哈希状态确定性计算（两次重放完全一致），名次积分 3/2/1/0，每项奖金 = 挂机金币/秒 × 10s（至少 120G）+ 1 琥珀（首办 +1 图鉴券），总冠军荣获「金丝带奖牌」(`gold_ribbon_medal.png`，+3 琥珀 +1 券 +80 声望 + 冠军干劲 8s 加速)，运动会期间观赛人潮全集市售价 `1.20x`、客流 `1.5x`、访客上限 +1，点亮山海图鉴第 14 卡「★秋季运动会鉴(3/3)」；同步审计全员驻留点（月兔田头两端、狐狸/企鹅主厨与柴犬店长移入 28px 间隙、水獭/巨嘴鸟专属歇脚点），驻留姿态对任一建筑的宽度遮挡 `<= 50%`，纳入 `SelfTestRunner.gd` 断言 25 自动化验证
- [x] [CI-13] 云海风筝节与岛屿四季装扮 (`EconomyConfig.gd` + `GameManager.gd` + `EventBus.gd` + `MainWorld.gd` + `WindowController.gd` + `HUD.gd` + `SelfTestRunner.gd`)：**不新增建筑**（三岛仍 19 座主建筑 7+6+6、净间距 `>= 28.0px`、重叠 `0.0px²`、缩放 `>= 0.355`，任何建筑不缩小不挪动）；限时「云海风筝节」(`kite_carp.png` / `kite_bird.png` / `kite_star.png` / `icon_kite_festival.png`，45s = 3 阵风 × 15s，首届 100s 后、之后每 240s 按冷却自动开幕，HUD 开拓第 15 卡可立即放飞)：6 只像素风筝分飞两条天空航道——西航道 `Rect2(110,-21,366,51)`（岛 2 上空，岛 2 标签行 `y>=44` 之上、风筝节徽标之下）与东航道 `Rect2(1555,-33,300,51)`（岛 3 上空，飞艇离港点 `x<=1542` 以东、渔港拍卖徽标 `y>=22.4` 之上）（`WorldOffsetRoot` 局部坐标，屏幕 y = 局部 y + 36），两航道零碰全部世界标签/飞艇停靠与离港/热气球航线 `x 560..1264`/HUD 横幅与抽屉 `x 480..1440`/建筑；风筝绕锚点系绳摇摆、随风力被吹向下风向并随风势抬升（纯函数：节庆序号 + 节庆时钟，无 RNG），3 套确定性风力程序（微风 0.35 / 和风 0.60 / 劲风 0.90 + 东西风向，换阵风 2s 平滑过渡）轮换；风筝节期间风力加成 产出（农田生长 + 工坊制作）`x(1+0.25w)`、全集市售价 `x(1+0.20w)`；点击风筝（桌面穿透多边形为每只风筝开可点击缺口）收下奖励：锦鲤风筝 = 挂机金币/秒 × 8s（至少 60G）、沙燕风筝 = ×4s + 1 琥珀、星辰风筝 = ×6s + 最高声望，一届收齐 6 只荣获「风筝满天勋章」(+2 琥珀 +1 图鉴券 +60 声望)；「岛屿四季装扮」：按**本地月份**（可注入时钟 `GameManager.season_clock`，与本仓 `ar-survivor` / `mengling` 一致采用北半球气象季：3-5 月春、6-8 月夏、9-11 月秋、12-2 月冬，南半球玩家看到相反季节为已知取舍）切换 5 处季节摆件（`deco_spring.png` 春樱花丛 / `deco_summer.png` 夏日向日葵花箱 / `deco_autumn.png` 秋枫南瓜堆 / `deco_winter.png` 冬日小雪人，`0.28x`、按实色包围盒裁帧后底部中心锚定 `GROUND_Y=124.0`，立于无员工驻留点/造景/赛旗的 28px 空隙、左邻建筑外缘 +16px：岛 2 坩埚|温室 `x=291.70`、风车|食神席 `x=435.65`，岛 1 蘑菇屋|乳坊 `x=783.85`、研钵|茶坊 `x=918.72`，岛 3 温泉|灯塔 `x=1709.76`）与氛围色调（春粉/夏暖/秋琥珀/冬霜蓝，叠加昼夜天气色调），当季摆件每处 +2%（最多 +10%）分别加成 春·农田生长 / 夏·集市售价 / 秋·工坊制作 / 冬·顾客小费；HUD 抽屉 13 张卡以上改为两行布局（每行 7~8 张、等比 `0.50~0.62x` 字号取代 `0.35x` 横向挤压，图标居右垂直居中），开拓第 15 卡「★风筝节」、第 16 卡「★四季装扮」，山海图鉴第 15 卡「★云海风筝鉴(n/3)」（风筝 3 种各 +4%、四季各 +2% 售价），图鉴标题两行显示；纳入 `SelfTestRunner.gd` 断言 26 自动化验证
- [x] [CI-14] 云岛观光摄影打卡与岛民心愿委托告示板 (`EconomyConfig.gd` + `GameManager.gd` + `EventBus.gd` + `MainWorld.gd` + `HUD.gd` + `SelfTestRunner.gd`)：**不新增建筑**（三岛仍 19 座主建筑 7+6+6、净间距 `>= 28.0px`、重叠 `0.0px²`、缩放 `>= 0.355`，任何建筑不缩小不挪动）；「云岛观光摄影打卡」：三岛 28px 间隙已全部被员工驻留点/造景/季节摆件占用、3 号岛无任何空余实地（木桥 2 登岸处桥面低于 `GROUND_Y`，木牌会浮空，已否决），故 3 块像素打卡木牌 (`photo_spot_marker.png`，按实色包围盒裁帧 `0.26x`≈11x16px、底部中心锚定 `GROUND_Y=124.0`、接地像素全落岛屿实地) 立于仅剩的景点旁空地：「风筝晴空台」岛 2 东端 `x=517`（食神席外缘 +25px，西风筝航道正下方）、「荷塘观景岸」荷塘西岸 `x=1060`（摊位外缘 +13px）、「东岬影院坪」1 号岛东岬 `x=1322`（夜间露天影院银幕铺满东岬时木牌收起、景点关闭，黎明淡出期间亦关闭）；观光团（草帽猫旅人 `traveler_mushroom_normalized.png` 2x48px 单帧、`GROUND_Y` 行走的单位）首次 70s 后、之后每 200s 按冷却自动出发（HUD 开拓第 17 卡可立即出发），确定性状态机（34px/s 步行 → 每站摆拍 3.2s、1.4s 快门 → 下一站 → 淡出）由西向东走过开放岛屿上的打卡点，摆拍时相机举到眼前 + 闪光 + 相片 (`photo_card.png`) 从镜头前弹出上浮 4px，拍照动作足迹锁在手持高度带 `y[89,102]`（低于全部徽标标签 `<=87.7`、高于木牌/赛旗/Lv. 标签）；每景点常规照 + 绝景照共 6 张摄影图鉴（风筝台: 晴空风车 / 风筝节时「风筝满天」，荷塘岸: 荷塘锦鲤 / 夜市时隔塘拍「星空影院」，影院坪: 云海灯塔 / 飞艇靠港时「飞艇靠港」），每张 = 挂机金币/秒 × 5s（≥50G，绝景 ×10s ≥100G）+ 声望 12（绝景 28），首拍常规照 +1 琥珀、首拍绝景照 +1 图鉴券，一趟拍满 3 张「打卡集章」+1 图鉴券 +40 声望，观光团在外时客流 `1.15x`，摄影图鉴每张售价 +2%；「岛民心愿委托告示板」(HUD 面板，不占建筑位：开拓第 18 卡 → 3 张心愿便签 `wish_note.png` + 返回卡，单行 `>=0.85x` 等比字号)：月兔/水獭/小狐狸/柴犬/企鹅/巨嘴鸟按固定顺序轮流贴便签，每位岛民在 2 种偏好间交替（交付：收获作物/集市上架/工坊出品；经营：接待顾客/集市营收/观光拍照），每轮岛民目标升一阶（最多 4 阶），进度由真实 `EventBus` 信号驱动（`item_produced` / `item_delivered` / `customer_paid` / `photo_taken`），完成得声望（30~45 + 8/阶，`reputation_star.png`）与图鉴券 1~2 张（`icon_rare_codex_voucher.png`），210s 未完成即过期轮换，完成/过期便签停留 4s 后由下一位岛民补贴，每圆梦 6 张「心愿勋章」+1 图鉴券 +60 声望；新增成就「云岛摄影师」「心愿守护者」，山海图鉴第 16 卡「★观光摄影鉴(n/6)」，图鉴标题第二行加「摄n/6」；纳入 `SelfTestRunner.gd` 断言 27 自动化验证
- [x] [CI-15] 云海天气轮换与岛民生日会 (`EconomyConfig.gd` + `GameManager.gd` + `EventBus.gd` + `MainWorld.gd` + `HUD.gd` + `SelfTestRunner.gd`)：**不新增建筑、地面不放任何东西**（三岛仍 19 座主建筑 7+6+6、净间距 `>= 28.0px`、重叠 `0.0px²`、缩放 `>= 0.355`；CI-14 打卡木牌已用掉最后的地面空隙）；「云海天气轮换」：晴 / 云雨 / 彩虹 / 薄雾 4 种天气由**岛历**（与 CI-13 四季共用的可注入时钟 `GameManager.season_clock`，`set_season_clock()` 一并刷新季节、天气、生日）驱动——本地时间每 `20` 分钟一格，按所在季节权重（春 晴40/雨35/雾25、夏 55/30/15、秋 40/22/38、冬 35/15/50）用确定性整数哈希抽取，**彩虹只在雨格之后**出现（雨后转晴概率 春0.50/夏0.60/秋0.40/冬0.25），无 RNG、跨日/月/年连续，每 5s 刷新、换天发 `sky_weather_changed` 并出横幅；倍率（客流 / 农田 / 工坊 / 售价）：晴 `1.10/1.10/1.00/1.00`、云雨 `0.85/1.25/1.10/1.00`、彩虹 `1.30/1.05/1.05/1.10`、薄雾 `0.90/1.00/1.15/1.05`；与既有系统**有上限叠乘**（`stack_weather_mult`：加成最多把所在组推到上限、绝不削减已有加成，减益全额生效）——产出组 = 天气 x 日夜循环「微雨」农田 x1.35 x CI-13 季节摆件 x 风筝节风力 `<= x1.50`，售价组 = 天气 x 风筝风力 x 夏季摆件 `<= x1.30`，客流组 = 天气 x 节庆 x1.85 x 夜间影院 x 运动会 x 观光团 `<= x2.20`；天空层表现（`weather_*.png` 徽记 + 光芒 / 雨丝 / 彩虹弧 / 薄雾图元，z=-19 位于自绘天空与岛屿底座之上、所有阴影/建筑/单位/标签之下，夜间太阳隐去改为星光、彩虹减淡）只画在 4 个空闲天空区：左上（风筝西航道以西、风筝节徽标之下 `Rect2(6,-16,98,60)`）、右上（风筝东航道以东、3 号岛东岸之外 `Rect2(1860,-30,56,96)`）与 2 / 3 号岛下方云海（`Rect2(14,212,456,46)` / `Rect2(1450,212,456,46)`，HUD 底栏 `x 480..1440` 之外），全部图元按区裁剪；「岛民生日会」（HUD 面板 + 横幅 + 开拓按钮蛋糕角标，不占地面）：岛历「现实 1 个月 = 云岛 1 年」，心愿板 6 位岛民生日固定在每月 3（月兔）/ 8（水獭）/ 13（小狐狸）/ 18（柴犬）/ 23（企鹅）/ 28（巨嘴鸟）日（2 月同样有效），生日当天全天开放、开局/跨日播报一次，开拓第 20 卡 → 生日会面板（今天 / 备礼 / 下一位 / 返回，单行 `>= 0.85x`）：备礼 = 挂机金币/秒 x 30s（`>= 150G`）的礼盒，摊位上有该岛民最爱货品（鲜蔬作物 / 海鲜鲜奶 / 研钵美食 / 烘焙面包 / 云岛茶饮 / 陶艺花卉）时包 1 件进去成「称心礼物」，每个生日只能送 1 次、错过不补；奖励声望 50 + 图鉴券 1（称心再 +30 声望 +1 券），6 位岛民都庆生一轮得「生日全家福」勋章（+80 声望 +2 券；声望图标复用 `reputation_star.png`、券复用 `icon_rare_codex_voucher.png`）；开拓页 20 卡（第 19 卡云海天气、第 20 卡生日会）在每行 10 卡时每卡只留 1 枚图标（图标预留 24px → 13px），旧卡文字一个不被新裁切；山海图鉴第 17 卡「★云海天气(n/4)」（天气每种 +2% 售价、庆生过的岛民每位 +1%），图鉴标题第二行加「天n/4·寿n/6」；新增成就「云海观天师」「生日全家福」；新增 7 枚像素风去底贴图 `weather_sunny/rain/rainbow/mist.png`、`birthday_cake.png`、`birthday_gift.png`、`icon_birthday.png`；纳入 `SelfTestRunner.gd` 断言 28 自动化验证（4 个天气区与 112 个保留区保持 `>= 2px`，4 天气 x 昼夜 x 16 时刻全部图元落在区内）
- [x] [CI-16] 云岛美食评鉴周与岛民友谊羁绊 (`EconomyConfig.gd` + `GameManager.gd` + `EventBus.gd` + `HUD.gd` + `SelfTestRunner.gd`)：**不新增建筑、不占地面与天空层**（地面已满、天空归 CI-15 天气），全部做成 HUD 面板，入口在「动物编制」页（6 位岛民即 6 位员工）第 7 卡「★美食评鉴周」/ 第 8 卡「★岛民羁绊」+ 山海图鉴第 18 卡「★美食评鉴」，开拓页仍 20 卡不变；「云岛美食评鉴周」：岛历周（周一~周日，沿用 CI-13 可注入时钟 `season_clock`）每周由心愿板 6 位岛民按顺序轮值评委，评委口味固定（月兔/企鹅 清香、水獭/巨嘴鸟 鲜香、小狐狸/柴犬 甜香），每周最多提交 3 道**不同**的既有菜品（18 道：研钵/坩埚美食、节气菜、品鉴席名菜、面包、乳品、名茶，各从集市摊位扣 1 份；生料与非食物拒收），得分 = 菜品底分 54~78 + 对味 20 + 与评委羁绊每级 2（封顶 100），每道声望 +得分/4；本周最佳分定奖章：铜 >=70（声望+20）/ 银 >=82（+40、图鉴券+1）/ 金 >=92（+80、图鉴券+2），每档每周只发一次、升档不重复计数；「岛民友谊羁绊」：只由真实事件累积——该岛民心愿圆梦 +12、生日礼物 +30（称心 +15）、当评委时提交菜品 +8（对味再 +8），Lv.1~5 门槛 30/80/150/240/360（满级封顶），永久加成：全岛售价 +0.3%/级（6 人 x 5 级 = 30 级，封顶 +9%）、评鉴分 +2/级；存档保存羁绊、奖章、本周提交（隔周读档自动清空）；4 枚图标为同款游戏既有像素图的复制件（`food_week_judge` / `food_week_plate` / `food_week_medal` / `icon_friendship`，64x64 去底，待美术补图）；自检新增断言 30 并把两块面板纳入断言 29 三语放得下 / 零混排检查。

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

