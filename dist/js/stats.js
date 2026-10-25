dojo.declare("classes.managers.StatsManager", com.nuclearunicorn.core.TabManager, {
    game: null,

    stats:
        [{
            name: "totalYears",
            title: $I("stats.years.total"),
            val: 0,
            unlocked: true,
			defaultUnlocked: true
        }, {
            name: "totalResets",
            title: $I("stats.run.number"),
            val: 0,
            unlocked: true,
            defaultUnlocked: true
        },{
            name: "totalParagon",
            title:  $I("stats.paragon.total"),
            val: 0,
            unlocked: true,
            defaultUnlocked: true
        }, {
            name: "eventsObserved",
            title: $I("stats.events.total"),
            val: 0,
            unlocked: true,
            defaultUnlocked: true
        }, {
            name: "unicornsSacrificed",
            title: $I("stats.unicorns"),
            val: 0,
            unlocked: false
        }, {
            name: "buildingsConstructed",
            title: $I("stats.buildings"),
            val: 0,
            unlocked: true,
            defaultUnlocked: true
        }, {
            name: "totalClicks",
            title: $I("stats.clicks.total"),
            val: 0,
            unlocked: true,
            defaultUnlocked: true
        },{
            name: "totalTrades",
            title:  $I("stats.trades.total"),
            val: 0,
            unlocked: true,
            defaultUnlocked: true
        },{
            name: "totalCrafts",
            title: $I("stats.crafts.total"),
            val: 0,
            unlocked: true,
            defaultUnlocked: true
        },{
            name: "transcendenceTier",
            title: $I("stats.transcendenceTier"),
            val: 0,
            calculate: function(game){
                return game.religion.transcendenceTier;
            },
            unlocked: true,
            defaultUnlocked: true
        },{
            name: "totalChallengesCompleted",
            title: $I("stats.challenges.total"),
            val: 0,
            calculate: function(game){
                return game.challenges.getCountCompletions();
            },
            unlocked: true,
            defaultUnlocked: true
        }
    ],

    statsCurrent: [{
        name: "totalTrades",
        title: $I("stats.trades.current"),
        val: 0,
        unlocked: true,
        defaultUnlocked: true
    },{
        name: "totalCrafts",
        title:$I("stats.crafts.current") ,
        val: 0,
        unlocked: true,
        defaultUnlocked: true
    },{
        name: "timePlayed",
        title: $I("stats.time.current"),
        val: 0,
        calculate: function (game) {
            return game.toDisplaySeconds(game.calendar.trueYear() * game.calendar.seasonsPerYear * game.calendar.daysPerSeason * game.calendar.ticksPerDay / game.ticksPerSecond);
        },
        unlocked: true,
        defaultUnlocked: true
    }
    ],

    statGroups: null,

    constructor: function(game){
        this.game = game;

        this.statGroups = [
            {
                group: this.stats,
                title: $I("stats.group.all")
            },
            {
                group: this.statsCurrent,
                title: $I("stats.group.current")
            }
        ];
    },

	resetState: function(){
		for (var i = 0; i < this.stats.length; i++){
			var stat = this.stats[i];
			stat.val = 0;
			stat.unlocked = stat.defaultUnlocked || false;
		}

		for (i = 0; i < this.statsCurrent.length; i++){
			var stat = this.statsCurrent[i];
			stat.val = 0;
			stat.unlocked = stat.defaultUnlocked || false;
		}
	},

	save: function(saveData){
        saveData.stats = this.filterMetadata(this.stats, ["name", "val"]);
        saveData.statsCurrent = this.filterMetadata(this.statsCurrent, ["name", "val"]);
    },

    load: function(saveData){
		var liveAll = {}, liveCur = {}, i;
		for (i = 0; i < this.stats.length; i++){ liveAll[this.stats[i].name] = true; }
		for (i = 0; i < this.statsCurrent.length; i++){ liveCur[this.statsCurrent[i].name] = true; }
		var savedAll = (saveData.stats || []).filter(function(s){ return s && liveAll[s.name]; });
		var savedCur = (saveData.statsCurrent || []).filter(function(s){ return s && liveCur[s.name]; });
		this.loadMetadata(this.stats, savedAll, "stats");
		this.loadMetadata(this.statsCurrent, savedCur, "statsCurrent");
    },

    getStat: function(name){
        return this.getMeta(name, this.stats);
    },

    getStatCurrent: function (name) {
        var stat = this.getMeta(name, this.statsCurrent);
        if (stat.calculate) {stat.val = stat.calculate(this.game);}
        return stat;
    },

    unlockAll: function(){
        for (var i in this.statsCurrent) {
            this.statsCurrent[i].unlocked = true;
        }
        for (var i in this.stats) {
            this.stats[i].unlocked = true;
        }
    }

});

dojo.declare("classes.tab.StatsTab", com.nuclearunicorn.game.ui.tab, {

    container: null,
    jianghuContainer: null,
    _built: false,

    constructor: function(tabName){

    },

    render: function(content){
        this.container = content;
        this._built = false;

        this.update();
    },

    //------------------ 江湖榜 ------------------

    renderJianghu: function(){
        var game = this.game;
        var self = this;

        this.jianghuContainer = dojo.create("div", {class: "jianghuBoard"}, this.container);
        var board = this.jianghuContainer;

        dojo.create("h1", {innerHTML: $I("stats.jianghu.title")}, board);

        var controls = dojo.create("div", {class: "jianghuControls"}, board);
        var nameInput = dojo.create("input", {
            type: "text",
            maxlength: 24,
            placeholder: $I("stats.jianghu.name.placeholder"),
            value: game.telemetry.jianghuName || ""
        }, controls);
        dojo.connect(nameInput, "onchange", null, function(){
            game.telemetry.jianghuName = nameInput.value.trim().slice(0, 24) || null;
        });
        dojo.create("span", {innerHTML: "&nbsp;"}, controls);
        var submitBtn = dojo.create("a", {class: "link", innerHTML: $I("stats.jianghu.submit"), href: "#"}, controls);
        dojo.create("span", {innerHTML: "&nbsp;"}, controls);
        var refreshBtn = dojo.create("a", {class: "link", innerHTML: $I("stats.jianghu.refresh"), href: "#"}, controls);

        var tableHolder = dojo.create("div", null, board);

        var renderRows = function(resp){
            dojo.empty(tableHolder);
            var entries = (resp && resp.entries) || [];
            if (!entries.length){
                dojo.create("div", {innerHTML: $I("stats.jianghu.empty")}, tableHolder);
                return;
            }
            var table = dojo.create("table", {class: "statTable jianghuTable"}, tableHolder);
            var head = dojo.create("tr", null, table);
            ["rank", "dao", "realm", "xiuwei", "resets", "years", "ach"].forEach(function(k){
                dojo.create("th", {innerHTML: $I("stats.jianghu.col." + k)}, head);
            });
            var me = game.telemetry.guid;
            for (var i = 0; i < entries.length; i++){
                var e = entries[i];
                var tr = dojo.create("tr", {class: (e.guid == me) ? "jianghuSelf" : ""}, table);
                dojo.create("td", {innerHTML: i + 1}, tr);
                var tdName = dojo.create("td", null, tr);
                tdName.textContent = e.name + (e.guid == me ? " " + $I("stats.jianghu.you") : "");
                var tdRealm = dojo.create("td", null, tr);
                tdRealm.textContent = e.stage || "";
                dojo.create("td", {innerHTML: game.getDisplayValueExt(e.xiuwei || 0)}, tr);
                dojo.create("td", {innerHTML: e.resets || 0}, tr);
                dojo.create("td", {innerHTML: $I("stats.jianghu.years.fmt", [e.year || 0])}, tr);
                dojo.create("td", {innerHTML: e.achievements || 0}, tr);
            }
            if (resp.selfRank && resp.selfRank > entries.length){
                dojo.create("div", {
                    innerHTML: $I("stats.jianghu.selfrank", [resp.selfRank, resp.total])
                }, tableHolder);
            }
        };

        var refresh = function(){
            //server.json resolves the real kgnetUrl — fetching before it lands
            //would hit the UNCONFIGURED placeholder
            var pending = game.server._serverInfoPromise;
            if (pending && pending.state && pending.state() == "pending"){
                pending.always(refresh);
                return;
            }
            game.server.fetchJianghu()
                .done(function(resp){ renderRows(resp); })
                .fail(function(){
                    dojo.empty(tableHolder);
                    dojo.create("div", {innerHTML: $I("stats.jianghu.offline")}, tableHolder);
                });
        };
        dojo.connect(submitBtn, "onclick", null, function(evt){
            dojo.stopEvent(evt);
            game.telemetry.jianghuName = nameInput.value.trim().slice(0, 24) || null;
            var xhr = game.server.submitJianghu();
            if (xhr){ xhr.always(refresh); } else { refresh(); }
        });
        dojo.connect(refreshBtn, "onclick", null, function(evt){
            dojo.stopEvent(evt);
            refresh();
        });
        refresh();
    },

    update: function(){
        //build the DOM once — rebuilding every tick fired a leaderboard fetch
        //per tick and made the whole panel strobe. Afterwards we only patch
        //stat cell text in place.
        if (!this._built){
            this._built = true;
            this.renderJianghu();

            for (var idx in this.game.stats.statGroups) {
                var statGroup = this.game.stats.statGroups[idx];

                dojo.create("h1", {
                    innerHTML: statGroup.title
                }, this.container);

                var stats = statGroup.group;
                var table = dojo.create("table", {class: "statTable"}, this.container);

                for (var i in stats) {
                    var stat = stats[i];
                    var tr = dojo.create("tr", null, table);
                    stat._titleCell = dojo.create("td", null, tr);
                    stat._valueCell = dojo.create("td", null, tr);
                }
            }
        }

        for (var g in this.game.stats.statGroups) {
            var group = this.game.stats.statGroups[g].group;
            for (var s in group) {
                var stat = group[s];

                if (stat.calculate) {
                    stat.val = stat.calculate(this.game);
                }
                if (stat.val != 0) {
                    stat.unlocked = true;
                }
                if (stat.name == "totalResets") {
                    stat.val++;
                }

                if (stat._titleCell && stat._titleCell.parentNode){
                    stat._titleCell.parentNode.style.display = stat.unlocked ? "" : "none";
                }
                stat._titleCell.innerHTML = stat.unlocked ? stat.title : "???";
                stat._valueCell.innerHTML = stat.unlocked
                    ? typeof stat.val == "number" ? this.game.getDisplayValueExt(stat.val) : stat.val
                    : "";

                if (stat.name == "totalResets") {
                    stat.val--;
                }
            }
        }
    }
});
