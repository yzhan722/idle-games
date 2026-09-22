/**
 * Pack-driven action rows for MWI-style skill pages.
 *
 * The content pack is the only source of level requirements, durations, XP and yields. The old
 * per-page tables in NewGameInterface (trees / ores / crops …) disagreed with it (e.g. 铁杉 was
 * shown as Lv.20 / 10s while the server requires Lv.12 / 8.2s), so pages must read from here.
 */

export type PackAction = {
  id: string;
  name: string;
  skillId: string;
  duration: number;
  xp: number;
  requirements?: { skillLevel?: number };
  yields?: Array<{ itemId: string; qty?: number; chance?: number }>;
  consumes?: Array<{ itemId: string; qty: number }>;
};

export type SkillActionRow = {
  action: PackAction;
  requiredLevel: number;
  unlocked: boolean;
  /** Levels still needed when locked (0 when unlocked). */
  levelsToGo: number;
  primaryYield?: { itemId: string; qty: number; chance: number };
  rareYields: Array<{ itemId: string; qty: number; chance: number }>;
  /** Legacy card id (poplar / copper …) used for T1 art lookup and page copy, when known. */
  cardId?: string;
  /** Flavor title (路边的小白杨) when the legacy table has one; the pack name is the verb (砍伐小白杨). */
  title?: string;
};

export type ActionKind = "gathering" | "production";

/** Which gather page an action belongs to when a profession has more than one (farmer: 种植 vs 畜牧). */
export function gatherPageFor(action: PackAction): "primary" | "secondary" {
  return action.id.startsWith("act_raise_") ? "secondary" : "primary";
}

export function actionKind(action: PackAction): ActionKind {
  return Array.isArray(action.consumes) && action.consumes.length > 0 ? "production" : "gathering";
}

export function skillActionRows(
  actions: PackAction[] | undefined,
  skillId: string,
  kind: ActionKind,
  skillLevel: number,
  opts: { page?: "primary" | "secondary"; cardIdByActionId?: Record<string, string>; titleByActionId?: Record<string, string> } = {}
): SkillActionRow[] {
  if (!actions) return [];
  return actions
    .filter((a) => a.skillId === skillId && !a.id.startsWith("act_combat_") && actionKind(a) === kind)
    .filter((a) => (kind === "gathering" && opts.page ? gatherPageFor(a) === opts.page : true))
    .map((a) => {
      const requiredLevel = Number(a.requirements?.skillLevel || 1);
      const yields = (a.yields || []).map((y) => ({ itemId: y.itemId, qty: Number(y.qty ?? 1), chance: Number(y.chance ?? 1) }));
      const sure = yields.filter((y) => y.chance >= 1);
      const primary = sure[0] || yields[0];
      return {
        action: a,
        requiredLevel,
        unlocked: skillLevel >= requiredLevel,
        levelsToGo: Math.max(0, requiredLevel - skillLevel),
        primaryYield: primary,
        rareYields: yields.filter((y) => y.chance < 1),
        cardId: opts.cardIdByActionId?.[a.id],
        title: opts.titleByActionId?.[a.id],
      };
    })
    .sort((x, y) => x.requiredLevel - y.requiredLevel || x.action.duration - y.action.duration);
}

/** The next locked row, for the "再升 N 级解锁 …" nudge under the list. */
export function nextUnlock(rows: SkillActionRow[]): SkillActionRow | undefined {
  return rows.find((r) => !r.unlocked);
}
