// How well does each old region (inverse-affine to lon/lat) overlap real land? Decides intersect vs. rule assignment.
import * as pc from "./geo.mjs";
import path from "node:path";
import { loadAtlas, parsePath, oldToLL, multiArea, readJSON, DATA, OUT, writeJSON } from "./lib.mjs";
const H = loadAtlas(["src/data/regions_geo.js"]);
const land = readJSON(path.join(DATA, "ne_50m_admin_0_countries.geojson")).features
  .map(f => f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).flat();
const res = {};
for (const r of H.REGIONS) {
  const mp = parsePath(r.path).map(ring => [ring.map(oldToLL)]);
  const a = Math.abs(multiArea(pc.union(...mp)));
  const lats = mp.flat(2).map(p => p[1]);
  let inter = 0;
  try { inter = Math.abs(multiArea(pc.intersection(pc.union(...mp), land))); } catch (e) { inter = -1; }
  res[r.id] = { fit: +(inter / a).toFixed(3), latMin: +Math.min(...lats).toFixed(1), latMax: +Math.max(...lats).toFixed(1) };
}
writeJSON(path.join(OUT, "old_fit.json"), res);
const rows = Object.entries(res).sort((a, b) => a[1].fit - b[1].fit);
for (const [id, v] of rows) console.log(id.padEnd(20), v.fit, v.latMin, v.latMax);
