// Robust polygon boolean ops on GeoJSON-style MultiPolygons ([[outer, ...holes], ...]) via Clipper (integer math).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ClipperLib = require("clipper-lib");
const SCALE = 1e6;

// accept a Polygon ([ring,...]) or a MultiPolygon ([[ring,...],...])
const asMulti = g => (!g || !g.length) ? [] : typeof g[0][0][0] === "number" ? [g] : g;
const toPaths = g => {
  const mp = asMulti(g);
  const out = [];
  for (const poly of mp) for (const ring of poly) {
    const p = ring.map(([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) }));
    if (p.length > 2) out.push(p);
  }
  return out;
};
function treeToMP(tree) {
  const mp = [];
  const ring = c => { const r = c.Contour().map(pt => [pt.X / SCALE, pt.Y / SCALE]); if (r.length) r.push(r[0]); return r; };
  const walk = node => {
    for (const outer of node.Childs()) {          // outer rings
      const poly = [ring(outer)];
      for (const hole of outer.Childs()) {         // holes
        poly.push(ring(hole));
        walk(hole);                                // islands inside holes
      }
      if (poly[0].length > 3) mp.push(poly);
    }
  };
  walk(tree);
  return mp;
}
function run(type, subj, clip) {
  const c = new ClipperLib.Clipper();
  c.AddPaths(toPaths(subj), ClipperLib.PolyType.ptSubject, true);
  if (clip) c.AddPaths(toPaths(clip), ClipperLib.PolyType.ptClip, true);
  const tree = new ClipperLib.PolyTree();
  c.Execute(type, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return treeToMP(tree);
}
export const union = (...gs) => run(ClipperLib.ClipType.ctUnion, gs.flatMap(asMulti), null);
export const intersection = (a, b) => run(ClipperLib.ClipType.ctIntersection, a, b);
export const difference = (a, ...bs) => run(ClipperLib.ClipType.ctDifference, a, bs.flatMap(asMulti));
