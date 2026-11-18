## 《沉默侦探：千纸鹤的约定》—— PC-12 美术室消失的油画与侦探社毕业纪念寄语墙
## yearbook_atelier_wall.rpy
##
## 设计要点：
##   1. 100% 零侵入主线剧情（script.rpy / chapter1..6.rpy / interlude.rpy / definitions.rpy / autoplay.rpy 零改动）。
##   2. 「美术室消失的油画」（screen extras_atelier_painting + 可重玩短案 label atelier_painting_case）：
##      周四傍晚，校园艺术节开展前一天，美术社高三社长苏棠画了三年的压轴油画《北窗下的三年》，
##      从旧社团楼三楼美术室的主画架上消失。
##      玩法三段式：六处画室勘查点（入证物簿、可翻面批注）→ 四笔推理（去向 → 藏法 → 动机 → 执行人，
##      每笔三选一、各配一种颜料色标，按顺序画完）→ 掀开衬布结案。选错只给温柔提示、只计入本地
##      _at_mistakes，绝不触碰主线 fail_count / 好感；结案按失误数评定金 / 银 / 铜画框并保存历史最佳纪录，
##      可无限重玩刷新纪录，持久化于 persistent.atelier_painting_record。
##      与 PC-10（为躲雨把书搬上楼）、PC-11（闯祸后躲进服装间抢救）都不同：这幅画从未离开房间——它画面朝下、
##      四角垫着软木塞，平躺在静物台的白衬布底下；一年级学妹们想赶在开展前，在画布背面写满送给学姐的毕业寄语。
##      真相完全写实（清漆记录、领用簿、搬运清单、窗台积灰与少了四个的软木塞），无任何超自然要素。
##   3. 「侦探社毕业纪念寄语墙」（screen extras_message_wall + 寄语卡展开弹窗）：
##      万事屋门边软木公告板上的十二张寄语卡——万事屋三人互写的六张、一路帮过忙的伙伴写来的五张，
##      和三个人一起写给毕业那天的一张；按美术室结案、合照冲洗、胶囊放入等进度陆续写好，钉满十二张解锁成就。
##      墙角六张「合影标签」只读取 PC-10 合照相册的冲洗状态与 PC-11 时间胶囊的放入状态
##      （照片标题、胶囊纪念物名都在运行期从它们自己的数据里读，不复制、不改写它们的存档）。
##      涉终章的续笔严格联动 truth_spoiler_unlocked() 零侧信道遮罩，持久化于 persistent.message_wall_record。
##   4. 本文件按文件名排在 wings_theater_capsule.rpy 之后初始化，双成就追加在 PC-11 之后，成就页扩展为 2×15 = 30 枚。

# —— PC-12 鉴赏室复古水彩 UI 图标命名别名（128x128 RGBA 透明底）——
image ui_icon_art_room         = "images/ui/icon_art_room.png"
image ui_icon_missing_painting = "images/ui/icon_missing_painting.png"
image ui_icon_message_wall     = "images/ui/icon_message_wall.png"
image ui_icon_graduation_card  = "images/ui/icon_graduation_card.png"

# —— PC-12 新登场的美术社角色（暂无立绘：说话时舞台上的立绘自动恢复常亮，与警察、主持人等无立绘角色同一套规则）——
define sutang  = Character("苏棠", color="#9fd6c2", who_outlines=[(1, "#000")])
define xiaoman = Character("温小满", color="#f2c48a", who_outlines=[(1, "#000")])

init python:

    # 动态注册 PC-12 双成就，使鉴赏室成就页扩展为 2×15（共 30 枚）严整偶数列对称排布
    if "register_extra_achievement" in globals():
        register_extra_achievement(
            "ach_atelier_painting",
            "北窗画室的寻画人",
            "解开美术室消失的油画之谜。",
            False,
        )
        register_extra_achievement(
            "ach_message_wall",
            "毕业寄语墙的执笔人",
            "把十二张寄语卡全部钉上寄语墙。",
            False,
        )

    ############################################################################
    ## 一、美术室消失的油画（1 桩可重玩短案 · 6 处勘查点 · 四笔推理 · 金银铜画框评级）
    ############################################################################

    ATELIER_CASE = {
        "id": "at1",
        "code": "AT-01",
        "label": "atelier_painting_case",
        "title": "美术室消失的油画",
        "short_title": "北窗下的三年",
        "time_tag": "周四 17:20 · 旧社团楼美术室 · 开展前一天",
        "companions": "艾丽丝 · 墨墨 · 小林 · 张子谦 · 苏棠",
        "bg_key": "classroom",
        "bg_thumb": "images/bg_classroom.png",
        "lighting_note": "北窗冷光 → 准备室暖灯 → 西晒外廊（classroom / storeroom / sunset）",
        "spoiler": False,
        "summary_pub": (
            "周四傍晚，明早八点校园艺术节就要开展。美术社高三社长苏棠画了三年的压轴油画《北窗下的三年》，"
            "四点半还立在美术室正对北窗的主画架上；五点零五分她上楼取挂画钢丝时，画架已经空了。"
            "学生会说清单上写着不搬，整栋旧社团楼也找不到它——而开展第二天，学姐就要去外地美术集训了。"
        ),
        "solution_pub": (
            "结案报告：油画从未离开美术室。美术社一年级的七个学妹 16:40 签退回三楼，16:42 领走七支金色油漆笔和七副白手套，"
            "把静物台上的石膏像挪到北窗台，按学姐教的规矩四角垫上软木塞，让早已干透的画面朝下平躺，"
            "在没刷底料的生麻布背面写下毕业寄语。17:05 苏棠提前上楼，温小满慌忙盖上白衬布、立起写生课的「油彩未干」木牌，"
            "又随口说成学生会搬走了——一份惊喜，差一点变成了一桩失踪案。"
        ),
        "mo_note_pub": "墨墨现场手记：「画会挂在墙上。背面的话，会跟着画一起走。」",
        "alice_note_pub": "艾丽丝结案批注：「北窗油画失踪案告破！七位犯人罚开展当天轮流站在画旁边，替说明牌回答背面写了什么——答案统一是：秘密！」",
    }

    ATELIER_HOTSPOTS = [
        {
            "id": "h1",
            "code": "H-01",
            "label": "主画架与清漆记录",
            "scene": "classroom",
            "surface": "正对北窗的主画架空空荡荡，夹画的木卡扣被拧到最松，画架腿上贴着一张清漆记录。",
            "detail": (
                "现场手记：卡扣的螺杆上没有一道新刮痕——画是被人一圈圈拧松卡扣、慢慢托下来的。清漆记录写着"
                "「上光油 · 十天前 · 已干透 —— 苏」；画架底下干干净净，没有一颗从内框上起出来的钉子：画没有被拆下来卷走。"
            ),
            "evidence": "主画架：卡扣被慢慢拧松，画十天前已干透，架下没有一颗钉子",
            "observer": "墨墨（现场手记）",
        },
        {
            "id": "h2",
            "code": "H-02",
            "label": "静物台与木牌",
            "scene": "classroom",
            "surface": "教室中央的静物台盖着一整块白衬布，平平整整，正中立着一块「油彩未干 · 请勿触碰」的小木牌。",
            "detail": (
                "现场手记：平时台上的石膏像、陶罐和苹果都不见了，衬布平得像一张桌面。可开展周的静物写生课暂停了，"
                "后排的调色板刮得干干净净、松节油罐拧得紧紧的——今天下午，没有人在这张台子上画过一笔油彩。"
            ),
            "evidence": "静物台：衬布平得像桌面，却立着油彩未干的木牌",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "h3",
            "code": "H-03",
            "label": "准备室领用簿",
            "scene": "storeroom",
            "surface": "隔壁美术准备室的工具柜上挂着领用簿，墙边立着一排等待入库的空画框。",
            "detail": (
                "现场手记：最新一行是「16:42 金色油漆笔 ×7、白棉手套 ×7 —— 温（一年级）」，上面一行是苏棠中午领的"
                "挂画钢丝，还没来得及取走。墙边的空画框最大只有四开，连六十乘八十的油画的一半都装不下。"
            ),
            "evidence": "领用簿：16:42一年级领走七支金色油漆笔和七副白手套",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "h4",
            "code": "H-04",
            "label": "展廊搬运清单",
            "scene": "corridor",
            "surface": "一楼展廊里，学生会布展组正把作品挂上墙，张子谦夹着一块写着搬运清单的写字板。",
            "detail": (
                "现场手记：二十九幅作品逐一打勾，第一行却写着「1 号《北窗下的三年》—— 不搬 · 明早由社长亲自挂」。"
                "楼梯口始终有两个布展组的人守着；签到表上，美术社一年级七个人 16:40 就签退回了三楼「收拾画室」。"
            ),
            "evidence": "搬运清单：1号作品注明不搬，一年级七人16:40签退回三楼",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "h5",
            "code": "H-05",
            "label": "北窗台石膏像",
            "scene": "classroom",
            "surface": "北窗台的绿萝中间多了一尊石膏头像，窗户的插销上缠着布展前封好的胶带。",
            "detail": (
                "现场手记：石膏像底座在窗台积灰上压出一圈新印，是今天下午才挪来的；白衬布的一角也留着同样大小的浅浅圆印。"
                "窗台上没有画框拖过的痕迹，插销上的胶带完完整整——这扇窗今天没有开过。"
            ),
            "evidence": "北窗台：石膏像从静物台挪来，窗户今天没开过",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "h6",
            "code": "H-06",
            "label": "软木塞罐与白板",
            "scene": "classroom",
            "surface": "讲台边的白板上写着美术社的规矩和开展倒计时，架子上摆着一只装满软木塞的玻璃罐。",
            "detail": (
                "现场手记：白板第一条规矩是苏棠的字：「画要翻面时，四角垫软木塞，画面绝不许碰桌子！」玻璃罐标签写着"
                "「翻画专用 · 32 个」，数了两遍只剩 28 个。倒计时栏写着「周五开展 · 周六学姐出发去集训」，下面画着七个手牵手的小人。"
            ),
            "evidence": "软木塞罐：翻画专用的软木塞少了四个",
            "observer": "墨墨（现场手记）",
        },
    ]

    _ATELIER_HOTSPOT_BY_ID = {h["id"]: h for h in ATELIER_HOTSPOTS}

    # 画室颜料架：四笔推理各配一种颜料色标（群青 / 朱红 / 镉黄 / 翠绿），卷宗缩略图底部另有六色色带
    ATELIER_PIGMENTS = [
        {"name": "群青", "color": "#3d55c4"},
        {"name": "朱红", "color": "#d84a32"},
        {"name": "镉黄", "color": "#f0c23a"},
        {"name": "翠绿", "color": "#2f9a78"},
        {"name": "赭石", "color": "#b8763c"},
        {"name": "钛白", "color": "#f3efe4"},
    ]

    ATELIER_STROKE_LINKS = [
        {
            "id": "k1",
            "step": "第一笔",
            "name": "去向",
            "pigment": "群青",
            "color": "#3d55c4",
            "short": "从未离开美术室",
            "full": (
                "搬运清单把一号写成「不搬」，楼梯口一直有人看守；北窗插销的胶带完好、窗台积灰只有石膏像的圆印，"
                "画架下也没有起出来的钉子——《北窗下的三年》从来没有离开过美术室。"
            ),
        },
        {
            "id": "k2",
            "step": "第二笔",
            "name": "藏法",
            "pigment": "朱红",
            "color": "#d84a32",
            "short": "画面朝下躺在衬布下",
            "full": (
                "石膏像被挪上北窗台，静物台的白衬布平得像桌面，却立着一块今天谁也没理由立的「油彩未干」；"
                "翻画专用的软木塞又刚好少了四个——干透的画面朝下、四角垫着软木塞，平躺在衬布底下。"
            ),
        },
        {
            "id": "k3",
            "step": "第三笔",
            "name": "动机",
            "pigment": "镉黄",
            "color": "#f0c23a",
            "short": "在画背面写毕业寄语",
            "full": (
                "画面朝下，朝上的是没刷底料的生麻布背面；七支金色油漆笔能在生麻布上写字，七副白手套不会在画上留下指纹。"
                "开展倒计时旁边七个手牵手的小人，送的是后天就要出发去集训的学姐。"
            ),
        },
        {
            "id": "k4",
            "step": "第四笔",
            "name": "执行人",
            "pigment": "翠绿",
            "color": "#2f9a78",
            "short": "温小满和一年级学妹",
            "full": (
                "领用簿上写着「温（一年级）」，签到表上一年级七个人四点四十就签退回了三楼；"
                "画是在温小满说出「学生会搬走了」之后，才变成了一桩失踪案。"
            ),
        },
    ]

    ATELIER_RATING_TIERS = [
        {"key": "gold",   "name": "金画框", "title": "画室名侦探", "rule": "零失误",         "max_mistakes": 0},
        {"key": "silver", "name": "银画框", "title": "北窗推理员", "rule": "失误 1～2 次",    "max_mistakes": 2},
        {"key": "bronze", "name": "铜画框", "title": "见习布展",   "rule": "失误 3 次及以上", "max_mistakes": 999},
    ]

    _ATELIER_TIER_BY_KEY = {t["key"]: t for t in ATELIER_RATING_TIERS}
    _ATELIER_TIER_RANK = {"gold": 3, "silver": 2, "bronze": 1}

    # 在证物簿里登记六件画室证物的翻面批注（与委托信箱、闭馆图书馆、雨夜剧场同一套 register_evidence_detail 机制）
    if "register_evidence_detail" in globals():
        for _ath in ATELIER_HOTSPOTS:
            register_evidence_detail(_ath["evidence"], _ath["observer"], _ath["detail"])

    def atelier_tier_def(tier_key):
        return _ATELIER_TIER_BY_KEY.get(tier_key, ATELIER_RATING_TIERS[-1])

    def atelier_rate(mistakes_count=0):
        """按本局失误数评定画框：0 次金画框，1～2 次银画框，3 次及以上铜画框。"""
        m = max(0, int(mistakes_count or 0))
        for tier in ATELIER_RATING_TIERS:
            if m <= tier["max_mistakes"]:
                return tier
        return ATELIER_RATING_TIERS[-1]

    def atelier_get_hotspot(hotspot_id):
        return _ATELIER_HOTSPOT_BY_ID.get(hotspot_id, ATELIER_HOTSPOTS[0])

    def _ensure_atelier_store():
        if not isinstance(getattr(persistent, "atelier_painting_record", None), dict):
            persistent.atelier_painting_record = {}
        return persistent.atelier_painting_record

    def atelier_get_record():
        raw = _ensure_atelier_store()
        best_tier = raw.get("best_tier")
        last_tier = raw.get("last_tier")
        best_m = raw.get("best_mistakes", None)
        last_m = raw.get("last_mistakes", None)
        return {
            "solved": bool(raw.get("solved", False)),
            "replays": int(raw.get("replays", 0) or 0),
            "best_tier": best_tier if best_tier in _ATELIER_TIER_RANK else None,
            "last_tier": last_tier if last_tier in _ATELIER_TIER_RANK else None,
            "best_mistakes": (None if best_m is None else int(best_m)),
            "last_mistakes": (None if last_m is None else int(last_m)),
            "inspected": [h for h in (raw.get("inspected") or []) if h in _ATELIER_HOTSPOT_BY_ID],
            "report_viewed": bool(raw.get("report_viewed", False)),
        }

    def _atelier_write(updates):
        store_dict = dict(_ensure_atelier_store())
        store_dict.update(updates)
        persistent.atelier_painting_record = store_dict
        return store_dict

    def atelier_case_solved_count():
        return 1 if atelier_get_record()["solved"] else 0

    def atelier_gold_count():
        return 1 if atelier_get_record()["best_tier"] == "gold" else 0

    def atelier_best_short():
        """主菜单小胶囊与鉴赏页使用：历史最佳画框名，未结案时显示「待结案」。"""
        rec = atelier_get_record()
        return atelier_tier_def(rec["best_tier"])["name"] if rec["best_tier"] else "待结案"

    def atelier_select_hotspot(hotspot_id):
        hdef = atelier_get_hotspot(hotspot_id)
        persistent.atelier_selected_hotspot = hdef["id"]
        renpy.save_persistent()

    def atelier_inspect_hotspot(hotspot_id):
        """剧场内勘查一处画室痕迹：证物入簿（可翻面），并把勘查点记入鉴赏页档案；只写美术室自己的存档。"""
        hdef = _ATELIER_HOTSPOT_BY_ID.get(hotspot_id)
        if hdef is None:
            return False
        if "add_evidence" in globals():
            add_evidence(hdef["evidence"])
        seen = list(atelier_get_record()["inspected"])
        if hdef["id"] not in seen:
            seen.append(hdef["id"])
        _atelier_write({"inspected": seen})
        persistent.atelier_selected_hotspot = hdef["id"]
        renpy.save_persistent()
        return True

    def atelier_record_solve(mistakes_count=0):
        """记录一次结案：评定本局画框、刷新历史最佳（最高评级 + 最少失误）与累计结案次数。
        只写美术室自己的存档，绝不触碰主线 fail_count / 好感。"""
        m = max(0, int(mistakes_count or 0))
        tier = atelier_rate(m)
        prev = atelier_get_record()
        is_first = not prev["solved"]
        prev_rank = _ATELIER_TIER_RANK.get(prev["best_tier"], 0)
        best_tier = tier["key"] if _ATELIER_TIER_RANK[tier["key"]] >= prev_rank else prev["best_tier"]
        best_m = m if prev["best_mistakes"] is None else min(prev["best_mistakes"], m)
        new_record = (not is_first) and (prev["best_mistakes"] is None or m < prev["best_mistakes"])
        _atelier_write({
            "solved": True,
            "replays": prev["replays"] + 1,
            "best_tier": best_tier,
            "last_tier": tier["key"],
            "best_mistakes": best_m,
            "last_mistakes": m,
            "inspected": [h["id"] for h in ATELIER_HOTSPOTS],
        })
        ach_grant("ach_atelier_painting")
        renpy.save_persistent()
        result = atelier_get_record()
        result["is_first"] = is_first
        result["new_record"] = new_record
        return result

    def atelier_open_report_modal():
        if atelier_get_record()["solved"]:
            _atelier_write({"report_viewed": True})
            renpy.save_persistent()
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("atelier_report_modal")

    def atelier_render_view():
        """渲染美术室卷宗：结案前只公开案情与勘查点表面，结案后显影四笔推理、结案报告与双人手记。"""
        rec = atelier_get_record()
        solved = rec["solved"]
        best = atelier_tier_def(rec["best_tier"]) if rec["best_tier"] else None
        if best:
            best_line = "%s「%s」 · 最少失误 %d 次" % (best["name"], best["title"], rec["best_mistakes"] or 0)
        else:
            best_line = "尚未结案"
        return {
            "code": ATELIER_CASE["code"],
            "title": ATELIER_CASE["title"],
            "short_title": ATELIER_CASE["short_title"],
            "time_tag": ATELIER_CASE["time_tag"],
            "summary": ATELIER_CASE["summary_pub"],
            "solved": solved,
            "replays": rec["replays"],
            "best_tier": rec["best_tier"],
            "best_name": best["name"] if best else "待结案",
            "best_line": best_line,
            "inspected_count": len(rec["inspected"]),
            "stroke_shorts": [(k["short"] if solved else "") for k in ATELIER_STROKE_LINKS],
            "stroke_fulls": [(k["full"] if solved else "") for k in ATELIER_STROKE_LINKS],
            "display_solution": ATELIER_CASE["solution_pub"] if solved else "",
            "display_mo_note": ATELIER_CASE["mo_note_pub"] if solved else "",
            "display_alice_note": ATELIER_CASE["alice_note_pub"] if solved else "",
        }

    def atelier_launch_action():
        return [
            Function(stop_all_gramophone_ambience, True),
            SetField(persistent, "extras_tab", "atelier"),
            Replay(ATELIER_CASE["label"], scope={"player_name": persistent.last_player_name or "陈默"}, locked=False),
        ]

    ############################################################################
    ## 二、侦探社毕业纪念寄语墙（12 张寄语卡 · 4×3 软木公告板 · 钉上与展开 · 6 张合影标签）
    ############################################################################

    WALL_CARDS = [
        {
            "id": "w01", "code": "W-01", "writer": "艾丽丝", "recipient": "墨墨", "title": "给万事屋的眼睛",
            "source": "美术室油画", "tab": "atelier", "progress_key": "atelier", "need": 1,
            "condition": "解开美术室消失的油画之谜",
            "pin": "#e0604f",
            "spoiler": True,
            "body": (
                "墨墨：毕业那天，本社长要把你写满的那几本笔记本借来看，不许拒绝！这一年你替万事屋看见了好多东西——"
                "可可渍里的长方形、巡架卡上的红字、平得不像静物的衬布。以后不管你坐在哪间教室，"
                "记得你的社长永远在你右手边，替你把门推开。"
            ),
            "body_secret": (
                "四年前在图书馆的角落，我替你念了第一句话，后来又念了几千句。毕业那天换你来念吧——"
                "不管用的是小雪侦探的声音，还是墨墨的声音，我都坐在台下第一排。"
            ),
            "sign": "万事屋社长 · 艾丽丝",
        },
        {
            "id": "w02", "code": "W-02", "writer": "墨墨", "recipient": "艾丽丝", "title": "给每天先推门的人",
            "source": "美术室油画", "tab": "atelier", "progress_key": "atelier", "need": 1,
            "condition": "解开美术室消失的油画之谜",
            "pin": "#5b8de0",
            "spoiler": True,
            "body": (
                "艾丽丝：你推门的声音，我闭着眼睛也认得。案子卡住的时候，你总是先喊开工，再把最难开口的那句话留给自己。"
                "毕业以后，换我来记住这些。笔记本的第一页，会一直写着万事屋三个字。"
            ),
            "body_secret": (
                "附：四年里你替我念了几千句话。毕业典礼那天，我想重新开口，用自己的声音叫你一声社长。"
                "练习了很多遍，还是会紧张。"
            ),
            "sign": "墨墨（铅笔字）",
        },
        {
            "id": "w03", "code": "W-03", "writer": "艾丽丝", "recipient": "陈默", "title": "给万事屋的嘴",
            "source": "合照相册", "tab": "album", "progress_key": "album", "need": 4,
            "condition": "在合照相册冲洗 4 张侦探社合照",
            "pin": "#e8c04a",
            "spoiler": False,
            "body": (
                "搭档：你转来的第一天，我就看出来了——你是那种会把别人的话认真听完的人，所以万事屋把嘴这个位置交给了你。"
                "毕业那天要是轮到你上台致辞，不许念稿！要像推理的时候那样，看着大家的眼睛说。"
            ),
            "sign": "万事屋社长 · 艾丽丝（盖章！）",
        },
        {
            "id": "w04", "code": "W-04", "writer": "陈默", "recipient": "艾丽丝", "title": "给代价簿的主人",
            "source": "时间胶囊", "tab": "capsule", "progress_key": "capsule", "need": 4,
            "condition": "往时间胶囊放入 4 件学期纪念物",
            "pin": "#5fbf8f",
            "spoiler": False,
            "body": (
                "艾丽丝：代价簿上记着的那些账，我大概要还到毕业以后了。谢谢你那天在闭馆后的图书馆里朝我伸出手。"
                "毕业以后，万事屋的门就算换了新的牌子，我也会记得，第一个推门进来的人永远是你。"
            ),
            "sign": "万事屋的嘴 · 陈默",
        },
        {
            "id": "w05", "code": "W-05", "writer": "墨墨", "recipient": "陈默", "title": "给替我说出来的人",
            "source": "合照相册", "tab": "album", "progress_key": "album", "need": 8,
            "condition": "在合照相册冲洗 8 张侦探社合照",
            "pin": "#e0604f",
            "spoiler": True,
            "body": (
                "陈默：你替我念过很多推理，每一次都念得比我写的好听。毕业的时候，我想送你一本新的笔记本，"
                "第一页先空着，等你来写。写什么都可以，写错了也没关系。"
            ),
            "body_secret": (
                "有一句话，我不想再让你替我念了。从旧仓库回来以后，我一直在练习。毕业那天，我想用自己的声音说给你听。"
            ),
            "sign": "墨墨（铅笔字，擦过三次）",
        },
        {
            "id": "w06", "code": "W-06", "writer": "陈默", "recipient": "墨墨", "title": "给笔记本的主人",
            "source": "时间胶囊", "tab": "capsule", "progress_key": "capsule", "need": 8,
            "condition": "往时间胶囊放入 8 件学期纪念物",
            "pin": "#5b8de0",
            "spoiler": True,
            "body": (
                "墨墨：毕业以后，你还会在笔记本的边角画歪翅膀的纸鹤吗？我把我那只也折得歪一点。"
                "这样放在一起，谁也认不出哪只是谁的——反正都是万事屋的。"
            ),
            "body_secret": (
                "河堤的长椅、粉色的纸鹤、四年前没去成的约定，我都记着。毕业那天叫上小可，我们一起把第三只千纸鹤带去河堤。"
            ),
            "sign": "万事屋的嘴 · 陈默",
        },
        {
            "id": "w07", "code": "W-07", "writer": "张子谦", "recipient": "万事屋", "title": "情报员的毕业赠言",
            "source": "委托信箱", "tab": "mailbox", "progress_key": "mailbox", "need": 1,
            "condition": "破解任意一桩委托信箱短案卷",
            "pin": "#e8c04a",
            "spoiler": False,
            "body": (
                "万事屋全体：学生会的情报本，我给你们留了最后一页。毕业以后要找人、找场地，直接打我电话；"
                "来我家关东煮报万事屋的名字，萝卜多加两块。还有，礼堂借用登记表的最后一栏，我偷偷写了万事屋优先。"
            ),
            "sign": "学生会 · 张子谦（哥们儿）",
        },
        {
            "id": "w08", "code": "W-08", "writer": "吕芙", "recipient": "墨墨", "title": "文学社的吸墨纸",
            "source": "雨夜剧场", "tab": "theater", "progress_key": "theater", "need": 1,
            "condition": "解开雨夜剧场后台的失踪剧本之谜",
            "pin": "#5fbf8f",
            "spoiler": False,
            "body": (
                "墨墨同学：那张吸墨纸你还留着吗？毕业以后，我想把《雨夜的信使》改写成小说。"
                "第一章就写一个举着手电的女孩，斜斜地照亮一页被可可泼湿的剧本。写完了，第一本送给你。"
            ),
            "sign": "文学社 · 吕芙",
        },
        {
            "id": "w09", "code": "W-09", "writer": "小林", "recipient": "墨墨", "title": "图书委员的借书卡",
            "source": "闭馆图书馆", "tab": "library", "progress_key": "library", "need": 1,
            "condition": "解开闭馆图书馆消失书架之谜",
            "pin": "#e0604f",
            "spoiler": False,
            "body": (
                "墨墨：三楼合订本书库里，我给你留了一张借书卡，借阅期限那一栏写的是到毕业以后。"
                "王老师说不合规矩，可他自己在背面盖了章。贴磁条比赛，毕业前还要再比一次。"
            ),
            "sign": "图书委员 · 林依依",
        },
        {
            "id": "w10", "code": "W-10", "writer": "班长", "recipient": "艾丽丝", "title": "导演本旁的便利贴",
            "source": "雨夜剧场", "tab": "theater", "progress_key": "theater_gold", "need": 1,
            "condition": "零失误复盘雨夜剧场，获得金票根",
            "pin": "#5b8de0",
            "spoiler": False,
            "body": (
                "艾丽丝：导演本旁严禁饮料，也严禁一个人偷偷着急——这条规矩，我想送给万事屋。"
                "你们帮过我两次，第二次是在下雨的礼堂里。毕业那天的谢幕，我给你们留第一排。"
            ),
            "sign": "话剧社 · 林思思",
        },
        {
            "id": "w11", "code": "W-11", "writer": "苏棠", "recipient": "万事屋", "title": "北窗下的回礼",
            "source": "美术室油画", "tab": "atelier", "progress_key": "atelier_gold", "need": 1,
            "condition": "零失误复盘美术室油画，获得金画框",
            "pin": "#e8c04a",
            "spoiler": False,
            "body": (
                "万事屋的三位：那天你们没有急着掀开衬布，而是先弄清楚了为什么。画背面的那些金色的字，我会带去集训的城市。"
                "等我毕业回来，北窗下的长桌给你们留三把椅子——记得来画一张，哪怕只画一只纸鹤。"
            ),
            "sign": "美术社 · 苏棠",
        },
        {
            "id": "w12", "code": "W-12", "writer": "万事屋", "recipient": "毕业那天", "title": "写给毕业那天",
            "source": "寄语墙", "tab": "wall", "progress_key": "wall", "need": 11,
            "condition": "把前十一张寄语卡全部钉上寄语墙",
            "pin": "#5fbf8f",
            "spoiler": True,
            "body": (
                "毕业那天的我们：如果那天下雨，就撑同一把伞；如果出太阳，就在旧社团楼门口拍一张合照。"
                "万事屋的牌子不摘，留给下一届。只把公告板上的这面寄语墙，一张一张收进相册里。"
            ),
            "body_secret": (
                "合照里要多留一个位置给周可，还要把第三只千纸鹤摆在最前排。它等这一天，等得比我们三个都久。"
            ),
            "sign": "艾丽丝 · 墨墨 · 陈默",
        },
    ]

    _WALL_BY_ID = {c["id"]: c for c in WALL_CARDS}

    # progress_key -> 计数函数名；运行期按名字取函数，模块加载顺序互不依赖（只读各玩法公开计数，不读任何剧透文本）
    _WALL_PROGRESS_FNS = {
        "atelier":      "atelier_case_solved_count",
        "atelier_gold": "atelier_gold_count",
        "album":        "album_developed_count",
        "capsule":      "capsule_placed_count",
        "mailbox":      "mailbox_solved_count",
        "theater":      "theater_case_solved_count",
        "theater_gold": "theater_gold_count",
        "library":      "library_case_solved_count",
    }

    # 墙角六张合影标签：photo_id 指向 PC-10 合照相册，capsule_id 指向 PC-11 时间胶囊；
    # 照片标题、胶囊纪念物名与两边的状态都在运行期读取，这里只保存寄语墙自己的新标签文字。
    WALL_PHOTO_LABELS = [
        {
            "id": "pl1", "photo_id": "ph01", "capsule_id": "c01", "writer": "艾丽丝", "spoiler": False,
            "label": "钉在寄语墙左上角：万事屋开张的第一天。照片里的信箱还是新的，旁边那张回执已经被摸得起毛了——起点，要放在最显眼的地方。",
        },
        {
            "id": "pl2", "photo_id": "ph05", "capsule_id": "c05", "writer": "墨墨", "spoiler": False,
            "label": "樱花坡道那一张。毕业那天，校门口的樱花大概又开了。我想站在同一个位置，把照片举起来，和身后的树比一比。",
        },
        {
            "id": "pl3", "photo_id": "ph06", "capsule_id": "c06", "writer": "陈默", "spoiler": True,
            "label": "窗台上那排纸鹤，我把照片钉在了墨墨的寄语卡旁边。最前面那只歪翅膀的，毕业的时候要带走。",
            "label_secret": "照片里旧白鹤旁边空着的位置，后来站上了第三只千纸鹤。毕业那天，它要和我们一起拍照。",
        },
        {
            "id": "pl4", "photo_id": "ph08", "capsule_id": "c08", "writer": "艾丽丝", "spoiler": True,
            "label": "钟楼那晚抬早了的下巴，本社长决定原谅陈默——前提是毕业前再爬一次钟楼，这次数到三再一起抬头！",
            "label_secret": "星图背面写着小可的名字。毕业那年秋天的钟楼观测会，第一排要留给周可。",
        },
        {
            "id": "pl5", "photo_id": "ph10", "capsule_id": "c10", "writer": "陈默", "spoiler": False,
            "label": "闭馆夜的合影。王老师浑身湿透还在比耶，小林后来说，那是她第一次见王老师笑得像个学生。",
        },
        {
            "id": "pl6", "photo_id": "ph12", "capsule_id": "c12", "writer": "墨墨", "spoiler": True,
            "label": "全家福钉在寄语墙最下面一排的正中间。所有寄语卡都朝着它，像大家围坐在一张长桌旁边。",
            "label_secret": "站在我身边的周可，是我四年前没能赴约的那个人。毕业那天，我想亲口对她说：谢谢你一直等我。",
        },
    ]

    _WALL_LABEL_BY_ID = {l["id"]: l for l in WALL_PHOTO_LABELS}

    WALL_SPOILER_NOTICE = "【防剧透火漆保护：这张寄语卡的续笔涉终章旧约，通关 TRUE END 或点击右上角「解锁剧透」后自动显影】"
    WALL_LABEL_MASK_NOTICE = "【防剧透火漆：这张标签的续笔通关 TRUE END 后显影】"

    def wall_get_def(card_id):
        return _WALL_BY_ID.get(card_id, WALL_CARDS[0])

    def wall_get_label_def(label_id):
        return _WALL_LABEL_BY_ID.get(label_id, WALL_PHOTO_LABELS[0])

    def _ensure_wall_store():
        if not isinstance(getattr(persistent, "message_wall_record", None), dict):
            persistent.message_wall_record = {}
        return persistent.message_wall_record

    def wall_get_record():
        raw = _ensure_wall_store()
        return {
            "pinned": [c for c in (raw.get("pinned") or []) if c in _WALL_BY_ID],
            "read": [c for c in (raw.get("read") or []) if c in _WALL_BY_ID],
        }

    def _wall_write(updates):
        store_dict = dict(_ensure_wall_store())
        store_dict.update(updates)
        persistent.message_wall_record = store_dict
        return store_dict

    def wall_progress(card_id):
        """返回 (当前进度, 钉上所需)；只读各玩法自身的公开计数，「wall」为其余寄语卡的已钉上张数。"""
        cdef = wall_get_def(card_id)
        key = cdef["progress_key"]
        need = max(1, int(cdef["need"]))
        if key == "wall":
            pinned = wall_get_record()["pinned"]
            cur = sum(1 for c in WALL_CARDS if c["id"] != cdef["id"] and c["id"] in pinned)
        else:
            fn = globals().get(_WALL_PROGRESS_FNS.get(key, ""))
            try:
                cur = int(fn()) if fn is not None else 0
            except Exception:
                cur = 0
        return (max(0, min(cur, need)), need)

    def wall_is_ready(card_id):
        cur, need = wall_progress(card_id)
        return need > 0 and cur >= need

    def wall_card_status(card_id):
        if wall_get_def(card_id)["id"] in wall_get_record()["pinned"]:
            return "pinned"
        if wall_is_ready(card_id):
            return "ready"
        return "locked"

    def wall_pinned_count():
        return len(wall_get_record()["pinned"])

    def wall_ready_count():
        return sum(1 for c in WALL_CARDS if wall_card_status(c["id"]) == "ready")

    def wall_select(card_id):
        persistent.wall_selected_card = wall_get_def(card_id)["id"]
        renpy.save_persistent()

    def wall_pin(card_id, open_modal=True):
        """把一张写好的寄语卡钉上寄语墙；没写好时只给温柔提示。钉满十二张解锁 ach_message_wall。只写寄语墙自己的存档。"""
        cdef = wall_get_def(card_id)
        cid = cdef["id"]
        persistent.wall_selected_card = cid
        rec = wall_get_record()
        if cid in rec["pinned"]:
            return rec
        if not wall_is_ready(cid):
            renpy.notify("这张寄语卡还没有写好：先去完成「%s」的对应进度吧" % cdef["source"])
            return None
        _wall_write({"pinned": rec["pinned"] + [cid], "read": rec["read"] + ([] if cid in rec["read"] else [cid])})
        renpy.sound.play("audio/sfx_page.ogg")
        if wall_pinned_count() >= len(WALL_CARDS):
            ach_grant("ach_message_wall")
        renpy.save_persistent()
        if open_modal:
            renpy.show_screen("wall_card_modal", card_id=cid)
        return wall_get_record()

    def wall_open_card(card_id):
        """展开一张已钉上的寄语卡；没钉上时只给温柔提示。"""
        cdef = wall_get_def(card_id)
        if cdef["id"] not in wall_get_record()["pinned"]:
            renpy.notify("先把这张寄语卡钉上寄语墙，才能展开来读")
            return False
        persistent.wall_selected_card = cdef["id"]
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("wall_card_modal", card_id=cdef["id"])
        return True

    def wall_render_card(card_id):
        """渲染寄语卡：未钉上不显示正文；涉终章续笔只在 truth_spoiler_unlocked() 为真时出现。
        遮罩状态下的返回值与续笔文本完全无关（零侧信道：不暴露长度、有无或任何派生字段）。"""
        cdef = wall_get_def(card_id)
        cur, need = wall_progress(cdef["id"])
        status = wall_card_status(cdef["id"])
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        has_sp = bool(cdef.get("spoiler", False))
        pinned = (status == "pinned")
        show_secret = pinned and has_sp and unlocked
        return {
            "id": cdef["id"],
            "code": cdef["code"],
            "writer": cdef["writer"],
            "recipient": cdef["recipient"],
            "title": cdef["title"],
            "source": cdef["source"],
            "tab": cdef["tab"],
            "condition": cdef["condition"],
            "progress_cur": cur,
            "progress_total": need,
            "status": status,
            "pinned": pinned,
            "spoiler": has_sp,
            "unlocked": (unlocked if has_sp else True),
            "display_body": cdef["body"] if pinned else "",
            "display_sign": cdef["sign"] if pinned else "",
            "display_secret": cdef.get("body_secret", "") if show_secret else "",
            "display_masked_notice": (WALL_SPOILER_NOTICE if (has_sp and not unlocked) else ""),
        }

    def _wall_album_developed(photo_id):
        rec_fn = globals().get("album_get_record")
        try:
            return bool(rec_fn(photo_id)["developed"]) if rec_fn is not None else False
        except Exception:
            return False

    def _wall_capsule_placed(item_id):
        st_fn = globals().get("capsule_item_status")
        try:
            return (st_fn(item_id) == "placed") if st_fn is not None else False
        except Exception:
            return False

    def wall_labels_developed_count():
        return sum(1 for l in WALL_PHOTO_LABELS if _wall_album_developed(l["photo_id"]))

    def wall_render_photo_label(label_id):
        """渲染合影标签：照片标题 / 编号 / 缩略图与胶囊纪念物名都从 PC-10 / PC-11 的数据里读；
        照片未冲洗时不显示标签；涉终章续笔只在 truth_spoiler_unlocked() 为真时出现（零侧信道）。"""
        ldef = wall_get_label_def(label_id)
        pdef_fn = globals().get("album_get_def")
        cdef_fn = globals().get("capsule_get_def")
        pdef = pdef_fn(ldef["photo_id"]) if pdef_fn is not None else {}
        cdef = cdef_fn(ldef["capsule_id"]) if cdef_fn is not None else {}
        developed = _wall_album_developed(ldef["photo_id"])
        placed = _wall_capsule_placed(ldef["capsule_id"])
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        has_sp = bool(ldef.get("spoiler", False))
        show_secret = developed and has_sp and unlocked
        return {
            "id": ldef["id"],
            "photo_id": ldef["photo_id"],
            "photo_code": pdef.get("code", ""),
            "photo_title": pdef.get("title", ""),
            "bg_thumb": pdef.get("bg_thumb", "images/bg_agency.png"),
            "capsule_id": ldef["capsule_id"],
            "capsule_code": cdef.get("code", ""),
            "capsule_name": cdef.get("name", ""),
            "developed": developed,
            "capsule_placed": placed,
            "writer": ldef["writer"],
            "spoiler": has_sp,
            "unlocked": (unlocked if has_sp else True),
            "display_label": ldef["label"] if developed else "",
            "display_secret": ldef.get("label_secret", "") if show_secret else "",
            "display_masked_notice": (WALL_LABEL_MASK_NOTICE if (has_sp and not unlocked) else ""),
        }


################################################################################
## 三、鉴赏分页界面 A：美术室消失的油画（screen extras_atelier_painting）
################################################################################

transform atelier_easel_sway:
    subpixel True
    block:
        ease 2.0 rotate -2 yoffset -1
        ease 2.0 rotate 2 yoffset 1
        repeat

transform wall_pin_wobble:
    subpixel True
    block:
        ease 1.6 rotate -4
        ease 1.6 rotate 4
        repeat

screen extras_atelier_painting():
    $ _atv = atelier_render_view()
    $ _arec = atelier_get_record()
    $ _ahid = persistent.atelier_selected_hotspot or "h1"
    $ _ah = atelier_get_hotspot(_ahid)
    $ _ah_seen = (_ah["id"] in _arec["inspected"])

    vbox:
        spacing 9

        ## 1. 美术室总览横幅（北窗冷光 · 亚麻与翠绿）
        frame:
            style "atelier_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_art_room.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("美术室消失的油画") font gui.name_text_font size 19 color "#e4f5ee"
                        if _atv["solved"]:
                            text _("已结案 · 四笔推理全部画完 · 可随时重返北窗画室冲击金画框") size 12 color "#9fe0c8"
                        else:
                            text _("开展前一天，画了三年的压轴油画不见了 · 六处痕迹等你勘查") size 12 color "#a8c9bd"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_missing_painting.png" xysize (14, 14) yalign 0.5
                            text ("最佳 %s" % _atv["best_name"]) size 12 color "#f4d98a" yalign 0.5 substitute False
                    frame:
                        style "mailbox_stat_chip"
                        text ("结案 %d 次" % _atv["replays"]) size 12 color "#7fd1b9" align (0.5, 0.5) substitute False

        ## 2. 卷宗详情：画室缩略图（底部六色颜料带）、案情、六处勘查点、四笔推理与画框评级
        frame:
            style "atelier_console_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add ATELIER_CASE["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add "images/ui/icon_art_room.png" xysize (24, 24) xalign 0.05 yalign 0.08
                        if _atv["solved"]:
                            add "images/ui/icon_missing_painting.png" xysize (26, 26) xalign 0.96 yalign 0.08 at atelier_easel_sway
                        hbox:
                            spacing 2
                            xalign 0.5
                            yalign 0.97
                            for _pg in ATELIER_PIGMENTS:
                                add Solid(_pg["color"]) xysize (22, 5)
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text ATELIER_CASE["code"] size 12 color "#ffffff" bold True align (0.5, 0.5) substitute False
                            text ("《%s》" % ATELIER_CASE["short_title"]) font gui.name_text_font size 17 color "#e4f5ee" yalign 0.5 substitute False
                        text ("%s  ·  %s" % (ATELIER_CASE["time_tag"], ATELIER_CASE["companions"])) size 12 color "#a8c9bd" substitute False
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (15, 15) yalign 0.5
                            text ("画室光影：%s" % ATELIER_CASE["lighting_note"]) size 12 color "#86a99c" yalign 0.5 substitute False
                        if _atv["solved"]:
                            text ("结案档案：%s（已结案 %d 次 · 六处痕迹全勘查）" % (_atv["best_line"], _atv["replays"])) size 12 color "#f4d98a" substitute False
                        else:
                            text ("结案档案：尚未结案（已勘查 %d/6 处，可先翻看下方痕迹，再推开美术室的门）" % _atv["inspected_count"]) size 12 color "#86a99c" substitute False

                text ATELIER_CASE["summary_pub"] size 13 color "#eef7f2" line_spacing 3 substitute False

                ## 2A. 六处画室勘查点（3 × 226 + 2 × 8 = 694px 精确贴合内宽，两行）
                text _("画室勘查点 · 点击翻看六处痕迹（亲自勘查过的地方，会显影墨墨的现场手记）：") size 12 color "#7fd1b9" bold True
                grid 3 2:
                    spacing 8
                    for h_obj in ATELIER_HOTSPOTS:
                        $ _h_seen = (h_obj["id"] in _arec["inspected"])
                        $ _h_active = (h_obj["id"] == _ah["id"])
                        button:
                            style "restoration_clue_card"
                            selected _h_active
                            action Function(atelier_select_hotspot, h_obj["id"])
                            vbox:
                                spacing 2
                                xfill True
                                hbox:
                                    xfill True
                                    yalign 0.5
                                    text ("%s · %s" % (h_obj["code"], h_obj["label"])) size 11 color ("#7fd1b9" if _h_active else "#dcefe7") bold True yalign 0.5 substitute False
                                    text (_("已勘查") if _h_seen else _("待勘查")) size 10 color ("#86efac" if _h_seen else "#86a99c") xalign 1.0 yalign 0.5
                                text h_obj["surface"] size 11 color "#b7d6ca" line_spacing 2 substitute False

                frame:
                    xfill True
                    padding (10, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        spacing 8
                        add "images/ui/icon_missing_painting.png" xysize (20, 20)
                        vbox:
                            spacing 2
                            text ("%s · %s" % (_ah["code"], _ah["label"])) size 12 color "#7fd1b9" bold True substitute False
                            if _ah_seen:
                                text _ah["detail"] size 12 color "#f2fbf7" line_spacing 2 substitute False
                            else:
                                text _("还没有在画室里勘查这一处。走进现场亲自看过之后，墨墨的现场手记会显影在这里。") size 12 color "#86a99c"

                ## 2B. 四笔推理（4 × 167 + 3 × 8 = 692px <= 694px；每笔一种颜料色标）
                text _("四笔推理 · 复盘（去向 → 藏法 → 动机 → 执行人，结案后显影）：") size 12 color "#7fd1b9" bold True
                hbox:
                    spacing 8
                    for _ki, k_obj in enumerate(ATELIER_STROKE_LINKS):
                        frame:
                            style "atelier_stroke_slot"
                            vbox:
                                spacing 2
                                add Solid(k_obj["color"]) xysize (151, 3)
                                text ("%s · %s" % (k_obj["step"], k_obj["name"])) size 11 color ("#86efac" if _atv["solved"] else "#a8c9bd") bold True substitute False
                                text (_atv["stroke_shorts"][_ki] if _atv["solved"] else _("？ 待落笔")) size 12 color ("#f2fbf7" if _atv["solved"] else "#6f8c82") substitute False

                ## 2C. 画框评级与结案报告预览匣
                frame:
                    style "atelier_rating_card"
                    vbox:
                        spacing 5
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_missing_painting.png" xysize (16, 16) yalign 0.5
                                text _("画框评级 · 重玩挑战") font gui.name_text_font size 13 color "#f2fbf7" yalign 0.5
                            text ("历史最佳：%s" % _atv["best_line"]) size 11 color "#f4d98a" xalign 1.0 yalign 0.5 substitute False
                        hbox:
                            spacing 8
                            for t_obj in ATELIER_RATING_TIERS:
                                frame:
                                    style "atelier_tier_chip"
                                    hbox:
                                        xfill True
                                        yalign 0.5
                                        text ("%s「%s」" % (t_obj["name"], t_obj["title"])) size 12 color ("#f4d98a" if _atv["best_tier"] == t_obj["key"] else "#dcefe7") yalign 0.5 substitute False
                                        text t_obj["rule"] size 11 color "#9fbfb3" xalign 1.0 yalign 0.5 substitute False
                        if _atv["solved"]:
                            add Solid("#7fd1b933") xfill True ysize 1
                            text _atv["display_solution"] size 12 color "#86efac" line_spacing 2 substitute False
                            text _atv["display_mo_note"] size 12 color "#cfa6f0" substitute False
                            text _atv["display_alice_note"] size 12 color "#f0c060" substitute False
                        else:
                            text _("结案报告：解开美术室之谜后，墨墨会把完整的四笔推理与结案报告写在这里。") size 12 color "#86a99c"

                ## 2D. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("零失误画完四笔推理可获金画框 · 已结案 %d 次" % _atv["replays"]) size 12 color "#8fb3a6" yalign 0.5 substitute False
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton _("展阅结案报告"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(atelier_open_report_modal)
                        textbutton (_("重返北窗画室") if _atv["solved"] else _("推开美术室的门")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action atelier_launch_action()

        ## 3. 寄语墙直达条
        $ _w01 = wall_card_status("w01")
        frame:
            style "mailbox_quick_row"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_message_wall.png" xysize (20, 20) yalign 0.5
                    text _("寄语墙 · W-01 给万事屋的眼睛") font gui.name_text_font size 14 color "#fff0dc" yalign 0.5
                    text ("（%s）" % ({"pinned": "已钉上", "ready": "可钉上"}.get(_w01, "结案后写好"))) size 12 color ("#86efac" if _w01 != "locked" else "#a38d75") yalign 0.5 substitute False
                textbutton _("前往寄语墙"):
                    style "gramophone_mini_pill"
                    xalign 1.0
                    yalign 0.5
                    action [SetField(persistent, "wall_selected_card", "w01"), SetField(persistent, "extras_tab", "wall")]


## 美术室结案报告独立展阅弹窗
screen atelier_report_modal():
    modal True
    zorder 215
    $ _mv = atelier_render_view()

    add "#06100cdc"
    key "K_ESCAPE" action Hide("atelier_report_modal")
    key "K_RETURN" action Hide("atelier_report_modal")
    key "K_SPACE" action Hide("atelier_report_modal")

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
                    add "images/ui/icon_art_room.png" xysize (40, 40) yalign 0.5
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_mv["code"], _mv["short_title"])) font gui.name_text_font size 20 color "#e4f5ee" substitute False
                        text _mv["time_tag"] size 12 color "#a8c9bd" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_missing_painting.png" xysize (30, 30) yalign 0.5 at atelier_easel_sway
                    text _mv["best_name"] size 13 color "#f4d98a" bold True yalign 0.5 substitute False

            hbox:
                spacing 0
                for _rp in ATELIER_PIGMENTS:
                    add Solid(_rp["color"]) xysize (115, 3)

            viewport:
                xfill True
                ysize 336
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    text _("案情：") size 12 color "#7fd1b9" bold True
                    text _mv["summary"] size 13 color "#eef7f2" line_spacing 4 substitute False
                    add Solid("#a8c9bd33") xfill True ysize 1
                    if _mv["solved"]:
                        text _("四笔推理：") size 12 color "#7fd1b9" bold True
                        for _ri, r_obj in enumerate(ATELIER_STROKE_LINKS):
                            hbox:
                                spacing 8
                                add Solid(r_obj["color"]) xysize (6, 18) yalign 0.0
                                text ("%s · %s（%s）：%s" % (r_obj["step"], r_obj["name"], r_obj["pigment"], _mv["stroke_fulls"][_ri])) size 13 color "#dcefe7" line_spacing 3 xsize 658 substitute False
                        add Solid("#7fd1b933") xfill True ysize 1
                        text _mv["display_solution"] size 13 color "#86efac" line_spacing 4 substitute False
                        text _mv["display_mo_note"] size 13 color "#cfa6f0" line_spacing 4 substitute False
                        text _mv["display_alice_note"] size 13 color "#f0c060" line_spacing 4 substitute False
                    else:
                        text _("这桩案子还没有结案。推开美术室的门、勘查六处画室痕迹并画完四笔推理后，完整的结案报告会显影在这里。") size 13 color "#8fb3a6" line_spacing 4

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上结案报告") size 12 color "#8fb3a6" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 10
                    textbutton _("重返北窗画室"):
                        style "gramophone_mini_pill"
                        yalign 0.5
                        action [Hide("atelier_report_modal")] + atelier_launch_action()
                    textbutton _("合上报告"):
                        style "pill_button"
                        xminimum 116
                        ysize 34
                        text_size 14
                        action Hide("atelier_report_modal")


## 美术室剧场内顶部「四笔推理」横幅（位于右上角证物 HUD 下方，互不遮挡；已落笔的格子亮起各自的颜料色）
screen atelier_stroke_banner(strokes_done, prompt_line):
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
                add "images/ui/icon_art_room.png" xysize (22, 22) yalign 0.5
                text _("美术室 · 四笔推理") size 12 color "#7fd1b9" bold True yalign 0.5
                text ("已落笔 %d/%d · 失误只计入本案画框评级，不影响主线" % (strokes_done, len(ATELIER_STROKE_LINKS))) size 11 color "#a8c9bd" yalign 0.5
            hbox:
                spacing 6
                for _bi, b_obj in enumerate(ATELIER_STROKE_LINKS):
                    frame:
                        style "atelier_banner_slot"
                        vbox:
                            spacing 0
                            add Solid(b_obj["color"] if _bi <= strokes_done else "#3a4a44") xysize (160, 3)
                            text ("%s · %s" % (b_obj["step"], b_obj["name"])) size 10 color ("#86efac" if _bi < strokes_done else ("#7fd1b9" if _bi == strokes_done else "#86a99c")) bold True substitute False
                            text (b_obj["short"] if _bi < strokes_done else _("？")) size 11 color ("#f2fbf7" if _bi < strokes_done else "#6f8c82") substitute False
            text prompt_line size 14 color "#f2fbf7" substitute False


## 美术室结案结算卡：本局画框评级 + 历史最佳纪录 + 重玩挑战提示
screen atelier_result_card(cur_tier, best_tier, mistakes, best_mistakes, replays, new_record=False, is_first=True):
    modal True
    zorder 220
    $ _ct = atelier_tier_def(cur_tier)
    $ _bt = atelier_tier_def(best_tier)
    $ _rv = atelier_render_view()
    $ _is_gold = (cur_tier == "gold")

    add "#06100cdc"
    key "K_RETURN" action Return("back_to_atelier")
    key "K_SPACE" action Return("back_to_atelier")
    key "K_ESCAPE" action Return("back_to_atelier")

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
                add "images/ui/icon_missing_painting.png" xysize (54, 54) yalign 0.5 at atelier_easel_sway
                vbox:
                    spacing 3
                    yalign 0.5
                    text ("美术室结案 · %s" % ATELIER_CASE["code"]) size 13 color "#7fd1b9" bold True substitute False
                    text ("《%s》" % ATELIER_CASE["short_title"]) font gui.name_text_font size 21 color "#e4f5ee" substitute False
                    text ("本局评级：【%s · %s】" % (_ct["name"], _ct["title"])) size 14 color ("#f4d98a" if _is_gold else "#86efac") substitute False

            hbox:
                spacing 0
                xalign 0.5
                for _cp in ATELIER_PIGMENTS:
                    add Solid(_cp["color"]) xysize (101, 3)

            frame:
                xfill True
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 4
                    text _rv["display_mo_note"] size 13 color "#cfa6f0" substitute False
                    text _rv["display_alice_note"] size 13 color "#f0c060" substitute False
                    text ("本局失误 %d 次（只计入美术室评级，不影响主线）" % mistakes) size 12 color "#a8c9bd"
                    text ("历史最佳：%s「%s」 · 最少失误 %d 次 · 累计结案 %d 次" % (_bt["name"], _bt["title"], best_mistakes, replays)) size 12 color "#a8c9bd" substitute False
                    if is_first:
                        text _("首次结案 · 四笔推理已写入鉴赏室「美术室油画」分页，寄语墙的前两张寄语卡写好了") size 12 color "#86efac"
                    elif new_record:
                        text _("重玩挑战 · 刷新个人纪录！这一次落笔比以往任何一次都更稳") size 12 color "#f4d98a"
                    elif _is_gold:
                        text _("重玩挑战 · 再次挂上金画框，北窗画室名侦探实至名归") size 12 color "#f4d98a"
                    else:
                        text _("重玩挑战 · 零失误画完四笔推理，就能把金画框挂上北窗") size 12 color "#a8c9bd"

            textbutton _("收好画框并返回美术室"):
                style "pill_button"
                xalign 0.5
                xminimum 248
                ysize 38
                text_size 15
                action Return("back_to_atelier")


################################################################################
## 四、鉴赏分页界面 B：侦探社毕业纪念寄语墙（screen extras_message_wall）
################################################################################

screen extras_message_wall():
    $ _wsel = persistent.wall_selected_card or "w01"
    $ _wv = wall_render_card(_wsel)
    $ _wrec = wall_get_record()
    $ _pin_n = len(_wrec["pinned"])
    $ _ready_n = wall_ready_count()

    vbox:
        spacing 9

        ## 1. 软木公告板总览横幅
        frame:
            style "wall_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_message_wall.png" xysize (36, 36) yalign 0.5 at wall_pin_wobble
                    vbox:
                        spacing 2
                        xsize 398
                        text _("侦探社毕业纪念寄语墙") font gui.name_text_font size 19 color "#fff0dc"
                        if _pin_n >= len(WALL_CARDS):
                            text _("十二张寄语卡已全部钉上 · 毕业那天，一张一张收进相册。") size 12 color "#f4d98a"
                        elif persistent.te_cleared:
                            text _("TRUE END 已通关 · 寄语卡与合影标签的续笔已全部显影。") size 12 color "#d8c8ee"
                        elif persistent.truth_spoiler_confirmed:
                            text _("已手动开启剧透许可 · 寄语卡与合影标签的续笔当前可见。") size 12 color "#f0a4b8"
                        else:
                            text _("万事屋门边的软木公告板 · 涉终章的续笔已由防剧透火漆保护。") size 12 color "#d9bf9c"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_graduation_card.png" xysize (14, 14) yalign 0.5
                            text ("已钉上 %d/%d" % (_pin_n, len(WALL_CARDS))) size 12 color "#f4d98a" yalign 0.5
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
                                            message=_("尚未通关 TRUE END，确定提前揭晓「寄语墙」中涉终章旧约的寄语续笔与标签续笔吗？"),
                                            yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                            no_action=Hide("confirm"))

        ## 2. 钉卡规则条（xsize 722 -> 内宽 702px 零溢出）
        frame:
            style "wall_rule_bar"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 6
                    yalign 0.5
                    add "images/ui/icon_graduation_card.png" xysize (16, 16) yalign 0.5
                    text ("可钉上 %d · 已钉上 %d · 寄语卡会随结案、合照与胶囊的进度陆续写好" % (_ready_n, _pin_n)) size 11 color "#efe0c8" yalign 0.5
                text _("钉满十二张解锁成就「毕业寄语墙的执笔人」") size 11 color "#e7b98a" xalign 1.0 yalign 0.5

        ## 3. 软木公告板（4 × 173 + 3 × 10 = 722px 严丝合缝，三行；每张卡左上角一枚彩色图钉）
        grid 4 ((len(WALL_CARDS) + 3) // 4):
            spacing 10
            for c_obj in WALL_CARDS:
                $ _cst = wall_card_status(c_obj["id"])
                $ _cis = (c_obj["id"] == _wv["id"])
                button:
                    style "wall_card_button"
                    selected _cis
                    action Function(wall_select, c_obj["id"])
                    vbox:
                        spacing 2
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 5
                                yalign 0.5
                                add Solid(c_obj["pin"]) xysize (7, 7) yalign 0.5 alpha (1.0 if _cst == "pinned" else 0.35)
                                text c_obj["code"] size 11 color ("#f4d98a" if _cis else "#e3c9a4") bold True yalign 0.5 substitute False
                            if _cst == "pinned":
                                text _("已钉上") size 10 color "#f4d98a" bold True xalign 1.0 yalign 0.5
                            elif _cst == "ready":
                                text _("可钉上") size 10 color "#86efac" bold True xalign 1.0 yalign 0.5
                            else:
                                text _("未写好") size 10 color "#a38d75" xalign 1.0 yalign 0.5
                        text ("%s → %s" % (c_obj["writer"], c_obj["recipient"])) size 11 color ("#efe0c8" if _cst != "locked" else "#a38d75") substitute False
                        text c_obj["title"] font gui.name_text_font size 13 color ("#fff0dc" if _cst != "locked" else "#a892c2") substitute False
            for _pad_i in range((4 - len(WALL_CARDS) % 4) % 4):
                null width 173 height 70

        ## 4. 选中寄语卡的详情：执笔人、钉上条件、正文与续笔
        frame:
            style "wall_detail_card"
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
                            style "wall_icon_well"
                            add "images/ui/icon_graduation_card.png" xysize (52, 52) align (0.5, 0.5) alpha (1.0 if _wv["pinned"] else (0.62 if _wv["status"] == "ready" else 0.24))
                        vbox:
                            spacing 3
                            xsize 470
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                frame:
                                    style "mailbox_code_badge"
                                    text _wv["code"] size 11 color "#ffffff" bold True align (0.5, 0.5) substitute False
                                text ("《%s》" % _wv["title"]) font gui.name_text_font size 18 color "#fff0dc" yalign 0.5 substitute False
                            text ("执笔：%s → %s" % (_wv["writer"], _wv["recipient"])) size 12 color "#d9bf9c" substitute False
                            text ("钉上条件：%s（当前 %d/%d）" % (_wv["condition"], _wv["progress_cur"], _wv["progress_total"])) size 12 color "#a8c6b0" substitute False
                    frame:
                        style "mailbox_stat_chip"
                        xalign 1.0
                        yalign 0.5
                        if _wv["pinned"]:
                            text _("已钉上墙") size 11 color "#f4d98a" align (0.5, 0.5)
                        elif _wv["status"] == "ready":
                            text _("可以钉上") size 11 color "#86efac" align (0.5, 0.5)
                        else:
                            text _("还没写好") size 11 color "#a38d75" align (0.5, 0.5)

                ## 4A. 寄语正文与署名（钉上后显影）
                if _wv["pinned"]:
                    frame:
                        style "wall_message_box"
                        vbox:
                            spacing 4
                            text _wv["display_body"] size 13 color "#fff6e6" line_spacing 3 substitute False
                            text _wv["display_sign"] size 12 color "#e7b98a" xalign 1.0 substitute False
                            if _wv["display_secret"]:
                                add Solid("#e7b98a44") xfill True ysize 1
                                text ("续笔：%s" % _wv["display_secret"]) size 12 color "#f4d98a" line_spacing 3 substitute False
                else:
                    frame:
                        xfill True
                        padding (11, 8)
                        background Frame("gui/hud_chip.png", 12, 12)
                        text _("把这张寄语卡钉上寄语墙后，执笔人写下的话和署名会显影在这里。") size 12 color "#c9b08e" line_spacing 3
                if _wv["display_masked_notice"]:
                    text _wv["display_masked_notice"] size 11 color "#f0a4b8" substitute False

                ## 4B. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text _("每一张寄语卡，都写给万事屋里的某个人") size 12 color "#a38d75" yalign 0.5
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        if _wv["tab"] != "wall":
                            textbutton ("前往%s" % _wv["source"]):
                                style "gramophone_mini_pill"
                                yalign 0.5
                                action SetField(persistent, "extras_tab", _wv["tab"])
                        textbutton _("展开卡片"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action (Function(wall_open_card, _wv["id"]) if _wv["pinned"] else None)
                        textbutton (_("已钉上") if _wv["pinned"] else _("钉上寄语墙")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action (Function(wall_pin, _wv["id"]) if _wv["status"] == "ready" else None)

        ## 5. 合影标签（读取 PC-10 合照相册冲洗状态与 PC-11 时间胶囊放入状态；3 × 226 + 2 × 8 = 694px 贴合内宽）
        frame:
            style "wall_detail_card"
            vbox:
                spacing 7
                xfill True
                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 6
                        yalign 0.5
                        add "images/ui/icon_photo_album.png" xysize (18, 18) yalign 0.5
                        text _("合影标签 · 墙角钉着的六张合照（读取合照相册与时间胶囊的进度）") font gui.name_text_font size 13 color "#fff0dc" yalign 0.5
                    text ("已冲洗 %d/%d" % (wall_labels_developed_count(), len(WALL_PHOTO_LABELS))) size 11 color "#f4d98a" xalign 1.0 yalign 0.5
                grid 3 2:
                    spacing 8
                    for l_obj in WALL_PHOTO_LABELS:
                        $ _lv = wall_render_photo_label(l_obj["id"])
                        frame:
                            style "wall_photo_label"
                            vbox:
                                spacing 3
                                xfill True
                                hbox:
                                    spacing 6
                                    frame:
                                        style "wall_label_thumb"
                                        add _lv["bg_thumb"]:
                                            crop_relative True
                                            crop (0.0, 0.18, 1.0, 0.636)
                                            xysize (60, 34)
                                            fit "contain"
                                            align (0.5, 0.5)
                                            alpha (1.0 if _lv["developed"] else 0.18)
                                    vbox:
                                        spacing 1
                                        yalign 0.5
                                        text ("%s · %s" % (_lv["photo_code"], (_("已冲洗") if _lv["developed"] else _("未冲洗")))) size 10 color ("#f4d98a" if _lv["developed"] else "#a38d75") bold True substitute False
                                        text _lv["photo_title"] font gui.name_text_font size 12 color ("#fff0dc" if _lv["developed"] else "#a892c2") substitute False
                                if _lv["developed"]:
                                    text ("%s：%s" % (_lv["writer"], _lv["display_label"])) size 11 color "#f6e9d6" line_spacing 2 substitute False
                                    if _lv["display_secret"]:
                                        text ("续笔：%s" % _lv["display_secret"]) size 11 color "#f4d98a" line_spacing 2 substitute False
                                else:
                                    text _("去合照相册冲洗这张合照后，寄语墙的标签会写在这里。") size 11 color "#a38d75" line_spacing 2
                                if _lv["display_masked_notice"]:
                                    text _lv["display_masked_notice"] size 10 color "#f0a4b8" substitute False
                                hbox:
                                    xfill True
                                    text ("%s · %s" % (_lv["capsule_code"], _lv["capsule_name"])) size 10 color "#cbb79c" substitute False
                                    text (_("已放入胶囊") if _lv["capsule_placed"] else _("未放入胶囊")) size 10 color ("#86efac" if _lv["capsule_placed"] else "#a38d75") xalign 1.0
                hbox:
                    xfill True
                    yalign 0.5
                    text _("照片在合照相册里冲洗，纪念物在时间胶囊里放入——寄语墙只把它们并排钉在一起") size 11 color "#a38d75" yalign 0.5
                    hbox:
                        xalign 1.0
                        spacing 8
                        textbutton _("打开相册"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action SetField(persistent, "extras_tab", "album")
                        textbutton _("打开胶囊"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action SetField(persistent, "extras_tab", "capsule")

        ## 6. 美术室直达条
        frame:
            style "mailbox_quick_row"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_art_room.png" xysize (20, 20) yalign 0.5
                    text _("美术室油画 · AT-01 北窗下的三年") font gui.name_text_font size 14 color "#e4f5ee" yalign 0.5
                    text ("（%s）" % atelier_best_short()) size 12 color "#f4d98a" yalign 0.5 substitute False
                textbutton _("前往美术室"):
                    style "gramophone_mini_pill"
                    xalign 1.0
                    yalign 0.5
                    action SetField(persistent, "extras_tab", "atelier")


## 寄语卡展开弹窗
screen wall_card_modal(card_id="w01"):
    modal True
    zorder 218
    $ _cm = wall_render_card(card_id)

    add "#100b06e0"
    key "K_ESCAPE" action Hide("wall_card_modal")
    key "K_RETURN" action Hide("wall_card_modal")
    key "K_SPACE" action Hide("wall_card_modal")

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
                    add "images/ui/icon_graduation_card.png" xysize (40, 40) yalign 0.5 at wall_pin_wobble
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_cm["code"], _cm["title"])) font gui.name_text_font size 20 color "#fff0dc" substitute False
                        text ("执笔：%s → %s · 钉在万事屋门边的软木公告板上" % (_cm["writer"], _cm["recipient"])) size 12 color "#d9bf9c" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_message_wall.png" xysize (28, 28) yalign 0.5
                    text ("已钉上 %d/%d" % (wall_pinned_count(), len(WALL_CARDS))) size 13 color "#f4d98a" bold True yalign 0.5 substitute False

            add Solid("#e7b98a44") xfill True ysize 1

            viewport:
                xfill True
                ysize 280
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    if _cm["pinned"]:
                        text _cm["display_body"] font gui.name_text_font size 14 color "#fff6e6" line_spacing 6 substitute False
                        text _cm["display_sign"] size 13 color "#e7b98a" xalign 1.0 substitute False
                        if _cm["display_secret"]:
                            add Solid("#f4d98a33") xfill True ysize 1
                            text ("续笔：%s" % _cm["display_secret"]) size 13 color "#f4d98a" line_spacing 4 substitute False
                    else:
                        text _("这张寄语卡还没有钉上寄语墙。写好之后钉上去，就可以在这里展开来读。") size 13 color "#a38d75" line_spacing 4
                    if _cm["display_masked_notice"]:
                        text _cm["display_masked_notice"] size 12 color "#f0a4b8" substitute False

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮收好寄语卡") size 12 color "#a38d75" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 8
                    if _cm["spoiler"] and not persistent.te_cleared and not persistent.truth_spoiler_confirmed:
                        textbutton _("手动解锁剧透"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Show("confirm",
                                        message=_("尚未通关 TRUE END，确定提前揭晓这张寄语卡末尾涉终章旧约的续笔吗？"),
                                        yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                        no_action=Hide("confirm"))
                    textbutton _("收好寄语卡"):
                        style "pill_button"
                        xminimum 138
                        ysize 34
                        text_size 14
                        action Hide("wall_card_modal")


################################################################################
## 五、样式定义（PC-12 美术室北窗冷光翠绿 & 寄语墙软木暖棕配色）
################################################################################

style atelier_header_card is default:
    xfill True
    padding (14, 10)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#a6e3cf") * SaturationMatrix(0.0))

style atelier_console_card is default:
    xfill True
    padding (14, 11)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#c4ece0") * SaturationMatrix(0.0))

style atelier_rating_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style atelier_stroke_slot is default:
    xsize 167
    ysize 58
    padding (8, 5)
    background Frame("gui/hud_chip.png", 12, 12)

style atelier_banner_slot is default:
    xsize 176
    ysize 44
    padding (8, 4)
    background Frame("gui/panel_card.png", 16, 16)

style atelier_tier_chip is default:
    xsize 218
    ysize 30
    padding (8, 0)
    background Frame("gui/panel_card.png", 16, 16)

style wall_header_card is default:
    xfill True
    padding (14, 10)
    background Transform(Frame("gui/panel_card.png", 16, 16), matrixcolor=TintMatrix("#f2c99a") * SaturationMatrix(0.0))

style wall_rule_bar is default:
    xfill True
    ysize 30
    padding (10, 4)
    background Frame("gui/hud_chip.png", 12, 12)

style wall_card_button is button:
    xsize 173
    ysize 70
    padding (9, 7)
    background Transform(Frame("gui/panel_card.png", 16, 16), matrixcolor=TintMatrix("#f4dcb8") * SaturationMatrix(0.0))
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style wall_detail_card is default:
    xfill True
    padding (14, 11)
    background Transform(Frame("gui/panel_card.png", 16, 16), matrixcolor=TintMatrix("#ecd2ae") * SaturationMatrix(0.0))

style wall_icon_well is default:
    xsize 68
    ysize 68
    padding (0, 0)
    background Frame("gui/hud_chip.png", 12, 12)

style wall_message_box is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style wall_photo_label is default:
    xsize 226
    yminimum 118
    padding (8, 6)
    background Frame("gui/hud_chip.png", 12, 12)

style wall_label_thumb is default:
    xsize 64
    ysize 38
    padding (2, 2)
    background "#efe4cc"


################################################################################
## 六、美术室独立沙盒初始化与结案出口（零侵入主线好感/失误/存档）
################################################################################

label _atelier_init_sandbox(session_save_title):
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

label _atelier_finish_case(local_mistakes=0):
    $ _at_final_mistakes = max(0, int(local_mistakes or 0))
    $ _at_rec = atelier_record_solve(_at_final_mistakes)
    hide screen atelier_stroke_banner
    hide screen evidence_book
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen atelier_result_card(_at_rec["last_tier"], _at_rec["best_tier"], _at_final_mistakes, _at_rec["best_mistakes"], _at_rec["replays"], _at_rec["new_record"], _at_rec["is_first"])
    $ persistent.extras_tab = "atelier"
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 七、美术室 AT-01：《北窗下的三年》
################################################################################

label atelier_painting_case:
    call _atelier_init_sandbox("美术室 · AT-01 北窗下的三年")
    $ _at_mistakes = 0
    $ _at_strokes = 0
    $ _at_h1 = False
    $ _at_h2 = False
    $ _at_h3 = False
    $ _at_h4 = False
    $ _at_h5 = False
    $ _at_h6 = False
    $ _at_replays = atelier_get_record()["replays"]
    $ _at_best_text = atelier_render_view()["best_line"]

    scene bg black with fade
    $ play_bgm(bgm_suspense, fadein=1.5)
    centered "{size=+6}美术室 · ATELIER AT-01{/size}\n\n{size=+14}北窗下的三年{/size}\n\n{color=#7fd1b9}周四 17:20 · 旧社团楼三楼美术室 · 校园艺术节开展前一天{/color}"

    scene bg agency at bg_kenburns_out
    $ set_ambient("dusk")
    with dissolve

    play sound se_footstep
    "周四傍晚，旧社团楼比平时热闹得多。明天一早校园艺术节就要开展，楼梯上上下下全是抱着画框和气泡纸的人。"
    "二楼的万事屋里，艾丽丝正对着门边的软木公告板发愁，琢磨该把艺术节的导览图钉在哪个角落。"
    play sound se_door
    show lin sad at center
    lin "打、打扰了……艾丽丝社长，你们现在有空吗？"
    "小林抱着一摞厚厚的画册站在门口，额前的碎发被汗粘住了。她是图书委员，美术社为了这次展览借了十本画册，她本来是上楼去收回的。"
    show alice think at left
    show mo think at right
    alice "小林？怎么了，画册被谁扣下了？"
    lin "不是画册……是三楼美术室。苏棠学姐的油画，不见了。"
    lin "就是美术社这次展览的压轴作品，《北窗下的三年》。我刚才在楼梯口碰见学姐，她就站在那里，一句话也说不出来。"
    show alice shock at left
    alice "压轴作品？明天一早就开展了！"
    lin "学姐是高三的社长。开展第二天，她就要去外地美术集训，一直到毕业前都很少回学校了。那幅画……是她留给美术社的最后一件作品。"
    play sound se_write
    mo_note "三楼。现在去。"
    "墨墨已经合上了笔记本。艾丽丝抓起放大镜，回头冲我一扬下巴。"
    show alice smile at left
    alice "搭档，万事屋出外勤！小林，画册先放这儿，你带路！"

    scene bg classroom at bg_kenburns_in
    $ set_ambient("cool")
    show screen evidence_book
    with dissolve

    play sound se_footstep
    "美术室朝北，一整面墙都是窗。傍晚的天光冷冷的、匀匀的，落在一排排空画架上，空气里飘着松节油和亚麻籽油的味道。"
    "大部分作品已经搬下楼了，教室里空出了一大片。几个一年级的学妹低着头，有的在擦桌子，有的在卷气泡纸。"
    "正对北窗的那座主画架，空着。"
    sutang "……你们是万事屋的人吧。小林跟我说了。"
    "画架旁站着一个短发的女生。她的指甲缝里嵌着洗不掉的群青和赭石，校服袖口卷到手肘，手里攥着一卷还没拆封的挂画钢丝。"
    "美术社社长，高三的苏棠。"
    show alice think at left
    show mo think at right
    sutang "四点半，我把画留在这里，下楼去展廊盯着布展组挂画。五点零五分，我上来拿挂画钢丝——画架就已经空了。"
    sutang "小满跟我说，好像是学生会布展组上来搬过。我跑下楼去问，张子谦说清单上写着不搬，他们根本没碰过它。"
    sutang "整栋楼我都找过了。展廊、楼梯间、储物柜……都没有。"
    alice "小满是？"
    xiaoman "是、是我……一年级的温小满。"
    "擦桌子的学妹里，一个戴圆框眼镜的女孩抬起头，又飞快地低了下去。她手里的抹布，已经在同一个桌角上擦了很久。"
    xiaoman "我只是看见布展组的人抬着画框从门口经过……可能、可能是我看错了。对不起，学姐。"
    sutang "不怪你。是我自己不该把它一个人留在这里。"
    "苏棠低头看着空空的画架，声音很轻。"
    sutang "其实丢了也好。明天开展，来看的人也不会在意少了哪一幅。"
    show alice angry at left
    alice "这怎么行！这幅画你画了多久？"
    sutang "……三年。从高一第一次坐在北窗下面开始，一直画到上个星期。"
    show mo neutral at right
    play sound se_write
    mo_note "三年的画，不会自己走掉。一处一处看。"
    show alice smile at left
    alice "好！万事屋开工！明早八点开展之前，一定把《北窗下的三年》找回来！"

label atelier_case_investigate:
    if _at_h1 and _at_h2 and _at_h3 and _at_h4 and _at_h5 and _at_h6:
        jump atelier_case_review_intro

    menu:
        "北窗外的天色一点点暗下来。先勘查哪一处？（可随时点击右上角【证据】翻面查看批注）"

        "走到正对北窗的主画架前，看看画是怎么被取下来的" if not _at_h1:
            $ _at_h1 = True
            scene bg classroom
            $ set_ambient("cool")
            show alice think at left
            show mo think at right
            with dissolve
            play sound se_page
            "主画架是美术室里最大的一座，橡木的，足有一人多高。夹住画框上沿的木卡扣被拧到了最松，螺杆上一道新刮痕都没有。"
            mc "不是被人一把扯下来的。有人一圈一圈地拧开卡扣，再把画慢慢托了下来。"
            "画架腿上贴着一张清漆记录，是苏棠的字：『《北窗下的三年》 · 上光油 · 十天前 · 已干透 —— 苏』。"
            show alice shock at left
            alice "十天前就上过光油了？那这幅画现在摸上去，是干的？"
            "我蹲下来看画架底下。木地板上干干净净，没有颜料碎屑，也没有一颗钉子。"
            mc "这幅画是绷在木内框上的。要是有人想把画布拆下来卷走，得先起掉边上一整圈钉子——可这里一颗都没有。"
            show mo smile at right
            play sound se_write
            mo_note "拿走它的人，很小心。小心的人，不会把它卷起来。"
            $ atelier_inspect_hotspot("h1")
            jump atelier_case_investigate

        "查看教室中央那张盖着白衬布的静物台" if not _at_h2:
            $ _at_h2 = True
            scene bg classroom
            $ set_ambient("cool")
            show alice think at left
            show mo think at right
            with dissolve
            "教室中央的静物台是一张矮矮的大木台，上面盖着一整块白衬布。衬布四边垂下来的长度一模一样，平平整整，像一张铺好的床单。"
            "衬布正中立着一块小木牌：『油彩未干 · 请勿触碰』。"
            show alice smile at left
            alice "未干就别碰啦。美术社的规矩，可比万事屋的还严。"
            play sound se_page
            "我环顾四周。后排的调色板全都刮得干干净净，松节油罐的盖子拧得紧紧的。黑板角落写着一行通知：『开展周 · 静物写生课暂停』。"
            mc "这一周根本没有写生课，今天下午大家都在布展。那张台子上，今天谁也没画过一笔油彩。"
            show alice shock at left
            alice "那这块『油彩未干』，是在拦着谁？"
            "平时静物台上总摆着石膏像、陶罐和几个苹果，衬布会被撑出高高低低的起伏。可现在，它平得像一张桌面。"
            "艾丽丝伸手想去掀衬布的一角。墨墨轻轻拉住了她的袖子，摇了摇头。"
            show mo think at right
            play sound se_write
            mo_note "先别掀。木牌是有人特意立的。先弄清楚为什么。"
            $ atelier_inspect_hotspot("h2")
            jump atelier_case_investigate

        "推开隔壁美术准备室的门，翻看工具柜的领用簿" if not _at_h3:
            $ _at_h3 = True
            scene bg storeroom
            $ set_ambient("warm")
            show alice think at left
            show mo think at right
            with dissolve
            play sound se_door
            "美术准备室和美术室之间只隔着一道小门。屋里堆满了石膏模型、画框和颜料箱，工具柜门上用绳子挂着一本领用簿。"
            play sound se_page
            "最新的一行墨迹还很新：『16:42 金色油漆笔 ×7、白棉手套 ×7 —— 温（一年级）』。"
            "往上一行是中午的：『12:10 挂画钢丝 ×1 卷 —— 苏棠』，后面『已取走』那一栏还空着。"
            show alice smile at left
            alice "挂画钢丝——就是苏棠学姐五点零五分上楼来拿的那一卷！她到现在都还没来得及拿走。"
            mc "金色油漆笔能在没刷底料的生麻布上写字，不晕也不掉色。七支笔，七副白手套……正好够七个人用。"
            "墙边立着一排等着入库的空画框。我一个个量过去，最大的也只有四开，连那幅六十乘八十的油画的一半都装不下。"
            show mo smile at right
            play sound se_write
            mo_note "白手套，是碰干透的画、也不留指纹的手套。"
            $ atelier_inspect_hotspot("h3")
            jump atelier_case_investigate

        "下楼到一楼展廊，找张子谦核对布展组的搬运清单" if not _at_h4:
            $ _at_h4 = True
            scene bg corridor
            $ set_ambient("warm")
            show alice think at left
            show zhang think at center
            show mo think at right
            with dissolve
            play sound se_footstep
            "一楼展廊里，学生会布展组正踩着梯子往墙上挂画。张子谦夹着一块写字板，嗓子都喊哑了。"
            zhang "哥们儿，你们也来了？我跟苏棠学姐解释了好几遍了——那幅画我们真没动过！"
            play sound se_page
            "他把搬运清单递过来。二十九幅作品，从二号到三十号，一行一个勾。只有第一行写着：『1 号《北窗下的三年》—— 不搬 · 明早由社长亲自挂』。"
            zhang "压轴的画，学姐不放心别人碰，说明早自己来挂。四点半到五点十分，布展组一直在三楼和展廊之间来回抬画，楼梯口我安排了两个人守着，怕有人被画框磕着。"
            zhang "要是有谁抬着那么大一幅画下楼，不可能没人看见。"
            show alice smile at left
            alice "那美术社的人呢？一直在这儿帮忙？"
            zhang "一开始是。喏，签到表——一年级七个人，四点四十就签退了，说是回三楼『收拾画室』。"
            "签退那一栏，七个名字挨在一起，第一个写的是『温小满』。"
            mc "四点四十签退，四点四十二在准备室领了七支笔……可温小满跟学姐说，她看见的是布展组上楼搬画。"
            play sound se_write
            mo_note "布展组没有上楼。上楼的，是另外七个人。"
            $ atelier_inspect_hotspot("h4")
            jump atelier_case_investigate

        "检查北窗台上那尊石膏像，和窗户的插销" if not _at_h5:
            $ _at_h5 = True
            scene bg classroom
            $ set_ambient("cool")
            show alice think at left
            show mo think at right
            with dissolve
            "北窗的窗台很宽，平时只摆几盆绿萝。可现在，绿萝中间多了一尊白色的石膏头像，就是美术课上被画了无数遍的那一尊。"
            play sound se_page
            "我把手电贴着窗台照过去。积灰上压着一圈新鲜的圆印，大小正好和石膏像的底座吻合——它是今天下午才被挪到这里的。"
            mc "除了这一圈圆印，窗台上什么痕迹也没有。要是有人从这里把画吊下楼，画框一定会在积灰上拖出一道印子。"
            "窗户的插销上缠着一圈封箱胶带，上面是布展组的签名和日期。胶带完完整整，连一道褶子都没有。"
            show alice smile at left
            alice "开展前就封好的窗，今天根本没打开过。"
            "回头再看静物台，白衬布靠近一角的地方，有一个浅浅的圆印，和窗台上的那一圈一样大。"
            show mo smile at right
            play sound se_write
            mo_note "石膏像原来住在静物台上。有人请它挪了个地方。"
            $ atelier_inspect_hotspot("h5")
            jump atelier_case_investigate

        "看看讲台边的白板，和架子上那只装软木塞的玻璃罐" if not _at_h6:
            $ _at_h6 = True
            scene bg classroom
            $ set_ambient("cool")
            show alice think at left
            show mo think at right
            with dissolve
            "讲台边立着一块白板，上半截写着美术社的规矩。第一条是苏棠的字，又大又用力："
            "『画要翻面的时候，四角垫软木塞，画面绝不许碰桌子！』"
            play sound se_page
            "白板旁边的架子上放着一只玻璃罐，里面装满了红酒瓶的软木塞。标签上写着：『翻画专用 · 32 个』。"
            "艾丽丝把罐子倒在桌上，我们俩一个一个数了两遍。"
            show alice shock at left
            alice "二十八个。少了四个！"
            mc "四个软木塞，正好垫一幅画的四个角。"
            "白板下半截是开展倒计时：『周五开展 · 周六学姐出发去集训』。倒计时的数字旁边，有人用彩色白板笔画了七个手牵手的小人，最前面那个小人头上，戴着一顶歪歪的毕业帽。"
            show mo smile at right
            play sound se_write
            mo_note "七个小人，七支笔，七副手套。还有一个要出远门的人。"
            $ atelier_inspect_hotspot("h6")
            jump atelier_case_investigate

label atelier_case_review_intro:
    scene bg sunset
    $ set_ambient("dusk")
    $ play_bgm(bgm_mystery, fadein=1.2, fadeout=0.8)
    show alice smile at left
    show mo neutral at right
    with dissolve

    "六处痕迹全部勘查完毕。我们走出美术室，站在三楼西侧的外廊上。夕阳从走廊尽头灌进来，把每个人的影子都拉得很长。"
    "苏棠学姐还在楼下展廊一遍遍地找。美术室里，那七个一年级的学妹，谁也没有离开。"
    alice "掀开任何东西之前，先把推理一笔一笔画完——就像画油画一样，四笔，一笔都不能画错！"
    if _at_replays > 0:
        sysmsg "【美术室 · 重玩挑战】当前历史最佳：[_at_best_text]。零失误画完四笔推理，就能把金画框挂上北窗。"
    else:
        sysmsg "【美术室 · 四笔推理】依次选出「去向 → 藏法 → 动机 → 执行人」四笔。零失误可获金画框，失误只计入本案评级，不影响主线。"

label atelier_stroke_k1:
    show screen atelier_stroke_banner(0, "第一笔 · 去向：清单上的「不搬」、没开过的北窗、楼梯口的看守——画去了哪里？")
    menu:
        "画从来没有离开美术室——它还在那个房间里":
            hide screen atelier_stroke_banner
            play sound se_correct
            $ _at_strokes = 1

        "学生会布展组顺手把它抬去了一楼展廊":
            hide screen atelier_stroke_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "清单上的一号明明写着『不搬』呀，楼梯口也一直有人守着。抬下楼的二十九幅画，一幅一幅都打过勾了。"
            play sound se_write
            mo_note "布展组没有上楼。再想想，是谁上了楼。"
            jump atelier_stroke_k1

        "有人打开北窗，用吊画绳把它放下了楼":
            hide screen atelier_stroke_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "北窗插销上的胶带完完整整，窗台的积灰上也只有石膏像的一圈圆印哦。那扇窗今天根本没开过。"
            play sound se_write
            mo_note "门出不去，窗也出不去。那它就还在屋里。"
            jump atelier_stroke_k1

    mc "清单上写着不搬，楼梯口一直有人看守；北窗今天没开过，画也没有被拆下来卷走。《北窗下的三年》从来没有离开过美术室。"

label atelier_stroke_k2:
    show screen atelier_stroke_banner(1, "第二笔 · 藏法：平得像桌面的衬布、没人画过的「油彩未干」、少了四个的软木塞——它藏在哪？")
    menu:
        "竖着塞进了隔壁美术准备室的空画框堆里":
            hide screen atelier_stroke_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "准备室里最大的空画框也只有四开哦，连那幅画的一半都装不下。"
            play sound se_write
            mo_note "要找一个够大、够平，又没有人会去碰的地方。"
            jump atelier_stroke_k2

        "从内框上拆下来卷成一卷，藏进了谁的画筒":
            hide screen atelier_stroke_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "画架底下一颗钉子都没有呀。要把画布卷起来，得先把内框上的一整圈钉子起下来才行。"
            play sound se_write
            mo_note "拿它的人很小心。小心的人，不拆画。"
            jump atelier_stroke_k2

        "画面朝下、四角垫着软木塞，平躺在静物台的白衬布底下":
            hide screen atelier_stroke_banner
            play sound se_correct
            $ _at_strokes = 2

    mc "石膏像被挪到了窗台，衬布平得像一张桌面，上面却立着一块『油彩未干』——今天根本没人画过油彩。翻画专用的软木塞又刚好少了四个。画面朝下、四角垫着软木塞，《北窗下的三年》就躺在衬布底下。"

label atelier_stroke_k3:
    show screen atelier_stroke_banner(2, "第三笔 · 动机：七支金色油漆笔、七副白手套、开展倒计时——为什么要把画翻过来？")
    menu:
        "有人不满意这幅画，想替学姐把它撤下展览":
            hide screen atelier_stroke_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "要是想撤下展览，搬去准备室锁起来就好啦，何必领七支金色油漆笔，还小心翼翼地垫上软木塞？"
            play sound se_write
            mo_note "撤下一幅画，用不着七个人，也用不着笔。"
            jump atelier_stroke_k3

        "趁学姐不在，在画布背面写下毕业寄语，给她一个惊喜":
            hide screen atelier_stroke_banner
            play sound se_correct
            $ _at_strokes = 3

        "想偷偷修改画面，替学姐补上没画完的地方":
            hide screen atelier_stroke_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "画面是朝下放的呀，正面根本碰不到。再说十天前就上好了光油，这幅画早就画完了。"
            play sound se_write
            mo_note "朝下的是画面。朝上的，是背面。"
            jump atelier_stroke_k3

    mc "画面朝下，朝上的就是没刷底料的生麻布背面。金色油漆笔能在生麻布上写字，白手套不会在干透的画上留下指纹。七支笔、七副手套、倒计时旁边七个手牵手的小人——有人想趁学姐不在，在画布背面写下送给她的毕业寄语。"

label atelier_stroke_k4:
    show screen atelier_stroke_banner(3, "第四笔 · 执行人：领用簿上的「温」、提前签退的七个人、那句「学生会搬走了」——是谁？")
    menu:
        "张子谦——带着布展组搬了一下午画的学生会干事":
            hide screen atelier_stroke_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "张子谦的清单把一号写得清清楚楚，他一直在展廊里喊得嗓子都哑了。布展组每一趟上下楼，也都在楼梯口的人眼皮底下。"
            play sound se_write
            mo_note "说『学生会搬走了』的人，不是学生会。"
            jump atelier_stroke_k4

        "苏棠学姐自己——开展前一天，她对这幅画没了信心":
            hide screen atelier_stroke_banner
            $ _at_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "学姐是第一个发现画不见、跑遍整栋楼去找的人呀。领用簿上也没有她下午的名字，她连自己的挂画钢丝都还没拿走。"
            play sound se_write
            mo_note "她嘴上说丢了也好。可她找了一个小时。"
            jump atelier_stroke_k4

        "温小满和美术社一年级的学妹们":
            hide screen atelier_stroke_banner
            play sound se_correct
            $ _at_strokes = 4
            show screen deduction_cutin(headline=_("画布背面 ——！"), subline="THE BACK OF THE CANVAS")
            with flash_shutter

    mc "领用簿上写着『温（一年级）』，签到表上一年级七个人四点四十就签退回了三楼。画是在温小满说出『学生会搬走了』之后，才变成『失踪』的——把画翻过来的，就是她们七个人。"
    show alice happy at left
    alice "四笔全部画完！回美术室——记住，掀衬布之前，先戴手套。"

label atelier_case_resolution:
    scene bg classroom at bg_kenburns_in
    $ set_ambient("cool")
    $ play_bgm(bgm_warm, fadein=1.5, fadeout=1.0)
    show alice smile at left
    show mo smile at right
    with dissolve

    play sound se_door
    "我们回到美术室的时候，七个学妹不约而同地停下了手里的活儿。温小满攥着抹布站在静物台旁边，像是在守着什么。"
    alice "小满同学。衬布底下的东西，我们已经知道是什么了。"
    "温小满的肩膀抖了一下。过了好一会儿，她才小声开口。"
    xiaoman "……对不起。我不是故意要骗学姐的。"
    xiaoman "学姐后天就要去集训了，一直到毕业前都很少回来。我们七个想送她点什么，可是买什么都觉得不够。"
    xiaoman "后来有人说，学姐在北窗下面画了三年，那就在这幅画的背面，写上我们想对她说的话吧——这样不管画挂到哪里，那些话都跟着它。"
    xiaoman "明天一挂上墙，就再也没机会翻面了。今天下午学姐在楼下，是最后的机会……"
    xiaoman "我们按学姐教的规矩，四角垫上软木塞，画面朝下放好。才写到一半，就听见学姐上楼的脚步声。我一慌，就把衬布盖了上去，又把写生课的木牌立在了上面……"
    xiaoman "学姐问我画去哪儿了，我脑子里一片空白，就说成了学生会……说完我就后悔了。可是一想到现在说出来，惊喜就没有了……"
    "她的眼眶红红的，抹布已经被攥成了一团。"
    show alice think at left
    alice "所以你们七个，就一直在这里擦同一张桌子，擦了快一个小时？"
    xiaoman "……嗯。"

    show mo think at right
    play sound se_page
    "墨墨走上前，把笔记本翻到新的一页，写了一行字，轻轻转过去给温小满看。"
    play sound se_write
    mo_note "惊喜可以晚一点。可学姐现在很害怕。"
    "温小满盯着那行字看了很久，终于用力点了点头。"

    play sound se_footstep
    hide alice
    "艾丽丝跑下楼，把苏棠学姐从展廊里请了上来。"
    show alice smile at left
    sutang "找到了？在哪里？"
    "七个学妹在静物台前排成一排。温小满深吸了一口气，和另外两个学妹一起，掀开了那块白衬布。"
    play sound se_page
    "衬布底下，《北窗下的三年》画面朝下，平平稳稳地躺在四个软木塞上。"
    "她们戴着白手套，一人扶住一个角，没有把画翻过来，而是小心地把它竖了起来，让背面正对着学姐。"
    "没有刷过底料的生麻布上，写满了金色的字。"
    "『学姐，我在北窗下画的第一张静物，是你手把手教我削的炭笔。』"
    "『谢谢你在我想退社的那天，把你的调色板借给我。』"
    "『集训的城市冷不冷？记得戴手套，画画的手最重要。』"
    "七行金色的字绕成了一个圈，圈的正中间空着一块，旁边用很小的字写着：『留给学姐自己。』"
    sutang "……你们这群傻瓜。"
    "苏棠的声音一下子哑了。她蹲下来，伸手想摸那些字，又在半空中停住，怕把它们碰花了。"
    sutang "我刚才还在想，丢了也好。反正我走了以后，北窗下面换一批人坐，谁还记得那里画过什么。"
    sutang "原来你们一直都记得。"
    xiaoman "学姐，对不起，我不该骗你说是学生会……"
    sutang "不许道歉。"
    "苏棠戴上一副白手套，从温小满手里接过最后一支金色油漆笔，在圆圈正中间，一笔一划地写了起来。"
    "她写得很慢。写完以后，她没有念出来，只是把笔递回给温小满，又转向了我们。"
    sutang "万事屋的三位，也写一句吧。今天要不是你们，这幅画、还有这些字，我可能要等到很多年以后才会看见。"
    show alice happy at left
    alice "真的可以吗？那本社长就不客气啦！"
    "艾丽丝在角落里写下『万事屋到此一游——祝前程似锦！』，字大得差点占掉两个人的位置。我在她下面补了一句：『北窗下的三年，我们帮你找回来了。』"
    show mo smile at right
    play sound se_crane
    "墨墨想了想，没有写字，而是在最下面的角落里，用金色的笔画了一只小小的千纸鹤。它的一边翅膀，有点歪。"
    play sound se_write
    mo_note "画会挂在墙上。背面的话，会跟着画一起走。"

    scene bg corridor at bg_kenburns_out
    $ set_ambient("warm")
    show alice smile at left
    show lin smile at center
    with dissolve
    play sound se_bell
    "第二天早上八点，校园艺术节准时开展。展廊正中，《北窗下的三年》挂在最显眼的位置。"
    "画上是美术室的北窗。窗下一张长桌，长桌边摆着八把椅子，每一把椅背上都搭着一件不同颜色的罩衫——七件新的，一件旧的。"
    "画框旁的说明牌上，多了一行小字：『本作品背面，共有十一位作者。』"
    lin "我刚才路过，看见好多人站在说明牌前面猜，背面到底写了什么。"
    alice "那可是美术社和万事屋的最高机密！"
    show zhang happy at right
    zhang "哥们儿，下次这种事能不能提前跟学生会打声招呼？我昨晚做梦都在数清单上的勾。"
    hide zhang
    hide lin
    show mo smile at center
    "人群里，苏棠学姐站在画前，没有看画，而是看着围在画旁边、一个个替说明牌回答『秘密』的七个学妹。"
    play sound se_write
    mo_note "北窗下的三年，是八个人的。"

    scene bg agency at bg_kenburns_in
    $ set_ambient("warm")
    show alice happy at left
    show mo smile at right
    with dissolve
    "那天放学后，艾丽丝在万事屋门边的软木公告板前站了很久。"
    alice "搭档，墨墨。我决定了——万事屋也要有一面寄语墙！"
    mc "我们离毕业还早得很吧？"
    alice "就是因为还早，才要从现在开始写！真等到毕业那天才动笔，想说的话肯定写不完。"
    "她从抽屉里翻出一沓空白卡片往桌上一拍，一人分了一叠。"
    "墨墨拿起一张卡片，先在右下角画了一只歪翅膀的小纸鹤，然后把它钉在公告板的正中间——上面还什么都没写。"
    play sound se_write
    mo_note "第一张先空着。等想好了，再写。"
    show alice smile at left
    alice "好！万事屋毕业纪念寄语墙，今天正式开张！"

    call _atelier_finish_case(_at_mistakes)
    return
