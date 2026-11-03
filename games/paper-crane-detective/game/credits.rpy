## 结局后的制作人员滚动字幕
## credits.rpy
##   各结局在 return 前 `call credits`；点击任意处可跳过。音乐沿用当前结局 BGM。

init python:
    # (小字说明, 大字内容)；("", "") 为空行
    CREDITS_LINES = [
        ("", "沉默侦探"),
        ("", "千纸鹤的约定"),
        ("", ""),
        ("出品", "奇点游戏工作室"),
        ("", ""),
        ("剧本", "高泽坤"),
        ("", ""),
        ("AI制作", "张鹰南"),
        ("", ""),
        ("角色 · 背景 · CG · 主视觉", "AI 生成 · 逐张精修验收"),
        ("", ""),
        ("音乐 · 音效 · 语音", "程序化编曲 & 神经网络语音母带"),
        ("", ""),
        ("字体", "Noto Sans SC · Noto Serif SC（SIL Open Font License 1.1）"),
        ("", ""),
        ("引擎", "Ren'Py 8.5"),
        ("", ""),
        ("", ""),
        ("特别感谢", "每一位陪墨墨走到这里的你"),
        ("", ""),
        ("", ""),
        ("", "感谢游玩"),
    ]
    CREDITS_LINE_H = 58          # 每行占高（含空行）
    CREDITS_SPEED = 46.0         # 像素 / 秒

    def credits_total_px():
        return len(CREDITS_LINES) * CREDITS_LINE_H + config.screen_height + 80

    def credits_seconds():
        return credits_total_px() / CREDITS_SPEED

transform credits_scroll(px, secs):
    ypos config.screen_height
    linear secs ypos (config.screen_height - px)

screen credits_roll():
    zorder 200
    add "#050309"
    add Tile("gui/grain.png") alpha 0.05
    vbox:
        xalign 0.5
        at credits_scroll(credits_total_px(), credits_seconds())
        for kicker, main in CREDITS_LINES:
            fixed:
                xfill True
                ysize CREDITS_LINE_H
                vbox:
                    xalign 0.5
                    yalign 0.5
                    spacing 2
                    if kicker:
                        text kicker style "credits_kicker"
                    if main:
                        text main style ("credits_main_big" if not kicker and main else "credits_main")
    text _("点击任意处跳过") style "credits_hint"

style credits_kicker is text:
    size 14
    color "#9a86b8"
    kerning 3
    xalign 0.5

style credits_main is text:
    size 22
    color "#e9dcf7"
    xalign 0.5
    layout "nobreak"

style credits_main_big is text:
    font gui.name_text_font
    size 34
    kerning 6
    color "#f6ecff"
    xalign 0.5
    layout "nobreak"

style credits_hint is text:
    size 14
    color "#5e5070"
    xalign 0.99
    yalign 0.98

label credits:
    window hide
    scene bg black
    show screen credits_roll with Dissolve(0.8)
    $ renpy.pause(credits_seconds() + 1.0, hard=False)
    hide screen credits_roll with Dissolve(0.8)
    $ renpy.pause(0.6, hard=True)
    return
