## 《沉默侦探：千纸鹤的约定》—— 推理玩法系统
## gameplay.rpy
## 提供：线索栏显示、羁绊/好感可视化、调查取证、质询对峙等可复用机制

################################################################################
## 羁绊（好感度）展示辅助函数
################################################################################

init python:
    def mo_bond_title(v):
        """根据墨墨好感度返回阶段称谓（恋爱线的可视化反馈）"""
        if v >= 80:
            return "心意相通"
        elif v >= 60:
            return "无话不谈"
        elif v >= 40:
            return "渐生信赖"
        elif v >= 20:
            return "略有好感"
        elif v >= 1:
            return "陌生的搭档"
        return "初次相遇"


################################################################################
## 线索栏 + 羁绊 HUD —— 随时可调出查看
################################################################################

transform hud_fade:
    on show:
        alpha 0.0
        linear 0.3 alpha 1.0
    on hide:
        linear 0.3 alpha 0.0

## 场景氛围柔光层与动态光尘粒子（非阻塞，支持所有场景自然呼吸与浮尘光影）
transform atmos_fade_in:
    alpha 0.0
    easeout 0.6 alpha 1.0

transform hud_mote_drift(x0, y0, dy, period, delay):
    subpixel True
    xpos x0 ypos y0 alpha 0.0
    pause delay
    block:
        parallel:
            ease period ypos (y0 - dy)
        parallel:
            linear (period * 0.25) alpha 0.48
            linear (period * 0.50) alpha 0.28
            linear (period * 0.25) alpha 0.0
        parallel:
            ease (period * 0.5) xoffset 18
            ease (period * 0.5) xoffset -14
        xpos x0 ypos y0 xoffset 0 alpha 0.0
        repeat

transform hud_chip_fx:
    subpixel True
    on hover:
        easeout 0.14 yoffset -2 zoom 1.03
    on idle:
        easeout 0.16 yoffset 0 zoom 1.0

screen evidence_book():
    zorder 100
    # 全屏 CG 演出、章节卡 / 结局卡期间隐藏，不遮画
    showif "cg" not in renpy.get_showing_tags() and not renpy.get_screen("centered_say"):
        $ _cur_bg_attrs = renpy.get_attributes("bg")
        $ _cur_bg = _cur_bg_attrs[0] if _cur_bg_attrs else ""
        if _cur_bg in ("sunset", "riverside", "rooftop"):
            add Solid("#f4a86014") xsize 1280 ysize 120 yalign 0.0 at atmos_fade_in
            add Solid("#ffdca8") xysize (3, 3) at hud_mote_drift(240, 420, 140, 5.2, 0.0)
            add Solid("#f4c488") xysize (4, 4) at hud_mote_drift(680, 460, 160, 6.0, 1.2)
            add Solid("#ffdca8") xysize (3, 3) at hud_mote_drift(1020, 390, 130, 5.6, 2.4)
        elif _cur_bg in ("library", "library_office", "classroom", "corridor", "clubroom", "agency", "home", "oden", "canteen", "booksigning", "street", "gate"):
            add Solid("#f6e8ff") xysize (3, 3) at hud_mote_drift(280, 440, 120, 6.4, 0.2)
            add Solid("#f4d98a") xysize (2, 2) at hud_mote_drift(620, 480, 135, 7.0, 1.5)
            add Solid("#e2ccf8") xysize (3, 3) at hud_mote_drift(960, 410, 115, 6.2, 2.8)
        elif _cur_bg in ("oldbuilding", "memory_storeroom", "memory_corridor", "memory_gate"):
            add Solid("#07040e55") xsize 1280 ysize 24 yalign 0.0 at atmos_fade_in
            add Solid("#07040e55") xsize 1280 ysize 24 yalign 1.0 at atmos_fade_in
        # 右上角一行紧凑的"证据"与"羁绊"按钮（高度 40px，不与立绘头部、选项块重叠）
        hbox:
            at hud_fade
            align (0.99, 0.02)
            spacing 8
            button:
                style "hud_chip_button"
                at hud_chip_fx
                action Show("evidence_list")
                tooltip _("查看已收集的线索")
                hbox:
                    spacing 8
                    yalign 0.5
                    add "gui/icon_evidence.png" yalign 0.5
                    text _("证据") style "hud_chip_text"
                    text "[len(evidence)]" style "hud_chip_num"
            button:
                style "hud_chip_button"
                at hud_chip_fx
                action Show("bond_panel")
                tooltip _("查看与墨墨的羁绊")
                hbox:
                    spacing 8
                    yalign 0.5
                    add "gui/icon_bond.png" yalign 0.5
                    text _("羁绊") style "hud_chip_text"
                    ## 迷你进度条：10 点一格
                    bar:
                        value AnimatedValue(mo_favor, 100, delay=0.6)
                        style "hud_bond_bar"
                        yalign 0.5

style hud_chip_button:
    background Frame("gui/hud_chip.png", 12, 12)
    hover_background Frame("gui/hud_chip_hover.png", 12, 12)
    padding (14, 0)
    ysize 40
    activate_sound "audio/sfx_click.ogg"

style hud_chip_text is text:
    size 20
    yalign 0.5
    color "#d8c8ee"

style hud_chip_num is text:
    size 20
    yalign 0.5
    color "#ffffff"
    font gui.bold_font

style hud_bond_bar is bar:
    xsize 96
    ysize 10
    left_bar Frame("gui/bar_full_mo.png", 6, 0)
    right_bar Frame("gui/bar_empty.png", 6, 0)
    thumb None


################################################################################
## 羁绊面板 —— 展示与墨墨/艾丽丝的好感、过去线索进度
################################################################################

################################################################################
## 即时反馈：线索入手提示条（左上）、羁绊变化浮动数字（右上 HUD 旁）
################################################################################

transform toast_in:
    on show:
        alpha 0.0 xoffset -24 zoom 0.96
        easeout 0.28 alpha 1.0 xoffset 0 zoom 1.0
    on hide:
        easein 0.3 alpha 0.0 xoffset -10

screen clue_toast(name, kicker=_("线索入手")):
    zorder 150
    frame:
        style "clue_toast_frame"
        at toast_in
        hbox:
            spacing 12
            yalign 0.5
            add "gui/icon_evidence.png" yalign 0.5
            vbox:
                spacing 2
                text ("✦ " + kicker) style "clue_toast_kicker"
                text name style "clue_toast_text"
    timer 3.4 action Hide("clue_toast")

style clue_toast_frame is default:
    ## 与右上角 HUD 同一水平线，避开 y=72 起的选项块
    xpos 30
    ypos 12
    background Frame("gui/hud_chip.png", 12, 12)
    padding (18, 9)
    xmaximum 560

style clue_toast_kicker is text:
    font gui.bold_font
    size 13
    color "#e8c98a"
    kerning 3

style clue_toast_text is text:
    size 20
    color "#f2ecf8"
    outlines [(2, "#0d0919", 0, 0)]

transform favor_float:
    alpha 0.0 yoffset 12 zoom 0.92
    easeout 0.24 alpha 1.0 yoffset 0 zoom 1.0
    pause 0.95
    easein 0.48 alpha 0.0 yoffset -16

screen favor_pop(amount):
    zorder 150
    text ("✦ 羁绊 +%d" % amount if amount > 0 else "羁绊 %d" % amount):
        style "favor_pop_text"
        color ("#f5d0ff" if amount > 0 else "#9aa6c8")
        at favor_float
    timer 1.7 action Hide("favor_pop")

style favor_pop_text is text:
    font gui.bold_font
    size 20
    xalign 0.985
    ypos 62
    outlines [(3, "#0a0714", 0, 0), (1, "#2a1b3d", 0, 1)]


## 弹出面板的通用外壳：暗化遮罩 + 居中卡片 + 标题带 + 右上角关闭；点击遮罩也能关闭
transform panel_pop:
    on show:
        alpha 0.0 zoom 0.97
        easeout 0.22 alpha 1.0 zoom 1.0
    on hide:
        easein 0.15 alpha 0.0 zoom 0.97

screen popup_panel(title, subtitle, hide_action, width=760, height=None):
    modal True
    zorder 200
    add "#0a0714" alpha 0.72
    button:
        ## 透明全屏按钮：点击空白处关闭
        xfill True
        yfill True
        background None
        action hide_action
    ## 卡片本体也是一个"吃掉点击"的按钮，这样点在卡片空白处不会误关
    button:
        style "popup_frame"
        action NullAction()
        xsize width
        if height:
            ysize height
        at panel_pop
        vbox:
            spacing 0
            hbox:
                xfill True
                vbox:
                    spacing 2
                    text title style "popup_title"
                    text subtitle style "popup_subtitle"
                textbutton _("关闭"):
                    style "popup_close_button"
                    xalign 1.0
                    yalign 0.0
                    action hide_action
            null height 10
            add Frame("gui/title_band.png", 0, 0) xsize 300 ysize 3
            null height 18
            transclude

style popup_frame is default:
    align (0.5, 0.5)
    background Frame("gui/panel_dark.png", 26, 26)
    padding (36, 28, 36, 30)

style popup_title is text:
    font gui.name_text_font
    size 30
    color "#f2e6ff"
    kerning 3

style popup_subtitle is text:
    size 17
    color "#9a86b8"
    kerning 1

style popup_close_button is pill_button:
    xminimum 96
    ysize 36

style popup_close_button_text is pill_button_text:
    size 20


## 羁绊面板：角色头像 + 进度条 + 阶段称谓；下方是通往真结局的三项指标
screen bond_panel():
    use popup_panel(_("羁绊"), _("你与他们的距离"), Hide("bond_panel"), width=780):
        vbox:
            spacing 16

            ## 墨墨（核心恋爱线）
            frame:
                style "bond_card"
                hbox:
                    spacing 18
                    frame:
                        style "bond_avatar"
                        add Transform("images/chara_mo_happy.png" if mo_favor >= 60 else "images/chara_mo_neutral.png", fit="cover", xysize=(72, 72), crop_relative=True, crop=(0.22, 0.0, 0.56, 0.44)) align (0.5, 0.0)
                    vbox:
                        spacing 6
                        yalign 0.5
                        hbox:
                            xfill True
                            text _("墨墨") style "bond_name" color "#e2c8ff"
                            text "[mo_bond_title(mo_favor)]" style "bond_stage" xalign 1.0
                        bar:
                            value AnimatedValue(mo_favor, 100, delay=0.8)
                            style "bond_bar_mo"
                        hbox:
                            xfill True
                            text _("羁绊") style "bond_meta"
                            text "[mo_favor] / 100" style "bond_meta" xalign 1.0

            ## 艾丽丝（信任线）
            frame:
                style "bond_card"
                hbox:
                    spacing 18
                    frame:
                        style "bond_avatar"
                        add Transform("images/chara_alice_neutral.png", fit="cover", xysize=(72, 72), crop_relative=True, crop=(0.22, 0.0, 0.56, 0.44)) align (0.5, 0.0)
                    vbox:
                        spacing 6
                        yalign 0.5
                        hbox:
                            xfill True
                            text _("艾丽丝") style "bond_name" color "#f3d78e"
                            text _("万事屋的信任") style "bond_stage" xalign 1.0
                        bar:
                            value AnimatedValue(alice_favor, 100, delay=0.8)
                            style "bond_bar_alice"
                        hbox:
                            xfill True
                            if alice_favor >= ALICE_HINT_THRESHOLD:
                                text _("推理卡壳时，艾丽丝会给你提示") style "bond_meta"
                            else:
                                text _("信任达到 [ALICE_HINT_THRESHOLD] 后，推理卡壳时她会给你提示") style "bond_meta"
                            text "[alice_favor] / 100" style "bond_meta" xalign 1.0

            ## 通往真结局的三项指标
            hbox:
                spacing 12
                frame:
                    style "bond_stat"
                    vbox:
                        spacing 4
                        text _("过去的线索") style "bond_stat_label"
                        hbox:
                            spacing 6
                            for i in range(4):
                                add "gui/icon_bond.png" alpha (1.0 if i < kako_clue else 0.22)
                        text "[kako_clue] / 4" style "bond_stat_value"
                frame:
                    style "bond_stat"
                    vbox:
                        spacing 4
                        text _("真相路线") style "bond_stat_label"
                        if truth_route:
                            text _("已开启") style "bond_stat_value" color "#a8f0c8"
                            text _("通往 TRUE END 的必经之路") style "bond_stat_hint"
                        else:
                            text _("未开启") style "bond_stat_value" color "#a08aa8"
                            text _("第三章的关键抉择") style "bond_stat_hint"
                frame:
                    style "bond_stat"
                    vbox:
                        spacing 4
                        text _("推理失误") style "bond_stat_label"
                        text "[fail_count] / 2" style "bond_stat_value" color ("#f0a8a8" if fail_count else "#f2e6ff")
                        text _("累计 2 次将走向 BAD END") style "bond_stat_hint"

style bond_card is default:
    xfill True
    background Frame("gui/panel_card.png", 16, 16)
    padding (16, 14)

style bond_avatar is default:
    xsize 72
    ysize 72
    padding (0, 0)
    background Frame("gui/panel_dark.png", 26, 26)

style bond_name is text:
    font gui.name_text_font
    size 24
    kerning 2

style bond_stage is text:
    size 18
    color "#c9b8e2"
    yalign 0.6

style bond_meta is text:
    size 16
    color "#9a86b8"

style bond_bar_mo is bar:
    xfill True
    ysize 12
    left_bar Frame("gui/bar_full_mo.png", 6, 0)
    right_bar Frame("gui/bar_empty.png", 6, 0)
    thumb None

style bond_bar_alice is bond_bar_mo:
    left_bar Frame("gui/bar_full_alice.png", 6, 0)

style bond_stat is default:
    xsize 226
    background Frame("gui/panel_card.png", 16, 16)
    padding (16, 12)

style bond_stat_label is text:
    size 16
    color "#9a86b8"
    kerning 2

style bond_stat_value is text:
    font gui.name_text_font
    size 24
    color "#f2e6ff"

style bond_stat_hint is text:
    size 14
    color "#7a6a90"


## 证据栏（三标签页：案件证物 / 过去的碎片 4/4 / 人物档案）
default evidence_tab = "clues"

init python:
    KAKO_FRAGMENTS = [
        (1, "碎片一 · 勇敢的小侦探", "第一章 · 储物间",
         "匿名寄往校长室的表彰信与铜质纪念奖牌。看到奖牌上「致勇敢的小侦探」六个字时，墨墨当场失态落书。"),
        (2, "碎片二 · 剪报背面的「还回来」", "第二章 · 教室",
         "用四年前十一月《城市晚报》合订本裁下的拼贴恐吓信，背面残存着给墨墨一个人的三个印刷字：「还回来」。"),
        (3, "碎片三 · 河堤的粉色千纸鹤", "第三章 · 河堤",
         "桌游社密室失窃的旧相册里，十岁的墨雪、周可与社区医生周明远并肩合影，手里捧着一白一粉两只纸鹤。"),
        (4, "碎片四 · 四年前的雨夜真言", "第五章 · 旧楼与晚报",
         "父母为维持「天才小侦探」热度自导自演案件，导致货架倾倒害死周明远。十一岁的墨雪亲口指认父母后，从此封存了自己的声音。"),
    ]

    def get_dossier_list():
        """根据当前章节进度与过去碎片解锁情况，动态返回无剧透且随剧情演进的人物档案列表。"""
        ch = getattr(store, "chapter_reached", 0)
        kc = getattr(store, "kako_clue", 0)
        records = []

        # 1. 墨墨（第五章或集齐3枚碎片后揭晓本名墨雪与旧案）
        if ch >= 5 or kc >= 4:
            records.append((
                "mo", "墨墨（墨雪）", "高一（1）班 · 万事屋的「大脑」",
                "本名墨雪。总用厚书半遮着脸、靠牛皮纸笔记本交流的少女。四年前因「小雪侦探」旧案的悲剧，亲手封存了自己的声音。"
            ))
        elif kc >= 1:
            records.append((
                "mo", "墨墨", "高一（1）班 · 万事屋的「大脑」",
                "总用厚书半遮着脸、靠牛皮纸笔记本交流的少女。观察力敏锐得惊人，似乎与四年前某桩「勇敢的小侦探」旧事有关。"
            ))
        else:
            records.append((
                "mo", "墨墨", "高一（1）班 · 万事屋的「大脑」",
                "总用厚书半遮着脸、靠牛皮纸笔记本与人交流的神秘少女。观察力敏锐得惊人，却不知为何从不开口说话。"
            ))

        # 2. 主角
        if ch >= 3:
            records.append((
                "mc", "陈默", "高一（1）班 · 万事屋的「嘴」",
                "从转学第一天的「麻烦磁铁」成长为万事屋不可或缺的搭档。正在学会替沉默的人发声，也等她自己开口。"
            ))
        else:
            records.append((
                "mc", "陈默", "高一（1）班 · 万事屋的「嘴」",
                "转学第一天就卷入图书馆冤案的「麻烦磁铁」。在墨墨的笔记指引下替她说出推理，成为万事屋专职的「嘴」。"
            ))

        # 3. 艾丽丝
        if ch >= 3:
            records.append((
                "alice", "艾丽丝", "高一（5）班 · 万事屋社长",
                "金发双马尾的混血少女，座右铭是「化不可能为可能」。四年前在图书馆角落坐到墨墨身边，守护了她的沉默整整四年。"
            ))
        else:
            records.append((
                "alice", "艾丽丝", "高一（5）班 · 万事屋社长",
                "金发双马尾的混血少女，座右铭是「化不可能为可能」。风风火火地经营着万事屋与「代价簿」，总是下意识护着墨墨。"
            ))

        # 4. 张子谦
        records.append((
            "zhang", "张子谦", "高一（3）班 · 义气发小",
            "主角从小学起认识的死党，「张记关东煮」少东家。嘴上嫌麻烦，关键时刻永远第一个站出来替朋友撑腰守门。"
        ))

        # 5. 王老师
        records.append((
            "wang", "王老师", "图书馆负责人 · 历史教师",
            "脾气急躁却心地赤诚的老教师，年轻时练过柔道。一旦发现错怪学生，会毫不犹豫地九十度鞠躬道歉。"
        ))

        # 6. 小林
        records.append((
            "lin", "小林", "图书管理委员 · 规则记录者",
            "做事一板一眼、把规章流程精确到分钟的图书管理员。表面冷淡严苛，实则极度信守「如实记录每一个人」的原则。"
        ))

        # 7. 吕芙（第一章起正式结识）
        if ch >= 2:
            records.append((
                "lvfu", "吕芙", "高一（2）班 · 桌游社成员",
                "安静内向的高个子女生，喜欢向言翻译的文学作品与推理桌游。在第一章洗清误会后成为万事屋温暖的常客。"
            ))
        else:
            records.append((
                "lvfu", "吕芙", "高一（2）班 · 文学爱好者",
                "在图书馆角落偶遇的高个子女生，手里总抱着向言翻译的《美丽新世界》，神色间似乎藏着难言的心事。"
            ))

        # 8. Joker
        records.append((
            "joker", "Joker", "自称「心之怪盗」 · 情报眼线",
            "总在天台和走廊背诵中二台词的戏剧狂热少年。虽然推理每次都歪到十万八千里，却是校园里最敏锐的高处眼线。"
        ))

        # 9. 周可（第二章登场后解锁档案，防止序章/第一章提前剧透）
        if ch >= 5 or kc >= 3:
            records.append((
                "zhouke", "周可", "高一（3）班 · 旧友与复刻者",
                "笑容温柔的新转学生，真实身份是四年前社区医生周明远的女儿。带着盛满旧报纸的鞋盒归来，只为重现四年前那个夏天。"
            ))
        elif ch >= 2:
            records.append((
                "zhouke", "周可", "高一（3）班 · 新转学生",
                "笑容温柔甜美的新转学生，自称是墨墨小学时的要好朋友，总会带着切了星星胡萝卜的便当来找墨墨。"
            ))

        # 10. 向言
        if ch >= 4:
            records.append((
                "xiang", "向言", "知名纪实文学译者 · 主角之父",
                "常年在外奔波、不善言辞的父亲。在云溪高中的讲座上公开为四年前的「幼女侦探」发声，试图与儿子学会「一人说一半」。"
            ))
        else:
            records.append((
                "xiang", "向言", "知名纪实文学译者 · 主角之父",
                "常年在外奔波、不善言辞的父亲。十年前将书房留给儿子，只懂得在转账备注里写下一句又一句千篇一律的「路上小心」。"
            ))

        return records

screen evidence_list():
    $ _dossiers = get_dossier_list()
    use popup_panel(_("调查手册"), _("已收集证物 [len(evidence)] 条 · 过去碎片 [kako_clue]/4"), Hide("evidence_list"), width=800, height=580):
        vbox:
            spacing 12
            hbox:
                spacing 10
                textbutton _("案件证物 ([len(evidence)])"):
                    style "pill_button"
                    selected (evidence_tab == "clues")
                    action SetVariable("evidence_tab", "clues")
                textbutton _("过去的碎片 ([kako_clue]/4)"):
                    style "pill_button"
                    selected (evidence_tab == "kako")
                    action SetVariable("evidence_tab", "kako")
                textbutton _("人物档案 ([len(_dossiers)])"):
                    style "pill_button"
                    selected (evidence_tab == "dossier")
                    action SetVariable("evidence_tab", "dossier")

            if evidence_tab == "clues":
                if evidence:
                    viewport:
                        xfill True
                        ysize 360
                        scrollbars "vertical"
                        mousewheel True
                        draggable True
                        yinitial 1.0
                        vbox:
                            spacing 8
                            for idx, ev in enumerate(evidence):
                                frame:
                                    style "evidence_card"
                                    hbox:
                                        spacing 14
                                        frame:
                                            style "evidence_badge"
                                            text "%02d" % (idx + 1) style "evidence_badge_text" align (0.5, 0.5)
                                        text ev style "evidence_text" yalign 0.5
                else:
                    vbox:
                        xalign 0.5
                        yalign 0.5
                        ysize 360
                        spacing 14
                        null height 96
                        add "gui/slot_empty.png" xalign 0.5
                        text _("目前还没有收集到线索") style "evidence_none"
                        text _("在调查场景中选择「查看 / 询问」类选项即可获得线索") style "evidence_none_hint"

            elif evidence_tab == "kako":
                viewport:
                    xfill True
                    ysize 360
                    scrollbars "vertical"
                    mousewheel True
                    draggable True
                    vbox:
                        spacing 10
                        for frag_idx, frag_title, frag_src, frag_desc in KAKO_FRAGMENTS:
                            frame:
                                style "evidence_card"
                                vbox:
                                    spacing 4
                                    hbox:
                                        xfill True
                                        if kako_clue >= frag_idx:
                                            text frag_title style "bond_name" size 20 color "#f2d8ff"
                                            text frag_src style "bond_meta" xalign 1.0 yalign 0.5
                                        else:
                                            text ("碎片 %d · ？？？" % frag_idx) style "bond_name" size 20 color "#6a5c80"
                                            text frag_src style "bond_meta" xalign 1.0 yalign 0.5
                                    if kako_clue >= frag_idx:
                                        text frag_desc style "evidence_text" size 17 color "#dcd0ec" xmaximum 680
                                    else:
                                        text _("【尚未拼合 · 在主线调查中触发过去暗线后解锁】") style "evidence_none_hint" xalign 0.0

            else:
                viewport:
                    xfill True
                    ysize 360
                    scrollbars "vertical"
                    mousewheel True
                    draggable True
                    vbox:
                        spacing 10
                        for ch_key, ch_name, ch_role, ch_bio in _dossiers:
                            frame:
                                style "evidence_card"
                                hbox:
                                    spacing 14
                                    frame:
                                        style "bond_avatar"
                                        xsize 64
                                        ysize 64
                                        add Transform("images/chara_%s_neutral.png" % ch_key, fit="cover", xysize=(64, 64), crop_relative=True, crop=(0.22, 0.0, 0.56, 0.44)) align (0.5, 0.0)
                                    vbox:
                                        spacing 3
                                        yalign 0.5
                                        hbox:
                                            xfill True
                                            text (player_name if ch_key == "mc" else ch_name) style "bond_name" size 20 color "#f2e6ff"
                                            text ch_role style "bond_meta" xalign 1.0 yalign 0.5
                                        text ch_bio style "evidence_text" size 16 color "#cfc0e4" xmaximum 600

style evidence_card is default:
    xfill True
    background Frame("gui/panel_card.png", 16, 16)
    padding (16, 12)

style evidence_badge is default:
    xsize 40
    ysize 32
    padding (0, 0)
    background Frame("gui/pill_selected.png", 18, 18)

style evidence_badge_text is text:
    size 16
    color "#ffffff"
    font gui.bold_font

style evidence_text is text:
    size 21
    color "#f2ecf8"
    xmaximum 600

style evidence_none is text:
    size 22
    color "#a892c2"
    xalign 0.5

style evidence_none_hint is text:
    size 16
    color "#7a6a90"
    xalign 0.5


################################################################################
## 高冲击视觉演出：推理破局横幅切入（deduction_cutin） & 创伤闪回脉冲（trauma_pulse）
################################################################################

transform cutin_slash_anim:
    alpha 0.0 zoom 1.12 xoffset -80
    easeout 0.18 alpha 1.0 zoom 1.0 xoffset 0
    pause 1.05
    easein 0.28 alpha 0.0 xoffset 90

transform cutin_text_pop:
    alpha 0.0 zoom 1.35
    pause 0.06
    easeout 0.18 alpha 1.0 zoom 1.0
    pause 0.98
    easein 0.25 alpha 0.0 zoom 0.94

screen deduction_cutin(headline=_("真相突破 ——！"), subline="LOGIC BREAKTHROUGH"):
    zorder 180
    frame:
        at cutin_slash_anim
        xfill True
        ysize 136
        yalign 0.34
        background "#120926eb"
        padding (0, 0)
        ## 上下亮金切线
        add Solid("#f4ce78") xsize 1280 ysize 3 yalign 0.0
        add Solid("#cfa6f0") xsize 1280 ysize 2 yalign 1.0
        ## 左侧：墨墨眼神特写切入
        add Transform("images/chara_mo_think.png", crop_relative=True, crop=(0.20, 0.16, 0.60, 0.22), fit="cover", xysize=(360, 130), alpha=0.88) xalign 0.02 yalign 0.5
        ## 右侧：主角眼神特写切入
        add Transform("images/chara_mc_think.png", crop_relative=True, crop=(0.20, 0.16, 0.60, 0.22), fit="cover", xysize=(360, 130), alpha=0.82) xalign 0.98 yalign 0.5
        ## 中央大字冲击标题
        vbox:
            at cutin_text_pop
            align (0.5, 0.5)
            spacing 2
            text subline:
                font gui.bold_font
                size 16
                color "#f4ce78"
                kerning 6
                xalign 0.5
                outlines [(2, "#0a0616", 0, 0)]
            text headline:
                font gui.title_font
                size 54
                color "#ffffff"
                kerning 4
                xalign 0.5
                outlines [(4, "#241042", 0, 0), (1, "#f4ce78", 2, 2)]
    timer 1.55 action Hide("deduction_cutin")

transform trauma_pulse_anim:
    alpha 0.0
    linear 0.06 alpha 0.85
    linear 0.12 alpha 0.25
    linear 0.08 alpha 0.65
    easein 0.65 alpha 0.0

screen trauma_pulse():
    zorder 175
    frame:
        at trauma_pulse_anim
        xfill True
        yfill True
        background None
        padding (0, 0)
        ## 四周猩红暗角脉冲 + 怀旧闪回扫描线
        add Solid("#7a142844") xysize (1280, 720)
        add Solid("#f0d8e0aa") xsize 1280 ysize 4 yalign 0.28
        add Solid("#c8324888") xsize 1280 ysize 2 yalign 0.68
        add Solid("#240610cc") xsize 1280 ysize 36 yalign 0.0
        add Solid("#240610cc") xsize 1280 ysize 36 yalign 1.0
    timer 0.95 action Hide("trauma_pulse")


################################################################################
## 通用推理结果反馈 label
################################################################################

label reason_correct:
    play sound se_correct
    show screen deduction_cutin()
    with flash_shutter
    sysmsg "推理正确！线索之间的矛盾被你抓住了。"
    return

label reason_wrong:
    play sound se_wrong
    python:
        # 每一次推理错误都记录一次失误（用于结局判定：fail_count >= 2 触发 BE）
        add_fail()
        # intuition 为本章推理的"重试提示"资源，递减但不低于 0（每章开始时重置为 3）
        intuition = max(0, intuition - 1)
    if intuition > 0:
        sysmsg "似乎哪里不对……（失误已记录 · 剩余直觉提示：[intuition]）"
        sysmsg "你可以再想一想。"
    else:
        sysmsg "你的推理再次出现了疏漏……（失误已记录，直觉已耗尽）"
        sysmsg "稳住，仔细回看线索之间的矛盾。"
    return


## 艾丽丝的提示：信任度足够时，在重试推理前替你把方向缩小
## 用法：call alice_hint("提示内容")
label alice_hint(hint):
    if alice_favor >= ALICE_HINT_THRESHOLD:
        show alice happy at right with dissolve
        alice "[hint]"
    return


################################################################################
## 开场动态视觉舞台（万事屋探案手记三联导览 + 序章勒庞引言剧场幕布）
################################################################################

transform guide_card_rise(delay=0.0):
    subpixel True
    alpha 0.0 yoffset 22 zoom 0.96
    pause delay
    easeout 0.48 alpha 1.0 yoffset 0 zoom 1.0

transform guide_stage_fade:
    on show:
        alpha 0.0
        easeout 0.35 alpha 1.0
    on hide:
        easein 0.30 alpha 0.0

screen intro_guide_stage():
    zorder 50
    frame:
        at guide_stage_fade
        xfill True
        yfill True
        background None
        padding (0, 0)
        add "gui/game_menu.png" at bg_kenburns_in
        add Tile("gui/grain.png") alpha 0.05
        add "gui/crane_particle.png" at crane_drift(180, 18.0, 0.34, 0.0)
        add "gui/crane_particle.png" at crane_drift(1080, 22.0, 0.30, 0.4)
        add Solid("#f4d98a") xysize (3, 3) at hud_mote_drift(320, 440, 150, 4.2, 0.1)
        add Solid("#e2ccf8") xysize (3, 3) at hud_mote_drift(960, 420, 140, 4.6, 0.3)

        vbox:
            xalign 0.5
            ypos 46
            spacing 10
            hbox:
                xalign 0.5
                spacing 14
                at guide_card_rise(0.0)
                add "gui/crane_particle.png" zoom 0.38 yalign 0.5
                vbox:
                    spacing 2
                    text "DETECTIVE HANDBOOK · 万事屋探案手记":
                        font gui.bold_font
                        size 14
                        color "#f4d98a"
                        kerning 5
                        xalign 0.5
                    text _("在翻开故事的第一页之前"):
                        font gui.name_text_font
                        size 32
                        color "#f6eeff"
                        kerning 4
                        xalign 0.5
                        outlines [(2, "#0d0818", 0, 0)]
                add "gui/crane_particle.png" zoom 0.38 xzoom -1.0 yalign 0.5

            add "gui/rule_fade.png" xalign 0.5 xzoom 0.72 at guide_card_rise(0.06)
            null height 4

            hbox:
                xalign 0.5
                spacing 18
                ## 卡片 01：现场调查
                frame:
                    style "guide_feature_card"
                    at guide_card_rise(0.10)
                    vbox:
                        spacing 8
                        hbox:
                            spacing 10
                            yalign 0.5
                            frame:
                                style "evidence_badge"
                                text "01" style "evidence_badge_text" align (0.5, 0.5)
                            text _("现场取证 · 过去碎片") style "pref_card_title" size 22 yalign 0.5
                        add Solid("#cbb0e633") xsize 332 ysize 1
                        text _("在调查环节搜集关键物证，并留意四枚与墨墨四年前旧案相连的「过去的碎片」。"):
                            size 17
                            color "#d8c8ee"
                            line_spacing 4
                ## 卡片 02：逻辑推理
                frame:
                    style "guide_feature_card"
                    at guide_card_rise(0.22)
                    vbox:
                        spacing 8
                        hbox:
                            spacing 10
                            yalign 0.5
                            frame:
                                style "evidence_badge"
                                text "02" style "evidence_badge_text" align (0.5, 0.5)
                            text _("矛盾突破 · 直觉容错") style "pref_card_title" size 22 yalign 0.5
                        add Solid("#cbb0e633") xsize 332 ysize 1
                        text _("比对证言与物证的时间差；艾丽丝信任达标时会给出提示，累计 2 次推理失误将滑向坏结局。"):
                            size 17
                            color "#d8c8ee"
                            line_spacing 4
                ## 卡片 03：无声羁绊
                frame:
                    style "guide_feature_card"
                    at guide_card_rise(0.34)
                    vbox:
                        spacing 8
                        hbox:
                            spacing 10
                            yalign 0.5
                            frame:
                                style "evidence_badge"
                                text "03" style "evidence_badge_text" align (0.5, 0.5)
                            text _("她的眼睛 · 你的声音") style "pref_card_title" size 22 yalign 0.5
                        add Solid("#cbb0e633") xsize 332 ysize 1
                        text _("墨墨用牛皮纸笔记本写下洞察，而你替她开口发声。你的每一次回应都将改写五种终局。"):
                            size 17
                            color "#d8c8ee"
                            line_spacing 4

style guide_feature_card is default:
    xsize 368
    ysize 196
    background Frame("gui/panel_card.png", 16, 16)
    padding (18, 16)

screen prologue_epigraph_stage():
    zorder 45
    frame:
        at guide_stage_fade
        xfill True
        yfill True
        background None
        padding (0, 0)
        add "#06030d"
        add Transform("images/cg_meet.png", matrixcolor=SaturationMatrix(0.22) * TintMatrix("#9c78cc") * BrightnessMatrix(-0.28), alpha=0.34) at bg_kenburns_in
        add Tile("gui/grain.png") alpha 0.05
        add "gui/crane_particle.png" at crane_drift(240, 20.0, 0.32, 0.0)
        add "gui/crane_particle.png" at crane_drift(1020, 24.0, 0.28, 0.6)
        add Solid("#f4d98a") xysize (3, 3) at hud_mote_drift(420, 430, 140, 4.8, 0.1)
        add Solid("#cbb0e6") xysize (3, 3) at hud_mote_drift(860, 450, 150, 5.2, 0.4)

        vbox:
            xalign 0.5
            ypos 118
            spacing 12
            add "gui/crane_particle.png" xalign 0.5 zoom 0.52 alpha 0.88 at guide_card_rise(0.0)
            text "EPIGRAPH · 序幕题记":
                font gui.bold_font
                size 14
                color "#f4d98acc"
                kerning 6
                xalign 0.5
                at guide_card_rise(0.08)
            add "gui/rule_fade.png" xalign 0.5 xzoom 0.64 at guide_card_rise(0.14)
            text _("“眼见为实”的旁观者，与沉默的被审判者"):
                font gui.name_text_font
                size 28
                color "#ebe0f8"
                kerning 4
                xalign 0.5
                outlines [(2, "#090512", 0, 0)]
                at guide_card_rise(0.20)
            text "— Gustave Le Bon, La Psychologie des foules (1895) —":
                size 16
                color "#9a86b8"
                kerning 2
                xalign 0.5
                at guide_card_rise(0.28)
            add "gui/rule_fade.png" xalign 0.5 xzoom 0.44 alpha 0.7 at guide_card_rise(0.34)


################################################################################
## 帮助说明 label（开场可调用）
################################################################################

label gameplay_intro:
    show screen intro_guide_stage
    with Dissolve(0.35)
    sysmsg "【探案手记】右上角可随时翻阅「证据」与「羁绊」档案。在现场【调查】中搜集证物与「过去的碎片」，在【推理】中指出证言的裂隙。"
    sysmsg "【沉默与发声】墨墨负责洞察真相，而你是替她开口的「嘴」。你说的每一句话、每一次迟疑或追问，都将决定五种截然不同的终局。"
    hide screen intro_guide_stage
    with Dissolve(0.25)
    return
