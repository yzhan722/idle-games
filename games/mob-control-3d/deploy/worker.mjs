import { defaultNameFor, isNameBlocked } from '../src/game/nameFilter.mjs';

const SEED_LEADERBOARD = [
  { name: '薄荷小号手', bestStage: 28, totalKills: 48620, playTimeSeconds: 14820, skinName: '梦幻偶像舞台', badgeColor: '#ee5c9c', isBot: true },
  { name: '星梦应援团长', bestStage: 23, totalKills: 36410, playTimeSeconds: 11580, skinName: '皇家焦糖布丁', badgeColor: '#d99016', isBot: true },
  { name: '焦糖布丁大王', bestStage: 19, totalKills: 29850, playTimeSeconds: 9420, skinName: '皇家焦糖布丁', badgeColor: '#d99016', isBot: true },
  { name: '电音喵喵DJ', bestStage: 16, totalKills: 23190, playTimeSeconds: 7650, skinName: '葡萄星梦冻', badgeColor: '#a86cf5', isBot: true },
  { name: '兔耳魔法师', bestStage: 14, totalKills: 19400, playTimeSeconds: 6380, skinName: '葡萄星梦冻', badgeColor: '#a86cf5', isBot: true },
  { name: '青柠汽水波波', bestStage: 12, totalKills: 15820, playTimeSeconds: 5120, skinName: '青苹果软糖', badgeColor: '#58b938', isBot: true },
  { name: '蒸汽工坊克星', bestStage: 9, totalKills: 11260, playTimeSeconds: 3840, skinName: '青苹果软糖', badgeColor: '#58b938', isBot: true },
  { name: '草莓甜心主唱', bestStage: 6, totalKills: 7450, playTimeSeconds: 2560, skinName: '草莓甜心冻', badgeColor: '#fb6d7f', isBot: true },
  { name: '泡泡站长老王', bestStage: 4, totalKills: 4680, playTimeSeconds: 1620, skinName: '草莓甜心冻', badgeColor: '#fb6d7f', isBot: true },
  { name: '见习应援生', bestStage: 2, totalKills: 1920, playTimeSeconds: 780, skinName: '海盐汽水糖', badgeColor: '#25c4f8', isBot: true },
];

const EPOCH_MONDAY_UTC8_MS = 316800000; // 1970-01-05 00:00:00 UTC+8 (Monday)
const WEEK_MS = 7 * 24 * 3600 * 1000;

function getWeeklyCycleInfo(nowMs = Date.now()) {
  const weekIndex = Math.floor((nowMs - EPOCH_MONDAY_UTC8_MS) / WEEK_MS);
  const weekKey = `w${weekIndex}`;
  const kvKey = `real_players_weekly_${weekKey}`;
  const nextResetAtMs = EPOCH_MONDAY_UTC8_MS + (weekIndex + 1) * WEEK_MS;
  const weekStartMs = EPOCH_MONDAY_UTC8_MS + weekIndex * WEEK_MS;
  return { weekKey, kvKey, nextResetAtMs, weekStartMs };
}

// --- Write credentials, caps and rate limits -------------------------------------------------------------------------
// The client keeps a random write key and sends it only with POST. KV stores its hash; the key itself is never stored.
// Public output carries only `publicId` (a one-way hash of a 256-bit secret, or a random id for keyless legacy rows).
const WRITE_KEY_PATTERN = /^[0-9a-f]{64}$/;
const MAX_BODY_CHARS = 4096;
const MAX_STAGE = 999;
const MAX_KILLS = 9999999;
const KILLS_PER_SECOND_CAP = 100;
const KILLS_FREE_ALLOWANCE = 5000;
const PLAY_TIME_SLACK_SECONDS = 3600;
const MIN_WRITE_INTERVAL_MS = 5000;
const NEW_ROWS_PER_MINUTE = 30;
const MAX_ROWS = 100;

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const hashWriteKey = (key) => sha256Hex(`mc-lb-key|${key}`);
const publicIdFromKeyHash = async (keyHash) => `u_${(await sha256Hex(`mc-lb-public|${keyHash}`)).slice(0, 16)}`;

function randomPublicId() {
  const buf = crypto.getRandomValues(new Uint8Array(8));
  return `u_${Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

// Per-isolate guard against one script filling the board with fresh identities (no IP is read or stored).
let newRowWindowStartMs = 0;
let newRowCount = 0;
function takeNewRowSlot(nowMs) {
  if (nowMs - newRowWindowStartMs >= 60000 || nowMs < newRowWindowStartMs) {
    newRowWindowStartMs = nowMs;
    newRowCount = 0;
  }
  if (newRowCount >= NEW_ROWS_PER_MINUTE) return false;
  newRowCount++;
  return true;
}

function toCount(value, max) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
}

function cleanText(value, max) {
  return String(value ?? '')
    // Control chars, zero-width blanks and bidi overrides (they can flip or blank out a board row); ZWJ stays for emoji
    .replace(/[\p{Cc}\u200b\u200e\u200f\u202a-\u202e\u2060-\u2069\ufeff]/gu, '')
    .trim()
    .slice(0, max)
    // slice() can cut an emoji in half; a lone surrogate would break encodeURIComponent on the client
    .replace(/\p{Cs}/gu, '');
}

/**
 * Applies one POST to the week's rows. Returns { accepted, reason?, row?, changed, players }.
 * - keyed client: row by key hash, else an unbound row with the same playerId (binds it), else a new row;
 *   a playerId already bound to another key is refused and left untouched.
 * - keyless (older) client: may only touch unbound rows.
 */
async function applySubmission(players, body, nowMs, weekStartMs) {
  const refuse = (reason) => ({ accepted: false, reason, changed: false, players });
  const playerId = cleanText(body.playerId, 40);
  const name = cleanText(body.name, 20);
  const bestStage = toCount(body.bestStage, MAX_STAGE);
  // Weekly play time cannot exceed the time elapsed this week; weekly kills are capped by that play time.
  const maxPlayTime = Math.max(0, Math.floor((nowMs - weekStartMs) / 1000)) + PLAY_TIME_SLACK_SECONDS;
  const playTimeSeconds = toCount(body.playTimeSeconds, maxPlayTime);
  const totalKills = toCount(body.totalKills, Math.min(MAX_KILLS, playTimeSeconds * KILLS_PER_SECOND_CAP + KILLS_FREE_ALLOWANCE));
  const skinName = cleanText(body.skinName, 12) || '海盐汽水糖';
  const badgeColor = /^#[0-9a-fA-F]{3,8}$/.test(String(body.badgeColor)) ? String(body.badgeColor) : '#38bdf8';
  if (!name || (bestStage === 0 && totalKills === 0 && playTimeSeconds === 0)) return refuse('empty');

  let keyHash = '';
  if (body.writeKey !== undefined) {
    if (typeof body.writeKey !== 'string' || !WRITE_KEY_PATTERN.test(body.writeKey)) return refuse('bad_key');
    keyHash = await hashWriteKey(body.writeKey);
  }

  let idx = keyHash ? players.findIndex((e) => e.keyHash === keyHash) : -1;
  if (idx < 0 && playerId) {
    idx = players.findIndex((e) => e.playerId === playerId && !e.keyHash);
    if (idx < 0 && players.some((e) => e.playerId === playerId)) return refuse(keyHash ? 'key_mismatch' : 'key_required');
  }
  // Oldest clients sent no playerId and were matched by name; that may only ever reach rows without any identity.
  if (idx < 0 && !keyHash && !playerId) {
    idx = players.findIndex((e) => e.name === name && !e.playerId && !e.keyHash);
  }

  const prev = idx >= 0 ? players[idx] : null;
  const binding = Boolean(prev && keyHash && !prev.keyHash);
  if (prev && !binding && nowMs - (prev.updatedAt || 0) < MIN_WRITE_INTERVAL_MS) {
    return { accepted: false, reason: 'too_fast', row: prev, changed: false, players };
  }
  if (!prev && !takeNewRowSlot(nowMs)) return refuse('busy');

  const publicId = keyHash ? await publicIdFromKeyHash(keyHash) : prev?.publicId || randomPublicId();
  const next = {
    playerId: playerId || prev?.playerId || undefined,
    keyHash: keyHash || prev?.keyHash || undefined,
    publicId,
    // Names that hit the shared blocklist (src/game/nameBlocklist.mjs) are stored as the default name; the score is kept
    name: isNameBlocked(name) ? defaultNameFor(publicId) : name,
    bestStage: Math.max(prev?.bestStage || 0, bestStage),
    totalKills: Math.max(prev?.totalKills || 0, totalKills),
    playTimeSeconds,
    skinName,
    badgeColor,
    isBot: false,
    updatedAt: nowMs,
  };
  next.playTimeSeconds = Math.max(prev?.playTimeSeconds || 0, Math.min(maxPlayTime, Math.max(ensurePlayTime(prev || next), playTimeSeconds)));

  if (prev) {
    const same = ['playerId', 'keyHash', 'publicId', 'name', 'bestStage', 'totalKills', 'playTimeSeconds', 'skinName', 'badgeColor'].every(
      (k) => prev[k] === next[k]
    );
    if (same) return { accepted: true, row: prev, changed: false, players };
  }

  const rows = [...players];
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
  rows.sort((a, b) => b.bestStage - a.bestStage || b.totalKills - a.totalKills);
  return { accepted: true, row: next, changed: true, players: rows.slice(0, MAX_ROWS) };
}

/** Public shape of a row: never playerId, keyHash or updatedAt. */
function toPublicRow(p) {
  const row = {
    name: p.name,
    bestStage: p.bestStage,
    totalKills: p.totalKills,
    playTimeSeconds: p.playTimeSeconds,
    skinName: p.skinName,
    badgeColor: p.badgeColor,
    isBot: Boolean(p.isBot),
  };
  if (p.publicId) row.publicId = p.publicId;
  return row;
}

// --- Name reports -----------------------------------------------------------------------------------------------------
// One KV key: reported publicId -> { nameHash, reasons: { code: count }, reporters: [reporter publicId], firstAt, lastAt, status }.
// Only a player with a row on this week's board (a write key bound to it) can report; no IP is read or stored.
// status: 'open' (hidden once REPORT_HIDE_THRESHOLD different players reported it), 'hidden' / 'cleared' (set by admin).
// nameHash ties the entry to the reported name: after a rename the row shows again and the next report starts a new entry.
// Known limits (need Durable Objects / D1 to fix, same open decision as the board's own storage):
// - Sybil: a "player" is only a write key with any score this week, so one person with 3 keys can hide a name.
//   Impact is limited to the name (the score stays, an admin can 'clear' it).
// - One KV key, read-modify-write: two reports in the same second (or within KV's ~60 s cross-region delay) can
//   overwrite each other, and a report can undo an admin decision made at the same moment. The 1 write/s per key
//   limit shows up as 'busy' to the reporter.
const REPORTS_KV_KEY = 'name_reports_v1';
const REPORT_REASONS = ['insult', 'sexual', 'hate', 'impersonation', 'other'];
const REPORT_HIDE_THRESHOLD = 3;
const REPORT_KEEP_DAYS = 30;
const MAX_REPORT_TARGETS = 200;
const MAX_REPORTERS_PER_TARGET = 20;
const REPORTS_PER_REPORTER = 10;
const REPORTS_PER_MINUTE = 20;

let reportWindowStartMs = 0;
let reportCount = 0;
function takeReportSlot(nowMs) {
  if (nowMs - reportWindowStartMs >= 60000 || nowMs < reportWindowStartMs) {
    reportWindowStartMs = nowMs;
    reportCount = 0;
  }
  if (reportCount >= REPORTS_PER_MINUTE) return false;
  reportCount++;
  return true;
}

const reportNameHash = async (name) => (await sha256Hex(`mc-report-name|${name ?? ''}`)).slice(0, 16);

/** Hidden for this name? An entry without nameHash (none deployed so far) applies to any name. */
const isReportHidden = (e, nameHash) =>
  Boolean(e) &&
  (!e.nameHash || !nameHash || e.nameHash === nameHash) &&
  (e.status === 'hidden' || (e.status !== 'cleared' && (e.reporters?.length || 0) >= REPORT_HIDE_THRESHOLD));

function pruneReports(reports, nowMs) {
  const out = {};
  let dropped = 0;
  for (const [id, e] of Object.entries(reports && typeof reports === 'object' ? reports : {})) {
    if (e && Array.isArray(e.reporters) && nowMs - (e.lastAt || 0) < REPORT_KEEP_DAYS * 86400000) out[id] = e;
    else dropped++;
  }
  return { reports: out, dropped };
}

/** When the table is full: drop the least useful entry (open and under the threshold, then cleared, then auto-hidden;
 *  oldest lastAt first). Admin 'hidden' entries are never evicted; returns '' when only those are left. */
function evictionVictim(reports) {
  const rank = (e) =>
    e.status === 'hidden' ? 3 : e.status === 'cleared' ? 1 : e.reporters.length < REPORT_HIDE_THRESHOLD ? 0 : 2;
  let best = '';
  for (const [id, e] of Object.entries(reports)) {
    if (rank(e) === 3) continue;
    const b = reports[best];
    if (!b || rank(e) < rank(b) || (rank(e) === rank(b) && (e.lastAt || 0) < (b.lastAt || 0))) best = id;
  }
  return best;
}

let fallbackReports = {};

async function loadReports(env, nowMs) {
  if (env && env.MOB_CONTROL_LEADERBOARD) {
    try {
      return { ...pruneReports(await env.MOB_CONTROL_LEADERBOARD.get(REPORTS_KV_KEY, 'json'), nowMs), readOk: true };
    } catch {
      return { ...pruneReports(fallbackReports, nowMs), readOk: false };
    }
  }
  return { ...pruneReports(fallbackReports, nowMs), readOk: true };
}

async function saveReports(env, reports) {
  fallbackReports = reports;
  if (env && env.MOB_CONTROL_LEADERBOARD) {
    try {
      await env.MOB_CONTROL_LEADERBOARD.put(REPORTS_KV_KEY, JSON.stringify(reports), {
        expirationTtl: REPORT_KEEP_DAYS * 86400,
      });
    } catch {
      return false;
    }
  }
  return true;
}

/** One report: { writeKey, publicId, reason }. Returns { ok, reason?, changed, reports }. */
async function applyReport(reports, players, body, nowMs) {
  const refuse = (reason) => ({ ok: false, reason, changed: false, reports });
  if (typeof body.writeKey !== 'string' || !WRITE_KEY_PATTERN.test(body.writeKey)) return refuse('bad_key');
  if (!REPORT_REASONS.includes(body.reason)) return refuse('bad_reason');
  const target = typeof body.publicId === 'string' ? body.publicId : '';
  const targetRow = target ? players.find((p) => p.publicId === target) : null;
  if (!targetRow) return refuse('bad_target');
  const keyHash = await hashWriteKey(body.writeKey);
  if (!players.some((p) => p.keyHash === keyHash)) return refuse('not_ranked');
  const reporter = await publicIdFromKeyHash(keyHash);
  if (reporter === target) return refuse('self');
  const nameHash = await reportNameHash(targetRow.name);
  // Renamed since the last reports: those were about the old name, start over
  const old = reports[target];
  const prev = old && (!old.nameHash || old.nameHash === nameHash) ? old : null;
  if (prev && prev.reporters.includes(reporter)) return { ok: true, reason: 'duplicate', changed: false, reports };
  if (Object.values(reports).filter((e) => e.reporters.includes(reporter)).length >= REPORTS_PER_REPORTER) {
    return refuse('limit');
  }
  let base = reports;
  if (!old && Object.keys(reports).length >= MAX_REPORT_TARGETS) {
    const victim = evictionVictim(reports);
    if (!victim) return refuse('full');
    base = { ...reports };
    delete base[victim];
  }
  // Already far past the threshold: accept without storing more reporters
  if (prev && prev.reporters.length >= MAX_REPORTERS_PER_TARGET) return { ok: true, changed: false, reports };
  if (!takeReportSlot(nowMs)) return refuse('busy');
  const entry = {
    nameHash: nameHash,
    reasons: { ...(prev?.reasons || {}), [body.reason]: (prev?.reasons?.[body.reason] || 0) + 1 },
    reporters: [...(prev?.reporters || []), reporter],
    firstAt: prev?.firstAt || nowMs,
    lastAt: nowMs,
    status: prev?.status || 'open',
  };
  return { ok: true, changed: true, reports: { ...base, [target]: entry } };
}

/** Name shown on the board: blocklist hits (old KV rows included) and rows hidden by reports get the default name. */
async function shownName(p, reports) {
  if (p.isBot) return p.name;
  const entry = p.publicId ? reports[p.publicId] : null;
  const hide = (entry && isReportHidden(entry, await reportNameHash(p.name))) || isNameBlocked(p.name);
  return hide ? defaultNameFor(p.publicId || p.name) : p.name;
}

// The admin endpoint is 404 unless the Worker secret LEADERBOARD_ADMIN_KEY (16+ chars) is set; a wrong key is also 404.
async function isAdmin(request, env) {
  const secret = env && typeof env.LEADERBOARD_ADMIN_KEY === 'string' ? env.LEADERBOARD_ADMIN_KEY : '';
  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (secret.length < 16 || !given) return false;
  return (await sha256Hex(`mc-admin|${given}`)) === (await sha256Hex(`mc-admin|${secret}`));
}

async function readJsonBody(request) {
  try {
    const declaredBytes = Number(request.headers.get('content-length')) || 0;
    const text = declaredBytes <= MAX_BODY_CHARS * 3 ? await request.text() : '';
    const body = text.length <= MAX_BODY_CHARS ? JSON.parse(text) : null;
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

let fallbackWeekKey = '';
let fallbackRealPlayers = [];

// `readOk` is false when KV itself failed: the memory copy is fine to show, but writing it back would wipe the board.
async function loadRealPlayers(env, kvKey, weekKey) {
  if (fallbackWeekKey !== weekKey) {
    fallbackWeekKey = weekKey;
    fallbackRealPlayers = [];
  }
  if (env && env.MOB_CONTROL_LEADERBOARD) {
    try {
      const data = await env.MOB_CONTROL_LEADERBOARD.get(kvKey, 'json');
      if (Array.isArray(data)) {
        return { players: data, readOk: true };
      }
    } catch {
      // Fallback to memory if KV read fails
      return { players: [...fallbackRealPlayers], readOk: false };
    }
  }
  return { players: [...fallbackRealPlayers], readOk: true };
}

async function saveRealPlayers(env, kvKey, weekKey, players) {
  fallbackWeekKey = weekKey;
  fallbackRealPlayers = players;
  if (env && env.MOB_CONTROL_LEADERBOARD) {
    try {
      await env.MOB_CONTROL_LEADERBOARD.put(kvKey, JSON.stringify(players), {
        expirationTtl: 14 * 86400,
      });
    } catch {
      // KV write failed (e.g. its 1 write/s per key limit): report it so the client sends again
      return false;
    }
  }
  return true;
}

function ensurePlayTime(p) {
  if (typeof p.playTimeSeconds === 'number' && p.playTimeSeconds > 0) {
    return Math.round(p.playTimeSeconds);
  }
  return Math.max(60, Math.round((p.bestStage || 1) * 145 + (p.totalKills || 0) * 0.15));
}

// Real players always come first; practice bots only fill the remaining slots and are never ranked above a real player.
// Row fields are unchanged, so older clients (which re-sort on their own) keep working.
function fillWithBots(sortedReal, compare) {
  const selectedReal = sortedReal.slice(0, 10);
  const neededBots = Math.max(0, 10 - selectedReal.length);
  const bots = [...SEED_LEADERBOARD]
    .sort(compare)
    .slice(0, neededBots)
    .map((b) => ({ ...b, isBot: true }));
  return [...selectedReal, ...bots];
}

function buildTop10(realPlayers) {
  const sortedReal = [...realPlayers]
    .map((p) => ({ ...p, playTimeSeconds: ensurePlayTime(p), isBot: false }))
    .sort((a, b) => b.bestStage - a.bestStage || b.totalKills - a.totalKills);

  return fillWithBots(sortedReal, (a, b) => b.bestStage - a.bestStage || b.totalKills - a.totalKills);
}

function buildActiveTop10(realPlayers) {
  const sortedReal = [...realPlayers]
    .map((p) => ({ ...p, playTimeSeconds: ensurePlayTime(p), isBot: false }))
    .sort((a, b) => b.playTimeSeconds - a.playTimeSeconds || b.bestStage - a.bestStage);

  return fillWithBots(sortedReal, (a, b) => b.playTimeSeconds - a.playTimeSeconds || b.bestStage - a.bestStage);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Report a board name: POST { writeKey, publicId, reason }
    if (url.pathname === '/api/leaderboard/report') {
      if (request.method !== 'POST') return jsonResponse({ ok: false, reason: 'method' }, 405);
      const nowMs = Date.now();
      const { kvKey, weekKey } = getWeeklyCycleInfo(nowMs);
      const body = await readJsonBody(request);
      if (!body) return jsonResponse({ ok: false, reason: 'bad_request' }, 400);
      const loaded = await loadRealPlayers(env, kvKey, weekKey);
      const stored = await loadReports(env, nowMs);
      if (!loaded.readOk || !stored.readOk) return jsonResponse({ ok: false, reason: 'busy' });
      const result = await applyReport(stored.reports, loaded.players, body, nowMs);
      // Also write when expired entries were dropped on read, so they leave KV and not only the output
      if ((result.changed || stored.dropped > 0) && !(await saveReports(env, result.reports)) && result.changed) {
        return jsonResponse({ ok: false, reason: 'busy' });
      }
      return jsonResponse({ ok: result.ok, reason: result.reason });
    }

    // Admin: GET lists reports with the stored name; POST { publicId, action: 'hide' | 'clear' } settles one
    if (url.pathname === '/api/leaderboard/reports') {
      if (!(await isAdmin(request, env))) return new Response('Not Found', { status: 404, headers: { 'cache-control': 'no-store' } });
      const nowMs = Date.now();
      const { kvKey, weekKey } = getWeeklyCycleInfo(nowMs);
      const stored = await loadReports(env, nowMs);
      let reports = stored.reports;
      if (request.method === 'POST') {
        const body = await readJsonBody(request);
        const id = body && typeof body.publicId === 'string' ? body.publicId : '';
        const status = body?.action === 'hide' ? 'hidden' : body?.action === 'clear' ? 'cleared' : '';
        if (!stored.readOk || !reports[id] || !status) return jsonResponse({ ok: false }, 400);
        reports = { ...reports, [id]: { ...reports[id], status, lastAt: nowMs } };
        if (!(await saveReports(env, reports))) return jsonResponse({ ok: false, reason: 'busy' }, 503);
      }
      const { players } = await loadRealPlayers(env, kvKey, weekKey);
      const entries = [];
      for (const [publicId, e] of Object.entries(reports)) {
        const name = players.find((p) => p.publicId === publicId)?.name ?? null;
        // renamed: the reports were about an earlier name and no longer hide anything
        const renamed = name !== null && Boolean(e.nameHash) && e.nameHash !== (await reportNameHash(name));
        entries.push({ publicId, name, renamed, hidden: !renamed && isReportHidden(e), ...e });
      }
      entries.sort((a, b) => b.reporters.length - a.reporters.length || b.lastAt - a.lastAt);
      return jsonResponse({ threshold: REPORT_HIDE_THRESHOLD, keepDays: REPORT_KEEP_DAYS, entries });
    }

    // Edge API for Top 10 Weekly Leaderboard (Backed by Cloudflare KV, resets every Monday 00:00 UTC+8)
    if (url.pathname === '/api/leaderboard') {
      const nowMs = Date.now();
      const { weekKey, kvKey, nextResetAtMs, weekStartMs } = getWeeklyCycleInfo(nowMs);
      const loaded = await loadRealPlayers(env, kvKey, weekKey);
      let realPlayers = loaded.players;
      let submission = null;

      if (request.method === 'POST') {
        try {
          // Check the declared length first so an oversized body is never buffered (at most 3 UTF-8 bytes per char).
          const declaredBytes = Number(request.headers.get('content-length')) || 0;
          const text = declaredBytes <= MAX_BODY_CHARS * 3 ? await request.text() : '';
          const body = text.length <= MAX_BODY_CHARS ? JSON.parse(text) : null;
          if (body && typeof body === 'object') {
            if (!loaded.readOk) {
              submission = { accepted: false, reason: 'busy', changed: false, players: realPlayers };
            } else {
              submission = await applySubmission(realPlayers, body, nowMs, weekStartMs);
              realPlayers = submission.players;
              if (submission.changed && !(await saveRealPlayers(env, kvKey, weekKey, realPlayers))) {
                submission = { ...submission, accepted: false, reason: 'busy' };
              }
            }
          }
        } catch {
          // Ignore malformed JSON
        }
      }

      const { reports } = await loadReports(env, nowMs);
      const showAll = async (rows) => {
        const out = [];
        for (const p of rows) out.push(toPublicRow({ ...p, name: await shownName(p, reports) }));
        return out;
      };
      const top10 = await showAll(buildTop10(realPlayers));
      const activeTop10 = await showAll(buildActiveTop10(realPlayers));
      return new Response(
        JSON.stringify({
          weekKey,
          nextResetAtMs,
          top10,
          activeTop10,
          realPlayerCount: realPlayers.length,
          storage: env && env.MOB_CONTROL_LEADERBOARD ? 'kv' : 'memory',
          ...(submission
            ? { accepted: submission.accepted, reason: submission.reason, selfPublicId: submission.row?.publicId }
            : {}),
        }),
        {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          },
        }
      );
    }

    // 1. Try serving static assets directly or proxying from Baota origin (yinosites.com)
    if (env && env.ASSETS) {
      const assetResp = await env.ASSETS.fetch(request);
      if (assetResp.status !== 404) {
        return assetResp;
      }
    }

    let path = url.pathname;
    if (path === "/" || path === "") {
      path = "/previews/mob-control/index.html";
    } else if (!path.startsWith("/previews/mob-control/")) {
      path = "/previews/mob-control" + (path.startsWith("/") ? path : "/" + path);
    }
    const targetUrl = "https://yinosites.com" + path + url.search;
    return fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
    });
  },
};
