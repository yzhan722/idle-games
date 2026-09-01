/**
 * 内容拓展脚本 #6：终局装备（tier 8/9 武器/护甲/饰品 + 2 套终局套装）
 *
 * 配合脚本 #5 的终局战斗梯度（L61-105），提供与之匹配的高阶装备产出目标。
 *
 * 新增：
 *   武器 ×4（tier 8/9，覆盖战斗 & 法系）
 *   护甲 ×6（tier 8/9，胸/腿/头三部位 × 两档）
 *   饰品 ×4（tier 8/9）
 *   套装 ×2：
 *     - 虚空猎手套装 (void_hunter_set)   —— 战斗向，tier 8
 *     - 创世主宰套装 (genesis_sovereign_set) —— 终极，tier 9
 *
 * 幂等：按 id upsert。
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
if (!Array.isArray(pack.equipmentSets)) pack.equipmentSets = [];
const ensureSet = (s) => upsertById(pack.equipmentSets, s);

// ---------- 武器 ----------
const weapons = [
  { id: 'weapon_void_blade', name: '虚空裂刃', type: 'weapon', tier: 8, atk: 120, description: '以虚空裂片锻造的长刃，挥砍间撕裂空间。' },
  { id: 'weapon_shadow_bow', name: '暗影长弓', type: 'weapon', tier: 8, atk: 110, mag: 40, description: '由暗影之丝张弦的长弓，箭矢无声而致命。' },
  { id: 'weapon_celestial_spear', name: '天罚圣枪', type: 'weapon', tier: 9, atk: 175, description: '蕴含天界圣辉的长枪，可洞穿一切邪祟。' },
  { id: 'weapon_genesis_staff', name: '创世法杖', type: 'weapon', tier: 9, atk: 90, mag: 180, description: '凝聚时空精华的法杖，一挥可重塑现实。' },
];
weapons.forEach(ensureItem);

// ---------- 护甲 ----------
const armors = [
  { id: 'armor_void_chest', name: '虚空胸甲', type: 'armor', tier: 8, def: 95, slot: 'chest', description: '以深渊之核镶嵌的胸甲，吞噬射向它的伤害。' },
  { id: 'armor_void_legs', name: '虚空护腿', type: 'armor', tier: 8, def: 70, slot: 'legs', description: '暗影编织的护腿，行走时悄无声息。' },
  { id: 'armor_void_helm', name: '虚空头盔', type: 'armor', tier: 8, def: 55, slot: 'head', description: '映照虚空的头盔，赋予佩戴者夜视之力。' },
  { id: 'armor_genesis_chest', name: '创世胸甲', type: 'armor', tier: 9, def: 150, slot: 'chest', description: '以圣辉金与时空精华熔铸，刀枪不入。' },
  { id: 'armor_genesis_legs', name: '创世护腿', type: 'armor', tier: 9, def: 110, slot: 'legs', description: '镶嵌裂境结晶的护腿，可短暂扭曲时间躲避攻击。' },
  { id: 'armor_genesis_helm', name: '创世头盔', type: 'armor', tier: 9, def: 90, slot: 'head', description: '主宰之心驱动的头盔，洞悉敌人的下一步行动。' },
];
armors.forEach(ensureItem);

// ---------- 饰品 ----------
const accessories = [
  { id: 'void_amulet', name: '虚空护符', type: 'accessory', tier: 8, atk: 35, def: 25, description: '封印着虚空力量的护符，增幅持有者的全部能力。' },
  { id: 'celestial_ring', name: '天界圣戒', type: 'accessory', tier: 8, atk: 30, def: 30, mag: 30, description: '天界打造的戒指，光芒驱散一切诅咒。' },
  { id: 'chrono_pendant', name: '时之吊坠', type: 'accessory', tier: 9, atk: 55, def: 45, description: '掌控时间流速的吊坠，让佩戴者快人一步。' },
  { id: 'sovereign_crown', name: '主宰王冠', type: 'accessory', tier: 9, atk: 70, def: 60, mag: 60, description: '时空主宰的王冠，戴上它即为这片世界的主人。' },
];
accessories.forEach(ensureItem);

// ---------- 套装 ----------
ensureSet({
  id: 'void_hunter_set',
  name: '虚空猎手套装',
  profession: 'combat',
  pieces: [
    { slot: 'main_hand', itemId: 'weapon_void_blade' },
    { slot: 'chest', itemId: 'armor_void_chest' },
    { slot: 'legs', itemId: 'armor_void_legs' },
    { slot: 'head', itemId: 'armor_void_helm' },
  ],
  bonuses: [
    { requiredPieces: 2, stats: { atk: 30, def: 20 }, description: '2件套：攻击+30，防御+20' },
    { requiredPieces: 3, stats: { atk: 60, def: 45 }, description: '3件套：攻击+60，防御+45' },
    { requiredPieces: 4, stats: { atk: 120, def: 90, hp: 500 }, description: '4件套：攻击+120，防御+90，生命+500' },
  ],
});

ensureSet({
  id: 'genesis_sovereign_set',
  name: '创世主宰套装',
  profession: 'combat',
  pieces: [
    { slot: 'main_hand', itemId: 'weapon_celestial_spear' },
    { slot: 'chest', itemId: 'armor_genesis_chest' },
    { slot: 'legs', itemId: 'armor_genesis_legs' },
    { slot: 'head', itemId: 'armor_genesis_helm' },
  ],
  bonuses: [
    { requiredPieces: 2, stats: { atk: 60, def: 50 }, description: '2件套：攻击+60，防御+50' },
    { requiredPieces: 3, stats: { atk: 120, def: 100, hp: 800 }, description: '3件套：攻击+120，防御+100，生命+800' },
    { requiredPieces: 4, stats: { atk: 250, def: 200, hp: 2000, mag: 100 }, description: '4件套：攻击+250，防御+200，生命+2000，法力+100（创世之力）' },
  ],
});

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #6（终局装备）完成：');
console.log('  武器:', weapons.length, '| 护甲:', armors.length, '| 饰品:', accessories.length, '| 套装: 2');
console.log('  现总计 -> items:', pack.items.length, '| equipmentSets:', pack.equipmentSets.length);
