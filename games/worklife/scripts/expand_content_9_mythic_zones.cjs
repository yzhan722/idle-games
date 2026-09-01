/**
 * 内容拓展脚本 #9：神话终局梯度（3 个新区域 L106-L150）
 *
 * 新增区域（每区 8 普通 + 1 BOSS = 9 怪，共 27 只）：
 *   - 永劫炼狱 (inferno)  L106-L120，BOSS 炼狱魔神 L120
 *   - 创世神域 (genesis)  L121-L135，BOSS 创世之神 L135
 *   - 万界终焉 (omega)    L136-L150，BOSS 万界终焉 L150（绝对终极 BOSS）
 *
 * 设计原则（完全沿用脚本 #1/#5 的曲线公式，保证属性平滑衔接）：
 *   - monsterStats / bossStats 与 #5 一致
 *   - 战斗动作 duration 随等级递增；BOSS 单独拉长
 *   - 每只怪掉落 gold(必掉) + 1 个对应稀有材料(低概率)；BOSS 额外掉落终极水晶
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

// ---------- 神话稀有掉落材料（tier 10/11/12）----------
const newMaterials = [
  // 永劫炼狱 tier 10
  { id: 'hellfire_ember', name: '炼狱余烬', type: 'material', tier: 10, description: '永不熄灭的炼狱火种，能熔毁一切凡物。' },
  { id: 'damned_soul', name: '堕魂结晶', type: 'material', tier: 10, description: '无数堕落灵魂凝结的结晶，散发绝望的低语。' },
  { id: 'infernal_core', name: '炼狱之核', type: 'material', tier: 10, description: '永劫炼狱最深处跳动的核心，蕴含毁灭之力。' },
  { id: 'demon_crown', name: '魔神王冠', type: 'material', tier: 11, description: '炼狱魔神的王冠，戴上它便能号令亿万恶魔。' },
  // 创世神域 tier 11
  { id: 'genesis_light', name: '创世之光', type: 'material', tier: 11, description: '宇宙诞生时的第一缕光，是万物的起源。' },
  { id: 'divine_essence', name: '神性精华', type: 'material', tier: 11, description: '从神祇躯体中提炼的纯净神性，凡人触之即化。' },
  { id: 'creation_seed', name: '创世之种', type: 'material', tier: 11, description: '能孕育一个全新世界的种子，重若星辰。' },
  { id: 'god_heart', name: '神之心脏', type: 'material', tier: 12, description: '创世之神的心脏，每一次跳动都在重塑现实。' },
  // 万界终焉 tier 12
  { id: 'omega_fragment', name: '终焉碎片', type: 'material', tier: 12, description: '万界崩塌后残留的碎片，封存着世界的终焉。' },
  { id: 'eternity_crystal', name: '永恒结晶', type: 'material', tier: 12, description: '超越时间的结晶，记录着所有可能的过去与未来。' },
  { id: 'cosmos_essence', name: '寰宇精华', type: 'material', tier: 12, description: '整个宇宙的本质浓缩而成，是创世级造物的巅峰材料。' },
  { id: 'omega_heart', name: '万界之心', type: 'material', tier: 12, description: '万界终焉的核心，掌握它便掌握了所有世界的命运。' },
];
newMaterials.forEach(ensureItem);

// ---------- 属性曲线（与脚本 #5 完全一致）----------
function monsterStats(level) {
  return {
    hp: Math.round(30 + level * 28 + Math.pow(level, 1.55)),
    atk: Math.round(8 + level * 5.2),
    def: Math.round(5 + level * 3.4),
    xp: Math.round(10 + level * 2.4),
    gold: Math.round(10 + level * 2.2),
  };
}
function bossStats(level) {
  const base = monsterStats(level);
  return {
    hp: Math.round(base.hp * 6.5),
    atk: Math.round(base.atk * 1.8),
    def: Math.round(base.def * 1.7),
    xp: Math.round(base.xp * 9),
    gold: Math.round(base.gold * 9),
  };
}

// ---------- 怪物定义 ----------
const infernoMonsters = [
  { id: 'hellhound', name: '炼狱地狱犬', level: 106, drop: 'hellfire_ember' },
  { id: 'flame_imp', name: '烈焰小鬼', level: 108, drop: 'hellfire_ember' },
  { id: 'soul_reaper', name: '噬魂收割者', level: 110, drop: 'damned_soul' },
  { id: 'lava_titan', name: '熔岩泰坦', level: 112, drop: 'damned_soul' },
  { id: 'infernal_dragon', name: '炼狱火龙', level: 114, drop: 'infernal_core' },
  { id: 'doom_bringer', name: '末日使者', level: 116, drop: 'infernal_core' },
  { id: 'archfiend', name: '深渊魔将', level: 118, drop: 'infernal_core' },
  { id: 'hell_sovereign', name: '地狱亲王', level: 119, drop: 'demon_crown' },
];
const infernoBoss = { id: 'inferno_boss', name: '炼狱魔神(BOSS)', level: 120, drop: 'demon_crown' };

const genesisMonsters = [
  { id: 'star_seraph', name: '星辰炽天使', level: 121, drop: 'genesis_light' },
  { id: 'cosmic_guardian', name: '寰宇守护者', level: 123, drop: 'genesis_light' },
  { id: 'light_avatar', name: '圣光化身', level: 125, drop: 'divine_essence' },
  { id: 'creation_golem', name: '创世魔像', level: 127, drop: 'divine_essence' },
  { id: 'divine_phoenix', name: '神圣不死鸟', level: 129, drop: 'creation_seed' },
  { id: 'astral_judge', name: '星界审判者', level: 131, drop: 'creation_seed' },
  { id: 'demigod', name: '半神祭司', level: 133, drop: 'creation_seed' },
  { id: 'genesis_herald', name: '创世先知', level: 134, drop: 'god_heart' },
];
const genesisBoss = { id: 'genesis_boss', name: '创世之神(BOSS)', level: 135, drop: 'god_heart' };

const omegaMonsters = [
  { id: 'void_devourer', name: '虚空吞噬者', level: 136, drop: 'omega_fragment' },
  { id: 'entropy_beast', name: '熵增之兽', level: 138, drop: 'omega_fragment' },
  { id: 'reality_eater', name: '现实啖食者', level: 140, drop: 'eternity_crystal' },
  { id: 'dimension_lord', name: '维度领主', level: 142, drop: 'eternity_crystal' },
  { id: 'cosmic_horror', name: '寰宇恐惧', level: 144, drop: 'cosmos_essence' },
  { id: 'world_ender', name: '世界终结者', level: 146, drop: 'cosmos_essence' },
  { id: 'paradox_god', name: '悖论之神', level: 148, drop: 'cosmos_essence' },
  { id: 'omega_herald', name: '终焉传令者', level: 149, drop: 'omega_heart' },
];
const omegaBoss = { id: 'omega_boss', name: '万界终焉(BOSS)', level: 150, drop: 'omega_heart' };

function buildMonster(def, isBoss) {
  const s = isBoss ? bossStats(def.level) : monsterStats(def.level);
  return { id: def.id, name: def.name, level: def.level, hp: s.hp, atk: s.atk, def: s.def, xp: s.xp, gold: s.gold };
}
function buildCombatAction(def, isBoss) {
  const s = isBoss ? bossStats(def.level) : monsterStats(def.level);
  const duration = isBoss ? 60000 + (def.level - 45) * 800 : 22000 + (def.level - 30) * 700;
  const yields = [
    { itemId: 'gold', qty: s.gold, chance: 1 },
    { itemId: def.drop, qty: 1, chance: isBoss ? 0.05 : 0.04 },
  ];
  if (isBoss) yields.push({ itemId: 'crystal_9', qty: 1, chance: 0.004 });
  return {
    id: `act_combat_${def.id}`,
    name: `战斗：${def.name}`,
    skillId: 'skill_combat',
    duration,
    xp: s.xp,
    requirements: { skillLevel: Math.max(1, def.level - 5) },
    yields,
  };
}

const allNew = [
  ...infernoMonsters.map((m) => ({ def: m, boss: false })),
  { def: infernoBoss, boss: true },
  ...genesisMonsters.map((m) => ({ def: m, boss: false })),
  { def: genesisBoss, boss: true },
  ...omegaMonsters.map((m) => ({ def: m, boss: false })),
  { def: omegaBoss, boss: true },
];

allNew.forEach(({ def, boss }) => {
  upsertById(pack.monsters, buildMonster(def, boss));
  upsertById(pack.actions, buildCombatAction(def, boss));
});

// ---------- 新增区域 ----------
const newStages = [
  { id: 'inferno', name: '永劫炼狱', monsters: [...infernoMonsters.map((m) => m.id), infernoBoss.id] },
  { id: 'genesis', name: '创世神域', monsters: [...genesisMonsters.map((m) => m.id), genesisBoss.id] },
  { id: 'omega', name: '万界终焉', monsters: [...omegaMonsters.map((m) => m.id), omegaBoss.id] },
];
newStages.forEach((s) => upsertById(pack.stages, s));

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #9（神话终局区域）完成：');
console.log('  新增材料:', newMaterials.length);
console.log('  新增怪物:', allNew.length, '(含 BOSS 3)');
console.log('  新增区域:', newStages.length);
console.log('  现总计 -> monsters:', pack.monsters.length, '| actions:', pack.actions.length, '| stages:', pack.stages.length, '| items:', pack.items.length);
