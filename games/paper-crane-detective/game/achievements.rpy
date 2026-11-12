## 成就系统
## achievements.rpy
##
## 基于 Ren'Py 自带的 achievement 模块（persistent 存储，接 Steam 时只需补 steam 名）。
## 解锁时机全部挂在 extra.rpy 的 label 回调与 definitions.rpy 的 add_kako 上，剧本文件零改动。

## 本周目是否从 label start 一路玩下来（章节选择 / 重温结局直接跳进来时为 False，
## "零失误""最近的距离"这类统计类成就只在完整周目结算）
default full_run = False

init -1 python:
    # (id, 标题, 说明, 是否隐藏成就)
    ACH_LIST = [
        ("ach_start",   "万事屋的新人",   "完成序章，正式成为万事屋的一员。",                 False),
        ("ach_crane",   "歪歪的千纸鹤",   "在序章为了道歉，亲手折一只千纸鹤给墨墨。",         False),
        ("ach_half",    "半程侦探",       "破解前三桩案子，抵达第四章。",                     False),
        ("ach_truth",   "说出怀疑",       "在第三章把对周可的怀疑说出口，开启真相路线。",     False),
        ("ach_kako",    "过去的四片碎片", "在一个周目里集齐关于墨墨过去的全部四条线索。",     False),
        ("ach_be",      "迟来的真相",     "达成 BAD END。",                                   False),
        ("ach_ne",      "洗清的冤屈",     "达成 NORMAL END。",                                False),
        ("ach_he",      "无言的心意",     "达成 GOOD END。",                                  False),
        ("ach_te",      "重新发声",       "达成 TRUE END。",                                  False),
        ("ach_hidden",  "第二只千纸鹤",   "看完隐藏后日谈。",                                 True),
        ("ach_all_end", "每一种约定",     "集齐全部五个结局。",                               False),
        ("ach_perfect", "零失误",         "从序章一路推理到结局，一次也没有答错。",           False),
        ("ach_bond",    "最近的距离",     "一个完整周目结束时，与墨墨的羁绊达到 100。",       False),
        ("ach_cg",      "全部的记忆",     "解锁画廊里的全部 CG。",                            False),
        ("ach_dlc_alice", "账本里的温度", "完成番外短篇《艾丽丝的代价账本》。",               False),
        ("ach_dlc_mo",    "第三只千纸鹤", "完成番外后日谈《旧书街与第三只千纸鹤》。",         False),
    ]
    ACH_TITLE = {a[0]: a[1] for a in ACH_LIST}

    for _a in ACH_LIST:
        achievement.register(_a[0], steam=_a[0])

    def ach_has(aid):
        return achievement.has(aid)

    def ach_count():
        return sum(1 for a in ACH_LIST if achievement.has(a[0]))

    def ach_grant(aid):
        """解锁成就：只在首次解锁时弹提示与音效，并同步 Steam / 平台后端"""
        if achievement.has(aid):
            return
        achievement.grant(aid)
        achievement.sync()
        renpy.sound.play("audio/sfx_ach.ogg")
        renpy.show_screen("ach_toast", ACH_TITLE[aid])

    def ach_check_cg():
        if cg_unlocked_count() >= len(CG_LIST):
            ach_grant("ach_cg")


## 顶部居中的解锁提示条（与左上的线索提示、右上的 HUD 互不遮挡）
transform ach_toast_in:
    on show:
        alpha 0.0 yoffset -20
        easeout 0.35 alpha 1.0 yoffset 0
    on hide:
        easein 0.4 alpha 0.0 yoffset -12

screen ach_toast(title):
    zorder 160
    frame:
        style "ach_toast_frame"
        at ach_toast_in
        hbox:
            spacing 12
            yalign 0.5
            add "gui/icon_ach.png" yalign 0.5
            vbox:
                spacing 1
                text _("成就解锁") style "ach_toast_kicker"
                text title style "ach_toast_text"
    timer 3.6 action Hide("ach_toast")

style ach_toast_frame is default:
    xalign 0.5
    ypos 12
    background Frame("gui/hud_chip.png", 12, 12)
    padding (18, 8)

style ach_toast_kicker is text:
    size 14
    color "#d6b35a"
    kerning 3

style ach_toast_text is text:
    font gui.name_text_font
    size 20
    color "#fff1d0"


## 鉴赏页里的成就分页（由 extra.rpy 的 extras 屏 use）
screen extras_achievements():
    vbox:
        spacing 12
        text "已解锁 %d / %d" % (ach_count(), len(ACH_LIST)):
            style "extras_section_text"
        grid 2 ((len(ACH_LIST) + 1) // 2):
            spacing 12
            for aid, title, desc, hidden in ACH_LIST:
                $ got = achievement.has(aid)
                frame:
                    style ("ach_card" if got else "ach_card_locked")
                    hbox:
                        spacing 14
                        yalign 0.5
                        add ("gui/badge_ach.png" if got else "gui/badge_ach_locked.png") yalign 0.5
                        vbox:
                            spacing 3
                            yalign 0.5
                            if got:
                                text title style "ach_title"
                                text desc style "ach_desc"
                            elif hidden:
                                text _("？？？") style "ach_title_locked"
                                text _("隐藏成就 · 达成后揭晓") style "ach_desc_locked"
                            else:
                                text title style "ach_title_locked"
                                text desc style "ach_desc_locked"

style ach_card is default:
    xsize 352
    ysize 84
    padding (12, 10)
    background Frame("gui/panel_card.png", 16, 16)
style ach_card_locked is ach_card

style ach_title is text:
    font gui.name_text_font
    size 19
    color "#f6e7c0"
style ach_desc is text:
    size 14
    color "#b9a6d4"
style ach_title_locked is text:
    font gui.name_text_font
    size 19
    color "#6a5c80"
style ach_desc_locked is text:
    size 14
    color "#5e5070"
