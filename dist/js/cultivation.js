/**
 * Xianxia mod: cultivation (修仙) — the main progression axis.
 *
 * v2 systems:
 *   stages      - the realm ladder with sub-layers (炼气十层 → 渡劫), each stage
 *                 is a research-style purchase; breakthroughs past 炼气 can FAIL
 *   spiritRoot  - rolled per life (new game / 转世), permanently modifies
 *                 cultivation speed and breakthrough costs
 *   heartDemon  - failure builds 心魔 which suppresses further breakthrough
 *                 chance; decays slowly; 清心丹 purges it
 *   pills       - repeatable purchases granting timed buffs / one-shot boosts
 *   veins       - research-style 灵脉 upgrades, a long-term 灵石 sink
 *   wander      - "外出游历" button: cooldown-gated random encounter table
 *   secluded    - 闭关 toggle: +xiuwei, -mundane production
 *
 * Effect hooks consumed in game.js#calcResourcePerTick:
 *   realmProductionRatio - global production bonus (all stages, veins)
 *   seclusionMundaneRatio - seclusion penalty on every resource except xiuwei
 *   xiuweiRatio          - "<res>Ratio" generic hook (stages, roots, veins, pills, seclusion)
 *   xiuweiPerTickBase    - "<res>PerTickBase" generic hook
 */

dojo.declare("classes.managers.CultivationManager", com.nuclearunicorn.core.TabManager, {
	game: null,

	//-- dynamic state (persisted) --
	heartDemon: 0,		//0..100
	age: 0,				//此生已活年数——寿元耗尽即坐化转世
	lifeWarned: null,	//{"60":bool,...} 每世一次性的寿元警告
	dying: false,		//坐化结算进行中(防重复触发)
	breakMult: 0,		//one-shot relative chance boost from 筑基丹 (×1.5 while active)
	lastBreakTick: null,	//game.ticks of the last real breakthrough — 破境余威的起点
	secluded: false,
	actionCd: 0,		//共享调息——游历/闭关/秘境/上古秘境共用一支气脉
	actionCdMax: 0,		//本次调息总长(渲染进度条用)
	pendingTrip: null,	//旅途中的行动("wander")——倒计时归零时结算收益
	riftKeys: 0,		//秘境之钥 — earned in 秘境历练, spent to challenge 上古秘境
	riftFloor: 0,		//highest cleared 上古秘境 floor (persistent ladder)
	lastAction: null,	//{cls,text,seq} — 最近一次历练结果,渲染进秘境面板
	actionSeq: 0,
	spiritRoot: null,	//key into ROOTS
	buffs: null,		//{juqi: ticksLeft, ziqi: ticksLeft}
	lastLotYear: -1,	//天机阁·每日一卦——上一签所在年份,跨年即新签
	stats: null,		//{wander, seclude, rift} — one-shot counters feeding the guide
	demonWarned: false,	//one-shot 心魔 hint fired at the teachable moment
	sihuaCount: 0,		//累计坐化次数——跨转生保留(成就用),resetState 不清
	failStreakStage: null,	//连败的 stage 名
	failStreak: 0,			//连败次数——每次 +4% 下次成功率,封顶 5 连败(+20%)
	tale: null,			//命途:{fateName: choiceKey|"seen"|arcState}——跨转生的故事状态
	taleLog: null,		//仙途纪事:[{f,c,a,r}]——每个抉择按年岁与境界记入年鉴
	identity: null,		//{name,gender,origin}——道号/性别/出身;同一缕魂,跨转生长存
	identityPending: false,	//入世留名卡面开着时挡 fate 卡,免得弹层叠弹层
	pendingOrigin: false,	//转世已落、出身未择——载入后弹「转世择身」卡

	//突破异象 — 每次冲关掷一次;多数纯叙事,小幅修正当次成败/代价。
	//w 为百分比权重,合计 82 —— 余下 18% 无异象静默。
	BREAK_OMENS: [
		{key:"ziqi",     w:16, bonus: 0.05},					//紫气东来
		{key:"lingchao", w:14, bonus: 0.04},					//灵潮涌动
		{key:"xinmo",    w:14, bonus: -0.05, failDemon: 3},	//心魔低语
		{key:"hushen",   w:10, bonus: 0, failDemonMul: 0.6,	//宗门护道
			cond: function(c){ return c.sects.some(function(s){ return s.researched; }); }},
		{key:"gongming", w:10, bonus: 0.04,					//灵脉共鸣
			cond: function(c){ return c.veins.some(function(v){ return v.researched; }); }},
		{key:"pohou",    w:8,  bonus: 0, pityBonus: 1},		//破而后立——失败但多悟一层
		{key:"dunwu",    w:6,  bonus: 0.15},					//天赐顿悟
		{key:"zouhuo",   w:4,  bonus: -0.10, failDemon: 18, failLoss: 0.10}	//走火入魔
	],

	//破境余威——大关刚过,道基震荡未平;震荡期内再冲关,修为消耗大涨,
	//随后随光阴线性削减,两载复归常价。防止道行一日千里,连破数关。
	BREAK_SURGE_MAX: 4,		//刚破境时修为价 ×4
	BREAK_SURGE_YEARS: 2,	//震荡期约两载(游戏年)

	//realm defs; stages are generated from these
	//战力底数表——index 与 REALM_DEFS 对齐,境内每层再乘 (1+i*0.5)
	COMBAT_BASE: [2, 25, 100, 400, 1600, 6400, 25000, 100000, 400000],
	REALM_DEFS: [
		//lianqi layers are guaranteed successes — the onboarding slope
		//xiuwei costs are tuned against simulate-cultivation.js: each layer should
		//read as a rising wall (minutes→hours by realm), never a stall
		//gate — 大境界门槛:首层突破除修为/材料外还需一道大关
		//  {pill:"x"}      需该丹×1,冲关时消耗(并得丹力加成)
		//  {riftFloor:N}   需通关上古秘境第N层——历生死之险,道基方凝
		{key:"lianqi",  layers:10, base:{xiuwei:80},            mul:1.5,  bonus:0.03, chance:1.0,  life:80},
		{key:"zhuji",   layers:3,  base:{xiuwei:6000, minerals:250},   mul:2.0,  bonus:0.18, chance:0.55, life:200},
		{key:"jiedan",  layers:3,  base:{xiuwei:30000, gold:400},     mul:2.2,  bonus:0.28, chance:0.45, life:500,  gate:{riftFloor:3}},
		{key:"yuanying",layers:3,  base:{xiuwei:80000, science:3000}, mul:2.2,  bonus:0.45, chance:0.35, life:1200, gate:{riftFloor:6}},
		{key:"huashen", layers:3,  base:{xiuwei:250000, faith:5000}, mul:2.2,  bonus:0.7,  chance:0.30, life:3200,  gate:{riftFloor:9}},
		{key:"lianxu",  layers:3,  base:{xiuwei:800000, unobtainium:120}, mul:2.2, bonus:1.0, chance:0.25, life:8000, gate:{riftFloor:12}},
		{key:"heti",    layers:3,  base:{xiuwei:2500000, relic:40},   mul:2.2,  bonus:1.5,  chance:0.20, life:20000, gate:{riftFloor:15}},
		{key:"dacheng", layers:3,  base:{xiuwei:8000000, relic:120, timeCrystal:40}, mul:2.0, bonus:2.2, chance:0.15, life:60000, gate:{riftFloor:20}},
		{key:"dujie",   layers:1,  base:{xiuwei:50000000, relic:300, timeCrystal:200}, mul:1, bonus:5.0, chance:0.10, life:100000, gate:{riftFloor:25}}
	],

	//spiritual roots, rolled per life
	//combatMult — 根骨亦定战力:伪灵根根基虚浮,天灵根生而近道
	ROOTS: [
		{key:"wei",  weight:30, xiuweiMult:0.65, priceMult:0.85, combatMult:0.9},
		{key:"san",  weight:30, xiuweiMult:1.0,  priceMult:1.0,  combatMult:1.0},
		{key:"zhen", weight:20, xiuweiMult:1.5,  priceMult:1.0,  combatMult:1.1},
		{key:"yi",   weight:12, xiuweiMult:1.8,  priceMult:1.0,  combatMult:1.15},
		{key:"tian", weight:8,  xiuweiMult:2.5,  priceMult:1.0,  combatMult:1.25}
	],

	//pills — 真道具:先炼制入库(val++),再服用消耗(val--)。效果在 usePill()
	//unlock(c) 决定该丹何时现形——丹方不悟自现,按修行进境渐次解锁
	pills: [{
		name: "juqi",
		label: $I("cultivation.pill.juqi.label"),
		description: $I("cultivation.pill.juqi.desc"),
		unlock: function(c){ return c.getStage("lianqi_2").researched; },
		prices: [{name:"catnip", val:200}, {name:"spice", val:10}],
		val: 0
	},{
		name: "zhujidan",
		label: $I("cultivation.pill.zhujidan.label"),
		description: $I("cultivation.pill.zhujidan.desc"),
		unlock: function(c){ return c.getStage("lianqi_8").researched; },
		prices: [{name:"minerals", val:300}, {name:"spice", val:30}],
		val: 0
	},{
		name: "qingxin",
		label: $I("cultivation.pill.qingxin.label"),
		description: $I("cultivation.pill.qingxin.desc"),
		unlock: function(c){ return c.getStage("zhuji_0").researched; },
		prices: [{name:"spice", val:60}, {name:"minerals", val:400}],
		val: 0
	}],

	//spirit veins — research-style purchases, the long-term 灵石 sink
	veins: null,

	//fates — 仙缘:里程碑剧情事件。每个抉择写入 tale(命途),后续剧情的
	//文案与选项按命途变体;奖励只保留真实机制效果,不再有 ±心魔/碎屑
	//打发式的添头。三条长线因果在此接通:
	//  阿岩→温九针→铁衣(夺舍之局的因果,饶恕会在结丹时遭残魂反扑)
	//  葬魂谷→冷凝霜(初见与否,改写合体重逢)
	//  冥骨→陨仙殿(结盟者在殿中遭背叛,吞魄兽可吞之)
	//
	//字段:cond 触发条件;variant 返回文案变体后缀(.story.<v>);pages
	//多幕数;choices[].cond 选项可见条件;choices[].effects 常驻机制效果。
		fates: [{
		//———— 凡尘篇·青峰门(炼气)————
		name: "zhangtie",
		label: $I("cultivation.fate.zhangtie.label"),
		researched: false,
		atStage: "lianqi_1",
		pages: 3,
		effects: {},
		choices: [{
			key: "trace"	//夜探地窖——见过真相的人,日后认得那具铁尸
		},{
			key: "bide"		//隐忍不发
		},{
			key: "wary"		//将信将疑——对温先生留了心眼
		}]
	},{
		name: "bottle",
		label: $I("cultivation.fate.bottle.label"),
		researched: false,
		atStage: "lianqi_2",
		pages: 2,
		effects: {"spicePerTickBase": 0.02}	//月露凝碧,灵香自生——凝露瓶是命定之物
	},{
		name: "feiyu",
		label: $I("cultivation.fate.feiyu.label"),
		researched: false,
		atStage: "lianqi_4",
		pages: 2,
		effects: {},
		choices: [{
			key: "oath"		//义结金兰
		},{
			key: "name"		//借其名行世——tale.feiyu
		},{
			key: "decline"	//仙凡殊途
		}]
	},{
		name: "mojuren",
		label: $I("cultivation.fate.mojuren.label"),
		researched: false,
		atStage: "lianqi_6",
		pages: 3,
		effects: {},
		choices: [{
			key: "kill"		//夺舍反杀——斩断师徒,也斩断后患
		},{
			key: "spare"	//擒而不杀——残魂囚于法器,结丹之期他将反扑
		}]
	},{
		name: "jinguang",
		label: $I("cultivation.fate.jinguang.label"),
		researched: false,
		atStage: "lianqi_8",
		pages: 2,
		effects: {},
		choices: [{
			key: "fight"	//挺身而出——阵前斩之,得登仙令
		},{
			key: "flee"		//携瓶夜遁
		}]
	},{
		name: "xuese",
		label: $I("cultivation.fate.xuese.label"),
		researched: false,
		atStage: "lianqi_9",
		pages: 3,
		effects: {},
		choices: [{
			key: "jiao",	//玄蛟泽援手——初遇冷凝霜(tale.nangong="met")
			grant: {spice: 300}
		},{
			key: "lurk",	//苟着采药——收获更丰,未识佳人
			grant: {relic: 8, spice: 600}
		}]
	},{
		//———— 苍梧山(筑基)————
		name: "qixuan",
		label: $I("cultivation.fate.qixuan.label"),
		researched: false,
		atStage: "zhuji_0",
		pages: 2,
		effects: {"xiuweiRatio": 0.15},
		variant: function(c){ return (c.tale.jinguang == "fight") ? "token" : null; }
	},{
		name: "tainan",
		label: $I("cultivation.fate.tainan.label"),
		researched: false,
		atStage: "zhuji_1",
		pages: 2,
		effects: {},
		choices: [{
			key: "sword"	//购剑诀残页
		},{
			key: "seed"		//收灵药种子——与凝露瓶相合
		},{
			key: "wine"		//沽酒听书——星海传闻入耳
		}]
	},{
		name: "fengyun",
		label: $I("cultivation.fate.fengyun.label"),
		researched: false,
		atStage: "zhuji_2",
		pages: 2,
		effects: {}			//dynamic:蜂云剑护体——游历收获×1.5,伏击减半
	},{
		//———— 离乱篇(结丹)————
		//正邪大战:苍梧山陷落,南荒板荡——正是远遁坠星海的因由
		name: "zhengmo",
		label: $I("cultivation.fate.zhengmo.label"),
		researched: false,
		atStage: "jiedan_0",
		pages: 3,
		effects: {},
		choices: [{
			key: "rear",	//断后死战——为师门争一线生机
			grant: {karma: 5}
		},{
			key: "slip"		//先走一步——活着才有来日
		}]
	},{
		//温九针残魂夺舍——唯"擒而不杀"者有此劫;了结或收服,因果两清
		name: "duoshi",
		label: $I("cultivation.fate.duoshi.label"),
		researched: false,
		atStage: "jiedan_1",
		pages: 3,
		cond: function(c){ return c.tale.mojuren == "spare"; },
		effects: {},
		choices: [{
			key: "burn",	//焚其残魂——恩怨尽泯,tales.mojuren="ended"
			grant: {karma: 3}
		},{
			key: "tame",	//镇而收之——以其毕生药理为已用
			effects: {"spicePerTickBase": 0.08}	//温先生的医术丹道,至此为你所用
		}]
	},{
		name: "chen",
		label: $I("cultivation.fate.chen.label"),
		researched: false,
		atStage: "jiedan_1",
		pages: 2,
		effects: {},
		choices: [{
			key: "dao"		//一心向道——苍梧山的桃花雨,此后只在梦里
		},{
			key: "love"		//结为道侣——tale.chen="love",合体重逢有别
		},{
			key: "forget"	//相忘江湖
		}]
	},{
		name: "chuansong",
		label: $I("cultivation.fate.chuansong.label"),
		researched: false,
		atStage: "jiedan_2",
		pages: 2,
		effects: {},
		choices: [{
			key: "sail"		//修复古阵,远行星海——正魔战火中的生路
		},{
			key: "seal"		//拓图封存,另觅它途
		}]
	},{
		//———— 星海篇(元婴)————
		name: "shijin",
		label: $I("cultivation.fate.shijin.label"),
		researched: false,
		atStage: "yuanying_0",
		pages: 2,
		effects: {"relicPerTickBase": 0.001}
	},{
		name: "dayan",
		label: $I("cultivation.fate.dayan.label"),
		researched: false,
		atStage: "yuanying_1",
		pages: 2,
		effects: {},
		choices: [{
			key: "disciple",	//拜师千机——神识真传《千机引》
			effects: {"xiuweiRatio": 0.05}
		},{
			key: "puppet",		//只求傀儡术——铁木傀儡日夜轮作开矿
			effects: {"mineralsPerTickBase": 1.5}
		}]
	},{
		name: "tihun",
		label: $I("cultivation.fate.tihun.label"),
		researched: false,
		atStage: "yuanying_2",
		pages: 2,
		effects: {}			//dynamic:突破失利时心魔滋长减半;陨仙殿中能吞冥骨
	},{
		//———— 化神 ————
		name: "yinyue",
		label: $I("cultivation.fate.yinyue.label"),
		researched: false,
		atStage: "huashen_0",
		pages: 2,
		effects: {},
		choices: [{
			key: "bind",
			effects: {"realmProductionRatio": 0.1}	//器灵效力:常驻产出 +10%
		},{
			key: "free",	//放归山林——灵界重逢之约,tale.yinyue="free"
			effects: {}
		}]
	},{
		name: "yuanyao",
		label: $I("cultivation.fate.yuanyao.label"),
		researched: false,
		atStage: "huashen_1",
		pages: 2,
		effects: {},
		choices: [{
			key: "aid"		//鼎力相助——她记下了这份恩
		},{
			key: "bond"		//结为知己——星海见闻偶至洞府
		}]
	},{
		//———— 陨仙篇(炼虚)————
		//铁衣:铁尸面甲之下,是阿岩憨厚的脸——凡尘篇的因果在此落地
		name: "quhun",
		label: $I("cultivation.fate.quhun.label"),
		researched: false,
		atStage: "lianxu_0",
		pages: 3,
		effects: {},
		variant: function(c){
			var z = c.tale.zhangtie;
			return (z == "trace" || z == "wary") ? "known" : null;
		},
		choices: [{
			key: "bury",	//葬之入土——他还了阿岩一个名字
			grant: {karma: 8}
		},{
			key: "wield",	//炼为道兵——旧友之躯,自此护法不死不休
			effects: {"xiuweiRatio": 0.25}
		}]
	},{
		name: "xugu",
		label: $I("cultivation.fate.xugu.label"),
		researched: false,
		atStage: "lianxu_1",
		pages: 2,
		effects: {},
		choices: [{
			key: "ally"		//虚与委蛇——tale.xugu="ally",陨仙殿中他将反噬
		},{
			key: "slay",	//先下手为强——取其遗藏
			grant: {relic: 8}
		}]
	},{
		name: "xutian",
		label: $I("cultivation.fate.xutian.label"),
		researched: false,
		atStage: "lianxu_2",
		pages: 3,
		effects: {},
		variant: function(c){ return (c.tale.xugu == "ally") ? "betray" : null; },
		choices: [{
			key: "tihun",	//吞魄吞之——唯遭冥骨背叛且吞魄在手者可选
			cond: function(c){ return c.tale.xugu == "ally" && c.getFate("tihun").researched; },
			grant: {relic: 12}
		},{
			key: "flame",	//取玄冰魄焰——至寒之火淬炼道基
			effects: {"xiuweiRatio": 0.06}
		},{
			key: "pill",	//取易髓丹——万载药力洗经伐髓
			demonRelief: 40
		}]
	},{
		//———— 合体 ————
		name: "nangong",
		label: $I("cultivation.fate.nangong.label"),
		researched: false,
		atStage: "heti_0",
		pages: 3,
		effects: {},			//dynamic:心魔消解×3
		variant: function(c){
			if (c.tale.nangong == "met"){
				return (c.tale.chen == "love") ? "met_guilty" : "met";
			}
			return null;
		}
	},{
		name: "qingyuan",
		label: $I("cultivation.fate.qingyuan.label"),
		researched: false,
		atStage: "heti_1",
		pages: 2,
		effects: {}
	},{
		name: "erying",
		label: $I("cultivation.fate.erying.label"),
		researched: false,
		atStage: "heti_2",
		pages: 3,
		effects: {},
		choices: [{
			key: "merge",	//炼化归一——夺婴之力,道基大涨
			effects: {"xiuweiRatio": 0.1}
		},{
			key: "release",	//放其自立——世间多一个"你";渡劫之期或有一晤
			demonRelief: 40
		},{
			key: "seal",	//重新封禁——封印里的冷笑夜夜不绝
			effects: {"xiuweiRatio": 0.04}
		}]
	},{
		//———— 大乘 ————
		name: "fenglei",
		label: $I("cultivation.fate.fenglei.label"),
		researched: false,
		atStage: "dacheng_0",
		pages: 2,
		effects: {}			//dynamic:游历与秘境冷却减半
	},{
		name: "xiedao",
		label: $I("cultivation.fate.xiedao.label"),
		researched: false,
		atStage: "dacheng_1",
		pages: 2,
		effects: {"realmProductionRatio": 0.05}	//铜甲翁代工——紫雷竹为酬,琐事尽付
	},{
		//———— 渡劫 ————
		name: "xuanguo",
		label: $I("cultivation.fate.xuanguo.label"),
		researched: false,
		atStage: "dujie_0",
		pages: 3,
		grant: {relic: 50},
		effects: {},
		variant: function(c){	//终章回首——命途不同,余韵不同
			if (c.tale.erying == "release"){ return "twin"; }
			if (c.tale.chen == "love"){ return "love"; }
			if (c.tale.nangong == "met"){ return "bond"; }
			return null;
		}
	}],

	//artifacts (法宝) — droppable equipment from 上古秘境 runs.
	//baseEffects are multiplied by rank on drop/dupe; duplicates past rank 3 salvage into relic
	artifacts: [{
		name: "xuantie",
		label: $I("cultivation.artifact.xuantie.label"),
		description: $I("cultivation.artifact.xuantie.desc"),
		weight: 30,
		baseEffects: {"xiuweiRatio": 0.08},
		researched: false, rank: 0
	},{
		name: "juling",
		label: $I("cultivation.artifact.juling.label"),
		description: $I("cultivation.artifact.juling.desc"),
		weight: 25,
		baseEffects: {"xiuweiRatio": 0.05},
		researched: false, rank: 0
	},{
		name: "fengchi",
		label: $I("cultivation.artifact.fengchi.label"),
		description: $I("cultivation.artifact.fengchi.desc"),
		researched: false, rank: 0,
		weight: 20,
		baseEffects: {"mineralsPerTickBase": 3}	//风霆翼行万里寻宝
	},{
		name: "yanghun",
		label: $I("cultivation.artifact.yanghun.label"),
		description: $I("cultivation.artifact.yanghun.desc"),
		weight: 15,
		baseEffects: {"relicPerTickBase": 0.0008},
		researched: false, rank: 0	//dynamic: heart-demon decay +0.02/rank
	},{
		name: "qiankun",
		label: $I("cultivation.artifact.qiankun.label"),
		description: $I("cultivation.artifact.qiankun.desc"),
		weight: 7,
		baseEffects: {"realmProductionRatio": 0.06, "xiuweiRatio": 0.05},
		researched: false, rank: 0
	},{
		name: "pangu",
		label: $I("cultivation.artifact.pangu.label"),
		description: $I("cultivation.artifact.pangu.desc"),
		weight: 3,
		baseEffects: {"xiuweiRatio": 0.12, "realmProductionRatio": 0.06},
		researched: false, rank: 0
	},{
		name: "xuding",
		label: $I("cultivation.artifact.xuding.label"),
		description: $I("cultivation.artifact.xuding.desc"),
		weight: 5,
		baseEffects: {"xiuweiRatio": 0.09, "relicPerTickBase": 0.0004},
		researched: false, rank: 0
	},{
		name: "yuanci",
		label: $I("cultivation.artifact.yuanci.label"),
		description: $I("cultivation.artifact.yuanci.desc"),
		weight: 2,
		baseEffects: {"realmProductionRatio": 0.07, "xiuweiRatio": 0.08},
		researched: false, rank: 0
	}],

	//sects — the second progression spine: sect rank promotions gated by realm
	sects: [{
		name: "sect1",
		label: $I("cultivation.sect.1.label"),
		description: $I("cultivation.sect.1.desc"),
		gate: "zhuji_0",
		prices: [{name:"minerals", val:400}, {name:"xiuwei", val:3000}],
		effects: {"xiuweiRatio": 0.1},
		chance: 1.0, researched: false
	},{
		name: "sect2",
		label: $I("cultivation.sect.2.label"),
		description: $I("cultivation.sect.2.desc"),
		gate: "zhuji_2",
		prices: [{name:"minerals", val:2500}, {name:"xiuwei", val:10000}],
		effects: {"xiuweiRatio": 0.15, "realmProductionRatio": 0.05},
		chance: 1.0, researched: false
	},{
		name: "sect3",
		label: $I("cultivation.sect.3.label"),
		description: $I("cultivation.sect.3.desc"),
		gate: "jiedan_0",
		prices: [{name:"gold", val:800}, {name:"xiuwei", val:20000}],
		effects: {"xiuweiRatio": 0.25, "realmProductionRatio": 0.08},
		chance: 1.0, researched: false
	},{
		name: "sect4",
		label: $I("cultivation.sect.4.label"),
		description: $I("cultivation.sect.4.desc"),
		gate: "yuanying_0",
		prices: [{name:"science", val:6000}, {name:"xiuwei", val:60000}],
		effects: {"xiuweiRatio": 0.4, "realmProductionRatio": 0.12},
		chance: 1.0, researched: false
	},{
		name: "sect5",
		label: $I("cultivation.sect.5.label"),
		description: $I("cultivation.sect.5.desc"),
		gate: "huashen_0",
		prices: [{name:"faith", val:9000}, {name:"xiuwei", val:200000}],
		effects: {"xiuweiRatio": 0.6, "realmProductionRatio": 0.15},
		chance: 1.0, researched: false
	},{
		name: "sect6",
		label: $I("cultivation.sect.6.label"),
		description: $I("cultivation.sect.6.desc"),
		gate: "lianxu_0",
		prices: [{name:"relic", val:250}, {name:"xiuwei", val:600000}],
		effects: {"xiuweiRatio": 0.9, "realmProductionRatio": 0.2},
		chance: 1.0, researched: false
	}],

	stages: null,
	realms: null,		//alias kept for smoke tests / external callers

	WANDER_CD: 600,			//~2 min at 5 ticks/s
	RIFT_CD: 300,			//~1 min — tighter loop than 游历, it IS the farming room
	//历练所得按「下一层破境价」的比例给付——一场机缘是一层天的几分之一,
	//低境不靠走运连跳数层,高境也不是滴水入海;再乘已破层数的渐衰,
	//免得渡劫门前一回秘境便抵半层天
	WANDER_PAY: 0.08,		//游历机缘(17% 概率)
	RIFT_PAY: 0.05,			//秘境一行
	AMBUSH_PAY: 0.04,		//反杀劫修的缴获
	GRIFT_PAY: 0.3,			//大秘境破关
	GRIFT_FAIL_PAY: 0.1,	//大秘境败退亦有所得
	HEART_DEMON_GATE: 90,	//blocked above this
	SECLUSION_XIUWEI: 0.6,
	SECLUSION_MUNDANE: -0.9,	//闭门锁世——凡俗产出近乎断绝,唯修为一途
	ARTIFACT_RANK_MAX: 3,
	DEMON_WARN_AT: 40,		//fire the one-shot 心魔 hint past this
	LIFE_WARN: [0.6, 0.8, 0.95],	//寿元已耗比例的三档警告
	ASCENSION_KARMA: 3,			//坐化转世时按大境界序数追加的业力

	//道途指引 — the onboarding checklist. Steps are derived from live state
	//(stages, counters, collections) so the panel self-completes as the player
	//climbs; each text tells them where to go next, not just what happened.
	//The first three steps teach the resource chain on the 营造 tab — before
	//them a fresh player sees two buildings and no idea what to click.
	GUIDE_STEPS: [
		{key: "gather",   nav: "Bonfire", done: function(c, g){
			return g.resPool.get("catnip").value > 0 || g.bld.get("field").val > 0;
		}},
		{key: "field",    nav: "Bonfire", done: function(c, g){ return g.bld.get("field").val > 0; },
			info: function(c, g){
				return c._priceProgress(g, "field", "catnip");
			}},
		{key: "refine",   nav: "Bonfire", done: function(c, g){
			return g.resPool.get("wood").value > 0 || g.bld.get("hut").val > 0;
		},
			info: function(c, g){ return [Math.min(g.resPool.get("catnip").value, 100), 100]; }},
		{key: "hut",      nav: "Bonfire", done: function(c, g){ return g.bld.get("hut").val > 0; },
			info: function(c, g){
				return c._priceProgress(g, "hut", "wood");
			}},
		{key: "break2",   nav: "Cultivation", done: function(c){ return c.getStage("lianqi_1").researched; },
			info: function(c, g){
				var prices = c.getStage("lianqi_1").prices;
				for (var i = 0; i < prices.length; i++){
					if (prices[i].name == "xiuwei"){ return [g.resPool.get("xiuwei").value, prices[i].val]; }
				}
			}},
		{key: "wander",   nav: "Cultivation", done: function(c){ return c.stats.wander > 0; }},
		{key: "seclude",  nav: "Cultivation", done: function(c){ return c.stats.seclude > 0; }},
		{key: "zhuji",    nav: "Cultivation", done: function(c){ return c.getStage("zhuji_0").researched; }},
		{key: "rift",     nav: "Cultivation", done: function(c){ return c.stats.rift > 0; }},
		{key: "grift",    nav: "Cultivation", done: function(c){ return c.riftFloor > 0; }},
		{key: "vein",     nav: "Cultivation", done: function(c){ return c.veins.some(function(v){ return v.researched; }); }},
		{key: "sect",     nav: "Cultivation", done: function(c){ return c.sects.some(function(s){ return s.researched; }); }},
		{key: "artifact", nav: "Cultivation", done: function(c){ return c.artifacts.some(function(a){ return a.researched; }); }},
		{key: "dacheng",  nav: "Cultivation", done: function(c){ return c.getStage("dacheng_0").researched; }}
	],

	//[current, required] toward a building's next purchase, or null when the
	//named resource isn't in its price list (lets the guide hide the bar)
	_priceProgress: function(g, bldName, resName){
		var prices = g.bld.getPrices(bldName);
		for (var i = 0; i < prices.length; i++){
			if (prices[i].name == resName){
				return [Math.min(g.resPool.get(resName).value, prices[i].val), prices[i].val];
			}
		}
		return null;
	},

	//出身 — 开局择一,给一个小小的主题加成。effects 走 effectsBase 常驻管线,
	//powerMult/chanceBonus 是 manager 内直接消费的私钥。
	ORIGINS: [
		{key: "farmer",  effects: {catnipRatio: 0.15}},
		{key: "hunter",  powerMult: 1.08},
		{key: "scholar", effects: {xiuweiRatio: 0.10}},
		{key: "trader",  effects: {mineralsRatio: 0.15}},
		{key: "orphan",  chanceBonus: 0.05}
	],

	//随机道号池 — 姓氏与男女名分列,roll 时按性别取
	NAME_SURNAMES: [
		"韩", "厉", "南宫", "墨", "陈", "王", "李", "张", "刘", "杨", "赵", "黄",
		"周", "吴", "徐", "孙", "马", "朱", "胡", "郭", "何", "林", "罗", "郑",
		"梁", "谢", "宋", "唐", "许", "冯"
	],
	NAME_GIVEN_M: [
		"立", "听雨", "南岳", "剑心", "青锋", "子陵", "乘风", "断岳", "问天",
		"孤鸿", "墨白", "苍玄", "惊澜", "照夜", "守拙", "怀沙", "忘机", "行舟",
		"云旗", "惊尘", "拾遗", "观澜", "慕玄", "逐鹿", "栖云", "靖仇", "破军", "无尘"
	],
	NAME_GIVEN_F: [
		"婉", "凝霜", "紫宸", "雪见", "青梧", "挽月", "飞星", "素心", "灵儿",
		"莫愁", "清瑶", "织云", "映雪", "听澜", "未央", "昭华", "栖梧", "望舒",
		"流萤", "衔月", "漱玉", "惊鸿", "折柳", "问梅", "眠霜", "踏歌", "采薇",
		"拂衣", "栖迟", "青鸾"
	],

	rollName: function(gender){
		var surnames = this.NAME_SURNAMES;
		var given = (gender == "f") ? this.NAME_GIVEN_F : this.NAME_GIVEN_M;
		return surnames[Math.floor(Math.random() * surnames.length)] +
			given[Math.floor(Math.random() * given.length)];
	},

	getOrigin: function(){
		var key = this.identity && this.identity.origin;
		for (var i = 0; i < this.ORIGINS.length; i++){
			if (this.ORIGINS[i].key == key){ return this.ORIGINS[i]; }
		}
		return null;
	},

	getOriginLabel: function(){
		var o = this.getOrigin();
		return o ? $I("identity.origin." + o.key + ".label") : "";
	},

	setIdentity: function(name, gender, originKey){
		this.identity = {name: name, gender: gender, origin: originKey};
		this.applyOrigin();
		//榜上有名——没另起道号就用本名
		if (this.game.telemetry && !this.game.telemetry.jianghuName){
			this.game.telemetry.jianghuName = name;
		}
	},

	//effectsBase 是 manager 常驻乘区,updateEffectCached 每 tick 自动纳入;
	//但键名得先在 effectsCachedExisting 白名单里,出身键构造时还不存在,这里补注册
	applyOrigin: function(){
		var def = this.getOrigin();
		this.effectsBase = (def && def.effects) ? dojo.clone(def.effects) : {};
		this.setEffectsCachedExisting();
	},

	constructor: function(game){
		this.game = game;
		this.buffs = {};
		this.stats = {wander: 0, seclude: 0, rift: 0};
		this.tale = {};
		this.taleLog = [];
		this.stages = this.buildStages();
		this.realms = this.stages;	//compat alias
		this.veins = this.buildVeins();
		//pills/sects/fates are prototype-shared defs — clone per instance so
		//researched/pending/choiceKey state never leaks across GamePage objects
		this.pills = dojo.clone(this.pills);
		this.sects = dojo.clone(this.sects);
		this.fates = dojo.clone(this.fates);
		this.artifacts = dojo.clone(this.artifacts);
		this.registerMeta("research", this.stages, null);
		this.registerMeta("research", this.veins, null);
		this.registerMeta("research", this.pills, null);
		this.registerMeta("research", this.sects, null);
		this.registerMeta("research", this.fates, null);
		this.registerMeta("research", this.artifacts, null);
		this.setEffectsCachedExisting();
	},

	buildStages: function(){
		var stages = [];
		for (var r = 0; r < this.REALM_DEFS.length; r++){
			var def = this.REALM_DEFS[r];
			var realmLabel = $I("cultivation.realm." + def.key + ".label");
			for (var i = 0; i < def.layers; i++){
				var layerKey = (def.layers == 10) ? ("l" + (i + 1)) : ["early","mid","late"][i];
				var prices = [];
				for (var res in def.base){
					var val = def.base[res] * Math.pow(def.mul, i);
					val = this.roundNice(val);
					if (r == 0 && i == 0){ continue; }	//炼气一层 is the free starting stage
					prices.push({name: res, val: val});
				}
				stages.push({
					name: def.key + "_" + i,
					realm: def.key,
					label: (def.layers > 1) ? realmLabel + "·" + $I("cultivation.layer." + layerKey) : realmLabel,
					description: $I("cultivation.realm." + def.key + ".desc"),
					prices: prices,
					effects: {
						"realmProductionRatio": def.bonus,
						//was xiuweiJobRatio — dead since the disciple system was
						//removed; now a direct multiplier on xiuwei production
						"xiuweiRatio": def.bonus * 0.5,
						//flat trickle: the floor under early-game income — meaningful at
						//炼气 (0.03/tick ≈ 0.15/s), negligible next to building income later
						"xiuweiPerTickBase": def.bonus * 1.0,
						//战力底数——境界即道行;每境底数约翻四倍,境内层层渐涨
						"combatPower": this.COMBAT_BASE[r] * (1 + i * 0.5)
					},
					chance: (def.chance >= 1) ? 1 : Math.max(0.05, def.chance - i * 0.04),
					lifespan: def.life,	//寿元随大境界走——突破永远延寿,绝不减寿
					gate: (i == 0 && def.gate) ? def.gate : null,	//大关瓶颈只守首层
					researched: (r == 0 && i == 0)	//start at 炼气一层
				});
			}
		}
		return stages;
	},

	buildVeins: function(){
		var veins = [];
		for (var i = 1; i <= 9; i++){
			veins.push({
				name: "vein" + i,
				label: $I("cultivation.vein.label") + "·" + $I("cultivation.tier." + i),
				description: $I("cultivation.vein.desc." + i),
				prices: [
					{name: "minerals", val: this.roundNice(100 * Math.pow(2.3, i))},
					{name: "xiuwei",   val: this.roundNice(25 * Math.pow(2.0, i))}
				],
				effects: {
					"xiuweiRatio": 0.12,
					"realmProductionRatio": 0.04
				},
				chance: 1.0,
				researched: false
			});
		}
		return veins;
	},

	roundNice: function(v){
		if (v >= 1000){
			var mag = Math.pow(10, Math.floor(Math.log10(v)) - 1);
			return Math.round(v / mag) * mag;
		}
		return Math.round(v);
	},

	// ---------------- spirit root ----------------

	rollRoot: function(){
		var total = 0;
		for (var i = 0; i < this.ROOTS.length; i++){ total += this.ROOTS[i].weight; }
		var roll = Math.random() * total;
		for (var i = 0; i < this.ROOTS.length; i++){
			roll -= this.ROOTS[i].weight;
			if (roll <= 0){
				this.spiritRoot = this.ROOTS[i].key;
				break;
			}
		}
	},

	getRoot: function(){
		if (!this.spiritRoot){
			this.rollRoot();
		}
		for (var i = 0; i < this.ROOTS.length; i++){
			if (this.ROOTS[i].key == this.spiritRoot){ return this.ROOTS[i]; }
		}
		return this.ROOTS[1];	//san as fallback
	},

	getRootLabel: function(){
		return $I("cultivation.root." + this.getRoot().key);
	},

	getDaoTitle: function(){
		return $I("cultivation.title." + this.getRoot().key);
	},

	getFate: function(name){
		return this.getMeta(name, this.fates);
	},

	//道途指引进度 — pending steps in order; the tab renders the next few
	getGuideSteps: function(){
		var pending = [], done = 0;
		for (var i = 0; i < this.GUIDE_STEPS.length; i++){
			var step = this.GUIDE_STEPS[i];
			if (step.done(this, this.game)){ done++; }
			else { pending.push(step); }
		}
		return {pending: pending, done: done, total: this.GUIDE_STEPS.length};
	},

	//指引盒挂进任意 tab——营造页也用同一盒:新手的采集/凝木/筑庐全发生在
	//那里,若只放境界页,开荒期等于没有指引
	renderGuideBox: function(container){
		var box = dojo.create("div", { className: "xxGuide" }, container);
		var game = this.game;
		box.onclick = function(e){
			var el = e.target;
			if (!el){ return; }
			if (el.className == "xx-guide-help"){
				if (game.ui.renderHelp){ game.ui.renderHelp(); }
				$("#helpDiv").show();
				return;
			}
			if (el.className == "xx-guide-nav"){
				var target = el.getAttribute("data-tab");
				var navTab = target && game.getTab(target.toLowerCase());
				if (navTab && navTab.visible){
					//same path as a tab-bar click: set id, then rebuild
					game.ui.activeTabId = target;
					game.ui.render();
				}
			}
		};
		return box;
	},

	//refresh a guide box in place; signature-cached since tab update() ticks
	//at 5/s and only real progress should touch the DOM
	updateGuideBox: function(box){
		if (!box){ return; }
		var guide = this.getGuideSteps();
		if (!guide.pending.length){
			box.style.display = "none";
			box._xxGuideSig = null;
			return;
		}
		box.style.display = "";
		var show = Math.min(3, guide.pending.length);
		var sig = guide.done + "|";
		for (var i = 0; i < show; i++){
			var step = guide.pending[i];
			sig += step.key;
			if (step.info){
				var pr0 = step.info(this, this.game);
				sig += pr0 ? ":" + Math.floor(pr0[0]) + "/" + pr0[1] : "";
			}
			sig += ",";
		}
		sig += guide.pending.length;
		if (sig == box._xxGuideSig){ return; }
		box._xxGuideSig = sig;

		var gh = "<div class=\"xx-guide-hd\">" +
			$I("cultivation.guide.title", [guide.done, guide.total]) +
			" <span class=\"xx-guide-help\">" + $I("cultivation.guide.help") + "</span></div>";
		for (var i = 0; i < show; i++){
			var step = guide.pending[i];
			gh += "<div class=\"xx-guide-step" + (i == 0 ? " xx-guide-next" : "") + "\">" +
				$I("cultivation.guide." + step.key);
			var navTab = step.nav && this.game.getTab(step.nav.toLowerCase());
			if (navTab && navTab.visible){
				gh += " <span class=\"xx-guide-nav\" data-tab=\"" + step.nav + "\">&gt; " + navTab.tabName + "</span>";
			}
			if (step.info){
				var pr = step.info(this, this.game);
				if (pr && pr[1] > 0){
					gh += " <span class=\"xx-guide-prog\">" +
						this.game.getDisplayValueExt(pr[0]) + "/" + this.game.getDisplayValueExt(pr[1]) + "</span>";
				}
			}
			gh += "</div>";
		}
		if (guide.pending.length > show){
			gh += "<div class=\"xx-guide-more\">" +
				$I("cultivation.guide.more", [guide.pending.length - show]) + "</div>";
		}
		box.innerHTML = gh;
	},

	//《修行指南》章目 — the structured help doc. Each entry is a section title
	//key plus N bullet keys "help.s.<name>.b1..bN"; DesktopUI.renderHelp draws
	//them into #helpDiv, and tests assert every referenced key is translated.
	HELP_SECTIONS: [
		{name: "start",  b: 5},
		{name: "realm",  b: 5},
		{name: "action", b: 5},
		{name: "power",  b: 3},
		{name: "eco",    b: 4},
		{name: "fate",   b: 2},
		{name: "life",   b: 3},
		{name: "cloud",  b: 3},
		{name: "faq",    b: 4}
	],

	getHelpSections: function(){
		var secs = [];
		for (var i = 0; i < this.HELP_SECTIONS.length; i++){
			var s = this.HELP_SECTIONS[i];
			var bullets = [];
			for (var b = 1; b <= s.b; b++){
				bullets.push("help.s." + s.name + ".b" + b);
			}
			secs.push({titleKey: "help.s." + s.name + ".t", bodyKeys: bullets});
		}
		return secs;
	},

	//resolve a fate's i18n key, honoring 命途 variants: if f.variant yields
	//a suffix and "<part>.<variant>" exists in the locale, use it — else base.
	//Returns null when neither key exists so callers can test page presence.
	fateKey: function(f, part){
		var base = "cultivation.fate." + f.name + "." + part;
		var v = f.variant ? f.variant(this) : null;
		if (v && this.hasMsg(base + "." + v)){ return base + "." + v; }
		return this.hasMsg(base) ? base : null;
	},

	fateText: function(f, part){
		var k = this.fateKey(f, part);
		return k ? $I(k) : $I("cultivation.fate." + f.name + "." + part);
	},

	hasMsg: function(key){
		return typeof i18nLang != "undefined" && i18nLang.messages && !!i18nLang.messages[key];
	},

	//applies a fate: writes the choice into 命途(tale), records a journal
	//entry in 仙途纪事(taleLog), then the usual grants/effects pipeline
	applyFate: function(f, choice){
		f.pending = false;
		if (choice){
			f.choiceKey = choice.key;
			f.effects = choice.effects || f.effects || {};
			f.grant = choice.grant || f.grant;
			if (choice.demonRelief){
				this.heartDemon = Math.max(0, this.heartDemon - choice.demonRelief);
			}
			if (choice.demonGain){
				this.heartDemon = Math.min(100, this.heartDemon + choice.demonGain);
			}
			this.tale[f.name] = choice.key;
			//arc resolutions — closing these threads ends their ambient events
			if (f.name == "xuese" && choice.key == "jiao"){ this.tale.nangong = "met"; }
			if (f.name == "duoshi"){ this.tale.mojuren = (choice.key == "tame") ? "tame" : "ended"; }
			if (f.name == "xutian"){ this.tale.xugu = "ended"; }
			this.game.msg(this.fateText(f, choice.key), "important");
		} else {
			//不要覆盖他 arc 写入的标记(如 xuese.jiao 写的 tale.nangong="met")
			if (!this.tale[f.name]){ this.tale[f.name] = "seen"; }
			this.game.msg(this.fateText(f, "story"), "important");
		}
		if (f.grant){
			for (var res in f.grant){
				this.game.resPool.addResEvent(res, f.grant[res]);
			}
		}
		this.taleLog.push({
			f: f.name, c: f.choiceKey || null,
			a: Math.floor(this.age), r: this.getCurrentRealmIndex()
		});
		f.researched = true;
	},

	//story card — multi-page scenes (pages>1 flips story → story2 → …) that
	//end on a choice; no-choice fates get a single 记下 button so every beat
	//reads as a scene, not a log line. One card at a time (see update loop).
	showFateChoice: function(f){
		f.pending = true;
		var self = this;
		var restoreFocus = document.activeElement;
		var overlay = dojo.create("div", {className: "xxFateOverlay"}, dojo.byId("gamePageContainer"));
		var card = dojo.create("div", {
			className: "dialog xxFateCard",
			role: "dialog",
			"aria-modal": "true"
		}, overlay);
		var titleEl = dojo.create("div", {
			className: "xxFateTitle",
			innerHTML: f.label
		}, card);
		card.setAttribute("aria-label", titleEl.textContent || f.name);
		var storyEl = dojo.create("div", {
			className: "xxFateStory",
			innerHTML: this.fateText(f, "story")
		}, card);
		var btnWrap = dojo.create("div", {className: "xxFateBtns"}, card);
		var close = function(choice){
			f.pending = false;
			dojo.destroy(overlay);
			if (restoreFocus && restoreFocus.focus){ restoreFocus.focus(); }
			self.applyFate(f, choice);
			self.game.render();
		};
		var showChoices = function(){
			btnWrap.innerHTML = "";
			if (!f.choices){	//无抉择的纯叙事章——一页阅过,记入道途
				var done = dojo.create("div", {
					className: "btn nosel modern xxFateBtn xxFateDone", tabIndex: 0
				}, btnWrap);
				dojo.create("span", {
					className: "btnTitle",
					innerHTML: "<b>" + $I("cultivation.fate.continue") + "</b>"
				}, done);
				dojo.connect(done, "onclick", function(){ close(null); });
				done.focus();
				return;
			}
			for (var i = 0; i < f.choices.length; i++){
				(function(choice){
					if (choice.cond && !choice.cond(self)){ return; }
					var btn = dojo.create("div", {className: "btn nosel modern xxFateBtn", tabIndex: 0}, btnWrap);
					dojo.create("span", {
						className: "btnTitle",
						innerHTML: "<b>" + self.fateText(f, choice.key + ".opt") + "</b><br/>" +
							"<span class=\"xxFateHint\">" + self.fateText(f, choice.key + ".hint") + "</span>"
					}, btn);
					dojo.connect(btn, "onclick", function(){ close(choice); });
				})(f.choices[i]);
			}
			var firstBtn = card.querySelector(".xxFateBtn");
			if (firstBtn){ firstBtn.focus(); }
		};
		var page = 1;
		if (f.pages && f.pages > 1){
			var flip = dojo.create("div", {
				className: "btn nosel modern xxFateBtn xxFateNext", tabIndex: 0
			}, btnWrap);
			dojo.create("span", {
				className: "btnTitle",
				innerHTML: "<b>" + $I("cultivation.fate.next") + "</b>"
			}, flip);
			dojo.connect(flip, "onclick", function(){
				page++;
				var key = self.fateKey(f, "story" + page);	//逐幕吃变体,缺幕即收官
				if (page <= f.pages && key){
					storyEl.innerHTML = $I(key);
				} else {
					showChoices();	//末页之后进抉择/收官
				}
			});
			flip.focus();
		} else {
			showChoices();
		}
		//mandatory choice — Escape stays dead, but focus must not leak behind the card
		card.addEventListener("keydown", function(e){
			if (e.key != "Tab"){ return; }
			var focusables = card.querySelectorAll(".xxFateBtn");
			if (!focusables.length){ return; }
			var first = focusables[0], last = focusables[focusables.length - 1];
			if (e.shiftKey && document.activeElement == first){ e.preventDefault(); last.focus(); }
			else if (!e.shiftKey && document.activeElement == last){ e.preventDefault(); first.focus(); }
		});
	},

	// ---------------- lookups ----------------

	getStage: function(name){
		return this.getMeta(name, this.stages);
	},

	getRealm: function(name){	//compat: resolves any button meta by name
		//quiet local scan — getMeta console.errors on every miss, and a
		//multi-array fallthrough would spam the console on every render
		for (var i = 0; i < this.stages.length; i++){ if (this.stages[i].name == name){ return this.stages[i]; } }
		for (var i = 0; i < this.veins.length; i++){ if (this.veins[i].name == name){ return this.veins[i]; } }
		for (var i = 0; i < this.sects.length; i++){ if (this.sects[i].name == name){ return this.sects[i]; } }
		for (var i = 0; i < this.pills.length; i++){ if (this.pills[i].name == name){ return this.pills[i]; } }
		return null;
	},

	getStageIndex: function(name){
		for (var i = 0; i < this.stages.length; i++){
			if (this.stages[i].name == name){ return i; }
		}
		return -1;
	},

	getHighestStageIndex: function(){
		for (var i = this.stages.length - 1; i >= 0; i--){
			if (this.stages[i].researched){ return i; }
		}
		return -1;
	},

	getCurrentRealm: function(){
		var hi = this.getHighestStageIndex();
		return (hi >= 0) ? this.stages[hi] : this.stages[0];
	},

	//大关瓶颈——首层突破除材料外的第二道门(秘境历练层数)
	//(sect meta 另有 gate 字段是关卡名字符串,typeof 挡之)
	checkGate: function(stage){
		var g = stage.gate;
		if (!g || typeof g != "object" || g.riftFloor == null){ return {ok: true}; }
		return {ok: this.riftFloor >= g.riftFloor, kind: "rift", need: g.riftFloor, have: this.riftFloor};
	},

	gateLabel: function(stage){
		var chk = this.checkGate(stage);
		return $I("cultivation.gate.rift", [chk.need, chk.have]);
	},

	getCurrentRealmIndex: function(){
		var cur = this.getCurrentRealm();
		for (var i = 0; i < this.REALM_DEFS.length; i++){
			if (this.REALM_DEFS[i].key == cur.realm){ return i; }
		}
		return 0;
	},

	// ---------------- 战力 ----------------
	//道行之数:境界是底,灵根定质,神兵道兵灵兽器灵各添一筹;
	//心魔蚀骨,道心不澄者神通先折。秘境/伏击的成败皆以此论。
	getCombatPower: function(){
		//战力底数直接求和——不依赖全局效果缓存的刷新时机
		var base = 0;
		for (var i = 0; i < this.stages.length; i++){
			if (this.stages[i].researched){ base += this.stages[i].effects.combatPower || 0; }
		}
		var mult = this.getRoot().combatMult || 1;
		if (this.getFate("fengyun").researched){ mult *= 1.5; }	//青竹蜂云剑阵
		if (this.tale.quhun == "wield"){ mult *= 1.25; }			//铁衣护法
		if (this.getFate("shijin").researched){ mult *= 1.15; }	//金蠹虫群
		if (this.tale.dayan == "disciple"){ mult *= 1.1; }			//千机引神识
		if (this.tale.yinyue == "bind"){ mult *= 1.1; }			//朔月器灵
		if (this.getFate("tihun").researched){ mult *= 1.1; }		//吞魄傍身
		if (this.getFate("xiedao").researched){ mult *= 1.1; }		//铜甲翁相助
		var origin = this.getOrigin();
		if (origin && origin.powerMult){ mult *= origin.powerMult; }	//猎户之后
		mult *= Math.max(0.3, 1 - this.heartDemon * 0.005);	//心魔蚀骨
		return Math.max(1, base * mult);
	},

	//秘境守关战力天梯——门槛层锚定「上一境界圆满×0.9」,档内几何插值;
	//战力每境约翻四倍,故跨档急升:同一境界内越阶越深,守关者越不可力敌
	RIFT_POWER: [
		[0, 40], [3, 160], [6, 565], [9, 2185], [12, 8665], [15, 34585], [20, 135835], [25, 540835]
	],
	floorPower: function(floor){
		var L = this.RIFT_POWER;
		for (var i = 1; i < L.length; i++){
			if (floor <= L[i][0]){
				var f0 = L[i - 1][0], p0 = L[i - 1][1], span = L[i][0] - f0;
				return Math.round(p0 * Math.pow(L[i][1] / p0, (floor - f0) / span));
			}
		}
		return Math.round(L[L.length - 1][1] * Math.pow(1.5, floor - L[L.length - 1][0]));
	},

	getBreakChance: function(stage){
		var c = (stage.chance != null) ? stage.chance : 1;
		var origin = this.getOrigin();
		c += (origin && origin.chanceBonus) || 0;	//散修遗孤,道心早砺
		c -= this.heartDemon * 0.006;	//心魔噬心,道念不纯则破境愈艰
		if (this.failStreakStage == stage.name){
			c += Math.min(5, this.failStreak) * 0.04;	//屡败屡战
		}
		c *= (1 + this.breakMult);	//丹药按比例抬现有概率,不是粗暴加点
		return Math.max(0.05, Math.min(1, c));
	},

	//心魔耗修税:心魔每点让真突破的修为价 ×(1+0.025)。
	//50 心魔约 ×2.25,近门禁(90)时约 ×3.2——心魔不遏,破境即贵。
	getDemonTax: function(){
		return 1 + this.heartDemon * 0.025;
	},

	//破境余威的修为价倍率:刚破境为 BREAK_SURGE_MAX,随游戏时间线性衰减,
	//BREAK_SURGE_YEARS 年后回落 1。只有真突破(chance<1)触发与承受。
	getBreakSurge: function(){
		if (this.lastBreakTick == null){ return 1; }
		var cal = this.game.calendar;
		var yearTicks = cal.ticksPerDay * cal.daysPerSeason * cal.seasonsPerYear;
		var window = yearTicks * this.BREAK_SURGE_YEARS;
		var elapsed = this.game.ticks - this.lastBreakTick;
		if (elapsed >= window){ return 1; }
		return 1 + (this.BREAK_SURGE_MAX - 1) * (1 - elapsed / window);
	},

	rollBreakOmen: function(){
		var pool = [];
		var total = 0;
		for (var i = 0; i < this.BREAK_OMENS.length; i++){
			var o = this.BREAK_OMENS[i];
			if (o.cond && !o.cond(this)){ continue; }
			pool.push(o);
			total += o.w;
		}
		var r = Math.random() * 100;
		var acc = 0;
		for (var i = 0; i < pool.length; i++){
			acc += pool[i].w;
			if (r < acc){ return pool[i]; }
		}
		return null;	//无异象
	},

	//连败记档:同一境界连冲连垒才累积,换目标/突破/坐化即清零
	registerBreakFail: function(stage, omen){
		var n = (this.failStreakStage == stage.name) ? this.failStreak + 1 : 1;
		if (omen && omen.pityBonus){ n += omen.pityBonus; }
		this.failStreakStage = stage.name;
		this.failStreak = n;
	},

	clearBreakFail: function(){
		this.failStreakStage = null;
		this.failStreak = 0;
	},

	isDemonBlocked: function(){
		return this.heartDemon >= this.HEART_DEMON_GATE;
	},

	// ---------------- 寿元 ----------------

	//当前境界的寿元上限(随层数渐进,stage meta 上已按 def.life*(i+1)/layers 生成)
	getLifespan: function(){
		var realm = this.getCurrentRealm();
		return (realm && realm.lifespan) || 80;
	},

	getLifespanRemaining: function(){
		return Math.max(0, this.getLifespan() - this.age);
	},

	//入世留名——开局(或改名时)弹的道号卡面;originOnly 时为「转世择身」,
	//只换出身,道号性别随魂不改。与 fate 卡同款弹层,身份落定
	//前 identityPending 挡住一切仙缘弹层,免得开局两张卡叠一起。
	showIdentityPrompt: function(originOnly){
		if (this.identityPending){ return; }
		this.identityPending = true;
		var self = this;
		var overlay = dojo.create("div", {className: "xxFateOverlay"}, dojo.byId("gamePageContainer"));
		var card = dojo.create("div", {
			className: "dialog xxFateCard xxIdCard",
			role: "dialog",
			"aria-modal": "true"
		}, overlay);
		dojo.create("div", {className: "xxFateTitle",
			innerHTML: $I(originOnly ? "identity.rebirth.title" : "identity.title")}, card);
		dojo.create("div", {className: "xxFateStory",
			innerHTML: $I(originOnly ? "identity.rebirth.flavor" : "identity.flavor")}, card);

		//道号
		var selGender = (this.identity && this.identity.gender) || "m";
		var nameInput, dice, gBtns = {};
		if (!originOnly){
			var nameRow = dojo.create("div", {className: "xxIdRow"}, card);
			dojo.create("span", {className: "xxIdLbl", innerHTML: $I("identity.name.lbl")}, nameRow);
			nameInput = dojo.create("input", {
				type: "text",
				maxlength: 12,
				className: "xxIdName",
				value: (this.identity && this.identity.name) || this.rollName(selGender)
			}, nameRow);
			dice = dojo.create("a", {
				className: "xxIdDice", innerHTML: "⚄", href: "#",
				title: $I("identity.name.reroll")
			}, nameRow);

			//性别
			var gRow = dojo.create("div", {className: "xxIdRow"}, card);
			dojo.create("span", {className: "xxIdLbl", innerHTML: $I("identity.gender.lbl")}, gRow);
			["m", "f"].forEach(function(g){
				gBtns[g] = dojo.create("a", {
					className: "xxIdChip", innerHTML: $I("identity.gender." + g), href: "#"
				}, gRow);
			});
		}
		var markG = function(){
			for (var k in gBtns){ gBtns[k].className = "xxIdChip" + (k == selGender ? " xx-sel" : ""); }
		};
		markG();

		//出身
		dojo.create("div", {className: "xxIdLbl xxIdLblTop", innerHTML: $I("identity.origin.lbl")}, card);
		var selOrigin = (this.identity && this.identity.origin) || "farmer";
		var oCards = {};
		var markO = function(){
			for (var k in oCards){ oCards[k].className = "xxIdOrigin" + (k == selOrigin ? " xx-sel" : ""); }
		};
		var oWrap = dojo.create("div", {className: "xxIdOrigins"}, card);
		this.ORIGINS.forEach(function(o){
			oCards[o.key] = dojo.create("div", {
				className: "xxIdOrigin",
				innerHTML: "<b>" + $I("identity.origin." + o.key + ".label") + "</b>" +
					"<span>" + $I("identity.origin." + o.key + ".desc") + "</span>"
			}, oWrap);
		});
		markO();

		if (!originOnly){
			dojo.connect(dice, "onclick", function(e){
				dojo.stopEvent(e);
				nameInput.value = self.rollName(selGender);
			});
			["m", "f"].forEach(function(g){
				dojo.connect(gBtns[g], "onclick", function(e){ dojo.stopEvent(e); selGender = g; markG(); });
			});
		}
		this.ORIGINS.forEach(function(o){
			dojo.connect(oCards[o.key], "onclick", function(){ selOrigin = o.key; markO(); });
		});

		var btn = dojo.create("div", {className: "btn nosel modern xxFateBtn", tabIndex: 0}, card);
		dojo.create("span", {
			className: "btnTitle", innerHTML: "<b>" + $I("identity.confirm") + "</b>"
		}, btn);
		dojo.connect(btn, "onclick", function(){
			if (originOnly){
				//转世择身——魂还是那缕魂,只换这一世的出身
				self.identity.origin = selOrigin;
				self.applyOrigin();
				self.pendingOrigin = false;
				self.identityPending = false;
				dojo.destroy(overlay);
				self.game.msg($I("identity.rebirthed", [self.getOriginLabel()]), "important");
				self.game.render();
				return;
			}
			var nm = (nameInput.value || "").trim().slice(0, 12);
			if (!nm){ nm = self.rollName(selGender); }
			var first = !(self.identity && self.identity.name);
			self.setIdentity(nm, selGender, selOrigin);
			self.identityPending = false;
			dojo.destroy(overlay);
			self.game.msg($I(first ? "identity.welcome" : "identity.renamed",
				[nm, self.getOriginLabel()]), "important");
			self.game.render();
		});
		if (nameInput && nameInput.focus){ nameInput.focus(); }
	},

	//寿元耗尽——坐化转世:弹坐化卡面让玩家读完整段叙事,点「转世轮回」
	//才把业力并入存档走标准 reset 流程。dying 期间 update() 早退,不重复触发。
	onLifespanEnd: function(){
		if (this.dying){ return; }
		this.dying = true;
		this.sihuaCount++;
		var bonus = this.getCurrentRealmIndex() * this.ASCENSION_KARMA;
		var karmaText = $I("cultivation.msg.lifespan.karma." + (bonus > 0 ? "gain" : "none"), [bonus]);
		this.game.msg($I("cultivation.msg.lifespan.end",
			[this.getCurrentRealm().label, Math.floor(this.age), karmaText]),
			"important", null, true);
		this.showDeathOverlay(bonus, karmaText);
	},

	showDeathOverlay: function(bonus, karmaText){
		var self = this;
		var overlay = dojo.create("div", {className: "xxFateOverlay"}, dojo.byId("gamePageContainer"));
		var card = dojo.create("div", {
			className: "dialog xxFateCard xxDeathCard",
			role: "dialog",
			"aria-modal": "true"
		}, overlay);
		var titleEl = dojo.create("div", {
			className: "xxFateTitle",
			innerHTML: $I("cultivation.msg.lifespan.end.title")
		}, card);
		card.setAttribute("aria-label", titleEl.textContent || "lifespan");
		dojo.create("div", {
			className: "xxFateStory",
			innerHTML: $I("cultivation.msg.lifespan.end",
				[this.getCurrentRealm().label, Math.floor(this.age), karmaText])
		}, card);
		var btn = dojo.create("div", {className: "btn nosel modern xxFateBtn", tabIndex: 0}, card);
		dojo.create("span", {
			className: "btnTitle",
			innerHTML: "<b>" + $I("cultivation.msg.lifespan.rebirth") + "</b>"
		}, btn);
		dojo.connect(btn, "onclick", function(){
			dojo.destroy(overlay);
			self.applyReincarnation(bonus);
		});
		btn.focus();
	},

	//并入坐化业果并走标准转生——与按钮解耦,便于测试与别处复用
	applyReincarnation: function(bonus){
		if (bonus > 0){
			this.game.karmaKittens += bonus;	//getResetPrestige 会并入存档
		}
		this.game.resetAutomatic();
	},

	// ---------------- pills / seclusion / wander ----------------

	getPill: function(name){
		for (var i = 0; i < this.pills.length; i++){
			if (this.pills[i].name == name){ return this.pills[i]; }
		}
		return null;
	},

	isPillUnlocked: function(pill){
		return !pill.unlock || pill.unlock(this);
	},

	anyPillUnlocked: function(){
		for (var i = 0; i < this.pills.length; i++){
			if (this.isPillUnlocked(this.pills[i])){ return true; }
		}
		return false;
	},

	//炼制入库 — controller pays the price, this just counts
	craftPill: function(name){
		var pill = this.getPill(name);
		if (pill){ pill.val = (pill.val || 0) + 1; }
	},

	//服用消耗 — returns false when nothing to consume / nothing to gain,
	//so the button never silently eats a pill
	usePill: function(name){
		var pill = this.getPill(name);
		if (!pill || !pill.val){ return false; }
		if (name == "zhujidan" && this.breakMult >= 0.5){
			this.game.msg($I("cultivation.msg.pill.maxed"), "notice");
			return false;	//药力已达顶峰——丹药留着下次冲关再用
		}
		if (name == "qingxin" && this.heartDemon <= 0){
			this.game.msg($I("cultivation.msg.pill.clean"), "notice");
			return false;
		}
		pill.val--;
		if (name == "juqi"){
			this.buffs.juqi = 1500;	//~5 min
			this.game.msg($I("cultivation.msg.pill.juqi"), "notice");
		} else if (name == "zhujidan"){
			this.breakMult = Math.min(0.5, this.breakMult + 0.5);
			this.game.msg($I("cultivation.msg.pill.zhujidan"), "notice");
		} else if (name == "qingxin"){
			this.heartDemon = Math.max(0, this.heartDemon - 15);
			this.game.msg($I("cultivation.msg.pill.qingxin"), "notice");
		}
		return true;
	},

	//历练所得锚定「下一层破境」的修为价——给付永远贴着道途走:
	//低境不致以一场走运连跳数层,高境也不至沦为杯水车薪。
	//已破层数越多给付越衰,渡劫门前一回秘境换不来半层天。
	breakPayout: function(share){
		var anchor = 0, fallback = 0, cleared = 0;
		for (var i = 0; i < this.stages.length; i++){
			var st = this.stages[i];
			var xw = 0;
			for (var j = 0; j < st.prices.length; j++){
				if (st.prices[j].name == "xiuwei"){ xw = st.prices[j].val; break; }
			}
			if (xw){ fallback = xw; }
			if (st.researched){ cleared++; continue; }
			if (!anchor && xw){ anchor = xw * this.getRoot().priceMult; }
		}
		if (!anchor){ anchor = fallback; }	//全境圆满后锚定末层价
		return this.roundNice(Math.max(1, anchor * share / (1 + cleared * 0.05)));
	},

	// ---------------- 历练行动:共享调息 ----------------
	//游历/闭关/秘境/上古秘境共用一支气脉——闭关吐纳间不可分身外出,
	//出关散功间也不可径入秘境。actionCd 是四者共同的冷却。

	setActionCd: function(ticks){
		this.actionCd = this.actionCdMax = ticks;
	},

	canAct: function(){
		return this.actionCd <= 0 && !this.secluded;
	},

	setLastAction: function(cls, text){
		this.lastAction = {cls: cls, text: text, seq: ++this.actionSeq};
	},

	toggleSeclude: function(){
		if (!this.secluded && this.actionCd > 0){
			this.game.msg($I("cultivation.msg.action.cd"), "alert");
			return false;
		}
		this.secluded = !this.secluded;
		if (this.secluded){ this.stats.seclude++; }
		this.game.msg($I(this.secluded ? "cultivation.msg.seclude.on" : "cultivation.msg.seclude.off"), "notice");
		return true;
	},

	wander: function(){
		if (!this.canAct()){ return false; }
		this.stats.wander++;
		this.setActionCd(this.WANDER_CD * (this.getFate("fenglei").researched ? 0.5 : 1));
		//出门是有时辰的——机缘在游历归来时结算,不是点下即得
		this.pendingTrip = "wander";
		this.game.msg($I("cultivation.msg.wander.depart"), "notice");
		return true;
	},

	resolveWander: function(){
		var realmIdx = this.getCurrentRealmIndex();
		var hasSwords = this.getFate("fengyun").researched;
		var scale = (1 + realmIdx * 0.8) * (hasSwords ? 1.5 : 1);
		var ambushMin = hasSwords ? 77 : 70;	//蜂云剑护体:伏击窗口 12% -> 5%
		var addRes = this.game.resPool.addResEvent.bind(this.game.resPool);
		var fmt = this.game.getDisplayValueExt.bind(this.game);

		var roll = Math.random() * 100;
		if (roll < 22){
			var amt = this.roundNice(300 * scale);
			addRes("minerals", amt);
			this.game.msg($I("cultivation.msg.wander.minerals", [fmt(amt)]), "notice");
		} else if (roll < 38){
			var amt = this.roundNice(20 * scale);
			addRes("spice", amt);
			this.game.msg($I("cultivation.msg.wander.spice", [fmt(amt)]), "notice");
		} else if (roll < 55){
			var amt = this.breakPayout(this.WANDER_PAY * (hasSwords ? 1.5 : 1));
			addRes("xiuwei", amt);
			this.game.msg($I("cultivation.msg.wander.xiuwei", [fmt(amt)]), "notice");
		} else if (roll < 63){
			var amt = this.roundNice(400 * scale);
			addRes("iron", amt);
			this.game.msg($I("cultivation.msg.wander.iron", [fmt(amt)]), "notice");
		} else if (roll < ambushMin){
			var amt = Math.max(1, Math.round(2 * scale));
			addRes("relic", amt);
			this.game.msg($I("cultivation.msg.wander.relic", [amt]), "important");
		} else if (roll < 82){
			var lose = Math.round(this.game.resPool.get("minerals").value * 0.1);
			if (lose > 0){
				addRes("minerals", -lose);
				this.game.msg($I("cultivation.msg.wander.ambush", [fmt(lose)]), "alert");
			} else {
				this.game.msg($I("cultivation.msg.wander.nothing"), "notice");
			}
		} else {
			this.game.msg($I("cultivation.msg.wander.nothing"), "notice");
		}
		return true;
	},

	// ---------------- 秘境 (rift runs — Diablo-style farmable instances) ----------------

	//秘境历练 — the "exp room": fast-cooldown run with a guaranteed 修为 payout,
	//a chance at a 秘境之钥, and a slim artifact drop
	rift: function(){
		if (!this.canAct() || !this.isRiftUnlocked()){ return false; }
		this.stats.rift++;
		this.setActionCd(this.RIFT_CD * (this.getFate("fenglei").researched ? 0.5 : 1));

		var scale = 1 + this.getCurrentRealmIndex() * 0.8;
		var addRes = this.game.resPool.addResEvent.bind(this.game.resPool);
		var fmt = this.game.getDisplayValueExt.bind(this.game);

		var amt = this.breakPayout(this.RIFT_PAY);
		addRes("xiuwei", amt);
		this.game.msg($I("cultivation.msg.rift.xiuwei", [fmt(amt)]), "notice");

		var roll = Math.random();
		var resultCls = "ok", resultText = $I("cultivation.rift.result.plain");
		if (roll < 0.3){
			this.riftKeys++;
			this.game.msg($I("cultivation.msg.rift.key"), "important");
			resultText = $I("cultivation.rift.result.key");
		} else if (roll < 0.4){
			var m = this.roundNice(200 * scale);
			addRes("minerals", m);
			this.game.msg($I("cultivation.msg.rift.minerals", [fmt(m)]), "notice");
		} else if (roll < 0.45){
			if (this.rollArtifactDrop(scale)){
				this.game.render();
				resultText = $I("cultivation.rift.result.artifact");
			}
		} else if (roll > 0.92){
			//劫修伏击——战力足则反杀夺财,不足则受创而心魔入体
			var ambushPower = this.floorPower(this.riftFloor + 1) * 0.7;
			if (this.getCombatPower() >= ambushPower){
				var spoils = this.breakPayout(this.AMBUSH_PAY);
				addRes("xiuwei", spoils);
				addRes("minerals", this.roundNice(80 * scale));
				this.game.msg($I("cultivation.msg.rift.ambush.win", [fmt(spoils)]), "notice");
				resultText = $I("cultivation.rift.result.ambush.win");
			} else {
				var add = 4 + Math.random() * 4;
				if (this.getFate("tihun").researched){ add *= 0.5; }
				this.heartDemon = Math.min(100, this.heartDemon + add);
				this.game.msg($I("cultivation.msg.rift.ambush"), "alert");
				resultCls = "fail"; resultText = $I("cultivation.rift.result.ambush");
			}
		}
		this.setLastAction(resultCls, resultText);
		return true;
	},

	isRiftUnlocked: function(){
		var gate = this.getStage("zhuji_0");
		return !!(gate && gate.researched);
	},

	//上古秘境 — the "greater rift": spend a key to challenge the next floor.
	//Success pushes the ladder up; failure still pays out, but the demon bites
	greaterRift: function(){
		if (!this.isRiftUnlocked()){ return false; }
		if (!this.canAct()){ return false; }
		if (this.riftKeys <= 0){
			this.game.msg($I("cultivation.msg.rift.nokey"), "alert");
			return false;
		}
		this.setActionCd(this.RIFT_CD * (this.getFate("fenglei").researched ? 0.5 : 1));
		this.riftKeys--;
		var floor = this.riftFloor + 1;
		var scale = 1 + this.getCurrentRealmIndex() * 0.8;
		var addRes = this.game.resPool.addResEvent.bind(this.game.resPool);
		var fmt = this.game.getDisplayValueExt.bind(this.game);

		//战力论成败——守关妖兽的战力门槛 vs 你的道行之数
		//持平约九成;战力过半方有六成;碾压则十拿九稳
		var odds = this.getCombatPower() / this.floorPower(floor);
		var chance = Math.max(0.05, Math.min(0.95, 0.3 + 0.6 * odds));
		var floorScale = scale * (1 + floor * 0.25);

		if (Math.random() < chance){
			this.riftFloor = floor;
			var amt = this.breakPayout(this.GRIFT_PAY);
			addRes("xiuwei", amt);
			var relics = Math.max(1, Math.round(floor * 0.8));
			addRes("relic", relics);
			this.game.msg($I("cultivation.msg.grift.clear", [floor, fmt(amt), relics]), "important");
			this.setLastAction("ok", $I("cultivation.rift.result.grift.ok", [floor]));
			//artifact odds climb with depth — the ladder IS the loot table
			if (Math.random() < Math.min(0.6, 0.15 + floor * 0.03) && this.rollArtifactDrop(floorScale)){
				this.game.render();
			}
		} else {
			var amt = this.breakPayout(this.GRIFT_FAIL_PAY);
			addRes("xiuwei", amt);
			var add = 8 + Math.random() * 6;
			if (this.getFate("tihun").researched){ add *= 0.5; }
			this.heartDemon = Math.min(100, this.heartDemon + add);
			this.game.msg($I("cultivation.msg.grift.fail", [floor, fmt(amt)]), "alert");
			this.setLastAction("fail", $I("cultivation.rift.result.grift.fail", [floor]));
		}
		return true;
	},

	//weighted artifact drop; owned pieces rank up, maxed pieces salvage to relic
	rollArtifactDrop: function(scale){
		var total = 0;
		for (var i = 0; i < this.artifacts.length; i++){ total += this.artifacts[i].weight; }
		var roll = Math.random() * total;
		var art = null;
		for (var i = 0; i < this.artifacts.length; i++){
			roll -= this.artifacts[i].weight;
			if (roll <= 0){ art = this.artifacts[i]; break; }
		}
		if (!art){ return false; }

		if (!art.researched){
			art.researched = true;
			art.rank = 1;
			art.effects = {};
			for (var k in art.baseEffects){ art.effects[k] = art.baseEffects[k]; }
			this.game.msg($I("cultivation.msg.artifact.drop", [art.label]), "important");
		} else if (art.rank < this.ARTIFACT_RANK_MAX){
			art.rank++;
			for (var k in art.baseEffects){ art.effects[k] = art.baseEffects[k] * art.rank; }
			this.game.msg($I("cultivation.msg.artifact.rankup", [art.label, art.rank]), "important");
		} else {
			var salvage = this.roundNice(3 * scale);
			this.game.resPool.addResEvent("relic", salvage);
			this.game.msg($I("cultivation.msg.artifact.salvage", [art.label, salvage]), "notice");
		}
		return true;
	},

	getArtifact: function(name){
		return this.getMeta(name, this.artifacts);
	},

	// ---------------- lifecycle ----------------

	save: function(saveData){
		saveData.cultivation = {
			stages: this.filterMetadata(this.stages, ["name", "researched"]),
			veins: this.filterMetadata(this.veins, ["name", "researched"]),
			heartDemon: this.heartDemon,
			age: this.age,
			lifeWarned: this.lifeWarned,
			breakMult: this.breakMult,
			lastBreakTick: this.lastBreakTick,
			secluded: this.secluded,
			actionCd: this.actionCd,
			actionCdMax: this.actionCdMax,
			pendingTrip: this.pendingTrip,
			lastAction: this.lastAction,
			actionSeq: this.actionSeq,
			riftKeys: this.riftKeys,
			riftFloor: this.riftFloor,
			spiritRoot: this.spiritRoot,
			buffs: this.buffs,
			lastLotYear: this.lastLotYear,
			stats: this.stats,
			demonWarned: this.demonWarned,
			sihuaCount: this.sihuaCount,
			failStreakStage: this.failStreakStage,
			failStreak: this.failStreak,
			tale: this.tale,
			taleLog: this.taleLog,
			identity: this.identity,
			pendingOrigin: this.pendingOrigin || undefined,
			sects: this.filterMetadata(this.sects, ["name", "researched"]),
			pills: this.filterMetadata(this.pills, ["name", "val"]),
			fates: this.filterMetadata(this.fates, ["name", "researched", "choiceKey"]),
			artifacts: this.filterMetadata(this.artifacts, ["name", "researched", "rank"])
		};
	},

	load: function(saveData){
		var c = saveData.cultivation;
		if (!c){ return; }
		if (c.stages){ this.loadMetadata(this.stages, c.stages, "cultivation.stages"); }
		if (c.realms){	//v1 saves: whole-realm names -> mark all layers of every reached realm
			for (var i = 0; i < c.realms.length; i++){
				if (!c.realms[i].researched){ continue; }
				for (var j = 0; j < this.stages.length; j++){
					if (this.stages[j].realm == c.realms[i].name){
						this.stages[j].researched = true;
					}
				}
			}
		}
		if (c.veins){ this.loadMetadata(this.veins, c.veins, "cultivation.veins"); }
		if (c.fates){
			this.loadMetadata(this.fates, c.fates, "cultivation.fates");
			//restore branch choices — grants and demon shifts already
			//happened at choice time, only the passive effects need re-applying
			for (var i = 0; i < this.fates.length; i++){
				var f = this.fates[i];
				if (!f.researched || !f.choiceKey || !f.choices){ continue; }
				for (var j = 0; j < f.choices.length; j++){
					if (f.choices[j].key == f.choiceKey){
						f.effects = f.choices[j].effects || f.effects || {};
						break;
					}
				}
			}
		}
		if (c.sects){ this.loadMetadata(this.sects, c.sects, "cultivation.sects"); }
		if (c.pills){ this.loadMetadata(this.pills, c.pills, "cultivation.pills"); }
		if (c.artifacts){
			this.loadMetadata(this.artifacts, c.artifacts, "cultivation.artifacts");
			for (var i = 0; i < this.artifacts.length; i++){
				var a = this.artifacts[i];
				if (a.researched && a.rank > 0){
					a.effects = {};
					for (var k in a.baseEffects){ a.effects[k] = a.baseEffects[k] * a.rank; }
				}
			}
		}
		if (typeof c.actionCd == "number"){ this.actionCd = c.actionCd; }
		if (typeof c.actionCdMax == "number"){ this.actionCdMax = c.actionCdMax; }
		if (c.pendingTrip){ this.pendingTrip = c.pendingTrip; }
		if (c.lastAction){ this.lastAction = c.lastAction; }
		if (typeof c.actionSeq == "number"){ this.actionSeq = c.actionSeq; }
		if (typeof c.riftKeys == "number"){ this.riftKeys = c.riftKeys; }
		if (typeof c.riftFloor == "number"){ this.riftFloor = c.riftFloor; }
		if (c.tale){ this.tale = c.tale; }
		if (c.identity){ this.identity = c.identity; this.applyOrigin(); }
		if (c.pendingOrigin){ this.pendingOrigin = c.pendingOrigin; }
		if (c.taleLog){ this.taleLog = c.taleLog; }
		if (typeof c.heartDemon == "number"){ this.heartDemon = c.heartDemon; }
		if (typeof c.lastBreakTick == "number"){ this.lastBreakTick = c.lastBreakTick; }
		if (typeof c.age == "number"){ this.age = c.age; }
		if (c.lifeWarned){ this.lifeWarned = c.lifeWarned; }
		if (typeof c.breakMult == "number"){ this.breakMult = c.breakMult; }
		if (typeof c.secluded == "boolean"){ this.secluded = c.secluded; }
		if (c.spiritRoot){ this.spiritRoot = c.spiritRoot; }
		if (c.buffs){ this.buffs = c.buffs; }
		if (typeof c.lastLotYear == "number"){ this.lastLotYear = c.lastLotYear; }
		if (c.stats){
			for (var k in this.stats){
				if (typeof c.stats[k] == "number"){ this.stats[k] = c.stats[k]; }
			}
		}
		if (typeof c.demonWarned == "boolean"){ this.demonWarned = c.demonWarned; }
		if (typeof c.sihuaCount == "number"){ this.sihuaCount = c.sihuaCount; }
		if (typeof c.failStreak == "number"){ this.failStreak = c.failStreak; }
		if (typeof c.failStreakStage == "string"){ this.failStreakStage = c.failStreakStage; }
	},

	update: function(){
		//the realm tab is the heart of this mod; never let it stay hidden
		var tab = this.game.getTab("cultivation");
		if (tab && !tab.visible){
			tab.visible = true;
		}

		if (this.actionCd > 0){
			this.actionCd--;
			//游历归来——时辰到才结算机缘
			if (this.actionCd <= 0 && this.pendingTrip == "wander"){
				this.pendingTrip = null;
				this.resolveWander();
			}
		}

		//天机阁·每日一卦——岁首一签
		if (this.game.calendar.year > this.lastLotYear){
			this.lastLotYear = this.game.calendar.year;
			this.drawLot();
		}
		//寿元流逝——与日历同速(含时间加速),耗尽即坐化转世
		var ticksPerYear = this.game.calendar.ticksPerDay *
			this.game.calendar.daysPerSeason * this.game.calendar.seasonsPerYear;
		this.age += (1 + this.game.timeAccelerationRatio()) / ticksPerYear;
		var lifeUsed = this.age / this.getLifespan();
		if (!this.lifeWarned){ this.lifeWarned = {}; }
		for (var w = 0; w < this.LIFE_WARN.length; w++){
			var th = this.LIFE_WARN[w];
			if (lifeUsed >= th && !this.lifeWarned[String(Math.round(th * 100))]){
				this.lifeWarned[String(Math.round(th * 100))] = true;
				var lvl = (th >= 0.95) ? "urgent" : (th >= 0.8 ? "alert" : "notice");
				this.game.msg($I("cultivation.msg.lifespan.warn." + Math.round(th * 100),
					[Math.floor(this.getLifespanRemaining())]), lvl);
			}
		}
		if (this.age >= this.getLifespan()){
			this.onLifespanEnd();
			return;
		}

		//one-shot teachable-moment hint when the demon first becomes a threat —
		//checked BEFORE decay so the gate value itself can trigger it
		if (!this.demonWarned && this.heartDemon >= this.DEMON_WARN_AT){
			this.demonWarned = true;
			this.game.msg($I("cultivation.msg.demon.warn"), "alert");
		}
		if (this.heartDemon > 0){
			var decay = 0.02 * (this.getFate("nangong").researched ? 3 : 1);
			var lamp = this.getArtifact("yanghun");
			if (lamp && lamp.researched){ decay += 0.02 * lamp.rank; }
			this.heartDemon = Math.max(0, this.heartDemon - decay);
		}
		//fates fire once when their stage is reached (and any cond passes);
		//every beat shows as a story card — an open card anywhere in the
		//array queues all others, so modals never stack and arcs stay ordered
		var cardOpen = !!this.identityPending;	//留名卡面挡一切仙缘弹层
		for (var i = 0; i < this.fates.length; i++){
			if (this.fates[i].pending){ cardOpen = true; break; }
		}
		if (!cardOpen){
			for (var i = 0; i < this.fates.length; i++){
				var f = this.fates[i];
				if (f.researched || (f.cond && !f.cond(this))){ continue; }
				var st = this.getStage(f.atStage);
				if (st && st.researched){
					this.showFateChoice(f);
					break;
				}
			}
		}
		//温先生被擒的残魂成了常驻心魔 —— occasional taunt + demon growth
		if (this.tale.mojuren == "spare" && Math.random() < 0.0004){
			var add = 3 + Math.random() * 4;
			this.heartDemon = Math.min(100, this.heartDemon + add);
			var n = Math.floor(Math.random() * 3) + 1;
			this.game.msg($I("cultivation.msg.mojuren." + n), "alert");
		}
		//收服后的温九针——以毕生药理相报,不时指点一二
		if (this.tale.mojuren == "tame" && Math.random() < 0.0002){
			this.game.msg($I("cultivation.msg.mojuren.tame"), "notice");
		}
		//冥骨老祖"盟友" —— occasionally brings relics, occasionally helps himself to your 灵石
		if (this.tale.xugu == "ally" && Math.random() < 0.0003){
			if (Math.random() < 0.5){
				var gift = Math.max(1, Math.round(this.getCurrentRealmIndex() * 0.8));
				this.game.resPool.addResEvent("relic", gift);
				this.game.msg($I("cultivation.msg.xugu.gift", [gift]), "notice");
			} else {
				var minerals = this.game.resPool.get("minerals");
				var skim = Math.round(minerals.value * 0.03);
				if (skim > 0){
					this.game.resPool.addResEvent("minerals", -skim);
					this.game.msg($I("cultivation.msg.xugu.skim", [this.game.getDisplayValueExt(skim, false, false)]), "alert");
				}
			}
		}
		//第二元婴封于魂海——封印里的冷笑夜夜不绝
		if (this.tale.erying == "seal" && Math.random() < 0.0003){
			this.heartDemon = Math.min(100, this.heartDemon + 2 + Math.random() * 3);
			var en = Math.floor(Math.random() * 2) + 1;
			this.game.msg($I("cultivation.msg.erying." + en), "alert");
		}
		//沈青蘅知己——星海见闻偶至洞府(纯叙事,知己之缘)
		if (this.tale.yuanyao == "bond" && Math.random() < 0.0002){
			var yn = Math.floor(Math.random() * 2) + 1;
			this.game.msg($I("cultivation.msg.yuanyao." + yn), "notice");
		}
		//闭关心魔梦魇——心魔渐盛时,往事随命途入梦;劫由心生,非关天数
		if (this.secluded && this.heartDemon >= this.DEMON_WARN_AT && Math.random() < 0.0005){
			var dreams = [];
			if (this.tale.mojuren == "spare"){ dreams.push("mojuren"); }
			if (this.tale.zhangtie){ dreams.push("zhangtie"); }
			if (this.tale.chen == "dao" || this.tale.chen == "forget"){ dreams.push("chen"); }
			if (this.tale.erying == "seal"){ dreams.push("erying"); }
			if (this.tale.xugu == "ally"){ dreams.push("xugu"); }
			if (!dreams.length){ dreams.push("path"); }
			var d = dreams[Math.floor(Math.random() * dreams.length)];
			this.game.msg($I("cultivation.dream." + d), "alert");
			this.heartDemon = Math.min(100, this.heartDemon + 2);
		}
		for (var b in this.buffs){
			if (this.buffs[b] > 0){
				this.buffs[b]--;
				if (this.buffs[b] <= 0){ delete this.buffs[b]; }
			}
		}
		if (!this.spiritRoot){ this.rollRoot(); }
	},

	updateEffectCached: function(){
		this.inherited(arguments);
		var g = this.game.globalEffectsCached;
		var add = function(k, v){
			g[k] = (typeof g[k] == "number") ? g[k] + v : v;
		};
		add("xiuweiRatio", this.getRoot().xiuweiMult - 1);
		if (this.secluded){
			add("xiuweiRatio", this.SECLUSION_XIUWEI);
			add("seclusionMundaneRatio", this.SECLUSION_MUNDANE);	//只压凡俗,不伤修为
		}
		if (this.buffs.juqi > 0){
			add("xiuweiRatio", 1.0);
		}
		if (this.buffs.ziqi > 0){
			add("xiuweiRatio", 0.5);	//上上签·紫气东来
		}
	},

	//天机阁·每日一卦——每跨一年摇一签,纯手气,图个念想
	drawLot: function(){
		var roll = Math.random() * 100;
		if (roll < 5){	//上上签
			this.buffs.ziqi = this.game.calendar.ticksPerDay *
				this.game.calendar.daysPerSeason * this.game.calendar.seasonsPerYear;
			this.game.msg($I("cultivation.lot.ziqi"), "important");
		} else if (roll < 25){	//上签
			var amt = this.roundNice(200 * (1 + this.getCurrentRealmIndex()));
			this.game.resPool.addResEvent("minerals", amt);
			this.game.msg($I("cultivation.lot.xiaocai", [this.game.getDisplayValueExt(amt)]), "notice");
		} else if (roll < 75){	//中签
			this.game.msg($I("cultivation.lot.pingan"), "notice");
		} else if (roll < 95){	//下签
			this.heartDemon = Math.min(100, this.heartDemon + 8);
			this.game.msg($I("cultivation.lot.yu"), "alert");
		} else {	//下下签
			var catnip = this.game.resPool.get("catnip");
			var lose = Math.round(catnip.value * 0.1);
			if (lose > 0){
				this.game.resPool.addResEvent("catnip", -lose);
				this.game.msg($I("cultivation.lot.huangshulang", [this.game.getDisplayValueExt(lose)]), "alert");
			} else {
				this.game.msg($I("cultivation.lot.pingan"), "notice");	//家徒四壁,黄鼠狼也懒得来
			}
		}
	},

	resetState: function(){
		//stages & fates persist through reincarnation — this IS the prestige
		//ladder, but a new body means a new spirit root and a clean mind
		this.heartDemon = 0;
		this.age = 0;			//新世新身,寿数重来
		this.lifeWarned = {};
		this.dying = false;
		this.breakMult = 0;
		this.lastBreakTick = null;	//新世新身,道基余威尽散
		this.secluded = false;
		this.actionCd = 0;
		this.actionCdMax = 0;
		this.pendingTrip = null;
		this.lastAction = null;
		this.actionSeq = 0;
		this.buffs = {};
		this.lastLotYear = this.game.calendar.year;	//转世不立刻抽签,来年再说
		this.demonWarned = false;
		this.pendingOrigin = false;	//标记由转世存档带来,不入内存态重置
		//tale/taleLog 不清——命途与纪事随仙缘一道跨转生长存
		for (var i = 0; i < this.pills.length; i++){ this.pills[i].val = 0; }	//转世丹药随身化去
		this.clearBreakFail();	//新世新身,前尘连败一笔勾销
		this.rollRoot();
	}
});


dojo.declare("classes.ui.RealmBtnController", com.nuclearunicorn.game.ui.BuildingNotStackableBtnController, {

	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.tooltipName = true;
		result.simplePrices = false;
		return result;
	},

	getType: function(){
		return "realm";
	},

	getMetadata: function(model){
		if (!model.metaCached){
			model.metaCached = this.game.cultivation.getRealm(model.options.id);
		}
		return model.metaCached;
	},

	getPrices: function(model){
		var prices = this.inherited(arguments);
		var meta = model.metadata;
		//spirit-root priceMult applies to realm breakthroughs only — 伪灵根's
		//0.85 discount is a real knob in ROOTS, wire it or it's a dead field
		if (meta && meta.name && meta.name.indexOf("_") > 0){
			var cult = this.game.cultivation;
			var mult = cult.getRoot().priceMult;
			//破境余威 + 心魔耗修:真关的修为价按两者叠乘膨胀
			var surge = (meta.chance != null && meta.chance < 1) ? cult.getBreakSurge() * cult.getDemonTax() : 1;
			if ((mult && mult !== 1) || surge > 1){
				var scaled = [];
				for (var i = 0; i < prices.length; i++){
					var p = prices[i];
					var val = p.val * mult;
					if (p.name == "xiuwei"){ val *= surge; }
					scaled.push({name: p.name, val: val});
				}
				return scaled;
			}
		}
		return prices;
	},

	getName: function(model){
		var meta = model.metadata;
		var cult = this.game.cultivation;
		var label = "<div class=\"label\"><span class=\"label-content\">" + meta.label + "</span></div>";
		if (meta.researched){
			return label + "<div class=\"xx-done\">" + $I("cultivation.btn.reached") + "</div>";
		}
		var suffix = (meta.name.indexOf("vein") === 0)
			? $I("cultivation.btn.attune")
			: (meta.name.indexOf("sect") === 0
				? $I("cultivation.btn.promote")
				: $I("cultivation.btn.breakthrough"));
		if (meta.chance != null && meta.chance < 1){
			var chance = cult.isDemonBlocked() ? 0 : cult.getBreakChance(meta);
			var tier = chance >= 0.7 ? "hi" : (chance >= 0.4 ? "mid" : "lo");
			suffix += " <span class=\"xx-chance xx-c-" + tier + "\">(" +
				$I("cultivation.btn.chance", [Math.round(chance * 100)]) + ")</span>";
		}
		var gateLine = "";
		if (meta.gate && typeof meta.gate == "object"){
			var chk = cult.checkGate(meta);
			gateLine = "<div class=\"xxGate" + (chk.ok ? " xxGateOk" : "") + "\">" +
				cult.gateLabel(meta) + "</div>";
		}
		return label + gateLine + "<div>" + suffix + "</div>";
	},

	updateEnabled: function(model){
		this.inherited(arguments);
		var cult = this.game.cultivation;
		if (meta_blocked(this.game, model)){
			model.enabled = false;
		}
		function meta_blocked(game, model){
			var m = model.metadata;
			if (!m || m.researched){ return false; }
			var c = game.cultivation;
			if (m.chance != null && m.chance < 1 && c.isDemonBlocked()){ return true; }
			if (m.gate && !c.checkGate(m).ok){ return true; }
			return false;
		}
	},

	updateVisible: function(model){
		var cult = this.game.cultivation;
		var meta = model.metadata;
		if (meta.name.indexOf("vein") === 0){
			//灵脉循序渐进:筑基起逐阶显现,上一层点亮才见下一层
			var vIdx = -1;
			for (var i = 0; i < cult.veins.length; i++){
				if (cult.veins[i].name == meta.name){ vIdx = i; break; }
			}
			model.visible = meta.researched ||
				(cult.getStage("zhuji_0").researched && (vIdx == 0 || cult.veins[vIdx - 1].researched));
			return;
		}
		if (meta.name.indexOf("sect") === 0){
			//sects: realm gate + sequential ladder
			var sIdx = -1;
			for (var i = 0; i < cult.sects.length; i++){
				if (cult.sects[i].name == meta.name){ sIdx = i; break; }
			}
			var gate = cult.getStage(meta.gate);
			model.visible = meta.researched ||
				(gate && gate.researched && (sIdx == 0 || cult.sects[sIdx - 1].researched));
			return;
		}
		var idx = cult.getStageIndex(meta.name);
		if (idx < 0){ model.visible = false; return; }
		//境界循序渐进:只见当前境界的进度,与下一层/下一关的门槛
		//——已破的大境界整境收起,旧日层阶不必再占眼帘
		var hi = cult.getHighestStageIndex();
		var curRealm = (hi >= 0) ? cult.stages[hi].realm : cult.stages[0].realm;
		model.visible = (idx == hi + 1) || (meta.researched && meta.realm == curRealm);
	},

	buyItem: function(model, event, callback){
		var meta = model.metadata;
		var cult = this.game.cultivation;
		if (this.game.isReadOnly() || meta.researched || !this.hasResources(model)){
			return this.inherited("buyItem", arguments);
		}
		//境界不可越级——上一层未圆满,此关不入
		var sIdx = cult.getStageIndex(meta.name);
		if (sIdx > 0 && !cult.stages[sIdx - 1].researched){
			this.game.msg($I("cultivation.msg.gate.seq"), "alert");
			return {itemBought: false, reason: "seq"};
		}
		//大关瓶颈——秘境历练不齐,先补门槛
		if (meta.gate){
			var chk = cult.checkGate(meta);
			if (!chk.ok){
				this.game.msg($I("cultivation.msg.gate." + chk.kind, [chk.need]), "alert");
				return {itemBought: false, reason: "gate"};
			}
		}
		if (meta.chance == null || meta.chance >= 1){
			return this.inherited("buyItem", arguments);
		}
		if (cult.isDemonBlocked()){
			this.game.msg($I("cultivation.msg.demonblock"), "alert");
			return {itemBought: false, reason: "demon-blocked"};
		}
		var omen = cult.rollBreakOmen();
		if (omen){
			var variant = Math.random() < 0.5 ? "" : ".b";
			this.game.msg($I("cultivation.omen." + omen.key + variant), "notice");
		}
		var chance = cult.getBreakChance(meta) + (omen ? omen.bonus : 0);
		chance = Math.max(0.05, Math.min(1, chance));
		var roll = Math.random();
		if (roll < chance){
			var result = this.inherited("buyItem", arguments);
			cult.breakMult = 0;
			cult.clearBreakFail();
			var relief = 10;
			if (Math.random() < 0.15){	//完美破关:道基无瑕,心魔尽散
				relief = 25;
				this.game.msg($I("cultivation.msg.breakthrough.perfect", [meta.label]), "important");
			}
			cult.heartDemon = Math.max(0, cult.heartDemon - relief);
			if (cult.game.server){ cult.game.server.submitJianghu(); }	//境界突破即登榜
			return result;
		}
		//breakthrough failed: materials are spent, part of the 修为 returns
		this.payPrice(model);
		var refundRatio = 0.5 - (omen && omen.failLoss ? omen.failLoss : 0);
		for (var i = 0; i < meta.prices.length; i++){
			if (meta.prices[i].name == "xiuwei"){
				this.game.resPool.addResEvent("xiuwei", meta.prices[i].val * refundRatio);
			}
		}
		var add = 12 + Math.random() * 8;
		if (omen && omen.failDemonMul){ add *= omen.failDemonMul; }
		if (omen && omen.failDemon){ add += omen.failDemon; }
		if (cult.getFate("tihun").researched){ add *= 0.5; }	//吞魄兽噬魔
		cult.heartDemon = Math.min(100, cult.heartDemon + add);
		cult.breakMult = 0;
		cult.registerBreakFail(meta, omen);
		var failKey = (omen && omen.key == "zouhuo")
			? "cultivation.msg.fail.zouhuo"
			: "cultivation.msg.fail." + (1 + Math.floor(Math.random() * 3));
		this.game.msg($I(failKey, [meta.label, Math.round(add)]), "alert");
		this.game.render();
		return {itemBought: false, reason: "breakthrough-failed"};
	},

	onPurchase: function(model){
		this.inherited(arguments);
		var meta = model.metadata;
		var cult = this.game.cultivation;
		var idx = cult.getStageIndex(meta.name);
		if (idx < 0){
			if (meta.name.indexOf("sect") === 0){
				this.game.msg($I("cultivation.msg.promoted", [meta.label]), "important");
			}
			return;	//a vein or sect, not a stage
		}
		if (meta.chance != null && meta.chance < 1){
			//大关告破,道基震荡——余威期内再破真关耗修大涨
			cult.lastBreakTick = cult.game.ticks;
			this.game.msg($I("cultivation.msg.breakthrough.surge"), "notice");
		}
		var next = cult.stages[idx + 1];
		if (next){
			this.game.msg($I("cultivation.msg.breakthrough.next", [meta.label, next.label]), "important");
		} else {
			this.game.msg($I("cultivation.msg.breakthrough.final", [meta.label]), "important");
		}
	}
});


//炼制 — pay resources, pill goes into the inventory (meta.val).
//Extends NotStackable for its getPrices (BuildingBtnController's base
//getPrices returns options.prices — empty for meta-driven pills, which is
//exactly why the old button was effectively free).
dojo.declare("classes.ui.PillCraftBtnController", com.nuclearunicorn.game.ui.BuildingNotStackableBtnController, {

	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.tooltipName = true;
		result.simplePrices = false;
		return result;
	},

	getType: function(){
		return "pill";
	},

	getMetadata: function(model){
		if (!model.metaCached){
			model.metaCached = this.game.cultivation.getRealm(model.options.id);
		}
		return model.metaCached;
	},

	getName: function(model){
		var meta = model.metadata;
		return "<div class=\"label\"><span class=\"label-content\">" + $I("cultivation.btn.craft") + "·" + meta.label + "</span></div>";
	},

	updateVisible: function(model){
		model.visible = this.game.cultivation.isPillUnlocked(model.metadata);
	},

	buyItem: function(model, event, callback){
		if (this.game.isReadOnly()){
			return {itemBought: false, reason: "read-only"};
		}
		if (!this.game.cultivation.isPillUnlocked(model.metadata)){
			return {itemBought: false, reason: "locked"};
		}
		if (!this.hasResources(model)){
			return {itemBought: false, reason: "cannot-afford"};
		}
		this.payPrice(model);
		this.game.cultivation.craftPill(model.metadata.name);
		this.game.render();
		return {itemBought: true, reason: "paid-for"};
	}
});

//服用 — consumes one stocked pill; no prices, greys out at ×0
dojo.declare("classes.ui.PillBtnController", com.nuclearunicorn.game.ui.BuildingBtnController, {

	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.tooltipName = true;
		result.simplePrices = false;
		return result;
	},

	getType: function(){
		return "pill";
	},

	getMetadata: function(model){
		if (!model.metaCached){
			model.metaCached = this.game.cultivation.getRealm(model.options.id);
		}
		return model.metaCached;
	},

	getPrices: function(model){
		return [];	//服用不耗资源——耗的是库存
	},

	getName: function(model){
		var meta = model.metadata;
		var count = meta.val || 0;
		return "<div class=\"label\"><span class=\"label-content\">" + meta.label + "</span></div><div>" + $I("cultivation.btn.use") + " ×" + count + "</div>";
	},

	updateVisible: function(model){
		model.visible = this.game.cultivation.isPillUnlocked(model.metadata);
	},

	updateEnabled: function(model){
		model.enabled = (model.metadata.val || 0) > 0;
		model.highlightUnavailable = false;
	},

	buyItem: function(model, event, callback){
		if (this.game.isReadOnly()){
			return {itemBought: false, reason: "read-only"};
		}
		if (!this.game.cultivation.isPillUnlocked(model.metadata)){
			return {itemBought: false, reason: "locked"};
		}
		if (!this.game.cultivation.usePill(model.metadata.name)){
			return {itemBought: false, reason: "empty"};
		}
		this.game.render();
		return {itemBought: true, reason: "consumed"};
	}
});


dojo.declare("classes.tab.CultivationTab", com.nuclearunicorn.game.ui.tab, {

	realmInfo: null,
	ascendBtn: null,
	actionRow: null,

	render: function(tabContainer){
		this.buttons = [];
		var cult = this.game.cultivation;

		this.realmInfo = dojo.create("div", {
			className: "cultivationHeader",
			style: { padding: "10px 5px" }
		}, tabContainer);
		//改命 — 点身份行重开留名卡面
		this.realmInfo.onclick = function(e){
			var el = e.target;
			if (el && el.className == "xx-id-edit"){ cult.showIdentityPrompt(); }
		};

		//道途指引 — 独立常驻槽位,由 DesktopUI 钉在主区下沿,不占页签内容
		var self = this;

		//action row: 游历 + 闭关 + 秘境历练 + 上古秘境
		this.actionRow = dojo.create("div", { className: "xxActionRow" }, tabContainer);
		this.wanderBtn = this.makeActionBtn(this.actionRow, function(){
			if (cult.wander()){ self.update(); }
		});
		this.secludeBtn = this.makeActionBtn(this.actionRow, function(){
			cult.toggleSeclude();
			self.update();
		});
		this.riftBtn = this.makeActionBtn(this.actionRow, function(){
			if (cult.rift()){ self.update(); }
		});
		this.griftBtn = this.makeActionBtn(this.actionRow, function(){
			if (cult.greaterRift()){ self.update(); }
		});

		//共享调息条——四行动同一气脉,一眼看清还要静养多久
		this.cdWrap = dojo.create("div", {className: "xxCdWrap", style: {display: "none"}}, tabContainer);
		this.cdLabel = dojo.create("div", {className: "xxCdLabel"}, this.cdWrap);
		var cdBar = dojo.create("div", {className: "xxCdBar"}, this.cdWrap);
		this.cdFill = dojo.create("div", {className: "xxCdFill"}, cdBar);

		//上古秘境面板——层数天梯/密钥/上次战果,秘境系统的门面
		this.riftPanel = dojo.create("div", {className: "xxRiftPanel", style: {display: "none"}}, tabContainer);
		this.riftHead = dojo.create("div", {className: "xxRiftHead"}, this.riftPanel);
		this.riftPower = dojo.create("div", {className: "xxRiftPower"}, this.riftPanel);
		this.riftLadder = dojo.create("div", {className: "xxRiftLadder"}, this.riftPanel);
		var riftFoot = dojo.create("div", {className: "xxRiftFoot"}, this.riftPanel);
		this.riftKeysEl = dojo.create("span", {className: "xxRiftKeys"}, riftFoot);
		dojo.create("span", {className: "xxRiftHint", innerHTML: $I("cultivation.rift.hint")}, riftFoot);
		this.riftResult = dojo.create("div", {className: "xxRiftResult", style: {display: "none"}}, this.riftPanel);
		this._ladderFloor = -1;
		this._resultSeq = -1;

		//仙途纪事——你走过的路,皆成道途;每个抉择按年岁与境界入册
		this.chronicleEl = dojo.create("details", {className: "xxChronicle"}, tabContainer);
		this._chronicleLen = -1;	//rebuild only when the log grows

		var controller = new classes.ui.RealmBtnController(this.game);
		var pillCtrl = new classes.ui.PillBtnController(this.game);

		//stages grouped by realm, two-column grid per group
		this.realmSections = {};	//realm -> {header, grid, firstStageIdx}
		var grid = null;
		for (var i = 0; i < cult.stages.length; i++){
			var stage = cult.stages[i];
			if (!this.realmSections[stage.realm]){
				var header = dojo.create("div", {
					className: "cultivationSection",
					innerHTML: $I("cultivation.realm." + stage.realm + ".label")
				}, tabContainer);
				grid = dojo.create("div", {className: "xxStageGrid"}, tabContainer);
				this.realmSections[stage.realm] = {header: header, grid: grid, firstIdx: i};
			}
			var btn = new com.nuclearunicorn.game.ui.BuildingResearchBtn({
				id: stage.name, controller: controller}, this.game);
			btn.updateVisible();
			btn.updateEnabled();
			this.addButton(btn);
			btn.render(grid);
		}

		//sects
		this.sectHeader = dojo.create("div", {
			className: "cultivationSection",
			innerHTML: $I("cultivation.section.sect")
		}, tabContainer);
		var sectGrid = dojo.create("div", {className: "xxStageGrid"}, tabContainer);
		this.sectGrid = sectGrid;
		for (var i = 0; i < cult.sects.length; i++){
			var btn = new com.nuclearunicorn.game.ui.BuildingResearchBtn({
				id: cult.sects[i].name, controller: controller}, this.game);
			btn.updateVisible();
			btn.updateEnabled();
			this.addButton(btn);
			btn.render(sectGrid);
		}

		//pills — 炼制入库,服用消耗;每丹双钮。丹方按进境渐次解锁,
		//整栏在首丹现世前藏起——开局不该看见一串摸不到的方术
		this.pillHeader = dojo.create("div", {
			className: "cultivationSection",
			innerHTML: $I("cultivation.section.pill")
		}, tabContainer);
		var pillCraftCtrl = new classes.ui.PillCraftBtnController(this.game);
		var pillGrid = dojo.create("div", {className: "xxStageGrid"}, tabContainer);
		this.pillGrid = pillGrid;
		for (var i = 0; i < cult.pills.length; i++){
			var craftBtn = new com.nuclearunicorn.game.ui.BuildingResearchBtn({
				id: cult.pills[i].name, controller: pillCraftCtrl}, this.game);
			craftBtn.updateVisible();
			craftBtn.updateEnabled();
			this.addButton(craftBtn);
			craftBtn.render(pillGrid);
			var btn = new com.nuclearunicorn.game.ui.BuildingResearchBtn({
				id: cult.pills[i].name, controller: pillCtrl}, this.game);
			btn.updateVisible();
			btn.updateEnabled();
			this.addButton(btn);
			btn.render(pillGrid);
		}

		//veins
		this.veinHeader = dojo.create("div", {
			className: "cultivationSection",
			innerHTML: $I("cultivation.section.vein")
		}, tabContainer);
		var veinGrid = dojo.create("div", {className: "xxStageGrid"}, tabContainer);
		this.veinGrid = veinGrid;
		for (var i = 0; i < cult.veins.length; i++){
			var btn = new com.nuclearunicorn.game.ui.BuildingResearchBtn({
				id: cult.veins[i].name, controller: controller}, this.game);
			btn.updateVisible();
			btn.updateEnabled();
			this.addButton(btn);
			btn.render(veinGrid);
		}

		var ascendRow = dojo.create("div", { style: { padding: "15px 5px" }}, tabContainer);
		this.ascendBtn = dojo.create("div", {
			className: "btn nosel modern",
			style: { display: "none" },
			title: $I("cultivation.ascend.desc")
		}, ascendRow);
		dojo.create("span", {
			className: "btnTitle",
			innerHTML: $I("cultivation.ascend.label")
		}, this.ascendBtn);
		dojo.connect(this.ascendBtn, "onclick", function(){
			self.game.reset();
		});

		this.update();
	},

	makeActionBtn: function(container, onClick){
		var btn = dojo.create("div", { className: "btn nosel modern xxAction" }, container);
		dojo.create("span", { className: "btnTitle" }, btn);
		dojo.connect(btn, "onclick", onClick);
		return btn;
	},

	update: function(){
		this.inherited(arguments);
		if (!this.realmInfo){ return; }	//tab may tick before its first render

		var cult = this.game.cultivation;
		var ratio = this.game.getEffect("realmProductionRatio");
		var fmt = this.game.getDisplayValueExt.bind(this.game);
		var realm = cult.getCurrentRealm();
		var root = cult.getRoot();
		var lifeRemain = cult.getLifespanRemaining();
		var lifeFrac = lifeRemain / cult.getLifespan();
		var lifeCls = lifeFrac <= 0.1 ? " xx-life-crit" : (lifeFrac <= 0.25 ? " xx-life-low" : "");

		var idt = cult.identity;
		var idLine = "";
		if (idt && idt.name){
			var escName = String(idt.name)
				.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
			idLine = "<div class=\"xx-hd-id\">" +
				"<span class=\"xx-id-name\">" + escName + "</span>" +
				" · " + $I("identity.gender." + (idt.gender == "f" ? "f" : "m")) +
				(cult.getOrigin() ? " · " + cult.getOriginLabel() : "") +
				" <span class=\"xx-id-edit\">" + $I("identity.edit") + "</span></div>";
		}

		var html = idLine +
			"<div class=\"xx-hd-main\">" +
				"<span class=\"xx-realm-big\">" + realm.label + "</span>" +
				"<span class=\"xx-chip xx-bonus\">" + $I("cultivation.header.bonus", [fmt(ratio * 100, false, false, 0)]) + "</span>" +
				"<span class=\"xx-chip xx-combat\">" + $I("cultivation.header.combat", [fmt(cult.getCombatPower(), false, false, 0)]) + "</span>" +
				"<span class=\"xx-chip xx-daotitle\">" + cult.getDaoTitle() + "</span>" +
				(cult.secluded ? "<span class=\"xx-chip xx-secl\">" + $I("cultivation.header.secluded") + "</span>" : "") +
			"</div>" +
			"<div class=\"xx-hd-stats\">" +
				"<span class=\"xx-chip xx-root-" + root.key + "\">" +
					$I("cultivation.header.root", [cult.getRootLabel()]) + "</span>" +
				"<span class=\"xx-chip" + lifeCls + "\">" +
					$I("cultivation.header.lifespan", [fmt(lifeRemain, false, false, 0), fmt(cult.getLifespan(), false, false, 0)]) + "</span>" +
				"<span class=\"xx-chip xx-demon\">" + $I("cultivation.header.demon", [Math.round(cult.heartDemon)]) +
					"<span class=\"xx-demonbar\"><i style=\"width:" + Math.round(cult.heartDemon) + "%\"></i></span></span>" +
			"</div>";
		var extras = [];
		if (cult.buffs.juqi > 0){
			extras.push($I("cultivation.header.buff", [$I("cultivation.pill.juqi.label"), Math.ceil(cult.buffs.juqi / 5)]));
		}
		if (cult.buffs.ziqi > 0){
			extras.push($I("cultivation.header.buff", [$I("cultivation.lot.name"), Math.ceil(cult.buffs.ziqi / 5)]));
		}
		if (cult.breakMult > 0){
			extras.push($I("cultivation.header.breakboost", [Math.round(cult.breakMult * 100)]));
		}
		var surge = cult.getBreakSurge();
		if (surge > 1){
			extras.push($I("cultivation.header.surge", [surge.toFixed(1)]));
		}
		if (cult.heartDemon >= cult.DEMON_WARN_AT){
			extras.push($I("cultivation.header.demonpress", [
				Math.round(cult.heartDemon * 0.6), cult.getDemonTax().toFixed(1)]));
		}
		if (extras.length){
			html += "<div class=\"xx-hd-extra\">" + extras.join(" · ") + "</div>";
		}

		//fate roster — collected characters & artifacts, story on hover
		var owned = [];
		for (var i = 0; i < cult.fates.length; i++){
			if (cult.fates[i].researched){ owned.push(cult.fates[i]); }
		}
		if (owned.length){
			html += "<div class=\"xx-hd-fates\"><span class=\"xx-fate-lbl\">" +
				$I("cultivation.section.fate") + "</span>";
			for (var j = 0; j < owned.length; j++){
				var story = cult.fateText(owned[j], "story").replace(/"/g, "&quot;");
				html += "<span class=\"xx-chip xx-fate\" title=\"" + story + "\">" + owned[j].label + "</span>";
			}
			html += "</div>";
		}

		//artifact roster — gear collected from 上古秘境, rank shown as ◆
		var arts = [];
		for (var i = 0; i < cult.artifacts.length; i++){
			if (cult.artifacts[i].researched){ arts.push(cult.artifacts[i]); }
		}
		if (arts.length){
			html += "<div class=\"xx-hd-fates\"><span class=\"xx-fate-lbl\">" +
				$I("cultivation.section.artifact") + "</span>";
			for (var j = 0; j < arts.length; j++){
				var desc = ($I("cultivation.artifact." + arts[j].name + ".desc") || "").replace(/"/g, "&quot;");
				var pips = "";
				for (var p = 0; p < arts[j].rank; p++){ pips += "◆"; }
				html += "<span class=\"xx-chip xx-art\" title=\"" + desc + "\">" +
					arts[j].label + " " + pips + "</span>";
			}
			html += "</div>";
		}
		this.realmInfo.innerHTML = html;

		//境界分区:唯现「当前境界」与「即将叩关的下一境界」
		//——旧境进度自成纪事,不必再占眼帘
		if (this.realmSections){
			var hi = cult.getHighestStageIndex();
			var curRealm = (hi >= 0) ? cult.stages[hi].realm : cult.stages[0].realm;
			for (var key in this.realmSections){
				var sec = this.realmSections[key];
				var show = (key == curRealm) || (sec.firstIdx == hi + 1);
				sec.header.style.display = show ? "" : "none";
				sec.grid.style.display = show ? "" : "none";
			}
		}
		if (this.pillHeader){
			var pillShow = cult.anyPillUnlocked();
			this.pillHeader.style.display = pillShow ? "" : "none";
			this.pillGrid.style.display = pillShow ? "" : "none";
		}
		if (this.veinHeader){
			var veinShow = cult.getStage("zhuji_0").researched;
			this.veinHeader.style.display = veinShow ? "" : "none";
			this.veinGrid.style.display = veinShow ? "" : "none";
		}
		if (this.sectHeader){
			var sectShow = cult.getStage("zhuji_0").researched;
			this.sectHeader.style.display = sectShow ? "" : "none";
			this.sectGrid.style.display = sectShow ? "" : "none";
		}

		//共享调息——游历/闭关/秘境/上古秘境同一支气脉,一条进度条说清
		var burstBlocked = cult.actionCd > 0 || cult.secluded;
		if (this.cdWrap){
			var cdOn = cult.actionCd > 0;
			this.cdWrap.style.display = cdOn ? "" : "none";
			if (cdOn){
				this.cdLabel.innerHTML = $I(
					cult.pendingTrip == "wander" ? "cultivation.action.trip" : "cultivation.action.cd",
					[Math.ceil(cult.actionCd / 5)]);
				var frac = cult.actionCdMax > 0 ? cult.actionCd / cult.actionCdMax : 0;
				this.cdFill.style.width = Math.min(100, Math.round(frac * 100)) + "%";
			}
		}
		if (this.wanderBtn){
			this.wanderBtn.querySelector(".btnTitle").innerHTML = $I("cultivation.action.wander");
			dojo.toggleClass(this.wanderBtn, "xxBlocked", burstBlocked);
		}
		if (this.secludeBtn){
			this.secludeBtn.querySelector(".btnTitle").innerHTML =
				$I(cult.secluded ? "cultivation.action.seclude.on" : "cultivation.action.seclude");
			dojo.toggleClass(this.secludeBtn, "xxBlocked", cult.actionCd > 0 && !cult.secluded);
			dojo.toggleClass(this.secludeBtn, "xxSecluded", cult.secluded);
		}
		var riftOpen = cult.isRiftUnlocked();
		if (this.riftBtn){
			this.riftBtn.style.display = riftOpen ? "" : "none";
			this.riftBtn.querySelector(".btnTitle").innerHTML = $I("cultivation.action.rift");
			dojo.toggleClass(this.riftBtn, "xxBlocked", burstBlocked);
		}
		if (this.griftBtn){
			this.griftBtn.style.display = riftOpen ? "" : "none";
			this.griftBtn.querySelector(".btnTitle").innerHTML =
				$I("cultivation.action.grift", [cult.riftFloor + 1, cult.riftKeys]);
			dojo.toggleClass(this.griftBtn, "xxBlocked", burstBlocked || cult.riftKeys <= 0);
		}

		//上古秘境面板——天梯/密钥/战果
		if (this.riftPanel){
			this.riftPanel.style.display = riftOpen ? "" : "none";
			if (riftOpen){
				if (this._ladderFloor !== cult.riftFloor){
					this._ladderFloor = cult.riftFloor;
					var F = cult.riftFloor, lo = Math.max(1, F - 10), html = "";
					for (var f = lo; f <= F + 1; f++){
						var cls = f <= F ? "lit" : "next";
						html += "<span class='xxFloor " + cls + "' title='" +
							$I("cultivation.rift.floor.tip", [f]) + "'>" + f + "</span>";
					}
					this.riftLadder.innerHTML = html;
					this.riftHead.innerHTML = $I("cultivation.rift.head", [F, F + 1]);
				}
				//战力对照——守关妖兽的门槛 vs 汝之道行
				var pw = cult.floorPower(cult.riftFloor + 1), cp = cult.getCombatPower();
				this.riftPower.innerHTML = $I("cultivation.rift.power",
					[fmt(pw, false, false, 0), fmt(cp, false, false, 0)]);
				dojo.toggleClass(this.riftPower, "xxPowerLow", cp < pw);
				this.riftKeysEl.innerHTML = $I("cultivation.rift.keys", [cult.riftKeys]);
				var last = cult.lastAction;
				this.riftResult.style.display = last ? "" : "none";
				if (last && this._resultSeq !== last.seq){
					this._resultSeq = last.seq;
					this.riftResult.className = "xxRiftResult " + last.cls;
					this.riftResult.innerHTML = last.text;
				}
			}
		}

		//仙途纪事——每个抉择按年岁与境界入册,你的修仙史即是你的传记
		if (this.chronicleEl && cult.taleLog.length !== this._chronicleLen){
			this._chronicleLen = cult.taleLog.length;
			if (!cult.taleLog.length){
				this.chronicleEl.style.display = "none";
			} else {
				this.chronicleEl.style.display = "";
				var ch = "<summary>" + $I("cultivation.chronicle.title", [cult.taleLog.length]) + "</summary>";
				for (var ci = cult.taleLog.length - 1; ci >= 0; ci--){
					var e = cult.taleLog[ci];
					var ef = cult.getFate(e.f);
					var realmKey = (ef && ef.atStage) ? ef.atStage.split("_")[0] : "";
					ch += "<div class=\"xxChronRow\">" +
						"<span class=\"xxChronAge\">" + $I("cultivation.chronicle.age", [e.a]) + "</span>" +
						"<span class=\"xxChronRealm\">" + $I("cultivation.realm." + realmKey + ".label") + "</span>" +
						"<span class=\"xxChronWhat\">" + (ef ? ef.label : e.f);
					if (e.c && cult.hasMsg("cultivation.fate." + e.f + "." + e.c + ".opt")){
						ch += "<span class=\"xxChronPick\"> · " + $I("cultivation.fate." + e.f + "." + e.c + ".opt") + "</span>";
					}
					ch += "</span></div>";
				}
				this.chronicleEl.innerHTML = ch;
			}
		}

		if (this.ascendBtn){
			var dujie = cult.getStage("dujie_0");
			this.ascendBtn.style.display = (dujie && dujie.researched) ? "inline-block" : "none";
		}
	}
});
