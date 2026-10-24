/* global
	WChiral
*/

/**
 * Behold the bringer of light!
 */
dojo.declare("classes.managers.SpaceManager", com.nuclearunicorn.core.TabManager, {

	/*
	 * Planets and celestial bodies from left to right:
	 *
	 * Charon, Umbra (black hole), Yarn (terraformable?), Helios (Sun), Cath, Redmoon (Cath satellite), Dune, Piscine, Terminus (ice giant), Kairo (dwarf planet)
	 *
	 */

	game: null,

	hideResearched: false,

	spaceBuildingsMap: [],

	programs: [{
		name: "orbitalLaunch",
		label: $I("space.orbitalLaunch.label"),
		description: $I("space.orbitalLaunch.desc"),
		prices: [
			{name: "oil", val: 15000},
			{name: "titanium", val: 2500},
			{name: "science", val: 100000},
			{name: "starchart", val: 250}
		],
        unlocks: {
            planet: ["cath"],
            spaceMission: ["moonMission"]
        }
	},{
		name: "moonMission",
		label: $I("space.moonMission.label"),
		description: $I("space.moonMission.desc"),
		prices: [
			{name: "titanium", 	val: 5000},
			{name: "oil", 		val: 45000},
			{name: "science", 	val: 125000},
			{name: "starchart", val: 500}
		],
        unlocks: {
            planet: ["moon"],
            spaceMission: ["duneMission", "piscineMission"]
        }
	},{
		name: "duneMission",
		label: $I("space.duneMission.label"),
		description: $I("space.duneMission.desc"),
		prices: [{ name: "titanium", val: 7000 }, { name: "science", val: 175000 }, { name: "starchart", val: 1000 }, { name: "oil", val: 3750 }],
		unlocks: {
            planet: ["dune"],
            spaceMission: ["heliosMission"]
        }
	},{
		name: "piscineMission",
		label: $I("space.piscineMission.label"),
		description: $I("space.piscineMission.desc"),
		prices: [{ name: "titanium", val: 9000 }, { name: "science", val: 200000 }, { name: "starchart", val: 1500 }, { name: "oil", val: 12500 }],
        unlocks: {
            planet: ["piscine"],
            spaceMission: ["terminusMission"]
        }
	},{
		name: "heliosMission",
		label: $I("space.heliosMission.label"),
		description: $I("space.heliosMission.desc"),
		prices: [{ name: "titanium", val: 15000 }, { name: "science", val: 250000 }, { name: "starchart", val: 3000 }, { name: "oil", val: 62500 }],
        unlocks: {
            planet: ["helios"],
            spaceMission: ["yarnMission"]
        }
	},{
		name: "terminusMission",
		label: $I("space.terminusMission.label"),
		description: $I("space.terminusMission.desc"),
		prices: [{ name: "titanium", val: 12000 }, { name: "science", val: 225000 }, { name: "starchart", val: 2500 }, { name: "oil", val: 37500 }],
        unlocks: {
            planet: ["terminus"],
            spaceMission: ["heliosMission", "kairoMission"]
        }
	},{
		name: "kairoMission",
		label: $I("space.kairoMission.label"),
		description: $I("space.kairoMission.desc"),
		prices: [{ name: "titanium", val: 20000 }, { name: "science", val: 300000 }, { name: "starchart", val: 5000 }, { name: "oil", val: 75000 }],
		unlocks: {
			planet: ["kairo"],
            spaceMission: ["rorschachMission"]
		}
	},{
		name: "rorschachMission",
		label: $I("space.rorschachMission.label"),
		description: $I("space.rorschachMission.desc"),
		prices: [{ name: "titanium", val: 60000 }, { name: "science", val: 500000 }, { name: "starchart", val: 15000 }, { name: "oil", val: 150000 }],
		unlocks: {
			spaceMission: ["centaurusSystemMission"]
		}
	},{
		name: "yarnMission",
		label: $I("space.yarnMission.label"),
		description: $I("space.yarnMission.desc"),
		prices: [{ name: "titanium", val: 35000 }, { name: "science", val: 350000 }, { name: "starchart", val: 7500 }, { name: "oil", val: 100000 }],
		unlocks: {
			planet: ["yarn"],
			spaceMission: ["umbraMission"]
		}
	},{
		name: "umbraMission",
		label: $I("space.umbraMission.label"),
		description: $I("space.umbraMission.desc"),
		prices: [{ name: "science", val: 500000 }, { name: "starchart", val: 25000 }, { name: "oil", val: 150000 }, { name: "uranium", val: 25000 }],
		unlocks: {
			planet: ["umbra"],
			spaceMission: ["charonMission"]
		}
	},{
		name: "charonMission",
		label: $I("space.charonMission.label"),
		description: $I("space.charonMission.desc"),
		prices: [{ name: "science", val: 750000 }, { name: "starchart", val: 75000 }, { name: "oil", val: 200000 }, { name: "uranium", val: 45000 }],
		unlocks: {
			planet: ["charon"]
		}
	},{
		name: "centaurusSystemMission",
		label: $I("space.centaurusSystemMission.label"),
		description: $I("space.centaurusSystemMission.desc"),
		prices: [{ name: "titanium", val: 40000 }, { name: "science", val: 800000 }, { name: "starchart", val: 100000 }, { name: "oil", val: 250000 }, { name: "uranium", val: 65000 }],
		unlocks: {
			challenges: ["energy"],
			planet: ["centaurusSystem"],
			spaceMission: ["furthestRingMission"]
		}
	},{
		name: "furthestRingMission",
		label: $I("space.furthestRingMission.label"),
		description: $I("space.furthestRingMission.desc"),
		prices: [{ name: "science", val: 1250000 }, { name: "starchart", val: 500000 }, { name: "oil", val: 350000 }, { name: "uranium", val: 90000 }],
		unlocks: {
			planet: ["furthestRing"]
		}
	}],

	//============================================================================

	planets:
	[{
		name: "cath",
		label: $I("space.planet.cath.label"),
		routeDays: 0,
		buildings: [{
			name: "spaceElevator",
			label: $I("space.planet.cath.spaceElevator.label"),
			description: $I("space.planet.cath.spaceElevator.desc"),
			unlocked: false,
			priceRatio: 1.15,
			prices: [
				{name: "titanium", val: 6000},
				{name: "unobtainium", val: 50},
				{name: "science", val: 75000}
			],
			requiredTech: ["orbitalEngineering", "nanotechnology"],
			effects: {
				"oilReductionRatio": 0,
				"spaceRatio": 0,
				"prodTransferBonus" : 0
			},
			calculateEffects: function(self, game){
				self.effects = {
					"oilReductionRatio": 0.05,
					"spaceRatio": 0.01,
					"prodTransferBonus" : 0.001
				};
			},
		},{
			name: "sattelite",
			label: $I("space.planet.cath.sattelite.label"),
			description: $I("space.planet.cath.sattelite.desc"),
			unlocked: false,
			prices: [
				{name: "titanium", val: 2500},
				{name: "oil", val: 15000},
				{name: "science", val: 100000},
				{name: "starchart", val: 325}
			],
			priceRatio: 1.08,
			requiredTech: ["sattelites"],
			effects: {
				"observatoryRatio": 0,
				"starchartPerTickBaseSpace": 0,
				"energyConsumption": 0,
				"energyProduction": 0
			},
			calculateEffects: function(self, game){
				if (self.val > 0){
					game.time.queue.unlockQueueSource("spaceBuilding");
				}
                var observatoryRatioTemp = 0.05;
				self.effects = {
					"observatoryRatio": observatoryRatioTemp,
					"starchartPerTickBaseSpace": 0.001,
					"energyConsumption": 0,
					"energyProduction": 0
				};
				if (game.workshop.get("solarSatellites").researched) {
					self.effects["energyProduction"] = 1;
					self.on = self.val;
					self.togglable = false;
				}
				else {
					self.effects["energyConsumption"] = 1;
				}

				game.upgrade(self.upgrades); //this way observatories won't have to use action

				if (game.challenges.isActive("blackSky")) {
					self.effects['starchartPerTickBaseSpace'] *= 1 / (1 + game.getEffect('bskSattelitePenalty'));
				}
			},
			upgrades: {
				buildings: ["observatory"],
				challenges: ["blackSky"]
			},
			unlockScheme: {
				name: "space",
				threshold: 24
			}
		},{
			name: "spaceStation",
			label: $I("space.planet.cath.spaceStation.label"),
			description: $I("space.planet.cath.spaceStation.desc"),
			unlocked: false,
			prices: [
				{name: "oil", val: 35000},
				{name: "science", val: 150000},
				{name: "starchart", val: 425},
				{name: "alloy", 	val: 750}
			],
			priceRatio: 1.12,
			requiredTech: ["orbitalEngineering"],
			effects: {
				"scienceRatio": 0,
				"xiuweiPerTickBase": 0,
				"energyConsumption": 0
			},
			calculateEffects: function(self, game){
				var effects = {
					"scienceRatio": 0.5,
					"xiuweiPerTickBase": 0.02
				};
				effects["energyConsumption"] = 10;
				self.effects = effects;
			},
			breakIronWill: true
		}],

		calculateEffects: function(self, game){
			if (game.science.get("rocketry").researched){
				game.time.queue.unlockQueueSource("spaceMission");
			}
		}
	},{
		name: "moon",
		label: $I("space.planet.moon.label"),
		routeDays: 30,
		buildings: [{
			name: "moonOutpost",
			label: $I("space.planet.moon.moonOutpost.label"),
			description: $I("space.planet.moon.moonOutpost.desc"),
			unlocked: false,
			priceRatio: 1.12,
			prices: [{ name: "oil", val: 45000 }, { name: "uranium", val: 500 }, { name: "science", val: 100000 }, { name: "starchart", val: 650 }, { name: "slab", val: 4500 }, { name: "alloy", val: 750 }],
			effects: {
				"uraniumPerTickCon": 0,
				"unobtainiumPerTickSpace": 0,
				"energyConsumption": 0
			},
			calculateEffects: function(self, game){
				var effects = {
					"uraniumPerTickCon": -0.35,
					"unobtainiumPerTickSpace": 0.015 * (1 + game.getEffect("lunarOutpostRatio"))
				};
				effects["energyConsumption"] = 5;

				self.effects = effects;
			},
			lackResConvert: false,
			action: function(self, game){
				self.effects["uraniumPerTickCon"] = -0.35;
				self.effects["unobtainiumPerTickSpace"] = 0.015 * (1 + game.getEffect("lunarOutpostRatio"));
				var amt = game.resPool.getAmtDependsOnStock(
					[{res: "uranium", amt: -self.effects["uraniumPerTickCon"]}],
					self.on
				);
				self.effects["uraniumPerTickCon"] *= amt;
				self.effects["unobtainiumPerTickSpace"] *= amt;

				return amt;
			}
		},{
			name: "moonBase",
			label: $I("space.planet.moon.moonBase.label"),
			description: $I("space.planet.moon.moonBase.desc"),
			unlocked: false,
			priceRatio: 1.12,
			prices: [{ name: "titanium", val: 9500 }, { name: "oil", val: 45000 }, { name: "unobtainium", val: 50 }, { name: "science", val: 100000 }, { name: "starchart", val: 700 }, { name: "slab", val: 7500 }],
			effects: {
				"catnipMax"         : 0,
				"woodMax"           : 0,
				"mineralsMax"       : 0,
				"coalMax"           : 0,
				"ironMax"           : 0,
				"titaniumMax"       : 0,
				"oilMax"            : 0,
				"unobtainiumMax"    : 0,
				"energyConsumption" : 0
			},
			calculateEffects: function(self, game){
				var spaceportRatio = 1 + game.getEffect( "moonBaseStorageBonus" );
				var effects = {
					"catnipMax"         : 45000 * spaceportRatio,
					"woodMax"           : 25000 * spaceportRatio,
					"mineralsMax"       : 30000 * spaceportRatio,
					"coalMax"           : 3500 * spaceportRatio,
					"ironMax"           : 9000 * spaceportRatio,
					"titaniumMax"       : 1250 * spaceportRatio,
					"oilMax"            : 25000 * spaceportRatio,
					"unobtainiumMax"    : 1200 * spaceportRatio,
					"energyConsumption" : 0
				};
				effects["energyConsumption"] = game.workshop.get("amBases").researched ? 5 : 10;

				if (game.workshop.get("aiBases").researched){
                    var aiBasesModifier = 1;
					for (var key in effects){
						if (key != "energyConsumption" ){
							effects[key] *= (1 + game.bld.get("aiCore").on * 0.1 * aiBasesModifier);
						}
					}
				}
				self.effects = effects;
			}
		}]
	},{
		name: "dune",
		label: $I("space.planet.dune.label"),
		routeDays: 356,
        buildings: [{
            name: "planetCracker",
            label: $I("space.planet.dune.planetCracker.label"),
            description: $I("space.planet.dune.planetCracker.desc"),
            unlocked: false,
            priceRatio: 1.18,
            prices: [{ name: "science", val: 125000 }, { name: "starchart", val: 2500 }, { name: "alloy", val: 1750 }, { name: "oil", val: 2500 }],
            effects: {
				"uraniumPerTickSpace" : 0,
				"uraniumMax" : 0
            },
			calculateEffects: function (self, game){
				self.effects = {
					"uraniumPerTickSpace" : 0.5 * (1 + game.getEffect("crackerRatio")),
					"uraniumMax" : 8000 * (1 + game.getEffect("planetCrackerStorageBonus"))
				};
			}
        },{
            name: "hydrofracturer",
            label: $I("space.planet.dune.hydrofracturer.label"),
            description: $I("space.planet.dune.hydrofracturer.desc"),
            unlocked: false,
            priceRatio: 1.18,
            prices: [{ name: "science", val: 150000 }, { name: "starchart", val: 750 }, { name: "alloy", val: 1025 }, { name: "oil", val: 5000 }],
            effects: {
				"oilPerTickAutoprodSpace": 0
            },
			calculateEffects: function(self, game){
				self.effects = {
					"oilPerTickAutoprodSpace": 0.5
				};
			},
			unlockScheme: {
			name: "fluid",
			threshold: 10
			}
        },{
			name: "spiceRefinery",
			label: $I("space.planet.dune.spiceRefinery.label"),
			description: $I("space.planet.dune.spiceRefinery.desc"),
			unlocked: false,
			priceRatio: 1.15,
			prices: [{ name: "science", val: 75000 }, { name: "starchart", val: 500 }, { name: "alloy", val: 500 }, { name: "oil", val: 6250 }],
			effects: {
				"spicePerTickAutoprodSpace": 0
			},
			calculateEffects: function(self, game){
				self.effects = {
					"spicePerTickAutoprodSpace": 0.025
				};
			},
			unlockScheme: {
				name: "dune",
				threshold: 10
			}
		}]
	},{
		name: "piscine",
		label: $I("space.planet.piscine.label"),
		routeDays: 256,
		buildings: [{
            name: "researchVessel",
            label: $I("space.planet.piscine.researchVessel.label"),
            description: $I("space.planet.piscine.researchVessel.desc"),
            unlocked: false,
            priceRatio: 1.15,
            prices: [{ name: "titanium", val: 12500 }, { name: "starchart", val: 100 }, { name: "alloy", val: 2500 }, { name: "oil", val: 12500 }],
            effects: {
				"scienceMax": 0,
				"starchartPerTickBaseSpace": 0
			},
			calculateEffects: function(self, game) {
				self.effects = {
					"scienceMax": 50000 * (1 + game.getEffect("spaceScienceRatio")),
					"starchartPerTickBaseSpace": game.challenges.isActive("blackSky") ? 0 : 0.01
				};
            },
			unlockScheme: {
				name: "vessel",
				threshold: 20
			}
        },{
            name: "orbitalArray",
            label: $I("space.planet.piscine.orbitalArray.label"),
            description: $I("space.planet.piscine.orbitalArray.desc"),
            unlocked: false,
            priceRatio: 1.15,
            prices: [{ name: "science", val: 250000 }, { name: "starchart", val: 2000 }, { name: "eludium", val: 100 }, { name: "oil", val: 25000 }],
            effects: {
				"spaceRatio": 0,
				"energyConsumption" : 0
				},
            calculateEffects: function(self, game){
				var effects = {
					"spaceRatio": 0.02
				};
				effects["energyConsumption"] = 20;
				self.effects = effects;
            }
        }]
	},{
		name: "helios",		//technically it is a planet from the game point of view
		label: $I("space.planet.helios.label"),
		routeDays: 1200,
		buildings: [{
            name: "sunlifter",
            label: $I("space.planet.helios.sunlifter.label"),
            description: $I("space.planet.helios.sunlifter.desc"),
            unlocked: false,
            priceRatio: 1.15,
            prices: [{ name: "science", val: 500000 }, { name: "eludium", val: 225 }, { name: "oil", val: 75000 }],
            effects: {
				"antimatterProduction": 0,
				"energyProduction" : 0
			},
            calculateEffects: function(self, game){
				self.effects = {
					"antimatterProduction": 1,
					"energyProduction" : 30
				};
            }
        },{
			name: "containmentChamber",
			label: $I("space.planet.helios.containmentChamber.label"),
			description: $I("space.planet.helios.containmentChamber.desc"),
			unlocked: false,
			priceRatio: 1.125,
			prices: [{ name: "science", val: 500000 }, { name: "oil", val: 75000 }],
			effects: {
				"antimatterMax": 0,
				"energyConsumption": 0
			},
			calculateEffects: function(self, game){
				var effects = {
					"antimatterMax": 250 * (1 + game.space.getBuilding("heatsink").val * 0.02),
					"energyConsumption" : 50 * (1 + game.space.getBuilding("heatsink").val * 0.01)
				};

				self.effects = effects;
			}
		},{
			name: "heatsink",
			label: $I("space.planet.helios.heatsink.label"),
			description: $I("space.planet.helios.heatsink.desc"),
			unlocked: false,
			priceRatio: 1.12,
			prices: [{ name: "science", val: 125000 }, { name: "relic", val: 1 }, { name: "oil", val: 90000 }, { name: "uranium", val: 20000 }],
			effects: {
			},
			calculateEffects: function(self, game){
			},
			upgrades: {
				spaceBuilding: ["containmentChamber"]
			}
		},{
			name: "sunforge",
			label: $I("space.planet.helios.sunforge.label"),
			description: $I("space.planet.helios.sunforge.desc"),
			unlocked: false,
			priceRatio: 1.12,
			prices: [{ name: "unobtainium", val: 250 }, { name: "science", val: 100000 }, { name: "relic", val: 1 }, { name: "oil", val: 62500 }],
			effects: {
				"baseMetalMaxRatio": 0.01
			},
			calculateEffects: function(self, game){
				//todo use secondary booster structure
			}/*,
			upgrades: {
				spaceBuilding: ["containmentChamber"]
			}*/
		}]
	},{
		name: "terminus",
		label: $I("space.planet.terminus.label"),
		routeDays: 2500,
        buildings:[{
            name: "cryostation",
            label: $I("space.planet.terminus.cryostation.label"),
            description: $I("space.planet.terminus.cryostation.desc"),
            unlocked: false,
            priceRatio: 1.12,
            prices: [{ name: "science", val: 200000 }, { name: "slab", val: 45000 }, { name: "eludium", val: 25 }, { name: "oil", val: 25000 }],
            effects: {
				"woodMax"       : 0,
				"mineralsMax"   : 0,
				"coalMax"       : 0,
				"ironMax"       : 0,
				"titaniumMax"   : 0,
				"oilMax"        : 0,
				"uraniumMax"    : 0,
				"unobtainiumMax": 0
			},
            calculateEffects: function(self, game){
				var ratio = 1 + game.getEffect("cryostationStorageBonus");
				self.effects = {
					"woodMax"       : 200000 * ratio,
					"mineralsMax"   : 200000 * ratio,
					"coalMax"       : 25000 * ratio,
					"ironMax"       : 50000 * ratio,
					"titaniumMax"   : 7500 * ratio,
					"oilMax"        : 35000 * ratio,
					"uraniumMax"    : 15000 * ratio,
					"unobtainiumMax": 2500 * ratio
				};
            },
			unlockScheme: {
				name: "arctic",
				threshold: 10
			}
        }
        ]
	},{
		name: "kairo",
		label: $I("space.planet.kairo.label"),
		routeDays: 5000,
		buildings:[
			{
				name: "spaceBeacon",
				label: $I("space.planet.kairo.spaceBeacon.label"),
				description: $I("space.planet.kairo.spaceBeacon.desc"),
				unlocked: false,
				priceRatio: 1.15,
				prices: [{ name: "eludium", val: 50 }, { name: "starchart", val: 25000 }, { name: "alloy", val: 15000 }, { name: "oil", val: 120000 }],
				effects: {
					"scienceMax": 100000,
					"starchartPerTickBaseSpace": 0.025,
					"relicPerDay": 0
				},
				action: function(self, game){

					var rPerDay = game.getEffect("beaconRelicsPerDay");
					var rrBoost = 1 + game.getEffect("relicRefineRatio") * game.religion.getZU("blackPyramid").getEffectiveValue(game) * 0.1;	//10% per BP * BN combo

					//lol
					var amMax = game.resPool.get("antimatter").maxValue;
					if (amMax < 5000) {
						rrBoost = rrBoost * (amMax / 5000);
						//todo: consider boosting relic stations is over 5000
					}

					var entBoost = (1 + game.space.getBuilding("entangler").effects["hashRateLevel"] * 0.25);	//25% per entangler hashrate

					self.effects = {
						"scienceMax": 100000 * (1 + game.getEffect("spaceScienceRatio")),
						"starchartPerTickBaseSpace": 0.025,
						"relicPerDay": rPerDay * rrBoost * entBoost
					};
				}
			}
		]
	},{
		name: "yarn",
		label: $I("space.planet.yarn.label"),
		routeDays: 3800,
		buildings:[
			{
				name: "terraformingStation",
				label: $I("space.planet.yarn.terraformingStation.label"),
				description: $I("space.planet.yarn.terraformingStation.desc"),
				unlocked: false,
				priceRatio: 1.25,
				prices: [{ name: "uranium", val: 5000 }, { name: "eludium", val: 25 }, { name: "oil", val: 90000 }],
				requiredTech: ["terraformation"],
				effects: {
					"xiuweiPerTickBase": 0.01
				},
				updateEffects: function(self, game) {
					self.effects["xiuweiPerTickBase"] = 0.01 * (1 + game.getEffect("terraformingMaxKittensRatio"));
				},
				action: function(self, game) {
					self.updateEffects(self, game);
				},
				breakIronWill: true
			},
			{
				name: "hydroponics",
				label: $I("space.planet.yarn.hydroponics.label"),
				description: $I("space.planet.yarn.hydroponics.desc"),
				unlocked: false,
				priceRatio: 1.15,
				prices: [{ name: "unobtainium", val: 1 }, { name: "oil", val: 25000 }],
				requiredTech: ["hydroponics"],
				effects: {
					"catnipRatio": 0.025,
					"catnipMaxRatio": 0.1,
					"terraformingMaxKittensRatio": 0
				},
				upgrades: {
					spaceBuilding: ["terraformingStation"]
				},
				// TODO Actually "action" is almost always just updating effects (unclear from the name), better separate the 2 concerns: update effects (can be done several times per tick) and perform specific action (only once per tick!)
				// TODO Separation of concerns currently done only for AI Core, Time Boilers and Hydroponics (REQUIRED by non-proportional effect!), will be systematized later
				updateEffects: function(self, game) {
					// 0 HP = +0%
					// 100 HP = +100%
					// 300 HP = +200%
					self.effects["terraformingMaxKittensRatio"] = game.getUnlimitedDR(self.on, 100) / self.on;
					// Reset each tick because of cycle effect (from Yarn and Piscine) being applied continuously, due to presence of method "action"
					self.effects["catnipRatio"] = 0.025;
				},
				action: function(self, game) {
					self.updateEffects(self, game);
				}
			}
		]
	},{
		name: "umbra",
		label: $I("space.planet.umbra.label"),
		routeDays: 7500,
		buildings:[
			{
				name: "hrHarvester",
				label: $I("space.planet.umbra.hrHarvester.label"),
				description: $I("space.planet.umbra.hrHarvester.desc"),
				unlocked: true,
				priceRatio: 1.15,
				prices: [
					{name: "unobtainium", val: 1250 },
					{name: "relic", val: 25 }
				],
				effects: {
					"energyProduction": 1
				},
				calculateEffects: function(self, game) {
					var yearBonus = game.calendar.darkFutureYears();
					if (yearBonus < 0){
						yearBonus = 0;
					}

					self.effects["energyProduction"] =
						(1 + game.getUnlimitedDR(yearBonus, 0.075) * 0.01) *
						(1 + game.getEffect("umbraBoostRatio"));
				}
			},{
				name: "navigationRelay",
				label: $I("space.planet.umbra.navigationRelay.label"),
				description: $I("space.planet.umbra.navigationRelay.desc"),
				unlocked: false,
				requiredTech: false,
				priceRatio: 1.2,
				prices: [{ name: "titanium", val: 50000 }, { name: "slab", val: 150000 }],
				effects: {} // TBD
			}, {
				name: "spaceShuttle",
				label: $I("space.planet.umbra.spaceShuttle.label"),
				description: $I("space.planet.umbra.spaceShuttle.desc"),
				unlocked: false,
				requiredTech: false,
				priceRatio: 1.15,
				prices: [
					{name: "unobtainium", val: 50 }, // TBD
					{name: "eludium", val: 500 }
				],
				effects: {} // TBD
			}
		]
	},{
		name: "charon",
		label: $I("space.planet.charon.label"),
		routeDays: 25000,
		buildings:[
			{
				name: "entangler",
				label: $I("space.planet.charon.entangler.label"),
				description: $I("space.planet.charon.entangler.desc"),
				unlocked: false,
				priceRatio: 1.15,
				prices: [
					{name: "timeCrystal", val: 25 },
					{name: "relic", val: 1250 },
					{name: "eludium", val: 5000 }
				],
				requiredTech: ["quantumCryptography"],
				hashrates: 0,
				effects: {
					"hashrate": 0,
					"hashRateLevel": 0,
					"nextHashLevelAt": 0,
					"hrProgress": 0,
					"energyConsumption": 25
				},
				action: function(self, game){
					var aiCore = game.bld.get("aiCore");
					var gflopsPerTick = 0.1 * self.on;
					var avail = (aiCore && aiCore.gflops) ? aiCore.gflops : 0;
					var consumed = Math.min(avail, gflopsPerTick);
					if (consumed > 0 && aiCore) {
						aiCore.gflops -= consumed;
						self.hashrates = (self.hashrates || 0) + consumed;
					}

					var hr = self.hashrates || 0,
						difficulty = 1000,
						rate = 1.6;

					self.effects["hashrate"] = hr;
					self.effects["nextHashLevelAt"] = difficulty * Math.pow(rate, self.effects["hashRateLevel"] + 1);
					self.effects["hrProgress"] = hr / (difficulty * Math.pow(rate, self.effects["hashRateLevel"] + 1));
					if (hr > difficulty){
						self.effects["hashRateLevel"] = Math.floor(Math.log(hr / difficulty) / Math.log(rate));
					} else {
						self.effects["hashRateLevel"] = 0;
					}

					if (hr == 0) {
						self.effects["hashrate"] = 0;
						self.effects["nextHashLevelAt"] = 0;
						self.effects["hrProgress"] = 0;
						self.effects["hashRateLevel"] = 0;
					}
				}
			}
		]
	},{
		name: "centaurusSystem",
		label: $I("space.planet.centaurusSystem.label"),
		routeDays: 120000,
		buildings:[
			{
				name: "tectonic",
				label: $I("space.planet.centaurusSystem.tectonic.label"),
				description: $I("space.planet.centaurusSystem.tectonic.desc"),
				unlocked: false,
				priceRatio: 1.25,
				prices: [{ name: "eludium", val: 200 }, { name: "uranium", val: 75000 }],
				requiredTech: ["terraformation"],
				effects: {
					"energyProduction": 0
				},
				calculateEffects: function(self, game){
					self.effects = {
						"energyProduction": 25 * (1 + game.getEffect("tectonicBonus"))
					};
				}
			}, {
				name: "moltenCore",
				label: $I("space.planet.centaurusSystem.moltenCore.label"),
				description: $I("space.planet.centaurusSystem.moltenCore.desc"),
				unlocked: false,
				priceRatio: 1.25,
				prices: [
					{name: "uranium", val: 90000 },
					{name: "science", val: 1500000 }
				],
				effects: {
					"tectonicBonus": 0.05
				},
				requiredTech: ["exogeophysics"],
				upgrades: {
					spaceBuilding: ["tectonic"]
				}
			}
		]
	},{
		name: "furthestRing",
		label: $I("space.planet.furthestRing.label"),
		routeDays: 725000000,
		buildings:[
			//TBD
		]
	}],

	metaCache: null,

	//============================================================================

	constructor: function(game){
		this.game = game;
		this.metaCache = {};
		this.registerMeta("stackable", this.programs, null);
		for (var i in this.planets) {
			var planet = this.planets[i];
			this.registerMeta(false, planet.buildings, { getEffect: function(building, effectName){
				if (!building.effects){
					return 0;
				} else {
					//There are 4 specially calculated effects that aren't supposed to be multiplied by the number of buildings,
					//because they're properties of the building category as a whole, not any individual building.
					if (effectName === "hashrate" || effectName === "hashRateLevel" ||
					    effectName === "nextHashLevelAt" || effectName === "hrProgress")
					{
						//For these 4 specially calculated effects, don't multiply by building.on and don't apply spaceRatio.
						return building.effects[effectName];
					}
					//Else, this isn't one of the special effects, so compute it normally.
					var spaceRatio = (effectName == "spaceRatio" && game.resPool.energyCons > game.resPool.energyProd) ? game.resPool.getEnergyDelta() : 1;
					return building.effects[effectName] * building.on * spaceRatio;
				}
			}});
		}
		// Keep default route days to reset state after reset or load
		for (var i in this.planets) {
			this.planets[i].routeDaysDefault = this.planets[i].routeDays;
		}
		this.setEffectsCachedExisting();

		// Cache spaceBuildingsMap
		for (var i = 0; i < this.planets.length; i++) {
			var spaceBuildings = this.planets[i].buildings.map(function(building){
				return building.name;
			});
			for (var j = 0; j < spaceBuildings.length; j++) {
				this.spaceBuildingsMap.push(spaceBuildings[j]);
			}
		}
	},

	resetState: function(){
		for (var i = 0; i < this.programs.length; i++){
			var program = this.programs[i];

			program.unlocked = program.name == "orbitalLaunch";
			program.noStackable = true;

			this.resetStateStackable(program);
		}

		for (i = 0; i < this.planets.length; i++){
			var planet = this.planets[i];
			planet.unlocked = false;
			planet.reached = false;
			planet.routeDays = planet.routeDaysDefault;

			if (planet.buildings){
				for (var j = 0; j < planet.buildings.length; j++){
					var program = planet.buildings[j];
					program.unlocked = false;

					this.resetStateStackable(program);
				}
			}
		}

		this.hideResearched = false;
	},

	save: function(saveData){

		var planets = this.filterMetadata(this.planets, ["name", "buildings", "reached", "unlocked", "routeDays"]);

		for (var i = 0; i < planets.length; i++){
			var planet = planets[i];
			if (planet.buildings){
				planet.buildings = this.filterMetadata(planet.buildings, ["name", "val", "on", "unlocked"]);
			}
		}

		saveData.space = {
			hideResearched: this.hideResearched,
			programs: this.filterMetadata(this.programs, ["name", "val", "on", "unlocked"]),
			planets: planets
		};
	},

	load: function(saveData){
		if (!saveData.space){
			return;
		}

		this.hideResearched = saveData.space.hideResearched || false;
		this.loadMetadata(this.programs, saveData.space.programs, "programs");
		this.loadMetadata(this.planets, saveData.space.planets, "planets");

		//TODO: move to some common method?
		for (var i = this.programs.length - 1; i >= 0; i--) {
			var program = this.programs[i];
			if (program.val && program.unlocks){
				this.game.unlock(program.unlocks);
			}
		}

		for (var i = this.planets.length - 1; i >= 0; i--){
			var planet = this.planets[i];
			if (planet.buildings){
				for (var j = planet.buildings.length - 1; j >= 0; j--){
					var bld = planet.buildings[j];
					if (bld.val && bld.unlocks){
						this.game.unlock(bld.unlocks);
					}
				}
			}
		}
	},

	update: function(){
		for (var i in this.planets){
			var planet = this.planets[i];

			if (!planet.reached && planet.unlocked) {
				if (planet.routeDays > 0) {
					var routeSpeed = this.game.getEffect("routeSpeed") != 0 ? this.game.getEffect("routeSpeed") : 1;
					planet.routeDays -= routeSpeed / this.game.calendar.ticksPerDay;
				} else {
					planet.routeDays = 0;
					planet.reached = true;
					this.game.time.queue.unlockQueueSource("spaceBuilding");
					this.game.msg($I("space.newplanet.log.msg"), "important");
				}
			}

			for (var j in planet.buildings){
				var bld = planet.buildings[j];

				if (!bld.unlocked && planet.reached) {
					if (typeof(bld.requiredTech) == "undefined"){
						bld.unlocked = true;
					} else if (bld.requiredTech) {
						var isUnlocked = true;
						for (var i = bld.requiredTech.length - 1; i >= 0; i--) {
							var tech = this.game.science.get(bld.requiredTech[i]);
							if (!tech.researched){
								isUnlocked = false;
							}
						}
						bld.unlocked = isUnlocked;
					}
				}

				if (bld.action && (bld.val > 0 || bld.name == "entangler")){ //Entanglers need to update hashrate level if we import a save that has 0 of them
					var amt = bld.action(bld, this.game);
					if (typeof(amt) != "undefined") {
						bld.lackResConvert = amt != 1 && bld.on != 0;
					}
					this.game.calendar.cycleEffectsBasics(bld.effects, bld.name);
				}
			}
		}

		for (var i = 0; i < this.programs.length; i++) {
			var program = this.programs[i];

			if (program.val > 0 && !program.on){
				if (program.unlocks && program.unlocks.planet){
					var planet = this.getPlanet(program.unlocks.planet[0]);
					if (planet && planet.reached){
						program.on = 1;
					}
				} else {
					program.on = 1; //just set on if no corresponding planet
				}
			}
		}
	},

	fastforward: function(daysOffset) {
		var times = daysOffset * this.game.calendar.ticksPerDay;
		for (var i in this.planets){
			var planet = this.planets[i];

			if (!planet.reached && planet.unlocked) {
				if (planet.routeDays > 0) {
					var routeSpeed = this.game.getEffect("routeSpeed") != 0 ? this.game.getEffect("routeSpeed") : 1;
					planet.routeDays -= times * routeSpeed / this.game.calendar.ticksPerDay;
				}
			}
		}

		var entangler = this.getBuilding("entangler");
		var aiCore = this.game.bld.get("aiCore");
		var existingGFlops = (aiCore && aiCore.gflops) ? aiCore.gflops : 0;
		var gflopsAttemptConsume = 0.1 * entangler.on * times;
		var gflopsConsume = Math.min(existingGFlops, gflopsAttemptConsume);
		if (gflopsConsume <= 0) {
			return;
		}
		if (aiCore) { aiCore.gflops -= gflopsConsume; }
		entangler.hashrates = (entangler.hashrates || 0) + gflopsConsume;
	},

	getProgram: function(name){
		if (this.metaCache[name]){
			return this.metaCache[name];
		}

		for (var i = this.programs.length - 1; i >= 0; i--){
			var program = this.programs[i];
			if (program.name == name){
				this.metaCache[name] = program;
				return program;
			}
		}
	},

	getBuilding: function(name) {
		if (this.metaCache[name]){
			return this.metaCache[name];
		}

		for (var i = this.planets.length - 1; i >= 0; i--){
			var planet = this.planets[i];
			if (planet.buildings){
				for (var j = planet.buildings.length - 1; j >= 0; j--){
					var bld = planet.buildings[j];
					if (bld.name == name){
						this.metaCache[name] = bld;
						return bld;
					}
				}
			}
		}
	},

	getPlanet: function(name){
		return this.getMeta(name, this.planets);
	},

	/**
	 * This method is probably slow as hell, revisit it
	 */
	getAutoProductionRatio: function(useTransferBonus){
        var ratio = ( 1 + this.game.getEffect("spaceRatio"));
		if (useTransferBonus){
			ratio *= ( 1 + ((this.game.bld.getAutoProductionRatio(false, 0.05) - 1) * (this.game.getEffect("prodTransferBonus"))));
		}

		if (this.game.workshop.get("spaceManufacturing").researched){
			var factory = this.game.bld.get("factory");
			ratio *= (1 + factory.on * factory.effects["craftRatio"] * 0.75);
		}
		return ratio;
	},

	unlockAll: function(){
		for (var i in this.planets){
			this.planets[i].unlocked = true;
		}

		for (var i in this.programs){
			this.programs[i].unlocked = true;
		}
		this.game.msg("All space upgrades are unlocked");
	},
	getEffect: function(effectName){
		var effect = 0;
		for (var i = 0; i < this.meta.length; i++){
			var effectMeta = this.getMetaEffect(effectName, this.meta[i]);
			effect += effectMeta;
		}
		return effect;
	},

	undo: function(data) {
		if (data.action === "build") {
			var bld = this.getBuilding(data.metaId);
			var props = {
				id:            bld.name,
				name:           bld.label,
				description:    bld.description,
				building:       bld.name
			};
			props.controller = new classes.ui.space.PlanetBuildingBtnController(this.game);
			var model = props.controller.fetchModel(props);
			model.refundPercentage = 1.0;	//full refund for undo
			props.controller.sellInternal(model, model.metadata.val - data.val, false /*requireSellLink*/);
		} else if (data.action === "sell") {
			var bld = this.getBuilding(data.metaId);
			var props = {
				id:            bld.name,
				name:           bld.label,
				description:    bld.description,
				building:       bld.name
			};
			props.controller = new classes.ui.space.PlanetBuildingBtnController(this.game);
			var model = props.controller.fetchModel(props);

			//The meat of the function: un-sell the buildings.
			//Since buildings are sold for a 50% refund, we need to un-refund everything
			for (var i = 0; i < data.val; i += 1) {
				props.controller.incrementValue(model);
				props.controller.payPriceForUndoRefund(model);
			}
			this.game.render();
		}
	}
});

dojo.declare("com.nuclearunicorn.game.ui.SpaceProgramBtnController", com.nuclearunicorn.game.ui.BuildingStackableBtnController, {
    getMetadata: function(model){
        if (!model.metaCached){
            model.metaCached = this.game.space.getProgram(model.options.id);
        }
        return model.metaCached;
    },

	getType: function(){
		return "spaceMission";
	},

    getPrices: function(model) {
        var prices = dojo.clone(model.metadata.prices);

        for (var i = 0; i < prices.length; i++){
            if (prices[i].name == "oil"){
                var reductionRatio = this.game.getLimitedDR(this.game.getEffect("oilReductionRatio"), 0.75);
                prices[i].val *= (1 - reductionRatio);
			}
			if (prices[i].name == "manpower"){
                var reductionRatio = 0;
                prices[i].val *= (1 - reductionRatio);
			}
		}

		if (this.game.challenges.isActive("blackSky")
		 && model.metadata.name == "orbitalLaunch") {
			for (var i = 0; i < prices.length; i++) {
				prices[i].val *= prices[i].name == "starchart" ? 0 : 11;
			}
		}

		return prices;
	},

	updateVisible: function(model){
		var meta = model.metadata;
		if (meta.requiredTech){
			for (var i = meta.requiredTech.length - 1; i >= 0; i--) {
				var tech = this.game.science.get(meta.requiredTech[i]);
				if (!tech.researched){
					model.visible = false;
					return;
				}
			}
		}
		if (meta.on && meta.noStackable && this.game.space.hideResearched){
			model.visible = false;
			return;
		}
		model.visible = meta.unlocked;
	},

	updateEnabled: function(model) {
		var meta = model.metadata;
		if (meta.val != 0 && meta.on == 0) { //This checks for if the mission is "in progress"
			model.enabled = false;
			return;
		}
		this.inherited(arguments);
	},

	getName: function(model){
		var meta = model.metadata;

		if (meta.val == 0) {
			return meta.label;
		} else if (meta.on == 0){
			return $I("space.mission.name.inprogress", [meta.label]);
		} else {
			return $I("space.mission.name.complete", [meta.label]);
		}
	},

	buyItem: function(model, event) {
		if (model.metadata.val == 0) {
			return this.inherited("buyItem", arguments);
		} else {
			return {
				itemBought: false,
				reason: "already-bought"
			};
		}
	},

	build: function(model, maxBld){
		var counter = this.inherited("build", arguments);
		model.metadata.on = 0;
		if (model.metadata.name == "rorschachMission") {
			model.metadata.on = 1;
			this.game.msg($I("space.mission.rorschach.complete.log.msg"), "important");
		}
		return counter;
    }

});

dojo.declare("classes.ui.space.PlanetBuildingBtnController", com.nuclearunicorn.game.ui.BuildingStackableBtnController, {
    getMetadata: function(model){
        if (!model.metaCached){
            model.metaCached = this.game.space.getBuilding(model.options.id);
        }
        return model.metaCached;
    },

	getType: function () {
		return "spaceBuilding";
	},

    hasSellLink: function(model){
		return !this.game.opts.hideSell;
	},

	getPrices: function(model) {
        var meta = model.metadata;
        var ratio = meta.priceRatio || 1.15;

        var prices = dojo.clone(meta.prices);
		var pricesDiscount = this.game.getLimitedDR((this.game.getEffect(meta.name + "CostReduction")), 1);
		var priceModifier = 1 - pricesDiscount;
        for (var i = 0; i < prices.length; i++){
            if (prices[i].name !== "oil") {
                prices[i].val = prices[i].val * Math.pow(ratio, meta.val);
             } else {
                prices[i].val = prices[i].val * Math.pow(1.05, meta.val);
                var reductionRatio = this.game.getLimitedDR(this.game.getEffect("oilReductionRatio"), 0.75);
                prices[i].val *= (1 - reductionRatio);
             }
			 var resPriceDiscount = this.game.getLimitedDR(this.game.getEffect(prices[i].name + "CostReduction"), 1);
			 var resPriceModifier = 1 - resPriceDiscount;
			 prices[i].val *= priceModifier * resPriceModifier; //CostReduction effects
		}

		if (this.game.challenges.isActive("blackSky")
		 && meta.name == "sattelite"
		 && meta.val == 0) {
			for (var i = 0; i < prices.length; i++) {
				prices[i].val *= prices[i].name == "starchart" ? 0 : 14;
			}
		}

		return prices;
	},

	build: function(model, opts) {
		var counter = this.inherited("build", arguments);
		if (!counter) {
			return; //Skip undo if nothing was built
		}
		var undo = this.game.registerUndoChange();
		undo.addEvent(this.game.space.id, {
			action: "build",
			metaId: model.metadata.name,
			val: counter
		}, $I("ui.undo.bld.build", [counter, model.metadata.label]));
	},

	sell: function(event, model){
		var amtSold = this.inherited("sell", arguments);

		if (amtSold > 0) {
			var undo = this.game.registerUndoChange();
			undo.addEvent(this.game.space.id, {
				action: "sell",
				metaId: model.metadata.name,
				val: amtSold
			}, $I("ui.undo.bld.sell", [amtSold, model.metadata.label]));
		}
	}
});

dojo.declare("classes.ui.space.PlanetPanel", com.nuclearunicorn.game.ui.Panel, {
	planet: null,

	render: function(){
		var container = this.inherited("render", arguments);

		var self = this;

		var controller = new classes.ui.space.PlanetBuildingBtnController(this.game);
		dojo.forEach(this.planet.buildings, function(building, i){
			var button = new com.nuclearunicorn.game.ui.BuildingStackableBtn({id: building.name, planet: self.planet, controller: controller}, self.game);

			button.render(container);
			self.addChild(button);
		});
		return container;
	},

	update: function() {
		if (!this.planet.reached && this.planet.unlocked && this.planet.routeDays > 0) {
			var routeSpeed = this.game.getEffect("routeSpeed") != 0 ? this.game.getEffect("routeSpeed") : 1;
			this.title.innerHTML = this.name + " | ETA: " + this.game.toDisplayDays(Math.round(this.planet.routeDays / routeSpeed));
		} else {
			this.title.innerHTML = this.name;
		}

		this.inherited(arguments);
	}
});

dojo.declare("com.nuclearunicorn.game.ui.tab.SpaceTab", com.nuclearunicorn.game.ui.tab, {

	GCPanel: null,
	planetPanels: null,

	constructor: function(){
	},

	render: function(container) {
		var self = this;

		//--------------------------------------------------------------------
		var div = dojo.create("div", { style: { float: "right"}}, container);
		var groupCheckbox = dojo.create("input", {
			id : "toggleResearched",
			type: "checkbox",
			checked: this.game.space.hideResearched
		}, div);

		dojo.connect(groupCheckbox, "onclick", this, function(){
			this.game.space.hideResearched = !this.game.space.hideResearched;

			dojo.empty(container);
			this.render(container);
		});

		dojo.create("label", { innerHTML: $I("space.tab.hide.complete.missions"), for: "toggleResearched"}, div);
		//---------------------------------------------------------------------

		//padding div to preserve markup
		dojo.create("div", { style: { height: "20px"}}, container);

		this.GCPanel = new com.nuclearunicorn.game.ui.Panel($I("space.ground.control.label"), this.game.space);
		var content = this.GCPanel.render(container);
		var controller = new com.nuclearunicorn.game.ui.SpaceProgramBtnController(this.game);
		dojo.forEach(this.game.space.programs, function(program, i){
			var button = new com.nuclearunicorn.game.ui.BuildingStackableBtn({id: program.name, controller: controller}, self.game);
			button.render(content);
			self.GCPanel.addChild(button);
		});

		//----------------------------------------------------
		//render children right before llegacy planet rendering

		this.container = container;
		this.inherited(arguments);

        //------------ space space I'm in space -------------
        this.planetPanels = [];
        dojo.forEach(this.game.space.planets, function(planet, i){
            if (planet.unlocked){

				if (this.game.prestige.getPerk("numerology").researched) {
					var planetTitle = "";
					dojo.forEach(this.game.calendar.cycles, function(cycle, i){
						if (cycle.name == planet.name || (planet.name == "moon" && cycle.name == "redmoon")) {
							planetTitle += cycle.glyph + " ";
						}
					});
					planetTitle += planet.label;
				} else {
					planetTitle = planet.label;
				}

				var planetPanel = new classes.ui.space.PlanetPanel(planetTitle, self.game.space);

                planetPanel.planet = planet;
                planetPanel.setGame(self.game);
                planetPanel.render(container);

                self.planetPanels.push(planetPanel);
            }
        });

		this.update();
	},

	update: function(){
		this.GCPanel.update();

        dojo.forEach(this.planetPanels, function(panel, i){
            panel.update();
        });

		this.inherited(arguments);
	}
});
