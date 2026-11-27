import { REALMS, RESOURCES } from "../core/data.ts";
import type { OfflineReport } from "../core/engine.ts";
import { offlineNotes } from "../core/report.ts";
import type { GameState, ResourceId } from "../core/types.ts";
import { artUrl } from "./art.ts";
import { duration, esc, num } from "./dom.ts";
import { icon } from "./panel.ts";

export type Modal =
  | { kind: "offline"; report: OfflineReport }
  | { kind: "realm" }
  | { kind: "settings"; message: string; confirm: "import" | "reset" | null; exported: string }
  | null;

const btn = (act: string, label: string, cls = "", arg = ""): string =>
  `<button type="button" data-act="${act}" data-arg="${arg}" data-key="${act}:${arg}" class="${cls}">${label}</button>`;

const box = (title: string, body: string, plate = ""): string =>
  `<div class="shade" data-act="closeShade"></div><div class="box${plate ? " pictured" : ""}" role="dialog" aria-modal="true" aria-label="${title}">${plate ? `<img class="plate" src="${artUrl(plate) ?? ""}" alt="">` : ""}<h2>${title}</h2>${body}</div>`;

export function modalHtml(m: Modal, s: GameState): string {
  if (!m) return "";
  if (m.kind === "offline") {
    const gained = (Object.entries(m.report.gained) as [ResourceId, number][])
      .filter(([, v]) => Math.abs(v) >= 0.05)
      .map(([k, v]) => `<li>${icon(k)}<span class="sr">${RESOURCES[k].name}</span>${v > 0 ? "+" : ""}${num(v)}</li>`)
      .join("");
    const notes = offlineNotes(m.report).map((x) => `<p>${x}</p>`).join("");
    return box("灯替你亮着", `<p>离开 ${duration(m.report.seconds)}</p><ul class="gains">${gained}</ul>${notes}${btn("close", "收下", "primary wide")}`, "offline");
  }
  if (m.kind === "realm") {
    return box(`入${REALMS[s.realm]}境`, `<p>守住 ${s.nightsHeld} 夜，点着 ${s.lamps.filter(Boolean).length} 盏灯</p>${btn("close", "接着点灯", "primary wide")}`, "realm");
  }
  return box(
    "设置",
    `<p>存档只在这台设备上，换设备先导出</p>
    <div class="row">${btn("export", "导出")}${m.confirm === "import" ? `${btn("importYes", "确定导入", "danger")}${btn("settingsNo", "不了", "ghost")}` : btn("import", "导入")}</div>
    <textarea id="saveText" data-key="saveText" aria-label="存档文本" placeholder="存档文字">${esc(m.exported)}</textarea>
    <p class="msg" role="status">${esc(m.message)}</p>
    <div class="row">${m.confirm === "reset" ? `${btn("resetYes", "确定重来", "danger")}${btn("settingsNo", "不了", "ghost")}` : btn("reset", "重新开始", "ghost")}<span class="grow"></span>${btn("close", "关闭", "primary")}</div>`,
  );
}
