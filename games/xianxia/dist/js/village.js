/**
 * 弟子系统与生态探索引擎已整体移除 —— 此文件仅保留兼容壳。
 *
 * VillageManager 是惰性壳:不生成弟子、不结算职位产出;灵气(manpower)
 * 由建筑 *PerTickBase 效果直接结算。
 * 原 Map/生态群系/远征队系统在移除弟子 UI 后已无可达入口,一并删除。
 */
dojo.declare("classes.managers.VillageManager", com.nuclearunicorn.core.TabManager, {

	constructor: function(game){
		this.game = game;
		this.sim = {
			hadKittenHunters: true	//pacifism 挑战 cleanPaws 徽章判定读取
		};
	},

	update: function(){ },
	updateEffectCached: function(){ },
	fastforward: function(){ },

	resetState: function(){
		this.sim.hadKittenHunters = true;
	},

	save: function(saveData){
		saveData.village = {
			hadKittenHunters: this.sim.hadKittenHunters
		};
	},

	load: function(saveData){
		if (!saveData.village){
			return;
		}
		this.sim.hadKittenHunters = (saveData.village.hadKittenHunters === undefined) ? true : saveData.village.hadKittenHunters;
	}
});

/**
 * 村庄页 stub——弟子系统移除后永不显示,仅为 tabRegistry 实例化契约存在。
 */
dojo.declare("com.nuclearunicorn.game.ui.tab.Village", com.nuclearunicorn.game.ui.tab, {

	evaluateLocks: function(){
		return false;	//村庄页永久隐藏
	},

	render: function(tabContainer){ },

	update: function(){ },
	updateTab: function(){ },

	requestCensusRefresh: function(){ },

	getVillageTitle: function(){
		return this.tabName || "";
	}
});
