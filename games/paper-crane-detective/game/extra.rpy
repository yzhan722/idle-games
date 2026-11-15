## 额外系统：章节选择 + 结局收集画廊
## extra.rpy
##
## 设计要点：
##   - 不改动各章节剧情文件，改用 config.label_callback 在「进入 label」时
##     自动记录已解锁的章节与已达成的结局到 persistent，安全且零侵入。
##   - 章节选择：跳转到对应章节 label 重玩。
##   - 结局收集：以 CG 缩略图 + 文案展示玩家达成过的结局，未达成显示 ???。

################################################################################
## 一、进度自动记录（label 进入回调）
################################################################################

default current_chapter_label = "prologue"

init -2 python:
    _rm_init = getattr(renpy, "music", None)
    if _rm_init is not None and hasattr(_rm_init, "register_channel"):
        _rm_init.register_channel("amb_rain", mixer="sfx", loop=True, stop_on_mute=True, tight=True, buffer_queue=True)
        _rm_init.register_channel("amb_study", mixer="sfx", loop=True, stop_on_mute=True, tight=True, buffer_queue=True)

init python:

    # label 名 -> 章节序号
    _LABEL_TO_CHAPTER = {
        "prologue": 0,
        "chapter1": 1,
        "interlude0": 2,
        "chapter2": 2,
        "chapter3": 3,
        "interlude1": 4,
        "chapter4": 4,
        "chapter5": 5,
        "chapter6": 6,
    }

    # 结局 label -> persistent 字段
    _LABEL_TO_ENDING = {
        "ending_te":     "end_te",
        "ending_he":     "end_he",
        "ending_ne":     "end_ne",
        "ending_be":     "end_be",
        "ending_hidden": "end_hidden",
    }

    _DLC_LABELS = {
        "dlc_alice_ledger":  "番外一 · 艾丽丝的代价账本",
        "dlc_mo_bookstreet": "番外二 · 旧书街与第三只千纸鹤",
    }

    _MAILBOX_LABELS = {
        "mailbox_case_m1": "委托信箱 · M-01 图书馆消失的借书卡",
        "mailbox_case_m2": "委托信箱 · M-02 美术室未干的群青颜料",
        "mailbox_case_m3": "委托信箱 · M-03 钟楼午休的第七声回响",
    }

    _TEA_PARTY_LABELS = {
        "tea_party_t1": "午后茶话会 · T-01 伯爵红茶里的方糖不在场证明",
        "tea_party_t2": "午后茶话会 · T-02 艾丽丝的零花钱密室之谜",
        "tea_party_t3": "午后茶话会 · T-03 墨墨速写本最后一页的暗号",
    }

    _SEASON_LETTER_LABELS = {
        "season_letter_spring": "四季信笺 · SL-01 春樱坡道与万事屋第一枚招新章",
        "season_letter_summer": "四季信笺 · SL-02 骤雨屋檐下的弹珠汽水签之谜",
        "season_letter_autumn": "四季信笺 · SL-03 银杏旧书街的夹页荐书单",
        "season_letter_winter": "四季信笺 · SL-04 初雪万事屋的围炉跨年信",
    }

    _RADIO_BOOTH_LABELS = {
        "radio_letter_b1": "旧广播电台 · B-01 第三音乐室午后四点的幽灵伴奏",
        "radio_letter_b2": "旧广播电台 · B-02 植物园温室消失的蓝玫瑰名牌",
        "radio_letter_b3": "旧广播电台 · B-03 旧广播站天台寄往四年前的电波",
    }

    # 结局 label -> 成就 id
    _ENDING_TO_ACH = {
        "ending_te":     "ach_te",
        "ending_he":     "ach_he",
        "ending_ne":     "ach_ne",
        "ending_be":     "ach_be",
        "ending_hidden": "ach_hidden",
    }

    def _progress_label_callback(name, abnormal):
        # 进入任何主线/番外/结局/委托卷宗/茶话会/四季信笺/旧广播电台剧场时，确保鉴赏室留声机白噪音与音量倍率归零复位，绝不污染剧情音频
        if (name == "start" or name in _LABEL_TO_CHAPTER or name in _LABEL_TO_ENDING
                or name in _DLC_LABELS or name in _MAILBOX_LABELS
                or name in _TEA_PARTY_LABELS or name in _SEASON_LETTER_LABELS
                or name in _RADIO_BOOTH_LABELS):
            if "stop_all_gramophone_ambience" in globals():
                stop_all_gramophone_ambience(reset_music_vol=True)
        # 从标题"开始游戏"进来的完整周目（章节选择 / 重温结局不会经过 start）
        if name == "start":
            store.full_run = True
            store.current_chapter_label = "prologue"
        # 记录当前所在章节/番外/结局/委托信箱/茶话会/四季信笺/旧广播电台入口 label，供折纸书签跳转定位
        if (name in _LABEL_TO_CHAPTER or name in _LABEL_TO_ENDING
                or name in _DLC_LABELS or name in _MAILBOX_LABELS
                or name in _TEA_PARTY_LABELS or name in _SEASON_LETTER_LABELS
                or name in _RADIO_BOOTH_LABELS):
            store.current_chapter_label = name
        # 记录已到达的最高章节
        if name in _LABEL_TO_CHAPTER:
            n = _LABEL_TO_CHAPTER[name]
            cur = persistent.chapter_reached or 0
            if n > cur:
                persistent.chapter_reached = n
            # 存档位名称：进入章节时写入章名，存读档页的缩略图下会显示"第二章 · 天台上的恐吓信"
            for (lbl, title, _need) in CHAPTER_LIST:
                if lbl == name:
                    store.save_name = title
                    break
            # 从"章节选择"直接进入某章时不会经过 label start，这里保证证据/羁绊 HUD 一定在
            if not renpy.get_screen("evidence_book"):
                renpy.show_screen("evidence_book")
            # 里程碑成就
            if name == "chapter1":
                ach_grant("ach_start")
                if store.crane_given:
                    ach_grant("ach_crane")
            elif name == "chapter4":
                ach_grant("ach_half")
                if store.truth_route:
                    ach_grant("ach_truth")
        # 记录已达成结局 + 结局成就
        if name in _LABEL_TO_ENDING:
            setattr(persistent, _LABEL_TO_ENDING[name], True)
            if name == "ending_te":
                persistent.te_cleared = True
            ach_grant(_ENDING_TO_ACH[name])
            if all(getattr(persistent, e[0], False) for e in ENDING_LIST):
                ach_grant("ach_all_end")
            # 统计类成就只在从 start 一路玩下来的完整周目结算
            if name != "ending_hidden" and store.full_run:
                if store.fail_count == 0:
                    ach_grant("ach_perfect")
                if store.mo_favor >= 100:
                    ach_grant("ach_bond")
        # 全 CG：隐藏结局最后一张 CG 看完后会回到 main_menu label，这里顺带结算
        if name in ("main_menu", "credits") or name in _LABEL_TO_ENDING:
            ach_check_cg()

    config.label_callback = _progress_label_callback


################################################################################
## 二、章节选择数据
################################################################################

init python:
    # (跳转 label, 显示标题, 解锁所需的最低 chapter_reached)
    CHAPTER_LIST = [
        ("prologue", "序章 · 图书馆的冤案", 0),
        ("chapter1", "第一章 · 消失的包裹", 1),
        ("interlude0", "间章 · 万事屋的第一天", 2),
        ("chapter2", "第二章 · 天台上的恐吓信", 2),
        ("chapter3", "第三章 · 桌游社的密室", 3),
        ("interlude1", "间章 · 日常的一天", 4),
        ("chapter4", "第四章 · 向言来校 · 签名会", 4),
        ("chapter5", "第五章 · 重现的旧案", 5),
        ("chapter6", "终章 · 千纸鹤的约定", 6),
    ]

    # (persistent 字段, 标题, 副标, CG 缩略图, 重温跳转的结局 label)
    ENDING_LIST = [
        ("end_te",     "TRUE END · 重新发声",   "沉默的侦探，终于为自己开口",   "cg reunion",     "ending_te"),
        ("end_he",     "GOOD END · 无言的心意", "有些话，藏在千纸鹤里",       "cg promise",     "ending_he"),
        ("end_ne",     "NORMAL END · 洗清的冤屈", "可靠的伙伴，刚刚好的距离",   "cg dusk",        "ending_ne"),
        ("end_be",     "BAD END · 迟来的真相",  "有些沉默，再也唤不回来",     "cg badend",      "ending_be"),
        ("end_hidden", "HIDDEN END · 第二只千纸鹤", "全结局达成，感谢游玩",   "cg secondcrane", "ending_hidden"),
    ]

    def ending_count_text():
        """主菜单按钮上显示的结局收集进度，如 (3/5)"""
        got = sum(1 for e in ENDING_LIST if getattr(persistent, e[0], False))
        return "(%d/%d)" % (got, len(ENDING_LIST))


################################################################################
## 三、章节选择画面
################################################################################

init python:
    # 番外短篇 DLC：(跳转 label, 角标, 标题, 简介, 缩略图, 完成标记字段, 是否建议通关真结局后游玩)
    DLC_LIST = [
        (
            "dlc_alice_ledger",
            "番外一",
            "艾丽丝的代价账本",
            "桌游社镇社骑士棋子离奇失踪，现场只留下一张写着「抵万事屋账本第 47 页」的撕角借据。",
            "cg alice_sunset",
            "dlc_alice_done",
            False,
        ),
        (
            "dlc_mo_bookstreet",
            "番外二",
            "旧书街与第三只千纸鹤",
            "【TRUE END 后日谈】周六午后的梧桐旧书街与太阳雨，重新开口说话的墨墨与你合折第三只千纸鹤。",
            "cg secondcrane",
            "dlc_mo_done",
            True,
        ),
    ]

    # 章节卡片上的一句话简介（label -> 简介）
    CHAPTER_BLURBS = {
        "prologue":   "转学第一天，被十字固按在图书馆地板上的人，只能求助万事屋。",
        "chapter1":   "六个纸箱、一枚磁条、八公里，和一本泡过水的《美丽新世界》。",
        "chapter2":   "剪报拼成的恐吓信，四年前的旧报纸，以及天台上的一盒便当。",
        "chapter3":   "门锁完好、窗关着的桌游社。凭空出现又消失的旧相册。",
        "interlude0": "入社第一天：一本代价簿、少二十块的小卖部、一盒用来提问的萝卜。",
        "interlude1": "食堂二楼的咖喱、三千册磁条、一把两个人各湿一边肩膀的伞。",
        "chapter4":   "向言来校。在两种沉默之间，他替不能开口的人开了口。",
        "chapter5":   "墨墨没来上课。课桌里只有四个字：不要找我。",
        "chapter6":   "被还原的旧仓库。三个人，四年，一句没说出口的话。",
    }

    # 章节卡缩略图（label -> 场景图），用各章最有代表性的背景 / CG
    CHAPTER_THUMBS = {
        "prologue":   "bg library",
        "chapter1":   "cg signing",
        "interlude0": "bg agency",
        "chapter2":   "bg rooftop",
        "chapter3":   "bg clubroom",
        "interlude1": "bg canteen",
        "chapter4":   "bg booksigning",
        "chapter5":   "bg oldbuilding",
        "chapter6":   "cg confront",
    }

screen chapter_select():
    tag menu

    use game_menu(_("章节选择"), scroll="viewport", subtitle=_("重玩会重置好感与线索")):


        style_prefix "chapter_select"

        vbox:
            xsize 722
            spacing 10

            hbox:
                spacing 10
                yalign 0.5
                text _("✦ 番外短篇（DLC）") style "extras_section_text" color "#f4d98a" yalign 0.5
                text _("独立短篇剧本 · 不影响主线存档与好感") size 14 color "#a892c2" yalign 0.5

            for dlc_lbl, dlc_badge, dlc_name, dlc_blurb, dlc_thumb, dlc_done_key, dlc_need_te in DLC_LIST:
                $ _dlc_done = getattr(persistent, dlc_done_key, False)
                $ _dlc_prompt = (
                    "开启番外后日谈「%s」？\n（本篇包含 TRUE END 后续剧透，建议达成真结局后体验；亦可直接进入）" % dlc_name
                    if (dlc_need_te and not persistent.te_cleared)
                    else "开启独立番外短篇「%s」？\n（独立剧情，不会改动主线章节进度）" % dlc_name
                )
                button:
                    style "chapter_card"
                    at card_hover_fx
                    action Show("confirm",
                                message=_dlc_prompt,
                                yes_action=[Hide("confirm"), Hide("chapter_select"), Start(dlc_lbl)],
                                no_action=Hide("confirm"))
                    hbox:
                        spacing 16
                        yalign 0.5
                        frame:
                            style "chapter_thumb"
                            add dlc_thumb:
                                crop_relative True
                                crop (0.0, 0.056, 1.0, 0.888)
                                xysize (152, 76)
                                fit "contain"
                        vbox:
                            spacing 4
                            yalign 0.5
                            hbox:
                                spacing 10
                                frame:
                                    style "chapter_badge"
                                    text dlc_badge style "chapter_badge_text" xalign 0.5 yalign 0.5
                                text dlc_name style "chapter_name_text" yalign 0.5
                                if _dlc_done:
                                    text _("✓ 已读完") size 14 color "#86efac" bold True yalign 0.5
                            text dlc_blurb style "chapter_blurb_text"

            null height 8
            text _("✦ 本篇章节回溯") style "extras_section_text"

            for idx, (lbl, title, need) in enumerate(CHAPTER_LIST):
                $ parts = title.split(" · ", 1)
                $ badge = parts[0]
                $ name = parts[1] if len(parts) > 1 else ""
                if (persistent.chapter_reached or 0) >= need:
                    button:
                        style "chapter_card"
                        at card_hover_fx
                        action Show("confirm",
                                    message="从「%s」重新开始？\n（好感度与线索将重置为默认值）" % title,
                                    yes_action=[Hide("confirm"), Hide("chapter_select"), Start(lbl)],
                                    no_action=Hide("confirm"))
                        hbox:
                            spacing 16
                            yalign 0.5
                            frame:
                                style "chapter_thumb"
                                add CHAPTER_THUMBS.get(lbl, "bg library"):
                                    crop_relative True
                                    crop (0.0, 0.056, 1.0, 0.888)
                                    xysize (152, 76)
                                    fit "contain"
                            vbox:
                                spacing 4
                                yalign 0.5
                                hbox:
                                    spacing 10
                                    frame:
                                        style "chapter_badge"
                                        text badge style "chapter_badge_text" xalign 0.5 yalign 0.5
                                    text name style "chapter_name_text" yalign 0.5
                                text CHAPTER_BLURBS.get(lbl, "") style "chapter_blurb_text"
                else:
                    frame:
                        style "chapter_card_locked"
                        hbox:
                            spacing 16
                            yalign 0.5
                            frame:
                                style "chapter_thumb"
                                add "gui/slot_empty.png" align (0.5, 0.5) alpha 0.6
                            vbox:
                                spacing 4
                                yalign 0.5
                                hbox:
                                    spacing 10
                                    frame:
                                        style "chapter_badge_locked"
                                        text badge style "chapter_badge_locked_text" xalign 0.5 yalign 0.5
                                    text _("尚未解锁") style "chapter_locked_text" yalign 0.5
                                text _("继续游玩到此章后开放") style "chapter_blurb_locked_text"


style chapter_card is default:
    xfill True
    ysize 96
    padding (10, 10)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style chapter_card_locked is chapter_card:
    background Frame("gui/panel_card.png", 16, 16)

style chapter_thumb is default:
    xsize 152
    ysize 76
    padding (0, 0)
    background "#0e0a18"

style chapter_badge is default:
    xsize 72
    ysize 30
    background Frame("gui/pill_selected.png", 18, 18)
    padding (0, 0)
style chapter_badge_locked is chapter_badge:
    background Frame("gui/pill_idle.png", 18, 18)

style chapter_badge_text is text:
    size 15
    color "#ffffff"
style chapter_badge_locked_text is text:
    size 15
    color "#6a5c80"

style chapter_name_text is text:
    font gui.name_text_font
    size 23
    kerning 1
    color "#f2e6ff"
style chapter_blurb_text is text:
    size 17
    color "#a892c2"
style chapter_locked_text is text:
    size 24
    color "#6a5c80"
style chapter_blurb_locked_text is text:
    size 17
    color "#5e5070"


################################################################################
## 四、鉴赏（Extras）总页：结局 / 画廊 / 音乐室 / 成就 / 真相档案 / 折纸书签
##   分页状态存在 persistent.extras_tab，下次打开回到上次看的分页
################################################################################

default persistent.extras_tab = "endings"
default persistent.truth_spoiler_confirmed = False
default persistent.quote_bookmarks = []
default persistent.dossier_selected_char = "mo"
default persistent.dossier_case_filter = "all"
default persistent.studio_bg = "agency"
default persistent.studio_light = "auto"
default persistent.studio_slot1_char = "mo"
default persistent.studio_slot1_expr = "smile"
default persistent.studio_slot1_outfit = "standard"
default persistent.studio_slot2_char = "alice"
default persistent.studio_slot2_expr = "happy"
default persistent.studio_slot2_outfit = "standard"
default persistent.studio_speaker = "slot1_note"
default persistent.studio_custom_line = "发现真相不是为了证明你聪明。是为了让那个疼的人知道，有人看见了。"
default persistent.studio_show_textbox = True
default persistent.studio_hide_hud = False
default persistent.mailbox_cases = {}
default persistent.mailbox_selected_case = "m1"
default persistent.gramophone_rain_pct = 0
default persistent.gramophone_study_pct = 0
default persistent.gramophone_bgm_pct = 80
default persistent.gramophone_single_loop = False
default persistent.gramophone_stop_on_exit = True
default persistent.gramophone_preset = "pure_ost"
default persistent.gramophone_unlock_all = False
default persistent.gramophone_last_track = "audio/theme_main.ogg"
default persistent.tea_party_records = {}
default persistent.tea_party_selected = "t1"
default persistent.lexicon_read = []
default persistent.lexicon_cat_filter = "all"
default persistent.lexicon_search_query = ""
default persistent.lexicon_selected_id = "lex_c01"
default persistent.book_restoration_records = {}
default persistent.restoration_selected_tome = "r1"
default persistent.seasonal_letter_records = {}
default persistent.letterbox_selected_season = "spring"
default persistent.radio_booth_records = {}
default persistent.radio_selected_broadcast = "b1"
default persistent.origami_cabinet_records = {}
default persistent.origami_selected_crane = "c01"
default persistent.origami_cat_filter = "all"

init python:
    EXTRAS_TABS = [
        ("endings",   "结局"),
        ("cg",        "画廊"),
        ("music",     "雨夜留声机"),
        ("ach",       "成就"),
        ("mailbox",   "委托信箱"),
        ("truth",     "真相档案"),
        ("bookmarks", "折纸书签"),
        ("dossier",   "关系白板"),
        ("studio",    "自由剧场"),
    ]

    EXTRAS_SALON_TABS = [
        ("teaparty", "午后茶话会"),
        ("lexicon",  "推理社批注辞典"),
    ]

    EXTRAS_BOOKSTREET_TABS = [
        ("restoration", "古籍残卷修复台"),
        ("letterbox",   "四季手写信笺匣"),
    ]

    EXTRAS_RADIO_ORIGAMI_TABS = [
        ("radio",   "旧广播电台"),
        ("origami", "千纸鹤陈列柜"),
    ]

    def extras_count_text():
        """主菜单按钮上的总进度：结局 + CG + 成就 的已解锁数 / 总数"""
        got = (sum(1 for e in ENDING_LIST if getattr(persistent, e[0], False))
               + cg_unlocked_count() + ach_count())
        total = len(ENDING_LIST) + len(CG_LIST) + len(ACH_LIST)
        return "(%d/%d)" % (got, total)

    def reset_all_progress():
        """一键清空全部存档、已解锁 CG、结局、章节、成就、书签、委托信箱、茶话会、批注辞典、古籍修复台、四季信笺匣、旧广播电台与千纸鹤陈列柜"""
        persistent.chapter_reached = 0
        persistent.te_cleared = False
        persistent.truth_spoiler_confirmed = False
        persistent.quote_bookmarks = []
        persistent.dossier_selected_char = "mo"
        persistent.dossier_case_filter = "all"
        persistent.mailbox_cases = {}
        persistent.mailbox_selected_case = "m1"
        persistent.tea_party_records = {}
        persistent.tea_party_selected = "t1"
        persistent.lexicon_read = []
        persistent.lexicon_cat_filter = "all"
        persistent.lexicon_search_query = ""
        persistent.lexicon_selected_id = "lex_c01"
        persistent.book_restoration_records = {}
        persistent.restoration_selected_tome = "r1"
        persistent.seasonal_letter_records = {}
        persistent.letterbox_selected_season = "spring"
        persistent.radio_booth_records = {}
        persistent.radio_selected_broadcast = "b1"
        persistent.origami_cabinet_records = {}
        persistent.origami_selected_crane = "c01"
        persistent.origami_cat_filter = "all"
        if "restoration_reset_workbench_session" in globals():
            restoration_reset_workbench_session()
        if "origami_reset_session" in globals():
            origami_reset_session()
        persistent.gramophone_rain_pct = 0
        persistent.gramophone_study_pct = 0
        persistent.gramophone_bgm_pct = 80
        persistent.gramophone_single_loop = False
        persistent.gramophone_stop_on_exit = True
        persistent.gramophone_preset = "pure_ost"
        persistent.gramophone_unlock_all = False
        persistent.gramophone_last_track = "audio/theme_main.ogg"
        if "stop_all_gramophone_ambience" in globals():
            stop_all_gramophone_ambience(reset_music_vol=True)
        reset_studio_defaults(notify_user=False)
        persistent.last_player_name = None
        for end_field, _t, _s, _cg, _lbl in ENDING_LIST:
            setattr(persistent, end_field, False)
        for attr in ("_seen_images", "_seen_audio", "_seen_ever", "_chosen"):
            d = getattr(persistent, attr, None)
            if hasattr(d, "clear"):
                d.clear()
        achievement.clear_all()
        achievement.sync()
        for slot in list(renpy.list_slots()):
            try:
                renpy.unlink_save(slot)
            except Exception:
                pass
        renpy.save_persistent()
        renpy.notify("已恢复初始状态：存档、CG、结局、成就与书签已全部清空")

screen extras():
    tag menu

    ## 想直接打开某一分页：[SetField(persistent, "extras_tab", "cg"), ShowMenu("extras")]
    $ cur = persistent.extras_tab or "endings"

    ## 离开鉴赏页时按开关清理白噪音通道并把主菜单主题曲接回来
    on "hide" action [Function(gramophone_on_leave_extras), Play("music", config.main_menu_music, fadein=1.0, if_changed=True)]
    on "replaced" action [Function(gramophone_on_leave_extras), Play("music", config.main_menu_music, fadein=1.0, if_changed=True)]

    use game_menu(_("鉴赏"), subtitle=_("结局 · 画廊 · 留声机 · 成就 · 信箱 · 茶会 · 辞典 · 古籍 · 信笺 · 电台 · 鹤谱 · 真相 · 书签 · 白板 · 剧场")):

        vbox:
            spacing 7
            hbox:
                spacing 5
                for key, label in EXTRAS_TABS:
                    textbutton label:
                        style "extras_tab_button"
                        at pill_hover_fx
                        selected (cur == key)
                        action SetField(persistent, "extras_tab", key)
            frame:
                style "salon_subbar_frame"
                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 4
                        yalign 0.5
                        add "images/ui/icon_tea_party_cup.png" xysize (14, 14) yalign 0.5
                        textbutton ("茶话会 %d/3" % tea_party_cleared_count()):
                            style "bookstreet_subtab_pill"
                            selected (cur == "teaparty")
                            action SetField(persistent, "extras_tab", "teaparty")
                        textbutton ("批注辞典 %d/%d" % (lexicon_read_count(), len(LEXICON_ENTRIES))):
                            style "bookstreet_subtab_pill"
                            selected (cur == "lexicon")
                            action SetField(persistent, "extras_tab", "lexicon")
                        add "images/ui/icon_book_restoration.png" xysize (14, 14) yalign 0.5
                        textbutton ("古籍修复 %d/3" % restoration_completed_count()):
                            style "bookstreet_subtab_pill"
                            selected (cur == "restoration")
                            action SetField(persistent, "extras_tab", "restoration")
                        add "images/ui/icon_seasonal_letterbox.png" xysize (14, 14) yalign 0.5
                        textbutton ("四季信笺 %d/4" % letterbox_seal_count()):
                            style "bookstreet_subtab_pill"
                            selected (cur == "letterbox")
                            action SetField(persistent, "extras_tab", "letterbox")
                        add "images/ui/icon_radio_booth_mic.png" xysize (14, 14) yalign 0.5
                        textbutton ("旧广播电台 %d/3" % radio_solved_count()):
                            style "bookstreet_subtab_pill"
                            selected (cur == "radio")
                            action SetField(persistent, "extras_tab", "radio")
                        add "images/ui/icon_origami_cabinet.png" xysize (14, 14) yalign 0.5
                        textbutton ("千纸鹤陈列柜 %d/12" % origami_inspected_count()):
                            style "bookstreet_subtab_pill"
                            selected (cur == "origami")
                            action SetField(persistent, "extras_tab", "origami")
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 4
                        add "images/ui/icon_golden_vow_crane.png" xysize (14, 14) yalign 0.5
                        text ("鹤谱 %d/12" % origami_inspected_count()) size 11 color "#f4d98a" yalign 0.5
            viewport:
                ysize 468
                scrollbars "vertical"
                mousewheel True
                draggable True
                side_yfill True
                side_spacing 12
                vbox:
                    xsize 722
                    if cur == "endings":
                        use extras_endings
                    elif cur == "cg":
                        use extras_cg
                    elif cur == "music":
                        use extras_music
                    elif cur == "ach":
                        use extras_achievements
                    elif cur == "mailbox":
                        use extras_mailbox
                    elif cur == "teaparty":
                        use extras_teaparty
                    elif cur == "lexicon":
                        use extras_lexicon
                    elif cur == "restoration":
                        use extras_restoration
                    elif cur == "letterbox":
                        use extras_letterbox
                    elif cur == "radio":
                        use extras_radio_booth
                    elif cur == "origami":
                        use extras_origami_cabinet
                    elif cur == "truth":
                        use extras_truth
                    elif cur == "bookmarks":
                        use extras_bookmarks
                    elif cur == "dossier":
                        use extras_dossier
                    elif cur == "studio":
                        use extras_studio
                    else:
                        use extras_endings

style extras_tab_button is pill_button:
    xminimum 54
    ysize 34
    padding (8, 0)
style extras_tab_button_text is pill_button_text:
    size 15

style extras_section_text is text:
    size 17
    color "#9a86b8"
    kerning 2


## ---- 分页 1：结局收集 ----
screen extras_endings():
    $ _got = sum(1 for e in ENDING_LIST if getattr(persistent, e[0], False))
    vbox:
        spacing 8
        hbox:
            xfill True
            text "已收集 %d / %d" % (_got, len(ENDING_LIST)) style "extras_section_text" yalign 0.5
            if _got >= len(ENDING_LIST):
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "gui/icon_ach.png" zoom 0.65 yalign 0.5
                    text _("已集齐全部结局 · 看遍了千纸鹤的每一种约定"):
                        size 16
                        color "#f0d890"
                        yalign 0.5

        for field, title, sub, cgimg, lbl in ENDING_LIST:
            $ unlocked = getattr(persistent, field, False)
            frame:
                style "ending_card"
                fixed:
                    xfill True
                    ysize 68
                    frame:
                        style "ending_thumb"
                        xpos 0
                        yalign 0.5
                        if unlocked:
                            add cgimg:
                                crop_relative True
                                crop (0.0, 0.028, 1.0, 0.944)
                                xysize (128, 68)
                                fit "contain"
                                align (0.5, 0.5)
                        else:
                            text "?":
                                size 36
                                color "#5e5070"
                                align (0.5, 0.5)
                    if unlocked:
                        vbox:
                            xpos 146
                            yalign 0.5
                            spacing 3
                            text "[title]":
                                font gui.name_text_font
                                size 21
                                kerning 1
                                color "#f2e6ff"
                            text "[sub]":
                                size 16
                                color "#b39bd0"
                        ## 用回放模式重温：沿用上次的名字，不影响存档 / 进度，随时可从菜单"结束回放"
                        textbutton _("重温结局"):
                            style "pill_button"
                            xminimum 124
                            ysize 34
                            text_size 17
                            xalign 1.0
                            yalign 0.5
                            action Replay(lbl, scope={"player_name": persistent.last_player_name or "陈默"}, locked=False)
                    else:
                        vbox:
                            xpos 146
                            yalign 0.5
                            spacing 3
                            text _("尚未达成"):
                                size 21
                                color "#5e5070"
                            text _("继续游玩以解锁此结局"):
                                size 16
                                color "#5e5070"

style ending_card is default:
    xfill True
    ysize 84
    padding (12, 8)
    background Frame("gui/panel_card.png", 16, 16)

style ending_thumb is default:
    xsize 128
    ysize 68
    background "#0e0a18"
    padding (0, 0)


## ---- 分页 2：CG 画廊（解锁判定用引擎自带的 renpy.seen_image：任一周目演出过即算看过）----
init python:
    # (图片名, 标题, 出处)
    CG_LIST = [
        ("cg oden_warm",       "深夜的关东煮",   "序章 · 张记关东煮"),
        ("cg meet",            "书架间的初遇",   "序章 · 图书馆"),
        ("cg crane",           "歪歪的千纸鹤",   "序章 · 图书馆"),
        ("cg storeroom",       "六号箱的磁条",   "第一章 · 储物间"),
        ("cg medal",           "勇敢的小侦探",   "第一章 · 储物间"),
        ("cg lvfu",            "抱书的少女",     "第一章 · 图书馆"),
        ("cg alice_hand",      "伸出手掌的邀约", "第一章 · 图书馆"),
        ("cg signing",         "夕阳下的签名本", "第一章 · 校门口"),
        ("cg alice",           "万事屋的女王",   "第一章 · 万事屋"),
        ("cg agency",          "万事屋的代价簿", "间章一 · 万事屋"),
        ("cg zhang",           "晨光里的情报簿", "第二章 · 走廊"),
        ("cg banzhang_letter", "揉皱的剪报信",   "第二章 · 教室"),
        ("cg rooftop",         "挡风的便当盒盖", "第二章 · 天台"),
        ("cg lin",             "窗边的登记板",   "第二章 · 期刊室"),
        ("cg joker",           "怪盗的底牌",     "第二章 · 走廊"),
        ("cg letter",          "背面的三个字",   "第二章 · 教室"),
        ("cg alice_sunset",    "谢谢你念错",     "第二章 · 走廊"),
        ("cg mo_note",         "推过来的笔记本", "第二章 · 教室"),
        ("cg deduction",       "红线与放大镜",   "第三章 · 万事屋"),
        ("cg mo_tears",        "无声的眼泪",     "第三章 · 活动室"),
        ("cg zhouke_gate",     "路灯下的提问",   "第三章 · 校门口"),
        ("cg riverbank",       "河堤的粉纸鹤",   "第三章 · 河堤"),
        ("cg banzhang_curry",  "二楼的咖喱饭",   "间章二 · 食堂"),
        ("cg lin_strip",       "无声的比赛",     "间章二 · 图书馆"),
        ("cg dusk",            "靠窗的第四年",   "间章二 · 图书馆"),
        ("cg umbrella",        "雨夜同伞",       "间章二 · 林荫道"),
        ("cg lecture",         "礼堂的追光",     "第四章 · 礼堂"),
        ("cg lvfu_sign",       "第十一遍的译文", "第四章 · 签售会"),
        ("cg xiang",           "扉页上的留言",   "第四章 · 签售会"),
        ("cg mo_library_date", "歪翅膀的笑脸",   "第四章 · 图书馆"),
        ("cg gingertea",       "外婆家的姜茶",   "第四章 · 外婆家"),
        ("cg past",            "四年前的相册",   "第五章 · 回忆"),
        ("cg waipo",           "旧木盒与白纸鹤", "第五章 · 外婆家"),
        ("cg news",            "四年前的晚报",   "第五章 · 校长室"),
        ("cg confront",        "旧仓库的对峙",   "终章 · 旧仓库"),
        ("cg crisis",          "崩断的钢索",     "终章 · 旧仓库"),
        ("cg zhouke",          "天光下的眼泪",   "终章 · 旧仓库"),
        ("cg badend",          "空桌上的旧纸鹤", "坏结局 · 教室"),
        ("cg promise",         "无言的千纸鹤",   "好结局 · 万事屋"),
        ("cg voice",           "第一次开口",     "真结局 · 校门口"),
        ("cg reunion",         "相拥",           "真结局 · 旧仓库"),
        ("cg secondcrane",     "第二只千纸鹤",   "隐藏结局 · 万事屋"),
    ]

    def cg_unlocked(img):
        return renpy.seen_image(img)

    def cg_unlocked_count():
        return sum(1 for c in CG_LIST if cg_unlocked(c[0]))

    def cg_switch_action(cur_img, delta):
        """在已解锁的 CG 之间切换上一张/下一张"""
        unlocked = [c for c in CG_LIST if cg_unlocked(c[0])]
        if not unlocked:
            return NullAction()
        idx = 0
        for i, c in enumerate(unlocked):
            if c[0] == cur_img:
                idx = i
                break
        nxt = unlocked[(idx + delta) % len(unlocked)]
        return Show("cg_view", None, nxt[0], nxt[1], nxt[2])

screen extras_cg():
    $ _rows = (len(CG_LIST) + 2) // 3
    vbox:
        spacing 8
        text "已解锁 %d / %d · 点击放大" % (cg_unlocked_count(), len(CG_LIST)) style "extras_section_text"
        grid 3 _rows:
            spacing 10
            for img, title, src in CG_LIST:
                if cg_unlocked(img):
                    button:
                        style "cg_card"
                        at card_hover_fx
                        action Show("cg_view", None, img, title, src)
                        hover_sound "audio/sfx_hover.ogg"
                        activate_sound "audio/sfx_click.ogg"
                        vbox:
                            spacing 5
                            frame:
                                style "cg_thumb"
                                add img crop_relative True crop (0.0, 0.072, 1.0, 0.856) xysize (212, 102) fit "contain"
                            text title style "cg_card_title"
                else:
                    frame:
                        style "cg_card_locked"
                        vbox:
                            spacing 5
                            frame:
                                style "cg_thumb"
                                add "gui/slot_empty.png" align (0.5, 0.5) alpha 0.5
                            text _("尚未解锁") style "cg_card_locked_text"
            for _i in range(_rows * 3 - len(CG_LIST)):
                null

style cg_card is default:
    xsize 232
    ysize 144
    padding (10, 8)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)

style cg_card_locked is cg_card

style cg_thumb is default:
    xsize 212
    ysize 102
    padding (0, 0)
    background "#0e0a18"

style cg_card_title is text:
    size 16
    color "#e3d3f6"
    xalign 0.5

style cg_card_locked_text is text:
    size 16
    color "#5e5070"
    xalign 0.5

## 全屏查看：支持左右切换已解锁 CG、一键隐藏/显示底栏字幕、点击背景或按 Esc 关闭
transform cg_view_in:
    on show:
        alpha 0.0 zoom 1.02
        easeout 0.3 alpha 1.0 zoom 1.0
    on hide:
        easein 0.2 alpha 0.0

screen cg_view(img, title, src):
    modal True
    zorder 210
    default show_bar = True
    add "#050309"
    add img fit "contain" align (0.5, 0.5) at cg_view_in
    button:
        xfill True
        yfill True
        background None
        action Hide("cg_view")
    key "game_menu" action Hide("cg_view")
    key "K_LEFT" action cg_switch_action(img, -1)
    key "K_RIGHT" action cg_switch_action(img, 1)
    key "K_h" action ToggleScreenVariable("show_bar")

    if show_bar:
        frame:
            style "cg_view_caption"
            hbox:
                xfill True
                yalign 0.5
                spacing 14
                textbutton _("◀ 上一张"):
                    style "pill_button"
                    action cg_switch_action(img, -1)
                vbox:
                    yalign 0.5
                    xsize 340
                    text title style "cg_view_title"
                    text src style "cg_view_src"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 8
                    textbutton _("隐藏字幕"):
                        style "pill_button"
                        action ToggleScreenVariable("show_bar")
                    textbutton _("下一张 ▶"):
                        style "pill_button"
                        action cg_switch_action(img, 1)
                    textbutton _("返回"):
                        style "pill_button"
                        action Hide("cg_view")
    else:
        textbutton _("显示字幕 (H)"):
            style "pill_button"
            xalign 0.98
            yalign 0.97
            action ToggleScreenVariable("show_bar")

style cg_view_caption is default:
    xalign 0.5
    yalign 1.0
    yoffset -16
    xsize 940
    background Frame("gui/hud_chip.png", 12, 12)
    padding (20, 10)

style cg_view_title is text:
    font gui.name_text_font
    size 22
    color "#f2e6ff"

style cg_view_src is text:
    size 16
    color "#9a86b8"
    yalign 0.5


## ---- 分页 3：雨夜旧书店留声机（13 曲黑胶点唱机 + 双通道环境白噪音混音台）----
init python:
    # (文件, 曲名, 出处) —— 保持三元组兼容既有引用
    BGM_LIST = [
        ("audio/theme_main.ogg",     "千纸鹤的约定",   "主题曲 · 标题画面"),
        ("audio/prologue_calm.ogg",  "图书馆的午后",   "序章 · 宁静悬疑"),
        ("audio/daily_morning.ogg",  "早读",           "日常清晨 · 教室"),
        ("audio/warm_piano.ogg",     "路灯下",         "温暖钢琴 · 送她回家"),
        ("audio/suspense_light.ogg", "代价簿",         "万事屋 · 日常推理"),
        ("audio/mystery_tense.ogg",  "密室",           "紧张推理 · 恐吓信"),
        ("audio/storm_coming.ogg",   "不要找我",       "暴风前夜 · 第五章"),
        ("audio/confrontation.ogg",  "旧仓库",         "终章 · 真相对峙"),
        ("audio/good_ending.ogg",    "无言的心意",     "GOOD END"),
        ("audio/true_ending.ogg",    "重新发声",       "TRUE END"),
        ("audio/hidden_ending.ogg",  "第二只千纸鹤",   "HIDDEN END"),
        ("audio/normal_ending.ogg",  "洗清的冤屈",     "NORMAL END"),
        ("audio/bad_ending.ogg",     "迟来的真相",     "BAD END"),
    ]

    BGM_MOOD_NOTES = {
        "audio/theme_main.ogg":     "清澈木吉他与风铃回响 · 旧书页间折起的第一只纸鹤",
        "audio/prologue_calm.ogg":  "午后斜阳穿过百叶窗 · 浮尘在安静的书架间缓缓起落",
        "audio/daily_morning.ogg":  "早读铃后的微风与粉笔灰 · 最寻常也最安心的校园清晨",
        "audio/warm_piano.ogg":     "暖黄路灯下的单音钢琴 · 适合配着窗外细雨静静翻书",
        "audio/suspense_light.ogg": "轻快拨弦与黄铜风铃 · 艾丽丝摊开《代价簿》时的狡黠灵光",
        "audio/mystery_tense.ogg":  "低音提琴与冷调钟摆 · 在锁死的现场寻找一毫米的矛盾",
        "audio/storm_coming.ogg":   "乌云压城前的急促弦乐 · 四年前的雨夜正从记忆深处逼近",
        "audio/confrontation.ogg":  "高张力钢琴与弦乐交锋 · 把迟到四年的真相一字一句说出口",
        "audio/good_ending.ogg":    "温润大提琴与晚霞余晖 · 即使暂时无言也依然紧握的掌心",
        "audio/true_ending.ogg":    "破云而出的澄澈主旋律 · 她终于跨越冬夜喊出了你的名字",
        "audio/hidden_ending.ogg":  "双吉他与纸鹤轻响 · 梧桐旧书街与并肩走向明天的日常",
        "audio/normal_ending.ogg":  "释然平缓的木管尾奏 · 冤屈洗清之后各自前行的深秋",
        "audio/bad_ending.ogg":     "空教室里的冷雨独奏 · 留在课桌抽屉里未能送出的旧纸鹤",
    }

    BGM_DEFAULT_OPEN = {
        "audio/theme_main.ogg",
        "audio/prologue_calm.ogg",
        "audio/daily_morning.ogg",
        "audio/warm_piano.ogg",
        "audio/suspense_light.ogg",
        "audio/mystery_tense.ogg",
    }

    AMB_STUDY_PLAYLIST = [
        "audio/sfx_page.ogg",
        "<silence 2.6>",
        "audio/sfx_write.ogg",
        "<silence 3.2>",
        "audio/sfx_page.ogg",
        "<silence 3.8>",
        "audio/sfx_crane.ogg",
        "<silence 4.0>",
    ]

    GRAMOPHONE_PRESETS = [
        (
            "rainy_bookstore",
            "雨夜旧书店",
            "audio/warm_piano.ogg",
            65,
            45,
            75,
            "窗外淅沥夜雨轻敲木窗，屋檐下翻书与钢笔沙沙作响，配一曲暖调钢琴。",
        ),
        (
            "morning_study",
            "晨光自习室",
            "audio/daily_morning.ogg",
            0,
            65,
            70,
            "晴朗清晨的图书馆靠窗长桌，只有纸页翻动、钢笔批注与折纸鹤的轻响。",
        ),
        (
            "storm_deduction",
            "暴风雪推理夜",
            "audio/mystery_tense.ogg",
            85,
            35,
            80,
            "急雨拍打旧社团楼百叶窗，在深紫夜色与悬疑弦乐中梳理卷宗线索。",
        ),
        (
            "pure_ost",
            "纯享原声",
            "audio/theme_main.ogg",
            0,
            0,
            100,
            "静默全部环境白噪音通道，以 100% 原始动态纯粹聆听每一首剧情配乐。",
        ),
    ]

    music_room = MusicRoom(fadeout=0.8, loop=True, single_track=False, shuffle=False)
    for _fn, _t, _s in BGM_LIST:
        music_room.add(_fn, always_unlocked=(_fn in BGM_DEFAULT_OPEN))

    def gramophone_track_unlocked(fn):
        if fn in BGM_DEFAULT_OPEN:
            return True
        if getattr(persistent, "gramophone_unlock_all", False):
            return True
        if "truth_spoiler_unlocked" in globals() and truth_spoiler_unlocked():
            return True
        checker = getattr(music_room, "is_unlocked", None)
        return bool(checker(fn)) if callable(checker) else False

    def bgm_unlocked_count():
        return sum(1 for b in BGM_LIST if gramophone_track_unlocked(b[0]))

    def gramophone_track_meta(fn):
        for t_fn, title, src in BGM_LIST:
            if t_fn == fn:
                return title, src, BGM_MOOD_NOTES.get(t_fn, "")
        return ("未在播放", "雨夜旧书店留声机", "挑选下方黑胶曲目或点击一键氛围预设即可开始聆听。")

    def sync_gramophone_ambience():
        """按 persistent 百分比实时同步窗外雨声、书页钢笔声与黑胶主曲音量平衡。"""
        rain_pct = max(0, min(100, int(getattr(persistent, "gramophone_rain_pct", 0) or 0)))
        study_pct = max(0, min(100, int(getattr(persistent, "gramophone_study_pct", 0) or 0)))
        raw_bgm = getattr(persistent, "gramophone_bgm_pct", 80)
        bgm_pct = max(0, min(100, int(80 if raw_bgm is None else raw_bgm)))
        persistent.gramophone_rain_pct = rain_pct
        persistent.gramophone_study_pct = study_pct
        persistent.gramophone_bgm_pct = bgm_pct

        rm = getattr(renpy, "music", None)
        if rm is None:
            return
        if hasattr(rm, "set_volume"):
            rm.set_volume(bgm_pct / 100.0, delay=0.10, channel="music")
            rm.set_volume(rain_pct / 100.0, delay=0.10, channel="amb_rain")
            rm.set_volume(study_pct / 100.0, delay=0.10, channel="amb_study")

        if rain_pct > 0:
            if not rm.get_playing(channel="amb_rain"):
                rm.play("audio/sfx_rain.ogg", channel="amb_rain", loop=True, fadein=0.5)
        else:
            if rm.get_playing(channel="amb_rain"):
                rm.stop(channel="amb_rain", fadeout=0.4)

        if study_pct > 0:
            if not rm.get_playing(channel="amb_study"):
                rm.play(list(AMB_STUDY_PLAYLIST), channel="amb_study", loop=True, fadein=0.3)
        else:
            if rm.get_playing(channel="amb_study"):
                rm.stop(channel="amb_study", fadeout=0.4)
        renpy.save_persistent()

    def on_gramophone_slider_changed():
        persistent.gramophone_preset = "custom"
        sync_gramophone_ambience()

    def set_gramophone_layer_pct(layer, pct):
        clamped = max(0, min(100, int(pct)))
        if layer == "rain":
            persistent.gramophone_rain_pct = clamped
        elif layer == "study":
            persistent.gramophone_study_pct = clamped
        elif layer == "bgm":
            persistent.gramophone_bgm_pct = clamped
        persistent.gramophone_preset = "custom"
        sync_gramophone_ambience()

    def mute_gramophone_ambience_layers():
        persistent.gramophone_rain_pct = 0
        persistent.gramophone_study_pct = 0
        persistent.gramophone_preset = "custom"
        sync_gramophone_ambience()
        renpy.notify("已静默窗外雨声与书页环境白噪音")

    def play_gramophone_track(fn):
        if not gramophone_track_unlocked(fn):
            renpy.notify("该曲目尚未解锁，可在剧情中聆听或点击右上方开放全曲试听")
            return
        persistent.gramophone_last_track = fn
        single_loop = bool(getattr(persistent, "gramophone_single_loop", False))
        music_room.single_track = single_loop
        rm = getattr(renpy, "music", None)
        if rm is not None:
            raw_bgm = getattr(persistent, "gramophone_bgm_pct", 80)
            bgm_pct = max(0, min(100, int(80 if raw_bgm is None else raw_bgm)))
            if hasattr(rm, "set_volume"):
                rm.set_volume(bgm_pct / 100.0, delay=0.10, channel="music")
            if single_loop:
                rm.play(fn, channel="music", loop=True, fadeout=0.6, fadein=0.6)
            else:
                unlocked_list = [b[0] for b in BGM_LIST if gramophone_track_unlocked(b[0])]
                if fn in unlocked_list:
                    idx = unlocked_list.index(fn)
                    playlist = unlocked_list[idx:] + unlocked_list[:idx]
                else:
                    playlist = [fn]
                rm.play(playlist, channel="music", loop=True, fadeout=0.6, fadein=0.6)
        renpy.save_persistent()

    def step_gramophone_track(delta):
        unlocked_list = [b[0] for b in BGM_LIST if gramophone_track_unlocked(b[0])]
        if not unlocked_list:
            return
        rm = getattr(renpy, "music", None)
        cur_fn = (rm.get_playing(channel="music") if rm is not None else None) or getattr(persistent, "gramophone_last_track", unlocked_list[0])
        if cur_fn in unlocked_list:
            nxt_idx = (unlocked_list.index(cur_fn) + delta) % len(unlocked_list)
        else:
            nxt_idx = 0
        play_gramophone_track(unlocked_list[nxt_idx])

    def stop_gramophone_playback():
        rm = getattr(renpy, "music", None)
        if rm is not None:
            rm.stop(channel="music", fadeout=0.6)

    def toggle_gramophone_loop():
        cur = not bool(getattr(persistent, "gramophone_single_loop", False))
        persistent.gramophone_single_loop = cur
        music_room.single_track = cur
        rm = getattr(renpy, "music", None)
        now_fn = rm.get_playing(channel="music") if rm is not None else None
        if now_fn:
            play_gramophone_track(now_fn)
        else:
            renpy.save_persistent()
        renpy.notify("留声机已切换为：单曲循环" if cur else "留声机已切换为：列表连播")

    def toggle_gramophone_stop_on_exit():
        cur = not bool(getattr(persistent, "gramophone_stop_on_exit", True))
        persistent.gramophone_stop_on_exit = cur
        renpy.save_persistent()
        if cur:
            renpy.notify("已开启：退出鉴赏室时自动停止环境白噪音（保护主线听感）")
        else:
            renpy.notify("已保持：退出鉴赏室后在标题画面继续保留当前环境白噪音")

    def apply_gramophone_preset(preset_key):
        for p_key, p_name, p_track, p_rain, p_study, p_bgm, _p_desc in GRAMOPHONE_PRESETS:
            if p_key == preset_key:
                persistent.gramophone_preset = p_key
                persistent.gramophone_rain_pct = p_rain
                persistent.gramophone_study_pct = p_study
                persistent.gramophone_bgm_pct = p_bgm
                sync_gramophone_ambience()
                play_gramophone_track(p_track)
                renpy.notify("已切换留声机混音预设：「%s」" % p_name)
                return

    def stop_all_gramophone_ambience(reset_music_vol=True):
        rm = getattr(renpy, "music", None)
        if rm is None:
            return
        for ch in ("amb_rain", "amb_study"):
            if rm.get_playing(channel=ch):
                rm.stop(channel=ch, fadeout=0.5)
        if reset_music_vol and hasattr(rm, "set_volume"):
            rm.set_volume(1.0, delay=0.15, channel="music")

    def gramophone_on_leave_extras():
        if getattr(persistent, "gramophone_stop_on_exit", True):
            stop_all_gramophone_ambience(reset_music_vol=True)

    def gramophone_ambience_active():
        rm = getattr(renpy, "music", None)
        if rm is None:
            return False
        return bool(rm.get_playing(channel="amb_rain") or rm.get_playing(channel="amb_study"))

transform gramophone_disc_spin:
    subpixel True
    zoom 1.0 rotate 0
    block:
        ease 1.8 zoom 1.05 rotate 2.5
        ease 1.8 zoom 1.00 rotate -2.5
        repeat

screen extras_music():
    $ _now = renpy.music.get_playing(channel="music")
    $ _amb_on = gramophone_ambience_active()
    $ _cur_title, _cur_src, _cur_mood = gramophone_track_meta(_now)
    $ _rain_pct = int(persistent.gramophone_rain_pct or 0)
    $ _study_pct = int(persistent.gramophone_study_pct or 0)
    $ _bgm_pct = int(80 if persistent.gramophone_bgm_pct is None else persistent.gramophone_bgm_pct)
    $ _single_loop = bool(persistent.gramophone_single_loop)
    $ _stop_exit = bool(persistent.gramophone_stop_on_exit)
    $ _cur_preset = persistent.gramophone_preset or "pure_ost"

    vbox:
        spacing 10

        ## 1. 顶部唱盘状态与播放控制卡
        frame:
            style "gramophone_console_card"
            vbox:
                spacing 8
                xfill True
                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 10
                        yalign 0.5
                        fixed:
                            xysize (36, 36)
                            yalign 0.5
                            if _now or _amb_on:
                                add "images/ui/icon_gramophone_disc.png" xysize (30, 30) align (0.5, 0.5) at gramophone_disc_spin
                            else:
                                add "images/ui/icon_gramophone_disc.png" xysize (30, 30) align (0.5, 0.5) alpha 0.82
                        vbox:
                            spacing 1
                            yalign 0.5
                            text _("雨夜旧书店留声机") font gui.name_text_font size 20 color "#f6e7c0"
                            text ("当前唱针：%s  ·  %s" % (_cur_title, _cur_src)) size 13 color "#cbb0e6" substitute False
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 6
                        textbutton (_("单曲循环") if _single_loop else _("列表连播")):
                            style "gramophone_mini_pill"
                            selected _single_loop
                            action Function(toggle_gramophone_loop)
                        textbutton (_("退出停白噪：开") if _stop_exit else _("退出停白噪：关")):
                            style "gramophone_mini_pill"
                            selected _stop_exit
                            action Function(toggle_gramophone_stop_on_exit)

                frame:
                    xfill True
                    padding (12, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        xfill True
                        yalign 0.5
                        text _cur_mood size 13 color "#e8dcf6" xmaximum 386 yalign 0.5 substitute False
                        hbox:
                            xalign 1.0
                            yalign 0.5
                            spacing 6
                            textbutton _("上一曲") style "gramophone_mini_pill" action Function(step_gramophone_track, -1)
                            if _now:
                                textbutton _("停止唱盘") style "gramophone_mini_pill" action Function(stop_gramophone_playback)
                            else:
                                textbutton _("播放唱盘") style "gramophone_mini_pill" action Function(play_gramophone_track, persistent.gramophone_last_track or "audio/theme_main.ogg")
                            textbutton _("下一曲") style "gramophone_mini_pill" action Function(step_gramophone_track, 1)

        ## 2. 四组一键氛围预设 + 三路独立白噪音混音滑块台
        frame:
            style "gramophone_console_card"
            vbox:
                spacing 8
                xfill True
                hbox:
                    xfill True
                    yalign 0.5
                    text _("环境白噪音混音台  ·  一键书店声景预设") size 15 color "#f4d98a" font gui.name_text_font yalign 0.5
                    if _rain_pct > 0 or _study_pct > 0:
                        textbutton _("静默白噪音"):
                            style "pref_link_button"
                            xalign 1.0
                            yalign 0.5
                            text_size 13
                            action Function(mute_gramophone_ambience_layers)

                hbox:
                    spacing 8
                    for p_key, p_name, _p_tr, _pr, _ps, _pb, _pd in GRAMOPHONE_PRESETS:
                        textbutton p_name:
                            style "gramophone_preset_pill"
                            selected (_cur_preset == p_key)
                            action Function(apply_gramophone_preset, p_key)

                ## 通道 1：窗外夜雨声（amb_rain）
                hbox:
                    xfill True
                    spacing 8
                    yalign 0.5
                    hbox:
                        xsize 168
                        spacing 8
                        yalign 0.5
                        add "images/ui/icon_rain_ambience.png" xysize (22, 22) yalign 0.5
                        text _("窗外夜雨声") size 14 color "#e3d3f6" yalign 0.5
                    textbutton "-" style "gramophone_step_btn" action Function(set_gramophone_layer_pct, "rain", _rain_pct - 10)
                    bar:
                        value FieldValue(persistent, "gramophone_rain_pct", 100, style="slider", step=5, action=Function(on_gramophone_slider_changed))
                        style "gramophone_mixer_slider"
                        yalign 0.5
                    textbutton "+" style "gramophone_step_btn" action Function(set_gramophone_layer_pct, "rain", _rain_pct + 10)
                    text ("%d%%" % _rain_pct) size 14 color ("#86efac" if _rain_pct > 0 else "#8a7aa0") xsize 48 xalign 1.0 yalign 0.5

                ## 通道 2：书页与钢笔声（amb_study）
                hbox:
                    xfill True
                    spacing 8
                    yalign 0.5
                    hbox:
                        xsize 168
                        spacing 8
                        yalign 0.5
                        add "images/ui/icon_book_ambience.png" xysize (22, 22) yalign 0.5
                        text _("书页与钢笔") size 14 color "#e3d3f6" yalign 0.5
                    textbutton "-" style "gramophone_step_btn" action Function(set_gramophone_layer_pct, "study", _study_pct - 10)
                    bar:
                        value FieldValue(persistent, "gramophone_study_pct", 100, style="slider", step=5, action=Function(on_gramophone_slider_changed))
                        style "gramophone_mixer_slider"
                        yalign 0.5
                    textbutton "+" style "gramophone_step_btn" action Function(set_gramophone_layer_pct, "study", _study_pct + 10)
                    text ("%d%%" % _study_pct) size 14 color ("#86efac" if _study_pct > 0 else "#8a7aa0") xsize 48 xalign 1.0 yalign 0.5

                ## 通道 3：黑胶配乐平衡（music channel secondary volume）
                hbox:
                    xfill True
                    spacing 8
                    yalign 0.5
                    hbox:
                        xsize 168
                        spacing 8
                        yalign 0.5
                        add "gui/icon_music.png" xysize (20, 20) yalign 0.5
                        text _("黑胶主曲平衡") size 14 color "#e3d3f6" yalign 0.5
                    textbutton "-" style "gramophone_step_btn" action Function(set_gramophone_layer_pct, "bgm", _bgm_pct - 10)
                    bar:
                        value FieldValue(persistent, "gramophone_bgm_pct", 100, style="slider", step=5, action=Function(on_gramophone_slider_changed))
                        style "gramophone_mixer_slider"
                        yalign 0.5
                    textbutton "+" style "gramophone_step_btn" action Function(set_gramophone_layer_pct, "bgm", _bgm_pct + 10)
                    text ("%d%%" % _bgm_pct) size 14 color "#f4d98a" xsize 48 xalign 1.0 yalign 0.5

        ## 3. 13 曲原声黑胶曲目单
        hbox:
            xfill True
            yalign 0.5
            text ("黑胶曲目单  ·  已开放 %d / %d 首" % (bgm_unlocked_count(), len(BGM_LIST))) style "extras_section_text" yalign 0.5
            if bgm_unlocked_count() < len(BGM_LIST):
                textbutton _("开放全13曲试听"):
                    style "gramophone_mini_pill"
                    xalign 1.0
                    yalign 0.5
                    action [SetField(persistent, "gramophone_unlock_all", True), Function(renpy.save_persistent), Notify("已开放全部 13 首原声曲目自由试听")]

        for idx, (fn, title, src) in enumerate(BGM_LIST):
            $ unlocked = gramophone_track_unlocked(fn)
            $ playing = (_now == fn)
            $ mood_txt = BGM_MOOD_NOTES.get(fn, "")
            if unlocked:
                button:
                    style "music_row"
                    selected playing
                    action Function(play_gramophone_track, fn)
                    hover_sound "audio/sfx_hover.ogg"
                    hbox:
                        xfill True
                        yalign 0.5
                        hbox:
                            spacing 10
                            yalign 0.5
                            add ("images/ui/icon_gramophone_disc.png" if playing else "gui/icon_music.png") xysize (22, 22) yalign 0.5 alpha (1.0 if playing else 0.65)
                            vbox:
                                spacing 1
                                yalign 0.5
                                hbox:
                                    spacing 10
                                    yalign 0.5
                                    text ("%02d · %s" % (idx + 1, title)) style "music_title"
                                    text src style "music_src" yalign 0.5
                                text mood_txt size 12 color "#b5a3cf" xmaximum 570 substitute False
                        if playing:
                            text _("播放中") style "music_now" xalign 1.0 yalign 0.5
            else:
                frame:
                    style "music_row_locked"
                    hbox:
                        xfill True
                        spacing 10
                        yalign 0.5
                        add "gui/icon_music.png" xysize (20, 20) yalign 0.5 alpha 0.25
                        vbox:
                            spacing 1
                            yalign 0.5
                            text ("%02d · ？？？" % (idx + 1)) style "music_title_locked"
                            text _("在剧情中听到后自动收录（或点击上方「开放全13曲试听」）") style "music_src_locked"

style gramophone_console_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style gramophone_mini_pill is pill_button:
    xminimum 84
    ysize 30
    padding (11, 0)
style gramophone_mini_pill_text is pill_button_text:
    size 13

style gramophone_preset_pill is pill_button:
    xsize 166
    ysize 32
    padding (8, 0)
style gramophone_preset_pill_text is pill_button_text:
    size 14

style gramophone_step_btn is pill_button:
    xsize 30
    ysize 26
    padding (0, 0)
style gramophone_step_btn_text is pill_button_text:
    size 15

style gramophone_mixer_slider is pref_slider:
    xsize 376
    ysize 24

style music_row is default:
    xfill True
    ysize 54
    padding (14, 6)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
style music_row_locked is music_row

style music_title is text:
    font gui.name_text_font
    size 17
    color "#f2e6ff"
style music_src is text:
    size 13
    color "#9a86b8"
style music_now is text:
    size 14
    color "#f4d98a"
    kerning 2
style music_title_locked is music_title:
    color "#6a5c80"
style music_src_locked is music_src:
    color "#5e5070"


################################################################################
## ---- 分页 5：真相档案（旧案—今案双线时间轴 + 防剧透开关）----
################################################################################

init python:
    import re
    import time

    # (编号标题, 旧案时间, 旧案表层记载, 旧案深层真相, 今案时间, 今案表层事件, 今案深层因果, 伏笔闭环说明)
    TRUTH_TIMELINE = [
        (
            "01 · 成名与失约",
            "七年前 · 秋（9岁）",
            "「小雪侦探」在校园里屡次找回失物而走红，随后被《城市晚报》报道并登上电视台推理节目《小小神探》。",
            "镜子前那句没有播出的「我想回家」被忙碌谈合同的父母忽略；邻居周明远（周叔叔）送给她第一本牛皮纸本，嘱咐「先写下来，再决定要不要说」。",
            "10月21日 · 序章～第一章",
            "转学生陈默在图书馆撞翻书架背上黑锅，在墨墨的便签指引下拆穿磁条与纸箱错位之谜，并在校门口送出一只歪翅膀白纸鹤。",
            "引导陈默替补图书馆值日的匿名纸条，实为刚暗中返校踩点的周可递给班长——她想试探墨墨是否还会用聪明把新人拖入险境。",
            "周叔叔的「先写再说」化作墨墨至今不离身的牛皮纸笔记；那只歪翅膀纸鹤则重新接续了四年前没折完的约定。"
        ),
        (
            "02 · 造假与风波",
            "五年前～四年前 · 冬前",
            "电视节目因新鲜感退去而停播，社区附近却接连出现多起离奇小案，全部由「小雪侦探」在短时间内顺利侦破。",
            "橘猫失踪、划车、便利店失窃、快递失踪全由父母（墨承远、陆嫣）暗中布置；小雪从雨靴泥印看破造假，却因害怕被抛弃而用沉默配合谎言。",
            "10月23日 · 第二章",
            "三班教室出现剪报拼贴恐吓信「你也会有报应的」，经查剪自四年前《城市晚报》B2 版，纸背隐约残存「还回来」三字。",
            "周可借班长之手投放旧报剪贴，并特意在便当盒里放上五角星切法的胡萝卜，试探墨墨是否还记得四年前周叔叔做焖饭的模样。",
            "四年前被报纸反复消费的「天才小侦探」头衔，在四年后化作裁纸刀剪下的铅字，反向刺向当事人的餐桌与课桌。"
        ),
        (
            "03 · 停格的储物间",
            "四年前 · 11月17日夜",
            "老小区社区活动室储物间突发旧货架坍塌事故，热心邻居周某不幸遇难；不久后，「小雪侦探」彻底淡出公众视野。",
            "父母以「真人秀拍摄」骗周明远独自搬箱，货架坍塌后为伪造撬锁假象延误 8 分钟才拨打急救电话；小雪当众指认亲生父母，随即因巨大内疚失声。",
            "10月26日 · 第三章",
            "门锁完好的桌游社活动室凭空出现一本无主旧相册，随后又在众人眼皮底下不翼而飞，里面夹着十年前的两个女孩与纸鹤。",
            "周可趁社团全员去买饮料的两分钟，借窗外空调铁架自换气窗钩走相册；陈默在黄昏校门对周可说出怀疑，成为开启 TRUE END 暗线的唯一钥匙。",
            "当年用假脚印与撬痕掩盖的储物间真相，如今通过桌游社「伪密室」与相册合影被一点点倒推重现。"
        ),
        (
            "04 · 消散的地址",
            "四年前 · 11月21日",
            "事故发生后不久，小雪随外婆搬离旧居并改名「墨墨」；楼下那户姓周的人家也悄然北迁，两家从此断了音讯。",
            "事后第四天，墨墨曾去周可家门口敲门至天黑，却只从邻居手中接过周可留下的旧粉色纸鹤；周可母亲两年后积郁病逝，临终留下未寄出的信。",
            "10月30日 · 第四章",
            "作家向言来校讲座并在图书馆侧厅签售《美丽新世界》，赠与吕芙的签名书险些遭人掉包；傍晚在外婆家巷口首次揭晓旧名「墨雪」。",
            "生父向言当众代陈默发言的反差，刺痛也点醒了陈默「不能永远代替她说话」；墨墨也在外婆家的鞋盒里重新拿起了那只发黄的旧纸鹤。",
            "外婆收存的那只四年前「事故前一天」纸鹤，与向言扉页划掉的旧稿一起，把过去和现在的沉默串联成线。"
        ),
        (
            "05 · 复刻的舞台",
            "三个月前～三周前",
            "云溪高中校长室收到一封匿名信，建议在全校表彰大会上表彰「四年前那位见义勇为的小侦探」，并附上了当年的旧剪报。",
            "周可办妥转学手续并提前潜入旧教学楼踩点——旧楼三楼那间长年上锁的仓库，正是当年老小区拆迁后划归学校的原社区储物间。",
            "10月31日 · 第五章",
            "墨墨早自习未在万事屋公告板画雪花，只留下「不要找我」四字失联；后勤师傅推开旧楼三楼仓库，发现里面被一比一还原成四年前。",
            "发小张子谦摸清周可旧居行踪，外婆交付「墨雪与周可」儿童节合影：墨墨并非被绑架，而是主动回应了「两点半，只见你」的旧约。",
            "「表彰奖牌」与「旧楼三楼仓库」同时收束：所有校园诡计都不是为了炫技，而是把所有人引回四年前那个没有走出的房间。"
        ),
        (
            "06 · 千纸鹤的约定",
            "四年前的明天 → 此刻",
            "两个曾约好周末去河堤折纸鹤的女孩，把一句没来得及说出口的告别与遗憾留在了那个冬天。",
            "墨墨书包里装着每年三封、共十二封写给周可却无处寄出的信；周可虽搭建噩梦舞台，却偷偷在布下留了电暖器、拧松水瓶并把货架用钢索钉死。",
            "10月31日傍晚 · 终章",
            "陈默与张子谦赶到旧楼三楼仓库；根据好感度、四片过去线索与真相暗线抉择，走向五种截然不同的命运终点。",
            "在 TRUE END「重新发声」中，墨墨直面八分钟的阴影亲口说出名字，与周可、艾丽丝、陈默一同走出停滞的四年；番外篇更合折出第三只淡紫千纸鹤。",
            "「发现真相不是为了证明聪明，而是为了让疼的人知道，有人看见了。」——周明远留下的这句话，最终在两人之间完成闭环。"
        ),
    ]

    def truth_spoiler_unlocked():
        return bool(persistent.te_cleared or persistent.truth_spoiler_confirmed)

screen extras_truth():
    $ _unlocked = truth_spoiler_unlocked()
    vbox:
        spacing 12
        frame:
            style "truth_banner_card"
            hbox:
                xfill True
                yalign 0.5
                spacing 10
                vbox:
                    spacing 3
                    xsize 520
                    if persistent.te_cleared:
                        text _("✦ TRUE END 已通关 · 双轨真相档案全解锁") style "truth_banner_title" color "#f4d98a"
                        text _("四年前「小雪侦探」旧案与云溪高中五桩校园事件的因果链条已完整解密。") style "truth_banner_sub"
                    elif persistent.truth_spoiler_confirmed:
                        text _("⚠ 已手动开启剧透档案（尚未通关 TRUE END）") style "truth_banner_title" color "#f0a4b8"
                        text _("当前展示完整剧透时间轴；建议体验 TRUE END 后再回味细节。") style "truth_banner_sub"
                    else:
                        text _("✦ 防剧透保护已开启 · 仅展示公开案件脉络") style "truth_banner_title" color "#cbb0e6"
                        text _("涉及核心真凶与四年前八分钟真相的深层推论已自动加密遮罩，通关 TRUE END 后自动解锁。") style "truth_banner_sub"
                if not persistent.te_cleared:
                    if persistent.truth_spoiler_confirmed:
                        textbutton _("恢复遮罩"):
                            style "pill_button"
                            xminimum 116
                            ysize 34
                            text_size 15
                            xalign 1.0
                            yalign 0.5
                            action [SetField(persistent, "truth_spoiler_confirmed", False), Function(renpy.save_persistent)]
                    else:
                        textbutton _("解锁剧透"):
                            style "pill_button"
                            xminimum 116
                            ysize 34
                            text_size 15
                            xalign 1.0
                            yalign 0.5
                            action Show("confirm",
                                        message=_("尚未通关 TRUE END，确定提前揭晓「真相档案」中的核心剧透内容吗？"),
                                        yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                        no_action=Hide("confirm"))

        for idx, (era, old_t, old_pub, old_deep, new_t, new_pub, new_deep, link_txt) in enumerate(TRUTH_TIMELINE):
            frame:
                style "truth_pair_card"
                vbox:
                    spacing 8
                    hbox:
                        xfill True
                        frame:
                            style "truth_era_badge"
                            text era style "truth_era_text" yalign 0.5
                        text ("旧案 [old_t]  ⇄  今案 [new_t]") style "truth_pair_times" xalign 1.0 yalign 0.5

                    hbox:
                        spacing 10
                        frame:
                            style "truth_track_old"
                            vbox:
                                spacing 5
                                text _("旧案轨 · 过去（墨雪 / 周家）") style "truth_track_label_old"
                                text old_pub style "truth_body_text"
                                if _unlocked:
                                    add Solid("#f4d98a33") xfill True ysize 1
                                    text old_deep style "truth_deep_text"
                                else:
                                    add Solid("#6a5c8044") xfill True ysize 1
                                    text _("██ 核心内幕已加密（通关 TRUE END 后揭示）") style "truth_masked_text"
                        frame:
                            style "truth_track_new"
                            vbox:
                                spacing 5
                                text _("今案轨 · 云溪校园（万事屋）") style "truth_track_label_new"
                                text new_pub style "truth_body_text"
                                if _unlocked:
                                    add Solid("#86d6a233") xfill True ysize 1
                                    text new_deep style "truth_deep_text"
                                else:
                                    add Solid("#6a5c8044") xfill True ysize 1
                                    text _("██ 幕后关联已加密（通关 TRUE END 后揭示）") style "truth_masked_text"

                    if _unlocked:
                        frame:
                            style "truth_link_box"
                            text ("✦ 伏笔闭环 · " + link_txt) style "truth_link_text"
                    else:
                        frame:
                            style "truth_lock_box"
                            text _("✦ 伏笔闭环 · 【防剧透遮罩中：请达成 TRUE END 或点击右上角解锁查看】") style "truth_masked_text"

style truth_banner_card is default:
    xfill True
    padding (16, 12)
    background Frame("gui/hud_chip.png", 12, 12)
style truth_banner_title is text:
    font gui.name_text_font
    size 18
    kerning 1
style truth_banner_sub is text:
    size 14
    color "#b39bd0"

style truth_pair_card is default:
    xfill True
    padding (14, 12)
    background Frame("gui/panel_card.png", 16, 16)
style truth_era_badge is default:
    padding (10, 3)
    background Frame("gui/pill_selected.png", 18, 18)
style truth_era_text is text:
    size 14
    color "#ffffff"
    bold True
style truth_pair_times is text:
    size 13
    color "#9a86b8"

style truth_track_old is default:
    xsize 342
    padding (12, 10)
    background "#140e20cc"
style truth_track_new is default:
    xsize 342
    padding (12, 10)
    background "#101822cc"
style truth_track_label_old is text:
    font gui.name_text_font
    size 15
    color "#f4d98a"
style truth_track_label_new is text:
    font gui.name_text_font
    size 15
    color "#86d6a2"
style truth_body_text is text:
    size 14
    color "#e8def5"
    line_spacing 3
style truth_deep_text is text:
    size 14
    color "#f2e6ff"
    line_spacing 3
style truth_masked_text is text:
    size 13
    color "#7e6e96"

style truth_link_box is default:
    xfill True
    padding (10, 7)
    background "#1e162eee"
style truth_link_text is text:
    size 14
    color "#f4d98a"
    line_spacing 2
style truth_lock_box is default:
    xfill True
    padding (10, 7)
    background "#100c1acc"


################################################################################
## ---- 分页 6：折纸书签（台词收藏 · 跳转重温 · 删除管理）----
################################################################################

init python:
    _SPEAKER_COLOR_MAP = {
        "陈默": "#8cc0e6",
        "墨墨": "#cfa6f0",
        "墨墨（笔记）": "#b99ad8",
        "艾丽丝": "#f0c060",
        "张子谦": "#86d6a2",
        "吕芙": "#dcb488",
        "周可": "#f0a4b8",
        "王老师": "#c0c0cc",
        "小林": "#a8cfe0",
        "Joker": "#f0665a",
        "向言": "#b0b0d8",
        "班长": "#d2bc9a",
        "校长": "#bdbdc4",
        "外婆": "#c9b8a0",
        "旁白": "#cbb0e6",
    }

    def _clean_bm_text(s):
        if s is None:
            return ""
        txt = str(s)
        try:
            txt = renpy.substitute(txt)
        except Exception:
            pass
        txt = re.sub(r"\{/?[^{}]*\}", "", txt)
        return txt.strip()

    def _resolve_bm_pair(cur_who=None, cur_what=None):
        if cur_what is None:
            raw_what = getattr(store, "_last_say_what", "") or ""
            if _history_list:
                raw_who = _history_list[-1].who
                if not raw_what:
                    raw_what = _history_list[-1].what
            else:
                raw_who = cur_who
        else:
            raw_who = cur_who
            raw_what = cur_what
        clean_who = "旁白" if raw_who is None else (_clean_bm_text(raw_who) or "旁白")
        clean_what = _clean_bm_text(raw_what)
        return clean_who, clean_what

    def _resolve_speaker_color(clean_who):
        if _history_list:
            last = _history_list[-1]
            if last.who and _clean_bm_text(last.who) == clean_who:
                c = last.who_args.get("color") if isinstance(last.who_args, dict) else None
                if c:
                    return c
        return _SPEAKER_COLOR_MAP.get(clean_who, "#cbb0e6")

    def _resolve_chapter_source():
        lbl = getattr(store, "current_chapter_label", None) or "prologue"
        title = getattr(store, "save_name", None) or ""
        if not title:
            for c_lbl, c_title, _need in CHAPTER_LIST:
                if c_lbl == lbl:
                    title = c_title
                    break
        if not title and lbl in _DLC_LABELS:
            title = _DLC_LABELS[lbl]
        if not title and lbl in _MAILBOX_LABELS:
            title = _MAILBOX_LABELS[lbl]
        if not title:
            for _f, e_title, _s, _cg, e_lbl in ENDING_LIST:
                if e_lbl == lbl:
                    title = e_title
                    break
        return lbl, (title or "云溪高中 · 主线")

    def is_quote_bookmarked(cur_who=None, cur_what=None):
        bms = persistent.quote_bookmarks or []
        if not bms:
            return False
        clean_who, clean_what = _resolve_bm_pair(cur_who, cur_what)
        if not clean_what:
            return False
        return any(b.get("who") == clean_who and b.get("what") == clean_what for b in bms)

    def add_or_toggle_quote_bookmark(cur_who=None, cur_what=None):
        if persistent.quote_bookmarks is None:
            persistent.quote_bookmarks = []
        clean_who, clean_what = _resolve_bm_pair(cur_who, cur_what)
        if not clean_what:
            renpy.notify("当前暂无可收藏的台词")
            return
        bms = list(persistent.quote_bookmarks)
        for idx, b in enumerate(bms):
            if b.get("who") == clean_who and b.get("what") == clean_what:
                del bms[idx]
                persistent.quote_bookmarks = bms
                renpy.save_persistent()
                renpy.sound.play("audio/sfx_click.ogg")
                renpy.notify("已移出折纸书签")
                return
        lbl, chapter_title = _resolve_chapter_source()
        entry = {
            "id": "%d_%d" % (int(time.time() * 1000), len(bms)),
            "who": clean_who,
            "what": clean_what,
            "color": _resolve_speaker_color(clean_who),
            "chapter": chapter_title,
            "label": lbl,
            "saved_at": time.strftime("%Y-%m-%d %H:%M"),
        }
        bms.insert(0, entry)
        persistent.quote_bookmarks = bms
        renpy.save_persistent()
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.notify("已折入折纸书签")

    def remove_quote_bookmark(bm_id):
        bms = [b for b in (persistent.quote_bookmarks or []) if b.get("id") != bm_id]
        persistent.quote_bookmarks = bms
        renpy.save_persistent()
        renpy.sound.play("audio/sfx_click.ogg")
        renpy.notify("已删除该折纸书签")

    def clear_all_quote_bookmarks():
        persistent.quote_bookmarks = []
        renpy.save_persistent()
        renpy.sound.play("audio/sfx_click.ogg")
        renpy.notify("已清空全部折纸书签")

    def bookmark_jump_action(bm):
        lbl = bm.get("label") or "prologue"
        if not renpy.has_label(lbl):
            lbl = "prologue"
        if lbl in _LABEL_TO_ENDING or lbl in _MAILBOX_LABELS:
            return Replay(lbl, scope={"player_name": persistent.last_player_name or "陈默"}, locked=False)
        chap_name = bm.get("chapter") or lbl
        return Show("confirm",
                    message="从书签所在章节「%s」开始重温？\n（当前未保存的剧情进度将会重置）" % chap_name,
                    yes_action=[Hide("confirm"), Hide("extras"), Start(lbl)],
                    no_action=Hide("confirm"))

screen extras_bookmarks():
    $ _bms = persistent.quote_bookmarks or []
    vbox:
        spacing 12
        frame:
            style "truth_banner_card"
            hbox:
                xfill True
                yalign 0.5
                spacing 10
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_crane_bookmark.png" xysize (28, 28) yalign 0.5
                    vbox:
                        spacing 2
                        text ("已收藏 %d 条折纸书签" % len(_bms)) style "truth_banner_title" color "#e8def5"
                        text _("对话时点击底部快捷栏「书签」纸鹤按钮，即可把心动瞬间折页留存。") style "truth_banner_sub"
                if _bms:
                    textbutton _("清空书签"):
                        style "pill_button"
                        xminimum 108
                        ysize 34
                        text_size 15
                        xalign 1.0
                        yalign 0.5
                        action Show("confirm",
                                    message=_("确定要清空全部 %d 条折纸书签吗？") % len(_bms),
                                    yes_action=[Hide("confirm"), Function(clear_all_quote_bookmarks)],
                                    no_action=Hide("confirm"))

        if not _bms:
            frame:
                style "bookmark_empty_card"
                vbox:
                    xalign 0.5
                    yalign 0.5
                    spacing 10
                    add "images/ui/icon_crane_bookmark.png" xysize (56, 56) xalign 0.5 alpha 0.85
                    text _("还没有收藏任何折纸书签") style "bookmark_empty_title" xalign 0.5
                    text _("在剧情对话中随时点击底部快捷栏的「书签」，即可记录说话人、章节出处与台词。") style "bookmark_empty_sub" xalign 0.5
        else:
            for bm in _bms:
                frame:
                    style "bookmark_card"
                    vbox:
                        spacing 8
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 10
                                yalign 0.5
                                add "images/ui/icon_crane_bookmark.png" xysize (20, 20) yalign 0.5
                                text (bm.get("who") or "旁白"):
                                    style "bookmark_who_text"
                                    color (bm.get("color") or "#cbb0e6")
                                    substitute False
                                frame:
                                    style "bookmark_chap_badge"
                                    text (bm.get("chapter") or "云溪高中"):
                                        style "bookmark_chap_text"
                                        substitute False
                            text (bm.get("saved_at") or "") style "bookmark_time_text" xalign 1.0 yalign 0.5

                        text ("「%s」" % (bm.get("what") or "")):
                            style "bookmark_quote_text"
                            substitute False

                        hbox:
                            xalign 1.0
                            spacing 8
                            textbutton _("跳转重温"):
                                style "pill_button"
                                xminimum 108
                                ysize 32
                                text_size 15
                                action bookmark_jump_action(bm)
                            textbutton _("删除"):
                                style "pill_button"
                                xminimum 78
                                ysize 32
                                text_size 15
                                action Function(remove_quote_bookmark, bm.get("id"))

style bookmark_empty_card is default:
    xfill True
    ysize 240
    padding (28, 30)
    background Frame("gui/panel_card.png", 16, 16)
style bookmark_empty_title is text:
    font gui.name_text_font
    size 20
    color "#cbb0e6"
style bookmark_empty_sub is text:
    size 15
    color "#8a7aa0"
    text_align 0.5

style bookmark_card is default:
    xfill True
    padding (16, 12)
    background Frame("gui/panel_card.png", 16, 16)
style bookmark_who_text is text:
    font gui.name_text_font
    size 19
style bookmark_chap_badge is default:
    padding (10, 2)
    background Frame("gui/hud_chip.png", 12, 12)
style bookmark_chap_text is text:
    size 13
    color "#b39bd0"
style bookmark_time_text is text:
    size 13
    color "#7d6b99"
style bookmark_quote_text is text:
    size 17
    color "#f2ecf8"
    line_spacing 4


################################################################################
## ---- 分页 7：人物关系复盘白板（案件卷宗红线 · 不在场证明 · 动机与伏笔闭环）----
################################################################################

init python:
    import math

    DOSSIER_CASES = [
        ("all",     "全卷宗总览"),
        ("case1",   "第一案 · 包裹"),
        ("case2",   "第二案 · 恐吓信"),
        ("case3",   "第三案 · 密室"),
        ("case4",   "第四案 · 签售"),
        ("oldcase", "四年前 · 旧案"),
    ]

    DOSSIER_CAST = [
        {
            "id": "mo",
            "name": "墨墨",
            "full_title": "万事屋核心 · 沉默侦探",
            "secret_title": "墨雪 · 四年前「小雪侦探」当事人",
            "color": "#cfa6f0",
            "mini_pos": (351, 64),
            "full_pos": (442, 90),
            "cases": ("case1", "case2", "case3", "case4", "oldcase"),
            "affection_notes": [
                ("序章 · 初遇折鹤", "接过陈默折歪翅膀的白纸鹤夹进牛皮纸本，尘封四年的折鹤记忆首次松动。"),
                ("第一章 · 嘴替契约", "夕阳下收下签名版《美丽新世界》，默许陈默成为替她传递推理的「嘴」。"),
                ("第二～三章 · 渐生信赖", "放学空教室第一次主动推来笔记本；雨夜林荫道共撑一伞各湿半边肩膀。"),
                ("第四～终章 · 心意相通", "书架间画下歪翅膀纸鹤与笑脸；好感达 80 且集齐四片过去碎片后重新开口发声。"),
            ],
            "alibis": [
                ("第一案（图书馆）", "全程在阅览区角落看书，未进入管理办公室；凭防盗磁条未响与瓦楞压痕锁定六号箱。"),
                ("第二～三案（教室/桌游社）", "恐吓信投递时段在万事屋；桌游社相册失踪的两分钟与全员同行买饮料。"),
                ("第五章～终章（旧仓库）", "10月31日清晨未在公告板画雪花，留下「不要找我」后独自赴旧楼三楼之约。"),
            ],
            "pub_motive": "以万事屋观察者身份拆解校园疑案，用牛皮纸本保护被误解的委托人与同伴。",
            "deep_motive": "四年前当众指认亲生父母延误周叔叔急救八分钟后创伤性失声；书包里藏着四年间写给周可却无处寄出的十二封信，主动赴约只为把迟到的道歉当面还给小可。",
            "foreshadowing": "随身牛皮纸本源自七年前周叔叔「先写下来再决定要不要说」的叮嘱；外婆鞋盒里的泛黄纸鹤与终章第二只千纸鹤首尾闭环。",
        },
        {
            "id": "mc",
            "name": "陈默",
            "full_title": "高二转学生 · 万事屋的「嘴」",
            "secret_title": "打破沉默闭环的同行者 · 向言之子",
            "color": "#8cc0e6",
            "mini_pos": (210, 58),
            "full_pos": (270, 90),
            "cases": ("case1", "case2", "case3", "case4", "oldcase"),
            "affection_notes": [
                ("序章 · 冤案自救", "撞翻书架后折纸鹤致谢，决定留在万事屋偿还「代价簿」委托。"),
                ("第一～二章 · 并肩查案", "郑重转交父亲签名译作，天台挡风共进午餐，逐步读懂墨墨的眼神停顿。"),
                ("第三章 · 关键分歧", "傍晚校门路灯下是否点破对周可的怀疑，直接决定能否开启真相暗线。"),
                ("第四～终章 · 不代她开口", "经历签售会生父代答之痛，领悟真正的陪伴不是替墨墨说话，而是等她为自己发声。"),
            ],
            "alibis": [
                ("第一案（办公室）", "误闯半掩的图书办公室并出于好心顺手推门落锁，听见弹簧锁舌声，洗清盗书嫌疑。"),
                ("第三案（桌游社）", "随社团全员下楼买饮料，返回后结合窗外铁架痕迹识破「伪密室」时间差。"),
                ("终章（旧楼三楼）", "携张子谦赶赴旧楼三楼仓库，在倾倒货架与旧案阴影前守住墨墨与周可。"),
            ],
            "pub_motive": "洗刷转学首日的背锅冤屈，履行万事屋社员职责协助墨墨与艾丽丝解决校园委托。",
            "deep_motive": "幼年被知名作家父亲向言习惯性「代为发言」而养成退让性格；在墨墨的沉默中照见自己，决心成为不越俎代庖的倾听者与守护者。",
            "foreshadowing": "序章顺手关柜听见的「咔哒」锁舌声成为第一案破局铁证；第四章礼堂追光提问直接呼应终章仓库里等待墨墨自己开口。",
        },
        {
            "id": "alice",
            "name": "艾丽丝",
            "full_title": "万事屋社长 · 代价簿持有人",
            "secret_title": "四年前流言风暴见证者 · 墨墨护盾",
            "color": "#f0c060",
            "mini_pos": (492, 58),
            "full_pos": (616, 98),
            "cases": ("case1", "case2", "case3", "case4", "oldcase"),
            "affection_notes": [
                ("试用搭档（信任 <15）", "以夸张的社长腔调签下代价契约，暗中考察陈默是否只是猎奇围观者。"),
                ("正式社员～可靠后盾", "信任满 8 点后在推理卡壳时主动点拨破绽，协调期刊室与监控取证。"),
                ("默契共犯～生死相托", "旧社团楼夕阳走廊吐露四年前往事，将寻找失联墨墨的后背完全交给陈默。"),
            ],
            "alibis": [
                ("第一～四案", "全程坐镇万事屋或与陈默分头核查监控、旧报刊合订本，无作案动机与时间。"),
                ("第五章（失联当日）", "最早发现公告板缺少每日雪花记号，立即封锁消息并组织张子谦分路搜寻。"),
            ],
            "pub_motive": "经营万事屋收集校园奇闻与人情代价，维护社团名号与社员体面。",
            "deep_motive": "四年前目睹「小雪侦探」被媒体捧杀又遭流言反噬，故意设立「收取代价」的怪癖社团规则，让失声的墨墨不必承受廉价同情也能留在人群里。",
            "foreshadowing": "代价簿从不真正索取昂贵报酬（间章一小卖部二十元、番外一第 47 页借据），处处对应她用玩笑包裹善意的保护欲。",
        },
        {
            "id": "zhouke",
            "name": "周可",
            "full_title": "高二三班新转学生 · 温和礼貌",
            "secret_title": "周明远之女「小可」· 旧约复刻执棋人",
            "color": "#f0a4b8",
            "mini_pos": (351, 196),
            "full_pos": (356, 294),
            "cases": ("case1", "case2", "case3", "oldcase"),
            "affection_notes": [
                ("第二章 · 初次照面", "转入三班首日便委婉打听墨墨近况，走廊擦肩时目光停在墨墨的笔记本上。"),
                ("第三章 · 路灯提问", "傍晚校门口微笑询问「墨墨现在幸福吗」，观察陈默是否真正了解墨墨的过去。"),
                ("终章 · 旧仓泪解", "在天光与十二封信前卸下四年执念，与重新发声的墨墨重拾未折完的千纸鹤。"),
            ],
            "alibis": [
                ("第二案（恐吓信）", "早读前最早抵达三班走廊，具备接触旧报剪贴与班长课桌的时间窗口。"),
                ("第三案（桌游社）", "社团全员买饮料的两分钟内不在走廊视野中，熟悉旧教学楼与换气窗结构。"),
            ],
            "pub_motive": "刚从北方转学而来的普通同级生，对校园万事屋与墨墨的事迹表现出礼貌关注。",
            "deep_motive": "父亲周明远因八分钟延误遇难、母亲两年后病逝留下未寄出的信；返校复刻储物间并非害命——布下暗留电暖器、拧松水瓶并用钢索钉死货架，只求墨墨亲口给出当年的答案。",
            "foreshadowing": "序章替班方块便签、第二章五角星切法胡萝卜与旧报背面的「还回来」、第三章粉纸鹤与旧相册、第五章校长室匿名表彰信皆由她一线串联。",
        },
        {
            "id": "zhang",
            "name": "张子谦",
            "full_title": "陈默发小 · 校园情报百事通",
            "secret_title": "外围调查枢纽 · 旧楼地形与档案追踪者",
            "color": "#86d6a2",
            "mini_pos": (492, 198),
            "full_pos": (356, 492),
            "cases": ("case2", "case3", "oldcase"),
            "affection_notes": [
                ("序章～第一章", "调侃陈默倒霉体质之余帮忙打点班级人脉，见证签名本郑重送出。"),
                ("第二～三章", "晨光银杏走廊翻开情报本，提供三班转学生底细与活动室窗外可疑身影。"),
                ("第五～终章", "摸清旧楼三楼原社区储物间划归历史，关键时刻与陈默合力破门救场。"),
            ],
            "alibis": [
                ("第二～三案", "案发时在球场或学生会跑腿，所有情报均有交叉目击证人印证。"),
            ],
            "pub_motive": "仗义相助发小陈默适应新学校，顺便满足自己对校园八卦与推理委托的好奇心。",
            "deep_motive": "察觉万事屋委托背后牵扯四年前社会旧案，担心陈默与墨墨卷入危险而暗中走访老街坊与校史档案。",
            "foreshadowing": "第二章看似随口提及的「第一天就打听墨墨是不是还不说话」，精准埋下转学生熟识四年前墨雪的伏笔。",
        },
        {
            "id": "lvfu",
            "name": "吕芙",
            "full_title": "文学社常客 · 第一与第四案当事人",
            "secret_title": "向言译作忠实读者 · 借阅乌龙见证人",
            "color": "#dcb488",
            "mini_pos": (72, 192),
            "full_pos": (112, 294),
            "cases": ("case1", "case4"),
            "affection_notes": [
                ("第一章 · 失书委托", "因珍视的《美丽新世界》不翼而飞急红眼眶，破案后对万事屋心怀感激。"),
                ("第四章 · 扉页圆梦", "签售会获向言亲笔题写《月亮与六便士》扉页，见证陈默在礼堂追光下发声。"),
            ],
            "alibis": [
                ("第一案", "提交待借书单至柜台后一直在阅览区等候，未接触储物间封箱流程。"),
                ("第四案", "排队等候签售时书本短暂离手，系被误拿而非监守自盗。"),
            ],
            "pub_motive": "找回反复品读十一遍的心爱译作，并在校园签售会上向译者向言表达敬意。",
            "deep_motive": "以纯粹热爱的文学读者视角，无意间促成陈默与父亲向言在第一案签名书及第四章讲座上的两次交集。",
            "foreshadowing": "待借书单背面的浅浅瓦楞纸箱折痕，成为还原柜台三分钟两摞书交汇滑落的关键物证。",
        },
        {
            "id": "lin",
            "name": "小林",
            "full_title": "图书委员林依依 · 柜台与期刊经手人",
            "secret_title": "防盗磁条闭环证人 · 墨墨图书馆静音友人",
            "color": "#a8cfe0",
            "mini_pos": (210, 198),
            "full_pos": (126, 492),
            "cases": ("case1", "case2"),
            "affection_notes": [
                ("第一章 · 柜台复盘", "克服紧张回忆起报废装箱单与待借书单同时叠放柜台的细节。"),
                ("第二章～间章二", "协助核查期刊室《城市晚报》缺页，傍晚与墨墨展开无声的贴三千册磁条比赛。"),
            ],
            "alibis": [
                ("第一案", "按王老师吩咐清点六只报废纸箱并统一贴防盗磁条，属忙中出错的无心之失。"),
                ("第二案", "期刊室合订本借阅登记显示剪报早在数周前已被裁走，排除其作案可能。"),
            ],
            "pub_motive": "尽责完成图书室编目、贴磁条与旧报刊归档工作，害怕因工作疏漏连累他人。",
            "deep_motive": "习惯安静独处的性格让她格外理解不说话的墨墨，用并肩贴磁条的无声陪伴表达善意。",
            "foreshadowing": "「每本待处理包裹都贴了防盗磁条却未触发门禁」这一证词，一锤定音锁死书籍仍在馆内。",
        },
        {
            "id": "banzhang",
            "name": "班长",
            "full_title": "三班班长林思思 · 传话与恐吓信证人",
            "secret_title": "匿名顶班便签与旧报剪贴的被动媒介",
            "color": "#d2bc9a",
            "mini_pos": (630, 192),
            "full_pos": (586, 492),
            "cases": ("case1", "case2", "case3"),
            "affection_notes": [
                ("序章～第二章", "因误传顶班纸条与课桌恐吓信自责落泪，万事屋查明原委后卸下心理包袱。"),
                ("间章二 · 食堂咖喱", "中午在食堂二楼请客咖喱饭，收到墨墨在本子上认真写下的「咖喱很好」。"),
            ],
            "alibis": [
                ("序章与第二案", "仅按塞在讲台上的方块便签安排转学生值日，恐吓信出现前一直在办公室交作业。"),
            ],
            "pub_motive": "维护班级秩序与同学关系，查清课桌剪报恐吓信是谁留下的恶作剧。",
            "deep_motive": "热心负责、容易轻信书面留言的班干部特质，被熟悉校园流程的执棋人借用来完成无接触传话。",
            "foreshadowing": "她保留的「左手压扁字迹方块便签」与剪报边缘美工刀直切口，共同指向同一名幕后策划者。",
        },
        {
            "id": "xiang",
            "name": "向言",
            "full_title": "知名作家与文学译者 · 校庆讲座嘉宾",
            "secret_title": "陈默生父 · 「代人发声」镜像对照者",
            "color": "#b0b0d8",
            "mini_pos": (72, 66),
            "full_pos": (96, 98),
            "cases": ("case1", "case4"),
            "affection_notes": [
                ("第一章 · 扉页墨迹", "虽未露面，但寄给儿子的深海蓝防水墨水亲笔签名本成为连接陈默与墨墨的信物。"),
                ("第四章 · 礼堂与签售", "讲座追光下习惯性替儿子回答提问，签售台前停笔写下迟来的理解与克制。"),
            ],
            "alibis": [
                ("第四案", "全程在礼堂讲台与侧厅签售桌前受师生簇拥，凭独特回锋笔迹一眼辨出真伪签名本。"),
            ],
            "pub_motive": "应邀赴云溪高中举办文学讲座与签售会，顺道探望独自住校生活的儿子陈默。",
            "deep_motive": "笨拙而强势的父爱让他总想替不善言辞的儿子铺路发声，直到看见陈默守护墨墨的姿态才学会放手。",
            "foreshadowing": "扉页短促回锋笔迹在第一案证伪代签嫌疑，第四章划掉重写的那行赠言则映照出两代人的和解。",
        },
        {
            "id": "waipo",
            "name": "外婆",
            "full_title": "墨墨监护人 · 老巷暖灯守望者",
            "secret_title": "旧木盒白纸鹤与「墨雪」旧档保管人",
            "color": "#c9b8a0",
            "mini_pos": (630, 66),
            "full_pos": (600, 294),
            "cases": ("case4", "oldcase"),
            "affection_notes": [
                ("第四章 · 热姜茶", "雨暮巷口端出热姜茶招待陈默，欣慰外孙女四年后终于带朋友回家。"),
                ("第五章 · 托付旧物", "在暖黄台灯下打开尘封旧木盒，将儿童节合影与事故前一日的白纸鹤交给陈默。"),
            ],
            "alibis": [
                ("旧案与今案", "四年前事故后带墨墨搬离旧小区悉心照料，守口如瓶只为护住外孙女平静的校园生活。"),
            ],
            "pub_motive": "照顾不爱说话的外孙女日常起居，盼望墨墨在云溪高中交到真正交心的朋友。",
            "deep_motive": "深知逃避无法抹去四年前那个冬夜的心结，在墨墨失联后选择相信陈默，亲手交出通往真相的钥匙。",
            "foreshadowing": "第四章不经意唤出的旧名「小雪」与第五章木盒里的旧纸鹤，拼齐了通往真结局的最后一块碎片。",
        },
    ]

    _DOSSIER_CAST_MAP = {c["id"]: c for c in DOSSIER_CAST}

    # (起点角色, 终点角色, 关联案件元组, 表层公开关系, 深层真相连接, 是否涉核心剧透)
    DOSSIER_LINKS = [
        ("mc", "mo", ("case1", "case2", "case3", "case4", "oldcase"),
         "万事屋搭档 · 歪翅膀纸鹤之约", "代声与发声 · 携手走出八分钟旧案阴影", False),
        ("mo", "alice", ("case1", "case2", "case3", "oldcase"),
         "万事屋双核 · 眼神与便签默契", "四年前流言见证 · 以代价簿筑起避风港", False),
        ("mc", "alice", ("case1", "case2", "case3", "case4"),
         "社长与嘴替 · 现场取证与直觉点拨", "默契共犯 · 共同守护墨墨不被二次消费", False),
        ("mo", "zhouke", ("case2", "case3", "oldcase"),
         "邻班校友 · 傍晚校门问候", "幼年挚友小可 · 十二封未寄信与储物间之约", True),
        ("mc", "zhouke", ("case3", "oldcase"),
         "第三案校门交谈 · 观察万事屋动向", "点破换气窗密室破绽 · 开启真结局暗线", True),
        ("zhouke", "banzhang", ("case1", "case2", "oldcase"),
         "高二三班同窗日常交集", "借方块便签排顶班 · 投递旧报剪贴试探", True),
        ("mc", "zhang", ("case2", "case3", "oldcase"),
         "发小死党 · 校园情报支援", "追查转学档案与旧楼三楼原储物间地形", False),
        ("zhang", "zhouke", ("case2", "case3", "oldcase"),
         "留意三班新转学生校园动向", "锁定活动室窗外身影与周家北迁旧址", True),
        ("lvfu", "lin", ("case1",),
         "借阅柜台三分钟书单交汇", "待借单叠压报废箱导致磁条误封乌龙", False),
        ("lvfu", "xiang", ("case1", "case4"),
         "忠实读者与译者 · 签名扉页心愿", "两本译作串联首章乌龙与四章签售重逢", False),
        ("mc", "xiang", ("case1", "case4"),
         "疏离父子 · 校庆讲座重逢", "直面「替沉默者开口」的控制欲与边界", False),
        ("mo", "waipo", ("case4", "oldcase"),
         "祖孙相依 · 老巷热姜茶", "封存旧木盒白纸鹤与「墨雪」童年合影", False),
        ("banzhang", "mo", ("case2", "case3"),
         "邻班班长关照 · 食堂咖喱饭之约", "恐吓信风波冰释后收获笔记致谢", False),
        ("alice", "lin", ("case1", "case2"),
         "万事屋查证协作 · 期刊室核档", "比对四年前《城市晚报》B2版裁切缺页", False),
    ]

    def dossier_get_char(cid):
        if cid in _DOSSIER_CAST_MAP:
            return _DOSSIER_CAST_MAP[cid]
        return DOSSIER_CAST[0]

    def dossier_char_in_case(cid, case_key):
        if not case_key or case_key == "all":
            return True
        c = _DOSSIER_CAST_MAP.get(cid)
        return bool(c and case_key in c.get("cases", ()))

    def dossier_visible_links(case_key="all"):
        if not case_key or case_key == "all":
            return list(DOSSIER_LINKS)
        return [lnk for lnk in DOSSIER_LINKS if case_key in lnk[2]]

    def dossier_char_links(cid, case_key="all"):
        out = []
        for src, dst, cases, pub_lbl, deep_lbl, sp in dossier_visible_links(case_key):
            if src == cid:
                out.append((dst, cases, pub_lbl, deep_lbl, sp))
            elif dst == cid:
                out.append((src, cases, pub_lbl, deep_lbl, sp))
        return out

    def dossier_thread_geom(p1, p2):
        dx = float(p2[0] - p1[0])
        dy = float(p2[1] - p1[1])
        dist = max(12, int(math.hypot(dx, dy)))
        deg = math.degrees(math.atan2(dy, dx))
        mx = int((p1[0] + p2[0]) * 0.5)
        my = int((p1[1] + p2[1]) * 0.5)
        return mx, my, dist, deg

    def dossier_case_label(case_key):
        for k, lbl in DOSSIER_CASES:
            if k == case_key:
                return lbl
        return "全卷宗总览"

screen extras_dossier():
    $ _unlocked = truth_spoiler_unlocked()
    $ _case_key = persistent.dossier_case_filter or "all"
    $ _sel_char = dossier_get_char(persistent.dossier_selected_char or "mo")
    $ _sel_id = _sel_char["id"]
    $ _links = dossier_visible_links(_case_key)
    $ _char_links = dossier_char_links(_sel_id, _case_key)

    vbox:
        spacing 10

        ## 顶部卷宗横幅 + 防剧透联动开关 + 全屏推演板入口
        frame:
            style "truth_banner_card"
            hbox:
                xfill True
                yalign 0.5
                spacing 10
                hbox:
                    spacing 10
                    yalign 0.5
                    xsize 438
                    add "images/ui/icon_dossier_stamp.png" xysize (30, 30) yalign 0.5
                    vbox:
                        spacing 2
                        if persistent.te_cleared:
                            text _("人物关系复盘白板 · 真结局全卷宗已解密") style "truth_banner_title" color "#f4d98a"
                            text _("点击软木板角色立牌或红线标签，复盘各章好感轨迹、不在场证明与深层伏笔。") style "truth_banner_sub"
                        elif persistent.truth_spoiler_confirmed:
                            text _("人物关系复盘白板 · 已手动开启剧透批注") style "truth_banner_title" color "#f0a4b8"
                            text _("当前显示深层动机与四年前红线闭环；可随时恢复防剧透遮罩。") style "truth_banner_sub"
                        else:
                            text _("人物关系复盘白板 · 防剧透保护开启中") style "truth_banner_title" color "#cbb0e6"
                            text _("核心幕后红线与深层动机已加盖保密火漆，通关 TRUE END 后自动完整揭示。") style "truth_banner_sub"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    if not persistent.te_cleared:
                        if persistent.truth_spoiler_confirmed:
                            textbutton _("恢复遮罩"):
                                style "pill_button"
                                xminimum 96
                                ysize 32
                                padding (12, 0)
                                text_size 14
                                action [SetField(persistent, "truth_spoiler_confirmed", False), Function(renpy.save_persistent)]
                        else:
                            textbutton _("解锁剧透"):
                                style "pill_button"
                                xminimum 96
                                ysize 32
                                padding (12, 0)
                                text_size 14
                                action Show("confirm",
                                            message=_("尚未通关 TRUE END，确定提前揭晓「人物关系复盘白板」中的核心动机与幕后红线吗？"),
                                            yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                            no_action=Hide("confirm"))
                    textbutton _("展开全屏白板"):
                        style "pill_button"
                        xminimum 118
                        ysize 32
                        padding (12, 0)
                        text_size 14
                        action Show("dossier_fullboard")

        ## 案件筛选条
        hbox:
            spacing 6
            yalign 0.5
            for c_key, c_lbl in DOSSIER_CASES:
                textbutton c_lbl:
                    style "dossier_filter_pill"
                    selected (_case_key == c_key)
                    action SetField(persistent, "dossier_case_filter", c_key)

        ## 软木推理白板：红线网络 + 10 名核心人物钉板节点
        frame:
            style "dossier_corkboard_frame"
            fixed:
                xsize 702
                ysize 256

                ## 背景暗纹与四角卷宗编号
                add Tile("gui/grain.png") alpha 0.08
                text ("CASE DOSSIER · " + dossier_case_label(_case_key)):
                    size 12
                    color "#8f7aa888"
                    kerning 2
                    xpos 8
                    ypos 4
                    substitute False

                ## 跨案件调查红线
                for src_id, dst_id, _lcases, _pub_l, _deep_l, is_sp in _links:
                    $ _p1 = _DOSSIER_CAST_MAP[src_id]["mini_pos"]
                    $ _p2 = _DOSSIER_CAST_MAP[dst_id]["mini_pos"]
                    $ _mx, _my, _dist, _deg = dossier_thread_geom(_p1, _p2)
                    $ _focus = (_sel_id in (src_id, dst_id))
                    $ _tint = ("#f46d7d" if (_focus and (not is_sp or _unlocked))
                               else ("#f4d98a" if (_focus and is_sp and not _unlocked)
                                     else ("#b8425677" if not is_sp else "#7e689666")))
                    $ _thick = 3 if _focus else 2
                    add Transform("gui/title_band.png", xysize=(_dist, _thick), matrixcolor=TintMatrix(_tint), rotate=_deg, subpixel=True):
                        xpos _mx
                        ypos _my
                        anchor (0.5, 0.5)
                    if _focus:
                        add "images/ui/icon_red_thread_knot.png":
                            xysize (16, 16)
                            xpos _mx
                            ypos _my
                            anchor (0.5, 0.5)
                            alpha (0.95 if (not is_sp or _unlocked) else 0.60)

                ## 10 个可点击人物立牌节点
                for ch in DOSSIER_CAST:
                    $ _cid = ch["id"]
                    $ _nx, _ny = ch["mini_pos"]
                    $ _in_case = dossier_char_in_case(_cid, _case_key)
                    $ _is_sel = (_cid == _sel_id)
                    button:
                        style ("dossier_node_selected" if _is_sel else "dossier_node_idle")
                        xpos _nx
                        ypos _ny
                        anchor (0.5, 0.5)
                        alpha (1.0 if (_in_case or _is_sel) else 0.42)
                        action SetField(persistent, "dossier_selected_char", _cid)
                        fixed:
                            xfill True
                            yfill True
                            vbox:
                                xalign 0.5
                                yalign 0.55
                                spacing 2
                                add ("images/side_%s_neutral.png" % _cid) xysize (40, 40) xalign 0.5
                                text ch["name"]:
                                    size 13
                                    bold _is_sel
                                    color (ch["color"] if _is_sel else "#e8def5")
                                    xalign 0.5
                                    substitute False
                            add "images/ui/icon_dossier_pin.png" xysize (16, 16) xalign 0.5 ypos -3

        ## 当前选中角色卷宗详情卡
        frame:
            style "dossier_detail_card"
            vbox:
                spacing 10

                hbox:
                    xfill True
                    spacing 14
                    yalign 0.5
                    frame:
                        style "dossier_avatar_box"
                        fixed:
                            xsize 78
                            ysize 78
                            add ("images/side_%s_neutral.png" % _sel_id) xysize (74, 74) align (0.5, 0.5)
                            add "images/ui/icon_dossier_pin.png" xysize (18, 18) xalign 0.92 ypos -2
                    vbox:
                        spacing 4
                        xsize 590
                        yalign 0.5
                        hbox:
                            spacing 10
                            yalign 0.5
                            text _sel_char["name"]:
                                font gui.name_text_font
                                size 23
                                color _sel_char["color"]
                                substitute False
                            frame:
                                style "bookmark_chap_badge"
                                text (_sel_char["secret_title"] if _unlocked else _sel_char["full_title"]):
                                    style "bookmark_chap_text"
                                    color ("#f4d98a" if _unlocked else "#cbb0e6")
                                    substitute False
                        text (_("公开定位：") + _sel_char["full_title"]):
                            size 14
                            color "#b39bd0"
                            substitute False
                        hbox:
                            spacing 6
                            text _("涉案卷宗：") size 13 color "#8e7ca8" yalign 0.5
                            for c_tag in _sel_char["cases"]:
                                frame:
                                    style "dossier_mini_tag"
                                    text dossier_case_label(c_tag) size 12 color "#dfd2f2" substitute False

                ## 关联红线跳转标签（点击任意关联人直接切换检视对象）
                vbox:
                    spacing 5
                    hbox:
                        spacing 6
                        yalign 0.5
                        add "images/ui/icon_red_thread_knot.png" xysize (18, 18) yalign 0.5
                        text _("当前卷宗红线连接（点击人物可顺藤摸瓜跳转）") style "dossier_sec_title" color "#f2a6b6"
                    if not _char_links:
                        text _("该角色在当前筛选案件下无直接红线记录，可切换至「全卷宗总览」查看完整关系网。") size 14 color "#8a7aa0"
                    else:
                        vbox:
                            spacing 5
                            for other_id, _lcases, pub_rel, deep_rel, is_sp in _char_links:
                                $ _other = dossier_get_char(other_id)
                                button:
                                    style "dossier_link_row"
                                    action SetField(persistent, "dossier_selected_char", other_id)
                                    hbox:
                                        xfill True
                                        yalign 0.5
                                        spacing 8
                                        add "images/ui/icon_red_thread_knot.png" xysize (15, 15) yalign 0.5
                                        text _other["name"]:
                                            size 14
                                            bold True
                                            color _other["color"]
                                            yalign 0.5
                                            substitute False
                                        text "—":
                                            size 14
                                            color "#7d6b99"
                                            yalign 0.5
                                        if _unlocked or not is_sp:
                                            text (deep_rel if _unlocked else pub_rel):
                                                size 14
                                                color ("#f5e8ff" if _unlocked else "#d8c8ee")
                                                yalign 0.5
                                                substitute False
                                        else:
                                            text (pub_rel + "  【深层因果待解锁】"):
                                                size 14
                                                color "#9a86b8"
                                                yalign 0.5
                                                substitute False

                ## 双栏并排：章节好感/羁绊笔记 + 不在场证明与行踪
                hbox:
                    spacing 10
                    frame:
                        style "truth_track_old"
                        vbox:
                            spacing 5
                            text _("章节好感与羁绊轨迹") style "truth_track_label_old"
                            for ch_tag, ch_note in _sel_char["affection_notes"]:
                                text ("【%s】%s" % (ch_tag, ch_note)):
                                    style "truth_body_text"
                                    substitute False
                    frame:
                        style "truth_track_new"
                        vbox:
                            spacing 5
                            text _("在场证明与案件行踪") style "truth_track_label_new"
                            for al_tag, al_note in _sel_char["alibis"]:
                                text ("【%s】%s" % (al_tag, al_note)):
                                    style "truth_body_text"
                                    substitute False

                ## 深层动机 + 伏笔回收闭环（受防剧透开关保护）
                frame:
                    style ("truth_link_box" if _unlocked else "truth_lock_box")
                    vbox:
                        spacing 5
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_dossier_stamp.png" xysize (18, 18) yalign 0.5
                            text _("深层动机与伏笔回收闭环") size 15 font gui.name_text_font color ("#f4d98a" if _unlocked else "#b39bd0")
                        text ("表层动因：" + _sel_char["pub_motive"]):
                            style "truth_body_text"
                            substitute False
                        if _unlocked:
                            text ("核心动机：" + _sel_char["deep_motive"]):
                                style "truth_deep_text"
                                substitute False
                            text ("伏笔回收：" + _sel_char["foreshadowing"]):
                                style "truth_link_text"
                                substitute False
                        else:
                            text _("核心动机与跨章伏笔闭环已加盖保密印章（通关 TRUE END 或点击右上角「解锁剧透」后揭示）。"):
                                style "truth_masked_text"


## 全屏软木推理白板（1280×720 沉浸式复盘视图）
screen dossier_fullboard():
    modal True
    zorder 215

    $ _unlocked = truth_spoiler_unlocked()
    $ _case_key = persistent.dossier_case_filter or "all"
    $ _sel_char = dossier_get_char(persistent.dossier_selected_char or "mo")
    $ _sel_id = _sel_char["id"]
    $ _links = dossier_visible_links(_case_key)
    $ _char_links = dossier_char_links(_sel_id, _case_key)

    add "gui/game_menu.png"
    add "#0b0714dc"
    add Tile("gui/grain.png") alpha 0.06

    key "game_menu" action Hide("dossier_fullboard")
    key "K_ESCAPE" action Hide("dossier_fullboard")

    ## 顶栏：标题 + 案件筛选 + 剧透保护开关 + 返回鉴赏
    frame:
        xpos 30
        ypos 16
        xsize 1220
        ysize 54
        padding (18, 8)
        background Frame("gui/hud_chip.png", 12, 12)
        hbox:
            xfill True
            yalign 0.5
            spacing 10
            hbox:
                spacing 8
                yalign 0.5
                add "images/ui/icon_dossier_stamp.png" xysize (26, 26) yalign 0.5
                text _("关系复盘白板") font gui.name_text_font size 20 color "#f2e6ff" yalign 0.5
            hbox:
                spacing 5
                yalign 0.5
                for c_key, c_lbl in DOSSIER_CASES:
                    textbutton c_lbl:
                        style "dossier_filter_pill"
                        selected (_case_key == c_key)
                        action SetField(persistent, "dossier_case_filter", c_key)
            hbox:
                xalign 1.0
                yalign 0.5
                spacing 8
                if not persistent.te_cleared:
                    textbutton (_("恢复遮罩") if persistent.truth_spoiler_confirmed else _("解锁剧透")):
                        style "pill_button"
                        xminimum 92
                        ysize 34
                        padding (12, 0)
                        text_size 14
                        action [SetField(persistent, "truth_spoiler_confirmed", not persistent.truth_spoiler_confirmed), Function(renpy.save_persistent)]
                textbutton _("返回鉴赏"):
                    style "pill_button"
                    xminimum 96
                    ysize 34
                    padding (12, 0)
                    text_size 14
                    action Hide("dossier_fullboard")

    ## 主体双栏：左 740px 软木关系板 + 右 464px 卷宗详情抽屉
    hbox:
        xpos 30
        ypos 82
        spacing 16

        frame:
            xsize 740
            ysize 614
            padding (14, 14)
            background Frame("gui/panel_dark.png", 26, 26)
            fixed:
                xsize 712
                ysize 586
                add Solid("#181124cc") xsize 712 ysize 586
                add Tile("gui/grain.png") alpha 0.09
                text ("INVESTIGATION BOARD · " + dossier_case_label(_case_key)):
                    size 13
                    color "#9a86b899"
                    kerning 2
                    xpos 12
                    ypos 8
                    substitute False

                for src_id, dst_id, _lcases, _pub_l, _deep_l, is_sp in _links:
                    $ _p1 = _DOSSIER_CAST_MAP[src_id]["full_pos"]
                    $ _p2 = _DOSSIER_CAST_MAP[dst_id]["full_pos"]
                    $ _mx, _my, _dist, _deg = dossier_thread_geom(_p1, _p2)
                    $ _focus = (_sel_id in (src_id, dst_id))
                    $ _tint = ("#f46d7d" if (_focus and (not is_sp or _unlocked))
                               else ("#f4d98a" if (_focus and is_sp and not _unlocked)
                                     else ("#b8425688" if not is_sp else "#7e689666")))
                    add Transform("gui/title_band.png", xysize=(_dist, (4 if _focus else 2)), matrixcolor=TintMatrix(_tint), rotate=_deg, subpixel=True):
                        xpos _mx
                        ypos _my
                        anchor (0.5, 0.5)
                    if _focus:
                        add "images/ui/icon_red_thread_knot.png":
                            xysize (20, 20)
                            xpos _mx
                            ypos _my
                            anchor (0.5, 0.5)

                for ch in DOSSIER_CAST:
                    $ _cid = ch["id"]
                    $ _fx, _fy = ch["full_pos"]
                    $ _in_case = dossier_char_in_case(_cid, _case_key)
                    $ _is_sel = (_cid == _sel_id)
                    button:
                        style ("dossier_fullnode_selected" if _is_sel else "dossier_fullnode_idle")
                        xpos _fx
                        ypos _fy
                        anchor (0.5, 0.5)
                        alpha (1.0 if (_in_case or _is_sel) else 0.42)
                        action SetField(persistent, "dossier_selected_char", _cid)
                        fixed:
                            xfill True
                            yfill True
                            vbox:
                                xalign 0.5
                                yalign 0.62
                                spacing 3
                                add ("images/side_%s_neutral.png" % _cid) xysize (54, 54) xalign 0.5
                                text ch["name"]:
                                    size 15
                                    bold True
                                    color (ch["color"] if _is_sel else "#f2ecf8")
                                    xalign 0.5
                                    substitute False
                            add "images/ui/icon_dossier_pin.png" xysize (20, 20) xalign 0.5 ypos -4

        frame:
            xsize 464
            ysize 614
            padding (18, 16)
            background Frame("gui/panel_dark.png", 26, 26)
            viewport:
                xsize 428
                ysize 582
                scrollbars "vertical"
                mousewheel True
                draggable True
                side_yfill True
                side_spacing 8
                vbox:
                    xsize 412
                    spacing 10
                    hbox:
                        spacing 12
                        yalign 0.5
                        add ("images/side_%s_neutral.png" % _sel_id) xysize (68, 68) yalign 0.5
                        vbox:
                            spacing 3
                            xsize 326
                            text _sel_char["name"] font gui.name_text_font size 24 color _sel_char["color"] substitute False
                            text (_sel_char["secret_title"] if _unlocked else _sel_char["full_title"]) size 14 color "#f4d98a" substitute False
                    add Solid("#6a5c8055") xfill True ysize 1

                    hbox:
                        spacing 6
                        yalign 0.5
                        add "images/ui/icon_red_thread_knot.png" xysize (16, 16) yalign 0.5
                        text _("关联红线") font gui.name_text_font size 16 color "#f2a6b6"
                    for other_id, _lcases, pub_rel, deep_rel, is_sp in _char_links:
                        $ _other = dossier_get_char(other_id)
                        button:
                            style "dossier_link_row"
                            action SetField(persistent, "dossier_selected_char", other_id)
                            hbox:
                                spacing 6
                                yalign 0.5
                                text (_other["name"] + "：") size 13 bold True color _other["color"] substitute False
                                text ((deep_rel if _unlocked else pub_rel) if (_unlocked or not is_sp) else (pub_rel + "（加密）")):
                                    size 13
                                    color "#e8def5"
                                    substitute False

                    text _("章节好感与羁绊笔记") font gui.name_text_font size 16 color "#f4d98a"
                    for ch_tag, ch_note in _sel_char["affection_notes"]:
                        text ("【%s】%s" % (ch_tag, ch_note)) style "truth_body_text" substitute False

                    text _("不在场证明与行踪") font gui.name_text_font size 16 color "#86d6a2"
                    for al_tag, al_note in _sel_char["alibis"]:
                        text ("【%s】%s" % (al_tag, al_note)) style "truth_body_text" substitute False

                    text _("深层动机与伏笔闭环") font gui.name_text_font size 16 color "#cbb0e6"
                    text ("表层动因：" + _sel_char["pub_motive"]) style "truth_body_text" substitute False
                    if _unlocked:
                        text ("核心动机：" + _sel_char["deep_motive"]) style "truth_deep_text" substitute False
                        text ("伏笔回收：" + _sel_char["foreshadowing"]) style "truth_link_text" substitute False
                    else:
                        text _("核心动机与跨章伏笔已加密遮罩，通关 TRUE END 或开启剧透开关后可完整阅览。") style "truth_masked_text"


style dossier_filter_pill is pill_button:
    xminimum 96
    ysize 30
    padding (10, 0)
style dossier_filter_pill_text is pill_button_text:
    size 13

style dossier_corkboard_frame is default:
    xfill True
    ysize 276
    padding (10, 10)
    background Frame("gui/panel_card.png", 16, 16)

style dossier_node_idle is button:
    xsize 94
    ysize 68
    padding (4, 4)
    background Frame("gui/panel_card.png", 12, 12)
    hover_background Frame("gui/panel_card_hover.png", 12, 12)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style dossier_node_selected is dossier_node_idle:
    background Frame("gui/pill_selected.png", 16, 16)
    hover_background Frame("gui/pill_selected.png", 16, 16)

style dossier_fullnode_idle is dossier_node_idle:
    xsize 112
    ysize 92
    padding (6, 6)

style dossier_fullnode_selected is dossier_node_selected:
    xsize 112
    ysize 92
    padding (6, 6)

style dossier_detail_card is default:
    xfill True
    padding (14, 12)
    background Frame("gui/panel_card.png", 16, 16)

style dossier_avatar_box is default:
    xsize 86
    ysize 86
    padding (4, 4)
    background Frame("gui/hud_chip.png", 12, 12)

style dossier_mini_tag is default:
    padding (7, 2)
    background "#221834dd"

style dossier_sec_title is text:
    font gui.name_text_font
    size 15

style dossier_link_row is button:
    xfill True
    padding (10, 5)
    background "#161024cc"
    hover_background "#281d3eee"
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"


################################################################################
## ---- 分页 8：自由剧场（背景舞台 · lighting.rpy 色温 · 立绘/装扮差分 · 纯净取景）----
################################################################################

init python:
    # (bg 键名 -> 对应 images/bg_<key>.png 与 BG_LIGHT[key], 显示标题, 场景说明, 最低解锁章节 0=默认开放)
    STUDIO_BG_LIST = [
        ("agency",         "万事屋活动室",   "午后暖阳 · 委托起点", 0),
        ("library",        "图书馆阅览区",   "初遇书架 · 纸鹤折页", 0),
        ("classroom",      "高二教室",       "课桌日常 · 推来笔记", 0),
        ("rooftop",        "教学楼天台",     "微风晴空 · 挡风便当", 0),
        ("sunset",         "放课夕阳坡道",   "琥珀余晖 · 并肩放学", 0),
        ("riverside",      "黄昏河堤长椅",   "波光晚风 · 折鹤约定", 0),
        ("clubroom",       "桌游社活动室",   "木桌暖灯 · 密室推演", 0),
        ("corridor",       "银杏教学走廊",   "晨光斜影 · 情报交汇", 0),
        ("gate",           "云溪高中校门",   "放学路灯 · 暮色驻足", 0),
        ("canteen",        "食堂二楼窗边",   "正午暖光 · 咖喱午餐", 0),
        ("booksigning",    "图书馆签售侧厅", "书香灯影 · 扉页题字", 0),
        ("hall",           "学校大礼堂",     "舞台追光 · 校庆讲座", 0),
        ("street",         "林荫住宅街",     "雨夜街灯 · 同伞归途", 0),
        ("oden",           "张记关东煮",     "深夜暖帘 · 热汤白雾", 0),
        ("mohouse",        "外婆家巷口",     "老巷夜灯 · 姜茶暖意", 4),
        ("oldbuilding",    "旧楼三楼仓库",   "尘封天光 · 终章舞台", 5),
    ]

    # 色温与环境光预设（与 game/lighting.rpy 的 BG_LIGHT 实时联动）
    STUDIO_LIGHT_PRESETS = [
        ("auto",   "原景光效", "按 lighting.rpy 场景色温自动匹配立绘受光"),
        ("day",    "晴昼晨光", "5600K 清透日光 · 明快通透"),
        ("sunset", "暮色夕照", "3200K 琥珀斜阳 · 温柔暖金"),
        ("night",  "静谧夜色", "8000K 深蓝月华 · 沉静冷调"),
        ("rain",   "冷雨阴霾", "7200K 青灰雨雾 · 微凉潮湿"),
        ("sepia",  "旧案褪色", "怀旧低饱和胶片 · 四年前回忆滤镜"),
        ("noir",   "剧场追光", "悬疑舞台聚光 · 突出人物神态"),
    ]

    # 18 位可选出场角色（与 definitions.rpy _CHARA_KEYS 完全一致）
    STUDIO_CHARA_LIST = [
        ("mo",       "墨墨",       "#cfa6f0"),
        ("alice",    "艾丽丝",     "#f0c060"),
        ("mc",       "陈默",       "#8cc0e6"),
        ("zhouke",   "周可",       "#f0a4b8"),
        ("zhang",    "张子谦",     "#86d6a2"),
        ("lvfu",     "吕芙",       "#dcb488"),
        ("banzhang", "班长",       "#d2bc9a"),
        ("lin",      "小林",       "#a8cfe0"),
        ("joker",    "Joker",      "#f0665a"),
        ("xiang",    "向言",       "#b0b0d8"),
        ("wang",     "王老师",     "#c0c0cc"),
        ("waipo",    "外婆",       "#c9b8a0"),
        ("zhangma",  "张阿姨",     "#d0a070"),
        ("shezhang", "高社长",     "#8aa0b0"),
        ("bianji",   "许编辑",     "#9a8ab0"),
        ("huang",    "黄老师",     "#b09090"),
        ("teacher",  "校长",       "#bdbdc4"),
        ("ayi",      "小卖部阿姨", "#c0a080"),
    ]
    _STUDIO_CHARA_MAP = {k: (name, col) for k, name, col in STUDIO_CHARA_LIST}

    # 8 种表情差分（对应 images/chara_<key>_<expr>.png）
    STUDIO_EXPR_LIST = [
        ("neutral", "平静"),
        ("smile",   "微笑"),
        ("happy",   "欣喜"),
        ("blush",   "害羞"),
        ("think",   "沉思"),
        ("shock",   "惊讶"),
        ("sad",     "落寞"),
        ("angry",   "严肃"),
    ]

    # 装扮色调与镜头景别差分（叠加在胸像立绘上的衣着氛围与站位景深）
    STUDIO_OUTFIT_LIST = [
        ("standard",         "常服标准"),
        ("warm_afterschool", "放课暖装·近景"),
        ("rain_coat",        "雨夜微凉"),
        ("memory_archive",   "旧卷剪影"),
    ]

    # 说话人模式
    STUDIO_SPEAKER_MODES = [
        ("slot1_note", "一号位（牛皮纸笔记）"),
        ("slot1",      "一号位开口"),
        ("slot2",      "二号位开口"),
        ("narrator",   "旁白（无名框）"),
    ]

    STUDIO_PRESET_LINES = [
        ("slot1_note", "发现真相不是为了证明你聪明。是为了让那个疼的人知道，有人看见了。"),
        ("slot2",      "欢迎来到万事屋！既然接下了你的委托，本社长和墨墨就绝不会半途而废。"),
        ("slot1",      "这只千纸鹤的翅膀虽然折歪了一点……但这一次，约好的事不会再失约了。"),
        ("narrator",   "夕阳穿过云溪高中走廊的玻璃窗，把两个人的影子拉得很长很长。"),
        ("slot1_note", "今天食堂二楼的咖喱很好，谢谢你一直等我自己把这句话写完。"),
    ]

    def studio_bg_unlocked(bg_key):
        for k, _title, _sub, req_chap in STUDIO_BG_LIST:
            if k == bg_key:
                if req_chap <= 0:
                    return True
                return bool(
                    (persistent.chapter_reached or 0) >= req_chap
                    or renpy.seen_image("bg " + k)
                    or truth_spoiler_unlocked()
                )
        return True

    def studio_bg_title(bg_key):
        for k, title, _sub, _req in STUDIO_BG_LIST:
            if k == bg_key:
                return title
        return "万事屋活动室"

    def studio_light_title(light_key):
        for k, title, _desc in STUDIO_LIGHT_PRESETS:
            if k == light_key:
                return title
        return "原景光效"

    def studio_bg_matrix(light_key):
        if light_key == "day":
            return TintMatrix("#fffdf6") * BrightnessMatrix(0.03) * SaturationMatrix(1.05)
        elif light_key == "sunset":
            return TintMatrix("#ffd2a4") * BrightnessMatrix(-0.01) * SaturationMatrix(1.10)
        elif light_key == "night":
            return TintMatrix("#8ca6dc") * BrightnessMatrix(-0.14) * SaturationMatrix(0.82)
        elif light_key == "rain":
            return TintMatrix("#a6bfd4") * BrightnessMatrix(-0.08) * SaturationMatrix(0.72)
        elif light_key == "sepia":
            return SaturationMatrix(0.28) * TintMatrix("#d8c8b0") * BrightnessMatrix(-0.08)
        elif light_key == "noir":
            return SaturationMatrix(0.45) * TintMatrix("#cbbce8") * BrightnessMatrix(-0.12)
        return BrightnessMatrix(0.0)

    def studio_sprite_matrix(bg_key, light_key, outfit_key="standard", dimmed=False):
        tint, br = BG_LIGHT.get(bg_key, ((1.0, 1.0, 1.0), 0.0))
        if light_key == "auto":
            mat = TintMatrix(Color(rgb=tint)) * BrightnessMatrix(br)
        elif light_key == "day":
            mat = TintMatrix("#fffaf0") * BrightnessMatrix(0.03) * SaturationMatrix(1.04)
        elif light_key == "sunset":
            mat = TintMatrix("#ffc894") * BrightnessMatrix(-0.02) * SaturationMatrix(1.06)
        elif light_key == "night":
            mat = TintMatrix("#98b0e4") * BrightnessMatrix(-0.10) * SaturationMatrix(0.86)
        elif light_key == "rain":
            mat = TintMatrix("#b0c6d8") * BrightnessMatrix(-0.06) * SaturationMatrix(0.78)
        elif light_key == "sepia":
            mat = SaturationMatrix(0.32) * TintMatrix("#dccbb4") * BrightnessMatrix(-0.06)
        elif light_key == "noir":
            mat = SaturationMatrix(0.74) * TintMatrix("#efe6ff") * BrightnessMatrix(0.01)
        else:
            mat = TintMatrix(Color(rgb=tint)) * BrightnessMatrix(br)

        if outfit_key == "warm_afterschool":
            mat = mat * TintMatrix("#ffeede") * BrightnessMatrix(0.02)
        elif outfit_key == "rain_coat":
            mat = mat * TintMatrix("#dce8f8") * BrightnessMatrix(-0.03) * SaturationMatrix(0.90)
        elif outfit_key == "memory_archive":
            mat = mat * SaturationMatrix(0.48) * TintMatrix("#e4d4c8")

        if dimmed:
            mat = mat * BrightnessMatrix(-0.18) * SaturationMatrix(0.78)
        return mat

    def studio_bg_displayable(bg_key, light_key, width, height):
        safe_bg = bg_key if studio_bg_unlocked(bg_key) else "agency"
        path = "images/bg_%s.png" % safe_bg
        return Transform(path, xysize=(width, height), fit="contain", matrixcolor=studio_bg_matrix(light_key))

    def studio_sprite_displayable(char_key, expr_key, bg_key, light_key, outfit_key, target_h, dimmed=False):
        if not char_key or char_key == "none":
            return Null()
        c_key = char_key if char_key in _STUDIO_CHARA_MAP else "mo"
        e_key = expr_key if any(e == expr_key for e, _l in STUDIO_EXPR_LIST) else "neutral"
        zoom_mul = 1.06 if outfit_key == "warm_afterschool" else 1.0
        h = int(target_h * zoom_mul)
        path = "images/chara_%s_%s.png" % (c_key, e_key)
        return Transform(path, fit="contain", ysize=h, matrixcolor=studio_sprite_matrix(bg_key, light_key, outfit_key, dimmed), subpixel=True)

    def studio_resolved_dialogue():
        s1 = persistent.studio_slot1_char or "mo"
        e1 = persistent.studio_slot1_expr or "smile"
        s2 = persistent.studio_slot2_char or "none"
        e2 = persistent.studio_slot2_expr or "happy"
        spk = persistent.studio_speaker or "slot1_note"
        raw_line = (persistent.studio_custom_line or "").strip()
        if not raw_line:
            raw_line = STUDIO_PRESET_LINES[0][1]

        if spk == "slot1_note":
            name1, col1 = _STUDIO_CHARA_MAP.get(s1, ("墨墨", "#cfa6f0"))
            who_label = "%s（笔记）" % name1
            side_path = "images/side_%s_%s.png" % (s1, e1)
            return who_label, "#b99ad8", side_path, True, "「%s」" % raw_line.strip("「」"), 1
        elif spk == "slot2" and s2 != "none" and s2 in _STUDIO_CHARA_MAP:
            name2, col2 = _STUDIO_CHARA_MAP[s2]
            side_path = "images/side_%s_%s.png" % (s2, e2)
            return name2, col2, side_path, False, raw_line, 2
        elif spk == "narrator":
            return None, "#cbb0e6", None, False, raw_line, 0
        else:
            name1, col1 = _STUDIO_CHARA_MAP.get(s1, ("墨墨", "#cfa6f0"))
            side_path = "images/side_%s_%s.png" % (s1, e1)
            return name1, col1, side_path, False, raw_line, 1

    def studio_cycle_preset_line():
        cur = (persistent.studio_custom_line or "").strip()
        idx = -1
        for i, (_spk, txt) in enumerate(STUDIO_PRESET_LINES):
            if txt == cur:
                idx = i
                break
        nxt_spk, nxt_txt = STUDIO_PRESET_LINES[(idx + 1) % len(STUDIO_PRESET_LINES)]
        if nxt_spk == "slot2" and (persistent.studio_slot2_char or "none") == "none":
            nxt_spk = "slot1"
        persistent.studio_speaker = nxt_spk
        persistent.studio_custom_line = nxt_txt
        renpy.save_persistent()
        renpy.sound.play("audio/sfx_page.ogg")

    def studio_cycle_slot1_expr():
        keys = [e for e, _l in STUDIO_EXPR_LIST]
        cur = persistent.studio_slot1_expr or "smile"
        idx = keys.index(cur) if cur in keys else 0
        persistent.studio_slot1_expr = keys[(idx + 1) % len(keys)]
        renpy.save_persistent()
        renpy.sound.play("audio/sfx_click.ogg")

    def studio_swap_slots():
        s2 = persistent.studio_slot2_char or "none"
        if s2 == "none":
            persistent.studio_slot2_char = "alice" if persistent.studio_slot1_char != "alice" else "mc"
            persistent.studio_slot2_expr = "smile"
            persistent.studio_slot2_outfit = "standard"
        else:
            c1, e1, o1 = persistent.studio_slot1_char, persistent.studio_slot1_expr, persistent.studio_slot1_outfit
            persistent.studio_slot1_char = persistent.studio_slot2_char
            persistent.studio_slot1_expr = persistent.studio_slot2_expr
            persistent.studio_slot1_outfit = persistent.studio_slot2_outfit
            persistent.studio_slot2_char = c1
            persistent.studio_slot2_expr = e1
            persistent.studio_slot2_outfit = o1
        renpy.save_persistent()
        renpy.sound.play("audio/sfx_click.ogg")

    def reset_studio_defaults(notify_user=True):
        persistent.studio_bg = "agency"
        persistent.studio_light = "auto"
        persistent.studio_slot1_char = "mo"
        persistent.studio_slot1_expr = "smile"
        persistent.studio_slot1_outfit = "standard"
        persistent.studio_slot2_char = "alice"
        persistent.studio_slot2_expr = "happy"
        persistent.studio_slot2_outfit = "standard"
        persistent.studio_speaker = "slot1_note"
        persistent.studio_custom_line = STUDIO_PRESET_LINES[0][1]
        persistent.studio_show_textbox = True
        persistent.studio_hide_hud = False
        renpy.save_persistent()
        if notify_user:
            renpy.sound.play("audio/sfx_click.ogg")
            renpy.notify("已重置自由剧场舞台配置")

    def snapshot_studio_state():
        return {
            "bg": persistent.studio_bg,
            "light": persistent.studio_light,
            "s1c": persistent.studio_slot1_char,
            "s1e": persistent.studio_slot1_expr,
            "s1o": persistent.studio_slot1_outfit,
            "s2c": persistent.studio_slot2_char,
            "s2e": persistent.studio_slot2_expr,
            "s2o": persistent.studio_slot2_outfit,
            "spk": persistent.studio_speaker,
            "line": persistent.studio_custom_line,
            "tb": persistent.studio_show_textbox,
            "hud": persistent.studio_hide_hud,
        }

    def restore_studio_state(snap):
        if not isinstance(snap, dict):
            return
        persistent.studio_bg = snap.get("bg", "agency")
        persistent.studio_light = snap.get("light", "auto")
        persistent.studio_slot1_char = snap.get("s1c", "mo")
        persistent.studio_slot1_expr = snap.get("s1e", "smile")
        persistent.studio_slot1_outfit = snap.get("s1o", "standard")
        persistent.studio_slot2_char = snap.get("s2c", "alice")
        persistent.studio_slot2_expr = snap.get("s2e", "happy")
        persistent.studio_slot2_outfit = snap.get("s2o", "standard")
        persistent.studio_speaker = snap.get("spk", "slot1_note")
        persistent.studio_custom_line = snap.get("line", STUDIO_PRESET_LINES[0][1])
        persistent.studio_show_textbox = snap.get("tb", True)
        persistent.studio_hide_hud = snap.get("hud", False)


screen extras_studio():
    $ _bg_key = persistent.studio_bg if studio_bg_unlocked(persistent.studio_bg or "agency") else "agency"
    $ _light_key = persistent.studio_light or "auto"
    $ _s1_char = persistent.studio_slot1_char or "mo"
    $ _s1_expr = persistent.studio_slot1_expr or "smile"
    $ _s1_outfit = persistent.studio_slot1_outfit or "standard"
    $ _s2_char = persistent.studio_slot2_char or "none"
    $ _s2_expr = persistent.studio_slot2_expr or "happy"
    $ _s2_outfit = persistent.studio_slot2_outfit or "standard"
    $ _who_lbl, _who_col, _side_img, _is_note, _disp_line, _active_slot = studio_resolved_dialogue()
    $ _dim1 = (_active_slot == 2)
    $ _dim2 = (_active_slot == 1)

    vbox:
        spacing 12

        ## 顶部剧场横幅
        frame:
            style "truth_banner_card"
            hbox:
                xfill True
                yalign 0.5
                spacing 10
                hbox:
                    spacing 10
                    yalign 0.5
                    xsize 458
                    add "images/ui/icon_theater_clapper.png" xysize (30, 30) yalign 0.5
                    vbox:
                        spacing 2
                        text _("自由剧场 · 立绘差分与场景色温摄影棚") style "truth_banner_title" color "#f4d98a"
                        text ("当前舞台：%s · %s（支持 18 角色 × 8 表情差分 × 7 档光效）" % (studio_bg_title(_bg_key), studio_light_title(_light_key))):
                            style "truth_banner_sub"
                            substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    textbutton _("重置舞台"):
                        style "pill_button"
                        xminimum 92
                        ysize 32
                        padding (12, 0)
                        text_size 14
                        action Function(reset_studio_defaults)
                    textbutton _("进入全屏剧场"):
                        style "pill_button"
                        xminimum 124
                        ysize 32
                        padding (14, 0)
                        text_size 14
                        action [SetField(persistent, "studio_hide_hud", False), Show("free_theater_stage")]

        ## 实时微缩舞台监视器（464×261 16:9 画面）+ 右侧快捷导演操作板
        hbox:
            spacing 10
            frame:
                style "studio_monitor_frame"
                button:
                    xsize 464
                    ysize 261
                    padding (0, 0)
                    background None
                    action [SetField(persistent, "studio_hide_hud", False), Show("free_theater_stage")]
                    fixed:
                        xsize 464
                        ysize 261
                        add studio_bg_displayable(_bg_key, _light_key, 464, 261) align (0.5, 0.5)
                        if _light_key == "sunset":
                            add Solid("#ff9d481c") xsize 464 ysize 261
                        elif _light_key == "rain":
                            add Solid("#5e82a822") xsize 464 ysize 261

                        if _s2_char == "none":
                            add studio_sprite_displayable(_s1_char, _s1_expr, _bg_key, _light_key, _s1_outfit, 204, dimmed=False):
                                xalign 0.5
                                yalign 1.0
                        else:
                            add studio_sprite_displayable(_s1_char, _s1_expr, _bg_key, _light_key, _s1_outfit, 204, dimmed=_dim1):
                                xalign 0.22
                                yalign 1.0
                            add studio_sprite_displayable(_s2_char, _s2_expr, _bg_key, _light_key, _s2_outfit, 204, dimmed=_dim2):
                                xalign 0.78
                                yalign 1.0

                        if persistent.studio_show_textbox:
                            frame:
                                xalign 0.5
                                yalign 1.0
                                xsize 464
                                ysize 66
                                padding (12, 6)
                                background "#120c1ee6"
                                vbox:
                                    spacing 2
                                    if _who_lbl:
                                        text _who_lbl size 12 bold True color _who_col substitute False
                                    text _disp_line size 12 color "#f2ecf8" line_spacing 1 substitute False

                        frame:
                            xalign 0.98
                            ypos 6
                            padding (8, 3)
                            background "#0e081acc"
                            text _("点击画面展开 1280×720 剧场") size 11 color "#e8def5"

            frame:
                style "studio_side_ops_card"
                vbox:
                    spacing 7
                    hbox:
                        spacing 6
                        yalign 0.5
                        add "images/ui/icon_theater_clapper.png" xysize (18, 18) yalign 0.5
                        text _("导演快捷控制") font gui.name_text_font size 16 color "#f2e6ff"
                    textbutton _("全屏剧场预览"):
                        style "pill_button"
                        xfill True
                        ysize 34
                        text_size 14
                        action [SetField(persistent, "studio_hide_hud", False), Show("free_theater_stage")]
                    textbutton _("纯净无字取景"):
                        style "pill_button"
                        xfill True
                        ysize 34
                        text_size 14
                        action [SetField(persistent, "studio_show_textbox", False), SetField(persistent, "studio_hide_hud", True), Show("free_theater_stage")]
                    textbutton _("互换左右站位"):
                        style "pill_button"
                        xfill True
                        ysize 32
                        text_size 14
                        action Function(studio_swap_slots)
                    textbutton (_("台词窗：显示中") if persistent.studio_show_textbox else _("台词窗：已隐藏")):
                        style "pill_button"
                        xfill True
                        ysize 32
                        text_size 14
                        selected bool(persistent.studio_show_textbox)
                        action ToggleField(persistent, "studio_show_textbox")
                    textbutton _("切换经典台词"):
                        style "pill_button"
                        xfill True
                        ysize 32
                        text_size 14
                        action Function(studio_cycle_preset_line)
                    textbutton _("自定义台词输入"):
                        style "pill_button"
                        xfill True
                        ysize 32
                        text_size 14
                        action Show("studio_line_input_modal")

        ## 1. lighting.rpy 色温与环境光预设
        frame:
            style "studio_group_card"
            vbox:
                spacing 8
                hbox:
                    spacing 8
                    yalign 0.5
                    add "images/ui/icon_lighting_lamp.png" xysize (20, 20) yalign 0.5
                    text _("环境色温预设（联动 lighting.rpy 立绘受光矩阵）") style "dossier_sec_title" color "#f4d98a"
                hbox:
                    spacing 6
                    for l_key, l_title, _l_desc in STUDIO_LIGHT_PRESETS:
                        textbutton l_title:
                            style "studio_opt_pill"
                            selected (_light_key == l_key)
                            action SetField(persistent, "studio_light", l_key)

        ## 2. 舞台背景选择（4 列网格）
        frame:
            style "studio_group_card"
            vbox:
                spacing 8
                text _("舞台场景选择（已解锁 / 可用背景）") style "dossier_sec_title" color "#cbb0e6"
                grid 4 4:
                    spacing 6
                    for b_key, b_title, _b_sub, _req_c in STUDIO_BG_LIST:
                        $ _b_ok = studio_bg_unlocked(b_key)
                        if _b_ok:
                            textbutton b_title:
                                style "studio_bg_pill"
                                selected (_bg_key == b_key)
                                action SetField(persistent, "studio_bg", b_key)
                        else:
                            textbutton (b_title + "（待解锁）"):
                                style "studio_bg_pill"
                                action Notify("推进至对应章节或通关真结局后解锁该场景")

        ## 3. 一号位角色 + 表情差分 + 装扮色调差分
        frame:
            style "studio_group_card"
            vbox:
                spacing 8
                text _("一号位角色（左 / 单人居中）· 角色与表情/装扮差分") style "dossier_sec_title" color "#cfa6f0"
                grid 6 3:
                    spacing 5
                    for c_key, c_name, _c_col in STUDIO_CHARA_LIST:
                        textbutton c_name:
                            style "studio_chara_pill"
                            selected (_s1_char == c_key)
                            action SetField(persistent, "studio_slot1_char", c_key)
                hbox:
                    spacing 6
                    yalign 0.5
                    text _("表情差分：") size 13 color "#9a86b8" yalign 0.5
                    for e_key, e_lbl in STUDIO_EXPR_LIST:
                        textbutton e_lbl:
                            style "studio_expr_pill"
                            selected (_s1_expr == e_key)
                            action SetField(persistent, "studio_slot1_expr", e_key)
                hbox:
                    spacing 6
                    yalign 0.5
                    text _("装扮景别：") size 13 color "#9a86b8" yalign 0.5
                    for o_key, o_lbl in STUDIO_OUTFIT_LIST:
                        textbutton o_lbl:
                            style "studio_opt_pill"
                            selected (_s1_outfit == o_key)
                            action SetField(persistent, "studio_slot1_outfit", o_key)

        ## 4. 二号位角色（可设单人独白）+ 表情差分 + 装扮色调差分
        frame:
            style "studio_group_card"
            vbox:
                spacing 8
                hbox:
                    xfill True
                    yalign 0.5
                    text _("二号位搭档（右侧站位 · 可选单人或双人同台）") style "dossier_sec_title" color "#8cc0e6"
                    textbutton _("设为单人舞台（隐藏二号位）"):
                        style "studio_opt_pill"
                        xalign 1.0
                        selected (_s2_char == "none")
                        action SetField(persistent, "studio_slot2_char", "none")
                grid 6 3:
                    spacing 5
                    for c_key, c_name, _c_col in STUDIO_CHARA_LIST:
                        textbutton c_name:
                            style "studio_chara_pill"
                            selected (_s2_char == c_key)
                            action SetField(persistent, "studio_slot2_char", c_key)
                if _s2_char != "none":
                    hbox:
                        spacing 6
                        yalign 0.5
                        text _("表情差分：") size 13 color "#9a86b8" yalign 0.5
                        for e_key, e_lbl in STUDIO_EXPR_LIST:
                            textbutton e_lbl:
                                style "studio_expr_pill"
                                selected (_s2_expr == e_key)
                                action SetField(persistent, "studio_slot2_expr", e_key)
                    hbox:
                        spacing 6
                        yalign 0.5
                        text _("装扮景别：") size 13 color "#9a86b8" yalign 0.5
                        for o_key, o_lbl in STUDIO_OUTFIT_LIST:
                            textbutton o_lbl:
                                style "studio_opt_pill"
                                selected (_s2_outfit == o_key)
                                action SetField(persistent, "studio_slot2_outfit", o_key)

        ## 5. 预览台词与说话人焦点设置
        frame:
            style "studio_group_card"
            vbox:
                spacing 8
                hbox:
                    xfill True
                    yalign 0.5
                    text _("预览台词与说话人聚光焦点") style "dossier_sec_title" color "#f0c060"
                    hbox:
                        xalign 1.0
                        spacing 6
                        textbutton _("下一句预设"):
                            style "studio_opt_pill"
                            action Function(studio_cycle_preset_line)
                        textbutton _("编辑台词"):
                            style "studio_opt_pill"
                            action Show("studio_line_input_modal")
                hbox:
                    spacing 6
                    for spk_key, spk_lbl in STUDIO_SPEAKER_MODES:
                        textbutton spk_lbl:
                            style "studio_opt_pill"
                            selected ((persistent.studio_speaker or "slot1_note") == spk_key)
                            action SetField(persistent, "studio_speaker", spk_key)
                frame:
                    xfill True
                    padding (12, 8)
                    background "#120c1ecc"
                    text _disp_line size 15 color "#f2ecf8" substitute False


## 全屏 1280×720 自由剧场舞台（支持原版对话框预览 + 一键隐藏全部 HUD 纯净取景）
screen free_theater_stage():
    modal True
    zorder 215

    $ _bg_key = persistent.studio_bg if studio_bg_unlocked(persistent.studio_bg or "agency") else "agency"
    $ _light_key = persistent.studio_light or "auto"
    $ _s1_char = persistent.studio_slot1_char or "mo"
    $ _s1_expr = persistent.studio_slot1_expr or "smile"
    $ _s1_outfit = persistent.studio_slot1_outfit or "standard"
    $ _s2_char = persistent.studio_slot2_char or "none"
    $ _s2_expr = persistent.studio_slot2_expr or "happy"
    $ _s2_outfit = persistent.studio_slot2_outfit or "standard"
    $ _who_lbl, _who_col, _side_img, _is_note, _disp_line, _active_slot = studio_resolved_dialogue()
    $ _dim1 = (_active_slot == 2)
    $ _dim2 = (_active_slot == 1)
    $ _hud_hidden = bool(persistent.studio_hide_hud)

    key "game_menu" action [SetField(persistent, "studio_hide_hud", False), Hide("free_theater_stage")]
    key "K_ESCAPE" action [SetField(persistent, "studio_hide_hud", False), Hide("free_theater_stage")]
    key "K_h" action ToggleField(persistent, "studio_hide_hud")

    ## 1. 全画幅 1280×720 背景与氛围滤镜
    add studio_bg_displayable(_bg_key, _light_key, 1280, 720) align (0.5, 0.5)
    if _light_key == "sunset":
        add Solid("#f498481c") xsize 1280 ysize 720
        add Solid("#ffdca8") xysize (3, 3) at hud_mote_drift(280, 460, 150, 5.4, 0.0)
        add Solid("#f4c488") xysize (4, 4) at hud_mote_drift(860, 440, 160, 6.1, 1.1)
    elif _light_key == "night":
        add Solid("#09102838") xsize 1280 ysize 720
    elif _light_key == "rain":
        add Solid("#48688826") xsize 1280 ysize 720
    elif _light_key == "noir":
        add Solid("#07040e66") xsize 1280 ysize 36 yalign 0.0
        add Solid("#07040e66") xsize 1280 ysize 36 yalign 1.0

    ## 2. 舞台立绘层（带自然呼吸微动与 lighting.rpy 受光染色）
    if _s2_char == "none":
        add At(studio_sprite_displayable(_s1_char, _s1_expr, _bg_key, _light_key, _s1_outfit, _SPRITE_TARGET_H, dimmed=False), sprite_breathe):
            xalign 0.5
            yalign 1.0
    else:
        add At(studio_sprite_displayable(_s1_char, _s1_expr, _bg_key, _light_key, _s1_outfit, _SPRITE_TARGET_H, dimmed=_dim1), sprite_breathe):
            xalign 0.20
            yalign 1.0
        add At(studio_sprite_displayable(_s2_char, _s2_expr, _bg_key, _light_key, _s2_outfit, _SPRITE_TARGET_H, dimmed=_dim2), sprite_breathe):
            xalign 0.80
            yalign 1.0

    ## 纯净构图模式下点击画面任意处即可唤回导演控制栏
    if _hud_hidden:
        button:
            xfill True
            yfill True
            background None
            action SetField(persistent, "studio_hide_hud", False)

    ## 3. 原生样式预览对话框与牛皮纸笔记卡
    if persistent.studio_show_textbox:
        if _is_note:
            frame:
                style "mo_note_card_frame"
                vbox:
                    spacing 6
                    hbox:
                        xfill True
                        text _("NOTEBOOK · 自由剧场手写便签") style "mo_note_card_kicker"
                    add Solid("#a6845866") xsize 476 ysize 1
                    text _disp_line.strip("「」") style "mo_note_card_text" substitute False
                    add Solid("#a6845838") xsize 476 ysize 1

        window:
            style "window"
            if _who_lbl is not None:
                window:
                    style "namebox"
                    text _who_lbl style "say_label" color _who_col substitute False
            text _disp_line style "say_dialogue" substitute False

        if _side_img is not None and not renpy.variant("small"):
            add _side_img xpos 155 ypos 613 anchor (0.5, 0.5)

    ## 4. 顶部可隐藏导演控制浮栏（按 H 或点击「纯净构图」彻底隐藏一切 UI）
    if not _hud_hidden:
        frame:
            xalign 0.5
            ypos 12
            xsize 1236
            padding (16, 7)
            background Frame("gui/hud_chip.png", 12, 12)
            vbox:
                spacing 5
                xfill True
                hbox:
                    xfill True
                    yalign 0.5
                    spacing 10
                    hbox:
                        spacing 8
                        yalign 0.5
                        add "images/ui/icon_theater_clapper.png" xysize (22, 22) yalign 0.5
                        text ("自由剧场 · %s · %s" % (studio_bg_title(_bg_key), studio_light_title(_light_key))):
                            font gui.name_text_font
                            size 17
                            color "#f2e6ff"
                            yalign 0.5
                            substitute False
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 6
                        textbutton _("换表情"):
                            style "studio_stage_top_pill"
                            action Function(studio_cycle_slot1_expr)
                        textbutton _("互换站位"):
                            style "studio_stage_top_pill"
                            action Function(studio_swap_slots)
                        textbutton _("换台词"):
                            style "studio_stage_top_pill"
                            action Function(studio_cycle_preset_line)
                        textbutton _("编辑台词"):
                            style "studio_stage_top_pill"
                            action Show("studio_line_input_modal")
                        textbutton (_("隐台词框") if persistent.studio_show_textbox else _("显台词框")):
                            style "studio_stage_top_pill"
                            action ToggleField(persistent, "studio_show_textbox")
                        textbutton _("纯净构图 (H)"):
                            style "studio_stage_top_pill"
                            action SetField(persistent, "studio_hide_hud", True)
                        textbutton _("返回鉴赏"):
                            style "studio_stage_top_pill"
                            action [SetField(persistent, "studio_hide_hud", False), Hide("free_theater_stage")]
                hbox:
                    spacing 6
                    yalign 0.5
                    add "images/ui/icon_lighting_lamp.png" xysize (18, 18) yalign 0.5
                    text _("色温滤镜：") size 13 color "#cbb0e6" yalign 0.5
                    for l_key, l_title, _l_desc in STUDIO_LIGHT_PRESETS:
                        textbutton l_title:
                            style "studio_stage_top_pill"
                            selected (_light_key == l_key)
                            action SetField(persistent, "studio_light", l_key)


## 自定义预览台词输入弹窗
screen studio_line_input_modal():
    modal True
    zorder 230
    default line_input_val = FieldInputValue(persistent, "studio_custom_line", default=True, returnable=False)

    add "#06030cd8"
    key "game_menu" action [Function(renpy.save_persistent), Hide("studio_line_input_modal")]
    key "K_ESCAPE" action [Function(renpy.save_persistent), Hide("studio_line_input_modal")]
    key "K_RETURN" action [Function(renpy.save_persistent), Hide("studio_line_input_modal")]

    frame:
        xalign 0.5
        yalign 0.5
        xsize 680
        padding (32, 26)
        background Frame("gui/panel_dark.png", 26, 26)
        vbox:
            spacing 14
            xfill True
            hbox:
                spacing 10
                yalign 0.5
                add "images/ui/icon_theater_clapper.png" xysize (26, 26) yalign 0.5
                text _("编辑自由剧场预览台词") font gui.name_text_font size 22 color "#f2e6ff"
            text _("可直接键盘输入台词文本，或点击下方经典句式一键填入：") size 14 color "#a892c2"
            frame:
                xfill True
                ysize 58
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                input:
                    value line_input_val
                    size 18
                    color "#ffffff"
                    xmaximum 590
                    yalign 0.5
            hbox:
                spacing 8
                for idx, (p_spk, p_line) in enumerate(STUDIO_PRESET_LINES):
                    textbutton ("预设 %d" % (idx + 1)):
                        style "studio_opt_pill"
                        action [SetField(persistent, "studio_speaker", p_spk), SetField(persistent, "studio_custom_line", p_line)]
            hbox:
                xalign 1.0
                spacing 10
                textbutton _("清空重填"):
                    style "pill_button"
                    xminimum 108
                    ysize 36
                    text_size 15
                    action SetField(persistent, "studio_custom_line", "")
                textbutton _("完成"):
                    style "confirm_yes_button"
                    xminimum 118
                    ysize 36
                    text_size 16
                    action [Function(renpy.save_persistent), Hide("studio_line_input_modal")]


style studio_monitor_frame is default:
    xsize 476
    ysize 273
    padding (6, 6)
    background Frame("gui/panel_card.png", 16, 16)

style studio_side_ops_card is default:
    xsize 236
    ysize 273
    padding (12, 10)
    background Frame("gui/panel_card.png", 16, 16)

style studio_group_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style studio_opt_pill is pill_button:
    xminimum 80
    ysize 30
    padding (10, 0)
style studio_opt_pill_text is pill_button_text:
    size 13

style studio_bg_pill is pill_button:
    xsize 164
    ysize 32
    padding (8, 0)
style studio_bg_pill_text is pill_button_text:
    size 13

style studio_chara_pill is pill_button:
    xsize 108
    ysize 30
    padding (6, 0)
style studio_chara_pill_text is pill_button_text:
    size 13

style studio_expr_pill is pill_button:
    xminimum 62
    ysize 28
    padding (8, 0)
style studio_expr_pill_text is pill_button_text:
    size 13

style studio_stage_top_pill is pill_button:
    xminimum 64
    ysize 30
    padding (9, 0)
style studio_stage_top_pill_text is pill_button_text:
    size 13


################################################################################
## ---- 分页 5（PC-5）：校园推理社委托信箱（可重玩短案卷）----
################################################################################

init python:
    MAILBOX_RATING_RANK = {
        "": 0,
        "完美结案": 1,
        "一击破局": 2,
    }

    MAILBOX_CASE_DEFS = [
        {
            "id": "m1",
            "code": "CASE M-01",
            "label": "mailbox_case_m1",
            "title": "图书馆消失的借书卡",
            "subtitle": "时间戳盲区 · 不在场证明矛盾",
            "client": "图书委员 · 林依依",
            "difficulty": "二星 · 时间线与门禁",
            "bg_thumb": "bg library",
            "lighting_note": "闭馆斜阳与阅览室冷白台灯（library / library_office）",
            "summary": "闭馆前半小时，古籍架《云溪县志·钟塔卷》封底的借书卡不翼而飞。纸质登记簿上的入室时刻看似严丝合缝，却在五点整调拨的紫色回墨日期章与红外门禁流水前露出了十一分钟的真空。",
            "clues_preview": "4 项现场证物翻面批注 · 1 组双线索逻辑拼合 · 1 场终局三选一矛盾指证",
        },
        {
            "id": "m2",
            "code": "CASE M-02",
            "label": "mailbox_case_m2",
            "title": "美术室未干的群青颜料",
            "subtitle": "物理痕迹 · 夕照色温视觉诡计",
            "client": "文学社代表 · 吕芙",
            "difficulty": "三星 · 光学色温与物证",
            "bg_thumb": "bg sunset",
            "lighting_note": "西晒浓橙夕阳与北窗冷白日光对比（sunset / classroom）",
            "summary": "文化祭终审前夕，文学社参赛海报白衬边多了一道湿润的群青擦痕。被拦在夕阳走廊里的嫌疑人指着自己袖口那道『暗紫灰炭粉印』大呼冤枉——直到墨墨拉开了遮光窗帘。",
            "clues_preview": "4 项现场证物翻面批注 · 色温切换现场验证 · 双线索拼合与缓干剂矛盾对决",
        },
        {
            "id": "m3",
            "code": "CASE M-03",
            "label": "mailbox_case_m3",
            "title": "钟楼午休的第七声回响",
            "subtitle": "声学延迟 · 作息时刻表诡计",
            "client": "桌游社社长 · 高社长",
            "difficulty": "三星 · 声速差与广播重影",
            "bg_thumb": "bg rooftop",
            "lighting_note": "正午晴空天台与礼堂东廊暖阴（rooftop / clubroom / hall）",
            "summary": "十二点半的报时铜钟机械凸轮只有六齿，本该只敲六响；然而干事提交的『天台不在场录音』里却录进了诡异的第七声钟鸣，与此同时一楼储物柜里的纪念徽章盒被人动过。",
            "clues_preview": "4 项现场证物翻面批注 · 波形间隔与 380 米声速推演 · 双线索拼合与终局指证",
        },
    ]

    def mailbox_get_case_def(case_id):
        for c in MAILBOX_CASE_DEFS:
            if c["id"] == case_id:
                return c
        return MAILBOX_CASE_DEFS[0]

    def mailbox_get_case_record(case_id):
        raw = getattr(persistent, "mailbox_cases", None)
        if not isinstance(raw, dict):
            raw = {}
            persistent.mailbox_cases = raw
        entry = raw.get(case_id)
        if not isinstance(entry, dict):
            return {
                "solved": False,
                "best_rating": "",
                "last_rating": "",
                "replays": 0,
                "best_mistakes": -1,
            }
        return {
            "solved": bool(entry.get("solved", False)),
            "best_rating": str(entry.get("best_rating", "") or ""),
            "last_rating": str(entry.get("last_rating", "") or ""),
            "replays": int(entry.get("replays", 0) or 0),
            "best_mistakes": int(entry.get("best_mistakes", -1) if entry.get("best_mistakes") is not None else -1),
        }

    def mailbox_solved_count():
        return sum(1 for c in MAILBOX_CASE_DEFS if mailbox_get_case_record(c["id"])["solved"])

    def mailbox_perfect_count():
        return sum(1 for c in MAILBOX_CASE_DEFS if mailbox_get_case_record(c["id"])["best_rating"] == "一击破局")

    def mailbox_total_replays():
        return sum(mailbox_get_case_record(c["id"])["replays"] for c in MAILBOX_CASE_DEFS)

    def mailbox_record_case_clear(case_id, mistakes_count=0):
        """记录短案卷通关状态、最佳推理评级（一击破局 / 完美结案）与累计重玩次数，并在三案全破时授予纪念成就。"""
        mistakes = max(0, int(mistakes_count or 0))
        cur_rating = "一击破局" if mistakes == 0 else "完美结案"
        raw = getattr(persistent, "mailbox_cases", None)
        if not isinstance(raw, dict):
            raw = {}
        prev = mailbox_get_case_record(case_id)
        prev_best = prev["best_rating"]
        if MAILBOX_RATING_RANK.get(cur_rating, 0) >= MAILBOX_RATING_RANK.get(prev_best, 0):
            new_best = cur_rating
        else:
            new_best = prev_best
        prev_m = prev["best_mistakes"]
        new_best_m = mistakes if (prev_m < 0 or mistakes < prev_m) else prev_m
        updated = {
            "solved": True,
            "best_rating": new_best,
            "last_rating": cur_rating,
            "replays": prev["replays"] + 1,
            "best_mistakes": new_best_m,
        }
        new_map = dict(raw)
        new_map[case_id] = updated
        persistent.mailbox_cases = new_map
        persistent.mailbox_selected_case = case_id
        renpy.save_persistent()
        if mailbox_solved_count() >= len(MAILBOX_CASE_DEFS):
            ach_grant("ach_mailbox")
        return updated

    def mailbox_launch_action(case_id):
        cdef = mailbox_get_case_def(case_id)
        return [
            SetField(persistent, "mailbox_selected_case", cdef["id"]),
            SetField(persistent, "extras_tab", "mailbox"),
            Function(stop_all_gramophone_ambience, True),
            Replay(cdef["label"], scope={"player_name": persistent.last_player_name or "陈默"}, locked=False),
        ]

screen extras_mailbox():
    $ _sel_id = persistent.mailbox_selected_case or "m1"
    $ _sel = mailbox_get_case_def(_sel_id)
    $ _sel_rec = mailbox_get_case_record(_sel["id"])
    $ _solved_n = mailbox_solved_count()
    $ _perfect_n = mailbox_perfect_count()
    $ _replays_n = mailbox_total_replays()

    vbox:
        spacing 10

        ## 1. 信箱总览横幅
        frame:
            style "mailbox_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 12
                    yalign 0.5
                    add "images/ui/icon_club_mailbox.png" xysize (34, 34) yalign 0.5
                    vbox:
                        spacing 2
                        yalign 0.5
                        text _("校园推理社 · 委托信箱") font gui.name_text_font size 20 color "#f6e7c0"
                        text _("可随时重玩的轻量推理短卷 · 独立沙盒，绝不覆盖主线存档与好感") size 12 color "#b9a6d4" xmaximum 410
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 8
                    frame:
                        style "mailbox_stat_chip"
                        text ("已结案 %d/%d" % (_solved_n, len(MAILBOX_CASE_DEFS))) size 12 color "#f2e6ff" align (0.5, 0.5)
                    frame:
                        style "mailbox_stat_chip"
                        text ("一击破局 %d/%d" % (_perfect_n, len(MAILBOX_CASE_DEFS))) size 12 color "#f4d98a" align (0.5, 0.5)

        ## 2. 三封委托卷宗切换卡（3 × 234 + 2 × 10 = 722px 严丝合缝）
        hbox:
            spacing 10
            for citem in MAILBOX_CASE_DEFS:
                $ _crec = mailbox_get_case_record(citem["id"])
                $ _is_sel = (citem["id"] == _sel["id"])
                button:
                    style "mailbox_tab_card"
                    selected _is_sel
                    action SetField(persistent, "mailbox_selected_case", citem["id"])
                    vbox:
                        spacing 3
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            text citem["code"] size 12 color ("#f4d98a" if _is_sel else "#a892c2") bold True yalign 0.5
                            if _crec["solved"]:
                                hbox:
                                    xalign 1.0
                                    yalign 0.5
                                    spacing 4
                                    add "images/ui/icon_dossier_stamp.png" xysize (15, 15) yalign 0.5
                                    text _crec["best_rating"] size 11 color ("#f4d98a" if _crec["best_rating"] == "一击破局" else "#86efac") bold True yalign 0.5
                            else:
                                text _("待拆封") size 11 color "#7e6d99" xalign 1.0 yalign 0.5
                        text citem["title"] font gui.name_text_font size 15 color "#f2e6ff"
                        text citem["subtitle"] size 11 color "#9a86b8"

        ## 3. 当前选中卷宗详情档案台
        frame:
            style "mailbox_detail_card"
            vbox:
                spacing 9
                xfill True
                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add _sel["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        if _sel_rec["solved"]:
                            add "images/ui/icon_dossier_stamp.png" xysize (26, 26) xalign 0.96 yalign 0.08
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text _sel["code"] size 12 color "#ffffff" bold True align (0.5, 0.5)
                            text ("《%s》" % _sel["title"]) font gui.name_text_font size 20 color "#f6e7c0" yalign 0.5
                        text ("委托人：%s    ·    难度：%s" % (_sel["client"], _sel["difficulty"])) size 13 color "#cbb0e6"
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (16, 16) yalign 0.5
                            text ("现场光影：%s" % _sel["lighting_note"]) size 12 color "#a892c2" yalign 0.5
                        if _sel_rec["solved"]:
                            text ("结案记录：最佳评级【%s】  ·  已重温 %d 次" % (_sel_rec["best_rating"], _sel_rec["replays"])) size 13 color ("#f4d98a" if _sel_rec["best_rating"] == "一击破局" else "#86efac")
                        else:
                            text _("结案记录：尚未拆封（零失误完成拼合与指证可获【一击破局】印章）") size 13 color "#8a7aa0"

                frame:
                    xfill True
                    padding (12, 8)
                    background Frame("gui/hud_chip.png", 12, 12)
                    vbox:
                        spacing 4
                        text _sel["summary"] size 14 color "#ebe2f8" line_spacing 3
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_crane_bookmark.png" xysize (15, 15) yalign 0.5
                            text _sel["clues_preview"] size 12 color "#f4d98a" yalign 0.5

                hbox:
                    xfill True
                    yalign 0.5
                    text ("累计查案总次数：%d 次  ·  三案全破可解锁纪念成就「信箱里的回音」" % _replays_n) size 12 color "#9a86b8" yalign 0.5
                    textbutton (_("重温卷宗") if _sel_rec["solved"] else _("拆封查案")):
                        style "pill_button"
                        xalign 1.0
                        yalign 0.5
                        xminimum 142
                        ysize 38
                        text_size 16
                        action mailbox_launch_action(_sel["id"])

        ## 4. 全部三封卷宗速览与直达列表
        for citem in MAILBOX_CASE_DEFS:
            $ _r = mailbox_get_case_record(citem["id"])
            frame:
                style "mailbox_quick_row"
                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 10
                        yalign 0.5
                        add ("images/ui/icon_dossier_stamp.png" if _r["solved"] else "images/ui/icon_club_mailbox.png") xysize (20, 20) yalign 0.5
                        text ("%s · %s" % (citem["code"], citem["title"])) font gui.name_text_font size 15 color "#f2e6ff" yalign 0.5
                        text ("（%s）" % (_r["best_rating"] + " · %d次" % _r["replays"] if _r["solved"] else "未结案")) size 12 color ("#f4d98a" if _r["best_rating"] == "一击破局" else ("#86efac" if _r["solved"] else "#7e6d99")) yalign 0.5
                    textbutton (_("再次查案") if _r["solved"] else _("立即查案")):
                        style "gramophone_mini_pill"
                        xalign 1.0
                        yalign 0.5
                        action mailbox_launch_action(citem["id"])

style mailbox_header_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style mailbox_stat_chip is default:
    xminimum 96
    ysize 28
    padding (10, 0)
    background Frame("gui/hud_chip.png", 12, 12)

style mailbox_tab_card is default:
    xsize 234
    ysize 76
    padding (10, 8)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style mailbox_detail_card is default:
    xfill True
    padding (14, 12)
    background Frame("gui/panel_card.png", 16, 16)

style mailbox_thumb_frame is default:
    xsize 184
    ysize 100
    padding (2, 2)
    background "#0e0a18"

style mailbox_code_badge is default:
    xsize 86
    ysize 24
    padding (0, 0)
    background Frame("gui/pill_selected.png", 18, 18)

style mailbox_quick_row is default:
    xfill True
    ysize 42
    padding (12, 5)
    background Frame("gui/panel_card.png", 16, 16)
