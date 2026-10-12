#!/usr/bin/env node
/*
 * Minimal mock KGNet backend for the "online" menu (cloud saves).
 *
 * The game's classes.game.Server (game.js) points at http://localhost:7780
 * whenever it runs on localhost, so just start this and reload the game.
 *
 * Zero dependencies — Node's built-in http only.
 *
 *   node tools/mock-kgnet/server.js
 *
 * Saves are kept in memory only and are lost when the server stops.
 *
 * Also serves the read-only preview surface, mirroring the real backend
 * (nunicorn: server/preview.ts):
 *   GET /preview/<shareId>            crawler-facing page with Open Graph tags
 *   GET /preview/<shareId>/card.svg   the embed image (production serves PNG)
 *   GET /preview/<shareId>/save/      the save blob, session-less
 */

const http = require("http");
const preview = require("./preview.js");

const PORT = process.env.PORT || 7780;
// where a human should be sent to actually view the save (the game's own origin)
const GAME_URL = process.env.GAME_URL || "http://localhost:8080/";

// --- in-memory "database" ---------------------------------------------------

/** @type {Array<{guid:string,label:string,archived:boolean,index:object,timestamp:number,size:number,data:string,shareId:string}>} */
const saves = [];

// --- 江湖榜 leaderboard ------------------------------------------------------
// File-backed so rankings survive restarts. Entry shape:
//   {guid, name, stageIdx, stage, xiuwei, resets, karma, year, achievements, sihua, updated}
const fs = require("fs");
const JIANGHU_FILE = require("path").join(__dirname, "jianghu.json");
const JIANGHU_MAX = 500;
const JIANGHU_LIST = 100;

let jianghu = [];
try {
	jianghu = JSON.parse(fs.readFileSync(JIANGHU_FILE, "utf8"));
	if (!Array.isArray(jianghu)) { jianghu = []; }
} catch (e) {
	jianghu = [];
}

let jianghuTimer = null;
function saveJianghu() {
	if (jianghuTimer) { return; }
	jianghuTimer = setTimeout(function () {
		jianghuTimer = null;
		try { fs.writeFileSync(JIANGHU_FILE, JSON.stringify(jianghu, null, "\t")); }
		catch (e) { console.log("jianghu save failed:", e.message); }
	}, 500);
}

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
function jianghuRankOf(guid) {
	const idx = jianghu.findIndex(function (e) { return e.guid === guid; });
	return idx < 0 ? null : idx + 1;
}
function jianghuName(raw, fallback) {
	let n = String(raw == null ? "" : raw)
		.replace(/[<>&"'`\\]/g, "")	//rendered into HTML downstream — strip tag soup
		.replace(/[\x00-\x1f]/g, "")
		.trim()
		.slice(0, 24);
	return n || fallback || "无名散修";
}

// Failure injection: when non-zero, every /user/ and /kgnet/ endpoint returns
// this HTTP status instead of its normal response. Toggle at runtime:
//   curl -X POST localhost:7780/mock/fail/403   # simulate an expired session
//   curl -X POST localhost:7780/mock/ok         # back to normal
let forcedStatus = 0;
// Share tokens are what a preview link carries: a save guid is only unique within
// one account, so it cannot address a save server-wide. See nunicorn saves.ts.
function newShareId() {
	return require("crypto").randomBytes(16).toString("base64")
		.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Saves are returned to the client without the (potentially huge) save blob.
function snapshot() {
	return saves.map(function (s) {
		return {
			guid: s.guid,
			label: s.label,
			archived: s.archived,
			index: s.index,
			timestamp: s.timestamp,
			size: s.size,
			shareId: s.shareId
		};
	});
}

// --- request body parsing ---------------------------------------------------

// jQuery serializes POST data as application/x-www-form-urlencoded using
// bracket notation for nested objects, e.g. metadata[calendar][year]=5.
// Rebuild that into a plain nested object.
function parseFormUrlEncoded(body) {
	const out = {};
	const params = new URLSearchParams(body);
	for (const [rawKey, value] of params) {
		const match = rawKey.match(/^([^\[]+)(.*)$/);
		const head = match[1];
		const rest = match[2]; // e.g. "[calendar][year]"
		const keys = [head];
		const re = /\[([^\]]*)\]/g;
		let m;
		while ((m = re.exec(rest)) !== null) {
			keys.push(m[1]);
		}
		let node = out;
		for (let i = 0; i < keys.length - 1; i++) {
			node[keys[i]] = node[keys[i]] || {};
			node = node[keys[i]];
		}
		node[keys[keys.length - 1]] = value;
	}
	return out;
}

function readBody(req) {
	return new Promise(function (resolve) {
		let chunks = "";
		req.on("data", function (c) { chunks += c; });
		req.on("end", function () { resolve(chunks); });
	});
}

// --- responses --------------------------------------------------------------

function send(req, res, status, payload) {
	const origin = req.headers.origin || "*";
	res.writeHead(status, {
		"Content-Type": "application/json",
		// withCredentials:true forbids a wildcard origin, so reflect it.
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Credentials": "true",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type"
	});
	res.end(payload === undefined ? "" : JSON.stringify(payload));
}

function sendText(req, res, status, contentType, body) {
	res.writeHead(status, {
		"Content-Type": contentType,
		// unfurl crawlers are anonymous by definition - never gate these on a session
		"Access-Control-Allow-Origin": "*",
		"Cache-Control": "public, max-age=300"
	});
	res.end(body);
}

// --- routing ----------------------------------------------------------------

const server = http.createServer(async function (req, res) {
	const url = req.url.split("?")[0];
	const method = req.method;
	console.log(method, url);

	if (method === "OPTIONS") {
		return send(req, res, 204);
	}

	// Failure-injection control endpoints (never affected by forcedStatus).
	const fail = url.match(/^\/mock\/fail\/(\d{3})$/);
	if (fail) {
		forcedStatus = Number(fail[1]);
		console.log("  -> forcing status", forcedStatus, "on all game endpoints");
		return send(req, res, 200, { forcedStatus: forcedStatus });
	}
	if (url === "/mock/ok") {
		forcedStatus = 0;
		console.log("  -> back to normal responses");
		return send(req, res, 200, { forcedStatus: forcedStatus });
	}

	if (forcedStatus) {
		return send(req, res, forcedStatus, { error: "forced by /mock/fail/" + forcedStatus });
	}

	// Active session — any truthy id makes the client treat the user as logged in.
	if (url === "/user/" && method === "GET") {
		return send(req, res, 200, { id: 1, username: "mockkitten" });
	}

	// Login/logout — accepts any credentials.
	if (url === "/user/login/" && method === "POST") {
		await readBody(req);
		return send(req, res, 200, { id: 1, username: "mockkitten" });
	}
	if (url === "/user/logout/" && method === "POST") {
		await readBody(req);
		return send(req, res, 200, {});
	}

	// List cloud saves.
	if (url === "/kgnet/save/" && method === "GET") {
		return send(req, res, 200, snapshot());
	}

	// Upload (create or overwrite) a save.
	if (url === "/kgnet/save/upload/" && method === "POST") {
		const body = parseFormUrlEncoded(await readBody(req));
		const calendar = (body.metadata && body.metadata.calendar) || {};
		const existing = saves.find(function (s) { return s.guid === body.guid; });
		const record = existing || { guid: body.guid, label: "", archived: false, shareId: null };
		record.data = body.saveData || "";
		record.size = Buffer.byteLength(record.data, "utf8");
		record.timestamp = Date.now();
		record.index = {
			calendar: {
				year: Number(calendar.year) || 0,
				day: Number(calendar.day) || 0
			}
		};
		if (!existing) {
			saves.push(record);
		}
		return send(req, res, 200, snapshot());
	}

	// Update save metadata (label / archived).
	if (url === "/kgnet/save/update/" && method === "POST") {
		const body = parseFormUrlEncoded(await readBody(req));
		const record = saves.find(function (s) { return s.guid === body.guid; });
		if (record && body.metadata) {
			if (body.metadata.label !== undefined) {
				record.label = body.metadata.label;
			}
			if (body.metadata.archived !== undefined) {
				record.archived = body.metadata.archived === "true" || body.metadata.archived === true;
			}
			if (body.metadata.shared !== undefined) {
				const shared = body.metadata.shared === "true" || body.metadata.shared === true;
				//re-sharing keeps the existing token so links already handed out survive
				record.shareId = shared ? (record.shareId || newShareId()) : null;
			}
		}
		return send(req, res, 200, snapshot());
	}

	// Download one of your own saves.
	const dl = url.match(/^\/kgnet\/save\/([^/]+)\/download\/$/);
	if (dl && method === "GET") {
		const record = saves.find(function (s) { return s.guid === dl[1]; });
		if (!record) {
			return send(req, res, 404, { error: "no such save" });
		}
		return send(req, res, 200, { data: record.data });
	}

	// --- public preview surface, addressed by share token, never by guid ---

	function findShared(shareId) {
		return saves.find(function (s) { return s.shareId && s.shareId === shareId; });
	}

	// The shared blob, for the game's read-only preview mode.
	const shared = url.match(/^\/preview\/([^/]+)\/save\/$/);
	if (shared && method === "GET") {
		const record = findShared(shared[1]);
		if (!record) {
			return send(req, res, 404, { error: "No such save." });
		}
		// metadata rides along so the preview banner can be labelled without a second call
		return send(req, res, 200, {
			data: record.data,
			metadata: {
				label: record.label,
				timestamp: record.timestamp,
				size: record.size
			}
		});
	}

	// The embed image. SVG here; production rasterizes to PNG (nunicorn server/card.ts).
	const card = url.match(/^\/preview\/([^/]+)\/card\.svg$/);
	if (card && method === "GET") {
		const record = findShared(card[1]);
		if (!record) {
			return send(req, res, 404, { error: "no such save" });
		}
		return sendText(req, res, 200, "image/svg+xml; charset=utf-8",
			preview.renderCardSvg(preview.summarize(record)));
	}

	// Crawler-facing page. Discord et al. GET this, read the OG tags, and stop;
	// a real browser follows the meta refresh into the game's preview mode.
	const unfurl = url.match(/^\/preview\/([^/]+)\/?$/);
	if (unfurl && method === "GET") {
		const record = findShared(unfurl[1]);
		if (!record) {
			return sendText(req, res, 404, "text/html; charset=utf-8",
				"<!doctype html><title>No such save</title><p>No such save.</p>");
		}
		const baseUrl = "http://" + (req.headers.host || ("localhost:" + PORT));
		return sendText(req, res, 200, "text/html; charset=utf-8",
			preview.renderPreviewPage(preview.summarize(record), unfurl[1], baseUrl, GAME_URL));
	}

	// --- 江湖榜 leaderboard ---
	// GET /kgnet/jianghu/?guid=<g>      -> {entries: [top 100], total, selfRank}
	// POST /kgnet/jianghu/submit/     -> {ok, rank, total}
	if (url === "/kgnet/jianghu/" && method === "GET") {
		const guid = new URLSearchParams(req.url.split("?")[1] || "").get("guid") || "";
		return send(req, res, 200, {
			entries: jianghu.slice(0, JIANGHU_LIST),
			total: jianghu.length,
			selfRank: guid ? jianghuRankOf(guid) : null
		});
	}
	if (url === "/kgnet/jianghu/submit/" && method === "POST") {
		const body = parseFormUrlEncoded(await readBody(req));
		const st = (body.stats && typeof body.stats == "object") ? body.stats : {};
		const guid = String(body.guid || "").replace(/[^\w-]/g, "").slice(0, 64);
		if (!guid) {
			return send(req, res, 400, { error: "missing guid" });
		}
		const existing = jianghu.find(function (e) { return e.guid === guid; });
		const num = function (v, cap) { v = Number(v); return (isFinite(v) && v > 0) ? Math.min(v, cap || 1e15) : 0; };
		const entry = existing || { guid: guid, name: "" };
		entry.name = jianghuName(body.name, entry.name);
		entry.stageIdx = num(st.stageIdx, 999);
		entry.stage = jianghuName(st.stage, entry.stage);
		entry.xiuwei = num(st.xiuwei);
		entry.resets = num(st.resets, 1e6);
		entry.karma = num(st.karma);
		entry.year = num(st.year, 1e9);
		entry.achievements = num(st.achievements, 1e4);
		entry.sihua = num(st.sihua, 1e6);
		entry.updated = Date.now();
		if (!existing) { jianghu.push(entry); }
		jianghu.sort(jianghuCompare);
		if (jianghu.length > JIANGHU_MAX) { jianghu.length = JIANGHU_MAX; }
		saveJianghu();
		return send(req, res, 200, { ok: true, rank: jianghuRankOf(guid), total: jianghu.length });
	}

	// Chiral command channel — stubbed so the call doesn't error.
	if (url === "/kgnet/chiral/game/command/" && method === "POST") {
		await readBody(req);
		return send(req, res, 200, {});
	}

	return send(req, res, 404, { error: "not found" });
});

server.listen(PORT, function () {
	console.log("mock KGNet backend listening on http://localhost:" + PORT);
	console.log("saves are in-memory only and reset on restart");
	console.log("previews:  http://localhost:" + PORT + "/preview/<shareId>   ->  " + GAME_URL + "?saveId=<shareId>");
});
