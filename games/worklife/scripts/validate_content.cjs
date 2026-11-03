/**
 * 内容完整性校验：检查悬空引用
 *  - 动作 consumes/yields 的 itemId 必须存在于 items
 *  - 套装 pieces 的 itemId 必须存在
 *  - 职业树 unlocks.actions 必须存在于 actions
 *  - stage.monsters 必须存在于 monsters
 *  - 每个非战斗怪物 stage 引用的怪物都要有对应 act_combat_<id>
 */
const fs = require('fs');
const path = require('path');
const pack = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'shared', 'enhanced_content_pack_chinese.json'), 'utf8'));

const itemIds = new Set(pack.items.map((i) => i.id));
const actionIds = new Set(pack.actions.map((a) => a.id));
const monsterIds = new Set(pack.monsters.map((m) => m.id));

const errors = [];

pack.actions.forEach((a) => {
  (a.consumes || []).forEach((c) => { if (!itemIds.has(c.itemId)) errors.push(`动作 ${a.id} consumes 未知物品 ${c.itemId}`); });
  (a.yields || []).forEach((y) => { if (!itemIds.has(y.itemId)) errors.push(`动作 ${a.id} yields 未知物品 ${y.itemId}`); });
});

pack.equipmentSets.forEach((s) => {
  s.pieces.forEach((p) => { if (!itemIds.has(p.itemId)) errors.push(`套装 ${s.id} 引用未知物品 ${p.itemId}`); });
});

pack.professionTrees.forEach((t) => {
  t.skillNodes.forEach((n) => {
    (n.unlocks.actions || []).forEach((aid) => { if (!actionIds.has(aid)) errors.push(`职业树 ${t.professionId}/${n.id} 解锁未知动作 ${aid}`); });
  });
});

pack.stages.forEach((s) => {
  s.monsters.forEach((mid) => {
    if (!monsterIds.has(mid)) errors.push(`区域 ${s.id} 引用未知怪物 ${mid}`);
    if (!actionIds.has(`act_combat_${mid}`)) errors.push(`怪物 ${mid} 缺少战斗动作 act_combat_${mid}`);
  });
});

if (errors.length) {
  console.error('❌ 发现', errors.length, '个问题：');
  errors.forEach((e) => console.error('  -', e));
  process.exit(1);
} else {
  console.log('✅ 内容完整性校验通过，无悬空引用。');
  console.log('   统计 -> items:', pack.items.length, '| actions:', pack.actions.length, '| monsters:', pack.monsters.length, '| stages:', pack.stages.length, '| sets:', pack.equipmentSets.length);
}
