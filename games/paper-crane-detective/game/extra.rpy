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
## 四、鉴赏（Extras）总页：结局 / 画廊 / 音乐室 / 成就 四个分页共用一张菜单页
##   分页状态存在 persistent.extras_tab，下次打开回到上次看的分页
################################################################################

default persistent.extras_tab = "endings"

init python:
    EXTRAS_TABS = [
        ("endings", "结局"),
        ("cg",      "画廊"),
        ("music",   "音乐室"),
        ("ach",     "成就"),
    ]

    def extras_count_text():
        """主菜单按钮上的总进度：结局 + CG + 成就 的已解锁数 / 总数"""
        got = (sum(1 for e in ENDING_LIST if getattr(persistent, e[0], False))
               + cg_unlocked_count() + ach_count())
        total = len(ENDING_LIST) + len(CG_LIST) + len(ACH_LIST)
        return "(%d/%d)" % (got, total)

    def reset_all_progress():
        """一键清空全部存档、已解锁 CG、结局、章节与成就，恢复全新初始状态"""
        persistent.chapter_reached = 0
        persistent.te_cleared = False
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
        renpy.notify("已恢复初始状态：存档、CG、结局与成就已全部清空")

screen extras():
    tag menu

    ## 想直接打开某一分页：[SetField(persistent, "extras_tab", "cg"), ShowMenu("extras")]
    $ cur = persistent.extras_tab or "endings"

    ## 离开鉴赏页时把主菜单主题曲接回来（音乐室可能换过曲子）
    on "hide" action Play("music", config.main_menu_music, fadein=1.0, if_changed=True)
    on "replaced" action Play("music", config.main_menu_music, fadein=1.0, if_changed=True)

    use game_menu(_("鉴赏"), subtitle=_("结局 · 画廊 · 音乐室 · 成就")):

        vbox:
            spacing 14
            hbox:
                spacing 10
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
                    else:
                        use extras_achievements

style extras_tab_button is pill_button:
    xminimum 120
    ysize 38
style extras_tab_button_text is pill_button_text:
    size 19

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
