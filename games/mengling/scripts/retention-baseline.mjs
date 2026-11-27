#!/usr/bin/env node
/**
 * Public-API retention snapshot. Does not require D1 credentials.
 * Usage: node scripts/retention-baseline.mjs [baseUrl]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const base = String(process.argv[2] || "https://game.pokeauto.online").replace(/\/$/, "");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "ops");
const outFile = join(outDir, "RETENTION_BASELINE.md");

async function getJson(path, opts = {}) {
  const r = await fetch(`${base}${path}`, opts);
  const text = await r.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: r.status, json };
}

const capturedAt = new Date().toISOString();
const health = await getJson("/api/health");
const dex = await getJson("/api/leaderboard/dex");
const power = await getJson("/api/leaderboard/power").catch(() => ({ status: 0, json: null }));
const ingest = await fetch(`${base}/api/ops/ingest`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    events: [{ event: "ops_probe", ts: Date.now() }],
  }),
});
let ingestJson = null;
try {
  ingestJson = await ingest.json();
} catch {
  ingestJson = null;
}

const dexItems = Array.isArray(dex.json?.items) ? dex.json.items : [];
const realDex = dexItems;
const md = `# Retention baseline

- Captured: ${capturedAt}
- Base: ${base}
- Health: status ${health.status}, version ${health.json?.version ?? "?"}
- Dex board rows (API, no client padding): ${dexItems.length}
- Dex rows that look real: ${realDex.length}
- Top real score: ${realDex[0]?.score ?? "n/a"}
- Power board status: ${power.status}
- Ingest probe: HTTP ${ingest.status} ok=${ingestJson?.ok === true}

## Reading

Public leaderboards are the only heat signal without D1. Real retention (per-event counts, D1/D7 by cohort, session buckets) comes from \`GET /api/ops/retention?days=30\` with header \`X-Ops-Key\` (env \`OPS_ADMIN_KEY\`), or from D1 directly:

\`\`\`
SELECT event, COUNT(*) AS n, COUNT(DISTINCT session_id) AS sessions FROM analytics_events GROUP BY event;
\`\`\`

This file is overwritten by \`node scripts/retention-baseline.mjs\`.
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, md, "utf8");
console.log(`retention-baseline: wrote ${outFile}`);
console.log(`real dex rows=${realDex.length} health=${health.json?.version} ingest=${ingest.status}`);
if (health.status !== 200 || ingest.status !== 200) process.exit(1);
