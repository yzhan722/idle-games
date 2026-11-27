import { resolveT1Url } from "./resolve";

const files = import.meta.glob("./**/*.{webp,png,svg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export { profileForKey, t1KeyFor } from "./runtime";

/** 小图，由 scripts/art-resize.py --small 从原图缩出来：列表、格子用的树、物品、职业形象（边长 216），头像（160），导航和行内图标（96）。 */
const smallFiles = import.meta.glob("../t1_small/**/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** 同一个键每次结果一样，只查一次（查一次要比对全部文件名）。 */
const resolved = new Map<string, string | undefined>();

export function t1Url(key: string): string | undefined {
  if (!resolved.has(key)) resolved.set(key, resolveT1Url(files, key));
  return resolved.get(key);
}

/** 没有小图就用原来的。 */
export function t1SmallUrl(key: string): string | undefined {
  return smallFiles[`../t1_small/${key}.webp`] ?? t1Url(key);
}

export function t1Files(): Record<string, string> {
  return files;
}
