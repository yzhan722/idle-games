## 《沉默侦探：千纸鹤的约定》—— 校园推理社委托信箱（可重玩短案卷）
## club_mailbox.rpy
##
## 收录三桩可随时从「鉴赏 -> 委托信箱」拆封重玩的轻量校园推理卷宗（零侵入主线数值与存档）：
##   1. label mailbox_case_m1 —— 《图书馆消失的借书卡》（时间戳盲区 · 回墨章与门禁不在场证明矛盾）
##   2. label mailbox_case_m2 —— 《美术室未干的群青颜料》（物理痕迹 · 夕照色温视觉诡计与缓干甘油）
##   3. label mailbox_case_m3 —— 《钟楼午休的第七声回响》（声学延迟 · 380米声速差与广播重影时刻表）

## init 1：同一优先级按文件名排序，本文件排在 definitions.rpy 之前，默认优先级下 register_evidence_detail 还不存在，
## 游戏一启动就是 NameError。
init 1 python:
    # —— M-01《图书馆消失的借书卡》证物翻面细节 ——
    register_evidence_detail(
        "书袋内侧蹭印：盖着昨日11.14紫印油的未干蹭痕",
        "墨墨（牛皮纸批注）",
        "紫色回墨印油渗入衬纸纤维尚不足一小时，说明借书卡是在今天下午被匆忙盖章抽走的；而印面仍停在『11.14』，证明盖章时刻必定早于小林 17:00 整调拨日期章之前。"
    )
    register_evidence_detail(
        "门禁红外流水：16:54入馆记录与登记簿手写17:05相差十一分钟",
        "陈默（现场勘验）",
        "门禁红外计次器与校园铃声服务器秒级同步，17:00 至 17:20 之间根本无人进门；班长在纸质登记簿上写的『17:05 入室』，把真正到场时间往后推迟了整整十一分钟。"
    )
    register_evidence_detail(
        "张子谦证言：五点钟声响起前曾听见柜台回墨章轻响",
        "艾丽丝（社长批注）",
        "张子谦耳机里放的球赛集锦总长正好十二分钟，16:48 进门点开播放，听见盖章『咔哒』声时进度条刚过三分之二——正好锁死在 16:56 左右！"
    )
    register_evidence_detail(
        "班长纸质登记：自称17:05才进馆且未碰过回墨章",
        "墨墨（牛皮纸批注）",
        "如果她真在 17:05 之后才踏进阅览室，那时小林早已把回墨日期章拨到了『11.15』；古籍架旁掉落的三班明黄便签纸，恰好与她活页夹里的纸张一致。"
    )

    # —— M-02《美术室未干的群青颜料》证物翻面细节 ——
    register_evidence_detail(
        "画框擦痕检出甘油缓干剂：群青颜料两小时内仍可转印",
        "墨墨（牛皮纸批注）",
        "美术老师在示范调色盘里调入了水粉缓干甘油媒介剂，即便过了一小时颜料表层依然湿润粘手；所谓『二十分钟必定干透结壳』的辩解根本站不住脚。"
    )
    register_evidence_detail(
        "夕照走廊下的袖口痕迹：织物纤维粘结发硬且无炭粉脱落",
        "艾丽丝（社长批注）",
        "如果是素描用的干木炭粉，指尖一弹就会簌簌掉灰；可 Joker 白袖口那道『暗紫灰』把棉布经纬都粘出硬挺胶感了，分明是湿性水粉颜料！"
    )
    register_evidence_detail(
        "墨墨的色卡比对：橙红夕阳缺乏蓝波段，群青会显色为暗紫灰",
        "墨墨（牛皮纸批注）",
        "群青颜料强烈反射短波蓝光而吸收长波橙红光。西晒外廊被浓烈橙红夕照笼罩，光源几乎不含蓝光，纯正的群青在肉眼看来就会伪装成近乎炭黑的暗紫灰色。"
    )
    register_evidence_detail(
        "Joker辩词：自称五点十分后只去过素描室，袖口是干木炭粉",
        "陈默（现场勘验）",
        "三楼素描室今天下午锁门检修画架，钥匙一直挂在黄老师腰间；Joker 根本进不去素描室，所谓蹭到木炭粉纯属顺着走廊夕阳色差编造的托词。"
    )

    # —— M-03《钟楼午休的第七声回响》证物翻面细节 ——
    register_evidence_detail(
        "钟楼齿轮日志：12:30半点凸轮仅有六齿，天台开阔无反射墙",
        "陈默（现场勘验）",
        "报时铜钟的半点凸轮物理上只有六枚拨齿，转过一周便自动落锁，绝无连敲七下的可能；且旧社团楼天台四周空旷无高墙，不存在一秒以上的自然回声。"
    )
    register_evidence_detail(
        "录音波形解析：第六响后1.15秒混入广播副喇叭延迟音与开水炉铜阀声",
        "墨墨（牛皮纸批注）",
        "波形图上，前六响略带隔窗闷感且间隔精准 2.0 秒；而相隔 1.15 秒出现的『第七响』高频干脆，末尾还叠着一声开水炉铜浮球阀特有的清脆『咔哒』声。"
    )
    register_evidence_detail(
        "礼堂东廊实测：距钟楼380米且紧邻一楼储物柜，头顶广播中继固定延迟2.2秒",
        "艾丽丝（社长批注）",
        "声音穿过 380 米校园空气耗时约 1.12 秒，而东廊茶水间头顶的老式广播中继器慢了约 2.25 秒才切入最后一拍报时——两者相减恰好是 1.13 秒的『第七声重影』！"
    )
    register_evidence_detail(
        "干事的不在场录音：自称12:30身在距钟楼20米的三楼天台",
        "墨墨（牛皮纸批注）",
        "距钟楼仅 20 米的天台没有安装广播副喇叭，更听不见一楼礼堂茶水间的开水炉铜阀响动；这段原本用来证明不在场的录音，反而精准出卖了他当时所站的位置。"
    )

    MB_M1_HINTS = {
        "default": "哼哼，本社长提示你哦：先把「证明借书卡是在五点前被盖章的物证」和「揭穿登记簿入馆时间撒谎的记录」拼在一起，看那十一分钟藏到哪儿去了！",
        "张子谦证言：五点钟声响起前曾听见柜台回墨章轻响": "张子谦听见的盖章声是绝佳的辅助旁证，不过第一步要先把『11.14 紫色印油痕迹』和『红外门禁的 16:54 记录』直接咬合起来哟！",
    }

    MB_M2_HINTS = {
        "default": "擦亮眼睛，我的大搭档！先把「袖口痕迹本身不是干炭粉的物理特征」和「墨墨演示的夕阳色温显色原理」碰撞起来，当场拆穿他的光学障眼法！",
        "画框擦痕检出甘油缓干剂：群青颜料两小时内仍可转印": "甘油缓干剂是留着待会儿堵死他『颜料早就干了』那句退路的杀手锏！眼下第一步先拆穿他袖口那道『暗紫灰』的真实身份吧！",
    }

    MB_M3_HINTS = {
        "default": "抓住声音的尾巴！把「录音波形里捕捉到的广播尾音与开水炉铜阀声」和「礼堂东廊 380 米声速差与 2.2 秒广播中继实测」拼合起来，就能精准定位录音地点啦！",
        "钟楼齿轮日志：12:30半点凸轮仅有六齿，天台开阔无反射墙": "六齿凸轮已经排除了钟楼故障与天台回声，接下来要把『录音波形特征』和『全校唯一吻合该延迟的走廊位置』直接锁定在一起！",
    }


## 委托信箱短案卷结案印章结算卡
screen mailbox_case_result_card(case_id, cur_rating, best_rating, mistakes, replays):
    modal True
    zorder 220
    $ _cdef = mailbox_get_case_def(case_id)
    $ _is_ace = (cur_rating == "一击破局")

    add "#080510d8"
    key "K_RETURN" action Return("back_to_mailbox")
    key "K_SPACE" action Return("back_to_mailbox")
    key "K_ESCAPE" action Return("back_to_mailbox")

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
                    add "images/ui/icon_club_mailbox.png" xysize (30, 30) yalign 0.5
                    vbox:
                        spacing 1
                        text (_cdef["code"] + " · 委托结案归档") size 13 color "#cbb0e6"
                        text ("《%s》" % _cdef["title"]) font gui.name_text_font size 24 color "#f6e7c0"
                hbox:
                    xalign 1.0
                    yalign 0.5
                    spacing 8
                    add "images/ui/icon_dossier_stamp.png" xysize (32, 32) yalign 0.5
                    text cur_rating font gui.name_text_font size 22 color ("#f4d98a" if _is_ace else "#86efac") yalign 0.5

            add Frame("gui/title_band.png", 0, 0) xsize 420 ysize 3

            frame:
                xfill True
                padding (16, 12)
                background Frame("gui/panel_card.png", 16, 16)
                vbox:
                    spacing 6
                    if _is_ace:
                        text _("墨墨在牛皮纸卷宗封面上轻轻画下一只展翅的纸鹤：从双线索拼合到终局矛盾指证一次未错，漂亮的一击破局。") size 15 color "#f2ecf8" line_spacing 3
                    else:
                        text _("艾丽丝潇洒地在《代价簿》副册盖下结案红章：虽然中途绕了一点小弯路，但真相依旧稳稳落进万事屋掌心！") size 15 color "#f2ecf8" line_spacing 3
                    text ("本轮试错：%d 次    ·    历史最佳评级：【%s】    ·    累计结案：%d 次" % (mistakes, best_rating, replays)) size 13 color "#cbb0e6"

            hbox:
                xalign 1.0
                spacing 10
                textbutton _("返回委托信箱"):
                    style "pill_button"
                    xminimum 160
                    ysize 40
                    text_size 17
                    action Return("back_to_mailbox")


label _mailbox_init_sandbox(case_save_title):
    $ full_run = False
    $ save_name = case_save_title
    $ mo_favor = 72
    $ alice_favor = 40
    $ fail_count = 0
    $ intuition = 3
    $ evidence = []
    $ inspected_evidence = []
    $ expanded_evidence = ""
    $ mailbox_combine_mistakes = 0
    $ reset_combine_state()
    return


label _mailbox_finish_case(case_id, local_mistakes=0):
    $ _total_mb_mistakes = int(local_mistakes or 0) + int(mailbox_combine_mistakes or 0)
    $ _mb_rec = mailbox_record_case_clear(case_id, _total_mb_mistakes)
    hide screen evidence_book
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.2)
    call screen mailbox_case_result_card(case_id, _mb_rec["last_rating"], _mb_rec["best_rating"], _total_mb_mistakes, _mb_rec["replays"])
    $ persistent.extras_tab = "mailbox"
    $ renpy.save_persistent()
    if _in_replay:
        $ renpy.end_replay()
    return


################################################################################
## 卷宗 M-01：《图书馆消失的借书卡》（时间戳盲区 · 不在场证明矛盾）
################################################################################

label mailbox_case_m1:
    call _mailbox_init_sandbox("委托信箱 · M-01 图书馆消失的借书卡") from _call__mailbox_init_sandbox
    $ _mb_mistakes = 0

    scene bg black with fade
    $ play_bgm(bgm_daily, fadein=1.5)
    centered "{size=+6}校园推理社委托信箱 · CASE M-01{/size}\n\n{size=+14}图书馆消失的借书卡{/size}\n\n{color=#cbb0e6}周四傍晚 · 一楼古籍阅览室 · 时间戳与门禁之谜{/color}"

    scene bg agency at bg_kenburns_out
    $ set_ambient("warm")
    show screen evidence_book
    with dissolve

    play sound se_bell
    "周四放学后的万事屋里飘着淡淡的红茶热气。门板内侧新挂上的那只胡桃木铜口『委托信箱』刚响过一声清脆的投递音，艾丽丝便迫不及待地拧开小铜锁，拈出一只封着红火漆印的米白信封。"
    show alice happy at left
    show mo neutral at right
    alice "锵锵！委托信箱开张的第一封正式短笺！我看看字迹——横平竖直连标点都像拿尺子量出来的，果然是一楼图书馆的小林委员！"
    play sound se_write
    "墨墨凑近信封边缘看了一眼，低头在牛皮纸笔记本上飞快写下一行字。"
    mo_note "信纸背面沾着一点紫色回墨印泥。她写信的时候很急，应该就在十分钟前。"

    scene bg library
    $ set_ambient("dusk")
    show alice neutral at left
    show lin sad at right
    with dissolve

    "我们赶到一楼古籍阅览室时，夕阳正斜斜掠过C区高大的樟木书架。小林抱着登记夹站在C-4架位前，镜片后的眉头紧紧蹙着。"
    lin "麻烦你们跑一趟……五点半闭馆清点的时候，我发现这册馆藏孤本《云溪县志·钟塔卷》虽然还端端正正立在架上，可插在封底书袋里的那张手写借书卡却不见了。"
    mc "只丢了封底的纸质借书卡，书本身却没丢？"
    lin "嗯。明天上午校史展就要把这批百年借书卡扫描归档了。今天下午 16:40 到 17:30 之间，只有张子谦同学和三班的林思思班长进过这间古籍阅览室。"
    show alice think at left
    alice "既然只有两个人进出过，查一下登记簿上的时间不就能锁定了吗？"
    lin "奇怪的地方就在这里——张子谦同学 16:48 进来一直在靠窗二号桌抄体育社历年比分；而班长在门口登记簿上写的是『17:05 入室，17:20 离室』，说自己全程只在前台交各班阅读回执，根本没往C区走。"

    $ _m1_shelf = False
    $ _m1_gate  = False
    $ _m1_witness = False

label mailbox_m1_investigate_loop:
    if _m1_shelf and _m1_gate and _m1_witness:
        jump mailbox_m1_deduction_stage

    scene bg library
    $ set_ambient("dusk")
    show alice neutral at left
    show mo neutral at right
    with dissolve

    menu:
        "闭馆后的阅览室静得能听见挂钟秒针走动，先从哪一处核实线索？（可随时点击右上角【证据】翻面查看批注）"

        "勘验《云溪县志》封底书袋与柜台回墨日期章" if not _m1_shelf:
            $ _m1_shelf = True
            play sound se_page
            "我戴上图书室备用的白棉手套，轻轻翻开《云溪县志·钟塔卷》的后封衬页。空荡荡的牛皮纸书袋内沿，留着半道尚未完全干透的紫色数字蹭痕。"
            show mo think at right
            "墨墨俯下身，借着窗边斜阳辨认出那半截反印的数字，又走到借阅台前看了一眼小林手边的金属回墨日期章，提笔写下结论。"
            mo_note "书袋口蹭到的是『11.14』昨天的紫色印油。纤维晕染很新，是今天下午刚盖上去的。"
            show lin shock at left
            lin "怎、怎么会是『11.14』？！我每天下午 17:00 听见五点下课钟响，第一件事就是把回墨章拨到当天的新日期『11.15』，今天也绝对没有漏拨！"
            mc "也就是说——抽走这张借书卡并误触日期章的人，必定是在 17:00 之前动的手！"
            $ add_evidence("书袋内侧蹭印：盖着昨日11.14紫印油的未干蹭痕")
            jump mailbox_m1_investigate_loop

        "去图书馆办公室比对纸质登记簿与红外门禁流水" if not _m1_gate:
            $ _m1_gate = True
            scene bg library_office
            $ set_ambient("cool")
            show alice think at left
            show mo neutral at right
            with dissolve
            "走进开着冷白台灯的管理员办公室，我把门口那本手写《古籍室出入登记簿》摊在电脑屏幕旁，调出了防盗门禁的红外过闸毫秒流水。"
            mc "你们看登记簿最后两行：张子谦写着『16:48 入—17:15 出』；林思思班长写着『17:05 入—17:20 出』。"
            show alice shock at left
            alice "等等！你看电脑上联网校准的红外门禁计次器——下午四点四十以后，进馆方向明明只有两次触发：一次是『16:48:12』，另一次是『16:54:09』！17:00 到 17:20 之间根本没有半个人进门呀！"
            "墨墨轻轻点了一下C-4古籍架底座旁捡起的半张明黄色便签角，上面印着学生会班务活页夹特有的圆孔。"
            $ add_evidence("门禁红外流水：16:54入馆记录与登记簿手写17:05相差十一分钟")
            $ add_evidence("班长纸质登记：自称17:05才进馆且未碰过回墨章")
            jump mailbox_m1_investigate_loop

        "询问二号桌的张子谦五点钟声前后的动静" if not _m1_witness:
            $ _m1_witness = True
            scene bg library
            $ set_ambient("dusk")
            show alice smile at left
            show zhang neutral at right
            with dissolve
            zhang "问我五点前后的动静？我当时塞着耳机看市联赛十二分钟集锦呢，背对着书架抄比分，真没注意进门的人长啥样。"
            show zhang think at right
            zhang "不过有一件事我印象特深！集锦放到八分钟左右——也就是离 17:00 下课铃响还有三四分钟的时候，我隐约听见借阅台那边传来『咔哒』一声按回墨印章的脆响，紧接着有人急匆匆往C区书架走了两步。"
            alice "16:48 点开视频，放到第八分钟正好是 16:56！张子谦，你这回可立大功啦！"
            $ add_evidence("张子谦证言：五点钟声响起前曾听见柜台回墨章轻响")
            jump mailbox_m1_investigate_loop

label mailbox_m1_deduction_stage:
    scene bg library_office
    $ set_ambient("cool")
    $ play_bgm(bgm_suspense, fadein=1.2, fadeout=0.8)
    show alice smile at left
    show mo neutral at right
    with dissolve

    alice "四块拼图全部集齐！在请班长过来核对之前，先把最核心的时间锁链扣死吧！"
    sysmsg "【委托信箱 · 逻辑拼合】请挑出两条直接咬合的线索，证明「登记簿上的 17:05 入馆时间为何必然是伪造的」。（零失误结案可获【一击破局】评级）"

    call run_deduction_combine(
        target_pair=["书袋内侧蹭印：盖着昨日11.14紫印油的未干蹭痕", "门禁红外流水：16:54入馆记录与登记簿手写17:05相差十一分钟"],
        conclusion_title="时间锁链闭环：隐瞒的十一分钟与五点前的旧印面",
        conclusion_body="门禁流水证实第二名访客早在 16:54 就已入馆，并非手写登记的 17:05；而书袋内侧残留的『11.14』新鲜紫印油只可能在小林 17:00 调拨印章前盖下，精准锁死在被刻意抹去的十一分钟里！",
        wrong_hints=MB_M1_HINTS
    ) from _call_run_deduction_combine

    scene bg library
    $ set_ambient("dusk")
    show alice neutral at left
    show banzhang sad at right
    with dissolve

    "几分钟后，闻讯赶回古籍室的林思思班长看着门禁流水单，手指微微攥紧了衣角，却还是抱着最后一丝侥幸轻声辩解道："
    banzhang "就算红外门禁在 16:54 响过一次，也可能是别的同学在门口探头晃了一下就走了呀……你们凭什么断定那张借书卡一定是在那会儿被我抽走的呢？"

label mailbox_m1_showdown:
    menu:
        "面对班长的最后一问，哪一项矛盾能够一锤定音地击穿这个解释？"

        "因为张子谦从窗户反光里清清楚楚看见了你的正脸":
            $ _mb_mistakes += 1
            show alice smile at left
            alice "喂喂，不许诈供呀『嘴』先生！张子谦当时低着头抄比分，只听见了 16:56 的盖章声，可没看见正脸！再想想『17:00 调拨日期章』和那道紫色蹭痕锁死了什么！"
            jump mailbox_m1_showdown

        "因为 16:56 盖下的『11.14』旧日期章蹭痕，恰好卡在你隐瞒的那十一分钟里":
            play sound se_correct
            show screen deduction_cutin(headline=_("一语中的 ——！"), subline="TIMESTAMP CONTRADICTION")
            with flash_shutter

        "因为《云溪县志》封底贴了防盗磁条，带出阅览室会触发警报":
            $ _mb_mistakes += 1
            show alice think at left
            alice "方向偏啦！防盗磁条贴在古籍书脊里，薄薄一张纸质借书卡本身是没有磁条的哟。快抓住『17:00 调章』与『16:56 印章响声』之间的时间铁证！"
            jump mailbox_m1_showdown

    mc "班长，如果真是路人探头就走，16:56 借阅台上的回墨印章不会自己响，书袋口更不会留下今天下午刚印上去的『11.14』紫色印泥。"
    mc "你知道小林每天 17:00 整准时调拨印章，所以一旦发现自己慌乱中误盖了旧日期，干脆在离开时把登记时间写成『17:05 入室』——想借此证明自己进门时印章早已变成 11.15，和那道旧印痕撇清关系。"

    show banzhang blush at right
    "班长怔怔地看了我们两秒，肩膀终于轻轻塌了下来，红着耳根从活页夹内袋里双手捧出了那张完好无损的米黄色借书卡。"
    banzhang "对不起，小林同学！我真的不是想偷藏馆藏卡片……只是上学期开放日我表妹来参观时，趁我不注意用铅笔在这张借书卡背面画了一只长耳朵小兔子。"
    banzhang "听说今天闭馆后要把卡片正反面高清扫描挂到校庆网展上，我怕连累图书室出洋相，才想趁五点前偷偷拿普通白卡纸誊抄一张换上……结果一紧张碰响了回墨章，又发现古籍卡用的是特制棉浆纸，根本没法替补，正急得不知道怎么送回来。"

    $ play_bgm(bgm_warm, fadein=1.2, fadeout=0.8)
    hide alice
    show lin smile at left
    show mo smile at right
    "原本板着脸的小林听完缘由，紧绷的神色反倒柔和了下来。她从围裙口袋里取出一块专门清理善本铅笔印的软白橡皮，轻轻几下便将卡片背面那只浅浅的小兔子擦得干干净净。"
    lin "古籍室有专用的无酸软橡皮，下次直接告诉我就好啦。幸好你没有拿普通橡皮硬擦，卡片纤维一点都没伤到。"
    play sound se_write
    mo_note "明天校史展的扫描件会很干净。不过那只小兔子挺可爱的，我临摹在草稿纸角送给你吧。"
    show banzhang happy at right
    banzhang "呜……谢谢小林，也谢谢你们替我留了面子！"

    call _mailbox_finish_case("m1", _mb_mistakes) from _call__mailbox_finish_case
    return


################################################################################
## 卷宗 M-02：《美术室未干的群青颜料》（物理痕迹 · 夕照色温视觉诡计）
################################################################################

label mailbox_case_m2:
    call _mailbox_init_sandbox("委托信箱 · M-02 美术室未干的群青颜料") from _call__mailbox_init_sandbox_1
    $ _mb_mistakes = 0

    scene bg black with fade
    $ play_bgm(bgm_suspense, fadein=1.5)
    centered "{size=+6}校园推理社委托信箱 · CASE M-02{/size}\n\n{size=+14}美术室未干的群青颜料{/size}\n\n{color=#cbb0e6}周五黄昏 · 旧楼西晒走廊与美术准备室 · 光学色温诡计{/color}"

    scene bg agency at bg_kenburns_out
    $ set_ambient("warm")
    show screen evidence_book
    with dissolve

    play sound se_door
    "周五傍晚五点四十，万事屋门外的委托信箱还没来得及落锁，文学社的吕芙就已经捏着一张写了一半的委托笺敲响了门框。"
    show lvfu sad at right
    show alice shock at left
    lvfu "陈默同学，艾丽丝社长！文化祭联合展评的海报六点整就要封箱送审了，可我晾在美术准备室画架上的手绘海报《夜航船》，白卡纸衬边刚刚被人蹭上了一道刺眼的群青蓝水粉！"
    mc "五点半前后谁去过美术准备室一带？"
    lvfu "只有怪盗 Joker！五点三十五分我在西侧夕阳走廊撞见他从画室方向出来，可我拦住他核对袖口时，他却反咬一口说我连颜色都分不清！"

    scene bg sunset
    $ set_ambient("dusk")
    show alice think at left
    show joker smile at right
    with dissolve

    "我们跟着吕芙来到旧社团楼三层西侧外廊。浓烈如熔金般的落日余晖正迎面灌进长廊，把所有人的校服都染上了一层厚重的橙红色。"
    "靠在窗栏边的 Joker 气定神闲地抬起右手手腕——在火红刺眼的夕照下，他洁白的衬衫袖口边缘，确实只有一道灰扑扑、近乎炭黑的『暗紫灰擦痕』。"
    joker "两位大侦探来评评理！吕芙同学的海报上蹭的是鲜亮的『群青蓝』，而本怪盗五点十分只是路过三楼素描室门口蹭了一点『暗紫灰木炭粉』——你们在走廊光线下自己瞧，我袖口上哪有半点蓝色？"
    joker "退一万步讲，普通水粉颜料在空气里晾二十分钟早就干透结壳了，就算我五点十分蹭过颜料，也不可能在五点三十五分还把她的画框染出湿印子吧？"

    $ _m2_easel = False
    $ _m2_cuff  = False
    $ _m2_light = False

label mailbox_m2_investigate_loop:
    if _m2_easel and _m2_cuff and _m2_light:
        jump mailbox_m2_deduction_stage

    scene bg corridor
    $ set_ambient("dusk")
    show alice neutral at left
    show mo neutral at right
    with dissolve

    menu:
        "距离六点封箱只剩二十分钟，先从哪一处切入勘验？（留意不同场景光线色温的变化，可随时翻阅右上角【证据】）"

        "进入美术准备室查验画框未干的群青颜料与素描室钥匙" if not _m2_easel:
            $ _m2_easel = True
            scene bg classroom
            $ set_ambient("cool")
            show lvfu sad at left
            show mo think at right
            with dissolve
            "推开朝北的美术准备室木门，室内开着标准的冷白日光灯，光线清澈干净。海报右下角的白衬纸上，一抹鲜艳饱满的群青蓝水粉依旧泛着微润的光泽。"
            "墨墨取过画架旁美术老师留下的示范调色盘，轻轻嗅了嗅盘边的透明滴瓶，在笔记本上写下一行娟秀的字迹。"
            play sound se_write
            mo_note "调色盘里滴了水粉甘油缓干剂。示范课为了防止颜料干裂，加了甘油后两小时内都会保持湿润，一碰就会转印。"
            mc "而且我刚顺路问了办公室的黄老师——三楼素描室今天下午全程锁门修画架，Joker 根本不可能进素描室蹭到什么木炭粉！"
            $ add_evidence("画框擦痕检出甘油缓干剂：群青颜料两小时内仍可转印")
            $ add_evidence("Joker辩词：自称五点十分后只去过素描室，袖口是干木炭粉")
            jump mailbox_m2_investigate_loop

        "回到夕照西晒外廊近距离检验 Joker 袖口的纤维质感" if not _m2_cuff:
            $ _m2_cuff = True
            scene bg sunset
            $ set_ambient("dusk")
            show alice smile at left
            show joker neutral at right
            with dissolve
            alice "来来来，既然怪盗先生说是素描木炭粉，那借本社长的放大镜瞧一瞧总没意见吧？"
            "在浓重的橙红夕阳底下，那道擦痕乍看确实像极了暗紫灰的炭精条印。但艾丽丝用干净棉签轻轻拨了一下布纹，嘴角立刻扬起一抹狡黠的弧度。"
            show alice happy at left
            alice "哼哼，露馅咯！素描木炭粉是干性松散颗粒，棉签一碰就会掉黑灰；可你这道痕迹把棉纱经纬都糊住发硬了，根本是带胶质的水性颜料！"
            show joker shock at right
            joker "咳……那、那就算是某种深灰色水粉，它也不是蓝色的群青呀！"
            $ add_evidence("夕照走廊下的袖口痕迹：织物纤维粘结发硬且无炭粉脱落")
            jump mailbox_m2_investigate_loop

        "请墨墨用标准群青色卡演示西晒夕照与冷白日光的色温差" if not _m2_light:
            $ _m2_light = True
            scene bg classroom
            $ set_ambient("ultramarine")
            show alice shock at left
            show mo neutral at right
            with dissolve
            play sound se_page
            "墨墨从美术室颜料柜抽出一张印着『443 群青 Ultramarine』的标准色卡，先在朝北画室的冷白日光灯下向我们展示——那是再纯粹不过的深海群青蓝。"
            scene bg sunset
            $ set_ambient("dusk")
            show alice happy at left
            show mo smile at right
            with dissolve
            "紧接着，她迈出画室门槛，把同一张群青色卡举到西晒走廊火红浓烈的落日光束里。"
            "神奇的一幕发生了：由于低垂的橙红夕阳几乎不含短波蓝光，原本鲜亮的群青色卡在吞没橙红光线后，瞬间在我们眼前暗淡成了一抹死气沉沉的『暗紫灰色』——与 Joker 袖口上的痕迹分毫不差！"
            play sound se_write
            mo_note "不是颜料变了色，是西晒夕阳偷走了蓝光。"
            $ add_evidence("墨墨的色卡比对：橙红夕阳缺乏蓝波段，群青会显色为暗紫灰")
            jump mailbox_m2_investigate_loop

label mailbox_m2_deduction_stage:
    scene bg classroom
    $ set_ambient("cool")
    show alice smile at left
    show mo neutral at right
    with dissolve

    alice "光学魔术已经被墨墨的色卡彻底看穿啦！来吧搭档，先把揭穿袖口伪装的两条关键铁证拼合起来！"
    sysmsg "【委托信箱 · 逻辑拼合】请拼合两条线索，直接证伪 Joker 关于「袖口只是素描室暗紫灰干木炭粉」的辩解。"

    call run_deduction_combine(
        target_pair=["夕照走廊下的袖口痕迹：织物纤维粘结发硬且无炭粉脱落", "墨墨的色卡比对：橙红夕阳缺乏蓝波段，群青会显色为暗紫灰"],
        conclusion_title="色温障眼法告破：夕照吞没蓝光后的群青水粉",
        conclusion_body="袖口织物被胶质粘结无掉灰，证明是水性颜料而非干木炭粉；而在缺乏短波蓝光的浓重橙红夕照下，纯正群青会因吸收红橙光而呈现暗紫灰色，进屋照冷白光便原形毕露！",
        wrong_hints=MB_M2_HINTS
    ) from _call_run_deduction_combine_1

    show joker shock at right
    "被我们请进冷白日光灯下的美术准备室后，Joker 低头看了一眼自己袖口瞬间还原成鲜亮群青蓝的擦痕，夸张地叹了口气，却还不忘抛出最后一道难题："
    joker "好吧好吧，光学算你们赢！可我真是五点十五分路过画架旁不小心蹭到调色盘的——按常理水粉颜料十几分钟就干了，怎么可能隔了二十分钟还把画框蹭出湿印子呢？"

label mailbox_m2_showdown:
    menu:
        "面对关于「颜料干燥时间」的最后追问，应当出示哪一项事实予以反驳？"

        "因为傍晚起雾湿度飙升，已经干透的水粉又重新化开了":
            $ _mb_mistakes += 1
            show alice smile at left
            alice "今天可是万里无云的晴朗黄昏，哪来的浓雾呀！快回想一下墨墨在示范调色盘旁边闻到了什么特殊媒介剂！"
            jump mailbox_m2_showdown

        "因为你随身带了小喷壶，故意喷湿袖口去蹭脏海报":
            $ _mb_mistakes += 1
            show alice think at left
            alice "噗，那样他自己的白衬衫袖子早就晕成一大片蓝水渍啦！仔细看画架调色盘那条证物批注！"
            jump mailbox_m2_showdown

        "因为示范调色盘调入了甘油缓干剂，颜料两小时内都会保持湿润":
            play sound se_correct
            show screen deduction_cutin(headline=_("真相显影 ——！"), subline="OPTICAL & TRACE PROOF")
            with flash_shutter

    mc "美术老师的示范调色盘里滴了甘油缓干剂，别说二十分钟，就算过两个小时颜料表层照样湿润可转印。更何况，画架底座下还夹着一张还没来得及署名的烫金书签贺卡吧？"
    show joker blush at right
    "我弯腰从画架横档缝隙里轻轻拈出一张剪裁精巧的深蓝烫金贺卡，上面用花体字写着：『贺文学社《夜航船》顺风启航』。"
    joker "咳、咳咳！既然都被你们翻出来了……本怪盗只是看吕芙同学为了这张海报熬了三个晚自习，想悄悄塞张贺卡捧个场而已！"
    joker "谁知道走廊穿堂风突然把画架吹歪了半寸，我下意识伸手去扶画框，袖口就先蹭上了旁边的示范调色盘，又在白衬边上按了一道……刚才在走廊死鸭子嘴硬，也是怕吕芙以为我是去搞破坏的。"

    $ play_bgm(bgm_warm, fadein=1.2, fadeout=0.8)
    hide alice
    show lvfu smile at left
    show mo smile at right
    "吕芙愣了一下，原本焦急的眼神顿时软了下来。她拿起一支干净的小号平头水粉笔，蘸上高遮盖力的钛白水粉，三两下便将白卡纸边缘那道群青擦痕修补成一朵恰到好处的浪花留白。"
    lvfu "笨拙得一点都不像平时神出鬼没的怪盗呢……不过刚才要是没人扶那一下，整幅画摔在地上才真就毁了。这张烫金贺卡，我就当成《夜航船》的第一张观众签收单收下啦。"
    play sound se_write
    mo_note "加了一朵白色浪花边角之后，比原来的构图更有呼吸感了。"

    call _mailbox_finish_case("m2", _mb_mistakes) from _call__mailbox_finish_case_1
    return


################################################################################
## 卷宗 M-03：《钟楼午休的第七声回响》（声学延迟 · 作息时刻表诡计）
################################################################################

label mailbox_case_m3:
    call _mailbox_init_sandbox("委托信箱 · M-03 钟楼午休的第七声回响") from _call__mailbox_init_sandbox_2
    $ _mb_mistakes = 0

    scene bg black with fade
    $ play_bgm(bgm_prologue, fadein=1.5)
    centered "{size=+6}校园推理社委托信箱 · CASE M-03{/size}\n\n{size=+14}钟楼午休的第七声回响{/size}\n\n{color=#cbb0e6}周三午休 · 旧社团楼天台与礼堂东廊 · 声速与广播重影{/color}"

    scene bg agency at bg_kenburns_out
    $ set_ambient("warm")
    show screen evidence_book
    with dissolve

    play sound se_bell
    "周三午休刚过一点，桌游社的高社长便捧着一支银色采访录音笔和一只丝绒首饰盒，满头雾水地投递了委托信箱的第三封急件。"
    show shezhang shock at right
    show alice neutral at left
    shezhang "陈默同学、艾丽丝社长，你们听没听说过咱们学校钟楼的『正午怪谈』？平时 12:30 半点报时，钟楼明明只敲六下对吧？"
    mc "对，整点按小时敲，半点固定敲六响、每响间隔两秒，从建校起就没变过。"
    shezhang "可今天中午 12:25 到 12:35 之间，锁在礼堂东廊一楼社团储物柜里的『毕业前辈纪念徽章盒』被人用备用钥匙开过一次！当时唯一借走过钥匙串的新干事小周赌咒发誓，说他 12:30 整一直站在旧社团楼三楼天台背广播稿，还把手机备忘录的现场录音交给我自证清白——"
    show shezhang sad at right
    shezhang "结果我戴上耳机一数，12:30 那段录音里，居然清清楚楚响了整整『七声』钟鸣！"

    play sound se_bell
    show alice happy at left
    hide shezhang
    show mo think at right
    alice "哦豁！多出来的第七声午休钟鸣？这可比单纯找钥匙带劲多了！走吧搭档，天台、钟楼值班室、还有一楼储物柜所在的礼堂东廊，咱们挨个去听个真切！"

    $ _m3_tower = False
    $ _m3_wave  = False
    $ _m3_hall  = False

label mailbox_m3_investigate_loop:
    if _m3_tower and _m3_wave and _m3_hall:
        jump mailbox_m3_deduction_stage

    scene bg clubroom
    $ set_ambient("warm")
    show alice neutral at left
    show mo neutral at right
    with dissolve

    menu:
        "多出来的第七声钟响究竟是机械故障、回声还是不在场诡计？先去哪里调查？（可随时点右上角【证据】查看批注）"

        "登上旧社团楼天台并找王老师核查钟楼机械报时日志" if not _m3_tower:
            $ _m3_tower = True
            scene bg rooftop
            $ set_ambient("cool")
            show wang neutral at right
            show alice think at left
            with dissolve
            "站在晴朗开阔的旧社团楼三楼天台上，抬头就能看见正前方仅二十米外的老钟楼铜钟。负责校产维护的王老师翻开检修日志摇了摇头。"
            wang "12:30 连敲七下？绝不可能。那座老钟的半点报时靠一枚纯机械六齿凸轮控制，六个齿拨完自动落锁，多一响都敲不出来。"
            mc "那会不会是天台墙壁反射出来的自然回声？"
            wang "你们瞧天台四周全是低矮铁丝网，周围两百米内连栋遮挡的高楼都没有，哪来的反射墙？而且天台离钟楼才二十米，真站在这儿录音，钟声震耳欲聋，更没有半点广播喇叭的杂音。"
            $ add_evidence("钟楼齿轮日志：12:30半点凸轮仅有六齿，天台开阔无反射墙")
            $ add_evidence("干事的不在场录音：自称12:30身在距钟楼20米的三楼天台")
            jump mailbox_m3_investigate_loop

        "在活动室用电脑放大干事提交的『七声钟响』音频波形" if not _m3_wave:
            $ _m3_wave = True
            scene bg clubroom
            $ set_ambient("warm")
            show alice think at left
            show mo think at right
            with dissolve
            play sound se_bell
            "我把干事小周提交的录音导入音频查看器。屏幕上跳出一排清晰的脉冲波峰：前六声钟鸣略带隔着玻璃窗的闷感，每两声之间严格相隔 2.00 秒。"
            "然而就在第六声钟鸣落下仅仅 1.15 秒之后，第七道波峰突兀地跳了出来——音色明显带着老式纸盆喇叭的电流质感，紧接着末尾还录进了极轻的『咔哒、咕嘟』一声金属阀门响！"
            play sound se_write
            mo_note "第七声不是铜钟直达音，是校园广播副喇叭切入的转播音。后面那声『咔哒』，是茶水间铜浮球开水炉水沸落阀的声音。"
            $ add_evidence("录音波形解析：第六响后1.15秒混入广播副喇叭延迟音与开水炉铜阀声")
            jump mailbox_m3_investigate_loop

        "前往一楼礼堂东廊储物柜旁实测钟楼距离与广播延迟" if not _m3_hall:
            $ _m3_hall = True
            scene bg hall
            $ set_ambient("dusk")
            show alice happy at left
            show mo smile at right
            with dissolve
            "我们顺着楼梯走到校园最东端的礼堂一楼东侧内廊。桌游社的金属储物柜就立在拐角处，五步之外正是冒着白汽的礼堂茶水间开水炉，而走廊天花板上赫然挂着一只老旧的校园广播副喇叭！"
            mc "从校园平面图上看，礼堂东廊距离西侧钟楼整整 380 米！按声速每秒 340 米计算，窗外真钟楼的钟声飞越 380 米传到这里，每一声都会固定晚到约 1.12 秒。"
            alice "我还专门去广播站问清了这只老副喇叭的毛病！因为礼堂东廊接的是老式模拟中继功放，每次同步钟楼报时信号都会慢半拍，直到『延迟约 2.25 秒』才会把功放继电器吸合，刚好只把最后第六响转播出来！"
            mc "真钟声晚到 1.12 秒，头顶广播转播的同一声第六响晚到 2.25 秒……2.25 减去 1.12，正好在第六响之后 1.13 秒多出一记『第七声重影』！"
            $ add_evidence("礼堂东廊实测：距钟楼380米且紧邻一楼储物柜，头顶广播中继固定延迟2.2秒")
            jump mailbox_m3_investigate_loop

label mailbox_m3_deduction_stage:
    scene bg clubroom
    $ set_ambient("warm")
    $ play_bgm(bgm_mystery, fadein=1.2, fadeout=0.8)
    show alice smile at left
    show mo neutral at right
    with dissolve

    alice "真相已经精确到小数点后两位啦！先把波形里的秘密和现场声学实测拼合起来，锁定真正的录音坐标吧！"
    sysmsg "【委托信箱 · 逻辑拼合】请挑出两条直接咬合的线索，证明「那段七声钟鸣的录音究竟是在校园哪一处录下的」。"

    call run_deduction_combine(
        target_pair=["录音波形解析：第六响后1.15秒混入广播副喇叭延迟音与开水炉铜阀声", "礼堂东廊实测：距钟楼380米且紧邻一楼储物柜，头顶广播中继固定延迟2.2秒"],
        conclusion_title="声学坐标锁定：一楼礼堂东廊茶水间与储物柜旁",
        conclusion_body="全校唯有距钟楼 380 米的礼堂一楼东廊同时具备『真钟声传播延迟 1.12 秒』『老广播中继延迟 2.25 秒切入尾音』以及『开水炉铜阀沸腾声』三重声学指纹——录音时他正站在储物柜旁！",
        wrong_hints=MB_M3_HINTS
    ) from _call_run_deduction_combine_2

    show shezhang shock at right
    "听我们指出录音地点就在一楼礼堂东廊储物柜旁，高社长惊讶得张大了嘴，随即挠着头追问道："
    shezhang "可我还是没转过弯来——就算小周当时站在礼堂东廊而不是三楼天台，王老师不是说钟楼半点只敲了六下吗？为什么录音里会听见整整七下钟声呀？"

label mailbox_m3_showdown:
    menu:
        "如何用最清晰的一句话向高社长解释「第七声钟鸣」的真正成因？"

        "前六声是380米外传来的真钟声，第七声是头顶广播延迟2.2秒才切入的第六响重影":
            play sound se_correct
            show screen deduction_cutin(headline=_("声学破局 ——！"), subline="ACOUSTIC SCHEDULE TRICK")
            with flash_shutter

        "钟楼六齿凸轮弹簧老化，第六下敲完后撞锤回弹又轻轻碰响了一次铜钟":
            $ _mb_mistakes += 1
            show alice smile at left
            alice "刚刚王老师才给我们看过检修日志，纯机械落锁可不会回弹连敲哟！想想『空气传播耗时 1.12 秒』和『广播中继延迟 2.25 秒』的时间差！"
            jump mailbox_m3_showdown

        "干事提前在另一部手机里下载了钟声音效，故意多按了一下制造怪谈":
            $ _mb_mistakes += 1
            show alice think at left
            alice "他本来是想拿录音证明自己乖乖待在天台上，怎么会故意多放一声引人怀疑呢？快用『远方真钟声』与『头顶广播尾音重影』解开谜底吧！"
            jump mailbox_m3_showdown

    mc "答案很简单：那根本不是第七下敲钟，而是『第六响被录进了两次』。"
    mc "前六声是 380 米外钟楼跨越空气传进东廊窗户的真钟声，耗时 1.12 秒；而天花板上的老广播中继延迟 2.25 秒才吸合开关，把同一记第六响从头顶喇叭又放了一遍。两者相差 1.13 秒，听起来就像凭空多出了诡异的第七声。"

    $ play_bgm(bgm_warm, fadein=1.2, fadeout=0.8)
    show shezhang happy at right
    "高社长恍然大悟地一拍手掌，打开手里那只丝绒纪念徽章盒再仔细端详内衬，忽然轻呼了一声："
    shezhang "咦？！徽章一枚都没少，反倒是垫在徽章底下的烫银纪念卡换成了新印的一版——昨天彩排时我不小心把休学养病的周学长名字漏印了，当时还懊恼来不及重印，今天居然全补齐了！"
    show alice smile at left
    alice "破案咯！你们那位新干事八成是自掏零花钱加急重印了纪念衬卡，想趁午休悄悄塞进盒子里给前辈们一个惊喜，被你问起钥匙去向才笨手笨脚编了个天台背稿的借口。"
    hide shezhang
    show mo smile at right
    play sound se_crane
    "午后的阳光透过万事屋的百叶窗落在摊开的卷宗簿上。墨墨将一只刚折好的小小白色千纸鹤立在胡桃木委托信箱的右上角，低头写下结案附言。"
    mo_note "第七声回响替他泄露了秘密，也替那位休学的前辈留住了名字。三桩信箱委托，全部圆满结清。"

    call _mailbox_finish_case("m3", _mb_mistakes) from _call__mailbox_finish_case_2
    return
