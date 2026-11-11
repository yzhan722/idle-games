// SVG World Map Renderer with Layered Bathymetry, Harmonized Imperial Gradients, Ambient Motes & Smooth Camera
window.HistoryAtlas = window.HistoryAtlas || {};

class MapRenderer {
  constructor(svgElement, regions, rivers, tradeRoutes, empires, onSelectRegion, onSelectRoute) {
    this.svg = svgElement;
    this.regions = regions;
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
    this._lastLandmarksSig = "";

    this._initTooltip();
    this._initLayers();
    this._bindPanZoom();
  }

  // Blend hex color with warm antique pigment (#dfd2bc) for rich museum-atlas tones
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

  _showRegionTooltip(e, r) {
    if (!this.tooltipEl || !this._lastState) return;
    const state = this._lastState;
    const owner = state.owners[r.id];
    const emp = owner ? this.empires[owner] : null;
    const yr = state.year;
    const yrStr = yr < 0 ? `公元前 ${Math.abs(yr)} 年` : `公元 ${yr} 年`;
    const regShort = r.name.split("(")[0];
    const count = owner ? Object.values(state.owners).filter(v => v === owner).length : 1;
    const titleColor = emp && emp.color ? emp.color : "#f5c542";
    const capStr = emp ? `首都：${emp.capital} · ${emp.regime} · 统辖 ${count} 区` : "早期古国辖境";
    this.tooltipEl.innerHTML = `
      <div class="lt-head">
        <span class="lt-badge">${r.continent} · ${regShort}</span>
        <span class="lt-year">${yrStr}</span>
      </div>
      <div class="lt-title" style="color:${titleColor}">${owner || regShort}</div>
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

    this.regions.forEach(r => {
      const owner = state.owners[r.id];
      const el = document.getElementById("reg-" + r.id);
      const subLbl = document.getElementById("sublbl-" + r.id);
      if (el) {
        el.classList.toggle("empire-hovered", Boolean(focusEmp && owner === focusEmp));
      }
      if (subLbl) {
        subLbl.classList.toggle("is-focused", r.id === this.hoveredRegionId);
      }
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
    const x = Math.min(window.innerWidth - 290, Math.max(16, e.clientX + 16));
    const y = Math.min(window.innerHeight - 130, Math.max(16, e.clientY - 24));
    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
  }

  _hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = "none";
    }
  }

  _initLayers() {
    this.svg.innerHTML = "";

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
      <filter id="soft-territory-glow" x="-8%" y="-8%" width="116%" height="116%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2.2" flood-color="#050a10" flood-opacity="0.55" />
      </filter>
    `;

    let idx = 0;
    for (const [empName, empObj] of Object.entries(this.empires)) {
      const gid = `emp-grad-${idx++}`;
      const pal = this._harmonizeColor(empObj.color);
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

    // 1. Subtle Cartographic Graticule Grid
    const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gridGroup.setAttribute("class", "map-grid");
    for (let x = -100; x < 1450; x += 140) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x); line.setAttribute("y1", -40);
      line.setAttribute("x2", x); line.setAttribute("y2", 640);
      gridGroup.appendChild(line);
    }
    for (let y = 20; y < 620; y += 110) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", -150); line.setAttribute("y1", y);
      line.setAttribute("x2", 1450); line.setAttribute("y2", y);
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
    this.regionsLayer.setAttribute("filter", "url(#soft-territory-glow)");
    this.viewport.appendChild(this.regionsLayer);

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

      // Gentle low-key caravan/ship micro-pearls along primary subpaths
      const subpaths = rt.d.split("M ").filter(Boolean).map(seg => "M " + seg.trim());
      subpaths.slice(0, 2).forEach((subD, sIdx) => {
        const offsets = sIdx === 0 ? [0, 14] : [7];
        offsets.forEach((beginSec) => {
          const bead = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          bead.setAttribute("r", "1.95");
          bead.setAttribute("fill", "#f4ead2");
          bead.setAttribute("stroke", color);
          bead.setAttribute("stroke-width", "1.1");
          bead.setAttribute("class", "route-caravan");
          const anim = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
          anim.setAttribute("path", subD);
          anim.setAttribute("dur", "28s");
          anim.setAttribute("begin", `${beginSec}s`);
          anim.setAttribute("repeatCount", "indefinite");
          bead.appendChild(anim);
          grp.appendChild(bead);
        });
      });

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

    // 5. Region Sub-labels, Clustered Empire Banners & Interactive Landmarks Layer
    this.labelsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.empireBannersLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.landmarksLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.ambientLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.viewport.appendChild(this.labelsLayer);
    this.viewport.appendChild(this.empireBannersLayer);
    this.viewport.appendChild(this.landmarksLayer);
    this.viewport.appendChild(this.ambientLayer);

    // Populate Regions
    this.regions.forEach(r => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", r.path);
      path.setAttribute("id", "reg-" + r.id);
      path.setAttribute("class", "region");
      path.addEventListener("mouseenter", (e) => {
        this.hoveredRegionId = r.id;
        this.hoveredEmpire = (this._lastState && this._lastState.owners[r.id]) || null;
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
        this.onSelectRegion(r.id);
      });
      this.regionsLayer.appendChild(path);

      const subLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      subLbl.setAttribute("x", r.cx);
      subLbl.setAttribute("y", r.cy + 10);
      subLbl.setAttribute("id", "sublbl-" + r.id);
      subLbl.setAttribute("class", "region-sublabel");
      subLbl.textContent = r.name.split("(")[0];
      this.labelsLayer.appendChild(subLbl);
    });
  }

  _bindPanZoom() {
    this.svg.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.dragStartX;
      this.panY = e.clientY - this.dragStartY;
      this._applyTransform();
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    this.svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const nextScale = Math.min(4.0, Math.max(0.75, this.scale * factor));
      // Keep the geographic point under the cursor fixed (PRD: mouse-centered zoom)
      const ctm = this.svg.getScreenCTM();
      if (ctm) {
        const pt = this.svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const p = pt.matrixTransform(ctm.inverse());
        const localX = (p.x - this.panX) / this.scale;
        const localY = (p.y - this.panY) / this.scale;
        this.scale = nextScale;
        this.panX = p.x - localX * this.scale;
        this.panY = p.y - localY * this.scale;
      } else {
        this.scale = nextScale;
      }
      this._applyTransform();
    }, { passive: false });
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
    const targetPanX = 600 - svgX * targetScale;
    const targetPanY = 295 - svgY * targetScale;
    this.animateCameraTo(targetScale, targetPanX, targetPanY, 850);
  }

  _applyTransform() {
    this.viewport.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.scale})`);
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
    this._lastState = state;
    this._lastSelectedId = selectedRegionId;
    if (this.hoveredRegionId) {
      this.hoveredEmpire = state.owners[this.hoveredRegionId] || null;
    }
    const empireClusters = {};

    this.regions.forEach(r => {
      const owner = state.owners[r.id];
      const prevOwner = this._prevOwners[r.id];
      const el = document.getElementById("reg-" + r.id);

      if (owner && this.empires[owner]) {
        const gInfo = this._empireGradMap[owner];
        el.style.fill = gInfo ? gInfo.mid : this.empires[owner].color;
        el.style.stroke = gInfo ? gInfo.deep : "rgba(20, 28, 36, 0.45)";
        el.classList.add("owned");

        if (!empireClusters[owner]) {
          empireClusters[owner] = { regs: [], count: 0, color: gInfo ? gInfo.light : this.empires[owner].color };
        }
        empireClusters[owner].regs.push(r);
        empireClusters[owner].count += 1;
      } else {
        el.style.fill = "var(--land-empty)";
        el.style.stroke = "rgba(18, 25, 34, 0.42)";
        el.classList.remove("owned");
      }

      this._prevOwners[r.id] = owner || null;

      const isSelected = r.id === selectedRegionId;
      const isEmpireHighlighted = this.highlightedEmpire && owner === this.highlightedEmpire;
      el.classList.toggle("selected", isSelected || isEmpireHighlighted);
    });

    // 2. Render Persistent Clustered Empire Cartouche Banners at Centroid (Zero DOM teardown / Zero bounce)
    const getShortName = window.HistoryAtlas.getDisplayEmpireName || ((n) => n.split(" ")[0]);
    const activeEmpKeys = new Set(Object.keys(empireClusters));

    for (const existingKey of Object.keys(this._bannerNodes)) {
      if (!activeEmpKeys.has(existingKey)) {
        const oldNode = this._bannerNodes[existingKey];
        if (oldNode && oldNode.g && oldNode.g.parentNode) {
          oldNode.g.parentNode.removeChild(oldNode.g);
        }
        delete this._bannerNodes[existingKey];
      }
    }

    const layoutItems = [];
    for (const [empName, cluster] of Object.entries(empireClusters)) {
      // Group regions of this empire into contiguous geographic components (dist <= 220)
      // so trans-oceanic empires never place their label in the middle of an ocean!
      const regs = cluster.regs;
      const visited = new Array(regs.length).fill(false);
      let bestComp = [regs[0]];
      for (let i = 0; i < regs.length; i++) {
        if (visited[i]) continue;
        const comp = [];
        const queue = [i];
        visited[i] = true;
        while (queue.length > 0) {
          const cur = queue.shift();
          comp.push(regs[cur]);
          for (let j = 0; j < regs.length; j++) {
            if (!visited[j]) {
              const dist = Math.hypot(regs[cur].cx - regs[j].cx, regs[cur].cy - regs[j].cy);
              if (dist <= 220) {
                visited[j] = true;
                queue.push(j);
              }
            }
          }
        }
        if (comp.length > bestComp.length) {
          bestComp = comp;
        }
      }

      let sumX = 0;
      let sumY = 0;
      for (const r of bestComp) {
        sumX += r.cx;
        sumY += r.cy;
      }
      const cx = sumX / bestComp.length;
      const cy = sumY / bestComp.length - 4;
      const labelStr = getShortName(empName, state.year);
      const fontSize = Math.min(15.5, 9.8 + cluster.count * 0.85);
      const padW = labelStr.length * (fontSize * 1.04) + 14;
      const padH = fontSize + 6;
      layoutItems.push({
        empName,
        cluster,
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

    // Deterministic 5-pass label collision repulsion so adjacent countries never overlap
    layoutItems.sort((a, b) => (b.cluster.count - a.cluster.count) || a.empName.localeCompare(b.empName));
    for (let pass = 0; pass < 5; pass++) {
      for (let i = 0; i < layoutItems.length; i++) {
        for (let j = i + 1; j < layoutItems.length; j++) {
          const a = layoutItems[i];
          const b = layoutItems[j];
          const dx = b.cx - a.cx;
          const dy = b.cy - a.cy;
          const minDx = a.halfW + b.halfW + 4;
          const minDy = a.halfH + b.halfH + 3;
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

    for (const item of layoutItems) {
      const { empName, cluster, labelStr, fontSize, padW, padH } = item;
      const cx = Math.round(item.cx * 10) / 10;
      const cy = Math.round(item.cy * 10) / 10;

      let record = this._bannerNodes[empName];
      if (!record) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "empire-banner-group");
        g.setAttribute("transform", `translate(${cx}, ${cy})`);

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
        record = { g, bg, text, cx: null, cy: null, labelStr: "", count: 0 };
        this._bannerNodes[empName] = record;
      }

      if (record.cx !== cx || record.cy !== cy) {
        record.g.setAttribute("transform", `translate(${cx}, ${cy})`);
        record.cx = cx;
        record.cy = cy;
      }

      if (record.labelStr !== labelStr || record.count !== cluster.count) {
        record.text.textContent = labelStr;
        record.text.style.fontSize = `${fontSize}px`;
        if (cluster.count >= 2) {
          record.bg.style.display = "";
          record.bg.setAttribute("x", -padW / 2);
          record.bg.setAttribute("y", -padH * 0.74);
          record.bg.setAttribute("width", padW);
          record.bg.setAttribute("height", padH);
          record.bg.style.stroke = cluster.color;
        } else {
          record.bg.style.display = "none";
        }
        record.labelStr = labelStr;
        record.count = cluster.count;
      }
    }

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

    // 4. Render Historical Event & Wonder Landmarks with Anti-Collision Placement
    const landmarksSig = JSON.stringify(state.landmarks || []);
    if (landmarksSig !== this._lastLandmarksSig) {
      this._lastLandmarksSig = landmarksSig;
      this.landmarksLayer.innerHTML = "";
      const placedLandmarkBoxes = [];

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
  }
}

window.HistoryAtlas.MapRenderer = MapRenderer;
