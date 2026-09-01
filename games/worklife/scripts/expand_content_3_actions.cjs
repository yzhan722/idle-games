/**
 * 内容拓展脚本 #3：新增制作/炼制/烹饪/采集动作
 *
 * 让玩家可以真正获得脚本#1#2新增的内容：
 *  - 铁匠：用 boss 掉落材料(霜寒碎晶/熔岩精华/烈焰之心等)锻造 tier5/6/7 装备
 *  - 炼金：炼制 7 款增益药剂
 *  - 厨师：烹饪增益食物
 *  - 采集：高阶材料采集动作（雪山/熔岩主题）
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
const addAction = (a) => upsertById(pack.actions, a);

let count = 0;
function mk(a) { addAction(a); count++; }

// ---------------- 铁匠：高阶装备锻造 ----------------
// 主题材料映射
const themeMat = {
  frost: { tier: 5, level: 32, core: 'frost_shard', pelt: 'snow_pelt', ingot: 'ingot_5' },
  magma: { tier: 6, level: 47, core: 'magma_essence', pelt: 'obsidian_chunk', ingot: 'ingot_6' },
  myth: { tier: 7, level: 60, core: 'flame_core', pelt: 'glacier_core', ingot: 'ingot_7' },
};
const themeName = { frost: '霜寒', magma: '熔岩', myth: '神话' };
const armorParts = [
  { slot: 'head', name: '头盔' },
  { slot: 'chest', name: '胸甲' },
  { slot: 'legs', name: '护腿' },
  { slot: 'feet', name: '战靴' },
  { slot: 'hands', name: '护手' },
];

Object.entries(themeMat).forEach(([key, m]) => {
  const baseDur = 8000 + m.tier * 1500;
  const baseXp = 60 + m.tier * 20;
  // 武器
  mk({
    id: `act_forge_${key}_blade`,
    name: `锻造${themeName[key]}战刃`,
    skillId: 'skill_blacksmith',
    duration: baseDur,
    xp: baseXp,
    requirements: { skillLevel: m.level },
    consumes: [{ itemId: m.ingot, qty: 4 }, { itemId: m.core, qty: 2 }],
    yields: [{ itemId: `weapon_${key}_blade`, qty: 1, chance: 1 }],
  });
  // 副手盾
  mk({
    id: `act_forge_${key}_shield`,
    name: `锻造${themeName[key]}守护盾`,
    skillId: 'skill_blacksmith',
    duration: baseDur,
    xp: baseXp,
    requirements: { skillLevel: m.level },
    consumes: [{ itemId: m.ingot, qty: 3 }, { itemId: m.pelt, qty: 2 }],
    yields: [{ itemId: `offhand_${key}_shield`, qty: 1, chance: 1 }],
  });
  // 防具五件
  armorParts.forEach((part) => {
    mk({
      id: `act_forge_${key}_${part.slot}`,
      name: `锻造${themeName[key]}${part.name}`,
      skillId: 'skill_blacksmith',
      duration: baseDur,
      xp: baseXp,
      requirements: { skillLevel: m.level },
      consumes: [{ itemId: m.ingot, qty: 3 }, { itemId: m.pelt, qty: 1 }],
      yields: [{ itemId: `armor_${key}_${part.slot}`, qty: 1, chance: 1 }],
    });
  });
  // 饰品戒指
  mk({
    id: `act_forge_${key}_ring`,
    name: `锻造${themeName[key]}之戒`,
    skillId: 'skill_blacksmith',
    duration: baseDur + 2000,
    xp: baseXp + 20,
    requirements: { skillLevel: m.level + 2 },
    consumes: [{ itemId: m.ingot, qty: 2 }, { itemId: m.core, qty: 3 }],
    yields: [{ itemId: `accessory_${key}_ring`, qty: 1, chance: 1 }],
  });
});

// ---------------- 炼金：增益药剂炼制 ----------------
const potionRecipes = [
  { id: 'potion_craft_focus', lvl: 12, dur: 6000, xp: 30, consumes: [{ itemId: 'crystal_2', qty: 2 }] },
  { id: 'potion_battle_fury', lvl: 18, dur: 7000, xp: 40, consumes: [{ itemId: 'crystal_3', qty: 2 }, { itemId: 'troll_power', qty: 1 }] },
  { id: 'potion_fortune', lvl: 20, dur: 8000, xp: 45, consumes: [{ itemId: 'crystal_3', qty: 2 }, { itemId: 'ghost_essence', qty: 1 }] },
  { id: 'potion_scholar', lvl: 20, dur: 8000, xp: 45, consumes: [{ itemId: 'crystal_3', qty: 2 }, { itemId: 'elemental_core', qty: 1 }] },
  { id: 'elixir_legend', lvl: 50, dur: 14000, xp: 120, consumes: [{ itemId: 'crystal_6', qty: 2 }, { itemId: 'flame_core', qty: 1 }, { itemId: 'glacier_core', qty: 1 }] },
];
const itemName = (id) => (pack.items.find((i) => i.id === id) || {}).name || id;
potionRecipes.forEach((r) => {
  mk({
    id: `act_brew_${r.id}`,
    name: `炼制${itemName(r.id)}`,
    skillId: 'skill_alchemist',
    duration: r.dur,
    xp: r.xp,
    requirements: { skillLevel: r.lvl },
    consumes: r.consumes,
    yields: [{ itemId: r.id, qty: 1, chance: 1 }],
  });
});

// ---------------- 厨师：增益食物烹饪 ----------------
const foodRecipes = [
  { id: 'food_hearty_stew', lvl: 8, dur: 6000, xp: 25, consumes: [{ itemId: 'fish_sea', qty: 2 }, { itemId: 'egg', qty: 1 }] },
  { id: 'food_master_feast', lvl: 25, dur: 9000, xp: 55, consumes: [{ itemId: 'fish_sea', qty: 3 }, { itemId: 'milk', qty: 2 }, { itemId: 'snow_pelt', qty: 1 }] },
];
foodRecipes.forEach((r) => {
  mk({
    id: `act_cook_${r.id}`,
    name: `烹饪${itemName(r.id)}`,
    skillId: 'skill_chef',
    duration: r.dur,
    xp: r.xp,
    requirements: { skillLevel: r.lvl },
    consumes: r.consumes,
    yields: [{ itemId: r.id, qty: 1, chance: 1 }],
  });
});

// ---------------- 高阶采集动作 ----------------
// 让农夫/伐木工有更高阶的采集（雪山/熔岩主题原木 t6/t7 已存在）
const gatherActions = [
  { id: 'act_chop_wood_t6', name: '砍伐龙柏原木', skill: 'skill_woodcutter', lvl: 60, dur: 9000, xp: 50, item: 'wood_6' },
  { id: 'act_chop_wood_t7', name: '砍伐神木原木', skill: 'skill_woodcutter', lvl: 90, dur: 11000, xp: 70, item: 'wood_7' },
  { id: 'act_mine_crystal_t6', name: '采集神光水晶', skill: 'skill_alchemist', lvl: 60, dur: 9000, xp: 50, item: 'crystal_6' },
  { id: 'act_mine_crystal_t7', name: '采集创世水晶', skill: 'skill_alchemist', lvl: 90, dur: 12000, xp: 75, item: 'crystal_7' },
];
gatherActions.forEach((g) => {
  mk({
    id: g.id,
    name: g.name,
    skillId: g.skill,
    duration: g.dur,
    xp: g.xp,
    requirements: { skillLevel: g.lvl },
    yields: [{ itemId: g.item, qty: 1, chance: 1 }],
  });
});

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #3 完成：');
console.log('  新增动作:', count);
console.log('  现总计 actions:', pack.actions.length);
