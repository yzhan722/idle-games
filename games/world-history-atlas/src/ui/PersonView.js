/**
 * PersonView — 人物视角：选择一位历史人物，查看生平，并在地图上按年份追随其行迹。
 *  - 人物索引（src/data/persons_index.js）随页面加载；单人数据（src/data/persons/<id>.js）选中时才加载。
 *  - 地图上只画一条行迹线和若干站点；仅在“当前所在站”变化时重画，不做常驻动画。
 *  - “播放生平”按站点年份逐站跳转（定时器，暂停/退出即停止）。
 *  - 对比：另选至多两位人物，各用一种颜色画行迹，随同一年份移动（同一时代谁在哪里）。
 *  - 相关人物：src/data/persons_links.js 记录人物之间有史可据的交集，可直接切换或加入对比。
 */
(function () {
  const HA = window.HistoryAtlas = window.HistoryAtlas || {};
  const SVG = "http://www.w3.org/2000/svg";
  const OWN_SRC = (document.currentScript && document.currentScript.src) || "";
  const fmtYear = y => (y < 0 ? `前${-y}年` : `${y}年`);
  const MAX_COMPARE = 2;
  // picker era filter by birth year: [label, from, to)
  const ERAS = [["全部时代", -Infinity, Infinity], ["古代", -Infinity, 500], ["中古", 500, 1450], ["近世", 1450, 1780], ["近代", 1780, Infinity]];
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  class PersonViewController {
    constructor(opts) {
      this.renderer = opts.renderer;
      this.getYear = opts.getYear;
      this.jumpToYear = opts.jumpToYear;
      this.pausePlayback = opts.pausePlayback || (() => {});
      this.person = null;
      this.others = []; // compare: [{ p, idx }]
      this.pickMode = "open";
      this.curIdx = -2;
      this.playTimer = null;
      this.groupFilter = "全部";
      this._mountPicker();
      this._mountPanel();
    }

    // ---------- data
    _load(id) {
      if (HA.PERSONS && HA.PERSONS[id]) return Promise.resolve(HA.PERSONS[id]);
      const ver = (OWN_SRC.match(/[?&]v=([^&]+)/) || [])[1];
      const base = OWN_SRC ? OWN_SRC.replace(/src\/ui\/PersonView\.js.*$/, "") : "";
      return new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = `${base}src/data/persons/${id}.js${ver ? "?v=" + ver : ""}`;
        el.onload = () => (HA.PERSONS && HA.PERSONS[id]) ? resolve(HA.PERSONS[id]) : reject(new Error("missing " + id));
        el.onerror = () => reject(new Error("load failed " + id));
        document.head.appendChild(el);
      });
    }

    // ---------- picker
    _mountPicker() {
      const el = document.createElement("div");
      el.id = "person-picker";
      el.className = "person-picker is-hidden";
      el.innerHTML = `
        <div class="pp-box" role="dialog" aria-label="选择历史人物">
          <div class="pp-head">
            <span class="pp-title">◎ 人物视角</span>
            <button type="button" class="pp-close" aria-label="关闭">×</button>
          </div>
          <div class="pp-tools">
            <input type="text" class="pp-search" placeholder="按姓名或身份筛选…" autocomplete="off" />
            <div class="pp-tabs">${["全部", "中国", "世界"].map(g => `<button type="button" data-g="${g}" class="${g === "全部" ? "is-active" : ""}">${g}</button>`).join("")}</div>
            <div class="pp-tabs pp-eras">${ERAS.map((e, i) => `<button type="button" data-e="${i}" class="${i === 0 ? "is-active" : ""}">${e[0]}</button>`).join("")}</div>
          </div>
          <div class="pp-list"></div>
        </div>`;
      document.body.appendChild(el);
      this.pickerEl = el;
      el.addEventListener("click", e => { if (e.target === el) this.closePicker(); });
      el.querySelector(".pp-close").addEventListener("click", () => this.closePicker());
      el.querySelector(".pp-search").addEventListener("input", () => this._renderPickerList());
      el.querySelectorAll(".pp-tabs button").forEach(b => b.addEventListener("click", () => {
        if (b.dataset.g) this.groupFilter = b.dataset.g; else this.eraFilter = +b.dataset.e;
        b.parentNode.querySelectorAll("button").forEach(x => x.classList.toggle("is-active", x === b));
        this._renderPickerList();
      }));
      el.querySelector(".pp-list").addEventListener("click", e => {
        const item = e.target.closest("[data-id]");
        if (!item) return;
        this.closePicker();
        if (this.pickMode === "compare") this.addCompare(item.dataset.id); else this.open(item.dataset.id, true);
      });
    }

    _renderPickerList() {
      const q = this.pickerEl.querySelector(".pp-search").value.trim().toLowerCase();
      const skip = new Set(this.pickMode === "compare" ? [this.person && this.person.id, ...this.others.map(o => o.p.id)] : []);
      const era = ERAS[this.eraFilter || 0];
      const list = (HA.PERSONS_INDEX || []).filter(p => !skip.has(p.id) && p.born >= era[1] && p.born < era[2] &&
        (this.groupFilter === "全部" || p.group === this.groupFilter) &&
        (!q || p.name.toLowerCase().includes(q) || (p.role || "").toLowerCase().includes(q)));
      this.pickerEl.querySelector(".pp-list").innerHTML = list.length
        ? list.map(p => `<button type="button" class="pp-item" data-id="${esc(p.id)}">
            <span class="pp-name">${esc(p.name)}</span>
            <span class="pp-life">${fmtYear(p.born)}—${fmtYear(p.died)}</span>
            <span class="pp-role">${esc(p.role)}</span></button>`).join("")
        : `<div class="pp-empty">没有匹配的人物</div>`;
    }

    openPicker(mode) {
      this.pickMode = mode === "compare" ? "compare" : "open";
      this.pickerEl.querySelector(".pp-title").textContent = this.pickMode === "compare" ? "◎ 选择对比人物" : "◎ 人物视角";
      this._renderPickerList();
      this.pickerEl.classList.remove("is-hidden");
      if (window.innerWidth > 900) this.pickerEl.querySelector(".pp-search").focus();
    }
    closePicker() { this.pickerEl.classList.add("is-hidden"); }

    // ---------- panel
    _mountPanel() {
      const el = document.createElement("div");
      el.id = "person-panel";
      el.className = "person-panel is-hidden";
      document.body.appendChild(el);
      this.panelEl = el;
      el.addEventListener("click", e => {
        const act = e.target.closest("[data-act]");
        if (act) {
          const a = act.dataset.act;
          if (a === "exit") this.close();
          else if (a === "play") this.togglePlay();
          else if (a === "prev") this.step(-1);
          else if (a === "next") this.step(1);
          else if (a === "fold") el.classList.toggle("is-folded");
          else if (a === "add-compare") this.openPicker("compare");
          else if (a === "rm-compare") this.removeCompare(act.dataset.id);
          else if (a === "view") this.open(act.dataset.id, false);
          else if (a === "cmp") this.addCompare(act.dataset.id);
          return;
        }
        const st = e.target.closest("[data-i]");
        if (st) { this.stopPlay(); this.goToStop(+st.dataset.i, true); }
      });
    }

    _renderPanel() {
      const p = this.person;
      const life = `${p.born_approx ? "约" : ""}${fmtYear(p.born)} — ${p.died_approx ? "约" : ""}${fmtYear(p.died)}`;
      this.panelEl.innerHTML = `
        <div class="pv-head">
          <div class="pv-title"><span class="pv-name">${esc(p.name)}</span><span class="pv-conf">${esc(p.confidence)}</span></div>
          <div class="pv-head-actions">
            <button type="button" data-act="fold" class="pv-btn pv-fold" aria-label="收起或展开">▾</button>
            <button type="button" data-act="exit" class="pv-btn" aria-label="退出人物视角">退出</button>
          </div>
        </div>
        <div class="pv-meta">${life} · ${esc(p.role)}${p.polity ? ` · ${esc(p.polity)}` : ""}</div>
        <p class="pv-summary">${esc(p.summary)}</p>
        <div class="pv-compare"></div>
        ${this._linksHtml(p)}
        <div class="pv-ctrl">
          <button type="button" data-act="prev" class="pv-btn">‹ 上一站</button>
          <button type="button" data-act="play" class="pv-btn pv-play">▶ 播放生平</button>
          <button type="button" data-act="next" class="pv-btn">下一站 ›</button>
        </div>
        <div class="pv-stops">${p.stops.map((s, i) => `
          <div class="pv-stop" data-i="${i}">
            <div class="pv-stop-head"><span class="pv-year">${fmtYear(s.year)}${s.to > s.year ? `—${fmtYear(s.to)}` : ""}</span><span class="pv-kind">${esc(s.kind)}</span><span class="pv-place">${esc(s.place)}</span></div>
            <div class="pv-event">${esc(s.event)}<span class="pv-src">${esc(s.source)}${s.confidence !== "史料确证" ? ` · ${esc(s.confidence)}` : ""}</span></div>
          </div>`).join("")}</div>
        <div class="pv-sources">资料：${esc(p.sources)}</div>`;
    }

    // ---------- links and compare
    _linksOf(id) {
      const idx = {};
      for (const q of HA.PERSONS_INDEX || []) idx[q.id] = q;
      return (HA.PERSONS_LINKS || []).filter(l => l[0] === id || l[1] === id)
        .map(l => ({ other: idx[l[0] === id ? l[1] : l[0]], year: l[2], note: l[3], conf: l[4], src: l[5] }))
        .filter(l => l.other).sort((a, b) => a.year - b.year);
    }

    _linksHtml(p) {
      const links = this._linksOf(p.id);
      if (!links.length) return "";
      return `<details class="pv-links"><summary>相关人物 <span>${links.length}</span></summary>${links.map(l => `
        <div class="pv-link">
          <div class="pv-link-head"><span class="pv-year">${fmtYear(l.year)}</span><span class="pv-link-name">${esc(l.other.name)}</span>
            <button type="button" class="pv-mini" data-act="view" data-id="${esc(l.other.id)}">查看</button>
            <button type="button" class="pv-mini" data-act="cmp" data-id="${esc(l.other.id)}">对比</button></div>
          <div class="pv-link-note">${esc(l.note)}<span class="pv-src">${esc(l.src)}${l.conf && l.conf !== "史料确证" ? ` · ${esc(l.conf)}` : ""}</span></div>
        </div>`).join("")}</details>`;
    }

    _renderCompare() {
      const box = this.panelEl.querySelector(".pv-compare");
      if (!box) return;
      const y = this.getYear();
      const rows = this.others.map((o, n) => {
        const s = o.idx >= 0 ? o.p.stops[o.idx] : null;
        const where = y < o.p.born ? "尚未出生" : y > o.p.died ? "已去世" : s ? `${fmtYear(s.year)} · ${String(s.place).split("（")[0]}` : "尚无行迹";
        return `<div class="pv-cmp pv-c${n + 1}"><i></i><span class="pv-cmp-name">${esc(o.p.name)}</span><span class="pv-cmp-where">${esc(where)}</span>
          <button type="button" class="pv-mini" data-act="rm-compare" data-id="${esc(o.p.id)}" aria-label="移除对比">×</button></div>`;
      }).join("");
      const html = rows + (this.others.length < MAX_COMPARE ? `<button type="button" class="pv-btn pv-add-cmp" data-act="add-compare">＋ 对比人物：同一年谁在哪里</button>` : "");
      if (box._html !== html) { box.innerHTML = html; box._html = html; }
    }

    async addCompare(id) {
      if (!this.person || id === this.person.id || this.others.some(o => o.p.id === id)) return;
      let q;
      try { q = await this._load(id); } catch (e) { console.warn(e); return; }
      if (this.others.length >= MAX_COMPARE) this.others.shift();
      this.others.push({ p: q, idx: -2 });
      this._frame([this.person, ...this.others.map(o => o.p)], false);
      this.sync(this.getYear(), true);
    }

    removeCompare(id) {
      this.others = this.others.filter(o => o.p.id !== id);
      this.sync(this.getYear(), true);
    }

    // frame every route on screen; optionally jump to the first stop of the first person
    _frame(people, jump) {
      const xs = [], ys = [];
      for (const q of people) for (const s of q.stops) { xs.push(s.x); ys.push(s.y); }
      const vb = HA.MAP_VIEWBOX || [0, 0, 1530, 700];
      const w = Math.max(30, Math.max(...xs) - Math.min(...xs)), h = Math.max(20, Math.max(...ys) - Math.min(...ys));
      const scale = Math.max(1, Math.min(4.2, 0.62 * Math.min(vb[2] / w, vb[3] / h)));
      if (jump) this.jumpToYear(people[0].stops[0].year);
      if (this.renderer) this.renderer.focusOnPoint((Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, scale);
    }

    // ---------- map layer
    _layer() {
      const vp = this.renderer && this.renderer.viewport;
      if (!vp) return null;
      if (!this.layerEl || !this.layerEl.isConnected) {
        this.layerEl = document.createElementNS(SVG, "g");
        this.layerEl.setAttribute("id", "person-layer");
        vp.appendChild(this.layerEl);
      }
      return this.layerEl;
    }

    _drawLayer() {
      const g = this._layer();
      if (!g) return;
      const p = this.person, k = this.curIdx;
      const pts = p.stops.map(s => `${s.x},${s.y}`);
      const past = k >= 0 ? pts.slice(0, k + 1) : [];
      const future = k >= 0 ? pts.slice(k) : pts;
      let html = "";
      // compared people first, so the main route stays on top
      this.others.forEach((o, n) => {
        const op = o.p.stops.map(s => `${s.x},${s.y}`), j = o.idx;
        if (op.length > 1) html += `<polyline class="pv-cmp-route pv-c${n + 1}" points="${op.join(" ")}"/>`;
        if (j > 0) html += `<polyline class="pv-cmp-past pv-c${n + 1}" points="${op.slice(0, j + 1).join(" ")}"/>`;
        if (j >= 0) {
          const s = o.p.stops[j];
          html += `<circle class="pv-cmp-dot pv-c${n + 1}" cx="${s.x}" cy="${s.y}" r="2.3"/>`;
          html += `<text class="pv-label pv-cmp-label pv-c${n + 1}" x="${s.x + 3.5}" y="${s.y + 6}">${esc(o.p.name)} · ${esc(String(s.place).split("（")[0])}</text>`;
        }
      });
      if (future.length > 1) html += `<polyline class="pv-route-future" points="${future.join(" ")}"/>`;
      if (past.length > 1) html += `<polyline class="pv-route-past" points="${past.join(" ")}"/>`;
      p.stops.forEach((s, i) => {
        html += `<circle class="pv-dot${i < k ? " is-past" : i === k ? " is-current" : ""}" cx="${s.x}" cy="${s.y}" r="${i === k ? 2.6 : 1.5}"/>`;
      });
      if (k >= 0) {
        const s = p.stops[k];
        html += `<text class="pv-label" x="${s.x + 3.5}" y="${s.y - 3}">${esc(fmtYear(s.year))} · ${esc(String(s.place).split("（")[0])}</text>`;
      }
      g.innerHTML = html;
    }

    // ---------- navigation
    _indexAt(year, person) {
      const st = (person || this.person).stops;
      let k = -1;
      for (let i = 0; i < st.length; i++) if (st[i].year <= year) k = i; else break;
      return k;
    }

    goToStop(i, focus) {
      const p = this.person;
      if (!p) return;
      i = Math.max(0, Math.min(p.stops.length - 1, i));
      const s = p.stops[i];
      this.jumpToYear(s.year);
      if (focus && this.renderer) this.renderer.focusOnPoint(s.x, s.y, Math.max(this.renderer.scale || 1, 2.2));
    }

    step(d) {
      if (!this.person) return;
      this.stopPlay();
      const k = this._indexAt(this.getYear());
      this.goToStop(k < 0 ? 0 : k + d, true);
    }

    togglePlay() { if (this.playTimer) this.stopPlay(); else this.startPlay(); }
    startPlay() {
      if (!this.person) return;
      this.pausePlayback();
      let k = this._indexAt(this.getYear());
      if (k >= this.person.stops.length - 1) k = -1;
      const tick = () => {
        k += 1;
        if (!this.person || k >= this.person.stops.length) { this.stopPlay(); return; }
        this.goToStop(k, true);
      };
      tick();
      this.playTimer = setInterval(tick, 1900);
      const b = this.panelEl.querySelector(".pv-play");
      if (b) b.textContent = "Ⅱ 暂停";
    }
    stopPlay() {
      clearInterval(this.playTimer);
      this.playTimer = null;
      const b = this.panelEl && this.panelEl.querySelector(".pv-play");
      if (b) b.textContent = "▶ 播放生平";
    }

    // ---------- lifecycle
    // fresh: opened from the picker or search (drops any comparison). Otherwise (a related person) the current
    // person stays on the map as a comparison, so the two lives can be read side by side.
    async open(id, fresh = true) {
      this.stopPlay();
      this.pausePlayback();
      let p;
      try { p = await this._load(id); } catch (e) { console.warn(e); return; }
      const keep = (!fresh && this.person) ? [{ p: this.person, idx: -2 }, ...this.others] : [];
      this.others = keep.filter(o => o.p.id !== p.id).slice(0, MAX_COMPARE);
      this.person = p;
      this.curIdx = -2;
      document.body.classList.add("person-mode");
      this._renderPanel();
      this.panelEl.classList.remove("is-hidden", "is-folded");
      // frame the whole journey (and any compared ones), then start at the first stop
      this._frame([p, ...this.others.map(o => o.p)], true);
      this.sync(this.getYear(), true);
    }

    close() {
      this.stopPlay();
      this.person = null;
      this.others = [];
      document.body.classList.remove("person-mode");
      this.panelEl.classList.add("is-hidden");
      if (this.layerEl) this.layerEl.innerHTML = "";
    }

    // called on every year change from main.js
    sync(year, force) {
      if (!this.person) return;
      const k = this._indexAt(year);
      let moved = force || k !== this.curIdx || !(this.layerEl && this.layerEl.isConnected);
      for (const o of this.others) {
        const j = (year < o.p.born || year > o.p.died) ? -1 : this._indexAt(year, o.p);
        if (j !== o.idx) { o.idx = j; moved = true; }
      }
      this._renderCompare(); // cheap; "尚未出生 / 已去世" follows the year, not only the stops
      if (!moved) return;
      this.curIdx = k;
      this._drawLayer();
      this.panelEl.querySelectorAll(".pv-stop").forEach((el, i) => {
        el.classList.toggle("is-current", i === k);
        el.classList.toggle("is-past", i < k);
      });
      const cur = this.panelEl.querySelector(".pv-stop.is-current");
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
    }
  }

  HA.PersonViewController = PersonViewController;
})();
