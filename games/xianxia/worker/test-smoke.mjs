/*
 * Worker smoke test — drives every route through a Map-backed fake KV.
 * Run: node worker/test-smoke.mjs
 */
import worker from "./src/index.js";
import LZString from "./src/lz-string.js";

class FakeKV {
	constructor() { this.store = new Map(); }
	async get(key, opts) {
		const e = this.store.get(key);
		return e ? e.value : null;
	}
	async getWithMetadata(key, opts) {
		const e = this.store.get(key);
		return e ? { value: e.value, metadata: e.metadata } : { value: null, metadata: null };
	}
	async put(key, value, opts) {
		this.store.set(key, { value: value, metadata: (opts && opts.metadata) || null });
	}
	async delete(key) { this.store.delete(key); }
	async list({ prefix }) {
		const keys = [...this.store.keys()]
			.filter(k => k.startsWith(prefix))
			.map(name => ({ name, metadata: this.store.get(name).metadata }));
		return { keys: keys, list_complete: true };
	}
}

const kv = new FakeKV();
const env = { KGNET: kv, GAME_URL: "http://localhost:8080/", UPLOAD_THROTTLE_MS: "0" };
const base = "https://test.kgnet";

let pass = 0, fail = 0;
function check(name, cond, extra) {
	if (cond) { pass++; console.log("  PASS", name); }
	else { fail++; console.log("  FAIL", name, extra || ""); }
}
async function call(path, opts = {}) {
	const req = new Request(base + path, Object.assign({
		headers: { "Origin": "https://game.example", "Content-Type": "application/x-www-form-urlencoded" }
	}, opts));
	return worker.fetch(req, env, {});
}
const form = o => Object.entries(o).map(([k, v]) =>
	typeof v === "object" && v !== null
		? Object.entries(v).map(([k2, v2]) =>
			typeof v2 === "object" && v2 !== null
				? Object.entries(v2).map(([k3, v3]) => `${k}[${k2}][${k3}]=${encodeURIComponent(v3)}`).join("&")
				: `${k}[${k2}]=${encodeURIComponent(v2)}`).join("&")
		: `${k}=${encodeURIComponent(v)}`
).join("&");

// ---- basics ----
console.log("basics:");
let r = await call("/healthz");
check("healthz", r.status === 200 && (await r.json()).ok);
r = await call("/user/");
check("/user/ online", r.status === 200 && (await r.json()).id);
r = await call("/nope");
check("404 unknown", r.status === 404);
r = await call("/user/", { method: "OPTIONS" });
check("OPTIONS 204 + cors", r.status === 204 && r.headers.get("access-control-allow-origin") === "https://game.example");

// ---- save flow ----
console.log("saves:");
const saveObj = {
	calendar: { year: 42, day: 210 },
	resources: [{ name: "xiuwei", value: 12345 }, { name: "karma", value: 77 }],
	stats: [{ name: "totalResets", val: 3 }],
	cultivation: { stages: [{ name: "lianqi_10", researched: true }, { name: "zhuji_2", researched: true }] }
};
const blob = LZString.compressToBase64(JSON.stringify(saveObj));
const guid = "test-guid-aaaa";

r = await call("/kgnet/save/upload/", { method: "POST", body: form({ guid: guid, saveData: blob, metadata: { calendar: { year: 42, day: 210 } } }) });
let snapshot = await r.json();
check("upload -> snapshot", r.status === 200 && snapshot.length === 1 && snapshot[0].guid === guid && snapshot[0].index.calendar.year === 42, JSON.stringify(snapshot));

r = await call("/kgnet/save/");
check("list 1", (await r.json()).length === 1);

r = await call("/kgnet/save/update/", { method: "POST", body: form({ guid: guid, metadata: { label: "测试天尊", shared: "true" } }) });
snapshot = await r.json();
check("label+share", snapshot[0].label === "测试天尊" && snapshot[0].shareId, JSON.stringify(snapshot));
const shareId = snapshot[0].shareId;

r = await call(`/kgnet/save/${guid}/download/`);
check("download roundtrip", (await r.json()).data === blob);

// preview surface
r = await call(`/preview/${shareId}/save/`);
const pv = await r.json();
check("preview save", pv.data === blob && pv.metadata.label === "测试天尊");
r = await call(`/preview/${shareId}/card.svg`);
const svg = await r.text();
check("card svg realm", svg.includes("筑基期·中期") && svg.includes("12345") && svg.includes("测试天尊"), svg.slice(0, 200));
r = await call(`/preview/${shareId}`);
const html = await r.text();
check("preview page og+redirect", html.includes("og:image") && html.includes("?saveId=" + shareId) && html.includes("凡人修仙传"));

// unshare
r = await call("/kgnet/save/update/", { method: "POST", body: form({ guid: guid, metadata: { shared: "false" } }) });
snapshot = await r.json();
check("unshare clears", snapshot[0].shareId === null);
r = await call(`/preview/${shareId}/save/`);
check("preview 404 after unshare", r.status === 404);

// upload throttle (real env, throttle on): second upload inside the window → 429
{
	const envReal = { KGNET: kv, GAME_URL: "http://localhost:8080/" };
	const up = (g) => worker.fetch(new Request("https://x.test/kgnet/save/upload/", {
		method: "POST", body: form({ guid: g, saveData: blob })
	}), envReal, {});
	r = await up("g-throttle");
	check("throttle first ok", r.status === 200);
	r = await up("g-throttle");
	check("throttle 429", r.status === 429, "status " + r.status);
}

// re-upload preserves label (share was cleared above; label survives)
r = await call("/kgnet/save/upload/", { method: "POST", body: form({ guid: guid, saveData: blob, metadata: { calendar: { year: 50, day: 1 } } }) });
snapshot = await r.json();
check("re-upload keeps label", snapshot[0].label === "测试天尊" && snapshot[0].index.calendar.year === 50);

// ---- jianghu ----
console.log("jianghu:");
const submit = (g, n, st) => call("/kgnet/jianghu/submit/", {
	method: "POST", body: form({ guid: g, name: n, stats: st })
});
r = await submit("g-han", "测试散人", { stageIdx: 12, stage: "元婴期·初期", xiuwei: 99999, resets: 2, karma: 50, year: 300, achievements: 30, sihua: 1 });
let j = await r.json();
check("submit ok", j.ok === true && j.rank === 1 && j.total === 1, JSON.stringify(j));
r = await submit("g-nangong", "凝霜仙子", { stageIdx: 15, stage: "合体期·后期", xiuwei: 5000, resets: 0 });
j = await r.json();
check("higher stage takes rank 1", j.rank === 1 && j.total === 2, JSON.stringify(j)); // nangong 15 > han 12
r = await submit("g-xuangu", "白骨真人", { stageIdx: 15, stage: "合体期·后期", xiuwei: 9000, resets: 0 });
r = await call("/kgnet/jianghu/?guid=g-han");
j = await r.json();
check("board sorted stageIdx>xiuwei", j.entries[0].guid === "g-xuangu" && j.entries[1].guid === "g-nangong" && j.selfRank === 3, JSON.stringify(j.entries.map(e => e.guid)));
check("total", j.total === 3);
check("name kept", j.entries[0].name === "白骨真人");

// upsert same guid updates, doesn't duplicate
r = await submit("g-han", "测试天尊", { stageIdx: 20, stage: "渡劫期", xiuwei: 1 });
j = await r.json();
check("upsert no dup", j.total === 3 && j.rank === 1, JSON.stringify(j));

// throttled re-submit keeps old updated timestamp but applies stat changes? — stat delta inside window: entry not rewritten
// (verify name sanitization instead)
r = await submit("g-evil", "<script>alert(1)</script>", { stageIdx: 1 });
r = await call("/kgnet/jianghu/");
j = await r.json();
check("name sanitized", j.entries[j.entries.length - 1].name === "scriptalert(1)/script", JSON.stringify(j.entries[j.entries.length-1].name));

// ---- chiral ----
r = await call("/kgnet/chiral/game/command/", { method: "POST", body: "command=x" });
check("chiral stub", r.status === 200);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
