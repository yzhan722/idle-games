## 《沉默侦探：千纸鹤的约定》—— 音频资源定义
## audio.rpy
##
## 所有 BGM / SFX 由 tools/gen_audio.py 程序化生成（纯 Python 合成 → ogg）。
## 这里集中定义别名，剧情脚本里用 `play music bgm_xxx` / `play sound se_xxx` 调用。
## 若要替换为更高品质的真实音乐，把 game/audio/ 下对应 .ogg 换掉即可，别名不变。

################################################################################
## 背景音乐（BGM）
################################################################################

define audio.bgm_theme       = "audio/theme_main.ogg"      # 主菜单主题
define audio.bgm_prologue    = "audio/prologue_calm.ogg"   # 序章·宁静悬疑
define audio.bgm_suspense    = "audio/suspense_light.ogg"  # 轻悬疑·推理日常
define audio.bgm_mystery     = "audio/mystery_tense.ogg"   # 紧张推理·密室/恐吓
define audio.bgm_daily       = "audio/daily_morning.ogg"   # 日常清晨·教室
define audio.bgm_warm        = "audio/warm_piano.ogg"      # 温暖钢琴·亲子/约会
define audio.bgm_storm       = "audio/storm_coming.ogg"    # 暴风前夜·高潮
define audio.bgm_confront    = "audio/confrontation.ogg"   # 终章对峙
define audio.bgm_te          = "audio/true_ending.ogg"     # 真结局
define audio.bgm_he          = "audio/good_ending.ogg"     # 好结局
define audio.bgm_ne          = "audio/normal_ending.ogg"   # 普通结局
define audio.bgm_be          = "audio/bad_ending.ogg"      # 坏结局
define audio.bgm_hidden      = "audio/hidden_ending.ogg"   # 隐藏结局

################################################################################
## 音效（SFX）
################################################################################

define audio.se_click    = "audio/sfx_click.ogg"     # 通用点击/界面确认
define audio.se_correct  = "audio/sfx_correct.ogg"   # 推理正确
define audio.se_wrong    = "audio/sfx_wrong.ogg"     # 推理错误
define audio.se_crane    = "audio/sfx_crane.ogg"     # 折千纸鹤/温柔提示
define audio.se_shock    = "audio/sfx_shock.ogg"     # 震惊/真相揭示
define audio.se_clue     = "audio/sfx_clue.ogg"      # 线索入手（add_evidence / add_kako 自动播放）
define audio.se_hover    = "audio/sfx_hover.ogg"     # 按钮悬停（界面样式里引用）
define audio.se_ach      = "audio/sfx_ach.ogg"       # 成就解锁
define audio.se_write    = "audio/sfx_write.ogg"     # 墨墨沙沙写字声（mo_note 自动触发 + 剧情调用）
define audio.se_page     = "audio/sfx_page.ogg"      # 翻开笔记本/相册/代价簿/卷宗翻页声
define audio.se_bell     = "audio/sfx_bell.ogg"      # 学校上下课钟声 / 万事屋门铃清脆铜铃声
define audio.se_door     = "audio/sfx_door.ogg"      # 教室/木门/旧仓库门推开与落锁声
define audio.se_footstep = "audio/sfx_footstep.ogg"  # 走廊/楼梯/夜路脚步声
define audio.se_rain     = "audio/sfx_rain.ogg"      # 窗外夜雨/撑伞雨滴环境音

# 同名 sfx_* 别名，方便脚本直接以 play sound sfx_xxx 调用
define audio.sfx_click    = audio.se_click
define audio.sfx_correct  = audio.se_correct
define audio.sfx_wrong    = audio.se_wrong
define audio.sfx_crane    = audio.se_crane
define audio.sfx_shock    = audio.se_shock
define audio.sfx_clue     = audio.se_clue
define audio.sfx_hover    = audio.se_hover
define audio.sfx_ach      = audio.se_ach
define audio.sfx_write    = audio.se_write
define audio.sfx_page     = audio.se_page
define audio.sfx_bell     = audio.se_bell
define audio.sfx_door     = audio.se_door
define audio.sfx_footstep = audio.se_footstep
define audio.sfx_rain     = audio.se_rain

################################################################################
## 便捷封装：带淡入淡出的换曲（避免每章重复写参数）
################################################################################

init python:
    def play_bgm(track, fadein=1.5, fadeout=1.0):
        renpy.music.play(track, fadein=fadein, fadeout=fadeout, loop=True)

    def stop_bgm(fadeout=1.5):
        renpy.music.stop(fadeout=fadeout)
