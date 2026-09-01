/**
 * 内容拓展脚本 #11：神话采集经济（tier 10/11/12 + fiber/yarn 补齐 t8/t9）
 *
 * 原材料 & 加工链：
 *   wood / lumber       t10-t12   伐木 + 木工
 *   ore / ingot         t10-t12   采矿 + 冶炼
 *   crystal             t10-t12   炼金采晶
 *   fiber / yarn        t8-t12    采纤 + 纺纱（之前只到 t7，这里补齐到 t12）
 *
 * 采集动作等级继续上探：t10≈125, t11≈135, t12≈145（突破之前 122 的上限）。
 *
 * 幂等：按 id upsert，可重复执行。
 */
const fs = require('fs');
const path = require('path');

const PACK_PATH = path.join(__dirname, '..', 'shared', 'enhanced_content_pack_chinese.json');
const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));

function upsertById(arr, item) {
  const idx = arr.findIndex((x) => x.id === item.id);
  if (idx >= 0) arr[idx] = item;
  else arr.push(item);
}
const ensureItem = (i) => upsertById(pack.items, i);
const ensureAction = (a) => upsertById(pack.actions, a);

// ---------- 原材料 ----------
const rawNames = {
  wood: { 10: '星陨神木', 11: '创世圣木', 12: '寰宇世界树' },
  lumber: { 10: '星陨木板', 11: '创世圣板', 12: '寰宇神板' },
  ore: { 10: '星陨神铁', 11: '创世圣矿', 12: '寰宇原矿' },
  ingot: { 10: '星陨神锭', 11: '创世圣锭', 12: '寰宇神锭' },
  crystal: { 10: '星陨结晶', 11: '创世圣晶', 12: '寰宇之晶' },
  fiber: { 8: '星辉蛛丝', 9: '神纹灵丝', 10: '星陨神丝', 11: '创世圣丝', 12: '寰宇梵丝' },
  yarn: { 8: '星辉灵纱', 9: '神纹圣纱', 10: '星陨神纱', 11: '创世圣纱', 12: '寰宇梵纱' },
};
const rawDescs = {
  wood: '汲取宇宙能量生长的神木，木纹中流转着星河。',
  lumber: '由神木精炼的板材，轻盈坚韧、永不损坏。',
  ore: '深埋于神域地心的神铁，蕴含创世之力。',
  ingot: '以神铁冶炼的神锭，是锻造神话装备的根本。',
  crystal: '凝聚天地灵气的神晶，内部封存着磅礴魔力。',
  fiber: '采自神域灵物的纤维，柔若无物却坚不可摧。',
  yarn: '由神纤纺成的灵纱，编织着命运之线。',
};
for (const [base, tiers] of Object.entries(rawNames)) {
  for (const [tierStr, name] of Object.entries(tiers)) {
    const tier = Number(tierStr);
    ensureItem({ id: `${base}_${tier}`, name, type: 'material', tier, description: rawDescs[base] });
  }
}

// ---------- 采集 / 加工动作 ----------
// 等级映射：t8=110, t9=120, t10=125, t11=135, t12=145（加工 +2 级，纺纱/冶炼随之）
const gatherLevel = { 8: 110, 9: 120, 10: 125, 11: 135, 12: 145 };
const processLevel = { 8: 112, 9: 122, 10: 127, 11: 137, 12: 147 };

function durationFor(tier) {
  return 50000 + (tier - 8) * 12000; // t8≈50s ... t12≈98s
}
function gatherXp(tier) {
  return 90 + (tier - 8) * 35;
}

// 伐木 -> wood t10-t12
[10, 11, 12].forEach((t) => {
  ensureAction({
    id: `act_chop_wood_t${t}`,
    name: `砍伐${rawNames.wood[t]}`,
    skillId: 'skill_woodcutter',
    duration: durationFor(t),
    xp: gatherXp(t),
    requirements: { skillLevel: gatherLevel[t] },
    yields: [{ itemId: `wood_${t}`, qty: 1, chance: 1 }],
  });
  ensureAction({
    id: `act_craft_lumber_t${t}`,
    name: `制作${rawNames.lumber[t]}`,
    skillId: 'skill_woodcutter',
    duration: durationFor(t) - 4000,
    xp: gatherXp(t) - 5,
    requirements: { skillLevel: processLevel[t] },
    consumes: [{ itemId: `wood_${t}`, qty: 5 }],
    yields: [{ itemId: `lumber_${t}`, qty: 1, chance: 1 }],
  });
});

// 采矿 -> ore t10-t12 + 冶炼 ingot
[10, 11, 12].forEach((t) => {
  ensureAction({
    id: `act_mine_ore_t${t}`,
    name: `开采${rawNames.ore[t]}`,
    skillId: 'skill_blacksmith',
    duration: durationFor(t),
    xp: gatherXp(t),
    requirements: { skillLevel: gatherLevel[t] },
    yields: [{ itemId: `ore_${t}`, qty: 1, chance: 1 }],
  });
  ensureAction({
    id: `act_smelt_ingot_t${t}`,
    name: `冶炼${rawNames.ingot[t]}`,
    skillId: 'skill_blacksmith',
    duration: durationFor(t) - 4000,
    xp: gatherXp(t) - 5,
    requirements: { skillLevel: processLevel[t] },
    consumes: [{ itemId: `ore_${t}`, qty: 5 }],
    yields: [{ itemId: `ingot_${t}`, qty: 1, chance: 1 }],
  });
});

// 炼金采晶 -> crystal t10-t12
[10, 11, 12].forEach((t) => {
  ensureAction({
    id: `act_mine_crystal_t${t}`,
    name: `采集${rawNames.crystal[t]}`,
    skillId: 'skill_alchemist',
    duration: durationFor(t),
    xp: gatherXp(t),
    requirements: { skillLevel: gatherLevel[t] },
    yields: [{ itemId: `crystal_${t}`, qty: 1, chance: 1 }],
  });
});

// 采纤 -> fiber t8-t12 + 纺纱 yarn
[8, 9, 10, 11, 12].forEach((t) => {
  ensureAction({
    id: `act_gather_fiber_t${t}`,
    name: `采集${rawNames.fiber[t]}`,
    skillId: 'skill_tailor',
    duration: durationFor(t),
    xp: gatherXp(t),
    requirements: { skillLevel: gatherLevel[t] },
    yields: [{ itemId: `fiber_${t}`, qty: 1, chance: 1 }],
  });
  ensureAction({
    id: `act_spin_yarn_t${t}`,
    name: `纺织${rawNames.yarn[t]}`,
    skillId: 'skill_tailor',
    duration: durationFor(t) - 4000,
    xp: gatherXp(t) - 5,
    requirements: { skillLevel: processLevel[t] },
    consumes: [{ itemId: `fiber_${t}`, qty: 5 }],
    yields: [{ itemId: `yarn_${t}`, qty: 1, chance: 1 }],
  });
});

// ---------- 技能树解锁节点 ----------
const treeUnlocks = [
  {
    professionId: 'woodcutter',
    node: {
      id: 'woodcutter_mythic_logging',
      name: '神话伐木',
      description: '砍伐星陨、创世、寰宇神木，制作终极板材。',
      requirements: { level: 125, prerequisites: [] },
      unlocks: { actions: ['act_chop_wood_t10', 'act_chop_wood_t11', 'act_chop_wood_t12', 'act_craft_lumber_t10', 'act_craft_lumber_t11', 'act_craft_lumber_t12'] },
    },
  },
  {
    professionId: 'blacksmith',
    node: {
      id: 'blacksmith_mythic_smelting',
      name: '神话冶炼',
      description: '开采神域神铁，冶炼神话级金属锭。',
      requirements: { level: 125, prerequisites: [] },
      unlocks: { actions: ['act_mine_ore_t10', 'act_mine_ore_t11', 'act_mine_ore_t12', 'act_smelt_ingot_t10', 'act_smelt_ingot_t11', 'act_smelt_ingot_t12'] },
    },
  },
  {
    professionId: 'alchemist',
    node: {
      id: 'alchemist_mythic_crystal',
      name: '神话采晶',
      description: '采集星陨、创世、寰宇神晶。',
      requirements: { level: 125, prerequisites: [] },
      unlocks: { actions: ['act_mine_crystal_t10', 'act_mine_crystal_t11', 'act_mine_crystal_t12'] },
    },
  },
  {
    professionId: 'tailor',
    node: {
      id: 'tailor_mythic_weaving',
      name: '神话纺织',
      description: '采集神域灵纤，纺织终极灵纱（含补齐 t8/t9）。',
      requirements: { level: 110, prerequisites: [] },
      unlocks: {
        actions: [
          'act_gather_fiber_t8', 'act_gather_fiber_t9', 'act_gather_fiber_t10', 'act_gather_fiber_t11', 'act_gather_fiber_t12',
          'act_spin_yarn_t8', 'act_spin_yarn_t9', 'act_spin_yarn_t10', 'act_spin_yarn_t11', 'act_spin_yarn_t12',
        ],
      },
    },
  },
];
treeUnlocks.forEach(({ professionId, node }) => {
  const tree = pack.professionTrees.find((t) => t.professionId === professionId);
  if (!tree) return;
  tree.skillNodes = tree.skillNodes || [];
  upsertById(tree.skillNodes, node);
});

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #11（神话采集经济）完成：');
console.log('  现总计 -> items:', pack.items.length, '| actions:', pack.actions.length);
console.log('  技能树节点:', pack.professionTrees.map((t) => t.professionId + ':' + t.skillNodes.length).join(' '));
