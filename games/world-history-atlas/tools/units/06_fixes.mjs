// Stage 6: apply fact-check corrections (out/r3/fc_*.json) to empires_db.js and confidence.js. Idempotent.
import fs from "node:fs";
import path from "node:path";
import { ATLAS, OUT, HERE } from "./lib.mjs";

const FIELDS = new Set(["color", "capital", "peak_area", "regime", "desc", "capital_evol", "institutions", "fiscal_tax", "peak_demography", "treaties_campaigns"]);
const dir = path.join(HERE, "research");
const ep = path.join(ATLAS, "src/data/empires_db.js"), cp = path.join(ATLAS, "src/data/confidence.js");
let es = fs.readFileSync(ep, "utf8"), cs = fs.readFileSync(cp, "utf8");
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const STR = '"(?:[^"\\\\]|\\\\.)*"'; // a JSON string literal
let nf = 0, nc = 0;
const skipped = [];
for (const f of fs.readdirSync(dir).filter(f => /^fc_\d+\.json$/.test(f)).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const [name, fields] of Object.entries(j.fixes || {})) {
    const start = es.indexOf(`\n  ${JSON.stringify(name)}: {`);
    if (start < 0) { skipped.push(`${name}: not found`); continue; }
    const end = es.indexOf("\n  }", start);
    let block = es.slice(start, end);
    for (const [k, v] of Object.entries(fields)) {
      if (!FIELDS.has(k)) { skipped.push(`${name}.${k}: not applied`); continue; }
      const re = new RegExp(`(\\n    ${k}: )${STR}`);
      if (!re.test(block)) { skipped.push(`${name}.${k}: field missing`); continue; }
      block = block.replace(re, (_, pre) => pre + JSON.stringify(String(v)));
      nf++;
    }
    es = es.slice(0, start) + block + es.slice(end);
  }
  for (const [name, note] of Object.entries(j.confidence_fixes || {})) {
    const re = new RegExp(`(\\n    ${esc(JSON.stringify(name))}: \\{ level: "[^"]+", note: )${STR}`);
    if (!re.test(cs)) { skipped.push(`${name}: confidence entry not found`); continue; }
    cs = cs.replace(re, (_, pre) => pre + JSON.stringify(String(note)));
    nc++;
  }
}
fs.writeFileSync(ep, es, "utf8");
fs.writeFileSync(cp, cs, "utf8");
console.log("fields fixed", nf, "confidence notes fixed", nc);
if (skipped.length) console.log(skipped.join("\n"));
