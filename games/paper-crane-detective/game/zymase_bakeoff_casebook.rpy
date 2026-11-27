## 《沉默侦探：千纸鹤的约定》—— PC-17 家政课烘焙赛的第二块蛋糕
## zymase_bakeoff_casebook.rpy
##
## 设计要点：
##   1. 100% 零侵入主线剧情（script.rpy / chapter1..6.rpy / interlude.rpy / definitions.rpy / autoplay.rpy 零改动），
##      PC-10..PC-16 的短案、纪念、复盘本与卷宗模块同样零改动（复盘本、卷宗与子栏只在运行期按名字读取本案数据）。
##   2. 「家政课烘焙赛的第二块蛋糕」（screen extras_bake_contest + 可重玩短案 label bake_cake_case）：
##      周五下午的高二家政课烘焙赛，八个小组各烤一只戚风蛋糕；16:00 值日生张子谦按冷藏柜的格子把蛋糕端上评审桌，
##      桌上却摆着九块——第六组的组号旗插着两块。家政课褚老师认定第六组从店里买了一块保底，要取消第六组的成绩。
##      六处勘查点（第二块蛋糕、冷藏柜第六格、3 号烤箱登记表、后门的蛋壳桶、走廊公告栏、第六组分工表），
##      推理链是「蛋糕四层」：手法 → 时机 → 来历 → 烘焙人。每层三选一、各配一种蛋糕层的颜色，选错只给温柔提示、
##      只计入本地 _bk_mistakes，绝不触碰主线 fail_count / 好感；结案按失误数评定金 / 银 / 铜牌并保存历史最佳纪录，
##      可无限重玩刷新纪录，持久化于 persistent.bake_cake_record。
##      真相完全写实（家政教室的蓝格烘焙纸与面包房的金色纸托、冷藏柜一格一组的规矩与掉落的便签、烤箱登记表上的第三炉与绿笔、
##      没有红戳的四个蛋壳与赤藓糖醇不上色、公告栏上「控糖，只看不尝」的客座评委），没有任何超自然要素。
##   3. 防剧透联动：墨墨在本案页边的续批、复盘本新增一页的页边续批，都严格经 truth_spoiler_unlocked() 零侧信道遮罩，
##      与复盘本、合照相册、案卷等共用同一个「解锁剧透 / 恢复遮罩」开关。
##   4. 入口只在「案卷」：主菜单不新增胶囊；复盘本扩为八页（只往 PC-13 的页目登记表里再追加一页）。
##   5. 本文件按文件名排在 zwembad_locker_casebook.rpy 之后初始化（最后一个顶层模块），双成就追加在 PC-16 之后，
##      成就页扩展为 2×20 = 40 枚。

# —— PC-17 烘焙赛 UI 图标命名别名（128x128 RGBA 透明底）——
image ui_icon_bake_contest = "images/ui/icon_bake_contest.png"
image ui_icon_second_cake  = "images/ui/icon_second_cake.png"
image ui_icon_oven_log     = "images/ui/icon_oven_log.png"
image ui_icon_rolling_pin  = "images/ui/icon_rolling_pin.png"

# —— PC-17 新登场的角色（暂无立绘：说话时舞台上的立绘自动恢复常亮，与警察、主持人等无立绘角色同一套规则）——
define chulao = Character("褚老师", color="#e0a890", who_outlines=[(1, "#000")])
define muzhen = Character("穆蓁蓁", color="#f2a0b4", who_outlines=[(1, "#000")])
define qiaosui = Character("乔穗", color="#e8cf8a", who_outlines=[(1, "#000")])
define yulao = Character("郁老师", color="#c8b4d8", who_outlines=[(1, "#000")])

init python:

    # 动态注册 PC-17 双成就，使鉴赏室成就页扩展为 2×20（共 40 枚）严整偶数列对称排布
    if "register_extra_achievement" in globals():
        register_extra_achievement(
            "ach_bake_cake",
            "第二块蛋糕的还原人",
            "还原烘焙赛上多出来那块蛋糕的真相。",
            False,
        )
        register_extra_achievement(
            "ach_golden_tray",
            "金烤盘的烘焙侦探",
            "零失误切完蛋糕四层，拿下金牌。",
            False,
        )

    ############################################################################
    ## 一、家政课烘焙赛的第二块蛋糕（1 桩可重玩短案 · 6 处勘查点 · 蛋糕四层 · 金银铜牌评级）
    ############################################################################

    BAKE_CASE = {
        "id": "bk1",
        "code": "BK-01",
        "label": "bake_cake_case",
        "title": "家政课烘焙赛的第二块蛋糕",
        "short_title": "第六组的第二块蛋糕",
        "time_tag": "周五 16:02 · 家政教室 · 高二烘焙赛",
        "companions": "艾丽丝 · 墨墨 · 小林 · 张子谦",
        "bg_key": "classroom",
        "bg_thumb": "images/bg_classroom.png",
        "lighting_note": "家政教室暖光 → 准备间冷灯 → 万事屋暖灯（classroom / storeroom / agency）",
        "spoiler": False,
        "summary_pub": (
            "周五下午，高二家政课的烘焙赛：八个小组各烤一只戚风蛋糕，放进冷藏柜对应的格子。"
            "16:00 值日生张子谦按格子把蛋糕端上评审桌，褚老师一数——九块。第六组的组号旗底下，并排插着两块。"
            "褚老师认定第六组从店里买了一块保底，要取消第六组的成绩；离客座评委 16:30 进场评审，只剩不到半小时。"
        ),
        "solution_pub": (
            "结案报告：第二块蛋糕不是买来的，也不是比赛作品。第六组负责烤箱计时的乔穗，用自己早上买的鸡蛋和赤藓糖醇，"
            "趁褚老师 15:00 去校门口接客座评委时，借 3 号烤箱的空档烤了一块控糖蛋糕，想等评审结束，"
            "送给因为控糖只看不尝的郁老师。她把蛋糕放进第六格、贴上便签；便签掉了，张子谦按格子把两盒都端上了桌。"
        ),
        "mo_note_pub": "墨墨现场手记：「多出来的那一块，是留给一个尝不了甜的人的。」",
        "alice_note_pub": "艾丽丝结案批注：「烘焙赛案告破！罚乔穗把控糖食谱抄一份贴在家政教室门口！」",
        "margin_secret": (
            "续批：墨墨在这一页的角上，画了一块切成四份的蛋糕，其中一份涂成了灰色。她写：四年前，小雪侦探和周可分蛋糕，"
            "总是切成四份；后来少了一个人，那一份就一直空着，谁也没有去吃。"
        ),
    }

    BAKE_MASK_NOTICE = "【防剧透火漆：墨墨在这一案页边的续批涉终章旧约，通关 TRUE END 或点击上方「解锁剧透」后显影】"

    BAKE_SPOTS = [
        {
            "id": "s1",
            "code": "CK-01",
            "label": "第二块蛋糕",
            "where": "家政教室 · 评审桌",
            "keeper": "褚老师",
            "scene": "classroom",
            "icon": "images/ui/icon_second_cake.png",
            "surface": "第六组的旗下插着两块蛋糕。多出来的那块只有六寸，颜色浅得发白，抹着薄薄一层奶油。",
            "detail": (
                "现场手记：街对面面包房的蛋糕，底下都垫着印店名的金色硬纸托；这一块底下垫的，却是家政教室自己的蓝格烘焙纸。"
                "蛋糕边几乎没上色，奶油上只摆了七颗蓝莓，正中插着一张手写的小卡片，写着一个「30」。"
            ),
            "evidence": "第二块蛋糕：六寸、颜色浅，垫着家政教室的蓝格烘焙纸，插着写「30」的小卡",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "s2",
            "code": "CK-02",
            "label": "冷藏柜第六格",
            "where": "准备间 · 双门冷藏柜",
            "keeper": "张子谦",
            "scene": "storeroom",
            "icon": "images/ui/icon_evidence_tag.png",
            "surface": "比赛规矩：一组一格，裱好的蛋糕 15:30 前放进自己组号的那一格。16:00 由值日生按格端上评审桌。",
            "detail": (
                "现场手记：张子谦说第六格里摆着两只蛋糕盒，他就都端了出去，一格插一面旗。第六格最里面的隔板缝里，"
                "掉着一张卷了边的便签，绿笔写着：「评审结束再端出来，请勿动。」没有署名。"
            ),
            "evidence": "第六格：放着两只蛋糕盒，隔板缝里掉着一张绿笔便签「评审结束再端出来」",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "s3",
            "code": "CK-03",
            "label": "3 号烤箱登记表",
            "where": "家政教室 · 烤箱墙",
            "keeper": "褚老师",
            "scene": "classroom",
            "icon": "images/ui/icon_oven_log.png",
            "surface": "四台烤箱、八个小组，两组共用一台。每烤一炉，都要在烤箱门边的登记表上写下时间和组号。",
            "detail": (
                "现场手记：3 号烤箱归第五、第六组。登记表上写着三炉：13:40 第五组、14:25 第六组，"
                "第三行是「15:08 · 30 分钟」，用绿笔写的，组号那一栏空着。前两行都是褚老师签的字。"
            ),
            "evidence": "3 号烤箱：第三炉 15:08 起烤 30 分钟，绿笔，没写组号也没有老师签字",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "s4",
            "code": "CK-04",
            "label": "后门的蛋壳桶",
            "where": "家政教室后门 · 厨余桶",
            "keeper": "小林",
            "scene": "corridor",
            "icon": "images/ui/icon_rolling_pin.png",
            "surface": "每组领一份原料：四个鸡蛋、八十克细砂糖。打下来的蛋壳全倒进后门的厨余桶。",
            "detail": (
                "现场手记：小林数了蛋壳，一共三十六个。学校发的蛋都盖着红色的日期戳，可有四个褐壳蛋没有红戳。"
                "桶底还压着一只空的赤藓糖醇袋子和一张超市小票：今早 07:20，土鸡蛋四枚、赤藓糖醇一袋。"
            ),
            "evidence": "蛋壳桶：三十六个蛋壳里四个没有红戳，另有空的赤藓糖醇袋和 07:20 的小票",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "s5",
            "code": "CK-05",
            "label": "走廊公告栏",
            "where": "家政教室门外 · 公告栏",
            "keeper": "小林",
            "scene": "corridor",
            "icon": "images/ui/icon_message_wall.png",
            "surface": "公告栏上贴着本届烘焙赛的评审须知，旁边钉着一张发黄的旧照片：第一届烘焙赛。",
            "detail": (
                "现场手记：须知写着「客座评委：郁老师（本赛发起人，已退休）——因控糖，只看不尝」，下面一行是"
                "「15:00 至 15:50 褚老师去校门口接评委，有事找课代表」。旧照片背面写着：三十年前，第一届。"
            ),
            "evidence": "公告栏：客座评委郁老师控糖只看不尝；褚老师 15:00 至 15:50 不在；今年第三十届",
            "observer": "墨墨（现场手记）",
        },
        {
            "id": "s6",
            "code": "CK-06",
            "label": "第六组分工表",
            "where": "家政教室 · 第六组料理台",
            "keeper": "穆蓁蓁",
            "scene": "classroom",
            "icon": "images/ui/icon_dossier_pin.png",
            "surface": "第六组的料理台上压着一张分工表：组长、打发、裱花、烤箱计时，四个人各签了名。",
            "detail": (
                "现场手记：组长穆蓁蓁用的是黑笔，另外两人也是黑笔；只有「烤箱计时」那一栏，乔穗的签名和她记下的"
                "「14:25 进炉、15:05 出炉」是绿笔写的。她的笔袋里只有一支笔，绿色的。"
            ),
            "evidence": "分工表：只有负责烤箱计时的乔穗用绿笔，记着 14:25 进炉、15:05 出炉",
            "observer": "墨墨（现场手记）",
        },
    ]

    _BAKE_SPOT_BY_ID = {s["id"]: s for s in BAKE_SPOTS}

    # 蛋糕四层：推理链每一层各配一种蛋糕层的颜色（胚底金黄 / 果酱莓红 / 奶油米白 / 裱花薄荷）
    BAKE_LAYERS = [
        {"name": "胚底", "color": "#e8b86a"},
        {"name": "果酱", "color": "#e8738a"},
        {"name": "奶油", "color": "#f3e6c8"},
        {"name": "裱花", "color": "#8fd0a0"},
    ]

    BAKE_LAYER_LINKS = [
        {
            "id": "k1",
            "step": "胚底层",
            "name": "手法",
            "layer": "胚底",
            "color": "#e8b86a",
            "short": "第六格多放的一盒被端上桌",
            "full": (
                "第二块蛋糕底下垫的是家政教室的蓝格烘焙纸，不是面包房的金色纸托——它就是在这间教室里烤出来的，不是买来掉包的。"
                "它被放进了冷藏柜第六格，绿笔便签掉进了隔板缝，张子谦按一格一组的规矩，把第六格的两盒都端上了桌。"
            ),
        },
        {
            "id": "k2",
            "step": "果酱层",
            "name": "时机",
            "layer": "果酱",
            "color": "#e8738a",
            "short": "15:08 老师不在时的第三炉",
            "full": (
                "3 号烤箱的登记表上写着第三炉：15:08 起烤 30 分钟，没有组号，也没有老师签字。公告栏写着，"
                "褚老师 15:00 至 15:50 去校门口接评委——第二块蛋糕，就是趁这段空档烤出来的。"
            ),
        },
        {
            "id": "k3",
            "step": "奶油层",
            "name": "来历",
            "layer": "奶油",
            "color": "#f3e6c8",
            "short": "给控糖评委的无糖蛋糕",
            "full": (
                "蛋壳桶里四个蛋壳没有红戳，不是学校发的蛋；桶底的赤藓糖醇袋子和小票说明，原料是有人自己带来的。"
                "赤藓糖醇烤不出焦色，所以蛋糕颜色浅。它是给公告栏上那位控糖、只看不尝的郁老师烤的。"
            ),
        },
        {
            "id": "k4",
            "step": "裱花层",
            "name": "烘焙人",
            "layer": "裱花",
            "color": "#8fd0a0",
            "short": "第六组计时员乔穗",
            "full": (
                "登记表的第三炉和第六格的便签，都是绿笔写的。第六组分工表上，只有负责烤箱计时的乔穗用绿笔，"
                "她记下的 15:05 出炉，正好让 3 号烤箱空了出来。第二块蛋糕，是乔穗烤的。"
            ),
        },
    ]

    BAKE_RATING_TIERS = [
        {"key": "gold",   "name": "金牌", "title": "烘焙名侦探", "rule": "零失误",         "max_mistakes": 0},
        {"key": "silver", "name": "银牌", "title": "裱花推理员", "rule": "失误 1～2 次",    "max_mistakes": 2},
        {"key": "bronze", "name": "铜牌", "title": "初学打发", "rule": "失误 3 次及以上", "max_mistakes": 999},
    ]

    _BAKE_TIER_BY_KEY = {t["key"]: t for t in BAKE_RATING_TIERS}
    _BAKE_TIER_RANK = {"gold": 3, "silver": 2, "bronze": 1}

    # 在证物簿里登记六处勘查点的翻面批注（与委托信箱、闭馆图书馆等各案同一套 register_evidence_detail 机制）
    if "register_evidence_detail" in globals():
        for _bks in BAKE_SPOTS:
            register_evidence_detail(_bks["evidence"], _bks["observer"], _bks["detail"])

    def bake_tier_def(tier_key):
        return _BAKE_TIER_BY_KEY.get(tier_key, BAKE_RATING_TIERS[-1])

    def bake_rate(mistakes_count=0):
        """按本局失误数评定评级：0 次金牌，1～2 次银牌，3 次及以上铜牌。"""
        m = max(0, int(mistakes_count or 0))
        for tier in BAKE_RATING_TIERS:
            if m <= tier["max_mistakes"]:
                return tier
        return BAKE_RATING_TIERS[-1]

    def bake_get_spot(spot_id):
        return _BAKE_SPOT_BY_ID.get(spot_id, BAKE_SPOTS[0])

    def _ensure_bake_store():
        if not isinstance(getattr(persistent, "bake_cake_record", None), dict):
            persistent.bake_cake_record = {}
        return persistent.bake_cake_record

    def bake_get_record():
        raw = getattr(persistent, "bake_cake_record", None)
        raw = raw if isinstance(raw, dict) else {}
        last_tier = raw.get("last_tier")
        return {
            "solved": bool(raw.get("solved", False)),
            "replays": save_int(raw.get("replays"), 0),
            "best_tier": casefile_best_key(raw),
            "last_tier": last_tier if isinstance(last_tier, str) and last_tier in _BAKE_TIER_RANK else None,
            "best_mistakes": save_int(raw.get("best_mistakes")),
            "last_mistakes": save_int(raw.get("last_mistakes")),
            "inspected": [s for s in (raw.get("inspected") or []) if s in _BAKE_SPOT_BY_ID],
            "report_viewed": bool(raw.get("report_viewed", False)),
        }

    def _bake_write(updates):
        store_dict = dict(_ensure_bake_store())
        store_dict.update(updates)
        persistent.bake_cake_record = store_dict
        return store_dict

    def bake_case_solved_count():
        return 1 if bake_get_record()["solved"] else 0

    def bake_gold_count():
        return 1 if bake_get_record()["best_tier"] == "gold" else 0

    def bake_best_short():
        """案卷与鉴赏页使用：历史最佳评级，未结案时显示「待结案」。"""
        rec = bake_get_record()
        return bake_tier_def(rec["best_tier"])["name"] if rec["best_tier"] else "待结案"

    def bake_select_spot(spot_id):
        sdef = bake_get_spot(spot_id)
        persistent.bake_selected_spot = sdef["id"]
        renpy.save_persistent()

    def bake_inspect_spot(spot_id):
        """剧场内勘查一处：证物入簿（可翻面），并把这一处记入鉴赏页档案；只写烘焙赛案自己的存档。"""
        sdef = _BAKE_SPOT_BY_ID.get(spot_id)
        if sdef is None:
            return False
        if "add_evidence" in globals():
            add_evidence(sdef["evidence"])
        seen = list(bake_get_record()["inspected"])
        if sdef["id"] not in seen:
            seen.append(sdef["id"])
        _bake_write({"inspected": seen})
        persistent.bake_selected_spot = sdef["id"]
        renpy.save_persistent()
        return True

    def bake_record_solve(mistakes_count=0):
        """记录一次结案：评定本局评级、刷新历史最佳（最高评级 + 最少失误）与累计结案次数。
        只写烘焙赛案自己的存档，绝不触碰主线 fail_count / 好感。本局零失误时追加金牌成就。"""
        m = max(0, int(mistakes_count or 0))
        tier = bake_rate(m)
        prev = bake_get_record()
        is_first = not prev["solved"]
        prev_rank = _BAKE_TIER_RANK.get(prev["best_tier"], 0)
        best_tier = tier["key"] if _BAKE_TIER_RANK[tier["key"]] >= prev_rank else prev["best_tier"]
        best_m = m if prev["best_mistakes"] is None else min(prev["best_mistakes"], m)
        new_record = (not is_first) and (prev["best_mistakes"] is None or m < prev["best_mistakes"])
        _bake_write({
            "solved": True,
            "replays": prev["replays"] + 1,
            "best_tier": best_tier,
            "last_tier": tier["key"],
            "best_mistakes": best_m,
            "last_mistakes": m,
            "inspected": [s["id"] for s in BAKE_SPOTS],
        })
        ach_grant("ach_bake_cake")
        if tier["key"] == "gold":
            ach_grant("ach_golden_tray")
        renpy.save_persistent()
        result = bake_get_record()
        result["is_first"] = is_first
        result["new_record"] = new_record
        return result

    def bake_open_report_modal():
        if bake_get_record()["solved"]:
            _bake_write({"report_viewed": True})
            renpy.save_persistent()
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("bake_report_modal")

    def bake_spoiler_unlocked():
        return bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False

    def bake_render_view():
        """渲染烘焙赛卷宗：结案前只公开案情与勘查点外观，结案后显影蛋糕四层、结案报告与双人手记；
        墨墨涉终章的页边续批只在 truth_spoiler_unlocked() 为真且已结案时出现，遮罩状态下的返回值与续批文本完全无关（零侧信道）。"""
        rec = bake_get_record()
        solved = rec["solved"]
        best = bake_tier_def(rec["best_tier"]) if rec["best_tier"] else None
        unlocked = bake_spoiler_unlocked()
        if best:
            best_line = "%s「%s」 · 最少失误 %d 次" % (best["name"], best["title"], rec["best_mistakes"] or 0)
        else:
            best_line = "尚未结案"
        return {
            "code": BAKE_CASE["code"],
            "title": BAKE_CASE["title"],
            "short_title": BAKE_CASE["short_title"],
            "time_tag": BAKE_CASE["time_tag"],
            "summary": BAKE_CASE["summary_pub"],
            "solved": solved,
            "replays": rec["replays"],
            "best_tier": rec["best_tier"],
            "best_name": best["name"] if best else "待结案",
            "best_line": best_line,
            "inspected_count": len(rec["inspected"]),
            "layer_shorts": [(k["short"] if solved else "") for k in BAKE_LAYER_LINKS],
            "layer_fulls": [(k["full"] if solved else "") for k in BAKE_LAYER_LINKS],
            "display_solution": BAKE_CASE["solution_pub"] if solved else "",
            "display_mo_note": BAKE_CASE["mo_note_pub"] if solved else "",
            "display_alice_note": BAKE_CASE["alice_note_pub"] if solved else "",
            "unlocked": unlocked,
            "display_secret": BAKE_CASE["margin_secret"] if (solved and unlocked) else "",
            "display_masked_notice": BAKE_MASK_NOTICE if not unlocked else "",
        }

    def bake_launch_action():
        return [
            Function(stop_all_gramophone_ambience, True),
            SetField(persistent, "extras_tab", "bake"),
            Replay(BAKE_CASE["label"], scope={"player_name": persistent.last_player_name or "陈默"}, locked=False),
        ]

    ############################################################################
    ## 二、推理笔记复盘本再扩容（7 页 → 8 页：追加家政课烘焙赛一页）
    ############################################################################

    # 与 PC-13 / PC-15 / PC-16 的页目同一格式：只登记「去哪里读」，卷宗、勘查点、推理链、评级与存档字段都在运行期按名字读取；
    # 页边的复盘要点、墨墨批注与续批是复盘本自己新写的文字。
    CASEBOOK_BAKE_PAGE = {
        "key": "bake", "tab": "bake", "index_label": "家政课烘焙赛", "unit": "蛋糕四层", "ink": "#e0809a",
        "case_var": "BAKE_CASE", "hotspots_var": "BAKE_SPOTS", "links_var": "BAKE_LAYER_LINKS",
        "tiers_var": "BAKE_RATING_TIERS", "store": "bake_cake_record",
        "lesson": "复盘要点：先数清楚，再问为什么多。多出来的那一份，往往不是来抢位置的，而是替某个人留的位置。",
        "mo_margin": "墨墨批注：替别人烤的蛋糕，要当面递过去，才不会被当成多余的那一块。",
        "margin_secret": (
            "续批：抄完这一页，墨墨在两块蛋糕之间画了一条细线。她说，周可以前也会多烤一块，留给吃不了甜的人；"
            "小雪侦探那时候总守在烤箱旁边，等着尝第一口。"
        ),
    }

    # 追加进 PC-13 的页目登记表（只在运行期合并一次；PC-13 的四页、PC-15 的两页与 PC-16 的一页顺序、内容原样保留）
    if "NOTEBOOK_CASES" in globals():
        if not any(n["key"] == CASEBOOK_BAKE_PAGE["key"] for n in NOTEBOOK_CASES):
            NOTEBOOK_CASES.append(CASEBOOK_BAKE_PAGE)
        _NOTEBOOK_BY_KEY = {n["key"]: n for n in NOTEBOOK_CASES}


################################################################################
## 三、鉴赏分页界面：家政课烘焙赛的第二块蛋糕（screen extras_bake_contest）
################################################################################

transform bake_steam:
    subpixel True
    block:
        ease 1.6 alpha 0.65 yoffset -2
        ease 1.6 alpha 1.0 yoffset 0
        repeat

screen extras_bake_contest():
    $ _kv = bake_render_view()
    $ _krec = bake_get_record()
    $ _ksid = persistent.bake_selected_spot or "s1"
    $ _ks = bake_get_spot(_ksid)
    $ _ks_seen = (_ks["id"] in _krec["inspected"])

    vbox:
        spacing 9

        ## 1. 烘焙赛总览横幅（奶油米白 · 草莓莓红）
        frame:
            style "bake_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_bake_contest.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("家政课烘焙赛的第二块蛋糕") font gui.name_text_font size 19 color "#fff4e6"
                        if _kv["solved"]:
                            text _("已结案 · 蛋糕四层已全部切开 · 可随时重回家政教室冲击金牌") size 12 color "#9fe3b0"
                        else:
                            text _("评审桌上多出一块蛋糕，插着第六组的旗 · 它是谁烤的") size 12 color "#f0d6bc"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_second_cake.png" xysize (14, 14) yalign 0.5
                            text ("最佳 %s" % _kv["best_name"]) size 12 color "#f4d98a" yalign 0.5 substitute False
                    frame:
                        style "mailbox_stat_chip"
                        text ("结案 %d 次" % _kv["replays"]) size 12 color "#f6dccb" align (0.5, 0.5) substitute False

        ## 2. 卷宗详情：家政教室缩略图（底部四层蛋糕色带，结案后点亮）、案情、六处勘查点、蛋糕四层、评级与页边续批
        frame:
            style "bake_console_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add BAKE_CASE["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add Solid("#2a1610b0") xysize (180, 96) align (0.5, 0.5)
                        add "images/ui/icon_bake_contest.png" xysize (24, 24) xalign 0.05 yalign 0.08
                        if _kv["solved"]:
                            add "images/ui/icon_second_cake.png" xysize (26, 26) xalign 0.96 yalign 0.08 at bake_steam
                        vbox:
                            spacing 1
                            xalign 0.5
                            yalign 0.97
                            add Solid("#fbeee0") xysize (178, 1)
                            hbox:
                                spacing 6
                                for _bi, _bly in enumerate(BAKE_LAYERS):
                                    add Solid(_bly["color"] if _kv["solved"] else "#4a3328") xysize (40, 5)
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text BAKE_CASE["code"] size 12 color "#ffffff" bold True align (0.5, 0.5) substitute False
                            text ("《%s》" % BAKE_CASE["short_title"]) font gui.name_text_font size 17 color "#fff4e6" yalign 0.5 substitute False
                        text ("%s  ·  %s" % (BAKE_CASE["time_tag"], BAKE_CASE["companions"])) size 12 color "#ecd2bc" substitute False
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (15, 15) yalign 0.5
                            text ("光影：%s" % BAKE_CASE["lighting_note"]) size 12 color "#c9ab94" yalign 0.5 substitute False
                        if _kv["solved"]:
                            text ("结案档案：%s（已结案 %d 次 · 勘查点全查完）" % (_kv["best_line"], _kv["replays"])) size 12 color "#f4d98a" substitute False
                        else:
                            text ("结案档案：尚未结案（已勘查 %d/6 处，可先翻看下方勘查点，再回到家政教室）" % _kv["inspected_count"]) size 12 color "#c9ab94" substitute False

                text BAKE_CASE["summary_pub"] size 13 color "#fdf3ea" line_spacing 3 substitute False

                ## 2A. 六处勘查点（3 × 226 + 2 × 8 = 694px 精确贴合内宽，两行）
                text _("勘查点 · 点击翻看六处线索（亲自查过的，会显影现场手记）：") size 12 color "#f2c4a8" bold True
                grid 3 2:
                    spacing 8
                    for k_obj in BAKE_SPOTS:
                        $ _k_seen = (k_obj["id"] in _krec["inspected"])
                        $ _k_active = (k_obj["id"] == _ks["id"])
                        button:
                            style "bake_spot_card"
                            selected _k_active
                            action Function(bake_select_spot, k_obj["id"])
                            vbox:
                                spacing 2
                                xfill True
                                hbox:
                                    xfill True
                                    yalign 0.5
                                    text ("%s · %s" % (k_obj["code"], k_obj["label"])) size 11 color ("#f2b8c6" if _k_active else "#f6e8dc") bold True yalign 0.5 substitute False
                                    text (_("已勘查") if _k_seen else _("待勘查")) size 10 color ("#9fe3b0" if _k_seen else "#c9ab94") xalign 1.0 yalign 0.5
                                text ("位置 %s" % k_obj["where"]) size 10 color "#d6b8a0" substitute False
                                text k_obj["surface"] size 11 color "#f4e4d6" line_spacing 2 substitute False

                frame:
                    xfill True
                    padding (10, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        spacing 8
                        add _ks["icon"] xysize (20, 20)
                        vbox:
                            spacing 2
                            text ("%s · %s（经手：%s）" % (_ks["code"], _ks["label"], _ks["keeper"])) size 12 color "#f2b8c6" bold True substitute False
                            if _ks_seen:
                                text _ks["detail"] size 12 color "#fdf3ea" line_spacing 2 substitute False
                            else:
                                text _("还没有亲自勘查这一处。回到家政教室查过之后，现场手记会显影在这里。") size 12 color "#c9ab94"

                ## 2B. 蛋糕四层（4 × 167 + 3 × 8 = 692px <= 694px；每层一种蛋糕层的颜色）
                text _("蛋糕四层 · 复盘（手法 → 时机 → 来历 → 烘焙人，结案后显影）：") size 12 color "#f2c4a8" bold True
                hbox:
                    spacing 8
                    for _ki, l_obj in enumerate(BAKE_LAYER_LINKS):
                        frame:
                            style "bake_layer_slot"
                            vbox:
                                spacing 2
                                add Solid(l_obj["color"]) xysize (151, 3)
                                text ("%s · %s" % (l_obj["step"], l_obj["name"])) size 11 color ("#9fe3b0" if _kv["solved"] else "#ecd2bc") bold True substitute False
                                text (_kv["layer_shorts"][_ki] if _kv["solved"] else _("？ 待切开")) size 12 color ("#fdf3ea" if _kv["solved"] else "#a88a76") substitute False

                ## 2C. 评级与结案报告预览匣
                frame:
                    style "bake_rating_card"
                    vbox:
                        spacing 5
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_second_cake.png" xysize (16, 16) yalign 0.5
                                text _("评级 · 重玩挑战") font gui.name_text_font size 13 color "#fdf3ea" yalign 0.5
                            text ("历史最佳：%s" % _kv["best_line"]) size 11 color "#f4d98a" xalign 1.0 yalign 0.5 substitute False
                        hbox:
                            spacing 8
                            for w_obj in BAKE_RATING_TIERS:
                                frame:
                                    style "bake_tier_chip"
                                    hbox:
                                        xfill True
                                        yalign 0.5
                                        text ("%s「%s」" % (w_obj["name"], w_obj["title"])) size 12 color ("#f4d98a" if _kv["best_tier"] == w_obj["key"] else "#f6e8dc") yalign 0.5 substitute False
                                        text w_obj["rule"] size 11 color "#d6b8a0" xalign 1.0 yalign 0.5 substitute False
                        if _kv["solved"]:
                            add Solid("#f2c4a833") ysize 1
                            text _kv["display_solution"] size 12 color "#9fe3b0" line_spacing 2 substitute False
                            text _kv["display_mo_note"] size 12 color "#cfa6f0" substitute False
                            text _kv["display_alice_note"] size 12 color "#f0c060" substitute False
                        else:
                            text _("结案报告：切完蛋糕四层之后，墨墨会把推理链和完整的结案报告写在这里。") size 12 color "#c9ab94"

                ## 2D. 墨墨的页边续批（防剧透火漆：与复盘本等共用 truth_spoiler_unlocked() 开关）
                frame:
                    style "bake_margin_box"
                    vbox:
                        spacing 4
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_margin_quill_note.png" xysize (16, 16) yalign 0.5
                                text _("墨墨的页边续批 · 防剧透火漆") size 12 color "#e8c88a" bold True yalign 0.5
                            if not persistent.te_cleared:
                                if persistent.truth_spoiler_confirmed:
                                    textbutton _("恢复遮罩"):
                                        style "gramophone_mini_pill"
                                        xalign 1.0
                                        yalign 0.5
                                        action [SetField(persistent, "truth_spoiler_confirmed", False), Function(renpy.save_persistent)]
                                else:
                                    textbutton _("解锁剧透"):
                                        style "gramophone_mini_pill"
                                        xalign 1.0
                                        yalign 0.5
                                        action Show("confirm",
                                                    message=_("尚未通关 TRUE END，确定提前揭晓墨墨在「家政课烘焙赛」页边涉终章旧约的续批吗？"),
                                                    yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                                    no_action=Hide("confirm"))
                        if _kv["display_secret"]:
                            text _kv["display_secret"] size 12 color "#f4d98a" line_spacing 2 substitute False
                        elif _kv["unlocked"]:
                            text _("剧透许可已开启 · 切完蛋糕四层结案之后，墨墨的续批会显影在这里。") size 12 color "#c9ab94"
                        if _kv["display_masked_notice"]:
                            text _kv["display_masked_notice"] size 11 color "#f0a4b8" substitute False

                ## 2E. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("零失误切完蛋糕四层可获金牌 · 已结案 %d 次" % _kv["replays"]) size 12 color "#d6b8a0" yalign 0.5 substitute False
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton _("展阅结案报告"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(bake_open_report_modal)
                        textbutton (_("重回家政教室") if _kv["solved"] else _("走进家政教室")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action bake_launch_action()

        ## 3. 复盘本直达条（再扩容后的复盘本收录本案；点开直接翻到这一页）
        frame:
            style "mailbox_quick_row"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_case_notebook.png" xysize (20, 20) yalign 0.5
                    text _("推理笔记复盘本 · 扩容收录本案") font gui.name_text_font size 14 color "#fff3dc" yalign 0.5
                    text ("（已盖复盘章 %d/%d）" % (notebook_stamped_count(), len(NOTEBOOK_CASES))) size 12 color "#f4d98a" yalign 0.5 substitute False
                textbutton _("翻开复盘本"):
                    style "gramophone_mini_pill"
                    xalign 1.0
                    yalign 0.5
                    action [SetField(persistent, "notebook_selected_case", "bake"), SetField(persistent, "extras_tab", "notebook")]


## 烘焙赛结案报告独立展阅弹窗
screen bake_report_modal():
    modal True
    zorder 215
    $ _rv = bake_render_view()

    add "#1a0e0add"
    key "K_ESCAPE" action Hide("bake_report_modal")
    key "K_RETURN" action Hide("bake_report_modal")
    key "K_SPACE" action Hide("bake_report_modal")

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
                    add "images/ui/icon_bake_contest.png" xysize (40, 40) yalign 0.5
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_rv["code"], _rv["short_title"])) font gui.name_text_font size 20 color "#fff4e6" substitute False
                        text _rv["time_tag"] size 12 color "#ecd2bc" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_second_cake.png" xysize (30, 30) yalign 0.5 at bake_steam
                    text _rv["best_name"] size 13 color "#f4d98a" bold True yalign 0.5 substitute False

            hbox:
                spacing 0
                for _rly in BAKE_LAYERS:
                    add Solid(_rly["color"]) xysize (173, 3)

            viewport:
                xfill True
                ysize 336
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    text _("案情：") size 12 color "#f2c4a8" bold True
                    text _rv["summary"] size 13 color "#fdf3ea" line_spacing 4 substitute False
                    add Solid("#ecd2bc33") ysize 1
                    if _rv["solved"]:
                        text _("蛋糕四层：") size 12 color "#f2c4a8" bold True
                        for _ri, r_obj in enumerate(BAKE_LAYER_LINKS):
                            hbox:
                                spacing 8
                                add Solid(r_obj["color"]) xysize (6, 18) yalign 0.0
                                text ("%s · %s（%s）：%s" % (r_obj["step"], r_obj["name"], r_obj["layer"], _rv["layer_fulls"][_ri])) size 13 color "#f6e8dc" line_spacing 3 xsize 658 substitute False
                        add Solid("#f2c4a833") ysize 1
                        text _rv["display_solution"] size 13 color "#9fe3b0" line_spacing 4 substitute False
                        text _rv["display_mo_note"] size 13 color "#cfa6f0" line_spacing 4 substitute False
                        text _rv["display_alice_note"] size 13 color "#f0c060" line_spacing 4 substitute False
                        if _rv["display_secret"]:
                            add Solid("#f4d98a33") ysize 1
                            text _rv["display_secret"] size 13 color "#f4d98a" line_spacing 4 substitute False
                    else:
                        text _("这桩案子还没有结案。回到家政教室、查完六处线索并切完蛋糕四层后，完整的结案报告会显影在这里。") size 13 color "#d6b8a0" line_spacing 4
                    if _rv["display_masked_notice"]:
                        text _rv["display_masked_notice"] size 12 color "#f0a4b8" substitute False

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上结案报告") size 12 color "#d6b8a0" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 10
                    textbutton _("重回家政教室"):
                        style "gramophone_mini_pill"
                        yalign 0.5
                        action [Hide("bake_report_modal")] + bake_launch_action()
                    textbutton _("合上报告"):
                        style "pill_button"
                        xminimum 116
                        ysize 34
                        text_size 14
                        action Hide("bake_report_modal")


## 家政教室剧场内顶部「蛋糕四层」横幅（位于右上角证物 HUD 下方，互不遮挡；已切开的一层亮起各自的颜色）
screen bake_layer_banner(layers_done, prompt_line):
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
                add "images/ui/icon_rolling_pin.png" xysize (22, 22) yalign 0.5
                text _("家政教室 · 蛋糕四层") size 12 color "#f2c4a8" bold True yalign 0.5
                text ("已切开 %d/%d · 失误只计入本案评级，不影响主线" % (layers_done, len(BAKE_LAYER_LINKS))) size 11 color "#ecd2bc" yalign 0.5
            hbox:
                spacing 6
                for _bi, b_obj in enumerate(BAKE_LAYER_LINKS):
                    frame:
                        style "bake_banner_slot"
                        vbox:
                            spacing 0
                            add Solid(b_obj["color"] if _bi <= layers_done else "#4a3328") xysize (160, 3)
                            text ("%s · %s" % (b_obj["step"], b_obj["name"])) size 10 color ("#9fe3b0" if _bi < layers_done else ("#f2b8c6" if _bi == layers_done else "#c9ab94")) bold True substitute False
                            text (b_obj["short"] if _bi < layers_done else _("？")) size 11 color ("#fdf3ea" if _bi < layers_done else "#a88a76") substitute False
            text prompt_line size 14 color "#fdf3ea" substitute False


## 烘焙赛结案结算卡：本局评级 + 历史最佳纪录 + 重玩挑战提示
screen bake_result_card(cur_tier, best_tier, mistakes, best_mistakes, replays, new_record=False, is_first=True):
    modal True
    zorder 220
    $ _ccur = bake_tier_def(cur_tier)
    $ _cbest = bake_tier_def(best_tier)
    $ _cv = bake_render_view()
    $ _c_gold = (cur_tier == "gold")

    add "#1a0e0add"
    key "K_RETURN" action Return("back_to_bake")
    key "K_SPACE" action Return("back_to_bake")
    key "K_ESCAPE" action Return("back_to_bake")

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
                add "images/ui/icon_second_cake.png" xysize (54, 54) yalign 0.5 at bake_steam
                vbox:
                    spacing 3
                    yalign 0.5
                    text ("烘焙赛结案 · %s" % BAKE_CASE["code"]) size 13 color "#f2c4a8" bold True substitute False
                    text ("《%s》" % BAKE_CASE["short_title"]) font gui.name_text_font size 21 color "#fff4e6" substitute False
                    text ("本局评级：【%s · %s】" % (_ccur["name"], _ccur["title"])) size 14 color ("#f4d98a" if _c_gold else "#9fe3b0") substitute False

            hbox:
                spacing 0
                xalign 0.5
                for _cly in BAKE_LAYERS:
                    add Solid(_cly["color"]) xysize (152, 3)

            frame:
                xfill True
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 4
                    text _cv["display_mo_note"] size 13 color "#cfa6f0" substitute False
                    text _cv["display_alice_note"] size 13 color "#f0c060" substitute False
                    text ("本局失误 %d 次（只计入本案评级，不影响主线）" % mistakes) size 12 color "#ecd2bc"
                    text ("历史最佳：%s「%s」 · 最少失误 %d 次 · 累计结案 %d 次" % (_cbest["name"], _cbest["title"], best_mistakes, replays)) size 12 color "#ecd2bc" substitute False
                    if is_first:
                        text _("首次结案 · 蛋糕四层已写入鉴赏室「家政课烘焙赛」分页，复盘本扩容到了八页") size 12 color "#9fe3b0"
                    elif new_record:
                        text _("重玩挑战 · 刷新个人纪录！这一次的四层比以往任何一次都切得更齐") size 12 color "#f4d98a"
                    elif _c_gold:
                        text _("重玩挑战 · 再次拿下金牌，烘焙名侦探实至名归") size 12 color "#f4d98a"
                    else:
                        text _("重玩挑战 · 零失误切完蛋糕四层，就能拿下金牌") size 12 color "#ecd2bc"

            textbutton _("收好组号旗并返回鉴赏室"):
                style "pill_button"
                xalign 0.5
                xminimum 248
                ysize 38
                text_size 15
                action Return("back_to_bake")


################################################################################
## 四、样式定义（PC-17 奶油米白与草莓莓红）
################################################################################

style bake_header_card is default:
    xfill True
    padding (14, 10)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#e8c4a8") * SaturationMatrix(0.0))

style bake_console_card is default:
    xfill True
    padding (14, 11)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#f0dcc8") * SaturationMatrix(0.0))

style bake_rating_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style bake_spot_card is button:
    xsize 226
    yminimum 88
    padding (8, 6)
    background Frame("gui/hud_chip.png", 12, 12)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style bake_layer_slot is default:
    xsize 167
    ysize 58
    padding (8, 5)
    background Frame("gui/hud_chip.png", 12, 12)

style bake_banner_slot is default:
    xsize 176
    ysize 44
    padding (8, 4)
    background Frame("gui/panel_card.png", 16, 16)

style bake_tier_chip is default:
    xsize 218
    ysize 30
    padding (8, 0)
    background Frame("gui/panel_card.png", 16, 16)

style bake_margin_box is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)


################################################################################
## 五、家政教室独立沙盒初始化与结案出口（零侵入主线好感/失误/存档）
################################################################################

label _bake_init_sandbox(session_save_title):
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

label _bake_finish_case(local_mistakes=0):
    $ _bk_final_mistakes = max(0, int(local_mistakes or 0))
    $ _bk_rec = bake_record_solve(_bk_final_mistakes)
    hide screen bake_layer_banner
    hide screen evidence_book
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen bake_result_card(_bk_rec["last_tier"], _bk_rec["best_tier"], _bk_final_mistakes, _bk_rec["best_mistakes"], _bk_rec["replays"], _bk_rec["new_record"], _bk_rec["is_first"])
    $ persistent.extras_tab = "bake"
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 六、家政课烘焙赛 BK-01：《第六组的第二块蛋糕》
################################################################################

label bake_cake_case:
    call _bake_init_sandbox("家政课烘焙赛 · BK-01 第六组的第二块蛋糕") from _call__bake_init_sandbox
    $ _bk_mistakes = 0
    $ _bk_layers = 0
    $ _bk_s1 = False
    $ _bk_s2 = False
    $ _bk_s3 = False
    $ _bk_s4 = False
    $ _bk_s5 = False
    $ _bk_s6 = False
    $ _bk_replays = bake_get_record()["replays"]
    $ _bk_best_text = bake_render_view()["best_line"]

    scene bg black with fade
    $ play_bgm(bgm_daily, fadein=1.5)
    centered "{size=+6}家政课烘焙赛 · BAKE-OFF BK-01{/size}\n\n{size=+14}第六组的第二块蛋糕{/size}\n\n{color=#e8cf8a}周五 16:02 · 家政教室 · 高二烘焙赛{/color}"

    scene bg classroom at bg_kenburns_in
    $ set_ambient("warm")
    show screen evidence_book
    with dissolve

    play sound se_footstep
    "周五下午，家政教室里满是黄油和烤蛋糕的香味。窗台上一排小风扇呼呼地转着，八张料理台擦得锃亮。"
    "高二的家政课每年秋天办一场烘焙赛，今年轮到第三十届。学生会派小林来拍照记录，张子谦是今天的值日生；艾丽丝说万事屋理应来捧场，其实是冲着评审完分蛋糕来的。"
    "比赛的规矩很简单：八个小组，每组领一份原料，烤一只八寸戚风蛋糕，裱好奶油，15:30 之前放进冷藏柜里自己组号的那一格。"
    "16:00，由值日生按格子把蛋糕端上评审桌，插上组号旗。16:30，客座评委进场。"
    "墨墨在本子上画了一张长桌，桌上画着八个小圆圈。"
    "四点整，张子谦一盒一盒地把蛋糕端出来。四点零二分，家政课的褚老师站在评审桌前，数了两遍。"
    show alice shock at left
    show mo think at right
    chulao "九块。"
    "桌上摆着九块蛋糕。第六组的组号旗底下，并排插着两块：一块是八寸的草莓戚风，另一块只有六寸，颜色浅得发白，抹着薄薄一层奶油。"
    chulao "第六组。谁让你们交两块的？"
    muzhen "我们没有！褚老师，我们组只烤了一块，就是那块草莓的！"
    "说话的是第六组的组长穆蓁蓁。她扎着高马尾，围裙上还沾着奶油。她身后站着第六组的另外三个人，其中一个短头发的女生低着头，攥着一支绿色的笔，一句话也没说。"
    chulao "一块是你们烤的，那另一块是哪来的？街对面面包房的六寸蛋糕，一块八十八，谁不知道。"
    chulao "比赛前我说过多少遍：只能用学校发的原料，只能在这间教室里烤。今年得第一的组，要代表学校去参加市里的比赛。"
    chulao "买一块来保底，再挑好看的那块交——第六组的成绩，取消。"
    muzhen "褚老师！"
    chulao "查不清楚，这一届烘焙赛的成绩全部作废。郁老师 16:30 就要进来评审，我不能让她看见这种事。"
    "教室里一下子安静了。只有窗台上的风扇还在转。"
    play sound se_write
    mo_note "八个圆圈。桌上却有九块。多出来的那一块，一定是替谁留的。"
    show alice smile at left
    alice "褚老师，先别急着作废！离评审还有不到半小时——这单万事屋接了！本社长倒要看看，第九块蛋糕是从哪儿冒出来的！"
    chulao "……就半小时。评审桌、冷藏柜、烤箱，你们随便看。郁老师进门之前，我要一个说法。"

label bake_case_investigate:
    if _bk_s1 and _bk_s2 and _bk_s3 and _bk_s4 and _bk_s5 and _bk_s6:
        jump bake_case_review_intro

    menu:
        "离客座评委进场还有不到半小时。六处可疑的地方，先查哪一处？（可随时点击右上角【证据】翻面查看批注）"

        "仔细看看评审桌上那块多出来的蛋糕" if not _bk_s1:
            $ _bk_s1 = True
            scene bg classroom
            $ set_ambient("warm")
            show alice think at left
            show mo think at right
            with dissolve
            "我弯下腰，凑近那块六寸的蛋糕。蛋糕边几乎没有上色，只有浅浅的一圈米黄，奶油抹得很薄，上面摆着七颗蓝莓。"
            "正中插着一张折成小旗子的卡片，上面用笔写了一个「30」。"
            alice "面包房的蛋糕，奶油都抹得跟镜子一样亮。这一块……抹得好朴素啊。"
            mc "看底下。"
            "我轻轻托起蛋糕盒。蛋糕底下垫着一张烘焙纸，纸上印着一格一格的浅蓝色方格。"
            show alice shock at left
            alice "蓝格子——这不是家政教室发的烘焙纸吗？八个组用的都是这种。"
            mc "街对面面包房的蛋糕，底下都垫着印店名的金色硬纸托。这块蛋糕，是在这间教室里烤出来的。"
            "蛋糕的颜色也很奇怪。旁边第六组那块草莓戚风，外皮烤成了漂亮的金棕色；这一块却浅得发白，像是没烤熟——可用竹签一戳，里面是熟透的。"
            play sound se_write
            mo_note "它不是买来的。它是在这间屋子里，被人一点一点烤出来的。"
            $ bake_inspect_spot("s1")
            jump bake_case_investigate

        "去准备间，看看冷藏柜的第六格" if not _bk_s2:
            $ _bk_s2 = True
            scene bg storeroom
            $ set_ambient("cool")
            show alice think at left
            show zhang neutral at center
            show mo think at right
            with dissolve
            "家政教室隔壁的准备间里，立着一台双门冷藏柜，每一格的隔板边上都贴着组号：一、二、三……八。"
            zhang "比赛的规矩是一组一格。我三点五十五才从篮球场赶回来值日，四点整，按褚老师说的，一格一格往外端，端一盒插一面旗。"
            alice "那第六格呢？"
            zhang "第六格里摆着两只蛋糕盒，一大一小，挨在一起。我想着同一格的就是同一组的，就都端出去了，插的都是第六组的旗。"
            zhang "……我是不是闯祸了？"
            "我拉开冷藏柜的门。第六格已经空了，冷气扑在脸上。墨墨蹲下身，伸手往隔板最里面的缝里摸了摸。"
            play sound se_page
            "她摸出来一张卷了边的便签，背面的胶已经被冷气冻得不黏了。上面用绿笔写着一行字："
            "「评审结束再端出来，请勿动。」"
            show alice shock at left
            alice "没有署名！可这张便签，本来是贴在那只小蛋糕盒上的吧？"
            zhang "我端盒子的时候，什么都没看见……大概是开门的时候，掉进缝里了。"
            play sound se_write
            mo_note "有人想让它在柜子里多等一会儿。是便签先松了手。"
            $ bake_inspect_spot("s2")
            jump bake_case_investigate

        "去烤箱墙，翻一翻 3 号烤箱的登记表" if not _bk_s3:
            $ _bk_s3 = True
            scene bg classroom
            $ set_ambient("warm")
            show alice think at left
            show mo think at right
            with dissolve
            "家政教室的后墙嵌着四台烤箱，八个组两组共用一台。每台烤箱门边都挂着一块小夹板，夹着登记表。"
            chulao "每烤一炉，都要写进炉时间、烤多久、哪一组，我在旁边签字。烤箱是比赛最要紧的东西，谁也不许乱用。"
            "3 号烤箱归第五组和第六组。登记表上，一共写着三行。"
            "「13:40 · 40 分钟 · 第五组」，后面是褚老师的签字。"
            "「14:25 · 40 分钟 · 第六组」，后面也是褚老师的签字。"
            "第三行写着「15:08 · 30 分钟」。组号那一栏空着，签字那一栏也空着。这一行，是用绿笔写的。"
            show alice shock at left
            alice "第三炉！可是每组只能烤一炉呀——第五组、第六组都已经烤过了。"
            chulao "……我没签过这一行。15:08 的时候，我不在教室里。"
            mc "那时候您在哪儿？"
            chulao "去校门口接郁老师了。她坐的车晚了，我在门口等了快一个钟头。"
            play sound se_write
            mo_note "老师签了两行字。第三行，是有人自己写上去的——写得很老实，只是没写名字。"
            $ bake_inspect_spot("s3")
            jump bake_case_investigate

        "跟着小林去后门，数一数厨余桶里的蛋壳" if not _bk_s4:
            $ _bk_s4 = True
            scene bg corridor
            $ set_ambient("warm")
            show alice think at left
            show lin neutral at center
            show mo think at right
            with dissolve
            "家政教室的后门外，摆着一只蓝色的厨余桶。小林已经戴好一次性手套，蹲在桶边。"
            lin "每组领的原料是固定的：四个鸡蛋、八十克细砂糖、七十克低筋面粉。我想，要是有人多烤了一块，蛋壳就会多。"
            lin "打下来的蛋壳，全都倒在这只桶里。我数过了，一共三十六个。"
            alice "八个组、每组四个，是三十二个……多了四个！"
            play sound se_page
            lin "学校发的蛋，壳上都盖着红色的日期戳。三十二个都有。剩下四个是褐色的壳，没有红戳。"
            "小林从桶底拎出两样东西：一只撕开的空袋子，上面印着「赤藓糖醇」；还有一张揉皱的超市小票。"
            lin "小票是今天早上 07:20 的。土鸡蛋四枚，赤藓糖醇一袋。"
            mc "有人从家里带了鸡蛋和代糖来。"
            show alice shock at left
            alice "赤藓糖醇？那是什么？"
            lin "一种代糖。甜，但是不升血糖。我外公在家就用这个。"
            mc "代糖烤不出焦色。这就是那块蛋糕颜色那么浅的原因。"
            play sound se_write
            mo_note "没有红戳的四个蛋，不是比赛的蛋。有人自己掏钱，烤了一块不甜的蛋糕。"
            $ bake_inspect_spot("s4")
            jump bake_case_investigate

        "去家政教室门外，看看走廊公告栏" if not _bk_s5:
            $ _bk_s5 = True
            scene bg corridor
            $ set_ambient("warm")
            show alice smile at left
            show lin neutral at center
            show mo think at right
            with dissolve
            "家政教室门外的走廊上，挂着一块软木公告栏。正中贴着本届烘焙赛的评审须知，是褚老师的字。"
            "「第三十届家政课烘焙赛 · 评审：褚老师；客座评委：郁老师（本赛发起人，已退休）——因控糖，只看不尝。」"
            "下面另起一行：「15:00 至 15:50 褚老师去校门口接评委，有事找课代表。」"
            alice "只看不尝……评委不吃蛋糕？"
            lin "郁老师身体不好，医生让她控糖。听说她每年都来，看完就走，一口都不尝。"
            "公告栏的角落里，钉着一张发黄的旧照片。照片上，一个年轻的女老师站在一张长桌后面，桌上摆着几块歪歪扭扭的蛋糕，旁边围着一群穿旧式校服的学生。"
            "我把照片翻过来，背面用钢笔写着：「第一届家政课烘焙赛，三十年前。」"
            show alice shock at left
            alice "三十年前——今年正好是第三十届！"
            mc "那块蛋糕上的小卡片，写的就是「30」。"
            play sound se_write
            mo_note "办了三十年的比赛，发起人自己，却一口都尝不到。"
            $ bake_inspect_spot("s5")
            jump bake_case_investigate

        "去第六组的料理台，看看他们的分工表" if not _bk_s6:
            $ _bk_s6 = True
            scene bg classroom
            $ set_ambient("warm")
            show alice think at left
            show mo think at right
            with dissolve
            "第六组的料理台收拾得很干净。打蛋器、裱花袋、刮刀都洗过了，整整齐齐晾在架子上。台面上压着一张分工表。"
            muzhen "分工是我排的。组长和裱花是我，打发蛋白两个人，烤箱计时一个人。"
            "表上四个人各签了名。组长穆蓁蓁、负责打发的两个人，用的都是黑笔。"
            "只有「烤箱计时」那一栏不一样。签名是「乔穗」，下面记着：「14:25 进炉，15:05 出炉。」——字是绿色的。"
            alice "乔穗是……刚才那个一直低着头的女生？"
            muzhen "嗯。她话不多，手可稳了，计时从来没出过错。今天她一直守在烤箱边上，我在装饰台裱花，从三点多一直裱到三点半。"
            "小林在一旁翻了翻相机：三点零五分到三点半，穆蓁蓁一直站在装饰台前裱花，照片拍了十几张，张张都在。"
            "我看了一眼料理台下的笔袋。笔袋拉链开着，里面只有一支笔，绿色的。"
            show alice shock at left
            alice "绿笔……"
            muzhen "她就这一支笔，记什么都用它。说是绿色看着不累眼睛。"
            play sound se_write
            mo_note "第六组只有一个人，用绿笔写字。"
            $ bake_inspect_spot("s6")
            jump bake_case_investigate

label bake_case_review_intro:
    scene bg classroom
    $ set_ambient("warm")
    $ play_bgm(bgm_mystery, fadein=1.2, fadeout=0.8)
    show alice smile at left
    show mo neutral at right
    with dissolve

    "六处线索全部查完，离郁老师进场还有十分钟。评审桌上，九块蛋糕安安静静地排成一排。"
    "墨墨在本子上画了一块蛋糕的切面，从下往上分成四层：胚底、果酱、奶油、裱花。"
    play sound se_write
    mo_note "像切蛋糕一样。一层一层切开，才看得见里面。"
    alice "那就一层一层切！蛋糕是怎么上桌的、什么时候烤的、是给谁烤的、是谁烤的——四层切开，真相就摆上桌了！"
    if _bk_replays > 0:
        sysmsg "【烘焙赛 · 重玩挑战】当前历史最佳：[_bk_best_text]。零失误切完蛋糕四层，就能拿下金牌。"
    else:
        sysmsg "【烘焙赛 · 蛋糕四层】依次选出「手法 → 时机 → 来历 → 烘焙人」。零失误可获金牌，失误只计入本案评级，不影响主线。"

label bake_layer_k1:
    show screen bake_layer_banner(0, "胚底层 · 手法：蓝格烘焙纸、第六格里的两只盒子、掉进缝里的便签——它是怎么上桌的？")
    menu:
        "第六组从街对面的面包房买了一块来保底":
            hide screen bake_layer_banner
            $ _bk_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "面包房的蛋糕底下都垫着金色硬纸托呀。这一块垫的是家政教室的蓝格烘焙纸——它就是在这间教室里烤出来的。"
            play sound se_write
            mo_note "它不是买来的。它是在这间屋子里长出来的。"
            jump bake_layer_k1

        "它被放进冷藏柜第六格，便签掉了，张子谦按格子把两盒都端上了桌":
            hide screen bake_layer_banner
            play sound se_correct
            $ _bk_layers = 1

        "有人把别组的蛋糕插错了组号旗":
            hide screen bake_layer_banner
            $ _bk_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "八个组的蛋糕一块不少，各自都对上了组号旗——这是多出来的第九块呀，哪一组也没少。"
            play sound se_write
            mo_note "没有谁的蛋糕被拿错。是多了一块。"
            jump bake_layer_k1

    mc "第二块蛋糕底下垫的是家政教室的蓝格烘焙纸，不是面包房的金色纸托——它就是在这间教室里烤出来的，不是买来掉包的。它被放进了冷藏柜第六格，绿笔便签掉进了隔板缝，张子谦按一格一组的规矩，把第六格的两盒都端上了桌。"

label bake_layer_k2:
    show screen bake_layer_banner(1, "果酱层 · 时机：3 号烤箱的第三炉、空着的签字栏、公告栏上的那一行——它是什么时候烤的？")
    menu:
        "13:30 比赛开始以前，有人提前烤好藏了起来":
            hide screen bake_layer_banner
            $ _bk_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "烤箱的总闸一直锁在褚老师手里，一点半才打开。3 号烤箱登记表上的第一炉，是 13:40 才开始的呀。"
            play sound se_write
            mo_note "比赛开始以前，烤箱还是凉的。"
            jump bake_layer_k2

        "16:00 张子谦端蛋糕的时候，有人趁乱放上了桌":
            hide screen bake_layer_banner
            $ _bk_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "张子谦是从冷藏柜第六格里把它端出来的——四点整的时候，它早就在柜子里等着了，还贴过一张便签。"
            play sound se_write
            mo_note "它上桌之前，已经在柜子里凉透了。"
            jump bake_layer_k2

        "15:08 到 15:38，褚老师去校门口接评委时，3 号烤箱的第三炉":
            hide screen bake_layer_banner
            play sound se_correct
            $ _bk_layers = 2

    mc "3 号烤箱的登记表上写着第三炉：15:08 起烤 30 分钟，没有组号，也没有老师签字。公告栏写着，褚老师 15:00 至 15:50 去校门口接评委——第二块蛋糕，就是趁这段空档烤出来的。"

label bake_layer_k3:
    show screen bake_layer_banner(2, "奶油层 · 来历：没有红戳的蛋壳、空的赤藓糖醇袋、只看不尝的评委——它是给谁烤的？")
    menu:
        "第六组烤坏了的第一块，藏起来没交":
            hide screen bake_layer_banner
            $ _bk_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "第六组只领了一份原料呀。多出来的四个蛋壳没有红戳，不是学校发的蛋——而且它颜色那么浅，里面根本没放砂糖。"
            play sound se_write
            mo_note "它不是谁的失败品。它从一开始，就是另外一块。"
            jump bake_layer_k3

        "食堂师傅烤来给老师们当下午茶的":
            hide screen bake_layer_banner
            $ _bk_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "下午茶怎么会藏进比赛的冷藏柜、还贴一张「评审结束再端出来」的便签呀？它用的可是家政教室的烤箱和烘焙纸。"
            play sound se_write
            mo_note "它要等的，是评审结束之后的那一刻。"
            jump bake_layer_k3

        "用自己带来的鸡蛋和赤藓糖醇，给只看不尝的郁老师烤的控糖蛋糕":
            hide screen bake_layer_banner
            play sound se_correct
            $ _bk_layers = 3

    mc "蛋壳桶里四个蛋壳没有红戳，不是学校发的蛋；桶底的赤藓糖醇袋子和小票说明，原料是有人自己带来的。赤藓糖醇烤不出焦色，所以蛋糕颜色浅。它是给公告栏上那位控糖、只看不尝的郁老师烤的。"

label bake_layer_k4:
    show screen bake_layer_banner(3, "裱花层 · 烘焙人：登记表上的绿笔、便签上的绿笔、15:05 出炉的计时——是谁烤的？")
    menu:
        "第六组负责烤箱计时、只用绿笔的乔穗":
            hide screen bake_layer_banner
            play sound se_correct
            $ _bk_layers = 4
            show screen deduction_cutin(headline=_("蛋糕四层，切开了 ——！"), subline="THE SECOND CAKE")
            with flash_shutter

        "第六组组长穆蓁蓁——想多一块保底":
            hide screen bake_layer_banner
            $ _bk_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "穆蓁蓁三点多到三点半一直在装饰台裱花，小林拍了一整组照片。再说，她用的是黑笔呀。"
            play sound se_write
            mo_note "想要保底的人，不会烤一块不甜的蛋糕。"
            jump bake_layer_k4

        "值日生张子谦——是他把蛋糕端上桌的":
            hide screen bake_layer_banner
            $ _bk_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "张子谦三点五十五才从篮球场跑回来值日，他只是按格子端蛋糕。15:08 那一炉进烤箱的时候，他还在球场上呢。"
            play sound se_write
            mo_note "端蛋糕的人，不一定是烤蛋糕的人。"
            jump bake_layer_k4

    mc "登记表的第三炉和第六格的便签，都是绿笔写的。第六组分工表上，只有负责烤箱计时的乔穗用绿笔，她记下的 15:05 出炉，正好让 3 号烤箱空了出来。第二块蛋糕，是乔穗烤的。"
    show alice happy at left
    alice "四层切开了！走，回评审桌——在郁老师进门之前，把这块蛋糕的名字还给它。"

label bake_case_resolution:
    scene bg classroom at bg_kenburns_in
    $ set_ambient("warm")
    $ play_bgm(bgm_warm, fadein=1.5, fadeout=1.0)
    show alice smile at left
    show mo smile at right
    with dissolve

    play sound se_footstep
    "四点二十五分，我们回到评审桌前。第六组的四个人还站在那里，穆蓁蓁的眼圈已经红了。"
    "那个短头发的女生，手里还攥着那支绿笔。"
    mc "乔穗同学。3 号烤箱的第三炉，是你烤的吧。"
    "她肩膀一抖，抬起头来。"
    qiaosui "……是我。"
    muzhen "乔穗？"
    qiaosui "对不起，蓁蓁。那块小的，是我烤的。跟咱们组的比赛没关系，我、我没想拿它去比。"
    chulao "没关系？用比赛的烤箱、趁我不在教室偷偷烤——这叫没关系？"
    qiaosui "我……我知道不对。可是我没有偷用学校的原料，鸡蛋和糖，都是我早上自己去超市买的。"
    mc "能从头讲讲吗？"
    qiaosui "上个礼拜，褚老师在班上念评审须知。念到郁老师的时候，说她控糖，只看不尝。"
    qiaosui "我听人说，烘焙赛是郁老师三十年前办起来的。走廊上那张旧照片，就是第一届。"
    qiaosui "我就想，办了三十年的比赛，她自己却一口都尝不到。每年站在桌子前面，看一圈，就走。"
    qiaosui "我奶奶也控糖。我在家给她烤过好多次，用赤藓糖醇，蛋糕会烤得白白的，可是不升血糖，她能吃一小块。"
    "她说到这里，声音越来越小。"
    qiaosui "今天我管烤箱计时。我们组的蛋糕 15:05 出炉，3 号烤箱就空了。褚老师又正好去接郁老师……"
    qiaosui "我就把带来的料打好，15:08 放进去烤了三十分钟。登记表上我写了时间——可是组号，我不知道该写哪一组。它不是比赛的蛋糕。"
    show alice think at left
    alice "所以你在登记表上写了时间，却空着组号。"
    qiaosui "嗯。烤好以后我在窗台上用风扇吹凉，抹了一点奶油，摆了七颗蓝莓，又插了一张「30」的小卡片。"
    qiaosui "我想等评审结束了，再把它端出来，送给郁老师。怕别人以为是比赛的蛋糕，我就在盒子上贴了便签，放在我们组那一格的最里面。"
    show zhang sad at center
    zhang "……那张便签，掉进隔板缝里了。我开门的时候，只看见两只盒子。"
    hide zhang
    qiaosui "刚才褚老师说要取消我们组的成绩，我想站出来的。可是我一开口，就等于承认我趁老师不在用了烤箱——那我们组的成绩，还是要取消。"
    qiaosui "我不知道该怎么办。蓁蓁她们为了这块草莓的，练了一个月。"
    "她低下头，那支绿笔在手里攥得发白。"
    show mo think at right
    play sound se_page
    "墨墨走过去，在本子上写了一行字，转过来给她看。"
    play sound se_write
    mo_note "你没有多交一块蛋糕。你只是多替一个人，留了一个座位。"
    "乔穗看着那行字，眼眶一点一点红了。"

    "教室门口传来一声轻轻的咳嗽。"
    "门边站着一位头发花白的老太太，拄着一根木头拐杖，胸前别着「客座评委」的小牌子。不知道她在门口听了多久。"
    chulao "郁老师！您怎么提前过来了……"
    yulao "在校史室坐不住，就想早点过来看看孩子们的蛋糕。"
    "郁老师慢慢走到评审桌前，看了看那块六寸的、颜色浅浅的蛋糕，又看了看那张写着「30」的小卡片。"
    yulao "赤藓糖醇的，对吧？颜色才会这么浅。我在家也这么烤。"
    qiaosui "郁、郁老师……对不起，我不该……"
    yulao "三十年前第一届的时候，我也多烤了一块。"
    yulao "那时候看大门的老伯牙不好，吃不了戚风，我就给他另外蒸了一块软软的蛋糕，放在比赛的桌子底下，等评完了再端给他。"
    yulao "后来他每年都来看，一直看到退休。我以为，这件事早就没人记得了。"
    "她拿起塑料刀，从那块浅色的蛋糕上，切下了小小的一角。"
    yulao "三十年了。这是我在自己办的比赛上，吃到的第一口。"
    yulao "……甜的。"
    "教室里没有人说话。窗台上的风扇转着，把烤蛋糕的香味吹得满屋都是。"
    show alice smile at left
    chulao "……乔穗。用烤箱不登记组号、不等老师签字，这是错的。"
    chulao "罚你把这份控糖食谱一笔一笔抄出来，贴在家政教室门口。下礼拜的烤盘，八个组的，你一个人洗。"
    chulao "第六组的成绩照常评。比赛的那一块，本来就是她们自己的。"
    muzhen "谢谢褚老师！"
    chulao "还有——从明年起，冷藏柜一格只放一盒；烤箱登记表，没有老师签字的那一行，一律不算数。"
    yulao "那我也提一条吧。"
    yulao "从明年起，烘焙赛多设一个奖，就叫「第二块蛋糕」——给那块不是为了得奖、是为了某个人烤的蛋糕。"
    mc "就这样：一张掉进缝里的便签，一行没写组号的登记，一位只看不尝的评委。蛋糕从头到尾，都没有离开过家政教室。"
    show alice happy at left
    alice "第九块蛋糕，物归原主！乔穗，明年的「第二块蛋糕」奖，你可得来当第一个评委！"
    "乔穗终于笑了出来。她把那支绿笔别回围裙口袋里，跑去料理台，又拿来了七只小纸碟。"

    scene bg agency at bg_kenburns_in
    $ set_ambient("warm")
    show alice happy at left
    show mo smile at right
    with dissolve
    play sound se_bell
    "那天的烘焙赛，第六组的草莓戚风拿了第二名。评审结束以后，郁老师把那块浅色的蛋糕切成了九小块，分给了评审桌前的每一个人。"
    "家政教室的门口，贴上了一张绿笔抄的食谱：「控糖戚风 · 赤藓糖醇六十克 · 给尝不了甜的人。」"
    "放学后，艾丽丝把番外卷宗摊在桌上，又翻开了那本牛皮纸复盘本。"
    alice "卷宗里添了第八桩短案！复盘本也跟着长一页——家政教室这一页，就叫「第六组的第二块蛋糕」。"
    mc "卷宗的格子也要多排一行了。"
    alice "排！本社长宣布，不管添多少桩，番外卷宗都给它留够格子！"
    "墨墨翻到最新的一页，在页角画了两块挨在一起的蛋糕，一块大，一块小，小的那块旁边插着一面写着「30」的小旗。"
    play sound se_write
    mo_note "替别人烤的蛋糕，要当面递过去，才不会被当成多余的那一块。"
    show alice smile at left
    alice "好！万事屋推理笔记复盘本，今天正式扩容到八页！"

    call _bake_finish_case(_bk_mistakes) from _call__bake_finish_case
    return
