import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { worldAnnouncements } from "./world_announce";
import pack from "../../shared/enhanced_content_pack_chinese.json" with { type: "json" };
import type { EnhancedPlayerState } from "./types";

const base = (): EnhancedPlayerState =>
  ({
    settings: {},
    stats: { killsByMonster: {} },
    equipment: { enhancementLevels: {} },
    prestige: { count: 0 },
  }) as unknown as EnhancedPlayerState;

describe("worldAnnouncements", () => {
  it("announces a new villager when characterCreated flips true", () => {
    const a = base();
    const b = base();
    b.settings = { characterCreated: true, playerName: "阿强" };
    const msgs = worldAnnouncements(a, b, pack as any, "u123456789");
    assert.equal(msgs.length, 1);
    assert.match(msgs[0], /阿强/);
  });

  it("announces only the FIRST kill of each boss", () => {
    const a = base();
    a.stats!.killsByMonster = { forest_boss: 0 };
    const b = base();
    b.settings = { playerName: "阿强" };
    b.stats!.killsByMonster = { forest_boss: 1 };
    const msgs = worldAnnouncements(a, b, pack as any, "u123456789");
    assert.equal(msgs.length, 1);
    assert.match(msgs[0], /阿强/);
    assert.match(msgs[0], /森林管家/);

    // 第二次击杀不再播报
    const c = base();
    c.stats!.killsByMonster = { forest_boss: 2 };
    assert.equal(worldAnnouncements(b, c, pack as any, "u123456789").length, 0);
  });

  it("ignores non-boss monster kills", () => {
    const a = base();
    const b = base();
    b.stats!.killsByMonster = { slime: 1, caterpillar: 1 };
    assert.equal(worldAnnouncements(a, b, pack as any, "u123456789").length, 0);
  });

  it("announces prestige and enhancement milestones", () => {
    const a = base();
    const b = base();
    b.settings = { playerName: "老猫" };
    b.prestige = { count: 2 };
    (b.equipment as any).enhancementLevels = { weapon_wooden_sword: 10 };
    const msgs = worldAnnouncements(a, b, pack as any, "u123456789");
    assert.ok(msgs.some((m) => m.includes("第 2 次转生")));
    // 跨多个里程碑只报最高的一条
    assert.ok(msgs.some((m) => m.includes("+10")));
    assert.ok(!msgs.some((m) => m.includes("+5")));
  });
});
