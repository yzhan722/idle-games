import assert from "node:assert/strict";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { afterEach, describe, it } from "node:test";
import Fastify from "fastify";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { legacyXpForLevelV1 } from "./curve_migration";
import { xpForLevel } from "./growth_curves";
import { mapThrownError } from "./http_errors";
import { progressionRoutes } from "./routes/progression";
import { checkSaveImport, saveImportEnabled } from "./save_import";
import { defaultEnhancedPlayerState } from "./storage";
import { createMemoryStorage } from "./storage_memory";

const pack = packJson as unknown as EnhancedContentPack;
const clone = <T>(v: T): T => structuredClone(v);

/** 一份有点家底的存档。 */
function veteran(): EnhancedPlayerState {
  const s = defaultEnhancedPlayerState(pack.version);
  s.inventory = { gold: 500, wood_1: 20, weapon_wooden_sword: 1, armor_wood_chest: 1 };
  s.skills.skill_woodcutter = { level: 10, xp: 100, unlockedRecipes: ["woodcutter_enhancement"], enhancementLevel: 0 };
  s.combatSkills = {
    stamina: { level: 5, xp: 1 }, intelligence: { level: 5, xp: 1 }, attack: { level: 5, xp: 1 }, defense: { level: 5, xp: 1 },
    melee: { level: 8, xp: 3 }, ranged: { level: 1, xp: 0 }, magic: { level: 1, xp: 0 },
  };
  s.abilities = { heavy_chop: { level: 3, xp: 10 } };
  s.equipment.main_hand = "weapon_wooden_sword";
  s.equipment.enhancementLevels = { weapon_wooden_sword: 2 };
  return s;
}

/** 玩家自己就能造的密文：密钥写在前端代码里。 */
function forge(state: unknown, userId?: string): string {
  const key = createHash("sha256").update("worklife-isekai-encrypted-save-v1-key-2026").digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify({ v: 1, exportedAt: 1, userId, state }), "utf8"), cipher.final()]);
  return `WLS1.${Buffer.concat([iv, data, cipher.getAuthTag()]).toString("base64url")}`;
}

async function importApp() {
  const storage = createMemoryStorage();
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _req, reply) => {
    const mapped = mapThrownError(error);
    return reply.status(mapped.status).send(mapped.body);
  });
  app.addHook("onRequest", async (req) => { (req as any).userId = req.headers["x-user"]; });
  await progressionRoutes(app, storage, pack);
  const user = await storage.findOrCreateGuestUser(`imp-${Math.random()}`);
  const base = await storage.getOrCreatePlayerState(user.id, pack.version);
  await storage.savePlayerState(user.id, { ...veteran(), stateRevision: base.stateRevision });
  const headers = { "x-user": user.id };
  return {
    storage, app, userId: user.id,
    state: async () => clone(await storage.getOrCreatePlayerState(user.id, pack.version)),
    importCode: (saveCode: string) => app.inject({ method: "POST", url: "/progression/save/import", headers, payload: { saveCode } }),
    get: (url: string) => app.inject({ method: "GET", url, headers }),
    async close() { await app.close(); await storage.close(); },
  };
}

afterEach(() => { delete process.env.SAVE_IMPORT_ENABLED; });

describe("存档导入开关", () => {
  it("默认关闭：只有 SAVE_IMPORT_ENABLED=1 算打开", () => {
    for (const v of [undefined, "", "0", "true", "yes"]) assert.equal(saveImportEnabled({ SAVE_IMPORT_ENABLED: v }), false, String(v));
    assert.equal(saveImportEnabled({ SAVE_IMPORT_ENABLED: "1" }), true);
  });

  it("关闭时导入 403 且什么都不改，导出照常，设置接口告诉前端入口要藏起来", async () => {
    const m = await importApp();
    try {
      const before = await m.state();
      const rich = { ...before, inventory: { ...before.inventory, gold: 1e9 } };
      const res = await m.importCode(forge(rich, m.userId));
      assert.equal(res.statusCode, 403);
      assert.equal(res.json().error, "save_import_disabled");
      assert.deepEqual((await m.state()).inventory, before.inventory);
      const exported = await m.get("/progression/save/export");
      assert.equal(exported.statusCode, 200);
      assert.match(exported.json().saveCode, /^WLS1\./);
      assert.equal((await m.get("/progression/settings")).json().saveImportEnabled, false);
      process.env.SAVE_IMPORT_ENABLED = "1";
      assert.equal((await m.get("/progression/settings")).json().saveImportEnabled, true);
    } finally {
      await m.close();
    }
  });
});

describe("打开导入时的校验", () => {
  it("自己造的密文加不了金币、物品、等级；服务器存档一点不变", async () => {
    process.env.SAVE_IMPORT_ENABLED = "1";
    const m = await importApp();
    try {
      const before = await m.state();
      const cheats: Array<[string, (s: any) => void]> = [
        ["金币", (s) => { s.inventory.gold += 1; }],
        ["已有的物品", (s) => { s.inventory.wood_1 += 1; }],
        ["没有的物品", (s) => { s.inventory.ore_5 = 1; }],
        ["不存在的物品", (s) => { s.inventory.no_such_item = 1; }],
        ["负数", (s) => { s.inventory.wood_1 = -5; }],
        ["小数溢出", (s) => { s.inventory.gold = 1e300; }],
        ["文本数量", (s) => { s.inventory.gold = "999"; }],
        ["职业等级", (s) => { s.skills.skill_woodcutter.level += 1; s.skills.skill_woodcutter.xp = 0; }],
        ["同级更多经验", (s) => { s.skills.skill_woodcutter.xp += 1; }],
        ["不存在的职业", (s) => { s.skills.skill_hacker = { level: 1, xp: 0 }; }],
        ["战斗技能", (s) => { s.combatSkills.melee.level = 200; }],
        ["小数等级", (s) => { s.combatSkills.melee.level = 1.5; }],
        ["没学过的战技", (s) => { s.abilities.omega_annihilation = { level: 1, xp: 0 }; }],
        ["战技等级", (s) => { s.abilities.heavy_chop.level = 50; }],
        ["一件占两个槽", (s) => { s.equipment.off_hand = "weapon_wooden_sword"; }],
        ["没有的装备", (s) => { s.equipment.head = "omega_crown"; }],
        ["部位不对", (s) => { s.equipment.main_hand = "armor_wood_chest"; }],
      ];
      for (const [label, mutate] of cheats) {
        const fake: any = clone(before);
        mutate(fake);
        const res = await m.importCode(forge(fake, m.userId));
        assert.equal(res.statusCode, 400, label);
        assert.equal(res.json().error, "save_import_rejected", label);
        assert.ok(res.json().errors.length >= 1, label);
      }
      const after = await m.state();
      for (const key of ["inventory", "skills", "combatSkills", "abilities", "equipment"] as const) assert.deepEqual(after[key], before[key], key);
      assert.equal((await m.importCode("WLS1.not-a-real-code-at-all")).json().error, "invalid_save_code");
      assert.equal((await m.importCode(forge(before, "someone-else"))).json().error, "save_owner_mismatch");
      assert.equal((await m.importCode(forge({ inventory: [], skills: {} }, m.userId))).statusCode, 400);
    } finally {
      await m.close();
    }
  });

  it("白名单之外的字段一律用服务器现值：转生点、强化等级、增益、统计、任务都塞不进来", async () => {
    process.env.SAVE_IMPORT_ENABLED = "1";
    const m = await importApp();
    try {
      const before = await m.state();
      const fake: any = clone(before);
      fake.prestige = { points: 9999, count: 99 };
      fake.equipment.enhancementLevels = { weapon_wooden_sword: 20 };
      fake.equipment.durability = { weapon_wooden_sword: 9999 };
      fake.activeBuffs = [{ id: "cheat", expiresAt: "2099-01-01T00:00:00Z", stats: { atk: 9999 } }];
      fake.stats = { ...fake.stats, totalKills: 1e9 };
      fake.tasksState = { tokens: 9999 };
      fake.settings = { ...fake.settings, playerName: "<script>", soundEnabled: false };
      fake.skills.skill_woodcutter.unlockedRecipes = ["everything"];
      fake.curveVersion = 99;
      fake.userId = "x";
      const res = await m.importCode(forge(fake, m.userId));
      assert.equal(res.statusCode, 200, res.body);
      const after: any = await m.state();
      assert.deepEqual(after.prestige, (before as any).prestige);
      assert.deepEqual(after.equipment.enhancementLevels, before.equipment.enhancementLevels);
      assert.deepEqual(after.activeBuffs ?? [], before.activeBuffs ?? []);
      assert.equal(after.stats.totalKills, before.stats!.totalKills);
      assert.equal(after.tasksState?.tokens ?? 0, before.tasksState?.tokens ?? 0);
      assert.equal(after.settings.playerName, before.settings!.playerName);
      assert.equal(after.settings.soundEnabled, false, "开关类设置可以带过来");
      assert.deepEqual(after.skills.skill_woodcutter.unlockedRecipes, ["woodcutter_enhancement"]);
      assert.equal(after.curveVersion, before.curveVersion);
    } finally {
      await m.close();
    }
  });

  it("退回旧进度：等级、物品可以变少，正在进行的战斗 / 工作停下，没提到的东西不动", async () => {
    process.env.SAVE_IMPORT_ENABLED = "1";
    const m = await importApp();
    try {
      const before = await m.state();
      const old: any = clone(before);
      old.inventory = { gold: 100, weapon_wooden_sword: 1 };
      old.skills.skill_woodcutter = { level: 4, xp: 3, unlockedRecipes: [], enhancementLevel: 0 };
      delete old.equipment.main_hand;
      const res = await m.importCode(forge(old, m.userId));
      assert.equal(res.statusCode, 200, res.body);
      const after = await m.state();
      assert.deepEqual(after.inventory, { gold: 100, weapon_wooden_sword: 1 });
      assert.equal(after.skills.skill_woodcutter.level, 4);
      assert.equal(after.equipment.main_hand, undefined);
      assert.equal(after.mode, "idle");
      assert.equal(after.lifeActionState, undefined);
      assert.ok((after.stateRevision ?? 0) > (before.stateRevision ?? 0));
    } finally {
      await m.close();
    }
  });

  it("挂单托管中的东西不能靠导回旧存档变出来第二份", async () => {
    process.env.SAVE_IMPORT_ENABLED = "1";
    const m = await importApp();
    try {
      const code = (await m.get("/progression/save/export")).json().saveCode;
      await m.storage.createTradingOrder({ userId: m.userId, itemId: "wood_1", quantity: 20, price: 5, type: "sell", contentPack: pack });
      const res = await m.importCode(code);
      assert.equal(res.statusCode, 400);
      assert.equal((await m.state()).inventory.wood_1 ?? 0, 0);
    } finally {
      await m.close();
    }
  });

  it("换曲线之前导出的存档码：先按旧曲线换算再比，不会被当成新曲线的经验", () => {
    const current = veteran();
    const target = xpForLevel(10);
    current.skills.skill_woodcutter.xp = target * 0.5;
    const old: any = clone(current);
    delete old.curveVersion;
    old.skills.skill_woodcutter.xp = legacyXpForLevelV1(10) * 0.5;
    const same = checkSaveImport(current, old, pack);
    assert.equal(same.ok, true, JSON.stringify(same));
    if (same.ok) assert.ok(Math.abs(same.state.skills.skill_woodcutter.xp - target * 0.5) < 0.01);
    old.skills.skill_woodcutter.xp = legacyXpForLevelV1(10) * 0.6;
    assert.equal(checkSaveImport(current, old, pack).ok, false);
    assert.equal(current.skills.skill_woodcutter.xp, target * 0.5, "不改传入的存档");
  });

  it("坏数据不抛异常", () => {
    const current = veteran();
    for (const bad of [null, undefined, 1, "x", [], {}, { inventory: null, skills: {} }, { inventory: {}, skills: [] }]) {
      assert.equal(checkSaveImport(current, bad, pack).ok, false, JSON.stringify(bad));
    }
    const weird = checkSaveImport(current, { inventory: {}, skills: { skill_woodcutter: null }, combatSkills: "no", abilities: [], equipment: 5, settings: null }, pack);
    assert.equal(weird.ok, false);
  });
});
