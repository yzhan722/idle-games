# `tools/regionsplit` · 战区区块细分通用工具与配置规范

本工具将《世界历史地图》原有的粗颗粒度大区块（58 区）按战区声明式切分为自然历史地理单元（方案 A 目标约 102 区：`china` + `europe` + `mideast`），并自动完成关键帧继承、政权空间守卫、分裂期手工覆盖、`stateless_cultures` 拆分以及编年史/商埠/城邦/地标 `regionId` 空间重绑。

- **零第三方依赖**：仅使用 Python 3 标准库。
- **定点替换（Surgical Patching）**：绝不整体重序列化 JS 数据文件，完整保留注释、排版以及 B/C/D/F/W 等并行窗口写入的 `confidence`、`source`、`CITY_STATES` 等字段。
- **严格幂等（Idempotent）**：对同一 `<atlasRoot>` 重复执行两次或多次，第二次起文件字节级零改动（`Files modified: None`）。

---

## 一、快速上手命令

```powershell
# 1. 勘测待拆分父区块的子环索引（主陆/岛屿）、顶点数与经纬度包围盒（写配置前必跑！）
python tools/regionsplit/apply.py <atlasRoot> --inspect britain gaul germania italy balkans

# 2. 干跑校验（验证切分线自交数=0、面积守恒误差=0、都城落点100%命中，不改磁盘文件）
python tools/regionsplit/apply.py <atlasRoot> china --dry-run

# 3. 正式应用单个或多个战区配置（幂等，可重复执行）
python tools/regionsplit/apply.py <atlasRoot> china
python tools/regionsplit/apply.py <atlasRoot> china europe mideast

# 4. 必跑自检（全部通过方为合格）
python tools/verify_project.py
node C:\Project\_work\atlas-factcheck\tools\check.js <atlasRoot>
```

---

## 二、战区配置文件结构（`tools/regionsplit/theaters/<theater>.json`）

每个战区对应 `tools/regionsplit/theaters/` 下的一个 UTF-8 `.json` 文件（完整范例见 `theaters/china.json`）。顶层结构包含 11 个字段：

```jsonc
{
  "theater": "europe",
  "description": "欧洲核心区 12 -> 28 历史地理单元细分",

  // 1. 父区块 -> 直属子区块映射（用于关键帧默认广播继承与候选池限定）
  "parent_to_children": {
    "britain": ["england", "scotland", "ireland"],
    "italy":   ["north_italy", "central_italy", "south_italy"]
  },

  // 2. regions_geo.js 中替换各父区块时的输出顺序（一般与 parent_to_children 一致）
  "expansion_order": {
    "britain": ["england", "scotland", "ireland"],
    "italy":   ["north_italy", "central_italy", "south_italy"]
  },

  // 3. 跨父区块边界重组的候选补充（当切下一块并入相邻父区块的子区时填写，供编年史/城邦重绑检索）
  "cross_parent_candidates": {},

  // 4. 子区块元数据清单（cx/cy 填 null 时自动按极点内切圆算法计算最佳内部标签锚点）
  "children": [
    {
      "id": "england",
      "name": "英格兰与威尔士(伦敦)",
      "continent": "欧洲",
      "parent": "britain",
      "area_weight": 0.55,
      "cx": null,
      "cy": null
    }
  ],

  // 5. 平面拓扑切分流水线（详见第三节）
  "geometry_ops": [ ... ],

  // 6. 历史名城落点断言（自动校验经纬度投影后必须落入指定子多边形，防切反！）
  "capital_checks": [
    { "name": "伦敦",   "ll": [-0.12, 51.51], "expect": "england" },
    { "name": "爱丁堡", "ll": [-3.19, 55.95], "expect": "scotland" },
    { "name": "都柏林", "ll": [-6.26, 53.35], "expect": "ireland" }
  ],

  // 7. 政权空间守卫规则（一对多继承时的生态带/历史边界过滤，详见第四节）
  "polity_guards": [ ... ],

  // 8. 分裂时期逐关键帧人工覆盖表（只准填 timeline_keyframes.js 已存在的年份！）
  "keyframe_overrides": {
    "843":  { "ile_de_france": "西法兰克王国", "rhineland": "东法兰克王国" },
    "1066": { "england": "英格兰王国", "scotland": "苏格兰王国", "ireland": null }
  },

  // 9. 子区块无国家时期考古文化/部落/诸国并立表（必须与关键帧严丝合缝，使 check.js 空白段=0）
  "stateless_cultures": {
    "ireland": [
      { "from": -3000, "to": -500, "kind": "考古学文化", "name": "爱尔兰巨石与青铜聚落", "note": "纽格莱奇墓与大西洋青铜文化圈" },
      { "from": -500,  "to": 1171, "kind": "部落社会",   "name": "盖尔诸小王国（五省王权）", "note": "拉坦诺凯尔特铁器文化与基督教修道院文明，1171年英王亨利二世入侵置领地" }
    ]
  },

  // 10. 编年史重绑规则（关键词表 + 父区块年代默认子区，详见第五节）
  "legacy_parent_centroids": { "britain": [498, 76], "italy": [562, 128] },
  "chronicle_keywords": [
    { "region": "scotland", "keywords": ["苏格兰", "爱丁堡", "斯特灵", "威廉·华莱士", "詹姆斯六世"] },
    { "region": "ireland",  "keywords": ["爱尔兰", "都柏林", "大饥荒", "北爱尔兰"] },
    { "region": "england",  "keywords": ["伦敦", "威斯敏斯特", "大宪章", "黑斯廷斯", "牛津", "曼彻斯特"] }
  ],
  "chronicle_defaults": [
    { "parent": "britain", "region": "england" }
  ],

  // 11. 可选：商埠、城邦、单条编年史及中国逐年百科的显式重绑覆盖（99% 情况靠坐标或关键词自动落点即可）
  "trade_hub_overrides": {},
  "city_state_overrides": {},
  "chronicle_id_overrides": {},
  "annals_overrides": {}
}
```

---

## 三、切分线（`geometry_ops`）怎么写？

### 3.1 底图投影与多环语法
`regions_geo.js` 在欧亚大陆与北非核心带（`15°W–135°E, 10°N–58°N`，完整覆盖中国、欧洲、西亚、北非、中亚）严格服从仿射经纬投影：
$$x = 510.0 + 4.345 \times \text{lon}, \qquad y = 347.9 - 5.1515 \times \text{lat}$$
> **高纬提示（北欧 `scandinavia` / 北俄 `rus` 北纬 `58°N` 以上）**：`58°N` 以北底图做过纵向压缩。切分北欧/北俄高纬段时，先运行 `apply.py <atlasRoot> --inspect scandinavia rus` 查看引擎反算出的等效 `ll_bbox` 与极值点，直接取其显示的等效 `[lon, lat]` 即可零误差吸附。

多环父区块（含岛屿，如 `britain`、`italy`、`balkans`、`lingnan`、`manchuria`）支持下标引用：
- `"britain[0]"`：第 0 环（大不列颠本岛）
- `"britain[1]"`：第 1 环（爱尔兰岛）
- `"manchuria[1:]"`：第 1 环至末尾所有海岛环
- `"$temp_name"`：流水线中间临时多边形变量（以 `$` 开头表示中间产物）

### 3.2 三种几何算子

#### ① `split`：用经纬度折线将单个环一分为二
```json
{
  "op": "split",
  "comment": "沿苏格兰边区切威奥特山脉切分大不列颠岛为苏格兰与英格兰",
  "source": "britain[0]",
  "start_ll": [-3.10, 54.98],
  "end_ll":   [-2.03, 55.77],
  "via_ll":   [[-2.60, 55.35]],
  "snap": "vertex",
  "max_snap_dist": 10.0,
  "select_first": "north",
  "into": ["scotland", "$england_main"]
}
```
- `start_ll` / `end_ll`：切分线在源多边形外边界上的起点与终点 `[经度, 纬度]`。
  - `"snap": "vertex"`（**默认且强烈推荐**）：自动吸附到源环最近的既有顶点（距离超过 `max_snap_dist` 会报错并打印最近 5 个顶点的 `[lon, lat]` 供你复制！）。吸附既有顶点能保证与邻国/邻省公共边 **100% 顶点级严丝合缝**。
  - `"snap": "edge"`：仅当撒哈拉沙漠直线国界（如 `egypt`/`maghreb`）长边中间无顶点时使用，会自动正交投影到最近边并插入共线顶点。
- `via_ll`：多边形内部的折线拐点 `[经度, 纬度]` 列表（从 `start_ll` 走向 `end_ll` 的顺序；直线切分可填 `[]`）。**务必保证拐点严格位于源多边形内部，否则自交检测器会立即拦截报错。**
- `select_first`：决定 `into: [第一块, 第二块]` 谁排第一，支持：
  - 方位词：`"north"` | `"south"` | `"west"` | `"east"`
  - 面积词：`"larger"` | `"smaller"`
  - 地标包含： `{"contains_ll": [12.49, 41.90]}`（包含罗马坐标的那一半作为第一块）

#### ② `merge`：跨父区块无缝缝合（修正现代省界与历史山川错位）
当原版父区块边界不符合历史分界（例如原版将秦岭以南汉中划入 `guanzhong`，需切下并入 `shu`）时，先 `split` 切下碎片，再用 `merge` 消除公共反向有向边合并：
```json
{
  "op": "merge",
  "comment": "将秦岭以南汉中盆地并入巴蜀",
  "sources": ["bashu[0]", "$hanzhong_piece"],
  "into": "$bashu_merged"
}
```

#### ③ `assemble`（或 `copy`）：组装主陆环与附属岛屿环
当父区块带有多个海岛子环（如把西西里岛挂到 `south_italy`、把海南岛挂到 `lingnan`），或者直接提取独立岛屿为新区块（如从 `britain` 提取爱尔兰岛）时使用：
```json
{
  "op": "assemble",
  "comment": "南意大利主陆环 + 西西里岛环",
  "rings": ["$south_italy_main", "italy[1]"],
  "into": "south_italy"
}
```

---

## 四、政权空间守卫（`polity_guards`）与人工覆盖表（`keyframe_overrides`）怎么写？

### 4.1 迁移优先级（由低到高）
1. **默认父子广播**：关键帧中 `owners: { parent: "某政权" }` 默认展开为该父区块下所有子区块均归属 `"某政权"`（`null` 则全为 `null`）。
2. **`polity_guards`（自动空间守卫）**：拦截跨地理带误涂。例如 `manchuria` 拆为 `liaodong` 与外满洲 `manchuria` 后，秦、汉、魏、晋、高句丽、明只统治辽河流域 `liaodong`，不应涂满外兴安岭与库页岛：
   ```json
   {
     "parent": "manchuria",
     "owners": ["燕国", "秦国", "大秦帝国", "大汉帝国", "曹魏帝国", "西晋王朝", "前燕帝国", "高句丽王国", "大明帝国"],
     "map": { "liaodong": "$owner", "manchuria": null }
   }
   ```
   可选附加 `"year_min": -680, "year_max": -454` 限定生效年份区间；`"map"` 值填 `"$owner"` 表示继承原政权名，填 `null` 表示留白（交由 `stateless_cultures` 描述），也可填 `empires_db.js` 中已存在的具体政权名。
3. **`keyframe_overrides`（分裂期逐帧精修，最高优先级）**：
   - 键为关键帧年份字符串（如 `"-260"`, `"843"`, `"1648"`），值为 `{ "子区块id": "政权名" | null }`。
   - **铁律约束**：
     1. **严禁填写 `timeline_keyframes.js` 中不存在的年份**（工具启动时强校验，不存在立即报错）；
     2. **严禁自造 `empires_db.js` 中不存在的政权名**；若某子区块在该时期由未收录的小公国/割据军阀统治，**必须填 `null`**，并在 `stateless_cultures` 中用 `kind: "诸国并立"` 或 `"城邦林立"` 如实写明；
     3. **严守政权 `era_span`**：关键帧年份必须落在该政权 `era_span` 的 `[start - 10, end + 15]` 容差内（`check.js` 强校验 `owners outside their era_span: 0`）；
     4. **注意累积状态机**：`TimelineEngine` 会沿用上一关键帧未改写的子区块归属！当分裂期结束进入统一王朝，或某政权灭亡时，务必把此前单独覆盖过的子区块在后续关键帧显式归位，防止边缘子区块残留旧政权。

---

## 五、编年史、中国逐年百科、商埠与城邦重绑机制说明（欧洲/中东必读！）

1. **`city_states.js` 与 `TRADE_ROUTES.hubs`（真实城市坐标）**：
   - 这两处存储的都是精确城市坐标 `(x, y)`。工具会自动做 **Point-in-Polygon 射线落点检测**；对于威尼斯、热那亚、推罗、雅典等紧贴 1:50m 简化海岸线、圆点可能偏出海面 `0.5px` 的港口城邦，工具内置了**多边形边界最短距离兜底**，自动归入最近的沿海子区块。若极个别贴近两省交界，可在 `city_state_overrides` / `trade_hub_overrides` 按 `id` 或 `name` 一行指定。
2. **`chronicle_annals_db.js`（注意：807/813 条事件原坐标是旧父区块质心！）**：
   - 原版编年史绝大部分事件的 `(x, y)` 并非事件发生城池坐标，而是直接复制了旧父区块的 `(cx, cy)`（例如原 `italy` 下所有罗马、威尼斯、佛罗伦萨、西西里事件都是同一个坐标）！
   - 因此，**编写 `europe.json` 与 `mideast.json` 时，必须认真填写 `chronicle_keywords` 与 `chronicle_defaults`**：
     - `chronicle_keywords` 按优先级从具体到宽泛排列（例如先匹配 `"威尼斯"`, `"米兰"`, `"热那亚"` -> `north_italy`；`"那不勒斯"`, `"西西里"`, `"叙拉古"` -> `south_italy`；`"罗马"`, `"佛罗伦萨"`, `"教皇"` -> `central_italy`）；工具会先匹配 `title`，未命中再匹配 `detail` 与 `polity`；
     - 匹配成功后，工具不仅更新 `"regionId"` 与 `"region_name"`，还会把原本等于旧父区块质心的通用 `(x, y)` 同步迁往新子区块的 `(cx, cy)`，使地图事件光点不再全部堆在同一个省！
3. **`src/data/china_annals_v*.js`（中国历史逐年百科多卷文件自动迁移）**：
   - `apply.py` 会自动扫描 `src/data/` 下所有存在的 `china_annals_v*.js`（当前已有 `v1`，后续合入 `v2`～`v6` 时无需改代码即自动一并迁移），对其中 `preGongheNodes[]` 与 `years[].events[]` 每一条记录的 `"regionId"` 执行**原位单行替换**（绝不重序列化整份 JS 文件，严格保留原有缩进、注释与换行符，100% 向后兼容既有战区配置格式）。
   - 匹配顺序限定在 `parent_to_children[old_rid] + cross_parent_candidates[old_rid]` 候选池内，按四级优先级判定：① `refs.places` 逐项匹配（若含 `（今××）` 现代地名括注则优先匹配现代省市县，规避“陕西宝鸡平阳 / 山西临汾平阳”等古今同名歧义） -> ② `title` -> ③ `detail` -> ④ `chronicle_defaults` 分年代默认子区兜底（如需单条强制指定，可在可选字段 `annals_overrides` 中填 `"年份:标题": "子区块id"`）。
   - **欧洲（`europe.json`）与中东（`mideast.json`）编写特别提醒**：`china_annals_v1.js` 中**已包含域外区块事件**（例如 `transoxiana` 共 3 条：前 102 年李广利征大宛破贵山城、前 36 年陈汤甘延寿远征康居斩郅支单于、97 年甘英出使大秦抵条支与安息西界；后续 `v2`～`v6` 还将涉及怛罗斯、撒马尔罕、巴格达及欧洲诸国）。因此在编写 `mideast.json` / `europe.json` 的 `chronicle_keywords` 时，请一并收录常见中文史籍古今地名（如费尔干纳子区加入 `"大宛"`, `"贰师"`, `"贵山城"`, `"费尔干纳"`；河中粟特子区加入 `"康居"`, `"郅支"`, `"塔拉斯"`, `"怛罗斯"`, `"撒马尔罕"`, `"康国"`, `"布哈拉"`；两河/波斯相关子区加入 `"条支"`, `"安息"`, `"泰西封"`, `"巴格达"`, `"波斯湾"` 等），即可在套用 `mideast` / `europe` 时自动将 `china_annals_v*.js` 内的对应域外事件精准落位！

---

## 六、验收标准清单（提交前必查）

1. `python tools/regionsplit/apply.py <atlasRoot> <your_theater>` 一次跑通；紧接着**再跑第二遍**，输出必须显示 `Files modified: None (idempotent no-op)`。
2. `python tools/verify_project.py` 输出 `[PASS] ALL CHECKS PASSED! 100% Referential Integrity Verified.`。
3. `node C:\Project\_work\atlas-factcheck\tools\check.js <atlasRoot>` 输出：
   - `== owners outside their era_span: 0`
   - `== blank stretches with no culture label: 0`
4. `git status` 检查确认**未改动任何前端 UI 文件**（`index.html`, `src/main.js`, `src/ui/MapRenderer.js`, `src/core/TimelineEngine.js`, `src/styles/main.css`）且未改动 `empires_db.js` / `confidence.js`。
