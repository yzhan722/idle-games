################################################################################
## 《沉默侦探：千纸鹤的约定》—— 界面屏幕定义
## screens.rpy
## 自定义主菜单 / 对话框 / 选项 / 存读档 / 设置等，配色与 gui.rpy 统一。
################################################################################

init offset = -1


## 通用样式 ####################################################################

style default:
    properties gui.text_properties()
    language gui.language

style input:
    properties gui.text_properties("input", accent=True)
    adjust_spacing False

style hyperlink_text:
    properties gui.text_properties("hyperlink", accent=True)
    hover_underline True

style gui_text:
    properties gui.text_properties("interface")

style button:
    properties gui.button_properties("button")
    ## gui.button_properties("button") 会硬编码把 background/foreground 指向
    ## gui/button/[prefix_]background.png 等不存在的图片，这里显式置空覆盖，避免崩溃。
    ## 各需要图片背景的按钮（navigation/choice/slot 等）已各自显式定义 background。
    background None
    foreground None

style button_text is gui_text:
    properties gui.text_properties("button")
    yalign 0.5

style label_text is gui_text:
    properties gui.text_properties("label", accent=True)

style prompt_text is gui_text:
    properties gui.text_properties("prompt")

style bar:
    ysize gui.bar_size
    left_bar Frame("gui/slider_full.png", 0, 0, 0, 0)
    right_bar Frame("gui/slider_empty.png", 0, 0, 0, 0)

style vbar:
    xsize gui.bar_size
    top_bar Frame("gui/slider_full.png", 0, 0, 0, 0)
    bottom_bar Frame("gui/slider_empty.png", 0, 0, 0, 0)

style scrollbar:
    ysize gui.scrollbar_size
    base_bar Solid("#261b3a88")
    thumb Solid("#a88ad0cc")
    hover_thumb Solid("#dec8ff")
    unscrollable gui.unscrollable

style vscrollbar:
    xsize gui.scrollbar_size
    base_bar Solid("#261b3a88")
    thumb Solid("#a88ad0cc")
    hover_thumb Solid("#dec8ff")
    unscrollable gui.unscrollable

style slider:
    ysize gui.slider_size
    ## 已填充段用亮紫渐变、未填充段用暗槽，一眼能看出当前值
    left_bar Frame("gui/slider_full.png", 7, 0)
    right_bar Frame("gui/slider_empty.png", 7, 0)
    thumb "gui/slider_thumb.png"
    thumb_offset 15

style vslider:
    xsize gui.slider_size
    top_bar Frame("gui/slider_full.png", 0, 7)
    bottom_bar Frame("gui/slider_empty.png", 0, 7)
    thumb "gui/slider_thumb.png"

style frame:
    padding (20, 20)
    background Frame("gui/game_menu.png", gui.frame_borders, tile=False)


################################################################################
## 对话框 say screen
################################################################################

screen say(who, what):
    style_prefix "say"

    ## 当墨墨用牛皮纸笔记本写字交流（mo_note）时，在画面中上方浮现专属手写牛皮纸卡
    if who == "墨墨（笔记）":
        frame:
            style "mo_note_card_frame"
            at mo_note_card_in
            vbox:
                spacing 6
                hbox:
                    xfill True
                    text _("NOTEBOOK · 墨墨的牛皮纸本") style "mo_note_card_kicker"
                    text "✎" style "mo_note_card_kicker" xalign 1.0
                add Solid("#a6845866") xsize 476 ysize 1
                null height 2
                text what.strip("「」") style "mo_note_card_text"
                null height 2
                add Solid("#a6845838") xsize 476 ysize 1

    window:
        id "window"

        if who is not None:
            window:
                id "namebox"
                style "namebox"
                text who id "who"

        text what id "what"

    if not renpy.variant("small"):
        add SideImage() xpos 155 ypos 613 anchor (0.5, 0.5)

    use quick_menu


transform mo_note_card_in:
    alpha 0.0 yoffset 12
    easeout 0.22 alpha 1.0 yoffset 0

style mo_note_card_frame is default:
    xalign 0.5
    ypos 68
    xsize 516
    background "#f3e7d2f2"
    padding (20, 14, 20, 16)

style mo_note_card_kicker is text:
    font gui.bold_font
    size 13
    color "#7d5d38"
    kerning 2

style mo_note_card_text is text:
    font gui.name_text_font
    size 23
    color "#2b1e12"
    line_spacing 6
    xmaximum 476


## 点击继续指示器：对话框右下角一只小纸鹤，文字显示完后呼吸闪烁（Character 默认 ctc，见 definitions.rpy）
image ctc_blink:
    "gui/ctc_crane.png"
    xpos 1205 ypos 668 anchor (0.5, 0.5)
    subpixel True
    alpha 0.0
    easeout 0.25 alpha 1.0
    block:
        easeout 0.8 alpha 0.45 yoffset 2
        easein 0.8 alpha 1.0 yoffset -2
        repeat


################################################################################
## 居中字幕 / 章节卡 / 结局卡 centered_say
################################################################################

init python:
    import re as _re

    def _card_parts(what):
        """把剧本里 `centered "{size=50}第一章 · 完{/size}\\n\\n{size=28}间章「…」{/size}"` 这类
        带尺寸标签的文本拆成若干段（去掉 size 标签），由屏幕按段落数决定版式。"""
        parts = []
        for p in what.split("\n\n"):
            p = _re.sub(r"\{/?size(=\d+)?\}", "", p).strip()
            if p:
                parts.append(p)
        return parts or [what]

    def _card_kind(parts):
        head = parts[0]
        if len(parts) == 1:
            return "caption"
        if head.endswith("END"):
            return "ending"
        if head.endswith("完"):
            return "chapter_end"
        return "chapter_start"

    _ENDING_ACCENT = {
        "TRUE END": "#f4d98a",
        "GOOD END": "#d9b8ff",
        "NORMAL END": "#cfd8e8",
        "BAD END": "#c98a8a",
        "HIDDEN END": "#a8e4ff",
    }

## 入场：整卡淡入并上浮，装饰线从中间向两侧展开
transform card_in(delay=0.0):
    alpha 0.0 yoffset 16
    pause delay
    easeout 0.55 alpha 1.0 yoffset 0

transform rule_in(delay=0.0):
    alpha 0.0 xzoom 0.2
    pause delay
    easeout 0.7 alpha 1.0 xzoom 1.0

screen centered_say(who, what):
    ## 说话人为 centered 时不显示快捷栏与 HUD（gameplay.rpy 的 HUD 也会检测本屏幕）
    $ parts = _card_parts(what)
    $ kind = _card_kind(parts)

    ## 引擎要求 say 屏幕里必须有 id 为 what 的 Text；卡片是分段自绘的，这里放一个 1px 视口里的隐形副本
    viewport:
        xysize (1, 1)
        xpos -8
        ypos -8
        text what id "what" style "tcard_hidden"

    if kind == "caption":
        ## 日期 · 地点 之类的一行字幕：横贯屏幕的暗带，两侧细线
        add "#0a0714" alpha 0.42
        frame:
            style "caption_band"
            at card_in(0.0)
            hbox:
                xalign 0.5
                yalign 0.5
                spacing 22
                add Solid("#cbb0e6") xsize 56 ysize 1 yalign 0.5 alpha 0.7
                text parts[0] style "caption_text"
                add Solid("#cbb0e6") xsize 56 ysize 1 yalign 0.5 alpha 0.7
    else:
        add "#0a0714" alpha 0.68
        add Tile("gui/grain.png") alpha 0.04
        add "gui/crane_particle.png" at crane_drift(240, 26.0, 0.34, 0.0)
        add "gui/crane_particle.png" at crane_drift(1010, 30.0, 0.28, 3.0)
        vbox:
            xalign 0.5
            yalign 0.5
            spacing 0
            if kind == "chapter_start":
                ## 「间章」+「标题」：顶部纸鹤徽记 + 小的章序在上，大的标题在下
                add "gui/crane_particle.png" xalign 0.5 zoom 0.52 alpha 0.85 at card_in(0.0)
                null height 8
                text parts[0] style "tcard_kicker" at card_in(0.05)
                null height 14
                add "gui/rule_fade.png" xalign 0.5 at rule_in(0.15)
                null height 22
                text parts[1] style "tcard_title" at card_in(0.25)
                for extra in parts[2:]:
                    null height 18
                    text extra style "tcard_sub" at card_in(0.4)
            elif kind == "chapter_end":
                ## 「第一章 · 完」+ 下一章预告
                add "gui/crane_particle.png" xalign 0.5 zoom 0.7 alpha 0.85 at card_in(0.0)
                null height 10
                text parts[0] style "tcard_title" at card_in(0.1)
                null height 18
                add "gui/rule_fade.png" xalign 0.5 at rule_in(0.25)
                null height 26
                text _("接下来") style "tcard_next" at card_in(0.4)
                null height 6
                text parts[1] style "tcard_sub" at card_in(0.45)
            else:
                ## 结局卡：纸鹤徽记 + 英文结局名（按结局着色）+ 中文标题 + 一句话
                $ accent = _ENDING_ACCENT.get(parts[0], "#e6d8f5")
                add "gui/crane_particle.png" xalign 0.5 zoom 0.58 alpha 0.88 at card_in(0.0)
                null height 6
                text parts[0] style "tcard_ending" color accent at card_in(0.05)
                null height 8
                add "gui/rule_fade.png" xalign 0.5 at rule_in(0.2)
                null height 24
                text parts[1] style "tcard_title" at card_in(0.3)
                for extra in parts[2:]:
                    null height 20
                    text extra style "tcard_sub" at card_in(0.5)

style tcard_hidden is text:
    size 8
    color "#00000000"

style caption_band is default:
    xfill True
    yalign 0.5
    ysize 120
    background Frame("gui/caption_band.png", 0, 0)
    padding (0, 0)

style caption_text is text:
    font gui.name_text_font
    size 26
    color "#f2e6ff"
    kerning 3
    outlines [(2, "#0a0714", 0, 0)]

style tcard_kicker is text:
    font gui.name_text_font
    size 30
    color "#c9b8e2"
    kerning 10
    xalign 0.5
    text_align 0.5
    outlines [(2, "#0a0714", 0, 0)]

style tcard_title is text:
    font gui.name_text_font
    size 54
    color "#f6eeff"
    kerning 6
    xalign 0.5
    text_align 0.5
    outlines [(3, "#0a0714", 0, 0)]
    line_spacing 10

style tcard_sub is text:
    size 24
    color "#c9b8e2"
    kerning 2
    xalign 0.5
    text_align 0.5
    outlines [(2, "#0a0714", 0, 0)]
    line_spacing 8

style tcard_next is text:
    size 16
    color "#8a7aa0"
    kerning 6
    xalign 0.5

style tcard_ending is text:
    font gui.name_text_font
    size 66
    kerning 12
    xalign 0.5
    text_align 0.5
    outlines [(3, "#0a0714", 0, 0)]


## 文本输入（开场输入玩家名字）：居中契约卡片 + 动态星尘与纸鹤粒子
screen input(prompt):
    style_prefix "input"

    add "gui/game_menu.png" at kv_breathe
    add Tile("gui/grain.png") alpha 0.05
    add "gui/crane_particle.png" at crane_drift(240, 22.0, 0.34, 0.0)
    add "gui/crane_particle.png" at crane_drift(1020, 26.0, 0.28, 1.5)

    frame:
        style "input_card"
        at card_in(0.0)
        vbox:
            xalign 0.5
            spacing 16
            add "gui/crane_particle.png" xalign 0.5 zoom 0.62 alpha 0.92 at primary_breathe
            text "STUDENT REGISTRATION · 姓名登记":
                font gui.bold_font
                size 13
                color "#f4d98acc"
                kerning 5
                xalign 0.5
            text prompt style "input_prompt"
            add "gui/rule_fade.png" xalign 0.5 xzoom 0.68 at rule_in(0.1)
            frame:
                xalign 0.5
                xsize 420
                ysize 58
                background Frame("gui/hud_chip.png", 12, 12)
                padding (16, 8)
                input id "input" style "input_field" yalign 0.5
            text _("输入完成后按 Enter 回车确认 · 留空则使用默认名字「陈默」") style "input_hint"

style input_card is default:
    xalign 0.5
    yalign 0.5
    xsize 620
    padding (48, 40)
    background Frame("gui/panel_dark.png", 26, 26)

style input_prompt is default:
    font gui.name_text_font
    size 30
    color "#f2e6ff"
    kerning 4
    xalign 0.5
    text_align 0.5

style input_field is default:
    size 34
    color "#ffffff"
    xalign 0.5
    text_align 0.5
    xmaximum 500

style input_hint is default:
    size 16
    color "#8a7aa0"
    xalign 0.5


## 选项逐条错落入场（每条延迟 80ms），且悬停时轻盈上浮微放大，增强抉择交互手感
transform choice_in(index):
    subpixel True
    alpha 0.0 xoffset 24 yoffset 0 zoom 1.0
    pause (0.08 * index)
    easeout 0.28 alpha 1.0 xoffset 0
    on hover:
        easeout 0.14 yoffset -3 zoom 1.016
    on idle:
        easeout 0.16 yoffset 0 zoom 1.0

transform quick_btn_fx:
    subpixel True
    on hover:
        easeout 0.12 yoffset -2
    on idle:
        easeout 0.14 yoffset 0

transform nav_btn_fx(delay=0.0):
    subpixel True
    alpha 0.0 xoffset -20 zoom 1.0
    pause delay
    easeout 0.28 alpha 1.0 xoffset 0
    on hover:
        easeout 0.14 xoffset 7 zoom 1.02
    on idle:
        easeout 0.16 xoffset 0 zoom 1.0

transform nav_primary_fx:
    subpixel True
    alpha 0.0 xoffset -22 zoom 1.0
    easeout 0.32 alpha 1.0 xoffset 0
    block:
        easeout 1.6 alpha 0.90
        easein 1.6 alpha 1.0
        repeat
    on hover:
        easeout 0.14 xoffset 8 zoom 1.03 alpha 1.0
    on idle:
        easeout 0.16 xoffset 0 zoom 1.0

transform card_hover_fx:
    subpixel True
    on hover:
        easeout 0.14 yoffset -3 zoom 1.014
    on idle:
        easeout 0.16 yoffset 0 zoom 1.0

transform pill_hover_fx:
    subpixel True
    on hover:
        easeout 0.12 yoffset -2 zoom 1.03
    on idle:
        easeout 0.14 yoffset 0 zoom 1.0

screen choice(items):
    style_prefix "choice"

    vbox:
        for idx, i in enumerate(items):
            textbutton i.caption action i.action at choice_in(idx)


style window:
    xalign 0.5
    xfill True
    yalign gui.textbox_yalign
    ysize gui.textbox_height
    background Image("gui/textbox.png", xalign=0.5, yalign=1.0)

style namebox:
    xpos gui.name_xpos
    xanchor gui.name_xalign
    ypos gui.name_ypos
    ysize gui.namebox_height
    background Frame("gui/namebox.png", gui.namebox_borders, tile=gui.namebox_tile)
    padding (20, 10, 20, 10)

style say_label:
    properties gui.text_properties("name", accent=True)
    xalign gui.name_xalign
    yalign 0.5

style say_dialogue:
    properties gui.text_properties("dialogue")
    xpos gui.dialogue_xpos
    xsize gui.dialogue_width
    ypos gui.dialogue_ypos
    # 行距略收：四行正文必须落在快捷菜单上方（见 gui.rpy 对话框一节的计算）
    line_spacing -2

## `centered` 章末字幕 / 结局标题直接压在夕阳等明亮背景上，无对话框衬底，需要描边保证可读
style centered_text:
    color "#fbf6ff"
    outlines [(3, "#1a1226", 0, 0)]
    line_spacing 6

## 选项块从右上角 HUD 下方开始向下排列：立绘是大胸像，眼睛约在屏幕中部（y≈370），
## 常见的 2~3 个选项（150~240px）只会盖到头发顶部，不遮脸；选项多时才会往下延伸
style choice_vbox:
    xalign 0.5
    ypos 72
    yanchor 0.0
    spacing gui.choice_spacing

style choice_button is button:
    properties gui.button_properties("choice_button")
    foreground None
    background Frame("gui/choice_button_idle.png", gui.choice_button_borders, tile=gui.choice_button_tile)
    hover_background Frame("gui/choice_button_hover.png", gui.choice_button_borders, tile=gui.choice_button_tile)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style choice_button_text is button_text:
    properties gui.button_properties("choice_button")
    xalign 0.5


################################################################################
## 快捷菜单 quick_menu
################################################################################

screen quick_menu():
    zorder 100
    if quick_menu and not main_menu:
        ## 一条整体的半透明横条，按钮悬停微上浮，分组间以星芒分隔；"自动/跳过"开启时按钮保持高亮
        frame:
            style "quick_bar"
            xalign 0.5
            yalign 1.0
            yoffset -4
            hbox:
                style_prefix "quick"
                spacing 4
                textbutton _("回退") action Rollback() at quick_btn_fx
                textbutton _("历史") action ShowMenu('history') at quick_btn_fx
                textbutton _("跳过") action Skip() alternate Skip(fast=True, confirm=True) at quick_btn_fx
                textbutton _("自动") action Preference("auto-forward", "toggle") at quick_btn_fx
                text "✦" style "quick_sep"
                textbutton _("证据") action Show('evidence_list') at quick_btn_fx
                textbutton _("羁绊") action Show('bond_panel') at quick_btn_fx
                text "✦" style "quick_sep"
                textbutton _("存档") action ShowMenu('save') at quick_btn_fx
                textbutton _("读档") action ShowMenu('load') at quick_btn_fx
                textbutton _("设置") action ShowMenu('preferences') at quick_btn_fx

default quick_menu = True

style quick_bar is default:
    background Frame("gui/hud_chip.png", 12, 12)
    padding (10, 0)
    ysize 28

style quick_button:
    background None
    hover_background "#ffffff18"
    selected_idle_background "#cbb0e633"
    padding (8, 0)
    ysize 28
    activate_sound "audio/sfx_click.ogg"

style quick_button_text:
    size 18
    yalign 0.5
    idle_color "#b8a8d0"
    hover_color "#ffffff"
    selected_idle_color "#f5ecff"
    selected_hover_color "#ffffff"
    insensitive_color "#5e5070"

style quick_sep is text:
    size 16
    yalign 0.5
    color "#5e5070"


################################################################################
## 导航 navigation（主菜单/游戏菜单共用按钮列）
################################################################################

## 设计约定（v2 菜单重做）：
##   · 左侧一列 300px 宽的导航，按钮 54px 高、左对齐、左侧竖条指示悬停/选中，主按钮"开始游戏"更高更亮；
##   · 危险/离开类操作（退出、主菜单）与其他按钮之间留一段间隔，靠列底；
##   · 所有页面共用同一背景（模糊压暗的主菜单图），正文放在 x=400~1220 的深色圆角面板里，避免压在立绘上；
##   · 页面标题在面板上方左对齐，下有一条渐隐的强调带；返回按钮固定在导航列底部同一位置。
screen navigation(in_menu=False):
    vbox:
        style_prefix "navigation"
        xpos gui.navigation_xpos
        yalign 0.5
        spacing gui.navigation_spacing

        if main_menu:
            textbutton _("开始游戏"):
                style "navigation_primary_button"
                at nav_primary_fx
                action Start()
            null height 6
            if persistent.chapter_reached and persistent.chapter_reached >= 1:
                textbutton _("章节选择") action ShowMenu("chapter_select") at nav_btn_fx(0.04)
            textbutton _("鉴赏  [extras_count_text()]") action ShowMenu("extras") at nav_btn_fx(0.08)
            if persistent.te_cleared:
                textbutton _("隐藏后日谈") action Start("ending_hidden") at nav_btn_fx(0.11)
            textbutton _("读档") action ShowMenu("load") at nav_btn_fx(0.12)
            textbutton _("设置") action ShowMenu("preferences") at nav_btn_fx(0.16)
            textbutton _("帮助") action ShowMenu("help") at nav_btn_fx(0.20)
            textbutton _("关于") action ShowMenu("about") at nav_btn_fx(0.24)
            if not in_menu and (renpy.variant("pc") or (renpy.variant("web") and not renpy.variant("mobile"))):
                null height 14
                textbutton _("退出") action Quit(confirm=False) at nav_btn_fx(0.28)
        else:
            textbutton _("历史") action ShowMenu("history") at nav_btn_fx(0.02)
            textbutton _("存档") action ShowMenu("save") at nav_btn_fx(0.06)
            textbutton _("读档") action ShowMenu("load") at nav_btn_fx(0.10)
            textbutton _("设置") action ShowMenu("preferences") at nav_btn_fx(0.14)
            textbutton _("帮助") action ShowMenu("help") at nav_btn_fx(0.18)
            textbutton _("关于") action ShowMenu("about") at nav_btn_fx(0.22)
            if not in_menu:
                null height 14
                if _in_replay:
                    textbutton _("结束回放") action EndReplay(confirm=True) at nav_btn_fx(0.26)
                else:
                    textbutton _("回到主菜单") action MainMenu() at nav_btn_fx(0.26)

style navigation_button:
    size_group "navigation"
    xsize 280
    ysize 50
    background Frame("gui/nav_idle.png", 14, 12)
    hover_background Frame("gui/nav_hover.png", 14, 12)
    selected_idle_background Frame("gui/nav_selected.png", 14, 12)
    selected_hover_background Frame("gui/nav_selected.png", 14, 12)
    padding (26, 0)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style navigation_button_text:
    size 24
    yalign 0.5
    kerning 1
    idle_color "#c9b8e2"
    hover_color "#ffffff"
    selected_idle_color "#ffffff"
    selected_hover_color "#ffffff"
    insensitive_color "#6a5c80"

style navigation_primary_button is navigation_button:
    ysize 60
    background Frame("gui/nav_primary_idle.png", 16, 16)
    hover_background Frame("gui/nav_primary_hover.png", 16, 16)

style navigation_primary_button_text is navigation_button_text:
    font gui.name_text_font
    size 28
    idle_color "#fbf6ff"
    kerning 5


################################################################################
## 主菜单 main_menu
################################################################################

## 标题入场：淡入 + 轻微上浮；副标题延迟半拍，避免整块一起跳出来
transform main_title_in(delay=0.0):
    alpha 0.0 yoffset 14
    pause delay
    easeout 0.6 alpha 1.0 yoffset 0

## 主按钮的呼吸高光：只作用于"开始游戏"，提示这是第一操作
transform primary_breathe:
    alpha 1.0
    block:
        easeout 1.6 alpha 0.86
        easein 1.6 alpha 1.0
        repeat

## 主菜单氛围：几只小纸鹤从画面下方缓缓飘升、左右轻摆、渐隐，再从底部重来。
## 参数：起点 x、周期、缩放、相位（延迟）。透明度压得很低，只作为呼吸感，不抢标题。
transform crane_drift(x, period, scale, delay):
    xpos x ypos 760 zoom scale alpha 0.0
    rotate -10
    pause delay
    block:
        parallel:
            linear period ypos -80
        parallel:
            linear (period * 0.15) alpha 0.40
            linear (period * 0.60) alpha 0.40
            linear (period * 0.25) alpha 0.0
        parallel:
            ease (period * 0.5) xoffset 26 rotate 8
            ease (period * 0.5) xoffset -10 rotate -10
        ypos 760 xoffset 0 alpha 0.0
        repeat

## 主视觉整体的缓慢呼吸式推近（Ken Burns），让静态底图有电影感
transform kv_breathe:
    subpixel True
    zoom 1.0 xalign 0.5 yalign 0.5
    ease 18.0 zoom 1.03
    ease 18.0 zoom 1.0
    repeat

## 主菜单标题背后的呼吸光晕与周期性流光掠过
transform title_halo_breathe:
    subpixel True
    xpos 568 ypos 255 anchor (0.5, 0.5)
    alpha 0.0 zoom 1.4
    easeout 0.8 alpha 0.26 zoom 1.65
    block:
        easein 2.4 alpha 0.16 zoom 1.82
        easeout 2.4 alpha 0.28 zoom 1.60
        repeat

transform title_shimmer_sweep:
    subpixel True
    xpos 380 ypos 286 alpha 0.0
    pause 0.8
    block:
        parallel:
            easeout 2.2 xpos 740
        parallel:
            linear 0.4 alpha 0.75
            linear 1.2 alpha 0.55
            linear 0.6 alpha 0.0
        pause 3.2
        xpos 380 alpha 0.0
        repeat

transform menu_mote_float(x0, y0, dy, period, delay):
    subpixel True
    xpos x0 ypos y0 alpha 0.0
    pause delay
    block:
        parallel:
            ease period ypos (y0 - dy)
        parallel:
            linear (period * 0.25) alpha 0.62
            linear (period * 0.50) alpha 0.36
            linear (period * 0.25) alpha 0.0
        parallel:
            ease (period * 0.5) xoffset 22
            ease (period * 0.5) xoffset -16
        xpos x0 ypos y0 xoffset 0 alpha 0.0
        repeat

transform menu_header_in:
    subpixel True
    alpha 0.0 xoffset -18
    easeout 0.26 alpha 1.0 xoffset 0

transform menu_panel_in:
    subpixel True
    alpha 0.0 yoffset 14
    easeout 0.28 alpha 1.0 yoffset 0

screen main_menu():
    tag menu

    add gui.main_menu_background at kv_breathe

    ## 飘升的纸鹤与暖金星尘：只在标题与导航之间的空档里飞，赋予画面呼吸感与纵深感
    add "gui/crane_particle.png" at crane_drift(400, 28.0, 0.42, 0.0)
    add "gui/crane_particle.png" at crane_drift(520, 34.0, 0.30, 11.0)
    add "gui/crane_particle.png" at crane_drift(680, 31.0, 0.52, 19.0)
    add "gui/crane_particle.png" at crane_drift(600, 38.0, 0.26, 26.0)
    add "gui/crane_particle.png" at crane_drift(460, 24.0, 0.34, 5.0)
    add Solid("#f4d98a") xysize (3, 3) at menu_mote_float(430, 580, 220, 5.4, 0.2)
    add Solid("#e6d4ff") xysize (4, 4) at menu_mote_float(570, 620, 240, 6.2, 1.1)
    add Solid("#f4d98a") xysize (3, 3) at menu_mote_float(710, 540, 200, 5.8, 2.0)
    add Solid("#cbb0e6") xysize (3, 3) at menu_mote_float(860, 600, 210, 6.6, 0.6)
    add Solid("#f4d98a") xysize (2, 2) at menu_mote_float(1040, 560, 190, 5.2, 1.6)

    ## 标题后方柔和呼吸光晕与周期性流光掠影
    add "gui/crane_particle.png" at title_halo_breathe
    add "gui/title_band.png" xzoom 0.42 yzoom 1.2 at title_shimmer_sweep

    use navigation

    ## 标题排在导航列（x<340）与主视觉人物（x>790）之间的空档里
    vbox:
        style "main_menu_vbox"
        xpos 568
        xanchor 0.5
        yalign 0.29
        add "gui/crane_particle.png":
            xalign 0.5
            zoom 0.52
            alpha 0.92
            at main_title_in(0.0)
        null height 4
        text "SILENT DETECTIVE":
            style "main_menu_kicker"
            xalign 0.5
            at main_title_in(0.05)
        null height 4
        text _("沉默侦探"):
            style "main_menu_title"
            xalign 0.5
            at main_title_in(0.12)
        null height 2
        add "gui/rule_fade.png":
            xalign 0.5
            xzoom 0.72
            at main_title_in(0.3)
        null height 10
        text _("千纸鹤的约定"):
            style "main_menu_title_sub"
            xalign 0.5
            at main_title_in(0.35)
        null height 14
        add "gui/rule_fade.png":
            xalign 0.5
            xzoom 0.46
            alpha 0.72
            at main_title_in(0.45)
        null height 10
        text _("她负责看见真相，你负责说出真相"):
            style "main_menu_subtitle"
            xalign 0.5
            at main_title_in(0.55)

    ## 进度徽记：精致胶囊徽章，让回访玩家一眼看到自己在哪
    if persistent.chapter_reached:
        $ _chap_title = [t for (l, t, need) in CHAPTER_LIST if need <= persistent.chapter_reached][-1].split(" · ")[0]
        frame:
            xpos 60
            yalign 1.0
            yoffset -14
            background Frame("gui/hud_chip.png", 12, 12)
            padding (14, 5)
            at main_title_in(0.4)
            hbox:
                spacing 8
                yalign 0.5
                add "gui/icon_bond.png" zoom 0.78 yalign 0.5
                text _("进度  [_chap_title]  ·  结局 [ending_count_text()]  ·  鉴赏 [extras_count_text()]") style "main_menu_progress"

    text "SINGULARITY STUDIO  ·  v[config.version]":
        style "main_menu_version"
        at main_title_in(0.45)

style main_menu_vbox:
    spacing 0

style main_menu_progress is text:
    size 15
    color "#d8c8ee"
    yalign 0.5

style main_menu_kicker is text:
    size 15
    color "#c8b4e0"
    kerning 9
    outlines [(2, "#1a1226", 0, 0)]

style main_menu_title:
    font gui.name_text_font
    size 84
    color "#f6eeff"
    outlines [(3, "#1a1226", 0, 0), (10, "#1a122655", 0, 0)]
    kerning 10

style main_menu_title_sub:
    font gui.name_text_font
    size 38
    color "#ecdcff"
    outlines [(3, "#1a1226", 0, 0)]
    kerning 8

style main_menu_subtitle is text:
    size 19
    color "#c8b4e0"
    kerning 2
    outlines [(2, "#1a1226", 0, 0)]

style main_menu_version is text:
    size 16
    color "#9a86b8"
    xalign 1.0
    yalign 1.0
    xoffset -20
    yoffset -16


################################################################################
## 游戏菜单 game_menu（存读档/设置等的外框）
################################################################################

screen game_menu(title, scroll=None, yinitial=0.0, subtitle=None):
    style_prefix "game_menu"

    ## 无论从主菜单还是游戏内进入，都用模糊压暗后的同一张背景 + 轻柔星尘粒子
    add gui.game_menu_background
    add Tile("gui/grain.png") alpha 0.06
    add "gui/crane_particle.png" at crane_drift(220, 32.0, 0.28, 0.0)

    ## 页面标题 + 强调带（带滑入动效）
    vbox:
        at menu_header_in
        xpos 400
        ypos 26
        spacing 4
        hbox:
            spacing 16
            yalign 1.0
            text title style "game_menu_title"
            if subtitle:
                text subtitle style "game_menu_subtitle" yalign 0.8
        add Frame("gui/title_band.png", 0, 0):
            xsize 460
            ysize 3

    ## 正文面板（带微上浮淡入动效）
    frame:
        style "game_menu_content_frame"
        at menu_panel_in
        if scroll == "viewport":
            viewport:
                yinitial yinitial
                scrollbars "vertical"
                mousewheel True
                draggable True
                side_yfill True
                side_spacing 12
                vbox:
                    transclude
        elif scroll == "vpgrid":
            vpgrid:
                cols 1
                yinitial yinitial
                scrollbars "vertical"
                mousewheel True
                draggable True
                side_yfill True
                side_spacing 12
                transclude
        else:
            transclude

    use navigation(in_menu=True)

    ## 返回 / 回到主菜单 固定在导航列底部
    vbox:
        xpos gui.navigation_xpos
        yalign 1.0
        yoffset -34
        spacing 8
        if not main_menu:
            if _in_replay:
                textbutton _("结束回放") style "return_button" action EndReplay(confirm=True) at nav_btn_fx(0.18)
            else:
                textbutton _("回到主菜单") style "return_button" action MainMenu() at nav_btn_fx(0.18)
        textbutton _("返回"):
            style "return_button"
            at nav_btn_fx(0.22)
            action Return()

style game_menu_title:
    font gui.name_text_font
    size 40
    color "#f2e6ff"
    kerning 4

style game_menu_subtitle is text:
    size 18
    color "#9a86b8"
    kerning 2

style game_menu_content_frame:
    xpos 400
    ypos 96
    xsize 820
    ysize 594
    background Frame("gui/panel_dark.png", 26, 26)
    padding (28, 24)

style return_button is navigation_button:
    background Frame("gui/nav_idle.png", 14, 12)

style return_button_text is navigation_button_text:
    idle_color "#f0e6ff"


################################################################################
## 存档 / 读档
################################################################################

screen save():
    tag menu
    use file_slots(_("存档"))

screen load():
    tag menu
    use file_slots(_("读档"))

screen file_slots(title):
    default page_name_value = FilePageNameInputValue(pattern=_("第 {} 页"), auto=_("自动存档"), quick=_("快速存档"))

    use game_menu(title, subtitle=_("点击存档位 · 按 Delete 删除")):
        vbox:
            xfill True
            spacing 14

            ## 页名（可点击改名）
            button:
                style "page_label"
                key_events True
                xalign 0.5
                action page_name_value.Toggle()
                input:
                    style "page_label_text"
                    value page_name_value

            ## 六个存档位：卡片式，缩略图 + 时间 + 名称
            grid 3 2:
                style_prefix "slot"
                xalign 0.5
                spacing 14

                for i in range(6):
                    $ slot = i + 1
                    button:
                        at card_hover_fx
                        action FileAction(slot)
                        has vbox
                        spacing 6
                        xalign 0.5
                        frame:
                            style "slot_thumb_frame"
                            if FileLoadable(slot):
                                add FileScreenshot(slot) xalign 0.5 yalign 0.5
                            else:
                                add "gui/slot_empty.png" xalign 0.5 yalign 0.5
                        text FileTime(slot, format=_("{#file_time}%m-%d  %H:%M"), empty=_("—  空存档位  —")):
                            style "slot_time_text"
                        text FileSaveName(slot, empty=" "):
                            style "slot_name_text"
                        key "save_delete" action FileDelete(slot)

            ## 页签：胶囊
            hbox:
                style_prefix "page"
                xalign 0.5
                spacing 6
                textbutton _("<") action FilePagePrevious() at pill_hover_fx
                textbutton _("自动") action FilePage("auto") at pill_hover_fx
                textbutton _("快速") action FilePage("quick") at pill_hover_fx
                for page in range(1, 7):
                    textbutton "[page]" action FilePage(page) at pill_hover_fx
                textbutton _(">") action FilePageNext() at pill_hover_fx

style page_label is default:
    xpadding 40
    ypadding 2

style page_label_text is text:
    text_align 0.5
    layout "subtitle"
    size 24
    hover_color gui.hover_color
    color "#cbb0e6"

style page_button:
    xminimum 56
    ysize 36
    padding (14, 0)
    background Frame("gui/pill_idle.png", 18, 18)
    hover_background Frame("gui/pill_hover.png", 18, 18)
    selected_idle_background Frame("gui/pill_selected.png", 18, 18)
    selected_hover_background Frame("gui/pill_selected.png", 18, 18)

style page_button_text:
    size 20
    yalign 0.5
    xalign 0.5
    idle_color "#c9b8e2"
    hover_color "#ffffff"
    selected_idle_color "#ffffff"
    selected_hover_color "#ffffff"

style slot_button:
    xsize 244
    ysize 208
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    padding (10, 10)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style slot_thumb_frame is default:
    xsize 224
    ysize 126
    background "#0e0a18"
    padding (0, 0)

style slot_button_text:
    size 18
    text_align 0.5
    xalign 0.5
    idle_color "#c9b8e2"
    hover_color "#ffffff"
    insensitive_color "#a896c4"

style slot_time_text is slot_button_text
style slot_name_text is slot_button_text:
    color gui.accent_color
    insensitive_color "#c0aad8"


################################################################################
## 设置 preferences
################################################################################

screen preferences():
    tag menu
    use game_menu(_("设置"), scroll="viewport", subtitle=_("修改即时生效")):
        vbox:
            xsize 748
            spacing 16

            ## 第一行：画面 / 跳过 —— 胶囊式单选与开关
            hbox:
                spacing 16
                if renpy.variant("pc") or renpy.variant("web"):
                    frame:
                        style "pref_card"
                        xsize 366
                        vbox:
                            spacing 12
                            text _("画面") style "pref_card_title"
                            hbox:
                                style_prefix "pill"
                                spacing 10
                                textbutton _("窗口") action Preference("display", "window")
                                textbutton _("全屏") action Preference("display", "fullscreen")
                frame:
                    style "pref_card"
                    xsize 366
                    vbox:
                        spacing 12
                        text _("跳过") style "pref_card_title"
                        hbox:
                            style_prefix "pill"
                            spacing 10
                            textbutton _("未读文本") action Preference("skip", "toggle")
                            textbutton _("选项后继续") action Preference("after choices", "toggle")

            ## 第二行：文本节奏（下方一行示例文字按当前速度实时重播）
            frame:
                style "pref_card"
                xfill True
                vbox:
                    spacing 10
                    text _("文本") style "pref_card_title"
                    hbox:
                        spacing 24
                        vbox:
                            spacing 6
                            text _("文字速度") style "pref_label"
                            bar value Preference("text speed") style "pref_slider"
                        vbox:
                            spacing 6
                            text _("自动前进等待") style "pref_label"
                            bar value Preference("auto-forward time") style "pref_slider"
                    frame:
                        style "pref_preview_frame"
                        text _("她把千纸鹤放在桌上，没有说话。窗外的雨，正好停在这一刻。"):
                            style "pref_preview_text"
                            slow_cps True

            ## 第三行：声音（音乐 / 音效 / 语音三路独立调音，单行并排使整页完整落在一屏内）
            frame:
                style "pref_card"
                xfill True
                vbox:
                    spacing 10
                    hbox:
                        xfill True
                        text _("声音") style "pref_card_title"
                        hbox:
                            xalign 1.0
                            spacing 10
                            textbutton _("全部静音"):
                                style "pill_button"
                                action Preference("all mute", "toggle")
                            textbutton _("重置初始进度"):
                                style "pill_button"
                                action Show("confirm",
                                            message=_("确定要清空所有存档、已解锁 CG、结局与成就，\n恢复为全新初始试玩状态吗？"),
                                            yes_action=[Hide("confirm"), Function(reset_all_progress)],
                                            no_action=Hide("confirm"))
                    hbox:
                        spacing 20
                        vbox:
                            spacing 6
                            text _("音乐") style "pref_label"
                            bar value Preference("music volume") style "pref_slider_3col"
                        vbox:
                            spacing 6
                            hbox:
                                spacing 10
                                text _("音效") style "pref_label"
                                textbutton _("试听"):
                                    style "pref_link_button"
                                    action Play("sound", "audio/sfx_correct.ogg")
                            bar value Preference("sound volume") style "pref_slider_3col"
                        if config.has_voice:
                            vbox:
                                spacing 6
                                hbox:
                                    spacing 10
                                    text _("语音") style "pref_label"
                                    textbutton _("试听"):
                                        style "pref_link_button"
                                        action Play("voice", "audio/voice/v_mo_15.ogg")
                                bar value Preference("voice volume") style "pref_slider_3col"

style pref_card is default:
    background Frame("gui/panel_card.png", 16, 16)
    padding (22, 16)

style pref_card_title is text:
    font gui.name_text_font
    size 24
    color "#e3d3f6"
    kerning 2

style pref_label is text:
    size 22
    color "#c9b8e2"

style pref_hint is text:
    size 18
    color "#8a7aa0"

style pref_slider:
    xsize 312
    ysize 30

style pref_slider_3col is pref_slider:
    xsize 212

style pref_preview_frame is default:
    xfill True
    background Frame("gui/hud_chip.png", 12, 12)
    padding (16, 10)

style pref_preview_text is text:
    size 20
    color "#e8def5"

style pref_link_button:
    padding (0, 0)
    background None
style pref_link_button_text:
    size 20
    idle_color "#9fd0ff"
    hover_color "#ffffff"
    underline True

## 胶囊按钮（单选 / 开关共用）：选中态用亮紫填充 + 白字
style pill_button is button:
    xminimum 120
    ysize 40
    padding (18, 0)
    background Frame("gui/pill_idle.png", 18, 18)
    hover_background Frame("gui/pill_hover.png", 18, 18)
    selected_idle_background Frame("gui/pill_selected.png", 18, 18)
    selected_hover_background Frame("gui/pill_selected.png", 18, 18)
    foreground None
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style pill_button_text:
    size 22
    xalign 0.5
    yalign 0.5
    idle_color "#c9b8e2"
    hover_color "#ffffff"
    selected_idle_color "#ffffff"
    selected_hover_color "#ffffff"
    insensitive_color "#6a5c80"

## 兼容旧引用
style radio_button is pill_button
style check_button is pill_button
style radio_button_text is pill_button_text
style check_button_text is pill_button_text
style mute_all_button is pill_button
style mute_all_button_text is pill_button_text


################################################################################
## 历史 history
################################################################################

screen history():
    tag menu
    use game_menu(_("历史"), scroll="viewport", yinitial=1.0, subtitle=_("滚轮翻阅 · 最新在最下")):
        style_prefix "history"
        vbox:
            xsize 722
            spacing 8
            for h in _history_list:
                frame:
                    style "history_entry"
                    vbox:
                        spacing 4
                        if h.who:
                            text h.who:
                                style "history_name_text"
                                substitute False
                                if "color" in h.who_args:
                                    color h.who_args["color"]
                        $ what = h.what
                        text what:
                            style "history_what_text"
                            substitute False
            if not _history_list:
                text _("历史记录为空。") style "history_empty_text"

style history_entry is default:
    xfill True
    background Frame("gui/panel_card.png", 16, 16)
    padding (18, 12)

style history_name_text:
    color gui.accent_color
    size 20
style history_what_text:
    color gui.text_color
    size 24
    line_spacing -2
style history_empty_text is text:
    color "#8a7aa0"
    size 24
    xalign 0.5


################################################################################
## 帮助 / 关于
################################################################################

screen help():
    tag menu
    use game_menu(_("帮助"), scroll="viewport", subtitle=_("操作与玩法")):
        style_prefix "help"
        vbox:
            xsize 748
            spacing 10
            frame:
                style "help_card"
                xfill True
                vbox:
                    spacing 6
                    text _("操作") style "pref_card_title"
                    grid 2 3:
                        xspacing 24
                        yspacing 6
                        for key, val in [
                            (_("左键 / 回车 / 空格"), _("推进对话 · 显示全句")),
                            (_("右键 / Esc"),          _("呼出 / 关闭游戏菜单")),
                            (_("滚轮上 / PgUp"),       _("回退已读剧情与选项")),
                            (_("Ctrl 按住 · Tab"),     _("快进已读 · 自动播放")),
                            (_("H · 鼠标中键"),        _("隐藏对话框查看全图")),
                            (_("S · F"),               _("保存截图 · 切换全屏")),
                        ]:
                            hbox:
                                spacing 10
                                frame:
                                    xsize 148
                                    background None
                                    padding (0, 0)
                                    text key style "help_key"
                                text val style "help_grid_val"
            frame:
                style "help_card"
                xfill True
                vbox:
                    spacing 6
                    text _("画面上的提示") style "pref_card_title"
                    text _("右上角『证据』：随时查看已收集的线索；新线索入手时左上角会弹出提示。") style "help_val"
                    text _("右上角『羁绊』：查看墨墨好感、过去线索与真相路线进度；好感变化在旁浮出数字。") style "help_val"
                    text _("顶部居中的金色提示：解锁了一项成就，可在标题画面的『鉴赏』里查看详情。") style "help_val"
            hbox:
                spacing 12
                frame:
                    style "help_card"
                    xsize 434
                    vbox:
                        spacing 6
                        text _("玩法") style "pref_card_title"
                        text _("调查取证 → 找出矛盾推理 → 关键抉择影响结局。") style "help_val"
                        text _("推理失误消耗『直觉』，累计 2 次失误走向坏结局。") style "help_val"
                        text _("真结局：提升好感、集齐过去线索并开启真相路线。") style "help_val"
                        text _("共 5 种结局；通关真结局后解锁标题页隐藏后日谈。") style "help_val"
                frame:
                    style "help_card"
                    xsize 302
                    vbox:
                        spacing 6
                        text _("鉴赏") style "pref_card_title"
                        text _("结局：随时重温已达成的结局。") style "help_val"
                        text _("画廊：全屏查看已解锁的 CG。") style "help_val"
                        text _("音乐室：自由点播已解锁曲目。") style "help_val"
                        text _("成就：共 14 项（含隐藏成就）。") style "help_val"

style help_card is pref_card:
    padding (18, 10)
style help_key is text:
    size 17
    color "#cbb0e6"
style help_val is text:
    size 17
    color gui.text_color
## 操作表右列：限宽以便自动换行，不会被面板裁掉
style help_grid_val is help_val:
    xsize 196


screen about():
    tag menu
    use game_menu(_("关于"), scroll="viewport", subtitle=_("版本 [config.version]")):
        style_prefix "about"
        vbox:
            xsize 748
            spacing 12
            frame:
                style "pref_card"
                xfill True
                vbox:
                    spacing 8
                    text "[config.name!t]" style "pref_card_title"
                    text _("校园推理 × 恋爱 AVG。序章至终章共九段剧情、五种结局与一段隐藏后日谈，约 15 万字。") style "about_body_text"
                    text _("不说一句话的她（墨墨），与成为她「嘴」的你。她负责看见真相，你负责说出真相。") style "about_body_text"
                    text _("鉴赏页可重温结局、查看 CG、聆听乐曲与追踪成就；章节选择可从任意章节重玩。") style "about_body_text"
            frame:
                style "pref_card"
                xfill True
                vbox:
                    spacing 8
                    text _("制作 · 奇点游戏工作室") style "pref_card_title"
                    text _("剧本 · 高泽坤｜AI制作 · 张鹰南") style "about_body_text"
                    text _("立绘、背景、CG、主视觉：AI 生成并逐张验收；BGM / 音效：程序化生成（可自由替换）") style "about_body_text"
                    text _("字体：Noto Sans SC / Noto Serif SC（SIL Open Font License 1.1）") style "pref_hint"
            text _("Made with Ren'Py [renpy.version_only].") style "pref_hint" xalign 0.5

style about_body_text is help_val:
    size 19
    line_spacing 2


################################################################################
## 确认对话框 confirm（退出/覆盖存档等）
################################################################################

screen confirm(message, yes_action, no_action):
    modal True
    zorder 200

    add "#00000099"

    frame:
        style "confirm_frame"
        background Frame("gui/panel_dark.png", 26, 26)
        xalign 0.5
        yalign 0.5
        xminimum 520
        padding (48, 40)
        vbox:
            xalign 0.5
            spacing 28
            text _(message):
                style "confirm_prompt"
                xalign 0.5
                text_align 0.5
            hbox:
                xalign 0.5
                spacing 24
                textbutton _("确定"):
                    style "confirm_yes_button"
                    action yes_action
                textbutton _("取消"):
                    style "confirm_button"
                    action no_action

    on "show" action SensitiveIf(renpy.get_screen("confirm"))

style confirm_prompt_text:
    color gui.text_color
    size 26
    line_spacing 4
style confirm_button is pill_button:
    xminimum 150
    ysize 46
style confirm_button_text is pill_button_text:
    size 24
style confirm_yes_button is confirm_button:
    background Frame("gui/pill_selected.png", 18, 18)
    hover_background Frame("gui/nav_primary_hover.png", 16, 16)
style confirm_yes_button_text is confirm_button_text:
    idle_color "#ffffff"


################################################################################
## 跳过提示 / 通知
################################################################################

## 跳过提示：左上角一枚胶囊，三个点循环点亮
transform skip_dot(delay):
    alpha 0.25
    pause delay
    block:
        linear 0.3 alpha 1.0
        linear 0.6 alpha 0.25
        pause 0.3
        repeat

screen skip_indicator():
    zorder 100
    frame:
        style "hud_pill_frame"
        xpos 30
        ypos gui.skip_ypos
        hbox:
            spacing 6
            yalign 0.5
            text _("跳过中") style "hud_pill_text"
            text "·" style "hud_pill_text" at skip_dot(0.0)
            text "·" style "hud_pill_text" at skip_dot(0.2)
            text "·" style "hud_pill_text" at skip_dot(0.4)

## 通知（存档成功等）：从左上滑入，停留后淡出
transform notify_appear:
    on show:
        alpha 0 xoffset -24
        easeout 0.28 alpha 1.0 xoffset 0
    on hide:
        easein 0.35 alpha 0.0

screen notify(message):
    zorder 100
    frame:
        style "hud_pill_frame"
        at notify_appear
        xpos 30
        ypos gui.notify_ypos
        hbox:
            spacing 10
            yalign 0.5
            add "gui/icon_bond.png" yalign 0.5
            text "[message!tq]" style "hud_pill_text"
    timer 3.25 action Hide('notify')

style hud_pill_frame is default:
    background Frame("gui/hud_chip.png", 12, 12)
    padding (16, 0)
    ysize 40

style hud_pill_text is text:
    size 20
    color "#e8def5"
    yalign 0.5
