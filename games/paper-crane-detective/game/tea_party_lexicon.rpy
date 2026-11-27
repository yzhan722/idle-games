## 《沉默侦探：千纸鹤的约定》—— 侦探社午后茶话会（角色羁绊问答小剧场）与推理社批注辞典
## tea_party_lexicon.rpy
##
## PC-6 鉴赏室双模块扩展（主线剧本与数值 100% 零侵入）：
##   一、「侦探社午后茶话会」：三场可重玩的墨墨与艾丽丝轻喜剧脑筋急转弯 / 古典推理问答番外
##       - T-01 label tea_party_t1：《伯爵红茶里的方糖不在场证明》
##       - T-02 label tea_party_t2：《艾丽丝的零花钱密室之谜》
##       - T-03 label tea_party_t3：《墨墨速写本最后一页的暗号》
##       记录 persistent.tea_party_records（茶会默契度 / 全对金章），三席全通解锁成就 ach_tea_party。
##   二、「推理社批注辞典」：分类与关键词检索的本格诡计 / 物证鉴识 / 旧案—今案伏笔百科（20 词条）
##       每条均附「艾丽丝（毒舌逻辑派批注）」与「墨墨（温柔速写本手写批注）」双人页边批注，
##       涉核心真相词条严格联动 truth_spoiler_unlocked() 防剧透门控，并记录 persistent.lexicon_read。

init python:
    TEA_BADGE_RANK = {
        "": 0,
        "默契茶伴": 1,
        "全对金章": 2,
    }

    TEA_PARTY_SESSIONS = [
        {
            "id": "t1",
            "code": "TEA T-01",
            "label": "tea_party_t1",
            "title": "伯爵红茶里的方糖不在场证明",
            "subtitle": "热茶分层盲点 · 折纸餐巾掩护战",
            "hosts": "艾丽丝 · 墨墨 · 张子谦（客串）",
            "bg_thumb": "bg agency",
            "lighting_note": "万事屋午后暖阳（BG_LIGHT agency 琥珀暖光 + warm 柔调）",
            "summary": "周五放学后的万事屋茶席上，艾丽丝转身去切柠檬片的三分钟里，糖罐少了两块琥珀冰糖；可她舀起墨墨杯口热茶尝了一口却苦涩无糖。未搅拌的杯底与茶碟纸鹤里，藏着一场怕搭档害羞的温柔掩护。",
            "riddle_preview": "3 轮茶席问答：未变甜的表层热茶 → 第二块方糖去向 → 不直接加糖的真正理由",
        },
        {
            "id": "t2",
            "code": "TEA T-02",
            "label": "tea_party_t2",
            "title": "艾丽丝的零花钱密室之谜",
            "subtitle": "上锁账本盲区 · 熬夜社长的乌龙时间差",
            "hosts": "艾丽丝 · 墨墨",
            "bg_thumb": "bg clubroom",
            "lighting_note": "社团活动室晴昼斜阳（BG_LIGHT clubroom 晴窗暖调 + warm 柔光）",
            "summary": "艾丽丝夹在《代价簿》第 48 页里的五十元『草莓千层战略储备金』离奇失踪，而黄铜搭扣锁从午休起便一步未离手腕！沿着那抹粉红色纸角倒推时间线，真凶竟指向昨晚熬夜看推理小说的某位社长本人。",
            "riddle_preview": "3 轮茶席问答：锁扣未动的密室拆解 → 粉红纸角的真实身份 → 保温袋里的终局反转",
        },
        {
            "id": "t3",
            "code": "TEA T-03",
            "label": "tea_party_t3",
            "title": "墨墨速写本最后一页的暗号",
            "subtitle": "书架坐标寻宝 · 折痕几何与两杯半糖",
            "hosts": "墨墨 · 艾丽丝",
            "bg_thumb": "bg sunset",
            "lighting_note": "万事屋晴昼转橘金暮色（BG_LIGHT agency / sunset 暖金余晖）",
            "summary": "秋风掀开牛皮纸速写本最后一页，露出墨墨悄悄画下的『3 → 1 → 4 · 折痕向北 · 两杯半糖』与三枚小涂鸦。顺着书架坐标折出双翼拼字纸鹤，揭开三个人分两杯半方糖的独家默契。",
            "riddle_preview": "3 轮茶席问答：书架三元坐标破译 → 双折痕向北拼字机关 → 『两杯半糖』的羁绊算式",
        },
    ]

    def tea_party_get_def(tid):
        for s in TEA_PARTY_SESSIONS:
            if s["id"] == tid:
                return s
        return TEA_PARTY_SESSIONS[0]

    def tea_party_calc_rapport(mistakes_count):
        m = max(0, int(mistakes_count or 0))
        if m == 0:
            return 100
        return max(64, 100 - m * 12)

    def tea_party_get_record(tid):
        raw = getattr(persistent, "tea_party_records", None)
        if not isinstance(raw, dict):
            raw = {}
            persistent.tea_party_records = raw
        entry = raw.get(tid)
        if not isinstance(entry, dict):
            return {
                "cleared": False,
                "gold_stamp": False,
                "best_rapport": 0,
                "last_rapport": 0,
                "best_badge": "",
                "last_badge": "",
                "replays": 0,
                "best_mistakes": -1,
            }
        return {
            "cleared": bool(entry.get("cleared", False)),
            "gold_stamp": bool(entry.get("gold_stamp", False)),
            "best_rapport": int(entry.get("best_rapport", 0) or 0),
            "last_rapport": int(entry.get("last_rapport", 0) or 0),
            "best_badge": str(entry.get("best_badge", "") or ""),
            "last_badge": str(entry.get("last_badge", "") or ""),
            "replays": int(entry.get("replays", 0) or 0),
            "best_mistakes": int(entry.get("best_mistakes", -1) if entry.get("best_mistakes") is not None else -1),
        }

    def tea_party_cleared_count():
        return sum(1 for s in TEA_PARTY_SESSIONS if tea_party_get_record(s["id"])["cleared"])

    def tea_party_gold_count():
        return sum(1 for s in TEA_PARTY_SESSIONS if tea_party_get_record(s["id"])["gold_stamp"])

    def tea_party_avg_rapport():
        cleared_vals = [
            tea_party_get_record(s["id"])["best_rapport"]
            for s in TEA_PARTY_SESSIONS
            if tea_party_get_record(s["id"])["cleared"]
        ]
        if not cleared_vals:
            return 0
        return int(round(float(sum(cleared_vals)) / len(cleared_vals)))

    def tea_party_total_replays():
        return sum(tea_party_get_record(s["id"])["replays"] for s in TEA_PARTY_SESSIONS)

    def tea_party_record_clear(tid, mistakes_count=0):
        """记录茶话会通关、茶会默契度与全对金章，并在三席全通时解锁成就 ach_tea_party。"""
        mistakes = max(0, int(mistakes_count or 0))
        cur_rapport = tea_party_calc_rapport(mistakes)
        cur_badge = "全对金章" if mistakes == 0 else "默契茶伴"
        raw = getattr(persistent, "tea_party_records", None)
        if not isinstance(raw, dict):
            raw = {}
        prev = tea_party_get_record(tid)
        prev_best_badge = prev["best_badge"]
        if TEA_BADGE_RANK.get(cur_badge, 0) >= TEA_BADGE_RANK.get(prev_best_badge, 0):
            new_best_badge = cur_badge
        else:
            new_best_badge = prev_best_badge
        new_gold = bool(prev["gold_stamp"] or (mistakes == 0))
        new_best_rapport = max(prev["best_rapport"], cur_rapport)
        prev_m = prev["best_mistakes"]
        new_best_m = mistakes if (prev_m < 0 or mistakes < prev_m) else prev_m
        updated = {
            "cleared": True,
            "gold_stamp": new_gold,
            "best_rapport": new_best_rapport,
            "last_rapport": cur_rapport,
            "best_badge": new_best_badge,
            "last_badge": cur_badge,
            "replays": prev["replays"] + 1,
            "best_mistakes": new_best_m,
        }
        new_map = dict(raw)
        new_map[tid] = updated
        persistent.tea_party_records = new_map
        persistent.tea_party_selected = tid
        renpy.save_persistent()
        if tea_party_cleared_count() >= len(TEA_PARTY_SESSIONS):
            ach_grant("ach_tea_party")
        return updated

    def tea_party_launch_action(tid):
        sdef = tea_party_get_def(tid)
        return [
            SetField(persistent, "tea_party_selected", sdef["id"]),
            SetField(persistent, "extras_tab", "teaparty"),
            Function(stop_all_gramophone_ambience, True),
            Replay(sdef["label"], scope={"player_name": persistent.last_player_name or "陈默"}, locked=False),
        ]

    # =========================================================================
    # 二、推理社批注辞典（古典本格诡计 / 法医与物证常识 / 旧案—今案核心伏笔批注）
    # =========================================================================

    LEXICON_CATEGORIES = [
        ("all",        "全部词条"),
        ("classical",  "古典本格诡计"),
        ("forensics",  "法医与物证常识"),
        ("foreshadow", "旧案—今案伏笔"),
    ]

    LEXICON_QUICK_TAGS = [
        ("",       "全部"),
        ("密室",   "密室"),
        ("不在场", "不在场"),
        ("磁条",   "磁条"),
        ("色温",   "色温"),
        ("笔迹",   "笔迹"),
        ("纸鹤",   "纸鹤"),
    ]

    LEXICON_ENTRIES = [
        # —— 分类一：古典本格诡计（7 条）——
        {
            "id": "lex_c01",
            "code": "C-01",
            "category": "classical",
            "title": "伪密室 · 事后落锁错觉",
            "public_title": "伪密室 · 事后落锁错觉",
            "case_ref": "第一章《消失的包裹》· 图书管理办公室铁皮柜",
            "public_summary": "现场门锁完好并非作案者穿墙而过，而是案发时原本半掩未锁，由事后入场的无辜发现者顺手推门触发弹簧锁舌。",
            "body": "古典密室讲义中最经典的心理盲点之一：当证人一致作证『发现失窃时柜门紧锁』，调查者往往默认作案发生在落锁之后。第一章里，图书管理办公室的铁皮柜在王老师匆忙离开时并未扣死锁舌，反倒是误闯办公室的陈默出于好心顺手带门，那声清脆的『咔哒』咬合声把开放现场包装成了密室假象。",
            "alice_note": "十桩校园密室里有八桩败给『热心路人顺手关门』！某个转学生开学第一天就把自己关成了头号嫌疑人，本社长已经写进万事屋反面教材第一页啦。",
            "mo_note": "听见弹簧锁舌『咔哒』一声的时候，你其实只是想帮忙把翘起的柜门关好。温柔的举动不该变成困住自己的锁。",
            "spoiler": False,
            "keywords_public": "密室 弹簧锁 铁皮柜 第一章 落锁",
        },
        {
            "id": "lex_c02",
            "code": "C-02",
            "category": "classical",
            "title": "机械延伸 · 换气窗远距钓物",
            "public_title": "机械延伸 · 换气窗远距钓物",
            "case_ref": "第三章《无主相册》· 桌游社高处换气窗与空调外机架",
            "public_summary": "正门叶片锁毫无拨动痕迹且钥匙未离身时，利用高处换气窗、通风口与长杆钩具即可在百二十秒空档内完成无足迹取物。",
            "body": "约翰·狄克森·卡尔『密室讲义』中典型的室外机械操作变体：不必踏入房间半步，只要窗外存在可借力的废弃空调铁架，作案者便能趁社团全员下楼买饮料的两分钟真空期拨开两米高的换气窗插销，用前端弯折的长杆直接将桌边相册钓出窗外，制造出『门锁完好却凭空蒸发』的奇迹感。",
            "alice_note": "只盯着门锁眼看的侦探连三流都算不上！稍微抬一下下巴看看两米高的换气窗插销——那道亮银色新刮痕比霓虹灯还要显眼好吗！",
            "mo_note": "窗框积灰上那道两指宽的凹痕压得很轻，钩走相册的人动作很小心，没有刮破布面封皮，也没有弄掉里面夹着的任何一张照片。",
            "spoiler": False,
            "keywords_public": "密室 换气窗 钓物 桌游社 第三章",
        },
        {
            "id": "lex_c03",
            "code": "C-03",
            "category": "classical",
            "title": "双钟表错位 · 时间戳盲区不在场",
            "public_title": "双钟表错位 · 时间戳盲区不在场",
            "case_ref": "委托信箱 M-01《图书馆消失的借书卡》· 回墨章与门禁流水",
            "public_summary": "利用主观填报的纸质签到簿与客观运转的日期印章、红外门禁之间的校时边界，凭空制造十余分钟的不在场证明真空。",
            "body": "时刻表派推理的核心拆解原则在于『区分主观时间证言与客观物理时标』。纸质入室登记簿上的『17:05』可以由当事人随意顺延填写，但图书委员每天 17:00 整准时调拨的紫色回墨日期章（仍停留在昨日 11.14）与秒级同步的红外门禁计次器不会撒谎，两相交叉便能精准揪出被抹去的十一分钟。",
            "alice_note": "永远别信嫌疑人自己握笔填的签到表！只要拿红外门禁流水和昨日『11.14』紫印泥左右夹击，被藏起来的十一分钟当场现原形！",
            "mo_note": "回墨印章每天五点整翻过一页，就像阅览室窗外准时落下的夕阳，不会替匆忙的心事隐瞒时刻。",
            "spoiler": False,
            "keywords_public": "不在场 时间戳 门禁 回墨章 借书卡",
        },
        {
            "id": "lex_c04",
            "code": "C-04",
            "category": "classical",
            "title": "同款载体 · 交接半秒掉包计",
            "public_title": "同款载体 · 交接半秒掉包计",
            "case_ref": "第四章《签售会风波》· 一百册同版纪念译作",
            "public_summary": "当现场流通着大量外观完全一致的同版书籍或信封时，无需藏匿目标，只需在视线交接盲区以空白同款完成等价替换。",
            "body": "切斯特顿式『森林藏叶』在盗窃诡计中的经典应用：限量纪念版一百册《月亮与六便士》封面、腰封与开本分毫不差，唯一区别锁在合起的扉页签名里。排在目标身后的作案者手捧拆封空白新书，趁合书递还的半秒钟顺手对调，随后借口寻找购书小票从容离队，让失主直到回座翻页才察觉异样。",
            "alice_note": "腰封一对齐、书脊一并拢，连当事人抱在怀里都发现不了内页换了芯！所以贵重签名本在人群里离手绝对不能超过零点五秒！",
            "mo_note": "虽然一百本书封面一模一样，但向言先生停笔写下『赠小芙』时那一划墨迹的温度，是任何空白新书都换不走的。",
            "spoiler": False,
            "keywords_public": "掉包 签售会 盲点 第四章 纪念版",
        },
        {
            "id": "lex_c05",
            "code": "C-05",
            "category": "classical",
            "title": "边界封锁 · 馆内错箱隐匿术",
            "public_title": "边界封锁 · 馆内错箱隐匿术",
            "case_ref": "序章～第一章 · 防盗磁条门禁与储物间六号报废箱",
            "public_summary": "当出口防盗门禁确认未曾报警时，消失的目标必然仍留在封闭边界内部，关键在于排查『合法容器』的分类错置。",
            "body": "本格推理中的『负向证据（狗在夜间没有叫）』：既然失踪包裹贴有完好的银色防盗磁条，而图书馆出口警报从头到尾未曾响起，就从物理上锁死了书籍仍在馆内。与其大海捞针搜查书包，不如还原柜台三分钟内『待借书』与『待报废装箱书』的交叠轨迹——最安全的地方正是贴满同类磁条的六号报废纸箱。",
            "alice_note": "福尔摩斯听不见狗叫就知道是熟人，我们墨墨听不见防盗门响就知道书还在馆里！这叫用排除法把整座图书馆变成透明玻璃盒！",
            "mo_note": "待借书单背面那道浅浅的瓦楞纸箱压痕，把两摞书在柜台并排靠在一起的三分钟悄悄记了下来。",
            "spoiler": False,
            "keywords_public": "磁条 容器 纸箱 图书馆 负向证据",
        },
        {
            "id": "lex_c06",
            "code": "C-06",
            "category": "classical",
            "title": "无接触媒介 · 借善意传话布局",
            "public_title": "无接触媒介 · 借善意传话布局",
            "case_ref": "序章顶班纸条与第二章班级传话链条",
            "public_summary": "幕后布局者不直接露面，而是将指令伪装成常规班级便签交给尽责的班干部执行，从而彻底切断现场目击关联。",
            "body": "社会派与校园日常推理结合的心理操控手法：如果亲自出面邀请目标值日，势必留下长相与声音记忆；但只要趁午休将一张折成方块的匿名便签放在讲台点名册旁，一贯认真负责的班长便会自然而然代为安排转学生替补上岗，使传话人本身成为毫无察觉的『不在场屏障』。",
            "alice_note": "越是一板一眼的老好人班干部，越容易被一张折得方方正正的假便签借走执行力——以后没盖万事屋火漆章的条子统统不许替人传话！",
            "mo_note": "林思思班长后来在走廊红着眼眶道歉了好几次，其实被人利用善意并不是她的错。她中午请大家吃的咖喱饭非常香。",
            "spoiler": False,
            "keywords_public": "不在场 便签 传话 心理 序章",
        },
        {
            "id": "lex_c07",
            "code": "C-07",
            "category": "classical",
            "title": "心理孤岛 · 无锁暴风雪山庄变体",
            "public_title": "心理孤岛 · 【终章封闭舞台结构词条】",
            "case_ref": "第五章～终章 · 旧教学楼三楼原社区储物间",
            "public_summary": "涉及终章封闭现场与古典『暴风雪山庄』变体结构的深层解析，通关 TRUE END 或手动开启剧透后可查阅完整批注。",
            "body": "传统暴风雪山庄依赖断桥、孤岛或风雪完成物理隔绝；而本作终章则构筑了一座罕见的『自愿型心理孤岛』——旧教学楼三楼仓库没有绑架绳索，周可仅凭一句『两点半，只见你』与一比一复刻的四年前货架陈设，便让背负四年愧疚的墨墨主动写下『不要找我』踏入房间。困住当事人的从来不是铁锁，而是未曾说出口的赎罪执念。",
            "alice_note": "明明没有铁链也没有迷药，某个笨蛋却留下一句『不要找我』自己往旧教学楼钻……哼，还好陈默和张子谦冲上三楼够快，不然本社长罚你们抄一百遍社规！",
            "mo_note": "因为逃避了四年，那把锁其实一直挂在我自己心里。推开门看见你们喘着气追进天光里的那一刻，四年前的冬天才真正融化了。",
            "spoiler": True,
            "keywords_public": "密室 舞台 古典 结构",
        },

        # —— 分类二：法医与物证常识（7 条）——
        {
            "id": "lex_f01",
            "code": "F-01",
            "category": "forensics",
            "title": "新闻纸木质素氧化与背面铅字拼合",
            "public_title": "新闻纸木质素氧化与背面铅字拼合",
            "case_ref": "第二章《剪报恐吓信》· 四年前《城市晚报》B2 版",
            "public_summary": "廉价新闻纸富含木质素，经年存放会产生特征性黄变脆化与樟脑油墨味；通过裁切口与背面残字即可唯一锁定母本合订册。",
            "body": "文书物证鉴识要点：铜版预告卡表面涂布光滑且常带香精，而旧报纸因木质素光氧化反应，四年后切口纤维必然泛黄发脆并吸附期刊室防虫樟脑味。更关键的是双面印刷报纸的『正反同源性』——即使正面只挑拣出零散单字，只要将天台水箱残片与剪报背面半截铅字偏旁对齐，就能像拼图一样还原被裁母版的精确期号。",
            "alice_note": "怪盗 Joker 最讲究排面，用的全是香喷喷的樱花粉铜版纸，怎么可能去裁泛黄掉渣的老报纸？鼻子凑近闻一秒就能排除他啦！",
            "mo_note": "水箱缝隙捡到的半个偏旁拼回剪报背面时，刚好连成那句轻轻的呼喊。有时候，纸张背面藏着的才是寄信人真正想说的话。",
            "spoiler": False,
            "keywords_public": "剪报 纸张 氧化 物证 第二章",
        },
        {
            "id": "lex_f02",
            "code": "F-02",
            "category": "forensics",
            "title": "同色异谱与夕照色温显色错觉",
            "public_title": "同色异谱与夕照色温显色错觉",
            "case_ref": "委托信箱 M-02《美术室未干的群青颜料》· 西晒外廊",
            "public_summary": "颜料呈现的肉眼色彩高度依赖光源光谱分布；在缺乏短波蓝光的浓橙夕阳下，纯正群青会伪装成近乎木炭粉的暗紫灰色。",
            "body": "光学物证常识：群青（Ultramarine）颜料分子强烈反射 450nm 附近的短波蓝光，同时吸收长波橙红光。傍晚西晒外廊被低色温橙红夕阳完全笼罩，入射光中蓝波段近乎为零，群青无法反射蓝光，肉眼便会将其误判为灰黑色的素描炭迹；只需拉开北窗引入高色温散射天光，真实的群青本色便无所遁形。",
            "alice_note": "差点被那家伙指着袖口在夕阳底下蒙混过关！结果墨墨不声不响拉开北窗遮光帘，那抹群青蓝得他当场石化，本社长差点笑出声！",
            "mo_note": "傍晚在窗边画水彩时经常会遇到黄昏偏色。只要换一束干净的天光，被暮色藏起来的颜色就会诚实地显出原貌。",
            "spoiler": False,
            "keywords_public": "色温 光学 颜料 群青 物证",
        },
        {
            "id": "lex_f03",
            "code": "F-03",
            "category": "forensics",
            "title": "丙三醇缓干媒介与织物胶结鉴别",
            "public_title": "丙三醇缓干媒介与织物胶结鉴别",
            "case_ref": "委托信箱 M-02 · 水粉缓干剂与袖口纤维勘验",
            "public_summary": "水粉掺入甘油缓干剂后可延长湿润转印窗口至两小时以上；湿性色浆渗入棉纱会凝成硬挺胶感，与一弹即落的干炭粉截然相反。",
            "body": "微量物证物理检验：普通水粉颜料在通风室温下约二十分钟表干结膜，但美术示范常调入丙三醇（甘油）吸湿缓干剂，使画框擦痕在两小时内依然保持粘手转印力。鉴别织物污渍时，干性木炭粉仅靠静电附着于绒毛表面、轻弹即落灰；而湿性水粉阿拉伯树胶基质会包裹棉纤维经纬，干涸后摸起来发硬板结。",
            "alice_note": "嘴硬喊着是在素描室蹭到了干木炭粉，结果手指弹上去连半粒灰都不往下掉！在物理鉴识面前，一切狡辩都是纸老虎！",
            "mo_note": "隔着纸巾轻轻按一下袖口边缘，就能分清松散的炭粉和发硬的水粉胶。现场留下的触感比借口更可靠。",
            "spoiler": False,
            "keywords_public": "色温 颜料 纤维 甘油 物证",
        },
        {
            "id": "lex_f04",
            "code": "F-04",
            "category": "forensics",
            "title": "空气声速差与有线广播中继重影",
            "public_title": "空气声速差与有线广播中继重影",
            "case_ref": "委托信箱 M-03《钟楼午休的第七声回响》· 波形测距",
            "public_summary": "常温空气声速约 340 米/秒；结合直达钟声耗时与老式校园广播中继延迟，可从录音波形间隔反推出精确的站立坐标。",
            "body": "声学取证计算：报时铜钟半点凸轮仅有六枚机械拨齿，绝无敲响七下的物理可能。然而在距离钟楼 380 米的一楼礼堂东廊，铜钟直达声穿过空气需 1.12 秒，头顶老式广播中继副喇叭则固定慢 2.25 秒播出最末一拍报时，两者相减恰好在第六响后 1.13 秒录下『第七声重影』，连同茶水间开水炉铜浮球阀声一并锁死现场。",
            "alice_note": "拿手机录音伪造天台不在场证明，结果把一楼茶水间烧水壶铜球阀『咔哒』声高清收录进去——年度最佳自投罗网奖非他莫属！",
            "mo_note": "六齿齿轮只会敲六下，多出来的第七声回响，其实是安静的长廊替说谎的人记下的回音。",
            "spoiler": False,
            "keywords_public": "不在场 声速 录音 钟楼 波形",
        },
        {
            "id": "lex_f05",
            "code": "F-05",
            "category": "forensics",
            "title": "运笔回锋特征与非惯用手伪装笔迹",
            "public_title": "运笔回锋特征与非惯用手伪装笔迹",
            "case_ref": "第一章向言扉页签名 · 序章讲台左手方块便签",
            "public_summary": "自然书写的收笔回锋源自长期肌肉记忆；刻意换用非惯用手虽能打乱字形结构，却会暴露起笔微颤、横画下塌与重压折角。",
            "body": "文检笔迹学基础：成年书写者在撇捺收尾与顿笔回锋时的角速度几乎无法模仿，例如向言使用深海蓝防水钢笔题签时特有的短促回锋，一眼即可证伪代签猜测。反之，右利手者若改用左手伪造匿名纸条，由于指腕协同生疏，笔画转折处会刻意压扁字框并留下过重的纸背凹痕，恰恰暴露『执笔者试图隐瞒熟人笔迹』的意图。",
            "alice_note": "大作家向言那手漂亮回锋钢笔字连许编辑隔着半张桌子都能认出来；倒是讲台那张故意用左手压扁字迹的小纸条，一瞧就知道认识收信人！",
            "mo_note": "习惯用右手写字的人换到左手时，横折的地方会不自觉地用力抵住纸面。指尖传过来的紧张感是藏不住的。",
            "spoiler": False,
            "keywords_public": "笔迹 钢笔 便签 鉴识 第一章",
        },
        {
            "id": "lex_f06",
            "code": "F-06",
            "category": "forensics",
            "title": "叶片锁黄铜微屑与金属新旧刮痕氧化",
            "public_title": "叶片锁黄铜微屑与金属新旧刮痕氧化",
            "case_ref": "第三章桌游社门锁白纸叩检与换气窗铁插销",
            "public_summary": "异物拨锁必在锁道内刮落微米级黄铜碎屑；通过金属断面氧化膜暗哑度对比，可准确区分当日新刮痕与陈年磨损。",
            "body": "痕迹检验实务：影视作品中『两根铁丝无痕开锁』并不符合金属摩擦学——凡非原装钥匙探入铜质弹子或叶片锁芯，硬质尖端必在锁槽棱角犁出细微黄铜亮屑，在锁孔下垫白纸轻叩即可检获。同理，老旧铁插销表面覆有灰褐色氧化铁层，唯独数小时内刚被硬物拨动过的受力边沿会露出银白金属新茬。",
            "alice_note": "电视剧里拿根发卡两秒撬开教室门全是骗小孩的！真有人捅过锁眼一定会掉黄铜沫，墨墨垫张白纸轻轻一敲就铁证如山啦！",
            "mo_note": "刚被刮开的铁插销边缘像新削好的铅笔尖一样发亮，和周围暗灰色的旧锈迹放在一起，一眼就能分清先后。",
            "spoiler": False,
            "keywords_public": "密室 门锁 刮痕 氧化 第三章",
        },
        {
            "id": "lex_f07",
            "code": "F-07",
            "category": "forensics",
            "title": "心因性失语与创伤急救黄金八分钟",
            "public_title": "心因性失语与【旧案急救时间窗词条】",
            "case_ref": "第五章～终章 · 四年前 11 月 17 日夜储物间事故",
            "public_summary": "涉及墨墨失声医学成因与四年前旧案急救关键时间窗的法医批注，通关 TRUE END 或手动开启剧透后可查阅全文。",
            "body": "临床心理学与急诊医学交叉注释：当喉部发音器官完好无损，个体在目睹重大伤亡或承受剧烈道德负罪冲击后，大脑语言中枢可能产生保护性抑制，表现为完全性心因性失声（创伤性缄默）。而在重物坍塌挤压引发的创伤性窒息与内出血急救中，最初四至八分钟是决定生死的黄金窗口——墨墨父母为伪造外人撬锁假象而延误拨打急救电话的整整八分钟，直接夺走了周明远原本可获救的生机。",
            "alice_note": "为了保住那点虚荣的节目招牌，居然先忙着伪造撬锁痕迹再打急救电话……那八分钟根本不是天灾意外，而是自私的大人压在两个孩子肩上的重担！",
            "mo_note": "过去四年里，每次想要发出声音，耳边都会响起那八分钟钟表走动的滴答声。直到把真相与对不起亲口说出来，胸口堵着的冰才慢慢化开。",
            "spoiler": True,
            "keywords_public": "法医 心理 时间 医学",
        },

        # —— 分类三：旧案—今案核心伏笔批注（6 条）——
        {
            "id": "lex_s01",
            "code": "S-01",
            "category": "foreshadow",
            "title": "牛皮纸速写本 · 『先写下来再决定说不说』",
            "public_title": "牛皮纸速写本 · 『先写下来再决定说不说』",
            "case_ref": "序章图书馆初遇～全篇核心随身信物",
            "public_summary": "墨墨从不离身的牛皮纸笔记本并非单纯的代聊工具，而是源于童年长辈守护她『不必勉强迎合镜头』的一句温柔约定。",
            "body": "贯穿全篇的第一重人物伏笔：在序章读者初见墨墨时，牛皮纸本看似只是失声少女与外界交流的纸笔媒介；实则早在七年前她被媒体包装成『天才小神探』、连一句『我想回家』都被剪掉时，邻居长辈便送给她第一本牛皮纸本，告诉她把真实想法先写在本子上，想说的时候再开口。四年沉默岁月里，这本速写本替她守住了最诚实的眼睛。",
            "alice_note": "别看墨墨平时在牛皮纸本上画小纸鹤超温柔，一旦陈默推理拐进死胡同，她啪啪画叉叉的手速比本社长翻账本还要快哦！",
            "mo_note": "写在本子上的字不会催促任何人，也不会逼自己说出违心的话。谢谢你每一次都愿意低头把它们认真读完。",
            "spoiler": False,
            "keywords_public": "纸鹤 笔记本 速写本 序章 伏笔",
        },
        {
            "id": "lex_s02",
            "code": "S-02",
            "category": "foreshadow",
            "title": "万事屋《代价簿》 · 不收金钱的刺猬护盾",
            "public_title": "万事屋《代价簿》 · 不收金钱的刺猬护盾",
            "case_ref": "第一章入部契约 · 间章一与番外《艾丽丝的代价账本》",
            "public_summary": "艾丽丝立下『凡委托必付代价』的傲慢社规，实则是用等价契约的玩笑外壳，让同伴不必承受旁人的猎奇与廉价同情。",
            "body": "角色关系暗线伏笔：初看万事屋，艾丽丝动辄翻开厚重《代价簿》索要报酬，仿佛精明小商人；可细查账目却全是『帮贴三百册磁条』『请喝热姜茶』『借二十元买文具』等微不足道的小事。见证过四年前舆论捧杀与流言反噬的艾丽丝深知，唯有把帮助包装成『公平交易』，骄傲而敏感的墨墨才能心安理得地留在温暖的人群中央。",
            "alice_note": "喂喂喂！谁批准你们在严肃的推理辞典里拆本社长的台啦！这叫神圣不可侵犯的商业契约精神，才不是什么心软护盾呢！",
            "mo_note": "《代价簿》第 47 页夹着艾丽丝高一那年替我挡回流言时折皱的书签。社长说话声音越大，心里其实越体贴大家。",
            "spoiler": False,
            "keywords_public": "代价簿 艾丽丝 万事屋 伏笔 契约",
        },
        {
            "id": "lex_s03",
            "code": "S-03",
            "category": "foreshadow",
            "title": "五角星切法的胡萝卜 · 便当盒里的旧识暗码",
            "public_title": "餐盒里的花刀配菜 · 【第二章天台伏笔词条】",
            "case_ref": "第二章天台挡风午餐 · 第三章转学生周可便当盒",
            "public_summary": "涉及第二章至第三章日常餐盒细节与四年前故人身份对应的核心伏笔，通关 TRUE END 或手动开启剧透后可查阅全文。",
            "body": "日常细节草蛇灰线：普通家庭制作焖饭或便当时，胡萝卜多切作滚刀块或圆片；唯独四年前周明远叔叔每次给小雪和小可做焖饭，都会耐心地用小刀把胡萝卜刻成五角星。周可转入三班后特意在便当里重现五角星胡萝卜，既是她对亡父手艺的思念，也是向墨墨投出的第一枚无声认亲信号。",
            "alice_note": "连便当盒里一颗胡萝卜的花刀切法都藏着四年前的记忆暗号……女孩子之间这种不动声色的试探，比十道密码锁还要精细！",
            "mo_note": "那天瞥见便当盒里五角星胡萝卜的瞬间，手里的筷子一下子停住了。小可把周叔叔教过的每一件小事都记得清清楚楚。",
            "spoiler": True,
            "keywords_public": "伏笔 第二章 便当 细节",
        },
        {
            "id": "lex_s04",
            "code": "S-04",
            "category": "foreshadow",
            "title": "剪报背面的『还回来』与粉白双鹤跨年呼应",
            "public_title": "双面剪报与折纸信物 · 【第二至五章暗线词条】",
            "case_ref": "第二章旧报残片 · 第三章河堤粉纸鹤 · 第五章木盒白纸鹤",
            "public_summary": "涉及剪报背面隐藏字句及粉色与白色两只千纸鹤跨越四年的因果闭环，通关 TRUE END 或手动开启剧透后可查阅全文。",
            "body": "全篇核心道具双螺旋伏笔：第二章恐吓信正面拼贴『你也会有报应的』看似恶作剧威吓，翻过纸背拼合天台水箱残片却浮现出『还回来』三字——周可索要的并非报复，而是四年前被大人掩盖的真诚道歉。与此同时，事故第四天周可留在门缝的旧粉纸鹤，与外婆旧木盒里墨墨在事故前夜折好的白纸鹤，以及墨墨书包夹层四年间写下的十二封未寄信，共同拼齐了双向奔赴的思念。",
            "alice_note": "正面吓唬外行，背面只写给真正看得懂的人——如果第二章查案时懒得把证物卡片翻过来瞧瞧背面，可就彻底漏掉这条大暗线咯！",
            "mo_note": "书包夹层里那十二封写着『小可亲启』却没有地址的信，终于在四年后的秋天，亲手交到了粉色纸鹤的主人手里。",
            "spoiler": True,
            "keywords_public": "纸鹤 剪报 伏笔 第三章",
        },
        {
            "id": "lex_s05",
            "code": "S-05",
            "category": "foreshadow",
            "title": "礼堂追光下的『代人发声』双代际镜像",
            "public_title": "礼堂追光与嘴替边界 · 【第四章主题镜像词条】",
            "case_ref": "第四章校庆讲座向言抢答 · 终章旧仓库等待墨墨开口",
            "public_summary": "涉及第四章父子冲突如何映射终章『不替墨墨开口』关键抉择的叙事伏笔，通关 TRUE END 或手动开启剧透后可查阅全文。",
            "body": "主题结构最高潮的镜像伏笔：第四章知名作家向言在礼堂追光下习惯性替儿子陈默回答提问，表面是一段父子心结插曲，实则精准映射了全书核心命题——四年前墨承远夫妇替女儿编造破案剧本是控制，向言替儿子抢答是越界；身为万事屋『嘴替』的陈默由此顿悟，在终章仓库对峙的最紧要关头克制住代答冲动，把亲自开口发声的勇气真正交还给墨墨自己。",
            "alice_note": "当时在礼堂台下看见陈默攥紧话筒反问他老爸的那一幕，本社长就晓得这小子彻底开窍了——好搭档是并肩撑腰，绝不是抢台词！",
            "mo_note": "在旧仓库的天光底下，你没有急着替我解释，只是握紧我的手安静等我吸气。因为你在等我，我才终于找回了自己的声音。",
            "spoiler": True,
            "keywords_public": "伏笔 第四章 讲座 主题",
        },
        {
            "id": "lex_s06",
            "code": "S-06",
            "category": "foreshadow",
            "title": "黑布下的电暖器与钢索 · 复刻现场的温柔破绽",
            "public_title": "复刻现场的违和细节 · 【终章旧仓库伏笔词条】",
            "case_ref": "终章《千纸鹤的约定》· 旧教学楼三楼仓库勘验",
            "public_summary": "涉及终章旧仓库现场布置中暴露执棋人真实心意的终极伏笔批注，通关 TRUE END 或手动开启剧透后可查阅全文。",
            "body": "终章现场勘验的逆转伏笔：周可耗时数周将旧教学楼三楼仓库一比一还原成四年前货架将倾的惊险模样，仿佛要重演悲剧；但推理者的眼睛却看穿了三处彻底背叛『恶意』的温柔破绽——黑绒布后提前通电预热的静音电暖器、怕墨墨手劲小而预先拧松半圈的矿泉水瓶盖，以及背后用加粗钢索死死锚定在承重墙上的铁货架。所谓复仇舞台，只是两个受伤女孩笨拙的告别仪式。",
            "alice_note": "摆出全校最吓人的幕后黑手架势，结果连矿泉水瓶盖都怕墨墨拧不开提前旋松半圈……你们两个大笨蛋害本社长白提心吊胆一整天！",
            "mo_note": "水瓶盖轻轻一拧就开了，脚边吹来的暖风就像小时候小可分给我半条围巾那样暖和。原来那四年里，我们谁也没有真正恨过谁。",
            "spoiler": True,
            "keywords_public": "伏笔 终章 仓库 纸鹤",
        },
    ]

    _LEXICON_MAP = {e["id"]: e for e in LEXICON_ENTRIES}

    def lexicon_entry_unlocked(entry):
        if not entry.get("spoiler", False):
            return True
        return bool(truth_spoiler_unlocked())

    def lexicon_get_entry(entry_id):
        if entry_id in _LEXICON_MAP:
            return _LEXICON_MAP[entry_id]
        return LEXICON_ENTRIES[0]

    def _lexicon_read_list():
        raw = getattr(persistent, "lexicon_read", None)
        if not isinstance(raw, list):
            raw = []
            persistent.lexicon_read = raw
        return raw

    def lexicon_is_read(entry_id):
        return entry_id in _lexicon_read_list()

    def lexicon_read_count():
        valid_ids = set(_LEXICON_MAP.keys())
        return sum(1 for eid in set(_lexicon_read_list()) if eid in valid_ids)

    def lexicon_mark_read(entry_id):
        entry = lexicon_get_entry(entry_id)
        if not lexicon_entry_unlocked(entry):
            return False
        cur = list(_lexicon_read_list())
        if entry["id"] not in cur:
            cur.append(entry["id"])
            persistent.lexicon_read = cur
            renpy.save_persistent()
        return True

    def lexicon_toggle_read(entry_id):
        entry = lexicon_get_entry(entry_id)
        if not lexicon_entry_unlocked(entry):
            renpy.sound.play("audio/sfx_hover.ogg")
            return False
        cur = list(_lexicon_read_list())
        if entry["id"] in cur:
            cur = [x for x in cur if x != entry["id"]]
        else:
            cur.append(entry["id"])
        persistent.lexicon_read = cur
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.save_persistent()
        return entry["id"] in cur

    def lexicon_category_count(cat_key):
        if cat_key == "all":
            return len(LEXICON_ENTRIES)
        return sum(1 for e in LEXICON_ENTRIES if e["category"] == cat_key)

    def lexicon_category_label(cat_key):
        for k, lbl in LEXICON_CATEGORIES:
            if k == cat_key:
                return lbl
        return "全部词条"

    def lexicon_visible_entries(cat_key=None, query=None):
        """按分类与关键词筛选词条；未解锁剧透时仅匹配公开摘要与公开标签，严防搜索侧信道剧透泄露。"""
        c_key = cat_key if cat_key is not None else (persistent.lexicon_cat_filter or "all")
        q_raw = query if query is not None else (persistent.lexicon_search_query or "")
        q = str(q_raw).strip().lower()
        results = []
        for e in LEXICON_ENTRIES:
            if c_key != "all" and e["category"] != c_key:
                continue
            if q:
                if lexicon_entry_unlocked(e):
                    haystack = " ".join([
                        e["code"],
                        e["title"],
                        e["case_ref"],
                        e["public_summary"],
                        e["body"],
                        e["alice_note"],
                        e["mo_note"],
                        e.get("keywords_public", ""),
                    ]).lower()
                else:
                    haystack = " ".join([
                        e["code"],
                        e["public_title"],
                        e["public_summary"],
                        e.get("keywords_public", ""),
                    ]).lower()
                if q not in haystack:
                    continue
            results.append(e)
        return results

    def lexicon_select_entry(entry_id):
        entry = lexicon_get_entry(entry_id)
        persistent.lexicon_selected_id = entry["id"]
        if lexicon_entry_unlocked(entry):
            lexicon_mark_read(entry["id"])
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.save_persistent()

    def lexicon_set_category(cat_key):
        persistent.lexicon_cat_filter = cat_key
        vis = lexicon_visible_entries(cat_key=cat_key)
        if vis and all(e["id"] != persistent.lexicon_selected_id for e in vis):
            persistent.lexicon_selected_id = vis[0]["id"]
            if lexicon_entry_unlocked(vis[0]):
                lexicon_mark_read(vis[0]["id"])
        renpy.save_persistent()

    def lexicon_set_search(query_str):
        persistent.lexicon_search_query = str(query_str or "").strip()
        vis = lexicon_visible_entries(query=persistent.lexicon_search_query)
        if vis and all(e["id"] != persistent.lexicon_selected_id for e in vis):
            persistent.lexicon_selected_id = vis[0]["id"]
        renpy.save_persistent()

    def lexicon_render_entry_view(entry_id):
        """返回词条的当前可展示视图字典（含防剧透门控遮罩状态），供界面与自动化回归共用。"""
        entry = lexicon_get_entry(entry_id)
        unlocked = lexicon_entry_unlocked(entry)
        if unlocked:
            return {
                "id": entry["id"],
                "code": entry["code"],
                "category": entry["category"],
                "category_label": lexicon_category_label(entry["category"]),
                "unlocked": True,
                "spoiler": bool(entry.get("spoiler", False)),
                "display_title": entry["title"],
                "display_case_ref": entry["case_ref"],
                "display_body": entry["body"],
                "display_alice_note": entry["alice_note"],
                "display_mo_note": entry["mo_note"],
                "is_read": lexicon_is_read(entry["id"]),
            }
        return {
            "id": entry["id"],
            "code": entry["code"],
            "category": entry["category"],
            "category_label": lexicon_category_label(entry["category"]),
            "unlocked": False,
            "spoiler": True,
            "display_title": entry["public_title"],
            "display_case_ref": "涉及旧案与终章核心真相（防剧透保护中）",
            "display_body": entry["public_summary"],
            "display_alice_note": "【艾丽丝批注已遮罩：通关 TRUE END 或点击右上角『解锁剧透』后揭晓毒舌拆解】",
            "display_mo_note": "【墨墨手写批注已遮罩：通关 TRUE END 或点击右上角『解锁剧透』后翻阅速写本内页】",
            "is_read": lexicon_is_read(entry["id"]),
        }


################################################################################
## 鉴赏室界面一：侦探社午后茶话会（角色羁绊问答小剧场）
################################################################################

transform tea_cup_gentle_sway:
    subpixel True
    block:
        ease 2.2 zoom 1.03 yoffset -2
        ease 2.2 zoom 1.0 yoffset 0
        repeat

screen extras_teaparty():
    $ _sel_id = persistent.tea_party_selected or "t1"
    $ _sel = tea_party_get_def(_sel_id)
    $ _sel_rec = tea_party_get_record(_sel["id"])
    $ _cleared_n = tea_party_cleared_count()
    $ _gold_n = tea_party_gold_count()
    $ _avg_rap = tea_party_avg_rapport()
    $ _replays_n = tea_party_total_replays()

    vbox:
        spacing 10

        ## 1. 茶话会总览横幅
        frame:
            style "teaparty_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 12
                    yalign 0.5
                    add "images/ui/icon_tea_party_cup.png" xysize (36, 36) yalign 0.5 at tea_cup_gentle_sway
                    vbox:
                        spacing 2
                        yalign 0.5
                        text _("侦探社午后茶话会 · 角色羁绊问答小剧场") font gui.name_text_font size 19 color "#f6e7c0"
                        text _("墨墨与艾丽丝的午后红茶脑筋急转弯 · 猜错触发趣味吐槽，独立沙盒零死档负担") size 12 color "#b9a6d4" xmaximum 408
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 8
                    frame:
                        style "mailbox_stat_chip"
                        text ("全对金章 %d/%d" % (_gold_n, len(TEA_PARTY_SESSIONS))) size 12 color "#f4d98a" align (0.5, 0.5)
                    frame:
                        style "mailbox_stat_chip"
                        text ("茶会默契 %d%%" % _avg_rap) size 12 color "#f2e6ff" align (0.5, 0.5)

        ## 2. 三席茶话会切换卡（3 × 234 + 2 × 10 = 722px 严丝合缝）
        hbox:
            spacing 10
            for sitem in TEA_PARTY_SESSIONS:
                $ _srec = tea_party_get_record(sitem["id"])
                $ _is_sel = (sitem["id"] == _sel["id"])
                button:
                    style "teaparty_tab_card"
                    selected _is_sel
                    action SetField(persistent, "tea_party_selected", sitem["id"])
                    vbox:
                        spacing 3
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            text sitem["code"] size 12 color ("#f4d98a" if _is_sel else "#a892c2") bold True yalign 0.5
                            if _srec["cleared"]:
                                hbox:
                                    xalign 1.0
                                    yalign 0.5
                                    spacing 4
                                    add ("images/ui/icon_dossier_stamp.png" if _srec["gold_stamp"] else "images/ui/icon_tea_party_cup.png") xysize (15, 15) yalign 0.5
                                    text _srec["best_badge"] size 11 color ("#f4d98a" if _srec["gold_stamp"] else "#86efac") bold True yalign 0.5
                            else:
                                text _("待入席") size 11 color "#7e6d99" xalign 1.0 yalign 0.5
                        text sitem["title"] font gui.name_text_font size 14 color "#f2e6ff"
                        text sitem["subtitle"] size 11 color "#9a86b8"

        ## 3. 当前选中茶席详情舞台
        frame:
            style "teaparty_detail_card"
            vbox:
                spacing 9
                xfill True
                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add _sel["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add "images/ui/icon_riddle_quiz_card.png" xysize (26, 26) xalign 0.05 yalign 0.08
                        if _sel_rec["gold_stamp"]:
                            add "images/ui/icon_dossier_stamp.png" xysize (26, 26) xalign 0.96 yalign 0.08
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text _sel["code"] size 12 color "#ffffff" bold True align (0.5, 0.5)
                            text ("《%s》" % _sel["title"]) font gui.name_text_font size 18 color "#f6e7c0" yalign 0.5
                        text ("同席搭档：%s" % _sel["hosts"]) size 13 color "#cbb0e6"
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (16, 16) yalign 0.5
                            text ("午后光影：%s" % _sel["lighting_note"]) size 12 color "#a892c2" yalign 0.5
                        if _sel_rec["cleared"]:
                            text ("茶席记录：最佳默契度 %d%% · 【%s】 · 已共饮 %d 次" % (_sel_rec["best_rapport"], _sel_rec["best_badge"], _sel_rec["replays"])) size 13 color ("#f4d98a" if _sel_rec["gold_stamp"] else "#86efac")
                        else:
                            text _("茶席记录：尚未入席（三轮问答零失误可获 100% 默契度与【全对金章】）") size 13 color "#8a7aa0"

                frame:
                    xfill True
                    padding (12, 8)
                    background Frame("gui/hud_chip.png", 12, 12)
                    vbox:
                        spacing 4
                        text _sel["summary"] size 14 color "#ebe2f8" line_spacing 3
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_riddle_quiz_card.png" xysize (16, 16) yalign 0.5
                            text _sel["riddle_preview"] size 12 color "#f4d98a" yalign 0.5

                hbox:
                    xfill True
                    yalign 0.5
                    text ("已品茗 %d/3 席（累计 %d 次） · 三席全通解锁成就「红茶与折纸金章」" % (_cleared_n, _replays_n)) size 12 color "#9a86b8" yalign 0.5
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton _("批注辞典"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action SetField(persistent, "extras_tab", "lexicon")
                        textbutton (_("重温茶席") if _sel_rec["cleared"] else _("入席品茶")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 132
                            ysize 36
                            text_size 15
                            action tea_party_launch_action(_sel["id"])

        ## 4. 三席茶话会速览直达列表
        for sitem in TEA_PARTY_SESSIONS:
            $ _sr = tea_party_get_record(sitem["id"])
            frame:
                style "mailbox_quick_row"
                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 10
                        yalign 0.5
                        add ("images/ui/icon_dossier_stamp.png" if _sr["gold_stamp"] else "images/ui/icon_tea_party_cup.png") xysize (20, 20) yalign 0.5
                        text ("%s · %s" % (sitem["code"], sitem["title"])) font gui.name_text_font size 14 color "#f2e6ff" yalign 0.5
                        text ("（%s）" % (("%s · 默契 %d%%" % (_sr["best_badge"], _sr["best_rapport"])) if _sr["cleared"] else "未入席")) size 12 color ("#f4d98a" if _sr["gold_stamp"] else ("#86efac" if _sr["cleared"] else "#7e6d99")) yalign 0.5
                    textbutton (_("再次共饮") if _sr["cleared"] else _("立即入席")):
                        style "gramophone_mini_pill"
                        xalign 1.0
                        yalign 0.5
                        action tea_party_launch_action(sitem["id"])


## 对局内茶席谜题信笺提示横幅（置于顶部居中，与下方对话框及居中选项互不遮挡）
screen tea_riddle_prompt_banner(round_badge, prompt_line):
    zorder 95
    frame:
        xalign 0.5
        ypos 12
        xsize 760
        padding (16, 8)
        background Frame("gui/hud_chip.png", 12, 12)
        hbox:
            spacing 10
            yalign 0.5
            add "images/ui/icon_riddle_quiz_card.png" xysize (24, 24) yalign 0.5
            vbox:
                spacing 1
                text round_badge size 12 color "#f4d98a" bold True
                text prompt_line size 14 color "#f6eeff"


## 茶话会结算印章卡
screen tea_party_result_card(tid, cur_badge, best_badge, cur_rapport, best_rapport, mistakes, replays):
    modal True
    zorder 220
    $ _sdef = tea_party_get_def(tid)
    $ _is_gold = (cur_badge == "全对金章")

    add "#080510d8"
    key "K_RETURN" action Return("back_to_teaparty")
    key "K_SPACE" action Return("back_to_teaparty")
    key "K_ESCAPE" action Return("back_to_teaparty")

    frame:
        xalign 0.5
        yalign 0.5
        xsize 680
        padding (32, 26)
        background Frame("gui/panel_dark.png", 26, 26)
        at panel_pop
        vbox:
            spacing 14
            xfill True
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_tea_party_cup.png" xysize (32, 32) yalign 0.5
                    vbox:
                        spacing 1
                        text (_sdef["code"] + " · 午后茶话会结席记录") size 13 color "#cbb0e6"
                        text ("《%s》" % _sdef["title"]) font gui.name_text_font size 22 color "#f6e7c0"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 8
                    add "images/ui/icon_dossier_stamp.png" xysize (30, 30) yalign 0.5
                    text cur_badge font gui.name_text_font size 21 color ("#f4d98a" if _is_gold else "#86efac") yalign 0.5

            add Frame("gui/title_band.png", 0, 0) xsize 420 ysize 3

            frame:
                xfill True
                padding (16, 12)
                background Frame("gui/panel_card.png", 16, 16)
                vbox:
                    spacing 6
                    if _is_gold:
                        text _("墨墨在茶碟旁的餐巾纸角折出一只金边小纸鹤，艾丽丝满意地为你添满热伯爵茶：三轮脑筋急转弯全部一击猜中，默契满分！") size 15 color "#f2ecf8" line_spacing 3
                    else:
                        text _("艾丽丝笑吟吟地在《代价簿》茶点栏记下一笔欢乐吐槽，墨墨也将温热的红茶推到你手边：热热闹闹的午后问答同样圆满收席！") size 15 color "#f2ecf8" line_spacing 3
                    text ("本席默契度：%d%%（猜偏 %d 次）  ·  历史最高：%d%%【%s】  ·  共饮：%d 次" % (cur_rapport, mistakes, best_rapport, best_badge, replays)) size 13 color "#cbb0e6"

            hbox:
                xalign 1.0
                spacing 10
                textbutton _("返回午后茶话会"):
                    style "pill_button"
                    xminimum 168
                    ysize 40
                    text_size 16
                    action Return("back_to_teaparty")


################################################################################
## 鉴赏室界面二：推理社批注辞典（本格诡计与全篇伏笔辞典）
################################################################################

screen extras_lexicon():
    $ _unlocked = truth_spoiler_unlocked()
    $ _cat = persistent.lexicon_cat_filter or "all"
    $ _query = persistent.lexicon_search_query or ""
    $ _vis_list = lexicon_visible_entries(_cat, _query)
    $ _sel_id = persistent.lexicon_selected_id or "lex_c01"
    if _vis_list and _sel_id not in [e["id"] for e in _vis_list]:
        $ _sel_id = _vis_list[0]["id"]
    $ _view = lexicon_render_entry_view(_sel_id)
    $ _read_n = lexicon_read_count()

    vbox:
        spacing 9

        ## 1. 顶部辞典横幅与防剧透门控联动开关
        frame:
            style "lexicon_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_mystery_lexicon.png" xysize (34, 34) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 468
                        hbox:
                            spacing 8
                            yalign 0.5
                            text _("推理社批注辞典") font gui.name_text_font size 19 color "#f6e7c0" yalign 0.5
                            frame:
                                style "lexicon_mini_badge"
                                text ("已阅书签 %d/%d" % (_read_n, len(LEXICON_ENTRIES))) size 11 color "#f4d98a" align (0.5, 0.5)
                        if persistent.te_cleared:
                            text _("TRUE END 已通关 · 全部本格诡计、物证常识与旧案伏笔双人批注已完整开放。") size 12 color "#d8c8ee"
                        elif persistent.truth_spoiler_confirmed:
                            text _("已手动开启剧透批注 · 当前可查阅全部 20 条诡计与旧案伏笔词条。") size 12 color "#f0a4b8"
                        else:
                            text _("防剧透保护开启中 · 14 条公开词条可直接翻阅，6 条旧案核心词条已自动加密遮罩。") size 12 color "#b9a6d4"
                if not persistent.te_cleared:
                    if persistent.truth_spoiler_confirmed:
                        textbutton _("恢复遮罩"):
                            style "gramophone_mini_pill"
                            xalign 1.0
                            yalign 0.5
                            action [SetField(persistent, "truth_spoiler_confirmed", False), Function(renpy.save_persistent)]
                    else:
                        textbutton _("解锁剧透"):
                            style "gramophone_mini_pill"
                            xalign 1.0
                            yalign 0.5
                            action Show("confirm",
                                        message=_("尚未通关 TRUE END，确定提前揭晓「推理社批注辞典」中的旧案核心剧透词条吗？"),
                                        yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                        no_action=Hide("confirm"))

        ## 2. 分类筛选与关键词检索栏（722px 严丝合缝）
        frame:
            style "lexicon_filter_bar"
            vbox:
                spacing 6
                xfill True
                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 6
                        yalign 0.5
                        for c_key, c_lbl in LEXICON_CATEGORIES:
                            textbutton ("%s (%d)" % (c_lbl, lexicon_category_count(c_key))):
                                style "lexicon_cat_pill"
                                selected (_cat == c_key)
                                action Function(lexicon_set_category, c_key)
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 6
                        if _query:
                            textbutton _("清空"):
                                style "lexicon_tag_chip"
                                action Function(lexicon_set_search, "")
                        textbutton (("检索：%s" % _query[:4].replace("[", "[[").replace("{", "{{")) if _query else _("输入检索")):
                            style "lexicon_cat_pill"
                            selected bool(_query)
                            action Show("lexicon_search_modal")

                hbox:
                    spacing 6
                    yalign 0.5
                    text _("快捷检索：") size 12 color "#9a86b8" yalign 0.5
                    for q_val, q_lbl in LEXICON_QUICK_TAGS:
                        textbutton q_lbl:
                            style "lexicon_tag_chip"
                            selected (_query == q_val)
                            action Function(lexicon_set_search, q_val)
                    text ("匹配 %d 条" % len(_vis_list)) size 12 color "#cbb0e6" xalign 1.0 yalign 0.5

        ## 3. 左右双栏辞典阅读台（248 + 10 + 464 = 722px 零溢出）
        if not _vis_list:
            frame:
                style "lexicon_detail_card"
                xfill True
                vbox:
                    spacing 8
                    xalign 0.5
                    text _("未找到匹配的辞典词条") font gui.name_text_font size 18 color "#f6e7c0" xalign 0.5
                    text _("请尝试清空检索关键词或切换至「全部词条」分类（加密词条在解锁剧透前不会响应剧透词检索）。") size 13 color "#b9a6d4" xalign 0.5
                    textbutton _("重置筛选条件"):
                        style "gramophone_mini_pill"
                        xalign 0.5
                        action [Function(lexicon_set_category, "all"), Function(lexicon_set_search, "")]
        else:
            hbox:
                spacing 10
                ## 左栏：可滚动词条目录（xsize 248）
                frame:
                    style "lexicon_list_frame"
                    viewport:
                        xsize 232
                        ysize 348
                        scrollbars "vertical"
                        mousewheel True
                        draggable True
                        side_yfill True
                        side_spacing 6
                        vbox:
                            spacing 5
                            xsize 216
                            for item in _vis_list:
                                $ _item_open = lexicon_entry_unlocked(item)
                                $ _item_read = lexicon_is_read(item["id"])
                                $ _item_sel = (item["id"] == _view["id"])
                                button:
                                    style "lexicon_entry_row"
                                    selected _item_sel
                                    action Function(lexicon_select_entry, item["id"])
                                    vbox:
                                        spacing 2
                                        xfill True
                                        hbox:
                                            xfill True
                                            yalign 0.5
                                            text item["code"] size 11 color ("#f4d98a" if _item_sel else "#a892c2") bold True yalign 0.5
                                            hbox:
                                                xalign 1.0
                                                yalign 0.5
                                                spacing 4
                                                if not _item_open:
                                                    text _("加密") size 10 color "#f0a4b8" yalign 0.5
                                                elif _item_read:
                                                    add "images/ui/icon_crane_bookmark.png" xysize (12, 12) yalign 0.5
                                                    text _("已阅") size 10 color "#86efac" yalign 0.5
                                        text (item["title"] if _item_open else item["public_title"]) size 13 color ("#f6eeff" if _item_open else "#9a86b8")

                ## 右栏：词条释义与艾丽丝/墨墨双人批注内页（xsize 464）
                frame:
                    style "lexicon_detail_card"
                    xsize 464
                    vbox:
                        spacing 8
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                frame:
                                    style "lexicon_mini_badge"
                                    text ("%s · %s" % (_view["code"], _view["category_label"])) size 11 color "#f4d98a" align (0.5, 0.5)
                            if _view["unlocked"]:
                                button:
                                    style "lexicon_tag_chip"
                                    xalign 1.0
                                    yalign 0.5
                                    action Function(do_quietly, lexicon_toggle_read, _view["id"])
                                    hbox:
                                        spacing 4
                                        align (0.5, 0.5)
                                        add "images/ui/icon_crane_bookmark.png" xysize (13, 13) yalign 0.5
                                        text (_("已夹书签") if _view["is_read"] else _("夹入书签")) size 11 color ("#f4d98a" if _view["is_read"] else "#d8c8ee") yalign 0.5

                        text _view["display_title"] font gui.name_text_font size 18 color "#f6e7c0"
                        text ("关联卷宗：%s" % _view["display_case_ref"]) size 12 color "#cbb0e6"

                        frame:
                            xfill True
                            padding (11, 8)
                            background Frame("gui/hud_chip.png", 12, 12)
                            vbox:
                                spacing 5
                                text _view["display_body"] size 13 color ("#f0e8fa" if _view["unlocked"] else "#b9a6d4") line_spacing 3
                                if not _view["unlocked"]:
                                    hbox:
                                        xfill True
                                        yalign 0.5
                                        text _("通关 TRUE END 后自动解密，亦可点击右侧提前翻阅。") size 11 color "#9a86b8" yalign 0.5
                                        textbutton _("提前解锁"):
                                            style "lexicon_tag_chip"
                                            xalign 1.0
                                            yalign 0.5
                                            action Show("confirm",
                                                        message=_("确定提前揭晓「推理社批注辞典」中的旧案剧透批注吗？"),
                                                        yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(do_quietly, lexicon_mark_read, _view["id"]), Function(renpy.save_persistent)],
                                                        no_action=Hide("confirm"))

                        ## 艾丽丝（毒舌逻辑派批注）
                        frame:
                            style "lexicon_alice_note_box"
                            vbox:
                                spacing 3
                                hbox:
                                    spacing 6
                                    yalign 0.5
                                    add "images/ui/icon_margin_quill_note.png" xysize (16, 16) yalign 0.5
                                    text _("艾丽丝 · 毒舌逻辑派页边批注") size 12 color "#f0c060" bold True yalign 0.5
                                text _view["display_alice_note"] size 12 color ("#fff2d6" if _view["unlocked"] else "#8a7aa0") line_spacing 2

                        ## 墨墨（温柔速写本手写批注）
                        frame:
                            style "lexicon_mo_note_box"
                            vbox:
                                spacing 3
                                hbox:
                                    spacing 6
                                    yalign 0.5
                                    add "images/ui/icon_margin_quill_note.png" xysize (16, 16) yalign 0.5
                                    text _("墨墨 · 牛皮纸速写本手写批注") size 12 color "#cfa6f0" bold True yalign 0.5
                                text _view["display_mo_note"] size 12 color ("#f3e8ff" if _view["unlocked"] else "#8a7aa0") line_spacing 2


## 辞典关键词自由输入弹窗
screen lexicon_search_modal():
    modal True
    zorder 210
    add "#080510cc"
    key "K_ESCAPE" action Hide("lexicon_search_modal")
    key "K_RETURN" action [Function(lexicon_set_search, persistent.lexicon_search_query), Hide("lexicon_search_modal")]

    frame:
        xalign 0.5
        yalign 0.45
        xsize 540
        padding (26, 22)
        background Frame("gui/panel_dark.png", 26, 26)
        at panel_pop
        vbox:
            spacing 12
            xfill True
            hbox:
                spacing 8
                yalign 0.5
                add "images/ui/icon_mystery_lexicon.png" xysize (26, 26) yalign 0.5
                text _("检索推理社批注辞典") font gui.name_text_font size 21 color "#f6e7c0" yalign 0.5
            text _("输入诡计名称、物证术语或章节关键词（如：密室、磁条、色温、笔迹、纸鹤）：") size 13 color "#cbb0e6"
            frame:
                xfill True
                padding (12, 8)
                background Frame("gui/panel_card.png", 16, 16)
                input:
                    value FieldInputValue(persistent, "lexicon_search_query")
                    exclude "[]{}"
                    length 20
                    size 16
                    color "#f6eeff"
            hbox:
                spacing 6
                yalign 0.5
                text _("常用词：") size 12 color "#9a86b8" yalign 0.5
                for q_val, q_lbl in LEXICON_QUICK_TAGS:
                    textbutton q_lbl:
                        style "lexicon_tag_chip"
                        action [Function(lexicon_set_search, q_val), Hide("lexicon_search_modal")]
            hbox:
                xalign 1.0
                spacing 10
                textbutton _("清空关键词"):
                    style "gramophone_mini_pill"
                    action [Function(lexicon_set_search, ""), Hide("lexicon_search_modal")]
                textbutton _("确认检索"):
                    style "pill_button"
                    xminimum 118
                    ysize 36
                    text_size 15
                    action [Function(lexicon_set_search, persistent.lexicon_search_query), Hide("lexicon_search_modal")]


################################################################################
## 样式定义（PC-6 午后茶话会与批注辞典）
################################################################################

style salon_subbar_frame is default:
    xsize 722
    ysize 30
    padding (10, 3)
    background Frame("gui/hud_chip.png", 12, 12)

style salon_subtab_pill is pill_button:
    xminimum 110
    ysize 24
    padding (10, 0)

style salon_subtab_pill_text is pill_button_text:
    size 12

style teaparty_header_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style teaparty_tab_card is default:
    xsize 234
    ysize 76
    padding (10, 8)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style teaparty_detail_card is default:
    xfill True
    padding (14, 12)
    background Frame("gui/panel_card.png", 16, 16)

style lexicon_header_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/panel_card.png", 16, 16)

style lexicon_filter_bar is default:
    xfill True
    padding (10, 7)
    background Frame("gui/panel_card.png", 16, 16)

style lexicon_mini_badge is default:
    xminimum 84
    ysize 22
    padding (8, 0)
    background Frame("gui/hud_chip.png", 12, 12)

style lexicon_cat_pill is pill_button:
    xminimum 96
    ysize 26
    padding (10, 0)

style lexicon_cat_pill_text is pill_button_text:
    size 12

style lexicon_tag_chip is pill_button:
    xminimum 46
    ysize 22
    padding (8, 0)

style lexicon_tag_chip_text is pill_button_text:
    size 11

style lexicon_list_frame is default:
    xsize 248
    ysize 364
    padding (8, 8)
    background Frame("gui/panel_card.png", 16, 16)

style lexicon_entry_row is button:
    xsize 216
    yminimum 44
    padding (8, 5)
    background Frame("gui/hud_chip.png", 12, 12)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style lexicon_detail_card is default:
    padding (14, 11)
    background Frame("gui/panel_card.png", 16, 16)

style lexicon_alice_note_box is default:
    xfill True
    padding (10, 7)
    background Frame("gui/hud_chip.png", 12, 12)

style lexicon_mo_note_box is default:
    xfill True
    padding (10, 7)
    background Frame("gui/hud_chip.png", 12, 12)


################################################################################
## 茶话会独立沙盒初始化与结算出口（绝不污染主线存档与好感/失误计数）
################################################################################

label _tea_party_init_sandbox(session_save_title):
    $ full_run = False
    $ save_name = session_save_title
    $ mo_favor = 82
    $ alice_favor = 56
    $ fail_count = 0
    $ intuition = 3
    $ evidence = []
    $ inspected_evidence = []
    $ expanded_evidence = ""
    $ set_ambient("warm")
    return

label _tea_party_finish_session(tid, local_mistakes=0):
    $ _tp_mistakes = max(0, int(local_mistakes or 0))
    $ _tp_rec = tea_party_record_clear(tid, _tp_mistakes)
    hide screen tea_riddle_prompt_banner
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen tea_party_result_card(tid, _tp_rec["last_badge"], _tp_rec["best_badge"], _tp_rec["last_rapport"], _tp_rec["best_rapport"], _tp_mistakes, _tp_rec["replays"])
    $ persistent.extras_tab = "teaparty"
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 茶席 T-01：《伯爵红茶里的方糖不在场证明》
################################################################################

label tea_party_t1:
    call _tea_party_init_sandbox("午后茶话会 · T-01 伯爵红茶里的方糖不在场证明") from _call__tea_party_init_sandbox
    $ _tp_mistakes = 0

    scene bg black with fade
    $ play_bgm(bgm_warm, fadein=1.5)
    centered "{size=+6}侦探社午后茶话会 · TEA T-01{/size}\n\n{size=+14}伯爵红茶里的方糖不在场证明{/size}\n\n{color=#f4d98a}周五午后四点 · 万事屋红茶圆桌 · 热茶分层与折纸掩护{/color}"

    scene bg agency at bg_kenburns_out
    $ set_ambient("warm")
    with dissolve

    play sound se_bell
    "周五下午四点十分，澄澈的秋日暖阳斜斜穿过万事屋的百叶窗，在圆木茶桌上筛下一层琥珀色的光斑。空气里浮动着佛手柑与锡兰红茶交织的微甜热气。"
    show alice happy at left
    show mo smile at right
    alice "哼哼，听好了二位！今天这罐『皇家佛手柑伯爵红茶』可是本社长精挑细选的下午茶重头戏——第一泡茶汤讲究原叶回甘，谁要是趁热往里丢方糖，就是不懂品茶的木舌头哦！"
    mc "社长大人每次泡新茶叶之前，总要先立一条奇奇怪怪的餐桌规矩……我明明看见你把那罐琥珀冰糖方糖也摆上桌了。"
    show alice blush at left
    alice "那、那是留着第二泡调柠檬红茶备用的！我清点过啦，雕花玻璃糖罐里一共整整齐齐码着十二块粗晶琥珀方糖，你们俩乖乖看家，我去走廊尽头小茶水间切三片新鲜黄柠檬！"

    hide alice
    play sound se_door
    "艾丽丝哼着轻快的小调推门离开。窗外风铃晃了两声，张子谦抱着篮球从门口探进半个脑袋。"
    show zhang happy at left
    zhang "哟，陈默，墨墨同学！隔着半条走廊都闻见你们万事屋的红茶香了——体育馆借场地签字单放门口信箱啦，我满手篮球灰，就不跨进门槛讨嫌咯！"
    play sound se_write
    show mo happy at right
    "墨墨朝门口轻轻弯起眉眼，在牛皮纸本上画了一个挥手的小火柴人，等张子谦的脚步声跑远，才转回圆桌边，动作极轻地拾起银色糖夹，又拿餐巾纸飞快折了什么东西。"
    mc "墨墨？你在折茶碟垫吗——"
    play sound se_footstep
    hide zhang
    show alice shock at left, sprite_jump
    show mo neutral at right
    "话音未落，端着柠檬小瓷盘回来的艾丽丝突然在桌边刹住脚步，金发呆毛笔直竖了起来！"
    alice "等一下！停下手中一切动作！本社长离开整整三分钟零十秒，玻璃糖罐里的十二块粗晶琥珀方糖，居然只剩下十块了！"
    mc "少了两块？刚才张子谦只在门框外面探了个头，连茶桌三米内都没踏进来过啊。"
    show alice think at left
    "艾丽丝眯起眼睛，像模像样地抄起试味小银勺，先看了一眼我面前还没倒茶的空杯，随后轻轻舀起墨墨白瓷杯最表层的滚烫茶汤抿了一小口。"
    show alice shock at left
    alice "奇了怪了……墨墨这杯刚注满的伯爵红茶烫嘴得很，而且表层茶汤苦香清冽，一丝甜味都没有！难道这两块方糖长翅膀飞了？！大嘴替陈默，快给本社长推理出来！"

label tea_t1_q1_loop:
    show screen tea_riddle_prompt_banner("第一问 · 未变甜的表层热茶", "艾丽丝只用小银勺舀了刚泡好的滚烫红茶最表层，尝出毫无甜味——这能证明杯子里没放方糖吗？")
    menu:
        "张子谦刚才站在门外三米远，用弹指神功把两块方糖弹进嘴里带走了":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo smile at right
            alice "噗哈哈哈！张子谦要是练成了隔空三米百发百中吃方糖的绝技，校篮球队还打什么半场战术，直接保送杂技团算啦！"
            play sound se_write
            mo_note "而且粗晶冰糖块棱角很硬，飞过来接歪的话，子谦同学现在应该在校医室捂着门牙哭。"
            mc "咳，好吧，武侠片方向撤回，重新回到茶杯本身的物理现象想想！"
            jump tea_t1_q1_loop

        "粗晶琥珀方糖遇到伯爵红茶里的佛手柑精油，瞬间升华成水蒸气消失了":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice angry at left, sprite_jump
            show mo think at right
            alice "喂——！蔗糖晶体在九十度热水里升华气化？这话要是让高二化学老师听见，明天早自习你就得站在讲台边背整张溶解度表啦！"
            play sound se_write
            mo_note "糖不会变成水蒸气飞走，只会安安静静往水下沉哦。再想想重力和搅拌的关系？"
            jump tea_t1_q1_loop

        "粗晶琥珀方糖密度大、化得慢，沉在滚烫杯底尚未搅拌，表层茶汤自然还是苦的！":
            hide screen tea_riddle_prompt_banner
            play sound se_correct
            show alice shock at left
            show mo blush at right

    mc "因为粗晶琥珀冰糖比普通绵白糖密实得多！刚丢进滚烫红茶里如果没拿茶匙搅拌，高浓度糖液会沉在瓷杯最底下，艾丽丝只舀最上面一层茶汤，尝出来当然没有甜味！"
    "艾丽丝半信半疑地探过身，拿银茶匙往墨墨杯底轻轻一拨——『叮当』一声脆响，半块还没彻底融化的琥珀色冰糖晶核果然在杯底打了个转！"
    show alice happy at left
    alice "哇哦！第一关算你眼尖！可是——杯底只有一块方糖呀！糖罐里明明少了整整两块，银糖夹也是干干净净没有湿茶渍，第二块琥珀方糖藏去哪儿了？"
    play sound se_write
    show mo neutral at right
    "墨墨耳尖微微泛红，指尖不着痕迹地往我的空茶碟旁缩了半寸。我低头打量桌面：茶壶滚烫，糖夹干燥，唯独我右手边多了一只用双层米白餐巾纸新折的胖肚子千纸鹤，墨墨袖口还沾着一粒金灿灿的细糖砂。"

label tea_t1_q2_loop:
    show screen tea_riddle_prompt_banner("第二问 · 第二块方糖的藏身处", "杯底只有一块方糖、银糖夹干燥无水渍，而陈默茶碟旁多了一只双层餐巾纸鹤——第二块方糖在哪？")
    menu:
        "一定是艾丽丝出门切柠檬前自己顺手塞进嘴里，转身就忘得一干二净了":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice angry at left, sprite_jump
            show mo smile at right
            alice "胡说八道！本社长连每天下午摄入几克蔗糖都记在脑内账本里，刚嚼过硬冰糖怎么可能连舌尖甜味都不记得！污蔑社长是要翻倍记账的！"
            play sound se_write
            mo_note "这次真的不是艾丽丝吃的。陈默低头看看自己茶碟旁边那只胖乎乎的纸鹤？"
            jump tea_t1_q2_loop

        "不小心掉进烧水铜壶壶嘴里，已经在炉子上煮成一壶焦糖奶茶了":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo neutral at right
            "墨墨认真地拎起铜水壶盖给我看了一眼，里面只有清澈见底的沸水，半丝焦糖色都没有。"
            play sound se_write
            mo_note "铜壶是清白的。线索就在你手边十厘米以内的地方。"
            jump tea_t1_q2_loop

        "包在我茶碟旁那只新折的双层餐巾纸鹤肚子里——墨墨悄悄替我留了一块！":
            hide screen tea_riddle_prompt_banner
            play sound se_correct
            show alice shock at left
            show mo blush at right, sprite_jump

    mc "银糖夹是干的，说明墨墨是先夹出干燥的两块方糖：一块放进她自己杯里试甜度，另一块包进了我茶碟旁这只双层餐巾纸鹤肚子里！"
    "我轻轻托起那只餐巾纸鹤，果不其然，纸腹沉甸甸地裹着一颗棱角分明的琥珀色方糖。"
    show alice happy at left
    alice "好啊！人赃并获！可是本社长想不通了——墨墨平时自己喝红茶明明最喜欢清淡无糖，今天干嘛自己杯里放一块，还要用折纸千纸鹤偷偷摸摸给陈默藏一块，不直接丢进他杯子里呢？"
    show mo blush at right
    "墨墨把牛皮纸本抱在胸口，只露出一双亮晶晶又带点窘迫的眼睛望着我，仿佛在看我能不能猜中她的小心思。"

label tea_t1_q3_loop:
    show screen tea_riddle_prompt_banner("第三问 · 温柔掩护的真正动机", "平时喝无糖清茶的墨墨，为什么不直接把方糖放进陈默杯里，反而自己放一块、再用纸鹤藏一块？")
    menu:
        "在模仿怪盗 Joker 练习餐桌障眼法魔术，准备下次在社团招新表演":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo sad at right
            alice "噗，想象一下墨墨戴着高礼帽在讲台上变方糖魔术……虽然肯定能招来一百个新社员，但这也太不像她的风格啦！"
            play sound se_write
            mo_note "我才不要戴那种奇奇怪怪的帽子……再想想艾丽丝出门前刚立下的规矩？"
            jump tea_t1_q3_loop

        "因为艾丽丝刚宣布『第一泡加糖是木舌头』，墨墨怕我怕苦又不好意思开口，才陪我一起加糖打掩护！":
            hide screen tea_riddle_prompt_banner
            play sound se_correct
            show alice blush at left, sprite_jump
            show mo smile at right

        "她误把琥珀方糖当成了浓缩柠檬硬糖，想先替大家试毒":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo blush at right
            alice "喂喂，本社长泡的下午茶怎么到你嘴里跟武侠客栈蒙汗药似的！墨墨才不会分不清冰糖和柠檬糖呢！"
            play sound se_write
            mo_note "上次在食堂喝柠檬红茶的时候，我记得你皱着眉头加了两小包糖。"
            jump tea_t1_q3_loop

    mc "因为社长大人刚立下『第一泡谁加糖谁就是木舌头』的规矩！墨墨记得我喝不惯纯苦涩的浓红茶，怕我当面要糖被艾丽丝笑话，干脆先往自己杯里放一块『共犯方糖』，再折一只纸鹤悄悄递给我！"
    play sound se_crane
    show mo blush at right, sprite_nod
    "墨墨脸颊飞起浅浅的红霞，轻轻点了点头，低头在牛皮纸本上沙沙写下一行字推过来。"
    mo_note "两个人都是木舌头的话，社长就没办法只笑话你一个人了。"
    show alice blush at left
    alice "唔……你、你们两个居然联手在红茶桌搞统一战线！哼，谁说本社长要笑话你们啦……其实伯爵红茶配一片黄柠檬再加一块半琥珀方糖，本来就是最好喝的黄金配方嘛！"
    "说着，艾丽丝红着耳根拿起银糖夹，飞快地往她自己杯子里连丢了两块琥珀冰糖，清脆的瓷勺碰撞声与暖融融的茶香一道漫满了整个午后。"

    call _tea_party_finish_session("t1", _tp_mistakes) from _call__tea_party_finish_session
    return


################################################################################
## 茶席 T-02：《艾丽丝的零花钱密室之谜》
################################################################################

label tea_party_t2:
    call _tea_party_init_sandbox("午后茶话会 · T-02 艾丽丝的零花钱密室之谜") from _call__tea_party_init_sandbox_1
    $ _tp_mistakes = 0

    scene bg black with fade
    $ play_bgm(bgm_suspense, fadein=1.5)
    centered "{size=+6}侦探社午后茶话会 · TEA T-02{/size}\n\n{size=+14}艾丽丝的零花钱密室之谜{/size}\n\n{color=#f4d98a}周三午后 · 社团活动室暖阳窗畔 · 上锁账本与草莓千层迷案{/color}"

    scene bg clubroom at bg_kenburns_out
    $ set_ambient("warm")
    with dissolve

    play sound se_door
    "周三下午社团活动时间，暖融融的秋阳照亮了活动室靠窗的长桌。墨墨刚把热腾腾的大吉岭红茶分进三只茶杯，艾丽丝便抱着她那本厚重的皮面《代价簿》风风火火冲了进来。"
    show alice shock at left, sprite_jump
    show mo neutral at right
    alice "紧急集合！万事屋建社以来最恶劣的『不可能犯罪』发生啦！本社长夹在《代价簿》第 48 页里的五十元零花钱——也就是月末限定草莓千层蛋糕战略储备金，凭空人间蒸发了！"
    mc "先喝口热茶喘口气……我记得你的《代价簿》侧面不是焊着一把精致的黄铜搭扣锁吗？"
    show alice angry at left
    alice "诡异之处就在这里！小铜钥匙一直系在我的手腕丝带上一步没离开过！今天上午第三节课间，我还隔着书页顶端缝隙瞄见第 48 页露出一小角粉红色的五十元钞票边；午休我亲手咔哒锁死黄铜搭扣，刚才放学打开一看——里面连张纸毛都没剩！"
    play sound se_write
    show mo think at right
    "墨墨凑近摊开的《代价簿》，用放大镜仔细瞧了瞧黄铜锁眼与皮面书脊，又抬眼看了看艾丽丝眼底淡淡的乌青黑眼圈，在本子上写下几条观察记录。"
    mo_note "一、黄铜锁孔无擦痕，书页侧面缝隙不到两毫米，镊子伸不进去。二、艾丽丝今天早上打了六个哈欠，昨晚好像看推理小说熬到了两点。"
    show alice blush at left
    alice "咳咳！侦探熬夜研读古典密室名著那叫业务进修！少扯开话题，既然没人能撬开锁扣也没法从缝隙夹走钞票，这桩『上锁账本密室失钞案』到底是怎么实现的？！"

label tea_t2_q1_loop:
    show screen tea_riddle_prompt_banner("第一问 · 拆解上锁账本密室", "黄铜搭扣完好未撬、两毫米书缝夹不出纸币，午休锁死后钥匙未离手腕——钞票怎么离开账本的？")
    menu:
        "有人借用窗台上的凸透镜聚起午后阳光，隔着书缝把五十元纸币烧成青烟了":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice shock at left, sprite_jump
            show mo sad at right
            alice "哇啊啊啊！烧掉五十块钱连草莓千层的奶油边都买不到，还要把本社长心爱的皮面账本熏成烤红薯吗？！书页明明干干净净一点焦糊味都没有！"
            play sound se_write
            mo_note "如果在账本里点火，整本《代价簿》都会烧着。换个不破坏账本的时间思路想想？"
            jump tea_t2_q1_loop

        "墨墨练过折纸缩骨手，能把手指压成一毫米薄片伸进锁扣缝隙取物":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo blush at right
            "墨墨默默举起自己白皙修长的手指比在黄铜搭扣旁，一本正经地摇了摇头。"
            play sound se_write
            mo_note "手指不是折纸，压扁的话会肿成胡萝卜，而且会被社长收门票展览。"
            jump tea_t2_q1_loop

        "根本没人从锁死的书缝往外抽钱——早在午休扣上铜锁之前，那张五十元就已经不在账本里了！":
            hide screen tea_riddle_prompt_banner
            play sound se_correct
            show alice shock at left
            show mo smile at right

    mc "既然午休锁上之后物理上绝不可能取出纸币，唯一的真相就是时间错位——在你中午十二点半锁上黄铜搭扣之前，那张五十元纸币早就离开《代价簿》了！"
    show alice think at left
    alice "胡说！我明明记得清清楚楚，上午第三节课间下课的时候，我还低头看了一眼书包里的账本顶端，第 48 页明明露出一小角粉红偏紫的印刷花纹边！难道五十元人民币是绿色的吗？不对，第五套五十元明明是蓝绿色的呀——等等？！"
    "艾丽丝话说到一半，自己突然愣住了！墨墨忍着笑意，从桌角笔筒旁拈起半张盖着『云溪高中小卖部西点房』圆章的说明传单递给我看。"
    mc "哦——现行五十元纸币明明是蓝绿色，百元钞或者其他票据才是粉红色！既然第三节课间艾丽丝瞄见的是一抹粉红色纸角，而且带着铜版纸油墨光泽，那张露出一角的纸片究竟是什么？"

label tea_t2_q2_loop:
    show screen tea_riddle_prompt_banner("第二问 · 粉红色纸角的真面目", "五十元纸币实为蓝绿色，而困迷糊的艾丽丝在第三节课间看见账本里露出一角粉红铜版纸——那是什么？")
    menu:
        "是怪盗 Joker 偷偷塞进账本挑衅万事屋的樱花粉预告卡":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice angry at left
            show mo neutral at right
            alice "哼，Joker 那个爱出风头的家伙要是敢拿预告卡换走本社长的蛋糕巨款，我现在已经拎着拖把去天台追杀他三圈啦！而且账本里现在连预告卡也没有呀！"
            play sound se_write
            mo_note "闻一闻第 48 页的纸缝，没有 Joker 卡片的香水味，反而有一点点奶油糖霜香。"
            jump tea_t2_q2_loop

        "是夹在账本里当书签的风干粉色樱花花瓣":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo think at right
            alice "十月底深秋哪来的新鲜樱花瓣嘛，而且本社长再困也不会把圆弧形的花瓣看成裁切方正的钞票直角呀！"
            play sound se_write
            mo_note "刚才小卖部传单上写着：周三早读前凭现金预购限定甜点，发放粉红铜版纸提货副券。"
            jump tea_t2_q2_loop

        "是早读前小卖部『周三限定草莓千层』的粉红铜版纸预售提货券！":
            hide screen tea_riddle_prompt_banner
            play sound se_correct
            show alice shock at left, sprite_jump
            show mo happy at right

    mc "小卖部周三限定草莓千层早上七点半限量预售，交五十元现金发一张粉红色铜版纸提货券！昨晚熬夜看推理小说困得迷迷糊糊的某人，第三节课间把粉红提货券边角错当成钞票了！"
    show alice blush at left
    alice "等、等一下！就算第三节课间夹在第 48 页里的是粉红提货券，那午休锁上之前，连那张粉红提货券也一起不见了呀！到底是谁把提货券从我账本里顺走的？！"
    play sound se_write
    show mo smile at right
    "墨墨弯下腰，从活动室长沙发后方拎出一只贴着冰袋的米白色帆布保温袋，放在阳光灿烂的茶桌上。袋口别着一张粉红色的『已核销·三份装』副券，上头赫然是艾丽丝自己龙飞凤舞的签名！"

label tea_t2_q3_loop:
    show screen tea_riddle_prompt_banner("第三问 · 终局反转与幕后真凶", "保温袋上别着艾丽丝亲笔签名的核销副券——究竟是谁动了五十元零花钱和提货券？")
    menu:
        "是我趁午休梦游去小卖部换成了关东煮鱼丸汤":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice angry at left
            show mo smile at right
            alice "好哇陈默，你还敢主动认领鱼丸汤！要是真换成了萝卜海带结，你今天就负责把全社团的茶杯刷十遍！"
            play sound se_write
            mo_note "保温袋里装的是冰镇甜点盒，不是热腾腾的关东煮哦。再看看副券上的笔迹是谁写的？"
            jump tea_t2_q3_loop

        "『盗贼』就是昨晚熬夜断片的艾丽丝本人——她清早买券、午休前拜托墨墨代领冰镇，睡醒全忘了！":
            hide screen tea_riddle_prompt_banner
            play sound se_correct
            show alice blush at left, sprite_jump
            show mo happy at right

    mc "破案了，社长大人！所谓不可能犯罪的真凶就是昨晚熬夜到两点、早上困成梦游状态的艾丽丝自己——早读前你拿五十元去排了三份装草莓千层预售券，第四节下课把提货券塞给墨墨请她午休代领冰镇，然后锁上空账本趴桌补了一觉，醒来把自己干的事忘得一干二净！"
    show alice blush at left, sprite_tremble
    alice "呜哇啊啊啊——我想起来了！！第四节下课排队太长，我是怕奶油化掉才塞给墨墨去借小卖部冰袋的！不、不许记进推理社档案！这一页从历史上彻底抹掉！"
    play sound se_page
    "墨墨笑着打开保温袋，三只透明方盒里整整齐齐摆着铺满鲜红草莓的千层蛋糕——五十元零花钱一分没剩，全被这位嘴硬社长悄悄买成了我们三个人的份。"
    play sound se_write
    show mo smile at right, sprite_nod
    mo_note "社长连打哈欠排队的时候，也没忘了算上我和陈默的那两份。谢谢款待，草莓很甜。"
    show alice happy at left
    alice "哼……本、本社长只是觉得一个人吃三块热量超标，勉为其难分你们两个搭档一起销毁罪证而已！还不快拿起叉子趁冰吃！"

    call _tea_party_finish_session("t2", _tp_mistakes) from _call__tea_party_finish_session_1
    return


################################################################################
## 茶席 T-03：《墨墨速写本最后一页的暗号》
################################################################################

label tea_party_t3:
    call _tea_party_init_sandbox("午后茶话会 · T-03 墨墨速写本最后一页的暗号") from _call__tea_party_init_sandbox_2
    $ _tp_mistakes = 0

    scene bg black with fade
    $ play_bgm(bgm_daily, fadein=1.5)
    centered "{size=+6}侦探社午后茶话会 · TEA T-03{/size}\n\n{size=+14}墨墨速写本最后一页的暗号{/size}\n\n{color=#f4d98a}深秋傍晚 · 万事屋书架与橘金暮色 · 折纸密码与两杯半糖{/color}"

    scene bg agency at bg_kenburns_out
    $ set_ambient("warm")
    with dissolve

    "十月下旬的微风从万事屋半开的木窗吹进来，带着银杏叶干爽的清香。我刚收拾完桌上的茶碟，一阵穿堂风恰好哗啦啦吹动了摊在桌边的牛皮纸速写本，一直翻到了平时夹着麻绳的最后一页。"
    show mo shock at right, sprite_jump
    show alice happy at left
    play sound se_page
    "正在添热水的墨墨惊得轻跳了一下，连忙伸手按住本子下半截，耳廓肉眼可见地染上一层薄粉；可速写本上半页一行工整的钢笔小字与三枚迷你铅笔涂鸦，已经落进了艾丽丝闪闪发光的眼睛里。"
    alice "哦豁——！被本社长抓个正着！『3 → 1 → 4 · 折痕向北 · 两杯半糖』，旁边还画了一格歪斜书架、一只怀表表冠和一只折纸鹤！这绝对是沉默侦探悄悄设计的秘密寻宝挑战状！"
    mc "墨墨要是觉得不好意思的话，我们现在合上本子装作没看见也行……"
    play sound se_write
    show mo blush at right, sprite_nod
    "墨墨犹豫了两秒，指尖轻轻松开牛皮纸页，害羞却又带着一点点狡黠笑意地在旁边空白处补了一行字。"
    mo_note "本来就是准备今天喝完茶考你们的。如果陈默能解开全部三道谜题，下周的下午茶点心任你点单。"
    show alice happy at left
    alice "太棒啦！本社长宣布万事屋内部解谜赛正式鸣锣！先看第一截暗号——『3 → 1 → 4』紧挨着那幅微微倾斜的木格小涂鸦，万事屋里一共摆着四组樟木书架，这串数字代表什么？"

label tea_t3_q1_loop:
    show screen tea_riddle_prompt_banner("第一问 · 『3 → 1 → 4』书架坐标", "速写本上『3 → 1 → 4』紧挨着倾斜木书架涂鸦——这组三元数字在万事屋里指向哪里？")
    menu:
        "是圆周率 3.14 的前三位，墨墨在速写本末尾演算数学月考几何题":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice sad at left
            show mo smile at right
            alice "拜托——哪个少女会在牛皮纸速写本最后一页藏一道圆周率公式还脸红捂本子呀！你的推理浪漫细胞被狗啃掉了吗！"
            play sound se_write
            mo_note "如果是圆周率的话，后面应该跟着 1 → 5 → 9 才对。仔细看看旁边画的书架格子？"
            jump tea_t3_q1_loop

        "是冲泡红茶的秘诀：茶叶焖 3 分钟、茶壶晃 1 圈、再平均倒满 4 杯":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo happy at right
            "墨墨忍不住弯起眼睛，在本子上画了一只蹲在窗台捧茶杯的小麻雀。"
            play sound se_write
            mo_note "万事屋只有我们三个人，倒出第四杯的话，是要请窗外路过的麻雀喝吗？"
            jump tea_t3_q1_loop

        "是万事屋靠窗第 3 组樟木书架、顶层第 1 格、从左往右数第 4 本旧书脊背！":
            hide screen tea_riddle_prompt_banner
            play sound se_correct
            show alice happy at left
            show mo smile at right

    mc "涂鸦画的是带分层的木书架，箭头代表从大到小的三级检索坐标：靠窗第 3 组樟木书架、最上面第 1 层、左起第 4 本书！"
    play sound se_page
    "我走到三号书架前踮脚抽出第四本古典推理选集《弯曲的铰链》，果不其然，扉页间滑落出一张裁得方方正正的浅米色茶香信笺！"
    show alice think at left
    alice "哇，纸面上怎么散落着好多不成字句的零碎偏旁和笔画？再看第二截提示『折痕向北』——万事屋的百叶窗正好朝南，这张方纸四条对角折痕里只有一条压过双道深印，该怎么解开？"

label tea_t3_q2_loop:
    show screen tea_riddle_prompt_banner("第二问 · 『折痕向北』折纸几何机关", "方纸四角散落着零碎偏旁，唯一一道双压深折痕若指向北侧背光墙面再按谷线收拢，会发生什么？")
    menu:
        "折成一架超远航程纸飞机，顺着南窗秋风直接飞去操场":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo shock at right
            alice "飞去操场干嘛啦！万一迎风拐个弯精准降落在一楼教导主任的枸杞保温杯里，明天万事屋就要被全校通报批评了！"
            play sound se_write
            mo_note "正方形信笺加上十字与对角预折痕，是千纸鹤的菱形起手式哦。"
            jump tea_t3_q2_loop

        "必须把信笺浸进热红茶里加热显影，散落的笔划才会连成暗语":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice shock at left
            show mo shock at right, sprite_jump
            "墨墨吓得赶紧护住桌上的茶壶，连连摆手。"
            play sound se_write
            mo_note "我是用普通钢笔写的，泡进红茶里就变成一团模糊的小花猫啦！"
            jump tea_t3_q2_loop

        "将双压折痕朝北定向后沿谷线折成纸鹤，四角散落的偏旁会在左右双翼正中央拼合成完整字句！":
            hide screen tea_riddle_prompt_banner
            play sound se_correct
            play sound se_crane
            show alice shock at left
            show mo blush at right

    mc "四条对角线若方向转错九十度，拼出来的偏旁就会上下颠倒；只有把那道双压折痕指向北侧书架墙、再顺着预留谷线折起千纸鹤，原本分散在纸面四角的半截字迹就会严丝合缝并拢在两片翅膀上！"
    scene bg sunset
    $ set_ambient("dusk")
    show alice happy at left
    show mo blush at right
    with dissolve

    "窗外的天光不知不觉染上了温柔的橘金暮色。我将折好的米色纸鹤平摊在掌心，左右双翼上的清秀钢笔字刚好拼成一句话——『谢谢你们陪我度过吵闹又温暖的秋天』。"
    show alice think at left
    alice "唔……字句满分！可是本名侦探还有最后一个重大疑点！万事屋明明有墨墨、本社长和陈默三个人，为什么暗号最后一句写的是『两杯半糖』而不是三杯？！难道有人被扣掉半杯份量了吗？！"
    play sound se_write
    show mo smile at right
    "墨墨捧起茶杯抿了一小口清茶，眼底漾着暖橙色的夕阳余晖，安静地等待我的最后一答。"

label tea_t3_q3_loop:
    show screen tea_riddle_prompt_banner("第三问 · 『两杯半糖』的羁绊算式", "万事屋明明坐着三个人、摆着三只茶杯，为什么墨墨在暗号末尾写的是『两杯半糖』？")
    menu:
        "因为茶叶罐见底了，剩下的红茶碎末只够冲泡两杯半的水量":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice angry at left
            show mo smile at right
            alice "才不会呢！柜子里那两罐锡兰与大吉岭才刚拆封三天，就算每天喝三壶也够喝到期末考！"
            play sound se_write
            mo_note "注意断句哦——不是『两杯半的茶』，而是三杯茶加起来的『糖量』。"
            jump tea_t3_q3_loop

        "留了半杯放在窗台，专门孝敬路过晒太阳的校园橘猫":
            hide screen tea_riddle_prompt_banner
            $ _tp_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo neutral at right
            alice "猫咪是不能喝含咖啡因的红茶和蔗糖的啦，作为侦探社常识要记牢哦！"
            play sound se_write
            mo_note "算一算我们三个人各自往茶杯里放几勺糖，加在一起刚好是多少？"
            jump tea_t3_q3_loop

        "指的是三杯红茶一共放『两杯半份量的糖』——艾丽丝嗜甜一杯半、我正常一杯糖、墨墨清茶零糖！":
            hide screen tea_riddle_prompt_banner
            play sound se_correct
            show alice blush at left, sprite_jump
            show mo happy at right

    mc "断句不在『两杯半·糖』，而在『两杯半的糖分总和』！每次泡下午茶，艾丽丝嘴上说品原叶，最后都要偷偷加足一杯半的糖量；我固定加一杯标准糖；墨墨自己喝无糖清茶——一加一点五再加零，合起来正好是属于我们三个人的『两杯半糖』！"
    show alice blush at left
    alice "你、你们两个怎么连本社长偷偷多加半勺糖的小习惯都算进暗号公式里了啦！这算哪门子本格密码学，分明是万事屋内部精准拆台学！"
    play sound se_write
    show mo smile at right, sprite_nod
    "墨墨将那只印着字句的米色纸鹤轻轻摆在茶壶与三只瓷杯正中央，低头在速写本最后一页郑重添上一行落款。"
    mo_note "就算不说话，只要听见茶匙碰杯子的声音，我也能分清哪一杯是艾丽丝的，哪一杯是你的。"
    show alice smile at left
    alice "……真是拿你没办法。来吧，趁夕阳还没落山，为万事屋独一无二的『两杯半糖』干杯！下周的点心单就勉为其难交给大功臣陈默钦点咯！"
    "三只温热的白瓷茶杯在橘金色的晚霞里轻轻相碰，发出一声清脆而绵长的回响。"

    call _tea_party_finish_session("t3", _tp_mistakes) from _call__tea_party_finish_session_2
    return
