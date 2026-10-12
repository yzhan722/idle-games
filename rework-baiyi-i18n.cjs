// 百艺重构 i18n:重命名全部过时升级 + 补全缺失键 + 删死键
const fs = require('fs');

// [zh_label, zh_desc, en_label, en_desc]  desc 为 null 则不写 desc
const UP = {
	// ------- 采集/农耕 -------
	mineralHoes: ["灵石锄", "灵石为刃的灵锄——灵谷产出 +50%", "Spiritstone Hoe", "A hoe of spirit stone. +50% spirit grain output"],
	ironHoes: ["玄铁锄", "玄铁灵锄——灵谷产出再增 30%", "Blackiron Hoe", "Blackiron hoes. +30% spirit grain output"],
	mineralAxes: ["灵石斧", "灵石斧刃——灵木产出 +70%", "Spiritstone Axe", "+70% spirit wood output"],
	ironAxes: ["玄铁斧", "玄铁斧——灵木产出 +50%", "Blackiron Axe", "+50% spirit wood output"],
	steelAxe: ["精钢斧", "精钢锻斧——灵木产出 +50%", "Steel Axe", "+50% spirit wood output"],
	titaniumAxe: ["庚金斧", "庚金斧——灵木产出 +50%", "Gengjin Axe", "+50% spirit wood output"],
	alloyAxe: ["太乙斧", "太乙精金斧——灵木产出 +50%", "Taiyi Axe", "+50% spirit wood output"],
	unobtainiumAxe: ["虚空斧", "虚空仙金铸斧——灵木产出 +50%", "Void Axe", "+50% spirit wood output"],
	reinforcedSaw: ["固齿锯", "加固锯刃——灵木坊效率 +20%", "Reinforced Saw", "+20% lumber mill efficiency"],
	steelSaw: ["精钢锯", "精钢锯——灵木坊效率 +20%", "Steel Saw", "+20% lumber mill efficiency"],
	titaniumSaw: ["庚金锯", "庚金锯——灵木坊效率 +15%", "Gengjin Saw", "+15% lumber mill efficiency"],
	alloySaw: ["太乙锯", "太乙锯——灵木坊效率 +15%", "Taiyi Saw", "+15% lumber mill efficiency"],
	unobtainiumSaw: ["虚空锯", "虚空锯——灵木坊效率 +25%", "Void Saw", "+25% lumber mill efficiency"],

	// ------- 仓储 -------
	stoneBarns: ["拓基谷仓", "拓宽仓基——灵木与玄铁储量 +75%", "Expanded Barns", "+75% wood & iron storage"],
	reinforcedBarns: ["固梁谷仓", "加固梁架——灵木与玄铁储量 +80%", "Reinforced Barns", "+80% wood & iron storage"],
	titaniumBarns: ["庚金谷仓", "庚金为椽——仓储翻倍(同类加成相互叠乘)", "Gengjin Barns", "Double storage (upgrades stack)"],
	alloyBarns: ["太乙谷仓", "太乙精金为椽——仓储翻倍", "Taiyi Barns", "Double storage"],
	concreteBarns: ["金刚岩谷仓", "金刚岩筑仓——储量 +75%", "Adamantite Barns", "+75% storage"],
	reinforcedWarehouses: ["固梁须弥库", "加固梁架——须弥库储量 +25%", "Reinforced Warehouses", "+25% warehouse storage"],
	titaniumWarehouses: ["庚金须弥库", "庚金为架——须弥库储量 +50%", "Gengjin Warehouses", "+50% warehouse storage"],
	alloyWarehouses: ["太乙须弥库", "太乙精金为架——须弥库储量 +45%", "Taiyi Warehouses", "+45% warehouse storage"],
	concreteWarehouses: ["金刚岩须弥库", "金刚岩筑库——须弥库储量 +35%", "Adamantite Warehouses", "+35% warehouse storage"],
	storageBunkers: ["地宫秘库", "深挖地宫——须弥库储量 +20%", "Hidden Vaults", "+20% warehouse storage"],
	silos: ["灵谷窖", "须弥库亦可储藏灵谷", "Grain Cellars", "Warehouses can store spirit grain"],
	refrigeration: ["寒玉窖藏", "以寒玉保鲜——灵谷上限 +75%", "Frostjade Cellars", "+75% spirit grain cap"],
	strenghtenBuild: ["金刚立柱", "以金刚岩固本培元——解锁金刚岩仓储", "Adamantite Pillars", "Reinforce storage with adamantite"],
	transportSuperposition: ["须弥挪移", "一库纳百川——须弥库收纳万类资源", "Pocket-Dimension Storage", "Warehouses hold every kind of resource"],
	freightfulExchange: ["漕运互通", "水路商道大开——为须弥挪移铺路", "Freight Exchange", "Paves the way for pocket-dimension storage"],

	// ------- 矿脉 -------
	geodesy: ["堪舆术", "寻龙点穴——灵石矿脉效率提升,可采得黄金", "Geomancy", "Mines are more effective and can yield gold"],
	miningDrill: ["破山凿", "破山之凿——灵石矿脉效率更上层楼", "Mountain-Piercing Drill", "Miners are more effective"],
	prospecting: ["探脉术", "循地脉勘矿——天象异动时偶有所获", "Prospecting", "Following the earth's veins; meteors may yield ore"],
	goldOre: ["采金术", "炼器炉熔炼矿石时伴生黄金", "Gold Veins", "Smelters yield traces of gold"],

	// ------- 法器(灵力/历练) -------
	compositeBow: ["猎妖弓", "灵弓猎妖——灵力产出 +50%", "Demonhunter Bow", "+50% spirit power output"],
	crossbow: ["劲弩", "百步劲弩——灵力产出 +25%", "Great Crossbow", "+25% spirit power output"],
	railgun: ["庚金雷铳", "雷火铳鸣——灵力产出 +25%", "Gengjin Thundergun", "+25% spirit power output"],
	bolas: ["缚灵索", "缚灵石索——历练所获皮毛更丰", "Spirit-Binding Lasso", "Hunts yield more furs"],
	huntingArmor: ["猎妖皮甲", "猎妖皮甲——历练所获更丰", "Hunter's Hide", "Hunts yield more resources"],
	steelArmor: ["精钢法甲", "精钢法衣护体——历练所获更丰", "Steel Wardrobe", "Hunts yield more resources"],
	alloyArmor: ["太乙法甲", "太乙法衣——历练所获更丰", "Taiyi Wardrobe", "Hunts yield more resources"],
	nanosuits: ["星辰法衣", "星辰精金织就法衣——历练无往不利", "Starforged Robes", "Hunts yield more resources"],

	// ------- 匠坊/机括 -------
	register: ["功绩簿", "论功行赏、差遣有序——灵力产出 +10%", "Merit Ledger", "+10% spirit power output"],
	factoryAutomation: ["机括自运", "机关枢每年自动将满仓资源炼为工艺材料", "Automated Works", "Once a year, Steamworks refine full resources into crafts"],
	advancedAutomation: ["千机自运", "机括自运每年运转两次", "Grand Automation", "Automation runs twice a year"],
	pneumaticPress: ["气动锻台", "机括自运亦将玄铁锻为玄铁板", "Pneumatic Press", "Automation also forges iron into plates"],
	combustionEngine: ["地火机关", "地火驱动——机关枢玄炭消耗 −20%", "Pyro-Engine", "−20% Steamworks coal consumption"],
	fuelInjectors: ["焚雾喷轮", "焚雾喷轮——机关枢玄炭消耗再 −20%", "Ember Injectors", "−20% more Steamworks coal consumption"],
	factoryLogistics: ["百艺调度", "匠坊为制作效率提供更多加成", "Workshop Logistics", "Factories grant a bigger craft bonus"],
	factoryOptimization: ["百艺精益", "匠坊效率提升(空闲傀儡上限)", "Workshop Refinement", "Improves factory effectiveness"],
	factoryRobotics: ["傀儡操持", "傀儡代劳——匠坊效率更进", "Automaton Handlers", "Improves factory effectiveness"],
	spaceEngineers: ["天工巧匠", "巧匠运斤——匠坊效率再进", "Skywrights", "Improves factory effectiveness"],
	aiEngineers: ["神机匠师", "神机与匠心相济——匠坊效率益精", "Sage Engineers", "Improves factory effectiveness"],
	chronoEngineers: ["宙光匠圣", "匠圣之手洞穿光阴——匠坊效率登峰,时间跳跃时亦劳作", "Aeonwrights", "Top engineer effectiveness; they even work during time skip"],
	factoryProcessing: ["百艺精炼", "每级匠坊使灵液精炼效率 +5%", "Workshop Processing", "Each factory improves essence refining by 5%"],
	spaceManufacturing: ["天工造物", "匠坊以 75% 制作加成泽及星河营造", "Celestial Crafting", "Factories boost space construction at 75% of craft ratio"],
	neuralNetworks: ["千机神识", "神识织网——强化匠坊", "Thousandfold Sense", "A lattice of insight. Improves factories"],
	carbonSequestration: ["涤尘阵", "涤尘大阵——匠坊进阶形态", "Ash-Cleansing Array", "Advances the factory line"],
	logistics: ["百艺统筹", "统筹调配——制作加成 +5%", "Coordination", "+5% craft output"],
	augumentation: ["器物淬炼", "锻骨外甲——制作加成 +25%", "Artifact Tempering", "+25% craft output"],
	assistance: ["傀儡臂助", "傀儡代劳——灵力产出 +15%", "Automaton Helpers", "+15% spirit power output"],

	// ------- 文枢/观星 -------
	printingPress: ["雕版印经", "机关枢自动印制功法卷轴", "Scripture Press", "Steamworks automatically print manuscripts"],
	offsetPress: ["灵纹印版", "灵纹套印——印经效率 ×4", "Spirit-Rune Press", "×4 printing efficiency"],
	photolithography: ["神光刻纹", "神光蚀纹——印经效率再 ×4", "Divine Etching", "×4 printing efficiency"],
	cryocomputing: ["寒玉枢阁", "寒玉镇阁——玉简库能耗 −50%", "Frostjade Archive", "−50% archive energy consumption"],
	uplink: ["灵犀一线", "灵犀相通——玉简库与百草园互济加成", "Heartlink", "Archives and herb gardens boost each other"],
	starlink: ["星罗棋布", "星罗网布——每级玉简库为百草园 +1%", "Star Lattice", "Each archive grants +1% to herb gardens"],
	machineLearning: ["神机演法", "神机推演——每级天机枢核使玉简库效能 +10%", "Divine Computation", "Each active core boosts archives by 10%"],
	satelliteRadio: ["星枢传音", "每颗灵枢星使传音塔效能 +0.5%", "Star Hub Relay", "Each satellite boosts broadcast towers by 0.5%"],
	satnav: ["星枢定航", "每颗灵枢星使灵舟建造所需星图 −1.25%", "Star Navigation", "Each satellite reduces ship starchart cost by 1.25%"],
	cadSystems: ["天机图算", "天下文枢共演阵图——阵图炼制效率提升", "Diagram Computation", "All science buildings improve blueprint crafting"],
	astrolabe: ["浑天仪", "浑天仪测斗转星移——观星台感悟上限 +50%", "Armillary Sphere", "+50% observatory insight cap"],
	celestialMechanics: ["推步术", "推步天轨——天象与异星带来更多感悟", "Celestial Reckoning", "Celestial events yield more insight"],
	seti: ["巡天观象", "列阵巡天——天象观测自动静默进行", "Skyward Array", "Celestial events resolve automatically and silently"],
	titaniumMirrors: ["庚金天镜", "庚金磨镜——每级观星台使藏经阁效能 +2%", "Gengjin Mirrors", "Each observatory grants +2% to libraries"],
	unobtainiumReflectors: ["虚空鉴星镜", "虚空仙金为鉴——每级观星台再为藏经阁 +2%", "Void Mirrors", "Each observatory grants another +2% to libraries"],
	eludiumReflectors: ["星辰鉴", "星辰精金为鉴——每级观星台再为藏经阁 +2%", "Starforged Mirrors", "Each observatory grants another +2% to libraries"],
	ai: ["天机演算", "窥破天机的一缕神识", "Heavenly Computation", "A wisp of insight that peers into the dao"],
	aiBases: ["天机灵台", "天机枢核调度后勤——每级使月垒储量 +10%", "Core Logistics", "Each active core boosts moon base storage by 10%"],

	// ------- 地火灵液 -------
	pumpjack: ["引泉机括", "机括引泉——地火泉眼效率 +45%,每级耗 1 灵机", "Spring Mechanism", "+45% well efficiency; each consumes 1 energy"],
	oilRefinery: ["炼液术", "炼液之术——地火泉眼效率 +35%", "Essence Refining", "+35% well efficiency"],
	oilDistillation: ["百萃灵液", "百般淬萃——地火灵液产出 +75%", "Hundredfold Distillation", "+75% essence output"],

	// ------- 舟港 -------
	cargoShips: ["楼船巨舸", "楼船蔽江——每艘灵舟使港口容量 +1%", "Great Hulls", "Each ship grants +1% harbor capacity"],
	barges: ["漕舫", "漕舫集散——港口可储更多玄炭", "Canal Barges", "Harbors store more coal"],
	reactorVessel: ["雷火舟枢", "雷火入舟——每级地火大阵使灵舟潜能 +5%", "Thunderfire Keels", "Each reactor boosts ship potential by 5%"],

	// ------- 炼器炉 -------
	electrolyticSmelting: ["雷锻法", "引雷入炉——炼器炉效能翻倍", "Thunderforging", "Smelters are twice as effective"],
	oxidation: ["风煅术", "鼓风煅烧——煅金炉玄铁 +95%、庚金 +285%", "Wind Tempering", "Calciners: +95% iron, +285% gengjin"],
	rotaryKiln: ["八卦转炉", "八卦轮转——煅金炉玄铁 +75%、庚金 ×3", "Bagua Kiln", "Calciners: +75% iron, ×3 gengjin"],
	fluidizedReactors: ["九转流化炉", "九转流化——煅金炉效率翻倍", "Ninefold Kiln", "Calciners are twice as effective"],
	steelPlants: ["百炼钢坊", "煅金炉一成玄铁转炼精钢", "Steelworks", "10% of calciner iron becomes steel"],
	automatedPlants: ["傀儡钢坊", "傀儡司炉——钢坊受 25% 制作加成", "Automaton Steelworks", "Steelworks gain 25% of craft ratio"],
	nuclearPlants: ["雷髓钢坊", "雷髓催炼——每级地火大阵为钢坊 +2%", "Thunderspark Steelworks", "+2% to steelworks per reactor"],

	// ------- 灵圃/能源 -------
	photovoltaic: ["曜日灵圃增效", "曜日聚灵——聚灵阵效能 +50%", "Solar Attunement", "+50% solar array output"],
	thinFilm: ["曦光膜", "曦光薄膜——聚灵阵严冬亦产", "Dawnfilm", "Solar arrays work slightly in winter"],
	qdot: ["星辉珠", "星辉灵珠——聚灵阵全年略增", "Starglint Beads", "Solar arrays slightly more effective all year"],
	hydroPlantTurbines: ["水灵轮", "水枢灵轮——水灵阵能源 +15%", "Spiritwater Turbines", "+15% hydro plant output"],
	coldFusion: ["寒髓聚灵", "寒髓聚灵——地火大阵能源 +25%", "Coldmarrow Fusion", "+25% reactor energy"],
	enrichedUranium: ["雷晶淬炼", "淬炼雷晶——地火大阵雷晶消耗 −25%", "Enriched Thundercrystals", "−25% reactor uranium consumption"],
	thoriumReactors: ["紫雷炉心", "掺紫雷晶——地火大阵能源 +25%", "Purple-Thunder Cores", "+25% reactor energy"],
	enrichedThorium: ["紫雷淬精", "淬精紫雷——地火大阵紫雷晶消耗 −25%", "Refined Purple Thunder", "−25% reactor thorium consumption"],

	// ------- 兽苑/百草 -------
	unicornSelection: ["麒麟选育", "择优选育——麒麟苑效能 +25%", "Qilin Husbandry", "+25% pasture effectiveness"],
	alicornStable: ["麟角栏", "筑栏蓄麟——(挑战)麟角上限提升", "Horn Stable", "(Challenge) raises alicorn cap"],
	petri: ["百草灵皿", "百草灵皿——百草园典籍炼制加成更盛", "Herbal Crucibles", "Herb gardens boost codex crafting"],
	biofuel: ["百草灵萃", null, "Bio-Essence", null],

	// ------- 星河/虚空/时序 -------
	lhc: ["星河斗阵", "星河斗阵——每级星河大阵提升感悟上限", "Starriver Array", "Each accelerator raises the insight cap"],
	energyRifts: ["灵墟裂隙", "星河大阵开辟袖里乾坤——仓储异度空间", "Spirit-Void Rifts", "Accelerators open pocket dimensions for storage"],
	stasisChambers: ["滞灵玄室", "滞灵玄室——灵墟裂隙储量 +95%", "Stasis Chambers", "+95% rift storage"],
	voidEnergy: ["墟能引", "引墟能为用——灵墟裂隙储量更增", "Void Draw", "Rift storage further improved"],
	darkEnergy: ["暗髓引", "引暗髓为用——灵墟裂隙储量 ×2.5", "Darkmarrow Draw", "Rift storage ×2.5"],
	tachyonAccelerators: ["宙光星阵", "宙光入阵——灵墟裂隙储量 ×5", "Aeonglow Arrays", "Rift storage ×5"],
	tachyonModerator: ["宙光缓阀", "缓阀镇流——解锁时序掌控的受控延宕", "Aeonglow Moderator", "Unlocks controlled chronocontrol delay"],
	chronoforge: ["宙光烘炉", "涉及时辰操纵的异术——为宙光之法筑基", "Chronoforge", "The art of manipulating time itself"],
	fluxCondensator: ["时汐凝露", "时汐凝露——轮回殿可携工艺资源转世", "Flux Condensator", "Chronospheres preserve crafted resources"],
	voidAspiration: ["噬空术", "噬空而汲——解锁虚空汲取与虚空裂隙", "Void Aspiration", "Unlocks Void Hoover and Void Rifts"],
	distorsion: ["宙光扭曲", "扭曲宙光——时序掌控效能提升", "Time Distortion", "Improves chronocontrol effectiveness"],
	turnSmoothly: ["时光安澜", "安澜镇潮——轮回殿产出时汐之流", "Chronosurge", "Chronospheres now generate temporal flux"],
	invisibleBlackHand: ["无形黑手", "无形黑手操盘玄晶市——通常平稳,怒时击市", "Invisible Black Hand", "Guides the blackcoin market; smoothly, until angered"],

	// ------- 星海 -------
	solarSatellites: ["曜日星枢", "曜日反哺——灵枢星由耗转产", "Solar Starhubs", "Satellites generate energy instead of consuming it"],
	spiceNavigation: ["灵香引航", "引航法器——为星域远航指引方位", "Incense Navigation", "A navigation relic to guide star voyages"],
	longRangeSpaceships: ["破空神舟", "破空神舟——以灵石为引,横渡星域", "Void-Piercing Arks", "Ranging the stars on spirit stones"],
	mWReactor: ["星核微炉", "星核入微炉——月垒虚空仙金产量 +75%", "Starcore Microwarp", "+75% lunar outpost production"],
	amReactors: ["湮尘灵炉", "湮尘灵炉——探星舟与太空灯塔效能 +95%", "Voiddust Reactors", "+95% research vessel & beacon output"],
	amReactorsMK2: ["湮尘灵炉·改", "湮尘灵炉·改——效能再 +77%", "Voiddust Reactors II", "Another +77% output"],
	voidReactors: ["太虚灵炉", "太虚灵炉——效能再 +116%", "Grand Void Reactors", "Another +116% output"],
	relicStation: ["遗珍驿站", "太空灯塔改装遗珍站——逆向遗宝,日产 0.01 遗珍", "Relic Stations", "Beacons reverse-engineer 0.01 relic per day each"],
	amDrive: ["湮尘推进", "湮尘驱动星槎——航线提速", "Voiddust Drive", "An antimatter-powered rocket engine"],
	amBases: ["湮尘月垒", "湮尘御垒——月垒能耗 −50%", "Voiddust Bases", "−50% moon base energy consumption"],
	eludiumCracker: ["碎星钳", "碎星钳开陨星——「碎星」号输出翻倍", "Starbreaker Pliers", "The Starbreaker's output is doubled"],
	thoriumEngine: ["紫雷推进", "紫雷为引——星槎航速大增", "Purple-Thunder Drive", "A new rocket engine to go faster in space"],
};

// 斑灵马系
const ZEBRA = {
	darkRevolution: ["玄血变", "以血魄石为引的异族秘仪——斑灵狩猎筹备之始", "Bloodrite Awakening", "A foreign rite keyed to bloodstones — the start of zebra preparations"],
	darkBrew: ["玄血灵酿", "血魄入酿——饮之耳目通灵,狩猎更盛", "Blood Spirit Brew", "Bloodstone brew — sharper senses for the hunt"],
	zebraTrappers: ["陷兽阱", null, null, null],
	reforgedOutposts: ["重铸哨站", null, null, null],
	whispers: ["骨庙低语", "骨庙低语——斑灵马筹备更速", "Bone-Temple Whispers", "Whispers in the bone temple quicken preparations"],
	minerologyDepartment: ["矿务司", "斑灵马矿务司署——筹备效率更上层楼", "Mineralogy Bureau", "The zebra mining bureau improves preparations"],
	bloodstoneInstitute: ["血魄研院", "血魄石研院——寻得血魄几率大增", "Bloodstone Institute", "Greatly improves bloodstone discovery"],
	rangefinders: ["测距仪", null, null, null],
};

// 合成/资源补缺
const EXTRA = {
	"workshop.crafts.plastic.label": ["塑灵脂", "Spirit Resin"],
	"workshop.crafts.microchip.label": ["玄机微盘", "Arcane Microdisc"],
	"workshop.crafts.tMythril.label": ["太虚秘银", "Void Mythril"],
	"resources.plastic.title": ["塑灵脂", "spirit resin"],
	"resources.microchip.title": ["玄机微盘", "arcane microdisc"],
	"resources.tMythril.title": ["太虚秘银", "void mythril"],
	"resources.gflops.title": ["算力", "gigaflops"],
	"resources.hashrates.title": ["推演力", "hashrates"],
	"resources.necrocornDeficit.title": ["魔麒亏欠", "necrocorn deficit"],
	"buildings.spaceport.label": ["星槎渡", "Starport"],
	"workshop.zebraUpgradesPanel.label": ["斑灵秘艺", "Zebra Arts"],
	// dead 死键将删除(见下)
};

const DEAD_UPGRADES = ["ironwood","concreteHuts","unobtainiumHuts","eludiumHuts","gmo","pyrolysis","unobtainiumDrill","amFission","hubbleTelescope","astrophysicists"];

function apply(path, zhMode) {
	const j = JSON.parse(fs.readFileSync(path, 'utf8'));
	let n = 0;
	const set = (k, v) => { if (v === null || v === undefined) return; if (j[k] !== v) { j[k] = v; n++; } };
	for (const [id, [zl, zd, el, ed]] of Object.entries(UP)) {
		set(`workshop.${id}.label`, zhMode ? zl : el);
		set(`workshop.${id}.desc`, zhMode ? zd : ed);
	}
	for (const [id, [zl, zd, el, ed]] of Object.entries(ZEBRA)) {
		set(`workshop.zebraUpgrade.${id}.label`, zhMode ? zl : el);
		set(`workshop.zebraUpgrade.${id}.desc`, zhMode ? zd : ed);
	}
	for (const [k, [z, e]] of Object.entries(EXTRA)) set(k, zhMode ? z : e);
	for (const id of DEAD_UPGRADES) {
		for (const suf of ['label','desc','flavor']) {
			const k = `workshop.${id}.${suf}`;
			if (k in j) { delete j[k]; n++; }
		}
	}
	fs.writeFileSync(path, JSON.stringify(j, null, '\t') + '\n');
	console.log(path, 'changed:', n);
}

apply('res/i18n/zh.json', true);
apply('res/i18n/crowdin/zh.json', true);
apply('res/i18n/en.json', false);
