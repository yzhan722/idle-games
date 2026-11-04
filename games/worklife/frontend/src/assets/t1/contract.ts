/**
 * T1 commercial art contract (single source of truth).
 * Drop files at: frontend/src/assets/t1/<key>.{webp|png|svg}
 * Do not put extensions in React. Status PLACEHOLDER means geometric SVG, not final art.
 */

export const T1_EXTENSION_PRIORITY = ["webp", "png", "svg"] as const;
export type T1Extension = (typeof T1_EXTENSION_PRIORITY)[number];

export type ArtProfile = "icon" | "item" | "illustration";
export type ArtLane = "PLACEHOLDER" | "PRODUCTION" | "MISSING";
export type ArtPriority = "P0" | "P1" | "P2";

export type T1AssetSpec = {
  key: string;
  name: string;
  category: "character" | "monster" | "tree" | "equipment" | "material" | "skill" | "ui";
  profile: ArtProfile;
  preferredFormat: T1Extension;
  requiredAlpha: boolean;
  masterMinPx: number;
  runtimeDesktopPx: number;
  runtimeMobilePx: number;
  objectFit: "contain";
  cropPolicy: string;
  mobileRule: string;
  fallback: "CardArt" | "empty-span";
  status: ArtLane;
  priority: ArtPriority;
  usedIn: string[];
};

const containFull = "contain, full subject in frame, no head/weapon crop";
const iconContain = "contain, no circular crop, no baked frame";
const itemSafe = "contain, square-safe, rarity frame is UI-only";

function spec(partial: T1AssetSpec): T1AssetSpec {
  return partial;
}

const CORE_SPECS: Array<[
  T1AssetSpec["key"],
  T1AssetSpec["name"],
  T1AssetSpec["category"],
  ArtProfile,
  T1Extension,
  number,
  number,
  number,
  string,
  string,
  T1AssetSpec["fallback"],
  ArtPriority,
  string[],
]> = [
  ["character/woodcutter", "伐木工立绘", "character", "illustration", "webp", 1024, 280, 160, containFull, "full figure visible; never circle-crop", "CardArt", "P0", ["CharacterSheet portrait","combat player avatar","paperdoll center"]],
  ["trees/poplar", "路边的小白杨", "tree", "illustration", "webp", 1024, 180, 140, containFull, "tree fully visible in work card", "CardArt", "P0", ["Work tab","gather modal"]],
  ["monsters/slime", "果冻史莱姆", "monster", "illustration", "webp", 1024, 180, 140, containFull, "full body on forest card and combat", "CardArt", "P0", ["Forest card","combat enemy"]],
  ["monsters/crab", "铁壳寄居蟹", "monster", "illustration", "webp", 1024, 180, 140, containFull, "claws fully visible", "CardArt", "P0", ["Forest card","combat enemy"]],
  ["monsters/monkey", "捣蛋小猴", "monster", "illustration", "webp", 1024, 180, 140, containFull, "full body, no circle crop", "CardArt", "P0", ["Forest card","combat enemy"]],
  ["monsters/forest_boss", "森林管家", "monster", "illustration", "webp", 1024, 260, 180, containFull, "larger than trash mobs; full figure", "CardArt", "P0", ["Forest boss card","boss combat"]],
  ["equipment/weapon_wooden_sword", "木头短剑", "equipment", "item", "webp", 512, 72, 56, itemSafe, "transparent; do not pad into a plate", "empty-span", "P0", ["Craft card","character slot","inventory"]],
  ["equipment/armor_wood_chest", "木制胸甲", "equipment", "item", "webp", 512, 72, 56, itemSafe, "transparent; no baked rarity frame", "empty-span", "P0", ["Craft card","character slot","inventory"]],
  ["materials/wood_1", "平平无奇原木", "material", "item", "webp", 512, 48, 32, itemSafe, "readable at 32px", "empty-span", "P0", ["Character pack","inventory","craft costs"]],
  ["materials/lumber_1", "标准木板", "material", "item", "webp", 512, 48, 32, itemSafe, "readable at 32px", "empty-span", "P0", ["Craft card","character pack","inventory"]],
  ["skills/heavy_chop", "重劈", "skill", "icon", "svg", 256, 28, 28, iconContain, "44px tap target around 28px glyph", "empty-span", "P0", ["Combat Heavy Chop button"]],
  ["skills/sharpened_edge", "开刃", "skill", "icon", "svg", 256, 40, 36, iconContain, "build choice card", "empty-span", "P0", ["Build choice"]],
  ["skills/thick_bark", "厚树皮", "skill", "icon", "svg", 256, 40, 36, iconContain, "build choice card", "empty-span", "P0", ["Build choice"]],
  ["ui/nav-logging", "工作", "ui", "icon", "svg", 128, 22, 24, iconContain, "bottom tab icon", "empty-span", "P0", ["SkillSidebar"]],
  ["ui/nav-woodworking", "制作", "ui", "icon", "svg", 128, 22, 24, iconContain, "bottom tab icon", "empty-span", "P0", ["SkillSidebar"]],
  ["ui/nav-adventure", "冒险", "ui", "icon", "svg", 128, 22, 24, iconContain, "bottom tab icon", "empty-span", "P0", ["SkillSidebar"]],
  ["ui/nav-character", "角色", "ui", "icon", "svg", 128, 22, 24, iconContain, "bottom tab icon", "empty-span", "P0", ["SkillSidebar"]],
  ["ui/logo", "WorkLife logo", "ui", "icon", "svg", 256, 32, 28, iconContain, "header left", "empty-span", "P0", ["GameHeader"]],
  ["ui/gold", "金币", "ui", "icon", "svg", 128, 16, 16, iconContain, "header currency", "empty-span", "P0", ["GameHeader"]],
  ["ui/stat-hp", "生命", "ui", "icon", "svg", 128, 18, 16, iconContain, "character sheet stat row", "empty-span", "P1", ["CharacterSheet stats"]],
  ["ui/stat-atk", "攻击", "ui", "icon", "svg", 128, 18, 16, iconContain, "character sheet stat row", "empty-span", "P1", ["CharacterSheet stats"]],
  ["ui/stat-def", "防御", "ui", "icon", "svg", 128, 18, 16, iconContain, "character sheet stat row", "empty-span", "P1", ["CharacterSheet stats"]],
  ["ui/chat", "聊天", "ui", "icon", "svg", 128, 22, 24, iconContain, "FAB 44px; glyph 24px", "empty-span", "P1", ["GameChatPanel FAB"]],
];

export const T1_ASSET_CONTRACT: T1AssetSpec[] = CORE_SPECS.map(
  ([key, name, category, profile, preferredFormat, masterMinPx, runtimeDesktopPx, runtimeMobilePx, cropPolicy, mobileRule, fallback, priority, usedIn]) =>
    spec({
      key,
      name,
      category,
      profile,
      preferredFormat,
      requiredAlpha: true,
      masterMinPx,
      runtimeDesktopPx,
      runtimeMobilePx,
      objectFit: "contain",
      cropPolicy,
      mobileRule,
      fallback,
      status: "PLACEHOLDER",
      priority,
      usedIn,
    }),
);
const P2_ITEMS: Array<[string, string]> = [
  ["materials/ore_1","铜矿石"], ["materials/ingot_1","铜锭"], ["materials/fiber_1","棉花"], ["materials/crystal_1","微光水晶"],
  ["materials/fish_river","河鱼"], ["consumables/food_simple","简单料理"], ["consumables/potion_hp_t1","初级生命药水"], ["equipment/weapon_logging_axe_t1","铜制伐木斧"],
  ["materials/book_smash","技能书：猛击"], ["materials/book_minor_heal","技能书：小治疗"], ["materials/book_brace","技能书：坚守"], ["materials/mirror_protection","保护镜"],
  ["equipment/tool_enhancer_t1","初级强化器"], ["equipment/weapon_iron_sword","铁剑"], ["equipment/weapon_forge_hammer_t1","铜制锻造锤"], ["equipment/weapon_hoe_t1","铜制锄头"],
  ["equipment/weapon_scissors_t1","铜制裁缝剪"], ["equipment/weapon_sickle_t1","铜制镰刀"], ["equipment/weapon_frying_pan_t1","铁制平底锅"], ["equipment/weapon_alchemy_bottle_t1","玻璃炼金瓶"],
  ["equipment/weapon_staff_t1","木制法杖"], ["equipment/weapon_wooden_bow","木质长弓"], ["equipment/weapon_spatula_t1","木制锅铲"], ["equipment/weapon_shield_t1","木制盾牌"],
  ["equipment/armor_wood_legs","木制护腿"], ["equipment/armor_wood_boots","木制靴子"], ["equipment/armor_wood_gloves","木制手套"], ["equipment/armor_iron_gloves","铁制手套"],
  ["equipment/armor_cloth_chest","布制长袍"], ["equipment/armor_cloth_legs","布制裤子"], ["equipment/armor_cloth_boots","布制鞋子"], ["equipment/armor_cloth_gloves","布制手套"],
  ["equipment/armor_farmer_cloth_gloves","农夫工作手套"], ["equipment/armor_leather_boots","皮制靴子"], ["equipment/armor_leather_gloves","皮制手套"], ["equipment/accessory_pouch_small","小布袋"],
  ["equipment/charm_stamina","训练护符·耐力"], ["equipment/charm_intelligence","训练护符·智力"], ["equipment/charm_attack","训练护符·攻击"], ["equipment/charm_defense","训练护符·防御"],
  ["consumables/potion_mp_t1","初级魔力药水"], ["consumables/food_hearty_stew","丰盛炖菜"], ["materials/ingot_2","铁锭"], ["materials/yarn_1","棉线"],
  ["materials/fiber_2","亚麻"], ["materials/lumber_2","加固木板"], ["materials/wool","羊毛"], ["materials/egg","鸡蛋"],
  ["materials/shrimp","鲜虾"], ["materials/fish_sea","海鱼"], ["materials/crystal_2","辉光水晶"], ["materials/crystal_7","创世水晶"],
  ["materials/wood_2","坚硬原木"], ["materials/ore_2","铁矿石"], ["materials/ore_3","银矿石"], ["materials/ore_4","金矿石"],
  ["materials/ore_5","白金矿石"], ["materials/ore_6","秘银矿石"], ["materials/yarn_2","亚麻线"], ["materials/milk","牛奶"],
  ["materials/crystal_3","耀光水晶"], ["materials/elemental_core","元素核心"], ["materials/ghost_essence","幽灵精华"], ["materials/troll_power","巨魔之力"],
  ["consumables/drink_basic","提神饮料"], ["consumables/food_fine","精致料理"], ["consumables/potion_craft_focus","专注药剂"], ["consumables/potion_battle_fury","狂战药剂"],
  ["consumables/potion_iron_skin","铁壁药剂"], ["consumables/potion_hp_t2","中级生命药水"], ["consumables/potion_hp_t3","高级生命药水"], ["consumables/potion_hp_t4","顶级生命药水"],
  ["consumables/potion_mp_t2","中级魔力药水"], ["consumables/potion_mp_t3","高级魔力药水"], ["consumables/potion_mp_t4","顶级魔力药水"], ["consumables/potion_arcane_surge","奥术涌流药剂"],
  ["consumables/potion_guardian_elixir","守护战意药剂"], ["consumables/potion_fortune","幸运药剂"], ["consumables/potion_scholar","智者药剂"], ["equipment/weapon_steel_axe","钢斧"],
  ["equipment/accessory_pouch_medium","皮革腰包"], ["equipment/armor_iron_chest","铁制胸甲"], ["equipment/armor_iron_legs","铁制护腿"], ["equipment/armor_iron_boots","铁制靴子"],
  ["equipment/armor_leather_chest","皮制胸甲"], ["equipment/armor_leather_legs","皮制护腿"], ["equipment/armor_farmer_cloth_chest","农夫工作服"], ["equipment/armor_farmer_cloth_legs","农夫工作裤"],
  ["equipment/armor_farmer_cloth_boots","农夫工作靴"], ["equipment/armor_alchemist_cloth_robe","炼金术师长袍"], ["equipment/armor_alchemist_cloth_legs","炼金术师布裤"], ["equipment/armor_alchemist_cloth_gloves","炼金术师布手套"],
  ["equipment/armor_alchemist_cloth_boots","炼金术师布靴"], ["equipment/armor_chef_leather_chest","厨师皮制围裙"], ["equipment/armor_chef_leather_legs","厨师皮制护腿"], ["equipment/armor_chef_leather_gloves","厨师皮制手套"],
  ["equipment/armor_chef_leather_boots","厨师皮制靴子"], ["equipment/armor_tailor_leather_chest","裁缝皮制工作服"], ["equipment/armor_tailor_leather_legs","裁缝皮制护腿"], ["equipment/armor_tailor_leather_gloves","裁缝皮制手套"],
  ["equipment/armor_tailor_leather_boots","裁缝皮制靴子"], ["materials/wood_3","柔韧原木"], ["materials/lumber_3","柔韧木板"], ["materials/fiber_3","丝绸纤维"],
  ["materials/yarn_3","丝线"], ["materials/ingot_3","银锭"], ["materials/ingot_5","白金锭"], ["materials/fish_lake","湖鱼"],
  ["materials/poison_sac","毒囊"], ["materials/rotten_heart","腐烂之心"], ["materials/snake_venom","蛇毒"], ["materials/swamp_crown","沼泽王冠"],
  ["materials/frost_shard","霜寒碎晶"], ["materials/glacier_core","冰川之核"], ["materials/snow_pelt","雪兽厚皮"], ["materials/frost_crown","霜冠"],
  ["consumables/dish_grilled_lake","香烤湖鱼"], ["consumables/food_master_feast","大师盛宴"], ["equipment/weapon_forge_hammer_t2","铁制锻造锤"], ["equipment/weapon_frying_pan_t2","精铁平底锅"],
  ["equipment/weapon_hoe_t2","铁制锄头"], ["equipment/weapon_logging_axe_t2","铁制伐木斧"], ["equipment/weapon_scissors_t2","铁制裁缝剪"], ["equipment/weapon_shield_t2","铁制盾牌"],
  ["equipment/weapon_sickle_t2","铁制镰刀"], ["equipment/weapon_spatula_t2","铁制锅铲"], ["equipment/weapon_staff_t2","水晶法杖"], ["equipment/weapon_alchemy_bottle_t2","水晶炼金瓶"],
  ["equipment/armor_woodcutter_iron_chest","伐木工铁制胸甲"], ["equipment/armor_woodcutter_iron_legs","伐木工铁制护腿"], ["equipment/armor_woodcutter_iron_gloves","伐木工铁制手套"], ["equipment/armor_woodcutter_iron_boots","伐木工铁制靴子"],
  ["equipment/armor_blacksmith_iron_chest","铁匠重型胸甲"], ["equipment/armor_blacksmith_iron_legs","铁匠重型护腿"], ["equipment/armor_blacksmith_iron_gloves","铁匠重型手套"], ["equipment/armor_blacksmith_iron_boots","铁匠重型靴子"],
  ["equipment/weapon_frost_blade","霜寒战刃"], ["equipment/offhand_frost_shield","霜寒守护盾"], ["equipment/accessory_frost_ring","霜寒之戒"], ["equipment/armor_frost_head","霜寒头盔"],
  ["equipment/armor_frost_chest","霜寒胸甲"], ["equipment/armor_frost_legs","霜寒护腿"], ["equipment/armor_frost_hands","霜寒护手"], ["equipment/armor_frost_feet","霜寒战靴"],
  ["materials/grain","灵谷"], ["materials/hay","干草"], ["materials/dung","灵肥"], ["materials/corn","灵玉米"],
  ["materials/vegetable","灵蔬"], ["materials/flour","灵面粉"], ["materials/bread","灵面包"], ["materials/butter","灵黄油"],
  ["materials/oil","灵油"], ["materials/feed_animal","精饲料"], ["materials/rabbit_fur","兔绒"], ["materials/pork","灵猪肉"],
  ["materials/soup_herbal","药膳汤"], ["materials/leather_hide","兽皮"], ["materials/charcoal","灵木炭"], ["materials/resin","灵树脂"],
  ["materials/honey","灵蜜"], ["materials/herb_farm","灵草"], ["materials/flower_spirit","灵花"], ["materials/dyed_cloth","染布"],
  ["materials/magma_essence","熔岩精华"], ["materials/obsidian_chunk","黑曜石块"], ["materials/flame_core","烈焰之心"], ["consumables/food_grain_meal","灵谷饭"],
  ["consumables/food_vegetable_stew","时蔬炖"], ["consumables/drink_herbal_tonic","灵草汤剂"], ["consumables/drink_fine","佳酿"], ["equipment/armor_traveler_cloak","旅者披风"],
  ["equipment/weapon_wooden_bow_t2","硬木长弓"], ["equipment/offhand_wooden_shield","木盾"], ["equipment/accessory_arcane_pendant","奥术吊坠"], ["equipment/accessory_magma_ring","熔岩之戒"],
  ["equipment/accessory_myth_ring","神话之戒"], ["equipment/accessory_pouch_large","大行囊"], ["equipment/armor_arcane_sage_hood","贤者法冠"], ["equipment/armor_arcane_sage_legs","贤者下摆"],
  ["equipment/armor_arcane_sage_robe","贤者法袍"], ["equipment/armor_genesis_chest","创世胸甲"], ["equipment/armor_genesis_god_chest","创世神铠"], ["equipment/armor_genesis_god_helm","创世神冠"],
  ["equipment/armor_genesis_god_legs","创世神胫甲"], ["equipment/armor_genesis_helm","创世头盔"], ["equipment/armor_genesis_legs","创世护腿"], ["equipment/armor_hellfire_chest","炼狱魔神胸甲"],
  ["equipment/armor_hellfire_helm","炼狱魔神头盔"], ["equipment/armor_hellfire_legs","炼狱魔神腿甲"], ["equipment/armor_magma_chest","熔岩胸甲"], ["equipment/armor_magma_feet","熔岩战靴"],
  ["equipment/armor_magma_hands","熔岩护手"], ["equipment/armor_magma_head","熔岩头盔"], ["equipment/armor_magma_legs","熔岩护腿"], ["equipment/armor_myth_chest","神话胸甲"],
  ["equipment/armor_myth_feet","神话战靴"], ["equipment/armor_myth_hands","神话护手"], ["equipment/armor_myth_head","神话头盔"], ["equipment/armor_myth_legs","神话护腿"],
  ["equipment/armor_omega_chest","万界终焉胸铠"], ["equipment/armor_omega_helm","万界终焉头冠"], ["equipment/armor_omega_legs","万界终焉护腿"], ["equipment/armor_steel_boots","钢制靴子"],
  ["equipment/armor_steel_chest","钢制胸甲"], ["equipment/armor_steel_gloves","钢制手套"], ["equipment/armor_steel_legs","钢制护腿"], ["equipment/armor_void_chest","虚空胸甲"],
  ["equipment/armor_void_helm","虚空头盔"], ["equipment/armor_void_legs","虚空护腿"], ["equipment/armor_warden_chest","守望者胸甲"], ["equipment/armor_warden_helm","守望者盔"],
  ["equipment/armor_warden_legs","守望者腿甲"], ["equipment/celestial_ring","天界圣戒"], ["equipment/chrono_pendant","时之吊坠"], ["equipment/damned_amulet","堕魂护符"],
  ["equipment/divine_ring","神性指环"], ["equipment/eternity_amulet","永恒护符"], ["equipment/genesis_pendant","创世吊坠"], ["equipment/hellfire_ring","炼狱魔戒"],
  ["equipment/offhand_magma_shield","熔岩守护盾"], ["equipment/offhand_myth_shield","神话守护盾"], ["equipment/omega_crown","终焉王冠"], ["equipment/sovereign_crown","主宰王冠"],
  ["equipment/void_amulet","虚空护符"], ["equipment/weapon_alchemy_bottle_t3","秘银炼金瓶"], ["equipment/weapon_arcane_scepter","奥术权杖"], ["equipment/weapon_celestial_spear","天罚圣枪"],
  ["equipment/weapon_cosmos_staff","寰宇创生杖"], ["equipment/weapon_divine_scepter","神性权杖"], ["equipment/weapon_doom_scythe","末日收割镰"], ["equipment/weapon_forge_hammer_t3","钢制锻造锤"],
  ["equipment/weapon_forge_hammer_t4","秘银锻造锤"], ["equipment/weapon_frying_pan_t3","秘银平底锅"], ["equipment/weapon_genesis_blade","创世神剑"], ["equipment/weapon_genesis_staff","创世法杖"],
  ["equipment/weapon_hellfire_greatsword","炼狱业火巨剑"], ["equipment/weapon_hoe_t3","钢制锄头"], ["equipment/weapon_logging_axe_t3","钢制伐木斧"], ["equipment/weapon_logging_axe_t4","秘银伐木斧"],
  ["equipment/weapon_magma_blade","熔岩战刃"], ["equipment/weapon_myth_blade","神话战刃"], ["equipment/weapon_omega_destroyer","万界终焉之刃"], ["equipment/weapon_resin_bow","树脂复合弓"],
  ["equipment/weapon_scissors_t3","秘银裁缝剪"], ["equipment/weapon_scissors_t4","虚空裁缝剪"], ["equipment/weapon_shadow_bow","暗影长弓"], ["equipment/weapon_shield_t3","钢制盾牌"],
  ["equipment/weapon_sickle_t3","钢制镰刀"], ["equipment/weapon_spatula_t3","秘银锅铲"], ["equipment/weapon_staff_t3","秘银法杖"], ["equipment/weapon_staff_t4","奥术法杖"],
  ["equipment/weapon_void_blade","虚空裂刃"], ["equipment/weapon_warden_bow","守望者长弓"], ["equipment/weapon_wooden_bow_t3","灵木长弓"], ["consumables/dish_abyss_platter","渊海拼盘"],
  ["consumables/dish_deepsea_stew","深海浓汤"], ["consumables/dish_dragon_delicacy","龙渊珍馐"], ["consumables/dish_frost_sashimi","寒霜刺身"], ["consumables/dish_lava_roast","熔岩炙鱼"],
  ["consumables/dish_star_feast","星界鱼宴"], ["consumables/drink_arcane","奥术灵泉"], ["consumables/drink_divine","神性甘露"], ["consumables/drink_rich","醇酿"],
  ["consumables/elixir_genesis","创世灵药"], ["consumables/elixir_legend","传说灵药"], ["consumables/elixir_mythic","神话灵药"], ["consumables/elixir_omega","终焉灵药"],
  ["consumables/food_cosmos_banquet","寰宇至味"], ["consumables/food_divine_feast","神域飨宴"], ["consumables/food_honey_cake","灵蜜糕"], ["consumables/food_pork_roast","炙烤灵豚"],
  ["consumables/food_royal_banquet","皇家盛宴"], ["consumables/potion_artisan","巧匠药剂"], ["consumables/potion_berserk","极·狂战药剂"], ["consumables/potion_harvest","丰饶药剂"],
  ["materials/abyss_core","深渊之核"], ["materials/angel_tear","天使之泪"], ["materials/celestial_feather","天界羽翼"], ["materials/cheese_wheel","灵乳酪"],
  ["materials/chrono_dust","时之尘"], ["materials/cosmos_essence","寰宇精华"], ["materials/creation_seed","创世之种"], ["materials/crystal_10","星陨结晶"],
  ["materials/crystal_11","创世圣晶"], ["materials/crystal_12","寰宇之晶"], ["materials/crystal_4","炽光水晶"], ["materials/crystal_5","圣光水晶"],
  ["materials/crystal_6","神光水晶"], ["materials/crystal_8","星界水晶"], ["materials/crystal_9","永恒之心"], ["materials/damned_soul","堕魂结晶"],
  ["materials/demon_crown","魔神王冠"], ["materials/demon_horn","魔君之角"], ["materials/divine_essence","神性精华"], ["materials/eternity_crystal","永恒结晶"],
  ["materials/fallen_halo","堕落光环"], ["materials/fiber_10","星陨神丝"], ["materials/fiber_11","创世圣丝"], ["materials/fiber_12","寰宇梵丝"],
  ["materials/fiber_4","魔法纤维"], ["materials/fiber_5","星辰纤维"], ["materials/fiber_6","虚空纤维"], ["materials/fiber_7","神圣纤维"],
  ["materials/fiber_8","星辉蛛丝"], ["materials/fiber_9","神纹灵丝"], ["materials/fish_abyss","渊海巨鱼"], ["materials/fish_deepsea","深海鱼"],
  ["materials/fish_dragon","龙渊神鱼"], ["materials/fish_frost","寒霜冰鱼"], ["materials/fish_lava","熔岩火鱼"], ["materials/fish_star","星界游鱼"],
  ["materials/genesis_light","创世之光"], ["materials/god_heart","神之心脏"], ["materials/hellfire_ember","炼狱余烬"], ["materials/holy_gold","圣辉金"],
  ["materials/horse_mane","灵马尾"], ["materials/infernal_core","炼狱之核"], ["materials/ingot_10","星陨神锭"], ["materials/ingot_11","创世圣锭"],
  ["materials/ingot_12","寰宇神锭"], ["materials/ingot_4","金锭"], ["materials/ingot_6","秘银锭"], ["materials/ingot_7","精金锭"],
  ["materials/ingot_8","玄铁锭"], ["materials/ingot_9","神域秘银锭"], ["materials/lumber_10","星陨木板"], ["materials/lumber_11","创世圣板"],
  ["materials/lumber_12","寰宇神板"], ["materials/lumber_4","承重木块"], ["materials/lumber_5","附魔木块"], ["materials/lumber_6","龙纹木芯"],
  ["materials/lumber_7","世界精华块"], ["materials/lumber_8","星辰精华块"], ["materials/lumber_9","永恒精华块"], ["materials/omega_fragment","终焉碎片"],
  ["materials/omega_heart","万界之心"], ["materials/ore_10","星陨神铁"], ["materials/ore_11","创世圣矿"], ["materials/ore_12","寰宇原矿"],
  ["materials/ore_7","精金矿石"], ["materials/ore_8","玄铁矿石"], ["materials/ore_9","神域秘银"], ["materials/rift_crystal","裂境结晶"],
  ["materials/sauce_secret","秘制酱汁"], ["materials/shadow_silk","暗影之丝"], ["materials/sovereign_heart","主宰之心"], ["materials/space_essence","时空精华"],
  ["materials/tea_spirit","灵茶"], ["materials/void_crown","虚空王冠"], ["materials/void_shard","虚空裂片"], ["materials/wood_10","星陨神木"],
  ["materials/wood_11","创世圣木"], ["materials/wood_12","寰宇世界树"], ["materials/wood_4","白桦原木"], ["materials/wood_5","幻霞原木"],
  ["materials/wood_6","龙柏原木"], ["materials/wood_7","神木原木"], ["materials/wood_8","星辰木"], ["materials/wood_9","永恒神木"],
  ["materials/yarn_10","星陨神纱"], ["materials/yarn_11","创世圣纱"], ["materials/yarn_12","寰宇梵纱"], ["materials/yarn_4","魔法丝线"],
  ["materials/yarn_5","星辰丝线"], ["materials/yarn_6","虚空丝线"], ["materials/yarn_7","神圣丝线"], ["materials/yarn_8","星辉灵纱"],
  ["materials/yarn_9","神纹圣纱"], ["materials/yarn_silk_fine","精丝"], ["materials/book_cleave","《旋风斩秘籍》"], ["materials/book_taunt","《狮吼嘲讽秘籍》"],
  ["materials/book_arrow_rain","《万箭齐发秘籍》"], ["materials/book_group_heal","《圣光群疗秘籍》"], ["materials/book_meteor_storm","《星陨天降秘籍》"], ["materials/book_war_aura","《战意光环秘籍》"],
  ["materials/book_quick_shot","技能书：疾风连射"], ["materials/book_spore_ward","技能书：灵蕈祝祷"], ["materials/book_shield_bash","技能书：碎岩盾击"], ["materials/book_mana_pulse","技能书：晶脉共鸣"],
  ["materials/book_venom_fang","技能书：剧毒穿刺"], ["materials/book_soul_drain","技能书：噬魂汲取"], ["materials/book_frost_nova","技能书：寒冰新星"], ["materials/book_glacial_snipe","技能书：极寒穿云箭"],
  ["materials/book_flame_burst","技能书：熔岩爆裂"], ["materials/book_phoenix_blessing","技能书：浴火圣歌"], ["materials/book_void_rift","技能书：虚空裂斩"], ["materials/book_abyssal_pact","技能书：深渊噬魂契"],
  ["materials/book_holy_judgment","技能书：天罚圣裁"], ["materials/book_seraph_aegis","技能书：炽天圣盾"], ["materials/book_chrono_overload","技能书：时空超载"], ["materials/book_hellfire_cataclysm","技能书：炼狱浩劫"],
  ["materials/book_genesis_sanctuary","技能书：创世神恩"], ["materials/book_omega_annihilation","技能书：万界终焉"],
];
const P2_CHARACTERS: Array<[string, string]> = [
  ["character/blacksmith","铁匠立绘"], ["character/farmer","农夫立绘"], ["character/chef","厨师立绘"],
  ["character/tailor","裁缝立绘"], ["character/alchemist","炼金术师立绘"], ["character/woodcutter_female","女伐木工立绘"],
  ["character/blacksmith_female","女铁匠立绘"], ["character/farmer_female","女农夫立绘"], ["character/chef_female","女厨师立绘"],
  ["character/tailor_female","女裁缝立绘"], ["character/alchemist_female","女炼金术师立绘"], ["character/woodcutter_animal","动物伐木工立绘"],
  ["character/blacksmith_animal","动物铁匠立绘"], ["character/farmer_animal","动物农夫立绘"], ["character/chef_animal","动物厨师立绘"],
  ["character/tailor_animal","动物裁缝立绘"], ["character/alchemist_animal","动物炼金术师立绘"],
];
for (const [key, name] of P2_CHARACTERS) {
  T1_ASSET_CONTRACT.push(
    spec({
      key, name, category: "character", profile: "illustration", preferredFormat: "webp",
      requiredAlpha: true, masterMinPx: 1024, runtimeDesktopPx: 280, runtimeMobilePx: 160,
      objectFit: "contain", cropPolicy: containFull, mobileRule: "full figure visible; never circle-crop",
      fallback: "CardArt", status: "PLACEHOLDER", priority: "P2",
      usedIn: ["CharacterCreate", "CharacterSheet portrait", "combat player avatar", "paperdoll center"],
    })
  );
}
const P2_SKILL_ICONS: Array<[string, string]> = [
  ["skills/smash","猛击"], ["skills/minor_heal","小治疗"], ["skills/brace","坚守"], ["skills/cleave","旋风斩"],
  ["skills/taunt","狮吼嘲讽"], ["skills/arrow_rain","万箭齐发"], ["skills/group_heal","圣光群疗"], ["skills/meteor_storm","星陨天降"],
  ["skills/war_aura","战意光环"], ["skills/quick_shot","疾风连射"], ["skills/spore_ward","灵蕈祝祷"], ["skills/shield_bash","碎岩盾击"],
  ["skills/mana_pulse","晶脉共鸣"], ["skills/venom_fang","剧毒穿刺"], ["skills/soul_drain","噬魂汲取"], ["skills/frost_nova","寒冰新星"],
  ["skills/glacial_snipe","极寒穿云箭"], ["skills/flame_burst","熔岩爆裂"], ["skills/phoenix_blessing","浴火圣歌"], ["skills/void_rift","虚空裂斩"],
  ["skills/abyssal_pact","深渊噬魂契"], ["skills/holy_judgment","天罚圣裁"], ["skills/seraph_aegis","炽天圣盾"], ["skills/chrono_overload","时空超载"],
  ["skills/hellfire_cataclysm","炼狱浩劫"], ["skills/genesis_sanctuary","创世神恩"], ["skills/omega_annihilation","万界终焉"],
];
for (const [key, name] of P2_SKILL_ICONS) {
  T1_ASSET_CONTRACT.push(
    spec({
      key, name, category: "skill", profile: "icon", preferredFormat: "webp",
      requiredAlpha: true, masterMinPx: 256, runtimeDesktopPx: 28, runtimeMobilePx: 28,
      objectFit: "contain", cropPolicy: iconContain, mobileRule: "44px tap target around 28px glyph",
      fallback: "empty-span", status: "PLACEHOLDER", priority: "P2",
      usedIn: ["AbilityBar", "AbilityLoadoutPanel", "CharacterSheet abilities"],
    })
  );
}
const P2_GATHER: Array<[string, string, string]> = [
  ["trees/copper","铜矿脉","Mining page row 1, gather modal"], ["trees/cotton","棉花田","Farming page row 1, gather modal"],
  ["trees/river","清澈小河","Fishing page row 1, gather modal"], ["trees/cotton_wild","野生棉花","Gathering page row 1, gather modal"],
  ["trees/crystal_small","微光水晶矿","Crystal page row 1, gather modal"], ["trees/fir","嘴硬的铁杉","Logging page row 2, gather modal"],
  ["trees/iron","铁矿脉","Mining page row 2, gather modal"], ["trees/wheat","亚麻田","Farming page row 2, gather modal"],
  ["trees/ocean","无尽海洋","Fishing page row 2, gather modal"], ["trees/linen","亚麻田","Gathering page row 2, gather modal"],
  ["trees/crystal_medium","辉光水晶矿","Crystal page row 2, gather modal"], ["trees/willow","极度社恐的垂柳","Logging page row 3, gather modal"],
  ["trees/silver","银矿脉","Mining page row 3, gather modal"], ["trees/rice","蚕桑园","Farming page 丝绸植物 row, gather modal"],
  ["trees/lake","深邃湖泊","Fishing page row 4, gather modal"], ["trees/silk","丝绸蚕茧","Gathering page row 3, gather modal"],
  ["trees/crystal_large","圣光水晶矿","Crystal page row 3, gather modal"], ["trees/birch","挺拔的白桦","Logging page row 4, gather modal"],
  ["trees/gold","金矿脉","Mining page row 4, gather modal"], ["trees/deepsea","幽暗深海","Fishing page row 3, gather modal"],
  ["trees/rosewood","古代红檀木","Logging page row 5, gather modal"], ["trees/platinum","白金矿脉","Mining page row 5, gather modal"],
  ["trees/star_cotton","星辰棉田","Farming page 星辰棉花 row, gather modal"], ["trees/abyss_sea","深渊海沟","Fishing page row 5, gather modal"],
  ["trees/magic_herb","魔法植物园","Farming page 魔法草药 row, gather modal"], ["trees/adamantite","精金矿脉","Gather row (act_mine_ore_t7), gather modal"],
  ["trees/crystal_eternal","永恒之心矿","Gather row (act_mine_crystal_t9), gather modal"], ["trees/crystal_genesis","创世本源晶矿","Gather row (act_mine_crystal_t11), gather modal"],
  ["trees/crystal_hellfire","炼狱业火晶矿","Gather row (act_mine_crystal_t10), gather modal"], ["trees/crystal_omega","万界终焉晶矿","Gather row (act_mine_crystal_t12), gather modal"],
  ["trees/crystal_star","星界水晶矿","Gather row (act_mine_crystal_t8), gather modal"], ["trees/cypress","老板级别的古龙柏","Gather row (act_chop_wood_t6), gather modal"],
  ["trees/darkiron","玄铁矿脉","Gather row (act_mine_ore_t8), gather modal"], ["trees/divine","想退休的界外神木","Gather row (act_chop_wood_t7), gather modal"],
  ["trees/divinemithril","神域秘银矿脉","Gather row (act_mine_ore_t9), gather modal"], ["trees/dragon_abyss","龙渊深潭","Gather row (act_fish_t9), gather modal"],
  ["trees/eternalwood","世界之树永恒神木","Gather row (act_chop_wood_t9), gather modal"], ["trees/frost_sea","寒霜水域","Gather row (act_fish_t6), gather modal"],
  ["trees/genesis_grass","创世圣草园","Gather row (act_plant_fiber_t11), gather modal"], ["trees/genesisore","创世本源矿脉","Gather row (act_mine_ore_t11), gather modal"],
  ["trees/genesiswood","创世初生神树","Gather row (act_chop_wood_t11), gather modal"], ["trees/hellfireore","炼狱业火矿脉","Gather row (act_mine_ore_t10), gather modal"],
  ["trees/hellfirewood","炼狱业火焚天树","Gather row (act_chop_wood_t10), gather modal"], ["trees/holy_herb","神圣灵草园","Gather row (act_plant_fiber_t7), gather modal"],
  ["trees/lava_sea","熔岩火湖","Gather row (act_fish_t7), gather modal"], ["trees/meteor_grass","星陨神草园","Gather row (act_plant_fiber_t10), gather modal"],
  ["trees/mithril","秘银矿脉","Gather row (act_mine_ore_t6), gather modal"], ["trees/omega_grass","寰宇梵草园","Gather row (act_plant_fiber_t12), gather modal"],
  ["trees/omegaore","万界终焉矿脉","Gather row (act_mine_ore_t12), gather modal"], ["trees/omegawood","万界终焉之木","Gather row (act_chop_wood_t12), gather modal"],
  ["trees/rune_grass","神纹灵草园","Gather row (act_plant_fiber_t9), gather modal"], ["trees/star_sea","星界之海","Gather row (act_fish_t8), gather modal"],
  ["trees/starshine_grass","星辉蛛草园","Gather row (act_plant_fiber_t8), gather modal"], ["trees/starwood","云端上的星辰木","Gather row (act_chop_wood_t8), gather modal"],
  ["trees/void_flax","虚空麻田","Gather row (act_plant_fiber_t6), gather modal"],
];
for (const [key, name] of P2_ITEMS) {
  T1_ASSET_CONTRACT.push(
    spec({
      key, name, category: key.startsWith("equipment/") ? "equipment" : "material", profile: "item",
      preferredFormat: "webp", requiredAlpha: true, masterMinPx: 512, runtimeDesktopPx: 72, runtimeMobilePx: 56,
      objectFit: "contain", cropPolicy: itemSafe, mobileRule: "readable at 32px",
      fallback: "empty-span", status: "PLACEHOLDER", priority: "P2",
      usedIn: ["Skill page rows", "craft inputs", "inventory"],
    })
  );
}
for (const [key, name, usedIn] of P2_GATHER) {
  T1_ASSET_CONTRACT.push(
    spec({
      key, name, category: "tree", profile: "illustration", preferredFormat: "webp",
      requiredAlpha: true, masterMinPx: 1024, runtimeDesktopPx: 72, runtimeMobilePx: 56,
      objectFit: "contain", cropPolicy: containFull, mobileRule: "full subject in the 56px row art box",
      fallback: "CardArt", status: "PLACEHOLDER", priority: "P2", usedIn: [usedIn],
    })
  );
}
const P2_MONSTERS: Array<[string, string, string]> = [
  ["monsters/caterpillar","瞌睡毛毛虫","Forest card (post chapter 1)"], ["monsters/mushroom","生气蘑菇精","Forest card (post chapter 1)"],
  ["monsters/bee","路痴小蜜蜂","Forest card (post chapter 1)"], ["monsters/rock_golem","碎石傀儡","Mine card (post chapter 1)"],
  ["monsters/crystal_bat","水晶蝙蝠","Mine card (post chapter 1)"], ["monsters/ore_rat","矿石鼠","Mine card (post chapter 1)"],
  ["monsters/magma_worm","岩浆虫","Mine card (post chapter 1)"], ["monsters/iron_spider","钢铁蜘蛛","Mine card (post chapter 1)"],
  ["monsters/gem_thief","宝石大盗","Mine card (post chapter 1)"], ["monsters/mine_boss","矿山霸主","Mine card (post chapter 1), boss"],
  ["monsters/poison_frog","毒雾青蛙","Swamp card (post chapter 1)"], ["monsters/swamp_zombie","沼泽僵尸","Swamp card (post chapter 1)"],
  ["monsters/mud_elemental","泥浆元素","Swamp card (post chapter 1)"], ["monsters/vine_snake","藤蔓毒蛇","Swamp card (post chapter 1)"],
  ["monsters/ghost_light","鬼火幽灵","Swamp card (post chapter 1)"], ["monsters/swamp_troll","沼泽巨魔","Swamp card (post chapter 1)"],
  ["monsters/swamp_boss","沼泽之王","Swamp card (post chapter 1), boss"], ["monsters/snow_wolf","冰原雪狼","Snow card (post chapter 1)"],
  ["monsters/frost_imp","霜冻小妖","Snow card (post chapter 1)"], ["monsters/ice_golem","寒冰傀儡","Snow card (post chapter 1)"],
  ["monsters/snow_harpy","雪羽鹰身女妖","Snow card (post chapter 1)"], ["monsters/frozen_knight","冰封骑士","Snow card (post chapter 1)"],
  ["monsters/yeti","暴雪雪人","Snow card (post chapter 1)"], ["monsters/snow_boss","霜冠雪魔","Snow card (post chapter 1), boss"],
  ["monsters/lava_slug","熔岩鼻涕虫","Volcano card (post chapter 1)"], ["monsters/fire_bat","烈焰蝙蝠","Volcano card (post chapter 1)"],
  ["monsters/cinder_hound","余烬猎犬","Volcano card (post chapter 1)"], ["monsters/magma_titan","岩浆泰坦","Volcano card (post chapter 1)"],
  ["monsters/flame_wraith","烈焰怨灵","Volcano card (post chapter 1)"], ["monsters/inferno_drake","炼狱火龙","Volcano card (post chapter 1)"],
  ["monsters/volcano_boss","烈焰魔君","Volcano card (post chapter 1), boss"], ["monsters/abyss_boss","虚空领主","Adventure zone card, boss"],
  ["monsters/abyss_maw","深渊巨口","Adventure zone card"], ["monsters/archfiend","深渊魔将","Adventure zone card"],
  ["monsters/archon","执政天神","Adventure zone card"], ["monsters/astral_judge","星界审判者","Adventure zone card"],
  ["monsters/celestial_boss","堕落天使","Adventure zone card, boss"], ["monsters/chrono_phantom","时之幻影","Adventure zone card"],
  ["monsters/cosmic_guardian","寰宇守护者","Adventure zone card"], ["monsters/cosmic_horror","寰宇恐惧","Adventure zone card"],
  ["monsters/creation_golem","创世魔像","Adventure zone card"], ["monsters/demigod","半神祭司","Adventure zone card"],
  ["monsters/dimension_lord","维度领主","Adventure zone card"], ["monsters/divine_colossus","神圣巨像","Adventure zone card"],
  ["monsters/divine_phoenix","神圣不死鸟","Adventure zone card"], ["monsters/doom_bringer","末日使者","Adventure zone card"],
  ["monsters/dread_knight","恐惧骑士","Adventure zone card"], ["monsters/entropy_beast","熵增之兽","Adventure zone card"],
  ["monsters/flame_imp","烈焰小鬼","Adventure zone card"], ["monsters/genesis_boss","创世之神","Adventure zone card, boss"],
  ["monsters/genesis_herald","创世先知","Adventure zone card"], ["monsters/hell_sovereign","地狱亲王","Adventure zone card"],
  ["monsters/hellhound","炼狱地狱犬","Adventure zone card"], ["monsters/infernal_dragon","炼狱魔龙","Adventure zone card"],
  ["monsters/inferno_boss","炼狱魔神","Adventure zone card, boss"], ["monsters/lava_titan","熔岩泰坦","Adventure zone card"],
  ["monsters/light_avatar","圣光化身","Adventure zone card"], ["monsters/light_sprite","圣光精灵","Adventure zone card"],
  ["monsters/nightmare_weaver","梦魇织者","Adventure zone card"], ["monsters/omega_boss","万界终焉","Adventure zone card, boss"],
  ["monsters/omega_herald","终焉传令者","Adventure zone card"], ["monsters/paradox_beast","悖论之兽","Adventure zone card"],
  ["monsters/paradox_god","悖论之神","Adventure zone card"], ["monsters/radiant_griffin","辉耀狮鹫","Adventure zone card"],
  ["monsters/reality_eater","现实啖食者","Adventure zone card"], ["monsters/reality_render","现实撕裂者","Adventure zone card"],
  ["monsters/rift_boss","时空主宰","Adventure zone card, boss"], ["monsters/rift_stalker","裂隙潜行者","Adventure zone card"],
  ["monsters/seraph_sentinel","炽天哨兵","Adventure zone card"], ["monsters/shadow_crawler","暗影爬虫","Adventure zone card"],
  ["monsters/sky_guardian","天穹守卫","Adventure zone card"], ["monsters/soul_reaper","噬魂收割者","Adventure zone card"],
  ["monsters/star_seraph","星辰炽天使","Adventure zone card"], ["monsters/temporal_wyrm","时空巨龙","Adventure zone card"],
  ["monsters/void_behemoth","虚空巨兽","Adventure zone card"], ["monsters/void_devourer","虚空吞噬者","Adventure zone card"],
  ["monsters/void_emperor","虚空帝王","Adventure zone card"], ["monsters/void_specter","虚空幽魂","Adventure zone card"],
  ["monsters/world_ender","世界终结者","Adventure zone card"],
];
for (const [key, name, usedIn] of P2_MONSTERS) {
  T1_ASSET_CONTRACT.push(
    spec({
      key, name, category: "monster", profile: "illustration", preferredFormat: "webp",
      requiredAlpha: true, masterMinPx: 1024, runtimeDesktopPx: 180, runtimeMobilePx: 140,
      objectFit: "contain", cropPolicy: containFull, mobileRule: "full body on zone card and combat",
      fallback: "CardArt", status: "PLACEHOLDER", priority: "P2", usedIn: [usedIn, "combat enemy"],
    })
  );
}
const P2_UI_ICONS: Array<[string, string, string[]]> = [
  ["ui/nav-mining","挖矿",["SkillSidebar","MobileNavBar picker"]], ["ui/nav-farming","种植",["SkillSidebar","MobileNavBar picker"]],
  ["ui/nav-fishing","钓鱼",["SkillSidebar","MobileNavBar picker"]], ["ui/nav-gathering","采集",["SkillSidebar","MobileNavBar picker"]],
  ["ui/nav-crystal","水晶",["SkillSidebar","MobileNavBar picker"]], ["ui/nav-smithing","锻造",["SkillSidebar","MobileNavBar picker","HousesPage 锻炉间"]],
  ["ui/nav-husbandry","畜牧",["SkillSidebar","MobileNavBar picker","HousesPage 牲口棚"]], ["ui/nav-cooking","烹饪",["SkillSidebar","MobileNavBar picker","HousesPage 厨房"]],
  ["ui/nav-tailoring","缝纫",["SkillSidebar","MobileNavBar picker","HousesPage 缝纫间"]], ["ui/nav-alchemy","炼金",["SkillSidebar","MobileNavBar picker","HousesPage 炼金室"]],
  ["ui/nav-enhance","强化",["SkillSidebar","MobileNavBar picker"]], ["ui/stat-int","智力",["SkillSidebar","CharacterSheet stats"]],
  ["ui/nav-melee","近战",["SkillSidebar"]], ["ui/nav-ranged","远程",["SkillSidebar"]],
  ["ui/nav-magic","魔法",["SkillSidebar"]], ["ui/nav-inventory","背包",["SkillSidebar","MobileNavBar more sheet"]],
  ["ui/nav-tasks","任务",["SkillSidebar","MobileNavBar more sheet"]], ["ui/nav-houses","房屋",["SkillSidebar","MobileNavBar more sheet"]],
  ["ui/nav-trading","交易行",["SkillSidebar","MobileNavBar more sheet"]], ["ui/nav-party","组队",["SkillSidebar","MobileNavBar more sheet"]],
  ["ui/nav-more","更多",["MobileNavBar"]], ["ui/avatar_male_knight","星辉剑士头像",["CharacterCreate","PlayerRightPanel","CharacterSheet"]],
  ["ui/avatar_male_ranger","晨风游侠头像",["CharacterCreate","PlayerRightPanel","CharacterSheet"]], ["ui/avatar_male_mage","苍翠秘术师头像",["CharacterCreate","PlayerRightPanel","CharacterSheet"]],
  ["ui/avatar_female_valkyrie","绯光女武神头像",["CharacterCreate","PlayerRightPanel","CharacterSheet"]], ["ui/avatar_female_alchemist","翠星炼金术师头像",["CharacterCreate","PlayerRightPanel","CharacterSheet"]],
  ["ui/avatar_female_healer","月华圣女头像",["CharacterCreate","PlayerRightPanel","CharacterSheet"]], ["ui/avatar_animal_fox","灵狐冒险家头像",["CharacterCreate","PlayerRightPanel","CharacterSheet"]],
  ["ui/avatar_animal_cat","星冠猫骑士头像",["CharacterCreate","PlayerRightPanel","CharacterSheet"]],
];
for (const [key, name, usedIn] of P2_UI_ICONS) {
  T1_ASSET_CONTRACT.push(
    spec({
      key, name, category: "ui", profile: "icon", preferredFormat: "webp",
      requiredAlpha: true, masterMinPx: 256, runtimeDesktopPx: 22, runtimeMobilePx: 24,
      objectFit: "contain", cropPolicy: iconContain, mobileRule: "bottom tab / picker icon",
      fallback: "empty-span", status: "PLACEHOLDER", priority: "P2", usedIn,
    })
  );
}

export const T1_ASSET_KEYS = T1_ASSET_CONTRACT.filter((s) => s.status !== "MISSING").map((s) => s.key);

export type T1AssetKey = (typeof T1_ASSET_CONTRACT)[number]["key"];

export function specByKey(key: string): T1AssetSpec | undefined {
  return T1_ASSET_CONTRACT.find((s) => s.key === key);
}

export function p0RequiredKeys(): string[] {
  return T1_ASSET_CONTRACT.filter((s) => s.priority === "P0").map((s) => s.key);
}

export function profileForKey(key: string): ArtProfile {
  const found = specByKey(key);
  if (found) return found.profile;
  if (key.startsWith("character/") || key.startsWith("monsters/") || key.startsWith("trees/") || key.startsWith("gather/")) {
    return "illustration";
  }
  if (key.startsWith("ui/") || key.startsWith("skills/")) {
    return "icon";
  }
  return "item";
}
