// World History Evolution Atlas - Main Controller
(function () {
  const {
    REGIONS, RIVERS, TRADE_ROUTES, THEATERS, MACRO_METRICS,
    EMPIRES, TIMELINE, TimelineEngine, MapRenderer, AudioSynthesizer
  } = window.HistoryAtlas;

  const engine = new TimelineEngine(REGIONS, EMPIRES, TIMELINE);
  const audio = new AudioSynthesizer();

  // Map theme: "night" (default) or "paper" (light parchment). Set before the renderer builds its palette.
  let theme = "night";
  try { if (localStorage.getItem("atlas.theme") === "paper") theme = "paper"; } catch (e) { /* storage blocked */ }
  document.body.classList.toggle("theme-paper", theme === "paper");
  if (window.HistoryAtlas.setPaletteMode) window.HistoryAtlas.setPaletteMode(theme);

  let currentYear = -3000;
  let yearFloat = -3000;
  let isPlaying = true;
  let speed = 1;
  let selectedRegionId = "guanzhong";
  let selectedUnitId = null; // province/state unit the user clicked (null when a region was picked another way)
  let selectedRouteId = null;
  let lastKeyframeYear = null;
  let lastToastText = "";
  let dwellTicks = 0;
  let idleDrift = false;
  let activeTheaterId = "world";

  const svgEl = document.getElementById("world-map");
  // Phone home view: Afro-Eurasia (stored in old base-map coordinates, moved onto the current projection)
  function focusPhoneHome() {
    const w = window.HistoryAtlas.warpOldPoint;
    // centred on Central Asia (~68E 34N); 2.5x lets Europe-to-Japan fill a portrait screen's height
    const [x, y] = w ? w(805, 170) : [780, 180];
    renderer.focusOnPoint(x, y, w ? 2.5 : 1.8);
  }
  const renderer = new MapRenderer(
    svgEl,
    REGIONS,
    RIVERS,
    TRADE_ROUTES,
    EMPIRES,
    (regionId, unitId) => {
      selectedRegionId = regionId;
      selectedUnitId = unitId || null;
      renderer.setHighlightEmpire(null);
      setInspectorOpen(true);
      updateView();
    },
    (routeId, hub) => {
      selectedRouteId = routeId;
      if (hub && hub.regionId) {
        selectedRegionId = hub.regionId;
      }
      renderer.setFocusedRoute(selectedRouteId);
      renderer.setHighlightEmpire(null);
      updateView();
    }
  );

  // Person view (人物视角): follows one figure's documented stops year by year
  let personView = null;
  if (window.HistoryAtlas.PersonViewController) {
    personView = new window.HistoryAtlas.PersonViewController({
      renderer,
      getYear: () => currentYear,
      jumpToYear: (y) => window.AtlasApp.jumpToYear(y),
      pausePlayback: () => { if (isPlaying) window.AtlasApp.togglePlay(); }
    });
  }

  // Inspector drawer: on screens narrower than 1500px it stays collapsed to its title until a region is
  // chosen, so it does not cover the map; wide screens reserve room for it beside the map.
  const infoCardEl = document.getElementById("info-card");
  const cardToggleBtn = document.getElementById("card-toggle-btn");
  function setInspectorOpen(open) {
    if (!infoCardEl) return;
    infoCardEl.classList.toggle("is-collapsed", !open);
    document.body.classList.toggle("inspector-open", open);
    if (cardToggleBtn) {
      cardToggleBtn.textContent = open ? "收起" : "展开";
      cardToggleBtn.setAttribute("aria-expanded", String(open));
    }
  }
  setInspectorOpen(window.innerWidth >= 1500);
  if (infoCardEl) {
    infoCardEl.addEventListener("click", (e) => {
      if (infoCardEl.classList.contains("is-collapsed") && !e.target.closest("button")) setInspectorOpen(true);
    });
  }

  // Counts in static copy follow the data instead of being hard-coded
  const searchInputEl = document.getElementById("search-input");
  if (searchInputEl) {
    searchInputEl.placeholder = `搜索编年史 / ${Object.keys(EMPIRES).length} 个政权 / 省州国家 / 丝路商埠 / 年份...`;
  }
  const chrSubtitleEl = document.getElementById("chr-subtitle");
  if (chrSubtitleEl) {
    const nChr = (window.HistoryAtlas.CHRONICLE_ANNALS || []).length;
    chrSubtitleEl.textContent = `涵盖 ${nChr} 个历史纪年节点 · ${Object.keys(EMPIRES).length} 个国家与王朝 · ${TIMELINE.length} 个疆域关键帧 · 点击任意条目即可穿越并定位战区`;
  }

  function formatYear(y) {
    return y < 0 ? `公元前 ${Math.abs(y)} 年` : `公元 ${y} 年`;
  }

  // 5-Stage Non-Linear Historical Time Scale (Early eras compressed, Modern eras expanded)
  const TIME_ANCHORS = [
    { year: -3000, norm: 0.00 },
    { year: -500,  norm: 0.22 },
    { year: 500,   norm: 0.44 },
    { year: 1500,  norm: 0.68 },
    { year: 1900,  norm: 0.85 },
    { year: 2026,  norm: 1.00 }
  ];

  function yearToNorm(yr) {
    const y = Math.max(-3000, Math.min(2026, yr));
    for (let i = 0; i < TIME_ANCHORS.length - 1; i++) {
      const a = TIME_ANCHORS[i];
      const b = TIME_ANCHORS[i + 1];
      if (y <= b.year) {
        const ratio = (y - a.year) / (b.year - a.year);
        return a.norm + ratio * (b.norm - a.norm);
      }
    }
    return 1.0;
  }

  function normToYear(norm) {
    const n = Math.max(0, Math.min(1, norm));
    for (let i = 0; i < TIME_ANCHORS.length - 1; i++) {
      const a = TIME_ANCHORS[i];
      const b = TIME_ANCHORS[i + 1];
      if (n <= b.norm) {
        const ratio = (n - a.norm) / (b.norm - a.norm);
        return Math.round(a.year + ratio * (b.year - a.year));
      }
    }
    return 2026;
  }

  // Continuous Non-Linear Time Velocity (Fast in early antiquity -> Progressively slower toward modernity)
  function getNonLinearYearsPerSec(yr, spd) {
    const u = Math.max(0, Math.min(1, (yr - (-3000)) / 5026));
    // Smooth exponential-power decay from 25 yr/s at -3000 BC down to 0.18 yr/s at 2026 AD (at 1x speed)
    let baseYps;
    if (yr < -1200) {
      baseYps = 25.0 - ((yr - (-3000)) / 1800) * 14.5; // 25.0 -> 10.5 yr/s
    } else if (yr < 0) {
      baseYps = 10.5 - ((yr - (-1200)) / 1200) * 6.3;  // 10.5 -> 4.2 yr/s
    } else if (yr < 1000) {
      baseYps = 4.2 - (yr / 1000) * 2.4;               // 4.2 -> 1.8 yr/s
    } else if (yr < 1600) {
      baseYps = 1.8 - ((yr - 1000) / 600) * 1.05;      // 1.8 -> 0.75 yr/s
    } else if (yr < 1850) {
      baseYps = 0.75 - ((yr - 1600) / 250) * 0.37;     // 0.75 -> 0.38 yr/s
    } else if (yr < 1945) {
      baseYps = 0.38 - ((yr - 1850) / 95) * 0.16;      // 0.38 -> 0.22 yr/s
    } else {
      baseYps = 0.22 - ((yr - 1945) / 81) * 0.04;      // 0.22 -> 0.18 yr/s
    }
    return Math.max(0.08, baseYps * spd);
  }

  function formatPaceLabel(yr, spd) {
    const yps = getNonLinearYearsPerSec(yr, spd);
    const numStr = yps >= 10 ? Math.round(yps) : yps >= 1 ? yps.toFixed(1) : yps.toFixed(2);
    let tag = "现代慢放";
    if (yr < -1000) tag = "远古快进";
    else if (yr < 300) tag = "古典演进";
    else if (yr < 1500) tag = "中古流转";
    else if (yr < 1900) tag = "近代细读";
    return `${numStr}年/秒 · ${tag}`;
  }

  function activateTheater(thId) {
    if (!THEATERS) return false;
    const th = THEATERS.find(t => t.id === thId);
    if (!th) return false;
    activeTheaterId = th.id;
    document.querySelectorAll(".theater-pill").forEach(el => {
      el.classList.toggle("active", el.id === "th-" + th.id);
    });
    renderer.focusTheater(th);
    return true;
  }

  // Initialize Regional Theater Focus Bar
  function initTheaterBar() {
    const container = document.getElementById("theater-buttons");
    if (!container || !THEATERS) return;
    container.innerHTML = "";
    THEATERS.forEach(th => {
      const btn = document.createElement("button");
      btn.className = "theater-pill" + (th.id === activeTheaterId ? " active" : "");
      btn.id = "th-" + th.id;
      btn.textContent = th.name;
      btn.onclick = () => {
        activateTheater(th.id);
      };
      container.appendChild(btn);
    });
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getConfidenceConfig() {
    return window.HistoryAtlas.CONFIDENCE || { levels: {}, polities: {} };
  }

  function getConfidenceClass(level) {
    if (level === "史料确证") return "conf-verified";
    if (level === "学界推测") return "conf-inferred";
    if (level === "传说") return "conf-legend";
    return "";
  }

  function buildConfidenceBadgeHtml(level, note, extraClass = "") {
    const cls = getConfidenceClass(level);
    if (!cls) return "";
    const cfg = getConfidenceConfig();
    const resolvedNote = note || (cfg.levels && cfg.levels[level]) || "";
    const clsStr = ["conf-badge", cls, extraClass].filter(Boolean).join(" ");
    return `<span class="${clsStr}" data-conf-level="${escapeHtml(level)}" data-conf-note="${escapeHtml(resolvedNote)}" title="${escapeHtml(resolvedNote || level)}">${escapeHtml(level)}</span>`;
  }

  // Unclipped floating tooltip for confidence badges inside scrollable/overflow-hidden containers
  let confTipEl = null;
  function ensureConfTip() {
    if (!confTipEl) {
      confTipEl = document.createElement("div");
      confTipEl.className = "conf-floating-tip";
      confTipEl.style.display = "none";
      document.body.appendChild(confTipEl);
    }
    return confTipEl;
  }
  function positionConfTip(e) {
    if (!confTipEl || confTipEl.style.display === "none") return;
    const pad = 12;
    let x = e.clientX + 12;
    let y = e.clientY + 14;
    if (x + 260 > window.innerWidth - pad) x = Math.max(pad, e.clientX - 266);
    if (y + 90 > window.innerHeight - pad) y = Math.max(pad, e.clientY - 82);
    confTipEl.style.left = `${x}px`;
    confTipEl.style.top = `${y}px`;
  }
  document.addEventListener("mouseover", (e) => {
    const badge = e.target && e.target.closest ? e.target.closest(".conf-badge[data-conf-level]") : null;
    if (!badge) return;
    const lvl = badge.getAttribute("data-conf-level") || "";
    const note = badge.getAttribute("data-conf-note") || "";
    if (!lvl && !note) return;
    const tip = ensureConfTip();
    tip.innerHTML = `<div class="cft-head">${escapeHtml(lvl)}</div><div class="cft-body">${escapeHtml(note || "参见史源考据说明")}</div>`;
    tip.style.display = "block";
    positionConfTip(e);
  });
  document.addEventListener("mousemove", (e) => {
    if (confTipEl && confTipEl.style.display !== "none") {
      const badge = e.target && e.target.closest ? e.target.closest(".conf-badge[data-conf-level]") : null;
      if (!badge) {
        confTipEl.style.display = "none";
      } else {
        positionConfTip(e);
      }
    }
  });

  // Render Macro Tech & East/West Share Curve SVG (Maddison PPP from 1 CE; null pre-1 CE & unestimated years)
  function renderMacroChart(state) {
    const popEl = document.getElementById("macro-pop-badge");
    const techEl = document.getElementById("macro-tech-text");
    const shareEl = document.getElementById("macro-share-readout");
    const srcEl = document.getElementById("macro-source-text");
    const svgChart = document.getElementById("macro-chart-svg");
    if (!svgChart || !MACRO_METRICS || !MACRO_METRICS.length) return;

    if (state.macro) {
      popEl.textContent = `人口 ${state.macro.pop}`;
      techEl.textContent = state.macro.tech;
      if (srcEl) {
        srcEl.textContent = state.macro.source || "";
      }
      if (shareEl) {
        if (currentYear < 1) {
          shareEl.textContent = "无可靠GDP数据";
        } else if (typeof state.macro.gdp_east === "number" && typeof state.macro.gdp_west === "number") {
          shareEl.textContent = `东 ${state.macro.gdp_east}% · 西 ${state.macro.gdp_west}%`;
        } else {
          shareEl.textContent = "该期无单列GDP（虚线）";
        }
      }
    }

    const w = 210;
    const h = 70;
    const padX = 7;
    const padY = 8;
    const xOf = (yr) => padX + yearToNorm(yr) * (w - padX * 2);
    const yOf = (val) => h - padY - (Math.min(68, Math.max(0, val)) / 68) * (h - padY * 2);

    const x1CE = xOf(1);
    const validNodes = MACRO_METRICS
      .map((m, idx) => ({ ...m, idx }))
      .filter(m => typeof m.gdp_east === "number" && typeof m.gdp_west === "number");

    const segParts = [];
    for (let i = 0; i < validNodes.length - 1; i++) {
      const a = validNodes[i];
      const b = validNodes[i + 1];
      const hasNullGap = b.idx > a.idx + 1;
      const dashAttr = hasNullGap ? ' stroke-dasharray="2.6 2.2" opacity="0.72"' : ' opacity="0.94"';
      const x1 = xOf(a.year).toFixed(1);
      const x2 = xOf(b.year).toFixed(1);
      segParts.push(
        `<line x1="${x1}" y1="${yOf(a.gdp_east).toFixed(1)}" x2="${x2}" y2="${yOf(b.gdp_east).toFixed(1)}" stroke="#d8b365" stroke-width="1.55"${dashAttr} />`,
        `<line x1="${x1}" y1="${yOf(a.gdp_west).toFixed(1)}" x2="${x2}" y2="${yOf(b.gdp_west).toFixed(1)}" stroke="#7aa6c9" stroke-width="1.55"${dashAttr} />`
      );
    }

    const dotParts = validNodes.map(n => {
      const cx = xOf(n.year).toFixed(1);
      return `<circle cx="${cx}" cy="${yOf(n.gdp_east).toFixed(1)}" r="1.35" fill="#d8b365" /><circle cx="${cx}" cy="${yOf(n.gdp_west).toFixed(1)}" r="1.35" fill="#7aa6c9" />`;
    });

    const curX = xOf(currentYear).toFixed(1);
    const preMidX = ((padX + x1CE) / 2).toFixed(1);

    svgChart.innerHTML = `
      <rect x="${padX}" y="3" width="${Math.max(0, x1CE - padX).toFixed(1)}" height="${h - 6}" rx="2" fill="rgba(216, 179, 101, 0.035)" />
      <line x1="${x1CE.toFixed(1)}" y1="4" x2="${x1CE.toFixed(1)}" y2="${h - 4}" stroke="rgba(216, 179, 101, 0.28)" stroke-width="0.8" stroke-dasharray="2 2" />
      <text x="${preMidX}" y="${(h / 2 - 3).toFixed(1)}" text-anchor="middle" fill="#8f8676" font-size="7.2">公元1年前</text>
      <text x="${preMidX}" y="${(h / 2 + 7).toFixed(1)}" text-anchor="middle" fill="#a89e8c" font-size="7.5">无可靠数据</text>
      ${segParts.join("")}
      ${dotParts.join("")}
      <line x1="${curX}" y1="3" x2="${curX}" y2="${h - 3}" stroke="rgba(243, 234, 216, 0.78)" stroke-width="1.05" stroke-dasharray="2 2" />
      <circle cx="${curX}" cy="${(h - 4.5).toFixed(1)}" r="2.1" fill="#d8b365" />
    `;

    svgChart.onclick = (e) => {
      const rect = svgChart.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetYr = normToYear(ratio);
      window.AtlasApp.jumpToYear(targetYr);
    };
  }

  function updateView() {
    const state = engine.getStateAtYear(currentYear);
    audio.setYear(currentYear);

    if (lastKeyframeYear !== null && state.keyframeYear !== lastKeyframeYear) {
      // Gentle dwell pause on new historical keyframe in relaxed idle modes
      if (speed <= 1) {
        dwellTicks = 22;
      }
      if (idleDrift && state.landmarks && state.landmarks.length > 0) {
        const lm = state.landmarks[0];
        renderer.focusOnPoint(lm.x, lm.y, 1.32);
      }
    }
    lastKeyframeYear = state.keyframeYear;

    // Swap only the era theme class; other body classes (e.g. inspector-open) must survive
    const themeClass = state.theme || "era-ancient";
    if (!document.body.classList.contains(themeClass)) {
      document.body.classList.remove("era-ancient", "era-medieval", "era-victoria", "era-modern");
      document.body.classList.add(themeClass);
    }

    document.getElementById("year-text").textContent = formatYear(currentYear);
    document.getElementById("era-text").textContent = state.era;
    const paceEl = document.getElementById("pace-badge");
    if (paceEl) paceEl.textContent = formatPaceLabel(currentYear, speed);

    const bannerEl = document.getElementById("event-banner");
    const toastSig = JSON.stringify({ t: state.toast, m: state.toastMeta || null });
    if (lastToastText !== toastSig) {
      lastToastText = toastSig;
      bannerEl.classList.remove("toast-fade");
      void bannerEl.offsetWidth;
      const meta = state.toastMeta;
      const badgeHtml = meta && meta.confidence
        ? buildConfidenceBadgeHtml(meta.confidence, meta.confidence_note, "conf-badge-inline") + " "
        : "";
      const srcHtml = meta && meta.source
        ? `<span class="banner-source"> · 出处：${escapeHtml(meta.source)}</span>`
        : "";
      bannerEl.innerHTML = `${badgeHtml}<span>${escapeHtml(state.toast)}</span>${srcHtml}`;
      bannerEl.classList.add("toast-fade");
    }
    document.getElementById("timeline-slider").value = Math.round(yearToNorm(currentYear) * 1000);

    renderer.renderState(state, selectedRegionId);
    renderMacroChart(state);

    if (selectedRegionId) {
      renderInspector(selectedRegionId, state);
    }
    if (typeof syncChinaAnnalsView === "function") {
      syncChinaAnnalsView();
    }
    if (personView) personView.sync(currentYear);
  }

  function formatShortYear(y) {
    return y < 0 ? `前${Math.abs(y)}` : `${y}`;
  }

  function readableInkColor(hex, empName) {
    if (window.HistoryAtlas && typeof window.HistoryAtlas.getReadableInkColor === "function") {
      return window.HistoryAtlas.getReadableInkColor(hex, empName);
    }
    const darkColors = ["#222629", "#2f3640", "#1e272e", "#2c3e50", "#1b2631"];
    if (!hex || darkColors.includes(hex.toLowerCase())) return "#d8c7a8";
    return hex;
  }

  function renderInspectorTrajectory(ownerName) {
    const box = document.getElementById("card-trajectory-box");
    const svg = document.getElementById("card-trajectory-svg");
    const summaryEl = document.getElementById("card-traj-summary");
    const msRow = document.getElementById("card-milestones-row");
    const peersRow = document.getElementById("card-peers-row");
    if (!box || !svg || !msRow || !peersRow) return;

    const traj = ownerName ? engine.getEmpireTrajectory(ownerName) : null;
    if (!traj || !traj.points || traj.points.length === 0) {
      box.style.display = "none";
      return;
    }
    box.style.display = "";
    const strokeColor = readableInkColor(traj.color);
    if (summaryEl) {
      summaryEl.textContent = `国祚约 ${traj.duration} 年 · 点击跳转`;
    }

    const W = 276;
    const H = 82;
    const padL = 8;
    const padR = 8;
    const padT = 12;
    const padB = 15;
    const minY = traj.startY;
    const maxY = Math.max(minY + 1, traj.endY);
    const maxArea = Math.max(10, traj.peakAreaNum);

    const toX = (yr) => padL + ((yr - minY) / (maxY - minY)) * (W - padL - padR);
    const toY = (area) => (H - padB) - (Math.min(maxArea, Math.max(0, area)) / maxArea) * (H - padT - padB);

    const pts = traj.points.map(p => `${toX(p.year).toFixed(1)},${toY(p.area).toFixed(1)}`);
    const areaPoly = `${toX(traj.points[0].year).toFixed(1)},${(H - padB).toFixed(1)} ${pts.join(" ")} ${toX(traj.points[traj.points.length - 1].year).toFixed(1)},${(H - padB).toFixed(1)}`;
    const curClamped = Math.max(minY, Math.min(maxY, currentYear));
    const curX = toX(curClamped).toFixed(1);
    const inEra = currentYear >= minY && currentYear <= maxY;

    const msDots = traj.milestones.map(m => {
      const mx = toX(m.year).toFixed(1);
      const my = toY(m.area).toFixed(1);
      const isPeak = m.phase === "peak";
      return `
        <circle cx="${mx}" cy="${my}" r="${isPeak ? 3.2 : 2.3}" fill="#171411" stroke="${isPeak ? "#e5c67b" : strokeColor}" stroke-width="${isPeak ? 1.6 : 1.2}" />
      `;
    }).join("");

    svg.innerHTML = `
      <line x1="${padL}" y1="${padT}" x2="${W - padR}" y2="${padT}" stroke="rgba(216,179,101,0.12)" stroke-dasharray="2 2" stroke-width="0.7" />
      <line x1="${padL}" y1="${((padT + H - padB) / 2).toFixed(1)}" x2="${W - padR}" y2="${((padT + H - padB) / 2).toFixed(1)}" stroke="rgba(216,179,101,0.10)" stroke-dasharray="2 2" stroke-width="0.7" />
      <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="rgba(216,179,101,0.24)" stroke-width="0.8" />
      <polygon points="${areaPoly}" fill="${strokeColor}" fill-opacity="0.16" />
      <polyline points="${pts.join(" ")}" fill="none" stroke="${strokeColor}" stroke-width="1.55" stroke-linejoin="round" stroke-linecap="round" />
      ${inEra ? `<line x1="${curX}" y1="${padT - 3}" x2="${curX}" y2="${H - padB}" stroke="#e5c67b" stroke-width="1" stroke-dasharray="2 1.5" />` : ""}
      ${msDots}
      <text x="${padL}" y="${H - 3}" fill="#8e8577" font-size="8.5">${formatShortYear(minY)}</text>
      <text x="${(W / 2).toFixed(0)}" y="${H - 3}" fill="#b7aa93" font-size="8.5" text-anchor="middle">极盛 ${formatShortYear(traj.peakYear)} (${traj.peak_area})</text>
      <text x="${W - padR}" y="${H - 3}" fill="#8e8577" font-size="8.5" text-anchor="end">${traj.isAliveToday ? "至今" : formatShortYear(maxY)}</text>
    `;

    svg.onclick = (e) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetYr = Math.round(minY + ratio * (maxY - minY));
      window.AtlasApp.jumpToYear(Math.max(-3000, Math.min(2026, targetYr)));
    };

    msRow.innerHTML = traj.milestones.map(m => `
      <button class="traj-ms-chip" onclick="AtlasApp.jumpToYear(${Math.min(2026, m.year)})" title="跳转至 ${formatYear(m.year)}">
        <span class="ms-tag">${m.label}</span><span>${formatShortYear(m.year)}</span>
      </button>
    `).join("");

    const peers = engine.getContemporaryPeers(ownerName, currentYear, 2);
    if (peers.length > 0) {
      const p1 = peers[0];
      const p2 = peers[1] || null;
      peersRow.innerHTML = `
        <span class="peers-label">同代列国：</span>
        ${peers.map(p => `
          <button class="peer-chip" onclick="AtlasApp.openCompareModal('${ownerName.replace(/'/g, "\\'")}', '${p.name.replace(/'/g, "\\'")}', '${p2 && p2.name !== p.name ? p2.name.replace(/'/g, "\\'") : (p1.name !== p.name ? p1.name.replace(/'/g, "\\'") : "")}')">
            <i class="peer-dot" style="background:${readableInkColor(p.color)}"></i>${p.name}
          </button>
        `).join("")}
      `;
    } else {
      peersRow.innerHTML = "";
    }
  }

  // Holder shown for a historic region: the clicked unit's holder, else the holder of the region's largest unit
  function ownerForRegion(regionId, state) {
    const uo = renderer._unitOwners;
    const MU = window.HistoryAtlas.MAP_UNITS;
    if (!uo || !MU) return state.owners[regionId];
    if (selectedUnitId && uo[selectedUnitId] !== undefined) {
      const u = MU.units.find(x => x.id === selectedUnitId);
      if (u && u.r === regionId) return uo[selectedUnitId];
    }
    let best = null;
    for (const u of MU.units) if (u.r === regionId && (!best || u.w > best.w)) best = u;
    return best ? uo[best.id] : state.owners[regionId];
  }

  function renderInspector(regionId, state) {
    const regObj = REGIONS.find(r => r.id === regionId);
    if (!regObj) return;

    const ownerName = ownerForRegion(regionId, state);
    const confBadgeEl = document.getElementById("card-confidence-badge");
    const MUc = window.HistoryAtlas.MAP_UNITS;
    const selUnit = MUc && selectedUnitId ? MUc.units.find(u => u.id === selectedUnitId && u.r === regionId) : null;
    document.getElementById("card-region").textContent = selUnit
      ? `${selUnit.n} · 历史区块：${regObj.name}`
      : `${regObj.continent} · ${regObj.name}`;

    if (ownerName && EMPIRES[ownerName]) {
      const emp = EMPIRES[ownerName];
      document.getElementById("card-empire").textContent = ownerName;
      document.getElementById("card-empire").style.color = readableInkColor(emp.color, ownerName);

      if (confBadgeEl) {
        const cfg = getConfidenceConfig();
        const pConf = cfg.polities && cfg.polities[ownerName];
        const cls = pConf && pConf.level ? getConfidenceClass(pConf.level) : "";
        if (cls) {
          const noteStr = pConf.note || (cfg.levels && cfg.levels[pConf.level]) || "";
          confBadgeEl.className = `conf-badge ${cls}`;
          confBadgeEl.textContent = pConf.level;
          confBadgeEl.setAttribute("data-conf-level", pConf.level);
          confBadgeEl.setAttribute("data-conf-note", noteStr);
          confBadgeEl.setAttribute("title", noteStr || pConf.level);
          confBadgeEl.style.display = "inline-flex";
        } else {
          confBadgeEl.style.display = "none";
          confBadgeEl.textContent = "";
          confBadgeEl.removeAttribute("data-conf-level");
          confBadgeEl.removeAttribute("data-conf-note");
        }
      }

      document.getElementById("card-desc").textContent = emp.desc;
      document.getElementById("card-capital").textContent = emp.capital;
      document.getElementById("card-regime").textContent = emp.regime;
      const areaEl = document.getElementById("card-area");
      const areaKnown = emp.peak_area && !/^(不详|未知|-)$/.test(String(emp.peak_area).trim());
      areaEl.textContent = areaKnown ? emp.peak_area : "";
      areaEl.parentElement.style.display = areaKnown ? "" : "none";
      document.getElementById("card-span").textContent = emp.era_span;
      document.getElementById("card-cap-evol").textContent = emp.capital_evol || emp.capital || "-";
      document.getElementById("card-inst").textContent = emp.institutions || emp.regime || "-";
      document.getElementById("card-fiscal").textContent = emp.fiscal_tax || "-";
      document.getElementById("card-demog").textContent = emp.peak_demography || emp.peak_area || "-";
      document.getElementById("card-treaties").textContent = emp.treaties_campaigns || "-";
      renderInspectorTrajectory(ownerName);
    } else {
      if (confBadgeEl) {
        confBadgeEl.style.display = "none";
        confBadgeEl.textContent = "";
        confBadgeEl.removeAttribute("data-conf-level");
        confBadgeEl.removeAttribute("data-conf-note");
      }
      // No state ruled this region at this time: describe who lived there instead of inventing a polity
      const culture = (state.cultures && state.cultures[regionId]) || null;
      const spanText = culture ? `${formatYear(culture.from)} - ${formatYear(culture.to)}` : "-";
      document.getElementById("card-empire").textContent = culture ? culture.name : "无统一政权";
      document.getElementById("card-empire").style.color = "#b9b1a0";
      document.getElementById("card-desc").textContent = culture
        ? culture.note
        : "此时该地区没有国家统治，或现有史料不足以确认存在国家。";
      document.getElementById("card-capital").textContent = "无（非国家社会）";
      document.getElementById("card-regime").textContent = culture ? culture.kind : "无统一政权";
      document.getElementById("card-area").textContent = "-";
      document.getElementById("card-span").textContent = spanText;
      document.getElementById("card-cap-evol").textContent = "-";
      document.getElementById("card-inst").textContent = culture ? `${culture.kind}：${culture.note}` : "-";
      document.getElementById("card-fiscal").textContent = "-";
      document.getElementById("card-demog").textContent = "-";
      document.getElementById("card-treaties").textContent = "-";
      renderInspectorTrajectory(null);
    }

    const historyList = selUnit
      ? engine.getUnitHistory(selUnit.id, regionId, currentYear)
      : engine.getRegionHistory(regionId, currentYear);
    const histContainer = document.getElementById("card-history-list");
    histContainer.innerHTML = "";
    if (historyList.length === 0) {
      histContainer.innerHTML = '<div class="hist-item is-stateless">暂无政权更替记录</div>';
    } else {
      const head = document.createElement("div");
      head.className = "hist-scope";
      head.textContent = selUnit ? `${selUnit.n}历代归属（共 ${historyList.length} 段，新近在前）` : `${regObj.name.split("(")[0]}历代归属（新近在前）`;
      histContainer.appendChild(head);
      historyList.slice(0, selUnit ? 12 : 6).forEach(h => {
        const div = document.createElement("div");
        div.className = h.stateless ? "hist-item is-stateless" : "hist-item";
        div.innerHTML = `<span class="hist-year">${formatYear(h.year)}</span> <span class="hist-owner">${h.owner}</span>`;
        histContainer.appendChild(div);
      });
    }

    renderInspectorRoutes(state, regionId);
  }

  function renderInspectorRoutes(state, regionId) {
    const pillsEl = document.getElementById("card-routes-pills");
    const detailEl = document.getElementById("card-route-detail");
    const countEl = document.getElementById("card-routes-count");
    if (!pillsEl || !detailEl) return;

    const activeIds = (state.routes || []).filter(id => Boolean(TRADE_ROUTES[id]));
    if (countEl) {
      countEl.textContent = activeIds.length > 0 ? `通行 ${activeIds.length} 条干线` : "跨洲干线未通";
    }

    if (activeIds.length === 0) {
      if (selectedRouteId) {
        selectedRouteId = null;
        renderer.setFocusedRoute(null);
      }
      pillsEl.innerHTML = `
        <button class="traj-ms-chip" onclick="AtlasApp.jumpToYear(-119)"><span class="ms-tag">凿空西域</span>前119</button>
        <button class="traj-ms-chip" onclick="AtlasApp.jumpToYear(750)"><span class="ms-tag">盛唐海陆</span>750</button>
        <button class="traj-ms-chip" onclick="AtlasApp.jumpToYear(1572)"><span class="ms-tag">白银帆船</span>1572</button>
      `;
      detailEl.innerHTML = `<div class="route-empty-note">当前处于远古区域物产交换时期，跨大陆驼道与季风远洋航线尚未贯通。</div>`;
      return;
    }

    let activeRouteId = selectedRouteId && activeIds.includes(selectedRouteId) ? selectedRouteId : null;
    if (!activeRouteId) {
      const regMatch = activeIds.find(rid => (TRADE_ROUTES[rid].hubs || []).some(h => h.regionId === regionId));
      activeRouteId = regMatch || activeIds[0];
    }

    pillsEl.innerHTML = activeIds.map(rid => {
      const rt = TRADE_ROUTES[rid];
      const isFocused = rid === activeRouteId;
      const isPinned = rid === selectedRouteId;
      return `
        <button class="route-pill-btn${isFocused ? " active" : ""}" onclick="AtlasApp.selectRoute('${rid}')" title="${rt.name}">
          <i class="peer-dot" style="background:${rt.color || "#cfa55a"}"></i>
          <span>${rt.short_name || rt.name}</span>
          ${isPinned ? '<span class="route-pin-mark">·定</span>' : ""}
        </button>
      `;
    }).join("");

    const rt = TRADE_ROUTES[activeRouteId];
    if (!rt) {
      detailEl.innerHTML = "";
      return;
    }
    const hubsHtml = (rt.hubs || []).map((h, idx) => `
      <button class="route-hub-chip${h.regionId === regionId ? " is-here" : ""}" onclick="AtlasApp.focusRouteHub('${activeRouteId}', ${idx})" title="${h.role} · ${h.goods}">
        ◎ ${h.name}
      </button>
    `).join("");

    detailEl.innerHTML = `
      <div class="route-meta-head">
        <span class="route-cat-tag" style="border-color:${rt.color || "#cfa55a"};color:${rt.color || "#cfa55a"}">${rt.category || "跨洲商道"}</span>
        <span class="route-span-txt">${rt.active_span || ""}</span>
      </div>
      <div class="route-goods-line"><strong>流通货殖：</strong>${rt.commodities || "-"}</div>
      <div class="route-hubs-wrap">${hubsHtml}</div>
      <div class="route-impact-note">${rt.historical_impact || ""}</div>
    `;
  }

  // Initialize Comparison Selectors (2 required + 1 optional contemporary polity)
  function resolveEmpireKey(query, fallback) {
    const names = Object.keys(EMPIRES);
    if (!query) return fallback || names[0];
    if (EMPIRES[query]) return query;
    const hit = names.find(n => n.includes(query) || query.includes(n));
    if (hit) return hit;
    const tokens = query.split(/[\s/()（）·]+/).filter(t => t.length >= 2);
    const tokHit = names.find(n => tokens.some(t => n.includes(t)));
    return tokHit || fallback || names[0];
  }

  function initCompareSelectors(defaultA = "大唐帝国", defaultB = "阿拔斯王朝", defaultC = "拜占庭帝国") {
    const selA = document.getElementById("cmp-select-a");
    const selB = document.getElementById("cmp-select-b");
    const selC = document.getElementById("cmp-select-c");
    if (!selA || !selB) return;
    const names = Object.keys(EMPIRES);
    const optsHtml = names.map(n => `<option value="${n}">${n}</option>`).join("");
    selA.innerHTML = optsHtml;
    selB.innerHTML = optsHtml;
    selA.value = resolveEmpireKey(defaultA, names[0]);
    selB.value = resolveEmpireKey(defaultB, names[1]);
    if (selC) {
      selC.innerHTML = `<option value="">（不叠加第三政权 · 仅双国对比）</option>${optsHtml}`;
      selC.value = defaultC ? resolveEmpireKey(defaultC, "") : "";
    }
  }

  // Close search dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const wrap = document.querySelector(".search-wrap");
    const dd = document.getElementById("search-dropdown");
    if (dd && wrap && !wrap.contains(e.target)) {
      dd.style.display = "none";
    }
  });

  window.AtlasApp = {
    toggleInspector() {
      setInspectorOpen(infoCardEl ? infoCardEl.classList.contains("is-collapsed") : false);
    },
    togglePlay() {
      isPlaying = !isPlaying;
      const btn = document.getElementById("btn-play");
      btn.textContent = isPlaying ? "II 暂停演化" : "▶ 继续演化";
      btn.classList.toggle("active", isPlaying);
    },
    setSpeed(s) {
      speed = s;
      [0.5, 1, 2, 5].forEach(k => {
        const el = document.getElementById("btn-" + k + "x");
        if (el) el.classList.toggle("active", k === s);
      });
      const paceEl = document.getElementById("pace-badge");
      if (paceEl) paceEl.textContent = formatPaceLabel(currentYear, speed);
    },
    jumpToYear(y) {
      currentYear = y;
      yearFloat = y;
      dwellTicks = 0;
      updateView();
    },
    onSliderInput(val) {
      const num = parseFloat(val);
      currentYear = normToYear(num / 1000);
      yearFloat = currentYear;
      dwellTicks = 0;
      updateView();
    },
    toggleIdleDrift() {
      idleDrift = !idleDrift;
      const btn = document.getElementById("btn-drift");
      if (btn) btn.classList.toggle("active", idleDrift);
      if (idleDrift) {
        const state = engine.getStateAtYear(currentYear);
        if (state.landmarks && state.landmarks.length > 0) {
          renderer.focusOnPoint(state.landmarks[0].x, state.landmarks[0].y, 1.32);
        }
      } else {
        renderer.resetView();
      }
    },
    toggleCampaigns() {
      const on = renderer.toggleCampaigns();
      const btn = document.getElementById("btn-campaigns");
      if (btn) btn.classList.toggle("active", on);
      updateView();
    },
    toggleRoutes() {
      const on = renderer.toggleRoutes();
      const btn = document.getElementById("btn-routes");
      if (btn) btn.classList.toggle("active", on);
      updateView();
    },
    selectRoute(routeId) {
      selectedRouteId = selectedRouteId === routeId ? null : routeId;
      renderer.setFocusedRoute(selectedRouteId);
      updateView();
    },
    focusRouteHub(routeId, hubIndex) {
      const rt = TRADE_ROUTES[routeId];
      const hub = rt && rt.hubs ? rt.hubs[hubIndex] : null;
      selectedRouteId = routeId;
      renderer.setFocusedRoute(routeId);
      renderer.setHighlightEmpire(null);
      if (hub) {
        if (hub.regionId) selectedRegionId = hub.regionId;
        renderer.focusOnPoint(hub.x, hub.y, 1.95);
      }
      updateView();
    },
    focusTheater(thId) {
      activateTheater(thId);
    },
    resetCamera() {
      activeTheaterId = "world";
      document.querySelectorAll(".theater-pill").forEach(el => el.classList.toggle("active", el.id === "th-world"));
      if (window.innerWidth <= 900 && window.innerHeight > window.innerWidth) {
        focusPhoneHome();
      } else {
        renderer.resetView();
      }
    },
    toggleTheme() {
      theme = theme === "paper" ? "night" : "paper";
      try { localStorage.setItem("atlas.theme", theme); } catch (e) { /* storage blocked */ }
      document.body.classList.toggle("theme-paper", theme === "paper");
      window.HistoryAtlas.setPaletteMode(theme);
      renderer.refreshPalette();
      syncThemeButton();
    },
    toggleMusic() {
      audio.setYear(currentYear);
      audio.toggleMusic();
      syncMusicButton();
    },
    onSearchInput(val) {
      const dd = document.getElementById("search-dropdown");
      if (!dd) return;
      const hits = engine.search(val);
      if (hits.length === 0) {
        dd.style.display = "none";
        return;
      }
      dd.innerHTML = "";
      hits.forEach(h => {
        const item = document.createElement("div");
        item.className = "s-item";
        item.innerHTML = `
          <div>
            <div class="s-title">${h.title}</div>
            <div class="s-sub">${h.sub}</div>
          </div>
          <span class="s-badge">${h.type}</span>
        `;
        item.onclick = () => {
          dd.style.display = "none";
          if (h.personId) {
            if (personView) personView.open(h.personId);
            return;
          }
          if (typeof h.year === "number") {
            currentYear = h.year;
            yearFloat = h.year;
          }
          if (h.routeId) {
            selectedRouteId = h.routeId;
            renderer.setFocusedRoute(h.routeId);
          }
          if (h.empireName) {
            renderer.setHighlightEmpire(h.empireName);
          }
          if (h.regionId) {
            selectedRegionId = h.regionId;
            selectedUnitId = h.unitId || null;
            if (h.unitId) setInspectorOpen(true);
          }
          if (h.x && h.y) {
            renderer.focusOnPoint(h.x, h.y, h.unitId ? 3.0 : 2.0);
          }
          updateView();
        };
        dd.appendChild(item);
      });
      dd.style.display = "block";
    },
    openCompareModal(empA, empB, empC) {
      initCompareSelectors(
        empA || "大汉帝国",
        empB || "罗马帝国",
        typeof empC === "string" ? empC : "安息帝国"
      );
      document.getElementById("compare-modal").style.display = "flex";
      this.renderComparison();
    },
    applyComparePreset(empA, empB, empC = "") {
      initCompareSelectors(empA, empB, empC);
      this.renderComparison();
    },
    compareCurrentEmpire() {
      const state = engine.getStateAtYear(currentYear);
      const curEmp = state.owners[selectedRegionId] || "大唐帝国";
      const peers = engine.getContemporaryPeers(curEmp, currentYear, 2);
      const secondEmp = peers[0] ? peers[0].name : (curEmp === "罗马帝国" ? "大汉帝国" : "罗马帝国");
      const thirdEmp = peers[1] ? peers[1].name : "";
      this.openCompareModal(curEmp, secondEmp, thirdEmp);
    },
    closeCompareModal() {
      document.getElementById("compare-modal").style.display = "none";
    },
    renderComparison() {
      const empA = document.getElementById("cmp-select-a").value;
      const empB = document.getElementById("cmp-select-b").value;
      const selC = document.getElementById("cmp-select-c");
      const empC = selC ? selC.value : "";
      const cmp = engine.getEmpireComparison(empA, empB, empC);
      const items = cmp.list;
      if (!items.length) return;

      const maxArea = Math.max(80, ...items.map(d => d.areaNum));
      const maxDur = Math.max(50, ...items.map(d => d.duration));
      const [minYear, maxYear] = cmp.domain;
      const spanYears = Math.max(1, maxYear - minYear);

      // Build unified multi-polity chronological copperplate chart
      const W = 796;
      const H = 186;
      const padL = 46;
      const padR = 18;
      const padT = 34;
      const padB = 24;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const toX = (yr) => padL + ((yr - minYear) / spanYears) * plotW;
      const toY = (area) => (H - padB) - (Math.min(maxArea, Math.max(0, area)) / maxArea) * plotH;

      const dashStyles = ["", "5 2.5", "2 2"];
      const tickCount = 6;
      let gridSvg = "";
      for (let t = 0; t <= tickCount; t++) {
        const ty = minYear + Math.round((spanYears * t) / tickCount);
        const tx = toX(ty).toFixed(1);
        gridSvg += `
          <line x1="${tx}" y1="${padT}" x2="${tx}" y2="${H - padB}" stroke="rgba(216,179,101,0.10)" stroke-width="0.8" stroke-dasharray="2 3" />
          <text x="${tx}" y="${H - 7}" fill="#948a78" font-size="10" text-anchor="${t === 0 ? "start" : t === tickCount ? "end" : "middle"}">${formatShortYear(ty)}</text>
        `;
      }
      [0, 0.5, 1].forEach((ratio) => {
        const gy = (H - padB - ratio * plotH).toFixed(1);
        const val = Math.round(maxArea * ratio);
        gridSvg += `
          <line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="rgba(216,179,101,${ratio === 0 ? "0.28" : "0.11"})" stroke-width="0.8" />
          <text x="${padL - 6}" y="${(parseFloat(gy) + 3.5).toFixed(1)}" fill="#8e8577" font-size="9.5" text-anchor="end">${val}</text>
        `;
      });

      const placedPeakLabels = [];
      const seriesSvg = items.map((d, idx) => {
        const traj = d.trajectory;
        if (!traj || !traj.points.length) return "";
        const col = readableInkColor(d.color);
        const pts = traj.points.map(p => `${toX(p.year).toFixed(1)},${toY(p.area).toFixed(1)}`);
        const areaPoly = `${toX(traj.points[0].year).toFixed(1)},${(H - padB).toFixed(1)} ${pts.join(" ")} ${toX(traj.points[traj.points.length - 1].year).toFixed(1)},${(H - padB).toFixed(1)}`;
        const spanY = 10 + idx * 7.5;
        const sx1 = toX(traj.startY).toFixed(1);
        const sx2 = toX(traj.endY).toFixed(1);
        const pkXNum = toX(traj.peakYear);
        const pkYNum = toY(traj.peakAreaNum);
        const dashAttr = dashStyles[idx] ? `stroke-dasharray="${dashStyles[idx]}"` : "";

        let lblY = Math.max(padT + 9, pkYNum - 7);
        let lblAnchor = pkXNum < padL + 58 ? "start" : pkXNum > W - padR - 58 ? "end" : "middle";
        for (let pass = 0; pass < 3; pass++) {
          const hit = placedPeakLabels.find(pl => Math.abs(pl.x - pkXNum) < 118 && Math.abs(pl.y - lblY) < 12);
          if (!hit) break;
          lblY = Math.min(H - padB - 8, hit.y + 13);
        }
        placedPeakLabels.push({ x: pkXNum, y: lblY });

        const msMarkers = traj.milestones.map(m => {
          const mx = toX(m.year).toFixed(1);
          const my = toY(m.area).toFixed(1);
          return `<circle cx="${mx}" cy="${my}" r="${m.phase === "peak" ? 3.5 : 2.3}" fill="#161411" stroke="${col}" stroke-width="1.4" />`;
        }).join("");

        return `
          <line x1="${sx1}" y1="${spanY}" x2="${sx2}" y2="${spanY}" stroke="${col}" stroke-width="2.4" stroke-linecap="round" opacity="0.72" />
          <polygon points="${areaPoly}" fill="${col}" fill-opacity="0.10" />
          <polyline points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="1.9" ${dashAttr} stroke-linejoin="round" stroke-linecap="round" />
          ${msMarkers}
          <text x="${pkXNum.toFixed(1)}" y="${lblY.toFixed(1)}" fill="${col}" font-size="9.5" font-weight="bold" text-anchor="${lblAnchor}">${d.name}·极盛(${formatShortYear(traj.peakYear)})</text>
        `;
      }).join("");

      const curInDomain = currentYear >= minYear && currentYear <= maxYear;
      const curLineSvg = curInDomain
        ? `<line x1="${toX(currentYear).toFixed(1)}" y1="${padT - 4}" x2="${toX(currentYear).toFixed(1)}" y2="${H - padB}" stroke="#e5c67b" stroke-width="1" stroke-dasharray="3 2" />`
        : "";

      const legendHtml = items.map((d) => {
        const col = readableInkColor(d.color);
        const msText = (d.trajectory ? d.trajectory.milestones : [])
          .map(m => `${m.label}:${formatShortYear(m.year)}`)
          .join(" · ");
        return `
          <div class="cmp-leg-item">
            <span class="cmp-leg-swatch" style="background:${col}"></span>
            <strong>${d.name}</strong>
            <span class="cmp-leg-ms">(${msText})</span>
          </div>
        `;
      }).join("");

      const renderCol = (d) => {
        const col = readableInkColor(d.color);
        return `
          <div class="cmp-col">
            <div class="cmp-title" style="color:${col}">${d.name}</div>
            <div class="cmp-sub">${d.era_span} · ${d.continent} · 首都：${d.capital}</div>
            <div class="cmp-metric">
              <div class="cmp-metric-head"><span>鼎盛疆域面积</span><strong>${d.peak_area}</strong></div>
              <div class="cmp-bar-bg"><div class="cmp-bar-fill" style="width:${Math.round((d.areaNum / maxArea) * 100)}%; background:${col}"></div></div>
            </div>
            <div class="cmp-metric">
              <div class="cmp-metric-head"><span>国祚延续跨度</span><strong>约 ${d.duration} 年 (${d.regime})</strong></div>
              <div class="cmp-bar-bg"><div class="cmp-bar-fill" style="width:${Math.round((d.duration / maxDur) * 100)}%; background:${col}"></div></div>
            </div>
            <div class="cmp-scholarly-meta">
              <div><span>官制兵制：</span>${d.institutions}</div>
              <div><span>赋役财政：</span>${d.fiscal_tax}</div>
              <div><span>人口四至：</span>${d.peak_demography}</div>
            </div>
            <div class="cmp-desc">${d.desc}</div>
            <button class="cmp-jump-btn" onclick="AtlasApp.jumpToEmpirePeak('${d.name.replace(/'/g, "\\'")}', ${d.peakYear})">
              ▶ 跳转至其极盛年 (${formatYear(d.peakYear)}) 并高亮版图
            </button>
          </div>
        `;
      };

      document.getElementById("compare-body").innerHTML = `
        <div class="cmp-trajectory-panel">
          <div class="cmp-traj-top">
            <div class="cmp-leg-list">${legendHtml}</div>
            <span class="cmp-axis-note">纵轴：万 km² · 点击图谱任意纪年即刻穿越</span>
          </div>
          <svg id="cmp-overlay-svg" viewBox="0 0 ${W} ${H}">
            ${gridSvg}
            ${seriesSvg}
            ${curLineSvg}
          </svg>
        </div>
        <div class="cmp-grid ${items.length === 3 ? "cmp-grid-3" : ""}">
          ${items.map(renderCol).join("")}
        </div>
      `;

      const overlaySvg = document.getElementById("cmp-overlay-svg");
      if (overlaySvg) {
        overlaySvg.onclick = (e) => {
          const rect = overlaySvg.getBoundingClientRect();
          if (!rect.width) return;
          const svgX = ((e.clientX - rect.left) / rect.width) * W;
          const ratio = Math.max(0, Math.min(1, (svgX - padL) / plotW));
          const targetYr = Math.max(-3000, Math.min(2026, Math.round(minYear + ratio * spanYears)));
          this.closeCompareModal();
          this.jumpToYear(targetYr);
        };
      }
    },
    jumpToEmpirePeak(empName, peakYear) {
      this.closeCompareModal();
      currentYear = peakYear;
      yearFloat = peakYear;
      renderer.setHighlightEmpire(empName);
      const state = engine.getStateAtYear(currentYear);
      const firstReg = Object.keys(state.owners).find(k => state.owners[k] === empName);
      if (firstReg) selectedRegionId = firstReg;
      updateView();
    },
    openChronicleModal() {
      const modal = document.getElementById("chronicle-modal");
      if (!modal) return;
      modal.style.display = "flex";
      this.renderChronicleList();
    },
    closeChronicleModal() {
      const modal = document.getElementById("chronicle-modal");
      if (modal) modal.style.display = "none";
    },
    renderChronicleList() {
      const listEl = document.getElementById("chronicle-list");
      const countEl = document.getElementById("chr-count-badge");
      if (!listEl) return;
      const eraGroup = (document.getElementById("chr-era-filter") || {}).value || "ALL";
      const theater = (document.getElementById("chr-theater-filter") || {}).value || "ALL";
      const category = (document.getElementById("chr-cat-filter") || {}).value || "ALL";
      const query = (document.getElementById("chr-search-input") || {}).value || "";

      const items = engine.filterChronicles({ eraGroup, theater, category, query });
      if (countEl) countEl.textContent = `共 ${items.length} 条史实`;

      if (items.length === 0) {
        listEl.innerHTML = `<div class="chr-empty">未找到匹配的编年史条目，请尝试切换筛选条件或搜索关键词。</div>`;
        return;
      }

      listEl.innerHTML = items.map(ev => {
        const confHtml = ev.confidence
          ? buildConfidenceBadgeHtml(ev.confidence, ev.confidence_note || "")
          : "";
        const sourceHtml = ev.source
          ? `<div class="chr-source">出处：${escapeHtml(ev.source)}</div>`
          : "";
        return `
        <div class="chr-row" onclick="AtlasApp.jumpToChronicleEvent(${ev.year}, '${ev.regionId || ""}', ${ev.x || 0}, ${ev.y || 0})">
          <div class="chr-left">
            <span class="chr-year-badge">${escapeHtml(ev.date_label)}</span>
            <span class="chr-region-badge">${escapeHtml(ev.region_name || "全球")}</span>
          </div>
          <div class="chr-main">
            <div class="chr-head-line">
              <div class="chr-title-wrap">
                <span class="chr-title">${escapeHtml(ev.title)}</span>
                ${confHtml}
              </div>
              <div class="chr-tags">
                <span class="chr-tag chr-tag-theater">${escapeHtml(ev.theater)}</span>
                <span class="chr-tag chr-tag-cat">${escapeHtml(ev.category)}</span>
              </div>
            </div>
            <div class="chr-detail">${escapeHtml(ev.detail)}</div>
            ${sourceHtml}
          </div>
          <div class="chr-action">▶ 穿越定位</div>
        </div>
      `;
      }).join("");
    },
    jumpToChronicleEvent(yr, regId, x, y) {
      this.closeChronicleModal();
      engine.pinnedChronicleYear = yr;
      currentYear = yr;
      yearFloat = yr;
      dwellTicks = 25;
      if (regId) {
        selectedRegionId = regId;
      }
      if (x && y) {
        renderer.focusOnPoint(x, y, 1.85);
      }
      updateView();
    }
  };

  initTheaterBar();
  const chrBtnEl = document.getElementById("btn-open-chronicle");
  if (chrBtnEl && window.HistoryAtlas.CHRONICLE_ANNALS) {
    chrBtnEl.textContent = `❖ 编年史大库 (${window.HistoryAtlas.CHRONICLE_ANNALS.length})`;
  }

  // === WH-CN-1: Dual-Track Reign/Gan-Zhi Chronology & China Annals Integration ===
  const Chronology = window.HistoryAtlas.Chronology;
  const ChinaAnnalsController = window.HistoryAtlas.ChinaAnnalsController;
  var exactOneYearPerSec = false;
  var precisionTickAcc = 0;
  var chinaAnnals = null;

  function syncChinaAnnalsView() {
    if (currentYear === 0) {
      currentYear = 1;
      yearFloat = 1;
      const yt = document.getElementById("year-text");
      if (yt) yt.textContent = formatYear(currentYear);
    }
    if (exactOneYearPerSec) {
      const paceEl = document.getElementById("pace-badge");
      if (paceEl) paceEl.textContent = "1年/秒 · 逐年精读";
    }
    if (chinaAnnals) {
      chinaAnnals.sync(currentYear, exactOneYearPerSec);
    }
  }

  const origSetSpeed = window.AtlasApp.setSpeed.bind(window.AtlasApp);
  window.AtlasApp.setSpeed = function (s) {
    exactOneYearPerSec = false;
    precisionTickAcc = 0;
    origSetSpeed(s);
    syncChinaAnnalsView();
  };

  const origJumpToYear = window.AtlasApp.jumpToYear.bind(window.AtlasApp);
  window.AtlasApp.jumpToYear = function (y) {
    const safeY = Chronology ? Chronology.skipZeroYear(Math.round(y), 1) : (y === 0 ? 1 : Math.round(y));
    if (chinaAnnals && chinaAnnals.isOpen() && isPlaying && !exactOneYearPerSec) {
      window.AtlasApp.togglePlay();
    }
    precisionTickAcc = 0;
    origJumpToYear(safeY);
  };

  const origOnSliderInput = window.AtlasApp.onSliderInput.bind(window.AtlasApp);
  window.AtlasApp.onSliderInput = function (val) {
    precisionTickAcc = 0;
    origOnSliderInput(val);
    if (currentYear === 0) {
      currentYear = 1;
      yearFloat = 1;
      updateView();
    }
  };

  const origToggleInspector = window.AtlasApp.toggleInspector.bind(window.AtlasApp);
  window.AtlasApp.toggleInspector = function () {
    if (chinaAnnals && chinaAnnals.isOpen()) {
      chinaAnnals.setOpen(false);
    }
    origToggleInspector();
  };

  Object.assign(window.AtlasApp, {
    stepYear(delta) {
      if (isPlaying) this.togglePlay();
      if (exactOneYearPerSec) {
        exactOneYearPerSec = false;
        [0.5, 1, 2, 5].forEach(k => {
          const el = document.getElementById("btn-" + k + "x");
          if (el) el.classList.toggle("active", k === speed);
        });
      }
      precisionTickAcc = 0;
      dwellTicks = 0;
      currentYear = Chronology
        ? Chronology.stepHistoricalYear(currentYear, delta)
        : Math.max(-3000, Math.min(2026, (currentYear + delta === 0 ? (delta > 0 ? 1 : -1) : currentYear + delta)));
      yearFloat = currentYear;
      updateView();
    },
    togglePrecisionPace() {
      exactOneYearPerSec = !exactOneYearPerSec;
      precisionTickAcc = 0;
      dwellTicks = 0;
      yearFloat = currentYear;
      if (exactOneYearPerSec) {
        [0.5, 1, 2, 5].forEach(k => {
          const el = document.getElementById("btn-" + k + "x");
          if (el) el.classList.remove("active");
        });
        if (!isPlaying) this.togglePlay();
      } else {
        [0.5, 1, 2, 5].forEach(k => {
          const el = document.getElementById("btn-" + k + "x");
          if (el) el.classList.toggle("active", k === speed);
        });
        const paceEl = document.getElementById("pace-badge");
        if (paceEl) paceEl.textContent = formatPaceLabel(currentYear, speed);
      }
      syncChinaAnnalsView();
    },
    openPersonPicker() {
      if (personView) personView.openPicker();
    },
    toggleChinaAnnals(forceOpen) {
      if (!chinaAnnals) return;
      const next = typeof forceOpen === "boolean" ? forceOpen : !chinaAnnals.isOpen();
      chinaAnnals.setOpen(next);
    },
    focusRegionById(regionId) {
      if (!regionId) return;
      const reg = REGIONS.find(r => r.id === regionId);
      if (!reg) return;
      selectedRegionId = regionId;
      renderer.setHighlightEmpire(null);
      if (typeof reg.cx === "number" && typeof reg.cy === "number") {
        renderer.focusOnPoint(reg.cx, reg.cy, 2.05);
      }
      updateView();
    }
  });

  if (ChinaAnnalsController) {
    chinaAnnals = new ChinaAnnalsController({
      onStepYear: (delta) => window.AtlasApp.stepYear(delta),
      onJumpYear: (yr, pausePlayback, regionId) => {
        if (pausePlayback && isPlaying) {
          exactOneYearPerSec = false;
          [0.5, 1, 2, 5].forEach(k => {
            const el = document.getElementById("btn-" + k + "x");
            if (el) el.classList.toggle("active", k === speed);
          });
          window.AtlasApp.togglePlay();
        }
        if (regionId && REGIONS.some(r => r.id === regionId)) {
          selectedRegionId = regionId;
          const reg = REGIONS.find(r => r.id === regionId);
          if (reg && typeof reg.cx === "number") {
            renderer.focusOnPoint(reg.cx, reg.cy, 2.05);
          }
        }
        window.AtlasApp.jumpToYear(yr);
      },
      onTogglePrecisionPace: () => window.AtlasApp.togglePrecisionPace(),
      onFocusRegion: (regionId) => window.AtlasApp.focusRegionById(regionId),
      onFocusEastAsia: () => {
        const th = (THEATERS || []).find(t =>
          t.id === "east_asia" || (t.name && (t.name.includes("东亚") || t.name.includes("中华") || t.name.includes("华夏")))
        );
        const thBtn = th && document.getElementById("th-" + th.id);
        if (thBtn) {
          thBtn.click();
        } else {
          window.AtlasApp.focusRegionById("guanzhong");
        }
      },
      onPanelOpened: () => {
        if (isPlaying && !exactOneYearPerSec) {
          window.AtlasApp.togglePlay();
        }
      }
    });
  }

  // Keyboard: ←/→ one year (Shift: ten), Space play/pause, / search, 1-4 speed, P people, M music, ? help, Esc close
  const SHORTCUTS = [
    ["空格", "播放 / 暂停"], ["← →", "前后一年（按住 Shift 十年）"], ["/", "搜索"], ["1 2 3 4", "播放速度 0.5x / 1x / 2x / 5x"],
    ["P", "人物视角"], ["M", "背景配乐开关"], ["T", "切换夜色 / 纸本底图"], ["Esc", "关闭弹窗或面板"], ["?", "显示或隐藏本列表"]
  ];
  function toggleShortcutHelp(force) {
    let el = document.getElementById("shortcut-help");
    if (!el) {
      el = document.createElement("div");
      el.id = "shortcut-help";
      el.className = "shortcut-help is-hidden";
      el.innerHTML = `<div class="sh-title">键盘快捷键</div>${SHORTCUTS.map(([k, d]) => `<div class="sh-row"><kbd>${k}</kbd><span>${d}</span></div>`).join("")}`;
      el.addEventListener("click", () => el.classList.add("is-hidden"));
      document.body.appendChild(el);
    }
    const show = force === undefined ? el.classList.contains("is-hidden") : force;
    el.classList.toggle("is-hidden", !show);
    return show;
  }
  // Esc closes the topmost thing that is open; returns true if it closed something
  function closeTopmost() {
    const help = document.getElementById("shortcut-help");
    if (help && !help.classList.contains("is-hidden")) { help.classList.add("is-hidden"); return true; }
    const shown = id => { const el = document.getElementById(id); return el && el.style.display === "flex"; };
    if (shown("compare-modal")) { window.AtlasApp.closeCompareModal(); return true; }
    if (shown("chronicle-modal")) { window.AtlasApp.closeChronicleModal(); return true; }
    const picker = document.getElementById("person-picker");
    if (picker && !picker.classList.contains("is-hidden")) { picker.classList.add("is-hidden"); return true; }
    const menu = document.getElementById("mobile-menu");
    if (menu && !menu.classList.contains("is-hidden")) { menu.classList.add("is-hidden"); return true; }
    const dd = document.getElementById("search-dropdown");
    if (dd && dd.style.display === "block") { dd.style.display = "none"; return true; }
    return false;
  }
  window.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    if (e.key === "Escape") {
      if (typing) t.blur();
      if (closeTopmost()) e.preventDefault();
      return;
    }
    if (typing) return;
    const cmpModal = document.getElementById("compare-modal");
    const chrModal = document.getElementById("chronicle-modal");
    if ((cmpModal && cmpModal.style.display === "flex") || (chrModal && chrModal.style.display === "flex")) {
      return;
    }
    const app = window.AtlasApp;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      app.stepYear(e.shiftKey ? -10 : -1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      app.stepYear(e.shiftKey ? 10 : 1);
    } else if (e.key === " " || e.code === "Space") {
      // a focused button would also "click" on Space; the shortcut wins
      e.preventDefault();
      if (t && t.blur && t !== document.body) t.blur();
      app.togglePlay();
    } else if (e.key === "/") {
      const input = document.getElementById("search-input");
      if (input && input.offsetParent !== null) { e.preventDefault(); input.focus(); input.select(); }
    } else if (["1", "2", "3", "4"].includes(e.key)) {
      app.setSpeed([0.5, 1, 2, 5][+e.key - 1]);
    } else if (e.key === "p" || e.key === "P") {
      app.openPersonPicker();
    } else if (e.key === "m" || e.key === "M") {
      app.toggleMusic();
    } else if (e.key === "t" || e.key === "T") {
      app.toggleTheme();
    } else if (e.key === "?") {
      toggleShortcutHelp();
    }
  });
  window.AtlasApp.toggleShortcutHelp = toggleShortcutHelp;

  // Non-Linear Idle-Game Evolution Loop (Fast in early antiquity -> Progressively slower toward modernity)
  setInterval(() => {
    if (!isPlaying) return;

    if (exactOneYearPerSec) {
      precisionTickAcc += 1;
      if (precisionTickAcc >= 10) {
        precisionTickAcc = 0;
        if (currentYear >= 2026) {
          currentYear = 2026;
          yearFloat = 2026;
          if (isPlaying) window.AtlasApp.togglePlay();
          updateView();
          return;
        }
        currentYear = Chronology
          ? Chronology.stepHistoricalYear(currentYear, 1)
          : (currentYear === -1 ? 1 : currentYear + 1);
        yearFloat = currentYear;
        updateView();
      }
      return;
    }

    let ratePerTick = getNonLinearYearsPerSec(currentYear, speed) * 0.1;

    if (dwellTicks > 0) {
      dwellTicks -= 1;
      ratePerTick *= 0.25;
    }

    yearFloat += ratePerTick;
    if (yearFloat >= 2026) {
      yearFloat = 2026;
      currentYear = 2026;
      if (isPlaying) window.AtlasApp.togglePlay();
      updateView();
      return;
    }

    let nextIntYear = Math.round(yearFloat);
    if (nextIntYear === 0) {
      nextIntYear = 1;
      yearFloat = 1;
    }
    if (nextIntYear !== currentYear) {
      currentYear = nextIntYear;
      updateView();
    }
  }, 100);

  updateView();

  // Era music: off by default; if the visitor left it on last time, start on their first tap (browsers need a gesture)
  function syncThemeButton() {
    const b = document.getElementById("btn-theme");
    if (b) b.textContent = theme === "paper" ? "◑ 夜色底图" : "◐ 纸本底图";
  }
  syncThemeButton();
  function syncMusicButton() {
    const b = document.getElementById("btn-music");
    if (!b) return;
    b.classList.toggle("active", audio.enabled);
    b.textContent = audio.enabled ? "♫ 配乐：" + audio.styleLabel : "♫ 配乐：关";
  }
  audio.onStyle = syncMusicButton;
  if (audio.wantsMusic) {
    const startOnGesture = e => {
      if (e.target.closest && e.target.closest('#btn-music, [data-toggle="toggleMusic"]')) return; // that tap toggles it itself
      document.removeEventListener("pointerdown", startOnGesture, true);
      if (!audio.enabled && audio.wantsMusic) { audio.setYear(currentYear); audio.setEnabled(true); syncMusicButton(); }
    };
    document.addEventListener("pointerdown", startOnGesture, true);
  }

  // Phones: the world map is a thin strip at full width, so open on Afro-Eurasia at a readable zoom
  if (window.innerWidth <= 900) {
    focusPhoneHome();
  }

  // Desktop: fetch the China yearly volumes once the page is idle; phones wait until the panel is opened
  if (chinaAnnals && window.innerWidth > 900) {
    const idle = window.requestIdleCallback || (cb => setTimeout(cb, 2500));
    idle(() => chinaAnnals.ensureVolumes(), { timeout: 8000 });
  }

  let lastIsPortrait = window.innerHeight > window.innerWidth;
  window.addEventListener("resize", () => {
    const nowPortrait = window.innerHeight > window.innerWidth;
    if (nowPortrait !== lastIsPortrait) {
      lastIsPortrait = nowPortrait;
      if (activeTheaterId && activeTheaterId !== "world") {
        activateTheater(activeTheaterId);
      }
    }
  });
})();
