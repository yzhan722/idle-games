/*
 * 扩展脚本 #14：补齐农夫(种植)与钓鱼线到高阶
 * - 农夫 act_plant t5..t12：产出已存在的 fiber_5..fiber_12（之前只到 t4）
 * - 钓鱼 act_fish t3..t9：新增对应鱼类 food 物品 + 动作
 * 幂等：按 id upsert
 */
const fs = require('fs');
const path = require('path');
const PACK_PATH = path.join(__dirname, '..', 'shared', 'enhanced_content_pack_chinese.json');
const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));

function upsertById(arr, item) {
  const i = arr.findIndex((x) => x.id === item.id);
  if (i >= 0) arr[i] = item;
  else arr.push(item);
}
function has(arr, id) { return arr.some((x) => x.id === id); }

const before = { items: pack.items.length, actions: pack.actions.length };

// ---------- 农夫：种植 t5..t12（产出已有 fiber_5..fiber_12）----------
// 等级与采集线一致：t5=65, t6=80, t7=100, t8=110, t9=120, t10=125, t11=135, t12=145
const plantTiers = [
  { t: 5, lvl: 65, dur: 28000, xp: 55, name: '种植星辰棉', fiber: 'fiber_5' },
  { t: 6, lvl: 80, dur: 32000, xp: 65, name: '种植虚空麻', fiber: 'fiber_6' },
  { t: 7, lvl: 100, dur: 40000, xp: 85, name: '种植神圣灵草', fiber: 'fiber_7' },
  { t: 8, lvl: 110, dur: 50000, xp: 100, name: '种植星辉蛛草', fiber: 'fiber_8' },
  { t: 9, lvl: 120, dur: 60000, xp: 130, name: '种植神纹灵草', fiber: 'fiber_9' },
  { t: 10, lvl: 125, dur: 72000, xp: 160, name: '种植星陨神草', fiber: 'fiber_10' },
  { t: 11, lvl: 135, dur: 85000, xp: 200, name: '种植创世圣草', fiber: 'fiber_11' },
  { t: 12, lvl: 145, dur: 98000, xp: 260, name: '种植寰宇梵草', fiber: 'fiber_12' },
];
for (const p of plantTiers) {
  // 校验 fiber 物品存在
  if (!has(pack.items, p.fiber)) throw new Error('缺少 fiber 物品: ' + p.fiber);
  upsertById(pack.actions, {
    id: `act_plant_fiber_t${p.t}`,
    name: p.name,
    skillId: 'skill_farmer',
    duration: p.dur,
    xp: p.xp,
    requirements: { skillLevel: p.lvl },
    yields: [{ itemId: p.fiber, qty: 2, chance: 1 }],
  });
}

// ---------- 钓鱼：新增鱼类 food 物品 + t3..t9 动作 ----------
// 现有 fish_river(t1,lv1), fish_sea(t2,lv20)
const fishTiers = [
  { t: 3, lvl: 35, dur: 16000, xp: 35, id: 'fish_lake', name: '湖鱼', desc: '深湖中的肥美湖鱼', heal: 60 },
  { t: 4, lvl: 50, dur: 20000, xp: 45, id: 'fish_deepsea', name: '深海鱼', desc: '来自幽暗深海的珍稀鱼类', heal: 90 },
  { t: 5, lvl: 65, dur: 25000, xp: 55, id: 'fish_abyss', name: '渊海巨鱼', desc: '潜伏深渊的巨型鱼，肉质极鲜', heal: 130 },
  { t: 6, lvl: 80, dur: 30000, xp: 65, id: 'fish_frost', name: '寒霜冰鱼', desc: '冰封水域的冰晶鱼，入口生凉', heal: 180 },
  { t: 7, lvl: 100, dur: 40000, xp: 85, id: 'fish_lava', name: '熔岩火鱼', desc: '游弋于岩浆的火鱼，蕴含炽热能量', heal: 250 },
  { t: 8, lvl: 110, dur: 50000, xp: 100, id: 'fish_star', name: '星界游鱼', desc: '遨游星界的发光鱼，鳞片如星辰', heal: 340 },
  { t: 9, lvl: 120, dur: 60000, xp: 130, id: 'fish_dragon', name: '龙渊神鱼', desc: '盘踞龙渊的神鱼，传说食之延年', heal: 450 },
];
for (const f of fishTiers) {
  // food 物品（带回血效果，类型与现有 fish_sea 保持一致为 food）
  upsertById(pack.items, {
    id: f.id,
    name: f.name,
    type: 'food',
    tier: f.t,
    description: f.desc,
    effect: { hp: f.heal },
  });
  upsertById(pack.actions, {
    id: `act_fish_t${f.t}`,
    name: `钓${f.name}`,
    skillId: 'skill_chef',
    duration: f.dur,
    xp: f.xp,
    requirements: { skillLevel: f.lvl },
    yields: [{ itemId: f.id, qty: 1, chance: 1 }],
  });
}

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');
const after = { items: pack.items.length, actions: pack.actions.length };
console.log('扩展 #14 完成 farm/fish');
console.log('items', before.items, '->', after.items);
console.log('actions', before.actions, '->', after.actions);
console.log('farmer actions:', pack.actions.filter((a) => a.skillId === 'skill_farmer').length);
console.log('chef fish actions:', pack.actions.filter((a) => /act_fish/.test(a.id)).length);
