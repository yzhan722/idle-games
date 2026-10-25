/**
 * One-off: add the `bossMechanics` table to the shared content pack. The pack file is
 * `JSON.stringify(pack, null, 1)` byte-for-byte, so only the new key appears in the diff.
 *   node scripts/audit/add-boss-mechanics-key.cjs
 * Idempotent: replaces an existing table with this one.
 */
const fs = require("fs");
const path = require("path");
const file = path.resolve(__dirname, "../../shared/enhanced_content_pack_chinese.json");
const raw = fs.readFileSync(file, "utf8");
const pack = JSON.parse(raw);

pack.bossMechanics = [
  {
    id: "guard_60",
    kind: "guard",
    label: "六成血格挡",
    desc: "血量降到六成时举盾，受到的伤害大减；重劈可以破防。举盾前会预警。",
    params: { telegraphRatio: 0.66, startRatio: 0.6, endRatio: 0.3, incomingMult: 0.45 },
    messages: {
      telegraph: "管家在蓄力举盾……留一记重劈！",
      up: "森林管家举起树皮盾！格挡中——用重劈破防！",
      shatter: "{ability}震碎了刚举起的树皮盾！",
    },
  },
  {
    id: "nature_wrath_30",
    kind: "wrath",
    label: "三成血狂怒",
    desc: "血量降到三成时进入狂怒，攻击变得更快，并撤下格挡。",
    params: { startRatio: 0.3, intervalMult: 0.6, minIntervalMs: 800 },
    messages: { start: "自然之怒！管家的攻击变得更快了！" },
  },
];

fs.writeFileSync(file, JSON.stringify(pack, null, 1) + (raw.endsWith("\n") ? "\n" : ""), "utf8");
console.log("bossMechanics:", pack.bossMechanics.map((m) => m.id).join(", "));
