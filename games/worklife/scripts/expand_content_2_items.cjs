/**
 * 内容拓展脚本 #2：高阶装备 + 增益消耗品(Buff)
 *
 * 1) 新增 tier 5/6/7 的整套装备（武器/副手/头/胸/腿/脚/手/饰品），
 *    对应雪山(冰系 tier5)、熔岩(火系 tier6)、传说(tier7)三档主题。
 * 2) 新增「增益消耗品」：食物与药剂，effect 中带 buff 字段
 *    （duration 秒 + multipliers 倍率 / stats 加成），供 Buff 系统消费。
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

// ---------------- 高阶装备 ----------------
// 每档主题：tier, 名称前缀, 攻防系数
const gearThemes = [
  { tier: 5, prefix: '霜寒', key: 'frost', atk: 36, def: 30 },
  { tier: 6, prefix: '熔岩', key: 'magma', atk: 52, def: 44 },
  { tier: 7, prefix: '神话', key: 'myth', atk: 72, def: 62 },
];

// 防具槽位定义（slot -> 中文 + 防御占比）
const armorSlots = [
  { slot: 'head', name: '头盔', ratio: 0.5 },
  { slot: 'chest', name: '胸甲', ratio: 1.0 },
  { slot: 'legs', name: '护腿', ratio: 0.8 },
  { slot: 'feet', name: '战靴', ratio: 0.4 },
  { slot: 'hands', name: '护手', ratio: 0.35 },
];

let gearCount = 0;
gearThemes.forEach((t) => {
  // 武器
  ensureItem({
    id: `weapon_${t.key}_blade`,
    name: `${t.prefix}战刃`,
    type: 'weapon',
    tier: t.tier,
    atk: t.atk,
    slot: 'main_hand',
    description: `${t.prefix}主题的强力武器，攻击 +${t.atk}。`,
  });
  gearCount++;
  // 副手
  ensureItem({
    id: `offhand_${t.key}_shield`,
    name: `${t.prefix}守护盾`,
    type: 'offhand',
    tier: t.tier,
    def: Math.round(t.def * 0.7),
    slot: 'off_hand',
    description: `${t.prefix}主题的坚固副手，防御 +${Math.round(t.def * 0.7)}。`,
  });
  gearCount++;
  // 防具五件
  armorSlots.forEach((a) => {
    ensureItem({
      id: `armor_${t.key}_${a.slot}`,
      name: `${t.prefix}${a.name}`,
      type: 'armor',
      tier: t.tier,
      def: Math.round(t.def * a.ratio),
      slot: a.slot,
      description: `${t.prefix}主题护甲，防御 +${Math.round(t.def * a.ratio)}。`,
    });
    gearCount++;
  });
  // 饰品
  ensureItem({
    id: `accessory_${t.key}_ring`,
    name: `${t.prefix}之戒`,
    type: 'accessory',
    tier: t.tier,
    atk: Math.round(t.atk * 0.4),
    def: Math.round(t.def * 0.4),
    slot: 'accessory',
    description: `${t.prefix}主题饰品，攻击 +${Math.round(t.atk * 0.4)}，防御 +${Math.round(t.def * 0.4)}。`,
  });
  gearCount++;
});

// ---------------- 增益消耗品（Buff）----------------
// effect.buff: { id, name, durationSec, multipliers?{gatherSpeed,craftSpeed,combatSpeed,xpGain,goldGain}, stats?{atk,def} }
const buffConsumables = [
  {
    id: 'food_hearty_stew',
    name: '丰盛炖菜',
    tier: 2,
    desc: '食用后 10 分钟内采集速度 +15%。',
    buff: { id: 'buff_gather_15', name: '采集加速', durationSec: 600, multipliers: { gatherSpeed: 1.15 } },
  },
  {
    id: 'food_master_feast',
    name: '大师盛宴',
    tier: 4,
    desc: '食用后 20 分钟内采集速度 +30%、经验 +15%。',
    buff: { id: 'buff_gather_30_xp', name: '丰收宴', durationSec: 1200, multipliers: { gatherSpeed: 1.3, xpGain: 1.15 } },
  },
  {
    id: 'potion_craft_focus',
    name: '专注药剂',
    tier: 2,
    desc: '饮用后 10 分钟内制作速度 +20%。',
    buff: { id: 'buff_craft_20', name: '制作专注', durationSec: 600, multipliers: { craftSpeed: 1.2 } },
  },
  {
    id: 'potion_battle_fury',
    name: '狂战药剂',
    tier: 3,
    desc: '饮用后 10 分钟内战斗速度 +20%、攻击 +20。',
    buff: { id: 'buff_combat_fury', name: '狂战之怒', durationSec: 600, multipliers: { combatSpeed: 1.2 }, stats: { atk: 20 } },
  },
  {
    id: 'potion_fortune',
    name: '幸运药剂',
    tier: 3,
    desc: '饮用后 15 分钟内金币收益 +25%。',
    buff: { id: 'buff_fortune', name: '财运亨通', durationSec: 900, multipliers: { goldGain: 1.25 } },
  },
  {
    id: 'potion_scholar',
    name: '智者药剂',
    tier: 3,
    desc: '饮用后 15 分钟内全部经验 +25%。',
    buff: { id: 'buff_scholar', name: '博学', durationSec: 900, multipliers: { xpGain: 1.25 } },
  },
  {
    id: 'elixir_legend',
    name: '传说灵药',
    tier: 6,
    desc: '饮用后 30 分钟内全速度 +25%、全经验 +25%、金币 +25%。',
    buff: {
      id: 'buff_legend',
      name: '传说加持',
      durationSec: 1800,
      multipliers: { gatherSpeed: 1.25, craftSpeed: 1.25, combatSpeed: 1.25, xpGain: 1.25, goldGain: 1.25 },
    },
  },
];

buffConsumables.forEach((c) => {
  ensureItem({
    id: c.id,
    name: c.name,
    type: 'consumable',
    tier: c.tier,
    effect: { buff: c.buff },
    description: c.desc,
  });
});

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n', 'utf8');

console.log('内容拓展 #2 完成：');
console.log('  新增高阶装备:', gearCount);
console.log('  新增增益消耗品:', buffConsumables.length);
console.log('  现总计 items:', pack.items.length);
