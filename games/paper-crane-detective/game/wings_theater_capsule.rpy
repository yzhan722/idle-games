## 《沉默侦探：千纸鹤的约定》—— PC-11 雨夜剧场后台的失踪剧本与侦探社学期时间胶囊
## wings_theater_capsule.rpy
##
## 设计要点：
##   1. 100% 零侵入主线剧情（script.rpy / chapter1..6.rpy / interlude.rpy / definitions.rpy / autoplay.rpy 零改动）。
##   2. 「雨夜剧场后台的失踪剧本」（screen extras_rainy_theater + 可重玩短案 label rainy_theater_case）：
##      周五雨夜，话剧社在大礼堂准备文化祭大戏《雨夜的信使》的带妆彩排，导演林思思（班长）那本全社唯一、
##      写满三个星期铅笔批注的导演本，在彩排前四十分钟从后台提词台上消失。
##      玩法三段式：六处后台勘查点（入证物簿、可翻面批注）→ 推理四幕（时刻 → 去向 → 动机 → 执行人，
##      每幕三选一，按顺序演完）→ 服装间结案。选错只给温柔提示、只计入本地 _th_mistakes，绝不触碰主线
##      fail_count / 好感；结案按失误数评定金 / 银 / 铜牌并保存历史最佳纪录，可无限重玩刷新纪录，
##      持久化于 persistent.theater_script_record。真相完全写实（雷声铁皮、热可可、吸墨纸、跳闸的回路与
##      斜光下的铅笔凹痕），无任何超自然要素；犯人与动机温和可亲，与既有人物设定一致。
##   3. 「侦探社学期时间胶囊」（screen extras_time_capsule + 写给一年后的信弹窗）：
##      鉴赏室每项玩法各留下一件学期纪念物（信箱回执 / 方糖糖纸 / 批注铅笔头 / 补页余纸 / 火漆余蜡 / 歪翅膀纸鹤 /
##      收台磁带 / 手描星图 / 铜章拓片 / 巡架卡复印件 / 可可色吸墨纸 / 加洗合照），首次完成对应玩法即可放入胶囊；
##      放满十二件即可封存。另附墨墨与艾丽丝「写给一年后」的两封信，按放入件数解锁拆阅。
##      涉终章的标签续笔与信末附言严格联动 truth_spoiler_unlocked() 零侧信道遮罩，持久化于 persistent.time_capsule_record。
##   4. 本文件按文件名排在 vanished_shelf_album.rpy 之后初始化，双成就追加在 PC-10 之后，成就页扩展为 2×14 = 28 枚。

# —— PC-11 鉴赏室复古水彩 UI 图标命名别名（128x128 RGBA 透明底）——
image ui_icon_theater_backstage = "images/ui/icon_theater_backstage.png"
image ui_icon_missing_script    = "images/ui/icon_missing_script.png"
image ui_icon_time_capsule      = "images/ui/icon_time_capsule.png"
image ui_icon_future_letter     = "images/ui/icon_future_letter.png"

init python:

    # 动态注册 PC-11 双成就，使鉴赏室成就页扩展为 2×14（共 28 枚）严整偶数列对称排布
    if "register_extra_achievement" in globals():
        register_extra_achievement(
            "ach_theater_script",
            "雨夜剧场的幕后侦探",
            "解开雨夜剧场后台的失踪剧本之谜。",
            False,
        )
        register_extra_achievement(
            "ach_time_capsule",
            "学期时间胶囊封存人",
            "封存装满十二件纪念物的时间胶囊。",
            False,
        )

    ############################################################################
    ## 一、雨夜剧场后台的失踪剧本（1 桩可重玩短案 · 6 处勘查点 · 推理四幕 · 金银铜牌评级）
    ############################################################################

    THEATER_CASE = {
        "id": "th1",
        "code": "TH-01",
        "label": "rainy_theater_case",
        "title": "雨夜剧场后台的失踪剧本",
        "short_title": "失踪的导演批注本",
        "time_tag": "周五 18:20 · 大礼堂后台 · 带妆彩排前",
        "companions": "艾丽丝 · 墨墨 · 班长 · 吕芙 · Joker",
        "bg_key": "hall",
        "bg_thumb": "images/bg_hall.png",
        "lighting_note": "舞台工作灯 → 后台走廊 → 服装间暖灯（hall / corridor / storeroom）",
        "spoiler": False,
        "summary_pub": (
            "周五傍晚，话剧社在大礼堂准备文化祭大戏《雨夜的信使》的带妆彩排。五点五十走位排练结束，导演林思思"
            "把全社唯一一本写满铅笔批注的导演本摊在提词台上，去门厅交押金、领盒饭；六点十五分回来时，只剩一只空活页夹。"
            "礼堂只借到九点，七点一刻还开不了场，文化祭前就再也排不上彩排了。"
        ),
        "solution_pub": (
            "结案报告：导演本从未离开礼堂。17:58 Joker 试甩雷声铁皮，留在提词台对 Q 点的吕芙吓了一跳，手肘撞翻保温杯，"
            "热可可泼湿了摊开的第三、四幕。她想起桌角「导演本旁严禁饮料」的便利贴，慌忙擦净桌面、裹起剧本躲进服装间，"
            "挂上「换装中」，用吸墨纸、吹风机和熨斗抢救书页——18:02 两样电器同开，后台回路跳闸。"
            "晕开的铅笔批注，最后靠斜光下的凹痕，一个数字一个数字找了回来。"
        ),
        "mo_note_pub": "墨墨现场手记：「铅笔写过的地方，纸会记得。泼湿的剧本能补回来，不敢说出口的话也一样。」",
        "alice_note_pub": "艾丽丝结案批注：「雨夜剧场失踪案告破！犯人吕芙当场自首，罚她文化祭当天坐在观众席第一排，喝完一整杯热可可！」",
    }

    THEATER_HOTSPOTS = [
        {
            "id": "h1",
            "code": "H-01",
            "label": "提词台与导演桌",
            "scene": "hall",
            "surface": "舞台左侧的提词台上铺开一大片甜甜的可可渍，桌角贴着便利贴，导演本不见了。",
            "detail": (
                "现场手记：可可渍呈扇形朝桌沿外溅开，正中却空出一块边缘笔直、A4 大小的干燥长方形——可可泼出来时，"
                "导演本还压在这里。桌角便利贴写着「导演本旁严禁饮料！——林」，废纸篓里塞满吸饱可可的纸巾；"
                "衣架上六本演员本编号一到六，本本干净。"
            ),
            "evidence": "提词台可可渍：中央空出一块A4大小的干燥长方形",
            "observer": "墨墨（现场手记）",
        },
        {
            "id": "h2",
            "code": "H-02",
            "label": "侧幕后的雷声铁皮",
            "scene": "hall",
            "surface": "舞台右侧的侧幕后吊着一块一人多高的薄铁皮，音效试音记录还摊在折叠桌上。",
            "detail": (
                "现场手记：试音记录最后一行是「17:58 雷声铁皮 ×1 —— Joker」，下面是班长补的红字「太响了！正式演出减半」。"
                "铁皮离对面的提词台足有十二米，中间隔着两道侧幕——甩铁皮的人既够不着、也看不见提词台，只听见对面「哐当」一声。"
            ),
            "evidence": "音效试音记录：17:58雷声铁皮一响，对面提词台哐当一声",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "h3",
            "code": "H-03",
            "label": "化妆镜与预告函",
            "scene": "clubroom",
            "surface": "化妆镜正中贴着一张樱花粉的预告函，镜台边的吹风机挂钩空着。",
            "detail": (
                "现场手记：预告函剪贴着「今夜七时，本怪盗将于第三幕，偷走全场观众的心」，署名 Joker 并画了一颗心，"
                "右下角写着「17:20 贴」——那是戏里的台词。镜台边的吹风机挂钩空空的，插线板的指示灯却还亮着：有人匆匆拔走了吹风机。"
            ),
            "evidence": "化妆镜：17:20贴的戏中预告函，吹风机被人拔走",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "h4",
            "code": "H-04",
            "label": "后台配电箱",
            "scene": "corridor",
            "surface": "后台走廊拐角的配电箱门内侧，夹着一张跳闸记录和一张电工提醒。",
            "detail": (
                "现场手记：记录写着「18:02 化妆间、服装间回路跳闸 · 18:03 已复位 —— 张」。电闸旁贴着电工师傅的红笔提醒："
                "「本回路含化妆间镜前灯与服装间熨斗插座，吹风机与熨斗请勿同时使用！」——跳闸那一刻，有人同时开着吹风机和熨斗。"
            ),
            "evidence": "配电箱：18:02化妆服装间回路跳闸，吹风机与熨斗同开",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "h5",
            "code": "H-05",
            "label": "卸货门与伞架",
            "scene": "corridor",
            "surface": "侧台通往室外的卸货门挂着铜挂锁，门边伞架里插着一排雨伞。",
            "detail": (
                "现场手记：挂锁是张子谦 17:45 搬完布景后从里面锁上的，钥匙一直在他口袋里，门内地垫早已干透。"
                "七把伞的伞尖下都积着水，只有吕芙那把碎花折叠伞干干爽爽——她下午四点下雨前就进了礼堂，"
                "正门又有班长守着，她说的「回文学社」，其实从没出过门。"
            ),
            "evidence": "伞架里唯一一把干伞：吕芙从没离开过礼堂",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "h6",
            "code": "H-06",
            "label": "走廊尽头的服装间",
            "scene": "corridor",
            "surface": "走廊地上落着几滴褐色的小圆点，服装间门把上挂着「换装中」的木牌。",
            "detail": (
                "现场手记：褐色小圆点闻起来是甜的，从提词台出发走了三米就断了，像是有人半路用什么东西把它裹了起来。"
                "服装间挂着「换装中 · 请勿入内」，可今晚换装要到 18:30 才开始；门底下透着一线暖光，"
                "里面低低的嗡嗡声，在我们走近时停了。"
            ),
            "evidence": "服装间：换装还没开始，门口却挂着换装中",
            "observer": "墨墨（现场手记）",
        },
    ]

    _THEATER_HOTSPOT_BY_ID = {h["id"]: h for h in THEATER_HOTSPOTS}

    THEATER_ACT_LINKS = [
        {
            "id": "k1",
            "step": "第一幕",
            "name": "时刻",
            "short": "泼湿之后才被拿走",
            "full": (
                "可可渍正中空着一块 A4 大小的干燥长方形，说明可可泼出来时导演本还在桌上；17:58 雷声铁皮一响、"
                "对面「哐当」一声——导演本是在被泼湿以后，才离开提词台的。"
            ),
        },
        {
            "id": "k2",
            "step": "第二幕",
            "name": "去向",
            "short": "后台走廊的服装间",
            "full": (
                "卸货门 17:45 起从内侧落锁，正门有班长守着，六本演员本也干干净净；可可滴向走廊，"
                "吹风机与熨斗又在同一条跳闸回路上——导演本就在挂着「换装中」的服装间里。"
            ),
        },
        {
            "id": "k3",
            "step": "第三幕",
            "name": "动机",
            "short": "赶在七点前救回它",
            "full": (
                "擦净桌面、拔走吹风机、打开熨斗、挂上「换装中」——这不是偷，也不是捣乱，而是泼湿了导演本的人，"
                "想赶在彩排前把书页吹干、压平，把晕开的批注补回去。"
            ),
        },
        {
            "id": "k4",
            "step": "第四幕",
            "name": "执行人",
            "short": "坐在提词台的吕芙",
            "full": (
                "17:58 留在提词台的只有吕芙，她每天都揣着一杯热可可；她说回了文学社，伞却是干的，"
                "卸货门锁着、正门有人守着——她从没离开过礼堂。"
            ),
        },
    ]

    THEATER_RATING_TIERS = [
        {"key": "gold",   "name": "金牌", "title": "谢幕名侦探", "rule": "零失误",         "max_mistakes": 0},
        {"key": "silver", "name": "银牌", "title": "后台推理员", "rule": "失误 1～2 次",    "max_mistakes": 2},
        {"key": "bronze", "name": "铜牌", "title": "见习场务",   "rule": "失误 3 次及以上", "max_mistakes": 999},
    ]

    _THEATER_TIER_BY_KEY = {t["key"]: t for t in THEATER_RATING_TIERS}
    _THEATER_TIER_RANK = {"gold": 3, "silver": 2, "bronze": 1}

    # 在证物簿里登记六件后台证物的翻面批注（与委托信箱、闭馆图书馆同一套 register_evidence_detail 机制）
    if "register_evidence_detail" in globals():
        for _th in THEATER_HOTSPOTS:
            register_evidence_detail(_th["evidence"], _th["observer"], _th["detail"])

    def theater_tier_def(tier_key):
        return _THEATER_TIER_BY_KEY.get(tier_key, THEATER_RATING_TIERS[-1])

    def theater_rate(mistakes_count=0):
        """按本局失误数评定评级：0 次金牌，1～2 次银牌，3 次及以上铜牌。"""
        m = max(0, int(mistakes_count or 0))
        for tier in THEATER_RATING_TIERS:
            if m <= tier["max_mistakes"]:
                return tier
        return THEATER_RATING_TIERS[-1]

    def theater_get_hotspot(hotspot_id):
        return _THEATER_HOTSPOT_BY_ID.get(hotspot_id, THEATER_HOTSPOTS[0])

    def _ensure_theater_store():
        if not isinstance(getattr(persistent, "theater_script_record", None), dict):
            persistent.theater_script_record = {}
        return persistent.theater_script_record

    def theater_get_record():
        raw = _ensure_theater_store()
        last_tier = raw.get("last_tier")
        return {
            "solved": bool(raw.get("solved", False)),
            "replays": save_int(raw.get("replays"), 0),
            "best_tier": casefile_best_key(raw),
            "last_tier": last_tier if isinstance(last_tier, str) and last_tier in _THEATER_TIER_RANK else None,
            "best_mistakes": save_int(raw.get("best_mistakes")),
            "last_mistakes": save_int(raw.get("last_mistakes")),
            "inspected": [h for h in (raw.get("inspected") or []) if h in _THEATER_HOTSPOT_BY_ID],
            "report_viewed": bool(raw.get("report_viewed", False)),
        }

    def _theater_write(updates):
        store_dict = dict(_ensure_theater_store())
        store_dict.update(updates)
        persistent.theater_script_record = store_dict
        return store_dict

    def theater_case_solved_count():
        return 1 if theater_get_record()["solved"] else 0

    def theater_gold_count():
        return 1 if theater_get_record()["best_tier"] == "gold" else 0

    def theater_best_short():
        """案卷与鉴赏页使用：历史最佳评级名，未结案时显示「待结案」。"""
        rec = theater_get_record()
        return theater_tier_def(rec["best_tier"])["name"] if rec["best_tier"] else "待结案"

    def theater_select_hotspot(hotspot_id):
        hdef = theater_get_hotspot(hotspot_id)
        persistent.theater_selected_hotspot = hdef["id"]
        renpy.save_persistent()

    def theater_inspect_hotspot(hotspot_id):
        """剧场内勘查一处后台现场：证物入簿（可翻面），并把勘查点记入鉴赏页档案；只写雨夜剧场自己的存档。"""
        hdef = _THEATER_HOTSPOT_BY_ID.get(hotspot_id)
        if hdef is None:
            return False
        if "add_evidence" in globals():
            add_evidence(hdef["evidence"])
        seen = list(theater_get_record()["inspected"])
        if hdef["id"] not in seen:
            seen.append(hdef["id"])
        _theater_write({"inspected": seen})
        persistent.theater_selected_hotspot = hdef["id"]
        renpy.save_persistent()
        return True

    def theater_record_solve(mistakes_count=0):
        """记录一次结案：评定本局评级、刷新历史最佳（最高评级 + 最少失误）与累计结案次数。
        只写雨夜剧场自己的存档，绝不触碰主线 fail_count / 好感。"""
        m = max(0, int(mistakes_count or 0))
        tier = theater_rate(m)
        prev = theater_get_record()
        is_first = not prev["solved"]
        prev_rank = _THEATER_TIER_RANK.get(prev["best_tier"], 0)
        best_tier = tier["key"] if _THEATER_TIER_RANK[tier["key"]] >= prev_rank else prev["best_tier"]
        best_m = m if prev["best_mistakes"] is None else min(prev["best_mistakes"], m)
        new_record = (not is_first) and (prev["best_mistakes"] is None or m < prev["best_mistakes"])
        _theater_write({
            "solved": True,
            "replays": prev["replays"] + 1,
            "best_tier": best_tier,
            "last_tier": tier["key"],
            "best_mistakes": best_m,
            "last_mistakes": m,
            "inspected": [h["id"] for h in THEATER_HOTSPOTS],
        })
        ach_grant("ach_theater_script")
        renpy.save_persistent()
        result = theater_get_record()
        result["is_first"] = is_first
        result["new_record"] = new_record
        return result

    def theater_open_report_modal():
        if theater_get_record()["solved"]:
            _theater_write({"report_viewed": True})
            renpy.save_persistent()
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("theater_report_modal")

    def theater_render_view():
        """渲染雨夜剧场卷宗：结案前只公开案情与勘查点表面，结案后显影推理四幕、结案报告与双人手记。"""
        rec = theater_get_record()
        solved = rec["solved"]
        best = theater_tier_def(rec["best_tier"]) if rec["best_tier"] else None
        if best:
            best_line = "%s「%s」 · 最少失误 %d 次" % (best["name"], best["title"], rec["best_mistakes"] or 0)
        else:
            best_line = "尚未结案"
        return {
            "code": THEATER_CASE["code"],
            "title": THEATER_CASE["title"],
            "short_title": THEATER_CASE["short_title"],
            "time_tag": THEATER_CASE["time_tag"],
            "summary": THEATER_CASE["summary_pub"],
            "solved": solved,
            "replays": rec["replays"],
            "best_tier": rec["best_tier"],
            "best_name": best["name"] if best else "待结案",
            "best_line": best_line,
            "inspected_count": len(rec["inspected"]),
            "act_shorts": [(k["short"] if solved else "") for k in THEATER_ACT_LINKS],
            "act_fulls": [(k["full"] if solved else "") for k in THEATER_ACT_LINKS],
            "display_solution": THEATER_CASE["solution_pub"] if solved else "",
            "display_mo_note": THEATER_CASE["mo_note_pub"] if solved else "",
            "display_alice_note": THEATER_CASE["alice_note_pub"] if solved else "",
        }

    def theater_launch_action():
        return [
            Function(stop_all_gramophone_ambience, True),
            SetField(persistent, "extras_tab", "theater"),
            Replay(THEATER_CASE["label"], scope={"player_name": persistent.last_player_name or "陈默"}, locked=False),
        ]

    ############################################################################
    ## 二、侦探社学期时间胶囊（12 件学期纪念物 · 3×4 胶囊格 · 放入与封存 · 两封写给一年后的信）
    ############################################################################

    CAPSULE_ITEMS = [
        {
            "id": "c01", "code": "C-01", "name": "第一张委托回执",
            "source": "委托信箱", "tab": "mailbox", "progress_key": "mailbox", "need": 1,
            "icon": "images/ui/icon_club_mailbox.png",
            "condition": "破解任意一桩委托信箱短案卷",
            "spoiler": False,
            "mo_tag": "回执的边角被我折过一道。那是我第一次在委托单上签下万事屋的名字，笔尖有点抖。",
            "alice_tag": "本社长的「已结案」红章盖歪了三度——别笑，那是激动得手抖！一年后打开，要先给它补盖一个正的！",
        },
        {
            "id": "c02", "code": "C-02", "name": "包方糖的糖纸",
            "source": "午后茶话会", "tab": "teaparty", "progress_key": "teaparty", "need": 1,
            "icon": "images/ui/icon_tea_party_cup.png",
            "condition": "完成任意一场午后茶话会问答",
            "spoiler": False,
            "mo_tag": "糖纸被我抚平了，夹在两张书签中间。茶话会那天，方糖在我杯子里化得最慢。",
            "alice_tag": "这张糖纸本社长闻过了，还有伯爵红茶的味道！胶囊打开那天，茶话会必须原班人马重开一场！",
        },
        {
            "id": "c03", "code": "C-03", "name": "写秃的批注铅笔头",
            "source": "批注辞典", "tab": "lexicon", "progress_key": "lexicon", "need": 1,
            "icon": "images/ui/icon_mystery_lexicon.png",
            "condition": "读过任意一条批注辞典公开词条",
            "spoiler": False,
            "mo_tag": "这支铅笔写满了半本辞典的页边。短到握不住的时候，我还是舍不得扔。",
            "alice_tag": "三个人轮流用同一支铅笔写批注，难怪秃得这么快！一年后谁的字最多，谁就请大家吃关东煮！",
        },
        {
            "id": "c04", "code": "C-04", "name": "补页剩下的宣纸角",
            "source": "古籍修复台", "tab": "restoration", "progress_key": "restoration", "need": 1,
            "icon": "images/ui/icon_book_restoration.png",
            "condition": "修复任意一卷古典推理残卷",
            "spoiler": False,
            "mo_tag": "补完残页剩下的一角宣纸，边上还留着浆糊的印子。旧书街的台灯，好像也一起被收进来了。",
            "alice_tag": "书店老板说这角宣纸能放一百年不发黄。那本社长就把它放进胶囊，替我们证明一下！",
        },
        {
            "id": "c05", "code": "C-05", "name": "春樱火漆印的余蜡",
            "source": "四季信笺匣", "tab": "letterbox", "progress_key": "letterbox", "need": 1,
            "icon": "images/ui/icon_seasonal_letterbox.png",
            "condition": "钤盖任意一枚四季信笺火漆印",
            "spoiler": False,
            "mo_tag": "火漆滴歪了一点，凝成了一片小小的花瓣形状。我觉得这样也很好看。",
            "alice_tag": "春夏秋冬四种颜色的余蜡，本社长先放一块春天的进去——剩下三块，留给明年的我们慢慢攒！",
        },
        {
            "id": "c06", "code": "C-06", "name": "歪翅膀的试折纸鹤",
            "source": "千纸鹤陈列柜", "tab": "origami", "progress_key": "origami", "need": 1,
            "icon": "images/ui/icon_origami_cabinet.png",
            "condition": "在千纸鹤陈列柜折检任意一式纸鹤",
            "spoiler": True,
            "mo_tag": "这只纸鹤的翅膀是歪的。可它是我们在陈列柜前折的第一只，所以要放在胶囊的最上面。",
            "alice_tag": "歪翅膀是侦探社的传统！谁敢说它丑，本社长就罚他折一百只正的来赔！",
            "mo_tag_secret": "胶囊里，歪翅膀纸鹤旁边还躺着一只很旧很旧的白纸鹤。四年前没能送出去的那个约定，这一次，我想让它和大家待在一起。",
            "alice_tag_secret": "墨墨放白纸鹤进去的时候，手一直在抖。本社长假装在找胶带，其实一直在旁边看着——好样的，墨墨。",
        },
        {
            "id": "c07", "code": "C-07", "name": "收台那一夜的磁带",
            "source": "旧广播电台", "tab": "radio", "progress_key": "radio", "need": 1,
            "icon": "images/ui/icon_radio_booth_mic.png",
            "condition": "解开任意一封旧广播电台听众来信",
            "spoiler": True,
            "mo_tag": "磁带的标签是我写的：暮色点播台，收台。卷带的时候，我数到了第三圈才停下。",
            "alice_tag": "主播艾丽丝、导播陈默、编剧兼音效墨墨——这盘磁带要是被别人听见，侦探社的秘密就全泄露啦！",
            "mo_tag_secret": "这盘磁带的 B 面，录着我亲口念的收台词。一年后打开胶囊的时候，我想当着大家的面，再念一遍给你们听。",
            "alice_tag_secret": "B 面那一轨，本社长一个人偷偷听了七遍。第八遍，要等胶囊打开那天，大家一起听！",
        },
        {
            "id": "c08", "code": "C-08", "name": "手描的秋夜星图",
            "source": "钟楼星象馆", "tab": "planetarium", "progress_key": "planetarium", "need": 1,
            "icon": "images/ui/icon_clocktower_planetarium.png",
            "condition": "破解任意一笺钟楼星图暗号",
            "spoiler": True,
            "mo_tag": "我照着星象仪描了一张秋夜星图，北斗的勺柄画得长了一点点。星星应该不会介意。",
            "alice_tag": "这张星图本社长要求加印！一年后的秋天，我们再爬一次钟楼，对着它把星星一颗颗数回来！",
            "mo_tag_secret": "星图背面，我写了小可的名字，还画了河堤和那对金蓝双星。明年秋天，我想带她一起来认星星。",
            "alice_tag_secret": "本社长在背面补了一行：周可同学，一年后的钟楼观测会，你的位置我们已经留好了！",
        },
        {
            "id": "c09", "code": "C-09", "name": "第一枚铜章的拓片",
            "source": "铜章手账册", "tab": "badges", "progress_key": "badges", "need": 1,
            "icon": "images/ui/icon_badge_journal.png",
            "condition": "在铜章手账册拓印任意一枚铜章",
            "spoiler": False,
            "mo_tag": "铅笔一层层擦出来的拓片，铜章边上的花纹一条都没漏。拓的时候，大家都屏住了呼吸。",
            "alice_tag": "拓片上那块黑乎乎的指印是陈默的！本社长决定不擦掉，这叫历史的证据！",
        },
        {
            "id": "c10", "code": "C-10", "name": "「移」字巡架卡复印件",
            "source": "闭馆图书馆", "tab": "library", "progress_key": "library", "need": 1,
            "icon": "images/ui/icon_closed_library.png",
            "condition": "解开闭馆图书馆消失书架之谜",
            "spoiler": False,
            "mo_tag": "王老师在巡架卡上只写了一个字。我们找了一整晚，才把这个字读成一句完整的话。",
            "alice_tag": "复印件是小林偷偷印给我们的！原件还挂在 E-7 专架上，王老师说那是他的『自首书』！",
        },
        {
            "id": "c11", "code": "C-11", "name": "彩排夜的票根",
            "source": "雨夜剧场", "tab": "theater", "progress_key": "theater", "need": 1,
            "icon": "images/ui/icon_theater_backstage.png",
            "condition": "解开雨夜剧场后台的失踪剧本之谜",
            "spoiler": False,
            "mo_tag": "彩排夜的票根背面，夹着吕芙送我的那张吸墨纸。浅褐色的可可渍底下，印着一行反过来的铅笔字：Q47，渐暗。",
            "alice_tag": "雨夜剧场的纪念品！闻起来还是甜的——本社长宣布，胶囊里禁止饮料，但可以有可可味！",
        },
        {
            "id": "c12", "code": "C-12", "name": "加洗的第一张合照",
            "source": "合照相册", "tab": "album", "progress_key": "album", "need": 1,
            "icon": "images/ui/icon_photo_album.png",
            "condition": "在合照相册冲洗任意一张侦探社合照",
            "spoiler": False,
            "mo_tag": "冲洗出来的第一张合照，我又多加洗了一张。一张贴在相册里，一张放进胶囊，给一年后的我们。",
            "alice_tag": "合照背面本社长写了：一年后要站在同一个位置再拍一张，谁胖了谁请客！",
        },
    ]

    _CAPSULE_BY_ID = {c["id"]: c for c in CAPSULE_ITEMS}

    # progress_key -> 计数函数名；运行期按名字取函数，模块加载顺序互不依赖（只读各玩法公开计数，不读任何剧透文本）
    _CAPSULE_PROGRESS_FNS = {
        "mailbox":     "mailbox_solved_count",
        "teaparty":    "tea_party_cleared_count",
        "restoration": "restoration_completed_count",
        "letterbox":   "letterbox_seal_count",
        "origami":     "origami_inspected_count",
        "radio":       "radio_solved_count",
        "planetarium": "planetarium_solved_count",
        "badges":      "badge_stamped_count",
        "library":     "library_case_solved_count",
        "theater":     "theater_case_solved_count",
        "album":       "album_developed_count",
    }

    CAPSULE_LETTERS = [
        {
            "id": "lt_alice",
            "code": "L-A",
            "author": "艾丽丝",
            "title": "致一年后的万事屋",
            "need": 4,
            "spoiler": True,
            "body_pub": (
                "一年后的万事屋全体成员：你们好！我是一年前的社长艾丽丝。现在是放学后，窗外在下雨，"
                "墨墨在给胶囊里的纸鹤摆位置，陈默在旁边帮倒忙。这一个学期，我们接了委托、开了茶话会、"
                "修了旧书、守着电台到收台，还在钟楼上数过星星。代价簿上记的每一笔账，其实都是我们一起"
                "度过的时间。所以一年后的你们，不许忘记这里写下的约定：万事屋永远有三把椅子，"
                "谁也不许缺席。如果到时候我变成了更厉害的社长，记得夸我；如果没有，也要夸我！"
            ),
            "body_secret": (
                "附言（只写给我们三个人）：那个冬天电视里的小雪侦探，我一直记得。现在她叫墨墨，"
                "会在公告板上画雪花，会把可可让给别人。一年后打开胶囊的时候，我想听她亲口说一句好久不见。"
            ),
            "sign": "万事屋社长 · 艾丽丝（盖章！）",
        },
        {
            "id": "lt_mo",
            "code": "L-M",
            "author": "墨墨",
            "title": "写给一年后的侦探社",
            "need": 8,
            "spoiler": True,
            "body_pub": (
                "一年后的侦探社：这封信是用铅笔写的，写错了好几次，又擦掉了好几次。这个学期，我的笔记本用完了两本。"
                "第一本写满了线索，第二本写满了大家——艾丽丝的红章，陈默替我念出来的推理，雨夜里一起撑的伞，"
                "还有茶话会上多出来的那块方糖。我以前觉得，只要写在本子上，就不会弄丢。现在我知道了，"
                "有些东西不用写下来，也会一直在。一年后的我们，大概还会在万事屋里吵吵闹闹吧。那就好。"
            ),
            "body_secret": (
                "附：这封信的最后一句，我没有写在纸上。我想等胶囊打开的那天，亲口念给你们听。"
                "到时候小可也会来，我们一起把没折完的千纸鹤折完。"
            ),
            "sign": "侦探社 · 墨墨（铅笔字）",
        },
    ]

    _CAPSULE_LETTER_BY_ID = {l["id"]: l for l in CAPSULE_LETTERS}

    CAPSULE_SPOILER_NOTICE = "【防剧透火漆保护：这一处的续笔涉终章旧约，通关 TRUE END 或点击右上角「解锁剧透」后自动显影】"

    def capsule_get_def(item_id):
        return _CAPSULE_BY_ID.get(item_id, CAPSULE_ITEMS[0])

    def capsule_get_letter(letter_id):
        return _CAPSULE_LETTER_BY_ID.get(letter_id, CAPSULE_LETTERS[0])

    def _ensure_capsule_store():
        if not isinstance(getattr(persistent, "time_capsule_record", None), dict):
            persistent.time_capsule_record = {}
        return persistent.time_capsule_record

    def capsule_get_record():
        raw = _ensure_capsule_store()
        return {
            "placed": [c for c in (raw.get("placed") or []) if c in _CAPSULE_BY_ID],
            "sealed": bool(raw.get("sealed", False)),
            "seal_count": int(raw.get("seal_count", 0) or 0),
            "letters_read": [l for l in (raw.get("letters_read") or []) if l in _CAPSULE_LETTER_BY_ID],
        }

    def _capsule_write(updates):
        store_dict = dict(_ensure_capsule_store())
        store_dict.update(updates)
        persistent.time_capsule_record = store_dict
        return store_dict

    def _capsule_lexicon_public_read():
        entries = globals().get("LEXICON_ENTRIES") or []
        is_read = globals().get("lexicon_is_read")
        if is_read is None:
            return 0
        return sum(1 for e in entries if not e.get("spoiler", False) and is_read(e["id"]))

    def capsule_progress(item_id):
        """返回 (当前进度, 放入所需)；只读各玩法自身的公开计数。"""
        cdef = capsule_get_def(item_id)
        key = cdef["progress_key"]
        need = max(1, int(cdef["need"]))
        if key == "lexicon":
            cur = _capsule_lexicon_public_read()
        else:
            fn = globals().get(_CAPSULE_PROGRESS_FNS.get(key, ""))
            try:
                cur = int(fn()) if fn is not None else 0
            except Exception:
                cur = 0
        return (max(0, min(cur, need)), need)

    def capsule_is_earned(item_id):
        cur, need = capsule_progress(item_id)
        return need > 0 and cur >= need

    def capsule_item_status(item_id):
        if capsule_get_def(item_id)["id"] in capsule_get_record()["placed"]:
            return "placed"
        if capsule_is_earned(item_id):
            return "earned"
        return "locked"

    def capsule_placed_count():
        return len(capsule_get_record()["placed"])

    def capsule_earned_count():
        return sum(1 for c in CAPSULE_ITEMS if capsule_item_status(c["id"]) != "locked")

    def capsule_is_sealed():
        return capsule_get_record()["sealed"]

    def capsule_can_seal():
        rec = capsule_get_record()
        return (not rec["sealed"]) and len(rec["placed"]) >= len(CAPSULE_ITEMS)

    def capsule_select(item_id):
        persistent.capsule_selected_item = capsule_get_def(item_id)["id"]
        renpy.save_persistent()

    def capsule_place(item_id):
        """把一件已留下的纪念物放进胶囊；未留下时只给温柔提示。只写时间胶囊自己的存档。"""
        cdef = capsule_get_def(item_id)
        cid = cdef["id"]
        persistent.capsule_selected_item = cid
        rec = capsule_get_record()
        if cid in rec["placed"]:
            return rec
        if not capsule_is_earned(cid):
            renpy.notify("这件纪念物还没有留下：先去完成「%s」的对应玩法吧" % cdef["source"])
            return None
        _capsule_write({"placed": rec["placed"] + [cid]})
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.save_persistent()
        return capsule_get_record()

    def capsule_seal():
        """十二件纪念物全部放入后封存胶囊，解锁 ach_time_capsule；不满时只给温柔提示。"""
        rec = capsule_get_record()
        if rec["sealed"]:
            return rec
        if len(rec["placed"]) < len(CAPSULE_ITEMS):
            renpy.notify("胶囊还没有放满：还差 %d 件学期纪念物" % (len(CAPSULE_ITEMS) - len(rec["placed"])))
            return None
        _capsule_write({"sealed": True, "seal_count": rec["seal_count"] + 1})
        renpy.sound.play("audio/sfx_crane.ogg")
        ach_grant("ach_time_capsule")
        renpy.save_persistent()
        return capsule_get_record()

    def capsule_letter_readable(letter_id):
        return capsule_placed_count() >= capsule_get_letter(letter_id)["need"]

    def capsule_open_letter(letter_id):
        """拆阅一封写给一年后的信；放入件数不足时只给温柔提示。"""
        ldef = capsule_get_letter(letter_id)
        if not capsule_letter_readable(ldef["id"]):
            renpy.notify("再放入 %d 件纪念物，才能拆阅这封信" % (ldef["need"] - capsule_placed_count()))
            return False
        rec = capsule_get_record()
        if ldef["id"] not in rec["letters_read"]:
            _capsule_write({"letters_read": rec["letters_read"] + [ldef["id"]]})
            renpy.save_persistent()
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("capsule_letter_modal", letter_id=ldef["id"])
        return True

    def capsule_render_item(item_id):
        """渲染纪念物标签：未放入不显示标签短评；涉终章续笔只在 truth_spoiler_unlocked() 为真时出现。
        遮罩状态下的返回值与续笔文本完全无关（零侧信道：不暴露长度、有无或任何派生字段）。"""
        cdef = capsule_get_def(item_id)
        cur, need = capsule_progress(cdef["id"])
        status = capsule_item_status(cdef["id"])
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        has_sp = bool(cdef.get("spoiler", False))
        placed = (status == "placed")
        show_secret = placed and has_sp and unlocked
        return {
            "id": cdef["id"],
            "code": cdef["code"],
            "name": cdef["name"],
            "source": cdef["source"],
            "tab": cdef["tab"],
            "icon": cdef["icon"],
            "condition": cdef["condition"],
            "progress_cur": cur,
            "progress_total": need,
            "status": status,
            "placed": placed,
            "spoiler": has_sp,
            "unlocked": (unlocked if has_sp else True),
            "display_mo_tag": cdef["mo_tag"] if placed else "",
            "display_alice_tag": cdef["alice_tag"] if placed else "",
            "display_mo_secret": cdef.get("mo_tag_secret", "") if show_secret else "",
            "display_alice_secret": cdef.get("alice_tag_secret", "") if show_secret else "",
            "display_masked_notice": (CAPSULE_SPOILER_NOTICE if (has_sp and not unlocked) else ""),
        }

    def capsule_render_letter(letter_id):
        """渲染写给一年后的信：放入件数不足时正文为空；信末附言只在 truth_spoiler_unlocked() 为真时出现。
        遮罩状态下的返回值与附言文本完全无关（零侧信道）。"""
        ldef = capsule_get_letter(letter_id)
        placed_n = capsule_placed_count()
        readable = placed_n >= ldef["need"]
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        has_sp = bool(ldef.get("spoiler", False))
        show_secret = readable and has_sp and unlocked
        return {
            "id": ldef["id"],
            "code": ldef["code"],
            "author": ldef["author"],
            "title": ldef["title"],
            "need": ldef["need"],
            "placed_count": placed_n,
            "readable": readable,
            "read": ldef["id"] in capsule_get_record()["letters_read"],
            "spoiler": has_sp,
            "unlocked": (unlocked if has_sp else True),
            "display_body": ldef["body_pub"] if readable else "",
            "display_sign": ldef["sign"] if readable else "",
            "display_secret": ldef.get("body_secret", "") if show_secret else "",
            "display_masked_notice": (CAPSULE_SPOILER_NOTICE if (has_sp and not unlocked) else ""),
        }


################################################################################
## 三、鉴赏分页界面 A：雨夜剧场后台的失踪剧本（screen extras_rainy_theater）
################################################################################

transform theater_spot_sway:
    subpixel True
    block:
        ease 1.8 alpha 0.78 rotate -3
        ease 1.8 alpha 1.0 rotate 3
        repeat

transform capsule_tin_bob:
    subpixel True
    block:
        ease 2.4 yoffset -2 zoom 1.02
        ease 2.4 yoffset 0 zoom 1.0
        repeat

screen extras_rainy_theater():
    $ _tv = theater_render_view()
    $ _trec = theater_get_record()
    $ _thid = persistent.theater_selected_hotspot or "h1"
    $ _th = theater_get_hotspot(_thid)
    $ _th_seen = (_th["id"] in _trec["inspected"])

    vbox:
        spacing 9

        ## 1. 雨夜剧场总览横幅（丝绒幕布配色）
        frame:
            style "theater_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_theater_backstage.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("雨夜剧场后台的失踪剧本") font gui.name_text_font size 19 color "#ffe4ea"
                        if _tv["solved"]:
                            text _("已结案 · 推理四幕全部演完 · 可随时重返后台冲击金牌") size 12 color "#f2c4d0"
                        else:
                            text _("彩排前四十分钟，全社唯一的导演本不见了 · 六处后台等你勘查") size 12 color "#d9b4c6"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_missing_script.png" xysize (14, 14) yalign 0.5
                            text ("最佳 %s" % _tv["best_name"]) size 12 color "#f4d98a" yalign 0.5 substitute False
                    frame:
                        style "mailbox_stat_chip"
                        text ("结案 %d 次" % _tv["replays"]) size 12 color "#f2a7b8" align (0.5, 0.5) substitute False

        ## 2. 卷宗详情：舞台缩略图、案情、六处勘查点、推理四幕与评级
        frame:
            style "theater_console_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add THEATER_CASE["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add "images/ui/icon_theater_backstage.png" xysize (24, 24) xalign 0.05 yalign 0.08
                        if _tv["solved"]:
                            add "images/ui/icon_missing_script.png" xysize (26, 26) xalign 0.96 yalign 0.08 at theater_spot_sway
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text THEATER_CASE["code"] size 12 color "#ffffff" bold True align (0.5, 0.5)
                            text ("《%s》" % THEATER_CASE["short_title"]) font gui.name_text_font size 17 color "#ffe4ea" yalign 0.5 substitute False
                        text ("%s  ·  %s" % (THEATER_CASE["time_tag"], THEATER_CASE["companions"])) size 12 color "#e6b8c8" substitute False
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (15, 15) yalign 0.5
                            text ("后台光影：%s" % THEATER_CASE["lighting_note"]) size 12 color "#b98fa6" yalign 0.5 substitute False
                        if _tv["solved"]:
                            text ("结案档案：%s（已结案 %d 次 · 六处后台全勘查）" % (_tv["best_line"], _tv["replays"])) size 12 color "#f4d98a" substitute False
                        else:
                            text ("结案档案：尚未结案（已勘查 %d/6 处，可先翻看下方勘查点，再推开礼堂的侧门）" % _tv["inspected_count"]) size 12 color "#9a7f99" substitute False

                text THEATER_CASE["summary_pub"] size 13 color "#f6e6ee" line_spacing 3 substitute False

                ## 2A. 六处后台勘查点（3 × 226 + 2 × 8 = 694px 精确贴合内宽，两行）
                text _("后台勘查点 · 点击翻看六处痕迹（在雨夜后台亲自勘查过的地方，会显影墨墨的现场手记）：") size 12 color "#f2a7b8" bold True
                grid 3 2:
                    spacing 8
                    for h_obj in THEATER_HOTSPOTS:
                        $ _h_seen = (h_obj["id"] in _trec["inspected"])
                        $ _h_active = (h_obj["id"] == _th["id"])
                        button:
                            style "restoration_clue_card"
                            selected _h_active
                            action Function(theater_select_hotspot, h_obj["id"])
                            vbox:
                                spacing 2
                                xfill True
                                hbox:
                                    xfill True
                                    yalign 0.5
                                    text ("%s · %s" % (h_obj["code"], h_obj["label"])) size 11 color ("#f2a7b8" if _h_active else "#f0dce6") bold True yalign 0.5 substitute False
                                    text (_("已勘查") if _h_seen else _("待勘查")) size 10 color ("#86efac" if _h_seen else "#9a7f99") xalign 1.0 yalign 0.5
                                text h_obj["surface"] size 11 color "#d9b4c6" line_spacing 2 substitute False

                frame:
                    xfill True
                    padding (10, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        spacing 8
                        add "images/ui/icon_missing_script.png" xysize (20, 20)
                        vbox:
                            spacing 2
                            text ("%s · %s" % (_th["code"], _th["label"])) size 12 color "#f2a7b8" bold True substitute False
                            if _th_seen:
                                text _th["detail"] size 12 color "#fff1f4" line_spacing 2 substitute False
                            else:
                                text _("还没有在雨夜后台勘查这一处。走进现场亲自看过之后，墨墨的现场手记会显影在这里。") size 12 color "#9a7f99"

                ## 2B. 推理四幕（4 × 167 + 3 × 8 = 692px <= 694px）
                text _("推理四幕 · 复盘（时刻 → 去向 → 动机 → 执行人，结案后显影）：") size 12 color "#f2a7b8" bold True
                hbox:
                    spacing 8
                    for _ki, k_obj in enumerate(THEATER_ACT_LINKS):
                        frame:
                            style "theater_act_slot"
                            vbox:
                                spacing 2
                                text ("%s · %s" % (k_obj["step"], k_obj["name"])) size 11 color ("#86efac" if _tv["solved"] else "#e6b8c8") bold True substitute False
                                text (_tv["act_shorts"][_ki] if _tv["solved"] else _("？ 待开演")) size 12 color ("#fff1f4" if _tv["solved"] else "#8f7088") substitute False

                ## 2C. 评级与结案报告预览匣
                frame:
                    style "theater_ticket_card"
                    vbox:
                        spacing 5
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_missing_script.png" xysize (16, 16) yalign 0.5
                                text _("评级 · 重玩挑战") font gui.name_text_font size 13 color "#fff1f4" yalign 0.5
                            text ("历史最佳：%s" % _tv["best_line"]) size 11 color "#f4d98a" xalign 1.0 yalign 0.5 substitute False
                        hbox:
                            spacing 8
                            for t_obj in THEATER_RATING_TIERS:
                                frame:
                                    style "theater_tier_chip"
                                    hbox:
                                        xfill True
                                        yalign 0.5
                                        text ("%s「%s」" % (t_obj["name"], t_obj["title"])) size 12 color ("#f4d98a" if _tv["best_tier"] == t_obj["key"] else "#f0dce6") yalign 0.5 substitute False
                                        text t_obj["rule"] size 11 color "#c6a8b8" xalign 1.0 yalign 0.5
                        if _tv["solved"]:
                            add Solid("#f2a7b833") ysize 1
                            text _tv["display_solution"] size 12 color "#86efac" line_spacing 2 substitute False
                            text _tv["display_mo_note"] size 12 color "#cfa6f0" substitute False
                            text _tv["display_alice_note"] size 12 color "#f0c060" substitute False
                        else:
                            text _("结案报告：解开雨夜剧场之谜后，墨墨会把完整的推理四幕与结案报告写在这里。") size 12 color "#9a7f99"

                ## 2D. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("零失误演完推理四幕可获金牌 · 已结案 %d 次" % _tv["replays"]) size 12 color "#b08ca2" yalign 0.5 substitute False
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton _("展阅结案报告"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(theater_open_report_modal)
                        textbutton (_("重返雨夜后台") if _tv["solved"] else _("推开礼堂侧门")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action theater_launch_action()

        ## 3. 时间胶囊直达条
        $ _c11 = capsule_item_status("c11")
        frame:
            style "mailbox_quick_row"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_time_capsule.png" xysize (20, 20) yalign 0.5
                    text _("时间胶囊 · C-11 彩排夜的票根") font gui.name_text_font size 14 color "#f2e6ff" yalign 0.5
                    text ("（%s）" % ({"placed": "已放入", "earned": "可放入"}.get(_c11, "结案后留下"))) size 12 color ("#86efac" if _c11 != "locked" else "#7e6d99") yalign 0.5
                textbutton _("打开胶囊"):
                    style "gramophone_mini_pill"
                    xalign 1.0
                    yalign 0.5
                    action [SetField(persistent, "capsule_selected_item", "c11"), SetField(persistent, "extras_tab", "capsule")]


## 雨夜剧场结案报告独立展阅弹窗
screen theater_report_modal():
    modal True
    zorder 215
    $ _mv = theater_render_view()

    add "#0a0510dc"
    key "K_ESCAPE" action Hide("theater_report_modal")
    key "K_RETURN" action Hide("theater_report_modal")
    key "K_SPACE" action Hide("theater_report_modal")

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
                    add "images/ui/icon_theater_backstage.png" xysize (40, 40) yalign 0.5
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_mv["code"], _mv["short_title"])) font gui.name_text_font size 20 color "#ffe4ea" substitute False
                        text _mv["time_tag"] size 12 color "#e6b8c8" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_missing_script.png" xysize (30, 30) yalign 0.5 at theater_spot_sway
                    text _mv["best_name"] size 13 color "#f4d98a" bold True yalign 0.5

            add Solid("#f2a7b844") ysize 1

            viewport:
                xfill True
                ysize 336
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    text _("案情：") size 12 color "#f2a7b8" bold True
                    text _mv["summary"] size 13 color "#f6e6ee" line_spacing 4 substitute False
                    add Solid("#e6b8c833") ysize 1
                    if _mv["solved"]:
                        text _("推理四幕：") size 12 color "#f2a7b8" bold True
                        for _ri, r_obj in enumerate(THEATER_ACT_LINKS):
                            text ("%s · %s：%s" % (r_obj["step"], r_obj["name"], _mv["act_fulls"][_ri])) size 13 color "#f0dce6" line_spacing 3 substitute False
                        add Solid("#f2a7b833") ysize 1
                        text _mv["display_solution"] size 13 color "#86efac" line_spacing 4 substitute False
                        text _mv["display_mo_note"] size 13 color "#cfa6f0" line_spacing 4 substitute False
                        text _mv["display_alice_note"] size 13 color "#f0c060" line_spacing 4 substitute False
                    else:
                        text _("这桩案子还没有结案。推开礼堂侧门、勘查六处后台痕迹并演完推理四幕后，完整的结案报告会显影在这里。") size 13 color "#b08ca2" line_spacing 4

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上结案报告") size 12 color "#b08ca2" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 10
                    textbutton _("重返雨夜后台"):
                        style "gramophone_mini_pill"
                        yalign 0.5
                        action [Hide("theater_report_modal")] + theater_launch_action()
                    textbutton _("合上报告"):
                        style "pill_button"
                        xminimum 116
                        ysize 34
                        text_size 14
                        action Hide("theater_report_modal")


## 雨夜剧场剧场内顶部「推理四幕」横幅（位于右上角证物 HUD 下方，互不遮挡）
screen theater_act_banner(acts_done, prompt_line):
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
                add "images/ui/icon_theater_backstage.png" xysize (22, 22) yalign 0.5
                text _("雨夜剧场 · 推理四幕") size 12 color "#f2a7b8" bold True yalign 0.5
                text ("已演完 %d/%d 幕 · 失误只计入本案评级，不影响主线" % (acts_done, len(THEATER_ACT_LINKS))) size 11 color "#d9b4c6" yalign 0.5
            hbox:
                spacing 6
                for _bi, b_obj in enumerate(THEATER_ACT_LINKS):
                    frame:
                        style "theater_banner_slot"
                        vbox:
                            spacing 0
                            text ("%s · %s" % (b_obj["step"], b_obj["name"])) size 10 color ("#86efac" if _bi < acts_done else ("#f2a7b8" if _bi == acts_done else "#9a7f99")) bold True substitute False
                            text (b_obj["short"] if _bi < acts_done else _("？")) size 11 color ("#fff1f4" if _bi < acts_done else "#8f7088") substitute False
            text prompt_line size 14 color "#fff3f7" substitute False


## 雨夜剧场结案结算卡：本局评级 + 历史最佳纪录 + 重玩挑战提示
screen theater_result_card(cur_tier, best_tier, mistakes, best_mistakes, replays, new_record=False, is_first=True):
    modal True
    zorder 220
    $ _ct = theater_tier_def(cur_tier)
    $ _bt = theater_tier_def(best_tier)
    $ _rv = theater_render_view()
    $ _is_gold = (cur_tier == "gold")

    add "#0a0510dc"
    key "K_RETURN" action Return("back_to_theater")
    key "K_SPACE" action Return("back_to_theater")
    key "K_ESCAPE" action Return("back_to_theater")

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
                add "images/ui/icon_missing_script.png" xysize (54, 54) yalign 0.5 at theater_spot_sway
                vbox:
                    spacing 3
                    yalign 0.5
                    text ("雨夜剧场结案 · %s" % THEATER_CASE["code"]) size 13 color "#f2a7b8" bold True substitute False
                    text ("《%s》" % THEATER_CASE["short_title"]) font gui.name_text_font size 21 color "#ffe4ea" substitute False
                    text ("本局评级：【%s · %s】" % (_ct["name"], _ct["title"])) size 14 color ("#f4d98a" if _is_gold else "#86efac") substitute False

            add Solid("#f2a7b833") ysize 1

            frame:
                xfill True
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 4
                    text _rv["display_mo_note"] size 13 color "#cfa6f0" substitute False
                    text _rv["display_alice_note"] size 13 color "#f0c060" substitute False
                    text ("本局失误 %d 次（只计入本案评级，不影响主线）" % mistakes) size 12 color "#d9b4c6"
                    text ("历史最佳：%s「%s」 · 最少失误 %d 次 · 累计结案 %d 次" % (_bt["name"], _bt["title"], best_mistakes, replays)) size 12 color "#d9b4c6" substitute False
                    if is_first:
                        text _("首次结案 · 推理四幕已写入鉴赏室「雨夜剧场」分页，C-11 纪念物可以放进胶囊了") size 12 color "#86efac"
                    elif new_record:
                        text _("重玩挑战 · 刷新个人纪录！这一场比以往任何一次都更少走错台位") size 12 color "#f4d98a"
                    elif _is_gold:
                        text _("重玩挑战 · 再次拿下金牌，雨夜剧场名侦探实至名归") size 12 color "#f4d98a"
                    else:
                        text _("重玩挑战 · 零失误演完推理四幕，就能拿下金牌") size 12 color "#e6b8c8"

            textbutton _("收好票根并返回雨夜剧场"):
                style "pill_button"
                xalign 0.5
                xminimum 248
                ysize 38
                text_size 15
                action Return("back_to_theater")


################################################################################
## 四、鉴赏分页界面 B：侦探社学期时间胶囊（screen extras_time_capsule）
################################################################################

screen extras_time_capsule():
    $ _csel = persistent.capsule_selected_item or "c01"
    $ _cv = capsule_render_item(_csel)
    $ _crec = capsule_get_record()
    $ _placed_n = len(_crec["placed"])
    $ _earn_n = capsule_earned_count()

    vbox:
        spacing 9

        ## 1. 黄铜胶囊总览横幅
        frame:
            style "capsule_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_time_capsule.png" xysize (36, 36) yalign 0.5 at capsule_tin_bob
                    vbox:
                        spacing 2
                        xsize 398
                        text _("侦探社学期时间胶囊") font gui.name_text_font size 19 color "#fbeccb"
                        if _crec["sealed"]:
                            text _("胶囊已封存 · 约定一年后的今天，三个人一起打开。") size 12 color "#e9d6a8"
                        elif persistent.te_cleared:
                            text _("TRUE END 已通关 · 胶囊标签与信末的续笔已全部显影。") size 12 color "#d8c8ee"
                        elif persistent.truth_spoiler_confirmed:
                            text _("已手动开启剧透许可 · 标签与信末的真约续笔当前可见。") size 12 color "#f0a4b8"
                        else:
                            text _("收好每项玩法留下的纪念物 · 涉终章的续笔已由防剧透火漆保护。") size 12 color "#c9b48c"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_time_capsule.png" xysize (14, 14) yalign 0.5
                            text ("已放入 %d/%d" % (_placed_n, len(CAPSULE_ITEMS))) size 12 color "#f4d98a" yalign 0.5
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
                                            message=_("尚未通关 TRUE END，确定提前揭晓「时间胶囊」中涉终章旧约的续笔与附言吗？"),
                                            yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                            no_action=Hide("confirm"))

        ## 2. 胶囊装填刻度条：十二枚小图标依次点亮（12 × 16 + 11 × 3 = 225px）
        frame:
            style "capsule_gauge_bar"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 3
                    yalign 0.5
                    for g_obj in CAPSULE_ITEMS:
                        add g_obj["icon"] xysize (16, 16) yalign 0.5 alpha (1.0 if g_obj["id"] in _crec["placed"] else 0.22)
                text ("可放入 %d · 已放入 %d · 首次完成对应玩法即可留下纪念物" % (_earn_n - _placed_n, _placed_n)) size 11 color "#efe2c4" xalign 1.0 yalign 0.5

        ## 3. 胶囊格（3 × 234 + 2 × 10 = 722px 严丝合缝，四行）
        $ _capsule_rows = (len(CAPSULE_ITEMS) + 2) // 3
        grid 3 _capsule_rows:
            spacing 10
            for c_obj in CAPSULE_ITEMS:
                $ _cst = capsule_item_status(c_obj["id"])
                $ _cis = (c_obj["id"] == _cv["id"])
                button:
                    style "capsule_item_card"
                    selected _cis
                    action Function(capsule_select, c_obj["id"])
                    hbox:
                        spacing 8
                        yalign 0.5
                        frame:
                            style "capsule_icon_well"
                            add c_obj["icon"] xysize (30, 30) align (0.5, 0.5) alpha (1.0 if _cst == "placed" else (0.62 if _cst == "earned" else 0.24))
                        vbox:
                            spacing 2
                            yalign 0.5
                            xsize 166
                            hbox:
                                xfill True
                                text ("%s · %s" % (c_obj["code"], c_obj["source"])) size 11 color ("#f4d98a" if _cis else "#d9c39e") bold True yalign 0.5 substitute False
                                if _cst == "placed":
                                    text _("已放入") size 10 color "#f4d98a" bold True xalign 1.0 yalign 0.5
                                elif _cst == "earned":
                                    text _("可放入") size 10 color "#86efac" bold True xalign 1.0 yalign 0.5
                                else:
                                    text _("未留下") size 10 color "#8a7aa0" xalign 1.0 yalign 0.5
                            text c_obj["name"] font gui.name_text_font size 13 color ("#fff1d0" if _cst != "locked" else "#a892c2") substitute False
            for _pad_i in range((3 - len(CAPSULE_ITEMS) % 3) % 3):
                null width 234 height 60

        ## 4. 选中纪念物的详情：标签、来源、放入条件与双人标签短评
        frame:
            style "capsule_detail_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 14
                        yalign 0.5
                        frame:
                            style "capsule_icon_well_big"
                            add _cv["icon"] xysize (52, 52) align (0.5, 0.5) alpha (1.0 if _cv["placed"] else (0.62 if _cv["status"] == "earned" else 0.24))
                        vbox:
                            spacing 3
                            xsize 470
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                frame:
                                    style "mailbox_code_badge"
                                    text _cv["code"] size 11 color "#ffffff" bold True align (0.5, 0.5)
                                text ("《%s》" % _cv["name"]) font gui.name_text_font size 18 color "#fff1d0" yalign 0.5 substitute False
                            text ("留下它的玩法：%s" % _cv["source"]) size 12 color "#d9c39e" substitute False
                            text ("放入条件：%s（当前 %d/%d）" % (_cv["condition"], _cv["progress_cur"], _cv["progress_total"])) size 12 color "#a8c6b0" substitute False
                    frame:
                        style "mailbox_stat_chip"
                        xalign 1.0
                        yalign 0.5
                        if _cv["placed"]:
                            text _("已在胶囊里") size 11 color "#f4d98a" align (0.5, 0.5)
                        elif _cv["status"] == "earned":
                            text _("可以放入") size 11 color "#86efac" align (0.5, 0.5)
                        else:
                            text _("尚未留下") size 11 color "#9a86b8" align (0.5, 0.5)

                ## 4A. 墨墨铅笔标签 & 艾丽丝封口贴纸（放入后显影）
                if _cv["placed"]:
                    frame:
                        style "lexicon_mo_note_box"
                        vbox:
                            spacing 3
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_crane_bookmark.png" xysize (14, 14) yalign 0.5
                                text _("墨墨 · 系在纪念物上的铅笔标签") size 12 color "#cfa6f0" bold True yalign 0.5
                            text ("「%s」" % _cv["display_mo_tag"]) size 12 color "#ebe2f8" line_spacing 3 substitute False
                            if _cv["display_mo_secret"]:
                                text ("续笔：「%s」" % _cv["display_mo_secret"]) size 12 color "#fff1d0" line_spacing 3 substitute False
                    frame:
                        style "lexicon_alice_note_box"
                        vbox:
                            spacing 3
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_time_capsule.png" xysize (14, 14) yalign 0.5
                                text _("艾丽丝 · 胶囊封口的贴纸批注") size 12 color "#f0c060" bold True yalign 0.5
                            text _cv["display_alice_tag"] size 12 color "#fff1d0" line_spacing 3 substitute False
                            if _cv["display_alice_secret"]:
                                text ("续笔：%s" % _cv["display_alice_secret"]) size 12 color "#f4d98a" line_spacing 3 substitute False
                else:
                    frame:
                        xfill True
                        padding (11, 8)
                        background Frame("gui/hud_chip.png", 12, 12)
                        text _("把这件纪念物放进胶囊后，会显影墨墨系上的铅笔标签，和艾丽丝贴在封口的小批注。") size 12 color "#b9a6d4" line_spacing 3
                if _cv["display_masked_notice"]:
                    text _cv["display_masked_notice"] size 11 color "#f0a4b8" substitute False

                ## 4B. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text _("每一件纪念物都来自鉴赏室里的一项玩法") size 12 color "#9a86b8" yalign 0.5
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton ("前往%s" % _cv["source"]):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action SetField(persistent, "extras_tab", _cv["tab"])
                        textbutton (_("已在胶囊里") if _cv["placed"] else _("放入胶囊")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action (Function(do_quietly, capsule_place, _cv["id"]) if _cv["status"] == "earned" else None)

        ## 5. 写给一年后的信（2 × 341 + 12 = 694px 贴合内宽）
        frame:
            style "capsule_detail_card"
            vbox:
                spacing 7
                xfill True
                hbox:
                    spacing 6
                    yalign 0.5
                    add "images/ui/icon_future_letter.png" xysize (18, 18) yalign 0.5
                    text _("写给一年后的信 · 放入足够的纪念物后，就能拆开墨墨与艾丽丝留下的信") font gui.name_text_font size 13 color "#fbeccb" yalign 0.5
                hbox:
                    spacing 12
                    for l_obj in CAPSULE_LETTERS:
                        $ _lv = capsule_render_letter(l_obj["id"])
                        frame:
                            style "capsule_letter_card"
                            hbox:
                                xfill True
                                yalign 0.5
                                hbox:
                                    spacing 8
                                    yalign 0.5
                                    add "images/ui/icon_future_letter.png" xysize (34, 34) yalign 0.5 alpha (1.0 if _lv["readable"] else 0.4)
                                    vbox:
                                        spacing 2
                                        yalign 0.5
                                        text ("《%s》" % _lv["title"]) font gui.name_text_font size 14 color ("#fff1d0" if _lv["readable"] else "#a892c2") substitute False
                                        if _lv["read"]:
                                            text ("%s · 已拆阅，可随时重读" % _lv["author"]) size 11 color "#86efac" substitute False
                                        elif _lv["readable"]:
                                            text ("%s · 可以拆阅了" % _lv["author"]) size 11 color "#f4d98a" substitute False
                                        else:
                                            text ("%s · 放入 %d 件后可拆阅" % (_lv["author"], _lv["need"])) size 11 color "#9a86b8" substitute False
                                textbutton (_("重读") if _lv["read"] else _("拆阅")):
                                    style "gramophone_mini_pill"
                                    xalign 1.0
                                    yalign 0.5
                                    action (Function(do_quietly, capsule_open_letter, _lv["id"]) if _lv["readable"] else None)

        ## 6. 封存栏
        frame:
            style "mailbox_quick_row"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_time_capsule.png" xysize (20, 20) yalign 0.5
                    if _crec["sealed"]:
                        text ("已封存 · 封蜡上写着「一年后的今天」 · 封存 %d 次" % _crec["seal_count"]) font gui.name_text_font size 14 color "#f4d98a" yalign 0.5 substitute False
                    else:
                        text ("放满十二件即可封存 · 还差 %d 件" % (len(CAPSULE_ITEMS) - _placed_n)) font gui.name_text_font size 14 color "#f2e6ff" yalign 0.5
                textbutton (_("已封存") if _crec["sealed"] else _("封存时间胶囊")):
                    style "gramophone_mini_pill"
                    xalign 1.0
                    yalign 0.5
                    action (Function(do_quietly, capsule_seal) if capsule_can_seal() else None)


## 写给一年后的信：拆阅弹窗
screen capsule_letter_modal(letter_id="lt_alice"):
    modal True
    zorder 218
    $ _lm = capsule_render_letter(letter_id)

    add "#0a0814e0"
    key "K_ESCAPE" action Hide("capsule_letter_modal")
    key "K_RETURN" action Hide("capsule_letter_modal")
    key "K_SPACE" action Hide("capsule_letter_modal")

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
                    add "images/ui/icon_future_letter.png" xysize (40, 40) yalign 0.5 at capsule_tin_bob
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_lm["code"], _lm["title"])) font gui.name_text_font size 20 color "#fbeccb" substitute False
                        text ("执笔：%s · 放入 %d 件纪念物后拆阅" % (_lm["author"], _lm["need"])) size 12 color "#d9c39e" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_time_capsule.png" xysize (28, 28) yalign 0.5
                    text ("已放入 %d/%d" % (_lm["placed_count"], len(CAPSULE_ITEMS))) size 13 color "#f4d98a" bold True yalign 0.5 substitute False

            add Solid("#f4d98a44") ysize 1

            viewport:
                xfill True
                ysize 300
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    if _lm["readable"]:
                        text _lm["display_body"] font gui.name_text_font size 14 color "#fff6dc" line_spacing 6 substitute False
                        text _lm["display_sign"] size 13 color "#f0c060" xalign 1.0 substitute False
                        if _lm["display_secret"]:
                            add Solid("#f4d98a33") ysize 1
                            text _lm["display_secret"] size 13 color "#f4d98a" line_spacing 4 substitute False
                    else:
                        text _("这封信还封着火漆。往胶囊里放入足够的学期纪念物之后，就可以在这里拆开它。") size 13 color "#9a86b8" line_spacing 4
                    if _lm["display_masked_notice"]:
                        text _lm["display_masked_notice"] size 12 color "#f0a4b8" substitute False

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上信笺") size 12 color "#9a86b8" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 8
                    if _lm["spoiler"] and not persistent.te_cleared and not persistent.truth_spoiler_confirmed:
                        textbutton _("手动解锁剧透"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Show("confirm",
                                        message=_("尚未通关 TRUE END，确定提前揭晓这封信末尾涉终章旧约的附言吗？"),
                                        yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                        no_action=Hide("confirm"))
                    textbutton _("合上信笺"):
                        style "pill_button"
                        xminimum 138
                        ysize 34
                        text_size 14
                        action Hide("capsule_letter_modal")


################################################################################
## 五、样式定义（PC-11 雨夜剧场丝绒幕布 & 时间胶囊黄铜配色）
################################################################################

style theater_header_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_dark.png", 26, 26)

style theater_console_card is default:
    xfill True
    padding (14, 11)
    background Frame("gui/panel_dark.png", 26, 26)

style theater_ticket_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style theater_act_slot is default:
    xsize 167
    ysize 52
    padding (8, 6)
    background Frame("gui/hud_chip.png", 12, 12)

style theater_banner_slot is default:
    xsize 176
    ysize 40
    padding (8, 4)
    background Frame("gui/panel_card.png", 16, 16)

style theater_tier_chip is default:
    xsize 218
    ysize 30
    padding (8, 0)
    background Frame("gui/panel_card.png", 16, 16)

style capsule_header_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style capsule_gauge_bar is default:
    xfill True
    ysize 30
    padding (10, 4)
    background Frame("gui/hud_chip.png", 12, 12)

style capsule_item_card is button:
    xsize 234
    ysize 60
    padding (9, 6)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style capsule_icon_well is default:
    xsize 40
    ysize 40
    padding (0, 0)
    background Frame("gui/hud_chip.png", 12, 12)

style capsule_icon_well_big is default:
    xsize 68
    ysize 68
    padding (0, 0)
    background Frame("gui/hud_chip.png", 12, 12)

style capsule_detail_card is default:
    xfill True
    padding (14, 11)
    background Frame("gui/panel_card.png", 16, 16)

style capsule_letter_card is default:
    xsize 341
    ysize 62
    padding (10, 6)
    background Frame("gui/hud_chip.png", 12, 12)


################################################################################
## 六、雨夜剧场独立沙盒初始化与结案出口（零侵入主线好感/失误/存档）
################################################################################

label _theater_init_sandbox(session_save_title):
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
    $ set_ambient("rain")
    return

label _theater_finish_case(local_mistakes=0):
    $ _th_final_mistakes = max(0, int(local_mistakes or 0))
    $ _th_rec = theater_record_solve(_th_final_mistakes)
    hide screen theater_act_banner
    hide screen evidence_book
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen theater_result_card(_th_rec["last_tier"], _th_rec["best_tier"], _th_final_mistakes, _th_rec["best_mistakes"], _th_rec["replays"], _th_rec["new_record"], _th_rec["is_first"])
    $ persistent.extras_tab = "theater"
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 七、雨夜剧场 TH-01：《失踪的导演批注本》
################################################################################

label rainy_theater_case:
    call _theater_init_sandbox("雨夜剧场 · TH-01 失踪的导演批注本") from _call__theater_init_sandbox
    $ _th_mistakes = 0
    $ _th_acts = 0
    $ _th_h1 = False
    $ _th_h2 = False
    $ _th_h3 = False
    $ _th_h4 = False
    $ _th_h5 = False
    $ _th_h6 = False
    $ _th_replays = theater_get_record()["replays"]
    $ _th_best_text = theater_render_view()["best_line"]

    scene bg black with fade
    $ play_bgm(bgm_suspense, fadein=1.5)
    centered "{size=+6}雨夜剧场 · RAINY THEATER TH-01{/size}\n\n{size=+14}失踪的导演批注本{/size}\n\n{color=#f2a7b8}周五 18:20 · 大礼堂后台 · 带妆彩排前四十分钟{/color}"

    scene bg clubroom at bg_kenburns_out
    $ set_ambient("rain")
    with dissolve

    play sound se_rain
    "周五傍晚六点二十分，雨已经下了快两个钟头。万事屋的窗玻璃上爬满了水痕，艾丽丝正对着小镜子比划文化祭那天要戴的贝雷帽。"
    "桌上的手机震了起来。屏幕上跳出来的名字，是张子谦。"
    show alice smile at left
    show mo think at right
    zhang "（电话里）哥们儿，万事屋还开着门吧？大礼堂后台出事了——话剧社的导演本，丢了。"
    mc "导演本？"
    zhang "班长林思思是话剧社社长，这出文化祭大戏的导演就是她。她那本写满批注的剧本不见了，七点就要带妆彩排，她现在急得快哭了。"
    zhang "我在学生会管礼堂借用，走不开。你们能不能过来一趟？"
    show alice shock at left
    alice "文化祭的大戏？要是因为一本剧本开了天窗，那可是全校的损失！搭档，墨墨，拿伞！"
    play sound se_write
    "墨墨已经把牛皮纸笔记本塞进了帆布包，又从抽屉里翻出一支小手电，朝我晃了晃。"
    mo_note "后台很暗。带上光。"

    scene bg hall at bg_kenburns_in
    $ set_ambient("night")
    show screen evidence_book
    with dissolve

    play sound se_footstep
    "大礼堂里只亮着舞台中央一盏孤零零的工作灯。观众席黑成一片，雨点敲在高高的天窗上，像有人在远处轻轻鼓掌。"
    show banzhang sad at center
    banzhang "你们来了……对不起，这么晚还把你们叫过来。"
    "班长抱着一只空空的蓝色活页夹站在提词台边，眼圈红红的。这出文化祭大戏叫《雨夜的信使》，她是导演，也是话剧社的社长。"
    banzhang "导演本就是这个夹子里的东西。三个星期的走位、灯光和音效的 Q 点，全是我用铅笔一笔一笔批在剧本上的。全社……只有这一本。"
    banzhang "五点五十走位排练结束，我把它摊在提词台上，去门厅给学生会交场地押金，顺便领大家的盒饭。演员们也都去门厅吃饭了。"
    banzhang "六点十五分我回来，提词台上就只剩下这个空夹子。"
    show alice think at left
    alice "五点五十到六点十五，后台还有谁？"
    banzhang "只有两个人。Joker 说要试一下雷声的音效；吕芙说她不饿，留在提词台帮我对 Q 点——她是文学社借给我们的编剧，今晚也负责提词。"
    banzhang "可六点零五分，吕芙给我发了这条消息。"
    "她把手机递过来。屏幕上是一行字：『社长，我回文学社拿一下备用的铅笔和提词本，马上回来。』"
    banzhang "到现在都二十多分钟了，她还没回来，电话也不接。"
    show banzhang shock at center
    banzhang "还有……化妆间的镜子上贴着一张 Joker 的预告函，写着什么『今夜七时，本怪盗将偷走』……"
    show alice shock at left
    alice "预告函？！又是那个中二怪盗！"
    play sound se_footstep
    hide banzhang
    show joker happy at center
    joker "呵呵呵……有人在呼唤本怪盗的名字吗？"
    "侧幕后面转出一个披着黑斗篷的身影。Joker 已经穿好了戏服，斗篷边上还沾着一点亮晶晶的舞台金粉。"
    joker "non non，社长大人请不要误会。本怪盗在这出戏里饰演的，正是一位怪盗。那张预告函，是本怪盗写给全体演员的开场宣言。"
    alice "你说是宣言就是宣言？那导演本呢？"
    joker "本怪盗只偷心，不偷剧本。何况——导演本一丢，本怪盗好不容易争取来的戏份也会跟着消失。这种自断后路的剧本，本怪盗可不演。"
    hide joker
    show zhang think at center
    zhang "我说两句。五点五十二到六点十分，我一直跟班长在门厅对借用登记表，盒饭也是我帮忙发的。"
    zhang "就六点零二分的时候，后台的灯突然全黑了，我跑去走廊拐角的配电箱把闸推上，六点零三分就亮了。别的……我真没看见。"
    zhang "对了，礼堂只借到九点。学生会的规矩，七点一刻还开不了场，场地就得收回——文化祭之前，再也排不上第二次彩排了。"
    show mo neutral at right
    play sound se_write
    mo_note "导演本、提词台、雷声、跳闸。还有一个说回了文学社、却没有回来的人。一处一处看。"
    show alice smile at left
    alice "好！万事屋开工！四十分钟之内，把导演本找回来！"

label theater_case_investigate:
    if _th_h1 and _th_h2 and _th_h3 and _th_h4 and _th_h5 and _th_h6:
        jump theater_case_review_intro

    menu:
        "雨夜的后台静得只剩下雨声。先勘查哪一处？（可随时点击右上角【证据】翻面查看批注）"

        "走到舞台左侧，查看提词台与导演桌" if not _th_h1:
            $ _th_h1 = True
            scene bg hall
            $ set_ambient("night")
            show alice think at left
            show mo think at right
            with dissolve
            play sound se_page
            "提词台是一张靠着侧幕的小木桌，上方吊着一盏夹灯。我把手电压低照过去——桌面上铺开一大片半干的褐色水渍，闻起来甜甜的，是热可可。"
            "水渍像是被人一肘子撞翻的，呈扇形朝桌沿外溅开。可在扇形正中，却空出一块边缘笔直的长方形，干干净净，大小刚好是一本 A4 剧本。"
            mc "可可泼出来的时候，导演本还压在这里。它是被泼湿以后，才被拿走的。"
            "桌角贴着一张黄色便利贴，字迹工工整整：『导演本旁严禁饮料！——林』。脚边的废纸篓里，塞着一团团吸饱了可可的纸巾。"
            show alice shock at left
            alice "有人擦过桌子！擦得很急，纸巾都没来得及扔远。"
            "提词台旁的移动衣架上挂着六本演员本，封皮上用马克笔写着一到六的编号。我一本本翻过去，每一本都干干净净，连一处铅笔批注都没有。"
            show mo smile at right
            play sound se_write
            mo_note "演员本是干的，导演本是湿的。拿走它的人，没有把它混进去。"
            $ theater_inspect_hotspot("h1")
            jump theater_case_investigate

        "绕到舞台右侧，检查侧幕后的雷声铁皮" if not _th_h2:
            $ _th_h2 = True
            scene bg hall
            $ set_ambient("night")
            show alice think at left
            show joker neutral at center
            with dissolve
            "舞台右侧的侧幕后面，从吊杆上垂下来一块一人多高的薄铁皮，下沿挂着一只木把手。旁边的折叠桌上摊着一本音效试音记录。"
            joker "这就是本怪盗的雷霆。只要轻轻一甩——"
            play sound se_shock
            "铁皮哗啦一抖，整座礼堂都嗡嗡作响，连天窗上的雨声都被压了下去。艾丽丝捂着耳朵往后跳了半步。"
            show alice angry at left
            alice "你这叫轻轻？！"
            play sound se_page
            "试音记录的最后一行写着：『17:58 雷声铁皮 ×1 —— Joker』。下面还有一行班长补的红字：『太响了！正式演出减半！』"
            mc "五点五十八分。正是后台只剩你和吕芙两个人的时候。"
            joker "正是。那一声雷落下去，本怪盗好像听见对面『哐当』响了一下……大概是回声吧。侧幕挡着，本怪盗什么也看不见。"
            "我从铁皮旁边望向舞台另一头的提词台。中间隔着十二米宽的舞台和两道厚厚的侧幕——站在这里甩铁皮的人，根本够不着、也看不见提词台。"
            show mo think at right
            play sound se_write
            mo_note "雷声一响，对面哐当一下。可可，就是那时候翻的。"
            $ theater_inspect_hotspot("h2")
            jump theater_case_investigate

        "去化妆间看看镜子上的那张预告函" if not _th_h3:
            $ _th_h3 = True
            scene bg clubroom
            $ set_ambient("warm")
            show alice think at left
            show mo think at right
            with dissolve
            play sound se_door
            "化妆间里一排镜前灯亮得晃眼。正中那面镜子上，用胶带贴着一张樱花粉的铜版纸卡片。"
            "卡片上的字是从杂志上剪下来拼贴的：『今夜七时，本怪盗将于第三幕，偷走全场观众的心。』署名 Joker，旁边还画了一颗心。右下角用铅笔写着一行小字：『17:20 贴』。"
            show alice smile at left
            alice "第三幕、全场观众的心……这不就是他戏里的台词嘛。五点二十就贴上了，那时候导演本还在班长手里呢。"
            play sound se_page
            "镜台边的墙上钉着一个吹风机挂钩，挂钩空着。可下面那只插线板的电源指示灯还亮着，像是有人急急忙忙拔走了吹风机，连开关都忘了关。"
            mc "演员们都在门厅吃饭，化妆还没开始。谁会在这时候拿走吹风机？"
            show mo smile at right
            play sound se_write
            mo_note "吹风机能吹干头发，也能吹干纸。"
            $ theater_inspect_hotspot("h3")
            jump theater_case_investigate

        "到后台走廊拐角，打开配电箱查看跳闸记录" if not _th_h4:
            $ _th_h4 = True
            scene bg corridor
            $ set_ambient("cool")
            show zhang neutral at center
            show mo think at right
            with dissolve
            play sound se_footstep
            "后台走廊的拐角处嵌着一只灰色的配电箱。张子谦拉开箱门，门内侧用夹子夹着一张跳闸记录。"
            zhang "喏，就是这条回路。我推上闸以后顺手记了一笔。"
            "记录上写着：『18:02 化妆间、服装间回路跳闸 · 18:03 已复位 —— 张』。"
            play sound se_page
            "电闸旁边还贴着一张电工师傅的手写提醒，红笔圈得很醒目：『本回路含化妆间镜前灯与服装间熨斗插座，吹风机与熨斗请勿同时使用！』"
            mc "化妆间的吹风机不见了，服装间里有熨斗。六点零二分跳闸的那一刻，有人同时开着这两样东西。"
            zhang "可那会儿演员都在门厅啃盒饭啊，谁跑来后台又吹又熨的？"
            show alice think at left
            alice "跳闸不是有人故意关灯——是有人在用吹风机和熨斗，把电闸给烫跳了！"
            play sound se_write
            mo_note "灯黑了，是因为有人在忙。不是因为有人想藏。"
            $ theater_inspect_hotspot("h4")
            jump theater_case_investigate

        "检查侧台的卸货门，和门边的伞架" if not _th_h5:
            $ _th_h5 = True
            scene bg corridor
            $ set_ambient("rain")
            show alice think at left
            show banzhang neutral at center
            with dissolve
            play sound se_rain
            "侧台尽头是一扇通往室外的铁皮卸货门，门外的雨声哗哗地响。门闩上挂着一把沉甸甸的铜挂锁。"
            banzhang "这扇门是张子谦五点四十五搬完两块布景以后，从里面锁上的。钥匙一直在他口袋里。"
            "门内侧的地垫摸上去已经干透了，只在边上留着两行早就干掉的大号鞋印。"
            "门边的伞架里插着一排雨伞。七把伞的伞尖下都积着一小摊水，只有一把碎花折叠伞干干爽爽，伞面上连一个水点都没有。"
            alice "这把是谁的？"
            show banzhang think at center
            banzhang "是吕芙的。她下午四点就来礼堂改剧本了，那时候还没开始下雨。她每天都揣着一保温杯热可可来排练，一坐就是一晚上……"
            show alice shock at left
            alice "可文学社活动室在对面的教学楼！冒着这么大的雨，不打伞，她是怎么回文学社拿铅笔的？"
            banzhang "门厅那边……我一直在门厅，没看见她从正门出去过。"
            show mo think at right
            play sound se_write
            mo_note "伞是干的，门是锁的，正门有人看着。她还在礼堂里。"
            $ theater_inspect_hotspot("h5")
            jump theater_case_investigate

        "沿着后台走廊，走到尽头的服装间门口" if not _th_h6:
            $ _th_h6 = True
            scene bg corridor
            $ set_ambient("night")
            show alice think at left
            show mo think at right
            with dissolve
            play sound se_footstep
            "我把手电贴着地面一扫。走廊的水磨石地上，零零星星落着几滴褐色的小圆点。凑近一闻，是甜的。"
            "小圆点从提词台那头出发，走了三米左右就断了，再往前一滴也没有——像是有人走到一半，才想起用什么东西把手里的东西裹了起来。"
            "走廊尽头的服装间门把手上，挂着一块木牌：『换装中 · 请勿入内』。"
            show alice smile at left
            alice "换装中？可彩排的换装要六点半才开始，Joker 的斗篷五点半就披在身上了呀。"
            "门底下透出一线暖黄色的光。我刚抬起手想敲门，门里那一阵低低的嗡嗡声，忽然停了。"
            "墨墨轻轻按住了我的手腕，摇了摇头。"
            show mo smile at right
            play sound se_write
            mo_note "先别敲。里面的人，可能比我们更着急。先把事情想清楚。"
            $ theater_inspect_hotspot("h6")
            jump theater_case_investigate

label theater_case_review_intro:
    scene bg hall
    $ set_ambient("night")
    $ play_bgm(bgm_mystery, fadein=1.2, fadeout=0.8)
    show alice smile at left
    show mo neutral at right
    with dissolve

    "六处后台全部勘查完毕。我们回到提词台前。工作灯底下，那块甜甜的长方形空白安安静静地躺在桌面上。"
    alice "离七点还有二十五分钟！敲门之前，先把推理从头到尾排练一遍——就像彩排一样，四幕戏，一幕都不能演错！"
    if _th_replays > 0:
        sysmsg "【雨夜剧场 · 重玩挑战】当前历史最佳：[_th_best_text]。零失误演完推理四幕，就能拿下金牌。"
    else:
        sysmsg "【雨夜剧场 · 推理四幕】依次选出「时刻 → 去向 → 动机 → 执行人」四幕。零失误可获金牌，失误只计入本案评级，不影响主线。"

label theater_act_k1:
    show screen theater_act_banner(0, "第一幕 · 时刻：便利贴、可可渍、雷声——导演本是什么时候离开提词台的？")
    menu:
        "五点五十走位排练刚结束、大家去门厅领盒饭的时候":
            hide screen theater_act_banner
            $ _th_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "可可渍正中间空着一块 A4 大小的干净长方形呀。可可泼出来的那一刻，导演本明明还压在桌上。"
            play sound se_write
            mo_note "先想想，可可是什么时候翻的。"
            jump theater_act_k1

        "五点五十八分雷声一响、热可可泼翻之后——它是被泼湿以后才被拿走的":
            hide screen theater_act_banner
            play sound se_correct
            $ _th_acts = 1

        "六点零二分后台跳闸、一片漆黑的那一分钟里":
            hide screen theater_act_banner
            $ _th_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "跳闸是因为有人同时开着吹风机和熨斗呀。灯黑下来的时候，那个人早就已经在后台忙起来了。"
            play sound se_write
            mo_note "黑暗不是掩护，是结果。往前找。"
            jump theater_act_k1

    mc "可可渍中间那块干净的长方形说明，可可泼出来的时候导演本还在桌上。五点五十八分雷声一响，对面哐当一声——导演本是在被泼湿以后，才离开提词台的。"

label theater_act_k2:
    show screen theater_act_banner(1, "第二幕 · 去向：门锁着、伞是干的、跳闸的是那条回路——导演本现在在哪里？")
    menu:
        "后台走廊尽头的服装间——跳闸的正是那条回路，门上还挂着『换装中』":
            hide screen theater_act_banner
            play sound se_correct
            $ _th_acts = 2

        "从侧台卸货门被带出了礼堂":
            hide screen theater_act_banner
            $ _th_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "卸货门五点四十五就从里面锁上了，钥匙在张子谦口袋里，门里的地垫也早就干透了哦。"
            play sound se_write
            mo_note "门没开过。那它一直都在这栋楼里。"
            jump theater_act_k2

        "混进了衣架上那六本演员本里":
            hide screen theater_act_banner
            $ _th_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "六本演员本我们都翻过啦，编号一到六，本本干干净净，连一道铅笔印都没有。"
            play sound se_write
            mo_note "湿掉的本子，藏不进干净的本子里。跟着可可的小圆点走。"
            jump theater_act_k2

    mc "卸货门锁着，正门有班长看着，演员本里也没有。可可滴向走廊，吹风机和熨斗又在同一条回路上——导演本就在服装间里。"

label theater_act_k3:
    show screen theater_act_banner(2, "第三幕 · 动机：擦过的桌子、消失的吹风机、跳闸的熨斗——为什么要拿走导演本？")
    menu:
        "有人想让今晚的彩排开天窗，故意把导演本藏起来":
            hide screen theater_act_banner
            $ _th_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "想搞破坏的人，会先把桌子擦干净，再借吹风机和熨斗吗？把湿本子随手一扔，岂不是更省事？"
            play sound se_write
            mo_note "看看这个人做的每一件事。都是在救它。"
            jump theater_act_k3

        "有人想偷偷改掉导演本里自己的走位和台词":
            hide screen theater_act_banner
            $ _th_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "导演本是班长一笔一笔批的，改一个字她都认得出来。再说，改台词用铅笔就够了，用不着吹风机和熨斗呀。"
            play sound se_write
            mo_note "吹风机、熨斗、一扇关着的门。这些都是用来晾干的。"
            jump theater_act_k3

        "泼湿了导演本的人，想赶在七点前把它吹干、熨平，把晕开的批注补回去":
            hide screen theater_act_banner
            play sound se_correct
            $ _th_acts = 3

    mc "擦桌子、拿吹风机、开熨斗、挂上换装中的牌子——这个人不是在偷，也不是在捣乱。是可可泼湿了导演本，有人想在七点之前，把它悄悄救回原样。"

label theater_act_k4:
    show screen theater_act_banner(3, "第四幕 · 执行人：提词台、热可可、一把干伞——是谁拿走了导演本？")
    menu:
        "Joker——化妆镜上的预告函写着今夜要偷东西":
            hide screen theater_act_banner
            $ _th_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "预告函是五点二十贴的戏里台词呀。而且五点五十八分他在十二米外的侧幕后面甩铁皮，连提词台都看不见。"
            play sound se_write
            mo_note "雷声是他打的。可可不是他泼的。"
            jump theater_act_k4

        "吕芙——坐在提词台、带着热可可，伞是干的，说回了文学社却从没离开礼堂":
            hide screen theater_act_banner
            play sound se_correct
            $ _th_acts = 4
            show screen deduction_cutin(headline=_("大幕落下 ——！"), subline="CURTAIN CALL")
            with flash_shutter

        "张子谦——六点零三分复位配电箱的人就是他":
            hide screen theater_act_banner
            $ _th_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "他在跳闸记录上大大方方签了自己的名字哦。五点五十二分以后他一直和班长待在门厅，只有灯黑的时候才跑去推了闸。"
            play sound se_write
            mo_note "推上电闸的人，是来帮忙的。去想想，是谁让电闸跳下来的。"
            jump theater_act_k4

    mc "五点五十八分留在提词台的只有吕芙，她每天都揣着一杯热可可。她发消息说回了文学社，可她的伞是干的，卸货门锁着，正门有班长看着——她从没离开过礼堂。"
    mc "雷声一响，可可泼湿了导演本。她擦了桌子，把导演本裹起来，拿走吹风机，躲进服装间开了熨斗……六点零二分，电闸跳了。"
    show alice happy at left
    alice "四幕全部演完！侦探团，去服装间——记得，敲门要轻一点。"

label theater_case_resolution:
    scene bg storeroom at bg_kenburns_in
    $ set_ambient("warm")
    $ play_bgm(bgm_warm, fadein=1.5, fadeout=1.0)
    show alice smile at left
    show banzhang think at center
    with dissolve

    play sound se_door
    "艾丽丝在服装间的门上轻轻敲了三下。"
    alice "吕芙同学，是我们，万事屋。……还有班长。没有人生气，你开开门好不好？"
    "门里安静了很久。然后，门锁轻轻『咔哒』一响，门被从里面拉开了。"
    "服装间不大，挂满了各式各样的戏服。正中的熨衣板上铺着一条叠好的毛巾，导演本的书页被一页一页拆开，夹在一张张白色的吸墨纸中间，上面压着三本厚厚的旧剧本合集。"
    "熨斗调在最低档，立在一旁冒着淡淡的白气。化妆间那只不见了的吹风机躺在椅子上，插头还连着地上的插线板。"
    hide banzhang
    show lvfu sad at center
    lvfu "对、对不起……"
    "吕芙抱着一条沾满褐色可可渍的围巾站在熨衣板后面，麻花辫有点散了，大框眼镜后面的眼睛红红的。"
    lvfu "雷声一响，我吓了一跳，胳膊肘一撞……保温杯就倒了。第三幕、第四幕，正好摊开在那里……"
    lvfu "我看见桌角那张便利贴，脑子里一下子就空了。我想着，要是在七点前把它吹干、压平，把晕开的地方描回去……就、就跟什么都没发生过一样。"
    lvfu "书泡了水，要一页一页隔上吸墨纸，再用低温压平——这些我在书上读过很多遍。可我一着急，吹风机和熨斗一起开，灯就全黑了。我在黑暗里抱着导演本，一动都不敢动……"
    lvfu "给社长发消息说回了文学社，也是我编的。对不起……我不该撒谎的。"
    show alice think at left
    alice "所以，你一个人在这里又吹又熨又描，整整二十多分钟？"
    lvfu "……第三幕的 Q 点，我已经照着提词本描回了一半。可第四幕的灯光批注……晕得太厉害了，我实在想不起来……"

    play sound se_footstep
    hide lvfu
    show banzhang sad at center
    "班长从我身后走上前，低头看着那一页页被可可染成浅褐色的剧本。过了好半天，她才开口。"
    banzhang "……你这个傻瓜。"
    banzhang "以前我也因为一张纸条，自责得在教室里哭过。那时候最难受的，不是做错了事，是一个人憋着不敢说。你明明可以直接来门厅找我的呀。"
    show banzhang smile at center
    banzhang "导演本是给大家用的，又不是拿来让人害怕的。泼了就泼了，我们一起想办法。"
    "可第四幕的批注怎么办？墙上的挂钟已经指向六点四十五分了。"

    show mo think at right
    play sound se_page
    "墨墨没有说话。她拿起一张被可可浸成浅褐色的第四幕书页，接过我的手电，又伸手关掉了服装间的顶灯。"
    "然后，她把手电几乎贴着纸面，斜斜地照了过去。"
    "晕开的铅笔字已经看不清了。可在斜着的光底下，纸面上浮起了一道道细细的凹痕——那是班长当初用力写下的每一个数字，刻进纸里的印子。"
    play sound se_write
    mo_note "铅笔写过的地方，纸会记得。斜着照，就能看见。"
    show banzhang shock at center
    banzhang "Q47……Q48，渐暗……这是我写的！真的还在！"
    show alice happy at left
    alice "全员集合！张子谦去门厅把演员都叫过来，Joker 负责举手电——斜着举！吕芙念凹痕，班长往新剧本上抄！"
    hide banzhang
    show joker happy at center
    joker "呵呵呵……于黑暗之中，为真相打光。这个角色，本怪盗接了。"
    play sound se_click
    "服装间里一下子挤满了人。吕芙捧着书页，一个数字一个数字地念；班长埋着头飞快地抄；演员们七嘴八舌地补上自己记得的走位。张子谦举着手机计时，嘴里不停地报着分钟数。"
    "六点五十八分，最后一个 Q 点被抄进了一本崭新的剧本里。"

    scene bg hall at bg_kenburns_out
    $ set_ambient("warm")
    show banzhang happy at center
    show lvfu smile at right
    with dissolve
    play sound se_bell
    "七点零五分，大礼堂的工作灯熄了，舞台上亮起第一束追光。《雨夜的信使》的带妆彩排，只比计划晚了五分钟。"
    "提词台上，吕芙抱着新抄好的剧本坐得笔直。她的保温杯被班长没收了，搁在离提词台三米远的椅子上。"
    banzhang "下次想喝可可，坐到观众席去喝。……喝完再回来提词。"
    lvfu "嗯！"
    "第三幕的雷声响起来的时候，Joker 只甩了半下铁皮。"
    "台下第一排，艾丽丝凑到我耳边小声说：『你看，班长把桌角那张便利贴换掉了。』"
    "新的便利贴上写着：『导演本旁严禁饮料。也严禁一个人偷偷着急。——林』"
    hide banzhang
    show mo smile at center
    play sound se_crane
    "散场的时候，班长给帮过忙的每个人都发了一张《雨夜的信使》彩排夜的票根。吕芙又悄悄把一张印着浅褐色可可渍的吸墨纸送给了墨墨。"
    "墨墨把吸墨纸夹在票根后面，一起收进笔记本，在旁边写下了今晚的日期。"
    mo_note "铅笔写过的地方，纸会记得。泼湿的剧本能补回来，不敢说出口的话也一样。"

    call _theater_finish_case(_th_mistakes) from _call__theater_finish_case
    return
