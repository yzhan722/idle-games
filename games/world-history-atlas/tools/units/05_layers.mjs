// Stage 5: base-map layers on the real projection -> src/data/map_layers.js
//  - rivers and lakes from Natural Earth 50m (the atlas' own 22 rivers / 7 lakes keep their Chinese names)
//  - sea labels and mountain ranges from lon/lat
//  - event / city-state / trade-hub markers: warped from the old map, then kept inside their historic region
import fs from "node:fs";
import path from "node:path";
import { geoNaturalEarth1, geoPath, geoContains, geoCentroid, geoArea } from "d3-geo";
import { loadAtlas, readJSON, ATLAS, OUT, DATA } from "./lib.mjs";

const H = loadAtlas(["src/data/regions_geo.js", "src/data/city_states.js", "src/data/chronicle_annals_db.js", "src/data/timeline_keyframes.js", "src/data/map_units.js"]);
const MU = H.MAP_UNITS;
const P = MU.proj;
const proj = geoNaturalEarth1().rotate([P.rotate, 0]).scale(P.scale).translate([P.tx, P.ty]).precision(0);
const fmt = v => Math.round(v * 10) / 10;
// path writer: projected, thinned (points closer than MIN_STEP are dropped), relative commands, one decimal
const MIN_STEP = 0.9;
const f1 = v => { const t = (Math.round(v * 10) / 10).toString(); return t.replace(/^(-?)0\./, "$1."); };
function gp(obj) {
  let out = "";
  const ctx = { pts: [], closed: false,
    moveTo(x, y) { this.flush(); this.pts = [[x, y]]; this.closed = false; },
    lineTo(x, y) { const l = this.pts[this.pts.length - 1]; if (!l || Math.hypot(x - l[0], y - l[1]) >= MIN_STEP) this.pts.push([x, y]); else this.last = [x, y]; },
    closePath() { this.closed = true; this.flush(); },
    flush() {
      const pts = this.pts; if (this.last && pts.length) { pts.push(this.last); } this.last = null;
      if (pts.length < 2) { this.pts = []; return; }
      let cx = 0, cy = 0, seg = "";
      pts.forEach(([x, y], i) => { x = Math.round(x * 10) / 10; y = Math.round(y * 10) / 10; const dx = f1(x - cx), dy = f1(y - cy);
        seg += (i === 0 ? "M" + f1(x) + " " + f1(y) : (i === 1 ? "l" : (dx.startsWith("-") ? "" : " ")) + dx + (dy.startsWith("-") ? "" : " ") + dy); cx = x; cy = y; });
      out += seg + (this.closed ? "z" : ""); this.pts = [];
    },
    arc() {}
  };
  geoPath(proj, ctx)(obj); ctx.flush();
  return out;
}

// ---------- rivers
const RIVERS = {
  "黄河": /^(Huang|Yellow)$/, "长江": /^(Yangtze|Chang Jiang|Jinsha)$/, "珠江": /^Xi$/, "黑龙江": /^(Amur|Heilong Jiang)$/,
  "塔里木河": /^Tarim$/, "湄公河": /^(Mekong|Lancang)$/, "伊洛瓦底江": /^(Ayeyarwady|Irrawaddy)/, "恒河": /^Ganges$/,
  "印度河": /^Indus$/, "阿姆河": /^Amu\s+Darya$/, "锡尔河": /^Syr Darya$/, "底格里斯河": /^Tigris$/, "幼发拉底河": /^Euphrates$/,
  "尼罗河": /^(Nile|White Nile|Mountain Nile|Albert Nile|Victoria Nile|Blue Nile)$/, "伏尔加河": /^Volga$/,
  "第聂伯河": /^(Dnieper|Dnipro)$/, "多瑙河": /^(Danube|Donau)$/, "莱茵河": /^(Rhine|Rhein|Rhin)$/, "尼日尔河": /^Niger$/,
  "刚果河": /^(Congo|Lualaba)$/, "密西西比河": /^Mississippi$/, "亚马逊河": /^Amazonas$/
};
const rv = readJSON(path.join(DATA, "ne_50m_rivers_lake_centerlines.geojson")).features;
const rivers = [];
for (const old of H.RIVERS) {
  const re = RIVERS[old.name];
  const feats = re ? rv.filter(f => [f.properties.name, f.properties.name_en].some(n => n && re.test(n.trim()))) : [];
  if (!feats.length) { console.log("river not matched:", old.name); continue; }
  const coll = { type: "FeatureCollection", features: feats };
  const d = gp(coll);
  // label: on the longest line, 40% along it
  let best = null, bl = -1;
  for (const f of feats) {
    const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const l of lines) if (l.length > bl) { bl = l.length; best = l; }
  }
  const [lx, ly] = proj(best[Math.floor(best.length * 0.4)]);
  rivers.push({ name: old.name, d, lx: fmt(lx), ly: fmt(ly - 3) });
}

// ---------- lakes (named ones keep the atlas' labels, other large lakes are drawn unlabelled)
const LAKES = { "北美五大湖": /^Lake (Superior|Michigan|Huron|Erie|Ontario)$/, "马拉维湖": /^Lake Malawi$/, "维多利亚湖": /^Lake Victoria$/,
  "贝加尔湖": /^Lake Baikal$/, "咸海": /Aral Sea$/, "巴尔喀什湖": /^Lake Balkhash$/, "坦噶尼喀湖": /^Lake Tanganyika$/ };
const lk = readJSON(path.join(DATA, "ne_50m_lakes.geojson")).features;
const used = new Set();
const seas = [];
for (const [name, re] of Object.entries(LAKES)) {
  const feats = lk.filter(f => re.test(f.properties.name || ""));
  feats.forEach(f => used.add(f));
  if (!feats.length) { console.log("lake not matched:", name); continue; }
  const coll = { type: "FeatureCollection", features: feats };
  const [lx, ly] = proj(geoCentroid(coll));
  seas.push({ name, d: gp(coll), lx: fmt(lx + 6), ly: fmt(ly - 4), lake: true });
}
const others = lk.filter(f => !used.has(f) && (f.properties.scalerank ?? 9) <= 2);
const extraLakes = gp({ type: "FeatureCollection", features: others });

const SEA_LABELS = { "地中海": [17, 35.2], "黑海": [34, 43.2], "红海": [38.4, 20.5], "波斯湾": [51.6, 26.8], "波罗的海": [19.3, 57.2],
  "北海": [3, 56.2], "日本海": [134.5, 40.2], "南海": [114, 14.5], "孟加拉湾": [88, 15], "阿拉伯海": [63, 15.5], "加勒比海": [-75, 15] };
for (const [name, ll] of Object.entries(SEA_LABELS)) { const [x, y] = proj(ll); seas.push({ name, lx: fmt(x), ly: fmt(y) }); }

// ---------- mountain ranges (lon/lat polylines)
const MOUNTAINS = {
  "喜马拉雅山脉": [[[73, 35.5], [77, 33], [81, 30.5], [85, 28.3], [89, 27.8], [93, 28.2], [95.5, 29]]],
  "昆仑与天山山脉": [[[75, 37], [80, 36.2], [86, 36], [92, 35.8], [98, 35.5]], [[70, 41.5], [76, 42], [81, 42.5], [87, 43.3], [94, 43]]],
  "兴都库什与帕米尔": [[[66, 34.5], [69, 35.3], [71.5, 36.3], [73.5, 38], [74.5, 39]]],
  "高加索与扎格罗斯山脉": [[[37.5, 44.8], [41, 43.4], [44.5, 42.7], [48, 41.5]], [[45, 36.5], [47, 34.5], [50, 31.5], [53, 29.5], [57, 27.5]]],
  "乌拉尔山脉": [[[59, 47], [58.5, 51.5], [59, 55], [59.5, 59], [60, 63], [63, 67], [66, 68.5]]],
  "阿尔卑斯与喀尔巴阡": [[[6.5, 44], [7, 46], [9, 46.5], [11.5, 47], [14, 47.3], [16, 47.5]], [[17.5, 48.7], [20, 49.3], [23, 48.6], [25, 47.7], [26, 46], [24, 45.4], [22.5, 45]]],
  "秦岭与太行山脉": [[[104, 34.2], [107, 33.9], [110, 33.9], [112, 33.6]], [[113.5, 35], [113.8, 37], [114.5, 39], [115.5, 40.3]]],
  "大兴安岭与长白山": [[[120, 43], [121.5, 46], [122.5, 49], [123, 52]], [[126, 41.5], [128, 42], [129.5, 43]]],
  "安第斯山脉": [[[-75, 10], [-77, 5], [-78, 0], [-79, -5], [-76, -12], [-71, -17], [-69, -22], [-69.5, -30], [-71, -38], [-72, -46], [-73.5, -52]]],
  "落基山脉": [[[-136, 63], [-128, 58], [-122, 53], [-116, 49], [-112, 45], [-108, 41], [-106, 37], [-106, 33]]]
};
const mountains = Object.entries(MOUNTAINS).map(([name, lines]) => ({ name, d: gp({ type: "MultiLineString", coordinates: lines }) }));

// ---------- markers
const W = MU.warp, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function warp(x, y) {
  const fx = (x - W.x0) / W.step, fy = (y - W.y0) / W.step;
  const i = clamp(Math.floor(fx), 0, W.nx - 2), j = clamp(Math.floor(fy), 0, W.ny - 2);
  const tx = clamp(fx - i, 0, 1), ty = clamp(fy - j, 0, 1), k = (ii, jj) => (jj * W.nx + ii) * 2;
  const a = k(i, j), b = k(i + 1, j), c = k(i, j + 1), d = k(i + 1, j + 1);
  return [0, 1].map(o => (1 - ty) * ((1 - tx) * W.xy[a + o] + tx * W.xy[b + o]) + ty * ((1 - tx) * W.xy[c + o] + tx * W.xy[d + o]));
}
const unitsLL = readJSON(path.join(OUT, "units_ll.json"));
// same winding fix as stage 3: exteriors clockwise for d3, and no polygon larger than a hemisphere
const signed = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return s; };
const fixPoly = poly => { const q = poly.map((r, k) => ((k === 0) === (signed(r) > 0) ? r : r.slice().reverse())); return geoArea({ type: "Polygon", coordinates: q }) > 2 * Math.PI ? q.map(r => r.slice().reverse()) : q; };
const unitFeat = {};
for (const u of unitsLL) unitFeat[u.id] = { type: "Feature", geometry: { type: "MultiPolygon", coordinates: u.geom.map(fixPoly) } };
const unitsOf = {};
for (const u of MU.units) (unitsOf[u.r] ||= []).push(u.id);
const DISTORTED = new Set(["na_west", "na_plains", "na_east", "caribbean", "mesoamerica", "andes", "brazil", "alaska_canada", "oceania", "malacca", "south_africa"]);
const insideRegion = (p, rid) => { const ll = proj.invert(p); return ll && (unitsOf[rid] || []).some(id => unitFeat[id] && geoContains(unitFeat[id], ll)); };
let moved = 0;
function place(x, y, rid) {
  const p = warp(x, y);
  if (!rid || !unitsOf[rid]) return p.map(fmt);
  if (insideRegion(p, rid)) return p.map(fmt);
  if (DISTORTED.has(rid)) { moved++; return MU.regionCenters[rid]; }
  return p.map(fmt);
}
const points = { ev: {}, cs: {}, hub: {} };
for (const ev of H.CHRONICLE_ANNALS) if (typeof ev.x === "number") points.ev[ev.id] = place(ev.x, ev.y, ev.regionId);
for (const cs of H.CITY_STATES) points.cs[cs.id] = place(cs.x, cs.y, cs.regionId);
for (const [key, rt] of Object.entries(H.TRADE_ROUTES)) (rt.hubs || []).forEach((h, i) => { points.hub[`${key}:${i}`] = place(h.x, h.y, h.regionId); });

const data = { rivers, seas, extraLakes, mountains, points };
const js = `// Generated by tools/units/05_layers.mjs — do not edit by hand.
// Rivers and lakes: Natural Earth 50m (public domain). Markers: old base-map points moved onto the new projection.
window.HistoryAtlas = window.HistoryAtlas || {};
window.HistoryAtlas.MAP_LAYERS = ${JSON.stringify(data)};
`;
fs.writeFileSync(path.join(ATLAS, "src/data/map_layers.js"), js, "utf8");
console.log("rivers", rivers.length, "seas", seas.length, "mountains", mountains.length, "markers moved into their region:", moved, "size", (js.length / 1024).toFixed(0), "KB");
