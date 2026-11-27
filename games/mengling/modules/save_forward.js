// 存档前向兼容：比这一版新的客户端写进来的字段，读档时先收着、不进入游戏状态，存档时原样写回。
// 这样在旧一点的设备上打开、再存，新版的数据不会丢。meta 与 era 本来就整块保留，不在这里处理。

const bags = new WeakMap();

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const isBox = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** 按字段白名单读取的容器；转生会清空的，转生后不再写回 */
const BOXES = [
  ["res", true], ["buildings", true], ["tech", true], ["auto", true], ["auto.autoCraft", true], ["skills", true], ["rng", true], ["mons", true],
  ["unlocks", false], ["permanentBoosts", false], ["training", false], ["breeding", false], ["expedition", false], ["dex", false], ["pve", false], ["crafting", false],
];
/** 这一版认得、但读档后不一定留在容器里的键 */
const KNOWN = {
  crafting: ["evolutionEnergy", "evolutionStone", "linkRope", "hugeBerry", "megaStone"],
  training: ["activeId"],
  pve: ["dualSanctum", "championLeague", "starCorridor", "ecoTriHall", "acrobatShow"],
  dex: ["shiny"],
};
const KNOWN_MON_KEYS = new Set([
  "id", "pid", "dex", "name", "tier", "isShiny", "lvl", "exp", "satiety", "affection", "stars", "nature", "mintTuning", "hallOfFameRibbons", "firstHallOfFameAt", "ivTrainCarry",
  "ability", "veteran", "statKeep", "caughtWith", "buffs", "autoExpCarry", "affectionCarry", "affectionDecayCarry", "affectionHighDecayCarry", "skillCdRemainingSec", "skillActiveType",
  "skillActiveRemainingSec", "baseStats", "iv", "statBonus", "created", "busy",
]);

const at = (obj, path) => path.split(".").reduce((o, k) => (isBox(o) ? o[k] : undefined), obj);

function unknownKeys(raw, isKnown) {
  let out = null;
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || UNSAFE_KEYS.has(k) || isKnown(k)) continue;
    (out ??= {})[k] = v;
  }
  return out;
}

const prestigeOf = (s) => Math.floor(Number(s?.era?.prestigeCount) || 0);

/** 读档最后调用：data 是存档原文，s 是读好的状态 */
export function collectForward(data, s) {
  const bag = { prestige: prestigeOf(s), top: unknownKeys(data, (k) => k in s), boxes: {}, mons: new Map(), foreign: [] };
  for (const [path] of BOXES) {
    const raw = at(data, path);
    if (!isBox(raw)) continue;
    const live = at(s, path);
    const extra = unknownKeys(raw, (k) => (isBox(live) && k in live) || KNOWN[path]?.includes(k));
    if (extra) bag.boxes[path] = extra;
  }
  const rawList = Array.isArray(data.mons?.list) ? data.mons.list : [];
  const liveIds = new Set((s.mons?.list ?? []).map((m) => m.id));
  for (const it of rawList) {
    if (!isBox(it) || typeof it.id !== "number" || !Number.isFinite(it.id)) continue;
    const id = Math.floor(it.id);
    if (liveIds.has(id)) {
      const extra = unknownKeys(it, (k) => KNOWN_MON_KEYS.has(k));
      if (extra) bag.mons.set(id, { created: it.created, extra });
    } else if (typeof it.pid === "string" && it.pid && !it.pid.startsWith("p")) {
      // 新版才有的物种编号：这一版显示不了，但不能丢
      bag.foreign.push(it);
      if (Number.isSafeInteger(id + 1)) s.mons.nextId = Math.max(s.mons.nextId, id + 1); // 超大编号不抬：再加 1 也不变，之后的新编号会全部相同
    }
  }
  if (bag.top || Object.keys(bag.boxes).length || bag.mons.size || bag.foreign.length) bags.set(s, bag);
}

/** 存档时调用：把收着的字段并进要写出去的内容（不改动游戏状态本身）；同名字段以现在的为准 */
export function applyForward(payload, s) {
  const bag = bags.get(s);
  if (!bag) return payload;
  const sameRun = prestigeOf(s) === bag.prestige;
  const out = { ...bag.top, ...payload };
  for (const [path, resets] of BOXES) {
    const extra = bag.boxes[path];
    if (!extra || (resets && !sameRun)) continue;
    const [head, sub] = path.split(".");
    if (sub) out[head] = { ...out[head], [sub]: { ...extra, ...out[head]?.[sub] } };
    else out[head] = { ...extra, ...out[head] };
  }
  if (sameRun && (bag.mons.size || bag.foreign.length) && Array.isArray(out.mons?.list)) {
    const list = out.mons.list.map((m) => {
      const kept = m && bag.mons.get(m.id);
      return kept && kept.created === m.created ? { ...kept.extra, ...m } : m;
    });
    const ids = new Set(list.map((m) => m?.id));
    out.mons = { ...out.mons, list: list.concat(bag.foreign.filter((m) => !ids.has(m.id))) };
  }
  return out;
}
