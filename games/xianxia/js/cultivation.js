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
	pillToxicity: 0,		//0..100 经脉丹毒淤积——服猛药累积,过高压制吐纳与破境,可借周天洗髓或净心丹祛除
	cauldronFire: "gentle",	//三昧控火: gentle(文火温养) | fierce(武火催丹) | azure(乾蓝灵火)
	alchemyExp: 0,			//丹道造诣熟练度——开炉炼丹累积,晋升五阶丹师解锁耗材减免与万产加成
	supremePills: null,		//{juqi:0,...} ✦丹纹灵丹库存——乾蓝灵火或掌天绿液淬出,药效+40%且丹毒减半
	pillCraftCount: null,	//{juqi:0,...} 本世各丹开炉计数——用于丹方药材动态温和递进
	lastAlchemyNote: null,	//玄天丹鼎最近一次开炉/服丹/洗髓纪要
	herbGarden: null,		//XX-4 仙界洞府·聚灵药园状态
	xianqi: null,			//XX-4 本命仙器蕴养祭炼状态
	immortalImprint: 0,		//XX-4 跨轮回仙界洞府与本命仙器道印(0..10)
	xianqiImprintKey: null,	//前世祭炼之本命仙器道胎印记
	starArray: null,		//XX-5 周天星斗护山大阵状态
	immortalBounty: null,	//XX-5 跨界仙盟奇遇悬赏状态
	starImprintTier: 0,		//XX-5 跨轮回周天阵印最高推演阶数(0..6)
	spiritNursery: null,	//XX-6 混沌万灵仙宠育兽苑状态
	daoSteleForest: null,	//XX-6 大道法则碑林参悟状态
	beastImprintTier: 0,	//XX-6 跨轮回万灵兽印最高血脉阶数(0..6)
	starship: null,			//XX-7 诸天星域游历飞舟·太虚星槎状态
	hongmengAltar: null,	//XX-7 混沌鸿蒙灵宝祭坛状态
	hongmengImprintTier: 0,	//XX-7 跨轮回鸿蒙道印最高阶数(0..6)
	zixiaoAltar: null,		//XX-8 混沌紫霄讲道坛状态
	dharmaIdols: null,		//XX-8 三千大道神通法相状态
	dharmaImprintTier: 0,	//XX-8 跨轮回法相道印最高阶数(0..6)
	daoSutras: 0,			//XX-8 三千大道玉简同步镜像

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
	COMBAT_BASE: [2, 25, 100, 400, 1600, 6400, 25000, 100000, 400000, 1600000, 6400000],
	REALM_DEFS: [
		//lianqi layers are guaranteed successes — the onboarding slope
		//xiuwei costs are tuned against simulate-cultivation.js: each layer should
		//read as a rising wall (minutes→hours by realm), never a stall
		//一境一核心灵材 (One Signature Key Resource per Major Realm):
		//  炼气=灵木(wood) | 筑基=灵石(minerals) | 结丹=金精(gold) | 元婴=典籍(science)
		//  化神=愿力(faith)| 炼虚=太虚仙金(unobtainium) | 合体=上古遗宝(relic) | 大乘/渡劫=岁月仙晶(timeCrystal)
		//gate — 大境界门槛:首层突破除修为/核心灵材外还需一道大关
		//  {riftFloor:N}   需通关上古秘境第N层——历生死之险,道基方凝
		{key:"lianqi",  layers:10, base:{xiuwei:45},                       mul:1.45, bonus:0.006, chance:1.0,  life:80,     keyRes:"wood"},
		{key:"zhuji",   layers:3,  base:{xiuwei:3200, minerals:220},       mul:1.60, bonus:0.02,  chance:0.55, life:200,    keyRes:"minerals"},
		{key:"jiedan",  layers:3,  base:{xiuwei:18000, gold:150},          mul:1.58, bonus:0.045, chance:0.48, life:500,    keyRes:"gold",        gate:{riftFloor:3}},
		{key:"yuanying",layers:3,  base:{xiuwei:72000, science:2800},      mul:1.52, bonus:0.10,  chance:0.42, life:1200,   keyRes:"science",     gate:{riftFloor:6}},
		{key:"huashen", layers:3,  base:{xiuwei:280000, faith:2200},       mul:1.48, bonus:0.20,  chance:0.36, life:3200,   keyRes:"faith",       gate:{riftFloor:9}},
		{key:"lianxu",  layers:3,  base:{xiuwei:820000, unobtainium:50},   mul:1.52, bonus:0.35,  chance:0.30, life:8000,   keyRes:"unobtainium", gate:{riftFloor:12}},
		{key:"heti",    layers:3,  base:{xiuwei:2600000, relic:20},        mul:1.60, bonus:0.60,  chance:0.25, life:20000,  keyRes:"relic",       gate:{riftFloor:15}},
		{key:"dacheng", layers:3,  base:{xiuwei:7200000, timeCrystal:15},   mul:1.50, bonus:1.00,  chance:0.20, life:60000,  keyRes:"timeCrystal", gate:{riftFloor:20}},
		{key:"dujie",   layers:1,  base:{xiuwei:24000000, timeCrystal:50},  mul:1,    bonus:1.60,  chance:0.10, life:100000, keyRes:"timeCrystal", gate:{riftFloor:25}},
		{key:"zhenxian",layers:3,  base:{xiuwei:85000000, xianyuan:35},     mul:1.65, bonus:2.80,  chance:0.16, life:300000, keyRes:"xianyuan",    gate:{riftFloor:25, immortal:true}},
		{key:"jinxian", layers:3,  base:{xiuwei:320000000, xianyuan:180},   mul:1.75, bonus:5.00,  chance:0.12, life:900000, keyRes:"xianyuan",    gate:{riftFloor:30, immortal:true}}
	],

	//四座共享储灵建筑 — 每 2~3 种有上限的核心灵材共享一座提升上限的储灵建筑
	SHARED_STORAGE_BLDS: [
		{ name: "barn",        realm: "zhuji",    resources: ["catnip", "wood", "minerals"] },
		{ name: "academy",     realm: "yuanying", resources: ["gold", "science"] },
		{ name: "mansion",     realm: "lianxu",   resources: ["faith", "unobtainium"] },
		{ name: "observatory", realm: "dacheng",  resources: ["relic", "timeCrystal"] }
	],

	//九境万法同源矩阵 — 每一个大修为境界严格只保留 1 种核心灵材（1座专属产出建筑），每 2~3 种灵材共享 1 座储灵上限建筑
	REALM_SYNERGY: [
		{
			realmIdx: 0,
			key: "lianqi",
			stageKey: "lianqi_0",
			title: "炼气期",
			shortTitle: "炼气",
			res: "wood",
			resTitle: "灵木",
			resBadge: "炼气核",
			resDesc: "辟百亩灵田，筑神手竹庐与太岳石室，凝练灵木立下长生根基",
			coreBlds: ["field", "hut", "logHouse"],
			auxBlds: ["pasture", "lumberMill"],
			techs: ["calendar", "agriculture", "archery"],
			crafts: ["wood"],
			upgrades: []
		},
		{
			realmIdx: 1,
			key: "zhuji",
			stageKey: "zhuji_0",
			title: "筑基期",
			shortTitle: "筑基",
			res: "minerals",
			resTitle: "灵石",
			resBadge: "筑基核",
			resDesc: "勘破地肺灵石矿脉，立须弥宝库（灵谷/灵木/灵石共享上限），凝铸道基",
			coreBlds: ["mine", "barn"],
			auxBlds: ["workshop", "aqueduct", "warehouse"],
			techs: ["mining", "metal", "animal", "construction", "math", "engineering", "currency"],
			crafts: ["beam", "slab"],
			upgrades: ["mineralHoes", "mineralAxes", "bolas", "ironHoes", "ironAxes", "reinforcedSaw", "stoneBarns", "reinforcedBarns", "advancedRefinement", "compositeBow", "celestialMechanics", "huntingArmor", "prospecting"]
		},
		{
			realmIdx: 2,
			key: "jiedan",
			stageKey: "jiedan_0",
			title: "结丹期",
			shortTitle: "结丹",
			res: "gold",
			resTitle: "金精",
			resBadge: "结丹核",
			resDesc: "地火炼器室淬炼金精，铸就九品金丹大道",
			coreBlds: ["smelter"],
			auxBlds: ["tradepost", "amphitheatre", "unicornPasture", "harbor", "quarry"],
			techs: ["writing", "philosophy", "steel", "machinery", "theology"],
			crafts: [],
			upgrades: ["goldOre", "register", "steelAxe", "steelSaw", "steelArmor", "reinforcedWarehouses", "crossbow", "printingPress", "factoryAutomation", "combustionEngine", "caravanserai", "cargoShips"]
		},
		{
			realmIdx: 3,
			key: "yuanying",
			stageKey: "yuanying_0",
			title: "元婴期",
			shortTitle: "元婴",
			res: "science",
			resTitle: "悟道典籍",
			resBadge: "元婴核",
			resDesc: "立藏经阁参悟周天典籍，辟大衍神机阁（金精/悟道典籍共享上限），碎丹成婴",
			coreBlds: ["library", "academy"],
			auxBlds: ["steamworks", "calciner", "oilWell", "mint", "brewery"],
			techs: ["astronomy", "navigation", "architecture", "physics", "chemistry", "biology", "biochemistry", "archeology", "electricity"],
			crafts: [],
			upgrades: ["titaniumAxe", "titaniumSaw", "alloyAxe", "alloySaw", "titaniumBarns", "alloyBarns", "silos", "titaniumWarehouses", "alloyWarehouses", "barges", "astrolabe", "titaniumMirrors", "geodesy", "miningDrill", "railgun"]
		},
		{
			realmIdx: 4,
			key: "huashen",
			stageKey: "huashen_0",
			title: "化神期",
			shortTitle: "化神",
			res: "faith",
			resTitle: "大道香火",
			resBadge: "化神核",
			resDesc: "筑太古玄坛，聚九天香火愿力元神化道",
			coreBlds: ["temple"],
			auxBlds: ["biolab", "chapel", "factory", "ziggurat"],
			techs: ["industrialization", "mechanization", "metalurgy", "combustion", "ecology", "acoustics", "drama"],
			crafts: [],
			upgrades: ["concreteBarns", "concreteWarehouses", "oilRefinery", "pumpjack", "biofuel", "petri", "factoryLogistics", "offsetPress", "uplink", "starlink", "electrolyticSmelting", "oxidation", "rotaryKiln", "fluidizedReactors", "carbonSequestration"]
		},
		{
			realmIdx: 5,
			key: "lianxu",
			stageKey: "lianxu_0",
			title: "炼虚期",
			shortTitle: "炼虚",
			res: "unobtainium",
			resTitle: "太虚仙金",
			resBadge: "炼虚核",
			resDesc: "布乾蓝地火阵萃取太虚仙金，辟天星洞府（大道香火/太虚仙金共享上限）",
			coreBlds: ["reactor", "mansion"],
			auxBlds: ["magneto", "ivoryTemple"],
			techs: ["nuclearFission", "rocketry", "oilProcessing", "electronics", "orbitalEngineering", "sattelites"],
			crafts: [],
			upgrades: ["unobtainiumAxe", "unobtainiumSaw", "unobtainiumReflectors", "thoriumReactors", "enrichedUranium", "coldFusion", "nuclearPlants", "neuralNetworks", "aiBases", "aiEngineers", "spaceManufacturing", "augumentation", "photolithography", "cryocomputing", "machineLearning"]
		},
		{
			realmIdx: 6,
			key: "heti",
			stageKey: "heti_0",
			title: "合体期",
			shortTitle: "合体",
			res: "relic",
			resTitle: "上古遗宝",
			resBadge: "合体核",
			resDesc: "运转元磁极光阵贯通古今，凝练上古遗宝天人合体",
			coreBlds: ["accelerator"],
			auxBlds: ["zebraOutpost", "zebraWorkshop", "zebraForge"],
			techs: ["nanotechnology", "superconductors", "particlePhysics", "dimensionalPhysics", "exogeology", "advExogeology", "thorium"],
			crafts: [],
			upgrades: ["eludiumCracker", "eludiumReflectors", "mWReactor", "lhc", "energyRifts", "amReactors", "amBases", "amDrive", "relicStation", "freightfulExchange", "transportSuperposition"]
		},
		{
			realmIdx: 7,
			key: "dacheng",
			stageKey: "dacheng_0",
			title: "大乘期",
			shortTitle: "大乘",
			res: "timeCrystal",
			resTitle: "岁月仙晶",
			resBadge: "大乘核",
			resDesc: "祭起真言轮回盘凝岁月仙晶，立浑天观星台（上古遗宝/岁月仙晶共享上限）",
			coreBlds: ["chronosphere", "observatory"],
			auxBlds: ["aiCore", "stasisPod"],
			techs: ["chronophysics", "tachyonTheory", "cryptotheology", "voidSpace", "paradoxalKnowledge"],
			crafts: [],
			upgrades: ["stasisChambers", "voidEnergy", "darkEnergy", "tachyonAccelerators", "chronoforge", "fluxCondensator", "chronoEngineers", "tachyonModerator", "voidAspiration", "distorsion", "turnSmoothly", "invisibleBlackHand"]
		},
		{
			realmIdx: 8,
			key: "dujie",
			stageKey: "dujie_0",
			title: "渡劫期",
			shortTitle: "渡劫",
			res: "timeCrystal",
			resTitle: "岁月仙晶",
			resBadge: "渡劫核",
			resDesc: "参透先天太易大道，以岁月仙晶逆天改命，渡九天雷劫飞升",
			coreBlds: [],
			auxBlds: [],
			techs: ["metaphysics", "artificialGravity", "terraformation", "hydroponics", "exogeophysics", "antimatter", "blackchain", "quantumCryptography"],
			crafts: [],
			upgrades: ["longRangeSpaceships", "spiceNavigation", "thoriumEngine"]
		},
		{
			realmIdx: 9,
			key: "zhenxian",
			stageKey: "zhenxian_0",
			title: "真仙期",
			shortTitle: "真仙",
			res: "xianyuan",
			resTitle: "仙元",
			resBadge: "真仙核",
			resDesc: "渡九九紫霄雷劫破界飞升，脱尽凡胎引九天仙灵化为仙元，与天地同寿",
			coreBlds: [],
			auxBlds: [],
			techs: [],
			crafts: [],
			upgrades: []
		},
		{
			realmIdx: 10,
			key: "jinxian",
			stageKey: "jinxian_0",
			title: "金仙期",
			shortTitle: "金仙",
			res: "xianyuan",
			resTitle: "仙元",
			resBadge: "金仙核",
			resDesc: "参悟诸天法则道韵，凝铸万劫不磨的不朽金仙道果",
			coreBlds: [],
			auxBlds: [],
			techs: [],
			crafts: [],
			upgrades: []
		}
	],

	//spiritual roots, rolled per life
	//《凡人修仙传》原著法则:
	//多灵根(伪灵根/三灵根)五行驳杂,平时吐纳慢、破境消耗高(priceMult > 1),
	//但五脏同淬、兼修多系神通(如《三转重元功》《青元剑诀》),同境界法力浑厚、战力更高(combatMult > 1);
	//单灵根/异灵根(天灵根/异灵根)生而近道,吐纳极快、破境消耗低(priceMult < 1),
	//但顺风顺水未历生死磨砺,同境界战力反而略逊(combatMult < 1)。
	ROOTS: [
		{key:"wei",  weight:30, xiuweiMult:0.65, priceMult:1.35, combatMult:1.35},
		{key:"san",  weight:30, xiuweiMult:1.0,  priceMult:1.15, combatMult:1.18},
		{key:"zhen", weight:20, xiuweiMult:1.5,  priceMult:1.0,  combatMult:1.0},
		{key:"yi",   weight:12, xiuweiMult:1.8,  priceMult:0.90, combatMult:0.95},
		{key:"tian", weight:8,  xiuweiMult:2.5,  priceMult:0.80, combatMult:0.85}
	],

	//玄天丹鼎 · 三昧控火法门: 决定开炉炼丹的火候特性与服丹丹毒减免
	CAULDRON_FIRES: [
		{
			key: "gentle",
			label: "☯ 文火温养",
			tag: "丹毒-30% · 造诣×1.5",
			desc: "慢火温养百草灵液，药性醇和：开炉获 1.5 倍丹道造诣并顺带化解 4 点丹毒；服丹时产生的丹毒减少 30%。"
		},
		{
			key: "fierce",
			label: "✦ 武火催丹",
			tag: "35%~55% 一炉双丹",
			desc: "引地肺赤炎猛催药力：开炉有 35%（随丹道造诣最高达 55%）概率触发【一炉双丹】，单份药材凝成 2 枚灵丹！"
		},
		{
			key: "azure",
			label: "◈ 乾蓝灵火",
			tag: "30%~50% 凝出丹纹",
			desc: "借乾蓝冰焰与青莲地火交融淬髓：开炉有 30%（随丹道造诣最高达 50%）概率凝成【✦丹纹灵丹】，服之药效与时长 +40%、丹毒减半！"
		}
	],

	//五阶丹道造诣: 随开炉次数晋升,解锁耗材减免、暴击率、丹毒代谢与常驻修为/万产加成
	ALCHEMY_RANKS: [
		{rank: 1, minExp: 0,  title: "一阶 · 凡火学徒", costMult: 1.00, critBonus: 0.00, detoxMult: 1.0, xiuweiRatio: 0,    realmProductionRatio: 0,    desc: "初掌药理，开启玄天丹鼎三昧控火"},
		{rank: 2, minExp: 6,  title: "二阶 · 控火丹童", costMult: 0.90, critBonus: 0.05, detoxMult: 1.2, xiuweiRatio: 0,    realmProductionRatio: 0,    desc: "开炉耗材 -10% · 双丹/丹纹率 +5% · 丹毒代谢 +20%"},
		{rank: 3, minExp: 18, title: "三阶 · 灵丹妙手", costMult: 0.85, critBonus: 0.10, detoxMult: 1.5, xiuweiRatio: 0.06, realmProductionRatio: 0,    desc: "耗材 -15% · 双丹/丹纹率 +10% · 丹毒代谢 +50% · 修为吐纳 +6%"},
		{rank: 4, minExp: 40, title: "四阶 · 金鼎丹王", costMult: 0.80, critBonus: 0.15, detoxMult: 1.8, xiuweiRatio: 0.14, realmProductionRatio: 0.06, desc: "耗材 -20% · 双丹/丹纹率 +15% · 修为吐纳 +14% · 洞府万产 +6%"},
		{rank: 5, minExp: 80, title: "五阶 · 玄天丹圣", costMult: 0.75, critBonus: 0.20, detoxMult: 2.2, xiuweiRatio: 0.25, realmProductionRatio: 0.12, desc: "耗材 -25% · 双丹/丹纹率 +20% · 修为吐纳 +25% · 洞府万产 +12%"}
	],

	//pills — 真道具:先炼制入库(val++),再服用消耗(val--)。效果在 usePill()
	//unlock(c) 决定该丹何时现形——丹方不悟自现,按修行进境渐次解锁
	pills: [{
		name: "juqi",
		label: $I("cultivation.pill.juqi.label"),
		description: $I("cultivation.pill.juqi.desc"),
		tier: "一品·吐纳",
		role: "周天增幅",
		toxicity: 18,
		maxRealmIdx: 2,
		effectSummary: "5分钟内修为吐纳 +65%~100%（结丹后凡丹产生境界抗药性；✦丹纹灵丹无视衰减且持续7分钟）",
		unlock: function(c){ return c.getStage("lianqi_2").researched; },
		prices: [{name:"catnip", val:120}, {name:"wood", val:8}],
		val: 0
	},{
		name: "zhujidan",
		label: $I("cultivation.pill.zhujidan.label"),
		description: $I("cultivation.pill.zhujidan.desc"),
		tier: "二品·破障",
		role: "筑基冲关",
		toxicity: 26,
		maxRealmIdx: 2,
		effectSummary: "下次冲关破境成功率相对提升 +50%（✦丹纹灵丹额外涤除 8 点心魔）",
		unlock: function(c){ return c.getStage("lianqi_8").researched; },
		prices: [{name:"catnip", val:300}, {name:"wood", val:120}],
		val: 0
	},{
		name: "qingxin",
		label: $I("cultivation.pill.qingxin.label"),
		description: $I("cultivation.pill.qingxin.desc"),
		tier: "二品·祛毒",
		role: "涤魔清脉",
		toxicity: -18,
		maxRealmIdx: 8,
		effectSummary: "立消 15 点心魔，并涤荡经脉 18 点丹毒（✦丹纹灵丹消 24 心魔、祛 28 丹毒）",
		unlock: function(c){ return c.getStage("zhuji_0").researched; },
		prices: [{name:"wood", val:60}, {name:"minerals", val:400}],
		val: 0
	},{
		name: "jiangchen",
		label: $I("cultivation.pill.jiangchen.label"),
		description: $I("cultivation.pill.jiangchen.desc"),
		tier: "三品·冲关",
		role: "结丹护道",
		toxicity: 24,
		maxRealmIdx: 5,
		effectSummary: "破境率 +25%（上限+65%），且5分钟内修为吐纳 +35%（✦丹纹灵丹破境+35%且持续7分钟）",
		unlock: function(c){ return c.getStage("jiedan_0").researched; },
		prices: [{name:"minerals", val:300}, {name:"gold", val:150}],
		val: 0
	},{
		name: "peiying",
		label: $I("cultivation.pill.peiying.label"),
		description: $I("cultivation.pill.peiying.desc"),
		tier: "四品·涤魂",
		role: "固元净脉",
		toxicity: -35,
		maxRealmIdx: 8,
		effectSummary: "瞬间平息破境余威震荡，净除 30 点心魔与 35 点丹毒（✦丹纹灵丹消 45 心魔、祛 50 丹毒）",
		unlock: function(c){ return c.getStage("yuanying_0").researched; },
		prices: [{name:"gold", val:200}, {name:"science", val:3500}],
		val: 0
	},{
		name: "biyan",
		label: $I("cultivation.pill.biyan.label"),
		description: $I("cultivation.pill.biyan.desc"),
		tier: "五品·圣药",
		role: "青莲万法",
		toxicity: 22,
		maxRealmIdx: 8,
		effectSummary: "5分钟内修为吐纳 +50%、洞府万产 +25%、斗法战力 ×1.35（✦丹纹圣酿持续7分钟且战力 ×1.45）",
		unlock: function(c){ return c.getStage("huashen_0").researched; },
		prices: [{name:"science", val:4000}, {name:"faith", val:2500}],
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
			grant: {xiuwei: 4, minerals: 8}
		},{
			key: "bide",	//隐忍不发
			grant: {xiuwei: 6}
		},{
			key: "wary",	//将信将疑——对温先生留了心眼
			grant: {xiuwei: 4, wood: 3}
		}]
	},{
		name: "bottle",
		label: $I("cultivation.fate.bottle.label"),
		researched: false,
		atStage: "lianqi_2",
		pages: 2,
		grant: {wood: 8, xiuwei: 6},		//初得凝露瓶即催熟灵木,恰可炼首炉聚气丹
		effects: {"catnipPerTickBase": 0.08}	//月露凝碧,药田自生——凝露瓶是命定之物
	},{
		name: "feiyu",
		label: $I("cultivation.fate.feiyu.label"),
		researched: false,
		atStage: "lianqi_4",
		pages: 2,
		effects: {},
		choices: [{
			key: "oath",	//义结金兰
			grant: {xiuwei: 8, wood: 5}
		},{
			key: "name",	//借其名行世——tale.feiyu
			grant: {xiuwei: 8, minerals: 15}
		},{
			key: "decline",	//仙凡殊途
			grant: {xiuwei: 12}
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
			grant: {xiuwei: 15, wood: 12},
			effects: {"xiuweiRatio": 0.05}
		},{
			key: "spare",	//擒而不杀——残魂囚于法器,结丹之期他将反扑
			grant: {xiuwei: 12, minerals: 25, wood: 15}
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
			grant: {xiuwei: 20, minerals: 35, wood: 20}
		},{
			key: "flee",	//携瓶夜遁
			grant: {xiuwei: 18, wood: 25}
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
			grant: {wood: 50, xiuwei: 35}
		},{
			key: "lurk",	//苟着采药——收获更丰,未识佳人
			grant: {relic: 2, minerals: 80, xiuwei: 25}
		}]
	},{
		//———— 苍梧山(筑基)————
		name: "qixuan",
		label: $I("cultivation.fate.qixuan.label"),
		researched: false,
		atStage: "zhuji_0",
		pages: 2,
		grant: {minerals: 40, xiuwei: 60},
		effects: {"xiuweiRatio": 0.10},
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
			grant: {xiuwei: 80},
			effects: {"xiuweiRatio": 0.05}
		},{
			key: "seed",	//收灵药种子——与凝露瓶相合
			grant: {wood: 40, catnip: 200},
			effects: {"catnipPerTickBase": 0.06}
		},{
			key: "wine",	//沽酒听书——星海传闻入耳
			grant: {xiuwei: 110, relic: 1}
		}]
	},{
		name: "fengyun",
		label: $I("cultivation.fate.fengyun.label"),
		researched: false,
		atStage: "zhuji_2",
		pages: 2,
		grant: {xiuwei: 90},
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
			key: "tame",	//镇而收之——以其毕生丹器造诣为己用
			effects: {"goldPerTickBase": 0.005}	//温先生的百炼器道,至此为你所用
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
		effects: {"sciencePerTickBase": 0.25}
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
			effects: {"mineralsPerTickBase": 0.12}
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
		baseEffects: {"mineralsPerTickBase": 0.15}	//风霆翼行万里寻宝
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
		prices: [{name:"unobtainium", val:40}, {name:"xiuwei", val:880000}],
		effects: {"xiuweiRatio": 0.95, "realmProductionRatio": 0.28},
		chance: 1.0, researched: false
	},{
		name: "sect7",
		label: $I("cultivation.sect.7.label"),
		description: $I("cultivation.sect.7.desc"),
		gate: "heti_0",
		prices: [{name:"relic", val:18}, {name:"xiuwei", val:2800000}],
		effects: {"xiuweiRatio": 1.35, "realmProductionRatio": 0.38, "zhenyuanRatio": 0.20, "riftDamageRatio": 0.18},
		chance: 1.0, researched: false
	},{
		name: "sect8",
		label: $I("cultivation.sect.8.label"),
		description: $I("cultivation.sect.8.desc"),
		gate: "dacheng_0",
		prices: [{name:"timeCrystal", val:12}, {name:"xiuwei", val:7800000}],
		effects: {"xiuweiRatio": 1.85, "realmProductionRatio": 0.52, "zhenyuanRatio": 0.35, "riftDamageRatio": 0.30},
		chance: 1.0, researched: false
	},{
		name: "sect9",
		label: $I("cultivation.sect.9.label"),
		description: $I("cultivation.sect.9.desc"),
		gate: "dujie_0",
		prices: [{name:"timeCrystal", val:45}, {name:"xiuwei", val:26000000}],
		effects: {"xiuweiRatio": 2.60, "realmProductionRatio": 0.72, "zhenyuanRatio": 0.50, "riftDamageRatio": 0.45},
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
	WANDER_PAY: 0.04,		//游历机缘(基础必得吐纳 + 奇遇大成)
	RIFT_PAY: 0.015,		//秘境一行
	AMBUSH_PAY: 0.012,		//反杀劫修的缴获
	GRIFT_PAY: 0.08,		//大秘境破关
	GRIFT_FAIL_PAY: 0.025,	//大秘境败退亦有所得
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
				var mult = c.getBreakCostMult ? c.getBreakCostMult() : ((c.getRoot() && c.getRoot().priceMult) || 1);
				for (var i = 0; i < prices.length; i++){
					if (prices[i].name == "xiuwei"){ return [g.resPool.get("xiuwei").value, prices[i].val * mult]; }
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
	//凡人阶段(gather/field/refine)尚未引气入体,唯赐凡俗草木;筑起【神手竹庐】(hut)引气入体后方赐第一缕修为!
	GUIDE_REWARDS: {
		gather:   {catnip: 8},
		field:    {catnip: 12},
		refine:   {wood: 2},
		hut:      {xiuwei: 5, wood: 1},
		break2:   {xiuwei: 4, minerals: 6},
		wander:   {xiuwei: 5, wood: 2},
		seclude:  {xiuwei: 6, minerals: 10},
		zhuji:    {xiuwei: 40, minerals: 25},
		rift:     {xiuwei: 60, minerals: 30},
		grift:    {xiuwei: 90, gold: 25}
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

	//出身 — 开局择一,每个出身皆具鲜明【增益】与【减益】,折射凡尘来路对仙途的深刻烙印。
	//effects 走 effectsBase 常驻管线, powerMult/chanceBonus/breakCostMult/lifespanMult 由 manager 消费。
	ORIGINS: [
		{
			key: "farmer",
			effects: {catnipRatio: 0.25, woodRatio: 0.15, scienceRatio: -0.10},
			lifespanMult: 1.15,
			powerMult: 0.90
		},
		{
			key: "hunter",
			effects: {hunterRatio: 0.25, mineralsRatio: 0.15, xiuweiRatio: -0.10},
			powerMult: 1.20,
			chanceBonus: -0.04
		},
		{
			key: "scholar",
			effects: {scienceRatio: 0.25, xiuweiRatio: 0.15, mineralsRatio: -0.10},
			chanceBonus: 0.04,
			powerMult: 0.88
		},
		{
			key: "trader",
			effects: {mineralsRatio: 0.25, goldRatio: 0.20, xiuweiRatio: -0.10},
			breakCostMult: 0.90,
			powerMult: 0.92
		},
		{
			key: "orphan",
			effects: {xiuweiRatio: 0.08, realmProductionRatio: -0.10},
			chanceBonus: 0.08,
			powerMult: 1.12,
			breakCostMult: 1.10
		}
	],

	//XX-3 轮回重修「先天命格 / 特殊灵体」多周目 Build 词条池(≥8 种差异化流派,随轮回世数/功德解锁 1~3 槽)
	MINGGE_DEFS: [
		{
			key: "dandao",
			label: "丹道圣体",
			tag: "丹毒减半·双丹造诣",
			art: "alchemy",
			desc: "服丹经脉丹毒累积减半(×0.50)；开炉炼丹 55% 几率额外多成 1 丹且丹道造诣翻倍；灵谷产出 +20%",
			effects: {catnipRatio: 0.20}
		},
		{
			key: "jiangu",
			label: "剑骨通明",
			tag: "剑心暴击·反震破招",
			art: "sword",
			desc: "斗法总战力 ×1.28；秘境回合斗法 35% 触发【剑心通明】暴击(×1.65 伤)；【太极反震】破招伤害 +75%",
			effects: {}
		},
		{
			key: "changsheng",
			label: "长生道胎",
			tag: "寿元绵长·道心澄明",
			art: "longevity",
			desc: "全境界寿元上限 +60%；心魔与丹毒自然消退翻倍(×2.0)；闭关吐纳时额外获得修为速率 +25%",
			effects: {}
		},
		{
			key: "qiyun",
			label: "气运之子",
			tag: "游历翻倍·逢凶化吉",
			art: "wheel",
			desc: "红尘游历修为与灵材收获翻倍(×2.0)且免疫劫修伏击(反夺灵石修为)；秘境探幽秘境令与古宝掉率 +25%",
			effects: {}
		},
		{
			key: "baiyi",
			label: "百艺宗师",
			tag: "器阵双绝·百工造化",
			art: "alchemy",
			desc: "炼器百工打造效率 +45%(craftRatio)；琅嬛书阁推演感悟 +25%；黄金与玄铁产出 +20%",
			effects: {craftRatio: 0.45, scienceRatio: 0.25, goldRatio: 0.20, ironRatio: 0.20}
		},
		{
			key: "tianling",
			label: "鸿蒙道体",
			tag: "破境天成·道基稳固",
			art: "wheel",
			desc: "大境界突破成功率额外 +8%；破境消耗 -15%；破境后【道基震荡】平复年限缩短一半；修为吐纳 +15%",
			effects: {xiuweiRatio: 0.15}
		},
		{
			key: "xuanmai",
			label: "太初灵脉体",
			tag: "洞天福地·万物滋长",
			art: "longevity",
			desc: "洞府境界全局产出 +25%；灵谷、灵木、灵石、黄金基础产出各 +30%",
			effects: {realmProductionRatio: 0.25, catnipRatio: 0.30, woodRatio: 0.30, mineralsRatio: 0.30, goldRatio: 0.30}
		},
		{
			key: "huanggu",
			label: "荒古战躯",
			tag: "不灭金身·气血自愈",
			art: "sword",
			desc: "斗法总战力 ×1.20；秘境斗法最大气血 +45%、护体防御 +35%，每回合初自愈 4% 最大气血",
			effects: {}
		},
		{
			key: "zhenyan",
			label: "宙光星瞳",
			tag: "调息缩减·岁首双露",
			art: "wheel",
			desc: "游历/闭关/秘境共享调息冷却缩短 25%；岁首凝露瓶绿液凝聚额外 +1 滴；修为与香火愿力各 +18%",
			effects: {xiuweiRatio: 0.18, faithRatio: 0.18}
		}
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

	getOriginDesc: function(){
		var o = this.getOrigin();
		if (!o){ return ""; }
		var k = "identity.origin." + o.key;
		return $I(k + ".desc");
	},

	//破境消耗倍率: 灵根底子(伪灵根多系同修×1.35 / 天灵根一脉通明×0.80) × 出身加成(商贾×0.90 / 遗孤×1.10) × 鸿蒙道体(×0.85)
	getBreakCostMult: function(){
		var rootMult = (this.getRoot() && this.getRoot().priceMult) || 1;
		var origin = this.getOrigin();
		var originMult = (origin && origin.breakCostMult) || 1;
		var mgMult = this.hasMingge("tianling") ? 0.85 : 1;
		return rootMult * originMult * mgMult;
	},

	getMinggeDef: function(key){
		for (var i = 0; i < this.MINGGE_DEFS.length; i++){
			if (this.MINGGE_DEFS[i].key === key){ return this.MINGGE_DEFS[i]; }
		}
		return null;
	},

	hasMingge: function(key){
		if (!this.mingge || !this.mingge.length){ return false; }
		for (var i = 0; i < this.mingge.length; i++){
			if (this.mingge[i] === key){ return true; }
		}
		return false;
	},

	getMinggeSlotCap: function(forNextLife){
		var lives = this.getPastLives() + (forNextLife ? 1 : 0);
		var karmaRes = (this.game && this.game.resPool) ? this.game.resPool.get("karma") : null;
		var karma = karmaRes ? (karmaRes.value || 0) : 0;
		var cap = 1;
		if (lives >= 3 || karma >= 8){ cap = 2; }
		if (lives >= 6 || karma >= 25){ cap = 3; }
		return cap;
	},

	normalizeMinggeList: function(list, maxSlots){
		var cap = (typeof maxSlots === "number" && maxSlots > 0) ? maxSlots : 3;
		var out = [];
		if (!list || !list.length){ return out; }
		for (var i = 0; i < list.length; i++){
			var k = list[i];
			if (!this.getMinggeDef(k)){ continue; }
			var dup = false;
			for (var j = 0; j < out.length; j++){
				if (out[j] === k){ dup = true; break; }
			}
			if (!dup){
				out.push(k);
				if (out.length >= cap){ break; }
			}
		}
		return out;
	},

	setMingge: function(keys){
		this.mingge = this.normalizeMinggeList(keys, 3);
		this.applyOrigin();
		if (this.game && this.game.updateCaches){ this.game.updateCaches(); }
		return this.mingge;
	},

	setPendingMingge: function(keys){
		var cap = this.getMinggeSlotCap(true);
		this.pendingMingge = this.normalizeMinggeList(keys, cap);
		return this.pendingMingge;
	},

	togglePendingMingge: function(key){
		if (!this.getMinggeDef(key)){ return false; }
		var cap = this.getMinggeSlotCap(true);
		var cur = this.normalizeMinggeList(this.pendingMingge || [], cap);
		for (var i = 0; i < cur.length; i++){
			if (cur[i] === key){
				cur.splice(i, 1);
				this.pendingMingge = cur;
				return true;
			}
		}
		if (cur.length >= cap){
			if (cap === 1){
				cur = [key];
				this.pendingMingge = cur;
				return true;
			}
			return false;
		}
		cur.push(key);
		this.pendingMingge = cur;
		return true;
	},

	getActiveMinggeDefs: function(){
		var out = [];
		if (!this.mingge || !this.mingge.length){ return out; }
		for (var i = 0; i < this.mingge.length; i++){
			var d = this.getMinggeDef(this.mingge[i]);
			if (d){ out.push(d); }
		}
		return out;
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
	//但键名得先在 effectsCachedExisting 白名单里,出身与先天命格键在此一并补注册
	applyOrigin: function(){
		var def = this.getOrigin();
		var base = (def && def.effects) ? dojo.clone(def.effects) : {};
		var mgs = this.getActiveMinggeDefs();
		for (var i = 0; i < mgs.length; i++){
			var eff = mgs[i].effects;
			if (!eff){ continue; }
			for (var k in eff){
				base[k] = (base[k] || 0) + eff[k];
			}
		}
		this.effectsBase = base;
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
		this.battle = null;
		this.pillToxicity = 0;
		this.cauldronFire = "gentle";
		this.alchemyExp = 0;
		this.supremePills = {};
		this.pillCraftCount = {};
		this.lastAlchemyNote = null;
		this.immortalAscended = false;
		this.mingge = [];
		this.pendingMingge = [];
		this.daoyun = 0;
		this.immortalImprint = 0;
		this.xianqiImprintKey = null;
		this.starImprintTier = 0;
		this.beastImprintTier = 0;
		this.hongmengImprintTier = 0;
		this.dharmaImprintTier = 0;
		this.daoSutras = 0;
		this.herbGarden = this.makeDefaultHerbGarden();
		this.xianqi = this.makeDefaultXianqi();
		this.starArray = this.makeDefaultStarArray();
		this.immortalBounty = this.makeDefaultImmortalBounty();
		this.spiritNursery = this.makeDefaultSpiritNursery();
		this.daoSteleForest = this.makeDefaultDaoSteleForest();
		this.starship = this.makeDefaultStarship();
		this.hongmengAltar = this.makeDefaultHongmengAltar();
		this.zixiaoAltar = this.makeDefaultZixiaoAltar();
		this.dharmaIdols = this.makeDefaultDharmaIdols();
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
		this.normalizeRealmPrices();
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
					if (r == 0 && i == 0){ continue; }	//炼气一层 is the free starting stage
					if (((r >= 1 && r <= 7) || r == 9) && i == 0 && res != "xiuwei"){
						//大境界初破(初期 _0): 破入新境方才解锁本境核心灵材自生(含真仙初期凝练仙体始生仙元);
						//故初入大境唯验修为道行与秘境/飞升大关,本境核心灵材自中期(_1)、后期(_2)起正式入药淬炼,消除死锁!
						continue;
					}
					var expIdx = (((r >= 1 && r <= 7) || r == 9) && res != "xiuwei") ? (i - 1) : i;
					var val = def.base[res] * Math.pow(def.mul, expIdx);
					val = this.roundNice(val);
					prices.push({name: res, val: val});
				}
				if (r == 0 && i >= 4){
					//一境一核心灵材: 炼气期全程唯以【灵木(wood)】为破境核心灵材
					prices.push({name: "wood", val: this.roundNice(25 * Math.pow(1.65, i - 4))});
				}
				var stEffects = {
					"realmProductionRatio": def.bonus,
					"realmStorageRatio": (r == 0 && i == 0) ? 0 : def.bonus * 2.0,
					"xiuweiRatio": def.bonus * 0.35,
					"xiuweiPerTickBase": (r == 0 && i == 0) ? 0 : def.bonus,
					"combatPower": this.COMBAT_BASE[r] * (1 + i * 0.5)
				};
				if (r >= 9){
					stEffects["xianyuanPerTickBase"] = (r == 9 ? 0.08 : 0.25) * (1 + i * 0.5);
				}
				stages.push({
					name: def.key + "_" + i,
					realm: def.key,
					label: (def.layers > 1) ? realmLabel + "·" + $I("cultivation.layer." + layerKey) : realmLabel,
					description: $I("cultivation.realm." + def.key + ".desc"),
					prices: prices,
					effects: stEffects,
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

	getRootDesc: function(){
		var k = "cultivation.root." + this.getRoot().key;
		return $I(k + ".desc");
	},

	getRootSummary: function(){
		var r = this.getRoot();
		var xwPct = Math.round((r.xiuweiMult - 1) * 100);
		var costPct = Math.round(((r.priceMult || 1) - 1) * 100);
		var cpPct = Math.round(((r.combatMult || 1) - 1) * 100);
		var fmtSigned = function(v){ return (v >= 0 ? "+" : "") + v + "%"; };
		return "吐纳" + fmtSigned(xwPct) + " · 破境消耗" + fmtSigned(costPct) + " · 同阶战力" + fmtSigned(cpPct);
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
		var mortal = this.isMortal ? this.isMortal() : false;
		var sig = guide.done + "|" + (this._guideOpen ? "1|" : "0|") + (mortal ? "M|" : "I|");
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
		var mortalTag = mortal ? (" <span class=\"xx-mortal-chip\">" + $I("cultivation.mortal.chip") + "</span>") : "";
		var gh = "<div class=\"xx-guide-hd\">" +
			$I("cultivation.guide.title", [guide.done, guide.total]) +
			mortalTag +
			" <span class=\"xx-guide-toggle\">" + toggleTxt + "</span>" +
			" <span class=\"xx-guide-help\">" + $I("cultivation.guide.help") + "</span></div>" +
			"<div class=\"xx-guide-bar\"><i style=\"width:" +
				Math.round(guide.done / Math.max(1, guide.total) * 100) + "%\"></i></div>";
		if (mortal){
			gh += "<div class=\"xx-guide-mortal-note\">" + $I("cultivation.mortal.guide.note") + "</div>";
		}
		for (var i = 0; i < show; i++){
			var step = guide.pending[i];
			var pr = step.info ? step.info(this, this.game) : null;
			var isStepReady = !!(pr && pr[1] > 0 && pr[0] >= pr[1]);
			gh += "<div class=\"xx-guide-step" + (i == 0 ? " xx-guide-next" : "") + (isStepReady ? " is-ready" : "") + "\">" +
				$I("cultivation.guide." + step.key);
			var navTab = step.nav && this.game.getTab(step.nav.toLowerCase());
			if (navTab && navTab.visible){
				gh += " <span class=\"xx-guide-nav" + (isStepReady ? " is-ready" : "") + "\" data-tab=\"" + step.nav + "\">&gt; " + navTab.tabName + "</span>";
			}
			if (pr && pr[1] > 0){
				var progTxt = this.game.getDisplayValueExt(pr[0]) + "/" + this.game.getDisplayValueExt(pr[1]);
				gh += " <span class=\"xx-guide-prog" + (isStepReady ? " is-ready" : "") + "\">" +
					(isStepReady ? ("✦ 资粮已足 (" + progTxt + ")") : progTxt) + "</span>";
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

	getSect: function(name){
		return this.getMeta(name, this.sects);
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

	// ---------------- 凡人篇 · 凡胎肉身与引气入体 (Mortal Phase) ----------------
	//《凡人修仙传》之始: 初入七玄门神手谷时玩家尚为肉体凡胎,未习《长春功》引气入体,
	//故初始修为增长速度严格为 0; 唯有在山涧采药、辟田、凝木并筑起【神手竹庐】(或出门游历得仙缘)后,
	//方才感应天地灵气、正式踏上修仙长生路。
	isMortal: function(){
		if (this.getHighestStageIndex() > 0){ return false; }
		var huts = (this.game && this.game.bld && this.game.bld.get("hut")) ?
			(this.game.bld.get("hut").val || 0) : 0;
		if (huts > 0){ return false; }
		var xw = (this.game && this.game.resPool && this.game.resPool.get("xiuwei")) ?
			(this.game.resPool.get("xiuwei").value || 0) : 0;
		if (xw > 0){ return false; }
		if (this.stats && (this.stats.wander > 0 || this.stats.seclude > 0)){ return false; }
		if (this.secluded){ return false; }
		return true;
	},

	getMortalStatus: function(){
		var mortal = this.isMortal();
		var huts = (this.game && this.game.bld && this.game.bld.get("hut")) ? (this.game.bld.get("hut").val || 0) : 0;
		var fields = (this.game && this.game.bld && this.game.bld.get("field")) ? (this.game.bld.get("field").val || 0) : 0;
		var wood = (this.game && this.game.resPool && this.game.resPool.get("wood")) ? (this.game.resPool.get("wood").value || 0) : 0;
		var catnip = (this.game && this.game.resPool && this.game.resPool.get("catnip")) ? (this.game.resPool.get("catnip").value || 0) : 0;
		var stepIdx = 1;
		if (!mortal || huts > 0){ stepIdx = 4; }
		else if (wood >= 1){ stepIdx = 3; }
		else if (fields >= 1){ stepIdx = 2; }
		else if (catnip >= 5){ stepIdx = 2; }
		return {
			isMortal: mortal,
			step: stepIdx,
			label: mortal ? $I("cultivation.mortal.label") : this.getCurrentRealm().label,
			seal: mortal ? $I("cultivation.mortal.seal") : "炼",
			daoTitle: mortal ? $I("cultivation.mortal.daotitle") : this.getDaoTitle(),
			title: $I("cultivation.mortal.banner.title"),
			desc: $I("cultivation.mortal.banner.desc")
		};
	},

	renderMortalBanner: function(){
		if (!this.isMortal()){ return ""; }
		var st = this.getMortalStatus();
		var steps = [
			$I("cultivation.mortal.step.1"),
			$I("cultivation.mortal.step.2"),
			$I("cultivation.mortal.step.3"),
			$I("cultivation.mortal.step.4")
		];
		var trackHtml = "<div class=\"xx-mortal-track\">";
		for (var i = 0; i < steps.length; i++){
			var idx = i + 1;
			var cls = (idx < st.step) ? "done" : (idx === st.step ? "cur" : "todo");
			trackHtml += "<span class=\"xx-mortal-step " + cls + "\">" + steps[i] + "</span>";
		}
		trackHtml += "</div>";
		return "<div class=\"xx-mortal-banner\">" +
			"<div class=\"xx-mortal-hd\">" +
				"<span class=\"xx-mortal-badge\">" + $I("cultivation.mortal.badge") + "</span>" +
				"<span class=\"xx-mortal-title\">" + st.title + "</span>" +
				"<span class=\"xx-mortal-rate\">" + $I("cultivation.mortal.rate") + "</span>" +
			"</div>" +
			"<div class=\"xx-mortal-desc\">" + st.desc + "</div>" +
			trackHtml +
		"</div>";
	},

	//大关瓶颈——首层突破除材料外的第二道门(秘境历练层数)
	//(sect meta 另有 gate 字段是关卡名字符串,typeof 挡之)
	checkGate: function(stage){
		var g = stage.gate;
		if (!g || typeof g != "object"){ return {ok: true}; }
		if (g.immortal && !this.immortalAscended){
			return {ok: false, kind: "immortal", need: g.riftFloor || 25, have: this.riftFloor};
		}
		if (g.riftFloor == null){ return {ok: true}; }
		return {ok: this.riftFloor >= g.riftFloor, kind: "rift", need: g.riftFloor, have: this.riftFloor};
	},

	gateLabel: function(stage){
		var chk = this.checkGate(stage);
		if (chk.kind == "immortal"){
			return $I("cultivation.gate.immortal", [chk.need, chk.have]);
		}
		return $I("cultivation.gate.rift", [chk.need, chk.have]);
	},

	getCurrentRealmIndex: function(){
		var cur = this.getCurrentRealm();
		for (var i = 0; i < this.REALM_DEFS.length; i++){
			if (this.REALM_DEFS[i].key == cur.realm){ return i; }
		}
		return 0;
	},

	// ---------------- 九境同源 · 一境一核与全模块联动体系 ----------------

	getRealmSynergy: function(realmKeyOrIdx){
		if (realmKeyOrIdx === undefined || realmKeyOrIdx === null){
			return this.REALM_SYNERGY;
		}
		if (typeof realmKeyOrIdx === "number"){
			return this.REALM_SYNERGY[Math.max(0, Math.min(this.REALM_SYNERGY.length - 1, realmKeyOrIdx))];
		}
		for (var i = 0; i < this.REALM_SYNERGY.length; i++){
			if (this.REALM_SYNERGY[i].key === realmKeyOrIdx){
				return this.REALM_SYNERGY[i];
			}
		}
		return this.REALM_SYNERGY[0];
	},

	getCoreBuildings: function(){
		var list = [];
		for (var i = 0; i < this.REALM_SYNERGY.length; i++){
			var cb = this.REALM_SYNERGY[i].coreBlds;
			for (var j = 0; j < cb.length; j++){
				if (list.indexOf(cb[j]) === -1){ list.push(cb[j]); }
			}
		}
		return list;
	},

	isCoreBuilding: function(bldName){
		for (var i = 0; i < this.REALM_SYNERGY.length; i++){
			if (this.REALM_SYNERGY[i].coreBlds.indexOf(bldName) !== -1){
				return true;
			}
		}
		return false;
	},

	getSharedStorageBuildings: function(){
		return this.SHARED_STORAGE_BLDS;
	},

	isSharedStorageBuilding: function(bldName){
		for (var i = 0; i < this.SHARED_STORAGE_BLDS.length; i++){
			if (this.SHARED_STORAGE_BLDS[i].name === bldName){
				return true;
			}
		}
		return false;
	},

	//将全部问道功法(science.techs)与百艺秘术(workshop.upgrades)的耗材归一至各境唯一核心灵材链，并确保绝不超出20座储灵建筑上限
	normalizeRealmPrices: function(){
		if (!this.game){ return; }
		var allowedUpToRealm = [
			{ catnip: true, wood: true, xiuwei: true },
			{ catnip: true, wood: true, xiuwei: true, minerals: true },
			{ catnip: true, wood: true, xiuwei: true, minerals: true, gold: true },
			{ catnip: true, wood: true, xiuwei: true, minerals: true, gold: true, science: true },
			{ catnip: true, wood: true, xiuwei: true, minerals: true, gold: true, science: true, faith: true },
			{ catnip: true, wood: true, xiuwei: true, minerals: true, gold: true, science: true, faith: true, unobtainium: true },
			{ catnip: true, wood: true, xiuwei: true, minerals: true, gold: true, science: true, faith: true, unobtainium: true, relic: true },
			{ catnip: true, wood: true, xiuwei: true, minerals: true, gold: true, science: true, faith: true, unobtainium: true, relic: true, timeCrystal: true },
			{ catnip: true, wood: true, xiuwei: true, minerals: true, gold: true, science: true, faith: true, unobtainium: true, relic: true, timeCrystal: true }
		];
		var convertClamp = {
			wood: 500,
			minerals: 2500,
			gold: 1000,
			science: 15000,
			faith: 8000,
			unobtainium: 2500,
			relic: 1000,
			timeCrystal: 500
		};
		var safeCaps = {
			catnip: 40000,
			wood: 20000,
			minerals: 25000,
			gold: 10000,
			science: 500000,
			faith: 25000,
			unobtainium: 15000,
			relic: 10000,
			timeCrystal: 5000,
			coal: 10000,
			iron: 20000,
			titanium: 15000,
			oil: 150000,
			uranium: 35000,
			culture: 10000,
			antimatter: 3500
		};
		var self = this;
		var normalizeList = function(type, items){
			if (!items){ return; }
			for (var i = 0; i < items.length; i++){
				var it = items[i];
				if (!it || !it.prices){ continue; }
				if (!it._origPrices){
					it._origPrices = dojo.clone(it.prices);
				}
				var gate = self.getItemRealmGate(type, it.name);
				var r = gate ? gate.realmIdx : 0;
				var allowed = allowedUpToRealm[r] || allowedUpToRealm[0];
				var targetRes = (self.REALM_SYNERGY[r] && self.REALM_SYNERGY[r].res) || "wood";
				var maxConv = convertClamp[targetRes] || 1000;
				var merged = [];
				var byName = {};
				for (var j = 0; j < it._origPrices.length; j++){
					var p = it._origPrices[j];
					var rName = p.name;
					var rVal = p.val || 0;
					if (!allowed[rName]){
						if (rName === "science" && r === 0){
							rName = "wood";
							rVal = Math.max(10, Math.min(500, Math.round(rVal)));
						} else if (rName === "science" && r === 1){
							rName = "minerals";
							rVal = Math.max(20, Math.min(2000, Math.round(rVal * 0.5)));
						} else if (rName === "science" && r === 2){
							rName = "gold";
							rVal = Math.max(15, Math.min(800, Math.round(rVal * 0.08)));
						} else {
							rName = targetRes;
							rVal = Math.max(5, Math.min(maxConv, Math.round(rVal)));
						}
					}
					if (safeCaps[rName] && rVal > safeCaps[rName]){
						rVal = safeCaps[rName];
					}
					if (byName[rName]){
						byName[rName].val = Math.max(byName[rName].val, rVal);
					} else {
						var entry = { name: rName, val: rVal };
						byName[rName] = entry;
						merged.push(entry);
					}
				}
				it.prices = merged;
			}
		};
		if (this.game.science && this.game.science.techs){
			normalizeList("tech", this.game.science.techs);
		}
		if (this.game.workshop && this.game.workshop.upgrades){
			normalizeList("upgrade", this.game.workshop.upgrades);
		}
		var secondaryToCore = {
			coal:        { res: "minerals",    scale: 1.0,  max: 5000 },
			iron:        { res: "minerals",    scale: 1.0,  max: 5000 },
			beam:        { res: "wood",        scale: 2.0,  max: 3000 },
			slab:        { res: "minerals",    scale: 2.0,  max: 5000 },
			steel:       { res: "gold",        scale: 1.0,  max: 2000 },
			culture:     { res: "gold",        scale: 0.5,  max: 1500 },
			spice:       { res: "wood",        scale: 2.0,  max: 1000 },
			titanium:    { res: "gold",        scale: 1.0,  max: 3000 },
			alloy:       { res: "science",     scale: 10.0, max: 15000 },
			blueprint:   { res: "science",     scale: 50.0, max: 20000 },
			starchart:   { res: "science",     scale: 5.0,  max: 25000 },
			oil:         { res: "faith",       scale: 0.5,  max: 15000 },
			unicorns:    { res: "faith",       scale: 0.5,  max: 5000 },
			tears:       { res: "faith",       scale: 20.0, max: 15000 },
			uranium:     { res: "unobtainium", scale: 0.5,  max: 5000 },
			alicorn:     { res: "relic",       scale: 2.0,  max: 2500 },
			sorrow:      { res: "relic",       scale: 5.0,  max: 2500 },
			eludium:     { res: "relic",       scale: 1.0,  max: 2500 }
		};
		var normalizePriceArray = function(priceArr){
			if (!priceArr || !priceArr.length){ return priceArr; }
			var merged = [];
			var byName = {};
			for (var j = 0; j < priceArr.length; j++){
				var p = priceArr[j];
				if (!p || !p.name){ continue; }
				var rName = p.name;
				var rVal = p.val || 0;
				var mapRule = secondaryToCore[rName];
				if (mapRule){
					rName = mapRule.res;
					rVal = Math.max(5, Math.min(mapRule.max, Math.round(rVal * mapRule.scale)));
				}
				if (safeCaps[rName] && rVal > safeCaps[rName]){
					rVal = safeCaps[rName];
				}
				if (byName[rName]){
					byName[rName].val = Math.max(byName[rName].val, rVal);
				} else {
					var entry = dojo.clone(p);
					entry.name = rName;
					entry.val = rVal;
					byName[rName] = entry;
					merged.push(entry);
				}
			}
			return merged;
		};
		var normalizeSystemItems = function(items){
			if (!items){ return; }
			for (var i = 0; i < items.length; i++){
				var it = items[i];
				if (!it){ continue; }
				if (it.prices){
					if (!it._origPrices){ it._origPrices = dojo.clone(it.prices); }
					it.prices = normalizePriceArray(it._origPrices);
				}
				if (it.fixPrices){
					if (!it._origFixPrices){ it._origFixPrices = dojo.clone(it.fixPrices); }
					it.fixPrices = normalizePriceArray(it._origFixPrices);
				}
				if (it.stages && it.stages[0] && it.stages[0].prices){
					if (!it.stages[0]._origPrices){ it.stages[0]._origPrices = dojo.clone(it.stages[0].prices); }
					it.stages[0].prices = normalizePriceArray(it.stages[0]._origPrices);
				}
			}
		};
		if (this.game.bld && this.game.bld.buildingsData){
			normalizeSystemItems(this.game.bld.buildingsData);
		}
		if (this.game.religion){
			normalizeSystemItems(this.game.religion.zigguratUpgrades);
			normalizeSystemItems(this.game.religion.religionUpgrades);
			normalizeSystemItems(this.game.religion.transcendenceUpgrades);
		}
		if (this.game.space){
			normalizeSystemItems(this.game.space.programs);
			var planets = this.game.space.planets || [];
			for (var pl = 0; pl < planets.length; pl++){
				normalizeSystemItems(planets[pl].buildings);
			}
		}
		if (this.game.time){
			normalizeSystemItems(this.game.time.chronoforgeUpgrades);
			normalizeSystemItems(this.game.time.voidspaceUpgrades);
		}
	},

	getResourceRealmInfo: function(resName){
		for (var i = 0; i < this.REALM_SYNERGY.length; i++){
			var syn = this.REALM_SYNERGY[i];
			if (syn.res === resName){
				return {
					realmIdx: syn.realmIdx,
					key: syn.key,
					title: syn.title,
					shortTitle: syn.shortTitle,
					badge: syn.resBadge,
					resTitle: syn.resTitle,
					desc: syn.resDesc
				};
			}
		}
		return null;
	},

	//洞府灵库默认仅聚焦展示「修为 + 灵谷 + 九境唯一核心灵材 + 轮回道果」,彻底消除繁杂次要资源干扰
	isCoreRealmResource: function(resName){
		if (resName === "xiuwei" || resName === "catnip"){
			return true;
		}
		if (this.getResourceRealmInfo(resName) !== null){
			return true;
		}
		if ((resName === "karma" || resName === "paragon") && this.game && this.game.resPool){
			var rObj = this.game.resPool.get(resName);
			return !!(rObj && rObj.value > 0);
		}
		return false;
	},

	getItemRealmGate: function(type, name){
		if (!name){ return this.REALM_SYNERGY[0]; }
		var normType = String(type || "").toLowerCase();
		for (var i = 0; i < this.REALM_SYNERGY.length; i++){
			var syn = this.REALM_SYNERGY[i];
			if (normType === "building" || normType === "buildings" || normType === "bld"){
				if (syn.coreBlds.indexOf(name) !== -1){
					return {
						realmIdx: syn.realmIdx, key: syn.key, title: syn.title, shortTitle: syn.shortTitle,
						stageKey: syn.stageKey, res: syn.res, resTitle: syn.resTitle, resBadge: syn.resBadge, isCore: true
					};
				}
				if (syn.auxBlds && syn.auxBlds.indexOf(name) !== -1){
					return {
						realmIdx: syn.realmIdx, key: syn.key, title: syn.title, shortTitle: syn.shortTitle,
						stageKey: syn.stageKey, res: syn.res, resTitle: syn.resTitle, resBadge: syn.resBadge, isCore: false
					};
				}
			} else if (normType === "tech" || normType === "science"){
				if (syn.techs.indexOf(name) !== -1){
					return {
						realmIdx: syn.realmIdx, key: syn.key, title: syn.title, shortTitle: syn.shortTitle,
						stageKey: syn.stageKey, res: syn.res, resTitle: syn.resTitle, resBadge: syn.resBadge, isCore: true
					};
				}
			} else if (normType === "craft" || normType === "crafts"){
				if (syn.crafts.indexOf(name) !== -1){
					return {
						realmIdx: syn.realmIdx, key: syn.key, title: syn.title, shortTitle: syn.shortTitle,
						stageKey: syn.stageKey, res: syn.res, resTitle: syn.resTitle, resBadge: syn.resBadge, isCore: true
					};
				}
			} else if (normType === "upgrade" || normType === "upgrades" || normType === "workshop"){
				if (syn.upgrades.indexOf(name) !== -1){
					return {
						realmIdx: syn.realmIdx, key: syn.key, title: syn.title, shortTitle: syn.shortTitle,
						stageKey: syn.stageKey, res: syn.res, resTitle: syn.resTitle, resBadge: syn.resBadge, isCore: true
					};
				}
			}
		}

		//Fallback: 根据条目耗材智能推断所属大境界
		var itemObj = null;
		if (this.game){
			if ((normType === "building" || normType === "buildings") && this.game.bld){
				itemObj = this.game.bld.get(name);
			} else if ((normType === "tech" || normType === "science") && this.game.science){
				itemObj = this.game.science.get(name);
			} else if ((normType === "upgrade" || normType === "upgrades") && this.game.workshop){
				itemObj = this.game.workshop.get(name);
			} else if ((normType === "craft" || normType === "crafts") && this.game.workshop){
				itemObj = this.game.workshop.getCraft(name);
			}
		}
		var inferredIdx = 0;
		var prices = (itemObj && itemObj.prices) || [];
		for (var p = 0; p < prices.length; p++){
			var pn = prices[p].name;
			var pv = prices[p].val || 0;
			if (pn === "timeCrystal" || pn === "antimatter" || pn === "void"){ inferredIdx = Math.max(inferredIdx, 7); }
			else if (pn === "relic" || pn === "eludium"){ inferredIdx = Math.max(inferredIdx, 6); }
			else if (pn === "unobtainium" || pn === "uranium"){ inferredIdx = Math.max(inferredIdx, 5); }
			else if (pn === "faith" || pn === "oil" || (pn === "science" && pv >= 30000)){ inferredIdx = Math.max(inferredIdx, 4); }
			else if (pn === "titanium" || pn === "alloy" || (pn === "science" && pv >= 7500)){ inferredIdx = Math.max(inferredIdx, 3); }
			else if (pn === "gold" || pn === "steel" || pn === "blueprint" || (pn === "science" && pv >= 1800)){ inferredIdx = Math.max(inferredIdx, 2); }
			else if (pn === "minerals" || pn === "iron" || pn === "beam" || pn === "slab" || (pn === "science" && pv >= 250)){ inferredIdx = Math.max(inferredIdx, 1); }
		}
		var fbSyn = this.REALM_SYNERGY[inferredIdx] || this.REALM_SYNERGY[0];
		return {
			realmIdx: fbSyn.realmIdx, key: fbSyn.key, title: fbSyn.title, shortTitle: fbSyn.shortTitle,
			stageKey: fbSyn.stageKey, res: fbSyn.res, resTitle: fbSyn.resTitle, resBadge: fbSyn.resBadge, isCore: false
		};
	},

	isItemRealmUnlocked: function(type, name){
		var gate = this.getItemRealmGate(type, name);
		return this.getCurrentRealmIndex() >= gate.realmIdx;
	},

	//境界突破与同步联动: 随着修为大境界提升，自动解锁对应境界的唯一核心灵材、核心洞府灵筑、问道秘籍与百艺配方
	syncRealmUnlocks: function(){
		if (!this.game || !this.stages || !this.stages.length){ return; }
		var curRealmIdx = this.getCurrentRealmIndex();
		for (var r = 0; r <= curRealmIdx; r++){
			var syn = this.REALM_SYNERGY[r];
			if (!syn){ continue; }
			//1. 解锁本境唯一核心灵材 (炼气期灵木在伐木/筑庐后自然显现，筑基及以上破境即显核心灵材)
			if (this.game.resPool && (r >= 1 || this.getHighestStageIndex() >= 1)){
				var keyResObj = this.game.resPool.get(syn.res);
				if (keyResObj){ keyResObj.unlocked = true; }
			}
			//2. 筑基及以上: 破入新大境界即点亮本境核心洞府建筑 (unlockable + unlocked)
			if (r >= 1 && this.game.bld){
				for (var b = 0; b < syn.coreBlds.length; b++){
					var bldObj = this.game.bld.get(syn.coreBlds[b]);
					if (bldObj){
						bldObj.unlockable = true;
						bldObj.unlocked = true;
					}
				}
			}
			//3. 筑基及以上(或引气入体后): 解锁本境首门核心问道功法与本境百艺配方/升级
			if ((r >= 1 || this.getHighestStageIndex() >= 1) && this.game.science && syn.techs.length > 0){
				var firstTech = this.game.science.get(syn.techs[0]);
				if (firstTech){ firstTech.unlocked = true; }
			}
			if (r >= 1 && this.game.workshop){
				for (var c = 0; c < syn.crafts.length; c++){
					var crObj = this.game.workshop.getCraft(syn.crafts[c]);
					if (crObj){ crObj.unlocked = true; }
				}
				if (syn.upgrades && syn.upgrades.length > 0){
					var firstUpg = this.game.workshop.get(syn.upgrades[0]);
					if (firstUpg){ firstUpg.unlocked = true; }
				}
			}
		}
		//4. 同步顶部导航页签可见性——避免藏经阁/百艺/坊市/道统因建筑跨境而隐身卡死
		if (this.game.tabs && this.game.tabs.length){
			var hasLibrary = !!(this.game.bld && this.game.bld.get("library") && this.game.bld.get("library").val > 0);
			var hasWorkshop = !!(this.game.bld && this.game.bld.get("workshop") && this.game.bld.get("workshop").val > 0);
			var hasTradepost = !!(this.game.bld && this.game.bld.get("tradepost") && this.game.bld.get("tradepost").val > 0);
			var hasTemple = !!(this.game.bld && this.game.bld.get("temple") && this.game.bld.get("temple").val > 0);
			var hasChrono = !!(this.game.bld && this.game.bld.get("chronosphere") && this.game.bld.get("chronosphere").val > 0);
			for (var ti = 0; ti < this.game.tabs.length; ti++){
				var tb = this.game.tabs[ti];
				if (!tb){ continue; }
				if (tb.tabId === "Science" && (curRealmIdx >= 1 || this.getHighestStageIndex() >= 1 || hasLibrary)){
					tb.visible = true;
				} else if (tb.tabId === "Workshop" && (curRealmIdx >= 1 || hasWorkshop)){
					tb.visible = true;
				} else if (tb.tabId === "Trade" && (curRealmIdx >= 2 || hasTradepost)){
					tb.visible = true;
				} else if (tb.tabId === "Religion" && (curRealmIdx >= 4 || hasTemple)){
					tb.visible = true;
				} else if (tb.tabId === "Space" && curRealmIdx >= 5){
					tb.visible = true;
				} else if (tb.tabId === "Time" && (curRealmIdx >= 7 || hasChrono)){
					tb.visible = true;
				}
			}
		}
	},

	//渲染《九境同源 · 一境一核万法联动总纲》横幅 (通用于 修行/洞府/问道/百艺 四大核心页签)
	renderRealmSynergyBanner: function(tabId){
		var curIdx = this.getCurrentRealmIndex();
		var curSyn = this.getRealmSynergy(curIdx);
		var nextSyn = (curIdx + 1 < this.REALM_SYNERGY.length) ? this.getRealmSynergy(curIdx + 1) : null;
		var fmt = this.game ? this.game.getDisplayValueExt.bind(this.game) : function(v){ return String(v); };

		//1. 九境一核阶梯脉络条
		var spineHtml = "<div class=\"xxSynSpine\">";
		for (var i = 0; i < this.REALM_SYNERGY.length; i++){
			var s = this.REALM_SYNERGY[i];
			var stCls = (i < curIdx) ? "reached" : (i === curIdx ? "current" : (i === curIdx + 1 ? "next" : "locked"));
			spineHtml += "<div class=\"xxSynNode " + stCls + "\" title=\"" + s.title + " · 唯一核心灵材：【" + s.resTitle + "】&#10;" + s.resDesc + "\">" +
				"<span class=\"xxSynRealm\">" + s.shortTitle + "</span>" +
				"<span class=\"xxSynRes\">" + s.resTitle + "</span>" +
			"</div>";
		}
		spineHtml += "</div>";

		//2. 当前境界核心灵材 + 洞府/问道/百艺三脉联动详情
		var resObj = this.game && this.game.resPool ? this.game.resPool.get(curSyn.res) : null;
		var resValStr = resObj ? fmt(resObj.value, false, false, 0) : "0";
		var resMaxStr = (resObj && resObj.maxValue > 0) ? (" / " + fmt(resObj.maxValue, false, false, 0)) : "";

		var bldLabels = [];
		for (var b = 0; b < curSyn.coreBlds.length; b++){
			var bMeta = this.game && this.game.bld ? this.game.bld.get(curSyn.coreBlds[b]) : null;
			var bLbl = (bMeta && (bMeta.label || (bMeta.stages && bMeta.stages[0] && bMeta.stages[0].label))) || curSyn.coreBlds[b];
			var bCnt = bMeta ? (bMeta.val || 0) : 0;
			bldLabels.push("<span class=\"xxSynItemChip bld\">" + bLbl + (bCnt > 0 ? " <b>×" + bCnt + "</b>" : "") + "</span>");
		}

		var techLabels = [];
		for (var t = 0; t < Math.min(4, curSyn.techs.length); t++){
			var tMeta = this.game && this.game.science ? this.game.science.get(curSyn.techs[t]) : null;
			if (tMeta){
				techLabels.push("<span class=\"xxSynItemChip tech" + (tMeta.researched ? " done" : "") + "\">" + tMeta.label + (tMeta.researched ? " ✓" : "") + "</span>");
			}
		}

		var artLabels = [];
		for (var c = 0; c < curSyn.crafts.length; c++){
			var cMeta = this.game && this.game.workshop ? this.game.workshop.getCraft(curSyn.crafts[c]) : null;
			if (cMeta){
				artLabels.push("<span class=\"xxSynItemChip craft\">炼制·" + cMeta.label + "</span>");
			}
		}
		for (var u = 0; u < Math.min(3, curSyn.upgrades.length); u++){
			var uMeta = this.game && this.game.workshop ? this.game.workshop.get(curSyn.upgrades[u]) : null;
			if (uMeta){
				artLabels.push("<span class=\"xxSynItemChip upg" + (uMeta.researched ? " done" : "") + "\">" + uMeta.label + (uMeta.researched ? " ✓" : "") + "</span>");
			}
		}

		//下一境界预告
		var nextPreviewHtml = "";
		if (nextSyn){
			var nextBlds = [];
			for (var nb = 0; nb < nextSyn.coreBlds.length; nb++){
				var nbMeta = this.game && this.game.bld ? this.game.bld.get(nextSyn.coreBlds[nb]) : null;
				nextBlds.push((nbMeta && (nbMeta.label || (nbMeta.stages && nbMeta.stages[0] && nbMeta.stages[0].label))) || nextSyn.coreBlds[nb]);
			}
			var nextTechs = [];
			for (var nt = 0; nt < Math.min(2, nextSyn.techs.length); nt++){
				var ntMeta = this.game && this.game.science ? this.game.science.get(nextSyn.techs[nt]) : null;
				if (ntMeta){ nextTechs.push(ntMeta.label); }
			}
			nextPreviewHtml =
				"<div class=\"xxSynNextBar\">" +
					"<span class=\"xxSynNextTag\">◈ 下一大境预告 · 突破【" + nextSyn.title + "】开启</span>" +
					"<span class=\"xxSynNextDetail\">" +
						"唯一核心灵材：<b>" + nextSyn.resTitle + "</b>" +
						(nextBlds.length ? " ｜ 解锁洞府灵筑：<b>" + nextBlds.join("、") + "</b>" : "") +
						(nextTechs.length ? " ｜ 解锁问道百艺：<b>" + nextTechs.join("、") + "</b> 等" : "") +
					"</span>" +
				"</div>";
		} else {
			nextPreviewHtml =
				"<div class=\"xxSynNextBar max\">" +
					"<span class=\"xxSynNextTag\">✦ 九境圆满 · 渡劫飞升</span>" +
					"<span class=\"xxSynNextDetail\">已臻人界与灵界道途绝巅，万法归宗！</span>" +
				"</div>";
		}

		return "<div class=\"xxSynergyBanner xxSynTab-" + (tabId || "Cultivation") + "\">" +
			"<div class=\"xxSynHd\">" +
				"<div class=\"xxSynTitleWrap\">" +
					"<span class=\"xxSynSeal\">脉</span>" +
					"<div>" +
						"<div class=\"xxSynTitle\">九境万法同源总纲 · 【" + curSyn.title + " · 唯以" + curSyn.resTitle + "为核】</div>" +
						"<div class=\"xxSynSub\">" + curSyn.resDesc + " —— 修为破境方能解锁更高阶的洞府灵筑、问道典籍与百艺秘术</div>" +
					"</div>" +
				"</div>" +
				"<div class=\"xxSynKeyResBox\">" +
					"<span class=\"xxSynKeyResLbl\">" + curSyn.resBadge + " · 破境唯一核心灵材</span>" +
					"<span class=\"xxSynKeyResVal\">" + curSyn.resTitle + " <b>" + resValStr + "</b>" + resMaxStr + "</span>" +
				"</div>" +
			"</div>" +
			spineHtml +
			"<div class=\"xxSynModules\">" +
				"<div class=\"xxSynModCol" + (tabId === "Bonfire" ? " active" : "") + "\">" +
					"<span class=\"xxSynModLbl\">◈ 本境核心洞府 (" + curSyn.coreBlds.length + ")</span>" +
					"<div class=\"xxSynChipList\">" + (bldLabels.join("") || "<span class=\"xxSynIdle\">九境洞府已圆满</span>") + "</div>" +
				"</div>" +
				"<div class=\"xxSynModCol" + (tabId === "Science" ? " active" : "") + "\">" +
					"<span class=\"xxSynModLbl\">◈ 本境问道功法</span>" +
					"<div class=\"xxSynChipList\">" + (techLabels.join("") || "<span class=\"xxSynIdle\">万法通玄</span>") + "</div>" +
				"</div>" +
				"<div class=\"xxSynModCol" + (tabId === "Workshop" ? " active" : "") + "\">" +
					"<span class=\"xxSynModLbl\">◈ 本境百艺技艺</span>" +
					"<div class=\"xxSynChipList\">" + (artLabels.join("") || "<span class=\"xxSynIdle\">百艺化境</span>") + "</div>" +
				"</div>" +
			"</div>" +
			nextPreviewHtml +
		"</div>";
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
	//境界裸战力底数(不含灵根/出身/法宝/仙缘/丹药/心魔乘区)——供小秘境妖兽生成锚定同阶基准
	getBaseRealmCombatPower: function(){
		var base = 0;
		for (var i = 0; i < this.stages.length; i++){
			if (this.stages[i].researched){ base += this.stages[i].effects.combatPower || 0; }
		}
		return Math.max(10, base);
	},

	//道行之数:境界是底,灵根定质(多灵根五行齐备同阶战力浑厚,天灵根属性单一战力偏弱),神兵道兵灵兽器灵各添一筹;
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
		if (this.buffs && this.buffs.biyan > 0){
			mult *= (this.buffs.biyanSupreme > 0 ? 1.45 : 1.35);	//碧焰酒燃灵火 ×1.35 (丹纹 ×1.45)
		}
		var leg = this.getLegacyBonus();
		if (leg.lives > 0){ mult *= leg.combatMult; }				//前世轮回印记
		var sealBonus = this.getRiftSealBonuses();
		if (sealBonus.combatMult > 1){ mult *= sealBonus.combatMult; }	//玄天古印加持
		var origin = this.getOrigin();
		if (origin && origin.powerMult){ mult *= origin.powerMult; }	//猎户之后
		var riftDmgBonus = this.game.getEffect("riftDamageRatio") || 0;
		if (riftDmgBonus > 0){ mult *= (1 + riftDmgBonus * 0.5); }	//高阶宗门镇宗秘境神通
		if ((this.beastImprintTier || 0) > 0){ mult *= (1 + this.beastImprintTier * 0.04); }	//XX-6 前世万灵兽印护体
		if ((this.hongmengImprintTier || 0) > 0){ mult *= (1 + this.hongmengImprintTier * 0.05); }	//XX-7 前世鸿蒙道印镇世
		if ((this.dharmaImprintTier || 0) > 0){ mult *= (1 + this.dharmaImprintTier * 0.06); }	//XX-8 前世法相道印护道
		if (this.immortalAscended){ mult *= 1.35; }					//仙躯蜕凡
		if (this.daoyun > 0){ mult *= (1 + this.daoyun * 0.15); }	//诸天法则道韵加持
		var caveBonus = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
		if (caveBonus && caveBonus.combatMult > 1){ mult *= caveBonus.combatMult; }	//XX-4 本命仙器器灵共鸣与轮回仙印
		if (this.hasMingge("jiangu")){ mult *= 1.28; }				//剑骨通明 ×1.28
		if (this.hasMingge("huanggu")){ mult *= 1.20; }				//荒古战躯 ×1.20
		mult *= Math.max(0.3, 1 - this.heartDemon * 0.005);	//心魔蚀骨
		return Math.max(1, base * mult);
	},

	//秘境守关战力天梯——门槛层锚定「上一境界圆满×0.9」,档内几何插值;
	//战力每境约翻四倍,故跨档急升:同一境界内越阶越深,守关者越不可力敌
	RIFT_POWER: [
		[0, 40], [3, 160], [6, 565], [9, 2185], [12, 8665], [15, 34585], [20, 135835], [25, 540835], [30, 2150000], [35, 8600000]
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
			if (this.hasMingge("tianling")){ c += 0.08; }	//鸿蒙道体破境天成
		}
		c -= this.heartDemon * 0.006;	//心魔噬心,道念不纯则破境愈艰
		if (stage.chance != null && stage.chance < 1 && (this.pillToxicity || 0) >= 40){
			c -= this.getToxicityStatus().breakPenalty;	//丹毒淤脉,真元运转不畅
		}
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
		var surgeYears = this.BREAK_SURGE_YEARS * (this.hasMingge("tianling") ? 0.5 : 1);
		var elapsed = this.game.calendar.trueYear() - this.lastBreakYear;
		if (elapsed >= surgeYears){ return 1; }
		if (elapsed < 0){ elapsed = 0; }
		return 1 + (this.BREAK_SURGE_MAX - 1) * (1 - elapsed / surgeYears);
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

	//当前境界的寿元上限(随层数渐进,stage meta 上已按 def.life*(i+1)/layers 生成; 农家出身筋骨绵长 ×1.15)
	getLifespan: function(){
		var realm = this.getCurrentRealm();
		var springB = this.getBeastSpringBonus ? this.getBeastSpringBonus() : null;
		var caveLife = (this.immortalAscended && this.getImmortalCaveBonuses) ? this.getImmortalCaveBonuses(0) : null;
		var base = ((realm && realm.lifespan) || 80) +
			((this.herbGarden && this.herbGarden.immortalLifeBonus) || 0) +
			((springB && springB.lifespanBonus) || 0) +
			((caveLife && caveLife.lifespanBonus) || 0);
		var origin = this.getOrigin();
		var mult = (origin && origin.lifespanMult) ? origin.lifespanMult : 1;
		if (this.hasMingge("changsheng")){ mult *= 1.60; }	//长生道胎寿元绵长 +60%
		return Math.round(base * mult);
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
			for (var k in oCards){ oCards[k].className = "xxIdOrigin xxIdOriginHasArt" + (k == selOrigin ? " xx-sel" : ""); }
		};
		var oWrap = dojo.create("div", {className: "xxIdOrigins"}, card);
		this.ORIGINS.forEach(function(o){
			var oIco = (classes.ui && classes.ui.XianxiaArt) ?
				"<i class=\"xxIdOriginIco\" aria-hidden=\"true\">" + classes.ui.XianxiaArt.originIcon(o.key) + "</i>" : "";
			oCards[o.key] = dojo.create("div", {
				className: "xxIdOrigin xxIdOriginHasArt",
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

		//XX-3 转世择身时同步展示「先天命格·特殊灵体」择取盘(1~3 槽)
		var selMingge = self.normalizeMinggeList(self.mingge || [], self.getMinggeSlotCap(false));
		if (originOnly){
			var mgCap = self.getMinggeSlotCap(false);
			var mgHdr = dojo.create("div", {
				className: "xxIdLbl xxIdLblTop xxMgPromptHdr"
			}, card);
			var mgCards = {};
			var refreshMgHdr = function(){
				mgHdr.innerHTML = "☯ 先天命格 · 特殊灵体 <span class=\"xxMgSlotBadge\">已择 " + selMingge.length + "/" + mgCap + " 槽</span>" +
					"<span class=\"xxMgUnlockHint\">（3世/8功德开2槽 · 6世/25功德开3槽）</span>";
				for (var mk in mgCards){
					var on = false;
					for (var mi = 0; mi < selMingge.length; mi++){
						if (selMingge[mi] === mk){ on = true; break; }
					}
					mgCards[mk].className = "xxMgCard" + (on ? " xx-sel" : "");
				}
			};
			var mgGrid = dojo.create("div", {className: "xxMgGrid"}, card);
			this.MINGGE_DEFS.forEach(function(mg){
				var ico = (classes.ui && classes.ui.XianxiaArt && classes.ui.XianxiaArt.minggeIcon) ?
					"<i class=\"xxMgIco\" aria-hidden=\"true\">" + classes.ui.XianxiaArt.minggeIcon(mg.art) + "</i>" : "";
				mgCards[mg.key] = dojo.create("div", {
					className: "xxMgCard",
					"data-mg": mg.key,
					innerHTML: ico + "<div class=\"xxMgBody\">" +
						"<div class=\"xxMgTitleRow\"><b>" + mg.label + "</b><span class=\"xxMgTag\">" + mg.tag + "</span></div>" +
						"<span class=\"xxMgDesc\">" + mg.desc + "</span></div>"
				}, mgGrid);
				dojo.connect(mgCards[mg.key], "onclick", function(){
					var idx = -1;
					for (var j = 0; j < selMingge.length; j++){
						if (selMingge[j] === mg.key){ idx = j; break; }
					}
					if (idx >= 0){
						selMingge.splice(idx, 1);
					} else if (selMingge.length < mgCap){
						selMingge.push(mg.key);
					} else if (mgCap === 1){
						selMingge = [mg.key];
					}
					refreshMgHdr();
				});
			});
			refreshMgHdr();
		}

		var btn = dojo.create("div", {className: "btn nosel modern xxFateBtn xxFateDone", tabIndex: 0}, card);
		var btnContent = dojo.create("div", {className: "btnContent"}, btn);
		dojo.create("span", {
			className: "btnTitle", innerHTML: "<b>" + $I("identity.confirm") + "</b>"
		}, btnContent);
		dojo.connect(btn, "onclick", function(){
			if (originOnly){
				//转世择身——魂还是那缕魂,换这一世的出身并凝定先天命格
				self.identity.origin = selOrigin;
				self.setMingge(selMingge);
				self.pendingOrigin = false;
				self.identityPending = false;
				dojo.destroy(overlay);
				var mgNames = [];
				var activeMgs = self.getActiveMinggeDefs();
				for (var mi = 0; mi < activeMgs.length; mi++){ mgNames.push("【" + activeMgs[mi].label + "】"); }
				var originSummary = self.getOriginLabel() + (mgNames.length ? " · 身负" + mgNames.join("") : "");
				self.game.msg($I("identity.rebirthed", [originSummary]), "important");
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
		if (typeof bonus != "number" || isNaN(bonus)){
			bonus = this.getCurrentRealmIndex() * this.ASCENSION_KARMA;
		}
		if (!karmaText){
			karmaText = $I("cultivation.msg.lifespan.karma." + (bonus > 0 ? "gain" : "none"), [bonus]);
		}
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
		this.renderMinggePickerInto(card, true);
		var btn = dojo.create("div", {className: "btn nosel modern xxFateBtn xxFateDone", tabIndex: 0}, card);
		var btnContent = dojo.create("div", {className: "btnContent"}, btn);
		dojo.create("span", {
			className: "btnTitle",
			innerHTML: "<b>" + $I("cultivation.msg.lifespan.rebirth") + "</b>"
		}, btnContent);
		dojo.connect(btn, "onclick", function(){
			dojo.destroy(overlay);
			self.applyReincarnation(bonus);
		});
		btn.focus();
	},

	//渲染「来世先天命格轮回盘」交互选择面板(供坐化弹层与主动轮回重修弹窗共用)
	renderMinggePickerInto: function(parentNode, isNextLife){
		var self = this;
		var cap = this.getMinggeSlotCap(isNextLife !== false);
		if ((!this.pendingMingge || !this.pendingMingge.length) && this.mingge && this.mingge.length){
			this.pendingMingge = this.normalizeMinggeList(this.mingge, cap);
		} else {
			this.pendingMingge = this.normalizeMinggeList(this.pendingMingge || [], cap);
		}
		var box = dojo.create("div", {className: "xxMgPickerBox"}, parentNode);
		var hdr = dojo.create("div", {className: "xxMgPickerHdr"}, box);
		var grid = dojo.create("div", {className: "xxMgGrid"}, box);
		var cardMap = {};
		var refresh = function(){
			var cur = self.pendingMingge || [];
			hdr.innerHTML = "<span class=\"xxMgPickerTitle\">☯ 来世先天命格择取</span>" +
				"<span class=\"xxMgSlotBadge\">已择 " + cur.length + "/" + cap + " 槽</span>" +
				"<span class=\"xxMgUnlockHint\">累计 3世/8功德开2槽 · 6世/25功德开3槽</span>";
			for (var k in cardMap){
				var picked = false;
				for (var i = 0; i < cur.length; i++){
					if (cur[i] === k){ picked = true; break; }
				}
				cardMap[k].className = "xxMgCard" + (picked ? " xx-sel" : "");
			}
		};
		for (var i = 0; i < this.MINGGE_DEFS.length; i++){
			(function(mg){
				var ico = (classes.ui && classes.ui.XianxiaArt && classes.ui.XianxiaArt.minggeIcon) ?
					"<i class=\"xxMgIco\" aria-hidden=\"true\">" + classes.ui.XianxiaArt.minggeIcon(mg.art) + "</i>" : "";
				var el = dojo.create("div", {
					className: "xxMgCard",
					"data-mg": mg.key,
					innerHTML: ico + "<div class=\"xxMgBody\">" +
						"<div class=\"xxMgTitleRow\"><b>" + mg.label + "</b><span class=\"xxMgTag\">" + mg.tag + "</span></div>" +
						"<span class=\"xxMgDesc\">" + mg.desc + "</span></div>"
				}, grid);
				cardMap[mg.key] = el;
				dojo.connect(el, "onclick", function(){
					self.togglePendingMingge(mg.key);
					refresh();
				});
			})(this.MINGGE_DEFS[i]);
		}
		refresh();
		return box;
	},

	//主动打开「六道轮回 · 先天命格盘」弹窗(可预设来世命格,亦可直接兵解/飞升轮回重修)
	showReincarnationOverlay: function(){
		var self = this;
		var existing = dojo.query(".xxMinggeModalOverlay");
		if (existing && existing.length){
			existing.forEach(function(n){ dojo.destroy(n); });
		}
		var host = dojo.byId("gamePageContainer") || dojo.body();
		var overlay = dojo.create("div", {className: "xxFateOverlay xxMinggeModalOverlay"}, host);
		var card = dojo.create("div", {
			className: "dialog xxFateCard xxMinggeModalCard",
			role: "dialog",
			"aria-modal": "true",
			"aria-label": "六道轮回 · 先天命格盘"
		}, overlay);
		var wheelBanner = "<div class=\"xxMgBanner\"><img src=\"res/art/mingge_wheel.jpg\" alt=\"\" class=\"xxMgBannerImg\"/>" +
			"<div class=\"xxMgBannerText\">" +
				"<div class=\"xxMgBannerTitle\">☯ 六道轮回 · 先天命格盘</div>" +
				"<div class=\"xxMgBannerSub\">已历 " + this.getPastLives() + " 世轮回 · 来世可携 " + this.getMinggeSlotCap(true) + " 道先天灵体入世重修</div>" +
			"</div></div>";
		dojo.create("div", {innerHTML: wheelBanner}, card);

		var curActive = this.getActiveMinggeDefs();
		var curNames = [];
		for (var i = 0; i < curActive.length; i++){ curNames.push("【" + curActive[i].label + "】"); }
		dojo.create("div", {
			className: "xxMgCurrentBar",
			innerHTML: "此世命格：" + (curNames.length ? "<b>" + curNames.join(" ") + "</b>" : "<span class=\"xxMgMuted\">凡胎俗骨（转世重修后凝定先天灵体）</span>")
		}, card);

		this.renderMinggePickerInto(card, true);

		var btnRow = dojo.create("div", {className: "xxMgModalActions"}, card);
		var saveBtn = dojo.create("div", {className: "btn nosel modern xxFateBtn xxMgSaveBtn", tabIndex: 0}, btnRow);
		dojo.create("div", {
			className: "btnContent",
			innerHTML: "<span class=\"btnTitle\"><b>封存来世命格预设</b></span>"
		}, saveBtn);
		dojo.connect(saveBtn, "onclick", function(){
			dojo.destroy(overlay);
			var p = self.pendingMingge || [];
			self.game.msg(p.length ? ("已铭刻来世先天命格（" + p.length + " 道），待坐化或转世重修时自动凝成！") : "已清空来世命格预设。", "notice");
			if (self.game.render){ self.game.render(); }
		});

		var resetBtn = dojo.create("div", {className: "btn nosel modern xxFateBtn xxFateDone xxMgRebirthBtn", tabIndex: 0}, btnRow);
		dojo.create("div", {
			className: "btnContent",
			innerHTML: "<span class=\"btnTitle\"><b>携此命格 · 轮回重修</b></span>"
		}, resetBtn);
		dojo.connect(resetBtn, "onclick", function(){
			dojo.destroy(overlay);
			self.game.reset();
		});
	},

	//并入坐化业果并走标准转生——与按钮解耦,便于测试与别处复用
	applyReincarnation: function(bonus){
		if (bonus > 0){
			this.game.karmaKittens += bonus;	//getResetPrestige 会并入存档
		}
		this.game.resetAutomatic();
	},

	// ---------------- 玄天丹鼎 · 三昧控火与丹毒经脉体系 ----------------

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

	getCauldronFire: function(){
		var key = this.cauldronFire || "gentle";
		for (var i = 0; i < this.CAULDRON_FIRES.length; i++){
			if (this.CAULDRON_FIRES[i].key === key){ return this.CAULDRON_FIRES[i]; }
		}
		return this.CAULDRON_FIRES[0];
	},

	setCauldronFire: function(key){
		for (var i = 0; i < this.CAULDRON_FIRES.length; i++){
			if (this.CAULDRON_FIRES[i].key === key){
				this.cauldronFire = key;
				return true;
			}
		}
		return false;
	},

	getAlchemyRank: function(){
		var exp = Math.max(0, this.alchemyExp || 0);
		var cur = this.ALCHEMY_RANKS[0];
		var next = null;
		for (var i = 0; i < this.ALCHEMY_RANKS.length; i++){
			if (exp >= this.ALCHEMY_RANKS[i].minExp){
				cur = this.ALCHEMY_RANKS[i];
				next = this.ALCHEMY_RANKS[i + 1] || null;
			}
		}
		var pct = 100;
		if (next){
			var span = Math.max(1, next.minExp - cur.minExp);
			pct = Math.min(100, Math.max(0, Math.round(((exp - cur.minExp) / span) * 100)));
		}
		return {
			rank: cur.rank,
			title: cur.title,
			desc: cur.desc,
			exp: exp,
			nextExp: next ? next.minExp : cur.minExp,
			pct: pct,
			costMult: cur.costMult,
			critBonus: cur.critBonus,
			detoxMult: cur.detoxMult,
			xiuweiRatio: cur.xiuweiRatio,
			realmProductionRatio: cur.realmProductionRatio
		};
	},

	//经脉丹毒状态评估: 0..39 澄澈, 40..69 抗药初显, 70..89 丹毒淤塞, >=90 丹毒攻心(禁服猛药)
	getToxicityStatus: function(){
		var t = Math.min(100, Math.max(0, Math.round(this.pillToxicity || 0)));
		if (t >= 90){
			return {
				val: t,
				tier: "crit",
				label: "丹毒攻心",
				desc: "经脉丹毒淤满（≥90），强服猛药恐伤道基！增幅与破境丹药已被经脉排斥，吐纳 -35%、破境率 -15%，请速【周天洗髓】或服【清心丹/培婴丹】。",
				effMult: 0.35,
				xwPenalty: 0.35,
				breakPenalty: 0.15,
				blocked: true
			};
		}
		if (t >= 70){
			return {
				val: t,
				tier: "high",
				label: "丹毒淤塞",
				desc: "丹毒侵蚀奇经八脉（70~89）：服丹药效衰减 40%，修为吐纳 -20%，破境率 -8%。宜尽快运功逼毒或服净心丹药。",
				effMult: 0.60,
				xwPenalty: 0.20,
				breakPenalty: 0.08,
				blocked: false
			};
		}
		if (t >= 40){
			return {
				val: t,
				tier: "warn",
				label: "抗药初显",
				desc: "体内残留丹毒渐增（40~69）：产生轻度抗药性，新服丹药药效与时长衰减 20%，修为吐纳 -8%。",
				effMult: 0.80,
				xwPenalty: 0.08,
				breakPenalty: 0.03,
				blocked: false
			};
		}
		return {
			val: t,
			tier: "clean",
			label: "经脉澄澈",
			desc: "周天经脉澄澈通透（0~39）：药力 100% 完美化开，无任何丹毒滞涩。",
			effMult: 1.0,
			xwPenalty: 0,
			breakPenalty: 0,
			blocked: false
		};
	},

	//境界抗药性: 低阶聚气丹在高境界会产生抗药衰减(防止结丹/元婴仍靠廉价炼气丹叠满倍率)
	getPillRealmEfficacy: function(pillName){
		var rIdx = this.getCurrentRealmIndex();
		if (pillName === "juqi"){
			if (rIdx <= 1){ return 1.0; }
			if (rIdx === 2){ return 0.65; }
			if (rIdx === 3){ return 0.40; }
			return 0.25;
		}
		if (pillName === "zhujidan"){
			if (rIdx <= 1){ return 1.0; }
			if (rIdx === 2){ return 0.70; }
			return 0.45;
		}
		if (pillName === "jiangchen" && rIdx >= 5){
			return 0.70;
		}
		return 1.0;
	},

	//计算当前开炉炼丹的实际药材耗费(随本世炼制次数温和递增,并受丹道造诣减免)
	getPillCraftPrices: function(name){
		var pill = (typeof name === "object") ? name : this.getPill(name);
		if (!pill || !pill.prices){ return []; }
		var cnt = (this.pillCraftCount && this.pillCraftCount[pill.name]) || 0;
		var rankInfo = this.getAlchemyRank();
		var scale = (1 + Math.min(1.5, cnt * 0.08)) * rankInfo.costMult;
		var out = [];
		for (var i = 0; i < pill.prices.length; i++){
			var p = pill.prices[i];
			out.push({
				name: p.name,
				val: Math.max(1, Math.round(p.val * scale))
			});
		}
		return out;
	},

	canAffordPill: function(name){
		var prices = this.getPillCraftPrices(name);
		if (!prices.length){ return false; }
		for (var i = 0; i < prices.length; i++){
			var res = this.game.resPool.get(prices[i].name);
			if (!res || res.value < prices[i].val){ return false; }
		}
		return true;
	},

	//炼制入库 — 底层入库接口(保持单次 +1 以兼容全部旧单元测试)
	craftPill: function(name){
		var pill = this.getPill(name);
		if (pill){
			pill.val = (pill.val || 0) + 1;
			this.alchemyExp = (this.alchemyExp || 0) + 1;
		}
	},

	//玄天丹鼎交互开炉 — 校验药材、扣除耗费、结算三昧控火特效(文火祛毒/武火双丹/乾蓝丹纹)
	refinePill: function(name){
		var pill = this.getPill(name);
		if (!pill || !this.isPillUnlocked(pill)){ return false; }
		if (!this.canAffordPill(name)){
			this.game.msg("药材不足，无法开炉炼制【" + pill.label + "】。", "alert");
			return false;
		}
		var prices = this.getPillCraftPrices(name);
		for (var i = 0; i < prices.length; i++){
			this.game.resPool.addResEvent(prices[i].name, -prices[i].val);
		}
		if (!this.pillCraftCount){ this.pillCraftCount = {}; }
		this.pillCraftCount[name] = (this.pillCraftCount[name] || 0) + 1;
		if (!this.supremePills){ this.supremePills = {}; }

		this.craftPill(name);
		var hasDandao = this.hasMingge("dandao");
		if (hasDandao){
			this.alchemyExp = (this.alchemyExp || 0) + 1;	//丹道圣体:丹道造诣翻倍
			if (Math.random() < 0.55){
				pill.val = (pill.val || 0) + 1;				//丹道圣体:55% 额外多产 1 枚同阶灵丹
			}
		}
		var fire = this.getCauldronFire();
		var rankInfo = this.getAlchemyRank();
		var caveAlc = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
		var extraCrit = (caveAlc && caveAlc.alchemyCritBonus) || 0;
		var note = "";

		if (fire.key === "gentle"){
			//文火温养: 额外丹道造诣 + 顺带平复 4 点经脉丹毒
			this.alchemyExp = (this.alchemyExp || 0) + 1;
			var beforeTox = this.pillToxicity || 0;
			var gentleClr = 4 + (caveAlc && caveAlc.gentleDetoxBonus ? caveAlc.gentleDetoxBonus : 0);
			this.pillToxicity = Math.max(0, beforeTox - gentleClr);
			note = "【文火温养】慢火凝成【" + pill.label + "】×1，丹香涤脉（丹毒 -" + gentleClr + "，造诣 +2）。";
		} else if (fire.key === "fierce"){
			//武火催丹: 35% + 造诣加成 + 仙草/仙鼎加成 一炉双丹
			var dblChance = Math.min(0.85, 0.35 + rankInfo.critBonus + extraCrit);
			if (Math.random() < dblChance){
				pill.val = (pill.val || 0) + 1;
				note = "【武火催丹 · 一炉双丹】赤炎轰鸣，单份药材竟一举凝成【" + pill.label + "】×2！";
				this.game.msg(note, "important");
			} else {
				note = "【武火催丹】烈火淬炼，成功出炉【" + pill.label + "】×1。";
			}
		} else if (fire.key === "azure"){
			//乾蓝灵火: 30% + 造诣加成 + 仙草/仙鼎加成 凝出丹纹灵丹
			var supChance = Math.min(0.80, 0.30 + rankInfo.critBonus + extraCrit);
			if (Math.random() < supChance){
				this.supremePills[name] = (this.supremePills[name] || 0) + 1;
				note = "【乾蓝灵火 · 丹纹天成】冰焰交融霞光万道，凝出极品【✦丹纹" + pill.label + "】×1（药效+40% · 丹毒减半）！";
				this.game.msg(note, "important");
			} else {
				note = "【乾蓝灵火】冰火淬炼，成功出炉【" + pill.label + "】×1。";
			}
		}
		if (caveAlc){
			if (caveAlc.alchemyYieldChance > 0 && Math.random() < caveAlc.alchemyYieldChance){
				pill.val = (pill.val || 0) + 1;
			}
			if (caveAlc.alchemyExtraXy > 0){
				var xyResRef = this.game.resPool.get("xianyuan");
				if (xyResRef){ xyResRef.unlocked = true; }
				this.game.resPool.addResEvent("xianyuan", caveAlc.alchemyExtraXy);
			}
		}
		this.lastAlchemyNote = note;
		if (this.game.updateCaches){ this.game.updateCaches(); }
		return true;
	},

	//周天洗髓 · 运功逼毒 — 主动运转功法逼出经脉淤积的丹毒
	purgeToxicity: function(){
		if ((this.pillToxicity || 0) <= 0){
			this.game.msg("当前周天经脉澄澈，并无丹毒淤积。", "notice");
			return false;
		}
		var catnipRes = this.game.resPool.get("catnip");
		var cost = 0;
		if (catnipRes && catnipRes.value >= 40){
			cost = Math.min(160, Math.max(20, Math.round(catnipRes.value * 0.12)));
			this.game.resPool.addResEvent("catnip", -cost);
		}
		var rankInfo = this.getAlchemyRank();
		var purgeAmt = Math.round(25 * (rankInfo.detoxMult || 1));
		var before = Math.round(this.pillToxicity || 0);
		this.pillToxicity = Math.max(0, (this.pillToxicity || 0) - purgeAmt);
		this.heartDemon = Math.max(0, this.heartDemon - 3);
		var after = Math.round(this.pillToxicity);
		var note = "【周天洗髓】引灵泉运转大周天，逼出体内淤积丹毒 " + (before - after) + " 点（当前丹毒 " + after + "/100），心魔 -3。";
		this.lastAlchemyNote = note;
		this.game.msg(note, "notice");
		if (this.game.updateCaches){ this.game.updateCaches(); }
		return true;
	},

	//服用消耗 — returns false when nothing to consume / nothing to gain,
	//so the button never silently eats a pill
	usePill: function(name){
		if (name && typeof name == "object"){ name = name.name; }
		var pill = this.getPill(name);
		if (!pill || !pill.val){ return false; }

		var toxStatus = this.getToxicityStatus();
		var isCleansing = (name === "qingxin" || name === "peiying");

		//丹毒攻心(>=90)时经脉排斥一切增幅与破境猛药,唯有净心祛毒类丹药可服
		if (!isCleansing && toxStatus.blocked){
			this.game.msg("【丹毒攻心】经脉丹毒已达 " + toxStatus.val + "/100，强服猛药恐致经脉寸断！请先【周天洗髓】或服用【清心丹/培婴丹】祛毒。", "alert");
			return false;
		}

		if (name == "zhujidan" && this.breakMult >= 0.5){
			this.game.msg($I("cultivation.msg.pill.maxed"), "notice");
			return false;	//药力已达顶峰——丹药留着下次冲关再用
		}
		if (name == "qingxin" && this.heartDemon <= 0 && (this.pillToxicity || 0) <= 0){
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
		if (name == "peiying" && this.heartDemon <= 0 && this.getBreakSurge() <= 1 && (this.pillToxicity || 0) <= 0){
			this.game.msg($I("cultivation.msg.pill.clean"), "notice");
			return false;
		}
		if (name == "biyan" && this.buffs.biyan > 0){
			this.game.msg($I("cultivation.msg.pill.maxed"), "notice");
			return false;
		}

		pill.val--;
		var isSupreme = false;
		if (this.supremePills && this.supremePills[name] > 0){
			this.supremePills[name]--;
			isSupreme = true;
		}

		var cavePill = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
		var herbPotMult = 1 + ((cavePill && cavePill.pillPotencyBonus) || 0);
		var herbToxFactor = 1 - ((cavePill && cavePill.toxReduction) || 0);
		var durMult = (isSupreme ? 1.4 : 1.0) * toxStatus.effMult * herbPotMult;
		var baseDur = Math.max(300, Math.round(1500 * durMult));
		var fire = this.getCauldronFire();
		var toxMult = (fire.key === "gentle" ? 0.70 : 1.0) * (isSupreme ? 0.50 : 1.0) * (this.hasMingge("dandao") ? 0.50 : 1.0) * herbToxFactor;

		if (name == "juqi"){
			this.buffs.juqi = baseDur;	//标准 1500 ticks (~5 min), 丹纹 2100 ticks
			if (isSupreme){ this.buffs.juqiSupreme = baseDur; }
			this.pillToxicity = Math.min(100, (this.pillToxicity || 0) + Math.round(18 * toxMult));
			this.game.msg($I("cultivation.msg.pill.juqi"), "notice");
		} else if (name == "zhujidan"){
			var zjEff = isSupreme ? 1.0 : this.getPillRealmEfficacy("zhujidan");
			this.breakMult = Math.min(0.5, this.breakMult + 0.5 * zjEff * toxStatus.effMult);
			if (isSupreme){
				this.heartDemon = Math.max(0, this.heartDemon - 8);
			}
			this.pillToxicity = Math.min(100, (this.pillToxicity || 0) + Math.round(26 * toxMult));
			this.game.msg($I("cultivation.msg.pill.zhujidan"), "notice");
		} else if (name == "qingxin"){
			var demonClr = isSupreme ? 24 : 15;
			var toxClr = isSupreme ? 28 : 18;
			this.heartDemon = Math.max(0, this.heartDemon - demonClr);
			this.pillToxicity = Math.max(0, (this.pillToxicity || 0) - toxClr);
			this.game.msg($I("cultivation.msg.pill.qingxin"), "notice");
		} else if (name == "jiangchen"){
			var jcBoost = (isSupreme ? 0.35 : 0.25) * toxStatus.effMult;
			this.breakMult = Math.min(0.65, (this.breakMult || 0) + jcBoost);
			this.buffs.jiangchen = baseDur;
			this.pillToxicity = Math.min(100, (this.pillToxicity || 0) + Math.round(24 * toxMult));
			this.game.msg($I("cultivation.msg.pill.jiangchen"), "notice");
		} else if (name == "peiying"){
			var pyDemon = isSupreme ? 45 : 30;
			var pyTox = isSupreme ? 50 : 35;
			this.lastBreakYear = null;
			this.heartDemon = Math.max(0, this.heartDemon - pyDemon);
			this.pillToxicity = Math.max(0, (this.pillToxicity || 0) - pyTox);
			this.game.msg($I("cultivation.msg.pill.peiying"), "notice");
		} else if (name == "biyan"){
			this.buffs.biyan = baseDur;
			if (isSupreme){ this.buffs.biyanSupreme = baseDur; }
			this.pillToxicity = Math.min(100, (this.pillToxicity || 0) + Math.round(22 * toxMult));
			this.game.msg($I("cultivation.msg.pill.biyan"), "notice");
		}

		this.lastAlchemyNote = "已服下" + (isSupreme ? "【✦丹纹" + pill.label + "】" : "【" + pill.label + "】") +
			"，当前经脉丹毒：" + Math.round(this.pillToxicity || 0) + "/100。";
		if (this.game.updateCaches){ this.game.updateCaches(); }
		return true;
	},

	//凝露瓶绿液催熟——耗1滴绿液,凭空催成2枚当前已解锁的最高阶丹药(必含1枚✦丹纹灵丹),馈赠灵草灵香并涤荡15点丹毒
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
		if (!this.supremePills){ this.supremePills = {}; }
		this.supremePills[target.name] = (this.supremePills[target.name] || 0) + 1;
		this.pillToxicity = Math.max(0, (this.pillToxicity || 0) - 15);
		this.alchemyExp = (this.alchemyExp || 0) + 2;
		var scale = 1 + this.getCurrentRealmIndex();
		this.game.resPool.addResEvent("wood", this.roundNice(10 * scale));
		this.game.resPool.addResEvent("catnip", this.roundNice(40 * scale));
		this.lastAlchemyNote = "【掌天绿液催熟】造化绿液滴入丹炉，瞬间凝成【" + target.label + "】×2（含✦丹纹极品×1），并涤除 15 点丹毒！";
		this.game.msg($I("cultivation.msg.dew.catalyze", [target.label]), "important");
		if (this.game.updateCaches){ this.game.updateCaches(); }
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

	// ---------------- 修为境界隐性伪上限 (Hidden Realm Soft-Cap / Bottleneck Decay) ----------------
	//每个境界达到当前道途瓶颈阈值后，修为增长速度平滑渐近衰减并无限趋近于 0，但界面绝不向玩家展示上限数值；
	//一旦突破至下一小层或大境界，瓶颈阈值立即抬升，修为吐纳与历练增速随即恢复如初。
	getXiuweiSoftCapKnee: function(){
		var priceMult = this.getBreakCostMult ? this.getBreakCostMult() : ((this.getRoot() && this.getRoot().priceMult) || 1);
		var hi = this.getHighestStageIndex();
		var nextStage = (hi + 1 < this.stages.length) ? this.stages[hi + 1] : null;
		if (!nextStage){
			for (var i = 0; i < this.stages.length; i++){
				if (!this.stages[i].researched){ nextStage = this.stages[i]; break; }
			}
		}

		var nextXw = 0, effectiveNextXw = 0, fallbackXw = 200;
		for (var s = 0; s < this.stages.length; s++){
			var st = this.stages[s];
			for (var p = 0; p < st.prices.length; p++){
				if (st.prices[p].name === "xiuwei"){
					fallbackXw = st.prices[p].val * priceMult;
					break;
				}
			}
		}
		if (nextStage && nextStage.prices){
			for (var j = 0; j < nextStage.prices.length; j++){
				if (nextStage.prices[j].name === "xiuwei"){
					nextXw = nextStage.prices[j].val * priceMult;
					var taxMult = (nextStage.chance != null && nextStage.chance < 1) ?
						(this.getDemonTax() * this.getBreakSurge()) : 1;
					effectiveNextXw = nextXw * taxMult;
					break;
				}
			}
		} else {
			//飞升圆满后锚定末层修为价的 2.5 倍
			nextXw = fallbackXw * 2.5;
			effectiveNextXw = nextXw;
		}

		//兼顾当前已解锁但未参悟的灵脉/宗门修为开销，确保瓶颈阈值从不卡死正常养成项
		var auxXw = 0;
		if (this.veins){
			for (var v = 0; v < this.veins.length; v++){
				var vn = this.veins[v];
				if (!vn.researched && this.isVeinUnlocked && this.isVeinUnlocked(vn) && vn.prices){
					for (var vp = 0; vp < vn.prices.length; vp++){
						if (vn.prices[vp].name === "xiuwei" && vn.prices[vp].val > auxXw){
							auxXw = vn.prices[vp].val;
						}
					}
				}
			}
		}
		if (this.sects){
			for (var sc = 0; sc < this.sects.length; sc++){
				var se = this.sects[sc];
				if (!se.researched && this.isSectUnlocked && this.isSectUnlocked(se) && se.prices){
					for (var sp = 0; sp < se.prices.length; sp++){
						if (se.prices[sp].name === "xiuwei" && se.prices[sp].val > auxXw){
							auxXw = se.prices[sp].val;
						}
					}
				}
			}
		}

		return Math.max(200, nextXw * 1.35, effectiveNextXw * 1.25, auxXw * 1.15);
	},

	getXiuweiSoftCapMult: function(customXiuwei){
		var xw = (typeof customXiuwei === "number" && !isNaN(customXiuwei)) ? customXiuwei :
			((this.game && this.game.resPool && this.game.resPool.get("xiuwei")) ?
				(this.game.resPool.get("xiuwei").value || 0) : 0);
		var knee = this.getXiuweiSoftCapKnee();
		if (!(knee > 0) || xw <= knee){
			return 1;
		}
		var over = (xw - knee) / knee;
		//超过当前境界瓶颈阈值后平滑渐近衰减，随超出倍数递增无限趋近于 0 (lim_{over->inf} mult = 0)
		var u = Math.log1p(over * 3);
		return 1 / (1 + 1.8 * u + 1.5 * u * u + 1.0 * u * u * u);
	},

	applyXiuweiSoftCap: function(amt){
		if (!(amt > 0)){ return 0; }
		var curXw = (this.game && this.game.resPool && this.game.resPool.get("xiuwei")) ?
			(this.game.resPool.get("xiuwei").value || 0) : 0;
		var knee = this.getXiuweiSoftCapKnee();
		if (!(knee > 0) || (curXw + amt) <= knee){
			return amt;
		}
		var freePart = Math.max(0, knee - curXw);
		var excess = Math.max(0, amt - freePart);
		var midXw = Math.max(curXw, knee) + excess * 0.5;
		var scaled = freePart + excess * this.getXiuweiSoftCapMult(midXw);
		if (scaled >= 10){
			return Math.round(scaled);
		}
		return Math.max(0.01, Math.round(scaled * 1000) / 1000);
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
			if (!anchor && xw){ anchor = xw * (this.getBreakCostMult ? this.getBreakCostMult() : this.getRoot().priceMult); }
		}
		if (!anchor){ anchor = fallback; }	//全境圆满后锚定末层价
		return this.roundNice(Math.max(1, anchor * share / (1 + cleared * 0.05)));
	},

	// ---------------- 历练行动:共享调息 ----------------
	//游历/闭关/秘境/上古秘境共用一支气脉——闭关吐纳间不可分身外出,
	//出关散功间也不可径入秘境。actionCd 是四者共同的冷却。

	setActionCd: function(ticks){
		var cdMult = this.hasMingge("zhenyan") ? 0.75 : 1;
		var effTicks = Math.max(1, Math.round(ticks * cdMult));
		this.actionCd = this.actionCdMax = effTicks;
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
		var hasQiyun = this.hasMingge("qiyun");
		var qiyunMult = hasQiyun ? 2.0 : 1.0;
		var scale = (1 + realmIdx * 0.8) * (hasSwords ? 1.5 : 1) * qiyunMult;
		var ambushMin = hasSwords ? 88 : 83;	//蜂云剑护体:伏击窗口进一步收窄
		var addRes = this.game.resPool.addResEvent.bind(this.game.resPool);
		var fmt = this.game.getDisplayValueExt.bind(this.game);

		//行脚吐纳保底——每次游历归来必有一份修为感悟入账,绝不空手而归
		var baseXw = this.applyXiuweiSoftCap(Math.max(1, Math.round(this.breakPayout(this.WANDER_PAY * 0.35 * (hasSwords ? 1.5 : 1) * qiyunMult))));
		addRes("xiuwei", baseXw);

		var roll = Math.random() * 100;
		if (roll < 25){
			var amt = this.roundNice(35 * scale);
			addRes("minerals", amt);
			this.game.msg($I("cultivation.msg.wander.minerals", [fmt(amt)]), "notice");
		} else if (roll < 44){
			var amt = this.roundNice(6 * scale);
			addRes("wood", amt);
			addRes("catnip", this.roundNice(30 * scale));
			this.game.msg($I("cultivation.msg.wander.spice", [fmt(amt)]), "notice");
		} else if (roll < 64){
			var amt = this.applyXiuweiSoftCap(this.breakPayout(this.WANDER_PAY * (hasSwords ? 1.5 : 1) * qiyunMult));
			addRes("xiuwei", amt);
			this.game.msg($I("cultivation.msg.wander.xiuwei", [fmt(amt + baseXw)]), "notice");
		} else if (roll < 75){
			var amt = this.roundNice(25 * scale);
			addRes("minerals", amt);
			this.game.msg($I("cultivation.msg.wander.iron", [fmt(amt)]), "notice");
		} else if (roll < ambushMin){
			var amt = Math.max(1, Math.round(0.6 * scale));
			addRes("relic", amt);
			this.game.msg($I("cultivation.msg.wander.relic", [amt]), "important");
		} else if (roll < 92){
			//炼气新手保护 / 气运之子逢凶化吉——不遇劫修折损,反得奇遇造化
			if (realmIdx === 0 || hasQiyun){
				var spXw = this.applyXiuweiSoftCap(this.breakPayout(this.WANDER_PAY * qiyunMult));
				addRes("xiuwei", spXw);
				addRes("minerals", this.roundNice(20 * scale));
				addRes("wood", 2);
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

	//九枚玄天与真仙道印:通关指定大秘境层数永久点亮,加持修为、万产与战力
	RIFT_SEALS: [
		{floor: 3,  key: "xuejin",   label: "血禁灵印", desc: "修为吐纳 +15%", xiuweiRatio: 0.15},
		{floor: 6,  key: "xutian",   label: "虚天丹印", desc: "洞府万产 +15%", realmProductionRatio: 0.15},
		{floor: 9,  key: "kunwu",    label: "昆吾剑印", desc: "斗法战力 +20%", combatMult: 0.20},
		{floor: 12, key: "zhuimo",   label: "坠魔元印", desc: "修为吐纳 +30%", xiuweiRatio: 0.30},
		{floor: 15, key: "xuantian", label: "玄天真印", desc: "万产+30% · 战力+30%", realmProductionRatio: 0.30, combatMult: 0.30},
		{floor: 20, key: "jiemian",  label: "界面道印", desc: "修为吐纳 +50%", xiuweiRatio: 0.50},
		{floor: 25, key: "feisheng", label: "飞升仙印", desc: "万产+40% · 战力+40%", realmProductionRatio: 0.40, combatMult: 0.40},
		{floor: 30, key: "taiyi",    label: "太乙道印", desc: "修为+80% · 战力+50%", xiuweiRatio: 0.80, combatMult: 0.50},
		{floor: 35, key: "hunyuan",  label: "混元金印", desc: "修为+120% · 万产+60% · 战力+80%", xiuweiRatio: 1.20, realmProductionRatio: 0.60, combatMult: 0.80}
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
		if (f <= 25){ return {name: "真仙界缝·混沌墟", boss: $I("cultivation.grift.boss.5")}; }
		if (f <= 30){ return {name: "九幽冥仙界·法则断层", boss: $I("cultivation.grift.boss.6")}; }
		return {name: "三十三天外·紫霄雷池", boss: $I("cultivation.grift.boss.7")};
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
		var baseXwGain = this.breakPayout(this.RIFT_PAY * depthMult);
		var xwGain = this.applyXiuweiSoftCap(baseXwGain);
		var minGain = 0, relicGain = 0, keyGain = 0, demonDelta = 0, artDropped = false;
		var note = "";

		if (optKey === "b"){
			//稳健/净心路线
			if (roomKey === "herb"){
				minGain = this.roundNice(25 * scale);
				addRes("wood", this.roundNice(10 * scale));
				note = "引开赤练妖蟒，稳妥采得千年灵药，修为 +" + fmt(xwGain) + "，灵石 +" + fmt(minGain);
			} else if (roomKey === "cave"){
				addRes("science", this.roundNice(25 * scale));
				demonDelta = -5;
				note = "礼拜古修遗骸参悟残篇，修为 +" + fmt(xwGain) + "，心魔净除 5 点";
			} else if (roomKey === "ambush"){
				minGain = this.roundNice(35 * scale * (stance.key === "stealth" ? 1.6 : 1));
				if (stance.key === "stealth" && Math.random() < 0.40){ keyGain = 1; }
				note = "敛息暗取战场储物袋，修为 +" + fmt(xwGain) + "，灵石 +" + fmt(minGain) + (keyGain ? "，顺走【秘境令】×1！" : "");
			} else if (roomKey === "spring"){
				relicGain = 1 + (stance.relicBonus || 0);
				minGain = this.roundNice(25 * scale);
				note = "拓印太古残阵收取阵石，修为 +" + fmt(xwGain) + "，上古遗宝 +" + relicGain;
			} else if (roomKey === "fog"){
				demonDelta = -8;
				note = "运转清心法诀穿过阴冥鬼雾，修为 +" + fmt(xwGain) + "，心魔净除 8 点";
			} else {
				//altar optB: 星辰灌顶
				xwGain = this.applyXiuweiSoftCap(Math.round(baseXwGain * 1.5));
				demonDelta = -10;
				relicGain = 1;
				note = "引动祭坛星辰大阵醍醐灌顶！修为暴涨 +" + fmt(xwGain) + "，上古遗宝 +1，心魔净除 10 点！";
			}
		} else {
			//进取/夺宝路线 (optA)
			var qiyunBonus = this.hasMingge("qiyun") ? 0.25 : 0;
			var keyChance = 0.30 + (stance.keyBonus || 0) + qiyunBonus;
			var artDropMult = (stance.artifactMult || 1) + qiyunBonus;
			if (roomKey === "herb"){
				xwGain = this.applyXiuweiSoftCap(Math.round(baseXwGain * 1.25));
				addRes("catnip", this.roundNice(45 * scale));
				if (Math.random() < keyChance){ keyGain = 1; }
				note = "剑斩赤练妖蟒夺取千年血线蛟藤！修为 +" + fmt(xwGain) + (keyGain ? "，斩获妖丹【秘境令】×1！" : "");
			} else if (roomKey === "cave"){
				relicGain = (stance.key === "array" ? 2 : 1);
				if (Math.random() < 0.25 * artDropMult){
					artDropped = this.rollArtifactDrop(scale);
				}
				note = "神识推演破开古修禁制！修为 +" + fmt(xwGain) + "，获【上古遗宝】×" + relicGain + (artDropped ? "，更得古宝认主！" : "");
			} else if (roomKey === "ambush"){
				xwGain = this.applyXiuweiSoftCap(Math.round(baseXwGain * 1.2));
				if (Math.random() < Math.min(0.85, keyChance + 0.20)){ keyGain = 1; }
				minGain = this.roundNice(25 * scale);
				note = "黄雀在后雷霆出手！修为 +" + fmt(xwGain) + (keyGain ? "，夺得【秘境令】×1！" : "，缴获灵石 +" + fmt(minGain));
			} else if (roomKey === "spring"){
				xwGain = this.applyXiuweiSoftCap(Math.round(baseXwGain * (stance.key === "sword" ? 1.55 : 1.35)));
				note = "盘膝泉眼鲸吞万年灵乳，周天轰鸣！修为暴涨 +" + fmt(xwGain) + "！";
			} else if (roomKey === "fog"){
				if (Math.random() < 0.38 * artDropMult){
					artDropped = this.rollArtifactDrop(scale);
				} else {
					relicGain = 1;
				}
				note = "催动真火炼化阴冥残魂！修为 +" + fmt(xwGain) + (artDropped ? "，霞光中一件秘境古宝破雾而出！" : "，凝得【上古遗宝】×1");
			} else {
				//altar optA: 破开虚天古宝匣
				xwGain = this.applyXiuweiSoftCap(Math.round(baseXwGain * 1.3));
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
		var bonusXw = this.applyXiuweiSoftCap(this.breakPayout(this.RIFT_PAY * 0.35 * exp.step));
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

		var amt = this.applyXiuweiSoftCap(this.breakPayout(this.RIFT_PAY));
		addRes("xiuwei", amt);
		this.game.msg($I("cultivation.msg.rift.xiuwei", [fmt(amt)]), "notice");

		var roll = Math.random();
		var resultCls = "ok", resultText = $I("cultivation.rift.result.plain");
		if (roll < 0.3){
			this.riftKeys++;
			this.game.msg($I("cultivation.msg.rift.key"), "important");
			resultText = $I("cultivation.rift.result.key");
		} else if (roll < 0.4){
			var m = this.roundNice(30 * scale);
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
				var spoils = this.applyXiuweiSoftCap(this.breakPayout(this.AMBUSH_PAY));
				addRes("xiuwei", spoils);
				addRes("minerals", this.roundNice(15 * scale));
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
		this.startRiftBattle("lesser", true, amt);
		this.setLastAction(resultCls, resultText);
		return true;
	},

	// ---------------- 秘境 & 上古大秘境 · 回合制斗法系统 ----------------

	COMBAT_SKILLS: [
		{
			key: "strike",
			label: "⚔ 御剑斩",
			cost: 0,
			gainMp: 25,
			tag: "回气 +25",
			desc: "110% 剑气斩击 · 若自身持有护盾则触发【剑盾齐鸣】额外增伤 +35%"
		},
		{
			key: "skill",
			label: "⚡ 青元剑阵",
			cost: 35,
			gainMp: 0,
			tag: "耗气 35",
			desc: "175% 剑阵绞杀 · 对敌方护盾造成 2.5 倍破甲伤害，并附加 2 回合【破甲】(易伤 +30%)"
		},
		{
			key: "guard",
			label: "☯ 玄水灵盾",
			cost: 0,
			gainMp: 15,
			tag: "回气 +15",
			desc: "凝结 140% 攻击力灵盾并立下【反震剑势】 · 若敌方施展蓄力杀招则触发【太极反震】！"
		},
		{
			key: "ult",
			label: "✨ 法宝镇压",
			cost: 55,
			gainMp: 0,
			tag: "耗气 55",
			desc: "催动本命法宝轰出 245% 无视防御与护盾减免的纯阳真伤，恢复 28% 气血并净化全部负面状态"
		}
	],

	RIFT_MONSTERS: {
		viper: {
			key: "viper",
			name: "赤练妖蟒",
			icon: "蟒",
			tier: "秘境妖兽",
			traitTitle: "剧毒噬灵",
			traitDesc: "毒牙噬咬附加2回合【蛇毒】(每回合损血6%并噬减15真元)；惧怕纯阳法宝，受【法宝镇压】伤害+25%",
			hpMult: 0.90,
			atkMult: 0.96,
			defMult: 0.80,
			startShieldRatio: 0,
			pattern: ["curse", "strike", "heavy"]
		},
		puppet: {
			key: "puppet",
			name: "铁甲尸傀",
			icon: "傀",
			tier: "古修机关",
			traitTitle: "玄铁重甲",
			traitDesc: "入场自带35%玄铁护盾，有盾时减免35%普通剑伤；护盾被击碎时核心反噬自损10%气血并陷入2回合【破绽】",
			hpMult: 1.05,
			atkMult: 0.92,
			defMult: 1.25,
			startShieldRatio: 0.35,
			pattern: ["strike", "guard", "heavy"]
		},
		wraith: {
			key: "wraith",
			name: "阴冥鬼母",
			icon: "鬼",
			tier: "幽冥凶魂",
			traitTitle: "摄魂魔音",
			traitDesc: "鬼爪攻击无视50%护盾直伤气血并吸取真元；受纯阳【法宝镇压】额外加深35%伤害",
			hpMult: 0.88,
			atkMult: 1.04,
			defMult: 0.75,
			startShieldRatio: 0.12,
			pattern: ["curse", "heavy", "strike"]
		},
		mantis: {
			key: "mantis",
			name: "金背妖螂",
			icon: "螂",
			tier: "嗜血荒兽",
			traitTitle: "嗜血狂暴",
			traitDesc: "双镰疾斩连击；气血低于50%时触发【嗜血狂暴】，攻击力暴涨+45%、防御力降低30%",
			hpMult: 0.92,
			atkMult: 1.10,
			defMult: 0.85,
			startShieldRatio: 0,
			pattern: ["strike", "heavy", "strike"]
		},
		frostwyrm: {
			key: "frostwyrm",
			name: "双首寒蛟",
			icon: "蛟",
			tier: "寒潭大妖",
			traitTitle: "极寒龙息",
			traitDesc: "吐息附加2回合【寒霜】使修士真元获取减半，并可凝结寒冰龙鳞护盾",
			hpMult: 1.06,
			atkMult: 1.00,
			defMult: 1.05,
			startShieldRatio: 0.20,
			pattern: ["curse", "guard", "heavy"]
		},
		bloodcult: {
			key: "bloodcult",
			name: "血禁邪修",
			icon: "魔",
			tier: "守关统领",
			traitTitle: "化血魔功",
			traitDesc: "攻击将45%伤害化为自身气血；蓄力【血煞魔雷】若被【玄水灵盾】反震则魔功反噬自损15%气血",
			hpMult: 1.15,
			atkMult: 1.08,
			defMult: 1.00,
			startShieldRatio: 0.15,
			pattern: ["heavy", "curse", "strike", "heavy"]
		}
	},

	GRIFT_BOSSES: [
		{
			maxFloor: 3,
			key: "mojiaowang",
			name: "千年墨蛟王",
			zone: "血色禁地·环形山",
			icon: "蛟",
			tier: "镇狱妖王",
			traitTitle: "毒沼再生 · 墨毒狂澜",
			traitDesc: "每回合再生5%气血并侵染剧毒；蓄力【墨毒狂澜】若被【玄水灵盾】反震则破防受创+40%",
			hpMult: 1.05,
			atkMult: 1.00,
			defMult: 0.95,
			startShieldRatio: 0.15,
			pattern: ["curse", "heavy", "strike", "heavy"]
		},
		{
			maxFloor: 6,
			key: "jinjia",
			name: "金甲镇殿傀儡",
			zone: "虚天内殿·冰火道",
			icon: "甲",
			tier: "太古机关王",
			traitTitle: "不灭金身 · 元磁极光",
			traitDesc: "入场自带45%金罡护盾且有盾减伤35%；护盾被【青元剑阵】击碎时陷入【核心过载】受创+50%",
			hpMult: 1.12,
			atkMult: 0.98,
			defMult: 1.25,
			startShieldRatio: 0.45,
			pattern: ["guard", "heavy", "strike", "heavy"]
		},
		{
			maxFloor: 9,
			key: "yinlang",
			name: "双首银狼王",
			zone: "昆吾仙山·镇魔渊",
			icon: "狼",
			tier: "天狼妖圣",
			traitTitle: "月华双生 · 天狼啸月",
			traitDesc: "双首连击无视35%护盾；半血以下触发【月华狂暴】攻击+40%且每回合恢复4%气血",
			hpMult: 1.08,
			atkMult: 1.12,
			defMult: 0.92,
			startShieldRatio: 0.20,
			pattern: ["strike", "heavy", "curse", "heavy"]
		},
		{
			maxFloor: 15,
			key: "gumo",
			name: "古魔血影",
			zone: "坠魔古渊·血焰坛",
			icon: "魔",
			tier: "域外古魔",
			traitTitle: "魔魂夺魄 · 天魔血爆",
			traitDesc: "攻击汲取45%气血并侵染魔毒；蓄力【天魔血爆】被【玄水灵盾】反震时反噬自身12%气血",
			hpMult: 1.15,
			atkMult: 1.14,
			defMult: 1.05,
			startShieldRatio: 0.25,
			pattern: ["curse", "heavy", "strike", "heavy"]
		},
		{
			maxFloor: 25,
			key: "zhenxian",
			name: "真仙法则化身",
			zone: "真仙界缝·混沌墟",
			icon: "仙",
			tier: "法则真灵",
			traitTitle: "万法归墟 · 仙罡天罚",
			traitDesc: "每回合恢复5%气血并凝结12%仙罡护盾；蓄力【九天仙罚】唯有【玄水灵盾】反震可破",
			hpMult: 1.22,
			atkMult: 1.18,
			defMult: 1.15,
			startShieldRatio: 0.35,
			pattern: ["heavy", "guard", "curse", "heavy"]
		},
		{
			maxFloor: 30,
			key: "yaoxian",
			name: "太乙蚀道妖仙",
			zone: "九幽冥仙界·法则断层",
			icon: "妖",
			tier: "上界妖仙",
			traitTitle: "蚀道仙煞 · 万古妖罡",
			traitDesc: "攻击附加蚀道魔煞并凝结30%妖仙罡盾；蓄力【太乙灭仙击】唯有【玄水灵盾】反震可破",
			hpMult: 1.28,
			atkMult: 1.24,
			defMult: 1.18,
			startShieldRatio: 0.40,
			pattern: ["heavy", "curse", "strike", "heavy"]
		},
		{
			maxFloor: 999,
			key: "yaoxian",
			name: "混元天魔仙尊",
			zone: "三十三天外·紫霄雷池",
			icon: "尊",
			tier: "仙界霸主",
			traitTitle: "紫霄寂灭 · 诸天沉沦",
			traitDesc: "每回合恢复6%仙躯并穿透护甲；蓄力【混元寂灭劫】被【玄水灵盾】反震时承受天道反噬",
			hpMult: 1.35,
			atkMult: 1.30,
			defMult: 1.22,
			startShieldRatio: 0.45,
			pattern: ["curse", "heavy", "guard", "heavy"]
		}
	],

	getMonsterDef: function(key){
		return this.RIFT_MONSTERS[key] || this.RIFT_MONSTERS.viper;
	},

	getBossDef: function(floor){
		var f = Math.max(1, floor || 1);
		for (var i = 0; i < this.GRIFT_BOSSES.length; i++){
			if (f <= this.GRIFT_BOSSES[i].maxFloor){
				return this.GRIFT_BOSSES[i];
			}
		}
		return this.GRIFT_BOSSES[this.GRIFT_BOSSES.length - 1];
	},

	getNextMonsterWaveKeys: function(seedVal){
		var s = (seedVal != null) ? seedVal : ((this.stats.rift || 0) + (this.actionSeq || 0) + 1);
		var w1Pool = ["viper", "puppet", "mantis"];
		var w2Pool = ["wraith", "frostwyrm", "puppet"];
		var w3Pool = ["bloodcult", "frostwyrm"];
		var k1 = w1Pool[s % w1Pool.length];
		var k2 = w2Pool[(s + 1) % w2Pool.length];
		if (k2 === k1){ k2 = w2Pool[(s + 2) % w2Pool.length]; }
		var k3 = w3Pool[s % w3Pool.length];
		return [k1, k2, k3];
	},

	describeEnemyIntent: function(enemy){
		if (!enemy){
			return {key: "strike", title: "⚔ 凶煞扑击", desc: "蓄势待发", counter: "宜用【御剑斩】抢攻"};
		}
		var self = this;
		var iFmt = function(n){
			var v = Math.round(n);
			return (v >= 10000 && self.game && self.game.getDisplayValueExt)
				? self.game.getDisplayValueExt(v, false, false, 1)
				: String(v);
		};
		var intent = enemy.intent || "strike";
		var atk = enemy.atk || 20;
		if (enemy.enraged){ atk = Math.round(atk * 1.42); }
		if (intent === "heavy"){
			var hDmg = Math.round(atk * 1.65);
			return {
				key: "heavy",
				title: "✦ 蓄力杀招",
				desc: "预计轰出 ~" + iFmt(hDmg) + " 点狂暴重击",
				counter: "破招：施展【☯ 玄水灵盾】触发太极反震！"
			};
		}
		if (intent === "guard"){
			var sGain = Math.round((enemy.maxHp || 100) * 0.28);
			return {
				key: "guard",
				title: "◈ 妖罡凝盾",
				desc: "凝结 ~" + iFmt(sGain) + " 点护盾并反击",
				counter: "破招：施展【⚡ 青元剑阵】2.5倍破盾碎甲！"
			};
		}
		if (intent === "curse"){
			var cDmg = Math.round(atk * 0.85);
			return {
				key: "curse",
				title: "☠ 妖术蚀灵",
				desc: "造成 ~" + iFmt(cDmg) + " 伤害并附加剧毒/寒霜/蚀气",
				counter: "破招：施展【✨ 法宝镇压】涤荡净化全异常！"
			};
		}
		var sDmg = Math.round(atk * (enemy.key === "mantis" || enemy.key === "yinlang" ? 1.25 : 1.0));
		return {
			key: "strike",
			title: "⚔ 凶煞扑击",
			desc: "预计造成 ~" + iFmt(sDmg) + " 点扑击伤害",
			counter: "应对：【⚔ 御剑斩】聚气或【⚡ 青元剑阵】压制"
		};
	},

	spawnBattleMonster: function(mode, waveOrFloor, waveKeys){
		var cp = Math.max(10, this.getCombatPower());
		var def, basePower, hpMult = 2.4, atkMult = 0.60, defMult = 0.16;
		if (mode === "greater"){
			var floor = Math.max(1, waveOrFloor || (this.riftFloor + 1));
			def = this.getBossDef(floor);
			basePower = Math.max(20, this.floorPower(floor));
			hpMult = 3.5;
			atkMult = 0.68;
			defMult = 0.18;
		} else {
			var wave = Math.max(1, Math.min(3, waveOrFloor || 1));
			var keys = waveKeys || this.getNextMonsterWaveKeys();
			var mKey = keys[wave - 1] || "viper";
			def = this.getMonsterDef(mKey);
			var wScale = wave === 1 ? 0.66 : (wave === 2 ? 0.82 : 0.98);
			//小秘境妖兽锚定同境界裸基准战力,令多灵根/猎户/法宝的同阶战力加成为真实优势
			var realmCp = this.getBaseRealmCombatPower ? this.getBaseRealmCombatPower() : cp;
			basePower = Math.max(12, realmCp * wScale);
		}
		var maxHp = Math.max(60, Math.round(basePower * hpMult * (def.hpMult || 1)));
		var atk = Math.max(12, Math.round(basePower * atkMult * (def.atkMult || 1)));
		var eDef = Math.max(4, Math.round(basePower * defMult * (def.defMult || 1)));
		var shield = Math.round(maxHp * (def.startShieldRatio || 0));
		var pattern = def.pattern || ["strike", "heavy"];
		return {
			key: def.key,
			name: def.name,
			icon: def.icon || "妖",
			tier: def.tier || "秘境妖兽",
			traitTitle: def.traitTitle,
			traitDesc: def.traitDesc,
			hp: maxHp,
			maxHp: maxHp,
			shield: shield,
			atk: atk,
			def: eDef,
			pattern: pattern.slice(),
			intentIdx: 0,
			intent: pattern[0],
			armorBreak: 0,
			expose: 0,
			enraged: false,
			overloaded: false
		};
	},

	startRiftBattle: function(mode, fromRift, entryXw){
		if (!this.isRiftUnlocked()){ return false; }
		var bMode = (mode === "greater") ? "greater" : "lesser";
		if (!fromRift){
			if (!this.canAct()){ return false; }
			if (bMode === "greater"){
				if (this.riftKeys <= 0){
					this.game.msg($I("cultivation.msg.rift.nokey"), "alert");
					return false;
				}
				this.riftKeys--;
				this.setActionCd(this.RIFT_CD * (this.getFate("fenglei").researched ? 0.5 : 1));
			} else {
				return this.rift();
			}
		}

		var cp = Math.max(10, this.getCombatPower());
		var hasHuanggu = this.hasMingge("huanggu");
		var maxHp = Math.max(120, Math.round(cp * 4.5 * (hasHuanggu ? 1.45 : 1)));
		var atk = Math.max(24, Math.round(cp * 0.92));
		var pDef = Math.max(8, Math.round(cp * 0.24 * (hasHuanggu ? 1.35 : 1)));
		var floor = (bMode === "greater") ? (this.riftFloor + 1) : (this.riftFloor || 1);
		var seed = (this.stats.rift || 1) + (this.actionSeq || 0);
		var waveKeys = this.getNextMonsterWaveKeys(seed);
		var enemy = this.spawnBattleMonster(bMode, bMode === "greater" ? floor : 1, waveKeys);

		var nArt = this.natalArtifact ? this.getArtifact(this.natalArtifact) : null;
		var natalName = (nArt && nArt.researched) ? nArt.label : "青竹蜂云剑";
		var caveStart = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(bMode === "greater" ? floor : 0) : null;
		if (caveStart && caveStart.riftHpMult && caveStart.riftHpMult > 1){
			maxHp = Math.max(120, Math.round(maxHp * caveStart.riftHpMult));
		}
		if (this.immortalAscended && this.xianqi && this.xianqi.boundKey && this.xianqi.stage > 0){
			var xqDef = this.getImmortalArtifactDef(this.xianqi.boundKey);
			if (xqDef){ natalName = $I(xqDef.labelKey); }
		}
		var startShield = (caveStart && caveStart.startShieldRatio > 0) ? Math.round(maxHp * caveStart.startShieldRatio) : 0;
		var zyRatio = Math.max(0, this.game.getEffect("zhenyuanRatio") || 0);
		var pMaxMp = Math.round(100 * (1 + zyRatio));
		var pStartMp = Math.min(pMaxMp, Math.round(60 * (1 + zyRatio)));

		var openLog = (bMode === "greater")
			? "【上古大秘境 · 第 " + floor + " 层】「" + enemy.name + "」（特征：" + enemy.traitTitle + "）镇守阵眼，斗法开始！"
			: "【灵脉秘境 · 第 1/3 波】遭遇「" + enemy.name + "」（特征：" + enemy.traitTitle + "），亮剑迎敌！";

		this.battle = {
			active: true,
			result: null,
			mode: bMode,
			turn: 1,
			wave: 1,
			maxWaves: bMode === "greater" ? 1 : 3,
			floor: floor,
			waveKeys: waveKeys,
			natalName: natalName,
			nirvanaUsed: false,
			autoFlow: true,
			castTick: 0,
			castMax: 10,
			animSeq: 0,
			lastEvent: null,
			player: {
				hp: maxHp,
				maxHp: maxHp,
				mp: pStartMp,
				maxMp: pMaxMp,
				shield: startShield,
				atk: atk,
				def: pDef,
				counterStance: false,
				poison: 0,
				chill: 0,
				weak: 0
			},
			enemy: enemy,
			loot: {
				xiuwei: Math.round(entryXw || 0),
				minerals: 0,
				relic: 0,
				keys: 0
			},
			logs: [openLog]
		};
		return true;
	},

	pickBestCombatSkill: function(){
		if (!this.battle || !this.battle.active){ return "strike"; }
		var p = this.battle.player;
		var e = this.battle.enemy;
		if (e.intent === "heavy"){
			return "guard";
		}
		if (p.mp >= 55 && (p.hp <= p.maxHp * 0.65 || p.poison > 0 || p.chill > 0 || e.hp <= p.atk * 2.5)){
			return "ult";
		}
		if (p.mp >= 35 && (e.shield > 0 || e.armorBreak <= 0)){
			return "skill";
		}
		return "strike";
	},

	toggleBattleAutoFlow: function(){
		if (!this.battle){ return false; }
		this.battle.autoFlow = !this.battle.autoFlow;
		return this.battle.autoFlow;
	},

	executeBattleTurn: function(skillKey){
		if (!this.battle || !this.battle.active){ return false; }
		var b = this.battle;
		var p = b.player;
		var e = b.enemy;
		if (!p || !e){ return false; }
		b.castTick = 0;

		var sk = null;
		for (var i = 0; i < this.COMBAT_SKILLS.length; i++){
			if (this.COMBAT_SKILLS[i].key === skillKey){ sk = this.COMBAT_SKILLS[i]; break; }
		}
		if (!sk){ sk = this.COMBAT_SKILLS[0]; }
		if (p.mp < sk.cost){
			sk = this.COMBAT_SKILLS[0]; // 真元不足时自动转为御剑斩
		}

		p.counterStance = false;
		var turnNotes = [];
		var ev = {
			seq: (b.animSeq || 0) + 1,
			skillKey: sk.key,
			enemyIntent: e.intent || "strike",
			pDmgDealt: 0,
			eDmgDealt: 0,
			pHeal: 0,
			pShieldGain: 0,
			eShieldGain: 0,
			counterHit: false,
			shieldBroken: false
		};
		b.animSeq = ev.seq;
		b.lastEvent = ev;

		// 1. 玩家回合初状态结算 (荒古战躯自愈 & 蛇毒)
		if (this.hasMingge("huanggu") && p.hp < p.maxHp){
			var hgHeal = Math.max(4, Math.round(p.maxHp * 0.04));
			p.hp = Math.min(p.maxHp, p.hp + hgHeal);
			ev.pHeal += hgHeal;
		}
		if (p.poison > 0){
			var pTick = Math.max(2, Math.round(p.maxHp * 0.06));
			p.hp = Math.max(1, p.hp - pTick);
			p.mp = Math.max(0, p.mp - 12);
			p.poison--;
			turnNotes.push("☠【蛇毒】发作损血 " + pTick + " 并蚀减 12 真元");
		}

		// 2. 消耗/恢复真元
		p.mp = Math.max(0, p.mp - sk.cost);
		if (sk.gainMp > 0){
			var zyGainMult = 1 + Math.max(0, this.game.getEffect("zhenyuanRatio") || 0);
			var rawGainMp = Math.round(sk.gainMp * zyGainMult);
			var mpGain = p.chill > 0 ? Math.ceil(rawGainMp * 0.5) : rawGainMp;
			p.mp = Math.min(p.maxMp, p.mp + mpGain);
		}

		// 3. 玩家施展神通
		var caveB = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(b.mode === "greater" ? b.floor : 0) : null;
		var xianqiRiftDmgMult = (caveB && caveB.riftDmgMult) ? caveB.riftDmgMult : 1;
		var riftDmgMult = (1 + Math.max(0, this.game.getEffect("riftDamageRatio") || 0)) * xianqiRiftDmgMult;
		if (caveB && caveB.dharmaLotusRegenRatio > 0){
			if (p.hp < p.maxHp){
				var lotusHeal = Math.max(6, Math.round(p.maxHp * caveB.dharmaLotusRegenRatio));
				p.hp = Math.min(p.maxHp, p.hp + lotusHeal);
				ev.pHeal += lotusHeal;
			}
			if (p.poison > 0){ p.poison--; }
			if (this.heartDemon > 0){ this.heartDemon = Math.max(0, this.heartDemon - 0.5); }
		}
		var atkEff = p.atk * (p.weak > 0 ? 0.80 : 1.0) * riftDmgMult;
		var swordCrit = false;
		var critChance = (this.hasMingge("jiangu") ? 0.35 : 0) + ((caveB && caveB.riftCritChance) ? caveB.riftCritChance : 0);
		var critMultNow = 1.65 + ((caveB && caveB.riftCritDmgBonus) ? caveB.riftCritDmgBonus : 0);
		if (critChance > 0 && sk.key !== "guard" && Math.random() < Math.min(0.90, critChance)){
			atkEff *= critMultNow;
			swordCrit = true;
		}
		if (caveB && (caveB.trueFireBreak > 0 || caveB.dharmaGiantCrushRatio > 0) && sk.key !== "guard"){
			e.armorBreak = Math.max(e.armorBreak || 0, 2);
		}
		var vulnMult = 1.0 + (e.armorBreak > 0 ? 0.30 : 0) + (e.expose > 0 ? 0.40 : 0) + (e.overloaded ? 0.50 : 0);
		var defIgnoreRatio = (caveB && caveB.riftDefIgnore) ? caveB.riftDefIgnore : 0;
		var shieldBreakBonus = (caveB && caveB.riftShieldBreakBonus) ? caveB.riftShieldBreakBonus : 0;

		var applyDamageToEnemy = function(rawDmg, shieldBonusMult, ignoreDefAndTrait){
			var dmg = Math.max(4, Math.round(rawDmg * vulnMult));
			if (!ignoreDefAndTrait){
				var effEDef = e.def * (e.enraged ? 0.70 : 1.0) * (1 - defIgnoreRatio);
				dmg = Math.max(4, dmg - Math.round(effEDef * 0.45));
				if (e.shield > 0 && (e.key === "puppet" || e.key === "jinjia") && sk.key === "strike"){
					dmg = Math.max(4, Math.round(dmg * 0.65)); // 玄铁重甲 / 不灭金身减伤
				}
			}
			var brokeShield = false;
			if (e.shield > 0 && !ignoreDefAndTrait){
				var sMult = (shieldBonusMult || 1.0) + shieldBreakBonus;
				var effShieldDmg = Math.round(dmg * sMult);
				if (effShieldDmg >= e.shield){
					var leftoverRatio = Math.max(0, (effShieldDmg - e.shield) / Math.max(1, effShieldDmg));
					e.shield = 0;
					brokeShield = true;
					ev.shieldBroken = true;
					dmg = Math.round(dmg * leftoverRatio);
				} else {
					e.shield -= effShieldDmg;
					ev.pDmgDealt += effShieldDmg;
					dmg = 0;
				}
			}
			e.hp = Math.max(0, e.hp - dmg);
			ev.pDmgDealt += dmg;
			if (brokeShield && (e.key === "puppet" || e.key === "jinjia")){
				var crushDmg = Math.max(8, Math.round(e.maxHp * 0.12));
				e.hp = Math.max(0, e.hp - crushDmg);
				ev.pDmgDealt += crushDmg;
				e.expose = Math.max(e.expose, 2);
				if (e.key === "jinjia"){ e.overloaded = true; }
				turnNotes.push("✦ 击碎【" + e.traitTitle + "】护盾！核心反噬再创 " + crushDmg + " 并陷入【破绽】！");
			}
			return dmg;
		};

		if (sk.key === "strike"){
			var hasShieldSyn = p.shield > 0;
			var strikeRaw = atkEff * (hasShieldSyn ? 1.45 : 1.10);
			var sDealt = applyDamageToEnemy(strikeRaw, 1.0, false);
			turnNotes.push("⚔ 施展【御剑斩】" + (swordCrit ? "(剑心通明暴击!)" : "") + (hasShieldSyn ? "(剑盾齐鸣+35%)" : "") + "斩落 " + sDealt + " 点伤害");
		} else if (sk.key === "skill"){
			e.armorBreak = Math.max(e.armorBreak, 2);
			var skillRaw = atkEff * 1.75;
			var kDealt = applyDamageToEnemy(skillRaw, 2.5, false);
			turnNotes.push("⚡ 催动【青元剑阵】" + (swordCrit ? "(剑心通明暴击!)" : "") + "绞杀 " + kDealt + " 点伤害，附加2回合【破甲】！");
		} else if (sk.key === "guard"){
			var shieldAdd = Math.max(25, Math.round(p.atk * 1.45));
			p.shield += shieldAdd;
			ev.pShieldGain = shieldAdd;
			p.counterStance = true;
			turnNotes.push("☯ 祭起【玄水灵盾】凝盾 +" + shieldAdd + "，立下【太极反震】剑势！");
		} else if (sk.key === "ult"){
			var traitWeakBonus = (e.key === "viper" ? 1.25 : (e.key === "wraith" ? 1.35 : 1.0));
			var xianqiUltMult = 1 + ((caveB && caveB.riftUltBonus) || 0);
			var ultRaw = atkEff * 2.45 * traitWeakBonus * xianqiUltMult;
			var uDealt = applyDamageToEnemy(ultRaw, 1.0, true);
			var healAmt = Math.max(18, Math.round(p.maxHp * 0.28));
			p.hp = Math.min(p.maxHp, p.hp + healAmt);
			ev.pHeal = healAmt;
			p.poison = 0;
			p.chill = 0;
			p.weak = 0;
			turnNotes.push("✨ 祭出本命【" + (b.natalName || "法宝") + "】" + (swordCrit ? "(剑心通明暴击!)" : "") + "镇压轰出 " + uDealt + " 点纯阳真伤，气血 +" + healAmt + " 并涤净全异常！");
		}

		if (p.chill > 0){ p.chill--; }
		if (p.weak > 0){ p.weak--; }

		// XX-8 法天象地巨灵震击 & 一气化三清三尊道身多段连携
		if (sk.key !== "guard" && e.hp > 0 && caveB){
			if (caveB.dharmaGiantCrushRatio > 0){
				var gCrushRaw = Math.max(10, Math.round(p.maxHp * caveB.dharmaGiantCrushRatio));
				var gCrushDealt = applyDamageToEnemy(gCrushRaw, 1.35, false);
				turnNotes.push("【法天象地】巨灵神躯镇压震碎妖罡，追加 " + gCrushDealt + " 点破甲重击");
			}
			if (e.hp > 0 && caveB.dharmaCloneStrikeRatio > 0){
				var cloneRaw = atkEff * caveB.dharmaCloneStrikeRatio;
				var cStrikeDealt = applyDamageToEnemy(cloneRaw, 1.25, false);
				turnNotes.push("【一气化三清】玉清·上清·太清三尊道身连携合击，再斩 " + cStrikeDealt + " 点神通伤害");
			}
		}

		// XX-7 / XX-8 三宝鸿蒙开天共鸣 & 诛仙剑阵图 26F~35F 残血妖王/魔尊斩决
		if (b.mode === "greater" && b.floor >= 26 && e.hp > 0 && sk.key !== "guard" && caveB && caveB.riftBossExecuteRatio > 0){
			if (e.hp <= e.maxHp * caveB.riftBossExecuteRatio){
				var execHp = e.hp;
				e.hp = 0;
				ev.pDmgDealt += execHp;
				if (caveB.dharmaSwordExecuteRatio > 0){
					turnNotes.push("【诛仙剑阵·斩仙】诛仙四剑悬空合阵，一剑斩决残血魔尊（斩灭 " + execHp + " 气血）");
				} else {
					turnNotes.push("【鸿蒙斩道】三宝开天威压直接斩决残血妖王（斩灭 " + execHp + " 气血）");
				}
			}
		}

		// 检查妖兽是否已被斩杀
		if (e.hp <= 0){
			return this.advanceBattleWaveOrWin(turnNotes.join("；"));
		}

		// 检查妖兽半血狂暴特征 (金背妖螂 / 双首银狼王)
		if (!e.enraged && (e.key === "mantis" || e.key === "yinlang") && e.hp <= e.maxHp * 0.5){
			e.enraged = true;
			turnNotes.push("✦ " + e.name + "气血过半，触发【" + e.traitTitle + "】攻击暴涨！");
		}

		// 4. 妖兽回合结算
		// 妖王再生特征 (千年墨蛟王 / 双首银狼王狂暴 / 真仙法则化身 / 上界妖仙)
		if (e.key === "mojiaowang" || e.key === "zhenxian" || e.key === "yaoxian" || (e.key === "yinlang" && e.enraged)){
			var regenRatio = (e.key === "yinlang") ? 0.04 : (e.key === "yaoxian" ? 0.06 : 0.05);
			var regenHp = Math.max(5, Math.round(e.maxHp * regenRatio));
			e.hp = Math.min(e.maxHp, e.hp + regenHp);
			if (e.key === "zhenxian" || e.key === "yaoxian"){
				var sRegen = Math.round(e.maxHp * (e.key === "yaoxian" ? 0.14 : 0.12));
				e.shield += sRegen;
				ev.eShieldGain += sRegen;
				turnNotes.push("◈ 【" + e.traitTitle + "】法则流转，恢复 " + regenHp + " 气血并凝盾 +" + sRegen);
			} else {
				turnNotes.push("◈ 【" + e.traitTitle + "】再生恢复 " + regenHp + " 气血");
			}
		}

		var intent = e.intent || "strike";
		var eAtk = e.atk * (e.enraged ? 1.42 : 1.0);

		var xianqiMit = (caveB && caveB.riftMitigation) ? caveB.riftMitigation : 0;
		var xianqiPierceMit = (caveB && caveB.riftPierceMitigation) ? caveB.riftPierceMitigation : 0;

		var applyDamageToPlayer = function(rawEnemyDmg, pierceRatio){
			var incoming = Math.max(4, Math.round((rawEnemyDmg - p.def * 0.45) * (1 - xianqiMit)));
			var pRatio = (pierceRatio || 0) * (1 - xianqiPierceMit);
			var directHpDmg = Math.round(incoming * pRatio);
			var shieldableDmg = incoming - directHpDmg;
			if (p.shield > 0 && shieldableDmg > 0){
				if (p.shield >= shieldableDmg){
					p.shield -= shieldableDmg;
					shieldableDmg = 0;
				} else {
					shieldableDmg -= p.shield;
					p.shield = 0;
				}
			}
			var totalHpLost = directHpDmg + shieldableDmg;
			p.hp = Math.max(0, p.hp - totalHpLost);
			ev.eDmgDealt += totalHpLost;
			return totalHpLost;
		};

		if (intent === "heavy"){
			if (p.counterStance){
				// 太极反震破招！(剑骨通明反震伤害 +75% + 本命玄天镜反制加成)
				var reducedDmg = applyDamageToPlayer(eAtk * 1.65 * 0.25, 0);
				var counterMult = (this.hasMingge("jiangu") ? 1.75 : 1.0) * (1 + ((caveB && caveB.counterDmgBonus) || 0));
				if (caveB && caveB.counterMpGain > 0){
					p.mp = Math.min(p.maxMp, p.mp + caveB.counterMpGain);
				}
				var counterDmg = Math.max(15, Math.round(p.atk * 1.45 * vulnMult * counterMult));
				if (e.key === "bloodcult" || e.key === "gumo"){
					var backlash = Math.round(e.maxHp * 0.14);
					counterDmg += backlash;
				}
				e.hp = Math.max(0, e.hp - counterDmg);
				ev.pDmgDealt += counterDmg;
				ev.counterHit = true;
				e.expose = Math.max(e.expose, 2);
				turnNotes.push("☯ 【太极反震】完美格挡" + e.name + "蓄力杀招(仅受 " + reducedDmg + " 伤)，反震回敬 " + counterDmg + " 点重创并打出2回合【破绽】！");
				if (e.hp <= 0){
					return this.advanceBattleWaveOrWin(turnNotes.join("；"));
				}
			} else {
				var hLost = applyDamageToPlayer(eAtk * 1.65, (e.key === "wraith" ? 0.50 : (e.key === "yinlang" ? 0.35 : (e.key === "yaoxian" ? 0.30 : 0))));
				turnNotes.push("✦ " + e.name + "轰出【蓄力杀招】造成 " + hLost + " 点气血重创！");
				if (e.key === "bloodcult" || e.key === "gumo"){
					var vamp = Math.round(hLost * 0.45);
					if (vamp > 0){ e.hp = Math.min(e.maxHp, e.hp + vamp); }
				}
				if (e.key === "viper" || e.key === "mojiaowang" || e.key === "gumo"){
					p.poison = Math.max(p.poison, 2);
				}
				if (e.key === "frostwyrm"){
					p.chill = Math.max(p.chill, 2);
				}
			}
		} else if (intent === "guard"){
			var eShieldAdd = Math.max(20, Math.round(e.maxHp * 0.28));
			e.shield += eShieldAdd;
			ev.eShieldGain += eShieldAdd;
			var gLost = applyDamageToPlayer(eAtk * 0.65, 0);
			turnNotes.push("◈ " + e.name + "凝结 " + eShieldAdd + " 点妖罡护盾并反扑造成 " + gLost + " 点伤害");
		} else if (intent === "curse"){
			var cLost = applyDamageToPlayer(eAtk * 0.85, (e.key === "wraith" ? 0.50 : (e.key === "yaoxian" ? 0.30 : 0)));
			if (e.key === "viper" || e.key === "mojiaowang" || e.key === "gumo"){
				p.poison = Math.max(p.poison, 2);
				turnNotes.push("☠ " + e.name + "喷吐毒瘴造成 " + cLost + " 伤，附加2回合【蛇毒】！");
			} else if (e.key === "frostwyrm"){
				p.chill = Math.max(p.chill, 2);
				turnNotes.push("❄ " + e.name + "喷吐极寒龙息造成 " + cLost + " 伤，附加2回合【寒霜】(回气减半)！");
			} else {
				p.mp = Math.max(0, p.mp - 20);
				p.weak = Math.max(p.weak, 2);
				turnNotes.push("☠ " + e.name + "施展摄魂妖术造成 " + cLost + " 伤，吸干 20 真元并附加【虚弱】！");
			}
		} else {
			// strike
			var isDouble = (e.key === "mantis" || e.key === "yinlang");
			var pierce = (e.key === "wraith" ? 0.50 : (e.key === "yinlang" ? 0.35 : (e.key === "yaoxian" ? 0.30 : 0)));
			var stLost = applyDamageToPlayer(eAtk * (isDouble ? 1.25 : 1.0), pierce);
			if (e.key === "bloodcult" || e.key === "gumo"){
				var leech = Math.round(stLost * 0.45);
				if (leech > 0){ e.hp = Math.min(e.maxHp, e.hp + leech); }
				turnNotes.push("※ " + e.name + "施展【化血魔功】斩击 " + stLost + " 伤并吸血 +" + leech);
			} else if (e.key === "viper"){
				p.poison = Math.max(p.poison, 2);
				turnNotes.push("☠ " + e.name + "毒牙扑击造成 " + stLost + " 伤并附带【蛇毒】");
			} else {
				turnNotes.push("⚔ " + e.name + (isDouble ? "双锋连斩" : "凶煞扑击") + "造成 " + stLost + " 点伤害");
			}
		}

		if (e.armorBreak > 0){ e.armorBreak--; }
		if (e.expose > 0){ e.expose--; }

		// 切换妖兽下一回合意图
		e.intentIdx = ((e.intentIdx || 0) + 1) % e.pattern.length;
		e.intent = e.pattern[e.intentIdx];
		b.turn++;

		b.logs.unshift("【第 " + (b.turn - 1) + " 回合】" + turnNotes.join("；"));
		if (b.logs.length > 5){ b.logs.length = 5; }

		if (p.hp <= 0){
			if (!b.nirvanaUsed && caveB && caveB.dharmaNirvanaRatio > 0){
				b.nirvanaUsed = true;
				var nirvHp = Math.max(20, Math.round(p.maxHp * caveB.dharmaNirvanaRatio));
				var nirvShd = Math.max(16, Math.round(p.maxHp * 0.22));
				p.hp = nirvHp;
				p.shield += nirvShd;
				p.poison = 0;
				p.chill = 0;
				p.weak = 0;
				ev.pHeal += nirvHp;
				ev.pShieldGain += nirvShd;
				this.heartDemon = Math.max(0, this.heartDemon - 8);
				var nirvNote = "【轮回圣莲·涅槃护道】十二品圣莲绽放逆转生死，涅槃重聚气血 " + nirvHp + "、圣莲护盾 +" + nirvShd + " 并涤净诸邪！";
				b.logs[0] = (b.logs[0] ? b.logs[0] + "；" : "") + nirvNote;
				return true;
			}
			return this.resolveBattleDefeat();
		}
		return true;
	},

	advanceBattleWaveOrWin: function(turnSummary){
		var b = this.battle;
		if (!b){ return false; }
		b.turn = (b.turn || 1) + 1;
		var addRes = this.game.resPool.addResEvent.bind(this.game.resPool);
		var fmt = this.game.getDisplayValueExt.bind(this.game);
		var scale = 1 + this.getCurrentRealmIndex() * 0.8;

		if (b.mode === "lesser"){
			var waveMult = b.wave === 1 ? 0.20 : (b.wave === 2 ? 0.30 : 0.50);
			var waveXw = this.applyXiuweiSoftCap(this.breakPayout(this.RIFT_PAY * waveMult));
			var waveMin = this.roundNice(18 * scale * b.wave);
			addRes("xiuwei", waveXw);
			addRes("minerals", waveMin);
			b.loot.xiuwei += waveXw;
			b.loot.minerals += waveMin;

			if (b.wave < b.maxWaves){
				var slainName = b.enemy.name;
				b.wave++;
				var healBetween = Math.round(b.player.maxHp * 0.25);
				b.player.hp = Math.min(b.player.maxHp, b.player.hp + healBetween);
				b.player.mp = Math.min(b.player.maxMp, b.player.mp + 20);
				b.enemy = this.spawnBattleMonster("lesser", b.wave, b.waveKeys);
				b.logs.unshift((turnSummary ? turnSummary + " — " : "") + "✦ 斩杀【" + slainName + "】获修为 +" + fmt(waveXw) + "！气血恢复 +" + healBetween + "，第 " + b.wave + "/3 波【" + b.enemy.name + "】现身！");
				if (b.logs.length > 5){ b.logs.length = 5; }
				return true;
			}

			// 第 3 波统领斩杀 -> 灵脉秘境全通凯旋！
			var relicGain = 1;
			addRes("relic", relicGain);
			b.loot.relic += relicGain;
			var keyDropped = false;
			if (Math.random() < 0.45){
				this.riftKeys++;
				b.loot.keys += 1;
				keyDropped = true;
			}
			var artDropped = false;
			if (Math.random() < 0.28){
				artDropped = this.rollArtifactDrop(scale);
			}
			if (this.expedition){
				this.expedition.active = false;
				this.expedition.loot.xiuwei = b.loot.xiuwei;
				this.expedition.loot.relic = b.loot.relic;
				this.expedition.loot.keys = b.loot.keys;
			}
			b.active = false;
			b.result = "win";
			var winMsg = "【秘境三波全胜】斩灭守关统领【" + b.enemy.name + "】！累计修为 +" + fmt(b.loot.xiuwei) +
				"，上古遗宝 +" + b.loot.relic + (keyDropped ? "，夺得【秘境令】×1" : "") + (artDropped ? "，更获秘境古宝认主！" : "！");
			b.logs.unshift((turnSummary ? turnSummary + " — " : "") + winMsg);
			this.setLastAction("ok", winMsg);
			this.game.msg(winMsg, "important");
			if (artDropped && this.game.render){ this.game.render(); }
			return true;
		}

		// 上古大秘境妖王斩杀凯旋！
		var floor = b.floor || (this.riftFloor + 1);
		if (floor > this.riftFloor){
			this.riftFloor = floor;
		}
		var gAmt = this.applyXiuweiSoftCap(this.breakPayout(this.GRIFT_PAY * 1.2));
		var relics = Math.max(1, Math.round(floor * 0.85));
		addRes("xiuwei", gAmt);
		addRes("relic", relics);
		b.loot.xiuwei += gAmt;
		b.loot.relic += relics;
		if (floor >= 12){
			var tc = Math.max(1, Math.round((floor - 10) * 0.8));
			addRes("timeCrystal", tc);
		}
		var xyGain = 0;
		if (floor >= 26){
			var winCaveB = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(floor) : null;
			var xyDropMult = 1 + ((winCaveB && winCaveB.riftXyBonus) || 0);
			xyGain = Math.max(3, Math.round((floor - 24) * 3.5 * xyDropMult));
			var xyRes = this.game.resPool.get("xianyuan");
			if (xyRes){ xyRes.unlocked = true; }
			addRes("xianyuan", xyGain);
		}
		var floorScale = scale * (1 + floor * 0.25);
		var artOdds = Math.min(0.65, 0.18 + floor * 0.03);
		var gArtDropped = false;
		if (Math.random() < artOdds){
			gArtDropped = this.rollArtifactDrop(floorScale);
		}
		b.active = false;
		b.result = "win";
		var gWinMsg = "【上古大秘境破关】成功斩杀第 " + floor + " 层妖王【" + b.enemy.name + "】！修为 +" + fmt(gAmt) +
			"，上古遗宝 +" + relics + (xyGain > 0 ? "，仙元 +" + xyGain : "") + (gArtDropped ? "，更夺得上古法宝！" : "！");
		b.logs.unshift((turnSummary ? turnSummary + " — " : "") + gWinMsg);
		this.lastBattleReport = this.buildBattleReport(floor, true, this.getCombatPower(), this.floorPower(floor));
		this.setLastAction("ok", gWinMsg);
		this.game.msg(gWinMsg, "important");
		if (gArtDropped && this.game.render){ this.game.render(); }
		return true;
	},

	resolveBattleDefeat: function(){
		var b = this.battle;
		if (!b){ return false; }
		var addRes = this.game.resPool.addResEvent.bind(this.game.resPool);
		var fmt = this.game.getDisplayValueExt.bind(this.game);
		b.active = false;
		b.result = "lose";
		if (b.mode === "greater"){
			var failXw = this.applyXiuweiSoftCap(this.breakPayout(this.GRIFT_FAIL_PAY));
			addRes("xiuwei", failXw);
			b.loot.xiuwei += failXw;
			var addDemon = 6 + Math.random() * 4;
			if (this.getFate("tihun").researched){ addDemon *= 0.5; }
			this.heartDemon = Math.min(100, this.heartDemon + addDemon);
			this.lastBattleReport = this.buildBattleReport(b.floor, false, this.getCombatPower(), this.floorPower(b.floor));
			var fMsg = "【大秘境受挫】不敌第 " + b.floor + " 层【" + b.enemy.name + "】激发血遁符撤离，保底修为 +" + fmt(failXw) + "，心魔微增。";
			b.logs.unshift(fMsg);
			this.setLastAction("fail", fMsg);
			this.game.msg(fMsg, "alert");
		} else {
			if (this.expedition){ this.expedition.active = false; }
			var lMsg = "【秘境负伤撤离】气血不支激发传送符遁出，已得修为 +" + fmt(b.loot.xiuwei) + " 全数保留。";
			b.logs.unshift(lMsg);
			this.setLastAction("fail", lMsg);
			this.game.msg(lMsg, "alert");
		}
		return true;
	},

	autoResolveBattle: function(){
		if (!this.battle || !this.battle.active){ return false; }
		var guardCount = 0;
		while (this.battle && this.battle.active && guardCount < 35){
			guardCount++;
			var p = this.battle.player;
			var e = this.battle.enemy;
			var pick = "strike";
			if (e.intent === "heavy"){
				pick = "guard";
			} else if (p.mp >= 55 && (p.hp <= p.maxHp * 0.65 || p.poison > 0 || p.chill > 0 || e.hp <= p.atk * 2.5)){
				pick = "ult";
			} else if (p.mp >= 35 && (e.shield > 0 || e.armorBreak <= 0)){
				pick = "skill";
			} else {
				pick = "strike";
			}
			this.executeBattleTurn(pick);
		}
		return true;
	},

	fleeBattle: function(){
		if (!this.battle || !this.battle.active){ return false; }
		var b = this.battle;
		var fmt = this.game.getDisplayValueExt.bind(this.game);
		var bonusXw = this.applyXiuweiSoftCap(this.breakPayout(this.RIFT_PAY * 0.25));
		this.game.resPool.addResEvent("xiuwei", bonusXw);
		b.loot.xiuwei += bonusXw;
		this.heartDemon = Math.max(0, this.heartDemon - 3);
		b.active = false;
		b.result = "flee";
		if (this.expedition){ this.expedition.active = false; }
		var msg = "【见好就收】催动血遁符携宝安全撤出秘境，额外获修为 +" + fmt(bonusXw) + "，道心澄明（心魔 -3）。";
		b.logs.unshift(msg);
		this.setLastAction("ok", msg);
		this.game.msg(msg, "notice");
		return true;
	},

	isRiftUnlocked: function(){
		var gate = this.getStage("zhuji_0");
		return !!(gate && gate.researched);
	},

	//建造三合斗法战报——依玩家当前本命法宝、青竹剑阵、奇虫灵兽与守关古妖动态成篇
	buildBattleReport: function(floor, win, power, need){
		var bossKey = floor <= 3 ? "1" : (floor <= 6 ? "2" : (floor <= 9 ? "3" : (floor <= 15 ? "4" : (floor <= 25 ? "5" : (floor <= 30 ? "6" : "7")))));
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
			var amt = this.applyXiuweiSoftCap(this.breakPayout(this.GRIFT_PAY * (gInfo.countered ? 1.25 : 1)));
			addRes("xiuwei", amt);
			var relics = Math.max(1, Math.round(floor * 0.8)) + (gInfo.countered ? 1 : 0);
			addRes("relic", relics);
			if (floor >= 12){
				var tc = Math.max(1, Math.round((floor - 10) * 0.8));
				addRes("timeCrystal", tc);
			}
			if (floor >= 26){
				var xy = Math.max(2, Math.round((floor - 24) * 2.5));
				var xyObj = this.game.resPool.get("xianyuan");
				if (xyObj){ xyObj.unlocked = true; }
				addRes("xianyuan", xy);
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
			var amt = this.applyXiuweiSoftCap(this.breakPayout(this.GRIFT_FAIL_PAY));
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

		var amt = this.applyXiuweiSoftCap(this.breakPayout(this.GRIFT_PAY * 0.85));
		addRes("xiuwei", amt);
		var relics = Math.max(1, Math.round(floor * 0.7)) + (this.riftStance === "array" ? 1 : 0);
		addRes("relic", relics);
		if (floor >= 12){
			addRes("timeCrystal", Math.max(1, Math.round((floor - 10) * 0.6)));
		}
		var sweepXy = 0;
		if (floor >= 26){
			sweepXy = Math.max(2, Math.round((floor - 24) * 1.8));
			var sXyObj = this.game.resPool.get("xianyuan");
			if (sXyObj){ sXyObj.unlocked = true; }
			addRes("xianyuan", sweepXy);
		}
		var dropped = false;
		if (Math.random() < Math.min(0.55, 0.14 + floor * 0.025 + (this.riftStance === "array" ? 0.08 : 0))){
			dropped = this.rollArtifactDrop(floorScale);
			if (dropped && this.game.render){ this.game.render(); }
		}
		var text = "清剿上古秘境第 " + floor + " 层凯旋：修为 +" + fmt(amt) + "，上古遗宝 +" + relics + (sweepXy > 0 ? "，仙元 +" + sweepXy : "") + (dropped ? "，更获古宝机缘！" : "");
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

	// ---------------- XX-2 渡九九雷劫 · 飞升真仙界与仙灵气循环 ----------------

	canAscendImmortal: function(){
		var dujie = this.getStage("dujie_0");
		return !!(dujie && dujie.researched && this.riftFloor >= 25 && !this.immortalAscended);
	},

	ascendToImmortalRealm: function(){
		if (!this.canAscendImmortal()){ return false; }
		this.immortalAscended = true;
		this.heartDemon = 0;
		this.pillToxicity = 0;
		this.daoyun = (this.daoyun || 0) + 1;
		this.herbGarden = this.normalizeHerbGarden(this.herbGarden);
		if (!this.herbGarden.plots[0].herbKey){
			this.herbGarden.plots[0] = {herbKey: "xianlan", progress: 40, maxTicks: 120, mature: false};
		}
		this.herbGarden.stock.xianlan = (this.herbGarden.stock.xianlan || 0) + 1;
		this.xianqi = this.normalizeXianqi(this.xianqi);
		this.starArray = this.normalizeStarArray(this.starArray);
		if ((this.starArray.totalCoresEarned || 0) === 0 && (this.starArray.cores.ziwei || 0) === 0){
			this.starArray.cores.ziwei = 1;
			this.starArray.totalCoresEarned = 1;
		}
		this.immortalBounty = this.normalizeImmortalBounty(this.immortalBounty);
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		this.daoSteleForest = this.normalizeDaoSteleForest(this.daoSteleForest);
		this.starship = this.normalizeStarship(this.starship);
		if ((this.hongmengImprintTier || 0) > 0 && (this.starship.totalQiHarvested || 0) === 0 && (this.starship.hongmengQi || 0) === 0){
			var ascInitQi = this.getHongmengStartingQi();
			this.starship.hongmengQi = ascInitQi;
			this.starship.totalQiHarvested = ascInitQi;
		}
		this.hongmengAltar = this.normalizeHongmengAltar(this.hongmengAltar);
		this.zixiaoAltar = this.normalizeZixiaoAltar(this.zixiaoAltar);
		if ((this.dharmaImprintTier || 0) > 0 && (this.zixiaoAltar.totalSutrasCondensed || 0) === 0 && (this.zixiaoAltar.daoSutras || 0) === 0){
			var ascInitSutras = this.getDharmaStartingSutras();
			this.zixiaoAltar.daoSutras = ascInitSutras;
			this.zixiaoAltar.totalSutrasCondensed = ascInitSutras;
		}
		this.syncDaoSutras();
		this.dharmaIdols = this.normalizeDharmaIdols(this.dharmaIdols);
		var xyRes = this.game.resPool.get("xianyuan");
		if (xyRes){ xyRes.unlocked = true; }
		this.game.resPool.addResEvent("xianyuan", 25);
		if (classes.ui && classes.ui.XianxiaAudio && classes.ui.XianxiaAudio.playTribulation){
			classes.ui.XianxiaAudio.playTribulation(this.game);
		}
		this.syncRealmUnlocks();
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var msg = $I("cultivation.feisheng.done", [25, 1]);
		this.setLastAction("ok", msg);
		this.game.msg(msg, "important");
		if (this.game.render){ this.game.render(); }
		return true;
	},

	getDaoyunCost: function(){
		var d = Math.max(0, Math.floor(this.daoyun || 0));
		var rawCost = 25 * Math.pow(1.45, d);
		var caveB = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
		var disc = (caveB && caveB.daoLawDiscount) ? caveB.daoLawDiscount : 0;
		return Math.max(5, this.roundNice(rawCost * (1 - disc)));
	},

	infuseImmortalQi: function(){
		if (!this.immortalAscended){ return false; }
		var tc = this.game.resPool.get("timeCrystal");
		if (!tc || tc.value < 10){
			this.game.msg($I("cultivation.immortal.msg.notc"), "alert");
			return false;
		}
		this.game.resPool.addResEvent("timeCrystal", -10);
		var xyRes = this.game.resPool.get("xianyuan");
		if (xyRes){ xyRes.unlocked = true; }
		var caveB = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
		var gainXy = 18 + ((caveB && caveB.infuseExtraXy) || 0);
		this.game.resPool.addResEvent("xianyuan", gainXy);
		this.game.msg($I("cultivation.immortal.msg.infuse", [gainXy]), "notice");
		return true;
	},

	comprehendDaoLaw: function(){
		if (!this.immortalAscended){ return false; }
		var cost = this.getDaoyunCost();
		var xy = this.game.resPool.get("xianyuan");
		if (!xy || xy.value < cost){
			this.game.msg($I("cultivation.immortal.msg.noxy", [cost]), "alert");
			return false;
		}
		this.game.resPool.addResEvent("xianyuan", -cost);
		if (this.herbGarden && this.herbGarden.daoDiscountStacks > 0){
			this.herbGarden.daoDiscountStacks = 0;
		}
		this.daoyun = Math.max(0, Math.floor(this.daoyun || 0)) + 1;
		if (this.game.updateCaches){ this.game.updateCaches(); }
		this.game.msg(
			$I("cultivation.immortal.msg.law", [
				this.daoyun,
				Math.round(this.daoyun * 18),
				Math.round(this.daoyun * 12),
				Math.round(this.daoyun * 15)
			]),
			"important"
		);
		return true;
	},

	// ---------------- XX-4 仙界洞府 · 聚灵药园与本命仙器蕴养祭炼 ----------------

	ART_VER: "77",

	IMMORTAL_HERBS: [
		{
			key: "xianlan",
			labelKey: "cultivation.herb.xianlan.label",
			descKey: "cultivation.herb.xianlan.desc",
			art: "res/art/herb_xianlan.webp",
			growTicks: 120,
			seedCost: [{name: "catnip", val: 80}],
			harvestXy: 8,
			harvestToxClr: 6,
			harvestAlcExp: 2,
			harvestLawProg: 0,
			infuseXy: 12,
			infuseToxClr: 16,
			infuseAlcExp: 3
		},
		{
			key: "zizhi",
			labelKey: "cultivation.herb.zizhi.label",
			descKey: "cultivation.herb.zizhi.desc",
			art: "res/art/herb_zizhi.webp",
			growTicks: 160,
			seedCost: [{name: "xianyuan", val: 8}],
			harvestXy: 15,
			harvestToxClr: 4,
			harvestAlcExp: 3,
			harvestLawProg: 0,
			infuseXy: 22,
			infuseToxClr: 8,
			infuseAlcExp: 5
		},
		{
			key: "qinglian",
			labelKey: "cultivation.herb.qinglian.label",
			descKey: "cultivation.herb.qinglian.desc",
			art: "res/art/herb_qinglian.webp",
			growTicks: 210,
			seedCost: [{name: "xianyuan", val: 16}],
			harvestXy: 26,
			harvestToxClr: 5,
			harvestAlcExp: 3,
			harvestLawProg: 0,
			infuseXy: 38,
			infuseToxClr: 8,
			infuseAlcExp: 3
		},
		{
			key: "daoguo",
			labelKey: "cultivation.herb.daoguo.label",
			descKey: "cultivation.herb.daoguo.desc",
			art: "res/art/herb_daoguo.webp",
			growTicks: 260,
			seedCost: [{name: "xianyuan", val: 28}, {name: "timeCrystal", val: 5}],
			harvestXy: 42,
			harvestToxClr: 8,
			harvestAlcExp: 4,
			harvestLawProg: 35,
			infuseXy: 55,
			infuseToxClr: 12,
			infuseAlcExp: 4
		}
	],

	IMMORTAL_ARTIFACTS: [
		{
			key: "sword",
			labelKey: "cultivation.xianqi.sword.label",
			descKey: "cultivation.xianqi.sword.desc",
			tag: "伐仙剑道 · 破甲诛妖",
			tagEn: "Sword-Slaying · Pierce & Crush",
			art: "res/art/xianqi_sword.webp",
			passives: [
				{tier: 1, title: "辟邪神雷剑芒", titleEn: "Lightning Sword-Glint", desc: "斗法战力 +25%，上古秘境 26~35 层神通伤害 +18%", descEn: "Combat Power +25%, 26F-35F Rift damage +18%"},
				{tier: 3, title: "庚金剑阵诛仙", titleEn: "Geng-Metal Immortal Array", desc: "26~35 层无视妖仙 25% 护甲且破盾伤害 +22%，仙元底数 +0.03/tick", descEn: "26F-35F ignores 25% Boss DEF, shield break +22%, Essence +0.03/tick"},
				{tier: 5, title: "青元剑莲化界", titleEn: "Azure Sword-Lotus Domain", desc: "本命杀招伤害 +35%，斗法战力再 +30%，仙元周天产出 +20%", descEn: "Ultimate strike +35%, Combat Power +30%, Immortal Essence output +20%"}
			]
		},
		{
			key: "cauldron",
			labelKey: "cultivation.xianqi.cauldron.label",
			descKey: "cultivation.xianqi.cauldron.desc",
			tag: "万妙丹道 · 混元凝丹",
			tagEn: "Primordial Alchemy · Pill Surge",
			art: "res/art/xianqi_cauldron.webp",
			passives: [
				{tier: 1, title: "乾蓝冰焰控炉", titleEn: "Azure Ice-Flame Control", desc: "炼丹双丹与丹纹率 +15%，服丹经脉丹毒累积 -25%", descEn: "Double-pill & Supreme-vein rate +15%, pill toxicity -25%"},
				{tier: 3, title: "九转混元丹气", titleEn: "Nine-Turn Pill Qi", desc: "开炉 40% 额外多凝 1 丹并凝仙元 +2，灵丹药效时长 +25%", descEn: "40% extra pill +2 Essence on craft, pill buff duration +25%"},
				{tier: 5, title: "掌天造化丹界", titleEn: "Heaven-Palm Pill Realm", desc: "聚灵药园生长提速 +30%，洞府万产 +35%，仙元底数 +0.05/tick", descEn: "Herb growth +30%, realm output +35%, Essence +0.05/tick"}
			]
		},
		{
			key: "mirror",
			labelKey: "cultivation.xianqi.mirror.label",
			descKey: "cultivation.xianqi.mirror.desc",
			tag: "玄天护道 · 阴阳反制",
			tagEn: "Aegis Ward · Yin-Yang Counter",
			art: "res/art/xianqi_mirror.webp",
			passives: [
				{tier: 1, title: "阴阳玄光护体", titleEn: "Yin-Yang Mystic Ward", desc: "26~35 层受妖仙伤害减免 18%，入战自带气血 20%+ 阴阳仙盾", descEn: "26F-35F Boss dmg taken -18%, opening Yin-Yang shield 20%+ Max HP"},
				{tier: 3, title: "乾坤溯光反制", titleEn: "Qiankun Light-Counter", desc: "太极反震伤害 +35% 并回气 +12 真元，斗法战力 +28%", descEn: "Counter damage +35% & +12 True Qi, Combat Power +28%"},
				{tier: 5, title: "玄天不灭洞鉴", titleEn: "Undying Heaven Mirror", desc: "26~35 层总减伤升至 32% 且穿透伤害减半，真元上限 +30%", descEn: "26F-35F mitigation 32% & halves pierce dmg, Max True Qi +30%"}
			]
		},
		{
			key: "pagoda",
			labelKey: "cultivation.xianqi.pagoda.label",
			descKey: "cultivation.xianqi.pagoda.desc",
			tag: "宙光法则 · 仙元周天",
			tagEn: "Chrono Law · Essence Cycle",
			art: "res/art/xianqi_pagoda.webp",
			passives: [
				{tier: 1, title: "五色宙光聚仙", titleEn: "Five-Light Essence Gather", desc: "仙元底数 +0.04/tick，引渡仙灵每次额外多凝 +5 仙元", descEn: "Essence +0.04/tick, Immortal Qi infusion grants +5 extra Essence"},
				{tier: 3, title: "昊天镇魔仙域", titleEn: "Vast-Heaven Demon Suppression", desc: "26~35 层秘境增伤 +16% 且减伤 12%，参悟法则消耗 -15%", descEn: "26F-35F dmg +16% & mitigation 12%, Dao Resonance cost -15%"},
				{tier: 5, title: "万古岁月道轮", titleEn: "Eternal Kalpa Dao-Wheel", desc: "仙元总产出 +35%，药园生长提速 +25%，斗法战力 +32%", descEn: "Total Essence output +35%, Herb growth +25%, Combat Power +32%"}
			]
		}
	],

	XIANQI_STAGES: [
		{stage: 0, title: "未祭炼仙胚", titleEn: "Unforged Embryo", xianyuan: 0, herbs: 0, oreRes: null, oreVal: 0, reqDaoyun: 0},
		{stage: 1, title: "一阶 · 通灵仙胚", titleEn: "Stage 1 · Spirit Embryo", xianyuan: 10, herbs: 0, oreRes: null, oreVal: 0, reqDaoyun: 1},
		{stage: 2, title: "二阶 · 真仙宝器", titleEn: "Stage 2 · Immortal Relic", xianyuan: 28, herbs: 1, oreRes: "unobtainium", oreVal: 20, reqDaoyun: 1},
		{stage: 3, title: "三阶 · 太乙灵宝", titleEn: "Stage 3 · Taiyi Treasure", xianyuan: 60, herbs: 2, oreRes: "timeCrystal", oreVal: 18, reqDaoyun: 2},
		{stage: 4, title: "四阶 · 玄天仙器", titleEn: "Stage 4 · Profound Artifact", xianyuan: 115, herbs: 4, oreRes: "timeCrystal", oreVal: 35, reqDaoyun: 3},
		{stage: 5, title: "五阶 · 混元道器", titleEn: "Stage 5 · Primordial Vessel", xianyuan: 210, herbs: 6, oreRes: "timeCrystal", oreVal: 60, reqDaoyun: 4},
		{stage: 6, title: "六阶 · 造化至尊仙器", titleEn: "Stage 6 · Supreme Creation", xianyuan: 360, herbs: 9, oreRes: "timeCrystal", oreVal: 95, reqDaoyun: 6}
	],

	makeDefaultHerbGarden: function(){
		return {
			plotsUnlocked: 2,
			arrayLevel: 1,
			autoTend: false,
			selectedSeed: "xianlan",
			plots: [
				{herbKey: null, progress: 0, maxTicks: 0, mature: false},
				{herbKey: null, progress: 0, maxTicks: 0, mature: false},
				{herbKey: null, progress: 0, maxTicks: 0, mature: false},
				{herbKey: null, progress: 0, maxTicks: 0, mature: false}
			],
			stock: {xianlan: 0, zizhi: 0, qinglian: 0, daoguo: 0},
			harvestCount: {xianlan: 0, zizhi: 0, qinglian: 0, daoguo: 0},
			totalHarvested: 0,
			daoLawProgress: 0,
			daoDiscountStacks: 0,
			immortalLifeBonus: 0,
			lastNote: null
		};
	},

	makeDefaultXianqi: function(){
		return {
			boundKey: null,
			stage: 0,
			nurtureExp: 0,
			totalRefines: 0,
			lastNote: null
		};
	},

	getHerbDef: function(key){
		for (var i = 0; i < this.IMMORTAL_HERBS.length; i++){
			if (this.IMMORTAL_HERBS[i].key === key){ return this.IMMORTAL_HERBS[i]; }
		}
		return null;
	},

	getImmortalArtifactDef: function(key){
		for (var i = 0; i < this.IMMORTAL_ARTIFACTS.length; i++){
			if (this.IMMORTAL_ARTIFACTS[i].key === key){ return this.IMMORTAL_ARTIFACTS[i]; }
		}
		return null;
	},

	normalizeHerbGarden: function(raw){
		var def = this.makeDefaultHerbGarden();
		if (!raw || typeof raw !== "object"){ return def; }
		if (typeof raw.plotsUnlocked === "number" && isFinite(raw.plotsUnlocked)){
			def.plotsUnlocked = Math.min(4, Math.max(2, Math.floor(raw.plotsUnlocked)));
		}
		if (typeof raw.arrayLevel === "number" && isFinite(raw.arrayLevel)){
			def.arrayLevel = Math.min(5, Math.max(1, Math.floor(raw.arrayLevel)));
		}
		if (typeof raw.autoTend === "boolean"){ def.autoTend = raw.autoTend; }
		if (typeof raw.selectedSeed === "string" && this.getHerbDef(raw.selectedSeed)){
			def.selectedSeed = raw.selectedSeed;
		}
		if (raw.plots && raw.plots.length){
			for (var i = 0; i < 4; i++){
				var p = raw.plots[i];
				if (p && typeof p === "object" && p.herbKey && this.getHerbDef(p.herbKey)){
					var hDef = this.getHerbDef(p.herbKey);
					var mTicks = (typeof p.maxTicks === "number" && p.maxTicks > 0) ? Math.floor(p.maxTicks) : hDef.growTicks;
					var prog = (typeof p.progress === "number" && isFinite(p.progress)) ? Math.max(0, Math.min(mTicks, p.progress)) : 0;
					def.plots[i] = {
						herbKey: p.herbKey,
						progress: prog,
						maxTicks: mTicks,
						mature: !!(p.mature || prog >= mTicks)
					};
				}
			}
		}
		for (var hi = 0; hi < this.IMMORTAL_HERBS.length; hi++){
			var hk = this.IMMORTAL_HERBS[hi].key;
			if (raw.stock && typeof raw.stock[hk] === "number" && isFinite(raw.stock[hk])){
				def.stock[hk] = Math.max(0, Math.floor(raw.stock[hk]));
			}
			if (raw.harvestCount && typeof raw.harvestCount[hk] === "number" && isFinite(raw.harvestCount[hk])){
				def.harvestCount[hk] = Math.max(0, Math.floor(raw.harvestCount[hk]));
			}
		}
		if (typeof raw.totalHarvested === "number" && isFinite(raw.totalHarvested)){
			def.totalHarvested = Math.max(0, Math.floor(raw.totalHarvested));
		}
		if (typeof raw.daoLawProgress === "number" && isFinite(raw.daoLawProgress)){
			def.daoLawProgress = Math.max(0, Math.min(99, Math.floor(raw.daoLawProgress)));
		}
		if (typeof raw.daoDiscountStacks === "number" && isFinite(raw.daoDiscountStacks)){
			def.daoDiscountStacks = Math.max(0, Math.min(3, Math.floor(raw.daoDiscountStacks)));
		}
		if (typeof raw.immortalLifeBonus === "number" && isFinite(raw.immortalLifeBonus)){
			def.immortalLifeBonus = Math.max(0, Math.floor(raw.immortalLifeBonus));
		}
		if (typeof raw.lastNote === "string"){ def.lastNote = raw.lastNote; }
		return def;
	},

	normalizeXianqi: function(raw){
		var def = this.makeDefaultXianqi();
		if (!raw || typeof raw !== "object"){ return def; }
		if (typeof raw.boundKey === "string" && this.getImmortalArtifactDef(raw.boundKey)){
			def.boundKey = raw.boundKey;
		}
		if (typeof raw.stage === "number" && isFinite(raw.stage)){
			def.stage = def.boundKey ? Math.min(6, Math.max(0, Math.floor(raw.stage))) : 0;
		}
		if (typeof raw.nurtureExp === "number" && isFinite(raw.nurtureExp)){
			def.nurtureExp = Math.min(100, Math.max(0, Math.floor(raw.nurtureExp)));
		}
		if (typeof raw.totalRefines === "number" && isFinite(raw.totalRefines)){
			def.totalRefines = Math.max(0, Math.floor(raw.totalRefines));
		}
		if (typeof raw.lastNote === "string"){ def.lastNote = raw.lastNote; }
		return def;
	},

	isHerbGardenUnlocked: function(){
		return !!this.immortalAscended;
	},

	prepareImmortalCaveForTest: function(grantResources){
		if (!this.identity || !this.identity.name){
			this.setIdentity("韩立", "m", "farmer");
		}
		this.identityPending = false;
		this.pendingOrigin = false;
		for (var fi = 0; fi < this.fates.length; fi++){
			this.fates[fi].researched = true;
			this.fates[fi].pending = false;
		}
		if (typeof dojo !== "undefined" && dojo.query){
			dojo.query(".xxFateOverlay").forEach(function(n){ dojo.destroy(n); });
		}
		for (var i = 0; i < this.stages.length; i++){
			if (this.stages[i].realm !== "zhenxian" && this.stages[i].realm !== "jinxian"){
				this.stages[i].researched = true;
			}
		}
		if (this.riftFloor < 26){ this.riftFloor = 26; }
		if (!this.immortalAscended){
			this.ascendToImmortalRealm();
		}
		if (grantResources){
			var resList = ["xianyuan", "timeCrystal", "unobtainium", "relic", "catnip", "starchart"];
			for (var r = 0; r < resList.length; r++){
				var ro = this.game.resPool.get(resList[r]);
				if (ro){
					ro.unlocked = true;
					ro.value = Math.max(ro.value, 500);
				}
			}
		}
		this.starArray = this.normalizeStarArray(this.starArray);
		this.immortalBounty = this.normalizeImmortalBounty(this.immortalBounty);
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		this.daoSteleForest = this.normalizeDaoSteleForest(this.daoSteleForest);
		this.starship = this.normalizeStarship(this.starship);
		if ((this.hongmengImprintTier || 0) > 0 && (this.starship.totalQiHarvested || 0) === 0 && (this.starship.hongmengQi || 0) === 0){
			var ascInitQi = this.getHongmengStartingQi();
			this.starship.hongmengQi = ascInitQi;
			this.starship.totalQiHarvested = ascInitQi;
		}
		this.hongmengAltar = this.normalizeHongmengAltar(this.hongmengAltar);
		this.zixiaoAltar = this.normalizeZixiaoAltar(this.zixiaoAltar);
		if ((this.dharmaImprintTier || 0) > 0 && (this.zixiaoAltar.totalSutrasCondensed || 0) === 0 && (this.zixiaoAltar.daoSutras || 0) === 0){
			var testInitSutras = this.getDharmaStartingSutras();
			this.zixiaoAltar.daoSutras = testInitSutras;
			this.zixiaoAltar.totalSutrasCondensed = testInitSutras;
		}
		this.syncDaoSutras();
		this.dharmaIdols = this.normalizeDharmaIdols(this.dharmaIdols);
		if (this.game.updateCaches){ this.game.updateCaches(); }
		return true;
	},

	getImprintCostMult: function(){
		var imp = Math.max(0, Math.min(10, Math.floor(this.immortalImprint || 0)));
		return Math.max(0.70, 1 - imp * 0.03);
	},

	getHerbTotalStock: function(){
		if (!this.herbGarden || !this.herbGarden.stock){ return 0; }
		var total = 0;
		for (var i = 0; i < this.IMMORTAL_HERBS.length; i++){
			var k = this.IMMORTAL_HERBS[i].key;
			total += Math.max(0, Math.floor(this.herbGarden.stock[k] || 0));
		}
		return total;
	},

	getGardenGrowthRate: function(){
		var g = this.herbGarden || this.makeDefaultHerbGarden();
		var caveB = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
		var xqSpeed = (caveB && caveB.herbSpeedBonus) ? caveB.herbSpeedBonus : 0;
		var arrBonus = (Math.max(1, g.arrayLevel) - 1) * 0.25;
		var dyBonus = Math.min(0.50, Math.max(0, this.daoyun || 0) * 0.05);
		var seclBonus = this.secluded ? 0.15 : 0;
		return 1 + arrBonus + dyBonus + seclBonus + xqSpeed;
	},

	getPlotExpandCost: function(){
		var g = this.herbGarden || this.makeDefaultHerbGarden();
		if (g.plotsUnlocked >= 4){ return null; }
		var mult = this.getImprintCostMult();
		if (g.plotsUnlocked === 2){
			return {nextPlot: 3, xianyuan: Math.max(10, Math.round(30 * mult)), timeCrystal: Math.max(5, Math.round(15 * mult))};
		}
		return {nextPlot: 4, xianyuan: Math.max(20, Math.round(80 * mult)), timeCrystal: Math.max(10, Math.round(35 * mult))};
	},

	expandHerbPlot: function(){
		if (!this.immortalAscended){ return false; }
		this.herbGarden = this.normalizeHerbGarden(this.herbGarden);
		var req = this.getPlotExpandCost();
		if (!req){ return false; }
		var xy = this.game.resPool.get("xianyuan");
		var tc = this.game.resPool.get("timeCrystal");
		if (!xy || xy.value < req.xianyuan || !tc || tc.value < req.timeCrystal){
			return false;
		}
		this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
		this.game.resPool.addResEvent("timeCrystal", -req.timeCrystal);
		this.herbGarden.plotsUnlocked = req.nextPlot;
		var note = "【聚灵药园】仙锄破禁，成功开辟第 " + req.nextPlot + " 方万年仙圃！";
		this.herbGarden.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	getSpiritArrayCost: function(){
		var g = this.herbGarden || this.makeDefaultHerbGarden();
		if (g.arrayLevel >= 5){ return null; }
		var mult = this.getImprintCostMult();
		var lv = Math.max(1, g.arrayLevel);
		return {
			nextLevel: lv + 1,
			xianyuan: Math.max(10, this.roundNice(25 * Math.pow(1.75, lv - 1) * mult)),
			relic: Math.max(4, this.roundNice(12 * lv * mult))
		};
	},

	upgradeSpiritArray: function(){
		if (!this.immortalAscended){ return false; }
		this.herbGarden = this.normalizeHerbGarden(this.herbGarden);
		var req = this.getSpiritArrayCost();
		if (!req){ return false; }
		var xy = this.game.resPool.get("xianyuan");
		var rl = this.game.resPool.get("relic");
		if (!xy || xy.value < req.xianyuan || !rl || rl.value < req.relic){
			return false;
		}
		this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
		this.game.resPool.addResEvent("relic", -req.relic);
		this.herbGarden.arrayLevel = req.nextLevel;
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var note = "【聚灵仙阵】阵纹升至第 " + req.nextLevel + " 阶，仙草生长速度与双倍采收率大增！";
		this.herbGarden.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	selectGardenSeed: function(herbKey){
		if (!this.getHerbDef(herbKey)){ return false; }
		this.herbGarden = this.normalizeHerbGarden(this.herbGarden);
		this.herbGarden.selectedSeed = herbKey;
		return true;
	},

	toggleGardenAutoTend: function(){
		if (!this.immortalAscended){ return false; }
		this.herbGarden = this.normalizeHerbGarden(this.herbGarden);
		this.herbGarden.autoTend = !this.herbGarden.autoTend;
		return this.herbGarden.autoTend;
	},

	canAffordHerbSeed: function(herbKey){
		var def = this.getHerbDef(herbKey);
		if (!def){ return false; }
		for (var i = 0; i < def.seedCost.length; i++){
			var sc = def.seedCost[i];
			var r = this.game.resPool.get(sc.name);
			if (!r || r.value < sc.val){ return false; }
		}
		return true;
	},

	plantHerbPlot: function(plotIdx, herbKey){
		if (!this.immortalAscended){ return false; }
		this.herbGarden = this.normalizeHerbGarden(this.herbGarden);
		var idx = Math.floor(plotIdx);
		if (idx < 0 || idx >= this.herbGarden.plotsUnlocked){ return false; }
		var plot = this.herbGarden.plots[idx];
		if (!plot || plot.herbKey){ return false; }
		var key = herbKey || this.herbGarden.selectedSeed || "xianlan";
		var def = this.getHerbDef(key);
		if (!def || !this.canAffordHerbSeed(key)){ return false; }
		for (var i = 0; i < def.seedCost.length; i++){
			var sc = def.seedCost[i];
			this.game.resPool.addResEvent(sc.name, -sc.val);
		}
		this.herbGarden.plots[idx] = {
			herbKey: key,
			progress: 0,
			maxTicks: def.growTicks,
			mature: false
		};
		this.herbGarden.lastNote = "已于第 " + (idx + 1) + " 灵圃种下【" + $I(def.labelKey) + "】仙种。";
		return true;
	},

	addDaoLawProgress: function(pts){
		if (!this.herbGarden || pts <= 0){ return 0; }
		var gained = 0;
		var cur = (this.herbGarden.daoLawProgress || 0) + Math.floor(pts);
		while (cur >= 100){
			cur -= 100;
			this.daoyun = Math.max(0, Math.floor(this.daoyun || 0)) + 1;
			gained++;
		}
		this.herbGarden.daoLawProgress = cur;
		if (gained > 0 && this.game.updateCaches){
			this.game.updateCaches();
		}
		return gained;
	},

	harvestHerbPlot: function(plotIdx){
		if (!this.immortalAscended){ return false; }
		this.herbGarden = this.normalizeHerbGarden(this.herbGarden);
		var idx = Math.floor(plotIdx);
		if (idx < 0 || idx >= this.herbGarden.plotsUnlocked){ return false; }
		var plot = this.herbGarden.plots[idx];
		if (!plot || !plot.herbKey || (!plot.mature && plot.progress < plot.maxTicks)){
			return false;
		}
		var def = this.getHerbDef(plot.herbKey);
		if (!def){ return false; }
		var caveHarv = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
		var beastYield = (caveHarv && caveHarv.herbYieldBonus) ? caveHarv.herbYieldBonus : 0;
		var extraChance = (this.herbGarden.arrayLevel - 1) * 0.18 + beastYield;
		var qty = 1 + ((this.herbGarden.arrayLevel >= 5 || extraChance >= 1.0 || Math.random() < extraChance) ? 1 : 0);
		if (extraChance > 1.0 && Math.random() < (extraChance - 1.0)){
			qty += 1;
		}
		this.herbGarden.stock[def.key] = (this.herbGarden.stock[def.key] || 0) + qty;
		this.herbGarden.harvestCount[def.key] = (this.herbGarden.harvestCount[def.key] || 0) + qty;
		this.herbGarden.totalHarvested = (this.herbGarden.totalHarvested || 0) + qty;
		this.herbGarden.plots[idx] = {herbKey: null, progress: 0, maxTicks: 0, mature: false};

		var xyRes = this.game.resPool.get("xianyuan");
		if (xyRes){ xyRes.unlocked = true; }
		this.game.resPool.addResEvent("xianyuan", def.harvestXy);
		this.pillToxicity = Math.max(0, (this.pillToxicity || 0) - def.harvestToxClr);
		this.alchemyExp = (this.alchemyExp || 0) + def.harvestAlcExp;
		var lawUp = 0;
		if (def.harvestLawProg > 0){
			lawUp = this.addDaoLawProgress(def.harvestLawProg);
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var note = "【采收仙草】收获万年【" + $I(def.labelKey) + "】×" + qty +
			"（仙元 +" + def.harvestXy + " · 丹毒 -" + def.harvestToxClr +
			(lawUp > 0 ? " · 道韵凝成 +" + lawUp + " 重" : "") + "）！";
		this.herbGarden.lastNote = note;
		return true;
	},

	harvestAllHerbs: function(){
		if (!this.immortalAscended || !this.herbGarden){ return 0; }
		var count = 0;
		for (var i = 0; i < this.herbGarden.plotsUnlocked; i++){
			if (this.harvestHerbPlot(i)){ count++; }
		}
		return count;
	},

	tickHerbGarden: function(ticksDelta){
		if (!this.immortalAscended || !this.herbGarden){ return; }
		var rate = this.getGardenGrowthRate();
		var step = Math.max(0, (typeof ticksDelta === "number" ? ticksDelta : 1) * rate);
		if (step <= 0){ return; }
		for (var i = 0; i < this.herbGarden.plotsUnlocked; i++){
			var p = this.herbGarden.plots[i];
			if (!p){ continue; }
			if (!p.herbKey && this.herbGarden.autoTend){
				var seedToPlant = this.herbGarden.selectedSeed || "xianlan";
				if (!this.plantHerbPlot(i, seedToPlant) && seedToPlant !== "xianlan"){
					this.plantHerbPlot(i, "xianlan");
				}
				p = this.herbGarden.plots[i];
			}
			if (p && p.herbKey && !p.mature){
				p.progress = Math.min(p.maxTicks, p.progress + step);
				if (p.progress >= p.maxTicks){
					p.mature = true;
				}
			}
			if (p && p.mature && this.herbGarden.autoTend){
				var prevKey = p.herbKey;
				if (this.harvestHerbPlot(i)){
					if (!this.plantHerbPlot(i, prevKey) && prevKey !== "xianlan"){
						this.plantHerbPlot(i, "xianlan");
					}
				}
			}
		}
	},

	getHighestUnlockedPill: function(){
		for (var i = this.pills.length - 1; i >= 0; i--){
			if (this.isPillUnlocked(this.pills[i])){ return this.pills[i]; }
		}
		return this.pills[0] || null;
	},

	infuseHerbAlchemy: function(herbKey){
		if (!this.immortalAscended || !this.herbGarden){ return false; }
		var def = this.getHerbDef(herbKey);
		if (!def || (this.herbGarden.stock[herbKey] || 0) <= 0){ return false; }
		this.herbGarden.stock[herbKey]--;
		var xyRes = this.game.resPool.get("xianyuan");
		if (xyRes){ xyRes.unlocked = true; }
		this.game.resPool.addResEvent("xianyuan", def.infuseXy);
		this.pillToxicity = Math.max(0, (this.pillToxicity || 0) - def.infuseToxClr);
		this.alchemyExp = (this.alchemyExp || 0) + def.infuseAlcExp;

		var topPill = this.getHighestUnlockedPill();
		var extraDesc = "";
		if (herbKey === "xianlan"){
			if (topPill){
				topPill.val = (topPill.val || 0) + 1;
				if (!this.supremePills){ this.supremePills = {}; }
				this.supremePills[topPill.name] = (this.supremePills[topPill.name] || 0) + 1;
				extraDesc = "，淬成丹纹【" + topPill.label + "】×1";
			}
		} else if (herbKey === "zizhi"){
			if (topPill){
				topPill.val = (topPill.val || 0) + 2;
				extraDesc = "，成丹【" + topPill.label + "】×2";
			}
			this.buffs.herbPotency = Math.max(this.buffs.herbPotency || 0, 1800);
		} else if (herbKey === "qinglian"){
			this.herbGarden.daoDiscountStacks = Math.min(3, (this.herbGarden.daoDiscountStacks || 0) + 1);
			extraDesc = "，下次参悟法则减免 " + (this.herbGarden.daoDiscountStacks * 15) + "% 仙元";
		} else if (herbKey === "daoguo"){
			this.herbGarden.immortalLifeBonus = (this.herbGarden.immortalLifeBonus || 0) + 1500;
			var lawGained = this.addDaoLawProgress(65);
			extraDesc = "，寿元上限 +1500" + (lawGained > 0 ? "，自凝法则道韵 +" + lawGained + " 重" : "，道韵感悟 +65%");
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var note = "【仙草入丹】炼化万年【" + $I(def.labelKey) + "】：仙元 +" + def.infuseXy +
			"，涤除丹毒 " + def.infuseToxClr + extraDesc + "！";
		this.herbGarden.lastNote = note;
		this.lastAlchemyNote = note;
		this.game.msg(note, "important");
		return true;
	},

	getBindXianqiCost: function(key){
		var mult = this.getImprintCostMult();
		if (!this.xianqi || this.xianqi.stage <= 0){
			return Math.max(5, Math.round(10 * mult));
		}
		if (this.xianqi.boundKey === key){ return 0; }
		return Math.max(4, Math.round(8 * mult));
	},

	bindImmortalArtifact: function(key){
		if (!this.immortalAscended){ return false; }
		var def = this.getImmortalArtifactDef(key);
		if (!def){ return false; }
		this.xianqi = this.normalizeXianqi(this.xianqi);
		if (this.xianqi.boundKey === key && this.xianqi.stage > 0){ return true; }
		var cost = this.getBindXianqiCost(key);
		var xy = this.game.resPool.get("xianyuan");
		if (!xy || xy.value < cost){ return false; }
		this.game.resPool.addResEvent("xianyuan", -cost);
		var wasUnbound = (this.xianqi.stage <= 0);
		this.xianqi.boundKey = key;
		if (wasUnbound){
			this.xianqi.stage = 1;
			this.xianqi.nurtureExp = 0;
			this.xianqi.totalRefines = (this.xianqi.totalRefines || 0) + 1;
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.cave.badge") || "").indexOf("Immortal") === 0;
		var note = wasUnbound
			? (isEn ? ("Bound Stage 1 Natal Artifact [" + $I(def.labelKey) + "] — Tier 1 Resonance awakened!") : ("【本命仙器认主】精血融仙元，成功熔铸一阶本命仙器【" + $I(def.labelKey) + "】，觉醒首重器灵共鸣！"))
			: (isEn ? ("Attuned Natal Artifact archetype to [" + $I(def.labelKey) + "]!") : ("【仙器转修】器灵道胎流转，本命仙器已转修为同阶【" + $I(def.labelKey) + "】！"));
		this.xianqi.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	getNurtureXianqiCost: function(){
		return Math.max(5, Math.round(10 * this.getImprintCostMult()));
	},

	nurtureImmortalArtifact: function(){
		if (!this.immortalAscended || !this.xianqi || !this.xianqi.boundKey || this.xianqi.stage <= 0){
			return false;
		}
		if (this.xianqi.nurtureExp >= 100){ return false; }
		var cost = this.getNurtureXianqiCost();
		var xy = this.game.resPool.get("xianyuan");
		if (!xy || xy.value < cost){ return false; }
		this.game.resPool.addResEvent("xianyuan", -cost);
		this.xianqi.nurtureExp = Math.min(100, (this.xianqi.nurtureExp || 0) + 25);
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var def = this.getImmortalArtifactDef(this.xianqi.boundKey);
		var isEn = String($I("cultivation.cave.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Nurtured [" + (def ? $I(def.labelKey) : "") + "] spirit to " + this.xianqi.nurtureExp + "%!")
			: ("【仙元温养】灌注仙元滋养【" + (def ? $I(def.labelKey) : "") + "】，器灵温养度升至 " + this.xianqi.nurtureExp + "%！");
		this.xianqi.lastNote = note;
		return true;
	},

	getXianqiRefineReq: function(){
		if (!this.xianqi || !this.xianqi.boundKey || this.xianqi.stage <= 0 || this.xianqi.stage >= 6){
			return null;
		}
		var nextSt = this.xianqi.stage + 1;
		var cfg = this.XIANQI_STAGES[nextSt];
		if (!cfg){ return null; }
		var impMult = this.getImprintCostMult();
		var nurtDisc = 1 - Math.min(0.25, ((this.xianqi.nurtureExp || 0) / 100) * 0.25);
		var xyCost = Math.max(10, this.roundNice(cfg.xianyuan * impMult * nurtDisc));
		var oreCost = cfg.oreRes ? Math.max(4, this.roundNice(cfg.oreVal * impMult)) : 0;
		var xyObj = this.game.resPool.get("xianyuan");
		var oreObj = cfg.oreRes ? this.game.resPool.get(cfg.oreRes) : null;
		var haveHerbs = this.getHerbTotalStock();
		var okXy = !!(xyObj && xyObj.value >= xyCost);
		var okHerbs = haveHerbs >= cfg.herbs;
		var okOre = !cfg.oreRes || !!(oreObj && oreObj.value >= oreCost);
		var okLaw = (this.daoyun || 0) >= cfg.reqDaoyun;
		return {
			nextStage: nextSt,
			title: cfg.title,
			titleEn: cfg.titleEn || cfg.title,
			xianyuan: xyCost,
			herbs: cfg.herbs,
			oreRes: cfg.oreRes,
			oreVal: oreCost,
			reqDaoyun: cfg.reqDaoyun,
			okXy: okXy,
			okHerbs: okHerbs,
			okOre: okOre,
			okLaw: okLaw,
			affordable: !!(okXy && okHerbs && okOre && okLaw)
		};
	},

	consumeAnyImmortalHerbs: function(count){
		if (count <= 0){ return true; }
		if (this.getHerbTotalStock() < count){ return false; }
		var rem = count;
		for (var i = 0; i < this.IMMORTAL_HERBS.length && rem > 0; i++){
			var k = this.IMMORTAL_HERBS[i].key;
			var avail = Math.max(0, Math.floor(this.herbGarden.stock[k] || 0));
			if (avail > 0){
				var take = Math.min(avail, rem);
				this.herbGarden.stock[k] = avail - take;
				rem -= take;
			}
		}
		return rem === 0;
	},

	refineImmortalArtifact: function(){
		if (!this.immortalAscended || !this.xianqi || !this.xianqi.boundKey){ return false; }
		var req = this.getXianqiRefineReq();
		if (!req || !req.affordable){ return false; }
		this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
		if (req.oreRes && req.oreVal > 0){
			this.game.resPool.addResEvent(req.oreRes, -req.oreVal);
		}
		this.consumeAnyImmortalHerbs(req.herbs);
		this.xianqi.stage = req.nextStage;
		this.xianqi.nurtureExp = 0;
		this.xianqi.totalRefines = (this.xianqi.totalRefines || 0) + 1;
		if (classes.ui && classes.ui.XianxiaAudio && classes.ui.XianxiaAudio.playBell){
			classes.ui.XianxiaAudio.playBell(this.game, true);
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var def = this.getImmortalArtifactDef(this.xianqi.boundKey);
		var isEn = String($I("cultivation.cave.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Refined Natal Artifact [" + (def ? $I(def.labelKey) : "") + "] to [" + (req.titleEn || req.title) + "]!")
			: ("【仙器祭炼破阶】仙火淬法则，本命仙器【" + (def ? $I(def.labelKey) : "") + "】晋升至【" + req.title + "】！");
		this.xianqi.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	getActiveResonancePassives: function(){
		var out = [];
		if (!this.xianqi || !this.xianqi.boundKey){ return out; }
		var def = this.getImmortalArtifactDef(this.xianqi.boundKey);
		if (!def || !def.passives){ return out; }
		var st = this.xianqi.stage || 0;
		for (var i = 0; i < def.passives.length; i++){
			var p = def.passives[i];
			out.push({
				tier: p.tier,
				title: p.title,
				titleEn: p.titleEn || p.title,
				desc: p.desc,
				descEn: p.descEn || p.desc,
				unlocked: st >= p.tier
			});
		}
		return out;
	},

	// ---------------- XX-5 周天星斗护山大阵与跨界仙盟奇遇悬赏 ----------------

	STAR_CORES: [
		{
			key: "ziwei",
			labelKey: "cultivation.starcore.ziwei.label",
			descKey: "cultivation.starcore.ziwei.desc",
			art: "res/art/starcore_ziwei.webp",
			condenseXy: 24,
			auxRes: "starchart",
			auxVal: 15,
			xyBase: 0.035,
			xyRatio: 0.14,
			xwRatio: 0.18,
			daoDisc: 0.05,
			defense: 120
		},
		{
			key: "taiyang",
			labelKey: "cultivation.starcore.taiyang.label",
			descKey: "cultivation.starcore.taiyang.desc",
			art: "res/art/starcore_taiyang.webp",
			condenseXy: 28,
			auxRes: "timeCrystal",
			auxVal: 8,
			combatMult: 0.16,
			riftDmg: 0.14,
			shieldBreak: 0.12,
			alcCrit: 0.08,
			alcYield: 0.08,
			defense: 145
		},
		{
			key: "taiyin",
			labelKey: "cultivation.starcore.taiyin.label",
			descKey: "cultivation.starcore.taiyin.desc",
			art: "res/art/starcore_taiyin.webp",
			condenseXy: 28,
			auxRes: "relic",
			auxVal: 10,
			riftMit: 0.06,
			startShield: 0.09,
			pillPot: 0.12,
			toxRed: 0.08,
			herbSpd: 0.15,
			defense: 135
		}
	],

	ZHOUTIAN_TIERS: [
		{tier: 0, socketsOpen: 0, titleKey: "cultivation.zhoutian.tier.0", xianyuan: 0,   starchart: 0,   auxRes: null,          auxVal: 0,  reqDaoyun: 0, xyBase: 0,    xyRatio: 0,    pillPot: 0,    alcCrit: 0,    alcYield: 0,    riftDmg: 0,    riftMit: 0,    defense: 0},
		{tier: 1, socketsOpen: 1, titleKey: "cultivation.zhoutian.tier.1", xianyuan: 12,  starchart: 0,   auxRes: null,          auxVal: 0,  reqDaoyun: 1, xyBase: 0.02, xyRatio: 0.08, pillPot: 0.06, alcCrit: 0.04, alcYield: 0.04, riftDmg: 0.08, riftMit: 0.03, defense: 140},
		{tier: 2, socketsOpen: 2, titleKey: "cultivation.zhoutian.tier.2", xianyuan: 32,  starchart: 20,  auxRes: "relic",       auxVal: 8,  reqDaoyun: 1, xyBase: 0.04, xyRatio: 0.16, pillPot: 0.12, alcCrit: 0.08, alcYield: 0.08, riftDmg: 0.15, riftMit: 0.06, defense: 290},
		{tier: 3, socketsOpen: 3, titleKey: "cultivation.zhoutian.tier.3", xianyuan: 68,  starchart: 45,  auxRes: "timeCrystal", auxVal: 15, reqDaoyun: 2, xyBase: 0.07, xyRatio: 0.26, pillPot: 0.18, alcCrit: 0.12, alcYield: 0.12, riftDmg: 0.24, riftMit: 0.09, defense: 500},
		{tier: 4, socketsOpen: 3, titleKey: "cultivation.zhoutian.tier.4", xianyuan: 125, starchart: 90,  auxRes: "timeCrystal", auxVal: 30, reqDaoyun: 3, xyBase: 0.11, xyRatio: 0.38, pillPot: 0.25, alcCrit: 0.16, alcYield: 0.16, riftDmg: 0.34, riftMit: 0.12, defense: 780},
		{tier: 5, socketsOpen: 3, titleKey: "cultivation.zhoutian.tier.5", xianyuan: 220, starchart: 160, auxRes: "unobtainium", auxVal: 45, reqDaoyun: 4, xyBase: 0.16, xyRatio: 0.52, pillPot: 0.33, alcCrit: 0.20, alcYield: 0.20, riftDmg: 0.45, riftMit: 0.15, defense: 1150},
		{tier: 6, socketsOpen: 3, titleKey: "cultivation.zhoutian.tier.6", xianyuan: 380, starchart: 280, auxRes: "timeCrystal", auxVal: 85, reqDaoyun: 6, xyBase: 0.22, xyRatio: 0.70, pillPot: 0.42, alcCrit: 0.25, alcYield: 0.25, riftDmg: 0.58, riftMit: 0.18, defense: 1650}
	],

	ALLIANCE_BOUNTIES: [
		{
			key: "starfall_observatory",
			labelKey: "cultivation.bounty.item.starfall_observatory.label",
			descKey: "cultivation.bounty.item.starfall_observatory.desc",
			art: "res/art/bounty_scroll_gold.webp",
			pillar: "dao",
			baseTicks: 80,
			baseXy: 30,
			baseMerit: 22,
			coreKey: "ziwei",
			lawPts: 32
		},
		{
			key: "abyss_demon_hunt",
			labelKey: "cultivation.bounty.item.abyss_demon_hunt.label",
			descKey: "cultivation.bounty.item.abyss_demon_hunt.desc",
			art: "res/art/demon_tianmo_raid.webp",
			pillar: "combat",
			baseTicks: 90,
			baseXy: 36,
			baseMerit: 26,
			coreKey: "taiyang",
			lawPts: 26
		},
		{
			key: "jade_herb_valley",
			labelKey: "cultivation.bounty.item.jade_herb_valley.label",
			descKey: "cultivation.bounty.item.jade_herb_valley.desc",
			art: "res/art/starcore_taiyin.webp",
			pillar: "herb",
			baseTicks: 75,
			baseXy: 28,
			baseMerit: 20,
			coreKey: "taiyin",
			lawPts: 36
		},
		{
			key: "primordial_sword_tomb",
			labelKey: "cultivation.bounty.item.primordial_sword_tomb.label",
			descKey: "cultivation.bounty.item.primordial_sword_tomb.desc",
			art: "res/art/starcore_taiyang.webp",
			pillar: "xianqi",
			baseTicks: 95,
			baseXy: 38,
			baseMerit: 28,
			coreKey: "taiyang",
			lawPts: 30
		},
		{
			key: "celestial_alchemy_convoy",
			labelKey: "cultivation.bounty.item.celestial_alchemy_convoy.label",
			descKey: "cultivation.bounty.item.celestial_alchemy_convoy.desc",
			art: "res/art/bounty_alliance_token.webp",
			pillar: "alchemy",
			baseTicks: 85,
			baseXy: 32,
			baseMerit: 24,
			coreKey: "taiyin",
			lawPts: 34
		},
		{
			key: "zhoutian_astral_beacon",
			labelKey: "cultivation.bounty.item.zhoutian_astral_beacon.label",
			descKey: "cultivation.bounty.item.zhoutian_astral_beacon.desc",
			art: "res/art/starcore_ziwei.webp",
			pillar: "star",
			baseTicks: 100,
			baseXy: 44,
			baseMerit: 32,
			coreKey: "ziwei",
			lawPts: 40
		}
	],

	makeDefaultStarArray: function(){
		return {
			tier: 0,
			selectedCore: "ziwei",
			sockets: [null, null, null],
			cores: {ziwei: 0, taiyang: 0, taiyin: 0},
			raidThreat: 0,
			repelCount: 0,
			autoRepel: false,
			totalCoresEarned: 0,
			lastNote: null
		};
	},

	makeDefaultImmortalBounty: function(){
		return {
			merit: 0,
			totalMeritEarned: 0,
			completedCount: 0,
			chainChapter: 1,
			boardKeys: ["starfall_observatory", "abyss_demon_hunt", "jade_herb_valley"],
			freeRefreshReady: true,
			active: null,
			autoDispatch: false,
			lastNote: null
		};
	},

	getStarCoreDef: function(key){
		for (var i = 0; i < this.STAR_CORES.length; i++){
			if (this.STAR_CORES[i].key === key){ return this.STAR_CORES[i]; }
		}
		return null;
	},

	getBountyDef: function(key){
		for (var i = 0; i < this.ALLIANCE_BOUNTIES.length; i++){
			if (this.ALLIANCE_BOUNTIES[i].key === key){ return this.ALLIANCE_BOUNTIES[i]; }
		}
		return null;
	},

	normalizeStarArray: function(raw){
		var def = this.makeDefaultStarArray();
		if (!raw || typeof raw !== "object"){ return def; }
		if (typeof raw.tier === "number" && isFinite(raw.tier)){
			def.tier = Math.min(6, Math.max(0, Math.floor(raw.tier)));
		}
		if (typeof raw.selectedCore === "string" && this.getStarCoreDef(raw.selectedCore)){
			def.selectedCore = raw.selectedCore;
		}
		var tCfg = this.ZHOUTIAN_TIERS[def.tier] || this.ZHOUTIAN_TIERS[0];
		if (raw.sockets && raw.sockets.length){
			for (var i = 0; i < 3; i++){
				var sk = raw.sockets[i];
				if (i < tCfg.socketsOpen && typeof sk === "string" && this.getStarCoreDef(sk)){
					def.sockets[i] = sk;
				}
			}
		}
		for (var ci = 0; ci < this.STAR_CORES.length; ci++){
			var ck = this.STAR_CORES[ci].key;
			if (raw.cores && typeof raw.cores[ck] === "number" && isFinite(raw.cores[ck])){
				def.cores[ck] = Math.max(0, Math.floor(raw.cores[ck]));
			}
		}
		if (typeof raw.raidThreat === "number" && isFinite(raw.raidThreat)){
			def.raidThreat = Math.min(100, Math.max(0, raw.raidThreat));
		}
		if (typeof raw.repelCount === "number" && isFinite(raw.repelCount)){
			def.repelCount = Math.max(0, Math.floor(raw.repelCount));
		}
		if (typeof raw.autoRepel === "boolean"){ def.autoRepel = raw.autoRepel; }
		if (typeof raw.totalCoresEarned === "number" && isFinite(raw.totalCoresEarned)){
			def.totalCoresEarned = Math.max(0, Math.floor(raw.totalCoresEarned));
		}
		if (typeof raw.lastNote === "string"){ def.lastNote = raw.lastNote; }
		return def;
	},

	normalizeImmortalBounty: function(raw){
		var def = this.makeDefaultImmortalBounty();
		if (!raw || typeof raw !== "object"){ return def; }
		if (typeof raw.merit === "number" && isFinite(raw.merit)){
			def.merit = Math.max(0, Math.floor(raw.merit));
		}
		if (typeof raw.totalMeritEarned === "number" && isFinite(raw.totalMeritEarned)){
			def.totalMeritEarned = Math.max(def.merit, Math.floor(raw.totalMeritEarned));
		}
		if (typeof raw.completedCount === "number" && isFinite(raw.completedCount)){
			def.completedCount = Math.max(0, Math.floor(raw.completedCount));
		}
		if (typeof raw.chainChapter === "number" && isFinite(raw.chainChapter)){
			def.chainChapter = Math.max(1, Math.floor(raw.chainChapter));
		} else {
			def.chainChapter = 1 + Math.floor(def.completedCount / 3);
		}
		if (raw.boardKeys && raw.boardKeys.length){
			var cleanBoard = [];
			for (var bi = 0; bi < raw.boardKeys.length && cleanBoard.length < 3; bi++){
				var bk = raw.boardKeys[bi];
				if (typeof bk === "string" && this.getBountyDef(bk) && cleanBoard.indexOf(bk) < 0){
					cleanBoard.push(bk);
				}
			}
			for (var fi = 0; fi < this.ALLIANCE_BOUNTIES.length && cleanBoard.length < 3; fi++){
				var fk = this.ALLIANCE_BOUNTIES[fi].key;
				if (cleanBoard.indexOf(fk) < 0){ cleanBoard.push(fk); }
			}
			def.boardKeys = cleanBoard;
		}
		if (typeof raw.freeRefreshReady === "boolean"){ def.freeRefreshReady = raw.freeRefreshReady; }
		if (typeof raw.autoDispatch === "boolean"){ def.autoDispatch = raw.autoDispatch; }
		if (raw.active && typeof raw.active === "object" && typeof raw.active.key === "string" && this.getBountyDef(raw.active.key)){
			var bDef = this.getBountyDef(raw.active.key);
			var mTicks = (typeof raw.active.maxTicks === "number" && raw.active.maxTicks > 0) ? Math.floor(raw.active.maxTicks) : bDef.baseTicks;
			var prog = (typeof raw.active.progress === "number" && isFinite(raw.active.progress)) ? Math.max(0, Math.min(mTicks, raw.active.progress)) : 0;
			var synM = (typeof raw.active.synergyMult === "number" && isFinite(raw.active.synergyMult)) ? Math.max(1, Math.min(3, raw.active.synergyMult)) : 1;
			def.active = {
				key: raw.active.key,
				progress: prog,
				maxTicks: mTicks,
				synergyMult: synM,
				ready: !!(raw.active.ready || prog >= mTicks)
			};
		}
		if (typeof raw.lastNote === "string"){ def.lastNote = raw.lastNote; }
		return def;
	},

	getStarImprintCostMult: function(){
		var baseMult = this.getImprintCostMult();
		var seal = Math.max(0, Math.min(6, Math.floor(this.starImprintTier || 0)));
		return Math.max(0.62, baseMult * (1 - seal * 0.03));
	},

	getStarCoreTotalStock: function(){
		if (!this.starArray || !this.starArray.cores){ return 0; }
		var sum = 0;
		for (var i = 0; i < this.STAR_CORES.length; i++){
			var k = this.STAR_CORES[i].key;
			sum += Math.max(0, Math.floor(this.starArray.cores[k] || 0));
		}
		return sum;
	},

	getSocketedCoreCount: function(){
		if (!this.starArray || !this.starArray.sockets){ return 0; }
		var cnt = 0;
		for (var i = 0; i < 3; i++){
			if (this.starArray.sockets[i]){ cnt++; }
		}
		return cnt;
	},

	hasTriStarHarmony: function(){
		if (!this.starArray || (this.starArray.tier || 0) < 3 || !this.starArray.sockets){
			return false;
		}
		var s0 = this.starArray.sockets[0];
		var s1 = this.starArray.sockets[1];
		var s2 = this.starArray.sockets[2];
		if (!s0 || !s1 || !s2){ return false; }
		return (s0 !== s1 && s0 !== s2 && s1 !== s2);
	},

	selectStarCore: function(coreKey){
		if (!this.getStarCoreDef(coreKey)){ return false; }
		this.starArray = this.normalizeStarArray(this.starArray);
		this.starArray.selectedCore = coreKey;
		return true;
	},

	getCondenseStarCoreCost: function(coreKey){
		var def = this.getStarCoreDef(coreKey);
		if (!def){ return null; }
		var mult = this.getStarImprintCostMult();
		var xyCost = Math.max(8, this.roundNice(def.condenseXy * mult));
		var auxCost = Math.max(4, this.roundNice(def.auxVal * mult));
		var xyObj = this.game.resPool.get("xianyuan");
		var auxObj = this.game.resPool.get(def.auxRes);
		var okXy = !!(xyObj && xyObj.value >= xyCost);
		var okAux = !!(auxObj && auxObj.value >= auxCost);
		return {
			coreKey: def.key,
			xianyuan: xyCost,
			auxRes: def.auxRes,
			auxVal: auxCost,
			affordable: !!(okXy && okAux)
		};
	},

	condenseStarCore: function(coreKey){
		if (!this.immortalAscended){ return false; }
		this.starArray = this.normalizeStarArray(this.starArray);
		var key = coreKey || this.starArray.selectedCore || "ziwei";
		var req = this.getCondenseStarCoreCost(key);
		if (!req || !req.affordable){ return false; }
		this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
		this.game.resPool.addResEvent(req.auxRes, -req.auxVal);
		this.starArray.cores[key] = (this.starArray.cores[key] || 0) + 1;
		this.starArray.totalCoresEarned = (this.starArray.totalCoresEarned || 0) + 1;
		this.starArray.selectedCore = key;
		var def = this.getStarCoreDef(key);
		var isEn = String($I("cultivation.sanctum.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Condensed 1x [" + (def ? $I(def.labelKey) : key) + "] into the Star Treasury!")
			: ("【凝炼星核】引九天星力入炉，成功凝得一枚【" + (def ? $I(def.labelKey) : key) + "】！");
		this.starArray.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	socketStarCore: function(slotIdx, coreKeyOpt){
		if (!this.immortalAscended){ return false; }
		this.starArray = this.normalizeStarArray(this.starArray);
		var idx = Math.floor(slotIdx);
		var tCfg = this.ZHOUTIAN_TIERS[this.starArray.tier || 0] || this.ZHOUTIAN_TIERS[0];
		if (idx < 0 || idx >= 3 || idx >= tCfg.socketsOpen){ return false; }
		var targetKey = coreKeyOpt || this.starArray.selectedCore || "ziwei";
		if (!this.getStarCoreDef(targetKey)){ return false; }
		var prevKey = this.starArray.sockets[idx];
		if (prevKey === targetKey && !coreKeyOpt){
			return this.unsocketStarCore(idx);
		}
		if ((this.starArray.cores[targetKey] || 0) <= 0){
			if (prevKey && !coreKeyOpt){
				return this.unsocketStarCore(idx);
			}
			return false;
		}
		this.starArray.cores[targetKey]--;
		if (prevKey && this.getStarCoreDef(prevKey)){
			this.starArray.cores[prevKey] = (this.starArray.cores[prevKey] || 0) + 1;
		}
		this.starArray.sockets[idx] = targetKey;
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var cDef = this.getStarCoreDef(targetKey);
		var harmony = this.hasTriStarHarmony();
		var isEn = String($I("cultivation.sanctum.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Socketed [" + $I(cDef.labelKey) + "] into " + $I("cultivation.zhoutian.socket." + idx) + (harmony ? " — Tri-Star Harmony awakened!" : "!"))
			: ("【阵眼镶嵌】已将【" + $I(cDef.labelKey) + "】嵌入" + $I("cultivation.zhoutian.socket." + idx) + (harmony ? "，激发【三垣日月同辉】共鸣！" : "！"));
		this.starArray.lastNote = note;
		return true;
	},

	unsocketStarCore: function(slotIdx){
		if (!this.immortalAscended || !this.starArray){ return false; }
		this.starArray = this.normalizeStarArray(this.starArray);
		var idx = Math.floor(slotIdx);
		if (idx < 0 || idx >= 3){ return false; }
		var prevKey = this.starArray.sockets[idx];
		if (!prevKey){ return false; }
		this.starArray.sockets[idx] = null;
		if (this.getStarCoreDef(prevKey)){
			this.starArray.cores[prevKey] = (this.starArray.cores[prevKey] || 0) + 1;
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var cDef = this.getStarCoreDef(prevKey);
		var isEn = String($I("cultivation.sanctum.badge") || "").indexOf("Immortal") === 0;
		this.starArray.lastNote = isEn
			? ("Returned [" + (cDef ? $I(cDef.labelKey) : prevKey) + "] from " + $I("cultivation.zhoutian.socket." + idx) + " to Star Treasury.")
			: ("【起出星核】已自" + $I("cultivation.zhoutian.socket." + idx) + "收回【" + (cDef ? $I(cDef.labelKey) : prevKey) + "】。");
		return true;
	},

	getStarArrayDeduceReq: function(){
		var sa = this.starArray || this.makeDefaultStarArray();
		if ((sa.tier || 0) >= 6){ return null; }
		var nextTier = (sa.tier || 0) + 1;
		var cfg = this.ZHOUTIAN_TIERS[nextTier];
		if (!cfg){ return null; }
		var mult = this.getStarImprintCostMult();
		var xyCost = Math.max(8, this.roundNice(cfg.xianyuan * mult));
		var scCost = cfg.starchart > 0 ? Math.max(5, this.roundNice(cfg.starchart * mult)) : 0;
		var auxCost = (cfg.auxRes && cfg.auxVal > 0) ? Math.max(4, this.roundNice(cfg.auxVal * mult)) : 0;
		var xyObj = this.game.resPool.get("xianyuan");
		var scObj = scCost > 0 ? this.game.resPool.get("starchart") : null;
		var auxObj = cfg.auxRes ? this.game.resPool.get(cfg.auxRes) : null;
		var okXy = !!(xyObj && xyObj.value >= xyCost);
		var okSc = scCost <= 0 || !!(scObj && scObj.value >= scCost);
		var okAux = !cfg.auxRes || auxCost <= 0 || !!(auxObj && auxObj.value >= auxCost);
		var okLaw = (this.daoyun || 0) >= cfg.reqDaoyun;
		return {
			nextTier: nextTier,
			titleKey: cfg.titleKey,
			xianyuan: xyCost,
			starchart: scCost,
			auxRes: cfg.auxRes,
			auxVal: auxCost,
			reqDaoyun: cfg.reqDaoyun,
			okXy: okXy,
			okSc: okSc,
			okAux: okAux,
			okLaw: okLaw,
			affordable: !!(okXy && okSc && okAux && okLaw)
		};
	},

	deduceStarArrayTier: function(){
		if (!this.immortalAscended){ return false; }
		this.starArray = this.normalizeStarArray(this.starArray);
		var req = this.getStarArrayDeduceReq();
		if (!req || !req.affordable){ return false; }
		this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
		if (req.starchart > 0){
			this.game.resPool.addResEvent("starchart", -req.starchart);
		}
		if (req.auxRes && req.auxVal > 0){
			this.game.resPool.addResEvent(req.auxRes, -req.auxVal);
		}
		this.starArray.tier = req.nextTier;
		if (req.nextTier > (this.starImprintTier || 0)){
			this.starImprintTier = req.nextTier;
		}
		if (classes.ui && classes.ui.XianxiaAudio && classes.ui.XianxiaAudio.playBell){
			classes.ui.XianxiaAudio.playBell(this.game, true);
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.sanctum.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Deduced Zhoutian Array to [" + $I(req.titleKey) + "]!")
			: ("【阵图推演破阶】星盘演化诸天，护山大阵晋升至【" + $I(req.titleKey) + "】！");
		this.starArray.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	getStarArrayDefensePower: function(){
		var sa = this.starArray || this.makeDefaultStarArray();
		if (!this.immortalAscended || (sa.tier || 0) <= 0){ return 0; }
		var tCfg = this.ZHOUTIAN_TIERS[sa.tier] || this.ZHOUTIAN_TIERS[0];
		var def = tCfg.defense || 0;
		for (var i = 0; i < 3; i++){
			var ck = sa.sockets[i];
			if (ck){
				var cDef = this.getStarCoreDef(ck);
				if (cDef){ def += cDef.defense || 0; }
			}
		}
		if (this.hasTriStarHarmony()){
			def += 260;
		}
		def += Math.max(0, Math.floor(this.daoyun || 0)) * 35;
		if (this.xianqi && this.xianqi.boundKey && this.xianqi.stage > 0){
			def += this.xianqi.stage * 40;
		}
		if ((this.starImprintTier || 0) > 0){
			def += this.starImprintTier * 25;
		}
		if (this.daoSteleForest && this.daoSteleForest.levels && (this.daoSteleForest.levels.astral || 0) > 0){
			def += this.daoSteleForest.levels.astral * 55;
		}
		if (this.spiritNursery && this.spiritNursery.beasts && this.spiritNursery.beasts.black_tortoise && (this.spiritNursery.beasts.black_tortoise.stage || 0) > 0){
			def += this.spiritNursery.beasts.black_tortoise.stage * 35;
		}
		if (this.starship && (this.starship.vesselTier || 0) > 0){
			def += this.starship.vesselTier * 40;
		}
		if (this.hongmengAltar && this.hongmengAltar.treasures && (this.hongmengAltar.treasures.xuanhuangPagoda || 0) > 0){
			def += this.hongmengAltar.treasures.xuanhuangPagoda * 45;
		}
		return Math.round(def);
	},

	getNextDemonRaidPower: function(){
		var sa = this.starArray || this.makeDefaultStarArray();
		var wave = (sa.repelCount || 0) + 1;
		var tierFactor = Math.max(1, sa.tier || 1);
		return Math.round(130 + (tierFactor - 1) * 145 + Math.min(600, (wave - 1) * 28));
	},

	getDemonRaidLureCost: function(){
		return Math.max(8, Math.round(14 * this.getStarImprintCostMult()));
	},

	grantStarCoreDrop: function(coreKey){
		this.starArray = this.normalizeStarArray(this.starArray);
		var k = (coreKey && this.getStarCoreDef(coreKey)) ? coreKey : "ziwei";
		this.starArray.cores[k] = (this.starArray.cores[k] || 0) + 1;
		this.starArray.totalCoresEarned = (this.starArray.totalCoresEarned || 0) + 1;
		return k;
	},

	repelHeavenlyDemonRaid: function(forceLure){
		if (!this.immortalAscended){ return false; }
		this.starArray = this.normalizeStarArray(this.starArray);
		this.immortalBounty = this.normalizeImmortalBounty(this.immortalBounty);
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		this.daoSteleForest = this.normalizeDaoSteleForest(this.daoSteleForest);
		this.starship = this.normalizeStarship(this.starship);
		if ((this.hongmengImprintTier || 0) > 0 && (this.starship.totalQiHarvested || 0) === 0 && (this.starship.hongmengQi || 0) === 0){
			var ascInitQi = this.getHongmengStartingQi();
			this.starship.hongmengQi = ascInitQi;
			this.starship.totalQiHarvested = ascInitQi;
		}
		this.hongmengAltar = this.normalizeHongmengAltar(this.hongmengAltar);
		if ((this.starArray.tier || 0) <= 0){ return false; }
		if (this.starArray.raidThreat < 100){
			if (!forceLure){ return false; }
			var lureCost = this.getDemonRaidLureCost();
			var xyObj = this.game.resPool.get("xianyuan");
			if (!xyObj || xyObj.value < lureCost){ return false; }
			this.game.resPool.addResEvent("xianyuan", -lureCost);
		}
		var ward = this.getStarArrayDefensePower();
		var threat = this.getNextDemonRaidPower();
		this.starArray.raidThreat = 0;
		this.starArray.repelCount = (this.starArray.repelCount || 0) + 1;
		var waveNum = this.starArray.repelCount;
		var tier = this.starArray.tier;
		var baseXy = 24 + tier * 10 + Math.min(36, waveNum * 2);
		var baseMerit = 18 + tier * 6;
		var isEn = String($I("cultivation.sanctum.badge") || "").indexOf("Immortal") === 0;
		var xyRes = this.game.resPool.get("xianyuan");
		if (xyRes){ xyRes.unlocked = true; }

		if (ward >= threat){
			this.game.resPool.addResEvent("xianyuan", baseXy);
			this.immortalBounty.merit = (this.immortalBounty.merit || 0) + baseMerit;
			this.immortalBounty.totalMeritEarned = (this.immortalBounty.totalMeritEarned || 0) + baseMerit;
			this.heartDemon = Math.max(0, (this.heartDemon || 0) - 12);
			this.alchemyExp = (this.alchemyExp || 0) + 3;
			var lawUp = this.addDaoLawProgress(18 + tier * 3);
			this.buffs.zhoutianSurge = Math.max(this.buffs.zhoutianSurge || 0, 1200);
			var droppedCore = null;
			if (waveNum % 2 === 0 || Math.random() < 0.35){
				var rotKeys = ["ziwei", "taiyang", "taiyin"];
				var pickKey = rotKeys[(waveNum - 1) % rotKeys.length];
				droppedCore = this.grantStarCoreDrop(pickKey);
			}
			if (this.game.updateCaches){ this.game.updateCaches(); }
			var dropDef = droppedCore ? this.getStarCoreDef(droppedCore) : null;
			var noteWin = isEn
				? ("Crushed Heavenly Demon Wave #" + waveNum + "! +" + baseXy + " Essence, +" + baseMerit + " Merit" + (dropDef ? (", +1 [" + $I(dropDef.labelKey) + "]") : "") + (lawUp > 0 ? (", +" + lawUp + " Dao Resonance") : "") + "!")
				: ("【周天诛魔大捷】星斗剑光绞碎第 " + waveNum + " 波域外天魔！获仙元 +" + baseXy + " · 功勋 +" + baseMerit + (dropDef ? (" · 战利【" + $I(dropDef.labelKey) + "】×1") : "") + (lawUp > 0 ? (" · 凝道韵 +" + lawUp + " 重") : "") + "！");
			this.starArray.lastNote = noteWin;
			this.game.msg(noteWin, "important");
		} else {
			var holdXy = Math.max(10, Math.round(baseXy * 0.55));
			var holdMerit = Math.max(8, Math.round(baseMerit * 0.55));
			this.game.resPool.addResEvent("xianyuan", holdXy);
			this.immortalBounty.merit = (this.immortalBounty.merit || 0) + holdMerit;
			this.immortalBounty.totalMeritEarned = (this.immortalBounty.totalMeritEarned || 0) + holdMerit;
			this.heartDemon = Math.max(0, (this.heartDemon || 0) - 5);
			if (this.game.updateCaches){ this.game.updateCaches(); }
			var noteHold = isEn
				? ("Ward held against Demon Wave #" + waveNum + " (+" + holdXy + " Essence, +" + holdMerit + " Merit — socket cores or deduce higher tier for counter-kill bonus!).")
				: ("【护山固守】大阵勉力抵住第 " + waveNum + " 波天魔冲击（仙元 +" + holdXy + " · 功勋 +" + holdMerit + "；镶嵌星核或推演阵阶可触发诛魔反哺）！");
			this.starArray.lastNote = noteHold;
			this.game.msg(noteHold, "notice");
		}
		return true;
	},

	toggleStarAutoRepel: function(){
		if (!this.immortalAscended){ return false; }
		this.starArray = this.normalizeStarArray(this.starArray);
		this.starArray.autoRepel = !this.starArray.autoRepel;
		return this.starArray.autoRepel;
	},

	tickStarArray: function(ticksDelta){
		if (!this.immortalAscended || !this.starArray || (this.starArray.tier || 0) <= 0){ return; }
		var step = Math.max(0, (typeof ticksDelta === "number" ? ticksDelta : 1) * 0.45);
		if (step <= 0){ return; }
		if (this.starArray.raidThreat < 100){
			this.starArray.raidThreat = Math.min(100, this.starArray.raidThreat + step);
		}
		if (this.starArray.raidThreat >= 100 && this.starArray.autoRepel){
			this.repelHeavenlyDemonRaid(false);
		}
	},

	getBountySynergy: function(bountyKey){
		var def = this.getBountyDef(bountyKey);
		if (!def){ return {mult: 1, pct: 100}; }
		var bonus = 0;
		var p = def.pillar;
		if (p === "dao"){
			bonus += Math.min(0.85, Math.max(0, this.daoyun || 0) * 0.12);
			var jx = this.getStage("jinxian_0");
			var zx = this.getStage("zhenxian_0");
			if (jx && jx.researched){ bonus += 0.35; }
			else if (zx && zx.researched){ bonus += 0.18; }
		} else if (p === "combat"){
			var highFloors = Math.max(0, (this.riftFloor || 0) - 25);
			bonus += Math.min(0.80, highFloors * 0.08);
			var cp = this.getCombatPower ? this.getCombatPower() : 0;
			if (cp >= 5000){ bonus += 0.25; }
			if (cp >= 25000){ bonus += 0.15; }
		} else if (p === "herb"){
			var hg = this.herbGarden || this.makeDefaultHerbGarden();
			bonus += Math.max(0, (hg.arrayLevel || 1) - 1) * 0.14;
			bonus += Math.min(0.60, (hg.totalHarvested || 0) * 0.04 + this.getHerbTotalStock() * 0.03);
		} else if (p === "xianqi"){
			var xq = this.xianqi || this.makeDefaultXianqi();
			bonus += (xq.stage || 0) * 0.16;
			bonus += Math.min(0.24, (xq.nurtureExp || 0) * 0.0024);
		} else if (p === "alchemy"){
			var ar = this.getAlchemyRank ? this.getAlchemyRank() : {rank: 1};
			bonus += Math.max(0, (ar.rank || 1) - 1) * 0.18;
			bonus += Math.min(0.45, this.getHerbTotalStock() * 0.04);
		} else if (p === "star"){
			var sa = this.starArray || this.makeDefaultStarArray();
			bonus += (sa.tier || 0) * 0.14;
			bonus += this.getSocketedCoreCount() * 0.12;
			if (this.hasTriStarHarmony()){ bonus += 0.20; }
		}
		var mult = Math.min(2.30, 1 + Math.max(0, bonus));
		return {
			mult: mult,
			pct: Math.round(mult * 100)
		};
	},

	getBountyRefreshCost: function(){
		var ib = this.immortalBounty || this.makeDefaultImmortalBounty();
		if (ib.freeRefreshReady){ return 0; }
		return Math.max(5, Math.round(8 * this.getStarImprintCostMult()));
	},

	refreshAllianceBounties: function(){
		if (!this.immortalAscended){ return false; }
		this.immortalBounty = this.normalizeImmortalBounty(this.immortalBounty);
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		this.daoSteleForest = this.normalizeDaoSteleForest(this.daoSteleForest);
		this.starship = this.normalizeStarship(this.starship);
		if ((this.hongmengImprintTier || 0) > 0 && (this.starship.totalQiHarvested || 0) === 0 && (this.starship.hongmengQi || 0) === 0){
			var ascInitQi = this.getHongmengStartingQi();
			this.starship.hongmengQi = ascInitQi;
			this.starship.totalQiHarvested = ascInitQi;
		}
		this.hongmengAltar = this.normalizeHongmengAltar(this.hongmengAltar);
		var cost = this.getBountyRefreshCost();
		if (cost > 0){
			var xy = this.game.resPool.get("xianyuan");
			if (!xy || xy.value < cost){ return false; }
			this.game.resPool.addResEvent("xianyuan", -cost);
		} else {
			this.immortalBounty.freeRefreshReady = false;
		}
		var allKeys = [];
		for (var i = 0; i < this.ALLIANCE_BOUNTIES.length; i++){
			allKeys.push(this.ALLIANCE_BOUNTIES[i].key);
		}
		var curLead = this.immortalBounty.boardKeys[0] || "";
		var startIdx = (allKeys.indexOf(curLead) + 1) % allKeys.length;
		if (startIdx < 0){ startIdx = 0; }
		var nextBoard = [];
		var stepOff = 1 + ((this.immortalBounty.completedCount || 0) % 2);
		for (var k = 0; k < allKeys.length && nextBoard.length < 3; k++){
			var cand = allKeys[(startIdx + k * stepOff) % allKeys.length];
			if (nextBoard.indexOf(cand) < 0){ nextBoard.push(cand); }
		}
		for (var m = 0; m < allKeys.length && nextBoard.length < 3; m++){
			if (nextBoard.indexOf(allKeys[m]) < 0){ nextBoard.push(allKeys[m]); }
		}
		this.immortalBounty.boardKeys = nextBoard;
		var isEn = String($I("cultivation.sanctum.badge") || "").indexOf("Immortal") === 0;
		this.immortalBounty.lastNote = isEn
			? "Rotated Cross-Realm Immortal Alliance commission decrees."
			: "【仙盟玉榜刷新】跨界接引使已更替三桩诸天奇遇悬赏令。";
		return true;
	},

	dispatchAllianceBounty: function(boardIdxOrKey){
		if (!this.immortalAscended){ return false; }
		this.immortalBounty = this.normalizeImmortalBounty(this.immortalBounty);
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		this.daoSteleForest = this.normalizeDaoSteleForest(this.daoSteleForest);
		this.starship = this.normalizeStarship(this.starship);
		if ((this.hongmengImprintTier || 0) > 0 && (this.starship.totalQiHarvested || 0) === 0 && (this.starship.hongmengQi || 0) === 0){
			var ascInitQi = this.getHongmengStartingQi();
			this.starship.hongmengQi = ascInitQi;
			this.starship.totalQiHarvested = ascInitQi;
		}
		this.hongmengAltar = this.normalizeHongmengAltar(this.hongmengAltar);
		if (this.immortalBounty.active){ return false; }
		var targetKey = null;
		if (typeof boardIdxOrKey === "number"){
			var bi = Math.floor(boardIdxOrKey);
			if (bi >= 0 && bi < this.immortalBounty.boardKeys.length){
				targetKey = this.immortalBounty.boardKeys[bi];
			}
		} else if (typeof boardIdxOrKey === "string"){
			if (this.immortalBounty.boardKeys.indexOf(boardIdxOrKey) >= 0){
				targetKey = boardIdxOrKey;
			} else {
				var parsed = parseInt(boardIdxOrKey, 10);
				if (!isNaN(parsed) && parsed >= 0 && parsed < this.immortalBounty.boardKeys.length){
					targetKey = this.immortalBounty.boardKeys[parsed];
				}
			}
		}
		var def = targetKey ? this.getBountyDef(targetKey) : null;
		if (!def){ return false; }
		var syn = this.getBountySynergy(def.key);
		var caveBounty = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
		var beastBountySpd = (caveBounty && caveBounty.bountySpeedBonus) ? caveBounty.bountySpeedBonus : 0;
		var speedDiv = 1 + Math.min(0.60, (syn.mult - 1) * 0.45) + beastBountySpd;
		var mTicks = Math.max(15, Math.round(def.baseTicks / speedDiv));
		this.immortalBounty.active = {
			key: def.key,
			progress: 0,
			maxTicks: mTicks,
			synergyMult: syn.mult,
			ready: false
		};
		var isEn = String($I("cultivation.sanctum.badge") || "").indexOf("Immortal") === 0;
		this.immortalBounty.lastNote = isEn
			? ("Dispatched avatar on [" + $I(def.labelKey) + "] (Synergy " + syn.pct + "%)!")
			: ("【奉令跨界】元神化身已踏入跨界星门，接办【" + $I(def.labelKey) + "】（契合加成 " + syn.pct + "%）！");
		return true;
	},

	getBountyBoostCost: function(){
		return Math.max(6, Math.round(10 * this.getStarImprintCostMult()));
	},

	boostAllianceBounty: function(){
		if (!this.immortalAscended || !this.immortalBounty || !this.immortalBounty.active){
			return false;
		}
		var act = this.immortalBounty.active;
		if (act.ready || act.progress >= act.maxTicks){ return false; }
		var cost = this.getBountyBoostCost();
		var xy = this.game.resPool.get("xianyuan");
		if (!xy || xy.value < cost){ return false; }
		this.game.resPool.addResEvent("xianyuan", -cost);
		act.progress = Math.min(act.maxTicks, act.progress + Math.ceil(act.maxTicks * 0.5));
		if (act.progress >= act.maxTicks){
			act.ready = true;
		}
		return true;
	},

	completeAllianceBounty: function(approach){
		if (!this.immortalAscended || !this.immortalBounty || !this.immortalBounty.active){
			return false;
		}
		this.starArray = this.normalizeStarArray(this.starArray);
		this.herbGarden = this.normalizeHerbGarden(this.herbGarden);
		var act = this.immortalBounty.active;
		if (!act.ready && act.progress < act.maxTicks){ return false; }
		var def = this.getBountyDef(act.key);
		if (!def){
			this.immortalBounty.active = null;
			return false;
		}
		var syn = this.getBountySynergy(def.key);
		var mult = Math.max(act.synergyMult || 1, syn.mult);
		var xyGain = Math.max(12, Math.round(def.baseXy * mult));
		var meritGain = Math.max(10, Math.round(def.baseMerit * mult));
		var mode = (approach === "dao") ? "dao" : "core";

		var xyRes = this.game.resPool.get("xianyuan");
		if (xyRes){ xyRes.unlocked = true; }
		this.game.resPool.addResEvent("xianyuan", xyGain);
		this.immortalBounty.merit = (this.immortalBounty.merit || 0) + meritGain;
		this.immortalBounty.totalMeritEarned = (this.immortalBounty.totalMeritEarned || 0) + meritGain;
		this.immortalBounty.completedCount = (this.immortalBounty.completedCount || 0) + 1;
		this.immortalBounty.freeRefreshReady = true;
		this.immortalBounty.active = null;

		var coreGainedKey = null;
		var lawGained = 0;
		if (mode === "core"){
			coreGainedKey = this.grantStarCoreDrop(def.coreKey);
			lawGained = this.addDaoLawProgress(Math.round(def.lawPts * 0.35));
		} else {
			var daoPts = Math.round(def.lawPts * mult);
			lawGained = this.addDaoLawProgress(daoPts);
			this.herbGarden.stock.zizhi = (this.herbGarden.stock.zizhi || 0) + 1;
			if (mult >= 1.50){
				coreGainedKey = this.grantStarCoreDrop(def.coreKey);
			}
		}

		var bIdx = this.immortalBounty.boardKeys.indexOf(def.key);
		if (bIdx >= 0){
			for (var ai = 0; ai < this.ALLIANCE_BOUNTIES.length; ai++){
				var candKey = this.ALLIANCE_BOUNTIES[(ai + this.immortalBounty.completedCount) % this.ALLIANCE_BOUNTIES.length].key;
				if (this.immortalBounty.boardKeys.indexOf(candKey) < 0){
					this.immortalBounty.boardKeys[bIdx] = candKey;
					break;
				}
			}
		}

		var chapterUp = false;
		if (this.immortalBounty.completedCount % 3 === 0){
			this.immortalBounty.chainChapter = (this.immortalBounty.chainChapter || 1) + 1;
			this.daoyun = Math.max(0, Math.floor(this.daoyun || 0)) + 1;
			this.game.resPool.addResEvent("xianyuan", 50);
			this.grantStarCoreDrop(def.coreKey);
			chapterUp = true;
		}

		if (this.game.updateCaches){ this.game.updateCaches(); }
		var cDef = coreGainedKey ? this.getStarCoreDef(coreGainedKey) : null;
		var isEn = String($I("cultivation.sanctum.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Completed [" + $I(def.labelKey) + "]: +" + xyGain + " Essence, +" + meritGain + " Merit" +
				(cDef ? (", +1 [" + $I(cDef.labelKey) + "]") : "") +
				(lawGained > 0 ? (", +" + lawGained + " Dao Resonance") : "") +
				(chapterUp ? " — Chapter Coffer: +1 Dao Resonance, +50 Essence & +1 Star Core!" : "!"))
			: ("【奇遇悬赏圆满】办妥【" + $I(def.labelKey) + "】：仙元 +" + xyGain + " · 功勋 +" + meritGain +
				(cDef ? (" · 【" + $I(cDef.labelKey) + "】×1") : "") +
				(lawGained > 0 ? (" · 法则道韵 +" + lawGained + " 重") : "") +
				(chapterUp ? "；连环三桩圆满，赐仙盟道韵宝匣（道韵+1重 · 仙元+50 · 星核+1）！" : "！"));
		this.immortalBounty.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	toggleBountyAutoDispatch: function(){
		if (!this.immortalAscended){ return false; }
		this.immortalBounty = this.normalizeImmortalBounty(this.immortalBounty);
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		this.daoSteleForest = this.normalizeDaoSteleForest(this.daoSteleForest);
		this.starship = this.normalizeStarship(this.starship);
		if ((this.hongmengImprintTier || 0) > 0 && (this.starship.totalQiHarvested || 0) === 0 && (this.starship.hongmengQi || 0) === 0){
			var ascInitQi = this.getHongmengStartingQi();
			this.starship.hongmengQi = ascInitQi;
			this.starship.totalQiHarvested = ascInitQi;
		}
		this.hongmengAltar = this.normalizeHongmengAltar(this.hongmengAltar);
		this.immortalBounty.autoDispatch = !this.immortalBounty.autoDispatch;
		return this.immortalBounty.autoDispatch;
	},

	tickImmortalBounty: function(ticksDelta){
		if (!this.immortalAscended || !this.immortalBounty){ return; }
		var caveStepB = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
		var spdMult = 1 + ((caveStepB && caveStepB.bountySpeedBonus) ? caveStepB.bountySpeedBonus : 0);
		var step = Math.max(0, (typeof ticksDelta === "number" ? ticksDelta : 1) * spdMult);
		if (step <= 0){ return; }
		if (!this.immortalBounty.active && this.immortalBounty.autoDispatch){
			this.dispatchAllianceBounty(0);
		}
		var act = this.immortalBounty.active;
		if (act && !act.ready){
			act.progress = Math.min(act.maxTicks, act.progress + step);
			if (act.progress >= act.maxTicks){
				act.ready = true;
			}
		}
		if (this.immortalBounty.active && this.immortalBounty.active.ready && this.immortalBounty.autoDispatch){
			var pickMode = ((this.immortalBounty.completedCount || 0) % 2 === 0) ? "core" : "dao";
			this.completeAllianceBounty(pickMode);
			if (!this.immortalBounty.active){
				this.dispatchAllianceBounty(0);
			}
		}
	},

	getMeritExchangeCost: function(itemKey){
		if (itemKey === "core"){ return 55; }
		if (itemKey === "daoyun"){ return 150; }
		if (itemKey === "chest"){ return 40; }
		return 999999;
	},

	exchangeAllianceMerit: function(itemKey){
		if (!this.immortalAscended){ return false; }
		this.immortalBounty = this.normalizeImmortalBounty(this.immortalBounty);
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		this.daoSteleForest = this.normalizeDaoSteleForest(this.daoSteleForest);
		this.starship = this.normalizeStarship(this.starship);
		if ((this.hongmengImprintTier || 0) > 0 && (this.starship.totalQiHarvested || 0) === 0 && (this.starship.hongmengQi || 0) === 0){
			var ascInitQi = this.getHongmengStartingQi();
			this.starship.hongmengQi = ascInitQi;
			this.starship.totalQiHarvested = ascInitQi;
		}
		this.hongmengAltar = this.normalizeHongmengAltar(this.hongmengAltar);
		this.starArray = this.normalizeStarArray(this.starArray);
		var cost = this.getMeritExchangeCost(itemKey);
		if ((this.immortalBounty.merit || 0) < cost){ return false; }
		this.immortalBounty.merit -= cost;
		var isEn = String($I("cultivation.sanctum.badge") || "").indexOf("Immortal") === 0;
		var note = "";
		if (itemKey === "core"){
			var ck = this.starArray.selectedCore || "ziwei";
			this.grantStarCoreDrop(ck);
			var cDef = this.getStarCoreDef(ck);
			note = isEn
				? ("Redeemed 1x [" + (cDef ? $I(cDef.labelKey) : ck) + "] from Alliance Treasury!")
				: ("【仙盟宝库】耗功勋 " + cost + " 兑换【" + (cDef ? $I(cDef.labelKey) : ck) + "】×1！");
		} else if (itemKey === "daoyun"){
			this.daoyun = Math.max(0, Math.floor(this.daoyun || 0)) + 1;
			if (this.game.updateCaches){ this.game.updateCaches(); }
			note = isEn
				? ("Comprehended Alliance Dao Scroll: Dao Resonance +1 (Rank " + this.daoyun + ")!")
				: ("【仙盟道韵玉简】参透跨界至理，法则道韵提升至第 " + this.daoyun + " 重！");
		} else if (itemKey === "chest"){
			var xyRes = this.game.resPool.get("xianyuan");
			if (xyRes){ xyRes.unlocked = true; }
			this.game.resPool.addResEvent("xianyuan", 75);
			this.riftKeys = (this.riftKeys || 0) + 2;
			note = isEn
				? "Opened Merit Essence Coffer: +75 Immortal Essence & +2 Rift Keys!"
				: "【仙盟功勋宝匣】启匣获精纯仙元 +75、上古秘境令 +2！";
		} else {
			this.immortalBounty.merit += cost;
			return false;
		}
		this.immortalBounty.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	// ---------------- XX-6 混沌万灵仙宠育兽苑与大道法则碑林参悟 ----------------

	PRIMORDIAL_BEASTS: [
		{
			key: "azure_dragon",
			labelKey: "cultivation.beast.azure_dragon.label",
			descKey: "cultivation.beast.azure_dragon.desc",
			art: "res/art/beast_azure_dragon.webp",
			favHerb: "qinglian",
			incubateXy: 16,
			auxRes: "timeCrystal",
			auxVal: 6
		},
		{
			key: "vermilion_bird",
			labelKey: "cultivation.beast.vermilion_bird.label",
			descKey: "cultivation.beast.vermilion_bird.desc",
			art: "res/art/beast_vermilion_bird.webp",
			favHerb: "zizhi",
			incubateXy: 22,
			auxRes: "relic",
			auxVal: 8
		},
		{
			key: "black_tortoise",
			labelKey: "cultivation.beast.black_tortoise.label",
			descKey: "cultivation.beast.black_tortoise.desc",
			art: "res/art/beast_black_tortoise.webp",
			favHerb: "daoguo",
			incubateXy: 22,
			auxRes: "starchart",
			auxVal: 12
		},
		{
			key: "white_tiger",
			labelKey: "cultivation.beast.white_tiger.label",
			descKey: "cultivation.beast.white_tiger.desc",
			art: "res/art/beast_white_tiger.webp",
			favHerb: "xianlan",
			incubateXy: 24,
			auxRes: "unobtainium",
			auxVal: 10
		}
	],

	BEAST_AWAKEN_TIERS: [
		{stage: 0, titleKey: "cultivation.beast.stage.0", xianyuan: 0,   auxRes: null,          auxVal: 0,  reqDaoyun: 0},
		{stage: 1, titleKey: "cultivation.beast.stage.1", xianyuan: 0,   auxRes: null,          auxVal: 0,  reqDaoyun: 0},
		{stage: 2, titleKey: "cultivation.beast.stage.2", xianyuan: 26,  auxRes: "relic",       auxVal: 8,  reqDaoyun: 1},
		{stage: 3, titleKey: "cultivation.beast.stage.3", xianyuan: 52,  auxRes: "starchart",   auxVal: 22, reqDaoyun: 2},
		{stage: 4, titleKey: "cultivation.beast.stage.4", xianyuan: 96,  auxRes: "timeCrystal", auxVal: 24, reqDaoyun: 3},
		{stage: 5, titleKey: "cultivation.beast.stage.5", xianyuan: 175, auxRes: "unobtainium", auxVal: 36, reqDaoyun: 4},
		{stage: 6, titleKey: "cultivation.beast.stage.6", xianyuan: 310, auxRes: "timeCrystal", auxVal: 65, reqDaoyun: 5}
	],

	DAO_STELES: [
		{
			key: "spacetime",
			labelKey: "cultivation.stele.item.spacetime.label",
			descKey: "cultivation.stele.item.spacetime.desc",
			art: "res/art/stele_dao_monolith.webp",
			baseXy: 18,
			auxRes: "timeCrystal",
			baseAux: 8
		},
		{
			key: "creation",
			labelKey: "cultivation.stele.item.creation.label",
			descKey: "cultivation.stele.item.creation.desc",
			art: "res/art/stele_dao_monolith.webp",
			baseXy: 18,
			auxRes: "relic",
			baseAux: 8
		},
		{
			key: "sword_dao",
			labelKey: "cultivation.stele.item.sword_dao.label",
			descKey: "cultivation.stele.item.sword_dao.desc",
			art: "res/art/stele_dao_monolith.webp",
			baseXy: 20,
			auxRes: "starchart",
			baseAux: 14
		},
		{
			key: "alchemy_origin",
			labelKey: "cultivation.stele.item.alchemy_origin.label",
			descKey: "cultivation.stele.item.alchemy_origin.desc",
			art: "res/art/stele_dao_monolith.webp",
			baseXy: 20,
			auxRes: "relic",
			baseAux: 10
		},
		{
			key: "astral",
			labelKey: "cultivation.stele.item.astral.label",
			descKey: "cultivation.stele.item.astral.desc",
			art: "res/art/stele_dao_monolith.webp",
			baseXy: 22,
			auxRes: "starchart",
			baseAux: 16
		},
		{
			key: "samsara",
			labelKey: "cultivation.stele.item.samsara.label",
			descKey: "cultivation.stele.item.samsara.desc",
			art: "res/art/stele_dao_monolith.webp",
			baseXy: 24,
			auxRes: "timeCrystal",
			baseAux: 10
		}
	],

	getBeastDef: function(key){
		for (var i = 0; i < this.PRIMORDIAL_BEASTS.length; i++){
			if (this.PRIMORDIAL_BEASTS[i].key === key){ return this.PRIMORDIAL_BEASTS[i]; }
		}
		return null;
	},

	getDaoSteleDef: function(key){
		for (var i = 0; i < this.DAO_STELES.length; i++){
			if (this.DAO_STELES[i].key === key){ return this.DAO_STELES[i]; }
		}
		return null;
	},

	makeDefaultSpiritNursery: function(){
		var beasts = {};
		for (var i = 0; i < this.PRIMORDIAL_BEASTS.length; i++){
			var k = this.PRIMORDIAL_BEASTS[i].key;
			beasts[k] = {
				incubating: false,
				incTicks: 0,
				incMax: 60,
				stage: 0,
				exp: 0,
				totalFeeds: 0
			};
		}
		return {
			beasts: beasts,
			selectedBeast: "azure_dragon",
			battleBeastKey: null,
			gardenBeastKey: null,
			autoNurture: false,
			lastNote: ""
		};
	},

	normalizeSpiritNursery: function(raw){
		var def = this.makeDefaultSpiritNursery();
		if (!raw || typeof raw !== "object"){ return def; }
		if (typeof raw.selectedBeast === "string" && this.getBeastDef(raw.selectedBeast)){
			def.selectedBeast = raw.selectedBeast;
		}
		if (typeof raw.autoNurture === "boolean"){ def.autoNurture = raw.autoNurture; }
		if (typeof raw.lastNote === "string"){ def.lastNote = raw.lastNote; }
		if (raw.beasts && typeof raw.beasts === "object"){
			for (var i = 0; i < this.PRIMORDIAL_BEASTS.length; i++){
				var k = this.PRIMORDIAL_BEASTS[i].key;
				var src = raw.beasts[k];
				if (src && typeof src === "object"){
					var stg = (typeof src.stage === "number" && isFinite(src.stage))
						? Math.min(6, Math.max(0, Math.floor(src.stage)))
						: 0;
					var iMax = (typeof src.incMax === "number" && src.incMax > 0) ? Math.floor(src.incMax) : 60;
					var iTicks = (typeof src.incTicks === "number" && isFinite(src.incTicks))
						? Math.max(0, Math.min(iMax, src.incTicks))
						: 0;
					var inc = stg > 0 ? false : !!src.incubating;
					var bExp = (typeof src.exp === "number" && isFinite(src.exp))
						? Math.max(0, Math.min(100, Math.floor(src.exp)))
						: 0;
					var feeds = (typeof src.totalFeeds === "number" && isFinite(src.totalFeeds))
						? Math.max(0, Math.floor(src.totalFeeds))
						: 0;
					def.beasts[k] = {
						incubating: inc,
						incTicks: stg > 0 ? iMax : iTicks,
						incMax: iMax,
						stage: stg,
						exp: stg >= 6 ? 100 : bExp,
						totalFeeds: feeds
					};
				}
			}
		}
		if (typeof raw.battleBeastKey === "string" && def.beasts[raw.battleBeastKey] && def.beasts[raw.battleBeastKey].stage > 0){
			def.battleBeastKey = raw.battleBeastKey;
		}
		if (typeof raw.gardenBeastKey === "string" && def.beasts[raw.gardenBeastKey] && def.beasts[raw.gardenBeastKey].stage > 0 && raw.gardenBeastKey !== def.battleBeastKey){
			def.gardenBeastKey = raw.gardenBeastKey;
		}
		return def;
	},

	makeDefaultDaoSteleForest: function(){
		var levels = {};
		for (var i = 0; i < this.DAO_STELES.length; i++){
			levels[this.DAO_STELES[i].key] = 0;
		}
		return {
			levels: levels,
			totalRubbings: 0,
			lastNote: ""
		};
	},

	normalizeDaoSteleForest: function(raw){
		var def = this.makeDefaultDaoSteleForest();
		if (!raw || typeof raw !== "object"){ return def; }
		var sum = 0;
		if (raw.levels && typeof raw.levels === "object"){
			for (var i = 0; i < this.DAO_STELES.length; i++){
				var k = this.DAO_STELES[i].key;
				var lv = raw.levels[k];
				if (typeof lv === "number" && isFinite(lv)){
					def.levels[k] = Math.min(5, Math.max(0, Math.floor(lv)));
				}
				sum += def.levels[k];
			}
		}
		def.totalRubbings = (typeof raw.totalRubbings === "number" && isFinite(raw.totalRubbings))
			? Math.max(sum, Math.floor(raw.totalRubbings))
			: sum;
		if (typeof raw.lastNote === "string"){ def.lastNote = raw.lastNote; }
		return def;
	},

	getBeastImprintCostMult: function(){
		var seal = Math.max(0, Math.min(6, Math.floor(this.beastImprintTier || 0)));
		var imp = Math.max(0, Math.min(10, Math.floor(this.immortalImprint || 0)));
		return Math.max(0.58, 1 - seal * 0.055 - imp * 0.015);
	},

	getBeastSpringBonus: function(){
		var seal = Math.max(0, Math.min(6, Math.floor(this.beastImprintTier || 0)));
		if (seal <= 0){
			return {tier: 0, xiuweiBase: 0, xiuweiRatio: 0, catnipRatio: 0, lifespanBonus: 0};
		}
		return {
			tier: seal,
			xiuweiBase: seal * 0.15,
			xiuweiRatio: seal * 0.08,
			catnipRatio: seal * 0.12,
			lifespanBonus: seal * 30
		};
	},

	getHatchedBeastCount: function(){
		if (!this.spiritNursery || !this.spiritNursery.beasts){ return 0; }
		var cnt = 0;
		for (var i = 0; i < this.PRIMORDIAL_BEASTS.length; i++){
			var b = this.spiritNursery.beasts[this.PRIMORDIAL_BEASTS[i].key];
			if (b && (b.stage || 0) >= 1){ cnt++; }
		}
		return cnt;
	},

	getMaxBeastStage: function(){
		if (!this.spiritNursery || !this.spiritNursery.beasts){ return 0; }
		var maxSt = 0;
		for (var i = 0; i < this.PRIMORDIAL_BEASTS.length; i++){
			var b = this.spiritNursery.beasts[this.PRIMORDIAL_BEASTS[i].key];
			if (b && (b.stage || 0) > maxSt){ maxSt = b.stage; }
		}
		return maxSt;
	},

	hasFourSymbolsResonance: function(){
		return this.getHatchedBeastCount() >= 4;
	},

	getFourSymbolsMinStage: function(){
		if (!this.spiritNursery || !this.spiritNursery.beasts){ return 0; }
		var minSt = 99;
		for (var i = 0; i < this.PRIMORDIAL_BEASTS.length; i++){
			var b = this.spiritNursery.beasts[this.PRIMORDIAL_BEASTS[i].key];
			var st = (b && b.stage) ? b.stage : 0;
			if (st <= 0){ return 0; }
			if (st < minSt){ minSt = st; }
		}
		return minSt === 99 ? 0 : minSt;
	},

	_autoAssignBeastSlotOnHatch: function(beastKey){
		if (!this.spiritNursery || !beastKey){ return; }
		var b = this.spiritNursery.beasts[beastKey];
		if (!b || (b.stage || 0) <= 0){ return; }
		if (!this.spiritNursery.battleBeastKey){
			this.spiritNursery.battleBeastKey = beastKey;
		} else if (!this.spiritNursery.gardenBeastKey && this.spiritNursery.battleBeastKey !== beastKey){
			this.spiritNursery.gardenBeastKey = beastKey;
		}
		if (b.stage > (this.beastImprintTier || 0)){
			this.beastImprintTier = b.stage;
		}
	},

	getBeastIncubateCost: function(beastKey){
		var def = this.getBeastDef(beastKey);
		if (!def){ return null; }
		var sn = this.spiritNursery || this.makeDefaultSpiritNursery();
		var b = sn.beasts[beastKey];
		if (b && (b.stage > 0 || b.incubating)){ return null; }
		var mult = this.getBeastImprintCostMult();
		var firstFreeAux = (this.getHatchedBeastCount() === 0 && beastKey === "azure_dragon");
		var xyVal = Math.max(8, this.roundNice(def.incubateXy * mult));
		var auxRes = firstFreeAux ? null : def.auxRes;
		var auxVal = firstFreeAux ? 0 : Math.max(3, this.roundNice(def.auxVal * mult));
		var xyObj = this.game.resPool.get("xianyuan");
		var auxObj = auxRes ? this.game.resPool.get(auxRes) : null;
		var okXy = !!(xyObj && xyObj.value >= xyVal);
		var okAux = !auxRes || !!(auxObj && auxObj.value >= auxVal);
		return {
			xianyuan: xyVal,
			auxRes: auxRes,
			auxVal: auxVal,
			affordable: !!(okXy && okAux)
		};
	},

	incubateSpiritBeast: function(beastKey, instantHatch){
		if (!this.immortalAscended){ return false; }
		var def = this.getBeastDef(beastKey);
		if (!def){ return false; }
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		var b = this.spiritNursery.beasts[beastKey];
		if (!b || b.stage > 0){ return false; }
		if (!b.incubating){
			var req = this.getBeastIncubateCost(beastKey);
			if (!req || !req.affordable){ return false; }
			this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
			if (req.auxRes && req.auxVal > 0){
				this.game.resPool.addResEvent(req.auxRes, -req.auxVal);
			}
			var sealBonusTicks = Math.min(25, Math.max(0, Math.floor(this.beastImprintTier || 0)) * 5);
			b.incubating = true;
			b.incMax = 60;
			b.incTicks = sealBonusTicks;
			this.spiritNursery.selectedBeast = beastKey;
		}
		if (instantHatch){
			b.incubating = false;
			b.incTicks = b.incMax;
			b.stage = 1;
			b.exp = 0;
			this._autoAssignBeastSlotOnHatch(beastKey);
			if (this.game.updateCaches){ this.game.updateCaches(); }
		}
		var isEn = String($I("cultivation.menagerie.badge") || "").indexOf("Immortal") === 0;
		var note = b.stage >= 1
			? (isEn ? ("Primordial Spirit [" + $I(def.labelKey) + "] hatched at Stage 1!") : ("【万灵破壳】混沌仙泉翻涌，真灵【" + $I(def.labelKey) + "】破壳而出，觉醒一阶血脉！"))
			: (isEn ? ("Placed [" + $I(def.labelKey) + "] egg into the Primordial Spirit Pool.") : ("【灵胎入池】已将【" + $I(def.labelKey) + "】灵胎浸入万灵育兽仙池温养。"));
		this.spiritNursery.lastNote = note;
		if (b.stage >= 1){ this.game.msg(note, "important"); }
		return true;
	},

	getWarmEggCost: function(){
		return Math.max(5, Math.round(9 * this.getBeastImprintCostMult()));
	},

	warmBeastEgg: function(beastKey){
		if (!this.immortalAscended){ return false; }
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		var key = beastKey || this.spiritNursery.selectedBeast;
		var def = this.getBeastDef(key);
		var b = key ? this.spiritNursery.beasts[key] : null;
		if (!def || !b || !b.incubating || b.stage > 0){ return false; }
		var cost = this.getWarmEggCost();
		var xy = this.game.resPool.get("xianyuan");
		if (!xy || xy.value < cost){ return false; }
		this.game.resPool.addResEvent("xianyuan", -cost);
		b.incTicks = Math.min(b.incMax, (b.incTicks || 0) + Math.ceil(b.incMax * 0.60));
		if (b.incTicks >= b.incMax){
			b.incubating = false;
			b.stage = 1;
			b.exp = 0;
			this._autoAssignBeastSlotOnHatch(key);
			if (this.game.updateCaches){ this.game.updateCaches(); }
			var isEn = String($I("cultivation.menagerie.badge") || "").indexOf("Immortal") === 0;
			var note = isEn
				? ("Spirit Egg [" + $I(def.labelKey) + "] hatched into Stage 1 Hatchling!")
				: ("【仙元催破灵胎】霞光冲霄，【" + $I(def.labelKey) + "】破壳化生，晋入一阶幼灵！");
			this.spiritNursery.lastNote = note;
			this.game.msg(note, "important");
		}
		return true;
	},

	hatchSpiritBeast: function(beastKey){
		if (!this.immortalAscended){ return false; }
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		var b = this.spiritNursery.beasts[beastKey];
		if (!b){ return false; }
		if (b.stage > 0){ return true; }
		if (!b.incubating){
			if (!this.incubateSpiritBeast(beastKey, false)){ return false; }
		}
		for (var guard = 0; guard < 5; guard++){
			b = this.spiritNursery.beasts[beastKey];
			if (!b || b.stage > 0 || !b.incubating){ break; }
			if (!this.warmBeastEgg(beastKey)){
				b = this.spiritNursery.beasts[beastKey];
				b.incubating = false;
				b.incTicks = b.incMax;
				b.stage = 1;
				b.exp = 0;
				this._autoAssignBeastSlotOnHatch(beastKey);
				if (this.game.updateCaches){ this.game.updateCaches(); }
				break;
			}
		}
		b = this.spiritNursery.beasts[beastKey];
		return !!(b && b.stage >= 1);
	},

	selectNurseryBeast: function(beastKey){
		if (!this.getBeastDef(beastKey)){ return false; }
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		this.spiritNursery.selectedBeast = beastKey;
		return true;
	},

	deploySpiritBeast: function(beastKey, slotType){
		if (!this.immortalAscended){ return false; }
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		var def = this.getBeastDef(beastKey);
		var b = beastKey ? this.spiritNursery.beasts[beastKey] : null;
		if (!def || !b || (b.stage || 0) <= 0){ return false; }
		if (slotType === "garden"){
			var prevGarden = this.spiritNursery.gardenBeastKey;
			if (this.spiritNursery.battleBeastKey === beastKey){
				this.spiritNursery.battleBeastKey = (prevGarden && prevGarden !== beastKey) ? prevGarden : null;
			}
			this.spiritNursery.gardenBeastKey = beastKey;
		} else {
			var prevBattle = this.spiritNursery.battleBeastKey;
			if (this.spiritNursery.gardenBeastKey === beastKey){
				this.spiritNursery.gardenBeastKey = (prevBattle && prevBattle !== beastKey) ? prevBattle : null;
			}
			this.spiritNursery.battleBeastKey = beastKey;
		}
		this.spiritNursery.selectedBeast = beastKey;
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.menagerie.badge") || "").indexOf("Immortal") === 0;
		this.spiritNursery.lastNote = isEn
			? ("Deployed [" + $I(def.labelKey) + "] as " + (slotType === "garden" ? "Garden Companion" : "Main Battle Beast") + ".")
			: ("【灵兽遣派】已命【" + $I(def.labelKey) + "】担任" + (slotType === "garden" ? "【驻园灵宠】" : "【出战主宠】") + "！");
		return true;
	},

	toggleBeastAutoNurture: function(){
		if (!this.immortalAscended){ return false; }
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		this.spiritNursery.autoNurture = !this.spiritNursery.autoNurture;
		return this.spiritNursery.autoNurture;
	},

	getTotalPillStock: function(){
		var sum = 0;
		for (var i = 0; i < (this.pills ? this.pills.length : 0); i++){
			sum += Math.max(0, Math.floor(this.pills[i].val || 0));
		}
		return sum;
	},

	getBeastFeedXyCost: function(beastKey){
		var sn = this.spiritNursery || this.makeDefaultSpiritNursery();
		var b = beastKey && sn.beasts ? sn.beasts[beastKey] : null;
		var stg = (b && b.stage) ? b.stage : 1;
		return Math.max(6, Math.round((10 + stg * 4) * this.getBeastImprintCostMult()));
	},

	feedSpiritBeast: function(beastKey, mode){
		if (!this.immortalAscended){ return false; }
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		this.herbGarden = this.normalizeHerbGarden(this.herbGarden);
		var key = beastKey || this.spiritNursery.selectedBeast;
		var def = this.getBeastDef(key);
		var b = key ? this.spiritNursery.beasts[key] : null;
		if (!def || !b || (b.stage || 0) <= 0){ return false; }
		if (b.stage >= 6 && (b.exp || 0) >= 100){ return false; }

		var feedMode = mode || "herb";
		var expGain = 0;
		if (feedMode === "herb"){
			if (this.getHerbTotalStock() <= 0){ return false; }
			var fav = def.favHerb;
			if (fav && (this.herbGarden.stock[fav] || 0) > 0){
				this.herbGarden.stock[fav]--;
				expGain = 50;
			} else {
				if (!this.consumeAnyImmortalHerbs(1)){ return false; }
				expGain = 45;
			}
			this.pillToxicity = Math.max(0, (this.pillToxicity || 0) - 4);
			this.heartDemon = Math.max(0, (this.heartDemon || 0) - 3);
		} else if (feedMode === "pill"){
			var chosenPill = null;
			for (var pi = this.pills.length - 1; pi >= 0; pi--){
				if ((this.pills[pi].val || 0) >= 1){
					chosenPill = this.pills[pi];
					break;
				}
			}
			if (!chosenPill){ return false; }
			chosenPill.val--;
			expGain = 40;
		} else {
			var xyCost = this.getBeastFeedXyCost(key);
			var xyRes = this.game.resPool.get("xianyuan");
			if (!xyRes || xyRes.value < xyCost){ return false; }
			this.game.resPool.addResEvent("xianyuan", -xyCost);
			expGain = 35;
		}

		b.totalFeeds = (b.totalFeeds || 0) + 1;
		b.exp = (b.exp || 0) + expGain;
		var stageUp = false;
		if (b.exp >= 100 && b.stage < 6){
			b.exp = b.stage + 1 >= 6 ? 100 : (b.exp - 100);
			b.stage += 1;
			stageUp = true;
			if (b.stage > (this.beastImprintTier || 0)){
				this.beastImprintTier = b.stage;
			}
		} else if (b.exp > 100){
			b.exp = 100;
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.menagerie.badge") || "").indexOf("Immortal") === 0;
		var note = stageUp
			? (isEn
				? ("[" + $I(def.labelKey) + "] bloodline awakened to Stage " + b.stage + "!")
				: ("【血脉返祖觉醒】灵韵贯通周天，【" + $I(def.labelKey) + "】血脉自然蜕变至第 " + b.stage + " 阶！"))
			: (isEn
				? ("Fed [" + $I(def.labelKey) + "] (+" + expGain + " Bloodline EXP, now " + b.exp + "/100).")
				: ("【抚育仙宠】投喂【" + $I(def.labelKey) + "】血脉精粹 +" + expGain + "（当前 " + b.exp + "/100）。"));
		this.spiritNursery.lastNote = note;
		if (stageUp){ this.game.msg(note, "important"); }
		return true;
	},

	getBeastAwakenReq: function(beastKey){
		var sn = this.spiritNursery || this.makeDefaultSpiritNursery();
		var key = beastKey || sn.selectedBeast;
		var b = key && sn.beasts ? sn.beasts[key] : null;
		if (!b || (b.stage || 0) <= 0 || b.stage >= 6){ return null; }
		var nextStage = b.stage + 1;
		var cfg = this.BEAST_AWAKEN_TIERS[nextStage];
		if (!cfg){ return null; }
		var mult = this.getBeastImprintCostMult();
		var expDisc = 1 - Math.min(0.35, ((b.exp || 0) / 100) * 0.35);
		var xyVal = Math.max(10, this.roundNice(cfg.xianyuan * mult * expDisc));
		var auxVal = cfg.auxRes ? Math.max(4, this.roundNice(cfg.auxVal * mult * expDisc)) : 0;
		var xyObj = this.game.resPool.get("xianyuan");
		var auxObj = cfg.auxRes ? this.game.resPool.get(cfg.auxRes) : null;
		var okXy = !!(xyObj && xyObj.value >= xyVal);
		var okAux = !cfg.auxRes || !!(auxObj && auxObj.value >= auxVal);
		var okDao = (this.daoyun || 0) >= (cfg.reqDaoyun || 0);
		return {
			nextStage: nextStage,
			titleKey: cfg.titleKey,
			xianyuan: xyVal,
			auxRes: cfg.auxRes,
			auxVal: auxVal,
			reqDaoyun: cfg.reqDaoyun || 0,
			affordable: !!(okXy && okAux && okDao)
		};
	},

	awakenBeastBloodline: function(beastKey){
		if (!this.immortalAscended){ return false; }
		this.spiritNursery = this.normalizeSpiritNursery(this.spiritNursery);
		var key = beastKey || this.spiritNursery.selectedBeast;
		var def = this.getBeastDef(key);
		var b = key ? this.spiritNursery.beasts[key] : null;
		if (!def || !b || (b.stage || 0) <= 0 || b.stage >= 6){ return false; }
		var req = this.getBeastAwakenReq(key);
		if (!req || !req.affordable){ return false; }
		this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
		if (req.auxRes && req.auxVal > 0){
			this.game.resPool.addResEvent(req.auxRes, -req.auxVal);
		}
		b.stage = req.nextStage;
		b.exp = req.nextStage >= 6 ? 100 : 0;
		if (b.stage > (this.beastImprintTier || 0)){
			this.beastImprintTier = b.stage;
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.menagerie.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Awakened [" + $I(def.labelKey) + "] to [" + $I(req.titleKey) + "]!")
			: ("【真灵血脉破阶】混沌精血沸腾，【" + $I(def.labelKey) + "】成功觉醒至【" + $I(req.titleKey) + "】！");
		this.spiritNursery.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	tickSpiritNursery: function(ticksDelta){
		if (!this.immortalAscended || !this.spiritNursery){ return; }
		var step = Math.max(0, typeof ticksDelta === "number" ? ticksDelta : 1);
		if (step <= 0){ return; }
		var sealMult = 1 + Math.max(0, Math.floor(this.beastImprintTier || 0)) * 0.12;
		var incStep = step * sealMult;
		var dirty = false;
		for (var i = 0; i < this.PRIMORDIAL_BEASTS.length; i++){
			var k = this.PRIMORDIAL_BEASTS[i].key;
			var b = this.spiritNursery.beasts[k];
			if (!b){ continue; }
			if (!b.incubating && b.stage === 0 && this.spiritNursery.autoNurture){
				this.incubateSpiritBeast(k, false);
			}
			if (b.incubating && b.stage === 0){
				b.incTicks = Math.min(b.incMax, (b.incTicks || 0) + incStep);
				if (b.incTicks >= b.incMax){
					b.incubating = false;
					b.stage = 1;
					b.exp = 0;
					this._autoAssignBeastSlotOnHatch(k);
					dirty = true;
				}
			} else if (b.stage > 0 && b.stage < 6 && this.spiritNursery.autoNurture){
				var isDeployed = (this.spiritNursery.battleBeastKey === k || this.spiritNursery.gardenBeastKey === k);
				if (isDeployed){
					b.exp = Math.min(100, (b.exp || 0) + step * 0.08);
					if (b.exp >= 100){
						b.exp = b.stage + 1 >= 6 ? 100 : 0;
						b.stage += 1;
						if (b.stage > (this.beastImprintTier || 0)){
							this.beastImprintTier = b.stage;
						}
						dirty = true;
					}
				}
			}
		}
		if (dirty && this.game.updateCaches){
			this.game.updateCaches();
		}
	},

	getTotalSteleComprehension: function(){
		if (!this.daoSteleForest || !this.daoSteleForest.levels){ return 0; }
		var total = 0;
		for (var i = 0; i < this.DAO_STELES.length; i++){
			total += Math.max(0, Math.floor(this.daoSteleForest.levels[this.DAO_STELES[i].key] || 0));
		}
		return total;
	},

	getSteleResonanceTier: function(){
		var total = this.getTotalSteleComprehension();
		if (total >= 30){ return 3; }
		if (total >= 15){ return 2; }
		if (total >= 6){ return 1; }
		return 0;
	},

	getDaoSteleRubbingReq: function(steleKey){
		var def = this.getDaoSteleDef(steleKey);
		if (!def){ return null; }
		var sf = this.daoSteleForest || this.makeDefaultDaoSteleForest();
		var curLv = Math.max(0, Math.floor(sf.levels[steleKey] || 0));
		if (curLv >= 5){ return null; }
		var nextLv = curLv + 1;
		var caveB = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
		var daoDisc = (caveB && caveB.daoLawDiscount) ? Math.min(0.55, caveB.daoLawDiscount) : 0;
		var impMult = this.getImprintCostMult();
		var scale = Math.pow(1.75, curLv);
		var xyVal = Math.max(8, this.roundNice(def.baseXy * scale * impMult * (1 - daoDisc * 0.5)));
		var auxVal = Math.max(4, this.roundNice(def.baseAux * Math.pow(1.60, curLv) * impMult));
		var reqDaoyun = nextLv <= 2 ? 1 : (nextLv - 1);
		var xyObj = this.game.resPool.get("xianyuan");
		var auxObj = this.game.resPool.get(def.auxRes);
		var okXy = !!(xyObj && xyObj.value >= xyVal);
		var okAux = !!(auxObj && auxObj.value >= auxVal);
		var okDao = (this.daoyun || 0) >= reqDaoyun;
		return {
			nextLv: nextLv,
			xianyuan: xyVal,
			auxRes: def.auxRes,
			auxVal: auxVal,
			reqDaoyun: reqDaoyun,
			affordable: !!(okXy && okAux && okDao)
		};
	},

	comprehendDaoStele: function(steleKey){
		if (!this.immortalAscended){ return false; }
		this.daoSteleForest = this.normalizeDaoSteleForest(this.daoSteleForest);
		var def = this.getDaoSteleDef(steleKey);
		if (!def){ return false; }
		var prevResTier = this.getSteleResonanceTier();
		var req = this.getDaoSteleRubbingReq(steleKey);
		if (!req || !req.affordable){ return false; }
		this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
		this.game.resPool.addResEvent(req.auxRes, -req.auxVal);
		this.daoSteleForest.levels[steleKey] = req.nextLv;
		this.daoSteleForest.totalRubbings = (this.daoSteleForest.totalRubbings || 0) + 1;
		this.addDaoLawProgress(20 + req.nextLv * 5);
		var newResTier = this.getSteleResonanceTier();
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.menagerie.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Comprehended [" + $I(def.labelKey) + "] to Lv." + req.nextLv + " (Total " + this.getTotalSteleComprehension() + "/30)" +
				(newResTier > prevResTier ? (" — Stele Resonance Tier " + newResTier + " unlocked!") : "!"))
			: ("【古碑拓印参悟】参透【" + $I(def.labelKey) + "】第 " + req.nextLv + " 重道纹（碑林总悟 " + this.getTotalSteleComprehension() + "/30）" +
				(newResTier > prevResTier ? ("，激活第 " + newResTier + " 阶【碑林共鸣】！") : "！"));
		this.daoSteleForest.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	// ---------------- XX-7 诸天星域游历飞舟（太虚星槎）与混沌鸿蒙灵宝祭坛 ----------------

	TAIXU_VESSEL_TIERS: [
		{tier: 0, titleKey: "cultivation.starship.tier.0", speedMult: 0, cargoMult: 0, shieldBonus: 0, xyBase: 0, xyRatio: 0},
		{tier: 1, titleKey: "cultivation.starship.tier.1", xianyuan: 18, starchart: 12, auxRes: null, auxVal: 0, reqDaoyun: 0, speedMult: 1.00, cargoMult: 1.00, shieldBonus: 0.06, xyBase: 0.02, xyRatio: 0.08},
		{tier: 2, titleKey: "cultivation.starship.tier.2", xianyuan: 36, starchart: 24, auxRes: "unobtainium", auxVal: 12, reqDaoyun: 1, speedMult: 1.30, cargoMult: 1.25, shieldBonus: 0.10, xyBase: 0.04, xyRatio: 0.15},
		{tier: 3, titleKey: "cultivation.starship.tier.3", xianyuan: 68, starchart: 45, auxRes: "timeCrystal", auxVal: 18, reqDaoyun: 1, speedMult: 1.65, cargoMult: 1.55, shieldBonus: 0.15, xyBase: 0.07, xyRatio: 0.24},
		{tier: 4, titleKey: "cultivation.starship.tier.4", xianyuan: 115, starchart: 75, auxRes: "relic", auxVal: 28, reqDaoyun: 2, speedMult: 2.05, cargoMult: 1.90, shieldBonus: 0.21, xyBase: 0.11, xyRatio: 0.35},
		{tier: 5, titleKey: "cultivation.starship.tier.5", xianyuan: 180, starchart: 120, auxRes: "timeCrystal", auxVal: 45, reqDaoyun: 2, speedMult: 2.50, cargoMult: 2.35, shieldBonus: 0.28, xyBase: 0.16, xyRatio: 0.48},
		{tier: 6, titleKey: "cultivation.starship.tier.6", xianyuan: 280, starchart: 180, auxRes: "unobtainium", auxVal: 70, reqDaoyun: 3, speedMult: 3.10, cargoMult: 2.90, shieldBonus: 0.36, xyBase: 0.22, xyRatio: 0.65}
	],

	STAR_REALMS: [
		{
			key: "ziwei",
			labelKey: "cultivation.starship.realm.ziwei.label",
			descKey: "cultivation.starship.realm.ziwei.desc",
			art: "res/art/realm_ziwei_starfield.webp",
			baseDistance: 80,
			baseQi: 3,
			baseIron: 1,
			bonusXy: 14
		},
		{
			key: "beiju",
			labelKey: "cultivation.starship.realm.beiju.label",
			descKey: "cultivation.starship.realm.beiju.desc",
			art: "res/art/starship_taixu_vessel.webp",
			baseDistance: 95,
			baseQi: 2,
			baseIron: 3,
			bonusXy: 10
		},
		{
			key: "guixu",
			labelKey: "cultivation.starship.realm.guixu.label",
			descKey: "cultivation.starship.realm.guixu.desc",
			art: "res/art/realm_guixu_abyss.webp",
			baseDistance: 115,
			baseQi: 3,
			baseIron: 3,
			bonusXy: 18
		}
	],

	HONGMENG_TREASURES: [
		{
			key: "kaitianSeal",
			labelKey: "cultivation.hongmeng.item.kaitianSeal.label",
			descKey: "cultivation.hongmeng.item.kaitianSeal.desc",
			art: "res/art/treasure_kaitian_seal.webp",
			baseQi: 2,
			baseIron: 3,
			baseXy: 15
		},
		{
			key: "zaohuaJade",
			labelKey: "cultivation.hongmeng.item.zaohuaJade.label",
			descKey: "cultivation.hongmeng.item.zaohuaJade.desc",
			art: "res/art/altar_hongmeng_forge.webp",
			baseQi: 3,
			baseIron: 2,
			baseXy: 15
		},
		{
			key: "xuanhuangPagoda",
			labelKey: "cultivation.hongmeng.item.xuanhuangPagoda.label",
			descKey: "cultivation.hongmeng.item.xuanhuangPagoda.desc",
			art: "res/art/treasure_xuanhuang_pagoda.webp",
			baseQi: 2,
			baseIron: 2,
			baseXy: 18
		}
	],

	getVesselTierDef: function(tier){
		var t = Math.max(0, Math.min(6, Math.floor(tier || 0)));
		return this.TAIXU_VESSEL_TIERS[t] || this.TAIXU_VESSEL_TIERS[0];
	},

	getStarRealmDef: function(key){
		for (var i = 0; i < this.STAR_REALMS.length; i++){
			if (this.STAR_REALMS[i].key === key){ return this.STAR_REALMS[i]; }
		}
		return null;
	},

	getHongmengTreasureDef: function(key){
		for (var i = 0; i < this.HONGMENG_TREASURES.length; i++){
			if (this.HONGMENG_TREASURES[i].key === key){ return this.HONGMENG_TREASURES[i]; }
		}
		return null;
	},

	makeDefaultStarship: function(){
		var mastery = {};
		for (var i = 0; i < this.STAR_REALMS.length; i++){
			mastery[this.STAR_REALMS[i].key] = 0;
		}
		return {
			vesselTier: 0,
			selectedRealm: "ziwei",
			voyageProgress: 0,
			voyageMax: 80,
			voyageCount: 0,
			autoVoyage: true,
			hongmengQi: 0,
			primordialIron: 0,
			totalQiHarvested: 0,
			totalIronHarvested: 0,
			realmMastery: mastery,
			lastNote: ""
		};
	},

	normalizeStarship: function(raw){
		var def = this.makeDefaultStarship();
		if (!raw || typeof raw !== "object"){ return def; }
		if (typeof raw.vesselTier === "number" && isFinite(raw.vesselTier)){
			def.vesselTier = Math.min(6, Math.max(0, Math.floor(raw.vesselTier)));
		}
		if (typeof raw.selectedRealm === "string" && this.getStarRealmDef(raw.selectedRealm)){
			def.selectedRealm = raw.selectedRealm;
		}
		var rDef = this.getStarRealmDef(def.selectedRealm) || this.STAR_REALMS[0];
		def.voyageMax = rDef.baseDistance;
		if (typeof raw.voyageProgress === "number" && isFinite(raw.voyageProgress)){
			def.voyageProgress = Math.max(0, Math.min(def.voyageMax, raw.voyageProgress));
		}
		if (typeof raw.voyageCount === "number" && isFinite(raw.voyageCount)){
			def.voyageCount = Math.max(0, Math.floor(raw.voyageCount));
		}
		if (typeof raw.autoVoyage === "boolean"){
			def.autoVoyage = raw.autoVoyage;
		}
		if (typeof raw.hongmengQi === "number" && isFinite(raw.hongmengQi)){
			def.hongmengQi = Math.max(0, Math.floor(raw.hongmengQi));
		}
		if (typeof raw.primordialIron === "number" && isFinite(raw.primordialIron)){
			def.primordialIron = Math.max(0, Math.floor(raw.primordialIron));
		}
		def.totalQiHarvested = (typeof raw.totalQiHarvested === "number" && isFinite(raw.totalQiHarvested))
			? Math.max(def.hongmengQi, Math.floor(raw.totalQiHarvested))
			: def.hongmengQi;
		def.totalIronHarvested = (typeof raw.totalIronHarvested === "number" && isFinite(raw.totalIronHarvested))
			? Math.max(def.primordialIron, Math.floor(raw.totalIronHarvested))
			: def.primordialIron;
		if (raw.realmMastery && typeof raw.realmMastery === "object"){
			for (var i = 0; i < this.STAR_REALMS.length; i++){
				var rk = this.STAR_REALMS[i].key;
				var mv = raw.realmMastery[rk];
				if (typeof mv === "number" && isFinite(mv)){
					def.realmMastery[rk] = Math.min(10, Math.max(0, Math.floor(mv)));
				}
			}
		}
		if (typeof raw.lastNote === "string"){ def.lastNote = raw.lastNote; }
		return def;
	},

	makeDefaultHongmengAltar: function(){
		var treasures = {};
		for (var i = 0; i < this.HONGMENG_TREASURES.length; i++){
			treasures[this.HONGMENG_TREASURES[i].key] = 0;
		}
		return {
			treasures: treasures,
			totalForges: 0,
			lastNote: ""
		};
	},

	normalizeHongmengAltar: function(raw){
		var def = this.makeDefaultHongmengAltar();
		if (!raw || typeof raw !== "object"){ return def; }
		var sum = 0;
		if (raw.treasures && typeof raw.treasures === "object"){
			for (var i = 0; i < this.HONGMENG_TREASURES.length; i++){
				var tk = this.HONGMENG_TREASURES[i].key;
				var tv = raw.treasures[tk];
				if (typeof tv === "number" && isFinite(tv)){
					def.treasures[tk] = Math.min(6, Math.max(0, Math.floor(tv)));
				}
				sum += def.treasures[tk];
			}
		}
		def.totalForges = (typeof raw.totalForges === "number" && isFinite(raw.totalForges))
			? Math.max(sum, Math.floor(raw.totalForges))
			: sum;
		if (typeof raw.lastNote === "string"){ def.lastNote = raw.lastNote; }
		return def;
	},

	getHongmengImprintCostMult: function(){
		var seal = Math.max(0, Math.min(6, Math.floor(this.hongmengImprintTier || 0)));
		var imp = Math.max(0, Math.min(10, Math.floor(this.immortalImprint || 0)));
		return Math.max(0.55, 1 - seal * 0.06 - imp * 0.015);
	},

	getHongmengStartingQi: function(){
		var seal = Math.max(0, Math.min(6, Math.floor(this.hongmengImprintTier || 0)));
		return seal * 4;
	},

	getHongmengDaoBonus: function(){
		var seal = Math.max(0, Math.min(6, Math.floor(this.hongmengImprintTier || 0)));
		if (seal <= 0){
			return {tier: 0, xiuweiBase: 0, xiuweiRatio: 0};
		}
		return {
			tier: seal,
			xiuweiBase: seal * 0.20,
			xiuweiRatio: seal * 0.10
		};
	},

	syncHongmengImprintTier: function(){
		var peak = Math.max(0, Math.floor(this.hongmengImprintTier || 0));
		if (this.starship && (this.starship.vesselTier || 0) > peak){
			peak = Math.floor(this.starship.vesselTier);
		}
		if (this.hongmengAltar && this.hongmengAltar.treasures){
			for (var i = 0; i < this.HONGMENG_TREASURES.length; i++){
				var tk = this.HONGMENG_TREASURES[i].key;
				var tv = this.hongmengAltar.treasures[tk] || 0;
				if (tv > peak){ peak = Math.floor(tv); }
			}
		}
		this.hongmengImprintTier = Math.min(6, peak);
		return this.hongmengImprintTier;
	},

	getStarshipUpgradeReq: function(){
		var ss = this.starship || this.makeDefaultStarship();
		if ((ss.vesselTier || 0) >= 6){ return null; }
		var nextTier = (ss.vesselTier || 0) + 1;
		var cfg = this.TAIXU_VESSEL_TIERS[nextTier];
		if (!cfg){ return null; }
		var mult = this.getHongmengImprintCostMult();
		var xyCost = Math.max(8, this.roundNice(cfg.xianyuan * mult));
		var scCost = cfg.starchart > 0 ? Math.max(5, this.roundNice(cfg.starchart * mult)) : 0;
		var auxCost = (cfg.auxRes && cfg.auxVal > 0) ? Math.max(4, this.roundNice(cfg.auxVal * mult)) : 0;
		var xyObj = this.game.resPool.get("xianyuan");
		var scObj = scCost > 0 ? this.game.resPool.get("starchart") : null;
		var auxObj = cfg.auxRes ? this.game.resPool.get(cfg.auxRes) : null;
		var okXy = !!(xyObj && xyObj.value >= xyCost);
		var okSc = scCost <= 0 || !!(scObj && scObj.value >= scCost);
		var okAux = !cfg.auxRes || auxCost <= 0 || !!(auxObj && auxObj.value >= auxCost);
		var okLaw = (this.daoyun || 0) >= (cfg.reqDaoyun || 0);
		return {
			nextTier: nextTier,
			titleKey: cfg.titleKey,
			xianyuan: xyCost,
			starchart: scCost,
			auxRes: cfg.auxRes,
			auxVal: auxCost,
			reqDaoyun: cfg.reqDaoyun || 0,
			affordable: !!(okXy && okSc && okAux && okLaw)
		};
	},

	upgradeStarship: function(){
		if (!this.immortalAscended){ return false; }
		this.starship = this.normalizeStarship(this.starship);
		var req = this.getStarshipUpgradeReq();
		if (!req || !req.affordable){ return false; }
		this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
		if (req.starchart > 0){
			this.game.resPool.addResEvent("starchart", -req.starchart);
		}
		if (req.auxRes && req.auxVal > 0){
			this.game.resPool.addResEvent(req.auxRes, -req.auxVal);
		}
		this.starship.vesselTier = req.nextTier;
		this.syncHongmengImprintTier();
		if (classes.ui && classes.ui.XianxiaAudio && classes.ui.XianxiaAudio.playBell){
			classes.ui.XianxiaAudio.playBell(this.game, true);
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.cosmos.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Taixu Star-Ark upgraded to [" + $I(req.titleKey) + "]!")
			: ("【太虚星槎晋阶】仙家龙骨淬炼功成，飞舟晋升至【" + $I(req.titleKey) + "】！");
		this.starship.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	constructStarship: function(){
		return this.upgradeStarship();
	},

	selectStarRealm: function(realmKey){
		if (!this.immortalAscended){ return false; }
		var rDef = this.getStarRealmDef(realmKey);
		if (!rDef){ return false; }
		this.starship = this.normalizeStarship(this.starship);
		var prevMax = Math.max(1, this.starship.voyageMax || 80);
		var ratio = Math.max(0, Math.min(0.99, (this.starship.voyageProgress || 0) / prevMax));
		this.starship.selectedRealm = realmKey;
		this.starship.voyageMax = rDef.baseDistance;
		this.starship.voyageProgress = Math.floor(rDef.baseDistance * ratio);
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.cosmos.badge") || "").indexOf("Immortal") === 0;
		this.starship.lastNote = isEn
			? ("Set Star-Ark course toward [" + $I(rDef.labelKey) + "].")
			: ("【星槎转舵】太虚罗盘已锁定航向【" + $I(rDef.labelKey) + "】。");
		return true;
	},

	toggleStarshipAutoVoyage: function(){
		if (!this.immortalAscended){ return false; }
		this.starship = this.normalizeStarship(this.starship);
		this.starship.autoVoyage = !this.starship.autoVoyage;
		return this.starship.autoVoyage;
	},

	getStarDriveSurgeCost: function(){
		return Math.max(6, Math.round(12 * this.getHongmengImprintCostMult()));
	},

	getStarshipVoyagePreview: function(realmKeyOpt){
		var ss = this.starship || this.makeDefaultStarship();
		var rKey = realmKeyOpt || ss.selectedRealm || "ziwei";
		var rDef = this.getStarRealmDef(rKey) || this.STAR_REALMS[0];
		var vCfg = this.getVesselTierDef(ss.vesselTier || 0);
		var zxVoy = this.getZixiaoVoyageBonuses ? this.getZixiaoVoyageBonuses() : {yieldMult: 1, speedMult: 1};
		var cargoM = Math.max(1, vCfg.cargoMult || 1) * (zxVoy.yieldMult || 1);
		var mastery = (ss.realmMastery && ss.realmMastery[rDef.key]) ? ss.realmMastery[rDef.key] : 0;
		var mastMult = 1 + mastery * 0.06;
		var qiGain = Math.max(1, Math.round(rDef.baseQi * cargoM * mastMult));
		var ironGain = Math.max(1, Math.round(rDef.baseIron * cargoM * mastMult));
		var xyGain = Math.max(4, Math.round(rDef.bonusXy * cargoM * mastMult));
		var sealMult = 1 + Math.max(0, Math.floor(this.hongmengImprintTier || 0)) * 0.08;
		var speedPerTick = ((ss.vesselTier || 0) > 0) ? (1.25 * (vCfg.speedMult || 1) * sealMult * (zxVoy.speedMult || 1)) : 0;
		return {
			realmKey: rDef.key,
			qiGain: qiGain,
			ironGain: ironGain,
			xyGain: xyGain,
			distance: rDef.baseDistance,
			speedPerTick: speedPerTick
		};
	},

	completeStarshipVoyage: function(fromSurge){
		this.starship = this.normalizeStarship(this.starship);
		if (!this.immortalAscended || (this.starship.vesselTier || 0) <= 0){ return null; }
		var rKey = this.starship.selectedRealm || "ziwei";
		var rDef = this.getStarRealmDef(rKey) || this.STAR_REALMS[0];
		var prev = this.getStarshipVoyagePreview(rDef.key);
		this.starship.hongmengQi = (this.starship.hongmengQi || 0) + prev.qiGain;
		this.starship.primordialIron = (this.starship.primordialIron || 0) + prev.ironGain;
		this.starship.totalQiHarvested = (this.starship.totalQiHarvested || 0) + prev.qiGain;
		this.starship.totalIronHarvested = (this.starship.totalIronHarvested || 0) + prev.ironGain;
		this.starship.voyageCount = (this.starship.voyageCount || 0) + 1;
		var curMast = this.starship.realmMastery[rDef.key] || 0;
		if (curMast < 10){
			this.starship.realmMastery[rDef.key] = curMast + 1;
		}
		var xyRes = this.game.resPool.get("xianyuan");
		if (xyRes){ xyRes.unlocked = true; }
		this.game.resPool.addResEvent("xianyuan", prev.xyGain);
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.cosmos.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Voyage across [" + $I(rDef.labelKey) + "] complete! +" + prev.qiGain + " Hongmeng Qi, +" + prev.ironGain + " Primordial Iron, +" + prev.xyGain + " Essence!")
			: ("【星域巡航凯旋】太虚星槎横渡【" + $I(rDef.labelKey) + "】归来！采得鸿蒙紫气 +" + prev.qiGain + " · 太初神铁 +" + prev.ironGain + " · 仙元 +" + prev.xyGain + "！");
		this.starship.lastNote = note;
		if (fromSurge){
			this.game.msg(note, "notice");
		}
		return prev;
	},

	surgeStarshipVoyage: function(){
		if (!this.immortalAscended){ return false; }
		this.starship = this.normalizeStarship(this.starship);
		if ((this.starship.vesselTier || 0) <= 0){ return false; }
		var cost = this.getStarDriveSurgeCost();
		var xyObj = this.game.resPool.get("xianyuan");
		if (!xyObj || xyObj.value < cost){ return false; }
		this.game.resPool.addResEvent("xianyuan", -cost);
		var vCfg = this.getVesselTierDef(this.starship.vesselTier);
		var surgeAmt = Math.max(45, Math.round(55 * (vCfg.speedMult || 1)));
		this.starship.voyageProgress = (this.starship.voyageProgress || 0) + surgeAmt;
		var completed = false;
		var maxDist = Math.max(1, this.starship.voyageMax || 80);
		while (this.starship.voyageProgress >= maxDist){
			this.starship.voyageProgress -= maxDist;
			this.completeStarshipVoyage(true);
			completed = true;
		}
		if (!completed){
			var pct = Math.min(99, Math.round((this.starship.voyageProgress / maxDist) * 100));
			var isEn = String($I("cultivation.cosmos.badge") || "").indexOf("Immortal") === 0;
			this.starship.lastNote = isEn
				? ("Star-Drive Surge propelled voyage to " + pct + "%!")
				: ("【催动星槎巡航】仙元灌注风帆，当前星域航程推进至 " + pct + "%！");
		}
		return true;
	},

	tickStarship: function(ticksDelta){
		if (!this.immortalAscended || !this.starship){ return; }
		if ((this.starship.vesselTier || 0) <= 0 || !this.starship.autoVoyage){ return; }
		var dt = Math.max(0, typeof ticksDelta === "number" ? ticksDelta : 1);
		if (dt <= 0){ return; }
		var prev = this.getStarshipVoyagePreview(this.starship.selectedRealm);
		if (prev.speedPerTick <= 0){ return; }
		this.starship.voyageProgress = (this.starship.voyageProgress || 0) + dt * prev.speedPerTick;
		var maxDist = Math.max(1, this.starship.voyageMax || 80);
		var guard = 0;
		while (this.starship.voyageProgress >= maxDist && guard < 8){
			this.starship.voyageProgress -= maxDist;
			this.completeStarshipVoyage(false);
			guard++;
		}
		if (this.starship.voyageProgress >= maxDist){
			this.starship.voyageProgress = maxDist - 1;
		}
	},

	getHongmengMaxTier: function(){
		if (!this.hongmengAltar || !this.hongmengAltar.treasures){ return 0; }
		var maxT = 0;
		for (var i = 0; i < this.HONGMENG_TREASURES.length; i++){
			var t = this.hongmengAltar.treasures[this.HONGMENG_TREASURES[i].key] || 0;
			if (t > maxT){ maxT = t; }
		}
		return maxT;
	},

	getHongmengMinTier: function(){
		if (!this.hongmengAltar || !this.hongmengAltar.treasures){ return 0; }
		var minT = 6;
		for (var i = 0; i < this.HONGMENG_TREASURES.length; i++){
			var t = this.hongmengAltar.treasures[this.HONGMENG_TREASURES[i].key] || 0;
			if (t < minT){ minT = t; }
		}
		return minT;
	},

	getHongmengTotalTier: function(){
		if (!this.hongmengAltar || !this.hongmengAltar.treasures){ return 0; }
		var sum = 0;
		for (var i = 0; i < this.HONGMENG_TREASURES.length; i++){
			sum += Math.max(0, Math.floor(this.hongmengAltar.treasures[this.HONGMENG_TREASURES[i].key] || 0));
		}
		return sum;
	},

	getHongmengResonanceTier: function(){
		var minT = this.getHongmengMinTier();
		if (minT >= 6){ return 3; }
		if (minT >= 3){ return 2; }
		if (minT >= 1){ return 1; }
		return 0;
	},

	hasTriTreasureResonance: function(){
		return this.getHongmengResonanceTier() >= 1;
	},

	getHongmengForgeReq: function(treasureKey){
		var def = this.getHongmengTreasureDef(treasureKey);
		if (!def){ return null; }
		var ha = this.hongmengAltar || this.makeDefaultHongmengAltar();
		var ss = this.starship || this.makeDefaultStarship();
		var curTier = ha.treasures[treasureKey] || 0;
		if (curTier >= 6){ return null; }
		var nextTier = curTier + 1;
		var mult = this.getHongmengImprintCostMult();
		var qiCost = Math.max(1, Math.round((def.baseQi + (nextTier - 1) * 2) * mult));
		var ironCost = Math.max(1, Math.round((def.baseIron + (nextTier - 1) * 2) * mult));
		var xyCost = Math.max(8, this.roundNice(def.baseXy * Math.pow(1.42, nextTier - 1) * mult));
		var reqDaoyun = Math.floor(nextTier / 2);
		var xyObj = this.game.resPool.get("xianyuan");
		var okQi = (ss.hongmengQi || 0) >= qiCost;
		var okIron = (ss.primordialIron || 0) >= ironCost;
		var okXy = !!(xyObj && xyObj.value >= xyCost);
		var okLaw = (this.daoyun || 0) >= reqDaoyun;
		return {
			treasureKey: treasureKey,
			nextTier: nextTier,
			hongmengQi: qiCost,
			primordialIron: ironCost,
			xianyuan: xyCost,
			reqDaoyun: reqDaoyun,
			affordable: !!(okQi && okIron && okXy && okLaw)
		};
	},

	forgeHongmengTreasure: function(treasureKey){
		if (!this.immortalAscended){ return false; }
		this.starship = this.normalizeStarship(this.starship);
		this.hongmengAltar = this.normalizeHongmengAltar(this.hongmengAltar);
		var def = this.getHongmengTreasureDef(treasureKey);
		if (!def){ return false; }
		var prevRes = this.getHongmengResonanceTier();
		var req = this.getHongmengForgeReq(treasureKey);
		if (!req || !req.affordable){ return false; }
		this.starship.hongmengQi = Math.max(0, (this.starship.hongmengQi || 0) - req.hongmengQi);
		this.starship.primordialIron = Math.max(0, (this.starship.primordialIron || 0) - req.primordialIron);
		this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
		this.hongmengAltar.treasures[treasureKey] = req.nextTier;
		this.hongmengAltar.totalForges = (this.hongmengAltar.totalForges || 0) + 1;
		this.syncHongmengImprintTier();
		this.addDaoLawProgress(22 + req.nextTier * 6);
		var newRes = this.getHongmengResonanceTier();
		if (classes.ui && classes.ui.XianxiaAudio && classes.ui.XianxiaAudio.playBell){
			classes.ui.XianxiaAudio.playBell(this.game, true);
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.cosmos.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Tempered [" + $I(def.labelKey) + "] to Tier " + req.nextTier + "/6" +
				(newRes > prevRes ? (" — Tri-Treasure Hongmeng Resonance Tier " + newRes + " awakened!") : "!"))
			: ("【混沌祭坛淬宝】【" + $I(def.labelKey) + "】晋升至第 " + req.nextTier + "/6 阶" +
				(newRes > prevRes ? ("，激发第 " + newRes + " 重【三宝鸿蒙开天共鸣】！") : "！"));
		this.hongmengAltar.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	// ---------------- XX-8 混沌紫霄讲道坛与三千大道神通法相 ----------------

	ZIXIAO_ALTAR_TIERS: [
		{tier: 0, titleKey: "cultivation.zixiao.tier.0", sutraMult: 0, lectureSpeed: 0, xyBase: 0, xyRatio: 0, herbSpeed: 0, voyageYield: 0},
		{tier: 1, titleKey: "cultivation.zixiao.tier.1", xianyuan: 20, relic: 12, auxRes: null, auxVal: 0, reqDaoyun: 0, sutraMult: 1.00, lectureSpeed: 1.00, xyBase: 0.03, xyRatio: 0.10, herbSpeed: 0.10, voyageYield: 0.10},
		{tier: 2, titleKey: "cultivation.zixiao.tier.2", xianyuan: 42, relic: 24, auxRes: "starchart", auxVal: 16, reqDaoyun: 1, sutraMult: 1.30, lectureSpeed: 1.30, xyBase: 0.06, xyRatio: 0.18, herbSpeed: 0.18, voyageYield: 0.18},
		{tier: 3, titleKey: "cultivation.zixiao.tier.3", xianyuan: 78, relic: 45, auxRes: "timeCrystal", auxVal: 20, reqDaoyun: 1, sutraMult: 1.65, lectureSpeed: 1.65, xyBase: 0.10, xyRatio: 0.28, herbSpeed: 0.28, voyageYield: 0.28},
		{tier: 4, titleKey: "cultivation.zixiao.tier.4", xianyuan: 130, relic: 72, auxRes: "unobtainium", auxVal: 30, reqDaoyun: 2, sutraMult: 2.05, lectureSpeed: 2.05, xyBase: 0.15, xyRatio: 0.40, herbSpeed: 0.40, voyageYield: 0.40},
		{tier: 5, titleKey: "cultivation.zixiao.tier.5", xianyuan: 210, relic: 110, auxRes: "timeCrystal", auxVal: 48, reqDaoyun: 2, sutraMult: 2.55, lectureSpeed: 2.50, xyBase: 0.22, xyRatio: 0.55, herbSpeed: 0.54, voyageYield: 0.54},
		{tier: 6, titleKey: "cultivation.zixiao.tier.6", xianyuan: 320, relic: 165, auxRes: "unobtainium", auxVal: 75, reqDaoyun: 3, sutraMult: 3.20, lectureSpeed: 3.10, xyBase: 0.30, xyRatio: 0.72, herbSpeed: 0.70, voyageYield: 0.70}
	],

	DHARMA_IDOLS: [
		{
			key: "cosmicGiant",
			labelKey: "cultivation.dharma.item.cosmicGiant.label",
			descKey: "cultivation.dharma.item.cosmicGiant.desc",
			art: "res/art/dharma_cosmic_giant.webp",
			baseSutras: 3,
			baseXy: 22,
			baseQi: 1
		},
		{
			key: "threePure",
			labelKey: "cultivation.dharma.item.threePure.label",
			descKey: "cultivation.dharma.item.threePure.desc",
			art: "res/art/dharma_three_pure.webp",
			baseSutras: 3,
			baseXy: 22,
			baseQi: 1
		},
		{
			key: "zhuxianSwords",
			labelKey: "cultivation.dharma.item.zhuxianSwords.label",
			descKey: "cultivation.dharma.item.zhuxianSwords.desc",
			art: "res/art/dharma_zhuxian_swords.webp",
			baseSutras: 4,
			baseXy: 26,
			baseQi: 1
		},
		{
			key: "samsaraLotus",
			labelKey: "cultivation.dharma.item.samsaraLotus.label",
			descKey: "cultivation.dharma.item.samsaraLotus.desc",
			art: "res/art/dharma_samsara_lotus.webp",
			baseSutras: 3,
			baseXy: 24,
			baseQi: 1
		}
	],

	getZixiaoAltarTierDef: function(tier){
		var t = Math.max(0, Math.min(6, Math.floor(tier || 0)));
		return this.ZIXIAO_ALTAR_TIERS[t] || this.ZIXIAO_ALTAR_TIERS[0];
	},

	getDharmaIdolDef: function(key){
		for (var i = 0; i < this.DHARMA_IDOLS.length; i++){
			if (this.DHARMA_IDOLS[i].key === key){ return this.DHARMA_IDOLS[i]; }
		}
		return null;
	},

	makeDefaultZixiaoAltar: function(){
		return {
			tier: 0,
			daoSutras: 0,
			totalSutrasCondensed: 0,
			comprehension: 0,
			lectureProgress: 0,
			lectureMax: 100,
			lectureCount: 0,
			hongmengLectureCount: 0,
			autoLecture: true,
			lastNote: ""
		};
	},

	normalizeZixiaoAltar: function(raw){
		var def = this.makeDefaultZixiaoAltar();
		if (!raw || typeof raw !== "object"){ return def; }
		if (typeof raw.tier === "number" && isFinite(raw.tier)){
			def.tier = Math.min(6, Math.max(0, Math.floor(raw.tier)));
		}
		if (typeof raw.daoSutras === "number" && isFinite(raw.daoSutras)){
			def.daoSutras = Math.max(0, Math.floor(raw.daoSutras));
		}
		def.totalSutrasCondensed = (typeof raw.totalSutrasCondensed === "number" && isFinite(raw.totalSutrasCondensed))
			? Math.max(def.daoSutras, Math.floor(raw.totalSutrasCondensed))
			: def.daoSutras;
		if (typeof raw.comprehension === "number" && isFinite(raw.comprehension)){
			def.comprehension = Math.max(0, Math.floor(raw.comprehension));
		}
		if (typeof raw.lectureProgress === "number" && isFinite(raw.lectureProgress)){
			def.lectureProgress = Math.max(0, Math.min(100, raw.lectureProgress));
		}
		if (typeof raw.lectureCount === "number" && isFinite(raw.lectureCount)){
			def.lectureCount = Math.max(0, Math.floor(raw.lectureCount));
		}
		if (typeof raw.hongmengLectureCount === "number" && isFinite(raw.hongmengLectureCount)){
			def.hongmengLectureCount = Math.max(0, Math.floor(raw.hongmengLectureCount));
		}
		if (typeof raw.autoLecture === "boolean"){
			def.autoLecture = raw.autoLecture;
		}
		if (typeof raw.lastNote === "string"){ def.lastNote = raw.lastNote; }
		return def;
	},

	syncDaoSutras: function(){
		this.daoSutras = (this.zixiaoAltar && typeof this.zixiaoAltar.daoSutras === "number")
			? Math.max(0, Math.floor(this.zixiaoAltar.daoSutras))
			: 0;
		return this.daoSutras;
	},

	makeDefaultDharmaIdols: function(){
		var levels = {};
		for (var i = 0; i < this.DHARMA_IDOLS.length; i++){
			levels[this.DHARMA_IDOLS[i].key] = 0;
		}
		return {
			levels: levels,
			primaryKey: null,
			supportKey: null,
			totalRefinements: 0,
			lastNote: ""
		};
	},

	normalizeDharmaIdols: function(raw){
		var def = this.makeDefaultDharmaIdols();
		if (!raw || typeof raw !== "object"){ return def; }
		var sum = 0;
		if (raw.levels && typeof raw.levels === "object"){
			for (var i = 0; i < this.DHARMA_IDOLS.length; i++){
				var ik = this.DHARMA_IDOLS[i].key;
				var lv = raw.levels[ik];
				if (typeof lv === "number" && isFinite(lv)){
					def.levels[ik] = Math.min(6, Math.max(0, Math.floor(lv)));
				}
				sum += def.levels[ik];
			}
		}
		if (typeof raw.primaryKey === "string" && this.getDharmaIdolDef(raw.primaryKey) && def.levels[raw.primaryKey] > 0){
			def.primaryKey = raw.primaryKey;
		}
		if (typeof raw.supportKey === "string" && this.getDharmaIdolDef(raw.supportKey) && def.levels[raw.supportKey] > 0 && raw.supportKey !== def.primaryKey){
			def.supportKey = raw.supportKey;
		}
		def.totalRefinements = (typeof raw.totalRefinements === "number" && isFinite(raw.totalRefinements))
			? Math.max(sum, Math.floor(raw.totalRefinements))
			: sum;
		if (typeof raw.lastNote === "string"){ def.lastNote = raw.lastNote; }
		return def;
	},

	getDharmaImprintCostMult: function(){
		var seal = Math.max(0, Math.min(6, Math.floor(this.dharmaImprintTier || 0)));
		var imp = Math.max(0, Math.min(10, Math.floor(this.immortalImprint || 0)));
		return Math.max(0.55, 1 - seal * 0.06 - imp * 0.015);
	},

	getDharmaStartingSutras: function(){
		var seal = Math.max(0, Math.min(6, Math.floor(this.dharmaImprintTier || 0)));
		return seal * 5;
	},

	getDharmaDaoBonus: function(){
		var seal = Math.max(0, Math.min(6, Math.floor(this.dharmaImprintTier || 0)));
		if (seal <= 0){
			return {tier: 0, xiuweiBase: 0, xiuweiRatio: 0, zhenyuanRatio: 0};
		}
		return {
			tier: seal,
			xiuweiBase: seal * 0.25,
			xiuweiRatio: seal * 0.12,
			zhenyuanRatio: seal * 0.04
		};
	},

	syncDharmaImprintTier: function(){
		var peak = Math.max(0, Math.floor(this.dharmaImprintTier || 0));
		if (this.zixiaoAltar && (this.zixiaoAltar.tier || 0) > peak){
			peak = Math.floor(this.zixiaoAltar.tier);
		}
		if (this.dharmaIdols && this.dharmaIdols.levels){
			for (var i = 0; i < this.DHARMA_IDOLS.length; i++){
				var ik = this.DHARMA_IDOLS[i].key;
				var lv = this.dharmaIdols.levels[ik] || 0;
				if (lv > peak){ peak = Math.floor(lv); }
			}
		}
		this.dharmaImprintTier = Math.min(6, peak);
		return this.dharmaImprintTier;
	},

	getZixiaoComprehensionRank: function(){
		var za = this.zixiaoAltar;
		if (!za){ return 0; }
		return Math.min(12, Math.floor((za.comprehension || 0) / 25));
	},

	getZixiaoAuraBonuses: function(){
		if (!this.immortalAscended){
			return {xyBase: 0, xyRatio: 0, xiuweiRatio: 0, herbSpeed: 0, herbYield: 0, voyageYield: 0, voyageSpeed: 0};
		}
		var za = this.zixiaoAltar;
		var tier = (za && za.tier) ? za.tier : 0;
		var cfg = this.getZixiaoAltarTierDef(tier);
		var comp = (za && za.comprehension) ? za.comprehension : 0;
		var compSteps = Math.min(15, comp / 20);
		var xyBase = (cfg.xyBase || 0) + compSteps * 0.015;
		var xyRatio = (cfg.xyRatio || 0) + compSteps * 0.05;
		var xiuweiRatio = tier * 0.14 + compSteps * 0.06;
		var herbSpeed = (cfg.herbSpeed || 0) + compSteps * 0.045;
		var herbYield = tier * 0.03 + compSteps * 0.015;
		var voyageYield = (cfg.voyageYield || 0) + compSteps * 0.045;
		var voyageSpeed = tier * 0.05;

		var dm = this.dharmaIdols;
		if (dm && dm.levels){
			var tpLv = dm.levels.threePure || 0;
			if (tpLv > 0){
				voyageSpeed += 0.14 * tpLv * this.getDharmaSlotWeight("threePure");
			}
			var dRes = this.getDharmaResonanceTier();
			if (dRes >= 1){ voyageYield += 0.12; voyageSpeed += 0.12; }
			if (dRes >= 2){ voyageYield += 0.18; voyageSpeed += 0.18; }
			if (dRes >= 3){ voyageYield += 0.25; voyageSpeed += 0.25; }
		}
		return {
			xyBase: xyBase,
			xyRatio: xyRatio,
			xiuweiRatio: xiuweiRatio,
			herbSpeed: herbSpeed,
			herbYield: herbYield,
			voyageYield: voyageYield,
			voyageSpeed: voyageSpeed
		};
	},

	getZixiaoVoyageBonuses: function(){
		var aura = this.getZixiaoAuraBonuses();
		return {
			yieldBonus: aura.voyageYield,
			speedBonus: aura.voyageSpeed,
			yieldMult: 1 + aura.voyageYield,
			speedMult: 1 + aura.voyageSpeed
		};
	},

	getZixiaoUpgradeReq: function(){
		var za = this.zixiaoAltar || this.makeDefaultZixiaoAltar();
		if ((za.tier || 0) >= 6){ return null; }
		var nextTier = (za.tier || 0) + 1;
		var cfg = this.ZIXIAO_ALTAR_TIERS[nextTier];
		if (!cfg){ return null; }
		var mult = this.getDharmaImprintCostMult();
		var xyCost = Math.max(8, this.roundNice(cfg.xianyuan * mult));
		var rlCost = cfg.relic > 0 ? Math.max(5, this.roundNice(cfg.relic * mult)) : 0;
		var auxCost = (cfg.auxRes && cfg.auxVal > 0) ? Math.max(4, this.roundNice(cfg.auxVal * mult)) : 0;
		var xyObj = this.game.resPool.get("xianyuan");
		var rlObj = rlCost > 0 ? this.game.resPool.get("relic") : null;
		var auxObj = cfg.auxRes ? this.game.resPool.get(cfg.auxRes) : null;
		var okXy = !!(xyObj && xyObj.value >= xyCost);
		var okRl = rlCost <= 0 || !!(rlObj && rlObj.value >= rlCost);
		var okAux = !cfg.auxRes || auxCost <= 0 || !!(auxObj && auxObj.value >= auxCost);
		var okLaw = (this.daoyun || 0) >= (cfg.reqDaoyun || 0);
		return {
			nextTier: nextTier,
			titleKey: cfg.titleKey,
			xianyuan: xyCost,
			relic: rlCost,
			auxRes: cfg.auxRes,
			auxVal: auxCost,
			reqDaoyun: cfg.reqDaoyun || 0,
			affordable: !!(okXy && okRl && okAux && okLaw)
		};
	},

	upgradeZixiaoAltar: function(){
		if (!this.immortalAscended){ return false; }
		this.zixiaoAltar = this.normalizeZixiaoAltar(this.zixiaoAltar);
		var req = this.getZixiaoUpgradeReq();
		if (!req || !req.affordable){ return false; }
		this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
		if (req.relic > 0){
			this.game.resPool.addResEvent("relic", -req.relic);
		}
		if (req.auxRes && req.auxVal > 0){
			this.game.resPool.addResEvent(req.auxRes, -req.auxVal);
		}
		this.zixiaoAltar.tier = req.nextTier;
		this.syncDharmaImprintTier();
		this.syncDaoSutras();
		if (classes.ui && classes.ui.XianxiaAudio && classes.ui.XianxiaAudio.playBell){
			classes.ui.XianxiaAudio.playBell(this.game, true);
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.zixiao.panel.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ("Zixiao Dao Lecture Altar upgraded to [" + $I(req.titleKey) + "]!")
			: ("【紫霄道坛晋阶】紫气庆云垂拱，讲道圣坛晋升至【" + $I(req.titleKey) + "】！");
		this.zixiaoAltar.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	constructZixiaoAltar: function(){
		return this.upgradeZixiaoAltar();
	},

	toggleZixiaoAutoLecture: function(){
		if (!this.immortalAscended){ return false; }
		this.zixiaoAltar = this.normalizeZixiaoAltar(this.zixiaoAltar);
		this.zixiaoAltar.autoLecture = !this.zixiaoAltar.autoLecture;
		return this.zixiaoAltar.autoLecture;
	},

	getDaoLecturePreview: function(mode){
		var za = this.zixiaoAltar || this.makeDefaultZixiaoAltar();
		var ss = this.starship || this.makeDefaultStarship();
		var tier = za.tier || 0;
		var cfg = this.getZixiaoAltarTierDef(tier);
		var mult = this.getDharmaImprintCostMult();
		var compRank = this.getZixiaoComprehensionRank();
		var sutraScale = Math.max(1, cfg.sutraMult || 1) * (1 + compRank * 0.05);
		var isHm = (mode === "hongmeng");
		var xyCost = isHm
			? Math.max(6, Math.round(14 * mult))
			: Math.max(8, Math.round(16 * mult));
		var qiCost = isHm ? Math.max(1, Math.round(2 * mult)) : 0;
		var sutraGain = isHm
			? Math.max(5, Math.round(5 * sutraScale))
			: Math.max(2, Math.round(2 * sutraScale));
		var compGain = isHm
			? Math.max(22, Math.round(26 * (cfg.sutraMult || 1)))
			: Math.max(10, Math.round(12 * (cfg.sutraMult || 1)));
		var lawProg = isHm ? (34 + tier * 6) : (16 + tier * 4);
		var xyObj = this.game.resPool.get("xianyuan");
		var okTier = tier >= 1;
		var okXy = !!(xyObj && xyObj.value >= xyCost);
		var okQi = qiCost <= 0 || ((ss.hongmengQi || 0) >= qiCost);
		return {
			mode: isHm ? "hongmeng" : "essence",
			xianyuan: xyCost,
			hongmengQi: qiCost,
			sutraGain: sutraGain,
			compGain: compGain,
			lawProg: lawProg,
			affordable: !!(this.immortalAscended && okTier && okXy && okQi)
		};
	},

	holdDaoLecture: function(mode){
		if (!this.immortalAscended){ return false; }
		this.zixiaoAltar = this.normalizeZixiaoAltar(this.zixiaoAltar);
		this.starship = this.normalizeStarship(this.starship);
		if ((this.zixiaoAltar.tier || 0) <= 0){ return false; }
		var prev = this.getDaoLecturePreview(mode);
		if (!prev.affordable){ return false; }
		this.game.resPool.addResEvent("xianyuan", -prev.xianyuan);
		if (prev.hongmengQi > 0){
			this.starship.hongmengQi = Math.max(0, (this.starship.hongmengQi || 0) - prev.hongmengQi);
		}
		this.zixiaoAltar.daoSutras = (this.zixiaoAltar.daoSutras || 0) + prev.sutraGain;
		this.zixiaoAltar.totalSutrasCondensed = (this.zixiaoAltar.totalSutrasCondensed || 0) + prev.sutraGain;
		this.zixiaoAltar.comprehension = (this.zixiaoAltar.comprehension || 0) + prev.compGain;
		this.zixiaoAltar.lectureCount = (this.zixiaoAltar.lectureCount || 0) + 1;
		if (prev.mode === "hongmeng"){
			this.zixiaoAltar.hongmengLectureCount = (this.zixiaoAltar.hongmengLectureCount || 0) + 1;
		}
		this.syncDaoSutras();
		this.addDaoLawProgress(prev.lawProg);
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.zixiao.panel.badge") || "").indexOf("Immortal") === 0;
		var note = (prev.mode === "hongmeng")
			? (isEn
				? ("Hongmeng Symposium complete! Condensed +" + prev.sutraGain + " Jade Sutras & +" + prev.compGain + " Dao Insight!")
				: ("【鸿蒙论道圆满】紫气演法口吐金莲，凝练三千大道玉简 +" + prev.sutraGain + " · 悟道真解 +" + prev.compGain + "！"))
			: (isEn
				? ("Zixiao Dao Lecture complete! Condensed +" + prev.sutraGain + " Jade Sutras & +" + prev.compGain + " Dao Insight!")
				: ("【开坛讲道功成】道钟三响天花乱坠，凝练三千大道玉简 +" + prev.sutraGain + " · 悟道真解 +" + prev.compGain + "！"));
		this.zixiaoAltar.lastNote = note;
		this.game.msg(note, "notice");
		return true;
	},

	holdEssenceLecture: function(){
		return this.holdDaoLecture("essence");
	},

	holdHongmengLecture: function(){
		return this.holdDaoLecture("hongmeng");
	},

	completePassiveZixiaoSermon: function(){
		if (!this.immortalAscended || !this.zixiaoAltar || (this.zixiaoAltar.tier || 0) <= 0){ return null; }
		var cfg = this.getZixiaoAltarTierDef(this.zixiaoAltar.tier);
		var sGain = Math.max(1, Math.round(1.5 * (cfg.sutraMult || 1)));
		var cGain = Math.max(6, Math.round(7 * (cfg.sutraMult || 1)));
		this.zixiaoAltar.daoSutras = (this.zixiaoAltar.daoSutras || 0) + sGain;
		this.zixiaoAltar.totalSutrasCondensed = (this.zixiaoAltar.totalSutrasCondensed || 0) + sGain;
		this.zixiaoAltar.comprehension = (this.zixiaoAltar.comprehension || 0) + cGain;
		this.zixiaoAltar.lectureCount = (this.zixiaoAltar.lectureCount || 0) + 1;
		this.syncDaoSutras();
		this.addDaoLawProgress(8 + this.zixiaoAltar.tier * 2);
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.zixiao.panel.badge") || "").indexOf("Immortal") === 0;
		this.zixiaoAltar.lastNote = isEn
			? ("Zixiao Bell chime sermon condensed +" + sGain + " Jade Sutras & +" + cGain + " Dao Insight.")
			: ("【紫霄道钟自鸣】庆云流转自演真经，凝得三千大道玉简 +" + sGain + " · 悟道真解 +" + cGain + "。");
		return {sutraGain: sGain, compGain: cGain};
	},

	tickZixiaoAltar: function(ticksDelta){
		if (!this.immortalAscended || !this.zixiaoAltar){ return; }
		if ((this.zixiaoAltar.tier || 0) <= 0 || !this.zixiaoAltar.autoLecture){ return; }
		var dt = Math.max(0, typeof ticksDelta === "number" ? ticksDelta : 1);
		if (dt <= 0){ return; }
		var cfg = this.getZixiaoAltarTierDef(this.zixiaoAltar.tier);
		var sealMult = 1 + Math.max(0, Math.floor(this.dharmaImprintTier || 0)) * 0.08;
		var step = dt * 1.15 * (cfg.lectureSpeed || 1) * sealMult;
		this.zixiaoAltar.lectureProgress = (this.zixiaoAltar.lectureProgress || 0) + step;
		var maxP = Math.max(1, this.zixiaoAltar.lectureMax || 100);
		var guard = 0;
		while (this.zixiaoAltar.lectureProgress >= maxP && guard < 8){
			this.zixiaoAltar.lectureProgress -= maxP;
			this.completePassiveZixiaoSermon();
			guard++;
		}
		if (this.zixiaoAltar.lectureProgress >= maxP){
			this.zixiaoAltar.lectureProgress = maxP - 1;
		}
	},

	getDharmaTotalLevel: function(){
		if (!this.dharmaIdols || !this.dharmaIdols.levels){ return 0; }
		var sum = 0;
		for (var i = 0; i < this.DHARMA_IDOLS.length; i++){
			sum += Math.max(0, Math.floor(this.dharmaIdols.levels[this.DHARMA_IDOLS[i].key] || 0));
		}
		return sum;
	},

	getAwakenedDharmaCount: function(){
		if (!this.dharmaIdols || !this.dharmaIdols.levels){ return 0; }
		var cnt = 0;
		for (var i = 0; i < this.DHARMA_IDOLS.length; i++){
			if ((this.dharmaIdols.levels[this.DHARMA_IDOLS[i].key] || 0) > 0){ cnt++; }
		}
		return cnt;
	},

	getDharmaMaxLevel: function(){
		if (!this.dharmaIdols || !this.dharmaIdols.levels){ return 0; }
		var maxL = 0;
		for (var i = 0; i < this.DHARMA_IDOLS.length; i++){
			var lv = this.dharmaIdols.levels[this.DHARMA_IDOLS[i].key] || 0;
			if (lv > maxL){ maxL = lv; }
		}
		return maxL;
	},

	getDharmaResonanceTier: function(){
		var totalLv = this.getDharmaTotalLevel();
		if (totalLv >= 24){ return 3; }
		if (totalLv >= 12){ return 2; }
		if (totalLv >= 4){ return 1; }
		return 0;
	},

	hasFourDharmaResonance: function(){
		return this.getDharmaResonanceTier() >= 1;
	},

	getDharmaSlotWeight: function(idolKey){
		var dm = this.dharmaIdols;
		if (!dm || !dm.levels || (dm.levels[idolKey] || 0) <= 0){ return 0; }
		if (dm.primaryKey === idolKey){ return 1.35; }
		if (dm.supportKey === idolKey){ return 1.00; }
		return 0.55;
	},

	getDharmaRefineReq: function(idolKey){
		var def = this.getDharmaIdolDef(idolKey);
		if (!def){ return null; }
		var dm = this.dharmaIdols || this.makeDefaultDharmaIdols();
		var za = this.zixiaoAltar || this.makeDefaultZixiaoAltar();
		var ss = this.starship || this.makeDefaultStarship();
		var curLv = dm.levels[idolKey] || 0;
		if (curLv >= 6){ return null; }
		var nextLv = curLv + 1;
		var mult = this.getDharmaImprintCostMult();
		var sutraCost = Math.max(1, Math.round((def.baseSutras + (nextLv - 1) * 2) * mult));
		var xyCost = Math.max(10, this.roundNice(def.baseXy * Math.pow(1.40, nextLv - 1) * mult));
		var qiCost = (nextLv >= 4) ? Math.max(1, Math.round(((nextLv - 3) * def.baseQi) * mult)) : 0;
		var reqDaoyun = Math.floor((nextLv - 1) / 2);
		var xyObj = this.game.resPool.get("xianyuan");
		var haveSutras = za.daoSutras || 0;
		var okSutra = haveSutras >= sutraCost;
		var okXy = !!(xyObj && xyObj.value >= xyCost);
		var okQi = qiCost <= 0 || ((ss.hongmengQi || 0) >= qiCost);
		var okLaw = (this.daoyun || 0) >= reqDaoyun;
		return {
			idolKey: idolKey,
			nextLv: nextLv,
			daoSutras: sutraCost,
			xianyuan: xyCost,
			hongmengQi: qiCost,
			reqDaoyun: reqDaoyun,
			affordable: !!(this.immortalAscended && okSutra && okXy && okQi && okLaw)
		};
	},

	refineDharmaIdol: function(idolKey){
		if (!this.immortalAscended){ return false; }
		this.zixiaoAltar = this.normalizeZixiaoAltar(this.zixiaoAltar);
		this.dharmaIdols = this.normalizeDharmaIdols(this.dharmaIdols);
		this.starship = this.normalizeStarship(this.starship);
		var def = this.getDharmaIdolDef(idolKey);
		if (!def){ return false; }
		var prevRes = this.getDharmaResonanceTier();
		var req = this.getDharmaRefineReq(idolKey);
		if (!req || !req.affordable){ return false; }
		this.zixiaoAltar.daoSutras = Math.max(0, (this.zixiaoAltar.daoSutras || 0) - req.daoSutras);
		this.syncDaoSutras();
		this.game.resPool.addResEvent("xianyuan", -req.xianyuan);
		if (req.hongmengQi > 0){
			this.starship.hongmengQi = Math.max(0, (this.starship.hongmengQi || 0) - req.hongmengQi);
		}
		this.dharmaIdols.levels[idolKey] = req.nextLv;
		this.dharmaIdols.totalRefinements = (this.dharmaIdols.totalRefinements || 0) + 1;
		if (!this.dharmaIdols.primaryKey){
			this.dharmaIdols.primaryKey = idolKey;
		} else if (!this.dharmaIdols.supportKey && this.dharmaIdols.primaryKey !== idolKey){
			this.dharmaIdols.supportKey = idolKey;
		}
		if (idolKey === "samsaraLotus"){
			this.heartDemon = Math.max(0, (this.heartDemon || 0) - 18);
			this.pillToxicity = Math.max(0, (this.pillToxicity || 0) - 18);
		}
		this.syncDharmaImprintTier();
		this.addDaoLawProgress(20 + req.nextLv * 5);
		var newRes = this.getDharmaResonanceTier();
		if (classes.ui && classes.ui.XianxiaAudio && classes.ui.XianxiaAudio.playBell){
			classes.ui.XianxiaAudio.playBell(this.game, true);
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.zixiao.panel.badge") || "").indexOf("Immortal") === 0;
		var note = isEn
			? ((req.nextLv === 1 ? "Awakened [" : "Refined [") + $I(def.labelKey) + "] to Lv." + req.nextLv + "/6" +
				(newRes > prevRes ? (" — Four-Idol Hunyuan Resonance Tier " + newRes + " awakened!") : "!"))
			: ((req.nextLv === 1 ? "【神通法相觉醒】【" : "【神通法相淬炼】【") + $I(def.labelKey) + "】凝炼至第 " + req.nextLv + "/6 重" +
				(newRes > prevRes ? ("，激发第 " + newRes + " 重【四相混元证道共鸣】！") : "！"));
		this.dharmaIdols.lastNote = note;
		this.game.msg(note, "important");
		return true;
	},

	awakenDharmaIdol: function(idolKey){
		return this.refineDharmaIdol(idolKey);
	},

	equipDharmaIdol: function(idolKey, slotType){
		if (!this.immortalAscended){ return false; }
		this.dharmaIdols = this.normalizeDharmaIdols(this.dharmaIdols);
		var def = this.getDharmaIdolDef(idolKey);
		if (!def || (this.dharmaIdols.levels[idolKey] || 0) <= 0){ return false; }
		var role = (slotType === "support") ? "support" : "primary";
		if (role === "support"){
			if (this.dharmaIdols.primaryKey === idolKey){
				this.dharmaIdols.primaryKey = this.dharmaIdols.supportKey || null;
			}
			this.dharmaIdols.supportKey = idolKey;
		} else {
			if (this.dharmaIdols.supportKey === idolKey){
				this.dharmaIdols.supportKey = this.dharmaIdols.primaryKey || null;
			}
			this.dharmaIdols.primaryKey = idolKey;
		}
		if (this.game.updateCaches){ this.game.updateCaches(); }
		var isEn = String($I("cultivation.zixiao.panel.badge") || "").indexOf("Immortal") === 0;
		this.dharmaIdols.lastNote = isEn
			? ("Equipped [" + $I(def.labelKey) + "] as " + (role === "primary" ? "Primary" : "Support") + " Dharma Idol.")
			: ("【法相归位】已将【" + $I(def.labelKey) + "】设为" + (role === "primary" ? "【本命主法相】" : "【护道辅法相】") + "。");
		return true;
	},

	cleanseWithSamsaraLotus: function(){
		if (!this.immortalAscended || !this.dharmaIdols){ return false; }
		var lv = (this.dharmaIdols.levels && this.dharmaIdols.levels.samsaraLotus) || 0;
		if (lv <= 0){ return false; }
		if ((this.heartDemon || 0) <= 0 && (this.pillToxicity || 0) <= 0){ return false; }
		var clr = 15 + lv * 8;
		this.heartDemon = Math.max(0, (this.heartDemon || 0) - clr);
		this.pillToxicity = Math.max(0, (this.pillToxicity || 0) - clr);
		if (this.game.updateCaches){ this.game.updateCaches(); }
		return true;
	},

	getImmortalCaveBonuses: function(riftFloorOpt){
		var imp = Math.max(0, Math.min(10, Math.floor(this.immortalImprint || 0)));
		var out = {
			combatMult: 1 + imp * 0.05,
			xiuweiRatio: imp * 0.06,
			realmProductionRatio: 0,
			zhenyuanRatio: 0,
			xianyuanBase: 0,
			xianyuanRatio: 0,
			toxReduction: 0,
			detoxSpeed: 0,
			gentleDetoxBonus: 0,
			alchemyYieldChance: 0,
			alchemyCritBonus: 0,
			alchemyExtraXy: 0,
			pillPotencyBonus: 0,
			herbSpeedBonus: 0,
			herbYieldBonus: 0,
			infuseExtraXy: 0,
			daoLawDiscount: 0,
			riftHpMult: 1,
			riftDmgMult: 1,
			riftDefIgnore: 0,
			riftShieldBreakBonus: 0,
			riftUltBonus: 0,
			riftCritChance: 0,
			riftCritDmgBonus: 0,
			trueFireBreak: 0,
			riftMitigation: 0,
			riftPierceMitigation: 0,
			riftBossExecuteRatio: 0,
			dharmaGiantCrushRatio: 0,
			dharmaCloneStrikeRatio: 0,
			dharmaSwordExecuteRatio: 0,
			dharmaLotusRegenRatio: 0,
			dharmaNirvanaRatio: 0,
			startShieldRatio: 0,
			counterDmgBonus: 0,
			counterMpGain: 0,
			riftXyBonus: 0,
			bountySpeedBonus: 0,
			heartDemonDecayBonus: 0,
			lifespanBonus: 0
		};
		if (!this.immortalAscended){
			return out;
		}
		var g = this.herbGarden;
		if (g){
			var arrLv = Math.max(1, g.arrayLevel || 1);
			out.xianyuanBase += (arrLv - 1) * 0.015;
			var stXianlan = (g.stock && g.stock.xianlan) || 0;
			var hvXianlan = (g.harvestCount && g.harvestCount.xianlan) || 0;
			if (stXianlan > 0 || hvXianlan > 0){
				out.toxReduction += 0.15;
				out.detoxSpeed += 0.35;
				out.gentleDetoxBonus += 3;
			}
			var stZizhi = (g.stock && g.stock.zizhi) || 0;
			var hvZizhi = (g.harvestCount && g.harvestCount.zizhi) || 0;
			if (stZizhi > 0 || hvZizhi > 0){
				out.pillPotencyBonus += 0.20;
				out.alchemyCritBonus += 0.12;
				out.alchemyYieldChance += 0.10;
			}
			if (this.buffs && this.buffs.herbPotency > 0){
				out.pillPotencyBonus += 0.15;
				out.alchemyYieldChance += 0.12;
			}
			var stQinglian = (g.stock && g.stock.qinglian) || 0;
			var hvQinglian = (g.harvestCount && g.harvestCount.qinglian) || 0;
			if (stQinglian > 0 || hvQinglian > 0){
				out.xianyuanBase += Math.min(0.10, 0.03 + stQinglian * 0.01);
				out.xiuweiRatio += 0.20;
			}
			var stDaoguo = (g.stock && g.stock.daoguo) || 0;
			var hvDaoguo = (g.harvestCount && g.harvestCount.daoguo) || 0;
			if (stDaoguo > 0 || hvDaoguo > 0){
				out.xianyuanBase += 0.05;
				out.realmProductionRatio += 0.15;
			}
			if (g.daoDiscountStacks > 0){
				out.daoLawDiscount += Math.min(0.45, g.daoDiscountStacks * 0.15);
			}
		}

		var xq = this.xianqi;
		if (xq && xq.boundKey && xq.stage > 0){
			var stg = xq.stage;
			var nMult = 1 + Math.min(0.20, (xq.nurtureExp || 0) * 0.002);
			var isHighRift = (typeof riftFloorOpt === "number" && riftFloorOpt >= 26);
			var riftScale = isHighRift ? 1.0 : 0.5;

			out.combatMult *= (1 + stg * 0.12 * nMult);
			out.xianyuanRatio += stg * 0.05 * nMult;
			out.riftXyBonus += stg * 0.06;

			if (xq.boundKey === "sword"){
				if (stg >= 1){
					out.combatMult *= 1.25;
					out.riftDmgMult *= (1 + 0.18 * riftScale * nMult);
				}
				if (stg >= 3){
					if (isHighRift){ out.riftDefIgnore = 0.25; }
					out.riftShieldBreakBonus += 0.22;
					out.xianyuanBase += 0.03;
				}
				if (stg >= 5){
					out.riftUltBonus += 0.35 * riftScale;
					out.combatMult *= 1.30;
					out.xianyuanRatio += 0.20;
				}
			} else if (xq.boundKey === "cauldron"){
				if (stg >= 1){
					out.alchemyCritBonus += 0.15;
					out.alchemyYieldChance += 0.15;
					out.toxReduction += 0.25;
				}
				if (stg >= 3){
					out.alchemyYieldChance += 0.25;
					out.alchemyExtraXy += 2;
					out.pillPotencyBonus += 0.25;
				}
				if (stg >= 5){
					out.herbSpeedBonus += 0.30;
					out.realmProductionRatio += 0.35;
					out.xianyuanBase += 0.05;
				}
			} else if (xq.boundKey === "mirror"){
				if (stg >= 1){
					out.riftMitigation += 0.18 * riftScale;
					out.startShieldRatio += 0.18 + stg * 0.02;
				}
				if (stg >= 3){
					out.counterDmgBonus += 0.35;
					out.counterMpGain += 12;
					out.combatMult *= 1.28;
				}
				if (stg >= 5){
					out.riftMitigation += 0.14 * riftScale;
					if (isHighRift){ out.riftPierceMitigation = 0.50; }
					out.zhenyuanRatio += 0.30;
					out.xianyuanBase += 0.04;
				}
			} else if (xq.boundKey === "pagoda"){
				if (stg >= 1){
					out.xianyuanBase += 0.04;
					out.infuseExtraXy += 5 + stg;
				}
				if (stg >= 3){
					out.riftDmgMult *= (1 + 0.16 * riftScale);
					out.riftMitigation += 0.12 * riftScale;
					out.daoLawDiscount += 0.15;
				}
				if (stg >= 5){
					out.xianyuanRatio += 0.35;
					out.herbSpeedBonus += 0.25;
					out.combatMult *= 1.32;
				}
			}
		}

		var sa = this.starArray;
		var isHighRiftForArray = (typeof riftFloorOpt === "number" && riftFloorOpt >= 26);
		var arrayRiftScale = isHighRiftForArray ? 1.0 : 0.5;
		if (sa && (sa.tier || 0) > 0){
			var ztCfg = this.ZHOUTIAN_TIERS[sa.tier] || this.ZHOUTIAN_TIERS[0];
			out.xianyuanBase += ztCfg.xyBase || 0;
			out.xianyuanRatio += ztCfg.xyRatio || 0;
			out.pillPotencyBonus += ztCfg.pillPot || 0;
			out.alchemyCritBonus += ztCfg.alcCrit || 0;
			out.alchemyYieldChance += ztCfg.alcYield || 0;
			out.combatMult *= (1 + sa.tier * 0.08);
			out.riftDmgMult *= (1 + (ztCfg.riftDmg || 0) * arrayRiftScale);
			out.riftMitigation += (ztCfg.riftMit || 0) * arrayRiftScale;
			out.riftXyBonus += sa.tier * 0.05;

			for (var si2 = 0; si2 < 3; si2++){
				var sKey = sa.sockets && sa.sockets[si2];
				if (!sKey){ continue; }
				var scDef = this.getStarCoreDef(sKey);
				if (!scDef){ continue; }
				if (scDef.xyBase){ out.xianyuanBase += scDef.xyBase; }
				if (scDef.xyRatio){ out.xianyuanRatio += scDef.xyRatio; }
				if (scDef.xwRatio){ out.xiuweiRatio += scDef.xwRatio; }
				if (scDef.daoDisc){ out.daoLawDiscount += scDef.daoDisc; }
				if (scDef.combatMult){ out.combatMult *= (1 + scDef.combatMult); }
				if (scDef.riftDmg){ out.riftDmgMult *= (1 + scDef.riftDmg * arrayRiftScale); }
				if (scDef.shieldBreak){ out.riftShieldBreakBonus += scDef.shieldBreak; }
				if (scDef.alcCrit){ out.alchemyCritBonus += scDef.alcCrit; }
				if (scDef.alcYield){ out.alchemyYieldChance += scDef.alcYield; }
				if (scDef.riftMit){ out.riftMitigation += scDef.riftMit * arrayRiftScale; }
				if (scDef.startShield){ out.startShieldRatio += scDef.startShield; }
				if (scDef.pillPot){ out.pillPotencyBonus += scDef.pillPot; }
				if (scDef.toxRed){ out.toxReduction += scDef.toxRed; }
				if (scDef.herbSpd){ out.herbSpeedBonus += scDef.herbSpd; }
			}

			if (this.hasTriStarHarmony()){
				out.xianyuanRatio += 0.20;
				out.combatMult *= 1.20;
				out.pillPotencyBonus += 0.15;
				out.riftDmgMult *= (1 + 0.12 * arrayRiftScale);
			}
		}

		if (this.buffs && this.buffs.zhoutianSurge > 0){
			out.xianyuanRatio += 0.25;
			out.combatMult *= 1.12;
			out.riftDmgMult *= (1 + 0.15 * arrayRiftScale);
		}

		var ib = this.immortalBounty;
		if (ib && (ib.chainChapter || 1) > 1){
			var chBonus = Math.min(8, (ib.chainChapter || 1) - 1);
			out.xianyuanBase += chBonus * 0.015;
			out.xianyuanRatio += chBonus * 0.05;
			out.combatMult *= (1 + chBonus * 0.04);
		}

		// XX-6 混沌万灵仙宠育兽苑加成
		var sn = this.spiritNursery;
		if (sn && sn.beasts){
			for (var bi = 0; bi < this.PRIMORDIAL_BEASTS.length; bi++){
				var bKey = this.PRIMORDIAL_BEASTS[bi].key;
				var bState = sn.beasts[bKey];
				var bStg = (bState && bState.stage) ? bState.stage : 0;
				if (bStg <= 0){ continue; }
				var isBattleB = (sn.battleBeastKey === bKey);
				var isGardenB = (sn.gardenBeastKey === bKey);
				var roleAll = isBattleB ? 1.35 : (isGardenB ? 1.35 : 0.55);
				var roleBattle = isBattleB ? 1.45 : (isGardenB ? 0.85 : 0.50);
				var roleGarden = isGardenB ? 1.50 : (isBattleB ? 0.90 : 0.55);

				if (bKey === "azure_dragon"){
					out.xianyuanBase += 0.025 * bStg * roleGarden;
					out.xianyuanRatio += 0.09 * bStg * roleAll;
					out.herbSpeedBonus += 0.12 * bStg * roleGarden;
					out.herbYieldBonus += 0.08 * bStg * roleGarden;
				} else if (bKey === "vermilion_bird"){
					out.pillPotencyBonus += 0.08 * bStg * roleAll;
					out.alchemyCritBonus += 0.05 * bStg * roleAll;
					out.alchemyYieldChance += 0.04 * bStg * roleAll;
					out.riftDefIgnore = Math.min(0.58, out.riftDefIgnore + 0.06 * bStg * roleBattle * arrayRiftScale);
					out.riftShieldBreakBonus += 0.07 * bStg * roleBattle;
					out.riftDmgMult *= (1 + 0.05 * bStg * roleBattle * arrayRiftScale);
					if (isHighRiftForArray && (isBattleB || bStg >= 2)){
						out.trueFireBreak = 1;
					}
				} else if (bKey === "black_tortoise"){
					out.startShieldRatio += 0.05 * bStg * roleBattle;
					out.riftMitigation += 0.035 * bStg * roleBattle * arrayRiftScale;
					if (isHighRiftForArray && bStg >= 3){
						out.riftPierceMitigation = Math.max(out.riftPierceMitigation, Math.min(0.65, 0.15 + bStg * 0.06));
					}
					out.heartDemonDecayBonus += 0.35 * bStg * roleAll;
					out.lifespanBonus += Math.round(650 * bStg * roleGarden);
				} else if (bKey === "white_tiger"){
					out.combatMult *= (1 + 0.085 * bStg * roleBattle);
					out.riftDmgMult *= (1 + 0.065 * bStg * roleBattle * arrayRiftScale);
					out.riftCritChance += 0.045 * bStg * roleBattle * arrayRiftScale;
					out.riftUltBonus += 0.05 * bStg * roleBattle * arrayRiftScale;
					out.bountySpeedBonus += 0.09 * bStg * roleAll;
				}
			}

			var minFourStg = this.getFourSymbolsMinStage();
			if (minFourStg > 0){
				out.xianyuanBase += 0.06 + minFourStg * 0.02;
				out.xianyuanRatio += 0.24 + minFourStg * 0.06;
				out.combatMult *= (1.20 + minFourStg * 0.05);
				out.herbSpeedBonus += 0.22 + minFourStg * 0.04;
				out.herbYieldBonus += 0.15;
				out.pillPotencyBonus += 0.16 + minFourStg * 0.03;
				out.riftDmgMult *= (1 + (0.15 + minFourStg * 0.03) * arrayRiftScale);
				out.riftMitigation += (0.05 + minFourStg * 0.01) * arrayRiftScale;
				out.bountySpeedBonus += 0.20;
			}
		}

		// XX-6 大道法则碑林参悟与碑林共鸣加成
		var sf = this.daoSteleForest;
		if (sf && sf.levels){
			var lvSp = sf.levels.spacetime || 0;
			if (lvSp > 0){
				out.xianyuanBase += 0.025 * lvSp;
				out.xianyuanRatio += 0.08 * lvSp;
				out.bountySpeedBonus += 0.06 * lvSp;
			}
			var lvCr = sf.levels.creation || 0;
			if (lvCr > 0){
				out.herbSpeedBonus += 0.10 * lvCr;
				out.realmProductionRatio += 0.12 * lvCr;
				out.lifespanBonus += 500 * lvCr;
			}
			var lvSw = sf.levels.sword_dao || 0;
			if (lvSw > 0){
				out.combatMult *= (1 + 0.09 * lvSw);
				out.riftDmgMult *= (1 + 0.07 * lvSw * arrayRiftScale);
				out.riftShieldBreakBonus += 0.06 * lvSw;
			}
			var lvAl = sf.levels.alchemy_origin || 0;
			if (lvAl > 0){
				out.pillPotencyBonus += 0.09 * lvAl;
				out.alchemyCritBonus += 0.04 * lvAl;
				out.toxReduction += 0.04 * lvAl;
				out.detoxSpeed += 0.12 * lvAl;
			}
			var lvAs = sf.levels.astral || 0;
			if (lvAs > 0){
				out.xianyuanRatio += 0.07 * lvAs;
				out.xiuweiRatio += 0.14 * lvAs;
			}
			var lvSa = sf.levels.samsara || 0;
			if (lvSa > 0){
				out.daoLawDiscount += 0.04 * lvSa;
				out.heartDemonDecayBonus += 0.22 * lvSa;
				out.zhenyuanRatio += 0.08 * lvSa;
				out.combatMult *= (1 + 0.05 * lvSa);
			}

			var steleTier = this.getSteleResonanceTier();
			if (steleTier >= 1){
				out.xianyuanBase += 0.05;
				out.xianyuanRatio += 0.18;
				out.combatMult *= 1.16;
				out.xiuweiRatio += 0.20;
			}
			if (steleTier >= 2){
				out.xianyuanBase += 0.09;
				out.xianyuanRatio += 0.30;
				out.combatMult *= 1.24;
				out.riftDmgMult *= (1 + 0.15 * arrayRiftScale);
				out.pillPotencyBonus += 0.15;
			}
			if (steleTier >= 3){
				out.xianyuanBase += 0.15;
				out.xianyuanRatio += 0.48;
				out.combatMult *= 1.35;
				out.riftDmgMult *= (1 + 0.22 * arrayRiftScale);
				out.riftMitigation += 0.08 * arrayRiftScale;
				out.realmProductionRatio += 0.35;
			}
		}

		// XX-7 诸天星域游历飞舟（太虚星槎）与三大太古星域赐福加成
		var ss = this.starship;
		if (ss && (ss.vesselTier || 0) > 0){
			var vTier = ss.vesselTier;
			var vCfg = this.getVesselTierDef(vTier);
			out.xianyuanBase += vCfg.xyBase || 0;
			out.xianyuanRatio += vCfg.xyRatio || 0;
			out.startShieldRatio += vCfg.shieldBonus || 0;
			out.combatMult *= (1 + vTier * 0.07);
			out.bountySpeedBonus += vTier * 0.05;

			var rm = ss.realmMastery || {};
			var mZw = rm.ziwei || 0;
			var curZw = (ss.selectedRealm === "ziwei");
			if (mZw > 0 || curZw){
				out.xianyuanBase += 0.03 * mZw + (curZw ? 0.04 : 0);
				out.xianyuanRatio += 0.09 * mZw + (curZw ? 0.14 : 0);
			}
			var mBj = rm.beiju || 0;
			var curBj = (ss.selectedRealm === "beiju");
			if (mBj > 0 || curBj){
				out.herbSpeedBonus += 0.11 * mBj + (curBj ? 0.18 : 0);
				out.herbYieldBonus += 0.04 * mBj + (curBj ? 0.08 : 0);
				out.realmProductionRatio += 0.06 * mBj;
			}
			var mGx = rm.guixu || 0;
			var curGx = (ss.selectedRealm === "guixu");
			if (mGx > 0 || curGx){
				out.combatMult *= (1 + 0.045 * mGx + (curGx ? 0.08 : 0));
				out.riftDmgMult *= (1 + (0.045 * mGx + (curGx ? 0.10 : 0)) * arrayRiftScale);
				out.riftDefIgnore = Math.min(0.82, out.riftDefIgnore + (0.02 * mGx + (curGx ? 0.04 : 0)) * arrayRiftScale);
				out.riftMitigation += (0.018 * mGx + (curGx ? 0.04 : 0)) * arrayRiftScale;
			}
		}

		// XX-7 混沌鸿蒙灵宝祭坛与三宝鸿蒙开天共鸣（1 / 3 / 6 阶里程碑）加成
		var ha = this.hongmengAltar;
		if (ha && ha.treasures){
			var tKt = ha.treasures.kaitianSeal || 0;
			if (tKt > 0){
				out.combatMult *= (1 + 0.14 * tKt);
				out.riftDmgMult *= (1 + 0.09 * tKt * arrayRiftScale);
				out.riftDefIgnore = Math.min(0.82, out.riftDefIgnore + 0.045 * tKt * arrayRiftScale);
				out.riftShieldBreakBonus += 0.08 * tKt;
				if (isHighRiftForArray){
					out.riftBossExecuteRatio += 0.02 * tKt;
				}
			}
			var tZh = ha.treasures.zaohuaJade || 0;
			if (tZh > 0){
				out.xiuweiRatio += 0.24 * tZh;
				out.zhenyuanRatio += 0.06 * tZh;
				out.xianyuanRatio += 0.11 * tZh;
				out.xianyuanBase += 0.03 * tZh;
				out.pillPotencyBonus += 0.10 * tZh;
				out.alchemyCritBonus += 0.05 * tZh;
				out.alchemyYieldChance += 0.05 * tZh;
				out.daoLawDiscount += 0.03 * tZh;
				out.herbSpeedBonus += 0.08 * tZh;
			}
			var tXh = ha.treasures.xuanhuangPagoda || 0;
			if (tXh > 0){
				out.riftMitigation += 0.04 * tXh * arrayRiftScale;
				out.startShieldRatio += 0.06 * tXh;
				if (isHighRiftForArray){
					out.riftPierceMitigation = Math.max(out.riftPierceMitigation, Math.min(0.75, 0.18 + 0.07 * tXh));
				}
				out.heartDemonDecayBonus += 0.30 * tXh;
				out.lifespanBonus += 800 * tXh;
			}

			var hmResTier = this.getHongmengResonanceTier();
			if (hmResTier >= 1){
				out.combatMult *= 1.22;
				out.xiuweiRatio += 0.30;
				out.xianyuanRatio += 0.22;
				out.pillPotencyBonus += 0.15;
				out.alchemyCritBonus += 0.06;
				out.riftDefIgnore = Math.min(0.82, out.riftDefIgnore + 0.06 * arrayRiftScale);
				out.riftMitigation += 0.05 * arrayRiftScale;
				if (isHighRiftForArray){ out.riftBossExecuteRatio += 0.05; }
			}
			if (hmResTier >= 2){
				out.combatMult *= 1.30;
				out.xiuweiRatio += 0.45;
				out.xianyuanRatio += 0.35;
				out.pillPotencyBonus += 0.22;
				out.alchemyCritBonus += 0.08;
				out.riftDefIgnore = Math.min(0.82, out.riftDefIgnore + 0.08 * arrayRiftScale);
				out.riftMitigation += 0.06 * arrayRiftScale;
				if (isHighRiftForArray){ out.riftBossExecuteRatio += 0.05; }
			}
			if (hmResTier >= 3){
				out.combatMult *= 1.45;
				out.xiuweiRatio += 0.75;
				out.xianyuanBase += 0.18;
				out.xianyuanRatio += 0.55;
				out.pillPotencyBonus += 0.32;
				out.alchemyCritBonus += 0.10;
				out.realmProductionRatio += 0.40;
				out.riftDefIgnore = Math.min(0.85, out.riftDefIgnore + 0.10 * arrayRiftScale);
				out.riftMitigation += 0.08 * arrayRiftScale;
				if (isHighRiftForArray){ out.riftBossExecuteRatio += 0.06; }
			}
		}

		// XX-8 混沌紫霄讲道坛悟道真解与三千大道神通法相（主辅法相 + 四相混元证道共鸣 4/12/24）
		var za = this.zixiaoAltar;
		if (za && ((za.tier || 0) > 0 || (za.comprehension || 0) > 0)){
			var zxAura = this.getZixiaoAuraBonuses();
			out.xianyuanBase += zxAura.xyBase || 0;
			out.xianyuanRatio += zxAura.xyRatio || 0;
			out.xiuweiRatio += zxAura.xiuweiRatio || 0;
			out.herbSpeedBonus += zxAura.herbSpeed || 0;
			out.herbYieldBonus += zxAura.herbYield || 0;
			out.daoLawDiscount += (za.tier || 0) * 0.025;
			out.combatMult *= (1 + (za.tier || 0) * 0.06);
		}

		var dm = this.dharmaIdols;
		var dharmaTotalLv = this.getDharmaTotalLevel();
		var dharmaResTier = this.getDharmaResonanceTier();
		if (dm && dm.levels && dharmaTotalLv > 0){
			var lvGiant = dm.levels.cosmicGiant || 0;
			if (lvGiant > 0){
				var wGiant = this.getDharmaSlotWeight("cosmicGiant");
				var eGiant = lvGiant * wGiant;
				out.combatMult *= (1 + 0.15 * eGiant);
				out.riftHpMult *= (1 + 0.18 * eGiant);
				out.riftDefIgnore = Math.min(0.88, out.riftDefIgnore + 0.045 * eGiant * arrayRiftScale);
				out.riftShieldBreakBonus += 0.10 * eGiant;
				out.dharmaGiantCrushRatio += 0.045 * eGiant;
			}
			var lvPure = dm.levels.threePure || 0;
			if (lvPure > 0){
				var wPure = this.getDharmaSlotWeight("threePure");
				var ePure = lvPure * wPure;
				out.xiuweiRatio += 0.26 * ePure;
				out.zhenyuanRatio += 0.07 * ePure;
				out.pillPotencyBonus += 0.11 * ePure;
				out.alchemyCritBonus += 0.05 * ePure;
				out.alchemyYieldChance += 0.06 * ePure;
				out.detoxSpeed += 0.15 * ePure;
				out.bountySpeedBonus += 0.09 * ePure;
				out.dharmaCloneStrikeRatio += 0.16 * ePure;
			}
			var lvZhuxian = dm.levels.zhuxianSwords || 0;
			if (lvZhuxian > 0){
				var wZhuxian = this.getDharmaSlotWeight("zhuxianSwords");
				var eZhuxian = lvZhuxian * wZhuxian;
				out.combatMult *= (1 + 0.16 * eZhuxian);
				out.riftDmgMult *= (1 + 0.10 * eZhuxian * arrayRiftScale);
				out.riftCritChance += 0.05 * eZhuxian;
				out.riftCritDmgBonus += 0.16 * eZhuxian;
				out.riftUltBonus += 0.08 * eZhuxian * arrayRiftScale;
				if (isHighRiftForArray){
					var swordExec = 0.03 * eZhuxian;
					out.dharmaSwordExecuteRatio += swordExec;
					out.riftBossExecuteRatio += swordExec;
				}
			}
			var lvLotus = dm.levels.samsaraLotus || 0;
			if (lvLotus > 0){
				var wLotus = this.getDharmaSlotWeight("samsaraLotus");
				var eLotus = lvLotus * wLotus;
				out.riftMitigation += 0.045 * eLotus * arrayRiftScale;
				out.startShieldRatio += 0.07 * eLotus;
				if (isHighRiftForArray){
					out.riftPierceMitigation = Math.max(out.riftPierceMitigation, Math.min(0.82, 0.20 + 0.07 * eLotus));
				}
				out.heartDemonDecayBonus += 0.40 * eLotus;
				out.lifespanBonus += Math.round(900 * eLotus);
				out.dharmaLotusRegenRatio += 0.015 * eLotus;
				out.dharmaNirvanaRatio = Math.min(0.75, 0.24 + 0.06 * eLotus);
			}

			if (dharmaResTier >= 1){
				out.combatMult *= 1.24;
				out.riftHpMult *= 1.15;
				out.xiuweiRatio += 0.32;
				out.xianyuanRatio += 0.24;
				out.herbSpeedBonus += 0.15;
				out.riftCritDmgBonus += 0.18;
				out.riftDefIgnore = Math.min(0.88, out.riftDefIgnore + 0.06 * arrayRiftScale);
				out.riftMitigation += 0.05 * arrayRiftScale;
				if (isHighRiftForArray){ out.riftBossExecuteRatio += 0.04; }
				if (out.dharmaNirvanaRatio > 0){ out.dharmaNirvanaRatio = Math.min(0.78, out.dharmaNirvanaRatio + 0.06); }
			}
			if (dharmaResTier >= 2){
				out.combatMult *= 1.32;
				out.riftHpMult *= 1.20;
				out.xiuweiRatio += 0.48;
				out.xianyuanRatio += 0.38;
				out.herbSpeedBonus += 0.22;
				out.riftCritDmgBonus += 0.24;
				out.riftDefIgnore = Math.min(0.88, out.riftDefIgnore + 0.08 * arrayRiftScale);
				out.riftMitigation += 0.06 * arrayRiftScale;
				if (isHighRiftForArray){ out.riftBossExecuteRatio += 0.05; }
				if (out.dharmaNirvanaRatio > 0){ out.dharmaNirvanaRatio = Math.min(0.82, out.dharmaNirvanaRatio + 0.08); }
			}
			if (dharmaResTier >= 3){
				out.combatMult *= 1.48;
				out.riftHpMult *= 1.28;
				out.xiuweiRatio += 0.80;
				out.xianyuanBase += 0.22;
				out.xianyuanRatio += 0.60;
				out.realmProductionRatio += 0.45;
				out.herbSpeedBonus += 0.30;
				out.riftCritDmgBonus += 0.32;
				out.riftDefIgnore = Math.min(0.90, out.riftDefIgnore + 0.10 * arrayRiftScale);
				out.riftMitigation += 0.08 * arrayRiftScale;
				if (isHighRiftForArray){ out.riftBossExecuteRatio += 0.07; }
				if (out.dharmaNirvanaRatio > 0){ out.dharmaNirvanaRatio = Math.min(0.85, out.dharmaNirvanaRatio + 0.10); }
			}
		}

		var hasHighSanctum = !!((sa && (sa.tier || 0) > 0) || this.getHatchedBeastCount() > 0 || this.getTotalSteleComprehension() > 0 || (ss && (ss.vesselTier || 0) > 0) || this.getHongmengTotalTier() > 0 || (za && (za.tier || 0) > 0) || dharmaTotalLv > 0);
		var hasHongmengApex = (this.getHongmengResonanceTier() > 0);
		var hasDharmaApex = (dharmaTotalLv > 0);
		out.toxReduction = Math.min(hasDharmaApex ? 0.88 : (hasHongmengApex ? 0.85 : (hasHighSanctum ? 0.80 : 0.60)), out.toxReduction);
		out.riftMitigation = Math.min(hasDharmaApex ? 0.84 : (hasHongmengApex ? 0.78 : (hasHighSanctum ? 0.70 : 0.45)), out.riftMitigation);
		out.daoLawDiscount = Math.min(hasDharmaApex ? 0.80 : (hasHongmengApex ? 0.75 : (hasHighSanctum ? 0.72 : 0.55)), out.daoLawDiscount);
		out.riftBossExecuteRatio = Math.min(hasDharmaApex ? 0.48 : 0.32, out.riftBossExecuteRatio);
		return out;
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
			battle: this.battle || null,
			pillToxicity: this.pillToxicity || 0,
			cauldronFire: this.cauldronFire || "gentle",
			alchemyExp: this.alchemyExp || 0,
			supremePills: this.supremePills || {},
			pillCraftCount: this.pillCraftCount || {},
			immortalAscended: !!this.immortalAscended,
			daoyun: this.daoyun || 0,
			herbGarden: this.herbGarden ? this.normalizeHerbGarden(this.herbGarden) : undefined,
			xianqi: this.xianqi ? this.normalizeXianqi(this.xianqi) : undefined,
			starArray: this.starArray ? this.normalizeStarArray(this.starArray) : undefined,
			immortalBounty: this.immortalBounty ? this.normalizeImmortalBounty(this.immortalBounty) : undefined,
			spiritNursery: this.spiritNursery ? this.normalizeSpiritNursery(this.spiritNursery) : undefined,
			daoSteleForest: this.daoSteleForest ? this.normalizeDaoSteleForest(this.daoSteleForest) : undefined,
			starship: this.starship ? this.normalizeStarship(this.starship) : undefined,
			hongmengAltar: this.hongmengAltar ? this.normalizeHongmengAltar(this.hongmengAltar) : undefined,
			zixiaoAltar: this.zixiaoAltar ? this.normalizeZixiaoAltar(this.zixiaoAltar) : undefined,
			dharmaIdols: this.dharmaIdols ? this.normalizeDharmaIdols(this.dharmaIdols) : undefined,
			immortalImprint: this.immortalImprint || 0,
			xianqiImprintKey: this.xianqiImprintKey || undefined,
			starImprintTier: this.starImprintTier || 0,
			beastImprintTier: this.beastImprintTier || 0,
			hongmengImprintTier: this.hongmengImprintTier || 0,
			dharmaImprintTier: this.dharmaImprintTier || 0,
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
			mingge: (this.mingge && this.mingge.length) ? this.mingge.slice(0, 3) : undefined,
			pendingMingge: (this.pendingMingge && this.pendingMingge.length) ? this.pendingMingge.slice(0, 3) : undefined,
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
		this.mingge = (c.mingge && c.mingge.length) ? this.normalizeMinggeList(c.mingge, 3) : [];
		this.pendingMingge = (c.pendingMingge && c.pendingMingge.length) ? this.normalizeMinggeList(c.pendingMingge, 3) : [];
		if (c.identity){ this.identity = c.identity; }
		this.applyOrigin();
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
		if (c.battle && typeof c.battle == "object"){
			this.battle = c.battle;
		}
		if (typeof c.pillToxicity == "number"){
			this.pillToxicity = Math.min(100, Math.max(0, c.pillToxicity));
		}
		if (typeof c.cauldronFire == "string"){
			this.setCauldronFire(c.cauldronFire);
		}
		if (typeof c.alchemyExp == "number"){
			this.alchemyExp = Math.max(0, Math.floor(c.alchemyExp));
		}
		if (c.supremePills && typeof c.supremePills == "object"){
			this.supremePills = c.supremePills;
		}
		if (c.pillCraftCount && typeof c.pillCraftCount == "object"){
			this.pillCraftCount = c.pillCraftCount;
		}
		if (typeof c.immortalAscended == "boolean"){
			this.immortalAscended = c.immortalAscended;
		}
		if (typeof c.daoyun == "number"){
			this.daoyun = Math.max(0, Math.floor(c.daoyun));
		}
		this.herbGarden = this.normalizeHerbGarden(c.herbGarden);
		this.xianqi = this.normalizeXianqi(c.xianqi);
		this.starArray = this.normalizeStarArray(c.starArray);
		this.immortalBounty = this.normalizeImmortalBounty(c.immortalBounty);
		this.spiritNursery = this.normalizeSpiritNursery(c.spiritNursery);
		this.daoSteleForest = this.normalizeDaoSteleForest(c.daoSteleForest);
		this.starship = this.normalizeStarship(c.starship);
		this.hongmengAltar = this.normalizeHongmengAltar(c.hongmengAltar);
		this.zixiaoAltar = this.normalizeZixiaoAltar(c.zixiaoAltar);
		this.dharmaIdols = this.normalizeDharmaIdols(c.dharmaIdols);
		this.immortalImprint = (typeof c.immortalImprint === "number" && isFinite(c.immortalImprint))
			? Math.min(10, Math.max(0, Math.floor(c.immortalImprint)))
			: 0;
		this.xianqiImprintKey = (typeof c.xianqiImprintKey === "string" && this.getImmortalArtifactDef(c.xianqiImprintKey))
			? c.xianqiImprintKey
			: null;
		this.starImprintTier = (typeof c.starImprintTier === "number" && isFinite(c.starImprintTier))
			? Math.min(6, Math.max(0, Math.floor(c.starImprintTier)))
			: 0;
		this.beastImprintTier = (typeof c.beastImprintTier === "number" && isFinite(c.beastImprintTier))
			? Math.min(6, Math.max(0, Math.floor(c.beastImprintTier)))
			: 0;
		this.hongmengImprintTier = (typeof c.hongmengImprintTier === "number" && isFinite(c.hongmengImprintTier))
			? Math.min(6, Math.max(0, Math.floor(c.hongmengImprintTier)))
			: 0;
		this.dharmaImprintTier = (typeof c.dharmaImprintTier === "number" && isFinite(c.dharmaImprintTier))
			? Math.min(6, Math.max(0, Math.floor(c.dharmaImprintTier)))
			: 0;
		if (!c.starship && this.hongmengImprintTier > 0 && (this.starship.totalQiHarvested || 0) === 0 && (this.starship.hongmengQi || 0) === 0){
			var loadStartQi = this.getHongmengStartingQi();
			this.starship.hongmengQi = loadStartQi;
			this.starship.totalQiHarvested = loadStartQi;
		}
		if (!c.zixiaoAltar && this.dharmaImprintTier > 0 && (this.zixiaoAltar.totalSutrasCondensed || 0) === 0 && (this.zixiaoAltar.daoSutras || 0) === 0){
			var loadStartSutras = this.getDharmaStartingSutras();
			this.zixiaoAltar.daoSutras = loadStartSutras;
			this.zixiaoAltar.totalSutrasCondensed = loadStartSutras;
		}
		this.syncDaoSutras();
		if (typeof c.soundMuted == "boolean"){ this.soundMuted = c.soundMuted; }
		if (typeof c.demonWarned == "boolean"){ this.demonWarned = c.demonWarned; }
		if (typeof c.sihuaCount == "number"){ this.sihuaCount = Math.max(0, c.sihuaCount); }
		if (typeof c.failStreak == "number"){ this.failStreak = Math.max(0, c.failStreak); }
		if (typeof c.failStreakStage == "string"){ this.failStreakStage = c.failStreakStage; }
		this.syncRealmUnlocks();
	},

	update: function(){
		//the realm tab is the heart of this mod; never let it stay hidden
		var tab = this.game.getTab("cultivation");
		if (tab && !tab.visible){
			tab.visible = true;
		}
		this.syncRealmUnlocks();

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
		var csDecayMult = this.hasMingge("changsheng") ? 2 : 1;
		if (this.heartDemon > 0){
			var decay = 0.03 * (this.getFate("nangong").researched ? 3 : 1);
			var lamp = this.getArtifact("yanghun");
			if (lamp && lamp.researched){ decay += 0.02 * lamp.rank; }
			var caveDemon = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
			var demonCalmMult = (1 + ((caveDemon && caveDemon.heartDemonDecayBonus) || 0)) * (1 + Math.max(0, Math.floor(this.dharmaImprintTier || 0)) * 0.08);
			this.heartDemon = Math.max(0, this.heartDemon - decay * csDecayMult * demonCalmMult);
		}
		if (this.pillToxicity > 0){
			var caveDetox = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
			var herbDetoxMult = 1 + ((caveDetox && caveDetox.detoxSpeed) || 0);
			var toxDecay = 0.02 * (this.getAlchemyRank().detoxMult || 1) * (this.secluded ? 2 : 1) * csDecayMult * herbDetoxMult;
			this.pillToxicity = Math.max(0, this.pillToxicity - toxDecay);
		}
		if (this.immortalAscended){
			var immortalStep = 1 + this.game.timeAccelerationRatio();
			this.tickHerbGarden(immortalStep);
			this.tickStarArray(immortalStep);
			this.tickImmortalBounty(immortalStep);
			this.tickSpiritNursery(immortalStep);
			this.tickStarship(immortalStep);
			this.tickZixiaoAltar(immortalStep);
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
		if (this.battle && this.battle.active && this.battle.autoFlow){
			this.battle.castTick = (this.battle.castTick || 0) + 1;
			if (this.battle.castTick >= (this.battle.castMax || 10)){
				this.battle.castTick = 0;
				this.executeBattleTurn(this.pickBestCombatSkill());
			}
		}
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
			add("xiuweiRatio", this.SECLUSION_XIUWEI + (this.hasMingge("changsheng") ? 0.25 : 0));
			add("seclusionMundaneRatio", this.SECLUSION_MUNDANE);	//只压凡俗,不伤修为
		}
		var caveEff = this.getImmortalCaveBonuses ? this.getImmortalCaveBonuses(0) : null;
		var pPot = 1 + ((caveEff && caveEff.pillPotencyBonus) || 0);
		if (this.buffs.juqi > 0){
			var juqiMult = ((this.buffs.juqiSupreme > 0) ? 1.35 : this.getPillRealmEfficacy("juqi")) * pPot;
			add("xiuweiRatio", 1.0 * juqiMult);
		}
		if (this.buffs.ziqi > 0){
			add("xiuweiRatio", 0.5);	//上上签·紫气东来
		}
		if (this.buffs.jiangchen > 0){
			add("xiuweiRatio", 0.35 * this.getPillRealmEfficacy("jiangchen") * pPot);	//降尘丹周天运转
		}
		if (this.buffs.biyan > 0){
			var byMult = ((this.buffs.biyanSupreme > 0) ? 1.25 : 1.0) * pPot;
			add("xiuweiRatio", 0.50 * byMult);	//碧焰酒青莲灵火
			add("realmProductionRatio", 0.25 * byMult);
		}
		var alcRank = this.getAlchemyRank();
		if (alcRank.xiuweiRatio > 0){
			add("xiuweiRatio", alcRank.xiuweiRatio);
		}
		if (alcRank.realmProductionRatio > 0){
			add("realmProductionRatio", alcRank.realmProductionRatio);
		}
		var toxSt = this.getToxicityStatus();
		if (toxSt.xwPenalty > 0){
			add("xiuweiRatio", -toxSt.xwPenalty);	//经脉丹毒淤塞压制吐纳
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
		var springEff = this.getBeastSpringBonus ? this.getBeastSpringBonus() : null;
		if (springEff && springEff.tier > 0){
			add("xiuweiPerTickBase", springEff.xiuweiBase);
			add("xiuweiRatio", springEff.xiuweiRatio);
			add("catnipRatio", springEff.catnipRatio);
		}
		var hmDaoEff = this.getHongmengDaoBonus ? this.getHongmengDaoBonus() : null;
		if (hmDaoEff && hmDaoEff.tier > 0){
			add("xiuweiPerTickBase", hmDaoEff.xiuweiBase);
			add("xiuweiRatio", hmDaoEff.xiuweiRatio);
		}
		var dmDaoEff = this.getDharmaDaoBonus ? this.getDharmaDaoBonus() : null;
		if (dmDaoEff && dmDaoEff.tier > 0){
			add("xiuweiPerTickBase", dmDaoEff.xiuweiBase);
			add("xiuweiRatio", dmDaoEff.xiuweiRatio);
			add("zhenyuanRatio", dmDaoEff.zhenyuanRatio);
		}
		if (this.immortalAscended){
			add("xiuweiRatio", 0.50);
			add("realmProductionRatio", 0.30);
			add("xianyuanPerTickBase", 0.05);
		}
		if (this.daoyun > 0){
			add("xiuweiRatio", this.daoyun * 0.18);
			add("realmProductionRatio", this.daoyun * 0.12);
			add("xianyuanPerTickBase", this.daoyun * 0.03);
		}
		if (caveEff){
			if (caveEff.xiuweiRatio > 0){ add("xiuweiRatio", caveEff.xiuweiRatio); }
			if (caveEff.realmProductionRatio > 0){ add("realmProductionRatio", caveEff.realmProductionRatio); }
			if (caveEff.zhenyuanRatio > 0){ add("zhenyuanRatio", caveEff.zhenyuanRatio); }
			if (caveEff.xianyuanBase > 0){ add("xianyuanPerTickBase", caveEff.xianyuanBase); }
			if (caveEff.xianyuanRatio > 0){ add("xianyuanRatio", caveEff.xianyuanRatio); }
		}
		var zyEff = g["zhenyuanRatio"] || 0;
		if (zyEff > 0 && g["xiuweiPerTickBase"] > 0){
			add("xiuweiPerTickBase", g["xiuweiPerTickBase"] * zyEff * 0.25);	//高阶宗门周天真元转化修为底数
		}
	},

	//天机阁·每日一卦——每跨一年摇一签,纯手气,图个念想
	drawLot: function(){
		//凝露瓶每跨一年自动凝聚1滴绿液(上限5滴;宙光星瞳命格额外+1滴)
		var bottle = this.getFate("bottle");
		if (bottle && bottle.researched && (this.bottleDew || 0) < 5){
			var dewGain = this.hasMingge("zhenyan") ? 2 : 1;
			this.bottleDew = Math.min(5, (this.bottleDew || 0) + dewGain);
		}
		var roll = Math.random() * 100;
		if (roll < 5){	//上上签
			this.buffs.ziqi = this.game.calendar.ticksPerDay *
				this.game.calendar.daysPerSeason * this.game.calendar.seasonsPerYear;
			this.game.msg($I("cultivation.lot.ziqi"), "important");
		} else if (roll < 25){	//上签
			var amt = this.roundNice(25 * (1 + this.getCurrentRealmIndex()));
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
		this.battle = null;
		this.pillToxicity = 0;
		this.cauldronFire = "gentle";
		this.alchemyExp = 0;
		this.supremePills = {};
		this.pillCraftCount = {};
		this.lastAlchemyNote = null;
		this.immortalAscended = false;
		this.daoyun = 0;
		this.herbGarden = this.makeDefaultHerbGarden();
		this.xianqi = this.makeDefaultXianqi();
		this.starArray = this.makeDefaultStarArray();
		this.immortalBounty = this.makeDefaultImmortalBounty();
		this.spiritNursery = this.makeDefaultSpiritNursery();
		this.daoSteleForest = this.makeDefaultDaoSteleForest();
		this.starship = this.makeDefaultStarship();
		this.hongmengAltar = this.makeDefaultHongmengAltar();
		this.zixiaoAltar = this.makeDefaultZixiaoAltar();
		this.dharmaIdols = this.makeDefaultDharmaIdols();
		this.immortalImprint = 0;
		this.xianqiImprintKey = null;
		this.starImprintTier = 0;
		this.beastImprintTier = 0;
		this.hongmengImprintTier = 0;
		this.dharmaImprintTier = 0;
		this.daoSutras = 0;
		this.mingge = [];
		this.pendingMingge = [];
		this.applyOrigin();
		this.lastLotYear = this.game.calendar.year;	//转世不立刻抽签,来年再说
		this.demonWarned = false;
		this.pendingOrigin = false;	//标记由转世存档带来,不入内存态重置
		//tale/taleLog 不清——命途与纪事随仙缘一道跨转生长存
		for (var i = 0; i < this.pills.length; i++){ this.pills[i].val = 0; }	//转世丹药随身化去
		this.clearBreakFail();	//新世新身,前尘连败一笔勾销
		this.rollRoot();
		this.normalizeRealmPrices();
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
		//spirit-root priceMult & origin breakCostMult apply to realm breakthroughs only (leaving veins alone)
		if (meta && meta.name && meta.name.indexOf("_") > 0){
			var cult = this.game.cultivation;
			var mult = cult.getBreakCostMult ? cult.getBreakCostMult() : cult.getRoot().priceMult;
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
		var isMortalStart = (meta.name === "lianqi_0" && cult && cult.isMortal && cult.isMortal());
		var displayLabel = isMortalStart ? $I("cultivation.mortal.label") : meta.label;
		var label = "<div class=\"label\"><span class=\"label-content\">" + displayLabel + "</span></div>";
		if (meta.researched){
			if (isMortalStart){
				return label + "<div class=\"xx-done xx-mortal-tag\">" + $I("cultivation.mortal.btn.tag") + "</div>";
			}
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
		cult.syncRealmUnlocks();
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
			var mgBtn = el.closest ? el.closest(".xx-mingge-open") : (el.className && el.className.indexOf("xx-mingge-open") >= 0 ? el : null);
			if (mgBtn){
				cult.showReincarnationOverlay();
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
			if (cult.rift()){
				self._riftDeckSig = null;
				self.update();
			}
		});
		this.griftBtn = this.makeActionBtn(this.actionRow, "古", function(){
			if (cult.startRiftBattle("greater")){
				self._riftDeckSig = null;
				self.update();
			}
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

		//②.8 玄天秘境面板
		this.riftPanel = dojo.create("div", {className: "xxRiftPanel xxRiftArena", style: {display: "none"}}, tabContainer);
		this.riftHead = dojo.create("div", {className: "xxRiftHead", style: {display: "none"}}, this.riftPanel);
		this.riftDeck = dojo.create("div", {className: "xxRiftDeck"}, this.riftPanel);
		this.riftPower = dojo.create("div", {className: "xxRiftPower", style: {display: "none"}}, this.riftPanel);
		this.riftLadder = dojo.create("div", {className: "xxRiftLadder", style: {display: "none"}}, this.riftPanel);
		this.riftSealsEl = dojo.create("div", {className: "xxRiftSeals", style: {display: "none"}}, this.riftPanel);
		var riftFoot = dojo.create("div", {className: "xxRiftFoot", style: {display: "none"}}, this.riftPanel);
		this.riftKeysEl = dojo.create("span", {className: "xxRiftKeys"}, riftFoot);
		dojo.create("span", {className: "xxRiftHint", innerHTML: $I("cultivation.rift.hint")}, riftFoot);
		this.riftResult = dojo.create("div", {className: "xxRiftResult", style: {display: "none"}}, this.riftPanel);
		this._ladderFloor = -1;
		this._resultSeq = -1;
		this._riftDeckSig = null;

		this.riftPanel.onclick = function(e){
			var t = e.target;
			if (!t || !t.closest){ return; }
			var skillEl = t.closest("[data-battle-skill]");
			if (skillEl){
				e.preventDefault();
				if (cult.executeBattleTurn(skillEl.getAttribute("data-battle-skill"))){
					self._riftDeckSig = null;
					self.update();
				}
				return;
			}
			var battleAct = t.closest("[data-battle-act]");
			if (battleAct){
				e.preventDefault();
				var bAct = battleAct.getAttribute("data-battle-act");
				if (bAct === "auto"){
					if (cult.autoResolveBattle()){
						self._riftDeckSig = null;
						self.update();
					}
				} else if (bAct === "flow"){
					cult.toggleBattleAutoFlow();
					self._riftDeckSig = null;
					self.update();
				} else if (bAct === "flee"){
					if (cult.fleeBattle()){
						self._riftDeckSig = null;
						self.update();
					}
				}
				return;
			}
			var startEl = t.closest("[data-battle-start]");
			if (startEl){
				e.preventDefault();
				var sMode = startEl.getAttribute("data-battle-start");
				if (cult.startRiftBattle(sMode)){
					self._riftDeckSig = null;
					self.update();
				}
				return;
			}
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
					if (cult.startRiftBattle("greater")){
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

		//⑤ 丹药 — 玄天丹鼎 · 三昧控火与丹毒经脉体系(专属交互式炼丹台 + 保留底层按钮供测试兼容)
		this.pillHeader = dojo.create("div", {
			className: "cultivationSection",
			innerHTML: this.sectionTitle("cultivation.section.pill")
		}, tabContainer);
		this.alchemyPanel = dojo.create("div", {className: "xxAlchemyArena", style: {display: "none"}}, tabContainer);
		this._alcSig = null;
		this.alchemyPanel.onclick = function(e){
			var t = e.target;
			if (!t || !t.closest){ return; }
			var fireEl = t.closest("[data-fire]");
			if (fireEl){
				e.preventDefault();
				if (cult.setCauldronFire(fireEl.getAttribute("data-fire"))){
					self._alcSig = null;
					self.update();
				}
				return;
			}
			var craftEl = t.closest("[data-alc-craft]");
			if (craftEl){
				e.preventDefault();
				if (cult.refinePill(craftEl.getAttribute("data-alc-craft"))){
					self._alcSig = null;
					if (self.game.render){ self.game.render(); }
					self.update();
				}
				return;
			}
			var useEl = t.closest("[data-alc-use]");
			if (useEl){
				e.preventDefault();
				if (cult.usePill(useEl.getAttribute("data-alc-use"))){
					self._alcSig = null;
					if (self.game.render){ self.game.render(); }
					self.update();
				}
				return;
			}
			var actEl = t.closest("[data-alc-act]");
			if (actEl){
				e.preventDefault();
				var act = actEl.getAttribute("data-alc-act");
				if (act === "purge"){
					if (cult.purgeToxicity()){
						self._alcSig = null;
						if (self.game.render){ self.game.render(); }
						self.update();
					}
				} else if (act === "dew"){
					if (cult.catalyzeDew()){
						self._alcSig = null;
						if (self.game.render){ self.game.render(); }
						self.update();
					}
				}
				return;
			}
		};

		//凝露瓶绿液催丹栏——保留DOM节点兼容,视觉已整合入玄天丹鼎面板
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
		var pillGrid = dojo.create("div", {className: "xxStageGrid xxPillGrid", style: {display: "none"}}, tabContainer);
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

		//⑨ XX-2 真仙界飞升大典与仙灵法则循环仙台
		this.immortalPanelEl = dojo.create("div", {
			className: "xxImmortalBox",
			style: { display: "none" }
		}, tabContainer);
		this._immortalSig = "";
		dojo.connect(this.immortalPanelEl, "onclick", function(ev){
			var tgt = ev && ev.target;
			while (tgt && tgt !== self.immortalPanelEl){
				var act = tgt.getAttribute && tgt.getAttribute("data-xx-immortal");
				if (act){
					if (act === "ascend"){
						cult.ascendToImmortalRealm();
					} else if (act === "infuse"){
						cult.infuseImmortalQi();
					} else if (act === "law"){
						cult.comprehendDaoLaw();
					}
					self._immortalSig = "";
					self._caveSig = "";
					self.update();
					break;
				}
				tgt = tgt.parentNode;
			}
		});

		//⑩ XX-4 仙界洞府 · 聚灵药园与本命仙器蕴养祭炼
		this.immortalCaveEl = dojo.create("div", {
			className: "xxCaveArena",
			style: { display: "none" }
		}, tabContainer);
		this._caveSig = "";
		dojo.connect(this.immortalCaveEl, "onclick", function(ev){
			var tgt = ev && ev.target;
			while (tgt && tgt !== self.immortalCaveEl){
				var act = tgt.getAttribute && tgt.getAttribute("data-xx-cave");
				if (act){
					if (ev && ev.preventDefault){ ev.preventDefault(); }
					var arg = tgt.getAttribute("data-xx-arg") || "";
					var changed = false;
					if (act === "seed"){
						changed = cult.selectGardenSeed(arg);
					} else if (act === "plant"){
						changed = cult.plantHerbPlot(parseInt(arg, 10));
					} else if (act === "harvest"){
						changed = cult.harvestHerbPlot(parseInt(arg, 10));
					} else if (act === "harvestAll"){
						changed = cult.harvestAllHerbs() > 0;
					} else if (act === "autoTend"){
						cult.toggleGardenAutoTend();
						changed = true;
					} else if (act === "expand"){
						changed = cult.expandHerbPlot();
					} else if (act === "array"){
						changed = cult.upgradeSpiritArray();
					} else if (act === "infuseHerb"){
						changed = cult.infuseHerbAlchemy(arg);
					} else if (act === "bindXianqi"){
						changed = cult.bindImmortalArtifact(arg);
					} else if (act === "nurtureXianqi"){
						changed = cult.nurtureImmortalArtifact();
					} else if (act === "refineXianqi"){
						changed = cult.refineImmortalArtifact();
					}
					if (changed){
						self._dharmaSig = "";
						self._cosmosSig = "";
						self._menagerieSig = "";
						self._caveSig = "";
						self._sanctumSig = "";
						self._immortalSig = "";
						self._alcSig = null;
						self._hdrHtml = null;
						if (self.game.render){ self.game.render(); }
						self.update();
					}
					break;
				}
				tgt = tgt.parentNode;
			}
		});

		//⑪ XX-5 周天星斗护山大阵与跨界仙盟奇遇悬赏
		this.immortalSanctumEl = dojo.create("div", {
			className: "xxCaveArena xxSanctumArena",
			style: { display: "none" }
		}, tabContainer);
		this._sanctumSig = "";
		dojo.connect(this.immortalSanctumEl, "onclick", function(ev){
			var tgt = ev && ev.target;
			while (tgt && tgt !== self.immortalSanctumEl){
				var act = tgt.getAttribute && tgt.getAttribute("data-xx-sanctum");
				if (act){
					if (ev && ev.preventDefault){ ev.preventDefault(); }
					var arg = tgt.getAttribute("data-xx-arg") || "";
					var changed = false;
					if (act === "selectCore"){
						changed = cult.selectStarCore(arg);
					} else if (act === "condenseCore"){
						changed = cult.condenseStarCore(arg);
					} else if (act === "socketCore"){
						changed = cult.socketStarCore(parseInt(arg, 10));
					} else if (act === "unsocketCore"){
						changed = cult.unsocketStarCore(parseInt(arg, 10));
					} else if (act === "deduceArray"){
						changed = cult.deduceStarArrayTier();
					} else if (act === "repelRaid"){
						var saNow = cult.starArray || cult.makeDefaultStarArray();
						changed = cult.repelHeavenlyDemonRaid((saNow.raidThreat || 0) < 100);
					} else if (act === "autoRepel"){
						cult.toggleStarAutoRepel();
						changed = true;
					} else if (act === "refreshBounty"){
						changed = cult.refreshAllianceBounties();
					} else if (act === "autoBounty"){
						cult.toggleBountyAutoDispatch();
						changed = true;
					} else if (act === "dispatchBounty"){
						changed = cult.dispatchAllianceBounty(arg);
					} else if (act === "boostBounty"){
						changed = cult.boostAllianceBounty();
					} else if (act === "completeBounty"){
						changed = cult.completeAllianceBounty(arg);
					} else if (act === "exchangeMerit"){
						changed = cult.exchangeAllianceMerit(arg);
					}
					if (changed){
						self._dharmaSig = "";
						self._cosmosSig = "";
						self._sanctumSig = "";
						self._menagerieSig = "";
						self._caveSig = "";
						self._immortalSig = "";
						self._alcSig = null;
						self._hdrHtml = null;
						if (self.game.render){ self.game.render(); }
						self.update();
					}
					break;
				}
				tgt = tgt.parentNode;
			}
		});

		//⑫ XX-6 混沌万灵仙宠育兽苑与大道法则碑林参悟
		this.immortalMenagerieEl = dojo.create("div", {
			className: "xxCaveArena xxMenagerieArena",
			style: { display: "none" }
		}, tabContainer);
		this._menagerieSig = "";
		dojo.connect(this.immortalMenagerieEl, "onclick", function(ev){
			var tgt = ev && ev.target;
			while (tgt && tgt !== self.immortalMenagerieEl){
				var act = tgt.getAttribute && tgt.getAttribute("data-xx-menagerie");
				if (act){
					if (ev && ev.preventDefault){ ev.preventDefault(); }
					var arg = tgt.getAttribute("data-xx-arg") || "";
					var changed = false;
					if (act === "selectBeast"){
						changed = cult.selectNurseryBeast(arg);
					} else if (act === "incubateBeast"){
						changed = cult.incubateSpiritBeast(arg, false);
					} else if (act === "warmEgg"){
						changed = cult.warmBeastEgg(arg);
					} else if (act === "deployBattle"){
						changed = cult.deploySpiritBeast(arg, "battle");
					} else if (act === "deployGarden"){
						changed = cult.deploySpiritBeast(arg, "garden");
					} else if (act === "autoNurture"){
						cult.toggleBeastAutoNurture();
						changed = true;
					} else if (act === "feedHerb"){
						changed = cult.feedSpiritBeast(arg, "herb");
					} else if (act === "feedXy"){
						changed = cult.feedSpiritBeast(arg, "xianyuan");
					} else if (act === "feedPill"){
						changed = cult.feedSpiritBeast(arg, "pill");
					} else if (act === "awakenBeast"){
						changed = cult.awakenBeastBloodline(arg);
					} else if (act === "rubStele"){
						changed = cult.comprehendDaoStele(arg);
					}
					if (changed){
						self._dharmaSig = "";
						self._cosmosSig = "";
						self._menagerieSig = "";
						self._sanctumSig = "";
						self._caveSig = "";
						self._immortalSig = "";
						self._alcSig = null;
						self._hdrHtml = null;
						if (self.game.render){ self.game.render(); }
						self.update();
					}
					break;
				}
				tgt = tgt.parentNode;
			}
		});

		//⑬ XX-7 诸天星域游历飞舟（太虚星槎）与混沌鸿蒙灵宝祭坛
		this.immortalCosmosEl = dojo.create("div", {
			className: "xxCaveArena xxCosmosArena",
			style: { display: "none" }
		}, tabContainer);
		this._cosmosSig = "";
		dojo.connect(this.immortalCosmosEl, "onclick", function(ev){
			var tgt = ev && ev.target;
			while (tgt && tgt !== self.immortalCosmosEl){
				var act = tgt.getAttribute && tgt.getAttribute("data-xx-cosmos");
				if (act){
					if (ev && ev.preventDefault){ ev.preventDefault(); }
					var arg = tgt.getAttribute("data-xx-arg") || "";
					var changed = false;
					if (act === "upgradeVessel"){
						changed = cult.upgradeStarship();
					} else if (act === "selectRealm"){
						changed = cult.selectStarRealm(arg);
					} else if (act === "surgeVoyage"){
						changed = cult.surgeStarshipVoyage();
					} else if (act === "autoVoyage"){
						cult.toggleStarshipAutoVoyage();
						changed = true;
					} else if (act === "forgeTreasure"){
						changed = cult.forgeHongmengTreasure(arg);
					}
					if (changed){
						self._dharmaSig = "";
						self._cosmosSig = "";
						self._menagerieSig = "";
						self._sanctumSig = "";
						self._caveSig = "";
						self._immortalSig = "";
						self._alcSig = null;
						self._hdrHtml = null;
						if (self.game.render){ self.game.render(); }
						self.update();
					}
					break;
				}
				tgt = tgt.parentNode;
			}
		});

		//⑭ XX-8 混沌紫霄讲道坛与三千大道神通法相
		this.immortalDharmaEl = dojo.create("div", {
			className: "xxCaveArena xxDharmaArena",
			style: { display: "none" }
		}, tabContainer);
		this._dharmaSig = "";
		dojo.connect(this.immortalDharmaEl, "onclick", function(ev){
			var tgt = ev && ev.target;
			while (tgt && tgt !== self.immortalDharmaEl){
				var act = tgt.getAttribute && tgt.getAttribute("data-xx-dharma");
				if (act){
					if (ev && ev.preventDefault){ ev.preventDefault(); }
					var arg = tgt.getAttribute("data-xx-arg") || "";
					var changed = false;
					if (act === "upgradeAltar"){
						changed = cult.upgradeZixiaoAltar();
					} else if (act === "autoLecture"){
						cult.toggleZixiaoAutoLecture();
						changed = true;
					} else if (act === "lectureEssence"){
						changed = cult.holdDaoLecture("essence");
					} else if (act === "lectureHongmeng"){
						changed = cult.holdDaoLecture("hongmeng");
					} else if (act === "refineIdol"){
						changed = cult.refineDharmaIdol(arg);
					} else if (act === "equipPrimary"){
						changed = cult.equipDharmaIdol(arg, "primary");
					} else if (act === "equipSupport"){
						changed = cult.equipDharmaIdol(arg, "support");
					}
					if (changed){
						self._dharmaSig = "";
						self._cosmosSig = "";
						self._menagerieSig = "";
						self._sanctumSig = "";
						self._caveSig = "";
						self._immortalSig = "";
						self._alcSig = null;
						self._hdrHtml = null;
						if (self.game.render){ self.game.render(); }
						self.update();
					}
					break;
				}
				tgt = tgt.parentNode;
			}
		});

		var ascendRow = dojo.create("div", { className: "xxAscendRow" }, tabContainer);
		this.ascendBtn = dojo.create("div", {
			className: "btn nosel modern xxAscend xx-has-ico",
			style: { display: "none" },
			title: $I("cultivation.ascend.desc")
		}, ascendRow);
		var ascendContent = dojo.create("div", { className: "btnContent" }, this.ascendBtn);
		var ascendIco = (classes.ui && classes.ui.XianxiaArt)
			? "<i class=\"xx-btn-ico\" aria-hidden=\"true\">" + classes.ui.XianxiaArt.resIcon("karma") + "</i>"
			: "";
		dojo.create("span", {
			className: "btnTitle",
			innerHTML: ascendIco + $I("cultivation.ascend.label")
		}, ascendContent);
		dojo.create("div", {
			className: "xx-cost xx-sub",
			innerHTML: "<span class=\"xx-ci ok\"><i>" + $I("cultivation.ascend.desc") + "</i></span>"
		}, ascendContent);
		dojo.connect(this.ascendBtn, "onclick", function(){
			cult.showReincarnationOverlay();
		});

		this.update();
	},

	//历练卡:水墨徽章图 + 名称 + 右侧云纹暗章 + 调息遮罩(冷却期内从右向左褪去)
	makeActionBtn: function(container, glyph, onClick){
		var btn = dojo.create("div", { className: "btn nosel modern xxAction", tabIndex: 0 }, container);
		var art = (classes.ui && classes.ui.XianxiaArt) ? classes.ui.XianxiaArt.actionArt(glyph) : glyph;
		dojo.create("span", { className: "xxActGlyph", innerHTML: art, "aria-hidden": "true" }, btn);
		dojo.create("span", { className: "btnTitle" }, btn);
		dojo.create("span", { className: "xxActWm", innerHTML: glyph, "aria-hidden": "true" }, btn);
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
			var oTip = cult.getOriginDesc ? cult.getOriginDesc().replace(/"/g, "&quot;") : "";
			idLine = "<div class=\"xx-hd-id\"" + (oTip ? " title=\"" + oTip + "\"" : "") + ">" +
				"<span class=\"xx-id-name\">" + escName + "</span>" +
				"<span class=\"xx-id-meta\">" + $I("identity.gender." + (idt.gender == "f" ? "f" : "m")) +
				(cult.getOrigin() ? " · " + cult.getOriginLabel() : "") + "</span>" +
				"<span class=\"xx-id-edit\">" + $I("identity.edit") + "</span></div>";
		}

		var isMortal = !!(cult.isMortal && cult.isMortal());
		var realmLabel = isMortal ? $I("cultivation.mortal.label") : String(realm.label || "");
		var seal = isMortal ? $I("cultivation.mortal.seal") : (realmLabel.replace(/<[^>]*>/g, "").charAt(0) || "道");
		var daoTitle = isMortal ? $I("cultivation.mortal.daotitle") : cult.getDaoTitle();
		var artMgr = classes.ui && classes.ui.XianxiaArt;
		var tile = function(cls, icoKey, label, value, bar, tip){
			var tIco = artMgr ? "<i class=\"xx-tile-ico\" aria-hidden=\"true\">" + artMgr.tileIcon(icoKey) + "</i>" : "";
			var escTip = tip ? " title=\"" + String(tip).replace(/"/g, "&quot;") + "\"" : "";
			return "<div class=\"xx-tile " + cls + "\"" + escTip + "><span class=\"xx-tile-lbl\">" + tIco + label + "</span>" +
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
		var rootTip = (cult.getRootDesc ? cult.getRootDesc() : "") +
			(cult.getRootSummary ? "（" + cult.getRootSummary() + "）" : "");

		var hasBuff = !!(cult.buffs.juqi > 0 || cult.buffs.ziqi > 0 || cult.buffs.jiangchen > 0 || cult.buffs.biyan > 0);
		var heroVisual = artMgr
			? "<div class=\"xx-hero-portrait\" aria-hidden=\"true\">" +
				artMgr.heroPortraitSVG(realm.realm || "lianqi", seal, root.key, cult.secluded, demon, hasBuff) +
				"</div>"
			: "<div class=\"xx-hero-seal\" aria-hidden=\"true\">" + seal + "</div>";
		var heroBg = artMgr ? "<div class=\"xx-hero-bg\" aria-hidden=\"true\">" + artMgr.cultivationBgSVG(realm.realm || "lianqi") + "</div>" : "";
		var sndChip = "<span class=\"xx-chip xx-sound-toggle\" title=\"" + $I("cultivation.sound.tip") + "\">" +
			$I(cult.soundMuted ? "cultivation.sound.off" : "cultivation.sound.on") + "</span>";
		var showMgBtn = (cult.getPastLives() > 0 || cult.getCurrentRealmIndex() >= 1 || (cult.mingge && cult.mingge.length > 0) || (cult.pendingMingge && cult.pendingMingge.length > 0));
		var mgChip = showMgBtn ? "<span class=\"xx-chip xx-mingge-open\" title=\"开启六道轮回先天命格盘：预设来世特殊灵体或主动兵解重修\">☯ 先天命盘</span>" : "";
		var phenomBanner = "";
		if (cult.lastBreakPhenomenon && (Date.now() - cult.lastBreakPhenomenon.ts < 2400)){
			var pMaj = cult.lastBreakPhenomenon.major;
			phenomBanner = "<div class=\"xx-phenom-banner " + (pMaj ? "xx-phenom-major" : "xx-phenom-minor") + "\">" +
				$I(pMaj ? "cultivation.phenom.major" : "cultivation.phenom.minor") + "</div>";
		}
		var mortalBanner = isMortal ? cult.renderMortalBanner() : "";

		var html = heroBg + phenomBanner + "<div class=\"xx-hero" + (isMortal ? " xx-hero-mortal" : "") + "\">" +
				heroVisual +
				"<div class=\"xx-hero-body\">" + idLine +
					"<div class=\"xx-hd-main\">" +
						"<span class=\"xx-realm-big" + (isMortal ? " xx-realm-mortal" : "") + "\">" + realmLabel + "</span>" +
						"<span class=\"xx-chip xx-daotitle" + (isMortal ? " xx-daotitle-mortal" : "") + "\">" + daoTitle + "</span>" +
						(cult.secluded ? "<span class=\"xx-chip xx-secl\">" + $I("cultivation.header.secluded") + "</span>" : "") +
						mgChip +
						sndChip +
					"</div>" +
				"</div>" +
			"</div>" +
			mortalBanner +
			"<div class=\"xx-tiles\">" +
				tile("xx-bonus", "bonus", $I("cultivation.tile.bonus"), "+" + fmt(ratio * 100, false, false, 0) + "%") +
				tile("xx-combat", "combat", $I("cultivation.tile.combat"), fmt(cult.getCombatPower(), false, false, 0)) +
				tile("xx-root xx-root-" + root.key, "root", $I("cultivation.tile.root"), "<span>" + cult.getRootLabel() + "</span>" + rootPips, null, rootTip) +
				tile("xx-life" + lifeCls, "life", $I("cultivation.tile.life"),
					$I("cultivation.tile.life.val", [fmt(lifeRemain, false, false, 0), fmt(lifeMax, false, false, 0)]),
					lifeFrac * 100) +
				tile("xx-demon" + demonCls, "demon", $I("cultivation.tile.demon"), demon, demon) +
			"</div>";

		var extras = [];
		if (cult.getRootSummary){
			extras.push(cult.getRootLabel() + "：" + cult.getRootSummary());
		}
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
		if ((cult.pillToxicity || 0) >= 20){
			var txSt = cult.getToxicityStatus();
			extras.push("丹毒 " + txSt.val + "/100 (" + txSt.label + ")");
		}
		if (extras.length){
			html += "<div class=\"xx-hd-extra\"><span>" + extras.join("</span><span>") + "</span></div>";
		}

		//XX-3 先天命格 / 特殊灵体常驻铭牌
		var activeMgs = cult.getActiveMinggeDefs ? cult.getActiveMinggeDefs() : [];
		if (activeMgs.length){
			html += "<div class=\"xx-hd-fates xx-hd-mingge\"><span class=\"xx-fate-lbl\">先天命格</span>";
			for (var mi = 0; mi < activeMgs.length; mi++){
				var md = activeMgs[mi];
				var mgIco = (artMgr && artMgr.minggeIcon) ? "<i class=\"xx-chip-ico\" aria-hidden=\"true\">" + artMgr.minggeIcon(md.art) + "</i>" : "";
				var mgTip = String(md.desc || "").replace(/"/g, "&quot;");
				html += "<span class=\"xx-chip xx-fate xx-mingge-chip xx-mingge-open\" title=\"" + mgTip + "\">" + mgIco + md.label + " · " + md.tag + "</span>";
			}
			html += "</div>";
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
			html += "<div class=\"xx-hd-fates xx-hd-arts\"><span class=\"xx-fate-lbl\">" +
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
			this.pillGrid.style.display = "none";
			if (this.alchemyPanel){
				this.alchemyPanel.style.display = pillShow ? "" : "none";
				if (pillShow){
					var toxInfo = cult.getToxicityStatus();
					var alcRank = cult.getAlchemyRank();
					var curFire = cult.getCauldronFire();
					var bottleFate = cult.getFate("bottle");
					var dewShow = (bottleFate && bottleFate.researched) || (cult.bottleDew || 0) > 0;
					var dewCnt = cult.bottleDew || 0;
					var pSigParts = [
						toxInfo.val,
						alcRank.rank,
						alcRank.exp,
						curFire.key,
						Math.round(cult.heartDemon || 0),
						Math.round((cult.breakMult || 0) * 100),
						cult.getBreakSurge() > 1 ? 1 : 0,
						Math.ceil((cult.buffs.juqi || 0) / 5),
						Math.ceil((cult.buffs.jiangchen || 0) / 5),
						Math.ceil((cult.buffs.biyan || 0) / 5),
						dewShow ? dewCnt : -1,
						cult.getCurrentRealmIndex()
					];
					for (var pi = 0; pi < cult.pills.length; pi++){
						var pObj = cult.pills[pi];
						var unl = cult.isPillUnlocked(pObj);
						var supC = (cult.supremePills && cult.supremePills[pObj.name]) || 0;
						var canAff = unl ? (cult.canAffordPill(pObj.name) ? 1 : 0) : 0;
						pSigParts.push(pObj.name + ":" + (unl ? 1 : 0) + ":" + (pObj.val || 0) + ":" + supC + ":" + canAff);
					}
					var alcSig = pSigParts.join("|");
					if (this._alcSig !== alcSig){
						this._alcSig = alcSig;

						var fireChipsHtml = "<div class=\"xxFireBar\"><span class=\"xxFireLbl\">三昧控火</span>";
						for (var fi = 0; fi < cult.CAULDRON_FIRES.length; fi++){
							var fd = cult.CAULDRON_FIRES[fi];
							var fAct = (fd.key === curFire.key);
							var fTip = String(fd.desc || "").replace(/"/g, "&quot;");
							fireChipsHtml += "<a href=\"#!\" class=\"xxFireChip " + fd.key + (fAct ? " active" : "") +
								"\" data-fire=\"" + fd.key + "\" title=\"" + fTip + "\">" +
								"<span>" + fd.label + "</span><span class=\"xxFireTag\">" + fd.tag + "</span></a>";
						}
						fireChipsHtml += "</div>";

						var activeBuffs = [];
						if (cult.buffs.juqi > 0){
							activeBuffs.push("<span class=\"xxAlcBuffChip on\">聚气丹 · " + Math.ceil(cult.buffs.juqi / 5) + "s</span>");
						}
						if (cult.buffs.jiangchen > 0){
							activeBuffs.push("<span class=\"xxAlcBuffChip on\">降尘丹 · " + Math.ceil(cult.buffs.jiangchen / 5) + "s</span>");
						}
						if (cult.buffs.biyan > 0){
							activeBuffs.push("<span class=\"xxAlcBuffChip on\">碧焰酒 · " + Math.ceil(cult.buffs.biyan / 5) + "s</span>");
						}
						if (cult.breakMult > 0){
							activeBuffs.push("<span class=\"xxAlcBuffChip boost\">破境加成 +" + Math.round(cult.breakMult * 100) + "%</span>");
						}
						activeBuffs.push("<span class=\"xxToxBadge " + toxInfo.tier + "\">丹毒 " + toxInfo.val + "/100 · " + toxInfo.label + "</span>");
						var statusLeftHtml = activeBuffs.join("");

						var statusRightHtml = "";
						if (toxInfo.val > 0){
							statusRightHtml += "<a href=\"#!\" class=\"xxToxPurgeBtn\" data-alc-act=\"purge\">☯ 运功逼毒</a>";
						}
						if (dewShow){
							statusRightHtml += "<a href=\"#!\" class=\"xxAlcDewBtn" + (dewCnt <= 0 ? " disabled" : "") + "\" data-alc-act=\"dew\">✦ 绿液催丹 (" + dewCnt + "/5)</a>";
						}

						var topBarHtml =
							"<div class=\"xxAlcTopRow\">" +
								"<div class=\"xxAlcTitleBlock\">" +
									"<span class=\"xxAlcSealBadge\">丹</span>" +
									"<div>" +
										"<div class=\"xxAlcMainTitle\">玄天丹鼎 · <b>" + alcRank.title + "</b> <small style=\"font-size:11px;color:var(--xx-mute);font-weight:400;\">(" + (alcRank.exp >= alcRank.nextExp ? ("造诣 " + alcRank.exp + " · 已臻圆满") : ("造诣 " + alcRank.exp + "/" + alcRank.nextExp)) + ")</small></div>" +
										"<div class=\"xxAlcSubTitle\">" + alcRank.desc + "</div>" +
									"</div>" +
								"</div>" +
								fireChipsHtml +
							"</div>" +
							"<div class=\"xxAlcTopRow\" style=\"padding-top:8px;padding-bottom:6px;border-bottom:none;\">" +
								"<div class=\"xxAlcBuffRow\">" + statusLeftHtml + "</div>" +
								(statusRightHtml ? "<div class=\"xxFireBar\">" + statusRightHtml + "</div>" : "") +
							"</div>";

						var cardsHtml = "<div class=\"xxAlcRecipeGrid\">";
						for (var ci = 0; ci < cult.pills.length; ci++){
							var pill = cult.pills[ci];
							if (!cult.isPillUnlocked(pill)){ continue; }
							var pVal = pill.val || 0;
							var supVal = (cult.supremePills && cult.supremePills[pill.name]) || 0;
							var prices = cult.getPillCraftPrices(pill.name);
							var canCraft = cult.canAffordPill(pill.name);

							var canUse = pVal > 0;
							if (pVal <= 0){
								canUse = false;
							} else if (pill.name !== "qingxin" && pill.name !== "peiying" && toxInfo.blocked){
								canUse = false;
							} else if (pill.name === "zhujidan" && cult.breakMult >= 0.5){
								canUse = false;
							} else if (pill.name === "juqi" && cult.buffs.juqi > 0){
								canUse = false;
							} else if (pill.name === "jiangchen" && cult.breakMult >= 0.65 && cult.buffs.jiangchen > 0){
								canUse = false;
							} else if (pill.name === "biyan" && cult.buffs.biyan > 0){
								canUse = false;
							} else if (pill.name === "qingxin" && cult.heartDemon <= 0 && (cult.pillToxicity || 0) <= 0){
								canUse = false;
							} else if (pill.name === "peiying" && cult.heartDemon <= 0 && cult.getBreakSurge() <= 1 && (cult.pillToxicity || 0) <= 0){
								canUse = false;
							}

							var costHtml = "<div class=\"xxPillCosts\">";
							for (var pri = 0; pri < prices.length; pri++){
								var pr = prices[pri];
								var rObj = this.game.resPool.get(pr.name);
								var rTitle = (rObj && rObj.title) || pr.name;
								var enough = rObj && rObj.value >= pr.val;
								costHtml += "<span class=\"xxPillCostChip " + (enough ? "ok" : "lack") + "\">" +
									rTitle + " <b>" + fmt(pr.val, false, false, 0) + "</b></span>";
							}
							var toxTag = pill.toxicity < 0
								? "<span class=\"xxPillCostChip ok\" style=\"margin-left:auto;\">净毒 " + pill.toxicity + "</span>"
								: "<span class=\"xxPillCostChip\" style=\"margin-left:auto;border-color:rgba(240,140,75,.38);color:#ffb87a;\">丹毒 +" + pill.toxicity + "</span>";
							costHtml += toxTag + "</div>";

							var pillIco = (artMgr && artMgr.pillIcon)
								? "<i class=\"xx-chip-ico\" aria-hidden=\"true\">" + artMgr.pillIcon(pill.name) + "</i>"
								: (artMgr ? "<i class=\"xx-chip-ico\" aria-hidden=\"true\">" + artMgr.resIcon("spice") + "</i>" : "");
							var tierBadge = pill.tier ? "<span class=\"xxPillTierTag\">" + pill.tier + "</span>" : "";
							cardsHtml +=
								"<div class=\"xxPillCard " + (pill.toxicity < 0 ? "cleansing" : "offensive") + "\">" +
									"<div class=\"xxPillCardHd\">" +
										"<div class=\"xxPillTitleWrap\">" +
											"<span class=\"xxPillName\">" + pillIco + pill.label + "</span>" +
											tierBadge +
										"</div>" +
										"<div class=\"xxPillStockWrap\">" +
											"<span class=\"xxPillStock" + (pVal > 0 ? " has" : "") + "\">×<b>" + pVal + "</b></span>" +
											(supVal > 0 ? "<span class=\"xxPillSupStock\">✦×<b>" + supVal + "</b></span>" : "") +
										"</div>" +
									"</div>" +
									"<div class=\"xxPillDesc\">" + (pill.effectSummary || pill.description) + "</div>" +
									costHtml +
									"<div class=\"xxPillBtnRow\">" +
										"<a href=\"#!\" class=\"xxAlcBtn craft" + (canCraft ? "" : " disabled") + "\" data-alc-craft=\"" + pill.name + "\"><b>炼制</b></a>" +
										"<a href=\"#!\" class=\"xxAlcBtn use" + (canUse ? "" : " disabled") + "\" data-alc-use=\"" + pill.name + "\"><b>服用</b></a>" +
									"</div>" +
								"</div>";
						}
						cardsHtml += "</div>";

						this.alchemyPanel.innerHTML = topBarHtml + cardsHtml;
					}
				}
			}
		}
		if (this.dewWrap){
			this.dewWrap.style.display = "none";
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

		//玄天秘境面板——回合制斗法主舞台(银河奶牛/梅尔沃式平滑战斗画面) & 双秘境备战大厅
		if (this.riftPanel){
			this.riftPanel.style.display = riftOpen ? "" : "none";
			if (riftOpen){
				var F = cult.riftFloor;
				var gInfo = cult.getGriftOdds(F + 1);
				var pw = gInfo.need, cp = gInfo.cp;
				var b = cult.battle;
				var bActive = !!(b && b.active);

				if (bActive){
					var p = b.player;
					var e = b.enemy;
					var pHpPct = Math.max(0, Math.min(100, Math.round((p.hp / Math.max(1, p.maxHp)) * 100)));
					var pMpPct = Math.max(0, Math.min(100, Math.round((p.mp / Math.max(1, p.maxMp)) * 100)));
					var eHpPct = Math.max(0, Math.min(100, Math.round((e.hp / Math.max(1, e.maxHp)) * 100)));
					var castPct = Math.max(0, Math.min(100, Math.round(((b.castTick || 0) / Math.max(1, b.castMax || 10)) * 100)));
					var intentInfo = cult.describeEnemyIntent(e);
					var playerName = (cult.identity && cult.identity.name) ? cult.identity.name : "本尊修士";
					var stageBadge = (b.mode === "greater")
						? ("上古大秘境 · 第 " + b.floor + " 层守关战")
						: ("灵脉秘境 · 第 " + b.wave + " / " + b.maxWaves + " 波妖兽");

					// 首次进入战斗时挂载持久化 DOM 舞台，后续每帧原位平滑更新，杜绝 innerHTML 重建导致动画卡顿
					if (!this._combatDom || !this.riftDeck.contains(this._combatDom.root)){
						this.riftDeck.innerHTML =
							"<div class=\"xxCombatStage\">" +
								"<div class=\"xxCombatTopBar\">" +
									"<div class=\"xxCombatMeta\">" +
										"<span class=\"xxCombatModeTag\"></span>" +
										"<span class=\"xxCombatTurnTag\"></span>" +
										"<span class=\"xxCombatLootTag\"></span>" +
									"</div>" +
									"<div class=\"xxCombatQuickActions\">" +
										"<a href=\"#!\" class=\"xxCombatActBtn flow\" data-battle-act=\"flow\"></a>" +
										"<a href=\"#!\" class=\"xxCombatActBtn auto\" data-battle-act=\"auto\">⚡ 速战结算</a>" +
										"<a href=\"#!\" class=\"xxCombatActBtn flee\" data-battle-act=\"flee\">◈ 携宝遁走</a>" +
									"</div>" +
								"</div>" +
								"<div class=\"xxFighterArena\">" +
									"<div class=\"xxFighterCard player\">" +
										"<div class=\"xxFighterHd\">" +
											"<div>" +
												"<span class=\"xxFighterName\"></span>" +
												"<span class=\"xxFighterSub\"></span>" +
											"</div>" +
											"<span class=\"xxShieldBadge player\" style=\"display:none\"></span>" +
										"</div>" +
										"<div class=\"xxSpriteStage player\">" +
											"<div class=\"xxSpriteWrap player\"></div>" +
											"<div class=\"xxVfxLayer player\"></div>" +
											"<div class=\"xxFloatLayer player\"></div>" +
										"</div>" +
										"<div class=\"xxCastBarWrap\">" +
											"<div class=\"xxCastLabel\"><span>剑诀蓄势</span><b class=\"xxCastStateText\"></b></div>" +
											"<div class=\"xxCastBar\"><i class=\"xxCastFill player\"></i></div>" +
										"</div>" +
										"<div class=\"xxBarGroup\">" +
											"<div class=\"xxBarLabel\"><span>气血 HP</span><b class=\"xxPlayerHpVal\"></b></div>" +
											"<div class=\"xxHpBar player\"><u class=\"xxBarTrail\"></u><i class=\"xxBarFill\"></i></div>" +
										"</div>" +
										"<div class=\"xxBarGroup\">" +
											"<div class=\"xxBarLabel\"><span>真元 MP</span><b class=\"xxPlayerMpVal\"></b></div>" +
											"<div class=\"xxMpBar\"><i class=\"xxBarFill\"></i></div>" +
										"</div>" +
										"<div class=\"xxStatusRow player\"></div>" +
									"</div>" +
									"<div class=\"xxArenaVs\"><span>⚔</span><small>斗法交锋</small></div>" +
									"<div class=\"xxFighterCard enemy\">" +
										"<div class=\"xxFighterHd\">" +
											"<div>" +
												"<span class=\"xxFighterName\"></span>" +
												"<span class=\"xxFighterSub\"></span>" +
											"</div>" +
											"<span class=\"xxShieldBadge enemy\" style=\"display:none\"></span>" +
										"</div>" +
										"<div class=\"xxSpriteStage enemy\">" +
											"<div class=\"xxSpriteWrap enemy\"></div>" +
											"<div class=\"xxVfxLayer enemy\"></div>" +
											"<div class=\"xxFloatLayer enemy\"></div>" +
										"</div>" +
										"<div class=\"xxCastBarWrap\">" +
											"<div class=\"xxCastLabel\"><span>妖煞蓄势</span><b class=\"xxEnemyIntentMini\"></b></div>" +
											"<div class=\"xxCastBar enemy\"><i class=\"xxCastFill enemy\"></i></div>" +
										"</div>" +
										"<div class=\"xxBarGroup\">" +
											"<div class=\"xxBarLabel\"><span>妖血 HP</span><b class=\"xxEnemyHpVal\"></b></div>" +
											"<div class=\"xxHpBar enemy\"><u class=\"xxBarTrail\"></u><i class=\"xxBarFill\"></i></div>" +
										"</div>" +
										"<div class=\"xxTraitBox\">" +
											"<span class=\"xxTraitBadge\"></span>" +
											"<span class=\"xxTraitText\"></span>" +
										"</div>" +
										"<div class=\"xxStatusRow enemy\"></div>" +
										"<div class=\"xxIntentBox\">" +
											"<div class=\"xxIntentMain\">" +
												"<span class=\"xxIntentTag\"></span>" +
												"<span class=\"xxIntentDmg\"></span>" +
											"</div>" +
											"<div class=\"xxIntentCounter\"></div>" +
										"</div>" +
									"</div>" +
								"</div>" +
								"<div class=\"xxSkillDeck\"></div>" +
								"<div class=\"xxCombatFeed\"></div>" +
							"</div>";
						var rootEl = this.riftDeck.querySelector(".xxCombatStage");
						this._combatDom = {
							root: rootEl,
							modeTag: rootEl.querySelector(".xxCombatModeTag"),
							turnTag: rootEl.querySelector(".xxCombatTurnTag"),
							lootTag: rootEl.querySelector(".xxCombatLootTag"),
							flowBtn: rootEl.querySelector(".xxCombatActBtn.flow"),
							pName: rootEl.querySelector(".xxFighterCard.player .xxFighterName"),
							pSub: rootEl.querySelector(".xxFighterCard.player .xxFighterSub"),
							pShield: rootEl.querySelector(".xxShieldBadge.player"),
							pSprite: rootEl.querySelector(".xxSpriteWrap.player"),
							pVfx: rootEl.querySelector(".xxVfxLayer.player"),
							pFloat: rootEl.querySelector(".xxFloatLayer.player"),
							pCastText: rootEl.querySelector(".xxCastStateText"),
							pCastFill: rootEl.querySelector(".xxCastFill.player"),
							pHpVal: rootEl.querySelector(".xxPlayerHpVal"),
							pHpTrail: rootEl.querySelector(".xxHpBar.player .xxBarTrail"),
							pHpFill: rootEl.querySelector(".xxHpBar.player .xxBarFill"),
							pMpVal: rootEl.querySelector(".xxPlayerMpVal"),
							pMpFill: rootEl.querySelector(".xxMpBar .xxBarFill"),
							pStatus: rootEl.querySelector(".xxStatusRow.player"),
							eName: rootEl.querySelector(".xxFighterCard.enemy .xxFighterName"),
							eSub: rootEl.querySelector(".xxFighterCard.enemy .xxFighterSub"),
							eShield: rootEl.querySelector(".xxShieldBadge.enemy"),
							eSprite: rootEl.querySelector(".xxSpriteWrap.enemy"),
							eVfx: rootEl.querySelector(".xxVfxLayer.enemy"),
							eFloat: rootEl.querySelector(".xxFloatLayer.enemy"),
							eIntentMini: rootEl.querySelector(".xxEnemyIntentMini"),
							eCastFill: rootEl.querySelector(".xxCastFill.enemy"),
							eHpVal: rootEl.querySelector(".xxEnemyHpVal"),
							eHpTrail: rootEl.querySelector(".xxHpBar.enemy .xxBarTrail"),
							eHpFill: rootEl.querySelector(".xxHpBar.enemy .xxBarFill"),
							eTraitBadge: rootEl.querySelector(".xxTraitBadge"),
							eTraitText: rootEl.querySelector(".xxTraitText"),
							eStatus: rootEl.querySelector(".xxStatusRow.enemy"),
							eIntentBox: rootEl.querySelector(".xxIntentBox"),
							eIntentTag: rootEl.querySelector(".xxIntentTag"),
							eIntentDmg: rootEl.querySelector(".xxIntentDmg"),
							eIntentCounter: rootEl.querySelector(".xxIntentCounter"),
							skillDeck: rootEl.querySelector(".xxSkillDeck"),
							feed: rootEl.querySelector(".xxCombatFeed"),
							pSpriteSig: "",
							eSpriteSig: "",
							skillSig: "",
							logSig: "",
							lastAnimSeq: b.animSeq || 0
						};
						this._riftDeckSig = null;
						if (this.riftPanel && this.riftPanel.closest){
							var ti = this.riftPanel.closest(".tabInner");
							if (ti){ ti.scrollTop = Math.max(0, this.riftPanel.offsetTop - 10); }
						}
					}

					var cdm = this._combatDom;
					cdm.modeTag.className = "xxCombatModeTag " + b.mode;
					cdm.modeTag.textContent = stageBadge;
					cdm.turnTag.textContent = "第 " + b.turn + " 回合";
					cdm.lootTag.textContent = "已获修为 +" + fmt(b.loot.xiuwei, false, false, 0) +
						(b.loot.keys ? " · 秘境令 +" + b.loot.keys : "") +
						(b.loot.relic ? " · 遗宝 +" + b.loot.relic : "");
					cdm.flowBtn.className = "xxCombatActBtn flow" + (b.autoFlow ? " on" : "");
					cdm.flowBtn.textContent = b.autoFlow ? "⏸ 自动流转中" : "▶ 开启自动流转";

					// 更新修士与妖兽形象 SVG (仅当状态变化时重绘 SVG 内部)
					var curRealmKey = realm.realm || "lianqi";
					var pSprSig = curRealmKey + ":" + (p.shield > 0 ? 1 : 0) + ":" + (p.counterStance ? 1 : 0);
					if (cdm.pSpriteSig !== pSprSig){
						cdm.pSpriteSig = pSprSig;
						cdm.pSprite.innerHTML = artMgr ? artMgr.combatPlayerSVG(curRealmKey, p.shield > 0, p.counterStance) : "";
					}
					var eSprSig = e.key + ":" + (e.shield > 0 ? 1 : 0) + ":" + (e.enraged ? 1 : 0);
					if (cdm.eSpriteSig !== eSprSig){
						cdm.eSpriteSig = eSprSig;
						cdm.eSprite.innerHTML = artMgr ? artMgr.combatMonsterSVG(e.key, e.shield > 0, e.enraged) : "";
					}

					// 更新平滑蓄势条 & 气血/真元条 (保留 DOM 引用以触发 CSS cubic-bezier 平滑过渡与残影条)
					cdm.pCastText.textContent = b.autoFlow ? (castPct + "%") : "手动待命";
					cdm.pCastFill.style.width = (b.autoFlow ? castPct : 100) + "%";
					cdm.eIntentMini.textContent = intentInfo.title;
					cdm.eCastFill.style.width = (b.autoFlow ? castPct : 100) + "%";

					var cFmt = function(n){
						return n >= 10000 ? fmt(n, false, false, 1) : String(Math.floor(n));
					};
					cdm.pName.textContent = playerName;
					cdm.pSub.textContent = realmLabel + " · 攻 " + cFmt(p.atk) + " / 防 " + cFmt(p.def);
					if (p.shield > 0){
						cdm.pShield.style.display = "";
						cdm.pShield.textContent = "◈ 灵盾 " + cFmt(p.shield);
					} else {
						cdm.pShield.style.display = "none";
					}
					cdm.pHpVal.textContent = cFmt(p.hp) + " / " + cFmt(p.maxHp);
					cdm.pHpFill.style.width = pHpPct + "%";
					cdm.pHpTrail.style.width = pHpPct + "%";
					cdm.pMpVal.textContent = p.mp + " / " + p.maxMp;
					cdm.pMpFill.style.width = pMpPct + "%";

					var pStatuses = [];
					if (p.counterStance){ pStatuses.push("<span class=\"xxStChip buff\">☯ 反震剑势</span>"); }
					if (p.poison > 0){ pStatuses.push("<span class=\"xxStChip debuff\">☠ 蛇毒(" + p.poison + ")</span>"); }
					if (p.chill > 0){ pStatuses.push("<span class=\"xxStChip debuff\">❄ 寒霜(" + p.chill + ")</span>"); }
					if (p.weak > 0){ pStatuses.push("<span class=\"xxStChip debuff\">※ 虚弱(" + p.weak + ")</span>"); }
					if (!pStatuses.length){ pStatuses.push("<span class=\"xxStChip neutral\">道心澄明</span>"); }
					cdm.pStatus.innerHTML = pStatuses.join("");

					cdm.eName.textContent = e.name;
					cdm.eSub.textContent = e.tier + " · 攻 " + cFmt(e.atk) + " / 防 " + cFmt(e.def);
					if (e.shield > 0){
						cdm.eShield.style.display = "";
						cdm.eShield.textContent = "◈ 护盾 " + cFmt(e.shield);
					} else {
						cdm.eShield.style.display = "none";
					}
					cdm.eHpVal.textContent = cFmt(e.hp) + " / " + cFmt(e.maxHp);
					cdm.eHpFill.style.width = eHpPct + "%";
					cdm.eHpTrail.style.width = eHpPct + "%";
					cdm.eTraitBadge.textContent = "特征 · " + e.traitTitle;
					cdm.eTraitText.textContent = e.traitDesc;

					var eStatuses = [];
					if (e.enraged){ eStatuses.push("<span class=\"xxStChip rage\">✦ 狂暴(攻+42%)</span>"); }
					if (e.armorBreak > 0){ eStatuses.push("<span class=\"xxStChip vuln\">⚔ 破甲+30%(" + e.armorBreak + ")</span>"); }
					if (e.expose > 0){ eStatuses.push("<span class=\"xxStChip vuln\">⚡ 破绽+40%(" + e.expose + ")</span>"); }
					if (e.overloaded){ eStatuses.push("<span class=\"xxStChip vuln\">⚡ 核心过载(+50%)</span>"); }
					cdm.eStatus.innerHTML = eStatuses.join("");

					cdm.eIntentBox.className = "xxIntentBox " + intentInfo.key;
					cdm.eIntentTag.textContent = "下回合动作：" + intentInfo.title;
					cdm.eIntentDmg.textContent = intentInfo.desc;
					cdm.eIntentCounter.textContent = intentInfo.counter;

					// 推荐克制技能与技能面板更新
					var recSkill = cult.pickBestCombatSkill();
					var skSig = p.mp + ":" + recSkill + ":" + (b.natalName || "");
					if (cdm.skillSig !== skSig){
						cdm.skillSig = skSig;
						var skillBtnsHtml = "";
						for (var si = 0; si < cult.COMBAT_SKILLS.length; si++){
							var skDef = cult.COMBAT_SKILLS[si];
							var canCast = p.mp >= skDef.cost;
							var isRec = (skDef.key === recSkill && canCast);
							var skLabel = (skDef.key === "ult" && b.natalName) ? b.natalName : skDef.label.replace(/^[^\u4e00-\u9fa5]+/, "");
							var skIco = (artMgr && artMgr.skillIcon) ? "<i class=\"xx-skill-ico\" aria-hidden=\"true\">" + artMgr.skillIcon(skDef.key) + "</i>" : "";
							skillBtnsHtml +=
								"<a href=\"#!\" class=\"xxSkillBtn " + skDef.key +
									(canCast ? "" : " disabled") +
									(isRec ? " rec" : "") +
									"\" data-battle-skill=\"" + skDef.key + "\">" +
									"<div class=\"xxSkillHd\">" +
										"<span class=\"xxSkillName\">" + skIco + skLabel + (isRec ? "<em class=\"xxSkillRecBadge\">荐</em>" : "") + "</span>" +
										"<span class=\"xxSkillCost " + (skDef.cost > 0 ? "spend" : "gain") + "\">" + skDef.tag + "</span>" +
									"</div>" +
									"<div class=\"xxSkillDesc\">" + skDef.desc + "</div>" +
								"</a>";
						}
						cdm.skillDeck.innerHTML = skillBtnsHtml;
					}

					var logsArr = b.logs || [];
					var lSig = logsArr.slice(0, 3).join("||");
					if (cdm.logSig !== lSig){
						cdm.logSig = lSig;
						var logHtml = "";
						for (var li = 0; li < Math.min(3, logsArr.length); li++){
							logHtml += "<div class=\"xxCombatLogLine" + (li === 0 ? " latest" : "") + "\">" + logsArr[li] + "</div>";
						}
						cdm.feed.innerHTML = logHtml;
					}

					// 触发新回合丝滑出招冲刺、刀光剑阵特效、受击震颤与飘字伤害 (Milky Way / Melvor 动效)
					if (b.animSeq && cdm.lastAnimSeq !== b.animSeq && b.lastEvent){
						cdm.lastAnimSeq = b.animSeq;
						var ev = b.lastEvent;

						var triggerAnimCls = function(el, cls){
							if (!el){ return; }
							dojo.removeClass(el, cls);
							void el.offsetWidth;
							dojo.addClass(el, cls);
						};
						var spawnSplat = function(container, text, kind){
							if (!container || !text){ return; }
							var sp = dojo.create("span", {
								className: "xxDmgSplat " + (kind || "dmg"),
								innerHTML: text
							}, container);
							setTimeout(function(){
								if (sp && sp.parentNode){ sp.parentNode.removeChild(sp); }
							}, 950);
						};

						triggerAnimCls(cdm.pSprite, "xx-anim-lunge-right");
						if (ev.skillKey === "guard"){
							if (artMgr){
								cdm.pVfx.innerHTML = artMgr.combatVfxSVG("guard");
								triggerAnimCls(cdm.pVfx, "xx-vfx-burst");
							}
							if (ev.pShieldGain > 0){
								spawnSplat(cdm.pFloat, "灵盾 +" + ev.pShieldGain, "shield");
							}
						} else {
							if (artMgr){
								cdm.eVfx.innerHTML = artMgr.combatVfxSVG(ev.skillKey);
								triggerAnimCls(cdm.eVfx, "xx-vfx-burst");
							}
							triggerAnimCls(cdm.eSprite, "xx-anim-hit");
						}
						if (ev.pDmgDealt > 0){
							var dmgTxt = (ev.counterHit ? "☯ 反震 -" : (ev.shieldBroken ? "✦ 破盾 -" : "-")) + ev.pDmgDealt;
							spawnSplat(cdm.eFloat, dmgTxt, ev.counterHit || ev.skillKey === "ult" ? "crit" : "dmg");
						}
						if (ev.pHeal > 0){
							spawnSplat(cdm.pFloat, "回春 +" + ev.pHeal, "heal");
						}

						// 妖兽反击动作与受击飘字
						triggerAnimCls(cdm.eSprite, "xx-anim-lunge-left");
						if (ev.eDmgDealt > 0){
							triggerAnimCls(cdm.pSprite, "xx-anim-hit-delay");
							spawnSplat(cdm.pFloat, "-" + ev.eDmgDealt, "enemy-dmg");
						}
						if (ev.eShieldGain > 0){
							spawnSplat(cdm.eFloat, "护盾 +" + ev.eShieldGain, "shield");
						}
					}
				} else {
					this._combatDom = null;
					var idleSig = [
						F,
						cult.riftKeys,
						Math.round(cp),
						Math.round(pw),
						burstBlocked ? 1 : 0,
						b && b.result ? b.result + ":" + (b.logs && b.logs[0] ? b.logs[0] : "") : "none"
					].join("|");

					if (this._riftDeckSig !== idleSig){
						this._riftDeckSig = idleSig;
						// 备战大厅：左栏【灵脉秘境 · 三波妖兽连战】 + 右栏【上古大秘境 · 守关妖王战】
						var nextWaveKeys = cult.getNextMonsterWaveKeys();
						var wavePreviewHtml = "<div class=\"xxWavePreviewList\">";
						for (var wi = 0; wi < nextWaveKeys.length; wi++){
							var mDef = cult.getMonsterDef(nextWaveKeys[wi]);
							var miniSvg = artMgr ? "<span class=\"xxWaveMiniArt\">" + artMgr.combatMonsterSVG(mDef.key, mDef.startShieldRatio > 0, false) + "</span>" : "";
							wavePreviewHtml +=
								"<div class=\"xxWavePreviewItem\">" +
									"<span class=\"xxWaveIdx\">第" + (wi + 1) + "波</span>" +
									miniSvg +
									"<span class=\"xxWaveMon\">" + mDef.name + "</span>" +
									"<span class=\"xxWaveTrait\" title=\"" + mDef.traitDesc + "\">【" + mDef.traitTitle + "】</span>" +
								"</div>";
						}
						wavePreviewHtml += "</div>";

						var lastBattleNote = (b && b.logs && b.logs[0])
							? "<div class=\"xxLastBattleBanner " + (b.result || "win") + "\">" + b.logs[0] + "</div>"
							: "";

						var bossDef = cult.getBossDef(F + 1);
						var bossMiniSvg = artMgr ? "<div class=\"xxBossPreviewArt\">" + artMgr.combatMonsterSVG(bossDef.key, true, false) + "</div>" : "";
						var vsRatio = Math.max(8, Math.min(92, Math.round((cp / (cp + pw)) * 100)));

						this.riftDeck.innerHTML =
							"<div class=\"xxRiftCol xxExpCol\">" +
								"<div class=\"xxRiftColTitle\"><span>灵脉秘境 · 斩妖连战</span><small>三波回合斗法</small></div>" +
								wavePreviewHtml +
								lastBattleNote +
								"<div class=\"xxExpIdle\">" +
									"<a href=\"#!\" class=\"xxRiftMainBtn" + (burstBlocked ? " disabled" : "") + "\" data-battle-start=\"lesser\">" +
										(burstBlocked ? "气脉调息中" : "⚔ 入境斗法 · 三波连战") +
									"</a>" +
								"</div>" +
							"</div>" +
							"<div class=\"xxRiftCol xxGriftCol\">" +
								"<div class=\"xxRiftColTitle\"><span>上古大秘境 · " + bossDef.zone + "</span><small>秘境令 ×<b>" + cult.riftKeys + "</b></small></div>" +
								"<div class=\"xxGriftCard\">" +
									"<div class=\"xxGriftBossHd\">" +
										bossMiniSvg +
										"<div class=\"xxGriftBossMeta\">" +
											"<div>" +
												"<span class=\"xxGriftFloorTag\">第 " + (F + 1) + " 层</span>" +
												"<span class=\"xxGriftBossName\">" + bossDef.name + "</span>" +
											"</div>" +
											"<span class=\"xxTraitBadge boss\">" + bossDef.traitTitle + "</span>" +
										"</div>" +
									"</div>" +
									"<div class=\"xxBossTraitDesc\">" + bossDef.traitDesc + "</div>" +
									"<div class=\"xxVsBox\">" +
										"<div class=\"xxVsLabels\">" +
											"<span class=\"xxVsMine\">本尊道行 <b>" + fmt(cp, false, false, 0) + "</b></span>" +
											"<span class=\"xxVsNeed\">妖王战力 <b>" + fmt(pw, false, false, 0) + "</b></span>" +
										"</div>" +
										"<div class=\"xxVsBar\"><i style=\"width:" + vsRatio + "%\"></i></div>" +
									"</div>" +
									"<div class=\"xxGriftBtnRow\">" +
										"<a href=\"#!\" class=\"xxRiftMainBtn grift" + ((burstBlocked || cult.riftKeys <= 0) ? " disabled" : "") + "\" data-battle-start=\"greater\">" +
											"⚔ 挑战妖王 · 第 " + (F + 1) + " 层 <span>(秘境令×1)</span>" +
										"</a>" +
										(F >= 1 ? (
											"<a href=\"#!\" class=\"xxRiftSubBtn" + ((burstBlocked || cult.riftKeys <= 0) ? " disabled" : "") + "\" data-grift-act=\"sweep\">" +
												"☯ 扫荡第 " + F + " 层 <span>(100%稳刷)</span>" +
											"</a>"
										) : "") +
									"</div>" +
								"</div>" +
							"</div>";
					}
				}

				this.riftResult.style.display = "none";
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
					if (!ef){ continue; }
					var realmKey = ef.atStage ? ef.atStage.split("_")[0] : "lianqi";
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

		if (this.immortalPanelEl){
			var dujieSt = cult.getStage("dujie_0");
			var showImmortal = !!(dujieSt && dujieSt.researched);
			this.immortalPanelEl.style.display = showImmortal ? "block" : "none";
			if (showImmortal){
				dojo.toggleClass(this.immortalPanelEl, "is-ascended", !!cult.immortalAscended);
				var tcObj = this.game.resPool.get("timeCrystal");
				var xyObj = this.game.resPool.get("xianyuan");
				var tcVal = tcObj ? Math.floor(tcObj.value) : 0;
				var xyVal = xyObj ? Math.floor(xyObj.value) : 0;
				var xyRate = this.game.calcResourcePerTick("xianyuan") * (this.game.getTicksPerSecondUI ? this.game.getTicksPerSecondUI() : 5);
				var lawCost = cult.getDaoyunCost();
				var iSig = (cult.immortalAscended ? "A:" : "P:") + cult.riftFloor + ":" +
					(cult.daoyun || 0) + ":" + (tcVal >= 10 ? 1 : 0) + ":" +
					(xyVal >= lawCost ? 1 : 0) + ":" + Math.round(xyVal) + ":" + Math.round(xyRate * 100);
				if (this._immortalSig !== iSig){
					this._immortalSig = iSig;
					var fmtV = this.game.getDisplayValueExt.bind(this.game);
					if (!cult.immortalAscended){
						var canFly = cult.canAscendImmortal();
						this.immortalPanelEl.innerHTML =
							"<div class=\"xxImmortalHd\">" +
								"<div class=\"xxImmortalArt\"><img src=\"res/art/portrait_zhenxian.jpg\" alt=\"\"/></div>" +
								"<div class=\"xxImmortalMeta\">" +
									"<span class=\"xxImmortalBadge\">" + $I("cultivation.feisheng.badge") + "</span>" +
									"<div class=\"xxImmortalTitle\">" + $I("cultivation.feisheng.title") + "</div>" +
								"</div>" +
							"</div>" +
							"<div class=\"xxImmortalDesc\">" + $I("cultivation.feisheng.desc") + "</div>" +
							"<div class=\"xxImmortalStats\">" +
								"<span class=\"xxImmortalPill\">渡劫道果：已圆满</span>" +
								"<span class=\"xxImmortalPill\">上古秘境：" + cult.riftFloor + " / 25 层</span>" +
							"</div>" +
							"<div class=\"xxImmortalActions\">" +
								"<div class=\"xxImmortalBtn" + (canFly ? "" : " is-disabled") + "\" data-xx-immortal=\"ascend\">" +
									(canFly ? $I("cultivation.feisheng.btn.ready") : $I("cultivation.feisheng.btn.wait", [cult.riftFloor])) +
								"</div>" +
							"</div>";
					} else {
						var dy = cult.daoyun || 0;
						this.immortalPanelEl.innerHTML =
							"<div class=\"xxImmortalHd\">" +
								"<div class=\"xxImmortalArt\"><img src=\"res/art/portrait_zhenxian.jpg\" alt=\"\"/></div>" +
								"<div class=\"xxImmortalMeta\">" +
									"<span class=\"xxImmortalBadge\">" + $I("cultivation.immortal.badge") + "</span>" +
									"<div class=\"xxImmortalTitle\">" + $I("cultivation.immortal.title") + "</div>" +
								"</div>" +
							"</div>" +
							"<div class=\"xxImmortalDesc\">" + $I("cultivation.immortal.desc") + "</div>" +
							"<div class=\"xxImmortalStats\">" +
								"<span class=\"xxImmortalPill\"><img src=\"res/art/res_xianyuan.jpg\" alt=\"\"/>仙元：" + fmtV(xyObj ? xyObj.value : 0) + " (+" + fmtV(xyRate) + "/秒)</span>" +
								"<span class=\"xxImmortalPill\">法则道韵：" + dy + " 重（吐纳+" + Math.round(50 + dy * 18) + "% · 万产+" + Math.round(30 + dy * 12) + "% · 战力+" + Math.round(35 + dy * 15) + "%）</span>" +
							"</div>" +
							"<div class=\"xxImmortalActions\">" +
								"<div class=\"xxImmortalBtn" + (tcVal >= 10 ? "" : " is-disabled") + "\" data-xx-immortal=\"infuse\">" +
									$I("cultivation.immortal.infuse.btn") +
								"</div>" +
								"<div class=\"xxImmortalBtn" + (xyVal >= lawCost ? "" : " is-disabled") + "\" data-xx-immortal=\"law\">" +
									$I("cultivation.immortal.law.btn", [fmtV(lawCost)]) +
								"</div>" +
							"</div>";
					}
				}
			}
		}

		if (this.immortalCaveEl){
			var dujieCave = cult.getStage("dujie_0");
			var showCave = !!(cult.immortalAscended || (dujieCave && dujieCave.researched) || (cult.immortalImprint || 0) > 0);
			this.immortalCaveEl.style.display = showCave ? "block" : "none";
			if (showCave){
				dojo.toggleClass(this.immortalCaveEl, "is-locked", !cult.immortalAscended);
				var hg = cult.herbGarden || cult.makeDefaultHerbGarden();
				var xq = cult.xianqi || cult.makeDefaultXianqi();
				var xyPool = this.game.resPool.get("xianyuan");
				var tcPool = this.game.resPool.get("timeCrystal");
				var rlPool = this.game.resPool.get("relic");
				var uoPool = this.game.resPool.get("unobtainium");
				var cnPool = this.game.resPool.get("catnip");
				var xyHave = xyPool ? Math.floor(xyPool.value) : 0;
				var tcHave = tcPool ? Math.floor(tcPool.value) : 0;
				var rlHave = rlPool ? Math.floor(rlPool.value) : 0;
				var uoHave = uoPool ? Math.floor(uoPool.value) : 0;
				var cnHave = cnPool ? Math.floor(cnPool.value) : 0;

				var plotSigArr = [];
				for (var psi = 0; psi < 4; psi++){
					var ps = hg.plots[psi];
					plotSigArr.push(ps && ps.herbKey ? (ps.herbKey + ":" + Math.floor(ps.progress) + ":" + (ps.mature ? 1 : 0)) : "0");
				}
				var caveSig = [
					cult.immortalAscended ? 1 : 0,
					cult.daoyun || 0,
					cult.immortalImprint || 0,
					hg.plotsUnlocked,
					hg.arrayLevel,
					hg.autoTend ? 1 : 0,
					hg.selectedSeed,
					hg.daoLawProgress || 0,
					hg.daoDiscountStacks || 0,
					hg.stock.xianlan || 0,
					hg.stock.zizhi || 0,
					hg.stock.qinglian || 0,
					hg.stock.daoguo || 0,
					plotSigArr.join(","),
					xq.boundKey || "none",
					xq.stage || 0,
					xq.nurtureExp || 0,
					xyHave,
					tcHave,
					rlHave,
					uoHave,
					cnHave >= 80 ? 1 : 0,
					hg.lastNote || "",
					xq.lastNote || ""
				].join("|");

				if (this._caveSig !== caveSig){
					this._caveSig = caveSig;
					var fmtCave = this.game.getDisplayValueExt.bind(this.game);
					var artV = cult.ART_VER || "77";
					var isEn = String($I("cultivation.cave.badge") || "").indexOf("Immortal") === 0;
					var caveBns = cult.getImmortalCaveBonuses(26);
					var impBadgeHtml = (cult.immortalImprint > 0)
						? "<span class=\"xxCaveImprintTag\">" + $I("cultivation.xianqi.imprint.label", [cult.immortalImprint]) + "</span>"
						: "";
					var hdrArtKey = (xq.boundKey && artMgr && artMgr.XIANQI_ART && artMgr.XIANQI_ART[xq.boundKey])
						? artMgr.XIANQI_ART[xq.boundKey]
						: "res/art/herb_xianlan.webp";

					var caveTopHtml =
						"<div class=\"xxCaveHeader\">" +
							"<div class=\"xxCaveHeaderLeft\">" +
								"<div class=\"xxCaveHeaderIcon\"><img src=\"" + hdrArtKey + "?v=" + artV + "\" alt=\"\"/></div>" +
								"<div class=\"xxCaveTitleWrap\">" +
									"<div class=\"xxCaveBadgeRow\">" +
										"<span class=\"xxCaveBadge\">" + $I("cultivation.cave.badge") + "</span>" +
										impBadgeHtml +
									"</div>" +
									"<div class=\"xxCaveTitle\">" + $I("cultivation.cave.title") + "</div>" +
									"<div class=\"xxCaveDesc\">" + $I("cultivation.cave.desc") + "</div>" +
								"</div>" +
							"</div>" +
							"<div class=\"xxCaveSummaryChips\">" +
								"<span class=\"xxCaveSumChip\">" + (isEn ? ("Spirit Array <b>Lv." + hg.arrayLevel + "</b> (×" + cult.getGardenGrowthRate().toFixed(2) + ")") : ("聚灵阵 <b>" + hg.arrayLevel + " 阶</b> (×" + cult.getGardenGrowthRate().toFixed(2) + ")")) + "</span>" +
								"<span class=\"xxCaveSumChip\">" + (isEn ? ("Herb Stock <b>" + cult.getHerbTotalStock() + "</b>") : ("仙草库藏 <b>" + cult.getHerbTotalStock() + "</b> 株")) + "</span>" +
								"<span class=\"xxCaveSumChip\">" + (isEn ? ("Artifact Power <b>×" + caveBns.combatMult.toFixed(2) + "</b>") : ("器灵战力 <b>×" + caveBns.combatMult.toFixed(2) + "</b>")) + "</span>" +
							"</div>" +
						"</div>";

					if (!cult.immortalAscended){
						this.immortalCaveEl.innerHTML = caveTopHtml +
							"<div class=\"xxCaveLockedNotice\">" + $I("cultivation.cave.locked") + "</div>";
					} else {
						var seedCardsHtml = "<div class=\"xxSeedBar\">";
						for (var hi2 = 0; hi2 < cult.IMMORTAL_HERBS.length; hi2++){
							var hDef = cult.IMMORTAL_HERBS[hi2];
							var isSelSeed = (hg.selectedSeed === hDef.key);
							var stCnt = hg.stock[hDef.key] || 0;
							var seedCostParts = [];
							for (var sci = 0; sci < hDef.seedCost.length; sci++){
								var scObj = hDef.seedCost[sci];
								var scRes = this.game.resPool.get(scObj.name);
								seedCostParts.push(scObj.val + " " + ((scRes && scRes.title) || scObj.name));
							}
							seedCardsHtml +=
								"<div class=\"xxSeedCard" + (isSelSeed ? " is-selected" : "") + "\" data-xx-cave=\"seed\" data-xx-arg=\"" + hDef.key + "\" title=\"" + String($I(hDef.descKey)).replace(/"/g, "&quot;") + "\">" +
									"<div class=\"xxHerbIco\"><img src=\"" + hDef.art + "?v=" + artV + "\" alt=\"\"/></div>" +
									"<div class=\"xxSeedBody\">" +
										"<div class=\"xxSeedNameRow\"><span>" + $I(hDef.labelKey) + "</span><span class=\"xxSeedStock\">" + (isEn ? ("×" + stCnt) : ("库×" + stCnt)) + "</span></div>" +
										"<div class=\"xxSeedSub\">" + (isEn ? "Seed: " : "引种：") + seedCostParts.join(" · ") + "</div>" +
									"</div>" +
								"</div>";
						}
						seedCardsHtml += "</div>";

						var anyMature = false;
						var plotGridHtml = "<div class=\"xxPlotGrid\">";
						for (var pli = 0; pli < 4; pli++){
							if (pli >= hg.plotsUnlocked){
								plotGridHtml +=
									"<div class=\"xxPlotCard is-locked\">" +
										"<div class=\"xxPlotTitle\">" + (isEn ? ("Plot #" + (pli + 1) + " · Sealed") : ("第 " + (pli + 1) + " 仙圃 · 禁制未辟")) + "</div>" +
										"<div class=\"xxPlotState\">" + (isEn ? "Unseal with Immortal Essence & Flux Crystals" : "凝练仙元与光阴晶可破除仙禁") + "</div>" +
									"</div>";
							} else {
								var pl = hg.plots[pli];
								if (pl && pl.herbKey){
									var plDef = cult.getHerbDef(pl.herbKey);
									var pct = pl.maxTicks > 0 ? Math.min(100, Math.round((pl.progress / pl.maxTicks) * 100)) : 0;
									if (pl.mature){ anyMature = true; }
									plotGridHtml +=
										"<div class=\"xxPlotCard" + (pl.mature ? " is-mature" : "") + "\">" +
											"<div class=\"xxPlotTop\">" +
												"<div class=\"xxHerbIco\"><img src=\"" + (plDef ? plDef.art : "res/art/herb_xianlan.webp") + "?v=" + artV + "\" alt=\"\"/></div>" +
												"<div class=\"xxSeedBody\">" +
													"<div class=\"xxPlotTitle\">" + (plDef ? $I(plDef.labelKey) : pl.herbKey) + "</div>" +
													"<div class=\"xxPlotState\">" + (pl.mature ? (isEn ? "10,000-Year Mature · Ready" : "万年灵韵圆满 · 可采收") : (isEn ? ("Spirit Dew " + pct + "%") : ("灵雾孕育 " + pct + "%"))) + "</div>" +
												"</div>" +
											"</div>" +
											"<div class=\"xxPlotBar\"><i style=\"width:" + pct + "%\"></i></div>" +
											(pl.mature
												? "<div class=\"xxCaveMiniBtn gold\" data-xx-cave=\"harvest\" data-xx-arg=\"" + pli + "\">" + (isEn ? ("Harvest (+" + (plDef ? plDef.harvestXy : 8) + " Essence)") : ("采收仙草 (+" + (plDef ? plDef.harvestXy : 8) + " 仙元)")) + "</div>"
												: "<div class=\"xxCaveMiniBtn is-disabled\">" + (isEn ? "Condensing Spirit Dew..." : "聚灵阵凝露滋养中") + "</div>") +
										"</div>";
								} else {
									var selDef = cult.getHerbDef(hg.selectedSeed || "xianlan");
									var canPlant = cult.canAffordHerbSeed(hg.selectedSeed || "xianlan");
									plotGridHtml +=
										"<div class=\"xxPlotCard\">" +
											"<div class=\"xxPlotTop\">" +
												"<div class=\"xxHerbIco\"><img src=\"" + (selDef ? selDef.art : "res/art/herb_xianlan.webp") + "?v=" + artV + "\" alt=\"\"/></div>" +
												"<div class=\"xxSeedBody\">" +
													"<div class=\"xxPlotTitle\">" + (isEn ? ("Plot #" + (pli + 1) + " · Fertile") : ("第 " + (pli + 1) + " 仙圃 · 沃土待种")) + "</div>" +
													"<div class=\"xxPlotState\">" + (isEn ? "Selected: " : "拟种：") + (selDef ? $I(selDef.labelKey) : "") + "</div>" +
												"</div>" +
											"</div>" +
											"<div class=\"xxCaveMiniBtn" + (canPlant ? "" : " is-disabled") + "\" data-xx-cave=\"plant\" data-xx-arg=\"" + pli + "\">" + (isEn ? "Sow Immortal Seed" : "播撒仙种") + "</div>" +
										"</div>";
								}
							}
						}
						plotGridHtml += "</div>";

						var expCost = cult.getPlotExpandCost();
						var arrCost = cult.getSpiritArrayCost();
						var canExpand = !!(expCost && xyHave >= expCost.xianyuan && tcHave >= expCost.timeCrystal);
						var canArr = !!(arrCost && xyHave >= arrCost.xianyuan && rlHave >= arrCost.relic);

						var gardenBtnsHtml =
							"<div class=\"xxCaveMiniBtnRow\">" +
								"<div class=\"xxCaveMiniBtn\" data-xx-cave=\"autoTend\">" +
									$I(hg.autoTend ? "cultivation.garden.autotend.on" : "cultivation.garden.autotend.off") +
								"</div>" +
								"<div class=\"xxCaveMiniBtn gold" + (anyMature ? "" : " is-disabled") + "\" data-xx-cave=\"harvestAll\">" +
									$I("cultivation.garden.harvestall") +
								"</div>" +
							"</div>" +
							"<div class=\"xxCaveMiniBtnRow\" style=\"margin-top:6px;\">" +
								(arrCost
									? "<div class=\"xxCaveMiniBtn" + (canArr ? "" : " is-disabled") + "\" data-xx-cave=\"array\">" + $I("cultivation.garden.array.btn", [fmtCave(arrCost.xianyuan), fmtCave(arrCost.relic)]) + "</div>"
									: "<div class=\"xxCaveMiniBtn is-disabled\">" + $I("cultivation.garden.array.max") + "</div>") +
								(expCost
									? "<div class=\"xxCaveMiniBtn" + (canExpand ? "" : " is-disabled") + "\" data-xx-cave=\"expand\">" + $I("cultivation.garden.expand.btn", [expCost.nextPlot, fmtCave(expCost.xianyuan), fmtCave(expCost.timeCrystal)]) + "</div>"
									: "<div class=\"xxCaveMiniBtn is-disabled\">" + $I("cultivation.garden.expand.max") + "</div>") +
							"</div>";

						var infuseHtml =
							"<div class=\"xxInfuseShelf\">" +
								"<div class=\"xxCaveSecMeta\">" + (isEn ? ("Infuse Herbs into Alchemy & Dao Resonance (" + (hg.daoLawProgress || 0) + "/100)") : ("仙草入丹反哺（炼化库存仙草：涤丹毒 · 凝极品灵丹 · 积道韵感悟 " + (hg.daoLawProgress || 0) + "/100）")) + "</div>" +
								"<div class=\"xxInfuseRow\">";
						for (var infi = 0; infi < cult.IMMORTAL_HERBS.length; infi++){
							var ih = cult.IMMORTAL_HERBS[infi];
							var ihStock = hg.stock[ih.key] || 0;
							infuseHtml +=
								"<div class=\"xxCaveMiniBtn" + (ihStock > 0 ? "" : " is-disabled") + "\" data-xx-cave=\"infuseHerb\" data-xx-arg=\"" + ih.key + "\">" +
									(isEn ? ("Infuse " + $I(ih.labelKey) + " (×" + ihStock + ")") : ("炼化" + $I(ih.labelKey) + " (×" + ihStock + ")")) +
								"</div>";
						}
						infuseHtml += "</div></div>";

						var gardenColHtml =
							"<div class=\"xxCaveSection xxCaveColGarden\">" +
								"<div class=\"xxCaveSecHd\">" +
									"<span class=\"xxCaveSecTitle\">" + $I("cultivation.garden.title") + "</span>" +
									"<span class=\"xxCaveSecMeta\">" + (isEn ? ("Plots " + hg.plotsUnlocked + "/4 · Harvested " + (hg.totalHarvested || 0)) : ("仙圃 " + hg.plotsUnlocked + "/4 · 累计采收 " + (hg.totalHarvested || 0))) + "</span>" +
								"</div>" +
								seedCardsHtml +
								plotGridHtml +
								gardenBtnsHtml +
								infuseHtml +
								(hg.lastNote ? "<div class=\"xxCaveNote\">" + hg.lastNote + "</div>" : "") +
							"</div>";

						var xqGridHtml = "<div class=\"xxXianqiGrid\">";
						for (var xqi = 0; xqi < cult.IMMORTAL_ARTIFACTS.length; xqi++){
							var xDef = cult.IMMORTAL_ARTIFACTS[xqi];
							var isBound = (xq.boundKey === xDef.key && xq.stage > 0);
							var bCost = cult.getBindXianqiCost(xDef.key);
							var bHint = isBound ? (isEn ? "Natal Bound" : "本命已认主") : ((xq.stage > 0 ? $I("cultivation.xianqi.switch.btn", [bCost]) : $I("cultivation.xianqi.bind.btn", [bCost])));
							xqGridHtml +=
								"<div class=\"xxXianqiCard" + (isBound ? " is-bound" : "") + "\" data-xx-cave=\"bindXianqi\" data-xx-arg=\"" + xDef.key + "\" title=\"" + String($I(xDef.descKey)).replace(/"/g, "&quot;") + "\">" +
									"<div class=\"xxXianqiIco\"><img src=\"" + xDef.art + "?v=" + artV + "\" alt=\"\"/></div>" +
									"<div class=\"xxXianqiMeta\">" +
										"<div class=\"xxXianqiName\">" + $I(xDef.labelKey) + "</div>" +
										"<div class=\"xxXianqiTag\">" + (isEn ? (xDef.tagEn || xDef.tag) : xDef.tag) + "</div>" +
										"<div class=\"xxPlotState\">" + bHint + "</div>" +
									"</div>" +
								"</div>";
						}
						xqGridHtml += "</div>";

						var boundDef = xq.boundKey ? cult.getImmortalArtifactDef(xq.boundKey) : null;
						var curStCfg = cult.XIANQI_STAGES[xq.stage || 0] || cult.XIANQI_STAGES[0];
						var refReq = cult.getXianqiRefineReq();
						var nurtCost = cult.getNurtureXianqiCost();
						var canNurture = !!(boundDef && xq.stage > 0 && xq.nurtureExp < 100 && xyHave >= nurtCost);

						var stageBoxHtml =
							"<div class=\"xxXianqiStageBox\">" +
								"<div class=\"xxXianqiStageTop\">" +
									"<span>" + (boundDef ? ($I(boundDef.labelKey) + " · " + (isEn ? (curStCfg.titleEn || curStCfg.title) : curStCfg.title)) : (isEn ? "Select an Immortal Artifact archetype above to bind" : "请选择上方一尊仙器道胎祭炼认主")) + "</span>" +
									(boundDef ? "<span>" + (isEn ? ("Nurture " + (xq.nurtureExp || 0) + "%") : ("温养度 " + (xq.nurtureExp || 0) + "%")) + "</span>" : "") +
								"</div>" +
								"<div class=\"xxXianqiStageDesc\">" +
									(boundDef ? $I(boundDef.descKey) : (isEn ? "Bind a Natal Immortal Artifact to refine across 6 stages and awaken 3 Spirit Resonance passives." : "认主本命仙器后，可耗仙元、万年仙草、太虚仙金/光阴晶与法则道韵逐阶祭炼，觉醒三重器灵共鸣被动。")) +
								"</div>" +
								(boundDef ? (
									"<div class=\"xxXianqiNurtureWrap\">" +
										"<div class=\"xxPlotBar\"><i style=\"width:" + (xq.nurtureExp || 0) + "%\"></i></div>" +
									"</div>"
								) : "") +
							"</div>";

						var passives = cult.getActiveResonancePassives();
						var passivesHtml = "";
						if (passives.length){
							passivesHtml = "<div class=\"xxXianqiPassiveList\">";
							for (var pvi = 0; pvi < passives.length; pvi++){
								var pv = passives[pvi];
								passivesHtml +=
									"<div class=\"xxXianqiPassiveItem" + (pv.unlocked ? " is-active" : "") + "\">" +
										"<b>[" + (isEn ? ("Tier " + pv.tier + " · " + (pv.titleEn || pv.title)) : (pv.tier + "阶共鸣 · " + pv.title)) + "]</b> " + (isEn ? (pv.descEn || pv.desc) : pv.desc) +
									"</div>";
							}
							passivesHtml += "</div>";
						}

						var xqBtnsHtml = "";
						if (boundDef && xq.stage > 0){
							var orePart = "";
							if (refReq && refReq.oreRes && refReq.oreVal > 0){
								var oreResObj = this.game.resPool.get(refReq.oreRes);
								orePart = " · " + ((oreResObj && oreResObj.title) || refReq.oreRes) + "×" + fmtCave(refReq.oreVal) + " · " + (isEn ? ("Dao≥" + refReq.reqDaoyun) : ("道韵≥" + refReq.reqDaoyun));
							}
							xqBtnsHtml =
								"<div class=\"xxCaveMiniBtnRow\">" +
									"<div class=\"xxCaveMiniBtn" + (canNurture ? "" : " is-disabled") + "\" data-xx-cave=\"nurtureXianqi\">" +
										(xq.nurtureExp >= 100 ? (isEn ? "Spirit Nurtured 100% (-25% Cost)" : "器灵温养已圆满（破阶减耗25%）") : $I("cultivation.xianqi.nurture.btn", [nurtCost])) +
									"</div>" +
									(refReq
										? "<div class=\"xxCaveMiniBtn gold" + (refReq.affordable ? "" : " is-disabled") + "\" data-xx-cave=\"refineXianqi\">" +
											$I("cultivation.xianqi.refine.btn", [isEn ? (refReq.titleEn || refReq.title) : refReq.title, fmtCave(refReq.xianyuan), refReq.herbs]) + orePart +
										"</div>"
										: "<div class=\"xxCaveMiniBtn gold is-disabled\">" + (isEn ? "Stage 6 Supreme Creation · Maxed" : "六阶造化至尊仙器 · 已臻极致") + "</div>") +
								"</div>";
						}

						var xianqiColHtml =
							"<div class=\"xxCaveSection xxCaveColXianqi\">" +
								"<div class=\"xxCaveSecHd\">" +
									"<span class=\"xxCaveSecTitle gold\">" + $I("cultivation.xianqi.title") + "</span>" +
									"<span class=\"xxCaveSecMeta\">" + (isEn ? ("26F-35F Dmg +" + Math.round((caveBns.riftDmgMult - 1) * 100) + "% · Mitig " + Math.round(caveBns.riftMitigation * 100) + "%") : ("26~35层增伤 +" + Math.round((caveBns.riftDmgMult - 1) * 100) + "% · 减伤 " + Math.round(caveBns.riftMitigation * 100) + "%")) + "</span>" +
								"</div>" +
								xqGridHtml +
								stageBoxHtml +
								passivesHtml +
								xqBtnsHtml +
								(xq.lastNote ? "<div class=\"xxCaveNote\">" + xq.lastNote + "</div>" : "") +
							"</div>";

						this.immortalCaveEl.innerHTML = caveTopHtml +
							"<div class=\"xxCaveColumns\">" + gardenColHtml + xianqiColHtml + "</div>";
					}
				}
			}
		}

		if (this.immortalSanctumEl){
			var dujieSanctum = cult.getStage("dujie_0");
			var showSanctum = !!(cult.immortalAscended || (dujieSanctum && dujieSanctum.researched) || (cult.immortalImprint || 0) > 0 || (cult.starImprintTier || 0) > 0);
			this.immortalSanctumEl.style.display = showSanctum ? "block" : "none";
			if (showSanctum){
				dojo.toggleClass(this.immortalSanctumEl, "is-locked", !cult.immortalAscended);
				var saUI = cult.starArray || cult.makeDefaultStarArray();
				var ibUI = cult.immortalBounty || cult.makeDefaultImmortalBounty();
				var xyS = this.game.resPool.get("xianyuan");
				var scS = this.game.resPool.get("starchart");
				var tcS = this.game.resPool.get("timeCrystal");
				var rlS = this.game.resPool.get("relic");
				var uoS = this.game.resPool.get("unobtainium");
				var xyHaveS = xyS ? Math.floor(xyS.value) : 0;
				var scHaveS = scS ? Math.floor(scS.value) : 0;
				var tcHaveS = tcS ? Math.floor(tcS.value) : 0;
				var rlHaveS = rlS ? Math.floor(rlS.value) : 0;
				var uoHaveS = uoS ? Math.floor(uoS.value) : 0;
				var actB = ibUI.active;
				var actSig = actB ? (actB.key + ":" + Math.floor(actB.progress) + ":" + (actB.ready ? 1 : 0)) : "idle";
				var surgeTicks = (cult.buffs && cult.buffs.zhoutianSurge > 0) ? Math.floor(cult.buffs.zhoutianSurge / 5) : 0;

				var sanctumSig = [
					cult.immortalAscended ? 1 : 0,
					cult.daoyun || 0,
					cult.riftFloor || 0,
					cult.starImprintTier || 0,
					saUI.tier || 0,
					saUI.selectedCore || "ziwei",
					(saUI.sockets || []).join(","),
					saUI.cores.ziwei || 0,
					saUI.cores.taiyang || 0,
					saUI.cores.taiyin || 0,
					Math.floor(saUI.raidThreat || 0),
					saUI.repelCount || 0,
					saUI.autoRepel ? 1 : 0,
					surgeTicks,
					ibUI.merit || 0,
					ibUI.completedCount || 0,
					ibUI.chainChapter || 1,
					(ibUI.boardKeys || []).join(","),
					ibUI.freeRefreshReady ? 1 : 0,
					ibUI.autoDispatch ? 1 : 0,
					actSig,
					xyHaveS,
					scHaveS,
					tcHaveS,
					rlHaveS,
					uoHaveS,
					saUI.lastNote || "",
					ibUI.lastNote || ""
				].join("|");

				if (this._sanctumSig !== sanctumSig){
					this._sanctumSig = sanctumSig;
					var fmtSanctum = this.game.getDisplayValueExt.bind(this.game);
					var artV2 = cult.ART_VER || "77";
					var caveB2 = cult.getImmortalCaveBonuses(28);
					var wardPow = cult.getStarArrayDefensePower();
					var threatPow = cult.getNextDemonRaidPower();
					var sealBadge = (cult.starImprintTier > 0)
						? "<span class=\"xxCaveImprintTag\">" + $I("cultivation.sanctum.starimprint", [cult.starImprintTier]) + "</span>"
						: "";

					var sanctumTopHtml =
						"<div class=\"xxCaveHeader\">" +
							"<div class=\"xxCaveHeaderLeft\">" +
								"<div class=\"xxCaveHeaderIcon xxSanctumHdrIco\"><img src=\"res/art/array_zhoutian_core.webp?v=" + artV2 + "\" alt=\"\"/></div>" +
								"<div class=\"xxCaveTitleWrap\">" +
									"<div class=\"xxCaveBadgeRow\">" +
										"<span class=\"xxCaveBadge\">" + $I("cultivation.sanctum.badge") + "</span>" +
										sealBadge +
									"</div>" +
									"<div class=\"xxCaveTitle\">" + $I("cultivation.sanctum.title") + "</div>" +
									"<div class=\"xxCaveDesc\">" + $I("cultivation.sanctum.desc") + "</div>" +
								"</div>" +
							"</div>" +
							"<div class=\"xxCaveSummaryChips\">" +
								"<span class=\"xxCaveSumChip\">" + $I("cultivation.sanctum.chip.array", [saUI.tier || 0, wardPow]) + "</span>" +
								"<span class=\"xxCaveSumChip\">" + $I("cultivation.sanctum.chip.cores", [cult.getStarCoreTotalStock()]) + "</span>" +
								"<span class=\"xxCaveSumChip\">" + $I("cultivation.sanctum.chip.merit", [ibUI.merit || 0, ibUI.chainChapter || 1]) + "</span>" +
							"</div>" +
						"</div>";

					if (!cult.immortalAscended){
						this.immortalSanctumEl.innerHTML = sanctumTopHtml +
							"<div class=\"xxCaveLockedNotice\">" + $I("cultivation.sanctum.locked") + "</div>";
					} else {
						// 左栏: 周天星斗护山大阵 (星核凝炼选择 + 三垣阵眼镶嵌 + 阵图推演1~6阶 + 域外天魔侵袭迎击)
						var coreShelfHtml = "<div class=\"xxStarCoreBar\">";
						for (var sci2 = 0; sci2 < cult.STAR_CORES.length; sci2++){
							var scDef2 = cult.STAR_CORES[sci2];
							var isSelCore = (saUI.selectedCore === scDef2.key);
							var coreCnt = saUI.cores[scDef2.key] || 0;
							var condReq = cult.getCondenseStarCoreCost(scDef2.key);
							var auxResObj = (condReq && condReq.auxRes) ? this.game.resPool.get(condReq.auxRes) : null;
							var condCostTxt = condReq ? (condReq.xianyuan + " " + $I("resources.xianyuan.title") + " · " + condReq.auxVal + " " + ((auxResObj && auxResObj.title) || condReq.auxRes)) : "";
							coreShelfHtml +=
								"<div class=\"xxStarCoreCard" + (isSelCore ? " is-selected" : "") + "\" data-xx-sanctum=\"selectCore\" data-xx-arg=\"" + scDef2.key + "\" title=\"" + String($I(scDef2.descKey)).replace(/"/g, "&quot;") + "\">" +
									"<div class=\"xxStarCoreTop\">" +
										"<div class=\"xxHerbIco xxStarCoreIco\"><img src=\"" + scDef2.art + "?v=" + artV2 + "\" alt=\"\"/></div>" +
										"<div class=\"xxSeedBody\">" +
											"<div class=\"xxSeedNameRow\"><span>" + $I(scDef2.labelKey) + "</span><span class=\"xxSeedStock\">×" + coreCnt + "</span></div>" +
											"<div class=\"xxSeedSub\">" + $I(scDef2.descKey) + "</div>" +
										"</div>" +
									"</div>" +
									"<div class=\"xxCaveMiniBtn" + (condReq && condReq.affordable ? "" : " is-disabled") + "\" data-xx-sanctum=\"condenseCore\" data-xx-arg=\"" + scDef2.key + "\">" +
										$I("cultivation.zhoutian.condense.btn", [$I(scDef2.labelKey), condCostTxt]) +
									"</div>" +
								"</div>";
						}
						coreShelfHtml += "</div>";

						var curTierCfg = cult.ZHOUTIAN_TIERS[saUI.tier || 0] || cult.ZHOUTIAN_TIERS[0];
						var selCoreDef = cult.getStarCoreDef(saUI.selectedCore || "ziwei");
						var socketGridHtml = "<div class=\"xxSocketGrid\">";
						for (var ski = 0; ski < 3; ski++){
							var reqTierUnlock = ski + 1;
							var sockTitle = $I("cultivation.zhoutian.socket." + ski);
							if (ski >= (curTierCfg.socketsOpen || 0)){
								socketGridHtml +=
									"<div class=\"xxSocketCard is-locked\">" +
										"<div class=\"xxPlotTitle\">" + sockTitle + "</div>" +
										"<div class=\"xxPlotState\">" + $I("cultivation.zhoutian.socket.locked", [reqTierUnlock]) + "</div>" +
									"</div>";
							} else {
								var inKey = saUI.sockets[ski];
								var inDef = inKey ? cult.getStarCoreDef(inKey) : null;
								var canSocketSel = ((saUI.cores[saUI.selectedCore || "ziwei"] || 0) > 0);
								socketGridHtml +=
									"<div class=\"xxSocketCard" + (inDef ? " is-socketed" : "") + "\">" +
										"<div class=\"xxPlotTop\">" +
											"<div class=\"xxHerbIco xxStarCoreIco\"><img src=\"" + (inDef ? inDef.art : (selCoreDef ? selCoreDef.art : "res/art/starcore_ziwei.webp")) + "?v=" + artV2 + "\" alt=\"\"/></div>" +
											"<div class=\"xxSeedBody\">" +
												"<div class=\"xxPlotTitle\">" + sockTitle + "</div>" +
												"<div class=\"xxPlotState\">" + (inDef ? $I(inDef.labelKey) : $I("cultivation.zhoutian.socket.empty", [selCoreDef ? $I(selCoreDef.labelKey) : ""])) + "</div>" +
											"</div>" +
										"</div>" +
										(inDef
											? "<div class=\"xxCaveMiniBtnRow\">" +
												"<div class=\"xxCaveMiniBtn\" data-xx-sanctum=\"socketCore\" data-xx-arg=\"" + ski + "\">" + $I("cultivation.zhoutian.socket.swap") + "</div>" +
											"</div>"
											: "<div class=\"xxCaveMiniBtn gold" + (canSocketSel ? "" : " is-disabled") + "\" data-xx-sanctum=\"socketCore\" data-xx-arg=\"" + ski + "\">" + $I("cultivation.zhoutian.socket.inlay") + "</div>") +
									"</div>";
							}
						}
						socketGridHtml += "</div>";

						var triHarmony = cult.hasTriStarHarmony();
						var deduceReq = cult.getStarArrayDeduceReq();
						var deduceCostParts = [];
						if (deduceReq){
							deduceCostParts.push(fmtSanctum(deduceReq.xianyuan) + " " + $I("resources.xianyuan.title"));
							if (deduceReq.starchart > 0){
								var scObjLbl = this.game.resPool.get("starchart");
								deduceCostParts.push(fmtSanctum(deduceReq.starchart) + " " + ((scObjLbl && scObjLbl.title) || "starchart"));
							}
							if (deduceReq.auxRes && deduceReq.auxVal > 0){
								var auxObjLbl = this.game.resPool.get(deduceReq.auxRes);
								deduceCostParts.push(fmtSanctum(deduceReq.auxVal) + " " + ((auxObjLbl && auxObjLbl.title) || deduceReq.auxRes));
							}
							if (deduceReq.reqDaoyun > 0){
								deduceCostParts.push($I("cultivation.zhoutian.req.dao", [deduceReq.reqDaoyun]));
							}
						}

						var arrayDiagramHtml =
							"<div class=\"xxXianqiStageBox xxZhoutianBox\">" +
								"<div class=\"xxXianqiStageTop\">" +
									"<span>" + $I(curTierCfg.titleKey) + "</span>" +
									"<span>" + $I("cultivation.sanctum.chip.array", [saUI.tier || 0, wardPow]) + "</span>" +
								"</div>" +
								"<div class=\"xxHarmonyBanner" + (triHarmony ? " is-active" : "") + "\">" +
									$I(triHarmony ? "cultivation.zhoutian.harmony.on" : "cultivation.zhoutian.harmony.off") +
								"</div>" +
								"<div class=\"xxCaveMiniBtnRow\" style=\"margin-top:7px;\">" +
									(deduceReq
										? "<div class=\"xxCaveMiniBtn gold" + (deduceReq.affordable ? "" : " is-disabled") + "\" data-xx-sanctum=\"deduceArray\">" +
											$I("cultivation.zhoutian.deduce.btn", [$I(deduceReq.titleKey), deduceCostParts.join(" · ")]) +
										"</div>"
										: "<div class=\"xxCaveMiniBtn gold is-disabled\">" + $I("cultivation.zhoutian.deduce.max") + "</div>") +
								"</div>" +
							"</div>";

						var threatPct = Math.min(100, Math.round(saUI.raidThreat || 0));
						var lureCost = cult.getDemonRaidLureCost();
						var canRepelFree = (saUI.tier > 0 && threatPct >= 100);
						var canRepelLure = (saUI.tier > 0 && threatPct < 100 && xyHaveS >= lureCost);
						var raidBtnLabel = (saUI.tier <= 0)
							? $I("cultivation.raid.repel.needarray")
							: (threatPct >= 100 ? $I("cultivation.raid.repel.ready") : $I("cultivation.raid.repel.lure", [lureCost]));

						var raidPanelHtml =
							"<div class=\"xxRaidPanel" + (threatPct >= 100 ? " is-alert" : "") + "\">" +
								"<div class=\"xxPlotTop\">" +
									"<div class=\"xxHerbIco xxRaidIco\"><img src=\"res/art/demon_tianmo_raid.webp?v=" + artV2 + "\" alt=\"\"/></div>" +
									"<div class=\"xxSeedBody\">" +
										"<div class=\"xxPlotTitle\">" + $I("cultivation.raid.title") + "</div>" +
										"<div class=\"xxPlotState\">" + $I("cultivation.raid.threat", [threatPct, wardPow, threatPow, saUI.repelCount || 0]) + "</div>" +
									"</div>" +
								"</div>" +
								"<div class=\"xxPlotBar xxRaidBar\"><i style=\"width:" + threatPct + "%\"></i></div>" +
								(cult.buffs && cult.buffs.zhoutianSurge > 0
									? "<div class=\"xxSurgeTag\">" + $I("cultivation.raid.surge.active", [cult.buffs.zhoutianSurge]) + "</div>"
									: "") +
								"<div class=\"xxCaveMiniBtnRow\">" +
									"<div class=\"xxCaveMiniBtn gold" + ((canRepelFree || canRepelLure) ? "" : " is-disabled") + "\" data-xx-sanctum=\"repelRaid\">" +
										raidBtnLabel +
									"</div>" +
									"<div class=\"xxCaveMiniBtn" + (saUI.tier > 0 ? "" : " is-disabled") + "\" data-xx-sanctum=\"autoRepel\">" +
										$I(saUI.autoRepel ? "cultivation.raid.auto.on" : "cultivation.raid.auto.off") +
									"</div>" +
								"</div>" +
							"</div>";

						var zhoutianColHtml =
							"<div class=\"xxCaveSection xxSanctumColArray\">" +
								"<div class=\"xxCaveSecHd\">" +
									"<span class=\"xxCaveSecTitle\">" + $I("cultivation.zhoutian.title") + "</span>" +
									"<span class=\"xxCaveSecMeta\">" + $I("cultivation.zhoutian.meta", [Math.round(caveB2.xianyuanRatio * 100), Math.round((caveB2.riftDmgMult - 1) * 100), Math.round(caveB2.riftMitigation * 100)]) + "</span>" +
								"</div>" +
								arrayDiagramHtml +
								socketGridHtml +
								coreShelfHtml +
								raidPanelHtml +
								(saUI.lastNote ? "<div class=\"xxCaveNote\">" + saUI.lastNote + "</div>" : "") +
							"</div>";

						// 右栏: 跨界仙盟 · 奇遇悬赏榜 (活跃跨界奇遇抉择 + 3选1轮换悬赏榜 + 仙盟功勋宝库)
						var refCost = cult.getBountyRefreshCost();
						var canRefresh = (refCost <= 0 || xyHaveS >= refCost);
						var bountyCtrlHtml =
							"<div class=\"xxCaveMiniBtnRow\" style=\"margin-bottom:8px;\">" +
								"<div class=\"xxCaveMiniBtn" + (canRefresh ? "" : " is-disabled") + "\" data-xx-sanctum=\"refreshBounty\">" +
									(refCost <= 0 ? $I("cultivation.bounty.refresh.free") : $I("cultivation.bounty.refresh.paid", [refCost])) +
								"</div>" +
								"<div class=\"xxCaveMiniBtn\" data-xx-sanctum=\"autoBounty\">" +
									$I(ibUI.autoDispatch ? "cultivation.bounty.auto.on" : "cultivation.bounty.auto.off") +
								"</div>" +
							"</div>";

						var activeBountyHtml = "";
						if (actB){
							var actDef = cult.getBountyDef(actB.key);
							var actPct = actB.maxTicks > 0 ? Math.min(100, Math.round((actB.progress / actB.maxTicks) * 100)) : 100;
							var boostCost = cult.getBountyBoostCost();
							var canBoost = (!actB.ready && actPct < 100 && xyHaveS >= boostCost);
							var affCoreDef = actDef ? cult.getStarCoreDef(actDef.coreKey) : null;
							activeBountyHtml =
								"<div class=\"xxActiveBountyBox" + (actB.ready ? " is-ready" : "") + "\">" +
									"<div class=\"xxPlotTop\">" +
										"<div class=\"xxHerbIco xxBountyIco\"><img src=\"res/art/bounty_scroll_gold.webp?v=" + artV2 + "\" alt=\"\"/></div>" +
										"<div class=\"xxSeedBody\">" +
											"<div class=\"xxPlotTitle\">" + (actDef ? $I(actDef.labelKey) : actB.key) + "</div>" +
											"<div class=\"xxPlotState\">" + $I("cultivation.bounty.active.tag", [actPct]) + " · " + $I("cultivation.bounty.synergy", [Math.round((actB.synergyMult || 1) * 100)]) + "</div>" +
										"</div>" +
									"</div>" +
									"<div class=\"xxPlotBar\"><i style=\"width:" + actPct + "%\"></i></div>" +
									(actB.ready
										? "<div class=\"xxCaveMiniBtnRow\">" +
											"<div class=\"xxCaveMiniBtn gold\" data-xx-sanctum=\"completeBounty\" data-xx-arg=\"core\">" +
												$I("cultivation.bounty.resolve.core", [affCoreDef ? $I(affCoreDef.labelKey) : ""]) +
											"</div>" +
											"<div class=\"xxCaveMiniBtn\" data-xx-sanctum=\"completeBounty\" data-xx-arg=\"dao\">" +
												$I("cultivation.bounty.resolve.dao") +
											"</div>" +
										"</div>"
										: "<div class=\"xxCaveMiniBtnRow\">" +
											"<div class=\"xxCaveMiniBtn" + (canBoost ? "" : " is-disabled") + "\" data-xx-sanctum=\"boostBounty\">" +
												$I("cultivation.bounty.boost.btn", [boostCost]) +
											"</div>" +
										"</div>") +
								"</div>";
						}

						var boardListHtml = "<div class=\"xxBountyBoard\">";
						for (var bbi = 0; bbi < ibUI.boardKeys.length; bbi++){
							var bKey = ibUI.boardKeys[bbi];
							var bDef2 = cult.getBountyDef(bKey);
							if (!bDef2){ continue; }
							var synInfo = cult.getBountySynergy(bKey);
							var estXy = Math.round(bDef2.baseXy * synInfo.mult);
							var estMerit = Math.round(bDef2.baseMerit * synInfo.mult);
							var cAff = cult.getStarCoreDef(bDef2.coreKey);
							var isRunningThis = !!(actB && actB.key === bKey);
							boardListHtml +=
								"<div class=\"xxBountyCard" + (isRunningThis ? " is-active" : "") + "\">" +
									"<div class=\"xxPlotTop\">" +
										"<div class=\"xxHerbIco xxBountyIco\"><img src=\"" + bDef2.art + "?v=" + artV2 + "\" alt=\"\"/></div>" +
										"<div class=\"xxSeedBody\">" +
											"<div class=\"xxSeedNameRow\">" +
												"<span>" + $I(bDef2.labelKey) + "</span>" +
												"<span class=\"xxBountySynBadge\">" + $I("cultivation.bounty.synergy", [synInfo.pct]) + "</span>" +
											"</div>" +
											"<div class=\"xxBountyDesc\">" + $I(bDef2.descKey) + "</div>" +
											"<div class=\"xxBountyRewardRow\">" +
												"<span>+" + estXy + " " + $I("resources.xianyuan.title") + "</span>" +
												"<span>" + $I("cultivation.bounty.reward.merit", [estMerit]) + "</span>" +
												"<span>" + (cAff ? $I(cAff.labelKey) : "") + "</span>" +
											"</div>" +
										"</div>" +
									"</div>" +
									"<div class=\"xxCaveMiniBtn gold" + (actB ? " is-disabled" : "") + "\" data-xx-sanctum=\"dispatchBounty\" data-xx-arg=\"" + bbi + "\">" +
										$I("cultivation.bounty.dispatch.btn") +
									"</div>" +
								"</div>";
						}
						boardListHtml += "</div>";

						var meritHave = ibUI.merit || 0;
						var costCoreM = cult.getMeritExchangeCost("core");
						var costDaoM = cult.getMeritExchangeCost("daoyun");
						var costChestM = cult.getMeritExchangeCost("chest");
						var shopHtml =
							"<div class=\"xxMeritShop\">" +
								"<div class=\"xxPlotTop\" style=\"margin-bottom:6px;\">" +
									"<div class=\"xxHerbIco xxBountyIco\"><img src=\"res/art/bounty_chest_merit.webp?v=" + artV2 + "\" alt=\"\"/></div>" +
									"<div class=\"xxSeedBody\">" +
										"<div class=\"xxPlotTitle\">" + $I("cultivation.bounty.shop.title", [meritHave]) + "</div>" +
									"</div>" +
								"</div>" +
								"<div class=\"xxMeritBtnGrid\">" +
									"<div class=\"xxCaveMiniBtn" + (meritHave >= costCoreM ? "" : " is-disabled") + "\" data-xx-sanctum=\"exchangeMerit\" data-xx-arg=\"core\">" +
										$I("cultivation.bounty.shop.core", [selCoreDef ? $I(selCoreDef.labelKey) : "", costCoreM]) +
									"</div>" +
									"<div class=\"xxCaveMiniBtn gold" + (meritHave >= costDaoM ? "" : " is-disabled") + "\" data-xx-sanctum=\"exchangeMerit\" data-xx-arg=\"daoyun\">" +
										$I("cultivation.bounty.shop.daoyun", [costDaoM]) +
									"</div>" +
									"<div class=\"xxCaveMiniBtn" + (meritHave >= costChestM ? "" : " is-disabled") + "\" data-xx-sanctum=\"exchangeMerit\" data-xx-arg=\"chest\">" +
										$I("cultivation.bounty.shop.chest", [costChestM]) +
									"</div>" +
								"</div>" +
							"</div>";

						var bountyColHtml =
							"<div class=\"xxCaveSection xxSanctumColBounty\">" +
								"<div class=\"xxCaveSecHd\">" +
									"<span class=\"xxCaveSecTitle gold\"><img src=\"res/art/bounty_alliance_token.webp?v=" + artV2 + "\" class=\"xxInlineSanctumIco\" alt=\"\"/>" + $I("cultivation.bounty.title") + "</span>" +
									"<span class=\"xxCaveSecMeta\">" + $I("cultivation.bounty.meta", [ibUI.completedCount || 0, (ibUI.completedCount || 0) % 3]) + "</span>" +
								"</div>" +
								bountyCtrlHtml +
								activeBountyHtml +
								boardListHtml +
								shopHtml +
								(ibUI.lastNote ? "<div class=\"xxCaveNote\">" + ibUI.lastNote + "</div>" : "") +
							"</div>";

						this.immortalSanctumEl.innerHTML = sanctumTopHtml +
							"<div class=\"xxCaveColumns\">" + zhoutianColHtml + bountyColHtml + "</div>";
					}
				}
			}
		}

		if (this.immortalMenagerieEl){
			var dujieMenagerie = cult.getStage("dujie_0");
			var showMenagerie = !!(cult.immortalAscended || (dujieMenagerie && dujieMenagerie.researched) || (cult.immortalImprint || 0) > 0 || (cult.starImprintTier || 0) > 0 || (cult.beastImprintTier || 0) > 0);
			this.immortalMenagerieEl.style.display = showMenagerie ? "block" : "none";
			if (showMenagerie){
				dojo.toggleClass(this.immortalMenagerieEl, "is-locked", !cult.immortalAscended);
				var snUI = cult.spiritNursery || cult.makeDefaultSpiritNursery();
				var sfUI = cult.daoSteleForest || cult.makeDefaultDaoSteleForest();
				var xyM = this.game.resPool.get("xianyuan");
				var scM = this.game.resPool.get("starchart");
				var tcM = this.game.resPool.get("timeCrystal");
				var rlM = this.game.resPool.get("relic");
				var uoM = this.game.resPool.get("unobtainium");
				var xyHaveM = xyM ? Math.floor(xyM.value) : 0;
				var scHaveM = scM ? Math.floor(scM.value) : 0;
				var tcHaveM = tcM ? Math.floor(tcM.value) : 0;
				var rlHaveM = rlM ? Math.floor(rlM.value) : 0;
				var uoHaveM = uoM ? Math.floor(uoM.value) : 0;
				var herbStockM = cult.getHerbTotalStock();
				var pillStockM = cult.getTotalPillStock();

				var beastSigParts = [];
				for (var bsi = 0; bsi < cult.PRIMORDIAL_BEASTS.length; bsi++){
					var bsk = cult.PRIMORDIAL_BEASTS[bsi].key;
					var bso = snUI.beasts[bsk] || {incubating: false, incTicks: 0, stage: 0, exp: 0};
					beastSigParts.push(bsk + ":" + (bso.incubating ? 1 : 0) + ":" + Math.floor(bso.incTicks || 0) + ":" + (bso.stage || 0) + ":" + Math.floor(bso.exp || 0));
				}
				var steleSigParts = [];
				for (var ssi = 0; ssi < cult.DAO_STELES.length; ssi++){
					var ssk = cult.DAO_STELES[ssi].key;
					steleSigParts.push(ssk + ":" + (sfUI.levels[ssk] || 0));
				}

				var menagerieSig = [
					cult.immortalAscended ? 1 : 0,
					cult.daoyun || 0,
					cult.beastImprintTier || 0,
					snUI.selectedBeast || "azure_dragon",
					snUI.battleBeastKey || "",
					snUI.gardenBeastKey || "",
					snUI.autoNurture ? 1 : 0,
					beastSigParts.join(","),
					steleSigParts.join(","),
					herbStockM,
					pillStockM,
					xyHaveM,
					scHaveM,
					tcHaveM,
					rlHaveM,
					uoHaveM,
					snUI.lastNote || "",
					sfUI.lastNote || ""
				].join("|");

				if (this._menagerieSig !== menagerieSig){
					this._menagerieSig = menagerieSig;
					var fmtMenag = this.game.getDisplayValueExt.bind(this.game);
					var artV3 = cult.ART_VER || "77";
					var caveB3 = cult.getImmortalCaveBonuses(30);
					var hatchedCnt = cult.getHatchedBeastCount();
					var maxBeastStg = cult.getMaxBeastStage();
					var totalSteleLv = cult.getTotalSteleComprehension();
					var steleResTier = cult.getSteleResonanceTier();
					var battleBDef = snUI.battleBeastKey ? cult.getBeastDef(snUI.battleBeastKey) : null;
					var gardenBDef = snUI.gardenBeastKey ? cult.getBeastDef(snUI.gardenBeastKey) : null;
					var beastSealBadge = (cult.beastImprintTier > 0)
						? "<span class=\"xxCaveImprintTag\">" + $I("cultivation.menagerie.imprint", [cult.beastImprintTier]) + "</span>"
						: "";

					var menagerieTopHtml =
						"<div class=\"xxCaveHeader\">" +
							"<div class=\"xxCaveHeaderLeft\">" +
								"<div class=\"xxCaveHeaderIcon xxMenagerieHdrIco\"><img src=\"res/art/beast_spirit_nursery.webp?v=" + artV3 + "\" alt=\"\"/></div>" +
								"<div class=\"xxCaveTitleWrap\">" +
									"<div class=\"xxCaveBadgeRow\">" +
										"<span class=\"xxCaveBadge\">" + $I("cultivation.menagerie.badge") + "</span>" +
										beastSealBadge +
									"</div>" +
									"<div class=\"xxCaveTitle\">" + $I("cultivation.menagerie.title") + "</div>" +
									"<div class=\"xxCaveDesc\">" + $I("cultivation.menagerie.desc") + "</div>" +
								"</div>" +
							"</div>" +
							"<div class=\"xxCaveSummaryChips\">" +
								"<span class=\"xxCaveSumChip\">" + $I("cultivation.menagerie.chip.beasts", [hatchedCnt, maxBeastStg]) + "</span>" +
								"<span class=\"xxCaveSumChip\">" + $I("cultivation.menagerie.chip.slots", [
									battleBDef ? $I(battleBDef.labelKey) : $I("cultivation.nursery.slot.none"),
									gardenBDef ? $I(gardenBDef.labelKey) : $I("cultivation.nursery.slot.none")
								]) + "</span>" +
								"<span class=\"xxCaveSumChip\">" + $I("cultivation.menagerie.chip.steles", [totalSteleLv, steleResTier]) + "</span>" +
							"</div>" +
						"</div>";

					if (!cult.immortalAscended){
						this.immortalMenagerieEl.innerHTML = menagerieTopHtml +
							"<div class=\"xxCaveLockedNotice\">" + $I("cultivation.menagerie.locked") + "</div>";
					} else {
						// 左栏: 混沌万灵仙宠育兽苑
						var fourSynActive = cult.hasFourSymbolsResonance();
						var fourMinStg = cult.getFourSymbolsMinStage();
						var nurseryBannerHtml =
							"<div class=\"xxXianqiStageBox xxMenagerieBox\">" +
								"<div class=\"xxCaveMiniBtnRow\" style=\"margin-bottom:6px;\">" +
									"<div class=\"xxCaveMiniBtn" + (snUI.autoNurture ? " is-active" : "") + "\" data-xx-menagerie=\"autoNurture\">" +
										$I(snUI.autoNurture ? "cultivation.nursery.auto.on" : "cultivation.nursery.auto.off") +
									"</div>" +
								"</div>" +
								"<div class=\"xxHarmonyBanner" + (fourSynActive ? " is-active" : "") + "\">" +
									(fourSynActive
										? $I("cultivation.nursery.resonance.on", [fourMinStg])
										: $I("cultivation.nursery.resonance.off", [hatchedCnt])) +
								"</div>" +
							"</div>";

						var beastGridHtml = "<div class=\"xxBeastGrid\">";
						for (var bi2 = 0; bi2 < cult.PRIMORDIAL_BEASTS.length; bi2++){
							var bDef2 = cult.PRIMORDIAL_BEASTS[bi2];
							var bSt2 = snUI.beasts[bDef2.key] || {incubating: false, incTicks: 0, incMax: 60, stage: 0, exp: 0};
							var isSelB = (snUI.selectedBeast === bDef2.key);
							var isBatSlot = (snUI.battleBeastKey === bDef2.key);
							var isGarSlot = (snUI.gardenBeastKey === bDef2.key);
							var slotTagHtml = "";
							if (bSt2.stage > 0){
								slotTagHtml = isBatSlot
									? "<span class=\"xxBeastRoleTag is-battle\">" + $I("cultivation.nursery.slot.battle") + "</span>"
									: (isGarSlot
										? "<span class=\"xxBeastRoleTag is-garden\">" + $I("cultivation.nursery.slot.garden") + "</span>"
										: "<span class=\"xxBeastRoleTag\">" + $I("cultivation.nursery.slot.nursery") + "</span>");
							}
							var bActionHtml = "";
							if (bSt2.stage <= 0){
								if (bSt2.incubating){
									var incPct = Math.min(100, Math.round(((bSt2.incTicks || 0) / Math.max(1, bSt2.incMax || 60)) * 100));
									var warmCost = cult.getWarmEggCost();
									bActionHtml =
										"<div class=\"xxPlotBar\"><i style=\"width:" + incPct + "%\"></i></div>" +
										"<div class=\"xxPlotState\">" + $I("cultivation.beast.incubating", [incPct]) + "</div>" +
										"<div class=\"xxCaveMiniBtn gold" + (xyHaveM >= warmCost ? "" : " is-disabled") + "\" data-xx-menagerie=\"warmEgg\" data-xx-arg=\"" + bDef2.key + "\">" +
											$I("cultivation.beast.warm.btn", [warmCost]) +
										"</div>";
								} else {
									var incReq = cult.getBeastIncubateCost(bDef2.key);
									var incParts = [];
									if (incReq){
										incParts.push(fmtMenag(incReq.xianyuan) + " " + $I("resources.xianyuan.title"));
										if (incReq.auxRes && incReq.auxVal > 0){
											var incAuxObj = this.game.resPool.get(incReq.auxRes);
											incParts.push(fmtMenag(incReq.auxVal) + " " + ((incAuxObj && incAuxObj.title) || incReq.auxRes));
										}
									}
									bActionHtml =
										"<div class=\"xxCaveMiniBtn gold" + (incReq && incReq.affordable ? "" : " is-disabled") + "\" data-xx-menagerie=\"incubateBeast\" data-xx-arg=\"" + bDef2.key + "\">" +
											$I("cultivation.beast.incubate.btn", [incParts.join(" · ")]) +
										"</div>";
								}
							} else {
								var expPct = Math.min(100, Math.floor(bSt2.exp || 0));
								bActionHtml =
									"<div class=\"xxPlotBar xxBeastExpBar\"><i style=\"width:" + expPct + "%\"></i></div>" +
									"<div class=\"xxCaveMiniBtnRow\">" +
										"<div class=\"xxCaveMiniBtn" + (isBatSlot ? " is-active" : "") + "\" data-xx-menagerie=\"deployBattle\" data-xx-arg=\"" + bDef2.key + "\">" +
											$I("cultivation.beast.deploy.battle") +
										"</div>" +
										"<div class=\"xxCaveMiniBtn" + (isGarSlot ? " is-active" : "") + "\" data-xx-menagerie=\"deployGarden\" data-xx-arg=\"" + bDef2.key + "\">" +
											$I("cultivation.beast.deploy.garden") +
										"</div>" +
									"</div>";
							}

							beastGridHtml +=
								"<div class=\"xxBeastCard" + (isSelB ? " is-selected" : "") + (bSt2.stage > 0 ? " is-hatched" : "") + "\" data-xx-menagerie=\"selectBeast\" data-xx-arg=\"" + bDef2.key + "\">" +
									"<div class=\"xxStarCoreTop\">" +
										"<div class=\"xxHerbIco xxBeastIco\"><img src=\"" + bDef2.art + "?v=" + artV3 + "\" alt=\"\"/></div>" +
										"<div class=\"xxSeedBody\">" +
											"<div class=\"xxSeedNameRow\">" +
												"<span>" + $I(bDef2.labelKey) + "</span>" +
												slotTagHtml +
											"</div>" +
											"<div class=\"xxBeastStageLine\">" + $I("cultivation.beast.stage." + (bSt2.stage || 0)) + "</div>" +
										"</div>" +
									"</div>" +
									"<div class=\"xxBountyDesc\">" + $I(bDef2.descKey) + "</div>" +
									bActionHtml +
								"</div>";
						}
						beastGridHtml += "</div>";

						var selBKey = snUI.selectedBeast || "azure_dragon";
						var selBDef = cult.getBeastDef(selBKey) || cult.PRIMORDIAL_BEASTS[0];
						var selBState = snUI.beasts[selBDef.key] || {stage: 0, exp: 0};
						var selConsoleHtml = "";
						if ((selBState.stage || 0) > 0){
							var feedXyCost = cult.getBeastFeedXyCost(selBDef.key);
							var canFeedMore = (selBState.stage < 6 || (selBState.exp || 0) < 100);
							var awkReq = cult.getBeastAwakenReq(selBDef.key);
							var awkCostParts = [];
							if (awkReq){
								awkCostParts.push(fmtMenag(awkReq.xianyuan) + " " + $I("resources.xianyuan.title"));
								if (awkReq.auxRes && awkReq.auxVal > 0){
									var awkAuxObj = this.game.resPool.get(awkReq.auxRes);
									awkCostParts.push(fmtMenag(awkReq.auxVal) + " " + ((awkAuxObj && awkAuxObj.title) || awkReq.auxRes));
								}
								if (awkReq.reqDaoyun > 0){
									awkCostParts.push($I("cultivation.beast.req.dao", [awkReq.reqDaoyun]));
								}
							}
							selConsoleHtml =
								"<div class=\"xxBeastConsole\">" +
									"<div class=\"xxPlotTitle\">" +
										$I("cultivation.beast.console.title", [
											$I(selBDef.labelKey),
											$I("cultivation.beast.stage." + selBState.stage),
											Math.floor(selBState.exp || 0)
										]) +
									"</div>" +
									"<div class=\"xxMeritBtnGrid\">" +
										"<div class=\"xxCaveMiniBtn" + (canFeedMore && herbStockM > 0 ? "" : " is-disabled") + "\" data-xx-menagerie=\"feedHerb\" data-xx-arg=\"" + selBDef.key + "\">" +
											$I("cultivation.beast.feed.herb", [herbStockM]) +
										"</div>" +
										"<div class=\"xxCaveMiniBtn" + (canFeedMore && xyHaveM >= feedXyCost ? "" : " is-disabled") + "\" data-xx-menagerie=\"feedXy\" data-xx-arg=\"" + selBDef.key + "\">" +
											$I("cultivation.beast.feed.xy", [feedXyCost + " " + $I("resources.xianyuan.title")]) +
										"</div>" +
										"<div class=\"xxCaveMiniBtn" + (canFeedMore && pillStockM > 0 ? "" : " is-disabled") + "\" data-xx-menagerie=\"feedPill\" data-xx-arg=\"" + selBDef.key + "\">" +
											$I("cultivation.beast.feed.pill", [pillStockM]) +
										"</div>" +
									"</div>" +
									"<div class=\"xxCaveMiniBtnRow\" style=\"margin-top:6px;\">" +
										(awkReq
											? "<div class=\"xxCaveMiniBtn gold" + (awkReq.affordable ? "" : " is-disabled") + "\" data-xx-menagerie=\"awakenBeast\" data-xx-arg=\"" + selBDef.key + "\">" +
												$I("cultivation.beast.awaken.btn", [$I(awkReq.titleKey), awkCostParts.join(" · ")]) +
											"</div>"
											: "<div class=\"xxCaveMiniBtn gold is-disabled\">" + $I("cultivation.beast.awaken.max") + "</div>") +
									"</div>" +
								"</div>";
						}

						var nurseryColHtml =
							"<div class=\"xxCaveSection xxMenagerieColNursery\">" +
								"<div class=\"xxCaveSecHd\">" +
									"<span class=\"xxCaveSecTitle\"><img src=\"res/art/beast_spirit_nursery.webp?v=" + artV3 + "\" class=\"xxInlineSanctumIco\" alt=\"\"/>" + $I("cultivation.nursery.title") + "</span>" +
									"<span class=\"xxCaveSecMeta\">" + $I("cultivation.nursery.meta", [hatchedCnt, Math.round((caveB3.xianyuanRatio || 0) * 100)]) + "</span>" +
								"</div>" +
								nurseryBannerHtml +
								beastGridHtml +
								selConsoleHtml +
								(snUI.lastNote ? "<div class=\"xxCaveNote\">" + snUI.lastNote + "</div>" : "") +
							"</div>";

						// 右栏: 大道法则碑林参悟
						var stelePct = Math.min(100, Math.round((totalSteleLv / 30) * 100));
						var steleBannerHtml =
							"<div class=\"xxXianqiStageBox xxSteleResBox\">" +
								"<div class=\"xxHarmonyBanner" + (steleResTier > 0 ? " is-active" : "") + "\">" +
									$I("cultivation.stele.res." + steleResTier, [totalSteleLv]) +
								"</div>" +
								"<div class=\"xxPlotBar xxSteleTotalBar\" style=\"margin-top:6px;\"><i style=\"width:" + stelePct + "%\"></i></div>" +
							"</div>";

						var steleGridHtml = "<div class=\"xxSteleGrid\">";
						for (var sti = 0; sti < cult.DAO_STELES.length; sti++){
							var stDef = cult.DAO_STELES[sti];
							var stLv = sfUI.levels[stDef.key] || 0;
							var rubReq = cult.getDaoSteleRubbingReq(stDef.key);
							var rubCostParts = [];
							if (rubReq){
								rubCostParts.push(fmtMenag(rubReq.xianyuan) + " " + $I("resources.xianyuan.title"));
								var rubAuxObj = this.game.resPool.get(rubReq.auxRes);
								rubCostParts.push(fmtMenag(rubReq.auxVal) + " " + ((rubAuxObj && rubAuxObj.title) || rubReq.auxRes));
								rubCostParts.push($I("cultivation.beast.req.dao", [rubReq.reqDaoyun]));
							}
							steleGridHtml +=
								"<div class=\"xxSteleCard" + (stLv >= 5 ? " is-mastered" : (stLv > 0 ? " is-comprehended" : "")) + "\">" +
									"<div class=\"xxStarCoreTop\">" +
										"<div class=\"xxHerbIco xxSteleIco\"><img src=\"" + stDef.art + "?v=" + artV3 + "\" alt=\"\"/></div>" +
										"<div class=\"xxSeedBody\">" +
											"<div class=\"xxSeedNameRow\">" +
												"<span>" + $I(stDef.labelKey) + "</span>" +
												"<span class=\"xxSeedStock\">" + $I("cultivation.stele.lv", [stLv]) + "</span>" +
											"</div>" +
											"<div class=\"xxSeedSub\">" + $I(stDef.descKey) + "</div>" +
										"</div>" +
									"</div>" +
									(rubReq
										? "<div class=\"xxCaveMiniBtn gold" + (rubReq.affordable ? "" : " is-disabled") + "\" data-xx-menagerie=\"rubStele\" data-xx-arg=\"" + stDef.key + "\">" +
											$I("cultivation.stele.rub.btn", [rubReq.nextLv, rubCostParts.join(" · ")]) +
										"</div>"
										: "<div class=\"xxCaveMiniBtn is-disabled\">" + $I("cultivation.stele.rub.max") + "</div>") +
								"</div>";
						}
						steleGridHtml += "</div>";

						var steleColHtml =
							"<div class=\"xxCaveSection xxMenagerieColStele\">" +
								"<div class=\"xxCaveSecHd\">" +
									"<span class=\"xxCaveSecTitle gold\"><img src=\"res/art/stele_dao_monolith.webp?v=" + artV3 + "\" class=\"xxInlineSanctumIco\" alt=\"\"/>" + $I("cultivation.stele.title") + "</span>" +
									"<span class=\"xxCaveSecMeta\">" + $I("cultivation.stele.meta", [totalSteleLv, steleResTier]) + "</span>" +
								"</div>" +
								steleBannerHtml +
								steleGridHtml +
								(sfUI.lastNote ? "<div class=\"xxCaveNote\">" + sfUI.lastNote + "</div>" : "") +
							"</div>";

						this.immortalMenagerieEl.innerHTML = menagerieTopHtml +
							"<div class=\"xxCaveColumns\">" + nurseryColHtml + steleColHtml + "</div>";
					}
				}
			}
		}

		if (this.immortalCosmosEl){
			var dujieCosmos = cult.getStage("dujie_0");
			var showCosmos = !!(cult.immortalAscended || (dujieCosmos && dujieCosmos.researched) || (cult.immortalImprint || 0) > 0 || (cult.starImprintTier || 0) > 0 || (cult.beastImprintTier || 0) > 0 || (cult.hongmengImprintTier || 0) > 0);
			this.immortalCosmosEl.style.display = showCosmos ? "block" : "none";
			if (showCosmos){
				dojo.toggleClass(this.immortalCosmosEl, "is-locked", !cult.immortalAscended);
				var ssUI = cult.starship || cult.makeDefaultStarship();
				var haUI = cult.hongmengAltar || cult.makeDefaultHongmengAltar();
				var xyC = this.game.resPool.get("xianyuan");
				var scC = this.game.resPool.get("starchart");
				var tcC = this.game.resPool.get("timeCrystal");
				var rlC = this.game.resPool.get("relic");
				var uoC = this.game.resPool.get("unobtainium");
				var xyHaveC = xyC ? Math.floor(xyC.value) : 0;
				var scHaveC = scC ? Math.floor(scC.value) : 0;
				var tcHaveC = tcC ? Math.floor(tcC.value) : 0;
				var rlHaveC = rlC ? Math.floor(rlC.value) : 0;
				var uoHaveC = uoC ? Math.floor(uoC.value) : 0;

				var rmParts = [];
				for (var rmi = 0; rmi < cult.STAR_REALMS.length; rmi++){
					var rmk = cult.STAR_REALMS[rmi].key;
					rmParts.push(rmk + ":" + ((ssUI.realmMastery && ssUI.realmMastery[rmk]) || 0));
				}
				var trParts = [];
				for (var tri = 0; tri < cult.HONGMENG_TREASURES.length; tri++){
					var trk = cult.HONGMENG_TREASURES[tri].key;
					trParts.push(trk + ":" + ((haUI.treasures && haUI.treasures[trk]) || 0));
				}

				var cosmosSig = [
					cult.immortalAscended ? 1 : 0,
					cult.daoyun || 0,
					cult.hongmengImprintTier || 0,
					ssUI.vesselTier || 0,
					ssUI.selectedRealm || "ziwei",
					Math.floor(ssUI.voyageProgress || 0),
					ssUI.voyageCount || 0,
					ssUI.autoVoyage ? 1 : 0,
					ssUI.hongmengQi || 0,
					ssUI.primordialIron || 0,
					rmParts.join(","),
					trParts.join(","),
					xyHaveC,
					scHaveC,
					tcHaveC,
					rlHaveC,
					uoHaveC,
					ssUI.lastNote || "",
					haUI.lastNote || ""
				].join("|");

				if (this._cosmosSig !== cosmosSig){
					this._cosmosSig = cosmosSig;
					var fmtCosmos = this.game.getDisplayValueExt.bind(this.game);
					var artV4 = cult.ART_VER || "77";
					var caveB4 = cult.getImmortalCaveBonuses(30);
					var vTierNow = ssUI.vesselTier || 0;
					var vCfgNow = cult.getVesselTierDef(vTierNow);
					var hmTotalTier = cult.getHongmengTotalTier();
					var hmMinTier = cult.getHongmengMinTier();
					var hmResTier = cult.getHongmengResonanceTier();
					var hmSealBadge = (cult.hongmengImprintTier > 0)
						? "<span class=\"xxCaveImprintTag\">" + $I("cultivation.cosmos.imprint", [cult.hongmengImprintTier]) + "</span>"
						: "";

					var cosmosTopHtml =
						"<div class=\"xxCaveHeader\">" +
							"<div class=\"xxCaveHeaderLeft\">" +
								"<div class=\"xxCaveHeaderIcon xxCosmosHdrIco\"><img src=\"res/art/starship_taixu_vessel.webp?v=" + artV4 + "\" alt=\"\"/></div>" +
								"<div class=\"xxCaveTitleWrap\">" +
									"<div class=\"xxCaveBadgeRow\">" +
										"<span class=\"xxCaveBadge\">" + $I("cultivation.cosmos.badge") + "</span>" +
										hmSealBadge +
									"</div>" +
									"<div class=\"xxCaveTitle\">" + $I("cultivation.cosmos.title") + "</div>" +
									"<div class=\"xxCaveDesc\">" + $I("cultivation.cosmos.desc") + "</div>" +
								"</div>" +
							"</div>" +
							"<div class=\"xxCaveSummaryChips\">" +
								"<span class=\"xxCaveSumChip\">" + $I("cultivation.cosmos.chip.vessel", [vTierNow, ssUI.voyageCount || 0]) + "</span>" +
								"<span class=\"xxCaveSumChip\">" + $I("cultivation.cosmos.chip.cargo", [ssUI.hongmengQi || 0, ssUI.primordialIron || 0]) + "</span>" +
								"<span class=\"xxCaveSumChip\">" + $I("cultivation.cosmos.chip.altar", [hmTotalTier, hmResTier]) + "</span>" +
							"</div>" +
						"</div>";

					if (!cult.immortalAscended){
						this.immortalCosmosEl.innerHTML = cosmosTopHtml +
							"<div class=\"xxCaveLockedNotice\">" + $I("cultivation.cosmos.locked") + "</div>";
					} else {
						// 左栏: 诸天星域游历飞舟 · 太虚星槎
						var upReq = cult.getStarshipUpgradeReq();
						var upParts = [];
						if (upReq){
							upParts.push(fmtCosmos(upReq.xianyuan) + " " + $I("resources.xianyuan.title"));
							if (upReq.starchart > 0){
								var scTitleObj = this.game.resPool.get("starchart");
								upParts.push(fmtCosmos(upReq.starchart) + " " + ((scTitleObj && scTitleObj.title) || "starchart"));
							}
							if (upReq.auxRes && upReq.auxVal > 0){
								var upAuxObj = this.game.resPool.get(upReq.auxRes);
								upParts.push(fmtCosmos(upReq.auxVal) + " " + ((upAuxObj && upAuxObj.title) || upReq.auxRes));
							}
							if (upReq.reqDaoyun > 0){
								upParts.push($I("cultivation.beast.req.dao", [upReq.reqDaoyun]));
							}
						}
						var upBtnHtml = "";
						if (upReq){
							var upLabel = (vTierNow === 0)
								? $I("cultivation.starship.build.btn", [upParts.join(" · ")])
								: $I("cultivation.starship.upgrade.btn", [$I(upReq.titleKey), upParts.join(" · ")]);
							upBtnHtml = "<div class=\"xxCaveMiniBtn gold" + (upReq.affordable ? "" : " is-disabled") + "\" data-xx-cosmos=\"upgradeVessel\">" + upLabel + "</div>";
						} else {
							upBtnHtml = "<div class=\"xxCaveMiniBtn gold is-disabled\">" + $I("cultivation.starship.upgrade.max") + "</div>";
						}

						var curRealmDef = cult.getStarRealmDef(ssUI.selectedRealm || "ziwei") || cult.STAR_REALMS[0];
						var curPreview = cult.getStarshipVoyagePreview(curRealmDef.key);
						var maxVoyDist = Math.max(1, ssUI.voyageMax || curRealmDef.baseDistance || 80);
						var voyPct = (vTierNow > 0) ? Math.min(100, Math.round(((ssUI.voyageProgress || 0) / maxVoyDist) * 100)) : 0;
						var surgeCost = cult.getStarDriveSurgeCost();
						var surgeGainPct = Math.min(100, Math.round((Math.max(45, Math.round(55 * (vCfgNow.speedMult || 1))) / maxVoyDist) * 100));

						var surgeBtnHtml = (vTierNow > 0)
							? "<div class=\"xxCaveMiniBtn gold" + (xyHaveC >= surgeCost ? "" : " is-disabled") + "\" data-xx-cosmos=\"surgeVoyage\">" +
								$I("cultivation.starship.surge.btn", [surgeGainPct, surgeCost]) +
							  "</div>"
							: "<div class=\"xxCaveMiniBtn is-disabled\">" + $I("cultivation.starship.surge.need") + "</div>";

						var vesselConsoleHtml =
							"<div class=\"xxXianqiStageBox xxVesselConsole\">" +
								"<div class=\"xxSeedNameRow\">" +
									"<b>" + $I(vCfgNow.titleKey) + "</b>" +
									"<div class=\"xxCaveMiniBtn" + (ssUI.autoVoyage ? " is-active" : "") + "\" data-xx-cosmos=\"autoVoyage\">" +
										$I(ssUI.autoVoyage ? "cultivation.starship.auto.on" : "cultivation.starship.auto.off") +
									"</div>" +
								"</div>" +
								"<div class=\"xxVesselStatRow\">" +
									"<span class=\"xxVesselChip\">" + $I("cultivation.starship.chip.speed", [(vCfgNow.speedMult || 0).toFixed(2)]) + "</span>" +
									"<span class=\"xxVesselChip\">" + $I("cultivation.starship.chip.cargo", [(vCfgNow.cargoMult || 0).toFixed(2)]) + "</span>" +
									"<span class=\"xxVesselChip\">" + $I("cultivation.starship.chip.shield", [Math.round((vCfgNow.shieldBonus || 0) * 100)]) + "</span>" +
									"<span class=\"xxVesselChip is-gold\">" + $I("cultivation.starship.chip.qi", [ssUI.hongmengQi || 0]) + "</span>" +
									"<span class=\"xxVesselChip is-gold\">" + $I("cultivation.starship.chip.iron", [ssUI.primordialIron || 0]) + "</span>" +
								"</div>" +
								"<div class=\"xxPlotBar xxVoyageBar\"><i style=\"width:" + voyPct + "%\"></i></div>" +
								"<div class=\"xxPlotState\" style=\"margin:4px 0 6px;\">" +
									$I("cultivation.starship.voyage.state", [$I(curRealmDef.labelKey), voyPct, curPreview.qiGain, curPreview.ironGain]) +
								"</div>" +
								"<div class=\"xxCaveMiniBtnRow\">" +
									surgeBtnHtml +
									upBtnHtml +
								"</div>" +
							"</div>";

						var realmGridHtml = "<div class=\"xxStarRealmGrid\">";
						for (var sri = 0; sri < cult.STAR_REALMS.length; sri++){
							var srDef = cult.STAR_REALMS[sri];
							var isCurR = ((ssUI.selectedRealm || "ziwei") === srDef.key);
							var srMast = (ssUI.realmMastery && ssUI.realmMastery[srDef.key]) || 0;
							var srPrev = cult.getStarshipVoyagePreview(srDef.key);
							realmGridHtml +=
								"<div class=\"xxStarRealmCard" + (isCurR ? " is-active" : "") + "\" data-xx-cosmos=\"selectRealm\" data-xx-arg=\"" + srDef.key + "\">" +
									"<div class=\"xxStarCoreTop\">" +
										"<div class=\"xxHerbIco xxStarRealmIco\"><img src=\"" + srDef.art + "?v=" + artV4 + "\" alt=\"\"/></div>" +
										"<div class=\"xxSeedBody\">" +
											"<div class=\"xxSeedNameRow\">" +
												"<span>" + $I(srDef.labelKey) + "</span>" +
												"<span class=\"xxSeedStock\">" + $I("cultivation.starship.realm.mastery", [srMast]) + "</span>" +
											"</div>" +
											"<div class=\"xxBeastStageLine\">" + $I("cultivation.starship.realm.drop", [srPrev.qiGain, srPrev.ironGain, srPrev.xyGain]) + "</div>" +
										"</div>" +
									"</div>" +
									"<div class=\"xxBountyDesc\">" + $I(srDef.descKey) + "</div>" +
									"<div class=\"xxCaveMiniBtn" + (isCurR ? " is-active" : "") + "\" data-xx-cosmos=\"selectRealm\" data-xx-arg=\"" + srDef.key + "\">" +
										$I(isCurR ? "cultivation.starship.realm.nav.active" : "cultivation.starship.realm.nav.btn") +
									"</div>" +
								"</div>";
						}
						realmGridHtml += "</div>";

						var starshipColHtml =
							"<div class=\"xxCaveSection xxCosmosColStarship\">" +
								"<div class=\"xxCaveSecHd\">" +
									"<span class=\"xxCaveSecTitle\"><img src=\"res/art/starship_taixu_vessel.webp?v=" + artV4 + "\" class=\"xxInlineSanctumIco\" alt=\"\"/>" + $I("cultivation.starship.title") + "</span>" +
									"<span class=\"xxCaveSecMeta\">" + $I("cultivation.starship.meta", [
										Math.round((vCfgNow.shieldBonus || 0) * 100),
										Math.round((vCfgNow.cargoMult || 0) * 100)
									]) + "</span>" +
								"</div>" +
								vesselConsoleHtml +
								realmGridHtml +
								(ssUI.lastNote ? "<div class=\"xxCaveNote\">" + ssUI.lastNote + "</div>" : "") +
							"</div>";

						// 右栏: 混沌鸿蒙灵宝祭坛
						var hmPct = Math.min(100, Math.round((hmTotalTier / 18) * 100));
						var execPct = Math.round((caveB4.riftBossExecuteRatio || 0) * 100);
						var altarBannerHtml =
							"<div class=\"xxXianqiStageBox xxHongmengResBox\">" +
								"<div class=\"xxHarmonyBanner" + (hmResTier > 0 ? " is-active" : "") + "\">" +
									$I("cultivation.hongmeng.res." + hmResTier, [hmMinTier]) +
								"</div>" +
								"<div class=\"xxPlotBar xxHongmengBar\" style=\"margin-top:6px;\"><i style=\"width:" + hmPct + "%\"></i></div>" +
							"</div>";

						var altarGridHtml = "<div class=\"xxHongmengGrid\">";
						for (var hti = 0; hti < cult.HONGMENG_TREASURES.length; hti++){
							var htDef = cult.HONGMENG_TREASURES[hti];
							var htTier = (haUI.treasures && haUI.treasures[htDef.key]) || 0;
							var fgReq = cult.getHongmengForgeReq(htDef.key);
							var fgParts = [];
							if (fgReq){
								fgParts.push($I("cultivation.hongmeng.req.qi", [fgReq.hongmengQi]));
								fgParts.push($I("cultivation.hongmeng.req.iron", [fgReq.primordialIron]));
								fgParts.push(fmtCosmos(fgReq.xianyuan) + " " + $I("resources.xianyuan.title"));
								if (fgReq.reqDaoyun > 0){
									fgParts.push($I("cultivation.beast.req.dao", [fgReq.reqDaoyun]));
								}
							}
							altarGridHtml +=
								"<div class=\"xxHongmengCard" + (htTier >= 6 ? " is-maxed" : (htTier > 0 ? " is-forged" : "")) + "\">" +
									"<div class=\"xxStarCoreTop\">" +
										"<div class=\"xxHerbIco xxHongmengIco\"><img src=\"" + htDef.art + "?v=" + artV4 + "\" alt=\"\"/></div>" +
										"<div class=\"xxSeedBody\">" +
											"<div class=\"xxSeedNameRow\">" +
												"<span>" + $I(htDef.labelKey) + "</span>" +
												"<span class=\"xxSeedStock\">" + $I("cultivation.hongmeng.tier", [htTier]) + "</span>" +
											"</div>" +
											"<div class=\"xxSeedSub\">" + $I(htDef.descKey) + "</div>" +
										"</div>" +
									"</div>" +
									(fgReq
										? "<div class=\"xxCaveMiniBtn gold" + (fgReq.affordable ? "" : " is-disabled") + "\" data-xx-cosmos=\"forgeTreasure\" data-xx-arg=\"" + htDef.key + "\">" +
											$I("cultivation.hongmeng.forge.btn", [fgReq.nextTier, fgParts.join(" · ")]) +
										  "</div>"
										: "<div class=\"xxCaveMiniBtn is-disabled\">" + $I("cultivation.hongmeng.forge.max") + "</div>") +
								"</div>";
						}
						altarGridHtml += "</div>";

						var altarColHtml =
							"<div class=\"xxCaveSection xxCosmosColAltar\">" +
								"<div class=\"xxCaveSecHd\">" +
									"<span class=\"xxCaveSecTitle gold\"><img src=\"res/art/altar_hongmeng_forge.webp?v=" + artV4 + "\" class=\"xxInlineSanctumIco\" alt=\"\"/>" + $I("cultivation.hongmeng.title") + "</span>" +
									"<span class=\"xxCaveSecMeta\">" + $I("cultivation.hongmeng.meta", [hmMinTier, execPct]) + "</span>" +
								"</div>" +
								altarBannerHtml +
								altarGridHtml +
								(haUI.lastNote ? "<div class=\"xxCaveNote\">" + haUI.lastNote + "</div>" : "") +
							"</div>";

						this.immortalCosmosEl.innerHTML = cosmosTopHtml +
							"<div class=\"xxCaveColumns\">" + starshipColHtml + altarColHtml + "</div>";
					}
				}
			}
		}

		if (this.immortalDharmaEl){
			var dujieDharma = cult.getStage("dujie_0");
			var showDharma = !!(cult.immortalAscended || (dujieDharma && dujieDharma.researched) || (cult.immortalImprint || 0) > 0 || (cult.starImprintTier || 0) > 0 || (cult.beastImprintTier || 0) > 0 || (cult.hongmengImprintTier || 0) > 0 || (cult.dharmaImprintTier || 0) > 0);
			this.immortalDharmaEl.style.display = showDharma ? "block" : "none";
			if (showDharma){
				dojo.toggleClass(this.immortalDharmaEl, "is-locked", !cult.immortalAscended);
				var zaUI = cult.zixiaoAltar || cult.makeDefaultZixiaoAltar();
				var dmUI = cult.dharmaIdols || cult.makeDefaultDharmaIdols();
				var ssRef = cult.starship || cult.makeDefaultStarship();
				var xyD = this.game.resPool.get("xianyuan");
				var rlD = this.game.resPool.get("relic");
				var scD = this.game.resPool.get("starchart");
				var tcD = this.game.resPool.get("timeCrystal");
				var uoD = this.game.resPool.get("unobtainium");
				var xyHaveD = xyD ? Math.floor(xyD.value) : 0;
				var rlHaveD = rlD ? Math.floor(rlD.value) : 0;
				var scHaveD = scD ? Math.floor(scD.value) : 0;
				var tcHaveD = tcD ? Math.floor(tcD.value) : 0;
				var uoHaveD = uoD ? Math.floor(uoD.value) : 0;

				var dmLvParts = [];
				for (var dmi = 0; dmi < cult.DHARMA_IDOLS.length; dmi++){
					var dmk = cult.DHARMA_IDOLS[dmi].key;
					dmLvParts.push(dmk + ":" + ((dmUI.levels && dmUI.levels[dmk]) || 0));
				}

				var dharmaSig = [
					cult.immortalAscended ? 1 : 0,
					cult.daoyun || 0,
					cult.dharmaImprintTier || 0,
					zaUI.tier || 0,
					zaUI.daoSutras || 0,
					zaUI.comprehension || 0,
					Math.floor(zaUI.lectureProgress || 0),
					zaUI.lectureCount || 0,
					zaUI.hongmengLectureCount || 0,
					zaUI.autoLecture ? 1 : 0,
					ssRef.hongmengQi || 0,
					dmUI.primaryKey || "",
					dmUI.supportKey || "",
					dmLvParts.join(","),
					xyHaveD,
					rlHaveD,
					scHaveD,
					tcHaveD,
					uoHaveD,
					zaUI.lastNote || "",
					dmUI.lastNote || ""
				].join("|");

				if (this._dharmaSig !== dharmaSig){
					this._dharmaSig = dharmaSig;
					var fmtDharma = this.game.getDisplayValueExt.bind(this.game);
					var artV5 = cult.ART_VER || "77";
					var caveB5 = cult.getImmortalCaveBonuses(30);
					var zxTierNow = zaUI.tier || 0;
					var zxCfgNow = cult.getZixiaoAltarTierDef(zxTierNow);
					var zxAuraNow = cult.getZixiaoAuraBonuses();
					var compRankNow = cult.getZixiaoComprehensionRank();
					var dmTotalLv = cult.getDharmaTotalLevel();
					var dmResTier = cult.getDharmaResonanceTier();
					var dharmaSealBadge = (cult.dharmaImprintTier > 0)
						? "<span class=\"xxCaveImprintTag\">" + $I("cultivation.zixiao.panel.imprint", [cult.dharmaImprintTier]) + "</span>"
						: "";

					var dharmaTopHtml =
						"<div class=\"xxCaveHeader\">" +
							"<div class=\"xxCaveHeaderLeft\">" +
								"<div class=\"xxCaveHeaderIcon xxDharmaHdrIco\"><img src=\"res/art/altar_zixiao_lecture.webp?v=" + artV5 + "\" alt=\"\"/></div>" +
								"<div class=\"xxCaveTitleWrap\">" +
									"<div class=\"xxCaveBadgeRow\">" +
										"<span class=\"xxCaveBadge\">" + $I("cultivation.zixiao.panel.badge") + "</span>" +
										dharmaSealBadge +
									"</div>" +
									"<div class=\"xxCaveTitle\">" + $I("cultivation.zixiao.panel.title") + "</div>" +
									"<div class=\"xxCaveDesc\">" + $I("cultivation.zixiao.panel.desc") + "</div>" +
								"</div>" +
							"</div>" +
							"<div class=\"xxCaveSummaryChips\">" +
								"<span class=\"xxCaveSumChip\">" + $I("cultivation.zixiao.panel.chip.altar", [zxTierNow, zaUI.lectureCount || 0]) + "</span>" +
								"<span class=\"xxCaveSumChip\"><img src=\"res/art/scroll_hongmeng_sutra.webp?v=" + artV5 + "\" class=\"xxMiniSutraIco\" alt=\"\"/>" + $I("cultivation.zixiao.panel.chip.sutra", [zaUI.daoSutras || 0, zaUI.comprehension || 0]) + "</span>" +
								"<span class=\"xxCaveSumChip\">" + $I("cultivation.zixiao.panel.chip.dharma", [dmTotalLv, dmResTier]) + "</span>" +
							"</div>" +
						"</div>";

					if (!cult.immortalAscended){
						this.immortalDharmaEl.innerHTML = dharmaTopHtml +
							"<div class=\"xxCaveLockedNotice\">" + $I("cultivation.zixiao.panel.locked") + "</div>";
					} else {
						// 左栏: 混沌紫霄讲道坛
						var zxUpReq = cult.getZixiaoUpgradeReq();
						var zxUpParts = [];
						if (zxUpReq){
							zxUpParts.push(fmtDharma(zxUpReq.xianyuan) + " " + $I("resources.xianyuan.title"));
							if (zxUpReq.relic > 0){
								var rlTitleObj = this.game.resPool.get("relic");
								zxUpParts.push(fmtDharma(zxUpReq.relic) + " " + ((rlTitleObj && rlTitleObj.title) || "relic"));
							}
							if (zxUpReq.auxRes && zxUpReq.auxVal > 0){
								var zxAuxObj = this.game.resPool.get(zxUpReq.auxRes);
								zxUpParts.push(fmtDharma(zxUpReq.auxVal) + " " + ((zxAuxObj && zxAuxObj.title) || zxUpReq.auxRes));
							}
							if (zxUpReq.reqDaoyun > 0){
								zxUpParts.push($I("cultivation.beast.req.dao", [zxUpReq.reqDaoyun]));
							}
						}
						var zxUpBtnHtml = "";
						if (zxUpReq){
							var zxUpLabel = (zxTierNow === 0)
								? $I("cultivation.zixiao.build.btn", [zxUpParts.join(" · ")])
								: $I("cultivation.zixiao.upgrade.btn", [$I(zxUpReq.titleKey), zxUpParts.join(" · ")]);
							zxUpBtnHtml = "<div class=\"xxCaveMiniBtn gold" + (zxUpReq.affordable ? "" : " is-disabled") + "\" data-xx-dharma=\"upgradeAltar\">" + zxUpLabel + "</div>";
						} else {
							zxUpBtnHtml = "<div class=\"xxCaveMiniBtn gold is-disabled\">" + $I("cultivation.zixiao.upgrade.max") + "</div>";
						}

						var lecEss = cult.getDaoLecturePreview("essence");
						var lecHm = cult.getDaoLecturePreview("hongmeng");
						var sermonPct = (zxTierNow > 0) ? Math.min(100, Math.round(((zaUI.lectureProgress || 0) / Math.max(1, zaUI.lectureMax || 100)) * 100)) : 0;

						var lecBtnsHtml = "";
						if (zxTierNow > 0){
							lecBtnsHtml =
								"<div class=\"xxCaveMiniBtn gold" + (lecEss.affordable ? "" : " is-disabled") + "\" data-xx-dharma=\"lectureEssence\">" +
									$I("cultivation.zixiao.lecture.essence.btn", [lecEss.xianyuan, lecEss.sutraGain, lecEss.compGain]) +
								"</div>" +
								"<div class=\"xxCaveMiniBtn gold" + (lecHm.affordable ? "" : " is-disabled") + "\" data-xx-dharma=\"lectureHongmeng\">" +
									$I("cultivation.zixiao.lecture.hongmeng.btn", [lecHm.xianyuan, lecHm.hongmengQi, lecHm.sutraGain, lecHm.compGain]) +
								"</div>";
						} else {
							lecBtnsHtml = "<div class=\"xxCaveMiniBtn is-disabled\">" + $I("cultivation.zixiao.lecture.need") + "</div>";
						}

						var qiBoostPct = Math.round((zxAuraNow.xyRatio || 0) * 100);
						var herbBoostPct = Math.round((zxAuraNow.herbSpeed || 0) * 100);
						var arkYieldPct = Math.round((zxAuraNow.voyageYield || 0) * 100);
						var arkSpeedPct = Math.round((zxAuraNow.voyageSpeed || 0) * 100);

						var zixiaoConsoleHtml =
							"<div class=\"xxXianqiStageBox xxZixiaoConsole\">" +
								"<div class=\"xxSeedNameRow\">" +
									"<b>" + $I(zxCfgNow.titleKey) + "</b>" +
									"<div class=\"xxCaveMiniBtn" + (zaUI.autoLecture ? " is-active" : "") + "\" data-xx-dharma=\"autoLecture\">" +
										$I(zaUI.autoLecture ? "cultivation.zixiao.auto.on" : "cultivation.zixiao.auto.off") +
									"</div>" +
								"</div>" +
								"<div class=\"xxVesselStatRow\">" +
									"<span class=\"xxVesselChip is-gold\"><img src=\"res/art/scroll_hongmeng_sutra.webp?v=" + artV5 + "\" class=\"xxMiniSutraIco\" alt=\"\"/>" + $I("cultivation.zixiao.chip.sutra", [zaUI.daoSutras || 0]) + "</span>" +
									"<span class=\"xxVesselChip is-gold\">" + $I("cultivation.zixiao.chip.comp", [zaUI.comprehension || 0, compRankNow]) + "</span>" +
									"<span class=\"xxVesselChip\">" + $I("cultivation.zixiao.chip.qi", [qiBoostPct]) + "</span>" +
									"<span class=\"xxVesselChip\">" + $I("cultivation.zixiao.chip.herb", [herbBoostPct]) + "</span>" +
									"<span class=\"xxVesselChip\">" + $I("cultivation.zixiao.chip.voyage", [arkYieldPct]) + "</span>" +
								"</div>" +
								"<div class=\"xxPlotBar xxZixiaoBar\"><i style=\"width:" + sermonPct + "%\"></i></div>" +
								"<div class=\"xxPlotState\" style=\"margin:4px 0 6px;\">" +
									$I("cultivation.zixiao.sermon.state", [sermonPct, lecEss.sutraGain, lecEss.compGain, lecHm.sutraGain, lecHm.compGain]) +
								"</div>" +
								"<div class=\"xxCaveMiniBtnRow\">" +
									lecBtnsHtml +
									zxUpBtnHtml +
								"</div>" +
							"</div>";

						var zixiaoAuraHtml =
							"<div class=\"xxZixiaoAuraBox\">" +
								"<div class=\"xxZixiaoAuraTitle\">" +
									"<img src=\"res/art/scroll_hongmeng_sutra.webp?v=" + artV5 + "\" class=\"xxMiniSutraIco\" alt=\"\"/>" +
									$I("cultivation.zixiao.aura.title", [zaUI.lectureCount || 0, zaUI.hongmengLectureCount || 0]) +
								"</div>" +
								"<div class=\"xxBountyDesc\">" +
									$I("cultivation.zixiao.aura.desc", [
										(zxAuraNow.xyBase || 0).toFixed(2),
										qiBoostPct,
										herbBoostPct,
										arkYieldPct,
										arkSpeedPct
									]) +
								"</div>" +
							"</div>";

						var zixiaoColHtml =
							"<div class=\"xxCaveSection xxDharmaColZixiao\">" +
								"<div class=\"xxCaveSecHd\">" +
									"<span class=\"xxCaveSecTitle\"><img src=\"res/art/altar_zixiao_lecture.webp?v=" + artV5 + "\" class=\"xxInlineSanctumIco\" alt=\"\"/>" + $I("cultivation.zixiao.title") + "</span>" +
									"<span class=\"xxCaveSecMeta\">" + $I("cultivation.zixiao.meta", [qiBoostPct, herbBoostPct, arkYieldPct]) + "</span>" +
								"</div>" +
								zixiaoConsoleHtml +
								zixiaoAuraHtml +
								(zaUI.lastNote ? "<div class=\"xxCaveNote\">" + zaUI.lastNote + "</div>" : "") +
							"</div>";

						// 右栏: 三千大道神通法相
						var dmPct = Math.min(100, Math.round((dmTotalLv / 24) * 100));
						var swordExecPct = Math.round((caveB5.riftBossExecuteRatio || 0) * 100);
						var nirvPct = Math.round((caveB5.dharmaNirvanaRatio || 0) * 100);
						var pDefSlot = dmUI.primaryKey ? cult.getDharmaIdolDef(dmUI.primaryKey) : null;
						var sDefSlot = dmUI.supportKey ? cult.getDharmaIdolDef(dmUI.supportKey) : null;
						var pSlotLabel = pDefSlot ? $I(pDefSlot.labelKey) : $I("cultivation.dharma.slot.none");
						var sSlotLabel = sDefSlot ? $I(sDefSlot.labelKey) : $I("cultivation.dharma.slot.none");

						var dharmaBannerHtml =
							"<div class=\"xxXianqiStageBox xxDharmaResBox\">" +
								"<div class=\"xxHarmonyBanner" + (dmResTier > 0 ? " is-active" : "") + "\">" +
									$I("cultivation.dharma.res." + dmResTier, [dmTotalLv]) +
								"</div>" +
								"<div class=\"xxPlotBar xxDharmaBar\" style=\"margin-top:6px;\"><i style=\"width:" + dmPct + "%\"></i></div>" +
								"<div class=\"xxDharmaSlotBar\">" +
									"<span class=\"xxDharmaSlotChip\">" + $I("cultivation.dharma.slot.primary", [pSlotLabel]) + "</span>" +
									"<span class=\"xxDharmaSlotChip is-support\">" + $I("cultivation.dharma.slot.support", [sSlotLabel]) + "</span>" +
								"</div>" +
							"</div>";

						var dharmaGridHtml = "<div class=\"xxDharmaGrid\">";
						for (var di = 0; di < cult.DHARMA_IDOLS.length; di++){
							var dDef = cult.DHARMA_IDOLS[di];
							var dLv = (dmUI.levels && dmUI.levels[dDef.key]) || 0;
							var isPrim = (dmUI.primaryKey === dDef.key && dLv > 0);
							var isSupp = (dmUI.supportKey === dDef.key && dLv > 0);
							var roleCls = isPrim ? " is-primary" : (isSupp ? " is-support" : "");
							var roleKey = (dLv <= 0)
								? "cultivation.dharma.role.locked"
								: (isPrim ? "cultivation.dharma.role.primary" : (isSupp ? "cultivation.dharma.role.support" : "cultivation.dharma.role.reserve"));
							var rfReq = cult.getDharmaRefineReq(dDef.key);
							var rfParts = [];
							if (rfReq){
								rfParts.push($I("cultivation.dharma.req.sutra", [rfReq.daoSutras]));
								rfParts.push(fmtDharma(rfReq.xianyuan) + " " + $I("resources.xianyuan.title"));
								if (rfReq.hongmengQi > 0){
									rfParts.push($I("cultivation.hongmeng.req.qi", [rfReq.hongmengQi]));
								}
								if (rfReq.reqDaoyun > 0){
									rfParts.push($I("cultivation.beast.req.dao", [rfReq.reqDaoyun]));
								}
							}
							var cardCls = "xxDharmaCard" +
								(dLv > 0 ? " is-awakened" : "") +
								(isPrim ? " is-primary" : (isSupp ? " is-support" : "")) +
								(dLv >= 6 ? " is-maxed" : "");
							var rfBtnHtml = "";
							if (rfReq){
								var rfBtnText = (dLv === 0)
									? $I("cultivation.dharma.awaken.btn", [rfParts.join(" · ")])
									: $I("cultivation.dharma.refine.btn", [rfReq.nextLv, rfParts.join(" · ")]);
								rfBtnHtml = "<div class=\"xxCaveMiniBtn gold" + (rfReq.affordable ? "" : " is-disabled") + "\" data-xx-dharma=\"refineIdol\" data-xx-arg=\"" + dDef.key + "\">" + rfBtnText + "</div>";
							} else {
								rfBtnHtml = "<div class=\"xxCaveMiniBtn is-disabled\">" + $I("cultivation.dharma.refine.max") + "</div>";
							}
							var slotActionHtml = (dLv > 0)
								? ("<div class=\"xxCaveMiniBtnRow\">" +
									"<div class=\"xxCaveMiniBtn" + (isPrim ? " is-active" : "") + "\" data-xx-dharma=\"equipPrimary\" data-xx-arg=\"" + dDef.key + "\">" +
										$I(isPrim ? "cultivation.dharma.equip.primary.on" : "cultivation.dharma.equip.primary") +
									"</div>" +
									"<div class=\"xxCaveMiniBtn" + (isSupp ? " is-active" : "") + "\" data-xx-dharma=\"equipSupport\" data-xx-arg=\"" + dDef.key + "\">" +
										$I(isSupp ? "cultivation.dharma.equip.support.on" : "cultivation.dharma.equip.support") +
									"</div>" +
								  "</div>")
								: "";

							dharmaGridHtml +=
								"<div class=\"" + cardCls + "\">" +
									"<div class=\"xxStarCoreTop xxDharmaCardTop\">" +
										"<div class=\"xxHerbIco xxDharmaIco\"><img src=\"" + dDef.art + "?v=" + artV5 + "\" alt=\"\"/></div>" +
										"<div class=\"xxSeedBody\">" +
											"<div class=\"xxSeedNameRow\">" +
												"<span>" + $I(dDef.labelKey) + "</span>" +
												"<span class=\"xxSeedStock\">" + $I("cultivation.dharma.lv", [dLv]) + "</span>" +
											"</div>" +
											"<div class=\"xxDharmaRoleRow\"><span class=\"xxDharmaRoleTag" + roleCls + "\">" + $I(roleKey) + "</span></div>" +
										"</div>" +
									"</div>" +
									"<div class=\"xxSeedSub xxDharmaCardDesc\">" + $I(dDef.descKey) + "</div>" +
									rfBtnHtml +
									slotActionHtml +
								"</div>";
						}
						dharmaGridHtml += "</div>";

						var dharmaColHtml =
							"<div class=\"xxCaveSection xxDharmaColIdols\">" +
								"<div class=\"xxCaveSecHd\">" +
									"<span class=\"xxCaveSecTitle gold\"><img src=\"res/art/dharma_cosmic_giant.webp?v=" + artV5 + "\" class=\"xxInlineSanctumIco\" alt=\"\"/>" + $I("cultivation.dharma.title") + "</span>" +
									"<span class=\"xxCaveSecMeta\">" + $I("cultivation.dharma.meta", [dmTotalLv, swordExecPct, nirvPct]) + "</span>" +
								"</div>" +
								dharmaBannerHtml +
								dharmaGridHtml +
								(dmUI.lastNote ? "<div class=\"xxCaveNote\">" + dmUI.lastNote + "</div>" : "") +
							"</div>";

						this.immortalDharmaEl.innerHTML = dharmaTopHtml +
							"<div class=\"xxCaveColumns\">" + zixiaoColHtml + dharmaColHtml + "</div>";
					}
				}
			}
		}

		if (this.ascendBtn){
			var dujie = cult.getStage("dujie_0");
			this.ascendBtn.style.display = (dujie && dujie.researched) ? "block" : "none";
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
 * 东方水墨流金美术系统 (Xianxia AI-Generated Art Visual System)
 * 全量采用 AI 原画素材渲染境界法相、页签画卷、仙缘章回、全灵材图标、出身/动作/道行徽记及秘境妖兽与神通特效。
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
		dujie:    {pri: "#ff5e7e", sec: "#7ee8ff", glow: "rgba(255,94,126,.62)"},
		zhenxian: {pri: "#ffe082", sec: "#7ef9d4", glow: "rgba(255,224,130,.66)"},
		jinxian:  {pri: "#ffca28", sec: "#fff8e1", glow: "rgba(255,202,40,.75)"}
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
		dujie:    "res/art/portrait_dacheng.jpg",
		zhenxian: "res/art/portrait_zhenxian.jpg",
		jinxian:  "res/art/portrait_zhenxian.jpg"
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

	ORIGIN_ART: {
		farmer:  "res/art/origin_farmer.jpg",
		hunter:  "res/art/origin_hunter.jpg",
		scholar: "res/art/origin_scholar.jpg",
		trader:  "res/art/origin_trader.jpg",
		orphan:  "res/art/origin_orphan.jpg"
	},

	MINGGE_ART: {
		wheel:     "res/art/mingge_wheel.jpg",
		alchemy:   "res/art/mingge_alchemy.jpg",
		sword:     "res/art/mingge_sword.jpg",
		longevity: "res/art/mingge_longevity.jpg"
	},

	HERB_ART: {
		xianlan:  "res/art/herb_xianlan.webp",
		zizhi:    "res/art/herb_zizhi.webp",
		qinglian: "res/art/herb_qinglian.webp",
		daoguo:   "res/art/herb_daoguo.webp"
	},

	XIANQI_ART: {
		sword:    "res/art/xianqi_sword.webp",
		cauldron: "res/art/xianqi_cauldron.webp",
		mirror:   "res/art/xianqi_mirror.webp",
		pagoda:   "res/art/xianqi_pagoda.webp"
	},

	STARCORE_ART: {
		ziwei:    "res/art/starcore_ziwei.webp",
		taiyang:  "res/art/starcore_taiyang.webp",
		taiyin:   "res/art/starcore_taiyin.webp"
	},

	SANCTUM_ART: {
		arrayCore:   "res/art/array_zhoutian_core.webp",
		demonRaid:   "res/art/demon_tianmo_raid.webp",
		bountyToken: "res/art/bounty_alliance_token.webp",
		bountyScroll:"res/art/bounty_scroll_gold.webp",
		meritChest:  "res/art/bounty_chest_merit.webp"
	},

	ACTION_ART: {
		"游":    "res/art/act_wander.jpg",
		wander:  "res/art/act_wander.jpg",
		"闭":    "res/art/act_seclude.jpg",
		seclude: "res/art/act_seclude.jpg",
		"秘":    "res/art/act_rift.jpg",
		rift:    "res/art/act_rift.jpg",
		"古":    "res/art/act_grift.jpg",
		grift:   "res/art/act_grift.jpg"
	},

	TILE_ART: {
		bonus:    "res/art/tile_bonus.jpg",
		combat:   "res/art/tile_combat.jpg",
		root:     "res/art/tile_root.jpg",
		life:     "res/art/tile_life.jpg",
		demon:    "res/art/tile_demon.jpg",
		fate:     "res/art/tile_fate.jpg",
		artifact: "res/art/tile_artifact.jpg"
	},

	RES_ART: {
		xiuwei:       "res/art/res_xiuwei.jpg",
		catnip:       "res/art/res_catnip.jpg",
		wood:         "res/art/res_wood.jpg",
		minerals:     "res/art/res_minerals.jpg",
		coal:         "res/art/res_coal.jpg",
		iron:         "res/art/res_iron.jpg",
		steel:        "res/art/res_steel.jpg",
		titanium:     "res/art/res_titanium.jpg",
		alloy:        "res/art/res_alloy.jpg",
		eludium:      "res/art/res_eludium.jpg",
		gold:         "res/art/res_gold.jpg",
		oil:          "res/art/res_oil.jpg",
		uranium:      "res/art/res_uranium.jpg",
		unobtainium:  "res/art/res_unobtainium.jpg",
		science:      "res/art/res_science.jpg",
		blueprint:    "res/art/res_blueprint.jpg",
		culture:      "res/art/res_culture.jpg",
		faith:        "res/art/res_faith.jpg",
		starchart:    "res/art/res_starchart.jpg",
		spice:        "res/art/res_spice.jpg",
		relic:        "res/art/res_relic.jpg",
		timeCrystal:  "res/art/res_timeCrystal.jpg",
		xianyuan:     "res/art/res_xianyuan.jpg",
		karma:        "res/art/res_karma.jpg",
		paragon:      "res/art/res_paragon.jpg",
		beam:         "res/art/res_beam.jpg",
		slab:         "res/art/res_slab.jpg",
		manpower:     "res/art/origin_hunter.jpg",
		antimatter:   "res/art/res_eludium.jpg",
		temporalFlux: "res/art/res_timeCrystal.jpg",
		void:         "res/art/res_eludium.jpg"
	},

	BTN_ART: {
		cave:    "res/art/btn_cave.jpg",
		furnace: "res/art/btn_furnace.jpg",
		vein:    "res/art/btn_vein.jpg",
		sect:    "res/art/btn_sect.jpg",
		realm:   "res/art/btn_realm.jpg"
	},

	MONSTER_ART: {
		viper:      "res/art/monster_viper.jpg",
		puppet:     "res/art/monster_puppet.jpg",
		wraith:     "res/art/monster_wraith.jpg",
		mantis:     "res/art/monster_mantis.jpg",
		frostwyrm:  "res/art/monster_frostwyrm.jpg",
		bloodcult:  "res/art/monster_bloodcult.jpg",
		mojiaowang: "res/art/monster_mojiaowang.jpg",
		jinjia:     "res/art/monster_jinjia.jpg",
		yinlang:    "res/art/monster_yinlang.jpg",
		gumo:       "res/art/monster_gumo.jpg",
		zhenxian:   "res/art/monster_zhenxian.jpg",
		yaoxian:    "res/art/monster_yaoxian.jpg"
	},

	VFX_ART: {
		strike: "res/art/vfx_strike.jpg",
		skill:  "res/art/vfx_skill.jpg",
		guard:  "res/art/vfx_guard.jpg",
		ult:    "res/art/vfx_ult.jpg"
	},

	// ---------------- 1. 境界盘膝吐纳法相 (Hero Cultivator Portrait) ----------------
	heroPortraitSVG: function(realmKey, sealChar, rootKey, secluded, demon, hasBuff){
		var portraitHref = this.PORTRAIT_ART[realmKey] || this.PORTRAIT_ART.lianqi;
		return "<svg viewBox=\"0 0 88 88\" class=\"xx-portrait-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + portraitHref + "\" x=\"0\" y=\"0\" width=\"88\" height=\"88\" preserveAspectRatio=\"xMidYMid slice\"/>" +
			"</svg>" +
			"<span class=\"xx-hero-seal-badge\">" + sealChar + "</span>";
	},

	//境界总览卡右侧水墨洞天画卷底图(随大境界演化画境)
	cultivationBgSVG: function(realmKey){
		var bgHref = "res/art/banner_cultivation.jpg";
		if (realmKey == "huashen" || realmKey == "lianxu"){
			bgHref = "res/art/banner_spacetime.jpg";
		} else if (realmKey == "heti" || realmKey == "dacheng" || realmKey == "dujie" || realmKey == "zhenxian" || realmKey == "jinxian"){
			bgHref = "res/art/banner_time.jpg";
		}
		return "<svg viewBox=\"0 0 600 180\" preserveAspectRatio=\"xMidYMid slice\" class=\"xx-cult-bg-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + bgHref + "\" x=\"0\" y=\"0\" width=\"600\" height=\"180\" preserveAspectRatio=\"xMidYMid slice\"/>" +
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
		return "<svg viewBox=\"0 0 800 96\" class=\"xx-scene-svg\" preserveAspectRatio=\"xMidYMid slice\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + artHref + "\" x=\"0\" y=\"0\" width=\"800\" height=\"96\" preserveAspectRatio=\"xMidYMid slice\"/>" +
		"</svg>";
	},

	// ---------------- 3. 仙缘章回卡插画 (Story Fate Card Illustrations) ----------------
	fateArtSVG: function(fateName, arcKey){
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

		return "<svg viewBox=\"0 0 480 112\" preserveAspectRatio=\"xMidYMid slice\" class=\"xx-fate-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + fateImg + "\" x=\"0\" y=\"0\" width=\"480\" height=\"112\" preserveAspectRatio=\"xMidYMid slice\"/>" +
		"</svg>";
	},

	// ---------------- 4. 出身徽记 / 历练四式 / 五维道行小图标 ----------------
	originIcon: function(key){
		var href = this.ORIGIN_ART[key] || this.ORIGIN_ART.farmer;
		return "<svg viewBox=\"0 0 32 32\" class=\"xx-orig-svg xx-origin-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + href + "\" x=\"0\" y=\"0\" width=\"32\" height=\"32\" preserveAspectRatio=\"xMidYMid slice\"/>" +
		"</svg>";
	},

	minggeIcon: function(kind){
		var href = this.MINGGE_ART[kind] || this.MINGGE_ART.wheel;
		return "<svg viewBox=\"0 0 32 32\" class=\"xx-orig-svg xx-mingge-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + href + "\" x=\"0\" y=\"0\" width=\"32\" height=\"32\" preserveAspectRatio=\"xMidYMid slice\"/>" +
		"</svg>";
	},

	herbIcon: function(key){
		var href = this.HERB_ART[key] || this.HERB_ART.xianlan;
		return "<img src=\"" + href + "?v=77\" class=\"xx-herb-img\" alt=\"\"/>";
	},

	xianqiIcon: function(key){
		var href = this.XIANQI_ART[key] || this.XIANQI_ART.sword;
		return "<img src=\"" + href + "?v=77\" class=\"xx-xianqi-img\" alt=\"\"/>";
	},

	starCoreIcon: function(key){
		var href = this.STARCORE_ART[key] || this.STARCORE_ART.ziwei;
		return "<img src=\"" + href + "?v=77\" class=\"xx-starcore-img\" alt=\"\"/>";
	},

	actionArt: function(glyph){
		var href = this.ACTION_ART[glyph] || this.ACTION_ART["古"];
		return "<svg viewBox=\"0 0 28 28\" class=\"xx-act-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + href + "\" x=\"0\" y=\"0\" width=\"28\" height=\"28\" preserveAspectRatio=\"xMidYMid slice\"/>" +
		"</svg>";
	},

	tileIcon: function(key){
		var href = this.TILE_ART[key] || this.TILE_ART.bonus;
		return "<svg viewBox=\"0 0 16 16\" class=\"xx-mini-svg xx-tile-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + href + "\" x=\"0\" y=\"0\" width=\"16\" height=\"16\" preserveAspectRatio=\"xMidYMid slice\"/>" +
		"</svg>";
	},

	skillIcon: function(key){
		var href = this.VFX_ART[key] || this.VFX_ART.strike;
		return "<svg viewBox=\"0 0 20 20\" class=\"xx-mini-svg xx-skill-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + href + "\" x=\"0\" y=\"0\" width=\"20\" height=\"20\" preserveAspectRatio=\"xMidYMid slice\"/>" +
		"</svg>";
	},

	// ---------------- 5. 全灵材资源 AI 定制图标 (Resource Icons) ----------------
	resIcon: function(name){
		var href = this.RES_ART[name] || this.RES_ART.xiuwei;
		return "<svg viewBox=\"0 0 16 16\" class=\"xx-res-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + href + "\" x=\"0\" y=\"0\" width=\"16\" height=\"16\" preserveAspectRatio=\"xMidYMid slice\"/>" +
		"</svg>";
	},

	pillIcon: function(pillName){
		var href = this.RES_ART.spice;
		if (pillName == "zhujidan"){ href = this.BTN_ART.realm; }
		else if (pillName == "qingxin"){ href = this.TILE_ART.life; }
		else if (pillName == "jiangchen"){ href = this.RES_ART.gold; }
		else if (pillName == "peiying"){ href = this.TILE_ART.bonus; }
		else if (pillName == "biyan"){ href = this.BTN_ART.furnace; }
		return "<svg viewBox=\"0 0 16 16\" class=\"xx-res-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + href + "\" x=\"0\" y=\"0\" width=\"16\" height=\"16\" preserveAspectRatio=\"xMidYMid slice\"/>" +
		"</svg>";
	},

	// ---------------- 6. 营造/境界/丹器卡片 AI 定制徽记 (Card Button Emblems) ----------------
	btnIcon: function(btn){
		var opts = (btn && btn.opts) || {};
		var mdl = (btn && btn.model) || {};
		var meta = mdl.metadata || {};
		var id = meta.name || opts.building || opts.craft || opts.id || "";
		var ctrl = btn && btn.controller;
		var ctrlClass = (ctrl && ctrl.declaredClass) ? String(ctrl.declaredClass) : "";
		if (!id && ctrlClass){
			if (ctrlClass.indexOf("GatherCatnip") >= 0){ id = "gatherCatnip"; }
			else if (ctrlClass.indexOf("RefineCatnip") >= 0){ id = "refineCatnip"; }
			else if (ctrlClass.indexOf("PraiseBtn") >= 0){ id = "praiseFaith"; }
			else if (ctrlClass.indexOf("ResetFaithBtn") >= 0){ id = "adoreFaith"; }
			else if (ctrlClass.indexOf("TranscendBtn") >= 0){ id = "transcendFaith"; }
			else if (ctrlClass.indexOf("TransformBtn") >= 0){ id = "refineRelic"; }
			else if (ctrlClass.indexOf("TradeButton") >= 0){ id = "tradeCaravan"; }
			else if (ctrlClass.indexOf("SendExplorers") >= 0){ id = "sendExplorers"; }
			else if (ctrlClass.indexOf("EmbassyButton") >= 0){ id = "buildEmbassy"; }
			else if (ctrlClass.indexOf("AccelerateTimeBtn") >= 0){ id = "accelerateTime"; }
			else if (ctrlClass.indexOf("ShatterTCBtn") >= 0){ id = "shatterTC"; }
			else if (ctrlClass.indexOf("UseHeatBtn") >= 0){ id = "useHeat"; }
			else if (ctrlClass.indexOf("FixCryochamber") >= 0){ id = "fixCryochamber"; }
			else if (mdl && mdl.name === $I("menu.reset")){ id = "reincarnate"; }
		}

		var href = this.RES_ART.xiuwei;
		if (id == "gatherCatnip" || id == "field" || id == "pasture" || id == "unicornPasture" || id == "aqueduct" ||
			id == "agriculture" || id == "mineralHoes" || id == "ironHoes" || id == "biofuel" || id == "hydroponics"){
			href = this.RES_ART.catnip;
		} else if (id == "refineCatnip" || id == "lumberMill" || id == "wood" ||
			id == "mineralAxes" || id == "ironAxes" || id == "steelAxe" || id == "titaniumAxe" || id == "alloyAxe" || id == "unobtainiumAxe" ||
			id == "reinforcedSaw" || id == "steelSaw" || id == "titaniumSaw" || id == "alloySaw" || id == "unobtainiumSaw"){
			href = this.RES_ART.wood;
		} else if (id == "hut" || id == "logHouse" || id == "mansion" || id == "construction" || id == "architecture" ||
			id == "ExpandedBarns" || id == "stoneBarns" || id == "reinforcedBarns" || id == "titaniumBarns" || id == "alloyBarns" || id == "concreteBarns" ||
			id == "reinforcedWarehouses" || id == "titaniumWarehouses" || id == "alloyWarehouses" || id == "concreteWarehouses" || id == "silos" ||
			id == "spaceStation" || id == "moonBase" || id == "cryochambers" || id == "fixCryochamber" || id == "buildEmbassy" || id == "skyPalace" ||
			id == "engeneering" || id == "megalomania"){
			href = this.BTN_ART.cave;
		} else if (id == "library" || id == "academy" || id == "math" || id == "philosophy" || id == "archeology" || id == "physics" || id == "metaphysics" ||
			id == "scholasticism" || id == "apocripha" || id == "researchVessel" || id == "blackObelisk" || id == "blackLibrary" ||
			id == "codexVox" || id == "codexLogos" || id == "codexAgrum" || id == "codexLeviathanianus"){
			href = this.RES_ART.science;
		} else if (id == "observatory" || id == "calendar" || id == "astronomy" || id == "celestialMechanics" || id == "astrolabe" ||
			id == "navigation" || id == "sattelites" || id == "orbitalEngineering" || id == "starlink" || id == "uplink" ||
			id == "orbitalLaunch" || id == "sattelite" || id == "moonMission" || id == "duneMission" || id == "piscineMission" ||
			id == "heliosMission" || id == "terminusMission" || id == "kairoMission" || id == "rorschachMission" || id == "centaurusSystemMission" ||
			id == "furthestRingMission" || id == "spaceElevator" || id == "spaceBeacon" || id == "orbitalArray" || id == "sendExplorers" ||
			id == "blackNexus" || id == "singularity" || id == "astromancy" || id == "numerology" || id == "numeromancy"){
			href = this.RES_ART.starchart;
		} else if (id == "biolab" || id == "brewery" || id == "juqi" || id == "zhujidan" || id == "qingxin" || id == "jiangchen" || id == "peiying" || id == "biyan" ||
			id == "chemistry" || id == "biology" || id == "biochemistry" || id == "ecology" || id == "petri" || id == "spiceRefinery" ||
			id == "unicornmancy" || id == "willenfluff" || mdl.type == "pill"){
			href = this.RES_ART.spice;
		} else if (id == "barn" || id == "warehouse" || id == "harbor" || id == "mint" || id == "tradepost" ||
			id == "currency" || id == "goldOre" || id == "caravanserai" || id == "cargoShips" || id == "barges" || id == "register" ||
			id == "tradeCaravan" || id == "goldenSpire" || id == "sunAltar" || id == "solarRevolution" || id == "sunspire" || id == "sunlifter" || id == "sunforge" ||
			id == "goldenRatio" || id == "divineProportion" || id == "vitruvianFeline" || id == "renaissance" || id == "diplomacy" || id == "zebraDiplomacy" || id == "zebraCovenant"){
			href = this.RES_ART.gold;
		} else if (id == "mine" || id == "quarry" || id == "mining" || id == "bolas" || id == "prospecting" || id == "miningDrill" || id == "geodesy" ||
			id == "planetCracker" || id == "moonOutpost"){
			href = this.RES_ART.minerals;
		} else if (id == "smelter" || id == "calciner" || id == "workshop" || id == "factory" || id == "magneto" || id == "steamworks" ||
			id == "metal" || id == "steel" || id == "machinery" || id == "engineering" || id == "metalurgy" || id == "combustion" ||
			id == "industrialization" || id == "mechanization" || id == "advancedRefinement" || id == "factoryAutomation" || id == "combustionEngine" ||
			id == "electrolyticSmelting" || id == "oxidation" || id == "rotaryKiln" || id == "blastFurnace" || id == "timeBoiler" || id == "useHeat" || id == "heatsink"){
			href = this.BTN_ART.furnace;
		} else if (id == "archery" || id == "animal" || id == "huntingArmor" || id == "steelArmor" || id == "compositeBow" || id == "crossbow" || id == "railgun" ||
			id == "templars" || id == "holyGenocide" || id == "adjustmentBureau"){
			href = this.TILE_ART.combat;
		} else if (id == "unicornTomb" || id == "unicornGraveyard" || id == "unicornNecropolis" || id == "blackCodex"){
			href = this.TILE_ART.demon;
		} else if (id == "ivoryTower" || id == "ivoryCitadel" || id == "ascoh"){
			href = this.BTN_ART.sect;
		} else if (id == "oilWell" || id == "oilProcessing" || id == "oilRefinery" || id == "pumpjack" || id == "hydrofracturer"){
			href = this.RES_ART.oil;
		} else if (id == "reactor" || id == "accelerator" || id == "electricity" || id == "electronics" || id == "nuclearFission" ||
			id == "particlePhysics" || id == "dimensionalPhysics" || id == "nanotechnology" || id == "superconductors" || id == "thorium" ||
			id == "containmentChamber" || id == "heatsink" || id == "blazar" || id == "darkNova"){
			href = this.RES_ART.uranium;
		} else if (id == "rocketry" || id == "exogeology" || id == "advExogeology" || id == "artificialGravity" || id == "terraformation" || id == "antimatter" ||
			id == "unicornUtopia" || id == "transcendence" || id == "transcendFaith"){
			href = this.RES_ART.unobtainium;
		} else if (id == "amphitheatre" || id == "writing" || id == "civil" || id == "drama" || id == "acoustics" || id == "printingPress" || id == "offsetPress" ||
			id == "stainedGlass" || id == "basilica" || id == "frescoes" || id == "carnivals"){
			href = this.RES_ART.culture;
		} else if (id == "chapel" || id == "temple" || id == "ziggurat" || id == "theology" || id == "cryptotheology" ||
			id == "praiseFaith" || id == "adoreFaith" || id == "solarchant" || id == "pawgan" || id == "voidOrder"){
			href = this.RES_ART.faith;
		} else if (id == "blackPyramid" || id == "marker" || id == "blackCore" ||
			id == "blackRadiance" || id == "darkParacosm" ||
			id == "refineRelic" || id == "relicStation" || id == "voidHoover" || id == "voidRift" || id == "voidResonance"){
			href = this.RES_ART.relic;
		} else if (id == "chronosphere" || id == "chronophysics" || id == "tachyonTheory" || id == "voidSpace" || id == "paradoxalKnowledge" ||
			id == "accelerateTime" || id == "shatterTC" || id == "temporalBattery" || id == "controlledDelay" || id == "temporalPress" ||
			id == "temporalImpedance" || id == "resourceRetrieval" || id == "chronocontrol" || id == "chronomancy" || id == "anachronomancy"){
			href = this.RES_ART.timeCrystal;
		} else if (id == "reincarnate"){
			href = this.RES_ART.karma;
		} else if (id == "ironWill"){
			href = this.TILE_ART.combat;
		} else if (id == "winterIsComing"){
			href = this.RES_ART.uranium;
		} else if (id == "anarchy"){
			href = this.BTN_ART.sect;
		} else if (id == "energy"){
			href = this.BTN_ART.vein;
		} else if (id == "atheism"){
			href = this.RES_ART.faith;
		} else if (id == "1000Years"){
			href = this.RES_ART.timeCrystal;
		} else if (id == "blackSky"){
			href = this.RES_ART.starchart;
		} else if (id == "pacifism"){
			href = this.RES_ART.gold;
		} else if (id == "unicornTears"){
			href = this.RES_ART.spice;
		} else if (id == "postApocalypse"){
			href = this.RES_ART.relic;
		} else if (id.indexOf("vein") === 0){
			href = this.BTN_ART.vein;
		} else if (id.indexOf("sect") === 0){
			href = this.BTN_ART.sect;
		} else if (id.indexOf("_") > 0 || mdl.type == "realm"){
			href = this.BTN_ART.realm;
		} else if (this.RES_ART[id]){
			href = this.RES_ART[id];
		} else if (ctrlClass.indexOf("TechButton") >= 0){
			href = this.RES_ART.science;
		} else if (ctrlClass.indexOf("UpgradeButton") >= 0){
			href = this.BTN_ART.furnace;
		} else if (ctrlClass.indexOf("SpaceProgram") >= 0 || ctrlClass.indexOf("PlanetBuilding") >= 0){
			href = this.RES_ART.starchart;
		} else if (ctrlClass.indexOf("ZigguratBtn") >= 0 || ctrlClass.indexOf("ReligionBtn") >= 0){
			href = this.RES_ART.faith;
		} else if (ctrlClass.indexOf("TranscendenceBtn") >= 0 || ctrlClass.indexOf("VoidSpaceBtn") >= 0){
			href = this.RES_ART.relic;
		} else if (ctrlClass.indexOf("PrestigeBtn") >= 0 || ctrlClass.indexOf("BurnParagonBtn") >= 0){
			href = this.RES_ART.paragon;
		} else if (ctrlClass.indexOf("ChronoforgeBtn") >= 0){
			href = this.RES_ART.timeCrystal;
		}

		return "<svg viewBox=\"0 0 20 20\" class=\"xx-btn-svg xx-res-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + href + "\" x=\"0\" y=\"0\" width=\"20\" height=\"20\" preserveAspectRatio=\"xMidYMid slice\"/>" +
		"</svg>";
	},

	// ---------------- 7. 秘境回合制斗法 · 修士法相 / 十一大妖兽妖王 AI 原画 / 神通特效 (Combat Sprites & VFX) ----------------
	combatPlayerSVG: function(realmKey, hasShield, counterStance){
		var portraitHref = this.PORTRAIT_ART[realmKey] || this.PORTRAIT_ART.lianqi;
		var shieldSvg = "";
		if (hasShield || counterStance){
			shieldSvg =
				"<g class=\"xx-svg-shield-dome\">" +
					"<image href=\"" + this.VFX_ART.guard + "\" x=\"4\" y=\"4\" width=\"108\" height=\"108\" preserveAspectRatio=\"xMidYMid slice\" opacity=\"0.42\"/>" +
				"</g>";
		}

		return "<svg viewBox=\"0 0 116 116\" class=\"xx-combat-avatar-svg player\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + portraitHref + "\" x=\"12\" y=\"12\" width=\"92\" height=\"92\" preserveAspectRatio=\"xMidYMid slice\"/>" +
			"<g class=\"xx-svg-sword-orbit\">" +
				"<image href=\"res/art/icon_swords.jpg\" x=\"76\" y=\"8\" width=\"32\" height=\"32\" preserveAspectRatio=\"xMidYMid slice\"/>" +
			"</g>" +
			shieldSvg +
		"</svg>";
	},

	combatMonsterSVG: function(monsterKey, hasShield, enraged){
		var key = monsterKey || "viper";
		var monsterHref = this.MONSTER_ART[key] || this.MONSTER_ART.viper;
		var shieldOverlay = hasShield
			? "<image href=\"" + this.VFX_ART.guard + "\" x=\"6\" y=\"6\" width=\"104\" height=\"104\" preserveAspectRatio=\"xMidYMid slice\" opacity=\"0.36\"/>"
			: "";
		var rageOverlay = enraged
			? "<image href=\"" + this.TILE_ART.demon + "\" x=\"80\" y=\"6\" width=\"28\" height=\"28\" preserveAspectRatio=\"xMidYMid slice\" class=\"xx-art-pulse\"/>"
			: "";

		return "<svg viewBox=\"0 0 116 116\" class=\"xx-combat-avatar-svg enemy " + key + "\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<g class=\"xx-svg-monster-body\">" +
				"<image href=\"" + monsterHref + "\" x=\"8\" y=\"8\" width=\"100\" height=\"100\" preserveAspectRatio=\"xMidYMid slice\"/>" +
			"</g>" +
			rageOverlay +
			shieldOverlay +
		"</svg>";
	},

	combatVfxSVG: function(vfxType){
		var href = this.VFX_ART[vfxType] || this.VFX_ART.strike;
		return "<svg viewBox=\"0 0 120 120\" class=\"xx-vfx-svg\" xmlns=\"http://www.w3.org/2000/svg\">" +
			"<image href=\"" + href + "\" x=\"0\" y=\"0\" width=\"120\" height=\"120\" preserveAspectRatio=\"xMidYMid slice\"/>" +
		"</svg>";
	}
};
