/**
 * 弟子系统已整体移除 —— 此文件仅保留生态探索引擎(Map)。
 *
 * VillageManager 是惰性壳:不生成弟子、不结算职位产出;灵气(manpower)
 * 由建筑 *PerTickBase 效果直接结算,并作为生态探索的消耗燃料。
 */
dojo.declare("classes.managers.VillageManager", com.nuclearunicorn.core.TabManager, {

	constructor: function(game){
		this.game = game;
		this.sim = {
			hadKittenHunters: true	//pacifism 挑战 cleanPaws 徽章判定读取
		};
		this.map = new classes.village.Map(game);
	},

	getBiome: function(id){
		return this.getMeta(id, this.map.biomes);
	},

	getBiomeLevel: function(id){
		var biome = this.getBiome(id);
		return biome ? (biome.val || 0) : 0;
	},

	getCombatLevel: function(combatExp){
		return Math.max(1, Math.floor(Math.pow(combatExp, 0.25)));
	},

	getCombatExpProgress: function(combatExp) {
		var lvl = this.getCombatLevel(combatExp);
		var currentThreshold = lvl <= 1 ? 0 : Math.pow(lvl, 4);
		var nextThreshold = Math.pow(lvl + 1, 4);
		var current = combatExp - currentThreshold;
		var total = nextThreshold - currentThreshold;
		return {
			current: current,
			total: total,
			pct: Math.floor(100 * current / total)
		};
	},

	update: function(){ },
	updateEffectCached: function(){
		this.map.updateEffectCached();
	},
	fastforward: function(){ },

	resetState: function(){
		this.sim.hadKittenHunters = true;
		if (this.map.resetState){
			this.map.resetState();
		}
	},

	save: function(saveData){
		saveData.village = {
			biomes: this.filterMetadata(this.map.biomes, ["name", "unlocked", "val", "on", "cp"]),
			currentBiome: this.map.currentBiome,
			lastBiome: this.map.lastBiome,
			hadKittenHunters: this.sim.hadKittenHunters,
			map: this.map.save()
		};
	},

	load: function(saveData){
		if (!saveData.village){
			return;
		}
		if (saveData.village.biomes){
			this.loadMetadata(this.map.biomes, saveData.village.biomes, "biomes");
			this.map.currentBiome = saveData.village.currentBiome;
			this.map.lastBiome = saveData.village.lastBiome;
			this.map.updateLocks();
		}
		this.sim.hadKittenHunters = (saveData.village.hadKittenHunters === undefined) ? true : saveData.village.hadKittenHunters;
		if (saveData.village.map){
			this.map.load(saveData.village.map);
		}
	}
});

//=========================================
//				MAP WIDGETS
//=========================================
dojo.declare("classes.village.Map", null, {
	game: null,
	villageLevel: 0,

	/*% explored, affects your priceRatio */
	//TO BE IMPLEMENTED
	exploredLevel: 0,

	// point on map currently being explored
	currentBiome: null,
	lastBiome: null,

	//current map id
	activeMapId: "cath",

	//level of expedition squad
	explorersLevel: 0,

	//level of your supply depo
	hqLevel: 0,

	//current explorer squad
	squad: {
		level: 1,
		hp: 50,
		prevHp: 50,
		atk: 2,
		def: 1,
		agi: 1,
		str: 1,
		spd: 1
	},

	//Combat frame. Every tick frame is increased by X. There are 100 frames in a round, and every combatan can attack once per X fames adjusted for agi.
	frame: 0,

	//energy/stamina/supplies of your exploration squad
	energy: 70,

	//TODO: in a long run you can probably have multiple maps and multiple expeditions

	//biome fauna:
	//none/neutral/agressive
	//hp/

	defaultFaunaNames : ["giant moth", "mantis", "slime mold"],

	/**
	 * biome progression map
	 *
	 *  badlands (?)
	 *   |
	 *  desert    ->   blood desert (restricted biome) -> tundra  ->  arctic
	 *   | 												/
	 *  plain       -\   ...    /->  coast -> stone ocean
	 *   |
	 *  village . . .  > hills  ->   mountain 	-> volcano
	 *   |
	 *  forest      _/	 ...	\->  swamps
	 *   |											\
	 *  rainforest 	->  bone forest (restricted biome) -> savanna  -> ?
	 *   |
	 *  jungle (?)
	 */


	/**
	 * terrainPenalty - affects how much cp exploration will cost
	 * faunaPenalty - affects mob spawn rate (% chance where x1.0 is 100%)
	 * 
	 * level: current exploration level
	 **/

	//todo: aggregate biomes inline?
	maps: [{
			name: "cath",
			title: "Cath",
			description: "Mystical lands of Cath are full of perils and wonders",
			biomes: ["village", "plains", "forest", "hills", "boneForest", "rainForest", "mountain", "volcano", "desert", "bloodDesert", "swamp" ]
		},{
			name: "space",
			title: "Space",
			description: "Black stars and endless seas",
			biomes: ["cath", "redmoon"],
			unlocked: false
		},
	],

	//TODO: should we use TabManager wrapper or perhaps separate metadata handling logic to MetaTable?
	biomes: [
	{
		name: "village",
		title: "Village",
		desc: "Improves exploration rate of all biomes",
		terrainPenalty: 0.85,
		biomePenalty: 0.85,
		mobLevel: 1,
		faunaPenalty: 0,
		unlocked: true,
		rewards: [
			{
				name: "catnip", value: 20, chance: 1, width: 0.05, multiplier: 1.05,
			},
			{
				name: "wood", value: 10, chance: 0.95, width: 0.15, multiplier: 1.05,
			}
		],
	},
	{
		name: "plains",
		title: "Plains",
		desc: "Improves catnip generation by 1% per level",
		terrainPenalty: 1.0,
		mobLevel: 3,
		faunaNames: ["grass snake", "raptor", "vole"],
		unlocked: true,
		unlocks: {
			biomes: ["hills"]
		},
		effects:{
			catnipRatio: 0.01
		},
		/**
		 * Reward for clearing explored biome.
		 * We will follow the same notation and same seasonality where it makes sense
		 */
		rewards: [
			{
				name: "catnip", value: 100, chance: 1, width: 0.21, multiplier: 1.2,
			},
			{
				name: "wood", value: 25, chance: 0.75, width: 0.15, multiplier: 1.15,
			}
		],
		lore: {
			5: "Legends tell about the time when the whole world been covered with trees"
		},
	},
	{
		name: "hills",
		title: "Hills",
		desc: "TBD",
		mobLevel: 3,
		terrainPenalty: 1.2,
		unlocked: false,
		faunaNames: ["rock lizard", "centipede", "stone toad", "cave bat"],
		unlocks: {
			biomes: ["mountain"]
		},
		evaluateLocks: function(game){
			return game.village.getBiomeLevel("plains") >= 5 || game.village.getBiomeLevel("forest") >= 5;
		},
		lore: {
			5: "You can see small lizards enjoying the sun"
		},
	},
	{
		name: "forest",
		title: "Forest",
		desc: "Improves your wood production by 1% per level",
		mobLevel: 5,
		lore: {
			5: "It smells really nice",
			10: "The forest is rumored to be endless and covering half of the planet",
			15: "There is something in the forest and no one knows what it is. Not many are sure if it really exists. If it does, it is somewhere deep below, days of travel, years, centuries maybe."
		},
		terrainPenalty: 1.2,
		faunaPenalty: 1.5,
		unlocked: true,
		unlocks: {
			biomes: ["boneForest"]
		},
		effects: {
			woodRatio: 0.01
		},
		rewards: [
			{
				name: "wood", value: 100, chance: 1, width: 0.35, multiplier: 1.2,
			},
			{
				name: "catnip", value: 25, chance: 0.65, width: 0.15, multiplier: 1.15,
			}
		],
	},
	{
		name: "boneForest",
		title: "Bone Forest",
		terrainPenalty: 1.9,
		mobLevel: 30,
		faunaNames: ["bone spider"],
		unlocked: false,
		evaluateLocks: function(game){
			return game.village.getBiomeLevel("forest") >= 25 && game.village.getBiomeLevel("rainForest") >= 5;
		},
		lore: {
			5: "A place where trees are made of bones"
		},
	},{
		name: "rainForest",
		title: "Rain Forest",
		description: "TBD",
		terrainPenalty: 1.4,
		mobLevel: 15,
		faunaNames: ["poison frog", "razor leech", "jaguar", "giant centipede"],
		unlocked: false,
		5: "The trees are so tall you don't see where it ends. When the rain starts it can go for hundreds of years.",
		10: "In the fog you can see the mountains. The mountains have eyes and sometimes change places."
	},
	{
		name: "mountain",
		title: "Mountain",
		description: "Improves mineral generation by 1% per level",
		mobLevel: 35,
		terrainPenalty: 1.2,
		faunaNames: ["mountain goat", "rock worm", "yeti cub"],
		lore: {
			5: "Remember to grab your mandatory 50 meters of rope. The ascend will take quite some time.",
			10: "A small and larger structures cut from a limestone are towering there. Griffins call this place The White Citadel.",
			15: "Everything is so pale and white we don’t know what exactly is it made of. There are some red marking and drawings everywhere",
			20: "Why is this place called a citadel? You can see some system there. This place is a structure on its own, a ziggurat made of ziggurats."

		},
		evaluateLocks: function(game){
			return game.village.getBiomeLevel("hills") >= 10;
		},
		unlocks: {
			biomes: ["volcano"]
		},
		effects:{
			mineralsRatio: 0.01
		},
		unlocked: false
	},
	{
		name: "volcano",
		title: "Volcano",
		description: "TBD",
		terrainPenalty: 3.5,
		faunaNames: ["magma slug", "lava beetle"],
		unlocked: false,
		mobLevel: 50,
		lore: {
			5: "TBD"
		},
		evaluateLocks: function(game){
			return game.village.getBiomeLevel("mountain") >= 25;
		}
	},
	{
		name: "desert",
		title: "Desert",
		description: "Improves solar panel effectiveness by 1% per level",
		terrainPenalty: 1.5,
		mobLevel: 7,
		faunaNames: ["sand viper", "scorpion", "dune beetle", "sand raptor"],
		unlocked: false,
		lore: {
			5: "An endless white desert with occasional red rock formations"
		},
		evaluateLocks: function(game){
			return game.village.getBiomeLevel("plains") >= 15;
		},
		effects:{
			solarFarmRatio: 0.01
		},
	},{
		name: "bloodDesert",
		title: "Crimson Desert",
		description: "",
		mobLevel: 75,
		terrainPenalty: 1.5,
		faunaNames: ["blood scarab", "crimson basilisk"],
		lore: {
			5: "There are tales of horrible monsters and lost cities and endless deserts of red sand",
			10: "You can travel further. But you don’t really want to see what’s there in the desert.",
			15: "Once there was an ocean of blood. No one knows why, maybe a frozen shard of Redmoon felt there millenia ago."
		},
		unlocked: false
	},{
		name: "swamp",
		title: "Swamp",
		mobLevel: 25,
		description : "Everything that is edible is poisonous and so are the trees and the grass and the air is also poisonous slightly",
		terrainPenalty: 1.95,
		faunaNames: ["bog toad", "swamp serpent", "poison spore"],
		lore: {
			5: "Everything here tries to kill you",
			10: "All plants here are poisonous and so are the trees and the water and the air is also poisonous slightly",
			15: "All you can see are the endless swamplands with lost ziggurats and rotten watchtowers"
		},
		unlocked: false
	},
	//space
	{
		name: "cath",
		title: "Cath",
		description : "Little pale green dot",
		terrainPenalty: 10,
		lore: {
		},
		unlocked: true
	},
	{
		name: "redmoon",
		title: "Redmoon",
		description : "Red moon description",
		terrainPenalty: 20,
		lore: {
			5: "You know why this moon is red",
			10: "Under the basins, mountains and craters and the endless oceans of red dust you can sense the shape of something giant and snake-like coiled into an impossible knot",
		},
		unlocked: false
	}
	],

	constructor: function(game){
		this.game = game;
		this.resetMap();
	},

	init: function(){
	},

	resetMap: function(){
		this.init();
	},

	//TODO: account for a signifficant penalty for late game biomes
	//var toLevel = 100 * (1 + 1.1 * Math.pow((distance - 1), 2.8)) * Math.pow(data.level + 1, 1.18 + 0.1 * distance);
	toLevel: function(biome){
		return 100 * (1 + 1.1 * Math.pow((biome.on || 0) + 1, 1.18 + 0.1 * biome.terrainPenalty)) * biome.terrainPenalty;
	},

	getMap: function(name){
		for (var i in this.maps){
			var map = this.maps[i];
			if (map.name == name){
				return map;
			}
		}
		console.error("Could not find map data for '" + name + "'");
	},

	getBiomes: function(){
		var mapId = this.activeMapId;
		if (!mapId){
			mapId = "cath";
		}
		var map = this.getMap(mapId);
		if (!map){
			console.error("invalid map id: " + mapId);
			return [];
		}
		//var biomeIds = map.biomes;
		if (!map.biomeCached){
			var biomeCached = [];
			for (var i in this.biomes){
				var biome = this.biomes[i];
				if (map.biomes.indexOf(biome.name) != -1){
					biomeCached.push(biome);
				}
			}
			map.biomeCached = biomeCached;
		}
		return map.biomeCached;
	},

	setMap: function(mapId){
		this.activeMapId = mapId;
	},

	/**
	 * Unlock every biome whose conditions are already satisfied.
	 * Unlike the unlocks[] signal this does not depend on a level up event,
	 * so biomes catch up on load or when unlock rules change.
	 */
	updateLocks: function(){
		for (var i in this.biomes){
			var biome = this.biomes[i];
			if (!biome.unlocked && biome.evaluateLocks && biome.evaluateLocks(this.game)){
				biome.unlocked = true;
			}
		}
	},

	update: function(){
		this.updateLocks();

		for (var i in this.biomes){
			var biome = this.biomes[i];
			if (biome.name == "village"){
				this.game.globalEffectsCached["exploreRatio"] = (0.1 * ((biome.on || 0) - 1));
			}

			//todo: take it from the biome
			var faunaNames = biome.faunaNames || this.defaultFaunaNames;
			var faunaName = faunaNames[this.game.rand(faunaNames.length)];

			//5% of chance to spawn enemy per tick
			if (!biome.fauna || !biome.fauna.length){
				var spawnChance = 1000 * (biome.faunaPenalty || 1.0);
				if (this.game.rand(10000) <= spawnChance){
					biome.fauna = [this.createFauna(biome, faunaName)];
				}
			}
		}
		for (var mi in this.maps){
			var _map = this.maps[mi];
			if (_map.name == "space"){
				_map.unlocked = this.game.space.getProgram("orbitalLaunch").on;
			}
		}
		//always regenerate HP slowly
		if (this.squad.hp < this.getMaxHP()) {
			this.squad.hp += 0.1;
		}

		//only regenerate stamina outside of the combat
		if (this.currentBiome){
			this.explore(this.currentBiome);
		} else {
			if (this.energy < this.getMaxEnergy()) {
				this.energy += 0.5;
			}
			
			//cap eneergy and hp
			if (this.energy > this.getMaxEnergy()) {
				this.energy = this.getMaxEnergy();
			}
			this.squad.hp += 0.1;	//TODO: scale the hp regeneration proportionally to the max HP
		}

		if (this.squad.hp > this.getMaxHP()) {
			this.squad.hp = this.getMaxHP();
		}
	},

	/**
	 * Roll a single fauna mob for a biome at its current exploration level (biome.on).
	 * HP and mob level carry a +/-15% spawn jitter; pass deterministic=true to get the
	 * un-jittered baseline (used by the balance simulator to read average stats).
	 */
	createFauna: function(biome, faunaName, deterministic){
		//use power law instead of exp law to avoid broken levels on biomes 20+
		var powerLawMultiplier = biome.biomePenalty || 1.0;
		var levelJitter = deterministic ? 1 : (1 + (Math.random() * 2 - 1) * 0.15);
		var hpJitter = deterministic ? 1 : (1 + (Math.random() * 2 - 1) * 0.15);

		var offset = Math.round(biome.mobLevel * Math.pow(biome.on, 0.6 * powerLawMultiplier));
		var mobLevel = Math.round(
			biome.mobLevel / 3 +
			(1.8 * Math.pow(biome.on, 1.50 * powerLawMultiplier) + offset) *
			levelJitter
		);
		if (mobLevel <= 0) {
			mobLevel = 1;
		}

		var hp = Math.round((15 * Math.pow(mobLevel, 1.25)) * hpJitter);
		return {
			title: faunaName,
			level: mobLevel,
			exp: Math.round(8 * Math.pow(mobLevel, 1.50)),
			prevHp: hp,
			maxHp: hp,
			hp: hp,
			atk: Math.round(1.2 * Math.pow(mobLevel, 1.02)),
			def: Math.round(0.6 * Math.pow(mobLevel, 1.01)),
			str: Math.round(0.6 * Math.pow(mobLevel, 1.02)),
			agi: Math.round(1.5 * Math.pow(mobLevel, 1.05)),
			spd: Math.round(1.5 * Math.pow(mobLevel, 1.05))
		};
	},

	getMaxEnergy: function(){
		return 70;
	},

	getMaxHP: function(){
		return 20;
	},

	getExplorationCost: function(){
		return 0.15 * Math.pow(this.hqLevel, 1.7);
	},

	getCPPerTick: function(biome){
		var exploreCost = this.getExplorationCost();

		var maxFaunaLevel = (biome.fauna && biome.fauna.length) ? biome.fauna[0].level : 0;
		for (var fi = 1; fi < biome.fauna.length; fi++) {
			if (biome.fauna[fi].level > maxFaunaLevel) {
				maxFaunaLevel = biome.fauna[fi].level;
			}
		}
		var levelDiff = Math.max(0, maxFaunaLevel - 1);
		var drFactor = this.game.getUnlimitedDR(levelDiff, 8);
		var explorationMultiplier = Math.max(0, 1 - 0.25 - 0.75 * drFactor);

		return exploreCost * explorationMultiplier;
	},

	explore: function(biomeId){
		var biome = this.game.village.getBiome(biomeId);
		if (!biome.val && biome.val !== 0){
			biome.val = 0;
		}
		if (!biome.on && biome.on !== 0){
			biome.on = 0;
		}
		if (!biome.cp){
			biome.cp = 0;
		}

		var exploreCost = this.getExplorationCost();
		var catpower = this.game.resPool.get("manpower");

		this.energy -= 0.1;	// 10 ticks per day
		if (biome.fauna && biome.fauna.length){
			//todo: combat round timeout
			this.combat();

			if (this.squad.hp <= 0){
				this.currentBiome = null;
				this.game.msg("Expedition squad have been knocked out", "important", "explore");
			}
			//return;	//do not explore further if obstacle encountered
		}

		if (this.energy <= 0){
			this.energy = 0;
			//this.currentBiome = null;
			//this.game.msg("Your explorers have returned from expedition", "important", "explore");
		}

		//get biome level price based on the terrain difficulty and current explored level
		//var toLevel = 100;
		var toLevel = this.toLevel(biome);

		if (catpower.value >= exploreCost){
			catpower.value -= exploreCost;

			var cpPerTick = this.getCPPerTick(biome);
			biome.cp += cpPerTick;
			//biome.cp = Math.min(biome.cp, toLevel);

			if (biome.cp >= toLevel){
				if (biome.on == biome.val){
					this.onLevelUp(biome);
				} else {
					biome.cp = 0;
					this.grantBiomeRewards(biome);
				}
			}
		}
	},

	combat: function(){
		var biome = this.game.village.getBiome(this.currentBiome);

		this.frame++;
		if (this.frame > 100){
			this.frame = 0;
		}

		//TODO: handle individual attacker speed
		if (this.frame % 8 != 0){
			return;
		}

		for (var i in biome.fauna ){
			var fauna = biome.fauna[i];

			/*var combatSpeed = 0.1;
			if (fauna.hp > 0){
				this.hp = this.hp - fauna.atk * combatSpeed;
				fauna.hp -= 2  * combatSpeed;
			}*/
			this.attack(this.squad, fauna);
			this.attack(fauna, this.squad);

		}
		var killedFauna = biome.fauna.filter(function(fauna) {
			return fauna.hp <= 0;
		});
		biome.fauna = biome.fauna.filter(function(fauna) {
			return fauna.hp > 0;
		});
		if (killedFauna.length) {
			for (var i in killedFauna) {
				this.game.msg("You have killed " + killedFauna[i].title, null, "combat");
			}
		}
	},

	getHitRate: function(src, tgt){
		//formulas are courtesy of proto23
		//return ((you.agl+agl_bonus/2)*you.efficiency())/((spd+global.current_m.agl+global.current_m.eva))*130+5;
		var efficiency = src.efficiency ? src.efficiency : 1.0;
		var hitRate = ((src.agi) * efficiency) / (( /*tgt.spd */ + tgt.agi /*+ tgt.evasion*/)) * 130 + 5;

		if (hitRate > 100){
			hitRate = 100;
		}
		return hitRate;
	},


	attack: function(src, tgt){
		//hit change
		var hitChance = this.getHitRate(src, tgt);

		var efficiency = src.efficiency ? src.efficiency : 1;
		var damage = Math.floor((src.str * efficiency + src.atk) - (tgt.str + tgt.def) * (0.9 + Math.random() * 0.2));	//+-10% damage variation

		if (damage < 1){
			damage = 1;
		}

		//console.log(src, "attacks", tgt, "hit chance:", hitChance);
		if (this.game.rand(100) <= hitChance) {
			tgt.hp -= damage;

			if (tgt.hp < 0){
				tgt.hp = 0;
			}
		}
	},

	grantBiomeRewards: function(biome){
		if (!biome.rewards){
			return;
		}
		var rewards = this.getBiomeRewards(biome);
		for (var res in rewards) {
			var amt = this.game.resPool.addResEvent(res, rewards[res]);
			if (amt > 0) {
				var resPool = this.game.resPool.get(res);
				var name = resPool.title || res;
				var msg = "Your explorers have brought " + this.game.getDisplayValueExt(amt) + " " + name;
				var type = null;
				if (res == "titanium" || res == "blueprint" || res == "relic"){
					msg += "!";
					type = "notice";
				}
				this.game.msg(msg, type, "explore");
			}
		}
	},

	onLevelUp: function(biome){
		biome.cp = 0;
		if ((biome.on || 0) === (biome.val || 0)) {
			biome.on = (biome.on || 0) + 1;
		}
		biome.val = (biome.val || 0) + 1;

		if (biome.unlocks){
			this.game.unlock(biome.unlocks);
		}

		this.grantBiomeRewards(biome);
	},

	getBiomeRewards: function(biome){
		var rewards = biome.rewards;
		var resources = {};
		for (var i in rewards) {
			var reward = rewards[i];
			var resourcePassedNormalTradeAmount = this.game.math.binominalRandomInteger(1, reward.chance);
			var fuzzedNormalAmount = this.game.diplomacy._fuzzGainedAmount(resourcePassedNormalTradeAmount, reward.width);

			var multiplier = Math.pow((biome.val || 0), reward.multiplier | 1.2);
			resources[reward.name] = fuzzedNormalAmount * reward.value * multiplier;
		}
		return resources;
	},

	getExplorationPrice: function(x, y){
        var data = this.getTile(x,y),
            explorePower = 1 * (1 + this.getExploreRatio()),
            price = explorePower * Math.pow(1.01, data.level);

		return price;
	},

	getExploreRatio: function(){
		return (this.villageLevel - 1) * 0.1;
	},

	getPriceReduction: function(){
		return Math.sqrt(this.exploredLevel - 1) * 0.00002;
	},

	updateEffectCached: function(){
		this.game.globalEffectsCached["mapPriceReduction"] = -this.getPriceReduction();

		//update cached effects based on the explored biomes
		for (var i in this.biomes){
			var biome = this.biomes[i];
			if (!biome.unlocked){
				continue;
			}
			for (var effect in biome.effects) {
				var effectVal = biome.effects[effect];
				this.game.globalEffectsCached[effect] += ( effectVal * (biome.on || 0) );
			}
		}
	},

	save: function(){
		return {
			hqLevel: this.hqLevel,
			energy: this.energy,
			explorersLevel: this.explorersLevel
		};
	},

	load: function(data){
		this.hqLevel = data.hqLevel || 0;
		this.energy = data.energy || 100;
		this.explorersLevel = data.explorersLevel || 0;
	}
});


/**
 * 村庄页 stub——弟子系统移除后永不显示,仅为 tabRegistry 实例化契约存在。
 */
dojo.declare("com.nuclearunicorn.game.ui.tab.Village", com.nuclearunicorn.game.ui.tab, {

	evaluateLocks: function(){
		return false;	//村庄页永久隐藏
	},

	render: function(tabContainer){ },

	update: function(){ },
	updateTab: function(){ },

	requestCensusRefresh: function(){ },

	getVillageTitle: function(){
		return this.tabName || "";
	}
});
