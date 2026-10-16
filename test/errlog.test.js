/* global

    test,
    expect,
    game
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
    jest.spyOn(global.console, "error").mockImplementation(() => jest.fn());
});

afterEach(() => {
    jest.clearAllMocks();
});

test("captureError records message/stack/ticks/build", () => {
    game.ticks = 42;
    game.captureError(new Error("boom"), "tick");

    expect(game._errLog.length).toBe(1);
    let entry = game._errLog[0];
    expect(entry.msg).toBe("boom");
    expect(entry.ctx).toBe("tick");
    expect(entry.ticks).toBe(42);
    expect(entry.stack).toContain("boom");
    expect(entry.count).toBe(1);
    expect(entry.t).toBeTruthy();
});

test("consecutive identical errors fold into count, distinct errors append", () => {
    for (let i = 0; i < 5; i++){
        game.captureError(new Error("same crash"), "tick");
    }
    game.captureError(new Error("different"), "tick");
    game.captureError(new Error("same crash"), "tick");

    expect(game._errLog.length).toBe(3);
    expect(game._errLog[0].count).toBe(5);
    expect(game._errLog[1].msg).toBe("different");
    expect(game._errLog[2].msg).toBe("same crash");
});

test("error ring is bounded at 50 entries", () => {
    for (let i = 0; i < 80; i++){
        game.captureError(new Error("err" + i), "tick");
    }
    expect(game._errLog.length).toBe(50);
    //oldest entries were evicted
    expect(game._errLog[0].msg).toBe("err30");
    expect(game._errLog[49].msg).toBe("err79");
});

test("a throwing update() does not kill the tick loop", () => {
    const realUpdate = game.update.bind(game);
    let calls = 0;
    game.update = () => {
        calls++;
        if (calls == 1){ throw new Error("update exploded"); }
        realUpdate();
    };

    game.tick();        //first tick: update throws, captured, ticks still advance
    expect(game.ticks).toBe(1);
    expect(game._errLog.length).toBe(1);
    expect(game._errLog[0].ctx).toBe("tick");

    game.tick();        //second tick: healthy again, folded count
    expect(game.ticks).toBe(2);
    expect(game._errLog.length).toBe(1);
});

test("repeated crashing update keeps ticking and folds errors", () => {
    game.update = () => { throw new Error("always broken"); };
    for (let i = 0; i < 10; i++){
        game.tick();
    }
    expect(game.ticks).toBe(10);
    expect(game._errLog.length).toBe(1);
    expect(game._errLog[0].count).toBe(10);
});

test("buildDebugBundle carries save + errors + metadata", () => {
    game.ticks = 7;
    game.captureError(new Error("test crash"), "tick");

    let bundle = game.buildDebugBundle();
    expect(bundle.app).toBe("xianxia-game");
    expect(bundle.ticks).toBe(7);
    expect(bundle.errors.length).toBe(1);
    expect(bundle.errors[0].msg).toBe("test crash");
    expect(bundle.save).toBeTruthy();
    expect(typeof bundle.exportedAt).toBe("string");

    //embedded save must decompress back to a valid save object
    let restored = JSON.parse(game.decompressLZData(bundle.save));
    expect(restored).toBeTruthy();
    expect(restored.calendar).toBeTruthy();
});

test("buildDebugBundle works with an empty error log", () => {
    let bundle = game.buildDebugBundle();
    expect(bundle.errors).toEqual([]);
    expect(bundle.save).toBeTruthy();
});
