/* global test, expect, game */

//throwaway probe: measure REAL xiuwei/sec production at zhuji/jiedan-era states
//to cross-check tools/dev/simulate-cultivation.js against the live engine.

const log = (...a) => process.stdout.write(a.join(" ") + "\n");

beforeEach(() => {
    global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
    global.newrelic = {
        addPageAction: jest.fn(), addRelease: jest.fn(),
        setCustomAttribute: jest.fn(), setErrorHandler: jest.fn()
    };
    game.setUI(new classes.ui.UISystem("gameContainerId"));
    game.resetState();
});

const researchStage = (name) => {
    let st = game.cultivation.getStage(name);
    if (st){ st.researched = true; }
};

const reachZhujiDone = () => {
    for (let i = 0; i < 10; i++){ researchStage("lianqi_" + i); }
    for (let i = 0; i < 3; i++){ researchStage("zhuji_" + i); }
    game.updateCaches();
    game.update();
};

const xiuweiRate = () => {
    let res = game.resPool.get("xiuwei");
    game.updateResources();
    return res.perTickCached * game.ticksPerSecond;
};

test("PROBE: passive xiuwei rate at zhuji_0 (3 huts, san root, no seclusion)", () => {
    for (let i = 0; i < 10; i++){ researchStage("lianqi_" + i); }
    game.bld.get("hut").val = 3;
    game.cultivation.spiritRoot = "san";
    game.updateCaches(); game.update();
    let r = xiuweiRate();
    log("zhuji-entry passive xiuwei/s:", r.toFixed(4));
    let zhuji0 = game.cultivation.getStage("zhuji_0");
    let cost = zhuji0.prices.filter(p => p.name == "xiuwei")[0].val;
    log("zhuji_0 xiuwei cost:", cost, "=> passive-only wait:", (cost/r/60).toFixed(1), "min");
    expect(r).toBeGreaterThan(0);
});

test("PROBE: same but secluded (+60%) and juqi pill (+100%)", () => {
    for (let i = 0; i < 10; i++){ researchStage("lianqi_" + i); }
    game.bld.get("hut").val = 3;
    game.cultivation.spiritRoot = "san";
    game.cultivation.secluded = true;
    game.cultivation.buffs.juqi = 1500;
    game.updateCaches(); game.update();
    log("zhuji-entry secluded+juqi xiuwei/s:", xiuweiRate().toFixed(4));
    expect(true).toBe(true);
});

test("PROBE: jiedan_0 gate state (zhuji done, 10 huts, vein1, sect1)", () => {
    reachZhujiDone();
    game.bld.get("hut").val = 10;
    game.cultivation.veins[0].researched = true;
    game.cultivation.sects[0].researched = true;
    game.cultivation.spiritRoot = "san";
    game.updateCaches(); game.update();
    let r = xiuweiRate();
    let jd0 = game.cultivation.getStage("jiedan_0");
    let cost = jd0.prices.filter(p => p.name == "xiuwei")[0].val;
    let goldNeed = jd0.prices.filter(p => p.name == "gold").map(p => p.val)[0];
    log("jiedan-entry passive xiuwei/s:", r.toFixed(4),
        "| xiuwei cost:", cost, "=> passive wait:", (cost/r/60).toFixed(1), "min",
        "| gold needed:", goldNeed);
    let anchor = game.cultivation.breakPayout(1.0);
    let riftPerSec = game.cultivation.RIFT_PAY * anchor / (game.cultivation.RIFT_CD / 5);
    log("breakPayout anchor:", anchor,
        "| rift-spam xiuwei/s:", riftPerSec.toFixed(1),
        "=> active-only wait:", (cost / riftPerSec / 60).toFixed(1), "min");
    expect(r).toBeGreaterThan(0);
});

test("PROBE: gold wall — smelter throughput for jiedan 400/880/1936 gold", () => {
    reachZhujiDone();
    let smelter = game.bld.get("smelter");
    smelter.unlocked = true;
    smelter.val = 5;
    smelter.on = 5;
    smelter.calculateEffects(smelter, game);
    game.workshop.get("goldOre").researched = true;
    smelter.calculateEffects(smelter, game);   //recalc after goldOre unlock
    game.resPool.get("wood").value = 1e6;
    game.resPool.get("minerals").value = 1e6;
    game.updateCaches(); game.update();
    let gold = game.resPool.get("gold");
    log("smelter effects:", JSON.stringify(game.bld.get("smelter").effectsCalculated || game.bld.get("smelter").effects));
    log("getEffect goldPerTickAutoprod:", game.getEffect("goldPerTickAutoprod"));
    log("gold res maxValue:", gold.maxValue, "unlocked:", gold.unlocked, "value:", gold.value);
    game.updateResources();
    let gps = gold.perTickCached * game.ticksPerSecond;
    log("gold/s with 5 smelters:", gps.toFixed(4));
    for (let l = 0; l < 3; l++){
        let st = game.cultivation.getStage("jiedan_" + l);
        let need = st.prices.filter(p => p.name == "gold")[0].val;
        log("  jiedan_" + l + " gold " + need + " => " + (need / gps / 60).toFixed(1) + " min");
    }
    expect(gps).toBeGreaterThan(0);
});
