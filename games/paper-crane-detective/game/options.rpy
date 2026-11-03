## 《沉默侦探：千纸鹤的约定》—— 项目配置
## Ren'Py options.rpy

define config.name = _("沉默侦探：千纸鹤的约定")

define gui.show_name = True

define config.version = "1.0.0"

## 引擎内置字串（无障碍菜单、截图提示、开发者提示等）走 game/tl/schinese/common.rpy 的简体中文翻译；
## 游戏自身的界面文字本来就是中文，不受影响
define config.language = "schinese"

init 10 python:
    import os
    def _zh_screenshot_callback(fn):
        renpy.notify("截图已保存：" + os.path.basename(fn))
    config.screenshot_callback = _zh_screenshot_callback

    ## 鉴赏页"重温结局"用的是回放模式；回放结束后把主菜单主题曲接回来
    def _after_replay():
        renpy.music.play(config.main_menu_music, fadein=1.0, if_changed=True)
    config.after_replay_callback = _after_replay

## 存档缩略图尺寸（与 screens.rpy 里存档位卡片的缩略图框一致）
define config.thumbnail_width = 224
define config.thumbnail_height = 126

## 历史记录条数（引擎默认为 None＝不记录，历史页会一直显示为空）
define config.history_length = 250

## 启动画面：进主菜单前的双幕电影感开场动效（出品卡 + 序曲引言卡，点击任意处可跳过）
transform splash_bg_breathe:
    subpixel True
    zoom 1.04 xalign 0.5 yalign 0.5
    ease 4.2 zoom 1.0

transform splash_emblem_in:
    subpixel True
    alpha 0.0 zoom 1.45 yoffset -28 rotate -8
    easeout 0.85 alpha 0.96 zoom 1.25 yoffset 0 rotate 0
    block:
        easein 1.4 yoffset -5 zoom 1.28
        easeout 1.4 yoffset 5 zoom 1.22
        repeat

transform splash_halo_pulse:
    subpixel True
    alpha 0.0 zoom 0.65
    pause 0.12
    easeout 0.9 alpha 0.32 zoom 2.1
    block:
        easein 1.6 alpha 0.18 zoom 2.35
        easeout 1.6 alpha 0.34 zoom 2.05
        repeat

transform splash_title_in(delay=0.18):
    subpixel True
    alpha 0.0 zoom 1.10 yoffset 14
    pause delay
    easeout 0.75 alpha 1.0 zoom 1.0 yoffset 0

transform splash_rule_expand(delay=0.36, target_zoom=0.78):
    subpixel True
    alpha 0.0 xzoom 0.05
    pause delay
    easeout 0.80 alpha 0.92 xzoom target_zoom

transform splash_light_sweep:
    subpixel True
    xpos -360 ypos 332 alpha 0.0
    pause 0.28
    parallel:
        easeout 1.35 xpos 1320
    parallel:
        linear 0.30 alpha 0.55
        linear 0.75 alpha 0.45
        linear 0.30 alpha 0.0

transform splash_star_drift(x0, y0, dy, period, delay):
    subpixel True
    xpos x0 ypos y0 alpha 0.0
    pause delay
    block:
        parallel:
            ease period ypos (y0 - dy)
        parallel:
            linear (period * 0.25) alpha 0.65
            linear (period * 0.50) alpha 0.35
            linear (period * 0.25) alpha 0.0
        parallel:
            ease (period * 0.5) xoffset 16
            ease (period * 0.5) xoffset -12
        xpos x0 ypos y0 xoffset 0 alpha 0.0
        repeat

transform splash_border_in:
    alpha 0.0
    pause 0.08
    easeout 0.9 alpha 1.0

transform splash_wing_crane_left:
    subpixel True
    xpos 360 ypos 420 zoom 0.42 alpha 0.0 rotate -18
    pause 0.18
    easeout 1.15 xpos 448 ypos 318 alpha 0.72 rotate -6
    block:
        easein 1.5 yoffset -6 xoffset -4 rotate -9
        easeout 1.5 yoffset 6 xoffset 4 rotate -4
        repeat

transform splash_wing_crane_right:
    subpixel True
    xpos 920 ypos 420 zoom 0.42 xzoom -1.0 alpha 0.0 rotate 18
    pause 0.24
    easeout 1.15 xpos 832 ypos 318 alpha 0.72 rotate 6
    block:
        easein 1.5 yoffset -6 xoffset 4 rotate 9
        easeout 1.5 yoffset 6 xoffset -4 rotate 4
        repeat

transform splash_crane_flight_arc:
    subpixel True
    xpos 180 ypos 540 zoom 0.36 alpha 0.0 rotate -16
    pause 0.08
    parallel:
        easeout 2.2 xpos 1060 ypos 165 zoom 0.62 rotate 8
    parallel:
        linear 0.35 alpha 0.88
        linear 1.35 alpha 0.82
        linear 0.50 alpha 0.0

transform splash_letterbox_top:
    ypos -64
    easeout 0.65 ypos 0

transform splash_letterbox_bot:
    ypos 720
    easeout 0.65 ypos 664

transform splash_skip_hint_pulse:
    alpha 0.0
    pause 0.5
    easeout 0.5 alpha 0.65
    block:
        easein 1.2 alpha 0.32
        easeout 1.2 alpha 0.72
        repeat

screen splash_card():
    zorder 200
    add "#07040f"
    add "gui/game_menu.png" alpha 0.44 at splash_bg_breathe
    add Tile("gui/grain.png") alpha 0.05

    ## 背景缓升的微光星尘与远景纸鹤剪影
    add "gui/crane_particle.png" at crane_drift(220, 14.0, 0.32, 0.0)
    add "gui/crane_particle.png" at crane_drift(1040, 16.0, 0.28, 0.4)
    add "gui/crane_particle.png" at splash_wing_crane_left
    add "gui/crane_particle.png" at splash_wing_crane_right
    add Solid("#f4d98a") xysize (3, 3) at splash_star_drift(310, 560, 180, 3.2, 0.1)
    add Solid("#cbb0e6") xysize (4, 4) at splash_star_drift(480, 610, 210, 3.6, 0.3)
    add Solid("#f4d98a") xysize (3, 3) at splash_star_drift(820, 580, 190, 3.4, 0.2)
    add Solid("#e6d4ff") xysize (4, 4) at splash_star_drift(960, 540, 170, 3.0, 0.5)
    add Solid("#f4d98a") xysize (2, 2) at splash_star_drift(640, 620, 220, 3.8, 0.0)
    add Solid("#f4d98a") xysize (3, 3) at splash_star_drift(210, 480, 160, 2.9, 0.2)
    add Solid("#e6d4ff") xysize (3, 3) at splash_star_drift(1080, 500, 175, 3.1, 0.4)

    ## 四周精致双层暗金紫画框线
    frame:
        at splash_border_in
        xfill True
        yfill True
        background None
        padding (28, 24)
        frame:
            xfill True
            yfill True
            background None
            padding (0, 0)
            add Solid("#cbb0e638") xsize 1224 ysize 1 yalign 0.0
            add Solid("#cbb0e638") xsize 1224 ysize 1 yalign 1.0
            add Solid("#cbb0e630") xsize 1 ysize 672 xalign 0.0
            add Solid("#cbb0e630") xsize 1 ysize 672 xalign 1.0

    ## 掠过工作室标题的流光带
    add "gui/title_band.png" xzoom 0.95 yzoom 1.8 at splash_light_sweep

    ## 中央纸鹤呼吸背光晕
    add "gui/crane_particle.png" align (0.5, 0.31) at splash_halo_pulse

    vbox:
        align (0.5, 0.5)
        spacing 10
        add "gui/crane_particle.png" xalign 0.5 at splash_emblem_in
        null height 6
        text "SINGULARITY GAME STUDIO" style "splash_en_kicker" at splash_title_in(0.12)
        text "奇点游戏工作室" style "splash_text" at splash_title_in(0.22)
        null height 2
        add "gui/rule_fade.png" xalign 0.5 at splash_rule_expand(0.36, 0.78)
        null height 6
        hbox:
            xalign 0.5
            spacing 28
            at splash_title_in(0.48)
            hbox:
                spacing 8
                text "剧本" style "splash_credit_role"
                text "高泽坤" style "splash_credit_name"
            text "✦" style "splash_credit_sep"
            hbox:
                spacing 8
                text "AI制作" style "splash_credit_role"
                text "张鹰南" style "splash_credit_name"
        null height 10
        text "P R E S E N T S" style "splash_kicker" at splash_title_in(0.68)

    text "CLICK TO SKIP · 点击任意处跳过":
        size 13
        color "#a894c4"
        kerning 2
        xalign 0.96
        yalign 0.94
        at splash_skip_hint_pulse

screen splash_teaser_card():
    zorder 200
    add "#07040f"
    ## 柔焦暗金紫视觉底图（带缓慢呼吸推镜）
    add Transform("images/cg_dusk.png", matrixcolor=SaturationMatrix(0.35) * TintMatrix("#b896e8") * BrightnessMatrix(-0.22), alpha=0.38) at splash_bg_breathe
    add Tile("gui/grain.png") alpha 0.05

    ## 电影宽银幕上下遮幅（Letterbox）
    add Solid("#05030b") xsize 1280 ysize 56 xpos 0 at splash_letterbox_top
    add Solid("#05030b") xsize 1280 ysize 56 xpos 0 at splash_letterbox_bot
    add Solid("#f4d98a44") xsize 1280 ysize 1 xpos 0 ypos 56 at splash_border_in
    add Solid("#f4d98a44") xsize 1280 ysize 1 xpos 0 ypos 664 at splash_border_in

    ## 掠过天际的弧线千纸鹤与浮光星尘
    add "gui/crane_particle.png" at splash_crane_flight_arc
    add "gui/crane_particle.png" at crane_drift(340, 12.0, 0.30, 0.0)
    add "gui/crane_particle.png" at crane_drift(920, 14.0, 0.26, 0.2)
    add Solid("#f4d98a") xysize (3, 3) at splash_star_drift(420, 520, 180, 2.8, 0.0)
    add Solid("#e6d4ff") xysize (4, 4) at splash_star_drift(640, 560, 210, 3.1, 0.15)
    add Solid("#f4d98a") xysize (3, 3) at splash_star_drift(860, 500, 170, 2.9, 0.3)

    vbox:
        align (0.5, 0.5)
        spacing 14
        text "O V E R T U R E   ·   序 曲" style "splash_kicker" at splash_title_in(0.04)
        add "gui/rule_fade.png" xalign 0.5 at splash_rule_expand(0.08, 0.58)
        null height 6
        text "那些写下来又划掉的话，" style "splash_quote_text" at splash_title_in(0.14)
        text "终有一天，会有人替你说出口。" style "splash_quote_text" at splash_title_in(0.36)
        null height 6
        add "gui/rule_fade.png" xalign 0.5 at splash_rule_expand(0.52, 0.58)

    text "CLICK TO SKIP · 点击任意处跳过":
        size 13
        color "#a894c4"
        kerning 2
        xalign 0.96
        yalign 0.90
        at splash_skip_hint_pulse

style splash_en_kicker is text:
    font gui.bold_font
    size 13
    color "#a892c8"
    kerning 7
    xalign 0.5

style splash_text is text:
    font gui.name_text_font
    size 44
    color "#fbf5ff"
    kerning 8
    outlines [(3, "#120a24", 0, 0), (1, "#cfa6f044", 0, 1)]
    xalign 0.5

style splash_credit_role is text:
    size 17
    color "#a894c4"
    kerning 2
    yalign 0.5

style splash_credit_name is text:
    font gui.name_text_font
    size 21
    color "#f4e8ff"
    kerning 3
    outlines [(2, "#0e081c", 0, 0)]
    yalign 0.5

style splash_credit_sep is text:
    size 18
    color "#f4d98a"
    yalign 0.5

style splash_kicker is text:
    font gui.bold_font
    size 13
    color "#f4d98acc"
    kerning 6
    xalign 0.5

style splash_quote_text is text:
    font gui.name_text_font
    size 26
    color "#ebe0f8"
    kerning 4
    outlines [(2, "#0d0818", 0, 0)]
    xalign 0.5

label splashscreen:
    scene black
    play sound "audio/sfx_crane.ogg"
    show screen splash_card
    with Dissolve(0.55)
    $ renpy.pause(2.5, hard=False)
    hide screen splash_card
    show screen splash_teaser_card
    with Dissolve(0.55)
    $ renpy.pause(1.8, hard=False)
    hide screen splash_teaser_card
    with Dissolve(0.65)
    return

## 引擎内置确认框的英文提示改为中文（Quit / MainMenu / FileAction 等动作都读这些变量）
init python:
    layout.ARE_YOU_SURE = "确定要这样做吗？"
    layout.DELETE_SAVE = "确定要删除这个存档吗？"
    layout.OVERWRITE_SAVE = "这个存档位已有记录，确定要覆盖吗？"
    layout.LOADING = "读取存档后，当前未保存的进度会丢失。\n确定要读取吗？"
    layout.QUIT = "确定要退出游戏吗？"
    layout.MAIN_MENU = "回到主菜单后，当前未保存的进度会丢失。\n确定要返回吗？"
    layout.CONTINUE = "要从上次离开的地方继续吗？"
    layout.END_REPLAY = "确定要结束回放吗？"
    layout.SLOW_SKIP = "确定要开始跳过吗？"
    layout.FAST_SKIP_SEEN = "确定要跳到下一个选项吗？"
    layout.FAST_SKIP_UNSEEN = "确定要跳过未读文本，直接到下一个选项吗？"

## 菜单切换的过场：进出游戏菜单、菜单页之间都用短溶解，避免生硬跳切
define config.enter_transition = Dissolve(0.2)
define config.exit_transition = Dissolve(0.2)
define config.intra_transition = Dissolve(0.15)
define config.after_load_transition = Dissolve(0.3)
define config.end_game_transition = Fade(0.5, 0.5, 0.5)
define config.main_game_transition = Dissolve(0.4)

define gui.about = _p("""
校园推理 × 恋爱 AVG。序章至终章共九段剧情、五种结局与一段隐藏后日谈，约 15 万字。

不说一句话的她（墨墨），与成为她「嘴」的你。她负责看见真相，你负责说出真相。

鉴赏页可重温结局、查看 CG、聆听乐曲与追踪成就；章节选择可从任意章节重玩。
""")

define build.name = "SilentDetective"

## 声音与音乐 ##############################################################

define config.has_sound = True
define config.has_music = True
## 本作在真结局与隐藏结局实装女主角墨墨首次开口语音（game/audio/voice/*.ogg）
define config.has_voice = True

## 主菜单循环播放主题曲（由 tools/gen_audio.py 程序化生成）
define config.main_menu_music = "audio/theme_main.ogg"

## 默认音量（玩家可在设置中调整，仅在全新存档时生效）
## Ren'Py 8.5.3 正确写法：default preferences.volume.<mixer>
## 注意：Ren'Py 内部对音量做对数缩放，0.55 实际输出会被压到约 0.13（几乎听不见），
## 故默认拉到较高值，保证玩家首次就能正常听到。
default preferences.volume.music = 1.0
default preferences.volume.sfx = 1.0
default preferences.volume.voice = 1.0

## 转场：见文件顶部（菜单进出 / 菜单页之间 / 读档后 / 回到主菜单 均为短溶解）

## 窗口管理 ###############################################################

define config.window = "auto"
define config.window_show_transition = Dissolve(.2)
define config.window_hide_transition = Dissolve(.2)

## 文字与跳过 #############################################################

## 默认 50 字/秒的逐字显示（可在设置里拉到最右变为立即显示），配合右下角纸鹤 CTC 提示
default preferences.text_cps = 50
default preferences.afm_time = 15

## 存档 ###################################################################

define config.save_directory = "SilentDetective-1683720000"

## 图标 ###################################################################

define config.window_icon = "gui/window_icon.png"


## 构建配置 ###############################################################

init python:
    build.classify('**~', None)
    build.classify('**.bak', None)
    build.classify('**/.**', None)
    build.classify('**/#**', None)
    build.classify('**/thumbs.db', None)

    ## 项目目录里与游戏运行无关的内容，一律不打进发行包：
    ## 引擎 SDK、历史发行包、素材源文件、工具脚本、设计文档、一键脚本、存档备份
    build.classify('.tmp/**', None)
    build.classify('renpy-8.5.3-sdk/**', None)
    build.classify('dists/**', None)
    build.classify('素材/**', None)
    build.classify('tools/**', None)
    build.classify('设计文档/**', None)
    build.classify('*.md', None)
    build.classify('*.bat', None)
    build.classify('game/_saves_backup/**', None)
    build.classify('game/saves/**', None)
    build.classify('game/cache/**', None)
    build.classify('game/tests/**', None)
    build.classify('tests/**', None)
    build.classify('steam_kit/**', None)
    build.classify('steam_appid.txt', None)

    ## 将编译后的脚本、图片、音频与字体封入 archive.rpa，保护明文 .rpy 剧本与未解锁 CG 原图
    build.classify('game/**.rpy', None)
    build.classify('game/**.rpyc', 'archive')
    build.classify('game/**.png', 'archive')
    build.classify('game/**.jpg', 'archive')
    build.classify('game/**.ogg', 'archive')
    build.classify('game/**.otf', 'archive')
    build.classify('game/**.ttf', 'archive')

    build.documentation('*.html')
    build.documentation('*.txt')
