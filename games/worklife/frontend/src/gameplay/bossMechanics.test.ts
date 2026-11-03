import assert from "node:assert/strict";
import { describe, it } from "node:test";
import pack from "../../../shared/enhanced_content_pack_chinese.json";
import { mechanicLogMatcher, resolveMechanicDefs, type BossMechanicDef } from "./bossMechanics";
import { mechanicEntries } from "./encounterLabels";

const table = (pack as unknown as { bossMechanics: BossMechanicDef[] }).bossMechanics;
const defsOf = (ids: string[]) => resolveMechanicDefs(ids, table);

describe("mechanic log classification", () => {
  it("flags telegraphs and phase changes as warnings, mechanic damage as hazards, and ignores ordinary lines", () => {
    const volcano = mechanicLogMatcher(defsOf(["eruption_20s", "magma_fury_30"]));
    assert.equal(volcano("地面开始龟裂……熔岩即将喷发！用坚守扛住！"), "warn");
    assert.equal(volcano("魔君怒吼！烈焰之躯攻势更猛了！"), "warn");
    assert.equal(volcano("熔岩喷发！100 点伤害（坚守中）"), "hazard");
    assert.equal(volcano("普通攻击造成 12 伤害"), undefined);
    assert.equal(volcano("烈焰魔君(BOSS) 造成 40 伤害"), undefined);

    const swamp = mechanicLogMatcher(defsOf(["miasma_3s"]));
    assert.equal(swamp("瘴气侵蚀！18 点伤害（3 层）"), "hazard");
    assert.equal(swamp("小治疗驱散了瘴气！"), "warn");

    const mine = mechanicLogMatcher(defsOf(["rockfall_charge"]));
    assert.equal(mine("矿山霸主(BOSS) 造成 60 伤害（落石重击）"), "hazard");
    assert.equal(mine("矿山霸主高举巨石……下一击是落石！用坚守扛住！"), "warn");
  });

  it("a monster without mechanics matches nothing, and a placeholder-only template never matches everything", () => {
    assert.equal(mechanicLogMatcher(undefined)("熔岩喷发！"), undefined);
    assert.equal(mechanicLogMatcher([])("anything"), undefined);
    const broken: BossMechanicDef = { id: "x", kind: "guard", label: "x", params: {}, messages: { up: "{x}" } };
    assert.equal(mechanicLogMatcher([broken])("普通攻击造成 1 伤害"), undefined);
  });
});

describe("mechanic entries for the monster modal", () => {
  it("pairs each mechanic's label with its description and falls back for unknown ids", () => {
    const entries = mechanicEntries(["miasma_3s", "frost_armor_15", "mystery"], defsOf(["miasma_3s", "frost_armor_15"]));
    assert.deepEqual(entries.map((e) => e.label), ["沼泽瘴气", "霜甲周期", "mystery"]);
    assert.match(entries[0].desc!, /驱散|治疗/);
    assert.match(entries[1].desc!, /重劈/);
    assert.equal(entries[2].desc, undefined);
  });

  it("every boss mechanic in the pack explains itself", () => {
    for (const d of table) assert.ok(d.desc && d.desc.length >= 10, `${d.id} needs a description`);
  });
});
