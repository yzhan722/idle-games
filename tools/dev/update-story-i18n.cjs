// Story-system i18n pass — connected 凡人修仙传 arcs, crumb-reward annotations stripped.
// Usage: node update-story-i18n.cjs
const fs = require("fs");
const load = p => JSON.parse(fs.readFileSync(p, "utf8"));
const save = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

const del = [
	"cultivation.fate.xuese.save", "cultivation.fate.xuese.save.opt", "cultivation.fate.xuese.save.hint",
	"cultivation.fate.xuese.loot", "cultivation.fate.xuese.loot.opt", "cultivation.fate.xuese.loot.hint"
];

const zh = {
	//———— 凡尘篇·七玄门(炼气)————
	"cultivation.fate.zhangtie.trace.hint": "夜探地窖——见过真相的人,日后认得那具铁尸",
	"cultivation.fate.zhangtie.trace": "你夜半撬开地窖铜锁,铁链与药缸俱在,人却不知所踪。缸底沉着一层暗色的渣——你忽然明白「长春功」的药引是什么了。这笔账记下了,连同那一夜的冷汗。",
	"cultivation.fate.zhangtie.bide.hint": "仙途险恶,先顾眼前——只是有些事,夜里忘不掉",
	"cultivation.fate.zhangtie.bide": "你垂下眼帘,照旧捣药练功,仿佛什么都没闻见。只是此后每逢雨夜,那道憨厚的笑总会浮上来,硌得人心口发疼。",
	"cultivation.fate.zhangtie.wary.hint": "对墨大夫多留一份心眼",

	"cultivation.fate.feiyu.oath.hint": "乱世之中,这一暖够用很多年",
	"cultivation.fate.feiyu.oath": "你与厉飞雨对月盟誓,结为异姓兄弟。自此山门之内,多了个能托付后背的人——仙路孤寒,这一暖,够用很多年。",
	"cultivation.fate.feiyu.decline.hint": "仙凡殊途,免生牵挂",
	"cultivation.fate.feiyu.decline": "你婉拒了他的酒。看着他拎着酒壶走远的背影,你想:凡人一世不过数十年,何必让他卷进修仙者的因果。只是这个念头,比想象中更凉。",

	"cultivation.fate.mojuren.label": "夺舍之局",
	"cultivation.fate.mojuren.story": "墨居仁收你为徒,授《长春功》,待你如亲子。三年后的一个雨夜,你却在他的密室中发现了一卷邪异功法——《夺舍大法》。原来慈眉善目背后,是一场蓄谋已久的夺舍之局:他看中的,从来都是你这具年轻的躯壳。",
	"cultivation.fate.mojuren.story2": "当夜,他果然来了。烛火无风自灭,墨大夫推门而入,脸上的慈爱荡然无存:「好徒儿,师父这具身子熬不了几年了——你的,借为师一用。」神魂如墨,自他眉心扑入你的识海。",
	"cultivation.fate.mojuren.kill.hint": "斩草除根——从此世间再无墨居仁",
	"cultivation.fate.mojuren.kill": "他扑来的刹那,你反手一剑。墨大夫倒下时眼里还有未散的算计。你烧掉《夺舍大法》,灰烬散进山风——这一剑斩断的不只是师徒情分,还有你最后一点天真。",
	"cultivation.fate.mojuren.spare.hint": "囚其残魂于法器——他会不时作祟,结丹之期必有一劫",
	"cultivation.fate.mojuren.spare": "你擒住他溃散的残魂,囚入一枚黑铁法器。他倒也识时务,不时以药理指点换你几滴养魂灵液——只是那些指点之间,总夹着几声意味不明的冷笑。这笔账,还没完。",

	"cultivation.fate.jinguang.fight.hint": "火弹焚金光——此战之后,江湖自有「厉飞雨」的传说",
	"cultivation.fate.jinguang.fight": "你自檐角现身,一记火弹术焚尽那层金光。满门欢呼声里你只拂袖而去——来日江湖自有「厉飞雨」的传说,而你与这处山门,恩怨两清。",
	"cultivation.fate.jinguang.flee.hint": "仙凡有别,抽身而退",
	"cultivation.fate.jinguang.flee": "你趁乱卷了细软飘然下山,身后火光冲天。你在心里默念:仙凡殊途,我救不了所有人。可那一夜的火光,此后很多年都映在你的梦里。",

	"cultivation.fate.xuese.story": "为搏筑基的一线机缘,你随各派弟子涌入血色禁地。谷内灵药遍地,妖兽横行,人心比妖兽更险——三日后能活着出去的,十不存三。",
	"cultivation.fate.xuese.story2": "第三日黄昏,墨蛟潭边传来法器相击之声。一名银衣女修正与墨蛟缠斗,鬓发散乱,护体灵光已近溃散——是掩月宗的人。潭中药香浓郁,妖蛟却已暴起。",
	"cultivation.fate.xuese.jiao.opt": "墨蛟潭援手",
	"cultivation.fate.xuese.jiao.hint": "出手相助——这潭水,比看起来深得多",
	"cultivation.fate.xuese.jiao": "你祭起飞剑自侧翼杀入,与她合力绞杀墨蛟。她道谢时声音清冽如寒潭,自报家门:掩月宗,南宫婉。分你半潭灵药后,她深深看了你一眼:「这个人情,我记下了。」",
	"cultivation.fate.xuese.lurk.opt": "潜行采药",
	"cultivation.fate.xuese.lurk.hint": "苟着发财——灵药古宝,落袋为安",
	"cultivation.fate.xuese.lurk": "你没有回头。潜行三日,储物袋塞满了旁人用命换不到的灵药古宝。出谷那日清点收获,耳边却总有一声未歇的兵刃相击——你没有回头。",

	//———— 黄枫谷(筑基)————
	"cultivation.fate.qixuan.label": "黄枫谷",
	"cultivation.fate.qixuan.story": "离了七玄门,你负笈千里,投到越国七派之一的黄枫谷。无名无号,只得从外门弟子做起——领到《青元剑诀》残篇那日,你在山门前回望来路:凡尘,已在云下。",
	"cultivation.fate.qixuan.story.token": "黄枫谷山门前,你递上了那枚得自金光上人遗物的升仙令。守山弟子脸色一变,一路将你引入内门——原来那一战的报偿,在这里等着。《青元剑诀》全卷到手,灵田洞府皆有份例。",

	"cultivation.fate.tainan.sword.hint": "几页残篇,参悟随缘",
	"cultivation.fate.tainan.seed.hint": "带回洞府培育——有那只小瓶在,种下去就是一座药山",
	"cultivation.fate.tainan.seed": "你把各色灵药种子尽数包圆。有掌天瓶在,种下去就是一座药山——想到这一层,你连日绷紧的心弦,忽然松了半分。",
	"cultivation.fate.tainan.wine.hint": "混迹酒肆,听尽星海传闻",

	//———— 离乱篇(结丹)————
	"cultivation.fate.zhengmo.label": "正魔大战",
	"cultivation.fate.zhengmo.story": "魔道六宗南下,一夜之间烽火蔽日。黄枫谷长老会的撤令传到各人手上时,山门前的护山大阵已经亮了三日——千年基业,一朝作鸟兽散。",
	"cultivation.fate.zhengmo.story2": "撤离的钟声响了九下。后山火光里,有人还在收拾宗门典籍,有人已驾剑远去。你站在渡口,身后是修道以来第一个叫过「家」的地方。",
	"cultivation.fate.zhengmo.rear.opt": "断后死战",
	"cultivation.fate.zhengmo.rear.hint": "为师门争一线生机——功德 +5,此去生死难料",
	"cultivation.fate.zhengmo.rear": "你折返山门,与留守弟子并肩死守三日,为撤离的船队争出一道缺口。撤走那天你浑身浴血,回头只看见火里的飞檐——尽力了。",
	"cultivation.fate.zhengmo.slip.opt": "先走一步",
	"cultivation.fate.zhengmo.slip.hint": "活着,才有来日",
	"cultivation.fate.zhengmo.slip": "你没有回头。魔焰吞没山门的那一夜,你已在百里之外的荒岛。活下来的人才有后来——这句话你在心里说了很多遍,说到信了为止。",

	"cultivation.fate.duoshi.label": "残魂反扑",
	"cultivation.fate.duoshi.story": "结丹的紧要关头,那枚黑铁法器骤然发烫。墨居仁的残魂自囚笼中暴起,挟着淬了数年的怨毒扑向你的紫府——他等这一天,等了很久了。「好徒儿,为师说过:你的身子,借我一用。」",
	"cultivation.fate.duoshi.story2": "识海之内神魂相搏,比任何刀兵都凶险。他的魂力枯败却歹毒,一寸寸啃噬你的神智;你的神魂正值结丹鼎盛,却不敢全力施为——怕碎了自己的道基。",
	"cultivation.fate.duoshi.burn.opt": "焚其残魂",
	"cultivation.fate.duoshi.burn.hint": "恩怨尽泯——功德 +3",
	"cultivation.fate.duoshi.burn": "你以结丹真火焚尽那缕残魂。他在火里的最后一声笑戛然而止——师徒一场,至此连恩带怨,尽数成灰。",
	"cultivation.fate.duoshi.tame.opt": "镇而收之",
	"cultivation.fate.duoshi.tame.hint": "留他一缕残念——毕生药理丹道,尽归你用",
	"cultivation.fate.duoshi.tame": "你没有杀他。锁魂纹落下时,老鬼忽然笑了:「也罢,跟着你,比跟着那副朽骨强。」自此法器深处多了个阴恻恻的老药师,丹道医理倾囊相授——以赎他欠你的那具身子。",

	"cultivation.fate.chen.story": "撤离黄枫谷的前夜,陈师姐在渡口拦住了你。她塞给你一只缝得密密的储物袋,里面是晒干的桃花和三瓶丹药。渡口风大,她欲言又止——那份情意昭然若揭,偏偏落在一个一心向道的人身上。",
	"cultivation.fate.chen.dao.hint": "大道独行,斩断情丝",
	"cultivation.fate.chen.dao": "你只深深一揖,便转身登船。她笑着说「保重」,渡口风大,吹散了她没说完的半句话。多年后听闻她终身未嫁、寿尽而终——道心之上,微澜一圈圈散开,久久不息。",
	"cultivation.fate.chen.love.hint": "结为道侣——乱世里,互相是彼此的山门",
	"cultivation.fate.chen.love": "你握住她的手。乱世里没有什么仪式,渡口一枝将谢的桃花,就算聘礼。漫漫仙途,自此有人与你共话寒暑、共守洞府灯火。",
	"cultivation.fate.chen.forget.hint": "不拒不应,渐行渐远",
	"cultivation.fate.chen.forget": "你不应也不拒,只把道别一推再推。后来渡口再没有她的身影。某日在坊市远远望见一个相似的背影,你脚步顿了顿,终究没有上前。",

	"cultivation.fate.chuansong.story2": "魔焰离此地不过数百里了。这座古阵是唯一通往彼岸的路——走,还是留?",
	"cultivation.fate.chuansong.sail.hint": "踏上去往未知的路",
	"cultivation.fate.chuansong.seal.hint": "留待后手,道心从容",
	"cultivation.fate.chuansong.seal": "你拓下完整阵图,以禁制封好洞窟,悄然离去。乱世修仙,多一条退路,道心便多一分从容——这买卖,稳赚不赔。",

	//———— 星海篇(元婴)————
	"cultivation.fate.dayan.disciple.hint": "传承衣钵,神识得授——修为增益 +5%",
	"cultivation.fate.dayan.disciple": "你俯身三拜,执弟子礼。神君残魂抚须长笑,千年孤寂一朝得释,将毕生神识功法倾囊相授——《大衍决》入门那刻,你神识所及,洞府纤尘毕现。",
	"cultivation.fate.dayan.puppet.hint": "铁木傀儡日夜轮作开矿——矿石 +1.5/息",
	"cultivation.fate.dayan.puppet": "你只学傀儡炼制,不肯沾师徒名分。神君冷哼一声却也照教了——数具铁木傀儡日夜轮作,替你开山采矿。只是操控傀儡耗的是神魂,夜深人静时,眉心隐隐作痛。",

	//———— 化神 ————
	"cultivation.fate.yinyue.story2": "玉如意中封印万年,她的幻术依旧倾城。认主禁制在你掌心明明灭灭——是收是放,全在你一念之间。",
	"cultivation.fate.yinyue.bind.hint": "器灵效力,洞府生辉——万物产出 +10%",
	"cultivation.fate.yinyue.free.hint": "还她自由——灵界或有重逢之日",
	"cultivation.fate.yinyue.free": "你解开认主禁制,还她自由身。妖狐回首深深看你一眼,化作银光没入山林。你顿觉心如止水——有些缘分,放手才是圆满。",

	"cultivation.fate.yuanyao.aid.hint": "赠她续命灵材——这世道,肯为别人拼命的人不多了",
	"cultivation.fate.yuanyao.aid": "你取出珍藏的续命灵材相赠。元瑶深深一拜,转身踏入死地,背影决绝。此后她的师姐,亦是你的善缘——这世道,肯为别人拼命的人不多了。",
	"cultivation.fate.yuanyao.bond.hint": "知己之缘——星海见闻,偶至洞府",
	"cultivation.fate.yuanyao.bond": "你们于乱世结为知己,不谈风月,只论道途。她阴葵派人脉遍布星海,偶有奇珍异闻辗转传至你的洞府——知己二字,比道侣更难得。",

	//———— 虚天篇(炼虚)————
	"cultivation.fate.quhun.story": "星海散修手中购得一具古修铁尸,尸身不腐,铁甲覆身,正是炼制护法道兵的上佳之材。揭开面甲的那一刻,你怔住了——",
	"cultivation.fate.quhun.story.known": "星海散修手中购得一具古修铁尸,尸身不腐,铁甲覆身。揭开面甲的那一刻,浑身的血都凉了——铁甲之下,是张铁憨厚的脸。当年地窖里那口药缸,你早该想到,尸身去了哪里。",
	"cultivation.fate.quhun.story2": "炼尸之法你早已备好。指尖的控魂符燃起又掐灭,掐灭又燃起——这具躯壳里,曾住过一个替你挡鞭子的少年。炼,还是不炼?",
	"cultivation.fate.quhun.bury.opt": "葬之入土",
	"cultivation.fate.quhun.bury.hint": "让他做回张铁——功德 +8",
	"cultivation.fate.quhun.bury": "你掘山为墓,葬他于向阳的坡地。碑上只刻「张铁」二字——不是曲魂,不是铁尸,是那个替你挨过鞭子的少年。起身时山风掠过碑前新土,如故人憨笑。",
	"cultivation.fate.quhun.wield.opt": "炼为道兵",
	"cultivation.fate.quhun.wield.hint": "旧友之躯,自此护法不死不休——修为增益 +25%",
	"cultivation.fate.quhun.wield": "控魂符落进眉心,铁尸缓缓睁眼,瞳中一片漠然——那个少年,到底是彻底不在了。「曲魂」不言不语立在洞府门口,比千言盟誓更可靠。只是每逢雨夜,你总不敢看他站的方向。",

	"cultivation.fate.xugu.story": "海外荒岛的古修洞府深处,一具白玉骸骨忽然睁眼——玄骨上人,万年前纵横星海的老鬼。他邀你合作寻宝,声音温和,笑容却比骸骨还难看。与虎谋皮,还是掀桌动手?",
	"cultivation.fate.xugu.ally.hint": "他知道虚天殿的路——但老鬼的「盟友」,从没有一个活到分宝那天",
	"cultivation.fate.xugu.ally": "你与他定下盟约,约定共分遗宝。老鬼咧嘴一笑,化作黑烟附在你的玉佩上——自此你的古宝渐多,只是灵石柜里,时不时少那么几块。而你夜里总忍不住想:他图穷匕见的那一天,会在何时?",
	"cultivation.fate.xugu.slay.hint": "趁他残魂未稳下杀手——古宝 +8",
	"cultivation.fate.xugu.slay": "谈判到一半,你骤然出手,噬金虫潮与风雷翅齐发。玄骨上人连咒骂都来不及,便被打得魂飞魄散——万载算计,终成你囊中古宝。",

	"cultivation.fate.xutian.story": "虚天殿内殿冰窟,上古修士的遗宝近在咫尺——乾蓝冰焰幽光森森,补天丹药香凝而不散。禁制将崩,取哪一样,须在一息之间决断。",
	"cultivation.fate.xutian.story.betray": "内殿禁制将破之际,背后寒毛倒竖——玄骨上人终于撕下了温和的面皮:「小友,宝物归我,你的躯壳,也归我罢。」万年老鬼的全力一击,无声无息印向你的后心。",
	"cultivation.fate.xutian.story2": "冰窟之内宝光冲天,禁制裂纹如蛛网蔓延。乾蓝冰焰与补天丹,二者不可兼得——须在一息之间决断。",
	"cultivation.fate.xutian.tihun.opt": "啼魂吞之",
	"cultivation.fate.xutian.tihun.hint": "以彼之道——老鬼算计万年,喂了灵兽",
	"cultivation.fate.xutian.tihun": "生死一线,你掷出啼魂。那小兽闻到万年阴魂的气味,欢啸一声扑上——玄骨上人纵横一世的算计,尽数成了灵兽口粮。冰窟安静了,只剩啼魂餍足的打嗝声。",
	"cultivation.fate.xutian.flame.opt.betray": "且战且夺冰焰",
	"cultivation.fate.xutian.flame.hint.betray": "边战边收,火中取栗——修为增益 +6%",
	"cultivation.fate.xutian.flame.betray": "你且战且退,一记回马枪将乾蓝冰焰摄入玉瓶。玄骨的咒骂被殿门隔绝——指尖那缕幽蓝,是从老鬼嘴边抢下的底牌。",
	"cultivation.fate.xutian.pill.opt.betray": "夺丹脱身",
	"cultivation.fate.xutian.pill.hint.betray": "留得青山——心魔 -40",
	"cultivation.fate.xutian.pill.betray": "你不恋战,摄起补天丹便借遁光而走。身后传来老鬼气急败坏的咆哮——万载药力入口即化,连惊带险,倒像一场大梦初醒。",
	"cultivation.fate.xutian.flame.hint": "至寒之火淬炼道基——修为增益 +6%",
	"cultivation.fate.xutian.pill.hint": "上古灵丹安神定魄——心魔 -40",
	"cultivation.fate.xutian.pill": "你摄起那枚补天丹,万载药力沉淀如金似玉。服下但觉神魂一阵清凉,多年积下的暗伤杂念,竟悄然化去了大半。",

	//———— 合体 ————
	"cultivation.fate.nangong.story": "合体期名动天南,掩月宗遣使来贺。为首女修摘去面纱,眉目清冷如月——南宫婉。她打量你良久,只觉莫名眼熟,却想不起何处见过。",
	"cultivation.fate.nangong.story.met": "合体期名动天南,掩月宗遣使来贺。为首女修摘去面纱的刹那,你们同时怔住——血色禁地,墨蛟潭边,那一眼原来她记了一千年。「原来是你。」",
	"cultivation.fate.nangong.story.met_guilty": "合体期名动天南,掩月宗遣使来贺。为首女修摘去面纱的刹那,你怔住了——血色禁地,墨蛟潭边,那一眼原来你也记了一千年。她的目光越过你,落在你身侧的陈巧倩身上,微微颔首,什么都没说。",
	"cultivation.fate.nangong.story2": "此后百年,她的传讯剑光不时落入你的洞府。道心有了锚点,心魔再难侵蚀分毫——千年的修行岁月,忽然都有了去处。",

	"cultivation.fate.erying.story2": "它今夜又来了。封印外,那张与你一模一样的脸贴着禁制轻笑:「你我本是一体,分什么彼此?」须做个了断了。",
	"cultivation.fate.erying.merge.hint": "强行炼化,神魂大补——修为增益 +10%,鬓角添霜",
	"cultivation.fate.erying.merge": "你布下锁魂大阵,耗时百日将逆反的元婴炼化归一。神魂暴涨之际,鬓角也添了几缕霜色——它最后看你的那一眼,像极了镜中的自己。",
	"cultivation.fate.erying.release.hint": "解缚结缘,天高海阔——心魔 -40",
	"cultivation.fate.erying.release": "你解开禁制,任它携一缕魂光投往星海深处。世间从此多一个「你」行走——是善是恶,且看造化。放下执念的刹那,心魔如冰雪消融。",
	"cultivation.fate.erying.seal.hint": "镇入魂海——它不会罢休,夜里总有笑声在识海边缘",
	"cultivation.fate.erying.seal": "你加固禁制,将它重新镇入魂海深处。它在封印里冷笑:「你我本是一体,封得住么?」——往后的夜里,那笑声总在识海边缘徘徊不去。",

	//———— 渡劫 ————
	"cultivation.fate.xuanguo.story.twin": "玄天灵果成熟那夜,洞府外落下一道剑光。眉眼与你一般无二的来客负手立于月下——他回来了。「听闻你要渡劫,来看看。」第二元婴与你并肩看了一夜星斗,临走只说了一句:「别死。」",
	"cultivation.fate.xuanguo.story.love": "玄天灵果成熟那夜,你独自去了趟黄枫谷故地。桃花早已谢了几百年,你在一方小小牌位前坐到天亮——巧倩,最后一道坎了。若过得去……罢了,修仙人不信来世。",
	"cultivation.fate.xuanguo.story.bond": "玄天灵果成熟那夜,一道剑光自掩月宗而来。南宫婉立于庭中,递来一只护身玉佩:「天劫那日,我在台外等你。」——千年墨蛟潭边的一眼,原来可以记这么久。",
	"cultivation.fate.xuanguo.story2": "服果脱胎换骨,天劫已在云端酝酿。回头望这一世仙途——故人、恩怨、抉择,皆在此刻涌上心头。最后一跃,要开始了。",

	//———— 纪事与氛围 ————
	"cultivation.fate.next": "继续 ›",
	"cultivation.fate.continue": "记下",
	"cultivation.chronicle.title": "仙途纪事 · {0} 则",
	"cultivation.chronicle.age": "{0} 载",
	"cultivation.msg.mojuren.tame": "法器深处,老鬼阴恻恻地开了口:今日这炉丹,火候再收三分。",
	"cultivation.msg.erying.1": "封印深处传来熟悉的冷笑:「你我本是一体,封得住么?」",
	"cultivation.msg.erying.2": "深夜里,识海边缘的笑声又响了。你加固了一遍封印,笑声依旧。",
	"cultivation.msg.yuanyao.1": "元瑶的传讯玉简到了:星海最近太平,她师姐的元神,又凝实了一分。",
	"cultivation.msg.yuanyao.2": "一封自星海辗转而来的信:元瑶说她最近得了些机缘,顺道替你留意着乱星海的动向。",
	"cultivation.dream.mojuren": "梦魇:雨夜,药缸,一双在黑暗里睁开的眼睛。「好徒儿……」你惊醒时,冷汗透衣。",
	"cultivation.dream.zhangtie": "梦魇:地窖里的铁链声又响了。你循声走去,药缸里浮起的,是一张憨厚的脸。",
	"cultivation.dream.chen": "梦魇:渡口风大,她的衣袖在风中猎猎。你想喊住她,喉咙里却发不出一点声音。",
	"cultivation.dream.erying": "梦魇:镜中人与你相视而笑,笑容一点一点变得陌生。",
	"cultivation.dream.xugu": "梦魇:白玉骸骨坐在你的蒲团上,温和地数着你的灵石:「小友,见者有份。」",
	"cultivation.dream.path": "梦魇:仙途尽头立着一道背影。你走近了看——是你自己,鬓发皆白。"
};

const en = {
	"cultivation.fate.zhangtie.trace.hint": "Search the cellar — one who has seen the truth will know that iron corpse someday",
	"cultivation.fate.zhangtie.trace": "You pry open the cellar lock at midnight: chains and vats remain, but no one is there. Dark dregs settle at the vat's bottom — and you suddenly understand what fuels the Evergreen Art. This debt is noted, along with that night's cold sweat.",
	"cultivation.fate.zhangtie.bide.hint": "The cultivation path is perilous — but some things cannot be forgotten at night",
	"cultivation.fate.zhangtie.bide": "You lower your eyes and keep pounding herbs as if nothing happened. Yet on every rainy night since, that earnest smile floats up and aches in your chest.",
	"cultivation.fate.zhangtie.wary.hint": "Keep an extra eye on Doctor Mo",

	"cultivation.fate.feiyu.oath.hint": "In chaotic times, this warmth will last for years",
	"cultivation.fate.feiyu.oath": "You and Li Feiyu swear brotherhood under the moon. From now on there is someone in the sect who can watch your back — the immortal path is cold; this warmth will last for years.",
	"cultivation.fate.feiyu.decline.hint": "Immortals and mortals walk different roads",
	"cultivation.fate.feiyu.decline": "You politely refuse his wine. Watching him walk away with the jug, you think: mortals live but decades — why drag him into a cultivator's karma? The thought feels colder than expected.",

	"cultivation.fate.mojuren.label": "The Possession Plot",
	"cultivation.fate.mojuren.story": "Mo Juren took you as his disciple, taught you the Evergreen Art, and treated you like his own child. Three years later, on a rainy night, you find a sinister manual in his secret chamber — the Grand Possession Art. Behind the kind eyes lies a long-plotted scheme: what he always wanted was your young body.",
	"cultivation.fate.mojuren.story2": "That very night, he comes. The candle dies without wind. Doctor Mo pushes the door open, all kindness gone from his face: 'Good disciple, this body of mine has few years left — lend me yours.' A soul dark as ink dives from his brow into your sea of consciousness.",
	"cultivation.fate.mojuren.kill.hint": "Cut the grass at its root — Mo Juren will cease to exist",
	"cultivation.fate.mojuren.kill": "As he pounces, you strike back. Doctor Mo falls with unfinished schemes in his eyes. You burn the Grand Possession Art, and its ashes scatter into the mountain wind — this sword cut more than the master-disciple bond; it cut the last of your innocence.",
	"cultivation.fate.mojuren.spare.hint": "Trap his remnant soul in an artifact — he will haunt you, and at Core Formation he will strike back",
	"cultivation.fate.mojuren.spare": "You seize his shattered remnant soul and seal it into a black-iron artifact. He knows his place — trading medical wisdom for drops of soul-nourishing elixir — yet between the lessons, there is always a faint, unreadable sneer. This debt is not finished.",

	"cultivation.fate.jinguang.fight.hint": "Burn his golden light — after this battle, the jianghu will remember 'Li Feiyu'",
	"cultivation.fate.jinguang.fight": "You appear from the eaves and burn through his golden barrier with a single firebolt. Amid the cheers you simply dust off your sleeves — the jianghu will remember 'Li Feiyu'; as for you and this sect, all debts are settled.",
	"cultivation.fate.jinguang.flee.hint": "Immortals and mortals walk different roads — withdraw",
	"cultivation.fate.jinguang.flee": "You slip down the mountain amid the chaos, flames raging behind you. You tell yourself: immortals and mortals walk different roads — I cannot save everyone. Yet that night's fire burns in your dreams for years.",

	"cultivation.fate.xuese.story": "For a sliver of Foundation Establishment fortune, you flood into the Blood Forbidden Zone with disciples of every sect. Spirit herbs carpet the valley; demon beasts roam; and human hearts are more dangerous than any beast — of those who enter, fewer than three in ten walk out alive.",
	"cultivation.fate.xuese.story2": "At dusk on the third day, the clash of artifacts rings from Inkdragon Pool. A silver-robed cultivator fights the ink flood-dragon, hair undone, her protective light nearly spent — a masked disciple of the Moonshadow Sect. The pool is thick with herbs, but the dragon has gone berserk.",
	"cultivation.fate.xuese.jiao.opt": "Aid her at the pool",
	"cultivation.fate.xuese.jiao.hint": "Lend a hand — this pool is deeper than it looks",
	"cultivation.fate.xuese.jiao": "You charge in from the flank, and together you slay the ink dragon. Her voice is clear as cold water when she names herself: Nangong Wan of the Moonshadow Sect. Splitting half the pool's herbs with you, she gives you a long look: 'This favor, I will remember.'",
	"cultivation.fate.xuese.lurk.opt": "Stay hidden, gather herbs",
	"cultivation.fate.xuese.lurk.hint": "Lie low and profit — herbs and relics, safely pocketed",
	"cultivation.fate.xuese.lurk": "You do not look back. Three days of stealth fill your pouch with herbs others died reaching for. Counting your spoils at the valley gate, you can still hear the clash of weapons behind you — you did not look back.",

	"cultivation.fate.qixuan.label": "Yellow Maple Valley",
	"cultivation.fate.qixuan.story": "Leaving the Seven Mysteries Sect behind, you travel a thousand li to Yellow Maple Valley, one of the seven great sects of Yue. Nameless and unknown, you start as an outer disciple — the day you receive the fragment of the Azure Origin Sword Art, you look back from the mountain gate: the mortal world is already below the clouds.",
	"cultivation.fate.qixuan.story.token": "At the gate of Yellow Maple Valley, you present the Ascension Token taken from Golden Light's remains. The gate disciple's face changes — and you are led straight into the inner sect. So that battle's reward was waiting here all along. The full Azure Origin Sword Art is yours, with spirit fields and a cave estate to match.",

	"cultivation.fate.tainan.sword.hint": "A few torn pages — enlightenment, if fate allows",
	"cultivation.fate.tainan.seed.hint": "Plant them in your cave — with that bottle, seeds become a mountain of herbs",
	"cultivation.fate.tainan.seed": "You buy out every spirit-herb seed in the stalls. With the Heavenhold Bottle, seeds become a mountain of herbs — and at the thought, the strings wound tight for days finally loosen a notch.",
	"cultivation.fate.tainan.wine.hint": "Loiter in the tavern; absorb rumors of the Star Sea",

	"cultivation.fate.zhengmo.label": "The War of Righteous and Demonic",
	"cultivation.fate.zhengmo.story": "The six demonic sects march south; overnight the horizon is smoke and fire. When the elders' evacuation order reaches you, the mountain-guarding formation has already burned for three days — a thousand years of foundation, scattering like birds before the storm.",
	"cultivation.fate.zhengmo.story2": "The evacuation bell tolls nine times. In the fires behind the mountain, some still pack the sect's records while others are already gone on their swords. You stand at the ferry crossing — behind you is the first place since you began cultivating that you ever called home.",
	"cultivation.fate.zhengmo.rear.opt": "Fight the rearguard",
	"cultivation.fate.zhengmo.rear.hint": "Buy the sect a thread of survival — karma +5, at mortal risk",
	"cultivation.fate.zhengmo.rear": "You turn back and hold the gate three days beside the disciples who stayed, carving a breach for the retreating boats. Covered in blood on the last ship out, you watch the burning eaves shrink — you did what you could.",
	"cultivation.fate.zhengmo.slip.opt": "Leave first",
	"cultivation.fate.zhengmo.slip.hint": "Stay alive — there is always a next day",
	"cultivation.fate.zhengmo.slip": "You do not look back. The night the demonic flames swallow the mountain, you are already on a barren island a hundred li away. The living get to have a future — you repeat it to yourself until it feels true.",

	"cultivation.fate.duoshi.label": "The Remnant Soul Strikes Back",
	"cultivation.fate.duoshi.story": "At the crucial moment of Core Formation, the black-iron artifact burns hot. Mo Juren's remnant soul bursts from its cage, hurling years of distilled venom at your violet palace — he has waited long for this day. 'Good disciple, didn't I say? Your body — lend it to me.'",
	"cultivation.fate.duoshi.story2": "Within your sea of consciousness, soul wrestles soul — deadlier than any blade. His power is withered but vicious, gnawing at your sanity inch by inch; yours is at its Core-Formation prime, yet you dare not strike with full force, lest you shatter your own foundation.",
	"cultivation.fate.duoshi.burn.opt": "Burn the remnant soul",
	"cultivation.fate.duoshi.burn.hint": "All debts extinguished — karma +3",
	"cultivation.fate.duoshi.burn": "You incinerate the remnant with your Core fire. His last laugh cuts short in the flames — master and disciple, favor and grudge, all burned to ash together.",
	"cultivation.fate.duoshi.tame.opt": "Bind and keep him",
	"cultivation.fate.duoshi.tame.hint": "Keep a wisp of him — a lifetime of medicine and alchemy, now yours",
	"cultivation.fate.duoshi.tame": "You do not kill him. As the binding sigils fall, the old ghost suddenly chuckles: 'Fine. Better than rotting in that old shell.' From then on a sardonic old apothecary lives in your artifact, teaching you all his medicine — as payment for the body he owed you.",

	"cultivation.fate.chen.story": "On the eve of the evacuation, Senior Sister Chen stops you at the ferry. She presses a tightly-sewn pouch into your hands — dried peach blossoms and three bottles of pills. The wind is strong at the crossing; she hesitates, words unspoken — her feelings plain to see, offered to someone sworn to the dao alone.",
	"cultivation.fate.chen.dao.hint": "The dao alone — sever the thread",
	"cultivation.fate.chen.dao": "You bow deeply and board the ferry. She smiles and says 'take care'; the wind scatters the half of the sentence she never finished. Years later you hear she never married, and died of old age — ripples spread across your dao-heart, and will not still.",
	"cultivation.fate.chen.love.hint": "Take her as your dao-companion — in chaotic times, you are each other's mountain gate",
	"cultivation.fate.chen.love": "You take her hand. No ceremony in wartime — a wilting peach blossom at the ferry serves as the betrothal gift. From now on, someone shares your seasons and guards the lamp of your cave.",
	"cultivation.fate.chen.forget.hint": "Neither refuse nor answer — drift apart",
	"cultivation.fate.chen.forget": "You neither refuse nor answer, only postponing the farewell again and again. Later, she is no longer at the crossing. One day at the market you glimpse a familiar back — your step falters, but you do not go to her.",

	"cultivation.fate.chuansong.story2": "The demonic fires are but a few hundred li away. This ancient array is the only road across — go, or stay?",
	"cultivation.fate.chuansong.sail.hint": "Step onto the road into the unknown",
	"cultivation.fate.chuansong.seal.hint": "Keep it as a way back — peace of mind",
	"cultivation.fate.chuansong.seal": "You copy the full array diagram, seal the cave under wards, and leave quietly. In chaotic times, one more way out means one more measure of calm — a trade that cannot lose.",

	"cultivation.fate.dayan.disciple.hint": "Inherit his legacy — spirit-sense teachings, cultivation gain +5%",
	"cultivation.fate.dayan.disciple": "You bow three times, as a disciple should. The Sovereign's remnant laughs, stroking his beard — a millennium of solitude released in a breath — and pours his entire lifetime of spirit-sense arts into you. The moment the Grand Evolution Art opens, every mote of dust in your cave lies within your sense.",
	"cultivation.fate.dayan.puppet.hint": "Iron-wood puppets mine day and night — minerals +1.5/tick",
	"cultivation.fate.dayan.puppet": "You learn only his puppet craft, refusing the master-disciple bond. The Sovereign snorts but teaches anyway — iron-wood puppets work in shifts day and night, mining your mountains. But puppetry costs the soul; in the deep of night, your brow aches faintly.",

	"cultivation.fate.yinyue.story2": "Sealed in the jade ruyi for ten thousand years, her illusions remain unmatched. The master-binding sigil flickers in your palm — keep her, or free her; a single thought decides.",
	"cultivation.fate.yinyue.bind.hint": "A spirit in service — all production +10%",
	"cultivation.fate.yinyue.free.hint": "Grant her freedom — you may meet again in the spirit realm",
	"cultivation.fate.yinyue.free": "You undo the master-binding and return her freedom. The fox looks back at you once, then vanishes into the mountains as silver light. Your heart is suddenly still — some bonds are completed by letting go.",

	"cultivation.fate.yuanyao.aid.hint": "Gift her life-extending materials — few would risk their lives for another",
	"cultivation.fate.yuanyao.aid": "You gift her your treasured life-extending materials. Yuanyao bows deeply, then steps into the deadlands without looking back. Her senior sister is henceforth your good karma — few in this world will still risk their lives for another.",
	"cultivation.fate.yuanyao.bond.hint": "Kindred spirits — news of the Star Sea reaches your cave now and then",
	"cultivation.fate.yuanyao.bond": "In turbulent times you become kindred spirits — not lovers, fellow travelers. Her Yinshui Sect connections span the Star Sea, and rare news occasionally winds its way to your cave — 'kindred spirit' is rarer than 'dao-companion'.",

	"cultivation.fate.quhun.story": "From a Star Sea rogue cultivator you buy an ancient iron corpse — unfallen flesh armored in iron, prime material for a guardian puppet. The moment you lift its visor, you freeze —",
	"cultivation.fate.quhun.story.known": "From a Star Sea rogue cultivator you buy an ancient iron corpse — unfallen flesh armored in iron. The moment you lift its visor, your blood runs cold — beneath the iron is Zhang Tie's honest face. That medicine vat in the cellar, years ago — you should have known where the body went.",
	"cultivation.fate.quhun.story2": "The corpse-refining rite is long prepared. The binding talisman flares at your fingertips, dies, flares again — this shell once housed a boy who took whippings meant for you. Refine it, or lay it to rest?",
	"cultivation.fate.quhun.bury.opt": "Bury him",
	"cultivation.fate.quhun.bury.hint": "Let him be Zhang Tie again — karma +8",
	"cultivation.fate.quhun.bury": "You dig a grave on a sunny slope. On the stone you carve only two characters: Zhang Tie. Not Qu Hun, not an iron corpse — the boy who took your whippings. Rising, you feel mountain wind brush the fresh earth like an old friend's honest laugh.",
	"cultivation.fate.quhun.wield.opt": "Refine him into a puppet",
	"cultivation.fate.quhun.wield.hint": "An old friend's body guards your dao, undying and tireless — cultivation gain +25%",
	"cultivation.fate.quhun.wield": "The binding talisman sinks into his brow; the iron corpse opens its eyes, and there is nothing behind them — the boy is truly gone. Qu Hun stands silent at your cave gate, more reliable than a thousand oaths. Yet on rainy nights, you cannot bear to look where he stands.",

	"cultivation.fate.xugu.story": "Deep in an ancient cultivator's cave on a barren island overseas, a jade-white skeleton suddenly opens its eyes — Xuan Gu, an old devil who ruled the Star Sea ten thousand years ago. He invites you to seek treasure together, voice gentle, smile uglier than the bone beneath. Deal with the tiger, or flip the table?",
	"cultivation.fate.xugu.ally.hint": "He knows the way into Heavenvoid Hall — but no 'ally' of his has ever lived to split the spoils",
	"cultivation.fate.xugu.ally": "You strike the pact. The old devil grins and curls into your jade pendant as black smoke — your relics grow from then on, though a few spirit stones now and then go missing. And at night you cannot help wondering: when will the day come that he shows his knife?",
	"cultivation.fate.xugu.slay.hint": "Strike while his soul is unsteady — relics +8",
	"cultivation.fate.xugu.slay": "Mid-negotiation, you strike — gold-devouring swarm and thunder-wings unleashed together. Xuan Gu has no time even to curse before his soul scatters — ten thousand years of scheming, ending as relics in your pouch.",

	"cultivation.fate.xutian.story": "In the ice vault of Heavenvoid Hall's inner sanctum, ancient treasures lie within reach — the Deepblue Iceflame glows cold and pale, the Heavenmending Pill's scent hangs still. The wards are failing; you have one breath to choose.",
	"cultivation.fate.xutian.story.betray": "As the inner sanctum's wards begin to fail, every hair on your back rises — Xuan Gu finally drops his gentle mask: 'Little friend, the treasure is mine. Your body — mine as well.' A ten-thousand-year devil's full strike lands silently toward your spine.",
	"cultivation.fate.xutian.story2": "Treasure-light floods the ice vault as cracks spider through the wards. The Deepblue Iceflame or the Heavenmending Pill — not both. You have one breath to decide.",
	"cultivation.fate.xutian.tihun.opt": "Feed him to the Weeping Soul",
	"cultivation.fate.xutian.tihun.hint": "Turnabout — the devil's ten-thousand-year scheme ends as beast fodder",
	"cultivation.fate.xutian.tihun": "At death's edge, you hurl the Weeping Soul beast. Catching the scent of an ancient ghost, it shrieks with joy and pounces — Xuan Gu's lifetime of schemes becomes spirit-beast feed. The vault falls silent, save for a satisfied belch.",
	"cultivation.fate.xutian.flame.opt.betray": "Seize the flame mid-fight",
	"cultivation.fate.xutian.flame.hint.betray": "Snatch it under fire — cultivation gain +6%",
	"cultivation.fate.xutian.flame.betray": "Fighting as you retreat, you wheel back and bottle the Deepblue Iceflame. Xuan Gu's curses are cut off by the closing gate — the pale blue wisp at your fingertips is a trump card snatched from a devil's teeth.",
	"cultivation.fate.xutian.pill.opt.betray": "Take the pill and run",
	"cultivation.fate.xutian.pill.hint.betray": "Live to fight another day — heart demon -40",
	"cultivation.fate.xutian.pill.betray": "You do not linger — seize the Heavenmending Pill and flee on your light. Behind you, the old devil roars — but ten thousand years of medicine melt on your tongue, and the whole ordeal fades like waking from a dream.",
	"cultivation.fate.xutian.flame.hint": "Coldest fire to temper your foundation — cultivation gain +6%",
	"cultivation.fate.xutian.pill.hint": "Ancient elixir to calm the soul — heart demon -40",
	"cultivation.fate.xutian.pill": "You take the Heavenmending Pill — ten thousand years of medicine condensed to gold and jade. Cool clarity washes through your spirit; old wounds and stray thoughts dissolve quietly away.",

	"cultivation.fate.nangong.story": "Your name now thunders across Tiannan, and the Moonshadow Sect sends envoys. Their leader lifts her veil — features cold and clear as moonlight: Nangong Wan. She studies you a long while, finding you strangely familiar, but cannot place where.",
	"cultivation.fate.nangong.story.met": "Your name now thunders across Tiannan, and the Moonshadow Sect sends envoys. As their leader lifts her veil, you both freeze — the Blood Forbidden Zone, Inkdragon Pool; she has kept that one glance for a thousand years. 'So it was you.'",
	"cultivation.fate.nangong.story.met_guilty": "Your name now thunders across Tiannan, and the Moonshadow Sect sends envoys. As their leader lifts her veil, you freeze — the Blood Forbidden Zone, Inkdragon Pool; you too kept that glance for a thousand years. Her gaze passes over you and rests on Chen Qiaoqian at your side; she inclines her head slightly, and says nothing.",
	"cultivation.fate.nangong.story2": "In the century after, her message-swords find their way to your cave now and then. Your dao-heart has an anchor; the heart demon can no longer erode it — a thousand years of cultivation suddenly has somewhere to be.",

	"cultivation.fate.erying.story2": "It comes again tonight. Beyond the seal, a face identical to yours leans against the wards, laughing softly: 'We are one — why divide what cannot be divided?' A reckoning is due.",
	"cultivation.fate.erying.merge.hint": "Force the merger — cultivation gain +10%, at the cost of grey at your temples",
	"cultivation.fate.erying.merge": "You lay a soul-locking array and spend a hundred days refining the rebel infant back into one. As your spirit surges, grey threads appear at your temples — its last look at you was the face in your own mirror.",
	"cultivation.fate.erying.release.hint": "Unbind and release — heart demon -40",
	"cultivation.fate.erying.release": "You undo the seal and let it carry a wisp of soul-light into the Star Sea. From now on another 'you' walks the world — good or evil, fate decides. The moment you let go, the heart demon melts like snow.",
	"cultivation.fate.erying.seal.hint": "Bind it again — it will not rest, and laughter will linger at the edge of your mind",
	"cultivation.fate.erying.seal": "You reinforce the wards and press it back into the depths of your soul-sea. Within the seal it sneers: 'We are one — can you truly seal me?' For nights ever after, that laugh prowls the edge of your mind.",

	"cultivation.fate.xuanguo.story.twin": "The night the Heavenfruit ripens, a sword-light descends outside your cave. A visitor with your own eyebrows and eyes stands under the moon — he has returned. 'Heard you are crossing the tribulation. Came to see.' The second infant keeps you company under the stars all night, and leaves saying only: 'Don't die.'",
	"cultivation.fate.xuanguo.story.love": "The night the Heavenfruit ripens, you go alone to the old site of Yellow Maple Valley. The peach blossoms fell centuries ago; you sit until dawn before a small memorial tablet — Qiaoqian, one last threshold. If I make it through... but then, we cultivators do not believe in next lives.",
	"cultivation.fate.xuanguo.story.bond": "The night the Heavenfruit ripens, a sword-light arrives from the Moonshadow Sect. Nangong Wan stands in your courtyard and offers a guardian jade: 'On the day of your tribulation, I will wait beyond the platform.' — One glance at Inkdragon Pool, kept for a thousand years.",
	"cultivation.fate.xuanguo.story2": "The fruit remakes your body; the tribulation brews among the clouds. Looking back over this life's immortal path — friends, debts, choices — all of it rises in your heart at once. The final leap begins.",

	"cultivation.fate.next": "Continue ›",
	"cultivation.fate.continue": "Record it",
	"cultivation.chronicle.title": "Chronicle of the Immortal Path · {0} entries",
	"cultivation.chronicle.age": "year {0}",
	"cultivation.msg.mojuren.tame": "From deep in the artifact, the old ghost drawls: 'Ease the furnace flame by three parts today.'",
	"cultivation.msg.erying.1": "A familiar sneer drifts from the depths of the seal: 'We are one — can you truly seal me?'",
	"cultivation.msg.erying.2": "In the deep of night, laughter sounds again at the edge of your mind. You reinforce the seal once more; the laughter remains.",
	"cultivation.msg.yuanyao.1": "A message-jade arrives from Yuanyao: the Star Sea is calm lately, and her senior sister's spirit has condensed a little further.",
	"cultivation.msg.yuanyao.2": "A letter finds its way across the Star Sea: Yuanyao has come upon some fortune, and says she is keeping an eye on the currents for you.",
	"cultivation.dream.mojuren": "Nightmare: a rainy night, a medicine vat, and eyes opening in the dark. 'Good disciple...' You wake drenched in cold sweat.",
	"cultivation.dream.zhangtie": "Nightmare: the chains in the cellar are rattling again. Following the sound, you find an honest face floating in the medicine vat.",
	"cultivation.dream.chen": "Nightmare: the wind is strong at the ferry, her sleeves fluttering. You try to call out to her, but your throat makes no sound.",
	"cultivation.dream.erying": "Nightmare: the figure in the mirror smiles back at you, and the smile slowly turns strange.",
	"cultivation.dream.xugu": "Nightmare: the jade-white skeleton sits on your meditation cushion, gently counting your spirit stones: 'Little friend, those who see get a share.'",
	"cultivation.dream.path": "Nightmare: at the end of the immortal path stands a figure. You approach — it is you, white-haired."
};

for (const [file, map] of [["res/i18n/zh.json", zh], ["res/i18n/crowdin/zh.json", zh], ["res/i18n/en.json", en]]){
	const data = load(file);
	for (const k of del){ delete data[k]; }
	for (const k in map){ data[k] = map[k]; }
	save(file, data);
	console.log(file + " updated (" + Object.keys(map).length + " keys)");
}
