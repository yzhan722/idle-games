## 《沉默侦探：千纸鹤的约定》—— PC-14 文化祭鬼屋的第七个影子与鉴赏室「案卷」入口整合
## zoetrope_shadow_folio.rpy
##
## 设计要点：
##   1. 100% 零侵入主线剧情（script.rpy / chapter1..6.rpy / interlude.rpy / definitions.rpy / autoplay.rpy 零改动），
##      PC-10..PC-13 的短案、纪念与复盘本模块同样零改动。
##   2. 「文化祭鬼屋的第七个影子」（screen extras_haunted_house + 可重玩短案 label haunted_house_case）：
##      文化祭第一天，高一(1)班的鬼屋「影子回廊」——十二米白幕布后，六个同学各守一盏落地台灯——
##      被游客报告幕布尽头多出了第七个影子；德育处黄老师限时四点前讲清楚，否则关门。
##      六处勘查点（影子排班表、粉色儿童票根、后门窗上的黑卡纸、走廊红纸屑、出口留言卡、游客照片），
##      推理链是「四盏灯」：光源 → 投影 → 时机 → 掌灯人。每盏三选一、各配一种灯色，选错只给温柔提示、
##      只计入本地 _hh_mistakes，绝不触碰主线 fail_count / 好感；结案按失误数评定金 / 银 / 铜牌并保存历史最佳纪录，
##      可无限重玩刷新纪录，持久化于 persistent.haunted_house_record。
##      真相完全写实（冷白小手电、竹签剪纸、只能从走廊掀开的小窗、只给带孩子的游客亮起），没有任何超自然要素。
##   3. 防剧透联动：墨墨在本案页边的续批涉终章旧约，严格经 truth_spoiler_unlocked() 零侧信道遮罩，
##      与复盘本、合照相册等共用同一个「解锁剧透 / 恢复遮罩」开关；「案卷」里的后日谈标题受同一开关封存。
##   4. 鉴赏室入口整合（screens.rpy 的 extras_folio_modal + extra.rpy 的 folio_* / casefile_* 只读函数）：
##      主菜单的番外类胶囊合并为一枚分组入口；PC-G2 起这个入口改名「案卷」，收齐八桩可重玩短案与两篇番外。
##   5. 本文件按文件名排在 zephyr_relay_casebook.rpy 之后初始化，双成就追加在 PC-13 之后，成就页扩展为 2×17 = 34 枚。

# —— PC-14 文化祭鬼屋与案卷 UI 图标命名别名（128x128 RGBA 透明底）——
image ui_icon_haunted_house  = "images/ui/icon_haunted_house.png"
image ui_icon_seventh_shadow = "images/ui/icon_seventh_shadow.png"
image ui_icon_flashlight     = "images/ui/icon_flashlight.png"
image ui_icon_festival_ticket = "images/ui/icon_festival_ticket.png"
image ui_icon_extras_folio   = "images/ui/icon_extras_folio.png"

# —— PC-14 新登场的角色（暂无立绘：说话时舞台上的立绘自动恢复常亮，与警察、主持人等无立绘角色同一套规则）——
define ningyou = Character("宁柚", color="#f2b48a", who_outlines=[(1, "#000")])
define lele = Character("乐乐", color="#ffc8a8", who_outlines=[(1, "#000")])

init python:

    # 动态注册 PC-14 双成就，使鉴赏室成就页扩展为 2×17（共 34 枚）严整偶数列对称排布
    if "register_extra_achievement" in globals():
        register_extra_achievement(
            "ach_haunted_house",
            "鬼屋里的掌灯人",
            "解开文化祭鬼屋第七个影子之谜。",
            False,
        )
        register_extra_achievement(
            "ach_seventh_shadow",
            "金灯笼的影子侦探",
            "零失误点亮四盏灯，拿下金牌。",
            False,
        )

    ############################################################################
    ## 一、文化祭鬼屋的第七个影子（1 桩可重玩短案 · 6 处勘查点 · 四盏灯 · 金银铜牌评级）
    ############################################################################

    HAUNTED_CASE = {
        "id": "hh1",
        "code": "HH-01",
        "label": "haunted_house_case",
        "title": "文化祭鬼屋的第七个影子",
        "short_title": "提灯笼的第七个影子",
        "time_tag": "周六 14:50 · 高一(1)班 · 文化祭第一天",
        "companions": "艾丽丝 · 墨墨 · 林思思 · 小林",
        "bg_key": "classroom",
        "bg_thumb": "images/bg_classroom.png",
        "lighting_note": "暗场台灯 → 走廊日光 → 天台夕照（classroom / corridor / rooftop）",
        "spoiler": False,
        "summary_pub": (
            "文化祭第一天，高一(1)班的鬼屋「影子回廊」排起了长队：一道十二米长的白幕布后面，六个同学各守一盏落地台灯，"
            "把长发女鬼、无头书生、黑猫……六个影子打在幕布上。可从上午起，陆续有游客说幕布尽头多出了第七个影子——"
            "小小的一个，就站在出口旁边；掀开幕布，那里只有一堆课桌。德育处的黄老师下了通牒：暗房里多出一个不在排班表上的人太危险，"
            "四点前讲不清第七个影子从哪来，鬼屋就关门。"
        ),
        "solution_pub": (
            "结案报告：第七个影子没有鬼，幕布后面也从来只有六个人。出口引导宁柚整天守在后门外的走廊里，"
            "她在后门窗的黑卡纸上划开一扇巴掌大的小窗，用红色电光纸剪了一个提灯笼的小人粘在竹签上；"
            "每当从小窗里看见带着小孩子的游客快走到出口，她就一手举着冷白的小手电、一手举着剪纸，在幕布第七格投出一个冲孩子挥手的影子。"
            "上午一个小男孩哭着走出鬼屋，她才想到这个办法；又怕被说成把鬼屋弄得不吓人，谁也没有告诉。"
        ),
        "mo_note_pub": "墨墨现场手记：「最吓人的鬼屋里，也该有一盏替人照路的灯。」",
        "alice_note_pub": "艾丽丝结案批注：「文化祭鬼屋案告破！犯人宁柚罚她明天正式上岗——当高一(1)班鬼屋的第七个影子，专门负责送小朋友出门！」",
        "margin_secret": (
            "续批：墨墨把那个提灯笼的剪纸小人夹进了笔记本。她在旁边写：四年前那个冬天，小雪侦探也在黑暗里站了很久，"
            "没有人替她点一盏灯；所以后来，她总想做那个替别人点灯的人——就像她一直想替周可做的那样。"
        ),
    }

    HAUNTED_MASK_NOTICE = "【防剧透火漆：墨墨在这一案页边的续批涉终章旧约，通关 TRUE END 或点击上方「解锁剧透」后显影】"

    HAUNTED_SPOTS = [
        {
            "id": "h1",
            "code": "HS-01",
            "label": "影子排班表",
            "where": "后台黑板 · 幕布背面",
            "keeper": "林思思",
            "scene": "classroom",
            "surface": "后台黑板上贴着一张手写的排班表：六个影子、六盏台灯、六个名字，从入口一路排到出口。",
            "detail": (
                "现场手记：十二米长的白幕布被分成七格。前六格各站一个影子演员——长发女鬼、无头书生、黑猫、稻草人、撑伞人、提刀厨师——"
                "脚边都是一盏暖黄的落地台灯，灯口朝上。第七格紧挨着后门，写着「堆课桌 · 不站人」。表格最下面一行铅笔小字：「出口引导：宁柚（走廊）」。"
            ),
            "evidence": "影子排班表：六个影子配六盏暖黄落地灯，第七格写着堆课桌不站人",
            "observer": "陈默（现场勘验）",
        },
        {
            "id": "h2",
            "code": "HS-02",
            "label": "粉色儿童票根",
            "where": "前门入口 · 检票桌",
            "keeper": "小林",
            "scene": "corridor",
            "surface": "小林把撕下的票根按组夹成一沓一沓：白色是普通票，粉色印着小幽灵的是儿童票。",
            "detail": (
                "现场手记：到下午两点半，一共一百一十七组游客。说看见第七个影子的有四组——10:12、11:05、13:48、14:30。"
                "小林把这四个时间的票根抽出来，每一沓里都夹着一张粉色儿童票；同一段时间里全是中学生的二十三组，一组也没见过它。"
            ),
            "evidence": "入场票根：看见第七个影子的四组，每组都撕过一张粉色儿童票",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "h3",
            "code": "HS-03",
            "label": "后门窗上的黑卡纸",
            "where": "后门玻璃窗 · 出口内侧",
            "keeper": "林思思",
            "scene": "classroom",
            "surface": "后门的玻璃窗用黑卡纸整面糊住了，右下角却有一道新划的口子，掀开就是一扇巴掌大的小窗。",
            "detail": (
                "现场手记：小窗三边划开，上边用透明胶带当合页，胶带只贴在走廊那一面——只能从门外掀开。小窗离地一米七，"
                "一个人站在门外、抬手就举得到。胶带很新，边上一点灰都没沾。小窗正对着幕布的第七格，中间只隔着两层课桌。"
            ),
            "evidence": "后门窗上的小窗：黑卡纸被划开巴掌大一扇，只能从走廊一侧掀开",
            "observer": "墨墨（现场手记）",
        },
        {
            "id": "h4",
            "code": "HS-04",
            "label": "走廊垃圾桶的红纸屑",
            "where": "后门外 · 走廊垃圾桶",
            "keeper": "墨墨",
            "scene": "corridor",
            "surface": "后门外的垃圾桶里压着一小把红纸屑，最上面一片还粘着半截细细的竹签。",
            "detail": (
                "现场手记：纸屑全是同一种红色电光纸，边缘是剪刀剪出来的小圆弧，不是撕的。拼回去，是剪剩下的边角——"
                "被剪走的那部分，是一个梳着两个小揪揪、手里提着圆灯笼的小人，高不过一掌。竹签一头缠着胶带，另一头被手指捏得发亮。"
            ),
            "evidence": "走廊红纸屑：剪走的是一个一掌高、提灯笼的小人，粘在竹签上",
            "observer": "墨墨（现场手记）",
        },
        {
            "id": "h5",
            "code": "HS-05",
            "label": "出口留言卡",
            "where": "后门出口 · 糖果篮旁",
            "keeper": "林思思",
            "scene": "corridor",
            "surface": "出口的糖果篮旁钉着一块软木板，走出鬼屋的游客可以在上面留一张卡片。",
            "detail": (
                "现场手记：中学生的卡片几乎都在写「第七个影子吓死我了」「高一(1)班闹鬼实锤」。可有四张是小孩子画的："
                "一个提着灯笼的小人站在门边，冲画外挥手，旁边是家长代写的字——「谢谢提灯笼的小姐姐，我不怕了」。四张画，画的是同一个影子。"
            ),
            "evidence": "出口留言卡：大人写第七个影子吓人，孩子却画它提着灯笼挥手",
            "observer": "艾丽丝（社长批注）",
        },
        {
            "id": "h6",
            "code": "HS-06",
            "label": "14:30 的游客照片",
            "where": "学生会群聊 · 张子谦手机",
            "keeper": "张子谦",
            "scene": "corridor",
            "surface": "一位家长 14:30 偷拍的照片传进了学生会的群：幕布尽头，站着一个小小的影子。",
            "detail": (
                "现场手记：照片里六个影子都镶着暖黄的边，个个头大身子小——台灯放在地上朝上打，影子越往上放得越大，越吓人。"
                "只有第七个不一样：它镶着一圈冷白的光，比例端端正正，灯笼的光斑斜斜地往下拖。照亮它的光，是从一米七高的地方斜着往下照的。"
            ),
            "evidence": "游客照片：第七个影子镶冷白光边，光从一米七高处斜着往下照",
            "observer": "陈默（现场勘验）",
        },
    ]

    _HAUNTED_SPOT_BY_ID = {h["id"]: h for h in HAUNTED_SPOTS}

    # 四盏灯：推理链每一环各配一种灯色（橘 / 月 / 青 / 紫），卷宗与弹窗里的灯带都用这四种颜色
    HAUNTED_LANTERNS = [
        {"name": "橘灯", "color": "#e8873a"},
        {"name": "月灯", "color": "#e9d27a"},
        {"name": "青灯", "color": "#4fb3a9"},
        {"name": "紫灯", "color": "#9a7ad8"},
    ]

    HAUNTED_LAMP_LINKS = [
        {
            "id": "k1",
            "step": "第一盏",
            "name": "光源",
            "lantern": "橘灯",
            "color": "#e8873a",
            "short": "后门小窗的冷白手电",
            "full": (
                "照片里第七个影子镶着冷白的光边，光从一米七左右的高处斜着往下照；可六盏台灯都是暖黄的、都放在地上朝上打。"
                "后门的黑卡纸上，正好在一米七高的地方划开了一扇只能从走廊掀开的小窗——照出第七个影子的，是从小窗外伸进来的一束冷白手电光。"
            ),
        },
        {
            "id": "k2",
            "step": "第二盏",
            "name": "投影",
            "lantern": "月灯",
            "color": "#e9d27a",
            "short": "竹签上的剪纸小人",
            "full": (
                "第七格堆满课桌、排班表写明不站人，可要有影子，就得有东西挡住光。走廊垃圾桶里剪剩的红纸边角，剪走的正是一个提灯笼的小人，"
                "还粘着竹签——贴着手电举在小窗口，一掌高的剪纸，就能在幕布上投出一个孩子那么高的影子。"
            ),
        },
        {
            "id": "k3",
            "step": "第三盏",
            "name": "时机",
            "lantern": "青灯",
            "color": "#4fb3a9",
            "short": "带孩子的游客到出口时",
            "full": (
                "看见第七个影子的四组，票根里每一组都夹着粉色儿童票；全是中学生的二十三组，一组也没见过它。孩子们画在留言卡上的，"
                "是一个站在门边冲他们挥手的小人——它不是定时出现的鬼，它只在带着孩子的游客快走到出口时，才亮起来。"
            ),
        },
        {
            "id": "k4",
            "step": "第四盏",
            "name": "掌灯人",
            "lantern": "紫灯",
            "color": "#9a7ad8",
            "short": "出口引导宁柚",
            "full": (
                "能站在后门外、看得见谁快走到出口、手边就有剪刀和胶带、一整天都守在那扇小窗旁边的人，排班表最下面那行铅笔字早就写好了——"
                "出口引导，宁柚。第七个影子，是她站在走廊里，一只手举着手电、一只手举着剪纸，替每一个害怕的孩子点亮的。"
            ),
        },
    ]

    HAUNTED_RATING_TIERS = [
        {"key": "gold",   "name": "金牌", "title": "鬼屋名侦探", "rule": "零失误",         "max_mistakes": 0},
        {"key": "silver", "name": "银牌", "title": "提灯推理员", "rule": "失误 1～2 次",    "max_mistakes": 2},
        {"key": "bronze", "name": "铜牌", "title": "见习掌灯",   "rule": "失误 3 次及以上", "max_mistakes": 999},
    ]

    _HAUNTED_TIER_BY_KEY = {t["key"]: t for t in HAUNTED_RATING_TIERS}
    _HAUNTED_TIER_RANK = {"gold": 3, "silver": 2, "bronze": 1}

    # 在证物簿里登记六处勘查点的翻面批注（与委托信箱、闭馆图书馆、雨夜剧场、美术室、失物箱同一套 register_evidence_detail 机制）
    if "register_evidence_detail" in globals():
        for _hhs in HAUNTED_SPOTS:
            register_evidence_detail(_hhs["evidence"], _hhs["observer"], _hhs["detail"])

    def haunted_tier_def(tier_key):
        return _HAUNTED_TIER_BY_KEY.get(tier_key, HAUNTED_RATING_TIERS[-1])

    def haunted_rate(mistakes_count=0):
        """按本局失误数评定评级：0 次金牌，1～2 次银牌，3 次及以上铜牌。"""
        m = max(0, int(mistakes_count or 0))
        for tier in HAUNTED_RATING_TIERS:
            if m <= tier["max_mistakes"]:
                return tier
        return HAUNTED_RATING_TIERS[-1]

    def haunted_get_spot(spot_id):
        return _HAUNTED_SPOT_BY_ID.get(spot_id, HAUNTED_SPOTS[0])

    def _ensure_haunted_store():
        if not isinstance(getattr(persistent, "haunted_house_record", None), dict):
            persistent.haunted_house_record = {}
        return persistent.haunted_house_record

    def haunted_get_record():
        raw = _ensure_haunted_store()
        last_tier = raw.get("last_tier")
        return {
            "solved": bool(raw.get("solved", False)),
            "replays": save_int(raw.get("replays"), 0),
            "best_tier": casefile_best_key(raw),
            "last_tier": last_tier if isinstance(last_tier, str) and last_tier in _HAUNTED_TIER_RANK else None,
            "best_mistakes": save_int(raw.get("best_mistakes")),
            "last_mistakes": save_int(raw.get("last_mistakes")),
            "inspected": [h for h in (raw.get("inspected") or []) if h in _HAUNTED_SPOT_BY_ID],
            "report_viewed": bool(raw.get("report_viewed", False)),
        }

    def _haunted_write(updates):
        store_dict = dict(_ensure_haunted_store())
        store_dict.update(updates)
        persistent.haunted_house_record = store_dict
        return store_dict

    def haunted_case_solved_count():
        return 1 if haunted_get_record()["solved"] else 0

    def haunted_gold_count():
        return 1 if haunted_get_record()["best_tier"] == "gold" else 0

    def haunted_best_short():
        """案卷与鉴赏页使用：历史最佳评级名，未结案时显示「待结案」。"""
        rec = haunted_get_record()
        return haunted_tier_def(rec["best_tier"])["name"] if rec["best_tier"] else "待结案"

    def haunted_select_spot(spot_id):
        hdef = haunted_get_spot(spot_id)
        persistent.haunted_selected_spot = hdef["id"]
        renpy.save_persistent()

    def haunted_inspect_spot(spot_id):
        """剧场内勘查一处：证物入簿（可翻面），并把这一处记入鉴赏页档案；只写鬼屋自己的存档。"""
        hdef = _HAUNTED_SPOT_BY_ID.get(spot_id)
        if hdef is None:
            return False
        if "add_evidence" in globals():
            add_evidence(hdef["evidence"])
        seen = list(haunted_get_record()["inspected"])
        if hdef["id"] not in seen:
            seen.append(hdef["id"])
        _haunted_write({"inspected": seen})
        persistent.haunted_selected_spot = hdef["id"]
        renpy.save_persistent()
        return True

    def haunted_record_solve(mistakes_count=0):
        """记录一次结案：评定本局评级、刷新历史最佳（最高评级 + 最少失误）与累计结案次数。
        只写鬼屋自己的存档，绝不触碰主线 fail_count / 好感。本局零失误时追加金牌成就。"""
        m = max(0, int(mistakes_count or 0))
        tier = haunted_rate(m)
        prev = haunted_get_record()
        is_first = not prev["solved"]
        prev_rank = _HAUNTED_TIER_RANK.get(prev["best_tier"], 0)
        best_tier = tier["key"] if _HAUNTED_TIER_RANK[tier["key"]] >= prev_rank else prev["best_tier"]
        best_m = m if prev["best_mistakes"] is None else min(prev["best_mistakes"], m)
        new_record = (not is_first) and (prev["best_mistakes"] is None or m < prev["best_mistakes"])
        _haunted_write({
            "solved": True,
            "replays": prev["replays"] + 1,
            "best_tier": best_tier,
            "last_tier": tier["key"],
            "best_mistakes": best_m,
            "last_mistakes": m,
            "inspected": [h["id"] for h in HAUNTED_SPOTS],
        })
        ach_grant("ach_haunted_house")
        if tier["key"] == "gold":
            ach_grant("ach_seventh_shadow")
        renpy.save_persistent()
        result = haunted_get_record()
        result["is_first"] = is_first
        result["new_record"] = new_record
        return result

    def haunted_open_report_modal():
        if haunted_get_record()["solved"]:
            _haunted_write({"report_viewed": True})
            renpy.save_persistent()
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("haunted_report_modal")

    def haunted_spoiler_unlocked():
        return bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False

    def haunted_render_view():
        """渲染鬼屋卷宗：结案前只公开案情与勘查点外观，结案后显影四盏灯、结案报告与双人手记；
        墨墨涉终章的页边续批只在 truth_spoiler_unlocked() 为真且已结案时出现，遮罩状态下的返回值与续批文本完全无关（零侧信道）。"""
        rec = haunted_get_record()
        solved = rec["solved"]
        best = haunted_tier_def(rec["best_tier"]) if rec["best_tier"] else None
        unlocked = haunted_spoiler_unlocked()
        if best:
            best_line = "%s「%s」 · 最少失误 %d 次" % (best["name"], best["title"], rec["best_mistakes"] or 0)
        else:
            best_line = "尚未结案"
        return {
            "code": HAUNTED_CASE["code"],
            "title": HAUNTED_CASE["title"],
            "short_title": HAUNTED_CASE["short_title"],
            "time_tag": HAUNTED_CASE["time_tag"],
            "summary": HAUNTED_CASE["summary_pub"],
            "solved": solved,
            "replays": rec["replays"],
            "best_tier": rec["best_tier"],
            "best_name": best["name"] if best else "待结案",
            "best_line": best_line,
            "inspected_count": len(rec["inspected"]),
            "lamp_shorts": [(k["short"] if solved else "") for k in HAUNTED_LAMP_LINKS],
            "lamp_fulls": [(k["full"] if solved else "") for k in HAUNTED_LAMP_LINKS],
            "display_solution": HAUNTED_CASE["solution_pub"] if solved else "",
            "display_mo_note": HAUNTED_CASE["mo_note_pub"] if solved else "",
            "display_alice_note": HAUNTED_CASE["alice_note_pub"] if solved else "",
            "unlocked": unlocked,
            "display_secret": HAUNTED_CASE["margin_secret"] if (solved and unlocked) else "",
            "display_masked_notice": HAUNTED_MASK_NOTICE if not unlocked else "",
        }

    def haunted_launch_action():
        return [
            Function(stop_all_gramophone_ambience, True),
            SetField(persistent, "extras_tab", "haunted"),
            Replay(HAUNTED_CASE["label"], scope={"player_name": persistent.last_player_name or "陈默"}, locked=False),
        ]


################################################################################
## 二、鉴赏分页界面：文化祭鬼屋的第七个影子（screen extras_haunted_house）
################################################################################

transform haunted_lantern_sway:
    subpixel True
    block:
        ease 1.9 rotate -7 yoffset -1
        ease 1.9 rotate 7 yoffset 1
        repeat

screen extras_haunted_house():
    $ _hv = haunted_render_view()
    $ _hrec = haunted_get_record()
    $ _hsid = persistent.haunted_selected_spot or "h1"
    $ _hs = haunted_get_spot(_hsid)
    $ _hs_seen = (_hs["id"] in _hrec["inspected"])

    vbox:
        spacing 9

        ## 1. 鬼屋总览横幅（暗场靛紫 · 灯笼暖金）
        frame:
            style "haunted_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_haunted_house.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("文化祭鬼屋的第七个影子") font gui.name_text_font size 19 color "#f6efff"
                        if _hv["solved"]:
                            text _("已结案 · 四盏灯已全部点亮 · 可随时重新走进鬼屋冲击金牌") size 12 color "#9fe3b0"
                        else:
                            text _("文化祭第一天，幕布后只站着六个人 · 第七个影子从哪来") size 12 color "#d9c8f5"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_seventh_shadow.png" xysize (14, 14) yalign 0.5
                            text ("最佳 %s" % _hv["best_name"]) size 12 color "#f4d98a" yalign 0.5 substitute False
                    frame:
                        style "mailbox_stat_chip"
                        text ("结案 %d 次" % _hv["replays"]) size 12 color "#d6c2ff" align (0.5, 0.5) substitute False

        ## 2. 卷宗详情：暗场缩略图（底部七格幕布带，第七格亮着）、案情、六处勘查点、四盏灯、评级与页边续批
        frame:
            style "haunted_console_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add HAUNTED_CASE["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add Solid("#0c081899") xysize (180, 96) align (0.5, 0.5)
                        add "images/ui/icon_haunted_house.png" xysize (24, 24) xalign 0.05 yalign 0.08
                        if _hv["solved"]:
                            add "images/ui/icon_flashlight.png" xysize (26, 26) xalign 0.96 yalign 0.08 at haunted_lantern_sway
                        vbox:
                            spacing 1
                            xalign 0.5
                            yalign 0.97
                            add Solid("#efe6ff") xysize (178, 1)
                            hbox:
                                spacing 4
                                for _si in range(7):
                                    add Solid((("#f2d27a" if _hv["solved"] else "#c9b6ff") if _si == 6 else "#3b2f52")) xysize (22, 5)
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text HAUNTED_CASE["code"] size 12 color "#ffffff" bold True align (0.5, 0.5) substitute False
                            text ("《%s》" % HAUNTED_CASE["short_title"]) font gui.name_text_font size 17 color "#f6efff" yalign 0.5 substitute False
                        text ("%s  ·  %s" % (HAUNTED_CASE["time_tag"], HAUNTED_CASE["companions"])) size 12 color "#cbb8ec" substitute False
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (15, 15) yalign 0.5
                            text ("光影：%s" % HAUNTED_CASE["lighting_note"]) size 12 color "#a996cc" yalign 0.5 substitute False
                        if _hv["solved"]:
                            text ("结案档案：%s（已结案 %d 次 · 六处勘查点全查完）" % (_hv["best_line"], _hv["replays"])) size 12 color "#f4d98a" substitute False
                        else:
                            text ("结案档案：尚未结案（已勘查 %d/6 处，可先翻看下方勘查点，再走进鬼屋）" % _hv["inspected_count"]) size 12 color "#a996cc" substitute False

                text HAUNTED_CASE["summary_pub"] size 13 color "#f3eefc" line_spacing 3 substitute False

                ## 2A. 六处勘查点（3 × 226 + 2 × 8 = 694px 精确贴合内宽，两行）
                text _("勘查点 · 点击翻看六处线索（亲自查过的，会显影现场手记）：") size 12 color "#c9b6ff" bold True
                grid 3 2:
                    spacing 8
                    for h_obj in HAUNTED_SPOTS:
                        $ _h_seen = (h_obj["id"] in _hrec["inspected"])
                        $ _h_active = (h_obj["id"] == _hs["id"])
                        button:
                            style "haunted_spot_card"
                            selected _h_active
                            action Function(haunted_select_spot, h_obj["id"])
                            vbox:
                                spacing 2
                                xfill True
                                hbox:
                                    xfill True
                                    yalign 0.5
                                    text ("%s · %s" % (h_obj["code"], h_obj["label"])) size 11 color ("#f2d27a" if _h_active else "#ece4fa") bold True yalign 0.5 substitute False
                                    text (_("已勘查") if _h_seen else _("待勘查")) size 10 color ("#9fe3b0" if _h_seen else "#a996cc") xalign 1.0 yalign 0.5
                                text ("位置 %s" % h_obj["where"]) size 10 color "#b9a6dc" substitute False
                                text h_obj["surface"] size 11 color "#e1d7f4" line_spacing 2 substitute False

                frame:
                    xfill True
                    padding (10, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        spacing 8
                        add ("images/ui/icon_festival_ticket.png" if _hs["id"] == "h2" else "images/ui/icon_flashlight.png") xysize (20, 20)
                        vbox:
                            spacing 2
                            text ("%s · %s（经手：%s）" % (_hs["code"], _hs["label"], _hs["keeper"])) size 12 color "#f2d27a" bold True substitute False
                            if _hs_seen:
                                text _hs["detail"] size 12 color "#f6f1ff" line_spacing 2 substitute False
                            else:
                                text _("还没有亲自勘查这一处。走进鬼屋查过之后，现场手记会显影在这里。") size 12 color "#a996cc"

                ## 2B. 四盏灯（4 × 167 + 3 × 8 = 692px <= 694px；每盏一种灯色）
                text _("四盏灯 · 复盘（光源 → 投影 → 时机 → 掌灯人，结案后显影）：") size 12 color "#c9b6ff" bold True
                hbox:
                    spacing 8
                    for _ki, k_obj in enumerate(HAUNTED_LAMP_LINKS):
                        frame:
                            style "haunted_lamp_slot"
                            vbox:
                                spacing 2
                                add Solid(k_obj["color"]) xysize (151, 3)
                                text ("%s · %s" % (k_obj["step"], k_obj["name"])) size 11 color ("#9fe3b0" if _hv["solved"] else "#cbb8ec") bold True substitute False
                                text (_hv["lamp_shorts"][_ki] if _hv["solved"] else _("？ 待点亮")) size 12 color ("#f6f1ff" if _hv["solved"] else "#8f7fae") substitute False

                ## 2C. 评级与结案报告预览匣
                frame:
                    style "haunted_rating_card"
                    vbox:
                        spacing 5
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_seventh_shadow.png" xysize (16, 16) yalign 0.5
                                text _("评级 · 重玩挑战") font gui.name_text_font size 13 color "#f6f1ff" yalign 0.5
                            text ("历史最佳：%s" % _hv["best_line"]) size 11 color "#f4d98a" xalign 1.0 yalign 0.5 substitute False
                        hbox:
                            spacing 8
                            for t_obj in HAUNTED_RATING_TIERS:
                                frame:
                                    style "haunted_tier_chip"
                                    hbox:
                                        xfill True
                                        yalign 0.5
                                        text ("%s「%s」" % (t_obj["name"], t_obj["title"])) size 12 color ("#f4d98a" if _hv["best_tier"] == t_obj["key"] else "#ece4fa") yalign 0.5 substitute False
                                        text t_obj["rule"] size 11 color "#b9a6dc" xalign 1.0 yalign 0.5 substitute False
                        if _hv["solved"]:
                            add Solid("#c9b6ff33") ysize 1
                            text _hv["display_solution"] size 12 color "#9fe3b0" line_spacing 2 substitute False
                            text _hv["display_mo_note"] size 12 color "#cfa6f0" substitute False
                            text _hv["display_alice_note"] size 12 color "#f0c060" substitute False
                        else:
                            text _("结案报告：解开第七个影子之谜后，墨墨会把四盏灯和完整的结案报告写在这里。") size 12 color "#a996cc"

                ## 2D. 墨墨的页边续批（防剧透火漆：与复盘本等共用 truth_spoiler_unlocked() 开关）
                frame:
                    style "haunted_margin_box"
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
                                                    message=_("尚未通关 TRUE END，确定提前揭晓墨墨在「文化祭鬼屋」页边涉终章旧约的续批吗？"),
                                                    yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                                    no_action=Hide("confirm"))
                        if _hv["display_secret"]:
                            text _hv["display_secret"] size 12 color "#f4d98a" line_spacing 2 substitute False
                        elif _hv["unlocked"]:
                            text _("剧透许可已开启 · 解开第七个影子之谜后，墨墨的续批会显影在这里。") size 12 color "#a996cc"
                        if _hv["display_masked_notice"]:
                            text _hv["display_masked_notice"] size 11 color "#f0a4b8" substitute False

                ## 2E. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("零失误点亮四盏灯可获金牌 · 已结案 %d 次" % _hv["replays"]) size 12 color "#b9a6dc" yalign 0.5 substitute False
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton _("展阅结案报告"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(haunted_open_report_modal)
                        textbutton (_("重新走进鬼屋") if _hv["solved"] else _("走进影子回廊")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action haunted_launch_action()


## 鬼屋结案报告独立展阅弹窗
screen haunted_report_modal():
    modal True
    zorder 215
    $ _mv = haunted_render_view()

    add "#0c0814dc"
    key "K_ESCAPE" action Hide("haunted_report_modal")
    key "K_RETURN" action Hide("haunted_report_modal")
    key "K_SPACE" action Hide("haunted_report_modal")

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
                    add "images/ui/icon_haunted_house.png" xysize (40, 40) yalign 0.5
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_mv["code"], _mv["short_title"])) font gui.name_text_font size 20 color "#f6efff" substitute False
                        text _mv["time_tag"] size 12 color "#cbb8ec" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_seventh_shadow.png" xysize (30, 30) yalign 0.5 at haunted_lantern_sway
                    text _mv["best_name"] size 13 color "#f4d98a" bold True yalign 0.5 substitute False

            hbox:
                spacing 0
                for _rl in HAUNTED_LANTERNS:
                    add Solid(_rl["color"]) xysize (173, 3)

            viewport:
                xfill True
                ysize 336
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    text _("案情：") size 12 color "#c9b6ff" bold True
                    text _mv["summary"] size 13 color "#f3eefc" line_spacing 4 substitute False
                    add Solid("#cbb8ec33") ysize 1
                    if _mv["solved"]:
                        text _("四盏灯：") size 12 color "#c9b6ff" bold True
                        for _ri, r_obj in enumerate(HAUNTED_LAMP_LINKS):
                            hbox:
                                spacing 8
                                add Solid(r_obj["color"]) xysize (6, 18) yalign 0.0
                                text ("%s · %s（%s）：%s" % (r_obj["step"], r_obj["name"], r_obj["lantern"], _mv["lamp_fulls"][_ri])) size 13 color "#ece4fa" line_spacing 3 xsize 658 substitute False
                        add Solid("#c9b6ff33") ysize 1
                        text _mv["display_solution"] size 13 color "#9fe3b0" line_spacing 4 substitute False
                        text _mv["display_mo_note"] size 13 color "#cfa6f0" line_spacing 4 substitute False
                        text _mv["display_alice_note"] size 13 color "#f0c060" line_spacing 4 substitute False
                        if _mv["display_secret"]:
                            add Solid("#f4d98a33") ysize 1
                            text _mv["display_secret"] size 13 color "#f4d98a" line_spacing 4 substitute False
                    else:
                        text _("这桩案子还没有结案。走进影子回廊、查完六处线索并点亮四盏灯后，完整的结案报告会显影在这里。") size 13 color "#b9a6dc" line_spacing 4
                    if _mv["display_masked_notice"]:
                        text _mv["display_masked_notice"] size 12 color "#f0a4b8" substitute False

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上结案报告") size 12 color "#b9a6dc" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 10
                    textbutton _("重新走进鬼屋"):
                        style "gramophone_mini_pill"
                        yalign 0.5
                        action [Hide("haunted_report_modal")] + haunted_launch_action()
                    textbutton _("合上报告"):
                        style "pill_button"
                        xminimum 116
                        ysize 34
                        text_size 14
                        action Hide("haunted_report_modal")


## 鬼屋剧场内顶部「四盏灯」横幅（位于右上角证物 HUD 下方，互不遮挡；已点亮的格子亮起各自的灯色）
screen haunted_lamp_banner(lamps_done, prompt_line):
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
                add "images/ui/icon_flashlight.png" xysize (22, 22) yalign 0.5
                text _("影子回廊 · 点亮四盏灯") size 12 color "#c9b6ff" bold True yalign 0.5
                text ("已点亮 %d/%d · 失误只计入本案评级，不影响主线" % (lamps_done, len(HAUNTED_LAMP_LINKS))) size 11 color "#cbb8ec" yalign 0.5
            hbox:
                spacing 6
                for _bi, b_obj in enumerate(HAUNTED_LAMP_LINKS):
                    frame:
                        style "haunted_banner_slot"
                        vbox:
                            spacing 0
                            add Solid(b_obj["color"] if _bi <= lamps_done else "#3b2f52") xysize (160, 3)
                            text ("%s · %s" % (b_obj["step"], b_obj["name"])) size 10 color ("#9fe3b0" if _bi < lamps_done else ("#f2d27a" if _bi == lamps_done else "#a996cc")) bold True substitute False
                            text (b_obj["short"] if _bi < lamps_done else _("？")) size 11 color ("#f6f1ff" if _bi < lamps_done else "#8f7fae") substitute False
            text prompt_line size 14 color "#f6f1ff" substitute False


## 鬼屋结案结算卡：本局评级 + 历史最佳纪录 + 重玩挑战提示
screen haunted_result_card(cur_tier, best_tier, mistakes, best_mistakes, replays, new_record=False, is_first=True):
    modal True
    zorder 220
    $ _ct = haunted_tier_def(cur_tier)
    $ _bt = haunted_tier_def(best_tier)
    $ _rv = haunted_render_view()
    $ _is_gold = (cur_tier == "gold")

    add "#0c0814dc"
    key "K_RETURN" action Return("back_to_haunted")
    key "K_SPACE" action Return("back_to_haunted")
    key "K_ESCAPE" action Return("back_to_haunted")

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
                add "images/ui/icon_seventh_shadow.png" xysize (54, 54) yalign 0.5 at haunted_lantern_sway
                vbox:
                    spacing 3
                    yalign 0.5
                    text ("鬼屋结案 · %s" % HAUNTED_CASE["code"]) size 13 color "#c9b6ff" bold True substitute False
                    text ("《%s》" % HAUNTED_CASE["short_title"]) font gui.name_text_font size 21 color "#f6efff" substitute False
                    text ("本局评级：【%s · %s】" % (_ct["name"], _ct["title"])) size 14 color ("#f4d98a" if _is_gold else "#9fe3b0") substitute False

            hbox:
                spacing 0
                xalign 0.5
                for _cl in HAUNTED_LANTERNS:
                    add Solid(_cl["color"]) xysize (152, 3)

            frame:
                xfill True
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 4
                    text _rv["display_mo_note"] size 13 color "#cfa6f0" substitute False
                    text _rv["display_alice_note"] size 13 color "#f0c060" substitute False
                    text ("本局失误 %d 次（只计入本案评级，不影响主线）" % mistakes) size 12 color "#cbb8ec"
                    text ("历史最佳：%s「%s」 · 最少失误 %d 次 · 累计结案 %d 次" % (_bt["name"], _bt["title"], best_mistakes, replays)) size 12 color "#cbb8ec" substitute False
                    if is_first:
                        text _("首次结案 · 四盏灯已写入鉴赏室「文化祭鬼屋」分页") size 12 color "#9fe3b0"
                    elif new_record:
                        text _("重玩挑战 · 刷新个人纪录！这一次的四盏灯比以往任何一次都点得更稳") size 12 color "#f4d98a"
                    elif _is_gold:
                        text _("重玩挑战 · 再次拿下金牌，鬼屋名侦探实至名归") size 12 color "#f4d98a"
                    else:
                        text _("重玩挑战 · 零失误点亮四盏灯，就能拿下金牌") size 12 color "#cbb8ec"

            textbutton _("收好灯笼并返回鉴赏室"):
                style "pill_button"
                xalign 0.5
                xminimum 248
                ysize 38
                text_size 15
                action Return("back_to_haunted")


################################################################################
## 三、样式定义（PC-14 暗场靛紫与灯笼暖金）
################################################################################

style haunted_header_card is default:
    xfill True
    padding (14, 10)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#b8a6ec") * SaturationMatrix(0.0))

style haunted_console_card is default:
    xfill True
    padding (14, 11)
    background Transform(Frame("gui/panel_dark.png", 26, 26), matrixcolor=TintMatrix("#d4caf2") * SaturationMatrix(0.0))

style haunted_rating_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style haunted_spot_card is button:
    xsize 226
    yminimum 88
    padding (8, 6)
    background Frame("gui/hud_chip.png", 12, 12)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style haunted_lamp_slot is default:
    xsize 167
    ysize 58
    padding (8, 5)
    background Frame("gui/hud_chip.png", 12, 12)

style haunted_banner_slot is default:
    xsize 176
    ysize 44
    padding (8, 4)
    background Frame("gui/panel_card.png", 16, 16)

style haunted_tier_chip is default:
    xsize 218
    ysize 30
    padding (8, 0)
    background Frame("gui/panel_card.png", 16, 16)

style haunted_margin_box is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)


################################################################################
## 四、鬼屋独立沙盒初始化与结案出口（零侵入主线好感/失误/存档）
################################################################################

label _haunted_init_sandbox(session_save_title):
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

label _haunted_finish_case(local_mistakes=0):
    $ _hh_final_mistakes = max(0, int(local_mistakes or 0))
    $ _hh_rec = haunted_record_solve(_hh_final_mistakes)
    hide screen haunted_lamp_banner
    hide screen evidence_book
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen haunted_result_card(_hh_rec["last_tier"], _hh_rec["best_tier"], _hh_final_mistakes, _hh_rec["best_mistakes"], _hh_rec["replays"], _hh_rec["new_record"], _hh_rec["is_first"])
    $ persistent.extras_tab = "haunted"
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 五、文化祭鬼屋 HH-01：《提灯笼的第七个影子》
################################################################################

label haunted_house_case:
    call _haunted_init_sandbox("文化祭鬼屋 · HH-01 提灯笼的第七个影子") from _call__haunted_init_sandbox
    $ _hh_mistakes = 0
    $ _hh_lamps = 0
    $ _hh_h1 = False
    $ _hh_h2 = False
    $ _hh_h3 = False
    $ _hh_h4 = False
    $ _hh_h5 = False
    $ _hh_h6 = False
    $ _hh_replays = haunted_get_record()["replays"]
    $ _hh_best_text = haunted_render_view()["best_line"]

    scene bg black with fade
    $ play_bgm(bgm_suspense, fadein=1.5)
    centered "{size=+6}文化祭鬼屋 · HAUNTED HOUSE HH-01{/size}\n\n{size=+14}提灯笼的第七个影子{/size}\n\n{color=#c9b6ff}周六 14:50 · 高一(1)班 · 文化祭第一天{/color}"

    scene bg corridor at bg_kenburns_in
    $ set_ambient("warm")
    show screen evidence_book
    with dissolve

    play sound se_footstep
    "文化祭第一天，整栋教学楼吵得像一锅煮开的粥。章鱼小丸子的香味从二楼飘上来，三楼东头的走廊里排着长长的队，队尾一直拐进了楼梯间。"
    "队伍的尽头，是我们高一(1)班的教室。门口挂着一块黑底白字的招牌：『影子回廊 · 你数得清幕布后面有几个人吗？』"
    "我上午举了三个小时的招牌，嗓子都喊哑了。下午轮休，刚被艾丽丝拖出来逛了半圈，就在楼梯口被人拦住了。"
    show banzhang sad at center
    banzhang "你在这儿！艾丽丝社长也在——太好了，我正想去万事屋找你们……"
    show alice think at left
    show mo think at right
    alice "林班长？你们班的鬼屋不是火得一塌糊涂吗，队都排到楼梯间了。"
    banzhang "就是火得太过头了。你们……听说过『第七个影子』吗？"
    banzhang "我们的鬼屋，是用一道十二米长的白幕布隔出来的回廊。幕布后面站着六个同学，每人脚边一盏台灯，把影子打在幕布上。六个影子，排班表上写得清清楚楚。"
    banzhang "可从上午开始，陆陆续续有游客说，幕布的最后面还站着第七个。小小的一个，就在出口旁边。"
    banzhang "我们掀开幕布去看——那里只有一堆课桌，一个人都没有。"
    show alice shock at left
    alice "所以论坛上那个『高一(1)班鬼屋闹鬼实锤』的帖子，说的就是你们？"
    banzhang "现在全校都在传，队越排越长……可是刚才，德育处的黄老师来过了。"
    show banzhang think at center
    banzhang "他说，暗房里点着六盏灯、地上拖着一地电线，要是幕布后面真多出一个不在排班表上的人，出了事谁也担不起。四点之前讲不清第七个影子是怎么来的，鬼屋就关门。"
    banzhang "大家为了这个鬼屋，熬了整整一个星期……"
    "她攥着一叠宣传单，指节都发白了。"
    play sound se_write
    mo_note "影子不会自己长出来。有影子，就有一盏灯，和一样挡住灯的东西。"
    show alice smile at left
    alice "听见了吧？这单万事屋接了！离四点还有一个小时——本社长倒要看看，是哪路神仙这么不懂事，跑到别人的鬼屋里打黑工！"
    banzhang "我去跟大家说，暂停入场十分钟。你们想看哪里，随便看。"

label haunted_case_investigate:
    if _hh_h1 and _hh_h2 and _hh_h3 and _hh_h4 and _hh_h5 and _hh_h6:
        jump haunted_case_review_intro

    menu:
        "鬼屋暂停入场十分钟。六处可疑的地方，先查哪一处？（可随时点击右上角【证据】翻面查看批注）"

        "绕到幕布后面，看看后台黑板上的影子排班表" if not _hh_h1:
            $ _hh_h1 = True
            scene bg classroom
            $ set_ambient("night")
            show alice think at left
            show banzhang think at center
            show mo think at right
            with dissolve
            play sound se_door
            "教室的窗帘全拉上了，窗缝用黑胶带封得严严实实。一道白幕布从前门一直拉到后门，把教室隔成两半：靠窗的一半是游客走的回廊，靠墙的一半是后台。"
            "后台里，六盏落地台灯一字排开，灯口全朝上。六个同学蹲在灯边喝水，看见我们进来，齐刷刷地抬起头。"
            banzhang "这就是排班表，昨天晚上我一笔一笔写的。"
            play sound se_page
            "后台的黑板上贴着一张大白纸。幕布被画成长长的一条，分成七格，前六格各写着一个名字和一个角色：长发女鬼、无头书生、黑猫、稻草人、撑伞人、提刀厨师。"
            "第七格紧挨着后门，里面写着五个字：『堆课桌 · 不站人』。"
            mc "第七格不站人？"
            banzhang "后门那块地方太窄，桌椅没处放，只能都堆在那儿。演员只站前六格。"
            "我走到第七格看了看。课桌叠了两层，椅子腿朝天卡在缝里，别说站一个人，连塞一只猫都难。"
            "六号位的撑伞人撑着一把大黑伞，伞面一张开，正好挡住了看向第七格的视线。"
            show alice smile at left
            alice "再看最底下这行小字——铅笔写的，『出口引导：宁柚（走廊）』。"
            banzhang "宁柚负责在后门外面发糖、跟游客说再见。她……不太爱说话，我就没让她进暗房。"
            "宁柚。她坐在我斜后方靠窗的位置。转学来这么久，我好像一次也没听她大声说过话。"
            show mo smile at right
            play sound se_write
            mo_note "六个人，六盏灯，灯都在地上。第七格，没有人，也没有灯。"
            $ haunted_inspect_spot("h1")
            jump haunted_case_investigate

        "去前门检票桌，找小林看看撕下来的票根" if not _hh_h2:
            $ _hh_h2 = True
            scene bg corridor
            $ set_ambient("warm")
            show alice think at left
            show lin neutral at center
            show mo think at right
            with dissolve
            "前门外摆着一张课桌，小林端端正正地坐在后面。她面前放着一只铁皮饼干盒，里面码着一沓一沓的票根，每一沓都用回形针夹好。"
            show alice smile at left
            alice "小林？你怎么在这儿检票？"
            lin "学生会安全规定。暗房鬼屋必须登记每组的入场时间与人数。张子谦借调。"
            lin "白票是普通票。粉票是儿童票，十岁以下。一组一沓，入场时间写在第一张背面。"
            mc "说看见第七个影子的，一共有几组？"
            lin "出口留言和学生会接到的反映，能对上入场时间的，四组。10:12，11:05，13:48，14:30。"
            play sound se_page
            "小林从饼干盒里抽出四沓票根，在桌上排成一排。我一沓一沓翻过去——每一沓里，都夹着一张粉色的儿童票，上面印着一只小小的幽灵。"
            show alice shock at left
            alice "四组全都带着小孩子！"
            lin "同一段时间里，全部是中学生的组，二十三组。没有一组反映看见过第七个影子。"
            mc "二十三组中学生一组都没看见，四组带孩子的，组组都看见了……"
            lin "我只登记看得见的东西。粉色票根，我看得见。"
            show mo smile at right
            play sound se_write
            mo_note "第七个影子，好像会挑客人。"
            $ haunted_inspect_spot("h2")
            jump haunted_case_investigate

        "检查出口那扇后门——窗上糊的黑卡纸" if not _hh_h3:
            $ _hh_h3 = True
            scene bg classroom
            $ set_ambient("night")
            show alice think at left
            show banzhang think at center
            show mo think at right
            with dissolve
            "后门是游客出去的地方。门的上半截是一扇玻璃窗，为了不让走廊的光漏进来，整扇玻璃都用黑卡纸糊住了。"
            "我凑近了看。卡纸的右下角，有一道细细的口子。"
            play sound se_page
            "伸手一碰，那一小块卡纸往外一翻——是一扇巴掌大的小窗。三条边是用美工刀划开的，上边贴着一截透明胶带，当成了合页。"
            show alice shock at left
            alice "胶带贴在走廊那一面！从教室里面只能往外推，要从走廊那边，才掀得开。"
            mc "离地差不多一米七。一个人站在门外，抬手就能举到这么高。"
            banzhang "这……这不是我们弄的。早上布置的时候，黑卡纸还是整整一张。"
            "胶带很新，边缘一点灰都没沾。我从小窗往教室里看，正对着的，就是幕布的第七格——中间只隔着那两层课桌。"
            show mo smile at right
            play sound se_write
            mo_note "这扇窗，是给门外的人开的。"
            $ haunted_inspect_spot("h3")
            jump haunted_case_investigate

        "翻一翻后门外走廊的垃圾桶" if not _hh_h4:
            $ _hh_h4 = True
            scene bg corridor
            $ set_ambient("warm")
            show alice think at left
            show mo think at right
            with dissolve
            "后门外的走廊比前门清静得多，只有一张出口引导的小桌子和一只半满的垃圾桶。小桌子上，除了一篮水果糖，还有一卷透明胶带、一把粉色的小剪刀。"
            "小桌子后面空着。林思思说，暂停入场的这十分钟，宁柚下楼搬糖去了。"
            "墨墨蹲在垃圾桶边，用两根手指，从一堆纸杯和竹签中间夹出了一小把红纸屑。"
            play sound se_page
            "是红色的电光纸，一面亮一面哑。边缘全是一个一个的小圆弧——是剪刀剪出来的，不是撕的。"
            "墨墨把纸屑在桌上摊开，像拼拼图一样拼回去。拼好的，是一张剪空了的纸：中间被剪走的那一块，是一个小人的形状。"
            show alice shock at left
            alice "两个小揪揪……手里还提着一盏圆圆的灯笼！"
            mc "一掌高。最上面那片纸屑上，还粘着半截竹签。"
            "竹签的一头缠着胶带，另一头被手指捏得发亮——有人捏着它，捏了很久。"
            show alice think at left
            alice "剪纸小人拿竹签粘着……这不就是皮影吗？我小时候在庙会上见过，一个巴掌大的小人贴着灯一晃，白布上就是一个活生生的人。"
            show mo smile at right
            play sound se_write
            mo_note "剪下来的小人不在这里。它被拿走了，还在用。"
            $ haunted_inspect_spot("h4")
            jump haunted_case_investigate

        "看看出口糖果篮旁边的留言卡" if not _hh_h5:
            $ _hh_h5 = True
            scene bg corridor
            $ set_ambient("warm")
            show alice smile at left
            show banzhang think at center
            show mo think at right
            with dissolve
            "出口的糖果篮旁边钉着一块软木板，上面密密麻麻贴满了卡片。"
            banzhang "走出鬼屋的人可以写一张，说说感想。本来是想看看哪个影子最吓人……"
            play sound se_page
            "大部分卡片是中学生写的：『第七个影子吓死我了！』『高一(1)班闹鬼实锤』『建议给第七个影子发工资』。"
            show alice think at left
            alice "等一下，这几张不一样。"
            "艾丽丝从角落里摘下四张卡片。不是字，是画——蜡笔画的，歪歪扭扭。"
            "四张画，画的都是同一个东西：一个提着灯笼的小人站在一扇门旁边，抬起一只手，冲着画外挥手。"
            "旁边是大人代写的小字：『谢谢提灯笼的小姐姐，我不怕了。』"
            mc "大人们写的是『吓死人』，孩子们画的，却是一个跟他们挥手说再见的影子。"
            show mo smile at right
            play sound se_write
            mo_note "同一个影子。大人看见的是鬼，孩子看见的是人。"
            $ haunted_inspect_spot("h5")
            jump haunted_case_investigate

        "找张子谦，看看那张在学生会群里传开的照片" if not _hh_h6:
            $ _hh_h6 = True
            scene bg corridor
            $ set_ambient("cool")
            show alice think at left
            show zhang think at center
            show mo think at right
            with dissolve
            play sound se_footstep
            "张子谦戴着学生会的红袖章，正挤在队伍里维持秩序。看见我们，他掏出手机，点开了一张照片。"
            zhang "两点半，一位家长偷拍的，传到群里以后就炸了。我是来巡查的，可说实话，我看了也有点发毛。"
            "照片有点糊。幕布上，六个影子排成一排，最尽头，站着一个小小的第七个。"
            mc "你把六个影子放大看。"
            "六个影子的边缘都镶着一圈暖黄的光，而且个个头大身子小——台灯放在地上朝上照，影子越往上放得越大，越吓人。"
            show alice shock at left
            alice "第七个不一样！它的边是冷白色的，像手电筒的光……"
            mc "而且它比例很正常，一点都不吓人。你看它手里灯笼的光斑——是斜着往下拖的。"
            mc "照出它的光，不是从地上往上打的。是从一米七左右的高处，斜着往下照。"
            show zhang shock at center
            zhang "一米七？幕布后面的台灯，可全是放在地上的啊。"
            show mo smile at right
            play sound se_write
            mo_note "六盏暖灯在地上。第七盏冷灯，在半空里。"
            $ haunted_inspect_spot("h6")
            jump haunted_case_investigate

label haunted_case_review_intro:
    scene bg rooftop
    $ set_ambient("dusk")
    $ play_bgm(bgm_mystery, fadein=1.2, fadeout=0.8)
    show alice smile at left
    show mo neutral at right
    with dissolve

    "六处线索全部查完，离四点只剩二十分钟。我们躲到教学楼的天台上，楼下的操场里，文化祭的彩旗被风吹得哗哗响。"
    "墨墨在笔记本上画了一道长长的幕布，又在幕布外面，画了四盏小小的灯。"
    play sound se_write
    mo_note "一个影子，要四样东西：一盏灯，一样挡光的东西，一个时机，一只举灯的手。"
    alice "那就一盏一盏点亮！光从哪来、照出来的是什么、它什么时候出现、举灯的人是谁——四盏灯全亮了，第七个影子就无处可藏！"
    if _hh_replays > 0:
        sysmsg "【影子回廊 · 重玩挑战】当前历史最佳：[_hh_best_text]。零失误点亮四盏灯，就能拿下金牌。"
    else:
        sysmsg "【影子回廊 · 点亮四盏灯】依次选出「光源 → 投影 → 时机 → 掌灯人」。零失误可获金牌，失误只计入本案评级，不影响主线。"

label haunted_lamp_k1:
    show screen haunted_lamp_banner(0, "第一盏 · 光源：台灯都放在地上、全是暖黄的，第七个影子却镶着冷白光边——光从哪里来？")
    menu:
        "六号位撑伞人的那盏台灯——一个人被两盏灯照出了两个影子":
            hide screen haunted_lamp_banner
            $ _hh_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "可六盏台灯都是暖黄色的、都放在地上呀。照片里第七个影子的光边是冷白的，还是从高处斜着照下来的。"
            play sound se_write
            mo_note "暖灯照不出冷边。再看一眼那张照片。"
            jump haunted_lamp_k1

        "窗帘缝里漏进来的午后阳光":
            hide screen haunted_lamp_banner
            $ _hh_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "窗缝都用黑胶带封死了哦。再说上午十点多它就出现过——太阳总不能一整天，只照带小孩子的那几组吧。"
            play sound se_write
            mo_note "太阳不会挑客人。"
            jump haunted_lamp_k1

        "后门小窗外伸进来的一束冷白手电光":
            hide screen haunted_lamp_banner
            play sound se_correct
            $ _hh_lamps = 1

    mc "照片里第七个影子镶着冷白的光边，光从一米七左右的高处斜着往下照；可六盏台灯都是暖黄的、都放在地上。后门的黑卡纸上，正好在一米七高的地方，划开了一扇只能从走廊掀开的小窗——照出第七个影子的，是从小窗外伸进来的一束冷白手电光。"

label haunted_lamp_k2:
    show screen haunted_lamp_banner(1, "第二盏 · 投影：第七格堆着两层课桌、排班表写着不站人——挡住手电光的，是什么？")
    menu:
        "一个粘在竹签上的剪纸小人——贴着手电举着，一掌高就能投出一个孩子那么高":
            hide screen haunted_lamp_banner
            play sound se_correct
            $ _hh_lamps = 2

        "有人缩在第七格的课桌堆后面，探出了半个身子":
            hide screen haunted_lamp_banner
            $ _hh_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "那堆课桌叠了两层，椅子腿还朝天卡在缝里，连只猫都塞不进去呀。六号位的同学就站在旁边，有人钻进去不可能听不见。"
            play sound se_write
            mo_note "挡光的东西，不一定要和影子一样大。"
            jump haunted_lamp_k2

        "黑卡纸上刻出来的一个镂空小人":
            hide screen haunted_lamp_banner
            $ _hh_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "镂空的话，光是从小人的形状里漏过去的——幕布上照出来的会是一个亮亮的小人，不是黑黑的影子哦。再说那扇小窗，只是一个四四方方的口子。"
            play sound se_write
            mo_note "剪下来的那一块，不在窗上。垃圾桶里，只剩下边角。"
            jump haunted_lamp_k2

    mc "第七格堆满课桌、不站人，可要有影子，就得有东西挡住光。走廊垃圾桶里剪剩的红纸边角，剪走的正是一个提灯笼的小人，还粘着竹签——贴着手电举在小窗口，一掌高的剪纸，就能在幕布上投出一个孩子那么高的影子。"

label haunted_lamp_k3:
    show screen haunted_lamp_banner(2, "第三盏 · 时机：四沓夹着粉色儿童票的票根、四张蜡笔画——它什么时候才会出现？")
    menu:
        "每隔四十来分钟，定时出现一次":
            hide screen haunted_lamp_banner
            $ _hh_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "10:12、11:05、13:48、14:30——一会儿隔五十来分钟，一会儿隔两个多小时，一点都不准时呀。"
            play sound se_write
            mo_note "时钟不会挑客人。看票根的颜色。"
            jump haunted_lamp_k3

        "只在带着小孩子的游客，快走到出口的时候":
            hide screen haunted_lamp_banner
            play sound se_correct
            $ _hh_lamps = 3

        "只在鬼屋里有人尖叫得特别大声的时候":
            hide screen haunted_lamp_banner
            $ _hh_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "中学生那二十三组，一组叫得比一组响，可一组也没看见它呀。孩子们画的它，也一点都不吓人，是在挥手。"
            play sound se_write
            mo_note "它不是被吓出来的。它是来接人的。"
            jump haunted_lamp_k3

    mc "看见第七个影子的四组，票根里每一组都夹着粉色儿童票；全是中学生的二十三组，一组也没见过它。孩子们画在留言卡上的，是一个站在门边冲他们挥手的小人——它不是定时出现的鬼，它只在带着孩子的游客快走到出口时，才亮起来。"

label haunted_lamp_k4:
    show screen haunted_lamp_banner(3, "第四盏 · 掌灯人：站在后门外、看得见谁快到出口、手边有剪刀和胶带——举灯的人是谁？")
    menu:
        "出口引导，宁柚":
            hide screen haunted_lamp_banner
            play sound se_correct
            $ _hh_lamps = 4
            show screen deduction_cutin(headline=_("四盏灯全部点亮 ——！"), subline="THE SEVENTH SHADOW")
            with flash_shutter

        "检票的小林——她最清楚哪一组带着孩子":
            hide screen haunted_lamp_banner
            $ _hh_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "小林一整天都坐在前门检票，饼干盒里的票根一沓也没断过。前门和后门，可隔着整整一间教室呀。"
            play sound se_write
            mo_note "知道的人，不一定是举灯的人。灯在后门外。"
            jump haunted_lamp_k4

        "六号位演撑伞人的同学——他离第七格最近":
            hide screen haunted_lamp_banner
            $ _hh_mistakes += 1
            play sound se_wrong
            show alice smile at left
            show mo think at right
            alice "六号位在幕布里面呀。可那扇小窗只能从走廊那一侧掀开，照片里的光也是从门外斜着照进来的。"
            play sound se_write
            mo_note "他离第七格近，可那是在门里面。灯，在门外。"
            jump haunted_lamp_k4

    mc "能站在后门外、看得见谁快走到出口、手边就有剪刀和胶带、一整天都守在那扇小窗旁边的人——排班表最下面那行铅笔字早就写好了。出口引导，宁柚。第七个影子，是她站在走廊里，一只手举着手电，一只手举着剪纸，替每一个害怕的孩子点亮的。"
    show alice happy at left
    alice "四盏灯全亮了！走，去后门——把第七个影子，请到灯底下来。"

label haunted_case_resolution:
    scene bg corridor at bg_kenburns_in
    $ set_ambient("dusk")
    $ play_bgm(bgm_warm, fadein=1.5, fadeout=1.0)
    show alice smile at left
    show mo smile at right
    with dissolve

    play sound se_footstep
    "我们回到后门的时候，鬼屋已经重新放人进去了。宁柚抱着一箱水果糖，正蹲在出口的小桌子边，往篮子里一把一把地倒。"
    "她个子小小的，齐耳短发，校服袖口上沾着一点红色的纸屑。"
    alice "宁柚同学？"
    "她吓了一跳，手里的糖哗啦啦撒了一桌。"
    ningyou "……艾、艾丽丝社长？鬼屋……出什么事了吗？"
    mc "没出事。我们只是来还一样东西。"
    "我从口袋里掏出那张拼好的红纸——中间空着一个提灯笼的小人。"
    "宁柚盯着它看了很久，低下头，从糖果篮底下摸出一支小手电，和一根竹签。竹签的那一头，粘着一个红色的剪纸小人：两个小揪揪，手里提着一盏圆灯笼。"
    ningyou "……对不起。卡纸是我划开的。我、我这就去把它粘回去。"
    show alice think at left
    alice "先别急着道歉。能告诉我们为什么吗？"
    ningyou "……上午十点多，有一个小男孩跟着妈妈从里面出来，哭得喘不上气。"
    ningyou "他一直回头看，说里面全是怪物，没有一个好人。他妈妈怎么哄都哄不好。"
    ningyou "我就想……鬼屋可以吓人。可是走到最后，总该有一个人，跟他说一声『别怕，出口在这儿』。"
    ningyou "我小时候，外公在庙会上演皮影。他说，影子最会吓人，也最会哄人。"
    ningyou "我就用包糖剩下的红纸剪了一个小人，在卡纸上划了一扇小窗。每次从小窗里看见有小朋友快走到出口了，我就打开手电，把它举起来，冲他们挥挥手。"
    ningyou "那个小男孩后来又排了一次队。出来的时候，他跟我说：『里面有个提灯笼的小姐姐，她跟我说再见。』"
    show alice shock at left
    alice "那你为什么不跟班里说呢？"
    ningyou "……开班会的时候，大家投票，要做『全校最吓人的鬼屋』。我举手问，能不能加一个不吓人的影子，大家都笑了。"
    ningyou "后来林班长就让我在外面发糖。我知道她是好意，我……我本来也不太敢待在暗的地方。"
    ningyou "我怕说出来，大家会觉得我在拆台，把好好的鬼屋弄得不吓人了。我没想到……会有人说是闹鬼，还要关门。"
    "她的声音越来越小，手里的竹签被捏得发白。"
    show mo think at right
    play sound se_page
    "墨墨走过去，在笔记本上写了一行字，转过来给她看。"
    play sound se_write
    mo_note "你的影子没有吓到人。它是整间鬼屋里，唯一一个在照路的。"
    "宁柚看着那行字，眼眶一点一点红了。"

    scene bg classroom at bg_kenburns_out
    $ set_ambient("night")
    show alice smile at left
    show huang think at center
    show mo smile at right
    with dissolve
    play sound se_door
    "四点整，黄老师准时出现在后台。林思思站在他旁边，大气都不敢出。"
    huang "怎么样？第七个影子，讲清楚了没有？"
    alice "讲清楚了。黄老师，请您到回廊里走一趟——就从前门进。"
    "黄老师皱着眉头走进了回廊。长发女鬼、无头书生、黑猫、稻草人、撑伞人、提刀厨师，一个接一个从幕布上扑过来。"
    "快走到出口的时候，幕布尽头亮起一小片冷白的光。一个提着灯笼的小人站在那里，冲他挥了挥手。"
    "然后，后门上的小窗『啪』地合上了。宁柚举着手电和竹签，从门后探出半个脑袋。"
    show huang shock at center
    huang "……就这个？"
    mc "就这个。一支小手电，一个剪纸小人，一个站在走廊里、怕小朋友哭着出门的同学。幕布后面，从来都只有六个人。"
    show huang smile at center
    huang "暗房里不许点蜡烛，不许多站人。手电是充电的，人站在走廊里——这一条，不算违规。"
    huang "不过卡纸是公物。小窗拿硬纸板正正经经做个框，五点之前我再来查一遍。"
    hide huang
    show banzhang sad at center
    "黄老师一走，林思思就红着眼圈冲到了宁柚面前。"
    banzhang "你为什么不早说呀！我还以为……我还以为是有人故意来捣乱的。"
    ningyou "对不起，班长。我划坏了卡纸……"
    show banzhang smile at center
    banzhang "谁要你道歉了！我是说，这么好的点子，你干嘛一个人偷偷做！"
    banzhang "明天第七格不堆课桌了。我们腾一块地方出来，给『提灯笼的小向导』单独留一盏灯——你来演。"
    ningyou "……我？可是我怕黑。"
    show alice happy at left
    alice "那正好！第七个影子，本来就站在最亮的地方。"
    "后门外的队伍里，一个扎着羊角辫的小女孩踮着脚往里看，攥着妈妈的衣角。"
    lele "妈妈，里面那个提灯笼的姐姐，今天还在吗？"
    "宁柚愣了一下，然后蹲下来，把竹签上的小人举到小女孩面前，轻轻晃了晃。"
    ningyou "在的。她会在出口，等你出来。"

    scene bg agency at bg_kenburns_in
    $ set_ambient("warm")
    show alice happy at left
    show mo smile at right
    with dissolve
    play sound se_bell
    "第二天，高一(1)班的鬼屋招牌底下多了一行小字：『第七个影子，在出口等你。』"
    "张子谦说，那天下午带着孩子来排队的家长，比前一天多了一倍。学生会的群里，有人把那张照片重新发了一遍，配了一句：『原来是来送人的。』"
    "放学后，艾丽丝把抽屉里的卷宗一份一份摊在桌上：闭馆的图书馆、下雨的剧场、北窗的画室、运动会的失物箱，再加上这一次的鬼屋。"
    alice "五桩短案、两篇番外、一本复盘本——全都散在抽屉里，每次找都要翻半天！"
    mc "所以？"
    alice "所以本社长决定了！万事屋要有一只番外卷宗夹！所有的番外和短案，统统收进同一只夹子里。想看哪一桩，翻开就到！"
    "她从柜子顶上搬下一只旧皮面的卷宗夹，『啪』地拍在桌上，掸了掸灰。"
    "墨墨接过卷宗夹，没有急着往里塞案子，而是先在扉页的角落里，贴上了一个小小的剪纸人——两个小揪揪，手里提着一盏灯笼。"
    play sound se_write
    mo_note "翻卷宗的时候，也有一盏灯照着。"
    show alice smile at left
    alice "好！万事屋番外卷宗，今天正式合订！"

    call _haunted_finish_case(_hh_mistakes) from _call__haunted_finish_case
    return
