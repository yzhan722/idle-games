// SVG World Map Renderer with Layered Bathymetry, Harmonized Imperial Gradients, Ambient Motes & Smooth Camera
window.HistoryAtlas = window.HistoryAtlas || {};

class MapRenderer {
  constructor(svgElement, regions, rivers, tradeRoutes, empires, onSelectRegion, onSelectRoute) {
    this.svg = svgElement;
    this.regions = regions;
    // Province/state-level map units (src/data/map_units.js); each belongs to one historic region (u.r)
    const MU = window.HistoryAtlas.MAP_UNITS;
    this.units = MU && MU.units ? MU.units : null;
    this._regionName = {};
    regions.forEach(r => { this._regionName[r.id] = r; });
    this.rivers = rivers;
    this.seas = window.HistoryAtlas.SEAS || [];
    this.mountains = window.HistoryAtlas.MOUNTAINS || [];
    this.tradeRoutes = tradeRoutes;
    this.empires = empires;
    this.onSelectRegion = onSelectRegion;
    this.onSelectRoute = onSelectRoute || null;

    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.highlightedEmpire = null;
    this.hoveredRegionId = null;
    this.hoveredEmpire = null;
    this._lastState = null;
    this._lastSelectedId = null;
    this.showCampaigns = true;
    this.showRoutes = true;
    this.focusedRouteId = null;
    this._animFrame = null;
    this._prevOwners = {};
    this._empireGradMap = {};
    this._bannerNodes = {};
    this._lastCampaignsSig = "";
    this._lastCityStatesSig = "";
    this._lastLandmarksSig = "";

    this._initTooltip();
    this._initLayers();
    this._bindPanZoom();
  }

  // Blend hex color with warm antique pigment (#dfd2bc) for rich museum-atlas tones
  // Capitals of the states on the map this year. Nodes are reused; only what changed touches the DOM.
  // Major states' capitals show at world view, the rest (and every name) once the map is zoomed in.
  _syncCapitals(year, owners, majorNames) {
    const CAP = window.HistoryAtlas.CAPITALS;
    if (!CAP || !this.capitalsLayer) return;
    const want = {};
    for (const emp of owners) {
      const rows = CAP[emp];
      if (!rows) continue;
      const row = rows.find(r => year >= r[0] && year < r[1]);
      if (!row) continue;
      const key = `${row[2]}@${row[3]},${row[4]}`;
      // two states sharing one capital (e.g. a successor in the same year) draw it once
      if (!want[key] || majorNames.has(emp)) want[key] = { emp, name: row[2], x: row[3], y: row[4], major: majorNames.has(emp) };
    }
    for (const key of Object.keys(this._capitalNodes)) {
      if (!want[key]) { this._capitalNodes[key].remove(); delete this._capitalNodes[key]; }
    }
    const NS = "http://www.w3.org/2000/svg";
    for (const [key, c] of Object.entries(want)) {
      let g = this._capitalNodes[key];
      if (!g) {
        g = document.createElementNS(NS, "g");
        g.setAttribute("transform", `translate(${c.x}, ${c.y})`);
        g.innerHTML = `<circle class="capital-ring" r="1.9"/><circle class="capital-core" r="0.8"/><text class="capital-label" x="2.8" y="1.1"></text><title></title>`;
        this.capitalsLayer.appendChild(g);
        this._capitalNodes[key] = g;
      }
      const cls = `capital${c.major ? " is-major" : ""}`;
      if (g.getAttribute("class") !== cls) g.setAttribute("class", cls);
      const t = g.querySelector("text");
      if (t.textContent !== c.name) { t.textContent = c.name; g.querySelector("title").textContent = `${c.name} · ${c.emp}都城`; }
    }
  }

  // Theme switch (night / paper): recompute every state's colours and repaint all units once
  refreshPalette() {
    const HA = window.HistoryAtlas;
    if (!HA.empirePalette) return;
    for (const [empName, empObj] of Object.entries(this.empires)) {
      if (this._empireGradMap[empName]) Object.assign(this._empireGradMap[empName], HA.empirePalette(empName, empObj.color));
    }
    this._paintSig = {};
    if (this._lastState) this.renderState(this._lastState, this._lastSelectedId);
  }

  _harmonizeColor(hex) {
    const clean = (hex || "#8899aa").replace("#", "");
    const num = parseInt(clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean, 16) || 0x8899aa;
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;

    // Soften overly bright channels and blend 16% warm parchment (#dfd2bc)
    r = Math.min(218, Math.round(r * 0.84 + 223 * 0.16));
    g = Math.min(205, Math.round(g * 0.84 + 210 * 0.16));
    b = Math.min(210, Math.round(b * 0.84 + 188 * 0.16));

    const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    const light = `#${toHex(r * 1.06 + 8)}${toHex(g * 1.06 + 6)}${toHex(b * 1.06 + 4)}`;
    const mid = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    const deep = `#${toHex(r * 0.76)}${toHex(g * 0.76)}${toHex(b * 0.78)}`;
    return { light, mid, deep };
  }

  _initTooltip() {
    let tip = document.getElementById("landmark-tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "landmark-tooltip";
      tip.className = "landmark-tooltip";
      document.body.appendChild(tip);
    }
    this.tooltipEl = tip;
  }

  _showTooltip(e, lm, year) {
    if (!this.tooltipEl) return;
    const yrStr = year < 0 ? `公元前 ${Math.abs(year)} 年` : `公元 ${year} 年`;
    const badge = lm.icon || "史诗地标";
    const desc = lm.desc || `发生于 ${yrStr} 前后的重大历史坐标事件：${lm.title}。`;
    this.tooltipEl.innerHTML = `
      <div class="lt-head">
        <span class="lt-badge">${badge}</span>
        <span class="lt-year">${yrStr}</span>
      </div>
      <div class="lt-title">${lm.title}</div>
      <div class="lt-desc">${desc}</div>
    `;
    this.tooltipEl.style.display = "block";
    this._moveTooltip(e);
  }

  _showCityStateTooltip(e, cs) {
    if (!this.tooltipEl) return;
    const fmt = (y) => (y < 0 ? `公元前 ${Math.abs(y)} 年` : `公元 ${y} 年`);
    const spanStr = `${fmt(cs.from)} — ${fmt(cs.to)}`;
    const state = this._lastState;
    const owner = state && state.owners ? state.owners[cs.regionId] : null;
    const badge = owner ? `自治/独立城邦（大区：${owner}）` : "独立城邦 / 城市国家";
    this.tooltipEl.innerHTML = `
      <div class="lt-head">
        <span class="lt-badge">${badge}</span>
        <span class="lt-year">${spanStr}</span>
      </div>
      <div class="lt-title" style="color:#e6d6b5">${cs.name}</div>
      <div class="lt-desc">${cs.note || ""}</div>
    `;
    this.tooltipEl.style.display = "block";
    this._moveTooltip(e);
  }

  _showRegionTooltip(e, r) {
    if (!this.tooltipEl || !this._lastState) return;
    const state = this._lastState;
    const owner = (this._unitOwners || state.owners)[r.id];
    const regId = r.unit ? r.region : r.id;
    const emp = owner ? this.empires[owner] : null;
    const yr = state.year;
    const yrStr = yr < 0 ? `公元前 ${Math.abs(yr)} 年` : `公元 ${yr} 年`;
    const regShort = r.unit ? `${r.name} · ${String(r.regionName).split("(")[0]}` : r.name.split("(")[0];
    const culture = !owner && state.cultures ? state.cultures[regId] : null;
    const getInk = window.HistoryAtlas.getReadableInkColor || ((hex) => hex || "#b9b1a0");
    const titleColor = emp && emp.color ? getInk(emp.color, owner) : "#b9b1a0";
    const title = owner || (culture ? culture.name : "无统一政权");
    const capStr = emp
      ? `首都：${emp.capital} · ${emp.regime}`
      : (culture ? `${culture.kind} · ${culture.note}` : "此时尚无国家统治该地区");
    this.tooltipEl.innerHTML = `
      <div class="lt-head">
        <span class="lt-badge">${r.continent} · ${regShort}</span>
        <span class="lt-year">${yrStr}</span>
      </div>
      <div class="lt-title" style="color:${titleColor}">${title}</div>
      <div class="lt-desc">${capStr}</div>
    `;
    this.tooltipEl.style.display = "block";
    this._moveTooltip(e);
  }

  _showRouteTooltip(e, rt) {
    if (!this.tooltipEl) return;
    const yr = this._lastState ? this._lastState.year : 0;
    const yrStr = yr < 0 ? `公元前 ${Math.abs(yr)} 年` : `公元 ${yr} 年`;
    const hubsStr = (rt.hubs || []).map(h => h.name).join(" → ");
    this.tooltipEl.innerHTML = `
      <div class="lt-head">
        <span class="lt-badge">${rt.category || "跨洲商道"}</span>
        <span class="lt-year">${yrStr}</span>
      </div>
      <div class="lt-title" style="color:${rt.color || "#cfa55a"}">${rt.name}</div>
      <div class="lt-desc">
        <div style="color:#c8bca6;margin-bottom:3px;"><strong>兴衰纪年：</strong>${rt.active_span || "-"}</div>
        <div style="color:#d8ceb8;margin-bottom:3px;"><strong>枢纽脉络：</strong>${hubsStr}</div>
        <div style="color:#bfb49f;"><strong>大宗货殖：</strong>${rt.commodities || "-"}</div>
      </div>
    `;
    this.tooltipEl.style.display = "block";
    this._moveTooltip(e);
  }

  _showHubTooltip(e, rt, hub) {
    if (!this.tooltipEl) return;
    const state = this._lastState;
    const owner = state && hub.regionId ? state.owners[hub.regionId] : null;
    const ownerTag = owner ? `当世辖属：${owner}` : (rt.short_name || rt.name);
    this.tooltipEl.innerHTML = `
      <div class="lt-head">
        <span class="lt-badge">商路重镇 · ${rt.short_name || rt.name}</span>
        <span class="lt-year">${hub.role || "枢纽商埠"}</span>
      </div>
      <div class="lt-title" style="color:${rt.color || "#cfa55a"}">◎ ${hub.name}</div>
      <div class="lt-desc">
        <div style="color:#d8ceb8;margin-bottom:3px;"><strong>集散货殖：</strong>${hub.goods || rt.commodities || "-"}</div>
        <div style="color:#aba08c;">${ownerTag} · 点击定位并查阅右侧考据卡</div>
      </div>
    `;
    this.tooltipEl.style.display = "block";
    this._moveTooltip(e);
  }

  _applyHoverState() {
    const state = this._lastState;
    if (!state) return;
    const focusEmp = this.hoveredEmpire || this.highlightedEmpire || null;

    const ownersOf = this._unitOwners || state.owners;
    this._drawItems().forEach(it => {
      const owner = ownersOf[it.id];
      const el = document.getElementById("reg-" + it.id);
      if (el) el.classList.toggle("empire-hovered", Boolean(focusEmp && owner === focusEmp));
    });
    const hoveredRegion = this.hoveredRegionId && this._unitById && this._unitById[this.hoveredRegionId]
      ? this._unitById[this.hoveredRegionId].r : this.hoveredRegionId;
    this.regions.forEach(r => {
      const subLbl = document.getElementById("sublbl-" + r.id);
      if (subLbl) subLbl.classList.toggle("is-focused", r.id === hoveredRegion);
    });

    for (const [empName, record] of Object.entries(this._bannerNodes)) {
      if (record && record.g) {
        record.g.classList.toggle("is-focused", Boolean(focusEmp && empName === focusEmp));
      }
    }
  }

  setHoveredEmpire(empireName) {
    this.hoveredEmpire = empireName || null;
    this._applyHoverState();
  }

  _moveTooltip(e) {
    if (!this.tooltipEl || this.tooltipEl.style.display === "none") return;
    // Touch screens have no mouseleave: let the tooltip fade out on its own
    if (window.matchMedia && window.matchMedia("(hover: none)").matches) {
      clearTimeout(this._tipTimer);
      this._tipTimer = setTimeout(() => this._hideTooltip(), 2600);
    }
    const x = Math.min(window.innerWidth - 290, Math.max(16, e.clientX + 16));
    const y = Math.min(window.innerHeight - 130, Math.max(16, e.clientY - 24));
    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
  }

  // What the map paints: province/state units when available, else the historic regions themselves
  _drawItems() {
    if (this._items) return this._items;
    if (!this.units) { this._items = this.regions; return this._items; }
    const total = this.units.reduce((a, u) => a + u.w, 0) || 1;
    this._unitById = {};
    this._items = this.units.map(u => {
      const reg = this._regionName[u.r] || {};
      const it = { id: u.id, unit: true, path: u.d, cx: u.x, cy: u.y, area_weight: u.w * 50 / total,
        name: u.n, region: u.r, regionName: reg.name || u.r, continent: reg.continent || "" };
      this._unitById[u.id] = it;
      return it;
    });
    return this._items;
  }

  _hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = "none";
    }
  }

  _initLayers() {
    this.svg.innerHTML = "";
    this._paintSig = {};
    this._pathEl = {};

    // SVG Defs: Gradients, Glow Filters & Campaign Arrowhead
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    let gradHtml = `
      <marker id="campaign-arrowhead" markerWidth="6.5" markerHeight="6.5" refX="5.2" refY="3.25" orient="auto">
        <polygon points="0 0.6, 6 3.25, 0 5.9" fill="#ffefc2" fill-opacity="0.92" />
      </marker>
      <linearGradient id="land-empty-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#35404b" stop-opacity="0.95" />
        <stop offset="55%" stop-color="#2b353f" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#232c35" stop-opacity="0.95" />
      </linearGradient>
      <linearGradient id="continental-sheen-grad" x1="15%" y1="5%" x2="85%" y2="95%">
        <stop offset="0%" stop-color="#fff6e0" stop-opacity="0.11" />
        <stop offset="50%" stop-color="#ffffff" stop-opacity="0.02" />
        <stop offset="100%" stop-color="#050b12" stop-opacity="0.18" />
      </linearGradient>
      <pattern id="stateless-hatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
        <rect width="5" height="5" style="fill: var(--land-empty)" />
        <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(214, 200, 170, 0.16)" stroke-width="1.1" />
      </pattern>
      <filter id="soft-territory-glow" x="-8%" y="-8%" width="116%" height="116%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2.2" flood-color="#050a10" flood-opacity="0.55" />
      </filter>
    `;

    let idx = 0;
    const resolveDisplayHex = window.HistoryAtlas.getEmpireDisplayColor || ((_, hex) => hex);
    for (const [empName, empObj] of Object.entries(this.empires)) {
      const gid = `emp-grad-${idx++}`;
      const pal = window.HistoryAtlas.empirePalette ? window.HistoryAtlas.empirePalette(empName, empObj.color) : this._harmonizeColor(resolveDisplayHex(empName, empObj.color));
      this._empireGradMap[empName] = { id: gid, ...pal };
      gradHtml += `
        <radialGradient id="${gid}" cx="42%" cy="36%" r="72%">
          <stop offset="0%" stop-color="${pal.light}" stop-opacity="0.94" />
          <stop offset="65%" stop-color="${pal.mid}" stop-opacity="0.91" />
          <stop offset="100%" stop-color="${pal.deep}" stop-opacity="0.89" />
        </radialGradient>
      `;
    }
    defs.innerHTML = gradHtml;
    this.svg.appendChild(defs);

    this.viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.viewport.setAttribute("id", "map-viewport");
    this.svg.appendChild(this.viewport);

    // The province-level base map brings its own viewBox (Natural Earth projection)
    const vb = this._viewBox();
    this.svg.setAttribute("viewBox", vb.join(" "));

    // 1. Subtle Cartographic Graticule Grid
    const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gridGroup.setAttribute("class", "map-grid");
    for (let x = vb[0] + 45; x < vb[0] + vb[2]; x += 140) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x); line.setAttribute("y1", vb[1] - 40);
      line.setAttribute("x2", x); line.setAttribute("y2", vb[1] + vb[3] + 40);
      gridGroup.appendChild(line);
    }
    for (let y = vb[1] + 42; y < vb[1] + vb[3]; y += 110) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", vb[0] - 150); line.setAttribute("y1", y);
      line.setAttribute("x2", vb[0] + vb[2] + 150); line.setAttribute("y2", y);
      gridGroup.appendChild(line);
    }
    this.viewport.appendChild(gridGroup);

    // 1.5 Multi-Tier Coastal Bathymetry Shelf (3 concentric ocean depth rings)
    this.shelfLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    if (window.HistoryAtlas.COASTLINES) {
      ["bathymetry-deep", "bathymetry-mid", "bathymetry-shore"].forEach(cls => {
        const shelf = document.createElementNS("http://www.w3.org/2000/svg", "path");
        shelf.setAttribute("d", window.HistoryAtlas.COASTLINES);
        shelf.setAttribute("class", cls);
        this.shelfLayer.appendChild(shelf);
      });
    }
    this.viewport.appendChild(this.shelfLayer);

    // 2. Regions Layer
    this.regionsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.viewport.appendChild(this.regionsLayer);
    // Stateless hatch lies once under all units: a stateless unit is simply transparent, so a state appearing or
    // collapsing is a fade of fill and opacity instead of a hard swap between a pattern and a colour.
    const MUl = window.HistoryAtlas.MAP_UNITS;
    if (MUl && MUl.land) {
      const hatch = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hatch.setAttribute("d", MUl.land);
      hatch.setAttribute("class", "land-hatch");
      hatch.setAttribute("fill", "url(#stateless-hatch)");
      this.regionsLayer.appendChild(hatch);
    }

    // 2.2 Inland Lakes & Continental Outer Coastlines Layer
    this.seasLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.coastlinesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    if (window.HistoryAtlas.COASTLINES) {
      const sheen = document.createElementNS("http://www.w3.org/2000/svg", "path");
      sheen.setAttribute("d", window.HistoryAtlas.COASTLINES);
      sheen.setAttribute("fill", "url(#continental-sheen-grad)");
      sheen.setAttribute("style", "pointer-events:none;");
      this.coastlinesLayer.appendChild(sheen);

      const coast = document.createElementNS("http://www.w3.org/2000/svg", "path");
      coast.setAttribute("d", window.HistoryAtlas.COASTLINES);
      coast.setAttribute("class", "world-coastline");
      this.coastlinesLayer.appendChild(coast);
    }
    if (window.HistoryAtlas.EXTRA_LAKES) {
      const lakes = document.createElementNS("http://www.w3.org/2000/svg", "path");
      lakes.setAttribute("d", window.HistoryAtlas.EXTRA_LAKES);
      lakes.setAttribute("class", "inland-sea");
      this.seasLayer.appendChild(lakes);
    }
    this.seas.forEach(s => {
      if (s.d) {
        const sp = document.createElementNS("http://www.w3.org/2000/svg", "path");
        sp.setAttribute("d", s.d);
        sp.setAttribute("class", "inland-sea");
        this.seasLayer.appendChild(sp);
      }
      const st = document.createElementNS("http://www.w3.org/2000/svg", "text");
      st.setAttribute("x", s.lx);
      st.setAttribute("y", s.ly);
      st.setAttribute("class", "sea-label");
      st.textContent = s.name;
      this.seasLayer.appendChild(st);
    });
    this.viewport.appendChild(this.coastlinesLayer);
    this.viewport.appendChild(this.seasLayer);

    // 2.5 Mountain Ridges Layer
    this.mountainsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.mountains.forEach(m => {
      const mp = document.createElementNS("http://www.w3.org/2000/svg", "path");
      mp.setAttribute("d", m.d);
      mp.setAttribute("class", "mountain-ridge");
      this.mountainsLayer.appendChild(mp);
    });
    this.viewport.appendChild(this.mountainsLayer);

    // 3. Rivers Layer
    this.riversLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.rivers.forEach(rv => {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", rv.d);
      p.setAttribute("class", "river-path");
      this.riversLayer.appendChild(p);

      if (rv.lx && rv.ly) {
        const rl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        rl.setAttribute("x", rv.lx);
        rl.setAttribute("y", rv.ly);
        rl.setAttribute("class", "river-label");
        rl.textContent = rv.name;
        this.riversLayer.appendChild(rl);
      }
    });
    this.viewport.appendChild(this.riversLayer);

    // 4. Trade Routes, Subtle Copperplate Entrepot Hubs & Gentle Caravan Pearls Layer
    this.routesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    for (const [routeId, rt] of Object.entries(this.tradeRoutes)) {
      const grp = document.createElementNS("http://www.w3.org/2000/svg", "g");
      grp.setAttribute("id", "route-" + routeId);
      grp.setAttribute("class", "trade-route-group");

      const color = rt.color || "#cfa55a";
      const casing = document.createElementNS("http://www.w3.org/2000/svg", "path");
      casing.setAttribute("d", rt.d);
      casing.setAttribute("class", "trade-route-casing");
      grp.appendChild(casing);

      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("id", "rpath-" + routeId);
      p.setAttribute("d", rt.d);
      p.setAttribute("class", "trade-route");
      p.style.stroke = color;
      grp.appendChild(p);

      const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitPath.setAttribute("d", rt.d);
      hitPath.setAttribute("class", "trade-route-hit");
      hitPath.addEventListener("mouseenter", (e) => {
        grp.classList.add("is-hovered");
        this._showRouteTooltip(e, rt);
      });
      hitPath.addEventListener("mousemove", (e) => this._moveTooltip(e));
      hitPath.addEventListener("mouseleave", () => {
        grp.classList.remove("is-hovered");
        this._hideTooltip();
      });
      hitPath.addEventListener("click", (e) => {
        e.stopPropagation();
        this.setFocusedRoute(routeId);
        if (this.onSelectRoute) this.onSelectRoute(routeId, null);
      });
      grp.appendChild(hitPath);

      // (moving caravan beads removed: endless SMIL animations kept the page repainting while idle)

      // Historical Entrepot / Hub Micro-Ring Nodes (labels stay quiet until hover/focus)
      (rt.hubs || []).forEach((hub) => {
        const hg = document.createElementNS("http://www.w3.org/2000/svg", "g");
        hg.setAttribute("class", "route-hub-group");

        const hHit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hHit.setAttribute("cx", hub.x);
        hHit.setAttribute("cy", hub.y);
        hHit.setAttribute("r", "7");
        hHit.setAttribute("class", "route-hub-hit");

        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ring.setAttribute("cx", hub.x);
        ring.setAttribute("cy", hub.y);
        ring.setAttribute("r", "2.75");
        ring.setAttribute("class", "route-hub-ring");
        ring.style.stroke = color;

        const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        core.setAttribute("cx", hub.x);
        core.setAttribute("cy", hub.y);
        core.setAttribute("r", "1.05");
        core.setAttribute("class", "route-hub-core");

        const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        lbl.setAttribute("x", hub.x);
        lbl.setAttribute("y", hub.y - 5.2);
        lbl.setAttribute("class", "route-hub-label");
        lbl.textContent = hub.name.split("·")[0];

        hg.appendChild(hHit);
        hg.appendChild(ring);
        hg.appendChild(core);
        hg.appendChild(lbl);

        hg.addEventListener("mouseenter", (e) => {
          grp.classList.add("is-hovered");
          this._showHubTooltip(e, rt, hub);
        });
        hg.addEventListener("mousemove", (e) => this._moveTooltip(e));
        hg.addEventListener("mouseleave", () => {
          grp.classList.remove("is-hovered");
          this._hideTooltip();
        });
        hg.addEventListener("click", (e) => {
          e.stopPropagation();
          this.setFocusedRoute(routeId);
          if (this.onSelectRoute) {
            this.onSelectRoute(routeId, hub);
          } else if (hub.regionId) {
            this.onSelectRegion(hub.regionId);
          }
        });
        grp.appendChild(hg);
      });

      this.routesLayer.appendChild(grp);
    }
    this.viewport.appendChild(this.routesLayer);

    // 4.5 Dynamic Campaign Attack Arrows Layer
    this.campaignsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.viewport.appendChild(this.campaignsLayer);

    // 5. Region Sub-labels, Clustered Empire Banners, City-States & Interactive Landmarks Layer
    this.labelsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.empireBannersLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.cityStatesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.cityStatesLayer.setAttribute("class", "city-states-layer");
    this.landmarksLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.ambientLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.viewport.appendChild(this.labelsLayer);
    // capitals (src/data/capitals.js): a dot for every state on the map, the name only when zoomed in
    this.capitalsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.capitalsLayer.setAttribute("class", "capitals-layer");
    this._capitalNodes = {};
    this.viewport.appendChild(this.capitalsLayer);
    this.viewport.appendChild(this.empireBannersLayer);
    this.viewport.appendChild(this.cityStatesLayer);
    this.viewport.appendChild(this.landmarksLayer);
    this.viewport.appendChild(this.ambientLayer);

    // Populate map units (or historic regions on the legacy base map)
    this._drawItems().forEach(r => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", r.path);
      path.setAttribute("id", "reg-" + r.id);
      path.setAttribute("class", "region");
      path.addEventListener("mouseenter", (e) => {
        this.hoveredRegionId = r.id;
        this.hoveredEmpire = (this._lastState && (this._unitOwners || this._lastState.owners)[r.id]) || null;
        this._applyHoverState();
        this._showRegionTooltip(e, r);
      });
      path.addEventListener("mousemove", (e) => {
        this._moveTooltip(e);
      });
      path.addEventListener("mouseleave", () => {
        if (this.hoveredRegionId === r.id) {
          this.hoveredRegionId = null;
          this.hoveredEmpire = null;
          this._applyHoverState();
          this._hideTooltip();
        }
      });
      path.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectedUnitId = r.unit ? r.id : null;
        this.onSelectRegion(r.unit ? r.region : r.id, r.unit ? r.id : null);
      });
      this.regionsLayer.appendChild(path);
    });

    // Faint terrain (Natural Earth shaded relief, tools/relief/build_relief.py): shadows and highlights with alpha over
    // the fills, under borders and names. ~0.5 MB, so it is fetched only once the browser is idle after the first paint.
    const MUr = window.HistoryAtlas.MAP_UNITS;
    if (MUr && MUr.viewBox) {
      const relief = document.createElementNS("http://www.w3.org/2000/svg", "image");
      relief.setAttribute("class", "terrain-relief");
      relief.setAttribute("x", "0");
      relief.setAttribute("y", "0");
      relief.setAttribute("width", String(MUr.viewBox[2]));
      relief.setAttribute("height", String(MUr.viewBox[3]));
      relief.setAttribute("preserveAspectRatio", "none");
      this.regionsLayer.appendChild(relief);
      const ver = ((document.querySelector('script[src*="MapRenderer.js"]') || {}).src || "").match(/[?&]v=([^&]+)/);
      const load = () => {
        relief.addEventListener("load", () => relief.classList.add("is-loaded"), { once: true });
        relief.setAttribute("href", `src/assets/relief.webp${ver ? "?v=" + ver[1] : ""}`);
      };
      (window.requestIdleCallback || (cb => setTimeout(cb, 1500)))(load, { timeout: 4000 });
    }

    // Modern country and province borders sit above the fills
    const MUb = window.HistoryAtlas.MAP_UNITS;
    if (MUb && MUb.borders) {
      const bp = document.createElementNS("http://www.w3.org/2000/svg", "path");
      bp.setAttribute("d", MUb.borders.province);
      bp.setAttribute("class", "unit-border-province");
      this.regionsLayer.appendChild(bp);
      const bc = document.createElementNS("http://www.w3.org/2000/svg", "path");
      bc.setAttribute("d", MUb.borders.country);
      bc.setAttribute("class", "unit-border-country");
      this.regionsLayer.appendChild(bc);
    }

    // Province / state / country names, shown only when zoomed in far enough to read them
    if (this.units) {
      this.unitLabelsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this.unitLabelsLayer.setAttribute("class", "unit-labels");
      this._drawItems().forEach(it => {
        if (it.area_weight < 0.012) return;
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", it.cx);
        t.setAttribute("y", it.cy);
        t.setAttribute("class", "unit-label");
        t.textContent = it.name;
        this.unitLabelsLayer.appendChild(t);
      });
      this.labelsLayer.appendChild(this.unitLabelsLayer);
    }

    this.regions.forEach(r => {
      const subLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      subLbl.setAttribute("x", r.cx);
      subLbl.setAttribute("y", r.cy + 10);
      subLbl.setAttribute("id", "sublbl-" + r.id);
      subLbl.setAttribute("class", "region-sublabel");
      subLbl.textContent = r.name.split("(")[0];
      this.labelsLayer.appendChild(subLbl);
    });
  }

  // Screen point -> SVG user units (the viewBox is wider than the screen, so 1 px != 1 unit)
  _toSvgPoint(clientX, clientY) {
    const ctm = this.svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(ctm.inverse());
  }

  // Zoom to nextScale keeping the SVG point (svgX, svgY) fixed on screen
  _zoomAround(svgX, svgY, nextScale) {
    const clamped = Math.min(6.0, Math.max(0.75, nextScale));
    const localX = (svgX - this.panX) / this.scale;
    const localY = (svgY - this.panY) / this.scale;
    this.scale = clamped;
    this.panX = svgX - localX * this.scale;
    this.panY = svgY - localY * this.scale;
    this._applyTransform();
  }

  // Mouse, pen and touch share pointer events: one pointer pans, two pointers pinch-zoom.
  // A drag of more than a few pixels does not count as a click on a region.
  _bindPanZoom() {
    const pointers = new Map();
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let dragOrigin = null;
    this._suppressClick = false;

    const pinchInfo = () => {
      const [a, b] = [...pointers.values()];
      const mid = this._toSvgPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid };
    };

    this.svg.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (this._animFrame) cancelAnimationFrame(this._animFrame);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this._suppressClick = false;
      if (pointers.size === 1) {
        const p = this._toSvgPoint(e.clientX, e.clientY);
        dragOrigin = { x: e.clientX, y: e.clientY, svgX: p.x - this.panX, svgY: p.y - this.panY };
        this.isDragging = true;
      } else if (pointers.size === 2) {
        const info = pinchInfo();
        pinchStartDist = info.dist || 1;
        pinchStartScale = this.scale;
        this.isDragging = false;
      }
    });

    window.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2) {
        const info = pinchInfo();
        this._zoomAround(info.mid.x, info.mid.y, pinchStartScale * (info.dist / pinchStartDist));
        this._suppressClick = true;
        return;
      }
      if (!this.isDragging || !dragOrigin) return;
      if (Math.hypot(e.clientX - dragOrigin.x, e.clientY - dragOrigin.y) > 5) this._suppressClick = true;
      const p = this._toSvgPoint(e.clientX, e.clientY);
      this.panX = p.x - dragOrigin.svgX;
      this.panY = p.y - dragOrigin.svgY;
      this._applyTransform();
    });

    const release = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 1) {
        // Continue panning with the remaining finger after a pinch
        const [rest] = [...pointers.values()];
        const p = this._toSvgPoint(rest.x, rest.y);
        dragOrigin = { x: rest.x, y: rest.y, svgX: p.x - this.panX, svgY: p.y - this.panY };
        this.isDragging = true;
      } else if (pointers.size === 0) {
        this.isDragging = false;
        dragOrigin = null;
      }
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    // Swallow the click that ends a drag or pinch so it does not select a region
    this.svg.addEventListener("click", (e) => {
      if (this._suppressClick) {
        e.stopPropagation();
        e.preventDefault();
        this._suppressClick = false;
      }
    }, true);

    this.svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      // Keep the geographic point under the cursor fixed (PRD: mouse-centered zoom)
      const p = this._toSvgPoint(e.clientX, e.clientY);
      this._zoomAround(p.x, p.y, this.scale * factor);
    }, { passive: false });
  }

  _viewBox() {
    return window.HistoryAtlas.MAP_VIEWBOX || [-145, -22, 1530, 625];
  }

  // Camera centre in SVG units: viewBox centre for portrait, nudged left/down on desktop for the side panels
  _focusCenter(isPortrait) {
    const vb = this._viewBox();
    const mx = vb[0] + vb[2] / 2, my = vb[1] + vb[3] / 2;
    return isPortrait ? [mx, my] : [mx - 20, my + 4.5];
  }

  resetView() {
    this.animateCameraTo(1.0, 0, 0);
  }

  animateCameraTo(targetScale, targetPanX, targetPanY, duration = 680) {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    const startScale = this.scale;
    const startX = this.panX;
    const startY = this.panY;
    const startTime = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      // Gentle sine/cubic ease-in-out
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.scale = startScale + (targetScale - startScale) * ease;
      this.panX = startX + (targetPanX - startX) * ease;
      this.panY = startY + (targetPanY - startY) * ease;
      this._applyTransform();
      if (t < 1) {
        this._animFrame = requestAnimationFrame(step);
      }
    };
    this._animFrame = requestAnimationFrame(step);
  }

  focusOnPoint(svgX, svgY, targetScale = 2.0) {
    const isPortrait = window.innerHeight > window.innerWidth;
    const [cx, cy] = this._focusCenter(isPortrait);
    const targetPanX = cx - svgX * targetScale;
    const targetPanY = cy - svgY * targetScale;
    this.animateCameraTo(targetScale, targetPanX, targetPanY, 850);
  }

  focusTheater(th) {
    if (!th) return;
    if (th.id === "world") {
      this.resetView();
      return;
    }
    const isPortrait = window.innerHeight > window.innerWidth;
    if (!isPortrait) {
      this.animateCameraTo(th.scale, th.panX, th.panY);
      return;
    }
    // Extract desktop focal map coordinate from (600, 295), then scale up for tall portrait viewports
    // around viewBox midpoint (620, 290.5) so regional theaters fill the central map area cleanly.
    const [dcx, dcy] = this._focusCenter(false);
    const [pcx, pcy] = this._focusCenter(true);
    const focalX = (dcx - th.panX) / th.scale;
    const focalY = (dcy - th.panY) / th.scale;
    const aspect = window.innerHeight / Math.max(320, window.innerWidth);
    const boost = Math.min(2.15, Math.max(1.88, aspect * 0.95));
    const effScale = Math.min(5.6, Math.round(th.scale * boost * 100) / 100);
    const targetPanX = Math.round((pcx - focalX * effScale) * 10) / 10;
    const targetPanY = Math.round((pcy - focalY * effScale) * 10) / 10;
    this.animateCameraTo(effScale, targetPanX, targetPanY);
  }

  _applyTransform() {
    this.viewport.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.scale})`);
    // On portrait phones initial 1.8x overview shows all Afro-Eurasia at small px/unit,
    // so reveal .is-minor banners & stateless sublabels once zoomed into a theater (>= 2.6x portrait, >= 1.6x desktop)
    const minZoom = window.innerHeight > window.innerWidth ? 2.6 : 1.6;
    const zoomed = this.scale >= minZoom;
    this.svg.classList.toggle("map-zoomed-deep", this.scale >= (window.innerHeight > window.innerWidth ? 4.5 : 3.0));
    if (zoomed !== this._zoomedClass) {
      this._zoomedClass = zoomed;
      this.svg.classList.toggle("map-zoomed", zoomed);
      if (this._lastState && !this._inRenderState) {
        this.renderState(this._lastState, this._lastSelectedId);
      }
    }
  }

  setHighlightEmpire(empireName) {
    this.highlightedEmpire = empireName;
  }

  toggleCampaigns() {
    this.showCampaigns = !this.showCampaigns;
    return this.showCampaigns;
  }

  toggleRoutes() {
    this.showRoutes = !this.showRoutes;
    return this.showRoutes;
  }

  setFocusedRoute(routeId) {
    this.focusedRouteId = routeId || null;
    if (this._lastState) {
      this._syncRouteVisibility(this._lastState);
    }
  }

  _syncRouteVisibility(state) {
    const activeList = (this.showRoutes && state && state.routes) ? state.routes : [];
    const hasFocusedActive = Boolean(this.focusedRouteId && activeList.includes(this.focusedRouteId));
    for (const routeId of Object.keys(this.tradeRoutes)) {
      const routeEl = document.getElementById("route-" + routeId);
      if (!routeEl) continue;
      const isActive = activeList.includes(routeId);
      const isSelected = isActive && this.focusedRouteId === routeId;
      routeEl.classList.toggle("is-active", isActive);
      routeEl.classList.toggle("is-selected", isSelected);
      if (!isActive) {
        routeEl.style.opacity = "0";
      } else if (isSelected) {
        routeEl.style.opacity = "0.95";
      } else if (hasFocusedActive) {
        routeEl.style.opacity = "0.46";
      } else {
        routeEl.style.opacity = "0.74";
      }
    }
  }

  renderState(state, selectedRegionId) {
    this._inRenderState = true;
    try {
    this._lastState = state;
    this._lastSelectedId = selectedRegionId;
    this._unitOwners = this.units && window.HistoryAtlas.unitOwnersAt
      ? (state.unitOwners || window.HistoryAtlas.unitOwnersAt(state.year, state.owners)) : null;
    const ownerOf = this._unitOwners || state.owners;
    this.svg.classList.toggle("units-modern", state.year >= 1886);
    if (this.hoveredRegionId) {
      this.hoveredEmpire = ownerOf[this.hoveredRegionId] || null;
    }
    // A historic region only reads as stateless when none of its units has a holder
    const regionHeld = {};
    this._drawItems().forEach(it => { if (ownerOf[it.id]) regionHeld[it.region || it.id] = true; });
    this._regionHeld = regionHeld;
    const empireClusters = {};
    const resolveDisplayHex = window.HistoryAtlas.getEmpireDisplayColor || ((_, hex) => hex);

    if (!this._paintSig) this._paintSig = {};
    if (!this._pathEl) this._pathEl = {};
    // Year-by-year playback fades each change slowly. The first paint is instant, and a big jump (search, chronicle,
    // dragging the timeline) that changes many units at once uses a short fade so hundreds of transitions never pile up.
    {
      let changes = 0;
      const firstPaint = !this._paintedOnce;
      if (!firstPaint) for (const r of this._drawItems()) {
        const o = ownerOf[r.id];
        const sel = (r.region || r.id) === selectedRegionId || Boolean(this.highlightedEmpire && o === this.highlightedEmpire);
        if (this._paintSig[r.id] !== `${o || ""}|${sel ? 1 : 0}`) changes++;
      }
      // the class must still be there when the browser next computes styles (a second paint in the same frame with
      // no changes must not remove it), so it is only ever removed two frames later
      const mark = cls => {
        this.svg.classList.add(cls);
        requestAnimationFrame(() => requestAnimationFrame(() => this.svg.classList.remove(cls)));
      };
      if (firstPaint) { this._paintedOnce = true; mark("paint-instant"); }
      else if (changes > 120) mark("paint-bulk");
    }
    this._drawItems().forEach(r => {
      const owner = ownerOf[r.id];
      const el = this._pathEl[r.id] || (this._pathEl[r.id] = document.getElementById("reg-" + r.id));
      const rWeight = typeof r.area_weight === "number" ? r.area_weight : 1.0;
      // Only touch the DOM when this unit's holder or selection changed (playback steps one year at a time)
      const isSelected = (r.region || r.id) === selectedRegionId;
      const isEmpireHighlighted = Boolean(this.highlightedEmpire && owner === this.highlightedEmpire);
      const sig = `${owner || ""}|${isSelected || isEmpireHighlighted ? 1 : 0}`;
      const dirty = this._paintSig[r.id] !== sig;
      this._paintSig[r.id] = sig;

      if (owner && this.empires[owner]) {
        const gInfo = this._empireGradMap[owner];
        const fallbackColor = resolveDisplayHex(owner, this.empires[owner].color);
        if (dirty) {
          el.style.fill = gInfo ? gInfo.mid : fallbackColor;
          el.style.fillOpacity = "1";
          el.style.stroke = gInfo ? gInfo.deep : "rgba(20, 28, 36, 0.45)";
          el.classList.add("owned");
        }

        if (!empireClusters[owner]) {
          empireClusters[owner] = { regs: [], count: 0, weight: 0, color: gInfo ? gInfo.light : fallbackColor };
        }
        empireClusters[owner].regs.push(r);
        empireClusters[owner].count += 1;
        empireClusters[owner].weight += rWeight;
      } else if (dirty) {
        // with the land hatch underneath; without units (old map) keep the pattern on the path itself
        if (this.units) { el.style.fill = "var(--land-empty)"; el.style.fillOpacity = "0"; }
        else el.style.fill = "url(#stateless-hatch)";
        el.style.stroke = "rgba(18, 25, 34, 0.42)";
        el.classList.remove("owned");
      }
      if (dirty) {
        el.classList.toggle("stateless", !owner);
        el.classList.toggle("selected", isSelected || isEmpireHighlighted);
      }
      this._prevOwners[r.id] = owner || null;
    });

    // Stateless regions name who lived there (tribes, city-states, archaeological cultures)
    this.regions.forEach(r => {
      const subLbl = document.getElementById("sublbl-" + r.id);
      if (!subLbl) return;
      const culture = !regionHeld[r.id] && state.cultures ? state.cultures[r.id] : null;
      const text = culture ? culture.name : r.name.split("(")[0];
      if (subLbl.textContent !== text) subLbl.textContent = text;
      subLbl.classList.toggle("is-stateless", Boolean(culture));
    });

    // 2. Render Persistent Clustered Empire Cartouche Banners at Centroid (Zero DOM teardown / Zero bounce)
    const getShortName = window.HistoryAtlas.getDisplayEmpireName || ((n) => n.split(" ")[0]);
    const activeEmpKeys = new Set(Object.keys(empireClusters));

    for (const existingKey of Object.keys(this._bannerNodes)) {
      if (!activeEmpKeys.has(existingKey)) {
        // a state that ended fades its name out instead of vanishing
        const oldNode = this._bannerNodes[existingKey];
        if (oldNode && oldNode.g) {
          const g = oldNode.g;
          g.classList.add("is-leaving");
          setTimeout(() => { if (g.parentNode) g.parentNode.removeChild(g); }, 900);
        }
        delete this._bannerNodes[existingKey];
      }
    }

    const layoutItems = [];
    for (const [empName, cluster] of Object.entries(empireClusters)) {
      // Group regions of this empire into contiguous geographic components (dist <= 220)
      // weighted by area_weight so trans-oceanic empires never place their label in an ocean
      const regs = cluster.regs;
      const visited = new Array(regs.length).fill(false);
      let bestComp = [regs[0]];
      let bestCompWeight = -1;
      for (let i = 0; i < regs.length; i++) {
        if (visited[i]) continue;
        const comp = [];
        let compWeight = 0;
        const queue = [i];
        visited[i] = true;
        while (queue.length > 0) {
          const cur = queue.shift();
          const curReg = regs[cur];
          comp.push(curReg);
          compWeight += typeof curReg.area_weight === "number" ? curReg.area_weight : 1.0;
          for (let j = 0; j < regs.length; j++) {
            if (!visited[j]) {
              const dist = Math.hypot(curReg.cx - regs[j].cx, curReg.cy - regs[j].cy);
              if (dist <= (this.units ? 70 : 220)) {
                visited[j] = true;
                queue.push(j);
              }
            }
          }
        }
        if (compWeight > bestCompWeight) {
          bestCompWeight = compWeight;
          bestComp = comp;
        }
      }

      let sumX = 0;
      let sumY = 0;
      let wSum = 0;
      for (const r of bestComp) {
        const w = Math.sqrt(typeof r.area_weight === "number" ? r.area_weight : 1.0);
        sumX += r.cx * w;
        sumY += r.cy * w;
        wSum += w;
      }
      const cx = sumX / (wSum || bestComp.length);
      const cy = sumY / (wSum || bestComp.length) - 4;
      const labelStr = getShortName(empName, state.year);
      const effWeight = cluster.weight || cluster.count;
      const fontSize = Math.min(15.2, 8.8 + effWeight * 0.92);
      const padW = labelStr.length * (fontSize * 1.15) + 13;
      const padH = fontSize + 6.4;
      layoutItems.push({
        empName,
        cluster,
        effWeight,
        cx,
        cy,
        labelStr,
        fontSize,
        padW,
        padH,
        halfW: padW / 2,
        halfH: padH / 2
      });
    }

    // Deterministic multi-pass label collision repulsion across major & zoomed minor states
    layoutItems.sort((a, b) => (b.effWeight - a.effWeight) || (b.cluster.count - a.cluster.count) || a.empName.localeCompare(b.empName));
    for (let pass = 0; pass < 8; pass++) {
      for (let i = 0; i < layoutItems.length; i++) {
        for (let j = i + 1; j < layoutItems.length; j++) {
          const a = layoutItems[i];
          const b = layoutItems[j];
          const dx = b.cx - a.cx;
          const dy = b.cy - a.cy;
          const minDx = a.halfW + b.halfW + 4.8;
          const minDy = a.halfH + b.halfH + 4.5;
          if (Math.abs(dx) < minDx && Math.abs(dy) < minDy) {
            const overlapX = minDx - Math.abs(dx);
            const overlapY = minDy - Math.abs(dy);
            if (overlapX < overlapY) {
              const signX = dx >= 0 ? 1 : -1;
              a.cx -= signX * overlapX * 0.35;
              b.cx += signX * overlapX * 0.65;
            } else {
              const signY = dy >= 0 ? 1 : -1;
              a.cy -= signY * overlapY * 0.35;
              b.cy += signY * overlapY * 0.65;
            }
          }
        }
      }
    }

    // Main powers named at 1x world view; minor states (.is-minor) emerge cleanly when zoomed >= 1.6x
    const majorNames = new Set(
      layoutItems
        .filter(it => it.cluster.count >= 2 || it.effWeight >= 0.95 || layoutItems.length <= 12)
        .slice(0, 10)
        .map(it => it.empName)
    );

    for (const item of layoutItems) {
      const { empName, cluster, effWeight, labelStr, fontSize, padW, padH } = item;
      const cx = Math.round(item.cx * 10) / 10;
      const cy = Math.round(item.cy * 10) / 10;

      let record = this._bannerNodes[empName];
      if (!record) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        // a new state's name starts transparent and fades in on the next frame
        g.setAttribute("class", "empire-banner-group is-entering");
        g.setAttribute("transform", `translate(${cx}, ${cy})`);
        requestAnimationFrame(() => requestAnimationFrame(() => g.classList.remove("is-entering")));

        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("rx", "3.5");
        bg.setAttribute("class", "empire-cartouche-bg");
        g.appendChild(bg);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", "0");
        text.setAttribute("y", "0");
        text.setAttribute("class", "empire-macro-label");
        g.appendChild(text);

        this.empireBannersLayer.appendChild(g);
        record = { g, bg, text, cx: null, cy: null, labelStr: "", sig: "" };
        this._bannerNodes[empName] = record;
      }

      if (record.cx !== cx || record.cy !== cy) {
        record.g.setAttribute("transform", `translate(${cx}, ${cy})`);
        record.cx = cx;
        record.cy = cy;
      }
      const isMajor = majorNames.has(empName);
      record.g.classList.toggle("is-major", isMajor);
      record.g.classList.toggle("is-minor", !isMajor);

      const sig = `${labelStr}:${Math.round(effWeight * 100)}:${cluster.color}`;
      if (record.sig !== sig) {
        record.text.textContent = labelStr;
        record.text.style.fontSize = `${fontSize.toFixed(1)}px`;
        record.bg.style.display = "";
        record.bg.setAttribute("x", (-padW / 2).toFixed(1));
        record.bg.setAttribute("y", (-padH * 0.74).toFixed(1));
        record.bg.setAttribute("width", padW.toFixed(1));
        record.bg.setAttribute("height", padH.toFixed(1));
        record.bg.style.stroke = cluster.color;
        record.labelStr = labelStr;
        record.sig = sig;
      }
    }

    this._syncCapitals(state.year, Object.keys(empireClusters), majorNames);

    this._applyHoverState();

    // 3. Update Trade Routes Visibility & Focus State
    this._syncRouteVisibility(state);

    // 3.5 Render Dynamic Conquest Campaign Arrows (Only rebuild when changed)
    const campaignsSig = this.showCampaigns ? JSON.stringify(state.campaigns || []) : "off";
    if (campaignsSig !== this._lastCampaignsSig) {
      this._lastCampaignsSig = campaignsSig;
      this.campaignsLayer.innerHTML = "";
      if (this.showCampaigns && state.campaigns && state.campaigns.length > 0) {
        state.campaigns.forEach(c => {
          const mx = (c.fromX + c.toX) / 2;
          const my = (c.fromY + c.toY) / 2 - 16;
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", `M ${c.fromX},${c.fromY} Q ${mx},${my} ${c.toX},${c.toY}`);
          path.setAttribute("class", "campaign-arrow");
          path.setAttribute("marker-end", "url(#campaign-arrowhead)");
          this.campaignsLayer.appendChild(path);
        });
      }
    }

    // 3.8 Render Active Independent/Autonomous City-States (Copperplate Dots + Anti-Collision Labels)
    const activeCities = state.cityStates || [];
    const cityStatesSig =
      (this._zoomedClass ? "Z1#" : "Z0#") +
      activeCities.map(cs => {
        const culName = !regionHeld[cs.regionId] && state.cultures && state.cultures[cs.regionId]
          ? state.cultures[cs.regionId].name
          : "";
        return `${cs.id}:${regionHeld[cs.regionId] ? 1 : 0}:${culName}`;
      }).join("|") +
      "#" +
      layoutItems.map(it => `${it.empName}@${Math.round(it.cx)},${Math.round(it.cy)}`).join(",");
    if (cityStatesSig !== this._lastCityStatesSig) {
      this._lastCityStatesSig = cityStatesSig;
      this._placedCityBoxes = [];
      this.cityStatesLayer.innerHTML = "";

      const statelessLabelBoxes = [];
      this.regions.forEach((r) => {
        if (!regionHeld[r.id] && state.cultures && state.cultures[r.id]) {
          const cname = state.cultures[r.id].name || "";
          if (cname) {
            statelessLabelBoxes.push({
              cx: r.cx,
              cy: r.cy + 7.8,
              halfW: cname.length * 3.5 + 2.0,
              halfH: 4.0
            });
          }
        }
      });

      const cityAnchors = [
        { dx: 4.0, dy: 2.2, anchor: "start" },
        { dx: -4.0, dy: 2.2, anchor: "end" },
        { dx: 0, dy: -4.2, anchor: "middle" },
        { dx: 0, dy: 7.4, anchor: "middle" },
        { dx: 3.8, dy: -2.8, anchor: "start" },
        { dx: -3.8, dy: -2.8, anchor: "end" },
        { dx: -3.8, dy: 6.4, anchor: "end" }
      ];

      activeCities.forEach((cs) => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const isStateless = this._regionHeld ? !this._regionHeld[cs.regionId] : !state.owners[cs.regionId];
        g.setAttribute("class", isStateless ? "city-state-group is-stateless" : "city-state-group");

        // Compact hit area forwards clicks straight to the underlying region so region selection is never blocked
        const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hit.setAttribute("cx", cs.x);
        hit.setAttribute("cy", cs.y);
        hit.setAttribute("r", "4.4");
        hit.setAttribute("fill", "transparent");

        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ring.setAttribute("cx", cs.x);
        ring.setAttribute("cy", cs.y);
        ring.setAttribute("r", "2.25");
        ring.setAttribute("class", "city-state-ring");

        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", cs.x);
        dot.setAttribute("cy", cs.y);
        dot.setAttribute("r", "1.25");
        dot.setAttribute("class", "city-state-dot");

        const estHalfW = cs.name.length * 3.35 + 2.2;
        const estHalfH = 3.8;
        let chosen = null;
        for (const cand of cityAnchors) {
          const boxCx =
            cand.anchor === "start"
              ? cs.x + cand.dx + estHalfW
              : cand.anchor === "end"
              ? cs.x + cand.dx - estHalfW
              : cs.x + cand.dx;
          const boxCy = cs.y + cand.dy - 2.2;

          const hitsBanner = layoutItems.some(it =>
            (this._zoomedClass || majorNames.has(it.empName)) &&
            Math.abs(boxCx - it.cx) < it.halfW + estHalfW + 3 &&
            Math.abs(boxCy - it.cy) < it.halfH + estHalfH + 2
          );
          const hitsStatelessSub = statelessLabelBoxes.some(sb =>
            Math.abs(boxCx - sb.cx) < sb.halfW + estHalfW + 1.8 &&
            Math.abs(boxCy - sb.cy) < sb.halfH + estHalfH + 1.4
          );
          const hitsCityBox = this._placedCityBoxes.some(pb =>
            Math.abs(boxCx - pb.cx) < pb.halfW + estHalfW + 2.5 &&
            Math.abs(boxCy - pb.cy) < pb.halfH + estHalfH + 1.8
          );
          const hitsOtherDot = activeCities.some(other =>
            other !== cs &&
            Math.abs(boxCx - other.x) < estHalfW + 2.6 &&
            Math.abs(boxCy - other.y) < estHalfH + 2.6
          );
          if (!hitsBanner && !hitsStatelessSub && !hitsCityBox && !hitsOtherDot) {
            chosen = { ...cand, boxCx, boxCy };
            break;
          }
        }

        const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        if (chosen) {
          this._placedCityBoxes.push({ cx: chosen.boxCx, cy: chosen.boxCy, halfW: estHalfW, halfH: estHalfH });
          lbl.setAttribute("x", cs.x + chosen.dx);
          lbl.setAttribute("y", cs.y + chosen.dy);
          lbl.style.textAnchor = chosen.anchor;
          lbl.setAttribute("class", "city-state-label");
        } else {
          lbl.setAttribute("x", cs.x);
          lbl.setAttribute("y", cs.y - 4.0);
          lbl.style.textAnchor = "middle";
          lbl.setAttribute("class", "city-state-label is-crowded");
        }
        lbl.textContent = cs.name;

        g.appendChild(hit);
        g.appendChild(ring);
        g.appendChild(dot);
        g.appendChild(lbl);

        g.addEventListener("mouseenter", (e) => this._showCityStateTooltip(e, cs));
        g.addEventListener("mousemove", (e) => this._moveTooltip(e));
        g.addEventListener("mouseleave", () => this._hideTooltip());
        g.addEventListener("click", (e) => {
          e.stopPropagation();
          if (cs.regionId) this.onSelectRegion(cs.regionId);
        });

        this.cityStatesLayer.appendChild(g);
      });
    }

    // 4. Render Historical Event & Wonder Landmarks with Anti-Collision Placement
    const landmarksSig = JSON.stringify(state.landmarks || []) + "#" + cityStatesSig;
    if (landmarksSig !== this._lastLandmarksSig) {
      this._lastLandmarksSig = landmarksSig;
      this.landmarksLayer.innerHTML = "";
      const placedLandmarkBoxes = (this._placedCityBoxes || []).slice();

      (state.landmarks || []).forEach((lm) => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "landmark-group");

        const lx = lm.x;
        const ly = lm.y + 4;

        const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        pulse.setAttribute("cx", lx);
        pulse.setAttribute("cy", ly);
        pulse.setAttribute("r", 6.2);
        pulse.setAttribute("class", "landmark-pulse");

        const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hit.setAttribute("cx", lx);
        hit.setAttribute("cy", ly);
        hit.setAttribute("r", 13);
        hit.setAttribute("fill", "transparent");

        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", lx);
        dot.setAttribute("cy", ly);
        dot.setAttribute("r", 2.9);
        dot.setAttribute("class", "landmark-dot");

        const shortTitle = lm.title.length > 9 ? lm.title.slice(0, 9) + "…" : lm.title;
        const prefix = lm.icon ? `〔${lm.icon}〕` : "◆ ";
        const labelText = prefix + shortTitle;
        const estHalfW = labelText.length * 4.7 + 6;
        const estHalfH = 6.5;

        const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
        const candidateAnchors = [
          { dx: 0, dy: 13, anchor: "middle" },
          { dx: 0, dy: -9, anchor: "middle" },
          { dx: 0, dy: 23, anchor: "middle" },
          { dx: 0, dy: -19, anchor: "middle" },
          { dx: 10, dy: 4, anchor: "start" },
          { dx: -10, dy: 4, anchor: "end" }
        ];
        let chosen = null;
        for (const cand of candidateAnchors) {
          const boxCx =
            cand.anchor === "start"
              ? lx + cand.dx + estHalfW
              : cand.anchor === "end"
              ? lx + cand.dx - estHalfW
              : lx + cand.dx;
          const boxCy = ly + cand.dy - 3;

          const hitsBanner = layoutItems.some(it =>
            Math.abs(boxCx - it.cx) < it.halfW + estHalfW + 4 &&
            Math.abs(boxCy - it.cy) < it.halfH + estHalfH + 3
          );
          const hitsLandmark = placedLandmarkBoxes.some(pb =>
            Math.abs(boxCx - pb.cx) < pb.halfW + estHalfW + 5 &&
            Math.abs(boxCy - pb.cy) < pb.halfH + estHalfH + 3
          );
          const hitsOtherPin = (state.landmarks || []).some(other =>
            other !== lm &&
            Math.abs(boxCx - other.x) < estHalfW + 5 &&
            Math.abs(boxCy - (other.y + 4)) < estHalfH + 5
          );
          if (!hitsBanner && !hitsLandmark && !hitsOtherPin) {
            chosen = { ...cand, boxCx, boxCy };
            break;
          }
        }

        if (chosen) {
          placedLandmarkBoxes.push({ cx: chosen.boxCx, cy: chosen.boxCy, halfW: estHalfW, halfH: estHalfH });
          tag.setAttribute("x", lx + chosen.dx);
          tag.setAttribute("y", ly + chosen.dy);
          tag.style.textAnchor = chosen.anchor;
        } else {
          tag.setAttribute("x", lx);
          tag.setAttribute("y", ly + 13);
          tag.classList.add("is-crowded");
        }
        tag.setAttribute("class", chosen ? "landmark-label" : "landmark-label is-crowded");
        tag.textContent = labelText;

        g.appendChild(pulse);
        g.appendChild(hit);
        g.appendChild(dot);
        g.appendChild(tag);

        g.addEventListener("mouseenter", (e) => this._showTooltip(e, lm, state.keyframeYear));
        g.addEventListener("mousemove", (e) => this._moveTooltip(e));
        g.addEventListener("mouseleave", () => this._hideTooltip());
        g.addEventListener("click", (e) => {
          e.stopPropagation();
          let bestReg = null;
          let bestDist = Infinity;
          for (const r of this.regions) {
            const d = Math.hypot(r.cx - lm.x, r.cy - lm.y);
            if (d < bestDist) {
              bestDist = d;
              bestReg = r;
            }
          }
          if (bestReg) this.onSelectRegion(bestReg.id);
        });

        this.landmarksLayer.appendChild(g);
      });
    }
    } finally {
      this._inRenderState = false;
    }
  }
}

window.HistoryAtlas.MapRenderer = MapRenderer;
