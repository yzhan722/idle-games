/* global test, expect, game, com, classes, beforeEach, afterEach, jest */

/**
 * 坊市定价回归:每条贸易的卖值/买值须落在价值模型允许的区间内。
 * 模型见 js/diplomacy.js 的 resourceValues 表(秒/单位)。
 * 古魔族(leviathans)卖的是传承级资源,不套生产模型,跳过。
 */

beforeEach(() => {
    global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
    global.newrelic = {
        addPageAction: jest.fn(),
        addRelease: jest.fn(),
        setCustomAttribute: jest.fn(),
        setErrorHandler: jest.fn()
    };
    game.setUI(new classes.ui.UISystem("gameContainerId"));
    game.resetState();
});

afterEach(() => {
    jest.clearAllMocks();
});

function valueOf(diplomacy, items, field){
    var total = 0;
    for (var i = 0; i < items.length; i++){
        var v = diplomacy.resourceValues[items[i].name];
        expect(v).toBeDefined();
        total += v * items[i][field];
    }
    return total;
}

test("every modeled trade stays within the sanctioned value band", () => {
    var dip = game.diplomacy;
    for (var i = 0; i < dip.races.length; i++){
        var race = dip.races[i];
        if (race.name === "leviathans"){ continue; }  //传承级兑换,无价模型外
        var inVal = valueOf(dip, race.buys, "val");
        var outVal = valueOf(dip, race.sells, "value");
        //卖值应≥买值的0.5倍(为稀缺品付溢价),且不超过2倍(不能白送)
        expect(outVal / inVal).toBeGreaterThanOrEqual(0.5);
        expect(outVal / inVal).toBeLessThanOrEqual(2.0);
    }
});

test("leviathans sell prestige-tier goods not covered by the value model", () => {
    var lev = game.diplomacy.get("leviathans");
    var sells = lev.sells.map(function(s){ return s.name; });
    ["timeCrystal", "sorrow", "relic", "temporalFlux", "tears"].forEach(function(n){
        expect(sells).toContain(n);
    });
    expect(lev.buys[0].name).toBe("unobtainium");
});

test("trade consumes buys + gold + manpower and gains sells", () => {
    var dip = game.diplomacy;
    var lizards = dip.get("lizards");
    lizards.unlocked = true;
    lizards.energy = 0;

    var res = game.resPool;
    res.get("minerals").value = 5000;
    res.get("gold").value = 100;
    res.get("manpower").value = 200;
    res.get("wood").value = 0;

    dip.tradeMultiple(lizards, 1);

    expect(res.get("minerals").value).toBe(5000 - 500);
    expect(res.get("gold").value).toBe(100 - dip.getGoldCost());
    expect(res.get("manpower").value).toBe(200 - dip.getManpowerCost());
    expect(res.get("wood").value).toBeGreaterThan(0);
});

test("huts produce manpower so trade fuel is not dead", () => {
    var hut = game.bld.get("hut");
    hut.val = 10; hut.on = 10;
    game.updateCaches();
    game.calculateAllEffects();
    game.updateResources();
    expect(game.getResourcePerTick("manpower", true)).toBeGreaterThan(0);
});
