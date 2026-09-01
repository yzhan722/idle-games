/**
 * 内容拓展脚本 #12：神话装备制作配方
 *
 * 铁匠锻造：炼狱/创世/终焉系武器与护甲（消耗对应 ingot + 区域掉落材料）
 * 炼金/裁缝：法杖类与饰品（消耗 crystal + 区域掉落材料）
 * 并新增技能树节点解锁这些配方。
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
const ensureAction = (a) => upsertById(pack.actions, a);
const itemIds = new Set(pack.items.map((i) => i.id));
function assertItems(ids) {
  ids.forEach((id) => { if (!itemIds.has(id)) throw new Error('缺少物品: ' + id); });
}

// craft 配方定义: {id, name, skill, level, consumes:[[id,qty]...], yieldId}
const recipes = [
  // 炼狱魔神套 tier10（铁匠）
  { id: 'act_forge_hellfire_greatsword', name: '锻造炼狱业火巨剑', skill: 'skill_blacksmith', level: 127, consumes: [['ingot_10', 8], ['hellfire_ember', 4], ['infernal_core', 1]], yieldId: 'weapon_hellfire_greatsword' },
  { id: 'act_forge_hellfire_helm', name: '锻造炼狱魔神头盔', skill: 'skill_blacksmith', level: 127, consumes: [['ingot_10', 6], ['hellfire_ember', 3]], yieldId: 'armor_hellfire_helm' },
  { id: 'act_forge_hellfire_chest', name: '锻造炼狱魔神胸甲', skill: 'skill_blacksmith', level: 129, consumes: [['ingot_10', 8], ['infernal_core', 2]], yieldId: 'armor_hellfire_chest' },
  { id: 'act_forge_hellfire_legs', name: '锻造炼狱魔神腿甲', skill: 'skill_blacksmith', level: 128, consumes: [['ingot_10', 7], ['damned_soul', 3]], yieldId: 'armor_hellfire_legs' },
  // 创世神套 tier11（铁匠）
  { id: 'act_forge_genesis_blade', name: '锻造创世神剑', skill: 'skill_blacksmith', level: 137, consumes: [['ingot_11', 8], ['genesis_light', 4], ['divine_essence', 1]], yieldId: 'weapon_genesis_blade' },
  { id: 'act_forge_genesis_god_helm', name: '锻造创世神冠', skill: 'skill_blacksmith', level: 137, consumes: [['ingot_11', 6], ['genesis_light', 3]], yieldId: 'armor_genesis_god_helm' },
  { id: 'act_forge_genesis_god_chest', name: '锻造创世神铠', skill: 'skill_blacksmith', level: 139, consumes: [['ingot_11', 8], ['divine_essence', 2]], yieldId: 'armor_genesis_god_chest' },
  { id: 'act_forge_genesis_god_legs', name: '锻造创世神胫甲', skill: 'skill_blacksmith', level: 138, consumes: [['ingot_11', 7], ['creation_seed', 2]], yieldId: 'armor_genesis_god_legs' },
  // 万界终焉套 tier12（铁匠）
  { id: 'act_forge_omega_destroyer', name: '锻造万界终焉之刃', skill: 'skill_blacksmith', level: 147, consumes: [['ingot_12', 10], ['omega_fragment', 4], ['cosmos_essence', 2]], yieldId: 'weapon_omega_destroyer' },
  { id: 'act_forge_omega_helm', name: '锻造万界终焉头冠', skill: 'skill_blacksmith', level: 147, consumes: [['ingot_12', 7], ['omega_fragment', 3]], yieldId: 'armor_omega_helm' },
  { id: 'act_forge_omega_chest', name: '锻造万界终焉胸铠', skill: 'skill_blacksmith', level: 149, consumes: [['ingot_12', 10], ['eternity_crystal', 2]], yieldId: 'armor_omega_chest' },
  { id: 'act_forge_omega_legs', name: '锻造万界终焉护腿', skill: 'skill_blacksmith', level: 148, consumes: [['ingot_12', 8], ['cosmos_essence', 2]], yieldId: 'armor_omega_legs' },
  // 法杖 / 镰刀 / 权杖（炼金）
  { id: 'act_craft_doom_scythe', name: '炼制末日收割镰', skill: 'skill_alchemist', level: 128, consumes: [['crystal_10', 6], ['damned_soul', 4]], yieldId: 'weapon_doom_scythe' },
  { id: 'act_craft_divine_scepter', name: '炼制神性权杖', skill: 'skill_alchemist', level: 138, consumes: [['crystal_11', 6], ['divine_essence', 3]], yieldId: 'weapon_divine_scepter' },
  { id: 'act_craft_cosmos_staff', name: '炼制寰宇创生杖', skill: 'skill_alchemist', level: 148, consumes: [['crystal_12', 8], ['cosmos_essence', 3]], yieldId: 'weapon_cosmos_staff' },
  // 饰品（炼金）
  { id: 'act_craft_hellfire_ring', name: '炼制炼狱魔戒', skill: 'skill_alchemist', level: 127, consumes: [['crystal_10', 4], ['hellfire_ember', 2]], yieldId: 'hellfire_ring' },
  { id: 'act_craft_damned_amulet', name: '炼制堕魂护符', skill: 'skill_alchemist', level: 128, consumes: [['crystal_10', 4], ['damned_soul', 2]], yieldId: 'damned_amulet' },
  { id: 'act_craft_genesis_pendant', name: '炼制创世吊坠', skill: 'skill_alchemist', level: 137, consumes: [['crystal_11', 4], ['creation_seed', 1]], yieldId: 'genesis_pendant' },
  { id: 'act_craft_divine_ring', name: '炼制神性指环', skill: 'skill_alchemist', level: 138, consumes: [['crystal_11', 4], ['divine_essence', 1]], yieldId: 'divine_ring' },
  { id: 'act_craft_omega_crown', name: '炼制终焉王冠', skill: 'skill_alchemist', level: 148, consumes: [['crystal_12', 6], ['omega_fragment', 2]], yieldId: 'omega_crown' },
  { id: 'act_craft_eternity_amulet', name: '炼制永恒护符', skill: 'skill_alchemist', level: 149, consumes: [['crystal_12', 6], ['eternity_crystal', 1]], yieldId: 'eternity_amulet' },
];

// 校验所有引用的物品 id 都存在
recipes.forEach((r) => {
  assertItems(r.consumes.map((c) => c[0]));
  assertItems([r.yieldId]);
});

recipes.forEach((r) => {
  ensureAction({
    id: r.id,
    name: r.name,
    skillId: r.skill,
    duration: 30000 + (r.level - 127) * 1200,
    xp: 200 + (r.level - 127) * 12,
    requirements: { skillLevel: r.level },
    consumes: r.consumes.map(([itemId, qty]) => ({ itemId, qty })),
    yields: [{ itemId: r.yieldId, qty: 1, chance: 1 }],
  });
});

// ---------- 技能树节点 ----------
const nodes = [
  {
    professionId: 'blacksmith',
    node: {
      id: 'blacksmith_hellfire_forging', name: '炼狱锻造',
      description: '驾驭炼狱业火锻造炼狱魔神套装。',
      requirements: { level: 127, prerequisites: ['blacksmith_mythic_smelting'] },
      unlocks: { actions: ['act_forge_hellfire_greatsword', 'act_forge_hellfire_helm', 'act_forge_hellfire_chest', 'act_forge_hellfire_legs'] },
    },
  },
  {
    professionId: 'blacksmith',
    node: {
      id: 'blacksmith_genesis_god_forging', name: '创世神锻造',
      description: '以创世之光锻造创世神套装。',
      requirements: { level: 137, prerequisites: ['blacksmith_hellfire_forging'] },
      unlocks: { actions: ['act_forge_genesis_blade', 'act_forge_genesis_god_helm', 'act_forge_genesis_god_chest', 'act_forge_genesis_god_legs'] },
    },
  },
  {
    professionId: 'blacksmith',
    node: {
      id: 'blacksmith_omega_forging', name: '终焉锻造',
      description: '抵达锻造的绝对终点——万界终焉套装。',
      requirements: { level: 147, prerequisites: ['blacksmith_genesis_god_forging'] },
      unlocks: { actions: ['act_forge_omega_destroyer', 'act_forge_omega_helm', 'act_forge_omega_chest', 'act_forge_omega_legs'] },
    },
  },
  {
    professionId: 'alchemist',
    node: {
      id: 'alchemist_mythic_artificing', name: '神话炼器',
      description: '炼制神话级法杖与饰品。',
      requirements: { level: 127, prerequisites: ['alchemist_mythic_crystal'] },
      unlocks: {
        actions: [
          'act_craft_doom_scythe', 'act_craft_divine_scepter', 'act_craft_cosmos_staff',
          'act_craft_hellfire_ring', 'act_craft_damned_amulet', 'act_craft_genesis_pendant',
          'act_craft_divine_ring', 'act_craft_omega_crown', 'act_craft_eternity_amulet',
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

console.log('内容拓展 #12（神话装备制作）完成：');
console.log('  新增配方:', recipes.length);
console.log('  现总计 -> actions:', pack.actions.length);
console.log('  技能树节点:', pack.professionTrees.map((t) => t.professionId + ':' + t.skillNodes.length).join(' '));
