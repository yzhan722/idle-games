// Historic-region assignment for admin areas the old base map cannot place by geometry
// (Americas, Oceania, island South-East Asia, southern Africa, far-flung overseas parts).
// mode "whole": skip intersection, the whole admin area joins `region`.
// otherwise `region` only receives the part not covered by a trusted historic region.

const set = s => new Set(s.trim().split(/\s+/));
const US_WEST = set("WA OR CA NV ID MT WY UT CO AZ NM");
const US_PLAINS = set("ND SD NE KS OK TX MN IA MO AR LA");
const COUNTRY = {};
const put = (region, codes, mode = "whole") => { for (const c of set(codes)) COUNTRY[c] = { region, mode }; };

put("alaska_canada", "CAN GRL SPM");
put("mesoamerica", "MEX GTM BLZ SLV HND NIC CRI PAN");
put("caribbean", "CUB HTI DOM JAM PRI BHS TTO BRB LCA VCT GRD ATG KNA DMA VIR VGB CYM TCA AIA MSR BLM MAF SXM CUW ABW BES BMU");
put("andes", "COL VEN ECU PER BOL CHL ARG PRY URY FLK SGS");
put("brazil", "BRA GUY SUR");
put("oceania", "AUS NZL PNG SLB VUT NCL FJI WSM TON KIR FSM MHL PLW NRU TUV PYF COK NIU GUM MNP ASM WLF PCN HMD NFK");
put("malacca", "IDN PHL BRN TLS SGP MYS");
put("south_africa", "ZAF LSO SWZ NAM BWA ZWE MOZ ZMB MWI AGO MDG COM MUS ATF");
put("south_africa", "COD COG GAB GNQ STP", "leftover");
put("east_africa", "TZA RWA BDI SYC", "whole");
put("east_africa", "KEN UGA SOM SOL ETH ERI DJI SSD", "leftover");
put("scandinavia", "FIN ISL NOR SWE DNK FRO ALD", "leftover");
put("lithuania_baltic", "EST LVA", "leftover");

export function ruleFor(p, centroid) {
  const iso = p.iso, adm = p.adm || "";
  if (iso === "USA") {
    const st = adm.replace(/^US-/, "");
    if (st === "AK") return { region: "alaska_canada", mode: "whole" };
    if (st === "HI") return { region: "oceania", mode: "whole" };
    if (US_WEST.has(st)) return { region: "na_west", mode: "whole" };
    if (US_PLAINS.has(st)) return { region: "na_plains", mode: "whole" };
    return { region: "na_east", mode: "whole" };
  }
  if (iso === "IDN" && /^ID-(PA|PB|PP|PD|PE|PS|PT)$/.test(adm)) return { region: "oceania", mode: "whole" }; // New Guinea
  if (iso === "RUS" && centroid) return { region: centroid[0] < 60 ? "muscovy_rus" : "siberia", mode: "leftover" };
  return COUNTRY[iso] || null;
}

// For leftover parts far from every piece (overseas territories inside a European country's geometry, etc.)
export function regionByLocation([lon, lat]) {
  if (lon < -30) {
    if (lat > 50) return "alaska_canada";
    if (lat > 25) return lon < -104 ? "na_west" : lon < -90 ? "na_plains" : "na_east";
    if (lat > 7) return (lon > -85 && (lat > 17 || lon > -75)) ? "caribbean" : "mesoamerica";
    return lon < -58 ? "andes" : "brazil";
  }
  if (lat < 0 && lon > 10 && lon < 65) return "south_africa";
  if (lat < -9 && lon > 100) return "oceania";
  if (lon > 160 || lon < -150) return "oceania";
  return null;
}
export const RULES = COUNTRY;
