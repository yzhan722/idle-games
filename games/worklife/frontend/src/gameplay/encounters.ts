export type Encounter = {
  id: string;
  name: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  xp: number;
  gold: number;
  map: string;
  actionId: string;
  isBoss: boolean;
  archetype: string;
  attackIntervalMs?: number;
  incomingDamageMult?: number;
  outgoingDamageMult?: number;
  mechanics?: string[];
  desc?: string;
  icon?: string;
  rare?: string;
  rareChance?: number;
};

type Pack = {
  monsters?: Array<Record<string, unknown> & { id: string }>;
  stages?: Array<{ id: string; name: string; monsters: string[] }>;
  encounterStages?: Array<{ id: string; name: string; encounters: Encounter[] }>;
};

export function encounterStages(pack: Pack | null | undefined): Array<{
  id: string;
  name: string;
  encounters: Encounter[];
}> {
  if (!pack) return [];
  if (pack.encounterStages?.length) return pack.encounterStages;
  const byId = new Map((pack.monsters || []).map((m) => [m.id, m]));
  return (pack.stages || []).map((stage) => ({
    id: stage.id,
    name: stage.name,
    encounters: (stage.monsters || []).map((id) => {
      const m = byId.get(id) || { id, name: id };
      const isBoss =
        Boolean(m.isBoss) ||
        String(id).endsWith("_boss") ||
        String(m.name || "").includes("BOSS");
      return {
        ...m,
        id,
        name: String(m.name || id),
        level: Number(m.level || 1),
        hp: Number(m.hp || 1),
        atk: Number(m.atk || 1),
        def: Number(m.def || 0),
        xp: Number(m.xp || 0),
        gold: Number(m.gold || 0),
        map: stage.id,
        actionId: `act_combat_${id}`,
        isBoss,
        archetype: String(m.archetype || (isBoss ? "boss" : "ordinary")),
        attackIntervalMs: Number(m.attackIntervalMs || (isBoss ? 2200 : 2400)),
        incomingDamageMult: Number(m.incomingDamageMult || 1),
        outgoingDamageMult: Number(m.outgoingDamageMult || 1),
      } as Encounter;
    }),
  }));
}

/**
 * Zones a player may enter. MWI lists every zone and lets the level recommendation do the gating;
 * we keep chapter 1 on the forest for teaching, then open zones in pack order as soon as their
 * roster has art (a zone with emoji monsters is not shipped). Append the next id here when its
 * seven illustrations land — the adventure sidebar and VS-01 read this list.
 */
export const OPEN_ZONE_IDS = ["forest", "mine", "swamp", "snow"] as const;

/** Sidebar model: the zones to list and the next locked door (undefined when everything is open). */
export function zoneDoors<S extends { id: string }>(stages: S[], chapterDone: boolean): { open: S[]; locked: S | undefined } {
  const openIds: readonly string[] = chapterDone ? OPEN_ZONE_IDS : ["forest"];
  const open = stages.filter((s) => openIds.includes(s.id));
  const locked = stages.find((s) => !openIds.includes(s.id));
  return { open, locked };
}
