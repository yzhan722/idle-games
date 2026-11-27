# Steam 商店文案草稿（待用户审核，未提交任何平台）

名称、定价、AppID、主体名称都还没定，标「待定」的由用户填。文案里写的功能都对照过 `PRD.md` §10B 与代码。

## 一句话（简短描述，各 ≤ 300 字符）

- **简中**：三座小浮岛趴在你的桌面底边。动物伙伴自己种、自己做、自己卖，你忙你的。离开时来过哪些客人，回来看一眼就知道。没有内购，没有催促。
- **English**: Three tiny floating isles rest along the bottom of your desktop. An animal crew grows, cooks and sells on its own while you get on with your day. Come back to see who dropped by. No in-app purchases, no nagging.
- **日本語**：デスクトップの下にちょこんと浮かぶ三つの小さな島。動物の仲間たちが育てて、作って、売ってくれるので、あなたは自分の作業に集中できます。留守のあいだに誰が来たかは、戻ってくればひと目でわかります。追加課金も催促もありません。

## 关于这款游戏（正文）

### 简中
把它放在屏幕底边，然后忘了它。
- **自己转**：六种动物伙伴种地、浇水、采收、做点心、看摊位，全程不用点。
- **像养盆栽**：第一座岛几分钟就热闹起来，三座岛和所有建筑大约要陪你二十多天。
- **访客簿**：16 位访客会在你离开时上门，常来的会留下一件纪念物。
- **今天卖什么**：选一道主推菜，爱吃它的客人就来得勤一些。
- **自己摆**：纪念物和小装饰随手拖，伙伴歇工时会走过去用。
- **跟着真实的日子**：昼夜、天气、二十四节气慢慢换。
- **不打扰**：透明、可点穿、可限帧、可静音，带番茄钟，一键隐藏。

### English
Park it at the edge of your screen and forget about it.
- **Runs itself**: a crew of six kinds of animals plants, waters, harvests, cooks and minds the market. No clicking required.
- **Grows like a houseplant**: the first isle comes to life in minutes; all three isles and every building take around twenty-five days.
- **Guest book**: sixteen guests drop by while you are away, and regulars leave a keepsake.
- **Featured dish**: pick one dish, and the guests who love it come more often.
- **Make it yours**: drag keepsakes and decorations wherever you like; the crew uses them on breaks.
- **In step with real days**: day and night, weather and the twenty-four solar terms change slowly.
- **Never in the way**: transparent, click-through, frame-rate capped and easy to mute, with a focus timer and a one-key hide.

### 日本語
画面の端に置いて、あとは忘れてください。
- **おまかせ**：6種の動物の仲間たちが、種まき、水やり、収穫、料理、店番までこなします。クリックは不要です。
- **鉢植えのように**：最初の島は数分でにぎやかに。三つの島とすべての建物がそろうまで約25日です。
- **来客帳**：留守のあいだに16組のお客さんが訪れ、常連さんは記念の品を残していきます。
- **本日の一品**：一品選ぶと、それが好きなお客さんがよく来るようになります。
- **自由に飾る**：記念の品や飾りは、ドラッグするだけで好きな場所へ。仲間たちも休憩中に使います。
- **現実の暦とともに**：昼夜、天気、二十四節気がゆっくり移ろいます。
- **邪魔をしない**：背景の透過、クリックの透過、フレームレート制限、ミュート、集中タイマーに対応。ワンキーで隠せます。

## 标签建议
放置、休闲、桌面陪伴、像素、模拟、单人、治愈、可爱、动物。

## 定价与地区（待定）
建议区间与首发折扣由用户定；买断、无内购。

## AI 内容披露（草稿）
- 预生成内容：游戏内像素图由生成式 AI 工具生成，再筛选、裁切、抠图、缩放；16 张访客图由这些图改色得到。音效 11 个由脚本（`tools/generate_sfx.py`）合成，没有用 AI 音频工具。
- 筛选与修整是不是人工做的、游戏文字与英文和日文译文有没有用 AI：待用户确认后写明。
- 实时生成内容：无。

## 隐私
- 游戏自己不联网、不收集数据，没有广告，没有统计，没有账号。
- 存档、界面设置和引擎运行日志只写在本机用户目录，删掉那个目录就没了。
- 接入 Steam 后，成就和整份存档会交给 Steam（成就与云存档），由 Steam 处理。现在的包里没有 Steam 组件。

（核对：`src/` 里没有联网调用，只有 `SteamBridge.gd` 在装了 GodotSteam 时调用 Steam；引擎日志是 Godot 桌面版默认行为，`project.godot` 没有关。`tools/check_store_facts.py` 会查这一段。）

## 系统需求（草稿，未实测）
Windows 10 / 11 64 位；支持 OpenGL 3.3 的显卡；1920 宽以上屏幕。内存、显卡型号等 8 小时挂机实测后再填。

## 上架前缺的东西
- 真实 AppID 与 GodotSteam 接入（现为测试号 480）
- 正式名称、主体名称、定价
- 截图 5 张以上、宣传图各尺寸、短视频（要打开游戏录制，等用户同意）
- `ASSETS_LICENSE.md` 里标「待换」的三类图换掉
