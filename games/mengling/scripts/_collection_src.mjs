// collection_fun.js 已拆到 modules/systems/collection/*.js；源码断言统一从这里取拼接后的全文与文件清单
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const systems = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "modules", "systems");

export const COLLECTION_FILES = [
  path.join(systems, "collection_fun.js"),
  ...readdirSync(path.join(systems, "collection")).filter((f) => f.endsWith(".js")).sort().map((f) => path.join(systems, "collection", f)),
];

export const collectionSource = () => COLLECTION_FILES.map((f) => readFileSync(f, "utf8")).join("\n");
