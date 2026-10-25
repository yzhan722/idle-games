/**
 * 第 20 步：去重名。三处同 ID 不同物却共用一个名字，玩家无法区分版本：
 *   ingot_9「秘银锭」→「神域秘银锭」（其矿石 ore_9 就叫神域秘银，与 t6 秘银锭区分）
 *   potion_berserk「狂战药剂」→「极·狂战药剂」（t9 版 vs t3 狂战药剂）
 *   infernal_dragon「炼狱火龙」→「炼狱魔龙」（lvl114 vs inferno_drake lvl58）
 *   weapon_staff_t4「创世法杖」→「奥术法杖」（t4 档 vs weapon_genesis_staff t9 真创世杖）
 * 动作/怪物名同步；只改显示名，ID 不变。幂等。
 */
const fs = require('fs');
const path = require('path');
const PACK = path.join(__dirname, '..', 'shared', 'enhanced_content_pack_chinese.json');
const pack = JSON.parse(fs.readFileSync(PACK, 'utf8'));

const RENAMES = {
  items:    {
    ingot_9: '神域秘银锭',
    potion_berserk: '极·狂战药剂',
    weapon_staff_t4: '奥术法杖',
  },
  monsters: { infernal_dragon: '炼狱魔龙' },
  actions:  {
    act_smelt_ingot_t9: '冶炼神域秘银锭',
    act_brew_potion_berserk: '炼制极·狂战药剂',
    act_combat_infernal_dragon: '战斗：炼狱魔龙',
    act_craft_staff_t4: '制作奥术法杖',
  },
};

let changed = 0;
for (const [section, map] of Object.entries(RENAMES)) {
  for (const entry of pack[section] || []) {
    const want = map[entry.id];
    if (want && entry.name !== want) { entry.name = want; changed++; }
  }
}

// 防回归断言：同类物品不得重名
const dupCheck = (arr, label) => {
  const seen = new Map();
  for (const e of arr || []) {
    if (!e.name) continue;
    (seen.get(e.name) || seen.set(e.name, []).get(e.name)).push(e.id);
  }
  const dups = [...seen.entries()].filter(([, v]) => v.length > 1);
  if (dups.length) console.log(`警告 ${label} 仍有重名:`, dups.map(([k, v]) => `${k}(${v.join(',')})`).join(' '));
};
dupCheck(pack.items, 'items');
dupCheck(pack.monsters, 'monsters');
dupCheck(pack.actions, 'actions');

if (changed) fs.writeFileSync(PACK, JSON.stringify(pack, null, 2) + '\n');
console.log(`重命名 ${changed} 处${changed === 0 ? '（已是最新）' : ''}`);
