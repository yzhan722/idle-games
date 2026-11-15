/**
 * UnitMap — switches the atlas onto the province/state-level base map (src/data/map_units.js).
 *
 * Runs once after all data files and before the engine/renderer are built:
 *  - every coordinate drawn on the old hand-made base map (region label anchors, seas, rivers, mountains,
 *    trade routes, city-states, landmarks, chronicle markers, theater cameras) is moved onto the new
 *    Natural Earth projection through the precomputed warp grid;
 *  - exposes HistoryAtlas.unitOwnersAt(year, regionOwners) for the 1886-2026 CShapes ownership layer.
 * Data files themselves are left untouched, so the historic 105-region data keeps working as before.
 */
(function () {
  const H = window.HistoryAtlas = window.HistoryAtlas || {};
  const MU = H.MAP_UNITS;
  if (!MU || H._unitMapApplied) return;
  H._unitMapApplied = true;

  const W = MU.warp;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function warp(x, y) {
    const fx = (x - W.x0) / W.step, fy = (y - W.y0) / W.step;
    const i = clamp(Math.floor(fx), 0, W.nx - 2), j = clamp(Math.floor(fy), 0, W.ny - 2);
    const tx = clamp(fx - i, 0, 1), ty = clamp(fy - j, 0, 1);
    const k = (ii, jj) => (jj * W.nx + ii) * 2;
    const a = k(i, j), b = k(i + 1, j), c = k(i, j + 1), d = k(i + 1, j + 1);
    const X = (1 - ty) * ((1 - tx) * W.xy[a] + tx * W.xy[b]) + ty * ((1 - tx) * W.xy[c] + tx * W.xy[d]);
    const Y = (1 - ty) * ((1 - tx) * W.xy[a + 1] + tx * W.xy[b + 1]) + ty * ((1 - tx) * W.xy[c + 1] + tx * W.xy[d + 1]);
    return [Math.round(X * 10) / 10, Math.round(Y * 10) / 10];
  }
  // Absolute-command paths only (M/L/Q/C/Z with x,y pairs), which is what the old layers use
  const warpPath = d => typeof d === "string"
    ? d.replace(/(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/g, (_, a, b) => warp(+a, +b).join(","))
    : d;
  const warpXY = (o, kx = "x", ky = "y") => {
    if (o && typeof o[kx] === "number" && typeof o[ky] === "number") {
      const [x, y] = warp(o[kx], o[ky]);
      o[kx] = x; o[ky] = y;
    }
  };

  H.warpOldPoint = warp;
  H.MAP_VIEWBOX = MU.viewBox;

  // Historic regions keep their ids and data; only their label anchors move
  (H.REGIONS || []).forEach(r => {
    const c = MU.regionCenters[r.id];
    if (c) { r.cx = c[0]; r.cy = c[1]; } else { const [x, y] = warp(r.cx, r.cy); r.cx = x; r.cy = y; }
  });
  H.COASTLINES = MU.land;
  (H.SEAS || []).forEach(s => { s.d = s.d ? warpPath(s.d) : s.d; warpXY(s, "lx", "ly"); });
  (H.RIVERS || []).forEach(rv => { rv.d = warpPath(rv.d); warpXY(rv, "lx", "ly"); });
  (H.MOUNTAINS || []).forEach(m => { m.d = warpPath(m.d); warpXY(m, "lx", "ly"); });
  Object.values(H.TRADE_ROUTES || {}).forEach(rt => { rt.d = warpPath(rt.d); (rt.hubs || []).forEach(h => warpXY(h)); });
  (H.CITY_STATES || []).forEach(cs => warpXY(cs));
  (H.TIMELINE || []).forEach(k => (k.landmarks || []).forEach(lm => warpXY(lm)));
  (H.CHRONICLE_ANNALS || []).forEach(ev => warpXY(ev));

  // Theater cameras were stored as (scale, panX, panY) for the old view centred on (600, 295)
  const cx = MU.viewBox[0] + MU.viewBox[2] / 2 - 20, cy = MU.viewBox[1] + MU.viewBox[3] / 2 + 4.5;
  H.MAP_FOCUS_CENTER = [cx, cy];
  (H.THEATERS || []).forEach(th => {
    if (th.id === "world" || !th.scale) return;
    const [fx, fy] = warp((600 - th.panX) / th.scale, (295 - th.panY) / th.scale);
    th.panX = Math.round((cx - fx * th.scale) * 10) / 10;
    th.panY = Math.round((cy - fy * th.scale) * 10) / 10;
  });

  // Unit-level holders (CShapes from 1886, plus a few earlier rows for coarse regions); gaps use the historic region
  H.unitOwnersAt = function (year, regionOwners) {
    const out = {};
    const y = Math.min(year, 2026);
    for (const u of MU.units) {
      let o = regionOwners[u.r] || null;
      const seq = MU.modern[u.id];
      if (seq) {
        for (const s of seq) { if (y >= s[0] && y < s[1]) { if (s[2]) o = s[2]; break; } }
      }
      out[u.id] = o;
    }
    return out;
  };
})();
