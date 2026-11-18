## 《沉默侦探：千纸鹤的约定》—— PC-16 游泳池更衣柜的错位钥匙与旧复盘本界面清理
## zwembad_locker_casebook.rpy
##
## 设计要点：
##   1. 100% 零侵入主线剧情（script.rpy / chapter1..6.rpy / interlude.rpy / definitions.rpy / autoplay.rpy 零改动），
##      PC-10..PC-15 的短案、纪念、复盘本与卷宗模块同样零改动（唯一例外是按里程碑要求删掉 PC-13 已无引用的四签复盘本旧界面，
##      PC-13 的只读渲染函数与整页展开弹窗原样保留，仍由 PC-15 的扩容复盘本调用）。
##   2. 「游泳池更衣柜的错位钥匙」（screen extras_pool_locker + 可重玩短案 label pool_locker_case）：
##      区游泳赛前一天的周四傍晚，游泳社队长顾澜手环上那把挂着「23」号牌的钥匙打不开自己的 23 号更衣柜；
##      管理员葛阿姨用总钥匙开柜，明天要戴着上场的旧队帽不见了，葛阿姨要报学校、停掉课外开放。
##      六处勘查点（错位的 23 号钥匙、计时台的手环篮、开线的旧队帽、打满孔的入场卡、看台上的深蓝线头、备用泳帽箱），
##      推理链是一场「混合泳四段」：手法 → 时机 → 去向 → 戴帽人。每段三选一、各配一种泳道浮标的颜色，选错只给温柔提示、
##      只计入本地 _lk_mistakes，绝不触碰主线 fail_count / 好感；结案按失误数评定金 / 银 / 铜浪花并保存历史最佳纪录，
##      可无限重玩刷新纪录，持久化于 persistent.pool_locker_record。
##      真相完全写实（1～20 号柜蓝手环 / 21～40 号柜橙手环、钥匙柄上的刻号、被掰开过的号码牌小铁环、计时赛手环篮的计数、
##      剪齐的旧线头与新缝的深蓝针脚、补测提前与「不戴泳帽不许下水」的规矩），没有任何超自然要素。
##   3. 防剧透联动：墨墨在本案页边的续批、复盘本新增一页的页边续批，都严格经 truth_spoiler_unlocked() 零侧信道遮罩，
##      与复盘本、合照相册、番外卷宗等共用同一个「解锁剧透 / 恢复遮罩」开关。
##   4. 入口只进「番外卷宗」：主菜单不新增胶囊；卷宗改为 2 × 4 网格（七桩短案 + 复盘本），高度与 PC-15 相同；
##      复盘本由六页扩为七页（只往 PC-13 的页目登记表里再追加一页，PC-15 的 3 列索引签网格自动排成三行）；
##      侦探社沙龙子栏把天文社流星夜移入「电波与星空」组（与钟楼星象馆、铜章手账册同属星空主题），本案接入「放学后短案」组，
##      两组展开态都不超过 702px 内宽。
##   5. 本文件按文件名排在 zubenelgenubi_meteor_casebook.rpy 之后初始化，双成就追加在 PC-15 之后，成就页扩展为 2×19 = 38 枚。

# —— PC-16 游泳馆 UI 图标命名别名（128x128 RGBA 透明底）——
image ui_icon_pool_locker = "images/ui/icon_pool_locker.png"
image ui_icon_locker_key  = "images/ui/icon_locker_key.png"
image ui_icon_swim_cap    = "images/ui/icon_swim_cap.png"
image ui_icon_pool_pass   = "images/ui/icon_pool_pass.png"

# —— PC-16 新登场的角色（暂无立绘：说话时舞台上的立绘自动恢复常亮，与警察、主持人等无立绘角色同一套规则）——
define gulan = Character("顾澜", color="#7fd0e6", who_outlines=[(1, "#000")])
define xiaoli = Character("方小鲤", color="#ffb98e", who_outlines=[(1, "#000")])
define geayi = Character("葛阿姨", color="#cdb9a0", who_outlines=[(1, "#000")])

init python:

    # 动态注册 PC-16 双成就，使鉴赏室成就页扩展为 2×19（共 38 枚）严整偶数列对称排布
    if "register_extra_achievement" in globals():
        register_extra_achievement(
            "ach_pool_locker",
            "错位钥匙的还原人",
            "还原游泳馆更衣柜钥匙错位风波的真相。",
            False,
        )
        register_extra_achievement(
            "ach_golden_wave",
            "金浪花的泳池侦探",
            "零失误游完混合泳四段，摘得金浪花。",
            False,
        )

    ############################################################################
    ## 一、游泳池更衣柜的错位钥匙（1 桩可重玩短案 · 6 处勘查点 · 混合泳四段 · 金银铜浪花评级）
    ############################################################################

    POOL_CASE = {
        "id": "sw1",
        "code": "SW-01",
        "label": "pool_locker_case",
        "title": "游泳池更衣柜的错位钥匙",
        "short_title": "错位的二十三号钥匙",
        "time_tag": "周四 17:05 · 室内游泳馆 · 区游泳赛前一天",
        "companions": "艾丽丝 · 墨墨 · 小林 · 张子谦",
        "bg_key": "hall",
        "bg_thumb": "images/bg_hall.png",
        "lighting_note": "游泳馆冷光 → 器材室暗灯 → 万事屋暖灯（hall / storeroom / agency）",
        "spoiler": False,
        "summary_pub": (
            "区赛前一天的周四傍晚，游泳社在室内游泳馆做赛前计时，高一补测组还在浅水道里一趟趟地游。"
            "17:05 训练结束，队长顾澜手环上挂着「23」号牌的钥匙，怎么也打不开 23 号更衣柜。"
            "管理员葛阿姨用总钥匙打开柜门：衣服和书包都在，只有她明天要戴着上场的旧队帽不见了。"
            "葛阿姨要报学校、停掉课外开放——离补测结束只剩二十五分钟。"
        ),
        "solution_pub": (
            "结案报告：队帽没有被偷，也从没离开过游泳馆。高一新生方小鲤在计时赛里借口取毛巾拿走 23 号手环，"
            "打开柜门取出侧缝开线的旧队帽，想在区赛前悄悄替教她换气的顾澜缝好。为了还能把帽子放回去，"
            "她把「23」号牌换到了自己 7 号柜的钥匙上送回篮子；补测突然提前，自己的泳帽却锁在了 7 号柜里，"
            "她只好戴着刚缝好的队帽下了水，第四次补测终于游完了五十米。"
        ),
        "mo_note_pub": "墨墨现场手记：「钥匙会走错门，帽子却记得它的主人。」",
        "alice_note_pub": "艾丽丝结案批注：「更衣柜案告破！罚方小鲤明天坐看台最后一排加油——那是她的专座，谁也不许抢！」",
        "margin_secret": (
            "续批：墨墨在这一页的角上，画了一顶补好的旧泳帽。她写：四年前，小雪侦探总以为弄坏的东西只要悄悄补好、"
            "再悄悄放回去，就谁也不会难过；周可却说，补好的东西，要当面还才算数。"
        ),
    }

    POOL_MASK_NOTICE = "【防剧透火漆：墨墨在这一案页边的续批涉终章旧约，通关 TRUE END 或点击上方「解锁剧透」后显影】"

    POOL_SPOTS = [
        {
            "id": "s1",
            "code": "LK-01",
            "label": "错位的二十三号钥匙",
            "where": "女更衣区 · 23 号柜前",
            "keeper": "顾澜",
            "scene": "hall",
            "icon": "images/ui/icon_locker_key.png",
            "surface": "顾澜手环上挂着「23」号牌，钥匙却连 23 号柜的锁孔都插不进去。",
            "detail": (
                "现场手记：馆里的规矩是 1 到 20 号柜配蓝手环、21 到 40 号柜配橙手环，可这枚「23」号牌挂在一只蓝手环上，"
                "钥匙柄压着一个小小的 07。挂号码牌的小铁环被掰开过、又捏了回去，缝里卡着一小截崭新的深蓝色棉线。"
            ),
            "evidence": "错位钥匙：23 号牌挂在蓝手环上，钥匙柄压着 07，小铁环被掰开过，卡着深蓝棉线",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "s2",
            "code": "LK-02",
            "label": "计时台的手环篮",
            "where": "泳池边 · 计时台",
            "keeper": "小林",
            "scene": "corridor",
            "icon": "images/ui/icon_evidence_tag.png",
            "surface": "计时赛不许戴手环下水，八名队员的手环都放进计时台上的塑料篮，小林守着记成绩。",
            "detail": (
                "现场手记：计时表背面记着——16:36，一个扎两个丸子头的高一女生说替顾澜学姐取毛巾，取走 23 号手环；"
                "16:44 送回。小林每次都数过，篮里始终是八只。计时赛 16:32 开始、16:50 结束，再没人碰过篮子。"
            ),
            "evidence": "手环篮：16:36 丸子头高一女生取走 23 号手环，16:44 送回，篮里始终八只",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "s3",
            "code": "LK-03",
            "label": "开线的旧队帽",
            "where": "游泳社活动室 · 白板",
            "keeper": "黄老师",
            "scene": "clubroom",
            "icon": "images/ui/icon_swim_cap.png",
            "surface": "不见的是一顶布面旧队帽，签满了毕业学姐的名字，明天区赛顾澜只戴它。",
            "detail": (
                "现场手记：白板角上还留着上周的一行字「顾澜：队帽侧缝开线，赛前换新」，侧缝的口子已有三指宽。"
                "葛阿姨打开 23 号柜时，衣服叠得整整齐齐，书包也在，柜底只落着两截剪齐的旧白线头。"
            ),
            "evidence": "旧队帽：侧缝开线三指宽，23 号柜底落着两截剪齐的旧白线头",
            "observer": "墨墨（现场手记）",
        },
        {
            "id": "s4",
            "code": "LK-04",
            "label": "打满孔的入场卡",
            "where": "游泳馆门口 · 入场卡夹",
            "keeper": "葛阿姨",
            "scene": "hall",
            "icon": "images/ui/icon_pool_pass.png",
            "surface": "课外来游泳要在门口打入场卡，一次一个孔。有一张卡两个礼拜打了十一个孔。",
            "detail": (
                "现场手记：卡主是高一(5)班的方小鲤，五十米补测挂了三次，回回只用 7 号柜。顾澜每天练完都留下来教她换气。"
                "今天补测原定 17:20，黄老师见计时赛提前收尾，16:50 就把补测组叫下了水。"
            ),
            "evidence": "入场卡：方小鲤两周来了十一次、回回用 7 号柜；补测从 17:20 提前到 16:50",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "s5",
            "code": "LK-05",
            "label": "看台上的深蓝线头",
            "where": "泳池看台 · 最后一排",
            "keeper": "张子谦",
            "scene": "corridor",
            "icon": "images/ui/icon_red_thread_knot.png",
            "surface": "张子谦在看台最后一排的长椅底下，捡到几截深蓝色的棉线头和一枚穿针器。",
            "detail": (
                "现场手记：线头是新剪的，和 23 号牌小铁环里卡着的那截一模一样。长椅上留着一圈半干的水印，"
                "像有人披着湿毛巾坐了好一阵。从这一排往下看，正对着泳池最靠边的 1、2 道——补测组游的地方。"
            ),
            "evidence": "看台线头：最后一排落着新剪的深蓝线头和穿针器，正对补测组的 1、2 道",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "s6",
            "code": "LK-06",
            "label": "备用泳帽箱",
            "where": "器材室 · 门边塑料箱",
            "keeper": "葛阿姨",
            "scene": "storeroom",
            "icon": "images/ui/icon_lost_found_box.png",
            "surface": "黄老师的规矩：不戴泳帽不许下水。忘带帽子的，来器材室借一顶、记一笔。",
            "detail": (
                "现场手记：备用泳帽十二顶，今天一顶也没借出去，登记本这一页是空的。可补测组七个人都戴着帽子下了水——"
                "葛阿姨记得，1 道那个女孩的帽子旧旧的、深蓝色，侧面写满了字。"
            ),
            "evidence": "备用泳帽：十二顶一顶未借，1 道补测的女孩却戴着深蓝色、写满字的旧帽子",
            "observer": "墨墨（现场手记）",
        },
    ]

    _POOL_SPOT_BY_ID = {s["id"]: s for s in POOL_SPOTS}

    # 混合泳四段：推理链每一段各配一种泳道浮标的颜色（蝶泳粉 / 仰泳天蓝 / 蛙泳青绿 / 自由泳金黄）
    POOL_STROKES = [
        {"name": "蝶泳", "color": "#f08fa8"},
        {"name": "仰泳", "color": "#6fb8f0"},
        {"name": "蛙泳", "color": "#5fd0a8"},
        {"name": "自由泳", "color": "#f2c35a"},
    ]

    POOL_LAP_LINKS = [
        {
            "id": "k1",
            "step": "蝶泳段",
            "name": "手法",
            "stroke": "蝶泳",
            "color": "#f08fa8",
            "short": "号码牌换到了别的手环上",
            "full": (
                "「23」号牌挂在蓝手环上，钥匙柄却压着 07——1 到 20 号柜才配蓝手环。挂号码牌的小铁环被掰开过，缝里还卡着新棉线。"
                "钥匙没有被偷，也没有被偷配：有人把「23」号牌换到了另一把钥匙上，再把它送回篮子，所以小林数来数去，始终是八只。"
            ),
        },
        {
            "id": "k2",
            "step": "仰泳段",
            "name": "时机",
            "stroke": "仰泳",
            "color": "#6fb8f0",
            "short": "计时赛 16:36 到 16:44",
            "full": (
                "计时赛期间手环都在篮子里。小林的计时表写得清清楚楚：16:36，23 号手环被取走；16:44，送回——"
                "这是 23 号钥匙唯一一次离开篮子。23 号柜底那两截剪齐的旧线头说明，帽子就是在这段时间里，在柜门前被取走、剪好线头的。"
            ),
        },
        {
            "id": "k3",
            "step": "蛙泳段",
            "name": "去向",
            "stroke": "蛙泳",
            "color": "#5fd0a8",
            "short": "戴在 1 道补测者的头上",
            "full": (
                "开线的侧缝被人剪齐旧线头，又在看台最后一排用深蓝线一针一针缝好——那一排正对补测的 1、2 道。"
                "备用泳帽一顶也没借出去，补测组却七个人都戴着帽子下了水：1 道那顶深蓝色、写满字的旧帽子，就是顾澜的队帽。它此刻正在水里。"
            ),
        },
        {
            "id": "k4",
            "step": "自由泳段",
            "name": "戴帽人",
            "stroke": "自由泳",
            "color": "#f2c35a",
            "short": "高一新生方小鲤",
            "full": (
                "顾澜手里的钥匙刻着 07，开的是 7 号柜。入场卡夹里，回回只用 7 号柜、天天跟顾澜学换气、补测挂了三次的，是高一(5)班的方小鲤；"
                "小林记下的丸子头高一女生，也是她。她把自己的 7 号钥匙交了出去，泳帽也就锁在了柜子里——补测一提前，她只好戴着刚缝好的队帽下了水。"
            ),
        },
    ]

    POOL_RATING_TIERS = [
        {"key": "gold",   "name": "金浪花", "title": "泳池名侦探", "rule": "零失误",         "max_mistakes": 0},
        {"key": "silver", "name": "银浪花", "title": "泳道推理员", "rule": "失误 1～2 次",    "max_mistakes": 2},
        {"key": "bronze", "name": "铜浪花", "title": "初学换气", "rule": "失误 3 次及以上", "max_mistakes": 999},
    ]

    _POOL_TIER_BY_KEY = {t["key"]: t for t in POOL_RATING_TIERS}
    _POOL_TIER_RANK = {"gold": 3, "silver": 2, "bronze": 1}

    # 在证物簿里登记六处勘查点的翻面批注（与委托信箱、闭馆图书馆、雨夜剧场、美术室、失物箱、鬼屋、流星夜同一套 register_evidence_detail 机制）
    if "register_evidence_detail" in globals():
        for _lks in POOL_SPOTS:
            register_evidence_detail(_lks["evidence"], _lks["observer"], _lks["detail"])

    def pool_tier_def(tier_key):
        return _POOL_TIER_BY_KEY.get(tier_key, POOL_RATING_TIERS[-1])

    def pool_rate(mistakes_count=0):
        """按本局失误数评定浪花：0 次金浪花，1～2 次银浪花，3 次及以上铜浪花。"""
        m = max(0, int(mistakes_count or 0))
        for tier in POOL_RATING_TIERS:
            if m <= tier["max_mistakes"]:
                return tier
        return POOL_RATING_TIERS[-1]

    def pool_get_spot(spot_id):
        return _POOL_SPOT_BY_ID.get(spot_id, POOL_SPOTS[0])

    def _ensure_pool_store():
        if not isinstance(getattr(persistent, "pool_locker_record", None), dict):
            persistent.pool_locker_record = {}
        return persistent.pool_locker_record

    def pool_get_record():
        raw = _ensure_pool_store()
        best_tier = raw.get("best_tier")
        last_tier = raw.get("last_tier")
        best_m = raw.get("best_mistakes", None)
        last_m = raw.get("last_mistakes", None)
        return {
            "solved": bool(raw.get("solved", False)),
            "replays": int(raw.get("replays", 0) or 0),
            "best_tier": best_tier if best_tier in _POOL_TIER_RANK else None,
            "last_tier": last_tier if last_tier in _POOL_TIER_RANK else None,
            "best_mistakes": (None if best_m is None else int(best_m)),
            "last_mistakes": (None if last_m is None else int(last_m)),
            "inspected": [s for s in (raw.get("inspected") or []) if s in _POOL_SPOT_BY_ID],
            "report_viewed": bool(raw.get("report_viewed", False)),
        }

    def _pool_write(updates):
        store_dict = dict(_ensure_pool_store())
        store_dict.update(updates)
        persistent.pool_locker_record = store_dict
        return store_dict

    def pool_case_solved_count():
        return 1 if pool_get_record()["solved"] else 0

    def pool_gold_count():
        return 1 if pool_get_record()["best_tier"] == "gold" else 0

    def pool_best_short():
        """番外卷宗与鉴赏页使用：历史最佳浪花，未结案时显示「待结案」。"""
        rec = pool_get_record()
        return pool_tier_def(rec["best_tier"])["name"] if rec["best_tier"] else "待结案"

    def pool_select_spot(spot_id):
        sdef = pool_get_spot(spot_id)
        persistent.pool_selected_spot = sdef["id"]
        renpy.save_persistent()

    def pool_inspect_spot(spot_id):
        """剧场内勘查一处：证物入簿（可翻面），并把这一处记入鉴赏页档案；只写更衣柜案自己的存档。"""
        sdef = _POOL_SPOT_BY_ID.get(spot_id)
        if sdef is None:
            return False
        if "add_evidence" in globals():
            add_evidence(sdef["evidence"])
        seen = list(pool_get_record()["inspected"])
        if sdef["id"] not in seen:
            seen.append(sdef["id"])
        _pool_write({"inspected": seen})
        persistent.pool_selected_spot = sdef["id"]
        renpy.save_persistent()
        return True

    def pool_record_solve(mistakes_count=0):
        """记录一次结案：评定本局浪花、刷新历史最佳（最高评级 + 最少失误）与累计结案次数。
        只写更衣柜案自己的存档，绝不触碰主线 fail_count / 好感。本局零失误时追加金浪花成就。"""
        m = max(0, int(mistakes_count or 0))
        tier = pool_rate(m)
        prev = pool_get_record()
        is_first = not prev["solved"]
        prev_rank = _POOL_TIER_RANK.get(prev["best_tier"], 0)
        best_tier = tier["key"] if _POOL_TIER_RANK[tier["key"]] >= prev_rank else prev["best_tier"]
        best_m = m if prev["best_mistakes"] is None else min(prev["best_mistakes"], m)
        new_record = (not is_first) and (prev["best_mistakes"] is None or m < prev["best_mistakes"])
        _pool_write({
            "solved": True,
            "replays": prev["replays"] + 1,
            "best_tier": best_tier,
            "last_tier": tier["key"],
            "best_mistakes": best_m,
            "last_mistakes": m,
            "inspected": [s["id"] for s in POOL_SPOTS],
        })
        ach_grant("ach_pool_locker")
        if tier["key"] == "gold":
            ach_grant("ach_golden_wave")
        renpy.save_persistent()
        result = pool_get_record()
        result["is_first"] = is_first
        result["new_record"] = new_record
        return result

    def pool_open_report_modal():
        if pool_get_record()["solved"]:
            _pool_write({"report_viewed": True})
            renpy.save_persistent()
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("pool_report_modal")

    def pool_spoiler_unlocked():
        return bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False

    def pool_render_view():
        """渲染更衣柜卷宗：结案前只公开案情与勘查点外观，结案后显影混合泳四段、结案报告与双人手记；
        墨墨涉终章的页边续批只在 truth_spoiler_unlocked() 为真且已结案时出现，遮罩状态下的返回值与续批文本完全无关（零侧信道）。"""
        rec = pool_get_record()
        solved = rec["solved"]
        best = pool_tier_def(rec["best_tier"]) if rec["best_tier"] else None
        unlocked = pool_spoiler_unlocked()
        if best:
            best_line = "%s「%s」 · 最少失误 %d 次" % (best["name"], best["title"], rec["best_mistakes"] or 0)
        else:
            best_line = "尚未结案"
        return {
            "code": POOL_CASE["code"],
            "title": POOL_CASE["title"],
            "short_title": POOL_CASE["short_title"],
            "time_tag": POOL_CASE["time_tag"],
            "summary": POOL_CASE["summary_pub"],
            "solved": solved,
            "replays": rec["replays"],
            "best_tier": rec["best_tier"],
            "best_name": best["name"] if best else "待结案",
            "best_line": best_line,
            "inspected_count": len(rec["inspected"]),
            "lap_shorts": [(k["short"] if solved else "") for k in POOL_LAP_LINKS],
            "lap_fulls": [(k["full"] if solved else "") for k in POOL_LAP_LINKS],
            "display_solution": POOL_CASE["solution_pub"] if solved else "",
            "display_mo_note": POOL_CASE["mo_note_pub"] if solved else "",
            "display_alice_note": POOL_CASE["alice_note_pub"] if solved else "",
            "unlocked": unlocked,
            "display_secret": POOL_CASE["margin_secret"] if (solved and unlocked) else "",
            "display_masked_notice": POOL_MASK_NOTICE if not unlocked else "",
        }

    def pool_launch_action():
        return [
            Function(stop_all_gramophone_ambience, True),
            SetField(persistent, "extras_tab", "pool"),
            Replay(POOL_CASE["label"], scope={"player_name": persistent.last_player_name or "陈默"}, locked=False),
        ]

    ############################################################################
    ## 二、推理笔记复盘本再扩容（6 页 → 7 页：追加游泳池更衣柜一页）
    ############################################################################

    # 与 PC-13 / PC-15 的页目同一格式：只登记「去哪里读」，卷宗、勘查点、推理链、评级与存档字段都在运行期按名字读取；
    # 页边的复盘要点、墨墨批注与续批是复盘本自己新写的文字。
    CASEBOOK_POOL_PAGE = {
        "key": "pool", "tab": "pool", "index_label": "游泳池更衣柜", "unit": "混合泳四段", "ink": "#2fb4c2",
        "case_var": "POOL_CASE", "hotspots_var": "POOL_SPOTS", "links_var": "POOL_LAP_LINKS",
        "tiers_var": "POOL_RATING_TIERS", "store": "pool_locker_record",
        "lesson": "复盘要点：先看数字挂在哪里。号码牌、手环颜色和钥匙柄上的刻号各说各的话，对不上的那一处，就是有人动过手的地方。",
        "mo_margin": "墨墨批注：换错的东西，总有一天要换回来。换回来之前，先替对方好好保管。",
        "margin_secret": (
            "续批：抄完这一页，墨墨在两只换错了号码牌的小手环中间画了一根细线。她说，四年前小雪侦探和周可之间，"
            "也有一样东西挂错了地方；她一直在等，等一个能把它换回来的日子。"
        ),
    }

    # 追加进 PC-13 的页目登记表（只在运行期合并一次；PC-13 的四页与 PC-15 的两页顺序、内容原样保留）
    if "NOTEBOOK_CASES" in globals():
        if not any(n["key"] == CASEBOOK_POOL_PAGE["key"] for n in NOTEBOOK_CASES):
            NOTEBOOK_CASES.append(CASEBOOK_POOL_PAGE)
        _NOTEBOOK_BY_KEY = {n["key"]: n for n in NOTEBOOK_CASES}


################################################################################
## 三、鉴赏分页界面：游泳池更衣柜的错位钥匙（screen extras_pool_locker）
################################################################################

transform pool_ripple:
    subpixel True
    block:
        ease 1.4 alpha 0.6 yoffset 2
        ease 1.4 alpha 1.0 yoffset 0
        repeat

screen extras_pool_locker():
    $ _pv = pool_render_view()
    $ _prec = pool_get_record()
    $ _psid = persistent.pool_selected_spot or "s1"
    $ _ps = pool_get_spot(_psid)
    $ _ps_seen = (_ps["id"] in _prec["inspected"])

    vbox:
        spacing 9

        ## 1. 更衣柜总览横幅（池水青蓝 · 浮标暖金）
        frame:
            style "pool_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_pool_locker.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("游泳池更衣柜的错位钥匙") font gui.name_text_font size 19 color "#ecfcff"
                        if _pv["solved"]:
                            text _("已结案 · 混合泳四段已全部游完 · 可随时重回泳池冲击金浪花") size 12 color "#9fe3b0"
                        else:
                            text _("区赛前一天，队长的钥匙开不了自己的柜子 · 队帽去了哪") size 12 color "#c0e6ee"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_locker_key.png" xysize (14, 14) yalign 0.5
                            text ("最佳 %s" % _pv["best_name"]) size 12 color "#f4d98a" yalign 0.5 substitute False
                    frame:
                        style "mailbox_stat_chip"
                        text ("结案 %d 次" % _pv["replays"]) size 12 color "#bfeaf2" align (0.5, 0.5) substitute False

        ## 2. 卷宗详情：游泳馆缩略图（底部四段泳姿色带，结案后点亮）、案情、六处勘查点、混合泳四段、浪花评级与页边续批
        frame:
            style "pool_console_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add POOL_CASE["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add Solid("#05262eb0") xysize (180, 96) align (0.5, 0.5)
                        add "images/ui/icon_pool_locker.png" xysize (24, 24) xalign 0.05 yalign 0.08
                        if _pv["solved"]:
                            add "images/ui/icon_locker_key.png" xysize (26, 26) xalign 0.96 yalign 0.08 at pool_ripple
                        vbox:
                            spacing 1
                            xalign 0.5
                            yalign 0.97
                            add Solid("#dff6fb") xysize (178, 1)
                            hbox:
                                spacing 6
                                for _pi, _pst in enumerate(POOL_STROKES):
                                    add Solid(_pst["color"] if _pv["solved"] else "#24474f") xysize (40, 5)
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text POOL_CASE["code"] size 12 color "#ffffff" bold True align (0.5, 0.5) substitute False
                            text ("《%s》" % POOL_CASE["short_title"]) font gui.name_text_font size 17 color "#ecfcff" yalign 0.5 substitute False
                        text ("%s  ·  %s" % (POOL_CASE["time_tag"], POOL_CASE["companions"])) size 12 color "#b4dce6" substitute False
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (15, 15) yalign 0.5
                            text ("光影：%s" % POOL_CASE["lighting_note"]) size 12 color "#94bcc6" yalign 0.5 substitute False
                        if _pv["solved"]:
                            text ("结案档案：%s（已结案 %d 次 · 勘查点全查完）" % (_pv["best_line"], _pv["replays"])) size 12 color "#f4d98a" substitute False
                        else:
                            text ("结案档案：尚未结案（已勘查 %d/6 处，可先翻看下方勘查点，再回到游泳馆）" % _pv["inspected_count"]) size 12 color "#94bcc6" substitute False

                text POOL_CASE["summary_pub"] size 13 color "#eef9fc" line_spacing 3 substitute False

                ## 2A. 六处勘查点（3 × 226 + 2 × 8 = 694px 精确贴合内宽，两行）
                text _("勘查点 · 点击翻看六处线索（亲自查过的，会显影现场手记）：") size 12 color "#9fd8e4" bold True
                grid 3 2:
                    spacing 8
                    for p_obj in POOL_SPOTS:
                        $ _p_seen = (p_obj["id"] in _prec["inspected"])
                        $ _p_active = (p_obj["id"] == _ps["id"])
                        button:
                            style "pool_spot_card"
                            selected _p_active
                            action Function(pool_select_spot, p_obj["id"])
                            vbox:
                                spacing 2
                                xfill True
                                hbox:
                                    xfill True
                                    yalign 0.5
                                    text ("%s · %s" % (p_obj["code"], p_obj["label"])) size 11 color ("#f2c35a" if _p_active else "#e2f2f6") bold True yalign 0.5 substitute False
                                    text (_("已勘查") if _p_seen else _("待勘查")) size 10 color ("#9fe3b0" if _p_seen else "#94bcc6") xalign 1.0 yalign 0.5
                                text ("位置 %s" % p_obj["where"]) size 10 color "#a6cad4" substitute False
                                text p_obj["surface"] size 11 color "#d8eef3" line_spacing 2 substitute False

                frame:
                    xfill True
                    padding (10, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        spacing 8
                        add _ps["icon"] xysize (20, 20)
                        vbox:
                            spacing 2
                            text ("%s · %s（经手：%s）" % (_ps["code"], _ps["label"], _ps["keeper"])) size 12 color "#f2c35a" bold True substitute False
                            if _ps_seen:
                                text _ps["detail"] size 12 color "#f1fafc" line_spacing 2 substitute False
                            else:
                                text _("还没有亲自勘查这一处。回到游泳馆查过之后，现场手记会显影在这里。") size 12 color "#94bcc6"

                ## 2B. 混合泳四段（4 × 167 + 3 × 8 = 692px <= 694px；每段一种泳道浮标颜色）
                text _("混合泳四段 · 复盘（手法 → 时机 → 去向 → 戴帽人，结案后显影）：") size 12 color "#9fd8e4" bold True
                hbox:
                    spacing 8
                    for _ki, l_obj in enumerate(POOL_LAP_LINKS):
                        frame:
                            style "pool_lap_slot"
                            vbox:
                                spacing 2
                                add Solid(l_obj["color"]) xysize (151, 3)
                                text ("%s · %s" % (l_obj["step"], l_obj["name"])) size 11 color ("#9fe3b0" if _pv["solved"] else "#b4dce6") bold True substitute False
                                text (_pv["lap_shorts"][_ki] if _pv["solved"] else _("？ 待游完")) size 12 color ("#f1fafc" if _pv["solved"] else "#7ea4ae") substitute False

                ## 2C. 浪花评级与结案报告预览匣
                frame:
                    style "pool_rating_card"
                    vbox:
                        spacing 5
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_locker_key.png" xysize (16, 16) yalign 0.5
                                text _("浪花评级 · 重玩挑战") font gui.name_text_font size 13 color "#f1fafc" yalign 0.5
                            text ("历史最佳：%s" % _pv["best_line"]) size 11 color "#f4d98a" xalign 1.0 yalign 0.5 substitute False
                        hbox:
                            spacing 8
                            for w_obj in POOL_RATING_TIERS:
                                frame:
                                    style "pool_tier_chip"
                                    hbox:
                                        xfill True
                                        yalign 0.5
                                        text ("%s「%s」" % (w_obj["name"], w_obj["title"])) size 12 color ("#f4d98a" if _pv["best_tier"] == w_obj["key"] else "#e2f2f6") yalign 0.5 substitute False
                                        text w_obj["rule"] size 11 color "#a6cad4" xalign 1.0 yalign 0.5 substitute False
                        if _pv["solved"]:
                            add Solid("#9fd8e433") xfill True ysize 1
                            text _pv["display_solution"] size 12 color "#9fe3b0" line_spacing 2 substitute False
                            text _pv["display_mo_note"] size 12 color "#cfa6f0" substitute False
                            text _pv["display_alice_note"] size 12 color "#f0c060" substitute False
                        else:
                            text _("结案报告：游完混合泳四段之后，墨墨会把推理链和完整的结案报告写在这里。") size 12 color "#94bcc6"

                ## 2D. 墨墨的页边续批（防剧透火漆：与复盘本等共用 truth_spoiler_unlocked() 开关）
                frame:
                    style "pool_margin_box"
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
                                                    message=_("尚未通关 TRUE END，确定提前揭晓墨墨在「游泳池更衣柜」页边涉终章旧约的续批吗？"),
                                                    yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                                    no_action=Hide("confirm"))
                        if _pv["display_secret"]:
                            text _pv["display_secret"] size 12 color "#f4d98a" line_spacing 2 substitute False
                        elif _pv["unlocked"]:
                            text _("剧透许可已开启 · 游完混合泳四段结案之后，墨墨的续批会显影在这里。") size 12 color "#94bcc6"
                        if _pv["display_masked_notice"]:
                            text _pv["display_masked_notice"] size 11 color "#f0a4b8" substitute False

                ## 2E. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("零失误游完混合泳四段可获金浪花 · 已结案 %d 次" % _pv["replays"]) size 12 color "#a6cad4" yalign 0.5 substitute False
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton _("展阅结案报告"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(pool_open_report_modal)
                        textbutton (_("重回游泳馆") if _pv["solved"] else _("走进游泳馆")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action pool_launch_action()

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
                    action [SetField(persistent, "notebook_selected_case", "pool"), SetField(persistent, "extras_tab", "notebook")]


## 更衣柜结案报告独立展阅弹窗
screen pool_report_modal():
    modal True
    zorder 215
    $ _qv = pool_render_view()

    add "#05141add"
    key "K_ESCAPE" action Hide("pool_report_modal")
    key "K_RETURN" action Hide("pool_report_modal")
    key "K_SPACE" action Hide("pool_report_modal")

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
                    add "images/ui/icon_pool_locker.png" xysize (40, 40) yalign 0.5
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_qv["code"], _qv["short_title"])) font gui.name_text_font size 20 color "#ecfcff" substitute False
                        text _qv["time_tag"] size 12 color "#b4dce6" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_locker_key.png" xysize (30, 30) yalign 0.5 at pool_ripple
                    text _qv["best_name"] size 13 color "#f4d98a" bold True yalign 0.5 substitute False

            hbox:
                spacing 0
                for _rst in POOL_STROKES:
                    add Solid(_rst["color"]) xysize (173, 3)

            viewport:
                xfill True
                ysize 336
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    text _("案情：") size 12 color "#9fd8e4" bold True
                    text _qv["summary"] size 13 color "#eef9fc" line_spacing 4 substitute False
                    add Solid("#b4dce633") xfill True ysize 1
                    if _qv["solved"]:
                        text _("混合泳四段：") size 12 color "#9fd8e4" bold True
                        for _ri, q_obj in enumerate(POOL_LAP_LINKS):
                            hbox:
                                spacing 8
                                add Solid(q_obj["color"]) xysize (6, 18) yalign 0.0
                                text ("%s · %s（%s）：%s" % (q_obj["step"], q_obj["name"], q_obj["stroke"], _qv["lap_fulls"][_ri])) size 13 color "#e2f2f6" line_spacing 3 xsize 658 substitute False
                        add Solid("#9fd8e433") xfill True ysize 1
                        text _qv["display_solution"] size 13 color "#9fe3b0" line_spacing 4 substitute False
                        text _qv["display_mo_note"] size 13 color "#cfa6f0" line_spacing 4 substitute False
                        text _qv["display_alice_note"] size 13 color "#f0c060" line_spacing 4 substitute False
                        if _qv["display_secret"]:
                            add Solid("#f4d98a33") xfill True ysize 1
                            text _qv["display_secret"] size 13 color "#f4d98a" line_spacing 4 substitute False
                    else:
                        text _("这桩案子还没有结案。回到游泳馆、查完六处线索并游完混合泳四段后，完整的结案报告会显影在这里。") size 13 color "#a6cad4" line_spacing 4
                    if _qv["display_masked_notice"]:
                        text _qv["display_masked_notice"] size 12 color "#f0a4b8" substitute False

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上结案报告") size 12 color "#a6cad4" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 10
                    textbutton _("重回游泳馆"):
                        style "gramophone_mini_pill"
                        yalign 0.5
                        action [Hide("pool_report_modal")] + pool_launch_action()
                    textbutton _("合上报告"):
                        style "pill_button"
                        xminimum 116
                        ysize 34
                        text_size 14
                        action Hide("pool_report_modal")


## 游泳馆剧场内顶部「混合泳四段」横幅（位于右上角证物 HUD 下方，互不遮挡；已游完的一段亮起各自的泳姿颜色）
screen pool_lap_banner(laps_done, prompt_line):
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
                add "images/ui/icon_swim_cap.png" xysize (22, 22) yalign 0.5
                text _("游泳馆 · 混合泳四段") size 12 color "#9fd8e4" bold True yalign 0.5
                text ("已游完 %d/%d · 失误只计入本案浪花评级，不影响主线" % (laps_done, len(POOL_LAP_LINKS))) size 11 color "#b4dce6" yalign 0.5
            hbox:
                spacing 6
                for _bi, b_obj in enumerate(POOL_LAP_LINKS):
                    frame:
                        style "pool_banner_slot"
                        vbox:
                            spacing 0
                            add Solid(b_obj["color"] if _bi <= laps_done else "#24474f") xysize (160, 3)
                            text ("%s · %s" % (b_obj["step"], b_obj["name"])) size 10 color ("#9fe3b0" if _bi < laps_done else ("#f2c35a" if _bi == laps_done else "#94bcc6")) bold True substitute False
                            text (b_obj["short"] if _bi < laps_done else _("？")) size 11 color ("#f1fafc" if _bi < laps_done else "#7ea4ae") substitute False
            text prompt_line size 14 color "#f1fafc" substitute False


## 游泳馆结案结算卡：本局浪花评级 + 历史最佳纪录 + 重玩挑战提示
screen pool_result_card(cur_tier, best_tier, mistakes, best_mistakes, replays, new_record=False, is_first=True):
    modal True
    zorder 220
    $ _wcur = pool_tier_def(cur_tier)
    $ _wbest = pool_tier_def(best_tier)
    $ _wv = pool_render_view()
    $ _is_gold = (cur_tier == "gold")

    add "#05141add"
    key "K_RETURN" action Return("back_to_pool")
    key "K_SPACE" action Return("back_to_pool")
    key "K_ESCAPE" action Return("back_to_pool")

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
                add "images/ui/icon_locker_key.png" xysize (54, 54) yalign 0.5 at pool_ripple
                vbox:
                    spacing 3
                    yalign 0.5
                    text ("更衣柜结案 · %s" % POOL_CASE["code"]) size 13 color "#9fd8e4" bold True substitute False
                    text ("《%s》" % POOL_CASE["short_title"]) font gui.name_text_font size 21 color "#ecfcff" substitute False
                    text ("本局评级：【%s · %s】" % (_wcur["name"], _wcur["title"])) size 14 color ("#f4d98a" if _is_gold else "#9fe3b0") substitute False

            hbox:
                spacing 0
                xalign 0.5
                for _cst in POOL_STROKES:
                    add Solid(_cst["color"]) xysize (152, 3)

            frame:
                xfill True
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 4
                    text _wv["display_mo_note"] size 13 color "#cfa6f0" substitute False
                    text _wv["display_alice_note"] size 13 color "#f0c060" substitute False
                    text ("本局失误 %d 次（只计入更衣柜浪花评级，不影响主线）" % mistakes) size 12 color "#b4dce6"
                    text ("历史最佳：%s「%s」 · 最少失误 %d 次 · 累计结案 %d 次" % (_wbest["name"], _wbest["title"], best_mistakes, replays)) size 12 color "#b4dce6" substitute False
                    if is_first:
                        text _("首次结案 · 混合泳四段已写入鉴赏室「游泳池更衣柜」分页，复盘本扩容到了七页") size 12 color "#9fe3b0"
                    elif new_record:
                        text _("重玩挑战 · 刷新个人纪录！这一次的四段比以往任何一次都游得更顺") size 12 color "#f4d98a"
                    elif _is_gold:
                        text _("重玩挑战 · 再次摘下金浪花，泳池名侦探实至名归") size 12 color "#f4d98a"
                    else:
                        text _("重玩挑战 · 零失误游完混合泳四段，就能把金浪花挂上游泳馆的白板") size 12 color "#b4dce6"

            textbutton _("收好号码牌并返回鉴赏室"):
                style "pill_button"
                xalign 0.5
                xminimum 248
                ysize 38
                text_size 15
                action Return("back_to_pool")


################################################################################
## 四、样式定义（PC-16 池水青蓝与浮标暖金）
################################################################################

style pool_header_card is default:
    xfill True
    padding (14, 10)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#9fd6e2") * SaturationMatrix(0.0))

style pool_console_card is default:
    xfill True
    padding (14, 11)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#cbe9f0") * SaturationMatrix(0.0))

style pool_rating_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style pool_spot_card is button:
    xsize 226
    yminimum 88
    padding (8, 6)
    background Frame("gui/hud_chip.png", 12, 12)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style pool_lap_slot is default:
    xsize 167
    ysize 58
    padding (8, 5)
    background Frame("gui/hud_chip.png", 12, 12)

style pool_banner_slot is default:
    xsize 176
    ysize 44
    padding (8, 4)
    background Frame("gui/panel_card.png", 16, 16)

style pool_tier_chip is default:
    xsize 218
    ysize 30
    padding (8, 0)
    background Frame("gui/panel_card.png", 16, 16)

style pool_margin_box is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)


################################################################################
## 五、游泳馆独立沙盒初始化与结案出口（零侵入主线好感/失误/存档）
################################################################################

label _pool_init_sandbox(session_save_title):
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
    $ set_ambient("cool")
    return

label _pool_finish_case(local_mistakes=0):
    $ _lk_final_mistakes = max(0, int(local_mistakes or 0))
    $ _lk_rec = pool_record_solve(_lk_final_mistakes)
    hide screen pool_lap_banner
    hide screen evidence_book
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen pool_result_card(_lk_rec["last_tier"], _lk_rec["best_tier"], _lk_final_mistakes, _lk_rec["best_mistakes"], _lk_rec["replays"], _lk_rec["new_record"], _lk_rec["is_first"])
    $ persistent.extras_tab = "pool"
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 六、游泳馆更衣柜 SW-01：《错位的二十三号钥匙》
################################################################################

label pool_locker_case:
    call _pool_init_sandbox("游泳馆更衣柜 · SW-01 错位的二十三号钥匙")
    $ _lk_mistakes = 0
    $ _lk_laps = 0
    $ _lk_s1 = False
    $ _lk_s2 = False
    $ _lk_s3 = False
    $ _lk_s4 = False
    $ _lk_s5 = False
    $ _lk_s6 = False
    $ _lk_replays = pool_get_record()["replays"]
    $ _lk_best_text = pool_render_view()["best_line"]

    scene bg black with fade
    $ play_bgm(bgm_daily, fadein=1.5)
    centered "{size=+6}游泳馆更衣柜 · LOCKER ROOM SW-01{/size}\n\n{size=+14}错位的二十三号钥匙{/size}\n\n{color=#7fd0e6}周四 17:05 · 室内游泳馆 · 区游泳赛前一天{/color}"

    scene bg hall at bg_kenburns_in
    $ set_ambient("cool")
    show screen evidence_book
    with dissolve

    play sound se_footstep
    "周四傍晚，室内游泳馆的玻璃顶上蒙着一层水汽。氯水的味道一路飘进门厅，连墙边那排储物格都是潮乎乎的。"
    "明天就是区游泳赛。学生会派小林来给游泳社的赛前计时赛做记录，张子谦负责巡场；艾丽丝说万事屋理应来加油，其实是嫌一个人守社团太无聊。"
    "我们在看台上坐了一个钟头，看游泳社的人一趟一趟地游。浅水那边的 1、2 道，高一的补测组也在一圈一圈地练。"
    "墨墨在本子上画了一排小小的浪花，每有人游完一个来回，就添一朵。"
    "五点零五分，训练结束的哨声刚落，女更衣区那边就传来一阵骚动。"
    show alice shock at left
    show mo think at right
    gulan "打不开……我的柜子打不开了。"
    "站在 23 号柜前的，是游泳社队长、高二的顾澜。她的头发还在滴水，手腕上的弹簧手环挂着一枚圆圆的「23」号牌，钥匙却连锁孔都插不进去。"
    geayi "让开让开，我来。"
    "管理员葛阿姨拎着一大串总钥匙走过来，三两下就打开了 23 号柜。衣服叠得整整齐齐，书包也在。顾澜翻了一遍，脸一下子白了。"
    gulan "队帽……我的队帽不见了。"
    "那是一顶布面的旧队帽，深蓝色，签满了已经毕业的学姐们的名字。顾澜说，明天的区赛，她只戴这一顶。"
    geayi "钥匙开不了自己的柜子，柜子里还少了东西——这是有人动了钥匙！我在这儿管了九年游泳馆，头一回出这种事。"
    geayi "我这就去报学校。课外开放，先停了再说！"
    show huang think at center
    huang "葛阿姨，先别急。"
    "带队的黄老师从泳池那边赶过来，脖子上还挂着哨子。"
    huang "补测组还在水里，1、2 道的孩子们要游到五点半。东西是在馆里不见的，就先在馆里查清楚——到底是谁动了钥匙。"
    "顾澜攥着那只开不了门的手环，咬着嘴唇，一句话也没说。"
    play sound se_write
    mo_note "钥匙没有丢。它只是挂错了地方。"
    show alice smile at left
    alice "葛阿姨、黄老师，这单万事屋接了！离补测结束还有二十五分钟——本社长倒要看看，是谁让一把钥匙走错了门！"
    geayi "……行，就二十五分钟。更衣区、看台、器材室，你们随便看。"

label pool_case_investigate:
    if _lk_s1 and _lk_s2 and _lk_s3 and _lk_s4 and _lk_s5 and _lk_s6:
        jump pool_case_review_intro

    menu:
        "离补测结束还有二十五分钟。六处可疑的地方，先查哪一处？（可随时点击右上角【证据】翻面查看批注）"

        "看看顾澜手腕上那只打不开柜门的手环" if not _lk_s1:
            $ _lk_s1 = True
            scene bg hall
            $ set_ambient("cool")
            show alice think at left
            show mo think at right
            with dissolve
            "顾澜把手环摘下来递给我。是一圈蓝色的弹簧塑料圈，挂着一枚圆圆的「23」号牌，号码牌和钥匙之间连着一只开口的小铁环。"
            geayi "等等，这手环颜色就不对。咱们馆里，1 到 20 号柜配蓝圈，21 到 40 号柜配橙圈。23 号，该是橙的。"
            gulan "16:50 领手环的时候，我只看了一眼号码……游完放松就直接过来了，根本没留意颜色。"
            "我把钥匙翻过来。钥匙柄上压着一行很小的数字：07。"
            mc "号码牌写着 23，钥匙却是 7 号柜的。"
            show alice shock at left
            alice "那顾澜学姐手里这把，开的其实是 7 号柜？"
            "墨墨凑过来，用指甲轻轻拨了拨那只挂号码牌的小铁环。铁环的开口处有一道新刮痕，像是被人掰开过、又捏了回去。"
            "铁环的缝里，还卡着一小截深蓝色的棉线——崭新的，连毛头都还没散开。"
            play sound se_write
            mo_note "号码牌没有说谎。它只是被挂到了别的钥匙上。"
            $ pool_inspect_spot("s1")
            jump pool_case_investigate

        "去计时台，找小林看看计时赛的记录" if not _lk_s2:
            $ _lk_s2 = True
            scene bg corridor
            $ set_ambient("cool")
            show alice think at left
            show lin neutral at center
            show mo think at right
            with dissolve
            "泳池边的计时台上摆着一只塑料篮。小林端端正正地坐在后面，面前摊着计时表，手边一块秒表。"
            lin "游泳社的规矩：计时赛不许戴手环下水，怕刮到水线。下水前，八个人的手环都放进这只篮子，游完再按号码领回去。"
            alice "计时赛是几点到几点？"
            lin "16:32 开始，16:50 结束，比原计划早了十分钟。这期间，我一步也没离开过计时台。"
            play sound se_page
            "小林把计时表翻到背面。她的字一笔一画，像印出来的一样。"
            "「16:36，高一女生一名（扎两个丸子头），称替顾澜学姐取毛巾，取走 23 号手环。」"
            "「16:44，23 号手环送回。」"
            lin "每次有人动篮子，我都会数一遍。篮子里从头到尾都是八只手环，一只不少。"
            lin "我只核号码牌。手环是蓝是橙，计时表上没有这一栏。"
            lin "除了那个女生，计时赛期间再没有人碰过篮子。16:50 大家按号码领回手环，顾澜领走的是 23 号。"
            mc "毛巾呢？她真的拿来了吗？"
            lin "拿来了，搭在 4 道边的长凳上。我还以为是顾澜让她去的。"
            show alice smile at left
            alice "八只手环一只不少，号码也对得上——可顾澜学姐领回去的那一只，偏偏开不了 23 号柜。"
            play sound se_write
            mo_note "篮子里的数没有少。变了的，是号码牌底下的那把钥匙。"
            $ pool_inspect_spot("s2")
            jump pool_case_investigate

        "去游泳社活动室，问问那顶旧队帽" if not _lk_s3:
            $ _lk_s3 = True
            scene bg clubroom
            $ set_ambient("cool")
            show alice think at left
            show huang think at center
            show mo think at right
            with dissolve
            "游泳社的活动室就在泳池隔壁，墙上挂着一排奖状，白板上密密麻麻写着明天区赛的分组。黄老师站在门口，隔着玻璃还盯着 1、2 道。"
            huang "那顶帽子我知道。顾澜高一第一次比赛，毕业的学姐们一人在上面签了一个名字送给她。布面的，戴了两年，早就旧了。"
            play sound se_page
            "黄老师指了指白板的角落。上周写下的一行字还没擦：「顾澜：队帽侧缝开线，赛前换新。」"
            huang "侧缝开了三指宽的口子，比赛的时候进水、兜阻力。我让她换一顶新的，她不肯。"
            show alice shock at left
            alice "所以她一直把它锁在柜子里，只打算明天戴？"
            huang "嗯。平时训练，她戴的是硅胶帽。"
            "我想起葛阿姨打开 23 号柜时的样子：衣服叠得整整齐齐，书包也好好的——只有柜底，落着两截短短的白线头。"
            mc "那两截白线头，是帽子侧缝上原来的线。有人在柜门前，把开了线的线头剪齐了。"
            show alice think at left
            alice "偷东西的人，会先替它把线头剪干净吗？"
            play sound se_write
            mo_note "拿走它的人，先替它收拾了伤口。"
            $ pool_inspect_spot("s3")
            jump pool_case_investigate

        "去门口的入场卡夹，翻一翻课外来游泳的记录" if not _lk_s4:
            $ _lk_s4 = True
            scene bg hall
            $ set_ambient("cool")
            show alice smile at left
            show mo think at right
            with dissolve
            "游泳馆门口挂着一只木头卡夹。课外来游泳的人，进门要在自己的入场卡上打一个孔。"
            geayi "一次一个孔，打满二十个换新卡。都是些常来的孩子，我闭着眼都认得。"
            "卡夹里插着十几张卡。其中一张，两个礼拜就打了十一个孔，卡角都磨软了。卡上写着：高一(5)班，方小鲤。"
            geayi "这孩子啊，怕水。五十米补测挂了三回，这两个礼拜天天来，一来就泡在浅水的 1 道。"
            geayi "顾澜每天练完都不走，留下来教她换气。一个教，一个学，天天弄到我锁门。"
            alice "她平时用哪个柜子？"
            geayi "7 号。说是幸运数字，回回都用 7 号，旁边空着也不用。"
            show alice shock at left
            alice "7 号……"
            geayi "今天补测原定 17:20 开始。黄老师见计时赛提前收了尾，16:50 就把补测组叫下了水。"
            play sound se_write
            mo_note "两个礼拜，十一个孔。有人一直在等，等自己游得过去的那一天。"
            $ pool_inspect_spot("s4")
            jump pool_case_investigate

        "跟着张子谦去看台最后一排看看" if not _lk_s5:
            $ _lk_s5 = True
            scene bg corridor
            $ set_ambient("cool")
            show alice think at left
            show zhang think at center
            show mo think at right
            with dissolve
            play sound se_footstep
            "张子谦巡场回来，冲我们招招手，领着我们沿着看台的台阶一路走到最后一排。"
            zhang "我五点巡到这儿，在长椅底下捡到这些。还以为是谁的线头掉了。"
            "他摊开手心：几截剪下来的深蓝色棉线头，还有一枚小小的铝片穿针器。"
            show alice shock at left
            alice "深蓝色的线——跟卡在 23 号牌小铁环里的那截，一模一样！"
            mc "是新剪的，剪口还是齐的。"
            "长椅上留着一圈半干的水印，像是有人披着湿毛巾在这儿坐了好一阵。"
            "我站到那圈水印的位置往下看。正对着的，是泳池最靠边的 1、2 道——补测组热身、此刻正在游的地方。"
            zhang "这一排离计时台最远。计时赛那会儿大家都盯着 4 道看，没人往这儿瞧。"
            play sound se_write
            mo_note "在这里缝东西的人，一边缝，一边看着 1 道。"
            $ pool_inspect_spot("s5")
            jump pool_case_investigate

        "去器材室，数一数备用泳帽箱" if not _lk_s6:
            $ _lk_s6 = True
            scene bg storeroom
            $ set_ambient("cool")
            show alice think at left
            show mo think at right
            with dissolve
            "器材室里堆着浮板和水线卷轴。门边放着一只塑料箱，上面贴着葛阿姨手写的条子：「备用泳帽，借一顶记一笔。」"
            geayi "黄老师的规矩，不戴泳帽不许下水。忘带帽子的，来我这儿借一顶。"
            "箱子里整整齐齐码着十二顶灰色硅胶帽。借用登记本上，今天这一页是空的。"
            alice "一顶都没借出去……那补测组的人，都带了自己的帽子？"
            geayi "都戴着呢。我站在池边看着她们下的水，七个人，七顶帽子。"
            geayi "就是 1 道那个孩子，戴的帽子怪旧的，深蓝色，侧面写满了字——我还当是哪个学姐借给她的。"
            show alice shock at left
            alice "深蓝色、写满了字……"
            play sound se_write
            mo_note "一顶帽子也没有借出去。可水里，多了一顶不是她的帽子。"
            $ pool_inspect_spot("s6")
            jump pool_case_investigate

label pool_case_review_intro:
    scene bg corridor
    $ set_ambient("cool")
    $ play_bgm(bgm_mystery, fadein=1.2, fadeout=0.8)
    show alice smile at left
    show mo neutral at right
    with dissolve

    "六处线索全部查完，离补测结束还有十分钟。泳池那边一声哨响，1 道又有人蹬壁出发了。"
    "墨墨在本子上画了一条长长的泳道，分成四段，一段一段标上泳姿：蝶泳、仰泳、蛙泳、自由泳。"
    play sound se_write
    mo_note "像混合泳一样。四段游完，才算到岸。"
    alice "那就一段一段游！钥匙是怎么错的、什么时候错的、帽子去了哪、是谁戴着它——四段游完，真相就靠岸了！"
    if _lk_replays > 0:
        sysmsg "【更衣柜 · 重玩挑战】当前历史最佳：[_lk_best_text]。零失误游完混合泳四段，就能摘下金浪花。"
    else:
        sysmsg "【更衣柜 · 混合泳四段】依次选出「手法 → 时机 → 去向 → 戴帽人」。零失误可获金浪花评级，失误只计入本案评级，不影响主线。"

label pool_lap_k1:
    show screen pool_lap_banner(0, "蝶泳段 · 手法：蓝手环、钥匙柄上的 07、被掰开过的小铁环——钥匙是怎么错位的？")
    menu:
        "有人趁乱偷配了一把 23 号钥匙":
            hide screen pool_lap_banner
            $ _lk_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "偷配钥匙得拿到校外的配钥匙摊，一来一回少说半个钟头。再说，偷配的钥匙怎么会挂在蓝手环上、柄上还压着 07 呀？"
            play sound se_write
            mo_note "钥匙没有变。变的，是挂在上面的牌子。"
            jump pool_lap_k1

        "钥匙在池水里泡久了生锈，把锁芯卡死了":
            hide screen pool_lap_banner
            $ _lk_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "葛阿姨的总钥匙一插就开，锁一点没坏。顾澜学姐这把钥匙柄上压的是 07，它本来就不是 23 号柜的钥匙呀。"
            play sound se_write
            mo_note "锁没有坏。是钥匙走错了门。"
            jump pool_lap_k1

        "有人把「23」号牌换到另一把钥匙上，再把它送回了篮子":
            hide screen pool_lap_banner
            play sound se_correct
            $ _lk_laps = 1

    mc "「23」号牌挂在蓝手环上，钥匙柄却压着 07——1 到 20 号柜才配蓝手环。挂号码牌的小铁环被掰开过，缝里还卡着新棉线。钥匙没有被偷，也没有被偷配：有人把「23」号牌换到了另一把钥匙上，再把它送回篮子，所以小林数来数去，始终是八只。"

label pool_lap_k2:
    show screen pool_lap_banner(1, "仰泳段 · 时机：篮子里始终八只、23 号手环只离开过一次——帽子是什么时候被取走的？")
    menu:
        "16:36 到 16:44，计时赛里 23 号手环离开篮子的那一段":
            hide screen pool_lap_banner
            play sound se_correct
            $ _lk_laps = 2

        "17:05 训练结束、大家挤在更衣区换衣服的时候":
            hide screen pool_lap_banner
            $ _lk_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "17:05 顾澜学姐一走到 23 号柜前，就已经打不开柜门了呀——钥匙早在那之前就被换掉了。"
            play sound se_write
            mo_note "她回来的时候，钥匙已经错了。"
            jump pool_lap_k2

        "16:00 训练开始以前，柜子还没锁好的时候":
            hide screen pool_lap_banner
            $ _lk_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "顾澜学姐是亲手锁的柜门，那时候钥匙还开得开。小林的计时表上，23 号手环只离开过篮子一次。"
            play sound se_write
            mo_note "她锁门的时候，一切都还对得上。"
            jump pool_lap_k2

    mc "计时赛期间手环都在篮子里。小林的计时表写得清清楚楚：16:36，23 号手环被取走；16:44，送回——这是 23 号钥匙唯一一次离开篮子。23 号柜底那两截剪齐的旧线头说明，帽子就是在这段时间里，在柜门前被取走、剪好线头的。"

label pool_lap_k3:
    show screen pool_lap_banner(2, "蛙泳段 · 去向：剪齐的旧线头、看台上的深蓝线、一顶也没借出的备用泳帽——队帽此刻在哪里？")
    menu:
        "被扔进了更衣区的垃圾桶":
            hide screen pool_lap_banner
            $ _lk_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "有人剪线头、穿针、在看台上一针一针地缝——费这么大劲，可不是为了把它扔掉呀。"
            play sound se_write
            mo_note "被人缝好的东西，不会被扔掉。"
            jump pool_lap_k3

        "戴在 1 道补测的女孩头上，此刻正在水里":
            hide screen pool_lap_banner
            play sound se_correct
            $ _lk_laps = 3

        "锁进了 7 号柜，等没人的时候再拿走":
            hide screen pool_lap_banner
            $ _lk_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "可 7 号柜的钥匙，16:50 以后一直戴在顾澜学姐手上呀——手里攥着真 23 号钥匙的人，自己反倒开不了 7 号柜。"
            play sound se_write
            mo_note "她锁住的，是她自己的柜子。"
            jump pool_lap_k3

    mc "开线的侧缝被人剪齐旧线头，又在看台最后一排用深蓝线一针一针缝好——那一排正对补测的 1、2 道。备用泳帽一顶也没借出去，补测组却七个人都戴着帽子下了水：1 道那顶深蓝色、写满字的旧帽子，就是顾澜的队帽。它此刻正在水里。"

label pool_lap_k4:
    show screen pool_lap_banner(3, "自由泳段 · 戴帽人：钥匙柄上的 07、回回只用 7 号柜的入场卡、丸子头的高一女生——是谁？")
    menu:
        "副队长——她最清楚队帽锁在哪个柜子":
            hide screen pool_lap_banner
            $ _lk_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "副队长整场都在 5 道游计时赛，小林的表上，她一次也没碰过篮子。"
            play sound se_write
            mo_note "知道帽子在哪的人很多。腕上挂着「7」号牌的，只有一个。"
            jump pool_lap_k4

        "回回只用 7 号柜、天天来练换气的高一新生方小鲤":
            hide screen pool_lap_banner
            play sound se_correct
            $ _lk_laps = 4
            show screen deduction_cutin(headline=_("混合泳四段，到岸 ——！"), subline="THE MISPLACED KEY")
            with flash_shutter

        "管理员葛阿姨——只有她有总钥匙":
            hide screen pool_lap_banner
            $ _lk_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "葛阿姨的总钥匙一串从不离身，她用不着去掰号码牌的小铁环呀。何况，是她亲手打开 23 号柜帮顾澜学姐找的。"
            play sound se_write
            mo_note "有总钥匙的人，用不着换号码牌。"
            jump pool_lap_k4

    mc "顾澜手里的钥匙刻着 07，开的是 7 号柜。入场卡夹里，回回只用 7 号柜、天天跟顾澜学换气、补测挂了三次的，是高一(5)班的方小鲤；小林记下的丸子头高一女生，也是她。她把自己的 7 号钥匙交了出去，泳帽也就锁在了柜子里——补测一提前，她只好戴着刚缝好的队帽下了水。"
    show alice happy at left
    alice "四段游完了！走，去 1 道池边——等她游完这一趟，把帽子、钥匙，还有那枚号码牌，一起物归原主。"

label pool_case_resolution:
    scene bg corridor at bg_kenburns_in
    $ set_ambient("cool")
    $ play_bgm(bgm_warm, fadein=1.5, fadeout=1.0)
    show alice smile at left
    show mo smile at right
    with dissolve

    play sound se_footstep
    "五点二十八分，1 道的最后一组到了岸。黄老师按停秒表，冲水里比了一个大拇指。"
    "从水里爬上来的女孩扎着两个丸子头，摘下泳镜的时候，眼睛红红的——不知道是氯水，还是别的什么。"
    "她头上戴着一顶深蓝色的布面泳帽。侧面写满了名字，侧缝上多了一道细细密密的新针脚。手腕上套着一只橙色的手环，挂着「7」号牌。"
    huang "五十米，一次没扶池壁。方小鲤，补测通过。"
    xiaoli "……过、过了？"
    "她愣了一下，转过身，正好看见站在池边的顾澜。笑容一下子僵在了脸上。"
    xiaoli "学姐……对不起。帽子是我拿的。"
    gulan "小鲤？"
    xiaoli "我、我本来想缝好了就放回去的。"
    "她把帽子摘下来，双手捧着递过去。帽子还在滴水，侧缝那道三指宽的口子，已经被深蓝色的线一针一针收拢了。"
    mc "能从头讲讲吗？"
    xiaoli "两个礼拜前，学姐第一次教我换气。我呛了水，抓着她的帽子才没沉下去——就是那时候，看见侧缝开线了。"
    xiaoli "我说帮她缝，学姐说不用，比赛戴一次就收起来了。可我听黄老师说过，开线的帽子进水、兜阻力……"
    xiaoli "我家是开裁缝铺的。我想，明天比赛之前悄悄给学姐缝好，就当是谢谢她。"
    xiaoli "可帽子锁在柜子里。计时赛的时候，大家的手环都放在篮子里，我就……说替学姐拿毛巾，把 23 号手环拿走了。"
    "她打开 23 号柜，取出帽子，顺手拿上了顾澜的毛巾——好让自己说过的话不算撒谎。她在柜门前剪齐了开线的旧线头，又用自己的钥匙打开 7 号柜，取出针线包。"
    xiaoli "侧缝缝完少说要十几分钟。我答应小林学姐马上送回去，又怕篮子里少一只，一下子就被看出来。"
    xiaoli "要是拿我自己的 7 号手环去顶，号码一看就不对。我就用针尖把号码牌的小铁环撬开，把「23」换到了我的手环上，「7」换到了学姐的手环上。"
    xiaoli "这样篮子里还是一只「23」，我手上留着真正的 23 号钥匙——等缝好了，我就能把帽子放回去，再把牌子换回来。"
    show alice think at left
    alice "所以你送回篮子的那只「23」，其实是你自己 7 号柜的钥匙。"
    xiaoli "……嗯。我坐到看台最后一排去缝，那里没人看。16:49，最后一针刚打好结——"
    xiaoli "黄老师就吹了哨，说补测提前，现在就下水。"
    xiaoli "我换好泳衣就上了看台，帽子想着下水前再去拿。可这时候才想起来，我的泳帽还锁在 7 号柜里——7 号的钥匙，已经挂着「23」的牌子，戴在学姐手上了。"
    show huang think at center
    huang "……不戴泳帽，不许下水。是我定的规矩。"
    xiaoli "这是第四次补测了，学期马上就要结束。再挂一次，我就得等到明年。"
    xiaoli "手里只有学姐的帽子。我想，就借十分钟。学姐教了我两个礼拜换气，戴着她的帽子，说不定……我就游得过去。"
    "她低下头，丸子头上的水一滴一滴落在瓷砖上。"
    show mo think at right
    play sound se_page
    "墨墨走过去，在本子上写了一行字，转过来给她看。"
    play sound se_write
    mo_note "你没有偷走帽子。你只是先替它缝好了伤口，又让它陪你游完了五十米。"
    "方小鲤看着那行字，眼眶一点一点红了。"

    show alice smile at left
    "顾澜接过帽子，手指摸过侧缝上那道新针脚。一针挨着一针，密得像鱼鳞。"
    gulan "高一第一次比赛，我游到一半就游不动了。上岸以后，毕业的学姐们一人在这顶帽子上签了一个名字。"
    gulan "她们说，戴上它，游不动的时候就想想，身后还有人。"
    gulan "……今天，它替我陪你游完了五十米。缝得真好。"
    gulan "明天我就戴它上场。不过侧缝这儿，你也得签一个名字。"
    xiaoli "我？我才刚过补测……"
    gulan "所以才要签。下一个游不动的人，得知道身后还有你。"
    show huang smile at center
    huang "补测通过，是一码事；撬号码牌、换钥匙，是另一码事。"
    huang "罚你下礼拜来帮葛阿姨，把四十个号码牌全换成铆死的，一个也不许再撬得开。"
    geayi "……还报什么学校。明天起号码牌全铆死，手环篮子我亲自看着。"
    geayi "课外开放照旧。这孩子天天来，我要是停了，她上哪儿练去。"
    mc "就这样：一枚换了手环的号码牌，一顶补好的旧队帽，一场提前了半小时的补测。帽子从头到尾，都没有离开过游泳馆。"
    show alice happy at left
    alice "错位的钥匙，物归原位！小鲤，明天区赛你得来看台最后一排加油——那可是你的专座！"
    hide huang
    "顾澜把那只蓝手环递还给方小鲤，方小鲤把橙手环递了回去。两个人蹲在池边，用发卡把小铁环撬开，把「23」和「7」各自换回了原来的位置。"
    "葛阿姨在一旁看着，没出声，只是把那一大串总钥匙往兜里塞了塞。"

    scene bg agency at bg_kenburns_in
    $ set_ambient("warm")
    show alice happy at left
    show mo smile at right
    with dissolve
    play sound se_bell
    "第二天的区游泳赛，顾澜在女子两百米自由泳里游了第二名。她上岸的时候，那顶深蓝色旧队帽的侧缝上，多了一个歪歪扭扭的新名字。"
    "游泳馆的号码牌全换成了铆死的。葛阿姨在入场卡夹旁边贴了一张新条子：「号码牌不许撬，想帮忙的找阿姨。」"
    "放学后，艾丽丝把番外卷宗摊在桌上，又翻开了那本牛皮纸复盘本。"
    alice "卷宗里添了第七桩短案！复盘本也跟着长一页——游泳馆这一页，就叫「错位的二十三号钥匙」。"
    mc "复盘本最早那套只有四枚索引签的旧页面，也该收起来了。"
    alice "对！本社长宣布，四签的旧索引正式退休——以后不管添多少桩，都只翻这一本扩容的！"
    "墨墨翻到最新的一页，在页角画了两只交换了号码牌的小手环，又在它们中间画了一根细细的线，把两枚号码牌连了起来。"
    play sound se_write
    mo_note "换错的东西，总有一天要换回来。换回来之前，先替对方好好保管。"
    show alice smile at left
    alice "好！万事屋推理笔记复盘本，今天正式扩容到七页！"

    call _pool_finish_case(_lk_mistakes)
    return
