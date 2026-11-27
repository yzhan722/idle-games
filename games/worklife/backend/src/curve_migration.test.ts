import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { CURRENT_CURVE_VERSION, legacyXpForLevelV1, migratePlayerCurves, rescaleSkillProgress, revertPlayerCurves } from "./curve_migration";
import { MAX_SKILL_LEVEL, xpForLevel } from "./growth_curves";
import { defaultEnhancedPlayerState, ensurePlayerExtensions, simulateToNow } from "./storage";
import { createMemoryStorage } from "./storage_memory";
import { GIFT_POINTS } from "./tasks";

const pack = packJson as unknown as EnhancedContentPack;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** 换曲线之前的存档：没有 curveVersion，经验按旧曲线记。 */
function legacySave(): EnhancedPlayerState {
  const s = defaultEnhancedPlayerState(pack.version);
  delete s.curveVersion;
  return s;
}

const pctOf = (xp: number, need: number) => (xp / need) * 100;

describe("升级曲线存档迁移", () => {
  it("每一级、每个百分比：等级不变，本级进度百分比不变", () => {
    for (let level = 1; level < MAX_SKILL_LEVEL; level++) {
      const need = legacyXpForLevelV1(level);
      for (const share of [0, 0.01, 0.25, 0.5, 0.99]) {
        const before = { level, xp: need * share };
        const after = rescaleSkillProgress(before);
        assert.equal(after.level, level, `Lv${level} ${share}`);
        assert.ok(after.xp >= 0 && after.xp < xpForLevel(level), `Lv${level} ${share}: ${after.xp}`);
        assert.ok(Math.abs(pctOf(after.xp, xpForLevel(level)) - share * 100) < 0.1, `Lv${level} ${share}`);
        assert.equal(before.level, level, "传入的对象不被修改");
      }
    }
  });

  it("满级、脏数据、攒过头的经验都不会丢等级", () => {
    assert.deepEqual(rescaleSkillProgress({ level: MAX_SKILL_LEVEL, xp: 12345 }), { level: MAX_SKILL_LEVEL, xp: 12345 });
    assert.deepEqual(rescaleSkillProgress({ level: 5, xp: 0 }), { level: 5, xp: 0 });
    assert.deepEqual(rescaleSkillProgress({ level: 0, xp: 7 }), { level: 0, xp: 7 });
    const over = rescaleSkillProgress({ level: 3, xp: legacyXpForLevelV1(3) + legacyXpForLevelV1(4) / 2 });
    assert.equal(over.level, 4, "旧曲线下已够升级的经验先升完");
    assert.ok(Math.abs(pctOf(over.xp, xpForLevel(4)) - 50) < 0.1);
  });

  it("整份旧存档：职业 / 战斗 / 强化技能都换算，强化等级、房屋、背包、战斗技能书原样保留，且只换算一次", () => {
    const save = legacySave();
    save.skills.skill_woodcutter = { level: 37, xp: legacyXpForLevelV1(37) * 0.6, unlockedRecipes: ["woodcutter_enhancement"], enhancementLevel: 0 };
    save.skills.skill_enhancing = { level: 12, xp: legacyXpForLevelV1(12) * 0.3, unlockedRecipes: [], enhancementLevel: 0 };
    save.combatSkills = {
      stamina: { level: 20, xp: legacyXpForLevelV1(20) * 0.5 },
      intelligence: { level: 18, xp: 0 },
      attack: { level: 18, xp: 10 },
      defense: { level: 18, xp: 10 },
      melee: { level: 30, xp: legacyXpForLevelV1(30) * 0.9 },
      ranged: { level: 1, xp: 0 },
      magic: { level: 1, xp: 0 },
    };
    save.equipment.enhancementLevels = { weapon_wooden_sword: 11, armor_wood_chest: 3 };
    save.inventory = { gold: 999, wood_1: 5, weapon_wooden_sword: 1, armor_wood_chest: 1 };
    save.house = { rooms: { lumber_yard: 5 } };
    save.abilities = { heavy_chop: { level: 6, xp: 777 } };
    const before = clone(save);

    ensurePlayerExtensions(save);
    assert.equal(save.curveVersion, CURRENT_CURVE_VERSION);
    for (const [id, share] of [["skill_woodcutter", 0.6], ["skill_enhancing", 0.3]] as const) {
      assert.equal(save.skills[id].level, before.skills[id].level);
      assert.ok(Math.abs(pctOf(save.skills[id].xp, xpForLevel(save.skills[id].level)) - share * 100) < 0.1, id);
    }
    assert.deepEqual(save.skills.skill_woodcutter.unlockedRecipes, ["woodcutter_enhancement"]);
    for (const [id, sk] of Object.entries(before.combatSkills!)) {
      assert.equal((save.combatSkills as Record<string, { level: number }>)[id].level, sk.level, id);
    }
    assert.ok(Math.abs(pctOf(save.combatSkills!.melee.xp, xpForLevel(30)) - 90) < 0.1);
    assert.deepEqual(save.equipment.enhancementLevels, before.equipment.enhancementLevels, "强化等级原样保留");
    assert.deepEqual(save.inventory, before.inventory);
    assert.deepEqual(save.house, before.house);
    assert.deepEqual(save.abilities!.heavy_chop, before.abilities!.heavy_chop);

    const once = clone(save);
    assert.equal(migratePlayerCurves(save), false);
    ensurePlayerExtensions(save);
    assert.deepEqual(save.skills, once.skills, "第二次进来不再换算");
    assert.deepEqual(save.combatSkills, once.combatSkills);
  });

  it("战斗等级不倒退：换公式前各阶段存档显示的战斗等级，换公式后不低于它", () => {
    // [耐力, 智力, 攻击, 防御, 近战] → 换公式前存档里显示的战斗等级（换版时留下的样本）
    const samples: Array<[[number, number, number, number, number], number]> = [
      [[1, 1, 1, 1, 1], 1],
      [[3, 1, 2, 1, 4], 3],
      [[7, 6, 7, 6, 9], 8],
      [[12, 11, 12, 11, 16], 14],
      [[20, 18, 18, 18, 30], 25],
      [[31, 30, 33, 30, 44], 38],
      [[60, 25, 25, 25, 40], 37],
      [[52, 50, 52, 50, 75], 65],
      [[25, 25, 80, 25, 60], 61],
      [[90, 88, 90, 88, 130], 113],
      [[150, 148, 150, 148, 190], 173],
      [[200, 200, 200, 200, 200], 200],
    ];
    for (const [[s, i, a, d, w], shown] of samples) {
      const save = legacySave();
      const lv = (level: number) => ({ level, xp: 0 });
      save.combatLevel = shown;
      save.combatSkills = { stamina: lv(s), intelligence: lv(i), attack: lv(a), defense: lv(d), melee: lv(w), ranged: lv(1), magic: lv(1) };
      ensurePlayerExtensions(save);
      assert.ok(save.combatLevel >= shown, `${[s, i, a, d, w]}: ${save.combatLevel} < ${shown}`);
    }
  });

  it("任务点按新门槛折算：已可领的谢礼仍可领，没到的不会凭空多出来一大截", () => {
    for (const [points, claimed] of [[0, 0], [49, 0], [50, 0], [120, 2], [149, 2], [150, 2], [2000, 40]] as const) {
      const save = legacySave();
      save.tasksState = {
        tasks: [], nextTaskAt: new Date().toISOString(), tokens: 3, points, giftsClaimed: claimed, cooldownLevel: 2, blockSlots: 1,
        blockedSkills: [], rerollsToday: 0, rerollDay: "2026-11-26", completed: 9,
      };
      migratePlayerCurves(save);
      const st = save.tasksState;
      const wasReady = Math.floor(points / 50) > claimed;
      const ready = Math.floor(st.points / GIFT_POINTS) > claimed;
      if (wasReady) assert.ok(ready, `${points}/${claimed}`);
      assert.ok(Math.floor(st.points / GIFT_POINTS) <= Math.floor(points / 50) + 1, `${points}/${claimed}`);
      assert.deepEqual([st.tokens, st.giftsClaimed, st.cooldownLevel, st.blockSlots, st.completed], [3, claimed, 2, 1, 9]);
    }
  });

  it("新建的存档直接是当前版本，不会被当成旧存档换算", () => {
    const s = defaultEnhancedPlayerState(pack.version);
    assert.equal(s.curveVersion, CURRENT_CURVE_VERSION);
    s.skills.skill_woodcutter.xp = 33;
    ensurePlayerExtensions(s);
    assert.equal(s.skills.skill_woodcutter.xp, 33);
  });

  it("回滚：换回旧曲线后再升级，等级、百分比、任务点都回到原处；旧版本期间打出来的经验按旧曲线算", () => {
    for (const level of [1, 18, 37, 100, 199]) {
      const save = legacySave();
      save.curveVersion = CURRENT_CURVE_VERSION;
      save.skills.skill_woodcutter = { level, xp: xpForLevel(level) * 0.4, unlockedRecipes: ["x"], enhancementLevel: 0 };
      save.combatSkills = { ...save.combatSkills!, melee: { level, xp: xpForLevel(level) * 0.9 } };
      save.tasksState = { ...save.tasksState!, points: 40 } as typeof save.tasksState;
      assert.equal(revertPlayerCurves(save), true);
      assert.equal(save.curveVersion, undefined);
      assert.equal(revertPlayerCurves(save), false, "没有版本号的存档不再换");
      assert.ok(Math.abs(pctOf(save.skills.skill_woodcutter.xp, legacyXpForLevelV1(level)) - 40) < 0.1);
      assert.equal(save.tasksState!.points, 50);
      // 旧版本运行期间又打了 10% 旧经验
      save.skills.skill_woodcutter.xp += legacyXpForLevelV1(level) * 0.1;
      assert.equal(migratePlayerCurves(save), true);
      assert.equal(save.skills.skill_woodcutter.level, level);
      assert.ok(Math.abs(pctOf(save.skills.skill_woodcutter.xp, xpForLevel(level)) - 50) < 0.2, `Lv${level}`);
      assert.ok(Math.abs(pctOf(save.combatSkills!.melee.xp, xpForLevel(level)) - 90) < 0.2);
      assert.equal(save.tasksState!.points, 40);
      assert.deepEqual(save.skills.skill_woodcutter.unlockedRecipes, ["x"]);
    }
  });

  it("结算用的是浅拷贝：没写回的原存档不会被重复换算", () => {
    const save = legacySave();
    save.skills.skill_woodcutter = { level: 10, xp: legacyXpForLevelV1(10) / 2, unlockedRecipes: [], enhancementLevel: 0 };
    const t = new Date(Date.parse(save.lastSimulatedAt) + 1000);
    const first = simulateToNow({ state: save, now: t, contentPack: pack, rng: () => 0.5 }).state as EnhancedPlayerState;
    const second = simulateToNow({ state: save, now: t, contentPack: pack, rng: () => 0.5 }).state as EnhancedPlayerState;
    assert.equal(first.skills.skill_woodcutter.xp, second.skills.skill_woodcutter.xp);
    assert.ok(Math.abs(pctOf(first.skills.skill_woodcutter.xp, xpForLevel(10)) - 50) < 0.1);
  });

  it("文件持久化的旧快照在读档时换算，再次读档不重复", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "worklife-curve-"));
    const file = path.join(dir, "memory.json");
    try {
      const save = legacySave();
      save.skills.skill_blacksmith = { level: 25, xp: legacyXpForLevelV1(25) * 0.4, unlockedRecipes: [], enhancementLevel: 0 };
      fs.writeFileSync(file, JSON.stringify({ version: 1, users: [{ id: "u1", guestDeviceId: "d1", createdAt: save.lastSimulatedAt }], states: [["u1", save]], parties: [] }));
      const storage = createMemoryStorage({ persistPath: file });
      await storage.init();
      const loaded = await storage.getOrCreatePlayerState("u1", pack.version);
      assert.equal(loaded.curveVersion, CURRENT_CURVE_VERSION);
      assert.equal(loaded.skills.skill_blacksmith.level, 25);
      const xp = loaded.skills.skill_blacksmith.xp;
      assert.ok(Math.abs(pctOf(xp, xpForLevel(25)) - 40) < 0.1);
      await storage.savePlayerState("u1", loaded);
      await storage.close();

      const again = createMemoryStorage({ persistPath: file });
      await again.init();
      assert.equal((await again.getOrCreatePlayerState("u1", pack.version)).skills.skill_blacksmith.xp, xp);
      await again.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("回滚脚本：只数不写；执行后留备份；再执行一次不会盖掉备份；之后升级自动换算回来", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "worklife-rollback-"));
    const file = path.join(dir, "memory.json");
    const backup = `${file}.before-curve-rollback`;
    const script = path.join(__dirname, "../scripts/curve-rollback.ts");
    const run = (...args: string[]) => execFileSync(process.execPath, ["--import", "tsx", script, "--file", file, ...args], { cwd: path.join(__dirname, ".."), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
    try {
      const save = legacySave();
      save.skills.skill_blacksmith = { level: 25, xp: legacyXpForLevelV1(25) * 0.4, unlockedRecipes: [], enhancementLevel: 0 };
      migratePlayerCurves(save);
      const original = JSON.stringify({ version: 1, curveWriter: CURRENT_CURVE_VERSION, users: [], states: [["u1", save]], parties: [] });
      fs.writeFileSync(file, original);
      assert.match(run(), /1 份存档/);
      assert.equal(fs.readFileSync(file, "utf8"), original, "不加 --apply 不写");
      run("--apply");
      assert.equal(fs.readFileSync(backup, "utf8"), original);
      const rolled = JSON.parse(fs.readFileSync(file, "utf8"));
      assert.deepEqual([rolled.curveWriter, rolled.states[0][1].curveVersion], [undefined, undefined]);
      assert.ok(Math.abs(pctOf(rolled.states[0][1].skills.skill_blacksmith.xp, legacyXpForLevelV1(25)) - 40) < 0.1);
      assert.match(run("--apply"), /0 份存档/);
      assert.equal(fs.readFileSync(backup, "utf8"), original, "备份还是第一次的原文件");
      assert.deepEqual(fs.readdirSync(dir).length, 2);
      assert.equal(migratePlayerCurves(rolled.states[0][1]), true);
      assert.ok(Math.abs(pctOf(rolled.states[0][1].skills.skill_blacksmith.xp, xpForLevel(25)) - 40) < 0.1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
