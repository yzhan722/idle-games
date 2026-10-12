//------------------------------------------




/**
 * Deprecated, use toolbar.jsx.js
 */



//keeping it here in case some 3rd party scripts rely on this
//---------------------------------------- 
dojo.declare("classes.ui.Toolbar", null, {

	icons: null,
	game: null,

	constructor: function(game){
		this.game = game;

		this.icons = [];

		this.addIcon(new classes.ui.toolbar.ToolbarMOTD(game));
		this.addIcon(new classes.ui.toolbar.ToolbarEnergy(game));
	},

	addIcon: function(icon){
		this.icons.push(icon);
	},

	render: function(container){
		dojo.empty(container);

		for (var i in this.icons){
			var iconContainer = this.icons[i].render(container);
			var icon = this.icons[i];
			if (icon.getOpts().hasTooltip) {
				this.attachToolbarTooltip(iconContainer, this.icons[i]);
				dojo.connect(iconContainer, "onclick", this.icons[i], "onClick");
			}
			switch (i) {
				case "0": // MOTD
					dojo.addClass(iconContainer, "motd");
					break;
				case "1": // Energy
					dojo.addClass(iconContainer, "energy");
					break;
			}		
		}
		this.update(true /*forceUpdate*/);
	},

	update: function(forceUpdate){
		for (var i in this.icons){
			var icon = this.icons[i];
			if (icon.getOpts().needUpdate || forceUpdate) {
				this.icons[i].update();
			}
		}

		var sorrowRes = this.game.resPool.get("sorrow"),
			sorrow = sorrowRes.value;
		$("#sorrowTooltip").html(sorrow ?
			$I("resources.sorrow.short") + ": " + sorrow.toFixed() + "%" :
			""
		);
		var isMax = (sorrowRes.value == sorrowRes.maxValue);
		$("#sorrowTooltip").addClass(isMax ? "max" : "");
	},


	//TODO: move all this stuff to some util class?
	attachToolbarTooltip: function(container, icon){
		UIUtils.attachTooltip(this.game, container, 0, 100, icon.getTooltip);
	},

	updateTooltip: function(container, tooltip, htmlProvider){
		tooltip.innerHTML = dojo.hitch(this, htmlProvider)();
	}
});

dojo.declare("classes.ui.ToolbarIcon", null, {
	game: null,
	container: null,

	constructor: function(game){
		this.game = game;
	},

	render: function(container){
		this.container = dojo.create("span", {
			className: "toolbarIcon"
		}, container);

		return this.container;
	},

	update: function(){
	},

	getTooltip: function(){
		return "Unimplemented";
	},

	onClick: function(){

	},

	getOpts: function(){
		return {
			needUpdate: true,
			hasTooltip: true
		};
	}
});

dojo.declare("classes.ui.toolbar.ToolbarEnergy", classes.ui.ToolbarIcon, {
	update: function(){
		if (!this.game.science.get("electricity").researched){
			dojo.style(this.container, "display", "none");
		} else {
			dojo.style(this.container, "display", "");
		}

		var resPool = this.game.resPool;
		this.container.innerHTML = "&#9889;&nbsp;" + this.game.getDisplayValueExt(resPool.energyProd - resPool.energyCons) + $I("unit.watt");

		if (resPool.energyProd < resPool.energyCons) {
			$(this.container).removeClass("warningWinter");
			$(this.container).addClass("warning");
		} else if (resPool.energyWinterProd < resPool.energyCons) {
			$(this.container).removeClass("warning");
			$(this.container).addClass("warningWinter");
		} else {
			$(this.container).removeClass("warning");
			$(this.container).removeClass("warningWinter");
		}
	},
	getTooltip: function(){
		var resPool = this.game.resPool;
		var energy = resPool.energyProd - resPool.energyCons;

        var delta = this.game.resPool.getEnergyDelta();
		var penalty = energy >= 0 ? "" : "<br><br>" + $I("navbar.energy.penalty") + "<span class='energyPenalty'>-" + Math.floor( (1 - delta) * 100) + "%</span>";

		return $I("navbar.energy.prod") + "<span class='energyProduction'>" +  this.game.getDisplayValueExt(resPool.energyProd, true, false) + $I("unit.watt") + "</span>" +
			   "<br>" + $I("navbar.energy.cons") + "<span class='energyConsumption'>-" +  this.game.getDisplayValueExt(resPool.energyCons) + $I("unit.watt") + "</span>" + penalty;
	}
});

dojo.declare("classes.ui.toolbar.ToolbarMOTD", classes.ui.ToolbarIcon, {
	update: function(){
		var server = this.game.server;
		if (server.showMotd && server.motdTitle) {
			this.container.innerHTML = "&nbsp;" + server.motdTitle + "&nbsp;";
		}

		if (server.motdFreshMessage) {
			dojo.addClass(this.container, "freshMessage");
		} else {
			dojo.removeClass(this.container, "freshMessage");
		}
	},

	getTooltip: function(){
		var server = this.game.server;
		if (server.showMotd && server.motdContent) {
			server.motdFreshMessage = false;
			return "Message of the day:<br />" + server.motdContent;
		}
	}
});
