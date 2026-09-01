/**
 * 内容拓展脚本 #5：终局战斗梯度（3 个新区域 L61-L105）
 *
 * 新增区域：
 *   - 幽影深渊 (abyss)     L61-L75，BOSS 虚空领主 L75
 *   - 苍穹天界 (celestial) L76-L90，BOSS 堕落天使 L90
 *   - 时空裂境 (rift)      L91-L105，BOSS 时空主宰 L105（终极 BOSS）
 *
 * 设计原则（完全沿用脚本 #1 的曲线公式，保证属性平滑衔接）：
 *   - monsterStats / bossStats 与 #1 一致
 *   - 每区域 7 只怪（6 普通 + 1 BOSS）
 *   - 战斗动作 duration 随等级递增；BOSS 单独拉长
 *   - 每只怪掉落 gold(必掉) + 1 个对应稀有材料(低概率)；BOSS 额外掉落创世水晶
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

// ---------- 终局稀有掉落材料（tier 8/9）----------
const newMaterials = [
  { id: 'void_shard', name: '虚空裂片', type: 'material', tier: 8, description: '从虚空中剥离的碎片，扭曲着周围的空间。' },
  { id: 'shadow_silk', name: '暗影之丝', type: 'material', tier: 8, description: '幽影生物吐出的丝线，轻若无物却坚韧异常。' },
  { id: 'abyss_core', name: '深渊之核', type: 'material', tier: 8, description: '幽影深渊最深处凝结的黑暗能量核心。' },
  { id: 'void_crown', name: '虚空王冠', type: 'material', tier: 9, description: '虚空领主的王冠，凝视它会让人坠入永夜。' },
  { id: 'celestial_feather', name: '天界羽翼', type: 'material', tier: 8, description: '天界造物身上剥落的羽翼，泛着圣洁的微光。' },
  { id: 'holy_gold', name: '圣辉金', type: 'material', tier: 9, description: '在天界熔铸的黄金，永不褪色、可净化邪祟。' },
  { id: 'angel_tear', name: '天使之泪', type: 'material', tier: 9, description: '堕落天使坠落时流下的最后一滴泪，蕴含神性。' },
  { id: 'fallen_halo', name: '堕落光环', type: 'material', tier: 9, description: '堕落天使破碎的光环，光明与黑暗交织其中。' },
  { id: 'chrono_dust', name: '时之尘', type: 'material', tier: 9, description: '时空裂隙中飘散的尘埃，触碰它会让时间停滞。' },
  { id: 'rift_crystal', name: '裂境结晶', type: 'material', tier: 9, description: '时空裂境凝结的结晶，内部封存着无数平行世界的倒影。' },
  { id: 'space_essence', name: '时空精华', type: 'material', tier: 9, description: '从时空乱流中提炼的纯净精华，是创世级造物的根基。' },
  { id: 'sovereign_heart', name: '主宰之心', type: 'material', tier: 9, description: '时空主宰的核心，掌握它便掌握了过去与未来。' },
];
newMaterials.forEach(ensureItem);

// ---------- 属性曲线（与脚本 #1 完全一致）----------
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
const abyssMonsters = [
  { id: 'shadow_crawler', name: '暗影爬虫', level: 61, drop: 'shadow_silk' },
  { id: 'void_specter', name: '虚空幽魂', level: 63, drop: 'shadow_silk' },
  { id: 'dread_knight', name: '恐惧骑士', level: 65, drop: 'void_shard' },
  { id: 'abyss_maw', name: '深渊巨口', level: 68, drop: 'void_shard' },
  { id: 'nightmare_weaver', name: '梦魇织者', level: 71, drop: 'abyss_core' },
  { id: 'void_behemoth', name: '虚空巨兽', level: 74, drop: 'abyss_core' },
];
const abyssBoss = { id: 'abyss_boss', name: '虚空领主(BOSS)', level: 75, drop: 'void_crown' };

const celestialMonsters = [
  { id: 'light_sprite', name: '圣光精灵', level: 76, drop: 'celestial_feather' },
  { id: 'sky_guardian', name: '天穹守卫', level: 78, drop: 'celestial_feather' },
  { id: 'radiant_griffin', name: '辉耀狮鹫', level: 80, drop: 'holy_gold' },
  { id: 'seraph_sentinel', name: '炽天哨兵', level: 83, drop: 'holy_gold' },
  { id: 'divine_colossus', name: '神圣巨像', level: 86, drop: 'angel_tear' },
  { id: 'archon', name: '执政天神', level: 89, drop: 'angel_tear' },
];
const celestialBoss = { id: 'celestial_boss', name: '堕落天使(BOSS)', level: 90, drop: 'fallen_halo' };

const riftMonsters = [
  { id: 'chrono_phantom', name: '时之幻影', level: 91, drop: 'chrono_dust' },
  { id: 'paradox_beast', name: '悖论之兽', level: 93, drop: 'chrono_dust' },
  { id: 'rift_stalker', name: '裂隙潜行者', level: 95, drop: 'rift_crystal' },
  { id: 'temporal_wyrm', name: '时空巨龙', level: 98, drop: 'rift_crystal' },
  { id: 'void_emperor', name: '虚空帝王', level: 101, drop: 'space_essence' },
  { id: 'reality_render', name: '现实撕裂者', level: 104, drop: 'space_essence' },
];
const riftBoss = { id: 'rift_boss', name: '时空主宰(BOSS)', level: 105, drop: 'sovereign_heart' };

function buildMonster(def, isBoss) {
  const s = isBoss ? bossStats(def.level) : monsterStats(def.level);
  return { id: def.id, name: def.name, level: def.level, hp: s.hp, atk: s.atk, def: s.def, xp: s.xp, gold: s.gold };
}
function buildCombatAction(def, isBoss) {
  const s = isBoss ? bossStats(def.level) : monsterStats(def.level);
  // duration：普通怪随等级递增（沿用 #1 的 700ms/级斜率），BOSS 单独拉长
  const duration = isBoss ? 60000 + (def.level - 45) * 800 : 22000 + (def.level - 30) * 700;
  const yields = [
    { itemId: 'gold', qty: s.gold, chance: 1 },
    { itemId: def.drop, qty: 1, chance: isBoss ? 0.05 : 0.04 },
  ];
  if (isBoss) yields.push({ itemId: 'crystal_7', qty: 1, chance: 0.004 });
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
  ...abyssMonsters.map((m) => ({ def: m, boss: false })),
  { def: abyssBoss, boss: true },
  ...celestialMonsters.map((m) => ({ def: m, boss: false })),
  { def: celestialBoss, boss: true },
  ...riftMonsters.map((m) => ({ def: m, boss: false })),
  { def: riftBoss, boss: true },
];

allNew.forEach(({ def, boss }) => {
  upsertById(pack.monsters, buildMonster(def, boss));
  upsertById(pack.actions, buildCombatAction(def, boss));
});

// ---------- 新增区域 ----------
const newStages = [
  { id: 'abyss', name: '幽影深渊', monsters: [...abyssMonsters.map((m) => m.id), abyssBoss.id] },
  { id: 'celestial', name: '苍穹天界', monsters: [...celestialMonsters.map((m) => m.id), celestialBoss.id] },
  { id: 'rift', name: '时空裂境', monsters: [...riftMonsters.map((m) => m.id), riftBoss.id] },
];
newStages.forEach((s) => upsertById(pack.stages, s));

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #5（终局区域）完成：');
console.log('  新增材料:', newMaterials.length);
console.log('  新增怪物:', allNew.length, '(含 BOSS 3)');
console.log('  新增区域:', newStages.length);
console.log('  现总计 -> monsters:', pack.monsters.length, '| actions:', pack.actions.length, '| stages:', pack.stages.length, '| items:', pack.items.length);
