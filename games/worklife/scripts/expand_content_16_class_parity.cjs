/**
 * 内容拓展脚本 #16：职业深度对齐 + 终局套分流
 *
 * 1) 职业深度对齐 —— 动作数补齐到 ≥45（blacksmith 90 的 50%）：
 *    - farmer   +20: 种植双线补全(谷物/蔬菜/草药/花卉) + 畜牧延伸(兔/猪/蜂/马) + 加工(磨粉/榨油/饲料)
 *    - woodcutter +7: 高阶弓 + 木盾 + 树脂采集 + 木炭
 *    - chef     +8:  饮品链补全 + 酱汁 + 高阶烹饪
 *    - tailor   +3:  染色布 + 披风 + 大口袋
 * 2) XP 速率归一：chef/alchemist 高段 xp 补齐到分段中位数
 * 3) 终局套分流：void_hunter_set → tailor(猎人皮甲), 新增 arcane_sage_set→alchemist, nature_warden_set→woodcutter
 *    结果: 铁匠终局占比 7/7 → 6/9 (67%)
 *
 * 幂等：节点/套装/物品/动作按 id upsert。
 */
const fs = require('fs');
const path = require('path');

const PACK_PATH = path.join(__dirname, '..', 'shared', 'enhanced_content_pack_chinese.json');
const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));

function upsertById(arr, item) {
  const idx = arr.findIndex((x) => x.id === item.id);
  if (idx >= 0) arr[idx] = item; else arr.push(item);
}
const newItems = [];
const newActions = [];
const act = (a) => newActions.push(a);
const item = (i) => newItems.push(i);

/* ==================== 1. 新素材/产物 ==================== */
const M = (id, name, tier, value, desc) => item({ id, name, type: 'material', tier, value, description: desc });
const C = (id, name, tier, value, effect, desc) => item({ id, name, type: 'consumable', tier, value, effect, description: desc });
const food = (hp, buff) => ({ hp, ...(buff ? { buff } : {}) });
const drink = (mp, buff) => ({ mp, ...(buff ? { buff } : {}) });
const buff = (id, name, multipliers, durationSec) => ({ id, name, multipliers, durationSec });

M('grain', '灵谷', 1, 3, '最基础的谷物，可磨粉或做饲料。');
M('corn', '灵玉米', 2, 8, '高产灵谷，颗粒饱满。');
M('vegetable', '灵蔬', 2, 10, '四季常青的灵蔬，烹饪常客。');
M('herb_farm', '灵草', 3, 18, '田垄间培育的灵草，炼金与调味通用。');
M('flower_spirit', '灵花', 4, 30, '灵气凝聚的花卉，可制香料与染剂。');
M('hay', '干草', 1, 2, '晒干的灵草料，畜牧必备。');
M('feed_animal', '精饲料', 2, 12, '谷物与干草配比而成，牲畜长得更快。');
M('rabbit_fur', '兔绒', 2, 14, '柔软细密的兔绒，裁缝上料。');
M('pork', '灵猪肉', 3, 20, '肥瘦相宜的灵猪肉，厨师大宗采购。');
M('honey', '灵蜜', 3, 26, '灵蜂采百花而酿，甜润回甘。');
M('leather_hide', '兽皮', 2, 9, '完整剥取的兽皮，可鞣制革料。');
M('dung', '灵肥', 1, 4, '发酵的灵肥，让灵田产量翻倍。');
M('horse_mane', '灵马尾', 5, 60, '灵马尾鬃，强韧轻盈，可做弓弦与缨络。');
M('resin', '灵树脂', 3, 22, '古树渗出的树脂，可炼胶与涂料。');
M('charcoal', '灵木炭', 2, 10, '闷烧而成的灵木炭，火力绵长，铁匠挚爱。');
M('flour', '灵面粉', 2, 10, '灵谷磨成的细粉，面包糕点的根基。');
M('oil', '灵油', 2, 12, '灵谷榨取的油脂，炒菜煎炸皆宜。');
C('bread', '灵面包', 2, 15, food(120, buff('buff_bread', '灵面包·饱腹', { gatherSpeed: 1.05 }, 300)), '外脆内软的灵面包，恢复120点生命值。');
C('butter', '灵黄油', 2, 14, food(100, buff('buff_butter', '灵黄油·醇香', { craftSpeed: 1.05 }, 300)), '鲜奶搅打出的黄油，恢复100点生命值。');
C('cheese_wheel', '灵乳酪', 3, 28, food(300, buff('buff_cheese', '灵乳酪·醇厚', { xpGain: 1.1 }, 600)), '窖藏发酵的灵乳酪，恢复300点生命值，经验+10%。');
C('drink_fine', '佳酿', 2, 40, drink(80, buff('buff_drink_fine', '佳酿·酣畅', { craftSpeed: 1.12, xpGain: 1.05 }, 480)), '精心调制的佳酿，恢复80点魔法值，制作+12%、经验+5%。');
C('drink_rich', '醇酿', 3, 80, drink(160, buff('buff_drink_rich', '醇酿·沉醉', { craftSpeed: 1.18, xpGain: 1.1 }, 600)), '经年窖藏的醇酿，恢复160点魔法值，制作+18%、经验+10%。');
C('tea_spirit', '灵茶', 3, 60, drink(120, buff('buff_tea_spirit', '灵茶·清心', { xpGain: 1.12 }, 600)), '灵花窨制的清茶，恢复120点魔法值，经验+12%。');
C('sauce_secret', '秘制酱汁', 4, 90, food(200, buff('buff_sauce', '酱汁·提鲜', { gatherSpeed: 1.1, craftSpeed: 1.1 }, 420)), '浓缩百草精华的酱汁，恢复200点生命值，采集制作各+10%。');
C('soup_herbal', '药膳汤', 3, 55, food(250, buff('buff_soup', '药膳·温补', { combatSpeed: 1.05 }, 600)), '灵草慢炖的药膳汤，恢复250点生命值，攻速+5%。');
M('dyed_cloth', '染布', 3, 35, '以灵花染就的布匹，色泽经年不褪。');
M('yarn_silk_fine', '精丝', 5, 120, '灵蚕吐的极细精丝，织造高阶织物。');
C('food_grain_meal', '灵谷饭', 1, 8, food(80), '灵谷蒸出的主食，恢复80点生命值。');
C('food_vegetable_stew', '时蔬炖', 2, 30, food(160, buff('buff_veg_stew', '时蔬炖·清鲜', { gatherSpeed: 1.08 }, 420)), '灵蔬与灵谷同炖，恢复160点生命值，采集+8%。');
C('food_pork_roast', '炙烤灵豚', 4, 110, food(500, buff('buff_pork_roast', '炙豚·勇力', { combatSpeed: 1.12 }, 900)), '灵猪肉炙烤至表皮酥脆，恢复500点生命值，攻速+12%。');
C('food_honey_cake', '灵蜜糕', 3, 70, food(200, buff('buff_honey_cake', '蜜糕·甜润', { xpGain: 1.08 }, 480)), '灵蜜入糕，恢复200点生命值，经验+8%。');
C('drink_herbal_tonic', '灵草汤剂', 2, 45, drink(100, buff('buff_tonic', '汤剂·清凉', { craftSpeed: 1.08 }, 420)), '灵草煎煮的汤剂，恢复100点魔法值，制作+8%。');

/* ==================== 2. 农夫新动作 (+20) ==================== */
const F = (id, name, lvl, s, xp, yields, consumes) => act({
  id, name, skillId: 'skill_farmer', duration: Math.round(s * 1000), xp,
  requirements: { skillLevel: lvl }, yields, consumes: consumes || [],
});
// 种植双线
F('act_plant_grain_t1', '种植灵谷', 2, 5, 9, [{ itemId: 'grain', qty: 3 }]);
F('act_plant_corn_t2', '种植灵玉米', 15, 9, 22, [{ itemId: 'corn', qty: 2 }]);
F('act_plant_vegetable_t2', '种植灵蔬', 18, 11, 28, [{ itemId: 'vegetable', qty: 2 }]);
F('act_plant_herb_t3', '培育灵草', 32, 15, 52, [{ itemId: 'herb_farm', qty: 2 }]);
F('act_plant_flower_t4', '培育灵花', 45, 20, 100, [{ itemId: 'flower_spirit', qty: 2 }]);
// 畜牧延伸
F('act_raise_rabbit_t2', '饲养灵兔', 12, 9, 20, [{ itemId: 'rabbit_fur', qty: 2 }], [{ itemId: 'feed_animal', qty: 1 }]);
F('act_raise_pig_t3', '饲养灵猪', 28, 14, 55, [{ itemId: 'pork', qty: 2 }], [{ itemId: 'feed_animal', qty: 2 }]);
F('act_raise_bee_t3', '饲养灵蜂', 38, 16, 70, [{ itemId: 'honey', qty: 2 }], [{ itemId: 'flower_spirit', qty: 1 }]);
F('act_raise_horse_t4', '饲养灵马', 55, 22, 130, [{ itemId: 'horse_mane', qty: 1 }, { itemId: 'leather_hide', qty: 1 }], [{ itemId: 'feed_animal', qty: 3 }]);
// 肥料自循环
F('act_raise_dung', '收集灵肥', 8, 6, 8, [{ itemId: 'dung', qty: 3 }]);
F('act_make_feed', '调配精饲料', 16, 8, 22, [{ itemId: 'feed_animal', qty: 2 }], [{ itemId: 'grain', qty: 2 }, { itemId: 'hay', qty: 1 }]);
F('act_dry_hay', '晾晒干草', 4, 4, 6, [{ itemId: 'hay', qty: 3 }], [{ itemId: 'fiber_1', qty: 2 }]);
// 加工链
F('act_mill_flour', '磨制灵面粉', 14, 7, 18, [{ itemId: 'flour', qty: 2 }], [{ itemId: 'grain', qty: 2 }]);
F('act_press_oil', '压榨灵油', 22, 9, 30, [{ itemId: 'oil', qty: 2 }], [{ itemId: 'corn', qty: 2 }]);
F('act_churn_butter', '搅制灵黄油', 26, 10, 40, [{ itemId: 'butter', qty: 1 }], [{ itemId: 'milk', qty: 2 }]);
F('act_age_cheese', '窖藏灵乳酪', 40, 18, 85, [{ itemId: 'cheese_wheel', qty: 1 }], [{ itemId: 'milk', qty: 4 }]);
F('act_tan_hide', '鞣制兽皮', 30, 12, 45, [{ itemId: 'yarn_2', qty: 1 }], [{ itemId: 'leather_hide', qty: 2 }]);
// 高阶农牧
F('act_plant_star_grain', '种植星谷', 70, 26, 190, [{ itemId: 'grain', qty: 5 }, { itemId: 'flower_spirit', qty: 2 }]);
F('act_raise_spirit_boar', '驯养灵彘', 80, 30, 240, [{ itemId: 'pork', qty: 3 }, { itemId: 'leather_hide', qty: 2 }], [{ itemId: 'feed_animal', qty: 4 }]);
F('act_compose_fertilizer', '沤制灵肥', 60, 20, 130, [{ itemId: 'dung', qty: 4 }], [{ itemId: 'fiber_5', qty: 2 }]);

/* ==================== 3. 木工新动作 (+7) ==================== */
const W = (id, name, lvl, s, xp, yields, consumes) => act({
  id, name, skillId: 'skill_woodcutter', duration: Math.round(s * 1000), xp,
  requirements: { skillLevel: lvl }, yields, consumes: consumes || [],
});
W('act_craft_wooden_bow_t2', '制作硬木弓', 30, 16, 50, [{ itemId: 'weapon_wooden_bow_t2', qty: 1 }], [{ itemId: 'lumber_3', qty: 2 }, { itemId: 'yarn_2', qty: 1 }]);
W('act_craft_wooden_bow_t3', '制作灵木长弓', 55, 24, 130, [{ itemId: 'weapon_wooden_bow_t3', qty: 1 }], [{ itemId: 'lumber_5', qty: 3 }, { itemId: 'horse_mane', qty: 1 }]);
W('act_craft_wooden_shield', '制作木盾', 10, 9, 16, [{ itemId: 'offhand_wooden_shield', qty: 1 }], [{ itemId: 'lumber_1', qty: 3 }]);
W('act_tap_resin', '采集灵树脂', 30, 12, 45, [{ itemId: 'resin', qty: 2 }]);
W('act_burn_charcoal', '烧制灵木炭', 20, 15, 38, [{ itemId: 'charcoal', qty: 2 }], [{ itemId: 'wood_2', qty: 3 }]);
W('act_craft_resin_bow', '制作树脂复合弓', 45, 20, 95, [{ itemId: 'weapon_resin_bow', qty: 1 }], [{ itemId: 'lumber_4', qty: 2 }, { itemId: 'resin', qty: 2 }]);
W('act_split_shingles', '劈制木瓦', 5, 5, 9, [{ itemId: 'lumber_1', qty: 1 }, { itemId: 'wood_1', qty: 1 }], [{ itemId: 'wood_1', qty: 2 }]);

/* ==================== 4. 厨师新动作 (+8) ==================== */
const K = (id, name, lvl, s, xp, yields, consumes) => act({
  id, name, skillId: 'skill_chef', duration: Math.round(s * 1000), xp,
  requirements: { skillLevel: lvl }, yields, consumes: consumes || [],
});
K('act_cook_grain_meal', '蒸制灵谷饭', 5, 5, 12, [{ itemId: 'food_grain_meal', qty: 2 }], [{ itemId: 'grain', qty: 2 }]);
K('act_bake_bread', '烤制灵面包', 12, 8, 22, [{ itemId: 'bread', qty: 2 }], [{ itemId: 'flour', qty: 2 }]);
K('act_brew_drink_t2', '调制佳酿', 30, 12, 50, [{ itemId: 'drink_fine', qty: 1 }], [{ itemId: 'drink_basic', qty: 1 }, { itemId: 'honey', qty: 1 }]);
K('act_brew_drink_t3', '窖藏醇酿', 55, 18, 95, [{ itemId: 'drink_rich', qty: 1 }], [{ itemId: 'drink_fine', qty: 1 }, { itemId: 'flower_spirit', qty: 1 }]);
K('act_brew_tea', '窨制灵茶', 40, 14, 70, [{ itemId: 'tea_spirit', qty: 1 }], [{ itemId: 'herb_farm', qty: 2 }]);
K('act_simmer_soup', '慢炖药膳汤', 35, 16, 60, [{ itemId: 'soup_herbal', qty: 1 }], [{ itemId: 'herb_farm', qty: 1 }, { itemId: 'fish_river', qty: 1 }]);
K('act_make_sauce', '熬制秘制酱汁', 60, 22, 110, [{ itemId: 'sauce_secret', qty: 1 }], [{ itemId: 'herb_farm', qty: 2 }, { itemId: 'honey', qty: 1 }, { itemId: 'oil', qty: 1 }]);
K('act_cook_pork_roast', '炙烤灵豚', 65, 24, 135, [{ itemId: 'food_pork_roast', qty: 1 }], [{ itemId: 'pork', qty: 2 }, { itemId: 'sauce_secret', qty: 1 }]);
K('act_cook_vegetable_stew', '烹煮时蔬炖', 18, 10, 26, [{ itemId: 'food_vegetable_stew', qty: 1 }], [{ itemId: 'vegetable', qty: 2 }, { itemId: 'grain', qty: 1 }]);
K('act_bake_honey_cake', '烘制灵蜜糕', 42, 15, 72, [{ itemId: 'food_honey_cake', qty: 1 }], [{ itemId: 'flour', qty: 2 }, { itemId: 'honey', qty: 1 }, { itemId: 'egg', qty: 1 }]);
K('act_brew_herbal_tonic', '煎制灵草汤剂', 25, 11, 38, [{ itemId: 'drink_herbal_tonic', qty: 1 }], [{ itemId: 'herb_farm', qty: 2 }, { itemId: 'honey', qty: 1 }]);

/* ==================== 5. 裁缝新动作 (+3) ==================== */
const T = (id, name, lvl, s, xp, yields, consumes) => act({
  id, name, skillId: 'skill_tailor', duration: Math.round(s * 1000), xp,
  requirements: { skillLevel: lvl }, yields, consumes: consumes || [],
});
T('act_dye_cloth', '染制彩布', 25, 10, 35, [{ itemId: 'dyed_cloth', qty: 2 }], [{ itemId: 'yarn_2', qty: 2 }, { itemId: 'flower_spirit', qty: 1 }]);
T('act_spin_silk_fine', '缫制精丝', 55, 20, 110, [{ itemId: 'yarn_silk_fine', qty: 1 }], [{ itemId: 'shadow_silk', qty: 1 }, { itemId: 'yarn_3', qty: 2 }]);
T('act_craft_cloak', '缝制披风', 35, 15, 60, [{ itemId: 'armor_traveler_cloak', qty: 1 }], [{ itemId: 'dyed_cloth', qty: 2 }, { itemId: 'yarn_3', qty: 1 }]);
T('act_craft_pouch_large', '缝制大行囊', 50, 18, 90, [{ itemId: 'accessory_pouch_large', qty: 1 }], [{ itemId: 'dyed_cloth', qty: 3 }, { itemId: 'leather_hide', qty: 2 }]);

/* ==================== 6. 新装备物品 ==================== */
const EQ = (id, name, slot, tier, stats, value, desc) => item({ id, name, type: slot === 'main_hand' ? 'weapon' : slot === 'off_hand' || slot === 'shield' ? 'offhand' : 'armor', tier, slot, value, description: desc, ...stats });
const ACC = (id, name, tier, stats, value, desc) => item({ id, name, type: 'accessory', tier, value, description: desc, ...stats });

EQ('weapon_wooden_bow_t2', '硬木长弓', 'main_hand', 4, { atk: 28 }, 800, '硬木为身、灵筋为弦的长弓。');
EQ('weapon_wooden_bow_t3', '灵木长弓', 'main_hand', 6, { atk: 55 }, 3600, '灵木与灵马鬃筋复合的长弓。');
EQ('offhand_wooden_shield', '木盾', 'off_hand', 2, { def: 10 }, 200, '厚木削成的圆盾。');
EQ('weapon_resin_bow', '树脂复合弓', 'main_hand', 5, { atk: 42 }, 2100, '树脂胶合多层灵木的复合弓。');
EQ('armor_traveler_cloak', '旅者披风', 'chest', 4, { def: 18 }, 900, '染布缝制的旅者披风，挡风遮雨。');
ACC('accessory_pouch_large', '大行囊', 5, { def: 6 }, 1500, '多层缝合的大行囊，能装下半间铺子。');

/* ==================== 7. 终局新套装 ==================== */
// 奥术贤者套 → alchemist（袍甲+法器，吃裂隙/创世素材）
EQ('weapon_arcane_scepter', '奥术权杖', 'main_hand', 9, { atk: 180 }, 88000, '裂隙水晶核心的权杖，挥动间奥能共鸣。');
EQ('armor_arcane_sage_hood', '贤者法冠', 'head', 9, { def: 75 }, 62000, '缀满秘纹的法冠，护持神识。');
EQ('armor_arcane_sage_robe', '贤者法袍', 'chest', 9, { def: 120 }, 98000, '影丝织就的法袍，奥能流转不息。');
EQ('armor_arcane_sage_legs', '贤者下摆', 'legs', 9, { def: 95 }, 74000, '法袍下摆，步履轻盈不沾尘。');
ACC('accessory_arcane_pendant', '奥术吊坠', 9, { atk: 25, def: 30 }, 55000, '封存奥能精粹的吊坠。');
// 自然守望套 → woodcutter（活木+树脂+自然素材）
EQ('weapon_warden_bow', '守望者长弓', 'main_hand', 9, { atk: 170 }, 85000, '千年灵木主干所制，箭出如风过林梢。');
EQ('armor_warden_helm', '守望者盔', 'head', 9, { def: 70 }, 58000, '活木生枝的头盔，林间隐秘难寻。');
EQ('armor_warden_chest', '守望者胸甲', 'chest', 9, { def: 110 }, 92000, '活木与树脂交融的胸甲，受伤处缓缓自愈。');
EQ('armor_warden_legs', '守望者腿甲', 'legs', 9, { def: 88 }, 70000, '藤木缠绕的腿甲，踏叶无声。');

const A = (id, name, lvl, s, xp, yields, consumes) => act({
  id, name, skillId: 'skill_alchemist', duration: Math.round(s * 1000), xp,
  requirements: { skillLevel: lvl }, yields, consumes: consumes || [],
});
A('act_craft_arcane_scepter', '炼制奥术权杖', 92, 30, 380, [{ itemId: 'weapon_arcane_scepter', qty: 1 }], [{ itemId: 'rift_crystal', qty: 2 }, { itemId: 'holy_gold', qty: 1 }, { itemId: 'wood_9', qty: 2 }]);
A('act_craft_arcane_hood', '炼制贤者法冠', 90, 26, 330, [{ itemId: 'armor_arcane_sage_hood', qty: 1 }], [{ itemId: 'rift_crystal', qty: 1 }, { itemId: 'shadow_silk', qty: 3 }]);
A('act_craft_arcane_robe', '炼制贤者法袍', 95, 34, 450, [{ itemId: 'armor_arcane_sage_robe', qty: 1 }], [{ itemId: 'rift_crystal', qty: 2 }, { itemId: 'shadow_silk', qty: 4 }, { itemId: 'holy_gold', qty: 1 }]);
A('act_craft_arcane_legs', '炼制贤者下摆', 92, 28, 360, [{ itemId: 'armor_arcane_sage_legs', qty: 1 }], [{ itemId: 'shadow_silk', qty: 4 }]);
A('act_craft_arcane_pendant', '炼制奥术吊坠', 88, 24, 300, [{ itemId: 'accessory_arcane_pendant', qty: 1 }], [{ itemId: 'rift_crystal', qty: 1 }, { itemId: 'genesis_light', qty: 1 }]);

const NW = (id, name, lvl, s, xp, yields, consumes) => act({
  id, name, skillId: 'skill_woodcutter', duration: Math.round(s * 1000), xp,
  requirements: { skillLevel: lvl }, yields, consumes: consumes || [],
});
NW('act_craft_warden_bow', '制作守望者长弓', 92, 30, 370, [{ itemId: 'weapon_warden_bow', qty: 1 }], [{ itemId: 'wood_10', qty: 3 }, { itemId: 'horse_mane', qty: 2 }, { itemId: 'resin', qty: 3 }]);
NW('act_craft_warden_helm', '制作守望者盔', 90, 26, 330, [{ itemId: 'armor_warden_helm', qty: 1 }], [{ itemId: 'wood_10', qty: 2 }, { itemId: 'celestial_feather', qty: 2 }, { itemId: 'resin', qty: 2 }]);
NW('act_craft_warden_chest', '制作守望者胸甲', 95, 34, 440, [{ itemId: 'armor_warden_chest', qty: 1 }], [{ itemId: 'wood_10', qty: 3 }, { itemId: 'celestial_feather', qty: 3 }, { itemId: 'void_shard', qty: 1 }]);
NW('act_craft_warden_legs', '制作守望者腿甲', 92, 28, 350, [{ itemId: 'armor_warden_legs', qty: 1 }], [{ itemId: 'wood_10', qty: 2 }, { itemId: 'celestial_feather', qty: 2 }, { itemId: 'resin', qty: 2 }]);

const newSets = [
  {
    id: 'arcane_sage_set', name: '奥术贤者套装', profession: 'alchemist',
    pieces: [
      { slot: 'main_hand', itemId: 'weapon_arcane_scepter' },
      { slot: 'head', itemId: 'armor_arcane_sage_hood' },
      { slot: 'chest', itemId: 'armor_arcane_sage_robe' },
      { slot: 'legs', itemId: 'armor_arcane_sage_legs' },
      { slot: 'accessory1', itemId: 'accessory_arcane_pendant' },
    ],
    bonuses: [
      { requiredPieces: 2, stats: { atk: 35, def: 25 }, description: '2件套：攻击+35，防御+25' },
      { requiredPieces: 3, stats: { atk: 70, def: 50 }, description: '3件套：攻击+70，防御+50' },
      { requiredPieces: 4, stats: { atk: 140, def: 95, combatSpeed: 3 }, description: '4件套：攻击+140，防御+95，生命+550' },
      { requiredPieces: 5, stats: { atk: 200, def: 140, combatSpeed: 5 }, description: '5件套：攻击+200，防御+140，生命+900，奥能涌动' },
    ],
  },
  {
    id: 'nature_warden_set', name: '自然守望套装', profession: 'woodcutter',
    pieces: [
      { slot: 'main_hand', itemId: 'weapon_warden_bow' },
      { slot: 'head', itemId: 'armor_warden_helm' },
      { slot: 'chest', itemId: 'armor_warden_chest' },
      { slot: 'legs', itemId: 'armor_warden_legs' },
    ],
    bonuses: [
      { requiredPieces: 2, stats: { atk: 32, def: 22 }, description: '2件套：攻击+32，防御+22' },
      { requiredPieces: 3, stats: { atk: 68, def: 48 }, description: '3件套：攻击+68，防御+48' },
      { requiredPieces: 4, stats: { atk: 135, def: 92, combatSpeed: 3 }, description: '4件套：攻击+135，防御+92，生命+520，林间守护' },
    ],
  },
];

/* ==================== 8. 树节点补充 ==================== */
const treeAdds = {
  farmer: [
    { id: 'farmer_grain_farming', name: '谷物种植', description: '开垦灵田种谷物蔬菜。', requirements: { level: 2, prerequisites: ['farmer_basic_planting'] }, unlocks: { actions: ['act_plant_grain_t1', 'act_dry_hay'] } },
    { id: 'farmer_vegetable_farming', name: '蔬果培育', description: '培育灵蔬与灵草。', requirements: { level: 15, prerequisites: ['farmer_grain_farming'] }, unlocks: { actions: ['act_plant_corn_t2', 'act_plant_vegetable_t2', 'act_mill_flour'] } },
    { id: 'farmer_ranching', name: '牧场经营', description: '饲养灵兔灵猪，收兔绒与灵肉。', requirements: { level: 12, prerequisites: ['farmer_animal_husbandry'] }, unlocks: { actions: ['act_raise_rabbit_t2', 'act_make_feed', 'act_raise_dung'] } },
    { id: 'farmer_apiary', name: '灵蜂养殖', description: '养蜂采蜜，点草成金。', requirements: { level: 38, prerequisites: ['farmer_ranching'] }, unlocks: { actions: ['act_raise_bee_t3', 'act_raise_pig_t3', 'act_press_oil'] } },
    { id: 'farmer_processing', name: '农产加工', description: '黄油乳酪兽皮，粗料变佳品。', requirements: { level: 26, prerequisites: ['farmer_vegetable_farming'] }, unlocks: { actions: ['act_churn_butter', 'act_tan_hide', 'act_age_cheese'] } },
    { id: 'farmer_flower_herb', name: '灵花灵草', description: '培育灵花灵草，染坊与药圃的源头。', requirements: { level: 45, prerequisites: ['farmer_apiary'] }, unlocks: { actions: ['act_plant_flower_t4', 'act_plant_herb_t3'] } },
    { id: 'farmer_grand_ranch', name: '大宗牧养', description: '灵马灵彘，牧场大成。', requirements: { level: 60, prerequisites: ['farmer_apiary'] }, unlocks: { actions: ['act_raise_horse_t4', 'act_compose_fertilizer', 'act_raise_spirit_boar', 'act_plant_star_grain'] } },
  ],
  woodcutter: [
    { id: 'woodcutter_bowyer', name: '弓匠手艺', description: '以木为骨，以筋为弦。', requirements: { level: 8, prerequisites: ['woodcutter_basic_cutting'] }, unlocks: { actions: ['act_craft_wooden_shield', 'act_split_shingles'] } },
    { id: 'woodcutter_resin_tapping', name: '树脂采集', description: '取树脂烧木炭，物尽其用。', requirements: { level: 20, prerequisites: ['woodcutter_bowyer'] }, unlocks: { actions: ['act_tap_resin', 'act_burn_charcoal'] } },
    { id: 'woodcutter_master_bowyer', name: '名弓匠', description: '长弓劲弩，林中一绝。', requirements: { level: 30, prerequisites: ['woodcutter_resin_tapping'] }, unlocks: { actions: ['act_craft_wooden_bow_t2', 'act_craft_resin_bow', 'act_craft_wooden_bow_t3'] } },
    { id: 'woodcutter_warden_craft', name: '守望者造物', description: '以千年灵木制守望套装。', requirements: { level: 90, prerequisites: ['woodcutter_master_bowyer'] }, unlocks: { actions: ['act_craft_warden_bow', 'act_craft_warden_helm', 'act_craft_warden_chest', 'act_craft_warden_legs'] } },
  ],
  chef: [
    { id: 'chef_staple_cooking', name: '主食料理', description: '蒸谷饭烤面包，饱腹为先。', requirements: { level: 5, prerequisites: [] }, unlocks: { actions: ['act_cook_grain_meal', 'act_bake_bread', 'act_cook_vegetable_stew'] } },
    { id: 'chef_brewing', name: '精酿之道', description: '佳酿醇酿，茶亦可醉人。', requirements: { level: 30, prerequisites: ['chef_staple_cooking'] }, unlocks: { actions: ['act_brew_drink_t2', 'act_brew_tea', 'act_brew_drink_t3', 'act_brew_herbal_tonic'] } },
    { id: 'chef_secret_sauce', name: '秘制酱料', description: '一滴入魂的酱汁与药膳。', requirements: { level: 35, prerequisites: ['chef_brewing'] }, unlocks: { actions: ['act_simmer_soup', 'act_make_sauce', 'act_cook_pork_roast', 'act_bake_honey_cake'] } },
  ],
  tailor: [
    { id: 'tailor_dyeing', name: '染织之术', description: '灵花为色，布匹生光。', requirements: { level: 25, prerequisites: [] }, unlocks: { actions: ['act_dye_cloth', 'act_craft_cloak', 'act_craft_pouch_large', 'act_spin_silk_fine'] } },
    { id: 'tailor_void_weaving', name: '虚空织造', description: '以影丝织就虚空猎手套装。', requirements: { level: 65, prerequisites: ['tailor_dyeing'] }, unlocks: { actions: ['act_forge_void_blade', 'act_forge_void_chest', 'act_forge_void_legs', 'act_forge_void_helm'] } },
  ],
  alchemist: [
    { id: 'alchemist_arcane_craft', name: '奥术炼制', description: '裂隙水晶凝贤者套装。', requirements: { level: 88, prerequisites: [] }, unlocks: { actions: ['act_craft_arcane_scepter', 'act_craft_arcane_hood', 'act_craft_arcane_robe', 'act_craft_arcane_legs', 'act_craft_arcane_pendant'] } },
  ],
};

/* ==================== 9. XP 归一 ==================== */
// 厨师高段菜品 xp 提速至 ~9-11/s；炼金水晶矿与 doom/hellfire 系补到带中位数
const xpFixes = {
  act_cook_dish_deepsea_stew: 240, act_cook_dish_abyss_platter: 280, act_cook_dish_frost_sashimi: 310,
  act_cook_dish_lava_roast: 380, act_cook_dish_star_feast: 480, act_cook_dish_dragon_delicacy: 600,
  act_cook_royal_banquet: 200, act_cook_divine_feast: 280, act_cook_cosmos_banquet: 360,
  act_brew_arcane_drink: 200, act_brew_divine_drink: 300,
  act_mine_crystal_t6: 210, act_mine_crystal_t7: 240, act_mine_crystal_t8: 270,
  act_craft_doom_scythe: 300, act_craft_hellfire_ring: 290, act_craft_damned_amulet: 300,
  act_craft_genesis_pendant: 400, act_craft_divine_scepter: 410, act_craft_divine_ring: 410,
  act_craft_cosmos_staff: 520, act_craft_omega_crown: 530, act_craft_eternity_amulet: 540,
  act_brew_elixir_mythic: 330, act_brew_elixir_genesis: 380, act_brew_elixir_omega: 430,
  act_brew_potion_berserk: 300,
};

/* ==================== 10. 套用 ==================== */
for (const i of newItems) upsertById(pack.items, i);
for (const a of newActions) upsertById(pack.actions, a);
for (const s of newSets) upsertById(pack.equipmentSets, s);
for (const [prof, nodes] of Object.entries(treeAdds)) {
  const tree = pack.professionTrees.find((t) => t.professionId === prof);
  for (const n of nodes) upsertById(tree.skillNodes, n);
}
// void_hunter_set 分流到裁缝：改动作归属 + 从铁匠树摘除解锁
const bsTree = pack.professionTrees.find((t) => t.professionId === 'blacksmith');
for (const n of bsTree.skillNodes) {
  if (n.id === 'blacksmith_void_forging') {
    n.unlocks.actions = (n.unlocks.actions || []).filter((a) => !/^act_forge_void_/.test(a));
    n.description = '驾驭虚空之力锻造。（虚空猎手套装已归裁缝织造）';
  }
}
for (const a of pack.actions) {
  if (/^act_forge_void_(blade|chest|legs|helm)$/.test(a.id)) a.skillId = 'skill_tailor';
  if (xpFixes[a.id] !== undefined) a.xp = xpFixes[a.id];
}
fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2) + '\n');
console.log(`items +${newItems.length}, actions +${newActions.length}, sets +${newSets.length}, xp fixes ${Object.keys(xpFixes).length}`);
