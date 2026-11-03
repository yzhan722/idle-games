/** Project content-pack monsters + stages into UI encounters. Single source: shared JSON. */
import { mechanicDefsFor } from "./boss_mechanics";
import type { BossMechanicDef } from "./types";

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
  mechanicDefs?: BossMechanicDef[];
  desc?: string;
  icon?: string;
  rare?: string;
  rareChance?: number;
};

type StageIn = { id: string; name: string; monsters: string[] };
type MonsterIn = Record<string, unknown> & { id: string; name?: string };

export function encounterStages(pack: {
  bossMechanics?: BossMechanicDef[];
  monsters?: MonsterIn[];
  stages?: StageIn[];
  encounterStages?: Array<{ id: string; name: string; encounters: Encounter[] }>;
}): Array<{ id: string; name: string; encounters: Encounter[] }> {
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
        mechanicDefs: mechanicDefsFor(pack, m),
        archetype: String(m.archetype || (isBoss ? "boss" : "ordinary")),
        attackIntervalMs: Number(m.attackIntervalMs || (isBoss ? 2200 : 2400)),
        incomingDamageMult: Number(m.incomingDamageMult || 1),
        outgoingDamageMult: Number(m.outgoingDamageMult || 1),
      } as Encounter;
    }),
  }));
}
