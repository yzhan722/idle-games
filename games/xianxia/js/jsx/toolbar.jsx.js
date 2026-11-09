/* global

    $r,
    WToolbar: writable,
    WToolbarIconContainer: writable,
    WToolbarEnergy: writable,
    WToolbarPollution: writable,
    game
*/

WToolbarIconContainer = React.createClass({
    componentDidMount: function(){
        if (this.props.getTooltip){
            this.attachToolbarTooltip();
        }
    },

    render: function(){
        return $r("div", {
            className:"toolbarIcon " + this.props.className,
            ref: "iconContainer"
        }, this.props.children);
    },

    attachToolbarTooltip: function(){
        var container = React.findDOMNode(this.refs.iconContainer);
        var getTooltip = this.props.getTooltip;
        var game = this.props.game;

        UIUtils.attachTooltip(game, container, 0, 100, getTooltip);
	}
})

WToolbarEnergy = React.createClass({
    render: function(){
        var game = this.props.game;

        if (!game.science.get("electricity").researched){
            return null;
        }

        var resPool = game.resPool;
        var className = "";
        if (resPool.energyProd < resPool.energyCons) {
            className = " warning";
        } else if (resPool.energyWinterProd < resPool.energyCons) {
            className = " warningWinter";
        }

        return $r(WToolbarIconContainer, {
            game: game,
            getTooltip: this.getTooltip,
            className: "energy" + className
        },
            $r("div", {className:"energyText",
                dangerouslySetInnerHTML: {
                    __html: game.getDisplayValueExt(resPool.energyProd - resPool.energyCons) + $I("unit.watt")
				}
            })
        );
    },
    getTooltip: function(){
        this.game = this.props.game;    //hack

        var resPool = this.game.resPool;
		var energy = resPool.energyProd - resPool.energyCons;

        var delta = this.game.resPool.getEnergyDelta();
		var penalty = energy >= 0 ? "" : "<br><br>" + $I("navbar.energy.penalty") + "<span class='energyPenalty'>-" + Math.floor( (1 - delta) * 100) + "%</span>";

		return $I("navbar.energy.prod.short") + " <span class='energyProduction'>" +  this.game.getDisplayValueExt(resPool.energyProd, true, false) + $I("unit.watt") + "</span>" +
			   "<br>" + $I("navbar.energy.cons.short") + " <span class='energyConsumption'>-" +  this.game.getDisplayValueExt(resPool.energyCons) + $I("unit.watt") + "</span>" + penalty;
    }
});

WToolbarPollution = React.createClass({
    freshMessage: false,
    message: "",

    render: function(){
        var game = this.props.game;
        var message = this.getTooltip(true);
        if(this.message != message){
            this.freshMessage = this.message != "";
            this.message = message;
        }
        if(game.bld.cathPollution > 100000 || game.science.get("ecology").researched){
            return $r(WToolbarIconContainer, {
                game: game,
                getTooltip: this.getTooltip,
                className: "pollutionIcon " + (this.freshMessage ? "energy warning": null)
            },
                $r("div", {className:"pollutionText"},
                (game.science.get("ecology").researched ? (this.getPollutionMod()) : "\xa0"))
            );
        }
        return null;
    },
    getTooltip: function(notUpdateFreshMessage){
        var game = this.props.game;

        var message = "";
        var eqPol = game.bld.getEquilibriumPollution();
        var eqPolLvl = game.bld.getPollutionLevel(eqPol);
        var pollution = game.bld.cathPollution;
        var polLvl = game.bld.getPollutionLevel();
        var polLvlShow = game.bld.getPollutionLevel(pollution * 2);
        if (polLvl >= 4){
            message += $I("pollution.level1") + "<br/>" + $I("pollution.level2") + "<br/>" + $I("pollution.level3", [game.villageTab.getVillageTitle()]) + "<br/>" + $I("pollution.level4");
        }
        else if (polLvlShow == 3 || polLvl == 3){
            message += $I("pollution.level1") + "<br/>" + $I("pollution.level2") + "<br/>" + $I("pollution.level3", [game.villageTab.getVillageTitle()]);
        }
        else if (polLvlShow == 2){
            message += $I("pollution.level1") + "<br/>" + $I("pollution.level2");
        }
        else if (polLvlShow == 1){
            message += $I("pollution.level1");
        } else {
            message = $I("pollution.level0");
        }

        var warnLvl = game.bld.getPollutionLevel(pollution * 4);
        if (warnLvl >= 1 && warnLvl <= 4 && warnLvl > polLvlShow && warnLvl <= eqPolLvl) {
            message += "<br/>" + $I("pollution.level" + warnLvl + ".warning");
        }
        if (pollution * 1.5 < eqPol || eqPolLvl > polLvl){
            message += "<br/>" + $I("pollution.increasing");
        }
        else if (pollution >= 0 && game.bld.cathPollutionPerTick <= 0 && eqPolLvl < polLvl){
            message += "<br/>" + $I("pollution.cleaning");
        }
        else if (eqPolLvl == polLvl && eqPol > 0){
            message += "<br/>" + $I("pollution.equilibrium");
        }
        else {
            message += "<br/>" + $I("pollution.pristine");
        }
        if (notUpdateFreshMessage){
            return message;
        }
        message +="<br/>CO₂: " + (game.science.get("ecology").researched ?
            this.getPollutionMod() : $I("pollution.unspecified"));
        this.freshMessage = false;
        return message;
    },

    getPollutionMod: function(){
        var game = this.props.game;
        return game.getDisplayValueExt((game.bld.cathPollution / game.bld.getPollutionLevelBase())*100) + " 浊度";
    }
});

WToolbar = React.createClass({
    getInitialState: function(){
        return {game: this.props.game};
    },

    componentDidMount: function(){
        var self = this;
        this.onUpdateHandler = dojo.subscribe("ui/update", function(game){
            self.setState({game: game});
        });
    },

    componentWillUnmount: function(){
        dojo.unsubscribe(this.onUpdateHandler);
    },

    getIcons: function(){
        var game = this.state.game;
        var icons = [];
        icons.push(
            game.opts.disablePollution ? null : $r(WToolbarPollution, {game: game}),
            $r(WToolbarEnergy, {game: game})

        );
        return icons;
    },

    render: function(){
        var icons = this.getIcons();
        return $r("div", {className:"icons-container"}, icons);
    }
});
