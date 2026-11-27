## 《沉默侦探：千纸鹤的约定》—— PC-15 天文社流星夜的失踪望远镜与推理笔记复盘本扩容
## zubenelgenubi_meteor_casebook.rpy
##
## 设计要点：
##   1. 100% 零侵入主线剧情（script.rpy / chapter1..6.rpy / interlude.rpy / definitions.rpy / autoplay.rpy 零改动），
##      PC-10..PC-14 的短案、纪念、复盘本与卷宗模块同样零改动：复盘本扩容只往 PC-13 的页目登记表里追加两页，
##      各页的卷宗、勘查点、推理链与存档都由 PC-13 的只读渲染函数在运行期按名字读取。
##   2. 「天文社流星夜的失踪望远镜」（screen extras_astro_telescope + 可重玩短案 label astro_telescope_case）：
##      双子座流星雨极大的周五夜里，天文社在主教学楼天台办流星夜，社里唯一一台折射望远镜在热可可中场后只剩空三脚架；
##      带队的黄老师限十点散场前找回，否则天文社的夜间观测一律取消。
##      六处勘查点（空三脚架、流星记录表、楼梯口出入登记、茉莉味的热可可、南门草坪的镜头盖、缺了一支的红光手电），
##      推理链是「连起四颗星」：手法 → 去向 → 时机 → 掌镜人。每颗星三选一、各配一种冬夜亮星的颜色，选错只给温柔提示、
##      只计入本地 _at_mistakes，绝不触碰主线 fail_count / 好感；结案按失误数评定金 / 银 / 铜牌并保存历史最佳纪录，
##      可无限重玩刷新纪录，持久化于 persistent.astro_telescope_record。
##      真相完全写实（卸镜步骤、记录表上的极限星等与路灯光害、锁门的开水房与茉莉花茶、草坪上的镜头盖和三脚架小坑、
##      替人亮着的红光手电），没有任何超自然要素。
##   3. 防剧透联动：墨墨在本案页边的续批、复盘本新增两页的页边续批，都严格经 truth_spoiler_unlocked() 零侧信道遮罩，
##      与复盘本、合照相册、案卷等共用同一个「解锁剧透 / 恢复遮罩」开关。
##   4. 推理笔记复盘本扩容（screen extras_casebook_expanded）：收录鬼屋案与本案，由四页扩为六页。
##      PC-13 的 notebook_render_page / notebook_page_modal 等只读渲染原样复用（直接读各案 persistent 字段、快照比对零写入），
##      新页面改用 3 × 2 索引签网格；PC-13 的四签单行页面保留不动，鉴赏页的「复盘」分页改由本页面承载。
##      复盘本自己仍只写 persistent.case_notebook_record；PC-13 成就「推理笔记的复盘人」仍按原四页盖满颁发。
##   5. 本文件按文件名排在 zoetrope_shadow_folio.rpy 之后初始化，双成就追加在 PC-14 之后，成就页扩展为 2×18 = 36 枚。

# —— PC-15 天文社 UI 图标命名别名（128x128 RGBA 透明底）——
image ui_icon_astro_club        = "images/ui/icon_astro_club.png"
image ui_icon_missing_telescope = "images/ui/icon_missing_telescope.png"
image ui_icon_meteor_chart      = "images/ui/icon_meteor_chart.png"
image ui_icon_lens_cap          = "images/ui/icon_lens_cap.png"
image ui_icon_star_lamp         = "images/ui/icon_star_lamp.png"

# —— PC-15 新登场的角色（暂无立绘：说话时舞台上的立绘自动恢复常亮，与警察、主持人等无立绘角色同一套规则）——
define jiyao = Character("季遥", color="#9fc4f0", who_outlines=[(1, "#000")])
define xiaohe = Character("沈小禾", color="#f4c6a0", who_outlines=[(1, "#000")])
define laowei = Character("魏师傅", color="#c8b48c", who_outlines=[(1, "#000")])

init python:

    # 动态注册 PC-15 双成就，使鉴赏室成就页扩展为 2×18（共 36 枚）严整偶数列对称排布
    if "register_extra_achievement" in globals():
        register_extra_achievement(
            "ach_astro_telescope",
            "流星夜的寻镜人",
            "解开天文社流星夜失踪望远镜之谜。",
            False,
        )
        register_extra_achievement(
            "ach_first_magnitude",
            "一等星的观星侦探",
            "零失误连起四颗星，拿下金牌。",
            False,
        )

    ############################################################################
    ## 一、天文社流星夜的失踪望远镜（1 桩可重玩短案 · 6 处勘查点 · 连起四颗星 · 金银铜牌评级）
    ############################################################################

    ASTRO_CASE = {
        "id": "mn1",
        "code": "MN-01",
        "label": "astro_telescope_case",
        "title": "天文社流星夜的失踪望远镜",
        "short_title": "流星夜的空三脚架",
        "time_tag": "周五 21:25 · 主教学楼天台 · 双子座流星雨极大夜",
        "companions": "艾丽丝 · 墨墨 · 小林 · 张子谦",
        "bg_key": "rooftop",
        "bg_thumb": "images/bg_rooftop.png",
        "lighting_note": "天台夜色 → 南门路灯 → 万事屋暖灯（rooftop / gate / agency）",
        "spoiler": False,
        "summary_pub": (
            "双子座流星雨极大的周五夜里，天文社在主教学楼天台办流星夜：二十个人躺在防潮垫上数流星，"
            "社里唯一一台像样的折射望远镜轮流看木星。21:20 热可可中场结束，社长季遥回到望远镜前——三脚架还立着，镜筒却不见了。"
            "天台只有一道门，学生会的小林整晚守着登记出入；带队的黄老师说，十点散场前找不回望远镜，天文社以后的夜间观测一律取消。"
        ),
        "solution_pub": (
            "结案报告：望远镜没有被偷，也从没离开过学校。高一新社员沈小禾在热可可中场按卸镜步骤取下镜筒，装进软包带下楼，"
            "在南门门卫室外的草坪上架好，让守着南门走不开、下周就要退休的夜班门卫魏师傅，亲眼看了一次土星的光环。"
            "她要赶回天台记下半场，只好把望远镜托魏师傅保管；又怕社长那条「望远镜不下天台」的规矩，谁也没敢告诉。"
        ),
        "mo_note_pub": "墨墨现场手记：「守了一辈子夜的人，也该看清一次星星。」",
        "alice_note_pub": "艾丽丝结案批注：「流星夜案告破！犯人沈小禾罚她明年当流星夜总领队——最后十分钟，全社搬去南门草坪数！」",
        "margin_secret": (
            "续批：墨墨在这一页的角上，画了一架只有虚线轮廓的望远镜。她写：四年前那个冬天，小雪侦探也答应过周可，"
            "要一起看一场流星雨；那一场，她们没能看成。所以今晚，她很想让别人的约定赶得上。"
        ),
    }

    ASTRO_MASK_NOTICE = "【防剧透火漆：墨墨在这一案页边的续批涉终章旧约，通关 TRUE END 或点击上方「解锁剧透」后显影】"

    ASTRO_SPOTS = [
        {
            "id": "s1",
            "code": "MS-01",
            "label": "空三脚架",
            "where": "天台东侧 · 观测区",
            "keeper": "季遥",
            "scene": "rooftop",
            "icon": "images/ui/icon_missing_telescope.png",
            "surface": "三脚架还稳稳立在天台东侧，云台上却空了：镜筒、寻星镜和装镜筒的黑色长软包，一起不见了。",
            "detail": (
                "现场手记：云台被放平到水平位置、锁紧，夹镜筒的燕尾槽旋钮拧松了整整两圈——正是天文社第一节社课教的卸镜步骤："
                "先放平，再松夹，双手托住镜筒。三条腿底下的防滑垫一块也没挪过。排队看木星的名单上，最后一个签名写着 20:48。"
            ),
            "evidence": "空三脚架：先放平再松夹，按卸镜步骤取走镜筒与软包；20:48 仍有人看木星",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "s2",
            "code": "MS-02",
            "label": "流星记录表",
            "where": "天台入口 · 记录板夹",
            "keeper": "季遥",
            "scene": "rooftop",
            "icon": "images/ui/icon_meteor_chart.png",
            "surface": "二十张流星记录表夹在记录板上，每十分钟一格：流星数、极限星等、遮挡与光害。",
            "detail": (
                "现场手记：中场休息的 21:00 和 21:10 两格，十九张表都空着，只有 7 号观测员还在记。可这两格记的已经不是天台上的天空："
                "极限星等从 5.0 掉到 4.0，遮挡一栏写着「北侧楼体约三成」，光害一栏写着「路灯」。天台四面空旷，抬头看不见一盏路灯。"
            ),
            "evidence": "流星记录表：中场只有 7 号在记，极限星等 4.0，北侧楼体遮挡、路灯光害",
            "observer": "墨墨（现场手记）",
        },
        {
            "id": "s3",
            "code": "MS-03",
            "label": "楼梯口出入登记",
            "where": "天台门口 · 登记桌",
            "keeper": "小林",
            "scene": "corridor",
            "icon": "images/ui/icon_evidence_tag.png",
            "surface": "学生会规定夜间活动登记出入。小林守在天台门口，一笔一笔记下谁上、谁下、几点、带了什么。",
            "detail": (
                "现场手记：20:52，7 号观测员下楼，事由「去一楼开水房打热水」，携带保温壶一只、黑色长条软包一只（自述：防潮垫）；"
                "21:18，7 号回到天台，只带着保温壶。20:00 到 21:20 再没有别人上下楼，黄老师一直坐在门口。天台上二十张防潮垫，一张不少。"
            ),
            "evidence": "出入登记：7 号 20:52 带长软包下楼，21:18 只带保温壶回来，防潮垫不少",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "s4",
            "code": "MS-04",
            "label": "茉莉味的热可可",
            "where": "天台西侧 · 热可可桌",
            "keeper": "艾丽丝",
            "scene": "rooftop",
            "icon": "images/ui/icon_tea_party_cup.png",
            "surface": "21:20 冲好的热可可，用的是 7 号带回来的那壶热水。艾丽丝喝了一口，皱起了眉头。",
            "detail": (
                "现场手记：可可底下浮着一缕淡淡的茉莉花茶味。一楼开水房的门上贴着告示「周五 20:30 闭房」，7 号下楼时那里早就锁了。"
                "整个学校晚上还烧着热水、又一年四季只泡茉莉花茶的，只有南门夜班门卫室魏师傅的那只大铝壶。"
            ),
            "evidence": "茉莉味热可可：开水房 20:30 已锁，热水带着南门门卫室的茉莉花茶味",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "s5",
            "code": "MS-05",
            "label": "草坪上的镜头盖",
            "where": "南门门卫室外 · 草坪",
            "keeper": "张子谦",
            "scene": "gate",
            "icon": "images/ui/icon_lens_cap.png",
            "surface": "张子谦巡逻时，在南门门卫室外的草坪上捡到一只黄铜包边的镜头盖，背面贴着一颗星星贴纸。",
            "detail": (
                "现场手记：镜头盖正好扣得上天文社镜筒的物镜，星星贴纸和三脚架腿上贴的是同一款。它压着的草叶也挂满露水——"
                "是今晚起露以后才掉下的。旁边的草坪上还有三个浅浅的小圆坑，排成一个三角形，像有一副小三脚架在这里立过。"
            ),
            "evidence": "南门镜头盖：物镜盖落在门卫室外的湿草上，旁有三个排成三角形的小坑",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "s6",
            "code": "MS-06",
            "label": "缺了一支的红光手电",
            "where": "天台门口 · 手电收纳盒",
            "keeper": "墨墨",
            "scene": "rooftop",
            "icon": "images/ui/icon_star_lamp.png",
            "surface": "天文社给每位观测员发一支包着红色玻璃纸的手电，编好号，中场收回来换电池。7 号的格子是空的。",
            "detail": (
                "现场手记：红光不会破坏眼睛的暗适应，看完记录表再抬头，星星还在——所以天文社的夜里只许用红光。7 号说手电"
                "「不知道丢哪了」。可从天台南侧的围栏往下看，南门门卫室的窗台上亮着一点暗暗的红光，一整晚都没灭。"
            ),
            "evidence": "红光手电：7 号的格子空着，南门门卫室窗台上亮着同样的一点红光",
            "observer": "墨墨（现场手记）",
        },
    ]

    _ASTRO_SPOT_BY_ID = {s["id"]: s for s in ASTRO_SPOTS}

    # 连起四颗星：推理链每一环各配一颗冬夜亮星的颜色（参宿七蓝白 / 五车二金黄 / 毕宿五橙 / 参宿四红）
    ASTRO_STARS = [
        {"name": "参宿七", "color": "#8fb6ff"},
        {"name": "五车二", "color": "#f2d27a"},
        {"name": "毕宿五", "color": "#f09a4a"},
        {"name": "参宿四", "color": "#e5624f"},
    ]

    ASTRO_STAR_LINKS = [
        {
            "id": "k1",
            "step": "第一颗星",
            "name": "手法",
            "star": "参宿七",
            "color": "#8fb6ff",
            "short": "按卸镜步骤装包带走",
            "full": (
                "云台先放平、再松夹，正是天文社第一节社课教的卸镜步骤——外人不会这样做，大风也拧不开旋钮。7 号下楼时背着一只黑色长条软包，"
                "说是防潮垫，可天台上二十张防潮垫一张不少：那只软包里装的，是被小心卸下来的镜筒。"
            ),
        },
        {
            "id": "k2",
            "step": "第二颗星",
            "name": "去向",
            "star": "五车二",
            "color": "#f2d27a",
            "short": "南门门卫室外的草坪",
            "full": (
                "7 号中场还在记流星，记下的却是北侧楼体遮挡和路灯光害——那是地面上、楼的南边；她带回来的热水有茉莉花茶味，"
                "只可能来自南门门卫室那只大铝壶；镜头盖和排成三角形的小坑落在门卫室外的草坪上，窗台上还亮着一点红光。望远镜去了南门。"
            ),
        },
        {
            "id": "k3",
            "step": "第三颗星",
            "name": "时机",
            "star": "毕宿五",
            "color": "#f09a4a",
            "short": "20:52 到 21:18 的中场",
            "full": (
                "20:48 还有人在排队看木星，21:20 社长就发现镜筒不见了；这中间只有 7 号在 20:52 下过楼。开水房 20:30 就锁了门，"
                "来回五分钟的路，她走了二十六分钟——望远镜，是在热可可中场被带下楼的。"
            ),
        },
        {
            "id": "k4",
            "step": "第四颗星",
            "name": "掌镜人",
            "star": "参宿四",
            "color": "#e5624f",
            "short": "7 号观测员沈小禾",
            "full": (
                "记录表上的 7 号、登记表上的 7 号、收纳盒里空着的 7 号手电格子，指向同一个人——高一新社员沈小禾。她学过卸镜步骤，"
                "也认识南门夜班的魏师傅；她把望远镜带下楼，是为了让一个守在门口走不开的人，亲眼看一次天上的东西。"
            ),
        },
    ]

    ASTRO_RATING_TIERS = [
        {"key": "gold",   "name": "金牌", "title": "流星夜名侦探", "rule": "零失误",         "max_mistakes": 0},
        {"key": "silver", "name": "银牌", "title": "观星推理员",   "rule": "失误 1～2 次",    "max_mistakes": 2},
        {"key": "bronze", "name": "铜牌", "title": "见习观星",     "rule": "失误 3 次及以上", "max_mistakes": 999},
    ]

    _ASTRO_TIER_BY_KEY = {t["key"]: t for t in ASTRO_RATING_TIERS}
    _ASTRO_TIER_RANK = {"gold": 3, "silver": 2, "bronze": 1}

    # 在证物簿里登记六处勘查点的翻面批注（与委托信箱、闭馆图书馆、雨夜剧场、美术室、失物箱、鬼屋同一套 register_evidence_detail 机制）
    if "register_evidence_detail" in globals():
        for _ats in ASTRO_SPOTS:
            register_evidence_detail(_ats["evidence"], _ats["observer"], _ats["detail"])

    def astro_tier_def(tier_key):
        return _ASTRO_TIER_BY_KEY.get(tier_key, ASTRO_RATING_TIERS[-1])

    def astro_rate(mistakes_count=0):
        """按本局失误数评定评级：0 次金牌，1～2 次银牌，3 次及以上铜牌。"""
        m = max(0, int(mistakes_count or 0))
        for tier in ASTRO_RATING_TIERS:
            if m <= tier["max_mistakes"]:
                return tier
        return ASTRO_RATING_TIERS[-1]

    def astro_get_spot(spot_id):
        return _ASTRO_SPOT_BY_ID.get(spot_id, ASTRO_SPOTS[0])

    def _ensure_astro_store():
        if not isinstance(getattr(persistent, "astro_telescope_record", None), dict):
            persistent.astro_telescope_record = {}
        return persistent.astro_telescope_record

    def astro_get_record():
        raw = _ensure_astro_store()
        last_tier = raw.get("last_tier")
        return {
            "solved": bool(raw.get("solved", False)),
            "replays": save_int(raw.get("replays"), 0),
            "best_tier": casefile_best_key(raw),
            "last_tier": last_tier if isinstance(last_tier, str) and last_tier in _ASTRO_TIER_RANK else None,
            "best_mistakes": save_int(raw.get("best_mistakes")),
            "last_mistakes": save_int(raw.get("last_mistakes")),
            "inspected": [s for s in (raw.get("inspected") or []) if s in _ASTRO_SPOT_BY_ID],
            "report_viewed": bool(raw.get("report_viewed", False)),
        }

    def _astro_write(updates):
        store_dict = dict(_ensure_astro_store())
        store_dict.update(updates)
        persistent.astro_telescope_record = store_dict
        return store_dict

    def astro_case_solved_count():
        return 1 if astro_get_record()["solved"] else 0

    def astro_gold_count():
        return 1 if astro_get_record()["best_tier"] == "gold" else 0

    def astro_best_short():
        """案卷与鉴赏页使用：历史最佳评级，未结案时显示「待结案」。"""
        rec = astro_get_record()
        return astro_tier_def(rec["best_tier"])["name"] if rec["best_tier"] else "待结案"

    def astro_select_spot(spot_id):
        sdef = astro_get_spot(spot_id)
        persistent.astro_selected_spot = sdef["id"]
        renpy.save_persistent()

    def astro_inspect_spot(spot_id):
        """剧场内勘查一处：证物入簿（可翻面），并把这一处记入鉴赏页档案；只写天文社案自己的存档。"""
        sdef = _ASTRO_SPOT_BY_ID.get(spot_id)
        if sdef is None:
            return False
        if "add_evidence" in globals():
            add_evidence(sdef["evidence"])
        seen = list(astro_get_record()["inspected"])
        if sdef["id"] not in seen:
            seen.append(sdef["id"])
        _astro_write({"inspected": seen})
        persistent.astro_selected_spot = sdef["id"]
        renpy.save_persistent()
        return True

    def astro_record_solve(mistakes_count=0):
        """记录一次结案：评定本局评级、刷新历史最佳（最高评级 + 最少失误）与累计结案次数。
        只写天文社案自己的存档，绝不触碰主线 fail_count / 好感。本局零失误时追加金牌成就。"""
        m = max(0, int(mistakes_count or 0))
        tier = astro_rate(m)
        prev = astro_get_record()
        is_first = not prev["solved"]
        prev_rank = _ASTRO_TIER_RANK.get(prev["best_tier"], 0)
        best_tier = tier["key"] if _ASTRO_TIER_RANK[tier["key"]] >= prev_rank else prev["best_tier"]
        best_m = m if prev["best_mistakes"] is None else min(prev["best_mistakes"], m)
        new_record = (not is_first) and (prev["best_mistakes"] is None or m < prev["best_mistakes"])
        _astro_write({
            "solved": True,
            "replays": prev["replays"] + 1,
            "best_tier": best_tier,
            "last_tier": tier["key"],
            "best_mistakes": best_m,
            "last_mistakes": m,
            "inspected": [s["id"] for s in ASTRO_SPOTS],
        })
        ach_grant("ach_astro_telescope")
        if tier["key"] == "gold":
            ach_grant("ach_first_magnitude")
        renpy.save_persistent()
        result = astro_get_record()
        result["is_first"] = is_first
        result["new_record"] = new_record
        return result

    def astro_open_report_modal():
        if astro_get_record()["solved"]:
            _astro_write({"report_viewed": True})
            renpy.save_persistent()
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("astro_report_modal")

    def astro_spoiler_unlocked():
        return bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False

    def astro_render_view():
        """渲染天文社卷宗：结案前只公开案情与勘查点外观，结案后显影四颗星、结案报告与双人手记；
        墨墨涉终章的页边续批只在 truth_spoiler_unlocked() 为真且已结案时出现，遮罩状态下的返回值与续批文本完全无关（零侧信道）。"""
        rec = astro_get_record()
        solved = rec["solved"]
        best = astro_tier_def(rec["best_tier"]) if rec["best_tier"] else None
        unlocked = astro_spoiler_unlocked()
        if best:
            best_line = "%s「%s」 · 最少失误 %d 次" % (best["name"], best["title"], rec["best_mistakes"] or 0)
        else:
            best_line = "尚未结案"
        return {
            "code": ASTRO_CASE["code"],
            "title": ASTRO_CASE["title"],
            "short_title": ASTRO_CASE["short_title"],
            "time_tag": ASTRO_CASE["time_tag"],
            "summary": ASTRO_CASE["summary_pub"],
            "solved": solved,
            "replays": rec["replays"],
            "best_tier": rec["best_tier"],
            "best_name": best["name"] if best else "待结案",
            "best_line": best_line,
            "inspected_count": len(rec["inspected"]),
            "star_shorts": [(k["short"] if solved else "") for k in ASTRO_STAR_LINKS],
            "star_fulls": [(k["full"] if solved else "") for k in ASTRO_STAR_LINKS],
            "display_solution": ASTRO_CASE["solution_pub"] if solved else "",
            "display_mo_note": ASTRO_CASE["mo_note_pub"] if solved else "",
            "display_alice_note": ASTRO_CASE["alice_note_pub"] if solved else "",
            "unlocked": unlocked,
            "display_secret": ASTRO_CASE["margin_secret"] if (solved and unlocked) else "",
            "display_masked_notice": ASTRO_MASK_NOTICE if not unlocked else "",
        }

    def astro_launch_action():
        return [
            Function(stop_all_gramophone_ambience, True),
            SetField(persistent, "extras_tab", "astro"),
            Replay(ASTRO_CASE["label"], scope={"player_name": persistent.last_player_name or "陈默"}, locked=False),
        ]

    ############################################################################
    ## 二、推理笔记复盘本扩容（4 页 → 6 页：追加文化祭鬼屋与天文社流星夜两页）
    ############################################################################

    # 与 PC-13 的页目同一格式：每一页只登记「去哪里读」，卷宗、勘查点、推理链、评级与存档字段都在运行期按名字读取；
    # 页边的复盘要点、墨墨批注与续批是复盘本自己新写的文字。
    CASEBOOK_ANNEX_PAGES = [
        {
            "key": "haunted", "tab": "haunted", "index_label": "文化祭鬼屋", "unit": "四盏灯", "ink": "#9a7ad8",
            "case_var": "HAUNTED_CASE", "hotspots_var": "HAUNTED_SPOTS", "links_var": "HAUNTED_LAMP_LINKS",
            "tiers_var": "HAUNTED_RATING_TIERS", "store": "haunted_house_record",
            "lesson": "复盘要点：影子不会自己长出来。先问光从哪里来、被什么挡住，再问它挑什么时候出现——最后才问举灯的是谁。",
            "mo_margin": "墨墨批注：大人看见的是鬼，孩子看见的是人。同一个影子，要换一双眼睛再看一遍。",
            "margin_secret": (
                "续批：抄完这一页，墨墨把那个提灯笼的剪纸小人夹回了笔记本。她说四年前，小雪侦探在黑暗里等了很久，"
                "等的那盏灯一直没有亮——后来她才明白，周可那时候，也在另一片黑暗里等。"
            ),
        },
        {
            "key": "astro", "tab": "astro", "index_label": "天文社流星夜", "unit": "四颗星", "ink": "#6f9ee8",
            "case_var": "ASTRO_CASE", "hotspots_var": "ASTRO_SPOTS", "links_var": "ASTRO_STAR_LINKS",
            "tiers_var": "ASTRO_RATING_TIERS", "store": "astro_telescope_record",
            "lesson": "复盘要点：读别人记下的天空。极限星等、遮挡和光害一栏，会悄悄说出记录的人当时站在哪里。",
            "mo_margin": "墨墨批注：规矩是用来护着东西的，可东西本来是给人用的。两样都要记得。",
            "margin_secret": (
                "续批：这一页的页角，墨墨画了一架只有虚线的望远镜。她写：周可说过，想在毕业前看一次真正的流星雨。"
                "小雪侦探当时答应了，后来却没能赴约——这一次，她想先把轮廓画好，等着有一天把它填满。"
            ),
        },
    ]

    # 追加进 PC-13 的页目登记表（只在运行期合并一次；PC-13 的四页顺序与内容原样保留）
    if "NOTEBOOK_CASES" in globals():
        for _cbp in CASEBOOK_ANNEX_PAGES:
            if not any(n["key"] == _cbp["key"] for n in NOTEBOOK_CASES):
                NOTEBOOK_CASES.append(_cbp)
        _NOTEBOOK_BY_KEY = {n["key"]: n for n in NOTEBOOK_CASES}

    # PC-13 成就「推理笔记的复盘人」说明写的是「盖满前四页的复盘章」：扩容后仍按 PC-13 的原四页盖满颁发，不因新增两页推迟
    CASEBOOK_PC13_KEYS = ("library", "theater", "atelier", "sportsday")
    CASEBOOK_CN_NUMS = {1: "一", 2: "两", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九", 10: "十"}
    CASEBOOK_VERDICT = ("艾丽丝总评：%s桩案子，没有一个坏人——只有一群太在乎某个人、某样东西的人。"
                        "万事屋要做的，是替他们把这份在乎说出来。")

    def casebook_count_cn(n):
        return CASEBOOK_CN_NUMS.get(int(n or 0), str(int(n or 0)))

    def casebook_index_rows():
        """扩容后的索引签按 3 列排布，行数随页数增长（六页 = 3 × 2）。"""
        return max(1, (len(NOTEBOOK_CASES) + 2) // 3)

    def casebook_summary():
        """复盘总评（只读）：沿用 PC-13 的公开计数，总评改为按实际页数书写；全部结案之后才显影。"""
        s = dict(notebook_summary())
        s["count_cn"] = casebook_count_cn(s["total"])
        s["display_verdict"] = (CASEBOOK_VERDICT % s["count_cn"]) if (s["total"] and s["solved"] == s["total"]) else ""
        return s

    def casebook_stamp(case_key):
        """盖复盘章：交给 PC-13 的 notebook_stamp（只写复盘本自己的存档）；PC-13 的四页全部盖好时颁发「推理笔记的复盘人」。"""
        rec = notebook_stamp(case_key)
        if rec is not None and all(k in rec["stamped"] for k in CASEBOOK_PC13_KEYS):
            ach_grant("ach_case_notebook")
        return rec


################################################################################
## 三、鉴赏分页界面 A：天文社流星夜的失踪望远镜（screen extras_astro_telescope）
################################################################################

transform astro_star_twinkle:
    subpixel True
    block:
        ease 1.6 alpha 0.55 zoom 0.94
        ease 1.6 alpha 1.0 zoom 1.0
        repeat

screen extras_astro_telescope():
    $ _av = astro_render_view()
    $ _arec = astro_get_record()
    $ _asid = persistent.astro_selected_spot or "s1"
    $ _as = astro_get_spot(_asid)
    $ _as_seen = (_as["id"] in _arec["inspected"])

    vbox:
        spacing 9

        ## 1. 流星夜总览横幅（夜空深蓝 · 星光暖金）
        frame:
            style "astro_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_astro_club.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("天文社流星夜的失踪望远镜") font gui.name_text_font size 19 color "#eef4ff"
                        if _av["solved"]:
                            text _("已结案 · 四颗星已全部连起 · 可随时重回天台冲击金牌") size 12 color "#9fe3b0"
                        else:
                            text _("双子座流星雨极大夜，三脚架上只剩空云台 · 望远镜去了哪") size 12 color "#c4d4f2"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_missing_telescope.png" xysize (14, 14) yalign 0.5
                            text ("最佳 %s" % _av["best_name"]) size 12 color "#f4d98a" yalign 0.5 substitute False
                    frame:
                        style "mailbox_stat_chip"
                        text ("结案 %d 次" % _av["replays"]) size 12 color "#bcd2ff" align (0.5, 0.5) substitute False

        ## 2. 卷宗详情：夜空缩略图（底部四段星色带，结案后点亮）、案情、六处勘查点、四颗星、评级与页边续批
        frame:
            style "astro_console_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add ASTRO_CASE["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add Solid("#070b1fb0") xysize (180, 96) align (0.5, 0.5)
                        add "images/ui/icon_astro_club.png" xysize (24, 24) xalign 0.05 yalign 0.08
                        if _av["solved"]:
                            add "images/ui/icon_missing_telescope.png" xysize (26, 26) xalign 0.96 yalign 0.08 at astro_star_twinkle
                        vbox:
                            spacing 1
                            xalign 0.5
                            yalign 0.97
                            add Solid("#dfe8ff") xysize (178, 1)
                            hbox:
                                spacing 6
                                for _si, _st in enumerate(ASTRO_STARS):
                                    add Solid(_st["color"] if _av["solved"] else "#2c3556") xysize (40, 5)
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text ASTRO_CASE["code"] size 12 color "#ffffff" bold True align (0.5, 0.5) substitute False
                            text ("《%s》" % ASTRO_CASE["short_title"]) font gui.name_text_font size 17 color "#eef4ff" yalign 0.5 substitute False
                        text ("%s  ·  %s" % (ASTRO_CASE["time_tag"], ASTRO_CASE["companions"])) size 12 color "#b8c8ea" substitute False
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (15, 15) yalign 0.5
                            text ("光影：%s" % ASTRO_CASE["lighting_note"]) size 12 color "#98a8cc" yalign 0.5 substitute False
                        if _av["solved"]:
                            text ("结案档案：%s（已结案 %d 次 · 勘查点全查完）" % (_av["best_line"], _av["replays"])) size 12 color "#f4d98a" substitute False
                        else:
                            text ("结案档案：尚未结案（已勘查 %d/6 处，可先翻看下方勘查点，再回到天台）" % _av["inspected_count"]) size 12 color "#98a8cc" substitute False

                text ASTRO_CASE["summary_pub"] size 13 color "#eef2fc" line_spacing 3 substitute False

                ## 2A. 六处勘查点（3 × 226 + 2 × 8 = 694px 精确贴合内宽，两行）
                text _("勘查点 · 点击翻看六处线索（亲自查过的，会显影现场手记）：") size 12 color "#a9c2f0" bold True
                grid 3 2:
                    spacing 8
                    for s_obj in ASTRO_SPOTS:
                        $ _s_seen = (s_obj["id"] in _arec["inspected"])
                        $ _s_active = (s_obj["id"] == _as["id"])
                        button:
                            style "astro_spot_card"
                            selected _s_active
                            action Function(astro_select_spot, s_obj["id"])
                            vbox:
                                spacing 2
                                xfill True
                                hbox:
                                    xfill True
                                    yalign 0.5
                                    text ("%s · %s" % (s_obj["code"], s_obj["label"])) size 11 color ("#f2d27a" if _s_active else "#e4ebfa") bold True yalign 0.5 substitute False
                                    text (_("已勘查") if _s_seen else _("待勘查")) size 10 color ("#9fe3b0" if _s_seen else "#98a8cc") xalign 1.0 yalign 0.5
                                text ("位置 %s" % s_obj["where"]) size 10 color "#a9b9dc" substitute False
                                text s_obj["surface"] size 11 color "#dbe4f6" line_spacing 2 substitute False

                frame:
                    xfill True
                    padding (10, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        spacing 8
                        add _as["icon"] xysize (20, 20)
                        vbox:
                            spacing 2
                            text ("%s · %s（经手：%s）" % (_as["code"], _as["label"], _as["keeper"])) size 12 color "#f2d27a" bold True substitute False
                            if _as_seen:
                                text _as["detail"] size 12 color "#f2f6ff" line_spacing 2 substitute False
                            else:
                                text _("还没有亲自勘查这一处。回到流星夜查过之后，现场手记会显影在这里。") size 12 color "#98a8cc"

                ## 2B. 四颗星（4 × 167 + 3 × 8 = 692px <= 694px；每颗星一种亮星颜色）
                text _("四颗星 · 复盘（手法 → 去向 → 时机 → 掌镜人，结案后显影）：") size 12 color "#a9c2f0" bold True
                hbox:
                    spacing 8
                    for _ki, k_obj in enumerate(ASTRO_STAR_LINKS):
                        frame:
                            style "astro_star_slot"
                            vbox:
                                spacing 2
                                add Solid(k_obj["color"]) xysize (151, 3)
                                text ("%s · %s" % (k_obj["step"], k_obj["name"])) size 11 color ("#9fe3b0" if _av["solved"] else "#b8c8ea") bold True substitute False
                                text (_av["star_shorts"][_ki] if _av["solved"] else _("？ 待连星")) size 12 color ("#f2f6ff" if _av["solved"] else "#7f8fb2") substitute False

                ## 2C. 评级与结案报告预览匣
                frame:
                    style "astro_rating_card"
                    vbox:
                        spacing 5
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_missing_telescope.png" xysize (16, 16) yalign 0.5
                                text _("评级 · 重玩挑战") font gui.name_text_font size 13 color "#f2f6ff" yalign 0.5
                            text ("历史最佳：%s" % _av["best_line"]) size 11 color "#f4d98a" xalign 1.0 yalign 0.5 substitute False
                        hbox:
                            spacing 8
                            for t_obj in ASTRO_RATING_TIERS:
                                frame:
                                    style "astro_tier_chip"
                                    hbox:
                                        xfill True
                                        yalign 0.5
                                        text ("%s「%s」" % (t_obj["name"], t_obj["title"])) size 12 color ("#f4d98a" if _av["best_tier"] == t_obj["key"] else "#e4ebfa") yalign 0.5 substitute False
                                        text t_obj["rule"] size 11 color "#a9b9dc" xalign 1.0 yalign 0.5 substitute False
                        if _av["solved"]:
                            add Solid("#a9c2f033") ysize 1
                            text _av["display_solution"] size 12 color "#9fe3b0" line_spacing 2 substitute False
                            text _av["display_mo_note"] size 12 color "#cfa6f0" substitute False
                            text _av["display_alice_note"] size 12 color "#f0c060" substitute False
                        else:
                            text _("结案报告：连起四颗星之后，墨墨会把推理链和完整的结案报告写在这里。") size 12 color "#98a8cc"

                ## 2D. 墨墨的页边续批（防剧透火漆：与复盘本等共用 truth_spoiler_unlocked() 开关）
                frame:
                    style "astro_margin_box"
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
                                                    message=_("尚未通关 TRUE END，确定提前揭晓墨墨在「天文社流星夜」页边涉终章旧约的续批吗？"),
                                                    yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                                    no_action=Hide("confirm"))
                        if _av["display_secret"]:
                            text _av["display_secret"] size 12 color "#f4d98a" line_spacing 2 substitute False
                        elif _av["unlocked"]:
                            text _("剧透许可已开启 · 连起四颗星结案之后，墨墨的续批会显影在这里。") size 12 color "#98a8cc"
                        if _av["display_masked_notice"]:
                            text _av["display_masked_notice"] size 11 color "#f0a4b8" substitute False

                ## 2E. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("零失误连起四颗星可获金牌 · 已结案 %d 次" % _av["replays"]) size 12 color "#a9b9dc" yalign 0.5 substitute False
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton _("展阅结案报告"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(astro_open_report_modal)
                        textbutton (_("重回流星夜") if _av["solved"] else _("走上天台")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action astro_launch_action()

        ## 3. 复盘本直达条（扩容后的复盘本收录本案；点开直接翻到这一页）
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
                    action [SetField(persistent, "notebook_selected_case", "astro"), SetField(persistent, "extras_tab", "notebook")]


## 天文社结案报告独立展阅弹窗
screen astro_report_modal():
    modal True
    zorder 215
    $ _mv = astro_render_view()

    add "#070b18dc"
    key "K_ESCAPE" action Hide("astro_report_modal")
    key "K_RETURN" action Hide("astro_report_modal")
    key "K_SPACE" action Hide("astro_report_modal")

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
                    add "images/ui/icon_astro_club.png" xysize (40, 40) yalign 0.5
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_mv["code"], _mv["short_title"])) font gui.name_text_font size 20 color "#eef4ff" substitute False
                        text _mv["time_tag"] size 12 color "#b8c8ea" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_missing_telescope.png" xysize (30, 30) yalign 0.5 at astro_star_twinkle
                    text _mv["best_name"] size 13 color "#f4d98a" bold True yalign 0.5 substitute False

            hbox:
                spacing 0
                for _rs in ASTRO_STARS:
                    add Solid(_rs["color"]) xysize (173, 3)

            viewport:
                xfill True
                ysize 336
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    text _("案情：") size 12 color "#a9c2f0" bold True
                    text _mv["summary"] size 13 color "#eef2fc" line_spacing 4 substitute False
                    add Solid("#b8c8ea33") ysize 1
                    if _mv["solved"]:
                        text _("四颗星：") size 12 color "#a9c2f0" bold True
                        for _ri, r_obj in enumerate(ASTRO_STAR_LINKS):
                            hbox:
                                spacing 8
                                add Solid(r_obj["color"]) xysize (6, 18) yalign 0.0
                                text ("%s · %s（%s）：%s" % (r_obj["step"], r_obj["name"], r_obj["star"], _mv["star_fulls"][_ri])) size 13 color "#e4ebfa" line_spacing 3 xsize 658 substitute False
                        add Solid("#a9c2f033") ysize 1
                        text _mv["display_solution"] size 13 color "#9fe3b0" line_spacing 4 substitute False
                        text _mv["display_mo_note"] size 13 color "#cfa6f0" line_spacing 4 substitute False
                        text _mv["display_alice_note"] size 13 color "#f0c060" line_spacing 4 substitute False
                        if _mv["display_secret"]:
                            add Solid("#f4d98a33") ysize 1
                            text _mv["display_secret"] size 13 color "#f4d98a" line_spacing 4 substitute False
                    else:
                        text _("这桩案子还没有结案。回到流星夜、查完六处线索并连起四颗星后，完整的结案报告会显影在这里。") size 13 color "#a9b9dc" line_spacing 4
                    if _mv["display_masked_notice"]:
                        text _mv["display_masked_notice"] size 12 color "#f0a4b8" substitute False

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上结案报告") size 12 color "#a9b9dc" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 10
                    textbutton _("重回流星夜"):
                        style "gramophone_mini_pill"
                        yalign 0.5
                        action [Hide("astro_report_modal")] + astro_launch_action()
                    textbutton _("合上报告"):
                        style "pill_button"
                        xminimum 116
                        ysize 34
                        text_size 14
                        action Hide("astro_report_modal")


## 流星夜剧场内顶部「四颗星」横幅（位于右上角证物 HUD 下方，互不遮挡；已连起的星亮起各自的颜色）
screen astro_star_banner(stars_done, prompt_line):
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
                add "images/ui/icon_star_lamp.png" xysize (22, 22) yalign 0.5
                text _("流星夜 · 连起四颗星") size 12 color "#a9c2f0" bold True yalign 0.5
                text ("已连起 %d/%d · 失误只计入本案评级，不影响主线" % (stars_done, len(ASTRO_STAR_LINKS))) size 11 color "#b8c8ea" yalign 0.5
            hbox:
                spacing 6
                for _bi, b_obj in enumerate(ASTRO_STAR_LINKS):
                    frame:
                        style "astro_banner_slot"
                        vbox:
                            spacing 0
                            add Solid(b_obj["color"] if _bi <= stars_done else "#2c3556") xysize (160, 3)
                            text ("%s · %s" % (b_obj["step"], b_obj["name"])) size 10 color ("#9fe3b0" if _bi < stars_done else ("#f2d27a" if _bi == stars_done else "#98a8cc")) bold True substitute False
                            text (b_obj["short"] if _bi < stars_done else _("？")) size 11 color ("#f2f6ff" if _bi < stars_done else "#7f8fb2") substitute False
            text prompt_line size 14 color "#f2f6ff" substitute False


## 流星夜结案结算卡：本局评级 + 历史最佳纪录 + 重玩挑战提示
screen astro_result_card(cur_tier, best_tier, mistakes, best_mistakes, replays, new_record=False, is_first=True):
    modal True
    zorder 220
    $ _ct = astro_tier_def(cur_tier)
    $ _bt = astro_tier_def(best_tier)
    $ _rv = astro_render_view()
    $ _is_gold = (cur_tier == "gold")

    add "#070b18dc"
    key "K_RETURN" action Return("back_to_astro")
    key "K_SPACE" action Return("back_to_astro")
    key "K_ESCAPE" action Return("back_to_astro")

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
                add "images/ui/icon_missing_telescope.png" xysize (54, 54) yalign 0.5 at astro_star_twinkle
                vbox:
                    spacing 3
                    yalign 0.5
                    text ("流星夜结案 · %s" % ASTRO_CASE["code"]) size 13 color "#a9c2f0" bold True substitute False
                    text ("《%s》" % ASTRO_CASE["short_title"]) font gui.name_text_font size 21 color "#eef4ff" substitute False
                    text ("本局评级：【%s · %s】" % (_ct["name"], _ct["title"])) size 14 color ("#f4d98a" if _is_gold else "#9fe3b0") substitute False

            hbox:
                spacing 0
                xalign 0.5
                for _cs in ASTRO_STARS:
                    add Solid(_cs["color"]) xysize (152, 3)

            frame:
                xfill True
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 4
                    text _rv["display_mo_note"] size 13 color "#cfa6f0" substitute False
                    text _rv["display_alice_note"] size 13 color "#f0c060" substitute False
                    text ("本局失误 %d 次（只计入本案评级，不影响主线）" % mistakes) size 12 color "#b8c8ea"
                    text ("历史最佳：%s「%s」 · 最少失误 %d 次 · 累计结案 %d 次" % (_bt["name"], _bt["title"], best_mistakes, replays)) size 12 color "#b8c8ea" substitute False
                    if is_first:
                        text _("首次结案 · 四颗星已写入鉴赏室「天文社流星夜」分页，复盘本扩容到了六页") size 12 color "#9fe3b0"
                    elif new_record:
                        text _("重玩挑战 · 刷新个人纪录！这一次的四颗星比以往任何一次都连得更稳") size 12 color "#f4d98a"
                    elif _is_gold:
                        text _("重玩挑战 · 再次拿下金牌，流星夜名侦探实至名归") size 12 color "#f4d98a"
                    else:
                        text _("重玩挑战 · 零失误连起四颗星，就能拿下金牌") size 12 color "#b8c8ea"

            textbutton _("收好星图并返回鉴赏室"):
                style "pill_button"
                xalign 0.5
                xminimum 248
                ysize 38
                text_size 15
                action Return("back_to_astro")


################################################################################
## 四、鉴赏分页界面 B：扩容后的推理笔记复盘本（screen extras_casebook_expanded）
##   · 六页：PC-13 的四页 + 鬼屋 + 流星夜；索引签改为 3 × 234 + 2 × 10 = 722px 的 3 × 2 网格；
##   · 页面、证物格、推理链与页边批注沿用 PC-13 的样式与只读渲染（notebook_render_page / notebook_page_modal）；
##   · 盖章交给 casebook_stamp（内部调用 PC-13 的 notebook_stamp），复盘本只写 persistent.case_notebook_record。
################################################################################

screen extras_casebook_expanded():
    $ _nsel = persistent.notebook_selected_case or "library"
    $ _np = notebook_render_page(_nsel)
    $ _ns = casebook_summary()
    $ _ncount = len(NOTEBOOK_CASES)

    vbox:
        spacing 9

        ## 1. 牛皮纸复盘本总览横幅（页数随扩容自动书写）
        frame:
            style "notebook_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_case_notebook.png" xysize (36, 36) yalign 0.5 at notebook_tab_sway
                    vbox:
                        spacing 2
                        xsize 398
                        text _("侦探社推理笔记复盘本") font gui.name_text_font size 19 color "#fff3dc"
                        if _ns["stamped"] >= _ncount:
                            text ("%s枚复盘章已全部盖好 · 下次遇到怪事，先翻这本本子。" % _ns["count_cn"]) size 12 color "#f4d98a" substitute False
                        elif persistent.te_cleared:
                            text _("TRUE END 已通关 · 复盘本页边的续批已全部显影。") size 12 color "#d8c8ee"
                        elif persistent.truth_spoiler_confirmed:
                            text _("已手动开启剧透许可 · 复盘本页边的续批当前可见。") size 12 color "#f0a4b8"
                        else:
                            text ("%s桩短案的证物与推理 · 涉终章的页边续批由防剧透火漆保护。" % _ns["count_cn"]) size 12 color "#dcc6a0" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_evidence_tag.png" xysize (14, 14) yalign 0.5
                            text ("复盘章 %d/%d" % (_ns["stamped"], _ncount)) size 12 color "#f4d98a" yalign 0.5 substitute False
                    if not persistent.te_cleared:
                        if persistent.truth_spoiler_confirmed:
                            textbutton _("恢复遮罩"):
                                style "gramophone_mini_pill"
                                yalign 0.5
                                action [SetField(persistent, "truth_spoiler_confirmed", False), Function(renpy.save_persistent)]
                        else:
                            textbutton _("解锁剧透"):
                                style "gramophone_mini_pill"
                                yalign 0.5
                                action Show("confirm",
                                            message=_("尚未通关 TRUE END，确定提前揭晓「推理笔记复盘本」中涉终章旧约的页边续批吗？"),
                                            yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                            no_action=Hide("confirm"))

        ## 2. 彩色索引签（3 × 234 + 2 × 10 = 722px；每页一种墨水色，六页两行）
        grid 3 casebook_index_rows():
            spacing 10
            for n_obj in NOTEBOOK_CASES:
                $ _ip = notebook_render_page(n_obj["key"])
                $ _isel = (n_obj["key"] == _np["key"])
                button:
                    style "casebook_index_tab"
                    selected _isel
                    action Function(notebook_select, n_obj["key"])
                    vbox:
                        spacing 2
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 5
                                yalign 0.5
                                add Solid(n_obj["ink"]) xysize (7, 7) yalign 0.5
                                text (_ip["code"] or n_obj["index_label"]) size 11 color ("#f4d98a" if _isel else "#e8d3ad") bold True yalign 0.5 substitute False
                            if _ip["status"] == "stamped":
                                text _("已盖章") size 10 color "#f4d98a" bold True xalign 1.0 yalign 0.5
                            elif _ip["status"] == "ready":
                                text _("可盖章") size 10 color "#86efac" bold True xalign 1.0 yalign 0.5
                            elif _ip["status"] == "open":
                                text _("未结案") size 10 color "#b39d7a" xalign 1.0 yalign 0.5
                            else:
                                text _("缺卷") size 10 color "#9a8a70" xalign 1.0 yalign 0.5
                        text _ip["short_title"] font gui.name_text_font size 13 color ("#fff3dc" if _ip["solved"] else "#c9b48f") substitute False
                        text ("%s · 最佳 %s" % (n_obj["index_label"], _ip["best_name"])) size 11 color "#d9c39e" substitute False
            for _cbpad in range((3 - _ncount % 3) % 3):
                null width 234 height 70

        ## 3. 选中的那一页：卷宗抬头、关键证物、推理链、页边批注与续批（与 PC-13 同一套只读渲染）
        frame:
            style "notebook_page_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 8
                        yalign 0.5
                        add Solid(_np["ink"]) xysize (6, 26) yalign 0.5
                        frame:
                            style "mailbox_code_badge"
                            text (_np["code"] or "----") size 12 color "#ffffff" bold True align (0.5, 0.5) substitute False
                        text ("《%s》" % _np["short_title"]) font gui.name_text_font size 18 color "#fff3dc" yalign 0.5 substitute False
                    frame:
                        style "mailbox_stat_chip"
                        xalign 1.0
                        yalign 0.5
                        text _np["best_name"] size 12 color ("#f4d98a" if _np["solved"] else "#b39d7a") align (0.5, 0.5) substitute False
                text ("%s  ·  %s" % (_np["index_label"], _np["time_tag"])) size 12 color "#d9c39e" substitute False
                text _np["best_line"] size 12 color ("#f4d98a" if _np["solved"] else "#b39d7a") substitute False

                ## 3A. 关键证物（3 × 226 + 2 × 8 = 694px 贴合内宽；只抄该案存档里已勘查过的证物）
                text _("关键证物 · 亲自勘查过的才抄进复盘本（读取该案存档，只读不写）：") size 12 color "#e8c88a" bold True
                if _np["evidence_rows"]:
                    $ _ev_rows = (len(_np["evidence_rows"]) + 2) // 3
                    grid 3 _ev_rows:
                        spacing 8
                        for _ev in _np["evidence_rows"]:
                            frame:
                                style "notebook_evidence_cell"
                                vbox:
                                    spacing 2
                                    xfill True
                                    text ("%s · %s" % (_ev[0], _ev[1])) size 10 color ("#e8c88a" if _ev[3] else "#a8946f") bold True substitute False
                                    text (_ev[2] if _ev[3] else _("？ 尚未勘查")) size 11 color ("#fbf1df" if _ev[3] else "#8f7d5f") line_spacing 2 substitute False
                        for _evpad in range((3 - len(_np["evidence_rows"]) % 3) % 3):
                            null width 226 height 62
                else:
                    text _("这一页的卷宗暂时不在书架上。") size 12 color "#a8946f"

                ## 3B. 推理链（4 × 167 + 3 × 8 = 692px <= 694px；用这一页的墨水色划线）
                text ("%s · 复盘（结案后显影）：" % _np["unit"]) size 12 color "#e8c88a" bold True substitute False
                hbox:
                    spacing 8
                    for _ch in _np["chain"]:
                        frame:
                            style "notebook_chain_slot"
                            vbox:
                                spacing 2
                                add Solid(_np["ink"]) xysize (151, 3)
                                text ("%s · %s" % (_ch[0], _ch[1])) size 11 color ("#86efac" if _np["solved"] else "#d9c39e") bold True substitute False
                                text (_ch[2] if _np["solved"] else _("？ 待复盘")) size 12 color ("#fbf1df" if _np["solved"] else "#8f7d5f") substitute False

                ## 3C. 页边批注：复盘要点、墨墨批注与涉终章的续批
                frame:
                    style "notebook_margin_box"
                    vbox:
                        spacing 4
                        xfill True
                        if _np["solved"]:
                            text _np["display_lesson"] size 12 color "#fbf1df" line_spacing 2 substitute False
                            text _np["display_mo_margin"] size 12 color "#cfa6f0" substitute False
                            if _np["display_secret"]:
                                add Solid("#e8c88a44") ysize 1
                                text _np["display_secret"] size 12 color "#f4d98a" line_spacing 2 substitute False
                        else:
                            text _("这一案还没有结案。走完它的推理之后，复盘要点和墨墨的页边批注会写在这里。") size 12 color "#b39d7a"
                        if _np["display_masked_notice"]:
                            text _np["display_masked_notice"] size 11 color "#f0a4b8" substitute False

                ## 3D. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("已勘查 %d/%d · 已结案 %d 次" % (_np["inspected_count"], _np["hotspot_total"], _np["replays"])) size 12 color "#b39d7a" yalign 0.5 substitute False
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        if _np["available"]:
                            textbutton ("前往%s" % _np["index_label"]):
                                style "gramophone_mini_pill"
                                yalign 0.5
                                action SetField(persistent, "extras_tab", _np["tab"])
                        textbutton _("展开整页"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action (Function(do_quietly, notebook_open_page, _np["key"]) if _np["available"] else None)
                        textbutton (_("已盖复盘章") if _np["stamped"] else _("盖上复盘章")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action (Function(do_quietly, casebook_stamp, _np["key"]) if _np["status"] == "ready" else None)

        ## 4. 复盘总评（六页的公开计数；全部结案后显影艾丽丝的总评）
        frame:
            style "notebook_summary_card"
            vbox:
                spacing 4
                xfill True
                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 6
                        yalign 0.5
                        add "images/ui/icon_case_notebook.png" xysize (18, 18) yalign 0.5
                        text _("复盘总评") font gui.name_text_font size 13 color "#fff3dc" yalign 0.5
                    text ("已结案 %d/%d · 金评级 %d/%d · 累计结案 %d 次 · 最少失误合计 %d 次" % (_ns["solved"], _ns["total"], _ns["gold"], _ns["total"], _ns["replays"], _ns["best_mistakes_sum"])) size 11 color "#e8d3ad" xalign 1.0 yalign 0.5 substitute False
                if _ns["display_verdict"]:
                    text _ns["display_verdict"] size 12 color "#f4d98a" line_spacing 2 substitute False
                else:
                    text ("%s桩短案全部结案之后，艾丽丝会在这里写下她的复盘总评。" % _ns["count_cn"]) size 12 color "#b39d7a" substitute False

        ## 5. 天文社流星夜直达条
        frame:
            style "mailbox_quick_row"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_astro_club.png" xysize (20, 20) yalign 0.5
                    text _("天文社流星夜 · MN-01 流星夜的空三脚架") font gui.name_text_font size 14 color "#eef4ff" yalign 0.5
                    text ("（%s）" % astro_best_short()) size 12 color "#f4d98a" yalign 0.5 substitute False
                textbutton _("前往天文社"):
                    style "gramophone_mini_pill"
                    xalign 1.0
                    yalign 0.5
                    action SetField(persistent, "extras_tab", "astro")


################################################################################
## 五、样式定义（PC-15 夜空深蓝与星光暖金）
################################################################################

style astro_header_card is default:
    xfill True
    padding (14, 10)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#a6bdec") * SaturationMatrix(0.0))

style astro_console_card is default:
    xfill True
    padding (14, 11)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#c8d6f2") * SaturationMatrix(0.0))

style astro_rating_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style astro_spot_card is button:
    xsize 226
    yminimum 88
    padding (8, 6)
    background Frame("gui/hud_chip.png", 12, 12)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style astro_star_slot is default:
    xsize 167
    ysize 58
    padding (8, 5)
    background Frame("gui/hud_chip.png", 12, 12)

style astro_banner_slot is default:
    xsize 176
    ysize 44
    padding (8, 4)
    background Frame("gui/panel_card.png", 16, 16)

style astro_tier_chip is default:
    xsize 218
    ysize 30
    padding (8, 0)
    background Frame("gui/panel_card.png", 16, 16)

style astro_margin_box is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

## 扩容复盘本的索引签：沿用 PC-13 索引签的配色、高度与内边距，只把宽度改为 3 列（3 × 234 + 2 × 10 = 722px）
style casebook_index_tab is notebook_index_tab:
    xsize 234


################################################################################
## 六、流星夜独立沙盒初始化与结案出口（零侵入主线好感/失误/存档）
################################################################################

label _astro_init_sandbox(session_save_title):
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
    $ set_ambient("night")
    return

label _astro_finish_case(local_mistakes=0):
    $ _at_final_mistakes = max(0, int(local_mistakes or 0))
    $ _at_rec = astro_record_solve(_at_final_mistakes)
    hide screen astro_star_banner
    hide screen evidence_book
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen astro_result_card(_at_rec["last_tier"], _at_rec["best_tier"], _at_final_mistakes, _at_rec["best_mistakes"], _at_rec["replays"], _at_rec["new_record"], _at_rec["is_first"])
    $ persistent.extras_tab = "astro"
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 七、天文社流星夜 MN-01：《流星夜的空三脚架》
################################################################################

label astro_telescope_case:
    call _astro_init_sandbox("天文社流星夜 · MN-01 流星夜的空三脚架") from _call__astro_init_sandbox
    $ _at_mistakes = 0
    $ _at_stars = 0
    $ _at_s1 = False
    $ _at_s2 = False
    $ _at_s3 = False
    $ _at_s4 = False
    $ _at_s5 = False
    $ _at_s6 = False
    $ _at_replays = astro_get_record()["replays"]
    $ _at_best_text = astro_render_view()["best_line"]

    scene bg black with fade
    $ play_bgm(bgm_prologue, fadein=1.5)
    centered "{size=+6}天文社流星夜 · METEOR NIGHT MN-01{/size}\n\n{size=+14}流星夜的空三脚架{/size}\n\n{color=#9fc4f0}周五 21:25 · 主教学楼天台 · 双子座流星雨极大夜{/color}"

    scene bg rooftop at bg_kenburns_in
    $ set_ambient("night")
    show screen evidence_book
    with dissolve

    play sound se_footstep
    "十二月的夜风从天台的栏杆缝里钻进来，冷得人直缩脖子。可天台上躺着的二十个人，谁也舍不得回教室。"
    "今晚是双子座流星雨的极大夜。天文社向全校开放了二十个名额，艾丽丝在报名开始的第一分钟就填好了表——『万事屋的团建，就该在星空底下！』"
    "上半场，我们躺在防潮垫上数流星。每人一张记录表、一支包着红色玻璃纸的小手电，每十分钟记一格。轮到休息的人，就去天台东侧排队，从社里那台折射望远镜里看木星。"
    "墨墨数得最认真。她的记录表上，一格一格全是工工整整的『正』字。"
    "八点五十，社长吹哨，热可可中场。九点二十，下半场的哨声还没吹响——天台东侧，先传来一声惊叫。"
    show alice shock at left
    show mo think at right
    "三脚架还立在原地，三条腿稳稳地撑着。可架子顶上，空了。"
    jiyao "望远镜……望远镜呢？！"
    "天文社社长季遥抱着空空的云台，声音都变了调。她是高二的学姐，平时说话比尺子还直，这会儿手却抖得握不住记录板。"
    jiyao "那是第一届社长毕业时留给社里的，镜筒上贴着每一届社员的星星贴纸……我在三脚架上贴了条子，『望远镜不下天台』，谁都知道的！"
    show huang think at center
    "带队的黄老师从门口那张折叠椅上站了起来。"
    huang "天台只有一道门，学生会的人整晚守着登记。东西不会长翅膀飞了。"
    huang "十点散场之前找不回来，天文社以后的夜间观测一律取消。拿走的人，按校规处理。"
    "季遥咬着嘴唇，一个字也说不出来。躺在防潮垫上的社员们面面相觑，有个高一的女生把记录板抱在胸前，头埋得很低。"
    play sound se_write
    mo_note "望远镜不会自己走下楼。有人抱着它，走了一段路。"
    show alice smile at left
    alice "季遥学姐，这单万事屋接了！离十点还有三十五分钟——本社长倒要看看，是谁在流星雨的晚上，把天文社的眼睛借走了！"
    jiyao "……拜托你们了。天台上随便看，记录板和登记表都在。"

label astro_case_investigate:
    if _at_s1 and _at_s2 and _at_s3 and _at_s4 and _at_s5 and _at_s6:
        jump astro_case_review_intro

    menu:
        "离十点散场还有三十五分钟。六处可疑的地方，先查哪一处？（可随时点击右上角【证据】翻面查看批注）"

        "看看天台东侧那副空了的三脚架" if not _at_s1:
            $ _at_s1 = True
            scene bg rooftop
            $ set_ambient("night")
            show alice think at left
            show mo think at right
            with dissolve
            "三脚架立在天台东侧，正对着东方的夜空。架子顶上的云台被放得平平的，锁得紧紧的。"
            "季遥打着红光手电，照着云台上那道燕尾槽。夹镜筒的旋钮，被拧松了整整两圈。"
            jiyao "卸镜步骤，是我第一节社课就教的：先把云台放平，再松夹，最后双手托住镜筒往外抽。放平了镜筒才不会往下滑。去年……就有人没放平，把目镜摔碎在了楼梯上。"
            mc "所以你才贴了『望远镜不下天台』的条子。"
            jiyao "……嗯。从那以后，望远镜只在天台上用。"
            "三条腿底下的防滑垫一块都没挪过。原本挂在三脚架腿上的那只黑色长软包——装镜筒用的——也一起不见了。"
            show alice smile at left
            alice "看，排队看木星的名单，最后一个签名写着 20:48。也就是说，八点四十八，望远镜还好好地在这儿。"
            play sound se_write
            mo_note "先放平，再松夹。拿走它的人，很怕把它碰坏。"
            $ astro_inspect_spot("s1")
            jump astro_case_investigate

        "翻一翻天台入口那块流星记录板" if not _at_s2:
            $ _at_s2 = True
            scene bg rooftop
            $ set_ambient("night")
            show alice think at left
            show mo think at right
            with dissolve
            "天台入口旁边立着一块记录板，二十张流星记录表一张挨一张夹在上面，每张右上角写着观测员的编号。"
            jiyao "每十分钟一格：这一格看见几颗流星，当时能看见的最暗的星是几等——就是极限星等——天空有没有被东西挡住，有没有灯光干扰。"
            "上半场的格子，二十张表写得差不多：极限星等 5.0，遮挡 0，光害 无。天台四面空旷，城市的灯都在很远的地方。"
            "中场休息的两格，十九张表都空着。只有一张还在记——右上角写着一个『7』。"
            play sound se_page
            "21:00，流星三颗。21:10，流星两颗。可这两格的另外几栏，变了。"
            "极限星等：4.0。遮挡：北侧楼体约三成。光害：路灯。"
            show alice shock at left
            alice "天台上哪来的楼挡着？抬头看一圈，连一盏路灯都看不见呀。"
            mc "极限星等掉了整整一等，能看见的星星变少了——因为她身边亮着灯。"
            mc "北边有一栋楼挡着三成天空，旁边还有路灯……这两格记的，是地面上的夜空。"
            show mo smile at right
            play sound se_write
            mo_note "7 号休息的时候也没停笔。只是她头顶的天空，换了一块。"
            $ astro_inspect_spot("s2")
            jump astro_case_investigate

        "去天台门口，找小林看看出入登记表" if not _at_s3:
            $ _at_s3 = True
            scene bg corridor
            $ set_ambient("night")
            show alice think at left
            show lin neutral at center
            show mo think at right
            with dissolve
            "天台的铁门口摆着一张课桌，小林端端正正地坐在后面，面前摊着一本登记表，手边放着一支红光手电。"
            lin "学生会安全规定。夜间活动，登记每一次上下楼的时间、编号、事由、携带物品。张子谦在楼下巡逻。"
            alice "八点五十以后，有谁下过楼？"
            lin "一个人。"
            play sound se_page
            "小林把登记表转过来。她的字一笔一画，像印出来的一样。"
            "『20:52，7 号，下楼。事由：去一楼开水房打热水。携带：保温壶一只、黑色长条软包一只（自述：防潮垫）。』"
            "『21:18，7 号，上楼。携带：保温壶一只。』"
            mc "下去的时候背着一只长条软包，上来的时候，只剩一只保温壶。"
            lin "我只登记看得见的东西。软包是长条的、黑色的。她说是防潮垫，我就写防潮垫。"
            lin "除此之外，八点到九点二十，没有任何人上下楼。黄老师一直坐在门口。"
            show alice think at left
            alice "可天台上的防潮垫……我刚才数过，二十个人，二十张，一张都不少。"
            mc "一楼开水房离楼梯口不到三十步。打一壶热水，来回五分钟——她这一趟，走了二十六分钟。"
            show mo smile at right
            play sound se_write
            mo_note "带下去的，不是防潮垫。带上来的，也不只是热水。"
            $ astro_inspect_spot("s3")
            jump astro_case_investigate

        "尝一尝热可可桌上那壶刚冲好的可可" if not _at_s4:
            $ _at_s4 = True
            scene bg rooftop
            $ set_ambient("night")
            show alice smile at left
            show mo think at right
            with dissolve
            "天台西侧的折叠桌上摆着一排纸杯，热可可还冒着白气。九点二十冲的那一壶，用的就是 7 号带回来的热水。"
            show alice think at left
            alice "……奇怪。"
            mc "怎么了？"
            alice "你尝尝。这可可里，有一股茉莉花茶的味道。"
            "我喝了一口。甜甜的可可底下，确实浮着一缕淡淡的花香——像是用泡过茶的壶烧出来的水。"
            alice "开水房的大锅炉只烧白开水，绝对泡不出这个味儿。"
            "季遥愣了一下，从记录板后面抽出一张活动安排表。"
            jiyao "等等……开水房周五晚上不开的。门上贴着告示，『周五 20:30 闭房』。我们社每次都是自己带热水上来。"
            mc "那她八点五十二下楼的时候，开水房早就锁了。"
            show alice smile at left
            alice "晚上还烧着热水的地方……整个学校只剩一个。南门夜班的魏师傅，一年四季抱着一只大铝壶泡茉莉花茶。万事屋去借过好几回热水呢。"
            show mo smile at right
            play sound se_write
            mo_note "热水会说出它从哪里来。这一壶，是茉莉花味的。"
            $ astro_inspect_spot("s4")
            jump astro_case_investigate

        "跟着张子谦下楼，去南门草坪看看捡到镜头盖的地方" if not _at_s5:
            $ _at_s5 = True
            scene bg gate
            $ set_ambient("night")
            show alice think at left
            show zhang think at center
            show mo think at right
            with dissolve
            play sound se_footstep
            "张子谦巡逻回来，一上天台就说南门的草坪上捡到了一样东西。我们在登记表上签了名，跟着他下楼，一路走到南门。门卫室的小窗亮着灯，门口那盏路灯把一小块草坪照成了橘色。"
            zhang "九点二十五我巡到这儿，在草坪上踩到个硬东西，还以为是谁掉的瓶盖。"
            "他摊开手心。是一只黄铜包边的镜头盖，背面贴着一颗小小的星星贴纸。"
            show alice shock at left
            alice "这颗星星贴纸——跟天台上三脚架腿上贴的，是同一款！"
            mc "盖子的口径，也刚好扣得上天文社那台望远镜的物镜。"
            "我蹲下去，看了看张子谦捡到它的那块草皮。草叶上挂满了露水，盖子压过的地方也一样湿——它是今晚起露以后才掉下来的。"
            "旁边的草坪上，还有三个浅浅的小圆坑，排成一个三角形，每两个之间不到一臂长。"
            zhang "像……有人在这儿支过一副小三脚架？"
            "我抬起头。门卫室就在三步开外，魏师傅坐在窗户后面，低头翻着一份报纸，像是没看见我们。"
            show mo smile at right
            play sound se_write
            mo_note "盖子掉在这里。那它盖着的东西，也来过这里。"
            $ astro_inspect_spot("s5")
            jump astro_case_investigate

        "数一数天台门口的红光手电收纳盒" if not _at_s6:
            $ _at_s6 = True
            scene bg rooftop
            $ set_ambient("night")
            show alice think at left
            show mo think at right
            with dissolve
            "天台铁门内侧挂着一只木头收纳盒，隔成二十个小格，每格写着一个编号。中场的时候，社员们要把红光手电插回格子里，季遥挨个换电池。"
            jiyao "红光不会破坏眼睛的暗适应。看完记录表再抬头，星星还在——所以天文社的晚上，只许用红光。"
            "十九支手电整整齐齐地插在格子里。只有一格是空的。格子上写着：7。"
            jiyao "7 号说她的手电……不知道丢在哪了。"
            "墨墨没有说话。她走到天台南侧的围栏边，扶着栏杆往下看，然后回过头，冲我们招了招手。"
            show alice shock at left
            "从这里往下望，能看见整个南门。门卫室的窗台上，亮着一点小小的红光——暗暗的，像一颗掉在地上的火星。"
            alice "那个颜色……跟天文社的红光手电一模一样！"
            mc "一整晚都亮着。像是在告诉谁：东西在这儿，放心。"
            show mo smile at right
            play sound se_write
            mo_note "7 号的手电没有丢。它留在了南门，替谁亮着。"
            $ astro_inspect_spot("s6")
            jump astro_case_investigate

label astro_case_review_intro:
    scene bg rooftop
    $ set_ambient("night")
    $ play_bgm(bgm_mystery, fadein=1.2, fadeout=0.8)
    show alice smile at left
    show mo neutral at right
    with dissolve

    "六处线索全部查完，离十点只剩十五分钟。我们躲到水箱的背风处，头顶上，一颗流星拖着尾巴划过了猎户座。"
    "墨墨把记录表翻到背面，用铅笔点了四个点，又把它们一颗一颗连起来。"
    play sound se_write
    mo_note "像连星座一样。四颗星连起来，就能看见它的形状。"
    alice "那就一颗一颗连！它是怎么被拿走的、去了哪、什么时候、是谁——四颗星连成一座，望远镜就无处可藏！"
    if _at_replays > 0:
        sysmsg "【流星夜 · 重玩挑战】当前历史最佳：[_at_best_text]。零失误连起四颗星，就能拿下金牌。"
    else:
        sysmsg "【流星夜 · 连起四颗星】依次选出「手法 → 去向 → 时机 → 掌镜人」。零失误可获金牌，失误只计入本案评级，不影响主线。"

label astro_star_k1:
    show screen astro_star_banner(0, "第一颗星 · 手法：云台放平、旋钮松了两圈、软包一起不见——望远镜是怎么被拿走的？")
    menu:
        "外校的人趁天黑摸上天台，抱起来就跑":
            hide screen astro_star_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "天台只有一道门，小林整晚守着登记，八点到九点二十只有 7 号上下过楼呀。再说，抱起来就跑的人，才不会先把云台放平、再松两圈旋钮。"
            play sound se_write
            mo_note "慌张的手，不会这么规矩。"
            jump astro_star_k1

        "懂行的人按卸镜步骤取下镜筒，装进那只长条软包带走":
            hide screen astro_star_banner
            play sound se_correct
            $ _at_stars = 1

        "夜风太大，把镜筒从云台上吹落到了楼下":
            hide screen astro_star_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "风再大，也拧不松旋钮呀。而且装镜筒的软包也一起不见了——风总不会顺手把它打好包吧？"
            play sound se_write
            mo_note "风只会吹倒东西，不会收拾东西。"
            jump astro_star_k1

    mc "云台先放平、再松夹，正是天文社第一节社课教的卸镜步骤——外人不会这样做，大风也拧不开旋钮。7 号下楼时背着一只黑色长条软包，说是防潮垫，可天台上二十张防潮垫一张不少：那只软包里装的，是被小心卸下来的镜筒。"

label astro_star_k2:
    show screen astro_star_banner(1, "第二颗星 · 去向：北侧楼体遮挡、路灯光害、茉莉味的热水——望远镜被带去了哪里？")
    menu:
        "天文社的活动室——社员都有钥匙，藏在那里最方便":
            hide screen astro_star_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "活动室在四楼走廊尽头，关着窗，可数不了流星呀。再说镜头盖掉在南门的草坪上，离活动室隔着一整栋楼。"
            play sound se_write
            mo_note "在屋子里，看不见路灯，也看不见流星。"
            jump astro_star_k2

        "天台北边的水箱后面——它根本没有下楼":
            hide screen astro_star_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "天台四面空旷，记录表上的北侧楼体和路灯，在这里一样也对不上。何况登记表上，那只软包是跟着 7 号下了楼的。"
            play sound se_write
            mo_note "她记下的天空，比天台上的暗了一等。"
            jump astro_star_k2

        "南门门卫室外的草坪——魏师傅的窗台底下":
            hide screen astro_star_banner
            play sound se_correct
            $ _at_stars = 2

    mc "7 号中场还在记流星，记下的却是北侧楼体遮挡和路灯光害——那是地面上、楼的南边；她带回来的热水有茉莉花茶味，只可能来自南门门卫室那只大铝壶；镜头盖和排成三角形的小坑落在门卫室外的草坪上，窗台上还亮着一点红光。望远镜，去了南门。"

label astro_star_k3:
    show screen astro_star_banner(2, "第三颗星 · 时机：20:48 还有人排队看木星，21:20 镜筒已经不见——它是什么时候下楼的？")
    menu:
        "20:52 到 21:18 的热可可中场，借口去开水房打热水的时候":
            hide screen astro_star_banner
            play sound se_correct
            $ _at_stars = 3

        "观测会开始之前，三脚架上早就只剩空架子":
            hide screen astro_star_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "可 20:48 还有人在名单上签了名，说木星的条纹看得清清楚楚呢。空架子可看不见木星。"
            play sound se_write
            mo_note "名单上的最后一个名字，写着 20:48。"
            jump astro_star_k3

        "21:20 下半场开始以后，大家都躺下数流星的时候":
            hide screen astro_star_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "九点二十季遥学姐一回到三脚架前，就发现镜筒没了呀。而且登记表上，21:18 到九点二十，再没有人下过楼。"
            play sound se_write
            mo_note "哨声响之前，它就已经不在了。"
            jump astro_star_k3

    mc "20:48 还有人在排队看木星，21:20 社长就发现镜筒不见了；这中间只有 7 号在 20:52 下过楼。开水房 20:30 就锁了门，来回五分钟的路，她走了二十六分钟——望远镜，是在热可可中场被带下楼的。"

label astro_star_k4:
    show screen astro_star_banner(3, "第四颗星 · 掌镜人：7 号的记录表、7 号的登记、7 号空着的手电格子——带走望远镜的是谁？")
    menu:
        "社长季遥——只有她最熟悉卸镜步骤":
            hide screen astro_star_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "季遥学姐从八点起就没离开过天台，登记表上一笔也没有她。而且她刚才急得都快哭了。"
            play sound se_write
            mo_note "懂卸镜的人，不只有社长。社课上，大家都学过。"
            jump astro_star_k4

        "南门夜班的魏师傅——东西就在他的窗台底下":
            hide screen astro_star_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "可魏师傅要守南门，一步都走不开呀。九点二十之前，登记表上也没有一个人从楼下上来过。"
            play sound se_write
            mo_note "东西在他门外。可把它带下楼的，是天台上的人。"
            jump astro_star_k4

        "7 号观测员，高一新社员沈小禾":
            hide screen astro_star_banner
            play sound se_correct
            $ _at_stars = 4
            show screen deduction_cutin(headline=_("四颗星连成一座 ——！"), subline="THE EMPTY TRIPOD")
            with flash_shutter

    mc "记录表上的 7 号、登记表上的 7 号、收纳盒里空着的 7 号手电格子，指向同一个人——高一新社员沈小禾。她学过卸镜步骤，也认识南门夜班的魏师傅；她把望远镜带下楼，是为了让一个守在门口走不开的人，亲眼看一次天上的东西。"
    show alice happy at left
    alice "四颗星连起来了！走，去南门——把天文社的望远镜，连同借走它的人，一起接回来。"

label astro_case_resolution:
    scene bg gate at bg_kenburns_in
    $ set_ambient("night")
    $ play_bgm(bgm_warm, fadein=1.5, fadeout=1.0)
    show alice smile at left
    show mo smile at right
    with dissolve

    play sound se_footstep
    "我们再一次走下楼梯的时候，身后多了一串很轻的脚步声。"
    "是那个把记录板抱在胸前的高一女生。她扎着低马尾，校服外面套着一件大了一号的羽绒服，指节冻得通红。"
    xiaohe "……对不起。是我。"
    alice "沈小禾同学？"
    xiaohe "7 号是我。我听见你们在天台上说南门……我不想让魏师傅替我挨骂。"
    "门卫室的门开了。魏师傅披着一件旧军大衣走出来，怀里抱着一只黑色的长条软包，抱得像抱着一个刚睡着的孩子。"
    laowei "小姑娘，你下来干什么？不是说好了，十点散场我把东西交给你们社长，就说是我在草坪上捡的吗。"
    xiaohe "那样不行的，魏师傅。东西是我拿下来的。"
    "她接过软包，拉开拉链。黄铜包边的镜筒安安稳稳地躺在里面，旁边还塞着一副折起来的小三脚架。物镜上没有盖子——盖子在张子谦手里。"
    mc "能告诉我们为什么吗？"
    xiaohe "……魏师傅在南门守了二十八年夜班。下个星期一，他就退休了。"
    xiaohe "每个周五晚上，天文社上天台，都是魏师傅给我们开的门。散场以后，也是他上来锁门。"
    xiaohe "第一次社课那天，我来得太早，在门卫室等钥匙。魏师傅给我倒了一杯茉莉花茶，跟我说……"
    laowei "我说，我在这门口守了二十八年夜，天上的星星天天见，可从来没看清过一颗长什么样。"
    laowei "年轻时候在画报上见过一张土星的照片，带着一圈光环，像戴了一顶草帽。我就琢磨，那东西真挂在天上吗？"
    xiaohe "我答应过魏师傅，退休之前，一定让他亲眼看一次。"
    xiaohe "我去问过社长，能不能把望远镜搬到南门十分钟。社长说不行——去年有人在楼梯上摔碎了目镜，从那以后，望远镜不下天台。"
    xiaohe "可今天，是魏师傅最后一个周五夜班了。他要守门，一步也走不开。"
    "所以中场一开始，她就照着社课上学的步骤，先放平云台、再松开旋钮，把镜筒装进软包，又塞进了社里备用的一副小三脚架。"
    "开水房早就锁了。她跟小林说去打热水，其实一路走到了南门。"
    xiaohe "我在草坪上把它架好，对准土星。魏师傅凑过去，看了很久很久，一句话也没说。"
    laowei "……真有光环。小小的，亮亮的，就那么端端正正地挂着。活了六十年，头一回看清楚。"
    xiaohe "我还得赶回天台记下半场。我怕抱着望远镜上楼来不及，又怕在楼梯上摔了它……魏师傅说他替我看着，十点散场再还。"
    xiaohe "他给我的保温壶灌满了热水。我把红光手电留给了他——晚上看天的人，只许用红光。"
    laowei "她说，红光亮着，就是告诉她：东西在我这儿，放心。"
    xiaohe "我回到天台，社长已经在哭了。黄老师说要按校规处理……我一害怕，就什么都说不出来了。"
    "她低下头，羽绒服的袖口被攥得皱成一团。"
    show mo think at right
    play sound se_page
    "墨墨走过去，在笔记本上写了一行字，转过来给她看。"
    play sound se_write
    mo_note "你没有偷走望远镜。你只是把它带去了一个更需要它的地方。"
    "沈小禾看着那行字，眼眶一点一点红了。"

    show alice think at left
    "楼梯口又传来一阵脚步声。季遥跑在最前面，黄老师跟在后面，再后面，是天文社的社员们。"
    jiyao "沈小禾——"
    xiaohe "社长，对不起。望远镜……一点都没磕着。"
    "季遥接过软包，手指摸过镜筒上那一圈星星贴纸，摸到最旧的那一颗时，停住了。"
    jiyao "第一届社长毕业的时候，在遮光罩里面刻了一行字。我每次擦镜筒都看得见，看了两年，却好像从来没读进去过。"
    jiyao "『给所有想看星星的人。』"
    jiyao "那条规矩是我定的。我只记得要护着它，却忘了它是拿来干什么的。"
    show huang think at center
    huang "……就这样？"
    mc "就这样。一台按步骤卸下来的望远镜，一壶茉莉花茶烧的热水，一支替人亮着的红光手电。望远镜从头到尾，都没有离开过学校。"
    show huang smile at center
    huang "望远镜下楼，得两个人抬，楼梯灯要开着，不许再一个人摸黑走。这一条，你们社自己写进社规。"
    huang "至于今晚——离散场还有十分钟。我看南门的草坪，也挺宽敞。"
    show alice happy at left
    alice "黄老师的意思是……下半场最后十分钟，搬到南门来数！"
    hide huang
    "那天晚上的最后十分钟，天文社二十个人、万事屋三个人，加上一位穿军大衣的门卫，挤在南门的草坪上。"
    "季遥重新架好望远镜，镜筒对准土星。这一次，排在第一个的是魏师傅。"
    "他看了很久，然后直起身，抬头望着天。"
    laowei "原来天上，一直这么热闹。"
    "就在那一刻，一颗很亮的火流星从双子座拖出一道长长的尾巴，划过了整片南天。草坪上响起一片压低的惊呼。"
    "墨墨飞快地在记录表上添了一笔。最后一格，十一颗。"

    scene bg agency at bg_kenburns_in
    $ set_ambient("warm")
    show alice happy at left
    show mo smile at right
    with dissolve
    play sound se_bell
    "下一个星期一，南门换了一位新的夜班门卫。门卫室的窗台上，还留着一支包着红色玻璃纸的小手电。"
    "天文社的社规多了一条：『每年流星夜的最后十分钟，全社搬到南门草坪。望远镜两人搬运，楼梯开灯。』"
    "放学后，艾丽丝把番外卷宗摊在桌上，又从抽屉里翻出那本牛皮纸复盘本。"
    alice "卷宗里添了第六桩短案。复盘本也得扩容——上回的鬼屋，加上今晚的流星夜，两页一起抄进去！"
    mc "复盘本原来只有四页。"
    alice "所以本社长决定了！往后不管添多少桩，复盘本都跟着长。"
    "墨墨翻到最新的一页，没有急着写字，先在页角画了一架望远镜——只画了一圈虚线轮廓，里面空着。"
    play sound se_write
    mo_note "看不见的东西，先画出它的轮廓。等它回来，再一点一点填满。"
    show alice smile at left
    alice "好！万事屋推理笔记复盘本，今天正式扩容到六页！"

    call _astro_finish_case(_at_mistakes) from _call__astro_finish_case
    return
