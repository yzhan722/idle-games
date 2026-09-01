/**
 * 内容拓展脚本 #1：新增冒险区域、怪物、战斗动作与掉落材料
 *
 * 新增区域：
 *   - 冰封雪山 (snow)   L31-L45，BOSS 霜冠雪魔 L45
 *   - 熔岩深渊 (volcano) L46-L60，BOSS 烈焰魔君 L60
 *
 * 设计原则（沿用现有曲线）：
 *   - 怪物属性随等级平滑增长
 *   - 战斗动作 duration = 22000 起逐级递增，BOSS 单独拉长
 *   - 每个怪物掉落 gold(必掉) + 1 个稀有材料(低概率)
 *
 * 本脚本为幂等：重复执行不会产生重复条目（按 id 去重）。
 */
const fs = require('fs');
const path = require('path');

const PACK_PATH = path.join(__dirname, '..', 'shared', 'enhanced_content_pack_chinese.json');
const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));

// ---------- 工具函数 ----------
function upsertById(arr, item) {
  const idx = arr.findIndex((x) => x.id === item.id);
  if (idx >= 0) arr[idx] = item;
  else arr.push(item);
}
function ensureItem(item) {
  upsertById(pack.items, item);
}

// ---------- 新增稀有掉落材料（高阶）----------
const newMaterials = [
  { id: 'frost_shard', name: '霜寒碎晶', type: 'material', tier: 5, description: '凝结着极寒之力的碎晶，可用于高阶炼金与附魔。' },
  { id: 'snow_pelt', name: '雪兽厚皮', type: 'material', tier: 5, description: '雪山猛兽的厚实毛皮，是顶级护甲的上佳材料。' },
  { id: 'glacier_core', name: '冰川之核', type: 'material', tier: 6, description: '雪山深处万年寒冰的核心，蕴含磅礴的冰系能量。' },
  { id: 'frost_crown', name: '霜冠', type: 'material', tier: 6, description: '霜冠雪魔的王冠，象征雪山的统治者。' },
  { id: 'magma_essence', name: '熔岩精华', type: 'material', tier: 6, description: '从熔岩中提炼的炽热精华，永不冷却。' },
  { id: 'obsidian_chunk', name: '黑曜石块', type: 'material', tier: 6, description: '被烈焰淬炼的黑曜石，坚硬无比。' },
  { id: 'flame_core', name: '烈焰之心', type: 'material', tier: 7, description: '熔岩深渊最深处跳动的火焰核心，是传说级装备的关键。' },
  { id: 'demon_horn', name: '魔君之角', type: 'material', tier: 7, description: '烈焰魔君的角，蕴含毁灭性的力量。' },
];
newMaterials.forEach(ensureItem);

// ---------- 新增怪物 ----------
// 等级 -> 属性的平滑公式（参照现有曲线外推）
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

const snowMonsters = [
  { id: 'snow_wolf', name: '冰原雪狼', level: 31, drop: 'snow_pelt' },
  { id: 'frost_imp', name: '霜冻小妖', level: 33, drop: 'frost_shard' },
  { id: 'ice_golem', name: '寒冰傀儡', level: 35, drop: 'frost_shard' },
  { id: 'snow_harpy', name: '雪羽鹰身女妖', level: 37, drop: 'snow_pelt' },
  { id: 'frozen_knight', name: '冰封骑士', level: 39, drop: 'glacier_core' },
  { id: 'yeti', name: '暴雪雪人', level: 42, drop: 'glacier_core' },
];
const snowBoss = { id: 'snow_boss', name: '霜冠雪魔(BOSS)', level: 45, drop: 'frost_crown' };

const volcanoMonsters = [
  { id: 'lava_slug', name: '熔岩鼻涕虫', level: 46, drop: 'magma_essence' },
  { id: 'fire_bat', name: '烈焰蝙蝠', level: 48, drop: 'magma_essence' },
  { id: 'cinder_hound', name: '余烬猎犬', level: 50, drop: 'obsidian_chunk' },
  { id: 'magma_titan', name: '岩浆泰坦', level: 52, drop: 'obsidian_chunk' },
  { id: 'flame_wraith', name: '烈焰怨灵', level: 55, drop: 'flame_core' },
  { id: 'inferno_drake', name: '炼狱火龙', level: 58, drop: 'flame_core' },
];
const volcanoBoss = { id: 'volcano_boss', name: '烈焰魔君(BOSS)', level: 60, drop: 'demon_horn' };

function buildMonster(def, isBoss) {
  const s = isBoss ? bossStats(def.level) : monsterStats(def.level);
  return { id: def.id, name: def.name, level: def.level, hp: s.hp, atk: s.atk, def: s.def, xp: s.xp, gold: s.gold };
}
function buildCombatAction(def, isBoss) {
  const s = isBoss ? bossStats(def.level) : monsterStats(def.level);
  // duration：普通怪 22s 起、随等级递增；BOSS 单独 60s+
  const duration = isBoss ? 60000 + (def.level - 45) * 800 : 22000 + (def.level - 30) * 700;
  const yields = [
    { itemId: 'gold', qty: s.gold, chance: 1 },
    { itemId: def.drop, qty: 1, chance: isBoss ? 0.05 : 0.04 },
  ];
  // BOSS 额外掉落创世水晶
  if (isBoss) yields.push({ itemId: 'crystal_7', qty: 1, chance: 0.003 });
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
  ...snowMonsters.map((m) => ({ def: m, boss: false })),
  { def: snowBoss, boss: true },
  ...volcanoMonsters.map((m) => ({ def: m, boss: false })),
  { def: volcanoBoss, boss: true },
];

allNew.forEach(({ def, boss }) => {
  upsertById(pack.monsters, buildMonster(def, boss));
  upsertById(pack.actions, buildCombatAction(def, boss));
});

// ---------- 新增区域 ----------
const newStages = [
  {
    id: 'snow',
    name: '冰封雪山',
    monsters: [...snowMonsters.map((m) => m.id), snowBoss.id],
  },
  {
    id: 'volcano',
    name: '熔岩深渊',
    monsters: [...volcanoMonsters.map((m) => m.id), volcanoBoss.id],
  },
];
newStages.forEach((s) => upsertById(pack.stages, s));

// ---------- 写回 ----------
fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #1 完成：');
console.log('  新增材料:', newMaterials.length);
console.log('  新增怪物:', allNew.length, '(含 BOSS 2)');
console.log('  现总计 -> monsters:', pack.monsters.length, '| actions:', pack.actions.length, '| stages:', pack.stages.length, '| items:', pack.items.length);
