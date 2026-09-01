/**
 * 内容拓展脚本 #4：职业树高阶节点 + 新装备套装
 *
 * 1) 给相关职业树追加高阶节点，解锁脚本#3新增的动作：
 *    - blacksmith：霜寒/熔岩/神话锻造节点
 *    - alchemist ：高阶炼制 + 高阶水晶采集
 *    - chef      ：增益烹饪
 *    - woodcutter：高阶伐木
 * 2) 新增 3 套主题套装（霜寒/熔岩/神话），含 2/4/6 件套加成。
 *
 * 幂等：节点/套装按 id upsert。
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

function addTreeNode(professionId, node) {
  const tree = pack.professionTrees.find((t) => t.professionId === professionId);
  if (!tree) {
    console.warn('未找到职业树:', professionId);
    return;
  }
  upsertById(tree.skillNodes, node);
}

// ---------------- 铁匠高阶锻造节点 ----------------
const forgeArmorParts = ['head', 'chest', 'legs', 'feet', 'hands'];
function forgeActions(key) {
  return [
    `act_forge_${key}_blade`,
    `act_forge_${key}_shield`,
    ...forgeArmorParts.map((s) => `act_forge_${key}_${s}`),
    `act_forge_${key}_ring`,
  ];
}
addTreeNode('blacksmith', {
  id: 'blacksmith_frost_forging',
  name: '霜寒锻造',
  description: '掌握用霜寒材料打造冰系装备的工艺',
  requirements: { level: 50, prerequisites: ['blacksmith_master_forging'] },
  unlocks: { actions: forgeActions('frost') },
});
addTreeNode('blacksmith', {
  id: 'blacksmith_magma_forging',
  name: '熔岩锻造',
  description: '在烈焰中锤炼熔岩主题的强力装备',
  requirements: { level: 70, prerequisites: ['blacksmith_frost_forging'] },
  unlocks: { actions: forgeActions('magma') },
});
addTreeNode('blacksmith', {
  id: 'blacksmith_mythic_forging',
  name: '神话锻造',
  description: '传说中的锻造境界，铸就神话级装备',
  requirements: { level: 100, prerequisites: ['blacksmith_magma_forging'] },
  unlocks: { actions: forgeActions('myth') },
});

// ---------------- 炼金高阶节点 ----------------
addTreeNode('alchemist', {
  id: 'alchemist_advanced_brewing',
  name: '高阶炼金',
  description: '炼制各类强力增益药剂',
  requirements: { level: 20, prerequisites: [] },
  unlocks: {
    actions: [
      'act_brew_potion_craft_focus',
      'act_brew_potion_battle_fury',
      'act_brew_potion_fortune',
      'act_brew_potion_scholar',
    ],
  },
});
addTreeNode('alchemist', {
  id: 'alchemist_legendary_brewing',
  name: '传说炼金',
  description: '炼制传说灵药与采集顶级水晶',
  requirements: { level: 50, prerequisites: ['alchemist_advanced_brewing'] },
  unlocks: { actions: ['act_brew_elixir_legend', 'act_mine_crystal_t6', 'act_mine_crystal_t7'] },
});

// ---------------- 厨师增益烹饪节点 ----------------
addTreeNode('chef', {
  id: 'chef_buff_cooking',
  name: '增益烹饪',
  description: '烹饪能带来临时增益的料理',
  requirements: { level: 8, prerequisites: [] },
  unlocks: { actions: ['act_cook_food_hearty_stew', 'act_cook_food_master_feast'] },
});

// ---------------- 伐木工高阶节点 ----------------
addTreeNode('woodcutter', {
  id: 'woodcutter_legendary_cutting',
  name: '传说伐木',
  description: '采伐最为珍稀的神木',
  requirements: { level: 60, prerequisites: [] },
  unlocks: { actions: ['act_chop_wood_t6', 'act_chop_wood_t7'] },
});

// ---------------- 新装备套装 ----------------
function themeSet(key, prefix, tier, bonusBase) {
  return {
    id: `${key}_set`,
    name: `${prefix}套装`,
    profession: 'all',
    pieces: [
      { slot: 'main_hand', itemId: `weapon_${key}_blade` },
      { slot: 'off_hand', itemId: `offhand_${key}_shield` },
      { slot: 'head', itemId: `armor_${key}_head` },
      { slot: 'chest', itemId: `armor_${key}_chest` },
      { slot: 'legs', itemId: `armor_${key}_legs` },
      { slot: 'feet', itemId: `armor_${key}_feet` },
      { slot: 'hands', itemId: `armor_${key}_hands` },
      { slot: 'accessory', itemId: `accessory_${key}_ring` },
    ],
    bonuses: [
      {
        requiredPieces: 2,
        stats: { atk: bonusBase, def: bonusBase },
        description: `2件套：攻击+${bonusBase}，防御+${bonusBase}`,
      },
      {
        requiredPieces: 4,
        stats: { atk: bonusBase * 2, def: bonusBase * 2, combatSpeed: 5 },
        description: `4件套：攻击+${bonusBase * 2}，防御+${bonusBase * 2}，战斗速度+5%`,
      },
      {
        requiredPieces: 6,
        stats: { atk: bonusBase * 4, def: bonusBase * 4, combatSpeed: 10, goldGain: 10 },
        description: `6件套：攻击+${bonusBase * 4}，防御+${bonusBase * 4}，战斗速度+10%，金币+10%`,
      },
    ],
  };
}
[
  themeSet('frost', '霜寒', 5, 12),
  themeSet('magma', '熔岩', 6, 18),
  themeSet('myth', '神话', 7, 26),
].forEach((s) => upsertById(pack.equipmentSets, s));

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #4 完成：');
pack.professionTrees.forEach((t) => console.log('  职业树', t.professionId, '节点数:', t.skillNodes.length));
console.log('  套装总数:', pack.equipmentSets.length);
