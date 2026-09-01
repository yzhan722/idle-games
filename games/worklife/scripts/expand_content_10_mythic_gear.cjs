/**
 * 内容拓展脚本 #10：神话终局装备（tier 10/11/12）
 *
 * 武器：6 把（炼狱/创世/终焉系，atk 沿用既有曲线继续上探）
 * 护甲：9 件（每套 head/chest/legs 3 件，共 3 套）
 * 饰品：6 件
 * 套装：3 套（炼狱魔神套、创世神套、万界终焉套）
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
const ensureItem = (item) => upsertById(pack.items, item);
const ensureSet = (s) => upsertById(pack.equipmentSets, s);

// ---------- 武器 tier 10/11/12 ----------
const weapons = [
  { id: 'weapon_hellfire_greatsword', name: '炼狱业火巨剑', type: 'weapon', tier: 10, atk: 240, description: '以炼狱余烬熔铸的巨剑，挥砍时拖曳着不灭业火。' },
  { id: 'weapon_doom_scythe', name: '末日收割镰', type: 'weapon', tier: 10, atk: 220, description: '收割灵魂的死神之镰，所斩之物魂飞魄散。' },
  { id: 'weapon_genesis_blade', name: '创世神剑', type: 'weapon', tier: 11, atk: 320, description: '以创世之光淬炼的神剑，一剑可开天辟地。' },
  { id: 'weapon_divine_scepter', name: '神性权杖', type: 'weapon', tier: 11, atk: 200, description: '凝聚神性精华的权杖，挥动间号令风暴与雷霆。' },
  { id: 'weapon_omega_destroyer', name: '万界终焉之刃', type: 'weapon', tier: 12, atk: 440, description: '能斩断万界因果的终极之刃，一击湮灭世界。' },
  { id: 'weapon_cosmos_staff', name: '寰宇创生杖', type: 'weapon', tier: 12, atk: 260, description: '掌握寰宇创生之力的法杖，可重塑现实法则。' },
];
weapons.forEach(ensureItem);

// ---------- 护甲 tier 10/11/12 ----------
const armors = [
  // 炼狱魔神套 tier 10
  { id: 'armor_hellfire_helm', name: '炼狱魔神头盔', type: 'armor', tier: 10, def: 130, slot: 'head', description: '炼狱魔神的头盔，双眸燃烧着不灭的业火。' },
  { id: 'armor_hellfire_chest', name: '炼狱魔神胸甲', type: 'armor', tier: 10, def: 160, slot: 'chest', description: '以炼狱之核镶嵌的胸甲，将伤害化为业火反噬。' },
  { id: 'armor_hellfire_legs', name: '炼狱魔神腿甲', type: 'armor', tier: 10, def: 140, slot: 'legs', description: '踏过万千亡魂的魔神腿甲，每步都灼烧大地。' },
  // 创世神套 tier 11
  { id: 'armor_genesis_god_helm', name: '创世神冠', type: 'armor', tier: 11, def: 175, slot: 'head', description: '创世之神的王冠，散发着开天辟地的圣辉。' },
  { id: 'armor_genesis_god_chest', name: '创世神铠', type: 'armor', tier: 11, def: 210, slot: 'chest', description: '以神性精华锻造的神铠，凡间武器无法划伤。' },
  { id: 'armor_genesis_god_legs', name: '创世神胫甲', type: 'armor', tier: 11, def: 185, slot: 'legs', description: '承载创世之力的胫甲，行走间重塑脚下世界。' },
  // 万界终焉套 tier 12
  { id: 'armor_omega_helm', name: '万界终焉头冠', type: 'armor', tier: 12, def: 230, slot: 'head', description: '凝结万界终焉之力的头冠，洞察一切世界的命运。' },
  { id: 'armor_omega_chest', name: '万界终焉胸铠', type: 'armor', tier: 12, def: 280, slot: 'chest', description: '以终焉碎片铸成的胸铠，立于世界终焉而不灭。' },
  { id: 'armor_omega_legs', name: '万界终焉护腿', type: 'armor', tier: 12, def: 245, slot: 'legs', description: '超越生死与时空的护腿，承载寰宇的重量。' },
];
armors.forEach(ensureItem);

// ---------- 饰品 tier 10/11/12 ----------
const accessories = [
  { id: 'hellfire_ring', name: '炼狱魔戒', type: 'accessory', tier: 10, atk: 45, def: 30, description: '炼狱魔神的戒指，赋予佩戴者焚烧一切的力量。' },
  { id: 'damned_amulet', name: '堕魂护符', type: 'accessory', tier: 10, atk: 35, def: 40, description: '封印着无数堕魂的护符，吞噬敌人的生命力。' },
  { id: 'genesis_pendant', name: '创世吊坠', type: 'accessory', tier: 11, atk: 60, def: 50, description: '镶嵌创世之种的吊坠，蕴含孕育世界的力量。' },
  { id: 'divine_ring', name: '神性指环', type: 'accessory', tier: 11, atk: 55, def: 55, description: '流转着神性精华的指环，让凡人触及神的领域。' },
  { id: 'omega_crown', name: '终焉王冠', type: 'accessory', tier: 12, atk: 80, def: 70, description: '万界终焉的王冠，号令所有世界的命运。' },
  { id: 'eternity_amulet', name: '永恒护符', type: 'accessory', tier: 12, atk: 70, def: 80, description: '以永恒结晶打造的护符，使佩戴者超脱生死。' },
];
accessories.forEach(ensureItem);

// ---------- 套装 ----------
const sets = [
  {
    id: 'hellfire_demon_set',
    name: '炼狱魔神套装',
    profession: 'combat',
    pieces: [
      { slot: 'main_hand', itemId: 'weapon_hellfire_greatsword' },
      { slot: 'head', itemId: 'armor_hellfire_helm' },
      { slot: 'chest', itemId: 'armor_hellfire_chest' },
      { slot: 'legs', itemId: 'armor_hellfire_legs' },
    ],
    bonuses: [
      { requiredPieces: 2, stats: { atk: 80, def: 70 }, description: '2件套：攻击+80，防御+70' },
      { requiredPieces: 3, stats: { atk: 160, def: 140, hp: 1200 }, description: '3件套：攻击+160，防御+140，生命+1200' },
      { requiredPieces: 4, stats: { atk: 320, def: 280, hp: 3000, mag: 120 }, description: '4件套：攻击+320，防御+280，生命+3000，法力+120（炼狱之怒）' },
    ],
  },
  {
    id: 'genesis_god_set',
    name: '创世神套装',
    profession: 'combat',
    pieces: [
      { slot: 'main_hand', itemId: 'weapon_genesis_blade' },
      { slot: 'head', itemId: 'armor_genesis_god_helm' },
      { slot: 'chest', itemId: 'armor_genesis_god_chest' },
      { slot: 'legs', itemId: 'armor_genesis_god_legs' },
    ],
    bonuses: [
      { requiredPieces: 2, stats: { atk: 110, def: 95 }, description: '2件套：攻击+110，防御+95' },
      { requiredPieces: 3, stats: { atk: 220, def: 190, hp: 1800 }, description: '3件套：攻击+220，防御+190，生命+1800' },
      { requiredPieces: 4, stats: { atk: 440, def: 380, hp: 4500, mag: 200 }, description: '4件套：攻击+440，防御+380，生命+4500，法力+200（创世神威）' },
    ],
  },
  {
    id: 'omega_end_set',
    name: '万界终焉套装',
    profession: 'combat',
    pieces: [
      { slot: 'main_hand', itemId: 'weapon_omega_destroyer' },
      { slot: 'head', itemId: 'armor_omega_helm' },
      { slot: 'chest', itemId: 'armor_omega_chest' },
      { slot: 'legs', itemId: 'armor_omega_legs' },
    ],
    bonuses: [
      { requiredPieces: 2, stats: { atk: 150, def: 130 }, description: '2件套：攻击+150，防御+130' },
      { requiredPieces: 3, stats: { atk: 300, def: 260, hp: 2600 }, description: '3件套：攻击+300，防御+260，生命+2600' },
      { requiredPieces: 4, stats: { atk: 600, def: 520, hp: 6500, mag: 300 }, description: '4件套：攻击+600，防御+520，生命+6500，法力+300（万界终焉·世界的终结与起源）' },
    ],
  },
];
sets.forEach(ensureSet);

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #10（神话终局装备）完成：');
console.log('  新增武器:', weapons.length, '| 护甲:', armors.length, '| 饰品:', accessories.length, '| 套装:', sets.length);
console.log('  现总计 -> items:', pack.items.length, '| equipmentSets:', pack.equipmentSets.length);
