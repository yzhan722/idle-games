## 《沉默侦探：千纸鹤的约定》—— PC-10 闭馆图书馆消失书架之谜与侦探社合照回忆相册
## vanished_shelf_album.rpy
##
## 设计要点：
##   1. 100% 零侵入主线剧情（script.rpy / chapter1..6.rpy / interlude.rpy / definitions.rpy / autoplay.rpy 零改动）。
##   2. 「闭馆图书馆消失书架之谜」（screen extras_closed_library + 可重玩短案 label closed_library_case）：
##      周五闭馆后，图书馆一楼东墙的 E-7 校友文集专架六层一百八十册书凭空消失。
##      玩法三段式：六处现场勘查点（入证物簿、可翻面批注）→ 四环推理链复盘（去向 → 路径 → 动机 → 执行人，
##      按顺序选出正确环节）→ 三楼书库结案。选错只给温柔提示、只计入本地 _lb_mistakes，绝不触碰主线
##      fail_count / 好感；结案按失误数评定金 / 银 / 铜书签并保存历史最佳纪录，可无限重玩刷新纪录，
##      持久化于 persistent.closed_library_record。真相完全写实（漏雨、还书车、传书梯与计次器），无任何超自然要素。
##   3. 「侦探社合照回忆相册」（screen extras_photo_album + 相片特写弹窗）：
##      收录鉴赏室每项玩法的十二张侦探社合照（信箱 / 茶会 / 辞典 / 古籍 / 信笺 / 鹤谱 / 电台 / 星象 / 铜章 /
##      闭馆夜 / 金书签 / 全家福），首次完成对应玩法即可冲洗；每张合照背面都有墨墨与艾丽丝的双人短评，
##      涉终章的背面续笔严格联动 truth_spoiler_unlocked() 零侧信道遮罩，持久化于 persistent.photo_album_records。
##   4. 本文件按文件名排在 stargazer_badges.rpy 之后初始化，双成就追加在 PC-9 之后，成就页扩展为 2×13 = 26 枚。

# —— PC-10 鉴赏室复古水彩 UI 图标命名别名（128x128 RGBA 透明底）——
image ui_icon_closed_library = "images/ui/icon_closed_library.png"
image ui_icon_library_key    = "images/ui/icon_library_key.png"
image ui_icon_photo_album    = "images/ui/icon_photo_album.png"
image ui_icon_club_photo     = "images/ui/icon_club_photo.png"

init python:

    # 动态注册 PC-10 双成就，使鉴赏室成就页扩展为 2×13（共 26 枚）严整偶数列对称排布
    if "register_extra_achievement" in globals():
        register_extra_achievement(
            "ach_closed_library",
            "闭馆夜的书架侦探",
            "解开闭馆图书馆消失书架之谜。",
            False,
        )
        register_extra_achievement(
            "ach_photo_album",
            "侦探社合照收藏家",
            "在合照回忆相册中冲洗集齐十二张合照。",
            False,
        )

    ############################################################################
    ## 一、闭馆图书馆消失书架之谜（1 桩可重玩短案 · 6 处勘查点 · 4 环推理链 · 金银铜书签评级）
    ############################################################################

    LIBRARY_CASE = {
        "id": "l1",
        "code": "L-01",
        "label": "closed_library_case",
        "title": "闭馆图书馆消失书架之谜",
        "short_title": "消失的校友文集专架",
        "time_tag": "周五 18:40 · 一楼开架阅览室 · 闭馆后",
        "companions": "艾丽丝 · 墨墨 · 小林 · 王老师",
        "bg_key": "library",
        "bg_thumb": "images/bg_library.png",
        "lighting_note": "应急灯 → 办公室台灯 → 三楼书库（library / storeroom）",
        "spoiler": False,
        "summary_pub": (
            "周五傍晚五点半，图书馆准时闭馆。小林五点二十五分巡架时还拍过照的 E-7 校友文集专架，"
            "等她六点二十分折回来取登记本时，六层一百八十册书竟然全部不见了——正门落着锁，"
            "防盗门一声没响，窗外的雨越下越密。明早九点，校友返校日的参观路线正好从这架书前经过。"
        ),
        "solution_pub": (
            "结案报告：一百八十册校友文集从未离开图书馆。17:40 总务处把暴雨通知发给王老师，他从行政楼的侧门"
            "赶回馆里，发现 E-7 正上方的矿棉板已经开始渗水，便给左右两架盖好塑料布、在漏点下摆好红水桶，"
            "又在巡架卡上写下一个「移」字，把整架孤本按层装上两辆还书车，用传书梯分两趟送上了三楼——"
            "计次器多出的三次单程，正是「上、下、上」。"
        ),
        "mo_note_pub": "墨墨现场手记：「书没有消失。它们只是被一个很在乎它们的人，抱到了离雨最远的地方。」",
        "alice_note_pub": "艾丽丝结案批注：「闭馆书架失踪案人赃并获！犯人王老师当场认罪，罚他明早七点和万事屋一起把书搬回去！」",
    }

    LIBRARY_HOTSPOTS = [
        {
            "id": "h1",
            "code": "H-01",
            "label": "E-7 空书架与巡架卡",
            "scene": "library",
            "surface": "六层书板空空荡荡，铁书立整整齐齐靠在每层左端，侧板上夹着一张巡架卡。",
            "detail": (
                "现场手记：每层书板上都留着一道浅浅的灰线，灰线以内干干净净——书是今天才被整架移走的。"
                "巡架卡最后一行是小林的「17:25 林 √」，下面却多了一行红笔字「17:58 移」：拿走书的人，还认认真真地记了一笔。"
            ),
            "evidence": "E-7巡架卡：17:25小林打勾，17:58红笔补写一个移字",
            "observer": "墨墨（现场手记）",
        },
        {
            "id": "h2",
            "code": "H-02",
            "label": "天花板水渍与红水桶",
            "scene": "library",
            "surface": "E-7 正上方的矿棉板晕开一圈褐色水渍，地毯上摆着一只接水的红水桶。",
            "detail": (
                "现场手记：红水桶里已经积了薄薄一层雨水，桶身印着「总务处」。左右相邻的 E-6、E-8 被透明塑料布"
                "仔细盖好、四角压着厚辞典——唯独正对漏点的 E-7，被整架搬空了。"
            ),
            "evidence": "E-7上方渗水：红水桶接雨，左右两架盖好了塑料布",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "h3",
            "code": "H-03",
            "label": "正门门禁与防盗门",
            "scene": "library",
            "surface": "正门刷卡面板能翻看当天的开关记录，旁边立着两扇磁条防盗门。",
            "detail": (
                "现场手记：17:32 小林刷卡落锁，18:20 小林刷卡开锁，中间再没有任何记录，防盗门的警报灯一直是绿的。"
                "每册馆藏的书脊里都贴着磁条，一楼窗子又全装着防盗栏——一百八十册书出不了这扇门。"
            ),
            "evidence": "正门门禁记录：17:32落锁到18:20开锁之间无人进出",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "h4",
            "code": "H-04",
            "label": "还书车车位与湿轮印",
            "scene": "library",
            "surface": "借阅台旁的地胶上贴着「还书车 1」「还书车 2」两个车位框，框里空空的。",
            "detail": (
                "现场手记：两道并排的湿轮印从 E-7 下方那片潮湿的地毯出发，压过地胶，拐进了借阅台后面的办公室门；"
                "转弯处的轮印压得特别深，车上装得很沉。还书车，是上不了楼梯的。"
            ),
            "evidence": "两辆还书车不见了：湿轮印从E-7一路通进办公室",
            "observer": "墨墨（现场手记）",
        },
        {
            "id": "h5",
            "code": "H-05",
            "label": "办公室的传书梯",
            "scene": "library_office",
            "surface": "办公室墙角有一部小型传书梯，铁门上写着「限载 150 公斤 · 严禁乘人」。",
            "detail": (
                "现场手记：湿轮印在传书梯铁门前戛然而止。楼层指示灯停在「3」，计次器读数 0399，"
                "闭馆点检记录却写着「17:00 · 0396 · 停一楼」——闭馆后多走了三次单程。"
                "旁边侧门的地垫上只有一行朝外的湿鞋印，没有一道轮印。"
            ),
            "evidence": "传书梯：指示灯停在三楼，计次器比闭馆点检多走三次",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "h6",
            "code": "H-06",
            "label": "王老师的办公桌",
            "scene": "library_office",
            "surface": "桌上压着一张刚打印出来的通知，墙上挂着钥匙挂板和一本领用簿。",
            "detail": (
                "现场手记：总务处 17:40 发给「图书馆 王老师」的通知写着：今夜东侧排水沟堵塞，一楼东侧可能渗漏、"
                "地漏可能倒灌，请将贵重纸质资料移至高处，维修班明早七点到场。钥匙板上「侧门」「传书梯」两个挂钩空着；"
                "领用簿扉页写着「传书梯钥匙仅限王老师、总务处领用」，和巡架卡上那个「移」字是同一支红笔的笔迹。"
            ),
            "evidence": "王老师桌上的暴雨通知与钥匙板：传书梯钥匙仅限王老师领用",
            "observer": "艾丽丝（社长批注）",
        },
    ]

    _LIBRARY_HOTSPOT_BY_ID = {h["id"]: h for h in LIBRARY_HOTSPOTS}

    LIBRARY_CHAIN_LINKS = [
        {
            "id": "k1",
            "step": "第一环",
            "name": "去向",
            "short": "从未离开图书馆",
            "full": (
                "正门 17:32 落锁到 18:20 开锁之间无人进出，防盗门一声未响，左右两架又本就满满当当——"
                "一百八十册书没有出门，也没有藏进别的书架，它们被还书车推进了办公室。"
            ),
        },
        {
            "id": "k2",
            "step": "第二环",
            "name": "路径",
            "short": "传书梯分两趟上三楼",
            "full": (
                "湿轮印止于传书梯门口，还书车上不了楼梯；闭馆点检时轿厢停在一楼，多出的三次单程只能是"
                "「上、下、上」——两辆还书车分两趟上了三楼。"
            ),
        },
        {
            "id": "k3",
            "step": "第三环",
            "name": "动机",
            "short": "为躲雨把孤本移高",
            "full": (
                "漏点正对 E-7，左右两架盖好了塑料布，通知又提醒一楼地漏可能倒灌——这不是偷，也不是捣乱，"
                "而是把整架孤本移到最高、最干的地方。"
            ),
        },
        {
            "id": "k4",
            "step": "第四环",
            "name": "执行人",
            "short": "握着钥匙的王老师",
            "full": (
                "暴雨通知发给王老师，侧门与传书梯钥匙只有他能领用，巡架卡上那个红笔「移」字，"
                "也和领用簿扉页出自同一支红笔。"
            ),
        },
    ]

    LIBRARY_RATING_TIERS = [
        {"key": "gold",   "name": "金书签", "title": "闭馆夜名侦探", "rule": "零失误",         "max_mistakes": 0},
        {"key": "silver", "name": "银书签", "title": "巡架推理员",   "rule": "失误 1～2 次",    "max_mistakes": 2},
        {"key": "bronze", "name": "铜书签", "title": "见习馆员",     "rule": "失误 3 次及以上", "max_mistakes": 999},
    ]

    _LIBRARY_TIER_BY_KEY = {t["key"]: t for t in LIBRARY_RATING_TIERS}
    _LIBRARY_TIER_RANK = {"gold": 3, "silver": 2, "bronze": 1}

    # 在证物簿里登记六件勘查证物的翻面批注（与委托信箱同一套 register_evidence_detail 机制）
    if "register_evidence_detail" in globals():
        for _lh in LIBRARY_HOTSPOTS:
            register_evidence_detail(_lh["evidence"], _lh["observer"], _lh["detail"])

    def library_tier_def(tier_key):
        return _LIBRARY_TIER_BY_KEY.get(tier_key, LIBRARY_RATING_TIERS[-1])

    def library_rate(mistakes_count=0):
        """按本局失误数评定书签：0 次金书签，1～2 次银书签，3 次及以上铜书签。"""
        m = max(0, int(mistakes_count or 0))
        for tier in LIBRARY_RATING_TIERS:
            if m <= tier["max_mistakes"]:
                return tier
        return LIBRARY_RATING_TIERS[-1]

    def library_get_hotspot(hotspot_id):
        return _LIBRARY_HOTSPOT_BY_ID.get(hotspot_id, LIBRARY_HOTSPOTS[0])

    def _ensure_library_store():
        if not isinstance(getattr(persistent, "closed_library_record", None), dict):
            persistent.closed_library_record = {}
        return persistent.closed_library_record

    def library_get_record():
        raw = _ensure_library_store()
        best_tier = raw.get("best_tier")
        last_tier = raw.get("last_tier")
        best_m = raw.get("best_mistakes", None)
        last_m = raw.get("last_mistakes", None)
        return {
            "solved": bool(raw.get("solved", False)),
            "replays": int(raw.get("replays", 0) or 0),
            "best_tier": best_tier if best_tier in _LIBRARY_TIER_RANK else None,
            "last_tier": last_tier if last_tier in _LIBRARY_TIER_RANK else None,
            "best_mistakes": (None if best_m is None else int(best_m)),
            "last_mistakes": (None if last_m is None else int(last_m)),
            "inspected": [h for h in (raw.get("inspected") or []) if h in _LIBRARY_HOTSPOT_BY_ID],
            "report_viewed": bool(raw.get("report_viewed", False)),
        }

    def _library_write(updates):
        store_dict = dict(_ensure_library_store())
        store_dict.update(updates)
        persistent.closed_library_record = store_dict
        return store_dict

    def library_case_solved_count():
        return 1 if library_get_record()["solved"] else 0

    def library_gold_count():
        return 1 if library_get_record()["best_tier"] == "gold" else 0

    def library_best_short():
        """主菜单小胶囊与鉴赏页使用：历史最佳书签名，未结案时显示「待结案」。"""
        rec = library_get_record()
        return library_tier_def(rec["best_tier"])["name"] if rec["best_tier"] else "待结案"

    def library_select_hotspot(hotspot_id):
        hdef = library_get_hotspot(hotspot_id)
        persistent.library_selected_hotspot = hdef["id"]
        renpy.save_persistent()

    def library_inspect_hotspot(hotspot_id):
        """剧场内勘查一处现场：证物入簿（可翻面），并把勘查点记入鉴赏页档案；只写闭馆夜自己的存档。"""
        hdef = _LIBRARY_HOTSPOT_BY_ID.get(hotspot_id)
        if hdef is None:
            return False
        if "add_evidence" in globals():
            add_evidence(hdef["evidence"])
        seen = list(library_get_record()["inspected"])
        if hdef["id"] not in seen:
            seen.append(hdef["id"])
        _library_write({"inspected": seen})
        persistent.library_selected_hotspot = hdef["id"]
        renpy.save_persistent()
        return True

    def library_record_solve(mistakes_count=0):
        """记录一次结案：评定本局书签、刷新历史最佳（最高评级 + 最少失误）与累计结案次数。
        只写闭馆夜自己的存档，绝不触碰主线 fail_count / 好感。"""
        m = max(0, int(mistakes_count or 0))
        tier = library_rate(m)
        prev = library_get_record()
        is_first = not prev["solved"]
        prev_rank = _LIBRARY_TIER_RANK.get(prev["best_tier"], 0)
        best_tier = tier["key"] if _LIBRARY_TIER_RANK[tier["key"]] >= prev_rank else prev["best_tier"]
        best_m = m if prev["best_mistakes"] is None else min(prev["best_mistakes"], m)
        new_record = (not is_first) and (prev["best_mistakes"] is None or m < prev["best_mistakes"])
        _library_write({
            "solved": True,
            "replays": prev["replays"] + 1,
            "best_tier": best_tier,
            "last_tier": tier["key"],
            "best_mistakes": best_m,
            "last_mistakes": m,
            "inspected": [h["id"] for h in LIBRARY_HOTSPOTS],
        })
        ach_grant("ach_closed_library")
        renpy.save_persistent()
        result = library_get_record()
        result["is_first"] = is_first
        result["new_record"] = new_record
        return result

    def library_open_report_modal():
        if library_get_record()["solved"]:
            _library_write({"report_viewed": True})
            renpy.save_persistent()
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("library_report_modal")

    def library_render_view():
        """渲染闭馆夜卷宗：结案前只公开案情与勘查点表面，结案后显影推理链、结案报告与双人手记。"""
        rec = library_get_record()
        solved = rec["solved"]
        best = library_tier_def(rec["best_tier"]) if rec["best_tier"] else None
        if best:
            best_line = "%s「%s」 · 最少失误 %d 次" % (best["name"], best["title"], rec["best_mistakes"] or 0)
        else:
            best_line = "尚未结案"
        return {
            "code": LIBRARY_CASE["code"],
            "title": LIBRARY_CASE["title"],
            "short_title": LIBRARY_CASE["short_title"],
            "time_tag": LIBRARY_CASE["time_tag"],
            "summary": LIBRARY_CASE["summary_pub"],
            "solved": solved,
            "replays": rec["replays"],
            "best_tier": rec["best_tier"],
            "best_name": best["name"] if best else "待结案",
            "best_line": best_line,
            "inspected_count": len(rec["inspected"]),
            "chain_shorts": [(k["short"] if solved else "") for k in LIBRARY_CHAIN_LINKS],
            "chain_fulls": [(k["full"] if solved else "") for k in LIBRARY_CHAIN_LINKS],
            "display_solution": LIBRARY_CASE["solution_pub"] if solved else "",
            "display_mo_note": LIBRARY_CASE["mo_note_pub"] if solved else "",
            "display_alice_note": LIBRARY_CASE["alice_note_pub"] if solved else "",
        }

    def library_launch_action():
        return [
            Function(stop_all_gramophone_ambience, True),
            SetField(persistent, "extras_tab", "library"),
            Replay(LIBRARY_CASE["label"], scope={"player_name": persistent.last_player_name or "陈默"}, locked=False),
        ]

    ############################################################################
    ## 二、侦探社合照回忆相册（12 张合照 · 4×3 拍立得墙 · 冲洗入册 · 双人背面短评）
    ############################################################################

    ALBUM_PHOTOS = [
        {
            "id": "ph01", "code": "P-01", "title": "信箱开张合影",
            "source": "委托信箱", "tab": "mailbox", "progress_key": "mailbox", "need": 1,
            "place": "万事屋门口 · 胡桃木信箱旁", "cast": "艾丽丝 · 墨墨 · 陈默",
            "bg_thumb": "images/bg_agency.png",
            "condition": "破解任意一桩委托信箱短案卷",
            "spoiler": False,
            "mo_caption": "第一封委托信投进来的那天，艾丽丝把信箱擦了三遍才肯拍照。照片里我的手还按在铜锁上，像怕它跑掉。",
            "alice_caption": "万事屋信箱开张纪念！本社长站正中比剪刀手，墨墨负责扶信箱，陈默负责被挤到画面边上——完美构图！",
        },
        {
            "id": "ph02", "code": "P-02", "title": "红茶方糖合影",
            "source": "午后茶话会", "tab": "teaparty", "progress_key": "teaparty", "need": 1,
            "place": "社团活动室 · 下午三点", "cast": "艾丽丝 · 墨墨 · 陈默",
            "bg_thumb": "images/bg_clubroom.png",
            "condition": "完成任意一场午后茶话会问答",
            "spoiler": False,
            "mo_caption": "照片里每个人手边都有一块方糖。只有我的那块是两块，因为艾丽丝又偷偷推过来一块。",
            "alice_caption": "茶话会合影三要点：红茶要冒热气，点心要摆满，侦探小姐要笑——今天三项全部达标！",
        },
        {
            "id": "ph03", "code": "P-03", "title": "辞典批注合影",
            "source": "批注辞典", "tab": "lexicon", "progress_key": "lexicon", "need": 1,
            "place": "放学后的教室 · 靠窗第三排", "cast": "艾丽丝 · 墨墨 · 陈默",
            "bg_thumb": "images/bg_classroom.png",
            "condition": "读过任意一条批注辞典公开词条",
            "spoiler": False,
            "mo_caption": "快门响的时候我还在页边写批注，铅笔尖只来得及停在半个字上。那半个字，后来被艾丽丝补成了一个笑脸。",
            "alice_caption": "一本辞典、三支铅笔、两块橡皮——推理社的学术气息，全都装进这一张照片啦！",
        },
        {
            "id": "ph04", "code": "P-04", "title": "旧书街修复合影",
            "source": "古籍修复台", "tab": "restoration", "progress_key": "restoration", "need": 1,
            "place": "旧书街 · 书店后间修复台", "cast": "艾丽丝 · 墨墨 · 陈默 · 书店老板",
            "bg_thumb": "images/bg_street.png",
            "condition": "修复任意一卷古典推理残卷",
            "spoiler": False,
            "mo_caption": "镊子、浆糊和一盏台灯。照片角落那一小团暖光，是台灯照在刚补好的书页上。",
            "alice_caption": "书店老板举着相机喊「笑一个」，结果我们三个同时说「嘘——」，生怕把残页吹跑！",
        },
        {
            "id": "ph05", "code": "P-05", "title": "春樱信笺合影",
            "source": "四季信笺匣", "tab": "letterbox", "progress_key": "letterbox", "need": 1,
            "place": "校门口 · 春樱坡道", "cast": "艾丽丝 · 墨墨 · 陈默",
            "bg_thumb": "images/bg_gate.png",
            "condition": "钤盖任意一枚四季信笺火漆印",
            "spoiler": False,
            "mo_caption": "樱花落在火漆印上，我没舍得拂掉。后来那封信寄出去的时候，花瓣还夹在里面。",
            "alice_caption": "春夏秋冬要各拍一张！这张是第一张——所以本社长决定，它永远是最好看的那张！",
        },
        {
            "id": "ph06", "code": "P-06", "title": "纸鹤陈列合影",
            "source": "千纸鹤陈列柜", "tab": "origami", "progress_key": "origami", "need": 1,
            "place": "教学楼走廊 · 窗台上的纸鹤", "cast": "艾丽丝 · 墨墨 · 陈默",
            "bg_thumb": "images/bg_corridor.png",
            "condition": "在千纸鹤陈列柜折检任意一式纸鹤",
            "spoiler": True,
            "mo_caption": "照片里的纸鹤排成一列，翅膀歪歪的那只站在最前面。它是我折的第一只，所以要排第一。",
            "alice_caption": "纸鹤还没折齐，合影必须先拍！本社长宣布：以后每多折一只，就在窗台前再拍一张！",
            "mo_caption_secret": "窗台正中，旧白鹤、粉樱鹤和我们一起折的第三只千纸鹤并肩站着。四年前的冬天，终于和现在拍进了同一张照片。",
            "alice_caption_secret": "照片洗出来那天，墨墨用很小很小的声音念了一遍每只纸鹤的名字。本社长假装没听见，其实偷偷记下来了！",
        },
        {
            "id": "ph07", "code": "P-07", "title": "暮色电波合影",
            "source": "旧广播电台", "tab": "radio", "progress_key": "radio", "need": 1,
            "place": "旧社团楼 · 广播站导播台", "cast": "艾丽丝 · 墨墨 · 陈默",
            "bg_thumb": "images/bg_oldbuilding.png",
            "condition": "解开任意一封旧广播电台听众来信",
            "spoiler": True,
            "mo_caption": "导播台的指示灯亮成一排，像一串小小的星星。我把耳机挂在脖子上，学艾丽丝比了一个收台的手势。",
            "alice_caption": "暮色点播台收台纪念！主播艾丽丝、导播陈默、编剧兼音效墨墨，全员到齐，零事故！",
            "mo_caption_secret": "这张是收台以后拍的。那天我对着真空管话筒亲口念完了收台词，所以照片里的我，笑得有点像刚哭过。",
            "alice_caption_secret": "墨墨开麦的那一轨母带和这张合照，本社长装进了同一个信封，封口写着：万事屋最高机密，永久保存！",
        },
        {
            "id": "ph08", "code": "P-08", "title": "钟楼观星合影",
            "source": "钟楼星象馆", "tab": "planetarium", "progress_key": "planetarium", "need": 1,
            "place": "旧钟楼 · 穹顶外的观测台", "cast": "艾丽丝 · 墨墨 · 陈默",
            "bg_thumb": "images/bg_rooftop.png",
            "condition": "破解任意一笺钟楼星图暗号",
            "spoiler": True,
            "mo_caption": "快门按下去的时候，星象仪刚好转到北斗。照片里我们三个的头顶上，都落着一小片碎银一样的光。",
            "alice_caption": "星空合影的秘诀：先数一二三，再一起抬头！结果陈默抬早了，只拍到一个下巴！",
            "mo_caption_secret": "拍这张之前，我在观测台上亲口说了那句谢谢，还说起了小可和四年前没去成的河堤。所以照片里另外两个人，眼睛都有点红。",
            "alice_caption_secret": "那对金蓝双星底下，本社长当场拍板：明年秋天再来钟楼，一定要把周可也拉进合照里！",
        },
        {
            "id": "ph09", "code": "P-09", "title": "铜章庆功合影",
            "source": "铜章手账册", "tab": "badges", "progress_key": "badges", "need": 1,
            "place": "街角关东煮小店 · 拓印庆功宴", "cast": "艾丽丝 · 墨墨 · 陈默",
            "bg_thumb": "images/bg_oden.png",
            "condition": "在铜章手账册拓印任意一枚铜章",
            "spoiler": False,
            "mo_caption": "拓完第一枚铜章，艾丽丝说要庆功。照片里的手账册摊在关东煮旁边，被热气熏得微微卷了边。",
            "alice_caption": "铜章拓印庆功宴！萝卜要两块，海带结要三个，手账册要摆正中——本社长的庆功仪式感一向满分！",
        },
        {
            "id": "ph10", "code": "P-10", "title": "闭馆夜书架合影",
            "source": "闭馆图书馆", "tab": "library", "progress_key": "library", "need": 1,
            "place": "图书馆三楼 · 合订本书库", "cast": "艾丽丝 · 墨墨 · 陈默 · 小林 · 王老师",
            "bg_thumb": "images/bg_storeroom.png",
            "condition": "解开闭馆图书馆消失书架之谜",
            "spoiler": False,
            "mo_caption": "王老师用返校日要用的拍立得给我们试机。照片里，两辆还书车上的一百八十册书，一册都没有少。",
            "alice_caption": "闭馆书架失踪案告破！合影里那个浑身湿透、还在比耶的人是王老师——本社长特此批准他入镜！",
        },
        {
            "id": "ph11", "code": "P-11", "title": "金书签再访合影",
            "source": "闭馆图书馆", "tab": "library", "progress_key": "library_gold", "need": 1,
            "place": "图书馆一楼 · 重新站满的 E-7 专架", "cast": "艾丽丝 · 墨墨 · 陈默 · 小林",
            "bg_thumb": "images/bg_library.png",
            "condition": "零失误复盘闭馆夜，获得金书签评级",
            "spoiler": False,
            "mo_caption": "这一次复盘闭馆夜，我们一个环节都没有选错。照片里我把金书签夹在笔记本封面上，露出小小的一角。",
            "alice_caption": "零失误！金书签！这张照片要冲两份，一份贴相册，一份贴在图书馆的布告栏上，让全校都看见！",
        },
        {
            "id": "ph12", "code": "P-12", "title": "侦探社全家福",
            "source": "合照相册", "tab": "album", "progress_key": "album", "need": 11,
            "place": "河堤 · 傍晚的长椅旁", "cast": "侦探社全员与一路帮过我们的人",
            "bg_thumb": "images/bg_riverside.png",
            "condition": "冲洗前十一张侦探社合照",
            "spoiler": True,
            "mo_caption": "相册翻到最后一页，我们终于拍了一张不为任何委托的合照。没有案子，没有暗号，只有夕阳和大家。",
            "alice_caption": "侦探社全家福！本社长、墨墨、陈默，再加上一路帮过我们的小林和王老师——相册最后一页，满员啦！",
            "mo_caption_secret": "全家福里多了一个人。周可站在我身边，肩膀挨着我的肩膀，就像很久以前那张三个人在笑的照片。拍完以后，我笑着对每个人说了一句：明天见。",
            "alice_caption_secret": "墨墨亲口喊茄子的那一刻，连快门声都被盖过去了！这张照片，本社长要放在相册的最后一页，也是第一页。",
        },
    ]

    _ALBUM_BY_ID = {p["id"]: p for p in ALBUM_PHOTOS}

    # progress_key -> 计数函数名；运行期按名字取函数，模块加载顺序互不依赖（只读各玩法公开计数，不读任何剧透文本）
    _ALBUM_PROGRESS_FNS = {
        "mailbox":      "mailbox_solved_count",
        "teaparty":     "tea_party_cleared_count",
        "restoration":  "restoration_completed_count",
        "letterbox":    "letterbox_seal_count",
        "origami":      "origami_inspected_count",
        "radio":        "radio_solved_count",
        "planetarium":  "planetarium_solved_count",
        "badges":       "badge_stamped_count",
        "library":      "library_case_solved_count",
        "library_gold": "library_gold_count",
    }

    ALBUM_SPOILER_NOTICE = "【防剧透火漆保护：这张合照背面的续笔涉终章旧约，通关 TRUE END 或点击右上角「解锁剧透」后自动显影】"

    def album_get_def(photo_id):
        return _ALBUM_BY_ID.get(photo_id, ALBUM_PHOTOS[0])

    def _ensure_album_store():
        if not isinstance(getattr(persistent, "photo_album_records", None), dict):
            persistent.photo_album_records = {}
        return persistent.photo_album_records

    def album_get_record(photo_id):
        pdef = album_get_def(photo_id)
        raw = _ensure_album_store().get(pdef["id"]) or {}
        return {
            "developed": bool(raw.get("developed", False)),
            "develop_count": int(raw.get("develop_count", 0) or 0),
            "viewed": bool(raw.get("viewed", False)),
        }

    def _album_lexicon_public_read():
        entries = globals().get("LEXICON_ENTRIES") or []
        is_read = globals().get("lexicon_is_read")
        if is_read is None:
            return 0
        return sum(1 for e in entries if not e.get("spoiler", False) and is_read(e["id"]))

    def album_progress(photo_id):
        """返回 (当前进度, 冲洗所需)；只读各玩法自身的公开计数。"""
        pdef = album_get_def(photo_id)
        key = pdef["progress_key"]
        if key == "album":
            others = [p for p in ALBUM_PHOTOS if p["id"] != pdef["id"]]
            return (sum(1 for p in others if album_get_record(p["id"])["developed"]), len(others))
        need = max(1, int(pdef["need"]))
        if key == "lexicon":
            cur = _album_lexicon_public_read()
        else:
            fn = globals().get(_ALBUM_PROGRESS_FNS.get(key, ""))
            try:
                cur = int(fn()) if fn is not None else 0
            except Exception:
                cur = 0
        return (max(0, min(cur, need)), need)

    def album_is_earned(photo_id):
        cur, need = album_progress(photo_id)
        return need > 0 and cur >= need

    def album_status(photo_id):
        if album_get_record(photo_id)["developed"]:
            return "developed"
        if album_is_earned(photo_id):
            return "earned"
        return "locked"

    def album_developed_count():
        return sum(1 for p in ALBUM_PHOTOS if album_get_record(p["id"])["developed"])

    def album_earned_count():
        return sum(1 for p in ALBUM_PHOTOS if album_status(p["id"]) != "locked")

    def album_select(photo_id):
        pdef = album_get_def(photo_id)
        persistent.album_selected_photo = pdef["id"]
        renpy.save_persistent()

    def album_develop(photo_id, open_modal=True):
        """冲洗一张已拍摄的合照；十二张全部冲洗后解锁 ach_photo_album。未拍摄时只给温柔提示。"""
        pdef = album_get_def(photo_id)
        pid = pdef["id"]
        persistent.album_selected_photo = pid
        if not album_is_earned(pid) and not album_get_record(pid)["developed"]:
            renpy.notify("这张合照还没有拍：先去完成「%s」的对应玩法吧" % pdef["source"])
            return None
        store_dict = dict(_ensure_album_store())
        prev = album_get_record(pid)
        updated = {
            "developed": True,
            "develop_count": prev["develop_count"] + 1,
            "viewed": True,
        }
        store_dict[pid] = updated
        persistent.photo_album_records = store_dict
        renpy.sound.play("audio/sfx_page.ogg")
        if album_developed_count() >= len(ALBUM_PHOTOS):
            ach_grant("ach_photo_album")
        renpy.save_persistent()
        if open_modal:
            renpy.show_screen("album_photo_modal", photo_id=pid)
        return updated

    def album_open_photo(photo_id):
        pdef = album_get_def(photo_id)
        persistent.album_selected_photo = pdef["id"]
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("album_photo_modal", photo_id=pdef["id"])

    def album_render_view(photo_id):
        """渲染合照与背面短评：未冲洗不显示短评；涉终章续笔只在 truth_spoiler_unlocked() 为真时出现。
        遮罩状态下的返回值与续笔文本完全无关（零侧信道：不暴露长度、有无或任何派生字段）。"""
        pdef = album_get_def(photo_id)
        rec = album_get_record(pdef["id"])
        cur, need = album_progress(pdef["id"])
        status = album_status(pdef["id"])
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        has_sp = bool(pdef.get("spoiler", False))
        developed = rec["developed"]
        show_secret = developed and has_sp and unlocked

        return {
            "id": pdef["id"],
            "code": pdef["code"],
            "title": pdef["title"],
            "source": pdef["source"],
            "tab": pdef["tab"],
            "place": pdef["place"],
            "cast": pdef["cast"],
            "bg_thumb": pdef["bg_thumb"],
            "condition": pdef["condition"],
            "progress_cur": cur,
            "progress_total": need,
            "status": status,
            "developed": developed,
            "develop_count": rec["develop_count"],
            "spoiler": has_sp,
            "unlocked": (unlocked if has_sp else True),
            "display_mo_caption": pdef["mo_caption"] if developed else "",
            "display_alice_caption": pdef["alice_caption"] if developed else "",
            "display_mo_secret": pdef.get("mo_caption_secret", "") if show_secret else "",
            "display_alice_secret": pdef.get("alice_caption_secret", "") if show_secret else "",
            "display_masked_notice": (ALBUM_SPOILER_NOTICE if (has_sp and not unlocked) else ""),
        }


################################################################################
## 三、鉴赏分页界面 A：闭馆图书馆消失书架之谜（screen extras_closed_library）
################################################################################

transform library_key_glint:
    subpixel True
    block:
        ease 1.6 alpha 0.74 zoom 0.96
        ease 1.6 alpha 1.0 zoom 1.0
        repeat

transform album_photo_float:
    subpixel True
    block:
        ease 2.2 yoffset -2
        ease 2.2 yoffset 0
        repeat

screen extras_closed_library():
    $ _lv = library_render_view()
    $ _lrec = library_get_record()
    $ _lhid = persistent.library_selected_hotspot or "h1"
    $ _lh = library_get_hotspot(_lhid)
    $ _lh_seen = (_lh["id"] in _lrec["inspected"])

    vbox:
        spacing 9

        ## 1. 闭馆图书馆总览横幅
        frame:
            style "library_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_closed_library.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("闭馆图书馆消失书架之谜") font gui.name_text_font size 19 color "#f6e7c0"
                        if _lv["solved"]:
                            text _("已结案 · 四环推理链全部闭合 · 可随时重返闭馆夜冲击金书签") size 12 color "#d8c8ee"
                        else:
                            text _("周五闭馆后，一整架校友文集凭空消失 · 六处现场等你勘查") size 12 color "#b9a6d4"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_library_key.png" xysize (14, 14) yalign 0.5
                            text ("最佳 %s" % _lv["best_name"]) size 12 color "#f4d98a" yalign 0.5
                    frame:
                        style "mailbox_stat_chip"
                        text ("结案 %d 次" % _lv["replays"]) size 12 color "#cbb0e6" align (0.5, 0.5)

        ## 2. 卷宗详情：现场缩略图、案情、六处勘查点、四环推理链与书签评级
        frame:
            style "library_console_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add LIBRARY_CASE["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add "images/ui/icon_closed_library.png" xysize (24, 24) xalign 0.05 yalign 0.08
                        if _lv["solved"]:
                            add "images/ui/icon_library_key.png" xysize (26, 26) xalign 0.96 yalign 0.08 at library_key_glint
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text LIBRARY_CASE["code"] size 12 color "#ffffff" bold True align (0.5, 0.5)
                            text ("《%s》" % LIBRARY_CASE["short_title"]) font gui.name_text_font size 17 color "#f6e7c0" yalign 0.5
                        text ("%s  ·  %s" % (LIBRARY_CASE["time_tag"], LIBRARY_CASE["companions"])) size 12 color "#cbb0e6" substitute False
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (15, 15) yalign 0.5
                            text ("馆内光影：%s" % LIBRARY_CASE["lighting_note"]) size 12 color "#a892c2" yalign 0.5 substitute False
                        if _lv["solved"]:
                            text ("结案档案：%s（已结案 %d 次 · 六处痕迹全勘查）" % (_lv["best_line"], _lv["replays"])) size 12 color "#f4d98a" substitute False
                        else:
                            text ("结案档案：尚未结案（已勘查 %d/6 处，可先翻看下方勘查点，再走进闭馆的图书馆）" % _lv["inspected_count"]) size 12 color "#8a7aa0"

                text LIBRARY_CASE["summary_pub"] size 13 color "#ebe2f8" line_spacing 3 substitute False

                ## 2A. 六处现场勘查点（3 × 226 + 2 × 8 = 694px 精确贴合内宽，两行）
                text _("现场勘查点 · 点击翻看六处痕迹（在闭馆夜里亲自勘查过的地方，会显影墨墨的现场手记）：") size 12 color "#f4d98a" bold True
                grid 3 2:
                    spacing 8
                    for h_obj in LIBRARY_HOTSPOTS:
                        $ _h_seen = (h_obj["id"] in _lrec["inspected"])
                        $ _h_active = (h_obj["id"] == _lh["id"])
                        button:
                            style "restoration_clue_card"
                            selected _h_active
                            action Function(library_select_hotspot, h_obj["id"])
                            vbox:
                                spacing 2
                                xfill True
                                hbox:
                                    xfill True
                                    yalign 0.5
                                    text ("%s · %s" % (h_obj["code"], h_obj["label"])) size 11 color ("#f4d98a" if _h_active else "#e2d4f4") bold True yalign 0.5 substitute False
                                    text (_("已勘查") if _h_seen else _("待勘查")) size 10 color ("#86efac" if _h_seen else "#8a7aa0") xalign 1.0 yalign 0.5
                                text h_obj["surface"] size 11 color "#b9a6d4" line_spacing 2 substitute False

                frame:
                    xfill True
                    padding (10, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        spacing 8
                        add "images/ui/icon_library_key.png" xysize (20, 20)
                        vbox:
                            spacing 2
                            text ("%s · %s" % (_lh["code"], _lh["label"])) size 12 color "#f4d98a" bold True substitute False
                            if _lh_seen:
                                text _lh["detail"] size 12 color "#fff1d0" line_spacing 2 substitute False
                            else:
                                text _("还没有在闭馆夜里勘查这一处。走进现场亲自看过之后，墨墨的现场手记会显影在这里。") size 12 color "#8a7aa0"

                ## 2B. 四环推理链（4 × 167 + 3 × 8 = 692px <= 694px）
                text _("推理链 · 四环复盘（去向 → 路径 → 动机 → 执行人，结案后显影）：") size 12 color "#f4d98a" bold True
                hbox:
                    spacing 8
                    for _ki, k_obj in enumerate(LIBRARY_CHAIN_LINKS):
                        frame:
                            style "library_chain_slot"
                            vbox:
                                spacing 2
                                text ("%s · %s" % (k_obj["step"], k_obj["name"])) size 11 color ("#86efac" if _lv["solved"] else "#cbb0e6") bold True
                                text (_lv["chain_shorts"][_ki] if _lv["solved"] else _("？ 待复盘")) size 12 color ("#fff1d0" if _lv["solved"] else "#7e6d99") substitute False

                ## 2C. 书签评级与结案报告预览匣
                frame:
                    style "library_scroll_card"
                    vbox:
                        spacing 5
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_library_key.png" xysize (16, 16) yalign 0.5
                                text _("书签评级 · 重玩挑战") font gui.name_text_font size 13 color "#fff1d0" yalign 0.5
                            text ("历史最佳：%s" % _lv["best_line"]) size 11 color "#f4d98a" xalign 1.0 yalign 0.5 substitute False
                        hbox:
                            spacing 8
                            for t_obj in LIBRARY_RATING_TIERS:
                                frame:
                                    style "library_tier_chip"
                                    hbox:
                                        xfill True
                                        yalign 0.5
                                        text ("%s「%s」" % (t_obj["name"], t_obj["title"])) size 12 color ("#f4d98a" if _lv["best_tier"] == t_obj["key"] else "#e2d4f4") yalign 0.5
                                        text t_obj["rule"] size 11 color "#a8c6b0" xalign 1.0 yalign 0.5
                        if _lv["solved"]:
                            add Solid("#f4d98a33") xfill True ysize 1
                            text _lv["display_solution"] size 12 color "#86efac" line_spacing 2 substitute False
                            text _lv["display_mo_note"] size 12 color "#cfa6f0" substitute False
                            text _lv["display_alice_note"] size 12 color "#f0c060" substitute False
                        else:
                            text _("结案报告：解开闭馆夜之谜后，墨墨会把完整的推理链与结案报告写在这里。") size 12 color "#8a7aa0"

                ## 2D. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("零失误复盘四环推理链可获金书签 · 已结案 %d 次" % _lv["replays"]) size 12 color "#9a86b8" yalign 0.5
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton _("展阅结案报告"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(library_open_report_modal)
                        textbutton (_("重返闭馆夜") if _lv["solved"] else _("推开图书馆的门")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action library_launch_action()

        ## 3. 合照相册直达条
        $ _ph10 = album_status("ph10")
        frame:
            style "mailbox_quick_row"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_club_photo.png" xysize (20, 20) yalign 0.5
                    text _("合照相册 · P-10 闭馆夜书架合影") font gui.name_text_font size 14 color "#f2e6ff" yalign 0.5
                    text ("（%s）" % ({"developed": "已冲洗", "earned": "可冲洗"}.get(_ph10, "结案后拍摄"))) size 12 color ("#86efac" if _ph10 != "locked" else "#7e6d99") yalign 0.5
                textbutton _("翻开相册"):
                    style "gramophone_mini_pill"
                    xalign 1.0
                    yalign 0.5
                    action [SetField(persistent, "album_selected_photo", "ph10"), SetField(persistent, "extras_tab", "album")]


## 闭馆夜结案报告独立展阅弹窗
screen library_report_modal():
    modal True
    zorder 215
    $ _mv = library_render_view()

    add "#080510dc"
    key "K_ESCAPE" action Hide("library_report_modal")
    key "K_RETURN" action Hide("library_report_modal")
    key "K_SPACE" action Hide("library_report_modal")

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
                    add "images/ui/icon_closed_library.png" xysize (40, 40) yalign 0.5
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_mv["code"], _mv["short_title"])) font gui.name_text_font size 20 color "#f6e7c0"
                        text _mv["time_tag"] size 12 color "#cbb0e6" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_library_key.png" xysize (30, 30) yalign 0.5 at library_key_glint
                    text _mv["best_name"] size 13 color "#f4d98a" bold True yalign 0.5

            add Solid("#f4d98a44") xfill True ysize 1

            viewport:
                xfill True
                ysize 336
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    text _("案情：") size 12 color "#f4d98a" bold True
                    text _mv["summary"] size 13 color "#ebe2f8" line_spacing 4 substitute False
                    add Solid("#cbb0e633") xfill True ysize 1
                    if _mv["solved"]:
                        text _("推理链四环：") size 12 color "#f4d98a" bold True
                        for _ri, r_obj in enumerate(LIBRARY_CHAIN_LINKS):
                            text ("%s · %s：%s" % (r_obj["step"], r_obj["name"], _mv["chain_fulls"][_ri])) size 13 color "#e2d4f4" line_spacing 3 substitute False
                        add Solid("#f4d98a33") xfill True ysize 1
                        text _mv["display_solution"] size 13 color "#86efac" line_spacing 4 substitute False
                        text _mv["display_mo_note"] size 13 color "#cfa6f0" line_spacing 4 substitute False
                        text _mv["display_alice_note"] size 13 color "#f0c060" line_spacing 4 substitute False
                    else:
                        text _("这桩案子还没有结案。走进闭馆的图书馆、勘查六处痕迹并扣上四环推理链后，完整的结案报告会显影在这里。") size 13 color "#9a86b8" line_spacing 4

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上结案报告") size 12 color "#9a86b8" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 10
                    textbutton _("重返闭馆夜"):
                        style "gramophone_mini_pill"
                        yalign 0.5
                        action [Hide("library_report_modal")] + library_launch_action()
                    textbutton _("合上报告"):
                        style "pill_button"
                        xminimum 116
                        ysize 34
                        text_size 14
                        action Hide("library_report_modal")


## 闭馆夜剧场内顶部推理链复盘横幅（位于右上角证物 HUD 下方，互不遮挡）
screen library_chain_banner(links_done, prompt_line):
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
                add "images/ui/icon_library_key.png" xysize (22, 22) yalign 0.5
                text _("闭馆夜 · 推理链复盘") size 12 color "#f4d98a" bold True yalign 0.5
                text ("已扣上 %d/%d 环 · 失误只计入本案书签评级，不影响主线" % (links_done, len(LIBRARY_CHAIN_LINKS))) size 11 color "#b9a6d4" yalign 0.5
            hbox:
                spacing 6
                for _bi, b_obj in enumerate(LIBRARY_CHAIN_LINKS):
                    frame:
                        style "library_banner_slot"
                        vbox:
                            spacing 0
                            text ("%s · %s" % (b_obj["step"], b_obj["name"])) size 10 color ("#86efac" if _bi < links_done else ("#f4d98a" if _bi == links_done else "#8a7aa0")) bold True
                            text (b_obj["short"] if _bi < links_done else _("？")) size 11 color ("#fff1d0" if _bi < links_done else "#7e6d99") substitute False
            text prompt_line size 14 color "#f6eeff" substitute False


## 闭馆夜结案结算卡：本局书签评级 + 历史最佳纪录 + 重玩挑战提示
screen library_result_card(cur_tier, best_tier, mistakes, best_mistakes, replays, new_record=False, is_first=True):
    modal True
    zorder 220
    $ _ct = library_tier_def(cur_tier)
    $ _bt = library_tier_def(best_tier)
    $ _rv = library_render_view()
    $ _is_gold = (cur_tier == "gold")

    add "#080510dc"
    key "K_RETURN" action Return("back_to_library")
    key "K_SPACE" action Return("back_to_library")
    key "K_ESCAPE" action Return("back_to_library")

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
                add "images/ui/icon_library_key.png" xysize (54, 54) yalign 0.5 at library_key_glint
                vbox:
                    spacing 3
                    yalign 0.5
                    text ("闭馆夜结案 · %s" % LIBRARY_CASE["code"]) size 13 color "#f4d98a" bold True
                    text ("《%s》" % LIBRARY_CASE["short_title"]) font gui.name_text_font size 21 color "#f6e7c0"
                    text ("本局评级：【%s · %s】" % (_ct["name"], _ct["title"])) size 14 color ("#f4d98a" if _is_gold else "#86efac")

            add Solid("#f4d98a33") xfill True ysize 1

            frame:
                xfill True
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 4
                    text _rv["display_mo_note"] size 13 color "#cfa6f0" substitute False
                    text _rv["display_alice_note"] size 13 color "#f0c060" substitute False
                    text ("本局失误 %d 次（只计入闭馆夜评级，不影响主线）" % mistakes) size 12 color "#b9a6d4"
                    text ("历史最佳：%s「%s」 · 最少失误 %d 次 · 累计结案 %d 次" % (_bt["name"], _bt["title"], best_mistakes, replays)) size 12 color "#b9a6d4"
                    if is_first:
                        text _("首次结案 · 推理链与结案报告已写入鉴赏室「闭馆图书馆」分页，P-10 合照可以冲洗了") size 12 color "#86efac"
                    elif new_record:
                        text _("重玩挑战 · 刷新个人纪录！这一局比以往任何一次都更少走弯路") size 12 color "#f4d98a"
                    elif _is_gold:
                        text _("重玩挑战 · 再次以金书签结案，闭馆夜名侦探实至名归") size 12 color "#f4d98a"
                    else:
                        text _("重玩挑战 · 零失误复盘四环推理链，就能把金书签夹进笔记本") size 12 color "#cbb0e6"

            textbutton _("收好书签并返回闭馆图书馆"):
                style "pill_button"
                xalign 0.5
                xminimum 248
                ysize 38
                text_size 15
                action Return("back_to_library")


################################################################################
## 四、鉴赏分页界面 B：侦探社合照回忆相册（screen extras_photo_album）
################################################################################

screen extras_photo_album():
    $ _psel = persistent.album_selected_photo or "ph01"
    $ _av = album_render_view(_psel)
    $ _dev_n = album_developed_count()
    $ _earn_n = album_earned_count()

    vbox:
        spacing 9

        ## 1. 牛皮纸相册总览横幅
        frame:
            style "album_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_photo_album.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("侦探社合照回忆相册") font gui.name_text_font size 19 color "#f6e7c0"
                        if persistent.te_cleared:
                            text _("TRUE END 已通关 · 十二张合照背面的续笔已全部显影。") size 12 color "#d8c8ee"
                        elif persistent.truth_spoiler_confirmed:
                            text _("已手动开启剧透许可 · 合照背面的真约续笔当前可见。") size 12 color "#f0a4b8"
                        else:
                            text _("收录鉴赏室每项玩法的合照 · 涉终章的背面续笔已由防剧透火漆保护。") size 12 color "#b9a6d4"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_club_photo.png" xysize (14, 14) yalign 0.5
                            text ("已冲洗 %d/%d" % (_dev_n, len(ALBUM_PHOTOS))) size 12 color "#f4d98a" yalign 0.5
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
                                            message=_("尚未通关 TRUE END，确定提前揭晓「合照相册」中涉终章旧约的背面续笔吗？"),
                                            yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                            no_action=Hide("confirm"))

        ## 2. 冲洗规则说明条（xsize 722 -> 内宽 702px 零溢出）
        frame:
            style "album_rule_bar"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 6
                    yalign 0.5
                    add "images/ui/icon_club_photo.png" xysize (16, 16) yalign 0.5
                    text ("可冲洗 %d · 已冲洗 %d · 首次完成对应玩法即可冲洗合照" % (_earn_n - _dev_n, _dev_n)) size 11 color "#e2d4f4" yalign 0.5
                text _("集齐十二张解锁成就「侦探社合照收藏家」") size 11 color "#cbb0e6" xalign 1.0 yalign 0.5

        ## 3. 拍立得照片墙（4 × 173 + 3 × 10 = 722px 严丝合缝）
        grid 4 ((len(ALBUM_PHOTOS) + 3) // 4):
            spacing 10
            for p_obj in ALBUM_PHOTOS:
                $ _pst = album_status(p_obj["id"])
                $ _pis = (p_obj["id"] == _av["id"])
                button:
                    style "album_photo_card"
                    selected _pis
                    action Function(album_select, p_obj["id"])
                    vbox:
                        spacing 3
                        xfill True
                        frame:
                            style "album_thumb_frame"
                            add p_obj["bg_thumb"]:
                                crop_relative True
                                crop (0.0, 0.18, 1.0, 0.636)
                                xysize (151, 54)
                                fit "contain"
                                align (0.5, 0.5)
                                alpha (1.0 if _pst == "developed" else (0.5 if _pst == "earned" else 0.16))
                            if _pst != "developed":
                                add "images/ui/icon_club_photo.png" xysize (26, 26) align (0.5, 0.5) alpha (0.92 if _pst == "earned" else 0.45)
                        hbox:
                            xfill True
                            yalign 0.5
                            text p_obj["code"] size 11 color ("#f4d98a" if _pis else "#d9c39e") bold True yalign 0.5
                            if _pst == "developed":
                                text _("已冲洗") size 10 color "#f4d98a" bold True xalign 1.0 yalign 0.5
                            elif _pst == "earned":
                                text _("可冲洗") size 10 color "#86efac" bold True xalign 1.0 yalign 0.5
                            else:
                                text _("未拍摄") size 10 color "#8a7aa0" xalign 1.0 yalign 0.5
                        text p_obj["title"] font gui.name_text_font size 13 color ("#fff1d0" if _pst != "locked" else "#a892c2")
            for _pad_i in range((4 - len(ALBUM_PHOTOS) % 4) % 4):
                null width 173 height 116

        ## 4. 选中合照的详情页：拍立得、拍摄信息、冲洗条件与双人背面短评
        frame:
            style "album_detail_card"
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
                            style "album_polaroid_frame"
                            add _av["bg_thumb"]:
                                crop_relative True
                                crop (0.0, 0.02, 1.0, 0.96)
                                xysize (172, 94)
                                fit "contain"
                                align (0.5, 0.5)
                                alpha (1.0 if _av["developed"] else (0.5 if _av["status"] == "earned" else 0.16))
                            if not _av["developed"]:
                                add "images/ui/icon_club_photo.png" xysize (40, 40) align (0.5, 0.5) alpha (0.92 if _av["status"] == "earned" else 0.45)
                        vbox:
                            spacing 3
                            xsize 380
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                frame:
                                    style "mailbox_code_badge"
                                    text _av["code"] size 11 color "#ffffff" bold True align (0.5, 0.5)
                                text ("《%s》" % _av["title"]) font gui.name_text_font size 18 color "#fff1d0" yalign 0.5
                            text ("拍摄地点：%s" % _av["place"]) size 12 color "#d9c39e" substitute False
                            text ("同框：%s" % _av["cast"]) size 12 color "#cbb0e6" substitute False
                            text ("冲洗条件：%s（当前 %d/%d）" % (_av["condition"], _av["progress_cur"], _av["progress_total"])) size 12 color "#a8c6b0" substitute False
                    frame:
                        style "mailbox_stat_chip"
                        xalign 1.0
                        yalign 0.5
                        if _av["developed"]:
                            text ("已冲洗 %d 次" % _av["develop_count"]) size 11 color "#f4d98a" align (0.5, 0.5)
                        elif _av["status"] == "earned":
                            text _("可以冲洗") size 11 color "#86efac" align (0.5, 0.5)
                        else:
                            text _("尚未拍摄") size 11 color "#9a86b8" align (0.5, 0.5)

                ## 4A. 墨墨铅笔字 & 艾丽丝贴纸批注（冲洗后显影）
                if _av["developed"]:
                    frame:
                        style "lexicon_mo_note_box"
                        vbox:
                            spacing 3
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_crane_bookmark.png" xysize (14, 14) yalign 0.5
                                text _("墨墨 · 相片背面的铅笔字") size 12 color "#cfa6f0" bold True yalign 0.5
                            text ("「%s」" % _av["display_mo_caption"]) size 12 color "#ebe2f8" line_spacing 3 substitute False
                            if _av["display_mo_secret"]:
                                text ("续笔：「%s」" % _av["display_mo_secret"]) size 12 color "#fff1d0" line_spacing 3 substitute False
                    frame:
                        style "lexicon_alice_note_box"
                        vbox:
                            spacing 3
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_club_photo.png" xysize (14, 14) yalign 0.5
                                text _("艾丽丝 · 相框边的贴纸批注") size 12 color "#f0c060" bold True yalign 0.5
                            text _av["display_alice_caption"] size 12 color "#fff1d0" line_spacing 3 substitute False
                            if _av["display_alice_secret"]:
                                text ("续笔：%s" % _av["display_alice_secret"]) size 12 color "#f4d98a" line_spacing 3 substitute False
                else:
                    frame:
                        xfill True
                        padding (11, 8)
                        background Frame("gui/hud_chip.png", 12, 12)
                        text _("冲洗这张合照后，相片背面会显影墨墨的铅笔字，相框边会出现艾丽丝贴上的小批注。") size 12 color "#b9a6d4" line_spacing 3
                if _av["display_masked_notice"]:
                    text _av["display_masked_notice"] size 11 color "#f0a4b8" substitute False

                ## 4B. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text _("每一张合照都对应鉴赏室里的一项玩法") size 12 color "#9a86b8" yalign 0.5
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        if _av["tab"] != "album":
                            textbutton ("前往%s" % _av["source"]):
                                style "gramophone_mini_pill"
                                yalign 0.5
                                action SetField(persistent, "extras_tab", _av["tab"])
                        if _av["developed"]:
                            textbutton _("展开相片"):
                                style "pill_button"
                                yalign 0.5
                                xminimum 146
                                ysize 36
                                text_size 15
                                action Function(album_open_photo, _av["id"])
                        else:
                            textbutton _("冲洗合照"):
                                style "pill_button"
                                yalign 0.5
                                xminimum 146
                                ysize 36
                                text_size 15
                                action (Function(album_develop, _av["id"], True) if _av["status"] == "earned" else None)


## 合照特写弹窗（冲洗完成 / 重新展开）
screen album_photo_modal(photo_id="ph01"):
    modal True
    zorder 218
    $ _jv = album_render_view(photo_id)

    add "#080510e0"
    key "K_ESCAPE" action Hide("album_photo_modal")
    key "K_RETURN" action Hide("album_photo_modal")
    key "K_SPACE" action Hide("album_photo_modal")

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
                    add "images/ui/icon_club_photo.png" xysize (40, 40) yalign 0.5 at album_photo_float
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_jv["code"], _jv["title"])) font gui.name_text_font size 20 color "#fff1d0"
                        text ("%s  |  %s" % (_jv["place"], _jv["source"])) size 12 color "#d9c39e" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_photo_album.png" xysize (28, 28) yalign 0.5
                    text ("已冲洗 %d/%d" % (album_developed_count(), len(ALBUM_PHOTOS))) size 13 color "#f4d98a" bold True yalign 0.5

            add Solid("#f4d98a44") xfill True ysize 1

            hbox:
                spacing 16
                frame:
                    style "album_polaroid_big"
                    vbox:
                        spacing 6
                        add _jv["bg_thumb"]:
                            xysize (280, 158)
                            fit "contain"
                            xalign 0.5
                            alpha (1.0 if _jv["developed"] else 0.18)
                        text ("%s · %s" % (_jv["code"], _jv["title"])) size 12 color "#5a4636" xalign 0.5
                viewport:
                    xsize 376
                    ysize 228
                    scrollbars "vertical"
                    mousewheel True
                    draggable True
                    vbox:
                        spacing 6
                        xsize 360
                        text ("同框：%s" % _jv["cast"]) size 12 color "#cbb0e6" substitute False
                        if _jv["developed"]:
                            text _("墨墨 · 相片背面的铅笔字：") size 12 color "#cfa6f0" bold True
                            text ("「%s」" % _jv["display_mo_caption"]) font gui.name_text_font size 14 color "#fff6dc" line_spacing 4 substitute False
                            if _jv["display_mo_secret"]:
                                text ("续笔：「%s」" % _jv["display_mo_secret"]) size 13 color "#fff1d0" line_spacing 4 substitute False
                            text ("艾丽丝 · 贴纸批注：%s" % _jv["display_alice_caption"]) size 13 color "#f0c060" line_spacing 3 substitute False
                            if _jv["display_alice_secret"]:
                                text ("续笔：%s" % _jv["display_alice_secret"]) size 13 color "#f4d98a" line_spacing 3 substitute False
                        else:
                            text _("这张合照还没有冲洗。完成对应玩法、在相册里冲洗之后，照片和背面的短评会在这里显影。") size 13 color "#9a86b8" line_spacing 4
                        if _jv["display_masked_notice"]:
                            text _jv["display_masked_notice"] size 12 color "#f0a4b8" substitute False

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上相册") size 12 color "#9a86b8" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 8
                    if _jv["spoiler"] and not persistent.te_cleared and not persistent.truth_spoiler_confirmed:
                        textbutton _("手动解锁剧透"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Show("confirm",
                                        message=_("尚未通关 TRUE END，确定提前揭晓这张合照背面涉终章旧约的续笔吗？"),
                                        yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                        no_action=Hide("confirm"))
                    textbutton _("合上相册"):
                        style "pill_button"
                        xminimum 138
                        ysize 34
                        text_size 14
                        action Hide("album_photo_modal")


################################################################################
## 五、样式定义（PC-10 闭馆图书馆、合照相册与沙龙分组子栏）
################################################################################

style library_header_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style library_console_card is default:
    xfill True
    padding (14, 11)
    background Frame("gui/panel_card.png", 16, 16)

style library_scroll_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style library_chain_slot is default:
    xsize 167
    ysize 52
    padding (8, 6)
    background Frame("gui/hud_chip.png", 12, 12)

style library_banner_slot is default:
    xsize 176
    ysize 40
    padding (8, 4)
    background Frame("gui/panel_card.png", 16, 16)

style library_tier_chip is default:
    xsize 218
    ysize 30
    padding (8, 0)
    background Frame("gui/panel_card.png", 16, 16)

style album_header_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style album_rule_bar is default:
    xfill True
    ysize 30
    padding (10, 4)
    background Frame("gui/hud_chip.png", 12, 12)

style album_photo_card is button:
    xsize 173
    ysize 116
    padding (9, 7)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style album_thumb_frame is default:
    xsize 155
    ysize 58
    padding (2, 2)
    background "#efe4cc"

style album_detail_card is default:
    xfill True
    padding (14, 11)
    background Frame("gui/panel_card.png", 16, 16)

style album_polaroid_frame is default:
    xsize 184
    ysize 116
    padding (6, 6, 6, 16)
    background "#efe4cc"

style album_polaroid_big is default:
    xsize 300
    ysize 196
    padding (10, 10, 10, 8)
    background "#efe4cc"

## 沙龙分组子栏：收拢状态下的组签（比展开的等宽短签略暗一档，提示「点击展开」）
style salon_group_pill is bookstreet_subtab_pill:
    xminimum 66

style salon_group_pill_text is bookstreet_subtab_pill_text:
    idle_color "#a892c2"


################################################################################
## 六、闭馆夜剧场独立沙盒初始化与结案出口（零侵入主线好感/失误/存档）
################################################################################

label _library_init_sandbox(session_save_title):
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

label _library_finish_case(local_mistakes=0):
    $ _lb_final_mistakes = max(0, int(local_mistakes or 0))
    $ _lb_rec = library_record_solve(_lb_final_mistakes)
    hide screen library_chain_banner
    hide screen evidence_book
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen library_result_card(_lb_rec["last_tier"], _lb_rec["best_tier"], _lb_final_mistakes, _lb_rec["best_mistakes"], _lb_rec["replays"], _lb_rec["new_record"], _lb_rec["is_first"])
    $ persistent.extras_tab = "library"
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 七、闭馆图书馆 L-01：《消失的校友文集专架》
################################################################################

label closed_library_case:
    call _library_init_sandbox("闭馆图书馆 · L-01 消失的校友文集专架")
    $ _lb_mistakes = 0
    $ _lb_links = 0
    $ _lb_h1 = False
    $ _lb_h2 = False
    $ _lb_h3 = False
    $ _lb_h4 = False
    $ _lb_h5 = False
    $ _lb_h6 = False
    $ _lb_replays = library_get_record()["replays"]
    $ _lb_best_text = library_render_view()["best_line"]

    scene bg black with fade
    $ play_bgm(bgm_suspense, fadein=1.5)
    centered "{size=+6}闭馆图书馆 · CLOSED LIBRARY L-01{/size}\n\n{size=+14}消失的校友文集专架{/size}\n\n{color=#f4d98a}周五 18:40 · 一楼开架阅览室 · 闭馆后的一整架书{/color}"

    scene bg clubroom at bg_kenburns_out
    $ set_ambient("rain")
    with dissolve

    play sound se_rain
    "周五傍晚六点二十五分，窗外的雨越下越密。社团活动室里，艾丽丝正把明天校友返校日要发的导览手册叠成整整齐齐的一摞。"
    "桌上的手机忽然震了起来，屏幕上跳着四个字：图书馆小林。"
    show alice shock at left
    show mo think at right
    alice "喂？小林？……什么，一整架书？你、你先别慌，站在原地别动，我们马上到！"
    alice "搭档，墨墨，出大事了！图书馆闭馆以后，东墙那一整架校友文集——六层、一百八十册——全部不见了！"
    mc "一百八十册？少说也有八九十公斤。谁能在闭馆以后，把一整架书搬得无影无踪？"
    play sound se_write
    "墨墨已经把牛皮纸笔记本塞进了帆布包，又从抽屉里摸出两支小手电，一支递给我，一支递给艾丽丝。"
    mo_note "带上手电。闭馆以后，阅览室只亮应急灯。"

    scene bg library at bg_kenburns_in
    $ set_ambient("night")
    show screen evidence_book
    with dissolve

    play sound se_footstep
    "图书馆一楼的开架阅览室只亮着几盏应急灯，一排排书架在昏暗里拉出长长的影子。雨点敲着高窗，屋子里静得能听见挂钟的秒针。"
    show lin sad at center
    lin "你们来了……就是这里，东墙的 E-7，校友文集专架。"
    "她的手电照着一架六层的樟木书架。每一层都空空荡荡，只剩几只铁书立靠在左端。左右两边的 E-6、E-8 都被透明塑料布盖着，夹在中间的 E-7，像一排忽然掉光了的牙齿。"
    lin "五点二十五分我巡架的时候还拍过照，一册都不少。五点半闭馆，五点三十二分我刷卡锁了正门。六点二十分我回来拿落下的登记本，一开灯……就成了这样。"
    lin "明天上午九点，校友返校日的参观路线就从这架书前面经过。里面好多是校友们当年亲手写的文集和校刊合订本，全校只有这一份……"
    show alice think at left
    alice "别急别急。书又不会自己长腿跑掉——只要是人做的事，就一定会留下痕迹。万事屋这就开始勘查现场！"
    show mo neutral at right
    play sound se_write
    mo_note "书架、头顶、门口、地面，还有借阅台后面的办公室。一处一处看，不要漏掉。"

label library_case_investigate:
    if _lb_h1 and _lb_h2 and _lb_h3 and _lb_h4 and _lb_h5 and _lb_h6:
        jump library_case_review_intro

    menu:
        "闭馆后的图书馆里只听得见雨声。先从哪一处勘查？（可随时点击右上角【证据】翻面查看批注）"

        "凑近空荡荡的 E-7 专架，查看书板与侧板上的巡架卡" if not _lb_h1:
            $ _lb_h1 = True
            scene bg library
            $ set_ambient("night")
            show alice think at left
            show mo think at right
            with dissolve
            play sound se_page
            "我把手电贴着书板照过去。每一层木板上都留着一道浅浅的灰线，灰线以内干干净净——这架书是今天才被整架移走的，连灰都还没来得及落下。"
            "书立没有东倒西歪，而是整整齐齐地并排靠在每层的最左端，像是有人特意给它们排好了队。"
            "侧板上用夹子夹着一张硬纸巡架卡。墨墨把它轻轻翻过来，手电光下，最后两行字一新一旧。"
            show lin think at center
            lin "这是我们巡架用的卡，每次清点完打一个勾。『17:25 林 √』是我写的……可下面这一行红笔字，不是我写的。"
            "卡片最下方，多出一行潦草的红色字迹：『17:58 移』。"
            show alice shock at left
            alice "移？偷书的人还会给自己写一笔作案记录吗？这也太老实了吧！"
            show mo smile at right
            play sound se_write
            mo_note "书立被排得整整齐齐，卡上还记了时间。拿走这些书的人，一点也不慌。"
            $ library_inspect_hotspot("h1")
            jump library_case_investigate

        "抬头检查 E-7 正上方的天花板，和地毯上那只红水桶" if not _lb_h2:
            $ _lb_h2 = True
            scene bg library
            $ set_ambient("rain")
            show alice shock at left
            show mo think at right
            with dissolve
            play sound se_rain
            "顺着一声轻轻的『嗒』，我把手电往上一抬——E-7 正上方的一块矿棉板晕开了一大圈褐色水渍，边缘还在一点点往外渗。"
            "水渍底下的地毯湿了一片，正中摆着一只红色塑料桶，桶身印着『总务处』三个白字，桶底已经积了薄薄一层雨水。"
            alice "漏水了！可是……这只桶是谁摆的？小林，是你吗？"
            show lin shock at center
            lin "不、不是我！我回来的时候，它就已经在这儿了。"
            "左右两架 E-6 和 E-8 被透明塑料布盖得严严实实，四个角都压着厚厚的辞典，布面上滚着几颗亮晶晶的水珠。"
            mc "E-6、E-8 盖了布，E-7 却被搬空了……因为只有 E-7，正好在漏点的正下方。"
            show mo smile at right
            play sound se_write
            mo_note "先摆好接水的桶，再给两边盖布。做这些事的人，比我们更早知道这里会漏雨。"
            $ library_inspect_hotspot("h2")
            jump library_case_investigate

        "回到正门，翻看刷卡面板的开关记录与磁条防盗门" if not _lb_h3:
            $ _lb_h3 = True
            scene bg library
            $ set_ambient("night")
            show alice think at left
            show lin neutral at center
            with dissolve
            play sound se_footstep
            "正门的刷卡面板亮着幽幽的蓝光。艾丽丝按了两下翻页键，把今天傍晚的开关记录调了出来。"
            alice "十七点三十二分，小林的卡，落锁；十八点二十分，还是小林的卡，开锁。中间……一条记录都没有！"
            mc "防盗门呢？"
            lin "每一册馆藏的书脊里都贴着磁条。哪怕只带一册出门，这两扇门都会响个不停。我回来的时候，警报灯一直是绿的。"
            show alice smile at left
            alice "那窗户呢？总不会有人把书一本一本从窗口递出去吧？"
            lin "一楼的窗子全都装着防盗栏，缝隙连一本小开本都塞不过去。"
            show mo neutral at right
            play sound se_write
            mo_note "正门没开过，窗子也出不去。那就先别问书是怎么出去的——先问它们到底有没有出去。"
            $ library_inspect_hotspot("h3")
            jump library_case_investigate

        "检查借阅台旁空着的还书车车位，和地上的痕迹" if not _lb_h4:
            $ _lb_h4 = True
            scene bg library
            $ set_ambient("night")
            show lin think at center
            show mo think at right
            with dissolve
            "借阅台旁的地胶上贴着两个黄色车位框，框里分别印着『还书车 1』『还书车 2』——此刻，两个框都是空的。"
            lin "两辆还书车每天都停在这里的，下午我还推着它上过架……"
            play sound se_footstep
            "我蹲下来，把手电压低，贴着地面一扫。两道并排的湿轮印从 E-7 下方那片潮湿的地毯出发，压过地胶，拐了个弯，一直延伸到借阅台后面那扇办公室的门口。"
            play sound se_write
            mo_note "轮子是先碾过漏水的地毯，才去的办公室。转弯的地方轮印压得特别深，车上装得很沉。"
            show alice shock at left
            alice "六层书，两辆车……搬书的人，用的是还书车！"
            mc "而且还书车上不了楼梯，也不会凭空飞走。它们最后停在了哪里，跟着轮印走就知道。"
            $ library_inspect_hotspot("h4")
            jump library_case_investigate

        "跟着轮印走进办公室，查看墙角的传书梯" if not _lb_h5:
            $ _lb_h5 = True
            scene bg library_office
            $ set_ambient("cool")
            show alice think at left
            show lin neutral at center
            with dissolve
            play sound se_door
            "管理员办公室开着一盏冷白的台灯。湿轮印一路穿过地胶，在墙角一扇小铁门前戛然而止。"
            "铁门上贴着褪了色的红字：『传书梯 · 限载 150 公斤 · 严禁乘人 · 钥匙开关』。门框上方的楼层指示灯，安安静静地亮在『3』上。"
            lin "这是连到三楼合订本书库的传书梯，轿厢刚好推得进一辆还书车。不过开它要用钥匙，我们学生馆员是不能碰的。"
            mc "指示灯停在三楼。它最后一次，是往上走的。"
            play sound se_page
            show mo think at right
            "墙上挂着一块点检记录板。墨墨踮起脚，用手电照着最后一栏，又低头看了看铁门旁那只小小的机械计次器。"
            mo_note "闭馆点检写着：17:00，计次 0396，停一楼。现在计次器是 0399。闭馆以后，它一共只走了三次。"
            show alice shock at left
            alice "三次？从一楼出发，最后停在三楼……那就是上去、下来、再上去？"
            "旁边那扇通往行政楼走廊的侧门紧闭着。门口的棕色地垫上，只有一行湿漉漉的鞋印，鞋尖统统朝外——没有一道轮印。"
            $ library_inspect_hotspot("h5")
            jump library_case_investigate

        "查看王老师的办公桌与墙上的钥匙挂板" if not _lb_h6:
            $ _lb_h6 = True
            scene bg library_office
            $ set_ambient("warm")
            show alice think at left
            show lin think at center
            with dissolve
            "王老师的办公桌收拾得一丝不苟，只有正中压着一张刚打印出来的通知，纸角还带着打印机的余温。"
            play sound se_page
            alice "『总务处紧急通知，十七点四十分，致图书馆王老师：今夜十九时起有暴雨，图书馆东侧屋面排水沟堵塞，一楼东侧可能渗漏，地漏可能倒灌，请将贵重纸质资料移至高处。维修班明早七点到场。』"
            show lin shock at center
            lin "十七点四十……那时候我已经锁门走了。"
            "桌后的墙上挂着一块钥匙挂板，每个挂钩下都贴着标签：『正门备用』『侧门』『传书梯』。只有『正门备用』那把还挂着，另外两个挂钩空空的。"
            "挂板旁边夹着一本钥匙领用簿，扉页上用红笔写着一行规定：『传书梯钥匙仅限王老师、总务处领用；学生馆员不得操作。』"
            show mo think at right
            play sound se_write
            mo_note "扉页上的红笔字，和巡架卡上那个『移』字，是同一支笔、同一种写法。"
            show alice shock at left
            alice "笔筒里插着的这支红墨水钢笔……笔尖还是湿的！"
            $ library_inspect_hotspot("h6")
            jump library_case_investigate

label library_case_review_intro:
    scene bg library
    $ set_ambient("night")
    $ play_bgm(bgm_mystery, fadein=1.2, fadeout=0.8)
    show alice smile at left
    show mo neutral at right
    with dissolve

    "六处现场全部勘查完毕。我们回到空荡荡的 E-7 前，雨点一阵紧过一阵地敲着高窗。"
    alice "六块拼图都在手里了！去找那一百八十册书之前，先把推理链从头到尾扣一遍——一环扣错，满盘皆输！"
    if _lb_replays > 0:
        sysmsg "【闭馆夜 · 重玩挑战】当前历史最佳：[_lb_best_text]。零失误扣上四环推理链，就能把金书签夹进笔记本。"
    else:
        sysmsg "【闭馆夜 · 推理链复盘】依次选出「去向 → 路径 → 动机 → 执行人」四个环节。零失误可获金书签，失误只计入本案评级，不影响主线。"

label library_chain_k1:
    show screen library_chain_banner(0, "第一环 · 去向：正门没开过、防盗门没响——一百八十册书，现在在哪里？")
    menu:
        "被人从正门运了出去——防盗门恰好出了故障，没有报警":
            hide screen library_chain_banner
            $ _lb_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "可门禁记录在十七点三十二分到十八点二十分之间，连一次开锁都没有呀。防盗门坏了，锁总不会也跟着一起坏吧？"
            play sound se_write
            mo_note "先别想书是怎么出去的。想想它们到底有没有出去。"
            jump library_chain_k1

        "塞进了左右相邻的 E-6、E-8，再用塑料布遮住":
            hide screen library_chain_banner
            $ _lb_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "我掀开塑料布看过啦，E-6、E-8 本来就摆得满满当当，连一册多余的都塞不进去。"
            play sound se_write
            mo_note "一百八十册，差不多是两辆还书车那么多。藏在别的架子上，一眼就能看出来。"
            jump library_chain_k1

        "从未离开图书馆——被两辆还书车推进了借阅台后面的办公室":
            hide screen library_chain_banner
            play sound se_correct
            $ _lb_links = 1

    mc "正门没开过，窗子出不去，两边的书架也塞不下。一百八十册书根本没有出门——湿轮印把它们带进了办公室。"

label library_chain_k2:
    show screen library_chain_banner(1, "第二环 · 路径：轮印在传书梯门口中断，计次器多了三次——书是怎么离开办公室的？")
    menu:
        "推出了办公室的侧门，送进隔壁的行政楼":
            hide screen library_chain_banner
            $ _lb_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "侧门的地垫上只有一行朝外的鞋印，一道轮印都没有哦。车子要是从那儿出去，地垫早就被碾湿了。"
            play sound se_write
            mo_note "轮印停在哪里，车就停在哪里。再看看那扇小铁门。"
            jump library_chain_k2

        "装上传书梯分两趟送上三楼——上、下、上，正好三次单程":
            hide screen library_chain_banner
            play sound se_correct
            $ _lb_links = 2

        "沿着楼梯，一摞一摞抱上了三楼":
            hide screen library_chain_banner
            $ _lb_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "那两辆还书车又去哪儿了呢？车子可上不了楼梯呀。而且湿轮印明明停在传书梯门口。"
            play sound se_write
            mo_note "闭馆点检时轿厢停在一楼，最后停在三楼，中间一共走了三次。数一数，是哪三次。"
            jump library_chain_k2

    mc "闭馆点检时传书梯停在一楼，现在停在三楼，计次器只多了三次——只能是上去、下来、再上去。两趟满载，正好对上两辆不见了的还书车。"

label library_chain_k3:
    show screen library_chain_banner(2, "第三环 · 动机：漏点、红水桶、盖好的塑料布——为什么偏偏只搬走 E-7？")
    menu:
        "为了躲开今晚的暴雨渗漏和地漏倒灌，把正对漏点的整架孤本移到最高、最干的地方":
            hide screen library_chain_banner
            play sound se_correct
            $ _lb_links = 3

        "校友文集里夹着值钱的手稿，有人想趁闭馆偷去卖":
            hide screen library_chain_banner
            $ _lb_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "想偷书的人，会先替左右两架盖好塑料布、再摆一只接水的桶吗？还在巡架卡上老老实实写一个『移』字？"
            play sound se_write
            mo_note "看看这个人还做了什么。他做的每一件事，都是在挡雨。"
            jump library_chain_k3

        "有人想让明天的校友返校日出洋相，故意把专架搬空":
            hide screen library_chain_banner
            $ _lb_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "要是真想捣乱，把书留在漏雨的地方泡一夜，不是更省事吗？可这个人偏偏把书从漏点底下救走了。"
            play sound se_write
            mo_note "通知里写着：贵重纸质资料，移至高处。"
            jump library_chain_k3

    mc "漏点正对 E-7，左右两架盖好了布，通知又说一楼地漏可能倒灌。这不是偷，也不是捣乱——是有人在暴雨来之前，把这一整架独一无二的书，送到了全馆最高、最干的地方。"

label library_chain_k4:
    show screen library_chain_banner(3, "第四环 · 执行人：通知、钥匙、红笔字——是谁在闭馆后搬走了 E-7？")
    menu:
        "总务处的维修师傅——传书梯钥匙总务处也能领":
            hide screen library_chain_banner
            $ _lb_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "通知上写着，维修班明早七点才到场呀。再说，巡架卡上那个红笔『移』字，又是谁的笔迹呢？"
            play sound se_write
            mo_note "通知是发给谁的？红笔又插在谁的笔筒里？"
            jump library_chain_k4

        "趁闭馆偷偷溜进来的学生":
            hide screen library_chain_banner
            $ _lb_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "正门没人进出，侧门要钥匙，传书梯学生不能碰——三道门，一道都打不开呀。"
            play sound se_write
            mo_note "能同时打开侧门和传书梯的人，钥匙板上写得很清楚。"
            jump library_chain_k4

        "王老师——收到暴雨通知、握着侧门与传书梯钥匙、用红笔写下那个「移」字的人":
            hide screen library_chain_banner
            play sound se_correct
            $ _lb_links = 4
            show screen deduction_cutin(headline=_("推理链闭合 ——！"), subline="CHAIN OF CUSTODY")
            with flash_shutter

    mc "暴雨通知发给了王老师，侧门和传书梯的钥匙只有他能领，巡架卡上的红笔字和领用簿扉页出自同一支笔。"
    mc "是王老师从行政楼的侧门赶回来，摆好水桶、盖好塑料布，在巡架卡上写下『移』，再把整架书装上还书车，用传书梯送上了三楼。"
    show alice happy at left
    alice "四环全部扣上！侦探团，出发——目标，三楼书库！"

label library_case_resolution:
    scene bg storeroom at bg_kenburns_in
    $ set_ambient("cool")
    $ play_bgm(bgm_warm, fadein=1.5, fadeout=1.0)
    show alice happy at left
    show lin smile at center
    with dissolve

    play sound se_door
    "小林用值班卡刷开三楼合订本书库的楼梯门。我们穿过一排排沉睡的合订本，在书库最里面、传书梯的铁门前，看见了它们。"
    "两辆还书车并排停着，上面罩着一层透明塑料布。一百八十册校友文集按层码得整整齐齐，每一层的开头都夹着一张小纸条：『E7-1』『E7-2』……一直到『E7-6』。"
    lin "一册……一册都没少！连上架的顺序都没乱！"
    show alice smile at left
    alice "看吧，本社长就说书不会自己长腿跑掉。它们只是坐着电梯，上楼躲雨来了！"

    play sound se_footstep
    "楼梯口忽然传来急促的脚步声。一个浑身湿透的人影抱着一卷防水布和一台除湿机，气喘吁吁地出现在门口。"
    hide lin
    show wang shock at center
    wang "谁、谁在书库里？！……小林？还有万事屋的你们——这么晚了，怎么全跑到三楼来了？"
    show alice happy at left
    alice "王老师，您来得正好！万事屋刚刚破了一桩『闭馆书架失踪案』——"
    mc "犯人就是您，王老师。"
    show wang think at center
    wang "……哈？"
    "我把巡架卡、红水桶、门禁记录、湿轮印、传书梯的计次器和那张暴雨通知，一样一样摆到他面前。王老师听着听着，脸一点一点红了起来。"
    show wang blush at center
    wang "咳……全中。五点四十总务处的通知打到办公室，我从行政楼那边赶过来一看，E-7 头顶已经开始滴水了。"
    wang "两边的架子盖块塑料布还能顶一晚，可 E-7 正对着漏点，底下两层又贴着地，通知里还说地漏可能倒灌。那一架全是校友们当年亲手写的文集，一册泡了水，就再也找不回来了。"
    wang "我想着先移上三楼，明早七点维修班到了，再和小林一起搬回去。谁知道刚去总务处借防水布的工夫，小林就回来了……我在巡架卡上写了个『移』字，还以为够清楚了。"
    show lin happy at right
    lin "一个字……王老师，您下次能不能多写几个字呀！我刚才差点就哭出来了。"
    show wang happy at center
    wang "是是是，下次一定写全——『王某移书至三楼避雨，切勿报警』！"
    show alice happy at left
    alice "噗——上一回是王老师冤枉别人，这一回总算轮到王老师自己被万事屋人赃并获啦！"
    wang "好好好，我认罪，我认罪。……不过说真的，你们是怎么一路摸到传书梯的？"

    hide lin
    show mo smile at right
    play sound se_write
    "墨墨没有回答，只是在笔记本上写了一行字，轻轻举到王老师面前。"
    mo_note "书没有消失。它们只是被一个很在乎它们的人，抱到了离雨最远的地方。"
    show wang smile at center
    wang "……你这孩子。"
    "王老师摘下湿漉漉的眼镜擦了擦，又从帆布包里掏出一台崭新的拍立得。"
    wang "明天返校日要用的，正好给你们试试机。来，趁书都在，站到还书车旁边去。"
    show alice happy at left
    alice "等一下！王老师也要入镜！犯人和侦探的合影，这可是万事屋的传统！"
    play sound se_click
    "闪光灯一亮。两辆还书车、一百八十册校友文集、三个侦探、一位小馆员和一位浑身湿透的老师，一起被收进了一张小小的相纸里。"
    play sound se_bell
    "第二天早上七点，雨停了。E-7 专架重新站满，每一层都按纸条上的顺序归了位。九点，第一批返校的校友沿着参观路线走过来，在一本泛黄的校刊合订本前停住了脚步。"
    play sound se_crane
    "墨墨把那张还带着一点潮气的合照夹进了笔记本。照片的角落里，王老师的头发还在滴水，却笑得比谁都开心。"

    call _library_finish_case(_lb_mistakes)
    return
