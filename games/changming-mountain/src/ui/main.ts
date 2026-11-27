import "./styles.css";
import {
  armVigil, inscribe, lampCount, move, openTerrace, placeLamp, removeLamp, seat, setFlame, upgradeLamp, wipe,
} from "../core/actions.ts";
import { HOLD_LAMPS, PATTERNS, REALMS, RESOURCES, TERRACES } from "../core/data.ts";
import { exposedLamps, newGame, settleOffline, step } from "../core/engine.ts";
import { SLOTS, arrowTarget } from "../core/grid.ts";
import { bestSeat, guide, tryMove } from "../core/guide.ts";
import type { Guide } from "../core/guide.ts";
import { derive, discipleDef } from "../core/light.ts";
import { awayKind, nightText, offlineNotes } from "../core/report.ts";
import { deserialize, serialize } from "../core/save.ts";
import type { ActionResult, Flame, GameEvent, GameState, ResourceId } from "../core/types.ts";
import { ClickGate } from "./clicks.ts";
import { duration, render } from "./dom.ts";
import { hit, makeLayout } from "./layout.ts";
import type { Layout } from "./layout.ts";
import { modalHtml } from "./modal.ts";
import type { Modal } from "./modal.ts";
import { PALETTE } from "./palette.ts";
import { hudHtml, panelHtml } from "./panel.ts";
import type { Page, PanelView } from "./panel.ts";
import { Scene } from "./scene.ts";
import type { SceneView } from "./scene.ts";
import { WallClock } from "./wallclock.ts";

const SAVE_KEY = "changming.save.v1";
const $ = <T extends Element>(q: string): T => document.querySelector<T>(q)!;
const canvas = $<HTMLCanvasElement>("#scene");
const stage = $<HTMLElement>("#stage");
const ctx = canvas.getContext("2d")!;

/** 浏览器存储可能不可用（隐私窗口等），读写失败都不影响游戏。 */
const store = {
  get(k: string): string | null {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string): boolean {
    try {
      localStorage.setItem(k, v);
      return true;
    } catch {
      return false;
    }
  },
};

let state: GameState = newGame();
let modal: Modal = null;
let layout: Layout = makeLayout(800, 600);
let dpr = 1;
const scene = new Scene();
const panel: PanelView = { page: "gate", selected: null, open: null, confirm: null };
const view: SceneView = { selected: null, hover: null, drag: null, preview: null, trial: null, guide: null, exposed: [] };
const log: { text: string; until: number }[] = [];
const gate = new ClickGate();
const clock = new WallClock(Date.now(), document.hidden);
/** 排着队的弹窗：前一个关了才轮到。 */
const waiting: NonNullable<Modal>[] = [];
let teach: Guide | null = null;
let dry = false;

function say(text: string): void {
  log.push({ text, until: performance.now() + 6000 });
  while (log.length > 3) log.shift();
}

function openModal(m: NonNullable<Modal>): void {
  if (modal) waiting.push(m);
  else modal = m;
}

function tell(events: GameEvent[]): void {
  for (const e of events) {
    if (e.type === "tideEnd") {
      say(nightText(e));
      if (e.star > 0) say(`潮退处落下星屑 ${e.star}`);
    } else if (e.type === "patternSeen") say(`摆出了「${PATTERNS.find((p) => p.id === e.id)!.name}」`);
    else if (e.type === "joined") say(`${discipleDef(e.id).name}上山了`);
    else if (e.type === "vigilFailed") say(e.reason);
    else if (e.type === "realm") {
      say(`突破「${REALMS[e.realm]}」`);
      openModal({ kind: "realm" });
    }
  }
}

function save(): void {
  state.savedAt = clock.at;
  store.set(SAVE_KEY, serialize(state));
}

function catchUp(seconds: number): void {
  const kind = awayKind(seconds);
  if (kind === "step") {
    const events: GameEvent[] = [];
    for (let i = 0; i < Math.floor(seconds); i++) step(state, events);
    tell(events);
    return;
  }
  const report = settleOffline(state, seconds);
  if (kind === "popup") openModal({ kind: "offline", report });
  else {
    say(`离开 ${duration(report.seconds)}，灯替你亮着`);
    offlineNotes(report).forEach(say);
  }
  if (report.events.some((e) => e.type === "realm")) openModal({ kind: "realm" });
  save();
}

function load(): void {
  const raw = store.get(SAVE_KEY);
  if (!raw) return;
  const r = deserialize(raw);
  if (!r.ok) {
    // 坏存档另存一份，不覆盖，方便找回。
    store.set(`${SAVE_KEY}.bad`, raw);
    say(`${r.reason}，已另存备份并重新开始`);
    return;
  }
  state = r.state;
  clock.at = Date.now();
  if (state.savedAt) catchUp((clock.at - state.savedAt) / 1000);
}

function select(id: number | null): void {
  // 卡片在面板最上头，先前往下翻过就看不见。
  if (id !== panel.selected) document.querySelector("#panel .page")?.scrollTo(0, 0);
  panel.selected = id;
  panel.confirm = null;
  view.selected = id;
  view.preview = null;
}

function tryDo(r: ActionResult, done?: string): void {
  if (!r.ok) say(r.reason);
  else if (done) say(done);
  refresh();
}

const actions: Record<string, (arg: string) => void> = {
  page: (p) => {
    panel.page = p as Page;
    panel.confirm = null;
  },
  more: (id) => {
    panel.open = panel.open === id ? null : id;
    panel.confirm = null;
  },
  settings: () => {
    modal ??= { kind: "settings", message: "", confirm: null, exported: "" };
  },
  source: (k) => say(`${RESOURCES[k as ResourceId].name}：${RESOURCES[k as ResourceId].from}`),
  tideHint: () => {
    if (lampCount(state) < HOLD_LAMPS) say(`${HOLD_LAMPS} 盏灯才守得住黑潮`);
    else say(view.exposed.length ? "红圈的灯挡不住：旁边添一盏，或往里挪" : "黑潮来时，照不到的灯会变暗");
  },
  goto: (id) => {
    select(Number(id));
    panel.page = "gate";
  },
  guideSeat: (id) => teach?.slot != null && tryDo(seat(state, id, teach.slot)),
  guideMove: () => teach?.from != null && teach.slot !== null && tryDo(move(state, teach.from, teach.slot)),
  guideLamp: (f) => {
    view.preview = null;
    if (teach?.slot != null) tryDo(placeLamp(state, teach.slot, f as Flame));
  },
  place: (f) => {
    view.preview = null;
    if (panel.selected !== null) tryDo(placeLamp(state, panel.selected, f as Flame));
  },
  flame: (f) => {
    view.preview = null;
    if (panel.selected !== null) tryDo(setFlame(state, panel.selected, f as Flame));
  },
  upgrade: () => panel.selected !== null && tryDo(upgradeLamp(state, panel.selected)),
  wipe: () => panel.selected !== null && tryDo(wipe(state, panel.selected)),
  remove: () => {
    panel.confirm = "remove";
  },
  removeNo: () => {
    panel.confirm = null;
  },
  removeYes: () => {
    panel.confirm = null;
    if (panel.selected !== null) tryDo(removeLamp(state, panel.selected));
  },
  seat: (id) => panel.selected !== null && tryDo(seat(state, id, panel.selected)),
  seatAuto: (id) => {
    const slot = bestSeat(state);
    if (slot === null) say("没有空位了");
    else tryDo(seat(state, id, slot));
  },
  unseat: (id) => tryDo(seat(state, id, null)),
  terrace: () => {
    const events: GameEvent[] = [];
    const name = TERRACES[state.terraces]?.name ?? "";
    tryDo(openTerrace(state, events), `${name}修好了`);
    tell(events);
  },
  inscribe: (id) => {
    const events: GameEvent[] = [];
    tryDo(inscribe(state, id, events));
    tell(events);
  },
  arm: () => tryDo(armVigil(state, true), "约好了，守下一次黑潮"),
  disarm: () => tryDo(armVigil(state, false)),
  close: () => {
    modal = waiting.shift() ?? null;
  },
  closeShade: () => {
    if (modal?.kind !== "realm") actions.close("");
  },
  export: () => {
    if (modal?.kind !== "settings") return;
    const text = serialize(state);
    const area = $<HTMLTextAreaElement>("#saveText");
    area.value = text;
    modal = { ...modal, exported: text, confirm: null, message: "复制这段文字保存好" };
    area.select();
  },
  import: () => {
    if (modal?.kind !== "settings") return;
    const r = deserialize($<HTMLTextAreaElement>("#saveText").value);
    modal = r.ok
      ? { ...modal, confirm: "import", message: "会换掉现在的进度" }
      : { ...modal, confirm: null, message: r.reason };
  },
  importYes: () => {
    if (modal?.kind !== "settings") return;
    const area = $<HTMLTextAreaElement>("#saveText");
    const r = deserialize(area.value);
    if (!r.ok) {
      modal = { ...modal, confirm: null, message: r.reason };
      return;
    }
    const old = serialize(state);
    store.set(`${SAVE_KEY}.bak`, old);
    state = r.state;
    waiting.length = 0;
    select(null);
    save();
    area.value = old;
    modal = { ...modal, confirm: null, exported: old, message: "导入好了，框里是原来的进度" };
  },
  reset: () => {
    if (modal?.kind === "settings") modal = { ...modal, confirm: "reset", message: "会清掉现在的进度" };
  },
  settingsNo: () => {
    if (modal?.kind === "settings") modal = { ...modal, confirm: null, message: "" };
  },
  resetYes: () => {
    state = newGame();
    select(null);
    panel.page = "gate";
    waiting.length = 0;
    modal = null;
    save();
    say("重新开始");
  },
};

document.addEventListener("click", (e) => {
  const el = (e.target as Element).closest<HTMLElement>("[data-act]");
  if (!el) return;
  // 键盘按出来的点击没有位置，用按钮中心。
  const r = el.getBoundingClientRect();
  const [x, y] = e.detail ? [e.clientX, e.clientY] : [r.x + r.width / 2, r.y + r.height / 2];
  if (!gate.pass(performance.now(), x, y)) return;
  if (el.getAttribute("aria-disabled") === "true") {
    if (el.title) say(el.title);
    refresh();
    return;
  }
  actions[el.dataset.act!]?.(el.dataset.arg ?? "");
  refresh();
});

document.addEventListener("pointerover", (e) => {
  const el = (e.target as Element).closest<HTMLElement>('[data-act="place"],[data-act="flame"],[data-act="guideLamp"]');
  const slot = el?.dataset.act === "guideLamp" ? teach?.slot ?? null : panel.selected;
  view.preview = el && slot !== null ? { slot, flame: el.dataset.arg as Flame } : null;
});
// 手指抬起就不再预览。
document.addEventListener("pointerout", (e) => {
  if (e.pointerType !== "mouse") view.preview = null;
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modal) actions.closeShade("");
    else select(null);
    refresh();
    return;
  }
  // 方向键选灯位。
  if (!/^Arrow(Left|Right|Up|Down)$/.test(e.key) || modal || (e.target as Element).closest("textarea")) return;
  e.preventDefault();
  const next = panel.selected === null ? 0 : arrowTarget(panel.selected, e.key);
  if (next !== null && SLOTS[next].terrace < state.terraces) {
    select(next);
    panel.page = "gate";
    refresh();
  }
});

let down: { id: number | null; x: number; y: number; pointer: number } | null = null;
let picked = { id: -1, at: -Infinity };
const point = (e: PointerEvent): [number, number] => {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
};
const openSlot = (x: number, y: number): number | null => {
  const id = hit(layout, x, y);
  return id !== null && SLOTS[id].terrace < state.terraces ? id : null;
};
const occupied = (id: number): boolean => Boolean(state.lamps[id]) || state.disciples.some((d) => d.slot === id);

canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  const [x, y] = point(e);
  down = { id: openSlot(x, y), x, y, pointer: e.pointerId };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  const [x, y] = point(e);
  const over = openSlot(x, y);
  view.hover = e.pointerType === "mouse" ? over : null;
  canvas.style.cursor = over === null ? "default" : occupied(over) ? "grab" : "pointer";
  if (!down || down.pointer !== e.pointerId) return;
  if (!view.drag && down.id !== null && occupied(down.id) && Math.hypot(x - down.x, y - down.y) > 8) {
    view.drag = { from: down.id, x, y, over };
  }
  if (!view.drag) return;
  if (view.drag.over !== over) view.trial = null;
  view.drag = { ...view.drag, x, y, over };
  if (!view.trial) foresee();
});
/** 拖到哪儿，就先看看挪过去会变成什么光色、哪盏灯会露。 */
function foresee(): void {
  const { drag } = view;
  view.trial = drag && drag.over !== null && drag.over !== drag.from ? tryMove(state, drag.from, drag.over) : null;
}
function release(e: PointerEvent, cancelled: boolean): void {
  if (!down || down.pointer !== e.pointerId) return;
  const { drag } = view;
  const pressed = down.id;
  down = null;
  view.drag = null;
  view.trial = null;
  if (cancelled) return;
  if (drag) {
    if (drag.over !== null && drag.over !== drag.from) {
      const r = move(state, drag.from, drag.over);
      panel.confirm = null;
      if (r.ok && panel.selected === drag.from) select(drag.over);
      tryDo(r);
    }
    return;
  }
  // 双击同一处只算选中，不会刚选中又收起。
  const now = performance.now();
  if (pressed !== null && pressed === picked.id && now - picked.at < 300) return;
  picked = { id: pressed ?? -1, at: now };
  select(pressed === panel.selected ? null : pressed);
  if (pressed !== null && panel.page === "patterns") panel.page = "gate";
  refresh();
}
canvas.addEventListener("pointerup", (e) => release(e, false));
canvas.addEventListener("pointercancel", (e) => release(e, true));
canvas.addEventListener("pointerleave", () => {
  view.hover = null;
});

function refresh(): void {
  const d = derive(state);
  teach = guide(state, d);
  view.guide = teach?.slot ?? null;
  view.exposed = exposedLamps(state, d);
  if (view.drag) foresee();
  // 油烧光只说一次，缓过来再算下一次。
  if (state.fuel < 1 && !dry) say("灯油烧光了，灯暗了下来");
  dry = state.fuel < 1;
  render($("#hud"), hudHtml(state, d));
  render($("#panel"), panelHtml(state, d, panel, teach));
  const hadModal = $("#modal").childElementCount > 0;
  render($("#modal"), modalHtml(modal, state));
  // 弹窗开着时后面的按钮点不到、也按不到；正拖着的放回去。
  $<HTMLElement>("#app").inert = modal !== null;
  if (modal && down) {
    down = null;
    view.drag = null;
    view.trial = null;
  }
  if (modal && !hadModal) $<HTMLElement>("#modal button.primary").focus();
  if (!modal && hadModal) $<HTMLElement>("#panel .tab.on").focus();
  const now = performance.now();
  while (log.length && log[0].until < now) log.shift();
  render($("#log"), log.map((x) => `<p>${x.text}</p>`).join(""));
}

function resize(): void {
  const r = stage.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  layout = makeLayout(r.width, r.height);
}
new ResizeObserver(resize).observe(stage);

let carry = 0;
let last = performance.now();
let lastPanel = 0;
let lastSave = 0;

function frame(now: number): void {
  const gap = clock.frame(Date.now());
  if (gap) {
    catchUp(gap);
    last = now;
  }
  const dt = clock.hidden ? 0 : Math.min(2, (now - last) / 1000);
  last = now;
  carry += dt;
  const events: GameEvent[] = [];
  while (carry >= 1) {
    carry -= 1;
    step(state, events);
  }
  if (events.length) tell(events);
  if (now - lastPanel > 250) {
    lastPanel = now;
    refresh();
  }
  if (!clock.hidden && now - lastSave > 10000) {
    lastSave = now;
    save();
  }
  // 窗口还没有尺寸（例如藏在后台）时不画。
  if (layout.w > 120 && layout.h > 160) scene.draw(ctx, layout, PALETTE, state, derive(state), view, now, dpr);
  requestAnimationFrame(frame);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clock.hide();
    save();
    return;
  }
  if (!clock.hidden) return;
  last = performance.now();
  catchUp(clock.show(Date.now()));
  refresh();
});
window.addEventListener("pagehide", () => {
  // 隐藏期间的时间还没结算，保留隐藏那一刻的存档。
  if (!clock.hidden) save();
});

resize();
load();
refresh();
if (!state.lamps.some(Boolean) && state.time < 1) say(`长夜降临，请${discipleDef("ayan").name}坐下守灯`);
requestAnimationFrame(frame);

// 只给本地开发时的自动化测试用，正式包里没有。
if (import.meta.env?.DEV) {
  Object.assign(window, {
    __cm: {
      get state() {
        return state;
      },
      skip: (n: number) => {
        const events: GameEvent[] = [];
        for (let i = 0; i < n; i++) step(state, events);
        tell(events);
        refresh();
      },
      slots: () => layout.slots,
    },
  });
}
