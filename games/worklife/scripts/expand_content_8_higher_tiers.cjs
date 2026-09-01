/**
 * 内容拓展脚本 #8：突破 tier7 上限——新增 tier8/9 采集与加工层级
 *
 * 此前所有原材料止步 tier7（神木/精金/创世水晶等，需求等级 90-100）。
 * 这里新增 tier8/9 原材料 + 采集动作 + 加工动作 + 解锁节点，
 * 让 lvl 100+ 的玩家仍有采集线可继续推进，并喂养终局制作经济。
 *
 * 新增原材料：
 *   wood_8 星辰木 / wood_9 永恒神木
 *   ore_8 玄铁 / ore_9 神域秘银
 *   crystal_8 星界水晶 / crystal_9 永恒之心
 *   加工：lumber_8/9、ingot_8/9
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
const ensureItem = (i) => upsertById(pack.items, i);
const ensureAction = (a) => upsertById(pack.actions, a);

// ---------- 新原材料 ----------
const mats = [
  { id: 'wood_8', name: '星辰木', type: 'material', tier: 8, description: '生长于云端的木材，木纹中流转着星光。' },
  { id: 'wood_9', name: '永恒神木', type: 'material', tier: 9, description: '传说中世界之树的枝干，永不腐朽。' },
  { id: 'ore_8', name: '玄铁矿石', type: 'material', tier: 8, description: '深埋地心的玄铁，沉重而坚不可摧。' },
  { id: 'ore_9', name: '神域秘银', type: 'material', tier: 9, description: '只存在于神域的秘银，是锻造神器的根本。' },
  { id: 'crystal_8', name: '星界水晶', type: 'material', tier: 8, description: '汲取星辰之力的水晶，蕴含磅礴魔力。' },
  { id: 'crystal_9', name: '永恒之心', type: 'material', tier: 9, description: '凝聚永恒能量的水晶之心，是创世的火种。' },
  { id: 'lumber_8', name: '星辰精华块', type: 'material', tier: 8, description: '由星辰木提炼的精华，质轻而坚。' },
  { id: 'lumber_9', name: '永恒精华块', type: 'material', tier: 9, description: '永恒神木的极致结晶，蕴含不灭之力。' },
  { id: 'ingot_8', name: '玄铁锭', type: 'material', tier: 8, description: '冶炼玄铁而成的金属锭，泛着幽暗光泽。' },
  { id: 'ingot_9', name: '秘银锭', type: 'material', tier: 9, description: '神域秘银冶炼而成，是终极锻造的至宝。' },
];
mats.forEach(ensureItem);

// ---------- 采集 / 加工动作 ----------
const acts = [
  // 伐木：采集 wood_8/9 + 加工 lumber_8/9
  { id: 'act_chop_wood_t8', name: '砍伐星辰木', skillId: 'skill_woodcutter', duration: 14000, xp: 90, requirements: { skillLevel: 105 }, yields: [{ itemId: 'wood_8', qty: 1, chance: 1 }] },
  { id: 'act_chop_wood_t9', name: '砍伐永恒神木', skillId: 'skill_woodcutter', duration: 18000, xp: 120, requirements: { skillLevel: 115 }, yields: [{ itemId: 'wood_9', qty: 1, chance: 1 }] },
  { id: 'act_craft_lumber_t8', name: '制作星辰精华块', skillId: 'skill_woodcutter', duration: 36000, xp: 80, requirements: { skillLevel: 110 }, consumes: [{ itemId: 'wood_8', qty: 5 }], yields: [{ itemId: 'lumber_8', qty: 1, chance: 1 }] },
  { id: 'act_craft_lumber_t9', name: '制作永恒精华块', skillId: 'skill_woodcutter', duration: 42000, xp: 100, requirements: { skillLevel: 120 }, consumes: [{ itemId: 'wood_9', qty: 5 }], yields: [{ itemId: 'lumber_9', qty: 1, chance: 1 }] },
  // 铁匠：采集 ore_8/9 + 冶炼 ingot_8/9
  { id: 'act_mine_ore_t8', name: '挖掘玄铁矿', skillId: 'skill_blacksmith', duration: 48000, xp: 100, requirements: { skillLevel: 110 }, yields: [{ itemId: 'ore_8', qty: 1, chance: 1 }] },
  { id: 'act_mine_ore_t9', name: '挖掘神域秘银', skillId: 'skill_blacksmith', duration: 58000, xp: 130, requirements: { skillLevel: 120 }, yields: [{ itemId: 'ore_9', qty: 1, chance: 1 }] },
  { id: 'act_smelt_ingot_t8', name: '冶炼玄铁锭', skillId: 'skill_blacksmith', duration: 38000, xp: 84, requirements: { skillLevel: 112 }, consumes: [{ itemId: 'ore_8', qty: 5 }], yields: [{ itemId: 'ingot_8', qty: 1, chance: 1 }] },
  { id: 'act_smelt_ingot_t9', name: '冶炼秘银锭', skillId: 'skill_blacksmith', duration: 46000, xp: 110, requirements: { skillLevel: 122 }, consumes: [{ itemId: 'ore_9', qty: 5 }], yields: [{ itemId: 'ingot_9', qty: 1, chance: 1 }] },
  // 炼金：采集 crystal_8/9
  { id: 'act_mine_crystal_t8', name: '采集星界水晶', skillId: 'skill_alchemist', duration: 15000, xp: 95, requirements: { skillLevel: 105 }, yields: [{ itemId: 'crystal_8', qty: 1, chance: 1 }] },
  { id: 'act_mine_crystal_t9', name: '采集永恒之心', skillId: 'skill_alchemist', duration: 20000, xp: 130, requirements: { skillLevel: 115 }, yields: [{ itemId: 'crystal_9', qty: 1, chance: 1 }] },
];
acts.forEach(ensureAction);

// ---------- 解锁节点 ----------
function addNode(professionId, id, name, description, level, prereqs, actions) {
  const t = pack.professionTrees.find((x) => x.professionId === professionId);
  if (!t) return;
  upsertById(t.skillNodes, { id, name, description, requirements: { level, prerequisites: prereqs }, unlocks: { actions } });
}
addNode('woodcutter', 'woodcutter_eternal_cutting', '永恒伐木', '突破极限，采伐星辰木与永恒神木。', 105, ['woodcutter_legendary_cutting'],
  ['act_chop_wood_t8', 'act_chop_wood_t9', 'act_craft_lumber_t8', 'act_craft_lumber_t9']);
addNode('blacksmith', 'blacksmith_mythril_mining', '秘银开采', '开采玄铁与神域秘银，冶炼终极金属锭。', 110, ['blacksmith_genesis_forging'],
  ['act_mine_ore_t8', 'act_mine_ore_t9', 'act_smelt_ingot_t8', 'act_smelt_ingot_t9']);
addNode('alchemist', 'alchemist_eternal_crystal', '永恒水晶', '采集星界水晶与永恒之心。', 105, ['alchemist_genesis_craft'],
  ['act_mine_crystal_t8', 'act_mine_crystal_t9']);

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #8（tier8/9 采集层级）完成：');
console.log('  新增原材料:', mats.length, '| 新增采集/加工动作:', acts.length, '| 新增节点: 3');
console.log('  现总计 -> items:', pack.items.length, '| actions:', pack.actions.length);
