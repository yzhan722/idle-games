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
    expect(cult.getStage("dujie_0").chance).toBeCloseTo(0.10);
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
test("Fate without choices opens a story card at its stage, applies on close", () => {
    const cult = game.cultivation;
    const bottle = cult.getFate("bottle");
    expect(bottle.researched).toBe(false);
    cult.getStage("lianqi_2").researched = true;
    cult.update();
    //纯叙事章也走卡面——pending 待阅,点「记下」才落档
    expect(bottle.pending).toBe(true);
    expect(bottle.researched).toBe(false);
    cult.applyFate(bottle, null);
    expect(bottle.researched).toBe(true);
    //凝露瓶是命定之物——常驻灵香涓滴,不是纯剧情节点
    expect(bottle.effects.spicePerTickBase).toBeCloseTo(0.02);
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
    //小节点:数值奖励已移除,只留下残魂常驻的 tale 标记
    expect(Object.keys(mojuren.effects).length).toBe(0);
    expect(cult.tale.mojuren).toBe("spare");
});

test("Choice branch effects survive a save/load round trip", () => {
    const cult = game.cultivation;
    const xugu = cult.getFate("xugu");
    cult.applyFate(xugu, xugu.choices[0]);	//ally
    //小节点奖励已移除——分支只剩 tale 标记
    expect(Object.keys(xugu.effects).length).toBe(0);
    expect(cult.tale.xugu).toBe("ally");

    const saveData = {};
    cult.save(saveData);

    //simulate a fresh client state: effects back to base def
    xugu.effects = {};
    xugu.researched = false;
    xugu.choiceKey = undefined;
    cult.tale = {};

    cult.load(saveData);
    expect(xugu.researched).toBe(true);
    expect(xugu.choiceKey).toBe("ally");
    expect(Object.keys(xugu.effects).length).toBe(0);	//分支不恢复数值,只留 tale 标记
    expect(cult.tale.xugu).toBe("ally");
});

test("Chen choice dao is a pure story branch — marks the tale, spares the heart", () => {
    const cult = game.cultivation;
    const chen = cult.getFate("chen");
    cult.heartDemon = 10;
    cult.applyFate(chen, chen.choices[0]);	//dao — 一心向道,纯叙事分支
    expect(cult.tale.chen).toBe("dao");
    expect(cult.heartDemon).toBeCloseTo(10);	//无 demonGain,心魔不动
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
        chuansong: ["jiedan_2", 2], xutian: ["lianxu_2", 3], erying: ["heti_2", 3]
    };
    for (const name in expected){
        const f = cult.getFate(name);
        expect(f).toBeTruthy();
        expect(f.atStage).toBe(expected[name][0]);
        expect(cult.getStage(expected[name][0])).toBeTruthy();
        expect(f.choices.length).toBe(expected[name][1]);
    }
});

test("Erying choice merge grants cultivation focus, release clears the demon", () => {
    const cult = game.cultivation;
    const erying = cult.getFate("erying");
    cult.heartDemon = 60;
    cult.applyFate(erying, erying.choices[0]);	//merge — 炼化归一,道基大涨
    expect(cult.heartDemon).toBeCloseTo(60);	//无 demonGain
    expect(erying.effects.xiuweiRatio).toBeCloseTo(0.1);

    cult.applyFate(erying, erying.choices[1]);	//release — demonRelief 40
    expect(cult.heartDemon).toBeCloseTo(20);
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
    //0.55 base - 95*0.006 demon penalty clamps to the 0.05 floor;
    //buyItem additionally hard-blocks via isDemonBlocked
    expect(cult.getBreakChance(stage)).toBeCloseTo(0.05);

    cult.craftPill("qingxin");
    expect(cult.usePill("qingxin")).toBe(true);
    expect(cult.heartDemon).toBeCloseTo(80);	//清心丹 -15
    expect(cult.isDemonBlocked()).toBe(false);	//80 < gate 90
    expect(cult.getBreakChance(stage)).toBeCloseTo(0.55 - 80 * 0.006);
});

test("Pills are consumable inventory — craft to stock, use to burn", () => {
    const cult = game.cultivation;
    //nothing in the bag: usePill refuses instead of eating a phantom pill
    expect(cult.usePill("zhujidan")).toBe(false);

    cult.craftPill("zhujidan");
    cult.craftPill("zhujidan");
    expect(cult.getPill("zhujidan").val).toBe(2);

    //one pill = breakMult +0.5 (relative boost), capped — second pill refused
    expect(cult.usePill("zhujidan")).toBe(true);
    expect(cult.breakMult).toBeCloseTo(0.5);
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
    //闭关只压凡俗(seclusionMundaneRatio),不伤修为;realmProductionRatio 只剩层位加成
    expect(g.seclusionMundaneRatio).toBeCloseTo(cult.SECLUSION_MUNDANE);
    expect(g.realmProductionRatio).toBeCloseTo(cult.stages[0].effects.realmProductionRatio);
    cult.secluded = false;
});

test("Save/load round trip preserves realm progress and demon state", () => {
    const cult = game.cultivation;
    cult.getStage("lianqi_5").researched = true;
    cult.heartDemon = 33;
    cult.breakMult = 0.3;
    cult.spiritRoot = "tian";

    const saveData = {};
    cult.save(saveData);

    cult.getStage("lianqi_5").researched = false;
    cult.heartDemon = 0;
    cult.breakMult = 0;
    cult.spiritRoot = "wei";

    cult.load(saveData);
    expect(cult.getStage("lianqi_5").researched).toBe(true);
    expect(cult.heartDemon).toBe(33);
    expect(cult.breakMult).toBeCloseTo(0.3);
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
        cult.stages[0].effects.xiuweiRatio + 0.08);	//lianqi_0 stage bonus + artifact

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
test("Initial Mortal stage (lianqi_0) has 0 xiuweiPerTickBase while subsequent stages scale with realm bonus", () => {
    const cult = game.cultivation;
    expect(cult.stages[0].name).toBe("lianqi_0");
    expect(cult.stages[0].effects.xiuweiPerTickBase).toBe(0);
    for (let i = 1; i < cult.stages.length; i++){
        const s = cult.stages[i];
        const def = cult.REALM_DEFS.find(d => d.key == s.realm);
        expect(s.effects.xiuweiPerTickBase).toBeCloseTo(def.bonus);
    }
    // On a fresh game (Mortal state), initial xiuwei growth speed is strictly 0
    game.globalEffectsCached = {};
    cult.updateEffectCached();
    expect(game.globalEffectsCached.xiuweiPerTickBase || 0).toBe(0);
    expect(game.calcResourcePerTick("xiuwei")).toBe(0);
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

test("Spirit root priceMult scales stage breakthrough prices (multi-root higher, heavenly root lower) and leaves veins alone", () => {
    const cult = game.cultivation;
    const ctrl = new classes.ui.RealmBtnController(game);
    const list = cult.getStage("zhuji_0").prices;

    // 伪灵根 (wei): 多灵根突破消耗提高 (priceMult 1.35)
    cult.spiritRoot = "wei";
    const stageWei = ctrl.getPrices({metadata: cult.getStage("zhuji_0")});
    for (let i = 0; i < list.length; i++){
        const p = stageWei.find(x => x.name == list[i].name);
        expect(p.val).toBeCloseTo(list[i].val * 1.35);
    }

    // 天灵根 (tian): 单灵根瓶颈松动突破消耗降低 (priceMult 0.80)
    cult.spiritRoot = "tian";
    const stageTian = ctrl.getPrices({metadata: cult.getStage("zhuji_0")});
    for (let i = 0; i < list.length; i++){
        const p = stageTian.find(x => x.name == list[i].name);
        expect(p.val).toBeCloseTo(list[i].val * 0.80);
    }

    const vein = ctrl.getPrices({metadata: cult.getRealm("vein1")});
    const veinList = cult.getRealm("vein1").prices;
    expect(vein[0].val).toBeCloseTo(veinList[0].val);	//no scaling on 灵脉
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
    //lianqi must stay cheap: the whole onboarding realm stays a short-session ramp
    const lianqiTotal = cult.stages.filter(s => s.realm == "lianqi")
        .reduce((t, s) => t + s.prices.reduce((u, p) => u + (p.name == "xiuwei" ? p.val : 0), 0), 0);
    expect(lianqiTotal).toBeLessThan(12000);
});

//--------------------------------
//       道途指引 / onboarding guide
//--------------------------------
test("Guide starts pending and completes in order as state advances", () => {
    const cult = game.cultivation;
    let guide = cult.getGuideSteps();
    expect(guide.total).toBe(cult.GUIDE_STEPS.length);
    expect(guide.done).toBe(0);
    expect(guide.pending[0].key).toBe("gather");	//first resource action = first step

    game.bld.get("hut").val = 1;	//meditation hut built
    game.bld.get("field").val = 1;	//spirit field opened
    cult.getStage("lianqi_1").researched = true;
    guide = cult.getGuideSteps();
    expect(guide.done).toBe(5);	//gather+field+refine+hut+break2
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
    expect(cult.getGuideSteps().done).toBe(8);	//gather+field+refine+hut+wander+seclude+zhuji+rift
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

test("Early-game guide milestone rewards claim once without skipping steps and survive save/load", () => {
    const cult = game.cultivation;
    game.resPool.get("catnip").value = 5;
    cult.claimGuideRewards();
    expect(cult.guideClaimed.gather).toBe(true);
    expect(cult.guideClaimed.field).toBeFalsy();	//must not auto-complete field or refine
    expect(cult.guideClaimed.refine).toBeFalsy();
    // Mortal herb gathering grants catnip only; xiuwei remains 0 until building 神手竹庐 (hut)
    expect(game.resPool.get("catnip").value).toBeGreaterThan(5);
    expect(game.resPool.get("xiuwei").value).toBe(0);

    // Building first hut awakens spiritual qi and grants the first xiuwei boon
    game.bld.get("hut").val = 1;
    cult.claimGuideRewards();
    expect(cult.guideClaimed.hut).toBe(true);
    const xwAfterHut = game.resPool.get("xiuwei").value;
    expect(xwAfterHut).toBeGreaterThan(0);

    //claiming again does not double-grant
    cult.claimGuideRewards();
    expect(game.resPool.get("xiuwei").value).toBe(xwAfterHut);

    const saveData = {};
    cult.save(saveData);
    cult.guideClaimed = {};
    cult.load(saveData);
    expect(cult.guideClaimed.gather).toBe(true);
    expect(cult.guideClaimed.hut).toBe(true);
});

test("resolveWander always grants base xiuwei and protects Lianqi players from ambush loss", () => {
    const cult = game.cultivation;
    game.resPool.get("minerals").maxValue = 1000;
    game.resPool.get("minerals").value = 200;
    const xw0 = game.resPool.get("xiuwei").value;
    jest.spyOn(Math, "random").mockReturnValue(0.88);	//ambush band (83..92)
    cult.resolveWander();
    expect(game.resPool.get("xiuwei").value).toBeGreaterThan(xw0);
    expect(game.resPool.get("minerals").value).toBe(200);	//no ambush loss in Lianqi
    Math.random.mockRestore();
});

test("gatherCatnip preserves +5 on first click, scales with fields/stage, and triggers serendipity", () => {
    const bld = game.bld;
    const catnip = game.resPool.get("catnip");
    const xiuwei = game.resPool.get("xiuwei");
    catnip.value = 0;
    xiuwei.value = 0;
    bld.gatherClicks = 0;

    //1st click: exact +5 catnip, no serendipity
    bld.gatherCatnip();
    expect(catnip.value).toBe(5);

    //Subsequent click with fields & stage + serendipity roll for xiuwei
    bld.getBuildingExt("field").meta.val = 6;	//+3 catnip bonus
    game.cultivation.stages[1].researched = true;	//stIdx=1 -> +2 catnip bonus
    jest.spyOn(Math, "random").mockReturnValue(0.20);	//< 0.26 and >= 0.14 -> xiuwei boon
    bld.gatherCatnip();
    expect(catnip.value).toBe(5 + 10);	//5 base + 3 field + 2 stage = 10
    expect(xiuwei.value).toBeGreaterThan(0);
    bld.getBuildingExt("field").meta.val = 0;
    Math.random.mockRestore();
});

test("XianxiaArt generates SVG illustrations with Nano Banana artwork for hero portraits, tab scene banners, fate cards, resources, and buttons", () => {
    const fs = require("fs");
    const path = require("path");
    const expectedArtFiles = [
        "portrait_qi.jpg",
        "portrait_zhuji.jpg",
        "portrait_core.jpg",
        "portrait_yuanying.jpg",
        "portrait_immortal.jpg",
        "portrait_dacheng.jpg",
        "banner_cultivation.jpg",
        "banner_bonfire.jpg",
        "banner_science.jpg",
        "banner_workshop.jpg",
        "banner_trade.jpg",
        "banner_religion.jpg",
        "banner_spacetime.jpg",
        "banner_time.jpg",
        "fate_bottle.jpg",
        "fate_rift.jpg",
        "fate_companion.jpg",
        "fate_soul.jpg"
    ];
    for (const fileName of expectedArtFiles) {
        const resPath = path.join(__dirname, "..", "res", "art", fileName);
        const distPath = path.join(__dirname, "..", "dist", "res", "art", fileName);
        expect(fs.existsSync(resPath)).toBe(true);
        expect(fs.statSync(resPath).size).toBeGreaterThan(10000);
        expect(fs.existsSync(distPath)).toBe(true);
    }

    const art = classes.ui.XianxiaArt;
    expect(art).toBeDefined();
    expect(art.heroPortraitSVG("lianqi", "炼", "tian", false, 0, false)).toContain("res/art/portrait_qi.jpg");
    expect(art.heroPortraitSVG("zhuji", "筑", "tian", false, 0, false)).toContain("res/art/portrait_zhuji.jpg");
    expect(art.heroPortraitSVG("jiedan", "丹", "tian", true, 30, true)).toContain("res/art/portrait_core.jpg");
    expect(art.heroPortraitSVG("yuanying", "婴", "tian", true, 20, true)).toContain("res/art/portrait_yuanying.jpg");
    expect(art.heroPortraitSVG("huashen", "神", "tian", true, 10, true)).toContain("res/art/portrait_immortal.jpg");
    expect(art.heroPortraitSVG("dacheng", "乘", "tian", true, 0, true)).toContain("res/art/portrait_dacheng.jpg");
    expect(art.cultivationBgSVG("yuanying")).toContain("res/art/banner_cultivation.jpg");
    expect(art.cultivationBgSVG("huashen")).toContain("res/art/banner_spacetime.jpg");
    expect(art.cultivationBgSVG("dacheng")).toContain("res/art/banner_time.jpg");
    expect(art.tabBannerHTML("Bonfire", game)).toContain("res/art/banner_bonfire.jpg");
    expect(art.tabBannerHTML("Science", game)).toContain("res/art/banner_science.jpg");
    expect(art.tabBannerHTML("Workshop", game)).toContain("res/art/banner_workshop.jpg");
    expect(art.tabBannerHTML("Trade", game)).toContain("res/art/banner_trade.jpg");
    expect(art.tabBannerHTML("Religion", game)).toContain("res/art/banner_religion.jpg");
    expect(art.tabBannerHTML("Space", game)).toContain("res/art/banner_spacetime.jpg");
    expect(art.tabBannerHTML("Time", game)).toContain("res/art/banner_time.jpg");
    expect(art.fateArtSVG("bottle", null)).toContain("res/art/fate_bottle.jpg");
    expect(art.fateArtSVG("xutian", null)).toContain("res/art/fate_rift.jpg");
    expect(art.fateArtSVG("nangong", null)).toContain("res/art/fate_companion.jpg");
    expect(art.fateArtSVG("duoshi", null)).toContain("res/art/fate_soul.jpg");
    expect(art.fateArtSVG("death", "samsara")).toContain("res/art/banner_time.jpg");
    expect(art.originIcon("farmer")).toContain("res/art/origin_farmer.jpg");
    expect(art.actionArt("游")).toContain("res/art/act_wander.jpg");
    expect(art.tileIcon("bonus")).toContain("res/art/tile_bonus.jpg");
    expect(art.resIcon("xiuwei")).toContain("res/art/res_xiuwei.jpg");
    expect(art.resIcon("catnip")).toContain("res/art/res_catnip.jpg");
    expect(art.btnIcon({model: {metadata: {name: "field"}}})).toContain("res/art/res_catnip.jpg");
    expect(art.btnIcon({model: {metadata: {name: "hut"}}})).toContain("res/art/btn_cave.jpg");
    expect(art.btnIcon({model: {metadata: {name: "smelter"}}})).toContain("res/art/btn_furnace.jpg");
    expect(art.btnIcon({model: {metadata: {name: "vein1"}}})).toContain("res/art/btn_vein.jpg");
    expect(art.btnIcon({model: {metadata: {name: "sect1"}}})).toContain("res/art/btn_sect.jpg");
    expect(art.btnIcon({model: {metadata: {name: "lianqi_1"}}})).toContain("res/art/btn_realm.jpg");

    // Verify all 63 newly generated AI icon & monster assets exist and no geometric <path>/<polygon> primitives remain
    const allIconMaps = [art.ORIGIN_ART, art.ACTION_ART, art.TILE_ART, art.RES_ART, art.BTN_ART, art.MONSTER_ART, art.VFX_ART];
    for (const m of allIconMaps) {
        for (const k of Object.keys(m)) {
            const rel = m[k];
            const f1 = path.join(__dirname, "..", rel);
            const f2 = path.join(__dirname, "..", "dist", rel);
            expect(fs.existsSync(f1)).toBe(true);
            expect(fs.statSync(f1).size).toBeGreaterThan(1500);
            expect(fs.existsSync(f2)).toBe(true);
        }
    }
    expect(art.resIcon("xiuwei")).not.toMatch(/<path|<polygon|<circle|<rect/);
    expect(art.combatMonsterSVG("viper", true, true)).not.toMatch(/<path|<polygon|<circle|<rect/);
});

test("Building and technology names in zh.json use canonical Fanren Xiuxianzhuan terminology", () => {
    const zh = require("../res/i18n/zh.json");
    expect(zh["buildings.hut.label"]).toBe("神手竹庐");
    expect(zh["buildings.logHouse.label"]).toBe("太岳石室");
    expect(zh["buildings.mansion.label"]).toBe("天星洞府");
    expect(zh["buildings.biolab.label"]).toBe("百药园");
    expect(zh["buildings.smelter.label"]).toBe("地火炼器室");
    expect(zh["buildings.magneto.label"]).toBe("颠倒五行阵");
    expect(zh["buildings.reactor.label"]).toBe("乾蓝地火阵");
    expect(zh["buildings.accelerator.label"]).toBe("元磁极光阵");
    expect(zh["buildings.chronosphere.label"]).toBe("真言轮回盘");
    expect(zh["science.calendar.label"]).toBe("长春引气诀");
    expect(zh["science.archery.label"]).toBe("眨眼剑诀");
    expect(zh["science.mining.label"]).toBe("天眼望气术");
    expect(zh["science.physics.label"]).toBe("青元剑诀");
    expect(zh["science.electricity.label"]).toBe("辟邪神雷诀");
    expect(zh["science.biochemistry.label"]).toBe("三转重元功");
    expect(zh["science.metalurgy.label"]).toBe("大庚剑阵图");
    expect(zh["science.electronics.label"]).toBe("大衍神识决");
    expect(zh["science.particlePhysics.label"]).toBe("元磁神光诀");
    expect(zh["science.chronophysics.label"]).toBe("真言光阴诀");

    const legacyModernLabels = ["声学", "地质学", "建筑学", "生态学", "超导体", "宙光粒子论", "悖论理论"];
    for (const k of Object.keys(zh)) {
        if (k.startsWith("science.") && k.endsWith(".label")) {
            expect(legacyModernLabels).not.toContain(zh[k]);
        }
    }

    // Fine-grained descriptions include both Fanren lore and explicit single-resource breakdowns
    expect(zh["buildings.hut.desc"]).toContain("神手谷");
    expect(zh["buildings.hut.desc"]).toContain("【修为】");
    expect(zh["buildings.library.desc"]).toContain("【感悟】");
    expect(zh["buildings.library.desc"]).toContain("天衍星枢阁");
    expect(zh["buildings.smelter.desc"]).toContain("【金精】");
    expect(zh["buildings.smelter.desc"]).toContain("+0.008/跳");
    expect(zh["science.construction.effectDesc"]).toContain("太岳石室");
    expect(zh["science.construction.effectDesc"]).toContain("须弥宝库");
    expect(zh["science.construction.effectDesc"]).toContain("千竹炼木坊");
    expect(zh["workshop.crafts.alloy.desc"]).toContain("75 百炼钢 + 10 庚金");
    expect(zh["effectsMgr.statics.libraryRatio.title"]).toBe("藏经阁加成");
    expect(zh["effectsMgr.statics.lumberMillRatio.title"]).toBe("千竹炼木坊加成");
    expect(zh["effectsMgr.statics.magnetoBoostRatio.title"]).toBe("大衍机关枢对颠倒五行阵增幅");
});

//--------------------------------
//       Directions 1, 2, 3, 5 — Gameplay Expansion
//--------------------------------
test("Direction 2: New pills (jiangchen, peiying, biyan) and Bottle Dew catalysis work as designed", () => {
    const cult = game.cultivation;
    cult.getStage("jiedan_0").researched = true;
    cult.getStage("yuanying_0").researched = true;
    cult.getStage("huashen_0").researched = true;

    // jiangchen: +0.25 breakMult (up to 0.65) and buffs.jiangchen
    cult.getPill("jiangchen").val = 1;
    expect(cult.usePill("jiangchen")).toBe(true);
    expect(cult.breakMult).toBeCloseTo(0.25);
    expect(cult.buffs.jiangchen).toBe(1500);

    // peiying: clears post-breakthrough turbulence (lastBreakYear) and reduces heartDemon by 30
    cult.lastBreakYear = 10;
    cult.heartDemon = 50;
    cult.getPill("peiying").val = 1;
    expect(cult.usePill("peiying")).toBe(true);
    expect(cult.lastBreakYear).toBeNull();
    expect(cult.heartDemon).toBe(20);

    // biyan: buffs.biyan increases xiuweiRatio, realmProductionRatio, and combatPower
    const cpBefore = cult.getCombatPower();
    cult.getPill("biyan").val = 1;
    expect(cult.usePill("biyan")).toBe(true);
    expect(cult.buffs.biyan).toBe(1500);
    expect(cult.getCombatPower()).toBeGreaterThan(cpBefore);

    // Bottle Dew catalysis: consumes 1 dew and grants +2 highest unlocked pill + herbs/spice
    cult.getFate("bottle").researched = true;
    cult.bottleDew = 2;
    const biyanBefore = cult.getPill("biyan").val || 0;
    expect(cult.catalyzeDew()).toBe(true);
    expect(cult.bottleDew).toBe(1);
    expect(cult.getPill("biyan").val).toBe(biyanBefore + 2);
});

test("Direction 1: Auto-Stewardship unlocks by realm/fate and automatically executes pill/wander/rift/grift", () => {
    const cult = game.cultivation;
    expect(cult.isAnyStewardUnlocked()).toBe(false);

    cult.getStage("zhuji_0").researched = true;
    cult.getStage("jiedan_0").researched = true;
    cult.getStage("yuanying_0").researched = true;
    cult.getStage("huashen_0").researched = true;
    expect(cult.isStewardUnlocked("pill")).toBe(true);
    expect(cult.isStewardUnlocked("wander")).toBe(true);
    expect(cult.isStewardUnlocked("rift")).toBe(true);
    expect(cult.isStewardUnlocked("grift")).toBe(true);

    // Auto-pill when heartDemon >= DEMON_WARN_AT (40)
    cult.toggleSteward("pill");
    cult.heartDemon = 45;
    cult.getPill("qingxin").val = 1;
    cult.runAutoSteward();
    expect(cult.heartDemon).toBe(30);
    expect(cult.getPill("qingxin").val).toBe(0);

    // Auto-wander when actionCd == 0
    cult.toggleSteward("wander");
    cult.actionCd = 0;
    const wanderBefore = cult.stats.wander;
    cult.runAutoSteward();
    expect(cult.stats.wander).toBe(wanderBefore + 1);
});

test("Direction 3: Natal Artifact boosts effects/combatPower by 1.5x/+15% and Greater Rift generates 3-round battle report", () => {
    const cult = game.cultivation;
    cult.getStage("zhuji_0").researched = true;
    const art = cult.getArtifact("xuding");
    art.researched = true;
    art.rank = 2;
    art.effects = {};
    for (const k in art.baseEffects){ art.effects[k] = art.baseEffects[k] * art.rank; }

    const cpBase = cult.getCombatPower();
    game.globalEffectsCached = {};
    cult.updateEffectCached();
    const xwRatioBase = game.globalEffectsCached.xiuweiRatio;

    expect(cult.setNatalArtifact("xuding")).toBe(true);
    expect(cult.natalArtifact).toBe("xuding");
    expect(cult.getCombatPower()).toBeCloseTo(cpBase * 1.15);
    game.globalEffectsCached = {};
    cult.updateEffectCached();
    expect(game.globalEffectsCached.xiuweiRatio).toBeGreaterThan(xwRatioBase);

    // Greater Rift battle report
    cult.riftKeys = 1;
    cult.actionCd = 0;
    cult.greaterRift();
    expect(cult.lastBattleReport).toBeTruthy();
    expect(Array.isArray(cult.lastBattleReport.rounds)).toBe(true);
    expect(cult.lastBattleReport.rounds.length).toBe(3);
});

test("Direction 5: Reincarnation Legacy scales with past lives and Breakthrough triggers phenomenon & audio", () => {
    const cult = game.cultivation;
    cult.sihuaCount = 3;
    const leg = cult.getLegacyBonus();
    expect(leg.lives).toBe(3);
    expect(leg.xiuweiRatio).toBeCloseTo(0.24);
    expect(leg.combatMult).toBeCloseTo(1.30);
    expect(leg.chanceBonus).toBeCloseTo(0.06);

    const zhuji = cult.getStage("zhuji_0");
    cult.triggerBreakPhenomenon(zhuji);
    expect(cult.lastBreakPhenomenon).toBeTruthy();
    expect(cult.lastBreakPhenomenon.major).toBe(true);

    // Save/load roundtrip for new state fields
    const yanghun = cult.getArtifact("yanghun");
    yanghun.researched = true;
    yanghun.rank = 1;
    cult.bottleDew = 3;
    cult.natalArtifact = "yanghun";
    cult.soundMuted = true;
    cult.autoSteward.pill = true;
    const saveData = {};
    cult.save(saveData);

    cult.bottleDew = 0;
    cult.natalArtifact = null;
    cult.soundMuted = false;
    cult.autoSteward.pill = false;
    cult.load(saveData);
    expect(cult.bottleDew).toBe(3);
    expect(cult.natalArtifact).toBe("yanghun");
    expect(cult.soundMuted).toBe(true);
    expect(cult.autoSteward.pill).toBe(true);
});

test("Streamlined resource & crafting system directly removes 24 legacy resources and 16 legacy crafts down to 7 core xianxia craftables", () => {
    const activeCrafts = game.workshop.crafts.map(c => c.name);
    expect(activeCrafts).toEqual([
        "wood", "beam", "slab", "steel", "alloy", "eludium", "blueprint"
    ]);
    expect(game.workshop.zebraUpgrades.length).toBe(0);

    const visibleMainResources = game.resPool.resources.filter(r => r.visible !== false && !game.resPool.isNormalCraftableResource(r)).map(r => r.name);
    expect(visibleMainResources.length).toBe(20);

    const deletedResources = [
        "plate", "scaffold", "gear", "concrate", "megalith",
        "parchment", "manuscript", "compedium", "kerosene", "plastic",
        "microchip", "thorium", "ship", "tanker", "bloodstone",
        "tMythril", "furs", "ivory", "zebras", "elderBox",
        "wrappingPaper", "burnedParagon", "gflops", "hashrates"
    ];
    for (const r of game.resPool.resources) {
        expect(deletedResources.indexOf(r.name)).toBe(-1);
    }
    for (const b of game.bld.buildingsData) {
        if (b.prices) {
            for (const p of b.prices) {
                expect(deletedResources.indexOf(p.name)).toBe(-1);
            }
        }
    }
    for (const u of game.workshop.upgrades) {
        if (u.prices) {
            for (const p of u.prices) {
                expect(deletedResources.indexOf(p.name)).toBe(-1);
            }
        }
    }
});

test("Full-game balance invariants: zero storage cap deadlocks and monotonic cultivation vein/sect/realm curves", () => {
    const cult = game.cultivation;
    // 1. Early-to-mid realm curve invariants
    expect(cult.getStage("lianqi_1").prices[0].val).toBe(65);
    expect(cult.getStage("lianqi_4").prices.some(p => p.name === "wood" && p.val === 25)).toBe(true);
    expect(cult.getStage("lianqi_7").prices.some(p => p.name === "wood" && p.val === 112)).toBe(true);
    expect(cult.getStage("zhuji_0").prices.find(p => p.name === "xiuwei").val).toBe(3200);
    expect(cult.getStage("jiedan_0").prices.find(p => p.name === "xiuwei").val).toBe(18000);
    expect(cult.getStage("yuanying_0").prices.find(p => p.name === "xiuwei").val).toBe(72000);
    expect(cult.getStage("huashen_0").prices.find(p => p.name === "xiuwei").val).toBe(280000);

    // 2. Veins and sects scale monotonically across realms
    expect(cult.veins[0].prices.find(p => p.name === "xiuwei").val).toBeGreaterThanOrEqual(700);
    for (let i = 1; i < cult.veins.length; i++) {
        const prev = cult.veins[i - 1].prices.find(p => p.name === "xiuwei").val;
        const curr = cult.veins[i].prices.find(p => p.name === "xiuwei").val;
        expect(curr).toBeGreaterThan(prev);
    }
    for (let i = 1; i < cult.sects.length; i++) {
        const prev = cult.sects[i - 1].prices.find(p => p.name === "xiuwei").val;
        const curr = cult.sects[i].prices.find(p => p.name === "xiuwei").val;
        expect(curr).toBeGreaterThan(prev);
    }

    // 3. No science tech, workshop upgrade, or space mission/building is cap-locked at 20 of each building
    for (const b of game.bld.buildingsData) {
        b.unlocked = true; b.val = 20; b.on = 20;
        if (b.stages && b.stages.length > 1) b.stage = 1;
    }
    for (const u of game.workshop.upgrades) u.researched = true;
    for (const r of game.religion.religionUpgrades) { r.researched = true; r.val = 10; r.on = 10; }
    for (const pl of game.space.planets) {
        pl.reached = true; pl.unlocked = true;
        for (const sb of (pl.buildings || [])) { sb.unlocked = true; sb.val = 20; sb.on = 20; }
    }
    game.updateCaches();
    game.calculateAllEffects();
    game.resPool.updateMaxValueAll();

    const checkPricesAgainstCaps = (items) => {
        for (const it of items) {
            for (const p of (it.prices || [])) {
                const res = game.resPool.get(p.name);
                if (res && res.maxValue > 0) {
                    expect(p.val).toBeLessThanOrEqual(res.maxValue);
                }
            }
        }
    };
    checkPricesAgainstCaps(game.science.techs);
    checkPricesAgainstCaps(game.workshop.upgrades);
    checkPricesAgainstCaps(game.space.programs);
    for (const pl of game.space.planets) {
        checkPricesAgainstCaps(pl.buildings || []);
    }
});

test("Redesigned Spiritual Treasury (洞府灵库) categorizes all resources with high-contrast palette and eliminates duplicate/teleporting resource rows", () => {
    const validCategories = new Set(["dao", "material", "craft", "treasure"]);
    const activeRes = game.resPool.resources.filter(r => r.visible || r.craftable);
    expect(activeRes.length).toBe(26);

    for (const r of activeRes) {
        expect(validCategories.has(r.category)).toBe(true);
        expect(r.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }

    // Dao category contains the 5 core cultivation & comprehension essences
    const daoRes = activeRes.filter(r => r.category === "dao").map(r => r.name);
    expect(daoRes).toEqual(["science", "culture", "faith", "xiuwei", "starchart"]);

    // Material category contains the 10 gathered cave-heaven materials (including wood, which is never duplicated in craft table)
    const matRes = activeRes.filter(r => r.category === "material").map(r => r.name);
    expect(matRes).toEqual(["catnip", "wood", "minerals", "coal", "iron", "titanium", "gold", "oil", "uranium", "unobtainium"]);

    // Craft category contains the 6 workshop-refined materials (including blueprint, which stays in craft section instead of jumping tables)
    const craftRes = activeRes.filter(r => r.category === "craft").map(r => r.name);
    expect(craftRes).toEqual(["beam", "slab", "steel", "alloy", "eludium", "blueprint"]);
});


test("Secret Realm 3-step interactive expedition, tactical stances, Greater Rift law affixes, floor sweep, and Ancient Realm Seals", () => {
    const cult = game.cultivation;
    cult.getStage("zhuji_0").researched = true;
    cult.actionCd = 0;

    // 1. Tactical stances & law affix counter mechanics
    expect(cult.getRiftStance().key).toBe("sword");
    expect(cult.setRiftStance("array")).toBe(true);
    expect(cult.riftStance).toBe("array");
    // Floor 2 affix is "ward" (太古禁制), countered by "array" stance (+12% win chance)
    const oddsCountered = cult.getGriftOdds(2);
    expect(oddsCountered.countered).toBe(true);
    cult.setRiftStance("stealth");
    const oddsUncountered = cult.getGriftOdds(2);
    expect(oddsUncountered.countered).toBe(false);
    expect(oddsCountered.chance).toBeGreaterThan(oddsUncountered.chance);

    // 2. Entering Secret Realm launches a 3-step interactive expedition
    cult.actionCd = 0;
    expect(cult.rift()).toBe(true);
    expect(cult.expedition).toBeTruthy();
    expect(cult.expedition.active).toBe(true);
    expect(cult.expedition.step).toBe(1);
    expect(cult.expedition.maxSteps).toBe(3);
    expect(cult.expedition.nodes.length).toBe(3);
    expect(cult.expedition.nodes[2]).toBe("altar");

    // Step 1 -> Step 2 -> Step 3 -> Completion via chooseExpedition
    expect(cult.chooseExpedition("a")).toBe(true);
    expect(cult.expedition.step).toBe(2);
    expect(cult.chooseExpedition("b")).toBe(true);
    expect(cult.expedition.step).toBe(3);
    expect(cult.chooseExpedition("b")).toBe(true);
    expect(cult.expedition.active).toBe(false);
    expect(cult.expedition.loot.xiuwei).toBeGreaterThan(0);

    // Early safe extraction (见好就收) grants extra xiuwei & reduces heart demon
    cult.startExpedition();
    cult.heartDemon = 25;
    expect(cult.extractExpedition()).toBe(true);
    expect(cult.expedition.active).toBe(false);
    expect(cult.heartDemon).toBe(21);

    // 3. Greater Rift safe floor sweep (破界荡魔) & Ancient Realm Seals (玄天古印)
    cult.actionCd = 0;
    cult.riftFloor = 6;
    cult.riftKeys = 2;
    const relicsBefore = game.resPool.get("relic").value || 0;
    expect(cult.sweepRift()).toBe(true);
    expect(cult.riftKeys).toBe(1);
    expect(game.resPool.get("relic").value).toBeGreaterThan(relicsBefore);
    expect(cult.lastBattleReport.swept).toBe(true);

    const seals = cult.getRiftSealBonuses();
    expect(seals.unlocked).toBe(2); // Floors 3 and 6 unlocked
    expect(seals.xiuweiRatio).toBeCloseTo(0.15);
    expect(seals.realmProductionRatio).toBeCloseTo(0.15);
});


test("Redesigned Alchemy Cauldron: 3 fire modes, Dan Toxicity meridian balance, Supreme Vein Pills, Meridian Detox, and 5-tier Alchemy Mastery", () => {
    const cult = game.cultivation;
    cult.getStage("lianqi_2").researched = true;
    cult.getStage("zhuji_0").researched = true;
    cult.getStage("jiedan_0").researched = true;

    // 1. Cauldron Fire modes & refinePill (gentle / fierce / azure)
    expect(cult.getCauldronFire().key).toBe("gentle");
    expect(cult.setCauldronFire("fierce")).toBe(true);
    game.resPool.get("catnip").value = 5000;
    game.resPool.get("spice").value = 500;
    game.resPool.get("minerals").value = 5000;

    jest.spyOn(Math, "random").mockReturnValue(0.10); // triggers fierce double pill & azure supreme pill
    expect(cult.refinePill("juqi")).toBe(true);
    expect(cult.getPill("juqi").val).toBe(2); // fierce fire -> 2 pills from 1 batch!

    expect(cult.setCauldronFire("azure")).toBe(true);
    expect(cult.refinePill("juqi")).toBe(true);
    expect(cult.supremePills.juqi).toBe(1); // azure fire -> 1 Supreme Vein Pill (✦丹纹灵丹)!
    Math.random.mockRestore();

    // 2. Consuming Supreme Vein Pill grants 1.4x duration (2100 ticks) and 50% less toxicity
    expect(cult.usePill("juqi")).toBe(true);
    expect(cult.buffs.juqi).toBe(2100);
    expect(cult.buffs.juqiSupreme).toBe(2100);
    expect(cult.pillToxicity).toBe(9); // 18 * 0.5 = 9

    // 3. Dan Toxicity (丹毒) accumulation, meridian penalty, hard-block at >=90, and purging
    cult.pillToxicity = 92;
    const critTox = cult.getToxicityStatus();
    expect(critTox.tier).toBe("crit");
    expect(critTox.blocked).toBe(true);
    cult.getPill("zhujidan").val = 1;
    // Offensive pill is blocked when toxicity >= 90
    expect(cult.usePill("zhujidan")).toBe(false);

    // Cleansing pill (qingxin) is still allowed at >=90 toxicity and purges toxicity!
    cult.getPill("qingxin").val = 1;
    expect(cult.usePill("qingxin")).toBe(true);
    expect(cult.pillToxicity).toBe(74);

    // Active Meridian Detox (周天洗髓 · 运功逼毒) purges toxicity directly
    expect(cult.purgeToxicity()).toBe(true);
    expect(cult.pillToxicity).toBeLessThan(74);

    // 4. Realm Tolerance & 5-Tier Alchemy Mastery
    expect(cult.getPillRealmEfficacy("juqi")).toBeCloseTo(0.65); // Jiedan realm resistance on mundane juqi
    cult.alchemyExp = 85;
    const rank5 = cult.getAlchemyRank();
    expect(rank5.rank).toBe(5);
    expect(rank5.costMult).toBeCloseTo(0.75);
    expect(rank5.xiuweiRatio).toBeCloseTo(0.25);
});


test("Unified Realm-Module Interlock & One Key Resource per Major Realm (九境万法同源 · 一境一核心灵材)", () => {
    const cult = game.cultivation;
    const synergy = cult.getRealmSynergy();
    expect(synergy.length).toBe(9);

    // 1. Every Major Realm strictly uses 1 signature key resource (besides xiuwei) across all its sub-stages
    const expectedRealmRes = {
        lianqi: "wood",
        zhuji: "minerals",
        jiedan: "gold",
        yuanying: "science",
        huashen: "faith",
        lianxu: "unobtainium",
        heti: "relic",
        dacheng: "timeCrystal",
        dujie: "timeCrystal"
    };
    for (const st of cult.stages) {
        const expectedRes = expectedRealmRes[st.realm];
        expect(expectedRes).toBeDefined();
        for (const p of st.prices) {
            if (p.name !== "xiuwei") {
                expect(p.name).toBe(expectedRes);
            }
        }
    }

    // 2. Streamlined 17 core buildings and 8 realm signature resources
    expect(cult.getCoreBuildings().length).toBe(17);
    expect(cult.isCoreBuilding("field")).toBe(true);
    expect(cult.isCoreBuilding("chronosphere")).toBe(true);
    expect(cult.isCoreBuilding("ziggurat")).toBe(false);

    expect(cult.isCoreRealmResource("xiuwei")).toBe(true);
    expect(cult.isCoreRealmResource("wood")).toBe(true);
    expect(cult.isCoreRealmResource("minerals")).toBe(true);
    expect(cult.isCoreRealmResource("gold")).toBe(true);
    expect(cult.isCoreRealmResource("science")).toBe(true);
    expect(cult.isCoreRealmResource("faith")).toBe(true);
    expect(cult.isCoreRealmResource("unobtainium")).toBe(true);
    expect(cult.isCoreRealmResource("relic")).toBe(true);
    expect(cult.isCoreRealmResource("timeCrystal")).toBe(true);
    expect(cult.isCoreRealmResource("coal")).toBe(false);

    // 3. Realm gates interlock Buildings, Science Techs, and Hundred-Arts (Crafts & Upgrades)
    // At Lianqi (realmIdx = 0):
    expect(cult.getCurrentRealmIndex()).toBe(0);
    expect(cult.isItemRealmUnlocked("building", "field")).toBe(true);
    expect(cult.isItemRealmUnlocked("building", "mine")).toBe(false); // Requires Zhuji (idx 1)
    expect(cult.isItemRealmUnlocked("building", "smelter")).toBe(false); // Requires Jiedan (idx 2)
    expect(cult.isItemRealmUnlocked("tech", "calendar")).toBe(true);
    expect(cult.isItemRealmUnlocked("tech", "mining")).toBe(false); // Requires Zhuji
    expect(cult.isItemRealmUnlocked("craft", "wood")).toBe(true);
    expect(cult.isItemRealmUnlocked("craft", "beam")).toBe(false); // Requires Zhuji

    // 4. Advancing to Zhuji and Jiedan unlocks corresponding buildings, signature resources, and crafts via syncRealmUnlocks
    cult.getStage("zhuji_0").researched = true;
    cult.syncRealmUnlocks();
    expect(cult.getCurrentRealmIndex()).toBe(1);
    expect(cult.isItemRealmUnlocked("building", "mine")).toBe(true);
    expect(cult.isItemRealmUnlocked("tech", "mining")).toBe(true);
    expect(cult.isItemRealmUnlocked("craft", "beam")).toBe(true);
    expect(game.bld.get("mine").unlocked).toBe(true);
    expect(game.resPool.get("minerals").unlocked).toBe(true);

    cult.getStage("jiedan_0").researched = true;
    cult.syncRealmUnlocks();
    expect(cult.getCurrentRealmIndex()).toBe(2);
    expect(cult.isItemRealmUnlocked("building", "smelter")).toBe(true);
    expect(game.bld.get("smelter").unlocked).toBe(true);
    expect(game.resPool.get("gold").unlocked).toBe(true);

    // 5. Cross-module Realm Synergy Banner renders cleanly across tabs
    const bannerHtml = cult.renderRealmSynergyBanner("Bonfire");
    expect(bannerHtml).toContain("九境万法同源总纲");
    expect(bannerHtml).toContain("结丹期");
    expect(bannerHtml).toContain("金精");
});

test("Resource production & storage capacity rebalance: realmStorageRatio, core building *Max & *PerTickBase, and per-tick relic/timeCrystal", () => {
    const cult = game.cultivation;

    // 1. Coherent base storage caps in effectsBase
    expect(game.bld.effectsBase.catnipMax).toBe(2000);
    expect(game.bld.effectsBase.woodMax).toBe(500);
    expect(game.bld.effectsBase.mineralsMax).toBe(600);
    expect(game.bld.effectsBase.goldMax).toBe(200);
    expect(game.bld.effectsBase.titaniumMax).toBe(150);

    // 2. Early-realm core buildings have a single dedicated resource bonus and expand storage via getBuildingStorageBonus
    game.updateCaches();
    game.calculateAllEffects();
    expect(game.bld.get("hut").priceRatio).toBe(1.25);
    expect(game.bld.get("hut").effects.xiuweiPerTickBase).toBe(0.005);
    expect(game.bld.get("field").effects.catnipPerTickBase).toBe(0.12);
    expect(game.bld.get("workshop").effects.ironPerTickBase).toBe(0.018);
    expect(game.bld.get("barn").priceRatio).toBe(1.22);

    // 3. Realm breakthroughs grant realmStorageRatio that scales maxValue proportionally
    game.updateCaches();
    game.calculateAllEffects();
    game.resPool.updateMaxValueAll();
    const baseWoodMax = game.resPool.get("wood").maxValue;
    expect(baseWoodMax).toBe(500);

    cult.getStage("zhuji_0").researched = true;
    game.updateCaches();
    game.calculateAllEffects();
    game.resPool.updateMaxValueAll();
    expect(game.getEffect("realmStorageRatio")).toBeGreaterThan(0);
    expect(game.resPool.get("wood").maxValue).toBeGreaterThan(baseWoodMax);

    // 4. Late-game core buildings produce and store their realm's signature resources (oil, uranium, unobtainium, relic, timeCrystal)
    expect(game.resPool.get("relic").calculatePerTick).toBe(true);
    expect(game.resPool.get("timeCrystal").calculatePerTick).toBe(true);

    const biolab = game.bld.get("biolab");
    biolab.unlocked = true; biolab.val = 2; biolab.on = 2;
    const magneto = game.bld.get("magneto");
    magneto.unlocked = true; magneto.val = 2; magneto.on = 2;
    const reactor = game.bld.get("reactor");
    reactor.unlocked = true; reactor.val = 2; reactor.on = 2;
    const accel = game.bld.get("accelerator");
    accel.unlocked = true; accel.val = 2; accel.on = 2;
    const chrono = game.bld.get("chronosphere");
    chrono.unlocked = true; chrono.val = 2; chrono.on = 2;

    game.updateCaches();
    game.calculateAllEffects();
    game.resPool.updateMaxValueAll();

    expect(game.calcResourcePerTick("oil")).toBeGreaterThan(0);
    expect(game.calcResourcePerTick("uranium")).toBeGreaterThan(0);
    expect(game.calcResourcePerTick("unobtainium")).toBeGreaterThan(0);
    expect(game.calcResourcePerTick("relic")).toBeGreaterThan(0);
    expect(game.calcResourcePerTick("timeCrystal")).toBeGreaterThan(0);
});

test("Hidden realm xiuwei soft-cap: untouched below knee, smoothly decays toward zero above knee, and restores on breakthrough without displaying maxValue", () => {
    const cult = game.cultivation;
    cult.spiritRoot = "san"; // neutral priceMult = 1.0
    const xwRes = game.resPool.get("xiuwei");
    const hut = game.bld.get("hut");
    hut.unlocked = true; hut.val = 5; hut.on = 5;
    game.updateCaches();
    game.calculateAllEffects();
    game.resPool.updateMaxValueAll();
    game.updateResources();

    // 1. xiuwei.maxValue must remain 0 so the UI never displays a visible cap number
    expect(xwRes.maxValue).toBe(0);

    // 2. Below current stage knee (lianqi_1 floor knee >= 200), growth speed is 100% (mult = 1.0)
    const knee0 = cult.getXiuweiSoftCapKnee();
    expect(knee0).toBeGreaterThanOrEqual(200);
    xwRes.value = 100;
    expect(cult.getXiuweiSoftCapMult()).toBe(1);
    const fullRate = game.calcResourcePerTick("xiuwei");
    expect(fullRate).toBeGreaterThan(0);

    xwRes.value = knee0;
    expect(cult.getXiuweiSoftCapMult()).toBe(1);
    expect(game.calcResourcePerTick("xiuwei")).toBeCloseTo(fullRate, 8);

    // 3. Above knee, growth speed smoothly and strictly monotonically decays toward 0
    xwRes.value = knee0 * 1.5;
    const rate15 = game.calcResourcePerTick("xiuwei");
    expect(rate15).toBeLessThan(fullRate);
    expect(rate15).toBeGreaterThan(0);

    xwRes.value = knee0 * 3;
    const rate30 = game.calcResourcePerTick("xiuwei");
    expect(rate30).toBeLessThan(rate15);
    expect(rate30).toBeGreaterThan(0);

    xwRes.value = knee0 * 10;
    const rate100 = game.calcResourcePerTick("xiuwei");
    expect(rate100).toBeLessThan(rate30);
    expect(rate100).toBeLessThan(fullRate * 0.03);
    expect(rate100).toBeGreaterThan(0);

    // Active payouts (applyXiuweiSoftCap) also decay when above the knee
    expect(cult.applyXiuweiSoftCap(100)).toBeLessThan(10);

    // 4. Breaking through to a higher stage/realm raises the hidden knee and restores 100% speed
    cult.getStage("zhuji_0").researched = true;
    const kneeZhuji = cult.getXiuweiSoftCapKnee();
    expect(kneeZhuji).toBeGreaterThan(xwRes.value);
    expect(cult.getXiuweiSoftCapMult()).toBe(1);
    expect(game.calcResourcePerTick("xiuwei")).toBeCloseTo(fullRate, 8);
    game.calculateAllEffects();
    expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(fullRate);
    expect(xwRes.maxValue).toBe(0);
});

test("Commercial minimalist UI: no mode toggles, no synergy banners, automatic hiding of researched techs/upgrades, and clean button labels", () => {
    const cult = game.cultivation;
    cult.getStage("zhuji_0").researched = true;
    cult.syncRealmUnlocks();

    // 1. Unlocked buildings, techs, upgrades, and crafts have clean names without redundant [XX境] tags
    const bldCtrl = new com.nuclearunicorn.game.ui.BuildingStackableBtnController(game);
    const fieldName = bldCtrl.getName({metadata: game.bld.get("field"), name: "百亩灵田"});
    expect(fieldName).not.toContain("xxRealmGateBadge ok");

    const techCtrl = new com.nuclearunicorn.game.ui.TechButtonController(game);
    const calTech = game.science.get("calendar");
    expect(techCtrl.getName({metadata: calTech, name: calTech.label})).not.toContain("xxRealmGateBadge ok");

    // 2. Researched techs and upgrades automatically hide without needing a manual checkbox toggle
    calTech.unlocked = true;
    calTech.researched = true;
    const techModel = {metadata: calTech, visible: true};
    techCtrl.updateVisible(techModel);
    expect(techModel.visible).toBe(false);

    const upgCtrl = new com.nuclearunicorn.game.ui.UpgradeButtonController(game);
    const hoes = game.workshop.get("mineralHoes");
    hoes.unlocked = true;
    hoes.researched = true;
    const upgModel = {metadata: hoes, visible: true};
    upgCtrl.updateVisible(upgModel);
    expect(upgModel.visible).toBe(false);
});

test("Turn-Based Combat System: Lesser Rift 3-wave gauntlet, Greater Rift Boss battles, 4 tactical skills, and monster mechanical traits", () => {
    const cult = game.cultivation;
    cult.getStage("zhuji_0").researched = true;
    cult.actionCd = 0;

    // 1. Entering Lesser Rift initializes an active 3-wave turn-based battle
    expect(cult.rift()).toBe(true);
    expect(cult.battle).toBeTruthy();
    expect(cult.battle.active).toBe(true);
    expect(cult.battle.mode).toBe("lesser");
    expect(cult.battle.wave).toBe(1);
    expect(cult.battle.maxWaves).toBe(3);

    // 2. Test Puppet (铁甲尸傀) heavy armor shield & 青元剑阵 (skill) 2.5x shield shatter + expose backlash
    cult.battle.enemy = cult.spawnBattleMonster("lesser", 1, ["puppet", "wraith", "bloodcult"]);
    expect(cult.battle.enemy.key).toBe("puppet");
    expect(cult.battle.enemy.shield).toBeGreaterThan(0);
    cult.battle.player.atk = 500; // guarantee shield shatter without instant kill
    cult.battle.enemy.hp = 2000;
    cult.battle.enemy.maxHp = 2000;
    cult.battle.enemy.shield = 300;
    expect(cult.executeBattleTurn("skill")).toBe(true);
    expect(cult.battle.enemy.shield).toBe(0);
    expect(cult.battle.enemy.armorBreak).toBeGreaterThan(0);
    expect(cult.battle.enemy.expose).toBeGreaterThan(0);

    // 3. Test 玄水灵盾 (guard) triggering 【太极反震】 when monster executes heavy attack (蓄力杀招)
    cult.battle.enemy.hp = 2000;
    cult.battle.enemy.intent = "heavy";
    const enemyHpBeforeCounter = cult.battle.enemy.hp;
    expect(cult.executeBattleTurn("guard")).toBe(true);
    expect(cult.battle.enemy.hp).toBeLessThan(enemyHpBeforeCounter);
    expect(cult.battle.logs[0]).toContain("太极反震");

    // 4. Test 法宝镇压 (ult) cleansing Viper poison (蛇毒) & healing player
    cult.battle.player.poison = 2;
    cult.battle.player.chill = 2;
    cult.battle.player.hp = Math.floor(cult.battle.player.maxHp * 0.5);
    cult.battle.player.mp = 80;
    const hpBeforeUlt = cult.battle.player.hp;
    expect(cult.executeBattleTurn("ult")).toBe(true);
    expect(cult.battle.player.poison).toBe(0);
    expect(cult.battle.player.chill).toBe(0);
    expect(cult.battle.player.hp).toBeGreaterThan(hpBeforeUlt);

    // 5. Auto-resolve completes all 3 waves of Lesser Rift and grants rewards
    cult.battle.player.atk = 9999;
    expect(cult.autoResolveBattle()).toBe(true);
    expect(cult.battle.active).toBe(false);
    expect(cult.battle.result).toBe("win");
    expect(cult.battle.loot.relic).toBeGreaterThanOrEqual(1);

    // 6. Greater Rift Turn-Based Boss Battle advances riftFloor on victory
    cult.actionCd = 0;
    cult.riftKeys = 2;
    const floorBefore = cult.riftFloor;
    expect(cult.startRiftBattle("greater")).toBe(true);
    expect(cult.battle.active).toBe(true);
    expect(cult.battle.mode).toBe("greater");
    expect(cult.battle.floor).toBe(floorBefore + 1);
    cult.battle.player.atk = 99999;
    expect(cult.autoResolveBattle()).toBe(true);
    expect(cult.battle.active).toBe(false);
    expect(cult.battle.result).toBe("win");
    expect(cult.riftFloor).toBe(floorBefore + 1);

    // 7. Visual Sprites (combatPlayerSVG, combatMonsterSVG for all 11 monsters/bosses, combatVfxSVG) & Melvor/MilkyWay smooth auto-flow
    const art = classes.ui.XianxiaArt;
    expect(art.combatPlayerSVG("zhuji", true, true)).toContain("xx-combat-avatar-svg player");
    const allMonsterKeys = [
        "viper", "puppet", "wraith", "mantis", "frostwyrm", "bloodcult",
        "mojiaowang", "jinjia", "yinlang", "gumo", "zhenxian"
    ];
    for (const mk of allMonsterKeys) {
        const mSvg = art.combatMonsterSVG(mk, true, true);
        expect(mSvg).toContain("xx-combat-avatar-svg enemy " + mk);
        expect(mSvg).toContain("xx-svg-monster-body");
        expect(mSvg).toContain("res/art/monster_" + mk + ".jpg");
    }
    expect(art.combatVfxSVG("strike")).toContain("res/art/vfx_strike.jpg");
    expect(art.combatVfxSVG("skill")).toContain("res/art/vfx_skill.jpg");
    expect(art.combatVfxSVG("guard")).toContain("res/art/vfx_guard.jpg");
    expect(art.combatVfxSVG("ult")).toContain("res/art/vfx_ult.jpg");

    // Verify smooth auto-flow castTick progression across game.cultivation.update()
    cult.actionCd = 0;
    expect(cult.rift()).toBe(true);
    expect(cult.battle.autoFlow).toBe(true);
    expect(cult.battle.castTick).toBe(0);
    const turnBefore = cult.battle.turn;
    for (let t = 0; t < cult.battle.castMax; t++) {
        cult.update();
    }
    expect(cult.battle.turn).toBeGreaterThan(turnBefore);
    expect(cult.battle.animSeq).toBeGreaterThan(0);
    expect(cult.battle.lastEvent).toBeTruthy();
});

test("Mortal Phase (凡人状态): initial xiuwei growth speed is strictly 0, Mortal UI banner & tags highlight mortal state, and building 神手竹庐 awakens Qi Refining", () => {
    const cult = game.cultivation;
    game.updateCaches();
    game.calculateAllEffects();

    // 1. Fresh game starts in Mortal state with 0 xiuwei and 0 xiuwei growth speed
    expect(cult.isMortal()).toBe(true);
    expect(game.resPool.get("xiuwei").value).toBe(0);
    expect(game.getEffect("xiuweiPerTickBase")).toBe(0);
    expect(game.calcResourcePerTick("xiuwei")).toBe(0);

    // 2. Gathering herbs, building herb fields (灵田), and refining wood keep player in Mortal state with 0 xiuwei/s
    game.bld.gatherCatnip();
    const field = game.bld.get("field");
    field.unlocked = true; field.val = 3; field.on = 3;
    game.resPool.get("wood").value = 2;
    game.updateCaches();
    game.calculateAllEffects();
    expect(cult.isMortal()).toBe(true);
    expect(game.getEffect("xiuweiPerTickBase")).toBe(0);
    expect(game.calcResourcePerTick("xiuwei")).toBe(0);

    // 3. Mortal status & banner highlight the Mortal phase and 4-step awakening track
    const mortalSt = cult.getMortalStatus();
    expect(mortalSt.isMortal).toBe(true);
    expect(mortalSt.step).toBe(3); // wood >= 1 -> step 3
    const bannerHtml = cult.renderMortalBanner();
    expect(bannerHtml).toContain("xx-mortal-banner");
    expect(bannerHtml).toContain("xx-mortal-track");

    const ctrl = new classes.ui.RealmBtnController(game);
    const lianqi0BtnHtml = ctrl.getName({metadata: cult.getStage("lianqi_0")});
    expect(lianqi0BtnHtml).toContain("xx-mortal-tag");

    // 4. Building 神手竹庐 (hut) awakens spiritual qi (引气入体), exits Mortal state, and starts passive xiuwei growth
    const hut = game.bld.get("hut");
    hut.unlocked = true; hut.val = 1; hut.on = 1;
    game.updateCaches();
    game.calculateAllEffects();
    expect(cult.isMortal()).toBe(false);
    expect(cult.renderMortalBanner()).toBe("");
    expect(game.getEffect("xiuweiPerTickBase")).toBeCloseTo(0.005);
    expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(0);
    expect(ctrl.getName({metadata: cult.getStage("lianqi_0")})).not.toContain("xx-mortal-tag");
});

test("Full-system resource integrity & unobstructed progression route: zero references to deleted/hidden resources and 100% reachable realm-by-realm progression", () => {
    const activeResSet = new Set(
        game.resPool.resources.filter(r => r.visible || r.craftable).map(r => r.name)
    );
    expect(activeResSet.size).toBe(26);

    // 1. Every price across all game systems only references the 26 active visible/craftable resources
    const assertPricesValid = (items) => {
        for (const it of (items || [])) {
            const prices = it.prices || (it.stages && it.stages[0].prices) || [];
            for (const p of prices) {
                expect(activeResSet.has(p.name)).toBe(true);
            }
            if (it.fixPrices) {
                for (const p of it.fixPrices) {
                    expect(activeResSet.has(p.name)).toBe(true);
                }
            }
        }
    };
    assertPricesValid(game.bld.buildingsData);
    assertPricesValid(game.science.techs);
    assertPricesValid(game.workshop.upgrades);
    assertPricesValid(game.workshop.crafts);
    assertPricesValid(game.cultivation.stages);
    assertPricesValid(game.cultivation.pills);
    assertPricesValid(game.cultivation.veins);
    assertPricesValid(game.cultivation.sects);
    assertPricesValid(game.space.programs);
    for (const pl of game.space.planets) {
        assertPricesValid(pl.buildings);
    }
    assertPricesValid(game.religion.religionUpgrades);
    assertPricesValid(game.religion.zigguratUpgrades);
    assertPricesValid(game.religion.transcendenceUpgrades);
    assertPricesValid(game.time.chronoforgeUpgrades);
    assertPricesValid(game.time.voidspaceUpgrades);

    // 2. Every REALM_SYNERGY entry resolves to an existing resource, building, tech, craft, or upgrade
    for (const syn of game.cultivation.REALM_SYNERGY) {
        expect(activeResSet.has(syn.res)).toBe(true);
        for (const bName of syn.coreBlds) {
            expect(game.bld.get(bName)).toBeTruthy();
        }
        for (const bName of syn.auxBlds) {
            expect(game.bld.get(bName)).toBeTruthy();
        }
        for (const tName of syn.techs) {
            expect(game.science.get(tName)).toBeTruthy();
        }
        for (const cName of syn.crafts) {
            expect(game.workshop.getCraft(cName)).toBeTruthy();
        }
        for (const uName of syn.upgrades) {
            expect(game.workshop.get(uName)).toBeTruthy();
        }
    }

    // 3. End-to-end realm-by-realm progression simulation (Lianqi -> Dujie): zero deadlocks
    const realms = ["lianqi", "zhuji", "jiedan", "yuanying", "huashen", "lianxu", "heti", "dacheng", "dujie"];
    for (let r = 0; r < realms.length; r++) {
        game.resetState();
        for (const st of game.cultivation.stages) {
            if (realms.indexOf(st.realm) <= r) {
                st.researched = true;
            }
        }
        game.cultivation.syncRealmUnlocks();

        let changed = true;
        while (changed) {
            changed = false;
            for (const b of game.bld.buildingsData) {
                if (game.cultivation.isItemRealmUnlocked("building", b.name)) {
                    const gate = game.cultivation.getItemRealmGate("building", b.name);
                    if ((gate.isCore || b.unlocked) && b.val === 0) {
                        b.unlocked = true; b.val = 5; b.on = 5;
                        if (b.unlocks) game.unlock(b.unlocks);
                        changed = true;
                    }
                }
            }
            for (const t of game.science.techs) {
                if (t.unlocked && !t.researched && game.cultivation.isItemRealmUnlocked("tech", t.name)) {
                    t.researched = true;
                    if (t.unlocks) game.unlock(t.unlocks);
                    changed = true;
                }
            }
            for (const u of game.workshop.upgrades) {
                if (u.unlocked && !u.researched && game.cultivation.isItemRealmUnlocked("upgrade", u.name)) {
                    u.researched = true;
                    if (u.unlocks) game.unlock(u.unlocks);
                    changed = true;
                }
            }
        }

        game.updateCaches();
        game.calculateAllEffects();
        game.resPool.updateMaxValueAll();
        for (let i = 0; i < 5; i++) game.update();

        const prodRes = new Set();
        for (const res of game.resPool.resources) {
            if (game.calcResourcePerTick(res.name) > 0 || res.value > 0) {
                prodRes.add(res.name);
            }
        }
        prodRes.add("spice"); // bottle fate & wander

        let craftAdded = true;
        while (craftAdded) {
            craftAdded = false;
            for (const cr of game.workshop.crafts) {
                if (cr.unlocked && game.cultivation.isItemRealmUnlocked("craft", cr.name) && !prodRes.has(cr.name)) {
                    if (cr.prices.every(p => prodRes.has(p.name))) {
                        prodRes.add(cr.name);
                        craftAdded = true;
                    }
                }
            }
        }

        const syn = game.cultivation.REALM_SYNERGY[r];
        // All stages in current realm r and the breakthrough stage into realm r+1 must only require producible resources
        for (const st of game.cultivation.stages.filter(s => s.realm === realms[r])) {
            for (const p of (st.prices || [])) {
                expect(prodRes.has(p.name)).toBe(true);
            }
        }
        if (r + 1 < realms.length) {
            const nextStage0 = game.cultivation.getStage(realms[r + 1] + "_0");
            for (const p of (nextStage0.prices || [])) {
                expect(prodRes.has(p.name)).toBe(true);
            }
        }
        // All core buildings, crafts, techs, and upgrades in realm r must only require producible resources
        for (const bName of syn.coreBlds) {
            const b = game.bld.get(bName);
            const prices = b.prices || (b.stages && b.stages[0].prices) || [];
            for (const p of prices) {
                expect(prodRes.has(p.name)).toBe(true);
            }
        }
        for (const cName of syn.crafts) {
            const cr = game.workshop.getCraft(cName);
            for (const p of (cr.prices || [])) {
                expect(prodRes.has(p.name)).toBe(true);
            }
        }
        for (const tName of syn.techs) {
            const t = game.science.get(tName);
            for (const p of (t.prices || [])) {
                expect(prodRes.has(p.name)).toBe(true);
            }
        }
        for (const uName of syn.upgrades) {
            const u = game.workshop.get(uName);
            for (const p of (u.prices || [])) {
                expect(prodRes.has(p.name)).toBe(true);
            }
        }
    }
});

test("Differentiated Origins (buffs + debuffs) and Lore-Accurate Spirit Roots (multi-root higher breakthrough cost & higher same-realm combat power)", () => {
    const cult = game.cultivation;
    const ctrl = new classes.ui.RealmBtnController(game);
    cult.getStage("zhuji_0").researched = true;

    // 1. Spirit Roots: multi-element roots (wei > san > zhen > yi > tian) have higher breakthrough cost AND higher same-realm combat power, while cultivating slower
    const rootOrder = ["wei", "san", "zhen", "yi", "tian"];
    for (let i = 0; i < rootOrder.length - 1; i++) {
        cult.spiritRoot = rootOrder[i];
        const rMore = cult.getRoot();
        const cpMore = cult.getCombatPower();
        const costMore = cult.getBreakCostMult();

        cult.spiritRoot = rootOrder[i + 1];
        const rFewer = cult.getRoot();
        const cpFewer = cult.getCombatPower();
        const costFewer = cult.getBreakCostMult();

        expect(rMore.xiuweiMult).toBeLessThan(rFewer.xiuweiMult);
        expect(costMore).toBeGreaterThan(costFewer);
        expect(cpMore).toBeGreaterThan(cpFewer);
    }

    // 2. Every Origin has both positive buffs and negative debuffs across resources, lifespan, combat power, breakthrough chance, or breakthrough cost
    cult.spiritRoot = "zhen"; // baseline 1.0x priceMult, 1.0x combatMult
    const baseCp = cult.getCombatPower();
    const baseLife = cult.getLifespan(); // 200 in zhuji
    const jiedan0 = cult.getStage("jiedan_0");
    const baseChance = cult.getBreakChance(jiedan0);
    const baseBreakCost = ctrl.getPrices({metadata: jiedan0})[0].val;

    // Farmer: +25% catnip, +15% wood, +15% lifespan | -10% science, -10% combatPower
    cult.setIdentity("韩立", "m", "farmer");
    game.updateCaches();
    game.calculateAllEffects();
    expect(cult.effectsBase.catnipRatio).toBeCloseTo(0.25);
    expect(cult.effectsBase.woodRatio).toBeCloseTo(0.15);
    expect(cult.effectsBase.scienceRatio).toBeCloseTo(-0.10);
    expect(cult.getLifespan()).toBe(Math.round(baseLife * 1.15));
    expect(cult.getCombatPower()).toBeCloseTo(baseCp * 0.90);

    // Hunter: +20% combatPower, +25% hunterRatio, +15% ironRatio | -10% xiuweiRatio, -4% breakChance
    cult.setIdentity("韩立", "m", "hunter");
    expect(cult.effectsBase.hunterRatio).toBeCloseTo(0.25);
    expect(cult.effectsBase.ironRatio).toBeCloseTo(0.15);
    expect(cult.effectsBase.xiuweiRatio).toBeCloseTo(-0.10);
    expect(cult.getCombatPower()).toBeCloseTo(baseCp * 1.20);
    expect(cult.getBreakChance(jiedan0)).toBeCloseTo(baseChance - 0.04);

    // Scholar: +25% science, +15% xiuwei, +4% breakChance | -12% combatPower, -10% minerals
    cult.setIdentity("韩立", "m", "scholar");
    expect(cult.effectsBase.scienceRatio).toBeCloseTo(0.25);
    expect(cult.effectsBase.xiuweiRatio).toBeCloseTo(0.15);
    expect(cult.effectsBase.mineralsRatio).toBeCloseTo(-0.10);
    expect(cult.getBreakChance(jiedan0)).toBeCloseTo(baseChance + 0.04);
    expect(cult.getCombatPower()).toBeCloseTo(baseCp * 0.88);

    // Trader: +25% minerals, +20% gold, -10% breakCost | -10% xiuwei, -8% combatPower
    cult.setIdentity("韩立", "m", "trader");
    expect(cult.effectsBase.mineralsRatio).toBeCloseTo(0.25);
    expect(cult.effectsBase.goldRatio).toBeCloseTo(0.20);
    expect(cult.effectsBase.xiuweiRatio).toBeCloseTo(-0.10);
    expect(cult.getCombatPower()).toBeCloseTo(baseCp * 0.92);
    expect(ctrl.getPrices({metadata: jiedan0})[0].val).toBeCloseTo(baseBreakCost * 0.90);

    // Orphan: +8% breakChance, +12% combatPower, +8% xiuwei | +10% breakCost, -10% realmProductionRatio
    cult.setIdentity("韩立", "m", "orphan");
    expect(cult.effectsBase.xiuweiRatio).toBeCloseTo(0.08);
    expect(cult.effectsBase.realmProductionRatio).toBeCloseTo(-0.10);
    expect(cult.getBreakChance(jiedan0)).toBeCloseTo(baseChance + 0.08);
    expect(cult.getCombatPower()).toBeCloseTo(baseCp * 1.12);
    expect(ctrl.getPrices({metadata: jiedan0})[0].val).toBeCloseTo(baseBreakCost * 1.10);
});

test("Strict 1-to-1 Building-to-Resource Bonus Bijection: each building has at most 1 resource bonus and each resource has at most 1 building bonus", () => {
    game.updateCaches();
    game.calculateAllEffects();

    const expectedBijection = {
        field: "catnipPerTickBase",
        hut: "xiuweiPerTickBase",
        library: "sciencePerTickBase",
        logHouse: "woodPerTickBase",
        mine: "mineralsPerTickBase",
        workshop: "ironPerTickBase",
        smelter: "goldPerTickBase",
        academy: "coalPerTickBase",
        barn: "culturePerTickBase",
        mansion: "titaniumPerTickBase",
        observatory: "starchartPerTickBase",
        temple: "faithPerTickBase",
        biolab: "oilPerTickBase",
        reactor: "unobtainiumPerTickBase",
        magneto: "uraniumPerTickBase",
        accelerator: "relicPerTickBase",
        chronosphere: "timeCrystalPerTickBase"
    };

    const seenEffectKeys = new Map();
    for (const b of game.bld.buildingsData) {
        const keys = Object.keys(b.effects || {});
        expect(keys.length).toBeLessThanOrEqual(1);
        if (b.stages) {
            for (const st of b.stages) {
                expect(Object.keys(st.effects || {}).length).toBeLessThanOrEqual(1);
            }
        }
        if (expectedBijection[b.name]) {
            expect(keys).toEqual([expectedBijection[b.name]]);
            expect(b.effects[keys[0]]).toBeGreaterThan(0);
            expect(seenEffectKeys.has(keys[0])).toBe(false);
            seenEffectKeys.set(keys[0], b.name);
        } else {
            expect(keys.length).toBe(0);
        }
    }
    expect(seenEffectKeys.size).toBe(17);
});









