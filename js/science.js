/**
 * Weird cat science
 */
dojo.declare("classes.managers.ScienceManager", com.nuclearunicorn.core.TabManager, {

	game: null,

	hideResearched: false,

	//list of technologies
	techs:[{
		name: "calendar",
		label: $I("science.calendar.label"),
		description: $I("science.calendar.desc"),
		effectDesc: $I("science.calendar.effectDesc"),
		prices: [{name : "science", val: 30}],
		unlocks: {
			tabs: ["time"],
			tech: ["agriculture"]
		},
        flavor: $I("science.calendar.flavor")

	}, {
		name: "agriculture",
		label: $I("science.agriculture.label"),
		description: $I("science.agriculture.desc"),
		effectDesc: $I("science.agriculture.effectDesc"),
		prices: [{name : "science", val: 60}],
		unlocks: {
			buildings: ["barn"],
			tech: ["mining", "archery"],
			tabs: ["queue"],
		},
        flavor: $I("science.agriculture.flavor")
	}, {
		name: "archery",
		label: $I("science.archery.label"),
		description: $I("science.archery.desc"),
		effectDesc: $I("science.archery.effectDesc"),
		prices: [{name : "science", val: 180}],
		unlocks: {
			buildings: ["zebraOutpost", "zebraWorkshop", "zebraForge"],
			tech: ["animal"]
		},
		flavor: $I("science.archery.flavor")
	}, {
		name: "mining",
		label: $I("science.mining.label"),
		description: $I("science.mining.desc"),
		effectDesc: $I("science.mining.effectDesc"),
		prices: [{name : "science", val: 300}],
		unlocks: {
			buildings: ["mine", "workshop"],
			tech: ["metal"],
			upgrades: ["bolas"]
		},
		flavor: $I("science.mining.flavor")
	}, {
		name: "metal",
		label: $I("science.metal.label"),
		description: $I("science.metal.desc"),
		effectDesc: $I("science.metal.effectDesc"),
		prices: [{name : "science", val: 600}],
		unlocks: {
			buildings: ["smelter"],
			upgrades: ["huntingArmor", "prospecting"]
		}
	},
	{
		name: "animal",
		label: $I("science.animal.label"),
		description: $I("science.animal.desc"),
		effectDesc: $I("science.animal.effectDesc"),
		prices: [{name : "science", val: 350}],	//mostly does nothing, so price is lower
		unlocks: {
			buildings: ["pasture", "unicornPasture"],
			tech: ["civil", "math", "construction"]
			//crafts: []
		}
	}, {
		/*==============	NOT USED ANYMORE   ============*/
		name: "brewery",
		label: $I("science.brewery.label"),
		description: $I("science.brewery.desc"),
		effectDesc: $I("science.brewery.effectDesc"),
		prices: [{name : "science", val: 1200 }]
	},
	//--------------------------------------------------
	{
		name: "civil",
		label: $I("science.civil.label"),
		description: $I("science.civil.desc"),
		effectDesc: $I("science.civil.effectDesc"),
		prices: [{name : "science", val: 1500}],
		unlocks: {
			tech: ["currency"]	//currency
		},
		flavor: $I("science.civil.flavor")
	}, {
		name: "math",
		label: $I("science.math.label"),
		description: $I("science.math.desc"),
		effectDesc: $I("science.math.effectDesc"),
		prices: [{name : "science", val: 1000}],
		unlocks: {
			tabs: ["stats"],
			buildings: ["academy"],
			upgrades: ["celestialMechanics"]
		},
		flavor: $I("science.math.flavor")
	}, {
		name: "construction",
		label: $I("science.construction.label"),
		description: $I("science.construction.desc"),
		effectDesc: $I("science.construction.effectDesc"),
		prices: [{name : "science", val: 1300}],
		effects: {
			"queueCap": 1
		},
		unlocks: {
			buildings: ["logHouse", "warehouse", "lumberMill", "ziggurat"],
			tech: ["engineering"],
			upgrades: ["compositeBow", "advancedRefinement", "reinforcedSaw"]
		},
		flavor: $I("science.construction.flavor")
	}, {
		name: "engineering",
		label: $I("science.engineering.label"),
		description: $I("science.engineering.desc"),
		effectDesc: $I("science.engineering.effectDesc"),
		prices: [{name : "science", val: 1500}],
		unlocks: {
			buildings: ["aqueduct"],
			tech: ["writing"],
		}
	}, {
		name: "currency",
		label: $I("science.currency.label"),
		description: $I("science.currency.desc"),
		effectDesc: $I("science.currency.effectDesc"),
		prices: [{name : "science", val: 2200}],
		unlocks: {
			buildings: ["tradepost"],
			upgrades: ["goldOre"]
		}
	}, {
		name: "writing",
		label: $I("science.writing.label"),
		description: $I("science.writing.desc"),
		effectDesc: $I("science.writing.effectDesc"),
		prices: [{name : "science", val: 3600}],
		unlocks: {
			buildings: ["amphitheatre"],
			tech: ["philosophy", "machinery", "steel"],
			upgrades: ["register"],
			crafts: []
		},
		flavor: $I("science.writing.flavor")
	}, {
		name: "philosophy",
		label: $I("science.philosophy.label"),
		description: $I("science.philosophy.desc"),
		effectDesc: $I("science.philosophy.effectDesc"),
		prices: [{name : "science", val: 9500}],
		unlocks: {
			buildings: ["temple"],
			tech: ["theology"],
			crafts: []
		},
		flavor: $I("science.philosophy.flavor")
	}, {
		name: "machinery",
		label: $I("science.machinery.label"),
		description: $I("science.machinery.desc"),
		effectDesc: $I("science.machinery.effectDesc"),
		prices: [{name : "science", val: 15000}],
		unlocks: {
			buildings: ["steamworks"],
			upgrades: ["printingPress", "factoryAutomation", "crossbow"]
		}
	}, {
		name: "steel",
		label: $I("science.steel.label"),
		description: $I("science.steel.desc"),
		effectDesc: $I("science.steel.effectDesc"),
		prices: [{name : "science", val: 12000}],
		unlocks: {
			upgrades: ["combustionEngine",
						"reinforcedWarehouses", "steelAxe", "steelArmor"],
			crafts: ["steel"]
		},
		upgrades: {
			buildings: ["mine", "smelter"]
		}
	}, {
		name: "theology",
		label: $I("science.theology.label"),
		description: $I("science.theology.desc"),
		effectDesc: $I("science.theology.effectDesc"),
		prices: [{ name: "science", val: 15000 }, { name: "culture", val: 600 }],
		unlocks: {
			tech: ["astronomy", "cryptotheology"]
		},
		upgrades: {
			buildings: ["temple"]
		},
        flavor: $I("science.theology.flavor")
	}, {
		name: "astronomy",
		label: $I("science.astronomy.label"),
		description: $I("science.astronomy.desc"),
		effectDesc: $I("science.astronomy.effectDesc"),
		prices: [{ name: "science", val: 22000 }, { name: "culture", val: 900 }],
		unlocks: {
			buildings: ["observatory"],
			tech: ["navigation"],
        }
	}, {
		name: "navigation",
		label: $I("science.navigation.label"),
		description: $I("science.navigation.desc"),
		effectDesc: $I("science.navigation.effectDesc"),
		prices: [{ name: "science", val: 35000 }, { name: "culture", val: 1400 }],
		unlocks: {
			buildings: ["harbor"],
			tech: ["physics", "archeology", "architecture"],
			upgrades: ["caravanserai", "cargoShips", "astrolabe",
						"titaniumMirrors", "titaniumAxe"],
			crafts: []
		}
	}, {
		name: "architecture",
		label: $I("science.architecture.label"),
		description: $I("science.architecture.desc"),
		effectDesc: $I("science.architecture.effectDesc"),
		prices: [{ name: "science", val: 44000 }],
		unlocks: {
			buildings: ["mansion", "mint"],
			tech: ["acoustics"]
		},
		flavor: $I("science.architecture.flavor")
	}, {
		name: "physics",
		label: $I("science.physics.label"),
		description: $I("science.physics.desc"),
		effectDesc: $I("science.physics.effectDesc"),
		prices: [{ name: "science", val: 57000 }],
		unlocks: {
			tech: ["chemistry", "electricity", "metaphysics"],
			upgrades: ["pneumaticPress", "steelSaw"],
			crafts: ["blueprint"]
		}
	}, {
		name: "metaphysics",
		label: $I("science.metaphysics.label"),
		description: $I("science.metaphysics.desc"),
		effectDesc: $I("science.metaphysics.effectDesc"),
		prices: [
			{name: 	"unobtainium", val: 5},
			{name : "science", val: 55000}
		],
	}, {
		name: "chemistry",
		label: $I("science.chemistry.label"),
		description: $I("science.chemistry.desc"),
		effectDesc: $I("science.chemistry.effectDesc"),
		prices: [{ name: "science", val: 70000 }],
		unlocks: {
			buildings: ["calciner", "oilWell"],
			upgrades: ["alloyAxe", "alloyArmor", "alloyWarehouses", "alloyBarns"],
			crafts: ["alloy"]
		}
	}, {
		name: "acoustics",
		label: $I("science.acoustics.label"),
		description: $I("science.acoustics.desc"),
		effectDesc: $I("science.acoustics.effectDesc"),
		prices: [{ name: "science", val: 72000 }],
		unlocks: {
			buildings: ["chapel"],
			tech: ["drama"]
		}
	}, {
		name: "drama",
		label: $I("science.drama.label"),
		description: $I("science.drama.desc"),
		effectDesc: $I("science.drama.effectDesc"),
		prices: [{ name: "science", val: 90000 }, { name: "culture", val: 2500 }],
		unlocks: {
			buildings: ["brewery"]
		}
	},{
		name: "archeology",
		label: $I("science.archeology.label"),
		description: $I("science.archeology.desc"),
		effectDesc: $I("science.archeology.effectDesc"),
		prices: [{ name: "science", val: 78000 }],
		unlocks: {
			buildings: ["quarry"],
			tech: ["biology"],
			upgrades:["geodesy"]
		},
		flavor: $I("science.archeology.flavor")
	}, {
		name: "electricity",
		label: $I("science.electricity.label"),
		description: $I("science.electricity.desc"),
		effectDesc: $I("science.electricity.effectDesc"),
		prices: [{ name: "science", val: 92000 }],
		unlocks: {
			buildings: ["magneto"],
			tech: ["industrialization"]
		},
		flavor: $I("science.electricity.flavor")
	}, {
		name: "biology",
		label: $I("science.biology.label"),
		description: $I("science.biology.desc"),
		effectDesc: $I("science.biology.effectDesc"),
		prices: [{ name: "science", val: 105000 }],
		unlocks: {
			buildings: ["biolab"],
			crafts: [],
			upgrades: ["petri"],
			tech: ["biochemistry"]
		},
		flavor: $I("science.biology.flavor")
	}, {
		name: "biochemistry",
		label: $I("science.biochemistry.label"),
		description: $I("science.biochemistry.desc"),
		effectDesc: $I("science.biochemistry.effectDesc"),
		prices: [{ name: "science", val: 245000 }],
		unlocks: {
			tech: ["genetics"],
			upgrades: ["biofuel"]
		},
		flavor: $I("science.biochemistry.flavor")
	}, {
		name: "genetics",
		label: $I("science.genetics.label"),
		description: $I("science.genetics.desc"),
		effectDesc: $I("science.genetics.effectDesc"),
		prices: [{ name: "science", val: 490000 }],
		unlocks: {
			upgrades: ["unicornSelection"]
		},
		flavor: $I("science.genetics.flavor")
	}, {
		name: "industrialization",
		label: $I("science.industrialization.label"),
		description: $I("science.industrialization.desc"),
		effectDesc: $I("science.industrialization.effectDesc"),
		prices: [
			{name : "science", val: 100000},
			{name: 	"blueprint", val: 25}
		],
		unlocks: {
			tech: ["mechanization", "metalurgy", "combustion"],
			upgrades: ["barges", "advancedAutomation", "logistics"],
		}
	}, {
		name: "mechanization",
		label: $I("science.mechanization.label"),
		description: $I("science.mechanization.desc"),
		effectDesc: $I("science.mechanization.effectDesc"),
		prices: [
			{name : "science", val: 115000},
			{name: 	"blueprint", val: 45}
		],
		unlocks: {
			buildings: ["factory"],
			tech: ["electronics"],
			upgrades: ["pumpjack", "strenghtenBuild"],
			crafts: []
		}
	}, {
		name: "metalurgy",
		label: $I("science.metalurgy.label"),
		description: $I("science.metalurgy.desc"),
		effectDesc: $I("science.metalurgy.effectDesc"),
		prices: [
			{name : "science", val: 125000},
			{name: 	"blueprint", val: 60}
		],
		unlocks: {
			upgrades: ["electrolyticSmelting", "oxidation", "miningDrill"]
		}
	}, {
		name: "combustion",
		label: $I("science.combustion.label"),
		description: $I("science.combustion.desc"),
		effectDesc: $I("science.combustion.effectDesc"),
		prices: [
			{name : "science", val: 115000},
			{name: 	"blueprint", val: 45}
		],
		unlocks: {
			tech: ["ecology"],
			upgrades: ["offsetPress", "fuelInjectors", "oilRefinery"]
		}
	},
	{
		name: "ecology",
		label: $I("science.ecology.label"),
		description: $I("science.ecology.desc"),
		effectDesc: $I("science.ecology.effectDesc"),
		prices: [
			{name : "science", val: 125000},
			{name: 	"blueprint", val: 55}
		],
		unlocks: {
			stages: [{bld:"pasture", stage:1}], 	// Solar Farm
			upgrades: ["carbonSequestration"]
		},
		upgrades:{
			buildings: ["mine", "quarry"]
		}
	},
	{
		name: "electronics",
		label: $I("science.electronics.label"),
		description: $I("science.electronics.desc"),
		effectDesc: $I("science.electronics.effectDesc"),
		prices: [
			{name : "science", val: 135000},
			{name: 	"blueprint", val: 70}
		],
		unlocks: {
			stages: [
				{bld:"library", stage:1},		// Data Center
				{bld:"amphitheatre", stage:1}	// Broadcast Tower
			],
			tech: ["nuclearFission", "rocketry", "robotics"],
			crafts: [],
			upgrades: ["cadSystems", "refrigeration", "seti", "factoryLogistics", "factoryOptimization", "internet"]
		}
	}, {
		name: "robotics",
		label: $I("science.robotics.label"),
		description: $I("science.robotics.desc"),
		effectDesc: $I("science.robotics.effectDesc"),
		prices: [
			{name : "science", val: 140000},
			{name: 	"blueprint", val: 80}
		],
		unlocks: {
			stages: [{bld:"aqueduct", stage:1}], // Hydro Plant
			tech: ["ai"],
			upgrades: ["steelPlants", "rotaryKiln", "assistance", "factoryRobotics"],
			crafts: []
		}
	}, {
		name: "ai",
		label: $I("science.ai.label"),
		description: $I("science.ai.desc"),
		effectDesc: $I("science.ai.effectDesc"),
		prices: [
			{name : "science", val: 250000},
			{name: 	"blueprint", val: 150}
		],
		unlocks: {
			buildings: ["aiCore"],
			tech: ["quantumCryptography"],
			upgrades: ["neuralNetworks", "aiEngineers", "machineLearning"]
		}
	}, {
		name: "quantumCryptography",
		label: $I("science.quantumCryptography.label"),
		description: $I("science.quantumCryptography.desc"),
		effectDesc: $I("science.quantumCryptography.effectDesc"),
		prices: [
			{name : "science", val: 1250000},
			{name: 	"relic", val: 1024}
		],
		unlocks: {
			tech: ["blackchain"]
		}
	}, {
		name: "blackchain",
		label: $I("science.blackchain.label"),
		description: $I("science.blackchain.desc"),
		effectDesc: $I("science.blackchain.effectDesc"),
		prices: [
			{name: "science", val: 1500000},
			{name: "relic", val: 4096}
		],
		unlocks: {
			upgrades: ["invisibleBlackHand"]
		}
	}, {
		name: "nuclearFission",
		label: $I("science.nuclearFission.label"),
		description: $I("science.nuclearFission.desc"),
		effectDesc: $I("science.nuclearFission.effectDesc"),
		prices: [
			{name : "science", val: 150000},
			{name: 	"blueprint", val: 100}
		],
		unlocks: {
			buildings: ["reactor"],
			tech: ["nanotechnology", "particlePhysics"],
			upgrades: ["reactorVessel"]
		}
	}, {
		name: "rocketry",
		label: $I("science.rocketry.label"),
		description: $I("science.rocketry.desc"),
		effectDesc: $I("science.rocketry.effectDesc"),
		prices: [
			{name : "science", val: 175000},
			{name: 	"blueprint", val: 125}
		],
		unlocks: {
			tabs: ["space"],
			tech: ["sattelites", "oilProcessing"],
			upgrades: ["oilDistillation"]
		},
		upgrades: {
			planet: ["cath"]
		}
	}, {
        name: "oilProcessing",
        label: $I("science.oilProcessing.label"),
        description: $I("science.oilProcessing.desc"),
        effectDesc: $I("science.oilProcessing.effectDesc"),
        prices: [
            {name : "science", val: 215000},
            {name: 	"blueprint", val: 150}
        ],
        unlocks: {
            upgrades: [ "factoryProcessing" ],
            crafts: []
        }
    }, {
        name: "sattelites",
        label: $I("science.sattelites.label"),
        description: $I("science.sattelites.desc"),
        effectDesc: $I("science.sattelites.effectDesc"),
        prices: [
            {name : "science", val: 190000},
            {name: 	"blueprint", val: 125}
        ],
        unlocks: {
            tech: ["orbitalEngineering" ],
			upgrades: ["photolithography", "uplink", "thinFilm"],
        },
        flavor: $I("science.sattelites.flavor")
    }, {
		name: "orbitalEngineering",
		label: $I("science.orbitalEngineering.label"),
		description: $I("science.orbitalEngineering.desc"),
		effectDesc: $I("science.orbitalEngineering.effectDesc"),
		prices: [
			{name : "science", val: 250000},
			{name: 	"blueprint", val: 250}
		],
		unlocks: {
			tech: ["exogeology", "thorium"],
			upgrades: ["satnav", "satelliteRadio", "solarSatellites", "spaceEngineers", "starlink"]
		}
	}, {
		name: "thorium",
		label: $I("science.thorium.label"),
		description: $I("science.thorium.desc"),
		effectDesc: $I("science.thorium.effectDesc"),
		prices: [
			{name : "science", val: 375000},
			{name: 	"blueprint", val: 375}
		],
		unlocks: {
			upgrades: ["thoriumReactors", "thoriumEngine", "qdot"],
			crafts: []
		}
	}, {
		name: "exogeology",
		label: $I("science.exogeology.label"),
		description: $I("science.exogeology.desc"),
		effectDesc: $I("science.exogeology.effectDesc"),
		prices: [
			{name : "science", val: 275000},
			{name: 	"blueprint", val: 250}
		],
		unlocks: {
			tech: ["advExogeology"],
			upgrades: ["unobtainiumReflectors", "unobtainiumAxe", "unobtainiumSaw", "hydroPlantTurbines", "storageBunkers"]
		}
	}, {
		name: "advExogeology",
		label: $I("science.advExogeology.label"),
		description: $I("science.advExogeology.desc"),
		effectDesc: $I("science.advExogeology.effectDesc"),
		prices: [
			{name : "science", val: 325000},
			{name: 	"blueprint", val: 350}
		],
		unlocks: {
			upgrades: ["eludiumCracker", "eludiumReflectors", "mWReactor", "freightfulExchange" /*, "eludiumDrill"*/],
			crafts: ["eludium"],
			stages: [{bld:"warehouse", stage:1}],
		}
	},
	{
		name: "nanotechnology",
		label: $I("science.nanotechnology.label"),
		description: $I("science.nanotechnology.desc"),
		effectDesc: $I("science.nanotechnology.effectDesc"),
		prices: [
			{name : "science", val: 200000},
			{name: 	"blueprint", val: 150}
		],
		unlocks: {
			tech: ["superconductors"],
			upgrades: ["augumentation", "nanosuits", "photovoltaic", "fluidizedReactors"]
		}
	}, {
		name: "superconductors",
		label: $I("science.superconductors.label"),
		description: $I("science.superconductors.desc"),
		effectDesc: $I("science.superconductors.effectDesc"),
		prices: [
			{name : "science", val: 225000},
			{name: 	"blueprint", val: 175}
		],
		unlocks: {
			tech: ["antimatter"],
			upgrades: ["coldFusion", "spaceManufacturing", "cryocomputing"]
		}
	}, {
		name: "antimatter",
		label: $I("science.antimatter.label"),
		description: $I("science.antimatter.desc"),
		effectDesc: $I("science.antimatter.effectDesc"),
		prices: [
			{name : "science", val: 500000},
			{name : "eludium", val: 50},
			{name : "relic",   val: 1}
		],
		unlocks: {
			tech: ["terraformation"],
			upgrades: ["amReactors", "amBases", "amDrive"]
		}
	}, {
		name: "terraformation",
		label: $I("science.terraformation.label"),
		description: $I("science.terraformation.desc"),
		effectDesc: $I("science.terraformation.effectDesc"),
		prices: [
			{name : "science", val: 750000},
			{name : "relic",   val: 5}
		],
		unlocks: {
			tech: ["hydroponics"]
		}
	}, {
		name: "hydroponics",
		label: $I("science.hydroponics.label"),
		description: $I("science.hydroponics.desc"),
		effectDesc: $I("science.hydroponics.effectDesc"),
		prices: [
			{name : "science", val: 1000000},
			{name : "relic",   val: 25}
		],
		unlocks: {
			tech: ["exogeophysics"]
		}
	}, {
		name: "exogeophysics",
		label: $I("science.exogeophysics.label"),
		description: $I("science.exogeophysics.desc"),
		effectDesc: $I("science.exogeophysics.effectDesc"),
		prices: [
			{name : "science", val: 1500000},
			{name : "relic",   val: 500}
		]
	},
	{
		name: "particlePhysics",
		label: $I("science.particlePhysics.label"),
		description: $I("science.particlePhysics.desc"),
		effectDesc: $I("science.particlePhysics.effectDesc"),
		prices: [
			{name : "science", val: 185000},
			{name: 	"blueprint", val: 135}
		],
		unlocks: {
			buildings: ["accelerator"],
			tech: ["chronophysics", "dimensionalPhysics"],
			upgrades: ["enrichedUranium", "railgun"]
		},
		flavor: $I("science.particlePhysics.flavor")
	}, {
		name: "dimensionalPhysics",
		label: $I("science.dimensionalPhysics.label"),
		description: $I("science.dimensionalPhysics.desc"),
		effectDesc: $I("science.dimensionalPhysics.effectDesc"),
		prices: [
			{name : "science", val: 235000}
		],
		unlocks: {
			upgrades: ["energyRifts", "lhc", "transportSuperposition"]
			// tech: ["artificialGravity"] -- see SPACE_EXPL feature flag
		}
	}, {
		name: "artificialGravity",
		label: $I("science.artificialGravity.label"),
		description: $I("science.artificialGravity.desc"),
		effectDesc: $I("science.artificialGravity.effectDesc"),
		prices: [
			{name : "science", val: 320000}
		],
		unlocks: {
			upgrades: ["spiceNavigation", "longRangeSpaceships"]
		},
		flavor: $I("science.artificialGravity.flavor")
	}, {
		name: "chronophysics",
		label: $I("science.chronophysics.label"),
		description: $I("science.chronophysics.desc"),
		effectDesc: $I("science.chronophysics.effectDesc"),
		prices: [
			{name : "science", val: 250000},
			{name: 	"timeCrystal", val: 5}
		],
		unlocks: {
			buildings: ["chronosphere", "stasisPod"],
			tech: ["tachyonTheory"],
			upgrades: ["stasisChambers", "fluxCondensator"]
		}
	}, {
		name: "tachyonTheory",
		label: $I("science.tachyonTheory.label"),
		description: $I("science.tachyonTheory.desc"),
		effectDesc: $I("science.tachyonTheory.effectDesc"),
		prices: [
			{name : "science", val: 750000},
			{name: 	"timeCrystal", val: 25},
			{name : "relic",   val: 1}
		],
		unlocks: {
			tech: ["voidSpace"],
			upgrades: ["tachyonAccelerators", "chronoforge", "chronoEngineers"]
		}
	}, {
		name: "cryptotheology",
		label: $I("science.cryptotheology.label"),
		description: $I("science.cryptotheology.desc"),
		effectDesc: $I("science.cryptotheology.effectDesc"),
		prices: [
			{name : "science", val: 650000},
			{name : "relic",   val: 5}
		],
		unlocks: {
			upgrades: ["relicStation"]
		},
		handler: function(game) {
			game.time.queue.unlockQueueSource("transcendenceUpgrades");
		}
	}, {
		name: "voidSpace",
		label: $I("science.voidSpace.label"),
		description: $I("science.voidSpace.desc"),
		effectDesc: $I("science.voidSpace.effectDesc"),
		prices: [
			{name : "science", val: 800000},
			{name: 	"timeCrystal", val: 30},
			{name : "relic",   val: 25}
		],
		unlocks: {
			tech: ["paradoxalKnowledge"],
			upgrades: ["voidAspiration"],
			voidSpace: ["cryochambers"],
			challenges: ["atheism"]
		},
		handler: function(game) {
			//This function is called at the time this tech is researched.
			//It's also called during the game-load process, but only if this tech is already researched.
			game.time.queue.unlockQueueSource("voidSpace");
		},
	}, {
		name: "paradoxalKnowledge",
		label: $I("science.paradoxalKnowledge.label"),
		description: $I("science.paradoxalKnowledge.desc"),
		effectDesc: $I("science.paradoxalKnowledge.effectDesc"),
		prices: [
			{name : "science", val: 1000000},
			{name: 	"timeCrystal", val: 40},
			{name : "relic",   val: 50}
		],
		unlocks: {
			upgrades: ["distorsion"],
			chronoforge: ["ressourceRetrieval"],
			voidSpace: ["chronocontrol", "voidResonator"]
		},
		flavor: $I("science.paradoxalKnowledge.flavor")
	}],

	effectsBase: {
	},
	constructor: function(game){

		// note: possible to unlock artificialGravity (and the continuation of
		//	   the space exploration tech tree) iff SPACE_EXPL feature flag
		//
		if (game.getFeatureFlag("SPACE_EXPL")) {
			for (var i = this.techs.length - 1; i >= 0; i--) {
				if (this.techs[i].name == 'dimensionalPhysics') {
					if (!this.techs[i].unlocks.tech) {
						this.techs[i].unlocks.tech = ['artificialGravity'];
					}
					break;
				}
			}
		}

		this.game = game;
		this.metaCache = {};
        this.registerMeta("research", this.techs, {
            getEffect: function(meta, name){
                var effect = 0;
                if (meta.effect){
                    effect = meta.effects[name] || 0;
                }
				return effect;
			}
		});
		this.setEffectsCachedExisting();
	},

	get: function(techName){
		var tech = this.metaCache[techName];
		if (tech){
			return tech;
		}

		for (var i = this.techs.length - 1; i >= 0; i--) {
			if (this.techs[i].name == techName){
				this.metaCache[techName] = this.techs[i];
				return this.techs[i];
			}
		}
		console.error("Failed to get tech for tech name '" + techName + "'");
		return null;
	},

	getPrices: function(tech) {

		var prices = tech.prices;

		var prices_result = $.extend(true, [], prices); // Create a new array to keep original values

		// this is to force Gold Ore pathway in BSK+IW and avoid soft locks
		if (this.game.ironWill && this.game.challenges.isActive('blackSky')) {
			if (tech.name == 'construction') {
				prices_result = prices_result.concat([{name: "gold", val: 5}]);
			}
		}

		if (this.game.challenges.isActive("unicornTears")) {
			var priceScaling = this.game.getEffect("scienceTearsPricesChallenge");
			if (priceScaling > 0) {
				//If the tech costs manuscripts, add unicorns to the price.
				//If the tech costs compendia, add unicorn tears to the price.
				//If the tech costs blueprints, add alicorns to the price.
				for (var i = 0; i < prices.length; i += 1) {
					switch (prices[i].name) {
					case "blueprint":
						prices_result = prices_result.concat([{name: "alicorn", val: Math.max(1, this.game.getLimitedDR(priceScaling, 10))}]);
						break;
					}
				}
			}
		}

		return prices_result;
	},
    /*getEffect: function(effectName){
        var effect = 0;
        for (var i = 0; i < this.meta.length; i++){
            var effectMeta = this.getMetaEffect(effectName, this.meta[i]);
            effect += effectMeta;
        }
        return effect;
    },*/
	resetState: function(){
		for (var i = 0; i < this.techs.length; i++){
			var tech = this.techs[i];
			tech.unlocked = tech.name == "calendar";
			tech.researched = false;
		}
	},

	save: function(saveData){
		saveData.science = {
			hideResearched: this.hideResearched,
			techs: this.filterMetadata(this.techs, ["name", "unlocked", "researched"]),
		};
	},

	load: function(saveData){
		if (saveData.science){
			this.hideResearched = saveData.science.hideResearched;
			this.loadMetadata(this.techs, saveData.science.techs, "technologies");
		}
	},

	/**
	 * If the game has been updated since the player last played, the devs may have added new features that
	 * are unlocked by techs the player already has.  If that's the case, we need to re-unlock things so
	 * that the player can use the new features as intended.
	 */
	afterLoad: function() {
		//re-unlock technologies in case we have modified something
		//re-trigger handlers
		for (var i = this.techs.length - 1; i >= 0; i--) {
			var tech = this.techs[i];
			if (!tech.researched) {
				continue;
			}
			if (tech.handler) {
				tech.handler(this.game);
			}

			this.game.unlock(tech.unlocks);
		}
	},

	unlockAll: function(){
		for (var i in this.techs) {
			var tech = this.techs[i];
			tech.researched = true;
			tech.unlocked = true;
			this.game.unlock(tech.unlocks);
		}
		this.game.msg("All techs are unlocked!");
	},
    /*updateEffectCached: function() {
        var effectsBase = this.effectsBase;
        if (effectsBase){
             effectsBase = this.game.resPool.addBarnWarehouseRatio(effectsBase);
        }

        for (var name in this.effectsCachedExisting) {
             // Add effect from meta
             var effect = 0;
             for (var i = 0; i < this.meta.length; i++){
                var effectMeta = this.getMetaEffect(name, this.meta[i]);
                effect += effectMeta;
             }

             // Previously, catnip demand (or other buildings that both affect the same resource)
             // could have theoretically had more than 100% reduction because they diminished separately,
             // this takes the total effect and diminishes it as a whole.
             if (this.game.isHyperbolic(name) && effect !== 0) {
             effect = this.game.getLimitedDR(effect, 1.0);
             }

             // Add effect from effectsBase
             if (effectsBase && effectsBase[name]) {
             effect += effectsBase[name];
             }

             // Add effect in globalEffectsCached, in addition of other managers
             this.game.globalEffectsCached[name] = typeof(this.game.globalEffectsCached[name]) == "number" ? this.game.globalEffectsCached[name] + effect : effect;
             }
			 }*/
	//update: function(){
	//}
});

dojo.declare("com.nuclearunicorn.game.ui.TechButtonController", com.nuclearunicorn.game.ui.BuildingNotStackableBtnController, {
	defaults: function() {
		var result = this.inherited("defaults", arguments);
		result.tooltipName = true;
		result.simplePrices = false;
		return result;
	},

	getType: function(){
		return "tech";
	},

	getMetadata: function(model){
        if (!model.metaCached){
            model.metaCached = this.game.science.get(model.options.id);
        }
        return model.metaCached;
    },

	getPrices: function(model) {
		//I want to avoid duplicate code if possible
		return this.game.science.getPrices(model.metadata);
	},

	getName: function(model){
		var name = this.inherited("getName", arguments);
		var meta = model.metadata;
		if (this.game && this.game.cultivation && meta && meta.name && !meta.researched){
			var cult = this.game.cultivation;
			var gate = cult.getItemRealmGate("tech", meta.name);
			if (gate && !cult.isItemRealmUnlocked("tech", meta.name)){
				name += " <span class=\"xxRealmGateBadge locked\">🔒 " + gate.title + "</span>";
			}
		}
		return name;
	},

	updateEnabled: function(model){
		this.inherited(arguments);
		var meta = model.metadata;
		if (this.game && this.game.cultivation && !this.game.devMode && meta && meta.name && !meta.researched){
			if (!this.game.cultivation.isItemRealmUnlocked("tech", meta.name)){
				model.enabled = false;
			}
		}
	},

	updateVisible: function(model){
		var meta = model.metadata;
		model.visible = meta.unlocked;
		if (this.game && this.game.cultivation && meta && meta.name && !meta.researched){
			var cult = this.game.cultivation;
			var gate = cult.getItemRealmGate("tech", meta.name);
			if (gate && gate.realmIdx > cult.getCurrentRealmIndex() + 1){
				model.visible = false;
			}
		}

		if (meta.researched){
			model.visible = false;
		}
	}
});

dojo.declare("com.nuclearunicorn.game.ui.tab.Library", com.nuclearunicorn.game.ui.tab, {

	metaphysicsPanel: null,

	render: function(tabContainer){

		this.buttons = [];

		var table = dojo.create("table", { className: "table", style:{
			width: "100%"
		}}, tabContainer);

		dojo.create("tr", null, table);

		var tdTop = dojo.create("td", { colspan: 2 },
			dojo.create("tr", null, table));

		this.tdTop = tdTop;


		var tr = dojo.create("tr", null, table)/*,
			tdLeft = dojo.create("td", null, tr),
			tdRight = dojo.create("td", null, tr)*/;


		for (var i = 0; i < this.game.science.techs.length; i++){
			var tech = this.game.science.techs[i];

			var btn = this.createTechBtn(tech);

			btn.updateVisible();
			btn.updateEnabled();

			this.addButton(btn);
			btn.render(tr);
		}


		//------------ metaphysics ----------------
		this.metaphysicsPanel = null;

		var showMetaphysics = this.game.science.get("metaphysics").researched && this.game.resPool.get("paragon").value > 0;
		if (!showMetaphysics){
			for (var i = this.game.prestige.perks.length - 1; i >= 0; i--){
				var perk = this.game.prestige.perks[i];
				if (perk.researched){
					showMetaphysics = true;
					break;
				}
			}
		}

		if (showMetaphysics){
			this.metaphysicsPanel = new classes.ui.PrestigePanel($I("prestige.panel.label"), this.game.prestige);
			this.metaphysicsPanel.game = this.game;
			this.metaphysicsPanel.render(tabContainer);
		}
		if (this.game.detailedPollutionInfo){
			this.detailedPollutionInfo = dojo.create("span", { style: { display: "inline-block", marginBottom: "20px"}}, tabContainer);
		}
		this.update();
	},

	update: function(){
		this.inherited(arguments);

		if (this.metaphysicsPanel){
			this.metaphysicsPanel.update();
		}
		if (this.game.detailedPollutionInfo){
			if (this.detailedPollutionInfo){

				this.detailedPollutionInfo.innerHTML = this.game.bld.getDetailedPollutionInfo(); 
			}
		}
	},
	
	constructor: function(tabName, game){
		this.game = game;
	},

	createTechBtn: function(tech){
		var controller = new com.nuclearunicorn.game.ui.TechButtonController(this.game);
		var btn = new com.nuclearunicorn.game.ui.BuildingResearchBtn({id: tech.name, controller: controller}, this.game);
		return btn;
	}
});
