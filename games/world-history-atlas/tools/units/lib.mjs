// Shared helpers for the units build (build-time only, not deployed).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ATLAS = path.join(HERE, "..", "..");
export const DATA = process.env.ATLAS_UNITS_DATA || "C:/Project/_work/atlas-units/data";
export const OUT = path.join(HERE, "out");
fs.mkdirSync(OUT, { recursive: true });

// Load the atlas browser data files into a sandbox object
export function loadAtlas(files) {
  const sandbox = { window: { HistoryAtlas: {} } };
  for (const f of files) {
    const code = fs.readFileSync(path.join(ATLAS, f), "utf8");
    new Function("window", code)(sandbox.window);
  }
  return sandbox.window.HistoryAtlas;
}
// Old base map affine (valid in the Eurasia / North Africa core band only)
export const oldToLL = ([x, y]) => [(x - 510) / 4.345, (347.9 - y) / 5.1515];
export const llToOld = ([lon, lat]) => [510 + 4.345 * lon, 347.9 - 5.1515 * lat];
export function parsePath(d) {
  return d.split(/(?=M)/).filter(s => s.trim()).map(s => {
    const a = s.match(/-?\d+\.?\d*/g).map(Number); const r = [];
    for (let i = 0; i < a.length; i += 2) r.push([a[i], a[i + 1]]);
    return r;
  });
}
export function ringArea(r) { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return s / 2; }
export function multiArea(mp) { let s = 0; for (const poly of mp) { poly.forEach((r, k) => { s += (k === 0 ? 1 : -1) * Math.abs(ringArea(r)); }); } return s; }
export const readJSON = p => JSON.parse(fs.readFileSync(p, "utf8"));
export const writeJSON = (p, o) => fs.writeFileSync(p, JSON.stringify(o));
