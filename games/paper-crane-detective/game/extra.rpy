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

    # 结局 label -> 成就 id
    _ENDING_TO_ACH = {
        "ending_te":     "ach_te",
        "ending_he":     "ach_he",
        "ending_ne":     "ach_ne",
        "ending_be":     "ach_be",
        "ending_hidden": "ach_hidden",
    }

    def _progress_label_callback(name, abnormal):
        # 从标题"开始游戏"进来的完整周目（章节选择 / 重温结局不会经过 start）
        if name == "start":
            store.full_run = True
            store.current_chapter_label = "prologue"
        # 记录当前所在章节/番外/结局入口 label，供折纸书签跳转定位
        if name in _LABEL_TO_CHAPTER or name in _LABEL_TO_ENDING or name in _DLC_LABELS:
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

init python:
    EXTRAS_TABS = [
        ("endings",   "结局"),
        ("cg",        "画廊"),
        ("music",     "音乐室"),
        ("ach",       "成就"),
        ("truth",     "真相档案"),
        ("bookmarks", "折纸书签"),
    ]

    def extras_count_text():
        """主菜单按钮上的总进度：结局 + CG + 成就 的已解锁数 / 总数"""
        got = (sum(1 for e in ENDING_LIST if getattr(persistent, e[0], False))
               + cg_unlocked_count() + ach_count())
        total = len(ENDING_LIST) + len(CG_LIST) + len(ACH_LIST)
        return "(%d/%d)" % (got, total)

    def reset_all_progress():
        """一键清空全部存档、已解锁 CG、结局、章节、成就与折纸书签，恢复全新初始状态"""
        persistent.chapter_reached = 0
        persistent.te_cleared = False
        persistent.truth_spoiler_confirmed = False
        persistent.quote_bookmarks = []
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

    ## 离开鉴赏页时把主菜单主题曲接回来（音乐室可能换过曲子）
    on "hide" action Play("music", config.main_menu_music, fadein=1.0, if_changed=True)
    on "replaced" action Play("music", config.main_menu_music, fadein=1.0, if_changed=True)

    use game_menu(_("鉴赏"), subtitle=_("结局 · 画廊 · 音乐室 · 成就 · 真相 · 书签")):

        vbox:
            spacing 14
            hbox:
                spacing 8
                for key, label in EXTRAS_TABS:
                    textbutton label:
                        style "extras_tab_button"
                        at pill_hover_fx
                        selected (cur == key)
                        action SetField(persistent, "extras_tab", key)
            viewport:
                ysize 486
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
                    elif cur == "truth":
                        use extras_truth
                    elif cur == "bookmarks":
                        use extras_bookmarks
                    else:
                        use extras_endings

style extras_tab_button is pill_button:
    xminimum 96
    ysize 38
    padding (14, 0)
style extras_tab_button_text is pill_button_text:
    size 18

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


## ---- 分页 3：音乐室（Ren'Py 自带 MusicRoom：曲子在剧情里播放过即解锁）----
init python:
    # (文件, 曲名, 出处)
    BGM_LIST = [
        ("audio/theme_main.ogg",     "千纸鹤的约定",   "主题曲 · 标题画面"),
        ("audio/prologue_calm.ogg",  "图书馆的午后",   "序章 · 宁静悬疑"),
        ("audio/suspense_light.ogg", "代价簿",         "日常推理"),
        ("audio/mystery_tense.ogg",  "密室",           "紧张推理 · 恐吓信"),
        ("audio/daily_morning.ogg",  "早读",           "日常清晨 · 教室"),
        ("audio/warm_piano.ogg",     "路灯下",         "温暖钢琴 · 送她回家"),
        ("audio/storm_coming.ogg",   "不要找我",       "暴风前夜 · 第五章"),
        ("audio/confrontation.ogg",  "旧仓库",         "终章 · 对峙"),
        ("audio/true_ending.ogg",    "重新发声",       "TRUE END"),
        ("audio/good_ending.ogg",    "无言的心意",     "GOOD END"),
        ("audio/normal_ending.ogg",  "洗清的冤屈",     "NORMAL END"),
        ("audio/bad_ending.ogg",     "迟来的真相",     "BAD END"),
        ("audio/hidden_ending.ogg",  "第二只千纸鹤",   "HIDDEN END"),
    ]

    music_room = MusicRoom(fadeout=1.0, loop=True, single_track=False, shuffle=False)
    for _fn, _t, _s in BGM_LIST:
        music_room.add(_fn, always_unlocked=(_fn == "audio/theme_main.ogg"))

    def bgm_unlocked_count():
        return sum(1 for b in BGM_LIST if music_room.is_unlocked(b[0]))

screen extras_music():
    $ _now = renpy.music.get_playing()
    vbox:
        spacing 12
        hbox:
            xfill True
            text "已解锁 %d / %d" % (bgm_unlocked_count(), len(BGM_LIST)) style "extras_section_text" yalign 0.5
            hbox:
                xalign 1.0
                spacing 8
                textbutton _("上一曲") style "pill_button" action music_room.Previous()
                textbutton _("下一曲") style "pill_button" action music_room.Next()
                textbutton _("停止") style "pill_button" action music_room.Stop()
        for fn, title, src in BGM_LIST:
            $ unlocked = music_room.is_unlocked(fn)
            $ playing = (_now == fn)
            if unlocked:
                button:
                    style "music_row"
                    selected playing
                    action music_room.Play(fn)
                    hover_sound "audio/sfx_hover.ogg"
                    ## 固定列位：图标 0 / 曲名 40 / 出处 280 / 播放中 靠右
                    fixed:
                        xfill True
                        ysize 32
                        add "gui/icon_music.png" xpos 4 yalign 0.5 alpha (1.0 if playing else 0.55)
                        text title style "music_title" xpos 40 yalign 0.5
                        text src style "music_src" xpos 280 yalign 0.5
                        if playing:
                            text _("播放中") style "music_now" xalign 1.0 yalign 0.5
            else:
                frame:
                    style "music_row_locked"
                    fixed:
                        xfill True
                        ysize 32
                        add "gui/icon_music.png" xpos 4 yalign 0.5 alpha 0.25
                        text _("？？？") style "music_title_locked" xpos 40 yalign 0.5
                        text _("在剧情中听到后解锁") style "music_src_locked" xpos 280 yalign 0.5

style music_row is default:
    xfill True
    ysize 46
    padding (14, 6)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
style music_row_locked is music_row

style music_title is text:
    font gui.name_text_font
    size 19
    color "#f2e6ff"
style music_src is text:
    size 15
    color "#9a86b8"
style music_now is text:
    size 15
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
        if lbl in _LABEL_TO_ENDING:
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
