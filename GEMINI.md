# GEMINI.md — 《云岛集市》底层开发逻辑与防低级错误铁律 (Engineering Constitution)

> **最高指令**：AI Agent 在编写、修改任何 GDScript (`.gd`)、场景 (`.tscn`) 或工具脚本前，必须 100% 遵守本文件的 **【三阶闭环自省与自我验证机制】** 与 **6 条底层工程铁律**。未通过全部 3 步真机自检与视觉自省前，严禁向用户交差！

---

## 最高优先级：三阶闭环自省与自我验证机制 (Self-Reflection & Verification Harness)

### 第一阶：废除 Python 假拼图，实现 Godot 真机快进自检器 (`src/autoload/SelfTestRunner.gd`)
1. **禁止使用 Python PIL 伪造预览图**：所有验证必须基于真实启动的 Godot 引擎运行态。
2. 全局自检脚本 `src/autoload/SelfTestRunner.gd`（当检测到命令行参数包含 `--self-test` 时自动激活）：
   - **20倍速快进仿真**：启动后设置 `Engine.time_scale = 20.0`，让真实主场景 (`MainWorld`) 自动运行 180 帧（模拟游戏内约 60 秒的真实产线运转）。
   - **四大硬性自检断言（任一不通过必须 `push_error` 并调用 `get_tree().quit(1)` 返回非零错误码）**：
     - `[断言1-切帧防呆]`：检查场景内所有动物、游客、作物的 `Sprite2D` 实际单帧渲染宽高，若存在宽高大于 `180px` 的角色贴图（说明整张 SpriteSheet 未切片直接渲染），立即报错退出！
     - `[断言2-建筑防叠罗汉]`：读取同一岛屿上所有主建筑的全局屏幕矩形，若任意两座主建筑水平重叠区域大于 `15%`，立即打印冲突节点名并报错退出！
     - `[断言3-产线活体闭环]`：统计这 60 秒模拟时间内，农田是否完成了收获、动物 (`AnimalWorker`) 的累计位移是否大于 `50px`、是否有物品成功进入工坊或集市摊位。若动物原地不动或产线零产出，立即判定为“状态机死锁”并报错退出！
     - `[断言4-零乱码字体]`：全局扫描节点树，若发现仍在使用废弃的 `PixelFontRenderer`，立即报错退出！
   - **导出真机视口截图**：在第 180 帧通过上述断言后，调用 `await RenderingServer.frame_post_draw`，使用 `get_viewport().get_texture().get_image().save_png("res://preview_live_godot.png")` 导出 100% 真实的引擎渲染画面，然后正常退出 (`get_tree().quit(0)`)。

### 第二阶：强制「视觉照镜子自省协议 (Visual Self-Critique)」
每次运行完 `./run_godot.ps1 --self-test` 生成 `preview_live_godot.png` 后，**必须主动调用图像查看工具（`read_file`）亲自打开并审视 `preview_live_godot.png`**，对照以下 4 个问题进行自我拷问：
1. 画面中是否还有任何碎裂的白色乱码字符？
2. 建筑和小动物脚下是否还有突兀的巨型黑圆饼阴影？
3. 苹果树、农田、木屋、工坊、路灯、集市摊位是否均匀分布在草地上，有无挤成一团？
4. 小动物和游客是否是清晰的单帧像素小人，有无多帧粘连成“刺猬”？

**铁律**：只要在 `preview_live_godot.png` 中看到以上任意一个问题，**严禁停下来问用户或直接交差**！必须自己分析原因、修改代码、重新运行 `--self-test` 并重新看图，直到画面 100% 干净达标！

### 第三阶：交付格式强制规范
每次向用户汇报任务完成时，必须在回复开头附上：
1. `--self-test` 终端输出的【四大断言通过日志】（包含 60 秒内兔子移动距离、收获次数、产出数据）；
2. 亲自查看 `preview_live_godot.png` 后的【视觉自省确认单】。

---

## 铁律 1：单一数据源与单一入口原则 (Single Source of Truth)
1. **严禁双轨代码并存**：全项目严禁同时存在两套功能重复的目录（如旧版 `scenes/ + scripts/` 与新版 `src/` 并存）。所有业务逻辑必须唯一收敛至 `res://src/` 架构下，废弃脚本必须立即物理删除 (`git rm`)，绝不允许留存同名文件（如两个 `GameManager.gd`）。
2. **入口强校验**：每次修改后必须检查 `project.godot`，确保 `run/main_scene` 唯一指向当前激活的主场景，且 `[autoload]` 中的全局单例路径 100% 真实有效、无命名冲突。

---

## 铁律 2：2D 像素空间坐标系与「底部中心锚点」基准 (Bottom-Center Grounding Law)
AI 严禁凭感觉盲填 `(x, y)` 魔法数字坐标，所有场景实体的空间摆放必须遵循以下数学基准：
1. **统一地面基准线 (`GROUND_Y`)**：
   - 每座岛屿必须定义一个明确的草地行走水平线常量 `GROUND_Y`（即动物脚底、建筑底座接触草地的 Y 轴像素坐标）。
2. **强制底部中心对齐 (Bottom-Center Pivot)**：
   - 任何建筑 (`SoilPlot`, `Workshop`, `MarketStall`, `Cottage`, `Tree`, `Decor`)、动物 (`AnimalWorker`) 与游客 (`CustomerNPC`) 的根节点 `global_position` **必须代表其底部中心接地点**。
   - 挂载在实体下的 `Sprite2D` 必须开启居中 (`centered = true`)，并通过公式自动计算垂直偏移：
     ```gdscript
     # 假设单帧显示高度为 frame_h
     sprite.offset = Vector2(0.0, -float(frame_h) * 0.5)
     ```
   - **效果保证**：只要将任意建筑或小动物的 `position.y` 设为 `GROUND_Y`，无论它的贴图是 32px 还是 256px，它都 100% 稳稳站在草地面上，绝不可能出现浮空或陷入地下！
3. **Y-Sort 与渲染层级 (`z_index`) 严格分层**：
   - 背景天空层：`z_index = -100`
   - 浮空岛地形底座与木桥：`z_index = -20`
   - 实体脚底投影 (Drop Shadow)：`z_index = -5`
   - 建筑与装饰物主体：`z_index = 0`（农田底座 `soil_plot` 设为 `-2`，作物设为 `1`）
   - 动物员工与登岛顾客：`z_index = 10`（确保动物从建筑前走过时永远不会被建筑遮挡）
   - 头顶背负物图标与气泡 (`CarryIcon`, `Emote`)：`z_index = 20`
   - 飘字与 UI 特效：`z_index = 50`

---

## 铁律 3：一维槽位分配器与防穿模重叠断言 (1D Slot Layout & Anti-Overlap Assertion)
1. **严禁建筑重叠穿模**：同一座岛屿上的所有建筑必须按 X 轴从左到右分配独立槽位。
2. **包围盒安全间距公式**：相邻两个建筑 $A$ 和 $B$ 的中心点 X 坐标间距，必须满足：
   $$\vert X_A - X_B \vert \ge \frac{\text{Width}_A \cdot \text{Scale}_A + \text{Width}_B \cdot \text{Scale}_B}{2} + \text{MinPadding}$$
   其中最小安全留白 $\text{MinPadding} \ge 28\text{ px}$。装饰物（如 `decor_lamp`、`decor_scarecrow`、`decor_signpost`）必须放置在主建筑外侧边缘 $+16\text{ px}$ 处，严禁与建筑中心坐标重合！
3. **程序化阴影几何公式 (Drop Shadow Math)**：
   - 严禁绘制正圆形或大黑块阴影！
   - 若建筑贴图底部已自带暗部草地阴影（如 `apple_tree.png`, `cottage_mushroom.png`），**必须关闭程序化阴影**。
   - 需要程序化阴影的实体（动物、游客、轻型器具），其阴影必须为**极扁椭圆**：
     - 位置：严格位于实体根节点原点 `Vector2(0, 0)`（即脚底中心）。
     - 尺寸：`shadow_width = entity_visual_width * 0.55`，`shadow_height = shadow_width * 0.18`（宽高比必须保持在 `5 : 1` 左右）。
     - 颜色：`Color(0, 0, 0, 0.20)`（柔和半透明，绝不抢戏）。

---

## 铁律 4：精灵图集切帧安全锁 (Sprite Sheet & Atlas Guardrail)
1. **固定网格切帧规范**：
   - 动物与游客动画帧必须使用 `Sprite2D` 的 `hframes` 与 `vframes`（或 `AtlasTexture`）配合 `sprite_manifest.json` 精确切取。
   - **单帧合法性断言**：切出的单帧角色图像，其有效像素宽高比必须在 `0.5 ~ 1.8` 之间。严禁把整张图集（多行多列）当成一帧直接缩放到角色身上（这会导致画面出现“多头刺猬”状的挤压贴图）！
2. **禁止混合裁切冲突**：若对 `Sprite2D` 启用了 `hframes > 1` 或 `vframes > 1`，则 `region_enabled` 必须要么关闭（直接对整张标准化网格图分帧），要么 `region_rect.size` 必须精确等于 `(cell_width * hframes, cell_height * vframes)`。

---

## 铁律 5：原生 UI 与零乱码文本规范 (Native Typography & UI Guardrail)
1. **严禁手搓位图字体解析器**：
   - **彻底废除并物理删除 `PixelFontRenderer.gd` 与 `pixel_font_atlas.png`**！AI 生成的位图字体图集字符间距不均，切图必出摩斯密码乱码。
2. **100% 采用 Godot 原生文本渲染**：
   - 全项目所有文字（金币数量、建筑等级、升级按钮、飘字）必须使用 Godot 原生 `Label` 节点。
   - 统一使用辅助函数生成高对比度像素风 `LabelSettings`：
     ```gdscript
     func make_pixel_label_settings(size: int = 14, color: Color = Color("#FFF4D6")) -> LabelSettings:
         var ls := LabelSettings.new()
         ls.font_size = size
         ls.font_color = color
         ls.outline_size = 2
         ls.outline_color = Color("#1A120B") # 深褐黑像素硬描边
         ls.shadow_size = 1
         ls.shadow_color = Color(0, 0, 0, 0.6)
         ls.shadow_offset = Vector2(1, 1)
         return ls
     ```

---

## 铁律 6：交付前强制自动化自检管线 (Mandatory Pre-Delivery Audit)
AI Agent 在每次修改完代码后，**严禁直接结束任务**，必须依次运行 `./run_godot.ps1 --self-test` 完成真机 180 帧 20x 快进仿真与四大断言自检，并亲自使用图像查看工具审视 `preview_live_godot.png`！
