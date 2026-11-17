// Stage 3: project units to the new base map and write src/data/map_units.js
//  - Natural Earth projection, central meridian 11°E (cut falls between the two Diomede islands)
//  - unit paths, coast / country / province border lines, land outline
//  - historic-region label anchors in the new coordinates
//  - modern ownership intervals (1886-2026) as polity names, "#old" = use the historic region's owner
//  - warp grid: old base-map coordinates -> new coordinates (for rivers, routes, city-states, event markers...)
import fs from "node:fs";
import path from "node:path";
import { geoNaturalEarth1, geoPath, geoContains, geoArea } from "d3-geo";
import * as topoClient from "topojson-client";
import { loadAtlas, parsePath, oldToLL, readJSON, ATLAS, OUT, HERE } from "./lib.mjs";
import { polityFor } from "./polity_map.mjs";
import { FALLBACK_GW, FALLBACK_UNIT } from "./fallback.mjs";
import { PRE1886, PRE1886_SKIP_REGIONS } from "./pre1886.mjs";
// researched per-unit rows before 1886 (one JSON per area, see out/r3/PRE1886_BRIEF.md)
const R3 = path.join(HERE, "research");
const RESEARCH = fs.existsSync(R3) ? fs.readdirSync(R3).filter(f => /^pre_[a-z]+\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(R3, f), "utf8")).rows || {}) : [];

const units = readJSON(path.join(OUT, "units_ll.json"));
const modernRaw = readJSON(path.join(OUT, "modern_raw.json"));
const topo = readJSON(path.join(OUT, "admin_topo.json"));
const H = loadAtlas(["src/data/regions_geo.js", "src/data/empires_db.js"]);
const EMP = H.EMPIRES;

// ---------- projection
const ROTATE = -11, SCALE = 286, PAD = 8;
const proj0 = geoNaturalEarth1().rotate([ROTATE, 0]).scale(SCALE).translate([0, 0]).precision(0);
const land = topoClient.merge(topo, topo.objects.a.geometries);
const b = geoPath(proj0).bounds(land);
const TX = -b[0][0] + PAD, TY = -b[0][1] + PAD;
const W = Math.ceil(b[1][0] - b[0][0] + 2 * PAD), Hh = Math.ceil(b[1][1] - b[0][1] + 2 * PAD);
const proj = geoNaturalEarth1().rotate([ROTATE, 0]).scale(SCALE).translate([TX, TY]).precision(0);
const gpAbs = geoPath(proj).digits(1);
// compact SVG path: relative moves, one decimal, no redundant separators
const fmt = v => { const t = (Math.round(v * 10) / 10).toString(); return t.replace(/^(-?)0\./, "$1."); };
function compact(d) {
  if (!d) return d;
  let out = "", cx = 0, cy = 0, sx = 0, sy = 0, lastL = false;
  for (const m of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    const cmd = m[1];
    if (cmd === "Z") { out += "z"; cx = sx; cy = sy; lastL = false; continue; }
    const nums = m[2].split(/[ ,]+/).filter(Boolean).map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      const x = Math.round(nums[i] * 10) / 10, y = Math.round(nums[i + 1] * 10) / 10;
      const dx = x - cx, dy = y - cy;
      const pair = (lead) => { const a = fmt(dx), b = fmt(dy); return (lead && !a.startsWith("-") ? " " : "") + a + (b.startsWith("-") ? "" : " ") + b; };
      if (cmd === "M" && i === 0) { out += "m" + pair(false); sx = x; sy = y; lastL = false; }
      else { if (dx === 0 && dy === 0) continue; out += lastL ? pair(true) : "l" + pair(false); lastL = true; }
      cx = x; cy = y;
    }
  }
  return out;
}
const gp = f => compact(gpAbs(f));
console.log("viewBox", W, Hh);

// d3 wants exterior rings clockwise (lon = x, lat = y up), holes counter-clockwise
const signed = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return s; }; // >0 clockwise
const rewind = mp => mp.map(poly => poly.map((r, k) => { const cw = signed(r) > 0; return (k === 0) === cw ? r : r.slice().reverse(); }));

// ---------- units
const outUnits = [];
const llFeature = {};
for (const u of units) {
  const f = { type: "Feature", geometry: { type: "MultiPolygon", coordinates: rewind(u.geom) } };
  // a ring wound the wrong way covers the rest of the sphere: flip any polygon larger than a hemisphere
  f.geometry.coordinates = f.geometry.coordinates.map(poly => geoArea({ type: "Polygon", coordinates: poly }) > 2 * Math.PI ? poly.map(r => r.slice().reverse()) : poly);
  llFeature[u.id] = f;
  const d = gp(f);
  if (!d) continue;
  // label anchor: centroid of the largest polygon, if it lies inside that polygon
  let big = f.geometry.coordinates[0], ba = -1;
  for (const poly of f.geometry.coordinates) { const a = geoPath(proj).area({ type: "Polygon", coordinates: poly }); if (a > ba) { ba = a; big = poly; } }
  const c = geoPath(proj).centroid({ type: "Polygon", coordinates: big });
  outUnits.push({ id: u.id, n: u.name, a: u.adm, r: u.region, d, x: +c[0].toFixed(1), y: +c[1].toFixed(1), w: +geoPath(proj).area(f).toFixed(1) });
}
console.log("units", outUnits.length);

// ---------- lines
const obj = topo.objects.a;
const iso = g => g.properties.iso;
const countryLines = gp(topoClient.mesh(topo, obj, (a, b2) => a !== b2 && iso(a) !== iso(b2)));
const provinceLines = gp(topoClient.mesh(topo, obj, (a, b2) => a !== b2 && iso(a) === iso(b2)));
const landPath = gp(land);

// ---------- historic-region anchors (largest-area unit of the region wins if the weighted centroid falls outside)
const regionCenters = {};
for (const r of H.REGIONS) {
  const us = outUnits.filter(u => u.r === r.id);
  if (!us.length) continue;
  let sx = 0, sy = 0, sw = 0;
  for (const u of us) { sx += u.x * u.w; sy += u.y * u.w; sw += u.w; }
  let p = [sx / sw, sy / sw];
  const ll = proj.invert(p);
  const inside = us.some(u => geoContains(llFeature[u.id], ll));
  if (!inside) { const big = us.reduce((a, c) => c.w > a.w ? c : a); p = [big.x, big.y]; }
  regionCenters[r.id] = [+p[0].toFixed(1), +p[1].toFixed(1)];
}

// ---------- modern ownership
const CONT_OLD_WW2 = new Set(["欧洲", "东亚", "东南亚", "北亚"]);
const regionCont = Object.fromEntries(H.REGIONS.map(r => [r.id, r.continent]));
const modern = {};
const missing = new Set();
for (const u of units) {
  const raw = modernRaw[u.id] || [];
  const perYear = [];
  for (let y = 1886; y <= 2026; y++) {
    const seg = raw.find(s => y >= s[0] && y < s[1]);
    let val = "#old";
    const fb = FALLBACK_UNIT[u.id] || FALLBACK_GW[u.iso];
    let gw = seg && seg[2] ? +seg[2].slice(3) : null;
    if (gw === null && fb) for (const [a, b2, h] of fb) if (y >= a && y < b2) { gw = h; break; }
    if (gw !== null) {
      const p = polityFor(gw, y);
      if (p && p.name) val = p.name;
      else if (!p) missing.add(`gw:${gw}@${y}`);
    }
    if (u.iso === "TWN") val = "#old";
    if (y >= 1939 && y <= 1945 && CONT_OLD_WW2.has(regionCont[u.region])) val = "#old";
    if (val !== "#old" && !EMP[val]) missing.add(`polity:${val}`);
    perYear.push(val);
  }
  const seq = [];
  perYear.forEach((v, i) => { const y = 1886 + i; const last = seq[seq.length - 1]; if (last && last[2] === v) last[1] = y + 1; else seq.push([y, y + 1, v]); });
  // earlier holders for coarse regions: hand table (pre1886.mjs) + researched rows (out/r3/pre_*.json).
  // Rows are layered year by year: country code < admin code < unit id, later sources over earlier ones.
  const layers = [];
  const skipHere = PRE1886_SKIP_REGIONS[u.iso] && PRE1886_SKIP_REGIONS[u.iso].has(u.region);
  if (!skipHere) { if (PRE1886[u.iso]) layers.push(PRE1886[u.iso]); if (PRE1886[u.adm] && u.adm !== u.iso) layers.push(PRE1886[u.adm]); }
  for (const R of RESEARCH) { if (R[u.iso]) layers.push(R[u.iso]); if (u.adm !== u.iso && R[u.adm]) layers.push(R[u.adm]); }
  for (const R of RESEARCH) if (R[u.id] && u.id !== u.adm) layers.push(R[u.id]);
  const early = new Map();
  for (const rows of layers) for (const [a, b2, n] of rows) {
    if (n !== "#none" && !EMP[n]) { missing.add(`polity:${n}`); continue; }
    for (let y = a; y < Math.min(b2, 1886); y++) if (y !== 0) early.set(y, n);
  }
  const pre = [];
  for (const y of [...early.keys()].sort((a, b2) => a - b2)) {
    const v = early.get(y), last = pre[pre.length - 1];
    if (last && last[2] === v && last[1] === y) last[1] = y + 1;
    else if (last && last[2] === v && last[1] === 0 && y === 1) last[1] = 2; // across the missing year 0
    else pre.push([y, y + 1, v]);
  }
  const full = [...pre, ...seq];
  // null = use the historic region; "" = no state (researched "#none")
  if (full.some(s => s[2] !== "#old")) modern[u.id] = full.map(s => [s[0], s[1], s[2] === "#old" ? null : s[2] === "#none" ? "" : s[2]]);
}
if (missing.size) console.log("unmapped:", [...missing].slice(0, 40).join(" "), missing.size > 40 ? `(+${missing.size - 40})` : "");

// ---------- warp grid: old base-map (x, y) -> new (x, y)
// Inside the core band the old map is the exact affine; elsewhere each distorted old region is mapped
// by its bounding box onto the true lon/lat box of the units assigned to it; points are blended by distance.
const RULE_ONLY = new Set(["na_west", "na_plains", "na_east", "caribbean", "mesoamerica", "andes", "brazil",
  "alaska_canada", "oceania", "malacca", "south_africa"]);
const oldRings = Object.fromEntries(H.REGIONS.map(r => [r.id, parsePath(r.path)]));
const bbox = pts => { let a = [1e9, 1e9, -1e9, -1e9]; for (const [x, y] of pts) a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)]; return a; };
const llBoxOf = rid => { const pts = []; for (const u of units) if (u.region === rid) for (const poly of u.geom) for (const p of poly[0]) pts.push(p); return pts.length ? bbox(pts) : null; };
const mappers = {};
for (const r of H.REGIONS) {
  const ob = bbox(oldRings[r.id].flat());
  const lb = llBoxOf(r.id);
  if (RULE_ONLY.has(r.id) && lb) {
    mappers[r.id] = ([x, y]) => [lb[0] + (x - ob[0]) / (ob[2] - ob[0]) * (lb[2] - lb[0]), lb[3] - (y - ob[1]) / (ob[3] - ob[1]) * (lb[3] - lb[1])];
  } else if (ob[1] < 50 && lb) {
    // high-latitude part of the old map is squeezed: stretch old y in [top, 50] onto [true north edge, 57.3N]
    const top = Math.min(lb[3], 78);
    mappers[r.id] = ([x, y]) => { const [lon, lat] = oldToLL([x, y]); if (y >= 50) return [lon, lat]; return [lon, 57.3 + (50 - y) / (50 - ob[1]) * (top - 57.3)]; };
  } else {
    mappers[r.id] = oldToLL;
  }
}
const distToRings = (p, rings) => { let inside = false, m = Infinity; for (const r of rings) { for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) inside = !inside; const dx = xj - xi, dy = yj - yi; const t = Math.max(0, Math.min(1, ((p[0] - xi) * dx + (p[1] - yi) * dy) / (dx * dx + dy * dy || 1))); m = Math.min(m, Math.hypot(p[0] - xi - t * dx, p[1] - yi - t * dy)); } } return inside ? 0 : m; };
const STEP = 10, X0 = -40, Y0 = -20, NX = Math.ceil((1300 - X0) / STEP) + 1, NY = Math.ceil((640 - Y0) / STEP) + 1;
const warp = [];
for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
  const p = [X0 + i * STEP, Y0 + j * STEP];
  let sx = 0, sy = 0, sw = 0;
  for (const r of H.REGIONS) {
    const d = distToRings(p, oldRings[r.id]);
    if (d > 80) continue;
    const w = 1 / Math.pow(d + 1, 3);
    const [lon, lat] = mappers[r.id](p);
    sx += lon * w; sy += lat * w; sw += w;
  }
  let ll = sw ? [sx / sw, sy / sw] : oldToLL(p);
  ll = [Math.max(-180, Math.min(180, ll[0])), Math.max(-85, Math.min(85, ll[1]))];
  const q = proj(ll) || [0, 0];
  warp.push(+q[0].toFixed(1), +q[1].toFixed(1));
}

// ---------- write
const data = {
  viewBox: [0, 0, W, Hh],
  proj: { rotate: ROTATE, scale: SCALE, tx: +TX.toFixed(3), ty: +TY.toFixed(3) },
  land: landPath, borders: { country: countryLines, province: provinceLines },
  units: outUnits, regionCenters, modern,
  warp: { x0: X0, y0: Y0, step: STEP, nx: NX, ny: NY, xy: warp }
};
const js = `// Generated by tools/units/03_build.mjs — do not edit by hand.
// Province/state-level map units (Natural Earth 50m; ownership from 1886 by CShapes 2.0, ETH Zurich, CC BY-NC-SA 4.0).
window.HistoryAtlas = window.HistoryAtlas || {};
window.HistoryAtlas.MAP_UNITS = ${JSON.stringify(data)};
`;
fs.writeFileSync(path.join(ATLAS, "src/data/map_units.js"), js, "utf8");
console.log("map_units.js", (js.length / 1024).toFixed(0), "KB; modern units", Object.keys(modern).length);
