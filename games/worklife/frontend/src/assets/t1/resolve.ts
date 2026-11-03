import { T1_EXTENSION_PRIORITY, type T1Extension } from "./contract";

function normalizeAssetPath(raw: string): string {
  return raw.replace(/\\/g, "/").replace(/^\.\//, "");
}

function canonicalAndExt(raw: string): { key: string; ext: T1Extension } | undefined {
  const p = normalizeAssetPath(raw);
  const m = p.match(/^(.*)\.(webp|png|svg)$/i);
  if (!m) return undefined;
  return { key: m[1], ext: m[2].toLowerCase() as T1Extension };
}

/** Pure resolver used by the Vite manifest and by node tests. */
export function resolveT1Url(files: Record<string, string>, key: string): string | undefined {
  const needle = normalizeAssetPath(key);
  const byExt: Partial<Record<T1Extension, string>> = {};
  for (const [rawPath, url] of Object.entries(files)) {
    const parsed = canonicalAndExt(rawPath);
    if (!parsed) continue;
    const pathKey = parsed.key;
    const matches =
      pathKey === needle ||
      pathKey.endsWith(`/${needle}`) ||
      normalizeAssetPath(rawPath).endsWith(`/${needle}.${parsed.ext}`);
    if (!matches) continue;
    const prev = byExt[parsed.ext];
    if (prev && prev !== url) {
      throw new Error(`duplicate T1 asset ${needle}.${parsed.ext}`);
    }
    byExt[parsed.ext] = url;
  }
  for (const ext of T1_EXTENSION_PRIORITY) {
    const url = byExt[ext];
    if (url) return url;
  }
  return undefined;
}

export function listResolvedKeys(files: Record<string, string>): string[] {
  const keys = new Set<string>();
  for (const rawPath of Object.keys(files)) {
    const parsed = canonicalAndExt(rawPath);
    if (parsed) keys.add(parsed.key);
  }
  return [...keys].sort();
}
