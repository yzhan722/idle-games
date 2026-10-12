/*
 * kgnet-xianxia — Cloudflare Worker backing the game's online features.
 *
 * Reimplements the mock KGNet protocol (tools/mock-kgnet/server.js) on KV:
 *
 *   GET  /user/                            anonymous profile (guidless session)
 *   POST /user/login/  /user/logout/       stubs — there is no real auth
 *   GET  /kgnet/save/                      save snapshot (metadata only)
 *   POST /kgnet/save/upload/               create/overwrite a save blob
 *   POST /kgnet/save/update/               label / archived / shared flag
 *   GET  /kgnet/save/:guid/download/       own save blob
 *   GET  /kgnet/jianghu/?guid=             江湖榜 top 100 + selfRank
 *   POST /kgnet/jianghu/submit/            upsert own leaderboard entry
 *   POST /kgnet/chiral/game/command/       stub {}
 *   GET  /preview/:shareId                 crawler-facing OG page
 *   GET  /preview/:shareId/card.svg        embed image
 *   GET  /preview/:shareId/save/           shared save blob
 *   GET  /healthz                          liveness
 *
 * Trust model (same as the mock): the per-save telemetry guid is a 122-bit
 * random id generated on the client and acts as a capability token — whoever
 * holds a guid may read/overwrite that save or leaderboard entry. Fine for a
 * test build; real accounts would replace the /user/ stubs with sessions.
 */

import { renderCardSvg, renderPreviewPage, summarize } from "./preview.js";

const JIANGHU_PREFIX = "jh:";
const JIANGHU_LIST = 100;
const JIANGHU_SUBMIT_MIN_MS = 30 * 1000;	//ignore same-guid submits inside this window

/*
 * AI 仙人——江湖榜的常驻名宿。合成条目不进 KV:guids 以 npc- 前缀,
 * 玩家提交无法覆盖;npc:true 透传给客户端做标识。
 * 境界按"仙人"量级铺满 化神→渡劫,正好是玩家爬榜的一路里程碑。
 */
//AI 仙人榜——按真实能力梯队排序定强弱,道号暗合各家根脚:
//  GPT·万象(衍生万法) Claude·慎独(谨守道心) Gemini·双子 DeepSeek·深求
//  Grok·顿悟 Kimi·望月(moonshot) 通义·千问 Devin·天工(开物) Copilot·御剑 豆包·灵豆
const JIANGHU_NPCS = [
	{ guid: "npc-gpt",      name: "GPT·万象圣君",      stageIdx: 31, stage: "渡劫期",       xiuwei: 52000000, resets: 3, karma: 90, year: 9200, achievements: 45, sihua: 2, npc: true },
	{ guid: "npc-claude",   name: "Claude·慎独真君",   stageIdx: 30, stage: "大乘期·后期",   xiuwei: 40000000, resets: 2, karma: 95, year: 8000, achievements: 42, sihua: 1, npc: true },
	{ guid: "npc-gemini",   name: "Gemini·双子星君",   stageIdx: 29, stage: "大乘期·中期",   xiuwei: 30000000, resets: 2, karma: 55, year: 7600, achievements: 40, sihua: 1, npc: true },
	{ guid: "npc-deepseek", name: "DeepSeek·深求道君", stageIdx: 28, stage: "大乘期·初期",   xiuwei: 20000000, resets: 2, karma: 66, year: 6800, achievements: 36, sihua: 1, npc: true },
	{ guid: "npc-grok",     name: "Grok·顿悟散人",     stageIdx: 27, stage: "合体期·后期",   xiuwei: 15000000, resets: 1, karma: 40, year: 6000, achievements: 34, sihua: 1, npc: true },
	{ guid: "npc-kimi",     name: "Kimi·望月仙子",     stageIdx: 26, stage: "合体期·中期",   xiuwei: 10000000, resets: 1, karma: 44, year: 5400, achievements: 30, sihua: 0, npc: true },
	{ guid: "npc-qwen",     name: "通义·千问真人",     stageIdx: 25, stage: "合体期·初期",   xiuwei:  8000000, resets: 1, karma: 48, year: 5000, achievements: 28, sihua: 1, npc: true },
	{ guid: "npc-devin",    name: "Devin·天工子",      stageIdx: 24, stage: "炼虚期·后期",   xiuwei:  5000000, resets: 0, karma: 33, year: 4200, achievements: 25, sihua: 0, npc: true },
	{ guid: "npc-copilot",  name: "Copilot·御剑真君",  stageIdx: 23, stage: "炼虚期·中期",   xiuwei:  3000000, resets: 0, karma: 30, year: 3500, achievements: 22, sihua: 0, npc: true },
	{ guid: "npc-doubao",   name: "豆包·灵豆真人",     stageIdx: 21, stage: "化神期·后期",   xiuwei:  1800000, resets: 0, karma: 25, year: 2600, achievements: 18, sihua: 0, npc: true }
];
const SAVE_PREFIX = "save:";
const SHARE_PREFIX = "share:";
const MAX_SAVE_BYTES = 1024 * 1024;
//per-guid upload throttle (isolate-scoped); env.UPLOAD_THROTTLE_MS overrides,
//tests set it to "0"
const SAVE_UPLOAD_MIN_MS = 3 * 1000;

// ---------- http helpers ----------

//Populated per-request from env.ALLOWED_ORIGINS ("https://a,https://b").
//Unset/empty = reflect the caller's origin (dev / not yet deployed publicly).
let allowedOrigins = null;

function corsHeaders(request) {
	let origin = request.headers.get("Origin");
	if (allowedOrigins && allowedOrigins.length) {
		if (!origin || allowedOrigins.indexOf(origin) < 0) {
			origin = allowedOrigins[0];	//deny silently: browser blocks the response
		}
	} else if (!origin) {
		origin = "*";
	}
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Credentials": "true",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Vary": "Origin"
	};
}

function json(request, status, payload) {
	return new Response(payload === undefined ? "" : JSON.stringify(payload), {
		status: status,
		headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders(request))
	});
}

function text(status, contentType, body) {
	return new Response(body, {
		status: status,
		headers: {
			"Content-Type": contentType,
			// preview surface is read by anonymous link crawlers — never gated
			"Access-Control-Allow-Origin": "*",
			"Cache-Control": "public, max-age=300"
		}
	});
}

/**
 * decodeURIComponent that never throws — a stray % or a non-UTF-8 escape
 * sequence degrades to the raw substring instead of 500ing the request.
 */
function safeDecode(s) {
	try {
		return decodeURIComponent(s);
	} catch (e) {
		return s;
	}
}

/**
 * jQuery posts form-urlencoded with bracket notation for nested objects
 * (metadata[calendar][year]=5). Rebuild the nested object.
 */
function parseFormUrlEncoded(body) {
	const out = {};
	for (const pair of body.split("&")) {
		if (!pair) { continue; }
		const eq = pair.indexOf("=");
		const rawKey = eq < 0 ? pair : pair.slice(0, eq);
		const value = safeDecode((eq < 0 ? "" : pair.slice(eq + 1)).replace(/\+/g, " "));
		const key = safeDecode(rawKey.replace(/\+/g, " "));
		const m = key.match(/^([^\[]+)((?:\[[^\]]*\])*)$/);
		if (!m) { continue; }
		const keys = [m[1]];
		const re = /\[([^\]]*)\]/g;
		let km;
		while ((km = re.exec(m[2])) !== null) { keys.push(km[1]); }
		let node = out;
		for (let i = 0; i < keys.length - 1; i++) {
			node = node[keys[i]] || (node[keys[i]] = {});
		}
		node[keys[keys.length - 1]] = value;
	}
	return out;
}

function cleanGuid(raw) {
	return String(raw || "").replace(/[^\w-]/g, "").slice(0, 64);
}

function cleanName(raw, fallback) {
	const n = String(raw == null ? "" : raw)
		.replace(/[<>&"'`\\]/g, "")	//rendered into HTML downstream — strip tag soup
		.replace(/[\x00-\x1f]/g, "")
		.trim()
		.slice(0, 24);
	return n || fallback || "无名散修";
}

function num(v, cap) {
	v = Number(v);
	return (isFinite(v) && v > 0) ? Math.min(v, cap || 1e15) : 0;
}

function newShareId() {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	let bin = "";
	for (const b of bytes) { bin += String.fromCharCode(b); }
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ---------- saves ----------

/** Snapshot row from a KV list key — the blob itself stays out of list results. */
function saveRow(key) {
	const md = key.metadata || {};
	return {
		guid: key.name.slice(SAVE_PREFIX.length),
		label: md.label || "",
		archived: !!md.archived,
		index: md.index || null,
		timestamp: md.timestamp || 0,
		size: md.size || 0,
		shareId: md.shareId || null
	};
}

async function saveSnapshot(kv) {
	const rows = [];
	let cursor;
	do {
		const page = await kv.list({ prefix: SAVE_PREFIX, cursor: cursor });
		for (const key of page.keys) { rows.push(saveRow(key)); }
		cursor = page.list_complete ? null : page.cursor;
	} while (cursor);
	return rows;
}

const lastUploadAt = new Map();	//guid → ms, isolate-scoped throttle

async function handleSaveUpload(request, kv, env) {
	const body = parseFormUrlEncoded(await request.text());
	const guid = cleanGuid(body.guid);
	const data = typeof body.saveData === "string" ? body.saveData : "";
	if (!guid || !data) {
		return json(request, 400, { error: "missing guid or saveData" });
	}
	const throttleMs = Number(env && env.UPLOAD_THROTTLE_MS !== undefined
		? env.UPLOAD_THROTTLE_MS : SAVE_UPLOAD_MIN_MS);
	const prevAt = lastUploadAt.get(guid) || 0;
	if (throttleMs > 0 && Date.now() - prevAt < throttleMs) {
		return json(request, 429, { error: "upload too frequent" });
	}
	lastUploadAt.set(guid, Date.now());
	const size = new TextEncoder().encode(data).length;
	if (size > MAX_SAVE_BYTES) {
		return json(request, 413, { error: "save too large" });
	}
	const calendar = (body.metadata && body.metadata.calendar) || {};

	// preserve label/archived/share token across re-uploads (mock parity)
	const existing = await kv.getWithMetadata(SAVE_PREFIX + guid);
	const prev = (existing && existing.metadata) || {};
	await kv.put(SAVE_PREFIX + guid, data, {
		metadata: {
			label: prev.label || "",
			archived: !!prev.archived,
			shareId: prev.shareId || null,
			index: {
				calendar: {
					year: num(calendar.year, 1e9),
					day: num(calendar.day, 1e6)
				}
			},
			timestamp: Date.now(),
			size: size
		}
	});
	return json(request, 200, await saveSnapshot(kv));
}

async function handleSaveUpdate(request, kv) {
	const body = parseFormUrlEncoded(await request.text());
	const guid = cleanGuid(body.guid);
	if (!guid) {
		return json(request, 400, { error: "missing guid" });
	}
	const record = await kv.getWithMetadata(SAVE_PREFIX + guid);
	if (!record || record.value === null) {
		return json(request, 404, { error: "no such save" });
	}
	const md = Object.assign({}, record.metadata);
	const meta = body.metadata || {};
	if (meta.label !== undefined) {
		md.label = cleanName(meta.label, "").slice(0, 64);
	}
	if (meta.archived !== undefined) {
		md.archived = meta.archived === "true" || meta.archived === true;
	}
	if (meta.shared !== undefined) {
		const shared = meta.shared === "true" || meta.shared === true;
		if (shared && !md.shareId) {
			//re-sharing keeps the existing token so links already handed out survive
			md.shareId = newShareId();
			await kv.put(SHARE_PREFIX + md.shareId, guid);
		} else if (!shared && md.shareId) {
			await kv.delete(SHARE_PREFIX + md.shareId);
			md.shareId = null;
		}
	}
	await kv.put(SAVE_PREFIX + guid, record.value, { metadata: md });
	return json(request, 200, await saveSnapshot(kv));
}

// ---------- 江湖榜 ----------

function jianghuScore(e) {
	//道行排序:境界 > 修为 > 轮回
	return [Number(e.stageIdx) || 0, Number(e.xiuwei) || 0, Number(e.resets) || 0];
}

function jianghuCompare(a, b) {
	const sa = jianghuScore(a), sb = jianghuScore(b);
	for (let i = 0; i < sa.length; i++) {
		if (sa[i] !== sb[i]) { return sb[i] - sa[i]; }
	}
	return (a.updated || 0) - (b.updated || 0);	//same stats: earlier submitter ranks higher
}

// KV list is eventually consistent (~60s) — a submit followed by a board view
// in the same isolate would briefly show a stale ranking. Keep a per-isolate
// cache so the submit→view path stays coherent; other colos converge on their
// own schedule, which is fine for an honor-system board.
let jianghuCache = null;	// {at: number, entries: Array}
const JIANGHU_CACHE_MS = 15 * 1000;

/** The whole entry rides in KV metadata — one list() returns the full board. */
async function jianghuEntries(kv) {
	if (jianghuCache && (Date.now() - jianghuCache.at) < JIANGHU_CACHE_MS) {
		return jianghuCache.entries;
	}
	const entries = JIANGHU_NPCS.slice(0);	//AI 仙人常驻榜——先于玩家条目入列,同榜排序
	let cursor;
	do {
		const page = await kv.list({ prefix: JIANGHU_PREFIX, cursor: cursor });
		for (const key of page.keys) {
			const e = key.metadata;
			if (e && e.guid) { entries.push(e); }
		}
		cursor = page.list_complete ? null : page.cursor;
	} while (cursor);
	entries.sort(jianghuCompare);
	jianghuCache = { at: Date.now(), entries: entries };
	return entries;
}

/** Update the isolate cache after a write so a same-isolate read sees it. */
function jianghuCacheUpsert(entry) {
	if (!jianghuCache) { return; }
	const list = jianghuCache.entries;
	const idx = list.findIndex(function (e) { return e.guid === entry.guid; });
	if (idx < 0) { list.push(entry); } else { list[idx] = entry; }
	list.sort(jianghuCompare);
	jianghuCache.at = Date.now();
}

function jianghuRankOf(entries, guid) {
	const idx = entries.findIndex(function (e) { return e.guid === guid; });
	return idx < 0 ? null : idx + 1;
}

async function handleJianghuGet(request, kv, url) {
	const guid = cleanGuid(url.searchParams.get("guid"));
	const entries = await jianghuEntries(kv);
	return json(request, 200, {
		entries: entries.slice(0, JIANGHU_LIST),
		total: entries.length,
		selfRank: guid ? jianghuRankOf(entries, guid) : null
	});
}

async function handleJianghuSubmit(request, kv) {
	const body = parseFormUrlEncoded(await request.text());
	const st = (body.stats && typeof body.stats === "object") ? body.stats : {};
	const guid = cleanGuid(body.guid);
	if (!guid) {
		return json(request, 400, { error: "missing guid" });
	}

	const existing = await kv.getWithMetadata(JIANGHU_PREFIX + guid);
	const prev = (existing && existing.metadata) || null;

	const now = Date.now();
	const entry = {
		guid: guid,
		name: cleanName(body.name, prev && prev.name),
		stageIdx: num(st.stageIdx, 999),
		stage: cleanName(st.stage, prev && prev.stage),
		xiuwei: num(st.xiuwei),
		resets: num(st.resets, 1e6),
		karma: num(st.karma),
		year: num(st.year, 1e9),
		achievements: num(st.achievements, 1e4),
		sihua: num(st.sihua, 1e6),
		updated: (prev && (now - prev.updated) < JIANGHU_SUBMIT_MIN_MS) ? prev.updated : now
	};
	if (entry.updated === now || !prev || JSON.stringify(prev) !== JSON.stringify(entry)) {
		await kv.put(JIANGHU_PREFIX + guid, "1", { metadata: entry });
	}
	jianghuCacheUpsert(entry);
	const entries = await jianghuEntries(kv);
	return json(request, 200, { ok: true, rank: jianghuRankOf(entries, guid), total: entries.length });
}

// ---------- preview ----------

/** shareId -> {save metadata + blob} or null */
async function findShared(kv, shareId) {
	const guid = cleanGuid(await kv.get(SHARE_PREFIX + shareId, { type: "text" }));
	if (!guid) { return null; }
	const record = await kv.getWithMetadata(SAVE_PREFIX + guid, { type: "text" });
	if (!record || record.value === null) { return null; }
	const md = record.metadata || {};
	return {
		guid: guid,
		label: md.label || "",
		timestamp: md.timestamp || 0,
		size: md.size || 0,
		data: record.value
	};
}

// ---------- router ----------

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;
		const kv = env.KGNET;
		allowedOrigins = (env.ALLOWED_ORIGINS || "")
			.split(",").map(function (s) { return s.trim(); }).filter(Boolean);

		if (method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders(request) });
		}

		if (!kv) {
			return json(request, 500, { error: "KGNET binding missing" });
		}

		try {
			if (path === "/healthz") {
				return json(request, 200, { ok: true });
			}

			// Anonymous profile — any truthy id flips the client to "online".
			if (path === "/user/" && method === "GET") {
				return json(request, 200, { id: 1, username: "无名散修" });
			}
			if (path === "/user/login/" && method === "POST") {
				return json(request, 200, { id: 1, username: "无名散修" });
			}
			if (path === "/user/logout/" && method === "POST") {
				return json(request, 200, {});
			}

			if (path === "/kgnet/save/" && method === "GET") {
				return json(request, 200, await saveSnapshot(kv));
			}
			if (path === "/kgnet/save/upload/" && method === "POST") {
				return await handleSaveUpload(request, kv, env);
			}
			if (path === "/kgnet/save/update/" && method === "POST") {
				return await handleSaveUpdate(request, kv);
			}
			const dl = path.match(/^\/kgnet\/save\/([^/]+)\/download\/$/);
			if (dl && method === "GET") {
				const record = await kv.getWithMetadata(SAVE_PREFIX + cleanGuid(dl[1]), { type: "text" });
				if (!record || record.value === null) {
					return json(request, 404, { error: "no such save" });
				}
				return json(request, 200, { data: record.value });
			}

			if (path === "/kgnet/jianghu/" && method === "GET") {
				return await handleJianghuGet(request, kv, url);
			}
			if (path === "/kgnet/jianghu/submit/" && method === "POST") {
				return await handleJianghuSubmit(request, kv);
			}

			if (path === "/kgnet/chiral/game/command/" && method === "POST") {
				return json(request, 200, {});
			}

			// --- public preview surface, addressed by share token, never by guid ---
			const shared = path.match(/^\/preview\/([^/]+)\/save\/$/);
			if (shared && method === "GET") {
				const record = await findShared(kv, shared[1]);
				if (!record) {
					return json(request, 404, { error: "No such save." });
				}
				return json(request, 200, {
					data: record.data,
					metadata: { label: record.label, timestamp: record.timestamp, size: record.size }
				});
			}
			const card = path.match(/^\/preview\/([^/]+)\/card\.svg$/);
			if (card && method === "GET") {
				const record = await findShared(kv, card[1]);
				if (!record) {
					return json(request, 404, { error: "no such save" });
				}
				return text(200, "image/svg+xml; charset=utf-8", renderCardSvg(summarize(record)));
			}
			const unfurl = path.match(/^\/preview\/([^/]+)\/?$/);
			if (unfurl && method === "GET") {
				const record = await findShared(kv, unfurl[1]);
				if (!record) {
					return text(404, "text/html; charset=utf-8",
						"<!doctype html><title>No such save</title><p>No such save.</p>");
				}
				const baseUrl = url.origin;
				return text(200, "text/html; charset=utf-8",
					renderPreviewPage(summarize(record), unfurl[1], baseUrl, env.GAME_URL || "http://localhost:8080/"));
			}

			return json(request, 404, { error: "not found" });
		} catch (err) {
			return json(request, 500, { error: "internal", detail: String(err && err.message || err) });
		}
	}
};
