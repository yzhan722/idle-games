/**
 * 内容拓展脚本 #13：神话消耗品（恢复 + 增益）+ 制作配方
 *
 * 恢复类：高阶料理/药水（恢复大量 hp/mp）
 * 增益类：终极 buff（采集/制作/战斗/经验/金币 多维加成）
 * 同时新增厨师/炼金的制作配方与技能树节点。
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

// ---------- 恢复类消耗品 ----------
const heals = [
  { id: 'food_royal_banquet', name: '皇家盛宴', tier: 7, effect: { hp: 3000 }, description: '恢复3000点生命值的皇家级料理。' },
  { id: 'food_divine_feast', name: '神域飨宴', tier: 8, effect: { hp: 6000 }, description: '恢复6000点生命值的神域级飨宴。' },
  { id: 'food_cosmos_banquet', name: '寰宇至味', tier: 9, effect: { hp: 12000, mp: 3000 }, description: '恢复12000点生命与3000点魔法的终极盛宴。' },
  { id: 'drink_arcane', name: '奥术灵泉', tier: 7, effect: { mp: 2000 }, description: '恢复2000点魔法值的奥术之泉。' },
  { id: 'drink_divine', name: '神性甘露', tier: 8, effect: { mp: 5000 }, description: '恢复5000点魔法值的神性甘露。' },
];
heals.forEach((h) => ensureItem({ id: h.id, name: h.name, type: 'consumable', tier: h.tier, effect: h.effect, description: h.description }));

// ---------- 增益类消耗品 ----------
function buffItem(id, name, tier, buffId, buffName, durationSec, multipliers, desc) {
  return {
    id, name, type: 'consumable', tier,
    effect: { buff: { id: buffId, name: buffName, durationSec, multipliers } },
    description: desc,
  };
}
const buffs = [
  buffItem('elixir_mythic', '神话灵药', 10, 'buff_mythic', '神话加持', 2400,
    { gatherSpeed: 1.4, craftSpeed: 1.4, combatSpeed: 1.4, xpGain: 1.4, goldGain: 1.4 },
    '饮用后 40 分钟内全速度 +40%、全经验 +40%、金币 +40%。'),
  buffItem('elixir_genesis', '创世灵药', 11, 'buff_genesis_elixir', '创世之力', 3000,
    { gatherSpeed: 1.6, craftSpeed: 1.6, combatSpeed: 1.6, xpGain: 1.6, goldGain: 1.6 },
    '饮用后 50 分钟内全速度 +60%、全经验 +60%、金币 +60%。'),
  buffItem('elixir_omega', '终焉灵药', 12, 'buff_omega_elixir', '万界加持', 3600,
    { gatherSpeed: 2.0, craftSpeed: 2.0, combatSpeed: 2.0, xpGain: 2.0, goldGain: 2.0 },
    '饮用后 60 分钟内全速度翻倍、全经验翻倍、金币翻倍（万界之力）。'),
  buffItem('potion_berserk', '狂战药剂', 9, 'buff_berserk', '狂战', 1200,
    { combatSpeed: 1.8, goldGain: 1.3 },
    '饮用后 20 分钟内战斗速度 +80%、金币 +30%。'),
  buffItem('potion_artisan', '巧匠药剂', 9, 'buff_artisan', '巧匠', 1800,
    { craftSpeed: 1.8, xpGain: 1.4 },
    '饮用后 30 分钟内制作速度 +80%、经验 +40%。'),
  buffItem('potion_harvest', '丰饶药剂', 9, 'buff_harvest', '丰饶', 1800,
    { gatherSpeed: 1.8, goldGain: 1.4 },
    '饮用后 30 分钟内采集速度 +80%、金币 +40%。'),
];
buffs.forEach(ensureItem);

// ---------- 制作配方（厨师 / 炼金）----------
const itemIds = new Set(pack.items.map((i) => i.id));
function need(id) { if (!itemIds.has(id)) throw new Error('缺少物品: ' + id); }

const recipes = [
  // 厨师：高阶料理（消耗高阶鱼/作物 + 神域材料近似——这里用通用基础材料保证可制作）
  { id: 'act_cook_royal_banquet', name: '烹饪皇家盛宴', skill: 'skill_chef', level: 100, consumes: [['fish_sea', 5], ['food_master_feast', 1]], yieldId: 'food_royal_banquet' },
  { id: 'act_cook_divine_feast', name: '烹饪神域飨宴', skill: 'skill_chef', level: 115, consumes: [['food_royal_banquet', 2], ['celestial_feather', 1]], yieldId: 'food_divine_feast' },
  { id: 'act_cook_cosmos_banquet', name: '烹饪寰宇至味', skill: 'skill_chef', level: 130, consumes: [['food_divine_feast', 2], ['genesis_light', 1]], yieldId: 'food_cosmos_banquet' },
  { id: 'act_brew_arcane_drink', name: '调制奥术灵泉', skill: 'skill_chef', level: 100, consumes: [['crystal_7', 2]], yieldId: 'drink_arcane' },
  { id: 'act_brew_divine_drink', name: '调制神性甘露', skill: 'skill_chef', level: 120, consumes: [['crystal_9', 2]], yieldId: 'drink_divine' },
  // 炼金：增益灵药
  { id: 'act_brew_elixir_mythic', name: '炼制神话灵药', skill: 'skill_alchemist', level: 125, consumes: [['crystal_10', 3], ['infernal_core', 1]], yieldId: 'elixir_mythic' },
  { id: 'act_brew_elixir_genesis', name: '炼制创世灵药', skill: 'skill_alchemist', level: 135, consumes: [['crystal_11', 3], ['genesis_light', 1]], yieldId: 'elixir_genesis' },
  { id: 'act_brew_elixir_omega', name: '炼制终焉灵药', skill: 'skill_alchemist', level: 145, consumes: [['crystal_12', 4], ['cosmos_essence', 1]], yieldId: 'elixir_omega' },
  { id: 'act_brew_potion_berserk', name: '炼制狂战药剂', skill: 'skill_alchemist', level: 120, consumes: [['crystal_9', 2], ['demon_horn', 1]], yieldId: 'potion_berserk' },
  { id: 'act_brew_potion_artisan', name: '炼制巧匠药剂', skill: 'skill_alchemist', level: 120, consumes: [['crystal_9', 2], ['ingot_8', 1]], yieldId: 'potion_artisan' },
  { id: 'act_brew_potion_harvest', name: '炼制丰饶药剂', skill: 'skill_alchemist', level: 120, consumes: [['crystal_9', 2], ['wood_8', 1]], yieldId: 'potion_harvest' },
];
recipes.forEach((r) => { r.consumes.forEach((c) => need(c[0])); need(r.yieldId); });
recipes.forEach((r) => {
  ensureAction({
    id: r.id, name: r.name, skillId: r.skill,
    duration: 20000 + (r.level - 100) * 500,
    xp: 120 + (r.level - 100) * 6,
    requirements: { skillLevel: r.level },
    consumes: r.consumes.map(([itemId, qty]) => ({ itemId, qty })),
    yields: [{ itemId: r.yieldId, qty: 1, chance: 1 }],
  });
});

// ---------- 技能树节点 ----------
const nodes = [
  {
    professionId: 'chef',
    node: {
      id: 'chef_mythic_cuisine', name: '神话料理',
      description: '烹饪皇家盛宴、神域飨宴、寰宇至味等终极料理。',
      requirements: { level: 100, prerequisites: [] },
      unlocks: { actions: ['act_cook_royal_banquet', 'act_cook_divine_feast', 'act_cook_cosmos_banquet', 'act_brew_arcane_drink', 'act_brew_divine_drink'] },
    },
  },
  {
    professionId: 'alchemist',
    node: {
      id: 'alchemist_mythic_elixir', name: '神话炼药',
      description: '炼制神话、创世、终焉级增益灵药与专精药剂。',
      requirements: { level: 120, prerequisites: ['alchemist_mythic_crystal'] },
      unlocks: {
        actions: [
          'act_brew_elixir_mythic', 'act_brew_elixir_genesis', 'act_brew_elixir_omega',
          'act_brew_potion_berserk', 'act_brew_potion_artisan', 'act_brew_potion_harvest',
        ],
      },
    },
  },
];
nodes.forEach(({ professionId, node }) => {
  const tree = pack.professionTrees.find((t) => t.professionId === professionId);
  if (!tree) return;
  tree.skillNodes = tree.skillNodes || [];
  upsertById(tree.skillNodes, node);
});

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #13（神话消耗品）完成：');
console.log('  新增恢复品:', heals.length, '| 增益品:', buffs.length, '| 配方:', recipes.length);
console.log('  现总计 -> items:', pack.items.length, '| actions:', pack.actions.length);
console.log('  技能树节点:', pack.professionTrees.map((t) => t.professionId + ':' + t.skillNodes.length).join(' '));
