import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStorage } from "./storage_memory";
import {
  ensureProfessionSkills,
  professionLevelForTree,
  GATHER_SKILL_BY_PROFESSION,
  CRAFT_SKILL_BY_PROFESSION,
  GATHER_SKILL_FOR_CRAFT,
} from "./storage";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";

const contentPack = enhancedContentPack as EnhancedContentPack;

const GATHER_IDS = new Set(Object.values(GATHER_SKILL_BY_PROFESSION));
const CRAFT_IDS = new Set(Object.values(CRAFT_SKILL_BY_PROFESSION));

describe("skill split — content pack integrity", () => {
  const actions = contentPack.actions as Array<{
    id: string; skillId: string; consumes?: Array<{ itemId: string }>;
  }>;
  const packSkillIds = new Set((contentPack.skills as Array<{ id: string }>).map((s) => s.id));

  it("every profession action's skillId exists in pack.skills", () => {
    // skill_combat 是伪技能：战斗经验走 combatLevel/combatXp，不在 skills 表
    for (const a of actions) {
      if (a.skillId === "skill_combat") continue;
      assert.ok(packSkillIds.has(a.skillId), `${a.id} → unknown skill ${a.skillId}`);
    }
  });

  it("production actions (consumes) point at craft skills, gathering at gather skills", () => {
    for (const a of actions) {
      const isProduction = Array.isArray(a.consumes) && a.consumes.length > 0;
      if (GATHER_IDS.has(a.skillId)) {
        assert.ok(!isProduction, `${a.id} is production but uses gather skill ${a.skillId}`);
      } else if (CRAFT_IDS.has(a.skillId)) {
        assert.ok(isProduction, `${a.id} is gathering but uses craft skill ${a.skillId}`);
      }
    }
  });

  it("every profession has both a gather and craft skill in the pack", () => {
    for (const prof of Object.keys(GATHER_SKILL_BY_PROFESSION)) {
      assert.ok(packSkillIds.has(GATHER_SKILL_BY_PROFESSION[prof]), `missing ${GATHER_SKILL_BY_PROFESSION[prof]}`);
      assert.ok(packSkillIds.has(CRAFT_SKILL_BY_PROFESSION[prof]), `missing ${CRAFT_SKILL_BY_PROFESSION[prof]}`);
      // 每职业两侧都至少有一个动作，保证两条腿都能练
      assert.ok(actions.some((a) => a.skillId === GATHER_SKILL_BY_PROFESSION[prof]), `${prof} gather side empty`);
      assert.ok(actions.some((a) => a.skillId === CRAFT_SKILL_BY_PROFESSION[prof]), `${prof} craft side empty`);
    }
  });

  it("tools target the skill their actions actually use", () => {
    const skillByAction = new Map(actions.map((a) => [a.id, a.skillId]));
    const items = contentPack.items as Array<{ id: string; type?: string; toolFor?: string }>;
    for (const item of items) {
      if (item.type !== "tool" || !item.toolFor) continue;
      assert.ok(
        packSkillIds.has(item.toolFor),
        `tool ${item.id} targets unknown skill ${item.toolFor}`
      );
      // 工具技能必须是该职业实际用得到的一侧（采集工具→采集技能，生产工具→生产技能）
      const usable = actions.some(
        (a) => a.skillId === item.toolFor && skillByAction.get(a.id) === item.toolFor
      );
      assert.ok(usable, `tool ${item.id} targets ${item.toolFor} with no actions`);
    }
  });
});

describe("skill split — save migration", () => {
  function oldSixSkillSave(): EnhancedPlayerState {
    return {
      skills: {
        skill_woodcutter: { level: 3, xp: 39, unlockedRecipes: ["woodcutter_basic_cutting"], enhancementLevel: 0 },
        skill_blacksmith: { level: 5, xp: 10, unlockedRecipes: ["blacksmith_basic_mining"], enhancementLevel: 0 },
        skill_farmer: { level: 1, xp: 0, unlockedRecipes: [], enhancementLevel: 0 },
        skill_chef: { level: 1, xp: 0, unlockedRecipes: [], enhancementLevel: 0 },
        skill_tailor: { level: 1, xp: 0, unlockedRecipes: [], enhancementLevel: 0 },
        skill_alchemist: { level: 1, xp: 0, unlockedRecipes: [], enhancementLevel: 0 },
      },
    } as unknown as EnhancedPlayerState;
  }

  it("creates craft skills inheriting gather level/xp; recipes stay on gather side", () => {
    const s = oldSixSkillSave();
    ensureProfessionSkills(s);
    assert.equal(Object.keys(s.skills).length, 12);
    assert.equal(s.skills.skill_woodworking.level, 3);
    assert.equal(s.skills.skill_woodworking.xp, 39);
    assert.equal(s.skills.skill_smithing.level, 5);
    assert.equal(s.skills.skill_woodcutter.level, 3);
    // 树节点解锁是职业级进度，留在采集技能上不被复制/清空
    assert.deepEqual(s.skills.skill_woodcutter.unlockedRecipes, ["woodcutter_basic_cutting"]);
    assert.deepEqual(s.skills.skill_woodworking.unlockedRecipes, []);
  });

  it("is idempotent and never overwrites an existing craft skill", () => {
    const s = oldSixSkillSave();
    s.skills.skill_woodworking = { level: 9, xp: 4, unlockedRecipes: [], enhancementLevel: 0 };
    ensureProfessionSkills(s);
    ensureProfessionSkills(s);
    assert.equal(s.skills.skill_woodworking.level, 9);
    assert.equal(s.skills.skill_woodworking.xp, 4);
  });

  it("professionLevelForTree = max(gather, craft)", () => {
    const s = oldSixSkillSave();
    ensureProfessionSkills(s);
    s.skills.skill_woodworking.level = 20;
    assert.equal(professionLevelForTree(s, "woodcutter"), 20);
    s.skills.skill_woodworking.level = 2;
    assert.equal(professionLevelForTree(s, "woodcutter"), 3);
  });

  it("GATHER_SKILL_FOR_CRAFT maps every craft skill back to its profession gather skill", () => {
    for (const prof of Object.keys(GATHER_SKILL_BY_PROFESSION)) {
      assert.equal(GATHER_SKILL_FOR_CRAFT[CRAFT_SKILL_BY_PROFESSION[prof]], GATHER_SKILL_BY_PROFESSION[prof]);
    }
  });
});

describe("skill split — xp independence end-to-end", () => {
  it("gather action xp lands on gather skill only; craft action xp on craft skill only", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("split-xp");
    const state = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    state.inventory.wood_1 = 20; // 锯木板材料
    await storage.savePlayerState(user.id, state);

    const t0 = new Date();
    // 砍树 → skill_woodcutter
    const started = await storage.startLifeAction({
      userId: user.id, actionId: "act_chop_wood_t1", now: t0, contentPack,
    });
    const afterChop = await storage.simulateToNow({
      userId: user.id, state: started, now: new Date(t0.getTime() + 60_000), contentPack,
    });
    const wcXp = afterChop.skills.skill_woodcutter.level * 1e9 + afterChop.skills.skill_woodcutter.xp;
    const wwXp = afterChop.skills.skill_woodworking.level * 1e9 + afterChop.skills.skill_woodworking.xp;
    assert.ok(wcXp > 1e9, "woodcutter should have gained xp");
    assert.equal(wwXp, 1e9, "woodworking must stay untouched by gathering");

    // 锯木板 → skill_woodworking
    const t1 = new Date(t0.getTime() + 60_000);
    const started2 = await storage.startLifeAction({
      userId: user.id, actionId: "act_craft_lumber_t1", now: t1, contentPack,
    });
    const afterCraft = await storage.simulateToNow({
      userId: user.id, state: started2, now: new Date(t1.getTime() + 60_000), contentPack,
    });
    assert.ok(
      afterCraft.skills.skill_woodworking.xp > 0 || afterCraft.skills.skill_woodworking.level > 1,
      "woodworking should have gained xp"
    );
    const wcBefore = afterChop.skills.skill_woodcutter.level * 1e9 + afterChop.skills.skill_woodcutter.xp;
    const wcAfter = afterCraft.skills.skill_woodcutter.level * 1e9 + afterCraft.skills.skill_woodcutter.xp;
    assert.equal(wcAfter, wcBefore, "woodcutter must not gain xp from crafting");
    await storage.close();
  });
});
