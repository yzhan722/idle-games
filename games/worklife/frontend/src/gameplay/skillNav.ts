/**
 * MWI-style skill navigation model.
 *
 * Milky Way Idle's left sidebar is one list: every skill is a row with an icon, a level and an XP
 * bar, grouped into gathering / production / combat, with the running action highlighted. This file
 * describes that list for WorkLife's six professions (each has one gathering and one production
 * skill page) plus combat and character, and decides what is visible before chapter 1 is done.
 */

export type SkillNavGroup = "gathering" | "production" | "combat" | "system";

export type SkillNavItem = {
  /** Tab id used by NewGameInterface. */
  id: string;
  name: string;
  group: SkillNavGroup;
  /** Profession whose skill level this row shows (gathering + production share it). */
  profession?: string;
  /** `skill_<profession>` key in playerState.skills, "combat" (derived level), or `combat:<skill>` (MWI combat skill). */
  skillKey?: string;
  /** Rows that are pure progress readouts navigate to this tab instead of a page of their own. */
  opensTab?: string;
  /** T1 nav icon key when one exists; otherwise the emoji is used. */
  icon?: string;
  emoji: string;
  /**
   * Accessible name when it differs from the visible label. The chapter-1 shell called the two
   * woodcutter pages 工作 / 制作; keep those as the a11y names so screen-reader users and the
   * existing e2e locators (`getByRole("button", { name: "工作" })`) are unaffected by the rename.
   */
  ariaLabel?: string;
};

export const SKILL_NAV: SkillNavItem[] = [
  { id: "logging", name: "伐木", group: "gathering", profession: "woodcutter", skillKey: "skill_woodcutter", icon: "nav-logging", emoji: "🪓", ariaLabel: "工作" },
  { id: "mining", name: "挖矿", group: "gathering", profession: "blacksmith", skillKey: "skill_blacksmith", icon: "nav-mining", emoji: "⛏️" },
  { id: "farming", name: "种植", group: "gathering", profession: "farmer", skillKey: "skill_farmer", icon: "nav-farming", emoji: "🌾" },
  { id: "fishing", name: "钓鱼", group: "gathering", profession: "chef", skillKey: "skill_chef", icon: "nav-fishing", emoji: "🎣" },
  { id: "gathering", name: "采集", group: "gathering", profession: "tailor", skillKey: "skill_tailor", icon: "nav-gathering", emoji: "🧺" },
  { id: "crystal_mining", name: "水晶", group: "gathering", profession: "alchemist", skillKey: "skill_alchemist", icon: "nav-crystal", emoji: "💎" },
  { id: "woodworking", name: "木工", group: "production", profession: "woodcutter", skillKey: "skill_woodcutter", icon: "nav-woodworking", emoji: "🪚", ariaLabel: "制作" },
  { id: "smithing", name: "锻造", group: "production", profession: "blacksmith", skillKey: "skill_blacksmith", icon: "nav-smithing", emoji: "⚒️" },
  { id: "husbandry", name: "畜牧", group: "production", profession: "farmer", skillKey: "skill_farmer", icon: "nav-husbandry", emoji: "🐄" },
  { id: "cooking", name: "烹饪", group: "production", profession: "chef", skillKey: "skill_chef", icon: "nav-cooking", emoji: "🍲" },
  { id: "tailoring", name: "缝纫", group: "production", profession: "tailor", skillKey: "skill_tailor", icon: "nav-tailoring", emoji: "🧵" },
  { id: "alchemy", name: "炼金", group: "production", profession: "alchemist", skillKey: "skill_alchemist", icon: "nav-alchemy", emoji: "⚗️" },
  { id: "enhance", name: "强化", group: "production", skillKey: "skill_enhancing", icon: "nav-enhance", emoji: "✨" },
  { id: "adventure", name: "冒险", group: "combat", skillKey: "combat", icon: "nav-adventure", emoji: "⚔️" },
  // MWI combat skills: each is a row with its own level / XP bar; all of them open the combat page.
  { id: "combat_stamina", name: "耐力", group: "combat", skillKey: "combat:stamina", icon: "stat-hp", emoji: "❤️", opensTab: "adventure" },
  { id: "combat_intelligence", name: "智力", group: "combat", skillKey: "combat:intelligence", icon: "stat-int", emoji: "🧠", opensTab: "adventure" },
  { id: "combat_attack", name: "攻击", group: "combat", skillKey: "combat:attack", icon: "stat-atk", emoji: "🎯", opensTab: "adventure" },
  { id: "combat_defense", name: "防御", group: "combat", skillKey: "combat:defense", icon: "stat-def", emoji: "🛡️", opensTab: "adventure" },
  { id: "combat_melee", name: "近战", group: "combat", skillKey: "combat:melee", icon: "nav-melee", emoji: "🗡️", opensTab: "adventure" },
  { id: "combat_ranged", name: "远程", group: "combat", skillKey: "combat:ranged", icon: "nav-ranged", emoji: "🏹", opensTab: "adventure" },
  { id: "combat_magic", name: "魔法", group: "combat", skillKey: "combat:magic", icon: "nav-magic", emoji: "🔮", opensTab: "adventure" },
  { id: "character", name: "角色", group: "system", icon: "nav-character", emoji: "🧍" },
  { id: "inventory", name: "背包", group: "system", icon: "nav-inventory", emoji: "🎒" },
  { id: "tasks", name: "任务", group: "system", icon: "nav-tasks", emoji: "📋" },
  { id: "houses", name: "房屋", group: "system", icon: "nav-houses", emoji: "🏠" },
  { id: "trading", name: "交易行", group: "system", icon: "nav-trading", emoji: "🏷️" },
  { id: "party", name: "组队", group: "system", icon: "nav-party", emoji: "👥" },
];

export const SKILL_NAV_GROUP_TITLES: Record<SkillNavGroup, string> = {
  gathering: "采集",
  production: "生产",
  combat: "战斗",
  system: "其他",
};

/**
 * The woodcutter loop chapter 1 teaches. MWI shows every skill from the first minute, so these rows
 * are only *highlighted* (推荐) while the chapter is open — never the only rows.
 */
export const CHAPTER1_NAV_IDS = ["logging", "woodworking", "adventure", "character"] as const;

export function visibleSkillNav(_chapterDone: boolean): SkillNavItem[] {
  return SKILL_NAV;
}

export function recommendedSkillNavIds(chapterDone: boolean): Set<string> {
  return new Set(chapterDone ? [] : CHAPTER1_NAV_IDS);
}

/** Mobile bottom bar: five stable groups; gathering / production open a picker sheet. */
export type MobileNavGroup = { id: "gathering" | "production" | "combat" | "character" | "more"; name: string; emoji: string; icon?: string };
export const MOBILE_NAV_GROUPS: MobileNavGroup[] = [
  { id: "gathering", name: "采集", emoji: "🪓", icon: "nav-logging" },
  { id: "production", name: "生产", emoji: "🪚", icon: "nav-woodworking" },
  { id: "combat", name: "战斗", emoji: "⚔️", icon: "nav-adventure" },
  { id: "character", name: "角色", emoji: "🧍", icon: "nav-character" },
  { id: "more", name: "更多", emoji: "☰", icon: "nav-more" },
];

/** The tab a nav row opens (combat-skill rows all open the combat page). */
export function tabForNavId(id: string): string {
  return SKILL_NAV.find((s) => s.id === id)?.opensTab || id;
}

/** Which mobile group a nav tab belongs to (so the active group can be highlighted). */
export function mobileGroupForTab(tabId: string): MobileNavGroup["id"] {
  const item = SKILL_NAV.find((s) => s.id === tabId);
  if (!item) return "more";
  if (item.group === "gathering") return "gathering";
  if (item.group === "production") return "production";
  if (item.group === "combat") return "combat";
  if (item.id === "character") return "character";
  return "more";
}

type PackActionLike = { id: string; skillId?: string; consumes?: unknown[] };

/**
 * Which nav row hosts a running action. Pack action ids do not encode gather vs production
 * (`act_craft_*` exists for every profession), so decide by skillId + whether inputs are consumed.
 */
export function navIdForAction(action: PackActionLike | undefined | null): string | undefined {
  if (!action) return undefined;
  if (action.id.startsWith("act_combat_")) return "adventure";
  const profession = (action.skillId || "").replace(/^skill_/, "");
  if (!profession) return undefined;
  const isProduction = Array.isArray(action.consumes) && action.consumes.length > 0;
  return SKILL_NAV.find((s) => s.profession === profession && s.group === (isProduction ? "production" : "gathering"))?.id;
}
