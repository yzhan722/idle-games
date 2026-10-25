/**
 * Diplomacy
 */
dojo.declare("classes.managers.DiplomacyManager", null, {

	game: null,

	defaultGoldCost: 15,
	defaultManpowerCost: 50,
	baseGoldCost: 15,
	baseManpowerCost: 50,

	/**
	 * 坊市定价模型:每个资源的"基础价值" = 参考经济下(各产线约10座)生产1单位所需秒数。
	 * 直产资源按实测速率;转化品按原料链递归折算;事件/传承资源不参与模型(无价)。
	 * 定价规则:卖出总值 ≈ 买入总值 × 1.2~1.5,差额是玩家的转换收益;
	 * 每趟另收 baseGoldCost + baseManpowerCost 的"运力费",是坊市的真实门槛。
	 * 玄蛇族的灵香定价偏高是有意的——灵香仅游历掉落且是酿坊刚需,溢价值得付。
	 */
	resourceValues: {
		catnip: 0.32, wood: 3.9, minerals: 1.6, coal: 16, science: 3.2,
		oil: 9.7, iron: 28, gold: 200, titanium: 7300, uranium: 44000,
		unicorns: 194, culture: 3.9, faith: 39,
		spice: 40, manpower: 10, unobtainium: 29, starchart: 20,
		slab: 400, beam: 680, steel: 4400
	},

	cachedAmbassadorEffects: null, //We need to cache this separately from globalEffectsCached because, I dunno, reasons.  ???  I guess there just are problems with how globalEffectsCached is recalculated, & we want these cached effects to update every tick.

	races: [{
		//灵蜥:灵石 -> 灵木 (800s -> 975s, x1.22)
		name: "lizards",
		title: $I("trade.race.lizards"),
		buys: [
			{name: "minerals", val: 500}
		],
		sells:[
			{name: "wood", value: 250}
		],
		collapsed: false,
		pinned: false
	},{
		//蛟族:灵谷 -> 灵石 (1280s -> 1920s, x1.50)
		name: "sharks",
		title: $I("trade.race.sharks"),
		buys: [
			{name: "catnip", val: 4000}
		],
		sells:[
			{name: "minerals", value: 1200}
		],
		collapsed: false,
		pinned: false
	},{
		//金翅:灵木 -> 金精 (1950s -> 2400s, x1.23)
		name: "griffins",
		title: $I("trade.race.griffins"),
		buys: [
			{name: "wood", val: 500}
		],
		sells:[
			{name: "gold", value: 12}
		],
		collapsed: false,
		pinned: false
	},{
		//玄蛇:灵木 -> 灵石+悟道典籍 (2925s -> 3840s, x1.31)
		name: "nagas",
		title: $I("trade.race.nagas"),
		hidden: true,
		buys: [{ name: "wood", val: 750 }],
		sells:[
			{name: "minerals", value: 1000},
			{name: "science", value: 700}
		],
		collapsed: false,
		pinned: false
	},{
		//云斑驹:悟道典籍 -> 金精+大道香火 (6400s -> 7900s, x1.23)
		name: "zebras",
		hidden: true,
		title: $I("trade.race.zebras"),
		buys: [
			{name: "science", val: 2000}
		],
		sells:[
			{name: "gold", value: 20},
			{name: "faith", value: 100}
		],
		collapsed: false,
		pinned: false
	},{
		//蛛魔:灵石 -> 悟道典籍 (3200s -> 4000s, x1.25)
		name: "spiders",
		hidden: true,
		title: $I("trade.race.spiders"),
		buys: [
			{name: "minerals", val: 2000}
		],
		sells:[
			{name: "science", value: 1250}
		],
		collapsed: false,
		pinned: false
	},{
		//真龙:大道香火 -> 太虚仙金 (9750s -> 13050s, x1.34)
		name: "dragons",
		hidden: true,
		title: $I("trade.race.dragons"),
		buys: [
			{name: "faith", val: 250}
		],
		sells:[{ name: "unobtainium", value: 450 }],
		collapsed: false,
		pinned: false
	},{
		//古魔:太虚仙金 -> 传承级回报(时晶/悲叹/遗宝/泪),不套生产模型
		name: "leviathans",
		hidden: true,
		title: $I("trade.race.leviathans"),
		buys: [
			{name: "unobtainium", val: 2500}
		],
		sells:[
			{name: "timeCrystal", value: 0.25},
			{name: "sorrow", value: 0.2},
			{name: "relic", value: 0.1},
			{name: "temporalFlux", value: 1},
			{name: "tears", value: 800}
		],
		collapsed: false,
		pinned: false
    }],

	constructor: function(game){
		this.game = game;
		this.cachedAmbassadorEffects = {};
	},

	get: function(raceName){
		for ( var i = 0; i < this.races.length; i++){
			if (this.races[i].name == raceName){
				return this.races[i];
			}
		}
		console.error("Failed to get race for id '" + raceName + "'");
		return null;
	},

	getTradeRatio: function() {
		return this.game.getEffect("tradeRatio");
	},

	resetState: function(){
		for (var i = 0; i < this.races.length; i++){
			var race = this.races[i];
			race.unlocked = false;
			race.collapsed = false;
			race.pinned = false;
			race.energy = 0;
			race.duration = 0;
		}
		this.cachedAmbassadorEffects = {};
	},

	save: function(saveData){
		saveData.diplomacy = {
			races: this.game.bld.filterMetadata(this.races, [
				"name", "unlocked", "collapsed", "energy", "duration", "pinned"
			])
		};
		if (this.get("leviathans").autoPinned) {
			saveData.diplomacy.autoPinLeviathans = true;
		}
	},

	load: function(saveData){
		if (saveData.diplomacy) {
			this.game.bld.loadMetadata(this.races, saveData.diplomacy.races, "races");
			this.get("leviathans").autoPinned = saveData.diplomacy.autoPinLeviathans || false;
		}
		this.cachedAmbassadorEffects = {};
	},

	hasUnlockedRaces: function(){
		for (var i = 0; i < this.races.length; i++){
			if (this.races[i].unlocked){
				return true;
			}
		}
		return false;
	},

	/**
	 * Returns true if particular resource can be traded to you by a race
	 */
	isValidTrade: function(sell, race){
		var resName = sell.name;
		return this.game.resPool.get(resName).unlocked || race.name === "leviathans";
	},

	getAmbassadorEffect: function(effectName) {
		return this.cachedAmbassadorEffects[effectName] || 0; //+ this.game.getEffect("zebra" + effectName);
	},

	unlockRandomRace: function(){
		var unmetRaces = [];
		var hasLockedHiddenRaces = false;

		for (var i = 0; i < this.races.length; i++){
			if (!this.races[i].unlocked ){
				if (!this.races[i].hidden){
					unmetRaces.push(this.races[i]);
				} else {
					hasLockedHiddenRaces = true;
				}
			}
		}

		if (!unmetRaces.length && !hasLockedHiddenRaces){
			return null;
		}

		//nagas like highly cultural kittens :3
		var nagas = this.get("nagas");
		if (!nagas.unlocked && (this.game.resPool.get("culture").value >= 1500 || this.game.resPool.get("gold").value >= 150 || (this.game.cultivation && this.game.cultivation.getCurrentRealmIndex() >= 2))){
			nagas.unlocked = true;
			return nagas;
		}

		var zebras = this.get("zebras");
		if (!zebras.unlocked && (this.game.science.get("navigation").researched || this.game.cultivation.getCurrentRealmIndex() >= 2)){
			zebras.unlocked = true;
			this.game.workshop.get("caravanserai").unlocked = true;
			return zebras;
		}

		var spiders = this.get("spiders");
		if (!spiders.unlocked && (this.game.science.get("navigation").researched || this.game.cultivation.getCurrentRealmIndex() >= 2) && this.game.resPool.get("science").maxValue > 10000){
			spiders.unlocked = true;
			return spiders;
		}

		var dragons = this.get("dragons");
		if (!dragons.unlocked && this.game.science.get("nuclearFission").researched){
			dragons.unlocked = true;
			return dragons;
		}

		var raceId = (Math.floor(Math.random() * unmetRaces.length));

		if (unmetRaces[raceId]){	//someone reported a bug there, to be investigated later
			unmetRaces[raceId].unlocked = true;
			return unmetRaces[raceId];
		}
		return null;
	},

	update: function() {
		if (!this.hasUnlockedRaces()) {

			var unlockYear = (this.game.prestige.getPerk("navigationDiplomacy").researched
					&& this.game.science.get("navigation").researched) ?
				0 : this.game.prestige.getPerk("diplomacy").researched ?
				1 : this.game.karmaKittens > 0 ? 5 : 20;

			if (this.game.calendar.year < unlockYear) {
				return;
			}

			var race = this.unlockRandomRace();

			this.game.diplomacyTab.visible = true;
			this.game.render();

			this.game.msg($I("trade.msg.emissary", [race.title]), "notice");
		}
	},

    //------------ IDK, silly gimmickish stuff -----------
    unlockElders : function(){
        var elders = this.get("leviathans");
		if (elders.duration || !this.hasUnlockedRaces()){	//elder visits do not stack, and elders do not like being first
			return;
		}

        elders.unlocked = true;
        // 5 years + 1 year per energy unit
        elders.duration = this.game.calendar.daysPerSeason * this.game.calendar.seasonsPerYear *  (5  + Math.floor(elders.energy));

		if (elders.autoPinned){elders.pinned = true;}

        this.game.msg($I("trade.msg.elders"), "urgent", "elders");
    },

	onNewDay: function() {
        var elders = this.get("leviathans");
        if (elders.duration <= 0  && elders.unlocked){
			elders.unlocked = false;
			elders.pinned = false;
			this.game.msg($I("trade.msg.elders.departed"), "notice", "elders");

			this.game.render();

			return;
		}
        if (elders.duration > 0){
            elders.duration--;
        }
	},

	undo: function(data) {
		if (data.action == "trade") {
			//The player can only undo the trade if they haven't spent any of the resources gained this way.
			//If they cannot return the merchandise, they cannot get a refund.
			var canUndo = true;
			for (var resName in data.resGained) {
				var required = data.resGained[resName];
				var have = this.game.resPool.get(resName).value;
				if (have < required) {
					this.game.msg($I("trade.undo.missing", [this.game.resPool.get(resName).title]), "alert", "undo", true /*noBullet*/);
					canUndo = false;
				}
			}
			if (!canUndo) {
				return;
			}
			//Else, we have determined that it is valid to undo this trade.
			for (var resName in data.resGained) { //Un-gain trade resources
				this.game.resPool.addResEvent(resName, -data.resGained[resName]);
			}
			for (var resName in data.resSpent) { //Un-spend the requirements
				this.game.resPool.addResEvent(resName, data.resSpent[resName]);
			}
		}
	},

	tradeImpl: function(race, totalTradeAmount) {
		if (race.unlocks){
            this.game.unlock(race.unlocks);
		}

		// at most 1 year + 1 season per energy unit
		race.duration = Math.min(race.duration, this.game.calendar.daysPerSeason * (this.game.calendar.seasonsPerYear + Math.floor(race.energy)));

		var tradeVolume = this.getTradeVolume();
		var tradeRatio =
			1
			+ this.game.diplomacy.getTradeRatio()
			+ this.game.challenges.getChallenge("pacifism").getTradeBonusEffect(this.game);
		var raceRatio = 1 + race.energy * 0.02;

		var boughtResources = {};
		for (var i = 0; i < race.sells.length; i++) {
			var sellResource = race.sells[i];
			boughtResources[sellResource.name] = sellResource.value * totalTradeAmount * tradeRatio * raceRatio * tradeVolume;
		}

		//Update Trade Stats
		this.game.stats.getStat("totalTrades").val = Math.min(this.game.stats.getStat("totalTrades").val + totalTradeAmount, Number.MAX_VALUE);
		this.game.stats.getStatCurrent("totalTrades").val += totalTradeAmount;

		var undo = this.game.registerUndoChange();
		var resSpent = { "manpower": this.getManpowerCost() * totalTradeAmount,
			"gold": this.getGoldCost() * totalTradeAmount };
		resSpent[race.buys[0].name] = race.buys[0].val * totalTradeAmount * tradeVolume;
		undo.addEvent(this.id, {
			action: "trade",
			val: totalTradeAmount,
			resSpent: resSpent,
			resGained: boughtResources
		}, $I("ui.undo.diplomacy.trade", [this.game.getDisplayValueExt(totalTradeAmount), race.title]));

		return boughtResources;
	},

	getManpowerCost: function() {
		var manpowerCost = this.baseManpowerCost;
		if (this.game.challenges.isActive("postApocalypse")) {
			manpowerCost *= 1 + this.game.bld.getPollutionLevel();
		}
		return (manpowerCost < 0) ? 0 : manpowerCost;
	},

	getGoldCost: function() {
		var goldCost = this.baseGoldCost;
		if (this.game.challenges.isActive("postApocalypse")) {
			goldCost *= 1 + this.game.bld.getPollutionLevel();
		}
		return (goldCost < 0) ? 0 : goldCost;
	},

	//Trade volume is a multiplier to the race.buys & race.sells arrays.
	//It also affects titanium gained from trading with Zebras.
	//Does not affect special rare resources gained (blueprint, spice).
	//Note that this function returns 1 by default (with no modifiers active), unlike other ratio calculations that return 0 by default.
	getTradeVolume: function() {
		return (1 + this.game.getEffect("tradeVolume")) * (1 + this.getAmbassadorEffect("tradeVolume"));
	},

	trade: function(race){
		this.gainTradeRes(this.tradeImpl(race, 1), 1);
	},

	tradeMultiple: function(race, amt){
		//------------ safety measure ----------------
		if (!this.hasMultipleResources(race, amt)) {
			return;
		}

		//-------------- pay prices ------------------
		var manpowerCost = this.getManpowerCost();
		var goldCost = this.getGoldCost();
		this.game.resPool.addResEvent("manpower", -manpowerCost * amt);
		this.game.resPool.addResEvent("gold", -goldCost * amt);
		this.game.resPool.addResEvent(race.buys[0].name, -race.buys[0].val * amt * this.getTradeVolume());

		//---------- calculate yield -----------------
		this.gainTradeRes(this.tradeImpl(race, amt), amt);
 	},

	hasMultipleResources: function(race, amt){
		return (this.game.resPool.get("gold").value >= this.getGoldCost() * amt &&
			this.game.resPool.get("manpower").value >= this.getManpowerCost() * amt &&
			this.game.resPool.get(race.buys[0].name).value >= race.buys[0].val * amt * this.getTradeVolume());
	},

	tradeAll: function(race){
		var amt = this.getMaxTradeAmt(race);
		if (!amt){ return; }	//家底不足一次贸易——别白跑一趟空商队
		this.tradeMultiple(race, amt);
	},

	/**
	 * Prints a formatted output of a trade results based on a resource map
	 */
	gainTradeRes: function(yieldResTotal, amtTrade){
		if (yieldResTotal) {
			var output = false;
			for (var res in yieldResTotal) {
				var amt = this.game.resPool.addResEvent(res, yieldResTotal[res]);
				if (amt > 0){
					var resPool = this.game.resPool.get(res);
					var name = resPool.title || res;
					var msg = $I("trade.msg.resources", [this.game.getDisplayValueExt(amt), name]);
					var type = null;
					if (res == "titanium" || res == "blueprint" || res == "relic"){
						msg += "!";
						type = "notice";
					}
					this.game.msg(msg, type, "trade", true);
					output = true;
				}
			}

			if (!output){
				this.game.msg($I("trade.msg.trade.empty"), null, "trade", true);
			}
			this.game.msg($I("trade.msg.trade.caravan", [this.game.getDisplayValueExt(amtTrade)]), null, "trade");
		}
	},

	getMaxTradeAmt: function(race){
		var manpowerCost = this.getManpowerCost();
		var goldCost = this.getGoldCost();

		var amt = [
			Math.floor(this.game.resPool.get("gold").value /
				Math.max(goldCost, 1)
			),
			Math.floor(this.game.resPool.get("manpower").value / Math.max(
				manpowerCost, 1)
			),
			Math.floor(this.game.resPool.get(race.buys[0].name).value / (race.buys[0].val * this.getTradeVolume()))
		];

		amt[0] += (goldCost > 0) ? 0 : Number.MAX_VALUE;
		amt[1] += (manpowerCost > 0) ? 0 : Number.MAX_VALUE;

		var min = Number.MAX_VALUE;
		for (var i = 0; i < amt.length; i++){
			if (min > amt[i]) { min = amt[i]; }
		}

		if (min == Number.MAX_VALUE){
			return 0;
		}
		return min;	//min==0 时返回数字 0,而非 undefined——UI 上 xNaN
	},
	getMarkerCap: function(){
		return Math.floor(
			this.game.religion.getZU("marker").getEffectiveValue(this.game) * 5 + 5
		);
	},
	feedElders: function(amtRequested){
		var ncorns = this.game.resPool.get("necrocorn");
		var elders = this.game.diplomacy.get("leviathans");
		var cleanRequest = Math.max(amtRequested, 1) || 1;
		var amt = Math.floor(Math.min(cleanRequest, ncorns.value));
		if (amt > 0) {
			var efficiency = 1;
			elders.energy += amt * efficiency;

			var markerCap = this.game.diplomacy.getMarkerCap();

			if (elders.energy > markerCap){
				elders.energy = markerCap;
			}

			if (this.game.getFeatureFlag("UNICORN_TEARS_CHALLENGE")) {
				var chall = this.game.challenges.getChallenge("unicornTears");
				if (elders.energy >= chall.leviEnergyToUnlock) {
					chall.unlocked = true;
				}
			}

			ncorns.value -= amt;
			this.game.msg($I("trade.msg.elders.pleased"), "notice");
		} else {
			ncorns.value = 0;
			this.game.msg($I("trade.msg.elders.displeased"), "notice");
			elders.duration = 0;
		}
	},

	buyBcoin: function(){
		var amt = this.game.resPool.get("relic").value / this.game.calendar.getCryptoPrice();
		amt = this.game.resPool.addResEvent("blackcoin", amt);
		this.game.resPool.get("relic").value = 0;
		this.game.msg($I("trade.bcoin.buy.msg", [this.game.getDisplayValueExt(amt)]), "", "blackcoin");

	},

	//isHodl settles the sale at the pre-switch price, see getCryptoPrice
	sellBcoin: function(isHodl){
		var amt = this.game.resPool.get("blackcoin").value * this.game.calendar.getCryptoPrice(isHodl);
		var amt = this.game.resPool.addResEvent("relic", amt);
		this.game.resPool.get("blackcoin").value = 0;
		this.game.msg($I("trade.bcoin.sell.msg", [this.game.getDisplayValueExt(amt)])), "", "blackcoin";
	},

	unlockAll: function(){
		for (var i in this.races){
			this.races[i].unlocked = true;
		}
		this.get("leviathans").duration = 10000;
		this.game.msg("All trade partners are unlocked");
	},
});


dojo.declare("classes.diplomacy.ui.RacePanel", com.nuclearunicorn.game.ui.Panel, {
	tradeBtn: null,

	constructor: function(race) {
		this.race = race;
		this.name = race.title;
	},

	onToggle: function(isToggled){
		this.race.collapsed = isToggled;
	},

	update: function(){
		if (this.tradeBtn){
			this.tradeBtn.update();
		}
		if (this.autoPinnedButton){
			this.autoPinnedButton.update();
		}
	}
});

dojo.declare("classes.diplomacy.ui.EldersPanel", classes.diplomacy.ui.RacePanel, {
	feedBtn: null,

	render: function(container){
		var content = this.inherited("render", arguments);

		var self = this;
		this.feedBtn = new com.nuclearunicorn.game.ui.ButtonModern({
				name: $I("trade.msg.elders.feed"),
				description: $I("trade.msg.elders.feed.desc"),
				controller: new com.nuclearunicorn.game.ui.ButtonModernController(this.game),
				handler: function(){
					var batchSize = event.shiftKey ? 10000 :
						event.ctrlKey || event.metaKey ? this.game.opts.batchSize : 1;
					self.game.diplomacy.feedElders(batchSize);
				}
			}, this.game);
		this.feedBtn.render(content);

		if (this.game.science.get("blackchain").researched || this.game.resPool.get("blackcoin").value > 0) {
			this.buyBcoin = new com.nuclearunicorn.game.ui.ButtonModern({
				name: $I("trade.bcoin.buy"),
				description: $I("trade.bcoin.buy.desc"),
				controller: new com.nuclearunicorn.game.ui.ButtonModernController(this.game),
				handler: function () {
					self.game.diplomacy.buyBcoin();
				}
			}, this.game);
			this.buyBcoin.render(content);

			this.sellBcoin = new com.nuclearunicorn.game.ui.ButtonModern({
				name: $I("trade.bcoin.sell"),
				description: $I("trade.bcoin.sell.desc"),
				controller: new com.nuclearunicorn.game.ui.ButtonModernController(this.game),
				handler: function () {
					self.game.diplomacy.sellBcoin();
				}
			}, this.game);
			this.sellBcoin.render(content);
		}

		if (this.game.science.get("antimatter").researched && this.game.workshop.get("invisibleBlackHand").researched) {
			this.crashBcoin = new com.nuclearunicorn.game.ui.ButtonModern({
				name: $I("trade.bcoin.crash"),
				description: $I("trade.bcoin.crash.desc"),
				controller: new com.nuclearunicorn.game.ui.CrashBcoinButtonController(this.game),
				handler: function () {
					if (self.game.opts.noConfirm) {
						self.game.calendar.correctCryptoPrice();
					} else {
						//Ask the player for confirmation.
						//The confirmation pop-up should change based on the game-state so that it always shows relevant info.
						var numBcoins = self.game.resPool.get("blackcoin").value;
						var confirmMsg = numBcoins > 0 ? $I("trade.bcoin.crash.confirmation.msg", [ self.game.getDisplayValueExt(numBcoins)]) : $I("trade.bcoin.crash.confirmation.msg.alt");
						var tcPrice = self.crashBcoin.model.prices[0].val;
						if (tcPrice >= 0.01 * self.game.resPool.get("timeCrystal").value) {
							//Price is greater than 1% of player's TC stash
							confirmMsg += "\n" + $I("trade.bcoin.crash.confirmation.tcCost");
						}
						self.game.ui.confirm($I("trade.bcoin.crash.confirmation.title"), confirmMsg, function() {
							self.game.calendar.correctCryptoPrice();
						});
					}
				}
			}, this.game);
			this.crashBcoin.render(content);
		}

		return content;
	},

	update: function() {
		this.inherited(arguments);
		if (this.feedBtn) {
			this.feedBtn.update();
		}
		if (this.crashBcoin) {
			this.crashBcoin.update();
		}
	}
});

dojo.declare("com.nuclearunicorn.game.ui.CrashBcoinButtonController", com.nuclearunicorn.game.ui.ButtonModernController, {
	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.hasResourceHover = true;
		result.simplePrices = true;
		return result;
	},

	updateEnabled: function(model) {
		this.inherited(arguments);
		model.enabled &= this.game.calendar.getCryptoPrice() > 550;
	},

	fetchExtendedModel: function(model) {
		model.prices = this.getPrices();
		this.inherited(arguments);
	},

	getPrices: function() {
		// 0.25 TC/trade × 0.98 trade probability / (5000 UO/trade) × 0.007 UO/tick × 1.75 microwarp bonus × 5 ticks/s × 800 s/year
		var tcPerStandardYear = 0.002401 * this.game.space.getBuilding("moonOutpost").val;
		tcPerStandardYear *= 1 + this.game.space.getBuilding("spaceElevator").val * 0.01 + this.game.space.getBuilding("orbitalArray").val * 0.02;
		tcPerStandardYear *= 1 + this.game.bld.get("factory").val * 0.045;
		tcPerStandardYear *= 1.03 + this.game.getEffect("tradeRatio") + this.game.prestige.getBurnedParagonRatio() * 0.03;
		tcPerStandardYear *= 1 + this.game.diplomacy.get("leviathans").energy * 0.02;

		var ticksPerYear = this.game.calendar.ticksPerDay * this.game.calendar.daysPerSeason * this.game.calendar.seasonsPerYear;
		// (1 × 2.4 [Redmoon] + 1 × 0.9 [Charon] + 8 × 1 [others]) / 10
		var tcPerTick_phase0 = 1.13 * tcPerStandardYear / ticksPerYear;
		var tcPerTick_phase1 = (2.4 * tcPerStandardYear - 9) / ticksPerYear;

		var heatPerShatter = this.game.challenges.getChallenge("1000Years").researched ? 5 : 10;
		var tcPerSkip = 1.13 * tcPerStandardYear * this.game.getEffect("shatterTCGain") * (1 + this.game.getEffect("rrRatio"));
		var tcPerShatter = (1 + heatPerShatter / 100) * tcPerSkip - 1;
		var tcPerTick_phase2 = tcPerTick_phase0 + tcPerShatter / heatPerShatter * this.game.getEffect("heatPerTick");

		var tcPerTick = Math.max(tcPerTick_phase0, tcPerTick_phase1, tcPerTick_phase2);
		// 10 ticks/day / (1.2499270834635280e-6 logInc/day), see calendar.js
		var ticksUntilNextNaturalCrash = 8000466.693057134 * Math.log(1100 / this.game.calendar.getCryptoPrice());
		var tcBasePrice = Math.max(256, tcPerTick * ticksUntilNextNaturalCrash) / 8;
		var tcPrice = Math.pow(2, Math.ceil(Math.log(tcBasePrice) * Math.LOG2E));
		return [{name: "timeCrystal", val: tcPrice}];
	}
});

/** -------------------------------------
 * 			Trade Button
----------------------------------------- */

dojo.declare("com.nuclearunicorn.game.ui.TradeButtonController", com.nuclearunicorn.game.ui.ButtonModernController, {
	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.hasResourceHover = true;
		result.simplePrices = false;
		return result;
	}
});

//TODO Extract controller logic for this class
dojo.declare("com.nuclearunicorn.game.ui.TradeButton", com.nuclearunicorn.game.ui.ButtonModern, {

	race: null,

	trade25Href: null,
	trade100Href: null,
	tradeAllHref: null,

	constructor: function(opts, game){
		this.race = opts.race;

		this.handler = this.trade;	//weird hack
	},

	afterRender: function(){
		this.inherited(arguments);
		dojo.addClass(this.domNode, "trade");
	},

	renderLinks: function(){
		this.tradeAllHref = this.addLink({
			title: $I("btn.all.minor"),
			handler: function() {
				this.game.diplomacy.tradeAll(this.race);
			}
		});

		this.pinHref = this.addLink({
			title: "&#9733;",
			handler: function() {
				this.race.pinned = !this.race.pinned;
			}
		});

		// 50% template
		this.tradeHalfHref = this.addLink({title: "", handler: ""});

		//20% template
		this.tradeFifthHref = this.addLink({title: "", handler: ""});
	},

	update: function(){
		this.inherited(arguments);

		this.pinHref.link.textContent = this.race.pinned ? "[v]" : "[ ]"; dojo.style(this.pinHref.link, "display", "none");
		this.pinHref.link.title = this.race.pinned ?
			$I("trade.pin.pinned") : $I("trade.pin.unpinned");

		var tradeMax = this.game.diplomacy.getMaxTradeAmt(this.race);

		// Change button content
		this.tradeAllHref.link.title = "x" + this.game.getDisplayValueExt(tradeMax, null, false, 0);

		// Update tradeHalfHref Link
		var tradeHalf = Math.floor(tradeMax / 2);
		// Change button content
		this.tradeHalfHref.link.textContent = this.game.opts.usePercentageConsumptionValues ? "50%" : "x" + this.game.getDisplayValueExt(tradeHalf, null, false, 0);
		this.tradeHalfHref.link.title = this.game.opts.usePercentageConsumptionValues ? "x" + this.game.getDisplayValueExt(tradeHalf, null, false, 0) : "50%";
		// Change handler
		dojo.disconnect(this.tradeHalfHref.linkHandler);
		this.tradeHalfHref.linkHandler = dojo.connect(this.tradeHalfHref.link, "onclick", this, dojo.partial(function(event){
			event.stopPropagation();
			event.preventDefault();

			dojo.hitch(this,
				function(){
					this.game.diplomacy.tradeMultiple(this.race, tradeHalf);
				}
			, event)();

			this.update();
		}));
		// Change display
		dojo.style(this.tradeHalfHref.link, "display", this.game.opts.showNonApplicableButtons || this.game.diplomacy.hasMultipleResources(this.race, 50) ? "" : "none");

		// Update tradeFifthHref Link
		var tradeFifth = Math.floor(tradeMax / 5);
		// Change button content
		this.tradeFifthHref.link.textContent = this.game.opts.usePercentageConsumptionValues ? "20%" : "x" + this.game.getDisplayValueExt(tradeFifth, null, false, 0);
		this.tradeFifthHref.link.title = this.game.opts.usePercentageConsumptionValues ? "x" + this.game.getDisplayValueExt(tradeFifth, null, false, 0) : "20%";
		// Change handler
		dojo.disconnect(this.tradeFifthHref.linkHandler);
		this.tradeFifthHref.linkHandler = dojo.connect(this.tradeFifthHref.link, "onclick", this, dojo.partial(function(event){
			event.stopPropagation();
			event.preventDefault();

			dojo.hitch(this,
				function(){
					this.game.diplomacy.tradeMultiple(this.race, tradeFifth);
				}
			, event)();

			this.update();
		}));
		// Change display
		dojo.style(this.tradeFifthHref.link, "display", this.game.opts.showNonApplicableButtons || this.game.diplomacy.hasMultipleResources(this.race, 25) ? "" : "none");

	}
});

/** -------------------------------------
 * 			Auto Pinned Button
----------------------------------------- */

dojo.declare("classes.diplomacy.ui.autoPinnedButtonController", com.nuclearunicorn.game.ui.ButtonModernController, {
	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.hasResourceHover = false;
		result.simplePrices = false;
		return result;
	},

	getName: function(model){
		var isAutoPinned = model.options.race.autoPinned;
		return isAutoPinned ? $I("trade.autopinned.labelOn") : $I("trade.autopinned.labelOff");
	},

	hasSellLink: function(model){
		return false;
	},

	updateVisible: function(model){
		model.visible = true;
	}
});


dojo.declare("classes.diplomacy.ui.autoPinnedButton", com.nuclearunicorn.game.ui.ButtonModern, {
	pinLinkHref: null,
	race: null,

	constructor: function(opts, game){
		this.race = opts.race;
	},


	renderLinks: function(){
		this.pinLinkHref = this.addLink({
			title: "&#9733;",
			handler: function() {
				if (this.race.name != "leviathans"){
					return;
				}
				this.race.pinned = !this.race.pinned;
			}
		});
	},

	update: function(){
		this.inherited(arguments);
		this.pinLinkHref.link.textContent = this.race.pinned ? "[v]" : "[ ]";
		this.pinLinkHref.link.title = this.race.pinned ?
			$I("trade.pin.pinned") : $I("trade.pin.unpinned");
	}
});

/** -------------------------------------
 * 			Explore Button
----------------------------------------- */

dojo.declare("classes.trade.ui.SendExplorersButtonController", com.nuclearunicorn.game.ui.ButtonModernController, {
	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.hasResourceHover = true;
		result.simplePrices = false;
		return result;
	},

	clickHandler: function(model, event){
		var dip = this.game.diplomacy;
		var race = dip.unlockRandomRace();

		if (race){
			this.game.msg($I("trade.new.civ"), "notice");
		} else {

			var hint = "";
			if (!dip.get("nagas").unlocked){
				hint = $I("trade.new.hint.nagas");
			} else if (!dip.get("zebras").unlocked){
				hint = $I("trade.new.hint.zebras");
			} else if (!dip.get("spiders").unlocked){
				hint = $I("trade.new.hint.spiders");
			} else if (!dip.get("dragons").unlocked){
				hint =  $I("trade.new.hint.dragons");
			} else {
				hint = $I("trade.new.hint.end");	//AHAHA NO
			}

			this.game.msg($I("trade.new.failure", [hint]));
			this.game.resPool.addResEvent("gold", 45);
		}
		this.game.render();
	}
});

dojo.declare("classes.trade.ui.SendExplorersButton", com.nuclearunicorn.game.ui.ButtonModern, {

	afterRender: function(){
		this.inherited(arguments);

		dojo.addClass(this.domNode, "explore");
	}
});

//==================================================================================
//									DIPLOMACY
//==================================================================================

dojo.declare("com.nuclearunicorn.game.ui.tab.Diplomacy", com.nuclearunicorn.game.ui.tab, {

	racePanels: null,
	leviathansInfo: null,
	tradeRatioSpan: null,
	sharkMerchantsSpan: null,

	constructor: function(tabName, game){
		this.game = game;

		this.racePanels = [];
	},

	render: function(tabContainer){
		this.inherited(arguments);


		this.buttons = [];

		/*
		 * Once race panel is rendered, we will save the panels states.
		 *
		 * However races can be unlocked in random order, so after a new race appears
		 * we will clear array and reinitialise it again
		 */

		var races = [];
		for (var i = 0; i < this.game.diplomacy.races.length; i++){
			var race = this.game.diplomacy.races[i];
			if (race.unlocked){
				races.push(race);
			}
		}
		if (this.racePanels.length != races.length){
			this.racePanels = [];
		}

		var self = this;

		//Display current trade bonus (tradeposts + Pacifism Challenge reward)
		var div = dojo.create("div", { class: "expandAllBar", style: { float: "left"}}, tabContainer);
		this.tradeRatioSpan = dojo.create("span", { innerHTML: $I("trade.effectiveness", [this.game.getDisplayValueExt((this.game.diplomacy.getTradeRatio() + this.game.challenges.getChallenge("pacifism").getTradeBonusEffect(this.game))* 100, false, false, 0)]) }, div);

		// expand all / collapse all panels

		var expandDiv = dojo.create("div", { class: "expandAllBar" }, tabContainer);



		var expandAll = dojo.create("a", { innerHTML: $I("common.expand.all"), href: "#" }, expandDiv);
		dojo.create("span", { innerHTML: " | " }, expandDiv );
		var collapseAll = dojo.create("a", { innerHTML: $I("common.collapse.all"), href: "#" }, expandDiv);

		dojo.create("div", { class: "clear"}, tabContainer);

		var baseTradeRatio = 1 + this.game.diplomacy.getTradeRatio();
		var tradeVolume = this.game.diplomacy.getTradeVolume();
		for (var i = 0; i < races.length; i++) {
			var race = races[i];
			if (!race.unlocked) {
				continue;
			}
			var tradeRatio = baseTradeRatio + this.game.challenges.getChallenge("pacifism").getTradeBonusEffect(this.game);
			var racePanel = this.racePanels[i];
			if (!racePanel) {
				racePanel = race.name === "leviathans" ? new classes.diplomacy.ui.EldersPanel(race) : new classes.diplomacy.ui.RacePanel(race);
				racePanel.setGame(this.game);
				this.racePanels.push(racePanel);
			}
			var content = racePanel.render(tabContainer);
			dojo.addClass(content, "trade-race");

			//---------- render stuff there -------------

			var leftColumn = dojo.create("div", {}, content);
			var rightColumn = dojo.create("div",{}, content);
			var clear = dojo.create("div",{}, content);
			dojo.addClass(leftColumn, "left");
			dojo.addClass(rightColumn, "right");
			dojo.addClass(clear, "clear");

			if (racePanel.feedBtn){
				var leviathansInfo = dojo.create("div", {
					innerHTML: ""
				}, leftColumn);
				this.leviathansInfo = leviathansInfo;
				dojo.place(racePanel.feedBtn.domNode, rightColumn, "first");
			}


			var buys = race.buys[0];
			var res = this.game.resPool.get(buys.name);
			dojo.create("div", {
				innerHTML: "<span class='buys'>" + $I("trade.buys") + ": </span>" + (res.title || res.name) + " <span class='tradeAmount'>" + 
				this.game.getDisplayValueExt(buys.val * tradeVolume, false, false, 0) +
				 "</span>"
			}, leftColumn);

			for (var j = 0; j < race.sells.length; j++) {
				var s = race.sells[j];
				if (!this.game.diplomacy.isValidTrade(s, race)) {
					continue;
				}

				var res = this.game.resPool.get(s.name);
				var amount = s.value * tradeRatio * tradeVolume * (1 + race.energy * 0.02);

				var prefix = j == 0 ? "<span class='sells'>" + $I("trade.sells") + ": </span>" : "<span class='sells'></span>";
				dojo.create("div", {
						innerHTML: prefix + (res.title || res.name) + " <span class='tradeAmount'>"
							+ this.game.getDisplayValueExt(amount, false, false, 0) + "</span>"
					}, leftColumn);
			}

			var tradePrices = [{ name: "gold", val: this.game.diplomacy.getGoldCost()}];
			var buys = race.buys;
			for (var boughtItem in buys){
				tradePrices.push({
					name: race.buys[boughtItem].name, val: race.buys[boughtItem].val * tradeVolume,
				});
			}


			var tradeBtn = new com.nuclearunicorn.game.ui.TradeButton({
				name: $I("trade.send.caravan"),
				description: $I("trade.send.caravan.desc"),
				prices: tradePrices,
				race: race,
				controller: new com.nuclearunicorn.game.ui.TradeButtonController(this.game),
				handler: dojo.partial(function(race){
					self.game.diplomacy.trade(race);
				}, race)
			}, this.game);

			tradeBtn.render(rightColumn);	//TODO: attach it to the panel and do a lot of update stuff
			racePanel.tradeBtn = tradeBtn;
			racePanel.race = race;
			racePanel.collapse(race.collapsed);

			//----------------------------------------------------------
			if (race.name == "leviathans") {
				var autoPinnedButton = new classes.diplomacy.ui.autoPinnedButton({
					name: $I("trade.autopinned.labelOff"),
					description: $I("trade.autopinned.desc"),
					race: race,
					controller: new classes.diplomacy.ui.autoPinnedButtonController(this.game),
					handler: dojo.partial(function(race){
						race.autoPinned = !race.autoPinned;
						self.game.ui.render();
					}, race)
					}, this.game);
					racePanel.autoPinnedButton = autoPinnedButton;
					autoPinnedButton.render(rightColumn);
			}

			if (racePanel.buyBcoin && racePanel.sellBcoin) {
				var tradePanel = dojo.create("div", {className:"crypto-trade" /*, style:{display:"none"}*/ }, null);
				dojo.place(tradePanel, rightColumn, "last");

				dojo.place(racePanel.buyBcoin.domNode, tradePanel, "last");
				dojo.place(racePanel.sellBcoin.domNode, tradePanel, "last");
			}

			if (racePanel.crashBcoin) {
				dojo.place(racePanel.crashBcoin.domNode, rightColumn, "last");
			}
		}

		//-----------------	race panels must be created fist -------------
		dojo.connect(collapseAll, "onclick", this, function(){
			for (var i in this.racePanels) {
				this.racePanels[i].collapse(true);
			}
		});
		dojo.connect(expandAll, "onclick", this, function(){
			for (var i in this.racePanels) {
				this.racePanels[i].collapse(false);
			}
		});

		//------------------------------------

		dojo.create("div", { style: {
				marginBottom: "15px"
		} }, tabContainer);

		var exploreBtn = new classes.trade.ui.SendExplorersButton({
			name: $I("trade.send.explorers"),
			description: $I("trade.send.explorers.desc"),
			prices: [{ name: "gold", val: 50}],
			controller: new classes.trade.ui.SendExplorersButtonController(this.game)
		}, this.game);
		exploreBtn.render(tabContainer);
		this.exploreBtn = exploreBtn;

		var clear1 = dojo.create("div",{}, tabContainer);
		dojo.addClass(clear1, "clear");

		this.update();
	},


	update: function(){
		this.inherited(arguments);

		//Update trade ratio & Shark Merchants displays:
		//Woohoo, we now have code duplication, but this is the cleanest way I can think of right now.
		if (this.tradeRatioSpan) {
			this.tradeRatioSpan.textContent = $I("trade.effectiveness", [this.game.getDisplayValueExt((this.game.diplomacy.getTradeRatio() + this.game.challenges.getChallenge("pacifism").getTradeBonusEffect(this.game))* 100, false, false, 0)]);
		}

		for (var i = 0; i < this.racePanels.length; i++){
			this.racePanels[i].update();
		}

		if (this.exploreBtn){
			this.exploreBtn.update();
		}

		if (this.leviathansInfo) {
			var leviathans = this.game.diplomacy.get("leviathans");
			this.leviathansInfo.innerHTML = "";
			//Energy:
			if (leviathans.energy) {
				var markerCap = this.game.diplomacy.getMarkerCap();
				//Display to 1 decimal place, but only if needed.
				//Not triggered by machine-precision floating-point rounding errors.
				//Can be triggered by effects like LDR on "feedEldersEfficiencyRatio" or similar.
				//This is intentional.  (7.0 is NOT the same as 7 when it's actually 6.979166666666668.)
				var isInteger = function(num) { return Math.abs(num - Math.round(num)) < 0.0001; };
				var energyDisp = leviathans.energy.toFixed(isInteger(leviathans.energy) ? 0 : 1);
				var leviathansInfoEnergy = leviathans.energy ? energyDisp + " / " + markerCap : "N/A";
				this.leviathansInfo.innerHTML += $I("trade.leviathans.energy") + leviathansInfoEnergy + "<br />";
			}
			//Time to leave:
			this.leviathansInfo.innerHTML += $I("trade.leviathans.timeToLeave") + this.game.toDisplayDays(leviathans.duration);
			//B-coin price:
			if (this.game.science.get("antimatter").researched){
				var bcoinPrice = this.game.calendar.getCryptoPrice();
				this.leviathansInfo.innerHTML += "<br /> " + $I("trade.bcoin.price") + " <span style='cursor:pointer' title='" + bcoinPrice + "'>" +
					this.game.getDisplayValueExt(bcoinPrice, false, false, 5) + "R</span>";
			}
		}

		this.updateTab();
	},

	updateTab: function() {
		this.tabName = $I("tab.name.trade");
		if (this.game.diplomacy.get("leviathans").unlocked) {
			this.tabName += $I("common.warning");
		}
		if (this.domNode) {
			this.domNode.innerHTML = this.tabName;
		}
	}
});
