/**
 * Metadata wrapper, move to the core?
 **/
dojo.declare("classes.Metadata", null, {
	meta: null,

    constructor: function(meta){
        if (!meta){
            throw "Building metadata must be provided for classes.Building instance";
        }
        this.meta = meta;
    },

    getMeta: function(){
		return this.meta;
	},

	get: function (attr) {
		return this.meta[attr];
	},

	set: function(attr, val){
        this.meta[attr] = val;
    }
});

/**
 * On a second thought, using meta wrappers/adapters does not seems like a such good idea.
 * We probably should have an model class governed by a metadata, not an adapter
 */
dojo.declare("classes.BuildingMeta", classes.Metadata, {
	_metaCache: null,
	_metaCacheStage: null,

	// We need to avoid to use the function since it is slow, use get method intead which should be faster
    getMeta: function(){
		var bld = this.meta;
		if (bld.stage !== this._metaCacheStage) {
			this._metaCache = null; // invalidate cache if the stage has changed
		}
		if (this._metaCache) {
			return this._metaCache;
		}

        if (bld.stages){
			//some specific hack for stagable buildings
			if (bld.stage >= bld.stages.length){
				bld.stage = bld.stages.length - 1;
			}
			var currentStage = bld.stages[bld.stage || 0];

			var copy = {};
			for (var attr in bld) {
				// if (currentStage.hasOwnProperty(attr)) {
				// 	copy[attr] = currentStage[attr];
				// }
		        if (bld.hasOwnProperty(attr)){
					copy[attr] = bld[attr];
		        }
		    }

		    for (attr in currentStage) {
				if (currentStage.hasOwnProperty(attr)) {
					copy[attr] = currentStage[attr];
				}
		    }

			this._metaCache = copy;
			this._metaCacheStage = bld.stage;
        } else {
			this._metaCache = bld;
			this._metaCacheStage = bld.stage;
        }
        return this._metaCache;
    },

    /**
	* Strongly encourage to use this function for faster access
    */
    get: function (attr) {
    	var bld = this.meta;
    	if (bld.stage !== this._metaCacheStage) {
    		this._metaCache = null; // invalidate cache if the stage has changed
    	}
    	if (this._metaCache) {
    		return this._metaCache[attr];
    	}

    	if (bld.stages){
			//some specific hack for stagable buildings
			if (bld.stage >= bld.stages.length){
				bld.stage = bld.stages.length - 1;
			}
			var currentStage = bld.stages[bld.stage || 0];
			if (!currentStage.hasOwnProperty(attr)) {
				return bld[attr];
			} else {
				return currentStage[attr];
			}
        }
        return bld[attr];
    },

    set: function(attr, value){
		var bld = this.meta;
		if (bld.stages){
			var stage = bld.stages[bld.stage || 0];

			//try to set stage attribute if defined in metadata
			if (stage[attr] != undefined) {
				//throw "Invalid attribute '" + attr + "'";
				stage[attr] = value;
				return;
			}
		}
		this.meta[attr] = value;
		if (this._metaCache) {
			if (attr === "stage") {
				this._metaCache = null;
			} else {
				this._metaCache[attr] = value;
			}
		}
	}
});

dojo.declare("classes.managers.BuildingsManager", com.nuclearunicorn.core.TabManager, {

	game: null,

    metaCache: null,

	groupBuildings: false,
	twoRows: false,

	//pollution things
	cathPollution: 0,
	cathPollutionPerTick: 0,

	constructor: function(game){
		this.game = game;
        this.metaCache = {};
        this.registerMeta(false, this.buildingsData, {
			getEffect: function(bld, effectName){
				var effect = 0;
				//var bldMeta = self.getBuildingExt(bld.name);
				//var effectValue = bldMeta.get("effects")[effectName];
				var effectValue;
				if (bld.stages){
					//some specific hack for stagable buildings
					if (bld.stage >= bld.stages.length){
						bld.stage = bld.stages.length - 1;
					}
					var currentStage = bld.stages[bld.stage || 0];
					if (currentStage.effects) {
						effectValue = currentStage.effects[effectName];
					} else {
						effectValue = bld.effects[effectName];
			        }
		        } else {
					effectValue = bld.effects[effectName];
		        }

				// Need a better way to do this...
				if (effectName == "coalRatioGlobal") {
					effect = effectValue;
				// Max effects and Ratio effects depends on constructed buildings
				} else if (effectName.indexOf("Max", effectName.length - 3) != -1 && (bld.name != "library")||
					(bld.name == "biolab" && effectName.indexOf("Ratio", effectName.length - 5) != -1)){
					effect = effectValue * bld.val;
				} else {
					effect = effectValue * bld.on;
				}

				//probably not the best place to handle this mechanics
				//----------- move to separate part? -----------
				if ((effectName == "productionRatio" || effectName == "magnetoRatio")
					&& (game.resPool.energyCons > game.resPool.energyProd)){
					effect *= game.resPool.getEnergyDelta();
				}

				return effect;
			}
		});
        this.setEffectsCachedExisting();
	},

	setEffectsCachedExisting: function(){
		this.inherited(arguments);
		//register effect names on building stages
		for (var i = 0; i < this.buildingsData.length; i++){
			var building = this.buildingsData[i];
			if (building.stages){
				for (var j = 0; j < building.stages.length; j++){
					for (var effectName in building.stages[j].effects){
						this.effectsCachedExisting[effectName] = 0;
					}
				}
			}
		}
	},

	//Use getBuildingGroups if you want a metadata array which is updated based on game-state.
	buildingGroups: [{
		name: "food",
		title: $I("buildings.group.food"),
		buildings: ["field","pasture","aqueduct"]
	},{
		name: "population",
		title: $I("buildings.group.population"),
		buildings: ["hut", "logHouse", "mansion"]
	},{
		name: "science",
		title: $I("buildings.group.science"),
		buildings: ["library", "academy", "observatory", "biolab"]
	},{
		name: "storage",
		title: $I("buildings.group.storage"),
		buildings: ["barn", "warehouse", "harbor"]
	},{
		name: "resource",
		title: $I("buildings.group.resource"),
		buildings: ["mine", "quarry", "lumberMill", "oilWell", "accelerator"]
	},{
		name: "industry",
		title: $I("buildings.group.industry"),
		buildings: ["steamworks", "magneto", "smelter", "calciner", "factory", "reactor" ]
	},
	{
		name: "culture",
		title: $I("buildings.group.culture"),
		buildings: ["amphitheatre", "chapel", "temple", "ziggurat"]
	},{
		name: "other",
		title: $I("buildings.group.other"),
		buildings: ["workshop", "tradepost", "mint", "unicornPasture", "brewery"]
	},{
		name: "megastructures",
		title: $I("buildings.group.megastructures"),
		buildings: ["ziggurat", "chronosphere", "aiCore"]
	},{
		name: "zebraBuildings",
		title: $I("buildings.group.zebraBuildings"),
		buildings: ["zebraOutpost", "zebraWorkshop", "zebraForge", "ivoryTemple", "stasisPod"]
	}
	],

	//Canonical order of the buildings, 	
	//Buildings missing from this list are rendered last
	buildingsOrder: [
		"field", "pasture", "aqueduct",
		"hut", "logHouse", "mansion",
		"library", "academy", "observatory", "biolab",
		"barn", "warehouse", "harbor",
		"mine", "quarry", "lumberMill", "oilWell", "accelerator",
		"steamworks", "magneto", "smelter", "calciner", "factory", "reactor",
		"amphitheatre", "chapel", "temple",
		"workshop", "tradepost", "mint", "unicornPasture", "brewery",
		"aiCore", "chronosphere", "ziggurat",
		"zebraOutpost", "zebraWorkshop", "zebraForge", "ivoryTemple", "stasisPod"
	],

	_buildingsOrderIndex: null,

	/**
	 * @return {Object} Map of building name to its position in buildingsOrder, built once and cached
	 */
	getBuildingsOrderIndex: function() {
		if (!this._buildingsOrderIndex) {
			var index = {};
			this.buildingsOrder.forEach(function(bldName, position) {
				index[bldName] = position;
			});
			this._buildingsOrderIndex = index;
		}
		return this._buildingsOrderIndex;
	},

	/***
	 ** STACKABLE BUILDINGS'S SPEC **
	 *
	 * For:
	 *
	 * game.bld.buildingsData
	 * game.religion.zigguratUpgrades
	 * game.religion.religionUpgrades
	 * game.religion.transcendenceUpgrades
	 * game.space.programs
	 * for each buildings of game.space.planets
	 * game.time.chronoforgeUpgrades
	 * game.time.voidspaceUpgrades
	 *
	 * Keys:
	 *
	 * OPTIONAL: things can be setted or not
	 * AUTOMATIC: things must be setted by using resetStateStackable()
	 * Every value can be setted by resetState whereas a hard-value.
	 *
	 * Spec:
	 *
	 * name MANDATORY: string identifier for coding
	 * label MANDATORY: string identifier displayed in the game
	 * description OPTIONAL: string displayed in tooltip to precise what is the building
	 * flavor OPTIONAL: string displayed in tooltip to joke
	 *
	 * stages OPTIONAL: object containing at least the setting of two stages. Each stage is a normal building with those differences :
	 * 	• stageUnlocked: which stage is set at the begining (one of stages has stageUnlocked == true, others stageUnlocked == false)
	 * 	• do not set name, calculateEffects neither action : it must be set only in "principal" building
	 * 	• set label, description, prices, priceRatio, flavor and effects (stage's effects must be set in "principal" building too, see effects spec here)
	 * stage MANDATORY if stages: number selecting building's stage
	 *
	 * unlocked MANDATORY: boolean defining if the building is available for the player or not
	 * unlockable MANDATORY: if true, building will be unlocked automatically once resources are available.
	 * defaultUnlockable OPTIONAL: if true, building will always be unlockable.
	 * unlockRatio OPTIONAL: boolean defining percentage of price you must have in stock to unlocked the buiding (see price spec here)
	 * requiredTech OPTIONAL: list of technologies in game.science which must be researched to unlocked the building
	 *
	 * price MANDATORY: list containing lines of prices :
	 *  • line of price is formatted like { name : "resourceName", val: resourceNeed }
	 * priceRatio MANDATORY: number multiplying price val in function of how many buildings you have already built (see val spec here)
	 *
	 * val AUTOMATIC: number defining how many buildings are built
	 * on AUTOMATIC: number defining how many buildings are used
	 *
	 * togglable AUTOMATIC: boolean defining if on can be modifiy between 0 AND val by the player
	 * togglableOnOff AUTOMATIC: boolean defining if on can be modifiy either 0 OR val by the player
	 *
	 * unlocks OPTIONAL: list, at each construction, calls game.unlock() with variables in unlocks to unlock parts of the game
	 * upgrades OPTIONAL: list, at each construction, calls game.upgrade() with variables in upgrades which will calls calculateEffects of some buildings (see calculateEffects spec here)
	 *
	 * effects MANDATORY: object containing static effects of the building AND all effects set in calculateEffects stages with a val of 0 AND all effects set in action with a basic value (to display when there is no building)
	 * calculateEffects OPTIONAL: function called by game.upgrade() to calculated some effects. Effects calculate here can't be calculated in action too. Don't forget to check every possibilities (mandatory "else" if there is an "if" for example).
	 * action OPTIONAL: function called each tick to calculated some effects. Effects calculate here can't be calculated in calculatedEffects too. Don't forget to check every possibilities (mandatory "else" if there is an "if" for example). Do not abuse, may have negative performance impact.
	 *
	 * jammed OPTIONAL: boolean checking the possibility to enable or disable a part of action's code. This variable can't be changed by the player.
	 * isAutomationEnabled OPTIONAL: boolean checking the possibility to enable or disable a part of action's code. This variable can be changed by the player.
	 * lackResConvert MANDATORY if conversion in action: boolean checking if conversions are full or not, it's for UI.
	 *
	 * breakIronWill OPTIONAL: if true, at the first construction, it will break Iron Will mod
	 * noStackable OPTIONAL: if true, button associated will have the behavior of a BuildingResearchBtn whereas of a BuildingStackableBtn (used when a researched behavior is changed during the game into a stackable behavior like religion's upgrades)
	 *
	 */

	buildingsData : [
	//----------------------------------- Food production ----------------------------------------
	{
		name: "field",
		label: $I("buildings.field.label"),
		description: $I("buildings.field.desc"),
		unlockRatio: 0.3,
		defaultUnlockable: true,
		prices: [
			{ name : "catnip", val: 10 }
		],
		priceRatio: 1.12,
		effects: {
			"catnipPerTickBase": 0.12
		},
		flavor : $I("buildings.field.flavor"),
		unlockScheme: {
			name: "catnip",
			threshold: 56 /* need one barn */
		}
	},
	{
		name: "pasture",
		unlockRatio: 0.3,
		stages: [
			{
				label: $I("buildings.pasture.label"),
				description: $I("buildings.pasture.desc"),
				prices: [
					{ name : "catnip", val: 100 },
					{ name : "wood", val: 10 }
				],
				priceRatio: 1.15,
				effects: {},
				flavor: $I("buildings.pasture.flavor"),
				stageUnlocked : true
			},
			{
				label: $I("buildings.solarfarm.label"),
				description: $I("buildings.solarfarm.desc"),
				prices: [
					{ name : "titanium", val: 250 }
				],
				priceRatio: 1.15,
				effects: {},
				calculateEffects: function(self, game) {
					self.effects = {};
				},
				calculateEnergyProduction: function(game, season) {
					if (game.challenges.isActive("winterIsComing")){
						season = 3;
					}

					var energyProduction = 2 * (1 + game.getEffect("solarFarmRatio"));
					if (season == 3) {
						energyProduction *= 0.75;
					} else if (season == 1) {
						energyProduction /= 0.75;
						energyProduction *= 1 + game.getEffect("summerSolarFarmRatio"); //LDR specified in challenges.js
					}

					var seasonRatio = game.getEffect("solarFarmSeasonRatio");
					if ((season == 3 && seasonRatio == 1) || (season != 1 && seasonRatio == 2)){
						energyProduction *= (1 + 0.15 * seasonRatio);
					}

					return energyProduction;

				},
				stageUnlocked : false
			}
		],
		effects: {},
		calculateEffects: function(self, game){
			var stageMeta = self.stages[self.stage];
			if (stageMeta.calculateEffects) {
				stageMeta.calculateEffects(stageMeta, game);
			}
		}
	},{
		name: "aqueduct",
		unlockRatio: 0.3,
		stages: [
			{
				label: $I("buildings.aqueduct.label"),
				description: $I("buildings.aqueduct.desc"),
				prices: [
					{ name : "minerals", val: 75 }
				],
				priceRatio: 1.12,
				effects: {},
				flavor : $I("buildings.aqueduct.flavor"),
				stageUnlocked : true
			},
			{
				label: $I("buildings.hydroplant.label"),
				description: $I("buildings.hydroplant.desc") ,
				prices: [{ name: "titanium", val: 2500 }, { name: "slab", val: 3000 }, { name: "steel", val: 15 }],
				priceRatio: 1.15,
				effects: {},
				stageUnlocked : false
			}
		],
		effects: {},
		calculateEffects: function(self, game){
			self.stages[self.stage].effects = {};
		},
		upgrades: {
			buildings: ["magneto"]
		}
	},
	//----------------------------------- Population ----------------------------------------
	{
		name: "hut",
		label: $I("buildings.hut.label"),
		description: $I("buildings.hut.desc"),
		unlockRatio: 0.3,
		prices: [
			{ name : "wood", val: 5 }
		],
		priceRatio: 1.25,
		defaultUnlockable: true,
		unlocks: {
			tabs: ["science"]
		},
		effects: {
			"xiuweiPerTickBase": 0.005
		},
		breakIronWill: true, //har har har
		almostLimited: false,
		flavor : $I("buildings.hut.flavor")
	},
	{
		name: "logHouse",
		label: $I("buildings.logHouse.label"),
		description: $I("buildings.logHouse.desc"),
		unlockRatio: 0.3,
		defaultUnlockable: true,
		prices: [
			{ name : "catnip", val: 120 },
			{ name : "wood", val: 10 }
		],
		priceRatio: 1.15,
		effects: {
			"woodPerTickBase": 0.035
		},
		calculateEffects: function(self, game){
			self.effects = {
				"woodPerTickBase": 0.035 * (1 + game.getEffect("lumberMillRatio") * 0.2)
			};
		},
		breakIronWill: true,
		almostLimited: false,
		flavor : $I("buildings.logHouse.flavor")
	},{
		name: "mansion",
		label: $I("buildings.mansion.label"),
		description: $I("buildings.mansion.desc"),
		prices: [
			{ name : "science", val: 4000 },
			{ name : "faith", val: 1200 }
		],
		priceRatio: 1.15,
		effects: {
			"faithMax": 2500,
			"unobtainiumMax": 1500
		},
		calculateEffects: function(self, game){
			var ratio = 1 + game.getEffect("warehouseRatio") + game.getEffect("calcinerRatio") * 0.1;
			self.effects = {
				"faithMax": 2500 * ratio,
				"unobtainiumMax": 1500 * ratio
			};
		},
		breakIronWill: true,
		almostLimited: false,
		flavor: $I("buildings.mansion.flavor")
	},
	//----------------------------------- Science ----------------------------------------
	{
		name: "library",
		effects: {
			"sciencePerTickBase": 0.006
		},
		stages: [
			{
				label: $I("buildings.library.label"),
				description: $I("buildings.library.desc"),
				unlockRatio: 0.3,
				prices: [
					{ name : "minerals", val: 300 },
					{ name : "gold", val: 60 }
				],
				effects: {
					"sciencePerTickBase": 0.006
				},
				stageUnlocked : true,
				flavor: $I("buildings.library.flavor")
			},{
				label: $I("buildings.dataCenter.label"),
				description: $I("buildings.dataCenter.desc"),
				prices: [{ name: "minerals", val: 1200 }, { name: "gold", val: 250 }, { name: "science", val: 1500 }],
				effects: {
					"sciencePerTickBase": 0.025
				},
				unlockScheme: {
					name: "computer",
					threshold: 100
				},
				stageUnlocked : false
			}
		],
		priceRatio: 1.15,
		defaultUnlockable: false,
		unlocks: {
			tabs: ["science"]
		},
		upgrades: {
			buildings: ["biolab", "observatory"]
		},
		calculateEffects: function(self, game){
			var stageMeta = self.stages[self.stage];
			var libraryRatio = game.getEffect("libraryRatio");
			var baseScience = self.stage == 1 ? 0.025 : 0.006;
			var stageBonus = 1 + game.bld.get("observatory").on * libraryRatio;
			if (self.stage == 1){
				if (game.workshop.get("uplink").researched){
					stageBonus += game.bld.get("biolab").val * game.getEffect("uplinkDCRatio");
				}
				if (game.workshop.get("machineLearning").researched){
					stageBonus += game.bld.get("aiCore").on * game.getEffect("dataCenterAIRatio");
				}
			}
			var val = baseScience * stageBonus;
			stageMeta.effects = {
				"sciencePerTickBase": val
			};
			self.effects = {
				"sciencePerTickBase": val
			};
			if (self.val){
				game.time.queue.unlockQueueSource("tech");
			}
		}
	},{
		name: "academy",
		label: $I("buildings.academy.label"),
		description: $I("buildings.academy.desc"),
		unlockRatio: 0.3,
		prices: [
			{ name : "minerals", val: 400 },
			{ name : "gold", val: 100 }
		],
		priceRatio: 1.15,
		effects: {
			"goldMax": 1000,
			"scienceMax": 35000
		},
		calculateEffects: function(self, game){
			var ratio = 1 + game.getEffect("warehouseRatio") + Math.max(0, game.getEffect("coalRatioGlobalReduction") * 0.01);
			self.effects = {
				"goldMax": 1000 * ratio,
				"scienceMax": 35000 * ratio
			};
		},
		flavor: $I("buildings.academy.flavor"),
		unlockScheme: {
			name: "school",
			threshold: 68
		}
	},{
		name: "observatory",
		label: $I("buildings.observatory.label"),
		description: $I("buildings.observatory.desc"),
		prices: [{ name: "unobtainium", val: 300 }, { name: "relic", val: 60 }],
		priceRatio: 1.12,
		upgrades: {
			buildings: ["library"]
		},
		effects: {
			"relicMax": 1000,
			"timeCrystalMax": 500
		},
		calculateEffects: function(self, game) {
			var ratio = 1 + game.getEffect("observatoryRatio") + game.getEffect("warehouseRatio");
			self.effects = {
				"relicMax": 1000 * ratio,
				"timeCrystalMax": 500 * ratio
			};
		},
		flavor: $I("buildings.observatory.flavor")
	},{
		name: "biolab",
		label: $I("buildings.biolab.label"),
		description: $I("buildings.biolab.desc"),
		prices: [{ name: "science", val: 1500 }, { name: "slab", val: 60 }, { name: "titanium", val: 40 }, { name: "alloy", val: 10 }],
		priceRatio: 1.12,
		effects: {},
		upgrades: {
			buildings: ["library"]
		},
		calculateEffects: function(self, game){
			var labBonus = 1 + game.getEffect("oilWellRatio") + (game.workshop.get("uplink").researched ? game.getEffect("uplinkLabRatio") : 0);
			void labBonus;
			self.effects = {};
		},
		flavor: $I("buildings.biolab.flavor")
	},
	//----------------------------------- Resource storage -------------------------------------------
	{
		name: "barn",
		label: $I("buildings.barn.label"),
		description: $I("buildings.barn.desc"),
		unlockRatio: 0.3,
		prices: [
			{ name : "wood", val: 50 },
			{ name : "minerals", val: 50 }
		],
		priceRatio: 1.22,
		effects: {
			"catnipMax": 4000,
			"woodMax": 2000,
			"mineralsMax": 2500
		},
		calculateEffects: function (self, game){
			var stainedGlass = game.religion.getRU("stainedGlass");
			var sgBonus = (stainedGlass && stainedGlass.on) ? 0.1 * stainedGlass.on : 0;
			var ratio = (1 + game.getEffect("barnRatio") + sgBonus + game.getEffect("broadcastTowerRatio") * 0.1 + game.getEffect("cultureMaxRatioBonus") * 0.1) * (1 + game.getEffect("warehouseRatio"));
			self.effects = {
				"catnipMax": 4000 * ratio,
				"woodMax": 2000 * ratio,
				"mineralsMax": 2500 * ratio
			};
		},
		flavor: $I("buildings.barn.flavor")
	},
	{
		name: "warehouse",
		isAutomationEnabled: null,
		effects: {},
		stages: [
			{
				label: $I("buildings.warehouse.label"),
				description: $I("buildings.warehouse.desc"),
				flavor: $I("buildings.warehouse.flavor"),
				prices: [
					{ name : "beam", val: 1.5 },
					{ name : "slab", val: 2 }
				],
				priceRatio: 1.15,
				effects: {},
				stageUnlocked: true,
				togglable: false
			},
			{
				label: $I("buildings.spaceport.label"),
				description: $I("buildings.spaceport.desc"),
				flavor: $I("buildings.spaceport.flavor"),
				prices: [{ name: "titanium", val: 10000 }, { name: "eludium", val: 500 }, { name: "oil", val: 50000 }, { name: "blueprint", val: 500 }, { name: "starchart", val: 100000, multPriceRatio: 1.35 }],
				priceRatio: 1.15,
				effects: {},
				stageUnlocked: true,
				togglable: true
			}
		],
		calculateEffects: function(self, game){
			var stageMeta = self.stages[self.stage];
			if (self.stage == 1){
				stageMeta.priceRules = true;
			}
			stageMeta.effects = {};
			self.effects = {};
		},
		upgrades: {
			spaceBuilding: ["moonBase", "planetCracker", "cryostation"]
		},
		unlocks: {
			upgrades: ["transportSuperposition"]
		},
		flavor: $I("buildings.warehouse.flavor"),
		unlockScheme: {
			name: "minimalist",
			threshold: 10
		}
	},
	{
		name: "harbor",
		label: $I("buildings.harbor.label"),
		description: $I("buildings.harbor.desc"),
		prices: [{ name: "slab", val: 50 }, { name: "iron", val: 1500 }, { name: "beam", val: 40 }],
		priceRatio: 1.15,
		effects: {},
		calculateEffects: function(self, game){
			self.effects = {};
		},
		flavor: $I("buildings.harbor.flavor")
	},
	//----------------------------------- Resource production ----------------------------------------
	{
		name: "mine",
		label: $I("buildings.mine.label"),
		description: $I("buildings.mine.desc"),
		unlockRatio: 0.15,
		prices: [
			{ name : "wood", val: 60 }
		],
		priceRatio: 1.15,
		unlocks: {
			tabs: ["workshop"]
		},
		effects: {
			"mineralsPerTickBase": 0.05
		},
		calculateEffects: function(self, game){
			self.effects = {
				"mineralsPerTickBase": 0.05
			};
			self.togglable = game.science.get("ecology").researched;
		},
		flavor: $I("buildings.mine.flavor"),
		unlockScheme: {
			name: "anthracite",
			threshold: 92 // 92% carbon content in coal to have anthracite
		}
	},{
		name: "quarry",
		label: $I("buildings.quarry.label"),
		description: $I("buildings.quarry.desc"),
		unlockRatio: 0.3,
		prices: [{ name: "slab", val: 120 }, { name: "steel", val: 25 }, { name: "beam", val: 100 }],
		priceRatio: 1.15,
		effects: {},
		calculateEffects: function(self, game){
			self.effects = {};
			self.togglable = game.science.get("ecology").researched;
		},
		flavor : $I("buildings.quarry.flavor")
	},
	{
		name: "smelter",
		label: $I("buildings.smelter.label"),
		description: $I("buildings.smelter.desc"),
		unlockRatio: 0.15,
		prices: [
			{ name : "minerals", val: 160 }
		],
		priceRatio: 1.15,
		effects: {
			"goldPerTickBase": 0.008
		},
		calculateEffects: function(self, game) {
			var smelterRatio = 1 + game.getEffect("smelterRatio");
			var baseGold = (game.workshop.get("goldOre").researched ? 0.012 : 0.008) +
				(game.workshop.get("geodesy").researched ? 0.002 : 0);
			self.effects = {
				"goldPerTickBase": baseGold * smelterRatio
			};
		},
		flavor: $I("buildings.smelter.flavor")
	},{
		name: "calciner",
		label: $I("buildings.calciner.label"),
		description: $I("buildings.calciner.desc"),
		prices: [
			{ name : "titanium",  val: 15 },
			{ name : "oil",  val: 500 },
			{ name : "steel", val: 100 },
			{ name : "blueprint",  val: 1 }
		],
		priceRatio: 1.15,
		effects: {},
		calculateEffects: function(self, game) {
			self.effects = {};
		}
	},
	{
		name: "steamworks",
		label: $I("buildings.steamworks.label"),
		description: $I("buildings.steamworks.desc"),
		prices: [{ name: "steel", val: 125 }, { name: "blueprint", val: 1 }],
		priceRatio: 1.25,
		effects: {},
		calculateEffects: function(self, game){
			self.effects = {};
		},
		jammed: false,
		togglableOnOff: true,
		isAutomationEnabled: null,
		flavor: $I("buildings.steamworks.flavor")
	},{
		name: "magneto",
		label: $I("buildings.magneto.label"),
		description: $I("buildings.magneto.desc"),
		prices: [{ name: "steel", val: 20 }, { name: "alloy", val: 10 }, { name: "blueprint", val: 1 }],
		priceRatio: 1.18,
		effects: {},
		calculateEffects: function(self, game) {
			var uRatio = game.getEffect("uraniumRatio");
			void uRatio;
			self.effects = {};
		}
	},
	{
		name: "lumberMill",
		label: $I("buildings.lumberMill.label"),
		description: $I("buildings.lumberMill.desc"),
		unlockRatio: 0.3,
		prices: [
			{name : "wood", val: 100},
			{name : "minerals", val: 250},
			{name : "iron", val: 50}
		],
		priceRatio: 1.15,
		effects: {},
		calculateEffects: function(self, game){
			self.effects = {};
		},
		flavor: $I("buildings.lumberMill.flavor")
	},
	{
		name: "oilWell",
		label: $I("buildings.oilWell.label"),
		description: $I("buildings.oilWell.desc"),
		prices: [{ name: "steel", val: 125 }, { name: "beam", val: 200 }],
		priceRatio: 1.15,
		effects: {},
		isAutomationEnabled: null,
		calculateEffects: function(self, game) {
			self.effects = {};
		},
		flavor: $I("buildings.oilWell.flavor"),
		unlockScheme: {
			name: "oil",
			threshold: 73
		}
	},
	//----------------------------------- Other ----------------------------------------
	{
		name: "workshop",
		label: $I("buildings.workshop.label"),
		description: $I("buildings.workshop.desc"),
		defaultUnlockable: true,
		unlockRatio: 0.0025,
		prices: [
			{ name : "wood", val: 80 },
			{ name : "minerals", val: 250 }
		],
		priceRatio: 1.15,
		unlocks: {
			tabs: ["workshop"]
		},
		effects: {},
		calculateEffects: function(self, game){
			var steelRatio = 1 + (game.workshop.get("steelPlants").researched ? (
				game.getEffect("calcinerSteelRatio") +
				game.getEffect("calcinerSteelCraftRatio") +
				game.getEffect("calcinerSteelReactorBonus") +
				game.getEffect("calcinerSteelRatioBonus")
			) : 0);
			void steelRatio;
			self.effects = {};
			if (self.val) {
				game.time.queue.unlockQueueSource("upgrades");
			}
		},
		flavor: $I("buildings.workshop.flavor")
	},{
		name: "factory",
		label: $I("buildings.factory.label"),
		description: $I("buildings.factory.desc"),
		prices: [{ name: "titanium", val: 180 }, { name: "oil", val: 200 }, { name: "slab", val: 150 }, { name: "steel", val: 80 }],
		isAutomationEnabled: null,
		priceRatio: 1.15,
		effects: {},
		unlockScheme: {
			name: "factory",
			threshold: 20
		},
		calculateEffects: function(self, game){
			self.effects = {};
		}
	},{
		name: "reactor",
		label: $I("buildings.reactor.label"),
		description: $I("buildings.reactor.desc"),
		prices: [{ name: "gold", val: 400 }, { name: "science", val: 5000 }, { name: "faith", val: 1500 }],
		priceRatio: 1.15,
		upgrades: {
			buildings: ["harbor"]
		},
		effects: {
			"unobtainiumPerTickBase": 0.025
		},
		isAutomationEnabled: null,
		calculateEffects: function(self, game) {
			self.effects = {
				"unobtainiumPerTickBase": 0.025 * (1 + game.getEffect("reactorEnergyRatio") * 0.2)
			};
		},
		flavor: $I("buildings.reactor.flavor")
	},{
		name: "accelerator",
		label: $I("buildings.accelerator.label"),
		description: $I("buildings.accelerator.desc"),
		prices: [{ name: "science", val: 12000 }, { name: "faith", val: 3000 }, { name: "unobtainium", val: 120 }],
		priceRatio: 1.15,
		effects: {
			"relicPerTickBase": 0.018
		},
		calculateEffects: function(self, game){
			self.effects = {
				"relicPerTickBase": 0.018 * (1 + game.getEffect("acceleratorRatio") * 0.2)
			};
		},
		flavor: $I("buildings.accelerator.flavor")
	},
	{
		name: "tradepost",
		label: $I("buildings.tradepost.label"),
		description: $I("buildings.tradepost.desc"),
		unlockRatio: 0.3,
		prices: [
			{ name : "wood", val: 500 },
			{ name : "minerals", val: 200 },
			{ name : "gold", val: 10 }
		],
		priceRatio: 1.15,
		effects: {},
		calculateEffects: function(self, game) {
			self.effects = {};
		},
		upgrades: {
			challenges: ["pacifism"]
		},
		flavor: $I("buildings.tradepost.flavor")
	},{
		name: "mint",
		label: $I("buildings.mint.label"),
		description: $I("buildings.mint.desc"),
		prices: [{ name: "minerals", val: 5000 }, { name: "gold", val: 150 }, { name: "iron", val: 4000 }],
		priceRatio: 1.15,
		effects: {},
		calculateEffects: function (self, game){
			self.effects = {};
		},
		unlockScheme: {
			name: "gold",
			threshold: 24
		}
	},{
		name: "brewery",
		label: $I("buildings.brewery.label"),
		description: $I("buildings.brewery.desc"),
		unlockRatio: 0.2,
		prices: [{ name: "wood", val: 1000 }, { name: "culture", val: 1200 }, { name: "spice", val: 5 }],
		priceRatio: 1.5,
		effects: {},
		togglable: true,
		calculateEffects: function(self, game){
			self.effects = {};
		},
		flavor: $I("buildings.brewery.flavor"),
		unlocks:{
		},
		unlockScheme: {
			name: "chocolate",
			threshold: 10
		}
	},
	//-------------------------- Culture -------------------------------
	{
		name: "amphitheatre",
		effects: {},
		stages: [
			{
				label: $I("buildings.amphitheatre.label"),
				description: $I("buildings.amphitheatre.desc"),
				prices: [{ name: "wood", val: 200 }, { name: "minerals", val: 1200 }, { name: "culture", val: 45 }],
				priceRatio: 1.15,
				effects: {},
				stageUnlocked : true,
				flavor: $I("buildings.amphitheatre.flavor")
			},
			{
				label : $I("buildings.broadcasttower.label"),
				description: $I("buildings.broadcasttower.desc"),
				prices: [
					{ name : "iron", val: 1250 },
					{ name : "titanium", val: 75 }
				],
				priceRatio: 1.18,
				effects: {},
				stageUnlocked : false
			}
		]
	},
	{
		name: "chapel",
		label: $I("buildings.chapel.label"),
		description: $I("buildings.chapel.desc"),
		prices: [{ name: "minerals", val: 1200 }, { name: "culture", val: 350 }, { name: "titanium", val: 20 }],
		priceRatio: 1.15,
		effects: {},
		calculateEffects: function(self, game) {
			self.effects = {};
		}
	},
	{
		name: "temple",
		label: $I("buildings.temple.label"),
		description: $I("buildings.temple.desc"),
		prices: [{ name: "minerals", val: 600 }, { name: "gold", val: 120 }, { name: "science", val: 1200 }],
		priceRatio: 1.15,
		upgrades: {
			buildings: ["ziggurat"]
		},
		effects: {
			"faithPerTickBase" : 0.04
		},
		calculateEffects: function(self, game){
			if (!game.challenges.isActive("atheism")) {
				self.description = $I("buildings.temple.desc");
				self.flavor = $I("buildings.temple.flavor");
				if (self.val > 0){
					game.time.queue.unlockQueueSource("religion");
				}
				self.effects = {
					"faithPerTickBase" : 0.04 * (1 + game.getEffect("hydroPlantRatio"))
				};
			} else {
				self.description = $I("buildings.temple.desc.atheism");
				self.flavor = $I("buildings.temple.flavor.atheism");
				self.effects = {};
			}
		},
		flavor: $I("buildings.temple.flavor")
	},
	{
		name: "unicornPasture",
		label: $I("buildings.unicornPasture.label"),
		description: $I("buildings.unicornPasture.desc"),
		unlockRatio: 0.3,
		prices: [
			{ name : "catnip", val: 500 },
			{ name : "wood", val: 200 }
		],
		priceRatio: 1.75,
		effects: {},
		calculateEffects: function(self, game) {
			self.effects = {};
		},
		flavor: $I("buildings.unicornPasture.flavor")
	},
	//----------------------------------- Wonders ----------------------------------------

	{
		name: "ziggurat",
		label: $I("buildings.ziggurat.label"),
		description: $I("buildings.ziggurat.desc"),
		unlockRatio: 0.01,
		prices: [{ name: "beam", val: 400 }, { name: "blueprint", val: 1 }, { name: "slab", val: 1000 }],
		priceRatio: 1.25,
		upgrades: {
			buildings: ["temple"]
		},
		effects: {},
		calculateEffects: function(self, game) {
			self.effects = {};
			if (self.val){
				game.time.queue.unlockQueueSource("zigguratUpgrades");
			}
		}
	},{
		name: "chronosphere",
		label: $I("buildings.chronosphere.label"),
		description: $I("buildings.chronosphere.desc"),
		prices: [
			{ name : "unobtainium", val: 400 },
			{ name : "relic", 		val: 80 },
			{ name : "science", 	val: 35000 }
		],
		priceRatio: 1.20,
		effects: {
			"timeCrystalPerTickBase": 0.015
		},
		upgrades: {
			voidSpace: ["cryochambers"],
			buildings: ["stasisPod"]
		},
		calculateEffects: function(self, game) {
			self.effects = {
				"timeCrystalPerTickBase": 0.015 * (1 + game.getEffect("temporalFluxProductionChronosphere") * 0.1)
			};
		}
	},{
		name: "aiCore",
		label: $I("buildings.aicore.label"),
		description: $I("buildings.aicore.desc"),
		unlockRatio: 0.01,
		prices: [{ name: "eludium", val: 50 }, { name: "gold", val: 1250 }, { name: "science", val: 500000 }],
		priceRatio: 1.15,
		effects: {},
		upgrades: {
			buildings: ["library"],
			spaceBuilding: ["moonBase"]
		},
		unlockScheme: {
			name: "cyber",
			threshold: 5
		},
		gflops: 0,
		aiLevel: 0,
		updateEffects: function(self, game) {
			self.aiLevel = Math.round(Math.log(Math.max(self.gflops || 1, 1)));
		},
		action: function(self, game) {
			self.gflops = (self.gflops || 0) + 0.02 * self.on;
			self.updateEffects(self, game);
		},
		flavor: $I("buildings.aicore.flavor"),
		canSell: function(self, game){
			if ((self.aiLevel || 0) < 15){
				return true;
			}
			game.systemShockMode = true;
			// Send message since achievement pop takes time or may have already occurred.
			game.msg($I("buildings.aicore.attemptsell"));
			return false;
		}
	},
	//----------------- HoD stuff --------------------------
	{
		name: "zebraOutpost",
		label: $I("buildings.zebraOutpost.label"),
		description: $I("buildings.zebraOutpost.desc"),
		unlockRatio: 0.01,
		prices: [{ name: "relic", val: 50 }],
		priceRatio: 1.35,
		zebraRequired: 5,
		effects: {},
		calculateEffects: function(self, game){
			self.effects = {};
		},
		jammed: false,
		action: function(self, game){
			if (self.val < 1 || self.jammed){
				return;
			}
			game.upgrade(
				self.upgrades
			);
			self.jammed = true;
		},
		upgrades: {
			buildings: ["zebraWorkshop"]
		}
	},{
		name: "zebraWorkshop",
		label: $I("buildings.zebraWorkshop.label"),
		description: $I("buildings.zebraWorkshop.desc"),
		unlockRatio: 0.01,
		prices: [{ name: "relic", val: 250 }],
		unlocks: {
		},
		priceRatio: 1.15,
		zebraRequired: 10,
		effects: {},
		calculateEffects: function(self, game){
			self.effects = {};
		},
		upgrades: {
			buildings: ["zebraWorkshop"]
		}
	},{
		name: "zebraForge",
		label: $I("buildings.zebraForge.label"),
		description: $I("buildings.zebraForge.desc"),
		unlockRatio: 0.01,
		prices: [{ name: "relic", val: 2500 }],
		unlocks: {
			crafts: [],
		},
		priceRatio: 1.15,
		zebraRequired: 50,
		effects: {},
		calculateEffects: function(self, game){
			self.effects = {};
			game.upgrade(self.upgrades);
		},
		upgrades: {
			buildings: ["zebraOutpost"]
		}
	},
	{
		name: "stasisPod",
		label: $I("buildings.stasisPod.label"),
		description: $I("buildings.stasisPod.desc"),
		unlockRatio: 0.01,
		prices: [{ name: "titanium", val: 200 }, { name: "timeCrystal", val: 2 }, { name: "relic", val: 10 }],
		fewZebrasPrices : [
			{ name : "eludium", val: 100 },
            { name : "timeCrystal", val: 2 },
            { name : "relic", val: 10 }
		],
		priceRatio: 1.25,
		zebraRequired: 1,
		effects: {},
		upgrades: {
			buildings: ["zebraOutpost"]
		},
		priceRules: true,
	},
	{
		name: "ivoryTemple",
		defaultUnlockable: true,
		label: $I("buildings.ivoryTemple.label"),
		description: $I("buildings.ivoryTemple.desc"),
		unlockRatio: 0.1,
		prices: [{ name: "titanium", val: 200 }, { name: "minerals", val: 100 }],
		priceRatio: 1.15,
		effects: {},
		togglable: true,
		calculateEffects: function(self, game){
			self.effects = {};
		}
	}
	],

	effectsBase: {
		"catnipMax"		: 2000,
		"woodMax"		: 500,
		"mineralsMax"	: 600,
		"coalMax"       : 200,
		"ironMax"       : 300,
		"titaniumMax"   : 150,
		"goldMax"       : 200,
		"oilMax"        : 800,
		"uraniumMax"	: 300,
		"unobtainiumMax": 300,
		"relicMax"      : 500,
		"timeCrystalMax": 200,
		"antimatterMax" : 200,
		"manpowerMax"	: 150,
		"manpowerPerTickBase": 0.25,
		"scienceMax"    : 600,
		"cultureMax"	: 200,
		"faithMax" 		: 500,
		"hutFakeBought": 0,
		"logHouseFakeBought": 0,
		"mansionFakeBought": 0 //these 3 are for Post Apocalypse pollution based housing cost increase — using getEffect instead of special handling
	},
	pollutionEffects: {
		"catnipPollutionRatio" : 0,
		"solarRevolutionPollution" : 0,
		"pollutionDissipationRatio" :  1e-7,
	},

	//deprecated, use getBuildingExt
	get: function(name){
		for (var i = 0; i < this.buildingsData.length; i++){
			var bld = this.buildingsData[i];
			if (bld.name == name){
				return bld;
			}
		}
		console.error("Could not find building data for '" + name + "'");
	},

    /**
     * Returns a class wrapper around the building metadata
     */
    getBuildingExt: function(name){
        var bldExt = this.metaCache[name];
        if (bldExt){
            return bldExt;
        }
        for (var i = 0; i < this.buildingsData.length; i++){
			var bld = this.buildingsData[i];
			if (bld.name == name){
                var bldExt = new classes.BuildingMeta(bld);
                this.metaCache[name] = bldExt;
                return bldExt;
            }
        }
    },

	/**
	 * Returns a deep copy of all building groups.
	 * @param {boolean} includeNonGroupFilters If enabled, includes extra things like "IW", "Togglable", "All", etc.
	 * 			The UI code treats these as special building groups for the sake of player convenience.
	 * @return An array of buildingGroup objects, which have 3 fields: name (string), title (string), buildings (array of strings)
	 */
	getBuildingGroups: function(includeNonGroupFilters) {
		var game = this.game;
		var groupsArr = [];

		//See renderActiveGroup for how these are handled, since their buildings arrays are empty.
		if (includeNonGroupFilters) {
			groupsArr.push({
				name: "all",
				title: $I("ui.filter.all"),
				buildings: []
			});
			groupsArr.push({
				name: "available",
				title: $I("ui.filter.available"),
				buildings: []
			});
			groupsArr.push({
				name: "allEnabled",
				title: $I("ui.filter.enabled"),
				buildings: []
			});
			groupsArr.push({
				name: "togglable",
				title: $I("ui.filter.togglable"),
				buildings: []
			});

			if (game.ironWill && game.libraryTab.visible) {
				groupsArr.push({
					name: "iw",
					title: $I("ui.filter.ironWill"),
					buildings: []
				});
			}
		}

		//Now, deep-copy this.buildingGroups into groupsArr:
		this.buildingGroups.forEach(function(bldGroup) {
			groupsArr.push({
				name: bldGroup.name,
				title: bldGroup.title,
				buildings: bldGroup.buildings.slice() //Shallow-copy array
			});
		});

		//Apply modifications at runtime such as upgrades which give buildings dual purpose:
		if (game.workshop.get("energyRifts").researched) {
			var storageGroup = this.getMeta("storage", groupsArr);
			storageGroup.buildings.push("accelerator");
		}
		return groupsArr;
	},

	/**
	 * Render groups as a flat list of leaves, sorted by buildingsOrder.
	 * 
	 * @param {Array} groups Array of buildingGroup objects, as returned by getBuildingGroups
	 * @return {Array} Array of building names, each appearing at most once
	 */
	unrollBuildingGroups: function(groups) {
		var leaves = [];
		var seen = {};
		var order = this.getBuildingsOrderIndex();
		var unordered = this.buildingsOrder.length;	//buildings missing from buildingsOrder go last

		groups.forEach(function(bldGroup) {
			bldGroup.buildings.forEach(function(bldName) {
				if (seen[bldName]) {
					return;	//another group already pulled in this building, e.g. ziggurat
				}
				seen[bldName] = true;
				leaves.push({
					name: bldName,
					order: order[bldName] !== undefined ? order[bldName] : unordered,
					index: leaves.length	//tiebreaker, keeps the sort stable on any engine
				});
			});
		});

		leaves.sort(function(a, b) {
			return (a.order - b.order) || (a.index - b.index);
		});
		return leaves.map(function(leaf) {
			return leaf.name;
		});
	},

	getAutoProductionRatio: function() {
		var autoProdRatio = 1;

		//	Solar Revolution
		autoProdRatio *= 1 + this.game.religion.getSolarRevolutionRatio();

		//	SW
		var steamworks = this.get("steamworks");
		var swRatio = steamworks.on > 0 ? (1 + (steamworks.effects["magnetoBoostRatio"] || 0) * this.get("steamworks").on) : 1;
		autoProdRatio *= 1 + this.game.getEffect("magnetoRatio") * swRatio;

		// paragon (25%)
		autoProdRatio *= 1 + this.game.prestige.getParagonProductionRatio() * 0.05;

		// reactors
		autoProdRatio *= 1 + this.game.getEffect("productionRatio");

		// cultivation realm bonus
		autoProdRatio *= 1 + this.game.getEffect("realmProductionRatio");

		return autoProdRatio;
		//This function must stay atm for Steel Plants
	},

	getPriceRatioWithAccessor: function(bld){
		var ratio = bld.get("priceRatio");
		var ratioBase = ratio - 1;

		var ratioDiff = this.game.getEffect(bld.meta.name + "PriceRatio") +
			this.game.getEffect("priceRatio");

		ratioDiff = this.game.getLimitedDR(ratioDiff, ratioBase);
		return ratio + ratioDiff;
	},

	/**
	 * For fucks sake, finally we have a non-concrete dynamic price calculation algorithm
	 * It only took a couple of months. TODO: potential performance impact?
	 */
	 getPrices: function(bldName, additionalBought) {
	 	var bld = this.getBuildingExt(bldName);
		return this.getPricesWithAccessor(bld, additionalBought);
	 },

	 getPricesWithAccessor: function(bld, additionalBought) {
		additionalBought = additionalBought || 0;
	 	var bldPrices = bld.get("prices");
		var bldName = bld.get("name");
		var bldVal = bld.get("val");
		var ratio = this.getPriceRatioWithAccessor(bld);

		var prices = [];

		var pricesDiscount = this.game.getLimitedDR((this.game.getEffect(bldName + "CostReduction")), 1);
		var priceModifier = 1 - pricesDiscount;
		var fakeBought = this.game.getEffect(bldName + "FakeBought") + additionalBought;

		// The most simple case of all: priceRules tag is not true and we aren't in unicornTears challenge! Allows early escape patch
		// TODO: code duplication might be solvable!
		if (!bld.get("priceRules") && !this.game.challenges.isActive("unicornTears")){
			for (var i = 0; i < bldPrices.length; i++) {
				var resPriceDiscount = this.game.getLimitedDR(this.game.getEffect(bldPrices[i].name + "CostReduction"), 1);
				var resPriceModifier = 1 - resPriceDiscount;
				var cost = bldPrices[i].val * Math.pow(ratio, bldVal + fakeBought) * priceModifier * resPriceModifier;
				prices.push({
					val: cost,
					name: bldPrices[i].name
				});
			}
			return prices;
		}
		if (bld.get("priceRules")){
			if (bldName == "stasisPod"){
				bldPrices = bld.get("fewZebrasPrices");
			}
			for (var i = 0; i < bldPrices.length; i++) {
				var resPriceDiscount = this.game.getLimitedDR(this.game.getEffect(bldPrices[i].name + "CostReduction"), 1);
				var resPriceModifier = 1 - resPriceDiscount;
				var cost = bldPrices[i].val * Math.pow(ratio, bldVal + fakeBought) * priceModifier * resPriceModifier;
				if (bldPrices[i].multPriceRatio) {
					cost *= Math.pow(bldPrices[i].multPriceRatio, bldVal + fakeBought);
				}
				prices.push({
					val: cost,
					name: bldPrices[i].name
				});
			}

			if (this.game.challenges.isActive("blackSky")
		 	&& bldName == "calciner"
		 	&& bldVal == 0) {
				for (var i = 0; i < prices.length; i++) {
					prices[i].val *= prices[i].name == "titanium" ? 0 : 11;
				}
			}
			if (this.game.challenges.isActive("pacifism")
			&& bldName == "steamworks"
			&& bldVal == 0) {
				for (var i = 0; i < prices.length; i++) {
					if (prices[i].name == "blueprint"){
						prices[i].val = this.game.challenges.getChallenge("pacifism").on * 5 + 1;
					}
				}
			}

			if (this.game.challenges.isActive("postApocalypse")
			&& bldName == "field"
			&& this.getPollutionLevel() >= 5
			&& bldVal >= Math.max(95 - this.game.time.getVSU("usedCryochambers").val - this.getPollutionLevel(), 7 + (this.game.ironWill? 8 : 0)) ) {
				var builtWithUnobtanium = Math.max(bldVal + this.game.time.getVSU("usedCryochambers").val - 100, 0);
				prices.push({val: 15 * Math.pow(ratio, builtWithUnobtanium),
						name : "unobtainium",
						isTemporary: true //can't exploit buy manipulating pollution in postApocalypse
				});
			}
		
		} else {
			for (var i = 0; i < bldPrices.length; i++) {
				var resPriceDiscount = this.game.getLimitedDR(this.game.getEffect(bldPrices[i].name + "CostReduction"), 1);
				var resPriceModifier = 1 - resPriceDiscount;
				var cost = bldPrices[i].val * Math.pow(ratio, bldVal + fakeBought) * priceModifier * resPriceModifier;
				prices.push({
					val: cost,
					name: bldPrices[i].name
				});
			}
		}

		// unicornTears can't really use the priceRules because it affects basically everything!
		// But this refactor limited the number of checks for other challenge modifying prices and such
		if (this.game.challenges.isActive("unicornTears")
		 && bldVal > 0 /*For the purposes of Challenge compatibility, the first one will always have its price unmodified.*/) {
			prices = this.applyUnicornTearsPrices(bld, bldName, bldVal, priceModifier, bldPrices, prices);
		}
		return prices;
	 },

	applyUnicornTearsPrices: function(bld, bldName, bldVal, priceModifier, bldPrices, prices){
		//In the Unicorn Tears Challenge, we give each Bonfire building a price of unicorns, unicorn tears, or alicorns.
		if (bldName == "warehouse" && bld.get("stage") == 0 /*Affects Warehouses but not Spaceports*/) {
			//I don't like having these special cases, but I want to avoid the player getting stuck.
			prices.push({ name: "unicorns",
				val: 2 * bldVal * priceModifier, //Linear (not exponential) scaling
				isTemporary: true
			});
		} else if (bldName == "harbor") {
			//I don't like having these special cases, but I want to avoid the player getting stuck.
			prices.push({ name: "tears",
				val: 2 * bldVal * priceModifier, //Linear (not exponential) scaling
				isTemporary: true
			});
		} else {
			//We use the base price of a building (not affected by policies that reduce resource prices) to calculate the weight:
			var weight = this.game.challenges.getChallenge("unicornTears").sumPricesWeighted(bldPrices);
			if (weight > 0) {
				//We use a price ratio determined by the Unicorn Tears Challenge.
				weight *= Math.pow(this.game.getEffect("bonfireTearsPriceRatioChallenge"), bldVal - 1);
			}
			if (weight > 1e9) {
				prices.push({ name: "alicorn",
					val: (Math.log(weight) - 19.7232) * priceModifier, //With a weight of exactly 1e9, this is just a smidge over 1
					isTemporary: true
				});
			} else if (weight > 100000) {
				prices.push({ name: "tears",
					val: weight / 100000 * priceModifier,
					isTemporary: true
				});
			} else if (weight >= 100) {
				prices.push({ name: "unicorns",
					val: weight / 100 * priceModifier,
					isTemporary: true
				});
			}
			//Else, if the weight is under 100, we don't add anything to the price.
		}
		return prices;
	},

	calculatePollutionEffects: function(){
		var POL_LBASE = this.getPollutionLevelBase();

		var pollutionLevel = this.getPollutionLevel();
		var pollution = this.cathPollution;
		//post apocalypse effects
		if (this.game.challenges.isActive("postApocalypse")){
			this.game.bld.pollutionEffects["pollutionDissipationRatio"] = 0;
			if (pollutionLevel > 8){
				this.game.bld.effectsBase["hutFakeBought"] = pollutionLevel - 8;
				this.game.bld.effectsBase["logHouseFakeBought"] = pollutionLevel - 8;
				this.game.bld.effectsBase["mansionFakeBought"] = pollutionLevel - 8;
			} else {
				this.game.bld.effectsBase["hutFakeBought"] = 0;
				this.game.bld.effectsBase["logHouseFakeBought"] = 0;
				this.game.bld.effectsBase["mansionFakeBought"] = 0;
			}
		}
		
		if (pollutionLevel >= 4){
			this.pollutionEffects["catnipPollutionRatio"] = this.game.getLimitedDR(-0.5 - 0.1 * Math.log(pollution), 10)/10;
			this.pollutionEffects["solarRevolutionPollution"] = -Math.min(1e-10 * (pollution - POL_LBASE * 1000)/9, 1); //linear HERE AND ONLY HERE
		}
		else if (pollutionLevel == 3){
			this.pollutionEffects["catnipPollutionRatio"] = this.game.getLimitedDR(-0.5 - 0.1 * Math.log(pollution), 10)/10;
			this.pollutionEffects["solarRevolutionPollution"] = 0;
		}
		else if (pollutionLevel == 2){
			this.pollutionEffects["catnipPollutionRatio"] = this.game.getLimitedDR(-0.5 - 0.1 * Math.log(pollution), 10)/10;
			this.pollutionEffects["solarRevolutionPollution"] = 0;
		}
		else if (pollutionLevel == 1){
			this.pollutionEffects["catnipPollutionRatio"] =
			-0.2 - ((pollution - POL_LBASE) * 0.05 / (POL_LBASE * 10));	//linear between -0.2 : -0.25;
			this.pollutionEffects["solarRevolutionPollution"] = 0;
		}
		else if (pollutionLevel == 0){
			//0% at 50% pollution, -20% at lvl 1
			this.pollutionEffects["catnipPollutionRatio"] = (pollution >= POL_LBASE/2) ?
				(
					-0.2 * (pollution - POL_LBASE/2) / (POL_LBASE/2)
				) : 0 ; //linear between 0 : -0.2 with first 50% zero
			this.pollutionEffects["solarRevolutionPollution"] = 0;
		}

		//limit negative ratios with 75%
		if (this.pollutionEffects["catnipPollutionRatio"] < -0.75){
			this.pollutionEffects["catnipPollutionRatio"] = -0.75;
		}
	},
	update: function(){
		var rerender = false;
		for (var i = 0; i < this.buildingsData.length; i++){
			var bld = this.buildingsData[i];
			if (!bld.unlocked){
				if (this.isUnlocked(bld)){
					bld.unlocked = true;
					rerender = true;
				}
			}
			else {
				//just in case we patched something (shit happens?)
				if (!this.isUnlockable(bld)){
					bld.unlocked = false;
				}
			}

			if (bld.action && (bld.on > 0 || bld.name == "biolab" || bld.name == "aiCore")){
				var amt = bld.action(bld, this.game);
				if (typeof(amt) != "undefined") {
					bld.lackResConvert = amt != 1 && bld.on != 0;
				}
			}

		}

		this.calculatePollutionEffects();

		if (rerender){
			this.game.render();
		}
	},

	getEffect: function(effectName){
		var effect = 0;
		for (var i = 0; i < this.meta.length; i++){
			var effectMeta = this.getMetaEffect(effectName, this.meta[i]);
			effect += effectMeta;

		}
		return effect;
	},

	isUnlocked: function(building){
		if (!this.isUnlockable(building)){
			return false;
		}

		var isUnlocked = true;

		var building = new classes.BuildingMeta(building).getMeta();
		var unlockRatio = building.unlockRatio;

		if (building.prices.length && typeof(unlockRatio) == "number"){

			for ( var i = 0; i < building.prices.length; i++){
				var price = building.prices[i];
				var res = this.game.resPool.get(price.name);

				if (res.value < price.val * unlockRatio){	// 30% required to unlock structure
					isUnlocked = false;
					break;
				}
			}
		}

		return isUnlocked;
	},

	isUnlockable: function(building){
		return building.defaultUnlockable || building.unlockable;
	},

	save: function(saveData){
		saveData.buildings = this.filterMetadata(this.buildingsData, ["name", "unlocked", "val", "on", "stage", "jammed", "isAutomationEnabled"], 
			function (key, value){
				//discard empty props
				if (key == "val" || key == "on") {
					return value === 0 ? undefined : value;
				}
				if (key == "unlocked" || key == "jammed" /*isAutomationEnabled is true by default*/){
					return value === false ? undefined: value;
				}
				return value;
			}
		);
		if (!saveData.bldData){
			saveData.bldData = {};
		}
		saveData.bldData.groupBuildings = this.groupBuildings;
		saveData.bldData.twoRows = this.twoRows;
		saveData.cathPollution = this.cathPollution;
	},

	load: function(saveData){
		this.groupBuildings = saveData.bldData ? saveData.bldData.groupBuildings : false;
		this.twoRows = saveData.bldData ? saveData.bldData.twoRows : false;
		this.loadMetadata(this.buildingsData, saveData.buildings, "buildings");
		this.cathPollution = saveData.cathPollution|| 0;
		this.calculatePollutionEffects();
	},

	resetState: function(){
		for (var i = 0; i < this.buildingsData.length; i++){
			var bld = this.buildingsData[i];

			bld.unlocked = false;
			bld.unlockable = bld.defaultUnlockable || false;

			if (typeof(bld.stages) == "object"){
				bld.stage = 0;
				for (var j = 1; j < bld.stages.length; j++){ //stages[0] should always be unlocked
					bld.stages[j].stageUnlocked = false;
				}
			}

			if (bld.jammed != undefined){
				bld.jammed = false;
			}

			this.resetStateStackable(bld);
		}

		this.cathPollution = 0;
		this.cathPollutionPerTick = 0;
		if (this.game){
			this.game.gatherClicks = 0;
		}
	},
	//pollution functions:
	getCleanEnergy: function(){
		var solarFarm = this.getBuildingExt("pasture").meta;
		var hydroPlant = this.getBuildingExt("aqueduct").meta;
		var reactor = this.getBuildingExt("reactor").meta;
		var sattelite = this.game.space.getBuilding("sattelite");
		var cleanEnergyProduced = (solarFarm.stage == 1 && solarFarm.stages[1].effects)? (solarFarm.stages[1].effects["energyProduction"] || 0) * solarFarm.on : 0;
		cleanEnergyProduced += (hydroPlant.stage == 1 && hydroPlant.stages[1].effects)? (hydroPlant.stages[1].effects["energyProduction"] || 0) * hydroPlant.on : 0;
		cleanEnergyProduced += (reactor.effects["energyProduction"] || 0) * reactor.on / 2;
		cleanEnergyProduced += (sattelite.effects["energyProduction"] || 0) * sattelite.on;
		return cleanEnergyProduced;
	},
	getPollutingEnergy: function () {
		var magneto = this.getBuildingExt("magneto").meta;
		var steamworks = this.getBuildingExt("steamworks").meta;
		var polutinEnergy = (magneto.effects["energyProduction"] || 0) * magneto.on + (steamworks.effects["energyProduction"] || 0) * steamworks.on;
		return polutinEnergy;
	},
	getCleanEnergyProdRatio: function(){
		if (!(this.getCleanEnergy() + this.getPollutingEnergy())) {return 0;}
		return this.getCleanEnergy() / (this.getCleanEnergy() + this.getPollutingEnergy());
	},
	getPollutionRatio: function() {
		return 1 - this.getCleanEnergyProdRatio() / 2;
	},

	getPollutionLevelBase: function(){
		return 10000000;
	},

	getPollutionLevel: function(cathPollution) {
		if (cathPollution == undefined) {cathPollution = this.cathPollution;}
		if (cathPollution <= 0){return 0;}
		return Math.max(Math.floor(Math.log10(cathPollution * 10 / this.getPollutionLevelBase())), 0);
	},

	getDetailedPollutionInfo: function(){
		var html = "";

		var currentCathPollution = this.game.bld.cathPollution;
		var currenCathPerTickPollution = this.game.bld.cathPollutionPerTick;

		html = "Pollution is " + Math.floor(currentCathPollution) +
				" (" + this.game.getDisplayValueExt(currentCathPollution) + ") " +
				"<br>Polution per tick is " + Math.floor(currenCathPerTickPollution);

		var pollutionLevel = this.game.bld.getPollutionLevel();
		html += "<br>Pollution level is " + pollutionLevel;

		if (pollutionLevel >= 0){
			html += "<br>Pollution future effects might be at this pollution level:";
			html += "<br>— Less catnip production";
			if (pollutionLevel > 4){
				html += "<br>— SR effect doesn't apply to wood and catnip";
			} else if (pollutionLevel >= 3){
				html += "<br>— Less SR effect on wood and catnip";
			}
		}
		if (currenCathPerTickPollution < 0 && currentCathPollution) {
			var toZero = -currentCathPollution / currenCathPerTickPollution / this.game.calendar.ticksPerDay;
			html += "<br> To zero " + this.game.toDisplaySeconds(toZero.toFixed());
		} else if (currenCathPerTickPollution > 0){
			var toNextLevel = (Math.pow(10, 1 + pollutionLevel) * this.game.bld.getPollutionLevelBase() - currentCathPollution) / currenCathPerTickPollution / this.game.calendar.ticksPerDay;
			html += "<br> To next level " + this.game.toDisplaySeconds(toNextLevel.toFixed());
		}

		return html;
	},


	gatherCatnip: function(){
		this.game.gatherClicks = (this.game.gatherClicks || 0) + 1;
		var res = this.game.resPool.get("catnip");
		var fields = this.get("field").val || 0;
		var cult = this.game.cultivation;
		var stIdx = cult ? Math.max(0, cult.getHighestStageIndex()) : 0;
		//首击恒得 5 株灵草(与新手教程及单测对齐);后续连点或辟田破境后随道行渐涨
		if (res.value === 0 && fields === 0 && stIdx === 0 && this.game.gatherClicks <= 1){
			res.value += 5;
			return;
		}
		var gain = 5 + Math.min(6, Math.floor(fields * 0.5)) + Math.min(8, stIdx * 2);
		this.game.resPool.addResEvent("catnip", gain);
		//山野采药偶触发微末机缘:伴生灵木或(已引气入体后)吐纳顿悟
		if (cult && this.game.gatherClicks > 1){
			var roll = Math.random();
			if (roll < 0.08){
				this.game.resPool.addResEvent("wood", 1);
				this.game.msg($I("buildings.gatherCatnip.boon.wood"), "notice");
			} else if (roll < 0.22 && (!cult.isMortal || !cult.isMortal())){
				var xw = 1 + Math.floor(stIdx * 0.25);
				this.game.resPool.addResEvent("xiuwei", xw);
				this.game.msg($I("buildings.gatherCatnip.boon.xiuwei", [xw]), "notice");
			}
		}
	},

	refineCatnip: function() {
		var craftRatio = this.game.getResCraftRatio("wood");
		var actualAmtGained = this.game.resPool.addResEvent("wood", 1 + craftRatio);

		//Add an undo event:
		var isEnriched = this.game.workshop.get("advancedRefinement").researched;
		var undo = this.game.registerUndoChange();
		undo.addEvent(this.game.workshop.id, { //This is a crafting event, so its undo should be with the crafting manager
			metaId: "wood",
			resGainedAmt: actualAmtGained,
			resSpent: [ { name : "catnip", val: (isEnriched ? 50 : 100) }]
		}, $I("ui.undo.workshop.craft", [this.game.getDisplayValueExt(actualAmtGained), this.game.resPool.get("wood").title]));
	},

	getUndissipatedPollutionPerTick: function(){
		return this.game.getEffect("cathPollutionPerTickProd") * this.getPollutionRatio() + this.game.getEffect("cathPollutionPerTickCon");
	},
	cacheCathPollutionPerTick: function(){
		//Avoid NaN errors if cathPollution is infinite by setting dissipation to 0
		var dissipation = isFinite(this.cathPollution) ? this.cathPollution * this.pollutionEffects["pollutionDissipationRatio"] : 0;
		this.cathPollutionPerTick = this.getUndissipatedPollutionPerTick() - dissipation;
	},
	getEquilibriumPollution: function(){ //returns pollution value at which pollutionDissipationRatio will make pollutionPerTick equal to 0, or -1 if such value doesn't exits
		if (this.pollutionEffects["pollutionDissipationRatio"]){
			return this.getUndissipatedPollutionPerTick() / this.pollutionEffects["pollutionDissipationRatio"];
		} else if (this.cathPollutionPerTick < 0) {
			return 0;
		} else if (this.cathPollutionPerTick == 0) {
			return this.cathPollution;
		} else if (this.cathPollutionPerTick > 0) {
			return Number.POSITIVE_INFINITY;
		} else {
			console.log("No equilibrium found");
			return -1;
		}
	},
	cathPollutionFastForward: function(ticks, simplified){
		if (simplified || !this.pollutionEffects["pollutionDissipationRatio"]) {
			this.cathPollution += this.cathPollutionPerTick * ticks;
		}
		else {
			/*t = time in ticks, p = pollution, UPPT — undissipated pollution per tick, pdr — pollution dissipation ratio
			solved differential equation:
				p(t = 0) = this.cathPollution
				d(p)/dt = UPPT + pdr * p
			*/
			var pdr = - this.pollutionEffects["pollutionDissipationRatio"];
			var expon = Math.exp(pdr * ticks);
			var uppt = this.getUndissipatedPollutionPerTick();
			this.cathPollution = Math.max(((this.cathPollution * pdr + uppt) * expon - uppt) / pdr, 0);
		}
	},
	gflopsFastForward: function(ticks) {
		var aiCore = this.get("aiCore");
		aiCore.gflops = (aiCore.gflops || 0) + 0.02 * aiCore.on * ticks;
	},
	
	fastforward: function(daysOffset) {
		var game = this.game;

		this.cacheCathPollutionPerTick();
		this.cathPollutionFastForward(daysOffset * game.calendar.ticksPerDay);

		if (game.opts.enableRedshiftGflops){
			this.gflopsFastForward(daysOffset * game.calendar.ticksPerDay);
		}

		var steamworks = this.get("steamworks");
		if (steamworks.on < 1 || !game.workshop.get("factoryAutomation").researched) {
			return;
		}

		if (steamworks.isAutomationEnabled == null) {
			steamworks.isAutomationEnabled = true;
		}

		var wood = game.resPool.get("wood");
		var minerals = game.resPool.get("minerals");

		if (wood.maxValue == 0 || minerals.maxValue == 0) {
			// Hack to prevent factory automation from starting
			// when the page is first loaded, before caps are
			return;
		}

		var baseAutomationRate = 0.02;
		// Cap automation at 90% of resource cap to prevent trying to craft more than you have
		var automationRate = Math.min(baseAutomationRate * (steamworks.on + 1), 0.9);

		var automationDelay = this.game.calendar.daysPerSeason * this.game.calendar.seasonsPerYear / (this.game.workshop.get("advancedAutomation").researched ? 2 : 1);
		var numberOfAutomations = Math.floor(daysOffset / automationDelay);

		function newCrafter(consumedResource, craftedResourceName, isAllowed) {
			var consumableQuantity = consumedResource.value;
			var consumableQuantityThreshold = consumedResource.maxValue * (1 - baseAutomationRate);
			var price = game.workshop.getCraft(craftedResourceName).prices[0].val;

			var numberOfCrafts = 0;
			var numberOfCraftsForCurrentAutomation = 0;
			var remainingAutomations = numberOfAutomations;
			while (isAllowed && remainingAutomations-- > 0 && consumableQuantity >= consumableQuantityThreshold
					&& (numberOfCraftsForCurrentAutomation = Math.floor(Math.min(consumableQuantity, consumedResource.maxValue) * automationRate / price)) > 0) {
				numberOfCrafts += numberOfCraftsForCurrentAutomation;
				consumableQuantity -= numberOfCraftsForCurrentAutomation * price;
			}

			return {
				numberOfCrafts: numberOfCrafts,
				craft: function() {
					if (this.numberOfCrafts > 0) {
						game.workshop.craft(craftedResourceName, this.numberOfCrafts);
					}
				}
			};
		}

		var beamCrafter = newCrafter(wood, "beam", true);
		var slabCrafter = newCrafter(minerals, "slab", true);

		if (beamCrafter.numberOfCrafts == 0 && slabCrafter.numberOfCrafts == 0) {
			return;
		}

		//Jam until next year
		steamworks.jammed = true;

		if (!steamworks.isAutomationEnabled) {
			return;
		}

		slabCrafter.craft();
		beamCrafter.craft();
	},

	undo: function(data){
		var metaId = data.metaId,
		amt = data.val;

		var bldMetaRaw = this.get(metaId),
			bld = new classes.BuildingMeta(bldMetaRaw).getMeta();

		//This is probably the most up-to-date and problemless way to manage building models due to the layers and layers
		//and layes	of legacy abstractions. I am not happy with it, but c'est la vie.
		if (data.action == "build"){
			var props = {
				key:            bld.name,
				name:           bld.label,
				description:    bld.description,
				building:       bld.name
			};
			if (typeof(bld.stages) == "object"){
				props.controller = new classes.ui.btn.StagingBldBtnController(this.game);
			} else {
				props.controller = new classes.ui.btn.BuildingBtnModernController(this.game);
			}
			var model = props.controller.fetchModel(props);
			model.refundPercentage = 1.0;	//full refund for undo

			//Whoever came with reverse amt notation was probably high. (Was it me?)
			props.controller.sellInternal(model, model.metadata.val - amt, false /*requireSellLink*/);

		} else if (data.action == "sell"){
			//I spent too long trying to understand why Bloodrizer did it the way she did.
			//The meat of the function requires 2 things: the controller & the model.
			var props = { //We need these props for later when we get the model.
				key:            bld.name,
				name:           bld.label,
				description:    bld.description,
				building:       bld.name
			};
			if (typeof(bld.stages) == "object"){ //Be sure to get the proper type of controller for the building we're working with
				props.controller = new classes.ui.btn.StagingBldBtnController(this.game);
			} else {
				props.controller = new classes.ui.btn.BuildingBtnModernController(this.game);
			}
			var model = props.controller.fetchModel(props); //We need the model to actually change the data of the building

			//The meat of the function: un-sell the buildings.
			//Since buildings are sold for a 50% refund, we need to un-refund everything
			for (var i = 0; i < amt; i += 1) {
				props.controller.incrementValue(model);
				props.controller.payPriceForUndoRefund(model);
			}
			this.game.render();
		} else if (data.action == "deltagrade"){ //Generic term for upgrading/downgrading
			bldMetaRaw.stage = Math.max(0, bldMetaRaw.stage - amt);
			this.game.time.queue.onDeltagrade(bld.name);

			//Update because it changed when we changed stages
			bld = new classes.BuildingMeta(bldMetaRaw).getMeta();
		}

		this.game.upgrade({ buildings: [bld.name]});
		this.game.upgrade(bld.upgrades);
		this.game.render();
	}/*,

	refund: function(bldId, amt, refundPercentage){
		refundPercentage = refundPercentage || 0.5;

	}*/
});

dojo.declare("classes.game.ui.GatherCatnipButtonController", com.nuclearunicorn.game.ui.ButtonModernController, {
	buyItem: function(model, event){
		var self = this;
		clearTimeout(this.game.gatherTimeoutHandler);
		this.game.gatherTimeoutHandler = setTimeout(function(){ self.game.gatherClicks = 0; }, 2500);	//2.5 sec

		this.game.bld.gatherCatnip();
		if (this.game.gatherClicks >= 2500 && !this.game.ironWill){
			this.game.gatherClicks = 0;
			this.game.cheatMode = true;
		}

		return {
			itemBought: true,
			reason: "item-is-free" /*It costs no resources to gather catnip, so we can't fail to buy it*/
		};
	}
});

dojo.declare("classes.game.ui.RefineCatnipButtonController", com.nuclearunicorn.game.ui.ButtonModernController, {
	fetchModel: function(options) {
		var model = this.inherited("fetchModel", arguments);
	    var self = this;
		var catnipVal = this.game.resPool.get("catnip").value;
		var catnipCost = model.prices[0].val;
		model.x100Link = {
			title: "x100",
			visible: catnipVal >= (catnipCost * 100),
			handler: function(btn){
				self.handleX100Click(model);
			}
		};
		return model;
	},

	handleX100Click: function(model) {
		var catnipVal = this.game.resPool.get("catnip").value;
		var catnipCost = model.prices[0].val;

		if (catnipVal < 100 * catnipCost) {
			this.game.msg($I("craft.msg.notEnoughCatnip"));
			return;
		}

		this.game.resPool.addResEvent("catnip", -100 * catnipCost);

		var craftRatio = this.game.getResCraftRatio("wood");
		var craftAmt = 100 * (1 + craftRatio);
		var actualAmtGained = this.game.resPool.addResEvent("wood", craftAmt);
		var undo = this.game.registerUndoChange();
		var priceTimes100 = [];
		model.prices.forEach(function(priceLine) {
			priceTimes100.push({ name: priceLine.name, val: priceLine.val * 100 });
		});
		undo.addEvent(this.game.workshop.id, { //This is a crafting event, so its undo should be with the crafting manager
			metaId: "wood",
			resGainedAmt: actualAmtGained,
			resSpent: priceTimes100
		}, $I("ui.undo.workshop.craft", [this.game.getDisplayValueExt(actualAmtGained), this.game.resPool.get("wood").title]));
	}
});

dojo.declare("classes.game.ui.RefineCatnipButton", com.nuclearunicorn.game.ui.ButtonModern, {
	x100Href: null,

	update: function(){
		this.inherited(arguments);
	    // -------------- x100 ----------------

		if (!this.x100Href){
			this.x100Href = this.addLink(this.model.x100Link);
		} else {
			dojo.style(this.x100Href.link, "display", !this.model.x100Link.visible ? "none" : "");
		}

	}

});

dojo.declare("classes.ui.btn.BuildingBtnModernController", com.nuclearunicorn.game.ui.BuildingStackableBtnController, {
    getMetadata: function(model){
		model.metaAccessor = this.game.bld.getBuildingExt(model.options.building);
		
		if (!model.metaAccessor){
			console.warn("Unable to get building metadata, invalid id or options:", model.options.building);
			return null;
		}

		//let's not mess with meta accessor, it is a pain to deal with it
		var meta = model.metaAccessor.getMeta(),
			bld = this.game.bld.get(model.options.building);

		meta.unlockable = bld.unlockable;
		meta.unlocked = bld.unlocked;

		meta.on = bld.on;
		meta.val = bld.val || bld.on;

		//TODO: this becomes problematic

		return meta;
    },

    getName: function(model) {
		var meta = model.metadata;

		var name = this.inherited("getName", arguments);

		if (meta.almostLimited){
			name = "* " + name + " *";
		}
		if (this.game && this.game.cultivation && meta && meta.name){
			var cult = this.game.cultivation;
			var gate = cult.getItemRealmGate("building", meta.name);
			if (gate && !cult.isItemRealmUnlocked("building", meta.name)){
				name += " <span class=\"xxRealmGateBadge locked\">🔒 " + gate.title + "</span>";
			}
		}
		return name;
	},

	updateEnabled: function(model){
		this.inherited(arguments);
		if (this.game && this.game.cultivation && !this.game.devMode && model && model.metadata && model.metadata.name){
			if (!this.game.cultivation.isItemRealmUnlocked("building", model.metadata.name)){
				model.enabled = false;
			}
		}
	},

	updateVisible: function(model){
		this.inherited(arguments);
		if (this.game && this.game.cultivation && model && model.metadata && model.metadata.name){
			var cult = this.game.cultivation;
			var gate = cult.getItemRealmGate("building", model.metadata.name);
			var curIdx = cult.getCurrentRealmIndex();
			var val = model.metadata.val || 0;
			if (!gate.isCore && val <= 0){
				model.visible = false;
				return;
			}
			if (gate.realmIdx > curIdx + 1 && val <= 0){
				model.visible = false;
				return;
			}
			if (gate.realmIdx === curIdx + 1 && gate.isCore){
				model.visible = true;
			}
		}
	},

	getPrices: function(model){
		var prices = this.game.bld.getPricesWithAccessor(model.metaAccessor);
		return prices;
	},

	hasSellLink: function(model){
		return !this.game.opts.hideSell;
	},

    build: function(model, opts){
		var counter = this.inherited("build", arguments);
		if (!counter) {
			return; //Skip stats & undo if nothing was built
		}

		//update stats
		this.game.stats.getStat("buildingsConstructed").val += counter;
		this.game.telemetry.logEvent("building",
			{name: model.options.building, val: counter}
		);
		var undo = this.game.registerUndoChange();
		undo.addEvent(this.game.bld.id, {
			action: "build",
			metaId: model.options.building,
			val: counter
		}, $I("ui.undo.bld.build", [counter, model.metadata.label]));
	},

	sell: function(event, model){
		var amtSold = this.inherited("sell", arguments);

		if (amtSold > 0) {
			var undo = this.game.registerUndoChange();
			undo.addEvent(this.game.bld.id, {
				action: "sell",
				metaId: model.metadata.name,
				val: amtSold
			}, $I("ui.undo.bld.sell", [amtSold, model.metadata.label]));
		}
	},

    decrementValue: function(model) {
    	this.inherited(arguments);
    	model.metaAccessor.set("val", model.metadata.val);
    	model.metaAccessor.set("on", model.metadata.on);
	},

	incrementValue: function(model) {
		this.inherited(arguments);
    	model.metaAccessor.set("val", model.metadata.val);
    	model.metaAccessor.set("on", model.metadata.on);
	}
});


//-------------------    special stagable bld exclusive button ------------------------------------------------

dojo.declare("classes.ui.btn.StagingBldBtnController", classes.ui.btn.BuildingBtnModernController, {
	stageLinks: null,

	constructor: function(){

	},

	fetchModel: function(options) {
		var model = this.inherited("fetchModel", arguments);
		model.stageLinks = this.getStageLinks(model);
		if (typeof(model.metadata.isAutomationEnabled) == "boolean" || 
			(model.metadata.stages && typeof(model.metaAccessor.meta.isAutomationEnabled) == "boolean") //stage hack
		) {
			var isEnabled = model.metaAccessor.meta.isAutomationEnabled;
			var self = this;
			model.toggleAutomationLink = {
				title: isEnabled ? "A" : "*",
				tooltip: isEnabled ? $I("btn.aon.tooltip") : $I("btn.aoff.tooltip"),
				//reserved for mobile
				//if you remove it one more time I will find where you live
				enabled: model.metadata.val > 0,
				cssClass: isEnabled ? "auto-on" : "auto-off",
				handler: function(btn){
					self.handleToggleAutomationLinkClick(model);
				}
			};
		}


		return model;
	},

	/**
	 * Checks to see if the next higher stage for this building is unlocked.
	 * If we are at the highest stage already, returns false.
	 */
	getIsNextStageUnlocked: function(model) {
		return model.metadata.stage < model.metadata.stages.length - 1 &&
			model.metadata.stages[model.metadata.stage + 1].stageUnlocked;
	},

	getEffects: function(model){
		var effects = model.metadata.effects;
		var currentStage = model.metadata.stages[model.metadata.stage];
		if (currentStage && currentStage.effects){
			effects = currentStage.effects;
		}
		return effects;
	},

	getTotalEffects: function(model){
		return this.getMetadataRaw(model).totalEffectsCached;
	},

	getStageLinks: function(model){
		var self = this;
		var stageLinks = [];
		var stages = model.metadata.stages;
		var stage = model.metadata.stage || 0;

		var downgradeHandler = function(){
			self.downgrade(model);
		};
		var upgradeHandler = function(){
			self.upgrade(model);
		};
		for (var i = 1; i < stages.length; i++){
			if (i <= stage){
				//downgrade
				if (!this.game.opts.hideDowngrade) {
					stageLinks.push( {title: "v", handler: downgradeHandler, enabled: true});
				}
			} else {
				//upgrade
				if (!stages[i].stageUnlocked){
					continue;
				}
				stageLinks.push( {title: "^", handler: upgradeHandler, enabled: true});
			} //if
		}

		return stageLinks;
	},

	getName: function(model) {
		var formattedName = this.inherited(arguments);
		if (this.getIsNextStageUnlocked(model)) {
			formattedName = $I("common.upgrade.available") + formattedName;
		}
		return formattedName;
	},

	getDescription: function(model){
		var description = model.metadata.stages ? model.metaAccessor.meta.stages[model.metaAccessor.meta.stage].description : model.metadata.description;
		if (typeof(description) === "undefined") {
			description = "";
		}
		if (this.getIsNextStageUnlocked(model)) {
			var nextStageLabel = model.metadata.stages[model.metadata.stage + 1].label;
			description = "<div class=\"upgrade-available\">" + $I("buildings.upgrade.desc.available", [nextStageLabel]) + "</div>" + description;
		}
		return description;
	},

	handleToggleAutomationLinkClick: function(model) {
		var building = model.metadata;
		building.isAutomationEnabled = !building.isAutomationEnabled;
		model.metaAccessor.meta.isAutomationEnabled = building.isAutomationEnabled; //stage hack
		this.game.upgrade({buildings: [building.name]});
	},


	downgrade: function(model) {
		if (model.metaAccessor.meta.val == 0 || this.game.opts.noConfirm) {
			this.deltagrade(model, -1);
		} else {
			var self = this;
			var confirmMsg = $I("buildings.downgrade.confirmation.msg") + "\n\n" +
				$I("buildings.deltagrade.refund.msg", [this.game.toDisplayPercentage(model.refundPercentage) + "%"]);
			this.game.ui.confirm("", confirmMsg, function() {
				self.deltagrade.apply(self, [model, -1]);
			});
		}
	},

	upgrade: function(model) {
		if (model.metaAccessor.meta.val == 0 || this.game.opts.noConfirm) {
			this.deltagrade(model, +1);
		} else {
			var self = this;
			var confirmMsg = $I("buildings.upgrade.confirmation.msg") + "\n\n" +
				$I("buildings.deltagrade.refund.msg", [this.game.toDisplayPercentage(model.refundPercentage) + "%"]);
			this.game.ui.confirm("", confirmMsg, function() {
				self.deltagrade.apply(self, [model, +1]);
			});
		}
	},

	/**
	 * Upgrade or downgrade building 
	 * @param {*} model 
	 * @param {*} delta 
	 */
	deltagrade: function(model, delta) {
		var metadataRaw = this.getMetadataRaw(model);
		var undo = this.game.registerUndoChange();
		var labelBefore = metadataRaw.stages[metadataRaw.stage].label;
		var labelAfter = metadataRaw.stages[Math.max(0, metadataRaw.stage + delta)].label;
		undo.addEvent(this.game.bld.id, {
			action:"deltagrade",
			metaId: model.options.building,
			val: delta
		}, (delta > 0 ?
			$I("ui.undo.bld.upgrade", [labelBefore, labelAfter]) :
			$I("ui.undo.bld.downgrade", [labelBefore, labelAfter])));

		if (metadataRaw.val > 0) { //Sell until 0 are left (to refund to the player)
			undo.addEvent(this.game.bld.id, { //The order of these undo events matters A LOT
				action:"sell",
				metaId: model.options.building,
				val: metadataRaw.val
			}, $I("ui.undo.bld.sell", [metadataRaw.val, labelBefore]));
			this.sellInternal(model, 0, false /*requireSellLink*/);
		}
		if (metadataRaw.stage) { metadataRaw.stage = Math.max(0, metadataRaw.stage + delta); }
		else { metadataRaw.stage = Math.max(0, delta); }

		metadataRaw.val = 0;	//TODO: fix by using separate value flags
		metadataRaw.on = 0;
		if (metadataRaw.calculateEffects){
			metadataRaw.calculateEffects(metadataRaw, this.game);
		}
		this.game.time.queue.onDeltagrade(model.options.building);

		this.game.upgrade(metadataRaw.upgrades);
		this.game.render();
	},

	getMetadataRaw: function(model) {
		return this.game.bld.get(model.metadata.name);
	}
});

dojo.declare("classes.ui.btn.StagingBldBtn", com.nuclearunicorn.game.ui.BuildingStackableBtn, {
	stageLinks: null,

	constructor: function(){
		this.stageLinks = [];
	},

	renderLinks: function(){
		this.inherited(arguments);

		for (var i = 0; i < this.model.stageLinks.length; i++){
			var linkModel = this.model.stageLinks[i];
			this.stageLinks.push(this.addLink(linkModel));
		}
	},
});

dojo.declare("com.nuclearunicorn.game.ui.tab.BuildingsModern", com.nuclearunicorn.game.ui.tab, {

	bldGroups: null,

	activeGroup: null,

	//Filters pulling their buildings from every group instead of just their own, see getBuildingGroups
	aggregateGroups: ["all", "available", "allEnabled", "togglable", "iw"],

	constructor: function(tabName){
		this.bldGroups = [];
	},

	render: function(content){
		this.bldGroups = [];

		var topContainer = dojo.create("div", {
			className: "bldTopContainer"
		}, content);

		var groups = this.game.bld.getBuildingGroups(true /*includeNonGroupFilters*/);

		this.activeGroup = groups[0].name;
		for (var i = 0; i < groups.length; i++){
			this.bldGroups.push({
				group: groups[i],
				visible: false,
				tab: null,
				separator: null
			});
		}

		var groupContainer = dojo.create("div", { className: "bldGroupContainer"}, topContainer);
		this.groupContainer = groupContainer;

		this.renderActiveGroup(groupContainer);

		this.update();
	},

	update: function(){
		this.inherited(arguments);
	},

	isAggregateGroup: function(){
		return this.aggregateGroups.indexOf(this.activeGroup) != -1;
	},

	renderActiveGroup: function(groupContainer){

		dojo.empty(groupContainer);
		this.children = [];

		this.twoRows = true;
		this.initRenderer(groupContainer);

		var isAggregate = this.isAggregateGroup();
		if (isAggregate){
			this.addCoreBtns(groupContainer);
		}

		var groups = [];
		for (var i = 0; i < this.bldGroups.length; i++){
			var group = this.bldGroups[i].group;
			if (!isAggregate && group.name != this.activeGroup){
				continue;
			}
			if (this.activeGroup == "iw" && group.name == "population"){
				continue;	//no kittens to house under Iron Will
			}
			groups.push(group);
		}

		//Unroll the groups to their leaf buildings
		var buildings = this.game.bld.unrollBuildingGroups(groups);

		for (var i = 0; i < buildings.length; i++){
			var bld = this.game.bld.getBuildingExt(buildings[i]).getMeta();

			var btn = null;
			if (typeof(bld.stages) == "object"){
				btn = new classes.ui.btn.StagingBldBtn({
					name: 			bld.label,
					description: 	bld.description,
					building: 		bld.name,
					type:           "buildings",
					twoRow:			this.twoRows,
					controller: new classes.ui.btn.StagingBldBtnController(this.game)
				}, this.game);
			} else {
				btn = new com.nuclearunicorn.game.ui.BuildingStackableBtn({
					name: 			bld.label,
					description: 	bld.description,
					building: 		bld.name,
					type:           "buildings",
					twoRow:			this.twoRows,
					controller: new classes.ui.btn.BuildingBtnModernController(this.game)
				}, this.game);
			}
			var mdl = btn.controller.fetchModel(btn.opts);

			if (this.activeGroup == "available") {
				if (mdl.resourceIsLimited) {
					continue;
				}
			}
			if (this.activeGroup == "allEnabled"){

				if (!mdl.enabled){
					continue;
				}
			}
			if (this.activeGroup == "togglable"){
				if (!mdl.togglable){
					continue;
				}
			}

			btn.update();
			if (!mdl.visible){
				continue;	//skip invisible buttons to not make gaps in the two rows renderer
			}

			this.addChild(btn);
		}

		for (var i = 0; i < this.children.length; i++){
			var buttonContainer = this.twoRows ?
						this.getElementContainer(i) : groupContainer;
			this.children[i].render(buttonContainer);
		}
	},

	addCoreBtns: function(container){

		var btn = new com.nuclearunicorn.game.ui.ButtonModern({
			name:	 $I("buildings.gatherCatnip.label"),
			controller: new classes.game.ui.GatherCatnipButtonController(this.game),
			description: $I("buildings.gatherCatnip.desc"),
			twoRow: this.twoRows
		}, this.game);
		this.addChild(btn);

		var isEnriched = btn.game.workshop.get("advancedRefinement").researched;
		var self = this;
		var btn = new classes.game.ui.RefineCatnipButton({
			name: 		$I("buildings.refineCatnip.label"),
			controller: new classes.game.ui.RefineCatnipButtonController(this.game),
			handler: 	function(btn){
				self.game.bld.refineCatnip();
			},
			description: $I("buildings.refineCatnip.desc"),
			prices: [ { name : "catnip", val: (isEnriched ? 50 : 100) }],
			twoRow: this.twoRows
		}, this.game);
		this.addChild(btn);
	}
});
