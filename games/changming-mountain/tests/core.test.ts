import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  armVigil, inscribe, lampCost, move, openTerrace, placeLamp, removeLamp, seat, setFlame, upgradeLamp, wipe,
} from "../src/core/actions.ts";
import { DISCIPLES, FALLOFF, HUES, LAMP_MAX_LEVEL, PATTERNS, SOOT_MAX, TERRACES, TIDE_FIRST, VIGIL_COST } from "../src/core/data.ts";
import { newGame, settleOffline, step, vigilCheck } from "../src/core/engine.ts";
import { DIST, SLOTS, slotAt } from "../src/core/grid.ts";
import { blend, derive } from "../src/core/light.ts";
import { deserialize, serialize } from "../src/core/save.ts";
import type { Flame, GameEvent, GameState } from "../src/core/types.ts";

const at = (t: number, i: number): number => slotAt(t, i)!.id;

function rich(terraces = 3): GameState {
  const s = newGame();
  s.res = { oil: 1e6, star: 1e6, insight: 1e6, wish: 1e6 };
  const events: GameEvent[] = [];
  while (s.terraces < terraces) assert.ok(openTerrace(s, events).ok);
  return s;
}
const lamp = (s: GameState, id: number, flame: Flame): void => assert.ok(placeLamp(s, id, flame).ok);
const run = (s: GameState, n: number): GameEvent[] => {
  const ev: GameEvent[] = [];
  for (let i = 0; i < n; i++) step(s, ev);
  return ev;
};

describe("山台", () => {
  it("邻位关系对称，距离表与邻位一致", () => {
    for (const s of SLOTS) {
      for (const n of s.neighbors) {
        assert.ok(SLOTS[n].neighbors.includes(s.id));
        assert.equal(DIST[s.id][n], 1);
        assert.ok(Math.abs(SLOTS[n].x - s.x) <= 1);
      }
    }
  });
});

describe("光", () => {
  it("随距离衰减，够不着的地方没有光", () => {
    const s = rich(1);
    lamp(s, at(0, 0), "dawn");
    const { field, guard } = derive(s);
    assert.equal(field[at(0, 0)].dawn, FALLOFF[0]);
    assert.equal(field[at(0, 1)].dawn, FALLOFF[1]);
    assert.equal(field[at(0, 2)].dawn, FALLOFF[2]);
    assert.equal(field[at(0, 3)].dawn, 0);
    assert.equal(guard[at(0, 0)], 0, "灯不能自己护自己");
  });

  it("混色由比例决定，越均衡越好", () => {
    assert.equal(blend({ dawn: 0, verdant: 0, frost: 0 }).hue, "dark");
    assert.equal(blend({ dawn: 1, verdant: 0.2, frost: 0 }).hue, "dawn");
    assert.equal(blend({ dawn: 1, verdant: 0.9, frost: 0 }).hue, "spring");
    assert.equal(blend({ dawn: 0, verdant: 1, frost: 1 }).hue, "jade");
    assert.equal(blend({ dawn: 1, verdant: 0, frost: 1 }).hue, "clear");
    assert.equal(blend({ dawn: 1, verdant: 1, frost: 1 }).hue, "white");
    assert.ok(blend({ dawn: 1, verdant: 1, frost: 0 }).amount > blend({ dawn: 1.5, verdant: 0.6, frost: 0 }).amount);
    assert.equal(blend({ dawn: 1, verdant: 0.25, frost: 0 }, 0.2).hue, "spring", "调色的弟子能用较弱的火");
  });

  it("同样的灯，摆法不同产出就不同", () => {
    const build = (a: number, b: number): number => {
      const s = rich(1);
      seat(s, "ayan", at(0, 3));
      lamp(s, a, "dawn");
      lamp(s, b, "verdant");
      const { income } = derive(s);
      return income.oil * 10 + income.insight * 30;
    };
    assert.notEqual(build(at(0, 2), at(0, 4)), build(at(0, 0), at(0, 4)));
  });

  it("没修好的山台照不到", () => {
    const s = rich(1);
    lamp(s, at(0, 3), "dawn");
    assert.equal(derive(s).field[at(1, 2)].dawn, 0);
  });

  it("没有任何资源出自未知光色", () => {
    for (const h of Object.values(HUES)) for (const k of Object.keys(h.yields)) assert.ok(["oil", "star", "insight", "wish"].includes(k));
  });
});

describe("灯谱", () => {
  const shapes: Record<string, (s: GameState) => void> = {
    line: (s) => [1, 2, 3].forEach((i) => lamp(s, at(0, i), "dawn")),
    tripod: (s) => {
      lamp(s, at(0, 2), "dawn");
      lamp(s, at(0, 3), "verdant");
      lamp(s, at(1, 2), "frost");
    },
    facing: (s) => {
      seat(s, "ayan", at(0, 3));
      lamp(s, at(0, 2), "dawn");
      lamp(s, at(0, 4), "dawn");
    },
    stairs: (s) => {
      lamp(s, at(0, 3), "frost");
      lamp(s, at(1, 3), "frost");
      lamp(s, at(2, 3), "frost");
    },
  };
  for (const p of PATTERNS) {
    it(`「${p.name}」摆出来才会被发现，记下后才生效`, () => {
      const s = rich();
      assert.equal(inscribe(s, p.id, []).ok, false);
      shapes[p.id](s);
      const events = run(s, 1);
      assert.ok(events.some((e) => e.type === "patternSeen" && e.id === p.id));
      const before = derive(s);
      const joined: GameEvent[] = [];
      assert.ok(inscribe(s, p.id, joined).ok);
      assert.ok(joined.some((e) => e.type === "joined" && e.id === "tingshuang"), "记下第一张灯谱，听霜上山");
      const after = derive(s);
      const sum = (f: typeof before.field): number => f.reduce((n, t) => n + t.dawn + t.verdant + t.frost, 0);
      if (p.id === "stairs") assert.ok(after.upkeep < before.upkeep);
      else if (p.id === "facing") assert.ok(after.seats[0].factor > before.seats[0].factor);
      else assert.ok(sum(after.field) > sum(before.field));
    });
  }
});

describe("长夜潮", () => {
  it("孤灯会积灰，但不会丢；烟灰有上限，也会慢慢散", () => {
    const s = rich(1);
    lamp(s, at(0, 0), "dawn");
    const events = run(s, TIDE_FIRST + 25);
    assert.ok(events.some((e) => e.type === "tideEnd" && !e.held));
    const soot = s.lamps[at(0, 0)]!.soot;
    assert.ok(soot > 0 && soot <= SOOT_MAX);
    run(s, 100);
    assert.ok(s.lamps[at(0, 0)]!.soot < soot);
    run(s, 3600 * 3);
    assert.ok(s.lamps[at(0, 0)]!.soot <= SOOT_MAX);
  });

  it("灯互相照着就不积灰，守住一夜得愿", () => {
    const s = rich(2);
    s.res.wish = 0;
    for (const id of [at(0, 2), at(0, 3), at(0, 4), at(1, 2), at(1, 3)]) lamp(s, id, "dawn");
    const events = run(s, TIDE_FIRST + 25);
    const end = events.find((e) => e.type === "tideEnd");
    assert.ok(end && end.type === "tideEnd" && end.held && end.wish > 0);
    assert.ok(s.lamps.every((l) => !l || l.soot === 0));
  });

  it("涨潮时不能挪灯、换火、换座", () => {
    const s = rich(1);
    lamp(s, at(0, 1), "dawn");
    run(s, TIDE_FIRST);
    assert.equal(s.tide.phase, "surge");
    assert.equal(move(s, at(0, 1), at(0, 2)).ok, false);
    assert.equal(setFlame(s, at(0, 1), "frost").ok, false);
    assert.equal(seat(s, "ayan", at(0, 3)).ok, false);
  });

  it("拂灰", () => {
    const s = rich(1);
    lamp(s, at(0, 0), "dawn");
    assert.equal(wipe(s, at(0, 0)).ok, false);
    s.lamps[at(0, 0)]!.soot = 0.5;
    assert.ok(wipe(s, at(0, 0)).ok);
    assert.ok(Math.abs(s.lamps[at(0, 0)]!.soot - 0.3) < 1e-9);
  });
});

/** 左青、中晨、右霜的一个守夜灯阵，座位由测试逐个试出来。 */
function vigilBoard(): GameState {
  const s = rich();
  s.inscribed = [];
  const lamps: [number, number, Flame][] = [
    [0, 1, "verdant"], [0, 3, "dawn"], [0, 5, "frost"],
    [1, 0, "verdant"], [1, 2, "verdant"], [1, 3, "frost"], [1, 5, "frost"],
    [2, 1, "dawn"], [2, 3, "dawn"],
  ];
  for (const [t, i, f] of lamps) lamp(s, at(t, i), f);
  return s;
}

describe("守夜与境界", () => {
  it("条件不满足时守夜失败，灯和愿都不丢", () => {
    const s = rich();
    s.res.wish = VIGIL_COST + 1;
    lamp(s, at(0, 0), "dawn");
    assert.ok(armVigil(s, true).ok);
    const events = run(s, TIDE_FIRST + 25);
    assert.ok(events.some((e) => e.type === "vigilFailed"));
    assert.equal(s.realm, 0);
    assert.ok(s.res.wish >= VIGIL_COST + 1);
    assert.equal(s.vigil.armed, false);
  });

  it("存在能守住的布阵，守住就突破，结果确定", () => {
    const s = vigilBoard();
    const joined: GameEvent[] = [];
    // 中间的晨、青、霜三盏两两相邻，正是「鼎足」；守夜要有一张灯谱生效。
    s.seen = ["tripod"];
    inscribe(s, "tripod", joined);
    const free = SLOTS.filter((x) => !s.lamps[x.id]).map((x) => x.id);
    let solved = false;
    search: for (const a of free) for (const b of free) for (const c of free) for (const d of free) {
      if (new Set([a, b, c, d]).size < 4) continue;
      [a, b, c, d].forEach((slot, i) => (s.disciples[i].slot = slot));
      if (vigilCheck(s, derive(s)).ok) {
        solved = true;
        break search;
      }
    }
    assert.ok(solved, "这个布阵应当能守夜");
    assert.ok(armVigil(s, true).ok);
    const events = run(s, TIDE_FIRST + 25);
    assert.ok(events.some((e) => e.type === "realm" && e.realm === 1));
    assert.equal(armVigil(s, true).ok, false);
  });

  it("愿不够不能约守夜", () => {
    const s = rich();
    s.res.wish = VIGIL_COST - 1;
    assert.equal(armVigil(s, true).ok, false);
  });
});

describe("经济", () => {
  it("拆灯再点不赚油", () => {
    const s = rich(1);
    const before = s.res.oil;
    for (let i = 0; i < 5; i++) {
      lamp(s, at(0, 0), "dawn");
      removeLamp(s, at(0, 0));
    }
    assert.ok(s.res.oil < before);
  });

  it("油烧光时灯变暗但不灭，拆灯能恢复", () => {
    const s = rich(1);
    for (let i = 0; i < 7; i++) {
      lamp(s, i, "frost");
      for (let l = 1; l < LAMP_MAX_LEVEL; l++) assert.ok(upgradeLamp(s, i).ok);
    }
    s.res.oil = 0;
    run(s, 60);
    assert.ok(s.fuel >= 0.5 && s.fuel < 1);
    assert.equal(s.res.oil, 0);
    for (let i = 0; i < 6; i++) removeLamp(s, i);
    run(s, 60);
    assert.equal(s.fuel, 1);
    assert.ok(s.res.oil > 0);
  });

  it("灯越多越贵，山台修不出界", () => {
    const s = rich(1);
    const a = lampCost(s).oil!;
    lamp(s, 0, "dawn");
    assert.ok(lampCost(s).oil! > a);
    const t = rich(TERRACES.length);
    assert.equal(openTerrace(t, []).ok, false);
    assert.equal(t.disciples.length, 3);
    assert.ok(t.disciples.every((d) => DISCIPLES.some((x) => x.id === d.id)));
  });
});

describe("离线与存档", () => {
  const board = (): GameState => {
    const s = rich(2);
    seat(s, "ayan", at(0, 3));
    for (const id of [at(0, 2), at(0, 4), at(1, 2), at(1, 3)]) lamp(s, id, "dawn");
    return s;
  };

  it("第一次黑潮结束前，离线与在线逐位一致", () => {
    const a = board();
    const b = board();
    run(a, TIDE_FIRST + 20);
    settleOffline(b, TIDE_FIRST + 20);
    assert.deepEqual(a, b);
  });

  it("分两次离线与一次离线结果一致（同在首次黑潮内）", () => {
    const a = board();
    const b = board();
    settleOffline(a, 200);
    settleOffline(b, 120);
    settleOffline(b, 80);
    assert.deepEqual(a, b);
  });

  it("离线最多 8 小时，只有第一次黑潮积灰", () => {
    const s = rich(1);
    lamp(s, at(0, 0), "dawn");
    const r = settleOffline(s, 100 * 3600);
    assert.equal(r.seconds, 8 * 3600);
    assert.ok(r.nights > 100);
    assert.equal(s.lamps[at(0, 0)]!.soot, 0, "后面的黑潮不积灰，第一次的灰早散完了");
  });

  it("存档往返一致", () => {
    const s = board();
    run(s, 500);
    const r = deserialize(serialize(s));
    assert.ok(r.ok);
    assert.deepEqual(r.ok && r.state, s);
  });

  it("坏存档会被认出来", () => {
    const text = serialize(board());
    assert.equal(deserialize("你好").ok, false);
    assert.equal(deserialize(text.slice(0, -5)).ok, false);
    assert.equal(deserialize(text.replace('"oil":', '"oil":9')).ok, false);
    assert.equal(deserialize(text.replace(/^CM\d+/, "CM999")).ok, false);
  });

  it("字段异常时退回安全值，不带出越界状态", () => {
    const s = board() as unknown as Record<string, unknown>;
    s.res = { oil: -5, star: null, insight: 1e999, wish: "x" };
    s.terraces = 99;
    s.lamps = [{ flame: "nope" }, { flame: "dawn", level: 99, soot: 9 }];
    s.disciples = [{ id: "ayan", slot: 1 }, { id: "stranger", slot: 2 }];
    const r = deserialize(serialize(s as unknown as GameState));
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.ok(Object.values(r.state.res).every((v) => Number.isFinite(v) && v >= 0));
    assert.equal(r.state.terraces, TERRACES.length);
    assert.equal(r.state.lamps[0], null);
    assert.equal(r.state.lamps[1]!.level, LAMP_MAX_LEVEL);
    assert.equal(r.state.disciples.length, 1);
    assert.equal(r.state.disciples[0].slot, null, "灯占着的位置不能坐人");
  });
});
