## 《沉默侦探：千纸鹤的约定》—— PC-7 旧书街古籍残卷修复台与四季纪念日手写信笺匣
## bookstreet_seasons.rpy
##
## 设计要点：
##   1. 100% 零侵入主线剧情（script.rpy / chapter1..6.rpy / definitions.rpy 推理与好感公式零改动）。
##   2. 「旧书街古籍残卷推演修复台」（screen extras_restoration）：
##      收录旧书街淘得的 3 卷古典本格推理残卷（R-01 / R-02 / R-03），支持放大镜查验残叶物证、
##      三处骑缝缺叶拼合推演（选错触发墨墨与艾丽丝趣味批注，零死档负担），修复完成解锁
##      「古典推理孤本藏书票」与墨墨/艾丽丝双人书话批注，持久化于 persistent.book_restoration_records。
##   3. 「四季纪念日手写信笺匣」（screen extras_letterbox + 4 段可游玩纪念日短篇）：
##      春樱坡道招新、夏雨屋檐汽水签、秋日银杏旧书街、冬雪万事屋围炉四封手写钢笔信笺与火漆印章，
##      严密联动 truth_spoiler_unlocked() 防剧透保护，持久化于 persistent.seasonal_letter_records。

# —— PC-7 鉴赏室水彩 UI 图标命名别名（古籍残卷修复台 + 孤本藏书票 + 四季信笺匣 + 四季火漆印章）——
image ui_icon_book_restoration   = "images/ui/icon_book_restoration.png"
image ui_icon_exlibris_bookplate = "images/ui/icon_exlibris_bookplate.png"
image ui_icon_seasonal_letterbox = "images/ui/icon_seasonal_letterbox.png"
image ui_icon_wax_seal_seasons   = "images/ui/icon_wax_seal_seasons.png"

init python:

    # 动态注册 PC-7 双成就，保持鉴赏室成就页 2×10 偶数列对称排布
    if "register_extra_achievement" in globals():
        register_extra_achievement(
            "ach_restoration",
            "古籍残卷修复师",
            "修复旧书街全部三卷古典推理残卷并集齐孤本藏书票。",
            False,
        )
        register_extra_achievement(
            "ach_seasons",
            "四季火漆信笺",
            "集齐四季纪念日手写信笺匣的全部四枚火漆收藏印章。",
            False,
        )

    ############################################################################
    ## 一、旧书街古籍残卷推演修复台（3 卷古典推理残卷 + 孤本藏书票 + 双人批注）
    ############################################################################

    RESTORATION_TOMES = [
        {
            "id": "r1",
            "code": "R-01",
            "title": "雾都钟表匠的第十三枚齿轮",
            "short_title": "雾都第十三枚齿轮",
            "provenance": "槐荫旧书摊 · 1928 年铅印精装译本残册",
            "era_tag": "雾都伦敦报时塔 · 凸轮垫齿与怀表伪证",
            "bg_thumb": "images/bg_booksigning.png",
            "manuscript_intro": (
                "残卷摘录：1928 年冬雾弥漫的伦敦钟楼内，老钟表匠在反锁的工作间遇袭昏迷。"
                "桌边银壳怀表停在十一点五十五分，壁炉冷灰里却多出一枚不属于十二齿擒纵轮的黄铜小齿轮，"
                "而终章揭晓真相的三段骑缝书叶已被旧主沿装订线撕落。"
            ),
            "folio_clues": [
                {
                    "id": "r1_c1",
                    "label": "残叶物证一 · 齿缘煤灰压痕",
                    "surface": "黄铜小齿轮齿根残留深褐色厚脂，与怀表轻质机油截然不同。",
                    "magnified_note": (
                        "铜柄放大镜检视：齿轮内圈刻有『1/2』微雕记号，齿槽嵌着只有露天塔顶大钟"
                        "才涂抹的防冻鲸油脂，证明它原本装在塔顶报时凸轮组上。"
                    ),
                },
                {
                    "id": "r1_c2",
                    "label": "残叶物证二 · 表蒙玻璃裂向",
                    "surface": "银怀表指针定格于 11:55，玻璃碎裂但表盘并无外力重击凹坑。",
                    "magnified_note": (
                        "铜柄放大镜检视：玻璃裂纹呈由内向外拱起的放射状，表冠被预先拔出卡在调针档，"
                        "银壳背面留有壁炉铁钩烘烤的受热氧化晕。"
                    ),
                },
                {
                    "id": "r1_c3",
                    "label": "残叶物证三 · 雾夜巡警证言",
                    "surface": "街口巡警坚称十一点五十五分已听见塔顶敲响午夜十二声钟响。",
                    "magnified_note": (
                        "铜柄放大镜检视：巡警的值勤怀表与电报局标准钟核对无误，且五分钟后的真正零点"
                        "塔顶大钟并未再次鸣响，说明报时机构被人提前触发了五分钟。"
                    ),
                },
            ],
            "slots": [
                {
                    "slot_index": 0,
                    "slot_title": "骑缝缺叶壹 · 怀表停摆之伪",
                    "damaged_prompt": "待拼合推演：为何老钟表匠的银怀表恰好停在十一点五十五分且表蒙外裂？",
                    "restored_line": "怀表表冠预先拔在调针档，系被拨至 11:55 后贴近壁炉烘烤，内腔空气膨胀顶裂表蒙以伪造遇袭时刻。",
                    "candidates": [
                        {
                            "id": "r1_s0_a",
                            "text": "凶手隔着钟楼橡木门用强力磁石吸停了纯铜游丝，震碎表蒙玻璃",
                            "correct": False,
                            "alice_feedback": "喂喂，黄铜和紫铜根本不导磁呀！拿吸铁石隔着厚木门吸纯铜零件，物理学棺材板都要压不住啦！",
                            "mo_feedback": "而且放大镜下玻璃是由内向外拱裂的，更像是表壳受热膨胀所致，再看看残叶物证二吧。",
                        },
                        {
                            "id": "r1_s0_b",
                            "text": "表冠预先拔在调针档拨定 11:55，再经壁炉烘烤令内腔受热顶裂玻璃，伪造摔碎假象",
                            "correct": True,
                            "alice_feedback": "漂亮！骑缝纤维完全吻合——先拔表冠拨假时间再烤裂表蒙，这招老派机械伪证被你一眼看穿啦！",
                            "mo_feedback": "道林纸撕口的斜纹对齐了，银壳背面的铁钩烫痕正好印证了这一页的还原。",
                        },
                        {
                            "id": "r1_s0_c",
                            "text": "老钟表匠昏迷前用指甲撬开玻璃，把时针倒拨了整整十二个小时留暗号",
                            "correct": False,
                            "alice_feedback": "等等——十二小时制表盘倒拨十二个小时，指针不还是指在原来的刻度上吗？！白费力气呀！",
                            "mo_feedback": "表盘漆面没有指甲刮痕，拨针是通过表冠完成的哦。",
                        },
                    ],
                },
                {
                    "slot_index": 1,
                    "slot_title": "骑缝缺叶贰 · 第十三枚齿轮归属",
                    "damaged_prompt": "待拼合推演：壁炉灰烬里多出的第十三枚黄铜齿轮究竟来自何处？",
                    "restored_line": "该齿轮是塔顶大钟报时凸轮的五分钟提前垫齿，嵌上后令午夜十二响在 11:55 提前鸣钟。",
                    "candidates": [
                        {
                            "id": "r1_s1_a",
                            "text": "它是塔顶大钟报时凸轮的五分钟提前垫齿，涂有露天防冻鲸油，令零点钟声提前五分钟敲响",
                            "correct": True,
                            "alice_feedback": "完全正确！齿根里的防冻鲸油就是铁证，只有露天塔顶大钟才用得上这种厚油脂！",
                            "mo_feedback": "第二道骑缝也严丝合缝合上了，『1/2』微雕对应的正是半刻五分钟的凸轮提前量。",
                        },
                        {
                            "id": "r1_s1_b",
                            "text": "它是怀表内部掉落的秒针轮，被壁炉炭火高温烤得体积膨胀了整整三倍",
                            "correct": False,
                            "alice_feedback": "噗——黄铜热膨胀系数才十万分之十九，要是能烤大三倍，旧书街打铜铺早就发大财啦！",
                            "mo_feedback": "怀表机芯并没有缺失齿轮，留意齿轮槽里的露天防冻鲸油线索吧。",
                        },
                        {
                            "id": "r1_s1_c",
                            "text": "它是钟表匠秘密研制的蒸汽永动机核心轮，遇火会自动旋转销毁账册",
                            "correct": False,
                            "alice_feedback": "大侦探，这本是 1928 年本格推理译本，不是蒸汽朋克科幻小说啦！",
                            "mo_feedback": "结合巡警在 11:55 听见十二响钟声的证言，这枚齿轮真正改变的是『报时时刻』。",
                        },
                    ],
                },
                {
                    "slot_index": 2,
                    "slot_title": "骑缝缺叶叁 · 撕页骑缝与不在场铁证",
                    "damaged_prompt": "待拼合推演：作案者如何利用提前鸣响的钟声建立不在场证明，又为何败露？",
                    "restored_line": "学徒借 11:55 提前敲响的十二声钟响诱使巡警作证，事后卸下垫齿投入壁炉，却因鲸油未燃尽留下油斑。",
                    "candidates": [
                        {
                            "id": "r1_s2_a",
                            "text": "巡警把泰晤士河货轮汽笛听成了十二下钟声，钟楼大钟整晚其实根本没响过",
                            "correct": False,
                            "alice_feedback": "低沉汽笛『呜——』一声和清脆铜钟『当当』十二下差得十万八千里好不好！伦敦巡警才没那么糊涂呢！",
                            "mo_feedback": "巡警的证言本身是诚实的，被欺骗的是『钟声代表的时刻』。",
                        },
                        {
                            "id": "r1_s2_b",
                            "text": "凶手抱住塔顶大钟摆锤荡出窗外逃离雾都，顺手撕下三页书折纸飞机通风报信",
                            "correct": False,
                            "alice_feedback": "哈哈哈哈！在十二月浓雾夜里抱钟摆飞出钟楼？那不用等苏格兰场抓人，自己就摔进草堆里啦！",
                            "mo_feedback": "墨墨忍俊不禁地在草稿纸角画了一只挂在钟摆上的小火柴人，轻轻摇了摇头。",
                        },
                        {
                            "id": "r1_s2_c",
                            "text": "学徒借提前五分钟的十二响钟声骗取巡警时间证言，事后卸下垫齿丢入壁炉，却因鲸油难燃留下铁证",
                            "correct": True,
                            "alice_feedback": "三页骑缝全部复位！时间诡计加物证闭环，这册 1928 年的雾都残卷终于重见天日啦！",
                            "mo_feedback": "最后一页毛边也对齐了。用镊子轻轻抚平折角，这枚孤本藏书票现在属于你了。",
                        },
                    ],
                },
            ],
            "exlibris": {
                "code": "EX-LIBRIS · NO.01 · HOROLOGIUM",
                "title": "雾都第拾叁齿 · 孤本藏书票",
                "motto": "时间从不撒谎，撒谎的只是被拨歪的指针。",
                "edition": "旧书街槐荫书摊 · 铜版纸鹤钤印本",
            },
            "mo_marginalia_pub": (
                "这册民国道林纸译本的撕口呈斜向纤维毛边，修复时需顺着纸纹轻压。"
                "老摊主夹在封底的勘误条写得很妙：越是精巧的机械时间诡计，越容易败给一滴擦不净的防冻鲸油——"
                "因为在真实生活里，任何试图篡改时间的伪装，都会在器物接触的缝隙间留下诚实的咬痕。"
            ),
            "mo_marginalia_deep": "",
            "mo_marginalia_masked_hint": "",
            "alice_marginalia": (
                "哼哼，提前五分钟敲钟这招虽然古典，但在没有手机自动对时的年代可真够唬人的！"
                "本社长宣布把这张『雾都第拾叁齿』纸鹤藏书票贴在万事屋书柜第一格，"
                "以后接委托凡是遇到时间证言，咱们第一件事就是核对现场每一只钟表的快慢误差！"
            ),
        },
        {
            "id": "r2",
            "code": "R-02",
            "title": "雪夜修道院的消失墨迹",
            "short_title": "雪夜消失的墨迹",
            "provenance": "梧桐骑楼书肆 · 1934 年布面烫银残卷",
            "era_tag": "暴雪古修道院 · 淀粉碘墨消隐与果酸焦化显影",
            "bg_thumb": "images/bg_library.png",
            "manuscript_intro": (
                "残卷摘录：暴风雪封山的古修道院藏书室里，老院长亲笔立下的古籍监护人名单锁在封蜡完好的橡木匣中。"
                "次日清晨当众启封时，羊皮纸竟化作一片空白，唯独壁炉铜火盆旁留着半瓶稀碘酒与一枚烤干的柠檬壳。"
            ),
            "folio_clues": [
                {
                    "id": "r2_c1",
                    "label": "残叶物证一 · 羊皮纸斜光压痕",
                    "surface": "空白羊皮纸正面洁净无擦痕，封蜡亦系院长戒指原印，绝未被拆换。",
                    "magnified_note": (
                        "铜柄放大镜检视：侧逆光下羊皮纸表面留有清晰的鹅毛笔尖划槽，"
                        "纤维孔隙残存微量米汤淀粉颗粒与极淡的紫褐余晕，并无刀刮或药水涂抹破坏。"
                    ),
                },
                {
                    "id": "r2_c2",
                    "label": "残叶物证二 · 火盆边的碘酒与柠檬",
                    "surface": "医务室少了一小瓶外用稀碘酊，铜火盆灰烬边躺着半只干瘪柠檬壳。",
                    "magnified_note": (
                        "铜柄放大镜检视：稀碘酊遇淀粉会显出酷似蓝黑墨水的深蓝色络合物，"
                        "但只要受热超过六十摄氏度，碘分子便会升华逸散，令字迹褪回无色。"
                    ),
                },
                {
                    "id": "r2_c3",
                    "label": "残叶物证三 · 匣底通风铜网",
                    "surface": "上锁的橡木文书匣整夜放在藏书室长桌上，但桌面昨晚曾被人挪近壁炉热风口。",
                    "magnified_note": (
                        "铜柄放大镜检视：橡木匣底部原本设有防潮细铜网，正对壁炉导热风道烘烤数小时后，"
                        "匣内温度足以在不融化外侧封蜡的前提下烘热整张羊皮纸。"
                    ),
                },
            ],
            "slots": [
                {
                    "slot_index": 0,
                    "slot_title": "骑缝缺叶壹 · 自行隐去的蓝黑墨迹",
                    "damaged_prompt": "待拼合推演：既然羊皮纸未被调包也无刀刮痕迹，原本醒目的蓝黑字迹为何凭空消失？",
                    "restored_line": "墨水瓶被调换为稀碘酒掺米汤淀粉调成的深蓝假墨，书写时色泽如常，受热后碘升华即褪为无色。",
                    "candidates": [
                        {
                            "id": "r2_s0_a",
                            "text": "羊皮纸在暴风雪夜吸收了月光寒气，把铁胆墨水自动吞进了动物皮脂底层",
                            "correct": False,
                            "alice_feedback": "喂——铁胆墨水越氧化越黑，哪有半夜被月光吃掉颜色的道理！当心化学老师罚你抄元素周期表哦！",
                            "mo_feedback": "残叶物证一提到了纤维里的『米汤淀粉颗粒』，结合医务室失窃的稀碘酊想想看？",
                        },
                        {
                            "id": "r2_s0_b",
                            "text": "作案者将墨水偷换为稀碘酒与淀粉调配的蓝黑假墨，受热后碘分子升华逸散，字迹便褪回无色",
                            "correct": True,
                            "alice_feedback": "一针见血！初中生物课做过的淀粉遇碘变蓝实验，反过来加热就能让颜色乖乖隐身！",
                            "mo_feedback": "第一处骑缝拼合成功，鹅毛笔留下的物理压痕也解释了为何纸张本身并未被调包。",
                        },
                        {
                            "id": "r2_s0_c",
                            "text": "修道院白鼠顺着铜网钻进木匣，连夜把整张名单上的墨迹舔得干干净净",
                            "correct": False,
                            "alice_feedback": "噗哈哈哈！这只小白鼠不仅识字，还知道只舔墨水不啃一口香喷喷的羊皮纸吗？！",
                            "mo_feedback": "匣底防潮铜网孔径比米粒还细，连小甲虫都钻不进去的。",
                        },
                    ],
                },
                {
                    "slot_index": 1,
                    "slot_title": "骑缝缺叶贰 · 封蜡未损的隔空消字",
                    "damaged_prompt": "待拼合推演：橡木匣外侧火漆封蜡完好无损，作案者如何在不拆匣的情况下令假墨褪色？",
                    "restored_line": "作案者将橡木匣推至壁炉导热风道口，暖风经匣底防潮铜网持续烘透羊皮纸，无需破封即可消去碘墨。",
                    "candidates": [
                        {
                            "id": "r2_s1_a",
                            "text": "作案者趁夜将橡木匣移至壁炉热风道口，热流自匣底防潮铜网导入烘暖纸面，不伤外侧封蜡便消去假墨",
                            "correct": True,
                            "alice_feedback": "推理满分！火漆熔点要八九十度且在匣盖外侧，而六十度暖风从匣底铜网吹进去正好消掉碘墨！",
                            "mo_feedback": "第二页残叶也稳稳嵌回书脊了，密闭木匣与热风道的温差设计非常严谨。",
                        },
                        {
                            "id": "r2_s1_b",
                            "text": "作案者用萝卜刻了一枚假院长戒指，拆毁真火漆擦掉字迹后再重新盖章",
                            "correct": False,
                            "alice_feedback": "萝卜章盖滚烫火漆会煮熟缩水变形的好不好！而且残叶物证一明确写了封蜡系原印未动呀！",
                            "mo_feedback": "再看看残叶物证三里长桌被挪近壁炉热风口的痕迹吧。",
                        },
                        {
                            "id": "r2_s1_c",
                            "text": "暴风雪导致室内气压骤降，把匣内蓝黑墨水分子顺着钥匙孔吸到了走廊外",
                            "correct": False,
                            "alice_feedback": "要是气压低到能把干墨水吸出钥匙孔，藏书室的彩色玻璃窗早就噼里啪啦全碎啦！",
                            "mo_feedback": "让碘分子离开淀粉的不是气压，而是恰到好处的温度。",
                        },
                    ],
                },
                {
                    "slot_index": 2,
                    "slot_title": "骑缝缺叶叁 · 柠檬暗记与反转显影",
                    "damaged_prompt": "待拼合推演：铜火盆旁那半只柠檬壳揭开了老院长怎样的反制后手？",
                    "restored_line": "老院长察觉墨水有异，预先以柠檬汁在纸背写下真名单；待假墨褪尽、将羊皮纸贴近火盆烘烤，果酸焦化即显棕褐真名。",
                    "candidates": [
                        {
                            "id": "r2_s2_a",
                            "text": "柠檬壳只是守夜修士泡蜂蜜茶剩下的果皮，与空白羊皮纸并无逻辑关联",
                            "correct": False,
                            "alice_feedback": "古典本格黄金时代的线索铁律——壁炉边特写出现的半只柠檬绝不可能是随便乱丢的厨余垃圾！",
                            "mo_feedback": "想想看，柠檬汁里的柠檬酸与果糖涂在纸上晾干后无色，但遇到高温火烤会发生什么呢？",
                        },
                        {
                            "id": "r2_s2_b",
                            "text": "把柠檬皮汁挤在空白羊皮纸上会发出荧光绿雾，在穹顶折射出窃贼的侧影",
                            "correct": False,
                            "alice_feedback": "喂喂，柠檬汁又不是夜光萤火虫提取液，哪来的荧光绿雾投影呀！",
                            "mo_feedback": "不用任何奇幻特效，单靠炭火的热量就能让无色果酸字迹显现出来哦。",
                        },
                        {
                            "id": "r2_s2_c",
                            "text": "院长早以柠檬汁预写暗记；当众将空白羊皮纸凑近铜火盆高温烘烤，果酸脱水焦化便浮现出不可抹除的棕褐真名",
                            "correct": True,
                            "alice_feedback": "太痛快啦！凶手用六十度暖风消掉假墨，院长反手用火盆高温烤出柠檬汁真迹——双重化学诡计绝杀！",
                            "mo_feedback": "三页残卷全部归位。蓝银布面书脊合拢的声音，听起来就像暴风雪停歇后的清晨一样安静。",
                        },
                    ],
                },
            ],
            "exlibris": {
                "code": "EX-LIBRIS · NO.02 · SCRIPTORIUM",
                "title": "雪夜隐墨志 · 孤本藏书票",
                "motto": "墨色或会褪去，但落笔时的刻痕与温度永存。",
                "edition": "梧桐骑楼书肆 · 银杏棉纸拓印本",
            },
            "mo_marginalia_pub": (
                "修复这卷烫银残册时，我在缺叶背面嗅到了淡淡的松烟香。"
                "淀粉碘墨受热隐去、柠檬果酸受热显影——同一簇壁炉火焰，既照出伪装者的侥幸，也唤醒了守书人埋在纸背的真话。"
                "有些心意哪怕暂时看不见墨色，只要侧过光去摸一摸纸上的笔痕，就知道写字的人曾经多么用力。"
            ),
            "mo_marginalia_deep": "",
            "mo_marginalia_masked_hint": "",
            "alice_marginalia": (
                "老院长这一手『你消你的假墨、我烤我的柠檬暗记』简直深得本社长真传！"
                "决定啦，以后万事屋的重要委托收据背面也涂一道柠檬汁防伪线，"
                "谁敢耍赖不认账，本侦探当场端出小炭炉烤给他看！"
            ),
        },
        {
            "id": "r3",
            "code": "R-03",
            "title": "黄昏旧书店与折翼纸鹤藏书志",
            "short_title": "黄昏旧书店折翼纸鹤",
            "provenance": "旧书街尽头 · 钟楼书肆私印手泽孤本",
            "era_tag": "暮色港口旧书店 · 索书号几何与未裁毛边页",
            "bg_thumb": "images/bg_street.png",
            "manuscript_intro": (
                "残卷摘录：临海港口的老书店主临终前，将一枚孤品古邮票藏进店内三千册旧书之间，"
                "留给孙女的唯一遗物是一只右翼尖端反折两道的旧地图纸鹤，以及半张印着『813.5 · 夕照不晒处』的借阅卡。"
            ),
            "folio_clues": [
                {
                    "id": "r3_c1",
                    "label": "残叶物证一 · 右翼双折角纸鹤",
                    "surface": "纸鹤用航海图裁边余纸折成，唯独右翼尖端向内整齐对折了两次。",
                    "magnified_note": (
                        "铜柄放大镜检视：将纸鹤肚腹朝下平放于柜台借阅垫板定位框时，"
                        "右翼双折角的折线延长方向呈仰角三十二度，精准指向书架自下而上第三层隔板。"
                    ),
                },
                {
                    "id": "r3_c2",
                    "label": "残叶物证二 · 半张借阅卡残印",
                    "surface": "卡片印有『813.5 · 夕照不晒处』字样，裁口边缘沾有微量暗绿青苔干粉。",
                    "magnified_note": (
                        "铜柄放大镜检视：书店西窗正对海港落日，南壁与中岛书架每逢傍晚均受斜阳直晒；"
                        "唯独背阴靠巷的北墙内侧木架常年避光微潮，架脚生有同类青苔，且 813.5 恰为欧美推理小说分类号。"
                    ),
                },
                {
                    "id": "r3_c3",
                    "label": "残叶物证三 · 未裁开的毛边书页",
                    "surface": "北墙第三排欧美推理区第七册法文旧书已被翻旧，唯独中段有两页天头仍相连。",
                    "magnified_note": (
                        "铜柄放大镜检视：手工毛边书装订后若未用裁纸刀全部划开，相连的『第 144 至 145 页』天头与前口"
                        "便会围成一只天然无胶的三角纸袋，夹入薄邮票既不伤背胶也不会在倒置抖动时滑脱。"
                    ),
                },
            ],
            "slots": [
                {
                    "slot_index": 0,
                    "slot_title": "骑缝缺叶壹 · 夕照不晒处的方位解谜",
                    "damaged_prompt": "待拼合推演：三千册旧书分列四壁，『夕照不晒处』指向哪一面书架？",
                    "restored_line": "港口书店西窗直面落日斜晖，唯有背阴靠巷、架脚微染青苔的北墙内侧书架常年避光，最宜保存怕晒褪色的古邮票。",
                    "candidates": [
                        {
                            "id": "r3_s0_a",
                            "text": "店主反其道而行，把古邮票贴在朝西橱窗玻璃正中央，利用落日强光让人视而不见",
                            "correct": False,
                            "alice_feedback": "那可不行！珍贵古邮票的天然矿物油墨晒上三个月海港夕阳，早就褪成一张白纸片啦！",
                            "mo_feedback": "老书店主是最心疼纸制品的人，结合借阅卡边缘的青苔干粉，再找找真正避光的地方吧。",
                        },
                        {
                            "id": "r3_s0_b",
                            "text": "港口西窗傍晚斜阳直入，唯有背阴靠巷的北墙内侧书架终年不受夕照且微染青苔，正是护票避光之处",
                            "correct": True,
                            "alice_feedback": "答对啦！既顾及古邮票防紫外线保存常识，又对上了借阅卡沾到的北墙青苔粉，严丝合缝！",
                            "mo_feedback": "第一处骑缝抚平了，旧书店里最安静的北墙阴影，往往藏着店主最舍不得见光的心头好。",
                        },
                        {
                            "id": "r3_s0_c",
                            "text": "『夕照不晒处』指店门口盛满雨水的消防铁桶桶底，太阳绝对晒不到水底下",
                            "correct": False,
                            "alice_feedback": "喂——古邮票背面的阿拉伯树胶一泡水就彻底报废成糊糊啦，哪有往水桶里藏邮票的书店主呀！",
                            "mo_feedback": "藏书家的谜底一定还在书架与书页之间哦。",
                        },
                    ],
                },
                {
                    "slot_index": 1,
                    "slot_title": "骑缝缺叶贰 · 折翼纸鹤的几何坐标",
                    "damaged_prompt": "待拼合推演：右翼双折角的纸鹤与『813.5』数字如何锁定唯一一册目标旧书？",
                    "restored_line": "将纸鹤置于借阅台定位框，右翼双折角仰角指向第三层隔板，与杜威分类法『813.5』欧美推理区交汇于北墙第三排第七册。",
                    "candidates": [
                        {
                            "id": "r3_s1_a",
                            "text": "将纸鹤平置借阅台定位框，右翼折角仰角指向第三层，配合杜威十进制『813.5』推理分类号锁定目标旧书",
                            "correct": True,
                            "alice_feedback": "漂亮！图书馆员基本功加几何视线定位——看来平时在学校图书馆没少跟着墨墨认索书号嘛！",
                            "mo_feedback": "墨墨眼底漾开浅浅笑意，用骨制压纸尺轻轻压实了第二道骑缝。",
                        },
                        {
                            "id": "r3_s1_b",
                            "text": "把航海图折成的纸鹤拆散浸入热红茶，纸背就会浮现出撬开地板砖的红叉藏宝图",
                            "correct": False,
                            "alice_feedback": "刚在上一卷修道院试过热茶柠檬，怎么到这一卷就要拆人家爷爷留下的纪念纸鹤泡茶啦！",
                            "mo_feedback": "墨墨轻轻伸手护住桌角的纸鹤图样：不用拆开它，折起翅膀的角度本身已经在替人指路了。",
                        },
                        {
                            "id": "r3_s1_c",
                            "text": "『813.5』代表晚上八点十三分半站在港口灯塔下，数第八百一十三只飞过的海鸥",
                            "correct": False,
                            "alice_feedback": "噗哈哈哈！海鸥飞到一半掉头回来重数怎么办？那是杜威十进制图书分类号啦大侦探！",
                            "mo_feedback": "813 在旧制分类卡里代表欧美文学与推理小说区，和北墙书架正好对应。",
                        },
                    ],
                },
                {
                    "slot_index": 2,
                    "slot_title": "骑缝缺叶叁 · 未裁毛边页的无损藏匿",
                    "damaged_prompt": "待拼合推演：为何窃贼曾把这册旧书倒提抖动搜查，却依然没能抖出藏在里面的古邮票？",
                    "restored_line": "该书第 144 至 145 页保留着天头相连的『未裁毛边页』天然纸袋，邮票稳妥拢于袋角，倒提抖动亦分毫不坠。",
                    "candidates": [
                        {
                            "id": "r3_s2_a",
                            "text": "店主用强力胶把古邮票死死糊在书脊内衬牛皮纸上，拿锤子都敲不下来",
                            "correct": False,
                            "alice_feedback": "集邮家要是拿强力胶糊孤品古邮票，那邮票品相直接归零，跟撕碎没两样啦！",
                            "mo_feedback": "不靠一滴胶水也能稳稳留住纸片，秘密就在残叶物证三的『手工毛边书』装帧结构里。",
                        },
                        {
                            "id": "r3_s2_b",
                            "text": "店主把整本书中间三百页挖出空洞，嵌进了一只带密码锁的微型黄铜盒",
                            "correct": False,
                            "alice_feedback": "整本书挖空塞铜盒，窃贼拿起来掂一下重量、翻一下书页当场就发现啦，哪还用倒着抖书呀！",
                            "mo_feedback": "真正高明的藏书术，是让这册书摸起来、翻起来都和普通旧书毫无二致。",
                        },
                        {
                            "id": "r3_s2_c",
                            "text": "第 144 至 145 页保留天头相连的『未裁毛边页』袋状夹层，古邮票无胶栖于纸袋折角，倒抖不落且品相完好",
                            "correct": True,
                            "alice_feedback": "三卷古籍残卷大功告成！『未裁毛边页』天然纸袋配折翼纸鹤坐标，连本社长都要为这位老店主鼓掌啦！",
                            "mo_feedback": "最后一页手泽孤本也修复如初了。你看，折起一侧翅膀的纸鹤，果然把最重要的心意平安送到了。",
                        },
                    ],
                },
            ],
            "exlibris": {
                "code": "EX-LIBRIS · NO.03 · GRUS PAPYRACEA",
                "title": "暮色折鹤志 · 孤本藏书票",
                "motto": "折起一侧翅膀的纸鹤，是为了替沉默的书页指路。",
                "edition": "钟楼书肆手泽本 · 金桂花笺钤印本",
            },
            "mo_marginalia_pub": (
                "在旧书街，保留着相连毛边的『未开本』常被称作还在等人的书。"
                "不涂胶水、不折伤齿孔，只借两页纸天然相连的怀抱替故人守住信物——"
                "就像有些说不出口的话，哪怕在书页间安静折起很久，也一直在等那个愿意耐心翻到第 144 页的人。"
            ),
            "mo_marginalia_deep": (
                "（TRUE END 后日谈续笔：走出旧仓库阴影后的那个深秋，我和陈默也在梧桐旧书街合折过第三只淡紫色的纸鹤。"
                "以前我总怕歪掉的翅膀不好看，现在才明白，每一道折痕都是把失散的时光重新折回掌心的路标。）"
            ),
            "mo_marginalia_masked_hint": (
                "【墨墨的深秋续笔受防剧透火漆保护 · 通关 TRUE END 或点击右上角「解锁剧透」后可阅览后日谈手记】"
            ),
            "alice_marginalia": (
                "索书号 813.5、避光北墙加上未裁毛边页，这才是正统爱书人与侦探的双重浪漫嘛！"
                "三卷旧书街残卷全部合璧，三枚孤本藏书票齐聚万事屋——嘴替先生，本社长给你记头等功一笔！"
            ),
        },
    ]

    _RESTORATION_MAP = {t["id"]: t for t in RESTORATION_TOMES}
    _restoration_workbench_state = {}

    def restoration_get_tome(tome_id):
        return _RESTORATION_MAP.get(tome_id, RESTORATION_TOMES[0])

    def _ensure_restoration_store():
        if getattr(persistent, "book_restoration_records", None) is None:
            persistent.book_restoration_records = {}
        return persistent.book_restoration_records

    def restoration_get_record(tome_id):
        tdef = restoration_get_tome(tome_id)
        tid = tdef["id"]
        raw = _ensure_restoration_store().get(tid) or {}
        inspected = list(raw.get("inspected_clues") or [])
        restored_slots = sorted(set(raw.get("restored_slots") or []))
        restored = bool(raw.get("restored", False))
        return {
            "restored": restored,
            "perfect_stamp": bool(raw.get("perfect_stamp", False)),
            "best_precision": int(raw.get("best_precision", 0) or 0),
            "last_precision": int(raw.get("last_precision", 0) or 0),
            "best_badge": raw.get("best_badge") or ("初审无瑕拓印" if raw.get("perfect_stamp") else ("精修合璧拓印" if restored else "待修复")),
            "inspected_clues": inspected,
            "restored_slots": restored_slots,
            "completions": int(raw.get("completions", 0) or 0),
        }

    def restoration_get_workbench(tome_id):
        tdef = restoration_get_tome(tome_id)
        tid = tdef["id"]
        rec = restoration_get_record(tid)
        if tid not in _restoration_workbench_state:
            init_stitched = [0, 1, 2] if rec["restored"] else list(rec["restored_slots"])
            next_slot = 0
            for idx in (0, 1, 2):
                if idx not in init_stitched:
                    next_slot = idx
                    break
            _restoration_workbench_state[tid] = {
                "active_slot": next_slot,
                "active_clue": tdef["folio_clues"][0]["id"],
                "stitched_slots": init_stitched,
                "session_mistakes": 0,
                "feedback_kind": "idle",
                "feedback_title": "",
                "alice_feedback": "",
                "mo_feedback": "",
            }
        return _restoration_workbench_state[tid]

    def restoration_reset_workbench_session():
        _restoration_workbench_state.clear()

    def restoration_select_tome(tome_id):
        tdef = restoration_get_tome(tome_id)
        persistent.restoration_selected_tome = tdef["id"]
        restoration_get_workbench(tdef["id"])
        renpy.restart_interaction()

    def restoration_inspect_clue(tome_id, clue_id):
        tdef = restoration_get_tome(tome_id)
        tid = tdef["id"]
        valid_ids = {c["id"] for c in tdef["folio_clues"]}
        if clue_id not in valid_ids:
            return False
        wb = restoration_get_workbench(tid)
        wb["active_clue"] = clue_id
        store_dict = dict(_ensure_restoration_store())
        prev = dict(store_dict.get(tid) or {})
        seen = list(prev.get("inspected_clues") or [])
        if clue_id not in seen:
            seen.append(clue_id)
        prev["inspected_clues"] = seen
        store_dict[tid] = prev
        persistent.book_restoration_records = store_dict
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.save_persistent()
        renpy.restart_interaction()
        return True

    def restoration_select_slot(tome_id, slot_idx):
        tdef = restoration_get_tome(tome_id)
        wb = restoration_get_workbench(tdef["id"])
        idx = max(0, min(2, int(slot_idx)))
        wb["active_slot"] = idx
        renpy.restart_interaction()

    def restoration_reset_tome_workbench(tome_id):
        """重设当前古籍的工作台拼合槽位以便重新推演，同时完整保留已解锁的孤本藏书票与最高精度记录。"""
        tdef = restoration_get_tome(tome_id)
        tid = tdef["id"]
        _restoration_workbench_state[tid] = {
            "active_slot": 0,
            "active_clue": tdef["folio_clues"][0]["id"],
            "stitched_slots": [],
            "session_mistakes": 0,
            "feedback_kind": "idle",
            "feedback_title": "工作台已重新铺开残叶，可再次体验三处骑缝拼合推演。",
            "alice_feedback": "",
            "mo_feedback": "",
        }
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.restart_interaction()

    def _restoration_calc_precision(mistakes_count):
        m = max(0, int(mistakes_count or 0))
        if m == 0:
            return 100, "初审无瑕拓印", True
        if m == 1:
            return 90, "精修合璧拓印", False
        if m == 2:
            return 82, "精修合璧拓印", False
        return 75, "古籍复原拓印", False

    def restoration_complete_tome(tome_id, mistakes_count=0):
        tdef = restoration_get_tome(tome_id)
        tid = tdef["id"]
        prec, badge, is_perf = _restoration_calc_precision(mistakes_count)
        store_dict = dict(_ensure_restoration_store())
        prev = restoration_get_record(tid)
        best_prec = max(prev["best_precision"], prec)
        perf_stamp = bool(prev["perfect_stamp"] or is_perf)
        if perf_stamp:
            best_badge = "初审无瑕拓印"
        elif prev["restored"] and prev["best_precision"] >= prec:
            best_badge = prev["best_badge"]
        else:
            best_badge = badge
        all_clue_ids = [c["id"] for c in tdef["folio_clues"]]
        merged_clues = list(dict.fromkeys(list(prev["inspected_clues"]) + all_clue_ids))
        updated = {
            "restored": True,
            "perfect_stamp": perf_stamp,
            "best_precision": best_prec,
            "last_precision": prec,
            "best_badge": best_badge,
            "inspected_clues": merged_clues,
            "restored_slots": [0, 1, 2],
            "completions": prev["completions"] + 1,
        }
        store_dict[tid] = updated
        persistent.book_restoration_records = store_dict
        renpy.save_persistent()
        if restoration_completed_count() >= len(RESTORATION_TOMES):
            ach_grant("ach_restoration")
        return updated

    def restoration_attempt_candidate(tome_id, slot_idx, cand_id):
        """在古籍修复台上尝试拼合某一处骑缝残片（错误仅给趣味批注提示，绝不污染主线 fail_count）。"""
        tdef = restoration_get_tome(tome_id)
        tid = tdef["id"]
        idx = max(0, min(2, int(slot_idx)))
        slot_def = tdef["slots"][idx]
        wb = restoration_get_workbench(tid)
        wb["active_slot"] = idx

        chosen = None
        for cand in slot_def["candidates"]:
            if cand["id"] == cand_id:
                chosen = cand
                break
        if chosen is None:
            return {"ok": False, "correct": False}

        if not chosen["correct"]:
            wb["session_mistakes"] = int(wb.get("session_mistakes", 0)) + 1
            wb["feedback_kind"] = "wrong"
            wb["feedback_title"] = "骑缝纸纹未吻合 · 再推敲一下物证细节（不计入主线失误）"
            wb["alice_feedback"] = chosen["alice_feedback"]
            wb["mo_feedback"] = chosen["mo_feedback"]
            renpy.sound.play("audio/sfx_wrong.ogg")
            renpy.restart_interaction()
            return {
                "ok": True,
                "correct": False,
                "completed_tome": False,
                "alice_feedback": chosen["alice_feedback"],
                "mo_feedback": chosen["mo_feedback"],
            }

        if idx not in wb["stitched_slots"]:
            wb["stitched_slots"] = sorted(set(wb["stitched_slots"] + [idx]))

        # 持久化部分进度，中途切页亦不丢失已拼合骑缝
        store_dict = dict(_ensure_restoration_store())
        prev_raw = dict(store_dict.get(tid) or {})
        merged_slots = sorted(set(list(prev_raw.get("restored_slots") or []) + wb["stitched_slots"]))
        prev_raw["restored_slots"] = merged_slots
        store_dict[tid] = prev_raw
        persistent.book_restoration_records = store_dict

        wb["feedback_kind"] = "correct"
        wb["alice_feedback"] = chosen["alice_feedback"]
        wb["mo_feedback"] = chosen["mo_feedback"]

        completed_now = len(wb["stitched_slots"]) >= 3
        if completed_now:
            rec = restoration_complete_tome(tid, wb.get("session_mistakes", 0))
            wb["feedback_title"] = "全卷三处骑缝合璧 · 已钤印【%s】（修复精度 %d%%）" % (
                tdef["exlibris"]["title"],
                rec["last_precision"],
            )
            renpy.sound.play("audio/sfx_crane.ogg")
        else:
            for next_i in (0, 1, 2):
                if next_i not in wb["stitched_slots"]:
                    wb["active_slot"] = next_i
                    break
            wb["feedback_title"] = "%s 复位成功 · 请继续拼合下一处缺叶（%d/3）" % (
                slot_def["slot_title"],
                len(wb["stitched_slots"]),
            )
            renpy.sound.play("audio/sfx_correct.ogg")
            renpy.save_persistent()

        renpy.restart_interaction()
        return {
            "ok": True,
            "correct": True,
            "completed_tome": completed_now,
            "alice_feedback": chosen["alice_feedback"],
            "mo_feedback": chosen["mo_feedback"],
        }

    def restoration_completed_count():
        return sum(1 for t in RESTORATION_TOMES if restoration_get_record(t["id"])["restored"])

    def restoration_perfect_count():
        return sum(1 for t in RESTORATION_TOMES if restoration_get_record(t["id"])["perfect_stamp"])

    def restoration_render_marginalia_view(tome_id):
        """渲染古籍双人藏书批注视图，严格联动 truth_spoiler_unlocked() 保护后日谈续笔。"""
        tdef = restoration_get_tome(tome_id)
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        has_deep = bool(tdef.get("mo_marginalia_deep"))
        mo_text = tdef["mo_marginalia_pub"]
        masked_note = ""
        if has_deep:
            if unlocked:
                mo_text = mo_text + "\n" + tdef["mo_marginalia_deep"]
            else:
                masked_note = tdef["mo_marginalia_masked_hint"]
        return {
            "tome_id": tdef["id"],
            "unlocked": unlocked,
            "has_spoiler_addendum": has_deep,
            "display_mo_marginalia": mo_text,
            "display_masked_hint": masked_note,
            "display_alice_marginalia": tdef["alice_marginalia"],
            "exlibris": dict(tdef["exlibris"]),
        }


    ############################################################################
    ## 二、四季纪念日手写信笺匣（4 封手写钢笔信笺 + 四季火漆印章 + 防剧透保护）
    ############################################################################

    SEASONAL_LETTERS = [
        {
            "id": "spring",
            "code": "SL-01",
            "season_tag": "春 · 四月樱",
            "short_title": "春樱坡道招新章",
            "title": "春樱坡道与万事屋第一枚招新章",
            "label": "season_letter_spring",
            "bg_key": "clubroom",
            "bg_thumb": "images/bg_gate.png",
            "ambient_mode": "warm",
            "lighting_note": "BG_LIGHT[gate/clubroom] 暖春晨光 · 樱瓣微风色温",
            "companions": "墨墨 · 艾丽丝 · 张子谦 · 班长林思思",
            "wax_seal_name": "春樱初约火漆印",
            "postmark": "云溪历 · 四月七日 · 樱花坡道社团招新日",
            "sender": "艾丽丝 执笔 · 墨墨 绘纸鹤边花",
            "salutation": "致 万事屋新上任的首席嘴替陈默：",
            "summary_pub": (
                "四月初春樱盛放的社团招新日，万事屋摊位收到一张夹着湿润樱瓣的匿名致谢卡。"
                "循着钢笔洇墨方向与第三棵迎风樱花树的线索，揭开春日下午最温柔的招新谜题。"
            ),
            "letter_body_pub": (
                "今天下午收摊清点招新表的时候，本社长原本还有点小不服气——明明围棋社和桌游社都摆了气球拱门，"
                "咱们万事屋只有一张旧木桌和一只墨墨折的纸鹤镇纸。可看到那位高一学妹塞进传单匣的樱花书签时，"
                "我突然觉得，能帮害羞说不出话的人把心意送到地方，比填满十页花名册都神气得多。\n"
                "墨墨刚刚在旁边拉了拉我的袖子，用蓝黑钢笔在信纸右下角添了一朵小小的五瓣樱花。"
                "既然你今天准确看穿了迎风第三棵樱树的露水洇墨谜题，这枚『春樱初约火漆印』就正式盖在你的社员聘书上啦——"
                "往后的春夏秋冬，不许迟到，也不许半路退社哦！"
            ),
            "mo_ps_pub": "墨墨附笔：「春风吹乱传单的时候，谢谢你先替我按住了摊开的牛皮纸本。第一枚樱花书签，分你一半。」",
            "alice_ps_pub": "艾丽丝附笔：「社团活动经费还剩十二块五，明天早自习后奖励嘴替先生一盒草莓牛奶！」",
            "has_te_spoiler": False,
            "deep_te_paragraph": "",
            "masked_te_prompt": "",
        },
        {
            "id": "summer",
            "code": "SL-02",
            "season_tag": "夏 · 骤雨檐",
            "short_title": "夏雨屋檐汽水签",
            "title": "骤雨屋檐下的弹珠汽水签之谜",
            "label": "season_letter_summer",
            "bg_key": "street",
            "bg_thumb": "images/bg_street.png",
            "ambient_mode": "rain",
            "lighting_note": "BG_LIGHT[street/canteen] 夏日骤雨青蓝偏冷 -> 雨霁暖光",
            "companions": "墨墨 · 艾丽丝 · 林依依 · 小卖部阿姨",
            "wax_seal_name": "夏雨晴檐火漆印",
            "postmark": "云溪历 · 七月二日 · 小卖部遮雨铁皮檐下",
            "sender": "墨墨 手写钢笔信笺 · 附小卖部弹珠汽水瓶颈圆签",
            "salutation": "给 一起在铁皮屋檐下听雨的你：",
            "summary_pub": (
                "期末考后的七月午后，一场白亮骤雨把众人困在小卖部遮雨棚下。冰桶边两枚『再来一瓶』弹珠汽水纸签"
                "闹出了乌龙罗生门，玻璃瓶外壁的冷凝水圈与油墨晕染替诚实的人守住了盛夏清凉。"
            ),
            "letter_body_pub": (
                "写这封信的时候，窗外的蝉鸣刚刚停歇，书桌角还摆着今天下午那只洗干净的透明弹珠汽水瓶。"
                "以前每逢雷雨突至的午后，我总习惯躲在图书馆最靠里的书架后面，等雨彻底停了才敢往回走；"
                "今天站在小卖部叮咚作响的铁皮屋檐下，听着冰块撞击玻璃瓶的脆响、看着你和艾丽丝还有依依围着汽水纸签认真推理，"
                "我忽然发现，夏天的骤雨原来也可以这么热闹、这么让人安心。\n"
                "那枚印着金星的瓶颈圆纸签，我已经用吸水纸压平夹进信封里了。"
                "下次再遇到突如其来的大雨，就算只带了一把伞，我们也慢慢走回万事屋吧。"
            ),
            "mo_ps_pub": "墨墨附笔：「玻璃珠落进瓶颈凹槽的清脆声音，和雨停后屋檐最后一滴水珠落进水洼的声音一模一样。」",
            "alice_ps_pub": "艾丽丝附笔：「哼哼，看穿干手撕签和冰瓶水汽印差别的那一下还算有本社长七分真传！下次中奖汽水归我先挑口味！」",
            "has_te_spoiler": False,
            "deep_te_paragraph": "",
            "masked_te_prompt": "",
        },
        {
            "id": "autumn",
            "code": "SL-03",
            "season_tag": "秋 · 银杏街",
            "short_title": "银杏旧书街书单",
            "title": "银杏旧书街的夹页荐书单",
            "label": "season_letter_autumn",
            "bg_key": "booksigning",
            "bg_thumb": "images/bg_booksigning.png",
            "ambient_mode": "dusk",
            "lighting_note": "BG_LIGHT[booksigning/riverside] 金秋暮色琥珀柔光",
            "companions": "墨墨 · 艾丽丝 · 吕芙 · 向言",
            "wax_seal_name": "秋叶藏书火漆印",
            "postmark": "云溪历 · 十月十九日 · 梧桐银杏旧书街骑楼",
            "sender": "墨墨 题于银杏压花信笺 · 吕芙赠诗集衬纸",
            "salutation": "致 陪我逛遍整条旧书街的陈默：",
            "summary_pub": (
                "金秋十月的梧桐旧书街漂流书摊上，一封夹在欧美短篇集里的『银杏荐书暗码单』等待有缘人破译。"
                "向言叔叔与吕芙的偶遇、三册旧书页码拼出的温暖赠言，将秋日黄昏染成温柔的琥珀色。"
            ),
            "letter_body_pub": (
                "把今天在旧书街拾到的那片扇形银杏叶夹进信纸时，叶缘还带着一点点晒过秋阳的干爽木香。"
                "向叔叔在漂流书摊前说，每一份手写荐书单其实都是一封寄给陌生知己的慢递信——"
                "出题的人把三本书的页码和首字藏进银杏书签，不是为了难倒读者，而是盼望有人能顺着同一束夕阳读懂那句问候。\n"
                "你站在骑楼灯影下替我念出拼合句子的那一刻，风正好吹落满街金黄的叶子。"
                "我把今天淘到的那本旧诗集包好了牛皮纸书衣，等下周社团活动日，想第一个借给你看。"
            ),
            "mo_ps_pub": "墨墨附笔：「夹在信封里的这枚银杏叶做过防脆压平处理，可以一直当你的推理书签用。」",
            "alice_ps_pub": "艾丽丝附笔：「向言老师的亲笔寄语加上本社长钦点的火漆章，这封秋日信笺的收藏价值起码翻十倍哦！」",
            "has_te_spoiler": True,
            "deep_te_paragraph": (
                "【TRUE END 后日谈手记】重新开口说话之后的秋天再去旧书街，我已经敢自己站在摊位前向老先生道谢、"
                "亲口把那句『春风替沉默的枝桠说出名字』轻声念给你听了。背包装着那十二封终于不再沉重的旧信之后的崭新空白信纸，"
                "连同我们合折的第三只淡紫千纸鹤一起，每一页写的都是正在向前的明天。"
            ),
            "masked_te_prompt": (
                "【秋日信笺背面的结局后日谈附页已加密 · 通关 TRUE END 或点击右上角「解锁剧透」后可展阅完整墨迹】"
            ),
        },
        {
            "id": "winter",
            "code": "SL-04",
            "season_tag": "冬 · 初雪炉",
            "short_title": "初雪万事屋围炉",
            "title": "初雪万事屋的围炉跨年信",
            "label": "season_letter_winter",
            "bg_key": "agency",
            "bg_thumb": "images/bg_agency.png",
            "ambient_mode": "warm",
            "lighting_note": "BG_LIGHT[gate/oden/agency] 初雪清冷暮色 -> 围炉暖黄茶烟",
            "companions": "墨墨 · 艾丽丝 · 张子谦 · 张阿姨 · 外婆",
            "wax_seal_name": "冬雪围炉火漆印",
            "postmark": "云溪历 · 十二月二十八日 · 万事屋铜壶暖炉旁",
            "sender": "墨墨 & 艾丽丝 & 张子谦 岁末围炉联名手札",
            "salutation": "致 陪我们走过四季风雪的陈默：",
            "summary_pub": (
                "岁末初雪飘落的傍晚，大家提着张记关东煮与外婆熬的热姜茶聚在万事屋围炉夜话。"
                "茶碟底下悄悄藏着四只折法各异的匿名贺年纸鹤，一场充满欢笑的折痕归属小推理温暖了整个寒冬。"
            ),
            "letter_body_pub": (
                "窗外第一场雪落上旧社团楼窗沿的时候，万事屋的铜茶壶正好咕嘟咕嘟冒起白汽，"
                "屋里混着张阿姨送来的昆布萝卜汤香和外婆保温桶里的红糖生姜甜味，暖和得让人根本舍不得哈气擦玻璃。\n"
                "今天茶碟底下那四只贺年小纸鹤，你居然单凭翼尖双折痕、裁纸刀直角边、指腹篮球防滑粉和姜茶水汽卷边"
                "就一口气认出了全部四位折鹤人——艾丽丝嘴上喊着题目太简单，背地里却把火漆勺烧得比谁都认真。\n"
                "这是今年四季信笺匣的最后一枚火漆印章。无论外面的雪下得多厚，"
                "万事屋的门铃永远为你留着最清脆的那一声，桌上的热茶也永远有你的一杯。"
            ),
            "mo_ps_pub": "墨墨附笔：「新的一年，也请继续做那个听见细微声音、愿意为温柔驻足的侦探吧。」",
            "alice_ps_pub": "艾丽丝附笔：「四季全勤奖核发完毕！明年万事屋的头号搭档席位，本社长已经提前给你续签一百年啦！」",
            "has_te_spoiler": True,
            "deep_te_paragraph": (
                "【TRUE END 后日谈手记】还记得十月底旧仓库天光落定之后，外婆握着我的手说『冬天总算过去了』。"
                "今晚围在暖炉边，当我不再靠牛皮纸本，而是看着你的眼睛亲口说出『陈默，新年快乐』的时候，"
                "周明远叔叔留下的那句『为了让疼的人知道有人看见了』，终于在雪夜的灯火里化成了真正的团圆。"
            ),
            "masked_te_prompt": (
                "【冬雪围炉信笺的结局重逢附言已加密 · 通关 TRUE END 或点击右上角「解锁剧透」后可展阅完整墨迹】"
            ),
        },
    ]

    _SEASON_MAP = {s["id"]: s for s in SEASONAL_LETTERS}

    def letterbox_get_def(season_id):
        return _SEASON_MAP.get(season_id, SEASONAL_LETTERS[0])

    def _ensure_letterbox_store():
        if getattr(persistent, "seasonal_letter_records", None) is None:
            persistent.seasonal_letter_records = {}
        return persistent.seasonal_letter_records

    def letterbox_get_record(season_id):
        sdef = letterbox_get_def(season_id)
        sid = sdef["id"]
        raw = _ensure_letterbox_store().get(sid) or {}
        sealed = bool(raw.get("sealed", False))
        gold = bool(raw.get("gold_seal", False))
        return {
            "sealed": sealed,
            "gold_seal": gold,
            "letter_read": bool(raw.get("letter_read", False) or sealed),
            "best_badge": raw.get("best_badge") or ("无瑕火漆金印" if gold else ("纪念火漆藏印" if sealed else "待拆封")),
            "last_badge": raw.get("last_badge") or "待拆封",
            "replays": int(raw.get("replays", 0) or 0),
        }

    def letterbox_select_season(season_id):
        sdef = letterbox_get_def(season_id)
        persistent.letterbox_selected_season = sdef["id"]
        renpy.restart_interaction()

    def letterbox_mark_letter_read(season_id):
        sdef = letterbox_get_def(season_id)
        sid = sdef["id"]
        store_dict = dict(_ensure_letterbox_store())
        prev = dict(store_dict.get(sid) or {})
        prev["letter_read"] = True
        store_dict[sid] = prev
        persistent.seasonal_letter_records = store_dict
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.save_persistent()
        return letterbox_get_record(sid)

    def letterbox_open_paper_modal(season_id):
        sdef = letterbox_get_def(season_id)
        persistent.letterbox_selected_season = sdef["id"]
        letterbox_mark_letter_read(sdef["id"])
        renpy.show_screen("seasonal_letter_paper_modal", sdef["id"])
        renpy.restart_interaction()

    def letterbox_record_clear(season_id, mistakes_count=0):
        sdef = letterbox_get_def(season_id)
        sid = sdef["id"]
        m = max(0, int(mistakes_count or 0))
        is_gold = (m == 0)
        cur_badge = "无瑕火漆金印" if is_gold else "纪念火漆藏印"
        store_dict = dict(_ensure_letterbox_store())
        prev = letterbox_get_record(sid)
        merged_gold = bool(prev["gold_seal"] or is_gold)
        best_badge = "无瑕火漆金印" if merged_gold else cur_badge
        updated = {
            "sealed": True,
            "gold_seal": merged_gold,
            "letter_read": True,
            "best_badge": best_badge,
            "last_badge": cur_badge,
            "replays": prev["replays"] + 1,
        }
        store_dict[sid] = updated
        persistent.seasonal_letter_records = store_dict
        renpy.save_persistent()
        if letterbox_seal_count() >= len(SEASONAL_LETTERS):
            ach_grant("ach_seasons")
        return updated

    def letterbox_seal_count():
        return sum(1 for s in SEASONAL_LETTERS if letterbox_get_record(s["id"])["sealed"])

    def letterbox_completed_count():
        return letterbox_seal_count()

    def letterbox_gold_seal_count():
        return sum(1 for s in SEASONAL_LETTERS if letterbox_get_record(s["id"])["gold_seal"])

    def letterbox_read_count():
        return sum(1 for s in SEASONAL_LETTERS if letterbox_get_record(s["id"])["letter_read"])

    def letterbox_render_letter_view(season_id):
        """渲染四季钢笔信笺内容，严格联动 truth_spoiler_unlocked() 遮罩后日谈剧透段落。"""
        sdef = letterbox_get_def(season_id)
        rec = letterbox_get_record(sdef["id"])
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        has_sp = bool(sdef.get("has_te_spoiler"))
        show_deep = bool(has_sp and unlocked)
        return {
            "id": sdef["id"],
            "code": sdef["code"],
            "season_tag": sdef["season_tag"],
            "title": sdef["title"],
            "postmark": sdef["postmark"],
            "sender": sdef["sender"],
            "salutation": sdef["salutation"],
            "wax_seal_name": sdef["wax_seal_name"],
            "sealed": rec["sealed"],
            "gold_seal": rec["gold_seal"],
            "letter_read": rec["letter_read"],
            "best_badge": rec["best_badge"],
            "replays": rec["replays"],
            "unlocked": unlocked,
            "has_te_spoiler": has_sp,
            "display_body": sdef["letter_body_pub"],
            "display_mo_ps": sdef["mo_ps_pub"],
            "display_alice_ps": sdef["alice_ps_pub"],
            "display_deep_paragraph": (sdef["deep_te_paragraph"] if show_deep else ""),
            "display_masked_prompt": (sdef["masked_te_prompt"] if (has_sp and not unlocked) else ""),
        }

    def letterbox_launch_action(season_id):
        """启动四季纪念日短篇独立 Replay 沙盒（提前清理鉴赏室留声机白噪音，不改动主线存档状态）。"""
        sdef = letterbox_get_def(season_id)
        return [
            Function(stop_all_gramophone_ambience, True),
            SetField(persistent, "letterbox_selected_season", sdef["id"]),
            Replay(sdef["label"], locked=False),
        ]


################################################################################
## 三、鉴赏分页界面 A：旧书街古籍残卷推演修复台（screen extras_restoration）
################################################################################

transform bookplate_gentle_glow:
    subpixel True
    block:
        ease 2.4 zoom 1.03 yoffset -2
        ease 2.4 zoom 1.0 yoffset 0
        repeat

screen extras_restoration():
    $ _tid = persistent.restoration_selected_tome or "r1"
    $ _tdef = restoration_get_tome(_tid)
    $ _rec = restoration_get_record(_tdef["id"])
    $ _wb = restoration_get_workbench(_tdef["id"])
    $ _mview = restoration_render_marginalia_view(_tdef["id"])
    $ _done_n = restoration_completed_count()
    $ _perf_n = restoration_perfect_count()
    $ _cur_slot_idx = max(0, min(2, int(_wb.get("active_slot", 0))))
    $ _cur_slot = _tdef["slots"][_cur_slot_idx]
    $ _cur_clue_id = _wb.get("active_clue") or _tdef["folio_clues"][0]["id"]
    $ _cur_clue = [c for c in _tdef["folio_clues"] if c["id"] == _cur_clue_id][0]

    vbox:
        spacing 9

        ## 1. 顶部修复台总览横幅
        frame:
            style "restoration_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_book_restoration.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 412
                        text _("旧书街古籍残卷修复台") font gui.name_text_font size 19 color "#f6e7c0"
                        text _("放大镜查验残叶物证 · 拼合三处骑缝推演 · 拓印古典孤本藏书票与双人书评") size 12 color "#b9a6d4"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_exlibris_bookplate.png" xysize (14, 14) yalign 0.5
                            text ("藏书票 %d/3" % _done_n) size 12 color "#f4d98a" yalign 0.5
                    frame:
                        style "mailbox_stat_chip"
                        text ("无瑕拓印 %d/3" % _perf_n) size 12 color "#f2e6ff" align (0.5, 0.5)

        ## 2. 三卷古籍切换卡（3 × 234 + 2 × 10 = 722px 严丝合缝）
        hbox:
            spacing 10
            for titem in RESTORATION_TOMES:
                $ _trec = restoration_get_record(titem["id"])
                $ _tsel = (titem["id"] == _tdef["id"])
                button:
                    style "restoration_tome_card"
                    selected _tsel
                    action Function(restoration_select_tome, titem["id"])
                    vbox:
                        spacing 3
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            text titem["code"] size 12 color ("#f4d98a" if _tsel else "#a892c2") bold True yalign 0.5
                            if _trec["restored"]:
                                hbox:
                                    xalign 1.0
                                    yalign 0.5
                                    spacing 4
                                    add "images/ui/icon_exlibris_bookplate.png" xysize (15, 15) yalign 0.5
                                    text (_("无瑕藏书票") if _trec["perfect_stamp"] else _("已拓藏书票")) size 11 color ("#f4d98a" if _trec["perfect_stamp"] else "#86efac") bold True yalign 0.5
                            else:
                                text ("待修复 %d/3" % len(_trec["restored_slots"])) size 11 color "#9a86b8" xalign 1.0 yalign 0.5
                        text titem["short_title"] font gui.name_text_font size 14 color "#f2e6ff"
                        text titem["provenance"] size 11 color "#9a86b8"

        ## 3. 古籍残卷推演修复工作台主体
        frame:
            style "restoration_workbench_card"
            vbox:
                spacing 8
                xfill True

                ## 3A. 卷宗标题栏与重设工作台按钮
                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 8
                        yalign 0.5
                        frame:
                            style "mailbox_code_badge"
                            text _tdef["code"] size 12 color "#ffffff" bold True align (0.5, 0.5)
                        vbox:
                            spacing 1
                            text ("《%s》" % _tdef["title"]) font gui.name_text_font size 17 color "#f6e7c0"
                            text ("%s  ·  %s" % (_tdef["provenance"], _tdef["era_tag"])) size 11 color "#cbb0e6"
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 6
                        text ("骑缝合璧 %d/3" % len(_wb["stitched_slots"])) size 12 color "#f4d98a" yalign 0.5
                        textbutton _("重铺残卷"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(restoration_reset_tome_workbench, _tdef["id"])

                ## 3B. 残卷案情摘录与三道骑缝复位概览
                frame:
                    xfill True
                    padding (11, 8)
                    background Frame("gui/hud_chip.png", 12, 12)
                    vbox:
                        spacing 4
                        text _tdef["manuscript_intro"] size 13 color "#ebe2f8" line_spacing 3
                        for s_obj in _tdef["slots"]:
                            $ _s_done = (s_obj["slot_index"] in _wb["stitched_slots"])
                            hbox:
                                spacing 6
                                yalign 0.5
                                add ("images/ui/icon_exlibris_bookplate.png" if _s_done else "images/ui/icon_book_restoration.png") xysize (14, 14) yalign 0.5
                                if _s_done:
                                    text ("【已复位】%s" % s_obj["restored_line"]) size 12 color "#86efac"
                                else:
                                    text ("【缺损中】%s" % s_obj["slot_title"]) size 12 color "#d8c8ee"

                ## 3C. 放大镜查验三枚残叶物证（3 × 226 + 2 × 8 = 694px 精确贴合内宽）
                text _("第一步 · 铜柄放大镜查验残叶物证（点击残叶对焦纸纹与墨迹）：") size 12 color "#f4d98a" bold True
                hbox:
                    spacing 8
                    for c_obj in _tdef["folio_clues"]:
                        $ _c_seen = (c_obj["id"] in _rec["inspected_clues"])
                        $ _c_active = (c_obj["id"] == _cur_clue["id"])
                        button:
                            style "restoration_clue_card"
                            selected _c_active
                            action Function(restoration_inspect_clue, _tdef["id"], c_obj["id"])
                            vbox:
                                spacing 2
                                xfill True
                                hbox:
                                    xfill True
                                    yalign 0.5
                                    text c_obj["label"] size 11 color ("#f4d98a" if _c_active else "#e2d4f4") bold True yalign 0.5
                                    text (_("已查验") if _c_seen else _("待查验")) size 10 color ("#86efac" if _c_seen else "#8a7aa0") xalign 1.0 yalign 0.5
                                text c_obj["surface"] size 11 color "#b9a6d4" line_spacing 2

                frame:
                    xfill True
                    padding (10, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        spacing 8
                        yalign 0.5
                        add "images/ui/icon_book_restoration.png" xysize (20, 20) yalign 0.5
                        text _cur_clue["magnified_note"] size 12 color "#fff1d0" line_spacing 2

                ## 3D. 三处骑缝缺叶拼合推演面板（未全部拼合时可逐槽匹配，全部拼合后亦可通过「重铺残卷」再玩）
                if len(_wb["stitched_slots"]) < 3:
                    text _("第二步 · 选择缺损骑缝并拼合匹配的古典推演残叶：") size 12 color "#f4d98a" bold True
                    hbox:
                        spacing 8
                        for s_tab in _tdef["slots"]:
                            $ _st_i = s_tab["slot_index"]
                            $ _st_done = (_st_i in _wb["stitched_slots"])
                            $ _st_short = s_tab["slot_title"].split(" · ")[0]
                            textbutton ("%s%s" % (_st_short, " · 已复位" if _st_done else " · 待拼合")):
                                style "lexicon_cat_pill"
                                selected (_st_i == _cur_slot_idx)
                                action Function(restoration_select_slot, _tdef["id"], _st_i)

                    text ("【%s】%s" % (_cur_slot["slot_title"], _cur_slot["damaged_prompt"])) size 13 color "#f6e7c0"
                    vbox:
                        spacing 5
                        xfill True
                        for cand in _cur_slot["candidates"]:
                            $ _slot_already = (_cur_slot_idx in _wb["stitched_slots"])
                            button:
                                style "restoration_candidate_btn"
                                selected (_slot_already and cand["correct"])
                                action Function(restoration_attempt_candidate, _tdef["id"], _cur_slot_idx, cand["id"])
                                hbox:
                                    spacing 8
                                    xfill True
                                    yalign 0.5
                                    add ("images/ui/icon_exlibris_bookplate.png" if (_slot_already and cand["correct"]) else "images/ui/icon_margin_quill_note.png") xysize (16, 16) yalign 0.5
                                    text cand["text"] size 12 color ("#86efac" if (_slot_already and cand["correct"]) else "#f2e6ff") yalign 0.5

                ## 3E. 墨墨与艾丽丝的实时修复台推演反馈条
                if _wb.get("feedback_title"):
                    frame:
                        xfill True
                        padding (11, 8)
                        background Frame("gui/hud_chip.png", 12, 12)
                        vbox:
                            spacing 4
                            text _wb["feedback_title"] size 12 color ("#86efac" if _wb.get("feedback_kind") == "correct" else "#f4d98a") bold True
                            if _wb.get("alice_feedback"):
                                text ("艾丽丝：%s" % _wb["alice_feedback"]) size 12 color "#f0c060" line_spacing 2
                            if _wb.get("mo_feedback"):
                                text ("墨墨（笔记）：「%s」" % _wb["mo_feedback"]) size 12 color "#d8c8ee" line_spacing 2

                ## 3F. 古典推理孤本藏书票与墨墨/艾丽丝双人书评展签（修复完成后永久点亮）
                if _rec["restored"]:
                    frame:
                        style "restoration_exlibris_card"
                        vbox:
                            spacing 7
                            xfill True
                            hbox:
                                xfill True
                                yalign 0.5
                                hbox:
                                    spacing 12
                                    yalign 0.5
                                    add "images/ui/icon_exlibris_bookplate.png" xysize (50, 50) yalign 0.5 at bookplate_gentle_glow
                                    vbox:
                                        spacing 2
                                        xsize 430
                                        text _mview["exlibris"]["code"] size 11 color "#f4d98a" bold True
                                        text ("【%s】" % _mview["exlibris"]["title"]) font gui.name_text_font size 17 color "#fff1d0"
                                        text ("藏书铭文：「%s」" % _mview["exlibris"]["motto"]) size 12 color "#e6d4ff"
                                vbox:
                                    xalign 1.0
                                    yalign 0.5
                                    spacing 3
                                    frame:
                                        style "mailbox_stat_chip"
                                        text ("%s · %d%%" % (_rec["best_badge"], _rec["best_precision"])) size 11 color "#f4d98a" align (0.5, 0.5)
                                    if _mview["has_spoiler_addendum"] and not persistent.te_cleared:
                                        if persistent.truth_spoiler_confirmed:
                                            textbutton _("恢复遮罩"):
                                                style "gramophone_mini_pill"
                                                xalign 1.0
                                                action [SetField(persistent, "truth_spoiler_confirmed", False), Function(renpy.save_persistent)]
                                        else:
                                            textbutton _("解锁剧透"):
                                                style "gramophone_mini_pill"
                                                xalign 1.0
                                                action Show("confirm",
                                                            message=_("尚未通关 TRUE END，确定提前揭晓古籍藏书批注中的结局后日谈续笔吗？"),
                                                            yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                                            no_action=Hide("confirm"))

                            frame:
                                style "lexicon_mo_note_box"
                                vbox:
                                    spacing 3
                                    hbox:
                                        spacing 6
                                        yalign 0.5
                                        add "images/ui/icon_crane_bookmark.png" xysize (14, 14) yalign 0.5
                                        text _("墨墨 · 牛皮纸古籍书评批注") size 12 color "#cfa6f0" bold True yalign 0.5
                                    text _mview["display_mo_marginalia"] size 12 color "#ebe2f8" line_spacing 3
                                    if _mview["display_masked_hint"]:
                                        text _mview["display_masked_hint"] size 11 color "#f0a4b8"

                            frame:
                                style "lexicon_alice_note_box"
                                vbox:
                                    spacing 3
                                    hbox:
                                        spacing 6
                                        yalign 0.5
                                        add "images/ui/icon_margin_quill_note.png" xysize (14, 14) yalign 0.5
                                        text _("艾丽丝 · 万事屋代价簿藏书按语") size 12 color "#f0c060" bold True yalign 0.5
                                    text _mview["display_alice_marginalia"] size 12 color "#fff1d0" line_spacing 3
                else:
                    frame:
                        xfill True
                        padding (10, 7)
                        background Frame("gui/hud_chip.png", 12, 12)
                        hbox:
                            spacing 8
                            yalign 0.5
                            add "images/ui/icon_exlibris_bookplate.png" xysize (22, 22) yalign 0.5 alpha 0.55
                            text _("完成本卷全部三处骑缝缺叶拼合后，即可拓印专属【古典推理孤本藏书票】并展阅墨墨与艾丽丝的双人书话批注。") size 12 color "#9a86b8" yalign 0.5


################################################################################
## 四、鉴赏分页界面 B：四季纪念日手写信笺匣（screen extras_letterbox + 手写信笺原件弹窗）
################################################################################

screen extras_letterbox():
    $ _sid = persistent.letterbox_selected_season or "spring"
    $ _sdef = letterbox_get_def(_sid)
    $ _srec = letterbox_get_record(_sdef["id"])
    $ _lview = letterbox_render_letter_view(_sdef["id"])
    $ _seal_n = letterbox_seal_count()
    $ _read_n = letterbox_read_count()
    $ _gold_n = letterbox_gold_seal_count()

    vbox:
        spacing 9

        ## 1. 四季信笺匣总览横幅与防剧透开关
        frame:
            style "restoration_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_seasonal_letterbox.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 396
                        text _("四季纪念日手写信笺匣") font gui.name_text_font size 19 color "#f6e7c0"
                        if persistent.te_cleared:
                            text _("TRUE END 已通关 · 春夏秋冬四封纪念日剧场与后日谈亲笔信笺已完整开放。") size 12 color "#d8c8ee"
                        elif persistent.truth_spoiler_confirmed:
                            text _("已手动开启剧透许可 · 当前可展阅秋冬信笺中的结局后日谈附笔。") size 12 color "#f0a4b8"
                        else:
                            text _("重温春夏秋冬四段纪念日剧场 · 涉结局后日谈附笔已由防剧透火漆自动保护。") size 12 color "#b9a6d4"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_wax_seal_seasons.png" xysize (14, 14) yalign 0.5
                            text ("火漆印 %d/4" % _seal_n) size 12 color "#f4d98a" yalign 0.5
                    if not persistent.te_cleared:
                        if persistent.truth_spoiler_confirmed:
                            textbutton _("恢复遮罩"):
                                style "gramophone_mini_pill"
                                yalign 0.5
                                action [SetField(persistent, "truth_spoiler_confirmed", False), Function(renpy.save_persistent)]
                        else:
                            textbutton _("解锁剧透"):
                                style "gramophone_mini_pill"
                                yalign 0.5
                                action Show("confirm",
                                            message=_("尚未通关 TRUE END，确定提前揭晓「四季纪念日手写信笺匣」中的结局后日谈附笔吗？"),
                                            yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                            no_action=Hide("confirm"))

        ## 2. 四季切换卡（4 × 173 + 3 × 10 = 722px 像素级严丝合缝）
        hbox:
            spacing 10
            for sitem in SEASONAL_LETTERS:
                $ _ir = letterbox_get_record(sitem["id"])
                $ _isel = (sitem["id"] == _sdef["id"])
                button:
                    style "letterbox_season_card"
                    selected _isel
                    action Function(letterbox_select_season, sitem["id"])
                    vbox:
                        spacing 3
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            text sitem["season_tag"] size 11 color ("#f4d98a" if _isel else "#cbb0e6") bold True yalign 0.5
                            if _ir["sealed"]:
                                add "images/ui/icon_wax_seal_seasons.png" xysize (15, 15) xalign 1.0 yalign 0.5
                            else:
                                text _("待钤印") size 10 color "#8a7aa0" xalign 1.0 yalign 0.5
                        text sitem["short_title"] font gui.name_text_font size 14 color "#f2e6ff"
                        text (_ir["best_badge"] if _ir["sealed"] else _("手写笺可阅")) size 11 color ("#f4d98a" if _ir["gold_seal"] else ("#86efac" if _ir["sealed"] else "#9a86b8"))

        ## 3. 当前选中季节剧场与钢笔手写信笺详情台
        frame:
            style "teaparty_detail_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add _sdef["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add "images/ui/icon_seasonal_letterbox.png" xysize (24, 24) xalign 0.05 yalign 0.08
                        if _srec["sealed"]:
                            add "images/ui/icon_wax_seal_seasons.png" xysize (28, 28) xalign 0.96 yalign 0.08
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text _sdef["code"] size 12 color "#ffffff" bold True align (0.5, 0.5)
                            text ("《%s》" % _sdef["title"]) font gui.name_text_font size 17 color "#f6e7c0" yalign 0.5
                        text ("同行伙伴：%s" % _sdef["companions"]) size 12 color "#cbb0e6"
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (15, 15) yalign 0.5
                            text ("季节色温：%s" % _sdef["lighting_note"]) size 12 color "#a892c2" yalign 0.5
                        if _srec["sealed"]:
                            text ("收藏状态：已钤盖【%s】（%s · 已重温 %d 次）" % (_sdef["wax_seal_name"], _srec["best_badge"], _srec["replays"])) size 12 color "#f4d98a"
                        else:
                            text ("收藏状态：尚未钤盖【%s】（体验纪念日短篇即可钤印火漆章）" % _sdef["wax_seal_name"]) size 12 color "#8a7aa0"

                text _sdef["summary_pub"] size 13 color "#ebe2f8" line_spacing 3

                ## 手写钢笔信笺内页预览卡
                frame:
                    style "letterbox_stationery_card"
                    vbox:
                        spacing 5
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_margin_quill_note.png" xysize (15, 15) yalign 0.5
                                text ("%s  ·  %s" % (_lview["postmark"], _lview["sender"])) size 11 color "#f4d98a" yalign 0.5
                            hbox:
                                xalign 1.0
                                yalign 0.5
                                spacing 4
                                add "images/ui/icon_wax_seal_seasons.png" xysize (14, 14) yalign 0.5 alpha (1.0 if _lview["sealed"] else 0.45)
                                text (_lview["wax_seal_name"] if _lview["sealed"] else _("火漆待钤印")) size 11 color ("#f4d98a" if _lview["sealed"] else "#9a86b8") yalign 0.5

                        text _lview["salutation"] font gui.name_text_font size 14 color "#fff1d0"
                        text _lview["display_body"] size 12 color "#ebe2f8" line_spacing 3
                        text _lview["display_mo_ps"] size 12 color "#cfa6f0"
                        text _lview["display_alice_ps"] size 12 color "#f0c060"
                        if _lview["display_deep_paragraph"]:
                            add Solid("#f4d98a33") xfill True ysize 1
                            text _lview["display_deep_paragraph"] size 12 color "#86efac" line_spacing 3
                        elif _lview["display_masked_prompt"]:
                            add Solid("#6a5c8044") xfill True ysize 1
                            text _lview["display_masked_prompt"] size 11 color "#f0a4b8"

                ## 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("已阅信笺 %d/4 · 无瑕金印 %d/4 · 全钤印解锁「四季火漆信笺」" % (_read_n, _gold_n)) size 12 color "#9a86b8" yalign 0.5
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 6
                        textbutton _("千纸鹤陈列柜"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action SetField(persistent, "extras_tab", "origami")
                        textbutton _("展阅信笺原件"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(letterbox_open_paper_modal, _sdef["id"])
                        textbutton (_("重温纪念剧场") if _srec["sealed"] else _("拆信进入剧场")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 142
                            ysize 36
                            text_size 15
                            action letterbox_launch_action(_sdef["id"])

        ## 4. 四季信笺速览直达条
        for sitem in SEASONAL_LETTERS:
            $ _qr = letterbox_get_record(sitem["id"])
            frame:
                style "mailbox_quick_row"
                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 10
                        yalign 0.5
                        add ("images/ui/icon_wax_seal_seasons.png" if _qr["sealed"] else "images/ui/icon_seasonal_letterbox.png") xysize (20, 20) yalign 0.5
                        text ("%s · %s" % (sitem["code"], sitem["title"])) font gui.name_text_font size 14 color "#f2e6ff" yalign 0.5
                        text ("（%s）" % (_qr["best_badge"] if _qr["sealed"] else "未钤印")) size 12 color ("#f4d98a" if _qr["gold_seal"] else ("#86efac" if _qr["sealed"] else "#7e6d99")) yalign 0.5
                    textbutton (_("再次展信") if _qr["sealed"] else _("立即拆阅")):
                        style "gramophone_mini_pill"
                        xalign 1.0
                        yalign 0.5
                        action letterbox_launch_action(sitem["id"])


## 手写钢笔信笺独立展阅弹窗（大字距温润信纸排版 + 火漆印章特写）
screen seasonal_letter_paper_modal(season_id="spring"):
    modal True
    zorder 215
    $ _mv = letterbox_render_letter_view(season_id)

    add "#080510dc"
    key "K_ESCAPE" action Hide("seasonal_letter_paper_modal")
    key "K_RETURN" action Hide("seasonal_letter_paper_modal")
    key "K_SPACE" action Hide("seasonal_letter_paper_modal")

    frame:
        xalign 0.5
        yalign 0.5
        xsize 740
        padding (24, 20)
        background Frame("gui/panel_card.png", 16, 16)
        vbox:
            spacing 10
            xfill True
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 12
                    yalign 0.5
                    add "images/ui/icon_seasonal_letterbox.png" xysize (38, 38) yalign 0.5
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_mv["code"], _mv["title"])) font gui.name_text_font size 20 color "#f6e7c0"
                        text ("%s  |  %s" % (_mv["postmark"], _mv["sender"])) size 12 color "#cbb0e6"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_wax_seal_seasons.png" xysize (34, 34) yalign 0.5
                    text _mv["wax_seal_name"] size 13 color "#f4d98a" bold True yalign 0.5

            add Solid("#f4d98a44") xfill True ysize 1

            viewport:
                xfill True
                ysize 340
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    text _mv["salutation"] font gui.name_text_font size 17 color "#fff1d0"
                    text _mv["display_body"] size 14 color "#f2e6ff" line_spacing 5
                    add Solid("#cbb0e633") xfill True ysize 1
                    text _mv["display_mo_ps"] size 13 color "#cfa6f0" line_spacing 4
                    text _mv["display_alice_ps"] size 13 color "#f0c060" line_spacing 4
                    if _mv["display_deep_paragraph"]:
                        add Solid("#f4d98a44") xfill True ysize 1
                        text _mv["display_deep_paragraph"] size 13 color "#86efac" line_spacing 4
                    elif _mv["display_masked_prompt"]:
                        add Solid("#6a5c8055") xfill True ysize 1
                        text _mv["display_masked_prompt"] size 12 color "#f0a4b8"

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上信笺夹") size 12 color "#9a86b8" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 10
                    textbutton _("进入本季纪念剧场"):
                        style "gramophone_mini_pill"
                        yalign 0.5
                        action [Hide("seasonal_letter_paper_modal")] + letterbox_launch_action(_mv["id"])
                    textbutton _("合上信笺"):
                        style "pill_button"
                        xminimum 116
                        ysize 34
                        text_size 14
                        action Hide("seasonal_letter_paper_modal")


## 四季纪念日短篇内顶部谜题横幅
screen season_riddle_prompt_banner(season_badge, prompt_line):
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
            add "images/ui/icon_seasonal_letterbox.png" xysize (24, 24) yalign 0.5
            vbox:
                spacing 1
                text season_badge size 12 color "#f4d98a" bold True
                text prompt_line size 14 color "#f6eeff"


## 四季纪念日剧场结算火漆钤印卡
screen seasonal_letter_result_card(season_id, cur_badge, best_badge, mistakes, replays):
    modal True
    zorder 220
    $ _sdef = letterbox_get_def(season_id)
    $ _is_gold = (cur_badge == "无瑕火漆金印")

    add "#080510dc"
    key "K_RETURN" action Return("back_to_letterbox")
    key "K_SPACE" action Return("back_to_letterbox")
    key "K_ESCAPE" action Return("back_to_letterbox")

    frame:
        xalign 0.5
        yalign 0.5
        xsize 660
        padding (26, 22)
        background Frame("gui/panel_card.png", 16, 16)
        vbox:
            spacing 12
            xfill True
            hbox:
                spacing 14
                xalign 0.5
                yalign 0.5
                add "images/ui/icon_wax_seal_seasons.png" xysize (56, 56) yalign 0.5 at bookplate_gentle_glow
                vbox:
                    spacing 3
                    yalign 0.5
                    text ("四季纪念日火漆已钤印 · %s" % _sdef["code"]) size 13 color "#f4d98a" bold True
                    text ("《%s》" % _sdef["title"]) font gui.name_text_font size 21 color "#f6e7c0"
                    text ("获授印鉴：【%s】 · %s" % (_sdef["wax_seal_name"], cur_badge)) size 14 color ("#f4d98a" if _is_gold else "#86efac")

            add Solid("#f4d98a33") xfill True ysize 1

            frame:
                xfill True
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 4
                    text _sdef["salutation"] font gui.name_text_font size 15 color "#fff1d0"
                    text _sdef["mo_ps_pub"] size 13 color "#cfa6f0"
                    text _sdef["alice_ps_pub"] size 13 color "#f0c060"
                    text ("累计展信重温：%d 次  |  历史最高印鉴：%s  |  四季火漆进度：%d/4" % (replays, best_badge, letterbox_seal_count())) size 12 color "#b9a6d4"

            textbutton _("收入信笺匣并返回鉴赏室"):
                style "pill_button"
                xalign 0.5
                xminimum 220
                ysize 38
                text_size 15
                action Return("back_to_letterbox")


################################################################################
## 五、样式定义（PC-7 古籍残卷修复台与四季信笺匣）
################################################################################

style bookstreet_subtab_pill is pill_button:
    xminimum 66
    ysize 24
    padding (6, 0)

style bookstreet_subtab_pill_text is pill_button_text:
    size 11

style restoration_header_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style restoration_tome_card is button:
    xsize 234
    ysize 78
    padding (10, 8)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style restoration_workbench_card is default:
    xfill True
    padding (14, 11)
    background Frame("gui/panel_card.png", 16, 16)

style restoration_clue_card is button:
    xsize 226
    yminimum 76
    padding (8, 6)
    background Frame("gui/hud_chip.png", 12, 12)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style restoration_candidate_btn is button:
    xfill True
    yminimum 36
    padding (10, 6)
    background Frame("gui/hud_chip.png", 12, 12)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style restoration_exlibris_card is default:
    xfill True
    padding (12, 10)
    background Frame("gui/panel_card.png", 16, 16)

style letterbox_season_card is button:
    xsize 173
    ysize 80
    padding (9, 7)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style letterbox_stationery_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)


################################################################################
## 六、四季纪念日剧场独立沙盒初始化与收尾出口（零侵入主线好感/失误/存档）
################################################################################

label _season_letter_init_sandbox(session_save_title, init_ambient="warm"):
    $ full_run = False
    $ save_name = session_save_title
    $ mo_favor = 86
    $ alice_favor = 62
    $ fail_count = 0
    $ intuition = 3
    $ evidence = []
    $ inspected_evidence = []
    $ expanded_evidence = ""
    $ set_ambient(init_ambient)
    return

label _season_letter_finish_vignette(season_id, local_mistakes=0):
    $ _sl_mistakes = max(0, int(local_mistakes or 0))
    $ _sl_rec = letterbox_record_clear(season_id, _sl_mistakes)
    hide screen season_riddle_prompt_banner
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen seasonal_letter_result_card(season_id, _sl_rec["last_badge"], _sl_rec["best_badge"], _sl_mistakes, _sl_rec["replays"])
    $ persistent.extras_tab = "letterbox"
    $ persistent.letterbox_selected_season = season_id
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 七、春之笺 SL-01：《春樱坡道与万事屋第一枚招新章》
################################################################################

label season_letter_spring:
    call _season_letter_init_sandbox("四季信笺 · SL-01 春樱坡道与万事屋第一枚招新章", "warm")
    $ _sl_mistakes = 0

    scene bg black with fade
    $ play_bgm(bgm_daily, fadein=1.5)
    centered "{size=+6}四季纪念日手写信笺 · SPRING SL-01{/size}\n\n{size=+14}春樱坡道与万事屋第一枚招新章{/size}\n\n{color=#f4d98a}四月七日午后 · 云溪高中樱花坡道 · 迎风花瓣与洇墨谢卡{/color}"

    scene bg gate at bg_kenburns_out
    $ set_ambient("warm")
    with dissolve

    play sound se_bell
    "四月初的云溪高中校门坡道两侧，早樱正开到最热闹的时节。和煦的东南风穿过层层叠叠的粉白花枝，在招新长桌的棉麻桌布上洒下细碎的树影与花瓣。"
    show alice happy at left
    show mo smile at right
    alice "听好啦听好啦！今天是一年一度的春季社团联合招新日！隔壁桌游社搬出了整套鎏金轮盘，器乐社架起了两台大音箱，咱们万事屋绝不能在气势上输给他们！"
    mc "话虽这么说……社长大人，我们桌面上除了这摞手绘招新传单、一只铜铃铛，就只剩墨墨刚折好的三只小纸鹤镇纸了吧？"
    show alice blush at left
    alice "贵精不贵多懂不懂！真正的名侦探事务所，靠的从来不是花里胡哨的充气拱门，而是洞察一切蛛丝马迹的实力！"
    play sound se_write
    show mo happy at right
    "墨墨坐在铺着浅米色桌布的木椅旁，被春风吹起额前一缕柔顺的发丝。她低头在牛皮纸笔记本上飞快写下一行字，笑吟吟地推到我们中间。"
    mo_note "刚才路过的三位高一新生都多看了我们的纸鹤两眼哦，只是看到艾丽丝双手叉腰站在桌前，好像有点不好意思靠近。"
    show alice angry at left, sprite_jump
    alice "什、什么嘛！本社长这叫威严与亲和力并存的社长站姿！"

    show zhang happy at center
    with dissolve
    zhang "哈哈哈，老远就听见艾丽丝社长在坡道上发表演说了！喏，学生会刚分发的社团登记红印泥，班长让我顺路给你们捎一盒过来。"
    hide zhang
    show banzhang smile at center
    banzhang "陈默、墨墨，还有艾丽丝，下午坡道风大，我们班刚借走两捆备用麻绳加固展板。对了，半小时前我经过坡道中段的时候，看到有个扎马尾的一年级学妹抱着一摞借书证，在几个摊位附近徘徊了好久呢。"
    mc "抱着借书证的一年级学妹？难道是有委托想找万事屋帮忙？"
    banzhang "我正想上前问她，迎面吹来一阵大风，满树樱花瓣哗啦啦落了一地，等我揉完眼睛再看，她已经跑回教学楼方向了。我先去前面巡视摊位，你们加油呀！"
    hide banzhang with dissolve

    play sound se_page
    show mo shock at right
    "林思思刚走开没几步，正在整理传单木匣的墨墨忽然轻轻『咦』了一声，用纤细的指尖从一叠招新表夹层里拈起了一张淡粉色的手工压花卡。"
    mc "传单匣里什么时候多了一张卡片？刚才我们去校门口搬折叠椅那五分钟塞进来的？"
    show alice think at left
    alice "快拿来本侦探瞧瞧！唔……卡片正面夹着两枚还带着清凉水珠的新鲜早樱花瓣，背面用纯蓝钢笔水写着一行字——"
    centered "{color=#f4d98a}「致上周在图书馆帮我捡起散落借书卡的学长与安静的学姐：\n我把回礼的樱花干花书签放在『坡道第三棵迎风樱花树下、最不怕风吹走纸页的摊位』旁啦，谢谢你们！」{/color}"
    mc "上周在图书馆帮高一新生捡借书卡……啊，我想起来了，周五闭馆前确实有个学妹在楼梯口撞散了一怀抱的新生临时借阅卡，我和墨墨顺手帮她按班级排好递过去了。"
    show alice shock at left
    alice "慢着慢着！从校门口往上数一共有六棵大樱花树，左右两侧摆了十几个社团招新桌！而且这张卡片边缘有一道刚洇开的浅蓝色水迹，学妹究竟把回礼书签放在哪张摊位旁边了？"
    play sound se_write
    show mo think at right
    mo_note "先别急着一棵棵翻找。仔细看卡片上的水珠、纯蓝墨水的晕染方向，还有她说『最不怕风吹走纸页的摊位』——答案其实已经写在现场了。"

label season_spring_q_loop:
    show screen season_riddle_prompt_banner("春樱之谜 · 迎风樱瓣与洇墨方向", "卡片夹着带晨露的迎风面早樱花瓣，纯蓝墨迹仅在右侧边缘微洇，且提示『最不怕风吹走纸页的摊位』——回礼书签藏在哪里？")
    menu:
        "在坡道最顶端背风处的围棋社气球拱门下，因为黑白棋子最重不怕风吹":
            hide screen season_riddle_prompt_banner
            $ _sl_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo smile at right
            alice "不对不对！坡道最顶端那棵是背风的老槐树，根本不是迎风面的第三棵早樱树，而且围棋社桌上根本没有纸页，全是塑料棋罐啦！"
            play sound se_write
            mo_note "再看看我们自己长桌四角压着什么镇纸吧？从校门数上来的东南迎风坡第三棵樱树，树冠正好笼罩着谁的头顶呢？"
            jump season_spring_q_loop

        "就在我们万事屋长桌右侧的铜铃木匣下——本摊正好位于迎风坡第三棵樱树下，且四角用纸鹤与账本压住传单":
            hide screen season_riddle_prompt_banner
            play sound se_correct

        "在器乐社的大音箱顶上，卡片边缘的水迹是学妹喝冰汽水不小心洒上去的":
            hide screen season_riddle_prompt_banner
            $ _sl_mistakes += 1
            play sound se_wrong
            show alice angry at left, sprite_jump
            show mo think at right
            alice "喂——四月初春风还凉飕飕的，谁在露天坡道灌冰汽水呀！而且汽水渍会发黏带甜味，这滴水珠明明是树梢吹落的花瓣露水！"
            play sound se_write
            mo_note "东南风从坡道右侧吹来，只有站在迎风第三棵樱树下的这张桌子旁写卡片，枝头落下的花瓣露珠才会恰好打湿卡片右边角哦。"
            jump season_spring_q_loop

    mc "等一下——今天刮的是东南风，从校门坡道口往上数，迎风面第三棵早樱树，树枝不就正正好好伸在我们万事屋招新桌的头顶吗！"
    mc "而且整条坡道的社团传单刚才都被风吹得满地乱跑，唯独我们桌上用艾丽丝的厚账本、铜铃铛和墨墨折的纸鹤把传单压得稳稳当当！"
    show alice shock at left, sprite_jump
    show mo happy at right
    play sound se_clue
    "我伸手轻轻抬起长桌右侧的黄铜小铃铛底座——只见一只叠得方方正正的浅青色信封静静躺在木纹桌布下，里面整整齐齐装着三枚塑封好的透明早樱干花书签！"
    alice "哇啊！灯下黑！原来那位学妹趁我们去搬椅子的空当，把致谢卡塞进传单匣、又把回礼书签压在铜铃下面啦！"
    play sound se_write
    mo_note "书签背面还写了一行小字：『希望有一天我也能像学姐一样，哪怕不善言辞，也能温柔地帮别人解开难题。』"

    scene bg clubroom at bg_kenburns_out
    $ set_ambient("warm")
    $ play_bgm(bgm_warm, fadein=1.5)
    show alice smile at left
    show mo smile at right
    with dissolve

    "傍晚五点半，夕阳把旧社团楼活动室的木地板染成暖融融的蜜糖色。我们把招新木牌搬回万事屋，艾丽丝郑重其事地搬出了一只雕花胡桃木信笺匣和一柄黄铜火漆印章。"
    alice "咳咳！虽然今天正式填表入社的新人还是零个，但收到第一份来自春天的匿名感谢礼，说明咱们万事屋的金字招牌已经打响头炮啦！"
    alice "本社长决定立个新规矩——从这个春天开始，每逢值得纪念的季节日子，我们就在信笺匣里封存一封手写钢笔信，盖上万事屋的纸鹤火漆章！"

    menu:
        "看着墨墨摊开浅米色信纸、艾丽丝点燃火漆蜡烛的认真模样，我决定——"

        "轻轻拈起落在墨墨发梢的一片早樱花瓣，夹进第一封信的衬纸里":
            show mo blush at right
            mc "既然是春樱招新纪念日，光有墨水怎么够？刚才从坡道一路跟着墨墨回来的这片樱花瓣，也一起封进信里当证物吧。"
            play sound se_write
            mo_note "……嗯。那刚才那三枚学妹送的樱花干花书签，我们一人一枚，谁也不许弄丢。"

        "接过黄铜火漆勺帮艾丽丝稳住火苗，在信封口端端正正钤下第一枚纸鹤印章":
            show alice happy at left
            mc "融火漆这种精细活交给我来扶勺，社长大人只管端正往下盖章，保证第一枚火漆印圆润饱满！"
            alice "算你有眼力见！看好了——万事屋春季第一号纪念火漆，落印！"

    play sound se_crane
    "暗红色的温热火漆在棉浆信封口缓缓凝结，浮现出一只展翅欲飞的纤巧纸鹤纹章。春风拂过半开的木窗，带着坡道上尚未散尽的早樱清香，将属于我们的第一个春天稳稳收进了木匣深处。"

    call _season_letter_finish_vignette("spring", _sl_mistakes)
    return


################################################################################
## 八、夏之笺 SL-02：《骤雨屋檐下的弹珠汽水签之谜》
################################################################################

label season_letter_summer:
    call _season_letter_init_sandbox("四季信笺 · SL-02 骤雨屋檐下的弹珠汽水签之谜", "rain")
    $ _sl_mistakes = 0

    scene bg black with fade
    $ play_bgm(bgm_suspense, fadein=1.5)
    centered "{size=+6}四季纪念日手写信笺 · SUMMER SL-02{/size}\n\n{size=+14}骤雨屋檐下的弹珠汽水签之谜{/size}\n\n{color=#8cc0e6}七月二日午后 · 校园小卖部遮雨棚 · 冰镇水汽与圆签罗生门{/color}"

    scene bg street at bg_kenburns_out
    $ set_ambient("rain")
    play sound se_rain
    with dissolve

    "七月初期末考刚结束的午后，闷热了一整天的云层毫无预兆地裂开一道银白缝隙。豆大的夏日骤雨噼里啪啦砸在林荫道与小卖部的波纹铁皮雨棚上，溅起一层白蒙蒙的清凉水雾。"
    show alice shock at left
    show mo neutral at right
    alice "呜哇——刚才出教学楼的时候明明还挂着大太阳，怎么才走了一百米就下起瓢泼阵雨啦！幸好本侦探反应神速，一步跨进了小卖部屋檐底下！"
    mc "是是是，社长大人冲刺速度堪比校田径队，就是怀里抱着的旧杂志差点飞出去半本。"
    play sound se_write
    show mo smile at right
    "墨墨收起把我们三个人护过来的那把大号深蓝格子伞，从口袋里摸出干净的棉布手帕，先递给艾丽丝擦拭发梢上的雨珠，随后在笔记本上写下一行小字。"
    mo_note "夏天的过云雨来得急去得也快，大概二十分钟就会放晴。正好在小卖部廊下歇一会儿脚吧。"

    show ayi happy at center
    with dissolve
    ayi "哎呀，是万事屋的几个孩子呀！快往屋檐里边站站，别让斜风飘雨打湿了校服。今天天热，阿姨刚往大白铁皮冰桶里镇了两打柠檬味弹珠汽水，正搞『盛夏金星再来一瓶』抽奖呢！"
    show lin shock at center
    hide ayi
    with dissolve
    "我们转头望去，只见图书委员林依依和同班的张子谦也躲在屋檐另一头。两人面前的小木凳上并排放着两瓶刚撬开玻璃弹珠的冰镇汽水，铁皮冰桶盖上则湿漉漉地摆着两枚套在瓶颈上的环形纸签。"
    lin "那、那个……陈默同学，墨墨！你们来得正好！我和张子谦刚才一人买了一瓶弹珠汽水，把瓶颈套着的抽奖圆纸签撕下来放在铁皮桶盖上，结果一阵穿堂风刮过去，两张纸签叠在了一起！"
    hide lin
    show zhang shock at center
    zhang "冤枉啊！我买完汽水刚弯腰系了个鞋带，抬头就看见其中一张圆纸签背面印着『盛夏金星·再来一瓶』！我明明记得我是用右手干干爽爽撕下纸签放左边那张的，可林依依非说她刚才摸过左边那张！"
    hide zhang
    show lin blush at center
    lin "我、我也不是贪图多喝一瓶汽水啦……只是我刚从满是碎冰水的铁桶里捞出汽水就顺手撕了纸签，万一拿错了本该属于张子谦的中奖签，心里总觉得过意不去嘛！"
    show alice happy at left
    alice "哼哼！听见没有陈默？冰镇弹珠汽水引发的屋檐密室——不对，屋檐圆签归属悬案！两瓶汽水一模一样，两张圆纸签正面花纹也分毫不差，本侦探给你一分钟还原真相！"

    play sound se_write
    show mo think at right
    "墨墨俯下身，隔着半寸距离仔细端详铁皮桶盖上的两枚环形纸签：左边的金星中奖签整张纸面均匀潮软，背面红印油微微向四周化开；右边那张『谢谢惠顾』未中奖签却只有底部贴合桶盖处沾了一圈窄窄的湿痕，撕口处干燥硬挺。"
    mo_note "答案就在『先系鞋带的干手指』与『刚从冰水桶捞瓶子的湿手指』留下的不同痕迹里。"

label season_summer_q_loop:
    show screen season_riddle_prompt_banner("夏雨之谜 · 冰桶水汽与撕签指痕", "张子谦擦干手后才撕下纸签，林依依刚从冰水里捞出汽水便湿手撕签——左边整张潮软晕墨的金星中奖签究竟是谁撕下的？")
    menu:
        "金星签整张浸透冰水且撕口湿软晕墨，正是刚从碎冰桶捞完汽水、满手冰水的林依依亲手撕下的":
            hide screen season_riddle_prompt_banner
            play sound se_correct

        "金星签是张子谦撕下的，因为男生力气大，撕纸产生的静电把空气里的雨水全吸到了左边纸签上":
            hide screen season_riddle_prompt_banner
            $ _sl_mistakes += 1
            play sound se_wrong
            show alice angry at left, sprite_jump
            show mo smile at right
            alice "喂——！雨天空气湿度接近百分之百，静电早就跑得无影无踪啦！撕张小纸片还能吸雨水，你当张子谦是雷神托尔吗！"
            play sound se_write
            mo_note "对比一下两张纸签的撕口纤维吧：干手指撕开的纸口毛刺干燥分明，而满手冰水捏住撕开的纸签会整张沁湿晕墨哦。"
            jump season_summer_q_loop

        "两张纸签其实都没中奖，那颗红色金星是铁皮冰桶盖生锈掉色印上去的巧合":
            hide screen season_riddle_prompt_banner
            $ _sl_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo think at right
            alice "噗——铁锈要是能自动印出五角星加『再来一瓶』四个楷体小字，小卖部阿姨直接把铁桶送去博物馆展出好啦！"
            play sound se_write
            mo_note "右边那张纸签撕口干爽硬挺，只有底部沾了桶盖冷凝水，说明那是擦干手之后才撕下来的。"
            jump season_summer_q_loop

    mc "破案啦——张子谦刚才先付钱再弯腰系鞋带，手上是干爽的，所以他撕下来的纸签撕口硬挺干燥，只有放在桶盖上那一面沾了一圈水痕，也就是右边那张『谢谢惠顾』！"
    mc "而依依刚把手伸进碎冰水里捞出汽水，手指挂满冰水就顺手捏住纸签撕开，冰水浸透纸背让红印油微微晕染，所以左边这张『盛夏金星·再来一瓶』百分百是依依抽中的！"
    show lin shock at center
    lin "真、真的耶！我刚才捞最底下那瓶冰汽水的时候，半截手掌都泡在冰水里！原来真是我抽中的！"
    hide lin
    show zhang happy at center
    zhang "哈哈哈，我就说万事屋一出马，连一张汽水纸签都藏不住秘密！愿赌服输，依依同学手气旺，这瓶中奖汽水理当归你！"
    hide zhang
    show ayi smile at center
    ayi "你们这群孩子呀，买瓶汽水都能讲出这么多门道来！看在帮阿姨把账算得明明白白的份上，阿姨再多送两瓶冰镇菠萝汽水，大家一块儿润润嗓子！"
    hide ayi with dissolve

    scene bg canteen at bg_kenburns_out
    $ set_ambient("warm")
    $ play_bgm(bgm_warm, fadein=1.5)
    show alice happy at left
    show mo smile at right
    with dissolve

    "二十分钟后，急促的骤雨果然像被人轻轻拉上了水帘，云缝间透出洗刷一新的澄澈金色阳光，林荫道两侧响起清亮绵长的夏蝉初鸣。"
    "林依依特意把那瓶中奖换来的柠檬弹珠汽水塞给了墨墨，还不好意思地把洗干净擦干的金星瓶颈圆纸签也留给我们做破案纪念。"
    play sound se_bell
    "我们并排坐在小卖部旁边的长木椅上，同时用塑料顶盖『啵』地一声按落瓶颈玻璃弹珠。清凉微甜的柠檬气泡混着雨后青草香在空气里轻轻炸开。"

    menu:
        "看着墨墨双手捧着冰凉的玻璃汽水瓶、被气泡声逗得弯起眼睛的模样，我决定——"

        "用手帕替她裹住挂满冷凝水珠的冰凉瓶身，免得冻红手指":
            show mo blush at right
            mc "刚从碎冰桶捞出来的玻璃瓶太冰了，用这块干手帕垫着拿，既不滑手也不冻指尖。"
            play sound se_write
            mo_note "谢谢陈默……手帕上还有淡淡的阳光晒过的味道，配冰柠檬汽水刚刚好。"

        "举起手里的弹珠汽水瓶，和墨墨、艾丽丝轻轻碰响属于盛夏的第一杯庆功饮":
            show alice smile at left
            show mo happy at right
            mc "来，敬我们万事屋三秒钟侦破的『盛夏弹珠汽水案』，也敬雨过天晴的暑假前夜！"
            alice "干杯——！清脆的玻璃瓶碰杯声，可比高脚杯神气多啦！"

    play sound se_crane
    "回到活动室后，墨墨把那枚印着红金五角星的瓶颈圆纸签平整夹进第二封手写钢笔信笺，再由艾丽丝融化琥珀金混绯红的火漆，端端正正盖下『夏雨晴檐火漆印』。玻璃瓶里滚动的透明弹珠声，连同屋檐滴落的雨后晴光，一并锁进了信笺匣中。"

    call _season_letter_finish_vignette("summer", _sl_mistakes)
    return


################################################################################
## 九、秋之笺 SL-03：《银杏旧书街的夹页荐书单》
################################################################################

label season_letter_autumn:
    call _season_letter_init_sandbox("四季信笺 · SL-03 银杏旧书街的夹页荐书单", "dusk")
    $ _sl_mistakes = 0

    scene bg black with fade
    $ play_bgm(bgm_prologue, fadein=1.5)
    centered "{size=+6}四季纪念日手写信笺 · AUTUMN SL-03{/size}\n\n{size=+14}银杏旧书街的夹页荐书单{/size}\n\n{color=#dcb488}十月十九日黄昏 · 梧桐银杏旧书街 · 三册页码与漂流书笺{/color}"

    scene bg booksigning at bg_kenburns_out
    $ set_ambient("dusk")
    with dissolve

    "十月中旬的周日傍晚，斜阳穿过老城区骑楼外一排高大的百年银杏，把整条旧书街铺成了一条流动的碎金长河。微凉的秋风卷起两三片扇形黄叶，轻轻打着旋儿落在『秋日图书漂流木箱』的绿绒布上。"
    show alice smile at left
    show mo smile at right
    alice "哇，旧书街每逢十月办的这个『盲盒荐书漂流集』还真是名不虚传！每位读者挑走一本书的时候，都要往木箱里留一张亲手写的银杏荐书卡，给下一位有缘人留条线索！"
    mc "我刚看了一圈，有的读者画了插画，有的写了三行诗，简直像整条街的爱书人在隔空对暗号一样。"

    show lvfu smile at center
    with dissolve
    lvfu "陈默同学，墨墨，艾丽丝社长！真巧呀，你们也来赶傍晚场的旧书漂流集吗？"
    hide lvfu
    show xiang smile at center
    xiang "哈哈，我刚把几本早年绝版的短篇推理译本捐进漂流木箱，正好碰到吕芙同学在帮摊主老先生整理外文诗歌区。"
    mc "爸？！你出门前不是说去出版社送校样吗，怎么转头就溜达到旧书街当神秘藏书人来了？"
    xiang "校样四点钟就交完啦。对了，既然万事屋三位侦探全员到齐，刚才漂流木箱最顶上有一封指名『留给云溪高中最默契的侦探搭档』的银杏夹页荐书单，吕芙正替你们留着呢。"
    hide xiang
    show lvfu happy at center
    play sound se_page
    "吕芙微笑着从诗集封皮间取出一枚压平的金黄银杏叶卡片递给我们。卡片正面用隽秀的蓝黑钢笔写着三行页码暗码："
    centered "{color=#f4d98a}「漂流木箱左侧三册旧译本——\n第一册《冷雨馆》取『扉页译者序最末一字』；\n第二册《钟塔来信》取『目录中紧挨被折角那一章的页码个位数对应字』；\n第三册《白鸽邮差》取『未被夕阳晒黄的内页书签绳所夹行首字』。」{/color}"
    hide lvfu with dissolve

    show alice think at left
    alice "嚯，三本书拼字暗码！让我翻翻看——第一册《冷雨馆》扉页译者序最后一句是『愿微光长存』，最末一字是『存』！第三册《白鸽邮差》深蓝丝带书签绳正好夹在第 62 页第一行『心怀远方』，行首字是『心』！"
    mc "难就难在第二册《钟塔来信》！我刚翻开目录页，上面第 3 章（第 42 页）和第 7 章（第 98 页）居然各有一道折角！"
    play sound se_write
    show mo think at right
    "墨墨接过《钟塔来信》，指尖轻轻抚过目录页两处折角：第 3 章那道折角纸色发深、折痕脆硬发黄；而第 7 章（第 98 页）那道折角内侧纸白鲜亮，且折线旁留有一星尚未彻底干透的蓝黑钢笔墨点，与银杏卡片上的墨色完全一致。"
    "至于目录下方附印的十一个编号备选字，第 2 号字是『谢』，第 8 号字是『意』，第 9 号字是『秋』。"

label season_autumn_q_loop:
    show screen season_riddle_prompt_banner("秋叶之谜 · 新旧折角与三字暗码", "第一册得『存』，第三册得『心』；第二册第 3 章（42 页）为陈年黄脆旧折角，第 7 章（98 页）带同款新蓝黑墨点——三字暗码拼出什么？")
    menu:
        "选第 3 章旧折角页码 42 的个位数 2 号字『谢』，拼成『存谢心』":
            hide screen season_riddle_prompt_banner
            $ _sl_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo smile at right
            alice "唔……『存谢心』念起来拗口得像古文翻译腔失败现场耶！而且第 3 章那道折角都发黄变脆了，明显是几年前原书主人留下的旧痕迹嘛！"
            play sound se_write
            mo_note "出题人是今天下午刚写下银杏卡片的，留意第 7 章（第 98 页）折角旁那一点同款蓝黑钢笔新墨迹吧。"
            jump season_autumn_q_loop

        "选第 7 章新折角页码 98 的十位数 9 号字『秋』，拼成『存秋心』，也就是倒过来的『愁』字":
            hide screen season_riddle_prompt_banner
            $ _sl_mistakes += 1
            play sound se_wrong
            show alice angry at left, sprite_jump
            show mo think at right
            alice "喂喂！题目白纸黑字写着『页码个位数对应字』，你把 98 页的十位数 9 抓出来凑个『秋心愁』干嘛啦！好好金秋佳节不许胡乱悲秋！"
            play sound se_write
            mo_note "98 的个位数是 8 哦，对照一下第 8 号字是什么，再把第一册的『存』、第三册的『心』按心意语序连起来看看？"
            jump season_autumn_q_loop

        "锁定带同款新墨点的第 7 章（98 页），取个位数 8 号字『意』，与首尾两册合为『存心意』（将心意珍存）":
            hide screen season_riddle_prompt_banner
            play sound se_correct

    mc "第 3 章是原书主多年前留下的旧折痕，第 7 章（第 98 页）折角边沾着和银杏卡同款的蓝黑钢笔墨点，才是出题人刚刚折下的！取 98 的个位数 8 号字『意』，三本书连起来正是——『存心意』！"
    show xiang happy at center
    with dissolve
    xiang "一点不差！其实这张银杏荐书卡，是我刚才听吕芙说起你们万事屋平时总帮同学们找回失落的信件与书籍，临时借她的银杏书签给你们出的小考题。"
    hide xiang
    show lvfu smile at center
    lvfu "向老师说，侦探社平时总在解开别人的烦恼，偶尔也该收到一份专程为你们准备的秋日谜题礼——这册烫金诗集衬页和银杏压花信纸，请你们务必收下！"
    hide lvfu with dissolve

    scene bg riverside at bg_kenburns_out
    $ set_ambient("dusk")
    $ play_bgm(bgm_warm, fadein=1.5)
    show alice smile at left
    show mo smile at right
    with dissolve

    "辞别父亲和吕芙后，我们沿着洒满落日余晖的河堤慢慢往回走。秋水映着漫天橘粉色的晚霞，微风送来远处街头糖炒栗子的焦甜暖香，两三只白鹭掠过波光粼粼的浅滩。"
    alice "说起来，向言老师出的这道三册书拼字谜题还真有意思——一本写雨夜微光，一本写钟塔远信，一本写白鸽归途，合在一块儿正好是一封不用贴邮票的秋日问候。"
    mc "毕竟是天天跟译稿打交道的人嘛。不过刚才墨墨只看了一眼折角旁边的未干蓝黑墨点，就排除了那道陈年旧折痕，反应比我还快半拍。"
    if truth_spoiler_unlocked():
        show mo blush at right
        "走到河堤长椅旁时，墨墨停下脚步，双手轻轻拢在唇边呵出一小团温热的气息，没有去摸帆布包里的笔记本，而是抬起清澈的眼眸，用轻柔却无比清晰的嗓音对我说道："
        mo "……陈默，『将心意珍存』。今年秋天在旧书街读到的每一行字，还有风吹过银杏树叶的声音，以后我都可以亲口念给你听了。"
        show alice happy at left
        alice "哼哼，听见墨墨亲口念诗，某位嘴替先生眼睛都看直啦！走啦走啦，回万事屋把这片金银杏叶封进第三封季节信笺里！"
    else:
        play sound se_write
        show mo blush at right
        "走到河堤长椅旁时，墨墨停下脚步，把那枚金黄透亮的银杏叶轻轻放在吕芙送的压花信纸中央，提笔写下一行端正温柔的钢笔字递到我面前："
        mo_note "『将心意珍存』——不管是书页间的暗号，还是并肩走过旧书街的黄昏，我都已经全部记进这一页秋天里了。"
        show alice happy at left
        alice "好啦好啦，你们俩别站在河堤风口对视傻笑啦！赶紧回万事屋点蜡烛盖第三枚秋叶火漆章！"

    menu:
        "迎着河堤镀金的秋日暮色，我打算怎么珍藏这份旧书街纪念？"

        "挑一片脉络最完整的扇形银杏叶，和墨墨一起端正夹进信封内衬":
            show mo happy at right
            mc "这片银杏叶边缘一点缺口都没有，夹在信纸正中间，哪怕再过很多年翻开，肯定还是今天傍晚暖金色的样子。"
            play sound se_write
            mo_note "嗯，等明年十月银杏再黄的时候，我们再一起回旧书街添一页新的书单。"

        "在信封背面记下今天三册漂流旧书的书名，留作万事屋秋季共读书单":
            show alice happy at left
            mc "我把《冷雨馆》《钟塔来信》和《白鸽邮差》工工整整记在信封背面，这个十月咱们万事屋正好一人读一本交换批注！"
            alice "赞成！谁最后一个读完，下周社团活动就负责泡桂花红茶哦！"

    play sound se_crane
    "古铜色与枫叶红交融的火漆落在第三封信笺封口，凝成清晰的纸鹤与秋叶印纹。旧书街翻动毛边书页的沙沙轻响，就此化作了信笺匣里永不褪色的十月黄昏。"

    call _season_letter_finish_vignette("autumn", _sl_mistakes)
    return


################################################################################
## 十、冬之笺 SL-04：《初雪万事屋的围炉跨年信》
################################################################################

label season_letter_winter:
    call _season_letter_init_sandbox("四季信笺 · SL-04 初雪万事屋的围炉跨年信", "cool")
    $ _sl_mistakes = 0

    scene bg black with fade
    $ play_bgm(bgm_warm, fadein=1.5)
    centered "{size=+6}四季纪念日手写信笺 · WINTER SL-04{/size}\n\n{size=+14}初雪万事屋的围炉跨年信{/size}\n\n{color=#e6d4ff}十二月二十八日傍晚 · 万事屋暖炉圆桌 · 初雪茶烟与四只纸鹤{/color}"

    scene bg oden at bg_kenburns_out
    $ set_ambient("warm")
    with dissolve

    "十二月二十八日傍晚，岁末寒假前的最后一天。巷口张记关东煮的红灯笼在暮色里轻轻摇晃，铅灰色的冬日天空忽然飘起了今年第一场细雪，晶莹蓬松的六角雪花无声地落在木屋檐与冬青叶上。"
    show zhang happy at left
    show zhangma smile at right
    zhangma "陈默呀，把这只双层保温提锅拎稳喽！里面是阿姨刚出锅的昆布白萝卜、竹轮卷和鱼籽福袋，汤头熬了足足四个钟头，趁热提去你们社团活动室，下雪天孩子们围一块儿吃最暖身子！"
    mc "谢谢张阿姨！子谦这家伙在半路上闻了一路香味，刚才过马路的时候差点没忍住掀盖偷吃一串白萝卜。"
    zhang "胡说八道，本少爷那是在替大家检查保温桶密封硅胶圈严不严实！妈您快回店里看火吧，外头雪花越飘越密，等聚会结束我再把空桶提回来洗！"
    hide zhang
    hide zhangma
    with dissolve

    scene bg gate at bg_kenburns_out
    $ set_ambient("cool")
    with dissolve
    "我和张子谦一人拎着保温提锅、一人抱着干柴纹餐垫快步穿过飘雪的校门坡道。路灯刚刚亮起清润的光晕，雪粒落在伞面上发出细碎如砂糖般的沙沙轻响。"

    scene bg agency at bg_kenburns_out
    $ set_ambient("warm")
    play sound se_door
    show alice happy at left
    show mo smile at right
    with dissolve

    "推开万事屋厚木门的一刹那，融融暖意裹挟着红糖生姜与锡兰红茶的甜香扑面而来。圆桌中央的小电陶炉上，黄铜水壶正欢快地吐着白雾；外婆下午顺路捎来的青花保温壶就摆在桌角，窗玻璃上已经凝起了一层柔和的白霜。"
    show waipo smile at center
    with dissolve
    waipo "陈默和子谦把关东煮提回来啦？姜茶外婆已经帮你们煨在壶里了，天黑路滑，外婆得赶在雪积厚前回家收晾在廊下的棉被，你们几个孩子热热闹闹聚一聚！"
    mc "外婆您慢走，等会儿雪停了我送墨墨回巷口！"
    hide waipo with dissolve

    play sound se_bell
    "热腾腾的关东煮与红糖姜茶分装进粗陶碗里，大家围着暖炉谈天说地，屋里笑声不断。等到茶过三巡，艾丽丝神秘兮兮地敲了敲茶匙，指着圆桌正中四只倒扣的白瓷茶碟。"
    show alice smile at left
    alice "锵锵——万事屋岁末压轴余兴节目开始！刚才趁你去校门口接保温桶的工夫，我和墨墨、张子谦，还有临走前凑热闹的外婆，每人用方才裁剩下的信纸折了一只『跨年祝福纸鹤』，打乱顺序藏在了四只茶碟底下！"
    show zhang happy at center
    zhang "嘿嘿，规矩很简单！掀开茶碟看背面祝词之前，陈大侦探得单凭这四只纸鹤的外观特征，一次性猜出哪一只才是墨墨折给你的跨年鹤！"
    hide zhang

    play sound se_page
    "艾丽丝揭开四只白瓷茶碟，四只形态各异的奶油白小纸鹤整整齐齐排在暖黄台灯光下："
    "一号鹤棱角锋利如刀裁，连翅膀尖都是拿黄铜直尺比着刮平的；二号鹤个头最大，翼尖沾着一点点极细的白色碳酸镁篮球防滑粉；三号鹤折法古朴慈祥，尾翼带着熬姜茶时水汽熏出的微卷弧度；而四号鹤体型最纤巧，每一道折线都用指腹温柔抚过，唯独右翼尖端轻轻向内反折了两道小小折角。"

label season_winter_q_loop:
    show screen season_riddle_prompt_banner("初雪之谜 · 四只跨年纸鹤的折痕主人", "一号直尺刮棱、二号沾有防滑白粉、三号带着姜茶水汽微卷、四号指腹轻抚且右翼反折两道——哪一只是墨墨折的？")
    menu:
        "选一号纸鹤：因为墨墨做笔记最工整，一定会拿黄铜直尺把每道折痕刮成刀锋直角":
            hide screen season_riddle_prompt_banner
            $ _sl_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo smile at right
            alice "噗——拿本社长记代价簿专用的黄铜直尺强迫症式刮折痕的，当然是本侦探亲手折的一号鹤啦！"
            play sound se_write
            mo_note "我折纸鹤从来不用直尺硬刮纸面哦，再看看哪一只翅膀尖留着我们刚在旧书街古籍里见过的熟悉小记号？"
            jump season_winter_q_loop

        "选二号纸鹤：上面白色的粉末肯定是窗外飘进来的初雪雪花":
            hide screen season_riddle_prompt_banner
            $ _sl_mistakes += 1
            play sound se_wrong
            show alice angry at left, sprite_jump
            show mo happy at right
            alice "喂——屋里开着暖炉二十二度，真雪花落上来半秒钟就化成水滴啦！那是张子谦刚打完室内篮球没洗干净的防滑镁粉！"
            play sound se_write
            mo_note "三号带着红糖姜茶的甜暖水汽是外婆折的；再看看第四只右翼尖端的小折角吧。"
            jump season_winter_q_loop

        "选四号纸鹤：指腹抚平的柔和折痕，加上右翼尖端反折两道的『指路暗号』，一定是墨墨亲手折的":
            hide screen season_riddle_prompt_banner
            play sound se_correct

    mc "这还用猜吗——一号黄铜直尺刮边是艾丽丝的杰作，二号沾篮球镁粉是张子谦折的，三号带着姜茶热气微卷是外婆的手艺；而四号纸鹤指腹折痕轻柔，右翼尖端还特意折了两道替心意指路的小折角，百分百是墨墨折的！"
    show alice happy at left
    show mo blush at right
    alice "切——一点悬念都没有，四发全中！算你通过万事屋年度默契终审考核啦！"

    "窗外的初雪越飘越静，暖黄灯光映在结霜的玻璃窗格上，将小小一间活动室烘托得宛如风雪海面上一座安稳的灯塔。"
    if truth_spoiler_unlocked():
        show mo smile at right
        "墨墨轻轻捧起那只右翼微折的四号白色纸鹤放在我掌心。曾经需要靠牛皮纸笔记本才能传达千言万语的少女，此刻在暖炉跃动的微光里弯起眉眼，清晰而轻柔地向我开了口："
        mo "陈默，谢谢你这一整年从春樱、夏雨、秋叶一路陪我走到初雪……漫长的冬天已经彻底过去了，新的一年，也请多多指教。"
        mc "嗯，不管再过多少个四季，你的第一听众永远在这儿。"
    else:
        play sound se_write
        show mo smile at right
        "墨墨轻轻捧起那只右翼微折的四号白色纸鹤放在我掌心，随后翻开纸鹤翅膀背面，露出她用钢笔端正写下的一行岁末寄语："
        mo_note "『谢谢你从春樱、夏雨、秋叶一路陪我们走到初雪。只要万事屋的灯还亮着，冬天就一点也不冷。』"
        mc "嗯，不管再过多少个四季，万事屋的茶壶和你的第一听众永远在这儿。"

    menu:
        "端起热气腾腾的红糖姜茶，在这个初雪围炉的岁末傍晚，我想许下什么愿望？"

        "把四只跨年纸鹤并排摆在胡桃木信笺匣旁，和大家一起签下联名岁末信":
            show alice smile at left
            show mo happy at right
            mc "四只纸鹤一只都不能少！咱们在第四封冬雪信笺上联名签字，把今晚的关东煮香和初雪一起留住！"

        "在起雾的窗玻璃上并排画下一只小纸鹤与万事屋门牌，再亲手钤下第四枚火漆章":
            show alice happy at left
            show mo blush at right
            mc "看，窗玻璃上的小纸鹤负责替我们守夜，信封上的火漆印负责替我们把四季装订成册！"

    play sound se_crane
    "深绯色的热火漆稳稳落在第四封联名手写信笺封口，铜章抬起时，『冬雪围炉火漆印』在炉火映照下泛着温润的光泽。春夏秋冬四封手写信笺至此在胡桃木匣中圆满齐聚，而属于万事屋的故事，仍在温暖的明日里继续书写。"

    call _season_letter_finish_vignette("winter", _sl_mistakes)
    return
