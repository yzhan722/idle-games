## 《沉默侦探：千纸鹤的约定》—— PC-9 旧钟楼星象馆暗号之夜与侦探社纪念铜章手账册
## stargazer_badges.rpy
##
## 设计要点：
##   1. 100% 零侵入主线剧情（script.rpy / chapter1..6.rpy / definitions.rpy 推理与好感公式零改动）。
##   2. 「旧钟楼星象馆暗号之夜」（screen extras_planetarium + 3 段可游玩星图暗号短篇）：
##      墨墨与艾丽丝随陈默登上即将翻修的旧钟楼顶层星象馆，破解老天文社留下的三笺古典星图暗号
##      （S-01 斗柄与指极星 / S-02 二十八宿四象与南斗 / S-03 天津九星与辇道增七双星），
##      每破一笺解锁一条星图批注；选错只给温柔提示、只计入本地 _pl_mistakes，绝不触碰主线 fail_count，
##      持久化于 persistent.planetarium_records。
##   3. 「侦探社纪念铜章手账册」（screen extras_badge_journal + 手账页弹窗）：
##      收录鉴赏室九项玩法（信箱 / 茶会 / 辞典 / 古籍 / 信笺 / 鹤谱 / 电台 / 星象 / 真约）的纪念铜章，
##      完成对应玩法即可「拓印入册」并展阅墨墨与艾丽丝的纪念手记；涉终章的手记续笔严格联动
##      truth_spoiler_unlocked() 零侧信道遮罩，持久化于 persistent.badge_journal_records。
##   4. 本文件按文件名排在 radio_origami.rpy 之后初始化，双成就追加在 PC-8 之后，成就页扩展为 2×12 = 24 枚。

# —— PC-9 鉴赏室复古水彩 UI 图标命名别名（128x128 RGBA 透明底）——
image ui_icon_clocktower_planetarium = "images/ui/icon_clocktower_planetarium.png"
image ui_icon_star_cipher_chart      = "images/ui/icon_star_cipher_chart.png"
image ui_icon_badge_journal          = "images/ui/icon_badge_journal.png"
image ui_icon_bronze_badge           = "images/ui/icon_bronze_badge.png"

init python:

    # 动态注册 PC-9 双成就，使鉴赏室成就页扩展为 2×12（共 24 枚）严整偶数列对称排布
    if "register_extra_achievement" in globals():
        register_extra_achievement(
            "ach_planetarium",
            "钟楼星象解码人",
            "破解钟楼星象馆的全部三笺星图暗号。",
            False,
        )
        register_extra_achievement(
            "ach_badge_journal",
            "铜章手账收藏家",
            "在铜章手账册中拓印集齐九枚铜章。",
            False,
        )

    ############################################################################
    ## 一、旧钟楼星象馆暗号之夜（3 笺老天文社寻星暗号 + 观测要点 + 星图批注）
    ############################################################################

    PLANETARIUM_CIPHERS = [
        {
            "id": "s1",
            "code": "S-01",
            "label": "planetarium_cipher_s1",
            "sky_tag": "深秋 19:10 · 北天拱极区",
            "chart_source": "穹顶手绘北天星图 · 活动星图转盘",
            "title": "斗柄西指的铜钥匙",
            "short_title": "斗柄西指的铜钥匙",
            "bg_key": "oldbuilding",
            "bg_thumb": "images/bg_oldbuilding.png",
            "lighting_note": "钟楼暮色天台 → 穹顶靛蓝夜光（rooftop / oldbuilding）",
            "companions": "艾丽丝 · 墨墨（星图手记） · 王老师",
            "spoiler": False,
            "summary_pub": (
                "旧钟楼顶层的小星象馆下个月就要翻修，王老师替万事屋开出了最后一晚的通行条。"
                "星象仪的控制匣被老天文社锁上，钥匙藏在第一笺寻星暗号里——斗柄、指极星与一颗"
                "「不动之星」，要在手绘的靛蓝穹顶上连成一条线。"
            ),
            "cipher_text": "斗柄西指，天下皆秋。循璇枢之线，行五倍之遥；钥眠于不动之星下。",
            "annotation_pub": (
                "星图批注 · 斗柄与指极星：《鹖冠子》有「斗柄东指，天下皆春；斗柄南指，天下皆夏；"
                "斗柄西指，天下皆秋；斗柄北指，天下皆冬」之说，黄昏看北斗斗柄的指向便可辨四季。"
                "北斗勺口的天璇、天枢二星称为指极星，自天璇向天枢延长约五倍即是北极星勾陈一——"
                "它只有二等星左右的亮度，却整夜几乎不动，离地平线的高度约等于当地纬度。"
            ),
            "mo_note_pub": "墨墨星图手记：「不动的星不一定最亮，可它一直在那里。就像不管我回头多少次，你们都还站在原地。」",
            "alice_note_pub": "艾丽丝观星按语：「本社长宣布：以后谁迷路就抬头找勾陈一！……什么？今晚多云？那就看墨墨的笔记本！」",
            "star_clues": [
                {
                    "id": "s1_c1",
                    "label": "观测要点一 · 穹顶北侧的手绘北斗",
                    "surface": "北侧穹壁画着一只倒扣的勺子，勺口两颗星旁各钉着一枚黄铜钉。",
                    "detail": (
                        "星图手记：天璇与天枢被称为「指极星」。自天璇向天枢方向，把两星间距延长约五倍，"
                        "便抵达北极星勾陈一——整片星空在一夜之间都绕着它缓缓旋转。"
                    ),
                },
                {
                    "id": "s1_c2",
                    "label": "观测要点二 · 讲台上的活动星图",
                    "surface": "把内圈转满一圈，所有星点都在绕圈，唯有中心铆钉处的小星纹丝不动。",
                    "detail": (
                        "星图手记：活动星图的旋转中心是北天极。它在穹顶上的高度约等于本地纬度（三十度上下），"
                        "并不在穹顶正中的天顶——只有站在地球北极点上，两者才会重合。"
                    ),
                },
                {
                    "id": "s1_c3",
                    "label": "观测要点三 · 第一笺寻星暗号",
                    "surface": "「斗柄西指，天下皆秋。循璇枢之线，行五倍之遥；钥眠于不动之星下。」",
                    "detail": (
                        "星图手记：前半句借《鹖冠子》的斗柄四季口诀点明这是写给深秋黄昏的暗号；"
                        "后半句「璇枢」「五倍」「不动之星」才是真正的寻星路线。"
                    ),
                },
            ],
        },
        {
            "id": "s2",
            "code": "S-02",
            "label": "planetarium_cipher_s2",
            "sky_tag": "深秋 20:05 · 三垣二十八宿",
            "chart_source": "《步天歌》抄本 · 樟木四象星图柜",
            "title": "四象星柜与南斗的抽屉",
            "short_title": "四象星柜与南斗抽屉",
            "bg_key": "storeroom",
            "bg_thumb": "images/bg_storeroom.png",
            "lighting_note": "星图室旧纸箱冷影 → 樟木柜红光手电（storeroom）",
            "companions": "艾丽丝 · 墨墨（星图手记）",
            "spoiler": False,
            "summary_pub": (
                "穹顶东侧的星图室里立着一只樟木星图柜，苍龙、白虎、朱雀、玄武四个抽屉被一根铜条串起，"
                "锁在一把刻着东南西北中的四格转盘锁上。第二笺暗号只写了四个星宿的名字——"
                "其中最后一个「斗」字，难倒过历届不少新社员。"
            ),
            "cipher_text": "昴宿先开，心宿次之，井宿第三，斗宿收尾。四门依序，星图自现。",
            "annotation_pub": (
                "星图批注 · 四象与南斗：古人把黄道附近的星空分为二十八宿，按四方归入四象——东方苍龙"
                "（角亢氐房心尾箕）、北方玄武（斗牛女虚危室壁）、西方白虎（奎娄胃昴毕觜参）、南方朱雀"
                "（井鬼柳星张翼轸）。「斗宿」即南斗六星，位于人马座一带，与北天的北斗七星并非一回事；"
                "南宋淳祐年间刻成的苏州石刻天文图，便以三垣二十八宿为骨架，刻有一千四百余颗星。"
            ),
            "mo_note_pub": "墨墨星图手记：「名字很像的星，不一定是同一颗。就像『不说话』和『不想说话』，也从来不是一回事。」",
            "alice_note_pub": "艾丽丝观星按语：「南斗北斗傻傻分不清的人请举手——好吧，本社长刚才举得最高。」",
            "star_clues": [
                {
                    "id": "s2_c1",
                    "label": "观测要点一 · 柜门内的《步天歌》",
                    "surface": "泛黄的毛笔小楷抄本，把满天星官编成了七字一句的歌诀。",
                    "detail": (
                        "星图手记：东方苍龙角亢氐房心尾箕，北方玄武斗牛女虚危室壁，"
                        "西方白虎奎娄胃昴毕觜参，南方朱雀井鬼柳星张翼轸。"
                    ),
                },
                {
                    "id": "s2_c2",
                    "label": "观测要点二 · 五方黄铜转盘锁",
                    "surface": "四格转盘刻着东、南、西、北、中，第四格的「中」字被摸得发亮。",
                    "detail": (
                        "星图手记：「中」字磨损最重，说明历届社员都在第四格犯过同一个错——把斗宿误认成"
                        "北天的北斗。玄武抽屉的铭牌上早就刻着提醒：「斗为南斗，勿认北斗」。"
                    ),
                },
                {
                    "id": "s2_c3",
                    "label": "观测要点三 · 第二笺寻星暗号",
                    "surface": "「昴宿先开，心宿次之，井宿第三，斗宿收尾。四门依序，星图自现。」",
                    "detail": (
                        "星图手记：四个星宿各自来自不同的一象。只要查清它们分属哪一方，"
                        "再按暗号里出现的先后排好，就是四格转盘的正确顺序。"
                    ),
                },
            ],
        },
        {
            "id": "s3",
            "code": "S-03",
            "label": "planetarium_cipher_s3",
            "sky_tag": "深秋 21:00 · 银河与天津九星",
            "chart_source": "针孔旧星图 · 观测台黄铜折射镜",
            "title": "鹤喙双星与天河上的渡口",
            "short_title": "鹤喙双星与天河渡口",
            "bg_key": "rooftop",
            "bg_thumb": "images/bg_rooftop.png",
            "lighting_note": "穹顶靛蓝夜光 → 观测台城市灯火（oldbuilding / rooftop）",
            "companions": "艾丽丝 · 墨墨（星图手记）",
            "spoiler": True,
            "summary_pub": (
                "玄武抽屉最深处压着一张没有画一颗星的旧星图，只有几十个针尖扎出的小孔，"
                "和老天文社的最后一笺暗号。把它举到星象仪的光前，穹顶上会映出一只沿银河展翅的「大鸟」——"
                "而真正的答案，要登上钟楼观测台，用那架黄铜望远镜才能看清。"
            ),
            "cipher_text": "隔河相望者，借天津而渡；鹤喙一星，内藏二人。",
            "annotation_pub": (
                "星图批注 · 天津与辇道增七：天鹅座的鸟身与双翼，大致对应古人横跨银河的「天津」九星；"
                "鸟尾最亮的天津四与织女一、河鼓二（牛郎星）组成夏夜大三角，深秋傍晚仍高悬西天。"
                "鸟喙那颗星被古人归入相邻的「辇道」，名为辇道增七——肉眼看是一颗，小望远镜里"
                "便会分开成一金一蓝两颗子星，是观星者最爱的双星之一。"
            ),
            "annotation_secret": (
                "真约续笔：四年前约好去河堤折纸鹤的小雪与小可，也像这对金蓝双星——隔着四年的天河，"
                "渡口其实一直都在。那一夜，墨墨在钟楼观测台上亲口说出了那句谢谢。"
            ),
            "mo_note_pub": "墨墨星图手记：「隔着一条河的两个人，只要有渡口，就不算分开。今晚的渡口，是这座钟楼，也是你们。」",
            "alice_note_pub": "艾丽丝观星按语：「金色那颗归墨墨，蓝色那颗归陈默——本社长？本社长当然是那架望远镜，负责把你们俩一起照进来！」",
            "mo_note_secret": "墨墨星图手记（真约续笔）：「这一次我没有写在本子上。我看着那对双星，亲口说了：谢谢你们，陪我看星星。」",
            "alice_note_secret": "艾丽丝观星按语（真约续笔）：「墨墨在观测台上开口的那一刻，本社长发誓——那对金蓝双星都眨了一下眼睛！」",
            "masked_spoiler_hint": "【防剧透火漆封存：本笺星图续笔涉终章旧约与 TRUE END 专属尾声，通关 TRUE END 或手动开启剧透后自动显影】",
            "star_clues": [
                {
                    "id": "s3_c1",
                    "label": "观测要点一 · 针孔星图的透光十字",
                    "surface": "举到星象仪光源前，针孔在穹顶映出一只伸长脖子、张开双翼的大鸟。",
                    "detail": (
                        "星图手记：这是天鹅座，鸟身与双翼大致就是古人的「天津」九星。鸟尾最亮的是天津四，"
                        "鸟喙那颗星被古人归入相邻的「辇道」，叫辇道增七。"
                    ),
                },
                {
                    "id": "s3_c2",
                    "label": "观测要点二 · 观测台的黄铜折射镜",
                    "surface": "镜筒上贴着一张褪色标签：「目镜 25mm · 适合分辨双星」。",
                    "detail": (
                        "星图手记：有些星用肉眼看只是一个光点，放进小望远镜才会分成两颗。"
                        "「内藏二人」，指的正是这样一颗双星。"
                    ),
                },
                {
                    "id": "s3_c3",
                    "label": "观测要点三 · 第三笺寻星暗号",
                    "surface": "「隔河相望者，借天津而渡；鹤喙一星，内藏二人。」",
                    "detail": (
                        "星图手记：「隔河相望」是银河两岸的织女与牛郎，「天津」是河上的渡口；"
                        "而「鹤喙一星，内藏二人」点名了最终要对准的那一颗星。"
                    ),
                },
            ],
        },
    ]

    _PLANETARIUM_BY_ID = {c["id"]: c for c in PLANETARIUM_CIPHERS}

    PLANETARIUM_GOLD_BADGE = "北辰首席解码"
    PLANETARIUM_WARM_BADGE = "守夜观星学徒"

    def planetarium_get_def(cipher_id):
        return _PLANETARIUM_BY_ID.get(cipher_id, PLANETARIUM_CIPHERS[0])

    def _ensure_planetarium_store():
        if getattr(persistent, "planetarium_records", None) is None:
            persistent.planetarium_records = {}
        return persistent.planetarium_records

    def planetarium_get_record(cipher_id):
        cdef = planetarium_get_def(cipher_id)
        raw = _ensure_planetarium_store().get(cdef["id"]) or {}
        return {
            "solved": bool(raw.get("solved", False)),
            "first_try": bool(raw.get("first_try", False)),
            "annotation_viewed": bool(raw.get("annotation_viewed", False)),
            "best_badge": raw.get("best_badge", "待观测"),
            "last_badge": raw.get("last_badge", "待观测"),
            "replays": int(raw.get("replays", 0) or 0),
            "best_mistakes": raw.get("best_mistakes", None),
            "observed_clues": list(raw.get("observed_clues") or []),
            "active_clue": raw.get("active_clue") or cdef["star_clues"][0]["id"],
        }

    def planetarium_select_cipher(cipher_id):
        cdef = planetarium_get_def(cipher_id)
        persistent.planetarium_selected_cipher = cdef["id"]
        renpy.save_persistent()

    def planetarium_observe_clue(cipher_id, clue_id):
        cdef = planetarium_get_def(cipher_id)
        valid_ids = [c["id"] for c in cdef["star_clues"]]
        if clue_id not in valid_ids:
            return False
        store_dict = dict(_ensure_planetarium_store())
        prev = planetarium_get_record(cdef["id"])
        seen = list(prev["observed_clues"])
        if clue_id not in seen:
            seen.append(clue_id)
        prev["observed_clues"] = seen
        prev["active_clue"] = clue_id
        store_dict[cdef["id"]] = prev
        persistent.planetarium_records = store_dict
        renpy.sound.play("audio/sfx_clue.ogg")
        renpy.save_persistent()
        return True

    def planetarium_mark_annotation_viewed(cipher_id):
        cdef = planetarium_get_def(cipher_id)
        store_dict = dict(_ensure_planetarium_store())
        prev = planetarium_get_record(cdef["id"])
        prev["annotation_viewed"] = True
        store_dict[cdef["id"]] = prev
        persistent.planetarium_records = store_dict
        renpy.save_persistent()
        return prev

    def planetarium_open_annotation_modal(cipher_id):
        cdef = planetarium_get_def(cipher_id)
        persistent.planetarium_selected_cipher = cdef["id"]
        if planetarium_get_record(cdef["id"])["solved"]:
            planetarium_mark_annotation_viewed(cdef["id"])
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("planetarium_annotation_modal", cipher_id=cdef["id"])

    def planetarium_record_solve(cipher_id, mistakes_count=0):
        """记录一笺星图暗号的破译结果：只写星象馆自己的存档，绝不触碰主线 fail_count / 好感。"""
        cdef = planetarium_get_def(cipher_id)
        cid = cdef["id"]
        m = max(0, int(mistakes_count or 0))
        is_first = (m == 0)
        cur_badge = PLANETARIUM_GOLD_BADGE if is_first else PLANETARIUM_WARM_BADGE

        store_dict = dict(_ensure_planetarium_store())
        prev = planetarium_get_record(cid)
        prev_best_m = prev["best_mistakes"]
        best_m = m if prev_best_m is None else min(int(prev_best_m), m)
        ever_first = bool(prev["first_try"] or is_first)

        updated = {
            "solved": True,
            "first_try": ever_first,
            "annotation_viewed": True,
            "best_badge": PLANETARIUM_GOLD_BADGE if ever_first else cur_badge,
            "last_badge": cur_badge,
            "replays": int(prev["replays"]) + 1,
            "best_mistakes": best_m,
            "observed_clues": [c["id"] for c in cdef["star_clues"]],
            "active_clue": prev["active_clue"],
        }
        store_dict[cid] = updated
        persistent.planetarium_records = store_dict

        if planetarium_solved_count() >= len(PLANETARIUM_CIPHERS):
            ach_grant("ach_planetarium")

        renpy.save_persistent()
        return updated

    def planetarium_solved_count():
        return sum(1 for c in PLANETARIUM_CIPHERS if planetarium_get_record(c["id"])["solved"])

    def planetarium_first_try_count():
        return sum(1 for c in PLANETARIUM_CIPHERS if planetarium_get_record(c["id"])["first_try"])

    def planetarium_render_view(cipher_id):
        """渲染星图暗号卡、星图批注与双人手记，严格联动 truth_spoiler_unlocked() 零侧信道保护 S-03 续笔。"""
        cdef = planetarium_get_def(cipher_id)
        rec = planetarium_get_record(cdef["id"])
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        has_sp = bool(cdef.get("spoiler", False))
        open_secret = has_sp and unlocked

        if rec["solved"]:
            annotation = cdef["annotation_pub"]
            annotation_secret = cdef.get("annotation_secret", "") if open_secret else ""
            mo_note = cdef.get("mo_note_secret", cdef["mo_note_pub"]) if open_secret else cdef["mo_note_pub"]
            alice_note = cdef.get("alice_note_secret", cdef["alice_note_pub"]) if open_secret else cdef["alice_note_pub"]
        else:
            annotation = ""
            annotation_secret = ""
            mo_note = ""
            alice_note = ""

        return {
            "id": cdef["id"],
            "code": cdef["code"],
            "title": cdef["title"],
            "sky_tag": cdef["sky_tag"],
            "chart_source": cdef["chart_source"],
            "cipher_text": cdef["cipher_text"],
            "display_annotation": annotation,
            "display_annotation_secret": annotation_secret,
            "display_mo_note": mo_note,
            "display_alice_note": alice_note,
            "display_masked_prompt": (cdef.get("masked_spoiler_hint", "") if (has_sp and not unlocked) else ""),
            "has_spoiler": has_sp,
            "unlocked": (unlocked if has_sp else True),
            "solved": rec["solved"],
            "first_try": rec["first_try"],
            "best_badge": rec["best_badge"],
        }

    def planetarium_launch_action(cipher_id):
        cdef = planetarium_get_def(cipher_id)
        return [
            Function(stop_all_gramophone_ambience, True),
            SetField(persistent, "extras_tab", "planetarium"),
            SetField(persistent, "planetarium_selected_cipher", cdef["id"]),
            Replay(cdef["label"], scope={"player_name": persistent.last_player_name or "陈默"}, locked=False),
        ]

    ############################################################################
    ## 二、侦探社纪念铜章手账册（9 枚铜章 · 3×3 九宫格 · 拓印入册 · 双人纪念手记）
    ############################################################################

    BADGE_DEFS = [
        {
            "id": "bd01",
            "code": "BD-01",
            "name": "信箱回音铜章",
            "row": "侦探社沙龙",
            "source": "委托信箱",
            "tab": "mailbox",
            "progress_key": "mailbox",
            "fallback_total": 3,
            "condition": "破解委托信箱的全部三桩校园短案卷",
            "spoiler": False,
            "mo_memo": "第一次有人往万事屋的信箱里投委托信时，我在门后数了三遍信封上的邮票。原来被人需要，是这种暖暖的感觉。",
            "alice_memo": "借书卡、群青颜料、钟楼的第七声回响——三桩案子三枚回形针，本社长全都别在账本封面上啦！",
        },
        {
            "id": "bd02",
            "code": "BD-02",
            "name": "红茶方糖铜章",
            "row": "侦探社沙龙",
            "source": "午后茶话会",
            "tab": "teaparty",
            "progress_key": "teaparty",
            "fallback_total": 3,
            "condition": "完成午后茶话会的全部三场羁绊问答",
            "spoiler": False,
            "mo_memo": "茶话会上艾丽丝总说红茶太苦，却每次都把方糖偷偷推到我的杯子旁边。",
            "alice_memo": "伯爵红茶、零花钱密室、速写本暗号——下午三点的万事屋，是全校最好吃的推理现场！",
        },
        {
            "id": "bd03",
            "code": "BD-03",
            "name": "朱批辞典铜章",
            "row": "侦探社沙龙",
            "source": "批注辞典",
            "tab": "lexicon",
            "progress_key": "lexicon",
            "fallback_total": 13,
            "condition": "读完批注辞典中的全部公开词条",
            "spoiler": False,
            "mo_memo": "在辞典页边写批注的时候，我会想象你翻到这一页的表情。写得太认真，铅笔芯断了四次。",
            "alice_memo": "一本推理辞典被你们俩批注得比原文还厚，本社长申请加印一本精装版，摆进社团书架正中央！",
        },
        {
            "id": "bd04",
            "code": "BD-04",
            "name": "藏书票修复铜章",
            "row": "旧书街与四季",
            "source": "古籍修复台",
            "tab": "restoration",
            "progress_key": "restoration",
            "fallback_total": 3,
            "condition": "修复旧书街的全部三卷古典推理残卷",
            "spoiler": False,
            "mo_memo": "修补古籍时要屏住呼吸，镊子尖只能碰到纸纤维的边缘。那一下午，旧书街安静得只剩下我们的心跳。",
            "alice_memo": "三卷残卷三张藏书票！书店老板说以后旧书街的孤本都优先给万事屋留着，这可是贵宾待遇！",
        },
        {
            "id": "bd05",
            "code": "BD-05",
            "name": "四季火漆铜章",
            "row": "旧书街与四季",
            "source": "四季信笺匣",
            "tab": "letterbox",
            "progress_key": "letterbox",
            "fallback_total": 4,
            "condition": "集齐四季信笺匣的全部四枚火漆印",
            "spoiler": False,
            "mo_memo": "春天的樱花、夏天的骤雨、秋天的银杏、冬天的初雪——四封信，我每一封都打了两遍草稿。",
            "alice_memo": "四枚火漆印排成一排，就像万事屋的一整年，都被好好地封存起来了！",
        },
        {
            "id": "bd06",
            "code": "BD-06",
            "name": "十二折谱铜章",
            "row": "旧书街与四季",
            "source": "千纸鹤陈列柜",
            "tab": "origami",
            "progress_key": "origami",
            "fallback_total": 12,
            "condition": "在千纸鹤陈列柜亲手折检全部十二式纸鹤",
            "spoiler": True,
            "mo_memo": "十二只纸鹤排在丝绒展格里，每一只的折痕都记得一个日子。我最喜欢的，还是翅膀歪歪的那一只。",
            "alice_memo": "从歪翼白鹤到镇柜金鹤，本社长全程见证了某位侦探小姐的折纸手艺突飞猛进！",
            "mo_memo_secret": "展柜最中间那三只，装着四年前的冬天、门缝里的粉纸鹤，还有我们一起折的第三只。现在它们终于可以并排站着了。",
            "alice_memo_secret": "旧白鹤、粉樱鹤和第三只千纸鹤并肩摆好的那天，本社长偷偷在展柜玻璃上哈了口气，画了一颗爱心。",
        },
        {
            "id": "bd07",
            "code": "BD-07",
            "name": "暮色电波铜章",
            "row": "电波与星空",
            "source": "旧广播电台",
            "tab": "radio",
            "progress_key": "radio",
            "fallback_total": 3,
            "condition": "解开旧广播电台的全部三封听众来信",
            "spoiler": True,
            "mo_memo": "第一次戴上监听耳机的时候，我听见自己的心跳和电波一起跳。原来声音可以走那么远。",
            "alice_memo": "FM 88.6 万事屋暮色点播台，三期节目零事故收台！本社长的主播生涯完美无瑕！",
            "mo_memo_secret": "收台那天，我第一次对着真空管话筒亲口念出了收台词。手心全是汗，可你们都在导播台对面冲我点头。",
            "alice_memo_secret": "墨墨亲自开麦念收台词的那一轨母带，已经贴上鎏金封条，锁进万事屋最高机密铁盒啦！",
        },
        {
            "id": "bd08",
            "code": "BD-08",
            "name": "星图暗号铜章",
            "row": "电波与星空",
            "source": "钟楼星象馆",
            "tab": "planetarium",
            "progress_key": "planetarium",
            "fallback_total": 3,
            "condition": "破解钟楼星象馆的全部三笺星图暗号",
            "spoiler": True,
            "mo_memo": "钟楼的穹顶上，不动的星、名字相像的星、藏着两个人的星，我们一颗一颗都找到了。",
            "alice_memo": "三笺寻星暗号全数破译！钟楼星象馆正式认证：万事屋是这里的荣誉守夜人！",
            "mo_memo_secret": "在观测台上说出那句谢谢的时候，声音有点抖。可是那对金蓝双星，好像也朝我眨了一下眼睛。",
            "alice_memo_secret": "墨墨在星星底下亲口说话的那一刻，本社长决定把那一页观测日志永久封存，谁都不许借！",
        },
        {
            "id": "bd09",
            "code": "BD-09",
            "name": "侦探社真约铜章",
            "row": "电波与星空",
            "source": "铜章手账册",
            "tab": "badges",
            "progress_key": "journal",
            "fallback_total": 8,
            "condition": "把前八枚纪念铜章全部拓印入册",
            "spoiler": True,
            "mo_memo": "手账翻到最后一页，八枚铜章排得整整齐齐。原来我们一起走过的地方，已经有这么多了。",
            "alice_memo": "九宫格铜章全数拓印完成！万事屋全体成员，起立，向这本手账册敬礼！",
            "mo_memo_secret": "以前我把想说的话都写进本子里。现在这本手账的最后一页，我想留给我们以后亲口说出的每一句「明天见」。",
            "alice_memo_secret": "从沉默侦探到会笑着说「明天见」的墨墨——这本手账就是最好的证据，本社长要把它供在万事屋正中央！",
        },
    ]

    _BADGE_BY_ID = {b["id"]: b for b in BADGE_DEFS}

    # progress_key -> (计数函数名, 总数来源列表名)；运行期按名字取函数，模块加载顺序互不依赖
    _BADGE_PROGRESS_SPECS = {
        "mailbox":     ("mailbox_solved_count",        "MAILBOX_CASE_DEFS"),
        "teaparty":    ("tea_party_cleared_count",     "TEA_PARTY_SESSIONS"),
        "restoration": ("restoration_completed_count", "RESTORATION_TOMES"),
        "letterbox":   ("letterbox_seal_count",        "SEASONAL_LETTERS"),
        "origami":     ("origami_inspected_count",     "ORIGAMI_CRANE_PATTERNS"),
        "radio":       ("radio_solved_count",          "RADIO_BROADCASTS"),
        "planetarium": ("planetarium_solved_count",    "PLANETARIUM_CIPHERS"),
    }

    BADGE_SPOILER_NOTICE = "【防剧透火漆保护：这枚铜章的手记续笔涉终章旧约，通关 TRUE END 或点击右上角「解锁剧透」后自动显影】"

    def badge_get_def(badge_id):
        return _BADGE_BY_ID.get(badge_id, BADGE_DEFS[0])

    def _ensure_badge_store():
        if getattr(persistent, "badge_journal_records", None) is None:
            persistent.badge_journal_records = {}
        return persistent.badge_journal_records

    def badge_get_record(badge_id):
        bdef = badge_get_def(badge_id)
        raw = _ensure_badge_store().get(bdef["id"]) or {}
        return {
            "stamped": bool(raw.get("stamped", False)),
            "stamp_count": int(raw.get("stamp_count", 0) or 0),
            "page_viewed": bool(raw.get("page_viewed", False)),
        }

    def _badge_lexicon_progress():
        entries = globals().get("LEXICON_ENTRIES") or []
        pub_ids = [e["id"] for e in entries if not e.get("spoiler", False)]
        is_read = globals().get("lexicon_is_read")
        if not pub_ids or is_read is None:
            return (0, 13)
        return (sum(1 for eid in pub_ids if is_read(eid)), len(pub_ids))

    def badge_progress(badge_id):
        """返回 (当前进度, 领取所需总数)；只读各玩法自身的公开计数，不读取任何剧透文本。"""
        bdef = badge_get_def(badge_id)
        key = bdef["progress_key"]
        if key == "journal":
            others = [b for b in BADGE_DEFS if b["id"] != bdef["id"]]
            return (sum(1 for b in others if badge_get_record(b["id"])["stamped"]), len(others))
        if key == "lexicon":
            return _badge_lexicon_progress()
        fn_name, list_name = _BADGE_PROGRESS_SPECS[key]
        g = globals()
        try:
            total = len(g[list_name])
            cur = int(g[fn_name]())
        except Exception:
            return (0, int(bdef["fallback_total"]))
        return (max(0, min(cur, total)), total)

    def badge_is_earned(badge_id):
        cur, total = badge_progress(badge_id)
        return total > 0 and cur >= total

    def badge_status(badge_id):
        if badge_get_record(badge_id)["stamped"]:
            return "stamped"
        if badge_is_earned(badge_id):
            return "earned"
        return "locked"

    def badge_stamped_count():
        return sum(1 for b in BADGE_DEFS if badge_get_record(b["id"])["stamped"])

    def badge_earned_count():
        return sum(1 for b in BADGE_DEFS if badge_status(b["id"]) != "locked")

    def badge_select(badge_id):
        bdef = badge_get_def(badge_id)
        persistent.badge_selected_id = bdef["id"]
        renpy.save_persistent()

    def badge_stamp(badge_id, open_modal=True):
        """把已领取的铜章拓印进手账册；九枚全部拓印后解锁 ach_badge_journal。未领取时只给温柔提示。"""
        bdef = badge_get_def(badge_id)
        bid = bdef["id"]
        persistent.badge_selected_id = bid
        if not badge_is_earned(bid) and not badge_get_record(bid)["stamped"]:
            renpy.notify("这枚铜章还没有领取：先去完成「%s」的对应玩法吧" % bdef["source"])
            return None
        store_dict = dict(_ensure_badge_store())
        prev = badge_get_record(bid)
        updated = {
            "stamped": True,
            "stamp_count": int(prev["stamp_count"]) + 1,
            "page_viewed": True,
        }
        store_dict[bid] = updated
        persistent.badge_journal_records = store_dict
        renpy.sound.play("audio/sfx_bell.ogg")

        if badge_stamped_count() >= len(BADGE_DEFS):
            ach_grant("ach_badge_journal")

        renpy.save_persistent()
        if open_modal:
            renpy.show_screen("badge_journal_page_modal", badge_id=bid)
        return updated

    def badge_open_page(badge_id):
        bdef = badge_get_def(badge_id)
        persistent.badge_selected_id = bdef["id"]
        renpy.sound.play("audio/sfx_page.ogg")
        renpy.show_screen("badge_journal_page_modal", badge_id=bdef["id"])

    def badge_render_view(badge_id):
        """渲染铜章与纪念手记：未拓印不显示手记；涉终章续笔只在 truth_spoiler_unlocked() 为真时出现。"""
        bdef = badge_get_def(badge_id)
        rec = badge_get_record(bdef["id"])
        cur, total = badge_progress(bdef["id"])
        status = badge_status(bdef["id"])
        unlocked = bool(truth_spoiler_unlocked()) if "truth_spoiler_unlocked" in globals() else False
        has_sp = bool(bdef.get("spoiler", False))
        stamped = rec["stamped"]

        mo = bdef["mo_memo"] if stamped else ""
        alice = bdef["alice_memo"] if stamped else ""
        mo_secret = bdef.get("mo_memo_secret", "") if (stamped and has_sp and unlocked) else ""
        alice_secret = bdef.get("alice_memo_secret", "") if (stamped and has_sp and unlocked) else ""

        return {
            "id": bdef["id"],
            "code": bdef["code"],
            "name": bdef["name"],
            "row": bdef["row"],
            "source": bdef["source"],
            "tab": bdef["tab"],
            "condition": bdef["condition"],
            "progress_cur": cur,
            "progress_total": total,
            "status": status,
            "stamped": stamped,
            "stamp_count": rec["stamp_count"],
            "spoiler": has_sp,
            "unlocked": (unlocked if has_sp else True),
            "display_mo_memo": mo,
            "display_alice_memo": alice,
            "display_mo_secret": mo_secret,
            "display_alice_secret": alice_secret,
            "display_masked_notice": (BADGE_SPOILER_NOTICE if (has_sp and not unlocked) else ""),
        }


################################################################################
## 三、鉴赏分页界面 A：旧钟楼星象馆暗号之夜（screen extras_planetarium）
################################################################################

transform planetarium_star_twinkle:
    subpixel True
    block:
        ease 1.8 alpha 0.72 zoom 0.97
        ease 1.8 alpha 1.0 zoom 1.0
        repeat

transform bronze_badge_shine:
    subpixel True
    block:
        ease 2.4 zoom 1.04 yoffset -2
        ease 2.4 zoom 1.0 yoffset 0
        repeat

screen extras_planetarium():
    $ _cid = persistent.planetarium_selected_cipher or "s1"
    $ _cdef = planetarium_get_def(_cid)
    $ _crec = planetarium_get_record(_cdef["id"])
    $ _pv = planetarium_render_view(_cdef["id"])
    $ _solved_n = planetarium_solved_count()
    $ _first_n = planetarium_first_try_count()
    $ _cur_clue_id = _crec["active_clue"] or _cdef["star_clues"][0]["id"]
    $ _cur_clue = dict((c["id"], c) for c in _cdef["star_clues"]).get(_cur_clue_id, _cdef["star_clues"][0])

    vbox:
        spacing 9

        ## 1. 钟楼星象馆顶部总览横幅
        frame:
            style "planetarium_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_clocktower_planetarium.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("旧钟楼星象馆暗号之夜") font gui.name_text_font size 19 color "#f6e7c0"
                        if persistent.te_cleared:
                            text _("TRUE END 已通关 · 三笺星图暗号与观测台的真约续笔已完整开放。") size 12 color "#d8c8ee"
                        elif persistent.truth_spoiler_confirmed:
                            text _("已手动开启剧透许可 · 当前可展阅 S-03 星图批注的真约续笔。") size 12 color "#f0a4b8"
                        else:
                            text _("墨墨与艾丽丝夜访钟楼穹顶 · 涉终章旧约的续笔已由防剧透火漆保护。") size 12 color "#b9a6d4"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_star_cipher_chart.png" xysize (14, 14) yalign 0.5
                            text ("已解星图 %d/3" % _solved_n) size 12 color "#f4d98a" yalign 0.5
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
                                            message=_("尚未通关 TRUE END，确定提前揭晓「钟楼星象馆」S-03 星图批注中的结局真约续笔吗？"),
                                            yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                            no_action=Hide("confirm"))

        ## 2. 三笺寻星暗号切换卡（3 × 234 + 2 × 10 = 722px 严丝合缝）
        hbox:
            spacing 10
            for citem in PLANETARIUM_CIPHERS:
                $ _ir = planetarium_get_record(citem["id"])
                $ _isel = (citem["id"] == _cdef["id"])
                button:
                    style "planetarium_cipher_card"
                    selected _isel
                    action Function(planetarium_select_cipher, citem["id"])
                    vbox:
                        spacing 3
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            text citem["code"] size 12 color ("#f4d98a" if _isel else "#cbb0e6") bold True yalign 0.5
                            if _ir["solved"]:
                                hbox:
                                    xalign 1.0
                                    yalign 0.5
                                    spacing 4
                                    add "images/ui/icon_star_cipher_chart.png" xysize (14, 14) yalign 0.5
                                    text (_("一次破译") if _ir["first_try"] else _("已破译")) size 11 color ("#f4d98a" if _ir["first_try"] else "#86efac") bold True yalign 0.5
                            else:
                                text _("待观测") size 11 color "#8a7aa0" xalign 1.0 yalign 0.5
                        text citem["short_title"] font gui.name_text_font size 14 color "#f2e6ff"
                        text citem["sky_tag"] size 11 color "#9a86b8"

        ## 3. 穹顶观测台详情：星图卡、三项观测要点与星图批注
        frame:
            style "planetarium_console_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    spacing 14
                    xfill True
                    yalign 0.5
                    frame:
                        style "mailbox_thumb_frame"
                        add _cdef["bg_thumb"]:
                            crop_relative True
                            crop (0.0, 0.04, 1.0, 0.92)
                            xysize (180, 96)
                            fit "contain"
                            align (0.5, 0.5)
                        add "images/ui/icon_clocktower_planetarium.png" xysize (24, 24) xalign 0.05 yalign 0.08
                        if _crec["solved"]:
                            add "images/ui/icon_star_cipher_chart.png" xysize (26, 26) xalign 0.96 yalign 0.08 at planetarium_star_twinkle
                    vbox:
                        spacing 4
                        yalign 0.5
                        xsize 492
                        hbox:
                            spacing 8
                            yalign 0.5
                            frame:
                                style "mailbox_code_badge"
                                text _cdef["code"] size 12 color "#ffffff" bold True align (0.5, 0.5)
                            text ("《%s》" % _cdef["title"]) font gui.name_text_font size 17 color "#f6e7c0" yalign 0.5
                        text ("%s  ·  %s" % (_cdef["sky_tag"], _cdef["chart_source"])) size 12 color "#cbb0e6" substitute False
                        hbox:
                            spacing 6
                            yalign 0.5
                            add "images/ui/icon_lighting_lamp.png" xysize (15, 15) yalign 0.5
                            text ("观星光影：%s" % _cdef["lighting_note"]) size 12 color "#a892c2" yalign 0.5 substitute False
                        if _crec["solved"]:
                            text ("观测归档：%s（已重访 %d 次 · 观测要点全核对）" % (_crec["best_badge"], _crec["replays"])) size 12 color "#f4d98a"
                        else:
                            text _("观测归档：尚未破译（可先核对下方观测要点，再推开星象馆的铜门）") size 12 color "#8a7aa0"

                text _cdef["summary_pub"] size 13 color "#ebe2f8" line_spacing 3 substitute False

                ## 3A. 三项观测要点核对栏（3 × 226 + 2 × 8 = 694px 精确贴合内宽）
                text _("穹顶预检 · 点击核对老天文社留在星象馆里的三处观测要点：") size 12 color "#f4d98a" bold True
                hbox:
                    spacing 8
                    for c_obj in _cdef["star_clues"]:
                        $ _c_seen = (c_obj["id"] in _crec["observed_clues"])
                        $ _c_active = (c_obj["id"] == _cur_clue["id"])
                        button:
                            style "restoration_clue_card"
                            selected _c_active
                            action Function(do_quietly, planetarium_observe_clue, _cdef["id"], c_obj["id"])
                            vbox:
                                spacing 2
                                xfill True
                                hbox:
                                    xfill True
                                    yalign 0.5
                                    text c_obj["label"] size 11 color ("#f4d98a" if _c_active else "#e2d4f4") bold True yalign 0.5 substitute False
                                    text (_("已核对") if _c_seen else _("待核对")) size 10 color ("#86efac" if _c_seen else "#8a7aa0") xalign 1.0 yalign 0.5
                                text c_obj["surface"] size 11 color "#b9a6d4" line_spacing 2 substitute False

                frame:
                    xfill True
                    padding (10, 7)
                    background Frame("gui/hud_chip.png", 12, 12)
                    hbox:
                        spacing 8
                        yalign 0.5
                        add "images/ui/icon_star_cipher_chart.png" xysize (20, 20) yalign 0.5
                        text _cur_clue["detail"] size 12 color "#fff1d0" line_spacing 2 substitute False

                ## 3B. 寻星暗号笺与星图批注预览匣
                frame:
                    style "planetarium_scroll_card"
                    vbox:
                        spacing 4
                        xfill True
                        hbox:
                            xfill True
                            yalign 0.5
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_star_cipher_chart.png" xysize (16, 16) yalign 0.5
                                text ("寻星暗号 · 第%s笺" % ("一", "二", "三")[PLANETARIUM_CIPHERS.index(_cdef)]) font gui.name_text_font size 13 color "#fff1d0" yalign 0.5
                            text ("一次破译 %d/3" % _first_n) size 11 color "#f4d98a" xalign 1.0 yalign 0.5
                        text ("「%s」" % _pv["cipher_text"]) font gui.name_text_font size 14 color "#ebe2f8" line_spacing 3 substitute False
                        if _pv["solved"]:
                            add Solid("#f4d98a33") ysize 1
                            text _pv["display_annotation"] size 12 color "#86efac" line_spacing 2 substitute False
                            text _pv["display_mo_note"] size 12 color "#cfa6f0" substitute False
                            text _pv["display_alice_note"] size 12 color "#f0c060" substitute False
                            if _pv["display_annotation_secret"]:
                                add Solid("#f4d98a44") ysize 1
                                text _pv["display_annotation_secret"] size 12 color "#fff1d0" line_spacing 3 substitute False
                        else:
                            text _("星图批注：破译本笺暗号后，墨墨会把考据批注写在星图边上。") size 12 color "#8a7aa0"
                        if _pv["display_masked_prompt"]:
                            add Solid("#6a5c8044") ysize 1
                            text _pv["display_masked_prompt"] size 11 color "#f0a4b8" substitute False

                ## 3C. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text ("三笺暗号全部破译解锁成就「钟楼星象解码人」 · 一次破译 %d/3" % _first_n) size 12 color "#9a86b8" yalign 0.5
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        textbutton _("展阅星图批注"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Function(planetarium_open_annotation_modal, _cdef["id"])
                        textbutton (_("重访星象之夜") if _crec["solved"] else _("推开星象馆铜门")):
                            style "pill_button"
                            yalign 0.5
                            xminimum 146
                            ysize 36
                            text_size 15
                            action planetarium_launch_action(_cdef["id"])

        ## 4. 三笺暗号速览直达条
        for citem in PLANETARIUM_CIPHERS:
            $ _qr = planetarium_get_record(citem["id"])
            frame:
                style "mailbox_quick_row"
                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 10
                        yalign 0.5
                        add ("images/ui/icon_star_cipher_chart.png" if _qr["solved"] else "images/ui/icon_clocktower_planetarium.png") xysize (20, 20) yalign 0.5
                        text ("%s · %s" % (citem["code"], citem["title"])) font gui.name_text_font size 14 color "#f2e6ff" yalign 0.5
                        text ("（%s）" % (_qr["best_badge"] if _qr["solved"] else "待观测")) size 12 color ("#f4d98a" if _qr["first_try"] else ("#86efac" if _qr["solved"] else "#7e6d99")) yalign 0.5
                    textbutton (_("再访穹顶") if _qr["solved"] else _("登楼解码")):
                        style "gramophone_mini_pill"
                        xalign 1.0
                        yalign 0.5
                        action planetarium_launch_action(citem["id"])


## 寻星暗号笺与星图批注独立展阅弹窗
screen planetarium_annotation_modal(cipher_id="s1"):
    modal True
    zorder 215
    $ _mv = planetarium_render_view(cipher_id)

    add "#080510dc"
    key "K_ESCAPE" action Hide("planetarium_annotation_modal")
    key "K_RETURN" action Hide("planetarium_annotation_modal")
    key "K_SPACE" action Hide("planetarium_annotation_modal")

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
                    add "images/ui/icon_star_cipher_chart.png" xysize (40, 40) yalign 0.5 at planetarium_star_twinkle
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_mv["code"], _mv["title"])) font gui.name_text_font size 20 color "#f6e7c0"
                        text ("%s  |  %s" % (_mv["sky_tag"], _mv["chart_source"])) size 12 color "#cbb0e6" substitute False
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_clocktower_planetarium.png" xysize (32, 32) yalign 0.5
                    text (_mv["best_badge"] if _mv["solved"] else _("待观测")) size 13 color "#f4d98a" bold True yalign 0.5

            add Solid("#f4d98a44") ysize 1

            viewport:
                xfill True
                ysize 336
                scrollbars "vertical"
                mousewheel True
                draggable True
                vbox:
                    spacing 8
                    xsize 672
                    text _("老天文社 · 寻星暗号原笺：") size 12 color "#f4d98a" bold True
                    text ("「%s」" % _mv["cipher_text"]) font gui.name_text_font size 18 color "#fff1d0" line_spacing 5 substitute False
                    add Solid("#cbb0e633") ysize 1
                    if _mv["solved"]:
                        text _mv["display_annotation"] size 13 color "#86efac" line_spacing 4 substitute False
                        text _mv["display_mo_note"] size 13 color "#cfa6f0" line_spacing 4 substitute False
                        text _mv["display_alice_note"] size 13 color "#f0c060" line_spacing 4 substitute False
                        if _mv["display_annotation_secret"]:
                            add Solid("#f4d98a44") ysize 1
                            text _mv["display_annotation_secret"] size 13 color "#fff1d0" line_spacing 4 substitute False
                    else:
                        text _("这一笺还没有破译。推开星象馆的铜门、在穹顶下找出答案后，墨墨的星图批注会在这里显影。") size 13 color "#9a86b8" line_spacing 4
                    if _mv["display_masked_prompt"]:
                        add Solid("#6a5c8055") ysize 1
                        text _mv["display_masked_prompt"] size 12 color "#f0a4b8" substitute False

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上星图笺") size 12 color "#9a86b8" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 10
                    textbutton _("登上钟楼观测"):
                        style "gramophone_mini_pill"
                        yalign 0.5
                        action [Hide("planetarium_annotation_modal")] + planetarium_launch_action(_mv["id"])
                    textbutton _("合上星图笺"):
                        style "pill_button"
                        xminimum 116
                        ysize 34
                        text_size 14
                        action Hide("planetarium_annotation_modal")


## 星象馆剧场内顶部寻星推演横幅
screen planetarium_prompt_banner(sky_badge, prompt_line):
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
            add "images/ui/icon_star_cipher_chart.png" xysize (24, 24) yalign 0.5
            vbox:
                spacing 1
                text sky_badge size 12 color "#f4d98a" bold True substitute False
                text prompt_line size 14 color "#f6eeff" substitute False


## 星象馆剧场收尾结算卡
screen planetarium_result_card(cipher_id, cur_badge, best_badge, mistakes, replays):
    modal True
    zorder 220
    $ _cdef = planetarium_get_def(cipher_id)
    $ _pv = planetarium_render_view(cipher_id)
    $ _is_gold = (cur_badge == PLANETARIUM_GOLD_BADGE)

    add "#080510dc"
    key "K_RETURN" action Return("back_to_planetarium")
    key "K_SPACE" action Return("back_to_planetarium")
    key "K_ESCAPE" action Return("back_to_planetarium")

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
                add "images/ui/icon_star_cipher_chart.png" xysize (54, 54) yalign 0.5 at planetarium_star_twinkle
                vbox:
                    spacing 3
                    yalign 0.5
                    text ("寻星暗号已破译 · %s" % _cdef["code"]) size 13 color "#f4d98a" bold True
                    text ("《%s》" % _cdef["title"]) font gui.name_text_font size 21 color "#f6e7c0"
                    text ("本笺观测评级：【%s】" % cur_badge) size 14 color ("#f4d98a" if _is_gold else "#86efac")

            add Solid("#f4d98a33") ysize 1

            frame:
                xfill True
                padding (14, 10)
                background Frame("gui/hud_chip.png", 12, 12)
                vbox:
                    spacing 4
                    text _pv["display_mo_note"] size 13 color "#cfa6f0" substitute False
                    text _pv["display_alice_note"] size 13 color "#f0c060" substitute False
                    text ("本笺试错 %d 次（只计入星象馆，不影响主线）  |  历史最佳：%s  |  星象馆进度：%d/3" % (mistakes, best_badge, planetarium_solved_count())) size 12 color "#b9a6d4"
                    text ("累计重访穹顶：%d 次  ·  星图批注已写入鉴赏室「钟楼星象馆」分页" % replays) size 12 color "#b9a6d4"

            textbutton _("收好星图笺并返回钟楼星象馆"):
                style "pill_button"
                xalign 0.5
                xminimum 248
                ysize 38
                text_size 15
                action Return("back_to_planetarium")


################################################################################
## 四、鉴赏分页界面 B：侦探社纪念铜章手账册（screen extras_badge_journal）
################################################################################

screen extras_badge_journal():
    $ _sel = persistent.badge_selected_id or "bd01"
    $ _bv = badge_render_view(_sel)
    $ _stamped_n = badge_stamped_count()
    $ _earned_n = badge_earned_count()

    vbox:
        spacing 9

        ## 1. 牛皮纸手账册总览横幅
        frame:
            style "badge_header_card"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 10
                    yalign 0.5
                    add "images/ui/icon_badge_journal.png" xysize (36, 36) yalign 0.5
                    vbox:
                        spacing 2
                        xsize 398
                        text _("侦探社纪念铜章手账册") font gui.name_text_font size 19 color "#f6e7c0"
                        if persistent.te_cleared:
                            text _("TRUE END 已通关 · 九枚纪念铜章的手记续笔已全部显影。") size 12 color "#d8c8ee"
                        elif persistent.truth_spoiler_confirmed:
                            text _("已手动开启剧透许可 · 铜章手记中的真约续笔当前可见。") size 12 color "#f0a4b8"
                        else:
                            text _("收录鉴赏室九项玩法的纪念铜章 · 涉终章的手记续笔已由防剧透火漆保护。") size 12 color "#b9a6d4"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    frame:
                        style "mailbox_stat_chip"
                        hbox:
                            spacing 4
                            align (0.5, 0.5)
                            add "images/ui/icon_bronze_badge.png" xysize (14, 14) yalign 0.5
                            text ("已拓印 %d/9" % _stamped_n) size 12 color "#f4d98a" yalign 0.5
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
                                            message=_("尚未通关 TRUE END，确定提前揭晓「铜章手账册」中涉终章旧约的手记续笔吗？"),
                                            yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                            no_action=Hide("confirm"))

        ## 2. 拓印规则说明条（xsize 722 -> 内宽 702px 零溢出）
        frame:
            style "badge_rule_bar"
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 6
                    yalign 0.5
                    add "images/ui/icon_bronze_badge.png" xysize (16, 16) yalign 0.5
                    text ("可拓印 %d · 已拓印 %d · 完成对应玩法即可领取铜章" % (_earned_n - _stamped_n, _stamped_n)) size 11 color "#e2d4f4" yalign 0.5
                text _("集齐九枚解锁成就「铜章手账收藏家」") size 11 color "#cbb0e6" xalign 1.0 yalign 0.5

        ## 3. 九宫格铜章展页（3 × 234 + 2 × 10 = 722px 严丝合缝）
        $ _badge_rows = (len(BADGE_DEFS) + 2) // 3
        grid 3 _badge_rows:
            spacing 10
            for bitem in BADGE_DEFS:
                $ _bst = badge_status(bitem["id"])
                $ _bsel = (bitem["id"] == _bv["id"])
                $ _bcur, _btot = badge_progress(bitem["id"])
                button:
                    style "badge_medal_card"
                    selected _bsel
                    action Function(badge_select, bitem["id"])
                    hbox:
                        spacing 8
                        yalign 0.5
                        add "images/ui/icon_bronze_badge.png" xysize (40, 40) yalign 0.5 alpha (1.0 if _bst == "stamped" else (0.78 if _bst == "earned" else 0.32))
                        vbox:
                            spacing 2
                            xsize 166
                            yalign 0.5
                            hbox:
                                xfill True
                                yalign 0.5
                                text bitem["code"] size 11 color ("#f4d98a" if _bsel else "#d9c39e") bold True yalign 0.5
                                if _bst == "stamped":
                                    text _("已拓印") size 10 color "#f4d98a" bold True xalign 1.0 yalign 0.5
                                elif _bst == "earned":
                                    text _("可拓印") size 10 color "#86efac" bold True xalign 1.0 yalign 0.5
                                else:
                                    text _("未领取") size 10 color "#8a7aa0" xalign 1.0 yalign 0.5
                            text bitem["name"] font gui.name_text_font size 14 color ("#fff1d0" if _bst != "locked" else "#a892c2")
                            text ("%s · %d/%d" % (bitem["source"], _bcur, _btot)) size 11 color "#a8c6b0"
            for _pad_i in range((3 - len(BADGE_DEFS) % 3) % 3):
                null width 234 height 72

        ## 4. 选中铜章的手账页：领取条件、拓印状态与双人纪念手记
        frame:
            style "badge_detail_card"
            vbox:
                spacing 8
                xfill True

                hbox:
                    xfill True
                    yalign 0.5
                    hbox:
                        spacing 12
                        yalign 0.5
                        frame:
                            style "badge_emblem_frame"
                            if _bv["stamped"]:
                                add "images/ui/icon_bronze_badge.png" xysize (52, 52) align (0.5, 0.5) at bronze_badge_shine
                            else:
                                add "images/ui/icon_bronze_badge.png" xysize (52, 52) align (0.5, 0.5) alpha (0.78 if _bv["status"] == "earned" else 0.32)
                        vbox:
                            spacing 2
                            xsize 440
                            hbox:
                                spacing 6
                                yalign 0.5
                                frame:
                                    style "mailbox_code_badge"
                                    text _bv["code"] size 11 color "#ffffff" bold True align (0.5, 0.5)
                                text ("《%s》" % _bv["name"]) font gui.name_text_font size 18 color "#fff1d0" yalign 0.5
                            text ("来源：%s · %s" % (_bv["row"], _bv["source"])) size 12 color "#d9c39e"
                            text ("领取条件：%s（当前 %d/%d）" % (_bv["condition"], _bv["progress_cur"], _bv["progress_total"])) size 12 color "#a8c6b0"
                    vbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 4
                        frame:
                            style "mailbox_stat_chip"
                            if _bv["stamped"]:
                                text ("已拓印 %d 次" % _bv["stamp_count"]) size 11 color "#f4d98a" align (0.5, 0.5)
                            elif _bv["status"] == "earned":
                                text _("可以拓印入册") size 11 color "#86efac" align (0.5, 0.5)
                            else:
                                text _("尚未领取") size 11 color "#9a86b8" align (0.5, 0.5)

                ## 4A. 墨墨铅笔手记 & 艾丽丝贴纸批注（拓印后显影）
                if _bv["stamped"]:
                    frame:
                        style "lexicon_mo_note_box"
                        vbox:
                            spacing 3
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_crane_bookmark.png" xysize (14, 14) yalign 0.5
                                text _("墨墨 · 手账铅笔手记") size 12 color "#cfa6f0" bold True yalign 0.5
                            text ("「%s」" % _bv["display_mo_memo"]) size 12 color "#ebe2f8" line_spacing 3 substitute False
                            if _bv["display_mo_secret"]:
                                text ("续笔：「%s」" % _bv["display_mo_secret"]) size 12 color "#fff1d0" line_spacing 3 substitute False
                    frame:
                        style "lexicon_alice_note_box"
                        vbox:
                            spacing 3
                            hbox:
                                spacing 6
                                yalign 0.5
                                add "images/ui/icon_bronze_badge.png" xysize (14, 14) yalign 0.5
                                text _("艾丽丝 · 铜章旁的贴纸批注") size 12 color "#f0c060" bold True yalign 0.5
                            text _bv["display_alice_memo"] size 12 color "#fff1d0" line_spacing 3 substitute False
                            if _bv["display_alice_secret"]:
                                text ("续笔：%s" % _bv["display_alice_secret"]) size 12 color "#f4d98a" line_spacing 3 substitute False
                else:
                    frame:
                        xfill True
                        padding (11, 8)
                        background Frame("gui/hud_chip.png", 12, 12)
                        text _("拓印入册后，这一页会显影墨墨的铅笔手记与艾丽丝贴在铜章旁边的小批注。") size 12 color "#b9a6d4" line_spacing 3
                if _bv["display_masked_notice"]:
                    text _bv["display_masked_notice"] size 11 color "#f0a4b8" substitute False

                ## 4B. 底部操作栏
                hbox:
                    xfill True
                    yalign 0.5
                    text _("每一枚铜章都对应鉴赏室里的一项玩法") size 12 color "#9a86b8" yalign 0.5
                    hbox:
                        xalign 1.0
                        yalign 0.5
                        spacing 8
                        if _bv["tab"] != "badges":
                            textbutton ("前往%s" % _bv["source"]):
                                style "gramophone_mini_pill"
                                yalign 0.5
                                action SetField(persistent, "extras_tab", _bv["tab"])
                        if _bv["stamped"]:
                            textbutton _("展阅手账页"):
                                style "pill_button"
                                yalign 0.5
                                xminimum 146
                                ysize 36
                                text_size 15
                                action Function(badge_open_page, _bv["id"])
                        else:
                            textbutton _("拓印入册"):
                                style "pill_button"
                                yalign 0.5
                                xminimum 146
                                ysize 36
                                text_size 15
                                action (Function(do_quietly, badge_stamp, _bv["id"], True) if _bv["status"] == "earned" else None)


## 铜章手账页特写弹窗（拓印完成 / 重新展阅）
screen badge_journal_page_modal(badge_id="bd01"):
    modal True
    zorder 218
    $ _jv = badge_render_view(badge_id)

    add "#080510e0"
    key "K_ESCAPE" action Hide("badge_journal_page_modal")
    key "K_RETURN" action Hide("badge_journal_page_modal")
    key "K_SPACE" action Hide("badge_journal_page_modal")

    frame:
        xalign 0.5
        yalign 0.5
        xsize 720
        padding (24, 20)
        background Frame("gui/panel_card.png", 16, 16)
        vbox:
            spacing 10
            xfill True
            hbox:
                xfill True
                yalign 0.5
                hbox:
                    spacing 14
                    yalign 0.5
                    add "images/ui/icon_bronze_badge.png" xysize (52, 52) yalign 0.5 at bronze_badge_shine
                    vbox:
                        spacing 2
                        text ("%s · 《%s》" % (_jv["code"], _jv["name"])) font gui.name_text_font size 21 color "#fff1d0"
                        text ("%s · %s  |  %s" % (_jv["row"], _jv["source"], _jv["condition"])) size 12 color "#d9c39e"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 6
                    add "images/ui/icon_badge_journal.png" xysize (28, 28) yalign 0.5
                    text ("已拓印 %d/9" % badge_stamped_count()) size 13 color "#f4d98a" bold True yalign 0.5

            add Solid("#f4d98a44") ysize 1

            if _jv["stamped"]:
                frame:
                    xfill True
                    padding (16, 12)
                    background Frame("gui/hud_chip.png", 12, 12)
                    vbox:
                        spacing 6
                        text _("墨墨 · 手账铅笔手记：") size 12 color "#cfa6f0" bold True
                        text ("「%s」" % _jv["display_mo_memo"]) font gui.name_text_font size 16 color "#fff6dc" line_spacing 5 substitute False
                        if _jv["display_mo_secret"]:
                            text ("续笔：「%s」" % _jv["display_mo_secret"]) size 14 color "#fff1d0" line_spacing 4 substitute False
                vbox:
                    spacing 6
                    xfill True
                    text ("艾丽丝 · 贴纸批注：%s" % _jv["display_alice_memo"]) size 13 color "#f0c060" line_spacing 3 substitute False
                    if _jv["display_alice_secret"]:
                        text ("续笔：%s" % _jv["display_alice_secret"]) size 13 color "#f4d98a" line_spacing 3 substitute False
            else:
                text _("这一页还是空白的。领取并拓印这枚铜章后，墨墨与艾丽丝的纪念手记会在这里显影。") size 13 color "#9a86b8" line_spacing 4
            if _jv["display_masked_notice"]:
                text _jv["display_masked_notice"] size 12 color "#f0a4b8" substitute False

            hbox:
                xfill True
                yalign 0.5
                text _("按 Esc / 空格 或点击右侧按钮合上手账册") size 12 color "#9a86b8" yalign 0.5
                hbox:
                    xalign 1.0
                    spacing 8
                    if _jv["spoiler"] and not persistent.te_cleared and not persistent.truth_spoiler_confirmed:
                        textbutton _("手动解锁剧透"):
                            style "gramophone_mini_pill"
                            yalign 0.5
                            action Show("confirm",
                                        message=_("尚未通关 TRUE END，确定提前揭晓这枚铜章涉终章旧约的手记续笔吗？"),
                                        yes_action=[Hide("confirm"), SetField(persistent, "truth_spoiler_confirmed", True), Function(renpy.save_persistent)],
                                        no_action=Hide("confirm"))
                    textbutton _("合上手账册"):
                        style "pill_button"
                        xminimum 138
                        ysize 34
                        text_size 14
                        action Hide("badge_journal_page_modal")


################################################################################
## 五、样式定义（PC-9 钟楼星象馆与纪念铜章手账册）
################################################################################

style planetarium_header_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style planetarium_cipher_card is button:
    xsize 234
    ysize 78
    padding (10, 8)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style planetarium_console_card is default:
    xfill True
    padding (14, 11)
    background Frame("gui/panel_card.png", 16, 16)

style planetarium_scroll_card is default:
    xfill True
    padding (12, 9)
    background Frame("gui/hud_chip.png", 12, 12)

style badge_header_card is default:
    xfill True
    padding (14, 10)
    background Frame("gui/panel_card.png", 16, 16)

style badge_rule_bar is default:
    xfill True
    ysize 30
    padding (10, 4)
    background Frame("gui/hud_chip.png", 12, 12)

style badge_medal_card is button:
    xsize 234
    ysize 72
    padding (10, 7)
    background Frame("gui/panel_card.png", 16, 16)
    hover_background Frame("gui/panel_card_hover.png", 16, 16)
    selected_background Frame("gui/panel_card_hover.png", 16, 16)
    hover_sound "audio/sfx_hover.ogg"
    activate_sound "audio/sfx_click.ogg"

style badge_detail_card is default:
    xfill True
    padding (14, 11)
    background Frame("gui/panel_card.png", 16, 16)

style badge_emblem_frame is default:
    xsize 64
    ysize 64
    padding (6, 6)
    background Frame("gui/hud_chip.png", 12, 12)


################################################################################
## 六、钟楼星象馆剧场独立沙盒初始化与收尾出口（零侵入主线好感/失误/存档）
################################################################################

label _planetarium_init_sandbox(session_save_title, init_ambient="night"):
    $ full_run = False
    $ save_name = session_save_title
    $ mo_favor = 88
    $ alice_favor = 64
    $ fail_count = 0
    $ intuition = 3
    $ evidence = []
    $ inspected_evidence = []
    $ expanded_evidence = ""
    $ set_ambient(init_ambient)
    return

label _planetarium_finish_cipher(cipher_id, local_mistakes=0):
    $ _pl_mistakes = max(0, int(local_mistakes or 0))
    $ _pl_rec = planetarium_record_solve(cipher_id, _pl_mistakes)
    hide screen planetarium_prompt_banner
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen planetarium_result_card(cipher_id, _pl_rec["last_badge"], _pl_rec["best_badge"], _pl_mistakes, _pl_rec["replays"])
    $ persistent.extras_tab = "planetarium"
    $ persistent.planetarium_selected_cipher = cipher_id
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 七、寻星暗号 S-01：《斗柄西指的铜钥匙》
################################################################################

label planetarium_cipher_s1:
    call _planetarium_init_sandbox("钟楼星象馆 · S-01 斗柄西指的铜钥匙", "dusk") from _call__planetarium_init_sandbox
    $ _pl_mistakes = 0
    $ _s1_c1 = False
    $ _s1_c2 = False

    scene bg black with fade
    $ play_bgm(bgm_prologue, fadein=1.5)
    centered "{size=+6}旧钟楼星象馆暗号之夜 · STAR CIPHER S-01{/size}\n\n{size=+14}斗柄西指的铜钥匙{/size}\n\n{color=#f4d98a}深秋 19:10 · 北天拱极区 · 指极星与不动之星{/color}"

    scene bg rooftop at bg_kenburns_in
    $ set_ambient("dusk")
    with dissolve

    play sound se_bell
    "深秋傍晚六点半，西侧老钟楼敲完最后一下报时钟，余音顺着旧社团楼天台的铁丝网一圈圈荡开。晚霞褪成淡紫色，钟楼顶上那只蒙着铜绿的半圆穹顶，正一点点沉进夜色里。"
    show wang smile at center
    wang "就是那儿。钟楼最顶上一层，二十多年前天文社自己凑钱改成了小星象馆，后来社团停办，就一直锁着。下个月施工队要进场翻修，我想着，总该让还惦记星星的学生再进去看一眼。"
    wang "这是今晚的通行条，七点到九点半。对了——老天文社有个传统，每一届都会在馆里藏三张『寻星暗号』，留给下一届新社员。星象仪控制匣的钥匙，据说就藏在第一张暗号里。"
    hide wang with dissolve

    show alice happy at left
    show mo smile at right
    alice "钟楼！星象馆！藏了二十多年的寻星暗号！搭档，这简直是为万事屋量身定做的深秋特别企划嘛！"
    mc "你先把手电筒和备用电池揣好再激动……上次在旧楼摸黑查案，是谁踩到拖把尖叫着抓住我袖子的？"
    show alice angry at left
    alice "那、那是战术性撤退！侦探的直觉告诉我，那把拖把有杀气！"
    play sound se_write
    "墨墨把通行条小心地夹进牛皮纸笔记本，又从帆布包里摸出一本边角卷起的口袋星图，翻到北天那一页，朝我们晃了晃。"
    mo_note "我带了活动星图和红光手电。看星星的时候用红光，眼睛才不会被晃花。"

    scene bg oldbuilding
    $ set_ambient("night")
    with dissolve

    play sound se_door
    "钟楼的螺旋木梯一共一百零八级。推开顶层那扇包着铜皮的小门，一股旧木头与机油混在一起的气味扑面而来。"
    "穹顶不大，直径不过七八米，内壁刷成深靛蓝色，用白漆手绘着密密麻麻的星点，几颗亮星的位置还钉着指甲盖大小的黄铜钉。正中央立着一台黑漆星象仪，两头圆球、中间细腰，像一只沉睡的大哑铃。"
    show alice think at left
    show mo think at right
    alice "控制匣在这儿……果然锁着。暗号卡就用图钉别在锁扣旁边，我念啦——"
    play sound se_page
    alice "『斗柄西指，天下皆秋。循璇枢之线，行五倍之遥；钥眠于不动之星下。』……这都什么跟什么嘛，比古文课的默写题还难懂！"
    mc "前半句我好像在哪本书里见过。后半句的『璇枢』……是两颗星的名字？"
    play sound se_write
    mo_note "天璇、天枢，北斗勺口的两颗星。我们先把穹顶上的北斗找出来，再看看讲台上那张转盘星图。"

label planetarium_s1_investigate:
    if _s1_c1 and _s1_c2:
        jump planetarium_s1_back_to_dome
    menu:
        "举起红光手电，在穹顶北侧寻找手绘的北斗七星" if not _s1_c1:
            $ _s1_c1 = True
            play sound se_clue
            "红光扫过北侧穹壁，七颗白漆星点连成一只倒扣的勺子，勺口两颗星旁各钉着一枚铜钉。墨墨踮起脚，用铅笔尾端依次点过去：天枢、天璇、天玑、天权、玉衡、开阳、摇光。"
            show mo smile at right
            play sound se_write
            mo_note "天璇和天枢叫『指极星』。从天璇往天枢的方向，把两颗星的间距延长大约五倍，就能找到北极星。"
            show alice shock at left
            alice "所以『循璇枢之线，行五倍之遥』，是在教我们用北斗找北极星？老天文社的学长学姐也太浪漫了吧！"
            jump planetarium_s1_investigate

        "转动讲台上的活动星图转盘，核对今晚的星空" if not _s1_c2:
            $ _s1_c2 = True
            play sound se_page
            "讲台上压着一张硬纸板活动星图，外圈印着月份和日期，内圈印着时刻。我把『十月下旬』对准『晚上八点』，北斗的斗柄果然斜斜地指向了西边。"
            mc "『斗柄西指，天下皆秋』——对上了。黄昏看北斗，斗柄朝西就是秋天。这一句是在告诉我们，暗号就是写给今晚这样的深秋夜的。"
            show mo think at right
            "墨墨伸出食指按住转盘，把内圈慢慢转了整整一圈。所有星点都绕着圈跑，只有正中那颗被铆钉压着的小星，始终一动不动。"
            play sound se_write
            mo_note "转盘的中心是北天极，不是穹顶最高的那一点。王老师说过，这个穹顶是照本地的纬度斜着画的。"
            jump planetarium_s1_investigate

label planetarium_s1_back_to_dome:
    show alice happy at left
    show mo smile at right
    "我们三个并排站在星象仪旁边，仰头望着那片手绘的星空。钟楼的机芯在脚下咔哒咔哒地走着，像在替我们倒数。"
    alice "好，侦探团集合！北斗找到了，季节也对上了——那把控制匣的钥匙，到底『眠』在哪颗星底下？陈默，你来宣布！"

label planetarium_s1_q_loop:
    show screen planetarium_prompt_banner("S-01 寻星推演 · 指极星五倍延长线与不动之星", "斗柄西指点明深秋夜，天璇向天枢延长约五倍——整片穹顶星空里，哪一颗才是『不动之星』？")
    menu:
        "在穹顶正中的最高点——整片星空都绕着那里旋转，那里一定不动":
            hide screen planetarium_prompt_banner
            $ _pl_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "等等等等，可刚才墨墨转星图的时候，旋转中心明明不在正中央啊？"
            play sound se_write
            mo_note "只有站在地球的北极点上，北极星才会在头顶正中。在我们这里，它离北边地平线大约三十度高。再顺着指极星的延长线找找看。"
            jump planetarium_s1_q_loop

        "在勾陈一（北极星）的铜钉下——从天璇向天枢延长约五倍，正落在北方地平线上方约三十度":
            hide screen planetarium_prompt_banner
            play sound se_correct

        "在全天最亮的天狼星铜钉下——最亮的星最好找，藏钥匙最合适":
            hide screen planetarium_prompt_banner
            $ _pl_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo think at right
            alice "噗——天狼星可是冬天的星！十月晚上八点，它还在地平线底下睡觉呢，穹顶上那颗也被画在了南边的低空。"
            play sound se_write
            mo_note "而且北极星其实不算亮，只有二等星左右。它厉害的地方不是亮，是一整夜都待在原地。"
            jump planetarium_s1_q_loop

    mc "暗号的后半句才是真正的寻星路线。从天璇画一条线穿过天枢，再往前延长五倍，就到了勾陈一——也就是北极星。整片星空都绕着它转，所以它是『不动之星』。"
    mc "它不在穹顶正中，而是在北边地平线上方大约三十度，因为北极星离地平线的高度，差不多就等于我们这里的纬度。"
    play sound se_footstep
    "我架好折叠梯，顺着墨墨用红光手电标出的那条延长线爬上去。勾陈一旁的铜钉一碰就松了，钉帽底下是一个小小的凹槽，里面躺着一把用油布包着的铜钥匙。"
    show alice shock at left
    alice "找到了！还附着一张纸条——『欢迎来到星象馆。第二笺在星图柜里，祝你们今晚晴朗。』"
    play sound se_click
    "控制匣应声打开。我拨下总闸，穹顶的工作灯一盏盏熄灭，星象仪轻轻嗡鸣着转动起来——成百上千颗光点像被谁撒了一把碎银，铺满了整片深蓝的穹顶。"
    show mo happy at right
    play sound se_write
    mo_note "不动的星不一定最亮，可它一直在那里。就像不管我回头多少次，你们都还站在原地。"
    show alice blush at left
    alice "……喂，在这么黑的地方写这种句子，本社长的眼睛会出汗的好不好。"
    play sound se_crane
    "墨墨把那张写着暗号的卡片夹进笔记本，又在页角画了一颗小小的北极星。钟楼的机芯继续咔哒作响，星象仪投下的光，安安静静地落在我们三个人的肩膀上。"

    call _planetarium_finish_cipher("s1", _pl_mistakes) from _call__planetarium_finish_cipher
    return


################################################################################
## 八、寻星暗号 S-02：《四象星柜与南斗的抽屉》
################################################################################

label planetarium_cipher_s2:
    call _planetarium_init_sandbox("钟楼星象馆 · S-02 四象星柜与南斗的抽屉", "night") from _call__planetarium_init_sandbox_1
    $ _pl_mistakes = 0
    $ _s2_c1 = False
    $ _s2_c2 = False

    scene bg black with fade
    $ play_bgm(bgm_suspense, fadein=1.5)
    centered "{size=+6}旧钟楼星象馆暗号之夜 · STAR CIPHER S-02{/size}\n\n{size=+14}四象星柜与南斗的抽屉{/size}\n\n{color=#f4d98a}深秋 20:05 · 三垣二十八宿 · 南斗不是北斗{/color}"

    scene bg storeroom at bg_kenburns_out
    $ set_ambient("night")
    with dissolve

    play sound se_door
    "穹顶东侧有一扇窄窄的木门，门后是老天文社当年的星图室。四面墙堆着蒙尘的纸箱和旧三脚架，正对门口立着一只半人高的樟木星图柜，四个抽屉的铜拉手上，各嵌着一块小小的铜铭牌。"
    show alice think at left
    show mo neutral at right
    alice "苍龙、白虎、朱雀、玄武——四个抽屉对应四象！可它们全被一根铜条串在一起，锁在侧面这把转盘锁上了。"
    mc "四格转盘，每一格都刻着东、南、西、北、中五个字。第二笺暗号就压在柜顶的玻璃板底下。"
    play sound se_page
    alice "『昴宿先开，心宿次之，井宿第三，斗宿收尾。四门依序，星图自现。』……昴、心、井、斗，四个字我都认识，连起来就完全不认识了！"
    show mo think at right
    "墨墨用红光手电照着暗号卡，又抬头看了一眼柜门内侧——那里用毛笔小楷抄着一篇长长的歌诀，纸边已经泛黄卷起。"
    play sound se_write
    mo_note "是《步天歌》。唐代人把满天的星官编成了七字一句的歌诀，方便背诵。答案应该就藏在里面。"
    mc "转盘锁试错太多次会卡住吧？老天文社的学长学姐，看来是想考考我们到底有没有把星星认清楚。"

label planetarium_s2_investigate:
    if _s2_c1 and _s2_c2:
        jump planetarium_s2_back_to_cabinet
    menu:
        "对照柜门内侧的《步天歌》抄本，整理二十八宿的四象分野" if not _s2_c1:
            $ _s2_c1 = True
            play sound se_clue
            "墨墨把笔记本摊在柜顶，一边对照抄本，一边飞快地画出一张四方格表，每一格写下七个字。"
            play sound se_write
            mo_note "东方苍龙：角亢氐房心尾箕。北方玄武：斗牛女虚危室壁。西方白虎：奎娄胃昴毕觜参。南方朱雀：井鬼柳星张翼轸。"
            mc "每一方七个，四七二十八。古人是把天上一圈星空，切成了二十八段来记的吧？"
            show alice shock at left
            alice "原来二十八宿是这么分的！那昴宿在西方白虎，心宿在东方苍龙，井宿在南方朱雀……斗宿嘛，斗宿当然就是北斗七星！"
            show mo smile at right
            "墨墨没有立刻回答，只是用铅笔在『斗』字底下，轻轻画了一道波浪线。"
            jump planetarium_s2_investigate

        "检查转盘锁每一格的磨损痕迹与抽屉上的铜铭牌" if not _s2_c2:
            $ _s2_c2 = True
            play sound se_page
            "我把手电凑近转盘锁。前三格的刻字磨损得差不多，唯独第四格的『中』字被摸得发亮，铜面都凹下去一小块。"
            mc "看来历届新社员都在第四格上转到过『中』。这一格，一定藏着整笺暗号里最容易掉进去的陷阱。"
            show alice think at left
            alice "第四格对应的是『斗宿』……玄武抽屉的铭牌底下还刻着一行小字：『斗为南斗，勿认北斗。』咦？"
            play sound se_write
            show mo think at right
            mo_note "北斗七星在北天的拱极区，古人把它写在紫微垣一带，不在二十八宿里面。斗宿是南斗六星，在人马座那边，是北方玄武的第一宿。"
            jump planetarium_s2_investigate

label planetarium_s2_back_to_cabinet:
    show alice happy at left
    show mo smile at right
    "星图室的旧挂钟走到了八点二十分。窗缝里漏进一线钟楼的夜灯，正好落在那把转盘锁上。"
    alice "好啦，四个星宿的身份都查清楚了，铭牌也提醒过了！陈默，这一回轮到你上手——四格转盘到底要拨成什么？"

label planetarium_s2_q_loop:
    show screen planetarium_prompt_banner("S-02 寻星推演 · 二十八宿四象分野与南斗六星", "昴、心、井、斗四宿依序开门，铭牌提醒『斗为南斗，勿认北斗』——四格转盘该依次拨到哪四个方位？")
    menu:
        "西、东、南、中——斗宿就是北斗七星，北斗居于中宫，所以最后一格拨『中』":
            hide screen planetarium_prompt_banner
            $ _pl_mistakes += 1
            play sound se_wrong
            show alice angry at left
            show mo smile at right
            alice "哎呀，转盘『咔』地一声卡住了！还好只是保险档，轻轻回拨就复位了……原来那个发亮的『中』字，就是这么被摸出来的。"
            play sound se_write
            mo_note "铭牌上写着呢：斗为南斗。北斗不在二十八宿里，斗宿是北方玄武七宿的第一宿。"
            jump planetarium_s2_q_loop

        "东、南、西、北——按苍龙、朱雀、白虎、玄武的传统顺序直接排列":
            hide screen planetarium_prompt_banner
            $ _pl_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo think at right
            alice "这是课本上的标准顺序没错，可暗号说的是『昴宿先开』呀，第一扇门该开的，是昴宿所在的那一方。"
            play sound se_write
            mo_note "顺序要照暗号里星宿出现的先后来排，不是照四象的习惯顺序。一颗一颗查清楚就好。"
            jump planetarium_s2_q_loop

        "西、东、南、北——昴属白虎、心属苍龙、井属朱雀、斗宿（南斗）属玄武":
            hide screen planetarium_prompt_banner
            play sound se_correct

    mc "暗号里的四个星宿，分别来自四象中的一象。昴宿是西方白虎的第四宿，心宿是东方苍龙的第五宿，井宿是南方朱雀的第一宿……"
    mc "最容易出错的是最后一个。斗宿不是北斗七星，而是南斗六星，它是北方玄武七宿的第一宿。所以四格依次是：西、东、南、北。"
    play sound se_click
    "最后一格的『北』字归位的瞬间，铜条『嗒』地一声弹开。四个抽屉依次滑出半寸，樟木的清香混着旧纸的味道，在星图室里轻轻散开。"
    show alice shock at left
    alice "哇……白虎抽屉里是一张好大的拓片！上面密密麻麻全是星点，还刻着一圈一圈的同心圆！"
    play sound se_page
    "那是一幅苏州石刻天文图的拓片复制品。南宋淳祐年间刻成的星图，以三垣二十八宿为骨架，一千四百多颗星被凿成小小的圆点，二十八宿的分界线像车轮的辐条一样，从中心向外铺开。"
    "苍龙抽屉里是天文社历年的观测日志，朱雀抽屉里是一叠手绘的星座卡。玄武抽屉最深处，压着一张折成方块的旧星图，和第三张暗号卡。"
    show alice think at left
    alice "观测日志最后一页还写着一句话：『星星的名字是古人一颗一颗取的，认错一次不要紧，下一次抬头记住就好。』……老天文社的社长，脾气好像比本社长温柔那么一点点。"
    mc "只有一点点吗？"
    show alice angry at left
    alice "陈默同学，你的万事屋代价簿今晚又多了一页！"
    show mo happy at right
    play sound se_write
    mo_note "名字很像的星，不一定是同一颗。就像『不说话』和『不想说话』，也从来不是一回事。"
    show alice smile at left
    alice "南斗北斗傻傻分不清的人请举手——好吧，本社长刚才举得最高。不过墨墨这句我记下了，回去就写进万事屋的社训！"
    play sound se_crane
    "墨墨笑着把拓片卷好，用红绳系上，又在笔记本的四方格表旁画了四只小小的守护神兽。苍龙的尾巴，被她悄悄画成了一只千纸鹤的翅膀。"

    call _planetarium_finish_cipher("s2", _pl_mistakes) from _call__planetarium_finish_cipher_1
    return


################################################################################
## 九、寻星暗号 S-03：《鹤喙双星与天河上的渡口》（联动防剧透真约尾声）
################################################################################

label planetarium_cipher_s3:
    call _planetarium_init_sandbox("钟楼星象馆 · S-03 鹤喙双星与天河上的渡口", "night") from _call__planetarium_init_sandbox_2
    $ _pl_mistakes = 0
    $ _s3_c1 = False
    $ _s3_c2 = False

    scene bg black with fade
    $ play_bgm(bgm_prologue, fadein=1.5)
    centered "{size=+6}旧钟楼星象馆暗号之夜 · STAR CIPHER S-03{/size}\n\n{size=+14}鹤喙双星与天河上的渡口{/size}\n\n{color=#f4d98a}深秋 21:00 · 天津九星与辇道增七 · 隔河相望的约定{/color}"

    scene bg oldbuilding at bg_kenburns_in
    $ set_ambient("night")
    with dissolve

    play sound se_page
    "回到穹顶，我们把玄武抽屉里那张折成方块的旧星图展开。纸已经很薄了，上面没有画一颗星，只有几十个用针尖扎出的小孔。"
    show alice think at left
    show mo think at right
    alice "第三张暗号卡写着：『隔河相望者，借天津而渡；鹤喙一星，内藏二人。——寻星暗号第三笺，终。』天津？天津不是一座城市吗？"
    mc "城市的名字，搞不好还是从星星那里借来的呢。墨墨，你知道？"
    play sound se_write
    mo_note "天津是一组星官的名字，意思是天河上的渡口。我们把这张针孔星图举到星象仪的光前面看看。"
    "我关掉红光手电，把旧星图贴近星象仪的光源。穹顶的一角立刻映出几十个小小的光斑——它们排成一个长长的十字，像一只伸长脖子、张开双翼的大鸟，正沿着淡淡的银河往南飞。"
    show alice shock at left
    alice "是千纸鹤！不对……是天鹅！这只大鸟我在夏天的星座书上见过！"
    show mo smile at right
    "墨墨伸出手，让一枚光斑落在自己的掌心里。她看了很久，像是在辨认一位很久不见的老朋友。"
    mc "老天文社的人，为什么要把最后一笺暗号做成针孔星图呢？直接画出来不是更简单吗？"
    play sound se_write
    mo_note "因为只有关掉所有的灯，针孔里的光才看得见。有些东西，要在最暗的时候才找得到。"

label planetarium_s3_investigate:
    if _s3_c1 and _s3_c2:
        jump planetarium_s3_to_balcony
    menu:
        "比对针孔光斑与穹顶星空，确认这只『大鸟』每一颗星的名字" if not _s3_c1:
            $ _s3_c1 = True
            play sound se_clue
            "光斑和星象仪投出的星点严丝合缝地叠在一起。墨墨用红光笔依次点过鸟尾、双翼和长长的脖子，最后停在鸟喙那颗不太起眼的星上。"
            play sound se_write
            mo_note "西方叫它天鹅座，鸟身和双翼大致就是古人说的『天津』九星，像一座横跨银河的渡桥。鸟尾最亮的是天津四；鸟喙那颗星被古人归进了旁边的『辇道』，叫辇道增七。"
            show alice think at left
            alice "天津四和织女星、牛郎星连起来，就是夏夜大三角吧？深秋傍晚它们还挂在西边天上，我刚才在楼梯窗口还看见了呢。"
            jump planetarium_s3_investigate

        "掀开穹顶北侧天窗下的帆布罩，检查那架黄铜折射望远镜" if not _s3_c2:
            $ _s3_c2 = True
            play sound se_door
            "天窗下的帆布罩一掀开，扬起一小团灰。底下是一架黄铜折射望远镜，镜筒擦得锃亮，上面贴着一张褪色的标签：『目镜 25mm · 适合分辨双星』。"
            show alice happy at left
            mc "双星……就是两颗挨得很近、肉眼看起来像一颗的星？"
            show mo smile at right
            play sound se_write
            mo_note "嗯。有些星用眼睛看只是一个光点，放进望远镜，才会分成两颗。『内藏二人』，说的应该就是这个。"
            jump planetarium_s3_investigate

label planetarium_s3_to_balcony:
    scene bg rooftop
    $ set_ambient("night")
    with dissolve

    show alice smile at left
    show mo smile at right
    "我们合力把望远镜抬到穹顶外侧的观测台。铁栏杆外是整座城市的灯火，头顶却意外地清朗，银河淡得像一层薄纱，那只『大鸟』正斜斜地挂在西边的高空。"
    alice "最后一题啦！『隔河相望者，借天津而渡；鹤喙一星，内藏二人』——陈默，望远镜该对准哪里？"

label planetarium_s3_q_loop:
    show screen planetarium_prompt_banner("S-03 寻星推演 · 天津九星的鸟首与金蓝双星", "隔河相望指银河两岸的织女与牛郎，天津是河上的渡口——『鹤喙一星，内藏二人』，望远镜该对准哪颗星？")
    menu:
        "对准天津四——它是这只『大鸟』身上最亮的星，一定是暗号的终点":
            hide screen planetarium_prompt_banner
            $ _pl_mistakes += 1
            play sound se_wrong
            show alice happy at left
            show mo think at right
            alice "天津四在鸟尾巴上呀！暗号说的是『鹤喙』，脑袋和尾巴之间，可差了一整只鸟呢。"
            play sound se_write
            mo_note "而且天津四放进望远镜里还是一颗星，和『内藏二人』对不上。"
            jump planetarium_s3_q_loop

        "对准辇道增七——『大鸟』鸟喙处的那颗星，在望远镜里会分开成一金一蓝两颗":
            hide screen planetarium_prompt_banner
            play sound se_correct

        "对准织女一和河鼓二的正中间——『隔河相望』说的是牛郎织女，相会处就在两颗星中间":
            hide screen planetarium_prompt_banner
            $ _pl_mistakes += 1
            play sound se_wrong
            show alice think at left
            show mo smile at right
            alice "可那中间是一大片空荡荡的银河，什么星都没有呀……暗号里说的明明是『一星』。"
            play sound se_write
            mo_note "隔河相望的两颗星不用自己飞过去，渡口已经替他们搭好了。顺着天津，往鸟头的方向看看。"
            jump planetarium_s3_q_loop

    mc "『隔河相望者』是银河两岸的织女和牛郎，『借天津而渡』，说的是横跨银河的天津九星。而『鹤喙一星』，就是这只大鸟鸟喙上的辇道增七。"
    mc "它用肉眼看只是一颗星，可放进望远镜，就会分成两颗——这就是『内藏二人』。"
    play sound se_click
    "我把镜筒对准鸟喙，慢慢旋动调焦轮。模糊的光点渐渐收紧，然后——在漆黑的视野正中，安安静静地分开成两颗星：一颗是温暖的琥珀金，一颗是清透的宝石蓝，彼此挨着，像两个并肩看星星的人。"
    show alice shock at left
    alice "哇……真的是两颗！金色和蓝色，好像在互相照亮一样……"
    play sound se_page
    "针孔星图的背面，还有一行几乎褪尽的铅笔字：『给以后来到这里的人——有些星星看起来孤零零的，其实一直有人陪在旁边。』"

    if truth_spoiler_unlocked():
        $ play_bgm(bgm_te, fadein=1.5)
        show mo blush at right
        "我正想像往常一样，替墨墨把笔记本上的话念出来，她却轻轻合上了本子，把手搭在冰凉的黄铜镜筒上。"
        "夜风吹起她的发梢。墨墨望着那对金蓝双星，像那个夕阳下她终于开口的傍晚一样，清晰而温柔地说道："
        mo "……四年前，我和小可也约好了，要去河堤折纸鹤。那时候我以为，那条河再也渡不过去了。"
        mo "可是原来，渡口一直都在。周可在，艾丽丝在，你也在——所以今晚，我想亲口说一次：谢谢你们，陪我看星星。"
        show alice blush at left
        alice "呜……犯规啦！在星星底下说这种话，本社长要把这一页观测日志锁进万事屋最高机密铁盒，一辈子都不借给别人看！"
        show mo happy at right
        mc "那就说好了。明年、后年，每一个晴朗的秋夜，我们都再来这里看一次这对双星。"
    else:
        $ play_bgm(bgm_warm, fadein=1.2)
        show mo happy at right
        "墨墨把眼睛从目镜前移开，在笔记本上写了很久，然后把那一页轻轻举到我和艾丽丝中间。"
        play sound se_write
        mo_note "隔着一条河的两个人，只要有渡口，就不算分开。今晚的渡口，是这座钟楼，也是你们。"
        show alice happy at left
        alice "那本社长宣布：万事屋从今天起，正式成为这座星象馆的荣誉守夜人！翻修完以后，每个晴朗的秋夜都要来点名！"
        mc "嗯。下次来的时候，换我们给下一届留三张寻星暗号吧。"

    play sound se_bell
    "钟楼在脚下敲响了九点的钟声。墨墨从口袋里掏出一张深靛蓝的和纸，用针尖在左翼挑出七个小孔，折成一只能映出星光的纸鹤，轻轻放在望远镜的镜筒上。"

    call _planetarium_finish_cipher("s3", _pl_mistakes) from _call__planetarium_finish_cipher_2
    return
