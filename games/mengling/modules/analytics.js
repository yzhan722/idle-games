// 匿名留存统计（ML-G4）：本机排队、尽力发送到 /api/ops/ingest。
// 只记事件名、时间、一次性会话号、首次打开日期、版本；不带账号、昵称、存档。
// 玩家明确同意才记：没表态 = 关；隐私政策还是草案时不问，正式版第一次打开问一次。设置里随时可开可关。
// 说明文字在 legal/privacy.html，改这里的事件要同步改那一页和 functions/api/_retention.js。
import { LEGAL_DRAFT } from "./legal_status.js";

const QUEUE_KEY = "mengling_idle_analytics_queue_v1";
const FIRST_CAPTURE_KEY = "mengling_idle_analytics_first_capture_v1"; // 旧版首捕标记，只读
const ONCE_KEY = "mengling_idle_analytics_once_v1";
const COHORT_KEY = "mengling_idle_analytics_cohort_v1";
const OPT_KEY = "mengling_idle_analytics_opt_v1"; // "on" = 同意，"off" = 不同意，没有 = 没表态
const MAX_QUEUE = 200;
const MAX_BATCH = 50;
const FLUSH_INTERVAL_MS = 15000;
const MIN_MS = 60000;

export const FUNNEL_EVENTS = [
  "session_start",
  "register",
  "first_battle",
  "first_capture",
  "first_rebirth",
  "return_d1",
  "return_d7",
  "session_time",
];

/** 每个设备只发一次的事件 */
const ONCE_EVENTS = new Set(["register", "first_battle", "first_capture", "first_rebirth", "return_d1", "return_d7"]);

/** 单次在线时长分桶：达到这些分钟数各记一次 */
export const SESSION_BUCKETS_MIN = [1, 5, 15, 30, 60];

export const LEGACY_COHORT = "legacy";

export function sanitizeEventName(name) {
  const s = typeof name === "string" ? name.trim().slice(0, 64) : "";
  return /^[a-z][a-z0-9_]{0,63}$/.test(s) ? s : "";
}

export function isCohort(v) {
  return v === LEGACY_COHORT || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v));
}

/** 白名单属性，其余一律丢掉 */
export function sanitizeProps(props) {
  if (!props || typeof props !== "object" || Array.isArray(props)) return {};
  const out = {};
  if (isCohort(props.cohort)) out.cohort = props.cohort;
  if (typeof props.new === "boolean") out.new = props.new;
  if (SESSION_BUCKETS_MIN.includes(props.bucket)) out.bucket = props.bucket;
  return out;
}

export function mergeQueues(a, b, maxLen = MAX_QUEUE) {
  const left = Array.isArray(a) ? a : [];
  const right = Array.isArray(b) ? b : [];
  const merged = [...left, ...right];
  if (merged.length <= maxLen) return merged;
  return merged.slice(merged.length - maxLen);
}

export function buildIngestPayload(events, { sessionId = "", gameVersion = "" } = {}) {
  const batch = (Array.isArray(events) ? events : []).slice(0, MAX_BATCH).map((e) => ({
    event: sanitizeEventName(e?.event),
    ts: Number.isFinite(e?.ts) ? Math.floor(e.ts) : Date.now(),
    props: sanitizeProps(e?.props),
    // 上一次会话没发完的事件带着自己的会话号
    sessionId: String(e?.sessionId || sessionId || "").slice(0, 64),
    gameVersion: typeof gameVersion === "string" ? gameVersion.slice(0, 32) : "",
  }));
  return { events: batch.filter((e) => FUNNEL_EVENTS.includes(e.event)) };
}

/** 两个 YYYY-MM-DD 相差几天；不是日期返回 NaN */
export function dayDiff(from, to) {
  if (!isCohort(from) || !isCohort(to) || from === LEGACY_COHORT || to === LEGACY_COHORT) return NaN;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

export function returnEvent(cohort, today) {
  const d = dayDiff(cohort, today);
  if (d === 1) return "return_d1";
  if (d === 7) return "return_d7";
  return "";
}

/** 在线时长从 prevMs 走到 nextMs，新跨过了哪些分桶 */
export function bucketsCrossed(prevMs, nextMs) {
  return SESSION_BUCKETS_MIN.filter((m) => prevMs < m * MIN_MS && nextMs >= m * MIN_MS);
}

export function localDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isAnalyticsEnabled(storage) {
  try {
    return storage.getItem(OPT_KEY) === "on";
  } catch {
    return false;
  }
}

/** 要不要弹一次询问：正式版、且还没表态 */
export function shouldAskAnalytics(storage, draft = LEGAL_DRAFT) {
  if (draft || !storage) return false;
  try {
    const v = storage.getItem(OPT_KEY);
    return v !== "on" && v !== "off";
  } catch {
    return false;
  }
}

/** 关掉时连同还没发出的记录一起清掉 */
export function setAnalyticsEnabled(storage, on) {
  try {
    storage.setItem(OPT_KEY, on ? "on" : "off");
    if (!on) storage.removeItem(QUEUE_KEY);
  } catch {
  }
}

function readQueue(storage) {
  try {
    const raw = storage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(storage, queue) {
  try {
    storage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    // ponytail: drop oldest on quota — queue is best-effort
    try {
      storage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-Math.floor(MAX_QUEUE / 2))));
    } catch {
    }
  }
}

function readOnce(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(ONCE_KEY) || "{}");
    const out = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    if (storage.getItem(FIRST_CAPTURE_KEY)) out.first_capture = 1;
    return out;
  } catch {
    return {};
  }
}

function writeOnce(storage, once) {
  try {
    storage.setItem(ONCE_KEY, JSON.stringify(once));
  } catch {
  }
}

export function createAnalytics({ gameVersion = "", storage = typeof localStorage !== "undefined" ? localStorage : null } = {}) {
  const sessionId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  let getBaseUrl = () => "";
  let remoteEnabled = true;
  let flushTimer = 0;
  let flushing = false;
  let sessionStarted = false;
  let sessionEvents = null; // 本次开局的事件，同意之前先不记
  let cohort = "";
  let activeMs = 0;

  const enabled = () => Boolean(storage) && remoteEnabled && isAnalyticsEnabled(storage);

  function track(event, props = null) {
    try {
      if (!enabled()) return;
      const name = sanitizeEventName(event);
      if (!FUNNEL_EVENTS.includes(name)) return;
      const q = readQueue(storage);
      q.push({
        event: name,
        ts: Date.now(),
        props: sanitizeProps({ ...(props || {}), cohort }),
        sessionId,
      });
      writeQueue(storage, q);
      scheduleFlush();
    } catch {
    }
  }

  /** already = 这件事以前就发生过（老存档），只记标记不发 */
  function trackOnce(event, { already = false } = {}) {
    if (!storage || !ONCE_EVENTS.has(event)) return;
    const once = readOnce(storage);
    if (once[event]) return;
    once[event] = 1;
    writeOnce(storage, once);
    if (!already) track(event);
  }

  function startSession({ isNewPlayer = false, today = localDay() } = {}) {
    if (sessionStarted || !storage) return;
    sessionStarted = true;
    let fresh = false;
    try {
      const saved = storage.getItem(COHORT_KEY);
      if (isCohort(saved)) cohort = saved;
      else {
        fresh = Boolean(isNewPlayer);
        cohort = fresh ? today : LEGACY_COHORT;
        storage.setItem(COHORT_KEY, cohort);
      }
    } catch {
      cohort = LEGACY_COHORT;
    }
    sessionEvents = { fresh, back: returnEvent(cohort, today) };
    reportSession();
  }

  function reportSession() {
    if (!sessionEvents || !enabled()) return;
    const { fresh, back } = sessionEvents;
    sessionEvents = null;
    track("session_start", { new: fresh });
    if (back) trackOnce(back);
  }

  function addActiveTime(ms) {
    const next = activeMs + Math.max(0, Number(ms) || 0);
    for (const bucket of bucketsCrossed(activeMs, next)) track("session_time", { bucket });
    activeMs = next;
  }

  function scheduleFlush() {
    if (flushTimer || typeof window === "undefined") return;
    flushTimer = window.setTimeout(() => {
      flushTimer = 0;
      flush();
    }, 1200);
  }

  async function flush() {
    if (flushing || !enabled()) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    const queue = readQueue(storage);
    if (queue.length === 0) return;

    flushing = true;
    try {
      const base = typeof getBaseUrl === "function" ? getBaseUrl() : "";
      if (!base) return;

      const batch = queue.slice(0, MAX_BATCH);
      const payload = buildIngestPayload(batch, { sessionId, gameVersion });

      if (payload.events.length > 0) {
        // 不带登录凭证：统计不与账号关联
        const res = await fetch(`${base}/api/ops/ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
        if (!res.ok) return;
      }

      if (!enabled()) return;
      const rest = readQueue(storage).slice(batch.length);
      writeQueue(storage, rest);
      if (rest.length > 0) scheduleFlush();
    } catch {
    } finally {
      flushing = false;
    }
  }

  function init({ baseUrl } = {}) {
    if (typeof baseUrl === "function") getBaseUrl = baseUrl;
    else if (typeof baseUrl === "string") getBaseUrl = () => baseUrl;

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => flush());
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
      });
      window.setInterval(() => {
        if (document.visibilityState === "visible") addActiveTime(FLUSH_INTERVAL_MS);
        flush();
      }, FLUSH_INTERVAL_MS);
    }
  }

  return {
    track,
    trackOnce,
    startSession,
    addActiveTime,
    flush,
    init,
    /** 远端配置 featureFlags.analytics === false 时停收 */
    setRemoteEnabled: (on) => {
      remoteEnabled = on !== false;
    },
    isEnabled: enabled,
    /** 同意后补记本次开局（只这一次会话），之前没同意时发生的事不补 */
    setEnabled: (on) => {
      if (!storage) return;
      setAnalyticsEnabled(storage, on);
      if (on) reportSession();
    },
    shouldAsk: (draft) => shouldAskAnalytics(storage, draft),
    sessionId,
  };
}
