/* global
    WLeftPanel
    WMidPanel
    WToolbar,
    WQueue
*/


/**
 * dojo bridge for react components, use this sparringly
 * (TODO: consider using HOC for boilerplate like)
 * 
 *  getInitialState: function(){
        return {game: this.props.game};
    },
    
    componentDidMount: function(){
        var self = this;
        this.onUpdateHandler = dojo.subscribe("ui/update", function(game){
            self.setState({game: game});
        });
    },

    componentWillUnmount(){
        dojo.unsubscribe(this.onUpdateHandler);
    },
 */

var $r = React.createElement;
dojo.declare("mixin.IReactAware", null, {
    component: null,
    container: null,

    constructor: function(component, game){
        this.component = component;
        this.game = game;
    },

    render: function(container){
        this.game.ui.dirtyComponents.push(this);

        React.render($r(this.component, {
            game: this.game
        }), container);

        this.container = container;
        return container;
    },

    update: function(){

    },

    //does not seem to be called automatically
    destroy: function(){
        if (!this.container){
            throw "Integrity failure, trying to unmount component on an empty container";
        }
        React.unmountComponentAtNode(this.container);
    }
});

/**
 * Class that provides an abstraction layer for UI/model communication
 * Extended in web version and in mobile version, so change signatures below only if you can change them in mobile too!
 */
dojo.declare("classes.ui.UISystem", null, {
    game: null,

    setGame: function(game){
        this.game = game;
    },

    render: function(){
    },

    update: function(){
    },

    updateOptions: function(){
    },

	unlockScheme: function(name) {
	},

	relockSchemes: function() {
	},

    notifyLogEvent: function(logmsg) {
    },

    confirm: function(title, msg, callbackOk, callbackCancel) {
    },

    pulse: function(node){
    },

    displayAutosave: function(){
    },

    resetConsole: function(){
    },

    renderFilters: function(){
    },

    renderConsoleLog: function() {
    },

    saveExport: function(encodedData) {
    },

    observeCallback: function(){
    },

    observeClear: function(){
    },

    updateCalendar: function(){
    },

    updateLanguage: function() {
    },

    updateNotation: function() {
    },

    load: function(){

    },

    save: function(){

    },

    isEffectMultiplierEnabled: function(){
        return false;
    },

    /**
     * Lays out one resource breakdown row (see GamePage.getStackElemString).
     * The legacy tooltip is a flat text blob, so the value is floated to the right
     * and rows are separated by line breaks.
     */
    formatStackRow: function(label, value){
        return label + "&nbsp;<div style=\"float: right;\">" + value + "</div><br>";
    },

    checkForUpdates: function(){
        //nothing
    }
});

/**
 * Legacy UI renderer
 */
dojo.declare("classes.ui.DesktopUI", classes.ui.UISystem, {
    containerId: null,
    toolbar: null,
    calenderDivTooltip: null,
    calendarSignSpanTooltip: null,

    fontSize: null,

    //current selected game tab
    activeTabId: "Bonfire",

    keyStates: {
        shiftKey: false,
        ctrlKey: false,
        altKey: false
    },

    isDisplayOver: false,
    isCenter: false,

    defaultSchemes: ["default"].concat(new classes.KGConfig().statics.defaultSchemes),
    allSchemes: ["default"].concat(new classes.KGConfig().statics.schemes),

    dirtyComponents: [],

    constructor: function(containerId){
        this.containerId = containerId;

        dojo.connect($("html")[0],"onclick", this, function() {
            this.game.stats.getStat("totalClicks").val += 1;
        });

        dojo.connect($("html")[0], "onkeyup", this, function (event) {

            // Allow user extensibility to keybindings in core events
            var keybinds = [
                {
                    name: "Bonfire",
                    key: "B",
                    shift: true,
                    alt: false,
                    control: false
                },
                {
                    name: "Village",
                    key: "V",
                    shift: true,
                    alt: false,
                    control: false
                },
                {
                    name: "Science",
                    key: "S",
                    shift: true,
                    alt: false,
                    control: false
                },
                {
                    name: "Workshop",
                    key: "W",
                    shift: true,
                    alt: false,
                    control: false
                },
                {
                    name: "Trade",
                    key: "T",
                    shift: true,
                    alt: false,
                    control: false
                },
                {
                    name: "Religion",
                    key: "R",
                    shift: true,
                    alt: false,
                    control: false
                },
                {
                    name: "Space",
                    key: "P",
                    shift: true,
                    alt: false,
                    control: false
                },
                {
                    name: "Time",
                    key: "I",
                    shift: true,
                    alt: false,
                    control: false
                },
                {
                    name: "Achievements",
                    key: "M",
                    shift: true,
                    alt: false,
                    control: false
                },
                {
                    name: "Stats",
                    key: "A",
                    shift: true,
                    alt: false,
                    control: false
                },
                {
                    name: "Challenges",
                    key: "C",
                    shift: true,
                    alt: false,
                    control: false
                },
                {
                    name: "Close Options",
                    key: "Escape",
                    shift: false,
                    alt: false,
                    control: false,
					action: function(){ $("div.dialog:visible").last().hide(); }
                }
            ];

            //babel someday

            /*var allKeybinds = typeof userKeybinds != 'undefined' ? userKeybinds.concat(keybinds) : keybinds;
            var keybind = allKeybinds.find(function(x){
                return x.key === event.key &&
                x.shift == event.shiftKey &&
                x.alt == event.altKey &&
                x.control == event.ctrlKey; });*/

            var keybind = null;
            for (var i in keybinds){
                var k = keybinds[i];
                if (k.key === event.key &&
                    k.shift == event.shiftKey &&
                    k.alt == event.altKey &&
                    k.control == event.ctrlKey
                ){
                    keybind = k;
                    break;
                }
            }

            var targetType = event.target.type;
			var isInputElement = event.target.tagName === "TEXTAREA" ||
				(event.target.tagName === "INPUT" && (
                    targetType === "text" || targetType === "number" || targetType === "password" || targetType === "email"
                ));
            var isTabNumber = ((event.keyCode >= 48 && event.keyCode <= 57) || (event.keyCode >= 96 && event.keyCode <= 105));
            //console.log(isTabNumber, event.keyCode);

            if (keybind && keybind.action) {
                // If a keybind is found and has a specific action
                keybind.action();
            } else if (!isInputElement && isTabNumber){
                var tabIndex = 9;
                if (event.keyCode >= 97) { //numpad
                    tabIndex = event.keyCode - 97;
                } else if (event.keyCode >= 49 && event.keyCode <= 57) { //number row
                    tabIndex = event.keyCode - 49;
                }
                if (this.game.tabs[tabIndex].visible){
                    this.game.ui.activeTabId = this.game.tabs[tabIndex].tabId;
                    this.game.ui.render();
                }
            } else if (!isInputElement && (event.keyCode == 37 || event.keyCode == 39)){ //left arrow, right arrow
                var visibleTabs = [];
                var activeTabIndex = 0;
                for (var i = 0; i < this.game.tabs.length; i++){
                    var tab = this.game.tabs[i];
                    if (tab.visible){
                        if (tab.tabId == this.game.ui.activeTabId){
                            activeTabIndex = visibleTabs.length;
                        }
                        visibleTabs.push(tab);
                    }
                }
                var jump = event.keyCode == 37 ? -1 : 1;
                var switchTab = visibleTabs[activeTabIndex + jump];
                if (switchTab){
                    this.game.ui.activeTabId = switchTab.tabId;
                    this.game.ui.render();
                }
            } else if (!isInputElement && keybind && keybind.name != this.game.ui.activeTabId ) {
                // If a keybound is found and the tab isn't current
                for (var i = 0; i < this.game.tabs.length; i++){
                    if (this.game.tabs[i].tabId === keybind.name && this.game.tabs[i].visible){
                        this.game.ui.activeTabId = keybind.name;
                        this.game.ui.render();
                        break;
                    }
                }
            }
        });
    },

    setGame: function(game){
        this.game = game;

        //This tooltip needs to be created EXACTLY ONCE.
        //(Calling it more than once would create performance issues because (in the current implementation) old event
        // listeners don't ever get un-attached, which can cause noticeable lag when thousands of event listeners fire
        // simultaneously.  Un-attaching event listeners is hard because we're implementing them using anonymous functions.)
        //It needs to be created AFTER the game is created, so it can't happen in the DesktopUI#constructor.
        UIUtils.attachTooltip(game, $("#undoBtn")[0], -30, -30, function() {
            var undoState = game.undoChange;
            if (undoState) {
                return undoState.getEventDescription(undoState.events[0]);
            }
            //Else, undoState doesn't exist currently:
            return "";
        });

        UIUtils.attachTooltip(game, $("#schemeTip")[0], 0, 20, function() {
            return "<div class='option-tooltip'>" + $I("ui.option.scheme.tip") + "</div>";
        });
    },

    render: function(){
        var game = this.game;

        var midColumn = dojo.byId("midColumn");
        var scrollPosition = midColumn.scrollTop;

        var container = dojo.byId(this.containerId);

        //unmount everything that relies on the container
        for (var i in this.dirtyComponents){
            this.dirtyComponents[i].destroy();
        }
        this.dirtyComponents = [];
        dojo.empty(container);

        var tabNavigationDiv = dojo.create("div", { className: "tabsContainer"}, container);

        //TODO: remove hardcoded id?
        //this.toolbar.render(dojo.byId("headerToolbar"));

        game.calendar.render();

        var visibleTabs = [];

        for (var i = 0; i < game.tabs.length; i++){
            var tab = game.tabs[i];
            tab.domNode = null;
            if (tab.visible){
                visibleTabs.push(tab);
            }
        }

        for (var i = 0; i < visibleTabs.length; i++){
            var tab = visibleTabs[i];

            tab.updateTab();
            var tabLink = dojo.create("a", {
                href:"#",
                innerHTML: tab.tabName,
                className: "tab " + tab.tabId,
                style : {
                    whiteSpace: "nowrap"
                }
            }, tabNavigationDiv);
            tab.domNode = tabLink;

            if (this.activeTabId == tab.tabId){
                dojo.addClass(tabLink, "activeTab");
            }


            dojo.connect(tabLink, "onclick", this,
                dojo.partial(
                    function(tab){
                        this.activeTabId = tab.tabId;
                        this.render();

                        this.game.telemetry.logRouteChange(tab.tabId);
                    }, tab)
            );

            if (i < visibleTabs.length - 1){
                dojo.create("span", {innerHTML:" | "}, tabNavigationDiv);
            }
        }

        for (var i = 0; i < game.tabs.length; i++){
            var tab = game.tabs[i];

            if (this.activeTabId == tab.tabId){

                var divContainer = dojo.create("div", {
                    className: "tabInner " + tab.tabId
                }, container);

                if (tab.tabId != "Cultivation" && typeof classes != "undefined" && classes.ui && classes.ui.XianxiaArt){
                    var bannerHtml = classes.ui.XianxiaArt.tabBannerHTML(tab.tabId, game);
                    if (bannerHtml){
                        dojo.place(bannerHtml, divContainer, "first");
                    }
                }

                tab.render(divContainer);

                break;
            }
        }

        //道途指引——独立常驻槽位(grid-area: guide),钉在主区下沿;
        //不再嵌进页签内容里挤占模块,全部完成后自隐
        var cult = game.cultivation;
        this.guideBox = (cult && cult.renderGuideBox) ? cult.renderGuideBox(container) : null;
        if (this.guideBox){ cult.updateGuideBox(this.guideBox); }



		if (!this.calenderDivTooltip){
            var calendarDiv = dojo.byId("calendarDiv");
            this.calenderDivTooltip = UIUtils.attachTooltip(game, calendarDiv, 0, 200, dojo.hitch(game.calendar, function() {
                var tooltip = "";
                var displayThreshold = 100000;
                if (this.year > displayThreshold) {
                    tooltip = $I("calendar.year.tooltip") + " " + this.year.toLocaleString();
                }

                if (game.science.get("paradoxalKnowledge").researched) {
                    if (this.year > displayThreshold) {
                        tooltip += "<br>";
                    }

                    var trueYear = Math.trunc(this.trueYear());
                    if (trueYear > displayThreshold) {
                        trueYear = trueYear.toLocaleString();
                    }
                    tooltip += $I("calendar.trueYear") + " " + trueYear;
                }
                return tooltip;
            }));
        }


		if (!this.calendarSignSpanTooltip){
            var calendarSignSpan = dojo.byId("calendarSign");
			this.calendarSignSpanTooltip = UIUtils.attachTooltip(game, calendarSignSpan, 0, 60, dojo.hitch(game.calendar, function() {
                var cycle = this.cycles[this.cycle];
                if (!cycle) {
                    return "";
                }

				var tooltip = dojo.create("div", { className: "button_tooltip" }, null);

				var cycleSpan = dojo.create("div", {
					innerHTML: cycle.title + " (" + $I("calendar.year") + " " + this.cycleYear + ")",
					style: { textAlign: "center", clear: "both"}
				}, tooltip );

				// Cycle Effects
				if (game.prestige.getPerk("numerology").researched) {
					dojo.style(cycleSpan, "borderBottom", "1px solid gray");
					dojo.style(cycleSpan, "paddingBottom", "4px");

					dojo.create("div", {
						innerHTML: $I("cycle.effects.title") + ":",
						style: { textAlign: "center", paddingTop: "4px"}
					}, tooltip );

					var effects = cycle.effects;

					for (var effect in effects){
						var effectItemNode = dojo.create("div", null, tooltip);

						var effectMeta = game.getEffectMeta(effect);
						var effectTitle = effectMeta.title + ":";

						dojo.create("span", {
							innerHTML: effectTitle,
							style: {
								float: "left",
								fontSize: "16px"
							}
						}, effectItemNode );

						var effectMod = effects[effect] > 1 ? "+" : "";
						effectMod += ((effects[effect] - 1) * 100).toFixed(0) + "%";

						dojo.create("span", {
							innerHTML: effectMod,
							style: {
								float: "right",
								fontSize: "16px",
								paddingLeft: "6px"
							}
						}, effectItemNode );

						dojo.create("span", {
							innerHTML: "&nbsp;",
							style: {clear: "both" }
						}, effectItemNode );
					}
				}

				if (game.prestige.getPerk("numeromancy").researched) {
					// Cycle Festival Effects
					dojo.create("div", {
						innerHTML: $I("cycle.effects.festival.title"),
						style: { textAlign: "center"}
					}, tooltip );

					var effects = cycle.festivalEffects;

					for (var effect in effects){
						var effectItemNode = dojo.create("div", null, tooltip);

						var effectMeta = game.getEffectMeta(effect);
						var effectTitle = effectMeta.title + ":";

						dojo.create("span", {
							innerHTML: effectTitle,
							style: {
								float: "left",
								fontSize: "16px"
							}
						}, effectItemNode );

						var effectMod = effects[effect] > 1 ? "+" : "";
						effectMod += ((effects[effect] - 1) * 100).toFixed(0) + "%";

						dojo.create("span", {
							innerHTML: effectMod,
							style: {
								float: "right",
								fontSize: "16px",
								paddingLeft: "6px"
							}
						}, effectItemNode );

						dojo.create("span", {
							innerHTML: "&nbsp;",
							style: {clear: "both" }
						}, effectItemNode );
					}
				}
				return tooltip.outerHTML;

			}));
		}

        midColumn.scrollTop = scrollPosition;
        this.update();

        //-------------------------
        var now = new Date();
        if (now.getDate() == 1 && now.getMonth() == 3) {
            $(".console-intro").css("font-size", "300%").addClass("blaze").text($I("console.intro.zebra"));
        } else {
            $(".console-intro").css("font-size", "100%").removeClass("blaze").text($I("console.intro"));
        }

        React.render($r(WLeftPanel, {
            game: this.game
        }), document.getElementById("leftColumnViewport"));

        React.render($r(WMidPanel, {
            game: this.game
        }), document.getElementById("midColumnViewport"));

        if (this.game.getFeatureFlag("QUEUE")){
            React.render($r(WQueue, {
                game: this.game
            }), document.getElementById("queueViewport"));
        }

        React.render($r(WToolbar, {
            game: this.game
        }), document.getElementById("headerToolbar"));
    },

    //---------------------------------------------------------------
    update: function(){
        //TODO: use ui managers?
        //入世留名 / 转世择身 — 首个 tick 查一次:无名先报号,转世另择出身
        if (!this._identityChecked){
            this._identityChecked = true;
            var cult = this.game.cultivation;
            if (cult && cult.showIdentityPrompt && !this.game.isReadOnly()){
                if (!(cult.identity && cult.identity.name)){
                    cult.showIdentityPrompt();
                } else if (cult.pendingOrigin){
                    cult.showIdentityPrompt(true);
                }
            }
        }
		this.updateTabs();
        if (this.guideBox && this.game.cultivation){
            this.game.cultivation.updateGuideBox(this.guideBox);
        }
        this.updateFastPraise();
        this.updateCalendar();
        this.updateUndoButton();
        this.updateAdvisors();

        //this.toolbar.update();

        if (this.game.ticks % 5 == 0 && this.game.tooltipUpdateFunc) {
            this.game.tooltipUpdateFunc();
        }

		// clear tooltips/highlights if their owning element doesn't exist
		// anymore. if an element disappears (i.e. is removed from the DOM),
		// its onmouseout handler does not fire, so the highlights/tooltips
		// would get stuck.
		if (this.game.tooltipOwnerDomNode) {
			if (!document.contains(this.game.tooltipOwnerDomNode)) {
				UIUtils.hideTooltip(this.game);
			}
		}
		if (this.game.selectedBuildingDomNode) {
			if (!document.contains(this.game.selectedBuildingDomNode)) {
				this.game.clearSelectedObject();
			}
		}

        //wat
        /*React.render($r(WLeftPanel, {
            game: this.game
        }), document.getElementById("leftColumnViewport")); */
        this.game._publish("ui/update", this.game);
    },

	updateTabs: function() {
		var tabs = this.game.tabs;
		for (var i = 0; i < tabs.length; i++){
			var tab = tabs[i];

			if (tab.tabId == this.activeTabId){
				tab.update();
			}
        }
	},

    updateFastPraise: function(){
        if (!this.fastPraiseContainer){
            this.fastPraiseContainer = dojo.byId("fastPraiseContainer");
        }

        if (!this.fastPraiseContainer){
            return;
        }

        if (this.game.religion.faith > 0){
            if (this.fastPraiseContainer.style.visibility == "hidden"){
                this.fastPraiseContainer.style.visibility = "visible";
            }
        } else {
            if (this.fastPraiseContainer.style.visibility == "visible"){
                this.fastPraiseContainer.style.visibility = "hidden";
            }
        }
    },

    updateCalendar: function(){
        var calendar = this.game.calendar;
        var seasonTitle = calendar.getCurSeasonTitle();
        var hasCalendarTech = this.game.science.get("calendar").researched;

        var calendarDiv = dojo.byId("calendarDiv");
        if (hasCalendarTech){

            var mod = "";
            if (calendar.weather){
                mod = " (" + $I("calendar.weather." + calendar.weather) + ")";
            }

            var year = calendar.year;
            if (year > 100000){
                year = this.game.getDisplayValueExt(year, false, false, 0);
            }

            calendarDiv.innerHTML = $I("calendar.year.full", [year.toLocaleString(), seasonTitle + mod, Math.floor(calendar.day)]);
            document.title = $I("navbar.title") + " - " + $I("calendar.year.full", [this.game.getDisplayValueExt(calendar.year), seasonTitle, Math.floor(calendar.day)]);

            if (this.game.ironWill && calendar.observeBtn) {
                document.title = "[EVENT!]" + document.title;
            }

            var calendarSignSpan = dojo.byId("calendarSign");
            var cycle = calendar.cycles[calendar.cycle];
            if (cycle && this.game.science.get("astronomy").researched) {
                calendarSignSpan.style.color = calendar.cycleYearColor();
                calendarSignSpan.innerHTML = cycle.glyph + " ";
            }
        } else {
            calendarDiv.textContent = seasonTitle;
        }
    },
    //--------------------------------------------

    updateUndoButton: function(){
        var undoState = this.game.undoChange;
        var isVisible = (undoState !== null);
        $("#undoBtn").toggle(isVisible);

        if (isVisible) {
            $("#undoBtn").text($I("ui.undo", [Math.floor(undoState.ttl / this.game.ticksPerSecond)]));
        }
    },

    updateAdvisors: function(){
    },

    updateLanguage: function(){
        var languageSelector = $("#languageSelector");
        $("#languageApplyLink").toggle(languageSelector.val() != i18nLang.getLanguage());
    },

    applyLanguage: function() {
        var languageSelector = $("#languageSelector");
        i18nLang.updateLanguage(languageSelector.val());
        this.game.updateOptionsUI();
        window.location.reload();
    },

    updateNotation: function() {
        var notationSelector = $("#notationSelector");
        this.game.opts.notation = notationSelector.val();
    },


    updateOptions: function() {
        var game = this.game;

        if (game.unlockedSchemes.indexOf(game.colorScheme) < 0) {
            game.colorScheme = "default";
        }
        $("body").removeClass();
        $("body").addClass("scheme_" + game.colorScheme);
        if (!game.opts.hideBGImage) {
            $("body").addClass("with_background_image");
        }

        if (game.opts.tooltipsInRightColumn) {
            $("#tooltip").detach().appendTo("#rightColumn").addClass("tooltip-in-right-column");
        } else {
            $("#tooltip").detach().appendTo("#game").removeClass("tooltip-in-right-column");
        }

        game.settingsTab.render($("#optionsDiv")[0]);

        //The settingsTab above only handles boolean options; we must still handle non-booleans ourselves.
        $("#batchSize")[0].value = game.opts.batchSize;

        var selectedLang = i18nLang.getLanguage();
        var locales = i18nLang.getAvailableLocales();
        var labels = i18nLang.getAvailableLocaleLabels();
        var langSelector = $("#languageSelector");
        langSelector.empty();
        for (var i = 0; i < locales.length; i++) {
            $("<option />").attr("value", locales[i]).text(labels[locales[i]]).appendTo(langSelector);
        }
        langSelector.val(selectedLang);

        var selectedNotation = game.opts.notation;
        var notationSelect = $("#notationSelector");
        notationSelect.empty();
        var notations = new classes.KGConfig().statics.notations;
        for (var i in notations) {
            $("<option />").attr("value", notations[i]).text($I("opts.notation." + notations[i])).appendTo(notationSelect);
        }
        notationSelect.val(selectedNotation);


    },

	unlockScheme: function(name) {
	},

    displayAutosave: function(){
        dojo.style(dojo.byId("autosaveTooltip"), "opacity", "1");
        dojo.animateProperty({
            node:"autosaveTooltip",
            properties: {
                opacity: 0
            },
            duration: 1200,
        }).play();
    },

    getFontSize: function(){
        //account for themes like sleek that set the default font size to something other than 16
        if (this.fontSize == null){
            var computedStyle = getComputedStyle(dojo.byId("leftColumn")).fontSize;
            this.fontSize = parseInt(computedStyle, 10) || 16;
        }
        return this.fontSize;
    },

    updateFontSize: function(){
        $("#leftColumn").css("font-size", this.fontSize + "px");
    },

    loadLog: function(){ //actually loads log!
        $("#rightTabLog").show();
        $("#logLink").toggleClass("active", true);
        $("#queueLink").toggleClass("active", false);
        $("#rightTabQueue").hide();
    },
    loadQueue: function(){
        $("#rightTabLog").hide();
        $("#rightTabQueue").show();
        $("#logLink").toggleClass("active", false);
        $("#queueLink").toggleClass("active", true);
    },
    resetConsole: function(){
        this.game.console.resetState();
    },

    renderFilters: function(){
        var console = this.game.console,
            filtersDiv = dojo.byId("logFilters");

        dojo.empty(filtersDiv);
        var show = false;

        var filtersSorted = Object.keys(console.filters).sort();
        for (var filterIndex in filtersSorted) {
            var fId = filtersSorted[filterIndex];
            if (console.filters[fId].unlocked) {
                this._createFilter(console.filters[fId], fId, filtersDiv);
                show = true;
            }
        }
        $("#logFiltersBlock").toggle(show);
    },

    onLoad: function(){
        var self = this;
        $(document).on("keyup keydown keypress", function(e){

            /*if (e.altKey){    //firefox shenenigans
                e.preventDefault();
                e.stopPropagation();
            }*/

            self.keyStates = {
                shiftKey: e.shiftKey,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey
            };
        });

        this.updateIndexHTMLLanguage();
        this._toastReadyAt = Date.now() + 4000;	//boot / offline catch-up messages stay in the log only
        this.initMobileShell();
    },

    initMobileShell: function(){
        if (typeof document == "undefined"){
            return;
        }
        var leftCol = document.getElementById("leftColumn");
        if (leftCol && !document.getElementById("xxResToggle")){
            var resBtn = document.createElement("a");
            resBtn.id = "xxResToggle";
            resBtn.className = "xx-res-toggle";
            resBtn.href = "#";
            resBtn.textContent = $I("ui.mobile.res.expand");
            resBtn.onclick = function(ev){
                if (ev){ ev.preventDefault(); ev.stopPropagation(); }
                var open = !dojo.hasClass(leftCol, "xx-res-open");
                dojo.toggleClass(leftCol, "xx-res-open", open);
                resBtn.textContent = $I(open ? "ui.mobile.res.collapse" : "ui.mobile.res.expand");
            };
            leftCol.appendChild(resBtn);
        }

        var rightCol = document.getElementById("rightColumn");
        var calRow = rightCol && rightCol.firstElementChild;
        if (calRow && !document.getElementById("xxLogToggle")){
            calRow.className = "xx-cal-bar";
            var ticker = document.createElement("span");
            ticker.id = "xxLogTicker";
            ticker.className = "xx-log-ticker";
            var firstMsg = document.querySelector("#gameLog .msg:not(.type_date)") || document.querySelector(".console-intro");
            if (firstMsg && firstMsg.textContent){
                ticker.textContent = firstMsg.textContent.replace(/\s+/g, " ").trim();
            }
            calRow.appendChild(ticker);

            var logBtn = document.createElement("a");
            logBtn.id = "xxLogToggle";
            logBtn.className = "xx-log-toggle";
            logBtn.href = "#";
            logBtn.textContent = $I("ui.mobile.log.expand");
            var toggleLog = function(ev){
                if (ev && ev.target && ev.target.id == "dev_boostCalendar"){ return; }
                if (typeof window != "undefined" && window.innerWidth > 640){ return; }
                if (ev){ ev.preventDefault(); ev.stopPropagation(); }
                var open = !dojo.hasClass(rightCol, "xx-log-open");
                dojo.toggleClass(rightCol, "xx-log-open", open);
                logBtn.textContent = $I(open ? "ui.mobile.log.collapse" : "ui.mobile.log.expand");
            };
            calRow.onclick = toggleLog;
            calRow.appendChild(logBtn);
        }

        var tip = document.getElementById("tooltip");
        if (tip && !tip._xxTouchBound){
            tip._xxTouchBound = true;
            tip.onclick = function(){
                dojo.style(tip, "display", "none");
            };
            document.addEventListener("click", function(ev){
                if (typeof window != "undefined" && window.innerWidth <= 860 && tip.style.display != "none"){
                    var t = ev && ev.target;
                    if (t && (t.className == "xx-info-btn" || (t.closest && t.closest(".btn.disabled")))){
                        return;
                    }
                    dojo.style(tip, "display", "none");
                }
            });
        }
    },

    updateIndexHTMLLanguage: function() {
        $("#save-link").text($I("menu.save"));
        $("#options-link").text($I("menu.options"));
        $("#reset-link").text($I("menu.reset"));
        $("#help-link").text($I("menu.help"));
        $("#consoleIntroSub").text($I("console.intro.sub"));
        $("#wipe-link").text($I("menu.wipe"));
        $("#getTheApp-link").text($I("menu.getTheApp"));

        $("#autosaveTooltip").text($I("ui.autosave.tooltip"));
        $("#saveTooltip").text($I("ui.save.tooltip"));
        $("#logLink").text($I("ui.log.link"));
        if (this.game.getFeatureFlag("QUEUE")){
            $("#queueLink").text($I("ui.queue.link"));
        }
        $("#clearLogHref").text($I("ui.clear.log"));
        $("#logFiltersBlockText").html("[<span id=\"filterIcon\">+</span>] " + $I("ui.log.filters.block")); //We don't want to have <span> tags inside the i18n text, so we'll move it here instead.
        $("#pauseBtn").text($I("ui.pause"));
        $("#pauseBtn").attr("title", $I("ui.pause.title"));
        $("#undoBtn").attr("title", $I("ui.undo.title"));
        $(".close").text($I("ui.close"));
        $("#optionLanguage").text($I("ui.option.language"));
        $("#addTranslationLink").text($I("ui.option.language.add"));
        $("#languageApplyLink").text($I("ui.option.language.apply"));
        $("#optionNotation").text($I("ui.option.notation"));
        $("#optionScheme").text($I("ui.option.scheme"));
        $("#schemeRelock").text($I("ui.option.scheme.relock"));
        $("#optionMore").text($I("ui.option.more"));
        $("#optionBatchSize").text($I("ui.option.batch.size"));
        $("#exportButton").attr("value", $I("ui.option.export.button"));
        $("#importButton").attr("value", $I("ui.option.import.button"));
        $("#exportTo").text($I("ui.option.export"));
        $("#exportToSimpleFile").attr("value", $I("ui.option.export.simple.file"));
        $("#exportToFullFile").attr("value", $I("ui.option.export.full.file"));
        $("#exportToText").text($I("ui.option.export.text"));
        $("#debugExportButton").attr("value", $I("ui.option.export.debug"));
        $("#closeButton").attr("value", $I("ui.option.close.button"));
        $("#importWarning").text($I("ui.option.import.warning"));
        $("#importFromText").text($I("ui.option.import.from.text"));
        $("#doImportButton").attr("value",$I("ui.option.do.import.button"));
        $("#cancelButton").attr("value",$I("ui.option.cancel.button"));
        $("#appText").text($I("ui.option.app.text"));
        $("#appAndroid").text($I("ui.option.app.android"));
        $("#appIOS").text($I("ui.option.app.ios"));
        this.renderHelp();
    },

    //《修行指南》 — fills #helpDiv from the section manifest on the cultivation
    //manager; runs at boot and again on language switch via the caller above
    renderHelp: function(){
        var helpContent = dojo.byId("helpContent");
        var cult = this.game && this.game.cultivation;
        if (!helpContent || !cult || !cult.getHelpSections){ return; }

        var html = "<div class=\"xx-help-title\">" + $I("help.title") + "</div>" +
            "<div class=\"xx-help-intro\">" + $I("help.intro") + "</div>";
        var secs = cult.getHelpSections();
        for (var i = 0; i < secs.length; i++){
            html += "<div class=\"xx-help-sec\">" + $I(secs[i].titleKey) + "</div><ul>";
            for (var j = 0; j < secs[i].bodyKeys.length; j++){
                html += "<li>" + $I(secs[i].bodyKeys[j]) + "</li>";
            }
            html += "</ul>";
        }
        helpContent.innerHTML = html;
    },

    _createFilter: function(filter, fId, filtersDiv){
        var id = "filter-" + fId;

        var checkbox = dojo.create("input", {
                id: id,
                type: "checkbox",
                checked: filter.enabled
        }, filtersDiv);
        dojo.connect(checkbox, "onclick", this, function(){
            filter.enabled = checkbox.checked;
        });

        dojo.create("label", {
            "for": id,
            innerHTML: filter.title
        }, filtersDiv);
        dojo.create("br", null, filtersDiv);
    },

    logMessagesToFade: 15, //how many messages to fade as they approach message limits

    renderConsoleLog: function() {
        var _console = this.game.console,
            messages = _console.messages;

        var gameLog = dojo.byId("gameLog");
        if (messages.length === 0) {
            return;
        }

        var messageLatest = messages[messages.length - 1];
        var messagePrevious = 1 < messages.length ? messages[messages.length - 2] : null;
        var insertDateHeader = !messagePrevious 
            || messageLatest.year !== messagePrevious.year 
            || messageLatest.seasonTitle !== messagePrevious.seasonTitle;

        if (!messageLatest.span) {
            var span = dojo.create("span", {className: "msg", innerHTML: messageLatest.text}, gameLog);

            if (messageLatest.type) {
                dojo.addClass(span, "type_" + messageLatest.type);
            }
            if (messageLatest.noBullet) {
                dojo.addClass(span, "noBullet");
            }
            messageLatest.span = span;
        }

        if (insertDateHeader) {
            //Calling msg will itself trigger another call to renderConsoleLog
            if (!messageLatest.year || !messageLatest.seasonTitle) {
                this.game.console.msg($I("ui.log.link"), "date", null, false);
            } else {
                this.game.console.msg($I("calendar.year.ext", [messageLatest.year, messageLatest.seasonTitle]), "date", null, false);
            }
        }

        if (messageLatest.type === "date") {
            dojo.place(messageLatest.span, gameLog, "first");
            //Skip the housekeeping logic because the function-call stack contains
            // another instance of renderConsoleLog that will take care of it for us.
            //At the moment, the last message in the log is the one we wanted to create--
            // it hasn't been dojo.place'd in its proper spot yet.
            return;
        }
        //------------ else: non-date, non-header messages ------------

        //Place current message immediately below the date header.
        dojo.place(messageLatest.span, gameLog, 1);

        //Destroy child nodes if there are too many.
        while (gameLog.childNodes.length > _console.maxMessages) {
            dojo.destroy(gameLog.lastChild);
        }

        //fade message spans as they get closer to being removed and replaced
        var spans = dojo.query("span", gameLog);
        var fadeCount = this.logMessagesToFade + 1; //add one so the last line is still barely visible
        var fadeStart = _console.maxMessages - fadeCount;
        var fadeInterval = 1 / fadeCount;

        for (var i = fadeStart + 1; i < spans.length; i++) {
            dojo.style(spans[i], "opacity", (1 - (i - fadeStart) * fadeInterval));
        }
    },

    //要事飘签——突破/法宝/秘钥等 important 消息除了进日志,再在屏边浮一张签;
    //载入后数秒内(离线补算刷屏)、剧情卡面开着时、同句连发时都不浮
    notifyLogEvent: function(logmsg) {
        if (!logmsg || typeof document == "undefined"){
            return;
        }
        var tmp = document.createElement("div");
        tmp.innerHTML = String(logmsg.text || "");
        var text = (tmp.textContent || "").replace(/\s+/g, " ").trim();
        var ticker = document.getElementById("xxLogTicker");
        if (ticker && text && logmsg.type != "date"){
            ticker.textContent = text;
            ticker.className = "xx-log-ticker" + (logmsg.type ? " type_" + logmsg.type : "");
        }
        if (logmsg.type != "important" || !text){
            return;
        }
        if (!this._toastReadyAt || Date.now() < this._toastReadyAt){
            return;
        }
        if (this.game && this.game.isReadOnly && this.game.isReadOnly()){
            return;
        }
        if (document.querySelector(".xxFateOverlay")){
            return;
        }
        var host = document.getElementById("xxToasts");
        if (!host){
            return;
        }
        if (text == this._lastToastText && Date.now() - this._lastToastAt < 3000){
            return;
        }
        this._lastToastText = text;
        this._lastToastAt = Date.now();
        if (text.length > 140){
            text = text.slice(0, 138) + "…";
        }
        var toast = document.createElement("div");
        toast.className = "xxToast";
        toast.setAttribute("role", "status");
        toast.title = $I("ui.toast.close");
        toast.textContent = text;
        host.appendChild(toast);
        while (host.children.length > 3){
            host.removeChild(host.firstChild);
        }
        var gone = false;
        var dismiss = function(){
            if (gone){ return; }
            gone = true;
            toast.className += " out";
            setTimeout(function(){
                if (toast.parentNode){ toast.parentNode.removeChild(toast); }
            }, 350);
        };
        toast.onclick = dismiss;
        setTimeout(dismiss, 4500);
    },

    saveExport: function(encodedData, rawData) {
        var is_chrome = /*window.chrome*/ true;
        if (is_chrome){
            $("#exportDiv").show();
            $("#exportData").val(encodedData);
            $("#exportData").select();
        } else {
            window.prompt($I("general.copy.to.clipboard.prompt"), encodedData);
        }
    },

    confirm: function(title, msg, callbackOk, callbackCancel) {
        if (window.confirm(msg)) {
            callbackOk.apply(window);
        } else if (callbackCancel != undefined) {
            callbackCancel.apply(window);
        }
    },

    prompt: function(title, defaultValue, callbackOk) {
        var result = window.prompt(title, defaultValue);
        callbackOk.call(window, result);
    },

    //TODO: add dialog and close/bind events
    showDialog: function(id){
        var container = $("#" + id);
        container.show();

        $(".close", container).click(function(){
            $(".close", container).unbind();
            container.hide();
        });
    },

    load: function() {
        // swap to bonfire if the current tab is not visible
        var tabs = this.game.tabs;
        for (var i = 0; i < tabs.length; i++){
            var tab = tabs[i];
            if (this.activeTabId == tab.tabId){
                if (!tab.visible){
                    this.activeTabId = tabs[0].tabId;
                }
                break;
            }
        }
        this.game.telemetry.logRouteChange(this.activeTabId);

        var uiData = LCstorage["com.nuclearunicorn.kittengame.ui"];
        try {
            uiData = uiData ? JSON.parse(uiData) : {};

            this.fontSize = uiData.fontSize || 16;
            this.isCenter = uiData.isCenter || false;
        } catch (ex) {
            console.error("unable to load ui data", ex);
        }
        this.updateFontSize();
        this.updateCenter();
    },

    save: function(){
        LCstorage["com.nuclearunicorn.kittengame.ui"] = JSON.stringify({
           fontSize: this.fontSize,
           isCenter: this.isCenter,
           theme: this.game.colorScheme
        });
    },

    updateCenter: function(){
        if (this.isCenter) {
            $("#game").addClass("centered");
            $("#toggleCenterIcon").removeClass("right");
            $("#toggleCenterIcon").addClass("left");
        } else {
            $("#game").removeClass("centered");
            $("#toggleCenterIcon").removeClass("left");
            $("#toggleCenterIcon").addClass("right");
        }

    },

    toggleCenter: function(){
        this.isCenter = !this.isCenter;
        this.updateCenter();
    },

    isEffectMultiplierEnabled: function(){
        //console.log(this.keyStates);
        return this.keyStates.shiftKey;
    },

    checkForUpdates: function(){
        var self = this;
        var now = Date.now();
        
        $.getJSON("build.version.json?=" + now).then(function(json){
            var buildRevision = json.buildRevision;
            
            if (buildRevision > self.game.telemetry.buildRevision){
                $("#newVersion").toggle(true);
            }
        });
    }

});
