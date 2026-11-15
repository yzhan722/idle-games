## 《沉默侦探：千纸鹤的约定》—— 双女主番外短篇（DLC）
## dlc_stories.rpy
##
## 收录两篇独立番外短篇（从「章节选择 -> 番外短篇（DLC）」直接进入，零侵入主线数值与分支）：
##   1. label dlc_alice_ledger  —— 《艾丽丝的代价账本》（艾丽丝视角 · 万事屋第 129 号委托，含证物翻面勘验 + 双线索逻辑拼合）
##   2. label dlc_mo_bookstreet —— 《旧书街与第三只千纸鹤》（TRUE END 后日谈 · 重新发声后的墨墨周末旧书街约会）

default persistent.dlc_alice_done = False
default persistent.dlc_mo_done    = False

init python:
    # 注册《艾丽丝的代价账本》专属证物翻面细节（复用 PC-1 证物查验系统）
    register_evidence_detail(
        "陈列柜里的撕角借据：抵万事屋账本第47页",
        "艾丽丝（社长批注）",
        "借据用的是老式双横线记账纸，裁切边留着半道黄铜镇纸压痕——全校除了本社长，只有图书室小林装订过刊时会用同款黄铜压尺。"
    )
    register_evidence_detail(
        "高社长：陈列柜钥匙昨晚借给小林核对社团资产",
        "陈默（现场勘验）",
        "铜锁锁芯干净无划痕，玻璃推拉门轨道也没有强行撬动的碎屑，说明取走骑士棋子的人是用正规钥匙堂堂正正打开柜门的。"
    )
    register_evidence_detail(
        "小卖部阿姨：昨夜有人送来断掉底座的黄铜棋子托修",
        "墨墨（牛皮纸批注）",
        "阿姨柜台下的工具铁盒里留着新鲜的黄铜焊锡点与绒布垫片——那枚棋子不是被偷走藏匿，而是底座脱焊后被连夜送去修补了。"
    )
    register_evidence_detail(
        "小林：清点退社学长旧书时袖口勾落碰裂了棋子底座",
        "艾丽丝（社长批注）",
        "那个把规则刻进骨子里的图书委员，生怕在优秀社团评比前连累桌游社扣分，居然笨拙地搬出两个月前攒在我这里的人情当护身符。"
    )
    register_evidence_detail(
        "代价簿第47页存根：雨天替墨墨线装加固牛皮纸封皮",
        "墨墨（牛皮纸批注）",
        "第47页写着：「小林替墨墨手工缝补淋湿的牛皮纸笔记本封壳；抵扣报酬：万事屋欠小林一次不问缘由的保密协助。」艾丽丝一直替我收着这页账。"
    )

    # 注册《旧书街与第三只千纸鹤》专属纪念物翻面细节
    register_evidence_detail(
        "旧诗集里的银杏叶铅笔书签",
        "陈默（周末手记）",
        "夹在旧书摊《秋日信札》第88页的干枯银杏书签，背面留着退休语文老师娟秀的钢笔字：「愿读到这一页的两个人，不必等风起才开口。」"
    )
    register_evidence_detail(
        "两人合折的第三只淡紫千纸鹤",
        "墨墨（亲手题字）",
        "左边的翅膀是陈默折的，稍微宽了一点点；右边的翅膀是我折的。这一次不用塞在课桌抽屉里，就摆在我们看得见的窗台上。"
    )

    DLC_ALICE_HINTS_1 = {
        "default": "哼哼，本社长提醒你哦：先搞清楚「是谁既能不撬锁打开陈列柜，又裁得出那张带黄铜尺压痕的借据」——把钥匙去向和借据本身的痕迹拼起来看看！",
        "小卖部阿姨：昨夜有人送来断掉底座的黄铜棋子托修": "小卖部阿姨这边说的是棋子的「下落」，我们眼下第一步要先锁定「留下借据开门取物的人」是谁哟！",
    }

    DLC_ALICE_HINTS_2 = {
        "default": "已经知道是小林拿走了棋子，那她为什么要神神秘秘撕下借据、搬出『代价簿第47页』呢？把「棋子送去修补的真相」和「第47页存根上的约定」碰撞一下吧！",
        "高社长：陈列柜钥匙昨晚借给小林核对社团资产": "钥匙去向刚才已经用过啦，现在我们要解开的是小林「秘而不宣的动机」与第47页账目之间的联系！",
    }


################################################################################
## 番外一：《艾丽丝的代价账本》
################################################################################

label dlc_alice_ledger:
    $ full_run = False
    $ save_name = "番外一 · 艾丽丝的代价账本"
    $ chapter_reached = max(chapter_reached, 3)
    $ mo_favor = 68
    $ alice_favor = 24
    $ fail_count = 0
    $ intuition = 3
    $ evidence = []
    $ inspected_evidence = []
    $ expanded_evidence = ""
    $ reset_combine_state()

    scene bg black
    with fade
    $ play_bgm(bgm_daily, fadein=1.8)
    centered "{size=+8}番外短篇 · 一{/size}\n\n{size=+14}艾丽丝的代价账本{/size}\n\n{color=#cbb0e6}十一月中旬 · 旧社团楼三楼 · 万事屋{/color}"

    scene bg agency at bg_kenburns_out
    $ set_ambient("dusk")
    show screen evidence_book
    with dissolve

    play sound se_page
    "深秋的夕阳斜斜穿过旧社团楼的百叶窗，在万事屋那张有些掉漆的长木桌上投下一格一格蜂蜜色的光斑。"
    "如果让艾丽丝自己来评价，经营「云溪高中万事屋」是一件极其讲究收支平衡的伟大事业。"
    "左手边是一摞按月份装订成册的硬壳牛皮账本，封面上用烫金钢笔潇洒地写着《代价簿 · 卷三》；右手边则是一杯刚泡好的红茶，外加两颗还没剥糖纸的柠檬硬糖。"

    show alice smile at center
    alice "第126号委托，替一班体育委员找回滚进灌木丛的秒表——代价是帮走廊窗台的绿萝浇水三天，已结清。"
    play sound se_page
    show alice think at center
    alice "第127号委托，替二班文艺委员鉴别匿名情书是不是恶作剧——代价是两袋小卖部新出的海盐饼干，墨墨分了一半，也结清。"

    show alice neutral at left
    show mo neutral at right
    "坐在靠窗软垫上的墨墨听到自己的名字，从厚厚的精装书后面抬起半双眼睛，耳尖轻轻动了一下。"
    "她低头在牛皮纸笔记本上沙沙写了一行字，顺着桌面推到茶杯旁。"
    mo_note "你漏算了昨天下午你自己偷吃掉的那三块海盐饼干。"

    show alice blush at left
    alice "咳、咳咳！那叫社长合理抽成的仓储保管费！怎么能叫偷吃呢！"
    mc "我在门外走廊都听见你心虚拔高的尾音了，伟大的万事屋社长。"

    play sound se_door
    "我推开虚掩的木门走进活动室，把刚从教导处顺路带回来的社团评优通知单放在桌角。"
    show alice happy at left
    alice "来得正好，我们万事屋的专职『嘴』先生！下周五就是全校社团年度展评了，只要这礼拜平平安安不出乱子——"

    play sound se_bell
    "门框上悬挂的黄铜风铃忽然急促地叮当乱响起来，像是专门为了打断艾丽丝的立旗发言。"
    hide mo
    show alice shock at left
    show shezhang shock at right
    shezhang "艾丽丝社长！陈默同学！不好了，我们桌游社出大事了！"

    mc "高社长？慢点喘气，桌游社活动室又丢东西了？"
    show shezhang sad at right
    shezhang "比丢普通桌游严重得多！你们知道我们社团陈列柜正中央摆着的那枚『初代社长传下来的黄铜骑士棋子』吧？"
    shezhang "明天中午学生会就要来清点社团历史陈列品打分了，可我十分钟前去擦玻璃柜，发现黄铜骑士不见了！"

    show alice think at left
    alice "等等，你们换过新锁之后，陈列柜的钥匙不是一直挂在你随身的钥匙扣上吗？"
    shezhang "奇怪就奇怪在这里！柜门锁得好好的，里面既没有翻乱，也没少别的绝版卡牌，偏偏在空出来的丝绒底座上压了这么一张纸角——"

    play sound se_page
    "高社长颤巍巍地从口袋里掏出一张透明证物袋——显然是被万事屋熏陶久了，连保护现场指印都学会了。"
    "袋子里躺着一角双横线记账纸，上面用极其工整却略显仓促的黑色水笔写着一行字："
    centered "{color=#f4d98a}「暂借黄铜骑士三日。一切责任与代价，抵万事屋《代价簿》第 47 页。」{/color}"

    show alice shock at left
    "我原本以为这又是类似 Joker 那种故弄玄虚的预告函，可转头看向艾丽丝时，却发现她的笑容在看清「第 47 页」三个字的瞬间微微凝住了。"
    "她下意识伸手按住了桌上的《代价簿》，指节轻轻蜷了一下。"

    mc "艾丽丝？第 47 页写过什么委托？"
    show alice neutral at left
    alice "……是一桩还没有划掉红勾的旧账。"
    show alice smile at left
    "仅仅半秒钟，那位永远风风火火的金发双马尾少女又扬起了下巴，把垂到肩头的发梢往后一拨。"
    alice "居然敢打着本社长《代价簿》的旗号在太岁头上动土！高社长，这桩第 129 号委托，万事屋接下了——今晚放学前，保证让你的黄铜骑士完完整整回到丝绒底座上！"

    $ add_evidence("陈列柜里的撕角借据：抵万事屋账本第47页")

    hide shezhang
    show mo think at right
    "送走稍稍安心去准备迎检材料的高社长后，活动室里重新安静下来。"
    "墨墨没有急着追问，只是安静地注视着艾丽丝按在账本封皮上的手。"
    mo_note "第 47 页，是不是不想让我们看？"

    show alice sad at left
    "艾丽丝眨了眨湖绿色的眼睛，像是被人轻轻戳破了藏在糖衣底下的一点柔软心事。"
    show alice smile at left
    alice "哪有什么不能看的呀，只是当时答应过债主『不主动往外说』而已。不过既然对方自己把第 47 页写在了借据上，那就等于主动启用了这张兑付券。"
    play sound se_page
    "艾丽丝翻开《代价簿》中段一处折起封存的夹页，抽出一张裁掉了右上角的存根。"
    "我凑过去一看——存根右上角的缺口，竟然和高社长送来的那张撕角借据严丝合缝！"

    mc "这是……九月底那场秋雨的时候记下的？"
    show alice neutral at left
    alice "那天傍晚墨墨的牛皮纸笔记本在走廊窗边被斜雨打湿了封壳，线装脊背开了线。正好图书室的小林路过，一声不吭抱回装订室，用古籍修补线整整缝了两个钟头。"
    show mo blush at right
    "墨墨低头摸了摸怀里那本边角扎实平整的牛皮纸笔记本，指尖轻轻摩挲着细密的麻线针脚。"
    alice "你们也知道小林那个别扭性子，要是当面道谢或者送她点心，她肯定板着脸说『只是顺手维护纸制品』。所以我干脆在《代价簿》第 47 页给她记了一笔，还把右上角撕下来塞进她笔袋里当凭据——"
    alice "上面写着：『万事屋欠小林一次不问缘由的保密协助。』"

    $ add_evidence("代价簿第47页存根：雨天替墨墨线装加固牛皮纸封皮")

    mc "原来如此……可一板一眼遵守校规的小林，怎么会突然半夜跑去桌游社拿走人家的镇社棋子？"
    show alice think at left
    alice "走吧，我的搭档们！在妄下定论之前，先把桌游社陈列柜、图书管理员办公室，还有校内唯一能处理金属器物的地方查个底朝天！"

    ## 现场三处调查循环（必须全部走访完毕，确保线索完整且节奏紧凑）
    $ _dlc_v_club = False
    $ _dlc_v_lib  = False
    $ _dlc_v_shop = False

label dlc_alice_investigate_loop:
    if _dlc_v_club and _dlc_v_lib and _dlc_v_shop:
        jump dlc_alice_deduction_stage

    scene bg corridor
    $ set_ambient("dusk")
    show alice neutral at left
    show mo neutral at right
    with dissolve

    menu:
        "旧社团楼的黄昏静悄悄的，接下来先去哪一处核实线索？（可在右上角【调查手册】随时翻面查验证物细节）"

        "去二楼桌游社活动室勘验陈列柜与钥匙流向" if not _dlc_v_club:
            $ _dlc_v_club = True
            scene bg clubroom
            $ set_ambient("dusk")
            show alice think at left
            show shezhang neutral at right
            with dissolve
            mc "高社长，除了你之外，昨天下午到今天早上，陈列柜的那串备用钥匙有没有离开过你的视线？"
            show shezhang shock at right
            shezhang "啊！你这么一问我想起来了——昨天傍晚五点半，图书委员小林拿着学生会的《社团固定资产核查表》来过一趟！"
            shezhang "当时我正忙着搬展板，就把整串社团钥匙递给她，请她帮忙照着清单核对书架和陈列柜里的编号，大约六点整她才把钥匙还给我。"
            hide shezhang
            show mo think at right
            "我蹲下身仔细查看玻璃陈列柜的黄铜锁舌与滑轨，没有半点硬物撬动或铁丝拨锁的擦痕。"
            "墨墨用指尖轻轻点了一下丝绒底座边缘残留的一丁点暗金色粉末，在本子上写下一行批注。"
            mo_note "底座边缘有一圈老化的松香焊锡碎屑。这枚黄铜棋子原本就快断开了。"
            $ add_evidence("高社长：陈列柜钥匙昨晚借给小林核对社团资产")
            jump dlc_alice_investigate_loop

        "去一楼图书馆办公室找小林当面核实" if not _dlc_v_lib:
            $ _dlc_v_lib = True
            scene bg library_office
            $ set_ambient("dusk")
            show alice smile at left
            show lin neutral at right
            with dissolve
            play sound se_door
            "推开图书馆办公室的门时，小林正站在装订台前整理一摞退社高三学长捐赠的旧棋谱，压书用的正是那把沉甸甸的黄铜镇尺。"
            alice "下午好呀，小林委员。我们刚从桌游社过来，看到了一张眼熟得很的记账纸角哦。"
            show lin shock at right
            "小林握着铅笔的手指明显僵了一下，镜片后的目光飞快闪躲了半寸，随即又强装镇定地抿紧嘴唇。"
            show lin sad at right
            lin "……既然上面写了抵扣《代价簿》第 47 页，按照你们万事屋自己的规矩，社长应该替委托人保密才对。"
            mc "保密归保密，但明天中午学生会就要给桌游社打分了。如果真成了无头失窃案，高社长和整个桌游社都会被取消评优资格。"
            show lin blush at right
            "听到「取消评优资格」几个字，小林急得耳根一下红了，终于低声开了口。"
            lin "我不是故意拿走的……昨晚我帮高社长清点陈列柜上层的退社学长旧书时，毛衣袖口不小心勾到了那枚黄铜骑士棋子。"
            lin "它原本焊在圆形底座上的老焊点本来就脆了，啪嗒一下歪倒在玻璃隔板上，底座裂开了一道缝……我当时慌了神，根本不敢当场告诉高社长，只想赶紧在明天中午之前把它修好放回去！"
            $ add_evidence("小林：清点退社学长旧书时袖口勾落碰裂了棋子底座")
            jump dlc_alice_investigate_loop

        "去校门旁小卖部询问阿姨昨夜的修补去向" if not _dlc_v_shop:
            $ _dlc_v_shop = True
            scene bg gate
            $ set_ambient("dusk")
            show alice happy at left
            show ayi smile at right
            with dissolve
            alice "阿姨！今天进柠檬味硬糖了吗？顺便向您打听个事儿！"
            ayi "哟，是艾丽丝和陈默呀！硬糖给你们留着呢。你们是来帮那个戴眼镜的图书室小姑娘取东西的吧？"
            mc "取东西？果然送到您这儿来了！"
            show ayi happy at right
            ayi "可不是嘛！我家老头子以前是钟表铜器厂的钳工，平时帮学生焊个眼镜腿、修个铜奖章最拿手了。"
            ayi "昨晚快关门的时候，那姑娘红着脸捧着一枚断了底座的黄铜马儿跑来，千叮咛万嘱咐让我千万别声张，还说今儿放学前一定得修得看不出焊印。"
            show ayi neutral at right
            ayi "老头子昨晚连夜用低温银焊修结实又抛了光，天亮前就托我带回小卖部柜台锁着啦——不过那丫头下课来过一回，见高社长正好在小卖部买水，吓得掉头就跑了！"
            $ add_evidence("小卖部阿姨：昨夜有人送来断掉底座的黄铜棋子托修")
            jump dlc_alice_investigate_loop

label dlc_alice_deduction_stage:
    scene bg agency
    $ set_ambient("dusk")
    $ play_bgm(bgm_suspense, fadein=1.2, fadeout=1.0)
    show alice smile at left
    show mo neutral at right
    with dissolve

    alice "好啦，拼图碎片全部摆在万事屋的桌面上咯！"
    alice "在把小林和高社长一起请过来解开疙瘩之前，按我们万事屋的老规矩——先来把整桩『第 47 页借据案』的前后因果严丝合缝地拼合出来吧！"
    sysmsg "【思维拼合 · 第一重】请先拼合两条线索，锁定「是谁在何时不撬锁取走了棋子并留下那张特殊借据」。（若未查看证物背面，也可先点右上角调查手册翻阅批注）"

    call run_deduction_combine(
        target_pair=["陈列柜里的撕角借据：抵万事屋账本第47页", "高社长：陈列柜钥匙昨晚借给小林核对社团资产"],
        conclusion_title="破局推论一：钥匙与黄铜尺压痕锁定小林",
        conclusion_body="陈列柜锁芯完好，昨晚唯一借走过钥匙的外人只有小林；而借据边缘残留的黄铜压尺痕迹与第47页存根缺口完全吻合，证实正是小林留下了借据。",
        wrong_hints=DLC_ALICE_HINTS_1
    )

    show alice happy at left
    alice "漂亮！第一扣稳稳锁上啦！那么接下来就是最关键的第二问——"
    alice "向来最守规矩的小林为什么要藏起真相、非得动用万事屋第 47 页的保密券不可？把那两条真正揭穿她温柔笨拙用心的线索拼起来吧！"

    call run_deduction_combine(
        target_pair=["小卖部阿姨：昨夜有人送来断掉底座的黄铜棋子托修", "代价簿第47页存根：雨天替墨墨线装加固牛皮纸封皮"],
        conclusion_title="破局推论二：用保密人情换一夜静悄悄的修补",
        conclusion_body="棋子底座原本就已老化松脱，小林无意碰裂后怕连累桌游社评优，便连夜托小卖部阿姨找老钳工焊接抛光，并用两个月前替墨墨补书攒下的第47页保密券请艾丽丝替她打掩护！",
        wrong_hints=DLC_ALICE_HINTS_2
    )

    $ play_bgm(bgm_warm, fadein=1.5, fadeout=1.0)
    scene bg clubroom
    $ set_ambient("dusk")
    show shezhang happy at left
    show lin blush at right
    with dissolve

    "二十分钟后，那枚底座重新焊接得稳稳当当、连陈年铜锈都擦得温润发亮的黄铜骑士棋子，重新立回了桌游社陈列柜的天鹅绒衬垫上。"
    shezhang "哎呀，小林同学你真是太客气了！那枚棋子三年前被上一届副社长摔过一次，本来就是用胶水勉强粘住的，我还一直愁去哪儿找手艺人修呢！"
    lin "但、但是毕竟是在我核查期间裂开的……按规定，损坏公物应当原样修复并如实登记。"
    hide shezhang
    show alice smile at left
    alice "现在既原样修复了，又向社长本人如实登记啦！皆大欢喜，对吧？"

    show lin neutral at right
    "小林推了推鼻梁上的眼镜，轻轻舒了一口气，目光落向艾丽丝手里那本厚厚的《代价簿》。"
    lin "那……我的第 47 页存根，今天算是正式核销了吧？"
    show alice happy at left
    alice "那当然！本社长说话算话，今晚回去就用红钢笔盖上『两清』印章！"

    scene cg alice_sunset with dissolve
    $ set_ambient("dusk")
    "等高社长和小林并肩去核对明天的展板清单后，暮色已经染红了旧社团楼长长的外廊。"
    "艾丽丝抱紧那本《代价簿》，趴在走廊栏杆上望着操场尽头缓缓沉落的夕阳，金色的双马尾被晚风吹得轻轻晃动。"
    "墨墨安静地站在她身侧，而我靠在半步外的窗框边，终于问出了那个从入社第一天起就有点好奇的问题。"

    mc "艾丽丝，我翻过你那三卷《代价簿》的前几十页。"
    mc "帮人找猫，代价是三颗柠檬糖；帮人调解社团矛盾，代价是替走廊绿萝浇水一周；就连刚才这么折腾一通，你也分文没收高社长的社团经费。"
    alice "干嘛突然查本社长的财务报表呀，『嘴』先生？柠檬糖也是很珍贵的硬通货好不好！"

    menu:
        "望着夕阳下艾丽丝微微闪烁的侧脸，我决定怎么接这句话？"

        "「你根本不是为了收报酬，而是怕受助的人觉得亏欠吧。」":
            $ add_favor("alice", 3)
            alice "……啧，侦探的搭档当久了，连本社长的老底都敢拆穿啦？"
            "艾丽丝没有回头，只是用食指轻轻摩挲着《代价簿》被翻得微微起毛的烫金边角，声音比平时轻柔了许多。"

        "「这大概是我见过全世界最亏本、也最温柔的一本账簿了。」":
            $ add_favor("alice", 3)
            alice "喂喂，当着墨墨的面夸得这么直白，就算是我也会不好意思的呀！"
            "艾丽丝耳尖微红地轻咳了一声，把下巴抵在厚厚的账本封皮上，眼底却漾开了一层柔和的碎金。"

    scene bg agency
    $ set_ambient("dusk")
    show alice smile at left
    show mo smile at right
    with dissolve

    alice "四年前……我第一次在图书馆角落坐到墨墨旁边的时候，这孩子连我递过去的一块橡皮、一把雨伞都不敢接。"
    alice "因为对那时候的她来说，别人毫无保留的善意太重了。重到她总觉得自己还不起，一旦接过来，万一哪天辜负了对方，就会变成新的伤口。"
    show mo sad at right
    "墨墨轻轻垂下眼睫，伸出手，用两根手指悄悄勾住了艾丽丝制服袖口的一角。"
    show alice happy at left
    show mo smile at right
    alice "所以我那天晚上跑去文具店买了第一本《代价簿》，第二天拍在桌子上告诉她——『听好了，本小姐可不是白白帮你的！借一次伞要帮我抄半页英语单词，吃一块饼干要帮我找三本书！』"
    alice "只要把所有不好意思开口的温柔，都明码标价写成一颗糖、一次浇水、一回修书壳的小小交易，大家就可以理直气壮地互相麻烦、理直气壮地并肩待在一起了。"

    play sound se_write
    "墨墨低下头，在牛皮纸笔记本最新的一页认真写下了一行字，这一次没有只推给我，而是双手捧着举到了艾丽丝面前。"
    mo_note "第 1 页到第 129 页，最划算的人一直是我。谢谢你，艾丽丝。"

    show alice blush at left
    alice "呜……墨墨你犯规！今天明明是小林结账的日子，怎么连你也开始煽情了！"
    play sound se_page
    "艾丽丝飞快地眨掉眼角一点亮晶晶的湿意，啪地翻开《代价簿》第 130 页的新空白纸，把钢笔塞进我手里。"
    show alice happy at left
    alice "好啦好啦，趁天还没全黑，张记关东煮今晚萝卜半价！第 130 号账目——陈默负责拎包，墨墨负责挑位置，本社长负责请客！谁也不准赖账！"
    mc "遵命，社长大人。"

    "黄铜风铃在晚风里清脆地响了一声。"
    "锁上门之前的最后一缕夕阳落在桌上摊开的《代价簿》上——第 47 页旁画上了一枚小小的红色勾号，而在长长的账目尽头，三个人的影子正并排融进温暖的暮色里。"

label dlc_alice_ledger_end:
    hide screen evidence_book
    $ set_ambient("clear")
    $ stop_bgm(fadeout=1.8)
    $ persistent.dlc_alice_done = True
    $ ach_grant("ach_dlc_alice")
    scene bg black with fade
    centered "{size=+6}—— 番外一《艾丽丝的代价账本》 · 完 ——{/size}\n\n{color=#f4d98a}每一份难以启齿的善意，都在她的账本里找到了最轻盈的重量。{/color}"
    return


################################################################################
## 番外二：《旧书街与第三只千纸鹤》（TRUE END 后日谈）
################################################################################

label dlc_mo_bookstreet:
    $ full_run = False
    $ save_name = "番外二 · 旧书街与第三只千纸鹤"
    $ chapter_reached = 6
    $ mo_favor = 100
    $ alice_favor = 30
    $ fail_count = 0
    $ intuition = 3
    $ evidence = []
    $ inspected_evidence = []
    $ expanded_evidence = ""
    $ reset_combine_state()

    scene bg black
    with fade
    $ play_bgm(bgm_warm, fadein=2.0)
    centered "{size=+8}番外短篇 · 二（TRUE END 后日谈）{/size}\n\n{size=+14}旧书街与第三只千纸鹤{/size}\n\n{color=#cbb0e6}次年深秋 · 周六午后 · 梧桐旧书街{/color}"

    scene bg street at bg_kenburns_out
    $ set_ambient("warm")
    show screen evidence_book
    with dissolve

    "十一月末的周六午后，阳光穿过两侧金黄透亮的法国梧桐树冠，在青石板人行道上筛落满地细碎的暖光。"
    "离旧教学楼那场尘埃落定的对峙已经过去了好几个月。高二学年的期中考刚结束，艾丽丝去参加学生会社团联席会了，张子谦被家里抓去看店，于是今天的梧桐旧书街市集，就成了只属于我和墨墨两个人的周末约定。"

    show mo smile at center
    "走在半步前的少女穿着米白色的针织开衫，怀里不再像从前那样死死竖着厚书挡住半张脸，只在帆布斜挎包里露出半截熟悉的牛皮纸笔记本边角。"
    "一阵带着炒栗子甜香的秋风吹过，她停下脚步转过身，把被风吹到唇边的一缕发丝别回耳后。"

    mo "……陈默，前面拐角那家绿色雨棚下面的，就是向叔叔推荐过的『槐荫旧书摊』吧？"

    "哪怕已经听过许多次，每次听见她真正发出声音，我的心跳还是会不争气地漏掉半拍。"
    "那是一道很轻、很干净的声音，像初春刚融化的溪水漫过鹅卵石，因为阔别了整整四年，尾音总带着一点点认真斟酌的慢拍。"

    mc "对，就是那家。听说摊主是一位退休的老语文教师，周末才会把私藏的旧译本摆出来。"
    show mo blush at center
    "墨墨顺着我的目光看了一眼自己的帆布包，有点不好意思地弯起眼睛笑了笑。"
    mo "刚才在公交站看路牌的时候，手还是下意识摸向包里的笔记本了……摸到封皮才反应过来，现在直接喊你的名字就可以。"
    mc "慢慢来嘛，反正不管你是写在本子上还是亲口说出来，你的第一听众永远都在旁边。"
    show mo happy at center
    mo "嗯……那今天下午，我要争取把笔记本一直留在包里，一句话都不偷懒。"

    scene bg booksigning
    $ set_ambient("warm")
    show mo neutral at right
    with dissolve

    play sound se_page
    "旧书市集沿着老街骑楼一字排开，空气里浮动着令人安心的陈年纸浆味与阳光晒过木书架的清香。"
    "墨墨在一排按年代摆放的外国诗歌与书信集前蹲下身，手指轻轻拂过一排烫金略微斑驳的布面书脊，很快停在了一册薄薄的《秋日信札》上。"

    show mo shock at right
    play sound se_page
    "她翻开扉页时，一枚压得平平整整的金黄银杏叶书签顺着书页滑落到掌心里。"
    "银杏叶下方的衬纸上，留着老摊主用钢笔写下的一行小字谜语与赠言："
    centered "{color=#f4d98a}「给翻开第 88 页的有缘人：若能念出这一页划横线的那句话，这枚书签便随书相赠。」{/color}"

    show mo blush at right
    "墨墨翻到第 88 页。在家里、在万事屋或者只有我们两个人的河堤上，她已经能很自然地低声交谈；可此刻周围还有三四个正在挑书的陌生读者。"
    "她的指尖轻轻捏着书页边缘，呼吸微不可察地屏住了一瞬，像是在跟四年来残留在身体里的小小怯意做拔河。"

    $ add_evidence("旧诗集里的银杏叶铅笔书签")

    menu:
        "看着墨墨站在旧书摊前微微抿起嘴唇的模样，我打算怎么做？"

        "不动声色地侧身半步，替她挡开旁人投来的视线，轻声陪她一起念开头两个字":
            mc "『我们曾隔着漫长的冬夜相望——』"
            show mo smile at right
            "听到我压低声音起头的那一秒，墨墨紧绷的肩膀一下子松弛下来。她抬起眼睫看着我，声音清亮而温柔地接上了后半句："
            mo "『——直到春风替沉默的枝桠，说出第一朵花的名字。』"

        "安静微笑着向她点点头，用眼神告诉她：不用急，不管读得多轻我都能听见":
            "我没有催促，也没有替她抢答，只是像从前无数次等她写完笔记那样，安静而笃定地注视着她。"
            show mo smile at right
            "三秒钟后，墨墨深深吸了一口气，清澈柔和的嗓音一字一句落进秋日午后的风里："
            mo "『我们曾隔着漫长的冬夜相望，直到春风替沉默的枝桠，说出第一朵花的名字。』"

        "指指银杏书签背面的墨水年份，先用万事屋的默契逗她放松下来":
            mc "墨大侦探你看，这枚书签用的是蓝黑铁胆墨水，边缘刚泛褐不到半年，摊主老先生肯定就在躺椅上偷偷听着呢。"
            show mo happy at right
            "墨墨扑哧一下轻笑出声，刚才那点紧张瞬间烟消云散。她清了清嗓子，大大方方地朗声念出了第 88 页的那行诗："
            mo "『我们曾隔着漫长的冬夜相望，直到春风替沉默的枝桠，说出第一朵花的名字。』"

    "坐在竹躺椅上假寐的白发老先生笑呵呵地睁开眼，朝我们竖了竖大拇指，挥手示意那枚银杏书签归这位声音好听的小姑娘了。"
    show mo blush at right
    mo "……读出来了。在陌生人旁边开口，原来也没有想象中那么可怕。"
    mc "不仅不可怕，刚才老先生夸你声音好听的时候，某人耳朵都红透了。"
    mo "陈、陈默……不许盯着耳朵看。"

    play sound se_rain
    "她话音刚落，原本晴朗的半边天空忽然飘过一朵亮晶晶的云，紧接着，细密透亮的太阳雨毫无预兆地淅淅沥沥落了下来。"
    "豆大的雨点敲在梧桐叶与旧书摊的帆布棚上，激起一阵清脆欢快的沙沙声。"
    mc "是太阳雨！前面巷口正好绕回张阿姨的关东煮店，快，抓紧我手腕！"

    scene bg oden
    $ set_ambient("warm")
    play sound se_bell
    show mo happy at left
    show zhangma shock at right
    with dissolve

    "我们一路小跑冲进熟悉的暖黄灯笼屋檐下时，店里正飘着昆布高汤与白萝卜炖煮的浓郁香气。"
    "正在擦桌子的张子谦刚想嚷嚷『重色轻友的家伙怎么撞上门了』，却见墨墨站在冒着白汽的木格汤锅前，双手规规矩矩地交叠在身前，认真地朝柜台里开了口："

    show mo smile at left
    mo "张阿姨，下午好……我们要两份热汤，一串白萝卜、两串昆布，还有一串鱼籽福袋，谢谢您。"

    "木勺停在了半空中。"
    "整个高一学年，墨墨每次来张记关东煮，都是安安静静坐在角落里，由我或者艾丽丝替她报菜名，走的时候再朝张阿姨鞠一躬。"
    show zhangma happy at right
    "张阿姨愣了足足两秒，眼圈肉眼可见地红了一圈，连忙在围裙上擦了擦手，连声应道："
    zhangma "哎！哎！听见了，阿姨听得清清楚楚的！今天这锅萝卜最甜了，阿姨再多送你们两串魔芋丝，快坐下暖和暖和！"

    hide zhangma
    show zhang smile at right
    zhang "行啊你们俩，逛个旧书街都能赶上太阳雨包场。我去后厨帮我妈切萝卜，前厅留给你们清静！"
    hide zhang
    show mo smile at center
    with dissolve

    "外头的太阳雨还在屋檐下织着金色的细线，店堂角落的木桌上摆着两碗热气袅袅的关东煮。"
    "墨墨捧着温热的粗陶茶杯，肩头发梢沾着两颗细小的雨珠，正歪着头听收音机里流淌出的轻柔钢琴曲。"

    menu:
        "看着窗边雾气氤氲里温柔安静的墨墨，我决定做点什么？"

        "解下自己干爽的格子围巾，轻轻绕到她微凉的颈间":
            show mo blush at center
            "柔软的羊毛围巾拢住她纤细脖颈的瞬间，墨墨微微缩了一下肩膀，把半张脸埋进带着淡淡皂角香的围巾绒毛里。"
            mo "好暖和……这样围着的话，待会儿雨停了走去河堤，你不会冷吗？"
            mc "围巾这么长，出门的时候一人分一头刚刚好。"
            show mo happy at center
            mo "……嗯。那就说好了，一人一半，谁也不松开。"

        "用干净手帕替她擦掉发梢的雨珠，再把自己碗里最入味的半块白萝卜夹给她":
            show mo blush at center
            "手帕轻轻按过她耳侧发丝时，墨墨乖巧地微微仰起脸，长长的睫毛轻轻颤动了一下。"
            mo "明明刚才跑过来的时候，你把外套举在我头顶，淋得更多的是你右边肩膀呀。"
            "她夹起碗里那颗鼓鼓囊囊的鱼籽福袋，小心翼翼放到我的小碟子里，嘴角弯起一点点促狭又认真的弧度。"
            show mo smile at center
            mo "按照艾丽丝《代价簿》的算法……半块萝卜，要用一整颗福袋来抵。"

    $ stop_bgm(fadeout=1.2)
    scene bg riverside at bg_kenburns_out
    $ set_ambient("dusk")
    $ play_bgm(bgm_te, fadein=1.8)
    show mo smile at center
    with dissolve

    "太阳雨来得快去得也快。等我们沿着湿漉漉的石阶走上河堤时，雨后初霁的晚霞已经把整条云溪河染成了瑰丽的琥珀橘与淡紫色。"
    "长椅被雨水洗得干干净净，我垫上宣传单，和墨墨并肩坐了下来。"

    mo "陈默，你还记得……转学第一天，你在图书馆折给我的那只千纸鹤吗？"
    mc "怎么可能忘。当时手忙脚乱撕了作业纸，翅膀折得一边高一边低，丑得我自己都不好意思看。"
    show mo happy at center
    mo "一点都不丑。那是我四年里收到的第一只、没有问我『为什么不说话』，只是单纯想对我说『对不起』和『谢谢你』的纸鹤。"
    show mo neutral at center
    mo "后来在旧仓库之后，我给你折了第二只千纸鹤，替我装满了四年没来得及说出口的话。"

    play sound se_page
    "墨墨低头打开帆布斜挎包——今天一整天她真的信守承诺，一次也没有拿出牛皮纸笔记本代替说话；此刻她从夹层里取出来的，是一张裁成正方形的淡紫色信纸。"
    show mo blush at center
    mo "所以今天出门前，我一直在想……我们已经有了第一只代表『相遇』的纸鹤，也有了第二只代表『回应』的纸鹤。"
    mo "现在，我想和你一起折第三只。"

    scene cg secondcrane with dissolve
    $ set_ambient("dusk")
    play sound se_crane
    "晚霞的余晖落在长椅中央那张淡紫色的方形信纸上。"
    "墨墨把信纸铺在两人掌心之间——我折下左边的对角与鹤翼，她的手指便紧挨着我的指节，细致而轻柔地折好右边的鹤翼与尖尖的鹤喙。"
    "两双手在温暖的暮色里碰在一起，没有谁替谁代言，也没有谁躲在沉默背后。"

    menu:
        "在吹鼓第三只千纸鹤之前，我想亲口对墨墨许下哪一句约定？"

        "「以后无论晴天还是骤雨，你想说的话、想看的风景，我都陪你慢慢走完。」":
            mo "……嗯！"
            "墨墨轻轻握住那只左翼微宽、右翼秀气的淡紫千纸鹤，抬起头望进我的眼睛里，声音清晰得没有一丝阴霾："
            mo "我也答应你，陈默。以后开心的时候、难过的时候、想见你的时候……我都会第一时间亲口喊你的名字。"

        "「前两只千纸鹤装过了过去与秘密，这第三只，只装我们明天的日常。」":
            mo "明天的日常……我很喜欢这个词。"
            "墨墨用指尖轻轻碰了碰千纸鹤微扬的翅膀，眼底映着漫天晚霞与粼粼波光，弯起唇角轻声说道："
            mo "明天周日，下周一早读，还有以后许多个春天和秋天……陈默，请多指教。"

    $ add_evidence("两人合折的第三只淡紫千纸鹤")

    scene cg reunion with dissolve
    "河堤下的晚风带着雨后青草的芬芳拂过水面。"
    "少女不再用书本遮挡面庞，也不必再低头寻找纸笔。在归鸟掠过金色云层的黄昏里，她与身旁的人十指相扣，轻声聊着刚买下的旧诗集、聊着下周万事屋的红茶，一直走到华灯初上的街口。"

label dlc_mo_bookstreet_end:
    hide screen evidence_book
    $ set_ambient("clear")
    $ stop_bgm(fadeout=2.0)
    $ persistent.dlc_mo_done = True
    $ ach_grant("ach_dlc_mo")
    scene bg black with fade
    centered "{size=+6}—— 番外二《旧书街与第三只千纸鹤》 · 完 ——{/size}\n\n{color=#cfa6f0}沉默侦探与她的搭档，正在有声的岁月里续写新的每一页。{/color}"
    return
