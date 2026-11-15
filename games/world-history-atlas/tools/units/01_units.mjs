// Stage 1: build map units in lon/lat.
// unit = (modern admin area: province/state for the 9 big countries, whole country elsewhere) ∩ (historic region)
// Output: out/units_ll.json  [{ id, name, adm, iso, region, mode, geom: MultiPolygon(lon/lat) }]
import path from "node:path";
import * as pc from "./geo.mjs";
import * as topoServer from "topojson-server";
import * as topoSimplify from "topojson-simplify";
import * as topoClient from "topojson-client";
import { loadAtlas, parsePath, oldToLL, multiArea, readJSON, writeJSON, DATA, OUT } from "./lib.mjs";
import { ruleFor, regionByLocation } from "./rules.mjs";

const BIG = new Set(["CHN", "USA", "RUS", "IND", "BRA", "CAN", "AUS", "IDN", "ZAF"]);
// Old regions whose geometry is too distorted to intersect with real borders: units get them by rule instead
const RULE_ONLY = new Set(["na_west", "na_plains", "na_east", "caribbean", "mesoamerica", "andes", "brazil",
  "alaska_canada", "oceania", "malacca", "south_africa"]);
// Trust box: inside it the old base map follows the affine projection closely
const TRUST = [[[-25, 0], [150, 0], [150, 57], [-25, 57], [-25, 0]]];

const H = loadAtlas(["src/data/regions_geo.js"]);
const oldLL = {};
for (const r of H.REGIONS) {
  if (RULE_ONLY.has(r.id)) continue;
  const mp = pc.union(...parsePath(r.path).map(ring => [ring.map(oldToLL)]));
  const clipped = pc.intersection(mp, [TRUST]);
  if (clipped.length) oldLL[r.id] = clipped;
}

// ---- 1. collect admin features
const adm0 = readJSON(path.join(DATA, "ne_50m_admin_0_countries.geojson")).features;
const adm1 = readJSON(path.join(DATA, "ne_50m_admin_1_states_provinces.geojson")).features;
const feats = [];
for (const f of adm0) {
  const p = f.properties, a3 = p.ADM0_A3;
  if (BIG.has(a3) || a3 === "ATA") continue;
  feats.push({ type: "Feature", properties: { adm: a3, iso: a3, name: p.NAME_ZH || p.NAME, name_en: p.NAME }, geometry: f.geometry });
}
for (const f of adm1) {
  const p = f.properties;
  if (!BIG.has(p.adm0_a3)) continue;
  feats.push({ type: "Feature", properties: { adm: p.iso_3166_2 || `${p.adm0_a3}-${p.name}`, iso: p.adm0_a3, name: p.name_zh || p.name, name_en: p.name }, geometry: f.geometry });
}
console.log("admin features", feats.length);

// ---- 2. shared-arc topology, then simplify (planar weight in deg^2)
let topo = topoServer.topology({ a: { type: "FeatureCollection", features: feats } }, 1e5);
topo = topoSimplify.presimplify(topo);
topo = topoSimplify.simplify(topo, Number(process.env.SIMPLIFY || 0.02));
const simple = topoClient.feature(topo, topo.objects.a).features;
writeJSON(path.join(OUT, "admin_topo.json"), topo); // stage 3 draws country / province border lines from its shared arcs

const asMP = g => !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.coordinates;
const bboxOf = mp => { let a = [180, 90, -180, -90]; for (const p of mp) for (const [x, y] of p[0]) { a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)]; } return a; };
const centroid = mp => { let sx = 0, sy = 0, sa = 0; for (const p of mp) { const r = p[0]; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const c = r[j][0] * r[i][1] - r[i][0] * r[j][1]; sx += (r[j][0] + r[i][0]) * c; sy += (r[j][1] + r[i][1]) * c; sa += c; } } return sa ? [sx / (3 * sa), sy / (3 * sa)] : mp[0][0][0]; };
const distToMP = (pt, mp) => { let m = Infinity; for (const p of mp) for (const r of p) for (let i = 0; i < r.length - 1; i++) { const a = r[i], b = r[i + 1], dx = b[0] - a[0], dy = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); m = Math.min(m, Math.hypot(pt[0] - a[0] - t * dx, pt[1] - a[1] - t * dy)); } return m; };
const MIN_PIECE = 0.3; // deg^2 (~3000 km2): smaller intersection pieces are folded into a neighbour

// ---- 3. intersect each admin area with the historic regions
const units = [], unresolved = [];
for (const f of simple) {
  const pr = f.properties; let geom = asMP(f.geometry);
  if (process.env.TRACE) console.error('>', pr.adm, pr.name_en);
  try { geom = pc.union(geom); } catch (e) { console.error('normalize failed', pr.adm, e.message); }
  if (!geom.length) continue;
  const total = Math.abs(multiArea(geom));
  if (total < 0.01) continue; // sub-pixel islets at world scale
  const rule = ruleFor(pr, centroid(geom));
  const pieces = {};
  if (!rule || rule.mode !== "whole") {
    const bb = bboxOf(geom);
    for (const [rid, rmp] of Object.entries(oldLL)) {
      const rb = bboxOf(rmp);
      if (rb[0] > bb[2] || rb[2] < bb[0] || rb[1] > bb[3] || rb[3] < bb[1]) continue;
      const inter = pc.intersection(geom, rmp);
      if (inter.length) pieces[rid] = inter;
    }
  }
  // fold sliver pieces (border misalignment between old and real geometry) into the nearest other piece
  let ids = Object.keys(pieces).sort((a, b) => Math.abs(multiArea(pieces[a])) - Math.abs(multiArea(pieces[b])));
  for (const rid of ids) {
    const rest = Object.keys(pieces).filter(k => k !== rid);
    if (!rest.length || Math.abs(multiArea(pieces[rid])) >= MIN_PIECE) continue;
    const c = centroid(pieces[rid]); let best = rest[0], bd = Infinity;
    for (const k of rest) { const d = distToMP(c, pieces[k]); if (d < bd) { bd = d; best = k; } }
    pieces[best] = pc.union(pieces[best], pieces[rid]); delete pieces[rid];
  }
  ids = Object.keys(pieces);
  // leftover = part of the admin area not covered by any trusted historic region
  let left = ids.length ? pc.difference(geom, ...ids.map(k => pieces[k])) : geom;
  const leftArea = Math.abs(multiArea(left));
  if (leftArea > 1e-6) {
    if (rule && rule.region && (!ids.length || rule.mode === "whole" || leftArea / total > 0.5)) {
      pieces[rule.region] = pieces[rule.region] ? pc.union(pieces[rule.region], left) : left;
    } else if (ids.length) {
      for (const poly of left) { // each leftover polygon joins the nearest piece, unless it is far away overseas
        const c = centroid([poly]);
        let best = ids[0], bd = Infinity;
        for (const k of ids) { const d = distToMP(c, pieces[k]); if (d < bd) { bd = d; best = k; } }
        const far = bd > 8 ? regionByLocation(c) : null;
        if (far) best = far;
        pieces[best] = pieces[best] ? pc.union(pieces[best], [poly]) : [poly];
      }
    } else {
      const loc = regionByLocation(centroid(left));
      let reg = loc;
      if (!reg) { // small islands just outside every trusted region: nearest historic region
        const c = centroid(left); let bd = Infinity;
        for (const [rid, rmp] of Object.entries(oldLL)) { const d = distToMP(c, rmp); if (d < bd) { bd = d; reg = rid; } }
        unresolved.push(`${pr.adm} ${pr.name_en} -> ${reg} (${bd.toFixed(1)} deg)`);
      }
      pieces[reg] = left;
    }
  }
  const keys = Object.keys(pieces);
  for (const rid of keys) {
    units.push({
      id: keys.length > 1 ? `${pr.adm}~${rid}` : pr.adm,
      name: pr.name, name_en: pr.name_en, adm: pr.adm, iso: pr.iso, region: rid,
      share: +(Math.abs(multiArea(pieces[rid])) / total).toFixed(3),
      geom: pieces[rid]
    });
  }
}
writeJSON(path.join(OUT, "units_ll.json"), units);
console.log("units", units.length, "unresolved", unresolved.length);
if (unresolved.length) console.log(unresolved.join("\n"));
