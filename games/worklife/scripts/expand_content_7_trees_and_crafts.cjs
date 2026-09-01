/**
 * 内容拓展脚本 #7：终局制作动作 + 全职业技能树加深（修订版）
 *
 * A) 为脚本 #6 的 tier8/9 装备补齐制作动作，消耗脚本 #5 的终局材料，形成产出闭环。
 * B) 加深技能树：补齐大量"存在却无节点解锁"的孤儿动作，并接上新的终局制作节点。
 *    （已核对现有节点 id，避免覆盖既有 frost/magma/myth/legendary 等节点）
 *
 * 幂等：动作与节点均按 id upsert。新增节点一律使用全新 id，不与既有冲突。
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
const actionExists = (id) => pack.actions.some((a) => a.id === id);

function craft(id, name, skillId, skillLevel, duration, xp, consumes, outId) {
  return { id, name, skillId, duration, xp, requirements: { skillLevel }, consumes, yields: [{ itemId: outId, qty: 1, chance: 1 }] };
}

// ========== A) 终局装备制作动作 ==========
const endgameCrafts = [
  craft('act_forge_void_blade', '锻造虚空裂刃', 'skill_blacksmith', 65, 20000, 240,
    [{ itemId: 'ingot_7', qty: 6 }, { itemId: 'void_shard', qty: 4 }], 'weapon_void_blade'),
  craft('act_forge_void_chest', '锻造虚空胸甲', 'skill_blacksmith', 66, 21000, 250,
    [{ itemId: 'ingot_7', qty: 5 }, { itemId: 'abyss_core', qty: 3 }], 'armor_void_chest'),
  craft('act_forge_void_legs', '锻造虚空护腿', 'skill_blacksmith', 66, 19000, 230,
    [{ itemId: 'ingot_7', qty: 4 }, { itemId: 'shadow_silk', qty: 4 }], 'armor_void_legs'),
  craft('act_forge_void_helm', '锻造虚空头盔', 'skill_blacksmith', 67, 18000, 220,
    [{ itemId: 'ingot_7', qty: 4 }, { itemId: 'void_shard', qty: 2 }], 'armor_void_helm'),
  craft('act_forge_celestial_spear', '锻造天罚圣枪', 'skill_blacksmith', 85, 26000, 360,
    [{ itemId: 'ingot_7', qty: 8 }, { itemId: 'holy_gold', qty: 4 }, { itemId: 'celestial_feather', qty: 3 }], 'weapon_celestial_spear'),
  craft('act_forge_genesis_chest', '锻造创世胸甲', 'skill_blacksmith', 95, 30000, 420,
    [{ itemId: 'ingot_7', qty: 10 }, { itemId: 'holy_gold', qty: 5 }, { itemId: 'space_essence', qty: 3 }], 'armor_genesis_chest'),
  craft('act_forge_genesis_legs', '锻造创世护腿', 'skill_blacksmith', 95, 28000, 400,
    [{ itemId: 'ingot_7', qty: 8 }, { itemId: 'rift_crystal', qty: 4 }], 'armor_genesis_legs'),
  craft('act_forge_genesis_helm', '锻造创世头盔', 'skill_blacksmith', 96, 27000, 390,
    [{ itemId: 'ingot_7', qty: 7 }, { itemId: 'sovereign_heart', qty: 1 }, { itemId: 'rift_crystal', qty: 2 }], 'armor_genesis_helm'),
  craft('act_craft_shadow_bow', '编织暗影长弓', 'skill_alchemist', 65, 19000, 240,
    [{ itemId: 'crystal_7', qty: 3 }, { itemId: 'shadow_silk', qty: 6 }], 'weapon_shadow_bow'),
  craft('act_craft_genesis_staff', '凝铸创世法杖', 'skill_alchemist', 95, 30000, 420,
    [{ itemId: 'crystal_7', qty: 8 }, { itemId: 'space_essence', qty: 4 }, { itemId: 'chrono_dust', qty: 3 }], 'weapon_genesis_staff'),
  craft('act_craft_void_amulet', '镶嵌虚空护符', 'skill_alchemist', 68, 18000, 230,
    [{ itemId: 'crystal_7', qty: 2 }, { itemId: 'void_crown', qty: 1 }], 'void_amulet'),
  craft('act_craft_celestial_ring', '熔铸天界圣戒', 'skill_alchemist', 88, 24000, 360,
    [{ itemId: 'crystal_7', qty: 4 }, { itemId: 'fallen_halo', qty: 1 }], 'celestial_ring'),
  craft('act_craft_chrono_pendant', '雕琢时之吊坠', 'skill_alchemist', 95, 28000, 400,
    [{ itemId: 'crystal_7', qty: 6 }, { itemId: 'chrono_dust', qty: 4 }], 'chrono_pendant'),
  craft('act_craft_sovereign_crown', '加冕主宰王冠', 'skill_alchemist', 100, 35000, 500,
    [{ itemId: 'crystal_7', qty: 10 }, { itemId: 'sovereign_heart', qty: 1 }, { itemId: 'angel_tear', qty: 2 }], 'sovereign_crown'),
];
endgameCrafts.forEach(ensureAction);

// ========== B) 技能树加深（仅新增全新 id 节点，且仅解锁确实存在的动作）==========
function addNode(professionId, id, name, description, level, prereqs, actions) {
  const t = pack.professionTrees.find((x) => x.professionId === professionId);
  if (!t) return;
  const valid = actions.filter(actionExists);
  upsertById(t.skillNodes, { id, name, description, requirements: { level, prerequisites: prereqs }, unlocks: { actions: valid } });
}

// --- 伐木工：补中段采集/木料/斧/铁甲（这些动作此前无节点解锁）---
addNode('woodcutter', 'woodcutter_mid_cutting', '进阶伐木', '解锁中段树木与木料加工。', 35, ['woodcutter_advanced_cutting'],
  ['act_chop_wood_t3', 'act_chop_wood_t4', 'act_chop_wood_t5', 'act_craft_lumber_t3', 'act_craft_lumber_t4', 'act_craft_lumber_t5', 'act_craft_logging_axe_t3']);
addNode('woodcutter', 'woodcutter_iron_armor_set', '铁制伐木装备', '为伐木工锻造铁制防具套装。', 45, ['woodcutter_armor_crafting'],
  ['act_craft_woodcutter_iron_chest', 'act_craft_woodcutter_iron_legs', 'act_craft_woodcutter_iron_boots', 'act_craft_woodcutter_iron_gloves']);

// --- 铁匠：补基础铁/钢锻造孤儿动作 + 新的虚空/创世节点 ---
addNode('blacksmith', 'blacksmith_iron_smithing', '铁器锻造', '锻造铁制武器、护甲与工具。', 12, ['blacksmith_armor_forging'],
  ['act_forge_weapon_iron_sword', 'act_forge_weapon_steel_axe', 'act_forge_hammer_t1', 'act_forge_hammer_t2', 'act_forge_shield_t1', 'act_forge_shield_t2', 'act_forge_iron_chest', 'act_forge_iron_legs', 'act_forge_iron_boots', 'act_forge_iron_gloves', 'act_forge_blacksmith_iron_chest', 'act_forge_blacksmith_iron_legs', 'act_forge_blacksmith_iron_boots', 'act_forge_blacksmith_iron_gloves']);
addNode('blacksmith', 'blacksmith_void_forging', '虚空锻造', '驾驭虚空之力锻造虚空套装。', 65, ['blacksmith_mythic_forging'],
  ['act_forge_void_blade', 'act_forge_void_chest', 'act_forge_void_legs', 'act_forge_void_helm']);
addNode('blacksmith', 'blacksmith_genesis_forging', '创世锻造', '抵达锻造的终点——创世主宰套装。', 95, ['blacksmith_void_forging'],
  ['act_forge_celestial_spear', 'act_forge_genesis_chest', 'act_forge_genesis_legs', 'act_forge_genesis_helm']);

// --- 农夫：补高阶种植 + 布甲（孤儿动作）---
addNode('farmer', 'farmer_master_planting', '宗师种植', '种植蚕丝与魔法作物。', 30, ['farmer_advanced_planting'],
  ['act_plant_silk_t3', 'act_plant_magic_t4']);
addNode('farmer', 'farmer_cloth_armor', '农夫布甲', '缝制农夫专属布甲。', 35, ['farmer_advanced_planting'],
  ['act_craft_farmer_cloth_chest', 'act_craft_farmer_cloth_legs', 'act_craft_farmer_cloth_boots', 'act_craft_farmer_cloth_gloves']);

// --- 厨师：补捕虾 + 厨师皮甲（孤儿动作）---
addNode('chef', 'chef_shrimp_fishing', '近海捕捞', '在浅滩捕捞鲜虾。', 12, ['chef_basic_cooking'],
  ['act_fish_shrimp_t1']);
addNode('chef', 'chef_leather_armor', '厨师皮甲', '制作厨师专属皮甲。', 40, ['chef_advanced_cooking'],
  ['act_craft_chef_leather_chest', 'act_craft_chef_leather_legs', 'act_craft_chef_leather_boots', 'act_craft_chef_leather_gloves']);

// --- 裁缝：补裁缝专属皮甲（孤儿动作）---
addNode('tailor', 'tailor_leather_specialist', '裁缝皮甲精通', '鞣制裁缝专属高阶皮甲。', 45, ['tailor_master_processing'],
  ['act_craft_tailor_leather_chest', 'act_craft_tailor_leather_legs', 'act_craft_tailor_leather_boots', 'act_craft_tailor_leather_gloves']);

// --- 炼金：补基础水晶/瓶子/布袍（孤儿动作）+ 新终局造物节点 ---
addNode('alchemist', 'alchemist_crystal_basics', '水晶开采', '开采基础与中阶能量水晶，并制作炼金瓶。', 8, ['alchemist_basic_brewing'],
  ['act_mine_crystal_t1', 'act_mine_crystal_t2', 'act_craft_alchemy_bottle_t1', 'act_craft_alchemy_bottle_t2']);
addNode('alchemist', 'alchemist_cloth_robe', '炼金布袍', '缝制炼金术士专属布袍。', 30, ['alchemist_advanced_brewing'],
  ['act_craft_alchemist_cloth_robe', 'act_craft_alchemist_cloth_legs', 'act_craft_alchemist_cloth_boots', 'act_craft_alchemist_cloth_gloves']);
addNode('alchemist', 'alchemist_genesis_craft', '创世炼成', '以时空材料炼成终局法器与饰品。', 95, ['alchemist_legendary_brewing'],
  ['act_craft_shadow_bow', 'act_craft_genesis_staff', 'act_craft_void_amulet', 'act_craft_celestial_ring', 'act_craft_chrono_pendant', 'act_craft_sovereign_crown']);

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #7（终局制作 + 技能树加深）完成：');
console.log('  新增终局制作动作:', endgameCrafts.length);
pack.professionTrees.forEach((t) => console.log('  树', t.professionId, '节点数 ->', t.skillNodes.length));
console.log('  现总计 -> actions:', pack.actions.length);
