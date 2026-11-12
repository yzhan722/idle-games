import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import {
  addReputation,
  buyQuartermasterItem,
  equipReputationTitle,
  getAvailableReputation,
  getReputationBonuses,
  getReputationInfo,
  getReputationTier,
} from "./progression2";
import { PROTECTION_MIRROR_ID } from "./enhancement_math";
import { ensurePlayerExtensions } from "./storage";

function makePlayer(): EnhancedPlayerState {
  const p = {
    version: "1.0.0",
    skills: {},
    inventory: { gold: 500 },
    equipment: {},
    logs: [],
  } as unknown as EnhancedPlayerState;
  ensurePlayerExtensions(p);
  return p;
}

const mockPack: EnhancedContentPack = {
  version: "1.0.0",
  items: [
    { id: "mirror_protection", name: "保护镜" },
    { id: "crystal_2", name: "辉光水晶" },
    { id: "ingot_2", name: "铁锭" },
    { id: "lumber_2", name: "加固木板" },
    { id: "potion_craft_focus", name: "专注药剂" },
    { id: "crystal_3", name: "耀光水晶" },
    { id: "elemental_core", name: "元素核心" },
    { id: "ghost_essence", name: "幽灵精华" },
    { id: "potion_artisan", name: "巧匠药剂" },
  ],
  skills: [],
  actions: [],
  monsters: [],
} as unknown as EnhancedContentPack;

describe("WL-4 Reputation Quartermaster Shop", () => {
  it("spending reputation NEVER drops cumulative reputation tier or tier passive bonuses", () => {
    const p = makePlayer();
    addReputation(p, 720); // Tier 4: 声名鹊起 (required: 700)
    assert.equal(getReputationTier(p.reputation!.total).tier, 4);
    const baseBonuses = getReputationBonuses(p);

    // Spend 260 reputation on Warder title + 120 on chest + 80 on protection mirror = 460 spent (available = 260, well below 700!)
    const r1 = buyQuartermasterItem(p, mockPack, "qm_title_warder", new Date("2026-11-12T08:00:00Z"));
    const r2 = buyQuartermasterItem(p, mockPack, "qm_rare_material_chest", new Date("2026-11-12T08:00:00Z"));
    const r3 = buyQuartermasterItem(p, mockPack, "qm_protection_mirror", new Date("2026-11-12T08:00:00Z"));
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    assert.equal(r3.ok, true);

    assert.equal(p.reputation!.total, 720);
    assert.equal(p.reputation!.spent, 460);
    assert.equal(getAvailableReputation(p), 260);
    assert.equal(getReputationTier(p.reputation!.total).tier, 4);

    // Unequip title to compare pure tier passive bonuses: must remain identical to before spending!
    equipReputationTitle(p, null);
    const afterBonuses = getReputationBonuses(p);
    assert.deepEqual(afterBonuses, baseBonuses);
  });

  it("enforces tier requirement, available balance, and daily caps with local-day reset", () => {
    const p = makePlayer();
    addReputation(p, 60); // Tier 1 (< 100)
    const blockedByTier = buyQuartermasterItem(p, mockPack, "qm_protection_mirror", new Date("2026-11-12T10:00:00"));
    assert.equal(blockedByTier.ok, false);

    addReputation(p, 500); // total 560 -> Tier 3
    const day1 = new Date("2026-11-12T10:00:00");
    for (let i = 0; i < 3; i++) {
      const res = buyQuartermasterItem(p, mockPack, "qm_rare_material_chest", day1);
      assert.equal(res.ok, true);
    }
    // 4th chest on same day fails daily cap (3/day)
    const overCap = buyQuartermasterItem(p, mockPack, "qm_rare_material_chest", day1);
    assert.equal(overCap.ok, false);
    assert.ok((overCap.reason || "").includes("上限"));

    // Protection mirror granted & chest materials granted
    assert.equal(p.inventory.crystal_2, 9);
    assert.equal(p.inventory.ingot_2, 12);
    assert.equal(p.inventory.gold, 500 + 600 * 3);

    // Next day resets daily cap
    addReputation(p, 200);
    const day2 = new Date("2026-11-13T10:00:00");
    const nextDayBuy = buyQuartermasterItem(p, mockPack, "qm_rare_material_chest", day2);
    assert.equal(nextDayBuy.ok, true);

    const mirrorBuy = buyQuartermasterItem(p, mockPack, "qm_protection_mirror", day2);
    assert.equal(mirrorBuy.ok, true);
    assert.equal(p.inventory[PROTECTION_MIRROR_ID], 1);
  });

  it("applies stackable timed scroll buffs and equipped title bonuses with clean expiration", () => {
    const p = makePlayer();
    addReputation(p, 2000); // Tier 5 (远近闻名)
    const t0 = new Date("2026-11-12T12:00:00Z");

    const base = getReputationBonuses(p, t0);
    const buyArtisan = buyQuartermasterItem(p, mockPack, "qm_scroll_artisan", t0);
    const buyVanguard = buyQuartermasterItem(p, mockPack, "qm_scroll_vanguard", t0);
    assert.equal(buyArtisan.ok, true);
    assert.equal(buyVanguard.ok, true);

    const activeAt1h = getReputationBonuses(p, new Date(t0.getTime() + 60 * 60 * 1000));
    assert.ok(Math.abs(activeAt1h.gatherSpeed - (base.gatherSpeed + 0.15)) < 1e-9);
    assert.ok(Math.abs(activeAt1h.craftSpeed - (base.craftSpeed + 0.15)) < 1e-9);
    assert.ok(Math.abs(activeAt1h.combatSpeed - (base.combatSpeed + 0.15)) < 1e-9);
    assert.ok(Math.abs(activeAt1h.xpGain - (base.xpGain + 0.20)) < 1e-9);
    assert.ok(Math.abs(activeAt1h.goldGain - (base.goldGain + 0.20)) < 1e-9);

    // Stack a second artisan scroll -> extends to 4h
    const buyArtisan2 = buyQuartermasterItem(p, mockPack, "qm_scroll_artisan", t0);
    assert.equal(buyArtisan2.ok, true);

    // At +2.5h: vanguard expired, artisan still active!
    const at2p5h = getReputationBonuses(p, new Date(t0.getTime() + 2.5 * 60 * 60 * 1000));
    assert.ok(Math.abs(at2p5h.gatherSpeed - (base.gatherSpeed + 0.15)) < 1e-9);
    assert.ok(Math.abs(at2p5h.combatSpeed - base.combatSpeed) < 1e-9);

    // Unlock and equip Dragonslayer title
    const buyTitle = buyQuartermasterItem(p, mockPack, "qm_title_dragonslayer", t0);
    assert.equal(buyTitle.ok, true);
    const dupTitle = buyQuartermasterItem(p, mockPack, "qm_title_dragonslayer", t0);
    assert.equal(dupTitle.ok, false);

    // At +5h: all scrolls expired, only Tier + Dragonslayer title remain active
    const at5h = getReputationBonuses(p, new Date(t0.getTime() + 5 * 60 * 60 * 1000));
    assert.ok(Math.abs(at5h.combatSpeed - (base.combatSpeed + 0.06)) < 1e-9);
    assert.ok(Math.abs(at5h.xpGain - (base.xpGain + 0.06)) < 1e-9);
    assert.ok(Math.abs(at5h.goldGain - (base.goldGain + 0.05)) < 1e-9);

    const info = getReputationInfo(p, new Date(t0.getTime() + 5 * 60 * 60 * 1000));
    assert.equal(info.equippedTitle?.titleLabel, "讨魔先锋");
    assert.equal(info.activeScrolls.length, 0);
    assert.equal(info.quartermasterShop.length, 7);
  });
});
