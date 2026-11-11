// Deterministic Timeline State Calculator, Campaign Vector Generator, Search & Dynasty Comparator
window.HistoryAtlas = window.HistoryAtlas || {};

window.HistoryAtlas.getDisplayEmpireName = function (empName, year) {
  if (!empName) return "";
  const SHORT_MAP = {
    "中华人民共和国": "中国",
    "中华民国": "中华民国",
    "美利坚合众国": "美国",
    "苏维埃社会主义共和国联盟": "苏联",
    "俄罗斯联邦": "俄罗斯",
    "俄罗斯帝国": "俄罗斯帝国",
    "俄罗斯沙皇国": "俄罗斯沙皇国",
    "德意志联邦共和国": "德国",
    "德意志帝国": "德意志帝国",
    "法兰西共和国": "法国",
    "法兰西第一帝国": "法兰西帝国",
    "法兰西王国": "法兰西王国",
    "大英帝国": "大英帝国",
    "英格兰王国": "英格兰王国",
    "英国": "英国",
    "意大利共和国": "意大利",
    "意大利王国": "意大利王国",
    "西班牙王国": "西班牙",
    "西班牙帝国": "西班牙帝国",
    "卡斯蒂利亚王国": "卡斯蒂利亚",
    "葡萄牙王国": "葡萄牙",
    "荷兰共和国": "荷兰共和国",
    "荷兰王国": "荷兰",
    "波兰立陶宛联邦": "波兰立陶宛",
    "波兰共和国": "波兰",
    "奥地利大公国": "奥地利",
    "奥地利帝国": "奥地利帝国",
    "奥匈帝国": "奥匈帝国",
    "奥地利共和国": "奥地利",
    "希腊共和国": "希腊",
    "瑞典王国": "瑞典",
    "丹麦北海帝国": "北海帝国",
    "丹麦王国": "丹麦王国",
    "基辅罗斯公国": "基辅罗斯",
    "神圣罗马帝国": "神圣罗马",
    "波斯阿契美尼德帝国": "波斯帝国",
    "雅典城邦共和国": "雅典共和国",
    "马其顿安提柯王朝": "马其顿王国",
    "腓尼基推罗王国": "推罗王国",
    "吠陀雅利安王国": "吠陀王国",
    "日本大和王权": "日本大和",
    "日本室町幕府": "室町幕府",
    "日本德川幕府": "德川幕府",
    "大日本帝国": "大日本帝国",
    "日本国": "日本",
    "大韩民国": "韩国",
    "蒙古国": "蒙古国",
    "越南社会主义共和国": "越南",
    "印度尼西亚共和国": "印尼",
    "印度共和国": "印度",
    "巴基斯坦伊斯兰共和国": "巴基斯坦",
    "阿富汗杜兰尼王朝": "阿富汗王朝",
    "阿富汗共和国": "阿富汗",
    "伊朗巴列维王朝": "巴列维伊朗",
    "伊朗伊斯兰共和国": "伊朗",
    "波斯恺加王朝": "恺加波斯",
    "萨法维波斯帝国": "萨法维波斯",
    "沙特阿拉伯王国": "沙特王国",
    "伊拉克共和国": "伊拉克",
    "叙利亚共和国": "叙利亚",
    "阿拉伯埃及共和国": "埃及",
    "埃及王国": "埃及王国",
    "土耳其共和国": "土耳其",
    "马穆鲁克苏丹国": "马穆鲁克",
    "塞尔柱突厥帝国": "塞尔柱帝国",
    "哈萨克斯坦共和国": "哈萨克斯坦",
    "乌兹别克斯坦共和国": "乌兹别克",
    "阿尔及利亚共和国": "阿尔及利亚",
    "摩洛哥阿拉维王朝": "摩洛哥王朝",
    "尼日利亚联邦共和国": "尼日利亚",
    "索科托哈里发国": "索科托汗国",
    "埃塞俄比亚联邦共和国": "埃塞俄比亚",
    "埃塞俄比亚帝国": "埃塞俄比亚",
    "南非共和国": "南非",
    "加拿大联邦": "加拿大",
    "墨西哥合众国": "墨西哥",
    "巴西联邦共和国": "巴西",
    "巴西帝国": "巴西帝国",
    "秘鲁共和国": "秘鲁",
    "澳大利亚联邦": "澳大利亚",
    "玛雅蒂卡尔王国": "蒂卡尔王国",
    "党项西夏王朝": "西夏王朝",
    "郑氏东宁王国": "明郑东宁",
    "高卢阿维尔尼王国": "高卢王国",
    "不列颠爱西尼王国": "爱西尼国",
    "日耳曼苏维汇王国": "苏维汇国",
    "库施麦罗埃王国": "库施王国",
    "巴克特里亚王国": "大夏王国",
    "大津巴布韦王国": "津巴布韦",
    "汤加图伊帝国": "汤加帝国",
    "塔尔特索斯王国": "塔尔特索斯",
    "伊特鲁里亚王国": "伊特鲁里亚",
    "日本镰仓幕府": "镰仓幕府",
    "花剌子模帝国": "花剌子模",
    "伊尔汗国": "伊尔汗国",
    "以色列国": "以色列",
    "百乘王朝": "百乘王朝",
    "伦巴第王国": "伦巴第国",
    "泰诺王国": "泰诺王国",
    "瓦里帝国": "瓦里帝国"
  };
  if (SHORT_MAP[empName]) return SHORT_MAP[empName];
  return empName.split(" ")[0].split("(")[0];
};

class TimelineEngine {
  constructor(regions, empires, timeline) {
    this.regions = regions;
    this.regionMap = {};
    regions.forEach(r => { this.regionMap[r.id] = r; });
    this.empires = empires;
    this.timeline = timeline.slice().sort((a, b) => a.year - b.year);
    this.chronicles = (window.HistoryAtlas.CHRONICLE_ANNALS || []).slice().sort((a, b) => a.year - b.year);
    this.macroMetrics = window.HistoryAtlas.MACRO_METRICS || [];

    this._bounds = {};
    for (const [name, info] of Object.entries(this.empires)) {
      const m = (info.era_span || "").match(/^(前?\d+)\s*-\s*(前?\d+|至今)$/);
      if (m) {
        const startY = m[1].startsWith("前") ? -parseInt(m[1].slice(1), 10) : parseInt(m[1], 10);
        const endY = m[2] === "至今" ? 2026 : (m[2].startsWith("前") ? -parseInt(m[2].slice(1), 10) : parseInt(m[2], 10));
        this._bounds[name] = { startY, endY: m[2] === "至今" ? 9999 : endY, rawEnd: endY };
      }
    }

    // Precompute Empire Peak Stats across timeline
    this._empirePeaks = {};
    for (const name of Object.keys(this.empires)) {
      this._empirePeaks[name] = { peakYear: -3000, maxRegions: 0, peakRegions: [] };
    }
    this._precomputePeaks();
  }

  _isEmpireAlive(empName, year) {
    const b = this._bounds[empName];
    if (!b) return true;
    return year <= b.endY + 15;
  }

  _precomputePeaks() {
    const running = {};
    for (const frame of this.timeline) {
      if (frame.owners) {
        for (const [regId, empName] of Object.entries(frame.owners)) {
          if (empName === null) delete running[regId];
          else running[regId] = empName;
        }
      }
      const counts = {};
      const regLists = {};
      for (const [regId, empName] of Object.entries(running)) {
        if (!empName || !this._isEmpireAlive(empName, frame.year)) continue;
        counts[empName] = (counts[empName] || 0) + 1;
        if (!regLists[empName]) regLists[empName] = [];
        regLists[empName].push(regId);
      }
      for (const [empName, c] of Object.entries(counts)) {
        const pk = this._empirePeaks[empName];
        if (pk && c > pk.maxRegions) {
          pk.maxRegions = c;
          pk.peakYear = frame.year;
          pk.peakRegions = regLists[empName].slice();
        }
      }
    }
  }

  getMacroAtYear(targetYear) {
    if (!this.macroMetrics.length) {
      return { pop: "-", gdp_east: 50, gdp_west: 50, tech: "-" };
    }
    let chosen = this.macroMetrics[0];
    for (const m of this.macroMetrics) {
      if (m.year <= targetYear) chosen = m;
      else break;
    }
    return chosen;
  }

  // Compute complete deterministic world state at targetYear
  getStateAtYear(targetYear) {
    const owners = {};
    let prevOwners = {};
    let activeEra = "远古与青铜时代";
    let activeTheme = "era-ancient";
    let latestToast = "";
    let activeRoutes = [];
    let activeLandmarks = [];
    let lastKeyframeYear = this.timeline[0].year;
    let activeFrame = this.timeline[0];

    for (const frame of this.timeline) {
      if (frame.year <= targetYear) {
        prevOwners = Object.assign({}, owners);
        activeFrame = frame;
        activeEra = frame.era;
        if (frame.theme) activeTheme = frame.theme;
        if (frame.toast) latestToast = frame.toast;
        if (frame.routes) activeRoutes = frame.routes;
        if (frame.landmarks) activeLandmarks = frame.landmarks;
        lastKeyframeYear = frame.year;

        if (frame.owners) {
          for (const [regId, empName] of Object.entries(frame.owners)) {
            if (empName === null) {
              delete owners[regId];
            } else {
              owners[regId] = empName;
            }
          }
        }
      } else {
        break;
      }
    }

    // Check granular CHRONICLE_ANNALS only when pinned/exact year match so map pins stay calm and steady
    if (this.pinnedChronicleYear === targetYear && this.chronicles && this.chronicles.length > 0) {
      const activeChronicle = this.chronicles.find(ev => ev.year === targetYear);
      if (activeChronicle && activeChronicle.year > lastKeyframeYear) {
        latestToast = `【${activeChronicle.date_label} · ${activeChronicle.title}】${activeChronicle.detail}`;
        if (activeChronicle.x && activeChronicle.y) {
          activeLandmarks = [
            {
              x: activeChronicle.x,
              y: activeChronicle.y,
              icon: "史册",
              title: `${activeChronicle.date_label} ${activeChronicle.title}`,
              desc: activeChronicle.detail
            },
            ...(activeLandmarks || []).slice(0, 2)
          ];
        }
      }
    }

    // Transition any polity that has passed its historical end year to its next scheduled owner
    for (const [regId, empName] of Object.entries(owners)) {
      if (!this._isEmpireAlive(empName, targetYear)) {
        let nextOwner = null;
        for (const frame of this.timeline) {
          if (frame.year > lastKeyframeYear && frame.owners && frame.owners[regId]) {
            nextOwner = frame.owners[regId];
            break;
          }
        }
        if (nextOwner) {
          owners[regId] = nextOwner;
        }
      }
    }

    // Generate Dynamic Campaign Attack Arrows for newly conquered regions in activeFrame
    const campaigns = [];
    if (activeFrame && activeFrame.owners) {
      for (const [dstId, empName] of Object.entries(activeFrame.owners)) {
        if (!empName || !this.empires[empName]) continue;
        if (prevOwners[dstId] === empName) continue;
        const dstReg = this.regionMap[dstId];
        if (!dstReg) continue;

        // Find nearest source region owned by empName in prevOwners (or in current owners)
        let bestSrc = null;
        let bestDist = Infinity;
        const candidatePool = Object.keys(prevOwners).filter(k => prevOwners[k] === empName);
        const pool = candidatePool.length > 0
          ? candidatePool
          : Object.keys(owners).filter(k => owners[k] === empName && k !== dstId);

        for (const srcId of pool) {
          const srcReg = this.regionMap[srcId];
          if (!srcReg) continue;
          const d = Math.hypot(dstReg.cx - srcReg.cx, dstReg.cy - srcReg.cy);
          if (d > 12 && d < 310 && d < bestDist) {
            bestDist = d;
            bestSrc = srcReg;
          }
        }

        if (bestSrc) {
          campaigns.push({
            fromX: bestSrc.cx,
            fromY: bestSrc.cy,
            toX: dstReg.cx,
            toY: dstReg.cy,
            color: this.empires[empName].color,
            empire: window.HistoryAtlas.getDisplayEmpireName(empName, targetYear),
            targetName: dstReg.name.split("(")[0]
          });
        }
      }
    }

    // Calculate Top Powers Ranking by controlled macro-regions
    const counts = {};
    for (const empName of Object.values(owners)) {
      if (!empName) continue;
      counts[empName] = (counts[empName] || 0) + 1;
    }

    const leaderboard = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        displayName: window.HistoryAtlas.getDisplayEmpireName(name, targetYear),
        count,
        color: this.empires[name] ? this.empires[name].color : "#888",
        peak_area: this.empires[name] ? this.empires[name].peak_area : "-"
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      year: targetYear,
      keyframeYear: lastKeyframeYear,
      era: activeEra,
      theme: activeTheme,
      toast: latestToast,
      routes: activeRoutes,
      landmarks: activeLandmarks,
      campaigns: campaigns.slice(0, 7),
      macro: this.getMacroAtYear(targetYear),
      owners,
      leaderboard
    };
  }

  // Get full chronological succession history of a specific region up to targetYear
  getRegionHistory(regionId, upToYear = 2026) {
    const history = [];
    let currentOwner = null;
    for (const frame of this.timeline) {
      if (frame.year > upToYear) break;
      if (frame.owners && Object.prototype.hasOwnProperty.call(frame.owners, regionId)) {
        const nextOwner = frame.owners[regionId];
        if (nextOwner !== currentOwner) {
          currentOwner = nextOwner;
          history.push({
            year: frame.year,
            rawOwner: currentOwner,
            owner: currentOwner ? window.HistoryAtlas.getDisplayEmpireName(currentOwner, frame.year) : "远古早期方国"
          });
        }
      }
    }
    return history.reverse();
  }

  // Instant search across Empires, Keyframe Events/Landmarks, and Regions
  search(query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    const results = [];

    // 1. Search Empires
    for (const [empName, info] of Object.entries(this.empires)) {
      if (empName.toLowerCase().includes(q) || (info.capital && info.capital.toLowerCase().includes(q))) {
        const pk = this._empirePeaks[empName] || { peakYear: 0, maxRegions: 1 };
        results.push({
          type: "帝国",
          title: empName,
          sub: `鼎盛：${pk.peakYear < 0 ? "前" + Math.abs(pk.peakYear) : pk.peakYear}年 · ${info.peak_area}`,
          year: pk.peakYear,
          empireName: empName,
          regionId: pk.peakRegions && pk.peakRegions[0] ? pk.peakRegions[0] : null
        });
      }
    }

    // 2. Search Timeline Events & Landmarks
    for (const frame of this.timeline) {
      const yrStr = String(frame.year);
      const hitEra = frame.era.toLowerCase().includes(q) || frame.toast.toLowerCase().includes(q) || yrStr === q;
      let hitLm = null;
      if (frame.landmarks) {
        hitLm = frame.landmarks.find(l => l.title.toLowerCase().includes(q) || (l.desc && l.desc.toLowerCase().includes(q)));
      }
      if (hitLm || hitEra) {
        results.push({
          type: hitLm ? (hitLm.icon || "事件") : "纪年",
          title: hitLm ? hitLm.title : frame.era,
          sub: `${frame.year < 0 ? "公元前 " + Math.abs(frame.year) : "公元 " + frame.year} 年`,
          year: frame.year,
          x: hitLm ? hitLm.x : null,
          y: hitLm ? hitLm.y : null
        });
      }
    }

    // 3. Search Chronicle Annals Database (635+ events)
    if (this.chronicles && this.chronicles.length > 0) {
      for (const ev of this.chronicles) {
        const yrStr = String(ev.year);
        if (
          ev.title.toLowerCase().includes(q) ||
          ev.detail.toLowerCase().includes(q) ||
          ev.date_label.toLowerCase().includes(q) ||
          yrStr === q
        ) {
          results.push({
            type: "编年史",
            title: `${ev.date_label} · ${ev.title}`,
            sub: `${ev.theater} · ${ev.region_name} · ${ev.category}`,
            year: ev.year,
            regionId: ev.regionId,
            x: ev.x,
            y: ev.y
          });
          if (results.length >= 16) break;
        }
      }
    }

    // 4. Search Regions
    for (const r of this.regions) {
      if (r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)) {
        results.push({
          type: "地理区",
          title: r.name,
          sub: `${r.continent} · 历史地理区`,
          regionId: r.id,
          x: r.cx,
          y: r.cy
        });
      }
    }

    return results.slice(0, 12);
  }

  // Filter Chronicle Annals by Era, Theater, Category, and Keyword
  filterChronicles({ eraGroup = "ALL", theater = "ALL", category = "ALL", query = "" } = {}) {
    const q = (query || "").trim().toLowerCase();
    return (this.chronicles || []).filter(ev => {
      if (eraGroup !== "ALL" && ev.era_group !== eraGroup) return false;
      if (theater !== "ALL" && ev.theater !== theater) return false;
      if (category !== "ALL" && ev.category !== category) return false;
      if (q) {
        const yrStr = String(ev.year);
        const match =
          ev.title.toLowerCase().includes(q) ||
          ev.detail.toLowerCase().includes(q) ||
          ev.date_label.toLowerCase().includes(q) ||
          ev.region_name.toLowerCase().includes(q) ||
          yrStr === q;
        if (!match) return false;
      }
      return true;
    });
  }

  // Compare two empires side-by-side
  getEmpireComparison(empA, empB) {
    const buildStats = (name) => {
      const info = this.empires[name] || {};
      const pk = this._empirePeaks[name] || { peakYear: 0, maxRegions: 1, peakRegions: [] };
      const b = this._bounds[name] || { startY: 0, rawEnd: 100 };
      const areaMatch = (info.peak_area || "0").match(/([\d.]+)/);
      const areaNum = areaMatch ? parseFloat(areaMatch[1]) : 0;
      const duration = Math.max(1, b.rawEnd - b.startY);
      return {
        name,
        color: info.color || "#888",
        capital: info.capital || "-",
        regime: info.regime || "-",
        era_span: info.era_span || "-",
        peak_area: info.peak_area || "-",
        desc: info.desc || "",
        areaNum,
        duration,
        peakYear: pk.peakYear,
        maxRegions: pk.maxRegions,
        peakRegions: pk.peakRegions
      };
    };
    return {
      a: buildStats(empA),
      b: buildStats(empB)
    };
  }
}

window.HistoryAtlas.TimelineEngine = TimelineEngine;
