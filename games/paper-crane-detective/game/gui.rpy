################################################################################
## 《沉默侦探：千纸鹤的约定》—— GUI 配置
## gui.rpy
## 深紫悬疑 + 千纸鹤母题。素材见 gui/，由 tools/gen_gui.py 生成。
## 字体见 fonts/（开发用黑体，发布建议替换为思源黑体/霞鹜文楷等开源字体）。
################################################################################

init offset = -2

init python:
    gui.init(1280, 720)


################################################################################
## 字体
################################################################################

## 字体：Noto Sans SC / Noto Serif SC（= 思源黑体 / 思源宋体，SIL OFL 1.1，可随游戏商用发布，
## 许可见 fonts/LICENSE-OFL.txt）。正文与界面用黑体；标题、名字框、章节卡用宋体粗体做"书卷/悬疑"气质。
define gui.text_font = "fonts/NotoSansSC-Regular.otf"
define gui.name_text_font = "fonts/NotoSerifSC-Bold.otf"
define gui.interface_text_font = "fonts/NotoSansSC-Regular.otf"
define gui.button_text_font = "fonts/NotoSansSC-Regular.otf"
define gui.bold_font = "fonts/NotoSansSC-Bold.otf"
define gui.title_font = "fonts/NotoSerifSC-Bold.otf"

## 文本断行规则：中文按字符断行（screens.rpy 中 style default 会引用此项）
define gui.language = "japanese-normal"

define gui.text_size = 30
define gui.name_text_size = 30
define gui.interface_text_size = 28
define gui.label_text_size = 30
define gui.notify_text_size = 22
define gui.title_text_size = 64


################################################################################
## 配色（深紫悬疑）
################################################################################

define gui.accent_color = '#cbb0e6'
define gui.idle_color = '#a892c4'
define gui.idle_small_color = '#8a7aa0'
define gui.hover_color = '#f0e2ff'
define gui.selected_color = '#ffffff'
define gui.insensitive_color = '#8a7aa055'

define gui.interface_text_color = '#e8def5'
define gui.muted_color = '#5a4a78'
define gui.hover_muted_color = '#7a6498'

define gui.text_color = '#f2ecf8'


################################################################################
## 主菜单与游戏菜单
################################################################################

define gui.main_menu_background = "gui/main_menu.png"
define gui.game_menu_background = "gui/game_menu.png"


################################################################################
## 对话框
################################################################################

define gui.textbox_height = 200
define gui.textbox_yalign = 1.0

## 名字框骑在对话框上沿（ypos 为负），把对话框内部的高度全部留给正文
define gui.name_xpos = 300
define gui.name_ypos = -22
define gui.name_xalign = 0.0

define gui.namebox_width = 360
define gui.namebox_height = 56
define gui.namebox_borders = Borders(20, 8, 20, 8)
define gui.namebox_tile = False

## 正文区：左侧圆章区（x=71..219, y=548..696）显示说话角色 148×148 情绪头像徽章，正文从 300 起、宽 940，
## 28 号字一行约 33 个汉字；正文自 y=40 起，四行（约 128px）到 y≈168，仍在快捷菜单（y≥174）之上。
define gui.dialogue_text_size = 28
define gui.dialogue_xpos = 300
define gui.dialogue_ypos = 40
define gui.dialogue_width = 940
define gui.dialogue_text_xalign = 0.0


################################################################################
## 按钮
################################################################################

## 基础按钮背景。
## 注意：Ren'Py 默认 gui.button_background = "gui/button/[prefix_]background.png"，
## 但本项目没有 gui/button/ 目录，缺省会导致设置页等使用基础 button style 的界面
## （radio/check/slider/mute 等）因找不到图片而崩溃。这里统一显式定义。
define gui.button_background = None
define gui.button_width = None
define gui.button_height = None
define gui.button_borders = Borders(12, 8, 12, 8)
define gui.button_tile = False
define gui.button_text_size = 30
define gui.button_text_idle_color = gui.idle_color
define gui.button_text_hover_color = gui.hover_color
define gui.button_text_selected_color = gui.selected_color
define gui.button_text_insensitive_color = gui.insensitive_color
define gui.button_text_xalign = 0.0

## 剧情选项按钮
define gui.choice_button_width = 920
define gui.choice_button_height = 64
define gui.choice_button_tile = False
define gui.choice_button_borders = Borders(40, 14, 40, 14)
define gui.choice_button_text_font = gui.text_font
define gui.choice_button_text_size = 28
define gui.choice_button_text_idle_color = '#d8c8ee'
define gui.choice_button_text_hover_color = '#ffffff'
define gui.choice_button_text_xalign = 0.5


################################################################################
## 框架与滑块
################################################################################

define gui.frame_borders = Borders(12, 12, 12, 12)
define gui.confirm_frame_borders = Borders(60, 60, 60, 60)
define gui.skip_frame_borders = Borders(24, 8, 80, 8)
define gui.notify_frame_borders = Borders(24, 8, 60, 8)

define gui.bar_size = 14
define gui.scrollbar_size = 6
define gui.slider_size = 30

define gui.unscrollable = "hide"


################################################################################
## 导航 / 标题
################################################################################

define gui.navigation_xpos = 60
define gui.navigation_spacing = 6

define gui.skip_ypos = 12
define gui.notify_ypos = 64

define gui.choice_spacing = 22

define gui.history_height = 140
define gui.history_name_xpos = 180
define gui.history_text_xpos = 200
define gui.history_text_width = 800

define gui.nvl_height = 115


################################################################################
## 快捷栏 quick menu
################################################################################

## 窗口图标在 options.rpy 中统一定义（gui/window_icon.png）
