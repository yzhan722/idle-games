/**
 * expand-story-i18n.cjs — 仙缘剧情大幅扩写
 *
 * 目标:未读过《凡人修仙传》的玩家也能看懂因果——每张卡按
 * 「背景 → 事发 → 抉择」多幕展开,选项标签与注脚写清抉择的分量。
 * 写入 res/i18n/{zh.json, crowdin/zh.json, en.json}。
 *
 *   node expand-story-i18n.cjs
 */
const fs = require("fs");

// ---------------------------------------------------------------- zh ------
const ZH = {
//========== 凡尘篇·七玄门 ==========
"cultivation.fate.zhangtie.story":
"七玄门神手谷,你是墨大夫门下不起眼的记名弟子。与你同日入谷的张铁是你的同乡——憨直少言,力气却大,捣药的粗活总抢着干,挨管事的鞭子也总闷声替你挡。在这远离故土的深山里,他是你唯一说得上话的人。江湖人讲「出门靠朋友」,你们都把彼此当成了兄弟。",
"cultivation.fate.zhangtie.story2":
"半月前,张铁「下山归乡」了。墨大夫说得云淡风轻,赏银照发,行李齐备。可你分明记得他说过,要攒够钱给娘治病,今年绝不回家。更蹊跷的是,那之后你两次深夜路过药房地窖,都闻到一股浓得化不开的药腥——还有铁链拖过青砖的声响,沉重、缓慢,像什么东西在黑暗里翻了个身。",
"cultivation.fate.zhangtie.story3":
"今夜,那股药腥又来了。你立在窖口,手心贴着冰凉的铜锁——张铁去了哪里,这下面藏着什么,墨大夫慈眉善目的背后又是什么?推开这道门,就再也回不到懵懂的日子了。可若不推开,那个替你挡鞭子的少年,也许正躺在下面某个角落里。",
"cultivation.fate.zhangtie.trace.opt": "夜半撬锁,查个明白",
"cultivation.fate.zhangtie.trace.hint": "见过真相的人,往后才认得出那具铁尸",
"cultivation.fate.zhangtie.trace":
"铜锁落地的那一刻你就后悔了。地窖里没有人,只有一口半人高的药缸,缸壁的药渍黑得发紫,缸底沉着一层细碎的骨渣。张铁的柴刀还挂在墙钩上,人却像从世间被抹去了。你连夜把锁挂回原位,手心全是冷汗——这笔账,记下了。",
"cultivation.fate.zhangtie.bide.opt": "装作不知,回去睡觉",
"cultivation.fate.zhangtie.bide.hint": "仙途险恶先顾眼前——只是有些味道,会跟你一辈子",
"cultivation.fate.zhangtie.bide":
"你在窖口站了一炷香,终是转身回屋。江湖人常说知道的越少活得越久——可往后每个雨夜,那阵药腥和铁链声都会准时报到,像一笔没有结清的旧账。",
"cultivation.fate.zhangtie.wary.opt": "不查,但从此留一手",
"cultivation.fate.zhangtie.wary.hint": "把墨大夫给的补药,悄悄换成清水",
"cultivation.fate.zhangtie.wary":
"你不声不响回了屋。第二天起,墨大夫每月赐下的「固本培元散」,都被你换成清水倒进了山涧。他若真是好人,不过浪费几包药;他若不是——你这条命,就押在这点疑心上了。",

"cultivation.fate.bottle.story":
"入谷三个月,你月钱微薄,丹药更轮不到记名弟子——想快些练出气感,只能自己想办法。这夜你照例去后山采药,追一只白毛野兔钻进岩缝,竟在积年落叶下摸出一只青翠小瓶。瓶不过巴掌大,非金非玉,入手温润得反常,瓶壁上的纹路细看竟像流动的云。",
"cultivation.fate.bottle.story2":
"你随手把它搁在窗台。翌日清晨,瓶口内壁凝出一滴碧色露珠,坠入窗台裂缝里一丛枯蔫的药苗——那苗在你眼皮底下抽枝、展叶、开花,一盏茶的功夫走完了一年的荣枯。你把小瓶紧紧攥在手心,指节都白了:这世道里,穷人家的孩子,终于也攥住了一样旁人没有的东西。",

"cultivation.fate.feiyu.story":
"演武场上有个使刀的少年,叫厉飞雨——野狼谷出身,无门无派,全凭一股疯劲杀进内门,人称「厉疯子」。他不知你身怀仙家法门,只当你也是个闷头练武的同道,隔三差五拉你比试,输了就请你去山脚下赊账喝酒。乱世里,这样不计利害的交情是稀罕物。",
"cultivation.fate.feiyu.story2":
"今夜他又拎着两壶浊酒翻进你的院子,往石桌上一顿:「韩小子,等我厉飞雨刀法大成、名震越国那日,你在底下替我掌个眼!」他说这话时眼睛亮得像星子,浑然不知自己毕生都只是凡人。你忽然想:这个名字,或许值得被更多人记住。",
"cultivation.fate.feiyu.oath.opt": "与他义结金兰",
"cultivation.fate.feiyu.oath.hint": "仙凡殊途,兄弟一场——他日你扬名时,他已在黄土之下",
"cultivation.fate.feiyu.oath":
"你们对月叩头,以血换盏。他大笑三声,说明日再教你三招刀法——你不知道的是,许多年后修士问起来历,你脱口而出的,正是今夜这个名字。",
"cultivation.fate.feiyu.name.opt": "记下这个名字",
"cultivation.fate.feiyu.name.hint": "往后行走江湖,「厉飞雨」三个字,将替你去响亮",
"cultivation.fate.feiyu.name":
"你笑着应了,心里却把「厉飞雨」三个字收进了贴身的口袋。多年后,乱星海的通缉令、天南的宗门名册上,这三个字将闯出滔天名声——而真正的他,早已在一场凡人的仇杀里化作白骨。",
"cultivation.fate.feiyu.decline.opt": "渐渐疏远,各走各路",
"cultivation.fate.feiyu.decline.hint": "你是修仙的人了,凡俗交情是负累——道理如此,心却沉了沉",
"cultivation.fate.feiyu.decline":
"你开始称病避席。他来过三回,最后一回把半坛酒搁在你门口,挠着头走了。山门外再没有那道咋咋呼呼的身影——修仙第一课,原是舍得。",

"cultivation.fate.mojuren.story":
"墨居仁,神手谷墨大夫,江湖人称「银手佛心」——医术通神,救人无数,待你更如亲生。他授你《长春功》,月月赐药,逢人便夸「我这徒儿是个修仙的苗子」。若非那夜替他送一封火漆密信回房,你本该一直这么信下去。",
"cultivation.fate.mojuren.story2":
"密室里烛火摇曳。你替他找药方,却在枕下翻出一卷以人血写就的邪功——《夺舍大法》。字字诛心:修至大成,神魂可离体夺舍,强占他人躯壳再活一世;而最合用的炉鼎,是「身具灵根、修为尚浅的少年弟子」。你拿着那卷书,手抖得点不燃油灯——原来这三年的慈爱,是在给一株药材浇水。",
"cultivation.fate.mojuren.story3":
"当夜,他带着一身药香推门进来,烛火无风自灭。平日慈和的眉眼在黑暗里舒展成另一副模样:「好徒儿,师父这具身子熬不了几年了——你的这具,借为师一用罢。」神魂如墨,自他眉心倾出,直扑你的识海。师徒一场,终于到了结账的时候。",
"cultivation.fate.mojuren.kill.opt": "倾尽全力,灭其神魂",
"cultivation.fate.mojuren.kill.hint": "反杀师父——斩断师徒,也斩断后患,只余夜半一声叹",
"cultivation.fate.mojuren.kill":
"识海中的搏杀无声却凶险。你以《长春功》养出的神魂硬生生磨碎了他的残念——最后一刻,他忽然不再挣扎,只叹了句「可惜了」。是可惜你没成他的炉鼎,还是可惜这段师徒?你不愿再想。天亮时,神手谷少了一位墨大夫,你眼底多了一层化不开的霜。",
"cultivation.fate.mojuren.spare.opt": "擒而不杀,封其残魂",
"cultivation.fate.mojuren.spare.hint": "念三年授业之情留一线——但猛虎入笼,终有反扑之日",
"cultivation.fate.mojuren.spare":
"你赢了,却没下杀手。念他三年授业之恩,你将那缕残魂镇入一枚黑铁法器,贴符封印。他在器中阴冷地笑了:「好徒儿,山长水远,为师等着你。」——这句话,结丹那日,你会想起来的。",

"cultivation.fate.jinguang.story":
"大祸毫无征兆地砸下来。野修金光上人——一个在凡间厮混的散修,靠着一张符宝横行乡里——纠集匪徒杀上了七玄门。符宝金光护体,刀剑难伤,满门武师的刀砍上去只溅起点点火星。门主的断剑至今还插在演武场中央,血顺着青砖缝流到了你的鞋尖。凡人,挡不住修仙者。",
"cultivation.fate.jinguang.story2":
"好在,你已不完全是凡人。金光上人正在点火烧藏经阁,符宝罩身的他狂笑自若,浑然不觉身后多了一个人。你摸出怀里那柄喂了三年的小剑——杀了他,满门数百口就有活路;缩在人群里,你也能活着走出这片火海。只是一样:若今日退了,往后每逢关隘,你都会想起今天。",
"cultivation.fate.jinguang.fight.opt": "挺身而出,阵前斩之",
"cultivation.fate.jinguang.fight.hint": "凡人的江湖,今日由你来挡——夺其符宝遗物,或有升仙机缘",
"cultivation.fate.jinguang.fight":
"法剑破空的锐啸里,符宝金光寸寸碎裂。金光上人临死瞪着你,像看一个怪物——他不明白,凡人堆里怎么会蹲着一个真正的修士。大火扑灭时已是黎明,你在他的行囊里摸出一枚非金非玉的令牌,刻着两个古篆:「升仙」。后来你才知道,这是通往仙门的钥匙。",
"cultivation.fate.jinguang.flee.opt": "携瓶夜遁,独善其身",
"cultivation.fate.jinguang.flee.hint": "留得青山——只是七玄门的火光,会在你梦里烧很多年",
"cultivation.fate.jinguang.flee":
"你揣着小瓶,从后山断崖趁夜离去。身后火光映红了半边天,喊杀声顺着风追出三十里。你活下来了——可有些夜里,那冲天的火光还是会烧进你的梦里,烧得你整夜整夜地打坐。",

"cultivation.fate.xuese.story":
"炼气圆满,筑基只差一步——可筑基丹的主药「九曲灵参」只在一个地方成批生长:血色禁地。此地十年一开,七派各遣炼气弟子入内采药;谷内灵药遍地,妖兽横行,而比妖兽更险的,是人心。历届活着走出来的弟子,十不存三。",
"cultivation.fate.xuese.story2":
"禁地之中无日月。第三日黄昏,你循着药香摸到墨蛟潭边,正撞见一场恶斗:一名银衣女修被墨色妖蛟缠在潭心,鬓发散乱,护体灵光已薄得像一层窗纸。她腰间那枚掩月宗的玉佩你认得——七派之首,掩月宗内门弟子,南宫婉。她的目光扫过潭边的你,只一瞬,又落回妖蛟身上。",
"cultivation.fate.xuese.story3":
"出手,还是作壁上观?墨蛟力大无穷,你这点修为掺和进去生死难料;可潭底那株五百年份的灵参近在咫尺——她若死了,下一个就轮到你。潭水翻涌,妖蛟的竖瞳已经转了过来。",
"cultivation.fate.xuese.jiao.opt": "出手相助,共斩墨蛟",
"cultivation.fate.xuese.jiao.hint": "合力退蛟,分润灵药——这一眼,她记下了(初遇南宫婉)",
"cultivation.fate.xuese.jiao":
"你暴起发难,三道符箓封住蛟目,她心领神会一剑穿喉。分药之时她摘去面纱一角,眉目清冷如月,对你微微颔首:「掩月宗南宫婉,记下了。」潭边一别,你以为不过是萍水——却不知这一眼,要一千年后才还得清。",
"cultivation.fate.xuese.lurk.opt": "隐在暗处,坐等鹬蚌",
"cultivation.fate.xuese.lurk.hint": "她死了灵药全是你的;她若活下来……没人知道你今晚在这",
"cultivation.fate.xuese.lurk":
"你伏在岩后,看她血战脱身、重伤远遁,才潜去潭底掘了灵参,顺手又收了七八株百年老药。满载而归时你告诉自己:修仙路上,活下来的人才有资格谈道义。只是那道银衣染血的身影,偶尔还是会入梦。",

//========== 黄枫谷(筑基)==========
"cultivation.fate.qixuan.story":
"离了七玄门,你负笈千里,投到越国七派之一的黄枫谷。山门前三千级青石阶直上云霄,守山弟子验过你的灵根,往名册上一笔勾去:「外门弟子,领《青元剑诀》残篇一卷,灵田三亩,月例灵石十块。」自此,凡尘的刀光剑影,都成了山脚下的云。",
"cultivation.fate.qixuan.story.token":
"黄枫谷山门前,你递上那枚得自金光上人遗物的升仙令。守山弟子脸色一变,疾步入内禀报——半炷香后,一位筑基执事亲自引你入山:「持令者,直入内门。」原来那一夜的仗,报偿在这里等着:《青元剑诀》全卷到手,灵田洞府皆有份例,同门看你时眼里都有了分量。",
"cultivation.fate.qixuan.story2":
"黄枫谷的日子清苦却安稳。白日打理灵田、研磨剑诀,夜里对着满山虫鸣修行吐纳——偶尔你也会想起神手谷的药香、地窖的铁链声、还有那个雨夜的密室。都过去了。如今你走在的,是一条真正的仙路。",

"cultivation.fate.tainan.story":
"听闻太南谷五年一度的散修小会又开了。此辈散修无门无派,揣着毕生积蓄在此互通有无——功法残页、灵药种子、妖兽筋骨,吆喝声此起彼伏。你易容混入其中,青衫布履,混迹在烟火气里,竟恍惚觉得自己还是个凡人。",
"cultivation.fate.tainan.story2":
"一个独臂老者的摊位前,你停住了。摊上三样东西:半卷烧焦的剑诀残页、一包干瘪的灵药种子、一壶浊酒。老者眯眼打量你:「小友面生,想要什么,自己挑。」囊中灵石不多,只够买一样。",
"cultivation.fate.tainan.sword.opt": "买下半卷剑诀残页",
"cultivation.fate.tainan.sword.hint": "与你怀中的《青元剑诀》残篇,或有合璧之机",
"cultivation.fate.tainan.sword":
"残页上的剑意与你怀中的残篇隐隐共鸣——果然同出一源。归途中你已参透三分:青元剑诀之路,自此又宽了一线。老者收了灵石,眯眼笑得像早知有今日。",
"cultivation.fate.tainan.seed.opt": "收下灵药种子",
"cultivation.fate.tainan.seed.hint": "干瘪的种子?在掌天瓶面前,天下没有死的灵药",
"cultivation.fate.tainan.seed":
"当夜你把种子埋进灵田,滴上一滴瓶露。翌日,满圃灵苗破土而出,碧得晃眼。老者若知道自己的「死种」在你手里活了,怕是要惊掉下巴。",
"cultivation.fate.tainan.wine.opt": "沽一壶浊酒,听他说书",
"cultivation.fate.tainan.wine.hint": "散修的嘴里藏着修仙界的真消息——乱星海的传说入耳",
"cultivation.fate.tainan.wine":
"浊酒三碗,老者话匣子大开:「……都说乱星海遍地是机缘,妖丹当灵石使!当年多少修士闯过去,回来的没几个——可回来的,哪个不是一方豪雄?」你默默把这三个字记进了心里。",

"cultivation.fate.fengyun.story":
"筑基之后,你耗尽心血做了一件大事:以掌天瓶催熟三千年金雷竹,辅以秘法炼制,三百日炉火不熄,终成七十二口青竹蜂云剑。剑成那日,竹影满山,蜂鸣彻夜——七十二口飞剑如臂使指,结成剑阵,同阶修士难撄其锋。",
"cultivation.fate.fengyun.story2":
"从此游历四方,再无敌手之忧。蜂云所至,妖兽辟易;寻常劫修见你剑光一起,掉头便走。你抚着掌心的剑丸,忽然明白墨居仁当年为何不择手段——力量本身,就是这世上最动听的话。",

//========== 离乱篇(结丹)==========
"cultivation.fate.zhengmo.story":
"太平日子过久了,谁都忘了魔道六宗还在山外磨刀。这年秋末,狼烟一夜之间烧遍越国——正魔大战爆发,魔焰滔天,七派连战连败。黄枫谷虽是七派之一,倾巢而出也难挡大势:山下的村镇一夜间成了白地,逃难的凡人扶老携幼,哭声顺着山道一路传到峰顶。",
"cultivation.fate.zhengmo.story2":
"谷中长老会开了三天三夜,最终敲定的却是「保存火种」——精锐弟子先行撤离,老弱自愿断后。你恰在撤离名单之外:论修为你是结丹新锐,论根基你在谷中无党无派,被留下殿后,本就是给旁人的生路垫脚。",
"cultivation.fate.zhengmo.story3":
"撤离前夜,漫山都是收拾行囊的弟子。有人连夜拜别师长,有人抱着灵田痛哭,也有人——比如此刻的你——立在风口看着山下的火光,心里算一笔冷账:留下断后是十死无生,随队先走是一线生机。这一夜,没人睡得着。",
"cultivation.fate.zhengmo.rear.opt": "留下断后,多挡一刻",
"cultivation.fate.zhengmo.rear.hint": "为师门争一线生机——活下来的人,会记得今夜是谁留在了山头",
"cultivation.fate.zhengmo.rear":
"你留下了。魔焰压境那夜,你与几十名自愿断后的同门死战山隘,符箓烧尽就用剑,剑折了就用拳头。天亮时黄枫谷已空,你拖着一身血污走出尸山——身后无人再敢小觑这个无党无派的结丹修士。",
"cultivation.fate.zhengmo.slip.opt": "趁乱先行,另寻生路",
"cultivation.fate.zhengmo.slip.hint": "活着才有来日——但「临阵脱逃」四个字,会跟你的名字很多年",
"cultivation.fate.zhengmo.slip":
"你在人潮最乱时换了散修的装束,悄然而去。身后黄枫谷的火光烧了三天——你一次也没有回头。修仙路上,活着的人才有资格书写对错;只是偶尔,你会想起那座桃花盛开的山谷。",

"cultivation.fate.duoshi.story":
"结丹的紧要关头,那枚贴身收藏的黑铁法器骤然发烫——你几乎忘了,里面还镇着一个人。墨居仁的残魂自囚笼中暴起,挟着淬了数年的怨毒扑向你的紫府:「好徒儿,为师说过——你的身子,借我一用。」他等这一天,等了整整一个境界。",
"cultivation.fate.duoshi.story2":
"识海之内神魂相搏,比任何刀兵都凶险。他的魂力枯败却歹毒,一寸寸啃噬你的神智,专挑心魔滋生处下口;你的神魂正值结丹鼎盛,却不敢全力施为——怕撕裂了刚凝聚的金丹。黑暗里,他絮絮地说起往事:收你为徒那天,原是看中你的灵根;可授业三载,也并非全是假意。",
"cultivation.fate.duoshi.story3":
"「师父。」你在识海里一字一句地开口,「你说得对——这具身子,的确是修仙的好苗子。所以,不能给你。」残魂僵了一瞬。趁这一瞬,你的神魂扑了上去。",
"cultivation.fate.duoshi.burn.opt": "焚其残魂,恩怨尽泯",
"cultivation.fate.duoshi.burn.hint": "烧掉这缕残念——师徒旧账,今夜两讫",
"cultivation.fate.duoshi.burn":
"南明离火般的神魂烈焰里,那缕残念寸寸成灰。最后消散前,他忽然不再咒骂,只极轻地说了句什么——像是「长春功第九层」,又像是一声叹息。你睁开眼,窗外正落雪。从今往后,再没有墨大夫了。",
"cultivation.fate.duoshi.tame.opt": "镇而收之,为我所用",
"cultivation.fate.duoshi.tame.hint": "他不死不灭,一身药理丹道却留下——以毕生所学,偿夺舍之债",
"cultivation.fate.duoshi.tame":
"你将溃散的残魂重新镇入法器,加了三道禁制,烙上主仆之契。他输得心服口服:「罢了……为师这一身医道丹理,就留给你做个念想罢。」自此你丹途如有神助——他的毕生所学,正以另一种方式续他的命。",

"cultivation.fate.chen.story":
"撤离黄枫谷的前夜,渡口风大。陈巧倩——门主的独女,黄枫谷公认的明珠——独自在渡口拦住了你。这些年在谷中,她对你处处照拂:替你挡过执事的刁难,塞过暖手的汤婆子,灵田歉收时偷偷匀过自己那份口粮。此刻她塞给你一只缝得密密的储物袋,里面是晒干的桃花、三瓶亲手炼的丹药,和一封没署名的信。",
"cultivation.fate.chen.story2":
"「山高水长,道友珍重。」她转身要走,又停住,背对着你轻声说:「那年灵田失火,你替我顶罪挨罚的时候……我就知道了。」渡口的风吹乱她的鬓发。这一去天南板荡、仙路茫茫,有些话今夜不说,许是就再没有机会了。",
"cultivation.fate.chen.dao.opt": "一心向道,婉言回绝",
"cultivation.fate.chen.dao.hint": "黄枫谷的桃花雨,此后只在梦里——道心愈坚",
"cultivation.fate.chen.dao":
"你把储物袋轻轻推回去,只取了一瓣干桃花:「仙道漫漫,误了道友。」她看了你很久,忽然笑了,笑着笑着眼泪就下来了:「果然是你。」渡口一别,桃花随水。",
"cultivation.fate.chen.love.opt": "结为道侣,共赴仙途",
"cultivation.fate.chen.love.hint": "乱世里结一段缘——合体重逢时,她会在你身边",
"cultivation.fate.chen.love":
"你握住她冰凉的手:「此去星海,若侥幸不死,回来娶你。」她破涕为笑,从颈上解下一枚护身玉佩给你挂上——百年后你才知道,那枚玉佩里封着她的一缕本命真元。",
"cultivation.fate.chen.forget.opt": "相忘江湖,不留一字",
"cultivation.fate.chen.forget.hint": "最干净的告别——也最疼",
"cultivation.fate.chen.forget":
"你没有接储物袋,也没有说话。晨雾起时渡口已空,她站过的青石上只余一瓣桃花,被风吹进水里。你告诉自己这是最好的结局——却在此后几百年里,再没去过任何一个有桃花的地方。",

"cultivation.fate.chuansong.story":
"正魔战火越烧越近,天南已无净土。避祸途中,你在一座荒岛的洞窟深处发现一座残缺的上古传送阵——阵纹繁复非当今手笔,中央阵眼还凝着万年未散的灵光。阵图残卷上写着:此阵所通彼岸,名「乱星海」——妖兽横行、机缘遍地的化外之地。",
"cultivation.fate.chuansong.story2":
"修复古阵需要时日,而魔焰离此地不过数百里。洞外浪声如雷,洞内阵纹明灭——这座古阵是唯一的生路,也是一条不归路:彼岸是何等天地,去了未必回得来。走,还是留?",
"cultivation.fate.chuansong.sail.opt": "耗尽家底修阵,远行星海",
"cultivation.fate.chuansong.sail.hint": "抛下天南恩怨,去搏一个没人认识你的新地界",
"cultivation.fate.chuansong.sail":
"三个月日夜赶工,古阵的阵纹一条条亮起。踏入阵眼那刻,你回望了一眼天南的方向——此去经年,归期未卜。灵光冲天而起,你消失在原地,只剩洞窟里潮汐般的阵纹余音。乱星海,到了。",
"cultivation.fate.chuansong.seal.opt": "拓下阵图封窟,另觅他途",
"cultivation.fate.chuansong.seal.hint": "此阵留着是个后手——但远水,救不了近火",
"cultivation.fate.chuansong.seal":
"你拓下完整阵图,以禁制封了洞窟。这座古阵是你埋下的后手——它日在天南待不下去,星海便是退路。只是眼下,还得先在战火里活下去。",

//========== 星海篇(元婴)==========
"cultivation.fate.shijin.story":
"星海深处一座无名荒礁上,你寻得一窝上古异虫——噬金虫。史载此虫位列奇虫榜前茅,万虫出匣如金色狂潮,金石皆可为食;虫群所过之处,法器法宝皆成齑粉,蜕下的虫壳更是炼宝的良材。多少上古大修,都靠一手驱虫之术横行一世。",
"cultivation.fate.shijin.story2":
"饲养噬金虫极耗心神——喂食、分巢、驯化,一样都省不得。但当第一波虫群在你掌心结成一朵小小的金云时,你知道这份心神花得值:从今往后,你的洞府有了最忠诚的守卫,你的敌人多了一种最可怕的死法。",

"cultivation.fate.dayan.story":
"一具上古傀儡残躯中,你听见了一个声音。残躯里封着一缕千年残魂——大衍神君,生前傀儡术独步天下,神识之强世所罕见,陨落前将自己炼进傀儡,在黑暗里独自醒了一千年。「三百年了,」他的声音沙哑得像锈铁摩擦,「你是头一个能听懂我说话的。」",
"cultivation.fate.dayan.story2":
"他开出的条件很简单:他教你《大衍决》神识秘术与傀儡之道,你替他寻一具可以寄托的躯壳,或送他最后一程。「老夫这一生,什么都教过人,唯独没教过自己怎么死。」千年残魂的笑意里,你听不出是洒脱还是悲凉。",
"cultivation.fate.dayan.disciple.opt": "以大礼拜师,承其衣钵",
"cultivation.fate.dayan.disciple.hint": "《大衍决》神识真传——师者,传道授业解惑",
"cultivation.fate.dayan.disciple":
"你以古礼三拜。他受了,沉默良久才道:「起来吧。老夫最后一个弟子,竟是个千年后的后生。」《大衍决》的神识法门如江海灌入识海——这一拜,是你仙途上最划算的一次低头。",
"cultivation.fate.dayan.puppet.opt": "只学傀儡术,各取所需",
"cultivation.fate.dayan.puppet.hint": "不谈师徒只论交易——铁木傀儡日夜轮作开矿",
"cultivation.fate.dayan.puppet":
"「也好,师徒虚名,老夫早就不在乎了。」他将傀儡术倾囊相授。三个月后,第一批铁木傀儡走出工坊,日夜轮作开矿采石——你的灵石进项,自此再不用愁。",

"cultivation.fate.tihun.story":
"乱星海深处猎杀妖兽时,你在一座孤坟般的洞窟里撞见一只异兽:通体如墨,唯有一双碧眼,喉间发出婴儿夜啼般的怪声。典籍有载——啼魂兽,专噬阴魂厉魄的上古异种,一吼可令百鬼辟易,是天下至阴至邪之物的克星。它盯着你的神魂看了半晌,竟主动凑过来,蹭了蹭你的掌心。",
"cultivation.fate.tihun.story2":
"收服啼魂,是撞了大运——从此邪修鬼道在你面前要先矮三分,连你突破时滋生的心魔幻象,在它眼里都只是一顿美餐。只是此兽来历古怪,洞窟深处那座无名坟冢,你最终没有敢去挖。有些秘密,还是埋在海底的好。",

//========== 化神 ==========
"cultivation.fate.yinyue.story":
"化神雷劫刚过,你温养多年的本命法宝忽然生变——器中沉睡的器灵醒了。她自称银月,银发垂地,眉眼如画的狼族妖修,万年前随主征伐,主人陨落后在器中又睡了一万年。「沧海桑田,」她望着洞外的云海轻声说,「原来外面的世界,已经这样了。」",
"cultivation.fate.yinyue.story2":
"器灵去留,是个难题。留她效力,法宝通灵更胜往昔,驱物伤敌如臂使指;可她困在器中万年,眼底那点对自由的渴,你看得分明——那神情,和当年攥着小瓶的你,一模一样。",
"cultivation.fate.yinyue.bind.opt": "请她留下,器灵效力",
"cultivation.fate.yinyue.bind.hint": "法宝通灵常驻产出+10%——她答应得很轻,像一片月光落在肩上",
"cultivation.fate.yinyue.bind":
"「万年都等了,不急这一世。」银月微微一笑,身影没入宝光。自此法宝通灵如臂使指——只是偶尔夜半,器中会传出极轻的哼唱,像狼歌,又像安眠曲。",
"cultivation.fate.yinyue.free.opt": "解开禁制,放归自由",
"cultivation.fate.yinyue.free.hint": "万年之困一朝解——灵界若重逢,她会记得今日",
"cultivation.fate.yinyue.free":
"禁制解开那日,她化作一道银虹绕你三匝,留下一句「灵界再见」便没入云海。法宝失了器灵威力大减,你却觉得值——有些债是要还的;有些人,不该被关着。",

"cultivation.fate.yuanyao.story":
"星海的故旧来信中,夹着一封字迹娟秀的传讯——元瑶,当年在乱星海有过数面之缘的女修,如今被卷入一场波及数岛的风波,怀璧其罪,四处遭人追杀。信中她没有求援,只淡淡写了句「星海一别多年,道友可还安好」,落款处晕开一小片墨渍,像一滴没落下的泪。",
"cultivation.fate.yuanyao.story2":
"昔年乱星海的旧事涌上心头:那时她还是个明艳张扬的筑基女修,为救同门师姐不惜以身饲魔。数百年不见,故人还在风口浪尖上挣扎。帮,是不帮?",
"cultivation.fate.yuanyao.aid.opt": "鼎力相助,替她解围",
"cultivation.fate.yuanyao.aid.hint": "修士间的债最难还——她记下了这份恩",
"cultivation.fate.yuanyao.aid":
"你踏浪而至,三日之内替她了结了追杀令。她立在礁石上朝你深深一礼,什么都没说——但从此以后,每逢你突破大关,一封只写着「珍重」二字的传讯总会准时抵达。",
"cultivation.fate.yuanyao.bond.opt": "倾力相助,结为知己",
"cultivation.fate.yuanyao.bond.hint": "雪中送炭——从此星海多一个可托后背的人,她的信会常来",
"cultivation.fate.yuanyao.bond":
"「你我之间,不必言谢。」你们并肩在礁石上坐了一夜,从乱星海的旧闻聊到天南的桃花。临走她塞给你一枚传讯符:「星海之大,有个能说说话的人,真好。」自此,你的洞府不时会收到来自遥远海域的问候。",

//========== 虚天篇(炼虚)==========
"cultivation.fate.quhun.story":
"炼虚之后,你起了炼制护法道兵的念头。星海散修手中,你重金购得一具古修遗蜕炼成的铁尸:尸身不腐,铁甲覆体,煞气内蕴,正是炼尸的上佳之材。卖家说它出自天南某处的古战场,辗转数百年,不知经了几手。",
"cultivation.fate.quhun.story.known":
"炼虚之后,你起了炼制护法道兵的念头。星海散修手中,你重金购得一具古修遗蜕炼成的铁尸。卖家说它出自天南——你的心没来由地一沉。数百年前,七玄门神手谷,那口深夜的药缸,那阵铁链拖过青砖的声响……你按住铁尸冰冷的面甲,久久没有揭开。",
"cultivation.fate.quhun.story2":
"祭炼开始前的最后一刻,你揭开了面甲——",
"cultivation.fate.quhun.story2.known":
"面甲滑落的瞬间,浑身的血都凉了。铁甲之下,是张铁憨厚的脸——眉眼依稀还是当年的模样,只是再不会笑了。当年地窖里那口药缸,墨居仁的邪功,那具被抹去痕迹的尸身……原来他去了这里。原来他一直在这里。",
"cultivation.fate.quhun.story3":
"祭炼的法阵已经布好。指尖的控魂符燃起又掐灭,掐灭又燃起——这具躯壳里,曾住过一个替你挡鞭子的少年。炼了,他是你最忠诚的道兵;葬了,他是你永远的朋友。炼,还是不炼?",
"cultivation.fate.quhun.bury.opt": "封炉葬之,还他姓名",
"cultivation.fate.quhun.bury.hint": "入土为安——他叫张铁,不叫道兵",
"cultivation.fate.quhun.bury":
"你在无名的山岗上立了块碑,只刻「故友张铁」四个字。埋土时你忽然想起很多年前,也是这样一个黄昏,他替你挨了三鞭子还咧着嘴笑。青山埋骨,愿他来生不必再入仙门。",
"cultivation.fate.quhun.wield.opt": "炼为曲魂,伴我长生",
"cultivation.fate.quhun.wield.hint": "旧友之躯自此护法不死不休——这是他另一种活法",
"cultivation.fate.quhun.wield":
"控魂符落定,铁尸睁眼,眸中再无神采,唯余一片死寂的忠诚。你替他起了新名字——曲魂。「替我护法吧,」你抚过他冰冷的铁甲,声音轻得像说给自己听,「这一次,换我护着你。」",

"cultivation.fate.xugu.story":
"荒岛古修洞府深处,一具白玉般的骸骨忽然睁眼——玄骨上人,万年前纵横乱星海的魔道巨擘,陨落后一缕残魂附骨不灭。他不急着动手,慢条斯理地掸了掸骨上的尘土:「小友能到这里,也算与老夫有缘。」笑容可掬,眼神却比骸骨还冷——万年老鬼,没有一盏省油的灯。",
"cultivation.fate.xugu.story2":
"他邀你合作取宝:虚天殿内殿有上古遗藏,禁制森严,非二人合力不可开。「宝物对半分,如何?」老鬼把条件摆得滴水不漏。与虎谋皮,还是现在就掀桌子?",
"cultivation.fate.xugu.ally.opt": "虚与委蛇,结伴寻宝",
"cultivation.fate.xugu.ally.hint": "各怀鬼胎的同行——取宝那日,就是算总账之时",
"cultivation.fate.xugu.ally":
"你们击掌为盟,言笑晏晏,各自在心里给对方备好了棺材。同行数月,他的见识阅历的确让你大开眼界——只是每到夜里,你都能感觉到那道打量猎物的目光,黏在你的后心上。",
"cultivation.fate.xugu.slay.opt": "趁他魂弱,先下手为强",
"cultivation.fate.xugu.slay.hint": "万年残魂也是残魂——取其遗藏,永绝后患",
"cultivation.fate.xugu.slay":
"掌心灵焰暴起的瞬间,老鬼的笑声戛然而止:「小友好狠的手段——」「彼此彼此。」白玉骸骨寸寸崩解,你只在他枕骨下摸出一枚储物戒。里面灵石不多,倒有半张海图——虚天殿的标记,赫然在目。",

"cultivation.fate.xutian.story":
"虚天殿,万年开启一次的坠仙遗府。内殿冰窟之中,上古修士的遗宝近在咫尺——乾蓝冰焰幽光森森,是淬炼道基的无上神物;补天丹药香凝而不散,传说一粒可洗经伐髓、脱胎换骨。禁制的裂纹如蛛网蔓延,取宝的时机只有一息。",
"cultivation.fate.xutian.story.betray":
"虚天殿内殿冰窟,遗宝近在咫尺。可禁制将破的刹那,背后寒毛倒竖——玄骨上人终于撕下了温和的面皮:「小友,宝物归我,你的躯壳,也归我罢。」万年老鬼的全力一击无声无息印向你的后心——你早知他会反噬,只是没想到,他挑的是你最不能分心的这一刻。",
"cultivation.fate.xutian.story2":
"冰窟之内宝光冲天。乾蓝冰焰与补天丹只可取一,而玄骨的攻势已至——且战,且取,一息之间,须做决断。",
"cultivation.fate.xutian.story2.betray":
"冰窟之内宝光冲天。你侧身卸去那记暗算,神识却已感到一阵冰寒——老鬼的夺舍魂丝缠上了你的右臂。乾蓝冰焰与补天丹只在数步之外——先取宝,还是先保命?",
"cultivation.fate.xutian.story3":
"冰焰的幽光、丹药的异香、老鬼的狞笑,全挤在这一瞬间。修仙数百年,你早已习惯把命押在一念之间——那么这一念,选什么?",
"cultivation.fate.xutian.tihun.opt": "放出啼魂,吞此恶鬼",
"cultivation.fate.xutian.tihun.hint": "一物降一物——让他尝尝被噬魂的滋味,遗藏尽归你",
"cultivation.fate.xutian.tihun":
"啼魂出匣的刹那,玄骨脸上的狞笑僵住了。碧眼异兽喉间一声婴儿夜啼,老鬼的魂体便如长鲸吸水般被扯离你的手臂——「小友饶——」求饶声断在兽口。冰窟重归寂静,遗藏尽归你手:万年玄骨,就此成了啼魂的点心。",
"cultivation.fate.xutian.flame.opt": "夺乾蓝冰焰",
"cultivation.fate.xutian.flame.opt.betray": "且战且退,先夺冰焰",
"cultivation.fate.xutian.flame.hint": "至寒之火淬炼道基——此一宝,万载难求",
"cultivation.fate.xutian.flame":
"你反手将乾蓝冰焰收入玉匣,森森寒气顺着手臂攀上灵台,却在丹田处与道基轰然相合。身后老鬼的怒吼渐远——冰焰到手,这一趟虚天殿,值了。",
"cultivation.fate.xutian.pill.opt": "夺补天丹",
"cultivation.fate.xutian.pill.opt.betray": "且战且退,先夺补天丹",
"cultivation.fate.xutian.pill.hint": "万载药力洗经伐髓——心魔尽散",
"cultivation.fate.xutian.pill":
"补天丹入口即化,万载药力如春江化冻,涤荡四肢百骸。积年的暗伤、纠缠的心魔,竟被药力一寸寸抚平——这一粒丹,抵得上百年苦修。",

//========== 合体 ==========
"cultivation.fate.nangong.story":
"合体大成,名动天南,掩月宗遣使来贺。为首的女修摘去面纱,眉目清冷如月,通身气度让满殿宾客都矮了三分——南宫婉,掩月宗千年不出的奇才。她打量你良久,只觉莫名眼熟,却怎么也想不起何处见过。你垂下眼帘——有些往事,不提也罢。",
"cultivation.fate.nangong.story.met":
"合体大成,名动天南,掩月宗遣使来贺。为首的女修摘去面纱的刹那,你们同时怔住了——血色禁地,墨蛟潭边,那一眼,原来她记了一千年。「原来是你。」她轻声说,声音里听不出情绪。殿中宾客面面相觑,不知这两位合体大能,为何对望了这么久。",
"cultivation.fate.nangong.story.met_guilty":
"合体大成,名动天南,掩月宗遣使来贺。为首的女修摘去面纱的刹那,你怔住了——血色禁地,墨蛟潭边,那一眼,原来你也记了一千年。她的目光越过你,落在你身侧的陈巧倩身上,停顿了一瞬,微微颔首,什么都没说。那一瞬的风度,比任何质问都重。",
"cultivation.fate.nangong.story2":
"宫宴散后,她独自立于阶前看雪。你走过去,在她身侧三步外站定。千年岁月在两个合体修士之间静静流淌——有些话不必说,有些人,只需要再并肩看一场雪。",
"cultivation.fate.nangong.story3":
"此后百年,她的传讯剑光不时落入你的洞府,或论道法,或只是一句「星海落雪了」。道心有了锚点,心魔再难侵蚀分毫——千年的修行岁月,忽然都有了去处。",

"cultivation.fate.qingyuan.story":
"飞灵族地渊深处,你遇见一缕将熄的残魂——青元子,《青元剑诀》的创始者,你此生剑道的源头。这位上古剑修看你使了三十年他初创的剑诀,残魂里透出一点欣慰:「三千年了,总算等到一个像样的传人。」他自知时日无多,便以残躯为炉,将毕生剑道真解倾囊相授。",
"cultivation.fate.qingyuan.story2":
"传功持续了七七四十九日。最后一式剑意贯入识海时,他的魂体已淡得快要看不见:「剑诀给你了,往后的路,比老夫走得远些。」青元子散作满天青光,像一场无声的雪。朝闻道,夕死可矣——你对着地渊深揖到地。",

"cultivation.fate.erying.story":
"多年前为求保命神通,你以秘法分裂神魂,育出第二元婴——一个眉眼与你一般无二的「你」。起初它只是听话的分身,替你行走、替你赴险;可百年过去,它渐渐有了自己的喜怒,近来已数次在夜里试探你布下的神魂禁制。留着是祸,放了是缘,炼化是劫——须做个了断。",
"cultivation.fate.erying.story2":
"今夜它又来了。封印之外,那张与你一模一样的脸贴着禁制轻笑:「你我本是一体,分什么彼此?你的道,凭什么由你一个人走?」它的声音就是你的声音,它眼里的不甘,你看得分明——那不甘,和当年的你一模一样。",
"cultivation.fate.erying.story3":
"它说得没错——它本就是你的一部分,是你的怯懦、你的野心、你不愿承认的那一面。炼了它,如断一臂;放了它,如纵猛虎下山。封印内外,两个「你」隔着一层灵光对望,像照镜子。",
"cultivation.fate.erying.merge.opt": "炼化归一,夺婴之力",
"cultivation.fate.erying.merge.hint": "吞掉另一个自己——道基大涨,心底却空了一块",
"cultivation.fate.erying.merge":
"炼化的过程像把自己的影子生吞下去。它的记忆、它的不甘、它百年来自学的所有小把戏,尽数化作你道基的一部分。融合完成的那一刻,你在识海里听见极轻的一声笑——「好好走,连我的份。」",
"cultivation.fate.erying.release.opt": "解封放归,各走各路",
"cultivation.fate.erying.release.hint": "世间从此多一个「你」——渡劫之期,或有一晤",
"cultivation.fate.erying.release":
"禁制解开,它怔了很久,忽然朝你深深一揖:「多谢。」转身没入夜色,再没有回头。百年后渡劫之期,有人在云端远远望见一个熟悉的身影替你挡下了第三道天雷,然后消失——那是另一个你,来还债了。",
"cultivation.fate.erying.seal.opt": "重新镇封,日后再说",
"cultivation.fate.erying.seal.hint": "封印里的冷笑夜夜不绝——有些账,迟早要还",
"cultivation.fate.erying.seal":
"你加固了十二道禁制。它在封印深处低低地笑:「我们还会见面的。」——你知道会。只是那一天的账,要比今日难算得多。",

//========== 大乘 ==========
"cultivation.fate.fenglei.story":
"大乘之境,你耗费数十年光阴,以九天风雷淬炼出一对风雷翅。翅成之日,风雷激荡百里,双翅一振瞬息千里——从此游历四方、出入秘境,再无远近之虑。多少修士梦寐以求的遁速极致,如今长在你的背上。",
"cultivation.fate.fenglei.story2":
"从此天南地北,朝碧海而暮苍梧。当年那个在七玄门山道上气喘吁吁的少年,如今振翅之间已过万水千山——修仙路远,走得越远,越要懂得回头看。",

"cultivation.fate.xiedao.story":
"一只来历成谜的金蟹傀儡寻上门来,自称「蟹道人」——通体鎏金,行动如风,寡言少语却深不可测。它替人办事只收一样东西:金雷竹。你试过它的手段,一夜之间替你摆平了积压百年的琐碎庶务,效率高得近乎诡异。",
"cultivation.fate.xiedao.story2":
"「金雷竹百根,老夫替你打工百年。」蟹道人面无表情地摊开钳子。这世上没有白来的便宜——但它办事的确让人省心。养着的,是一只谜;用着的,是一把好刀。",

//========== 渡劫 ==========
"cultivation.fate.xuanguo.story":
"大乘圆满的最后一夜,你温养了三千年的玄天灵果忽然霞光冲霄,照彻三十里云海——玄天果熟了。此果万年一熟,服之脱胎换骨,道基洗练至无瑕之境,更得五十件古宝认主为伴。万载仙途走到此处,只差最后一步:天劫。",
"cultivation.fate.xuanguo.story2":
"服果那夜,你独自坐在山巅。回首这一世——七玄门的药香、神手谷的地窖、血色禁地的那一眼、黄枫谷的桃花雨、乱星海的万里烟波……故人零落,恩怨两清,都化作丹田里这一枚霞光流转的道果。天劫已在云端酝酿,最后一跃,要开始了。",
"cultivation.fate.xuanguo.story2.bond":
"服果那夜,一道剑光自掩月宗而来。南宫婉立于庭中,递来一只护身玉佩:「天劫那日,我在台外等你。」千年墨蛟潭边的一眼,原来真的可以记这么久。你接过玉佩,忽然觉得那漫天的劫云,也没有那么可怕了。",
"cultivation.fate.xuanguo.story2.love":
"服果前夜,你独自去了趟黄枫谷故地。山门早换了主人,唯有满山桃花还像当年一样开。你在她牌位前坐到天亮,把玄天果的霞光分了一缕留在碑前——巧倩,最后一道坎了。若过得去……罢了,修仙人不信来世。",
"cultivation.fate.xuanguo.story2.twin":
"服果那夜,洞府外落下一道剑光。眉眼与你一般无二的来客负手立于月下——他回来了。「听闻你要渡劫,来看看。」第二元婴与你并肩看了一夜星斗,临走只说了一句:「别死。」——另一个你,也走到了这一步。",
"cultivation.fate.xuanguo.story3":
"霞光散尽,天穹深处传来第一声雷。你掸了掸衣袍上的露水,缓步走向渡劫台。修仙万载,求的无非是这一刻——无论成与不成,这条路上所有的抉择,都已经是答案本身。",
};

// ---------------------------------------------------------------- en ------
//Faithful English mirrors — same structure, tighter prose
const EN = {
"cultivation.fate.zhangtie.story":
"In Shenshou Valley of the Seven Mysteries Sect you were an unremarkable disciple of Doctor Mo. Zhang Tie, a village boy who joined the same day, was your only friend — blunt, broad-shouldered, always taking the whip meant for you. Out here, you were each other's only family.",
"cultivation.fate.zhangtie.story2":
"Half a month ago Zhang Tie 'went home.' Doctor Mo said it lightly — full severance, packed bags. But you remembered him swearing he wouldn't go home this year, not until he'd saved enough for his mother's cure. Since then, twice at midnight, you've smelled a cloying medicinal reek from the cellar — and heard chains dragged across stone, slow and heavy, like something turning over in the dark.",
"cultivation.fate.zhangtie.story3":
"Tonight the smell is back. You stand at the cellar mouth, palm on the cold copper lock. Where did Zhang Tie go? What's down there? What's behind the good doctor's kind face? Open this door and there is no going back to innocence — but the boy who took your whippings may be lying down there.",
"cultivation.fate.zhangtie.trace.opt": "Pick the lock tonight",
"cultivation.fate.zhangtie.trace.hint": "Those who see the truth will know that iron corpse one day",
"cultivation.fate.zhangtie.trace":
"The lock hits the floor and regret hits with it. No one inside — only a waist-high medicine vat, its walls crusted purple-black, bone grit settling at the bottom. His hatchet still hangs on the wall. You replace the lock with shaking hands. The debt is written down.",
"cultivation.fate.zhangtie.bide.opt": "Pretend you smelled nothing",
"cultivation.fate.zhangtie.bide.hint": "Survive first — but some smells follow you for life",
"cultivation.fate.zhangtie.bide":
"You stand there a while, then go back to bed. 'The less you know, the longer you live,' the jianghu saying goes — yet every rainy night, the reek and the chains return on schedule, like an unsettled account.",
"cultivation.fate.zhangtie.wary.opt": "Don't dig — just stay wary",
"cultivation.fate.zhangtie.wary.hint": "Swap the doctor's tonics for plain water",
"cultivation.fate.zhangtie.wary":
"You go back quietly. From the next month on, his 'fortifying powder' gets poured into the ravine as water. If he's kind, you waste some herbs; if not — your life rides on this suspicion.",

"cultivation.fate.bottle.story":
"Three months in, your pay is thin and pills never reach an outer disciple. Chasing a white rabbit into the back-mountain rocks, you find a small green vial under old leaves — palm-sized, neither gold nor jade, unnaturally warm, its patterns flowing like clouds.",
"cultivation.fate.bottle.story2":
"You leave it on the windowsill. At dawn a drop of emerald dew wells inside its lip and falls onto a wilted sprout in the crack — before your eyes it branches, leafs, flowers, living a year in a tea's time. You clutch the vial till your knuckles whiten: a poor man's son finally holds something no one else has.",

"cultivation.fate.feiyu.story":
"On the drill grounds there's a swordsman, Li Feiyu — a wild valley nobody who fought into the inner sect on sheer madness, 'Mad Blade Li' they call him. He doesn't know your arts are immortal; he thinks you're another quiet grinder like him, drags you to spar, and buys tavern wine on credit when he loses. In these times, friendship without calculation is rare.",
"cultivation.fate.feiyu.story2":
"Tonight he vaults your wall with two jugs of cheap wine: 'Han, when my blade is famous across Yue, you'll be in the crowd to vouch for me!' His eyes shine like stars — a mortal who'll never know what he lacks. And you think: this name deserves to be remembered.",
"cultivation.fate.feiyu.oath.opt": "Swear brotherhood with him",
"cultivation.fate.feiyu.oath.hint": "Immortal and mortal part — when you're famous, he'll be dust",
"cultivation.fate.feiyu.oath":
"You kowtow under the moon, swap cups of blood-wine. He laughs and promises three more moves tomorrow. What you can't know: years later, when cultivators ask your name, the one that comes out is his.",
"cultivation.fate.feiyu.name.opt": "Keep his name close",
"cultivation.fate.feiyu.name.hint": "'Li Feiyu' will do the roaring for you, out in the world",
"cultivation.fate.feiyu.name":
"You laugh along, and tuck the name 'Li Feiyu' next to your heart. Years on, it will thunder across the Chaotic Star Sea's warrants and Heaven South's rolls — while the real man lies long in an unmarked grave.",
"cultivation.fate.feiyu.decline.opt": "Drift apart, cold and clean",
"cultivation.fate.feiyu.decline.hint": "A cultivator needs no mortal ties — true, and heavy",
"cultivation.fate.feiyu.decline":
"You start pleading illness. He comes three times; the last, he leaves half a jar at your door and goes, scratching his head. No more shouting outside the gate. The first lesson of cultivation is letting go.",

"cultivation.fate.mojuren.story":
"Mo Juren — Doctor Mo of Shenshou Valley, 'Silver Hand, Buddha Heart' — heals all comers and treats you like a son. He taught you the Eternal Spring Art, sends monthly tonics, and brags his disciple is cultivation stock. If not for the night you carried a wax-sealed letter to his room, you'd have believed it forever.",
"cultivation.fate.mojuren.story2":
"In his candlelit study, hunting a prescription, you find a manual written in blood — the Grand Possession Art. Mastered, it lets a soul seize a young cultivator's body and live again; the ideal vessel: 'a spiritually-rooted youth of shallow cultivation.' You can't steady your hands enough to light the lamp. Three years of fatherly care — watering a herb.",
"cultivation.fate.mojuren.story3":
"That night he enters with his familiar scent of herbs; the candle dies with no wind. The kind face stretches into another shape. 'Good disciple — this body of mine hasn't many years left. Yours will do nicely.' A soul like ink pours from his brow into your sea of consciousness. The account between master and pupil comes due.",
"cultivation.fate.mojuren.kill.opt": "Destroy his soul, utterly",
"cultivation.fate.mojuren.kill.hint": "Kill your master — end the debt and the threat, keep only the sigh",
"cultivation.fate.mojuren.kill":
"The soul-battle is silent and vicious. Your Eternal-Spring-forged spirit grinds his remnant to nothing — at the end he stops struggling and sighs, 'A pity.' A pity you weren't his vessel, or a pity for the years? You don't ask. By dawn, Shenshou Valley has lost a doctor, and your eyes have grown a frost that never thaws.",
"cultivation.fate.mojuren.spare.opt": "Seal his remnant soul instead",
"cultivation.fate.mojuren.spare.hint": "For three years of teaching, one mercy — a caged tiger bites back",
"cultivation.fate.mojuren.spare":
"You win, but can't kill him. For three years of teaching, you seal his remnant into a black-iron artifact, warded thrice. His laugh is cold from inside: 'Good disciple — I'll wait.' And at Core Formation, you remember he did.",

"cultivation.fate.jinguang.story":
"Disaster arrives without warning. Jinguang the Wanderer — a rogue cultivator preying on mortals with a single talisman treasure — brings bandits up the Seven Mysteries mountain. The charm's golden light turns every blade; sect masters' swords spark off it. The Sect Master's broken sword still stands in the drill yard, blood running along the cracks to your feet. Mortals cannot stop a cultivator.",
"cultivation.fate.jinguang.story2":
"Except that you are no longer fully mortal. Jinguang is torching the scripture hall, laughing inside his golden shell, blind to the figure behind him. Your hand finds the little sword you've fed for three years — kill him and hundreds live; melt into the crowd and you'll still walk out alive. Only this: retreat today, and every later wall you meet will have tonight's face.",
"cultivation.fate.jinguang.fight.opt": "Stand forward and cut him down",
"cultivation.fate.jinguang.fight.hint": "Tonight the mortal world is yours to hold — his relics may hide an ascension token",
"cultivation.fate.jinguang.fight":
"Your blade's whistle splits the golden light like glass. Jinguang dies staring at you as at a monster — who hides a true cultivator among mortals? The fires die by dawn; in his pack you find a token of neither gold nor jade, two ancient seal-script characters: 'Ascension.' A key to the immortal gates, you learn much later.",
"cultivation.fate.jinguang.flee.opt": "Take the vial and slip away",
"cultivation.fate.jinguang.flee.hint": "Live first — but the fire will burn in your dreams for years",
"cultivation.fate.jinguang.flee":
"Vial against your chest, you drop down the back cliff in the dark. The blaze paints half the sky red; screams chase you thirty li on the wind. You live — but some nights that fire still walks into your dreams and keeps you sitting up till morning.",

"cultivation.fate.xuese.story":
"Qi complete, one step from Foundation — yet the Zhu Ji pill's key herb, the Nine-Bend Spirit Ginseng, grows in bulk in one place only: the Blood-Forbidden Land. It opens once a decade; each sect sends Qi disciples in to gather. Spirit herbs everywhere, beasts everywhere — and more dangerous than beasts, people. Three in ten walk out.",
"cultivation.fate.xuese.story2":
"No sun or moon in the valley. On the third dusk, following a herb-scent, you reach Dark Flood Pond and walk into a fight: a silver-robed woman bound at the pond's heart by a black flood dragon, hair loose, protective light thin as rice paper. The jade at her waist marks Yanyue Sect — first of the seven — inner disciple, Nangong Wan. Her eyes flick to you once, then back to the beast.",
"cultivation.fate.xuese.story3":
"Strike, or watch? The dragon's strength could pulp you; yet the five-hundred-year ginseng glints below the pond — and if she dies, you are next. The water churns; the dragon's slit pupils are already turning your way.",
"cultivation.fate.xuese.jiao.opt": "Aid her — kill the dragon together",
"cultivation.fate.xuese.jiao.hint": "Split the spoils — and she will remember this glance (meet Nangong Wan)",
"cultivation.fate.xuese.jiao":
"You burst out — three talismans seal its eyes, her sword reads the opening and takes the throat. Sharing spoils, she lifts a corner of her veil — a face cold and clear as the moon — and nods: 'Nangong Wan of Yanyue Sect. I'll remember.' A chance meeting, you think. You don't know that glance takes a thousand years to repay.",
"cultivation.fate.xuese.lurk.opt": "Hide — let the mantis hunt",
"cultivation.fate.xuese.lurk.hint": "If she dies the herbs are all yours; if she lives — no one knows you watched",
"cultivation.fate.xuese.lurk":
"Behind the rocks you watch her fight free, wounded, and vanish — then slip down and dig up the ginseng plus seven or eight century herbs. Loaded, you tell yourself: only the living get to argue morality. Still, that bloodied silver figure visits your dreams now and then.",

"cultivation.fate.qixuan.story":
"Leaving Seven Mysteries, you travel a thousand li to Yellow Maple Valley, one of Yue's seven sects. Three thousand stone steps climb into cloud; the gate disciple tests your root and strikes a line in the roll: 'Outer disciple — one torn volume of the Azure Essence Sword Art, three mu of spirit field, ten spirit stones a month.' Henceforth, the mortal blades are clouds below the mountain.",
"cultivation.fate.qixuan.story.token":
"At Yellow Maple's gate you present the Ascension Token taken from Jinguang's relics. The gate disciple's face changes; half an hour later a Foundation steward leads you in himself: 'Token-bearers enter the inner sect.' So that night's work pays out here: the full Sword Art, field and cave estate, and weight in the eyes of your peers.",
"cultivation.fate.qixuan.story2":
"Life in the valley is spare and steady — tending the field by day, grinding the sword art by night, breathing with the mountain's insects. Sometimes Shenshou's medicine smell, the cellar's chains, that rainy-night study come back. Past is past. The road under your feet now is a true immortal path.",

"cultivation.fate.tainan.story":
"The Tainan Valley rogue-cultivator fair runs once in five years — the sectless gather, spending life savings on pages, seeds, beast bones. You go disguised, rough cloth among the crowd, and almost feel mortal again.",
"cultivation.fate.tainan.story2":
"At a one-armed veteran's stall you stop. Three goods: a half-burnt fragment of a sword manual, a pouch of shriveled herb seeds, a jug of rough wine. The old man squints: 'New face. Pick one.' Your stones cover one.",
"cultivation.fate.tainan.sword.opt": "Buy the half sword-manual",
"cultivation.fate.tainan.sword.hint": "It may rhyme with your torn Azure Essence scroll",
"cultivation.fate.tainan.sword":
"The fragment's sword-intent hums against your torn scroll — same lineage. On the road home you grasp three tenths more of the way. The old man pockets your stones, smiling like he knew.",
"cultivation.fate.tainan.seed.opt": "Take the shriveled seeds",
"cultivation.fate.tainan.seed.hint": "Dead seeds? To the Heaven Vial, no herb is truly dead",
"cultivation.fate.tainan.seed":
"That night you plant the seeds with a drop of vial-dew. By morning the bed bristles green. If the old man saw his 'dead stock' blooming here, his jaw would drop to the dirt.",
"cultivation.fate.tainan.wine.opt": "Buy the wine — and the stories",
"cultivation.fate.tainan.wine.hint": "A rogue's mouth holds real news — first word of the Chaotic Star Sea",
"cultivation.fate.tainan.wine":
"Three bowls in, the stories pour: 'The Chaotic Star Sea, they say — beast cores spent like stones! Few who crossed came back; but those who did came back kings.' You quietly write the name on your heart.",

"cultivation.fate.fengyun.story":
"At Foundation you undertake a great work: the vial ripens three-thousand-year golden thunder bamboo, three hundred days at the furnace — and yields seventy-two Bamboo Cloudswarm Swords. On completion, bees hum all night and the hill glints green — seventy-two swords flying as one will; peers of your rank cannot stand the swarm.",
"cultivation.fate.fengyun.story2":
"Thereafter the world has fewer teeth. The swarm parts beasts; common robbers turn at your first sword-light. Stroking the sword-pill in your palm you finally understand Mo Juren's hunger — power itself is the sweetest sound there is.",

"cultivation.fate.zhengmo.story":
"Peace lasted so long everyone forgot the Devil Dao's six sects sharpening knives beyond the border. Late autumn — beacons ignite overnight. The Righteous-Devil War: devil-fire floods Yue, the seven sects lose battle after battle. Yellow Maple empties its strength and still loses ground; the villages below burn to white ground, and refugees' cries climb the mountain road all the way to the summit.",
"cultivation.fate.zhengmo.story2":
"The elders' council sits three days and reaches one word: 'seed.' The elite withdraw first; the old and weak hold the pass. You are not on the withdrawal list — a new Core with no faction, exactly the sort left behind to buy hours with a body.",
"cultivation.fate.zhengmo.story3":
"The night before retreat, the mountain rustles with packing. Some kneel to their masters, some weep into the spirit fields, and some — like you — stand in the wind over the fires below, doing cold arithmetic: staying is near-certain death; slipping away is a thread of life. No one sleeps tonight.",
"cultivation.fate.zhengmo.rear.opt": "Stay — hold the pass a while",
"cultivation.fate.zhengmo.rear.hint": "Buy the sect its thread of life — the survivors will know who held the ridge",
"cultivation.fate.zhengmo.rear":
"You stay. When the devil-fire comes you and a few dozen volunteers hold the pass — talismans, then swords, then fists. Dawn finds the valley empty and you walking out of a corpse-hill, soaked in blood. No one behind you calls the factionless Core cultivator small again.",
"cultivation.fate.zhengmo.slip.opt": "Slip away in the chaos",
"cultivation.fate.zhengmo.slip.hint": "Live first — but 'deserter' trails your name for years",
"cultivation.fate.zhengmo.slip":
"In the thick of the crowd you change to a rogue's clothes and go. Yellow Maple burns three days behind you; you never look back. On this road, only the living get to argue right and wrong — but sometimes, peach blossoms still find you.",

"cultivation.fate.duoshi.story":
"At the tightest moment of Core Formation, the black-iron artifact on your chest goes scalding — you almost forgot what it holds. Mo Juren's remnant erupts from its cage, years of venom behind it, lunging for your violet palace: 'Good disciple — I told you. Your body. Lend it.' He has waited a whole realm for this.",
"cultivation.fate.duoshi.story2":
"Souls grapple in the mind-sea, crueller than any blade. His soul-force is withered but venomous, chewing at your reason where heart-demons breed; yours is at Core-strength but dares not strike full — lest it crack your newborn core. In the dark he talks, almost tender: the day he took you in was for your root; but the three years' teaching was not all false.",
"cultivation.fate.duoshi.story3":
"'Master.' Your voice rings level through the mind-sea. 'You're right — this body is fine cultivation stock. Which is why you can't have it.' The remnant falters — and you strike.",
"cultivation.fate.duoshi.burn.opt": "Burn his remnant to ash",
"cultivation.fate.duoshi.burn.hint": "Burn the last of him — the account closes tonight",
"cultivation.fate.duoshi.burn":
"In soul-fire like southern brilliance the remnant curls to ash. At the very end he stops cursing and says something soft — 'Eternal Spring, ninth layer,' or only a sigh. You open your eyes to snow at the window. There is no more Doctor Mo.",
"cultivation.fate.duoshi.tame.opt": "Bind him into service",
"cultivation.fate.duoshi.tame.hint": "He cannot die — but his lifetime of alchemy can serve you",
"cultivation.fate.duoshi.tame":
"You re-seal the shattered soul, triple-warded, branded with a master-servant pact. He accepts the loss: 'So be it… my lifetime of medicine and pill-lore — take it as a keepsake.' Henceforth your pill-path has a ghost guide — his whole art, prolonging him the only way left.",

"cultivation.fate.chen.story":
"The night before the retreat from Yellow Maple, the wind at the crossing is sharp. Chen Qiaoqian — the Sect Master's only daughter, the valley's acknowledged pearl — waits there alone for you. Over the years she shielded you from stewards, pressed warm hand-warmers on you, split her rations when your field failed. Now she presses a tightly-sewn pouch on you: dried peach blossoms, three pills she refined herself, and an unsigned letter.",
"cultivation.fate.chen.story2":
"'Safe travels, cultivator.' She turns to go, stops, and says with her back to you: 'When the spirit field burned and you took the blame for me… I knew then.' Wind takes her hair. With Heaven South burning and the road endless, some words unspoken tonight may never be said.",
"cultivation.fate.chen.dao.opt": "Decline — the Dao comes first",
"cultivation.fate.chen.dao.hint": "The peach rain of Yellow Maple, thereafter only in dreams",
"cultivation.fate.chen.dao":
"You gently push the pouch back and take a single dried blossom: 'The path is long — don't let me waste yours.' She looks at you a long while, then laughs, and the laugh turns wet: 'Of course. It's you.' The crossing empties; the blossom follows the water.",
"cultivation.fate.chen.love.opt": "Take her hand — walk together",
"cultivation.fate.chen.love.hint": "A bond in wartime — she will stand beside you when the realms reunite",
"cultivation.fate.chen.love":
"You take her cold hand: 'If I live past the Star Sea, I'll come back and marry you.' She laughs through tears and hangs a jade pendant around your neck — a hundred years later you learn it holds a strand of her life-bound essence.",
"cultivation.fate.chen.forget.opt": "Say nothing — let the river take it",
"cultivation.fate.chen.forget.hint": "The cleanest goodbye — and the deepest cut",
"cultivation.fate.chen.forget":
"You don't take the pouch. You don't speak. When the morning fog lifts the crossing is empty; one blossom on the stone she stood on, blown into the water. You tell yourself it was the right ending — and for centuries after, avoid every place where peach trees bloom.",

"cultivation.fate.chuansong.story":
"The war creeps closer; Heaven South has no clean ground left. On the run, deep in a desert-island cave, you find a ruined ancient teleport array — runes beyond present craft, its eye still holding light ten thousand years old. The torn chart names the far side: the Chaotic Star Sea — beasts and fortunes beyond the law of men.",
"cultivation.fate.chuansong.story2":
"Repairs need time, and the devil-fire is only a few hundred li off. Surf thunders outside; runes flicker within. The array is the only road out — and a road of no return: what waits on the far side no one promises. Go, or stay?",
"cultivation.fate.chuansong.sail.opt": "Spend all you have — sail for the Star Sea",
"cultivation.fate.chuansong.sail.hint": "Leave Heaven South's debts behind; start over where no one knows your face",
"cultivation.fate.chuansong.sail":
"Three months of day-and-night work; the runes wake one by one. Stepping into the eye you glance once toward Heaven South — years, maybe forever, until return. Light spears the cave roof and you are gone, leaving only the tide-hum of the array. The Chaotic Star Sea receives you.",
"cultivation.fate.chuansong.seal.opt": "Map it, seal the cave, stay",
"cultivation.fate.chuansong.seal.hint": "A hidden way out for later — but distant water can't quench a close fire",
"cultivation.fate.chuansong.seal":
"You copy the full chart and seal the cave behind wards. A buried way out — if Heaven South ever becomes unlivable, the Sea is your bolt-hole. For now, you still have to survive the war.",

"cultivation.fate.shijin.story":
"On an unnamed reef deep in the Sea you find a nest of ancient insects — Gold-Devouring Beetles. The books rank them among the top strange breeds: ten thousand loose like a golden tide, eating metal and stone; what they pass over turns to dust, and their shed shells make peerless forging stock. Many an ancient power rode a swarm to dominance.",
"cultivation.fate.shijin.story2":
"Raising them is painstaking — feeding, splitting the nest, taming. But when the first wave folds into a small gold cloud in your palm, you know the cost was right: your cave gains its most loyal guards, your enemies a most horrible way to die.",

"cultivation.fate.dayan.story":
"Inside a ruined ancient puppet, a voice answers you. Sealed in the husk is a thousand-year remnant soul — Grand Evolution, in life the peerless master of puppetry and soul-sense, who before dying forged himself into this shell and woke alone in the dark for a millennium. 'Three hundred years,' his voice rasps like rusted iron, 'and you're the first who could hear me.'",
"cultivation.fate.dayan.story2":
"His terms are simple: he teaches you the Grand Evolution Art of soul-sense and the puppet way; you find him a vessel to lodge in — or see him off on his last journey. 'I taught everyone everything in my life,' the remnant says, 'except how to die.' In his laugh you can't tell detachment from grief.",
"cultivation.fate.dayan.disciple.opt": "Kneel, and take him as master",
"cultivation.fate.dayan.disciple.hint": "The true Grand Evolution transmission — a teacher's last gift",
"cultivation.fate.dayan.disciple":
"You bow three times, old rite. He accepts it, silent a long moment: 'Rise. My last disciple — a junior a thousand years late.' The soul-sense methods pour into you like a river entering the sea. The cheapest bow you ever made.",
"cultivation.fate.dayan.puppet.opt": "Trade only for the puppet art",
"cultivation.fate.dayan.puppet.hint": "No master, no debt — wooden puppets that mine day and night",
"cultivation.fate.dayan.puppet":
"'Fine. Titles of master and disciple stopped mattering to me ages ago.' He gives you the whole art. Three months on, the first iron-wood puppets walk out of the workshop and mine around the clock — your spirit-stone income need never worry again.",

"cultivation.fate.tihun.story":
"Hunting beasts in the deep Sea, in a cave like a lone grave you meet a strange beast: ink-black all over but for two green eyes, its cry like an infant's night-wail. The books name it — the Weeping Soul beast, bane of ghosts and souls, whose roar routs a hundred wraiths. It studies your soul a moment, then comes over and rubs your palm.",
"cultivation.fate.tihun.story2":
"To befriend a Weeping Soul is outrageous luck — devil-cultivators and ghost-arts bow to you now, and the heart-demon phantoms of your breakthroughs are mere meals to it. Yet the beast's origin is strange; the nameless grave deeper in the cave, you never dare to dig. Some secrets are better left on the seafloor.",

"cultivation.fate.yinyue.story":
"Fresh from the Ascension tribulation, the bonded treasure you've warmed for years stirs — its sleeping artifact-spirit wakes. She calls herself Silver Moon: silver-haired, a wolf-clan demon cultivator who went to war beside a master ten thousand years dead, and slept in the blade ever since. 'Seas into fields,' she says softly, watching the clouds outside. 'So this is what the world became.'",
"cultivation.fate.yinyue.story2":
"Her stay or go is a hard question. Bound, the treasure outthinks your old limits, answering thought like a limb; but the thirst for freedom in her eyes is plain — the same look you wore once, clutching a little vial.",
"cultivation.fate.yinyue.bind.opt": "Ask her to stay — bound spirit",
"cultivation.fate.yinyue.bind.hint": "A sentient treasure: +10% to all production — she agrees softly, like moonlight",
"cultivation.fate.yinyue.bind":
"'Ten thousand years waited; one lifetime more is nothing.' Silver Moon smiles and melts into the treasure's light. It answers you like a living thing — though some nights, faint singing drifts out of the blade: wolf-song, or a lullaby.",
"cultivation.fate.yinyue.free.opt": "Unbind her — let her go",
"cultivation.fate.yinyue.free.hint": "Ten thousand years of cage ends — the Spirit Realm may remember you",
"cultivation.fate.yinyue.free":
"The day the seal breaks she rings you three times as a silver rainbow — 'See you in the Spirit Realm' — and is gone into cloud. The blade is weaker; you are not sorry. Some debts must be paid; some people should not be kept.",

"cultivation.fate.yuanyao.story":
"Among letters from old Star Sea friends comes a slender-handed note — Yuanyao, a woman cultivator you met a few times back then, now caught in a storm over a treasure: a few islands' worth of hunters on her trail. She asks for nothing. Only: 'It's been years since the Sea — are you well, old friend?' A blot of ink spreads at the signature like an unshed tear.",
"cultivation.fate.yuanyao.story2":
"The old days surface: a bright, proud Foundation cultivator who once fed herself to a devil to save her senior sister. Centuries on, she is still standing in the wind and blades. Help, or don't?",
"cultivation.fate.yuanyao.aid.opt": "Go — settle the hunt for her",
"cultivation.fate.yuanyao.aid.hint": "Debts among cultivators are hardest to repay — she'll remember",
"cultivation.fate.yuanyao.aid":
"You arrive on the tide and end the bounty in three days. She bows deeply on the reef and says nothing — but ever after, at every great breakthrough of yours, a message reading only 'Take care' arrives on time.",
"cultivation.fate.yuanyao.bond.opt": "Stand beside her — as a true friend",
"cultivation.fate.yuanyao.bond.hint": "Coal in the snow — the Sea gains a back you can guard; her letters will come",
"cultivation.fate.yuanyao.bond":
"'Between us, no thanks.' You sit out the night on the reef, trading Star Sea gossip for Heaven South peach blossoms. At parting she gives you a message talisman: 'The Sea is wide — it's good to have someone to talk to.' Ever since, greetings from far waters reach your cave.",

"cultivation.fate.quhun.story":
"At Void Refinement you mean to forge a guardian puppet. From a Star Sea rogue you buy, at weighty cost, an iron corpse refined from an ancient cultivator's remains: flesh incorrupt, iron-armored, baleful aura sealed within — peerless stock for a dao-soldier. The seller says it came off a battlefield in Heaven South, changing hands for centuries.",
"cultivation.fate.quhun.story.known":
"At Void Refinement you mean to forge a guardian puppet. From a Star Sea rogue you buy, at weighty cost, an iron corpse refined from an ancient cultivator's remains. The seller says it came out of Heaven South — and your heart sinks without cause. Centuries ago, Shenshou Valley, a midnight medicine vat, chains dragged over stone… You press the cold faceplate a long time without lifting it.",
"cultivation.fate.quhun.story2":
"At the last moment before the rites begin, you lift the faceplate —",
"cultivation.fate.quhun.story2.known":
"The plate slides away and your blood runs cold. Under the iron is Zhang Tie's honest face — almost as it was, only it will never smile again. The vat in the cellar, Mo Juren's art, the erased body… so this is where he went. He was here all along.",
"cultivation.fate.quhun.story3":
"The refining array is set. The soul-binding talisman flares in your fingers, dies, flares again — inside this shell once lived a boy who took your whippings. Refine him, and he's your most loyal soldier; bury him, and he's your friend forever. Refine — or bury?",
"cultivation.fate.quhun.bury.opt": "Seal the furnace — bury him",
"cultivation.fate.quhun.bury.hint": "Into the earth with a name — Zhang Tie, not a dao-soldier",
"cultivation.fate.quhun.bury":
"On a nameless ridge you raise a stone with four characters: 'Old Friend Zhang Tie.' Covering the earth, you remember an evening long ago — three lashes he took for you, grinning through it. The mountain keeps his bones. May his next life never see a sect gate.",
"cultivation.fate.quhun.wield.opt": "Refine him — the puppet Qu Hun",
"cultivation.fate.quhun.wield.hint": "Your old friend's body guards you now, tireless — another way to live",
"cultivation.fate.quhun.wield":
"The talisman sets; the corpse opens its eyes — no light in them, only dead loyalty. You give him a new name: Qu Hun. 'Guard me,' you say, stroking the cold iron, soft as if to yourself. 'This time — let me protect you.'",

"cultivation.fate.xugu.story":
"Deep in a desert-island cave mansion, a jade-white skeleton opens its eyes — Xuan Gu, a devil-dao colossus of the Star Sea ten thousand years gone, whose remnant clings to the bones. Unhurried, he dusts his ribs: 'That you reached this place, young friend, is fate.' The smile is warm; the eyes are colder than the skull. Ten-thousand-year ghosts burn no cheap oil.",
"cultivation.fate.xugu.story2":
"He proposes a hunt: the inner halls of the Heavenvoid Palace hold ancient hoards, warded so deep that two must work as one. 'Split even — what say you?' The terms are watertight. Deal with the tiger — or flip the table now?",
"cultivation.fate.xugu.ally.opt": "Play along — hunt beside him",
"cultivation.fate.xugu.ally.hint": "Two liars walking together — the day the hoard opens, the account falls due",
"cultivation.fate.xugu.ally":
"You clasp hands as allies, all smiles, each privately ordering the other's coffin. Months on, his knowledge genuinely opens your eyes — but every night you can feel the gaze of a thing appraising prey, sticky on your back.",
"cultivation.fate.xugu.slay.opt": "Strike first while his soul is weak",
"cultivation.fate.xugu.slay.hint": "A ten-thousand-year remnant is still a remnant — take his hoard and end it",
"cultivation.fate.xugu.slay":
"Flame blooms in your palm; his laugh stops short: 'Ruthless little—' 'As you were.' The jade bones crumble; beneath his skull-pillow you find a storage ring — slim on stones, but holding half a sea chart with the Heavenvoid Palace marked clear.",

"cultivation.fate.xutian.story":
"The Heavenvoid Palace — a fallen-immortal vault that opens once in ten thousand years. In the ice cavern of its inner hall the treasures gleam within reach: the Azure Frostflame, coldest of fires for tempering a dao-foundation; and the Heaven-Mending Pill, whose sealed fragrance is said to wash marrow and rebuild bone. The wards crack like a spreading web. One breath to take.",
"cultivation.fate.xutian.story.betray":
"The inner hall's ice cavern, the hoard within reach — and as the wards crack, the hairs on your neck rise. Xuan Gu sheds his mild face at last: 'Young friend — the treasures are mine. Your body is mine as well.' A ten-thousand-year strike lands silent at your back. You always knew he'd turn; you didn't think he'd pick the one breath you couldn't spare.",
"cultivation.fate.xutian.story2":
"Treasure-light floods the cavern. Frostflame or pill — one only — and Xuan Gu's assault is already on you. Fight and take, in a single breath: decide.",
"cultivation.fate.xutian.story2.betray":
"Treasure-light floods the cavern. You twist aside from the killing blow, but a soul-thread of his possession art is already cold around your right arm. Frostflame and pill lie paces away — treasure first, or your life?",
"cultivation.fate.xutian.story3":
"The flame's ghost-light, the pill's scent, the old ghost's grin — all of it crowds into a single instant. Centuries taught you to stake your life on one thought. So — which thought?",
"cultivation.fate.xutian.tihun.opt": "Loose the Weeping Soul on him",
"cultivation.fate.xutian.tihun.hint": "Predator meets bane — let him be devoured; the whole hoard is yours",
"cultivation.fate.xutian.tihun":
"The moment the Weeping Soul leaves its case, Xuan Gu's grin freezes. A single infant-wail from the green-eyed beast and his soul rips off your arm like water down a throat — 'Young friend, spare—' The plea ends in the beast's mouth. Silence; the hoard is yours. Ten-thousand-year Xuan Gu — dessert.",
"cultivation.fate.xutian.flame.opt": "Take the Azure Frostflame",
"cultivation.fate.xutian.flame.opt.betray": "Fight while you take the Frostflame",
"cultivation.fate.xutian.flame.hint": "A fire for tempering the dao-foundation — once in ten thousand years",
"cultivation.fate.xutian.flame":
"You snatch the Frostflame into a jade case; its cold climbs your arm to your spirit platform and fuses into your foundation like thunder. Xuan Gu's roar fades behind you — flame in hand, the Palace has paid.",
"cultivation.fate.xutian.pill.opt": "Take the Heaven-Mending Pill",
"cultivation.fate.xutian.pill.opt.betray": "Fight while you take the pill",
"cultivation.fate.xutian.pill.hint": "Ten thousand years of potency — every heart-demon washed away",
"cultivation.fate.xutian.pill":
"The pill melts on your tongue — ten millennia of potency thawing through you like spring through a river. Old wounds, clinging demons, smoothed away inch by inch. One pill: a hundred years of bitter cultivation.",

"cultivation.fate.nangong.story":
"At Fusion your name thunders through Heaven South; Yanyue Sect sends envoys with congratulations. Their leader lifts her veil — a face cold and clear as the moon, a bearing that bows the whole hall — Nangong Wan, the sect's once-in-a-millennium genius. She studies you a long moment, something familiar she can't place. You lower your eyes. Some pasts are best left.",
"cultivation.fate.nangong.story.met":
"At Fusion your name thunders through Heaven South; Yanyue Sect sends envoys. Their leader lifts her veil — and you both freeze. The Blood-Forbidden Land, the Dark Flood Pond: she held that glance for a thousand years. 'So it's you,' she says, unreadable. Around the hall, guests wonder why two Fusion powers are staring so long.",
"cultivation.fate.nangong.story.met_guilty":
"At Fusion your name thunders through Heaven South; Yanyue Sect sends envoys. Their leader lifts her veil — and you freeze. The Blood-Forbidden Land, the Dark Flood Pond: you held that glance for a thousand years too. Her gaze moves past you to Chen Qiaoqian at your side, pauses — and she inclines her head, saying nothing. That moment's grace outweighs any accusation.",
"cultivation.fate.nangong.story2":
"After the banquet she stands alone on the steps, watching snow. You walk over and stop three paces off. A thousand years flows quietly between two Fusion cultivators — some words don't need saying; some people only need one more snow watched side by side.",
"cultivation.fate.nangong.story3":
"For a hundred years after, her sword-messages fall into your cave now and then — a point of dao, or just 'snow over the Star Sea.' The dao-heart has an anchor; heart-demons cannot get a hold. A thousand years of cultivation suddenly has somewhere to go.",

"cultivation.fate.qingyuan.story":
"Deep in the Feiling clan's abyss you meet a guttering remnant soul — Qing Yuanzi, founder of the Azure Essence Sword Art, the source of your whole blade-path. Watching you wield his art for thirty years, the old swordmaster shows a remnant's contentment: 'Three thousand years, and at last a worthy bearer.' Knowing his time is short, he pours his lifetime of sword-truth into you.",
"cultivation.fate.qingyuan.story2":
"The transmission lasts forty-nine days. As the last intent threads into your mind-sea, his soul is already nearly gone: 'The art is yours. Walk it further than I did.' Qing Yuanzi scatters into green light like silent snow. 'Hear the Way at dawn; die content at dusk' — you bow to the abyss, deep and long.",

"cultivation.fate.erying.story":
"Years ago, for a life-saving art, you split your soul and bred a second Nascent Soul — a 'you' with your own face. At first it was an obedient avatar, walking and risking in your place; but a hundred years on, it has its own tempers, and lately it keeps testing your soul-wards at night. Keeping it is a threat; freeing it is karma; devouring it is a tribulation. Time to settle this.",
"cultivation.fate.erying.story2":
"Tonight it's here again. Outside the seal, your own face presses close, smiling: 'We are one flesh — why draw lines? Your Dao — why should you alone get to walk it?' Its voice is your voice; and the grievance in its eyes is exactly the one you carried once.",
"cultivation.fate.erying.story3":
"It's not wrong — it is your part: your fear, your ambition, the face you wouldn't admit. Devour it and you sever an arm; free it and you loose a tiger. Inside and outside the seal, two 'yous' regard each other across a film of light, like a mirror.",
"cultivation.fate.erying.merge.opt": "Devour it — take the soul's power",
"cultivation.fate.erying.merge.hint": "Swallow your other self — the foundation swells; something in you goes quiet",
"cultivation.fate.erying.merge":
"Devouring it is like swallowing your own shadow — its memories, its grudges, every trick it taught itself in a hundred years, all folded into your foundation. At the end, in the mind-sea, a soft laugh: 'Walk well — take my share too.'",
"cultivation.fate.erying.release.opt": "Unseal it — each walks free",
"cultivation.fate.erying.release.hint": "The world gains a second 'you' — you may meet again, at tribulation",
"cultivation.fate.erying.release":
"The seal opens; it stands stunned a long while, then bows deeply: 'Thank you.' It melts into the night and doesn't look back. A hundred years later, at your tribulation, a watcher on the clouds swears a familiar figure took the third bolt for you — then vanished. Your other self came to pay a debt.",
"cultivation.fate.erying.seal.opt": "Re-seal it — deal later",
"cultivation.fate.erying.seal.hint": "Cold laughter in the ward every night — some debts only grow",
"cultivation.fate.erying.seal":
"You lay twelve stronger wards. Deep in the seal it laughs low: 'We will meet again.' You know you will. And that day's accounting will be harder than this one.",

"cultivation.fate.fenglei.story":
"At Great Vehicle, decades of work in ninefold wind and thunder forge a pair of Wind-Thunder Wings. The day they form, storm-light shakes a hundred li; one beat carries you a thousand li — wanderings and rifts are near or far no more. The utmost escape-speed every cultivator dreams of now grows from your back.",
"cultivation.fate.fenglei.story2":
"From then on, morning on the blue sea, dusk on the dark parasol-tree. The boy who once gasped up the Seven Mysteries' mountain path now covers rivers and mountains between wingbeats — the further the road, the more you learn to look back.",

"cultivation.fate.xiedao.story":
"A gold crab-puppet of unknown origin arrives at your door, calling itself Daoist Crab — gilded carapace, wind-quick, taciturn and unreadably deep. It works for one payment only: golden thunder bamboo. You test it once — it clears a century of backlog overnight, with an efficiency that is almost eerie.",
"cultivation.fate.xiedao.story2":
"'A hundred roots of thunder bamboo — a hundred years of my work.' The Daoist spreads its claws, expressionless. Nothing in this world comes free — but its work is truly easy on the mind. What you keep is a riddle; what you wield is a blade.",

"cultivation.fate.xuanguo.story":
"On the last night of Great-Vehicle perfection, the Mystic Heaven Fruit you've tended for three thousand years flares — rosy light soaring thirty li through the cloud-sea. The fruit is ripe. Once in ten thousand years; eating it sheds the mortal frame, tempers the dao-foundation flawless, and fifty ancient treasures acknowledge you. Ten thousand years of the path — one step left: the Tribulation.",
"cultivation.fate.xuanguo.story2":
"That night you sit alone on the peak. Looking back over this life — the medicine smell of Seven Mysteries, the cellar in Shenshou, that glance by the flood pond, the peach rain of Yellow Maple, ten thousand li of the Star Sea's waves… old friends scattered, debts settled, all folded into the dawn-colored dao-fruit in your core. Thunder is already brewing. The last leap begins.",
"cultivation.fate.xuanguo.story2.bond":
"That night a sword-light comes from Yanyue. Nangong Wan stands in your court and holds out a protective jade: 'On tribulation day, I'll wait beyond the dais.' One glance by a flood pond a thousand years ago — and she kept it this long. You take the jade; the gathering storm-clouds look less terrible.",
"cultivation.fate.xuanguo.story2.love":
"The night before, you go alone to old Yellow Maple. The gates hold strangers now; only the peach trees bloom as they did. You sit at her tablet till dawn and leave a strand of the fruit's light at the stone — Qiaoqian, the last wall. If I pass it… but cultivators don't believe in next lives.",
"cultivation.fate.xuanguo.story2.twin":
"That night a sword-light lands outside your cave. A visitor with your own face stands hands-clasped under the moon — he's back. 'Heard you're taking the Tribulation. Came to watch.' Your second self sits out the stars with you, and leaving, says only: 'Don't die.' The other you has come this far too.",
"cultivation.fate.xuanguo.story3":
"The rosy light fades; the sky's depth rumbles once. You brush dew off your robe and walk toward the tribulation dais. Ten thousand years of seeking, all for this breath — pass or fail, every choice on the road was already the answer.",
};

// ------------------------------------------------------------- apply ------
function apply(file, dict){
	const j = JSON.parse(fs.readFileSync(file, "utf8"));
	let n = 0;
	for (const k in dict){ j[k] = dict[k]; n++; }
	fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n", "utf8");
	return n;
}

const n1 = apply("res/i18n/zh.json", ZH);
const n2 = apply("res/i18n/crowdin/zh.json", ZH);
const n3 = apply("res/i18n/en.json", EN);
console.log("zh:", n1, "crowdin-zh:", n2, "en:", n3);
