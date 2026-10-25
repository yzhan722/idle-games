/**
 * 内容拓展脚本 #18：采集 / 生产技能拆分
 *
 * 每职业原本一条 skill_<profession> 同时喂采集与生产动作的经验。
 * 改为两条独立技能（MWI 语义：Milking 与 Cheese Smithing 分开升级）：
 *   - 采集侧沿用历史 id：skill_woodcutter / skill_blacksmith / skill_farmer /
 *     skill_chef / skill_tailor / skill_alchemist
 *   - 生产侧用动作名 id：skill_woodworking / skill_smithing / skill_husbandry /
 *     skill_cooking / skill_tailoring / skill_alchemy
 *
 * 变换：
 *   1. actions：consumes 非空（生产动作）且 skillId 是采集 id → 改为生产 id
 *   2. items.toolFor：生产工具（锻锤/锅具/裁缝剪/炼金瓶）→ 生产 id；斧头/锄头/镰刀留采集侧
 *   3. skills 元数据段：补齐 6 条生产技能条目
 *
 * 幂等：只重写仍指向采集 id 的引用，二次运行为空操作。
 */
const fs = require('fs');
const path = require('path');

const PACK_PATH = path.join(__dirname, '..', 'shared', 'enhanced_content_pack_chinese.json');
const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));

const GATHER_TO_CRAFT = {
  skill_woodcutter: 'skill_woodworking',
  skill_blacksmith: 'skill_smithing',
  skill_farmer: 'skill_husbandry',
  skill_chef: 'skill_cooking',
  skill_tailor: 'skill_tailoring',
  skill_alchemist: 'skill_alchemy',
};

const CRAFT_SKILL_NAMES = {
  skill_woodworking: '木工技能',
  skill_smithing: '锻造技能',
  skill_husbandry: '畜牧技能',
  skill_cooking: '烹饪技能',
  skill_tailoring: '缝纫技能',
  skill_alchemy: '炼金技能',
};

const GATHER_TO_CLASS = {
  skill_woodcutter: 'woodcutter',
  skill_blacksmith: 'blacksmith',
  skill_farmer: 'farmer',
  skill_chef: 'chef',
  skill_tailor: 'tailor',
  skill_alchemist: 'alchemist',
};

// 生产工具 → 对应生产技能；斧头/锄头/镰刀留在采集侧不动
const TOOL_RETARGET = {
  weapon_forge_hammer_t1: 'skill_smithing',
  weapon_forge_hammer_t2: 'skill_smithing',
  weapon_forge_hammer_t3: 'skill_smithing',
  weapon_forge_hammer_t4: 'skill_smithing',
  weapon_frying_pan_t1: 'skill_cooking',
  weapon_frying_pan_t2: 'skill_cooking',
  weapon_frying_pan_t3: 'skill_cooking',
  weapon_spatula_t1: 'skill_cooking',
  weapon_spatula_t2: 'skill_cooking',
  weapon_spatula_t3: 'skill_cooking',
  weapon_scissors_t1: 'skill_tailoring',
  weapon_scissors_t2: 'skill_tailoring',
  weapon_scissors_t3: 'skill_tailoring',
  weapon_scissors_t4: 'skill_tailoring',
  weapon_alchemy_bottle_t1: 'skill_alchemy',
  weapon_alchemy_bottle_t2: 'skill_alchemy',
  weapon_alchemy_bottle_t3: 'skill_alchemy',
};

// 1) 动作：有 consumes → 生产技能
let actionsMoved = 0;
for (const a of pack.actions) {
  const craft = GATHER_TO_CRAFT[a.skillId];
  if (craft && Array.isArray(a.consumes) && a.consumes.length > 0) {
    a.skillId = craft;
    actionsMoved++;
  }
}

// 2) 工具重指
let toolsMoved = 0;
for (const item of pack.items) {
  const target = TOOL_RETARGET[item.id];
  if (target && item.toolFor !== target) {
    item.toolFor = target;
    toolsMoved++;
  }
}

// 3) skills 元数据：补生产侧条目（采集侧条目保持原 id/name 不动）
pack.skills = pack.skills || [];
const existing = new Set(pack.skills.map((s) => s.id));
let skillsAdded = 0;
for (const [gatherId, craftId] of Object.entries(GATHER_TO_CRAFT)) {
  if (!existing.has(craftId)) {
    pack.skills.push({ id: craftId, classId: GATHER_TO_CLASS[gatherId], name: CRAFT_SKILL_NAMES[craftId] });
    skillsAdded++;
  }
}

fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n');
console.log(`skill split: ${actionsMoved} actions → production skills, ${toolsMoved} tools retargeted, ${skillsAdded} skill entries added`);
