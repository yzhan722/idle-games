import { discipleAt, isEmpty, lampCost, lampCount, removeRefund, shortage, upgradeCost } from "../core/actions.ts";
import type { Cost } from "../core/actions.ts";
import {
  DISCIPLES, DISCIPLE_MAX_LEVEL, FLAMES, FLAME_IDS, HOLD_LAMPS, HUES, LAMP_MAX_LEVEL, PATTERNS, REALMS, RESOURCES,
  SLICE_REALM, TERRACES, TERRAIN_NAME, TRAITS, VIGIL_COST, VIGIL_HUES,
} from "../core/data.ts";
import { exposedLamps, tidePressure, vigilCheck, xpNeed } from "../core/engine.ts";
import { SLOTS } from "../core/grid.ts";
import { coverSlot, noSource } from "../core/guide.ts";
import type { Guide } from "../core/guide.ts";
import { blend, discipleDef } from "../core/light.ts";
import type { Derived } from "../core/light.ts";
import type { Flame, GameState, ResourceId } from "../core/types.ts";
import { artUrl } from "./art.ts";
import { brief, clock, esc, num, rate } from "./dom.ts";
import { HUE_COLOR } from "./palette.ts";

export type Page = "gate" | "people" | "patterns";
export interface PanelView {
  page: Page;
  selected: number | null;
  /** 展开着的说明；平时都收起。 */
  open: string | null;
  /** 正等着二次确认的操作。 */
  confirm: "remove" | null;
}

const pic = (name: string, cls = ""): string => `<img class="${cls}" src="${artUrl(name) ?? ""}" alt="" draggable="false">`;
export const icon = (k: ResourceId): string => pic(`i_${k}`, "ic");
const lampPic = (flame: Flame, level = 1): string => pic(`lamp${level >= 5 ? 3 : level >= 3 ? 2 : 1}_${flame}`, "lamp");
const face = (id: string): string => pic(`d_${id}`, "face");

function costText(s: GameState, cost: Cost): string {
  return (Object.entries(cost) as [ResourceId, number][])
    .map(([k, v]) => `<span class="cost${s.res[k] < v ? " lack" : ""}">${icon(k)}<span class="sr">${RESOURCES[k].name}</span>${num(v)}</span>`)
    .join("");
}

/** 退回来的东西。 */
const backText = (cost: Cost): string =>
  (Object.entries(cost) as [ResourceId, number][])
    .map(([k, v]) => `<span class="cost">${icon(k)}<span class="sr">${RESOURCES[k].name}</span>+${num(v)}</span>`)
    .join("");

function button(action: string, label: string, opts: { arg?: string; off?: string | null; cls?: string; extra?: string; tip?: string } = {}): string {
  const { arg = "", off = null, cls = "", extra = "", tip = "" } = opts;
  const title = off ?? tip;
  return `<button type="button" data-act="${action}" data-arg="${esc(arg)}" data-key="${action}:${esc(arg)}" class="${cls}"${off ? ' aria-disabled="true"' : ""}${title ? ` title="${esc(title)}"` : ""}>${label}${extra}</button>`;
}

/** 缺着又没有弟子在出的东西：哪种火出它，只用图说。 */
function sources(s: GameState, d: Derived, cost: Cost): string {
  return (Object.entries(cost) as [ResourceId, number][])
    .filter(([k, v]) => s.res[k] < v && noSource(d, k))
    .map(([k]) => `<p class="from">${RESOURCES[k].flames.map((f) => lampPic(f)).join("")}<span aria-hidden="true">→</span>${icon(k)}<span class="sr">${RESOURCES[k].name}：${RESOURCES[k].from}</span></p>`)
    .join("");
}

const hueTag = (hue: keyof typeof HUES): string =>
  `<span class="hue"><i style="background:${HUE_COLOR[hue]};color:${HUE_COLOR[hue]}"></i>${HUES[hue].name}</span>`;

function yieldsText(y: Partial<Record<ResourceId, number>>): string {
  const parts = (Object.entries(y) as [ResourceId, number][]).filter(([, v]) => v > 0);
  return parts.map(([k, v]) => `<span class="yield">${icon(k)}<span class="sr">${RESOURCES[k].name}</span>${rate(v)}</span>`).join("");
}

/** 一段平时收起的说明：按钮和内容。 */
const more = (v: PanelView, id: string): string => button("more", v.open === id ? "收起说明" : "说明", { arg: id, cls: "ghost more" });
const detail = (v: PanelView, id: string, body: string): string => (v.open === id ? `<div class="detail">${body}</div>` : "");

/** 一种火点着之后先得的东西。 */
const gives = (f: Flame): ResourceId => Object.keys(HUES[f].yields)[0] as ResourceId;

export function hudHtml(s: GameState, d: Derived): string {
  const res = (Object.keys(RESOURCES) as ResourceId[])
    .map((k) => {
      const r = k === "oil" ? d.income.oil - d.upkeep : d.income[k];
      // 油撑不过两分钟才示警。
      const low = k === "oil" && (s.fuel < 1 || (r < 0 && s.res.oil < -r * 120));
      return `<button type="button" data-act="source" data-arg="${k}" data-key="source:${k}" class="res${low ? " low" : ""}" title="${RESOURCES[k].name}：${esc(RESOURCES[k].hint)}">${icon(k)}<b>${num(s.res[k])}</b><small>${brief(r)}</small><span class="sr">${RESOURCES[k].name}</span></button>`;
    })
    .join("");
  const surge = s.tide.phase === "surge";
  const exposed = exposedLamps(s, d).length;
  const lit = lampCount(s);
  const state =
    lit < HOLD_LAMPS
      ? `<small>${lampPic("dawn")}${lit}/${HOLD_LAMPS}<span class="sr">盏灯，${HOLD_LAMPS} 盏才守得住</span></small>`
      : exposed ? `<small><i class="ring"></i>×${exposed}<span class="sr">盏灯挡不住</span></small>` : "";
  return `<div class="resources">${res}</div>
    <button type="button" data-act="tideHint" data-key="tide" class="tide${surge ? " surge" : ""}" title="黑潮会让照不到的灯变暗">${pic("i_tide", "ic")}<span class="sr">黑潮</span><b>${clock(s.tide.left)}</b>${state}${s.vigil.armed ? "<em>守夜</em>" : ""}</button>
    ${button("settings", "设置", { cls: "ghost settings" })}`;
}

function bars(light: Record<Flame, number>): string {
  const max = Math.max(1.6, light.dawn, light.verdant, light.frost);
  return `<div class="bars">${FLAME_IDS.map(
    (f) => `<div class="bar"><span>${FLAMES[f].name}</span><i><u style="width:${((light[f] / max) * 100).toFixed(0)}%;background:${HUE_COLOR[f]}"></u></i><b>${light[f].toFixed(2)}</b></div>`,
  ).join("")}</div>`;
}

/** 点哪种火的大按钮：灯、火名、先得什么。 */
const pick = (act: string, f: Flame, opts: { off: string | null; boost?: boolean; first?: boolean }): string =>
  button(act, `${lampPic(f)}<span>${FLAMES[f].name}</span><span class="get">${icon(gives(f))}${opts.boost ? "<em>×1.3</em>" : ""}</span>`, { arg: f, cls: `pick ${f}${opts.first ? " first" : ""}`, off: opts.off });

function slotCard(s: GameState, d: Derived, v: PanelView, id: number): string {
  const slot = SLOTS[id];
  const light = d.field[id];
  const boost = FLAME_IDS.find((f) => FLAMES[f].terrain === slot.terrain);
  const card = (title: string, body: string): string =>
    `<section class="card" data-key="slot-${id}"><header><h2>${title}</h2>${more(v, "slot")}</header>${body}</section>`;

  const lamp = s.lamps[id];
  const who = discipleAt(s, id);
  if (lamp) {
    const need = tidePressure(s.tide.index, id);
    const safe = d.guard[id] >= need;
    const cost = upgradeCost(lamp.level);
    const maxed = lamp.level >= LAMP_MAX_LEVEL;
    const swaps = FLAME_IDS.filter((f) => f !== lamp.flame)
      .map((f) => button("flame", `${lampPic(f, lamp.level)}<span class="sr">换${FLAMES[f].name}</span>`, { arg: f, cls: "sit only", off: s.tide.phase === "surge" ? "涨潮时不能换火" : null, tip: `换${FLAMES[f].name}` }))
      .join("");
    const raise = maxed ? "<p>已满级</p>" : button("upgrade", "升灯", { cls: safe ? "primary" : "", off: shortage(s, cost), extra: costText(s, cost) });
    // 升灯护不了自己：露着的灯先指真正防潮的做法，升灯退到下一行。
    const beside = safe ? null : coverSlot(s, id);
    const shield = beside !== null ? button("goto", "旁边添一盏", { arg: String(beside), cls: "primary" }) : "<p>拖到里面一点</p>";
    const drop =
      v.confirm === "remove"
        ? `${button("removeYes", "确定拆", { cls: "danger" })}${backText(removeRefund(s, id))}${button("removeNo", "不了", { cls: "ghost" })}`
        : button("remove", "拆灯", { cls: "ghost" });
    return card(
      `${FLAMES[lamp.flame].name}灯 <small>${lamp.level} 级</small>`,
      `<div class="hero">${lampPic(lamp.flame, lamp.level)}<div>
        <p class="big ${safe ? "good" : "warn"}">${safe ? "挡得住黑潮" : "黑潮来会变暗"}</p>
        ${lamp.soot > 0.01 ? `<p class="warn">烟灰 ${Math.round(lamp.soot * 100)}%</p>` : ""}
        ${safe ? raise : shield}
      </div></div>
      ${detail(v, "slot", `<p>别的灯照来 ${d.guard[id].toFixed(2)}，下次黑潮 ${need.toFixed(2)}。升灯只照亮别处。</p><p>按住灯可以拖到别的灯位，不花钱。</p><div class="row">${drop}</div>`)}
      <div class="row">${safe ? "" : raise}${lamp.soot > 0.01 ? button("wipe", "拂灰") : ""}${swaps}</div>`,
    );
  }
  const { hue } = blend(light);
  if (who) {
    const seatView = d.seats.find((x) => x.disciple === who)!;
    return card(
      discipleDef(who).name,
      `<div class="hero">${face(who)}<div><p class="big">${hueTag(seatView.hue)}</p><p class="yields">${yieldsText(seatView.yields) || "还没有光"}</p>
      ${button("unseat", "离席", { arg: who })}</div></div>
      ${detail(v, "slot", `${seatView.notes.map((n) => `<p>${n}</p>`).join("")}${bars(light)}`)}`,
    );
  }
  const cost = lampCost(s);
  const lack = shortage(s, cost);
  const place = FLAME_IDS.map((f) => pick("place", f, { off: lack, boost: boost === f })).join("");
  const seats = s.disciples
    .filter((x) => x.slot === null)
    .map((x) => button("seat", `${face(x.id)}<span>${discipleDef(x.id).name}</span>`, { arg: x.id, cls: "sit" }))
    .join("");
  return card(
    `点灯 ${costText(s, cost)}`,
    `${detail(v, "slot", `<p>${TERRACES[slot.terrace].name}，${TERRAIN_NAME[slot.terrain]}${boost ? `：${FLAMES[boost].name}在这里更亮` : ""}</p><p>这里的光：${hueTag(hue)}</p>${bars(light)}`)}
    <div class="picks">${place}</div>${seats ? `<div class="row">${seats}</div>` : ""}`,
  );
}

function terraceButton(s: GameState, d: Derived): string {
  const next = TERRACES[s.terraces];
  return button("terrace", "动工", { cls: "primary wide", off: shortage(s, next.cost), extra: costText(s, next.cost) }) + sources(s, d, next.cost);
}

const goal = (title: string, body: string, extra = ""): string => `<section class="card goal"><header><h2>${title}</h2>${extra}</header>${body}</section>`;

/** 新手提示：按钮直接落在山上亮着的那个光圈里。选中了空位就只留一句，免得两排按钮打架。 */
function guideCard(s: GameState, d: Derived, v: PanelView, g: Guide): string {
  const free = v.selected !== null && isEmpty(s, v.selected);
  if (g.step === "seat") return goal("请阿檐入座", free ? "" : `<div class="hero">${face("ayan")}<div>${button("guideSeat", "坐下", { arg: "ayan", cls: "primary", off: g.slot === null ? "没有空位了，先拆一盏灯" : null })}</div></div>`);
  if (g.step === "cover") {
    if (g.slot === null) return goal("红圈的灯挡不住黑潮", "<p>拖到里面一点</p>");
    return goal("红圈的灯挡不住黑潮", g.from === null ? button("goto", "旁边添一盏", { arg: String(g.slot), cls: "wide" }) : button("guideMove", "挪一盏", { cls: "wide" }));
  }
  const cost = lampCost(s);
  const pupil = d.seats.find((x) => x.disciple === g.who) ?? d.seats[0];
  const flames = FLAME_IDS.filter((f) => g.step !== "mix" || f !== pupil.hue);
  const picks = free || g.slot === null ? "" : `<div class="picks">${flames.map((f) => pick("guideLamp", f, { off: shortage(s, cost), first: f === g.flame })).join("")}</div>`;
  if (g.step === "lamp") return goal(`给${discipleDef(pupil.disciple).name}点盏灯 ${costText(s, cost)}`, picks);
  if (g.step === "mix") return goal(`换一种火 ${costText(s, cost)}`, `<p>光会变色</p>${picks}`);
  const lit = lampCount(s);
  const row = Array.from({ length: HOLD_LAMPS }, (_, i) => pic("lamp1_dawn", i < lit ? "lamp" : "lamp out")).join("");
  return goal(`再点一盏 ${costText(s, cost)}`, `<p class="few">${row}<span>${HOLD_LAMPS} 盏才守得住黑潮</span></p>${picks}`);
}

function goalCard(s: GameState, d: Derived, v: PanelView, g: Guide | null): string {
  const card = goal;
  const head = g ? guideCard(s, d, v, g) : "";
  if (g?.step === "seat" || g?.step === "lamp") return head;
  const next = TERRACES[s.terraces];
  if (s.terraces === 1) return head + card(`修${next.name}`, terraceButton(s, d));
  if (!s.inscribed.length) {
    const seen = s.seen.length > 0;
    return head + (next ? card(`修${next.name}`, terraceButton(s, d)) : "") + card("记下第一张灯谱", button("page", seen ? "去记下" : "看灯谱", { arg: "patterns", cls: "wide" }));
  }
  if (next) return head + card(`修${next.name}`, terraceButton(s, d));
  if (s.realm >= SLICE_REALM) return head + card(`${REALMS[s.realm]}境`, "<p>小样到这里，灯还可以接着摆</p>");
  const c = vigilCheck(s, d);
  const surge = s.tide.phase === "surge";
  const check = (ok: boolean, text: string): string => `<li class="${ok ? "done" : ""}">${pic("i_oil", "ic")}<span>${text}</span></li>`;
  return head + card(
    `守夜，入${REALMS[s.realm + 1]}境`,
    `<ul class="checks">
      ${check(c.pattern, "一张灯谱生效")}
      ${check(c.hues.length >= VIGIL_HUES, `混色照人 ${Math.min(c.hues.length, VIGIL_HUES)}/${VIGIL_HUES}`)}
      ${check(c.exposed.length === 0, c.exposed.length ? `${c.exposed.length} 盏灯挡不住` : "灯都挡得住")}
    </ul>${
      s.vigil.armed
        ? button("disarm", surge ? "正在守夜" : "等黑潮来，点此取消", { cls: "wide", off: surge ? "黑潮已经来了" : null })
        : button("arm", "守这一夜", { cls: "primary wide", off: surge ? "黑潮已经来了" : shortage(s, { wish: VIGIL_COST }), extra: costText(s, { wish: VIGIL_COST }) })
    }${sources(s, d, { wish: VIGIL_COST })}${detail(v, "vigil", `<p>下次黑潮来时，一直满足这三条就突破。守不住不扣愿，灯也不会丢。</p>${c.hues.length ? `<p>现有混色 ${c.hues.map((h) => hueTag(h as keyof typeof HUES)).join(" ")}</p>` : ""}`)}`,
    more(v, "vigil"),
  );
}

function peoplePage(s: GameState, d: Derived, v: PanelView): string {
  return DISCIPLES.map((def) => {
    const me = s.disciples.find((x) => x.id === def.id);
    if (!me) return `<section class="card person locked"><div class="hero">${face(def.id)}<div><h2>未上山</h2><p>${def.joins}</p></div></div></section>`;
    const view = d.seats.find((x) => x.disciple === def.id);
    const canSeat = v.selected !== null && SLOTS[v.selected].terrace < s.terraces && !s.lamps[v.selected] && !discipleAt(s, v.selected);
    const key = `p-${def.id}`;
    const tell = `<p>喜 ${def.likes.map(hueTag).join(" ")}</p><p>不喜 ${def.dislikes.map(hueTag).join(" ")}</p>${def.traits.map((t) => `<p><b>${TRAITS[t].name}</b> ${TRAITS[t].text}</p>`).join("")}<p class="dim">${def.note}</p>`;
    return `<section class="card person" data-key="${key}"><div class="hero">${face(def.id)}<div>
      <header><h2>${def.name} <small>${me.level} 级</small></h2>${view ? hueTag(view.hue) : ""}</header>
      ${me.level < DISCIPLE_MAX_LEVEL ? `<div class="meter"><u style="width:${Math.min(100, (me.xp / xpNeed(me.level)) * 100).toFixed(0)}%"></u></div>` : ""}
      ${view ? `<p class="yields">${yieldsText(view.yields) || "还没有光"}</p>` : ""}
      <div class="row">${canSeat ? button("seat", "坐到选中处", { arg: def.id }) : view ? "" : button("seatAuto", "入座", { arg: def.id, cls: "primary" })}${more(v, key)}</div>
      </div></div>${detail(v, key, tell)}</section>`;
  }).join("");
}

/** 灯谱示意：山景图裁一角当台面，灯和弟子的小图站上去。边长、上移、灯高都是像素。 */
interface Sketch {
  size: number;
  shift: number;
  tall: number;
  at: [number, number, Flame | "seat"][];
}
const SHAPES: Record<string, Sketch> = {
  line: { size: 430, shift: 249, tall: 68, at: [[28, 106, "dawn"], [75, 106, "dawn"], [122, 106, "dawn"]] },
  tripod: { size: 300, shift: 134, tall: 46, at: [[75, 51, "frost"], [44, 113, "dawn"], [106, 113, "verdant"]] },
  facing: { size: 430, shift: 249, tall: 68, at: [[26, 106, "verdant"], [75, 106, "seat"], [124, 106, "verdant"]] },
  stairs: { size: 215, shift: 59, tall: 34, at: [[106, 30, "frost"], [75, 73, "frost"], [44, 118, "frost"]] },
};

/** 三态：没摆出过是暗的，摆出过是亮的，正生效是发光的。 */
const shape = (id: string, look: "dim" | "" | "live"): string => {
  const { size, shift, tall, at } = SHAPES[id];
  const dots = at.map(([x, y, f]) => `<span style="left:${x}px;top:${y}px;height:${f === "seat" ? tall * 0.8 : tall}px">${f === "seat" ? face("ayan") : lampPic(f)}</span>`).join("");
  return `<div class="shape ${look}" style="background-size:${size}px;background-position:center -${shift}px" aria-hidden="true">${dots}</div>`;
};

function patternsPage(s: GameState, d: Derived, v: PanelView): string {
  return PATTERNS.map((p) => {
    const seen = s.seen.includes(p.id);
    const done = s.inscribed.includes(p.id);
    const live = d.patterns.has(p.id);
    const key = `t-${p.id}`;
    const action = done || !seen
      ? `<span class="sr">${done ? (live ? "生效中" : "没摆成") : "待摆出"}</span>`
      : button("inscribe", "记下", { arg: p.id, cls: "primary", off: shortage(s, { insight: p.cost }), extra: costText(s, { insight: p.cost }) });
    return `<section class="card pattern" data-key="${key}"><div class="hero">${shape(p.id, !seen ? "dim" : done && live ? "live" : "")}<div><header><h2>${p.name}</h2>${more(v, key)}</header>${action}</div></div>${detail(v, key, `<p>${p.shape}</p><p class="good">${p.effect}</p>`)}</section>`;
  }).join("");
}

export function panelHtml(s: GameState, d: Derived, v: PanelView, g: Guide | null): string {
  const tabs: [Page, string][] = [["gate", "山门"], ["people", "弟子"], ["patterns", "灯谱"]];
  const ready = s.seen.some((id) => !s.inscribed.includes(id) && s.res.insight >= PATTERNS.find((p) => p.id === id)!.cost);
  const idle = s.disciples.some((x) => x.slot === null);
  const nav = tabs
    .map(([id, name]) => {
      const dot = (id === "patterns" && ready) || (id === "people" && idle);
      return `<button type="button" role="tab" aria-selected="${v.page === id}" data-act="page" data-arg="${id}" class="tab${v.page === id ? " on" : ""}">${name}${dot ? `<span class="dot">${pic("i_oil", "ic")}<span class="sr">有事可做</span></span>` : ""}</button>`;
    })
    .join("");
  let body = "";
  if (v.page === "gate") body = (v.selected !== null ? slotCard(s, d, v, v.selected) : "") + goalCard(s, d, v, g);
  else if (v.page === "people") body = peoplePage(s, d, v);
  else body = patternsPage(s, d, v);
  return `<nav role="tablist">${nav}</nav><div class="page" data-key="${v.page}">${body}</div>`;
}
