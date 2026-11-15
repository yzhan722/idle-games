// Stage 2: modern ownership 1886-2026 from CShapes 2.0 (with dependencies).
// For every unit and year (1 July), the CShapes polygon covering most of the unit decides the holder:
// independent -> that state's GW code; colony / protectorate / mandate / occupied -> the owner's GW code.
// Output: out/modern_raw.json  { unitId: [[fromYear, toYear, key], ...] }   key = "gw:<code>" (holder), toYear exclusive
//         out/cshapes_keys.json  every key with the CShapes names/years it covers (for the polity mapping table)
import path from "node:path";
import * as pc from "./geo.mjs";
import * as topoClient from "topojson-client";
import { readJSON, writeJSON, multiArea, OUT, DATA } from "./lib.mjs";

const topo = readJSON(path.join(DATA, "cran/cshapes/inst/extdata/cshapes_2_gw.topojson"));
const cs = topoClient.feature(topo, topo.objects.cshapes_2_gw).features.map(f => {
  const p = f.properties, g = f.geometry;
  const mp = !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  let bb = [180, 90, -180, -90];
  for (const poly of mp) for (const [x, y] of poly[0]) bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)];
  const y0 = +p.start.slice(0, 4) + (p.start.slice(5) > "07-01" ? 1 : 0);   // first year whose 1 July is covered
  const y1 = +p.end.slice(0, 4) + (p.end.slice(5) >= "07-01" ? 1 : 0);       // exclusive
  return { gw: p.gwcode, name: p.country_name, status: p.status, owner: p.owner, start: p.start, end: p.end, y0, y1, mp, bb };
}).filter(c => c.mp.length && c.y1 > c.y0);
console.log("cshapes features", cs.length);

const units = readJSON(path.join(OUT, "units_ll.json"));
const holderOf = c => (c.status === "independent" || !c.owner || c.owner === "N/A" || c.owner === "NA") ? c.gw : +c.owner;
const keys = {};
const out = {};
let done = 0;
for (const u of units) {
  let bb = [180, 90, -180, -90];
  for (const poly of u.geom) for (const [x, y] of poly[0]) bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)];
  const ua = Math.abs(multiArea(u.geom));
  const hits = [];
  for (const c of cs) {
    if (c.bb[0] > bb[2] || c.bb[2] < bb[0] || c.bb[1] > bb[3] || c.bb[3] < bb[1]) continue;
    const a = Math.abs(multiArea(pc.intersection(u.geom, c.mp)));
    if (a / ua > 0.01) hits.push({ c, share: a / ua });
  }
  const seq = [];
  for (let y = 1886; y <= 2026; y++) {
    const yy = Math.min(y, 2019);
    let best = null;
    for (const h of hits) if (yy >= h.c.y0 && yy < h.c.y1 && (!best || h.share > best.share)) best = h;
    let key = null;
    if (best && best.share >= 0.3) {
      const holder = holderOf(best.c);
      key = `gw:${holder}`;
      const k = (keys[key] ||= { names: {}, years: [9999, 0] });
      const nm = `${best.c.name}${best.c.status !== "independent" ? ` [${best.c.status}]` : ""}`;
      k.names[nm] = (k.names[nm] || 0) + 1;
      k.years = [Math.min(k.years[0], y), Math.max(k.years[1], y)];
    }
    const last = seq[seq.length - 1];
    if (last && last[2] === key) last[1] = y + 1; else seq.push([y, y + 1, key]);
  }
  out[u.id] = seq;
  if (++done % 100 === 0) console.log(done, "units");
}
writeJSON(path.join(OUT, "modern_raw.json"), out);
writeJSON(path.join(OUT, "cshapes_keys.json"), keys);
console.log("keys", Object.keys(keys).length);
