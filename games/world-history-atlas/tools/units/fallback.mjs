// Holders for territories CShapes does not cover (or covers late). Each row: [fromYear, toYearExclusive, holder]
// holder is a GW code (resolved through polity_map.mjs by year) or a polity name. Anything else falls back to the
// historic region's hand-checked data.
export const FALLBACK_GW = {
  GRL: [[1886, 2027, 390]], FRO: [[1886, 2027, 390]],
  FLK: [[1886, 2027, 200]], SGS: [[1886, 2027, 200]], IMN: [[1886, 2027, 200]], JEY: [[1886, 2027, 200]],
  KWT: [[1899, 1961, 200]], BHR: [[1886, 1971, 200]], ARE: [[1886, 1971, 200]],
  ATF: [[1886, 2027, 220]], HMD: [[1947, 2027, 900]]
};
// Per-unit (region piece) rows where the country code is not specific enough
export const FALLBACK_UNIT = {
  "YEM~yemen": [[1886, 1919, 640]],
  "YEM~arabia": [[1886, 1937, 200]]
};
