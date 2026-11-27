export function getEvoMap() {
  const m = globalThis.BEAST_EVO;
  return m && typeof m === "object" ? m : {};
}

let EVO_FAMILY_ID_BY_PID = null;

function buildEvoFamilyIdMap() {
  const evo = getEvoMap();
  const adj = {};
  const ensure = (pid) => {
    if (!pid || typeof pid !== "string") return;
    if (!adj[pid]) adj[pid] = new Set();
  };
  for (const [from, tos] of Object.entries(evo)) {
    if (typeof from !== "string" || !Array.isArray(tos)) continue;
    ensure(from);
    for (const to of tos) {
      if (typeof to !== "string") continue;
      ensure(to);
      adj[from].add(to);
      adj[to].add(from);
    }
  }
  const famId = new Map();
  let next = 1;
  for (const pid of Object.keys(adj)) {
    if (famId.has(pid)) continue;
    const id = next;
    next += 1;
    const q = [pid];
    famId.set(pid, id);
    while (q.length) {
      const cur = q.pop();
      const ns = adj[cur];
      if (!ns) continue;
      for (const n of ns) {
        if (famId.has(n)) continue;
        famId.set(n, id);
        q.push(n);
      }
    }
  }
  return famId;
}

/** Stable evolution-family id for release / star-up grouping. */
export function getEvoFamilyId(pid) {
  if (!pid || typeof pid !== "string") return "";
  if (!EVO_FAMILY_ID_BY_PID) EVO_FAMILY_ID_BY_PID = buildEvoFamilyIdMap();
  return EVO_FAMILY_ID_BY_PID.get(pid) ?? pid;
}

export function isSameEvoFamily(pidA, pidB) {
  if (!pidA || !pidB) return false;
  if (pidA === pidB) return true;
  return getEvoFamilyId(pidA) === getEvoFamilyId(pidB);
}

function getEvoReqMap() {
  const m = globalThis.BEAST_EVO_REQ;
  return m && typeof m === "object" ? m : {};
}

/** ponytail: test-only reset when BEAST_EVO is injected after first import */
export function resetEvoFamilyCacheForTest() {
  EVO_FAMILY_ID_BY_PID = null;
}

function buildEvoPrevMap() {
  const evo = getEvoMap();
  const prev = {};
  for (const [from, tos] of Object.entries(evo)) {
    if (!Array.isArray(tos)) continue;
    for (const to of tos) {
      if (typeof to !== "string") continue;
      if (!prev[to]) prev[to] = from;
    }
  }
  return prev;
}

let evoPrevOf = null;
let evoPrevMap = {};
/** BEAST_EVO 换了就重算（import 时数据可能还没加载） */
function evoPrev() {
  const src = globalThis.BEAST_EVO;
  if (src !== evoPrevOf) {
    evoPrevOf = src;
    evoPrevMap = buildEvoPrevMap();
  }
  return evoPrevMap;
}

export function stageIndex(pid) {
  let cur = pid;
  let depth = 0;
  const prev = evoPrev();
  while (prev[cur] && depth < 4) {
    cur = prev[cur];
    depth += 1;
  }
  return depth;
}

/** 家族里走到下一段的默认等级：只在条件表缺项时用（例如旧物种） */
export function defaultReqLvlByStage(pid) {
  return 18 + 16 * Math.min(2, stageIndex(pid));
}

/** 规则调整前的直达关系：只对老伙伴（veteran）保留，让调整前就能走的路还能走 */
const VETERAN_DIRECT = { p133: ["p196", "p197", "p700"], p079: ["p199"] };

/** 进化条件 { path, lvl, aff, rid }，由 scripts/beast_rules.mjs 生成进 BEAST_EVO_REQ */
export function getEvoCondition(fromPid, toPid) {
  const row = getEvoReqMap()[fromPid]?.[toPid];
  const path = row?.path === "bond" || row?.path === "rope" ? row.path : "stone";
  return {
    path,
    lvl: typeof row?.lvl === "number" && row.lvl > 0 ? Math.floor(row.lvl) : defaultReqLvlByStage(fromPid),
    aff: path === "bond" && typeof row?.aff === "number" ? Math.max(0, Math.floor(row.aff)) : 0,
    rid: path === "rope" ? "linkRope" : "evolutionStone",
  };
}

/** 这只萌灵能变成谁 */
export function getEvoTargets(mon) {
  const next = getEvoMap()[mon?.pid];
  const list = Array.isArray(next) ? next : [];
  return mon?.veteran ? [...list, ...(VETERAN_DIRECT[mon.pid] ?? [])] : list;
}

/**
 * 进化检查：列表徽章、详情按钮、点击结算共用这一份。
 * 老伙伴（veteran，规则调整前就在存档里）不看等级和亲密度，灵晶石、灵契绳任一份即可。
 */
export function getEvoStatus(mon, toPid, res) {
  const cond = getEvoCondition(mon?.pid, toPid);
  const have = (rid) => (res?.[rid]?.value ?? 0) >= 1;
  const pass = Boolean(mon?.veteran);
  const other = cond.rid === "linkRope" ? "evolutionStone" : "linkRope";
  const rid = pass && !have(cond.rid) && have(other) ? other : cond.rid;
  const lvl = pass ? 1 : cond.lvl;
  const aff = pass ? 0 : cond.aff;
  const lvlOk = (mon?.lvl ?? 0) >= lvl;
  const affOk = (typeof mon?.affection === "number" ? mon.affection : 0) >= aff;
  const resOk = have(rid);
  return { path: cond.path, pass, lvl, aff, rid, lvlOk, affOk, resOk, ok: lvlOk && affOk && resOk };
}

/** 按钮上的条件文字 */
export function evoConditionText(st) {
  const parts = [];
  if (st.pass) parts.push("老伙伴免门槛");
  else parts.push(`Lv.${st.lvl}+`);
  if (st.aff > 0) parts.push(`亲密度${st.aff}+`);
  parts.push(st.pass ? "灵晶石或灵契绳 x1" : st.rid === "linkRope" ? "灵契绳 x1" : "灵晶石 x1");
  return parts.join(" · ");
}
