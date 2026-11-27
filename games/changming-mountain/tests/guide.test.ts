import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  armVigil, inscribe, lampCost, move, openTerrace, placeLamp, removeLamp, removeRefund, seat, shortage, upgradeCost,
  upgradeLamp,
} from "../src/core/actions.ts";
import { FIRST_STAR, FLAME_IDS, HOLD_LAMPS, LAMP_MAX_LEVEL, RESOURCES, TIDE_BASE, TIDE_DEPTH, TIDE_FIRST, TIDE_GROWTH, VIGIL_COST } from "../src/core/data.ts";
import { exposedLamps, newGame, settleOffline, step, tidePressure, vigilCheck } from "../src/core/engine.ts";
import { SLOTS, arrowTarget, slotAt } from "../src/core/grid.ts";
import { bestSeat, coverSlot, guide, noSource, tryMove } from "../src/core/guide.ts";
import { derive } from "../src/core/light.ts";
import { awayKind, nightText, offlineNotes } from "../src/core/report.ts";
import { deserialize, serialize } from "../src/core/save.ts";
import type { Flame, GameEvent, GameState } from "../src/core/types.ts";
import { ClickGate } from "../src/ui/clicks.ts";

const at = (t: number, i: number): number => slotAt(t, i)!.id;
const run = (s: GameState, n: number): GameEvent[] => {
  const ev: GameEvent[] = [];
  for (let i = 0; i < n; i++) step(s, ev);
  return ev;
};
const night = (s: GameState): Extract<GameEvent, { type: "tideEnd" }> => {
  const e = run(s, TIDE_FIRST + 25).find((x) => x.type === "tideEnd");
  assert.ok(e?.type === "tideEnd");
  return e;
};
const net = (s: GameState): number => {
  const d = derive(s);
  return d.income.oil - d.upkeep;
};

/** 照新手提示走完，每步隔八秒，mix、third 是玩家在那两步挑的火。 */
function taught(mix: Flame, third: Flame): { s: GameState; steps: string[]; nets: number[] } {
  const s = newGame();
  const steps: string[] = [];
  const nets = [net(s)];
  for (let i = 0; i < 10; i++) {
    const g = guide(s, derive(s));
    if (!g) break;
    steps.push(g.step);
    assert.notEqual(g.slot, null);
    const r =
      g.step === "seat" ? seat(s, "ayan", g.slot)
      : placeLamp(s, g.slot!, g.step === "mix" ? mix : g.step === "third" ? third : g.flame!);
    assert.ok(r.ok, g.step);
    nets.push(net(s));
    run(s, 8);
  }
  return { s, steps, nets };
}

describe("新手提示", () => {
  for (const mix of ["dawn", "frost"] as Flame[]) {
    for (const third of FLAME_IDS) {
      it(`照着摆能守住第一夜（换${mix}，第三盏${third}）`, () => {
        const { s, steps } = taught(mix, third);
        assert.deepEqual(steps, ["seat", "lamp", "mix", "third"]);
        assert.equal(exposedLamps(s, derive(s)).length, 0);
        const e = night(s);
        assert.ok(e.held && e.wish > 0);
        assert.ok(s.lamps.every((l) => !l || l.soot === 0));
      });
    }
  }

  it("人居中、两灯夹人：两盏都挡得住第一夜，但不足三盏不算守住", () => {
    const s = newGame();
    seat(s, "ayan", at(0, 3));
    placeLamp(s, at(0, 2), "dawn");
    placeLamp(s, at(0, 4), "verdant");
    assert.equal(exposedLamps(s, derive(s)).length, 0);
    const e = night(s);
    assert.equal(e.held, false);
    assert.equal(nightText(e), `只有 2 盏灯，${HOLD_LAMPS} 盏起才守得住`);
  });

  it("只轻了第一夜，第二夜起的强度照旧", () => {
    const id = at(0, 2);
    assert.ok(tidePressure(0, id) < TIDE_BASE * TIDE_DEPTH[2]);
    for (let n = 1; n < 5; n++) assert.equal(tidePressure(n, id), (TIDE_BASE + TIDE_GROWTH * n) * TIDE_DEPTH[2]);
  });

  it("头三步灯油净收不降，四步下来比开局多", () => {
    for (const mix of ["dawn", "frost"] as Flame[]) {
      const { nets } = taught(mix, "verdant");
      for (let i = 1; i <= 3; i++) assert.ok(nets[i] >= nets[i - 1] - 1e-9, `${mix} 第 ${i} 步 ${nets[i - 1]} -> ${nets[i]}`);
      assert.ok(nets.at(-1)! > nets[0]);
    }
  });

  it("自己先点了灯，提示跟着变；从中间三格开始也守得住", () => {
    for (const i of [2, 3, 4]) {
      for (const f of FLAME_IDS) {
        const s = newGame();
        s.res.oil = 200;
        placeLamp(s, at(0, i), f);
        for (let k = 0; k < 6; k++) {
          const g = guide(s, derive(s));
          if (!g) break;
          if (g.step === "seat") seat(s, "ayan", g.slot);
          else placeLamp(s, g.slot!, g.flame!);
        }
        assert.ok(night(s).held, `${i} ${f}`);
      }
    }
  });

  it("有灯露着就提醒补，守住过一夜就不再啰嗦", () => {
    const s = newGame();
    s.res.oil = 500;
    seat(s, "ayan", at(0, 3));
    placeLamp(s, at(0, 2), "verdant");
    placeLamp(s, at(0, 4), "dawn");
    placeLamp(s, at(0, 0), "dawn");
    const g = guide(s, derive(s));
    assert.equal(g?.step, "cover");
    s.nightsHeld = 1;
    assert.equal(guide(s, derive(s)), null);
  });

  it("入座挑光最足的空位", () => {
    const s = newGame();
    assert.equal(bestSeat(s), at(0, 3));
    placeLamp(s, at(0, 1), "dawn");
    assert.ok([at(0, 0), at(0, 2)].includes(bestSeat(s)!));
  });
});

describe("防潮", () => {
  it("升自己挡不了潮，旁边添一盏才行", () => {
    const s = newGame();
    s.res = { oil: 1e5, star: 1e5, insight: 0, wish: 0 };
    s.tide.index = 2;
    seat(s, "ayan", at(0, 3));
    placeLamp(s, at(0, 2), "dawn");
    placeLamp(s, at(0, 4), "verdant");
    assert.ok(exposedLamps(s, derive(s)).includes(at(0, 2)));
    while (upgradeLamp(s, at(0, 2)).ok);
    assert.ok(exposedLamps(s, derive(s)).includes(at(0, 2)), "升满了还是挡不住");
    const beside = coverSlot(s, at(0, 2));
    assert.notEqual(beside, null);
    placeLamp(s, beside!, "dawn");
    assert.ok(!exposedLamps(s, derive(s)).includes(at(0, 2)));
  });

  it("最外头添了也没用时说往里挪", () => {
    const s = newGame();
    s.res.oil = 500;
    s.tide.index = 5;
    seat(s, "ayan", at(0, 1));
    placeLamp(s, at(0, 0), "dawn");
    assert.equal(coverSlot(s, at(0, 0)), null);
  });

  it("没守住时说对原因", () => {
    assert.equal(nightText(night(newGame())), "山上没有灯，黑潮漫过去了");
    const s = newGame();
    s.res.oil = 500;
    for (const i of [0, 3, 6]) placeLamp(s, at(0, i), "dawn");
    const e = night(s);
    assert.equal(e.held, false);
    assert.ok(e.breached >= 2 && e.soot > 0.1);
    assert.equal(nightText(e), `${e.breached} 盏灯没挡住，蒙灰 ${Math.round(e.soot * 100)}%`);
    assert.equal(nightText({ ...e, soot: 0.006 }), `${e.breached} 盏灯没挡住，还好没积灰`);
  });

  it("守夜没成说断在哪条，愿不扣", () => {
    const s = newGame();
    s.res.wish = VIGIL_COST;
    s.res.oil = 500;
    for (const i of [0, 6]) placeLamp(s, at(0, i), "dawn");
    assert.ok(armVigil(s, true).ok);
    const e = run(s, TIDE_FIRST + 25).find((x) => x.type === "vigilFailed");
    assert.ok(e?.type === "vigilFailed" && e.reason.includes("2 盏灯挡不住"));
    assert.ok(s.res.wish >= VIGIL_COST);
  });

  it("守夜要有一张记下的灯谱正摆着，只摆没记不算", () => {
    const s = newGame();
    s.res = { oil: 1e6, star: 1e6, insight: 1e6, wish: 0 };
    const ev: GameEvent[] = [];
    while (openTerrace(s, ev).ok);
    for (const i of [2, 3, 4]) placeLamp(s, at(0, i), "dawn");
    run(s, 1);
    assert.equal(vigilCheck(s, derive(s)).pattern, false);
    assert.ok(inscribe(s, "line", ev).ok);
    assert.equal(vigilCheck(s, derive(s)).pattern, true);
    move(s, at(0, 3), at(0, 6));
    assert.equal(vigilCheck(s, derive(s)).pattern, false);
  });
});

describe("东西从哪来", () => {
  it("第一次黑潮退去必得一份星屑，只给一次，在线离线一样", () => {
    const s = newGame();
    const first = night(s);
    assert.equal(first.star, FIRST_STAR);
    assert.equal(s.res.star, FIRST_STAR);
    const later = run(s, 1200).filter((x) => x.type === "tideEnd");
    assert.ok(later.length >= 5 && later.every((x) => x.type === "tideEnd" && x.star === 0));
    const t = newGame();
    settleOffline(t, 3600);
    assert.equal(t.res.star, FIRST_STAR);
  });

  it("那一份够点第六、七盏灯，也够升一次灯", () => {
    const s = newGame();
    s.res.oil = 1e6;
    for (let i = 0; i < 5; i++) placeLamp(s, at(0, i), "dawn");
    const sixth = lampCost(s).star!;
    s.res.star = FIRST_STAR;
    assert.ok(placeLamp(s, at(0, 5), "dawn").ok);
    assert.ok(sixth + lampCost(s).star! <= FIRST_STAR);
    assert.ok(upgradeCost(1).star! <= FIRST_STAR);
  });

  it("缺什么就说什么从哪来", () => {
    const s = newGame();
    for (const k of ["star", "insight", "wish"] as const) {
      assert.equal(shortage(s, { [k]: 1 }), `${RESOURCES[k].name}不够：${RESOURCES[k].from}`);
    }
    const r = armVigil(s, true);
    assert.ok(!r.ok && r.reason.startsWith("愿不够"));
  });

  it("没有弟子在出才算没来源，守灯人那点油不算", () => {
    const s = newGame();
    assert.ok(noSource(derive(s), "oil"));
    seat(s, "ayan", at(0, 3));
    placeLamp(s, at(0, 2), "verdant");
    assert.ok(!noSource(derive(s), "oil"));
    assert.ok(noSource(derive(s), "star"));
  });
});

describe("拖动预览", () => {
  it("预览和真挪的结果一样，且不改原状态", () => {
    const s = newGame();
    s.res.oil = 500;
    seat(s, "ayan", at(0, 3));
    placeLamp(s, at(0, 2), "verdant");
    placeLamp(s, at(0, 5), "dawn");
    const before = structuredClone(s);
    const trial = tryMove(s, at(0, 5), at(0, 4));
    assert.deepEqual(s, before);
    assert.ok(trial);
    move(s, at(0, 5), at(0, 4));
    const d = derive(s);
    assert.equal(trial.d.seats[0].hue, "spring");
    assert.deepEqual(trial.d.seats, d.seats);
    assert.deepEqual(trial.exposed, exposedLamps(s, d));
  });

  it("涨潮时、没修好的山台都不预览", () => {
    const s = newGame();
    placeLamp(s, at(0, 3), "dawn");
    assert.equal(tryMove(s, at(0, 3), at(1, 3)), null);
    run(s, TIDE_FIRST);
    assert.equal(tryMove(s, at(0, 3), at(0, 4)), null);
  });
});

describe("拆灯", () => {
  it("退一半：点灯和升灯的油、星屑都算", () => {
    const s = newGame();
    s.res = { oil: 1e6, star: 1e6, insight: 0, wish: 0 };
    const { oil, star } = s.res;
    placeLamp(s, at(0, 3), "dawn");
    while (upgradeLamp(s, at(0, 3)).ok);
    assert.equal(s.lamps[at(0, 3)]!.level, LAMP_MAX_LEVEL);
    const spent = { oil: oil - s.res.oil, star: star - s.res.star };
    const back = removeRefund(s, at(0, 3));
    assert.deepEqual(back, { oil: Math.floor(spent.oil / 2), star: Math.floor(spent.star / 2) });
    const held = { ...s.res };
    assert.ok(removeLamp(s, at(0, 3)).ok);
    assert.equal(s.res.oil - held.oil, back.oil);
    assert.equal(s.res.star - held.star, back.star);
  });

  it("点了拆、升了拆，怎么倒腾都不赚", () => {
    const s = newGame();
    s.res = { oil: 1e6, star: 1e6, insight: 0, wish: 0 };
    const start = { ...s.res };
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < 7; i++) {
        placeLamp(s, at(0, i), "dawn");
        for (let k = 0; k < round; k++) upgradeLamp(s, at(0, i));
      }
      for (let i = 6; i >= 0; i--) removeLamp(s, at(0, i));
      assert.ok(s.res.oil < start.oil && s.res.star < start.star);
    }
  });
});

describe("离线与存档的补漏", () => {
  it("一分钟内照常补走，十分钟内不弹窗", () => {
    assert.equal(awayKind(59), "step");
    assert.equal(awayKind(60), "quiet");
    assert.equal(awayKind(599), "quiet");
    assert.equal(awayKind(600), "popup");
  });

  it("离线守夜失败会报出来", () => {
    const s = newGame();
    s.res.wish = VIGIL_COST;
    placeLamp(s, at(0, 0), "dawn");
    armVigil(s, true);
    const notes = offlineNotes(settleOffline(s, 3600));
    assert.equal(notes.filter((x) => x.startsWith("守夜没成")).length, 1);
    assert.equal(s.vigil.armed, false);
  });

  it("没约守夜就没什么可报", () => {
    const s = newGame();
    s.nights = 1;
    assert.deepEqual(offlineNotes(settleOffline(s, 3600)), []);
  });

  it("存档体是 null、数字时当坏存档，不抛异常", () => {
    for (const body of ["null", "3", '"x"']) {
      let h = 0x811c9dc5;
      for (let i = 0; i < body.length; i++) h = Math.imul(h ^ body.charCodeAt(i), 0x01000193) >>> 0;
      const r = deserialize(`CM1.${h.toString(16).padStart(8, "0")}.${body}`);
      assert.equal(r.ok, false);
    }
  });

  it("旧存档读得进来，守夜约定和灯都在", () => {
    const s = newGame();
    s.res.wish = VIGIL_COST;
    placeLamp(s, at(0, 3), "frost");
    s.nights = 3;
    armVigil(s, true);
    const r = deserialize(serialize(s));
    assert.ok(r.ok && r.state.vigil.armed && r.state.lamps[at(0, 3)]?.flame === "frost" && r.state.nights === 3);
  });
});

describe("操作", () => {
  it("方向键走到边上就停，不往回跳", () => {
    for (const s of SLOTS) {
      const right = arrowTarget(s.id, "ArrowRight");
      const left = arrowTarget(s.id, "ArrowLeft");
      assert.equal(right === null, !slotAt(s.terrace, s.index + 1));
      assert.equal(left === null, s.index === 0);
      if (right !== null) assert.equal(SLOTS[right].index, s.index + 1);
      for (const key of ["ArrowUp", "ArrowDown"]) {
        const to = arrowTarget(s.id, key);
        if (to !== null) assert.equal(Math.abs(SLOTS[to].terrace - s.terrace), 1);
      }
    }
    assert.equal(arrowTarget(at(0, 6), "ArrowRight"), null);
    assert.equal(arrowTarget(at(0, 6), "ArrowUp"), at(1, 5));
    assert.equal(arrowTarget(at(0, 0), "ArrowDown"), null);
  });

  it("双击的第二下不算", () => {
    const gate = new ClickGate(300);
    assert.equal(gate.pass(0, 50, 50), true);
    assert.equal(gate.pass(150, 50, 50), false);
    assert.equal(gate.pass(299, 50, 50), false);
    assert.equal(gate.pass(301, 50, 50), true);
  });
});
