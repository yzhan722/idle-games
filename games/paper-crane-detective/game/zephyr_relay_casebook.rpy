## 《沉默侦探：千纸鹤的约定》—— PC-13 运动会失物招领箱的秘密与侦探社推理笔记复盘本
## zephyr_relay_casebook.rpy
##
## 设计要点：
##   1. 100% 零侵入主线剧情（script.rpy / chapter1..6.rpy / interlude.rpy / definitions.rpy / autoplay.rpy 零改动），
##      PC-10 / PC-11 / PC-12 三个短案模块同样零改动：复盘本只在运行期按名字读取它们的数据与存档，从不写回。
##   2. 「运动会失物招领箱的秘密」（screen extras_sports_lostfound + 可重玩短案 label sports_lostfound_case）：
##      秋季运动会后的第二天，学生会的张子谦把一箱没人认领的失物抱进万事屋。与 PC-10..PC-12 都不同，这一案没有「案发现场」——
##      六处勘查点就是箱子里的六件失物，每件都系着学生会的失物登记签（拾获时间 · 地点 · 拾获人）。
##      推理链是一场「倒跑四棒」：从失物最后停下的地方出发，终点 → 交接 → 起点 → 跑者，一棒一棒往回交，
##      交回到那天没有出现在检录处的高一(4)班第四棒手里。每棒三选一、各配一种接力棒颜色，选错只给温柔提示、
##      只计入本地 _sd_mistakes，绝不触碰主线 fail_count / 好感；结案按失误数评定金 / 银 / 铜牌并保存历史最佳纪录，
##      可无限重玩刷新纪录，持久化于 persistent.sports_lostfound_record。
##      真相完全写实（借用登记、检录表、草莓贴纸、系成蝴蝶结的钉鞋与看台的横梁高度），无任何超自然要素。
##   3. 「侦探社推理笔记复盘本」（只读渲染函数 + 整页展开弹窗；四签页面已在 PC-16 删除，改由 PC-15 的扩容页面承载）：
##      一本汇总四桩可重玩短案（PC-10 闭馆图书馆、PC-11 雨夜剧场、PC-12 北窗画室、PC-13 运动会失物箱）的复盘本。
##      每一页的关键证物、推理链、最佳评级与最少失误，都在运行期从各案自己的数据和存档字段里只读取出
##      （直接读 persistent 字段，不调用会补写默认值的 _ensure_*，快照比对证明零写入）；复盘本自己只写
##      persistent.case_notebook_record（复盘章与已读页）。涉终章的页边续批严格联动 truth_spoiler_unlocked() 零侧信道遮罩。
##   4. 本文件按文件名排在 yearbook_atelier_wall.rpy 之后初始化，双成就追加在 PC-12 之后，成就页扩展为 2×16 = 32 枚。

# —— PC-13 操场与牛皮纸复盘本 UI 图标命名别名（128x128 RGBA 透明底）——
image ui_icon_lost_found_box = "images/ui/icon_lost_found_box.png"
image ui_icon_relay_baton    = "images/ui/icon_relay_baton.png"
image ui_icon_case_notebook  = "images/ui/icon_case_notebook.png"
image ui_icon_evidence_tag   = "images/ui/icon_evidence_tag.png"

# —— PC-13 新登场的角色（暂无立绘：说话时舞台上的立绘自动恢复常亮，与警察、主持人等无立绘角色同一套规则）——
define zhixia = Character("许知夏", color="#8fd0f0", who_outlines=[(1, "#000")])
define doudou = Character("豆豆", color="#ffb3c7", who_outlines=[(1, "#000")])

init python:

    # 动态注册 PC-13 双成就，使鉴赏室成就页扩展为 2×16（共 32 枚）严整偶数列对称排布
    if "register_extra_achievement" in globals():
        register_extra_achievement(
            "ach_sports_lostfound",
            "运动会的失物侦探",
            "解开运动会失物招领箱之谜。",
            False,
        )
        register_extra_achievement(
            "ach_case_notebook",
            "推理笔记的复盘人",
            "盖满推理笔记复盘本前四页的复盘章。",
            False,
        )

    ############################################################################
    ## 一、运动会失物招领箱的秘密（1 桩可重玩短案 · 6 件失物 · 倒跑四棒 · 金银铜牌评级）
    ############################################################################

    SPORTS_CASE = {
        "id": "sd1",
        "code": "SD-01",
        "label": "sports_lostfound_case",
        "title": "运动会失物招领箱的秘密",
        "short_title": "没有跑的第四棒",
        "time_tag": "周五 16:30 · 万事屋 · 运动会后的第二天",
        "companions": "艾丽丝 · 墨墨 · 张子谦 · 小卖部阿姨",
        "bg_key": "canteen",
        "bg_thumb": "images/bg_canteen.png",
        "lighting_note": "午后 → 器材室冷光 → 小卖部暖灯 → 夕照（agency / storeroom / canteen）",
        "spoiler": False,
        "summary_pub": (
            "秋季运动会结束后的第二天放学，学生会的张子谦抱来一只纸箱：运动会上捡到的失物九成都被领走了，"
            "只剩六件一整天没人来认，周一就要清箱。箱子里有一根器材室的蓝色接力棒、一双鞋带系在一起的钉鞋、"
            "一张皱巴巴的检录卡……而昨天下午的女子四乘一百米决赛上，高一(4)班的第四棒没有出现在检录处，全班只能弃权。"
        ),
        "solution_pub": (
            "结案报告：六件失物属于同一段二十分钟。15:08，在看台背后练交接的高一(4)班第四棒许知夏听见看台B区底下有哭声，"
            "脱下钉鞋、系好鞋带，爬进去找到了走丢的豆豆——小卖部阿姨五岁的孙女。她把练习用的蓝色接力棒交给豆豆，"
            "说「现在你是最后一棒」，只穿着袜子背她一个帐篷一个帐篷地找。15:22 阿姨抱住孙女、塞给她一瓶汽水，"
            "她听见最后一次检录的广播往回跑，还是晚了；又怕说出来像找借口，一个字也没跟班里提。"
        ),
        "mo_note_pub": "墨墨现场手记：「最要紧的失物，昨天就被领回家了。」",
        "alice_note_pub": "艾丽丝结案批注：「运动会失物案告破！犯人许知夏罚她明年继续跑第四棒——豆豆说了，到时候她要坐在看台第一排，举着接力棒加油！」",
    }

    SPORTS_ITEMS = [
        {
            "id": "h1",
            "code": "LF-01",
            "label": "蓝色接力棒",
            "found": "16:40 · 小卖部帐篷后",
            "finder": "后勤组",
            "scene": "storeroom",
            "surface": "一根蓝色铝制接力棒，棒尾贴着「器材室 4」的编号，棒身中段歪歪地粘着半张草莓贴纸。",
            "detail": (
                "现场手记：器材室借用登记写着「15:00 高一(4)班 · 交接练习 · 4 号棒」，归还栏一直空着。半张草莓贴纸粘在棒身中段，"
                "离棒尾一个小拳头那么远——正是小孩子握棒时大拇指按着的地方。它不是在跑道上被捡到的，而是在小卖部的帐篷后面。"
            ),
            "evidence": "蓝色接力棒：高一(4)班15:00借去练交接，却在小卖部帐篷后被捡到",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "h2",
            "code": "LF-02",
            "label": "系在一起的钉鞋",
            "found": "15:35 · 看台B区底下",
            "finder": "清洁阿姨",
            "scene": "agency",
            "surface": "一双白色短跑钉鞋并排躺在箱底，两只鞋的鞋带被系成了一个端端正正的蝴蝶结。",
            "detail": (
                "现场手记：鞋钉缝里卡满新鲜的红色塑胶颗粒，穿它的人在跑道上热过身。两只鞋并排、鞋带打着蝴蝶结——"
                "是被人好好脱下来放下的，不是跑丢的。鞋舌内侧写着「4 · 冲刺！」，旁边挤着三个不同笔迹的签名：这是一支接力队第四棒的鞋。"
            ),
            "evidence": "并排的钉鞋：热身后被好好脱下，鞋舌写着4·冲刺和三个签名",
            "observer": "墨墨（现场手记）",
        },
        {
            "id": "h3",
            "code": "LF-03",
            "label": "小兔子发卡",
            "found": "15:35 · 看台B区底下",
            "finder": "清洁阿姨",
            "scene": "rooftop",
            "surface": "一枚拇指大小的粉色小兔子发卡，一只兔耳朵上也粘着一小块草莓贴纸。",
            "detail": (
                "现场手记：发卡是给四五岁的小孩子戴的，和钉鞋在同一处被捡到。从天台往下看，看台B区背后就是热身区；"
                "看台底下最低的横梁离地不到七十厘米——小孩子能站着钻进去，大人只能趴下来爬，而穿着钉鞋是没法在水泥地上爬的。"
            ),
            "evidence": "儿童发卡：和钉鞋同在看台底下，那里只有小孩子能站着钻进去",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "h4",
            "code": "LF-04",
            "label": "皱巴巴的检录卡",
            "found": "15:30 · 小卖部帐篷前",
            "finder": "小卖部阿姨",
            "scene": "agency",
            "surface": "一张被攥皱的检录卡：「女子四乘一百米决赛 · 高一(4)班 · 第四棒 · 15:20 检录」。",
            "detail": (
                "现场手记：卡片背面晕着一圈圆圆的水印，是冰镇饮料瓶底压出来的；卡角也粘着一小块草莓贴纸。"
                "张子谦的检录表写着「15:20 高一(4)班第四棒许知夏未到，15:25 弃权」——第四棒的检录卡，五分钟后落在了小卖部的帐篷前。"
            ),
            "evidence": "第四棒的检录卡：弃权五分钟后，落在小卖部帐篷前",
            "observer": "墨墨（现场手记）",
        },
        {
            "id": "h5",
            "code": "LF-05",
            "label": "没开封的橘子汽水",
            "found": "15:45 · 检录处长椅",
            "finder": "检录裁判",
            "scene": "canteen",
            "surface": "一瓶没开封的冰镇橘子汽水，瓶身贴着小卖部「运动会特供」的手写小标签。",
            "detail": (
                "现场手记：小卖部阿姨说，昨天三点多，她五岁的孙女豆豆跑丢了二十来分钟，是一个只穿着袜子的女孩子背回来的。"
                "阿姨只顾着抱孩子，顺手塞给人家一瓶汽水，连名字都没顾上问。那孩子一口没喝，转身就跑；瓶子后来在检录处的长椅上被捡到，盖子都没拧开过。"
            ),
            "evidence": "阿姨请客的汽水：背回豆豆的女孩一口没喝，留在了检录处长椅上",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "h6",
            "code": "LF-06",
            "label": "缺了五格的贴纸",
            "found": "15:15 · 看台B区后的热身区",
            "finder": "跳高裁判",
            "scene": "agency",
            "surface": "一版十二格的草莓贴纸只剩七格，背面用蜡笔歪歪扭扭地写着两个字。",
            "detail": (
                "现场手记：贴纸背面印着「小卖部 · 买糖送贴纸」，蜡笔字是「豆豆」。缺掉的五格里有三格对得上形状：接力棒上的半张、"
                "发卡耳朵上的一块、检录卡角上的一块。贴纸是在热身区被捡到的，热身区就在看台B区背后，两步路。"
            ),
            "evidence": "豆豆的草莓贴纸：缺掉的格子贴在了接力棒、发卡和检录卡上",
            "observer": "艾丽丝（社长批注）",
        },
    ]

    _SPORTS_ITEM_BY_ID = {h["id"]: h for h in SPORTS_ITEMS}

    # 接力棒架：倒跑四棒各配一种接力棒颜色（红 / 黄 / 蓝 / 绿），卷宗缩略图底部是同色的四段跑道带
    SPORTS_BATONS = [
        {"name": "红棒", "color": "#d9483b"},
        {"name": "黄棒", "color": "#e9b63b"},
        {"name": "蓝棒", "color": "#3a78d0"},
        {"name": "绿棒", "color": "#3aa36a"},
    ]

    SPORTS_RELAY_LEGS = [
        {
            "id": "k1",
            "step": "第一棒",
            "name": "终点",
            "baton": "红棒",
            "color": "#d9483b",
            "short": "小卖部帐篷前",
            "full": (
                "第四棒的检录卡五分钟后落在小卖部帐篷前，接力棒在帐篷后面被捡到，阿姨请客的汽水也是在那里递出去的——"
                "六件失物的故事，终点不在跑道上，而在小卖部的帐篷前：走丢的豆豆，就是在那里回到了奶奶身边。"
            ),
        },
        {
            "id": "k2",
            "step": "第二棒",
            "name": "交接",
            "baton": "黄棒",
            "color": "#e9b63b",
            "short": "接力棒交给了孩子",
            "full": (
                "接力棒上那半张贴纸在小孩子握棒时大拇指按着的地方，发卡和检录卡上的贴纸也都是从豆豆那一版上抠下来的——"
                "练交接用的蓝色接力棒，被交到了五岁的豆豆手里，她一路握着它，见什么贴什么。"
            ),
        },
        {
            "id": "k3",
            "step": "第三棒",
            "name": "起点",
            "baton": "蓝棒",
            "color": "#3a78d0",
            "short": "看台B区底下",
            "full": (
                "钉鞋被好好脱下、鞋带系成蝴蝶结，和豆豆的发卡挨在一起；看台底下只有小孩子能站着钻进去，大人得脱了钉鞋才能爬——"
                "事情是从看台B区底下开始的：有人在那里，找到了躲着哭的豆豆。"
            ),
        },
        {
            "id": "k4",
            "step": "第四棒",
            "name": "跑者",
            "baton": "绿棒",
            "color": "#3aa36a",
            "short": "第四棒许知夏",
            "full": (
                "鞋舌写着「4 · 冲刺！」，接力棒是高一(4)班借的，第四棒的检录卡落在帐篷前，阿姨请的汽水又被留在检录处的长椅上——"
                "那天没有出现在检录处的高一(4)班第四棒许知夏，没有肚子疼，她在看台底下找到了一个走丢的孩子。"
            ),
        },
    ]

    SPORTS_RATING_TIERS = [
        {"key": "gold",   "name": "金牌", "title": "操场名侦探", "rule": "零失误",         "max_mistakes": 0},
        {"key": "silver", "name": "银牌", "title": "跑道推理员", "rule": "失误 1～2 次",    "max_mistakes": 2},
        {"key": "bronze", "name": "铜牌", "title": "见习裁判",   "rule": "失误 3 次及以上", "max_mistakes": 999},
    ]

    _SPORTS_TIER_BY_KEY = {t["key"]: t for t in SPORTS_RATING_TIERS}
    _SPORTS_TIER_RANK = {"gold": 3, "silver": 2, "bronze": 1}

    # 在证物簿里登记六件失物的翻面批注（与委托信箱、闭馆图书馆、雨夜剧场、美术室同一套 register_evidence_detail 机制）
    if "register_evidence_detail" in globals():
        for _sdh in SPORTS_ITEMS:
            register_evidence_detail(_sdh["evidence"], _sdh["observer"], _sdh["detail"])

    def sports_tier_def(tier_key):
        return _SPORTS_TIER_BY_KEY.get(tier_key, SPORTS_RATING_TIERS[-1])

    def sports_rate(mistakes_count=0):
        """按本局失误数评定评级：0 次金牌，1～2 次银牌，3 次及以上铜牌。"""
        m = max(0, int(mistakes_count or 0))
        for tier in SPORTS_RATING_TIERS:
            if m <= tier["max_mistakes"]:
                return tier
        return SPORTS_RATING_TIERS[-1]

    def sports_get_item(item_id):
        return _SPORTS_ITEM_BY_ID.get(item_id, SPORTS_ITEMS[0])

    def _ensure_sports_store():
        if not isinstance(getattr(persistent, "sports_lostfound_record", None), dict):
            persistent.sports_lostfound_record = {}
        return persistent.sports_lostfound_record

    def sports_get_record():
        raw = _ensure_sports_store()
        last_tier = raw.get("last_tier")
        return {
            "solved": bool(raw.get("solved", False)),
            "replays": save_int(raw.get("replays"), 0),
            "best_tier": casefile_best_key(raw),
            "last_tier": last_tier if isinstance(last_tier, str) and last_tier in _SPORTS_TIER_RANK else None,
            "best_mistakes": save_int(raw.get("best_mistakes")),
            "last_mistakes": save_int(raw.get("last_mistakes")),
            "inspected": [h for h in (raw.get("inspected") or []) if h in _SPORTS_ITEM_BY_ID],
            "report_viewed": bool(raw.get("report_viewed", False)),
        }

    def _sports_write(updates):
        store_dict = dict(_ensure_sports_store())
        store_dict.update(updates)
        persistent.sports_lostfound_record = store_dict
        return store_dict

    def sports_case_solved_count():
        return 1 if sports_get_record()["solved"] else 0

    def sports_gold_count():
        return 1 if sports_get_record()["best_tier"] == "gold" else 0

    def sports_best_short():
        """案卷与鉴赏页使用：历史最佳评级名，未结案时显示「待结案」。"""
        rec = sports_get_record()
        return sports_tier_def(rec["best_tier"])["name"] if rec["best_tier"] else "待结案"

    def sports_select_item(item_id):
        hdef = sports_get_item(item_id)
        persistent.sports_selected_item = hdef["id"]
        renpy.save_persistent()

    def sports_inspect_item(item_id):
        """剧场内检查一件失物：证物入簿（可翻面），并把这件失物记入鉴赏页档案；只写失物箱自己的存档。"""
        hdef = _SPORTS_ITEM_BY_ID.get(item_id)
        if hdef is None:
            return False
        if "add_evidence" in globals():
            add_evidence(hdef["evidence"])
        seen = list(sports_get_record()["inspected"])
        if hdef["id"] not in seen:
            seen.append(hdef["id"])
        _sports_write({"inspected": seen})
        persistent.sports_selected_item = hdef["id"]
        renpy.save_persistent()
        return True

    def sports_record_solve(mistakes_count=0):
        """记录一次结案：评定本局评级、刷新历史最佳（最高评级 + 最少失误）与累计结案次数。
        只写失物箱自己的存档，绝不触碰主线 fail_count / 好感。"""
        m = max(0, int(mistakes_count or 0))
        tier = sports_rate(m)
        prev = sports_get_record()
        is_first = not prev["solved"]
        prev_rank = _SPORTS_TIER_RANK.get(prev["best_tier"], 0)
        best_tier = tier["key"] if _SPORTS_TIER_RANK[tier["key"]] >= prev_rank else prev["best_tier"]
        best_m = m if prev["best_mistakes"] is None else min(prev["best_mistakes"], m)
        new_record = (not is_first) and (prev["best_mistakes"] is None or m < prev["best_mistakes"])
        _sports_write({
            "solved": True,
            "replays": prev["replays"] + 1,
            "best_tier": best_tier,
            "last_tier": tier["key"],
            "best_mistakes": best_m,
            "last_mistakes": m,
            "inspected": [h["id"] for h in SPORTS_ITEMS],
        })
        ach_grant("ach_sports_lostfound")
        renpy.save_persistent()
        result = sports_get_record()
        result["is_first"] = is_first
        result["new_record"] = new_record
        return result

    def sports_open_report_modal():
        if sports_get_record()["solved"]:
            _sports_write({"report_viewed": True})
            renpy.save_persistent()
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("sports_report_modal")

    def sports_render_view():
        """渲染失物箱卷宗：结案前只公开案情与失物的外观，结案后显影倒跑四棒、结案报告与双人手记。"""
        rec = sports_get_record()
        solved = rec["solved"]
        best = sports_tier_def(rec["best_tier"]) if rec["best_tier"] else None
        if best:
            best_line = "%s「%s」 · 最少失误 %d 次" % (best["name"], best["title"], rec["best_mistakes"] or 0)
        else:
            best_line = "尚未结案"
        return {
            "code": SPORTS_CASE["code"],
            "title": SPORTS_CASE["title"],
            "short_title": SPORTS_CASE["short_title"],
            "time_tag": SPORTS_CASE["time_tag"],
            "summary": SPORTS_CASE["summary_pub"],
            "solved": solved,
            "replays": rec["replays"],
            "best_tier": rec["best_tier"],
            "best_name": best["name"] if best else "待结案",
            "best_line": best_line,
            "inspected_count": len(rec["inspected"]),
            "leg_shorts": [(k["short"] if solved else "") for k in SPORTS_RELAY_LEGS],
            "leg_fulls": [(k["full"] if solved else "") for k in SPORTS_RELAY_LEGS],
            "display_solution": SPORTS_CASE["solution_pub"] if solved else "",
            "display_mo_note": SPORTS_CASE["mo_note_pub"] if solved else "",
            "display_alice_note": SPORTS_CASE["alice_note_pub"] if solved else "",
        }

    def sports_launch_action():
        return [
            Function(stop_all_gramophone_ambience, True),
            SetField(persistent, "extras_tab", "sportsday"),
            Replay(SPORTS_CASE["label"], scope={"player_name": persistent.last_player_name or "陈默"}, locked=False),
        ]

    ############################################################################
    ## 二、侦探社推理笔记复盘本（4 页 · 只读汇总四桩可重玩短案 · 复盘章 · 页边续批防剧透）
    ############################################################################

    # 每一页只登记「去哪里读」：案件卷宗、勘查点、推理链、评级与存档字段都按名字在运行期读取，复盘本自己不抄任何一案的原文。
    # 页边的复盘要点、墨墨批注与续批是复盘本自己新写的文字。
    NOTEBOOK_CASES = [
        {
            "key": "library", "tab": "library", "index_label": "闭馆图书馆", "unit": "四环推理链", "ink": "#5b8de0",
            "case_var": "LIBRARY_CASE", "hotspots_var": "LIBRARY_HOTSPOTS", "links_var": "LIBRARY_CHAIN_LINKS",
            "tiers_var": "LIBRARY_RATING_TIERS", "store": "closed_library_record",
            "lesson": "复盘要点：先看空出来的地方。书板上的灰线、给邻居盖好的塑料布、多走的三次单程，都在替搬书的人说话。",
            "mo_margin": "墨墨批注：雨天搬书的人，会先替旁边的书挡雨。",
            "margin_secret": (
                "续批：闭馆夜站在空书架前，墨墨写字写得很快。艾丽丝后来告诉我，四年前大家还叫她小雪侦探，"
                "她最拿手的，就是替同学找回丢掉的东西。"
            ),
        },
        {
            "key": "theater", "tab": "theater", "index_label": "雨夜剧场", "unit": "四幕推理", "ink": "#b07ad8",
            "case_var": "THEATER_CASE", "hotspots_var": "THEATER_HOTSPOTS", "links_var": "THEATER_ACT_LINKS",
            "tiers_var": "THEATER_RATING_TIERS", "store": "theater_script_record",
            "lesson": "复盘要点：先问什么时候，再问是谁。泼洒痕迹中间那块干着的地方，把拿走的时刻钉在了泼湿之后。",
            "mo_margin": "墨墨批注：湿过的纸会晕开，压过的纸会留下凹痕。两样都读得出来。",
            "margin_secret": (
                "续批：那句一直不敢说出口的话，吕芙最后还是说了。墨墨在这一页折了一个角——"
                "她说自己也在练习，练习有一天重新开口，把四年前没来得及对周可说的那句话说完。"
            ),
        },
        {
            "key": "atelier", "tab": "atelier", "index_label": "北窗画室", "unit": "四笔推理", "ink": "#2f9a78",
            "case_var": "ATELIER_CASE", "hotspots_var": "ATELIER_HOTSPOTS", "links_var": "ATELIER_STROKE_LINKS",
            "tiers_var": "ATELIER_RATING_TIERS", "store": "atelier_painting_record",
            "lesson": "复盘要点：留意不该出现的规矩。一个没人动笔的下午立着禁止触碰的木牌，就是有人想让大家别去掀。",
            "mo_margin": "墨墨批注：平得不像静物的桌布，比乱成一团的现场更可疑。",
            "margin_secret": (
                "续批：画背面那块留给学姐自己的空白，墨墨看了很久。她说四年前的那个冬天，"
                "她和周可之间也留着这样一块空白，一直没有人去填。"
            ),
        },
        {
            "key": "sportsday", "tab": "sportsday", "index_label": "运动会失物箱", "unit": "倒跑四棒", "ink": "#d9483b",
            "case_var": "SPORTS_CASE", "hotspots_var": "SPORTS_ITEMS", "links_var": "SPORTS_RELAY_LEGS",
            "tiers_var": "SPORTS_RATING_TIERS", "store": "sports_lostfound_record",
            "lesson": "复盘要点：倒着跑。从东西最后停下的地方出发，一棒一棒往回交接，就能找回起跑的那个人。",
            "mo_margin": "墨墨批注：失物不会说话。可它们被捡到的时间和地方，排起来就是一条跑道。",
            "margin_secret": (
                "续批：四年前，小雪侦探就是靠一件一件找回同学的失物出名的；可那年冬天，她弄丢了最要紧的约定。"
                "豆豆被找回来的那一刻，墨墨在本子角上画了一只歪翅膀的千纸鹤。"
            ),
        },
    ]

    _NOTEBOOK_BY_KEY = {n["key"]: n for n in NOTEBOOK_CASES}

    NOTEBOOK_MASK_NOTICE = "【防剧透火漆：这一页的页边续批涉终章旧约，通关 TRUE END 或点击右上角「解锁剧透」后显影】"
    NOTEBOOK_VERDICT = "艾丽丝总评：四桩案子，没有一个坏人——只有一群太在乎某样东西的人。万事屋要做的，是替他们把这份在乎说出来。"

    def notebook_get_def(case_key):
        return _NOTEBOOK_BY_KEY.get(case_key, NOTEBOOK_CASES[0])

    def _nb_case_parts(ndef):
        """按名字取出一案的卷宗、勘查点、推理链与评级定义；任一缺失时整页记为缺卷（只读，不修改任何一案的数据）。"""
        g = globals()
        case = g.get(ndef["case_var"])
        hotspots = g.get(ndef["hotspots_var"])
        links = g.get(ndef["links_var"])
        tiers = g.get(ndef["tiers_var"])
        ok = (isinstance(case, dict) and isinstance(hotspots, list) and isinstance(links, list)
              and isinstance(tiers, list) and len(hotspots) > 0 and len(links) > 0 and len(tiers) > 0)
        if not ok:
            return {}, [], [], [], False
        return case, hotspots, links, tiers, True

    def _nb_read_record(ndef, hotspots, tiers):
        """只读快照：直接读取该案自己的 persistent 存档字段（不调用会补写默认值的 _ensure_*），返回全新的字典，绝不写回。"""
        raw = getattr(persistent, ndef["store"], None)
        if not isinstance(raw, dict):
            raw = {}
        tier_keys = [t.get("key") for t in tiers]
        hot_ids = [h.get("id") for h in hotspots]
        best_tier = casefile_best_key(raw)
        seen = raw.get("inspected") or []
        if not isinstance(seen, (list, tuple)):
            seen = []
        return {
            "solved": bool(raw.get("solved", False)),
            "replays": save_int(raw.get("replays"), 0),
            "best_tier": best_tier if best_tier in tier_keys else None,
            "best_mistakes": save_int(raw.get("best_mistakes")),
            "inspected": [h for h in hot_ids if h in seen],
        }

    def _ensure_notebook_store():
        if not isinstance(getattr(persistent, "case_notebook_record", None), dict):
            persistent.case_notebook_record = {}
        return persistent.case_notebook_record

    def notebook_get_record():
        raw = _ensure_notebook_store()
        return {
            "stamped": [k for k in (raw.get("stamped") or []) if k in _NOTEBOOK_BY_KEY],
            "read": [k for k in (raw.get("read") or []) if k in _NOTEBOOK_BY_KEY],
        }

    def _nb_write(updates):
        store_dict = dict(_ensure_notebook_store())
        store_dict.update(updates)
        persistent.case_notebook_record = store_dict
        return store_dict

    def notebook_stamped_count():
        return len(notebook_get_record()["stamped"])

    def notebook_select(case_key):
        persistent.notebook_selected_case = notebook_get_def(case_key)["key"]
        renpy.save_persistent()

    def notebook_render_page(case_key):
        """渲染复盘本的一页：证物只抄已勘查的，推理链与复盘批注结案后显影；涉终章的页边续批只在
        truth_spoiler_unlocked() 为真且该案已结案时出现。遮罩状态下的返回值与续批文本完全无关（零侧信道）。"""
        ndef = notebook_get_def(case_key)
        case, hotspots, links, tiers, ok = _nb_case_parts(ndef)
        rec = _nb_read_record(ndef, hotspots, tiers) if ok else {
            "solved": False, "replays": 0, "best_tier": None, "best_mistakes": None, "inspected": []}
        solved = ok and rec["solved"]
        tier = None
        for t in tiers:
            if t.get("key") == rec["best_tier"]:
                tier = t
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        stamped = ndef["key"] in notebook_get_record()["stamped"]
        if tier:
            best_line = "最佳：%s「%s」 · 最少失误 %d 次 · 已结案 %d 次" % (
                tier.get("name", ""), tier.get("title", ""), rec["best_mistakes"] or 0, rec["replays"])
        elif ok:
            best_line = "最佳：尚未结案（已勘查 %d/%d）" % (len(rec["inspected"]), len(hotspots))
        else:
            best_line = "这一页的卷宗暂时不在书架上"
        if stamped:
            status = "stamped"
        elif solved:
            status = "ready"
        elif ok:
            status = "open"
        else:
            status = "missing"
        return {
            "key": ndef["key"],
            "tab": ndef["tab"],
            "index_label": ndef["index_label"],
            "unit": ndef["unit"],
            "ink": ndef["ink"],
            "available": ok,
            "code": case.get("code", ""),
            "title": case.get("title", ""),
            "short_title": case.get("short_title", ndef["index_label"]),
            "time_tag": case.get("time_tag", ""),
            "summary": case.get("summary_pub", ""),
            "solved": solved,
            "replays": rec["replays"],
            "best_tier": rec["best_tier"],
            "best_mistakes": rec["best_mistakes"],
            "best_name": tier.get("name", "") if tier else ("待结案" if ok else "缺卷"),
            "best_line": best_line,
            "inspected_count": len(rec["inspected"]),
            "hotspot_total": len(hotspots),
            "evidence_rows": [
                (h.get("code", ""), h.get("label", ""), (h.get("evidence", "") if h.get("id") in rec["inspected"] else ""),
                 h.get("id") in rec["inspected"])
                for h in hotspots
            ],
            "chain": [(k.get("step", ""), k.get("name", ""), (k.get("short", "") if solved else "")) for k in links],
            "chain_fulls": [(k.get("full", "") if solved else "") for k in links],
            "display_solution": case.get("solution_pub", "") if solved else "",
            "display_lesson": ndef["lesson"] if solved else "",
            "display_mo_margin": ndef["mo_margin"] if solved else "",
            "display_secret": ndef["margin_secret"] if (solved and unlocked) else "",
            "display_masked_notice": NOTEBOOK_MASK_NOTICE if not unlocked else "",
            "unlocked": unlocked,
            "stamped": stamped,
            "status": status,
        }

    def notebook_summary():
        """复盘总评：只汇总四页的公开计数；四桩全部结案后才显影艾丽丝的总评。"""
        pages = [notebook_render_page(n["key"]) for n in NOTEBOOK_CASES]
        solved = [p for p in pages if p["solved"]]
        return {
            "solved": len(solved),
            "total": len(pages),
            "gold": sum(1 for p in solved if p["best_tier"] == "gold"),
            "replays": sum(p["replays"] for p in pages),
            "best_mistakes_sum": sum((p["best_mistakes"] or 0) for p in solved),
            "stamped": notebook_stamped_count(),
            "display_verdict": NOTEBOOK_VERDICT if (pages and len(solved) == len(pages)) else "",
        }

    def notebook_stamp(case_key, open_modal=False):
        """在复盘本的一页盖上复盘章；该案还没结案时只给温柔提示。盖满四枚解锁 ach_case_notebook。只写复盘本自己的存档。"""
        ndef = notebook_get_def(case_key)
        persistent.notebook_selected_case = ndef["key"]
        rec = notebook_get_record()
        if ndef["key"] in rec["stamped"]:
            return rec
        if not notebook_render_page(ndef["key"])["solved"]:
            renpy.notify("这一案还没有结案：先去「%s」把推理走完，再回来盖复盘章吧" % ndef["index_label"])
            return None
        _nb_write({"stamped": rec["stamped"] + [ndef["key"]],
                   "read": rec["read"] + ([] if ndef["key"] in rec["read"] else [ndef["key"]])})
        renpy.sound.play("audio/sfx_page.ogg")
        if notebook_stamped_count() >= len(NOTEBOOK_CASES):
            ach_grant("ach_case_notebook")
        renpy.save_persistent()
        if open_modal:
            renpy.show_screen("notebook_page_modal", case_key=ndef["key"])
        return notebook_get_record()

    def notebook_open_page(case_key):
        """展开复盘本的一整页（推理链全文、结案报告与页边批注）；只在复盘本自己的存档里记一笔「已读」。"""
        ndef = notebook_get_def(case_key)
        rec = notebook_get_record()
        if ndef["key"] not in rec["read"]:
            _nb_write({"read": rec["read"] + [ndef["key"]]})
        persistent.notebook_selected_case = ndef["key"]
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("notebook_page_modal", case_key=ndef["key"])
        renpy.save_persistent()
        return True


################################################################################
## 三、鉴赏分页界面 A：运动会失物招领箱的秘密（screen extras_sports_lostfound）
################################################################################

transform sports_baton_spin:
    subpixel True
    block:
        ease 1.8 rotate -9 yoffset -1
        ease 1.8 rotate 9 yoffset 1
        repeat

transform notebook_tab_sway:
    subpixel True
    block:
        ease 2.2 rotate -3
        ease 2.2 rotate 3
        repeat

screen extras_sports_lostfound():
    $ _sv = sports_render_view()
    $ _srec = sports_get_record()
    $ _shid = persistent.sports_selected_item or "h1"
    $ _sh = sports_get_item(_shid)
    $ _sh_seen = (_sh["id"] in _srec["inspected"])

    vbox:
        spacing 9

        ## 1. 失物招领箱总览横幅（塑胶跑道红 · 草坪绿）
        frame:
            style "sports_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_lost_found_box.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("运动会失物招领箱的秘密") font gui.name_text_font size 19 color "#fff1ea"
                        if _sv["solved"]:
                            text _("已结案 · 四棒已倒着跑完 · 可随时重新打开失物箱冲击金牌") size 12 color "#9fe3b0"
                        else:
                            text _("运动会后的第二天，六件没人认领的失物 · 一件一件读下去") size 12 color "#f0bfae"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_relay_baton.png" xysize (14, 14) yalign 0.5
                            text ("最佳 %s" % _sv["best_name"]) size 12 color "#f4d98a" yalign 0.5 substitute False
                    frame:
                        style "mailbox_stat_chip"
                        text ("结案 %d 次" % _sv["replays"]) size 12 color "#ffb59e" align (0.5, 0.5) substitute False

        ## 2. 卷宗详情：小卖部缩略图（底部四色接力棒跑道带）、案情、六件失物、倒跑四棒与评级
        frame:
            style "sports_console_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add SPORTS_CASE["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add "images/ui/icon_lost_found_box.png" xysize (24, 24) xalign 0.05 yalign 0.08
                        if _sv["solved"]:
                            add "images/ui/icon_relay_baton.png" xysize (26, 26) xalign 0.96 yalign 0.08 at sports_baton_spin
                        vbox:
                            spacing 1
                            xalign 0.5
                            yalign 0.97
                            add Solid("#f4efe6") xysize (180, 1)
                            hbox:
                                spacing 4
                                for _bt in SPORTS_BATONS:
                                    add Solid(_bt["color"]) xysize (42, 5)
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text SPORTS_CASE["code"] size 12 color "#ffffff" bold True align (0.5, 0.5) substitute False
                            text ("《%s》" % SPORTS_CASE["short_title"]) font gui.name_text_font size 17 color "#fff1ea" yalign 0.5 substitute False
                        text ("%s  ·  %s" % (SPORTS_CASE["time_tag"], SPORTS_CASE["companions"])) size 12 color "#e8b9a8" substitute False
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (15, 15) yalign 0.5
                            text ("光影：%s" % SPORTS_CASE["lighting_note"]) size 12 color "#c79a8c" yalign 0.5 substitute False
                        if _sv["solved"]:
                            text ("结案档案：%s（已结案 %d 次 · 六件失物全读完）" % (_sv["best_line"], _sv["replays"])) size 12 color "#f4d98a" substitute False
                        else:
                            text ("结案档案：尚未结案（已读 %d/6 件，可先翻看下方登记签，再打开失物箱）" % _sv["inspected_count"]) size 12 color "#c79a8c" substitute False

                text SPORTS_CASE["summary_pub"] size 13 color "#fdf3ee" line_spacing 3 substitute False

                ## 2A. 六张失物登记签（3 × 226 + 2 × 8 = 694px 精确贴合内宽，两行）
                text _("失物登记签 · 点击翻看六件失物（亲手检查过的，会显影现场手记）：") size 12 color "#ffb59e" bold True
                grid 3 2:
                    spacing 8
                    for h_obj in SPORTS_ITEMS:
                        $ _h_seen = (h_obj["id"] in _srec["inspected"])
                        $ _h_active = (h_obj["id"] == _sh["id"])
                        button:
                            style "sports_tag_card"
                            selected _h_active
                            action Function(sports_select_item, h_obj["id"])
                            vbox:
                                spacing 2
                                xfill True
                                hbox:
                                    xfill True
                                    yalign 0.5
                                    text ("%s · %s" % (h_obj["code"], h_obj["label"])) size 11 color ("#ffb59e" if _h_active else "#f7e4dc") bold True yalign 0.5 substitute False
                                    text (_("已检查") if _h_seen else _("待检查")) size 10 color ("#9fe3b0" if _h_seen else "#c79a8c") xalign 1.0 yalign 0.5
                                text ("拾获 %s" % h_obj["found"]) size 10 color "#e8a48f" substitute False
                                text h_obj["surface"] size 11 color "#e9cfc6" line_spacing 2 substitute False

                frame:
                    xfill True
                    padding (10, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        spacing 8
                        add "images/ui/icon_evidence_tag.png" xysize (20, 20)
                        vbox:
                            spacing 2
                            text ("%s · %s（%s拾获）" % (_sh["code"], _sh["label"], _sh["finder"])) size 12 color "#ffb59e" bold True substitute False
                            if _sh_seen:
                                text _sh["detail"] size 12 color "#fff6f2" line_spacing 2 substitute False
                            else:
                                text _("还没有亲手检查这件失物。打开失物箱看过之后，现场手记会显影在这里。") size 12 color "#c79a8c"

                ## 2B. 倒跑四棒（4 × 167 + 3 × 8 = 692px <= 694px；每棒一种接力棒颜色）
                text _("倒跑四棒 · 复盘（终点 → 交接 → 起点 → 跑者，结案后显影）：") size 12 color "#ffb59e" bold True
                hbox:
                    spacing 8
                    for _ki, k_obj in enumerate(SPORTS_RELAY_LEGS):
                        frame:
                            style "sports_leg_slot"
                            vbox:
                                spacing 2
                                add Solid(k_obj["color"]) xysize (151, 3)
                                text ("%s · %s" % (k_obj["step"], k_obj["name"])) size 11 color ("#9fe3b0" if _sv["solved"] else "#e8b9a8") bold True substitute False
                                text (_sv["leg_shorts"][_ki] if _sv["solved"] else _("？ 待交棒")) size 12 color ("#fff6f2" if _sv["solved"] else "#a98378") substitute False

                ## 2C. 评级与结案报告预览匣
                frame:
                    style "sports_rating_card"
                    vbox:
                        spacing 5
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_relay_baton.png" xysize (16, 16) yalign 0.5
                                text _("评级 · 重玩挑战") font gui.name_text_font size 13 color "#fff6f2" yalign 0.5
                            text ("历史最佳：%s" % _sv["best_line"]) size 11 color "#f4d98a" xalign 1.0 yalign 0.5 substitute False
                        hbox:
                            spacing 8
                            for t_obj in SPORTS_RATING_TIERS:
                                frame:
                                    style "sports_tier_chip"
                                    hbox:
                                        xfill True
                                        yalign 0.5
                                        text ("%s「%s」" % (t_obj["name"], t_obj["title"])) size 12 color ("#f4d98a" if _sv["best_tier"] == t_obj["key"] else "#f7e4dc") yalign 0.5 substitute False
                                        text t_obj["rule"] size 11 color "#d2a99c" xalign 1.0 yalign 0.5 substitute False
                        if _sv["solved"]:
                            add Solid("#ffb59e33") ysize 1
                            text _sv["display_solution"] size 12 color "#9fe3b0" line_spacing 2 substitute False
                            text _sv["display_mo_note"] size 12 color "#cfa6f0" substitute False
                            text _sv["display_alice_note"] size 12 color "#f0c060" substitute False
                        else:
                            text _("结案报告：解开失物箱之谜后，墨墨会把倒跑四棒和完整的结案报告写在这里。") size 12 color "#c79a8c"

                ## 2D. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("零失误倒跑完四棒可获金牌 · 已结案 %d 次" % _sv["replays"]) size 12 color "#d2a99c" yalign 0.5 substitute False
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton _("展阅结案报告"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(sports_open_report_modal)
                        textbutton (_("重新打开失物箱") if _sv["solved"] else _("打开失物招领箱")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action sports_launch_action()

        ## 3. 推理笔记复盘本直达条
        frame:
            style "mailbox_quick_row"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_case_notebook.png" xysize (20, 20) yalign 0.5
                    text _("推理笔记复盘本 · 四桩短案") font gui.name_text_font size 14 color "#fff3dc" yalign 0.5
                    text ("（已盖复盘章 %d/%d）" % (notebook_stamped_count(), len(NOTEBOOK_CASES))) size 12 color "#f4d98a" yalign 0.5 substitute False
                textbutton _("翻开复盘本"):
                    style "gramophone_mini_pill"
                    xalign 1.0
                    yalign 0.5
                    action [SetField(persistent, "notebook_selected_case", "sportsday"), SetField(persistent, "extras_tab", "notebook")]


## 失物箱结案报告独立展阅弹窗
screen sports_report_modal():
    modal True
    zorder 215
    $ _mv = sports_render_view()

    add "#140a08dc"
    key "K_ESCAPE" action Hide("sports_report_modal")
    key "K_RETURN" action Hide("sports_report_modal")
    key "K_SPACE" action Hide("sports_report_modal")

    frame:
        xalign 0.5
        yalign 0.5
        xsize 740
        padding (24, 20)
        background Frame("gui/panel_card.png", 16, 16)
        vbox:
            spacing 10
            xfill True
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 12
                    yalign 0.5
                    add "images/ui/icon_lost_found_box.png" xysize (40, 40) yalign 0.5
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_mv["code"], _mv["short_title"])) font gui.name_text_font size 20 color "#fff1ea" substitute False
                        text _mv["time_tag"] size 12 color "#e8b9a8" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_relay_baton.png" xysize (30, 30) yalign 0.5 at sports_baton_spin
                    text _mv["best_name"] size 13 color "#f4d98a" bold True yalign 0.5 substitute False

            hbox:
                spacing 0
                for _rb in SPORTS_BATONS:
                    add Solid(_rb["color"]) xysize (173, 3)

            viewport:
                xfill True
                ysize 336
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    text _("案情：") size 12 color "#ffb59e" bold True
                    text _mv["summary"] size 13 color "#fdf3ee" line_spacing 4 substitute False
                    add Solid("#e8b9a833") ysize 1
                    if _mv["solved"]:
                        text _("倒跑四棒：") size 12 color "#ffb59e" bold True
                        for _ri, r_obj in enumerate(SPORTS_RELAY_LEGS):
                            hbox:
                                spacing 8
                                add Solid(r_obj["color"]) xysize (6, 18) yalign 0.0
                                text ("%s · %s（%s）：%s" % (r_obj["step"], r_obj["name"], r_obj["baton"], _mv["leg_fulls"][_ri])) size 13 color "#f7e4dc" line_spacing 3 xsize 658 substitute False
                        add Solid("#ffb59e33") ysize 1
                        text _mv["display_solution"] size 13 color "#9fe3b0" line_spacing 4 substitute False
                        text _mv["display_mo_note"] size 13 color "#cfa6f0" line_spacing 4 substitute False
                        text _mv["display_alice_note"] size 13 color "#f0c060" line_spacing 4 substitute False
                    else:
                        text _("这桩案子还没有结案。打开失物箱、读完六件失物并倒着跑完四棒后，完整的结案报告会显影在这里。") size 13 color "#d2a99c" line_spacing 4

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上结案报告") size 12 color "#d2a99c" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 10
                    textbutton _("重新打开失物箱"):
                        style "gramophone_mini_pill"
                        yalign 0.5
                        action [Hide("sports_report_modal")] + sports_launch_action()
                    textbutton _("合上报告"):
                        style "pill_button"
                        xminimum 116
                        ysize 34
                        text_size 14
                        action Hide("sports_report_modal")


## 失物箱剧场内顶部「倒跑四棒」横幅（位于右上角证物 HUD 下方，互不遮挡；已交接的格子亮起各自的接力棒颜色）
screen sports_relay_banner(legs_done, prompt_line):
    zorder 95
    frame:
        xalign 0.5
        ypos 62
        xsize 760
        padding (16, 8)
        background Frame("gui/hud_chip.png", 12, 12)
        vbox:
            spacing 5
            hbox:
                spacing 8
                yalign 0.5
                add "images/ui/icon_relay_baton.png" xysize (22, 22) yalign 0.5
                text _("失物招领 · 倒跑四棒") size 12 color "#ffb59e" bold True yalign 0.5
                text ("已交接 %d/%d · 失误只计入本案评级，不影响主线" % (legs_done, len(SPORTS_RELAY_LEGS))) size 11 color "#e8b9a8" yalign 0.5
            hbox:
                spacing 6
                for _bi, b_obj in enumerate(SPORTS_RELAY_LEGS):
                    frame:
                        style "sports_banner_slot"
                        vbox:
                            spacing 0
                            add Solid(b_obj["color"] if _bi <= legs_done else "#4a3a36") xysize (160, 3)
                            text ("%s · %s" % (b_obj["step"], b_obj["name"])) size 10 color ("#9fe3b0" if _bi < legs_done else ("#ffb59e" if _bi == legs_done else "#c79a8c")) bold True substitute False
                            text (b_obj["short"] if _bi < legs_done else _("？")) size 11 color ("#fff6f2" if _bi < legs_done else "#a98378") substitute False
            text prompt_line size 14 color "#fff6f2" substitute False


## 失物箱结案结算卡：本局评级 + 历史最佳纪录 + 重玩挑战提示
screen sports_result_card(cur_tier, best_tier, mistakes, best_mistakes, replays, new_record=False, is_first=True):
    modal True
    zorder 220
    $ _ct = sports_tier_def(cur_tier)
    $ _bt = sports_tier_def(best_tier)
    $ _rv = sports_render_view()
    $ _is_gold = (cur_tier == "gold")

    add "#140a08dc"
    key "K_RETURN" action Return("back_to_sportsday")
    key "K_SPACE" action Return("back_to_sportsday")
    key "K_ESCAPE" action Return("back_to_sportsday")

    frame:
        xalign 0.5
        yalign 0.5
        xsize 660
        padding (26, 22)
        background Frame("gui/panel_card.png", 16, 16)
        vbox:
            spacing 12
            xfill True
            hbox:
                spacing 14
                xalign 0.5
                yalign 0.5
                add "images/ui/icon_relay_baton.png" xysize (54, 54) yalign 0.5 at sports_baton_spin
                vbox:
                    spacing 3
                    yalign 0.5
                    text ("失物箱结案 · %s" % SPORTS_CASE["code"]) size 13 color "#ffb59e" bold True substitute False
                    text ("《%s》" % SPORTS_CASE["short_title"]) font gui.name_text_font size 21 color "#fff1ea" substitute False
                    text ("本局评级：【%s · %s】" % (_ct["name"], _ct["title"])) size 14 color ("#f4d98a" if _is_gold else "#9fe3b0") substitute False

            hbox:
                spacing 0
                xalign 0.5
                for _cb in SPORTS_BATONS:
                    add Solid(_cb["color"]) xysize (152, 3)

            frame:
                xfill True
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 4
                    text _rv["display_mo_note"] size 13 color "#cfa6f0" substitute False
                    text _rv["display_alice_note"] size 13 color "#f0c060" substitute False
                    text ("本局失误 %d 次（只计入本案评级，不影响主线）" % mistakes) size 12 color "#e8b9a8"
                    text ("历史最佳：%s「%s」 · 最少失误 %d 次 · 累计结案 %d 次" % (_bt["name"], _bt["title"], best_mistakes, replays)) size 12 color "#e8b9a8" substitute False
                    if is_first:
                        text _("首次结案 · 倒跑四棒已写入鉴赏室「运动会失物」分页，复盘本添上了第四页") size 12 color "#9fe3b0"
                    elif new_record:
                        text _("重玩挑战 · 刷新个人纪录！这一次的交接比以往任何一次都更稳") size 12 color "#f4d98a"
                    elif _is_gold:
                        text _("重玩挑战 · 再次拿下金牌，操场名侦探实至名归") size 12 color "#f4d98a"
                    else:
                        text _("重玩挑战 · 零失误倒着跑完四棒，就能拿下金牌") size 12 color "#e8b9a8"

            textbutton _("收好秒表并返回鉴赏室"):
                style "pill_button"
                xalign 0.5
                xminimum 248
                ysize 38
                text_size 15
                action Return("back_to_sportsday")


################################################################################
## 四、鉴赏分页界面 B：侦探社推理笔记复盘本
##   · PC-16：本模块原有的四签单行复盘本页面（screen extras_case_notebook，grid 4 1）自 PC-15 起已无任何引用，
##     随 PC-16 删除；鉴赏页「复盘」分页由 PC-15 的 extras_casebook_expanded 承载（PC-16 起七页）。
##   · 上方的只读渲染函数（notebook_render_page / notebook_summary / notebook_stamp / notebook_open_page 等）、
##     下方的整页展开弹窗 notebook_page_modal 与 notebook_* 样式原样保留，仍被扩容后的复盘本调用。
################################################################################

## 复盘本整页展开弹窗（推理链全文、结案报告与页边批注；全部在运行期从该案自己的数据里读出）
screen notebook_page_modal(case_key="library"):
    modal True
    zorder 218
    $ _pm = notebook_render_page(case_key)

    add "#100c06e0"
    key "K_ESCAPE" action Hide("notebook_page_modal")
    key "K_RETURN" action Hide("notebook_page_modal")
    key "K_SPACE" action Hide("notebook_page_modal")

    frame:
        xalign 0.5
        yalign 0.5
        xsize 740
        padding (24, 20)
        background Frame("gui/panel_card.png", 16, 16)
        vbox:
            spacing 10
            xfill True
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 12
                    yalign 0.5
                    add "images/ui/icon_case_notebook.png" xysize (40, 40) yalign 0.5 at notebook_tab_sway
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % ((_pm["code"] or "----"), _pm["short_title"])) font gui.name_text_font size 20 color "#fff3dc" substitute False
                        text ("%s · %s" % (_pm["index_label"], _pm["time_tag"])) size 12 color "#d9c39e" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_evidence_tag.png" xysize (28, 28) yalign 0.5
                    text (_("已盖复盘章") if _pm["stamped"] else _pm["best_name"]) size 13 color "#f4d98a" bold True yalign 0.5 substitute False

            add Solid(_pm["ink"]) ysize 3

            viewport:
                xfill True
                ysize 300
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    text _pm["best_line"] size 13 color "#f4d98a" substitute False
                    if _pm["summary"]:
                        text _pm["summary"] size 13 color "#fbf1df" line_spacing 4 substitute False
                    add Solid("#e8c88a33") ysize 1
                    if _pm["solved"]:
                        text ("%s：" % _pm["unit"]) size 12 color "#e8c88a" bold True substitute False
                        for _fi, _fc in enumerate(_pm["chain"]):
                            hbox:
                                spacing 8
                                add Solid(_pm["ink"]) xysize (6, 18) yalign 0.0
                                text ("%s · %s：%s" % (_fc[0], _fc[1], _pm["chain_fulls"][_fi])) size 13 color "#f3e6cc" line_spacing 3 xsize 658 substitute False
                        add Solid("#e8c88a33") ysize 1
                        text _pm["display_solution"] size 13 color "#86efac" line_spacing 4 substitute False
                        text _pm["display_lesson"] size 13 color "#fbf1df" line_spacing 4 substitute False
                        text _pm["display_mo_margin"] size 13 color "#cfa6f0" line_spacing 4 substitute False
                        if _pm["display_secret"]:
                            add Solid("#f4d98a33") ysize 1
                            text _pm["display_secret"] size 13 color "#f4d98a" line_spacing 4 substitute False
                    else:
                        text _("这一页还空着。等这一案结案之后，推理链全文、结案报告和墨墨的页边批注会一起抄进来。") size 13 color "#b39d7a" line_spacing 4
                    if _pm["display_masked_notice"]:
                        text _pm["display_masked_notice"] size 12 color "#f0a4b8" substitute False

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上这一页") size 12 color "#b39d7a" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 8
                    if not persistent.te_cleared and not persistent.truth_spoiler_confirmed:
                        textbutton _("手动解锁剧透"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Show("confirm",
                                        message=_("尚未通关 TRUE END，确定提前揭晓复盘本这一页涉终章旧约的页边续批吗？"),
                                        yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                        no_action=Hide("confirm"))
                    textbutton _("合上这一页"):
                        style "pill_button"
                        xminimum 138
                        ysize 34
                        text_size 14
                        action Hide("notebook_page_modal")


################################################################################
## 五、样式定义（PC-13 塑胶跑道红与草坪绿 & 牛皮纸复盘本配色）
################################################################################

style sports_header_card is default:
    xfill True
    padding (14, 10)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#f2b3a0") * SaturationMatrix(0.0))

style sports_console_card is default:
    xfill True
    padding (14, 11)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#f4d6cb") * SaturationMatrix(0.0))

style sports_rating_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style sports_tag_card is button:
    xsize 226
    yminimum 88
    padding (8, 6)
    background Frame("gui/hud_chip.png", 12, 12)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style sports_leg_slot is default:
    xsize 167
    ysize 58
    padding (8, 5)
    background Frame("gui/hud_chip.png", 12, 12)

style sports_banner_slot is default:
    xsize 176
    ysize 44
    padding (8, 4)
    background Frame("gui/panel_card.png", 16, 16)

style sports_tier_chip is default:
    xsize 218
    ysize 30
    padding (8, 0)
    background Frame("gui/panel_card.png", 16, 16)

style notebook_header_card is default:
    xfill True
    padding (14, 10)
    background Transform(Frame("gui/panel_card.png", 16, 16), matrixcolor=TintMatrix("#ead6ad") * SaturationMatrix(0.0))

style notebook_index_tab is button:
    xsize 173
    ysize 70
    padding (9, 7)
    background Transform(Frame("gui/panel_card.png", 16, 16), matrixcolor=TintMatrix("#e9dcc0") * SaturationMatrix(0.0))
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style notebook_page_card is default:
    xfill True
    padding (14, 11)
    background Transform(Frame("gui/panel_card.png", 16, 16), matrixcolor=TintMatrix("#e2d2b0") * SaturationMatrix(0.0))

style notebook_evidence_cell is default:
    xsize 226
    yminimum 62
    padding (8, 5)
    background Frame("gui/hud_chip.png", 12, 12)

style notebook_chain_slot is default:
    xsize 167
    ysize 58
    padding (8, 5)
    background Frame("gui/hud_chip.png", 12, 12)

style notebook_margin_box is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style notebook_summary_card is default:
    xfill True
    padding (14, 9)
    background Transform(Frame("gui/panel_card.png", 16, 16), matrixcolor=TintMatrix("#d8e2c8") * SaturationMatrix(0.0))

## 侦探社沙龙子栏：某组装进四项玩法时，展开态改用紧凑等宽短签（xminimum 60 / 左右内边距 4），
## 由 extra.rpy 的子栏按组内项数选择；四签组展开态由 verify_pc10 的共享测宽函数与 verify_pc13 逐一实测 <= 702px
style salon_quad_pill is bookstreet_subtab_pill:
    xminimum 60
    padding (4, 0)

style salon_quad_pill_text is bookstreet_subtab_pill_text


################################################################################
## 六、失物箱独立沙盒初始化与结案出口（零侵入主线好感/失误/存档）
################################################################################

label _sports_init_sandbox(session_save_title):
    $ full_run = False
    $ save_name = session_save_title
    $ mo_favor = 90
    $ alice_favor = 70
    $ fail_count = 0
    $ intuition = 3
    $ evidence = []
    $ inspected_evidence = []
    $ expanded_evidence = ""
    $ reset_combine_state()
    $ set_ambient("warm")
    return

label _sports_finish_case(local_mistakes=0):
    $ _sd_final_mistakes = max(0, int(local_mistakes or 0))
    $ _sd_rec = sports_record_solve(_sd_final_mistakes)
    hide screen sports_relay_banner
    hide screen evidence_book
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen sports_result_card(_sd_rec["last_tier"], _sd_rec["best_tier"], _sd_final_mistakes, _sd_rec["best_mistakes"], _sd_rec["replays"], _sd_rec["new_record"], _sd_rec["is_first"])
    $ persistent.extras_tab = "sportsday"
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 七、失物招领 SD-01：《没有跑的第四棒》
################################################################################

label sports_lostfound_case:
    call _sports_init_sandbox("失物招领 · SD-01 没有跑的第四棒") from _call__sports_init_sandbox
    $ _sd_mistakes = 0
    $ _sd_legs = 0
    $ _sd_h1 = False
    $ _sd_h2 = False
    $ _sd_h3 = False
    $ _sd_h4 = False
    $ _sd_h5 = False
    $ _sd_h6 = False
    $ _sd_replays = sports_get_record()["replays"]
    $ _sd_best_text = sports_render_view()["best_line"]

    scene bg black with fade
    $ play_bgm(bgm_suspense, fadein=1.5)
    centered "{size=+6}失物招领 · LOST & FOUND SD-01{/size}\n\n{size=+14}没有跑的第四棒{/size}\n\n{color=#ffb59e}周五 16:30 · 万事屋 · 秋季运动会后的第二天{/color}"

    scene bg agency at bg_kenburns_in
    $ set_ambient("warm")
    show screen evidence_book
    with dissolve

    play sound se_footstep
    "秋季运动会结束后的第二天，整栋旧社团楼都还没缓过劲来。走廊里飘着跌打喷雾的味道，好几个人走路一瘸一拐，说话的嗓子全是哑的。"
    "万事屋里，艾丽丝正把昨天的加油手幅叠成一个方块，准备塞进柜子最底层。"
    play sound se_door
    show zhang smile at center
    zhang "哥们儿，都在吧？帮个忙，就一个小忙。"
    "张子谦抱着一只纸箱挤进门来，箱子侧面用记号笔写着：『失物招领 · 秋季运动会』。"
    show alice think at left
    show mo think at right
    alice "学生会的失物招领箱？你该不会是想让万事屋替你值班吧。"
    zhang "值班倒不用。运动会一天捡了四十多件东西，九成都被领走了，就剩这六件，一整天都没人来认。周一学生会就要清箱，没人要的统统交给后勤。"
    "他把箱子往桌上一放，掀开了盖子。"
    show zhang think at center
    zhang "怪就怪在这儿。里头有一双钉鞋，少说三四百块；还有一根器材室的接力棒，体育组今天一早就来问过了。值钱的、要还的，偏偏都没人来领。"
    zhang "还有件事，你们可能也听说了。昨天下午女子四乘一百决赛，高一(4)班的第四棒没去检录，全班只能弃权。人家练了一个月，那个班今天一整天都没人说话。"
    show alice shock at left
    alice "那个第四棒呢？"
    zhang "说是肚子疼。别的什么都不肯说。"
    "张子谦挠了挠头，声音低了下去。"
    zhang "检录处昨天是我在管。按规矩，等满五分钟就得写弃权……我写的。"
    play sound se_write
    mo_note "六件失物。先别急着找失主。先把它们读一遍。"
    "墨墨把六件东西一件一件从箱子里拿出来，在桌上排成一排。每一件上都系着一张学生会的失物登记签，写着拾获的时间、地点和拾获人。"
    "一根蓝色的接力棒。一双钉鞋。一枚很小的发卡。一张皱巴巴的卡片。一瓶汽水。一张缺了几格的贴纸。"
    show alice smile at left
    alice "好！万事屋开工！今天不出外勤，出一回内勤——失物招领箱的秘密，就让本社长一件一件读给你们听！"

label sports_case_investigate:
    if _sd_h1 and _sd_h2 and _sd_h3 and _sd_h4 and _sd_h5 and _sd_h6:
        jump sports_case_review_intro

    menu:
        "六件失物排在桌上，登记签朝上。先读哪一件？（可随时点击右上角【证据】翻面查看批注）"

        "拿起那根蓝色的接力棒，去器材室核对借用登记" if not _sd_h1:
            $ _sd_h1 = True
            scene bg storeroom
            $ set_ambient("cool")
            show alice think at left
            show zhang think at center
            show mo think at right
            with dissolve
            play sound se_door
            "体育器材室就在操场看台的背面。屋里堆着跨栏架、海绵垫和一筐一筐的实心球，空气里一股橡胶和灰尘的味道。"
            "接力棒挂在墙上的木架上，红黄蓝绿，每种颜色两根，棒尾贴着编号。只有蓝色那一格，空着一个钩子。"
            zhang "就是这个空位。体育组的老师说，八根接力棒，运动会结束只还回来七根。"
            play sound se_page
            "门边挂着一本借用登记。张子谦翻到昨天那一页，手指顺着往下找。"
            "『15:00 · 高一(4)班 · 交接练习 · 4 号棒（蓝）』——归还那一栏，空着。"
            mc "高一(4)班三点借走的，说是练交接。也就是四乘一百决赛检录前二十分钟。"
            show alice smile at left
            alice "可这根棒子，既不是在跑道上、也不是在器材室门口被捡到的。登记签上写的是——"
            "『拾获：16:40 · 小卖部帐篷后 · 后勤组收帐篷时拾获』。"
            "我把接力棒横过来看。棒身中段歪歪地粘着半张草莓贴纸，边角已经卷了起来，摸上去黏糊糊的。"
            mc "贴纸的位置很奇怪。跑接力的人握的是棒尾，可这半张贴纸离棒尾差不多一个小拳头远。"
            show alice think at left
            alice "一个小拳头……是一只小手握着它的时候，大拇指正好按着的地方？"
            show mo smile at right
            play sound se_write
            mo_note "练交接的棒子，最后停在了卖汽水的帐篷后面。"
            $ sports_inspect_item("h1")
            jump sports_case_investigate

        "看看那双鞋带系在一起的钉鞋" if not _sd_h2:
            $ _sd_h2 = True
            scene bg agency
            $ set_ambient("warm")
            show alice think at left
            show mo think at right
            with dissolve
            "那是一双白色的短跑钉鞋，三十七码，鞋底的鞋钉闪着冷冷的光。两只鞋的鞋带被系在了一起，打成一个端端正正的蝴蝶结。"
            "登记签：『拾获：15:35 · 看台B区底下 · 清洁阿姨拾获』。"
            play sound se_page
            "我把鞋翻过来。鞋钉的缝隙里卡满了红色的塑胶颗粒，颗粒的边缘还很新，一碰就簌簌地往下掉。"
            mc "穿这双鞋的人在跑道上热过身。这些颗粒，是从跑道上带下来的。"
            show alice smile at left
            alice "你再看这个蝴蝶结。跑丢的鞋会东一只西一只，可这两只是并排放着的，鞋带还系在一起——是有人好好地脱下来，放在那里的。"
            "鞋舌内侧用黑色马克笔写着一行字：『4 · 冲刺！』。旁边挤着三个签名，笔迹各不一样，其中一个还画了个歪歪扭扭的笑脸。"
            show alice shock at left
            alice "四号，冲刺……这是接力队写给第四棒的！三个签名，就是另外三棒。"
            mc "一个第四棒，热好了身，把钉鞋好好地脱下来、系在一起，放在看台底下——然后就再也没有回来拿。"
            show mo think at right
            play sound se_write
            mo_note "钉鞋不能在水泥地上走。她要去的地方，不在跑道上。"
            $ sports_inspect_item("h2")
            jump sports_case_investigate

        "捏起那枚小兔子发卡，上天台看看看台B区" if not _sd_h3:
            $ _sd_h3 = True
            scene bg rooftop
            $ set_ambient("clear")
            show alice think at left
            show mo think at right
            with dissolve
            play sound se_footstep
            "那枚小兔子发卡只有拇指那么大，粉色的塑料兔子，一只耳朵上粘着一小块草莓贴纸。艾丽丝捏着它，拉着我们爬上了教学楼的天台。"
            "登记签上写着：『拾获：15:35 · 看台B区底下 · 清洁阿姨拾获』——和那双钉鞋，同一个时间，同一个地方。"
            "从天台往下看，整个操场一览无余。昨天插满彩旗的看台已经空了，B区就在第三弯道旁边；看台背后那片草地，是运动会时的热身区。"
            show alice smile at left
            alice "热身区就在B区背后，两步路就能走到看台底下。"
            play sound se_page
            "我眯着眼睛看过去。看台是钢架搭的，底下是空的。最低的那根横梁离地面，我估计不到七十厘米。"
            mc "那么矮的地方，小孩子能站着走进去。大人只能趴下来，手脚并用地爬。"
            alice "穿着钉鞋爬水泥地？鞋钉会打滑，还会把钉子磨坏的。"
            mc "所以要爬进去，就得先把钉鞋脱下来。"
            show alice think at left
            alice "这枚发卡是给四五岁的小孩子戴的。一个小孩子，掉了发卡；一个第四棒，脱了钉鞋……它们被捡到的时候，就挨在一起。"
            show mo smile at right
            play sound se_write
            mo_note "看台底下，又暗又矮。适合一个人躲起来哭。"
            $ sports_inspect_item("h3")
            jump sports_case_investigate

        "展开那张皱巴巴的检录卡，对一对检录表" if not _sd_h4:
            $ _sd_h4 = True
            scene bg agency
            $ set_ambient("warm")
            show alice think at left
            show zhang think at center
            show mo think at right
            with dissolve
            play sound se_page
            "那张检录卡被人攥得皱皱巴巴，展开以后还能看清上面的字：『女子四乘一百米决赛 · 高一(4)班 · 第四棒 · 15:20 检录』。"
            "登记签：『拾获：15:30 · 小卖部帐篷前 · 小卖部阿姨拾获』。"
            zhang "检录表我带着呢，你们等等。"
            "他从书包里抽出一块夹板，翻到女子四乘一百决赛那一页。"
            zhang "『15:20 · 高一(4)班 · 第四棒许知夏 · 未到』。按规矩等了五分钟，『15:25 · 弃权』。中间我还用广播喊了两遍，最后一遍是三点二十三。"
            show alice shock at left
            alice "三点二十五弃权，三点半，第四棒的检录卡就落在了小卖部的帐篷前？"
            "我把卡片翻过来。背面晕着一圈圆圆的水印，边缘整整齐齐，像是有人把一个冰凉的瓶子在上面压过；卡角上，又是一小块草莓贴纸。"
            mc "这是冰镇饮料的瓶底压出来的。检录卡的主人，在小卖部拿过一瓶冰的东西。"
            show zhang sad at center
            zhang "后来她倒是跑到检录处来了，可弃权已经写上去了。她在长椅上一个人坐了好一会儿，一句话也没说，后来就不见了。"
            show mo think at right
            play sound se_write
            mo_note "检录在三点二十。她三点二十，在另一个地方。"
            $ sports_inspect_item("h4")
            jump sports_case_investigate

        "带上那瓶没开封的橘子汽水，去小卖部问问阿姨" if not _sd_h5:
            $ _sd_h5 = True
            scene bg canteen
            $ set_ambient("warm")
            show alice smile at left
            show ayi neutral at center
            show mo think at right
            with dissolve
            play sound se_door
            "小卖部还是老样子，冰柜嗡嗡地响，货架上摆满了面包和硬糖。阿姨一看见艾丽丝手里那瓶橘子汽水，就『哎呀』了一声。"
            show ayi shock at center
            ayi "这瓶汽水怎么跑到你们手里了？这是阿姨昨天请人喝的呀！"
            "瓶身上贴着小卖部的手写标签：『运动会特供』。登记签上写着：『拾获：15:45 · 检录处长椅 · 检录裁判拾获』。盖子都没拧开过。"
            alice "阿姨，您请谁喝的？"
            show ayi sad at center
            ayi "唉，说起来阿姨到现在还后怕。昨天下午三点多，接力决赛快开始那会儿，帐篷前头排了老长的队，我一忙，一回头——我家豆豆不见了。"
            ayi "豆豆是我孙女，五岁，幼儿园放秋假，非要跟着我来看运动会。我扔下摊子满操场喊，嗓子都喊劈了……"
            ayi "过了二十来分钟，一个女孩子把豆豆背回来了。个子高高的，扎着马尾，穿着运动服，脚上——就穿着一双袜子，袜底都磨黑了。"
            show ayi think at center
            ayi "我抱着豆豆光顾着哭，顺手从冰柜里摸了一瓶汽水塞给人家，连名字都没顾上问。那孩子一口都没喝，听见广播喊了句什么，转身就跑了。"
            mc "阿姨，您还记得广播喊的是什么吗？"
            ayi "好像是在喊谁去检录……哎，那会儿乱糟糟的，阿姨也没听真。"
            show alice think at left
            alice "汽水是在检录处的长椅上被捡到的。她抱着阿姨给的汽水跑去了检录处，在那里坐了一会儿，最后连盖子都没拧开。"
            show mo smile at right
            play sound se_write
            mo_note "失物招领箱里最要紧的那件失物，昨天就已经被找回来了。"
            $ sports_inspect_item("h5")
            jump sports_case_investigate

        "翻过那张缺了几格的草莓贴纸，看看背面" if not _sd_h6:
            $ _sd_h6 = True
            scene bg agency
            $ set_ambient("warm")
            show alice think at left
            show mo think at right
            with dissolve
            "最后一件失物，是一张小小的草莓贴纸。一整版十二格，被撕得只剩七格，空出来的格子边缘毛毛糙糙的，像是一只小手一格一格抠下来的。"
            "登记签：『拾获：15:15 · 看台B区后的热身区 · 跳高裁判拾获』。"
            play sound se_page
            "我把贴纸翻过来。背面印着一行小字：『小卖部 · 买糖送贴纸』，下面用蜡笔歪歪扭扭地写着两个字——『豆豆』。"
            show alice smile at left
            alice "这是小孩子的东西！会把自己的名字写在贴纸背面的，最多也就上幼儿园。"
            "墨墨把那根接力棒、小兔子发卡和检录卡挪到贴纸旁边，一个一个比过去。"
            "接力棒上的那半张，发卡耳朵上的那一块，检录卡角上的那一块——形状、颜色、草莓叶子的位置，都和贴纸版上空出来的格子对得上。"
            show alice shock at left
            alice "三件失物上的贴纸，全是从这一版上抠下来的！"
            mc "五个空格，对上了三个。还有两格，不在这只箱子里。"
            mc "而且这张贴纸是在热身区被捡到的。热身区就在看台B区背后——拿着它的小孩子，从那里经过过。"
            show mo smile at right
            play sound se_write
            mo_note "小孩子见什么，就贴什么。贴纸去过的地方，她都去过。"
            $ sports_inspect_item("h6")
            jump sports_case_investigate

label sports_case_review_intro:
    scene bg sunset
    $ set_ambient("dusk")
    $ play_bgm(bgm_mystery, fadein=1.2, fadeout=0.8)
    show alice smile at left
    show mo neutral at right
    with dissolve

    "六件失物全部读完，太阳已经斜到了操场西边。我们站在旧社团楼的外廊上，远远能看见看台B区的钢架，在夕阳里拉出一道一道长长的影子。"
    "墨墨在笔记本上画了一条跑道，跑道上画了四个箭头。箭头的方向，全是倒着的。"
    play sound se_write
    mo_note "倒着跑。从失物最后停下的地方开始。"
    alice "接力是一棒交给下一棒。那我们就倒过来——从终点出发，一棒一棒往回交，一直交回到起跑的那个人手里！"
    if _sd_replays > 0:
        sysmsg "【失物招领 · 重玩挑战】当前历史最佳：[_sd_best_text]。零失误倒着跑完四棒，就能拿下金牌。"
    else:
        sysmsg "【失物招领 · 倒跑四棒】依次选出「终点 → 交接 → 起点 → 跑者」四棒。零失误可获金牌，失误只计入本案评级，不影响主线。"

label sports_relay_k1:
    show screen sports_relay_banner(0, "第一棒 · 终点：帐篷后的接力棒、帐篷前的检录卡、阿姨递出去的汽水——事情在哪里结束？")
    menu:
        "检录处——第四棒最后还是赶到了，把接力棒交还给了裁判":
            hide screen sports_relay_banner
            $ _sd_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "检录表上写的是弃权呀。接力棒也不在检录处，它是在小卖部帐篷后面被捡到的。"
            play sound se_write
            mo_note "跑到检录处的，只有那瓶汽水。接力棒没有去。"
            jump sports_relay_k1

        "小卖部帐篷前——走丢的豆豆在那里回到了奶奶身边":
            hide screen sports_relay_banner
            play sound se_correct
            $ _sd_legs = 1

        "器材室——接力棒练完交接被还了回去，后来又被别人拿走":
            hide screen sports_relay_banner
            $ _sd_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "器材室的借用登记上，4 号棒的归还栏一直空着哦。它根本没有回过器材室。"
            play sound se_write
            mo_note "没还回去的棒子，就还在路上。顺着登记签找它停下的地方。"
            jump sports_relay_k1

    mc "检录卡落在帐篷前，接力棒在帐篷后，阿姨请客的汽水也是在那里递出去的。六件失物的故事，终点不在跑道上，而在小卖部的帐篷前——走丢的豆豆，就是在那里回到了奶奶身边。"

label sports_relay_k2:
    show screen sports_relay_banner(1, "第二棒 · 交接：棒身上小拳头高的贴纸、发卡和检录卡上同一版的草莓——接力棒交到了谁手里？")
    menu:
        "练交接的时候被队友失手甩出了跑道，滚进了人堆":
            hide screen sports_relay_banner
            $ _sd_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "甩出去的棒子可不会自己贴上贴纸，还正好贴在小孩子握棒的位置呀。"
            play sound se_write
            mo_note "贴纸是一格一格抠下来、按上去的。有人握着它，握了很久。"
            jump sports_relay_k2

        "别班的人把它藏了起来，想让高一(4)班比不成":
            hide screen sports_relay_banner
            $ _sd_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "藏棒子的人，干嘛还要往上贴草莓贴纸？再说那是练习用的棒子，决赛用的接力棒是裁判发的，藏起来也没用呀。"
            play sound se_write
            mo_note "这不是捣乱。是有人在哄一个人。"
            jump sports_relay_k2

        "被交到了五岁的豆豆手里——她一路握着，见什么贴什么":
            hide screen sports_relay_banner
            play sound se_correct
            $ _sd_legs = 2

    mc "接力棒上那半张贴纸，在小孩子握棒时大拇指按着的地方；发卡和检录卡上的贴纸，都是从豆豆那一版上抠下来的。练交接用的蓝色接力棒，被交到了豆豆手里——她一路握着它，见什么贴什么。"

label sports_relay_k3:
    show screen sports_relay_banner(2, "第三棒 · 起点：系成蝴蝶结的钉鞋、挨在一起的兔子发卡、只有小孩能站进去的看台——从哪里开始？")
    menu:
        "看台B区底下——有人脱下钉鞋爬进去，找到了躲着哭的豆豆":
            hide screen sports_relay_banner
            play sound se_correct
            $ _sd_legs = 3

        "热身区——豆豆在人群里被撞倒，有人顺手把她扶了起来":
            hide screen sports_relay_banner
            $ _sd_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "热身区只捡到了那张贴纸呀。发卡和钉鞋，是在看台底下挨在一起被捡到的——扶一个人起来，可用不着把钉鞋脱掉。"
            play sound se_write
            mo_note "鞋脱在哪里，事情就从哪里开始。"
            jump sports_relay_k3

        "主席台——广播里播了寻人启事，有人照着广播找到了她":
            hide screen sports_relay_banner
            $ _sd_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "阿姨是扔下摊子满操场喊的，没去过广播站哦。而且照着广播找人的话，也用不着把钉鞋脱在看台底下呀。"
            play sound se_write
            mo_note "那天广播里喊的，是检录。"
            jump sports_relay_k3

    mc "钉鞋被好好地脱下来、鞋带系成蝴蝶结，和豆豆的发卡挨在一起。看台底下只有小孩子能站着钻进去，大人得脱了钉鞋才能爬。事情是从看台B区底下开始的——有人在那里，找到了躲着哭的豆豆。"

label sports_relay_k4:
    show screen sports_relay_banner(3, "第四棒 · 跑者：鞋舌上的「4 · 冲刺！」、三点二十没人到的检录、长椅上没开封的汽水——是谁？")
    menu:
        "小卖部阿姨自己——她循着哭声找到了豆豆":
            hide screen sports_relay_banner
            $ _sd_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "阿姨说，是一个穿运动服、只穿着袜子的女孩子把豆豆背回来的呀，她还塞了一瓶汽水给人家呢。"
            play sound se_write
            mo_note "请客的人，和被请的人，不是同一个。"
            jump sports_relay_k4

        "高一(4)班的第四棒，许知夏":
            hide screen sports_relay_banner
            play sound se_correct
            $ _sd_legs = 4
            show screen deduction_cutin(headline=_("倒着跑完四棒 ——！"), subline="THE RELAY IN REVERSE")
            with flash_shutter

        "张子谦——检录处离看台最近，他顺路去找的":
            hide screen sports_relay_banner
            $ _sd_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "三点二十张子谦一直在检录处记名字、喊广播，一步都没离开过呀。再说，他的脚可塞不进三十七码的钉鞋。"
            play sound se_write
            mo_note "鞋上写着四号。四号，没有来检录。"
            jump sports_relay_k4

    mc "鞋舌上写着『4 · 冲刺！』，接力棒是高一(4)班借的，第四棒的检录卡落在帐篷前，阿姨请的汽水被留在检录处的长椅上。那天没有出现在检录处的第四棒，并没有肚子疼——她在看台底下，找到了一个走丢的孩子。是许知夏。"
    show alice happy at left
    alice "四棒全部倒着跑完！走，把钉鞋还给它的主人——顺便，把她弄丢的那一场比赛，也找回来。"

label sports_case_resolution:
    scene bg corridor at bg_kenburns_in
    $ set_ambient("dusk")
    $ play_bgm(bgm_warm, fadein=1.5, fadeout=1.0)
    show alice smile at left
    show mo smile at right
    with dissolve

    play sound se_footstep
    "高一(4)班的教室在教学楼二楼的尽头。放学快一个小时了，走廊里空荡荡的，只有一扇窗还开着。"
    "教室里只剩一个人。她扎着马尾，个子高高的，正踮着脚把墙上的加油横幅一点一点揭下来，叠好，放进讲台底下的纸箱里。"
    "横幅上写着：『高一(4) · 四乘一百 · 冲！』。"
    alice "请问，是许知夏同学吗？"
    "她回过头，看见艾丽丝怀里抱着的那双钉鞋，手里的横幅一下子停住了。"
    zhixia "……那是我的鞋。"
    zhixia "谢谢你们送过来。放、放在门口就好。"
    show alice think at left
    alice "鞋子可以放门口。可还有一样东西，学生会的失物招领箱装不下，得当面还给你。"
    zhixia "……什么？"
    alice "昨天下午三点二十，你本来应该在的那个地方。"
    "许知夏低下头，过了很久才开口。"
    zhixia "你们……都知道了？"
    mc "知道一部分。剩下的，失物没法告诉我们。"
    zhixia "……三点多，我在看台后面练交接，听见看台底下有人在哭。很小声，一抽一抽的。"
    zhixia "我蹲下来一看，最里面缩着一个小女孩，抱着膝盖，头发上的发卡都掉了。我喊她，她就往里躲。"
    zhixia "看台底下太矮了，我只能爬进去。可钉鞋在水泥地上会打滑，我就把它脱了，鞋带系在一起，想着待会儿再回来拿。"
    zhixia "我爬到她旁边，她哭得说不出话。我手里正好拿着练习用的接力棒，就递给她——跟她说，这是接力棒，现在你是最后一棒，我们一起跑去找奶奶，好不好。"
    zhixia "她就不哭了。攥着那根棒子，攥得可紧了，一边走还一边往上面贴贴纸。"
    zhixia "我背着她，她说奶奶卖汽水，我就一个帐篷一个帐篷地找。找到小卖部的时候，广播正好在喊……高一(4)班第四棒，最后一次检录。"
    zhixia "阿姨抱着她哭，往我手里塞了一瓶汽水。我拼命往回跑，到检录处的时候，弃权已经写上去了。"
    show alice sad at left
    alice "那你为什么要跟班里说，是肚子疼？"
    zhixia "……因为没跑就是没跑。"
    zhixia "我们第三棒的那个女生，为了这场决赛，每天早上六点就来操场练交接。大家练了一个月，最后一棒没有到。"
    zhixia "我要是说『我去帮人了』，听起来……就像是在找借口。我不想让她们觉得，我是在给自己找台阶下。"
    "她的声音越来越小，手指把横幅的边角捏得皱了起来。"
    show mo think at right
    play sound se_page
    "墨墨走上前，把笔记本翻到新的一页，写了一行字，转过去给她看。"
    play sound se_write
    mo_note "你跑完了。只是那一棒的终点，不在跑道上。"
    "许知夏盯着那行字看了很久，眼眶一点一点红了。"

    scene bg canteen at bg_kenburns_out
    $ set_ambient("warm")
    show alice smile at left
    show ayi happy at center
    show mo smile at right
    with dissolve
    play sound se_door
    "艾丽丝几乎是把许知夏拽进小卖部的。阿姨正在柜台后面理货，一抬头，手里的面包『啪』地掉在了地上。"
    ayi "就是你！就是你这孩子！"
    "柜台后面钻出来一个扎着羊角辫的小女孩，穿着一条黄色的背带裤，看见许知夏的那一瞬间，眼睛一下子亮了。"
    doudou "袜子姐姐！"
    "豆豆一头扑过来，抱住了许知夏的腿。"
    show ayi smile at center
    ayi "昨天阿姨连句谢谢都没说囫囵，名字也没问……这孩子念叨了一晚上的『袜子姐姐』，我还以为她是做梦呢。"
    show ayi think at center
    ayi "你那场比赛……是为了送豆豆回来，才没赶上的？"
    zhixia "阿姨，不是的，是我自己——"
    alice "就是的。"
    "艾丽丝从纸箱里拿出那根蓝色的接力棒，蹲下来，递到豆豆手里。"
    alice "豆豆，还记得这个吗？昨天你是最后一棒。最后一棒跑完了，要把棒子交给谁呀？"
    "豆豆歪着头想了想，然后双手捧着接力棒，郑重其事地举到许知夏面前。"
    doudou "交棒！袜子姐姐，给你！"
    "许知夏愣了一下，伸手接住了那根棒子。棒身上贴满了歪歪扭扭的草莓贴纸。"
    "我这才看见，她运动服的左肩上粘着两块小小的草莓贴纸——正是贴纸版上缺掉的最后两格。昨天被背着的时候，豆豆一路贴上去的；她自己大概一直都没发现。"
    play sound se_write
    mo_note "缺掉的两格，找到了。"
    play sound se_door
    "小卖部的门又被推开了。三个穿着高一(4)班班服的女生站在门口，气喘吁吁的——是艾丽丝托张子谦去把她们叫来的。"
    tongxue "知夏！你、你干嘛不早说啊！"
    tongxue "我们还以为你……我们今天一整天都没理你……"
    zhixia "对不起。最后一棒没跑到，是我——"
    tongxue "谁要你道歉了！你那会儿要是不管她，我们才不跟你跑接力呢！"
    "说话的是她们的第三棒。她一边说，一边自己先哭了。另外两个人一左一右，把许知夏夹在了中间。"
    show ayi happy at center
    ayi "好了好了，都别哭了！今天阿姨请客，冰柜里的汽水随便拿！"
    "四瓶橘子汽水『砰砰砰砰』地开了盖。豆豆举着接力棒站在小板凳上，给每个人的袖子上都贴了一张草莓贴纸。"
    "比赛的成绩没有改，高一(4)班的那一栏，还是写着弃权。可四个女生碰杯的时候，谁也没有再提它。"

    scene bg agency at bg_kenburns_in
    $ set_ambient("warm")
    show alice happy at left
    show mo smile at right
    with dissolve
    play sound se_bell
    "第二天早上，小卖部的玻璃门上多了一张手写的大红纸：『谢谢高一(4)班的第四棒 —— 豆豆和奶奶』。"
    "红纸下面贴着一张蜡笔画：一个扎马尾的大姐姐背着一个小女孩，小女孩手里高高举着一根蓝色的棒子。"
    "张子谦说，体育组的老师看了那张画，在器材室的借用登记上，把 4 号接力棒的归还栏补齐了：『归还人：豆豆（代）』。"
    "放学后，艾丽丝把那只空了的失物招领箱翻过来，当成了凳子。"
    alice "搭档，墨墨。你们发现没有——闭馆的图书馆、下雨的剧场、北窗的画室，再加上今天的运动会，已经四桩案子了。"
    mc "每一桩，我们都差点冤枉了一个好人。"
    alice "所以才要复盘呀！本社长决定了——万事屋要有一本推理笔记复盘本！每一桩案子的证物、推理和评级，全都抄进去。下次再遇到怪事，先翻本子！"
    "她从抽屉里翻出一本崭新的硬皮笔记本，『啪』地拍在桌上，在封面上写了几个大字：『推理笔记复盘本』。"
    "墨墨接过本子，没有急着抄案子，而是先在扉页的角落里，画了一块小小的秒表。秒表的指针，是倒着走的。"
    play sound se_write
    mo_note "倒着读，才看得见每个人为什么那样做。"
    show alice smile at left
    alice "好！侦探社推理笔记复盘本，今天正式开张！"

    call _sports_finish_case(_sd_mistakes) from _call__sports_finish_case
    return
