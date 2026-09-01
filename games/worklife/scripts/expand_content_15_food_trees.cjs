/*
 * 扩展脚本 #15：鱼料理 + 农夫/厨师/裁缝技能树后期节点
 * - 新增烹饪鱼料理消耗品（消耗 #14 的生鱼）+ 对应 cook 动作
 * - 农夫技能树：高阶种植节点（解锁 act_plant_fiber_t5..t12）
 * - 厨师技能树：远洋垂钓 + 鱼料理大师 节点（解锁钓鱼 t3..t9 与鱼料理）
 * - 裁缝技能树：神话纺织已存在（t110），补一个终极节点
 * 幂等：按 id upsert
 */
const fs = require('fs');
const path = require('path');
const PACK_PATH = path.join(__dirname, '..', 'shared', 'enhanced_content_pack_chinese.json');
const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));

function upsertById(arr, item) {
  const i = arr.findIndex((x) => x.id === item.id);
  if (i >= 0) arr[i] = item;
  else arr.push(item);
}
function need(id) {
  if (!pack.items.some((x) => x.id === id) && !pack.actions.some((x) => x.id === id)) {
    throw new Error('引用不存在: ' + id);
  }
}
function getTree(pid) {
  const t = pack.professionTrees.find((x) => x.professionId === pid);
  if (!t) throw new Error('无职业树: ' + pid);
  return t;
}
function upsertNode(tree, node) {
  const i = tree.skillNodes.findIndex((n) => n.id === node.id);
  if (i >= 0) tree.skillNodes[i] = node;
  else tree.skillNodes.push(node);
}

const before = { items: pack.items.length, actions: pack.actions.length };

// ---------- 鱼料理：生鱼 -> 烤鱼消耗品（回血 food）----------
// 对应 #14 的 fish_lake..fish_dragon
const dishes = [
  { raw: 'fish_lake', lvl: 35, dish: 'dish_grilled_lake', name: '香烤湖鱼', hp: 200, tier: 3, dur: 18000, xp: 40 },
  { raw: 'fish_deepsea', lvl: 50, dish: 'dish_deepsea_stew', name: '深海浓汤', hp: 380, tier: 4, dur: 22000, xp: 50 },
  { raw: 'fish_abyss', lvl: 65, dish: 'dish_abyss_platter', name: '渊海拼盘', hp: 600, tier: 5, dur: 26000, xp: 60 },
  { raw: 'fish_frost', lvl: 80, dish: 'dish_frost_sashimi', name: '寒霜刺身', hp: 900, tier: 6, dur: 30000, xp: 70 },
  { raw: 'fish_lava', lvl: 100, dish: 'dish_lava_roast', name: '熔岩炙鱼', hp: 1400, tier: 7, dur: 38000, xp: 90 },
  { raw: 'fish_star', lvl: 110, dish: 'dish_star_feast', name: '星界鱼宴', hp: 2200, tier: 8, dur: 48000, xp: 110 },
  { raw: 'fish_dragon', lvl: 120, dish: 'dish_dragon_delicacy', name: '龙渊珍馐', hp: 3500, tier: 9, dur: 58000, xp: 140 },
];
const dishActionIds = [];
for (const d of dishes) {
  need(d.raw);
  upsertById(pack.items, {
    id: d.dish,
    name: d.name,
    type: 'consumable',
    tier: d.tier,
    effect: { hp: d.hp },
    description: `以${pack.items.find((i) => i.id === d.raw).name}烹制，恢复${d.hp}点生命值。`,
  });
  const aid = `act_cook_${d.dish}`;
  upsertById(pack.actions, {
    id: aid,
    name: `烹饪${d.name}`,
    skillId: 'skill_chef',
    duration: d.dur,
    xp: d.xp,
    requirements: { skillLevel: d.lvl },
    consumes: [{ itemId: d.raw, qty: 2 }],
    yields: [{ itemId: d.dish, qty: 1, chance: 1 }],
  });
  dishActionIds.push(aid);
}

// ---------- 农夫技能树：高阶/神话种植 ----------
const farmer = getTree('farmer');
upsertNode(farmer, {
  id: 'farmer_expert_planting',
  name: '专家种植',
  description: '种植星辰棉、虚空麻、神圣灵草等高阶纤维作物。',
  requirements: { level: 65, prerequisites: ['farmer_master_planting'] },
  unlocks: { actions: ['act_plant_fiber_t5', 'act_plant_fiber_t6', 'act_plant_fiber_t7'] },
});
upsertNode(farmer, {
  id: 'farmer_legend_planting',
  name: '传说种植',
  description: '种植星辉、神纹等传说级灵草。',
  requirements: { level: 110, prerequisites: ['farmer_expert_planting'] },
  unlocks: { actions: ['act_plant_fiber_t8', 'act_plant_fiber_t9'] },
});
upsertNode(farmer, {
  id: 'farmer_mythic_planting',
  name: '神话种植',
  description: '于神域沃土培育星陨、创世、寰宇级梵草，万物始于一粒种。',
  requirements: { level: 125, prerequisites: ['farmer_legend_planting'] },
  unlocks: { actions: ['act_plant_fiber_t10', 'act_plant_fiber_t11', 'act_plant_fiber_t12'] },
});

// ---------- 厨师技能树：远洋垂钓 + 鱼料理大师 ----------
const chef = getTree('chef');
upsertNode(chef, {
  id: 'chef_ocean_fishing',
  name: '远洋垂钓',
  description: '解锁湖泊、深海乃至龙渊的高阶垂钓。',
  requirements: { level: 35, prerequisites: ['chef_shrimp_fishing'] },
  unlocks: { actions: ['act_fish_t3', 'act_fish_t4', 'act_fish_t5', 'act_fish_t6', 'act_fish_t7', 'act_fish_t8', 'act_fish_t9'] },
});
upsertNode(chef, {
  id: 'chef_seafood_master',
  name: '海鲜料理大师',
  description: '将渔获烹制为香烤湖鱼到龙渊珍馐等顶级海鲜料理。',
  requirements: { level: 60, prerequisites: ['chef_ocean_fishing'] },
  unlocks: { actions: dishActionIds },
});

// ---------- 裁缝技能树：终极节点 ----------
const tailor = getTree('tailor');
upsertNode(tailor, {
  id: 'tailor_omega_weaving',
  name: '寰宇织造',
  description: '掌握寰宇梵丝的织造之法，编织超越时空的华服。',
  requirements: { level: 140, prerequisites: ['tailor_mythic_weaving'] },
  unlocks: { actions: ['act_gather_fiber_t12', 'act_spin_yarn_t12'] },
});

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');
const after = { items: pack.items.length, actions: pack.actions.length };
console.log('扩展 #15 完成 food/trees');
console.log('items', before.items, '->', after.items);
console.log('actions', before.actions, '->', after.actions);
['farmer', 'chef', 'tailor'].forEach((pid) => {
  const t = getTree(pid);
  const max = Math.max(...t.skillNodes.map((n) => n.requirements.level));
  console.log(pid, 'nodes=' + t.skillNodes.length, 'maxLvl=' + max);
});
