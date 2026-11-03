## 间章「日常的一天」
## interlude.rpy
## 位置：第三章（周日）之后、第四章（周二讲座前夜 → 周三讲座）之前的周一。
## 功能：节奏缓冲。三场纯日常——食堂二楼的午餐、图书馆贴磁条的"委托"、雨夜的伞。
##       不推进案件，只推进人。可读取前几章标记；新增标记见下。

default il_umbrella_shared = False   # 周一雨夜与墨墨共用了一把伞（终章后日谈可提一句）
default il_canteen_treat  = False    # 周一接受了班长的食堂二楼请客（演出用）
default il_first_case     = False    # 间章零：主角第一次独立"说出"一个委托的答案（演出用）


################################################################################
## 间章零「万事屋的第一天」—— 转学第二天（周二）
## 位置：第一章（周二清晨找旗子）之后、第二章（周三恐吓信）之前。
## 三场：万事屋的午饭与账本 · 小卖部阿姨的"每周二少二十块" · 张记的晚饭
################################################################################

label interlude0:

    $ intuition = 3
    scene bg black with fade
    stop music fadeout 1.0
    centered "{size=44}间章{/size}\n\n{size=28}「万事屋的第一天」{/size}"
    with dissolve

    # ═══════════════════════════════════════════════════════════════
    # 一、中午 · 万事屋 · 账本
    # ═══════════════════════════════════════════════════════════════
    scene bg black with fade
    centered "{size=28}十月二十二日 · 周二 · 中午{/size}"
    scene bg agency with fade
    play music bgm_daily fadein 1.5 fadeout 1.5
    narrator "入社第一天的中午，艾丽丝说：“万事屋的人，中午在万事屋吃。”她说这是规矩。我后来发现，万事屋的规矩全是她当场编的。"
    show alice happy at right with dissolve
    show mo neutral at center with dissolve
    narrator "会议桌上摆着三份午饭。艾丽丝的是她爸店里的碱水面包，墨墨的是一个很小的便当盒，我的是咖喱——第三天的咖喱。"
    alice "咖喱。你昨天也是咖喱？"
    mc "一锅三天。今天最后一顿。"
    alice "明天呢？"
    mc "明天……再做一锅。"
    narrator "艾丽丝看着我，像看一个需要被“化不可能为可能”的委托。墨墨的书抬了一下。"
    alice "好了不说这个。“嘴”，你入社了，有一件事必须知道——账本。"
    play sound se_page
    scene cg agency with dissolve
    narrator "她从抽屉里抽出一本厚厚的本子，封面上写着“万事屋 · 代价簿”。翻开，每一页一个委托，每一行一个代价。"
    alice "一百二十三个委托，一百二十三个代价。每一个都记着。谁欠我们什么，我们欠谁什么。"
    mc "“我们欠谁”？"
    alice "当然。小卖部阿姨每周留一盒巧克力给我们，我们欠她。门卫大叔替我们收社旗，我们欠他。"
    alice "欠的东西，要还。这才是万事屋。不是我们帮人，是大家互相搭把手。"
    narrator "她翻到最新的一页。上面写着：“第一百二十三号 · 找旗子 · 已结 · 代价：新人入社。”"
    narrator "旁边有一片很小的雪花。是今天早上画的。"
    mo_note "你的名字，写上去。"
    narrator "墨墨把本子推到我面前，又把笔推过来。"
    narrator "我在那一行的末尾写了自己的名字。写得歪歪扭扭。旁边艾丽丝圆滚滚的字、墨墨细细的字，衬得我的字像一个闯进来的人。"
    alice "好。从今天起，代价簿上有你的字了。以后每一个案子，“嘴”负责在最后写一句话——“答案是什么”。"
    mc "……为什么是我写？"
    alice "因为墨墨写的答案，只有她自己看得懂。我写的答案，太长。你写的——"
    narrator "她看了看我那行歪歪扭扭的名字。"
    alice "——很短。适合当结论。"
    narrator "墨墨的书后面传来一声很轻的气音。她在笑。"

    play sound se_bell
    scene bg agency with dissolve
    show alice happy at right with dissolve
    show mo neutral at center with dissolve
    narrator "吃到一半，铃铛响了。门口站着一个人，围裙上沾着面粉，手里拎着一袋巧克力。"
    show ayi neutral at left with moveinleft
    ayi "艾丽丝！这周的巧克力。还有——我有个事儿想问问你们。"
    show alice neutral at right
    alice "周阿姨？您坐。什么事？"
    narrator "小卖部阿姨。张子谦说过，姓周，下午三点以后面包打折。她在门口的椅子上坐下，把巧克力放在桌上。"
    show ayi sad at left
    ayi "我那小卖部，每个星期二，收银盒都少二十块。不多不少，二十。连着四个星期了。"
    ayi "我数了又数，账对不上。别的日子一分不差，就星期二。我怕是哪个学生……"
    narrator "她没有说下去。可屋里的人都听懂了。"
    alice "四个星期二，每次二十？"
    ayi "对。今天又是星期二。我一早就盯着，一个人都没敢放松。可我心里还是发慌。"
    show mo think at center
    narrator "墨墨放下了书。她在本子上写了三个问题，推给我。她没有推给阿姨——她推给我。"
    mc "（……她让我问。）"
    mc "周阿姨，我问三个问题。星期二有什么特别的？您店里星期二进什么货？谁星期二固定来买东西？"
    ayi "特别的……星期二我进烟。就一条，给门口的老刘。别的没什么。"
    ayi "固定来的……老刘啊。门卫刘大爷。他每周二下午来拿烟。"
    mc "他付钱吗？"
    ayi "付啊。当然付。二十块一包——"
    narrator "她说到这里，停住了。屋里安静了两秒。"
    show ayi shock at left
    ayi "二十块。"
    narrator "墨墨的笔在纸上又写了一行，推过来。我看了一眼，念出来。"
    mc "他是不是每周二拿了烟，说“下周给”，然后下周三一起给？"
    ayi "……对。他说“周三发工资”。每周三他来，给我四十——上周的和这周的。"
    ayi "所以每周二……少二十……是因为他拿了烟还没给……然后周三给的时候，我记在周三的账上……"
    narrator "她的脸从白变成红。然后她拍了一下大腿。"
    show ayi happy at left
    ayi "哎呀！我这个脑子！我把老刘的烟钱记成周三的收入，周二当然少二十！这四个星期我天天怀疑学生……"
    show alice happy at right
    alice "案子结了。周阿姨，代价——"
    ayi "巧克力！下周两盒！"
    alice "成交。"
    hide ayi with moveoutleft
    narrator "阿姨拎着围裙走了，走到门口还在念“我这个脑子”。铃铛响了一声。"
    narrator "艾丽丝把代价簿翻到新的一页，写下“第一百二十四号 · 每周二少二十 · 已结 · 代价：巧克力 ×2”。然后她把笔递给我。"
    alice "结论。写。"
    narrator "我看着那一行。想了一会儿。然后我写了六个字。"
    show layer master at cam_zoom_in
    narrator "“不是偷。是记错。”"
    show layer master at cam_reset
    narrator "墨墨看了一眼，在旁边画了一片很小的雪花。"
    $ il_first_case = True
    mc "（第一百二十四号。我说出来的第一个答案。）"
    mc "（虽然问题是她写的。可念的人是我。结论也是我写的。）"
    hide alice with dissolve
    hide mo with dissolve

    # ═══════════════════════════════════════════════════════════════
    # 二、放学 · 校门口 · 门卫刘大爷
    # ═══════════════════════════════════════════════════════════════
    scene bg gate with fade
    narrator "放学的时候，我们三个人路过门卫室。艾丽丝说，案子结了，得跟“当事人”打个招呼——万事屋的规矩。又一条当场编的。"
    show alice neutral at right with dissolve
    show mo neutral at center with dissolve
    "刘大爷" "艾丽丝？又要收旗子？"
    alice "不是。刘大爷，您每周二在周阿姨那儿拿烟，周三才给钱——"
    "刘大爷" "……她跟你们说了？我跟她说好了的！周三发工资！"
    alice "她没怪您。她怪自己记错账。可您把她吓了四个星期，她以为有学生偷钱。"
    narrator "刘大爷愣住了。他放下手里的茶杯，站起来。"
    "刘大爷" "……四个星期？她一直在怕？"
    alice "嗯。"
    "刘大爷" "那我……我现在就去给她。以后不欠了，当天给。"
    narrator "他真的从口袋里掏出二十块钱，往小卖部走。走了两步，回头。"
    "刘大爷" "那个——你们万事屋，帮她查的？"
    alice "是他查的。"
    narrator "她指了指我。刘大爷看了看我，又看了看墨墨。"
    "刘大爷" "……新来的？就是昨天被王老师按倒那个？"
    mc "……是我。"
    "刘大爷" "行。以后晚上七点以后走大门，我给你留门。不用登记。"
    narrator "他说完就走了。艾丽丝叉起腰。"
    alice "看见没。代价簿上又多一条——“刘大爷 · 留门”。这是我们欠他的。"
    mc "我以为是他欠我们的。"
    alice "他给了我们一件我们要不到的东西。那就是我们欠他。"
    narrator "墨墨在本子上写了一行字，举起来。"
    mo_note "她说的规矩，一半是编的。这一条是真的。"
    narrator "艾丽丝“嘿”了一声，作势要抢她的本子。墨墨把本子抱到胸口，书抬到脸前面。两个人在校门口闹了一会儿。"
    narrator "我站在旁边看。这是我第一次看见墨墨“闹”。没有声音，可她的肩膀在抖。"
    mc "（她在这两个人中间，是会笑的。）"
    hide alice with dissolve
    hide mo with dissolve

    # ═══════════════════════════════════════════════════════════════
    # 三、晚上 · 张记 · "体检"
    # ═══════════════════════════════════════════════════════════════
    scene bg oden with fade
    stop music fadeout 1.0
    play music bgm_warm fadein 2.0
    centered "{size=28}同日 · 晚上六点半 · 张记关东煮{/size}"
    narrator "张阿姨说的“体检”，就是把我按在柜台前的高脚凳上，从头到脚看一遍，然后往我碗里堆东西。"
    show zhangma neutral at left with dissolve
    show zhang neutral at right with dissolve
    zhangma "瘦了。昨天到今天，瘦了。"
    mc "……阿姨，一天瘦不了。"
    zhangma "阿姨说瘦了就是瘦了。吃。"
    narrator "碗里已经有三块萝卜、两个鸡蛋、一串鱼丸和一块我叫不出名字的东西。张子谦在旁边串丸子，肩膀在抖。"
    zhang "哥们儿，今天怎么样？“嘴”的第一天。"
    mc "破了一个案子。小卖部每周二少二十块。"
    zhang "周阿姨那个？我早就知道，是老刘赊烟。"
    mc "你早知道你不说？"
    zhang "没人问我啊。你们万事屋不是有那个不说话的大侦探吗，哪用得着我。"
    narrator "张阿姨的勺子在锅里搅了一下。"
    zhangma "对了小默，那姑娘吃不吃萝卜？子谦早上说让你问。"
    mc "……还没问出来。她今天没跟我说几句话。"
    show zhangma smile at left
    zhangma "她不说话，你问她干什么。你带一份给她吃，吃了就是吃，不吃就是不吃。这还用问？"
    narrator "我怔在原地。张子谦停下了串丸子。"
    zhang "妈，你这话有水平。"
    zhangma "阿姨开店二十年，什么人没见过。不说话的人，看他吃什么就行。"
    narrator "她说着，从锅里捞出一大块萝卜，放进一个干净的保温盒。"
    zhangma "明天带去。甜的。要是她不吃，后天带咸的。总有一种她吃。"
    mc "……谢谢阿姨。"
    show zhangma neutral at left
    zhangma "谢什么。阿姨就想知道一个事——那姑娘，四年不说话，她饿不饿？"
    narrator "四年不说话，她饿不饿。我从没想过这个问题。所有人都在想她为什么不说话。没有人问过她饿不饿。"
    mc "我明天问。用萝卜问。"
    show zhangma smile at left
    zhangma "对。用萝卜问。"

    menu:
        "张阿姨把保温盒推过来。张子谦忽然问：“哥们儿，你为什么答应当那个‘嘴’？”"
        "老实说：“因为念她写的字的时候，我不怕。”":
            $ add_favor("mo", 2)
            mc "……因为念她写的字的时候，我不怕。我自己说话会怕。念她的，不怕。"
            narrator "张子谦看着我。张阿姨的勺子停了。"
            zhang "……哥们儿，你这话说得比你那本咖喱还老实。"
            zhangma "怕什么？说错？你爸也是这样。"
            mc "……大概吧。"
            zhangma "那你就先念她的。念着念着，自己的话就出来了。阿姨见过这样的人。"
            hide zhangma with dissolve
            narrator "她说完就去后厨了。张子谦把一串丸子放进我碗里。"
            zhang "行。哥们儿懂了。你不是替她说话。你是借她的话，练自己的嘴。"
            mc "……闭嘴。"
            zhang "看，会自己说了。"
        "打哈哈：“代价。艾丽丝逼的。”":
            $ add_favor("alice", 1)
            hide zhangma with dissolve
            mc "代价。艾丽丝逼的。不当“嘴”就得当“脸”。"
            zhang "什么是“脸”？"
            mc "替万事屋跟教务处赔笑脸的那个。"
            zhang "那确实还是“嘴”好。"
            narrator "张阿姨在后厨笑出了声。"
        "反问：“那你为什么天天给我带萝卜？”":
            hide zhangma with dissolve
            mc "那你为什么天天给我带萝卜？"
            zhang "……我妈让的。"
            mc "你妈让你带三年？"
            zhang "……"
            narrator "他低头串丸子，串得飞快。张阿姨在后厨说了一句“两个傻孩子”。"

    hide zhang with dissolve
    narrator "七点半，我拎着保温盒回家。街上的路灯一盏一盏亮着。保温盒是热的，热得手心发烫。"
    scene bg home with dissolve
    narrator "回到家，开灯，开窗。我把保温盒放在餐桌上，放在那本《美丽新世界》旁边。"
    narrator "然后我拿出笔记本，翻到昨晚写的那一页。“十月二十一日。她等了我一小时四十分钟。”"
    narrator "我在下面写了今天的。"
    narrator "“十月二十二日。第一百二十四号。不是偷，是记错。”"
    narrator "写完，我看了一遍。想了想，又加了一行。"
    narrator "“她饿不饿？明天问。”"

    scene bg sunset with fade
    centered "{size=50}间章 · 完{/size}\n\n{size=28}第二章「天台上的恐吓信」{/size}"
    with dissolve

    jump chapter2


label interlude1:

    $ intuition = 3
    scene bg black with fade
    stop music fadeout 1.0
    centered "{size=44}间章{/size}\n\n{size=28}「日常的一天」{/size}"
    with dissolve

    # ═══════════════════════════════════════════════════════════════
    # 一、周一 · 食堂二楼 · 班长的请客
    # ═══════════════════════════════════════════════════════════════
    scene bg black with fade
    centered "{size=28}十月二十八日 · 周一 · 中午{/size}"
    scene bg canteen with fade
    play music bgm_daily fadein 1.5 fadeout 1.5
    narrator "食堂二楼。十二点零五分，整个云溪高中一半的人都在这里。餐盘碰撞的声音、椰奶的甜味、窗口阿姨的吼声——像一场每天都要开一次的集市。"
    narrator "我们坐在靠窗的角落。三个人。班长，墨墨，我。"
    narrator "这是班长的请客。她说过要请的。她把两张餐券攥在手里攥了三天，今天终于用掉了。"
    show banzhang happy at left with dissolve
    show mo neutral at right with dissolve
    banzhang "二楼的咖喱饭是全校最好吃的。真的。我吃了一年半，别的都不点。"
    banzhang "你们别看我。我知道我请客还只点咖喱有点小气。可这是我最喜欢的。请人吃自己最喜欢的，才算请客吧？"
    mc "我家天天吃咖喱。"
    banzhang "啊？"
    mc "自己做的。一锅能吃三天。"
    narrator "班长愣了一下。然后她笑了，笑得有点尴尬，又有点释然。"
    banzhang "那你今天可以尝尝别人做的。"
    narrator "墨墨的餐盘上是一小碗汤面。她说她中午吃不了太多——用本子写的。可她把班长给她的那块咖喱鸡肉，夹进了自己的碗里。"
    narrator "食堂很吵。墨墨坐在这样的地方，书抬到了脸前面，只露出眼镜。班长看了她一眼，声音低了一点。"
    banzhang "……太吵了吗？我可以换个地方。"
    narrator "墨墨摇头。她翻开本子，写了一行，推到桌子中央。"
    mo_note "习惯了。四年。"
    banzhang "四年？你每天中午都在这儿吃？"
    mo_note "不。在图书馆。今天是第一次。"
    narrator "班长看着那行字，手里的勺子停住了。"
    banzhang "第一次在食堂吃饭？在云溪？"
    narrator "墨墨点了一下头。"
    narrator "班长把勺子放下。她看了看四周——三百个人的餐厅，一个四年来第一次坐进来的人。"
    banzhang "那我……我点得太随便了。早知道我应该——"
    scene cg banzhang_curry with dissolve
    mo_note "咖喱很好。"
    narrator "三个字。班长看着它，眼睛忽然有点红。她拿起勺子，很用力地吃了一大口。"
    banzhang "……好。那明天也来。我请。"
    mo_note "不用请。"
    banzhang "那你来吗？"
    narrator "墨墨看着她。然后她写了一个字。"
    mo_note "……来。"
    scene bg canteen with dissolve
    show banzhang happy at left
    show mo neutral at right

    menu:
        "餐盘里还剩一块咖喱鸡肉，是班长多给的。你——"
        "夹给墨墨：“你那碗面太清了。”":
            $ add_favor("mo", 2)
            mc "你那碗面太清了。这块给你。"
            narrator "我把那块鸡肉夹进她的碗里。她看着它，看了两秒，然后拿起筷子，吃了。"
            narrator "她吃东西的时候还是那样，很慢，像在完成一道工序。可她吃完以后，在本子上写了一行。"
            mo_note "……比张阿姨的萝卜咸。"
            mc "那是食堂。"
            mo_note "可以。"
            narrator "“可以”。在她的字典里，这已经是很高的评价了。班长在旁边偷笑。"
        "自己吃掉：“班长请的，不能浪费。”":
            $ add_favor("alice", 1)
            mc "班长请的，不能浪费。"
            narrator "我把鸡肉吃了。班长满意地点头。墨墨的书抬了一点——她大概在想“这人真是什么都吃”。"
        "留在盘里，不好意思动":
            mc "……"
            narrator "我没有动那块鸡肉。它在盘里慢慢凉了。班长看了一眼，什么都没说，把它夹回了自己碗里。"
            narrator "墨墨在本子上写了一行，没有推给任何人。我瞄了一眼——“浪费”。"

    $ il_canteen_treat = True
    show zhang happy at center with moveinleft
    zhang "哟——三位，这么巧。"
    narrator "张子谦端着餐盘挤到我们桌边，一屁股坐下。他的餐盘上是两份咖喱饭。"
    mc "你怎么在这儿？三班不是在一楼？"
    zhang "一楼的咖喱是二楼剩下的。哥们儿懂行。"
    narrator "他说着，朝班长点了一下头，又朝墨墨点了一下头。墨墨的书抬了一点。这是她第一次和张子谦同桌。"
    zhang "墨墨同学。哥们儿正式介绍一下——张子谦，三班，他发小，张记关东煮少东家。"
    zhang "我妈让我问你：萝卜，甜的还是咸的？她这两天在纠结。"
    narrator "墨墨看着他。然后她翻开本子，写了两个字。"
    mo_note "甜的。"
    zhang "行。我妈说了，你说甜，以后全店的萝卜都甜。"
    show banzhang neutral at left
    banzhang "全店？"
    zhang "我妈这人，认准了谁，就认准了。"
    narrator "墨墨的耳朵尖红了。她把书抬到了脸前面。张子谦满意地开始吃他的第一份咖喱。"
    zhang "对了，班长。你们班值日表是不是又出问题了？我听说上周有一天没人擦黑板。"
    banzhang "……你怎么连这个都知道。"
    zhang "小卖部阿姨。"
    banzhang "唉。四十六个人，八个岗位，每周轮一次。我排了一年半，总有人重复，总有人漏。"
    narrator "她说得很苦恼。这大概是一个班长真正的日常——不是被冤枉，不是恐吓信，是排不平的值日表。"
    narrator "墨墨忽然把书放下了。她把本子翻到一页新的，写了一行。"
    mo_note "值日表给我看一下。"
    banzhang "啊？现在？"
    narrator "班长从书包里掏出那张皱皱的值日表。墨墨接过去，看了三十秒。然后她在本子上画了一个格子，写了一串数字。"
    mo_note "四十六除以八，余六。你按八个一组轮，多出来六个人永远在同一个位置重复。"
    mo_note "改成每周往后错一位。四十六周一循环，三年刚好。谁都不重复，谁都不漏。"
    narrator "班长看着那个格子。看了很久。"
    banzhang "三十秒。我排了一年半。"
    mo_note "你排的时候在想别的事。"
    banzhang "……什么事？"
    show layer master at cam_zoom_in
    mo_note "想每个人会不会不高兴。"
    show layer master at cam_reset
    narrator "班长一时怔住。然后她低下头，很小声地说了一句“是”。"
    narrator "墨墨把那张值日表推回去。张子谦吹了一声口哨。"
    zhang "哥们儿，你这搭档，管闲事的水平比你高。"
    mc "……闭嘴，吃你的咖喱。"
    narrator "食堂还是很吵。可我们这一桌，四个人，一碗面，三份咖喱，一张值日表。这是我转学以来，第一顿有四个人的午饭。"
    hide zhang with dissolve
    hide banzhang with dissolve
    hide mo with dissolve

    # ═══════════════════════════════════════════════════════════════
    # 二、周一放学 · 图书馆 · 贴磁条
    # ═══════════════════════════════════════════════════════════════
    scene bg black with fade
    centered "{size=28}同日 · 放学后 · 图书馆{/size}"
    scene bg library with fade
    play music bgm_suspense fadein 1.5 fadeout 1.5
    narrator "放学后，万事屋接到了一个正式委托。委托人：王老师。委托内容：“图书馆电子化 · 三千册图书贴磁条 · 今晚。”"
    show wang neutral at left with dissolve
    show alice neutral at right with dissolve
    wang "三千册！教务处说下周检查，我一个人贴到明年！艾丽丝同学，万事屋不是化不可能为可能吗？"
    alice "王老师，万事屋不接体力活。"
    wang "代价我出！图书馆二楼那间小阅览室，以后周末给万事屋用！还有——那孩子的座位，我给她装一盏台灯！"
    narrator "艾丽丝的眉毛动了一下。她看了一眼窗边——墨墨坐在她的老位置上，书抬着，可镜片在往这边看。"
    alice "……台灯。成交。"
    narrator "于是，万事屋三个人、王老师、小林，加上不知道从哪儿冒出来的 Joker，六个人围着一张长桌，开始贴磁条。"
    hide wang with dissolve
    show mo neutral at center with dissolve
    show lin neutral at left with dissolve
    scene cg lin_strip with dissolve
    narrator "磁条是一条条透明的薄膜，贴在书脊内侧。撕，对齐，压平。三千次。"
    narrator "小林贴得像机器：撕、贴、压，三秒一册，一册不差。墨墨贴得像绣花：对齐的时候会停一下，确认边缘和书脊平行。"
    narrator "二十分钟后，两个人的书堆一样高。小林抬起头，看了墨墨一眼。墨墨也抬起头。"
    lin "……你的比我齐。"
    narrator "墨墨在本子上写了一行。"
    mo_note "你的比我快。"
    lin "那我们各贴一千五百。谁先贴完，另一个人的最后一百册归她。"
    narrator "墨墨看着那行字，看了两秒。然后她点了一下头。她的手速变快了。"
    show alice happy at right
    alice "……她们俩在比赛。四年了，我第一次看见墨墨跟人比赛。"
    mc "小林也是。她平时连排队都不跟人抢。"
    alice "两个不说话的人，用磁条说话。这画面，我得拍下来。"
    narrator "她真的拍了。闪光灯亮的时候，两个人同时抬头瞪她。眼神一模一样。"
    scene bg library with dissolve
    show mo neutral at center
    show lin neutral at left
    show joker neutral at right with dissolve
    hide alice
    joker "呵呵……贴磁条，是一种低调的艺术。本怪盗自有独门手法——"
    narrator "Joker 撕了一条磁条，往书脊上一贴——贴歪了。他撕下来重贴——又歪了。第三次，磁条粘在了他自己的手指上。"
    joker "……non non。这本书，有诅咒。"
    lin "这本书是《几何原本》。"
    joker "那就是几何在跟我作对。"
    narrator "小林伸手把他手指上的磁条撕下来，贴到了书上。一次对齐。Joker 看着那条完美的磁条，沉默了三秒。"
    joker "……本怪盗，申请转岗。守门。"
    hide joker with dissolve
    show alice neutral at right with dissolve
    alice "行，你守门。顺便把王老师泡的茶端过来。"
    narrator "七点。三千册贴完了。小林一千五百三十二，墨墨一千四百六十八。小林赢了。"
    narrator "可小林没有把最后一百册推给墨墨。她把自己的登记本翻开，写了一行，撕下来，递给墨墨。"
    narrator "{i}“18:58 贴磁条完成。参与者六人。备注：她贴得比我齐。”{/i}"
    narrator "墨墨看着那张纸，凝视了许久。然后她也从本子上撕下一页，写了一行，递过去。"
    mo_note "备注：她比我快。下次再比。"
    narrator "两张纸。两行备注。小林把那张纸夹进了登记本的第一页。墨墨把她的夹进了《美丽新世界》。"
    narrator "王老师站在门口，抱着一盏新台灯。他看着那两个孩子，一句话都没说。可他的眼镜又滑到了鼻尖上。"
    show wang happy at left with dissolve
    wang "……台灯。放哪儿？"
    narrator "墨墨指了指她的老位置。靠窗那张桌子。四年来她坐了一千多个下午的地方。"
    scene cg dusk with dissolve
    narrator "王老师把台灯放上去，插上电。暖黄色的光落在桌面上。墨墨走过去，坐下，把手放在灯下。"
    narrator "她没有写字。可她抬头看了王老师一眼。那一眼很长。王老师慌慌张张地转过身去，说要去锁门。"
    mc "（有脾气没嘴的人，用一盏台灯说了一句话。）"
    mc "（她听见了。）"

    # ═══════════════════════════════════════════════════════════════
    # 三、周一夜 · 雨 · 一把伞
    # ═══════════════════════════════════════════════════════════════
    scene bg black with fade
    centered "{size=28}同日 · 晚上七点 · 雨{/size}"
    scene bg gate with fade
    stop music fadeout 1.0
    play music bgm_warm fadein 2.0
    play sound se_rain
    narrator "贴完最后一册磁条走出图书馆，天已经黑了。雨不知道什么时候下起来的。不大，可很密，像一层灰色的纱。"
    narrator "艾丽丝被五班的班主任一个电话叫走了，说“雨一会儿就停”。小林去锁门。王老师抱着空纸箱去还后勤。校门口只剩下我们两个。"
    narrator "我有伞。一个人住的人永远有伞——书包里一把，教室里一把，家里门后三把。这是生活能力。"
    show mo neutral at center with dissolve
    narrator "墨墨站在校门的雨棚下，抱着书，看着雨。披肩裹得很紧。她没有伞。"
    narrator "我走过去。她看见我，看了一眼我手里的伞，又看了一眼雨。然后她翻开本子。"
    mo_note "艾丽丝说雨一会儿就停。"
    mc "天气预报说要下到半夜。"
    narrator "她看着我。然后她写了两个字。"
    mo_note "……那等。"
    mc "等到半夜？外婆七点开灯。现在已经七点过了。"
    narrator "她的笔停了一下。她大概没想到我记得这件事。"
    mc "我送你到公交站。两站路，你自己回去。伞你拿着，明天还我。"
    narrator "她看着那把伞，静静望了好一会儿。然后她摇了摇头。"
    mo_note "伞你拿着。"
    mc "那你怎么——"
    mo_note "一起。"
    narrator "两个字。她写完就把本子合上了，好像怕自己反悔。"
    narrator "我撑开伞。她走到伞下。伞不大——一个人住的人不需要大伞。两个人在下面，肩膀必须挨着。"
    $ il_umbrella_shared = True

    scene bg street with dissolve
    narrator "雨里的林荫街道。梧桐叶被打湿了，贴在地上，一片一片，像信封。街角的小卖部亮着灯，玻璃上全是水珠。"
    narrator "我们走得很慢。伞往她那边偏了一点——我自己这边的肩膀很快就湿了。她没有发现。或者发现了，没有说。"
    narrator "走了一半，她忽然停下。她把书换到另一只手，然后从口袋里掏出本子——在伞下写字很难，她把本子举到胸口，写得歪歪扭扭。"
    mo_note "你的肩膀。"
    mc "……没事。"
    mo_note "湿了。"
    mc "回家换。"
    narrator "她看着我。然后她做了一件我没想到的事。她伸手，把伞柄往她自己那边又推了一点——不，是往我这边推。"
    scene cg umbrella with dissolve
    narrator "伞正了。她的肩膀露在雨里一点，我的肩膀也露在雨里一点。两个人各湿一边。"
    mo_note "这样。"
    mc "这样两个人都湿。"
    mo_note "公平。"
    narrator "她说“公平”。我忽然想起天台上那盒便当——她把便当推到两个人中间的时候，也是这个意思。"
    narrator "我们继续走。雨打在伞上，“哒哒哒”的。两个人各湿一边肩膀，谁都没有再说话。"

    menu:
        "雨声里，她忽然又停下了，把本子举起来。上面写着：“你为什么总是有伞？”"
        "老实说：“一个人住，没人会给我送伞。所以我自己带。”":
            $ add_favor("mo", 2)
            mc "一个人住，下雨了没人会给我送伞。所以我自己带。带久了就成习惯了。"
            narrator "她看着我，目光停留了良久。雨从伞边上滴下来，落在她的披肩上。"
            narrator "然后她写了一行。写得很慢。"
            mo_note "以后下雨，我带。"
            mc "……你？"
            mo_note "外婆有三把。我拿一把。"
            narrator "她说完这句，把本子合上，看着前面。耳朵尖红了。"
            narrator "我没有说话。可我把伞往她那边又推了一点。她没有推回来。"
        "开玩笑：“麻烦磁铁的基本装备。”":
            $ add_favor("mo", 1)
            mc "麻烦磁铁的基本装备。雨天、麻烦、冤案，三样总有一样会来。"
            narrator "她的肩膀动了一下。她在笑。然后她写了一行。"
            mo_note "今天只来了雨。"
            mc "那今天算好日子。"
            mo_note "……嗯。"
        "含糊过去：“习惯了。”":
            mc "习惯了。"
            narrator "她看了我一眼，没有再写。伞下的沉默又回来了。可这次的沉默里，好像有一点儿她没问出来、我也没说出来的东西。"

    scene bg gate with dissolve
    narrator "公交站。雨还在下。站牌下的小屏幕跳着“下一班 · 2 分钟”。"
    narrator "她站在伞下，我站在她旁边。两分钟很长。"
    narrator "公交进站的时候，她把本子举起来，上面是刚写的一行。字被雨打湿了一点，可看得清。"
    mo_note "后天讲座。你来。"
    mc "……我会来的。"
    mo_note "坐我旁边。"
    narrator "她说完就上了车。车门合上之前，她回头看了一眼。不是看我。是看那把伞。"
    narrator "车开走了。我一个人站在站台，撑着一把湿了一半的伞。左肩湿的。右肩干的。"
    mc "（“以后下雨，我带。”）"
    mc "（她说“以后”。）"
    hide mo with dissolve

    scene bg home with fade
    stop music fadeout 1.5
    play music bgm_prologue fadein 2.0
    narrator "到家的时候雨还没停。我把伞撑开放在玄关晾着，把湿了的校服外套挂在椅背上。"
    narrator "开灯，开窗。雨的味道进来了。"
    narrator "手机震了一下。父亲。"
    narrator "{i}“周三下午三点。行政楼大厅。我提前到。”{/i}"
    narrator "又一条。"
    narrator "{i}“下雨。带伞。”{/i}"
    narrator "我看着这四个字。“下雨。带伞。”他从来不会说这种话。这大概是他人生里第一次对我说“带伞”。"
    narrator "我回了两个字。"
    mc "（“有伞。”）"
    narrator "过了很久，他回了一个字。"
    narrator "{i}“好。”{/i}"
    narrator "我把手机放下。窗外，雨落在江面上，一片白。后天讲座。她说坐她旁边。他说他提前到。"
    narrator "两个不太会说话的人，用两句最短的话，把后天说满了。"
    mc "（今天没有案子。没有线索。没有推理。）"
    mc "（可今天，是我转学以来最好的一天。）"

    scene bg sunset with fade
    centered "{size=50}间章 · 完{/size}\n\n{size=28}第四章「向言来校 · 亲子与签名会」{/size}"
    with dissolve

    jump chapter4
