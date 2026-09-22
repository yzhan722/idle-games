/* One-off: tag profession tools in the content pack with toolFor/toolSpeed (MWI tool speed).
   Tier N → +N×10% action speed for that profession's actions. Idempotent. */
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "shared", "enhanced_content_pack_chinese.json");
const pack = JSON.parse(fs.readFileSync(file, "utf8"));
const RULES = [
  { re: /^weapon_logging_axe_t(\d+)$/, skill: "skill_woodcutter" },
  { re: /^weapon_forge_hammer_t(\d+)$/, skill: "skill_blacksmith" },
  { re: /^weapon_hoe_t(\d+)$/, skill: "skill_farmer" },
  { re: /^weapon_sickle_t(\d+)$/, skill: "skill_farmer" },
  { re: /^weapon_frying_pan_t(\d+)$/, skill: "skill_chef" },
  { re: /^weapon_spatula_t(\d+)$/, skill: "skill_chef" },
  { re: /^weapon_scissors_t(\d+)$/, skill: "skill_tailor" },
  { re: /^weapon_alchemy_bottle_t(\d+)$/, skill: "skill_alchemist" },
  { re: /^(tool|weapon)_alchemy_bottle_t(\d+)$/, skill: "skill_alchemist" },
];
let n = 0;
for (const item of pack.items) {
  for (const r of RULES) {
    const m = item.id.match(r.re);
    if (!m) continue;
    const tier = Number(m[m.length - 1]);
    item.toolFor = r.skill;
    item.toolSpeed = Math.round(tier * 0.1 * 100) / 100;
    n++;
    break;
  }
}
fs.writeFileSync(file, JSON.stringify(pack, null, 2) + "\n");
console.log("tagged", n, "tools");
console.log(pack.items.filter((i) => i.toolFor).map((i) => `${i.id} ${i.toolFor} +${i.toolSpeed * 100}%`).join("\n"));
