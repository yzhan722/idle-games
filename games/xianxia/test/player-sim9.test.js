/* global test, expect, game, describe, beforeEach */
const rich = (g) => { for (const r of g.resPool.resources) r.value = 1e9; };
const reachAll = (g) => { for (const s of g.cultivation.stages) s.researched = true; };
describe("render stress", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});
	test("render+update at full cultivation end-state", () => {
		const c = game.cultivation;
		reachAll(game);
		c.riftFloor = 30; c.riftKeys = 5; c.heartDemon = 60; c.age = 30;
		c.buffs.juqi = 100; c.buffs.ziqi = 50;
		c.taleLog = [{f:"zhangtie",c:"trace",a:5,r:0},{f:"xutian",c:"tihun",a:900,r:6}];
		c.artifacts[0].researched = true; c.artifacts[0].rank = 3;
		for (const v of c.veins) v.researched = true;
		for (const s of c.sects) s.researched = true;
		for (const f of c.fates) f.researched = true;
		expect(() => { game.update(); game.render(); }).not.toThrow();
		for (let i = 0; i < 300; i++) game.update();
	});
	test("render+update mid-wander pendingTrip", () => {
		const c = game.cultivation;
		c.pendingTrip = "wander"; c.actionCd = 100; c.actionCdMax = 600;
		expect(() => { game.update(); game.render(); }).not.toThrow();
	});
	test("render+update while dying", () => {
		const c = game.cultivation;
		c.dying = true; c.age = 500;
		expect(() => { game.update(); game.render(); }).not.toThrow();
	});
	test("render+update with every building built", () => {
		for (const b of game.bld.buildingsData){ b.val = 5; b.on = 5; b.unlocked = true; }
		game.updateCaches(); game.calculateAllEffects();
		expect(() => { game.update(); game.render(); }).not.toThrow();
	});
	test("render+update with all techs researched", () => {
		for (const t of game.science.techs){ t.unlocked = true; t.researched = true; }
		for (const u of game.workshop.upgrades){ u.unlocked = true; u.researched = true; }
		game.updateCaches(); game.calculateAllEffects();
		expect(() => { for (let i=0;i<50;i++) game.update(); game.render(); }).not.toThrow();
	});
	test("render+update with religion maxed", () => {
		const r = game.religion;
		for (const z of r.zigguratUpgrades){ z.unlocked = true; z.on = 3; z.val = 3; }
		for (const u of r.religionUpgrades){ u.unlocked = true; u.on = true; u.val = 1; }
		for (const t of r.transcendenceUpgrades){ t.unlocked = true; t.on = true; t.val = 1; }
		r.transcendenceTier = 5; r.faith = 1e6; r.faithRatio = 10;
		game.resPool.get("faith").value = 1e6;
		expect(() => { game.update(); game.render(); }).not.toThrow();
	});
	test("render+update with space programs done", () => {
		for (const p of game.space.programs){ p.unlocked = true; p.on = true; p.val = 1; }
		for (const pl of game.space.planets){ pl.unlocked = true; for (const b of pl.buildings||[]){ b.unlocked = true; b.on = 2; b.val = 2; } }
		expect(() => { game.update(); game.render(); }).not.toThrow();
	});
	test("render+update dying overlay reshow after reload", () => {
		const c = game.cultivation;
		c.dying = true; c.deathOverlayOpen = false; c.age = 999;
		expect(() => { c.update(); }).not.toThrow();
		expect(c.deathOverlayOpen).toBe(true);
	});
});
