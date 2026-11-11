dojo.declare("classes.managers.WorkshopManager", com.nuclearunicorn.core.TabManager, {

	game: null,

	hideResearched: false,

	upgrades:[
		//--------------------- food upgrades ----------------------
		{
		name: "mineralHoes",
		label: $I("workshop.mineralHoes.label"),
		description: $I("workshop.mineralHoes.desc"),
		effects: {
			"catnipRatio" : 0.5
		},
		prices:[
			{ name : "minerals", val: 275 },
			{ name : "science", val: 100 }
		],
		unlocks: {
			upgrades: ["ironHoes"]
		}
	},{
		name: "ironHoes",
		label: $I("workshop.ironHoes.label"),
		description: $I("workshop.ironHoes.desc"),
		effects: {
			"catnipRatio" : 0.3
		},
		prices:[
			{ name : "iron", val: 25 },
			{ name : "science", val: 200 }
		]
	},
	//--------------------- wood upgrades ----------------------
	{
		name: "mineralAxes",
		label: $I("workshop.mineralAxes.label"),
		description: $I("workshop.mineralAxes.desc"),
		effects: {
			"woodRatio" : 0.7
		},
		prices:[
			{ name : "minerals", val: 500 },
			{ name : "science", val: 100 }
		],
		unlocks: {
			upgrades: ["ironAxes"]
		}
	},{
		name: "ironAxes",
		label: $I("workshop.ironAxes.label"),
		description: $I("workshop.ironAxes.desc"),
		effects: {
			"woodRatio" : 0.5
		},
		prices:[
			{ name : "iron", val: 50 },
			{ name : "science", val: 200 }
		]
	},{
		name: "steelAxe",
		label: $I("workshop.steelAxe.label"),
		description: $I("workshop.steelAxe.desc"),
		effects: {
			"woodRatio" : 0.5
		},
		prices:[
			{ name : "science", val: 20000 },
			{ name : "steel", val: 75 }
		]
	},{
		name: "reinforcedSaw",
		label: $I("workshop.reinforcedSaw.label"),
		description: $I("workshop.reinforcedSaw.desc"),
		effects: {
			"lumberMillRatio" : 0.2
		},
		prices:[
			{ name : "iron", val: 1000 },
			{ name : "science", val: 2500 }
		],
		upgrades: {
			buildings: ["lumberMill"]
		}
	},{
		name: "steelSaw",
		label: $I("workshop.steelSaw.label"),
		description: $I("workshop.steelSaw.desc"),
		effects: {
			"lumberMillRatio" : 0.2
		},
		prices:[
			{ name : "science", val: 52000 },
			{ name : "steel", val: 750 }
		],
		upgrades: {
			buildings: ["lumberMill"]
		},
		unlocks: {
			upgrades: ["titaniumSaw"]
		}
	},{
		name: "titaniumSaw",
		label: $I("workshop.titaniumSaw.label"),
		description: $I("workshop.titaniumSaw.desc"),
		effects: {
			"lumberMillRatio" : 0.15
		},
		prices:[
			{ name : "titanium", val: 500 },
			{ name : "science", val: 70000 }
		],
		upgrades: {
			buildings: ["lumberMill"]
		},
		unlocks: {
			upgrades: ["alloySaw"]
		}
	},{
		name: "alloySaw",
		label: $I("workshop.alloySaw.label"),
		description: $I("workshop.alloySaw.desc"),
		effects: {
			"lumberMillRatio" : 0.15
		},
		prices:[
			{ name : "science", val: 85000 },
			{ name : "alloy", val: 75 }
		],
		upgrades: {
			buildings: ["lumberMill"]
		}
	},{
		name: "titaniumAxe",
		label: $I("workshop.titaniumAxe.label"),
		description: $I("workshop.titaniumAxe.desc"),
		effects: {
			"woodRatio" : 0.5
		},
		prices:[
			{ name : "titanium", val: 10 },
			{ name : "science", val: 38000 }
		]
	},{
		name: "alloyAxe",
		label: $I("workshop.alloyAxe.label"),
		description: $I("workshop.alloyAxe.desc"),
		effects: {
			"woodRatio" : 0.5
		},
		prices:[
			{ name : "science", val: 70000 },
			{ name : "alloy", val: 25 }
		]
	},
	//--------------------- unobtainium stuff --------------------------
	{
		name: "unobtainiumAxe",
		label: $I("workshop.unobtainiumAxe.label"),
		description: $I("workshop.unobtainiumAxe.desc"),
		effects: {
			"woodRatio" : 0.5
		},
		prices:[
			{ name : "unobtainium", val: 75 },
			{ name : "science", val: 125000 }
		]
	},
	{
		name: "unobtainiumSaw",
		label: $I("workshop.unobtainiumSaw.label"),
		description: $I("workshop.unobtainiumSaw.desc"),
		effects: {
			"lumberMillRatio" : 0.25
		},
		prices:[
			{ name : "unobtainium", val: 125 },
			{ name : "science", val: 145000 }
		],
		upgrades: {
			buildings: ["lumberMill"]
		}
	},
	//--------------------- storage upgrades ----------------------
	{
		name: "stoneBarns",
		label: $I("workshop.stoneBarns.label"),
		description: $I("workshop.stoneBarns.desc"),
		effects: {
			"barnRatio" : 0.75
		},
		prices:[
			{ name : "wood", val: 1000 },
			{ name : "minerals", val: 750 },
			{ name : "iron", val: 50 },
			{ name : "science", val: 500 }
		],
		upgrades: {
			buildings: ["barn", "warehouse", "harbor"]
		}
	},{
		name: "reinforcedBarns",
		label: $I("workshop.reinforcedBarns.label"),
		description: $I("workshop.reinforcedBarns.desc"),
		effects: {
			"barnRatio" : 0.80
		},
		prices:[
			{ name : "iron", val: 100 },
			{ name : "science", val: 800 },
			{ name : "beam", val: 25 },
			{ name : "slab", val: 10 }
		],
		upgrades: {
			buildings: ["barn", "warehouse", "harbor"]
		},
		unlocks: {
			upgrades: ["titaniumBarns"]
		}
	},{
		name: "reinforcedWarehouses",
		label: $I("workshop.reinforcedWarehouses.label"),
		description: $I("workshop.reinforcedWarehouses.desc"),
		effects: {
			"warehouseRatio" : 0.25
		},
		prices:[{ name: "science", val: 15000 }, { name: "iron", val: 1000 }, { name: "steel", val: 50 }, { name: "beam", val: 200 }],
		upgrades: {
			buildings: ["barn", "warehouse", "harbor", "mint"]
		},
		unlocks: {
			upgrades: ["silos"]
		}
	},{
		name: "titaniumBarns",
		label: $I("workshop.titaniumBarns.label"),
		description: $I("workshop.titaniumBarns.desc"),
		effects: {
			"barnRatio" : 1
		},
		prices:[{ name: "titanium", val: 25 }, { name: "science", val: 60000 }, { name: "steel", val: 200 }, { name: "beam", val: 2000 }],
		upgrades: {
			buildings: ["barn", "warehouse", "harbor"]
		}
	},{
		name: "alloyBarns",
		label: $I("workshop.alloyBarns.label"),
		description: $I("workshop.alloyBarns.desc"),
		effects: {
			"barnRatio" : 1
		},
		prices:[{ name: "science", val: 75000 }, { name: "iron", val: 15000 }, { name: "alloy", val: 20 }],
		upgrades: {
			buildings: ["barn", "warehouse", "harbor"]
		}
	},{
		name: "concreteBarns",
		label: $I("workshop.concreteBarns.label"),
		description: $I("workshop.concreteBarns.desc"),
		effects: {
			"barnRatio" : 0.75
		},
		prices:[{ name: "titanium", val: 2000 }, { name: "science", val: 100000 }, { name: "slab", val: 1350 }],
		upgrades: {
			buildings: ["barn", "warehouse", "harbor"]
		}
	},{
		name: "titaniumWarehouses",
		label: $I("workshop.titaniumWarehouses.label"),
		description: $I("workshop.titaniumWarehouses.desc"),
		effects: {
			"warehouseRatio" : 0.5
		},
		prices:[{ name: "titanium", val: 50 }, { name: "science", val: 70000 }, { name: "steel", val: 500 }, { name: "beam", val: 4000 }],
		upgrades: {
			buildings: ["barn", "warehouse", "harbor", "mint"]
		}
	},{
		name: "alloyWarehouses",
		label: $I("workshop.alloyWarehouses.label"),
		description: $I("workshop.alloyWarehouses.desc"),
		effects: {
			"warehouseRatio" : 0.45
		},
		prices:[
			{ name : "titanium", val: 750 },
			{ name : "science", val: 90000 },
			{ name : "alloy",    val: 50 }
		],
		upgrades: {
			buildings: ["barn", "warehouse", "harbor", "mint"]
		}
	},{
		name: "concreteWarehouses",
		label: $I("workshop.concreteWarehouses.label"),
		description: $I("workshop.concreteWarehouses.desc"),
		effects: {
			"warehouseRatio" : 0.35
		},
		prices:[{ name: "titanium", val: 1250 }, { name: "science", val: 100000 }, { name: "slab", val: 1050 }],
		upgrades: {
			buildings: ["barn", "warehouse", "harbor", "mint"]
		}
	},{
		name: "storageBunkers",
		label: $I("workshop.storageBunkers.label"),
		description: $I("workshop.storageBunkers.desc"),
		effects: {
			"warehouseRatio" : 0.20
		},
		prices:[{ name: "unobtainium", val: 500 }, { name: "science", val: 25000 }, { name: "slab", val: 37500 }],
		upgrades: {
			buildings: ["barn", "warehouse", "harbor", "mint"]
		}
	},
	//==================== accelerators ==============
	{
		name: "energyRifts",
		label: $I("workshop.energyRifts.label"),
		description: $I("workshop.energyRifts.desc"),
		effects: {
		},
		prices:[
			{ name : "titanium", val: 7500 },
			{ name : "uranium", val: 250 },
			{ name : "science", val: 200000 }
		],
		upgrades: {
			buildings: ["accelerator"]
		},
		unlocks: {
			upgrades: ["stasisChambers", "tachyonAccelerators"]
		}
	},{
		name: "stasisChambers",
		label: $I("workshop.stasisChambers.label"),
		description: $I("workshop.stasisChambers.desc"),
		effects: {
			"acceleratorRatio" : 0.95
		},
		prices:[
			{ name : "uranium", val: 2000 },
			{ name : "science", val: 235000 },
			{ name : "timeCrystal", val: 1 },
			{ name : "alloy", val: 	 200 }
		],
		evaluateLocks: function(game){
			return game.workshop.get("energyRifts").researched && game.science.get("chronophysics").researched;
		},
		upgrades: {
			buildings: ["accelerator"]
		},
		unlocks: {
			upgrades: ["voidEnergy"]
		}
	},{
		name: "voidEnergy",
		label: $I("workshop.voidEnergy.label"),
		description: $I("workshop.voidEnergy.desc"),
		effects: {
			"acceleratorRatio" : 0.75
		},
		prices:[
			{ name : "uranium",     val: 2500 },
			{ name : "science",     val: 275000 },
			{ name : "timeCrystal", val: 2 },
			{ name : "alloy",       val: 250 }
		],
		upgrades: {
			buildings: ["accelerator"]
		},
		unlocks: {
			upgrades: ["darkEnergy"]
		}
	},{
		name: "darkEnergy",
		label: $I("workshop.darkEnergy.label"),
		description: $I("workshop.darkEnergy.desc"),
		effects: {
			"acceleratorRatio" : 2.5	//TODO: ratio is a subject of change
		},
		prices:[
			{ name : "science",     val: 350000 },
			{ name : "timeCrystal", val: 3 },
			{ name : "eludium",       val: 75 }
		],
		upgrades: {
			buildings: ["accelerator"]
		}
	},{
		name: "chronoforge",
		label: $I("workshop.chronoforge.label"),
		description: $I("workshop.chronoforge.desc"),
		prices:[
			{ name : "science",     val: 500000 },
			{ name : "timeCrystal", val: 10 },
			{ name : "relic",     	val: 5 }
		],
		calculateEffects: function(self, game){
			if (self.researched){
				game.time.queue.unlockQueueSource("chronoforge");
			}
		}
	},{
		name: "tachyonModerator",
		label: $I("workshop.tachyonModerator.label"),
		description: $I("workshop.tachyonModerator.desc"),
		flavor: $I("workshop.tachyonModerator.flavor"),
		prices: [{ name: "science", val: 16000 }, { name: "steel", val: 1500 }, { name: "titanium", val: 250 }],
		unlocks: {
			chronoforge: ["controlledDelay"]
		}
	},{
		name: "tachyonAccelerators",
		label: $I("workshop.tachyonAccelerators.label"),
		description: $I("workshop.tachyonAccelerators.desc"),
		effects: {
			"acceleratorRatio" : 5
		},
		prices:[
			{ name : "science",     val: 500000 },
			{ name : "timeCrystal", val: 10 },
			{ name : "eludium",     val: 125 }
		],
		evaluateLocks: function(game){
			return game.workshop.get("energyRifts").researched && game.science.get("tachyonTheory").researched;
		},
		upgrades: {
			buildings: ["accelerator"]
		}
	},{
		name: "fluxCondensator",
		label: $I("workshop.fluxCondensator.label"),
		description: $I("workshop.fluxCondensator.desc"),
		effects: {
		},
		prices:[
			{ name : "unobtainium", val: 5000 },
			{ name : "timeCrystal", val: 5 },
			{ name : "alloy", 	val: 	 250 }
		]
	},{
		name: "lhc",
		label: $I("workshop.lhc.label"),
		description: $I("workshop.lhc.desc"),
		effects: {
		},
		prices:[
			{ name : "unobtainium", val: 100 },
			{ name : "science", val: 250000 },
			{ name : "alloy", val: 150 }
		],
		upgrades: {
			buildings: ["accelerator"]
		}
	},
	//----------- energy stuff ---------
	{
		name: "photovoltaic",
		label: $I("workshop.photovoltaic.label"),
		description: $I("workshop.photovoltaic.desc"),
		prices:[
			{ name : "titanium", val: 5000 },
			{ name : "science", val: 75000 }
		],
		effects: {
			"solarFarmRatio" : 0.5
		},
		upgrades: {
			buildings: ["pasture"]
		}
	},{
		name: "thinFilm",
		label: $I("workshop.thinFilm.label"),
		description: $I("workshop.thinFilm.desc"),
		prices:[
			{ name : "uranium", val: 1000 },
			{ name : "unobtainium", val: 200 },
			{ name : "science", val: 125000 }
		],
		effects: {
			"solarFarmSeasonRatio" : 1
		},
		upgrades: {
			buildings: ["pasture"]
		}
	},{
		name: "qdot",
		label: $I("workshop.qdot.label"),
		description: $I("workshop.qdot.desc"),
		prices:[{ name: "science", val: 175000 }, { name: "eludium", val: 200 }, { name: "uranium", val: 5000 }],
		effects: {
			"solarFarmSeasonRatio" : 1
		},
		upgrades: {
			buildings: ["pasture"]
		}
	},
	{
		name: "solarSatellites",
		label: $I("workshop.solarSatellites.label"),
		description: $I("workshop.solarSatellites.desc"),
		prices:[
			{ name : "science", val: 225000 },
			{ name : "alloy", 	val: 750 }
		],
		upgrades: {
			spaceBuilding: ["sattelite"]
		}
	},
	//	------------- harbour stuff ------------
	{
		name: "cargoShips",
		label: $I("workshop.cargoShips.label"),
		description: $I("workshop.cargoShips.desc"),
		effects: {
			"harborRatio" : 0.01
		},
		prices:[
			{ name : "science", val: 55000 },
			{ name : "blueprint", val: 15 }
		],
		upgrades: {
			buildings: ["harbor"]
		},
		flavor: $I("workshop.cargoShips.flavor")
	},{
		name: "barges",
		label: $I("workshop.barges.label"),
		description: $I("workshop.barges.desc"),
		effects: {
			"harborCoalRatio" : 0.5
		},
		prices:[
			{ name : "titanium", val: 1500 },
			{ name : "science", val: 100000 },
			{ name : "blueprint", val: 30 }
		],
		upgrades: {
			buildings: ["harbor"]
		}
	},{
		name: "reactorVessel",
		label: $I("workshop.reactorVessel.label"),
		description: $I("workshop.reactorVessel.desc"),
		effects: {
			"shipLimit" : 0.05
		},
		prices:[
			{ name : "titanium", val: 5000 },
			{ name : "uranium",  val: 125 },
			{ name : "science", val: 135000 }
		],
		upgrades: {
			buildings: ["harbor"]
		}
	},
	{
		name: "silos",
		label: $I("workshop.silos.label"),
		description: $I("workshop.silos.desc"),
		effects: {
		},
		prices:[
			{ name : "science", val: 50000 },
			{ name : "steel", val: 125 },
			{ name : "blueprint", val: 5 }
		],
		upgrades: {
			buildings: ["barn", "warehouse", "harbor"]
		},
		unlocks: {
			upgrades: ["titaniumWarehouses"]
		},
		flavor: $I("workshop.silos.flavor")
	},{
		name: "refrigeration",
		label: $I("workshop.refrigeration.label"),
		description: $I("workshop.refrigeration.desc"),
		effects: {
			"catnipMaxRatio" : 0.75
		},
		prices:[
			{ name : "titanium", val: 2500 },
			{ name : "science", val: 125000 },
			{ name : "blueprint", val: 15 }
		]
	},
	//--------------------- hunt upgrades ----------------------
	{
		name: "compositeBow",
		label: $I("workshop.compositeBow.label"),
		description: $I("workshop.compositeBow.desc"),
		effects: {
			"manpowerRatio" : 0.5,
			"manpowerMax": 0
		},
		calculateEffects: function(self, game){
			self.effects["manpowerRatio"] = 0.5 * (1 + game.getEffect("weaponEfficency")); //weaponEfficency can't go beyond -1, see challenges.js for more info
			// give a small amount of catpower storage in iron will.
			// together with bolas and huntingArmor, this makes the base catpower
			// max 1000 (when at 0 paragon), which is necessary for unlocking trading
			self.effects["manpowerMax"] = game.ironWill ? 100 : 0;
		},
		prices:[
			{ name : "wood", val: 200 },
			{ name : "iron", val: 100 },
			{ name : "science", val: 500 }
		]
	},{
		name: "crossbow",
		label: $I("workshop.crossbow.label"),
		description: $I("workshop.crossbow.desc"),
		effects: {
			"manpowerRatio" : 0.25
		},
		calculateEffects: function(self, game){
			self.effects["manpowerRatio"] = 0.25 * (1 + game.getEffect("weaponEfficency")); //weaponEfficency can't go beyond -1, see challenges.js for more info
		},
		prices:[
			{ name : "iron", val: 1500 },
			{ name : "science", val: 12000 }
		]
	},{
		name: "railgun",
		label: $I("workshop.railgun.label"),
		description: $I("workshop.railgun.desc"),
		effects: {
			"manpowerRatio" : 0.25
		},
		calculateEffects: function(self, game){
			self.effects["manpowerRatio"] = 0.25 * (1 + game.getEffect("weaponEfficency")); //weaponEfficency can't go beyond -1, see challenges.js for more info
		},
		prices:[
			{ name : "titanium", val: 5000 },
			{ name : "science", val: 150000 },
			{ name : "blueprint", val: 25 }
		],
		flavor: $I("workshop.railgun.flavor"),
		unlocks: {
		}
	},{
		name: "bolas",
		label: $I("workshop.bolas.label"),
		description: $I("workshop.bolas.desc"),
		effects: {
			"cultureRatio": 0.25,
			"manpowerMax": 50
		},
		calculateEffects: function(self, game){
			self.effects["cultureRatio"] = 0.25;
			self.effects["manpowerMax"] = game.ironWill ? 200 : 50;
		},
		prices:[
			{ name : "wood", val: 50 },
			{ name : "minerals", val: 250 },
			{ name : "science", val: 1000 }
		],
		flavor: $I("workshop.bolas.flavor")
	},{
		name: "huntingArmor",
		label: $I("workshop.huntingArmor.label"),
		description: $I("workshop.huntingArmor.desc"),
		effects: {
			"cultureRatio": 0.50,
			"mineralsRatio": 0.25,
			"manpowerRatio": 0.15,
			"manpowerMax": 150
		},
		calculateEffects: function(self, game){
			self.effects["cultureRatio"] = 0.50;
			self.effects["mineralsRatio"] = 0.25;
			self.effects["manpowerRatio"] = 0.15;
			self.effects["manpowerMax"] = game.ironWill ? 600 : 150;
		},
		prices:[
			{ name : "iron", val: 750 },
			{ name : "science", val: 2000 }
		],
        flavor: $I("workshop.huntingArmor.flavor")
	},{
		name: "steelArmor",
		label: $I("workshop.steelArmor.label"),
		description: $I("workshop.steelArmor.desc"),
		effects: {
			"cultureRatio": 0.50,
			"mineralsRatio": 0.35,
			"manpowerRatio": 0.20,
			"manpowerMax": 250
		},
		prices:[
			{ name : "science", val: 10000 },
			{ name : "steel", val: 50 }
		]
	},{
		name: "alloyArmor",
		label: $I("workshop.alloyArmor.label"),
		description: $I("workshop.alloyArmor.desc"),
		effects: {
			"cultureRatio": 0.75,
			"mineralsRatio": 0.50,
			"manpowerRatio": 0.30,
			"manpowerMax": 500
		},
		prices:[
			{ name : "science", val: 50000 },
			{ name : "alloy", val: 25 }
		]
	},{
		name: "nanosuits",
		label: $I("workshop.nanosuits.label"),
		description: $I("workshop.nanosuits.desc"),
		effects: {
			"cultureRatio": 1.00,
			"mineralsRatio": 0.75,
			"manpowerRatio": 0.50,
			"manpowerMax": 1000
		},
		prices:[
			{ name : "science", val: 185000 },
			{ name : "alloy", val: 250 }
		]
	},{
		name: "caravanserai",
		label: $I("workshop.caravanserai.label"),
		description: $I("workshop.caravanserai.desc"),
		effects: {
		},
		prices:[{ name: "gold", val: 250 }, { name: "science", val: 25000 }, { name: "minerals", val: 10000 }],
		upgrades: {
			buildings: ["tradepost"]
		},
		flavor: $I("workshop.caravanserai.flavor")
	},
	{
		name: "freightfulExchange",
		label: $I("workshop.freightfulExchange.label"),
		description: $I("workshop.freightfulExchange.desc"),
		effects: {
		},
		prices:[{ name: "science", val: 450000 }, { name: "eludium", val: 100 }, { name: "titanium", val: 1000 }, { name: "alloy", val: 5000 }],
		upgrades: {
			buildings: ["warehouse"],
			stages: [{bld:"warehouse", stage:1}]
		},
		unlocks:{
			upgrades: ["transportSuperposition"]
		}
		// flavor: $I("workshop.transportSuperposition.flavor")
	
	},
	{
		name: "transportSuperposition",
		label: $I("workshop.transportSuperposition.label"),
		description: $I("workshop.transportSuperposition.desc"),
		effects: {
		},
		prices:[{ name: "science", val: 500000 }, { name: "eludium", val: 1500 }, { name: "uranium", val: 40000 }, { name: "alloy", val: 25000 }],
		upgrades: {
			buildings: ["warehouse"],
			stages: [{bld:"warehouse", stage:1}]
		},
		flavor: $I("workshop.transportSuperposition.flavor"),
		evaluateLocks: function(game){
			return game.workshop.get("freightfulExchange").researched && game.science.get("dimensionalPhysics").researched;
		}
	},
	//--------------------- stuff ----------------------
	{
		name: "advancedRefinement",
		label: $I("workshop.advancedRefinement.label"),
		description: $I("workshop.advancedRefinement.desc"),
		effects: {
		},
		prices:[
			{ name : "catnip", val: 5000 },
			{ name : "science", val: 500 }
		],
		handler: function(game){
			game.workshop.getCraft("wood").prices = [{name: "catnip", val: 50}];
		},
		flavor: $I("workshop.advancedRefinement.flavor")
	},{
		name: "prospecting",
		label: $I("workshop.prospecting.label"),
		description: $I("workshop.prospecting.desc"),
		prices:[
			{ name : "minerals", val: 1000 },
			{ name : "science",  val: 1000 }
		]
	},{
		name: "goldOre",
		label: $I("workshop.goldOre.label"),
		description: $I("workshop.goldOre.desc"),
		effects: {
		},
		prices:[
			{ name : "minerals", val: 800 },
			{ name : "iron", 	 val: 100 },
			{ name : "science",  val: 1000 }
		],
		upgrades: {
			buildings: ["smelter"]
		},
		flavor: $I("workshop.goldOre.flavor")
	},{
		name: "geodesy",
		label: $I("workshop.geodesy.label"),
		description: $I("workshop.geodesy.desc"),
		effects: {
			"mineralsRatio" : 0.1
		},
		prices:[
			{ name : "titanium", val: 250 },
			{ name : "science",  val: 90000 },
			{ name : "starchart", val: 500 }
		],
		upgrades: {
			buildings: ["mine"]
		},
		flavor: $I("workshop.geodesy.flavor")
	},{
		name: "register",
		label: $I("workshop.register.label"),
		description: $I("workshop.register.desc"),
		effects: {
			"manpowerRatio" : 0.1
		},
		prices:[
			{ name : "gold", 	 val: 10 },
			{ name : "science",  val: 500 }
		]
	},{
		name: "strenghtenBuild",
		label: $I("workshop.strenghtenBuild.label"),
		description: $I("workshop.strenghtenBuild.desc"),
		effects: {
			"barnRatio" : 0.05,
			"warehouseRatio" : 0.05
		},
		prices:[{ name: "science", val: 100000 }, { name: "slab", val: 1500 }],
		unlocks: {
			upgrades: ["concreteWarehouses", "concreteBarns"]
		},
		upgrades: {
			buildings: ["barn", "warehouse", "harbor", "mint"]
		}
	},
	//TODO: thouse two upgrades may be buggy like hell, we should really really revisit handler logic
	{
		name: "miningDrill",
		label: $I("workshop.miningDrill.label"),
		description: $I("workshop.miningDrill.desc"),
		effects: {
			"mineralsRatio" : 0.1
		},
		prices:[
			{ name : "titanium", val: 1750 },
			{ name : "science",  val: 100000 },
			{ name : "steel", 	 val: 750 }
		],
		upgrades: {
			buildings: ["mine"]
		}
	},
	//--------------------- coal upgrades ----------------------
	{
		name: "electrolyticSmelting",
		label: $I("workshop.electrolyticSmelting.label"),
		description: $I("workshop.electrolyticSmelting.desc"),
		effects: {
			"smelterRatio": 0.95
		},
		prices:[
			{ name : "titanium", val: 2000 },
			{ name : "science",  val: 100000 }
		],
		upgrades: {
			buildings: ["smelter"]
		}
	},{
		name: "oxidation",
		label: $I("workshop.oxidation.label"),
		description: $I("workshop.oxidation.desc"),
		effects: {
			"calcinerRatio": 0.95
		},
		prices:[
			{ name : "science",  val: 100000 },
			{ name : "steel", val: 5000 }
		],
		upgrades: {
			buildings: ["calciner"]
		}
	},{
		name: "steelPlants",
		label: $I("workshop.steelPlants.label"),
		description: $I("workshop.steelPlants.desc"),
		effects: {
			"calcinerSteelRatio" : 0.1
		},
		prices:[{ name: "titanium", val: 3500 }, { name: "science", val: 140000 }, { name: "steel", val: 2250 }],
		unlocks: {
			upgrades: ["automatedPlants"]
		}
	},{
		name: "automatedPlants",
		label: $I("workshop.automatedPlants.label"),
		description: $I("workshop.automatedPlants.desc"),
		effects: {
			"calcinerSteelCraftRatio" : 0.25
		},
		prices:[
			{ name : "science",  val: 200000 },
			{ name : "alloy", val: 750 }
		],
        unlocks: {
			upgrades: ["nuclearPlants"]
		}
	},{
		name: "nuclearPlants",
		label: $I("workshop.nuclearPlants.label"),
		description: $I("workshop.nuclearPlants.desc"),
		effects: {
			"calcinerSteelReactorBonus" : 0.02
		},
		prices:[
			{ name : "uranium", val: 10000 },
			{ name : "science",  val: 250000 }
		]
	},{
		name: "rotaryKiln",
		label: $I("workshop.rotaryKiln.label"),
		description: $I("workshop.rotaryKiln.desc"),
		effects: {
			"calcinerRatio": 0.75
		},
		prices:[{ name: "titanium", val: 5000 }, { name: "science", val: 145000 }, { name: "steel", val: 1500 }],
		upgrades: {
			buildings: ["calciner"]
		}
	},
	{
		name: "fluidizedReactors",
		label: $I("workshop.fluidizedReactors.label"),
		description: $I("workshop.fluidizedReactors.desc"),
		effects: {
			"calcinerRatio": 1
		},
		prices:[
			{ name : "science", val: 175000 },
			{ name : "alloy", val: 200 }
		],
		upgrades: {
			buildings: ["calciner"]
		}
	},
	//--------------------- automation upgrades ----------------------
	{
		name: "printingPress",
		label: $I("workshop.printingPress.label"),
		description: $I("workshop.printingPress.desc"),
		effects: {
		},
		prices:[{ name: "science", val: 7500 }, { name: "steel", val: 135 }],
		upgrades: {
			buildings: ["steamworks"]
		}
	},{
		name: "offsetPress",
		label: $I("workshop.offsetPress.label"),
		description: $I("workshop.offsetPress.desc"),
		effects: {
		},
		prices:[{ name: "oil", val: 15000 }, { name: "science", val: 100000 }, { name: "steel", val: 750 }],
		upgrades: {
			buildings: ["steamworks"]
		},
		flavor: $I("workshop.offsetPress.flavor")
	},{
		name: "photolithography",
		label: $I("workshop.photolithography.label"),
		description: $I("workshop.photolithography.desc"),
		effects: {
		},
		prices:[
			{ name : "oil", 	 val: 25000 },
			{ name : "uranium",  val: 250 },
			{ name : "science",  val: 250000 },
			{ name : "alloy", 	 val: 1250 }
		],
		upgrades: {
			buildings: ["steamworks"]
		}
	},{
		name: "uplink",
		label: $I("workshop.uplink.label"),
		description: $I("workshop.uplink.desc"),
		effects: {
			"uplinkDCRatio": 0.01,
			"uplinkLabRatio": 0.01
		},
		prices:[
			{ name : "science",  val: 75000 },
			{ name : "alloy", 	 val: 1750 }
		],
		upgrades: {
		buildings: ["library", "biolab"]
		}
	},{
		name: "starlink",
		label: $I("workshop.starlink.label"),
		description: $I("workshop.starlink.desc"),
		effects: {
			"uplinkLabRatio": 0.01
		},
		prices:[
			{ name : "oil", 	 val: 25000 },
			{ name : "science",  val: 175000 },
			{ name : "alloy", 	 val: 5000 }
		],
		upgrades: {
			buildings: ["library","biolab"]
		}
	},{
		name: "cryocomputing",
		label: $I("workshop.cryocomputing.label"),
		description: $I("workshop.cryocomputing.desc"),
		effects: {
		},
		prices:[
			{ name : "science",  val: 125000 },
			{ name : "eludium",  val: 15 }
		],
		upgrades: {
			buildings: ["library"]
		}
	},{
		name: "machineLearning",
		label: $I("workshop.machineLearning.label"),
		description: $I("workshop.machineLearning.desc"),
		effects: {
			"dataCenterAIRatio": 0.1
		},
		prices:[
			{ name : "unobtainium", val: 125 },
			{ name : "science",     val: 175000 },
			{ name : "eludium",  	val: 25 }
		],
		upgrades: {
			buildings: ["library"]
		}
	},
	{
		name: "factoryAutomation",
		label: $I("workshop.factoryAutomation.label"),
		description: $I("workshop.factoryAutomation.desc"),
		effects: {
		},
		prices:[{ name: "science", val: 10000 }, { name: "steel", val: 75 }],
		flavor: $I("workshop.factoryAutomation.flavor")
	},{
		name: "advancedAutomation",
		label: $I("workshop.advancedAutomation.label"),
		description: $I("workshop.advancedAutomation.desc"),
		effects: {
		},
		prices:[{ name: "science", val: 100000 }, { name: "steel", val: 225 }, { name: "blueprint", val: 25 }]
	},{
		name: "pneumaticPress",
		label: $I("workshop.pneumaticPress.label"),
		description: $I("workshop.pneumaticPress.desc"),
		effects: {
		},
		prices:[{ name: "science", val: 20000 }, { name: "steel", val: 90 }, { name: "blueprint", val: 5 }]
	},{
		name: "combustionEngine",
		label: $I("workshop.combustionEngine.label"),
		description: $I("workshop.combustionEngine.desc"),
		effects: {
			"coalRatioGlobalReduction" : 0.2
		},
		prices:[{ name: "science", val: 20000 }, { name: "steel", val: 75 }, { name: "blueprint", val: 5 }],
		upgrades: {
			buildings: ["steamworks"]
		},
        flavor: $I("workshop.combustionEngine.flavor")
	},{
		name: "fuelInjectors",
		label: $I("workshop.fuelInjectors.label"),
		description: $I("workshop.fuelInjectors.desc"),
		effects: {
			"coalRatioGlobalReduction" : 0.2
		},
		prices:[{ name: "oil", val: 20000 }, { name: "science", val: 100000 }, { name: "steel", val: 750 }],
		upgrades: {
			buildings: ["steamworks"]
		}
	},
	{
		name: "factoryLogistics",
		label: $I("workshop.factoryLogistics.label"),
		description: $I("workshop.factoryLogistics.desc"),
		effects: {
		},
		prices:[{ name: "titanium", val: 2000 }, { name: "science", val: 100000 }, { name: "steel", val: 750 }],
		upgrades: {
			buildings: ["factory"]
		}
	},{
		name: "carbonSequestration",
		label: $I("workshop.carbonSequestration.label"),
		description: $I("workshop.carbonSequestration.desc"),
		effects: {
		},
		prices:[{ name: "titanium", val: 1250 }, { name: "science", val: 75000 }, { name: "steel", val: 4380 }, { name: "alloy", val: 1000 }],
		upgrades:{
			buildings: ["factory"]
		}
	},{
		name: "factoryOptimization",
		label: $I("workshop.factoryOptimization.label"),
		description: $I("workshop.factoryOptimization.desc"),
		effects: {
			"queueCap": 1
		},
		prices:[{ name: "titanium", val: 1250 }, { name: "science", val: 75000 }, { name: "steel", val: 375 }]
	},{
		name: "factoryRobotics",
		label: $I("workshop.factoryRobotics.label"),
		description: $I("workshop.factoryRobotics.desc"),
		effects: {
			"queueCap": 2
		},
		prices:[{ name: "titanium", val: 2500 }, { name: "science", val: 100000 }, { name: "steel", val: 750 }]
	},{
		name: "spaceEngineers",
		label: $I("workshop.spaceEngineers.label"),
		description: $I("workshop.spaceEngineers.desc"),
		effects: {
			"queueCap": 2
		},
		prices:[
			{ name : "science",  val: 225000 },
			{ name : "alloy", 	 val: 500 }
		]
	},{
		name: "aiEngineers",
		label: $I("workshop.aiEngineers.label"),
		description: $I("workshop.aiEngineers.desc"),
		effects: {
			"queueCap": 3
		},
		prices:[
			{ name : "unobtainium", val: 300 },
			{ name : "science",     val: 35000 },
			{ name : "eludium",     val: 50 }
		]
	},{
		name: "chronoEngineers",
		label: $I("workshop.chronoEngineers.label"),
		description: $I("workshop.chronoEngineers.desc"),
		effects: {
			"queueCap": 3
		},
		prices:[
			{ name : "science",     val: 500000 },
			{ name : "timeCrystal", val: 5 },
			{ name : "eludium",     val: 100 }
		]
	}, {
		name: "spaceManufacturing",
		label: $I("workshop.spaceManufacturing.label"),
		description: $I("workshop.spaceManufacturing.desc"),
		effects: {
		},
		prices:[
			{ name : "titanium", val: 50000 },
			{ name : "science",  val: 250000 }
		],
		upgrades: {
			buildings: ["factory"]
		}
	},
	//--------------------- science upgrades ----------------------
	{
		name: "celestialMechanics",
		label: $I("workshop.celestialMechanics.label"),
		description: $I("workshop.celestialMechanics.desc"),
		effects: {},
		prices:[
			{ name : "science",  val: 250 }
		]
	},{
		name: "astrolabe",
		label: $I("workshop.astrolabe.label"),
		description: $I("workshop.astrolabe.desc"),
		effects: {},
		prices:[
			{ name : "titanium", val: 5 },
			{ name : "science",  val: 25000 },
			{ name : "starchart",  val: 75 }
		],
		upgrades: {
			buildings: ["observatory"]
		}
	},
	{
		name: "titaniumMirrors",
		label: $I("workshop.titaniumMirrors.label"),
		description: $I("workshop.titaniumMirrors.desc"),
		effects: {
			"libraryRatio" : 0.02
		},
		prices:[
			{ name : "titanium", val: 15 },
			{ name : "science",  val: 20000 },
			{ name : "starchart",  val: 20 }
		],
		upgrades: {
			buildings: ["library"]
		},
		flavor: $I("workshop.titaniumMirrors.flavor")
	},
	{
		name: "unobtainiumReflectors",
		label: $I("workshop.unobtainiumReflectors.label"),
		description: $I("workshop.unobtainiumReflectors.desc"),
		effects: {
			"libraryRatio" : 0.02
		},
		prices:[
			{ name : "unobtainium", val: 75 },
			{ name : "science",  val: 250000 },
			{ name : "starchart",  val: 750 }
		],
		upgrades: {
			buildings: ["library"]
		}
	},
	{
		name: "eludiumReflectors",
		label: $I("workshop.eludiumReflectors.label"),
		description: $I("workshop.eludiumReflectors.desc"),
		effects: {
			"libraryRatio" : 0.02
		},
		prices:[
			{ name : "science",  val: 250000 },
			{ name : "eludium", val: 15 }
		],
		upgrades: {
			buildings: ["library"]
		}
	},
    {
        name: "hydroPlantTurbines",
        label: $I("workshop.hydroPlantTurbines.label"),
        description: $I("workshop.hydroPlantTurbines.desc"),
        effects: {
            "hydroPlantRatio": 0.15
        },
        prices: [
            {name: "unobtainium", val: 125},
            {name: "science", val: 250000}
        ],
        upgrades: {
            buildings: ["aqueduct"]
        }
    },{
		name: "amBases",
		label: $I("workshop.amBases.label"),
		description: $I("workshop.amBases.desc"),
		prices: [
			{name: "unobtainium", val: 250},
			{name: "eludium", val: 15}
		],
		upgrades: {
			spaceBuilding: ["moonBase"]
		},
		unlocks: {
			upgrades: ["aiBases"]
		}
	},{
		name: "aiBases",
		label: $I("workshop.aiBases.label"),
		description: $I("workshop.aiBases.desc"),
		prices:[
			{ name : "eludium", val: 100 },
			{ name : "science", val: 750000 }
		],
		upgrades: {
			spaceBuilding: ["moonBase"]
		}
	},{
		name: "amReactors",
		label: $I("workshop.amReactors.label"),
		description: $I("workshop.amReactors.desc"),
		effects: {
			"spaceScienceRatio": 0.95
		},
		prices: [
			{name: "unobtainium", val: 500},
			{name: "eludium", val: 35}
		],
		upgrades: {
			spaceBuilding: ["researchVessel", "spaceBeacon"]
		},
		unlocks: {
			upgrades: ["amReactorsMK2"]
		}
	},{
		name: "amReactorsMK2",
		label: $I("workshop.amReactorsMK2.label"),
		description: $I("workshop.amReactorsMK2.desc"),
		effects: {
			"spaceScienceRatio": 1.5
		},
		upgrades: {
			spaceBuilding: ["researchVessel", "spaceBeacon"]
		},
		prices: [
			{name: "unobtainium", val: 1200},
			{name: "eludium", val: 70}
		],
		unlocks: {
			upgrades: ["voidReactors"]
		}
	},{
		name: "voidReactors",
		label: $I("workshop.voidReactors.label"),
		description: $I("workshop.voidReactors.desc"),
		effects: {
			"spaceScienceRatio": 4
		},
		upgrades: {
			spaceBuilding: ["researchVessel", "spaceBeacon"]
		},
		prices: [
			{name: "eludium", val: 150},
			{name: "relic", val: 50}
		]
	},{
		name: "relicStation",
		label: $I("workshop.relicStation.label"),
		description: $I("workshop.relicStation.desc"),
		effects: {
			"beaconRelicsPerDay": 0.01
		},
		upgrades: {
			spaceBuilding: ["spaceBeacon"]
		},
		prices: [
			{name: "relic", val: 25},
			{name: "eludium", val: 100}
		]
	},{
			name: "amDrive",
			label: $I("workshop.amDrive.label"),
			description: $I("workshop.amDrive.desc"),
			prices:[
				{ name : "eludium", val: 35 },
				{ name : "science",  val: 450000 }
			],
			effects: {
				"routeSpeed" : 25
			}
	},
	//---------------------- oil ---------------
	{
		name: "pumpjack",
		label: $I("workshop.pumpjack.label"),
		description: $I("workshop.pumpjack.desc"),
		effects: {
			"oilWellRatio" : 0.45
		},
		prices:[{ name: "titanium", val: 250 }, { name: "science", val: 100000 }, { name: "steel", val: 375 }],
		upgrades: {
			buildings: ["oilWell"]
		}
	},
	{
		name: "petri",
		label: $I("workshop.petri.label"),
		description: $I("workshop.petri.desc"),
		effects: {
		},
		prices:[{ name: "oil", val: 6250 }, { name: "science", val: 65000 }],
		upgrades: {
			buildings: ["biolab"]
		}
	},
	{
		name: "biofuel",
		label: $I("workshop.biofuel.label"),
		description: $I("workshop.biofuel.desc"),
		effects: {
		},
		prices:[
			{ name : "titanium", val: 1250 },
			{ name : "science",  val: 150000 }
		],
		upgrades: {
			buildings: ["biolab"]
		}
	},
	{
		name: "unicornSelection",
		label: $I("workshop.unicornSelection.label"),
		description: $I("workshop.unicornSelection.desc"),
		effects: {
			"unicornsGlobalRatio": 0.25,
			"unicornsMaxRatio": 0
		},
		calculateEffects: function(self, game) {
			//Increase max unicorns by +50%, but only in the Unicorn Tears Challenge:
			self.effects["unicornsMaxRatio"] = game.challenges.isActive("unicornTears") ? 0.5 : 0;
		},
		prices:[
			{ name : "titanium", val: 1500 },
			{ name : "science",  val: 175000 }
		]
	},
	{
		//Special upgrade only unlockable during the Unicorn Tears Challenge
		name: "alicornStable",
		label: $I("workshop.alicornStable.label"),
		description: $I("workshop.alicornStable.desc"),
		effects: {
			"alicornMax": 0
		},
		calculateEffects: function(self, game) {
			if (game.challenges.isActive("unicornTears")) {
				self.description = $I("workshop.alicornStable.desc");
				self.effects["alicornMax"] = 0.2;
			} else {
				self.description = $I("workshop.alicornStable.desc.noChallenge");
				self.effects["alicornMax"] = 0;
			}
		},
		prices:[
			{ name: "wood", val: 3000 },
			{ name: "gold", val: 100 },
			{ name: "faith", val: 2500 }
		]
	},
	
	//------------------- blueprints ----------------
	{
		name: "cadSystems",
		label: $I("workshop.cadSystems.label"),
		description: $I("workshop.cadSystems.desc"),
		effects: {
			"cadBlueprintCraftRatio" : 0.01
		},
		prices:[
			{ name : "titanium", val: 750 },
			{ name : "science",  val: 125000 }
		]
	},{
		name: "seti",
		label: $I("workshop.seti.label"),
		description: $I("workshop.seti.desc"),
		prices:[
			{ name : "titanium", val: 250 },
			{ name : "science",  val: 125000 }
		],
		handler: function(game) {
			game.console.lockFilter("astronomicalEvent");
			if (game.calendar.observeRemainingTime > 0) {
				game.calendar.observeHandler();
			}
		}
	},{
		name: "logistics",
		label: $I("workshop.logistics.label"),
		description: $I("workshop.logistics.desc"),
		effects: {
			"craftRatio" : 0.05
		},
		prices:[{ name: "science", val: 100000 }, { name: "steel", val: 300 }, { name: "beam", val: 8000 }]
	},{
		name: "augumentation",
		label: $I("workshop.augumentation.label"),
		description: $I("workshop.augumentation.desc"),
		effects: {
			"craftRatio" : 0.25
		},
		prices:[
			{ name : "titanium", val: 5000 },
			{ name : "uranium",  val: 50 },
			{ name : "science",  val: 150000 }
		]
	},{
		name: "internet",
		label: $I("workshop.internet.label"),
		description: $I("workshop.internet.desc"),
		effects: {
			"craftRatio" : 0.1
		},
		prices:[
			{ name : "titanium", val: 5000 },
			{ name : "uranium",  val: 50 },
			{ name : "science",  val: 150000 }
		]
	},{
		name: "neuralNetworks",
		label: $I("workshop.neuralNetworks.label"),
		description: $I("workshop.neuralNetworks.desc"),
		effects: {},
		prices:[
			{ name : "titanium", val: 7500 },
			{ name : "science",  val: 200000 }
		],
		unlocks: {
		},
		upgrades: {
			buildings: ["factory"]
		}
	},{
		name: "assistance",
		label: $I("workshop.assistance.label"),
		description: $I("workshop.assistance.desc"),
		effects: {
			"manpowerRatio" : 0.15
		},
		prices:[{ name: "science", val: 100000 }, { name: "steel", val: 2500 }]
	},{
		name: "enrichedUranium",
		label: $I("workshop.enrichedUranium.label"),
		description: $I("workshop.enrichedUranium.desc"),
		effects: {
			"uraniumRatio" : 0.25
		},
		prices:[
			{ name : "titanium", val: 7500 },
			{ name : "uranium",  val: 150 },
			{ name : "science",  val: 175000 }
		],
		upgrades: {
			buildings: ["reactor"]
		}
	},{
        name: "coldFusion",
        label: $I("workshop.coldFusion.label"),
        description: $I("workshop.coldFusion.desc"),
        effects: {
            "reactorEnergyRatio": 0.25
        },
        prices:[
            { name : "science",  val: 200000 },
            { name : "eludium",  val: 25 }
        ],
        upgrades: {
            buildings: ["reactor"]
        }
    },{
        name: "thoriumReactors",
        label: $I("workshop.thoriumReactors.label"),
        description: $I("workshop.thoriumReactors.desc"),
        effects: {
            "reactorEnergyRatio": 0.25
        },
        prices:[{ name: "science", val: 400000 }, { name: "uranium", val: 15000 }],
        upgrades: {
            buildings: ["reactor"]
        },
		unlocks: {
			upgrades: ["enrichedThorium"]
		}
    },{
		name: "enrichedThorium",
		label: $I("workshop.enrichedThorium.label"),
		description: $I("workshop.enrichedThorium.desc"),
		effects: {
			"uraniumRatio": 0.25
		},
		prices:[{ name: "science", val: 500000 }, { name: "uranium", val: 25000 }],
		upgrades: {
			buildings: ["reactor"]
		}
	},
	//------------------- starcharts / space ----------------

	{
		name: "satnav",
		label: $I("workshop.satnav.label"),
		description: $I("workshop.satnav.desc"),
		effects: {
			"satnavRatio" : 0.0125
		},
		prices:[
			{ name : "science",  val: 200000 },
			{ name : "alloy", 	 val: 750 }
		]
	},{
        name: "satelliteRadio",
        label: $I("workshop.satelliteRadio.label"),
        description: $I("workshop.satelliteRadio.desc"),
        effects: {
            "broadcastTowerRatio" : 0.005
        },
        prices:[
            { name : "science",  val: 225000 },
            { name : "alloy", 	 val: 5000 }
        ]
    },
	{
		name: "mWReactor",
		label: $I("workshop.mWReactor.label"),
		description: $I("workshop.mWReactor.desc"),
		effects: {
			"lunarOutpostRatio" : 0.75
		},
		prices:[
			{ name : "science",  val: 150000 },
			{ name : "eludium", val: 50 }
		]
	},
	{
		name: "eludiumCracker",
		label: $I("workshop.eludiumCracker.label"),
		description: $I("workshop.eludiumCracker.desc"),
		effects: {
			"crackerRatio" : 1.0
		},
		prices:[
			{ name : "science",  val: 275000 },
			{ name : "eludium", val: 250 }
		],
		upgrades: {
			spaceBuilding: ["planetCracker"]
		}
	},
	{
		name: "thoriumEngine",
		label: $I("workshop.thoriumEngine.label"),
		description: $I("workshop.thoriumEngine.desc"),
		prices:[{ name: "science", val: 400000 }, { name: "steel", val: 25000 }, { name: "alloy", val: 2000 }, { name: "beam", val: 50000 }, { name: "uranium", val: 50000 }],
		effects: {
			"routeSpeed" : 50
		}
	},
	{
		name: "spiceNavigation",
		label: $I("workshop.spiceNavigation.label"),
		description: $I("workshop.spiceNavigation.desc"),
		prices:[
			{ name : "science",  val: 350000 },
			{ name : "starchart",  val: 500000 }
		],
		unlocks: {
			spaceBuilding: ["navigationRelay"]
		},
		flavor: $I("workshop.spiceNavigation.flavor")
	},
	{
		name: "longRangeSpaceships",
		label: $I("workshop.longRangeSpaceships.label"),
		description: $I("workshop.longRangeSpaceships.desc"),
		prices:[{ name: "science", val: 440000 }, { name: "steel", val: 25000 }, { name: "alloy", val: 3500 }],
		unlocks: {
			spaceBuilding: ["spaceShuttle"]
		},
		flavor: $I("workshop.longRangeSpaceships.flavor")
	},
	//------------------- oil --------------------------
    {
		name: "oilRefinery",
		label: $I("workshop.oilRefinery.label"),
		description: $I("workshop.oilRefinery.desc"),
		effects: {
			"oilWellRatio" : 0.35
		},
		prices:[{ name: "titanium", val: 1250 }, { name: "science", val: 125000 }, { name: "steel", val: 1500 }],
		upgrades: {
			buildings: ["oilWell"]
		}
	},{
        name: "oilDistillation",
        label: $I("workshop.oilDistillation.label"),
        description: $I("workshop.oilDistillation.desc"),
        effects: {
            "oilWellRatio" : 0.75
        },
        prices:[
            { name : "titanium", val: 5000 },
            { name : "science",  val: 175000 }
        ],
        upgrades: {
            buildings: ["oilWell"]
        }
    },{
        name: "factoryProcessing",
        label: $I("workshop.factoryProcessing.label"),
        description: $I("workshop.factoryProcessing.desc"),
        effects: {
            "factoryRefineRatio" : 0.05
        },
        prices:[{ name: "titanium", val: 7500 }, { name: "science", val: 195000 }, { name: "slab", val: 3750 }]
    },
    //---------------- Void Space ---------------
    {
        name: "voidAspiration",
        label: $I("workshop.voidAspiration.label"),
        description: $I("workshop.voidAspiration.desc"),
        effects: {

        },
        prices:[
            { name : "relic", val: 30 },
            { name : "timeCrystal", val: 15 }
        ],
        unlocks: {
            voidSpace: ["voidHoover", "voidRift"]
        }
    },{
        name: "distorsion",
        label: $I("workshop.distorsion.label"),
        description: $I("workshop.distorsion.desc"),
        effects: {
			"temporalParadoxDayBonus": 2
        },
        prices:[
            { name : "eludium", val: 150 },
            { name : "science", val: 300000 },
            { name : "timeCrystal", val: 25 },
            { name : "relic", val: 60 }
        ],
        upgrades: {
            voidSpace: ["chronocontrol"]
        }
    },{
        name: "turnSmoothly",	//chronosurge
        label: $I("workshop.turnSmoothly.label"),
        description: $I("workshop.turnSmoothly.desc"),
        effects: {
			"temporalFluxProductionChronosphere": 1
        },
        prices:[
			{ name : "unobtainium", val: 15000 },
			{ name : "relic", val: 80 },
			{ name : "timeCrystal", val: 25 },
			{ name : "eludium", val: 200 }
        ],
        upgrades: {
            buildings: ["chronosphere"]
        }
        //---------------- Blackcoin ---------------
    },{
		name: "invisibleBlackHand",
		label: $I("workshop.invisibleBlackHand.label"),
		description: $I("workshop.invisibleBlackHand.desc"),
		prices: [
			{name: "relic", val: 120},
			{name: "timeCrystal", val: 128},
			{name: "eludium", val: 250}
		],
		unlocks: {
		}
	}
    ],

	//=============================================================
	//					     CRAFT RECIPES
	//=============================================================

	crafts:[{
		name: "wood",
		label: $I("workshop.crafts.wood.label"),
		description: $I("workshop.crafts.wood.desc"),
		prices:[{ name: "catnip", val: 100 }],
		ignoreBonuses: true,
		progressHandicap: 1,
		tier: 1
	},{
		name: "beam",
		label: $I("workshop.crafts.beam.label"),
		description: $I("workshop.crafts.beam.desc"),
		prices:[{ name: "wood", val: 175 }],
		progressHandicap: 1,
		tier: 1
	},{
		name: "slab",
		label: $I("workshop.crafts.slab.label"),
		description: $I("workshop.crafts.slab.desc"),
		prices:[{ name: "minerals", val: 250 }],
		progressHandicap: 1,
		tier: 1
	},{
		name: "steel",
		label: $I("workshop.crafts.steel.label"),
		description: $I("workshop.crafts.steel.desc"),
		prices:[{ name: "coal", val: 100 }, { name: "iron", val: 100 }],
		progressHandicap: 4,
		tier: 2
	},{
		name: "alloy",
		label: $I("workshop.crafts.alloy.label"),
		description: $I("workshop.crafts.alloy.desc"),
		prices:[{ name: "titanium", val: 10 }, { name: "steel", val: 75 }],
		progressHandicap: 7,
		tier: 4
	},{
		name: "eludium",
		label: $I("workshop.crafts.eludium.label"),
		description: $I("workshop.crafts.eludium.desc"),
		prices:[{ name: "unobtainium", val: 1000 }, { name: "alloy", val: 2500 }],
		progressHandicap: 300,
		tier: 5
	},{
		name: "blueprint",
		label: $I("workshop.crafts.blueprint.label"),
		description: $I("workshop.crafts.blueprint.desc"),
		prices:[{ name: "science", val: 25000 }, { name: "culture", val: 1000 }],
		progressHandicap: 10,
		tier: 3
	}],

	zebraUpgrades:[],
	effectsBase: {
		"oilMax" : 0,
		"scienceMax" : 0,
		"cultureMax" : 0,
		"faithMax" : 0
	},

	metaCache: null,

	constructor: function(game){
		this.game = game;
		this.metaCache = {};
		this.registerMeta("research", this.upgrades, null);
		this.setEffectsCachedExisting();
	},

	get: function(upgradeName){
		var upgrade = this.metaCache[upgradeName];
		if (upgrade){
			return upgrade;
		}

		for (var i = this.upgrades.length - 1; i >= 0; i--) {
			if (this.upgrades[i].name === upgradeName){
				this.metaCache[upgrade] = this.upgrades[i];
				return this.upgrades[i];
			}
		}
		console.error("Failed to get upgrade for id '" + upgradeName + "'");
		return null;
	},

	getCraft: function(craftName){
		for (var i = this.crafts.length - 1; i >= 0; i--) {
			if (this.crafts[i].name === craftName){
				return this.crafts[i];
			}
		}
		return null;
	},

	getZebraUpgrade: function(zebraUpgradeName){
		return { name: zebraUpgradeName, researched: false, unlocked: false, effects: {}, prices: [] };
	},

	resetState: function(){
		for (var i = 0; i < this.upgrades.length; i++){
			var upgrade = this.upgrades[i];
			if (upgrade.name == "mineralHoes" ||
				upgrade.name == "ironHoes" ||
				upgrade.name == "mineralAxes" ||
				upgrade.name == "ironAxes" ||
				upgrade.name == "stoneBarns" ||
				upgrade.name == "reinforcedBarns") {
				upgrade.unlocked = true;
			} else {
				upgrade.unlocked = false;
			}
			upgrade.researched = false;
		}

		for (i = 0; i < this.crafts.length; i++){
			var craft = this.crafts[i];
			craft.unlocked = (craft.name == "wood" || craft.name == "beam" || craft.name == "slab");
			craft.value = 0;
			craft.progress = 0;
			if (typeof(craft.progressHandicap) == "undefined") {
				craft.progressHandicap = 1;
			}
		}

		this.getCraft("wood").prices = [{name: "catnip", val: 100}];
		this.hideResearched = false;
	},

	save: function(saveData){
		saveData.workshop = {
			hideResearched: this.hideResearched,
			upgrades: this.filterMetadata(this.upgrades, ["name", "unlocked", "researched"]),
			crafts: this.filterMetadata(this.crafts, ["name", "unlocked", "value", "progress"]),
			zebraUpgrades: []
		};
	},

	load: function(saveData){
		if (!saveData["workshop"]){
			return;
		}

		this.hideResearched = saveData.workshop.hideResearched;
		var live = {};
		for (var i = 0; i < this.upgrades.length; i++){ live[this.upgrades[i].name] = true; }
		var savedUpgrades = (saveData.workshop.upgrades || []).filter(function(u){ return u && live[u.name]; });
		this.loadMetadata(this.upgrades, savedUpgrades, "upgrades");

		var liveCrafts = {};
		for (var j = 0; j < this.crafts.length; j++){ liveCrafts[this.crafts[j].name] = true; }
		var savedCrafts = (saveData.workshop.crafts || []).filter(function(c){ return c && liveCrafts[c.name]; });
		this.loadMetadata(this.crafts, savedCrafts, "crafts");

		for (var i = 0; i < this.upgrades.length; i++){
			var upgrade = this.upgrades[i];
			if (upgrade.researched){
				if (upgrade.handler) {
					upgrade.handler(this.game);
				}
				if (upgrade.unlocks) {
					this.game.unlock(upgrade.unlocks);
				}
			}
		}
	},

	getCraftPrice: function(craft) {
		return craft.prices;
	},

	craft: function (res, amt, suppressUndo, forceAll, bypassResourceCheck) {
		var craft = this.getCraft(res);
		if (!craft) { return false; }
		var craftRatio = this.game.getResCraftRatio(res);
		amt = Math.ceil(amt);
		var craftAmt = amt * (1 + craftRatio);

		//prevent undo giving free res
		if (amt < 0 && this.game.resPool.get(res).value < Math.abs(craftAmt)) {
			return false;
		}

		var prices = dojo.clone(this.getCraftPrice(craft));

		for (var i = prices.length - 1; i >= 0; i--) {
			prices[i].val *= amt;
		}

		if (bypassResourceCheck || this.game.resPool.hasRes(prices)) {
			this.game.resPool.payPrices(prices);
			var actualAmtGained = this.game.resPool.addResEvent(res,craftAmt);
			if (craft.upgrades){
				this.game.upgrade(craft.upgrades);
			}

			this.game.stats.getStat("totalCrafts").val++;
			this.game.stats.getStatCurrent("totalCrafts").val++;

			if (!suppressUndo) {
				var undo = this.game.registerUndoChange();
				undo.addEvent(this.id,
				{
					metaId: res,
					resGainedAmt: actualAmtGained,
					resSpent: prices
				}, $I("ui.undo.workshop.craft", [this.game.getDisplayValueExt(actualAmtGained), this.game.resPool.get(res).title]));
			}

            return true;
		} else if (forceAll) {
			this.craftAll(res);
			return true;
		} else {
			return false;
		}
	},

	undo: function(data){
		var resPool = this.game.resPool;
		if (resPool.get(data.metaId).value < data.resGainedAmt) {
			this.game.msg($I("workshop.undo.failure", [resPool.get(data.metaId).title]), "alert", "undo", true);
			return;
		}
		resPool.addResEvent(data.metaId, -data.resGainedAmt);
		data.resSpent.forEach(function(priceLine) {
			var amt = resPool.addResEvent(priceLine.name, priceLine.val);
			if (amt) {
				this.game.msg($I("workshop.undo.regain", [this.game.getDisplayValueExt(amt), resPool.get(priceLine.name).title]),
					null, "undo", true);
			}
		});
	},

	getCraftAllCount: function(craftName){
		var recipe = this.getCraft(craftName);
		if (!recipe) { return 0; }
		var prices = this.getCraftPrice(recipe);
		return Math.floor(this._getCraftAllCountInternal(recipe, prices));
	},

	_getCraftAllCountInternal: function(recipe, prices){
		var minAmt = Number.MAX_VALUE;
		for (var j = prices.length - 1; j >= 0; j--) {
			var totalRes = this.game.resPool.get(prices[j].name).value;
			var allAmt = totalRes / prices[j].val;
			if (allAmt < minAmt){
				minAmt = allAmt;
			}
		}
		return minAmt;
	},

	craftAll: function(craftName) {
		var minAmt = this.getCraftAllCount(craftName);
		if (0 < minAmt && minAmt < Number.MAX_VALUE) {
			var craftRatio = this.game.getResCraftRatio(craftName);
			var res = this.game.resPool.get(craftName);
			if (this.craft(craftName, minAmt, false, false, true)) {
				this.game.msg( $I("workshop.crafted.msg", [this.game.getDisplayValueExt(minAmt * (1 + craftRatio)), (res.title || craftName)]), null, "craft");
			}
		}
	},

	update: function(){
		this.fastforward(1 / this.game.calendar.ticksPerDay);
	},

	fastforward: function(daysOffset) {
		this.updateCraftLimits();
	},

	updateCraftLimits: function() {
		for (var i = 0; i < this.crafts.length; i++) {
			var craft = this.crafts[i];
			craft.isLimited = this.game.resPool.isStorageLimited(this.getCraftPrice(craft));
		}
	},

	unlock: function(upgrade){
		upgrade.researched = true;

		if (upgrade.handler){
			upgrade.handler(this.game);
		}

		if (upgrade.unlocks) {
			this.game.unlock(upgrade.unlocks);
		}

		if (upgrade.upgrades) {
			this.game.upgrade(upgrade.upgrades);
		}
	},

	unlockAll: function(){
		for (var i in this.upgrades){
			this.unlock(this.upgrades[i]);
		}

		for (var i in this.crafts){
			this.crafts[i].unlocked = true;
		}
		this.game.msg($I("workshop.all.upgrades.unlocked"));
	}
});

dojo.declare("com.nuclearunicorn.game.ui.UpgradeButtonController", com.nuclearunicorn.game.ui.BuildingNotStackableBtnController, {

	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.tooltipName = true;
		result.simplePrices = false;
		return result;
	},

	getType: function(){
		return "upgrades";
	},

	getMetadata: function(model){
        if (!model.metaCached){
            model.metaCached = this.game.workshop.get(model.options.id);
        }
        return model.metaCached;
    },

	getPrices: function(model) {
		var prices = this.inherited("getPrices", arguments);

		if (this.game.challenges.isActive("unicornTears")) {
			var multiplier = this.game.getEffect("workshopTearsPricesChallenge");
			if (multiplier > 0) {
				var weight = this.game.challenges.getChallenge("unicornTears").sumPricesWeighted(prices);
				if (weight < 1e6) {
					if (weight > 0) {
						prices.push({ name : "unicorns",
							val: Math.ceil(Math.pow(weight, 2/3) * multiplier)
						});
					}
				} else if (weight < 1e8) {
					prices.push({ name : "tears",
						val: Math.ceil((weight-990000) / 1000 * multiplier)
					});
				} else {
					prices.push({ name : "tears",
						val: Math.ceil((Math.log10(weight)-7) * 100000 * multiplier)
					});
				}
			}
		}

		return prices;
	},

	getName: function(model){
		var name = this.inherited("getName", arguments);
		var meta = model.metadata;
		if (this.game && this.game.cultivation && meta && meta.name && !meta.researched){
			var cult = this.game.cultivation;
			var gate = cult.getItemRealmGate("upgrade", meta.name);
			if (gate && !cult.isItemRealmUnlocked("upgrade", meta.name)){
				name += " <span class=\"xxRealmGateBadge locked\">◈ " + gate.title + "</span>";
			}
		}
		return name;
	},

	updateEnabled: function(model){
		this.inherited(arguments);
		var meta = model.metadata;
		if (this.game && this.game.cultivation && !this.game.devMode && meta && meta.name && !meta.researched){
			if (!this.game.cultivation.isItemRealmUnlocked("upgrade", meta.name)){
				model.enabled = false;
			}
		}
	},

	updateVisible: function(model){
		var upgrade = model.metadata;
		model.visible = upgrade.unlocked;
		if (this.game && this.game.cultivation && upgrade && upgrade.name && !upgrade.researched){
			var cult = this.game.cultivation;
			var gate = cult.getItemRealmGate("upgrade", upgrade.name);
			if (gate && gate.realmIdx > cult.getCurrentRealmIndex() + 1){
				model.visible = false;
			}
		}

		if (upgrade.researched){
			model.visible = false;
		}
	},

	onPurchase: function(model) {
		if (model.metadata.name == "carbonSequestration" && this.game.bld.cathPollution == 0) {
			this.game.achievements.unlockAchievement("betterSafeThanSorry");
			if (this.game.startedWithoutChronospheres) {
				this.game.achievements.unlockStarAchievement("betterSafeThanSorry");
			}
		}
		this.inherited(arguments);
	}
});

dojo.declare("com.nuclearunicorn.game.ui.CraftButtonController", com.nuclearunicorn.game.ui.ButtonModernController, {

	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.hasResourceHover = true;
		result.simplePrices = false;
		return result;
	},

	initModel: function(options) {
		var model = this.inherited("initModel", arguments);
		model.craft = this.getCraft(model);
		return model;
	},

	getCraft: function(model){
		return this.game.workshop.getCraft(model.options.craft);
	},

	updateVisible: function(model){
		model.visible = model.craft.unlocked;
		if (this.game && this.game.cultivation && model.craft && model.craft.name){
			var cult = this.game.cultivation;
			var gate = cult.getItemRealmGate("craft", model.craft.name);
			if (gate && gate.realmIdx > cult.getCurrentRealmIndex() + 1){
				model.visible = false;
			}
		}
	},

	updateEnabled: function(model){
		this.inherited(arguments);
		if (this.game && this.game.cultivation && !this.game.devMode && model.craft && model.craft.name){
			if (!this.game.cultivation.isItemRealmUnlocked("craft", model.craft.name)){
				model.enabled = false;
			}
		}
	},

	getName: function(model){
		var craft = model.craft;
		var baseName;
		if (this.game.science.get("mechanization").researched && craft.value != 0) {
			var progressDisplayed = this.game.toDisplayPercentage(craft.progress, 0, true);
			if (progressDisplayed > 99){
				progressDisplayed = 99;
			}

			if (progressDisplayed < 10) {
				progressDisplayed = "0" + progressDisplayed;
			}

			baseName = "<div class=\"label\"><span class=\"label-content\">" + model.craft.label + "</span></div><div>(" + craft.value + ")</div><div class=\"progress\">[" + progressDisplayed + "%]</div>";
		} else {
			baseName = this.inherited("getName", arguments);
		}
		if (this.game && this.game.cultivation && craft && craft.name){
			var cult = this.game.cultivation;
			var gate = cult.getItemRealmGate("craft", craft.name);
			if (gate && !cult.isItemRealmUnlocked("craft", craft.name)){
				baseName += " <span class=\"xxRealmGateBadge locked\">◈ " + gate.title + "</span>";
			}
		}
		return baseName;
	},

	getDescription: function(model) {
		var craft = model.craft;
		var desc = craft.description;

		var craftBonus = this.game.getResCraftRatio(craft.name);
		if (craft.name != "wood") {
			craftBonus -= this.game.getCraftRatio();
		}

		if (craftBonus > 0) {
			desc += "<br /><br />" + $I("workshop.craftBtn.desc.effectivenessBonus", [this.game.getDisplayValueExt(100 * craftBonus, false, false, 0)]);
		}
		return desc;
	},

	fetchModel: function(options){
		var model = this.inherited("fetchModel", arguments);
		model.assignCraftLinks = [];
		model.unassignCraftLinks = [];
		return model;
	},

	buyItem: function(model, event) {
		var wasCraftSuccessful = this.game.workshop.craft(model.craft.name, 1);
		if (wasCraftSuccessful) {
			return {
				itemBought: true,
				reason: "paid-for"
			};
		} else {
			return {
				itemBought: false,
				reason: "cannot-afford"
			};
		}
	}
});


dojo.declare("com.nuclearunicorn.game.ui.CraftButton", com.nuclearunicorn.game.ui.ButtonModern, {
	craftName: null,

	constructor: function(opts, game){
		this.craftName = opts.craft;
	},

	setEnabled: function(enabled){
		this.inherited(arguments);

		dojo.removeClass(this.domNode, "bldEnabled");
		dojo.removeClass(this.domNode, "bldlackResConvert");
		var craft = this.model.craft;
		if (craft.value > 0) {
			if (craft.isLimitedAmt) {
				dojo.addClass(this.domNode, "bldlackResConvert");
			} else {
				dojo.addClass(this.domNode, "bldEnabled");
			}
		}
	},


	renderLinks: function(){
		if (this.model.unassignCraftLinks) {
			this.unassignCraftLinks = this.addLinkList(this.model.unassignCraftLinks);
		}
		if (this.model.assignCraftLinks){
			this.assignCraftLinks = this.addLinkList(this.model.assignCraftLinks);
		}
	}

});

dojo.declare("com.nuclearunicorn.game.ui.tab.Workshop", com.nuclearunicorn.game.ui.tab, {

	tdTop: null,

	craftBtns: null,

	resTd: null,

	constructor: function(tabName, game){
		this.game = game;

		this.craftBtns = [];
	},

	render: function(tabContainer){

		this.craftBtns = [];
		this.buttons = [];
		this.resTd = null;
		this.tdTop = null;

		var upgradePanel = new com.nuclearunicorn.game.ui.Panel($I("workshop.upgradePanel.label"), this.game.workshop);
		var content = upgradePanel.render(tabContainer);
		var upgGrid = dojo.create("div", { className: "xx-card-grid" }, content);

		for (var i = 0; i < this.game.workshop.upgrades.length; i++){
			var upgrade = this.game.workshop.upgrades[i];

			var btn = this.createBtn(upgrade);

			btn.updateEnabled();
			btn.updateVisible();

			this.addButton(btn);
			btn.render(upgGrid);
		}

		//------------------------------------------

		var craftPanel = new com.nuclearunicorn.game.ui.Panel($I("workshop.craftPanel.label"), this.game.workshop);
		var content = craftPanel.render(tabContainer);
		var craftGrid = dojo.create("div", { className: "xx-card-grid" }, content);

		var crafts = this.game.workshop.crafts;
		var controller = new com.nuclearunicorn.game.ui.CraftButtonController(this.game);
		for (var i = 0; i < crafts.length; i++ ){
			var craft =  crafts[i];
			if (this.game.cultivation && this.game.cultivation.isCoreRealmResource && !this.game.cultivation.isCoreRealmResource(craft.name)){
				continue;
			}
			var craftBtn = new com.nuclearunicorn.game.ui.CraftButton({
				name: craft.label,
				description: craft.description,
				craft: craft.name,
				prices: this.game.workshop.getCraftPrice(craft),
				controller: controller
			}, this.game);

			craftBtn.render(craftGrid);

			this.craftBtns.push(craftBtn);
		}

		//----------------
		if (this.craftBtns.length === 0 || (!this.game.science.get("construction").researched && !(this.game.cultivation && this.game.cultivation.getCurrentRealmIndex() >= 1))){
			craftPanel.setVisible(false);
		}

		this.update();
	},

	renderResources: function(container){

		dojo.empty(container);

		dojo.create("span", { innerHTML: $I("workshop.craftPanel.counts.label") + ":" },container);

		var table = dojo.create("table", { style: {
			paddingTop: "20px"
		}}, container);

		var resources = this.game.resPool.resources;
		for (var i = 0; i < resources.length; i++){
			var res = resources[i];

			if (res.craftable && res.value){
				var tr = dojo.create("tr", {}, table);

				dojo.create("td", { innerHTML: res.title || res.name + ":" }, tr);
				dojo.create("td", { innerHTML: this.game.getDisplayValueExt(res.value) }, tr);
			}
		}
	},

	createBtn: function(upgrade) {
		var controller = new com.nuclearunicorn.game.ui.UpgradeButtonController(this.game);
		return new com.nuclearunicorn.game.ui.BuildingResearchBtn({id: upgrade.name, controller: controller}, this.game);
	},

	update: function(){
		this.inherited(arguments);

		for (var i = this.craftBtns.length - 1; i >= 0; i--) {
			var craftBtn = this.craftBtns[i];
			craftBtn.update();
			if (craftBtn.model.craft.value > 0 ) {
				dojo.addClass(craftBtn.domNode, "craftOn");
			} else {
				dojo.removeClass(craftBtn.domNode,"craftOn");
			}
		}

		if (this.resTd){
			this.renderResources(this.resTd);
		}

		if (this.tdTop) {
			this.tdTop.innerHTML = "";
		}

		this.updateTab();
	},

	updateTab: function() {
		this.tabName = $I("tab.name.workshop");
		if (this.domNode) {
			this.domNode.innerHTML = this.tabName;
		}
		dojo.publish("ui/refreshTabNames", [this.game]);
	}
});
