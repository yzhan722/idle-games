import { resolveT1Url } from "./resolve";

const files = import.meta.glob("./**/*.{webp,png,svg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export { T1_ASSET_KEYS, t1KeyFor } from "./keys";
export { T1_EXTENSION_PRIORITY, profileForKey, specByKey } from "./contract";

export function t1Url(key: string): string | undefined {
  return resolveT1Url(files, key);
}

export function t1Files(): Record<string, string> {
  return files;
}
