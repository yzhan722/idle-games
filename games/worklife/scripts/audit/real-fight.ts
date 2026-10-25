/**
 * Boss fights on the REAL combat engine (backend/src/hp_combat.ts), not on the plain `simulateFight`.
 *
 * The plain sim knows neither the innate 重劈 nor the boss mechanics (guard, wrath, rockfall, miasma,
 * frost armour, eruption), so a boss solved on it lands far from its target in the real game. Here a
 * level-L player wearing a zone chain fights through `startHpCombat` / `tickHpCombat` in 1 s ticks
 * (the client's polling rate) with only the innate 重劈 on "always" — no books, no food, no drinks.
 */
import { createMemoryStorage } from "../../backend/src/storage_memory";
import { startHpCombat, tickHpCombat } from "../../backend/src/hp_combat";
import { defaultCombatSkills } from "../../backend/src/combat_skills";
import { P } from "./lib";
import type { Chain } from "./zone-chains";

const T0 = new Date("2026-09-03T00:00:00.000Z");
const MAX_FIGHT_MS = 20 * 60_000;

/** The pack with the combat level gates removed (we test the fight, not the unlock) and one monster's atk overridden. */
function packWith(monsterId: string, atk: number): any {
  return {
    ...P,
    actions: (P.actions as any[]).map((a: any) => (String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a)),
    monsters: (P.monsters as any[]).map((m: any) => (m.id === monsterId ? { ...m, atk } : m)),
  };
}

let storagePromise: ReturnType<typeof createMemoryStorage> | undefined;
let counter = 0;

async function freshPlayer(chain: Chain, L: number): Promise<any> {
  storagePromise ??= createMemoryStorage();
  const storage = storagePromise;
  const user = await storage.findOrCreateGuestUser(`real-fight-${counter++}`);
  const state: any = await storage.getOrCreatePlayerState(user.id, (P as any).version || "1.0.0");
  state.combatLevel = undefined;
  state.combatSkills = defaultCombatSkills(L);
  for (const [slot, id] of chain) {
    state.equipment[slot] = id;
    state.inventory[id] = 1;
  }
  return state;
}

export type RealFight = { won: boolean; left: number; durationMs: number; /** Every combat-log line of the fight, in order. */ log: string[] };

/** Lines `next` added to `prev` (the encounter log keeps only its last 24 lines, so find the overlap). */
function newLines(prev: string[], next: string[]): string[] {
  for (let k = Math.min(prev.length, next.length); k > 0; k--) {
    if (prev.slice(prev.length - k).every((line, i) => line === next[i])) return next.slice(k);
  }
  return next;
}

/** One boss fight: `left` is the share of the player's max HP that survived (0 on a loss). */
export async function realBossFight(chain: Chain, L: number, monsterId: string, atk: number): Promise<RealFight> {
  const pack = packWith(monsterId, atk);
  const state = await freshPlayer(chain, L);
  state.hpCombat = startHpCombat(state, pack, monsterId, T0);
  let ms = 0;
  let seen: string[] = [];
  const log: string[] = [];
  const collect = () => {
    log.push(...newLines(seen, state.hpCombat.log));
    seen = [...state.hpCombat.log];
  };
  collect();
  while (!state.hpCombat.outcome && ms < MAX_FIGHT_MS) {
    tickHpCombat(state, pack, new Date(T0.getTime() + ms + 1000), 1000, () => 0.99);
    ms += 1000;
    collect();
  }
  const enc = state.hpCombat;
  const won = enc.outcome === "win";
  return { won, left: won ? enc.playerHp / enc.playerMaxHp : 0, durationMs: ms, log };
}

/** Highest atk that still leaves at least `target` of the player's HP (bisection; left is ~monotone in atk). */
export async function solveBossAtk(chain: Chain, L: number, monsterId: string, target: number): Promise<number> {
  let lo = 1;
  let hi = 4000;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const r = await realBossFight(chain, L, monsterId, mid);
    if (r.won && r.left >= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
