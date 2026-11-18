## 《沉默侦探：千纸鹤的约定》—— PC-8 校园旧广播站推理来信电台与千纸鹤折纸图谱陈列柜
## radio_origami.rpy
##
## 设计要点：
##   1. 100% 零侵入主线剧情（script.rpy / chapter1..6.rpy / definitions.rpy 推理与好感公式零改动）。
##   2. 「校园旧广播站推理来信电台」（screen extras_radio_booth + 3 段可游玩暮色电波短篇）：
##      墨墨与艾丽丝搭档值守旧社团楼三楼广播站（FM 88.6），支持播音台三项来信物证预检、
##      听众明信片与盘式磁带原件弹窗，以及三场完整直播推理剧场（B-01 / B-02 / B-03），
##      选错触发双人即兴救场互动且零死档、零污染主线，持久化于 persistent.radio_booth_records。
##   3. 「千纸鹤折纸图谱陈列柜」（screen extras_origami_cabinet + 誓约短册折检弹窗）：
##      胡桃木丝绒玻璃陈列柜收录贯穿全篇的 12 式命名千纸鹤折法图谱与誓约短册（C-01..C-12），
##      支持三折步进演示与「亲手折检并展阅誓约签」，核心真相款严格联动 truth_spoiler_unlocked()
##      实现零侧信道防剧透保护，持久化于 persistent.origami_cabinet_records。

# —— PC-8 鉴赏室复古水彩 UI 图标命名别名（128x128 RGBA 透明底）——
image ui_icon_radio_booth_mic      = "images/ui/icon_radio_booth_mic.png"
image ui_icon_listener_letter_tape = "images/ui/icon_listener_letter_tape.png"
image ui_icon_origami_cabinet      = "images/ui/icon_origami_cabinet.png"
image ui_icon_golden_vow_crane     = "images/ui/icon_golden_vow_crane.png"

init python:

    # 动态注册 PC-8 双成就，使鉴赏室成就页扩展为 2×11（共 22 枚）严整偶数列对称排布
    if "register_extra_achievement" in globals():
        register_extra_achievement(
            "ach_radio_booth",
            "暮色电波解谜人",
            "破解校园旧广播站推理来信电台的全部三封听众匿名来信。",
            False,
        )
        register_extra_achievement(
            "ach_origami_cabinet",
            "千纸鹤折纸图谱家",
            "在千纸鹤折纸图谱陈列柜中亲手折检集齐全部十二式纸鹤誓约签。",
            False,
        )

    ############################################################################
    ## 一、校园旧广播站推理来信电台（FM 88.6 · 3 封听众来信档案与直播台状态）
    ############################################################################

    RADIO_BROADCASTS = [
        {
            "id": "b1",
            "code": "B-01",
            "label": "radio_letter_b1",
            "freq_tag": "FM 88.6 · 周三 16:15 午后弦音档",
            "title": "第三音乐室午后四点的幽灵伴奏",
            "short_title": "音乐室的幽灵伴奏",
            "callsign": "匿名听众：高二（3）班「怕黑的节拍器」",
            "bg_key": "clubroom",
            "bg_thumb": "images/bg_clubroom.png",
            "lighting_note": "BG_LIGHT[clubroom/corridor/sunset] 午后斜阳暖金 -> 走廊暮光色温",
            "companions": "艾丽丝（主播） · 墨墨（导播手记） · 吕芙 · 林依依",
            "spoiler": False,
            "summary_pub": (
                "连续三周的周三下午四点整，旧艺术楼尽头半闲置的第三音乐室里总会准时响起《月光》第二声部"
                "的温柔钢琴伴奏，并在来信听众遗落的琴谱夹里留下一行铅笔指法批注。然而四点零五分推门进去时，"
                "琴房里却空无一人，只余窗外斜阳与尚带微温的黄铜踏板。"
            ),
            "postcard_salutation": "致旧广播站『万事屋暮色点播台』的主持人与沉默导播：",
            "postcard_body_pub": (
                "下周五就是校园秋季室内乐汇演了，我因为总在独奏换把时紧张抢拍，每天放学前都会把谱夹留在"
                "第三音乐室预热。奇怪的是，最近三个周三下午四点整，我刚走到二楼楼梯口，就能听见三楼琴房传出"
                "稳稳托住我主旋律的钢琴伴奏。可每次我跑上楼推开门，琴盖已经合上，只有窗边谱架多了一句极温柔的"
                "铅笔批注。今天路过的一年级学弟说，四点零二分曾在毛玻璃门外瞥见一道『至少一米八的高大黑影』！"
                "请问那位不肯露面的『幽灵伴奏者』究竟是谁？我想当面把汇演双人票递给TA。"
            ),
            "on_air_echo_pub": (
                "直播间回音带记录：节目尾声，艾丽丝特意没有点破林依依的名字，只在电波里轻轻播放了一小段"
                "《月光》四手联弹，告诉『隔壁第二琴房那位借琴练习的害羞伴奏家』——明天下午四点，第三音乐室"
                "的琴凳已经留好了并排的位置。"
            ),
            "mo_booth_note_pub": "墨墨导播手记：「夕阳会把很短的影子拉得很长，也会把不好意思说出口的鼓励，悄悄送到谱架上。」",
            "alice_booth_note_pub": "艾丽丝主播按语：「哼哼，用西窗十四度斜阳破获『一米八幽灵假象』——本社长今天的电台收听率绝对全校第一！」",
            "booth_clues": [
                {
                    "id": "b1_c1",
                    "label": "台前物证一 · 延音踏板与琴凳旋钮",
                    "surface": "立式钢琴右侧黄铜延音踏板留有极淡松香白粉，升降琴凳却锁死在最低档。",
                    "detail": (
                        "导播台实测笔记：旋转式升降琴凳停在 45 厘米最低刻度且丝杆积尘未动，说明弹奏者并未坐下"
                        "调高琴凳，而是俯身半站着弹奏了不到两分钟便匆匆离开；踏板左侧边缘沾着弦乐松香微尘。"
                    ),
                },
                {
                    "id": "b1_c2",
                    "label": "台前物证二 · 西窗百叶格栅斜影照",
                    "surface": "学弟在走廊拍下的毛玻璃逆光照，墙面投影显得比琴身还高出一截。",
                    "detail": (
                        "导播台实测笔记：十月下旬 16:02 太阳高度角仅约 14 度，光线自西侧低窗斜射入室，"
                        "身高 158 厘米的人只要站在靠近西窗的谱架前，投在东侧毛玻璃上的斜影就会被放大到一米八以上。"
                    ),
                },
                {
                    "id": "b1_c3",
                    "label": "台前物证三 · 琴房借用簿与铅笔批注",
                    "surface": "隔壁第二琴房 15:55 登记了林依依的名字，谱面批注尾钩带图书索书号写法。",
                    "detail": (
                        "导播台实测笔记：铅笔批注里的数字『4』采用图书馆手写索书卡特有的开口斜竖写法，"
                        "而林依依已毕业的姐姐曾是器乐社钢琴伴奏，姐妹俩最熟悉这首曲子的换气留白。"
                    ),
                },
            ],
        },
        {
            "id": "b2",
            "code": "B-02",
            "label": "radio_letter_b2",
            "freq_tag": "FM 88.6 · 周五 16:40 雨霁花房档",
            "title": "植物园温室消失的蓝玫瑰名牌",
            "short_title": "温室消失的蓝玫瑰名牌",
            "callsign": "匿名听众：园艺社见习生「雾玻璃水滴」",
            "bg_key": "hall",
            "bg_thumb": "images/bg_hall.png",
            "lighting_note": "BG_LIGHT[clubroom/hall/riverside] 雨后清透天光 -> 河畔暖橙微光",
            "companions": "艾丽丝（主播） · 墨墨（导播手记） · 张子谦 · 高社长",
            "spoiler": False,
            "summary_pub": (
                "校园开放日前夕，玻璃温室 C 号花架上为嫁接品种『蓝色华尔兹』亲手题写的花边展示名牌，"
                "在下午三点二十至四点之间不翼而飞，原处只剩一张微潮泛酸香的空白水彩卡纸。"
                "温室门锁完好，地面却少了一串本该留下的干泥鞋印。"
            ),
            "postcard_salutation": "致旧广播站『万事屋暮色点播台』的各位侦探：",
            "postcard_body_pub": (
                "为了明天的校园植物展，我练了整整两周蘸水钢笔字，才在棉浆水彩卡上写好『蓝色华尔兹』的品种故事。"
                "今天下午 15:20 我去教学楼拿丝带，16:02 赶回玻璃温室时，喷雾器刚刚停下，花盆边却只剩一张"
                "湿漉漉的空白卡纸，凑近闻还有股淡淡的柠檬酸味！有人怀疑是隔壁展区恶作剧顺走了名牌，"
                "也有人说是四点整的自动喷雾把字迹冲掉了。我不想冤枉任何同学，能帮我在闭馆前找回真相吗？"
            ),
            "on_air_echo_pub": (
                "直播间回音带记录：借着广播站真空管台灯的侧逆光，那张『无字卡纸』上的钢笔压痕被完整念出，"
                "高社长也在温室北窗烘干架第三格捧回了字迹稍淡却干净平整的原版名牌，还附赠了一整瓶新墨水。"
            ),
            "mo_booth_note_pub": "墨墨导播手记：「可洗皇家蓝墨水怕酸不怕真心，侧着光看，每一笔认真的压痕都还在纸纤维里。」",
            "alice_booth_note_pub": "艾丽丝主播按语：「打翻保鲜柠檬酸水还想买新卡纸偷偷补写——笨拙前辈的善意慌张，也是青春推理的醍醐味嘛！」",
            "booth_clues": [
                {
                    "id": "b2_c1",
                    "label": "台前物证一 · 喷雾电磁阀双刻水垢",
                    "surface": "温室自动喷雾每逢整点启动，但 C 区手动旁通旋钮留有 15:35 的新水渍。",
                    "detail": (
                        "导播台实测笔记：温室红砖地面一旦沾上干鞋灰极易显迹；15:35 有人短暂拧开过 C 区手动喷雾十秒，"
                        "既是为了冲洗打翻在花架上的溶液，也顺带让细雾盖住了匆忙进出的鞋印。"
                    ),
                },
                {
                    "id": "b2_c2",
                    "label": "台前物证二 · 卡纸柠檬酸香与侧光压痕",
                    "surface": "所谓『空白卡纸』并非原卡，侧光下可见三行浅浅的圆珠笔垫写凹痕。",
                    "detail": (
                        "导播台实测笔记：纯蓝可洗钢笔水（苯胺蓝染料）遇弱酸性鲜花保鲜剂（柠檬酸溶液）会迅速消色，"
                        "而现场这张卡其实是垫在底下的备用衬卡，正面边缘洇着一圈被柠檬酸褪成淡青的墨晕。"
                    ),
                },
                {
                    "id": "b2_c3",
                    "label": "台前物证三 · 走廊湿袖口与北窗烘干架",
                    "surface": "张子谦 15:38 撞见高社长袖口微湿奔向校外文具店，围裙沾有保鲜粉晶粒。",
                    "detail": (
                        "导播台实测笔记：高社长帮学妹调配鲜切花柠檬酸保鲜液时不慎溅湿名牌，生怕字迹晕花毁了她的心血，"
                        "便用吸水纸吸干原卡放到温室北窗通风烘干架第 3 格，自己跑去买同款棉浆卡想照着垫痕重抄赔罪。"
                    ),
                },
            ],
        },
        {
            "id": "b3",
            "code": "B-03",
            "label": "radio_letter_b3",
            "freq_tag": "FM 88.6 · 深秋 17:20 晚霞收台特辑",
            "title": "旧广播站天台寄往四年前的电波",
            "short_title": "寄往四年前的天台电波",
            "callsign": "匿名听众：代号「折翼纸鹤呼叫台」",
            "bg_key": "sunset",
            "bg_thumb": "images/bg_sunset.png",
            "lighting_note": "BG_LIGHT[clubroom/rooftop/sunset] 暮秋琥珀晚霞 -> 真空管暖橙微光",
            "companions": "艾丽丝（主播） · 墨墨（特别发声/手记） · 王老师",
            "spoiler": True,
            "summary_pub": (
                "检修旧社团楼三楼广播站备用发射机时，值班抽屉深处翻出了一盘四年前深秋封存的测试盘式磁带"
                "与半页缺角值机日志。磁带末尾录着三短一长两短的清脆铜铃声，日志上却写着『17:25 天台副线未接通』——"
                "那道看似发往空无一人的天台电波，其实藏着一段温柔的校园声学约定。"
            ),
            "postcard_salutation": "致四年后仍守在旧广播站真空管话筒前的你：",
            "postcard_body_pub": (
                "如果你在整理广播站樟木储物柜时听见这盘测试带，请别惊讶为什么末尾只有风声和六下铜铃轻响。"
                "那年十月底的傍晚，旧社团楼广播专线正在大修，调音台显示『天台监听回路断路』，所有人都以为"
                "那段试音只录进了空磁带里。可值机簿最后一栏留着一道奇怪的折纸压痕提示——当时的播音员究竟是怎样"
                "在断路状态下，确认天台上的朋友已经听见这段晚霞问候的呢？"
            ),
            "postcard_deep_secret": (
                "【TRUE END 纪念附笺 · 四年后的回信】\n"
                "磁带防尘纸袋夹层里，还压着半张当年小雪与小可约好去河堤折纸鹤前留下的试音字条。"
                "当年没能跨越冬夜的那句回答，如今终于在夕阳染红的旧广播站里，由重新开口的墨墨握住黄铜话筒，"
                "对着满城晚霞亲口念出了回音：「呼叫折翼纸鹤台——四年前的电波，我们已经稳稳收到了。」"
            ),
            "on_air_echo_pub": (
                "直播间回音带记录：破解『开窗直达声与天台铁盒铜铃回敲』的双向呼号后，墨墨在暮色里轻轻敲响"
                "三短一长两短的清脆铜铃，让四年前未曾中断的温柔约定在 FM 88.6 的收台晚风里圆满落幕。"
            ),
            "on_air_echo_secret": (
                "直播间真约回音带（TRUE END 典藏版）：晚霞铺满播音台时，墨墨推开笔记本，第一次在旧广播站的"
                "真空管话筒前清晰而温柔地开口报幕——向周可、向艾丽丝、也向身旁的搭档许下明天的日常之约。"
            ),
            "mo_booth_note_pub": "墨墨导播手记：「哪怕线路断了，只要推开三楼的木窗，晚风也会把铜铃声一字不漏地送到天台上。」",
            "mo_booth_note_secret": "墨墨导播手记（真约续笔）：「以前我总怕自己的声音追不上过去的电波；现在我知道，只要你在导播台对面点头，我就能把每一句『明天见』亲口念完。」",
            "alice_booth_note_pub": "艾丽丝主播按语：「三短一长两短，合起来就是『我听见啦』！旧广播站最浪漫的收台压轴案，圆满封盘！」",
            "alice_booth_note_secret": "艾丽丝主播按语（真约续笔）：「呜……刚才墨墨对着话筒念出收台词的时候，本社长差点把导播台纸巾抽空了！这盘磁带我要锁进万事屋最高机密铁盒珍藏一辈子！」",
            "masked_spoiler_hint": "【防剧透火漆封存：本辑含四年前旧案回响与 TRUE END 重新发声专属尾声，通关 TRUE END 或手动开启剧透后自动显影】",
            "booth_clues": [
                {
                    "id": "b3_c1",
                    "label": "台前物证一 · 调音台回路日志与北窗插销",
                    "surface": "日志载明 17:25 天台有线监听断路，但播音室正对天台楼梯井的气窗记着『全开』。",
                    "detail": (
                        "导播台实测笔记：旧社团楼三楼播音室北侧木气窗距离天台铁门仅九米，推开气窗后无需经过故障电缆，"
                        "室内清脆的高频铜铃声就能顺着楼梯井气流直接传上天台。"
                    ),
                },
                {
                    "id": "b3_c2",
                    "label": "台前物证二 · 盘式磁带尾端双色音色差",
                    "surface": "磁带末尾共有两组『三短一长两短』铃声，后一组比前一组轻柔且混有晚风鸟鸣。",
                    "detail": (
                        "导播台实测笔记：第一组是播音室话筒近距离录下的黄铜桌铃直达音；相隔 2.4 秒后的第二组，"
                        "则是九米外天台上的人听见暗号后，用随身小风铃隔窗敲回来的远场应答音！"
                    ),
                },
                {
                    "id": "b3_c3",
                    "label": "台前物证三 · 值机簿边角的折纸谷线暗记",
                    "surface": "日志缺角处留有十字对角谷折压痕，背面铅笔写着『收信人已折翼签收』。",
                    "detail": (
                        "导播台实测笔记：播音员把值机簿一角裁成小正方形，折成千纸鹤从气窗飘向楼梯平台，"
                        "天台上的朋友捡起后折弯右翼尖作为『收到电波』的回执，证明那从来不是无人回应的独白。"
                    ),
                },
            ],
        },
    ]

    _RADIO_BY_ID = {b["id"]: b for b in RADIO_BROADCASTS}

    def radio_get_def(broadcast_id):
        return _RADIO_BY_ID.get(broadcast_id, RADIO_BROADCASTS[0])

    def _ensure_radio_store():
        if getattr(persistent, "radio_booth_records", None) is None:
            persistent.radio_booth_records = {}
        return persistent.radio_booth_records

    def radio_get_record(broadcast_id):
        bdef = radio_get_def(broadcast_id)
        bid = bdef["id"]
        raw = _ensure_radio_store().get(bid) or {}
        return {
            "solved": bool(raw.get("solved", False)),
            "gold_mic": bool(raw.get("gold_mic", False)),
            "postcard_viewed": bool(raw.get("postcard_viewed", False)),
            "best_badge": raw.get("best_badge", "待开播"),
            "last_badge": raw.get("last_badge", "待开播"),
            "replays": int(raw.get("replays", 0)),
            "best_mistakes": raw.get("best_mistakes", None),
            "inspected_clues": list(raw.get("inspected_clues") or []),
            "active_clue": raw.get("active_clue") or bdef["booth_clues"][0]["id"],
        }

    def radio_select_broadcast(broadcast_id):
        bdef = radio_get_def(broadcast_id)
        persistent.radio_selected_broadcast = bdef["id"]
        renpy.save_persistent()

    def radio_inspect_clue(broadcast_id, clue_id):
        bdef = radio_get_def(broadcast_id)
        bid = bdef["id"]
        valid_ids = [c["id"] for c in bdef["booth_clues"]]
        if clue_id not in valid_ids:
            return False
        store_dict = dict(_ensure_radio_store())
        prev = radio_get_record(bid)
        seen = list(prev["inspected_clues"])
        if clue_id not in seen:
            seen.append(clue_id)
        prev["inspected_clues"] = seen
        prev["active_clue"] = clue_id
        store_dict[bid] = prev
        persistent.radio_booth_records = store_dict
        renpy.sound.play("audio/sfx_clue.ogg")
        renpy.save_persistent()
        return True

    def radio_mark_postcard_viewed(broadcast_id):
        bdef = radio_get_def(broadcast_id)
        bid = bdef["id"]
        store_dict = dict(_ensure_radio_store())
        prev = radio_get_record(bid)
        prev["postcard_viewed"] = True
        store_dict[bid] = prev
        persistent.radio_booth_records = store_dict
        renpy.save_persistent()
        return prev

    def radio_open_postcard_modal(broadcast_id):
        bdef = radio_get_def(broadcast_id)
        persistent.radio_selected_broadcast = bdef["id"]
        radio_mark_postcard_viewed(bdef["id"])
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("radio_postcard_modal", broadcast_id=bdef["id"])

    def radio_record_clear(broadcast_id, mistakes_count=0):
        bdef = radio_get_def(broadcast_id)
        bid = bdef["id"]
        m = max(0, int(mistakes_count or 0))
        is_gold = (m == 0)
        cur_badge = "金牌电波主持" if is_gold else "暖心暮色主播"

        store_dict = dict(_ensure_radio_store())
        prev = radio_get_record(bid)
        prev_best_m = prev["best_mistakes"]
        best_m = m if prev_best_m is None else min(int(prev_best_m), m)
        ever_gold = bool(prev["gold_mic"] or is_gold)
        best_badge = "金牌电波主持" if ever_gold else cur_badge

        updated = {
            "solved": True,
            "gold_mic": ever_gold,
            "postcard_viewed": True,
            "best_badge": best_badge,
            "last_badge": cur_badge,
            "replays": int(prev["replays"]) + 1,
            "best_mistakes": best_m,
            "inspected_clues": [c["id"] for c in bdef["booth_clues"]],
            "active_clue": prev["active_clue"],
        }
        store_dict[bid] = updated
        persistent.radio_booth_records = store_dict

        if radio_solved_count() >= len(RADIO_BROADCASTS):
            ach_grant("ach_radio_booth")

        renpy.save_persistent()
        return updated

    def radio_solved_count():
        return sum(1 for b in RADIO_BROADCASTS if radio_get_record(b["id"])["solved"])

    def radio_gold_count():
        return sum(1 for b in RADIO_BROADCASTS if radio_get_record(b["id"])["gold_mic"])

    def radio_postcard_count():
        return sum(1 for b in RADIO_BROADCASTS if radio_get_record(b["id"])["postcard_viewed"])

    def radio_render_postcard_view(broadcast_id):
        """渲染电台来信明信片与回音带视图，严格联动 truth_spoiler_unlocked() 零侧信道保护 B-03 核心剧透。"""
        bdef = radio_get_def(broadcast_id)
        rec = radio_get_record(bdef["id"])
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        has_sp = bool(bdef.get("spoiler", False))

        if has_sp and unlocked:
            deep_note = bdef.get("postcard_deep_secret", "")
            echo_line = bdef.get("on_air_echo_secret", bdef["on_air_echo_pub"])
            mo_note = bdef.get("mo_booth_note_secret", bdef["mo_booth_note_pub"])
            alice_note = bdef.get("alice_booth_note_secret", bdef["alice_booth_note_pub"])
            masked_prompt = ""
        elif has_sp and not unlocked:
            deep_note = ""
            echo_line = bdef["on_air_echo_pub"]
            mo_note = bdef["mo_booth_note_pub"]
            alice_note = bdef["alice_booth_note_pub"]
            masked_prompt = bdef.get("masked_spoiler_hint", "")
        else:
            deep_note = ""
            echo_line = bdef["on_air_echo_pub"]
            mo_note = bdef["mo_booth_note_pub"]
            alice_note = bdef["alice_booth_note_pub"]
            masked_prompt = ""

        return {
            "id": bdef["id"],
            "code": bdef["code"],
            "title": bdef["title"],
            "freq_tag": bdef["freq_tag"],
            "callsign": bdef["callsign"],
            "salutation": bdef["postcard_salutation"],
            "display_body": bdef["postcard_body_pub"],
            "display_echo": echo_line,
            "display_mo_note": mo_note,
            "display_alice_note": alice_note,
            "display_deep_secret": deep_note,
            "display_masked_prompt": masked_prompt,
            "has_spoiler": has_sp,
            "unlocked": (unlocked if has_sp else True),
            "solved": rec["solved"],
            "gold_mic": rec["gold_mic"],
            "best_badge": rec["best_badge"],
        }

    def radio_launch_action(broadcast_id):
        bdef = radio_get_def(broadcast_id)
        return [
            Function(stop_all_gramophone_ambience, True),
            SetField(persistent, "extras_tab", "radio"),
            SetField(persistent, "radio_selected_broadcast", bdef["id"]),
            Replay(bdef["label"], locked=False),
        ]

    ############################################################################
    ## 二、千纸鹤折纸图谱陈列柜（12 式胡桃木丝绒典藏纸鹤 + 折痕教程 + 誓约短册）
    ############################################################################

    ORIGAMI_CATEGORIES = [
        ("all",     "全部图谱"),
        ("campus",  "校园案卷"),
        ("seasons", "四季风物"),
        ("vows",    "电波真约"),
    ]

    ORIGAMI_CRANE_PATTERNS = [
        {
            "id": "c01",
            "code": "C-01",
            "cat": "campus",
            "name": "初遇歪翼白鹤",
            "short_name": "初遇歪翼白鹤",
            "washi_tint": "象牙纯白道林纸",
            "origin_tag": "序章 · 图书馆的冤案",
            "fold_style": "不对称谷折起手式（右翼偏宽两毫米）",
            "steps": ["第壹折 · 方纸十字谷折", "第贰折 · 双菱提翼微偏", "第叁折 · 轻吹鹤腹定型"],
            "spoiler": False,
            "crease_lore": (
                "折痕考据：用随手裁下的笔记本内页折成，因折纸新手力道太紧，鹤颈留有两道反复修正的浅折印，"
                "右侧翅膀比左侧宽出约两毫米，立在图书馆木桌上时会微微朝右边歪头。"
            ),
            "mo_note": "虽然一边翅膀歪歪的，却是升上高中以后，第一只没有半点犹豫递到我面前的纸鹤。一直夹在笔袋最里层。",
            "alice_note": "哈哈，陈默这手艺在幼儿园手工班顶多拿个及格分！不过看某位侦探小姐宝贝得连压痕都舍不得抚平，勉强算一百分啦。",
            "vow_slip": "「对不起，刚才误会了你——从今天起，你说不出口的推理，我替你说。」",
        },
        {
            "id": "c02",
            "code": "C-02",
            "cat": "campus",
            "name": "代价簿金边鹤",
            "short_name": "代价簿金边鹤",
            "washi_tint": "奶油描金账本裁边纸",
            "origin_tag": "第一章 · 万事屋的铜铃与账本",
            "fold_style": "双菱内翻锁角式（翼尖保留烫金细线）",
            "steps": ["第壹折 · 烫金边朝外对折", "第贰折 · 鹤胸内翻压棱", "第叁折 · 底座平折镇纸"],
            "spoiler": False,
            "crease_lore": (
                "折痕考据：选用艾丽丝定制精装《万事屋代价账本》裁余的加厚奶油纹纸，骨刀刮棱干脆利落，"
                "腹部特意折出八毫米平底托面，可稳稳压住窗边被穿堂风吹起的委托单。"
            ),
            "mo_note": "艾丽丝嘴上说一页账本纸值两块草莓小蛋糕，却趁我们不注意折了三只镇在社团桌角。",
            "alice_note": "咳咳！本社长那是为了提升事务所桌面美学规格！委托费可不会因为纸鹤好看就打折哦！",
            "vow_slip": "「万事屋社规第一条：每一桩委托都要有始有终，每一位同伴都不准掉队。」",
        },
        {
            "id": "c03",
            "code": "C-03",
            "cat": "campus",
            "name": "天台防风信笺鹤",
            "short_name": "天台防风信笺鹤",
            "washi_tint": "浅杏牛皮速写纸",
            "origin_tag": "第二章 · 天台上的恐吓信",
            "fold_style": "双压扣翼防风折（逆风重心前倾）",
            "steps": ["第壹折 · 牛皮纸斜向紧压", "第贰折 · 翼根双扣防散", "第叁折 · 鹤喙微俯破风"],
            "spoiler": False,
            "crease_lore": (
                "折痕考据：针对旧楼三楼天台强劲的午间穿堂风改良而成，两翼根部各多加一道内扣反折，"
                "即便摆在铁丝网旁的便当盒盖上迎风吹拂，翅膀也只会轻轻震颤而绝不散架。"
            ),
            "mo_note": "那天风很大，你用便当盒盖替我挡住吹乱的书页，我便在盒盖背面学会了这种不怕风的折法。",
            "alice_note": "既能当便当镇纸，又能顺手测试天台风向与碎纸飘落轨迹，简直是侦探外勤标准装备！",
            "vow_slip": "「无论天台的风有多冷，总会有人替你把被吹乱的纸页一页页按稳。」",
        },
        {
            "id": "c04",
            "code": "C-04",
            "cat": "campus",
            "name": "红茶藏糖餐巾鹤",
            "short_name": "红茶藏糖餐巾鹤",
            "washi_tint": "米白双层压花茶巾纸",
            "origin_tag": "午后茶话会 · 伯爵红茶暗格折",
            "fold_style": "腹腔中空鼓折法（内藏琥珀方糖一粒）",
            "steps": ["第壹折 · 餐巾轻柔十字折", "第贰折 · 留空腹腔纳糖", "第叁折 · 双翼合拢掩香"],
            "spoiler": False,
            "crease_lore": (
                "折痕考据：餐巾纸纤维松软不能死压折痕，故以指腹轻拢代替指甲刮棱，在鹤腹中央留出恰好容纳"
                "一粒一厘米见方黄糖块的立体菱形小腔，袖口往往会因此沾上一星亮晶晶的细糖砂。"
            ),
            "mo_note": "因为记得你查案用脑过度时会偷偷想喝甜红茶，又不好意思在艾丽丝面前伸手拿糖夹呀。",
            "alice_note": "好哇！我说茶罐里怎么凭空蒸发了一块进口琥珀方糖，原来是被这只胖肚子纸鹤偷渡走啦！",
            "vow_slip": "「苦涩的红茶与棘手的谜题，都给你留好了一小块恰到好处的甜。」",
        },
        {
            "id": "c05",
            "code": "C-05",
            "cat": "seasons",
            "name": "春樱压花书签鹤",
            "short_name": "春樱压花书签鹤",
            "washi_tint": "淡樱粉云母植物纤维纸",
            "origin_tag": "春之笺 · 樱花坡道招新桌",
            "fold_style": "扁平夹叶书签折（厚度不足一毫米）",
            "steps": ["第壹折 · 薄和纸嵌花瓣折", "第贰折 · 省去吹腹平压", "第叁折 · 缀系绯色丝绦"],
            "spoiler": False,
            "crease_lore": (
                "折痕考据：专为夹入精装书页设计的超薄平面折式，省略立体鼓腹步骤，将两枚吸干晨露的早樱花瓣"
                "封在半透明云母纸夹层中，合上书脊也不会撑伤装订线。"
            ),
            "mo_note": "每次翻开那本译作读到折角页，都能看见四月坡道上落满招新长桌的粉白春光。",
            "alice_note": "这可是万事屋春季招新的头号吉祥物！好多高一学妹都是冲着樱花书签鹤才停下来填委托表的呢。",
            "vow_slip": "「愿每一个崭新的春天，都有人陪你在树影下数清飘落的花瓣。」",
        },
        {
            "id": "c06",
            "code": "C-06",
            "cat": "seasons",
            "name": "雨夜同伞青瓷鹤",
            "short_name": "雨夜同伞青瓷鹤",
            "washi_tint": "雨过天青竹浆和纸",
            "origin_tag": "间章二 · 雨夜林荫道同伞",
            "fold_style": "斜倾护肩翼折法（左翼舒展微倾十五度）",
            "steps": ["第壹折 · 青竹纸润水定纹", "第贰折 · 左翼外展十五度", "第叁折 · 右翼收拢护身"],
            "spoiler": False,
            "crease_lore": (
                "折痕考据：灵感源自放学雨夜偏向一侧的深蓝长柄伞。折制时故意让左翼长出三分并微向下倾，"
                "如同在细密夜雨里默默替身旁同伴遮住风斜雨滴的伞檐。"
            ),
            "mo_note": "那天走到巷口才发现你的右肩被雨水打湿了一大片，回到家在台灯下折出了这只偏翅膀的青色纸鹤。",
            "alice_note": "啧啧，连折个纸鹤都要还原『半边湿肩膀』的倾斜角度，你们俩的默契真是连量角器都测不准！",
            "vow_slip": "「伞很小，夜雨很长，但往你那边多倾十五度刚刚好。」",
        },
        {
            "id": "c07",
            "code": "C-07",
            "cat": "seasons",
            "name": "旧书街藏书金鹤",
            "short_name": "旧书街藏书金鹤",
            "washi_tint": "古铜洒金宣纹衬纸",
            "origin_tag": "第四章 / 古籍修复台 · 槐荫旧书街",
            "fold_style": "古典骑缝折角法（翼面拼合文字暗码）",
            "steps": ["第壹折 · 四角铅字朝外定位", "第贰折 · 顺预折谷线收拢", "第叁折 · 双翼并拢显字"],
            "spoiler": False,
            "crease_lore": (
                "折痕考据：融汇古典本格推理中的『折纸拼字暗码』工艺——平铺时纸面四角只见零散笔画，"
                "唯有严格沿双压折痕定向折成纸鹤，两片翅膀脊线才会严丝合缝拼出完整藏书铭文。"
            ),
            "mo_note": "夕阳照进旧书店高高的木书架时，灰尘像金色的小星星一样飘，这只纸鹤就停在两本同款译作之间。",
            "alice_note": "把藏书票暗号折进翅膀接缝里，这种浪漫又烧脑的把戏，全云溪高中也只有我们侦探社玩得转啦！",
            "vow_slip": "「好书与真心都经得起反复翻阅，折痕深处自有答案。」",
        },
        {
            "id": "c08",
            "code": "C-08",
            "cat": "seasons",
            "name": "天文台星轨夜光鹤",
            "short_name": "天文台星轨夜光鹤",
            "washi_tint": "深靛蓝银箔星砂和纸",
            "origin_tag": "深秋夜色 · 旧楼顶层观星台",
            "fold_style": "修长燕尾星芒折（翼面刺有北斗透光微孔）",
            "steps": ["第壹折 · 靛蓝银砂面朝外", "第贰折 · 鹤尾细折引星轨", "第叁折 · 针尖挑出七星孔"],
            "spoiler": False,
            "crease_lore": (
                "折痕考据：采用深秋晴夜色泽的靛蓝洒银和纸，鹤尾拉长如流星划痕，左翼按秋季星空图用细针挑出"
                "七枚微孔；只要举到温暖的台灯或手电光前，墙上便会映出微缩星轨。"
            ),
            "mo_note": "以前觉得夜晚安静得让人害怕，后来在社团窗边仰头看星星时，发现黑暗其实只是为了托住微光。",
            "alice_note": "拿它罩在播音室的小夜灯上，整面墙都是会飞的星星，比天文社那台老望远镜还梦幻呢！",
            "vow_slip": "「长夜漫漫亦无妨，总有一束光会顺着星轨找到你。」",
        },
        {
            "id": "c09",
            "code": "C-09",
            "cat": "vows",
            "name": "广播站电波呼号鹤",
            "short_name": "广播站电波呼号鹤",
            "washi_tint": "暖琥珀五线谱暗纹纸",
            "origin_tag": "旧广播电台 · FM 88.6 暮色点播",
            "fold_style": "风琴声波褶翼法（翼面压出三短一长两短折棱）",
            "steps": ["第壹折 · 谱纸斜裁对齐音轨", "第贰折 · 翼尖压出六道波棱", "第叁折 · 悬于真空管麦架"],
            "spoiler": False,
            "crease_lore": (
                "折痕考据：专为旧广播站黄铜真空管话筒架设计的悬垂纸鹤。两侧翅膀采用风琴式细密折棱，"
                "按『三短、一长、两短』的间距压出六道波纹，播音室开窗通风时便会随声波轻轻起舞。"
            ),
            "mo_note": "坐在导播台暖橙色的指示灯旁折下这只纸鹤时，每一封匿名来信里的心事都化作了温柔的晚风。",
            "alice_note": "现在它可是我们『FM 88.6 万事屋暮色电台』的镇台台标！每次开麦前碰碰它的翅膀准保不嘴瓢！",
            "vow_slip": "「只要电波还在晚霞里穿行，就没有哪一封真诚的来信会被遗忘。」",
        },
        {
            "id": "c10",
            "code": "C-10",
            "cat": "vows",
            "name": "外婆木盒旧雪白鹤",
            "short_name": "外婆木盒旧雪白鹤",
            "washi_tint": "微泛暖黄的四年前纯白棉纸",
            "origin_tag": "第五章 · 暖黄台灯下的樟木旧盒",
            "fold_style": "孩童端正双折式（翼根留有岁月压平的微痕）",
            "steps": ["第壹折 · 棉纸边角仔细对齐", "第贰折 · 指尖轻抚不留重痕", "第叁折 · 安放樟木盒底珍藏"],
            "spoiler": True,
            "public_crease_lore": (
                "折痕考据（防剧透公开卷）：一只保存在外婆家樟木旧盒深处的陈年白色千纸鹤，纸缘因岁月氧化泛起"
                "淡淡的暖象牙色，折痕端正而轻柔，带着淡淡的干桂花与旧相册气息。"
            ),
            "public_mo_note": "【防剧透保护中】这只旧白纸鹤承载着四年前冬夜未能送出的心意，通关 TRUE END 或开启剧透许可后展阅墨墨亲笔手记。",
            "public_alice_note": "【防剧透保护中】涉及第五章核心旧案脉络，揭晓真相后再来翻看本社长的批注吧。",
            "public_vow_slip": "「【防剧透火漆封存】有些跨越冬天的约定，一直在旧木盒里安静等待重逢。」",
            "crease_lore": (
                "折痕考据：四年前事故前夜，年幼的小雪在台灯下一笔一划折好、准备周末带去河堤送给周可的纯白纸鹤。"
                "外婆将它完好保存在樟木盒底四年，每一道折棱都见证着从未改变的纯粹善意。"
            ),
            "mo_note": "那是四年前没来得及递到小可手里的第一只纸鹤。幸好外婆一直替我留着它，让迟到了四年的重逢依然有凭据。",
            "alice_note": "看到外婆从旧木盒里捧出这只白纸鹤的时候，连最挑剔的侦探也说不出半句硬话了……它一直干干净净地等着主人开口呢。",
            "vow_slip": "「周可，明天周末我们去河堤折纸鹤吧——这一次，换我把真话亲口讲给你听。」",
        },
        {
            "id": "c11",
            "code": "C-11",
            "cat": "vows",
            "name": "门缝双生粉樱鹤",
            "short_name": "门缝双生粉樱鹤",
            "washi_tint": "浅绯粉旧手工折纸",
            "origin_tag": "第三章 / 终章 · 河堤长椅的旧约",
            "fold_style": "左利手镜像反折式（与旧白鹤左右对称）",
            "steps": ["第壹折 · 粉色方纸左向起手", "第贰折 · 翼尖反向微折记号", "第叁折 · 与白鹤并肩成双"],
            "spoiler": True,
            "public_crease_lore": (
                "折痕考据（防剧透公开卷）：一只折痕方向与寻常折法恰好镜像对称的浅粉色旧纸鹤，"
                "纸页虽有些许年头却被抚平得格外珍惜，仿佛一直等待与另一只白色纸鹤并肩摆放。"
            ),
            "public_mo_note": "【防剧透保护中】涉及终章双生纸鹤的核心伏笔与信件秘密，通关 TRUE END 或开启剧透许可后展阅全文。",
            "public_alice_note": "【防剧透保护中】这只粉纸鹤背后的故事可不能提前剧透，快去完成主线真结局再来解锁吧！",
            "public_vow_slip": "「【防剧透火漆封存】两只隔着漫长时光遥遥相望的纸鹤，终会在天光下重聚。」",
            "crease_lore": (
                "折痕考据：四年前事故第四天，周可悄悄塞在墨墨家门缝里的浅粉千纸鹤，与墨墨书包夹层里四年间写下的"
                "十二封未寄信一同保存至今。左撇子特有的反向折翼与樟木盒里的旧白鹤拼在一起，恰好构成完整的双生对鹤。"
            ),
            "mo_note": "四年里每年三封信，我一共写了十二封，却一直没敢寄出去。直到旧仓库的天光照进来，粉纸鹤和白纸鹤终于挨在了一起。",
            "alice_note": "周明远叔叔那句『发现真相是为了让疼的人知道有人看见了』，就藏在这两只跨越四年的纸鹤折痕里呀。",
            "vow_slip": "「八分钟的雨夜已经过去了——谢谢你没有丢下这只粉纸鹤，也谢谢你终于愿意原谅自己。」",
        },
        {
            "id": "c12",
            "code": "C-12",
            "cat": "vows",
            "name": "第三只千纸鹤真约",
            "short_name": "第三只千纸鹤真约",
            "washi_tint": "暮霞淡紫描金花纹和纸",
            "origin_tag": "TRUE END / 番外二 · 旧书街与有声的明天",
            "fold_style": "双人四手合折式（左翼微宽、右翼秀气、悬真约短册）",
            "steps": ["第壹折 · 你折左翼稳托暮色", "第贰折 · 她折右翼轻抚金纹", "第叁折 · 系上红绳悬起真约"],
            "spoiler": True,
            "public_crease_lore": (
                "折痕考据（防剧透公开卷）：陈列柜最中央丝绒托座上的镇柜典藏——由两个人一左一右共同折成的"
                "淡紫描金千纸鹤，下方垂挂一枚象牙色誓约短册，封存着整部作品最温暖的终极约定。"
            ),
            "public_mo_note": "【防剧透保护中】此为 TRUE END「重新发声」与番外后日谈镇柜典藏，通关 TRUE END 或开启剧透许可后揭晓真约手记。",
            "public_alice_note": "【防剧透保护中】万事屋最高机密镇柜金鹤！等你亲眼见证那个夕阳下的奇迹瞬间再来拆封吧！",
            "public_vow_slip": "「【防剧透火漆封存】前两只纸鹤装过了过去与秘密，这第三只留给有声的明天。」",
            "crease_lore": (
                "折痕考据：在旧书街晚霞与河堤波光见证下，由陈默折出沉稳微宽的左翼、由重新开口发声的墨墨折出"
                "秀气灵动的右翼，最后用朱红细绳悬起象牙短册——象征走出四年沉默、迈向有声日常的永恒真约。"
            ),
            "mo_note": "这一次不用写在笔记本上了，我可以看着你的眼睛，一字一句亲口告诉你：明天、后天、以后的每一个四季，我们都一起去查案吧。",
            "alice_note": "镇柜之宝全票通过！作为你们俩的头号见证人兼社长，以后每年的纪念日我都批准你们在万事屋挂一只新纸鹤！",
            "vow_slip": "「前两只千纸鹤装过了过去与秘密，这第三只，只装我们明天的日常与亲口说出的每一句喜欢。」",
        },
    ]

    _ORIGAMI_BY_ID = {c["id"]: c for c in ORIGAMI_CRANE_PATTERNS}
    _origami_fold_session = {}

    def origami_get_def(crane_id):
        return _ORIGAMI_BY_ID.get(crane_id, ORIGAMI_CRANE_PATTERNS[0])

    def _ensure_origami_store():
        if getattr(persistent, "origami_cabinet_records", None) is None:
            persistent.origami_cabinet_records = {}
        return persistent.origami_cabinet_records

    def origami_get_record(crane_id):
        cdef = origami_get_def(crane_id)
        cid = cdef["id"]
        raw = _ensure_origami_store().get(cid) or {}
        return {
            "folded": bool(raw.get("folded", False)),
            "vow_inspected": bool(raw.get("vow_inspected", False)),
            "fold_count": int(raw.get("fold_count", 0)),
            "step_reached": int(raw.get("step_reached", 3 if raw.get("vow_inspected") else 0)),
        }

    def origami_reset_session():
        _origami_fold_session.clear()

    def origami_set_filter(cat_key):
        valid = {k for k, _ in ORIGAMI_CATEGORIES}
        ck = cat_key if cat_key in valid else "all"
        persistent.origami_cat_filter = ck
        vis = origami_visible_patterns(ck)
        if vis and persistent.origami_selected_crane not in [x["id"] for x in vis]:
            persistent.origami_selected_crane = vis[0]["id"]
        renpy.save_persistent()

    def origami_visible_patterns(cat_key=None):
        ck = cat_key if cat_key is not None else (persistent.origami_cat_filter or "all")
        if ck == "all":
            return list(ORIGAMI_CRANE_PATTERNS)
        return [c for c in ORIGAMI_CRANE_PATTERNS if c["cat"] == ck]

    def origami_select_crane(crane_id):
        cdef = origami_get_def(crane_id)
        persistent.origami_selected_crane = cdef["id"]
        renpy.save_persistent()

    def origami_advance_step(crane_id, target_step=None):
        """推进单式千纸鹤的三步折痕体验；若满三步则自动点亮折检并同步成就判定。"""
        cdef = origami_get_def(crane_id)
        cid = cdef["id"]
        store_dict = dict(_ensure_origami_store())
        prev = origami_get_record(cid)
        cur_step = int(prev["step_reached"])
        nxt_step = min(3, (cur_step + 1) if target_step is None else max(1, min(3, int(target_step))))
        prev["step_reached"] = max(cur_step, nxt_step)
        if prev["step_reached"] >= 3:
            prev["folded"] = True
            prev["vow_inspected"] = True
            prev["fold_count"] = max(1, int(prev["fold_count"]) + 1)
        store_dict[cid] = prev
        persistent.origami_cabinet_records = store_dict
        renpy.sound.play("audio/sfx_crane.ogg")
        if origami_inspected_count() >= len(ORIGAMI_CRANE_PATTERNS):
            ach_grant("ach_origami_cabinet")
        renpy.save_persistent()
        return prev

    def origami_fold_and_inspect(crane_id, open_modal=True):
        """亲手完成折纸定型并展开象牙誓约短册弹窗，集齐 12 式解锁 ach_origami_cabinet。"""
        cdef = origami_get_def(crane_id)
        cid = cdef["id"]
        persistent.origami_selected_crane = cid
        store_dict = dict(_ensure_origami_store())
        prev = origami_get_record(cid)
        updated = {
            "folded": True,
            "vow_inspected": True,
            "fold_count": int(prev["fold_count"]) + 1,
            "step_reached": 3,
        }
        store_dict[cid] = updated
        persistent.origami_cabinet_records = store_dict
        renpy.sound.play("audio/sfx_crane.ogg")

        if origami_inspected_count() >= len(ORIGAMI_CRANE_PATTERNS):
            ach_grant("ach_origami_cabinet")

        renpy.save_persistent()
        if open_modal:
            renpy.show_screen("origami_vow_modal", crane_id=cid)
        return updated

    def origami_inspected_count():
        return sum(1 for c in ORIGAMI_CRANE_PATTERNS if origami_get_record(c["id"])["vow_inspected"])

    def origami_cat_count(cat_key):
        return len(origami_visible_patterns(cat_key))

    def origami_render_crane_view(crane_id):
        """渲染千纸鹤折痕考据、双人手记与誓约短册，对核心剧透款实施零侧信道遮罩。"""
        cdef = origami_get_def(crane_id)
        rec = origami_get_record(cdef["id"])
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        is_sp = bool(cdef.get("spoiler", False))

        if is_sp and not unlocked:
            disp_lore = cdef["public_crease_lore"]
            disp_mo = cdef["public_mo_note"]
            disp_alice = cdef["public_alice_note"]
            disp_vow = cdef["public_vow_slip"]
            masked_notice = "【防剧透火漆保护：通关 TRUE END 或点击右上角「解锁剧透」后可揭晓四年前旧案与真结局专属誓词】"
            is_open = False
        else:
            disp_lore = cdef["crease_lore"]
            disp_mo = cdef["mo_note"]
            disp_alice = cdef["alice_note"]
            disp_vow = cdef["vow_slip"]
            masked_notice = ""
            is_open = True

        return {
            "id": cdef["id"],
            "code": cdef["code"],
            "cat": cdef["cat"],
            "name": cdef["name"],
            "short_name": cdef["short_name"],
            "washi_tint": cdef["washi_tint"],
            "origin_tag": cdef["origin_tag"],
            "fold_style": cdef["fold_style"],
            "steps": list(cdef["steps"]),
            "spoiler": is_sp,
            "unlocked": is_open,
            "folded": rec["folded"],
            "vow_inspected": rec["vow_inspected"],
            "fold_count": rec["fold_count"],
            "step_reached": rec["step_reached"],
            "display_crease_lore": disp_lore,
            "display_mo_note": disp_mo,
            "display_alice_note": disp_alice,
            "display_vow_slip": disp_vow,
            "display_masked_notice": masked_notice,
        }


################################################################################
## 三、鉴赏分页界面 A：校园旧广播站推理来信电台（screen extras_radio_booth）
################################################################################

transform radio_mic_warm_pulse:
    subpixel True
    block:
        ease 2.2 zoom 1.03 yoffset -1
        ease 2.2 zoom 1.0 yoffset 0
        repeat

screen extras_radio_booth():
    $ _bid = persistent.radio_selected_broadcast or "b1"
    $ _bdef = radio_get_def(_bid)
    $ _brec = radio_get_record(_bdef["id"])
    $ _pview = radio_render_postcard_view(_bdef["id"])
    $ _solved_n = radio_solved_count()
    $ _gold_n = radio_gold_count()
    $ _cur_clue_id = _brec["active_clue"] or _bdef["booth_clues"][0]["id"]
    $ _cur_clue = [c for c in _bdef["booth_clues"] if c["id"] == _cur_clue_id][0]

    vbox:
        spacing 9

        ## 1. 广播站导播台顶部总览横幅
        frame:
            style "radio_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_radio_booth_mic.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("校园旧广播站推理来信电台 · FM 88.6") font gui.name_text_font size 19 color "#f6e7c0"
                        if persistent.te_cleared:
                            text _("TRUE END 已通关 · 三期暮色电波来信与收台真约回音已完整开放。") size 12 color "#d8c8ee"
                        elif persistent.truth_spoiler_confirmed:
                            text _("已手动开启剧透许可 · 当前可收阅 B-03 收台特辑的真约回音。") size 12 color "#f0a4b8"
                        else:
                            text _("墨墨与艾丽丝值守暮色点播台 · 涉终章旧案回音已由防剧透火漆自动保护。") size 12 color "#b9a6d4"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_listener_letter_tape.png" xysize (14, 14) yalign 0.5
                            text ("已解来信 %d/3" % _solved_n) size 12 color "#f4d98a" yalign 0.5
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
                                            message=_("尚未通关 TRUE END，确定提前揭晓「旧广播电台」B-03 特辑中的结局真约回音吗？"),
                                            yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                            no_action=Hide("confirm"))

        ## 2. 三封听众来信频道切换卡（3 × 234 + 2 × 10 = 722px 像素级严丝合缝）
        hbox:
            spacing 10
            for bitem in RADIO_BROADCASTS:
                $ _ir = radio_get_record(bitem["id"])
                $ _isel = (bitem["id"] == _bdef["id"])
                button:
                    style "radio_episode_card"
                    selected _isel
                    action Function(radio_select_broadcast, bitem["id"])
                    vbox:
                        spacing 3
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            text bitem["code"] size 12 color ("#f4d98a" if _isel else "#cbb0e6") bold True yalign 0.5
                            if _ir["solved"]:
                                hbox:
                                    xalign 1.0
                                    yalign 0.5
                                    spacing 4
                                    add "images/ui/icon_radio_booth_mic.png" xysize (14, 14) yalign 0.5
                                    text (_("金牌主持") if _ir["gold_mic"] else _("已回信")) size 11 color ("#f4d98a" if _ir["gold_mic"] else "#86efac") bold True yalign 0.5
                            else:
                                text _("待开播") size 11 color "#8a7aa0" xalign 1.0 yalign 0.5
                        text bitem["short_title"] font gui.name_text_font size 14 color "#f2e6ff"
                        text bitem["freq_tag"] size 11 color "#9a86b8"

        ## 3. 真空管导播台详情与三项台前物证核验区
        frame:
            style "radio_console_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add _bdef["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add "images/ui/icon_radio_booth_mic.png" xysize (24, 24) xalign 0.05 yalign 0.08
                        if _brec["solved"]:
                            add "images/ui/icon_listener_letter_tape.png" xysize (26, 26) xalign 0.96 yalign 0.08
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text _bdef["code"] size 12 color "#ffffff" bold True align (0.5, 0.5)
                            text ("《%s》" % _bdef["title"]) font gui.name_text_font size 17 color "#f6e7c0" yalign 0.5
                        text ("%s  ·  %s" % (_bdef["freq_tag"], _bdef["callsign"])) size 12 color "#cbb0e6"
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (15, 15) yalign 0.5
                            text ("播音色温：%s" % _bdef["lighting_note"]) size 12 color "#a892c2" yalign 0.5 substitute False
                        if _brec["solved"]:
                            text ("电波归档：%s（已直播重温 %d 次 · 物证全核验）" % (_brec["best_badge"], _brec["replays"])) size 12 color "#f4d98a"
                        else:
                            text _("电波归档：尚未开麦答复（可先核验下方来信物证，再进入直播剧场推理）") size 12 color "#8a7aa0"

                text _bdef["summary_pub"] size 13 color "#ebe2f8" line_spacing 3

                ## 3A. 导播台三项来信物证交互核验栏（3 × 226 + 2 × 8 = 694px 精确贴合内宽）
                text _("导播台预检 · 点击查验随信附寄的三项现场物证记录：") size 12 color "#f4d98a" bold True
                hbox:
                    spacing 8
                    for c_obj in _bdef["booth_clues"]:
                        $ _c_seen = (c_obj["id"] in _brec["inspected_clues"])
                        $ _c_active = (c_obj["id"] == _cur_clue["id"])
                        button:
                            style "restoration_clue_card"
                            selected _c_active
                            action Function(radio_inspect_clue, _bdef["id"], c_obj["id"])
                            vbox:
                                spacing 2
                                xfill True
                                hbox:
                                    xfill True
                                    yalign 0.5
                                    text c_obj["label"] size 11 color ("#f4d98a" if _c_active else "#e2d4f4") bold True yalign 0.5
                                    text (_("已核验") if _c_seen else _("待核验")) size 10 color ("#86efac" if _c_seen else "#8a7aa0") xalign 1.0 yalign 0.5
                                text c_obj["surface"] size 11 color "#b9a6d4" line_spacing 2

                frame:
                    xfill True
                    padding (10, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        spacing 8
                        yalign 0.5
                        add "images/ui/icon_radio_booth_mic.png" xysize (20, 20) yalign 0.5
                        text _cur_clue["detail"] size 12 color "#fff1d0" line_spacing 2

                ## 3B. 听众来信明信片与电波回音预览匣
                frame:
                    style "radio_letter_preview_card"
                    vbox:
                        spacing 4
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_listener_letter_tape.png" xysize (16, 16) yalign 0.5
                                text _pview["salutation"] font gui.name_text_font size 13 color "#fff1d0" yalign 0.5
                            text ("金牌电波 %d/3" % _gold_n) size 11 color "#f4d98a" xalign 1.0 yalign 0.5
                        text _pview["display_body"] size 12 color "#ebe2f8" line_spacing 3
                        if _brec["solved"]:
                            add Solid("#f4d98a33") xfill True ysize 1
                            text _pview["display_echo"] size 12 color "#86efac" line_spacing 2
                            text _pview["display_mo_note"] size 12 color "#cfa6f0"
                            text _pview["display_alice_note"] size 12 color "#f0c060"
                        if _pview["display_deep_secret"]:
                            add Solid("#f4d98a44") xfill True ysize 1
                            text _pview["display_deep_secret"] size 12 color "#fff1d0" line_spacing 3
                        elif _pview["display_masked_prompt"]:
                            add Solid("#6a5c8044") xfill True ysize 1
                            text _pview["display_masked_prompt"] size 11 color "#f0a4b8"

                ## 3C. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("三封听众来信全数解开后解锁成就「暮色电波解谜人」 · 当前金牌主持 %d/3" % _gold_n) size 12 color "#9a86b8" yalign 0.5
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton _("展阅来信与磁带"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(radio_open_postcard_modal, _bdef["id"])
                        textbutton (_("重温直播剧场") if _brec["solved"] else _("推开播音室门")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action radio_launch_action(_bdef["id"])

        ## 4. 三期电波节目速览直达条
        for bitem in RADIO_BROADCASTS:
            $ _qr = radio_get_record(bitem["id"])
            frame:
                style "mailbox_quick_row"
                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 10
                        yalign 0.5
                        add ("images/ui/icon_radio_booth_mic.png" if _qr["solved"] else "images/ui/icon_listener_letter_tape.png") xysize (20, 20) yalign 0.5
                        text ("%s · %s" % (bitem["code"], bitem["title"])) font gui.name_text_font size 14 color "#f2e6ff" yalign 0.5
                        text ("（%s）" % (_qr["best_badge"] if _qr["solved"] else "待直播")) size 12 color ("#f4d98a" if _qr["gold_mic"] else ("#86efac" if _qr["solved"] else "#7e6d99")) yalign 0.5
                    textbutton (_("再次收听") if _qr["solved"] else _("开麦解谜")):
                        style "gramophone_mini_pill"
                        xalign 1.0
                        yalign 0.5
                        action radio_launch_action(bitem["id"])


## 听众来信明信片与盘式磁带原件独立展阅弹窗
screen radio_postcard_modal(broadcast_id="b1"):
    modal True
    zorder 215
    $ _mv = radio_render_postcard_view(broadcast_id)

    add "#080510dc"
    key "K_ESCAPE" action Hide("radio_postcard_modal")
    key "K_RETURN" action Hide("radio_postcard_modal")
    key "K_SPACE" action Hide("radio_postcard_modal")

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
                    add "images/ui/icon_listener_letter_tape.png" xysize (40, 40) yalign 0.5
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_mv["code"], _mv["title"])) font gui.name_text_font size 20 color "#f6e7c0"
                        text ("%s  |  %s" % (_mv["freq_tag"], _mv["callsign"])) size 12 color "#cbb0e6"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_radio_booth_mic.png" xysize (32, 32) yalign 0.5
                    text _mv["best_badge"] size 13 color "#f4d98a" bold True yalign 0.5

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
                    text _mv["salutation"] font gui.name_text_font size 17 color "#fff1d0"
                    text _mv["display_body"] size 14 color "#f2e6ff" line_spacing 5
                    add Solid("#cbb0e633") xfill True ysize 1
                    text _mv["display_echo"] size 13 color "#86efac" line_spacing 4
                    text _mv["display_mo_note"] size 13 color "#cfa6f0" line_spacing 4
                    text _mv["display_alice_note"] size 13 color "#f0c060" line_spacing 4
                    if _mv["display_deep_secret"]:
                        add Solid("#f4d98a44") xfill True ysize 1
                        text _mv["display_deep_secret"] size 13 color "#fff1d0" line_spacing 4
                    elif _mv["display_masked_prompt"]:
                        add Solid("#6a5c8055") xfill True ysize 1
                        text _mv["display_masked_prompt"] size 12 color "#f0a4b8"

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮收起听众来信夹") size 12 color "#9a86b8" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 10
                    textbutton _("进入本期播音剧场"):
                        style "gramophone_mini_pill"
                        yalign 0.5
                        action [Hide("radio_postcard_modal")] + radio_launch_action(_mv["id"])
                    textbutton _("收起信笺"):
                        style "pill_button"
                        xminimum 116
                        ysize 34
                        text_size 14
                        action Hide("radio_postcard_modal")


## 广播剧场内顶部电波推理横幅
screen radio_onair_prompt_banner(freq_badge, prompt_line):
    zorder 95
    frame:
        xalign 0.5
        ypos 12
        xsize 760
        padding (16, 8)
        background Frame("gui/hud_chip.png", 12, 12)
        hbox:
            spacing 10
            yalign 0.5
            add "images/ui/icon_radio_booth_mic.png" xysize (24, 24) yalign 0.5
            vbox:
                spacing 1
                text freq_badge size 12 color "#f4d98a" bold True
                text prompt_line size 14 color "#f6eeff"


## 广播剧场收台结算卡
screen radio_broadcast_result_card(broadcast_id, cur_badge, best_badge, mistakes, replays):
    modal True
    zorder 220
    $ _bdef = radio_get_def(broadcast_id)
    $ _pv = radio_render_postcard_view(broadcast_id)
    $ _is_gold = (cur_badge == "金牌电波主持")

    add "#080510dc"
    key "K_RETURN" action Return("back_to_radio")
    key "K_SPACE" action Return("back_to_radio")
    key "K_ESCAPE" action Return("back_to_radio")

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
                add "images/ui/icon_radio_booth_mic.png" xysize (54, 54) yalign 0.5 at radio_mic_warm_pulse
                vbox:
                    spacing 3
                    yalign 0.5
                    text ("FM 88.6 暮色电波已归档 · %s" % _bdef["code"]) size 13 color "#f4d98a" bold True
                    text ("《%s》" % _bdef["title"]) font gui.name_text_font size 21 color "#f6e7c0"
                    text ("本期播音评级：【%s】" % cur_badge) size 14 color ("#f4d98a" if _is_gold else "#86efac")

            add Solid("#f4d98a33") xfill True ysize 1

            frame:
                xfill True
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 4
                    text _pv["display_mo_note"] size 13 color "#cfa6f0"
                    text _pv["display_alice_note"] size 13 color "#f0c060"
                    text ("累计直播重温：%d 次  |  历史最高评级：%s  |  电台归档进度：%d/3" % (replays, best_badge, radio_solved_count())) size 12 color "#b9a6d4"

            textbutton _("封存录音磁带并返回广播站"):
                style "pill_button"
                xalign 0.5
                xminimum 228
                ysize 38
                text_size 15
                action Return("back_to_radio")


################################################################################
## 四、鉴赏分页界面 B：千纸鹤折纸图谱陈列柜（screen extras_origami_cabinet）
################################################################################

transform golden_crane_sway:
    subpixel True
    block:
        ease 2.6 yoffset -3 zoom 1.03
        ease 2.6 yoffset 0 zoom 1.0
        repeat

screen extras_origami_cabinet():
    $ _cat = persistent.origami_cat_filter or "all"
    $ _vis_list = origami_visible_patterns(_cat)
    $ _sel_id = persistent.origami_selected_crane or "c01"
    $ _cview = origami_render_crane_view(_sel_id)
    $ _done_n = origami_inspected_count()
    $ _grid_rows = max(1, (len(_vis_list) + 3) // 4)

    vbox:
        spacing 9

        ## 1. 胡桃木丝绒陈列柜总览横幅
        frame:
            style "origami_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_origami_cabinet.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("千纸鹤折纸图谱陈列柜") font gui.name_text_font size 19 color "#f6e7c0"
                        if persistent.te_cleared:
                            text _("胡桃木丝绒展柜 · 十二式校园与四季折谱及终章真约短册已全数开放。") size 12 color "#d8c8ee"
                        elif persistent.truth_spoiler_confirmed:
                            text _("已手动开启剧透许可 · 当前可展阅第三层真约典藏纸鹤的完整短册。") size 12 color "#f0a4b8"
                        else:
                            text _("收录十二式和纸折痕考据与誓约签 · 核心真相款已由防剧透火漆严密守护。") size 12 color "#b9a6d4"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_golden_vow_crane.png" xysize (14, 14) yalign 0.5
                            text ("已折检 %d/12" % _done_n) size 12 color "#f4d98a" yalign 0.5
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
                                            message=_("尚未通关 TRUE END，确定提前揭晓「千纸鹤陈列柜」中涉旧案与真结局的三枚誓约短册吗？"),
                                            yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                            no_action=Hide("confirm"))

        ## 2. 胡桃木展架分栏筛选条（xsize 722 -> 内宽 702px 零溢出）
        frame:
            style "origami_filter_bar"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 6
                    yalign 0.5
                    for ck, clbl in ORIGAMI_CATEGORIES:
                        textbutton ("%s (%d)" % (clbl, origami_cat_count(ck))):
                            style "lexicon_cat_pill"
                            selected (_cat == ck)
                            action Function(origami_set_filter, ck)
                text ("集齐 12 式解锁成就「千纸鹤折纸图谱家」") size 11 color "#cbb0e6" xalign 1.0 yalign 0.5

        ## 3. 胡桃木与深绿丝绒 4 列对称展格（4 × 173 + 3 × 10 = 722px 严丝合缝）
        grid 4 _grid_rows:
            spacing 10
            for citem in _vis_list:
                $ _crec = origami_get_record(citem["id"])
                $ _csel = (citem["id"] == _cview["id"])
                button:
                    style "origami_curio_card"
                    selected _csel
                    action Function(origami_select_crane, citem["id"])
                    vbox:
                        spacing 3
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            text citem["code"] size 11 color ("#f4d98a" if _csel else "#d9c39e") bold True yalign 0.5
                            hbox:
                                xalign 1.0
                                yalign 0.5
                                spacing 3
                                add "images/ui/icon_golden_vow_crane.png" xysize (15, 15) yalign 0.5 alpha (1.0 if _crec["vow_inspected"] else 0.38)
                                text (_("已悬签") if _crec["vow_inspected"] else _("待折检")) size 10 color ("#f4d98a" if _crec["vow_inspected"] else "#9a86b8") yalign 0.5
                        text citem["short_name"] font gui.name_text_font size 13 color "#fff1d0"
                        text citem["washi_tint"][:9] size 10 color "#a8c6b0"
            for _pad_i in range((4 - len(_vis_list) % 4) % 4):
                null width 173 height 82

        ## 4. 选中纸鹤图谱的折痕工作台、双人批注与誓约短册检视台
        frame:
            style "origami_detail_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 12
                        yalign 0.5
                        frame:
                            style "origami_velvet_emblem"
                            add "images/ui/icon_golden_vow_crane.png" xysize (48, 48) align (0.5, 0.5) at golden_crane_sway
                        vbox:
                            spacing 2
                            xsize 432
                            hbox:
                                spacing 6
                                yalign 0.5
                                frame:
                                    style "mailbox_code_badge"
                                    text _cview["code"] size 11 color "#ffffff" bold True align (0.5, 0.5)
                                text ("《%s》" % _cview["name"]) font gui.name_text_font size 18 color "#fff1d0" yalign 0.5
                            text ("和纸材质：%s  ·  出处：%s" % (_cview["washi_tint"], _cview["origin_tag"])) size 12 color "#d9c39e"
                            text ("折法要诀：%s" % _cview["fold_style"]) size 12 color "#a8c6b0"
                    vbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 4
                        frame:
                            style "mailbox_stat_chip"
                            text (("已折检 %d 次" % _cview["fold_count"]) if _cview["vow_inspected"] else _("尚未亲手折检")) size 11 color ("#f4d98a" if _cview["vow_inspected"] else "#9a86b8") align (0.5, 0.5)

                ## 4A. 三步互动折纸步进条（3 × 226 + 2 × 8 = 694px 精确贴合内宽）
                hbox:
                    spacing 8
                    for idx_st, st_text in enumerate(_cview["steps"]):
                        $ _st_num = idx_st + 1
                        $ _st_lit = (_cview["step_reached"] >= _st_num)
                        button:
                            style "origami_step_btn"
                            selected _st_lit
                            action Function(origami_advance_step, _cview["id"], _st_num)
                            hbox:
                                spacing 6
                                xfill True
                                yalign 0.5
                                add ("images/ui/icon_golden_vow_crane.png" if _st_lit else "images/ui/icon_crane_bookmark.png") xysize (15, 15) yalign 0.5
                                text st_text size 11 color ("#f4d98a" if _st_lit else "#d8c8ee") yalign 0.5

                ## 4B. 折痕图谱考据
                frame:
                    xfill True
                    padding (11, 8)
                    background Frame("gui/hud_chip.png", 12, 12)
                    vbox:
                        spacing 3
                        text _cview["display_crease_lore"] size 12 color "#f2e6ff" line_spacing 3
                        if _cview["display_masked_notice"]:
                            text _cview["display_masked_notice"] size 11 color "#f0a4b8"

                ## 4C. 墨墨速写本折纸手记 & 艾丽丝陈列柜按语
                frame:
                    style "lexicon_mo_note_box"
                    vbox:
                        spacing 3
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_crane_bookmark.png" xysize (14, 14) yalign 0.5
                            text _("墨墨 · 速写本折纸手记") size 12 color "#cfa6f0" bold True yalign 0.5
                        text ("「%s」" % _cview["display_mo_note"]) size 12 color "#ebe2f8" line_spacing 3

                frame:
                    style "lexicon_alice_note_box"
                    vbox:
                        spacing 3
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_origami_cabinet.png" xysize (14, 14) yalign 0.5
                            text _("艾丽丝 · 陈列柜藏品评语") size 12 color "#f0c060" bold True yalign 0.5
                        text _cview["display_alice_note"] size 12 color "#fff1d0" line_spacing 3

                ## 4D. 誓约短册预览与「亲手折纸并展阅誓约签」弹窗入口
                hbox:
                    xfill True
                    yalign 0.5
                    text ("誓约短册：%s" % _cview["display_vow_slip"][:34] + ("…" if len(_cview["display_vow_slip"]) > 34 else "")) size 12 color "#f4d98a" yalign 0.5
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        ## PC-9：C-08 天文台星轨夜光鹤直通钟楼星象馆（仅 C-08 显示，宽度经 verify_pc9 实测）
                        if _cview["id"] == "c08":
                            textbutton _("钟楼星象馆"):
                                style "gramophone_mini_pill"
                                yalign 0.5
                                action SetField(persistent, "extras_tab", "planetarium")
                        textbutton (_("重展誓约短册") if _cview["vow_inspected"] else _("亲手折纸并展阅誓约签")):
                            style "pill_button"
                            xminimum 176
                            ysize 36
                            text_size 14
                            action Function(origami_fold_and_inspect, _cview["id"], True)


## 千纸鹤折检完成 · 象牙誓约短册特写弹窗（Fold & Inspect Vow Slip Modal）
screen origami_vow_modal(crane_id="c01"):
    modal True
    zorder 218
    $ _ov = origami_render_crane_view(crane_id)

    add "#080510e0"
    key "K_ESCAPE" action Hide("origami_vow_modal")
    key "K_RETURN" action Hide("origami_vow_modal")
    key "K_SPACE" action Hide("origami_vow_modal")

    frame:
        xalign 0.5
        yalign 0.5
        xsize 720
        padding (24, 20)
        background Frame("gui/panel_card.png", 16, 16)
        vbox:
            spacing 10
            xfill True
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 14
                    yalign 0.5
                    add "images/ui/icon_golden_vow_crane.png" xysize (48, 48) yalign 0.5 at golden_crane_sway
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_ov["code"], _ov["name"])) font gui.name_text_font size 21 color "#fff1d0"
                        text ("%s  |  %s" % (_ov["washi_tint"], _ov["fold_style"])) size 12 color "#d9c39e"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_origami_cabinet.png" xysize (28, 28) yalign 0.5
                    text ("已折检 %d/12" % origami_inspected_count()) size 13 color "#f4d98a" bold True yalign 0.5

            add Solid("#f4d98a44") xfill True ysize 1

            frame:
                xfill True
                padding (16, 12)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 6
                    text _("垂挂象牙誓约短册 · 铭文：") size 12 color "#f4d98a" bold True
                    text _ov["display_vow_slip"] font gui.name_text_font size 17 color "#fff6dc" line_spacing 5
                    if _ov["display_masked_notice"]:
                        text _ov["display_masked_notice"] size 12 color "#f0a4b8"

            vbox:
                spacing 6
                xfill True
                text _ov["display_crease_lore"] size 13 color "#ebe2f8" line_spacing 4
                text ("墨墨手记：「%s」" % _ov["display_mo_note"]) size 13 color "#cfa6f0" line_spacing 3
                text ("艾丽丝评语：%s" % _ov["display_alice_note"]) size 13 color "#f0c060" line_spacing 3

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮将纸鹤安放回胡桃木丝绒展格") size 12 color "#9a86b8" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 8
                    if _ov["spoiler"] and not persistent.te_cleared and not persistent.truth_spoiler_confirmed:
                        textbutton _("手动解锁剧透"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Show("confirm",
                                        message=_("尚未通关 TRUE END，确定提前揭晓本枚千纸鹤的终章真约铭文吗？"),
                                        yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                        no_action=Hide("confirm"))
                    textbutton _("安放回陈列柜"):
                        style "pill_button"
                        xminimum 138
                        ysize 34
                        text_size 14
                        action Hide("origami_vow_modal")


################################################################################
## 五、样式定义（PC-8 旧广播电台与胡桃木丝绒千纸鹤陈列柜）
################################################################################

style radio_header_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style radio_episode_card is button:
    xsize 234
    ysize 78
    padding (10, 8)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style radio_console_card is default:
    xfill True
    padding (14, 11)
    background Frame("gui/panel_card.png", 16, 16)

style radio_letter_preview_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style origami_header_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style origami_filter_bar is default:
    xfill True
    padding (10, 6)
    background Frame("gui/hud_chip.png", 12, 12)

style origami_curio_card is button:
    xsize 173
    ysize 82
    padding (9, 7)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style origami_detail_card is default:
    xfill True
    padding (14, 11)
    background Frame("gui/panel_card.png", 16, 16)

style origami_velvet_emblem is default:
    xsize 64
    ysize 64
    padding (6, 6)
    background Frame("gui/hud_chip.png", 12, 12)

style origami_step_btn is button:
    xsize 226
    ysize 34
    padding (8, 4)
    background Frame("gui/hud_chip.png", 12, 12)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"


################################################################################
## 六、旧广播站电波剧场独立沙盒初始化与收尾出口（零侵入主线好感/失误/存档）
################################################################################

label _radio_booth_init_sandbox(session_save_title, init_ambient="warm"):
    $ full_run = False
    $ save_name = session_save_title
    $ mo_favor = 88
    $ alice_favor = 64
    $ fail_count = 0
    $ intuition = 3
    $ evidence = []
    $ inspected_evidence = []
    $ expanded_evidence = ""
    $ set_ambient(init_ambient)
    return

label _radio_booth_finish_broadcast(broadcast_id, local_mistakes=0):
    $ _rb_mistakes = max(0, int(local_mistakes or 0))
    $ _rb_rec = radio_record_clear(broadcast_id, _rb_mistakes)
    hide screen radio_onair_prompt_banner
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen radio_broadcast_result_card(broadcast_id, _rb_rec["last_badge"], _rb_rec["best_badge"], _rb_mistakes, _rb_rec["replays"])
    $ persistent.extras_tab = "radio"
    $ persistent.radio_selected_broadcast = broadcast_id
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 七、电波来信 B-01：《第三音乐室午后四点的幽灵伴奏》
################################################################################

label radio_letter_b1:
    call _radio_booth_init_sandbox("旧广播电台 · B-01 第三音乐室午后四点的幽灵伴奏", "warm")
    $ _rb_mistakes = 0
    $ _b1_c1 = False
    $ _b1_c2 = False

    scene bg black with fade
    $ play_bgm(bgm_warm, fadein=1.5)
    centered "{size=+6}校园旧广播站推理来信电台 · BROADCAST B-01{/size}\n\n{size=+14}第三音乐室午后四点的幽灵伴奏{/size}\n\n{color=#f4d98a}FM 88.6 MHz · 周三 16:15 暮色点播档 · 延音踏板与斜阳长影{/color}"

    scene bg clubroom at bg_kenburns_in
    $ set_ambient("warm")
    with dissolve

    play sound se_bell
    "十月下旬的周三午后四点一刻，旧社团楼三楼尽头的广播室里浮动着温暖的琥珀色斜阳。老式黄铜真空管话筒底座亮起柔和的橙红灯丝，盘式录音机正以每秒十九厘米的速度安静匀速转动。"
    show alice happy at left
    show mo smile at right
    alice "咳咳——试音一、二！这里是云溪高中 FM 88.6『万事屋暮色推理点播台』，我是特邀首席主播艾丽丝，坐在导播台对面替大家做速记的依然是我们最可靠的沉默侦探墨墨，还有副主播陈默同学！"
    mc "明明只是帮广播站代班两周周三和周五的放学时段，硬是被你念出了黄金档悬疑节目的气势啊。"
    play sound se_write
    show mo happy at right
    "墨墨戴着一副略显宽大的复古监听耳机，双耳被软垫衬得愈发秀气。她指了指桌角那个系着暗红棉绳的来信木匣，在牛皮纸笔记本上写下一行字。"
    mo_note "刚开播五分钟，走廊投信口就塞进来一封还带着松香味道的匿名明信片，连附证照片都夹好了。"
    play sound se_page
    show alice think at left
    alice "让我念念看！来信听众署名『高二（3）班 · 怕黑的节拍器』——她说为了准备下周的秋季室内乐汇演，自己每天放学前都会先把小提琴谱夹放在旧艺术楼三楼的第三音乐室预热。"
    alice "奇怪的是，最近连续三个周三下午四点整，她刚走到二楼拐角，就能听见三楼第三音乐室里准时飘出《月光》第二声部的钢琴伴奏，稳稳托住她平时最容易抢拍的那八小节！"
    mc "听起来像是一位很懂合奏默契的幕后前辈？可她为什么不直接推门问个清楚？"
    show alice shock at left
    alice "问题就在这儿！她每次跑完最后半层楼梯推开门，四点零四分的琴房里都空无一人，琴盖端端正正合着，只有谱架上多了一句极温柔的铅笔指法提示！更玄乎的是——"

    scene bg corridor
    $ set_ambient("dusk")
    with dissolve

    show lvfu smile at left
    show lin neutral at right
    "为了在直播结束前给出答复，趁着电台播放五分钟轻音乐垫曲的空档，我们三个抓起现场记录本，一溜烟跑到紧挨旧社团楼的艺术楼三楼走廊实地勘查。"
    lvfu "你们也是来查『四点钟幽灵伴奏』的？我刚才在斜对面画室洗画笔，确实听见隔壁第二琴房和第三琴房之间响过两声很轻的木门合拢声，不过四点零二分有个一年级学弟路过第三音乐室毛玻璃门外，吓得差点把乐谱摔了！"
    mc "就是来信里夹着的那张手机逆光抓拍照吧？毛玻璃上映着一道几乎快顶到门楣的高大黑影，看着至少有一米八二以上。"
    show lin blush at right
    lin "那、那个……第三音乐室的立式钢琴上周刚上过弦油，我是图书委员兼管艺术楼放学前的借琴登记簿，四点整我应该一直在隔壁第二琴房整理旧乐谱才对……"
    hide lvfu
    hide lin
    with dissolve

    show alice think at left
    show mo think at right
    mc "垫曲只剩最后两分钟就要切回直播间了，我们快把琴房里的钢琴踏板、西窗角度和借琴登记簿核对一遍！"

label radio_b1_investigate:
    if _b1_c1 and _b1_c2:
        jump radio_b1_back_to_booth
    menu:
        "检查立式钢琴的黄铜延音踏板与旋转琴凳高度" if not _b1_c1:
            $ _b1_c1 = True
            play sound se_clue
            "我蹲在第三音乐室的旧立式钢琴前仔细端详：右侧延音踏板边缘沾着一抹新鲜的弦乐松香细粉，而圆形旋转琴凳却卡在离地四十五厘米的最低档，螺杆上的薄灰丝毫未动。"
            show mo smile at right
            play sound se_write
            mo_note "如果是身高一米八的男生坐这么矮的琴凳，膝盖会直接顶住键盘托木；对方根本没有调琴凳，只是俯身半站着弹了不到九十秒。"
            jump radio_b1_investigate

        "核对西侧百叶高窗的斜阳角度与隔壁借琴登记簿" if not _b1_c2:
            $ _b1_c2 = True
            play sound se_page
            "艾丽丝趴在走廊登记台前翻开借琴簿，墨墨则站到第三音乐室靠近西窗的谱架旁，迎着窗外低垂的夕阳轻轻举起手。"
            show alice shock at left
            alice "哇！你看东边毛玻璃门上墨墨的影子——十月底下午四点的太阳贴在西南树梢上，墨墨明明才一米五八左右，站在西窗谱架前投到门玻璃上的影子居然快顶到一米八五的门框啦！"
            mc "而且借琴簿上写着，15:55 唯一签字借用隔壁第二琴房的人是林依依；这行铅笔指法批注里的数字『4』，跟图书馆手写索书卡一模一样，都是开口斜竖写法！"
            jump radio_b1_investigate

label radio_b1_back_to_booth:
    scene bg sunset
    $ set_ambient("dusk")
    with dissolve

    show alice happy at left
    show mo smile at right
    "赶在垫曲最后一个和弦淡出前，我们跑回洒满晚霞的广播室，重新推起导播台推子，橙黄色的『ON AIR』灯牌再次温柔亮起。"
    alice "欢迎回到 FM 88.6 暮色推理点播台！经过万事屋侦探团火速现场勘验，第三音乐室『四点钟幽灵伴奏』与『一米八高大黑影』的真相已经水落石出——陈默副主播，请对着麦克风揭晓谜底吧！"

label radio_b1_q_loop:
    show screen radio_onair_prompt_banner("FM 88.6 直播推演 · 琴凳高度与十四度斜阳长影", "琴凳丝杆未动停在最低档，16:02 西窗低角度斜阳将谱架前身影拉长，且批注带索书卡笔迹——神秘伴奏者究竟是谁？")
    menu:
        "是学生会张子谦受托来试音，一米八的身影与毛玻璃照片完全吻合":
            hide screen radio_onair_prompt_banner
            $ _rb_mistakes += 1
            play sound se_wrong
            show alice angry at left, sprite_jump
            show mo smile at right
            alice "哎呀导播事故预警！张子谦连五线谱的高音谱号都能看成蜗牛壳，让他弹德彪西的《月光》，整栋艺术楼的麻雀都要抗议搬家啦！"
            play sound se_write
            mo_note "别忘了琴凳锁在最低档没有调过，而且十月下旬四点钟的太阳仰角只有十四度左右，影子高度不能直接当成真人身高哦。"
            jump radio_b1_q_loop

        "是隔壁第二琴房的林依依——她半站着弹奏九十秒助阵，158 厘米的身影被西窗斜阳放大成了高大剪影":
            hide screen radio_onair_prompt_banner
            play sound se_correct

        "琴房根本没人进来过，是有人提前在钢琴共鸣箱里藏了定时蓝牙音箱":
            hide screen radio_onair_prompt_banner
            $ _rb_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo think at right
            alice "噗——蓝牙音箱可不会自己伸出一只脚踩热黄铜延音踏板，更不会拿铅笔在来信同学的谱夹上写换气指法呀！"
            play sound se_write
            mo_note "结合隔壁第二琴房 15:55 的借用签名与图书索书卡笔迹，那位害羞的伴奏者其实就在一墙之隔呢。"
            jump radio_b1_q_loop

    mc "各位听众朋友，所谓『一米八的幽灵琴师』其实是深秋夕阳和我们开的一个温柔玩笑。下午四点零二分，西南方向的太阳高度角不到十五度，只要站在靠近西窗的谱架旁写批注，哪怕是娇小的女生，投在东侧毛玻璃门上的影子也会被拉长到一米八以上。"
    mc "那位真正弹响《月光》第二声部的人，以前常陪已毕业的器乐社姐姐练习这首曲子。她听见隔壁学妹总在换把处紧张抢拍，又不好意思贸然敲门指点，便趁借用隔壁琴房的空档溜进来半站着伴奏九十秒，再留下一行图书馆索书卡风格的铅笔批注。"
    show alice smile at left
    show mo happy at right
    alice "所以呀，本台决定替这位脸皮薄的好心伴奏家保密姓名！不过我们要借着电波转告隔壁第二琴房的你——那位『怕黑的节拍器』同学已经在第三音乐室擦干净了双人琴凳，明天下午四点，不用再躲回门后啦，光明正大坐下来合奏一曲吧！"
    play sound se_crane
    "广播室窗外的走廊尽头，似乎传来林依依轻轻松了一口气的脚步声。墨墨摘下半边耳机，弯起眼眸在值机日志第一页画下了一只站在五线谱上的小纸鹤。"

    call _radio_booth_finish_broadcast("b1", _rb_mistakes)
    return


################################################################################
## 八、电波来信 B-02：《植物园温室消失的蓝玫瑰名牌》
################################################################################

label radio_letter_b2:
    call _radio_booth_init_sandbox("旧广播电台 · B-02 植物园温室消失的蓝玫瑰名牌", "clear")
    $ _rb_mistakes = 0
    $ _b2_c1 = False
    $ _b2_c2 = False

    scene bg black with fade
    $ play_bgm(bgm_suspense, fadein=1.5)
    centered "{size=+6}校园旧广播站推理来信电台 · BROADCAST B-02{/size}\n\n{size=+14}植物园温室消失的蓝玫瑰名牌{/size}\n\n{color=#f4d98a}FM 88.6 MHz · 周五 16:40 雨霁花房档 · 喷雾时标与柠檬酸褪色暗痕{/color}"

    scene bg clubroom at bg_kenburns_out
    $ set_ambient("warm")
    with dissolve

    play sound se_bell
    "周五傍晚的一场阵雨刚歇，澄澈的雨后天光透过旧广播站的木格窗洒在调音台上。一只装在透明防潮袋里的棉浆水彩卡纸，正随第二封听众来信摆在真空管话筒前。"
    show alice think at left
    show mo neutral at right
    alice "各位听众傍晚好，这里是 FM 88.6『万事屋暮色推理点播台』！明天就是云溪高中一年一度的校园植物展，可就在二十分钟前，园艺社一位署名『雾玻璃水滴』的一年级见习生火急火燎投来了紧急求助信！"
    mc "我刚看了一眼来信摘要：她练了整整两周蘸水钢笔字，用可洗皇家蓝墨水在手工棉浆卡上写好了嫁接品种『蓝色华尔兹』的展示名牌，下午 15:20 还端端正正立在温室 C 号花架的铜夹上。"
    show alice shock at left
    alice "没错！结果她去教学楼取完装饰丝带、16:02 跑回玻璃温室时，四点整的定时水雾刚好停下，铜夹上却只剩这张湿漉漉的『无字白卡』，凑近闻还有股淡淡的柠檬清酸味！大家众说纷纭，有人猜是恶作剧调包，也有人猜是喷雾水珠把字冲没了！"
    play sound se_write
    show mo think at right
    "墨墨捏起防潮袋边缘，借着播音台小铜灯的暖光把卡纸斜倾了四十五度，纤长睫毛轻轻一颤，提笔在便签上写下一句关键发现。"
    mo_note "这张卡纸不是被水冲白的原件，而是原本垫在名牌底下的备用衬卡——看它右上角，有一圈遇酸褪成浅青色的墨晕，还有三行垫写压痕。"

    scene bg hall
    $ set_ambient("clear")
    with dissolve

    show zhang smile at left
    show shezhang blush at right
    "趁着广播间插播校园开放日导览须知的几分钟间隙，我们拎着放大镜赶到一楼礼堂西侧相连的植物园玻璃温室走廊，恰好迎面撞见气喘吁吁拎着文具店纸袋跑回来的高社长，以及在门口帮忙搬花盆的张子谦。"
    zhang "哟，三位大侦探来得真巧！我 15:38 在校门口看见老高袖口湿了一截、围裙上还沾着白晶晶的粉末往外冲，还以为生物园艺联展缺什么器材呢！"
    shezhang "咳、咳咳！我只是去校外美术社看看有没有进口棉浆水彩卡纸卖……温室门锁一下午都没坏，你们可别听风就是雨啊！"
    hide zhang
    hide shezhang
    with dissolve

    show alice happy at left
    show mo smile at right
    mc "高社长眼神躲闪得也太明显了！趁回播音室之前，我们赶紧核对一下温室 C 区的喷雾阀门和北侧通风窗！"

label radio_b2_investigate:
    if _b2_c1 and _b2_c2:
        jump radio_b2_back_to_booth
    menu:
        "查验温室 C 区喷雾电磁阀刻度与红砖地面的水迹" if not _b2_c1:
            $ _b2_c1 = True
            play sound se_clue
            "玻璃温室里的红砖步道还带着湿润的泥土芬芳。我蹲下检查 C 号花架下方的黄铜分路阀：自动定时盘确实只在整点跳格，但旁边的手动冲淋旋钮上却留着半干的白粉状柠檬酸结晶与 15:35 的巡检拨针印。"
            show alice think at left
            alice "懂啦！温室红砖地平时干着的时候一踩一个灰脚印，15:35 有人打翻了什么液体，顺手拧开十秒手动喷雾冲洗台面，连带把匆忙进出的鞋印也盖过去啦！"
            jump radio_b2_investigate

        "在侧逆光下辨认备用卡纸压痕并查看温室北窗烘干架" if not _b2_c2:
            $ _b2_c2 = True
            play sound se_page
            "墨墨走到温室北侧干燥通风的木制百叶窗前，轻轻指了指第三格竹编沥水网——上面赫然平铺着一张刚吸干水分的花边水彩卡，正中央『蓝色华尔兹』五个隽秀的钢笔字只有边角褪成了淡淡的湖蓝色，正文依旧清晰可辨！"
            show mo happy at right
            play sound se_write
            mo_note "鲜切花保鲜粉的主要成分是柠檬酸。可洗皇家蓝钢笔水里的苯胺蓝染料一遇弱酸就会迅速消色，高社长怕学妹伤心，才把原卡放在北窗阴干，想去买新纸照着垫痕重抄赔罪。"
            jump radio_b2_investigate

label radio_b2_back_to_booth:
    scene bg riverside
    $ set_ambient("dusk")
    with dissolve

    show alice smile at left
    show mo smile at right
    "伴着河畔吹来的清爽晚风，我们回到旧广播站重新坐定。推开麦克风开关的一刻，暖黄的台灯映在盘式磁带金属轮盘上，泛起温润的光泽。"
    alice "FM 88.6 听众朋友们久等啦！关于植物园温室『蓝色华尔兹』名牌失踪案，现场既没有恶作剧小偷，也不是自动喷雾闯的祸——陈默搭档，快把这桩带着柠檬香气的乌龙真相告诉那位园艺社学妹吧！"

label radio_b2_q_loop:
    show screen radio_onair_prompt_banner("FM 88.6 直播推演 · 柠檬酸消色反应与 15:35 手动水雾", "现场留下的实为带柠檬酸香与垫写凹痕的备用衬卡，C 区阀门在 15:35 被手动拧开冲洗——原版名牌究竟经历了什么？")
    menu:
        "是隔壁展区同学在 15:00 前恶作剧顺走了名牌，并故意洒上柠檬汽水掩盖指纹":
            hide screen radio_onair_prompt_banner
            $ _rb_mistakes += 1
            play sound se_wrong
            show alice angry at left, sprite_jump
            show mo think at right
            alice "不对不对！15:20 来信学妹离开温室时名牌明明还在铜夹上呢，15:00 之前怎么可能被偷走？而且柠檬汽水含糖黏手，可不会析出干爽的鲜花保鲜粉晶粒！"
            play sound se_write
            mo_note "再想想张子谦 15:38 在校门口撞见谁急匆匆跑去美术文具店买同款水彩卡纸吧。"
            jump radio_b2_q_loop

        "是 16:00 整的自动纯净水喷雾把防水碳素墨水彻底冲刷干净，只剩下一张白卡":
            hide screen radio_onair_prompt_banner
            $ _rb_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo smile at right
            alice "哎呀化学课代表要扣分啦！碳素墨水根本不溶于清水，哪怕泡在水里也不会四十分钟变成无字天书；这里发生褪色的是怕酸的可洗皇家蓝染料墨水！"
            play sound se_write
            mo_note "而且铜夹上留下的只是垫在底下的备用衬卡，真正的原版名牌正安安全全躺在温室里阴干呢。"
            jump radio_b2_q_loop

        "高社长 15:35 调配柠檬酸保鲜液时不慎溅湿名牌边角，将原卡移至北窗烘干架第 3 格阴干，并跑去买新卡想补抄赔罪":
            hide screen radio_onair_prompt_banner
            play sound se_correct

    mc "致正在收听广播的『雾玻璃水滴』同学：请放心，你苦练两周写下的展示名牌一笔也没有少，此刻就平平整整躺在温室北窗通风烘干架的第三格上。"
    mc "下午三点三十五分，负责统筹联展的高社长替各花架添加柠檬酸鲜花保鲜液时，不小心溅湿了你名牌的右上角。可洗皇家蓝钢笔水遇到弱酸性的柠檬酸会褪成浅青色，前辈生怕毁了你的心血，便立刻用吸水纸救下原卡放到北窗阴干，拧开十秒喷雾冲净花架，自己则冒着小雨跑去校外文具店买同款卡纸，想照着备用衬卡上的笔尖压痕替你补救。"
    show alice happy at left
    show mo happy at right
    alice "而且墨墨导播刚才特意鉴定过啦——被柠檬酸轻轻晕出一圈淡青边角的原版名牌，反而跟渐变花瓣的『蓝色华尔兹』绝配！高社长现在已经捧着名牌和一瓶崭新的防水墨水站在温室门口等你去验收咯！"
    play sound se_crane
    "窗外暮色渐浓，艺术楼与植物园玻璃穹顶依次亮起柔和的暖白路灯。墨墨笑着合上物证袋，在广播站台历的周五格子里轻轻盖上了一枚小小的纸鹤印记。"

    call _radio_booth_finish_broadcast("b2", _rb_mistakes)
    return


################################################################################
## 九、电波来信 B-03：《旧广播站天台寄往四年前的电波》（联动防剧透真约尾声）
################################################################################

label radio_letter_b3:
    call _radio_booth_init_sandbox("旧广播电台 · B-03 旧广播站天台寄往四年前的电波", "dusk")
    $ _rb_mistakes = 0
    $ _b3_c1 = False
    $ _b3_c2 = False

    scene bg black with fade
    $ play_bgm(bgm_prologue, fadein=1.5)
    centered "{size=+6}校园旧广播站推理来信电台 · BROADCAST B-03{/size}\n\n{size=+14}旧广播站天台寄往四年前的电波{/size}\n\n{color=#f4d98a}FM 88.6 MHz · 深秋 17:20 晚霞收台特辑 · 气窗声波与双生铃音{/color}"

    scene bg clubroom at bg_kenburns_in
    $ set_ambient("dusk")
    with dissolve

    play sound se_page
    "代班主持的最后一个深秋傍晚，五点二十分的火烧云将整间旧广播站染成了浓郁的玫瑰琥珀色。负责校产检修的王老师抱来一只蒙尘的樟木备件匣，笑呵呵地放在导播台旁。"
    show wang smile at center
    wang "今天整理广播站老发射机底座，从夹缝里翻出了四年前十月底封存的一盘测试磁带，外加一张写给『未来值班播音员』的折角卡片。你们侦探社最擅长解这种陈年小谜题，收台前不妨听听看！"
    hide wang with dissolve

    show alice think at left
    show mo neutral at right
    play sound se_clue
    "我将那盘巴掌大的黄铜轴盘式磁带挂上副机，按下播放键。沙沙的温暖磁底声过后，先是响起『叮、叮、叮——叮——叮、叮』三短一长两短的清脆黄铜桌铃声；紧接着隔了两秒半，磁带最末尾竟又录下了一串极轻柔、夹杂着秋日麻雀振翅与晚风声的同节奏风铃音！"
    alice "咦？卡片署名是『代号 · 折翼纸鹤呼叫台』！上面写着：四年前那个傍晚 17:25，通往三楼天台的广播有线监听电缆明明因为大修彻底断路了，值机簿上也记着『天台副线未接通』。"
    show alice shock at left
    alice "可既然电缆断了、天台喇叭根本没响，为什么这盘在播音室里录下的磁带末尾，会多出第二串带着露天风声的应答铃音？难道当年的播音员会隔空传音不成？！"
    play sound se_write
    show mo think at right
    "墨墨轻轻抚过那张四年前的值机簿残页，目光落在纸页右上角一道熟悉的十字对角谷折压痕上，神情格外温柔专注。"
    mo_note "不是隔空传音，是有人把整栋旧社团楼的走廊与气窗，当成了不需要电线的传声筒。我们去北窗和天台楼梯口看一眼就能证实。"

label radio_b3_investigate:
    if _b3_c1 and _b3_c2:
        jump radio_b3_back_to_booth
    menu:
        "推开播音室北侧木气窗，实测与三楼天台铁门之间的直线距离" if not _b3_c1:
            $ _b3_c1 = True
            play sound se_door
            "我们走到播音室后排储物柜旁，拨开老式黄铜插销推开高处的北侧木气窗——清凉的晚风立刻灌入室内，正前方不到九米远的半层平台上方，赫然就是通往旧社团楼天台的半敞铁门！"
            show alice happy at left
            alice "天哪，原来这扇平时被柜子挡住的气窗正对着天台楼梯井！才九米远的距离，哪怕有线广播断路了，只要推开这扇气窗敲响高频黄铜桌铃，站在天台栏杆边的人也能听得一清二楚！"
            jump radio_b3_investigate

        "比对磁带两段铃声的 2.4 秒间隔与值机簿背面的折翼纸鹤签收暗记" if not _b3_c2:
            $ _b3_c2 = True
            play sound se_crane
            "回到导播台仔细端详值机簿缺角：当年有人裁下右上角正方形纸片折成千纸鹤顺着楼梯风飘向天台平台，而天台上的朋友听见三短一长两短的桌铃呼叫后，立刻摇响随身小风铃回敲同样节奏，并在捡起的纸鹤右翼折出一道小小弯角送回门缝。"
            show mo smile at right
            play sound se_write
            mo_note "两段铃声相隔 2.4 秒，刚好是天台上的朋友听完六个音符、抬手摇响风铃回应的反应时间。那段电波从头到尾都不是无人回应的独白。"
            jump radio_b3_investigate

label radio_b3_back_to_booth:
    scene bg rooftop
    $ set_ambient("dusk")
    with dissolve

    "站在洒满晚霞的三楼天台栏杆旁望向播音室北侧的小气窗，四年前那个秋日傍晚的画面仿佛穿越时光重叠在眼前——没有接通的电缆两端，两个守约的人用六声清脆铃响完成了最默契的双向呼叫。"

    scene bg sunset
    $ set_ambient("dusk")
    with dissolve

    show alice smile at left
    show mo smile at right
    "重返玫瑰金色暮光笼罩的直播间，收台钟声即将敲响。艾丽丝把黄铜真空管话筒往我们中间轻轻推近了半寸。"
    alice "各位听众，这是万事屋代班主持的最后一期压轴谜题啦！四年前『天台断路电缆里的神秘双生铃音』，就请陈默副主播为全校听众揭开这封跨时空来信的真正回执吧！"

label radio_b3_q_loop:
    show screen radio_onair_prompt_banner("FM 88.6 收台推演 · 九米气窗声波与 2.4 秒远场回铃", "17:25 有线监听断路，但北侧气窗距天台仅九米，磁带后半段铃音夹杂晚风鸟鸣且值机簿留有折纸压痕——真相是什么？")
    menu:
        "是盘式录音机磁头老化漏磁，把第一段桌铃自动复制成了一段延迟 2.4 秒的电流回声":
            hide screen radio_onair_prompt_banner
            $ _rb_mistakes += 1
            play sound se_wrong
            show alice angry at left, sprite_jump
            show mo think at right
            alice "不对啦！磁带漏磁印透只会复制出一模一样的干瘪原音，怎么可能凭空变出天台上的秋风声和麻雀扑棱翅膀的声音嘛！"
            play sound se_write
            mo_note "再想想刚才我们推开播音室北侧木气窗时，九米外正对着哪扇门，以及第二段风铃清脆不同的音色吧。"
            jump radio_b3_q_loop

        "播音员推开距天台仅九米的北侧气窗敲响桌铃，天台上的伙伴听见后摇响随身风铃隔窗应答，并以折翼纸鹤签收":
            hide screen radio_onair_prompt_banner
            play sound se_correct

        "天台电缆其实并未断路，是有人在天台副喇叭旁放了一台复读机循环播放测试带":
            hide screen radio_onair_prompt_banner
            $ _rb_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo smile at right
            alice "噗，要是电缆没断，王老师的检修万用表早就亮绿灯啦！而且复读机可不会自己在值机簿背面写下『收信人已折翼签收』呀！"
            play sound se_write
            mo_note "正是因为有线线路断了，他们才用最朴素的开窗传声与千纸鹤折角，证明彼此一直都在。"
            jump radio_b3_q_loop

    mc "四年前那位留下测试磁带的前辈，其实早就收到了回应。虽然通往天台的广播电缆当时断路，但播音室北侧气窗距离天台入口只有九米。当播音员推开木窗敲响『三短一长两短』的黄铜桌铃时，守在天台晚霞里的朋友听见暗号，隔着两秒半摇响了随身的小风铃作为回答。"
    mc "值机簿上写着『副线未接通』只是机械仪表的记录；而在人的心里，那道穿过晚风与纸鹤折痕的电波，早在四年前就已经稳稳接通了。"

    if truth_spoiler_unlocked():
        $ play_bgm(bgm_te, fadein=1.5)
        show mo blush at right
        "话音落下，我正准备按惯例替墨墨念出笔记本上的收台寄语，身旁的少女却轻轻按住了牛皮纸笔记本的边缘。"
        "在橙红色真空管灯丝静静跳动的微光里，墨墨深吸一口气，抬起澄澈的眼眸望向那支黄铜话筒——就像那个夕阳下她终于冲破四年沉默的傍晚一样，清晰、轻柔却无比笃定地开口说道："
        mo "……这里是云溪高中 FM 88.6，万事屋暮色电台。致四年前的『折翼纸鹤呼叫台』，也致正在收听的周可、艾丽丝和陈默——迟到的电波我们已经全部收到了，明天见。"
        show alice shock at left
        alice "呜哇……墨墨居然亲自开麦念收台词了！快快快，盘式母带还在转，这一轨本社长要贴上鎏金封条永久典藏！"
        show mo happy at right
        mc "嗯，不管过去隔了多少个冬天，往后的每一期日常，我们都会像今天这样有声有色地录下去。"
    else:
        $ play_bgm(bgm_warm, fadein=1.2)
        play sound se_bell
        show mo happy at right
        "收台乐曲轻轻流淌起来，墨墨拿起桌边的黄铜小铃铛，对着微亮的真空管话筒轻轻敲出了『叮、叮、叮——叮——叮、叮』六下清脆回响，随后把写满暖意的手记推到镜头与灯光中央。"
        mo_note "致所有在傍晚收听 FM 88.6 的朋友：只要有人愿意倾听，每一句藏在心底的话，终究都会迎来回音。"
        show alice happy at left
        alice "说得好！以上就是『万事屋暮色推理点播台』的全部特别节目啦——无论明天遇到什么小谜题，万事屋的大门和千纸鹤永远为大家敞开，我们下次电波再见！"

    play sound se_crane
    "橙黄色的『ON AIR』指示灯缓缓熄灭，窗外漫天晚霞映着并肩整理磁带与纸鹤的三道身影，温暖而绵长。"

    call _radio_booth_finish_broadcast("b3", _rb_mistakes)
    return
