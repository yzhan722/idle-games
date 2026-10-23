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
	deathOverlayOpen: false,	//坐化卡面开着——纯运行时态,不入档
	breakMult: 0,		//one-shot relative chance boost from 筑基丹 (×1.5 while active)
	lastBreakYear: null,	//calendar.trueYear() of the last real breakthrough — 破境余威的起点(随档)
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
	guideClaimed: null,	//{stepKey: true} — 道途指引阶段赐福领奖标记(每世重置)
	demonWarned: false,	//one-shot 心魔 hint fired at the teachable moment
	sihuaCount: 0,		//累计坐化次数——跨转生保留(成就用),resetState 不清
	failStreakStage: null,	//连败的 stage 名
	failStreak: 0,			//连败次数——每次 +4% 下次成功率,封顶 5 连败(+20%)
	tale: null,			//命途:{fateName: choiceKey|"seen"|arcState}——跨转生的故事状态
	taleLog: null,		//仙途纪事:[{f,c,a,r}]——每个抉择按年岁与境界记入年鉴
	identity: null,		//{name,gender,origin}——道号/性别/出身;同一缕魂,跨转生长存
	identityPending: false,	//入世留名卡面开着时挡 fate 卡,免得弹层叠弹层
	pendingOrigin: false,	//转世已落、出身未择——载入后弹「转世择身」卡
	autoSteward: null,		//{pill,wander,rift,grift}——洞府灵侍托管开关
	bottleDew: 0,			//0..5 凝露瓶绿液滴数——岁首凝露,可催熟高阶丹药
	natalArtifact: null,	//本命法宝名——祭炼温养后词条×1.5、斗法战力+15%
	lastBattleReport: null,	//最近一场上古秘境的三合斗法战报
	soundMuted: false,		//破境道音与雷劫天音静音开关(跨转生保留)
	lastBreakPhenomenon: null,	//最近一次破境的天地异象快照
	riftStance: "sword",	//破阵姿态: sword(青元剑阵) | array(奇门神识) | stealth(敛息灵隐)
	expedition: null,		//秘境探幽连环奇遇会话: {active,step,maxSteps,nodes,loot,lastNote}

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
	//随后随光阴线性削减,复归常价。防止道行一日千里,连破数关。
	BREAK_SURGE_MAX: 2.2,	//刚破境时修为价 ×2.2
	BREAK_SURGE_YEARS: 1.2,	//震荡期约 1.2 载(游戏年)

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
		{key:"lianqi",  layers:10, base:{xiuwei:45},             mul:1.45, bonus:0.03, chance:1.0,  life:80},
		{key:"zhuji",   layers:3,  base:{xiuwei:3200, minerals:260},   mul:1.70, bonus:0.15, chance:0.55, life:200},
		{key:"jiedan",  layers:3,  base:{xiuwei:18000, gold:150},      mul:1.68, bonus:0.30, chance:0.48, life:500,  gate:{riftFloor:3}},
		{key:"yuanying",layers:3,  base:{xiuwei:72000, science:2800},  mul:1.52, bonus:0.65, chance:0.42, life:1200, gate:{riftFloor:6}},
		{key:"huashen", layers:3,  base:{xiuwei:280000, faith:2200},   mul:1.48, bonus:1.25, chance:0.36, life:3200, gate:{riftFloor:9}},
		{key:"lianxu",  layers:3,  base:{xiuwei:820000, unobtainium:50}, mul:1.52, bonus:2.10, chance:0.30, life:8000, gate:{riftFloor:12}},
		{key:"heti",    layers:3,  base:{xiuwei:2600000, relic:20},    mul:1.60, bonus:3.20, chance:0.25, life:20000, gate:{riftFloor:15}},
		{key:"dacheng", layers:3,  base:{xiuwei:7200000, relic:50, timeCrystal:15}, mul:1.50, bonus:5.80, chance:0.20, life:60000, gate:{riftFloor:20}},
		{key:"dujie",   layers:1,  base:{xiuwei:24000000, relic:130, timeCrystal:50}, mul:1, bonus:12.0, chance:0.10, life:100000, gate:{riftFloor:25}}
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
		prices: [{name:"catnip", val:120}, {name:"spice", val:8}],
		val: 0
	},{
		name: "zhujidan",
		label: $I("cultivation.pill.zhujidan.label"),
		description: $I("cultivation.pill.zhujidan.desc"),
		unlock: function(c){ return c.getStage("lianqi_8").researched; },
		prices: [{name:"minerals", val:200}, {name:"spice", val:25}],
		val: 0
	},{
		name: "qingxin",
		label: $I("cultivation.pill.qingxin.label"),
		description: $I("cultivation.pill.qingxin.desc"),
		unlock: function(c){ return c.getStage("zhuji_0").researched; },
		prices: [{name:"spice", val:60}, {name:"minerals", val:400}],
		val: 0
	},{
		name: "jiangchen",
		label: $I("cultivation.pill.jiangchen.label"),
		description: $I("cultivation.pill.jiangchen.desc"),
		unlock: function(c){ return c.getStage("jiedan_0").researched; },
		prices: [{name:"gold", val:150}, {name:"spice", val:80}],
		val: 0
	},{
		name: "peiying",
		label: $I("cultivation.pill.peiying.label"),
		description: $I("cultivation.pill.peiying.desc"),
		unlock: function(c){ return c.getStage("yuanying_0").researched; },
		prices: [{name:"science", val:3500}, {name:"spice", val:200}],
		val: 0
	},{
		name: "biyan",
		label: $I("cultivation.pill.biyan.label"),
		description: $I("cultivation.pill.biyan.desc"),
		unlock: function(c){ return c.getStage("huashen_0").researched; },
		prices: [{name:"faith", val:2500}, {name:"spice", val:400}],
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
			key: "trace",	//夜探地窖——见过真相的人,日后认得那具铁尸
			grant: {xiuwei: 10, minerals: 30}
		},{
			key: "bide",	//隐忍不发
			grant: {xiuwei: 15}
		},{
			key: "wary",	//将信将疑——对温先生留了心眼
			grant: {xiuwei: 12, wood: 8}
		}]
	},{
		name: "bottle",
		label: $I("cultivation.fate.bottle.label"),
		researched: false,
		atStage: "lianqi_2",
		pages: 2,
		grant: {spice: 10, xiuwei: 15},		//初得凝露瓶即凝一滴碧露,恰可炼首炉聚气丹
		effects: {"spicePerTickBase": 0.02}	//月露凝碧,灵香自生——凝露瓶是命定之物
	},{
		name: "feiyu",
		label: $I("cultivation.fate.feiyu.label"),
		researched: false,
		atStage: "lianqi_4",
		pages: 2,
		effects: {},
		choices: [{
			key: "oath",	//义结金兰
			grant: {xiuwei: 25, wood: 20}
		},{
			key: "name",	//借其名行世——tale.feiyu
			grant: {xiuwei: 20, minerals: 60}
		},{
			key: "decline",	//仙凡殊途
			grant: {xiuwei: 35}
		}]
	},{
		name: "mojuren",
		label: $I("cultivation.fate.mojuren.label"),
		researched: false,
		atStage: "lianqi_6",
		pages: 3,
		effects: {},
		choices: [{
			key: "kill",	//夺舍反杀——斩断师徒,也斩断后患
			grant: {xiuwei: 45, spice: 20},
			effects: {"xiuweiRatio": 0.05}
		},{
			key: "spare",	//擒而不杀——残魂囚于法器,结丹之期他将反扑
			grant: {xiuwei: 40, minerals: 120, spice: 25}
		}]
	},{
		name: "jinguang",
		label: $I("cultivation.fate.jinguang.label"),
		researched: false,
		atStage: "lianqi_8",
		pages: 2,
		effects: {},
		choices: [{
			key: "fight",	//挺身而出——阵前斩之,得登仙令
			grant: {xiuwei: 70, minerals: 160, spice: 30}
		},{
			key: "flee",	//携瓶夜遁
			grant: {xiuwei: 55, spice: 40}
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
			grant: {spice: 200, xiuwei: 120}
		},{
			key: "lurk",	//苟着采药——收获更丰,未识佳人
			grant: {relic: 6, spice: 400, xiuwei: 90}
		}]
	},{
		//———— 苍梧山(筑基)————
		name: "qixuan",
		label: $I("cultivation.fate.qixuan.label"),
		researched: false,
		atStage: "zhuji_0",
		pages: 2,
		grant: {minerals: 200, xiuwei: 220},
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
			key: "sword",	//购剑诀残页
			grant: {xiuwei: 300},
			effects: {"xiuweiRatio": 0.06}
		},{
			key: "seed",	//收灵药种子——与凝露瓶相合
			grant: {spice: 120, catnip: 1200},
			effects: {"spicePerTickBase": 0.03}
		},{
			key: "wine",	//沽酒听书——星海传闻入耳
			grant: {xiuwei: 420, relic: 3}
		}]
	},{
		name: "fengyun",
		label: $I("cultivation.fate.fengyun.label"),
		researched: false,
		atStage: "zhuji_2",
		pages: 2,
		grant: {xiuwei: 350},
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
		prices: [{name:"minerals", val:350}, {name:"xiuwei", val:2500}],
		effects: {"xiuweiRatio": 0.12},
		chance: 1.0, researched: false
	},{
		name: "sect2",
		label: $I("cultivation.sect.2.label"),
		description: $I("cultivation.sect.2.desc"),
		gate: "zhuji_2",
		prices: [{name:"minerals", val:900}, {name:"xiuwei", val:8000}],
		effects: {"xiuweiRatio": 0.18, "realmProductionRatio": 0.06},
		chance: 1.0, researched: false
	},{
		name: "sect3",
		label: $I("cultivation.sect.3.label"),
		description: $I("cultivation.sect.3.desc"),
		gate: "jiedan_0",
		prices: [{name:"gold", val:200}, {name:"xiuwei", val:22000}],
		effects: {"xiuweiRatio": 0.28, "realmProductionRatio": 0.10},
		chance: 1.0, researched: false
	},{
		name: "sect4",
		label: $I("cultivation.sect.4.label"),
		description: $I("cultivation.sect.4.desc"),
		gate: "yuanying_0",
		prices: [{name:"science", val:3500}, {name:"xiuwei", val:85000}],
		effects: {"xiuweiRatio": 0.45, "realmProductionRatio": 0.15},
		chance: 1.0, researched: false
	},{
		name: "sect5",
		label: $I("cultivation.sect.5.label"),
		description: $I("cultivation.sect.5.desc"),
		gate: "huashen_0",
		prices: [{name:"faith", val:3000}, {name:"xiuwei", val:300000}],
		effects: {"xiuweiRatio": 0.65, "realmProductionRatio": 0.20},
		chance: 1.0, researched: false
	},{
		name: "sect6",
		label: $I("cultivation.sect.6.label"),
		description: $I("cultivation.sect.6.desc"),
		gate: "lianxu_0",
		prices: [{name:"relic", val:60}, {name:"xiuwei", val:880000}],
		effects: {"xiuweiRatio": 0.95, "realmProductionRatio": 0.28},
		chance: 1.0, researched: false
	}],

	stages: null,
	realms: null,		//alias kept for smoke tests / external callers

	WANDER_CD: 300,			//~1 min at 5 ticks/s — brisk early-game active loop
	RIFT_CD: 300,			//~1 min — tighter loop than 游历, it IS the farming room
	SECLUDE_CD: 300,		//出关散功与游历同调息——气脉未平复不可径入秘境
	//历练所得按「下一层破境价」的比例给付——一场机缘是一层天的几分之一,
	//低境不靠走运连跳数层,高境也不是滴水入海;再乘已破层数的渐衰,
	//免得渡劫门前一回秘境便抵半层天
	WANDER_PAY: 0.09,		//游历机缘(基础必得吐纳 + 奇遇大成)
	RIFT_PAY: 0.038,		//秘境一行
	AMBUSH_PAY: 0.035,		//反杀劫修的缴获
	GRIFT_PAY: 0.22,		//大秘境破关
	GRIFT_FAIL_PAY: 0.08,	//大秘境败退亦有所得
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

	//道途赐福 — 每次达成指引里程碑即赐一笔开荒资粮,串联起前五分钟的正向反馈链。
	//各阶奖励严格避开后续步骤的完成判定(如 gather/field 不提前给灵木),绝不跳步。
	GUIDE_REWARDS: {
		gather:   {catnip: 20, xiuwei: 3},
		field:    {catnip: 35, xiuwei: 4},
		refine:   {wood: 2, xiuwei: 5},
		hut:      {xiuwei: 8, wood: 4},
		break2:   {xiuwei: 12, minerals: 25},
		wander:   {xiuwei: 15, spice: 8},
		seclude:  {xiuwei: 20, minerals: 40},
		zhuji:    {xiuwei: 180, minerals: 100},
		rift:     {xiuwei: 240, minerals: 120},
		grift:    {xiuwei: 360, relic: 3}
	},

	claimGuideRewards: function(){
		if (!this.guideClaimed){ this.guideClaimed = {}; }
		for (var i = 0; i < this.GUIDE_STEPS.length; i++){
			var step = this.GUIDE_STEPS[i];
			if (this.guideClaimed[step.key]){ continue; }
			if (!step.done(this, this.game)){ continue; }
			this.guideClaimed[step.key] = true;
			var rw = this.GUIDE_REWARDS[step.key];
			if (!rw){ continue; }
			var parts = [];
			for (var res in rw){
				var rObj = this.game.resPool.get(res);
				if (rObj){
					this.game.resPool.addResEvent(res, rw[res]);
					parts.push((rObj.title || res) + " +" + rw[res]);
				}
			}
			if (parts.length){
				this.game.msg($I("cultivation.msg.guide.boon", [parts.join("、")]), "important");
			}
		}
	},

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
		this.guideClaimed = {};
		this.autoSteward = {pill: false, wander: false, rift: false, grift: false};
		this.bottleDew = 0;
		this.riftStance = "sword";
		this.expedition = null;
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
				if (r == 0 && i >= 4 && i <= 6){
					prices.push({name: "wood", val: this.roundNice(25 * Math.pow(1.8, i - 4))});
				} else if (r == 0 && i >= 7){
					prices.push({name: "minerals", val: this.roundNice(60 * Math.pow(1.75, i - 7))});
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
					{name: "minerals", val: this.roundNice(150 * Math.pow(2.0, i))},
					{name: "xiuwei",   val: this.roundNice(350 * Math.pow(2.15, i))}
				],
				effects: {
					"xiuweiRatio": 0.14,
					"realmProductionRatio": 0.05
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
		var self = this;
		box.onclick = function(e){
			var el = e.target;
			if (!el){ return; }
			if (el.className == "xx-guide-help"){
				if (game.ui.renderHelp){ game.ui.renderHelp(); }
				$("#helpDiv").show();
				return;
			}
			if (el.className == "xx-guide-toggle" || el.className == "xx-guide-hd"){
				self._guideOpen = !self._guideOpen;
				dojo.toggleClass(box, "xx-guide-open", !!self._guideOpen);
				box._xxGuideSig = null;
				self.updateGuideBox(box);
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
		this.claimGuideRewards();
		var guide = this.getGuideSteps();
		if (!guide.pending.length){
			box.style.display = "none";
			box._xxGuideSig = null;
			return;
		}
		box.style.display = "";
		dojo.toggleClass(box, "xx-guide-open", !!this._guideOpen);
		var show = Math.min(3, guide.pending.length);
		var sig = guide.done + "|" + (this._guideOpen ? "1|" : "0|");
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

		var toggleTxt = $I(this._guideOpen ? "ui.mobile.guide.collapse" : "ui.mobile.guide.expand");
		var gh = "<div class=\"xx-guide-hd\">" +
			$I("cultivation.guide.title", [guide.done, guide.total]) +
			" <span class=\"xx-guide-toggle\">" + toggleTxt + "</span>" +
			" <span class=\"xx-guide-help\">" + $I("cultivation.guide.help") + "</span></div>" +
			"<div class=\"xx-guide-bar\"><i style=\"width:" +
				Math.round(guide.done / Math.max(1, guide.total) * 100) + "%\"></i></div>";
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
		if (f.name == "bottle"){
			this.bottleDew = Math.min(5, (this.bottleDew || 0) + 1);
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
		//章回画卷——每段仙缘配一幅水墨流金画境
		var arcKey = f.atStage ? String(f.atStage).split("_")[0] : "";
		if (classes.ui && classes.ui.XianxiaArt){
			dojo.create("div", {
				className: "xxFateArt",
				"aria-hidden": "true",
				innerHTML: classes.ui.XianxiaArt.fateArtSVG(f.name, arcKey)
			}, card);
		}
		//章回眉题——这一幕属于哪段境界篇章
		if (arcKey && this.hasMsg("cultivation.realm." + arcKey + ".label")){
			dojo.create("div", {
				className: "xxFateKicker",
				innerHTML: $I("cultivation.realm." + arcKey + ".label") + " · " + $I("cultivation.section.fate")
			}, card);
		}
		var titleEl = dojo.create("div", {
			className: "xxFateTitle",
			innerHTML: f.label
		}, card);
		card.setAttribute("aria-label", titleEl.textContent || f.name);
		//多幕页码——让玩家知道这一段还有几页
		var totalPages = (f.pages && f.pages > 1) ? f.pages : 0;
		var pagerDots = [];
		if (totalPages){
			var pager = dojo.create("div", {className: "xxFatePager", "aria-hidden": "true"}, card);
			for (var d = 0; d < totalPages; d++){
				pagerDots.push(dojo.create("i", null, pager));
			}
		}
		var markPage = function(p){
			for (var d = 0; d < pagerDots.length; d++){
				pagerDots[d].className = d < p ? "on" : "";
			}
		};
		markPage(1);
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
			markPage(totalPages);
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
					markPage(page);
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

	// ---------------- 轮回印记 (Reincarnation Legacy) ----------------
	//历劫不灭的元神烙印——每经一世坐化或飞升重修,下一世即得前尘遗泽加持
	getPastLives: function(){
		var s = this.dying ? Math.max(0, (this.sihuaCount || 0) - 1) : (this.sihuaCount || 0);
		var resets = (this.game && this.game.stats && this.game.stats.getStat("totalResets")) ?
			(this.game.stats.getStat("totalResets").val || 0) : 0;
		return Math.max(s, resets);
	},

	getLegacyBonus: function(){
		var lives = this.getPastLives();
		if (lives <= 0){
			return {lives: 0, xiuweiRatio: 0, realmProductionRatio: 0, combatMult: 1, chanceBonus: 0};
		}
		return {
			lives: lives,
			xiuweiRatio: Math.min(0.80, lives * 0.08),
			realmProductionRatio: Math.min(0.40, lives * 0.04),
			combatMult: 1 + Math.min(1.0, lives * 0.10),
			chanceBonus: Math.min(0.10, lives * 0.02)
		};
	},

	triggerBreakPhenomenon: function(stage){
		var isMajor = !!(stage && stage.chance != null && stage.chance < 1);
		this.lastBreakPhenomenon = {
			stage: stage ? stage.name : "",
			realm: stage ? stage.realm : "lianqi",
			major: isMajor,
			ts: Date.now()
		};
		if (!this.soundMuted && classes.ui && classes.ui.XianxiaAudio){
			if (isMajor){
				classes.ui.XianxiaAudio.playTribulation();
			} else {
				classes.ui.XianxiaAudio.playBell();
			}
		}
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
		if (this.natalArtifact){
			var nArt = this.getArtifact(this.natalArtifact);
			if (nArt && nArt.researched){ mult *= 1.15; }			//本命法宝温养 +15%
		}
		if (this.buffs && this.buffs.biyan > 0){ mult *= 1.35; }	//碧焰酒燃灵火 ×1.35
		var leg = this.getLegacyBonus();
		if (leg.lives > 0){ mult *= leg.combatMult; }				//前世轮回印记
		var sealBonus = this.getRiftSealBonuses();
		if (sealBonus.combatMult > 1){ mult *= sealBonus.combatMult; }	//玄天古印加持
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
		if (stage.chance != null && stage.chance < 1){
			c += this.getLegacyBonus().chanceBonus;	//轮回印记前尘悟道
		}
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
		if (this.lastBreakYear == null){ return 1; }
		//game.ticks 不入档——读档归零会让 elapsed 转负、余威暴胀出上界。
		//改用持久化的历法纪年,trueYear() 含日/季/年的小数推进。
		var elapsed = this.game.calendar.trueYear() - this.lastBreakYear;
		if (elapsed >= this.BREAK_SURGE_YEARS){ return 1; }
		if (elapsed < 0){ elapsed = 0; }
		return 1 + (this.BREAK_SURGE_MAX - 1) * (1 - elapsed / this.BREAK_SURGE_YEARS);
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
		if (classes.ui && classes.ui.XianxiaArt){
			dojo.create("div", {
				className: "xxFateArt",
				"aria-hidden": "true",
				innerHTML: classes.ui.XianxiaArt.fateArtSVG("identity", "lianqi")
			}, card);
		}
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
			var oIco = (classes.ui && classes.ui.XianxiaArt) ?
				"<i class=\"xxIdOriginIco\" aria-hidden=\"true\">" + classes.ui.XianxiaArt.originIcon(o.key) + "</i>" : "";
			oCards[o.key] = dojo.create("div", {
				className: "xxIdOrigin",
				innerHTML: oIco + "<div class=\"xxIdOriginBody\"><b>" + $I("identity.origin." + o.key + ".label") + "</b>" +
					"<span>" + $I("identity.origin." + o.key + ".desc") + "</span></div>"
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
		this.deathOverlayOpen = true;
		var overlay = dojo.create("div", {className: "xxFateOverlay"}, dojo.byId("gamePageContainer"));
		var card = dojo.create("div", {
			className: "dialog xxFateCard xxDeathCard",
			role: "dialog",
			"aria-modal": "true"
		}, overlay);
		if (classes.ui && classes.ui.XianxiaArt){
			dojo.create("div", {
				className: "xxFateArt",
				"aria-hidden": "true",
				innerHTML: classes.ui.XianxiaArt.fateArtSVG("death", "dujie")
			}, card);
		}
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
		if (name && typeof name == "object"){ name = name.name; }
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
		if (name == "juqi" && this.buffs.juqi > 0){
			this.game.msg($I("cultivation.msg.pill.maxed"), "notice");
			return false;	//药力仍在周天运转——再服只会平白化去一颗丹
		}
		if (name == "jiangchen" && this.breakMult >= 0.65 && this.buffs.jiangchen > 0){
			this.game.msg($I("cultivation.msg.pill.maxed"), "notice");
			return false;
		}
		if (name == "peiying" && this.heartDemon <= 0 && this.getBreakSurge() <= 1){
			this.game.msg($I("cultivation.msg.pill.clean"), "notice");
			return false;
		}
		if (name == "biyan" && this.buffs.biyan > 0){
			this.game.msg($I("cultivation.msg.pill.maxed"), "notice");
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
		} else if (name == "jiangchen"){
			this.breakMult = Math.min(0.65, (this.breakMult || 0) + 0.25);
			this.buffs.jiangchen = 1500;
			this.game.msg($I("cultivation.msg.pill.jiangchen"), "notice");
		} else if (name == "peiying"){
			this.lastBreakYear = null;
			this.heartDemon = Math.max(0, this.heartDemon - 30);
			this.game.msg($I("cultivation.msg.pill.peiying"), "notice");
		} else if (name == "biyan"){
			this.buffs.biyan = 1500;
			this.game.msg($I("cultivation.msg.pill.biyan"), "notice");
		}
		return true;
	},

	//凝露瓶绿液催熟——耗1滴绿液,凭空催成2枚当前已解锁的最高阶丹药并馈赠灵草灵香
	catalyzeDew: function(targetPillName){
		if ((this.bottleDew || 0) <= 0){ return false; }
		var target = targetPillName ? this.getPill(targetPillName) : null;
		if (!target || !this.isPillUnlocked(target)){
			target = null;
			for (var i = this.pills.length - 1; i >= 0; i--){
				if (this.isPillUnlocked(this.pills[i])){ target = this.pills[i]; break; }
			}
			if (!target){ target = this.pills[0]; }
		}
		this.bottleDew--;
		target.val = (target.val || 0) + 2;
		var scale = 1 + this.getCurrentRealmIndex();
		this.game.resPool.addResEvent("spice", this.roundNice(30 * scale));
		this.game.resPool.addResEvent("catnip", this.roundNice(200 * scale));
		this.game.msg($I("cultivation.msg.dew.catalyze", [target.label]), "important");
		return true;
	},

	// ---------------- 洞府灵侍托管 (Companion Auto-Stewardship) ----------------
	STEWARD_KEYS: ["pill", "wander", "rift", "grift"],

	isStewardUnlocked: function(kind){
		if (kind == "pill"){
			return this.getStage("zhuji_0").researched;
		}
		if (kind == "wander"){
			return this.getStage("jiedan_0").researched ||
				this.getFate("mojuren").researched ||
				this.getFate("dayan").researched;
		}
		if (kind == "rift"){
			return this.isRiftUnlocked() && (
				this.getStage("yuanying_0").researched ||
				this.getFate("yinyue").researched);
		}
		if (kind == "grift"){
			return this.isRiftUnlocked() && (
				this.getStage("huashen_0").researched ||
				this.getFate("shijin").researched ||
				this.getFate("xiedao").researched);
		}
		return false;
	},

	isAnyStewardUnlocked: function(){
		for (var i = 0; i < this.STEWARD_KEYS.length; i++){
			if (this.isStewardUnlocked(this.STEWARD_KEYS[i])){ return true; }
		}
		return false;
	},

	toggleSteward: function(kind){
		if (!this.isStewardUnlocked(kind)){ return false; }
		if (!this.autoSteward){
			this.autoSteward = {pill: false, wander: false, rift: false, grift: false};
		}
		this.autoSteward[kind] = !this.autoSteward[kind];
		return this.autoSteward[kind];
	},

	runAutoSteward: function(){
		if (!this.autoSteward || this.dying){ return; }
		//① 丹童护心:心魔跨过警戒线时自动服清心丹或培婴丹
		if (this.autoSteward.pill && this.isStewardUnlocked("pill") && this.heartDemon >= this.DEMON_WARN_AT){
			var qx = this.getPill("qingxin");
			var py = this.getPill("peiying");
			if (qx && qx.val > 0){
				this.usePill("qingxin");
			} else if (py && py.val > 0){
				this.usePill("peiying");
			}
		}
		//② 历练托管:道兵闯阵 > 器灵巡境 > 傀儡代步(共享同一气脉冷却)
		if (!this.canAct()){ return; }
		if (this.autoSteward.grift && this.isStewardUnlocked("grift") &&
			this.riftKeys > 0 && this.getCombatPower() >= this.floorPower(this.riftFloor + 1) * 1.15){
			this.greaterRift();
		} else if (this.autoSteward.rift && this.isStewardUnlocked("rift") &&
			this.heartDemon < this.HEART_DEMON_GATE - 10){
			this.rift();
		} else if (this.autoSteward.wander && this.isStewardUnlocked("wander")){
			this.wander();
		}
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
		if (this.secluded){
			this.stats.seclude++;
		} else {
			//出关散功——气脉未平复前不可径入秘境,与游历同调息
			this.setActionCd(this.SECLUDE_CD);
		}
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
		var ambushMin = hasSwords ? 88 : 83;	//蜂云剑护体:伏击窗口进一步收窄
		var addRes = this.game.resPool.addResEvent.bind(this.game.resPool);
		var fmt = this.game.getDisplayValueExt.bind(this.game);

		//行脚吐纳保底——每次游历归来必有一份修为感悟入账,绝不空手而归
		var baseXw = Math.max(2, Math.round(this.breakPayout(this.WANDER_PAY * 0.35 * (hasSwords ? 1.5 : 1))));
		addRes("xiuwei", baseXw);

		var roll = Math.random() * 100;
		if (roll < 25){
			var amt = this.roundNice(300 * scale);
			addRes("minerals", amt);
			this.game.msg($I("cultivation.msg.wander.minerals", [fmt(amt)]), "notice");
		} else if (roll < 44){
			var amt = this.roundNice(24 * scale);
			addRes("spice", amt);
			addRes("wood", this.roundNice(12 * scale));
			this.game.msg($I("cultivation.msg.wander.spice", [fmt(amt)]), "notice");
		} else if (roll < 64){
			var amt = this.breakPayout(this.WANDER_PAY * (hasSwords ? 1.5 : 1));
			addRes("xiuwei", amt);
			this.game.msg($I("cultivation.msg.wander.xiuwei", [fmt(amt + baseXw)]), "notice");
		} else if (roll < 75){
			var amt = this.roundNice(400 * scale);
			addRes("iron", amt);
			this.game.msg($I("cultivation.msg.wander.iron", [fmt(amt)]), "notice");
		} else if (roll < ambushMin){
			var amt = Math.max(1, Math.round(2 * scale));
			addRes("relic", amt);
			this.game.msg($I("cultivation.msg.wander.relic", [amt]), "important");
		} else if (roll < 92){
			//炼气新手保护——凡尘初历不遇劫修,偶得山间灵泉顿悟
			if (realmIdx === 0){
				var spXw = this.breakPayout(this.WANDER_PAY);
				addRes("xiuwei", spXw);
				addRes("wood", 10);
				this.game.msg($I("cultivation.msg.wander.xiuwei", [fmt(spXw + baseXw)]), "notice");
			} else {
				var lose = Math.round(this.game.resPool.get("minerals").value * 0.1);
				if (lose > 0){
					addRes("minerals", -lose);
					this.game.msg($I("cultivation.msg.wander.ambush", [fmt(lose)]), "alert");
				} else {
					this.game.msg($I("cultivation.msg.wander.nothing"), "notice");
				}
			}
		} else {
			this.game.msg($I("cultivation.msg.wander.nothing"), "notice");
		}
		return true;
	},

	// ---------------- 玄天秘境 · 探幽奇遇与虚天破界塔 ----------------

	//三大破阵姿态:克制不同大秘境法则词缀,并在探幽奇遇中提供差异化专精加成
	RIFT_STANCES: [
		{
			key: "sword",
			label: "青元剑阵",
			tag: "强攻破风",
			desc: "剑气纵横，以力破巧：探幽修为+20%，克制【九天罡风】与【元磁禁空】",
			xiuweiMult: 1.20,
			combatMult: 1.15,
			counters: ["gale", "gravity"]
		},
		{
			key: "array",
			label: "奇门神识",
			tag: "推演破禁",
			desc: "衍神推演，直指阵眼：遗宝与法宝机缘+35%，克制【太古禁制】与【乾蓝冰焰】",
			artifactMult: 1.35,
			relicBonus: 1,
			counters: ["ward", "icefire"]
		},
		{
			key: "stealth",
			label: "敛息灵隐",
			tag: "潜行觅宝",
			desc: "敛气匿踪，全身而退：秘境令机缘提升、心魔反噬减半，克制【阴魔蚀魂】",
			demonMult: 0.50,
			keyBonus: 0.15,
			counters: ["demonfog"]
		}
	],

	//五大天地法则词缀:随上古秘境层数轮转,选对破阵姿态即可触发「姿态破法」
	RIFT_AFFIXES: [
		{key: "gale",     label: "九天罡风", counter: "sword",   desc: "罡风割裂护体灵光，唯以【青元剑阵】正面斩开风眼方可破局"},
		{key: "ward",     label: "太古禁制", counter: "array",   desc: "上古连环禁制锁死灵力，需借【奇门神识】推演阵门直取中枢"},
		{key: "demonfog", label: "阴魔蚀魂", counter: "stealth", desc: "天外魔气侵扰识海，运转【敛息灵隐】固守灵台可免心魔反噬"},
		{key: "icefire",  label: "乾蓝冰焰", counter: "array",   desc: "极寒冰焰与地火交织，以【奇门神识】引火归元可得额外遗宝"},
		{key: "gravity",  label: "元磁禁空", counter: "sword",   desc: "元磁神光压制飞遁，凭【青元剑阵】沛然剑意强行破开禁空"}
	],

	//六枚玄天古印:通关指定大秘境层数永久点亮,加持修为、万产与战力
	RIFT_SEALS: [
		{floor: 3,  key: "xuejin",   label: "血禁灵印", desc: "修为吐纳 +15%", xiuweiRatio: 0.15},
		{floor: 6,  key: "xutian",   label: "虚天丹印", desc: "洞府万产 +15%", realmProductionRatio: 0.15},
		{floor: 9,  key: "kunwu",    label: "昆吾剑印", desc: "斗法战力 +20%", combatMult: 0.20},
		{floor: 12, key: "zhuimo",   label: "坠魔元印", desc: "修为吐纳 +30%", xiuweiRatio: 0.30},
		{floor: 15, key: "xuantian", label: "玄天真印", desc: "万产+30% · 战力+30%", realmProductionRatio: 0.30, combatMult: 0.30},
		{floor: 20, key: "jiemian",  label: "界面道印", desc: "修为吐纳 +50%", xiuweiRatio: 0.50}
	],

	//秘境探幽六大奇遇房(前两重随机轮转,第三重必入「核心祭坛·虚天古宝匣」)
	EXPEDITION_ROOMS: {
		herb: {
			key: "herb",
			title: "千年灵药园",
			badge: "灵草奇珍",
			desc: "断崖石壁间奇香扑鼻，数株千年血线蛟藤与紫猴花正值成熟，旁有一条赤练妖蟒盘踞吐信。",
			optA: {label: "御剑斩蟒 · 强夺仙株", sub: "丰厚修为 + 灵草 · 35%夺得【秘境令】"},
			optB: {label: "引兽调离 · 稳采灵药", sub: "稳获修为与灵木灵石 · 绝无心魔损伤"}
		},
		cave: {
			key: "cave",
			title: "古修坐化遗府",
			badge: "阵法禁制",
			desc: "幽深石室中央端坐一具金丹古修遗骸，石案上摆放着数枚古朴玉简与贴满符箓的储物袋。",
			optA: {label: "神识推演 · 破禁取宝", sub: "修为 + 【上古遗宝】 · 奇门姿态收益翻倍"},
			optB: {label: "礼拜遗骸 · 参悟残篇", sub: "稳增修为 + 悟道典籍 · 净除 5 点心魔"}
		},
		ambush: {
			key: "ambush",
			title: "血色禁地争锋",
			badge: "劫修夺宝",
			desc: "前方山谷剑光闪烁，数名掩月宗与魔道修士正为争夺一枚秘境古令大打出手，双方皆已负伤。",
			optA: {label: "黄雀在后 · 雷霆夺令", sub: "高概率夺取【秘境令】+ 丰厚修为"},
			optB: {label: "敛息潜行 · 暗取储物袋", sub: "修为 + 大量灵石 · 敛息姿态额外得秘境令"}
		},
		spring: {
			key: "spring",
			title: "太古灵眼仙泉",
			badge: "天地灵乳",
			desc: "地底灵脉汇聚成一汪乳白万年灵乳，泉眼上方悬浮着半块残缺的上古阵盘，灵气浓郁欲滴。",
			optA: {label: "盘膝鲸吞 · 万年灵乳", sub: "巨额修为灌顶 · 剑阵姿态额外 +25%"},
			optB: {label: "拓印阵盘 · 收取阵石", sub: "修为 + 【上古遗宝】 + 灵石"}
		},
		fog: {
			key: "fog",
			title: "阴冥鬼雾窟",
			badge: "古宝霞光",
			desc: "浓郁阴冥鬼雾笼罩洞窟，无数残魂厉魄在雾中嘶嚎，雾气深处隐有一件古宝霞光流转。",
			optA: {label: "催动真火 · 祭炼古宝", sub: "修为 + 冲击【秘境古宝】机缘"},
			optB: {label: "运转清心 · 涤荡识海", sub: "修为 + 净除 8 点心魔"}
		},
		altar: {
			key: "altar",
			title: "核心祭坛 · 虚天古宝匣",
			badge: "终极秘藏",
			desc: "踏入秘境最深处的太古祭坛，九根盘龙玉柱环绕着一只铭刻星辰法则的【虚天古宝匣】，宝光冲霄！",
			optA: {label: "破开宝匣 · 夺取古宝道果", sub: "终极修为 + 必得【上古遗宝】 + 高概率掉令/古宝"},
			optB: {label: "引动星辰大阵 · 醍醐灌顶", sub: "1.5倍终极修为灌顶 + 净除 10 点心魔"}
		}
	},

	getRiftStance: function(){
		var key = this.riftStance || "sword";
		for (var i = 0; i < this.RIFT_STANCES.length; i++){
			if (this.RIFT_STANCES[i].key == key){ return this.RIFT_STANCES[i]; }
		}
		return this.RIFT_STANCES[0];
	},

	setRiftStance: function(key){
		for (var i = 0; i < this.RIFT_STANCES.length; i++){
			if (this.RIFT_STANCES[i].key == key){
				this.riftStance = key;
				return true;
			}
		}
		return false;
	},

	getFloorAffix: function(floor){
		var idx = Math.max(0, (Math.max(1, floor) - 1)) % this.RIFT_AFFIXES.length;
		return this.RIFT_AFFIXES[idx];
	},

	getRiftZone: function(floor){
		var f = Math.max(1, floor);
		if (f <= 3){ return {name: "血色禁地·环形山", boss: $I("cultivation.grift.boss.1")}; }
		if (f <= 6){ return {name: "虚天内殿·冰火道", boss: $I("cultivation.grift.boss.2")}; }
		if (f <= 9){ return {name: "昆吾仙山·镇魔渊", boss: $I("cultivation.grift.boss.3")}; }
		if (f <= 15){ return {name: "坠魔古渊·血焰坛", boss: $I("cultivation.grift.boss.4")}; }
		return {name: "真仙界缝·混沌墟", boss: $I("cultivation.grift.boss.5")};
	},

	getRiftSealBonuses: function(){
		var xw = 0, prod = 0, combat = 1, unlocked = 0;
		var F = this.riftFloor || 0;
		for (var i = 0; i < this.RIFT_SEALS.length; i++){
			var s = this.RIFT_SEALS[i];
			if (F >= s.floor){
				unlocked++;
				if (s.xiuweiRatio){ xw += s.xiuweiRatio; }
				if (s.realmProductionRatio){ prod += s.realmProductionRatio; }
				if (s.combatMult){ combat *= (1 + s.combatMult); }
			}
		}
		return {xiuweiRatio: xw, realmProductionRatio: prod, combatMult: combat, unlocked: unlocked};
	},

	getGriftOdds: function(floor){
		var f = floor != null ? floor : (this.riftFloor + 1);
		var cp = this.getCombatPower();
		var need = this.floorPower(f);
		var affix = this.getFloorAffix(f);
		var stance = this.getRiftStance();
		var countered = (stance.key === affix.counter);
		var odds = cp / Math.max(1, need);
		var baseChance = 0.3 + 0.6 * odds + (countered ? 0.12 : 0);
		var chance = Math.max(0.05, Math.min(0.95, baseChance));
		var zone = this.getRiftZone(f);
		return {
			floor: f,
			cp: cp,
			need: need,
			affix: affix,
			stance: stance,
			countered: countered,
			chance: chance,
			zoneName: zone.name,
			bossName: zone.boss
		};
	},

	//开启三层连环秘境探幽——在入境保底之上,提供3层战术奇遇抉择与见好就收机制
	startExpedition: function(entryXw, entryNote){
		var pool = ["herb", "cave", "ambush", "spring", "fog"];
		var seed = (this.stats.rift || 1) + (this.actionSeq || 0);
		var r1 = pool[seed % pool.length];
		var r2 = pool[(seed + 2) % pool.length];
		this.expedition = {
			active: true,
			step: 1,
			maxSteps: 3,
			nodes: [r1, r2, "altar"],
			loot: {
				xiuwei: Math.round(entryXw || 0),
				minerals: 0,
				relic: 0,
				keys: 0
			},
			lastNote: entryNote || "已踏入秘境核心外围，神识感应到前方三处机缘之地。"
		};
		return this.expedition;
	},

	chooseExpedition: function(optKey){
		if (!this.isRiftUnlocked()){ return false; }
		if (!this.expedition || !this.expedition.active){
			if (this.canAct()){
				this.rift();
			}
			if (!this.expedition || !this.expedition.active){ return false; }
		}
		var exp = this.expedition;
		var step = exp.step || 1;
		var roomKey = (exp.nodes && exp.nodes[step - 1]) || "herb";
		var stance = this.getRiftStance();
		var scale = 1 + this.getCurrentRealmIndex() * 0.8;
		var depthMult = step === 1 ? 0.42 : (step === 2 ? 0.62 : 0.95);
		if (stance.xiuweiMult){ depthMult *= stance.xiuweiMult; }

		var addRes = this.game.resPool.addResEvent.bind(this.game.resPool);
		var fmt = this.game.getDisplayValueExt.bind(this.game);
		var xwGain = this.breakPayout(this.RIFT_PAY * depthMult);
		var minGain = 0, relicGain = 0, keyGain = 0, demonDelta = 0, artDropped = false;
		var note = "";

		if (optKey === "b"){
			//稳健/净心路线
			if (roomKey === "herb"){
				minGain = this.roundNice(180 * scale);
				addRes("wood", this.roundNice(60 * scale));
				note = "引开赤练妖蟒，稳妥采得千年灵药，修为 +" + fmt(xwGain) + "，灵石 +" + fmt(minGain);
			} else if (roomKey === "cave"){
				addRes("science", this.roundNice(150 * scale));
				demonDelta = -5;
				note = "礼拜古修遗骸参悟残篇，修为 +" + fmt(xwGain) + "，心魔净除 5 点";
			} else if (roomKey === "ambush"){
				minGain = this.roundNice(260 * scale * (stance.key === "stealth" ? 1.6 : 1));
				if (stance.key === "stealth" && Math.random() < 0.40){ keyGain = 1; }
				note = "敛息暗取战场储物袋，修为 +" + fmt(xwGain) + "，灵石 +" + fmt(minGain) + (keyGain ? "，顺走【秘境令】×1！" : "");
			} else if (roomKey === "spring"){
				relicGain = 1 + (stance.relicBonus || 0);
				minGain = this.roundNice(150 * scale);
				note = "拓印太古残阵收取阵石，修为 +" + fmt(xwGain) + "，上古遗宝 +" + relicGain;
			} else if (roomKey === "fog"){
				demonDelta = -8;
				note = "运转清心法诀穿过阴冥鬼雾，修为 +" + fmt(xwGain) + "，心魔净除 8 点";
			} else {
				//altar optB: 星辰灌顶
				xwGain = Math.round(xwGain * 1.5);
				demonDelta = -10;
				relicGain = 1;
				note = "引动祭坛星辰大阵醍醐灌顶！修为暴涨 +" + fmt(xwGain) + "，上古遗宝 +1，心魔净除 10 点！";
			}
		} else {
			//进取/夺宝路线 (optA)
			var keyChance = 0.30 + (stance.keyBonus || 0);
			if (roomKey === "herb"){
				xwGain = Math.round(xwGain * 1.25);
				addRes("catnip", this.roundNice(320 * scale));
				if (Math.random() < keyChance){ keyGain = 1; }
				note = "剑斩赤练妖蟒夺取千年血线蛟藤！修为 +" + fmt(xwGain) + (keyGain ? "，斩获妖丹【秘境令】×1！" : "");
			} else if (roomKey === "cave"){
				relicGain = (stance.key === "array" ? 2 : 1);
				if (Math.random() < 0.25 * (stance.artifactMult || 1)){
					artDropped = this.rollArtifactDrop(scale);
				}
				note = "神识推演破开古修禁制！修为 +" + fmt(xwGain) + "，获【上古遗宝】×" + relicGain + (artDropped ? "，更得古宝认主！" : "");
			} else if (roomKey === "ambush"){
				xwGain = Math.round(xwGain * 1.2);
				if (Math.random() < Math.min(0.75, keyChance + 0.20)){ keyGain = 1; }
				minGain = this.roundNice(160 * scale);
				note = "黄雀在后雷霆出手！修为 +" + fmt(xwGain) + (keyGain ? "，夺得【秘境令】×1！" : "，缴获灵石 +" + fmt(minGain));
			} else if (roomKey === "spring"){
				xwGain = Math.round(xwGain * (stance.key === "sword" ? 1.55 : 1.35));
				note = "盘膝泉眼鲸吞万年灵乳，周天轰鸣！修为暴涨 +" + fmt(xwGain) + "！";
			} else if (roomKey === "fog"){
				if (Math.random() < 0.38 * (stance.artifactMult || 1)){
					artDropped = this.rollArtifactDrop(scale);
				} else {
					relicGain = 1;
				}
				note = "催动真火炼化阴冥残魂！修为 +" + fmt(xwGain) + (artDropped ? "，霞光中一件秘境古宝破雾而出！" : "，凝得【上古遗宝】×1");
			} else {
				//altar optA: 破开虚天古宝匣
				xwGain = Math.round(xwGain * 1.3);
				relicGain = 1 + (stance.relicBonus || 0);
				if (Math.random() < Math.min(0.80, keyChance + 0.25)){ keyGain = 1; }
				if (Math.random() < 0.45 * (stance.artifactMult || 1)){
					artDropped = this.rollArtifactDrop(scale * 1.2);
				}
				note = "破开【虚天古宝匣】宝光冲霄！修为 +" + fmt(xwGain) + "，遗宝 +" + relicGain +
					(keyGain ? "，秘境令 +1" : "") + (artDropped ? "，更获秘境古宝机缘！" : "！");
			}
		}

		addRes("xiuwei", xwGain);
		if (minGain > 0){ addRes("minerals", minGain); }
		if (relicGain > 0){ addRes("relic", relicGain); }
		if (keyGain > 0){ this.riftKeys += keyGain; }
		if (demonDelta !== 0){
			this.heartDemon = Math.min(100, Math.max(0, this.heartDemon + demonDelta));
		}

		exp.loot.xiuwei += xwGain;
		exp.loot.minerals += minGain;
		exp.loot.relic += relicGain;
		exp.loot.keys += keyGain;
		exp.lastNote = note;

		if (step >= exp.maxSteps){
			exp.active = false;
			exp.step = exp.maxSteps;
			this.setLastAction("ok", note);
			this.game.msg("【秘境探幽圆满】" + note, "important");
		} else {
			exp.step = step + 1;
			this.setLastAction("ok", note);
		}
		if (artDropped && this.game.render){ this.game.render(); }
		return true;
	},

	//见好就收·携宝遁出:安全撤离秘境,额外获得一笔敛息撤离修为并平复心魔
	extractExpedition: function(){
		if (!this.expedition || !this.expedition.active){ return false; }
		var exp = this.expedition;
		var fmt = this.game.getDisplayValueExt.bind(this.game);
		var bonusXw = this.breakPayout(this.RIFT_PAY * 0.35 * exp.step);
		this.game.resPool.addResEvent("xiuwei", bonusXw);
		this.heartDemon = Math.max(0, this.heartDemon - 4);
		exp.loot.xiuwei += bonusXw;
		exp.active = false;
		var msg = "见好就收，激发传送符满载遁出秘境！额外稳固修为 +" + fmt(bonusXw) + "，道心澄明（心魔 -4）。";
		exp.lastNote = msg;
		this.setLastAction("ok", msg);
		this.game.msg("【秘境遁出】" + msg, "notice");
		return true;
	},

	//秘境历练 — the "exp room": fast-cooldown run with a guaranteed 修为 payout,
	//a chance at a 秘境之钥, and a slim artifact drop + launches 3-step interactive expedition
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
				if (this.riftStance === "stealth"){ add *= 0.5; }
				this.heartDemon = Math.min(100, this.heartDemon + add);
				this.game.msg($I("cultivation.msg.rift.ambush"), "alert");
				resultCls = "fail"; resultText = $I("cultivation.rift.result.ambush");
			}
		}
		this.startExpedition(amt, resultText);
		if (roll < 0.3 && this.expedition){ this.expedition.loot.keys += 1; }
		this.setLastAction(resultCls, resultText);
		return true;
	},

	isRiftUnlocked: function(){
		var gate = this.getStage("zhuji_0");
		return !!(gate && gate.researched);
	},

	//建造三合斗法战报——依玩家当前本命法宝、青竹剑阵、奇虫灵兽与守关古妖动态成篇
	buildBattleReport: function(floor, win, power, need){
		var bossKey = floor <= 3 ? "1" : (floor <= 6 ? "2" : (floor <= 9 ? "3" : (floor <= 15 ? "4" : "5")));
		var boss = $I("cultivation.grift.boss." + bossKey);
		var nArt = this.natalArtifact ? this.getArtifact(this.natalArtifact) : null;
		if (!nArt || !nArt.researched){
			nArt = null;
			for (var i = 0; i < this.artifacts.length; i++){
				if (this.artifacts[i].researched){ nArt = this.artifacts[i]; break; }
			}
		}
		var r1 = nArt
			? $I("cultivation.grift.r1.natal", [nArt.label, boss])
			: (this.getFate("fengyun").researched
				? $I("cultivation.grift.r1.sword", [boss])
				: $I("cultivation.grift.r1.base", [boss]));
		var r2 = (this.getFate("shijin").researched || this.getFate("tihun").researched)
			? $I("cultivation.grift.r2.swarm", [boss])
			: ((this.getFate("yinyue").researched || this.getFate("xiedao").researched || this.getFate("dayan").researched)
				? $I("cultivation.grift.r2.ally", [boss])
				: $I("cultivation.grift.r2.base", [boss]));
		var r3 = win
			? $I("cultivation.grift.r3.win", [floor, boss])
			: $I("cultivation.grift.r3.fail", [floor, boss]);
		return {
			floor: floor,
			win: !!win,
			power: Math.round(power),
			need: Math.round(need),
			boss: boss,
			rounds: [r1, r2, r3],
			seq: this.actionSeq
		};
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

		//战力论成败——守关妖兽的战力门槛 vs 你的道行之数 + 破阵姿态克制法则词缀
		var gInfo = this.getGriftOdds(floor);
		var cp = gInfo.cp;
		var need = gInfo.need;
		var chance = gInfo.chance;
		var floorScale = scale * (1 + floor * 0.25);
		var win = Math.random() < chance;

		if (win){
			this.riftFloor = floor;
			var amt = this.breakPayout(this.GRIFT_PAY * (gInfo.countered ? 1.25 : 1));
			addRes("xiuwei", amt);
			var relics = Math.max(1, Math.round(floor * 0.8)) + (gInfo.countered ? 1 : 0);
			addRes("relic", relics);
			if (floor >= 12){
				var tc = Math.max(1, Math.round((floor - 10) * 0.8));
				addRes("timeCrystal", tc);
			}
			if (gInfo.countered && this.riftStance === "stealth"){
				this.heartDemon = Math.max(0, this.heartDemon - 6);
			}
			this.game.msg($I("cultivation.msg.grift.clear", [floor, fmt(amt), relics]), "important");
			this.setLastAction("ok", $I("cultivation.rift.result.grift.ok", [floor]) +
				(gInfo.countered ? " · ✦姿态破法(" + gInfo.affix.label + ")" : ""));
			//artifact odds climb with depth — the ladder IS the loot table
			var artOdds = Math.min(0.65, 0.15 + floor * 0.03 + (this.riftStance === "array" ? 0.08 : 0));
			if (Math.random() < artOdds && this.rollArtifactDrop(floorScale)){
				this.game.render();
			}
		} else {
			var amt = this.breakPayout(this.GRIFT_FAIL_PAY);
			addRes("xiuwei", amt);
			var add = 8 + Math.random() * 6;
			if (this.getFate("tihun").researched){ add *= 0.5; }
			if (this.riftStance === "stealth"){ add *= 0.5; }
			this.heartDemon = Math.min(100, this.heartDemon + add);
			this.game.msg($I("cultivation.msg.grift.fail", [floor, fmt(amt)]), "alert");
			this.setLastAction("fail", $I("cultivation.rift.result.grift.fail", [floor]));
		}
		this.lastBattleReport = this.buildBattleReport(floor, win, cp, need);
		return true;
	},

	//清剿已破秘境 — 消耗1枚秘境令,稳刷当前已通关的最高层(100%胜率、零心魔风险、刷取遗宝与古宝)
	sweepRift: function(){
		if (!this.isRiftUnlocked() || !this.canAct()){ return false; }
		if (this.riftFloor <= 0){ return false; }
		if (this.riftKeys <= 0){
			this.game.msg($I("cultivation.msg.rift.nokey"), "alert");
			return false;
		}
		this.setActionCd(this.RIFT_CD * (this.getFate("fenglei").researched ? 0.5 : 1));
		this.riftKeys--;
		var floor = this.riftFloor;
		var scale = 1 + this.getCurrentRealmIndex() * 0.8;
		var floorScale = scale * (1 + floor * 0.25);
		var addRes = this.game.resPool.addResEvent.bind(this.game.resPool);
		var fmt = this.game.getDisplayValueExt.bind(this.game);

		var amt = this.breakPayout(this.GRIFT_PAY * 0.85);
		addRes("xiuwei", amt);
		var relics = Math.max(1, Math.round(floor * 0.7)) + (this.riftStance === "array" ? 1 : 0);
		addRes("relic", relics);
		if (floor >= 12){
			addRes("timeCrystal", Math.max(1, Math.round((floor - 10) * 0.6)));
		}
		var dropped = false;
		if (Math.random() < Math.min(0.55, 0.14 + floor * 0.025 + (this.riftStance === "array" ? 0.08 : 0))){
			dropped = this.rollArtifactDrop(floorScale);
			if (dropped && this.game.render){ this.game.render(); }
		}
		var text = "清剿上古秘境第 " + floor + " 层凯旋：修为 +" + fmt(amt) + "，上古遗宝 +" + relics + (dropped ? "，更获古宝机缘！" : "");
		this.game.msg("【秘境清剿】" + text, "important");
		this.setLastAction("ok", text);
		this.lastBattleReport = this.buildBattleReport(floor, true, this.getCombatPower(), this.floorPower(floor));
		this.lastBattleReport.swept = true;
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

	//祭炼本命法宝——仅限已认主法宝;祭炼后该法宝词条×1.5,斗法战力+15%
	setNatalArtifact: function(name){
		if (!name){
			this.natalArtifact = null;
			return true;
		}
		var art = this.getArtifact(name);
		if (!art || !art.researched){ return false; }
		this.natalArtifact = art.name;
		this.game.msg($I("cultivation.msg.artifact.natal", [art.label]), "important");
		if (this.game.updateCaches){ this.game.updateCaches(); }
		return true;
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
			lastBreakYear: this.lastBreakYear,
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
			guideClaimed: this.guideClaimed,
			autoSteward: this.autoSteward ? {
				pill: !!this.autoSteward.pill,
				wander: !!this.autoSteward.wander,
				rift: !!this.autoSteward.rift,
				grift: !!this.autoSteward.grift
			} : undefined,
			bottleDew: this.bottleDew || 0,
			natalArtifact: this.natalArtifact || null,
			lastBattleReport: this.lastBattleReport || null,
			riftStance: this.riftStance || "sword",
			expedition: this.expedition || null,
			soundMuted: !!this.soundMuted,
			demonWarned: this.demonWarned,
			sihuaCount: this.sihuaCount,
			dying: this.dying,
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
		if (typeof c.actionCd == "number"){ this.actionCd = Math.max(0, c.actionCd); }
		if (typeof c.actionCdMax == "number"){ this.actionCdMax = c.actionCdMax; }
		if (c.pendingTrip){ this.pendingTrip = c.pendingTrip; }
		if (c.lastAction){ this.lastAction = c.lastAction; }
		if (typeof c.actionSeq == "number"){ this.actionSeq = c.actionSeq; }
		if (typeof c.riftKeys == "number"){ this.riftKeys = Math.max(0, c.riftKeys); }
		if (typeof c.riftFloor == "number"){ this.riftFloor = Math.max(0, c.riftFloor); }
		if (c.tale){ this.tale = c.tale; }
		if (c.identity){ this.identity = c.identity; this.applyOrigin(); }
		if (c.pendingOrigin){ this.pendingOrigin = c.pendingOrigin; }
		if (c.taleLog){ this.taleLog = c.taleLog; }
		if (typeof c.heartDemon == "number"){ this.heartDemon = Math.min(100, Math.max(0, c.heartDemon)); }
		if (typeof c.lastBreakYear == "number"){ this.lastBreakYear = c.lastBreakYear; }
		if (typeof c.age == "number"){ this.age = Math.max(0, c.age); }
		if (typeof c.dying == "boolean"){ this.dying = c.dying; }
		this.deathOverlayOpen = false;	//卡面是 DOM——读档后必须由 update() 重弹
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
		if (c.guideClaimed && typeof c.guideClaimed == "object"){
			this.guideClaimed = c.guideClaimed;
		}
		if (c.autoSteward && typeof c.autoSteward == "object"){
			if (!this.autoSteward){ this.autoSteward = {pill: false, wander: false, rift: false, grift: false}; }
			for (var sk in this.autoSteward){
				if (typeof c.autoSteward[sk] == "boolean"){ this.autoSteward[sk] = c.autoSteward[sk]; }
			}
		}
		if (typeof c.bottleDew == "number"){ this.bottleDew = Math.min(5, Math.max(0, Math.floor(c.bottleDew))); }
		if (typeof c.natalArtifact == "string"){
			var na = this.getArtifact(c.natalArtifact);
			this.natalArtifact = (na && na.researched) ? na.name : null;
		}
		if (c.lastBattleReport && typeof c.lastBattleReport == "object"){
			this.lastBattleReport = c.lastBattleReport;
		}
		if (typeof c.riftStance == "string"){
			this.setRiftStance(c.riftStance);
		}
		if (c.expedition && typeof c.expedition == "object"){
			this.expedition = c.expedition;
		}
		if (typeof c.soundMuted == "boolean"){ this.soundMuted = c.soundMuted; }
		if (typeof c.demonWarned == "boolean"){ this.demonWarned = c.demonWarned; }
		if (typeof c.sihuaCount == "number"){ this.sihuaCount = Math.max(0, c.sihuaCount); }
		if (typeof c.failStreak == "number"){ this.failStreak = Math.max(0, c.failStreak); }
		if (typeof c.failStreakStage == "string"){ this.failStreakStage = c.failStreakStage; }
	},

	update: function(){
		//the realm tab is the heart of this mod; never let it stay hidden
		var tab = this.game.getTab("cultivation");
		if (tab && !tab.visible){
			tab.visible = true;
		}

		if (this.dying){
			//坐化期间万缘停摆;读档回来的档上 dying=true 但卡面已随 DOM 消失,
			//须重弹一次——否则玩家永困坐化态,连转世都点不到(软锁)。
			if (!this.deathOverlayOpen){
				var bonus = this.getCurrentRealmIndex() * this.ASCENSION_KARMA;
				var karmaText = $I("cultivation.msg.lifespan.karma." + (bonus > 0 ? "gain" : "none"), [bonus]);
				this.showDeathOverlay(bonus, karmaText);
			}
			return;
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
			var decay = 0.03 * (this.getFate("nangong").researched ? 3 : 1);
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
		this.runAutoSteward();
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
		if (this.buffs.jiangchen > 0){
			add("xiuweiRatio", 0.35);	//降尘丹周天运转
		}
		if (this.buffs.biyan > 0){
			add("xiuweiRatio", 0.50);	//碧焰酒青莲灵火
			add("realmProductionRatio", 0.25);
		}
		if (this.natalArtifact){
			var nArt = this.getArtifact(this.natalArtifact);
			if (nArt && nArt.researched && nArt.effects){
				for (var nk in nArt.effects){
					add(nk, nArt.effects[nk] * 0.5);	//本命法宝温养:额外 +50% (合计 1.5×)
				}
			}
		}
		var leg = this.getLegacyBonus();
		if (leg.lives > 0){
			add("xiuweiRatio", leg.xiuweiRatio);
			add("realmProductionRatio", leg.realmProductionRatio);
		}
		var sealBonus = this.getRiftSealBonuses();
		if (sealBonus.xiuweiRatio > 0){
			add("xiuweiRatio", sealBonus.xiuweiRatio);
		}
		if (sealBonus.realmProductionRatio > 0){
			add("realmProductionRatio", sealBonus.realmProductionRatio);
		}
	},

	//天机阁·每日一卦——每跨一年摇一签,纯手气,图个念想
	drawLot: function(){
		//凝露瓶每跨一年自动凝聚1滴绿液(上限5滴)
		var bottle = this.getFate("bottle");
		if (bottle && bottle.researched && (this.bottleDew || 0) < 5){
			this.bottleDew = Math.min(5, (this.bottleDew || 0) + 1);
		}
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
		//转世存档只留魂数据(identity/sihuaCount/pendingOrigin)——境界仙缘
		//由 _resetInternal 从存档剥离,内存态靠 reload 重建;新世新身,灵根重来
		this.heartDemon = 0;
		this.age = 0;			//新世新身,寿数重来
		this.lifeWarned = {};
		this.dying = false;
		this.deathOverlayOpen = false;
		this.breakMult = 0;
		this.lastBreakYear = null;	//新世新身,道基余威尽散
		this.secluded = false;
		this.actionCd = 0;
		this.actionCdMax = 0;
		this.pendingTrip = null;
		this.lastAction = null;
		this.actionSeq = 0;
		this.buffs = {};
		this.guideClaimed = {};
		this.autoSteward = {pill: false, wander: false, rift: false, grift: false};
		this.bottleDew = 0;
		this.natalArtifact = null;
		this.lastBattleReport = null;
		this.lastBreakPhenomenon = null;
		this.riftStance = "sword";
		this.expedition = null;
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
		//breakthrough failed: materials are spent, part of the 修为 returns —
		//按实付价(model.prices,已含根骨/余威/心魔税叠乘)退还,而非基础价
		this.payPrice(model);
		var refundRatio = 0.5 - (omen && omen.failLoss ? omen.failLoss : 0);
		for (var i = 0; i < model.prices.length; i++){
			if (model.prices[i].name == "xiuwei"){
				this.game.resPool.addResEvent("xiuwei", model.prices[i].val * refundRatio);
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
		if (!cult.soundMuted && classes.ui && classes.ui.XianxiaAudio){
			classes.ui.XianxiaAudio.playFail();
		}
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
		cult.triggerBreakPhenomenon(meta);
		if (meta.chance != null && meta.chance < 1){
			//大关告破,道基震荡——余威期内再破真关耗修大涨(以历法纪年锚定,随档)
			cult.lastBreakYear = cult.game.calendar.trueYear();
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

	//「—— 丹药 ——」式的老标题去掉破折号,由样式自绘章节徽记
	sectionTitle: function(key){
		return String($I(key)).replace(/^[\s—\-–]+|[\s—\-–]+$/g, "");
	},

	render: function(tabContainer){
		this.buttons = [];
		this.stageBtns = {};
		this._hdrHtml = null;
		this._nextStage = null;
		var cult = this.game.cultivation;
		var self = this;

		//① 境界总览——身份/境界/五项道行指标/仙缘法宝收藏
		this.realmInfo = dojo.create("div", {
			className: "cultivationHeader"
		}, tabContainer);
		//改命 + 道音开关 + 点击法宝祭炼本命 + 移动端点击仙缘/法宝徽章浮窗查看详情
		this.realmInfo.onclick = function(e){
			var el = e.target;
			if (!el){ return; }
			if (el.className == "xx-id-edit"){
				cult.showIdentityPrompt();
				return;
			}
			var snd = el.closest ? el.closest(".xx-sound-toggle") : (el.className && el.className.indexOf("xx-sound-toggle") >= 0 ? el : null);
			if (snd){
				cult.soundMuted = !cult.soundMuted;
				self.update();
				return;
			}
			var artChip = el.closest ? el.closest(".xx-art") : null;
			if (artChip && artChip.getAttribute("data-art")){
				cult.setNatalArtifact(artChip.getAttribute("data-art"));
				self.update();
			}
			var chip = el.closest ? el.closest(".xx-fate, .xx-art") : null;
			if (chip && chip.getAttribute("title") && self.game.ui && self.game.ui.notifyLogEvent){
				self.game.ui._toastReadyAt = 1;
				self.game.ui._lastToastText = "";
				self.game.ui.notifyLogEvent({
					type: "important",
					text: "【" + (chip.textContent || "").trim() + "】" + chip.getAttribute("title")
				});
			}
		};

		//② 历练四式:游历 + 闭关 + 秘境历练 + 上古秘境——最常点的放最上
		this.actionRow = dojo.create("div", { className: "xxActionRow" }, tabContainer);
		this.wanderBtn = this.makeActionBtn(this.actionRow, "游", function(){
			if (cult.wander()){ self.update(); }
		});
		this.secludeBtn = this.makeActionBtn(this.actionRow, "闭", function(){
			cult.toggleSeclude();
			self.update();
		});
		this.riftBtn = this.makeActionBtn(this.actionRow, "秘", function(){
			if (cult.rift()){ self.update(); }
		});
		this.griftBtn = this.makeActionBtn(this.actionRow, "古", function(){
			if (cult.greaterRift()){ self.update(); }
		});

		//共享调息条——四行动同一气脉,一眼看清还要静养多久
		this.cdWrap = dojo.create("div", {className: "xxCdWrap", style: {display: "none"}}, tabContainer);
		this.cdLabel = dojo.create("div", {className: "xxCdLabel"}, this.cdWrap);
		var cdBar = dojo.create("div", {className: "xxCdBar"}, this.cdWrap);
		this.cdFill = dojo.create("div", {className: "xxCdFill"}, cdBar);

		//②.5 洞府灵侍托管栏——筑基/结丹/元婴/化神渐次解锁丹童、傀儡、器灵、道兵自动值守
		this.stewardWrap = dojo.create("div", {className: "xxStewardBar", style: {display: "none"}}, tabContainer);
		this.stewardWrap.onclick = function(e){
			var el = e.target && (e.target.closest ? e.target.closest(".xxStewardChip") : e.target);
			var k = el && el.getAttribute && el.getAttribute("data-steward");
			if (k && cult.isStewardUnlocked(k)){
				cult.toggleSteward(k);
				self._stewardSig = null;
				self.update();
			}
		};
		this._stewardSig = null;

		//②.8 玄天秘境 · 探幽罗盘与虚天破界塔(专属交互式主控台,紧随历练四式下方)
		this.riftPanel = dojo.create("div", {className: "xxRiftPanel xxRiftArena", style: {display: "none"}}, tabContainer);
		this.riftHead = dojo.create("div", {className: "xxRiftHead"}, this.riftPanel);
		this.riftDeck = dojo.create("div", {className: "xxRiftDeck"}, this.riftPanel);
		this.riftPower = dojo.create("div", {className: "xxRiftPower", style: {display: "none"}}, this.riftPanel);
		this.riftLadder = dojo.create("div", {className: "xxRiftLadder"}, this.riftPanel);
		this.riftSealsEl = dojo.create("div", {className: "xxRiftSeals"}, this.riftPanel);
		var riftFoot = dojo.create("div", {className: "xxRiftFoot"}, this.riftPanel);
		this.riftKeysEl = dojo.create("span", {className: "xxRiftKeys"}, riftFoot);
		dojo.create("span", {className: "xxRiftHint", innerHTML: $I("cultivation.rift.hint")}, riftFoot);
		this.riftResult = dojo.create("div", {className: "xxRiftResult", style: {display: "none"}}, this.riftPanel);
		this._ladderFloor = -1;
		this._resultSeq = -1;
		this._riftDeckSig = null;

		this.riftPanel.onclick = function(e){
			var t = e.target;
			if (!t || !t.closest){ return; }
			var stanceEl = t.closest("[data-stance]");
			if (stanceEl){
				e.preventDefault();
				if (cult.setRiftStance(stanceEl.getAttribute("data-stance"))){
					self._riftDeckSig = null;
					self.update();
				}
				return;
			}
			var expOpt = t.closest("[data-exp-opt]");
			if (expOpt){
				e.preventDefault();
				if (cult.chooseExpedition(expOpt.getAttribute("data-exp-opt"))){
					self._riftDeckSig = null;
					self.update();
				}
				return;
			}
			var expAct = t.closest("[data-exp-act]");
			if (expAct){
				e.preventDefault();
				var act = expAct.getAttribute("data-exp-act");
				if (act === "extract"){
					if (cult.extractExpedition()){
						self._riftDeckSig = null;
						self.update();
					}
				} else if (act === "start"){
					if (cult.rift()){
						self._riftDeckSig = null;
						self.update();
					}
				}
				return;
			}
			var griftAct = t.closest("[data-grift-act]");
			if (griftAct){
				e.preventDefault();
				var gAct = griftAct.getAttribute("data-grift-act");
				if (gAct === "challenge"){
					if (cult.greaterRift()){
						self._riftDeckSig = null;
						self.update();
					}
				} else if (gAct === "sweep"){
					if (cult.sweepRift()){
						self._riftDeckSig = null;
						self.update();
					}
				}
				return;
			}
		};

		var controller = new classes.ui.RealmBtnController(this.game);
		var pillCtrl = new classes.ui.PillBtnController(this.game);

		//③ 破境之路——当前境界各层 + 下一关(下一关由 update 点亮为主按钮)
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
			this.stageBtns[stage.name] = btn;
		}

		//⑤ 丹药 — 炼制入库,服用消耗;每丹双钮。丹方按进境渐次解锁,
		//整栏在首丹现世前藏起——开局不该看见一串摸不到的方术
		this.pillHeader = dojo.create("div", {
			className: "cultivationSection",
			innerHTML: this.sectionTitle("cultivation.section.pill")
		}, tabContainer);
		//凝露瓶绿液催丹栏——得凝露瓶后显现,岁首攒露,一键催熟2枚最高阶丹药
		this.dewWrap = dojo.create("div", {className: "xxDewBar", style: {display: "none"}}, tabContainer);
		this.dewLbl = dojo.create("span", {className: "xxDewLbl"}, this.dewWrap);
		this.dewBtn = dojo.create("a", {
			className: "xxDewBtn",
			href: "#",
			innerHTML: $I("cultivation.dew.btn"),
			title: $I("cultivation.dew.desc")
		}, this.dewWrap);
		dojo.connect(this.dewBtn, "onclick", function(e){
			dojo.stopEvent(e);
			if (cult.catalyzeDew()){
				self.game.render();
				self.update();
			}
		});
		var pillCraftCtrl = new classes.ui.PillCraftBtnController(this.game);
		var pillGrid = dojo.create("div", {className: "xxStageGrid xxPillGrid"}, tabContainer);
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

		//⑥ 宗门
		this.sectHeader = dojo.create("div", {
			className: "cultivationSection",
			innerHTML: this.sectionTitle("cultivation.section.sect")
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

		//⑦ 灵脉
		this.veinHeader = dojo.create("div", {
			className: "cultivationSection",
			innerHTML: this.sectionTitle("cultivation.section.vein")
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

		//⑧ 仙途纪事——你走过的路,皆成道途;回看用,沉到页底
		this.chronicleEl = dojo.create("details", {className: "xxChronicle"}, tabContainer);
		this._chronicleLen = -1;	//rebuild only when the log grows

		var ascendRow = dojo.create("div", { className: "xxAscendRow" }, tabContainer);
		this.ascendBtn = dojo.create("div", {
			className: "btn nosel modern xxAscend",
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

	//历练卡:水墨徽章图 + 名称 + 右侧云纹暗章 + 调息遮罩(冷却期内从右向左褪去)
	makeActionBtn: function(container, glyph, onClick){
		var btn = dojo.create("div", { className: "btn nosel modern xxAction", tabIndex: 0 }, container);
		var art = (classes.ui && classes.ui.XianxiaArt) ? classes.ui.XianxiaArt.actionArt(glyph) : glyph;
		dojo.create("span", { className: "xxActGlyph", innerHTML: art, "aria-hidden": "true" }, btn);
		dojo.create("span", { className: "btnTitle" }, btn);
		if (classes.ui && classes.ui.XianxiaArt){
			dojo.create("span", { className: "xxActWm", innerHTML: art, "aria-hidden": "true" }, btn);
		}
		btn._cdMask = dojo.create("i", { className: "xxActCd", "aria-hidden": "true" }, btn);
		dojo.connect(btn, "onclick", onClick);
		dojo.connect(btn, "onkeypress", function(e){ if (e.key == "Enter"){ onClick(e); } });
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
		var lifeMax = cult.getLifespan();
		var lifeRemain = cult.getLifespanRemaining();
		var lifeFrac = lifeMax > 0 ? lifeRemain / lifeMax : 0;
		var lifeCls = lifeFrac <= 0.1 ? " xx-life-crit" : (lifeFrac <= 0.25 ? " xx-life-low" : "");
		var demon = Math.round(cult.heartDemon);
		var demonCls = demon >= cult.HEART_DEMON_GATE ? " xx-demon-crit" : (demon >= cult.DEMON_WARN_AT ? " xx-demon-warn" : "");

		var idt = cult.identity;
		var idLine = "";
		if (idt && idt.name){
			var escName = String(idt.name)
				.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
			idLine = "<div class=\"xx-hd-id\">" +
				"<span class=\"xx-id-name\">" + escName + "</span>" +
				"<span class=\"xx-id-meta\">" + $I("identity.gender." + (idt.gender == "f" ? "f" : "m")) +
				(cult.getOrigin() ? " · " + cult.getOriginLabel() : "") + "</span>" +
				"<span class=\"xx-id-edit\">" + $I("identity.edit") + "</span></div>";
		}

		var realmLabel = String(realm.label || "");
		var seal = realmLabel.replace(/<[^>]*>/g, "").charAt(0) || "道";
		var artMgr = classes.ui && classes.ui.XianxiaArt;
		var tile = function(cls, icoKey, label, value, bar){
			var tIco = artMgr ? "<i class=\"xx-tile-ico\" aria-hidden=\"true\">" + artMgr.tileIcon(icoKey) + "</i>" : "";
			return "<div class=\"xx-tile " + cls + "\"><span class=\"xx-tile-lbl\">" + tIco + label + "</span>" +
				"<span class=\"xx-tile-val\">" + value + "</span>" +
				(bar != null ? "<span class=\"xx-tile-bar\"><i style=\"width:" + Math.max(0, Math.min(100, Math.round(bar))) + "%\"></i></span>" : "") +
				"</div>";
		};

		var rootKeys = ["wei", "san", "zhen", "yi", "tian"];
		var rootTier = Math.max(1, rootKeys.indexOf(root.key) + 1);
		var rootPips = "<span class=\"xx-pips\" aria-hidden=\"true\">";
		for (var rp = 1; rp <= 5; rp++){
			rootPips += "<i" + (rp <= rootTier ? " class=\"on\"" : "") + "></i>";
		}
		rootPips += "</span>";

		var hasBuff = !!(cult.buffs.juqi > 0 || cult.buffs.ziqi > 0 || cult.buffs.jiangchen > 0 || cult.buffs.biyan > 0);
		var heroVisual = artMgr
			? "<div class=\"xx-hero-portrait\" aria-hidden=\"true\">" +
				artMgr.heroPortraitSVG(realm.realm || "lianqi", seal, root.key, cult.secluded, demon, hasBuff) +
				"</div>"
			: "<div class=\"xx-hero-seal\" aria-hidden=\"true\">" + seal + "</div>";
		var heroBg = artMgr ? "<div class=\"xx-hero-bg\" aria-hidden=\"true\">" + artMgr.cultivationBgSVG(realm.realm || "lianqi") + "</div>" : "";
		var sndChip = "<span class=\"xx-chip xx-sound-toggle\" title=\"" + $I("cultivation.sound.tip") + "\">" +
			$I(cult.soundMuted ? "cultivation.sound.off" : "cultivation.sound.on") + "</span>";
		var phenomBanner = "";
		if (cult.lastBreakPhenomenon && (Date.now() - cult.lastBreakPhenomenon.ts < 2400)){
			var pMaj = cult.lastBreakPhenomenon.major;
			phenomBanner = "<div class=\"xx-phenom-banner " + (pMaj ? "xx-phenom-major" : "xx-phenom-minor") + "\">" +
				$I(pMaj ? "cultivation.phenom.major" : "cultivation.phenom.minor") + "</div>";
		}

		var html = heroBg + phenomBanner + "<div class=\"xx-hero\">" +
				heroVisual +
				"<div class=\"xx-hero-body\">" + idLine +
					"<div class=\"xx-hd-main\">" +
						"<span class=\"xx-realm-big\">" + realmLabel + "</span>" +
						"<span class=\"xx-chip xx-daotitle\">" + cult.getDaoTitle() + "</span>" +
						(cult.secluded ? "<span class=\"xx-chip xx-secl\">" + $I("cultivation.header.secluded") + "</span>" : "") +
						sndChip +
					"</div>" +
				"</div>" +
			"</div>" +
			"<div class=\"xx-tiles\">" +
				tile("xx-bonus", "bonus", $I("cultivation.tile.bonus"), "+" + fmt(ratio * 100, false, false, 0) + "%") +
				tile("xx-combat", "combat", $I("cultivation.tile.combat"), fmt(cult.getCombatPower(), false, false, 0)) +
				tile("xx-root xx-root-" + root.key, "root", $I("cultivation.tile.root"), "<span>" + cult.getRootLabel() + "</span>" + rootPips) +
				tile("xx-life" + lifeCls, "life", $I("cultivation.tile.life"),
					$I("cultivation.tile.life.val", [fmt(lifeRemain, false, false, 0), fmt(lifeMax, false, false, 0)]),
					lifeFrac * 100) +
				tile("xx-demon" + demonCls, "demon", $I("cultivation.tile.demon"), demon, demon) +
			"</div>";

		var extras = [];
		var leg = cult.getLegacyBonus();
		if (leg.lives > 0){
			extras.push($I("cultivation.header.legacy", [
				leg.lives, Math.round(leg.xiuweiRatio * 100), Math.round((leg.combatMult - 1) * 100)]));
		}
		if (cult.buffs.juqi > 0){
			extras.push($I("cultivation.header.buff", [$I("cultivation.pill.juqi.label"), Math.ceil(cult.buffs.juqi / 5)]));
		}
		if (cult.buffs.jiangchen > 0){
			extras.push($I("cultivation.header.buff", [$I("cultivation.pill.jiangchen.label"), Math.ceil(cult.buffs.jiangchen / 5)]));
		}
		if (cult.buffs.biyan > 0){
			extras.push($I("cultivation.header.buff", [$I("cultivation.pill.biyan.label"), Math.ceil(cult.buffs.biyan / 5)]));
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
			html += "<div class=\"xx-hd-extra\"><span>" + extras.join("</span><span>") + "</span></div>";
		}

		//fate roster — collected characters & artifacts, story on hover
		var owned = [];
		for (var i = 0; i < cult.fates.length; i++){
			if (cult.fates[i].researched){ owned.push(cult.fates[i]); }
		}
		if (owned.length){
			var fateIco = artMgr ? "<i class=\"xx-chip-ico\" aria-hidden=\"true\">" + artMgr.tileIcon("fate") + "</i>" : "";
			html += "<div class=\"xx-hd-fates\"><span class=\"xx-fate-lbl\">" +
				$I("cultivation.section.fate") + "</span>";
			for (var j = 0; j < owned.length; j++){
				var story = cult.fateText(owned[j], "story").replace(/<[^>]*>/g, "").replace(/"/g, "&quot;");
				html += "<span class=\"xx-chip xx-fate\" title=\"" + story + "\">" + fateIco + owned[j].label + "</span>";
			}
			html += "</div>";
		}

		//artifact roster — gear collected from 上古秘境, rank shown as ◆; click to attune Natal Artifact
		var arts = [];
		for (var i = 0; i < cult.artifacts.length; i++){
			if (cult.artifacts[i].researched){ arts.push(cult.artifacts[i]); }
		}
		if (arts.length){
			var artIco = artMgr ? "<i class=\"xx-chip-ico\" aria-hidden=\"true\">" + artMgr.tileIcon("artifact") + "</i>" : "";
			html += "<div class=\"xx-hd-fates\"><span class=\"xx-fate-lbl\">" +
				$I("cultivation.section.artifact") + "</span>";
			for (var j = 0; j < arts.length; j++){
				var isNatal = (cult.natalArtifact == arts[j].name);
				var desc = (($I("cultivation.artifact." + arts[j].name + ".desc") || "") +
					(isNatal ? $I("cultivation.artifact.natal.active") : $I("cultivation.artifact.natal.tip")))
					.replace(/<[^>]*>/g, "").replace(/"/g, "&quot;");
				var pips = "";
				for (var p = 0; p < arts[j].rank; p++){ pips += "◆"; }
				var natalBadge = isNatal ? "<i class=\"xx-natal-tag\">" + $I("cultivation.artifact.natal.tag") + "</i>" : "";
				html += "<span class=\"xx-chip xx-art" + (isNatal ? " xx-art-natal" : "") +
					"\" data-art=\"" + arts[j].name + "\" title=\"" + desc + "\">" + artIco +
					natalBadge + arts[j].label + " <b class=\"xx-pips\">" + pips + "</b></span>";
			}
			html += "</div>";
		}
		//只在内容真变了才动 DOM——每 tick 整段重写会让悬停提示闪断
		if (html !== this._hdrHtml){
			this._hdrHtml = html;
			this.realmInfo.innerHTML = html;
		}

		//境界分区:唯现「当前境界」与「即将叩关的下一境界」
		//——旧境进度自成纪事,不必再占眼帘
		var hi = cult.getHighestStageIndex();
		if (this.realmSections){
			var curRealm = (hi >= 0) ? cult.stages[hi].realm : cult.stages[0].realm;
			for (var key in this.realmSections){
				var sec = this.realmSections[key];
				var show = (key == curRealm) || (sec.firstIdx == hi + 1);
				sec.header.style.display = show ? "" : "none";
				sec.grid.style.display = show ? "" : "none";
			}
		}
		//下一关——点亮为本页主按钮(整行、金边、蓄力条即修为进度)
		if (this.stageBtns){
			var nextStage = cult.stages[hi + 1];
			var nextName = nextStage ? nextStage.name : null;
			if (nextName !== this._nextStage){
				var prevBtn = this._nextStage && this.stageBtns[this._nextStage];
				if (prevBtn && prevBtn.domNode){
					dojo.removeClass(prevBtn.domNode, "xx-next-stage");
					prevBtn.domNode.removeAttribute("data-xx-tag");
				}
				var nb = nextName && this.stageBtns[nextName];
				if (nb && nb.domNode){
					dojo.addClass(nb.domNode, "xx-next-stage");
					nb.domNode.setAttribute("data-xx-tag", $I("cultivation.next.tag"));
				}
				this._nextStage = nextName;
			}
		}
		if (this.pillHeader){
			var pillShow = cult.anyPillUnlocked();
			this.pillHeader.style.display = pillShow ? "" : "none";
			this.pillGrid.style.display = pillShow ? "" : "none";
		}
		if (this.dewWrap){
			var bottleFate = cult.getFate("bottle");
			var dewShow = (bottleFate && bottleFate.researched) || (cult.bottleDew || 0) > 0;
			this.dewWrap.style.display = dewShow ? "" : "none";
			if (dewShow){
				var dewCnt = cult.bottleDew || 0;
				var dewTxt = $I("cultivation.dew.title", [dewCnt]);
				if (this.dewLbl.innerHTML !== dewTxt){ this.dewLbl.innerHTML = dewTxt; }
				dojo.toggleClass(this.dewBtn, "xxDisabled", dewCnt <= 0);
			}
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
		var cdFrac = (cult.actionCd > 0 && cult.actionCdMax > 0) ? Math.min(1, cult.actionCd / cult.actionCdMax) : 0;
		var cdPct = Math.round(cdFrac * 100) + "%";
		if (this.cdWrap){
			var cdOn = cult.actionCd > 0;
			this.cdWrap.style.display = cdOn ? "" : "none";
			if (cdOn){
				this.cdLabel.innerHTML = $I(
					cult.pendingTrip == "wander" ? "cultivation.action.trip" : "cultivation.action.cd",
					[Math.ceil(cult.actionCd / 5)]);
				this.cdFill.style.width = cdPct;
			}
		}
		//洞府灵侍托管栏更新
		if (this.stewardWrap){
			var stwOpen = cult.isAnyStewardUnlocked();
			this.stewardWrap.style.display = stwOpen ? "" : "none";
			if (stwOpen){
				var stwSig = "";
				for (var si = 0; si < cult.STEWARD_KEYS.length; si++){
					var sk = cult.STEWARD_KEYS[si];
					stwSig += sk + ":" + (cult.isStewardUnlocked(sk) ? "1" : "0") + ":" +
						((cult.autoSteward && cult.autoSteward[sk]) ? "1" : "0") + "|";
				}
				if (stwSig !== this._stewardSig){
					this._stewardSig = stwSig;
					var sh = "<span class=\"xxStewardTitle\">" + $I("cultivation.steward.title") + "</span>";
					for (var sj = 0; sj < cult.STEWARD_KEYS.length; sj++){
						var skj = cult.STEWARD_KEYS[sj];
						if (!cult.isStewardUnlocked(skj)){ continue; }
						var on = !!(cult.autoSteward && cult.autoSteward[skj]);
						var tip = String($I("cultivation.steward." + skj + ".tip")).replace(/"/g, "&quot;");
						sh += "<span class=\"xxStewardChip" + (on ? " xxOn" : "") +
							"\" data-steward=\"" + skj + "\" title=\"" + tip + "\">" +
							"<i>" + (on ? "●" : "○") + "</i>" + $I("cultivation.steward." + skj) + "</span>";
					}
					this.stewardWrap.innerHTML = sh;
				}
			}
		}
		var setAct = function(btn, label, blocked, masked){
			if (!btn){ return; }
			var t = btn.querySelector(".btnTitle");
			if (t.innerHTML !== label){ t.innerHTML = label; }
			dojo.toggleClass(btn, "xxBlocked", blocked);
			if (btn._cdMask){ btn._cdMask.style.width = masked ? cdPct : "0%"; }
		};
		setAct(this.wanderBtn, $I("cultivation.action.wander"), burstBlocked, cult.actionCd > 0);
		setAct(this.secludeBtn,
			$I(cult.secluded ? "cultivation.action.seclude.on" : "cultivation.action.seclude"),
			cult.actionCd > 0 && !cult.secluded, cult.actionCd > 0 && !cult.secluded);
		if (this.secludeBtn){ dojo.toggleClass(this.secludeBtn, "xxSecluded", cult.secluded); }
		var riftOpen = cult.isRiftUnlocked();
		if (this.riftBtn){
			this.riftBtn.style.display = riftOpen ? "" : "none";
			setAct(this.riftBtn, $I("cultivation.action.rift"), burstBlocked, cult.actionCd > 0);
		}
		if (this.griftBtn){
			this.griftBtn.style.display = riftOpen ? "" : "none";
			setAct(this.griftBtn, $I("cultivation.action.grift", [cult.riftFloor + 1, cult.riftKeys]),
				burstBlocked || cult.riftKeys <= 0, cult.actionCd > 0);
		}
		if (this.actionRow){
			dojo.toggleClass(this.actionRow, "xxActionRow4", riftOpen);
		}

		//玄天秘境主控台——三大破阵姿态 + 秘境探幽三重奇遇 + 上古大秘境虚天破界塔 + 六枚玄天古印
		if (this.riftPanel){
			this.riftPanel.style.display = riftOpen ? "" : "none";
			if (riftOpen){
				var F = cult.riftFloor;
				var gInfo = cult.getGriftOdds(F + 1);
				var pw = gInfo.need, cp = gInfo.cp;
				var exp = cult.expedition;
				var expSig = exp ? (exp.active ? "1" : "0") + ":" + exp.step + ":" + (exp.nodes ? exp.nodes.join(",") : "") + ":" + (exp.loot ? exp.loot.xiuwei : 0) + ":" + (exp.lastNote || "") : "none";
				var deckSig = [
					F,
					cult.riftKeys,
					cult.riftStance,
					Math.round(cp),
					Math.round(pw),
					burstBlocked ? 1 : 0,
					expSig
				].join("|");

				if (this._riftDeckSig !== deckSig){
					this._riftDeckSig = deckSig;

					//1. 顶栏: 秘境古界名称 + 秘境令库存 + 三大破阵姿态切换胶囊
					var stanceHtml = "<div class=\"xxStanceBar\"><span class=\"xxStanceLbl\">破阵姿态</span>";
					for (var sti = 0; sti < cult.RIFT_STANCES.length; sti++){
						var st = cult.RIFT_STANCES[sti];
						var stOn = (cult.riftStance === st.key);
						var isCounter = (st.key === gInfo.affix.counter);
						stanceHtml += "<a href=\"#!\" class=\"xxStanceChip" + (stOn ? " active" : "") + (isCounter ? " counter" : "") +
							"\" data-stance=\"" + st.key + "\" title=\"" + st.desc + "\">" +
							"<span class=\"xxStanceName\">" + st.label + "</span>" +
							"<span class=\"xxStanceTag\">" + (isCounter ? "✦克制词缀" : st.tag) + "</span></a>";
					}
					stanceHtml += "</div>";

					this.riftHead.innerHTML =
						"<div class=\"xxRiftTopRow\">" +
							"<div class=\"xxRiftTitleBlock\">" +
								"<span class=\"xxRiftSealBadge\">秘</span>" +
								"<div>" +
									"<div class=\"xxRiftMainTitle\">玄天秘境 · 探幽与破界罗盘</div>" +
									"<div class=\"xxRiftSubTitle\">当前古界：" + gInfo.zoneName + " · 已破第 <b>" + F + "</b> 层 · 秘境令 <b>×" + cult.riftKeys + "</b></div>" +
								"</div>" +
							"</div>" +
							stanceHtml +
						"</div>";

					//2. 左栏: 【秘境探幽 · 三重连环奇遇】
					var expStep = (exp && exp.step) ? exp.step : 0;
					var expActive = !!(exp && exp.active);
					var mapLabels = ["① 禁地入口", "② 第一重奇遇", "③ 第二重奇遇", "④ 核心古宝匣"];
					if (exp && exp.nodes && exp.nodes.length >= 3){
						var r1Obj = cult.EXPEDITION_ROOMS[exp.nodes[0]];
						var r2Obj = cult.EXPEDITION_ROOMS[exp.nodes[1]];
						if (r1Obj){ mapLabels[1] = "② " + r1Obj.title; }
						if (r2Obj){ mapLabels[2] = "③ " + r2Obj.title; }
					}
					var mapHtml = "<div class=\"xxExpMap\">";
					for (var mi = 0; mi < 4; mi++){
						var mState = "locked";
						if (mi === 0){ mState = exp ? "done" : "active"; }
						else if (exp){
							if (!exp.active || expStep > mi){ mState = "done"; }
							else if (expStep === mi){ mState = "active"; }
						}
						mapHtml += "<div class=\"xxExpNode " + mState + "\"><i class=\"xxExpDot\"></i><span>" + mapLabels[mi] + "</span></div>";
					}
					mapHtml += "</div>";

					var expBodyHtml = "";
					if (expActive){
						var curRoomKey = (exp.nodes && exp.nodes[expStep - 1]) || "herb";
						var room = cult.EXPEDITION_ROOMS[curRoomKey] || cult.EXPEDITION_ROOMS.herb;
						expBodyHtml =
							"<div class=\"xxExpEncounter\">" +
								"<div class=\"xxExpEncHd\">" +
									"<span class=\"xxExpStepBadge\">第 " + expStep + " / 3 重 · " + room.badge + "</span>" +
									"<span class=\"xxExpRoomTitle\">" + room.title + "</span>" +
								"</div>" +
								"<div class=\"xxExpRoomDesc\">" + room.desc + "</div>" +
								"<div class=\"xxExpChoices\">" +
									"<a href=\"#!\" class=\"xxExpChoiceBtn primary\" data-exp-opt=\"a\">" +
										"<b>⚔ " + room.optA.label + "</b><span>" + room.optA.sub + "</span>" +
									"</a>" +
									"<a href=\"#!\" class=\"xxExpChoiceBtn secondary\" data-exp-opt=\"b\">" +
										"<b>☯ " + room.optB.label + "</b><span>" + room.optB.sub + "</span>" +
									"</a>" +
								"</div>" +
								"<div class=\"xxExpFooterBar\">" +
									"<span class=\"xxExpBag\">储物袋累计：修为 +" + fmt(exp.loot.xiuwei, false, false, 0) +
										(exp.loot.keys ? " · 秘境令 +" + exp.loot.keys : "") +
										(exp.loot.relic ? " · 遗宝 +" + exp.loot.relic : "") + "</span>" +
									"<a href=\"#!\" class=\"xxExpExtractBtn\" data-exp-act=\"extract\">见好就收·携宝遁出 (修为加成 / 心魔-4)</a>" +
								"</div>" +
							"</div>";
					} else {
						var lastLootStr = exp && exp.loot
							? "上轮探幽收获：修为 +" + fmt(exp.loot.xiuwei, false, false, 0) +
								(exp.loot.keys ? " · 秘境令 +" + exp.loot.keys : "") +
								(exp.loot.relic ? " · 上古遗宝 +" + exp.loot.relic : "")
							: "踏入外围禁地可历经三重奇遇抉择，搜寻【秘境令】、千年灵药与上古遗宝。";
						expBodyHtml =
							"<div class=\"xxExpIdle\">" +
								"<div class=\"xxExpIdleNote\">" + (exp && exp.lastNote ? exp.lastNote : lastLootStr) + "</div>" +
								"<div class=\"xxExpIdleSub\">" + lastLootStr + "</div>" +
								"<a href=\"#!\" class=\"xxRiftMainBtn" + (burstBlocked ? " disabled" : "") + "\" data-exp-act=\"start\">" +
									(burstBlocked ? "气脉调息中 · 稍候入境" : "✦ 踏入秘境 · 开启三重探幽") +
								"</a>" +
							"</div>";
					}

					//3. 右栏: 【上古大秘境 · 虚天破界塔】
					var winPct = Math.round(gInfo.chance * 100);
					var vsRatio = Math.max(8, Math.min(92, Math.round((cp / (cp + pw)) * 100)));
					var counterStanceObj = cult.RIFT_STANCES[0];
					for (var csi = 0; csi < cult.RIFT_STANCES.length; csi++){
						if (cult.RIFT_STANCES[csi].key === gInfo.affix.counter){
							counterStanceObj = cult.RIFT_STANCES[csi];
							break;
						}
					}
					var counterBadge = gInfo.countered
						? "<span class=\"xxAffixCounter ok\">✦ 已由【" + gInfo.stance.label + "】破除此法则（胜算+12% · 奖励+25%）</span>"
						: "<a href=\"#!\" class=\"xxAffixCounter warn\" data-stance=\"" + counterStanceObj.key + "\">▸ 点击切换【" + counterStanceObj.label + "】可克制此法则 (+12%胜算)</a>";

					var griftHtml =
						"<div class=\"xxGriftCard\">" +
							"<div class=\"xxGriftBossHd\">" +
								"<div>" +
									"<span class=\"xxGriftFloorTag\">第 " + (F + 1) + " 层镇守</span>" +
									"<span class=\"xxGriftBossName\">" + gInfo.bossName + "</span>" +
								"</div>" +
								"<span class=\"xxGriftOddsBadge " + (winPct >= 75 ? "hi" : (winPct >= 45 ? "mid" : "lo")) + "\">破阵胜算 " + winPct + "%</span>" +
							"</div>" +
							"<div class=\"xxAffixBox\">" +
								"<div class=\"xxAffixLine\"><span class=\"xxAffixTag\">天地法则 · " + gInfo.affix.label + "</span>" + counterBadge + "</div>" +
								"<div class=\"xxAffixDesc\">" + gInfo.affix.desc + "</div>" +
							"</div>" +
							"<div class=\"xxVsBox\">" +
								"<div class=\"xxVsLabels\">" +
									"<span class=\"xxVsMine\">吾道战力 <b>" + fmt(cp, false, false, 0) + "</b></span>" +
									"<span class=\"xxVsNeed\">守关威压 <b>" + fmt(pw, false, false, 0) + "</b></span>" +
								"</div>" +
								"<div class=\"xxVsBar\"><i style=\"width:" + vsRatio + "%\"></i></div>" +
							"</div>" +
							"<div class=\"xxGriftBtnRow\">" +
								"<a href=\"#!\" class=\"xxRiftMainBtn grift" + ((burstBlocked || cult.riftKeys <= 0) ? " disabled" : "") + "\" data-grift-act=\"challenge\">" +
									"⚔ 破阵闯关 · 第 " + (F + 1) + " 层 <span>(耗1枚秘境令)</span>" +
								"</a>" +
								(F >= 1 ? (
									"<a href=\"#!\" class=\"xxRiftSubBtn" + ((burstBlocked || cult.riftKeys <= 0) ? " disabled" : "") + "\" data-grift-act=\"sweep\" title=\"100%必胜稳刷第 " + F + " 层，无心魔风险，获取修为、上古遗宝与法宝掉落\">" +
										"☯ 清剿旧境 · 第 " + F + " 层 <span>(100%稳刷遗宝/法宝)</span>" +
									"</a>"
								) : "") +
							"</div>" +
						"</div>";

					this.riftDeck.innerHTML =
						"<div class=\"xxRiftCol xxExpCol\">" +
							"<div class=\"xxRiftColTitle\"><span>秘境探幽 · 连环奇遇</span><small>三重抉择 · 搜寻秘境令与仙草</small></div>" +
							mapHtml + expBodyHtml +
						"</div>" +
						"<div class=\"xxRiftCol xxGriftCol\">" +
							"<div class=\"xxRiftColTitle\"><span>虚天破界 · 上古大秘境</span><small>法则破阵 · 夺取上古遗宝与本命法宝</small></div>" +
							griftHtml +
						"</div>";

					//4. 天梯层数条 + 六枚玄天古印
					var lo = Math.max(1, F - 8), lhtml = "<span class=\"xxLadderLbl\">破界天梯</span>";
					for (var f = lo; f <= F + 3; f++){
						var cls = f <= F ? "lit" : (f === F + 1 ? "next" : "future");
						lhtml += "<span class=\"xxFloor " + cls + "\" title=\"" +
							String($I("cultivation.rift.floor.tip", [f])).replace(/"/g, "&quot;") + "\">" + f + "</span>";
					}
					this.riftLadder.innerHTML = lhtml;

					var sealHtml = "<span class=\"xxLadderLbl\">玄天古印</span>";
					for (var si2 = 0; si2 < cult.RIFT_SEALS.length; si2++){
						var sealObj = cult.RIFT_SEALS[si2];
						var sealLit = (F >= sealObj.floor);
						sealHtml += "<span class=\"xxSealBadge " + (sealLit ? "lit" : "locked") + "\" title=\"通关上古秘境第 " + sealObj.floor + " 层激活：" + sealObj.desc + "\">" +
							"<i>" + (sealLit ? "✦" : "○") + "</i>" + sealObj.floor + "层·" + sealObj.label + " <small>(" + sealObj.desc + ")</small></span>";
					}
					this.riftSealsEl.innerHTML = sealHtml;
				}

				//保持旧字段兼容测试
				var powerHtml = $I("cultivation.rift.power", [fmt(pw, false, false, 0), fmt(cp, false, false, 0)]);
				if (this.riftPower.innerHTML !== powerHtml){ this.riftPower.innerHTML = powerHtml; }
				dojo.toggleClass(this.riftPower, "xxPowerLow", cp < pw);
				var keysHtml = $I("cultivation.rift.keys", [cult.riftKeys]);
				if (this.riftKeysEl.innerHTML !== keysHtml){ this.riftKeysEl.innerHTML = keysHtml; }

				var last = cult.lastAction;
				this.riftResult.style.display = last ? "" : "none";
				if (last && this._resultSeq !== last.seq){
					this._resultSeq = last.seq;
					this.riftResult.className = "xxRiftResult " + last.cls;
					var resHtml = "<div class=\"xxRiftResSummary\">" + last.text + "</div>";
					var rep = cult.lastBattleReport;
					if (rep && rep.seq === last.seq && rep.rounds && rep.rounds.length){
						resHtml += "<div class=\"xxBattleReport\">";
						for (var ri = 0; ri < rep.rounds.length; ri++){
							resHtml += "<div class=\"xxBattleRound\">" + rep.rounds[ri] + "</div>";
						}
						resHtml += "</div>";
					}
					this.riftResult.innerHTML = resHtml;
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

/**
 * 东方古琴钟磬与雷劫合成音效系统 (Zero-Dependency Web Audio Synthesizer)
 */
classes.ui.XianxiaAudio = {
	_ctx: null,

	_getCtx: function(){
		if (this._ctx){ return this._ctx; }
		if (typeof window == "undefined"){ return null; }
		var AC = window.AudioContext || window.webkitAudioContext;
		if (!AC){ return null; }
		try {
			this._ctx = new AC();
			return this._ctx;
		} catch (e){
			return null;
		}
	},

	//小周天突破·古琴泛音与青铜钟磬
	playBell: function(){
		var ctx = this._getCtx();
		if (!ctx){ return false; }
		try {
			if (ctx.state == "suspended" && ctx.resume){ ctx.resume(); }
			var now = ctx.currentTime;
			var freqs = [528, 1056, 1584];
			for (var i = 0; i < freqs.length; i++){
				var osc = ctx.createOscillator();
				var gain = ctx.createGain();
				osc.type = i === 0 ? "sine" : "triangle";
				osc.frequency.setValueAtTime(freqs[i], now);
				gain.gain.setValueAtTime(0.001, now);
				gain.gain.linearRampToValueAtTime(0.08 / (i + 1), now + 0.02);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + 1.15);
			}
			return true;
		} catch (e){
			return false;
		}
	},

	//大境界突破·九天雷劫轰鸣与金莲大道钟声
	playTribulation: function(){
		var ctx = this._getCtx();
		if (!ctx){ return false; }
		try {
			if (ctx.state == "suspended" && ctx.resume){ ctx.resume(); }
			var now = ctx.currentTime;
			//低频雷音震荡
			var thunder = ctx.createOscillator();
			var tGain = ctx.createGain();
			thunder.type = "sawtooth";
			thunder.frequency.setValueAtTime(115, now);
			thunder.frequency.exponentialRampToValueAtTime(36, now + 0.85);
			tGain.gain.setValueAtTime(0.001, now);
			tGain.gain.linearRampToValueAtTime(0.09, now + 0.04);
			tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
			thunder.connect(tGain);
			tGain.connect(ctx.destination);
			thunder.start(now);
			thunder.stop(now + 0.95);
			//金钟与仙音和弦
			var chord = [440, 660, 880, 1320];
			for (var i = 0; i < chord.length; i++){
				var osc = ctx.createOscillator();
				var gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(chord[i], now + 0.12);
				gain.gain.setValueAtTime(0.001, now + 0.12);
				gain.gain.linearRampToValueAtTime(0.07 / (i + 1), now + 0.18);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now + 0.12);
				osc.stop(now + 1.85);
			}
			return true;
		} catch (e){
			return false;
		}
	},

	//冲关失利·气脉逆行闷响
	playFail: function(){
		var ctx = this._getCtx();
		if (!ctx){ return false; }
		try {
			if (ctx.state == "suspended" && ctx.resume){ ctx.resume(); }
			var now = ctx.currentTime;
			var osc = ctx.createOscillator();
			var gain = ctx.createGain();
			osc.type = "triangle";
			osc.frequency.setValueAtTime(150, now);
			osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);
			gain.gain.setValueAtTime(0.001, now);
			gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 0.4);
			return true;
		} catch (e){
			return false;
		}
	}
};

/**
 * 东方水墨流金美术系统 (Xianxia Ink-Wash & Gold-Leaf Visual Art System)
 * 纯离线矢量画境、盘膝吐纳法相、仙缘章回插画、灵材法宝徽记。
 */
classes.ui.XianxiaArt = {

	REALM_PALETTE: {
		lianqi:   {pri: "#4fd1a5", sec: "#8be8cb", glow: "rgba(79,209,165,.35)"},
		zhuji:    {pri: "#38e4ae", sec: "#d4b06a", glow: "rgba(56,228,174,.42)"},
		jiedan:   {pri: "#f0c45a", sec: "#ffe59e", glow: "rgba(240,196,90,.48)"},
		yuanying: {pri: "#b98eff", sec: "#e3ccff", glow: "rgba(185,142,255,.48)"},
		huashen:  {pri: "#ff7b6b", sec: "#ffd08a", glow: "rgba(255,123,107,.48)"},
		lianxu:   {pri: "#6fd3ff", sec: "#c6f0ff", glow: "rgba(111,211,255,.48)"},
		heti:     {pri: "#e5a4ff", sec: "#ffe39e", glow: "rgba(229,164,255,.52)"},
		dacheng:  {pri: "#ffd97d", sec: "#ffffff", glow: "rgba(255,217,125,.58)"},
		dujie:    {pri: "#ff5e7e", sec: "#7ee8ff", glow: "rgba(255,94,126,.62)"}
	},

	PORTRAIT_ART: {
		lianqi:   "res/art/portrait_qi.jpg",
		zhuji:    "res/art/portrait_zhuji.jpg",
		jiedan:   "res/art/portrait_core.jpg",
		yuanying: "res/art/portrait_yuanying.jpg",
		huashen:  "res/art/portrait_immortal.jpg",
		lianxu:   "res/art/portrait_immortal.jpg",
		heti:     "res/art/portrait_dacheng.jpg",
		dacheng:  "res/art/portrait_dacheng.jpg",
		dujie:    "res/art/portrait_dacheng.jpg"
	},

	SCENE_BANNER_ART: {
		cave:    "res/art/banner_bonfire.jpg",
		library: "res/art/banner_science.jpg",
		furnace: "res/art/banner_workshop.jpg",
		bazaar:  "res/art/banner_trade.jpg",
		altar:   "res/art/banner_religion.jpg",
		trib:    "res/art/fate_rift.jpg",
		cosmos:  "res/art/banner_spacetime.jpg",
		time:    "res/art/banner_time.jpg",
		karma:   "res/art/banner_time.jpg"
	},

	// ---------------- 1. 境界盘膝吐纳法相 (Hero Cultivator Portrait) ----------------
	heroPortraitSVG: function(realmKey, sealChar, rootKey, secluded, demon, hasBuff){
		var pal = this.REALM_PALETTE[realmKey] || this.REALM_PALETTE.lianqi;
		var pri = pal.pri;
		var sec = pal.sec;
		var dHigh = demon >= 50;
		var coreColor = dHigh ? "#e0604a" : pri;
		var spinCls = (secluded || hasBuff) ? "xx-art-spin-fast" : "xx-art-spin";
		var portraitHref = this.PORTRAIT_ART[realmKey] || this.PORTRAIT_ART.lianqi;

		//按境界演化的背光异象:炼气气旋 / 筑基道台 / 结丹金丸 / 元婴法相 / 化神星冕 / 渡劫雷霆
		var realmAura = "";
		if (realmKey == "jiedan"){
			realmAura = "<circle cx=\"44\" cy=\"42\" r=\"9\" fill=\"" + pri + "\" opacity=\"0.28\" class=\"xx-art-pulse\"/>";
		} else if (realmKey == "yuanying" || realmKey == "huashen"){
			realmAura = "<ellipse cx=\"44\" cy=\"28\" rx=\"16\" ry=\"22\" fill=\"none\" stroke=\"" + pri + "\" stroke-width=\"1.1\" stroke-dasharray=\"3 2\" opacity=\"0.55\"/>";
		} else if (realmKey == "lianxu" || realmKey == "heti" || realmKey == "dacheng" || realmKey == "dujie"){
			realmAura = "<path d=\"M14 20 L24 30 L19 34 L29 44 M74 20 L64 30 L69 34 L59 44\" stroke=\"" + sec + "\" stroke-width=\"1.3\" fill=\"none\" opacity=\"0.75\"/>" +
				"<circle cx=\"44\" cy=\"44\" r=\"36\" fill=\"none\" stroke=\"" + pri + "\" stroke-width=\"1.1\" opacity=\"0.5\"/>";
		}

		return "<svg viewBox=\"0 0 88 88\" class=\"xx-portrait-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<defs>" +
				"<radialGradient id=\"xxHgGlow\" cx=\"50%\" cy=\"46%\" r=\"50%\">" +
					"<stop offset=\"0%\" stop-color=\"" + pri + "\" stop-opacity=\"0.38\"/>" +
					"<stop offset=\"65%\" stop-color=\"" + sec + "\" stop-opacity=\"0.10\"/>" +
					"<stop offset=\"100%\" stop-color=\"#0a0f16\" stop-opacity=\"0\"/>" +
				"</radialGradient>" +
				"<radialGradient id=\"xxPortVig\" cx=\"50%\" cy=\"50%\" r=\"50%\">" +
					"<stop offset=\"62%\" stop-color=\"#0a0f16\" stop-opacity=\"0\"/>" +
					"<stop offset=\"100%\" stop-color=\"#080d14\" stop-opacity=\"0.78\"/>" +
				"</radialGradient>" +
				"<clipPath id=\"xxPortClip\">" +
					"<rect x=\"3\" y=\"3\" width=\"82\" height=\"82\" rx=\"14\"/>" +
				"</clipPath>" +
			"</defs>" +
			"<circle cx=\"44\" cy=\"44\" r=\"42\" fill=\"url(#xxHgGlow)\"/>" +
			//Nano Banana 境界法相原画底图
			"<image href=\"" + portraitHref + "\" x=\"3\" y=\"3\" width=\"82\" height=\"82\" preserveAspectRatio=\"xMidYMid slice\" clip-path=\"url(#xxPortClip)\" opacity=\"0.95\"/>" +
			"<rect x=\"3\" y=\"3\" width=\"82\" height=\"82\" rx=\"14\" fill=\"url(#xxPortVig)\"/>" +
			//外层周天八卦阵环
			"<g class=\"" + spinCls + "\" style=\"transform-origin:44px 44px\">" +
				"<circle cx=\"44\" cy=\"44\" r=\"39\" fill=\"none\" stroke=\"" + pri + "\" stroke-width=\"1\" stroke-dasharray=\"6 4 2 4\" opacity=\"0.68\"/>" +
				"<circle cx=\"44\" cy=\"44\" r=\"34\" fill=\"none\" stroke=\"#d4b06a\" stroke-width=\"0.7\" stroke-dasharray=\"2 5\" opacity=\"0.48\"/>" +
			"</g>" +
			realmAura +
			//丹田气海灵光呼吸点
			"<circle cx=\"44\" cy=\"58\" r=\"4.5\" fill=\"" + coreColor + "\" opacity=\"0.28\" class=\"xx-art-pulse\"/>" +
			//周身灵气光尘
			"<circle cx=\"18\" cy=\"28\" r=\"1.3\" fill=\"" + pri + "\" opacity=\"0.85\"/>" +
			"<circle cx=\"70\" cy=\"26\" r=\"1.4\" fill=\"#eed39a\" opacity=\"0.85\"/>" +
			"<circle cx=\"68\" cy=\"62\" r=\"1.1\" fill=\"" + pri + "\" opacity=\"0.78\"/>" +
			"</svg>" +
			"<span class=\"xx-hero-seal-badge\">" + sealChar + "</span>";
	},

	//境界总览卡右侧水墨洞天画卷底图(随大境界演化画境)
	cultivationBgSVG: function(realmKey){
		var pal = this.REALM_PALETTE[realmKey] || this.REALM_PALETTE.lianqi;
		var bgHref = "res/art/banner_cultivation.jpg";
		if (realmKey == "huashen" || realmKey == "lianxu"){
			bgHref = "res/art/banner_spacetime.jpg";
		} else if (realmKey == "heti" || realmKey == "dacheng" || realmKey == "dujie"){
			bgHref = "res/art/banner_time.jpg";
		}
		return "<svg viewBox=\"0 0 600 180\" preserveAspectRatio=\"xMidYMid slice\" class=\"xx-cult-bg-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<defs>" +
				"<linearGradient id=\"xxCultFade\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">" +
					"<stop offset=\"0%\" stop-color=\"#0b121c\" stop-opacity=\"0.92\"/>" +
					"<stop offset=\"45%\" stop-color=\"#0b121c\" stop-opacity=\"0.60\"/>" +
					"<stop offset=\"100%\" stop-color=\"#0b121c\" stop-opacity=\"0.14\"/>" +
				"</linearGradient>" +
				"<linearGradient id=\"xxMt1\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">" +
					"<stop offset=\"0%\" stop-color=\"" + pal.pri + "\" stop-opacity=\"0.18\"/>" +
					"<stop offset=\"100%\" stop-color=\"#0a0f16\" stop-opacity=\"0\"/>" +
				"</linearGradient>" +
			"</defs>" +
			"<image href=\"" + bgHref + "\" x=\"0\" y=\"0\" width=\"600\" height=\"180\" preserveAspectRatio=\"xMidYMid slice\" opacity=\"0.68\"/>" +
			"<rect width=\"600\" height=\"180\" fill=\"url(#xxCultFade)\"/>" +
			"<circle cx=\"515\" cy=\"42\" r=\"24\" fill=\"" + pal.sec + "\" opacity=\"0.14\"/>" +
			"<path d=\"M260 180 L345 112 L425 68 L495 122 L555 78 L600 115 L600 180 Z\" fill=\"url(#xxMt1)\"/>" +
			"<path d=\"M465 44 Q471 39 476 44 Q481 39 487 44\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.2\" opacity=\"0.5\"/>" +
			"<path d=\"M488 34 Q493 30 497 34 Q501 30 506 34\" fill=\"none\" stroke=\"" + pal.pri + "\" stroke-width=\"1\" opacity=\"0.45\"/>" +
			"</svg>";
	},

	// ---------------- 2. 各大页签顶部水墨流金画卷 (Tab Scene Banners) ----------------
	tabBannerHTML: function(tabId, game){
		var map = {
			Bonfire:      {art: "cave",     seal: "洞天", title: "云深洞府", sub: "辟田引泉，筑庐聚灵，于微末凡尘中立下长生道基"},
			Science:      {art: "library",  seal: "问道", title: "琅嬛书阁", sub: "博观上古竹简玉牒，推演天地至理，悟一法而通万法"},
			Workshop:     {art: "furnace",  seal: "百炼", title: "地火丹器", sub: "引地肺青莲真火，凝百草灵髓，百炼护道神兵"},
			Trade:        {art: "bazaar",   seal: "仙坊", title: "四海坊市", sub: "乘流云飞舟，访四海异族，互通天材地宝"},
			Religion:     {art: "altar",    seal: "玄坛", title: "九天香火", sub: "诵大道真言，聚万灵愿力，感召太虚法则"},
			Space:        {art: "cosmos",   seal: "星海", title: "域外星海", sub: "破界飞舟横渡虚空，勘探诸天星辰灵脉"},
			Time:         {art: "time",     seal: "岁月", title: "光阴长河", sub: "凝岁月仙晶，掌宙光流转，逆溯万古因果"},
			Challenges:   {art: "trib",     seal: "天劫", title: "天道劫数", sub: "以身试劫，勘破生死大恐怖，淬炼无暇道心"},
			Achievements: {art: "karma",    seal: "道果", title: "仙途道果", sub: "凡尘一步一脚印，皆铭刻于天地造化玉册"},
			Stats:        {art: "cosmos",   seal: "天机", title: "乾坤天机", sub: "推演气运流转，纵览洞府万物生息之数"}
		};
		var cfg = map[tabId];
		if (!cfg){ return ""; }
		return "<div class=\"xxSceneBanner xxScene-" + cfg.art + "\" role=\"region\" aria-label=\"" + cfg.title + "\">" +
			"<div class=\"xxSceneArt\" aria-hidden=\"true\">" + this.sceneSVG(cfg.art) + "</div>" +
			"<div class=\"xxSceneOverlay\">" +
				"<span class=\"xxSceneSeal\" aria-hidden=\"true\">" + cfg.seal + "</span>" +
				"<div class=\"xxSceneText\">" +
					"<div class=\"xxSceneTitle\">" + cfg.title + "</div>" +
					"<div class=\"xxSceneSub\">" + cfg.sub + "</div>" +
				"</div>" +
			"</div>" +
		"</div>";
	},

	sceneSVG: function(kind){
		var artHref = this.SCENE_BANNER_ART[kind] || this.SCENE_BANNER_ART.cosmos;
		var baseDefs = "<defs>" +
			"<linearGradient id=\"xxScSky\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">" +
				"<stop offset=\"0%\" stop-color=\"#0e1824\"/>" +
				"<stop offset=\"55%\" stop-color=\"#152535\"/>" +
				"<stop offset=\"100%\" stop-color=\"#0d1620\"/>" +
			"</linearGradient>" +
			"<linearGradient id=\"xxScMask\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">" +
				"<stop offset=\"0%\" stop-color=\"#091019\" stop-opacity=\"0.88\"/>" +
				"<stop offset=\"42%\" stop-color=\"#0b1420\" stop-opacity=\"0.42\"/>" +
				"<stop offset=\"100%\" stop-color=\"#0b1420\" stop-opacity=\"0.12\"/>" +
			"</linearGradient>" +
			"<linearGradient id=\"xxScJade\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">" +
				"<stop offset=\"0%\" stop-color=\"#4fd1a5\" stop-opacity=\"0.22\"/>" +
				"<stop offset=\"100%\" stop-color=\"#0d1620\" stop-opacity=\"0.02\"/>" +
			"</linearGradient>" +
			"<linearGradient id=\"xxScGold\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">" +
				"<stop offset=\"0%\" stop-color=\"#d4b06a\" stop-opacity=\"0.20\"/>" +
				"<stop offset=\"100%\" stop-color=\"#0d1620\" stop-opacity=\"0.02\"/>" +
			"</linearGradient>" +
		"</defs>" +
		"<rect width=\"800\" height=\"96\" fill=\"url(#xxScSky)\"/>" +
		"<image href=\"" + artHref + "\" x=\"0\" y=\"0\" width=\"800\" height=\"96\" preserveAspectRatio=\"xMidYMid slice\" opacity=\"0.88\"/>" +
		"<rect width=\"800\" height=\"96\" fill=\"url(#xxScMask)\"/>";

		if (kind == "cave"){
			//云深洞府图:Nano Banana 神手谷灵田原画 + 仙鹤流光点缀
			return "<svg viewBox=\"0 0 800 96\" class=\"xx-scene-svg\" preserveAspectRatio=\"xMidYMid slice\" xmlns=\"http://www.w3.org/2000/svg\">" +
				baseDefs +
				"<path d=\"M595 32 Q602 25 608 32 Q614 25 621 32\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.2\" opacity=\"0.65\"/>" +
				"<path d=\"M628 22 Q633 17 638 22 Q643 17 648 22\" fill=\"none\" stroke=\"#8be8cb\" stroke-width=\"1\" opacity=\"0.55\"/>" +
				"<circle cx=\"520\" cy=\"42\" r=\"1.6\" fill=\"#4fd1a5\" opacity=\"0.8\"/>" +
				"<circle cx=\"685\" cy=\"54\" r=\"1.5\" fill=\"#eed39a\" opacity=\"0.85\"/>" +
			"</svg>";
		}
		if (kind == "library"){
			//琅嬛书阁图:Nano Banana 藏经阁玉简原画 + 浑天八卦星轨点缀
			return "<svg viewBox=\"0 0 800 96\" class=\"xx-scene-svg\" preserveAspectRatio=\"xMidYMid slice\" xmlns=\"http://www.w3.org/2000/svg\">" +
				baseDefs +
				"<g transform=\"translate(690,48)\" opacity=\"0.48\">" +
					"<circle r=\"30\" fill=\"none\" stroke=\"#d4b06a\" stroke-width=\"1.1\" stroke-dasharray=\"5 3\"/>" +
					"<circle r=\"20\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"0.9\"/>" +
				"</g>" +
				"<polyline points=\"610,24 645,16 678,32 715,18\" fill=\"none\" stroke=\"#8be8cb\" stroke-width=\"0.9\" opacity=\"0.5\"/>" +
			"</svg>";
		}
		if (kind == "furnace"){
			//地火丹器图:Nano Banana 虚天丹鼎原画 + 火星流光
			return "<svg viewBox=\"0 0 800 96\" class=\"xx-scene-svg\" preserveAspectRatio=\"xMidYMid slice\" xmlns=\"http://www.w3.org/2000/svg\">" +
				baseDefs +
				"<circle cx=\"620\" cy=\"28\" r=\"2\" fill=\"#ffd08a\" opacity=\"0.8\"/>" +
				"<circle cx=\"665\" cy=\"42\" r=\"1.6\" fill=\"#4fd1a5\" opacity=\"0.75\"/>" +
				"<circle cx=\"715\" cy=\"24\" r=\"1.8\" fill=\"#ff7b6b\" opacity=\"0.75\"/>" +
			"</svg>";
		}
		if (kind == "bazaar"){
			//云海仙坊图:Nano Banana 四海坊市飞舟原画
			return "<svg viewBox=\"0 0 800 96\" class=\"xx-scene-svg\" preserveAspectRatio=\"xMidYMid slice\" xmlns=\"http://www.w3.org/2000/svg\">" +
				baseDefs +
				"<path d=\"M520 72 Q555 62 590 72 T660 70\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.1\" opacity=\"0.45\"/>" +
			"</svg>";
		}
		if (kind == "altar"){
			//九天玄坛图:Nano Banana 九天香火玄坛原画
			return "<svg viewBox=\"0 0 800 96\" class=\"xx-scene-svg\" preserveAspectRatio=\"xMidYMid slice\" xmlns=\"http://www.w3.org/2000/svg\">" +
				baseDefs +
				"<g transform=\"translate(680,48)\" opacity=\"0.45\">" +
					"<circle r=\"28\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.2\"/>" +
					"<circle r=\"19\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"0.9\" stroke-dasharray=\"4 3\"/>" +
				"</g>" +
			"</svg>";
		}
		//默认星海/天劫/岁月画境
		return "<svg viewBox=\"0 0 800 96\" class=\"xx-scene-svg\" preserveAspectRatio=\"xMidYMid slice\" xmlns=\"http://www.w3.org/2000/svg\">" +
			baseDefs +
			"<circle cx=\"680\" cy=\"46\" r=\"26\" fill=\"none\" stroke=\"#b98eff\" stroke-width=\"1\" stroke-dasharray=\"5 3\" opacity=\"0.45\"/>" +
			"<circle cx=\"650\" cy=\"26\" r=\"1.8\" fill=\"#eed39a\"/><circle cx=\"715\" cy=\"54\" r=\"2\" fill=\"#4fd1a5\"/>" +
		"</svg>";
	},

	// ---------------- 3. 仙缘章回卡插画 (Story Fate Card Illustrations) ----------------
	fateArtSVG: function(fateName, arcKey){
		var pal = this.REALM_PALETTE[arcKey] || this.REALM_PALETTE.lianqi;
		var scene = "mountain";
		if (fateName == "bottle"){ scene = "bottle"; }
		else if (fateName == "mojuren" || fateName == "duoshi" || fateName == "erying" || fateName == "xiedao"){ scene = "soul"; }
		else if (fateName == "xuese" || fateName == "xutian" || fateName == "kunwu" || fateName == "dayan" || fateName == "xugu"){ scene = "ruin"; }
		else if (fateName == "nangong" || fateName == "chen" || fateName == "yuanyao" || fateName == "ziul" || fateName == "qingyuan"){ scene = "blossom"; }
		else if (fateName == "tainan" || fateName == "fengyun" || fateName == "chuansong"){ scene = "array"; }
		else if (fateName == "yuanhou" || fateName == "fenglei" || fateName == "tihun"){ scene = "beast"; }
		else if (fateName == "death"){ scene = "samsara"; }
		else if (fateName == "identity"){ scene = "identity"; }

		var fateImg = "res/art/banner_cultivation.jpg";
		if (scene == "bottle"){ fateImg = "res/art/fate_bottle.jpg"; }
		else if (scene == "soul"){ fateImg = "res/art/fate_soul.jpg"; }
		else if (scene == "blossom"){ fateImg = "res/art/fate_companion.jpg"; }
		else if (scene == "ruin" || scene == "beast"){ fateImg = "res/art/fate_rift.jpg"; }
		else if (scene == "array"){ fateImg = "res/art/banner_trade.jpg"; }
		else if (scene == "samsara"){ fateImg = "res/art/banner_time.jpg"; }

		var bg = "<defs>" +
			"<linearGradient id=\"xxFtSky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">" +
				"<stop offset=\"0%\" stop-color=\"#0b131e\"/>" +
				"<stop offset=\"100%\" stop-color=\"#152436\"/>" +
			"</linearGradient>" +
			"<radialGradient id=\"xxFtVig\" cx=\"50%\" cy=\"45%\" r=\"65%\">" +
				"<stop offset=\"45%\" stop-color=\"#0b131e\" stop-opacity=\"0.08\"/>" +
				"<stop offset=\"100%\" stop-color=\"#070c14\" stop-opacity=\"0.78\"/>" +
			"</radialGradient>" +
		"</defs>" +
		"<rect width=\"480\" height=\"112\" rx=\"8\" fill=\"url(#xxFtSky)\"/>" +
		"<image href=\"" + fateImg + "\" x=\"0\" y=\"0\" width=\"480\" height=\"112\" preserveAspectRatio=\"xMidYMid slice\" opacity=\"0.90\"/>" +
		"<rect width=\"480\" height=\"112\" rx=\"8\" fill=\"url(#xxFtVig)\"/>";

		var fg = "";
		if (scene == "bottle"){
			fg = "<circle cx=\"240\" cy=\"56\" r=\"26\" fill=\"#4fd1a5\" opacity=\"0.16\" class=\"xx-art-pulse\"/>";
		} else if (scene == "soul"){
			fg = "<circle cx=\"185\" cy=\"54\" r=\"18\" fill=\"#f0c45a\" opacity=\"0.20\"/>" +
				"<circle cx=\"295\" cy=\"54\" r=\"18\" fill=\"#e0604a\" opacity=\"0.20\"/>";
		} else if (scene == "samsara"){
			fg = "<circle cx=\"240\" cy=\"56\" r=\"32\" fill=\"none\" stroke=\"#d4b06a\" stroke-width=\"1.2\" stroke-dasharray=\"6 4\" opacity=\"0.65\"/>";
		} else {
			fg = "<circle cx=\"240\" cy=\"56\" r=\"26\" fill=\"none\" stroke=\"" + pal.pri + "\" stroke-width=\"1\" stroke-dasharray=\"5 3\" opacity=\"0.38\"/>";
		}

		return "<svg viewBox=\"0 0 480 112\" class=\"xx-fate-svg\" xmlns=\"http://www.w3.org/2000/svg\">" + bg + fg + "</svg>";
	},

	// ---------------- 4. 出身徽记 / 历练四式 / 五维道行小图标 ----------------
	originIcon: function(key){
		var map = {
			farmer:  "<path d=\"M12 22 C12 13 20 8 24 6 C24 14 19 20 12 22 Z M12 22 C7 18 5 12 8 7 C12 11 13 16 12 22 Z\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"1.8\"/><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"27\" stroke=\"#d4b06a\" stroke-width=\"2\"/>",
			hunter:  "<path d=\"M7 25 L25 7 M18 7 L25 7 L25 14\" fill=\"none\" stroke=\"#e08a7a\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><path d=\"M8 10 Q18 14 22 24\" fill=\"none\" stroke=\"#d4b06a\" stroke-width=\"1.6\"/>",
			scholar: "<rect x=\"6\" y=\"6\" width=\"5\" height=\"20\" rx=\"1.5\" fill=\"none\" stroke=\"#6fd3ff\" stroke-width=\"1.6\"/><rect x=\"13.5\" y=\"5\" width=\"5\" height=\"22\" rx=\"1.5\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.6\"/><rect x=\"21\" y=\"6\" width=\"5\" height=\"20\" rx=\"1.5\" fill=\"none\" stroke=\"#6fd3ff\" stroke-width=\"1.6\"/>",
			trader:  "<path d=\"M5 17 Q16 24 27 17 L23 24 L9 24 Z\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.8\"/><circle cx=\"16\" cy=\"12\" r=\"4\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"1.6\"/>",
			orphan:  "<polygon points=\"16,4 20,16 16,28 12,16\" fill=\"none\" stroke=\"#b98eff\" stroke-width=\"1.7\"/><circle cx=\"16\" cy=\"16\" r=\"2.5\" fill=\"#eed39a\"/>"
		};
		var body = map[key] || map.farmer;
		return "<svg viewBox=\"0 0 32 32\" class=\"xx-orig-svg\" xmlns=\"http://www.w3.org/2000/svg\">" + body + "</svg>";
	},

	actionArt: function(glyph){
		var svg = "";
		if (glyph == "游"){
			//御剑乘云
			svg = "<path d=\"M4 18 L24 6 M18 6 L24 6 L24 12\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"2\" stroke-linecap=\"round\"/>" +
				"<path d=\"M4 23 Q11 19 18 23 T26 21\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.6\" stroke-linecap=\"round\"/>";
		} else if (glyph == "闭"){
			//青莲打坐
			svg = "<circle cx=\"14\" cy=\"10\" r=\"3.5\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.8\"/>" +
				"<path d=\"M7 22 Q14 14 21 22 Z\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"1.8\"/>" +
				"<path d=\"M4 24 Q14 20 24 24\" fill=\"none\" stroke=\"#d4b06a\" stroke-width=\"1.5\"/>";
		} else if (glyph == "秘"){
			//秘境旋涡门
			svg = "<circle cx=\"14\" cy=\"14\" r=\"9\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"1.8\" stroke-dasharray=\"5 3\"/>" +
				"<polygon points=\"14,7 20,14 14,21 8,14\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.6\"/>" +
				"<circle cx=\"14\" cy=\"14\" r=\"2\" fill=\"#fff\"/>";
		} else {
			//上古秘境宝塔
			svg = "<path d=\"M14 4 L22 10 L6 10 Z M8 15 L20 15 L23 20 L5 20 Z\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.6\"/>" +
				"<rect x=\"9\" y=\"20\" width=\"10\" height=\"5\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"1.6\"/>";
		}
		return "<svg viewBox=\"0 0 28 28\" class=\"xx-act-svg\" xmlns=\"http://www.w3.org/2000/svg\">" + svg + "</svg>";
	},

	tileIcon: function(key){
		var map = {
			bonus:    "<circle cx=\"8\" cy=\"8\" r=\"6\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.5\"/><circle cx=\"8\" cy=\"8\" r=\"2\" fill=\"#4fd1a5\"/>",
			combat:   "<path d=\"M3 13 L13 3 M9 3 L13 3 L13 7 M3 3 L13 13\" fill=\"none\" stroke=\"#eab6b6\" stroke-width=\"1.6\" stroke-linecap=\"round\"/>",
			root:     "<path d=\"M8 2 C12 6 12 11 8 14 C4 11 4 6 8 2 Z\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"1.5\"/><path d=\"M3 7 C6 7 8 10 8 14 M13 7 C10 7 8 10 8 14\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.3\"/>",
			life:     "<circle cx=\"8\" cy=\"8\" r=\"6\" fill=\"none\" stroke=\"#8be8cb\" stroke-width=\"1.5\"/><polyline points=\"8,4 8,8 11,10\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>",
			demon:    "<path d=\"M8 2 Q13 7 12 11 A4 4 0 1 1 4 11 Q3 7 8 2 Z\" fill=\"none\" stroke=\"#e0604a\" stroke-width=\"1.5\"/><circle cx=\"8\" cy=\"10\" r=\"1.5\" fill=\"#ffd08a\"/>",
			fate:     "<polygon points=\"8,1 10,6 15,8 10,10 8,15 6,10 1,8 6,6\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.3\"/>",
			artifact: "<polygon points=\"8,1 14,5 12,14 4,14 2,5\" fill=\"none\" stroke=\"#9ecbff\" stroke-width=\"1.4\"/><circle cx=\"8\" cy=\"8\" r=\"2\" fill=\"#eed39a\"/>"
		};
		return "<svg viewBox=\"0 0 16 16\" class=\"xx-mini-svg\" xmlns=\"http://www.w3.org/2000/svg\">" + (map[key] || map.bonus) + "</svg>";
	},

	// ---------------- 5. 全灵材资源定制图标 (Resource Icons) ----------------
	resIcon: function(name){
		var p = "";
		switch (name){
			case "xiuwei":
				p = "<circle cx=\"8\" cy=\"8\" r=\"6.2\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"1.5\"/><path d=\"M8 1.8 A3.1 3.1 0 0 1 8 8 A3.1 3.1 0 0 0 8 14.2\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.4\"/><circle cx=\"8\" cy=\"5\" r=\"1.2\" fill=\"#eed39a\"/><circle cx=\"8\" cy=\"11\" r=\"1.2\" fill=\"#4fd1a5\"/>";
				break;
			case "catnip":
				p = "<path d=\"M8 14 L8 6 M8 10 C4 9 3 5 6 3 C8 5 9 8 8 10 Z M8 8 C12 7 13 4 10 2 C8 4 7 6 8 8 Z\" fill=\"none\" stroke=\"#5ce0a8\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>";
				break;
			case "wood":
				p = "<path d=\"M4 13 L12 5 M6 7 L9 4 M7 12 L12 9\" fill=\"none\" stroke=\"#c89d66\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><circle cx=\"12\" cy=\"4\" r=\"2\" fill=\"#4fd1a5\"/>";
				break;
			case "minerals":
				p = "<polygon points=\"8,2 13,6 11,14 5,14 3,6\" fill=\"none\" stroke=\"#7ec8e3\" stroke-width=\"1.5\"/><polyline points=\"3,6 8,9 13,6\" fill=\"none\" stroke=\"#7ec8e3\" stroke-width=\"1.2\"/>";
				break;
			case "coal":
				p = "<polygon points=\"4,12 3,7 7,4 13,6 12,13\" fill=\"none\" stroke=\"#9aa7b8\" stroke-width=\"1.5\"/><circle cx=\"8\" cy=\"9\" r=\"1.8\" fill=\"#e0604a\"/>";
				break;
			case "iron":
			case "steel":
			case "alloy":
				p = "<polygon points=\"3,11 6,5 12,5 14,11\" fill=\"none\" stroke=\"#a8b8c8\" stroke-width=\"1.5\"/><line x1=\"6\" y1=\"8\" x2=\"11\" y2=\"8\" stroke=\"#eed39a\" stroke-width=\"1.3\"/>";
				break;
			case "titanium":
			case "eludium":
				p = "<polygon points=\"8,1 14,8 8,15 2,8\" fill=\"none\" stroke=\"#9ecbff\" stroke-width=\"1.5\"/><circle cx=\"8\" cy=\"8\" r=\"2\" fill=\"#fff\"/>";
				break;
			case "gold":
				p = "<path d=\"M2 9 Q8 14 14 9 L12 13 L4 13 Z\" fill=\"none\" stroke=\"#ffd166\" stroke-width=\"1.6\"/><ellipse cx=\"8\" cy=\"8\" rx=\"3.5\" ry=\"2\" fill=\"#ffd166\"/>";
				break;
			case "oil":
				p = "<path d=\"M8 2 C12 7 13 10 11 13 A4 4 0 0 1 5 13 C3 10 4 7 8 2 Z\" fill=\"none\" stroke=\"#6fd3ff\" stroke-width=\"1.5\"/>";
				break;
			case "science":
			case "blueprint":
				p = "<rect x=\"3\" y=\"3\" width=\"3\" height=\"10\" rx=\"1\" fill=\"none\" stroke=\"#6fd3ff\" stroke-width=\"1.4\"/><rect x=\"6.5\" y=\"2\" width=\"3\" height=\"12\" rx=\"1\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.4\"/><rect x=\"10\" y=\"3\" width=\"3\" height=\"10\" rx=\"1\" fill=\"none\" stroke=\"#6fd3ff\" stroke-width=\"1.4\"/>";
				break;
			case "culture":
				p = "<circle cx=\"8\" cy=\"8\" r=\"5.5\" fill=\"none\" stroke=\"#d4a5ff\" stroke-width=\"1.5\"/><rect x=\"6.2\" y=\"6.2\" width=\"3.6\" height=\"3.6\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.2\"/>";
				break;
			case "faith":
				p = "<path d=\"M4 10 L12 10 L11 14 L5 14 Z\" fill=\"none\" stroke=\"#eed39a\" stroke-width=\"1.5\"/><path d=\"M6 8 Q6 4 8 3 M10 8 Q10 4 8 2\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"1.3\" stroke-linecap=\"round\"/>";
				break;
			case "spice":
				p = "<path d=\"M6 3 L10 3 L9 6 C12 8 12 12 10 14 L6 14 C4 12 4 8 7 6 Z\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"1.5\"/><circle cx=\"8\" cy=\"10\" r=\"1.6\" fill=\"#eed39a\"/>";
				break;
			case "relic":
			case "timeCrystal":
			case "unobtainium":
			case "karma":
			case "paragon":
				p = "<polygon points=\"8,1 14,5 14,11 8,15 2,11 2,5\" fill=\"none\" stroke=\"#b98eff\" stroke-width=\"1.5\"/><circle cx=\"8\" cy=\"8\" r=\"2.2\" fill=\"#eed39a\"/>";
				break;
			default:
				p = "<polygon points=\"8,2 13,8 8,14 3,8\" fill=\"none\" stroke=\"#4fd1a5\" stroke-width=\"1.5\"/><circle cx=\"8\" cy=\"8\" r=\"1.5\" fill=\"#eed39a\"/>";
		}
		return "<svg viewBox=\"0 0 16 16\" class=\"xx-res-svg\" xmlns=\"http://www.w3.org/2000/svg\">" + p + "</svg>";
	},

	// ---------------- 6. 营造/境界/丹器卡片定制徽记 (Card Button Emblems) ----------------
	btnIcon: function(btn){
		var opts = (btn && btn.opts) || {};
		var mdl = (btn && btn.model) || {};
		var meta = mdl.metadata || {};
		var id = meta.name || opts.building || opts.id || "";
		var ctrl = btn && btn.controller;
		if (!id && ctrl && ctrl.declaredClass){
			if (ctrl.declaredClass.indexOf("GatherCatnip") >= 0){ id = "gatherCatnip"; }
			else if (ctrl.declaredClass.indexOf("RefineCatnip") >= 0){ id = "refineCatnip"; }
		}

		//采集灵谷 & 凝练灵木
		if (id == "gatherCatnip" || id == "field" || id == "pasture" || id == "unicornPasture"){
			return this.resIcon("catnip");
		}
		if (id == "refineCatnip" || id == "hut" || id == "logHouse" || id == "mansion" || id == "lumberMill"){
			return this.resIcon("wood");
		}
		if (id == "library" || id == "academy" || id == "observatory" || id == "biolab" || mdl.type == "science"){
			return this.resIcon("science");
		}
		if (id == "barn" || id == "warehouse" || id == "harbor" || id == "mint" || id == "tradepost"){
			return this.resIcon("gold");
		}
		if (id == "mine" || id == "quarry" || id == "smelter" || id == "calciner" || id == "workshop" || id == "factory"){
			return this.resIcon("minerals");
		}
		if (id == "chapel" || id == "temple" || id == "ziggurat"){
			return this.resIcon("faith");
		}
		if (id == "juqi" || id == "zhujidan" || id == "qingxin" || mdl.type == "pill"){
			return this.resIcon("spice");
		}
		if (id.indexOf("vein") === 0){
			return this.resIcon("minerals");
		}
		if (id.indexOf("sect") === 0){
			return this.tileIcon("fate");
		}
		if (id.indexOf("_") > 0 || mdl.type == "realm"){
			return this.resIcon("xiuwei");
		}
		return this.resIcon("xiuwei");
	}
};
