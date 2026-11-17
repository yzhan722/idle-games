// Stage 4: append the modern polity entries written in out/polities_*.json to empires_db.js and confidence.js.
// Idempotent: polities already present are skipped.
import fs from "node:fs";
import path from "node:path";
import { ATLAS, OUT, loadAtlas, HERE } from "./lib.mjs";

const FIELDS = ["color", "capital", "era_span", "peak_area", "regime", "desc", "capital_evol", "institutions", "fiscal_tax", "peak_demography", "treaties_campaigns"];
const LEVELS = new Set(["史料确证", "学界推测", "传说"]);
const incoming = {};
for (const f of fs.readdirSync(OUT).filter(f => /^polities_\d+\.json$/.test(f)).sort()) Object.assign(incoming, JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")));
// polities introduced by the pre-1886 research (out/r3/pre_*.json -> new_polities)
const R3 = path.join(HERE, "research");
if (fs.existsSync(R3)) for (const f of fs.readdirSync(R3).filter(f => /^pre_[a-z]+\.json$/.test(f)).sort()) Object.assign(incoming, JSON.parse(fs.readFileSync(path.join(R3, f), "utf8")).new_polities || {});

const E = loadAtlas(["src/data/empires_db.js"]).EMPIRES;
const q = v => JSON.stringify(String(v));
const empRows = [], confRows = [], problems = [];
for (const [name, e] of Object.entries(incoming)) {
  if (E[name]) continue;
  for (const k of FIELDS) if (!e[k] || !String(e[k]).trim()) problems.push(`${name}: missing ${k}`);
  if (!/^#[0-9a-fA-F]{6}$/.test(e.color || "")) problems.push(`${name}: bad color ${e.color}`);
  if (!/^前?\d{1,4} - (前?\d{1,4}|至今)$/.test(e.era_span || "")) problems.push(`${name}: bad era_span ${e.era_span}`);
  if (!e.confidence || !LEVELS.has(e.confidence.level) || !e.confidence.note) problems.push(`${name}: bad confidence`);
  empRows.push(`  ${q(name)}: {\n${FIELDS.map(k => `    ${k}: ${q(e[k])}`).join(",\n")}\n  }`);
  confRows.push(`    ${q(name)}: { level: ${q(e.confidence.level)}, note: ${q(e.confidence.note)} }`);
}
if (problems.length) { console.log(problems.join("\n")); process.exit(1); }
if (!empRows.length) { console.log("nothing to add"); process.exit(0); }

const ep = path.join(ATLAS, "src/data/empires_db.js");
let es = fs.readFileSync(ep, "utf8");
const eEnd = es.lastIndexOf("\n};");
es = es.slice(0, eEnd).replace(/\s*$/, "") + ",\n" + empRows.join(",\n") + es.slice(eEnd);
fs.writeFileSync(ep, es, "utf8");

const cp = path.join(ATLAS, "src/data/confidence.js");
let cs = fs.readFileSync(cp, "utf8");
const cEnd = cs.lastIndexOf("\n  }\n};");
cs = cs.slice(0, cEnd).replace(/\s*$/, "") + ",\n" + confRows.join(",\n") + cs.slice(cEnd);
cs = cs.replace(/\(\d+ Sovereign Polities\)/, `(${Object.keys(E).length + empRows.length} Sovereign Polities)`);
fs.writeFileSync(cp, cs, "utf8");
console.log("added", empRows.length, "polities");
