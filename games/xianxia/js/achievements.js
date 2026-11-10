dojo.declare("classes.managers.Achievements", com.nuclearunicorn.core.TabManager, {
    game: null,
    badgesUnlocked: false,

    //道果成就 — 围绕修行体系重做;村庄/人口/猫系成就已全部移除。
    //keep-names:旧存档兼容沿用原名(spaceOddity 还被 game.js 读取,
    //betterSafeThanSorry 由 workshop 手动解锁);其余一律新名。
    achievements: [
        //--- 境界里程碑 ---
        {
            name: "qiRefining",
            title: $I("achievements.qiRefining.title"),
            description: $I("achievements.qiRefining.desc"),
            condition: function () {
                return this.game.cultivation.getStage("lianqi_9").researched;
            }
        }, {
            name: "foundation",
            title: $I("achievements.foundation.title"),
            description: $I("achievements.foundation.desc"),
            condition: function () {
                return this.game.cultivation.getStage("zhuji_0").researched;
            }
        }, {
            name: "goldenCore",
            title: $I("achievements.goldenCore.title"),
            description: $I("achievements.goldenCore.desc"),
            condition: function () {
                return this.game.cultivation.getStage("jiedan_0").researched;
            }
        }, {
            name: "nascentSoul",
            title: $I("achievements.nascentSoul.title"),
            description: $I("achievements.nascentSoul.desc"),
            starDescription: $I("achievements.nascentSoul.starDesc"),
            condition: function () {
                return this.game.cultivation.getStage("yuanying_0").researched;
            },
            starCondition: function () {
                return this.game.cultivation.getStage("dacheng_0").researched;
            }
        }, {
            name: "tribulation",
            title: $I("achievements.tribulation.title"),
            description: $I("achievements.tribulation.desc"),
            starDescription: $I("achievements.tribulation.starDesc"),
            condition: function () {
                return this.game.cultivation.getStage("dujie_0").researched;
            },
            starCondition: function () {
                //一世登仙——不经转世直抵渡劫
                return this.game.cultivation.getStage("dujie_0").researched
                    && this.game.stats.getStat("totalResets").val === 0;
            }
        },
        //--- 修行经历 ---
        {
            name: "firstSihua",
            title: $I("achievements.firstSihua.title"),
            description: $I("achievements.firstSihua.desc"),
            condition: function () {
                return this.game.cultivation.sihuaCount >= 1;
            }
        }, {
            name: "heartDemonPeak",
            title: $I("achievements.heartDemonPeak.title"),
            description: $I("achievements.heartDemonPeak.desc"),
            condition: function () {
                return this.game.cultivation.heartDemon >= this.game.cultivation.HEART_DEMON_GATE;
            }
        }, {
            name: "fateChosen",
            title: $I("achievements.fateChosen.title"),
            description: $I("achievements.fateChosen.desc"),
            condition: function () {
                return this.game.cultivation.fates.some(function(f){ return !!f.choiceKey; });
            }
        }, {
            name: "joinSect",
            title: $I("achievements.joinSect.title"),
            description: $I("achievements.joinSect.desc"),
            condition: function () {
                return this.game.cultivation.sects.some(function(s){ return s.researched; });
            }
        }, {
            name: "firstVein",
            title: $I("achievements.firstVein.title"),
            description: $I("achievements.firstVein.desc"),
            condition: function () {
                return this.game.cultivation.veins.some(function(v){ return v.researched; });
            }
        }, {
            name: "firstArtifact",
            title: $I("achievements.firstArtifact.title"),
            description: $I("achievements.firstArtifact.desc"),
            condition: function () {
                return this.game.cultivation.artifacts.some(function(a){ return a.researched; });
            }
        }, {
            name: "riftDelver",
            title: $I("achievements.riftDelver.title"),
            description: $I("achievements.riftDelver.desc"),
            condition: function () {
                return this.game.cultivation.riftFloor >= 10;
            }
        },
        //--- 经营里程碑 ---
        {
            name: "estateHundred",
            title: $I("achievements.estateHundred.title"),
            description: $I("achievements.estateHundred.desc"),
            condition: function () {
                var n = 0, blds = this.game.bld.buildingsData;
                for (var i = 0; i < blds.length; i++){ n += blds[i].val || 0; }
                return n >= 100;
            }
        }, {
            name: "tradeThousand",
            title: $I("achievements.tradeThousand.title"),
            description: $I("achievements.tradeThousand.desc"),
            condition: function () {
                return this.game.stats.getStat("totalTrades").val >= 500;
            }
        },
        //--- 奇物见闻 ---
        {
            name: "unicornConspiracy",
            title: $I("achievements.unicornConspiracy.title"),
            description: $I("achievements.unicornConspiracy.desc"),
            condition: function () {
                return ( this.game.resPool.get("unicorns").value > 0 );
            }
        }, {
            name: "uniception",
            title: $I("achievements.uniception.title"),
            description: $I("achievements.uniception.desc"),
            condition: function () {
                return ( this.game.resPool.get("tears").value > 0 );
            }
        }, {
            name: "sinsOfEmpire",
            title: $I("achievements.sinsOfEmpire.title"),
            description: $I("achievements.sinsOfEmpire.desc"),
            condition: function () {
                return ( this.game.resPool.get("alicorn").value > 0 );
            }
        }, {
            name: "deadSpace",
            title: $I("achievements.deadSpace.title"),
            description: $I("achievements.deadSpace.desc"),
            condition: function () {
                return ( this.game.resPool.get("necrocorn").value > 0 );
            }
        }, {
            name: "sadnessAbyss",
            title: $I("achievements.sadnessAbyss.title"),
            description: $I("achievements.sadnessAbyss.desc"),
            condition: function() {
                return this.game.resPool.get("sorrow").value >= 100;
            }
        }, {
            name: "anachronox",
            title: $I("achievements.anachronox.title"),
            description: $I("achievements.anachronox.desc"),
            condition: function () {
                return ( this.game.resPool.get("timeCrystal").value > 0 );
            }
        }, {
            name: "lotusMachine",
            title: $I("achievements.lotusMachine.title"),
            description: $I("achievements.lotusMachine.desc"),
            condition: function () {
                return (this.game.resPool.get("karma").value >= 1);
            }
        },
        //--- 远境里程碑 ---
        {
            name: "veryLargeArray",
            title: $I("achievements.veryLargeArray.title"),
            description: $I("achievements.veryLargeArray.desc"),
            condition: function() {
                return this.game.bld.get("observatory").on >= 100 && !this.game.workshop.get("seti").researched;
            }
        }, {
            name: "sunGod",
            title: $I("achievements.sunGod.title"),
            description: $I("achievements.sunGod.desc"),
            condition: function () {
                return ( this.game.religion.faith >= 696342 );
            }
        }, {
            name: "heartOfDarkness",
            title: $I("achievements.heartOfDarkness.title"),
            description: $I("achievements.heartOfDarkness.desc"),
            condition: function () {
                return (this.game.karmaZebras > 1);
            }
        }, {
            name: "deathStranding",
            title: $I("achievements.deathStranding.title"),
            description: $I("achievements.deathStranding.desc"),
            condition: function () {
                return this.game.space.getPlanet("furthestRing").reached;
            }
        }, {
            name: "cathammer",
            title: $I("achievements.cathammer.title"),
            description: $I("achievements.cathammer.desc"),
            starDescription: $I("achievements.cathammer.starDesc"),
            condition: function () {
                return this.game.stats.getStat("totalYears").val >= this.game.calendar.darkFutureBeginning;
            },
            starCondition: function () {
                return (this.game.calendar.trueYear() >= this.game.calendar.darkFutureBeginning);
            }
        }, {
            name: "jupiterAscending",
            title: $I("achievements.jupiterAscending.title"),
            description: $I("achievements.jupiterAscending.desc"),
            starDescription: $I("achievements.jupiterAscending.starDesc"),
            condition: function () {
                return ( this.game.space.getProgram("orbitalLaunch").on && this.game.calendar.year <= 1);
            },
            starCondition: function() {
                return (this.game.startedWithoutChronospheres && this.game.space.getProgram("orbitalLaunch").on && this.game.calendar.year <= 1);
            }
        }, {
            name: "spaceOddity",
            title: $I("achievements.spaceOddity.title"),
            description: $I("achievements.spaceOddity.desc"),
            starDescription: $I("achievements.spaceOddity.starDesc"),
            condition: function () {
                return this.game.space.getProgram("moonMission").on;
            },
            starCondition: function () {
                return (this.game.space.getProgram("moonMission").on && this.game.resPool.get("paragon").value < 10);
            }
        }, {
            name: "challenger",
            title: $I("achievements.challenger.title"),
            description: $I("achievements.challenger.desc"),
            starDescription: $I("achievements.challenger.starDesc"),
            condition: function() {
                return this.game.challenges.getCountUniqueCompletions() >= 5;
            },
            starCondition: function() {
                return this.game.challenges.getCountCompletions() >= 100;
            }
        }, {
            name: "betterSafeThanSorry",
            title: $I("achievements.betterSafeThanSorry.title"),
            description: $I("achievements.betterSafeThanSorry.desc"),
            starDescription: $I("achievements.betterSafeThanSorry.starDesc"),
            condition: function() {
                //手动解锁:workshop 在无污染购买碳封时授予
                return false;
            },
            starCondition: function() {
                //手动授予,但需要 starCondition 存在 UI 才会渲染星标
                return false;
            }
        },
        //--- 禁忌(不计入总数,达成前不显示) ---
        {
            name: "superUnethicalClimax",
            title: $I("achievements.superUnethicalClimax.title"),
            unethical: true,
            hidden: true,
            description: $I("achievements.superUnethicalClimax.desc"),
            condition: function () {
                return (this.game.cheatMode);
            }
        }, {
            name: "systemShock",
            title: $I("achievements.systemShock.title"),
            unethical: true,
            hidden: true,
            description: $I("achievements.systemShock.desc"),
            condition: function () {
                return (this.game.systemShockMode);
            }
        }
    ],

    //道徽 — 彩蛋向旁系标记。弟子/领袖/毛色系徽章已全部移除。
    badges: [
        {
            name: "lotus",
            title: $I("badges.lotus.title"),
            description: $I("badges.lotus.desc"),
            difficulty: "A",
            condition: function(){
                return this.game.stats.getStat("totalResets").val >= 50;
            }
        },{
            name: "beta",
            title: $I("badges.beta.title"),
            description: $I("badges.beta.desc"),
            difficulty: "B",
            condition: function(){
                if (window && window.location && window.location.href){
                    return window.location.href.indexOf("beta") >= 0;
                }
                return false;
            }
        },{
            name: "silentHill",
            title: $I("badges.silentHill.title"),
            description: $I("badges.silentHill.desc"),
            difficulty: "S",
            condition: function(){
                return (this.game.server.motdContent == "");
            }
        },{
            name: "ghostInTheMachine",
            title: $I("badges.ghostInTheMachine.title"),
            description: $I("badges.ghostInTheMachine.desc"),
            difficulty: "S"
        },{
            name: "abOwo",
            title: $I("badges.abOwo.title"),
            description: $I("badges.abOwo.desc"),
            difficulty: "A"
        },{
            name: "cleanPaws",
            title: $I("badges.cleanPaws.title"),
            description: $I("badges.cleanPaws.desc"),
            difficulty: "C"
        },{
            name: "sequenceBreak",
            title: $I("badges.sequenceBreak.title"),
            description: $I("badges.sequenceBreak.desc"),
            difficulty: "D",
            condition: function(){
                return (!this.game.space.getPlanet("moon").reached && this.game.space.getPlanet("dune").reached);
            }
        },{
            name: "whatYearIsIt",
            title: $I("badges.whatYearIsIt.title"),
            description: $I("badges.whatYearIsIt.desc"),
            difficulty: "C"
        },{
            name: "tardis",
            title: $I("badges.tardis.title"),
            description: $I("badges.tardis.desc"),
            difficulty: "C"
        },{
            name: "wheredThisComeFrom",
            title: $I("badges.wheredThisComeFrom.title"),
            description: $I("badges.wheredThisComeFrom.desc"),
            difficulty: "S"
        },{
            name: "lostDates",
            title: $I("badges.lostDates.title"),
            description: $I("badges.lostDates.desc"),
            difficulty: "B",
            condition: function() {
                //"flux" measures the amount of time the player has skipped this run
                //Negative timeskip = timeslip
                return this.game.time.flux <= -5;
                //Before you ask, no, you can't use the 1000 Years Challenge to generate timeslip
            }
        },{
            name: "buffet",
            title: $I("badges.buffet.title"),
            description: $I("badges.buffet.desc"),
            difficulty: "A",
            condition: function() {
                return this.game.diplomacy.get("leviathans").energy >= 1000;
            }
        },{
            name: "soLongAndThanksForAllTheHay",
            title: $I("badges.soLongAndThanksForAllTheHay.title"),
            description: $I("badges.soLongAndThanksForAllTheHay.desc"),
            difficulty: "S",
            condition: function() {
                var epsilon = 1e-12;
                return Math.abs(this.game.resPool.get("alicorn").value - 42) < epsilon;
            }
        }
    ],

    constructor: function (game) {
        this.game = game;
    },

    get: function (name) {
        return this.getMeta(name, this.achievements);
    },

    getBadge: function(name){
        return this.getMeta(name, this.badges);
    },

	_unlockBadge: function(badge) {
        if (!badge){ return; }
        badge.unlocked = true;
        this.game.achievements.badgesUnlocked = true;
	},
	_unlockAchievement: function(ach) {
		if (!ach){ return; }
		if (!ach.unlocked) {
			ach.unlocked = true;
			this.game.msg($I("achievements.msg.unlock", [ach.title]));
			this.game.achievementTab.visible = true;
		}
	},
	_unlockStarAchievement: function(ach) {
		if (!ach){ return; }
		if (!ach.starUnlocked) {
			ach.starUnlocked = true;
			this.game.msg($I("achievements.msg.starUnlock", [ach.title]));
			this.game.achievementTab.visible = true;
		}
	},
    unlockBadge: function(name){
		this._unlockBadge(this.getBadge(name));
    },
	unlockAchievement: function(name){
		this._unlockAchievement(this.get(name));
	},
	unlockStarAchievement: function(name){
		this._unlockStarAchievement(this.get(name));
	},

    hasUnlocked: function () {
        for (var i = 0; i < this.achievements.length; i++) {
            if (this.achievements[i].unlocked) {
                return true;
            }
        }
        return false;
    },

    update: function () {
        for (var i in this.achievements) {
            var ach = this.achievements[i];
            if (!ach.unlocked && ach.condition && ach.condition.call(this)) {
				this._unlockAchievement(ach);
            }
            if (!ach.starUnlocked && ach.starCondition && ach.starCondition.call(this)) {
				this._unlockStarAchievement(ach);
            }
        }

        for (var i in this.badges) {
            var badge = this.badges[i];
            if (!badge.unlocked && badge.condition && badge.condition.call(this)) {
				this._unlockBadge(badge);
            }
        }

        //Mess with the player a little bit.
        if (this.game.rand(100) < 10) {
            //10% chance of 5 hourglass symbols
            this.getBadge("lostDates").title = "\u231b".repeat(5);
        } else {
            //90% chance to be normal
            this.getBadge("lostDates").title = $I("badges.lostDates.title");
        }
    },

	resetState: function(){
		for (var i = 0; i < this.achievements.length; i++){
			var ach = this.achievements[i];
			ach.unlocked = false;
			ach.starUnlocked = false;
		}

        this.badgesUnlocked = false;
        for (var i = 0; i < this.badges.length; i++){
            var badge = this.badges[i];
            badge.unlocked = false;
        }
	},

    save: function (saveData) {
        saveData.achievements = this.filterMetadata(this.achievements, ["name", "unlocked", "starUnlocked"]);
        saveData.ach = {
            badgesUnlocked : this.badgesUnlocked,
            badges: this.filterMetadata(this.badges, ["name", "unlocked"])
        };
    },

    load: function (saveData) {
        this.loadMetadata(this.achievements, saveData.achievements, "achievements");

        var ach = saveData.ach || {};
        this.badgesUnlocked = ach.badgesUnlocked || false;
        this.loadMetadata(this.badges, ach.badges, "badges");
    },

    unlockAll: function(){
        for (var i in this.achievements){
            this.achievements[i].unlocked = true;
        }
        this.game.msg("All achievements are unlocked");
    }
});

dojo.declare("classes.ui.AchievementsPanel", com.nuclearunicorn.game.ui.Panel, {

	game: null,
	refreshNextTick: false, //Used internally to update the list

	constructor: function(){
		this.achievementsHeader = null;
		this.achievementsMap = {};
		this.achievementsContainer = null;
	},

    render: function(container){
        var content = this.inherited("render", arguments);
        
		this.achievementsContainer = dojo.create("div", {}, content);

		this.achievementsContainer.innerHTML = "";
		this.achievementsHeader = dojo.create("div", {className: "achievement-header"}, this.achievementsContainer);
        var totalAchievements = 0;
        var completedAchievements = 0;
        var completedStars = 0;
        var uncompletedStars = 0;
		this.achievementsMap = {}; //Associates each non-hidden achievement in the game with a UI element representing it
		for (var i in this.game.achievements.achievements){
			var ach = this.game.achievements.achievements[i];
            if (!ach.unlocked && ach.hidden){
                continue;
            }

			//Count ethical achievements: total & completed.
			if (!ach.unethical){
				totalAchievements++;
				if (ach.unlocked) {
					completedAchievements++;
				}
			}

			//Create the UI element for this achievement:
			this.achievementsMap[ach.name] = this.renderAchievementItem(ach, this.achievementsContainer);

			if (ach.starCondition == undefined) {
				continue;
			}

			//Count ethical starred achievements: completed & incomplete.
			if (!ach.unethical) {
				if (ach.starUnlocked) {
					completedStars++;
				} else {
					uncompletedStars++;
				}
			}
		}
		this.achievementsHeader.innerHTML = $I("achievements.header", [completedAchievements, totalAchievements]);
		dojo.create("span", {
			className: "star",
			innerHTML: this.generateStarText(completedStars, uncompletedStars)
		}, this.achievementsHeader);
	},

	update: function () {
		var refreshThisTick = this.refreshNextTick;
		this.refreshNextTick = false;
		//Count all the achievements:
		var totalAchievements = 0;
		var completedAchievements = 0;
		var completedStars = 0;
		var uncompletedStars = 0;
		for (var i in this.game.achievements.achievements){
			var ach = this.game.achievements.achievements[i];
			if (!ach.unlocked && ach.hidden){
				if (this.achievementsMap[ach.name]) {
					//Hide locked hidden achievements:
					dojo.destroy(this.achievementsMap[ach.name]);
					this.achievementsMap[ach.name] = undefined;
				}
				continue;
			}
			//From here on out, all achievements are non-hidden.

			if (refreshThisTick) { //Delete all entries & recreate them all
				dojo.destroy(this.achievementsMap[ach.name]);
				this.renderAchievementItem(ach, this.achievementsContainer);
			} else if (this.achievementsMap[ach.name]) { //Update existing entry
				this.updateAchievementItem(ach);
			} else {
				//We aren't refreshing & the entry for this achievement is missing.
				//Next tick, refresh everything.
				this.refreshNextTick = true;
			}
			//Count ethical achievements: total & completed.
			if (!ach.unethical){
				totalAchievements++;
				if (ach.unlocked) {
					completedAchievements++;
				}
			}
			if (ach.starCondition == undefined) {
				continue;
			}
			//Count ethical starred achievements: completed & incomplete.
			if (!ach.unethical) {
				if (ach.starUnlocked) {
					completedStars++;
				} else {
					uncompletedStars++;
				}
			}
		}

		//Update the numbers of completed & starred achievements in the header:
		var desiredHeaderText = $I("achievements.header", [completedAchievements, totalAchievements]);
		if (this.achievementsHeader.firstChild.nodeValue != desiredHeaderText) {
			this.achievementsHeader.firstChild.nodeValue = desiredHeaderText;
		}
		var desiredStarText = this.generateStarText(completedStars, uncompletedStars);
		//The inner HTML has taken the &#; format & rendered it as Unicode; we must do something similar.
		var starTextForCompare = String.fromCharCode.apply(null, desiredStarText.replaceAll("&#", "").split(";").slice(0, -1));
		if (this.achievementsHeader.firstElementChild.innerHTML != starTextForCompare) {
			this.achievementsHeader.firstElementChild.innerHTML = desiredStarText;
		}
	},

	//Creates a string composed of filled stars & unfilled stars:
	generateStarText: function(completedStars, uncompletedStars) {
		return "&#9733;".repeat(completedStars) + "&#9734;".repeat(uncompletedStars);
	},

	/**
	 * Creates a UI element representing a single achievement.
	 * @param ach The achievement object to create a UI element for
	 * @param container A <div> element or similar, inside which we'll place this
	 * @return The <span> element representing the achievement in question
	 */
	renderAchievementItem: function(ach, container) {
		var className = "achievement";
		if (ach.unlocked && ach.unethical) {className += " unethical";}
		if (ach.unlocked) {className += " unlocked";}
		if (ach.starUnlocked) {className += " starUnlocked";}
		var span = dojo.create("span", {
			className: className,
			title: ach.description || ach.title,
			innerHTML : ach.unlocked ? (ach.title + " · " + ach.description) : (ach.title + "（未达成：" + ach.description + "）")
		}, container);

		this.achievementsMap[ach.name] = span;
		if (ach.starCondition) {
			dojo.create("div", {
				className: "star",
				innerHTML: ach.starUnlocked ? "&#9733;" : "&#9734;",
				title: ach.starDescription || ach.description
			}, span);
		}

		return span;
	},

	/**
	 * Updates the state of a UI element to match the game-state.
	 * Logs an error if no corresponding UI element has been previously rendered.
	 * @param ach The achievement object to update a UI element for
	 */
	updateAchievementItem: function(ach) {
		var span = this.achievementsMap[ach.name];
		if (!span) {
			console.error("Called updateAchievementItem when no corresponding UI element exists.");
			return;
		}

		//For each property of the span, check if it's what we want it to be, then change if necessaary:
		var desiredClassName = "achievement";
		if (ach.unlocked && ach.unethical) {desiredClassName += " unethical";}
		if (ach.unlocked) {desiredClassName += " unlocked";}
		if (ach.starUnlocked) {desiredClassName += " starUnlocked";}
		if (span.className != desiredClassName) {
			span.className = desiredClassName;
		}
		var desiredTitle = ach.description || ach.title;
		if (span.title != desiredTitle) {
			span.title = desiredTitle;
		}
		var desiredContent = ach.unlocked ? (ach.title + " · " + ach.description) : (ach.title + "（未达成：" + ach.description + "）");
		if (span.firstChild.nodeValue != desiredContent) {
			span.firstChild.nodeValue = desiredContent;
		}

		//For each property of the star, check if it's what we want it to be, then change if necessaary:
		if (ach.starCondition) {
			var star = span.firstElementChild;
			var desiredInnerHTML = ach.starUnlocked ? "&#9733;" : "&#9734;";
			var desiredInnerHTMLForCompare = String.fromCharCode(ach.starUnlocked ? 9733 : 9734);
			if (star.innerHTML != desiredInnerHTMLForCompare) {
				star.innerHTML = desiredInnerHTML;
			}
			desiredTitle = ach.starDescription || ach.description;
			if (star.title != desiredTitle) {
				star.title = desiredTitle;
			}
		}
	}
});

dojo.declare("classes.ui.BadgesPanel", com.nuclearunicorn.game.ui.Panel, {

	game: null,

	constructor: function(){
		this.badgesHeader = null;
		this.badgesMap = {};
	},

    render: function(container){
        var content = this.inherited("render", arguments);
        
		var div = dojo.create("div", {className: "badges-container"}, content);
		div.innerHTML = "";
		this.badgesHeader = dojo.create("div", {className: "achievement-header"}, div);
        var totalBadges = 0;
        var completedBadges = 0;
		this.badgesMap = {}; //Associates each badge in the game with a UI element representing it
		for (var i in this.game.achievements.badges){
			var badge = this.game.achievements.badges[i];
			if (badge.fullyHidden) {
				continue;
			}
            totalBadges++;
            if (badge.unlocked) { completedBadges++; }

			this.badgesMap[badge.name] = dojo.create("span", {
				className: this.generateBadgeCSSClass(badge),
				title: badge.unlocked ? badge.description : "???",
				innerHTML : badge.unlocked ? badge.title : "???"
			}, div);
		}
		this.badgesHeader.innerHTML = $I("badges.header", [completedBadges, totalBadges]);
	},

	update: function () {
		var totalBadges = 0;
		var completedBadges = 0;
		for (var i in this.game.achievements.badges){
			var badge = this.game.achievements.badges[i];
			if (badge.fullyHidden) {
				continue;
			}
			var span = this.badgesMap[badge.name];
			//Recount every tick
			totalBadges++;
			if (badge.unlocked) { completedBadges++; }

			//For each property of the HTML element, compare it against the expected value.
			// Update only if we need to make a change.
			var desiredClassName = this.generateBadgeCSSClass(badge);
			if (span.className != desiredClassName) {
				span.className = desiredClassName;
			}
			var desiredTitle = badge.unlocked ? badge.description : "???";
			if (span.title != desiredTitle) {
				span.title = desiredTitle;
			}
			var desiredInnerHTML = badge.unlocked ? badge.title : "???";
			if (span.innerHTML != desiredInnerHTML) {
				span.innerHTML = desiredInnerHTML;
			}
		}

		var desiredHeaderText = $I("badges.header", [completedBadges, totalBadges]);
		if (this.badgesHeader.innerHTML != desiredHeaderText) {
			this.badgesHeader.innerHTML = desiredHeaderText;
		}
	},

	//Returns a string with the proper CSS class for the UI element representing a particular badge.
	generateBadgeCSSClass: function(badge) {
		var retVal = "achievement badge";
		if (badge.unlocked) {
			retVal += " unlocked";
		}
		return retVal;
	}
});

dojo.declare("com.nuclearunicorn.game.ui.tab.AchTab", com.nuclearunicorn.game.ui.tab, {

    constructor: function(){
    },

	render: function(container){

        this.achievementsPanel = new classes.ui.AchievementsPanel($I("achievements.panel.label"), this.game.achievements);
		this.achievementsPanel.game = this.game;
        this.achievementsPanel.render(container);
        
        //basges typo intentional cause I keep mistyping it
        this.badgesPanel = new classes.ui.BadgesPanel($I("badges.panel.label"), this.game.achievements);
		this.badgesPanel.game = this.game;
		this.badgesPanel.render(container);

        //---------------------------
        //         Blah
        //---------------------------
        this.container = container;

        this.inherited(arguments);
        this.update();
        //--------------------------
	},

    update: function() {
		this.achievementsPanel.update();
		this.badgesPanel.update();
    }
});
