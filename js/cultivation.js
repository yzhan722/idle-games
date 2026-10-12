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
 *   realmProductionRatio - global production bonus (all stages, veins, seclusion)
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
	breakBoost: 0,		//one-shot chance bonus from 筑基丹
	secluded: false,
	actionCd: 0,		//共享调息——游历/闭关/秘境/上古秘境共用一支气脉
	actionCdMax: 0,		//本次调息总长(渲染进度条用)
	riftKeys: 0,		//秘境之钥 — earned in 秘境历练, spent to challenge 上古秘境
	riftFloor: 0,		//highest cleared 上古秘境 floor (persistent ladder)
	lastAction: null,	//{cls,text,seq} — 最近一次历练结果,渲染进秘境面板
	actionSeq: 0,
	spiritRoot: null,	//key into ROOTS
	buffs: null,		//{juqi: ticksLeft}
	stats: null,		//{wander, seclude, rift} — one-shot counters feeding the guide
	demonWarned: false,	//one-shot 心魔 hint fired at the teachable moment
	sihuaCount: 0,		//累计坐化次数——跨转生保留(成就用),resetState 不清
	failStreakStage: null,	//连败的 stage 名
	failStreak: 0,			//连败次数——每次 +4% 下次成功率,封顶 5 连败(+20%)

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

	//realm defs; stages are generated from these
	REALM_DEFS: [
		//lianqi layers are guaranteed successes — the onboarding slope
		//xiuwei costs are tuned against simulate-cultivation.js: each layer should
		//read as a rising wall (minutes→hours by realm), never a stall
		{key:"lianqi",  layers:10, base:{xiuwei:20},            mul:1.4,  bonus:0.03, chance:1.0,  life:80},
		{key:"zhuji",   layers:3,  base:{xiuwei:6000, minerals:250},   mul:2.0,  bonus:0.18, chance:0.85, life:200},
		{key:"jiedan",  layers:3,  base:{xiuwei:30000, gold:400},     mul:2.2,  bonus:0.28, chance:0.72, life:500},
		{key:"yuanying",layers:3,  base:{xiuwei:80000, science:3000}, mul:2.2,  bonus:0.45, chance:0.60, life:1200},
		{key:"huashen", layers:3,  base:{xiuwei:250000, faith:5000}, mul:2.2,  bonus:0.7,  chance:0.50, life:3200},
		{key:"lianxu",  layers:3,  base:{xiuwei:800000, unobtainium:120}, mul:2.2, bonus:1.0, chance:0.42, life:8000},
		{key:"heti",    layers:3,  base:{xiuwei:2500000, relic:40},   mul:2.2,  bonus:1.5,  chance:0.32, life:20000},
		{key:"dacheng", layers:3,  base:{xiuwei:8000000, relic:120, timeCrystal:40}, mul:2.0, bonus:2.2, chance:0.24, life:60000},
		{key:"dujie",   layers:1,  base:{xiuwei:50000000, relic:300, timeCrystal:200}, mul:1, bonus:5.0, chance:0.15, life:100000}
	],

	//spiritual roots, rolled per life
	ROOTS: [
		{key:"wei",  weight:30, xiuweiMult:0.65, priceMult:0.85},
		{key:"san",  weight:30, xiuweiMult:1.0,  priceMult:1.0},
		{key:"zhen", weight:20, xiuweiMult:1.5,  priceMult:1.0},
		{key:"yi",   weight:12, xiuweiMult:1.8,  priceMult:1.0},
		{key:"tian", weight:8,  xiuweiMult:2.5,  priceMult:1.0}
	],

	//pills — 真道具:先炼制入库(val++),再服用消耗(val--)。效果在 usePill()
	pills: [{
		name: "juqi",
		label: $I("cultivation.pill.juqi.label"),
		description: $I("cultivation.pill.juqi.desc"),
		prices: [{name:"catnip", val:250}, {name:"spice", val:15}],
		val: 0
	},{
		name: "zhujidan",
		label: $I("cultivation.pill.zhujidan.label"),
		description: $I("cultivation.pill.zhujidan.desc"),
		prices: [{name:"minerals", val:400}, {name:"wood", val:200}],
		val: 0
	},{
		name: "qingxin",
		label: $I("cultivation.pill.qingxin.label"),
		description: $I("cultivation.pill.qingxin.desc"),
		prices: [{name:"spice", val:30}, {name:"faith", val:80}],
		val: 0
	}],

	//spirit veins — research-style purchases, the long-term 灵石 sink
	veins: null,

	//fates — milestone-triggered story rewards: characters and artifacts
	//from the journey. Each fires once when its stage is reached, shows a
	//story message, optionally grants loot, and its effects then flow
	//through the standard meta pipeline forever (researched = owned).
	//fates — 仙缘:里程碑剧情事件。大境界节点(zhuji/jiedan/.../dujie 的 *_0)
	//保留有效奖励;小节点只做剧情与心魔/常驻 flag 抉择,不再发数值奖励——
	//弟子的抉择塑造道途,数值成长由境界与灵脉给。
	fates: [{
		name: "zhangtie",
		label: $I("cultivation.fate.zhangtie.label"),
		researched: false,
		atStage: "lianqi_1",
		effects: {},
		choices: [{
			key: "trace",
			demonGain: 5
		},{
			key: "bide",
			demonGain: 3
		},{
			key: "wary"
			//flag:对墨居仁生疑——mojuren 抉择时的心境不同(纯剧情)
		}]
	},{
		name: "bottle",
		label: $I("cultivation.fate.bottle.label"),
		researched: false,
		atStage: "lianqi_2",
		effects: {}
	},{
		name: "feiyu",
		label: $I("cultivation.fate.feiyu.label"),
		researched: false,
		atStage: "lianqi_4",
		effects: {},
		choices: [{
			key: "oath",
			demonRelief: 5
		},{
			key: "name"
		},{
			key: "decline",
			demonGain: 4
		}]
	},{
		name: "mojuren",
		label: $I("cultivation.fate.mojuren.label"),
		researched: false,
		atStage: "lianqi_6",
		effects: {},
		choices: [{
			key: "kill",
			demonRelief: 10
		},{
			key: "spare"
			//flag:mojurenAlive——残魂常驻,不时嘲讽滋长心魔
		}]
	},{
		name: "jinguang",
		label: $I("cultivation.fate.jinguang.label"),
		researched: false,
		atStage: "lianqi_8",
		effects: {},
		choices: [{
			key: "fight",
			demonRelief: 8
		},{
			key: "flee",
			demonGain: 6
		}]
	},{
		//—— 大境界节点:筑基 ——
		name: "qixuan",
		label: $I("cultivation.fate.qixuan.label"),
		researched: false,
		atStage: "zhuji_0",
		effects: {"xiuweiRatio": 0.15}
	},{
		name: "tainan",
		label: $I("cultivation.fate.tainan.label"),
		researched: false,
		atStage: "zhuji_1",
		effects: {},
		choices: [{
			key: "sword"
		},{
			key: "seed",
			demonRelief: 5
		},{
			key: "wine"
		}]
	},{
		name: "fengyun",
		label: $I("cultivation.fate.fengyun.label"),
		researched: false,
		atStage: "zhuji_2",
		effects: {}			//dynamic:蜂云剑护体——游历收获×1.5,伏击减半
	},{
		//—— 大境界节点:结丹 ——
		name: "xuese",
		label: $I("cultivation.fate.xuese.label"),
		researched: false,
		atStage: "jiedan_0",
		grant: {relic: 10, spice: 1000},
		effects: {},
		choices: [{
			key: "loot",
			grant: {relic: 10, spice: 1000}
		},{
			key: "save",
			grant: {relic: 5, karma: 5},
			demonRelief: 10
		}]
	},{
		name: "chen",
		label: $I("cultivation.fate.chen.label"),
		researched: false,
		atStage: "jiedan_1",
		effects: {},
		choices: [{
			key: "dao",
			demonGain: 8
		},{
			key: "love",
			demonRelief: 15
		},{
			key: "forget",
			demonGain: 4
		}]
	},{
		name: "chuansong",
		label: $I("cultivation.fate.chuansong.label"),
		researched: false,
		atStage: "jiedan_2",
		effects: {},
		choices: [{
			key: "sail"
		},{
			key: "seal",
			demonRelief: 20
		}]
	},{
		//—— 大境界节点:元婴 ——
		name: "shijin",
		label: $I("cultivation.fate.shijin.label"),
		researched: false,
		atStage: "yuanying_0",
		effects: {"relicPerTickBase": 0.001}
	},{
		name: "dayan",
		label: $I("cultivation.fate.dayan.label"),
		researched: false,
		atStage: "yuanying_1",
		effects: {},
		choices: [{
			key: "disciple",
			demonRelief: 8
		},{
			key: "puppet",
			demonGain: 6
		}]
	},{
		name: "tihun",
		label: $I("cultivation.fate.tihun.label"),
		researched: false,
		atStage: "yuanying_2",
		effects: {}			//dynamic:突破失利时心魔滋长减半
	},{
		//—— 大境界节点:化神 ——
		name: "yinyue",
		label: $I("cultivation.fate.yinyue.label"),
		researched: false,
		atStage: "huashen_0",
		effects: {},
		choices: [{
			key: "bind",
			effects: {"realmProductionRatio": 0.1}	//器灵效力:常驻产出 +10%
		},{
			key: "free",
			effects: {},	//放归轮回——产出加成不留,以业果与心安为偿
			grant: {karma: 3},
			demonRelief: 30
		}]
	},{
		name: "yuanyao",
		label: $I("cultivation.fate.yuanyao.label"),
		researched: false,
		atStage: "huashen_1",
		effects: {},
		choices: [{
			key: "aid",
			demonRelief: 12
		},{
			key: "bond",
			demonRelief: 5
		}]
	},{
		//—— 大境界节点:炼虚 ——
		name: "quhun",
		label: $I("cultivation.fate.quhun.label"),
		researched: false,
		atStage: "lianxu_0",
		effects: {"xiuweiRatio": 0.25}	//弟子系已删,改用全源修为加成
	},{
		name: "xugu",
		label: $I("cultivation.fate.xugu.label"),
		researched: false,
		atStage: "lianxu_1",
		effects: {},
		choices: [{
			key: "ally"
			//flag:xuguAlive——"盟友"偶尔赠古宝,偶尔自取灵石
		},{
			key: "slay",
			demonRelief: 15
		}]
	},{
		name: "xutian",
		label: $I("cultivation.fate.xutian.label"),
		researched: false,
		atStage: "lianxu_2",
		effects: {},
		choices: [{
			key: "flame"
		},{
			key: "pill",
			demonRelief: 10
		}]
	},{
		//—— 大境界节点:合体 ——
		name: "nangong",
		label: $I("cultivation.fate.nangong.label"),
		researched: false,
		atStage: "heti_0",
		effects: {}			//dynamic:心魔消解×3
	},{
		name: "qingyuan",
		label: $I("cultivation.fate.qingyuan.label"),
		researched: false,
		atStage: "heti_1",
		effects: {}
	},{
		name: "erying",
		label: $I("cultivation.fate.erying.label"),
		researched: false,
		atStage: "heti_2",
		effects: {},
		choices: [{
			key: "merge",
			demonGain: 10
		},{
			key: "release",
			demonRelief: 40
		},{
			key: "seal",
			demonGain: 5
		}]
	},{
		//—— 大境界节点:大乘 ——
		name: "fenglei",
		label: $I("cultivation.fate.fenglei.label"),
		researched: false,
		atStage: "dacheng_0",
		effects: {}			//dynamic:游历与秘境冷却减半
	},{
		name: "xiedao",
		label: $I("cultivation.fate.xiedao.label"),
		researched: false,
		atStage: "dacheng_1",
		effects: {}
	},{
		//—— 大境界节点:渡劫 ——
		name: "xuanguo",
		label: $I("cultivation.fate.xuanguo.label"),
		researched: false,
		atStage: "dujie_0",
		grant: {relic: 50},
		effects: {}
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
		baseEffects: {"mineralsPerTickBase": 3}	//风雷翅行万里寻宝
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
	HEART_DEMON_GATE: 90,	//blocked above this
	SECLUSION_XIUWEI: 0.6,
	SECLUSION_MUNDANE: -0.15,
	ARTIFACT_RANK_MAX: 3,
	DEMON_WARN_AT: 40,		//fire the one-shot 心魔 hint past this
	LIFE_WARN: [0.6, 0.8, 0.95],	//寿元已耗比例的三档警告
	ASCENSION_KARMA: 3,			//坐化转世时按大境界序数追加的业力

	//道途指引 — the onboarding checklist. Steps are derived from live state
	//(stages, counters, collections) so the panel self-completes as the player
	//climbs; each text tells them where to go next, not just what happened
	GUIDE_STEPS: [
		{key: "hut",      nav: "Bonfire", done: function(c, g){ return g.bld.get("hut").val > 0; }},
		{key: "field",    nav: "Bonfire", done: function(c, g){ return g.bld.get("field").val > 0; }},
		{key: "break2",   done: function(c, g){ return c.getStage("lianqi_1").researched; },
			info: function(c, g){
				var prices = c.getStage("lianqi_1").prices;
				for (var i = 0; i < prices.length; i++){
					if (prices[i].name == "xiuwei"){ return [g.resPool.get("xiuwei").value, prices[i].val]; }
				}
			}},
		{key: "wander",   done: function(c, g){ return c.stats.wander > 0; }},
		{key: "seclude",  done: function(c, g){ return c.stats.seclude > 0; }},
		{key: "zhuji",    done: function(c, g){ return c.getStage("zhuji_0").researched; }},
		{key: "rift",     done: function(c, g){ return c.stats.rift > 0; }},
		{key: "grift",    done: function(c, g){ return c.riftFloor > 0; }},
		{key: "vein",     done: function(c, g){ return c.veins.some(function(v){ return v.researched; }); }},
		{key: "sect",     done: function(c, g){ return c.sects.some(function(s){ return s.researched; }); }},
		{key: "artifact", done: function(c, g){ return c.artifacts.some(function(a){ return a.researched; }); }},
		{key: "dacheng",  done: function(c, g){ return c.getStage("dacheng_0").researched; }}
	],

	constructor: function(game){
		this.game = game;
		this.buffs = {};
		this.stats = {wander: 0, seclude: 0, rift: 0};
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
						//炼气 (0.06/tick ≈ 0.3/s), negligible next to building income later
						"xiuweiPerTickBase": def.bonus * 2
					},
					chance: (def.chance >= 1) ? 1 : Math.max(0.05, def.chance - i * 0.04),
					lifespan: def.life,	//寿元随大境界走——突破永远延寿,绝不减寿
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
				description: $I("cultivation.vein.desc"),
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

	//applies a fate: records ownership, shows story, grants loot, sets
	//the chosen branch effects so the meta pipeline picks them up
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
			if (f.name == "mojuren" && choice.key == "spare"){
				this.mojurenAlive = true;
			}
			if (f.name == "xugu" && choice.key == "ally"){
				this.xuguAlive = true;
			}
			this.game.msg($I("cultivation.fate." + f.name + "." + choice.key), "important");
		} else {
			this.game.msg($I("cultivation.fate." + f.name + ".story"), "important");
		}
		if (f.grant){
			for (var res in f.grant){
				this.game.resPool.addResEvent(res, f.grant[res]);
			}
		}
		f.researched = true;
	},

	//choice dialog — modal overlay, game keeps ticking underneath
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
		dojo.create("div", {
			className: "xxFateStory",
			innerHTML: $I("cultivation.fate." + f.name + ".story")
		}, card);
		var close = function(choice){
			f.pending = false;
			dojo.destroy(overlay);
			if (restoreFocus && restoreFocus.focus){ restoreFocus.focus(); }
			self.applyFate(f, choice);
			self.game.render();
		};
		for (var i = 0; i < f.choices.length; i++){
			(function(choice){
				var btn = dojo.create("div", {className: "btn nosel modern xxFateBtn", tabIndex: 0}, card);
				dojo.create("span", {
					className: "btnTitle",
					innerHTML: "<b>" + $I("cultivation.fate." + f.name + "." + choice.key + ".opt") + "</b><br/>" +
						"<span class=\"xxFateHint\">" + $I("cultivation.fate." + f.name + "." + choice.key + ".hint") + "</span>"
				}, btn);
				dojo.connect(btn, "onclick", function(){ close(choice); });
			})(f.choices[i]);
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
		var firstBtn = card.querySelector(".xxFateBtn");
		if (firstBtn){ firstBtn.focus(); }
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

	getCurrentRealm: function(){
		var current = this.stages[0];
		for (var i = this.stages.length - 1; i >= 0; i--){
			if (this.stages[i].researched){
				current = this.stages[i];
				break;
			}
		}
		return current;
	},

	getCurrentRealmIndex: function(){
		var cur = this.getCurrentRealm();
		for (var i = 0; i < this.REALM_DEFS.length; i++){
			if (this.REALM_DEFS[i].key == cur.realm){ return i; }
		}
		return 0;
	},

	getBreakChance: function(stage){
		var c = (stage.chance != null) ? stage.chance : 1;
		c += this.breakBoost;
		c -= this.heartDemon * 0.004;
		if (this.failStreakStage == stage.name){
			c += Math.min(5, this.failStreak) * 0.04;	//屡败屡战
		}
		return Math.max(0.05, Math.min(1, c));
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
		if (name == "zhujidan" && this.breakBoost >= 0.3){
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
			this.breakBoost = Math.min(0.3, this.breakBoost + 0.3);
			this.game.msg($I("cultivation.msg.pill.zhujidan"), "notice");
		} else if (name == "qingxin"){
			this.heartDemon = Math.max(0, this.heartDemon - 40);
			this.game.msg($I("cultivation.msg.pill.qingxin"), "notice");
		}
		return true;
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
			var amt = this.roundNice(400 * scale);
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

		var amt = this.roundNice(500 * scale);
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
			var add = 4 + Math.random() * 4;
			if (this.getFate("tihun").researched){ add *= 0.5; }
			this.heartDemon = Math.min(100, this.heartDemon + add);
			this.game.msg($I("cultivation.msg.rift.ambush"), "alert");
			resultCls = "fail"; resultText = $I("cultivation.rift.result.ambush");
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

		//realm carries you; floors outpace you — success chance decays ~3%/floor past floor 3
		var chance = Math.max(0.08, 0.92 + this.getCurrentRealmIndex() * 0.02 - Math.max(0, floor - 3) * 0.03);
		var floorScale = scale * (1 + floor * 0.25);

		if (Math.random() < chance){
			this.riftFloor = floor;
			var amt = this.roundNice(1200 * floorScale);
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
			var amt = this.roundNice(400 * floorScale);
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
			breakBoost: this.breakBoost,
			secluded: this.secluded,
			actionCd: this.actionCd,
			actionCdMax: this.actionCdMax,
			lastAction: this.lastAction,
			actionSeq: this.actionSeq,
			riftKeys: this.riftKeys,
			riftFloor: this.riftFloor,
			spiritRoot: this.spiritRoot,
			buffs: this.buffs,
			stats: this.stats,
			demonWarned: this.demonWarned,
			sihuaCount: this.sihuaCount,
			failStreakStage: this.failStreakStage,
			failStreak: this.failStreak,
			mojurenAlive: this.mojurenAlive,
			xuguAlive: this.xuguAlive,
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
		if (c.lastAction){ this.lastAction = c.lastAction; }
		if (typeof c.actionSeq == "number"){ this.actionSeq = c.actionSeq; }
		if (typeof c.riftKeys == "number"){ this.riftKeys = c.riftKeys; }
		if (typeof c.riftFloor == "number"){ this.riftFloor = c.riftFloor; }
		if (typeof c.mojurenAlive == "boolean"){ this.mojurenAlive = c.mojurenAlive; }
		if (typeof c.xuguAlive == "boolean"){ this.xuguAlive = c.xuguAlive; }
		if (typeof c.heartDemon == "number"){ this.heartDemon = c.heartDemon; }
		if (typeof c.age == "number"){ this.age = c.age; }
		if (c.lifeWarned){ this.lifeWarned = c.lifeWarned; }
		if (typeof c.breakBoost == "number"){ this.breakBoost = c.breakBoost; }
		if (typeof c.secluded == "boolean"){ this.secluded = c.secluded; }
		if (c.spiritRoot){ this.spiritRoot = c.spiritRoot; }
		if (c.buffs){ this.buffs = c.buffs; }
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

		if (this.actionCd > 0){ this.actionCd--; }
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
		//fates fire once when their milestone stage is reached
		for (var i = 0; i < this.fates.length; i++){
			var f = this.fates[i];
			if (f.researched || f.pending){ continue; }
			var st = this.getStage(f.atStage);
			if (st && st.researched){
				if (f.choices){
					this.showFateChoice(f);
				} else {
					this.applyFate(f, null);
				}
			}
		}
		//墨大夫被饶一命后成了常驻心魔 —— occasional taunt + demon growth
		if (this.mojurenAlive && Math.random() < 0.0004){
			var add = 3 + Math.random() * 4;
			this.heartDemon = Math.min(100, this.heartDemon + add);
			var n = Math.floor(Math.random() * 3) + 1;
			this.game.msg($I("cultivation.msg.mojuren." + n), "alert");
		}
		//玄骨上人"盟友" —— occasionally brings relics, occasionally helps himself to your 灵石
		if (this.xuguAlive && Math.random() < 0.0003){
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
			add("realmProductionRatio", this.SECLUSION_MUNDANE);
		}
		if (this.buffs.juqi > 0){
			add("xiuweiRatio", 1.0);
		}
	},

	resetState: function(){
		//stages & fates persist through reincarnation — this IS the prestige
		//ladder, but a new body means a new spirit root and a clean mind
		this.heartDemon = 0;
		this.age = 0;			//新世新身,寿数重来
		this.lifeWarned = {};
		this.dying = false;
		this.breakBoost = 0;
		this.secluded = false;
		this.actionCd = 0;
		this.actionCdMax = 0;
		this.lastAction = null;
		this.actionSeq = 0;
		this.buffs = {};
		this.demonWarned = false;
		this.mojurenAlive = false;
		this.xuguAlive = false;
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
			var mult = this.game.cultivation.getRoot().priceMult;
			if (mult && mult !== 1){
				var scaled = [];
				for (var i = 0; i < prices.length; i++){
					scaled.push({name: prices[i].name, val: prices[i].val * mult});
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
		return label + "<div>" + suffix + "</div>";
	},

	updateEnabled: function(model){
		this.inherited(arguments);
		var cult = this.game.cultivation;
		if (meta_blocked(this.game, model)){
			model.enabled = false;
		}
		function meta_blocked(game, model){
			var m = model.metadata;
			return m && m.chance != null && m.chance < 1 && !m.researched && game.cultivation.isDemonBlocked();
		}
	},

	updateVisible: function(model){
		var cult = this.game.cultivation;
		var meta = model.metadata;
		if (meta.name.indexOf("vein") === 0){
			//veins unlock once the first is affordable-ish — from 筑基 onward
			model.visible = cult.getStageIndex("zhuji_0") >= 0 && (cult.getStage("zhuji_0").researched || meta.researched);
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
		model.visible = meta.researched || idx <= 1 || cult.stages[idx - 1].researched;
	},

	buyItem: function(model, event, callback){
		var meta = model.metadata;
		var cult = this.game.cultivation;
		if (this.game.isReadOnly() || meta.researched || !this.hasResources(model)){
			return this.inherited("buyItem", arguments);
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
			cult.breakBoost = 0;
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
		if (cult.getFate("tihun").researched){ add *= 0.5; }	//啼魂兽噬魔
		cult.heartDemon = Math.min(100, cult.heartDemon + add);
		cult.breakBoost = 0;
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
		model.visible = true;
	},

	buyItem: function(model, event, callback){
		if (this.game.isReadOnly()){
			return {itemBought: false, reason: "read-only"};
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
		model.visible = true;
	},

	updateEnabled: function(model){
		model.enabled = (model.metadata.val || 0) > 0;
		model.highlightUnavailable = false;
	},

	buyItem: function(model, event, callback){
		if (this.game.isReadOnly()){
			return {itemBought: false, reason: "read-only"};
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

		//道途指引 — onboarding checklist; renders next objectives, hides when done
		this.guideBox = dojo.create("div", { className: "xxGuide" }, tabContainer);
		var self = this;
		this.guideBox.onclick = function(e){
			var el = e.target;
			if (el && el.className == "xx-guide-nav"){
				var target = el.getAttribute("data-tab");
				var navTab = target && self.game.getTab(target.toLowerCase());
				if (navTab && navTab.visible){
					//same path as a tab-bar click: set id, then rebuild
					self.game.ui.activeTabId = target;
					self.game.ui.render();
				}
			}
		};

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
		this.riftLadder = dojo.create("div", {className: "xxRiftLadder"}, this.riftPanel);
		var riftFoot = dojo.create("div", {className: "xxRiftFoot"}, this.riftPanel);
		this.riftKeysEl = dojo.create("span", {className: "xxRiftKeys"}, riftFoot);
		dojo.create("span", {className: "xxRiftHint", innerHTML: $I("cultivation.rift.hint")}, riftFoot);
		this.riftResult = dojo.create("div", {className: "xxRiftResult", style: {display: "none"}}, this.riftPanel);
		this._ladderFloor = -1;
		this._resultSeq = -1;

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

		//pills — 炼制入库,服用消耗;每丹双钮
		dojo.create("div", {
			className: "cultivationSection",
			innerHTML: $I("cultivation.section.pill")
		}, tabContainer);
		var pillCraftCtrl = new classes.ui.PillCraftBtnController(this.game);
		var pillGrid = dojo.create("div", {className: "xxStageGrid"}, tabContainer);
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

		var html =
			"<div class=\"xx-hd-main\">" +
				"<span class=\"xx-realm-big\">" + realm.label + "</span>" +
				"<span class=\"xx-chip xx-bonus\">" + $I("cultivation.header.bonus", [fmt(ratio * 100, false, false, 0)]) + "</span>" +
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
		if (cult.breakBoost > 0){
			extras.push($I("cultivation.header.breakboost", [Math.round(cult.breakBoost * 100)]));
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
				var story = $I("cultivation.fate." + owned[j].name + ".story").replace(/"/g, "&quot;");
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

		//guide checklist: up to 3 pending steps; self-hides once all done
		if (this.guideBox){
			var guide = cult.getGuideSteps();
			if (!guide.pending.length){
				this.guideBox.style.display = "none";
			} else {
				this.guideBox.style.display = "";
				var gh = "<div class=\"xx-guide-hd\">" +
					$I("cultivation.guide.title", [guide.done, guide.total]) + "</div>";
				var show = Math.min(3, guide.pending.length);
				for (var i = 0; i < show; i++){
					var step = guide.pending[i];
					gh += "<div class=\"xx-guide-step\">" +
						$I("cultivation.guide." + step.key);
					var navTab = step.nav && this.game.getTab(step.nav.toLowerCase());
					if (navTab && navTab.visible){
						gh += " <span class=\"xx-guide-nav\" data-tab=\"" + step.nav + "\">&gt; " + navTab.tabName + "</span>";
					}
					if (step.info){
						var pr = step.info(cult, this.game);
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
				this.guideBox.innerHTML = gh;
			}
		}

		//a realm section appears only when its first stage is within reach
		if (this.realmSections){
			for (var key in this.realmSections){
				var sec = this.realmSections[key];
				var anyReached = false;
				for (var j = 0; j < cult.stages.length; j++){
					if (cult.stages[j].realm == key && cult.stages[j].researched){ anyReached = true; break; }
				}
				var show = anyReached || sec.firstIdx == 0 || cult.stages[sec.firstIdx - 1].researched;
				sec.header.style.display = show ? "" : "none";
				sec.grid.style.display = show ? "" : "none";
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
		if (this.cdWrap){
			var cdOn = cult.actionCd > 0;
			this.cdWrap.style.display = cdOn ? "" : "none";
			if (cdOn){
				this.cdLabel.innerHTML = $I("cultivation.action.cd", [Math.ceil(cult.actionCd / 5)]);
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

		if (this.ascendBtn){
			var dujie = cult.getStage("dujie_0");
			this.ascendBtn.style.display = (dujie && dujie.researched) ? "inline-block" : "none";
		}
	}
});
