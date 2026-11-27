import { DISCIPLES, LAMP_MAX_LEVEL, PATTERNS, SAVE_VERSION, SOOT_MAX, TERRACES } from "./data.ts";
import { newGame } from "./engine.ts";
import { SLOTS } from "./grid.ts";
import type { Flame, GameState, ResourceId } from "./types.ts";

function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function serialize(state: GameState): string {
  const body = JSON.stringify(state);
  return `CM${SAVE_VERSION}.${checksum(body)}.${body}`;
}

export type LoadResult = { ok: true; state: GameState } | { ok: false; reason: string };

const finite = (v: unknown, fallback: number, min = 0, max = Number.MAX_VALUE): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** 逐字段校验，坏掉的字段退回默认值，不会因为一处坏就丢整份存档。 */
export function deserialize(text: string): LoadResult {
  const m = /^CM(\d+)\.([0-9a-f]{8})\.([\s\S]+)$/.exec(text.trim());
  if (!m) return { ok: false, reason: "不是《长明山》的存档" };
  if (Number(m[1]) > SAVE_VERSION) return { ok: false, reason: "存档来自更新的版本" };
  if (checksum(m[3]) !== m[2]) return { ok: false, reason: "存档不完整或被改动过" };
  let raw: Partial<GameState>;
  try {
    raw = JSON.parse(m[3]) as Partial<GameState>;
  } catch {
    return { ok: false, reason: "存档内容读不出来" };
  }
  if (!raw || typeof raw !== "object") return { ok: false, reason: "存档内容读不出来" };

  const s = newGame();
  s.time = finite(raw.time, 0);
  for (const k of Object.keys(s.res) as ResourceId[]) s.res[k] = finite(raw.res?.[k], s.res[k]);
  s.terraces = Math.floor(finite(raw.terraces, 1, 1, TERRACES.length));
  s.realm = Math.floor(finite(raw.realm, 0, 0, 6));
  s.nights = Math.floor(finite(raw.nights, 0));
  s.nightsHeld = Math.floor(finite(raw.nightsHeld, 0));
  s.fuel = finite(raw.fuel, 1, 0.5, 1);
  s.savedAt = finite(raw.savedAt, 0);
  s.tide = {
    phase: raw.tide?.phase === "surge" ? "surge" : "calm",
    left: finite(raw.tide?.left, s.tide.left, 1, 600),
    index: Math.floor(finite(raw.tide?.index, 0)),
    sooted: Boolean(raw.tide?.sooted),
  };
  s.vigil = { armed: Boolean(raw.vigil?.armed), holding: Boolean(raw.vigil?.holding) };
  const patterns = new Set(PATTERNS.map((p) => p.id));
  s.seen = [...new Set(list(raw.seen).filter((x): x is string => patterns.has(x as string)))];
  s.inscribed = [...new Set(list(raw.inscribed).filter((x): x is string => patterns.has(x as string)))];

  const lamps = list(raw.lamps) as (Partial<{ flame: Flame; level: number; soot: number }> | null)[];
  s.lamps = SLOTS.map((slot) => {
    const l = lamps[slot.id];
    if (!l || slot.terrace >= s.terraces || !["dawn", "verdant", "frost"].includes(l.flame as string)) return null;
    return {
      flame: l.flame as Flame,
      level: Math.floor(finite(l.level, 1, 1, LAMP_MAX_LEVEL)),
      soot: finite(l.soot, 0, 0, SOOT_MAX),
    };
  });

  const taken = new Set<number>();
  const people = list(raw.disciples) as Partial<GameState["disciples"][number]>[];
  s.disciples = DISCIPLES.filter((def) => def === DISCIPLES[0] || people.some((p) => p?.id === def.id)).map((def) => {
    const p = people.find((x) => x?.id === def.id) ?? {};
    const slot = typeof p.slot === "number" ? SLOTS[p.slot] : undefined;
    const free = slot && slot.terrace < s.terraces && !s.lamps[slot.id] && !taken.has(slot.id);
    if (free) taken.add(slot.id);
    return { id: def.id, slot: free ? slot.id : null, xp: finite(p.xp, 0), level: Math.floor(finite(p.level, 1, 1, 10)) };
  });
  return { ok: true, state: s };
}
