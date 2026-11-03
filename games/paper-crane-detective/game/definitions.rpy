## 《沉默侦探：千纸鹤的约定》—— 角色定义、变量与系统
## definitions.rpy

################################################################################
## 一、角色定义（Character）
################################################################################

# 主角名可由玩家输入，默认"陈默"
default player_name = "陈默"

## 所有角色共用的默认值（重定义 adv 让每个 Character() 自动继承）：
##   · ctc：对话显示完毕后，对话框右下角出现呼吸闪烁的小纸鹤，提示"点击继续"（见 screens.rpy 的 image ctc_blink）
##   · ctc_position="fixed"：指示器固定在对话框角落，不跟随文字末尾跳动
init -5 python:
    adv = Character(kind=adv, ctc="ctc_blink", ctc_position="fixed")

    def _mo_note_cb(event, interact=True, **kwargs):
        """墨墨在笔记本上写字时，自动触发轻柔的钢笔沙沙声（快进或已有音效播放时不打断）"""
        if event == "begin" and interact and not config.skipping:
            if renpy.get_screen("evidence_book") is not None and not renpy.sound.is_playing():
                renpy.sound.play("audio/sfx_write.ogg")

## image=<立绘 tag>：说话人高亮用。角色开口时，屏幕上其他立绘会稍暗、稍灰（见下文 _SpeakFX），
## 玩家不看名字框也知道是谁在说话。无立绘的角色不填。
define mc      = Character("[player_name]", color="#8cc0e6", who_outlines=[(1, "#000")], image="mc")
# 墨墨：女主角。她几乎不说话，旁白会描述她"写在笔记本上的话/在艾丽丝耳边的耳语"
define mo      = Character("墨墨", color="#cfa6f0", who_outlines=[(1, "#000")], image="mo")
# 墨墨笔记本上的字（特殊呈现，带提笔写字环境音回调）
define mo_note = Character("墨墨（笔记）", color="#b99ad8", what_italic=True, what_prefix="「", what_suffix="」", image="mo", callback=_mo_note_cb)
define alice   = Character("艾丽丝", color="#f0c060", who_outlines=[(1, "#000")], image="alice")
define zhang   = Character("张子谦", color="#86d6a2", who_outlines=[(1, "#000")], image="zhang")
define lvfu    = Character("吕芙", color="#dcb488", who_outlines=[(1, "#000")], image="lvfu")
define zhouke  = Character("周可", color="#f0a4b8", who_outlines=[(1, "#000")], image="zhouke")
define wang    = Character("王老师", color="#c0c0cc", who_outlines=[(1, "#000")], image="wang")
define lin     = Character("小林", color="#a8cfe0", who_outlines=[(1, "#000")], image="lin")
define joker   = Character("Joker", color="#f0665a", who_outlines=[(1, "#000")], image="joker")
define xiang   = Character("向言", color="#b0b0d8", who_outlines=[(1, "#000")], image="xiang")
define banzhang= Character("班长", color="#d2bc9a", who_outlines=[(1, "#000")], image="banzhang")
define teacher = Character("校长", color="#bdbdc4", who_outlines=[(1, "#000")], image="teacher")
define qun     = Character("众人", color="#c4c4c4")

## 居中字幕（日期地点 / 章节卡 / 结局卡）改走专用屏幕 centered_say：
## 有压暗遮罩、装饰线、入场动画，并隐藏快捷栏与 HUD。statement_name 必须保留为 say-centered，
## 这样 config.window_auto_hide 才会在字幕期间收起对话框。
init 1 python:
    store.centered = Character(None, what_style="centered_text", window_style="centered_window",
                               statement_name="say-centered", screen="centered_say", ctc=None, slow=False)

# —— 配角（v6 补齐专属胸像立绘与侧边头像：外婆、张阿姨、高社长、许编辑、黄老师、小卖部阿姨）——
define waipo        = Character("外婆", color="#c9b8a0", who_outlines=[(1, "#000")], image="waipo")
define zhangma      = Character("张阿姨", color="#d0a070", who_outlines=[(1, "#000")], image="zhangma")
define shezhang     = Character("高社长", color="#8aa0b0", who_outlines=[(1, "#000")], image="shezhang")
define bianji       = Character("许编辑", color="#9a8ab0", who_outlines=[(1, "#000")], image="bianji")
define huang        = Character("黄老师", color="#b09090", who_outlines=[(1, "#000")], image="huang")
define ayi          = Character("小卖部阿姨", color="#c0a080", who_outlines=[(1, "#000")], image="ayi")
# —— 无立绘的群演 / 回忆角色（只出声音，见 设计文档/03_剧本扩写规范与分章大纲.md）——
define jingcha      = Character("警察", color="#7080a0")
define zhuchi       = Character("主持人", color="#c0b070")
define jizhe        = Character("记者", color="#a0a0a0")
define tongxue      = Character("同学", color="#999999")
define shengyin     = Character("？", color="#999999")
define mo_young     = Character("小雪", color="#b8a0d8", what_italic=True)
define zhouke_young = Character("小可", color="#d8a0b0", what_italic=True)
define zhoufu       = Character("周叔叔", color="#a0b0a0", what_italic=True)
define mofu         = Character("墨承远", color="#808090", what_italic=True)
define momu         = Character("陆嫣", color="#a08090", what_italic=True)
# 纯旁白（无名字框）
define narrator = Character(None, what_italic=False)
# 系统提示（用于推理/线索/玩法说明）
define sysmsg     = Character("【系统】", color="#e8e8f0", what_color="#cfe8ff")

################################################################################
## 二、好感度 & 进度变量
################################################################################

default mo_favor    = 0       # 墨墨好感（核心）
default alice_favor = 0       # 艾丽丝信任
default kako_clue   = 0       # 过去线索数（拼合墨墨真相）
default truth_route = False   # 是否走真相暗线（第三章开关）
default fail_count  = 0       # 推理失误累计（影响 BE）
default intuition   = 3       # "直觉"次数（推理重试资源）

# 进度/剧情标记
default got_signed_book = False   # 是否拿到父亲签名本
default crane_given     = False   # 序章是否折千纸鹤给墨墨
default honest_gift     = False   # 第一章是否郑重地送出签名本（影响张子谦的评价）
default suspect_zhouke  = False   # 是否怀疑周可
default chapter_reached = 0       # 已到达章节（用于章节选择/调试）
default te_cleared      = False   # 是否已达成真结局（隐藏结局解锁标记）

# 艾丽丝信任达到该值后，推理卡壳时她会主动给出提示（见 label alice_hint）
define ALICE_HINT_THRESHOLD = 8

# 线索栏（证据库）
default evidence = []

################################################################################
## 二·补 persistent 跨周目进度（章节选择 / 结局收集画廊读取）
##   显式声明默认值，避免任何首次读取时的 AttributeError，并便于阅读与维护。
################################################################################

default persistent.chapter_reached = 0   # 跨周目已解锁的最高章节
default persistent.te_cleared      = False  # 是否通关真结局（解锁隐藏结局）
default persistent.end_te          = False  # 已达成：真结局
default persistent.end_he          = False  # 已达成：好结局
default persistent.end_ne          = False  # 已达成：普通结局
default persistent.end_be          = False  # 已达成：坏结局
default persistent.end_hidden      = False  # 已达成：隐藏结局

################################################################################
## 三、玩法辅助函数（Python）
################################################################################

init python:

    def _hud_visible():
        # 只有对局内（HUD 已显示）才弹反馈，避免在测试探针 / 菜单里乱弹
        return renpy.get_screen("evidence_book") is not None

    def add_favor(target, amount):
        """增减好感度，带数值钳制；墨墨好感变化时在右上角 HUD 旁弹一个浮动数字"""
        global mo_favor, alice_favor
        if target == "mo":
            mo_favor = max(0, min(100, mo_favor + amount))
            if amount and _hud_visible():
                renpy.show_screen("favor_pop", amount)
        elif target == "alice":
            alice_favor = max(0, min(100, alice_favor + amount))

    def add_evidence(name):
        """收集线索/证据：新线索入手时左上角弹提示条并播放一声轻响"""
        if name not in evidence:
            evidence.append(name)
            if _hud_visible():
                renpy.sound.play("audio/sfx_clue.ogg")
                renpy.show_screen("clue_toast", name)

    def has_evidence(name):
        return name in evidence

    def all_evidence(names):
        """本章调查是否已收集齐全（用于解锁"开始推理"）"""
        return all(n in evidence for n in names)

    def add_kako():
        """增加过去线索计数（通往真结局的四片碎片），同步触发创伤闪回视觉脉冲"""
        global kako_clue
        kako_clue += 1
        if _hud_visible():
            renpy.sound.play("audio/sfx_clue.ogg")
            renpy.show_screen("trauma_pulse")
            renpy.show_screen("clue_toast", "关于墨墨过去的线索 · %d / 4" % kako_clue, "过去的碎片")
        if kako_clue >= 4:
            ach_grant("ach_kako")

    def add_fail():
        """累计一次推理失误"""
        global fail_count
        fail_count += 1


# 结局判定（终章调用）
init python:
    def decide_ending():
        """返回结局 label 名"""
        # BE 触发：推理失误≥2 次，或对墨墨足够冷漠（好感<45）。
        # v2 扩写后的实测（tests/autoplay.rpy 四条策略）：
        #   全选最优 ≈ 100 / 不说怀疑 ≈ 98 / 推理全对其余首末交替 ≈ 66 / 全选最差 ≈ 30。
        # 阈值 45 / 80 让"冷漠路线"真正落入 BE、中庸路线稳进 NE、认真经营的路线才到 HE/TE。
        if fail_count >= 2 or mo_favor < 45:
            return "ending_be"
        if mo_favor >= 80 and kako_clue >= 4 and truth_route:
            return "ending_te"
        if mo_favor >= 80:
            return "ending_he"
        return "ending_ne"


################################################################################
## 四、立绘 / 背景（程序化生成的 PNG，见 images/，由 tools/gen_art.py 产出）
##    若日后补充更精细的美术，直接覆盖同名 images/xxx.png 即可
################################################################################

# —— 角色立绘（统一胸像构图，18 名角色 × 8 种表情 = 144 张胸像 + 144 枚对话框侧边徽章头像）——
# 表情系统：每个角色支持 neutral / happy / sad / shock / angry / blush / think / smile 八种表情。
# 每个角色是独立的图片 tag（mo / alice / wang ...），这样多个角色可以同时在场。
# 用法：   show mo neutral at center     # 明确回到平静表情
#          show alice happy at right     # 指定表情
#          hide wang
# 注意：不要写不带表情的 show mo —— Ren'Py 会沿用上一次的表情而不是回到 neutral。
# 素材由 tools/slice_sprites.py 从 素材/ 里的绿幕表情表抠像切片产出（chara_<key>_<expr>.png），
# 全员都是"头顶到胸口"的胸像，头部约占图高 45%。
## 立绘统一缩放：每张立绘按"目标高度 = 屏幕高度的 78%"等比缩放、底部对齐，
## 头部大小与视线高度一致；下方约 200px 被对话框遮住，正好落在胸口裁切线附近。
## 立绘的两层"光"：
##   1) 环境光：按当前 bg 的色调 / 明暗给立绘一点偏暖或偏冷、略压暗（参数表 lighting.rpy 由 tools/bg_lighting.py 生成），
##      让立绘不再像贴在背景上的剪纸；换背景时 0.5s 平滑过渡。
##   2) 说话人高亮：正在说话的角色保持原亮度，其他在场立绘压暗 20%、去 25% 饱和，切换 0.25s 过渡；
##      旁白 / 无立绘角色说话时全员恢复正常。依赖 Character(image=<tag>) 与 renpy.get_say_image_tag()。
init python:
    class _SpeakFX(object):
        def __init__(self, tag):
            self.tag = tag
            self.v = 0.0
            self.lift = 0.0
            self.cur = [1.0, 1.0, 1.0, 0.0]
            self.last = None

        def __call__(self, trans, st, at):
            speaking = renpy.get_say_image_tag()
            target = 0.0 if (speaking is None or speaking == self.tag) else 1.0
            lift_target = 1.0 if speaking == self.tag else 0.0
            dt = 0.0 if self.last is None else max(0.0, min(0.1, st - self.last))
            self.last = st
            if self.v < target:
                self.v = min(target, self.v + dt / 0.25)
            elif self.v > target:
                self.v = max(target, self.v - dt / 0.25)
            if self.lift < lift_target:
                self.lift = min(lift_target, self.lift + dt / 0.18)
            elif self.lift > lift_target:
                self.lift = max(lift_target, self.lift - dt / 0.22)

            bg = renpy.get_attributes("bg")
            tint, br = BG_LIGHT.get(bg[0] if bg else None, ((1.0, 1.0, 1.0), 0.0))
            goal = [tint[0], tint[1], tint[2], br]
            moving = False
            for i in range(4):
                d = goal[i] - self.cur[i]
                if abs(d) < 0.002:
                    self.cur[i] = goal[i]
                else:
                    self.cur[i] += max(-dt * 2.0, min(dt * 2.0, d))
                    moving = True

            r, g, b, cb = self.cur
            trans.yoffset = -4.5 * self.lift
            trans.zoom = 1.0 + 0.012 * self.lift
            trans.matrixcolor = (TintMatrix(Color(rgb=(r, g, b)))
                                 * BrightnessMatrix(cb - 0.20 * self.v)
                                 * SaturationMatrix(1.0 - 0.25 * self.v))
            return 0 if (moving or self.v != target or self.lift != lift_target) else 0.05

## 极轻微的呼吸与头部微动（4 秒一个周期、幅度 0.6%），让静态立绘"活着"；底部对齐，所以只会向上微微起伏
transform sprite_breathe:
    subpixel True
    block:
        ease 2.0 zoom 1.006 yoffset -1
        ease 2.0 zoom 1.0 yoffset 0
        repeat

## 角色微演出动作（可在 show <char> <expr> at center, sprite_jump 等语句中叠加）
transform sprite_jump:
    subpixel True
    easeout 0.12 yoffset -18
    easein 0.14 yoffset 0

transform sprite_nod:
    subpixel True
    easeout 0.14 yoffset 10
    easein 0.16 yoffset 0

transform sprite_tremble:
    subpixel True
    linear 0.04 xoffset -4
    linear 0.04 xoffset 4
    linear 0.04 xoffset -3
    linear 0.04 xoffset 3
    linear 0.04 xoffset 0

## 舞台镜头演出（用于推理揭晓、对峙高潮、特写推进：show layer master at cam_zoom_in / cam_reset）
transform cam_zoom_in:
    subpixel True
    xalign 0.5 yalign 0.46
    easeout 0.55 zoom 1.06

transform cam_zoom_close:
    subpixel True
    xalign 0.5 yalign 0.42
    easeout 0.65 zoom 1.10

transform cam_pan_left:
    subpixel True
    yalign 0.48
    easeout 0.50 zoom 1.05 xalign 0.35

transform cam_pan_right:
    subpixel True
    yalign 0.48
    easeout 0.50 zoom 1.05 xalign 0.65

transform cam_reset:
    subpixel True
    easein 0.45 zoom 1.0 xalign 0.5 yalign 0.5

## 全屏 CG 电影级推拉镜头（用于高冲击力 CG 演出：show cg xxx at cg_zoom_dramatic）
transform cg_zoom_slow:
    subpixel True
    xalign 0.5 yalign 0.45
    zoom 1.0
    ease 6.0 zoom 1.06

transform cg_zoom_dramatic:
    subpixel True
    xalign 0.5 yalign 0.42
    zoom 1.08
    easeout 0.75 zoom 1.0

transform cg_pan_up:
    subpixel True
    xalign 0.5 yalign 0.65
    zoom 1.05
    easeout 1.4 yalign 0.38 zoom 1.0

## 场景背景电影级缓推 / 揭示镜头（用于序章与关键章节开场的背景动态呼吸感）
transform bg_kenburns_out:
    subpixel True
    xalign 0.5 yalign 0.5
    zoom 1.055
    easeout 3.2 zoom 1.0

transform bg_kenburns_in:
    subpixel True
    xalign 0.5 yalign 0.5
    zoom 1.0
    block:
        ease 14.0 zoom 1.04
        ease 14.0 zoom 1.0
        repeat

## 高冲击闪白 / 猩红快门转场
define flash_shutter = Fade(0.04, 0.02, 0.22, color="#ffffff")
define flash_crimson = Fade(0.05, 0.03, 0.35, color="#8a1428")
define flash_bulb    = Fade(0.06, 0.03, 0.30, color="#fff6dc")

init python:
    _SPRITE_TARGET_H = int(config.screen_height * 0.78)  # 约 561px

    def _sprite(path, tag=None):
        # 等比缩放到目标高度（fit="contain" 保证不裁剪、不变形），再叠说话人高亮与呼吸
        base = Transform(path, fit="contain", ysize=_SPRITE_TARGET_H)
        if tag is None:
            return base
        return At(base, sprite_breathe, Transform(function=_SpeakFX(tag)))

## 立绘站位：在内置 left / center / right 上加入场与退场动画——
## 首次出现时从下方 14px 淡入上浮（0.32s），hide 时淡出下沉（0.25s）；
## 换表情或快进连续 show 触发 replace 时立即确保 alpha 1.0 yoffset 0，防止快进打断 on show 导致立绘隐形。
transform left:
    xalign 0.0 yalign 1.0
    alpha 1.0 yoffset 0
    on show:
        alpha 0.0 yoffset 14
        easeout 0.32 alpha 1.0 yoffset 0
    on replace:
        alpha 1.0 yoffset 0
    on hide:
        easein 0.25 alpha 0.0 yoffset 14

transform center:
    xalign 0.5 yalign 1.0
    alpha 1.0 yoffset 0
    on show:
        alpha 0.0 yoffset 14
        easeout 0.32 alpha 1.0 yoffset 0
    on replace:
        alpha 1.0 yoffset 0
    on hide:
        easein 0.25 alpha 0.0 yoffset 14

transform right:
    xalign 1.0 yalign 1.0
    alpha 1.0 yoffset 0
    on show:
        alpha 0.0 yoffset 14
        easeout 0.32 alpha 1.0 yoffset 0
    on replace:
        alpha 1.0 yoffset 0
    on hide:
        easein 0.25 alpha 0.0 yoffset 14

init python:
    _CHARA_KEYS = ["mc", "mo", "alice", "zhang", "lvfu", "zhouke",
                   "wang", "joker", "xiang", "lin", "banzhang", "teacher",
                   "waipo", "zhangma", "shezhang", "bianji", "huang", "ayi"]
    _CHARA_EXPRS = ["neutral", "happy", "sad", "shock", "angry", "blush", "think", "smile"]

    ## 想临时隐藏某个角色（例如立绘返工中），把它从 _VISIBLE_CHARA 里去掉即可，
    ## 该角色的所有 show 语句会指向透明占位，画面不显示但不报错。
    _VISIBLE_CHARA = list(_CHARA_KEYS)
    _BLANK_SPRITE = Null()  # 透明占位，show 时什么都不显示

    for _k in _CHARA_KEYS:
        if _k in _VISIBLE_CHARA:
            # 默认侧边头像（角色未在舞台 show 或无表情属性时，如第一人称主角 mc 或 CG 期间说话）
            renpy.image("side %s" % _k, "images/side_%s_neutral.png" % _k)
        for _e in _CHARA_EXPRS:
            if _k in _VISIBLE_CHARA:
                renpy.image("%s %s" % (_k, _e), _sprite("images/chara_%s_%s.png" % (_k, _e), tag=_k))
                renpy.image("side %s %s" % (_k, _e), "images/side_%s_%s.png" % (_k, _e))
            else:
                # 隐藏角色：所有表情都指向透明空图
                renpy.image("%s %s" % (_k, _e), _BLANK_SPRITE)

# 兼容旧引用：墨墨对话框侧头像别名
image side mo_side  = "images/side_mo.png"

# —— 背景（程序化场景插画）——
image bg library     = "images/bg_library.png"
image bg library_office = "images/bg_library_office.png"
image bg storeroom   = "images/bg_storeroom.png"
image bg classroom   = "images/bg_classroom.png"
image bg corridor    = "images/bg_corridor.png"
image bg rooftop     = "images/bg_rooftop.png"
image bg clubroom    = "images/bg_clubroom.png"
image bg hall        = "images/bg_hall.png"
image bg gate        = "images/bg_gate.png"
image bg booksigning = "images/bg_booksigning.png"
image bg home        = "images/bg_home.png"
image bg black       = Solid("#000000")
image bg white       = Solid("#ffffff")
image bg sunset      = "images/bg_sunset.png"
image bg agency      = "images/bg_agency.png"
image bg oldbuilding = "images/bg_oldbuilding.png"
# v2 扩写新增场景
image bg street      = "images/bg_street.png"       # 校外住宅区林荫街道·傍晚
image bg oden        = "images/bg_oden.png"         # 张记关东煮小店内·夜
image bg mohouse     = "images/bg_mohouse.png"      # 墨墨外婆家楼下巷口·夜
image bg riverside   = "images/bg_riverside.png"    # 河堤·黄昏
image bg canteen     = "images/bg_canteen.png"      # 食堂二楼·中午（间章）

# —— 四年前旧案闪回专属记忆滤镜场景（褪色怀旧 / 冷调旧案氛围）——
image bg memory_hall      = Transform("images/bg_hall.png", matrixcolor=SaturationMatrix(0.28) * TintMatrix("#d8c8b0") * BrightnessMatrix(-0.08))
image bg memory_home      = Transform("images/bg_home.png", matrixcolor=SaturationMatrix(0.25) * TintMatrix("#cbb8a0") * BrightnessMatrix(-0.10))
image bg memory_riverside = Transform("images/bg_riverside.png", matrixcolor=SaturationMatrix(0.35) * TintMatrix("#e0c4a8") * BrightnessMatrix(-0.06))
image bg memory_corridor  = Transform("images/bg_corridor.png", matrixcolor=SaturationMatrix(0.22) * TintMatrix("#a8b4c8") * BrightnessMatrix(-0.14))
image bg memory_storeroom = Transform("images/bg_oldbuilding.png", matrixcolor=SaturationMatrix(0.20) * TintMatrix("#9aa4b8") * BrightnessMatrix(-0.16))
image bg memory_gate      = Transform("images/bg_gate.png", matrixcolor=SaturationMatrix(0.22) * TintMatrix("#98a8be") * BrightnessMatrix(-0.15))
image bg memory_classroom = Transform("images/bg_classroom.png", matrixcolor=SaturationMatrix(0.25) * TintMatrix("#b0bcc8") * BrightnessMatrix(-0.12))
image bg memory_mohouse   = Transform("images/bg_mohouse.png", matrixcolor=SaturationMatrix(0.30) * TintMatrix("#c8b8a4") * BrightnessMatrix(-0.08))

# —— CG 关键剧情插画（全屏 1280×720，共 42 张，见 tools/place_generated.py）——
# 用法： scene cg crane with dissolve
image cg oden_warm       = "images/cg_oden_warm.png"        # 序章人物CG：张阿姨递出热气腾腾的关东煮
image cg meet            = "images/cg_meet.png"             # 序章人物CG：图书馆夕阳书架间初遇抱书的墨墨
image cg crane           = "images/cg_crane.png"            # 序章：递出歪歪的千纸鹤
image cg lvfu            = "images/cg_lvfu.png"             # 第一章人物CG：夕阳百叶窗下抱紧译作含泪的吕芙
image cg storeroom       = "images/cg_storeroom.png"        # 第一章：储物间六号箱的银色磁条
image cg medal           = "images/cg_medal.png"            # 第一章高潮：铜质奖牌「致勇敢的小侦探」与坠落的书
image cg alice_hand      = "images/cg_alice_hand.png"       # 第一章女主CG：闭馆后图书馆艾丽丝伸出手掌邀约「万事屋的嘴」
image cg signing         = "images/cg_signing.png"          # 第一章：夕阳下递签名本
image cg alice           = "images/cg_alice.png"            # 第一章人物CG：艾丽丝在万事屋托腮执笔摊开代价簿
image cg agency          = "images/cg_agency.png"           # 间章一：万事屋的代价簿
image cg zhang           = "images/cg_zhang.png"            # 第二章人物CG：张子谦在晨光银杏走廊翻看情报本
image cg banzhang_letter = "images/cg_banzhang_letter.png"  # 第二章女主CG：班长林思思攥着剪报恐吓信红了眼眶
image cg rooftop         = "images/cg_rooftop.png"          # 第二章：挡风的便当盒盖
image cg lin             = "images/cg_lin.png"              # 第二章人物CG：林依依在黄昏窗边抱紧登记板欲言又止
image cg joker           = "images/cg_joker.png"            # 第二章人物CG：Joker 手持黄铜钥匙与卡牌
image cg letter          = "images/cg_letter.png"           # 第二章高潮：恐吓信背面惊现「还回来」
image cg alice_sunset    = "images/cg_alice_sunset.png"     # 第二章女主CG：旧社团楼夕阳走廊艾丽丝抱着账本讲述四年前
image cg mo_note         = "images/cg_mo_note.png"          # 第二章女主CG：放学后空教室夕阳下墨墨第一次主动推来笔记本
image cg deduction       = "images/cg_deduction.png"        # 第三章：红线与放大镜
image cg mo_tears        = "images/cg_mo_tears.png"         # 第三章女主CG：墨墨抚过旧照片第一次无声落泪与手帕
image cg zhouke_gate     = "images/cg_zhouke_gate.png"      # 第三章女主CG：傍晚校门口路灯下周可微笑提问「墨墨幸福吗」
image cg riverbank       = "images/cg_riverbank.png"        # 第三章：河堤长椅上的粉纸鹤
image cg banzhang_curry  = "images/cg_banzhang_curry.png"   # 间章二女主CG：食堂二楼班长林思思请客咖喱饭与墨墨写下「咖喱很好」
image cg lin_strip       = "images/cg_lin_strip.png"        # 间章二女主CG：傍晚图书馆林依依与墨墨无声的贴磁条比赛
image cg dusk            = "images/cg_dusk.png"             # 间章二 / 普通结局：靠窗的第四年
image cg umbrella        = "images/cg_umbrella.png"         # 间章二：雨夜林荫道同伞
image cg lecture         = "images/cg_lecture.png"          # 第四章：礼堂追光下的举手提问
image cg lvfu_sign       = "images/cg_lvfu_sign.png"        # 第四章女主CG：签售会吕芙捧着《月亮与六便士》签名扉页喜极而泣
image cg xiang           = "images/cg_xiang.png"            # 第四章人物CG：父亲向言在签售台前停笔题写扉页
image cg mo_library_date = "images/cg_mo_library_date.png"  # 第四章女主CG：夕阳书架间墨墨抱着两本译作画下歪翅膀纸鹤与笑脸
image cg gingertea       = "images/cg_gingertea.png"        # 第四章 / 好结局：外婆家的热姜茶
image cg past            = "images/cg_past.png"             # 第五章：四年前的相册
image cg waipo           = "images/cg_waipo.png"            # 第五章人物CG：外婆在暖黄台灯下轻抚旧木盒中的白纸鹤
image cg news            = "images/cg_news.png"             # 第五章高潮：四年前《城市晚报》与雨夜警灯下的小雪
image cg confront        = "images/cg_confront.png"         # 终章：旧仓库对峙
image cg crisis          = "images/cg_crisis.png"           # 终章高潮：崩断钢索与倾倒货架千钧一发
image cg zhouke          = "images/cg_zhouke.png"           # 终章人物CG：周可在旧仓库天光下攥着千纸鹤落泪
image cg badend          = "images/cg_badend.png"           # 坏结局：雨暮空桌上的旧纸鹤
image cg promise         = "images/cg_promise.png"          # 好结局：无言的千纸鹤
image cg voice           = "images/cg_voice.png"            # 真结局：夕阳下墨墨第一次开口
image cg reunion         = "images/cg_reunion.png"          # 真结局：相拥而泣
image cg secondcrane     = "images/cg_secondcrane.png"      # 隐藏结局：两只千纸鹤
