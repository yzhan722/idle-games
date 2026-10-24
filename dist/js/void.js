dojo.declare("classes.managers.VoidManager", com.nuclearunicorn.core.TabManager, {
    game: null,

    faction: null,

    constructor: function(game){
        this.game = game;
        this.registerMeta("stackable", this.voidUpgrades, null);
    },

    save: function(saveData){
        saveData.void = {
            vu: this.filterMetadata(this.voidUpgrades, ["name", "val", "on", "unlocked"]),
            faction: this.faction
        };
    },

    load: function(saveData){
        if (!saveData.void){
            return;
        }

        this.faction = saveData.void.faction || null;
    },

    update: function(){
    },

    resetState: function(){

    },

    voidUpgrades:[{
        name: "spaceCathedral",
        label: $I("void.spaceCathedral.label"),
        description: $I("void.spaceCathedral.desc"),
        prices: [{ name: "relic", val: 1 }],
        researched: false
    }],

    getVU: function(name){
        return this.getMeta(name, this.voidUpgrades);
    }
});
