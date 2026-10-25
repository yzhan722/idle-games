/**
 * 职业平衡回归测试 —— 与 scripts/balance-check.mjs 同一套阈值，
 * 防止内容改动悄悄把某职业拉回失衡区（深度塌方 / 练级速率掉队 / 终局垄断）。
 *
 * 阈值（与 balance-check.mjs 保持同步）:
 *   动作数 / 树节点数:   每职业 ≥ max*0.5
 *   xp/s 分段中位数:     每职业 ≥ 全职业中位数*0.7
 *   可造装备总数:        每职业 ≥ 8
 *   终局套装(tier≥8)归属: 单一职业 ≤ 70%
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";

type PackAction = { id: string; skillId?: string; duration?: number; xp?: number; requirements?: { skillLevel?: number }; yields?: { itemId: string }[]; consumes?: { itemId: string }[] };
type PackSet = { id: string; pieces?: { itemId: string }[] };
const pack = enhancedContentPack as unknown as {
  classes: { id: string }[];
  actions: PackAction[];
  professionTrees: { professionId: string; skillNodes: { id: string; unlocks?: { actions?: string[] } }[] }[];
  items: { id: string; tier?: number; type?: string; slot?: string }[];
  equipmentSets: PackSet[];
};

const CLASSES = pack.classes.map((c) => c.id);
// 采集/生产技能拆分：采集 = skill_<profession>，生产 = skill_<动作名>
const CRAFT_SKILL_BY_CLASS: Record<string, string> = {
  woodcutter: "skill_woodworking",
  blacksmith: "skill_smithing",
  farmer: "skill_husbandry",
  chef: "skill_cooking",
  tailor: "skill_tailoring",
  alchemist: "skill_alchemy",
};
const SKILL_TO_CLASS: Record<string, string> = Object.fromEntries(
  CLASSES.flatMap((c) => [[`skill_${c}`, c], [CRAFT_SKILL_BY_CLASS[c], c]])
);
const BANDS: [number, number][] = [[1, 20], [21, 60], [61, 999]];
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const lvlOf = (a: PackAction) => a.requirements?.skillLevel ?? 1;
const itemTier = new Map(pack.items.map((i) => [i.id, i.tier ?? 0]));
const producedBy = new Map<string, Set<string>>();
for (const a of pack.actions) for (const y of a.yields ?? []) {
  if (!producedBy.has(y.itemId)) producedBy.set(y.itemId, new Set());
  producedBy.get(y.itemId)!.add(SKILL_TO_CLASS[a.skillId ?? ""] ?? (a.skillId ?? ""));
}
const slotOf = (id: string) => /^(weapon|offhand|shield)_/.test(id) ? "weapon" : /^armor_/.test(id) ? "armor" : /^accessory_/.test(id) ? "acc" : null;

const report = new Map<string, { actions: number; gatherActions: number; craftActions: number; treeNodes: number; gear: number; xpPerSec: number[] }>();
for (const cls of CLASSES) {
  const gatherSid = `skill_${cls}`;
  const craftSid = CRAFT_SKILL_BY_CLASS[cls];
  const acts = pack.actions.filter((a) => a.skillId === gatherSid || a.skillId === craftSid);
  const nodes = pack.professionTrees.find((t) => t.professionId === cls)?.skillNodes ?? [];
  const xpPerSec = BANDS.map(([lo, hi]) =>
    med(acts.filter((a) => { const l = lvlOf(a); return l >= lo && l <= hi && a.xp && a.duration; })
      .map((a) => (a.xp ?? 0) / ((a.duration ?? 1) / 1000))));
  let gear = 0;
  for (const a of acts) for (const y of a.yields ?? []) if (slotOf(y.itemId)) gear++;
  report.set(cls, {
    actions: acts.length,
    gatherActions: acts.filter((a) => a.skillId === gatherSid).length,
    craftActions: acts.filter((a) => a.skillId === craftSid).length,
    treeNodes: nodes.length,
    gear,
    xpPerSec,
  });
}
const endgameSets = pack.equipmentSets.filter((s) =>
  (s.pieces ?? []).some((p) => (itemTier.get(p.itemId) ?? 0) >= 8));
const ownerCount = new Map<string, number>();
for (const s of endgameSets) {
  const owners = new Set<string>();
  for (const p of s.pieces ?? []) for (const o of producedBy.get(p.itemId) ?? ["drop"]) owners.add(o);
  for (const o of owners) ownerCount.set(o, (ownerCount.get(o) ?? 0) + 1);
}

describe("profession balance", () => {
  it("动作数与树节点数不低于最大职业的一半", () => {
    const maxActs = Math.max(...CLASSES.map((c) => report.get(c)!.actions));
    const maxNodes = Math.max(...CLASSES.map((c) => report.get(c)!.treeNodes));
    for (const cls of CLASSES) {
      const r = report.get(cls)!;
      assert.ok(r.actions >= maxActs * 0.5, `${cls}: 动作数 ${r.actions} < ${maxActs}*0.5`);
      assert.ok(r.treeNodes >= maxNodes * 0.5, `${cls}: 树节点 ${r.treeNodes} < ${maxNodes}*0.5`);
    }
  });
  it("分段 xp/秒不低于全职业中位数的七成", () => {
    BANDS.forEach((_, i) => {
      const bandMed = med(CLASSES.map((c) => report.get(c)!.xpPerSec[i]).filter((v) => v > 0));
      for (const cls of CLASSES) {
        const v = report.get(cls)!.xpPerSec[i];
        if (v > 0 && bandMed > 0) {
          assert.ok(v >= bandMed * 0.7, `${cls}: ${BANDS[i][0]}+ 段 xp/s ${v.toFixed(2)} < 中位数 ${bandMed.toFixed(2)}*0.7`);
        }
      }
    });
  });
  it("每个职业可造装备 ≥8 件", () => {
    for (const cls of CLASSES) {
      assert.ok(report.get(cls)!.gear >= 8, `${cls}: 可造装备 ${report.get(cls)!.gear} < 8`);
    }
  });
  it("采集/生产两侧各自保有可玩深度", () => {
    // 拆分后每侧都是一条独立升级线：采集侧 ≥10 个动作、生产侧 ≥20 个动作。
    // 已知缺口（2026-10 内容快照）：钓鱼 10 / 畜牧 23 偏薄，后续扩内容时应向 22/74 中位对齐。
    for (const cls of CLASSES) {
      const r = report.get(cls)!;
      assert.ok(r.gatherActions >= 10, `${cls}: 采集动作 ${r.gatherActions} < 10`);
      assert.ok(r.craftActions >= 20, `${cls}: 生产动作 ${r.craftActions} < 20`);
    }
  });
  it("无单一职业垄断终局套装（≤70%）", () => {
    assert.ok(endgameSets.length >= 3, `终局套装仅 ${endgameSets.length} 套`);
    const top = [...ownerCount.entries()].filter(([k]) => k !== "drop").sort((a, b) => b[1] - a[1])[0];
    if (top) assert.ok(top[1] / endgameSets.length <= 0.7, `终局套装垄断: ${top[0]} 占 ${top[1]}/${endgameSets.length}`);
  });
  it("怪物爆率保持低位：rareChance ≤ 0.05，技能书 drops ≤ 0.1（连战 ~330 杀/时节奏）", () => {
    const monsters = (enhancedContentPack as unknown as {
      monsters: { id: string; rare?: string; rareChance?: number; drops?: { itemId: string; chance?: number }[] }[]
    }).monsters;
    for (const m of monsters) {
      if (m.rare) {
        assert.ok((m.rareChance ?? 1) <= 0.05, `${m.id}: rareChance ${m.rareChance} > 0.05——连战下材料洪水`);
      }
      for (const d of m.drops ?? []) {
        assert.ok((d.chance ?? 1) <= 0.1, `${m.id}: drop ${d.itemId} chance ${d.chance} > 0.1`);
      }
    }
  });
  it("升级耗时曲线：里程碑小时内且全程近似单调（MWI 500-1000h 挂机曲线参照）", async () => {
    // 需求曲线与 storage.ts getXpForLevel 保持同步——曲线形状回归而非数值镜像
    const xpNeed = (level: number): number => {
      if (level >= 200) return Infinity;
      const e15 = Math.floor(40 * Math.pow(15, 1.35));
      if (level <= 15) return Math.floor(40 * Math.pow(level, 1.35));
      const e30 = Math.floor(e15 + 65 * Math.pow(15, 1.65));
      if (level <= 30) return Math.floor(e15 + 65 * Math.pow(level - 15, 1.65));
      const e100 = Math.floor(e30 + 56 * Math.pow(70, 1.96));
      if (level <= 100) return Math.floor(e30 + 56 * Math.pow(level - 30, 1.96));
      const d = level - 100;
      return Math.floor(e100 + 9500 * d + 110 * Math.pow(d, 2.15));
    };
    const frontierRate = (level: number) =>
      Math.max(0, ...pack.actions
        .filter((a) => (a.skillId ?? "").startsWith("skill_") && lvlOf(a) <= level && a.xp && a.duration)
        .map((a) => (a.xp ?? 0) / ((a.duration ?? 1) / 1000)));
    const hoursAt = (level: number) => xpNeed(level) / frontierRate(level) / 3600;
    // 里程碑上限（裸基础速率，算入工具/房屋/效率/药剂后全技能寿命落在 500-1000h 区间）
    const budgets: [number, number][] = [[30, 1], [60, 4], [100, 16], [130, 30], [160, 55], [199, 120]];
    for (const [lv, maxH] of budgets) {
      const h = hoursAt(lv);
      assert.ok(h <= maxH, `Lv${lv} 单级耗时 ${h.toFixed(1)}h 超出预算 ${maxH}h（速率追不上需求曲线）`);
    }
    // 60 级以后耗时必须单调不减（解锁新动作只允许提速 ~25% 以内，不允许回退到更快）
    let prev = 0;
    for (let lv = 60; lv <= 190; lv += 10) {
      const h = hoursAt(lv);
      if (h < prev * 0.75) assert.fail(`Lv${lv} 耗时 ${h.toFixed(1)}h 低于 Lv${lv - 10} 的 ${prev.toFixed(1)}h×0.75——曲线回跌`);
      prev = h;
    }
  });
});
