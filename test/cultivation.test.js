/* global

    test,
    expect,
    game,
    LCstorage
*/

beforeEach(() => {
    global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
    global.newrelic = {
        addPageAction: jest.fn(),
        addRelease: jest.fn(),
        setCustomAttribute: jest.fn(),
        setErrorHandler: jest.fn()
    }

    game.setUI(new classes.ui.UISystem("gameContainerId"));
    game.resetState();
});

afterEach(() => {
    jest.clearAllMocks();
});

//--------------------------------
//       Realm ladder
//--------------------------------
test("Stages are generated from realm defs and lianqi_1 starts researched", () => {
    const cult = game.cultivation;
    expect(cult.stages.length).toBe(32);	//10 + 3*7 + 1
    expect(cult.getStage("lianqi_0").researched).toBe(true);
    expect(cult.getStage("lianqi_0").prices.length).toBe(0);	//free onboarding
    expect(cult.getStage("lianqi_1").researched).toBe(false);
    expect(cult.getStage("dujie_0").chance).toBeCloseTo(0.15);
});

test("Spirit root is rolled on reset and resolves to a known root", () => {
    const cult = game.cultivation;
    expect(cult.spiritRoot).toBeTruthy();
    const root = cult.getRoot();
    expect(root.xiuweiMult).toBeGreaterThan(0);
    cult.resetState();
    expect(cult.spiritRoot).toBeTruthy();
});

//--------------------------------
//       Fates & choices
//--------------------------------
test("Fate without choices fires automatically when its stage is reached", () => {
    const cult = game.cultivation;
    const bottle = cult.getFate("bottle");
    expect(bottle.researched).toBe(false);
    cult.getStage("lianqi_2").researched = true;
    cult.update();
    expect(bottle.researched).toBe(true);
    //小节点只做剧情——不再发数值奖励
    expect(Object.keys(bottle.effects).length).toBe(0);
});

test("Fate with choices stays pending until a choice is applied", () => {
    const cult = game.cultivation;
    const mojuren = cult.getFate("mojuren");
    cult.getStage("lianqi_6").researched = true;
    cult.update();
    //showFateChoice builds the overlay via mocked dojo.create — sets pending, not researched
    expect(mojuren.pending).toBe(true);
    expect(mojuren.researched).toBe(false);

    cult.applyFate(mojuren, mojuren.choices[1]);	//spare
    expect(mojuren.pending).toBe(false);
    expect(mojuren.researched).toBe(true);
    expect(mojuren.choiceKey).toBe("spare");
    //小节点:数值奖励已移除,只留下残魂常驻的 flag
    expect(Object.keys(mojuren.effects).length).toBe(0);
    expect(cult.mojurenAlive).toBe(true);
});

test("Choice branch effects survive a save/load round trip", () => {
    const cult = game.cultivation;
    const xugu = cult.getFate("xugu");
    cult.applyFate(xugu, xugu.choices[0]);	//ally
    //小节点奖励已移除——分支只剩剧情 flag
    expect(Object.keys(xugu.effects).length).toBe(0);
    expect(cult.xuguAlive).toBe(true);

    const saveData = {};
    cult.save(saveData);

    //simulate a fresh client state: effects back to base def
    xugu.effects = {};
    xugu.researched = false;
    xugu.choiceKey = undefined;
    cult.xuguAlive = false;

    cult.load(saveData);
    expect(xugu.researched).toBe(true);
    expect(xugu.choiceKey).toBe("ally");
    expect(Object.keys(xugu.effects).length).toBe(0);	//分支不恢复数值,只留 flag
    expect(cult.xuguAlive).toBe(true);
});

test("Chen choice dao trades a heart-demon hit for cultivation focus", () => {
    const cult = game.cultivation;
    const chen = cult.getFate("chen");
    cult.heartDemon = 10;
    cult.applyFate(chen, chen.choices[0]);	//dao — demonGain
    expect(cult.heartDemon).toBeCloseTo(18);
});

test("New fates are registered across the empty mid-realm layers", () => {
    const cult = game.cultivation;
    const expected = {
        feiyu: "lianqi_4", fengyun: "zhuji_2", chen: "jiedan_1",
        dayan: "yuanying_1", tihun: "yuanying_2", yuanyao: "huashen_1",
        xugu: "lianxu_1", qingyuan: "heti_1", xiedao: "dacheng_1"
    };
    for (const name in expected){
        const f = cult.getFate(name);
        expect(f).toBeTruthy();
        const st = cult.getStage(expected[name]);
        expect(st).toBeTruthy();
        expect(st.name).toBe(expected[name]);
    }
});

test("RMJI story fates fill the remaining free stage slots", () => {
    const cult = game.cultivation;
    const expected = {
        zhangtie: ["lianqi_1", 3], jinguang: ["lianqi_8", 2], tainan: ["zhuji_1", 3],
        chuansong: ["jiedan_2", 2], xutian: ["lianxu_2", 2], erying: ["heti_2", 3]
    };
    for (const name in expected){
        const f = cult.getFate(name);
        expect(f).toBeTruthy();
        expect(f.atStage).toBe(expected[name][0]);
        expect(cult.getStage(expected[name][0])).toBeTruthy();
        expect(f.choices.length).toBe(expected[name][1]);
    }
});

test("Erying choice merge stokes the demon, release clears it", () => {
    const cult = game.cultivation;
    const erying = cult.getFate("erying");
    cult.heartDemon = 60;
    cult.applyFate(erying, erying.choices[0]);	//merge — 夺婴吞魂,心魔滋长
    expect(cult.heartDemon).toBeCloseTo(70);

    cult.applyFate(erying, erying.choices[1]);	//release — demonRelief 40
    expect(cult.heartDemon).toBeCloseTo(30);
});

//--------------------------------
//       Wander / pills / demon
//--------------------------------
test("Wander respects shared cooldown and fenglei halves it", () => {
    const cult = game.cultivation;
    expect(cult.actionCd).toBe(0);
    expect(cult.wander()).toBe(true);
    expect(cult.actionCd).toBe(cult.WANDER_CD);
    expect(cult.wander()).toBe(false);	//still on cooldown

    cult.actionCd = 0;
    cult.getFate("fenglei").researched = true;
    cult.wander();
    expect(cult.actionCd).toBe(cult.WANDER_CD * 0.5);
});

test("All four actions share one cooldown and seclusion excludes bursts", () => {
    const cult = game.cultivation;
    cult.getStage("zhuji_0").researched = true;
    cult.riftKeys = 3;

    //one action locks out the other three
    expect(cult.wander()).toBe(true);
    expect(cult.actionCd).toBeGreaterThan(0);
    expect(cult.rift()).toBe(false);
    expect(cult.greaterRift()).toBe(false);
    expect(cult.toggleSeclude()).toBe(false);	//气息未稳,闭关不得

    //cooldown ticks down as one shared counter
    cult.actionCd = 3;
    cult.update();
    cult.update();
    expect(cult.actionCd).toBe(1);

    //seclusion occupies the slot just the same: bursts refuse while secluded
    cult.actionCd = 0;
    expect(cult.toggleSeclude()).toBe(true);
    expect(cult.secluded).toBe(true);
    expect(cult.wander()).toBe(false);
    expect(cult.rift()).toBe(false);
    expect(cult.greaterRift()).toBe(false);
    cult.toggleSeclude();	//出关自由
    expect(cult.secluded).toBe(false);
});

test("Shared cooldown survives save/load", () => {
    const cult = game.cultivation;
    cult.actionCd = 77;
    cult.actionCdMax = 100;
    const saveData = {};
    cult.save(saveData);
    cult.actionCd = 0; cult.actionCdMax = 0;
    cult.load(saveData);
    expect(cult.actionCd).toBe(77);
    expect(cult.actionCdMax).toBe(100);
});

test("Demon gate suppresses breakthrough chance and pills relieve it", () => {
    const cult = game.cultivation;
    cult.heartDemon = 95;
    expect(cult.isDemonBlocked()).toBe(true);
    const stage = cult.getStage("zhuji_0");
    //0.85 base - 95*0.004 demon penalty = 0.47; buyItem hard-blocks via isDemonBlocked
    expect(cult.getBreakChance(stage)).toBeCloseTo(0.47);

    cult.craftPill("qingxin");
    expect(cult.usePill("qingxin")).toBe(true);
    expect(cult.heartDemon).toBeCloseTo(55);
    expect(cult.isDemonBlocked()).toBe(false);
    expect(cult.getBreakChance(stage)).toBeCloseTo(0.85 - 55 * 0.004);
});

test("Pills are consumable inventory — craft to stock, use to burn", () => {
    const cult = game.cultivation;
    //nothing in the bag: usePill refuses instead of eating a phantom pill
    expect(cult.usePill("zhujidan")).toBe(false);

    cult.craftPill("zhujidan");
    cult.craftPill("zhujidan");
    expect(cult.getPill("zhujidan").val).toBe(2);

    //one pill = +0.3, capped — spamming a second pill is refused, not wasted
    expect(cult.usePill("zhujidan")).toBe(true);
    expect(cult.breakBoost).toBeCloseTo(0.3);
    expect(cult.usePill("zhujidan")).toBe(false);
    expect(cult.getPill("zhujidan").val).toBe(1);	//second pill stays for the next attempt
});

test("Pill inventory survives save/load and resets to zero on reincarnation", () => {
    const cult = game.cultivation;
    cult.craftPill("juqi");
    cult.craftPill("juqi");
    cult.craftPill("qingxin");

    const saveData = {};
    cult.save(saveData);
    cult.getPill("juqi").val = 0;
    cult.load(saveData);
    expect(cult.getPill("juqi").val).toBe(2);
    expect(cult.getPill("qingxin").val).toBe(1);

    cult.resetState();
    expect(cult.getPill("juqi").val).toBe(0);
    expect(cult.getPill("qingxin").val).toBe(0);
});

test("Seclusion trades mundane production for cultivation speed", () => {
    const cult = game.cultivation;
    cult.spiritRoot = "san";	//xiuweiMult 1.0 — neutral root, keeps the math clean
    cult.secluded = true;
    game.globalEffectsCached = {};
    cult.updateEffectCached();
    const g = game.globalEffectsCached;
    //lianqi_0 contributes +0.015 xiuweiRatio on top of the seclusion bonus
    expect(g.xiuweiRatio).toBeCloseTo(cult.SECLUSION_XIUWEI + cult.stages[0].effects.xiuweiRatio);
    //lianqi_0 is researched by default and grants +0.03 realmProductionRatio on top of the seclusion penalty
    expect(g.realmProductionRatio).toBeCloseTo(cult.SECLUSION_MUNDANE + cult.stages[0].effects.realmProductionRatio);
    cult.secluded = false;
});

test("Save/load round trip preserves realm progress and demon state", () => {
    const cult = game.cultivation;
    cult.getStage("lianqi_5").researched = true;
    cult.heartDemon = 33;
    cult.breakBoost = 0.3;
    cult.spiritRoot = "tian";

    const saveData = {};
    cult.save(saveData);

    cult.getStage("lianqi_5").researched = false;
    cult.heartDemon = 0;
    cult.breakBoost = 0;
    cult.spiritRoot = "wei";

    cult.load(saveData);
    expect(cult.getStage("lianqi_5").researched).toBe(true);
    expect(cult.heartDemon).toBe(33);
    expect(cult.breakBoost).toBeCloseTo(0.3);
    expect(cult.spiritRoot).toBe("tian");
});

//--------------------------------
//       秘境 / rift system
//--------------------------------
test("Lesser rift is gated behind zhuji, farms xiuwei, respects cooldown", () => {
    const cult = game.cultivation;
    expect(cult.isRiftUnlocked()).toBe(false);
    expect(cult.rift()).toBe(false);	//locked — no free lunch for 炼气

    cult.getStage("zhuji_0").researched = true;
    const before = game.resPool.get("xiuwei").value;
    jest.spyOn(Math, "random").mockReturnValue(0.99);	//no side-roll, pure exp run
    expect(cult.rift()).toBe(true);
    expect(game.resPool.get("xiuwei").value).toBeGreaterThan(before);
    expect(cult.actionCd).toBe(cult.RIFT_CD);
    expect(cult.rift()).toBe(false);	//on shared cooldown
    Math.random.mockRestore();
});

test("Lesser rift can drop ancient realm keys", () => {
    const cult = game.cultivation;
    cult.getStage("zhuji_0").researched = true;
    jest.spyOn(Math, "random").mockReturnValue(0.1);	//key band
    cult.rift();
    expect(cult.riftKeys).toBe(1);
    Math.random.mockRestore();
});

test("Greater rift consumes a key, floors the ladder on success, hurts on fail", () => {
    const cult = game.cultivation;
    cult.getStage("zhuji_0").researched = true;
    expect(cult.greaterRift()).toBe(false);	//no key

    cult.riftKeys = 2;
    jest.spyOn(game, "render").mockImplementation(() => {});
    const rnd = jest.spyOn(Math, "random").mockReturnValue(0.0);	//always succeed, first artifact pick
    cult.greaterRift();
    expect(cult.riftKeys).toBe(1);
    expect(cult.riftFloor).toBe(1);
    expect(cult.actionCd).toBe(cult.RIFT_CD);	//greater rift joins the shared cooldown

    rnd.mockReturnValue(0.999);	//success roll fails
    const demon = cult.heartDemon;
    cult.actionCd = 0;	//气脉调匀再闯
    cult.greaterRift();
    expect(cult.riftKeys).toBe(0);
    expect(cult.riftFloor).toBe(1);	//ladder holds
    expect(cult.heartDemon).toBeGreaterThan(demon);
    Math.random.mockRestore();
});

test("Artifact drops grant, rank up, then salvage at max rank", () => {
    const cult = game.cultivation;
    const rnd = jest.spyOn(Math, "random").mockReturnValue(0.0);	//always first item: xuantie
    const art = cult.getArtifact("xuantie");

    jest.spyOn(game, "render").mockImplementation(() => {});
    cult.rollArtifactDrop(1);
    expect(art.researched).toBe(true);
    expect(art.rank).toBe(1);
    expect(art.effects.xiuweiRatio).toBeCloseTo(0.08);

    cult.spiritRoot = "san";	//neutral root — keeps the cache math clean
    game.globalEffectsCached = {};
    cult.updateEffectCached();
    expect(game.globalEffectsCached.xiuweiRatio).toBeCloseTo(
        0.015 + 0.08);	//lianqi_0 stage bonus + artifact

    cult.rollArtifactDrop(1);	//dupe -> rank 2, effects double
    expect(art.rank).toBe(2);
    expect(art.effects.xiuweiRatio).toBeCloseTo(0.16);

    cult.rollArtifactDrop(1);
    expect(art.rank).toBe(3);	//cap

    const relicBefore = game.resPool.get("relic").value;
    cult.rollArtifactDrop(1);	//past cap -> salvage
    expect(art.rank).toBe(3);
    expect(game.resPool.get("relic").value).toBeGreaterThan(relicBefore);
    Math.random.mockRestore();
});

test("Rift progress and artifacts survive save/load", () => {
    const cult = game.cultivation;
    cult.getStage("zhuji_0").researched = true;
    cult.riftKeys = 3;
    cult.riftFloor = 7;
    const art = cult.getArtifact("juling");
    art.researched = true;
    art.rank = 2;
    art.effects = {xiuweiRatio: art.baseEffects.xiuweiRatio * 2};

    const saveData = {};
    cult.save(saveData);

    cult.riftKeys = 0;
    cult.riftFloor = 0;
    art.researched = false;
    art.rank = 0;
    art.effects = undefined;

    cult.load(saveData);
    expect(cult.riftKeys).toBe(3);
    expect(cult.riftFloor).toBe(7);
    expect(art.researched).toBe(true);
    expect(art.rank).toBe(2);
    expect(art.effects.xiuweiRatio).toBeCloseTo(0.1);	//rebuilt from rank
});

//--------------------------------
//       Progression curve
//--------------------------------
test("Every stage grants a flat xiuwei trickle that scales with realm bonus", () => {
    const cult = game.cultivation;
    for (const s of cult.stages){
        const def = cult.REALM_DEFS.find(d => d.key == s.realm);
        expect(s.effects.xiuweiPerTickBase).toBeCloseTo(def.bonus * 2);
    }
    //and it actually flows into the shared effect cache
    game.globalEffectsCached = {};
    cult.updateEffectCached();
    expect(game.globalEffectsCached.xiuweiPerTickBase).toBeCloseTo(0.06);	//lianqi_0
});

test("Sect promotions announce themselves; non-stage purchases never echo breakthrough text", () => {
    const cult = game.cultivation;
    const ctrl = new classes.ui.RealmBtnController(game);
    const spy = jest.spyOn(game, "msg");
    ctrl.onPurchase({metadata: cult.getRealm("sect1")});
    expect(spy).toHaveBeenCalledWith("$cultivation.msg.promoted$", "important");
    spy.mockClear();
    ctrl.onPurchase({metadata: cult.getRealm("vein1")});
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
});

test("Spirit root priceMult discounts stage prices but leaves veins alone", () => {
    const cult = game.cultivation;
    cult.spiritRoot = "wei";	//priceMult 0.85
    const ctrl = new classes.ui.RealmBtnController(game);
    const stage = ctrl.getPrices({metadata: cult.getStage("zhuji_0")});
    const list = cult.getStage("zhuji_0").prices;
    for (let i = 0; i < list.length; i++){
        const p = stage.find(x => x.name == list[i].name);
        expect(p.val).toBeCloseTo(list[i].val * 0.85);
    }
    const vein = ctrl.getPrices({metadata: cult.getRealm("vein1")});
    const veinList = cult.getRealm("vein1").prices;
    expect(vein[0].val).toBeCloseTo(veinList[0].val);	//no discount on 灵脉
});

test("Breakthrough grants no xiuwei kickback — the new realm's bonus is the reward", () => {
    const cult = game.cultivation;
    const ctrl = new classes.ui.RealmBtnController(game);
    const before = game.resPool.get("xiuwei").value;
    ctrl.onPurchase({metadata: cult.getStage("jiedan_1")});
    ctrl.onPurchase({metadata: cult.getStage("yuanying_0")});	//realm-entry too
    expect(game.resPool.get("xiuwei").value - before).toBe(0);
});

//--------------------------------
//       Lifespan / 寿元
//--------------------------------
test("Age tracks calendar years; lifespan cap is per-realm and monotonic", () => {
    const cult = game.cultivation;
    expect(cult.age).toBe(0);
    expect(cult.getLifespan()).toBe(80);	//炼气 realm base — never dips below an earlier stage's cap

    const ticksPerYear = game.calendar.ticksPerDay *
        game.calendar.daysPerSeason * game.calendar.seasonsPerYear;
    for (let i = 0; i < ticksPerYear; i++){ cult.update(); }
    expect(cult.age).toBeCloseTo(1, 5);

    //every realm cap exceeds the previous — a breakthrough can never kill you
    for (let i = 1; i < cult.REALM_DEFS.length; i++){
        expect(cult.REALM_DEFS[i].life).toBeGreaterThan(cult.REALM_DEFS[i - 1].life);
    }
});

test("Lifespan warnings fire once each at 60/80/95% of the cap", () => {
    const cult = game.cultivation;
    const spy = jest.spyOn(game, "msg");
    const tpy = game.calendar.ticksPerDay * game.calendar.daysPerSeason * game.calendar.seasonsPerYear;
    cult.age = 80 * 0.6;	//just at the first threshold of 炼气's 80y cap

    cult.update();
    expect(cult.lifeWarned["60"]).toBe(true);
    cult.update();
    const warnCalls = spy.mock.calls.filter(c => String(c[0]).indexOf("lifespan.warn") >= 0);
    expect(warnCalls.length).toBe(1);	//no repeat while parked at the threshold

    cult.age = 80 * 0.96;
    cult.update();
    expect(cult.lifeWarned["80"]).toBe(true);
    expect(cult.lifeWarned["95"]).toBe(true);	//catch-up: both pending warnings fire
    spy.mockRestore();
});

test("Reaching the lifespan cap opens the death overlay once and blocks further updates", () => {
    const cult = game.cultivation;
    cult.age = 80;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const byIdSpy = jest.spyOn(dojo, "byId").mockReturnValue(container);
    cult.update();
    expect(cult.dying).toBe(true);
    expect(container.querySelector(".xxDeathCard")).toBeTruthy();
    cult.update();	//dying guard — must not stack overlays
    expect(container.querySelectorAll(".xxDeathCard").length).toBe(1);
    byIdSpy.mockRestore();
    document.body.removeChild(container);
});

test("Reincarnation karma scales with realm and is awarded exactly once", () => {
    const cult = game.cultivation;
    cult.getStage("zhuji_0").researched = true;	//realm index 1 → bonus 3
    const before = game.karmaKittens;
    jest.spyOn(game, "resetAutomatic").mockImplementation(() => {});
    cult.applyReincarnation(cult.getCurrentRealmIndex() * cult.ASCENSION_KARMA);
    expect(game.karmaKittens).toBe(before + 3);
    expect(game.resetAutomatic).toHaveBeenCalledTimes(1);
    game.resetAutomatic.mockRestore();
});

test("Lifespan state persists through save/load and resets on reincarnation", () => {
    const cult = game.cultivation;
    cult.age = 42;
    cult.lifeWarned = {"60": true};

    const saveData = {};
    cult.save(saveData);
    cult.age = 0;
    cult.lifeWarned = {};
    cult.load(saveData);
    expect(cult.age).toBe(42);
    expect(cult.lifeWarned["60"]).toBe(true);

    cult.resetState();
    expect(cult.age).toBe(0);
    expect(cult.lifeWarned).toEqual({});
    expect(cult.dying).toBe(false);
});

test("Stage xiuwei costs stay inside the tuned envelope — no runaway exponent", () => {
    const cult = game.cultivation;
    let total = 0, prevCost = 0, maxJump = 1;
    for (const s of cult.stages){
        const cost = s.prices.reduce((t, p) => t + (p.name == "xiuwei" ? p.val : 0), 0);
        total += cost;
        //consecutive costs must not cliff — the designed worst case is
        //lianqi_9 → zhuji_0 (~14x), softened by the rift unlock income
        //jump landing at the same moment
        if (prevCost > 0){
            maxJump = Math.max(maxJump, cost / prevCost);
        }
        prevCost = cost;
        expect(cost).toBeLessThanOrEqual(6e7);	//dujie is the cap, not a wall
    }
    expect(maxJump).toBeLessThanOrEqual(15);
    expect(total).toBeLessThan(2e8);
    //lianqi must stay cheap: the whole onboarding realm under ~5min of output
    const lianqiTotal = cult.stages.filter(s => s.realm == "lianqi")
        .reduce((t, s) => t + s.prices.reduce((u, p) => u + (p.name == "xiuwei" ? p.val : 0), 0), 0);
    expect(lianqiTotal).toBeLessThan(1500);
});

//--------------------------------
//       道途指引 / onboarding guide
//--------------------------------
test("Guide starts pending and completes in order as state advances", () => {
    const cult = game.cultivation;
    let guide = cult.getGuideSteps();
    expect(guide.total).toBe(cult.GUIDE_STEPS.length);
    expect(guide.done).toBe(0);
    expect(guide.pending[0].key).toBe("hut");	//first buildable = first step

    game.bld.get("hut").val = 1;	//meditation hut built
    game.bld.get("field").val = 1;	//spirit field opened
    cult.getStage("lianqi_1").researched = true;
    guide = cult.getGuideSteps();
    expect(guide.done).toBe(3);
    expect(guide.pending.map(s => s.key)).toEqual(
        expect.arrayContaining(["wander", "seclude", "zhuji", "rift", "grift", "vein", "sect", "artifact", "dacheng"]));
});

test("Guide steps carry nav targets and progress info where promised", () => {
    const cult = game.cultivation;
    const byKey = {};
    cult.GUIDE_STEPS.forEach(function(s){ byKey[s.key] = s; });
    expect(byKey.hut.nav).toBe("Bonfire");	//build it there
    expect(byKey.field.nav).toBe("Bonfire");	//build it there
    const pr = byKey.break2.info(cult, game);
    expect(pr[1]).toBeGreaterThan(0);	//xiuwei cost of lianqi_1
});

test("Guide counters tick on wander, seclude and rift", () => {
    const cult = game.cultivation;
    game.bld.get("hut").val = 1;
    game.bld.get("field").val = 2;
    cult.wander();
    cult.actionCd = 0;	//调息毕,再入定
    cult.toggleSeclude(); cult.toggleSeclude();	//on then off — counts once
    cult.getStage("zhuji_0").researched = true;
    cult.actionCd = 0;	//出关后再入秘境
    jest.spyOn(Math, "random").mockReturnValue(0.99);
    cult.rift();
    Math.random.mockRestore();
    expect(cult.stats).toEqual({wander: 1, seclude: 1, rift: 1});
    expect(cult.getGuideSteps().done).toBe(6);	//kitten+assign+wander+seclude+zhuji+rift
});

test("Guide stats and demonWarned survive save/load and reset", () => {
    const cult = game.cultivation;
    cult.stats.wander = 4;
    cult.demonWarned = true;
    const saveData = {};
    cult.save(saveData);
    cult.stats = {wander: 0, seclude: 0, rift: 0};	//fresh object — save holds a live ref
    cult.demonWarned = false;
    cult.load(saveData);
    expect(cult.stats.wander).toBe(4);
    expect(cult.demonWarned).toBe(true);
    //old saves without stats don't break the guide
    cult.stats = {wander: 0, seclude: 0, rift: 0};
    cult.load({cultivation: {stages: []}});
    expect(cult.stats.wander).toBe(0);
    expect(cult.getGuideSteps().total).toBe(cult.GUIDE_STEPS.length);
});

test("Demon warning fires once at the teachable moment", () => {
    const cult = game.cultivation;
    const spy = jest.spyOn(game, "msg");
    cult.heartDemon = cult.DEMON_WARN_AT - 1;
    cult.update();
    expect(cult.demonWarned).toBe(false);
    cult.heartDemon = cult.DEMON_WARN_AT;
    cult.update();
    expect(cult.demonWarned).toBe(true);
    expect(spy).toHaveBeenCalledWith("$cultivation.msg.demon.warn$", "alert");
    spy.mockClear();
    cult.update();	//no second nag
    expect(spy).not.toHaveBeenCalledWith("$cultivation.msg.demon.warn$", "alert");
    spy.mockRestore();
});

//--------------------------------
//       Achievements (道果)
//--------------------------------
test("Realm milestone achievement unlocks through update", () => {
    const ach = game.achievements;
    expect(ach.get("foundation").unlocked).toBeFalsy();
    game.cultivation.getStage("zhuji_0").researched = true;
    ach.update();
    expect(ach.get("foundation").unlocked).toBe(true);
    expect(ach.hasUnlocked()).toBe(true);
});

test("All non-hidden achievement conditions evaluate on a fresh game", () => {
    const ach = game.achievements;
    for (const a of ach.achievements){
        if (a.hidden){ continue; }
        expect(() => a.condition.call(ach)).not.toThrow();
        if (a.starCondition){
            expect(() => a.starCondition.call(ach)).not.toThrow();
        }
    }
    for (const b of ach.badges){
        if (b.condition){
            expect(() => b.condition.call(ach)).not.toThrow();
        }
    }
});

test("sihuaCount survives reincarnation resetState and save/load", () => {
    const cult = game.cultivation;
    cult.sihuaCount = 2;
    cult.resetState();          //转生不清坐化计数
    expect(cult.sihuaCount).toBe(2);
    const saveData = {};
    cult.save(saveData);
    cult.sihuaCount = 0;
    cult.load(saveData);
    expect(cult.sihuaCount).toBe(2);
});

test("Achievement/badge save-load round trip", () => {
    const ach = game.achievements;
    ach.get("foundation").unlocked = true;
    ach.getBadge("lotus").unlocked = true;
    const saveData = {};
    ach.save(saveData);
    ach.get("foundation").unlocked = false;
    ach.getBadge("lotus").unlocked = false;
    ach.load(saveData);
    expect(ach.get("foundation").unlocked).toBe(true);
    expect(ach.getBadge("lotus").unlocked).toBe(true);
});

test("Unlocking a removed badge is a safe no-op", () => {
    const ach = game.achievements;
    expect(() => ach.unlockBadge("ivoryTower")).not.toThrow();
    expect(() => ach.unlockAchievement("uberkatzhen")).not.toThrow();
});

test("spaceOddity compat: starUnlocked readable for game.js callers", () => {
    const so = game.achievements.get("spaceOddity");
    expect(so).toBeTruthy();
    expect(so.starUnlocked).toBeFalsy();
    game.space.getProgram("moonMission").on = true;
    game.achievements.update();
    expect(so.unlocked).toBe(true);
});

//--------------------------------
//       突破异象 / pity
//--------------------------------
test("Fail streak adds pity chance on the same stage, resets on success/switch", () => {
    const cult = game.cultivation;
    const zhuji = cult.getStage("zhuji_0");
    const jiedan = cult.getStage("jiedan_0");
    const base = cult.getBreakChance(zhuji);

    const jBase = cult.getBreakChance(jiedan);
    cult.registerBreakFail(zhuji, null);
    cult.registerBreakFail(zhuji, null);
    expect(cult.getBreakChance(zhuji)).toBeCloseTo(Math.min(1, base + 0.08));
    expect(cult.getBreakChance(jiedan)).toBeCloseTo(jBase);	//pity 不跨境界

    cult.registerBreakFail(zhuji, {pityBonus: 1});	//破而后立:一记双悟
    expect(cult.failStreak).toBe(3 + 1);
    cult.clearBreakFail();
    expect(cult.getBreakChance(zhuji)).toBeCloseTo(base);
});

test("Fail streak caps at five and resets on reincarnation", () => {
    const cult = game.cultivation;
    const zhuji = cult.getStage("zhuji_0");
    const base = cult.getBreakChance(zhuji);
    for (let i = 0; i < 9; i++){ cult.registerBreakFail(zhuji, null); }
    expect(cult.getBreakChance(zhuji)).toBeCloseTo(Math.min(1, base + 0.20));
    cult.resetState();
    expect(cult.failStreak).toBe(0);
    expect(cult.failStreakStage).toBeNull();
});

test("Break omens respect cond gates and can return null", () => {
    const cult = game.cultivation;
    //无宗门无灵脉:hushen/gongming 不可见
    jest.spyOn(Math, "random").mockReturnValue(0.60);	//~60% 处
    const seen = new Set();
    for (let i = 0; i < 40; i++){
        const o = cult.rollBreakOmen();
        if (o){ seen.add(o.key); }
    }
    expect(seen.has("hushen")).toBe(false);
    expect(seen.has("gongming")).toBe(false);
    Math.random.mockRestore();
    //全开后能掷出宗门护道
    cult.sects[0].researched = true;
    const o = cult.rollBreakOmen();
    expect(o === null || typeof o.key == "string").toBe(true);
});
