/* global 

    $r,
    WCollapsiblePanel: writable,
    WResourceRow:writable, 
    WCraftRow:writable, 
    WResourceTable:writable,
    WCraftTable:writable,
    WLeftPanel:writable,
    WPins: writable,
    WTooltip:writable,
    WCraftShortcut:writable,
    game
*/

WCollapsiblePanel = React.createClass({
    getInitialState: function(){
        return {isCollapsed: false};
    },

    render: function(){
        return $r("div", {className: "xx-res-sec"}, [
            $r("div", {className: "xx-res-sec-hd", onClick: this.toggleCollapsed}, [
                $r("span", {className: "xx-res-sec-title"}, this.props.title),
                $r("span", {className: "xx-res-sec-caret"}, this.state.isCollapsed ? "▸" : "▾")
            ]),
            !this.state.isCollapsed && this.props.children
        ]);
    },

    toggleCollapsed: function(){
        this.setState({isCollapsed: !this.state.isCollapsed});
    },
});

WResourceRow = React.createClass({

    getDefaultProperties: function(){
        return {resource: null, isEditMode: false, isRequired: false, showHiddenResources: false, isTemporalParadox: false};
    },

    shouldComponentUpdate: function(nextProp){
        var newVisibility = this.getIsResInMainTable(nextProp.resource, nextProp);
        if (this.oldVisibility !== newVisibility) {
            this.oldVisibility = newVisibility;
            return true;
        }
        return newVisibility;
    },

    render: function(){
        var res = this.props.resource;

        if (!this.getIsResInMainTable()) {
            return null;
        }

        var isTimeParadox = this.props.isTemporalParadox;
        
        var perTick = isTimeParadox ? 0 : game.getResourcePerTick(res.name, true);
        perTick = game.opts.usePerSecondValues ? perTick * game.getTicksPerSecondUI() : perTick;
        var postfix = game.opts.usePerSecondValues ? "/" + $I("unit.s") : "";
        if (game.opts.usePercentageResourceValues && res.maxValue){
            perTick = (perTick / res.maxValue * 100).toFixed(2);
            postfix = "%" + postfix;
        }
        
        var perTickVal = 
            game.getResourcePerTick(res.name, false) || 
            game.getResourcePerTickConvertion(res.name) ? 
            game.getDisplayValueExt(perTick, true, false) + postfix : 
            (res.calculatePerDay)? game.getDisplayValueExt((game.getResourcePerDay(res.name)), true, false) + "/" + $I("unit.d"):
            (res.calculateOnYear)? game.getDisplayValueExt(game.getResourceOnYearProduction(res.name), true, false) + "/" + $I("unit.y"): "";

        var resNameCss = {};
        if (res.color){
            resNameCss = { color: res.color };
        }
        if (res.style){
            for (var styleKey in res.style){
                resNameCss[styleKey] = res.style[styleKey];
            }
        }

        var resAmtClassName = "resAmount";
        if (res.value > res.maxValue * 0.95 && res.maxValue > 0){
            resAmtClassName = "resAmount resLimitNotice";
        } else if (res.value > res.maxValue * 0.75 && res.maxValue > 0){
            resAmtClassName = "resAmount resLimitWarn";
        }

        var season = game.calendar.getCurSeason();
        var weatherModValue = null,
            weatherModCss = null;

        if (season.modifiers[res.name] && perTick !== 0 ){
            var modifier = game.calendar.getWeatherMod(res);
            if (modifier == 0) {
                modifier = -100;
            } else {
                modifier = Math.max(Math.round((modifier - 1) * 100), -99);
            }
            weatherModValue = modifier ? (modifier > 0 ? "+" : "") + modifier.toFixed() + "%" : "";

            if (modifier > 0) {
                weatherModCss = "positive-weather";
            } else if (modifier < 0) {
                weatherModCss = "negative-weather";
            }
        }

        var resRowClass = "res-row resource_" + res.name +
            (this.props.isRequired ? " highlited" : "") +
            (!res.visible || res.isHidden ? " hidden" : "");

        var resPercent = "";
        if (res.maxValue) {
            resPercent = ((res.value / res.maxValue) * 100).toFixed() + "%/" + game.getDisplayValueExt(res.maxValue);
        } else {
            resPercent = game.getDisplayValueExt(Math.round(res.value), false, false, 1);
        }

        var capPct = res.maxValue ? Math.min(100, Math.max(0, res.value / res.maxValue * 100)) : 0;
        var capCls = res.maxValue ?
            (capPct >= 95 ? " full" : (capPct >= 75 ? " high" : "")) : null;
        var resIcoSvg = (typeof classes != "undefined" && classes.ui && classes.ui.XianxiaArt)
            ? classes.ui.XianxiaArt.resIcon(res.name) : "";

        // Inline contextual actions:
        // 1) wood (灵木): inline refine from catnip (灵草×100 -> 灵木×1) so wood never needs a duplicate row in CraftTable
        // 2) faith (愿力): inline praise button when faith >= 1
        var inlineActions = null;
        if (!game.isReadOnly()) {
            if (res.name == "wood") {
                var catnipVal = game.resPool.get("catnip").value;
                var canRefineWood = Math.floor(catnipVal / 100);
                if (canRefineWood >= 1) {
                    inlineActions = $r("span", {className: "xx-res-acts"}, [
                        $r("a", {
                            href: "#!",
                            className: "xx-res-act",
                            onClick: this.refineWoodOne,
                            title: "凝练灵木 (消耗100灵草)"
                        }, "+1"),
                        canRefineWood >= 5 ? $r("a", {
                            href: "#!",
                            className: "xx-res-act xx-res-act-all",
                            onClick: this.refineWoodAll,
                            title: "全部凝木 (消耗灵草凝练 " + canRefineWood + " 灵木)"
                        }, "全") : null
                    ]);
                }
            } else if (res.name == "faith" && res.value >= 1) {
                inlineActions = $r("span", {className: "xx-res-acts"}, [
                    $r("a", {
                        href: "#!",
                        className: "xx-res-act",
                        onClick: this.praiseFaith,
                        title: $I("left.praise")
                    }, "礼敬")
                ]);
            }
        }

        return $r("div", {role: "row", className: resRowClass, ref: "perTickNode"}, [
            this.props.isEditMode ?
                $r("div", {className:"res-cell res-edit"},
                    $r("input", {
                        type:"checkbox",
                        checked: this.getIsVisible(),
                        title: "Toggle " + (res.title || res.name),
                        onClick: this.toggleView,
                        style:{display:"inline-block"},
                    })
                ) : null,

            $r("div", {className:"res-cell res-head", role: "gridcell"}, [
                resIcoSvg ? $r("span", {
                    className: "xx-res-ico",
                    "aria-hidden": "true",
                    dangerouslySetInnerHTML: {__html: resIcoSvg}
                }) : null,
                $r("span", {
                    className:"resource-name",
                    style:resNameCss,
                    onClick: this.onClickName,
                    title: (res.title || res.name) + " " + resPercent + " " + perTickVal,
                    userFocus:"normal",
                    tabIndex: 0,
                },
                    res.title || res.name
                ),
                weatherModValue != null && $r("span", {
                    className:"res-weather" + (weatherModCss ? " " + weatherModCss : "")
                }, weatherModValue),
                inlineActions
            ]),
            $r("div", {className:"res-cell res-figure " + resAmtClassName, role: "gridcell"}, [
                $r("span", {className:"res-val"}, game.getDisplayValueExt(res.value)),
                res.maxValue ? $r("span", {className:"maxRes"},
                    "/" + game.getDisplayValueExt(res.maxValue)) : null
            ]),
            $r("div", {className:"res-cell resPerTick" + (perTick < 0 ? " neg" : (!perTickVal ? " idle" : "")), role: "gridcell"},
                isTimeParadox ? "???" : (perTickVal || "—")),
            capCls != null && $r("div", {className:"res-cap" + capCls, role: "presentation"},
                $r("i", {style:{width: capPct + "%"}})
            )
        ]);
    },

    refineWoodOne: function(e){
        if (e){ e.preventDefault(); e.stopPropagation(); }
        game.craft("wood", 1);
    },

    refineWoodAll: function(e){
        if (e){ e.preventDefault(); e.stopPropagation(); }
        game.craftAll("wood");
    },

    praiseFaith: function(e){
        if (e){ e.preventDefault(); e.stopPropagation(); }
        game.praise(e);
    },

    onClickName: function(e){
        if (this.props.isEditMode || e.ctrlKey || e.metaKey){
            this.toggleView();
        } 
    },

    toggleView: function(){
        game.resPool.setResourceIsHidden(this.props.resource.name, !this.props.resource.isHidden);
    },

    getIsVisible: function(res) {
        res = res || this.props.resource;
        return !res.isHidden;
    },

    getIsResInMainTable: function(res, props) {
        res = res || this.props.resource;
        props = props || this.props;

        // Core workshop crafts always live in the dedicated 【百艺炼制】 section, never jumping tables
        if (res.category === "craft" || game.resPool.isNormalCraftableResource(res)){
            return false;
        }
        if (!res.visible && !props.showHiddenResources){
            return false;
        }
        var hasVisibility = res.unlocked;
        if (!hasVisibility || (!this.getIsVisible(res) && !props.isEditMode)){
            return false;
        }
        return true;
    },

    componentDidMount: function(){
        var node = React.findDOMNode(this.refs.perTickNode);
        if (node){
            this.refs.isTooltipAttached = true;
            game.attachResourceTooltip(node, this.props.resource);
        }
    },

    componentDidUpdate: function(){
        var node = React.findDOMNode(this.refs.perTickNode);
        if (this.refs.isTooltipAttached && !node) {
            this.refs.isTooltipAttached = false;
        }
        if (node && !this.refs.isTooltipAttached) {
            this.refs.isTooltipAttached = true;
            game.attachResourceTooltip(node, this.props.resource);
        }
    }
});

WCraftShortcut = React.createClass({
    getDefaultProperties: function(){
        return {resource: null, craftFixed: null, craftPercent: null};
    },

    render: function() {
        var res = this.props.resource,
            recipe = this.props.recipe;

        var craftFixed = this.props.craftFixed || 1,
            craftPercent = this.props.craftPercent,
            allCount = game.workshop.getCraftAllCount(res.name),
            craftRatio = game.getResCraftRatio(res.name),
            craftPrices = game.workshop.getCraftPrice(recipe);

        var craftRowAmt = craftFixed;
        if (craftFixed < allCount * craftPercent) {
            craftRowAmt = Math.floor(allCount * craftPercent);
        }

        // Eliminate empty ghost boxes and redundant higher-tier buttons
        var elem = null;
        var cssClasses = "res-cell craft-link ";
        if (craftPercent == 1) {
            if (allCount < 2 || !this.hasMinAmt(recipe)) {
                return null;
            }
            cssClasses += "all";
            elem = $r("div", {
                className: cssClasses,
                onClick: this.doCraftAll,
                title: "+" + game.getDisplayValueExt(allCount * (1 + craftRatio), null, null, 0)
            }, $I("resources.craftTable.all"));
        } else {
            var isPrimaryBtn = (craftFixed === 1);
            var canAfford = game.resPool.hasRes(craftPrices, craftRowAmt) && allCount >= craftFixed;
            if (!canAfford) {
                if (!isPrimaryBtn) {
                    return null;
                }
                // Primary button stays visible in a clean muted state so hovering always reveals the recipe cost
                cssClasses += "craft-disabled";
                elem = $r("div", {className: cssClasses}, "配方");
            } else {
                cssClasses += "craft-" + (craftPercent * 100) + "pc";
                var label = game.opts.usePercentageConsumptionValues
                    ? (craftPercent * 100) + "%"
                    : "+" + game.getDisplayValueExt(craftRowAmt * (1 + craftRatio), null, null, 0);
                elem = $r("div", {
                    className: cssClasses,
                    onClick: this.doCraft
                }, label);
            }
        }

        return $r("div", {ref:"linkBlock", className: "xx-craft-btn-wrap"}, elem);
    },

    attachCraftTooltip: function(){
        var recipe = this.props.recipe;
        var ratio = this.props.craftPercent;
        var num = this.props.craftFixed || 1;

        var node = React.findDOMNode(this.refs.linkBlock);
        if (node && node.firstChild && !node.firstChild._xxCraftTipBound){
            node.firstChild._xxCraftTipBound = true;
            UIUtils.attachTooltip(game, node.firstChild, 0, 60, dojo.partial(function(recipe){
                var tooltip = dojo.create("div", { className: "button_tooltip" }, null);
                var prices = game.workshop.getCraftPrice(recipe);

                var allCount = game.workshop.getCraftAllCount(recipe.name);
                var ratioCount = ratio == 1 ? Math.max(1, allCount) : Math.floor(allCount * ratio);
                var craftRowAmt = Math.max(num, ratioCount);

                for (var i = 0; i < prices.length; i++){
                    var price = prices[i];
                    var priceItemNode = dojo.create("div", {style: {clear: "both", minWidth: "130px"}}, tooltip);
                    var resObj = game.resPool.get(price.name);
                    var needVal = price.val * craftRowAmt;
                    var hasEnough = resObj.value >= needVal;

                    dojo.create("span", {
                        innerHTML: resObj.title || resObj.name,
                        style: { float: "left", color: "#9fb0c4" }
                    }, priceItemNode );

                    dojo.create("span", {
                        innerHTML: game.getDisplayValueExt( resObj.value ) + " / " + game.getDisplayValueExt( needVal ),
                        className: hasEnough ? "" : "noRes",
                        style: { float: "right", paddingLeft: "10px" }
                    }, priceItemNode );
                }
                return tooltip.outerHTML;
            }, recipe));
        }
    },

    componentDidMount: function(){
        this.attachCraftTooltip();
    },

    componentDidUpdate: function(){
        this.attachCraftTooltip();
    },

    hasMinAmt: function(recipe){
        var minAmt = Number.MAX_VALUE;
        var craftPrices = game.workshop.getCraftPrice(recipe);

        for (var j = 0; j < craftPrices.length; j++){
            var totalRes = game.resPool.get(craftPrices[j].name).value;
            var allAmt = Math.floor(totalRes / craftPrices[j].val);
            if (allAmt < minAmt){
                minAmt = allAmt;
            }
        }

        return minAmt > 0 && minAmt < Number.MAX_VALUE;
    },
    
    doCraft: function(event){
        if (event){ event.stopPropagation(); }
        var res = this.props.resource;
        var allCount = game.workshop.getCraftAllCount(res.name),
            ratioCount = Math.floor(allCount * this.props.craftPercent);
        
        var num = this.props.craftFixed;
        if (num < ratioCount){
            num = ratioCount;
        }
        game.craft(res.name, num);
    },

    doCraftAll: function(event){
        if (event){ event.stopPropagation(); }
        var res = this.props.resource;
        game.craftAll(res.name);
    },

    componentWillUnmount: function(){
        var node = React.findDOMNode(this.refs.linkBlock);
        if (node && node.firstChild){
            dojo.destroy(node.firstChild);
        }
    }
});

/*=======================================================
                    CRAFT RESOURCE ROW
=======================================================*/

WCraftRow = React.createClass({

    getDefaultProperties: function(){
        return {resource: null, isEditMode: false, isRequired: false};
    },

    shouldComponentUpdate: function(nextProp){
        var newVisibility = this.getIsResInCraftTable(nextProp.resource, nextProp);
        if (this.oldVisibility !== newVisibility) {
            this.oldVisibility = newVisibility;
            return true;
        }
        return newVisibility;
    },

    render: function(){
        var res = this.props.resource;
        var recipe = game.workshop.getCraft(res.name);

        if (!this.getIsResInCraftTable()) {
            return null;
        }

        var resNameCss = {};
        if (res.color){
            resNameCss = { color: res.color };
        }
        if (res.style){
            for (var styleKey in res.style){
                resNameCss[styleKey] = res.style[styleKey];
            }
        }

        var resVal = game.getDisplayValueExt(res.value);
        var perTick = game.getResourcePerTick(res.name, true);
        if (game.opts.usePerSecondValues) {
            perTick *= game.getTicksPerSecondUI();
        }
        var perTickStr = perTick ? game.getDisplayValueExt(perTick, true, false) + (game.opts.usePerSecondValues ? "/" + $I("unit.s") : "") : "";

        var resIcoSvg = (typeof classes != "undefined" && classes.ui && classes.ui.XianxiaArt)
            ? classes.ui.XianxiaArt.resIcon(res.name) : "";

        var canCraftInWorkshop = game.bld.get("workshop").on > 0 && recipe && recipe.unlocked && !game.isReadOnly();

        return $r("div", {
            className: "res-row craft resource_" + res.name + (this.props.isRequired ? " highlited" : "") + (!this.getIsVisible(res) ? " hidden" : "")
        }, [
            this.props.isEditMode ? 
                $r("div", {className:"res-cell res-edit"},
                    $r("input", {
                        type:"checkbox", 
                        checked: this.getIsVisible(),
                        onClick: this.toggleView,
                        style:{display:"inline-block"},
                    })
                ) : null,
            $r("div", {className: "res-cell res-head"}, [
                resIcoSvg ? $r("span", {
                    className: "xx-res-ico",
                    "aria-hidden": "true",
                    dangerouslySetInnerHTML: {__html: resIcoSvg}
                }) : null,
                $r("span", {
                    className:"resource-name", 
                    style: resNameCss,
                    onClick: this.onClickName,
                    title: res.title || res.name
                }, res.title || res.name)
            ]),
            $r("div", {className:"res-cell resource-value", ref:"perTickNode", title: resVal}, [
                $r("span", {className: "res-val"}, resVal),
                perTickStr ? $r("span", {className: "xx-craft-rate" + (perTick < 0 ? " neg" : "")}, perTickStr) : null
            ]),
            canCraftInWorkshop ? $r("div", {className: "xx-craft-actions"}, [
                $r(WCraftShortcut, {resource: res, recipe: recipe, craftFixed:1, craftPercent: 0.01}),
                $r(WCraftShortcut, {resource: res, recipe: recipe, craftFixed:25, craftPercent: 0.05}),
                $r(WCraftShortcut, {resource: res, recipe: recipe, craftFixed:100, craftPercent: 0.1}),
                $r(WCraftShortcut, {resource: res, recipe: recipe, craftPercent: 1})
            ]) : null
        ]);
    },
    onClickName: function(e){
        if (this.props.isEditMode || e.ctrlKey){
            this.toggleView();
        } 
    },

    toggleView: function(){
        var res = this.props.resource;
        if (res.name == "wood") {
            res.isHiddenFromCrafting = !res.isHiddenFromCrafting;
        } else {
            res.isHidden = !res.isHidden;
        }
    },

    getIsVisible: function(res) {
        res = res || this.props.resource;
        if (res.name == "wood") {
            return !res.isHiddenFromCrafting;
        }
        return !res.isHidden;
    },

    getIsResInCraftTable: function(res, props) {
        res = res || this.props.resource;
        props = props || this.props;

        // Wood is refined inline in 【天地灵材】, never duplicated here
        if (res.name == "wood") {
            return false;
        }
        var recipe = game.workshop.getCraft(res.name);
        if (!recipe){
            return false;
        }
        var hasVisibility = (res.unlocked && recipe.unlocked) || (res.value > 0);
        if (!hasVisibility || (!this.getIsVisible(res) && !props.isEditMode)){
            return false;
        }
        return true;
    },

    componentDidMount: function(){
        var node = React.findDOMNode(this.refs.perTickNode);
        if (node){
            this.refs.isTooltipAttached = true;
            game.attachResourceTooltip(node, this.props.resource);
        }
    },

    componentDidUpdate: function(){
        var node = React.findDOMNode(this.refs.perTickNode);
        if (this.refs.isTooltipAttached && !node) {
            this.refs.isTooltipAttached = false;
        }
        if (node && !this.refs.isTooltipAttached) {
            this.refs.isTooltipAttached = true;
            game.attachResourceTooltip(node, this.props.resource);
        }
    }
});

/*=======================================================
                     RESOURCES
=======================================================*/

WResourceTable = React.createClass({
    getDefaultProperties: function(){
        return {resources: null};
    },
    getInitialState: function(){
        return {
            isEditMode: false,
            isCollapsed: false,
            collapsedCats: {}
        };
    },

    toggleCategory: function(catId){
        var next = dojo.clone(this.state.collapsedCats || {});
        next[catId] = !next[catId];
        this.setState({collapsedCats: next});
    },

    render: function(){
        var self = this;
        var categories = [
            { id: "dao", title: "大道修持", order: ["xiuwei", "science", "culture", "faith", "starchart"], rows: [] },
            { id: "material", title: "天地灵材", order: ["catnip", "wood", "minerals", "coal", "iron", "titanium", "gold", "oil", "uranium", "unobtainium"], rows: [] },
            { id: "treasure", title: "仙缘奇珍", order: ["karma", "paragon", "timeCrystal", "relic", "antimatter", "spice"], rows: [] }
        ];
        var catMap = { dao: categories[0], material: categories[1], treasure: categories[2] };

        var resList = (this.props.resources || []).slice();
        resList.sort(function(a, b){
            var catA = catMap[a.category] || catMap.treasure;
            var catB = catMap[b.category] || catMap.treasure;
            var idxA = catA.order.indexOf(a.name);
            var idxB = catB.order.indexOf(b.name);
            if (idxA === -1) { idxA = 99; }
            if (idxB === -1) { idxB = 99; }
            return idxA - idxB;
        });

        for (var i = 0; i < resList.length; i++){
            var res = resList[i];
            if (!res || res.category === "craft" || game.resPool.isNormalCraftableResource(res)) {
                continue;
            }
            if (!res.visible && !game.resPool.showHiddenResources) {
                continue;
            }
            if (!res.unlocked || (res.isHidden && !this.state.isEditMode)) {
                continue;
            }
            var targetCat = catMap[res.category] || catMap.treasure;
            var isRequired = (this.props.reqRes.indexOf(res.name) >= 0);
            targetCat.rows.push(
                $r(WResourceRow, {
                    key: res.name,
                    resource: res, 
                    isEditMode: this.state.isEditMode, 
                    isRequired: isRequired,
                    showHiddenResources: game.resPool.showHiddenResources,
                    isTemporalParadox: game.calendar.day < 0
                })
            );
        }

        var catSections = [];
        for (var c = 0; c < categories.length; c++){
            var cat = categories[c];
            if (cat.rows.length === 0) {
                continue;
            }
            var isCatCollapsed = Boolean(this.state.collapsedCats[cat.id]);
            catSections.push(
                $r("div", {key: cat.id, className: "xx-res-sec xx-res-sec-" + cat.id}, [
                    $r("div", {
                        className: "xx-res-sec-hd",
                        onClick: self.toggleCategory.bind(self, cat.id)
                    }, [
                        $r("span", {className: "xx-res-sec-dot"}),
                        $r("span", {className: "xx-res-sec-title"}, cat.title),
                        $r("span", {className: "xx-res-sec-count"}, cat.rows.length),
                        $r("span", {className: "xx-res-sec-caret"}, isCatCollapsed ? "▸" : "▾")
                    ]),
                    !isCatCollapsed ? $r("div", {className: "res-table", role: "grid"}, cat.rows) : null
                ])
            );
        }

        return $r("div", {className: "xx-treasury", ariaLabel:"Regular resources"}, [
            $r("div", {className: "xx-treasury-hd"}, [
                $r("div", {className: "xx-treasury-title", onClick: this.toggleCollapsed}, [
                    $r("span", {className: "xx-treasury-seal"}, "库"),
                    $r("span", null, "洞府灵库"),
                    $r("span", {className: "xx-res-sec-caret"}, this.state.isCollapsed ? "▸" : "▾")
                ]),
                $r("div", {className:"res-toolbar right"}, [
                    $r("a", {
                        className: "link" + (this.state.isEditMode ? " toggled" : ""), 
                        onClick: this.toggleEdit,
                        onKeyDown: this.onKeyDown,
                        title: "筛选显示灵材",
                        tabIndex: 1
                    }, "筛选")
                ])
            ]),
            (!this.state.isCollapsed) &&
                $r("div", {className: "xx-treasury-body"}, [
                    this.state.isEditMode && $r("div", {className: "xx-edit-bar"}, [
                        $r("a", {className:"link", onClick: game.ui.zoomUp.bind(game.ui)}, $I("left.font.inc")),
                        $r("a", {className:"link", onClick: game.ui.zoomDown.bind(game.ui)}, $I("left.font.dec")),
                        $r("label", {className:"res-toggle-hidden"}, [
                            $r("input", {
                                type:"checkbox", 
                                checked: game.resPool.showHiddenResources,
                                onClick: this.toggleHiddenResources,
                                style:{display:"inline-block"},
                            }),
                            $I("res.show.hidden")
                        ])
                    ]),
                    catSections
                ])
        ]);
    },

    onKeyDown: function(event){
        if (event.keyCode == 13){
            this.toggleEdit();
        }
    },

    toggleEdit: function(){
        this.setState({isEditMode: !this.state.isEditMode});
    },

    toggleCollapsed: function(){
        this.setState({isCollapsed: !this.state.isCollapsed});
    },

    toggleHiddenResources: function(e){
        game.resPool.showHiddenResources = e.target.checked;
        this.forceUpdate();
    }
});

/*=======================================================
                        CRAFT
=======================================================*/

WCraftTable = React.createClass({
    getDefaultProperties: function(){
        return {resources: null, game: null};
    },
    getInitialState: function(){
        return {
            isEditMode: false,
            isCollapsed: false
        };
    },
    craftAllBasics: function(e){
        if (e){ e.preventDefault(); e.stopPropagation(); }
        var basics = ["beam", "slab", "steel"];
        for (var i = 0; i < basics.length; i++){
            var rName = basics[i];
            var recipe = game.workshop.getCraft(rName);
            if (recipe && recipe.unlocked && game.workshop.getCraftAllCount(rName) > 0){
                game.craftAll(rName);
            }
        }
    },
    render: function(){
        var resRows = [];
        var hasAnyCraft = false;
        var canCraftBasic = false;

        for (var i in this.props.resources){
            var res = this.props.resources[i];
            if (!res.craftable || res.name === "wood"){
                continue;
            }
            var recipe = game.workshop.getCraft(res.name);
            if ((res.unlocked && recipe && recipe.unlocked) || res.value > 0){
                hasAnyCraft = true;
            }
            if ((res.name === "beam" || res.name === "slab" || res.name === "steel") &&
                recipe && recipe.unlocked && game.workshop.getCraftAllCount(res.name) > 0){
                canCraftBasic = true;
            }
            var isRequired = (this.props.reqRes.indexOf(res.name) >= 0);
            resRows.push(
                $r(WCraftRow, {key: res.name, resource: res, isEditMode: this.state.isEditMode, isRequired: isRequired})
            );
        }

        if (game.bld.get("workshop").on <= 0 && !hasAnyCraft){
            return null;
        }

        return $r("div", {className: "xx-res-sec xx-res-sec-craft sidebar-section", ariaLabel:"Craftable resources"}, [
            $r("div", {className: "xx-res-sec-hd", onClick: this.toggleCollapsed}, [
                $r("span", {className: "xx-res-sec-dot"}),
                $r("span", {className: "xx-res-sec-title"}, "百艺炼制"),
                (!game.isReadOnly() && game.bld.get("workshop").on > 0 && canCraftBasic) ?
                    $r("a", {
                        href: "#!",
                        className: "xx-craft-batch",
                        onClick: this.craftAllBasics,
                        title: "一键全炼基础阵材 (阵木 / 阵石 / 玄铁)"
                    }, "一键全炼") : null,
                $r("span", {className: "xx-res-sec-caret"}, this.state.isCollapsed ? "▸" : "▾")
            ]),
            this.state.isCollapsed ? null :
                $r("div", {className:"res-table craftTable"}, resRows)
        ]);
    },

    onKeyDown: function(event){
        if (event.keyCode == 13){
            this.toggleEdit();
        }
    },

    toggleEdit: function(){
        this.setState({isEditMode: !this.state.isEditMode});
    },

    toggleCollapsed: function(){
        this.setState({isCollapsed: !this.state.isCollapsed});
    }
});

WPins = React.createClass({
    getPins: function(){
        var pins = [];
        for (var i in this.props.game.diplomacy.races){
            var race = this.props.game.diplomacy.races[i];

            if (race.pinned){
                pins.push({
                    race: race,
                    buy: race.buys[0].name,
                    sell: race.sells[0].name,
                    handler: function(race){
                        this.props.game.diplomacy.tradeAll(race);
                    }.bind(this, race)
                });
            }
        }

        return pins;
    },
    tradeIcons: {minerals: "minerals", iron: "iron", wood: "wood", catnip: "catnip",
                 titanium: "titanium", coal: "coal", uranium: "uranium",
                 slab: "minerals"},

    renderResource: function(name){
        var icon = this.tradeIcons[name];
        if (!icon){ return null; }
        return $r("div", {
            className: "svg-icon res-icon",
            style: {WebkitMask: "url('res/img/resources/" + icon + ".svg') no-repeat center / contain",
                    mask: "url('res/img/resources/" + icon + ".svg') no-repeat center / contain"}
        });
    },

    render: function(){
        var pins = this.getPins();
        if (!pins.length) {
            return null;
        }
        var pinLinks = [];
        for (var i in pins){
            var pin = pins[i];
            var content;
            if (pin.race){
                var buy = this.renderResource(pin.buy);
                var sell = this.renderResource(pin.sell);
                var arrow = buy && sell ? $r("span", {className: "trade-arrow"}, "··") : null;
                content = [
                    $r("span", {className: "trade-icons"}, [buy, arrow, sell]),
                    $r("span", null, $I("left.trade") + " " + pin.race.title)
                ];
            } else {
                content = pin.title;
            }
            pinLinks.push(
                $r("div", {key: i, className:"pin-link"},
                    $r("a", {href:"#", onClick: pin.handler}, content)
                )
            );
        }
        return (
            $r(WCollapsiblePanel, {title: $I("left.trade")}, pinLinks)
        );
    }
});

WLeftPanel = React.createClass({
    getDefaultProperties: function(){
        return {game: null};
    },
    getInitialState: function(){
        return {game: this.props.game};
    },

    getResources: function(){
        var game = this.state.game;
        return game.resPool.resources;
    },

    render: function(){
        var game = this.state.game,
            reqRes = game.getRequiredResources(game.selectedBuilding);

        var canSacrifice = game.religion.getHasUnlockedUnicornSacrifice() && !game.isReadOnly();
        var maxAvailableSacrifices = game.religion.getAvailableUnicornSacrifices();

        var showAdvisor = false;
        if (game.bld.get("field").on > 0){
            var calendar = game.calendar,
                winterDays = calendar.daysPerSeason -
                (calendar.getCurSeason().name === "winter" ? calendar.day : 0);

            var catnipPerTick = game.winterCatnipPerTick;
            showAdvisor = (game.resPool.get("catnip").value + winterDays * catnipPerTick * calendar.ticksPerDay) <= 0;
        }

        return $r("div", {className: "xx-left-wrap"}, [
            $r(WResourceTable, {resources: this.getResources(), reqRes: reqRes}),
            $r(WCraftTable, {resources: game.resPool.resources, reqRes: reqRes}),
            !game.isReadOnly() && $r(WPins, {game: game}),

            $r("div", {id:"advisorsContainer", className: "xx-advisor-warn", style:{
                display: (showAdvisor ? "block" : "none")}
            }, 
                $I("general.food.advisor.text")
            ), 
            $r("div", {id:"fastSacrificeContainer", className:"pin-link sidebar-section", style: {
                display: (canSacrifice && maxAvailableSacrifices >= 1 ? "block" : "none")
            }},
                $r("a", {href:"#", onClick: this.sacrificeAllUnicorns},
                    $I("left.sacrifice") + " (",
                    $r("span", {id:"fastSacrificeContainerCount", className: "pin-link-quantity"},
                        game.getDisplayValueExt(maxAvailableSacrifices, false, false, 0) +
                            " " + (maxAvailableSacrifices === 1 ? $I("left.hunt.time") : $I("left.hunt.times"))
                    ),
                    ")"
                )
            ),
            // Retained for legacy ui.js#updateFastPraise compatibility; inline [礼敬] is on the faith row
            $r("div", {id:"fastPraiseContainer", style:{display:"none"}},
                $r("a", {href:"#", onClick: this.praiseAll}, $I("left.praise"))
            )
        ]);
    },

    praiseAll: function(event){
        this.state.game.praise(event);
    },

    sacrificeAllUnicorns: function(event){
        this.state.game.sacrificeAllUnicorns(event);
    },

    componentDidMount: function(){
        var self = this;
        dojo.subscribe("ui/update", function(game){
            self.setState({game: game});
        });
    }
});

WTooltip = React.createClass({
    getInitialState: function() {
        return {
            showTooltip: false
        };
    },

    getDefaultProps: function(){
        return {
            body: null
        };
    },

    render: function(){
        return $r("div", {
            tabIndex: this.props.tabindex || 0,
            className: "tooltip-block", 
            onMouseOver: this.onMouseOver, 
            onMouseOut: this.onMouseOut,
            onKeyDown: this.onKeyDown
        }, [
            this.props.body || $r("div", {className: "tooltip-icon"}, "[?]"),
            this.state.showTooltip ? $r("div", {className: "tooltip-content"}, 
                this.props.children
            ) : null
        ]);
    },

    onMouseOver: function(){
        this.setState({showTooltip: true});
    },

    onKeyDown: function(e){
        if (e.keyCode == 13){
            this.setState({showTooltip: !this.state.showTooltip});
        }
    },

    onMouseOut: function(){
        this.setState({showTooltip: false});
    }
});
