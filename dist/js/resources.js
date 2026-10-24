
dojo.declare("classes.managers.ResourceManager", com.nuclearunicorn.core.TabManager, {

	//=========================================
	//				COMMON
	//=========================================

	/**
	 * visible: resource will be visible in the topmost ("resource") table
	 * craftable: resource will be visible in the bottom ("craft") table
	 *
	 * Those flags are not mutually exclusive
	 *
	 *  transient: will not be affected by magneto production bonus (and other bonuses)
	 *  persists: affects how resources are carried over through reset
	 *  * undefined: carries over depending on Chronospheres
	 *  * true: carries over untouched
	 *  * false: does not carry over
	 *  type: common/uncommon/rare/exotic
	 */
	resourceData: [
	{
		name : "catnip",
		title: $I("resources.catnip.title"),
		type : "common",
		category: "material",
		color: "#7ed99a",
		visible: true,
		calculatePerTick: true
	},{
		name : "wood",
		title: $I("resources.wood.title"),
		type : "common",
		category: "material",
		color: "#d4b06a",
		craftable: true,
		visible: true,
		calculatePerTick: true
	},{
		name : "minerals",
		title: $I("resources.minerals.title"),
		type : "common",
		category: "material",
		color: "#9ec5e8",
		visible: true,
		calculatePerTick: true
	},{
		name : "coal",
		title: $I("resources.coal.title"),
		type : "common",
		category: "material",
		visible: true,
		color: "#b0bec5",
		calculatePerTick: true
	},{
		name : "iron",
		title: $I("resources.iron.title"),
		type : "common",
		category: "material",
		color: "#cfd8dc",
		visible: true,
		calculatePerTick: true,
		tag: "baseMetal"
	},{
		name : "titanium",
		title: $I("resources.titanium.title"),
		type : "common",
		category: "material",
		color: "#e0f7fa",
		visible: true,
		calculatePerTick: true,
		tag: "baseMetal"
	},{
		name : "gold",
		title: $I("resources.gold.title"),
		type : "common",
		category: "material",
		color: "#ffd54f",
		visible: true,
		calculatePerTick: true,
		tag: "baseMetal"
	},{
		name : "oil",
		title: $I("resources.oil.title"),
		type : "common",
		category: "material",
		color: "#ffab40",
		visible: true,
		calculatePerTick: true,
		isNotRefundable: true
	},{
		name : "uranium",
		title: $I("resources.uranium.title"),
		type : "common",
		category: "material",
		visible: true,
		color: "#69f0ae",
		calculatePerTick: true,
		tag: "baseMetal"
	},{
		name : "unobtainium",
		title: $I("resources.unobtainium.title"),
		type : "common",
		category: "material",
		visible: true,
		display: true,
		color: "#ff7070",
		calculatePerTick: true,
		tag: "baseMetal"
	},{
		name : "science",
		title: $I("resources.science.title"),
		type : "common",
		category: "dao",
		visible: true,
		transient: true,
		color: "#67c8ff",
		calculatePerTick: true
	},{
		name : "culture",
		title: $I("resources.culture.title"),
		type : "common",
		category: "dao",
		visible: true,
		transient: true,
		color: "#e29eff",
		calculatePerTick: true
	},{
		name : "faith",
		title: $I("resources.faith.title"),
		type : "common",
		category: "dao",
		visible: true,
		transient: true,
		color: "#f5d076",
		calculatePerTick: true
	},{
		name : "xiuwei",
		title: $I("resources.xiuwei.title"),
		type : "common",
		category: "dao",
		visible: true,
		transient: true,
		color: "#4fd1a5",
		calculatePerTick: true
	},{
		name : "starchart",
		title: $I("resources.starchart.title"),
		type : "common",
		category: "dao",
		transient: true,
		visible: true,
		color: "#b39ddb",
		calculatePerTick: true
	},{
		name : "spice",
		title: $I("resources.spice.title"),
		type : "uncommon",
		category: "treasure",
		color: "#ffab91",
		transient: true,
		visible: true,
		persists: false,
		calculatePerTick: true
	},{
		name : "karma",
		title: $I("resources.karma.title"),
		type : "rare",
		category: "treasure",
		color: "#ffb74d",
		visible: true,
		persists: false
	},{
		name : "paragon",
		title: $I("resources.paragon.title"),
		type : "common",
		category: "treasure",
		visible: true,
		color: "#b388ff",
		persists: true
	},{
		name : "timeCrystal",
		title: $I("resources.timeCrystal.title"),
		type : "common",
		category: "treasure",
		visible: true,
		color: "#26e6a6",
		calculatePerTick: true
	},{
		name : "relic",
		title: $I("resources.relic.title"),
		type : "exotic",
		category: "treasure",
		craftable: false,
		visible: true,
		color: "#ff80ab",
		calculatePerTick: true
	},
	//=========================================
	// 			CORE CRAFTS (6)
	//=========================================
	{
		name : "beam",
		title: $I("resources.beam.title"),
		type : "common",
		category: "craft",
		craftable: true,
		color: "#e6b465"
	},{
		name : "slab",
		title: $I("resources.slab.title"),
		type : "common",
		category: "craft",
		craftable: true,
		color: "#a7c7e7"
	},{
		name : "steel",
		title: $I("resources.steel.title"),
		type : "common",
		category: "craft",
		craftable: true,
		visible: false,
		color: "#90caf9",
		calculatePerTick: true,
		tag: "metallurgist"
	},{
		name : "alloy",
		title: $I("resources.alloy.title"),
		type : "common",
		category: "craft",
		craftable: true,
		visible: false,
		color: "#ffe082",
		tag: "metallurgist"
	},{
		name : "eludium",
		title: $I("resources.eludium.title"),
		type : "common",
		category: "craft",
		craftable: true,
		visible: false,
		color: "#ce93d8",
		tag: "chemist"
	},{
		name : "blueprint",
		title: $I("resources.blueprint.title"),
		type : "common",
		category: "craft",
		transient: true,
		visible: true,
		craftable: true,
		color: "#4fc3f7"
	},
	//=========================================
	// 		INTERNAL ENGINE COUNTERS (hidden)
	//=========================================
	{
		name : "antimatter",
		title: $I("resources.antimatter.title"),
		type : "common",
		transient: true,
		visible: false,
		calculateOnYear: true,
		isRefundable: function(game) {
			return game.resPool.energyProd >= game.resPool.energyCons;
		}
	},{
		name : "manpower",
		title: $I("resources.manpower.title"),
		type : "common",
		visible: false,
		transient: true,
		calculatePerTick: true
	},{
		name : "temporalFlux",
		title: $I("resources.temporalFlux.title"),
		type : "common",
		craftable: false,
		visible: false,
		persists: true
	},{
		name : "unicorns",
		title: $I("resources.unicorns.title"),
		type : "rare",
		transient: true,
		visible: false,
		persists: false,
		calculatePerTick: true
	},{
		name : "alicorn",
		title: $I("resources.alicorn.title"),
		type : "rare",
		visible: false,
		persists: false,
		calculatePerTick: true,
		calculatePerTickAndDay: true
	},{
		name : "necrocorn",
		title: $I("resources.necrocorn.title"),
		type : "rare",
		visible: false,
		persists: false,
		calculatePerDay: true
	},{
		name : "tears",
		title: $I("resources.tears.title"),
		type : "rare",
		visible: false,
		persists: false
	},{
		name : "sorrow",
		title: $I("resources.sorrow.title"),
		type : "common",
		visible: false,
		persists: true
	},{
		name : "void",
		title: $I("resources.void.title"),
		type : "exotic",
		craftable: false,
		visible: false
	},{
		name : "blackcoin",
		title: $I("resources.blackcoin.title"),
		type : "exotic",
		craftable: false,
		visible: false
	}
	],

	resources: null,
	village: null,
	game: null,

	energyProd: 0,
	energyWinterProd: 0,
	energyCons: 0,

	isLocked: false,
	showHiddenResources: false, //Whether to show stuff like flux, gflops, & pseudo-resources
	hiddenPseudoResources: null, //Array of names of pseudo-resources to mark as hidden

	constructor: function(game){
		this.game = game;

		this.resources = [];
		this.resourceMap = {};

		this.hiddenPseudoResources = [];

		for (var i = 0; i < this.resourceData.length; i++){
			var res = dojo.clone(this.resourceData[i]);
			res.value = 0;
			res.unlocked = false;
			if (!res.isRefundable) {
				res.isRefundable = function(game) {
					return !this.isNotRefundable;
				};
			}
			this.resources.push(res);
			this.resourceMap[res.name] = res;
		}
	},

	get: function(name){
		if (name == "worship" || name == "epiphany") {
			return false;
		}
		return this.resourceMap[name] || (this.resourceMap[name] = this.createResource(name));
	},

	//put your custom fake resources there
	getPseudoResources: function(){
		var pseudoResArr = [
			{
				name: "worship",
				title: $I("resources.worship.title"),
				value: this.game.religion.faith,
				unlocked: this.game.religion.faith > 0,
				visible: false //Doesn't normally appear in resource table
			},
			{
				name: "epiphany",
				title: $I("resources.epiphany.title"),
				value: this.game.religion.faithRatio,
				unlocked: this.game.religion.faithRatio > 0 &&
				          this.game.science.get("theology").researched &&
				          !this.game.challenges.isActive("atheism"),
				visible: false
			}
		];
		//Apply settings to mark as hidden:
		for (var i = 0; i < pseudoResArr.length; i += 1) {
			pseudoResArr[i].isHidden = this.hiddenPseudoResources.includes(pseudoResArr[i].name);
		}
		return pseudoResArr;
	},

	createResource: function(name){
		var res = {
			name: name,
			title: name,
			value: 0,
			maxValue: 0,
			perTickCached: 0,
			visible: false,
			isHidden: true,
			unlocked: false,
			isRefundable: function() { return true; }
		};
		if (name == "wood") {
			res.isHiddenFromCrafting = false;
		}
		return res;
	},

	addRes: function(res, addedValue, allowDuringParadoxes, preventLimitCheck) {
		if (this.game.calendar.day < 0 && !allowDuringParadoxes || addedValue == 0) {
			return 0;
		}

		var prevValue = res.value || 0;
		res.value = Math.min(prevValue + addedValue, Number.MAX_VALUE);
		if (!preventLimitCheck) {
			//if already overcap, allow to remain that way unless removing resources.
			var limit = Math.max(prevValue, res.maxValue || Number.MAX_VALUE);
			res.value = Math.min(res.value, limit);
		}

		if (res.name == "void") { // Always an integer
			res.value = Math.floor(res.value);
		}

		if (isNaN(res.value) || res.value < 0.0000000001){
			res.value = 0;	//safe switch
		}

		if (res.name == "karma"){
			this.game.karmaKittens = Math.round(this.game.getInverseUnlimitedDR(res.value, 5));
			res.value = this.game.getUnlimitedDR(this.game.karmaKittens, 5);
		}

		// return the amount the resource actually changed by.
		if (res.value == prevValue + addedValue) {
			// In this case, computing the return value as (res.value - prevValue) would yield the
			// original addedValue, but with a double-rounding. This is usually minor, but it might
			// make the return value be non-integer even though addedValue was an integer. So we
			// return the original addedValue directly.
			return addedValue;
		} else {
			// change was limited in some way; recompute the change amount.
			return res.value - prevValue;
		}
	},

	addResPerTick: function(name, value){
		return this.addRes(this.get(name), value, false);
	},

	addResEvent: function(name, value){
		return this.addRes(this.get(name), value, true);
	},

	/**
	 * Format of from:
	 * [ {res: "res1", amt: x1}, {res: "res2", amt: x2} ]
	 * amt in the from array sets ratios between resources
	 * The second amt parameter is the maximum number of times to convert
	 */
	getAmtDependsOnStock: function(from, amt){
		if (amt == 0) {
			return 0;
		}

		var amtBeginni = amt;

		// Cap amt based on available resources
		// amt can decrease for each resource
		for (var i = 0, length = from.length; i < length; i++){
			var resAvailable = this.get(from[i].res).value;
			var resNeeded = from[i].amt * amt;
			if (resAvailable < resNeeded){
				var amtAvailable = resAvailable / from[i].amt;
				amt = Math.min(amt, amtAvailable);
			}
			else {
				// amtAvailable is amt
			}
		}

		// Remove from resources now to calculate others actions with updated resources
		for (var i in from) {
			this.addResPerTick(from[i].res, -from[i].amt * amt);
		}

		// Return the percentage to decrease the productivity
		return amt / amtBeginni;
	},

	/**
	 * Iterates resources and updates their values with per tick increment
	 */
	update: function(){

		var game = this.game;

		for (var i in this.resources){
			var res = this.resources[i];
			this.updateMaxValue(res);

			if (res.name == "sorrow"){
				continue;
			}
			if (res.name == "spice") { //This is a hack, will probably have to come up with a better system for this later
				var now = new Date();
				if (now.getMonth() == 9 && game.colorScheme == "spooky" && i18nLang.getLanguage() == "en") {
					res.title = $I("resources.spice.title.october");
				} else {
					res.title = $I("resources.spice.title");
				}
			}

			if (res.unlocked == false && res.value > 0){
				res.unlocked = true;
			} else if (res.value == 0 && res.unlocked == true) {
				if (res.name == "paragon"){
					res.unlocked = false;
				}
			}

			if (res.name == "xiuwei" && res.calculatePerTick) {
				res.perTickCached = game.fixFloatPointNumber(game.calcResourcePerTick("xiuwei"));
			}
			var resPerTick = game.getResourcePerTick(res.name, false);
			this.addResPerTick(res.name, resPerTick);
			if (res.name == "xiuwei" && res.calculatePerTick) {
				res.perTickCached = game.fixFloatPointNumber(game.calcResourcePerTick("xiuwei"));
			}

		}
		game.updateKarma();

		//--------
		var energyProdRatio = this.getEnergyProductionRatio();
		this.energyProd = game.getEffect("energyProduction") * energyProdRatio;
		this.energyWinterProd = this.energyProd;
		var energyConsRatio = this.getEnergyConsumptionRatio();
		this.energyCons = game.getEffect("energyConsumption") * energyConsRatio;

		var currentSeason = game.calendar.season;
		var solarFarm = game.bld.getBuildingExt("pasture");
		var calculateEnergyProduction = solarFarm.get("calculateEnergyProduction");
		if (currentSeason != 3 && calculateEnergyProduction) {
			var energyLoss = calculateEnergyProduction(game, currentSeason) - calculateEnergyProduction(game, 3);
			this.energyWinterProd -= solarFarm.get("on") * energyLoss * energyProdRatio;
		}
	},

	getBuildingStorageBonus: function(resName) {
		var game = this.game;
		if (!game || !game.bld) {
			return 0;
		}
		var bld = function(n) { return game.bld.get(n) || { val: 0, on: 0, stage: 0 }; };
		var barnRatio = game.getEffect("barnRatio") || 0;
		var whRatio = 1 + (game.getEffect("warehouseRatio") || 0);
		var accelRatio = game.workshop && game.workshop.get("energyRifts") && game.workshop.get("energyRifts").researched ? (1 + (game.getEffect("acceleratorRatio") || 0)) : 0.5;
		var cargoShips = game.workshop ? game.workshop.get("cargoShips") : null;
		var harborBonus = (cargoShips && cargoShips.researched ? (cargoShips.effects["harborRatio"] || 0) : 0) + (game.getEffect("shipLimit") || 0);
		var spaceportBonus = 1 + (game.getEffect("moonBaseStorageBonus") || 0) + (game.getEffect("planetCrackerStorageBonus") || 0) + (game.getEffect("cryostationStorageBonus") || 0) + (game.getEffect("tradeVolume") || 0) * 0 + (game.getEffect("cathPollutionPerTickCon") || 0) * 0;
		whRatio *= (1 + harborBonus * 0.1) * spaceportBonus;

		switch (resName) {
			case "coal":
				return (bld("academy").val * 300 + bld("barn").val * 400 * (1 + (game.getEffect("harborCoalRatio") || 0)) + bld("accelerator").val * 2500 * accelRatio) * whRatio;
			case "iron":
				return (bld("workshop").val * 300 + bld("barn").val * 600 + bld("accelerator").val * 7500 * accelRatio) * (1 + barnRatio) * whRatio;
			case "titanium":
				return (bld("mansion").val * 600 + bld("barn").val * 400 + bld("accelerator").val * 2500 * accelRatio) * whRatio;
			case "oil":
				return bld("biolab").val * 12000 + bld("magneto").val * 6000;
			case "uranium":
				return bld("magneto").val * 2500 + bld("reactor").val * 2500;
			case "science":
				return game.getEffect("scienceMaxCompendia") || 0;
			case "culture":
				return (bld("library").val * 200 + bld("barn").val * 600 + bld("temple").val * 600) * (1 + bld("ziggurat").val * (0.08 + (game.getEffect("cultureMaxRatioBonus") || 0)));
			case "manpower":
				return bld("hut").val * 75 + bld("logHouse").val * 80 + bld("mansion").val * 150;
			case "unicorns":
				return game.challenges.isActive("unicornTears") ? (bld("unicornPasture").val * 50 + bld("ziggurat").val * 700) : 0;
			case "tears":
				return game.challenges.isActive("unicornTears") ? (bld("ziggurat").val * 3) : 0;
			default:
				return 0;
		}
	},

	/**
	 * Updates the storage limit for a given resource.
	 * @param res The resource object to be updated.
	 */
	updateMaxValue: function(res) {
		var game = this.game;
		if (res.name == "sorrow"){
			res.maxValue = 17 + (game.getEffect("blsLimit") || 0);
			res.value = Math.min(res.value, res.maxValue);
			return;
		}

		var maxValue = (game.getEffect(res.name + "Max") || 0) + this.getBuildingStorageBonus(res.name);


		maxValue = Math.min(this.addResMaxRatios(res, maxValue), Number.MAX_VALUE);
		
		var challengeEffect = this.game.getEffect(res.name + "MaxChallenge");
		if (challengeEffect){
			// Negative effect, no need to cap again to Number.MAX_VALUE
			challengeEffect = this.game.getLimitedDR(this.addResMaxRatios(res, challengeEffect), maxValue - 1 - game.bld.effectsBase[res.name +'Max']||0);
			maxValue += challengeEffect;
		}

		res.maxValue = Math.max(maxValue, 0);
	},

	/**
	 * Updates the storage limit for a given resource.
	 * @param resName The name of the resource to be updated.
	 */
	updateMaxValueByName: function(resName) {
		this.updateMaxValue(this.get(resName));
	},

	/**
	 * Updates the storage limits for ALL resources.
	 */
	updateMaxValueAll: function() {
		for (var i in this.resources){
			var res = this.resources[i];
			this.updateMaxValue(res);
		}
	},

	//All energy production amounts are multiplied by this number.
	getEnergyProductionRatio: function() {
		var game = this.game;
		return 1 + game.getEffect("energyProductionRatio");
	},

	//All energy consumption amounts are multiplied by this number.
	getEnergyConsumptionRatio: function() {
		var game = this.game;
		//LDR for the effect named "energyConsumptionRatio" is specified in challenges.js
		return (1 + game.getEffect("energyConsumptionRatio") + game.getEffect("energyConsumptionIncrease")) *
				(game.challenges.isActive("energy") ? 2 : 1);
	},

	//NB: don't forget to update resources before calling in redshift
	fastforward: function(daysOffset) {
		// Since workshop requires some resource and we don't want exhaust all resources during workshop so we need a way to consume them.
		// Idea: relax resource limits temporarily, load the resource and do workshop, after that enforce limits again.
		var limits = {};
		for (var i in this.resources) {
			var res = this.resources[i];
			//修为不可挂机——离线补发不含修为,修行只能靠在线自悟
			if (res.name == "xiuwei"){ continue; }
			if (res.perTickCached && (res.name != "catnip" || res.perTickCached >= 0)) {
				if (res.maxValue) {
					limits[res.name] = Math.max(res.value, res.maxValue);
				}
				//console.log("Adjusting resource", res.name, "delta",res.perTickCached, "max value", res.maxValue, "days offset", daysOffset);
				//console.log("resource before adjustment:", res.value);
				this.addRes(res, res.perTickCached * daysOffset * this.game.calendar.ticksPerDay, true/*allowDuringParadoxes*/, true/*preventLimitCheck*/);
				//console.log("resource after adjustment:", res.value);
			}
		}
		return limits;
	},

	enforceLimits: function(limits) {
		for (var i in this.resources) {
			var res = this.resources[i];
			if (res.maxValue) {
				var limit = limits[res.name];
				if (limit) {
					res.value = Math.min(res.value, limit);
				}
			}
		}
	},

	//Hack to reach the maxValue in resTable
	//AB: Questionable
	resConsHackForResTable: function() {
		if ( this.game.calendar.day >= 0) {
			for (var i in this.resources){
				var res = this.resources[i];
				if (res.maxValue) {
					var perTickConvertion = this.game.getResourcePerTickConvertion(res.name);
					if (perTickConvertion < 0) {
						if (this.game.getResourcePerTick(res.name, true) > 0 && res.maxValue + perTickConvertion <= res.value) {
							res.value += -perTickConvertion;
						}
					}
				}
			}
		}
	},

	/**
	 * Multiplies applicable resMax effects by barnRatio and warehouseRatio
	 * (is there a better name for it?)
	 */
	addBarnWarehouseRatio: function(effects){
		var newEffects = {};
		var barnRatio = this.game.getEffect("barnRatio");
		var warehouseRatio = 1 + this.game.getEffect("warehouseRatio");
		for (var name in effects){
			var effect = effects[name];

			if (name === "catnipMax" && this.game.workshop.get("silos").researched){
				effect *= 1 + barnRatio * 0.25;
			}

			if (name == "woodMax" || name == "mineralsMax" || name == "ironMax"){	//that starts to look awful
				effect *= 1 + barnRatio;
				effect *= warehouseRatio;
			}

			if (name == "coalMax" || name == "titaniumMax" || name == "goldMax"){
				effect *= warehouseRatio;
			}
			newEffects[name] = effect;
		}
		return newEffects;
	},

	/**
	 * Multiplies maxValue by global ratios
	 * Called in tooltips for more accurate per-building resMax increases
	 */
	addResMaxRatios: function(res, maxValue) {
		if (res.name == "temporalFlux") {
			return maxValue;
		}

		//Unicorn Tears Challenge:
		if (this.game.challenges.isActive("unicornTears")) {
			if (res.name == "unicorns" || res.name == "tears" || res.name == "alicorn") {
				maxValue *= 1 + this.game.getEffect(res.name + "MaxRatio");
				return maxValue;
			}
		}

		maxValue *= 1 + this.game.prestige.getParagonStorageRatio();

		//+COSMIC RADIATION
		if (!this.game.opts.disableCMBR) {
			maxValue *= 1 + this.game.getCMBRBonus();
		}

		//Stuff for Refrigiration and (potentially) similar effects
		maxValue *= 1 + this.game.getEffect(res.name + "MaxRatio");

		if (!this.isNormalCraftableResource(res) && !res.transient) {
			maxValue *= 1 + this.game.getEffect("globalResourceRatio");
		}
		//pacts effect
		if (!this.isNormalCraftableResource(res) && !res.transient) {
			var pyramidModifier = this.game.getEffect("pyramidGlobalResourceRatio");
			/*if(pyramidModifier < 0){
				pyramidModifier = -this.game.getLimitedDR(-pyramidModifier * 1000, 1000)/1000
			}*/
			maxValue *= 1 + pyramidModifier;
		}
		if (res.tag == "baseMetal") {
			maxValue *= 1 + this.game.getEffect("baseMetalMaxRatio");
		}
		if (!this.isNormalCraftableResource(res) && res.name != "unicorns" && res.name != "tears" && res.name != "alicorn") {
			maxValue *= 1 + (this.game.getEffect("realmStorageRatio") || 0);
		}
		
		return maxValue;
	},

	setVillage: function(village){
		this.village = village;
	},

	reset: function(){
		this.resources = [];
	},

	resetState: function(){
		this.isLocked = false;
		this.showHiddenResources = false;
		this.hiddenPseudoResources = [];
		this.resourceMap = {};
		for (var i = 0; i < this.resources.length; i++){
			var res = this.resources[i];
			res.value = 0;
			res.maxValue = 0;
			res.perTickCached = 0;
			res.unlocked = false;
			res.isHidden = false;

			if (res.name == "wood") {
				res.isHiddenFromCrafting = false;
			}
			this.resourceMap[res.name] = res;
		}
	},

	save: function(saveData){
		saveData.resources = this.filterMetadata(
			this.resources, ["name", "value", "unlocked", "isHidden", "isHiddenFromCrafting"]
		);
		saveData.res = {
			isLocked: this.isLocked,
			showHiddenResources: this.showHiddenResources || undefined
		};
		var pseudoResources = this.getPseudoResources();
		for (var i = 0; i < pseudoResources.length; i += 1) {
			var resName = pseudoResources[i].name;
			if (this.hiddenPseudoResources.includes(resName)) {
				if (!saveData.res.hiddenPseudoResources) {
					saveData.res.hiddenPseudoResources = [];
				}
				saveData.res.hiddenPseudoResources.push(resName);
			}
		}
	},

	load: function(saveData){
		var map = this.resourceMap;
		var savedRes = (saveData.resources || []).filter(function(r){ return r && map[r.name]; });
		this.loadMetadata(this.resources, savedRes, "resources");

		if (saveData.res){
			this.isLocked = Boolean(saveData.res.isLocked);
			this.showHiddenResources = Boolean(saveData.res.showHiddenResources);
			this.hiddenPseudoResources = saveData.res.hiddenPseudoResources || [];
		}
	},

	/**
	 * Returns true if user has enough resources to construct AMT building with given price
	 */
	hasRes: function(prices, amt){
		if (!amt){
			amt = 1;
		}

		var hasRes = true;
		if (prices.length){
			for ( var i = 0; i < prices.length; i++){
				var price = prices[i];

				var res = this.get(price.name);
				if (res.value < (price.val * amt)){
					hasRes = false;
					break;
				}
			}
		}
		return hasRes;
	},

	/**
	 * Returns true if any price is limited by maxValue
	 */
	isStorageLimited: function(prices){
		if (prices && prices.length){
			for (var i = 0; i < prices.length; i++){
				var price = prices[i];

				var res = this.get(price.name);
				if (price.val == Infinity || res.maxValue > 0 && price.val > res.maxValue && price.val > res.value){
					return true;
				}
				if (res.craftable && price.val > res.value){ //account for chronosphere resets etc
					var craft = this.game.workshop.getCraft(res.name);
					if (craft.unlocked && craft.isLimited){
						return true;
					}
				}
			}
		}
		return false;
	},

	payPrices: function(prices){
		if (prices.length){
			for ( var i = 0; i < prices.length; i++){
				var price = prices[i];
				this.addResEvent(price.name, -price.val);
			}
		}
	},

    getEnergyDelta: function(){
		if (this.energyCons == 0) {
			return 0;
		} else {
			var delta = this.energyProd / this.energyCons;
			if (delta < 0.25){
				delta = 0.25;
			}
			if (this.game.challenges.getChallenge("energy").researched && !this.game.challenges.isActive("energy")) {
				delta = 1 - (1 - delta) / 2;
			}
		return delta;
		}
    },

    getVoidQuantity: function() {
		// -1, 0, 1, 2 at start, 0.5 on average
		return this.game.rand(this.game.getEffect("temporalParadoxVoid") + 4) - 1;
    },

    // getVoidQuantity is good for day -by day evaluation but it cannot be used for redshift which requires statistical distribution over large number of days
    // The values range of getVoidQuantity is: -1, 0, 1, 2 .. n, where n is (2 + temporalParadoxVoid) . The values are  equally distributed so we can get a median out of them. (-1 + n) /2
    getVoidQuantityStatistically: function() {
		return (this.game.getEffect("temporalParadoxVoid") + 1) / 2 ;
    },

	//Sets the "isHidden" flag of a resource or a pseudo-resource.
	//This exists because the UI code can't know if a resource is real or pseudo.
	//Wood is a special case because it has 2 flags.  We don't handle that special case here.
	setResourceIsHidden: function(resName, hide) {
		if (typeof(resName) != "string") {
			console.error("Can't set res.isHidden; resource name must be a string.");
			return;
		}
		if (typeof(hide) != "boolean") {
			console.error("Can't set res.isHidden; flag must be a boolean.");
			return;
		}

		var res = this.get(resName);
		if (res) {
			//We have a real resource!
			res.isHidden = hide;
			return;
		}
		//Else, assume we're dealing with a pseudo-resource.
		if (this.hiddenPseudoResources.includes(resName)) {
			if (!hide) {
				//Remove by value
				this.hiddenPseudoResources = this.hiddenPseudoResources.filter(function(elem) {
					return elem != resName;
				});
			}
		} else {
			//Pseudo-resource is not already in array.
			if (hide) {
				this.hiddenPseudoResources.push(resName);
			}
		}
	},

	isNormalCraftableResource: function(res) {
		return res.craftable && res.name != "wood";
	}

});

