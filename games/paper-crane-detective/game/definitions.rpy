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
default inspected_evidence  = []        # 已翻面查验过背面细节的证物列表
default expanded_evidence   = ""        # 当前在调查手册中翻开查验的证物名
default unlocked_deductions = []        # 已通过双线索拼合推导出的破局结论 ID 列表
default combine_slot_a      = ""        # 双线索逻辑拼合：槽位 A
default combine_slot_b      = ""        # 双线索逻辑拼合：槽位 B
default combine_feedback    = ""        # 拼合结果或艾丽丝吐槽提示文案
default combine_feedback_kind = "idle"  # "idle" | "wrong" | "solved"
default combine_solved_title  = ""      # 当前拼合达成的破局标题

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

    # —— PC-1：证物翻面隐藏细节数据库（覆盖主线全部关键证物，支持番外 DLC 动态注册扩展）——
    EVIDENCE_DETAILS = {
        "监控：仅一人持水桶拖把进过办公室": (
            "墨墨（牛皮纸批注）",
            "监控时间戳显示清洁工进出前后共 15 分钟无人靠近，排除了外人趁乱潜入办公室偷换书单的可能。"
        ),
        "柜子是“被关上”的（主角自述出于好心关柜）": (
            "陈默（现场回忆）",
            "我进门时铁皮柜半掩着，顺手推门时听见清脆的弹簧锁舌咬合声——也就是说，在我关门之前锁舌根本没扣死。"
        ),
        "吕芙待借的书单（送到了柜台）": (
            "墨墨（牛皮纸批注）",
            "便签背面压着一道浅浅的纸箱瓦楞折痕，说明这张待借单曾和待报废装箱的旧书叠放在同一处台面上。"
        ),
        "Joker 比所有人晚到": (
            "陈默（现场勘验）",
            "他冲进走廊时呼吸急促、裤脚沾着操场红土，时间上根本赶不上图书装箱封口的那一刻。"
        ),
        "小林：装箱书单与吕芙待借书都送到过柜台": (
            "墨墨（牛皮纸批注）",
            "两摞书在柜台右侧交汇过三分钟。只要最上面那本滑落半寸，就会被当成待封箱书一并贴上磁条。"
        ),
        "王老师：交接匆忙没听见锁扣声，包裹贴着磁条": (
            "墨墨（牛皮纸批注）",
            "既然贴了防盗磁条却没有触发门口警报，说明那本书从头到尾都没离开过图书馆内部！"
        ),
        "向言亲笔签名的《美丽新世界》": (
            "墨墨（牛皮纸批注）",
            "扉页钢笔墨迹用的是深海蓝防水墨水，顿笔处带着向言习惯性的短促回锋，绝非代签或印刷品。"
        ),
        "张子谦：三班新来的转学生，第一天就打听墨墨": (
            "陈默（搭档手记）",
            "打听的措辞不是好奇八卦，而是精准问了「她是不是还不说话」——对方认识四年前的墨墨。"
        ),
        "剪报来自《城市晚报》四年前的旧报纸": (
            "墨墨（牛皮纸批注）",
            "纸张边缘呈氧化微黄，裁切线笔直锐利，是用美工刀垫着尺子裁下来的；翻过来能看见社会版残留的半截铅字。"
        ),
        "班长称“是有人塞纸条让她找转学生顶班”": (
            "墨墨（牛皮纸批注）",
            "那张传话便签折成了整齐的方块，字迹刻意用左手压扁，真正目的只是把我（或转学生）引到那张课桌前。"
        ),
        "信被人塞进班长抽屉，无人目击": (
            "陈默（现场勘验）",
            "抽屉内侧没有灰尘擦痕，投信人极为熟悉三班午休时前排空置、后门视线盲区的规律。"
        ),
        "小林：图书馆合订本里，四年前《城市晚报》某一期被整版剪走": (
            "墨墨（牛皮纸批注）",
            "被裁走的是四年前十一月十七日第 B2 版——那正是当年刊登「天才小侦探」连续报道与仓库事故的一期。"
        ),
        "Joker：昨天有人在天台水箱后撕旧报纸，碎片与恐吓信同源": (
            "墨墨（牛皮纸批注）",
            "水箱缝隙捡到的残片背面印着半个「还」字偏旁，与恐吓信剪报背面恰好能严丝合缝地拼回同一版面。"
        ),
        "Joker 的预告函会署名+画心，恐吓信没有": (
            "陈默（现场勘验）",
            "Joker 用的樱花粉铜版纸带淡淡香精味，而恐吓信散发着旧报刊室特有的樟脑与陈年油墨味。"
        ),
        "周可：墨墨小学好友，刚转学回三班": (
            "墨墨（牛皮纸批注）",
            "她便当盒里的胡萝卜切成了五角星——四年前周叔叔还在世时，每次给我们做焖饭都会这样切。"
        ),
        "班长：纸条出现的中午，教室后门有一个卷发女生站了二十分钟": (
            "陈默（现场勘验）",
            "后门磨砂玻璃高约一米五五，站在门外恰好能看清班长座位与讲台的值日表。"
        ),
        "门锁完好，只有社长和吕芙有钥匙": (
            "墨墨（牛皮纸批注）",
            "锁芯下方垫白纸轻叩无任何黄铜碎屑，叶片锁无拨动擦痕，可以彻底排除开门潜入或私配钥匙。"
        ),
        "换气窗的插销有新鲜刮痕，曾被打开过": (
            "墨墨（牛皮纸批注）",
            "老式铁插销下沿有一道亮银色新刮痕，窗框积灰被长条硬物蹭开了一道两指宽的凹槽。"
        ),
        "社团活动中途有 2 分钟全员去食堂买饮料": (
            "陈默（现场勘验）",
            "往返小卖部整整一百二十秒，活动室彻底空无一人——足够窗外早已守候的人完成一次精准钩取。"
        ),
        "失窃相册属于谁，无人知晓，凭空出现在社团": (
            "墨墨（牛皮纸批注）",
            "布面相册边角磨损发白，并非社团采购物品；更像是有人先把它混进活动室，再制造一场不得不查的失窃。"
        ),
        "张子谦：案发前后有个瘦小身影在活动室窗外徘徊": (
            "陈默（现场勘验）",
            "窗外墙根正好装有一台废弃空调外机铁架，踩上去就能平视两米高的换气窗！"
        ),
        "排队顺序：吕芙身后紧跟着一个独自排队、戴鸭舌帽的男生": (
            "墨墨（牛皮纸批注）",
            "帽檐压得很低，手里攥着一本未拆塑封的同款纪念版，视线却一直盯着前面吕芙递书的手。"
        ),
        "限量纪念版一百本外观完全相同，只有扉页的签名能分出是谁的": (
            "陈默（现场勘验）",
            "封面与腰封一模一样，只要在合上书页交接的那半秒钟顺手掉包，当事人回座前根本察觉不到。"
        ),
        "许编辑：吕芙身后那人说“小票忘在座位上”，离队后再没回来": (
            "墨墨（牛皮纸批注）",
            "借口找小票退场时，他怀里抱着的已经是签好「赠小芙」扉页的那一本真书了。"
        ),
        "班长：三周前周可曾问“旧楼三楼仓库是不是还锁着”，并说“那就好”": (
            "墨墨（牛皮纸批注）",
            "她在确认舞台是否还保持着封闭状态——就像四年前那间堆满杂物的社区仓库一样。"
        ),
        "校长：表彰奖牌源自一封匿名剪报拼贴信，附四年前旧报": (
            "墨墨（牛皮纸批注）",
            "奖牌、恐吓信、旧相册……所有碎片都在复刻四年前的案发现场，终点只可能是旧教学楼三楼仓库。"
        ),
    }

    def register_evidence_detail(name, observer, detail):
        """供番外篇 DLC 或新章节动态注册证物翻面细节。"""
        EVIDENCE_DETAILS[name] = (observer, detail)

    def get_evidence_detail(name):
        """读取证物翻面批注；若未专门定义则生成符合万事屋风格的严谨通用批注。"""
        if name in EVIDENCE_DETAILS:
            return EVIDENCE_DETAILS[name]
        return ("万事屋勘验批注", "已核对时间线与现场痕迹：「%s」与证人证言之间存在可交叉印证的细节锁链。" % name)

    def uninspected_evidence_count():
        """返回当前已收集但尚未翻面查验的证物数量。"""
        return sum(1 for ev in evidence if ev not in inspected_evidence)

    def toggle_evidence_flip(name):
        """点击证物卡片展开或收起背面细节；首次翻阅自动播放翻页音效并记录高亮状态。"""
        global expanded_evidence
        if name not in inspected_evidence:
            inspected_evidence.append(name)
            renpy.sound.play("audio/sfx_page.ogg")
        else:
            renpy.sound.play("audio/sfx_click.ogg")
        if expanded_evidence == name:
            expanded_evidence = ""
        else:
            expanded_evidence = name

    # —— PC-1：双线索逻辑拼合题库（覆盖序章～第五章核心诡计，亦可传入自定义 target_pair 供 DLC 调用）——
    CASE_DEDUCTION_PUZZLES = [
        {
            "id": "ded_ch0_magnetic",
            "chapter": "序章 · 图书馆疑云",
            "pair": frozenset([
                "小林：装箱书单与吕芙待借书都送到过柜台",
                "王老师：交接匆忙没听见锁扣声，包裹贴着磁条",
            ]),
            "title": "破局推论：错装入箱的待借书",
            "body": "包裹贴着防盗磁条却未触发门禁警报，说明它根本没出馆；两份书单曾在柜台交叠，吕芙待借的那本书是被误封进了待报废纸箱！",
        },
        {
            "id": "ded_ch1_cabinet",
            "chapter": "第一章 · 十五分钟盲区",
            "pair": frozenset([
                "监控：仅一人持水桶拖把进过办公室",
                "柜子是“被关上”的（主角自述出于好心关柜）",
            ]),
            "title": "破局推论：好心关柜制造的锁死假象",
            "body": "监控证实无人潜入作案；铁皮柜原本就没有锁死，是陈默进屋时顺手推门才让弹簧锁舌咔哒咬合，造成「事先上锁」的错觉。",
        },
        {
            "id": "ded_ch2_clipping",
            "chapter": "第二章 · 旧报剪贴信",
            "pair": frozenset([
                "剪报来自《城市晚报》四年前的旧报纸",
                "小林：图书馆合订本里，四年前《城市晚报》某一期被整版剪走",
            ]),
            "title": "破局推论：醉翁之意不在正面文字",
            "body": "恶作剧根本不必专程去裁四年前特定一期的《城市晚报》——寄信人真正想传递的讯息，藏在剪报碎片背面四年前的报道残字里！",
        },
        {
            "id": "ded_ch3_transom",
            "chapter": "第三章 · 活动室伪密室",
            "pair": frozenset([
                "换气窗的插销有新鲜刮痕，曾被打开过",
                "社团活动中途有 2 分钟全员去食堂买饮料",
            ]),
            "title": "破局推论：两分钟换气窗长杆钓物",
            "body": "门锁完好并非真正密室！守在窗外空调架上的人趁全员买饮料的 2 分钟空档拨开换气窗插销，用带钩长杆直接勾走了桌上的桌游与相册。",
        },
        {
            "id": "ded_ch4_bookswap",
            "chapter": "第四章 · 签售会掉包计",
            "pair": frozenset([
                "限量纪念版一百本外观完全相同，只有扉页的签名能分出是谁的",
                "许编辑：吕芙身后那人说“小票忘在座位上”，离队后再没回来",
            ]),
            "title": "破局推论：同款纪念版顺手换书",
            "body": "紧挨在吕芙身后的鸭舌帽男生利用一百本纪念版外观完全相同的盲点，在桌边交接瞬间用空白新书换走了签名本，随后借口找小票金蝉脱壳。",
        },
        {
            "id": "ded_ch5_warehouse",
            "chapter": "第五章 · 四年前的终幕舞台",
            "pair": frozenset([
                "班长：三周前周可曾问“旧楼三楼仓库是不是还锁着”，并说“那就好”",
                "校长：表彰奖牌源自一封匿名剪报拼贴信，附四年前旧报",
            ]),
            "title": "破局推论：旧教学楼三楼仓库重现",
            "body": "从匿名奖牌到剪报恐吓信，每一步都在把墨墨推回四年前的仓库事故；周可提前三周确认旧楼三楼仓库上锁，那里就是她布置的最终现场！",
        },
    ]

    ALICE_WRONG_QUIPS = [
        "唔——这两条线索凑一块儿，连本万事屋社长的账本都算不出因果关系哦！再换一条试试？",
        "方向偏啦，大侦探的「嘴」先生！仔细翻翻证物背面的时间点和物理痕迹，找真正咬合的那一对。",
        "噗，强行把这两条绑在一起的话，墨墨又要在本子上给你画大叉叉了。冷静看清楚矛盾点！",
        "差一点点灵光！想想「现场怎么实现的」和「时间空档在哪里」，选最直接印证彼此的两条线索。",
    ]

    def reset_combine_state():
        global combine_slot_a, combine_slot_b, combine_feedback, combine_feedback_kind, combine_solved_title
        combine_slot_a = ""
        combine_slot_b = ""
        combine_feedback = ""
        combine_feedback_kind = "idle"
        combine_solved_title = ""

    def pick_combine_clue(ev):
        """在双线索拼合面板中点击某条证物：装入空槽或从已装槽位卸下。"""
        global combine_slot_a, combine_slot_b, combine_feedback_kind, combine_feedback
        renpy.sound.play("audio/sfx_click.ogg")
        if combine_slot_a == ev:
            combine_slot_a = ""
        elif combine_slot_b == ev:
            combine_slot_b = ""
        elif not combine_slot_a:
            combine_slot_a = ev
        else:
            combine_slot_b = ev
        if combine_feedback_kind == "wrong":
            combine_feedback_kind = "idle"
            combine_feedback = ""

    def evaluate_deduction_pair(target_pair=None, conclusion_title=None, conclusion_body=None, wrong_hints=None):
        """执行双线索碰撞校验：匹配成功则播放破局演出并产出新结论，不匹配则给出艾丽丝吐槽提示且绝不卡死。"""
        global combine_feedback, combine_feedback_kind, combine_solved_title
        if not combine_slot_a or not combine_slot_b or combine_slot_a == combine_slot_b:
            combine_feedback_kind = "wrong"
            combine_feedback = "请先从下方已收集的线索中挑选两条不同的证物放入槽位 I 与槽位 II 哦。"
            renpy.sound.play("audio/sfx_hover.ogg")
            return

        chosen = frozenset([combine_slot_a, combine_slot_b])

        # 模式 1：剧本 / DLC 指定目标线索对
        if target_pair is not None:
            expected = frozenset(target_pair)
            if chosen == expected:
                combine_feedback_kind = "solved"
                combine_solved_title = conclusion_title or "破局新结论已导出！"
                combine_feedback = conclusion_body or "两条表面孤立的线索在此刻彻底咬合，揭开了现场真正的手法。"
                renpy.sound.play("audio/sfx_correct.ogg")
                renpy.show_screen("deduction_cutin", headline=_("逻辑拼合成功 ——！"), subline="CLUE SYNTHESIS")
                return
            hint_msg = None
            if wrong_hints:
                hint_msg = wrong_hints.get(chosen) or wrong_hints.get(combine_slot_a) or wrong_hints.get(combine_slot_b) or wrong_hints.get("default")
            if not hint_msg:
                idx = (len(combine_slot_a) + len(combine_slot_b)) % len(ALICE_WRONG_QUIPS)
                hint_msg = ALICE_WRONG_QUIPS[idx]
            combine_feedback_kind = "wrong"
            combine_feedback = hint_msg
            renpy.sound.play("audio/sfx_hover.ogg")
            return

        # 模式 2：自由手册思维拼合台（自动匹配序章～第五章 6 组核心破局推论）
        for puz in CASE_DEDUCTION_PUZZLES:
            if chosen == puz["pair"]:
                if puz["id"] not in unlocked_deductions:
                    unlocked_deductions.append(puz["id"])
                combine_feedback_kind = "solved"
                combine_solved_title = puz["title"]
                combine_feedback = puz["body"]
                renpy.sound.play("audio/sfx_correct.ogg")
                renpy.show_screen("deduction_cutin", headline=_("逻辑拼合成功 ——！"), subline="CLUE SYNTHESIS")
                return

        idx = (len(combine_slot_a) + len(combine_slot_b)) % len(ALICE_WRONG_QUIPS)
        combine_feedback_kind = "wrong"
        combine_feedback = ALICE_WRONG_QUIPS[idx]
        renpy.sound.play("audio/sfx_hover.ogg")


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
