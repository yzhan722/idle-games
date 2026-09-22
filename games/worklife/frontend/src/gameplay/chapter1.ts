export type ChapterGoal = {
  id: string;
  title: string;
  detail: string;
  tab: "logging" | "woodworking" | "adventure" | "character";
};

type State = {
  progression?: { completedMilestones: Record<string, unknown>; completedChapters: Record<string, unknown> };
  inventory?: Record<string, number>;
  equipment?: { main_hand?: string; chest?: string };
  chapter1Build?: string;
  stats?: { totalKills?: number; totalBossKills?: number; killsByMonster?: Record<string, number> };
  skills?: Record<string, { level?: number }>;
};

export const CHAPTER1_OBJECTIVES = [
  "chop",
  "board",
  "sword",
  "equip_sword",
  "first_kill",
  "build",
  "archetypes",
  "chest",
  "boss",
  "complete",
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
  const wc = state?.skills?.skill_woodcutter?.level || 1;

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
      tab: "woodworking",
    };
  }
  if (!achieved.sword && sword < 1) {
    return {
      id: "sword",
      title: "做出木头短剑",
      detail: "三块木板做成短剑。没有武器，森林里站不住。",
      tab: "woodworking",
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
  if (!achieved.chest && (chest < 1 || !eq.chest)) {
    return {
      id: "chest",
      title: wc < 3 ? "把伐木升到 3 级并做木甲" : "穿上木制胸甲",
      detail: "管家的拳头很重。上衣空着不要去敲门。",
      tab: chest < 1 ? "woodworking" : "character",
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
