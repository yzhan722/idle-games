/**
 * 中国逐年百科 · 通用六卷加载器与铜版图志面板（src/ui/ChinaAnnals.js）
 * =========================================================================
 * 【职责与跨卷通用架构（WH-CN-1 / WH-CN-2）】
 * 1. 顶栏双轨纪年与逐年精读控制器（#cn-reign-bar）：
 *    实时显示「前119年 · 壬戌 · 汉武帝元狩四年」「公元383年 · 癸未 · 晋孝武帝太元八年」
 *    等格式双轨纪年，支持 ±1 年步进（自动跨越公元 0 年与分卷边界）、1年/秒精读档及面板开关。
 * 2. 六卷自动探测与无缝加载（window.HistoryAtlas.CHINA_ANNALS_V1 … V6）：
 *    - 自动扫描全局命名空间下已加载的 CHINA_ANNALS_V1 至 CHINA_ANNALS_V6，存在哪卷即启用哪卷，
 *      对应卷标签自动由“规划卷（.is-planned）”激活为“已载入可用卷（.is-v1.is-loaded）”。
 *    - 各卷统一数据结构（README 规范，兼容并行开发的 V3 等后续各卷）：
 *      window.HistoryAtlas.CHINA_ANNALS_V<N> = {
 *        volume: <1..6>,                       // 卷次编号
 *        title: "第X卷 · ...",                 // 分卷全称（或短标题）
 *        subtitle: "...",                      // 可选副标题
 *        range: [startYear, endYear],          // 逐年连续区间（V1: [-841,220], V2: [221,588], V3: [589,959]...）
 *        preGongheNodes: [...],                // 仅 V1 包含：前3000～前842考古与夏商周断代节点
 *        volumesMeta: [...],                   // 仅 V1 包含（本加载器内置完整六卷默认元数据兜底）
 *        bookmarks: [{ year, label }, ...],    // 可选：本卷快捷要津书签（未提供时自动使用内置分卷要津）
 *        years: [                              // 覆盖 range 每一年、不断档的年度记录数组
 *          {
 *            year: 383,                        // 公元年（无 0 年）
 *            ganzhi: "癸未",                   // 干支（与 Chronology.getChineseEraInfo 一致）
 *            dynasty: "东晋十六国",             // 朝代/历史分期
 *            reign: "晋孝武帝太元八年",         // 主栏正朔纪年（与 Chronology.getChineseEraInfo.reignLabel 一致）
 *            parallel: "前秦苻坚建元十九年 ...", // 并立政权并行年号（依方诗铭《中国历史纪年表》体例）
 *            events: [                         // 本年有文献依据之事件；无可考事件则为 []
 *              {
 *                title: "...",
 *                detail: "...",
 *                category: "军政征伐",
 *                regionId: "jiangnan",         // 必须存在于 regions_geo.js
 *                source: "《晋书·谢玄传》...",   // 明确文献或考古报告出处
 *                confidence: "史料确证",        // "史料确证" | "学界推测" | "传说"
 *                refs: {
 *                  persons: ["谢安", ...],
 *                  institutions: ["北府兵", ...],
 *                  places: ["淝水（今安徽寿县南）", ...],
 *                  years: [376, 384, ...]
 *                }
 *              }
 *            ]
 *          }
 *        ]
 *      };
 * 3. 全卷贯通能力：
 *    - 跨卷逐年步进（如 220 → 221 由卷一平滑切入卷二；588 → 589 平滑进入卷三或卷三占位卡）
 *    - 跨卷“上一有事年 / 下一有事年”检索跳转
 *    - 跨卷百科词条交叉索引（refs 人物 / 典章制度 / 古今地名反查已载全部各卷，带卷次标识与一键跳年）
 *    - 跨卷全文与并行年号检索（支持检索正文、人物、制度、出处及十六国/南北朝并行年号）
 * =========================================================================
 */
(function (global) {
  "use strict";

  const HA = global.HistoryAtlas = global.HistoryAtlas || {};

  const CN_VOL_NUMS = ["一", "二", "三", "四", "五", "六"];

  const DEFAULT_VOLUMES_META = [
    {
      vol: 1,
      title: "先秦两汉",
      span: [-841, 220],
      preSpan: [-3000, -842],
      desc: "五帝夏商西周断代节点 + 共和元年至汉延康/魏黄初元年（前841—220）",
      bookmarks: [
        { year: -1046, label: "前1046 克商断代" },
        { year: -841, label: "前841 共和元年" },
        { year: -221, label: "前221 秦并天下" },
        { year: -119, label: "前119 漠北封狼" },
        { year: 9, label: "9 新莽改制" },
        { year: 184, label: "184 甲子黄巾" },
        { year: 220, label: "220 汉魏禅代" }
      ]
    },
    {
      vol: 2,
      title: "魏晋南北朝",
      span: [221, 588],
      desc: "三国鼎立、西晋太康一统、东晋十六国与南北朝更替（221—588）",
      bookmarks: [
        { year: 221, label: "221 蜀汉章武" },
        { year: 263, label: "263 魏灭蜀汉" },
        { year: 280, label: "280 太康平吴" },
        { year: 317, label: "317 东晋南渡" },
        { year: 383, label: "383 淝水之战" },
        { year: 420, label: "420 刘宋代晋" },
        { year: 494, label: "494 孝文迁洛" },
        { year: 581, label: "581 杨坚建隋" }
      ]
    },
    {
      vol: 3,
      title: "隋唐五代",
      span: [589, 959],
      desc: "隋平陈一统、贞观开元盛世、安史藩镇与五代十国（589—959）",
      bookmarks: [
        { year: 589, label: "589 隋平南陈" },
        { year: 618, label: "618 李渊建唐" },
        { year: 627, label: "627 贞观之治" },
        { year: 713, label: "713 开元盛世" },
        { year: 755, label: "755 安史之乱" },
        { year: 907, label: "907 朱温代唐" }
      ]
    },
    {
      vol: 4,
      title: "宋辽金夏元",
      span: [960, 1367],
      desc: "两宋文治、辽金西夏并立与大元一统（960—1367）",
      bookmarks: [
        { year: 960, label: "960 陈桥建宋" },
        { year: 1005, label: "1005 澶渊之盟" },
        { year: 1127, label: "1127 靖康南渡" },
        { year: 1271, label: "1271 建号大元" },
        { year: 1279, label: "1279 崖山一统" }
      ]
    },
    {
      vol: 5,
      title: "明清",
      span: [1368, 1911],
      desc: "洪武永乐定制、万历一条鞭、康乾盛世与晚清变局（1368—1911）",
      bookmarks: [
        { year: 1368, label: "1368 洪武建明" },
        { year: 1405, label: "1405 郑和下西洋" },
        { year: 1581, label: "1581 一条鞭法" },
        { year: 1644, label: "1644 甲申鼎革" },
        { year: 1840, label: "1840 鸦片战争" },
        { year: 1911, label: "1911 辛亥首义" }
      ]
    },
    {
      vol: 6,
      title: "近现代",
      span: [1912, 2026],
      desc: "民国肇建、五四与抗战救亡、新中国成立与改革开放（1912—2026）",
      bookmarks: [
        { year: 1912, label: "1912 民国肇建" },
        { year: 1921, label: "1921 中共一大" },
        { year: 1937, label: "1937 全民族抗战" },
        { year: 1949, label: "1949 开国大典" },
        { year: 1978, label: "1978 改革开放" }
      ]
    }
  ];

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeRefKey(term) {
    const raw = String(term || "").trim();
    if (!raw) return [];
    const keys = new Set([raw]);
    // Extract base term before parenthetical alias and alias inside parentheses: e.g. "汉武帝（刘彻）" -> "汉武帝", "刘彻"
    const m = raw.match(/^([^（(]+)[（(]([^）)]+)[）)]$/);
    if (m) {
      const a = m[1].trim();
      const b = m[2].trim();
      if (a) keys.add(a);
      if (b && !b.startsWith("今") && !b.includes("治")) {
        b.split(/[·/、，,]/).forEach(part => {
          const p = part.trim();
          if (p) keys.add(p);
        });
      }
    }
    return Array.from(keys);
  }

  function parseChineseYearInput(raw) {
    if (raw == null) return null;
    let s = String(raw).trim();
    if (!s) return null;
    let isBce = false;
    if (/^(公元前|前|BC|BCE)/i.test(s)) {
      isBce = true;
      s = s.replace(/^(公元前|前|BCE|BC)\s*/i, "");
    } else {
      s = s.replace(/^(公元|AD|CE)\s*/i, "");
    }
    s = s.replace(/年$/g, "").trim();
    const n = parseInt(s, 10);
    if (!Number.isFinite(n)) return null;
    const yr = isBce ? -Math.abs(n) : n;
    if (yr === 0) return 1;
    return Math.max(-3000, Math.min(2026, yr));
  }

  class ChinaAnnalsController {
    constructor(options) {
      this.opts = options || {};
      this.chronology = HA.Chronology;
      this.regions = HA.REGIONS || [];

      this.isOpenFlag = false;
      this.currentYear = -3000;
      this.precisionPace = false;
      this.previewVol = null; // null = follow currentYear; 1..6 = manual preview of unloaded volume
      this.activeXref = null; // { kind: "persons"|"institutions"|"places", term: "..." }
      this.searchQuery = "";
      this.renderedBmVol = null;

      this.regionMap = new Map();
      for (const r of this.regions) {
        if (r && r.id) this.regionMap.set(r.id, r);
      }

      this.volumesMeta = [];
      this.loadedVolumes = new Map();
      this.preGongheNodes = [];
      this.yearRecordMap = new Map();
      this.activeEventYears = [];
      this.xrefBuckets = {
        persons: new Map(),
        institutions: new Map(),
        places: new Map()
      };
      this.allEntries = [];

      this._buildIndices();
      this._mountTopbar();
      this._mountPanel();
    }

    _discoverVolumes() {
      this.loadedVolumes.clear();
      this.preGongheNodes = [];

      const v1Meta = (HA.CHINA_ANNALS_V1 && Array.isArray(HA.CHINA_ANNALS_V1.volumesMeta))
        ? HA.CHINA_ANNALS_V1.volumesMeta
        : [];

      this.volumesMeta = DEFAULT_VOLUMES_META.map(def => {
        const fromV1 = v1Meta.find(m => m && m.vol === def.vol) || {};
        const volObj = HA["CHINA_ANNALS_V" + def.vol];
        const isLoaded = Boolean(volObj && Array.isArray(volObj.years) && volObj.years.length > 0);
        if (isLoaded) {
          this.loadedVolumes.set(def.vol, volObj);
          if (Array.isArray(volObj.preGongheNodes) && volObj.preGongheNodes.length > 0) {
            this.preGongheNodes = this.preGongheNodes.concat(volObj.preGongheNodes);
          }
        }
        const span = (volObj && Array.isArray(volObj.range) && volObj.range.length === 2)
          ? volObj.range
          : (Array.isArray(fromV1.span) ? fromV1.span : def.span);
        const bookmarks = (volObj && Array.isArray(volObj.bookmarks) && volObj.bookmarks.length > 0)
          ? volObj.bookmarks
          : def.bookmarks;
        const shortTitle = def.title || fromV1.title || `第${CN_VOL_NUMS[def.vol - 1]}卷`;
        const desc = isLoaded
          ? `第${CN_VOL_NUMS[def.vol - 1]}卷 · ${shortTitle}（${this.chronology ? this.chronology.formatYearCompact(span[0]) : span[0]}—${this.chronology ? this.chronology.formatYearCompact(span[1]) : span[1]}，已载入 ${volObj.years.length} 年全编年）`
          : `第${CN_VOL_NUMS[def.vol - 1]}卷 · ${shortTitle}（${span[0]}—${span[1]}年，规划待载入）`;

        return {
          vol: def.vol,
          title: shortTitle,
          span,
          preSpan: def.preSpan || fromV1.preSpan || null,
          loaded: isLoaded,
          desc,
          bookmarks
        };
      });

      this.preGongheNodes.sort((a, b) => a.year - b.year);
    }

    _buildIndices() {
      this._discoverVolumes();
      this.yearRecordMap.clear();
      this.activeEventYears = [];
      this.xrefBuckets = {
        persons: new Map(),
        institutions: new Map(),
        places: new Map()
      };
      this.allEntries = [];

      const activeYearSet = new Set();

      const addXrefHit = (kind, rawTerm, entry) => {
        for (const k of normalizeRefKey(rawTerm)) {
          if (!this.xrefBuckets[kind].has(k)) {
            this.xrefBuckets[kind].set(k, []);
          }
          const arr = this.xrefBuckets[kind].get(k);
          if (!arr.some(x => x.year === entry.year && x.title === entry.title)) {
            arr.push(entry);
          }
        }
      };

      for (const node of this.preGongheNodes) {
        const entry = {
          vol: 1,
          volTag: "卷一",
          year: node.year,
          isPreGonghe: true,
          headerLabel: `[卷一] ${this.chronology.formatYearCompact(node.year)} · ${node.period}`,
          parallel: "",
          title: node.title,
          detail: node.detail,
          category: node.category || "考古与断代",
          regionId: node.regionId || "",
          source: node.source || "",
          confidence: node.confidence || "学界推测",
          refs: node.refs || {}
        };
        this.allEntries.push(entry);
        const refs = entry.refs;
        (refs.persons || []).forEach(t => addXrefHit("persons", t, entry));
        (refs.institutions || []).forEach(t => addXrefHit("institutions", t, entry));
        (refs.places || []).forEach(t => addXrefHit("places", t, entry));
      }

      for (let v = 1; v <= 6; v++) {
        const volObj = this.loadedVolumes.get(v);
        if (!volObj) continue;
        const volTag = `卷${CN_VOL_NUMS[v - 1] || v}`;
        for (const rec of (volObj.years || [])) {
          this.yearRecordMap.set(rec.year, Object.assign({ _vol: v }, rec));
          if (rec.events && rec.events.length > 0) {
            activeYearSet.add(rec.year);
            for (const ev of rec.events) {
              const entry = {
                vol: v,
                volTag,
                year: rec.year,
                isPreGonghe: false,
                headerLabel: `[${volTag}] ${this.chronology.formatYearCompact(rec.year)} · ${rec.ganzhi} · ${rec.reign}`,
                parallel: rec.parallel || "",
                title: ev.title,
                detail: ev.detail,
                category: ev.category || "编年史实",
                regionId: ev.regionId || "",
                source: ev.source || "",
                confidence: ev.confidence || "史料确证",
                refs: ev.refs || {}
              };
              this.allEntries.push(entry);
              const refs = entry.refs;
              (refs.persons || []).forEach(t => addXrefHit("persons", t, entry));
              (refs.institutions || []).forEach(t => addXrefHit("institutions", t, entry));
              (refs.places || []).forEach(t => addXrefHit("places", t, entry));
            }
          }
        }
      }

      this.activeEventYears = Array.from(activeYearSet).sort((a, b) => a - b);
      this.allEntries.sort((a, b) => a.year - b.year);
    }

    reloadVolumes() {
      this._buildIndices();
      this.renderedBmVol = null;
      if (this.panelEl) {
        this._refreshVolumeTabsDom();
        if (this.isOpenFlag) this._renderPanel();
      }
    }

    _getLoadedKickerText() {
      const loadedNums = Array.from(this.loadedVolumes.keys())
        .sort((a, b) => a - b)
        .map(v => `卷${CN_VOL_NUMS[v - 1]}`);
      if (loadedNums.length === 0) return "铜版纪年图志 · 双轨纪年引擎";
      return `铜版纪年图志 · 已载${loadedNums.join("、")}`;
    }

    _refreshVolumeTabsDom() {
      const stripEl = document.getElementById("cn-vol-strip");
      if (stripEl) {
        stripEl.innerHTML = this.volumesMeta.map(v => `
          <button type="button"
            class="cn-vol-tab ${v.loaded ? "is-v1 is-loaded" : "is-planned"}"
            data-vol="${v.vol}"
            title="${esc(v.desc)}">
            <span class="cn-vol-num">卷${CN_VOL_NUMS[v.vol - 1] || v.vol}</span>
            <span class="cn-vol-name">${esc(v.title)}</span>
          </button>
        `).join("");
      }
      const kickerEl = document.getElementById("cn-panel-kicker");
      if (kickerEl) {
        kickerEl.textContent = this._getLoadedKickerText();
      }
    }

    _mountTopbar() {
      this.reignBarEl = document.getElementById("cn-reign-bar");
      if (!this.reignBarEl) return;

      this.reignBarEl.innerHTML = `
        <button type="button" class="cn-dual-label-btn" id="cn-reign-dual-btn" title="点击展开《中国逐年百科》铜版纪年志">
          <span class="cn-dual-mark">§</span>
          <span id="cn-reign-dual-text">前3000年 · 辛卯(逆推) · 五帝传说与龙山时代</span>
        </button>
        <div class="cn-step-group" role="group" aria-label="逐年精读控制器">
          <button type="button" class="cn-mini-btn" id="cn-step-prev" title="后退一年（左方向键 ←，按住 Shift 后退十年）">-1年</button>
          <button type="button" class="cn-mini-btn" id="cn-step-next" title="前进一年（右方向键 →，按住 Shift 前进十年）">+1年</button>
          <button type="button" class="cn-mini-btn" id="cn-pace-1yps" title="切换 1年/秒 逐年线性精读档">1年/秒</button>
          <button type="button" class="cn-mini-btn cn-mini-btn-accent" id="cn-toggle-panel" title="展开或收起中国逐年百科面板">纪年志</button>
        </div>
      `;

      document.getElementById("cn-reign-dual-btn").addEventListener("click", () => {
        this.setOpen(true);
      });
      document.getElementById("cn-step-prev").addEventListener("click", (e) => {
        this.opts.onStepYear && this.opts.onStepYear(e.shiftKey ? -10 : -1);
      });
      document.getElementById("cn-step-next").addEventListener("click", (e) => {
        this.opts.onStepYear && this.opts.onStepYear(e.shiftKey ? 10 : 1);
      });
      document.getElementById("cn-pace-1yps").addEventListener("click", () => {
        this.opts.onTogglePrecisionPace && this.opts.onTogglePrecisionPace();
      });
      document.getElementById("cn-toggle-panel").addEventListener("click", () => {
        this.toggleOpen();
      });
    }

    _mountPanel() {
      const root = document.getElementById("china-annals-root");
      if (!root) return;

      root.innerHTML = `
        <aside id="china-annals-panel" class="cn-annals-panel is-hidden" aria-label="中国逐年百科面板">
          <div class="cn-panel-header">
            <div class="cn-panel-title-wrap">
              <div class="cn-panel-kicker" id="cn-panel-kicker">${esc(this._getLoadedKickerText())}</div>
              <h3 class="cn-panel-title">中国逐年百科</h3>
            </div>
            <div class="cn-panel-head-actions">
              <button type="button" class="cn-head-btn" id="cn-focus-china-btn" title="将地图视野聚焦至东亚华夏战区">舆图聚焦华夏</button>
              <button type="button" class="cn-head-btn cn-head-close" id="cn-close-panel-btn" title="收起纪年志面板">收起</button>
            </div>
          </div>

          <div class="cn-vol-strip" id="cn-vol-strip"></div>

          <div class="cn-plaque-box">
            <div class="cn-plaque-main" id="cn-plaque-main">前119年 · 壬戌 · 汉武帝元狩四年</div>
            <div class="cn-plaque-sub" id="cn-plaque-sub">朝代：西汉 ｜ 汉武帝刘彻 · 大一统极盛期</div>
          </div>

          <div class="cn-controls-box">
            <div class="cn-ctrl-row">
              <button type="button" class="cn-step-btn" id="cn-p-m10" title="后退 10 年">« -10</button>
              <button type="button" class="cn-step-btn" id="cn-p-m1" title="后退 1 年（方向键 ←）">‹ -1年</button>
              <div class="cn-jump-group">
                <input type="text" id="cn-year-jump-input" placeholder="年份 如 -119 / 383" aria-label="输入跳转年份" />
                <button type="button" class="cn-step-btn cn-jump-go" id="cn-year-jump-btn">跳转</button>
              </div>
              <button type="button" class="cn-step-btn" id="cn-p-p1" title="前进 1 年（方向键 →）">+1年 ›</button>
              <button type="button" class="cn-step-btn" id="cn-p-p10" title="前进 10 年">+10 »</button>
              <button type="button" class="cn-step-btn cn-pace-btn" id="cn-panel-pace-btn" title="1年/秒 线性逐年精读">1年/秒</button>
            </div>
            <div class="cn-ctrl-row cn-ctrl-row-sub">
              <button type="button" class="cn-adj-btn" id="cn-prev-ev-btn">‹ 上一有事年</button>
              <button type="button" class="cn-adj-btn" id="cn-next-ev-btn">下一有事年 ›</button>
              <div class="cn-search-box">
                <input type="text" id="cn-v1-search-input" placeholder="检索已载各卷人物 / 制度 / 年号 / 出处..." autocomplete="off" />
                <button type="button" class="cn-clear-btn" id="cn-v1-search-clear" style="display:none;" title="清空检索">×</button>
              </div>
            </div>
            <div class="cn-bookmarks-mini" id="cn-bookmarks-mini"></div>
          </div>

          <div class="cn-panel-body" id="cn-panel-body"></div>
        </aside>
      `;

      this.panelEl = document.getElementById("china-annals-panel");
      this.bodyEl = document.getElementById("cn-panel-body");
      this._refreshVolumeTabsDom();

      document.getElementById("cn-close-panel-btn").addEventListener("click", () => this.setOpen(false));
      document.getElementById("cn-focus-china-btn").addEventListener("click", () => {
        this.opts.onFocusEastAsia && this.opts.onFocusEastAsia();
      });

      document.getElementById("cn-p-m10").addEventListener("click", () => this.opts.onStepYear && this.opts.onStepYear(-10));
      document.getElementById("cn-p-m1").addEventListener("click", () => this.opts.onStepYear && this.opts.onStepYear(-1));
      document.getElementById("cn-p-p1").addEventListener("click", () => this.opts.onStepYear && this.opts.onStepYear(1));
      document.getElementById("cn-p-p10").addEventListener("click", () => this.opts.onStepYear && this.opts.onStepYear(10));
      document.getElementById("cn-panel-pace-btn").addEventListener("click", () => {
        this.opts.onTogglePrecisionPace && this.opts.onTogglePrecisionPace();
      });

      const jumpInput = document.getElementById("cn-year-jump-input");
      const doInputJump = () => {
        const parsed = parseChineseYearInput(jumpInput.value);
        if (parsed !== null) {
          this.previewVol = null;
          this.activeXref = null;
          this.opts.onJumpYear && this.opts.onJumpYear(parsed, true);
          jumpInput.value = "";
        }
      };
      document.getElementById("cn-year-jump-btn").addEventListener("click", doInputJump);
      jumpInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          doInputJump();
        }
      });

      document.getElementById("cn-prev-ev-btn").addEventListener("click", () => {
        const prevYr = this._findAdjacentEventYear(this.currentYear, -1);
        if (prevYr !== null) {
          this.previewVol = null;
          this.activeXref = null;
          this.opts.onJumpYear && this.opts.onJumpYear(prevYr, true);
        }
      });
      document.getElementById("cn-next-ev-btn").addEventListener("click", () => {
        const nextYr = this._findAdjacentEventYear(this.currentYear, 1);
        if (nextYr !== null) {
          this.previewVol = null;
          this.activeXref = null;
          this.opts.onJumpYear && this.opts.onJumpYear(nextYr, true);
        }
      });

      const searchInput = document.getElementById("cn-v1-search-input");
      const searchClear = document.getElementById("cn-v1-search-clear");
      searchInput.addEventListener("input", () => {
        this.searchQuery = searchInput.value.trim();
        searchClear.style.display = this.searchQuery ? "inline-block" : "none";
        if (this.searchQuery) {
          this.previewVol = null;
          this.activeXref = null;
        }
        this._renderPanelBody();
      });
      searchClear.addEventListener("click", () => {
        searchInput.value = "";
        this.searchQuery = "";
        searchClear.style.display = "none";
        this._renderPanelBody();
      });

      document.getElementById("cn-vol-strip").addEventListener("click", (e) => {
        const btn = e.target.closest(".cn-vol-tab");
        if (!btn) return;
        const vol = parseInt(btn.getAttribute("data-vol"), 10);
        const meta = this.volumesMeta.find(m => m.vol === vol);
        if (!meta) return;

        this.activeXref = null;
        this.searchQuery = "";
        if (searchInput) searchInput.value = "";
        if (searchClear) searchClear.style.display = "none";

        if (meta.loaded) {
          this.previewVol = null;
          const inThisVol = vol === 1
            ? (this.currentYear <= meta.span[1])
            : (this.currentYear >= meta.span[0] && this.currentYear <= meta.span[1]);
          if (!inThisVol) {
            this.opts.onJumpYear && this.opts.onJumpYear(meta.span[0], true);
            return;
          }
        } else {
          this.previewVol = vol;
        }
        this._renderPanel();
      });

      document.getElementById("cn-bookmarks-mini").addEventListener("click", (e) => {
        const chip = e.target.closest(".cn-bm-chip");
        if (!chip) return;
        const yr = parseInt(chip.getAttribute("data-yr"), 10);
        if (!Number.isFinite(yr)) return;
        this.previewVol = null;
        this.activeXref = null;
        this.searchQuery = "";
        if (searchInput) searchInput.value = "";
        if (searchClear) searchClear.style.display = "none";
        this.opts.onJumpYear && this.opts.onJumpYear(yr, true);
      });

      // Event delegation for cross-reference pills, year jumps, and region focus inside body
      this.bodyEl.addEventListener("click", (e) => {
        const yrBtn = e.target.closest("[data-jump-year]");
        if (yrBtn) {
          const yr = parseInt(yrBtn.getAttribute("data-jump-year"), 10);
          const reg = yrBtn.getAttribute("data-jump-region") || "";
          this.previewVol = null;
          this.activeXref = null;
          this.searchQuery = "";
          if (searchInput) searchInput.value = "";
          if (searchClear) searchClear.style.display = "none";
          this.opts.onJumpYear && this.opts.onJumpYear(yr, true, reg);
          return;
        }

        const regBtn = e.target.closest("[data-focus-region]");
        if (regBtn) {
          const regId = regBtn.getAttribute("data-focus-region");
          if (regId && this.opts.onFocusRegion) {
            this.opts.onFocusRegion(regId);
          }
          return;
        }

        const xrefBtn = e.target.closest("[data-xref-kind]");
        if (xrefBtn) {
          const kind = xrefBtn.getAttribute("data-xref-kind");
          const term = xrefBtn.getAttribute("data-xref-term");
          if (kind && term) {
            this.previewVol = null;
            this.activeXref = { kind, term };
            this._renderPanelBody();
            this.bodyEl.scrollTop = 0;
          }
          return;
        }

        const backBtn = e.target.closest("[data-clear-xref]");
        if (backBtn) {
          this.activeXref = null;
          this.previewVol = null;
          this._renderPanel();
        }
      });
    }

    _getAllEventYearsSorted() {
      const preYrs = this.preGongheNodes.map(n => n.year);
      return Array.from(new Set(preYrs.concat(this.activeEventYears))).sort((a, b) => a - b);
    }

    _findAdjacentEventYear(year, dir) {
      const allYears = this._getAllEventYearsSorted();
      if (dir < 0) {
        for (let i = allYears.length - 1; i >= 0; i--) {
          if (allYears[i] < year) return allYears[i];
        }
        return null;
      } else {
        for (let i = 0; i < allYears.length; i++) {
          if (allYears[i] > year) return allYears[i];
        }
        return null;
      }
    }

    isOpen() {
      return this.isOpenFlag;
    }

    toggleOpen() {
      this.setOpen(!this.isOpenFlag);
    }

    setOpen(open) {
      this.isOpenFlag = Boolean(open);
      if (this.panelEl) {
        this.panelEl.classList.toggle("is-hidden", !this.isOpenFlag);
      }
      document.body.classList.toggle("cn-annals-open", this.isOpenFlag);

      const topBtn = document.getElementById("cn-toggle-panel");
      if (topBtn) topBtn.classList.toggle("is-active", this.isOpenFlag);
      const searchBarBtn = document.getElementById("btn-open-cn-annals");
      if (searchBarBtn) searchBarBtn.classList.toggle("is-active", this.isOpenFlag);

      if (this.isOpenFlag && this.opts.onPanelOpened) {
        this.opts.onPanelOpened();
      }
      if (this.isOpenFlag) {
        this._renderPanel();
      }
    }

    sync(year, precisionPace) {
      const yrChanged = this.currentYear !== year;
      this.currentYear = year;
      this.precisionPace = Boolean(precisionPace);
      if (yrChanged && this.previewVol !== null) {
        this.previewVol = null;
      }

      // Sync topbar dual-track text & buttons
      const dualTextEl = document.getElementById("cn-reign-dual-text");
      if (dualTextEl && this.chronology) {
        dualTextEl.textContent = this.chronology.formatDualTrackLabel(year);
      }
      const topPaceBtn = document.getElementById("cn-pace-1yps");
      if (topPaceBtn) topPaceBtn.classList.toggle("is-active", this.precisionPace);

      if (this.isOpenFlag) {
        this._renderPanel();
      }
    }

    _getVolumeForYear(y) {
      for (const m of this.volumesMeta) {
        if (m.vol === 1 && y <= m.span[1]) return 1;
        if (y >= m.span[0] && y <= m.span[1]) return m.vol;
      }
      return y <= 220 ? 1 : 6;
    }

    _getEffectiveVolume() {
      if (this.previewVol) return this.previewVol;
      return this._getVolumeForYear(this.currentYear);
    }

    _renderBookmarksStrip(effVol) {
      const bmEl = document.getElementById("cn-bookmarks-mini");
      if (!bmEl) return;
      if (this.renderedBmVol !== effVol) {
        this.renderedBmVol = effVol;
        const meta = this.volumesMeta.find(m => m.vol === effVol) || this.volumesMeta[0];
        const bms = (meta && meta.bookmarks) || [];
        const volLbl = `卷${CN_VOL_NUMS[(meta ? meta.vol : 1) - 1]}要津：`;
        bmEl.innerHTML = `<span class="cn-bm-lbl">${esc(volLbl)}</span>` + bms.map(b =>
          `<button type="button" class="cn-bm-chip" data-yr="${b.year}">${esc(b.label)}</button>`
        ).join("");
      }
      bmEl.querySelectorAll(".cn-bm-chip").forEach(chip => {
        const yr = parseInt(chip.getAttribute("data-yr"), 10);
        chip.classList.toggle("is-active", yr === this.currentYear);
      });
    }

    _renderPanel() {
      if (!this.panelEl || !this.chronology) return;

      // Late-loaded volume script check (in case another volume script registered dynamically)
      for (let v = 1; v <= 6; v++) {
        if (HA["CHINA_ANNALS_V" + v] && !this.loadedVolumes.has(v)) {
          this._buildIndices();
          this._refreshVolumeTabsDom();
          break;
        }
      }

      const info = this.chronology.getChineseEraInfo(this.currentYear);
      const yrRec = this.yearRecordMap.get(this.currentYear);

      const mainEl = document.getElementById("cn-plaque-main");
      const subEl = document.getElementById("cn-plaque-sub");
      if (mainEl) {
        mainEl.textContent = this.chronology.formatDualTrackLabel(this.currentYear);
      }
      if (subEl) {
        const dyn = (yrRec && yrRec.dynasty) ? yrRec.dynasty : info.dynasty;
        const par = (yrRec && yrRec.parallel) ? yrRec.parallel : (info.parallel || "");
        subEl.textContent = `朝代：${dyn}${par ? " ｜ " + par : ""}`;
      }

      const panelPaceBtn = document.getElementById("cn-panel-pace-btn");
      if (panelPaceBtn) {
        panelPaceBtn.classList.toggle("is-active", this.precisionPace);
        panelPaceBtn.textContent = this.precisionPace ? "1年/秒·精读中" : "1年/秒";
      }

      // Update cross-volume adjacent event year buttons
      const prevEv = this._findAdjacentEventYear(this.currentYear, -1);
      const nextEv = this._findAdjacentEventYear(this.currentYear, 1);
      const prevBtn = document.getElementById("cn-prev-ev-btn");
      const nextBtn = document.getElementById("cn-next-ev-btn");
      if (prevBtn) {
        prevBtn.disabled = prevEv === null;
        prevBtn.textContent = prevEv !== null
          ? `‹ 上一有事 (${this.chronology.formatYearCompact(prevEv)})`
          : "‹ 已至已载卷首";
      }
      if (nextBtn) {
        nextBtn.disabled = nextEv === null;
        nextBtn.textContent = nextEv !== null
          ? `下一有事 (${this.chronology.formatYearCompact(nextEv)}) ›`
          : "已至已载卷尾 ›";
      }

      const effVol = this._getEffectiveVolume();
      this.panelEl.querySelectorAll(".cn-vol-tab").forEach(btn => {
        const v = parseInt(btn.getAttribute("data-vol"), 10);
        btn.classList.toggle("is-active", v === effVol);
      });

      this._renderBookmarksStrip(effVol);
      this._renderPanelBody();
    }

    _lookupXrefEntries(kind, term) {
      const results = [];
      const seen = new Set();
      const normKeys = normalizeRefKey(term);

      for (const k of normKeys) {
        const bucket = this.xrefBuckets[kind] && this.xrefBuckets[kind].get(k);
        if (bucket) {
          for (const item of bucket) {
            const id = `${item.year}::${item.title}`;
            if (!seen.has(id)) {
              seen.add(id);
              results.push(item);
            }
          }
        }
      }

      // Also scan entries whose refs[kind] or text contain the core term across all loaded volumes
      const core = normKeys[normKeys.length - 1] || term;
      if (core && core.length >= 2) {
        for (const item of this.allEntries) {
          const id = `${item.year}::${item.title}`;
          if (seen.has(id)) continue;
          const refArr = (item.refs && item.refs[kind]) || [];
          const hitRef = refArr.some(r => r.includes(core) || core.includes(r.split("（")[0]));
          const hitText = results.length === 0 && (item.title.includes(core) || item.detail.includes(core));
          if (hitRef || hitText) {
            seen.add(id);
            results.push(item);
          }
        }
      }

      return results.sort((a, b) => a.year - b.year);
    }

    _confidenceClass(conf) {
      if (conf === "史料确证") return "conf-verified";
      if (conf === "学界推测") return "conf-inferred";
      return "conf-legend";
    }

    _renderEventCard(ev, yearOverride, headerOverride) {
      const regObj = ev.regionId ? this.regionMap.get(ev.regionId) : null;
      const regName = regObj ? regObj.name : ev.regionId;
      const refs = ev.refs || {};
      const persons = refs.persons || [];
      const insts = refs.institutions || [];
      const places = refs.places || [];
      const relYears = (refs.years || []).filter(y => y !== yearOverride);

      const renderRefGroup = (label, kind, items) => {
        if (!items || items.length === 0) return "";
        const chips = items.map(t =>
          `<button type="button" class="cn-ref-pill" data-xref-kind="${kind}" data-xref-term="${esc(t)}" title="跨卷反查「${esc(t)}」在已载各卷全部关联纪年">${esc(t)}</button>`
        ).join("");
        return `<div class="cn-ref-row"><span class="cn-ref-lbl">${label}</span><div class="cn-ref-chips">${chips}</div></div>`;
      };

      const yearChips = relYears.length > 0
        ? `<div class="cn-ref-row"><span class="cn-ref-lbl">因果纪年</span><div class="cn-ref-chips">${
            relYears.map(y =>
              `<button type="button" class="cn-ref-pill cn-ref-year" data-jump-year="${y}" title="一键穿越至 ${esc(this.chronology.formatDualTrackLabel(y))}">${esc(this.chronology.formatYearCompact(y))}</button>`
            ).join("")
          }</div></div>`
        : "";

      const hasRefs = persons.length || insts.length || places.length || relYears.length;

      return `
        <article class="cn-event-card">
          ${headerOverride ? `<div class="cn-card-yr-banner"><span>${esc(headerOverride)}</span><button type="button" class="cn-goto-yr-btn" data-jump-year="${yearOverride}" data-jump-region="${esc(ev.regionId || "")}">穿越至该年 ›</button></div>` : ""}
          <div class="cn-event-meta">
            <span class="cn-cat-tag">${esc(ev.category || "编年史实")}</span>
            <span class="cn-conf-stamp ${this._confidenceClass(ev.confidence)}">${esc(ev.confidence)}</span>
            ${regObj ? `<button type="button" class="cn-region-btn" data-focus-region="${esc(ev.regionId)}" title="在历史地图上聚焦定位「${esc(regName)}」">舆图：${esc(regName)}</button>` : ""}
          </div>
          <h4 class="cn-event-title">${esc(ev.title)}</h4>
          <p class="cn-event-detail">${esc(ev.detail)}</p>
          <div class="cn-source-row">
            <span class="cn-source-lbl">文献与考古依据：</span>
            <span class="cn-source-val">${esc(ev.source)}</span>
          </div>
          ${hasRefs ? `
            <div class="cn-refs-block">
              ${renderRefGroup("相关人物", "persons", persons)}
              ${renderRefGroup("典章制度", "institutions", insts)}
              ${renderRefGroup("古今地名", "places", places)}
              ${yearChips}
            </div>
          ` : ""}
        </article>
      `;
    }

    _renderPanelBody() {
      if (!this.bodyEl) return;

      // 1. Cross-volume search mode across all loaded volumes
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const hits = this.allEntries.filter(it => {
          if (String(it.year).includes(q) || it.headerLabel.toLowerCase().includes(q)) return true;
          if (it.parallel && it.parallel.toLowerCase().includes(q)) return true;
          if (it.title.toLowerCase().includes(q) || it.detail.toLowerCase().includes(q)) return true;
          if (it.source.toLowerCase().includes(q)) return true;
          const r = it.refs || {};
          return []
            .concat(r.persons || [], r.institutions || [], r.places || [])
            .some(t => t.toLowerCase().includes(q));
        });

        this.bodyEl.innerHTML = `
          <div class="cn-xref-banner">
            <div>
              <span class="cn-xref-tag">跨卷检索</span>
              <strong>“${esc(this.searchQuery)}”</strong>
              <span class="cn-xref-cnt">共检得 ${hits.length} 条史事</span>
            </div>
          </div>
          ${hits.length === 0
            ? `<div class="cn-quiet-box">已载入各卷编年中未检得匹配“${esc(this.searchQuery)}”之信史记录。</div>`
            : hits.slice(0, 80).map(h => this._renderEventCard(h, h.year, h.headerLabel)).join("")}
        `;
        return;
      }

      // 2. Cross-volume cross-reference lookup mode
      if (this.activeXref) {
        const { kind, term } = this.activeXref;
        const kindLabel = kind === "persons" ? "人物志跨卷索引" : kind === "institutions" ? "典章制度跨卷志" : "古今地名跨卷考";
        const hits = this._lookupXrefEntries(kind, term);
        this.bodyEl.innerHTML = `
          <div class="cn-xref-banner">
            <div>
              <span class="cn-xref-tag">${kindLabel}</span>
              <strong>${esc(term)}</strong>
              <span class="cn-xref-cnt">（关联 ${hits.length} 条系年记录）</span>
            </div>
            <button type="button" class="cn-back-btn" data-clear-xref="1">返回当前纪年</button>
          </div>
          ${hits.map(h => this._renderEventCard(h, h.year, h.headerLabel)).join("")}
        `;
        return;
      }

      // 3. Unloaded / planned volume placeholder when selected or currentYear falls in an unloaded volume
      const effVol = this._getEffectiveVolume();
      const effMeta = this.volumesMeta.find(v => v.vol === effVol) || {
        vol: effVol, title: "后续分卷", span: [589, 2026], loaded: false, desc: "规划分卷"
      };

      if (!effMeta.loaded) {
        const info = this.chronology.getChineseEraInfo(this.currentYear);
        const inSpan = this.currentYear >= effMeta.span[0] && this.currentYear <= effMeta.span[1];
        const loadedSummaries = this.volumesMeta
          .filter(m => m.loaded)
          .map(m => `第${CN_VOL_NUMS[m.vol - 1]}卷「${m.title}」（${this.chronology.formatYearCompact(m.span[0])}—${this.chronology.formatYearCompact(m.span[1])}）`)
          .join("、");

        const jumpBtns = this.volumesMeta
          .filter(m => m.loaded)
          .map(m => `<button type="button" class="cn-goto-yr-btn" data-jump-year="${m.span[0]}">阅览卷${CN_VOL_NUMS[m.vol - 1]}：${esc(m.title)}（${esc(this.chronology.formatYearCompact(m.span[0]))}）</button>`)
          .join("");

        this.bodyEl.innerHTML = `
          <div class="cn-planned-box">
            <div class="cn-planned-head">第${CN_VOL_NUMS[effMeta.vol - 1]}卷 · ${esc(effMeta.title)}（${effMeta.span[0]}—${effMeta.span[1]}年）</div>
            <p class="cn-planned-desc">
              本百科已完成<strong>公元前841年至公元2026年全时段帝王年号与干支双轨纪年引擎（共371段精确纪年区间）</strong>，当前已实装并激活<strong>${esc(loadedSummaries || "首卷")}</strong>全量考据词条。第${CN_VOL_NUMS[effMeta.vol - 1]}卷编年词条待载入后将由通用分卷加载器自动点亮启用。
            </p>
            ${inSpan ? `
              <div class="cn-current-reign-card">
                <div class="cn-cr-label">当前年份双轨纪年核定（方诗铭《中国历史纪年表》基准）</div>
                <div class="cn-cr-val">${esc(this.chronology.formatDualTrackLabel(this.currentYear))}</div>
                <div class="cn-cr-sub">所属朝代分期：${esc(info.dynasty)}${info.parallel ? " · " + esc(info.parallel) : ""}</div>
              </div>
            ` : `
              <div class="cn-planned-actions">
                <button type="button" class="cn-goto-yr-btn" data-jump-year="${effMeta.span[0]}">定位至本卷开端（${effMeta.span[0]}年）查阅双轨纪年</button>
              </div>
            `}
            <div class="cn-planned-actions">
              ${jumpBtns}
            </div>
          </div>
        `;
        return;
      }

      // 4. Pre-841 BCE Archaeological & Xia-Shang-Zhou Chronology Nodes (-3000..-842)
      if (this.currentYear < -841) {
        const nodes = this.preGongheNodes;
        let nearest = nodes[0] || null;
        for (const n of nodes) {
          if (!nearest || Math.abs(n.year - this.currentYear) < Math.abs(nearest.year - this.currentYear)) {
            nearest = n;
          }
        }
        const exactNodes = nodes.filter(n => n.year === this.currentYear);
        this.bodyEl.innerHTML = `
          <div class="cn-pregonghe-notice">
            <div class="cn-pg-title">共和以前断代说明（前3000 — 前842年）</div>
            <p>《史记·十二诸侯年表》自西周共和元年（前841年）始有确切连续逐年纪年。此前时代严守零杜撰原则，不伪造逐年王年，仅按碳十四考古测年、甲骨金文与“夏商周断代工程”收录 ${nodes.length} 处关键断代节点，并如实呈现武王克商年代等学术争议。</p>
          </div>
          ${exactNodes.length > 0
            ? `<div class="cn-sec-heading">本年（${esc(this.chronology.formatYearCompact(this.currentYear))}）断代节点</div>` +
              exactNodes.map(n => this._renderEventCard(n, n.year, null)).join("")
            : nearest
              ? `<div class="cn-sec-heading">距当前年份（${esc(this.chronology.formatYearCompact(this.currentYear))}）最近之断代节点</div>` +
                this._renderEventCard(nearest, nearest.year, `${this.chronology.formatYearCompact(nearest.year)} · ${nearest.period}`)
              : ""}
          <div class="cn-sec-heading">前3000—前842 全部考古与夏商周断代节点一览（${nodes.length} 处）</div>
          ${nodes.map(n => this._renderEventCard(n, n.year, `${this.chronology.formatYearCompact(n.year)} · ${n.period}`)).join("")}
        `;
        return;
      }

      // 5. Contiguous Annual Records across ANY Loaded Volume (V1..V6)
      const rec = this.yearRecordMap.get(this.currentYear);
      if (!rec) {
        this.bodyEl.innerHTML = `<div class="cn-quiet-box">未找到该年编年记录。</div>`;
        return;
      }

      const volLabel = `第${CN_VOL_NUMS[(rec._vol || effVol) - 1]}卷`;
      if (rec.events && rec.events.length > 0) {
        this.bodyEl.innerHTML = `
          <div class="cn-sec-heading">
            <span>${esc(volLabel)} · 本年信史编年（共 ${rec.events.length} 事）</span>
            <span class="cn-sec-sub">${esc(rec.ganzhi)}年 · ${esc(rec.dynasty)}</span>
          </div>
          ${rec.events.map(ev => this._renderEventCard(ev, rec.year, null)).join("")}
        `;
      } else {
        const prevYr = this._findAdjacentEventYear(this.currentYear, -1);
        const nextYr = this._findAdjacentEventYear(this.currentYear, 1);
        const prevRec = prevYr !== null ? this.yearRecordMap.get(prevYr) : null;
        const nextRec = nextYr !== null ? this.yearRecordMap.get(nextYr) : null;

        this.bodyEl.innerHTML = `
          <div class="cn-quiet-box">
            <div class="cn-quiet-head">${esc(this.chronology.formatDualTrackLabel(rec.year))}</div>
            <p class="cn-quiet-desc">
              本年帝王正朔纪年、干支（${esc(rec.ganzhi)}）${rec.parallel ? "及并立政权年号（" + esc(rec.parallel) + "）" : ""}均经正史本纪与方诗铭《中国历史纪年表》严格核定不断档；二十四史与《资治通鉴》等可靠文献中暂无确切系于本年之重大条目收录，谨依零杜撰规范留白存真。
            </p>
            <div class="cn-quiet-links">
              ${prevRec && prevRec.events && prevRec.events[0] ? `
                <button type="button" class="cn-quiet-jump" data-jump-year="${prevYr}">
                  <span class="cn-qj-dir">‹ 上一可考事件年（${esc(this.chronology.formatYearCompact(prevYr))} · ${esc(prevRec.reign)}）</span>
                  <span class="cn-qj-title">${esc(prevRec.events[0].title)}</span>
                </button>
              ` : ""}
              ${nextRec && nextRec.events && nextRec.events[0] ? `
                <button type="button" class="cn-quiet-jump" data-jump-year="${nextYr}">
                  <span class="cn-qj-dir">下一可考事件年（${esc(this.chronology.formatYearCompact(nextYr))} · ${esc(nextRec.reign)}） ›</span>
                  <span class="cn-qj-title">${esc(nextRec.events[0].title)}</span>
                </button>
              ` : ""}
            </div>
          </div>
        `;
      }
    }
  }

  HA.ChinaAnnalsController = ChinaAnnalsController;
})(typeof window !== "undefined" ? window : globalThis);
