import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import pack from "../../shared/enhanced_content_pack_chinese.json";
import { encounterStages } from "./gameplay_encounters";
import { rareDropFor } from "./hp_combat";

describe("gameplay encounters SSOT", () => {
  it("projects forest slime hp/atk from the content pack", () => {
    const forest = encounterStages(pack as never).find((s) => s.id === "forest");
    const slime = forest?.encounters.find((e) => e.id === "slime");
    assert.ok(slime);
    assert.equal(slime.hp, 80);
    assert.equal(slime.atk, 3);
    assert.equal(slime.actionId, "act_combat_slime");
    assert.equal(slime.isBoss, false);
    assert.equal(slime.archetype, "ordinary");
  });

  it("uses pack names rather than the old frontend typo 生气蘑菇怪", () => {
    const forest = encounterStages(pack as never).find((s) => s.id === "forest");
    const mushroom = forest?.encounters.find((e) => e.id === "mushroom");
    assert.equal(mushroom?.name, "生气蘑菇精");
  });

  it("marks distinct forest archetypes for slime, crab, monkey, and boss", () => {
    const forest = encounterStages(pack as never).find((s) => s.id === "forest");
    const byId = Object.fromEntries((forest?.encounters || []).map((e) => [e.id, e]));
    assert.equal(byId.slime.archetype, "ordinary");
    assert.equal(byId.crab.archetype, "tank");
    assert.equal(byId.monkey.archetype, "fast");
    assert.equal(byId.forest_boss.archetype, "boss");
    assert.equal(byId.forest_boss.isBoss, true);
    assert.equal(byId.forest_boss.hp, 220);
    assert.ok(byId.crab.def > byId.slime.def);
    assert.ok(byId.monkey.attackIntervalMs < byId.slime.attackIntervalMs);
  });

  it("uses pack stages as the map list rather than a second hardcoded table", () => {
    const stages = encounterStages(pack as never);
    assert.equal(stages[0]?.id, "forest");
    assert.equal(stages[0]?.name, "呼呼大睡森林");
    assert.ok(stages.length >= 11);
  });

  it("every advertised rare drop resolves to a real item (names like 寒霜结晶 with no item are a content bug)", () => {
    for (const m of (pack as { monsters: Array<Record<string, unknown>> }).monsters) {
      if (!(Number(m.rareChance || 0) > 0)) continue;
      assert.ok(rareDropFor(pack as never, m), `${m.id}: rare "${String(m.rare)}" resolves to nothing`);
    }
  });

  it("every monster of the shipped zones can actually drop its signature material", () => {
    // forest / mine / swamp / snow are open after chapter 1; alchemy recipes consume the swamp
    // materials and the frost set consumes the snow ones, so a 0 rareChance or an unresolvable
    // rare there would make those recipes unreachable.
    const stages = encounterStages(pack as never).filter((s) => ["forest", "mine", "swamp", "snow"].includes(s.id));
    const monsters = (pack as { monsters: Array<Record<string, unknown>> }).monsters;
    for (const stage of stages) {
      for (const e of stage.encounters) {
        if (e.id === "monkey") continue; // drops an ability book instead of a material
        const m = monsters.find((x) => x.id === e.id)!;
        assert.ok(rareDropFor(pack as never, m), `${stage.id}/${e.id} has no obtainable rare drop`);
      }
    }
  });
});

describe("frontend does not keep a second combat table", () => {
  it("NewGameInterface has no monstersByMap / hardcoded slime hp", () => {
    const src = readFileSync(
      path.join(__dirname, "../../frontend/src/components/NewGameInterface.tsx"),
      "utf8"
    );
    assert.equal(src.includes("monstersByMap"), false);
    assert.equal(src.includes("生气蘑菇怪"), false);
    assert.match(src, /encounterStages/);
  });
});
