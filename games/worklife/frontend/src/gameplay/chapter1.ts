export type ChapterGoal = {
  id: string;
  title: string;
  detail: string;
  tab:
    | "logging"
    | "woodworking"
    | "mining"
    | "smithing"
    | "gathering"
    | "tailoring"
    | "farming"
    | "fishing"
    | "cooking"
    | "crystal_mining"
    | "alchemy"
    | "adventure"
    | "character";
  craftCategory?: "materials" | "weapons" | "equipment";
  chapter?: 1 | 2 | 3 | 4;
  stepIndex?: number;
  stepTotal?: number;
  buildChapter?: 1 | 2 | 3 | 4;
  adventureZone?: "forest" | "mine" | "swamp" | "snow" | "volcano";
};

type State = {
  progression?: { completedMilestones: Record<string, unknown>; completedChapters: Record<string, unknown> };
  inventory?: Record<string, number>;
  equipment?: {
    main_hand?: string;
    off_hand?: string;
    head?: string;
    chest?: string;
    legs?: string;
    feet?: string;
    hands?: string;
    accessory1?: string;
    accessory2?: string;
  };
  chapter1Build?: string;
  chapter2Build?: string;
  chapter3Build?: string;
  chapter4Build?: string;
  activeClassId?: string;
  stats?: {
    totalKills?: number;
    totalBossKills?: number;
    killsByMonster?: Record<string, number>;
    actionsById?: Record<string, number>;
  };
  skills?: Record<string, { level?: number }>;
};

export const CHAPTER1_OBJECTIVES = [
  "chop",
  "board",
  "sword",
  "equip_sword",
  "first_kill",
  "build",
  "chest",
  "archetypes",
  "boss",
  "complete",
] as const;

export const CHAPTER2_OBJECTIVES = [
  "ch2_mine_ore",
  "ch2_smelt_ingot",
  "ch2_forge_weapon",
  "ch2_build",
  "ch2_forge_armor",
  "ch2_mine_scouts",
  "ch2_boss",
] as const;

export const CHAPTER3_OBJECTIVES = [
  "ch3_gather_fiber",
  "ch3_spin_yarn",
  "ch3_craft_garb",
  "ch3_build",
  "ch3_swamp_scouts",
  "ch3_boss",
] as const;

export const CHAPTER4_OBJECTIVES = [
  "ch4_farm_fish",
  "ch4_cook_feast",
  "ch4_mine_crystal",
  "ch4_brew_elixir",
  "ch4_build",
  "ch4_snow_boss",
  "ch4_volcano_boss",
  "ch4_complete",
] as const;

export function nextChapter1Goal(state: State | null | undefined): ChapterGoal {
  const achieved = state?.progression?.completedMilestones || {};
  if (state?.progression?.completedChapters.forest || (state?.stats?.killsByMonster?.forest_boss || 0) > 0) {
    return { id: 'complete', title: '第一章完成', detail: '森林、矿山、沼泽和雪山已开放。选择下一件装备或生产目标，按自己的节奏继续。', tab: 'adventure' };
  }
  const inv = state?.inventory || {};
  const eq = state?.equipment || {};
  const kills = state?.stats?.killsByMonster || {};
  const totalKills = state?.stats?.totalKills || 0;
  const bossKills = (kills.forest_boss || 0) > 0;
  const wood = inv.wood_1 || 0;
  const lumber = inv.lumber_1 || 0;
  const sword = inv.weapon_wooden_sword || 0;
  const chest = inv.armor_wood_chest || 0;
  const wc = state?.skills?.skill_woodworking?.level || state?.skills?.skill_woodcutter?.level || 1;

  if (!achieved.chop && !achieved.board && !achieved.sword && wood < 1 && lumber < 1 && sword < 1) {
    return {
      id: "chop",
      title: "砍第一棵小白杨",
      detail: "点伐木，再点路边的小白杨。这是你在异世界的第一份工。",
      tab: "logging",
    };
  }
  if (!achieved.board && !achieved.sword && lumber < 1 && sword < 1) {
    return {
      id: "board",
      title: "锯出第一块木板",
      detail: "两根原木可以做一块标准木板。去木工。",
      tab: wood < 2 ? "logging" : "woodworking",
      craftCategory: "materials",
    };
  }
  if (!achieved.sword && sword < 1) {
    return {
      id: "sword",
      title: "做出木头短剑",
      detail: "三块木板做成短剑。没有武器，森林里站不住。",
      tab: lumber < 3 && wood < 2 ? "logging" : "woodworking",
      craftCategory: lumber < 3 ? "materials" : "weapons",
    };
  }
  if (!achieved.equip_sword && !eq.main_hand) {
    return {
      id: "equip_sword",
      title: "穿上木头短剑",
      detail: "打开角色，点主手，把短剑装备上。",
      tab: "character",
    };
  }
  if (!achieved.first_kill && totalKills < 1) {
    return {
      id: "first_kill",
      title: "击败一只果冻史莱姆",
      detail: "去冒险，只打森林里最软的那一只。",
      tab: "adventure",
    };
  }
  if (!achieved.build && !state?.chapter1Build) {
    return {
      id: "build",
      title: "选择开刃或厚树皮",
      detail: "只能选一次。开刃更疼，厚树皮更扛打。",
      tab: "adventure",
    };
  }
  if (!achieved.chest && (chest < 1 || !eq.chest)) {
    const needBoards = chest < 1 && (lumber < 6 || wc < 3);
    const needLogs = needBoards && wood < 2;
    return {
      id: "chest",
      title: wc < 3 ? "把木工升到 3 级并做木甲" : chest < 1 ? "制作并穿上木制胸甲" : "穿上木制胸甲",
      detail: "小猴出手快、寄居蟹壳硬，上衣空着打不过。做好木甲凑齐木工两件套再去闯林子。",
      tab: chest >= 1 ? "character" : needLogs ? "logging" : "woodworking",
      craftCategory: chest >= 1 ? undefined : needBoards ? "materials" : "equipment",
    };
  }
  const archetypes =
    (kills.slime || 0) > 0 && (kills.crab || 0) > 0 && (kills.monkey || 0) > 0;
  if (!achieved.archetypes && !archetypes) {
    return {
      id: "archetypes",
      title: "见识三种森林怪物",
      detail: "史莱姆、铁壳寄居蟹、捣蛋小猴各至少一只。它们打法不一样。",
      tab: "adventure",
    };
  }
  if (!bossKills) {
    return {
      id: "boss",
      title: "挑战森林管家",
      detail: "重劈会自动破格挡；想更稳，把它的触发设成「敌人格挡时」。血量掉到三成会进入自然之怒。",
      tab: "adventure",
    };
  }
  return {
    id: "complete",
    title: "第一章完成",
    detail: "矿山的门开了一条缝。铁匠的活还早，先去「生涯」把成就和每日的工钱领了。",
    tab: "adventure",
  };
}

export function chapter1Complete(state: State | null | undefined): boolean {
  return nextChapter1Goal(state).id === "complete";
}

function enrichGoal(
  goal: ChapterGoal,
  chapter: 1 | 2 | 3 | 4,
  objectives: readonly string[]
): ChapterGoal {
  const idx = objectives.indexOf(goal.id);
  return {
    ...goal,
    chapter,
    stepIndex: idx >= 0 ? idx + 1 : 1,
    stepTotal: objectives.length,
  };
}

/**
 * Multi-chapter cross-profession mainline state machine (Chapters 1 -> 2 -> 3).
 * Preserves `nextChapter1Goal` for legacy Chapter 1 callers while seamlessly advancing
 * forest veterans into Chapter 2 (Mine & Blacksmithing) and Chapter 3 (Swamp & Tailoring).
 */
export function nextChapterGoal(state: State | null | undefined): ChapterGoal {
  const ch1 = nextChapter1Goal(state);
  if (ch1.id !== "complete") {
    return enrichGoal(
      {
        ...ch1,
        buildChapter: ch1.id === "build" ? 1 : undefined,
        adventureZone: ch1.tab === "adventure" ? "forest" : undefined,
      },
      1,
      CHAPTER1_OBJECTIVES
    );
  }

  const achieved = state?.progression?.completedMilestones || {};
  const completedChapters = state?.progression?.completedChapters || {};
  const inv = state?.inventory || {};
  const eq = state?.equipment || {};
  const kills = state?.stats?.killsByMonster || {};
  const actions = state?.stats?.actionsById || {};

  // Chapter 2: Mine & Blacksmithing
  const isCh2Done = Boolean(completedChapters.mine || (kills.mine_boss || 0) > 0);
  if (!isCh2Done) {
    const oreCount = (inv.ore_1 || 0) + (inv.ore_2 || 0);
    const ingotCount = (inv.ingot_1 || 0) + (inv.ingot_2 || 0);
    const hasIronWeapon = Boolean(
      achieved.ch2_forge_weapon ||
        (inv.weapon_iron_sword || 0) > 0 ||
        (inv.weapon_steel_axe || 0) > 0 ||
        eq.main_hand === "weapon_iron_sword" ||
        eq.main_hand === "weapon_steel_axe" ||
        (actions.act_forge_iron_sword || 0) > 0 ||
        (actions.act_forge_steel_axe || 0) > 0
    );
    const hasCh2Build = Boolean(achieved.ch2_build || state?.chapter2Build);
    const hasHeavyChest = Boolean(
      achieved.ch2_forge_armor ||
        (inv.armor_iron_chest || 0) > 0 ||
        (inv.armor_steel_chest || 0) > 0 ||
        eq.chest === "armor_iron_chest" ||
        eq.chest === "armor_steel_chest" ||
        (actions.act_forge_iron_chest || 0) > 0 ||
        (actions.act_forge_steel_chest || 0) > 0
    );
    const hasMined = Boolean(
      achieved.ch2_mine_ore ||
        oreCount > 0 ||
        ingotCount > 0 ||
        hasIronWeapon ||
        hasCh2Build ||
        hasHeavyChest ||
        (actions.act_mine_ore_t1 || 0) > 0 ||
        (actions.act_mine_ore_t2 || 0) > 0
    );
    if (!hasMined) {
      return enrichGoal(
        {
          id: "ch2_mine_ore",
          title: "深入矿道开采铜矿或铁矿",
          detail: "森林管家已倒下，矿山大门正式敞开。先去「采矿」挖出第一批金属原矿。",
          tab: "mining",
        },
        2,
        CHAPTER2_OBJECTIVES
      );
    }

    const hasSmelted = Boolean(
      achieved.ch2_smelt_ingot ||
        ingotCount > 0 ||
        hasIronWeapon ||
        hasCh2Build ||
        hasHeavyChest ||
        (actions.act_smelt_ingot_t1 || 0) > 0 ||
        (actions.act_smelt_ingot_t2 || 0) > 0
    );
    if (!hasSmelted) {
      return enrichGoal(
        {
          id: "ch2_smelt_ingot",
          title: "高炉冶炼金属锭",
          detail: "原矿需要送进熔炉提纯。前往「锻造·材料」将铜矿或铁矿冶炼成金属锭。",
          tab: oreCount >= 2 ? "smithing" : "mining",
          craftCategory: "materials",
        },
        2,
        CHAPTER2_OBJECTIVES
      );
    }

    if (!hasIronWeapon) {
      return enrichGoal(
        {
          id: "ch2_forge_weapon",
          title: "锻造铁剑或钢斧",
          detail: "矿山傀儡护甲极厚，木剑已难破防。收集铁锭在「锻造·武器」打造一把金属兵刃。",
          tab: ingotCount >= 2 ? "smithing" : oreCount >= 2 ? "smithing" : "mining",
          craftCategory: ingotCount >= 2 ? "weapons" : "materials",
        },
        2,
        CHAPTER2_OBJECTIVES
      );
    }

    if (!hasCh2Build) {
      return enrichGoal(
        {
          id: "ch2_build",
          title: "择定矿山铁匠流派：重锤破甲 / 淬火反伤",
          detail: "铁砧淬炼已成。在「重锤破甲（攻击+6·无视25%防御）」与「淬火反伤（生命+35·防御+8·受击反伤）」间择一永久铭刻。",
          tab: "adventure",
          adventureZone: "mine",
          buildChapter: 2,
        },
        2,
        CHAPTER2_OBJECTIVES
      );
    }

    if (!hasHeavyChest) {
      return enrichGoal(
        {
          id: "ch2_forge_armor",
          title: "锻造铁制或钢制重型胸甲",
          detail: "矿山霸主的落石重击极具威胁，在「锻造·装备」打造一件金属胸甲护身。",
          tab: ingotCount >= 3 ? "smithing" : oreCount >= 2 ? "smithing" : "mining",
          craftCategory: ingotCount >= 3 ? "equipment" : "materials",
        },
        2,
        CHAPTER2_OBJECTIVES
      );
    }

    const mineScoutCount = [
      "rock_golem",
      "crystal_bat",
      "ore_rat",
      "magma_worm",
      "iron_spider",
      "gem_thief",
    ].reduce((sum, id) => sum + ((kills[id] || 0) > 0 ? 1 : 0), 0);
    if (!achieved.ch2_mine_scouts && mineScoutCount < 3) {
      return enrichGoal(
        {
          id: "ch2_mine_scouts",
          title: `肃清 3 种矿山魔物 (${mineScoutCount}/3)`,
          detail: "前往「冒险·矿山」，击败碎石傀儡、水晶蝙蝠、矿石鼠等至少 3 种矿道魔物熟悉战局。",
          tab: "adventure",
          adventureZone: "mine",
        },
        2,
        CHAPTER2_OBJECTIVES
      );
    }

    return enrichGoal(
      {
        id: "ch2_boss",
        title: "决战矿山霸主",
        detail: "矿道深处的领主已现身！穿好金属重装并备齐恢复补给，攻克矿山霸主开启沼泽航道。",
        tab: "adventure",
        adventureZone: "mine",
      },
      2,
      CHAPTER2_OBJECTIVES
    );
  }

  // Chapter 3: Swamp & Tailoring
  const isCh3Done = Boolean(completedChapters.swamp || (kills.swamp_boss || 0) > 0);
  if (!isCh3Done) {
    const fiberCount = (inv.fiber_1 || 0) + (inv.fiber_2 || 0) + (inv.fiber_3 || 0);
    const yarnCount = (inv.yarn_1 || 0) + (inv.yarn_2 || 0) + (inv.yarn_3 || 0);
    const eqValues = new Set(Object.values(eq).filter((v): v is string => typeof v === "string"));
    const tailorGarbCount = [
      "armor_cloth_chest",
      "armor_cloth_legs",
      "armor_cloth_boots",
      "armor_cloth_gloves",
      "armor_leather_chest",
      "armor_leather_legs",
      "armor_leather_boots",
      "armor_leather_gloves",
      "armor_tailor_leather_chest",
    ].reduce((sum, id) => sum + ((inv[id] || 0) > 0 || eqValues.has(id) ? 1 : 0), 0);
    const hasCh3Build = Boolean(achieved.ch3_build || state?.chapter3Build);

    const hasGatheredFiber = Boolean(
      achieved.ch3_gather_fiber ||
        fiberCount > 0 ||
        yarnCount > 0 ||
        tailorGarbCount > 0 ||
        hasCh3Build ||
        (actions.act_gather_fiber_t1 || 0) > 0 ||
        (actions.act_gather_fiber_t2 || 0) > 0
    );
    if (!hasGatheredFiber) {
      return enrichGoal(
        {
          id: "ch3_gather_fiber",
          title: "前往草甸沼泽采集织物纤维",
          detail: "沼泽湿气腐蚀生铁，轻便灵巧的织物皮甲不可或缺。先去「采集」收获棉花或亚麻。",
          tab: "gathering",
        },
        3,
        CHAPTER3_OBJECTIVES
      );
    }

    const hasSpunYarn = Boolean(
      achieved.ch3_spin_yarn ||
        yarnCount > 0 ||
        tailorGarbCount > 0 ||
        hasCh3Build ||
        (actions.act_spin_yarn_t1 || 0) > 0 ||
        (actions.act_spin_yarn_t2 || 0) > 0
    );
    if (!hasSpunYarn) {
      return enrichGoal(
        {
          id: "ch3_spin_yarn",
          title: "纺制棉线或亚麻线",
          detail: "前往「缝纫·材料」将采集的植物纤维纺成坚韧丝线，为裁剪套装做准备。",
          tab: fiberCount >= 2 ? "tailoring" : "gathering",
          craftCategory: "materials",
        },
        3,
        CHAPTER3_OBJECTIVES
      );
    }

    if (!achieved.ch3_craft_garb && tailorGarbCount < 2) {
      return enrichGoal(
        {
          id: "ch3_craft_garb",
          title: `缝制 2 件裁缝防具套装 (${tailorGarbCount}/2)`,
          detail: "在「缝纫·装备」制作至少 2 件布甲或皮甲部件（长袍、护腿、靴子或手套），凑齐轻装防瘴底子。",
          tab: yarnCount >= 2 ? "tailoring" : fiberCount >= 2 ? "tailoring" : "gathering",
          craftCategory: yarnCount >= 2 ? "equipment" : "materials",
        },
        3,
        CHAPTER3_OBJECTIVES
      );
    }

    if (!achieved.ch3_build && !state?.chapter3Build) {
      return enrichGoal(
        {
          id: "ch3_build",
          title: "择定沼泽游侠流派：疾风连击 / 寻宝猎人",
          detail: "轻装已就绪。在「疾风连击（攻击+5·攻速提升15%）」与「寻宝猎人（生命+25·防御+4·金币+25%·掉率+30%）」间择一铭刻。",
          tab: "adventure",
          adventureZone: "swamp",
          buildChapter: 3,
        },
        3,
        CHAPTER3_OBJECTIVES
      );
    }

    const swampScoutCount = [
      "poison_frog",
      "swamp_zombie",
      "mud_elemental",
      "vine_snake",
      "ghost_light",
      "swamp_troll",
    ].reduce((sum, id) => sum + ((kills[id] || 0) > 0 ? 1 : 0), 0);
    if (!achieved.ch3_swamp_scouts && swampScoutCount < 3) {
      return enrichGoal(
        {
          id: "ch3_swamp_scouts",
          title: `驱散 3 种沼泽魔物 (${swampScoutCount}/3)`,
          detail: "前往「冒险·沼泽」，击败毒雾青蛙、沼泽僵尸、泥浆元素等至少 3 种魔物摸清瘴气规律。",
          tab: "adventure",
          adventureZone: "swamp",
        },
        3,
        CHAPTER3_OBJECTIVES
      );
    }

    return enrichGoal(
      {
        id: "ch3_boss",
        title: "讨伐沼泽之王",
        detail: "沼泽深处的瘴气领主正在苏醒！备好解毒回血料理或治疗技能，一举击败沼泽之王。",
        tab: "adventure",
        adventureZone: "swamp",
      },
      3,
      CHAPTER3_OBJECTIVES
    );
  }

  // Chapter 4: Snow & Volcano — Farming/Fishing -> Cooking -> Crystal/Alchemy -> Dual Bosses
  const isSnowDone = Boolean(completedChapters.snow || (kills.snow_boss || 0) > 0);
  const isVolcanoDone = Boolean(completedChapters.volcano || (kills.volcano_boss || 0) > 0);
  if (!isSnowDone || !isVolcanoDone) {
    const rawIngredientCount =
      (inv.fish_river || 0) +
      (inv.fish_sea || 0) +
      (inv.fish_lake || 0) +
      (inv.fish_deepsea || 0);
    const cookedMealCount =
      (inv.food_simple || 0) +
      (inv.food_fine || 0) +
      (inv.food_hearty_stew || 0) +
      (inv.food_master_feast || 0) +
      (inv.food_royal_banquet || 0);
    const crystalCount =
      (inv.crystal_1 || 0) +
      (inv.crystal_2 || 0) +
      (inv.crystal_3 || 0) +
      (inv.crystal_4 || 0);
    const elixirCount =
      (inv.potion_hp_t1 || 0) +
      (inv.potion_hp_t2 || 0) +
      (inv.potion_hp_t3 || 0) +
      (inv.potion_mp_t1 || 0) +
      (inv.potion_mp_t2 || 0) +
      (inv.potion_battle_fury || 0) +
      (inv.potion_guardian_elixir || 0) +
      (inv.potion_iron_skin || 0) +
      (inv.potion_arcane_surge || 0);
    const hasCh4Build = Boolean(achieved.ch4_build || state?.chapter4Build);

    const hasCookedFeast = Boolean(
      achieved.ch4_cook_feast ||
        cookedMealCount > 0 ||
        hasCh4Build ||
        (actions.act_cook_food_t1 || 0) > 0 ||
        (actions.act_cook_food_t2 || 0) > 0 ||
        (actions.act_cook_food_hearty_stew || 0) > 0 ||
        (actions.act_cook_food_master_feast || 0) > 0 ||
        (actions.act_cook_dish_grilled_lake || 0) > 0 ||
        (actions.act_cook_dish_frost_sashimi || 0) > 0 ||
        (actions.act_cook_dish_deepsea_stew || 0) > 0
    );

    const hasFarmedOrFished = Boolean(
      achieved.ch4_farm_fish ||
        rawIngredientCount > 0 ||
        hasCookedFeast ||
        (actions.act_fish_river_t1 || 0) > 0 ||
        (actions.act_fish_sea_t2 || 0) > 0 ||
        (actions.act_fish_shrimp_t1 || 0) > 0 ||
        (actions.act_plant_cotton_t1 || 0) > 0 ||
        (actions.act_plant_flax_t2 || 0) > 0 ||
        (actions.act_plant_silk_t3 || 0) > 0 ||
        (actions.act_plant_magic_t4 || 0) > 0 ||
        (actions.act_raise_sheep_t1 || 0) > 0 ||
        (actions.act_raise_cattle_t2 || 0) > 0 ||
        (actions.act_raise_chicken_t1 || 0) > 0
    );

    if (!hasFarmedOrFished) {
      return enrichGoal(
        {
          id: "ch4_farm_fish",
          title: "农牧耕作或江海垂钓储备食材",
          detail: "极寒雪山与熔岩深渊消耗剧烈！先去「钓鱼」捕获鲜鱼或前往「种植」收获农牧作物。",
          tab: state?.activeClassId === "farmer" ? "farming" : "fishing",
        },
        4,
        CHAPTER4_OBJECTIVES
      );
    }

    if (!hasCookedFeast) {
      return enrichGoal(
        {
          id: "ch4_cook_feast",
          title: "烹制远征续航料理",
          detail: "前往「烹饪」烹调料理并装入战斗食物槽，自动抵御雪山严寒与持续消耗。",
          tab: "cooking",
        },
        4,
        CHAPTER4_OBJECTIVES
      );
    }

    const hasBrewedElixir = Boolean(
      achieved.ch4_brew_elixir ||
        elixirCount > 0 ||
        hasCh4Build ||
        (actions.act_brew_potion_hp_t1 || 0) > 0 ||
        (actions.act_brew_potion_hp_t2 || 0) > 0 ||
        (actions.act_brew_potion_hp_t3 || 0) > 0 ||
        (actions.act_brew_potion_mp_t1 || 0) > 0 ||
        (actions.act_brew_potion_mp_t2 || 0) > 0 ||
        (actions.act_brew_potion_battle_fury || 0) > 0 ||
        (actions.act_brew_potion_guardian_elixir || 0) > 0 ||
        (actions.act_brew_potion_iron_skin || 0) > 0 ||
        (actions.act_brew_potion_arcane_surge || 0) > 0
    );

    const hasMinedCrystal = Boolean(
      achieved.ch4_mine_crystal ||
        crystalCount > 0 ||
        hasBrewedElixir ||
        (actions.act_mine_crystal_t1 || 0) > 0 ||
        (actions.act_mine_crystal_t2 || 0) > 0 ||
        (actions.act_mine_crystal_t3 || 0) > 0
    );

    if (!hasMinedCrystal) {
      return enrichGoal(
        {
          id: "ch4_mine_crystal",
          title: "开采微光与辉光魔晶",
          detail: "炼金药剂离不开高纯度魔力晶簇。前往「水晶」矿脉采集微光水晶或辉光水晶。",
          tab: "crystal_mining",
        },
        4,
        CHAPTER4_OBJECTIVES
      );
    }

    if (!hasBrewedElixir) {
      return enrichGoal(
        {
          id: "ch4_brew_elixir",
          title: "调配炼金战斗秘药",
          detail: "前往「炼金」萃取生命/魔力药水或狂战/铁壁药剂，挂载至战斗补给栏提升爆发。",
          tab: "alchemy",
        },
        4,
        CHAPTER4_OBJECTIVES
      );
    }

    if (!hasCh4Build) {
      return enrichGoal(
        {
          id: "ch4_build",
          title: "择定冰火远征流派：秘药狂热 / 盛宴生机",
          detail: "六艺俱备！在「秘药狂热（攻击+8·药剂增益+50%·回蓝+35%）」与「盛宴生机（生命+55·防御+8·进食回血+35%并结盾）」间择一觉醒。",
          tab: "adventure",
          adventureZone: "snow",
          buildChapter: 4,
        },
        4,
        CHAPTER4_OBJECTIVES
      );
    }

    if (!isSnowDone) {
      return enrichGoal(
        {
          id: "ch4_snow_boss",
          title: "踏破冰封雪山 · 讨伐霜冠雪魔",
          detail: "备齐料理与炼金秘药，前往「冒险·冰封雪山」，击穿霜冠雪魔的寒冰护甲！",
          tab: "adventure",
          adventureZone: "snow",
        },
        4,
        CHAPTER4_OBJECTIVES
      );
    }

    return enrichGoal(
      {
        id: "ch4_volcano_boss",
        title: "决战熔岩深渊 · 讨伐烈焰魔君",
        detail: "向炽热地心进军！注意烈焰魔君喷发预警与坚守减伤，平定熔岩深渊霸主。",
        tab: "adventure",
        adventureZone: "volcano",
      },
      4,
      CHAPTER4_OBJECTIVES
    );
  }

  return enrichGoal(
    {
      id: "ch4_complete",
      title: "第四章完成 · 六艺贯通与深渊远征",
      detail: "森林、矿山、沼泽、雪山、火山五大疆域全部平定，六大职业百炼贯通！向幽影深渊与神域更高峰进发吧。",
      tab: "adventure",
    },
    4,
    CHAPTER4_OBJECTIVES
  );
}
