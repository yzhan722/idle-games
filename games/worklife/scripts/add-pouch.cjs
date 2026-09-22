/* One-off: add MWI-style pouches (extra food/drink slots) as tailor accessories. Idempotent. */
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "shared", "enhanced_content_pack_chinese.json");
const pack = JSON.parse(fs.readFileSync(file, "utf8"));
const items = [
  { id: "accessory_pouch_small", name: "小布袋", type: "accessory", tier: 1, slot: "accessory", foodSlots: 1, drinkSlots: 1, description: "缝在腰间的小布袋。战斗时多带一份食物和一瓶饮品（+1 食物槽、+1 饮品槽）。", value: 40 },
  { id: "accessory_pouch_medium", name: "皮革腰包", type: "accessory", tier: 2, slot: "accessory", foodSlots: 1, drinkSlots: 1, def: 2, description: "结实的皮革腰包，+1 食物槽、+1 饮品槽，防御 +2。", value: 160 },
];
const actions = [
  { id: "act_craft_pouch_small", name: "缝制小布袋", skillId: "skill_tailor", duration: 12000, xp: 24, requirements: { skillLevel: 3 }, consumes: [{ itemId: "yarn_1", qty: 3 }, { itemId: "fiber_1", qty: 4 }], yields: [{ itemId: "accessory_pouch_small", qty: 1, chance: 1 }] },
  { id: "act_craft_pouch_medium", name: "缝制皮革腰包", skillId: "skill_tailor", duration: 18000, xp: 60, requirements: { skillLevel: 15 }, consumes: [{ itemId: "yarn_2", qty: 4 }, { itemId: "leather_1", qty: 3 }], yields: [{ itemId: "accessory_pouch_medium", qty: 1, chance: 1 }] },
];
let added = 0;
for (const it of items) if (!pack.items.some((x) => x.id === it.id)) { pack.items.push(it); added++; }
for (const a of actions) if (!pack.actions.some((x) => x.id === a.id)) { pack.actions.push(a); added++; }
if (!pack.items.some((x) => x.id === "leather_1")) {
  console.log("note: leather_1 missing; medium pouch recipe references it");
}
fs.writeFileSync(file, JSON.stringify(pack, null, 2) + "\n");
console.log("added", added);
