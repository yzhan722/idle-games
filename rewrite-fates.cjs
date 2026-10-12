// 仙缘剧情线全量原创化:结构与因果链不变,人名地名法宝全部原创
// 替换表:张铁→阿岩 墨居仁/神手谷→温九针/回春坞 七玄门→青峰门 掌天瓶→凝露瓶
// 长春功→养气经 厉飞雨→岳惊澜 金光上人→血符上人 黄枫谷→苍梧山 青元剑诀→乙木剑诀
// 血色禁地→葬魂谷 掩月宗→揽月宫 南宫婉→冷凝霜 乱星海→坠星海 天南→南荒
// 陈巧倩→顾清梧 大衍神君→千机叟 噬金虫→金蠹虫 啼魂兽→吞魄兽 银月→朔月
// 元瑶→沈青蘅 曲魂→铁衣 玄骨→冥骨 虚天殿→陨仙殿 青元子→乙木剑祖
// 蟹道人→铜甲翁 玄天果→鸿蒙道果 金雷竹→紫雷竹 风雷翅→风霆翼
const fs = require('fs');
const M = {
//———— 凡尘篇 ————
'cultivation.fate.zhangtie.label': '阿岩',
'cultivation.fate.zhangtie.story': '青峰门回春坞,你是温先生门下不起眼的记名弟子。与你同日进坞的阿岩是你的同乡——憨直少言,力气却大,捣药的粗活总抢着干,挨管事的鞭子也总闷声替你挡。在这远离故土的深山里,他是你唯一说得上话的人。江湖人讲「出门靠朋友」,你们都把彼此当成了兄弟。',
'cultivation.fate.zhangtie.story2': '半月前,阿岩「下山归乡」了。温先生说得云淡风轻,赏银照发,行李齐备。可你分明记得他说过,要攒够钱给娘治病,今年绝不回家。更蹊跷的是,那之后你两次深夜路过药房地窖,都闻到一股浓得化不开的药腥——还有铁链拖过青砖的声响,沉重、缓慢,像什么东西在挪动。',
'cultivation.fate.zhangtie.story3': '今夜,那股药腥又来了。你立在窖口,手心贴着冰凉的铜锁——阿岩去了哪里,这下面藏着什么,温先生慈眉善目的背后又是什么?推开这道门,就再也回不到懵懂的日子了。可若不推开,那个替你挡鞭子的少年,也许正躺在下面某个角落里。',
'cultivation.fate.zhangtie.trace.opt': '夜半撬锁,查个明白',
'cultivation.fate.zhangtie.trace.hint': '见过真相的人,往后才认得出那具铁尸',
'cultivation.fate.zhangtie.trace': '铜锁落地的那一刻你就后悔了。地窖里没有人,只有一口半人高的药缸,缸壁的药渍黑得发紫,缸底沉着一层细碎的骨渣。阿岩的柴刀还挂在墙钩上,人却像从世间被抹去了。你连夜把锁挂回原位,手心全是冷汗——这笔账,记下了。',
'cultivation.fate.zhangtie.bide.opt': '装作不知,回去睡觉',
'cultivation.fate.zhangtie.bide.hint': '仙途险恶先顾眼前——只是有些味道,会跟你一辈子',
'cultivation.fate.zhangtie.bide': '你在窖口站了一炷香,终是转身回屋。江湖人常说知道的越少活得越久——可往后每个雨夜,那阵药腥和铁链声都会准时报到,像一笔没有结清的旧账。',
'cultivation.fate.zhangtie.wary.opt': '不查,但从此留一手',
'cultivation.fate.zhangtie.wary.hint': '把温先生给的补药,悄悄换成清水',
'cultivation.fate.zhangtie.wary': '你不声不响回了屋。第二天起,温先生每月赐下的「固本培元散」,都被你换成清水倒进了山涧。他若真是好人,不过浪费几包药;他若不是——你这条命,就押在这点疑心上了。',
'cultivation.dream.zhangtie': '梦魇:地窖里的铁链声又响了。你循声走去,药缸里浮起的,是一张憨厚的脸。',

'cultivation.fate.bottle.label': '凝露瓶',
'cultivation.fate.bottle.story': '入坞三个月,你月钱微薄,丹药更轮不到记名弟子——想快些练出气感,只能自己想办法。这夜你照例去后山采药,追一只白毛野兔钻进岩缝,竟在积年落叶下摸出一只青翠小瓶。瓶不过巴掌大,非金非玉,入手温润得反常,瓶壁上的纹路细看竟像流动的月华。',
'cultivation.fate.bottle.story2': '你随手把它搁在窗台。翌日清晨,瓶口内壁凝出一滴碧色露珠,坠入窗台裂缝里一丛枯蔫的药苗——那苗在你眼皮底下抽枝、展叶、开花,一盏茶的功夫走完了一年的荣枯。你把小瓶紧紧攥在手心,指节都白了:这世道里,穷人家的孩子,终于也攥住了一样旁人没有的东西。',

'cultivation.fate.feiyu.label': '岳惊澜',
'cultivation.fate.feiyu.story': '演武场上有个使刀的少年,叫岳惊澜——黑风寨出身,无门无派,全凭一股疯劲杀进内门,人称「岳疯子」。他不知你身怀仙家法门,只当你也是个闷头练武的同道,隔三差五拉你比试,输了就请你去山脚下赊账喝酒。乱世里,这样不计利害的交情是稀罕物。',
'cultivation.fate.feiyu.story2': '今夜他又拎着两壶浊酒翻进你的院子,往石桌上一顿:「小子,等我岳惊澜刀法大成、名震九郡那日,你在底下替我掌个眼!」他说这话时眼睛亮得像星子,浑然不知自己毕生都只是凡人。你忽然想:这个名字,或许值得被更多人记住。',
'cultivation.fate.feiyu.oath.opt': '与他义结金兰',
'cultivation.fate.feiyu.oath.hint': '仙凡殊途,兄弟一场——他日你扬名时,他已在黄土之下',
'cultivation.fate.feiyu.oath': '你们对月叩头,以血换盏。他大笑三声,说明日再教你三招刀法——你不知道的是,许多年后修士问起来历,你脱口而出的,正是今夜这个名字。',
'cultivation.fate.feiyu.name.opt': '记下这个名字',
'cultivation.fate.feiyu.name.hint': '往后行走江湖,「岳惊澜」三个字,将替你去响亮',
'cultivation.fate.feiyu.name': '你笑着应了,心里却把「岳惊澜」三个字收进了贴身的口袋。多年后,坠星海的通缉令、南荒的宗门名册上,这三个字将闯出滔天名声——而真正的他,早已在一场凡人的仇杀里化作白骨。',
'cultivation.fate.feiyu.decline.opt': '渐渐疏远,各走各路',
'cultivation.fate.feiyu.decline.hint': '你是修仙的人了,凡俗交情是负累——道理如此,心却沉了沉',
'cultivation.fate.feiyu.decline': '你开始称病避席。他来过三回,最后一回把半坛酒搁在你门口,挠着头走了。山门外再没有那道咋咋呼呼的身影——修仙第一课,原是舍得。',

'cultivation.fate.mojuren.label': '夺舍之局',
'cultivation.fate.mojuren.story': '温九针,回春坞温先生,江湖人称「银针度厄」——医术通神,救人无数,待你更如亲生。他授你《养气经》,月月赐药,逢人便夸「我这徒儿是个修仙的苗子」。若非那夜替他送一封火漆密信回房,你本该一直这么信下去。',
'cultivation.fate.mojuren.story2': '密室里烛火摇曳。你替他找药方,却在枕下翻出一卷以人血写就的邪功——《换形秘录》。字字诛心:修至大成,神魂可离体夺舍,强占他人躯壳再活一世;而最合用的炉鼎,是「身具灵根、修为尚浅的少年弟子」。你拿着那卷书,手抖得点不燃油灯——原来这三年的慈爱,是在给一株药材浇水。',
'cultivation.fate.mojuren.story3': '当夜,他带着一身药香推门进来,烛火无风自灭。平日慈和的眉眼在黑暗里舒展成另一副模样:「好徒儿,师父这具身子熬不了几年了——你的这具,借为师一用罢。」神魂如墨,自他眉心倾出,直扑你的识海。师徒一场,终于到了结账的时候。',
'cultivation.fate.mojuren.kill.opt': '倾尽全力,灭其神魂',
'cultivation.fate.mojuren.kill.hint': '反杀师父——斩断师徒,也斩断后患,只余夜半一声叹',
'cultivation.fate.mojuren.kill': '识海中的搏杀无声却凶险。你以《养气经》养出的神魂硬生生磨碎了他的残念——最后一刻,他忽然不再挣扎,只叹了句「可惜了」。是可惜你没成他的炉鼎,还是可惜这段师徒?你不愿再想。天亮时,回春坞少了一位温先生,你眼底多了一层化不开的霜。',
'cultivation.fate.mojuren.spare.opt': '擒而不杀,封其残魂',
'cultivation.fate.mojuren.spare.hint': '念三年授业之情留一线——但猛虎入笼,终有反扑之日',
'cultivation.fate.mojuren.spare': '你赢了,却没下杀手。念他三年授业之恩,你将那缕残魂镇入一枚黑铁法器,贴符封印。他在器中阴冷地笑了:「好徒儿,山长水远,为师等着你。」——这句话,结丹那日,你会想起来的。',
'cultivation.dream.mojuren': '梦魇:雨夜,药缸,一双在黑暗里睁开的眼睛。「好徒儿……」你惊醒时,冷汗透衣。',

'cultivation.fate.jinguang.label': '血符上人',
'cultivation.fate.jinguang.story': '大祸毫无征兆地砸下来。野修血符上人——一个在凡间厮混的散修,靠着一张血符横行乡里——纠集匪徒杀上了青峰门。血符红光护体,刀剑难伤,满门武师的刀砍上去只溅起点点火星。门主的断剑至今还插在演武场中央,血顺着青砖缝流到了你的鞋尖。凡人,挡不住修仙者。',
'cultivation.fate.jinguang.story2': '好在,你已不完全是凡人。血符上人正在点火烧藏经阁,红光罩身的他狂笑自若,浑然不觉身后多了一个人。你摸出怀里那柄喂了三年的小剑——杀了他,满门数百口就有活路;缩在人群里,你也能活着走出这片火海。只是一样:若今日退了,往后每逢关隘,你都会想起今夜。',
'cultivation.fate.jinguang.fight.opt': '挺身而出,阵前斩之',
'cultivation.fate.jinguang.fight.hint': '凡人的江湖,今日由你来挡——夺其血符遗物,或有登仙机缘',
'cultivation.fate.jinguang.fight': '法剑破空的锐啸里,血符红光寸寸碎裂。血符上人临死瞪着你,像看一个怪物——他不明白,凡人堆里怎么会蹲着一个真正的修士。大火扑灭时已是黎明,你在他的行囊里摸出一枚非金非玉的令牌,刻着两个古篆:「登仙」。后来你才知道,这是通往仙门的钥匙。',
'cultivation.fate.jinguang.flee.opt': '携瓶夜遁,独善其身',
'cultivation.fate.jinguang.flee.hint': '留得青山——只是青峰门的火光,会在你梦里烧很多年',
'cultivation.fate.jinguang.flee': '你揣着小瓶,从后山断崖趁夜离去。身后火光映红了半边天,喊杀声顺着风追出三十里。你活下来了——可有些夜里,那冲天的火光还是会烧进你的梦里,烧得你整夜整夜地打坐。',

'cultivation.fate.xuese.label': '葬魂谷',
'cultivation.fate.xuese.story': '炼气圆满,筑基只差一步——可筑基丹的主药「龙须紫参」只在一个地方成批生长:葬魂谷。此地十年一开,云梦五宗各遣炼气弟子入内采药;谷内灵药遍地,妖兽横行,而比妖兽更险的,是人心。历届活着走出来的弟子,十不存三。',
'cultivation.fate.xuese.story2': '谷中无日月。第三日黄昏,你循着药香摸到玄蛟泽边,正撞见一场恶斗:一名银衣女修被玄色妖蛟缠在泽心,鬓发散乱,护体灵光已薄得像一层窗纸。她腰间那枚揽月宫的玉佩你认得——五宗之首,揽月宫内门弟子,冷凝霜。她的目光扫过泽边的你,只一瞬,又落回妖蛟。',
'cultivation.fate.xuese.story3': '出手,还是作壁上观?玄蛟力大无穷,你这点修为掺和进去生死难料;可泽底那株五百年份的紫参近在咫尺——她若死了,下一个就轮到你。泽水翻涌,妖蛟的竖瞳已经转了过来。',
'cultivation.fate.xuese.jiao.opt': '出手相助,共斩玄蛟',
'cultivation.fate.xuese.jiao.hint': '合力退蛟,分润灵药——这一眼,她记下了(初遇冷凝霜)',
'cultivation.fate.xuese.jiao': '你暴起发难,三道符箓封住蛟目,她心领神会一剑穿喉。分药之时她摘去面纱一角,眉目清冷如月,对你微微颔首:「揽月宫冷凝霜,记下了。」泽边一别,你以为不过是萍水——却不知这一眼,要一千年后才还得清。',
'cultivation.fate.xuese.lurk.opt': '隐在暗处,坐等鹬蚌',
'cultivation.fate.xuese.lurk.hint': '她死了灵药全是你的;她若活下来……没人知道你今晚在这',
'cultivation.fate.xuese.lurk': '你伏在岩后,看她血战脱身、重伤远遁,才潜去泽底掘了紫参,顺手又收了七八株百年老药。满载而归时你告诉自己:修仙路上,活下来的人才有资格谈道义。只是那道银衣染血的身影,偶尔还是会入梦。',

//———— 苍梧山(筑基)————
'cultivation.fate.qixuan.label': '苍梧山',
'cultivation.fate.qixuan.story': '离了青峰门,你负笈千里,投到云梦五宗之一的苍梧山。山门前三千级青石阶直上云霄,守山弟子验过你的灵根,往名册上一笔勾去:「外门弟子,领《乙木剑诀》残篇一卷,灵田三亩,月例灵石十块。」自此,凡尘的刀光剑影,都成了山脚下的云。',
'cultivation.fate.qixuan.story.token': '苍梧山山门前,你递上那枚得自血符上人遗物的登仙令。守山弟子脸色一变,疾步入内禀报——半炷香后,一位筑基执事亲自引你入山:「持令者,直入内门。」原来那一夜的仗,报偿在这里等着:《乙木剑诀》全卷到手,灵田洞府皆有份例,同门看你时眼里都有了分量。',
'cultivation.fate.qixuan.story2': '苍梧山的日子清苦却安稳。白日打理灵田、研磨剑诀,夜里对着满山虫鸣修行吐纳——偶尔你也会想起回春坞的药香、地窖的铁链声、还有那个雨夜的密室。都过去了。如今你走在的,是一条真正的仙路。',

'cultivation.fate.tainan.label': '白泽墟',
'cultivation.fate.tainan.story': '听闻白泽墟五年一度的散修小会又开了。此辈散修无门无派,揣着毕生积蓄在此互通有无——功法残页、灵药种子、妖兽筋骨,吆喝声此起彼伏。你易容混入其中,青衫布履,混迹在烟火气里,竟恍惚觉得自己还是个凡人。',
'cultivation.fate.tainan.story2': '一个独臂老者的摊位前,你停住了。摊上三样东西:半卷烧焦的剑诀残页、一包干瘪的灵药种子、一壶浊酒。老者眯眼打量你:「小友面生,想要什么,自己挑。」囊中灵石不多,只够买一样。',
'cultivation.fate.tainan.sword.opt': '买下半卷剑诀残页',
'cultivation.fate.tainan.sword.hint': '与你怀中的《乙木剑诀》残篇,或有合璧之机',
'cultivation.fate.tainan.sword': '残页上的剑意与你怀中的残篇隐隐共鸣——果然同出一源。归途中你已参透三分:乙木剑诀之路,自此又宽了一线。老者收了灵石,眯眼笑得像早知有今日。',
'cultivation.fate.tainan.seed.opt': '收下灵药种子',
'cultivation.fate.tainan.seed.hint': '干瘪的种子?在凝露瓶面前,天下没有死的灵药',
'cultivation.fate.tainan.seed': '当夜你把种子埋进灵田,滴上一滴瓶露。翌日,满圃灵苗破土而出,碧得晃眼。老者若知道自己的「死种」在你手里活了,怕是要惊掉下巴。',
'cultivation.fate.tainan.wine.opt': '沽一壶浊酒,听他说书',
'cultivation.fate.tainan.wine.hint': '散修的嘴里藏着修仙界的真消息——坠星海的传说入耳',
'cultivation.fate.tainan.wine': '浊酒三碗,老者话匣子大开:「……都说坠星海遍地是机缘,妖丹当灵石使!当年多少修士闯过去,回来的没几个——可回来的,哪个不是一方豪雄?」你默默把这三个字记进了心里。',

'cultivation.fate.fengyun.label': '紫霆竹剑',
'cultivation.fate.fengyun.story': '筑基之后,你耗尽心血做了一件大事:以凝露瓶催熟三千年紫雷竹,辅以秘法炼制,三百日炉火不熄,终成七十二口紫霆竹剑。剑成那日,竹影满山,雷鸣彻夜——七十二口飞剑如臂使指,结成剑阵,同阶修士难撄其锋。',
'cultivation.fate.fengyun.story2': '从此游历四方,再无敌手之忧。紫霆所至,妖兽辟易;寻常劫修见你剑光一起,掉头便走。你抚着掌心的剑丸,忽然明白温九针当年为何不择手段——力量本身,就是这世上最动听的话。',

//———— 离乱篇(结丹)————
'cultivation.fate.zhengmo.label': '正邪大战',
'cultivation.fate.zhengmo.story': '太平日子过久了,谁都忘了七煞魔门还在山外磨刀。这年秋末,狼烟一夜之间烧遍云梦——正邪大战爆发,魔焰滔天,五宗连战连败。苍梧山虽是五宗之一,倾巢而出也难挡大势:山下的村镇一夜间成了白地,逃难的凡人扶老携幼,哭声顺着山道一路传到峰顶。',
'cultivation.fate.zhengmo.story2': '山中长老会开了三天三夜,最终敲定的却是「保存火种」——精锐弟子先行撤离,老弱自愿断后。你恰在撤离名单之外:论修为你是结丹新锐,论根基你在山中无党无派,被留下殿后,本就是给旁人的生路垫脚。',
'cultivation.fate.zhengmo.story3': '撤离前夜,漫山都是收拾行囊的弟子。有人连夜拜别师长,有人抱着灵田痛哭,也有人——比如此刻的你——立在风口看着山下的火光,心里算一笔冷账:留下断后是十死无生,随队先走是一线生机。这一夜,没人睡得着。',
'cultivation.fate.zhengmo.rear.opt': '留下断后,多挡一刻',
'cultivation.fate.zhengmo.rear.hint': '为师门争一线生机——活下来的人,会记得今夜是谁留在了山头',
'cultivation.fate.zhengmo.rear': '你留下了。魔焰压境那夜,你与几十名自愿断后的同门死战山隘,符箓烧尽就用剑,剑折了就用拳头。天亮时苍梧山已空,你拖着一身血污走出尸山——身后无人再敢小觑这个无党无派的结丹修士。',
'cultivation.fate.zhengmo.slip.opt': '趁乱先行,另寻生路',
'cultivation.fate.zhengmo.slip.hint': '活着才有来日——但「临阵脱逃」四个字,会跟你的名字很多年',
'cultivation.fate.zhengmo.slip': '你在人潮最乱时换了散修的装束,悄然而去。身后苍梧山的火光烧了三天——你一次也没有回头。修仙路上,活着的人才有资格书写对错;只是偶尔,你会想起那座桃花盛开的山谷。',

'cultivation.fate.duoshi.label': '残魂反扑',
'cultivation.fate.duoshi.story': '结丹的紧要关头,那枚贴身收藏的黑铁法器骤然发烫——你几乎忘了,里面还镇着一个人。温九针的残魂自囚笼中暴起,挟着淬了数年的怨毒扑向你的紫府:「好徒儿,为师说过——你的身子,借我一用。」他等这一天,等了整整一个境界。',
'cultivation.fate.duoshi.story2': '识海之内神魂相搏,比任何刀兵都凶险。他的魂力枯败却歹毒,一寸寸啃噬你的神智,专挑心魔滋生处下口;你的神魂正值结丹鼎盛,却不敢全力施为——怕撕裂了刚凝聚的金丹。黑暗里,他絮絮地说起往事:收你为徒那天,原是看中你的灵根;可授业三载,也并非全是假意。',
'cultivation.fate.duoshi.story3': '「师父。」你在识海里一字一句地开口,「你说得对——这具身子,的确是修仙的好苗子。所以,不能给你。」残魂僵了一瞬。趁这一瞬,你的神魂扑了上去。',
'cultivation.fate.duoshi.burn.opt': '焚其残魂,恩怨尽泯',
'cultivation.fate.duoshi.burn.hint': '烧掉这缕残念——师徒旧账,今夜两讫',
'cultivation.fate.duoshi.burn': '南明离火般的神魂烈焰里,那缕残念寸寸成灰。最后消散前,他忽然不再咒骂,只极轻地说了句什么——像是「养气经第九层」,又像是一声叹息。你睁开眼,窗外正落雪。从今往后,再没有温先生了。',
'cultivation.fate.duoshi.tame.opt': '镇而收之,为我所用',
'cultivation.fate.duoshi.tame.hint': '他不死不灭,一身药理丹道却留下——以毕生所学,偿夺舍之债',
'cultivation.fate.duoshi.tame': '你将溃散的残魂重新镇入法器,加了三道禁制,烙上主仆之契。他输得心服口服:「罢了……为师这一身医道丹理,就留给你做个念想罢。」自此你丹途如有神助——他的毕生所学,正以另一种方式续他的命。',

'cultivation.fate.chen.label': '顾清梧',
'cultivation.fate.chen.story': '撤离苍梧山的前夜,渡口风大。顾清梧——掌教的独女,苍梧山公认的明珠——独自在渡口拦住了你。这些年在山中,她对你处处照拂:替你挡过执事的刁难,塞过暖手的汤婆子,灵田歉收时偷偷匀过自己那份口粮。此刻她塞给你一只缝得密密的储物袋,里面是晒干的桃花。',
'cultivation.fate.chen.story2': '「山高水长,道友珍重。」她转身要走,又停住,背对着你轻声说:「那年灵田失火,你替我顶罪挨罚的时候……我就知道了。」渡口的风吹乱她的鬓发。这一去南荒板荡、仙路茫茫,有些话今夜不说,许是就再没有机会了。',
'cultivation.fate.chen.dao.opt': '一心向道,婉言回绝',
'cultivation.fate.chen.dao.hint': '苍梧山的桃花雨,此后只在梦里——道心愈坚',
'cultivation.fate.chen.dao': '你把储物袋轻轻推回去,只取了一瓣干桃花:「仙道漫漫,误了道友。」她看了你很久,忽然笑了,笑着笑着眼泪就下来了:「果然是你。」渡口一别,桃花随水。',
'cultivation.fate.chen.love.opt': '结为道侣,共赴仙途',
'cultivation.fate.chen.love.hint': '乱世里结一段缘——合体重逢时,她会在你身边',
'cultivation.fate.chen.love': '你握住她冰凉的手:「此去星海,若侥幸不死,回来娶你。」她破涕为笑,从颈上解下一枚护身玉佩给你挂上——百年后你才知道,那枚玉佩里封着她的一缕本命真元。',
'cultivation.fate.chen.forget.opt': '相忘江湖,不留一字',
'cultivation.fate.chen.forget.hint': '最干净的告别——也最疼',
'cultivation.fate.chen.forget': '你没有接储物袋,也没有说话。晨雾起时渡口已空,她站过的青石上只余一瓣桃花,被风吹进水里。你告诉自己这是最好的结局——却在此后几百年里,再没去过任何一个有桃花的地方。',
'cultivation.dream.chen': '梦魇:渡口风大,她的衣袖在风中猎猎。你想喊住她,喉咙里却发不出一点声音。',

'cultivation.fate.chuansong.label': '古传送阵',
'cultivation.fate.chuansong.story': '正邪战火越烧越近,南荒已无净土。避祸途中,你在一座荒岛的洞窟深处发现一座残缺的上古传送阵——阵纹繁复非当今手笔,中央阵眼还凝着万年未散的灵光。阵图残卷上写着:此阵所通彼岸,名「坠星海」——妖兽横行、机缘遍地的化外之地。',
'cultivation.fate.chuansong.story2': '修复古阵需要时日,而魔焰离此地不过数百里。洞外浪声如雷,洞内阵纹明灭——这座古阵是唯一的生路,也是一条不归路:彼岸是何等天地,去了未必回得来。走,还是留?',
'cultivation.fate.chuansong.sail.opt': '耗尽家底修阵,远行星海',
'cultivation.fate.chuansong.sail.hint': '抛下南荒恩怨,去搏一个没人认识你的新地界',
'cultivation.fate.chuansong.sail': '三个月日夜赶工,古阵的阵纹一条条亮起。踏入阵眼那刻,你回望了一眼南荒的方向——此去经年,归期未卜。灵光冲天而起,你消失在原地,只剩洞窟里潮汐般的阵纹余音。坠星海,到了。',
'cultivation.fate.chuansong.seal.opt': '拓下阵图封窟,另觅他途',
'cultivation.fate.chuansong.seal.hint': '此阵留着是个后手——但远水,救不了近火',
'cultivation.fate.chuansong.seal': '你拓下完整阵图,以禁制封了洞窟。这座古阵是你埋下的后手——它日在南荒待不下去,星海便是退路。只是眼下,还得先在战火里活下去。',

//———— 星海篇(元婴)————
'cultivation.fate.shijin.label': '金蠹虫',
'cultivation.fate.shijin.story': '坠星海深处一座无名荒礁上,你寻得一窝上古异虫——金蠹虫。史载此虫位列奇虫榜前茅,万虫出匣如金色狂潮,金石皆可为食;虫群所过之处,法器法宝皆成齑粉,蜕下的虫壳更是炼宝的良材。多少上古大修,都靠一手驱虫之术横行一世。',
'cultivation.fate.shijin.story2': '饲养金蠹虫极耗心神——喂食、分巢、驯化,一样都省不得。但当第一波虫群在你掌心结成一朵小小的金云时,你知道这份心神花得值:从今往后,你的洞府有了最忠诚的守卫,你的敌人多了一种最可怕的死法。',

'cultivation.fate.dayan.label': '千机叟',
'cultivation.fate.dayan.story': '一具上古傀儡残躯中,你听见了一个声音。残躯里封着一缕千年残魂——千机叟,生前傀儡术独步天下,神识之强世所罕见,陨落前将自己炼进傀儡,在黑暗里独自醒了一千年。「三百年了,」他的声音沙哑得像锈铁摩擦,「你是头一个能听懂我说话的。」',
'cultivation.fate.dayan.story2': '他开出的条件很简单:他教你《千机引》神识秘术与傀儡之道,你替他寻一具可以寄托的躯壳,或送他最后一程。「老夫这一生,什么都教过人,唯独没教过自己怎么死。」千年残魂的笑意里,你听不出是洒脱还是悲凉。',
'cultivation.fate.dayan.disciple.opt': '以大礼拜师,承其衣钵',
'cultivation.fate.dayan.disciple.hint': '《千机引》神识真传——师者,传道授业解惑',
'cultivation.fate.dayan.disciple': '你以古礼三拜。他受了,沉默良久才道:「起来吧。老夫最后一个弟子,竟是个千年后的后生。」《千机引》的神识法门如江海灌入识海——这一拜,是你仙途上最划算的一次低头。',
'cultivation.fate.dayan.puppet.opt': '只学傀儡术,各取所需',
'cultivation.fate.dayan.puppet.hint': '不谈师徒只论交易——铁木傀儡日夜轮作开矿',
'cultivation.fate.dayan.puppet': '「也好,师徒虚名,老夫早就不在乎了。」他将傀儡术倾囊相授。三个月后,第一批铁木傀儡走出工坊,日夜轮作开矿采石——你的灵石进项,自此再不用愁。',

'cultivation.fate.tihun.label': '吞魄兽',
'cultivation.fate.tihun.story': '坠星海深处猎杀妖兽时,你在一座孤坟般的洞窟里撞见一只异兽:通体如墨,唯有一双碧眼,喉间发出婴儿夜啼般的怪声。典籍有载——吞魄兽,专噬阴魂厉魄的上古异种,一吼可令百鬼辟易,是天下至阴至邪之物的克星。它盯着你的神魂看了半晌,竟主动凑过来,蹭了蹭你的掌心。',
'cultivation.fate.tihun.story2': '收服吞魄兽,是撞了大运——从此邪修鬼道在你面前要先矮三分,连你突破时滋生的心魔幻象,在它眼里都只是一顿美餐。只是此兽来历古怪,洞窟深处那座无名坟冢,你最终没有敢去挖。有些秘密,还是埋在海底的好。',

//———— 化神 ————
'cultivation.fate.yinyue.label': '朔月',
'cultivation.fate.yinyue.story': '化神雷劫刚过,你温养多年的本命法宝忽然生变——器中沉睡的器灵醒了。她自称朔月,银发垂地,眉眼如画的狼族妖修,万年前随主征伐,主人陨落后在器中又睡了一万年。「沧海桑田,」她望着洞外的云海轻声说,「原来外面的世界,已经这样了。」',
'cultivation.fate.yinyue.story2': '器灵去留,是个难题。留她效力,法宝通灵更胜往昔,驱物伤敌如臂使指;可她困在器中万年,眼底那点对自由的渴,你看得分明——那神情,和当年攥着小瓶的你,一模一样。',
'cultivation.fate.yinyue.bind.opt': '请她留下,器灵效力',
'cultivation.fate.yinyue.bind.hint': '法宝通灵常驻产出+10%——她答应得很轻,像一片月光落在肩上',
'cultivation.fate.yinyue.bind': '「万年都等了,不急这一世。」朔月微微一笑,身影没入宝光。自此法宝通灵如臂使指——只是偶尔夜半,器中会传出极轻的哼唱,像狼歌,又像安眠曲。',
'cultivation.fate.yinyue.free.opt': '解开禁制,放归自由',
'cultivation.fate.yinyue.free.hint': '万年之困一朝解——上界若重逢,她会记得今日',
'cultivation.fate.yinyue.free': '禁制解开那日,她化作一道银虹绕你三匝,留下一句「上界再见」便没入云海。法宝失了器灵威力大减,你却觉得值——有些债是要还的;有些人,不该被关着。',

'cultivation.fate.yuanyao.label': '沈青蘅',
'cultivation.fate.yuanyao.story': '星海的故旧来信中,夹着一封字迹娟秀的传讯——沈青蘅,当年在坠星海有过数面之缘的女修,如今被卷入一场波及数岛的风波,怀璧其罪,四处遭人追杀。信中她没有求援,只淡淡写了句「星海一别多年,道友可还安好」,落款处晕开一小片墨渍,像一滴没落下的泪。',
'cultivation.fate.yuanyao.story2': '昔年坠星海的旧事涌上心头:那时她还是个明艳张扬的筑基女修,为救同门师姐不惜以身饲魔。数百年不见,故人还在风口浪尖上挣扎。帮,是不帮?',
'cultivation.fate.yuanyao.aid.opt': '鼎力相助,替她解围',
'cultivation.fate.yuanyao.aid.hint': '修士间的债最难还——她记下了这份恩',
'cultivation.fate.yuanyao.aid': '你踏浪而至,三日之内替她了结了追杀令。她立在礁石上朝你深深一礼,什么都没说——但从此以后,每逢你突破大关,一封只写着「珍重」二字的传讯总会准时抵达。',
'cultivation.fate.yuanyao.bond.opt': '倾力相助,结为知己',
'cultivation.fate.yuanyao.bond.hint': '雪中送炭——从此星海多一个可托后背的人,她的信会常来',
'cultivation.fate.yuanyao.bond': '「你我之间,不必言谢。」你们并肩在礁石上坐了一夜,从坠星海的旧闻聊到南荒的桃花。临走她塞给你一枚传讯符:「星海之大,有个能说说话的人,真好。」自此,你的洞府不时会收到来自遥远海域的问候。',

//———— 虚天篇(炼虚)————
'cultivation.fate.quhun.label': '铁衣',
'cultivation.fate.quhun.story': '炼虚之后,你起了炼制护法道兵的念头。坠星海散修手中,你重金购得一具古修遗蜕炼成的铁尸:尸身不腐,铁甲覆体,煞气内蕴,正是炼尸的上佳之材。卖家说它出自南荒某处的古战场,辗转数百年,不知经了几手。',
'cultivation.fate.quhun.story.known': '炼虚之后,你起了炼制护法道兵的念头。坠星海散修手中,你重金购得一具古修遗蜕炼成的铁尸。卖家说它出自南荒——你的心没来由地一沉。数百年前,青峰门回春坞,那口深夜的药缸,那阵铁链拖过青砖的声响……你按住铁尸冰冷的面甲,久久没有揭开。',
'cultivation.fate.quhun.story2': '祭炼的法阵已经布好,你只待揭开面甲验看尸身。铁甲森森,映着烛火泛出冷光——这具躯壳在世间辗转了数百年,从一座古战场到另一双买主的手。凡人的尸首不会保存得这样好,除非是被人精心炼过。',
'cultivation.fate.quhun.story2.known': '面甲滑落的瞬间,浑身的血都凉了。铁甲之下,是阿岩憨厚的脸——眉眼依稀还是当年的模样,只是再不会笑了。当年地窖里那口药缸,温九针的邪功,那具被抹去痕迹的尸身……原来他去了这里。原来他一直在这里。',
'cultivation.fate.quhun.story3': '祭炼的法阵已经布好。指尖的控魂符燃起又掐灭,掐灭又燃起——这具躯壳里,曾住过一个替你挡鞭子的少年。炼了,他是你最忠诚的道兵;葬了,他是你永远的朋友。炼,还是不炼?',
'cultivation.fate.quhun.bury.opt': '封炉葬之,还他姓名',
'cultivation.fate.quhun.bury.hint': '入土为安——他叫阿岩,不叫道兵',
'cultivation.fate.quhun.bury': '你在无名的山岗上立了块碑,只刻「故友阿岩」四个字。埋土时你忽然想起很多年前,也是这样一个黄昏,他替你挨了三鞭子还咧着嘴笑。青山埋骨,愿他来生不必再入仙门。',
'cultivation.fate.quhun.wield.opt': '炼为铁衣,伴我长生',
'cultivation.fate.quhun.wield.hint': '旧友之躯自此护法不死不休——这是他另一种活法',
'cultivation.fate.quhun.wield': '控魂符落定,铁尸睁眼,眸中再无神采,唯余一片死寂的忠诚。你替他起了新名字——铁衣。「替我护法吧,」你抚过他冰冷的铁甲,声音轻得像说给自己听,「这一次,换我护着你。」',

'cultivation.fate.xugu.label': '冥骨老祖',
'cultivation.fate.xugu.story': '荒岛古修洞府深处,一具白玉般的骸骨忽然睁眼——冥骨老祖,万年前纵横坠星海的魔道巨擘,陨落后一缕残魂附骨不灭。他不急着动手,慢条斯理地掸了掸骨上的尘土:「小友能到这里,也算与老夫有缘。」笑容可掬,眼神却比骸骨还冷——万年老鬼,没有一盏省油的灯。',
'cultivation.fate.xugu.story2': '他邀你合作取宝:陨仙殿内殿有上古遗藏,禁制森严,非二人合力不可开。「宝物对半分,如何?」老鬼把条件摆得滴水不漏。与虎谋皮,还是现在就掀桌子?',
'cultivation.fate.xugu.ally.opt': '虚与委蛇,结伴寻宝',
'cultivation.fate.xugu.ally.hint': '各怀鬼胎的同行——取宝那日,就是算总账之时',
'cultivation.fate.xugu.ally': '你们击掌为盟,言笑晏晏,各自在心里给对方备好了棺材。同行数月,他的见识阅历的确让你大开眼界——只是每到夜里,你都能感觉到那道打量猎物的目光,黏在你的后心上。',
'cultivation.fate.xugu.slay.opt': '趁他魂弱,先下手为强',
'cultivation.fate.xugu.slay.hint': '万年残魂也是残魂——取其遗藏,永绝后患',
'cultivation.fate.xugu.slay': '掌心灵焰暴起的瞬间,老鬼的笑声戛然而止:「小友好狠的手段——」「彼此彼此。」白玉骸骨寸寸崩解,你只在他枕骨下摸出一枚储物戒。里面灵石不多,倒有半张海图——陨仙殿的标记,赫然在目。',
'cultivation.dream.xugu': '梦魇:白玉骸骨坐在你的蒲团上,温和地数着你的灵石:「小友,见者有份。」',

'cultivation.fate.xutian.label': '陨仙殿',
'cultivation.fate.xutian.story': '陨仙殿,万年开启一次的坠仙遗府。内殿冰窟之中,上古修士的遗宝近在咫尺——玄冰魄焰幽光森森,是淬炼道基的无上神物;易髓丹药香凝而不散,传说一粒可洗经伐髓、脱胎换骨。禁制的裂纹如蛛网蔓延,取宝的时机只有一息。',
'cultivation.fate.xutian.story.betray': '陨仙殿内殿冰窟,遗宝近在咫尺。可禁制将破的刹那,背后寒毛倒竖——冥骨老祖终于撕下了温和的面皮:「小友,宝物归我,你的躯壳,也归我罢。」万年老鬼的全力一击无声无息印向你的后心——你早知他会反噬,只是没想到,他挑的是你最不能分心的这一刻。',
'cultivation.fate.xutian.story2': '冰窟之内宝光冲天,禁制崩解的轰鸣震得万载玄冰簌簌坠落。玄冰魄焰与易髓丹同室争辉,你却只有一息——取焰,道基得万世寒焰淬炼;取丹,积年暗伤与心魔一朝涤尽。穹顶的冰棱已经开始崩落,留给你的时间不多了。',
'cultivation.fate.xutian.story2.betray': '冰窟之内宝光冲天。你侧身卸去那记暗算,神识却已感到一阵冰寒——老鬼的夺舍魂丝缠上了你的右臂。玄冰魄焰与易髓丹只在数步之外——先取宝,还是先保命?',
'cultivation.fate.xutian.story3': '冰焰的幽光、丹药的异香、崩塌的冰窟,全挤在这一瞬间。修仙数百年,你早已习惯把命押在一念之间——那么这一念,选什么?',
'cultivation.fate.xutian.tihun.opt': '放出吞魄,吞此恶鬼',
'cultivation.fate.xutian.tihun.hint': '一物降一物——让他尝尝被噬魂的滋味,遗藏尽归你',
'cultivation.fate.xutian.tihun': '吞魄出匣的刹那,冥骨脸上的狞笑僵住了。碧眼异兽喉间一声婴儿夜啼,老鬼的魂体便如长鲸吸水般被扯离你的手臂——「小友饶——」求饶声断在兽口。冰窟重归寂静,遗藏尽归你手:万年冥骨,就此成了吞魄的点心。',
'cultivation.fate.xutian.flame.opt': '夺玄冰魄焰',
'cultivation.fate.xutian.flame.hint': '至寒之火淬炼道基——此一宝,万载难求',
'cultivation.fate.xutian.flame': '你反手将玄冰魄焰收入玉匣,森森寒气顺着手臂攀上灵台,却在丹田处与道基轰然相合。身后老鬼的怒吼渐远——冰焰到手,这一趟陨仙殿,值了。',
'cultivation.fate.xutian.flame.opt.betray': '且战且退,先夺冰焰',
'cultivation.fate.xutian.flame.hint.betray': '边战边收,火中取栗——修为增益 +6%',
'cultivation.fate.xutian.flame.betray': '你且战且退,一记回马枪将玄冰魄焰摄入玉瓶。冥骨的咒骂被殿门隔绝——指尖那缕幽蓝,是从老鬼嘴边抢下的底牌。',
'cultivation.fate.xutian.pill.opt': '夺易髓丹',
'cultivation.fate.xutian.pill.hint': '万载药力洗经伐髓——心魔尽散',
'cultivation.fate.xutian.pill': '易髓丹入口即化,万载药力如春江化冻,涤荡四肢百骸。积年的暗伤、纠缠的心魔,竟被药力一寸寸抚平——这一粒丹,抵得上百年苦修。',
'cultivation.fate.xutian.pill.opt.betray': '且战且退,先夺易髓丹',
'cultivation.fate.xutian.pill.hint.betray': '留得青山——心魔 -40',
'cultivation.fate.xutian.pill.betray': '你不恋战,摄起易髓丹便借遁光而走。身后传来老鬼气急败坏的咆哮——万载药力入口即化,连惊带险,倒像一场大梦初醒。',

//———— 合体 ————
'cultivation.fate.nangong.label': '冷凝霜',
'cultivation.fate.nangong.story': '合体大成,名动南荒,揽月宫遣使来贺。为首的女修摘去面纱,眉目清冷如月,通身气度让满殿宾客都矮了三分——冷凝霜,揽月宫千年不出的奇才。她打量你良久,只觉莫名眼熟,却怎么也想不起何处见过。你垂下眼帘——有些往事,不提也罢。',
'cultivation.fate.nangong.story.met': '合体大成,名动南荒,揽月宫遣使来贺。为首的女修摘去面纱的刹那,你们同时怔住了——葬魂谷,玄蛟泽边,那一眼,原来她记了一千年。「原来是你。」她轻声说,声音里听不出情绪。殿中宾客面面相觑,不知这两位合体大能,为何对望了这么久。',
'cultivation.fate.nangong.story.met_guilty': '合体大成,名动南荒,揽月宫遣使来贺。为首的女修摘去面纱的刹那,你怔住了——葬魂谷,玄蛟泽边,那一眼,原来你也记了一千年。她的目光越过你,落在你身侧的顾清梧身上,停顿了一瞬,微微颔首,什么都没说。那一瞬的风度,比任何质问都重。',
'cultivation.fate.nangong.story2': '宫宴散后,她独自立于阶前看雪。你走过去,在她身侧三步外站定。千年岁月在两个合体修士之间静静流淌——有些话不必说,有些人,只需要再并肩看一场雪。',
'cultivation.fate.nangong.story3': '此后百年,她的传讯剑光不时落入你的洞府,或论道法,或只是一句「海外落雪了」。道心有了锚点,心魔再难侵蚀分毫——千年的修行岁月,忽然都有了去处。',

'cultivation.fate.qingyuan.label': '乙木剑祖',
'cultivation.fate.qingyuan.story': '羽民地窟深处,你遇见一缕将熄的残魂——乙木剑祖,《乙木剑诀》的创始者,你此生剑道的源头。这位上古剑修看你使了三十年他初创的剑诀,残魂里透出一点欣慰:「三千年了,总算等到一个像样的传人。」他自知时日无多,便以残躯为炉,将毕生剑道真解倾囊相授。',
'cultivation.fate.qingyuan.story2': '传功持续了七七四十九日。最后一式剑意贯入识海时,他的魂体已淡得快要看不见:「剑诀给你了,往后的路,比老夫走得远些。」乙木剑祖散作满天青光,像一场无声的雪。朝闻道,夕死可矣——你对着地窟深揖到地。',

//erying 第二元婴 — 文本已是原创,仅 story 保留不动
'cultivation.fate.erying.label': '第二元婴',
'cultivation.dream.erying': '梦魇:镜中人与你相视而笑,笑容一点一点变得陌生。',

//———— 大乘 ————
'cultivation.fate.fenglei.label': '风霆翼',
'cultivation.fate.fenglei.story': '大乘之境,你耗费数十年光阴,以九天风雷淬炼出一对风霆翼。翼成之日,风雷激荡百里,双翼一振瞬息千里——从此游历四方、出入秘境,再无远近之虑。多少修士梦寐以求的遁速极致,如今长在你的背上。',
'cultivation.fate.fenglei.story2': '从此海角天涯,朝碧海而暮苍梧。当年那个在青峰门山道上气喘吁吁的少年,如今振翼之间已过万水千山——修仙路远,走得越远,越要懂得回头看。',

'cultivation.fate.xiedao.label': '铜甲翁',
'cultivation.fate.xiedao.story': '一尊来历成谜的鎏金傀儡寻上门来,自称「铜甲翁」——通体鎏金,行动如风,寡言少语却深不可测。它替人办事只收一样东西:紫雷竹。你试过它的手段,一夜之间替你摆平了积压百年的琐碎庶务,效率高得近乎诡异。',
'cultivation.fate.xiedao.story2': '「紫雷竹百根,老夫替你效命百年。」铜甲翁面无表情地摊开铁掌。这世上没有白来的便宜——但它办事的确让人省心。养着的,是一尊谜;用着的,是一把好刀。',

//———— 渡劫 ————
'cultivation.fate.xuanguo.label': '鸿蒙道果',
'cultivation.fate.xuanguo.story': '大乘圆满的最后一夜,你温养了三千年的鸿蒙灵果忽然霞光冲霄,照彻三十里云海——道果熟了。此果万年一熟,服之脱胎换骨,道基洗练至无瑕之境,更得五十件古宝认主为伴。万载仙途走到此处,只差最后一步:天劫。',
'cultivation.fate.xuanguo.story.twin': '鸿蒙灵果成熟那夜,洞府外落下一道剑光。眉眼与你一般无二的来客负手立于月下——他回来了。「听闻你要渡劫,来看看。」第二元婴与你并肩看了一夜星斗,临走只说了一句:「别死。」',
'cultivation.fate.xuanguo.story.love': '鸿蒙灵果成熟那夜,你独自去了趟苍梧山故地。桃花早已谢了几百年,你在一方小小牌位前坐到天亮——清梧,最后一道坎了。若过得去……罢了,修仙人不信来世。',
'cultivation.fate.xuanguo.story.bond': '鸿蒙灵果成熟那夜,一道剑光自揽月宫而来。冷凝霜立于庭中,递来一只护身玉佩:「天劫那日,我在台外等你。」——千年玄蛟泽边的一眼,原来可以记这么久。',
'cultivation.fate.xuanguo.story2': '服果那夜,你独自坐在山巅。回首这一世——青峰门的药香、回春坞的地窖、葬魂谷的那一眼、苍梧山的桃花雨、坠星海的万里烟波……故人零落,恩怨两清,都化作丹田里这一枚霞光流转的道果。天劫已在云端酝酿,最后一跃,要开始了。',
'cultivation.fate.xuanguo.story2.twin': '服果那夜,洞府外落下一道剑光。眉眼与你一般无二的来客负手立于月下——他回来了。「听闻你要渡劫,来看看。」第二元婴与你并肩看了一夜星斗,临走只说了一句:「别死。」——另一个你,也走到了这一步。',
'cultivation.fate.xuanguo.story2.love': '服果前夜,你独自去了趟苍梧山故地。山门早换了主人,唯有满山桃花还像当年一样开。你在她牌位前坐到天亮,把道果的霞光分了一缕留在碑前——清梧,最后一道坎了。若过得去……罢了,修仙人不信来世。',
'cultivation.fate.xuanguo.story2.bond': '服果那夜,一道剑光自揽月宫而来。冷凝霜立于庭中,递来一只护身玉佩:「天劫那日,我在台外等你。」千年玄蛟泽边的一眼,原来真的可以记这么久。你接过玉佩,忽然觉得那漫天的劫云,也没有那么可怕了。',
'cultivation.fate.xuanguo.story3': '霞光散尽,天穹深处传来第一声雷。你掸了掸衣袍上的露水,缓步走向渡劫台。修仙万载,求的无非是这一刻——无论成与不成,这条路上所有的抉择,都已经是答案本身。',
};
let total = 0, missing = [];
for (const p of ['res/i18n/zh.json', 'res/i18n/crowdin/zh.json']) {
	const j = JSON.parse(fs.readFileSync(p, 'utf8'));
	let c = 0;
	for (const [k, v] of Object.entries(M)) {
		if (!(k in j)) missing.push(k);
		if (j[k] !== v) { j[k] = v; c++; }
	}
	fs.writeFileSync(p, JSON.stringify(j, null, '\t') + '\n');
	console.log(p, 'changed:', c);
	total += c;
}
if (missing.length) console.log('KEYS NOT IN MAP (new):', missing);
// 复核:zh 中 cultivation.fate/dream 键必须全部不含原著词
const zh = JSON.parse(fs.readFileSync('res/i18n/zh.json','utf8'));
const bad = /张铁|墨居仁|墨大夫|神手谷|七玄门|黄枫谷|血色禁地|南宫婉|厉飞雨|掌天瓶|长春功|夺舍大法|大衍|曲魂|噬金虫|啼魂|元瑶|玄骨|虚天|乾蓝|补天|蟹道人|风雷翅|玄天|青元|掩月宗|乱星海|金雷竹|银月|陈巧倩|太南谷|青竹蜂云|墨蛟|飞灵族|金光上人|野狼谷|九曲灵参|升仙令|韩立/;
let left = [];
Object.keys(zh).forEach(k=>{
	if (/^cultivation\.(fate|dream)\./.test(k) && bad.test(String(zh[k]))) left.push(k+' = '+String(zh[k]).slice(0,60));
});
console.log('residual:', left.length); left.forEach(l=>console.log(' ',l));
