import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inscribe, lampCount, move, openTerrace, placeLamp, removeLamp, removeRefund, seat, setFlame, upgradeCost, upgradeLamp } from "../src/core/actions.ts";
import { DISCIPLES, FIRST_STAR, FLAME_IDS, HOLD_LAMPS, PATTERNS, REFUND, TERRACES, TIDE_FIRST, VIGIL_COST } from "../src/core/data.ts";
import { exposedLamps, newGame, settleOffline, step, vigilCheck } from "../src/core/engine.ts";
import { SLOTS, slotAt } from "../src/core/grid.ts";
import { guide, shiftWeak, tryMove } from "../src/core/guide.ts";
import { derive } from "../src/core/light.ts";
import { offlineNotes } from "../src/core/report.ts";
import { deserialize, serialize } from "../src/core/save.ts";
import type { Flame, GameEvent, GameState } from "../src/core/types.ts";
import { ClickGate } from "../src/ui/clicks.ts";
import { WallClock } from "../src/ui/wallclock.ts";

const at = (t: number, i: number): number => slotAt(t, i)!.id;
const run = (s: GameState, n: number): GameEvent[] => {
  const ev: GameEvent[] = [];
  for (let i = 0; i < n; i++) step(s, ev);
  return ev;
};
function rng(seed: number): (n: number) => number {
  let s = seed >>> 0;
  return (n) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return Math.floor((s / 4294967296) * n);
  };
}
const put = (s: GameState, id: number, flame: Flame, level = 1): void => {
  s.lamps[id] = { flame, level, soot: 0 };
};

/** 照提示做一步；做不下去返回 false。 */
function obey(s: GameState, pick: (list: Flame[]) => Flame): boolean {
  const d = derive(s);
  const g = guide(s, d);
  if (!g || g.slot === null) return false;
  if (g.step === "seat") return seat(s, "ayan", g.slot).ok;
  if (g.from !== null) return move(s, g.from, g.slot).ok;
  if (g.step === "lamp") return placeLamp(s, g.slot, g.flame!).ok;
  const now = d.seats.find((x) => x.disciple === g.who)?.hue;
  return placeLamp(s, g.slot, pick(FLAME_IDS.filter((f) => g.step !== "mix" || f !== now))).ok;
}

describe("新手提示的岔路", () => {
  it("先乱点一通再照提示，总能走完，第一夜守得住", () => {
    const flames: (Flame | null)[] = [null, "dawn", "verdant", "frost"];
    let tried = 0;
    // 底层七个灯位的摆法每隔十一种取一种，人在每个空位或没入座。
    for (let code = 0; code < 4 ** 7; code += 11) {
      const lamps = Array.from({ length: 7 }, (_, i) => flames[Math.floor(code / 4 ** i) % 4]);
      if (lamps.filter(Boolean).length > 5) continue;
      for (let a = -1; a < 7; a += 2) {
        if (a >= 0 && lamps[a]) continue;
        const s = newGame();
        s.res.oil = 1000;
        lamps.forEach((f, i) => f && put(s, i, f));
        if (a >= 0) s.disciples[0].slot = a;
        for (let k = 0; k < 14 && obey(s, (list) => list[0]); k++);
        const d = derive(s);
        const where = `${lamps.map((f) => f?.[0] ?? "-").join("")} 人在 ${a}`;
        assert.equal(guide(s, d), null, where);
        assert.equal(exposedLamps(s, d).length, 0, where);
        assert.ok(lampCount(s) >= HOLD_LAMPS, where);
        tried += 1;
      }
    }
    assert.ok(tried > 1000);
  });

  it("中途换火、拆灯、离座、多来一名弟子，提示跟着退回去，不会卡住", () => {
    const pick = rng(99);
    for (let n = 0; n < 1500; n++) {
      const s = newGame();
      s.res.oil = 1000;
      for (let i = pick(6); i > 0; i--) put(s, pick(7), FLAME_IDS[pick(3)], 1 + (pick(4) === 0 ? 1 : 0));
      if (pick(2)) s.disciples.push({ id: "tingshuang", slot: null, xp: 0, level: 1 });
      if (pick(3) === 0) s.terraces = 2;
      for (const d of s.disciples) {
        const to = pick(7);
        if (pick(2) && !s.lamps[to] && !s.disciples.some((x) => x.slot === to)) d.slot = to;
      }
      for (let k = 0; k < 20; k++) {
        if (!obey(s, (list) => list[pick(list.length)])) break;
        const lit = s.lamps.flatMap((l, id) => (l ? [id] : []));
        if (k > 8 || pick(4) || !lit.length) continue;
        const id = lit[pick(lit.length)];
        [(): unknown => setFlame(s, id, FLAME_IDS[pick(3)]), (): unknown => removeLamp(s, id), (): unknown => seat(s, "ayan", null)][pick(3)]();
      }
      assert.equal(guide(s, derive(s)), null, `第 ${n} 局`);
      assert.equal(exposedLamps(s, derive(s)).length, 0, `第 ${n} 局`);
    }
  });

  it("指的灯位被占了就换一处，灯位占满时不给落不下的提示", () => {
    const s = newGame();
    s.res.oil = 1000;
    seat(s, "ayan", at(0, 3));
    const first = guide(s, derive(s))!;
    put(s, first.slot!, "frost");
    const next = guide(s, derive(s))!;
    assert.notEqual(next.slot, first.slot);
    assert.equal(s.lamps[next.slot!], null);
    const full = newGame();
    for (let i = 0; i < 7; i++) put(full, at(0, i), "dawn");
    assert.deepEqual(guide(full, derive(full)), { step: "seat", slot: null, flame: null, who: null, from: null });
  });

  it("混不出色、添不起灯时跳过这一步，先教后面的", () => {
    // 人在山边，旁边松下的青火太亮，隔一位的晨火混不进来。
    const s = newGame();
    s.res.oil = 1000;
    seat(s, "ayan", at(0, 0));
    put(s, at(0, 1), "verdant");
    assert.equal(guide(s, derive(s))?.step, "third");
    // 五盏同色灯，第六盏要星屑。
    const t = newGame();
    t.res.oil = 1000;
    seat(t, "ayan", at(0, 6));
    for (const i of [0, 1, 2, 3, 5]) put(t, at(0, i), "dawn");
    const g = guide(t, derive(t))!;
    assert.equal(g.step, "cover");
    assert.notEqual(g.from, null, "添不起就说挪哪盏");
    t.res.star = FIRST_STAR;
    assert.equal(guide(t, derive(t))?.step, "mix");
  });

  it("教挪的那一步真能少露一盏，也不把弟子换进黑处", () => {
    const s = newGame();
    seat(s, "ayan", at(0, 2));
    for (const i of [0, 1]) put(s, at(0, i), "dawn");
    for (const i of [3, 4]) put(s, at(0, i), "verdant");
    const weak = exposedLamps(s, derive(s));
    const m = shiftWeak(s, weak)!;
    assert.ok(weak.includes(m.from));
    const trial = tryMove(s, m.from, m.to)!;
    assert.ok(trial.exposed.length < weak.length);
    assert.ok(trial.d.seats.every((x) => x.hue !== "dark"));
  });

  it("守住过一夜、弟子也修行过，就再也不出现，怎么倒腾都不出现", () => {
    const s = newGame();
    s.res.oil = 1000;
    while (obey(s, (list) => list[0]));
    run(s, TIDE_FIRST + 25);
    assert.equal(s.nightsHeld, 1);
    const pick = rng(7);
    for (let n = 0; n < 300; n++) {
      const id = pick(7);
      [(): unknown => setFlame(s, id, FLAME_IDS[pick(3)]), (): unknown => removeLamp(s, id), (): unknown => placeLamp(s, id, FLAME_IDS[pick(3)]), (): unknown => move(s, id, pick(7)), (): unknown => seat(s, "ayan", pick(2) ? null : id)][pick(5)]();
      assert.equal(guide(s, derive(s)), null);
    }
  });

  it("守住了却从没坐过人，还是请人入座", () => {
    const s = newGame();
    for (const i of [2, 3, 4]) put(s, at(0, i), "dawn");
    run(s, TIDE_FIRST + 25);
    assert.equal(s.nightsHeld, 1);
    assert.equal(guide(s, derive(s))?.step, "seat");
  });

  it("旧存档读进来接着教该教的；教完的存档不再教", () => {
    const s = newGame();
    s.res.oil = 1000;
    const steps: string[] = [];
    for (let k = 0; k < 10; k++) {
      const r = deserialize(serialize(s));
      assert.ok(r.ok);
      assert.deepEqual(guide(r.state, derive(r.state)), guide(s, derive(s)));
      steps.push(guide(s, derive(s))?.step ?? "");
      if (!obey(s, (list) => list[0])) break;
    }
    assert.deepEqual(steps, ["seat", "lamp", "mix", "third", ""]);
    // 没有新字段的旧档：守过夜、弟子有经验。
    const old = JSON.parse(JSON.stringify(s)) as GameState;
    old.nights = old.nightsHeld = 3;
    old.disciples[0] = { id: "ayan", slot: null, xp: 2, level: 1 };
    const r = deserialize(serialize(old));
    assert.ok(r.ok && guide(r.state, derive(r.state)) === null);
  });
});

describe("守夜总有解", () => {
  const score = (s: GameState): number => {
    const c = vigilCheck(s, derive(s));
    return c.ok ? 100 : (c.pattern ? 12 : 0) + Math.min(3, c.hues.length) * 10 - c.exposed.length * 6;
  };
  /** 只挪、只换火（都不花钱），看能不能摆到守夜三条都满足。 */
  function solvable(pattern: string, lamps: number, people: number): boolean {
    for (let seed = 1; seed <= 12; seed++) {
      const pick = rng(seed * 7919 + lamps);
      let s = newGame();
      s.terraces = TERRACES.length;
      s.inscribed = [pattern];
      s.tide.index = 99;
      s.disciples = DISCIPLES.slice(0, people).map((d, i) => ({ id: d.id, slot: SLOTS.length - 1 - i, xp: 0, level: 1 }));
      for (let i = 0; i < lamps; i++) put(s, i, FLAME_IDS[i % 3]);
      let here = score(s);
      for (let i = 0; i < 2500; i++) {
        if (here >= 100) return true;
        const t = structuredClone(s);
        if (pick(5) < 2) setFlame(t, pick(SLOTS.length), FLAME_IDS[pick(3)]);
        else move(t, pick(SLOTS.length), pick(SLOTS.length));
        const v = score(t);
        if (v < here && pick(1e6) / 1e6 >= Math.exp((v - here) / (8 * (1 - i / 2500) + 0.2))) continue;
        s = t;
        here = v;
      }
    }
    return false;
  }
  for (const p of PATTERNS) {
    it(`潮压到顶、灯都是一级、只记了「${p.name}」：五盏灯三个人、灯位全满都摆得出`, () => {
      assert.ok(solvable(p.id, 5, 3), "五盏三人");
      assert.ok(solvable(p.id, SLOTS.length - 4, 4), "全满");
    });
  }

  it("记下灯谱、修好第三层之后，至少有四名弟子", () => {
    const s = newGame();
    s.res = { oil: 1e6, star: 1e6, insight: 1e6, wish: VIGIL_COST };
    while (openTerrace(s, []).ok);
    s.seen = ["line"];
    inscribe(s, "line", []);
    assert.equal(s.disciples.length, 4);
  });
});

describe("拆灯不能套利", () => {
  it("点、升、拆的每一步，手里的加上投入的一半都不变多；同一局面怎么绕回来都不更富", () => {
    const worth = (s: GameState): { oil: number; star: number } => {
      const w = { oil: s.res.oil, star: s.res.star };
      const n = lampCount(s);
      for (let i = 0; i < n; i++) {
        w.oil += Math.round(8 * 1.32 ** i) * REFUND;
        if (i >= 5) w.star += Math.round(2 * 1.3 ** (i - 5)) * REFUND;
      }
      for (const l of s.lamps) for (let k = 1; k < (l?.level ?? 1); k++) {
        w.oil += upgradeCost(k).oil! * REFUND;
        w.star += upgradeCost(k).star! * REFUND;
      }
      return w;
    };
    const key = (s: GameState): string => s.lamps.flatMap((l) => (l ? [l.level] : [])).sort().join("");
    const start = newGame();
    start.res = { oil: 1e7, star: 1e7, insight: 0, wish: 0 };
    const richest = new Map([["", start.res]]);
    let frontier = [start];
    while (frontier.length) {
      const next: GameState[] = [];
      for (const s of frontier) {
        const ids = s.lamps.flatMap((l, id) => (l ? [id] : []));
        const free = s.lamps.findIndex((l) => !l);
        const ops: ((t: GameState) => { ok: boolean })[] = ids.length < 7 ? [(t): { ok: boolean } => placeLamp(t, free, "dawn")] : [];
        for (const id of ids) ops.push((t) => removeLamp(t, id), (t) => upgradeLamp(t, id));
        for (const op of ops) {
          const t = structuredClone(s);
          if (!op(t).ok) continue;
          const [a, b] = [worth(s), worth(t)];
          assert.ok(b.oil <= a.oil + 1e-6 && b.star <= a.star + 1e-6, `${key(s)} -> ${key(t)}`);
          const known = richest.get(key(t));
          if (known) assert.ok(t.res.oil <= known.oil && t.res.star <= known.star, `绕回 ${key(t)} 更富`);
          else {
            richest.set(key(t), t.res);
            next.push(t);
          }
        }
      }
      frontier = next;
    }
    assert.ok(richest.size > 700);
  });

  it("换火、挪动不改退多少", () => {
    const s = newGame();
    s.res = { oil: 1e6, star: 1e6, insight: 0, wish: 0 };
    for (const i of [1, 3, 5]) placeLamp(s, at(0, i), "dawn");
    upgradeLamp(s, at(0, 3));
    const back = removeRefund(s, at(0, 3));
    setFlame(s, at(0, 3), "frost");
    assert.deepEqual(removeRefund(s, at(0, 3)), back);
    move(s, at(0, 3), at(0, 1));
    assert.deepEqual(removeRefund(s, at(0, 1)), back);
    assert.deepEqual(removeRefund(s, at(0, 6)), {});
  });
});

describe("首份星屑", () => {
  it("离线跨过首夜会说一句；守过夜的旧档、读档重来都不再给", () => {
    const s = newGame();
    const notes = offlineNotes(settleOffline(s, TIDE_FIRST + 60));
    assert.ok(notes.includes(`潮退处落下星屑 ${FIRST_STAR}`));
    const r = deserialize(serialize(s));
    assert.ok(r.ok);
    run(r.state, 1000);
    assert.equal(r.state.res.star, FIRST_STAR);
    const old = newGame();
    old.nights = 1;
    settleOffline(old, 3600);
    assert.equal(old.res.star, 0);
  });

  it("涨潮当中存了档再读，也只给一次", () => {
    const s = newGame();
    run(s, TIDE_FIRST + 10);
    assert.equal(s.tide.phase, "surge");
    const r = deserialize(serialize(s));
    assert.ok(r.ok);
    run(r.state, 600);
    assert.equal(r.state.res.star, FIRST_STAR);
  });
});

describe("守夜当中离开", () => {
  it("涨潮当中切走再回来，和一直看着逐位一样", () => {
    const board = (): GameState => {
      const s = newGame();
      s.res = { oil: 1000, star: 0, insight: 0, wish: VIGIL_COST };
      seat(s, "ayan", at(0, 3));
      for (const i of [1, 2, 4]) put(s, at(0, i), "dawn");
      s.vigil.armed = true;
      run(s, TIDE_FIRST + 5);
      assert.ok(s.tide.phase === "surge" && s.vigil.armed);
      return s;
    };
    const [a, b] = [board(), board()];
    const events = run(a, 100);
    const report = settleOffline(b, 100);
    assert.deepEqual(a, b);
    assert.deepEqual(report.events, events);
    assert.equal(a.vigil.armed, false);
    assert.equal(a.res.wish >= VIGIL_COST, true, "没守成不扣愿");
  });
});

describe("钟表", () => {
  it("每帧往前走，停了五秒以上才要补", () => {
    const c = new WallClock(0, false);
    assert.equal(c.frame(16), 0);
    assert.equal(c.frame(4000), 0);
    assert.equal(c.frame(4000 + 3600e3), 3600);
    assert.equal(c.frame(4016 + 3600e3), 0);
  });

  it("藏着时不走，回来一次补齐；后台偶尔跑一帧也不重复", () => {
    const c = new WallClock(0, false);
    c.frame(1000);
    c.hide();
    for (let t = 2000; t <= 90e3; t += 1000) assert.equal(c.frame(t), 0);
    assert.equal(c.at, 1000, "存档记的是藏起来的那一刻");
    assert.equal(c.show(91e3), 90);
    assert.equal(c.frame(91016), 0);
    assert.equal(c.show(92e3), 0, "没藏过就不补");
  });

  it("睡着醒来先报藏、再报显，睡着的那段不丢也不重复", () => {
    const c = new WallClock(0, false);
    c.frame(1000);
    const wake = 1000 + 7200e3;
    c.hide();
    assert.equal(c.at, 1000);
    assert.equal(c.show(wake + 3000), 7203);
    assert.equal(c.frame(wake + 3016), 0);
  });

  it("一打开就在后台，从打开那一刻算起", () => {
    const c = new WallClock(5000, true);
    assert.equal(c.frame(9000), 0);
    assert.equal(c.show(65e3), 60);
  });

  it("钟往回拨不倒扣，也不会补出一大段", () => {
    const c = new WallClock(3600e3, false);
    assert.equal(c.frame(0), 0);
    assert.equal(c.frame(16), 0);
    c.hide();
    assert.equal(c.show(-60e3), 0);
    assert.equal(c.frame(-59.9e3), 0);
  });
});

describe("双击保护", () => {
  it("原处的第二下不算，马上点别处算", () => {
    const g = new ClickGate();
    assert.ok(g.pass(0, 100, 100));
    assert.equal(g.pass(120, 103, 98), false, "同一处双击");
    assert.ok(g.pass(150, 200, 100), "旁边另一个按钮");
    assert.equal(g.pass(200, 202, 101), false);
    assert.ok(g.pass(460, 202, 101));
  });
});
