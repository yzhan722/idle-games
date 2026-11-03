import pack from "../../shared/enhanced_content_pack_chinese.json";
import { defaultCombatSkills } from "./combat_skills";
import { playerCombatant, type Combatant } from "./first_hour_combat";
import { createMemoryStorage } from "./storage_memory";
import { startHpCombat, tickHpCombat } from "./hp_combat";

const P: any = pack;
const items: Map<string, any> = new Map(P.items.map((i: any) => [i.id, i]));
const craftLevel = new Map<string, number>();
for (const a of P.actions) {
  for (const y of a.yields || []) {
    if (!items.has(y.itemId)) continue;
    const lv = Number(a.requirements?.skillLevel || 1);
    if (!craftLevel.has(y.itemId) || lv < craftLevel.get(y.itemId)!) {
      craftLevel.set(y.itemId, lv);
    }
  }
}
const gearItems = P.items.filter((i: any) => ["weapon", "armor", "offhand", "accessory"].includes(i.type));
function slotOf(i: any): string {
  if (i.type === "weapon") return "main_hand";
  if (i.type === "offhand") return "off_hand";
  if (i.type === "accessory") return "accessory";
  return i.slot || "chest";
}
const power = (i: any) => Number(i.atk || 0) + Number(i.def || 0);

export type Chain = Array<[slot: string, itemId: string]>;

export const CHAINS: Record<string, Chain> = {
  forest: [
    ["main_hand", "weapon_wooden_sword"],
    ["chest", "armor_wood_chest"],
    ["legs", "armor_wood_legs"],
    ["feet", "armor_wood_boots"],
    ["hands", "armor_wood_gloves"],
    ["off_hand", "weapon_shield_t1"],
  ],
  mine: [
    ["main_hand", "weapon_steel_axe"],
    ["chest", "armor_iron_chest"],
    ["legs", "armor_iron_legs"],
    ["feet", "armor_iron_boots"],
    ["hands", "armor_iron_gloves"],
    ["off_hand", "weapon_shield_t1"],
    ["accessory1", "accessory_pouch_medium"],
  ],
  swamp: [
    ["main_hand", "weapon_logging_axe_t2"],
    ["chest", "armor_blacksmith_iron_chest"],
    ["legs", "armor_blacksmith_iron_legs"],
    ["feet", "armor_blacksmith_iron_boots"],
    ["hands", "armor_blacksmith_iron_gloves"],
    ["off_hand", "weapon_shield_t2"],
    ["accessory1", "accessory_pouch_medium"],
  ],
  snow: [
    ["main_hand", "weapon_frost_blade"],
    ["head", "armor_frost_head"],
    ["chest", "armor_frost_chest"],
    ["legs", "armor_frost_legs"],
    ["hands", "armor_frost_hands"],
    ["feet", "armor_frost_feet"],
    ["off_hand", "offhand_frost_shield"],
    ["accessory1", "accessory_frost_ring"],
  ],
  volcano: [
    ["main_hand", "weapon_magma_blade"],
    ["head", "armor_magma_head"],
    ["chest", "armor_magma_chest"],
    ["legs", "armor_magma_legs"],
    ["hands", "armor_magma_hands"],
    ["feet", "armor_magma_feet"],
    ["off_hand", "offhand_magma_shield"],
    ["accessory1", "accessory_magma_ring"],
  ],
};

export const PREV_ZONE: Record<string, string> = {
  mine: "forest",
  swamp: "mine",
  snow: "swamp",
  volcano: "snow",
};

export function derivedChain(L: number): Chain {
  const sets = P.equipmentSets
    .map((s: any) => ({ s, lv: Math.max(...s.pieces.map((p: any) => craftLevel.get(p.itemId) || 0)) }))
    .filter(
      (x: any) =>
        x.lv <= L &&
        x.s.pieces.length >= 4 &&
        ["all", "combat", "blacksmith", "woodcutter"].includes(x.s.profession),
    );
  sets.sort((a: any, b: any) => b.lv - a.lv);
  const eq = new Map<string, string>();
  if (sets[0]) for (const p of sets[0].s.pieces) eq.set(p.slot, p.itemId);
  const bySlot = new Map<string, any[]>();
  for (const i of gearItems) {
    const cl = craftLevel.get(i.id);
    if (cl === undefined || cl > L) continue;
    if (i.type === "weapon" && /logging|hoe|sickle|scissors|frying|spatula|bottle|hammer/.test(i.id)) continue;
    const sl = slotOf(i);
    const key = sl === "accessory" ? "accessory1" : sl;
    if (!bySlot.has(key)) bySlot.set(key, []);
    bySlot.get(key)!.push(i);
  }
  for (const [sl, arr] of bySlot) {
    if (eq.has(sl)) continue;
    arr.sort((a, b) => power(b) - power(a));
    eq.set(sl, arr[0].id);
  }
  return [...eq];
}

export function playerFor(zone: string, L: number, chain?: Chain): Combatant {
  const useChain = chain ?? CHAINS[zone] ?? derivedChain(L);
  const equipment: Record<string, string> = {};
  const inventory: Record<string, number> = {};
  for (const [slot, id] of useChain) {
    equipment[slot] = id;
    inventory[id] = 1;
  }
  const state: any = { inventory, equipment, combatSkills: defaultCombatSkills(L), stats: {} };
  return playerCombatant(state, P);
}

const T0 = new Date("2026-09-03T00:00:00.000Z");
const MAX_FIGHT_MS = 20 * 60_000;
let storagePromise: ReturnType<typeof createMemoryStorage> | undefined;
let counter = 0;

function newLines(prev: string[], next: string[]): string[] {
  for (let k = Math.min(prev.length, next.length); k > 0; k--) {
    if (prev.slice(prev.length - k).every((line, i) => line === next[i])) return next.slice(k);
  }
  return next;
}

export type RealFight = { won: boolean; left: number; durationMs: number; log: string[] };

export async function realBossFight(chain: Chain, L: number, monsterId: string, atk: number): Promise<RealFight> {
  const testPack = {
    ...P,
    actions: (P.actions as any[]).map((a: any) =>
      String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a,
    ),
    monsters: (P.monsters as any[]).map((m: any) => (m.id === monsterId ? { ...m, atk } : m)),
  };
  storagePromise ??= createMemoryStorage();
  const user = await storagePromise.findOrCreateGuestUser(`real-fight-${counter++}`);
  const state: any = await storagePromise.getOrCreatePlayerState(user.id, (P as any).version || "1.0.0");
  state.combatLevel = undefined;
  state.combatSkills = defaultCombatSkills(L);
  for (const [slot, id] of chain) {
    state.equipment[slot] = id;
    state.inventory[id] = 1;
  }
  state.hpCombat = startHpCombat(state, testPack, monsterId, T0);
  let ms = 0;
  let seen: string[] = [];
  const log: string[] = [];
  const collect = () => {
    log.push(...newLines(seen, state.hpCombat.log));
    seen = [...state.hpCombat.log];
  };
  collect();
  while (!state.hpCombat.outcome && ms < MAX_FIGHT_MS) {
    tickHpCombat(state, testPack, new Date(T0.getTime() + ms + 1000), 1000, () => 0.99);
    ms += 1000;
    collect();
  }
  const enc = state.hpCombat;
  const won = enc.outcome === "win";
  return { won, left: won ? enc.playerHp / enc.playerMaxHp : 0, durationMs: ms, log };
}
