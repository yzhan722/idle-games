/**
 * Behold the bringer of light!
 */
dojo.declare("classes.managers.ReligionManager", com.nuclearunicorn.core.TabManager, {

	game: null,
	//your TT level!
	transcendenceTier: 0,

	//an amount of faith temporarily moved to a praised pool (aka worship)
	faith: 0,

	//an amount of converted faith obtained through the faith reset (aka eupyphany)
	faithRatio : 0,

	//Progress to generating the next necrocorn.
	//Will usually be a float value between 0 & 1.
	//Whenever this reaches 1, poof! 1 alicorn will be converted into 1 necrocorn.
	corruption: 0,
	//Array where each element is a separate bonus/effect/modifier to necrocorn production
	//Additionally, stores important derived values in easily accessible fields
	corruptionCached: null,

	alicornCounter: 0,

	//the amount of currently active HG buildings (typically refils during reset)
	activeHolyGenocide: 0,

	//Other game systems interact with unicorn sacrificing.
	//Rather than creating & destroying a controller every tick, let's just keep around one controller.
	unicornSacController: null,

	constructor: function(game){
		this.game = game;
		this.registerMeta(/*"stackable"*/false, this.zigguratUpgrades, {
			getEffect : function(bld, effect){
				if (bld.name == "blackPyramid") {
					return (bld.effects) ? bld.effects[effect] * bld.getEffectiveValue(game) : 0;
				}
				return (bld.effects) ? bld.effects[effect] * bld.on : 0;
			}
		});
		this.registerMeta("stackable", this.religionUpgrades, null);
		this.registerMeta(/*"stackable"*/false, this.transcendenceUpgrades, {
			getEffect: function(bld, effectName){
				var effectValue = bld.effects[effectName] || 0;
				if (bld.name == "holyGenocide"){
					if (effectName == "activeHG") { //This one doesn't stack at all.
						return game.religion.activeHolyGenocide;
					}
					return effectValue * game.religion.activeHolyGenocide;
				}
				return effectValue * bld.on;
			}
		});
		this.setEffectsCachedExisting();

		//Other game systems will want to interact with unicorn sacrifice, so let's ensure that
		// there is always a controller initialized for other systems to borrow when needed.
		this.unicornSacController = new classes.ui.religion.TransformBtnController(game, {
			gainMultiplier: function() {
				return this.game.bld.get("ziggurat").on;
			},
			gainedResource: "tears",
			applyAtGain: function(priceCount) {
				this.game.stats.getStat("unicornsSacrificed").val += priceCount;
			},
			overcapMsgID: "religion.sacrificeBtn.sacrifice.msg.overcap",
			logTextID: "religion.sacrificeBtn.sacrifice.msg",
			logfilterID: "unicornSacrifice"
		});
	},

	resetState: function(){
		this.faith = 0;
		this.corruption = 0;
		this.corruptionCached = null;
		this.transcendenceTier = 0;
		this.faithRatio = 0;

		for (var i = 0; i < this.zigguratUpgrades.length; i++){
			var zu = this.zigguratUpgrades[i];
			zu.unlocked = zu.defaultUnlocked || false;
			this.resetStateStackable(zu);
		}

		for (i = 0; i < this.religionUpgrades.length; i++){
			var ru = this.religionUpgrades[i];
			this.resetStateStackable(ru);
		}

		for (i = 0; i < this.transcendenceUpgrades.length; i++){
			var tu = this.transcendenceUpgrades[i];
			tu.unlocked = false;
			this.resetStateStackable(tu);
		}
	},

	save: function(saveData){
		saveData.religion = {
			faith: this.faith,
			corruption: this.corruption,
			faithRatio: this.faithRatio,
			transcendenceTier: this.transcendenceTier,
			activeHolyGenocide: this.activeHolyGenocide,

			// Duplicated save, for older versions like mobile
			tcratio: this._getTranscendTotalPrice(this.transcendenceTier),
			zu: this.filterMetadata(this.zigguratUpgrades, ["name", "val", "on", "unlocked"]),
			ru: this.filterMetadata(this.religionUpgrades, ["name", "val", "on"]),
			tu: this.filterMetadata(this.transcendenceUpgrades, ["name", "val", "on", "unlocked"])

		};
	},

	load: function(saveData){
		if (!saveData.religion){
			return;
		}

		var _data = saveData.religion;

		this.faith = _data.faith || 0;
		this.corruption = _data.corruption || 0;
		this.corruptionCached = null; //Recalculate it later.
		this.faithRatio = _data.faithRatio || 0;
		this.transcendenceTier = _data.transcendenceTier || 0;
		this.activeHolyGenocide = _data.activeHolyGenocide || 0;

		// Read old save
		if (this.transcendenceTier == 0 && _data.tcratio > 0) {
			this.transcendenceTier = Math.max(0, Math.round(Math.log(10 * this.game.getUnlimitedDR(_data.tcratio, 0.1))));
		}

		this.loadMetadata(this.zigguratUpgrades, _data.zu, "zigguratUpgrades");
		this.loadMetadata(this.religionUpgrades, _data.ru, "religionUpgrades");
		this.loadMetadata(this.transcendenceUpgrades, _data.tu, "transcendenceUpgrades");
	},
	/**
	 * This function is meant to be called while loading a savefile, AFTER everything has been initialized.
	 * In here, we handle matters which require communication with other systems of the game.
	 * For example: Properly unlock different game features based on permanent religion upgrades
	 */
	afterLoad: function() {
		//Cryptotheology-based unlock conditions
		for (var i = 0; i < this.transcendenceUpgrades.length; i++){
			var tu = this.transcendenceUpgrades[i];
			if (this.transcendenceTier >= tu.tier && (!tu.evaluateLocks || tu.evaluateLocks(this.game))) {
				tu.unlocked = true;
			}
			if (tu.val > 0 && tu.unlocks){
				this.game.unlock(tu.unlocks);
			}
		}
	},
	update: function(){
		if (this.game.resPool.get("faith").value > 0 || this.game.challenges.isActive("atheism") && this.game.bld.get("ziggurat").val > 0){
			//Re-render when the tab first becomes visible (e.g. right after the first priest
			// produces faith) so it appears immediately instead of on the player's next action.
			//Guarded so we only render on the hidden->visible transition, not every tick.
			if (!this.game.religionTab.visible){
				this.game.religionTab.visible = true;
				this.game.render();
			}
		}

		//safe switch for a certain type of pesky bugs with conversion
		if (isNaN(this.faith)){
			this.faith = 0;
		}

		if (this.game.calendar.day >= 0) {
			this.triggerOrderOfTheVoid(1);
		}
	},

	fastforward: function(daysOffset) {
		var times = daysOffset * this.game.calendar.ticksPerDay;
		//safe switch for a certain type of pesky bugs with conversion
		if (isNaN(this.faith)){
			this.faith = 0;
		}
		
		this.triggerOrderOfTheVoid(times);
	},
	// Converts the equivalent of 10 % (improved by Void Resonators) of produced faith, but with only a quarter of apocrypha bonus
	triggerOrderOfTheVoid: function(numberOfTicks) {
		if (this.game.prestige.getPerk("voidOrder").researched) {
			var convertedFaith = numberOfTicks * this.game.calcResourcePerTick("faith") * 0.1 * (1 + this.game.getEffect("voidResonance"));
			this.faith += convertedFaith * (1 + this.getApocryphaBonus() / 4);
		}
	},

	zigguratUpgrades: [{
		name: "unicornTomb",
		label: $I("religion.zu.unicornTomb.label"),
		description: $I("religion.zu.unicornTomb.desc"),
		prices: [{ name: "minerals", val: 500 }, { name: "faith", val: 250 }],
		priceRatio: 1.15,
		effects: {
			"unicornsRatioReligion" : 0.05,
			"faithMax": 0,
			"tearsMax": 0
		},
		calculateEffects: function(self, game) {
			if (game.challenges.isActive("unicornTears")) {
				self.effects["tearsMax"] = 1;
				self.effects["faithMax"] = 0;
			} else {
				self.effects["tearsMax"] = 0;

				var faithMax = 0;
				if (game.challenges.getChallenge("unicornTears").researched) {
					//Challenge reward: max faith based on TT
					var tt = game.religion.transcendenceTier;
					if (tt < 1) { //Have some effect even if never transcended
						faithMax = 5;
					} else if (tt < 100) { //Superlinear growth
						faithMax = 5 + (3 * Math.pow(tt, 1.5));
					} else { //Set a reasonable limit
						faithMax = 3000;
					}
				}
				self.effects["faithMax"] = faithMax * 2 /*subject to balance changes*/;
			}
		},
		unlocked: true,
		defaultUnlocked: true,
		unlocks: {
			"zigguratUpgrades": ["ivoryTower"]
		}
	},{
		name: "ivoryTower",
		label: $I("religion.zu.ivoryTower.label"),
		description: $I("religion.zu.ivoryTower.desc"),
		prices: [{ name: "minerals", val: 25000 }, { name: "faith", val: 1200 }],
		priceRatio: 1.15,
		effects: {
			"unicornsRatioReligion" : 0.1,
			"riftChance" : 0.0005,
			"tearsMax": 0
		},
		calculateEffects: function(self, game) {
			if (game.challenges.isActive("unicornTears")) {
				self.effects["tearsMax"] = 20;
			} else {
				self.effects["tearsMax"] = 0;
			}
		},
		unlocked: false,
		defaultUnlocked: false,
		unlocks: {
			"zigguratUpgrades": ["ivoryCitadel"]
		}
	},{
		name: "ivoryCitadel",
		label: $I("religion.zu.ivoryCitadel.label"),
		description: $I("religion.zu.ivoryCitadel.desc"),
		prices: [{ name: "minerals", val: 50000 }, { name: "faith", val: 3500 }],
		priceRatio: 1.15,
		effects: {
			"unicornsRatioReligion" : 0.25,
			"ivoryMeteorChance" : 0.0005,
			"unicornsMax": 0,
			"tearsMax": 0
		},
		calculateEffects: function(self, game) {
			if (game.challenges.isActive("unicornTears")) {
				self.effects["unicornsMax"] = 2000;
				self.effects["tearsMax"] = 5;
			} else {
				self.effects["unicornsMax"] = 0;
				self.effects["tearsMax"] = 0;
			}
		},
		unlocked: false,
		defaultUnlocked: false,
		unlocks: {
			"zigguratUpgrades": ["skyPalace"]
		}
	},{
		name: "skyPalace",
		label: $I("religion.zu.skyPalace.label"),
		description: $I("religion.zu.skyPalace.desc"),
		prices: [{ name: "minerals", val: 125000 }, { name: "faith", val: 12000 }, { name: "slab", val: 100 }],
		priceRatio: 1.15,
		effects: {
			"goldMaxRatio": 0,
			"unicornsRatioReligion" : 0,
			"alicornChance" : 0,
			"alicornPerTick" : 0,
			"ivoryMeteorRatio" : 0,
			"unicornsMax": 0,
			"tearsMax": 0,
			"alicornMax": 0
		},
		calculateEffects: function(self, game) {
			var effects = {
				"goldMaxRatio": 0.01,
				"unicornsRatioReligion" : 0.5,
				"alicornChance" : 0.0001,
				"alicornPerTick" : 0,
				"ivoryMeteorRatio" : 0.05,
				"unicornsMax": 0,
				"tearsMax": 0,
				"alicornMax": 0
			};
			//Alicornmancy effect: Production starts instantly; no need to wait for first descent.
			var hasAlicornmancy = game.prestige.getPerk("alicornmancy").researched;
			if (hasAlicornmancy || game.resPool.get("alicorn").value > 0) {
				effects["alicornPerTick"] = 0.00002;
			}
			if (game.challenges.isActive("unicornTears")) {
				effects["unicornsMax"] = 50;
				effects["tearsMax"] = 275;
				effects["alicornMax"] = 0.2;
			}
			self.effects = effects;
		},
		unlocked: false,
		defaultUnlocked: false,
		unlocks: {
			"zigguratUpgrades": ["unicornUtopia"]
		}
	},{
		name: "unicornUtopia",
		label: $I("religion.zu.unicornUtopia.label"),
		description: $I("religion.zu.unicornUtopia.desc"),
		prices: [{ name: "gold", val: 500 }, { name: "minerals", val: 1000000 }, { name: "faith", val: 45000 }],
		priceRatio: 1.15,
		effects: {
			"unicornsRatioReligion" : 0,
			"alicornChance" : 0,
			"alicornPerTick" : 0,
			"tcRefineRatio" : 0,
			"ivoryMeteorRatio" : 0,
			"unicornsMax": 0,
			"tearsMax": 0,
			"alicornMax": 0
		},
		calculateEffects: function(self, game) {
			var effects = {
				"unicornsRatioReligion" : 2.5,
				"alicornChance" : 0.00015,
				"alicornPerTick" : 0,
				"tcRefineRatio" : 0.05,
				"ivoryMeteorRatio" : 0.15,
				"unicornsMax": 0,
				"tearsMax": 0,
				"alicornMax": 0
			};
			//Alicornmancy effect: Production starts instantly; no need to wait for first descent.
			var hasAlicornmancy = game.prestige.getPerk("alicornmancy").researched;
			if (hasAlicornmancy || game.resPool.get("alicorn").value > 0) {
				effects["alicornPerTick"] = 0.000025;
			}
			if (game.challenges.isActive("unicornTears")) {
				effects["unicornsMax"] = 5500;
				effects["tearsMax"] = 1800;
				effects["alicornMax"] = 0.6;
			}
			self.effects = effects;
		},
		unlocked: false,
		defaultUnlocked: false,
		unlocks: {
			"zigguratUpgrades": ["sunspire"]
		},
		unlockScheme: {
			name: "unicorn",
			threshold: 1
		}
	},{
		name: "sunspire",
		label: $I("religion.zu.sunspire.label"),

		//TODO: make SSPIRE make something really interesting
		description: $I("religion.zu.sunspire.desc"),
		prices: [{ name: "gold", val: 1250 }, { name: "minerals", val: 750000 }, { name: "faith", val: 120000 }],
		priceRatio: 1.15,
		effects: {
			"unicornsRatioReligion" : 0,
			"alicornChance" : 0,
			"alicornPerTick" : 0,
			"tcRefineRatio": 0,
			"ivoryMeteorRatio" : 0,
			"unicornsMaxRatio": 0,
			"tearsMax": 0,
			"alicornMax": 0
		},
		calculateEffects: function(self, game) {
			var effects = {
				"unicornsRatioReligion" : 5,
				"alicornChance" : 0.0003,
				"alicornPerTick" : 0,
				"tcRefineRatio" : 0.1,
				"ivoryMeteorRatio" : 0.5,
				"unicornsMaxRatio": 0,
				"tearsMax": 0,
				"alicornMax": 0
			};
			//Alicornmancy effect: Production starts instantly; no need to wait for first descent.
			var hasAlicornmancy = game.prestige.getPerk("alicornmancy").researched;
			if (hasAlicornmancy || game.resPool.get("alicorn").value > 0) {
				effects["alicornPerTick"] = 0.00005;
			}
			if (game.challenges.isActive("unicornTears")) {
				effects["unicornsMaxRatio"] = 0.1;
				effects["tearsMax"] = 10000;
				effects["alicornMax"] = 1;
			}
			self.effects = effects;
		},
		unlocked: false,
		defaultUnlocked: false
	},{
		name: "marker",
		label: $I("religion.zu.marker.label"),
		description: $I("religion.zu.marker.desc"),
		prices: [{ name: "unobtainium", val: 2500 }, { name: "spice", val: 50000 }, { name: "relic", val: 15 }, { name: "slab", val: 15000 }],
		priceRatio: 1.15,
		effects: {
			"corruptionRatio" : 0.000001
		},
		calculateEffects: function(self, game) {
			self.effects["corruptionRatio"] = 0.000001 * (1 + game.getEffect("corruptionBoostRatioChallenge")); //LDR specified in challenges.js

			// markers immediately unlock necrocorns, but only in UT challenge
			// (so that the necrocorn tooltip has a countdown to the end of the challenge).
			if (self.val > 0 && game.challenges.isActive("unicornTears")) {
				game.resPool.get("necrocorn").unlocked = true;
			}
		},
		unlocked: false,
		getEffectiveValue: function(game) {
			return this.val * (1 + game.getEffect("corruptionBoostRatioChallenge")); //LDR specified in challenges.js
		},
		flavor: $I("religion.zu.marker.flavor")
	},{
		name: "unicornGraveyard",
		label: $I("religion.zu.unicornGraveyard.label"),
		description: $I("religion.zu.unicornGraveyard.desc"),
		prices: [{ name: "relic", val: 25 }, { name: "slab", val: 20000 }],
		priceRatio: 1.15,
		effects: {
			"cultureMaxRatioBonus" : 0.01,
			"blackLibraryBonus": 0.02
		},
		upgrades: {
			buildings: ["ziggurat"]
		},
		unlocks: {
			"zigguratUpgrades": ["unicornNecropolis"]
		},
		unlocked: false
	},{
		name: "unicornNecropolis",
		label: $I("religion.zu.unicornNecropolis.label"),
		description: $I("religion.zu.unicornNecropolis.desc"),
		prices: [{ name: "relic", val: 60 }, { name: "timeCrystal", val: 10 }, { name: "slab", val: 50000 }],
		priceRatio: 1.15,
		effects: {
			"corruptionBoostRatio" : 0.10
		},
		unlocked: false
	},{
		name: "blackPyramid",
		label: $I("religion.zu.blackPyramid.label"),
		description: $I("religion.zu.blackPyramid.desc"),
		prices: [{ name: "unobtainium", val: 5000 }, { name: "spice", val: 150000 }, { name: "relic", val: 100 }, { name: "slab", val: 50000 }],
		priceRatio: 1.15,
		effects: {
			"pyramidGlobalResourceRatio" : 0,
			"pyramidGlobalProductionRatio" : 0,
			"pyramidFaithRatio" : 0,
			"deficitRecoveryRatio": 0,
			"blackLibraryBonus": 0,
			"pyramidSpaceCompendiumRatio": 0,
			"craftRatio": 0,
			"pyramidPerYearRatio" : 0,
			"timeRatio" : 0
		},
		upgrades: {
			spaceBuilding: ["spaceBeacon"],
			chronoforge: ["temporalImpedance"]
		},
		unlocked: false,
		flavor: $I("religion.zu.blackPyramid.flavor"),
		getEffectiveValue: function(game) {
			return this.val + (game.challenges.getChallenge("blackSky").researched && !game.challenges.isActive("blackSky") ? 1 : 0);
		}
	}],

	religionUpgrades:[{
		name: "solarchant",
		label: $I("religion.ru.solarchant.label"),
		description: $I("religion.ru.solarchant.desc"),
		prices: [
			{ name : "faith", val: 100 }
		],
		faith: 150,	//total faith required to unlock the upgrade
		effects: {
			"faithRatioReligion" : 0.1
		},
		calculateEffects: function(self, game) {
			self.noStackable = (game.religion.getRU("transcendence").on == 0);
		},
		noStackable: true,
		priceRatio: 2.5
	},{
		name: "scholasticism",
		label: $I("religion.ru.scholasticism.label"),
		description: $I("religion.ru.scholasticism.desc"),
		prices: [
			{ name : "faith", val: 250 }
		],
		faith: 300,
		effects: {
			//none
		},
		upgrades: {
			buildings: ["temple", "ziggurat"]
		},
		calculateEffects: function(self, game) {
			self.noStackable = (game.religion.getRU("transcendence").on == 0);
		},
		noStackable: true,
		priceRatio: 2.5,
		flavor: $I("religion.ru.scholasticism.flavor")
	},{
		name: "goldenSpire",
		label: $I("religion.ru.goldenSpire.label"),
		description: $I("religion.ru.goldenSpire.desc"),
		prices: [
			{ name : "gold",  val: 150 },
			{ name : "faith", val: 350 }
		],
		faith: 500,
		effects: {
			//none
		},
		upgrades: {
			buildings: ["temple", "ziggurat"]
		},
		calculateEffects: function(self, game) {
			self.noStackable = (game.religion.getRU("transcendence").on == 0);
		},
		noStackable: true,
		priceRatio: 2.5,
		flavor: $I("religion.ru.goldenSpire.flavor")
	},{
		name: "sunAltar",
		label: $I("religion.ru.sunAltar.label"),
		description: $I("religion.ru.sunAltar.desc"),
		prices: [
			{ name : "gold",  val: 250 },
			{ name : "faith", val: 500 }
		],
		faith: 750,
		effects: {
			//none
		},
		upgrades: {
			buildings: ["temple", "ziggurat"]
		},
		calculateEffects: function(self, game) {
			self.noStackable = (game.religion.getRU("transcendence").on == 0);
		},
		noStackable: true,
		priceRatio: 2.5
	},{
		name: "stainedGlass",
		label: $I("religion.ru.stainedGlass.label"),
		description: $I("religion.ru.stainedGlass.desc"),
		prices: [
			{ name : "gold",  val: 250 },
			{ name : "faith", val: 500 }
		],
		faith: 750,
		effects: {
			//none
		},
		upgrades: {
			buildings: ["temple", "ziggurat"]
		},
		calculateEffects: function(self, game) {
			self.noStackable = (game.religion.getRU("transcendence").on == 0);
		},
		noStackable: true,
		priceRatio: 2.5
	},{
		name: "solarRevolution",
		label: $I("religion.ru.solarRevolution.label"),
		description: $I("religion.ru.solarRevolution.desc"),
		prices: [
			{ name : "gold",  val: 500 },
			{ name : "faith", val: 750 }
		],
		faith: 1000,
		effects: {
			"solarRevolutionRatio": 0
		},
		calculateEffects: function(self, game) {
			self.effects["solarRevolutionRatio"] = game.religion.getSolarRevolutionRatio();
		},
		noStackable: true
	},{
		name: "basilica",
		label: $I("religion.ru.basilica.label"),
		description: $I("religion.ru.basilica.desc"),
		prices: [
			{ name : "gold",  val: 750 },
			{ name : "faith", val: 1250 }
		],
		faith: 10000,
		effects: {
			//none
		},
		upgrades: {
			buildings: ["temple", "ziggurat"]
		},
		calculateEffects: function(self, game) {
			self.noStackable = (game.religion.getRU("transcendence").on == 0);
		},
		noStackable: true,
		priceRatio: 2.5
	},{
		name: "templars",
		label: $I("religion.ru.templars.label"),
		description: $I("religion.ru.templars.desc"),
		prices: [
			{ name : "gold",  val: 3000 },
			{ name : "faith", val: 3500 }
		],
		faith: 75000,
		effects: {
			//none
		},
		upgrades: {
			buildings: ["temple", "ziggurat"]
		},
		calculateEffects: function(self, game) {
			self.noStackable = (game.religion.getRU("transcendence").on == 0);
		},
		noStackable: true,
		priceRatio: 2.5
	},{
		name: "apocripha",
		label: $I("religion.ru.apocripha.label"),
		description: $I("religion.ru.apocripha.desc"),
		prices: [
			{ name : "gold",  val: 5000 },
			{ name : "faith", val: 5000 }
		],
		faith: 100000,
		effects: {
			//none
		},
		noStackable: true
	},{
		name: "transcendence",
		label: $I("religion.ru.transcendence.label"),
		description: $I("religion.ru.transcendence.desc"),
		prices: [
			{ name : "gold",  val: 7500 },
			{ name : "faith", val: 7500 }
		],
		faith: 125000,
		effects: {
			//none
		},
		upgrades: {
			religion: ["solarchant", "scholasticism", "goldenSpire", "sunAltar", "stainedGlass", "basilica", "templars","frescoes"]
		},
		noStackable: true
	},{
		name: "frescoes",
		label: $I("religion.ru.frescoes.label"),
		description: $I("religion.ru.frescoes.desc"),
		prices: [
			{ name: "gold",  val: 5000 },
			{ name: "faith", val: 4000 },
			{ name: "spice", val: 8000 } //Not affected by philosopher trait discount
		],
		faith: 200000,
		calculateEffects: function(self, game) {
			self.noStackable = (game.religion.getRU("transcendence").on == 0);
			self.description = $I("religion.ru.frescoes.desc") + (self.noStackable ? "" : "<br>" + $I("religion.ru.frescoes.desc.stackable"));
			var karma = game.resPool.get("karma").value;
			if (karma < 10) {
				//Add a hint telling the player how to gain some karma:
				self.description += "<br><br><span class=\"genericWarning\">" +
					(karma == 0 ? $I("religion.ru.frescoes.desc.noKarma") : $I("religion.ru.frescoes.desc.lowKarma")) +
					"</span><br>" + $I("religion.ru.frescoes.desc.karmaHint");
			}
		},
		noStackable: true,
		priceRatio: 2.5,
		flavor: $I("religion.ru.frescoes.flavor"),
		upgrades: {
			buildings: ["chapel"]
		}
	}],

	transcendenceUpgrades: [
	{
		name: "blackObelisk",
		label: $I("religion.tu.blackObelisk.label"),
		description: $I("religion.tu.blackObelisk.desc"),
		prices: [
			{ name : "relic", val: 100 }
		],
		tier: 1,
		priceRatio: 1.15,
		effects: {
			"solarRevolutionLimit": 0.05
		},
		calculateEffects: function(self, game) {
			self.effects["solarRevolutionLimit"] = 0.05 * game.religion.transcendenceTier;
		},
		unlocked: false,
		flavor: $I("religion.tu.blackObelisk.flavor")
	},{
		name: "blackNexus",
		label: $I("religion.tu.blackNexus.label"),
		description: $I("religion.tu.blackNexus.desc"),
		prices: [
			{ name : "relic", val: 5000 }
		],
		tier: 3,
		priceRatio: 1.15,
		effects: {
			"relicRefineRatio" : 1.0
		},
		upgrades: {
			spaceBuilding: ["spaceBeacon"]
		},
		unlocked: false,
		flavor: $I("religion.tu.blackNexus.flavor")
	},{
		name: "blackCore",
		label: $I("religion.tu.blackCore.label"),
		description: $I("religion.tu.blackCore.desc"),
		prices: [
			{ name : "relic", val: 10000 }
		],
		tier: 5,
		priceRatio: 1.15,
		effects: {
			"blsLimit" : 1
		},
		unlocked: false,
		flavor: $I("religion.tu.blackCore.flavor")
	},{
		name: "singularity",
		label: $I("religion.tu.singularity.label"),
		description: $I("religion.tu.singularity.desc"),
		prices: [
			{ name : "relic", val: 25000 }
		],
		tier: 7,
		priceRatio: 1.15,
		effects: {
			"globalResourceRatio" : 0.10
		},
		unlocked: false,
		flavor: $I("religion.tu.singularity.flavor")
	},{
		name: "blackLibrary",
		label: $I("religion.tu.blackLibrary.label"),
		description: $I("religion.tu.blackLibrary.desc"),
		prices: [
			{ name : "relic", val: 30000 }
		],
		tier: 9,
		priceRatio: 1.15,
		effects: {
			"compendiaTTBoostRatio" : 0.02
		},
		unlocked: false,
		flavor: $I("religion.tu.blackLibrary.flavor")
	},{
		name: "blackRadiance",
		label: $I("religion.tu.blackRadiance.label"),
		description: $I("religion.tu.blackRadiance.desc"),
		prices: [
			{ name : "relic", val: 37500 }
		],
		tier: 12,
		priceRatio: 1.15,
		effects: {
			"blsCorruptionRatio" : 0.0012
		},
		unlocked: false,
		flavor: $I("religion.tu.blackRadiance.flavor")
	},{
		name: "blazar",
		label: $I("religion.tu.blazar.label"),
		description: $I("religion.tu.blazar.desc"),
		prices: [
			{ name : "relic", val: 50000 }
		],
		tier: 15,
		priceRatio: 1.15,
		effects: {
			//Should at least improve impedance scaling by some value (5%? 10%). Probably something else
			"timeRatio" : 0.10,
			"rrRatio" : 0.02
		},
		upgrades: {
			chronoforge: ["temporalImpedance", "temporalPress"]
		},
		unlocks: {
			chronoforge: ["temporalPress"]
		},
		unlocked: false,
		flavor: $I("religion.tu.blazar.flavor")
	},{
		name: "darkNova",
		label: $I("religion.tu.darkNova.label"),
		description: $I("religion.tu.darkNova.desc"),
		prices: [
			{ name : "relic", val: 75000 },
			{ name : "timeCrystal", val: 100 }
		],
		tier: 20,
		priceRatio: 1.15,
		effects: {
			"energyProductionRatio": 0.02
		},
		unlocked: false,
		flavor: $I("religion.tu.darkNova.flavor")
	},
	{
		name: "holyGenocide",
		label: $I("religion.tu.holyGenocide.label"),
		description: $I("religion.tu.holyGenocide.desc"),
		prices: [
			{ name : "relic", val: 100000 },
			{ name : "timeCrystal", val: 250 }
		],
		tier: 25,
		priceRatio: 1.15,
		effects: {
			"simScalingRatio": 0.02,
			"activeHG": 0
		},
		unlocked: false,
		unlocks: {
			challenges: ["postApocalypse"]
		},
		calculateEffects: function(self, game){
			self.effects["activeHG"] = game.religion.activeHolyGenocide;
		},
		togglable: true,
		flavor: $I("religion.tu.holyGenocide.flavor")
	},
		//Holy Memecide
		//I'm not sure if TT27 is good place yet
	{
		name: "darkParacosm",
		label: $I("religion.tu.darkParacosm.label"),
		description: $I("religion.tu.darkParacosm.desc"),
		prices: [
			{ name : "relic", val: 230000},
			{ name : "timeCrystal", val: 500},
			{ name : "paragon", val: 8, priceRatio: 2}
		],
		priceRules: true,
		tier: 27,
		priceRatio: 1.75,
		effects: {
			"milleninumParagon": 1
		},
		calculateEffects: function(self, game){
			if (!game.getFeatureFlag("DARK_PARACOSM")){
				self.unlocked = false;
			}
		},
		evaluateLocks: function(game){
			return game.getFeatureFlag("DARK_PARACOSM");
		},
		unlocked: false,
		flavor: $I("religion.tu.darkParacosm.flavor")
	},
	],

	getZU: function(name){
		return this.getMeta(name, this.zigguratUpgrades);
	},

	getRU: function(name){
		return this.getMeta(name, this.religionUpgrades);
	},

	getTU: function(name){
		return this.getMeta(name, this.transcendenceUpgrades);
	},
	/**
	 * Checks if the player has unlocked the ability to sacrifice unicorns to gain unicorn tears.
	 * @return boolean
	 */
	getHasUnlockedUnicornSacrifice: function() {
		return this.game.religionTab.visible && this.game.bld.get("ziggurat").on > 0;
	},
	/**
	 * Calculates how many batches of unicorn sacrifice the player can currently afford to do.
	 * @return A nonnegative integer
	 */
	getAvailableUnicornSacrifices: function() {
		var model = { prices: [{ name: "unicorns", val: 2500 }]};
		return this.unicornSacController.getCanAfford(model);
	},
	getSolarRevolutionRatio: function() {
		var uncappedBonus = this.getRU("solarRevolution").on ? this.game.getUnlimitedDR(this.faith, 1000) / 100 : 0;
		return this.game.getLimitedDR(uncappedBonus, 10 + this.game.getEffect("solarRevolutionLimit") + (this.game.challenges.getChallenge("atheism").researched ? (this.game.religion.transcendenceTier) : 0)) * (1 + this.game.getEffect("faithSolarRevolutionBoost")/*(LDR specified in challenges.js)*/);
	},

	getApocryphaBonus: function(){
		return this.game.getUnlimitedDR(this.faithRatio, 0.1) * 0.1;
	},

	/**
	 * Sacrifices as many unicorns as we need to generate the desired quantity of unicorn tears.
	 * If we cannot afford them all, sacrifices the amount we can.
	 * @param tearsToGenerate number
	 */
	sacrificeUnicornsToTarget: function(tearsToGenerate) {
		var model = { prices: [{ name: "unicorns", val: 2500 }]};
		var controller = this.unicornSacController;
		var tearsPerSacrifice = controller.controllerOpts.gainMultiplier.call(this); //Accessing controllerOpts in this way feels a bit hacky
		var numSacrifices = Math.min(Math.ceil(tearsToGenerate / tearsPerSacrifice), controller.getCanAfford(model));
		controller.transformFixed(model, numSacrifices);
	},

	turnHGOff: function(){
		var self = this;
		this.game.ui.confirm("", $I("turnHGOff.confirmation.msg"), function() {
			self.activeHolyGenocide = 0;
			self.getTU("holyGenocide").on = 0;
		});
	},

	praise: function(){
		var faith = this.game.resPool.get("faith");
		var worshipGainedAmt = faith.value * (1 + this.getApocryphaBonus()); //starting up from 100% ratio will work surprisingly bad
		this.faith += worshipGainedAmt;
		this.faith = Math.min(this.faith, Number.MAX_VALUE);
		this.game.msg($I("religion.praise.msg", [this.game.getDisplayValueExt(faith.value, false, false, 0)]), "", "faith");
		//Here we go, trying to make more game actions reversible
		var undo = this.game.registerUndoChange();
		undo.addEvent(this.id, {
			action: "praise",
			faithSpent: faith.value,
			worshipGained: worshipGainedAmt
		}, $I("ui.undo.religion.praise", [this.game.getDisplayValueExt(worshipGainedAmt)]));
		faith.value = 0.0001;	//have a nice autoclicking
	},

	getApocryphaResetBonus: function(bonusRatio){
		//100% Bonus per Transcendence Level
		if (this.getRU("transcendence").on) {
			bonusRatio *= Math.pow((1 + this.transcendenceTier), 2);
		}
		return (this.faith / 100000) * 0.1 * bonusRatio;
	},

	resetFaith: function(bonusRatio, withConfirmation) {
		var worshipBefore = this.faith;
		var epiphanyBefore = this.faithRatio;
		if (withConfirmation && !this.game.opts.noConfirm) {
			var self = this;
			this.game.ui.confirm("", $I("religion.adore.confirmation.msg"), function() {
				self._resetFaithInternal(bonusRatio);
			});
		} else {
			this._resetFaithInternal(bonusRatio);
		}
		var worshipAfter = this.faith;
		var epiphanyAfter = this.faithRatio;

		//Here we go, trying to make more game actions reversible
		var undo = this.game.registerUndoChange();
		undo.addEvent(this.id, {
			action: "adore",
			worshipBefore: worshipBefore,
			epiphanyGained: epiphanyAfter - epiphanyBefore
		}, $I("ui.undo.religion.adore"));
	},

	_resetFaithInternal: function(bonusRatio) {
		var ttPlus1 = (this.game.religion.getRU("transcendence").on ? this.game.religion.transcendenceTier : 0) + 1;
		this.faithRatio += this.faith / 1000000 * ttPlus1 * ttPlus1 * bonusRatio;
		this.faithRatio = Math.min(this.faithRatio, Number.MAX_VALUE);
		this.faith = 0.01;
	},

	transcend: function(){
		var religion = this.game.religion;
		if (!religion.getRU("transcendence").on) {
			return; // :3
		}

		var game = this.game;
		game.ui.confirm($I("religion.transcend.confirmation.title"), $I("religion.transcend.confirmation.msg"), function() {
			//Transcend one Level at a time
			var needNextLevel = religion._getTranscendNextPrice();

			if (religion.faithRatio > needNextLevel) {
				religion.faithRatio -= needNextLevel;
				religion.tcratio += needNextLevel;
				religion.transcendenceTier += 1;

				//In the future, we might add more things that care about Transcendence Tier.
				game.calculateAllEffects();
				game.msg($I("religion.transcend.msg.success", [religion.transcendenceTier]));
			} else {
				game.msg($I("religion.transcend.msg.failure", [
					game.toDisplayPercentage(religion.faithRatio / needNextLevel, 2, true)
				]));
			}
		});
	},

	_getTranscendTotalPrice: function(tier) {
		return this.game.getInverseUnlimitedDR(Math.exp(tier) / 10, 0.1);
	},

	_getTranscendNextPrice: function() {
		return this._getTranscendTotalPrice(this.transcendenceTier + 1) - this._getTranscendTotalPrice(this.transcendenceTier);
	},

	unlockAll: function(){
		for (var i in this.religionUpgrades){
			this.religionUpgrades[i].unlocked = true;
			this.religionUpgrades[i].researched = true;
		}

		for (var i in this.zigguratUpgrades){
			this.zigguratUpgrades[i].unlocked = true;
		}

		for (var i in this.transcendenceUpgrades){
			this.transcendenceUpgrades[i].unlocked = true;
		}

		this.faith = 1000000;
		this.transcendenceTier = 25;

		this.game.msg("All religion upgrades are unlocked!");
	},

	undo: function(data){
		var resPool = this.game.resPool;
		if (data.action == "refine"){
			/*
			  undo.addEvent(this.game.religion.id, {
				action:"refine",
				resFrom: model.prices[0].name,
				resTo: this.controllerOpts.gainedResource,
				valFrom: priceCount,
				valTo: actualGainCount
			*/
			var resConverted = resPool.get(data.resTo);
			/*
				if you still have refined resources, roll them back
				of course the correct way would be to call addResEvent(data.resTo, -data.valTo), 
				find out actual remaining value
				and refund it proportionally, but I am to lazy to code it in 
			*/
			if (resConverted.value >= data.valTo) {
				var actualAmountRecovered = resPool.addResEvent(data.resFrom, data.valFrom);
				resPool.addResEvent(data.resTo, -data.valTo);
				var resRefunded = resPool.get(data.resFrom);
				if (actualAmountRecovered == data.valFrom) {
					//I dunno about this--this message contains no new information that isn't already displayed.
					//this.game.msg($I("religion.undo.refine.complete", [this.game.getDisplayValueExt(actualAmountRecovered), (resRefunded.title || resRefunded.name)]), null, "undo", true /*noBullet*/);
				} else {
					//This would occur, for instance, if the player un-sacrificed unicorns during a Unicorn Tears Challenge.
					this.game.msg($I("religion.undo.refine.incomplete", [this.game.getDisplayValueExt(actualAmountRecovered), (resRefunded.title || resRefunded.name)]), "important", "undo", true /*noBullet*/);
				}
			}
		} else if (data.action === "praise") {
			if (this.faith >= data.worshipGained) {
				this.faith -= data.worshipGained;
				var amtRecovered = resPool.addResEvent("faith", data.faithSpent);
				if (amtRecovered > 0) {
					this.game.msg($I("religion.undo.praise.regained", [this.game.getDisplayValueExt(amtRecovered)]), null, "undo", true /*noBullet*/);
				} else {
					//This would happen, for example, if the player had such high faith production that it was capped already
					this.game.msg($I("religion.undo.praise.nogain"), "important", "undo", true /*noBullet*/);
				}
			} else {
				//This would happen, for example, if the player had adored the galaxy immediately after praising.
				this.game.msg($I("religion.undo.praise.failure"), "alert", "undo", true /*noBullet*/);
			}
		} else if (data.action === "adore") {
			if (this.faithRatio >= data.epiphanyGained) {
				this.faithRatio -= data.epiphanyGained;
				this.faith = data.worshipBefore;
				this.game.msg($I("religion.undo.adore.regained", [this.game.getDisplayValueExt(data.worshipBefore)]), null, "undo", true /*noBullet*/);
			} else {
				//This would happen, for example, if the player had transcended immediately after adoring the galaxy.
				this.game.msg($I("religion.undo.adore.failure"), "alert", "undo", true /*noBullet*/);
			}
		} else if (data.action === "buildZU") {
			//This process requires 2 things: the controller & the model.
			var bld = this.getZU(data.metaId);
			var props = { //Essential for obtaining the model correctly.
				id:            bld.name,
				name:           bld.label,
				description:    bld.description,
				building:       bld.name
			};
			props.controller = new com.nuclearunicorn.game.ui.ZigguratBtnController(this.game);
			var model = props.controller.fetchModel(props); //We need the model to actually change the data of the building
			model.refundPercentage = 1.0;	//full refund for undo
			props.controller.sellInternal(model, model.metadata.val - data.val, false /*requireSellLink*/);
		} else if (data.action === "buildRU") {
			var bld = this.getRU(data.metaId);
			var props = {
				id:            bld.name,
				name:           bld.label,
				description:    bld.description,
				building:       bld.name
			};
			props.controller = new com.nuclearunicorn.game.ui.ReligionBtnController(this.game);
			var model = props.controller.fetchModel(props);
			model.refundPercentage = 1.0;	//full refund for undo
			props.controller.sellInternal(model, model.metadata.val - data.val, false /*requireSellLink*/);
		} else if (data.action === "sellRU") {
			var bld = this.getRU(data.metaId);
			var props = {
				id:            bld.name,
				name:           bld.label,
				description:    bld.description,
				building:       bld.name
			};
			props.controller = new com.nuclearunicorn.game.ui.ReligionBtnController(this.game);
			var model = props.controller.fetchModel(props);

			//The meat of the function: un-sell the buildings.
			//Since buildings are sold for a 50% refund, we need to un-refund everything
			for (var i = 0; i < data.val; i += 1) {
				props.controller.incrementValue(model);
				props.controller.payPriceForUndoRefund(model);
			}
			this.game.render();
		}
		this.game.render();
	}
});

/**
 * A button for ziggurat upgrade
 */
dojo.declare("com.nuclearunicorn.game.ui.ZigguratBtnController", com.nuclearunicorn.game.ui.BuildingStackableBtnController, {
	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.tooltipName = false;
		return result;
	},

	getType: function () {
		return "zigguratUpgrades";
	},

    getMetadata: function(model){
        if (!model.metaCached){
            model.metaCached = this.game.religion.getZU(model.options.id);
        }
        return model.metaCached;
    },

    getName: function(model){
		if (model.metadata.name == "marker" && model.metadata.val > 0){
			var progress = this.game.toDisplayPercentage(this.game.religion.corruption, 0, true);
			return model.metadata.label + " [" + progress + "%] (" + model.metadata.val + ")";
		} else {
			return this.inherited("getName", arguments);
		}
	},

	//zigguratIvoryPriceRatio applies an additive modifier to the price ratio, but only for ivory
	getPrices: function(model) {
		var meta = model.metadata;
		var ratio = meta.priceRatio || 1;
		var ivoryRatio = Math.max(ratio + this.game.getEffect("zigguratIvoryPriceRatio"), 1);
		var prices = [];
		var pricesDiscount = this.game.getLimitedDR((this.game.getEffect(meta.name + "CostReduction")), 1);
		var priceModifier = 1 - pricesDiscount;

		for (var i = 0; i < meta.prices.length; i++){
			var resPriceDiscount = this.game.getEffect(meta.prices[i].name + "CostReduction");
			resPriceDiscount = this.game.getLimitedDR(resPriceDiscount, 1);
			var resPriceModifier = 1 - resPriceDiscount;
			var ratioToUse = ratio;

			prices.push({
				val: meta.prices[i].val * Math.pow(ratioToUse, meta.val) * resPriceModifier * priceModifier,
				name: meta.prices[i].name
			});
		}
		return prices;
	},

	build: function(model, opts) {
		var counter = this.inherited("build", arguments);
		if (!counter) {
			return; //Skip undo if nothing was built
		}
		var undo = this.game.registerUndoChange();
		undo.addEvent(this.game.religion.id, {
			action: "buildZU",
			metaId: model.metadata.name,
			val: counter
		}, $I("ui.undo.bld.build", [counter, model.metadata.label]));
	}
});

/**
 * A button for religion upgrade
 */
dojo.declare("com.nuclearunicorn.game.ui.ReligionBtnController", com.nuclearunicorn.game.ui.BuildingStackableBtnController, {
	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.tooltipName = false;
		return result;
	},

	getType: function () {
		return "religion";
	},

    getMetadata: function(model){
        if (!model.metaCached){
            model.metaCached = this.game.religion.getRU(model.options.id);
        }
        return model.metaCached;
    },

    hasSellLink: function(model){
		return !this.game.opts.hideSell && !model.metadata.noStackable && model.metadata.val > 1;
	},

	getPrices: function(model){
		var defaultPrices = this.inherited("getPrices", arguments);
		for (var i = 0; i < defaultPrices.length; i++) {
			if (defaultPrices[i].name == "faith" || defaultPrices[i].name == "gold") {
				defaultPrices[i].val = defaultPrices[i].val * (1 + this.game.getEffect("religionUpgradesDiscount"));
			}
		}
		return defaultPrices;
	},

	updateVisible: function(model){
		model.visible = model.metadata.on > 0 || this.game.religion.faith >= model.metadata.faith;
	},

	build: function(model, opts) {
		var counter = this.inherited("build", arguments);
		if (!counter) {
			return; //Skip undo if nothing was built
		}
		var undo = this.game.registerUndoChange();
		undo.addEvent(this.game.religion.id, {
			action: "buildRU",
			metaId: model.metadata.name,
			val: counter
		}, $I("ui.undo.bld.build", [counter, model.metadata.label]));
	},

	sell: function(event, model){
		var amtSold = this.inherited("sell", arguments);

		if (amtSold > 0) {
			var undo = this.game.registerUndoChange();
			undo.addEvent(this.game.religion.id, {
				action: "sellRU",
				metaId: model.metadata.name,
				val: amtSold
			}, $I("ui.undo.bld.sell", [amtSold, model.metadata.label]));
		}
	},
});

dojo.declare("classes.ui.TranscendenceBtnController", com.nuclearunicorn.game.ui.BuildingStackableBtnController, {
	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.tooltipName = false;
		return result;
	},

    getMetadata: function(model){
        if (!model.metaCached){
            model.metaCached = this.game.religion.getTU(model.options.id);
        }
        return model.metaCached;
    }
});

dojo.declare("com.nuclearunicorn.game.ui.PraiseBtnController", com.nuclearunicorn.game.ui.ButtonModernController, {
	getName: function(model) {
		if (this.game.religion.faithRatio > 0){
			var progressDisplayed = this.game.getDisplayValueExt(this.game.religion.getApocryphaBonus() * 100, true, false, 3);
			return "<div class=\"label\"><span class=\"label-content\">" + model.options.name + "</span></div><div class=\"progress\">[" + progressDisplayed + "%]</div>";
		} else {
			return model.options.name;
		}
	}
});

dojo.declare("com.nuclearunicorn.game.ui.ResetFaithBtnController", com.nuclearunicorn.game.ui.ButtonModernController, {
	getName: function(model) {
		var ttPlus1 = this.game.religion.transcendenceTier + 1;
		return "<div class=\"label\"><span class=\"label-content\">" + model.options.name + "</span></div>" + 
			(this.game.religion.getRU("transcendence").on ? "<div>[×" + (ttPlus1 * ttPlus1) + "]</div>" : "");
	},

	updateVisible: function (model) {
		model.visible = this.game.religion.getRU("apocripha").on;
	}
});

dojo.declare("com.nuclearunicorn.game.ui.TranscendBtnController", com.nuclearunicorn.game.ui.ButtonModernController, {
	getName: function(model) {
		return model.options.name + (this.game.religion.transcendenceTier > 0 ? " [" + this.game.religion.transcendenceTier + "]" : "");
	},

	updateEnabled: function(model) {
		model.enabled = this.game.religion._getTranscendNextPrice() < Infinity;
		model.highlightUnavailable = this.game.opts.highlightUnavailable;
		model.resourceIsLimited = model.highlightUnavailable && !model.enabled;
	},

	updateVisible: function (model) {
		model.visible = this.game.religion.getRU("transcendence").on;
	}
});

dojo.declare("classes.ui.religion.TransformBtnController", com.nuclearunicorn.game.ui.ButtonModernController, {
	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.hasResourceHover = true;
		result.simplePrices = false;
		return result;
	},

	fetchModel: function(options) {
		var model = this.inherited("fetchModel", arguments);
		model.fifthLink = this._newLink(model, 5);
		model.halfLink = this._newLink(model, 2);
		model.allLink = this._newLink(model, 1);
		return model;
	},

	_newLink: function(model, divider) {
		var transformations = Math.floor(this.getCanAfford(model) / divider);
		var self = this;
		return {
			visible: this.game.opts.showNonApplicableButtons || transformations > 1,
			title: divider == 1
				? $I("religion.sacrificeBtn.all")
				: this.game.opts.usePercentageConsumptionValues
					? (100 / divider) + "%"
					: "x" + this.game.getDisplayValueExt(transformations, null, false, 0),
			tooltip:  divider == 1 || this.game.opts.usePercentageConsumptionValues ? "x" + this.game.getDisplayValueExt(transformations, null, false, 0) : (100 / divider) + "%",
			handler: function(event, callback) {
				self.transform(model, divider, event, callback);
			}
		};
	},

	buyItem: function(model, event) {
		if (!this.hasResources(model)) {
			return {
				itemBought: false,
				reason: "cannot-afford"
			};
		}
		if (!model.enabled) {
			//As far as I can tell, this shouldn't ever happen because being
			//unable to afford it is the only reason for it to be disabled.
			return {
				itemBought: false,
				reason: "not-enabled"
			};
		}
		if (!event) { event = {}; /*event is an optional parameter*/ }
		var batchSize = event.shiftKey ? 10000 :
			event.ctrlKey || event.metaKey ? this.game.opts.batchSize : 1;
		var didWeSucceed = this._transform(model, batchSize);
		if (didWeSucceed) {
			return {
				itemBought: true,
				reason: "paid-for"
			};
		} else {
			//_transform(model, amt) returns false if we can't afford it
			return {
				itemBought: false,
				reason: "cannot-afford"
			};
		}
	},

	/**
	 * Calculates the max number of transformations the player can afford to do.
	 * If the resource has a storage cap (such as during a Unicorn Tears Challenge),
	 * it won't give the option to go farther than 1 transformation above that cap.
	 * @param model	object	The model object which specifies the price we're working with
	 * @return A nonnegative integer
	 */
	getCanAfford: function(model) {
		var spendRes = this.game.resPool.get(model.prices[0].name);
		var gainRes = this.game.resPool.get(this.controllerOpts.gainedResource);
		var amtWeCanAfford = Math.floor(spendRes.value / model.prices[0].val);

		if (gainRes.maxValue && amtWeCanAfford > 1) { //Perform this check only if we can afford 2 or more
			var amtToReachCap = Math.ceil((gainRes.maxValue - gainRes.value) / this.controllerOpts.gainMultiplier.call(this));
			amtWeCanAfford = Math.min(amtWeCanAfford, amtToReachCap);
			//But don't go below 1 so we always give the player the option to sacrifice 1
			amtWeCanAfford = Math.max(1, amtWeCanAfford);
		}
		return amtWeCanAfford;
	},

	/**
	 * Performs one or more transformations of one resource to another, as specified in the model, controllerOpts, etc.
	 * The number of batches of resource that are transformed depends on how many we can afford right now.
	 * @param model	The model object which this controller controls.
	 * @param divider	number > 0	Determines what fraction of available transformations to perform.
	 * 1 = ALL, 2 = one-half of the max we can afford, 5 = one-fifth of the max we can afford, etc.
	 * @param event	object (optional)	Contains information about the event (i.e. user input)
	 * @param callback	function (optional)	This is how we communicate the results to the calling code.
	 * If specified, will be called with the results of what happened.  If not specified, the results are not communicated.
	 */
	transform: function(model, divider, event, callback) {
		this.transformFixed(model, Math.floor(this.getCanAfford(model) / divider), event, callback);
	},

	/**
	 * Performs one or more transformations of one resource to another, as specified in the model, controllerOpts, etc.
	 * Unlike the regular transform function, in this one we specify exactly how many batches we want to transform.
	 * @param model	The model object which this controller controls.
	 * @param amt	number	How many batches to transform.  If less than 1, nothing happens.
	 * Somewhat non-intuitively, the reason (if amt<1) is reported as "cannot-afford".
	 * @param event	object (optional)	Contains information about the event (i.e. user input)
	 * @param callback	function (optional)	This is how we communicate the results to the calling code.
	 * If specified, will be called with the results of what happened.  If not specified, the results are not communicated.
	 */
	transformFixed: function(model, amt, event, callback) {
		if (amt < 1) {
			if (callback) {
				callback(false /*itemBought*/, { reason: "cannot-afford" });
			}
			return;
		}
		var didWeSucceed = this._transform(model, amt);
		if (callback) {
			if (didWeSucceed) {
				callback(true /*itemBought*/, { reason: "paid-for" });
			} else {
				callback(false /*itemBought*/, { reason: "cannot-afford" });
			}
		}
	},

	//This function actually performs the transformation, along with handling all side effects.
	//Returns true if we succeed (& the game-state is affected), false otherwise (& no side effects happen)
	_transform: function(model, amt) {
		//Save references to values we'll use a lot:
		// "res from" refers to the resource consumed by the transform action
		// "res to" refers to the resource produced by the transform action
		var resFromName = model.prices[0].name;
		var resToName = this.controllerOpts.gainedResource;
		var resFromObj = this.game.resPool.get(resFromName); //Reference to the resource object
		var resToObj = this.game.resPool.get(resToName);

		var priceCount = model.prices[0].val * amt;
		if (priceCount > resFromObj.value) {
			return false;
		}

		var attemptedGainCount = this.controllerOpts.gainMultiplier.call(this) * amt;

		this.game.resPool.addResEvent(resFromName, -priceCount);

		//Gain the resource & remember the amount we gained, taking into account resource storage limits:
		var actualGainCount = this.game.resPool.addResEvent(resToName, attemptedGainCount);

		//Amount of the resource we failed to gain because we hit the cap:
		var overcap = attemptedGainCount - actualGainCount;
		if (!resToObj.maxValue) { //Having a falsy maxValue is the game engine's way of saying it's uncapped.
			overcap = 0;
		}
		if (actualGainCount == 0 && attemptedGainCount > 0 &&
			resToObj.value / attemptedGainCount > 1e15) {
			//We are in territory where overcap will be triggered due to floating-point precision limits.
			overcap = 0;
		}

		if (this.controllerOpts.applyAtGain) {
			this.controllerOpts.applyAtGain.call(this, priceCount);
		}

		if (overcap > 0.001) { //Don't trigger from floating-point errors
			var pollutionRate = this.game.getEffect("cathPollutionPerTearOvercapped");
			if (pollutionRate && resToName == "tears") { //Avoid possible Infinity * 0 = NaN
				//Tears evaporate into a smoky substance
				this.game.bld.cathPollution += overcap * pollutionRate;
			}
			//Optional parameter to display a message when we overcap:
			if (typeof(this.controllerOpts.overcapMsgID) === "string") {
				this.game.msg($I(this.controllerOpts.overcapMsgID, [this.game.getDisplayValueExt(overcap)]), "", this.controllerOpts.logfilterID, true /*noBullet*/);
			}
		}

		var descriptiveStrings = [this.game.getDisplayValueExt(priceCount),
			resFromObj.title,
			this.game.getDisplayValueExt(actualGainCount),
			resToObj.title];
		var undo = this.game.registerUndoChange();
		undo.addEvent(this.game.religion.id, {
			action:"refine",
			resFrom: resFromName,
			resTo: resToName,
			valFrom: priceCount,
			valTo: actualGainCount
		}, $I("ui.undo.religion.refine", descriptiveStrings));

		this.game.msg($I(this.controllerOpts.logTextID, [this.game.getDisplayValueExt(priceCount), this.game.getDisplayValueExt(actualGainCount)]), "", this.controllerOpts.logfilterID);

		return true;
	}
});

dojo.declare("classes.ui.religion.MultiLinkBtn", com.nuclearunicorn.game.ui.ButtonModern, {
	renderLinks: function() {
		this.all = this.addLink(this.model.allLink);
		this.half = this.addLink(this.model.halfLink);
		this.fifth = this.addLink(this.model.fifthLink);
	},

	update: function() {
		this.inherited(arguments);
		this.updateLink(this.fifth, this.model.fifthLink);
		this.updateLink(this.half, this.model.halfLink);
		this.updateLink(this.all, this.model.allLink);
	}
});

dojo.declare("classes.ui.CryptotheologyWGT", [mixin.IChildrenAware, mixin.IGameAware], {
	constructor: function(game){
		var self = this;
		var controller = classes.ui.TranscendenceBtnController(game);
		dojo.forEach(game.religion.transcendenceUpgrades, function(tu, i){
			var button = new com.nuclearunicorn.game.ui.BuildingStackableBtn({
				id: 		tu.name,
				name: 		tu.label,
				description: tu.description,
				controller: controller
			}, game);
			self.addChild(button);
		});
	},

	render: function(container){
		var div = dojo.create("div", null, container);
		dojo.create("span", {
			id: "cryptotheologyInfo",
			innerHTML: $I("religion.panel.cryptotheology.info")}, div);
		var btnsContainer = dojo.create("div", null, div);
		this.inherited(arguments, [btnsContainer]);
	},

	update: function(){
		this.inherited(arguments);
	}
});

dojo.declare("classes.ui.CryptotheologyPanel", com.nuclearunicorn.game.ui.Panel, {
	visible: false,
});

dojo.declare("com.nuclearunicorn.game.ui.tab.ReligionTab", com.nuclearunicorn.game.ui.tab, {

	sacrificeBtn : null,
	sacrificeAlicornsBtn: null,

	zgUpgradeButtons: null,
	rUpgradeButtons: null,
	pactUpgradeButtons: null,

	constructor: function(){
		this.zgUpgradeButtons = [];
		this.rUpgradeButtons = [];
		this.pactUpgradeButtons = [];

		var ctPanel = new classes.ui.CryptotheologyPanel($I("religion.panel.cryptotheology.label"));
		ctPanel.game = this.game;

		this.addChild(ctPanel);
		this.ctPanel = ctPanel;

		var wgt = new classes.ui.CryptotheologyWGT(this.game);
		wgt.setGame(this.game);
		ctPanel.addChild(wgt);

	},

	render: function(container) {
		var game = this.game;

		this.zgUpgradeButtons = [];
		this.rUpgradeButtons = [];
		this.pactUpgradeButtons = [];

		var zigguratCount = game.bld.get("ziggurat").on;
		if (zigguratCount > 0){
			var zigguratPanel = new com.nuclearunicorn.game.ui.Panel($I("religion.panel.ziggurat.label"), game.religion);
			var content = zigguratPanel.render(container);

			var sacrificeBtn = new classes.ui.religion.MultiLinkBtn({
				name: $I("religion.sacrificeBtn.label"),
				description: $I("religion.sacrificeBtn.desc"),
				prices: [{ name: "unicorns", val: 2500}],
				controller: game.religion.unicornSacController,
			}, game);
			sacrificeBtn.render(content);
			this.sacrificeBtn = sacrificeBtn;

			var sacrificeAlicornsBtn = classes.ui.religion.MultiLinkBtn({
				name: $I("religion.sacrificeAlicornsBtn.label"),
				description: $I("religion.sacrificeAlicornsBtn.desc"),
				prices: [{ name: "alicorn", val: 25}],
				controller: new classes.ui.religion.TransformBtnController(game, {
					updateVisible: function(model) {
						model.visible = this.hasResources(model) || (this.game.resPool.get("alicorn").value > 0 && this.game.resPool.get("timeCrystal").unlocked);
					},
					gainMultiplier: function() {
						return 1 + this.game.getEffect("tcRefineRatio");
					},
					gainedResource: "timeCrystal",
					applyAtGain: function() {
						this.game.upgrade({
							zigguratUpgrades: ["skyPalace", "unicornUtopia", "sunspire"]
						});
					},
					logTextID: "religion.sacrificeAlicornsBtn.sacrifice.msg",
					logfilterID: "alicornSacrifice"
				})
			}, game);
			sacrificeAlicornsBtn.render(content);
			this.sacrificeAlicornsBtn = sacrificeAlicornsBtn;

			var refineTCBtn = new classes.ui.religion.MultiLinkBtn({
				name: $I("religion.refineTCsBtn.label"),
				description: $I("religion.refineTCsBtn.desc"),
				prices: [{ name: "timeCrystal", val: 25}],
				controller: new classes.ui.religion.TransformBtnController(game, {
					updateVisible: function(model) {
						model.visible = this.hasResources(model);
					},
					gainMultiplier: function() {
						return 1 + this.game.getEffect("relicRefineRatio") * this.game.religion.getZU("blackPyramid").getEffectiveValue(this.game);
					},
					gainedResource: "relic",
					logTextID: "religion.refineTCsBtn.refine.msg",
					logfilterID: "tcRefine"
				})
			}, game);
			refineTCBtn.render(content);
			this.refineTCBtn = refineTCBtn;

			//TODO: all the dark miracles there
			var zigguratController = new com.nuclearunicorn.game.ui.ZigguratBtnController(game);
			var upgrades = game.religion.zigguratUpgrades;
			for (var i = 0; i < upgrades.length; i++){
				var upgr = upgrades[i];

				var button = new com.nuclearunicorn.game.ui.BuildingStackableBtn({
					id: 		upgr.name,
					name: upgr.label,
					description: upgr.description,
					prices: upgr.prices,
					controller: zigguratController,
					handler: upgr.handler
				}, game);

				button.render(content);
				this.zgUpgradeButtons.push(button);
			}
		}	//eo zg upgrades

		if (!game.challenges.isActive("atheism")) {
			//------------------- religion -------------------
			var religionPanel = new com.nuclearunicorn.game.ui.Panel($I("religion.panel.orderOfTheSun.label"), game.religion);
			var content = religionPanel.render(container);

			var faithCount = dojo.create("span", { style: { display: "inline-block", marginBottom: "10px"}}, content);
			this.faithCount = faithCount;

			this.praiseBtn = new com.nuclearunicorn.game.ui.ButtonModern({
				name: $I("religion.praiseBtn.label"),
				description: $I("religion.praiseBtn.desc"),
				controller: new com.nuclearunicorn.game.ui.PraiseBtnController(game),
				handler: function() {
					game.religion.praise();	//sigh, enjoy your automation scripts
				}
			}, game);

			this.adoreBtn = new com.nuclearunicorn.game.ui.ButtonModern({
				name: $I("religion.adoreBtn.label"),
				description: $I("religion.adoreBtn.desc"),
				controller: new com.nuclearunicorn.game.ui.ResetFaithBtnController(game),
				handler: function(btn) {
					game.religion.resetFaith(1.01, true);
				}
			}, game);

			this.transcendBtn = new com.nuclearunicorn.game.ui.ButtonModern({
				name: $I("religion.transcendBtn.label"),
				description: $I("religion.transcendBtn.desc"),
				controller: new com.nuclearunicorn.game.ui.TranscendBtnController(game),
				handler: function(btn) {
					game.religion.transcend();
					var transcendenceLevel = game.religion.transcendenceTier;
					for (var i = 0; i < game.religion.transcendenceUpgrades.length; i++) {
						var check = (!game.religion.transcendenceUpgrades[i].evaluateLocks || game.religion.transcendenceUpgrades[i].evaluateLocks(game));
						if (check && transcendenceLevel >= game.religion.transcendenceUpgrades[i].tier) {
							game.religion.transcendenceUpgrades[i].unlocked = true;
						}
					}
				}
			}, game);

			var buttonAssociations = {
				"transcendence": this.transcendBtn
			};

			this.praiseBtn.render(content);
			this.adoreBtn.render(content);

			var controller = new com.nuclearunicorn.game.ui.ReligionBtnController(game);
			var upgrades = game.religion.religionUpgrades;
			for (var i = 0; i < upgrades.length; i++) {
				var upgr = upgrades[i];

				var button = new com.nuclearunicorn.game.ui.BuildingStackableBtn({
					id: upgr.name,
					name: upgr.label,
					description: upgr.description,
					prices: upgr.prices,
					controller: controller,
					handler: function(btn){
						var upgrade = btn.model.metadata;
						if (upgrade.upgrades){
							game.upgrade(upgrade.upgrades);
						}
					}
				}, game);
				button.render(content);
				var associatedButton = buttonAssociations[upgr.name];
				if (associatedButton) {
					associatedButton.render(content);
				}
				this.rUpgradeButtons.push(button);
			}
		}
		this.inherited(arguments);
		this.update();
	},

	update: function(){
		this.inherited(arguments);

		var religion = this.game.religion;

		if (this.sacrificeBtn) {
			this.sacrificeBtn.update();
		}

		if (this.sacrificeAlicornsBtn) {
			this.sacrificeAlicornsBtn.update();
		}

		if (this.refineTCBtn) {
			this.refineTCBtn.update();
		}

		if (!this.game.challenges.isActive("atheism")) {
			if (this.praiseBtn) {
				this.praiseBtn.update();
			}

			var sr = this.game.religion.getRU("solarRevolution");
			sr.calculateEffects(sr, this.game);

			if (this.adoreBtn) {
				this.adoreBtn.update();
			}

			if (this.transcendBtn) {
				this.transcendBtn.update();
			}

			if (religion.faith && this.faithCount){
				this.faithCount.innerHTML = $I("religion.faithCount.pool", [this.game.getDisplayValueExt(religion.faith)]);
			} else {
				this.faithCount.innerHTML = "";
			}

			var bonus = religion.getSolarRevolutionRatio();
			if (bonus != 0) {
				this.faithCount.innerHTML += ( " (+" + this.game.getDisplayValueExt(100 * bonus) + "% " + $I("religion.faithCount.bonus") + ")" );
			}

			dojo.forEach(this.rUpgradeButtons,  function(e, i){ e.update(); });	
		}
		var hasCT = this.game.science.get("cryptotheology").researched && this.game.religion.transcendenceTier > 0;
		this.ctPanel.setVisible(hasCT);

		dojo.forEach(this.zgUpgradeButtons, function(e, i){ e.update(); });
	}

});
