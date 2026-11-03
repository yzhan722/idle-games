# GEMINI.md — 《云岛集市》底层开发逻辑与防低级错误铁律 (Engineering Constitution)

> **最高指令**：AI Agent 在编写、修改任何 GDScript (`.gd`)、场景 (`.tscn`) 或 Python 工具脚本前，必须 100% 遵守本文件的 6 条底层工程铁律。任何违反本规范的代码均视为构建失败。

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
     sprite. offset = Vector2(0.0, -float(frame_h) * 0.5)
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
AI Agent 在每次修改完代码后，**严禁直接结束任务**，必须依次运行以下两条命令完成自检：
1. **引擎无头编译自检**：运行 Godot Headless 检查，确保 `0 Error`（无语法错误、无 `null instance` 报错）。
2. **场景几何与视觉自动审计 (`tools/verify_engine_scene.py`)**：
   - 在验证脚本中加入**硬性断言 (Assertions)**：
     - 断言 1：项目中不存在 `PixelFontRenderer` 引用。
     - 断言 2：遍历岛上所有建筑的屏幕矩形 `Rect2`，若任意两个主建筑水平重叠度 $> 10\%$，直接抛出 `AssertionError("Building Overlap Detected!")` 并打印冲突坐标。
     - 断言 3：检查所有动物节点的单帧渲染尺寸，若单帧宽高 $> 120\text{ px}$ 或未启用分帧（把整张 Sheet 渲染出来），直接抛出 `AssertionError("Unsliced SpriteSheet Detected!")`。
   - 只有上述断言全部通过，且重新导出的 `preview_engine_1920x360.png` 视觉干净无重叠，方可向用户交付！
