// Holders before 1886 for units whose historic region is too coarse to tell them apart
// (Americas, southern Africa, French Algeria). Rows: [fromYear, toYearExclusive, polity]. Years not covered
// keep the historic region's hand-checked owner. Keys: admin code (US-TX, CA-ON, ZA-WC) or ISO3 country code.
const US = "美利坚合众国", MX = "墨西哥合众国", ES = "西班牙帝国", UK = "大英帝国", CA = "加拿大联邦";
const T = {};
const put = (keys, rows) => { for (const k of keys.trim().split(/\s+/)) T[k] = rows; };

// United States: territorial growth by state (dates of acquisition by the US)
put("US-NH US-MA US-RI US-CT US-NY US-NJ US-PA US-DE US-MD US-VA US-NC US-SC US-GA US-ME US-VT US-WV", [[1776, 1886, US]]);
put("US-OH US-IN US-IL US-MI US-WI US-KY US-TN US-AL US-MS", [[1783, 1886, US]]);
put("US-LA US-AR US-MO US-IA US-MN US-KS US-NE US-SD US-ND US-OK US-MT", [[1803, 1886, US]]);
put("US-FL", [[1565, 1763, ES], [1763, 1783, UK], [1783, 1821, ES], [1821, 1886, US]]);
put("US-TX", [[1821, 1836, MX], [1836, 1845, "德克萨斯共和国"], [1845, 1886, US]]);
put("US-CA US-NV US-UT US-AZ US-NM US-CO US-WY", [[1821, 1848, MX], [1848, 1886, US]]);
put("US-WA US-OR US-ID", [[1846, 1886, US]]);
put("US-AK", [[1799, 1867, "俄罗斯帝国"], [1867, 1886, US]]);

// Canada: provinces by date of joining the federation (British North America before)
put("CA-ON CA-NS CA-NB", [[1763, 1867, UK], [1867, 1886, CA]]);
put("CA-QC", [[1608, 1763, "法兰西王国"], [1763, 1867, UK], [1867, 1886, CA]]);
put("CA-MB CA-SK CA-AB CA-NT CA-NU CA-YT", [[1670, 1870, UK], [1870, 1886, CA]]);
put("CA-BC", [[1858, 1871, UK], [1871, 1886, CA]]);
put("CA-PE", [[1763, 1873, UK], [1873, 1886, CA]]);
put("CA-NL", [[1763, 1886, UK]]);

// Latin America: independence (Spanish / Portuguese rule before comes from the historic regions)
put("MEX", [[1821, 1886, MX]]);
put("GTM", [[1839, 1886, "危地马拉共和国"]]);
put("HND", [[1838, 1886, "洪都拉斯共和国"]]);
put("SLV", [[1841, 1886, "萨尔瓦多共和国"]]);
put("NIC", [[1838, 1886, "尼加拉瓜共和国"]]);
put("CRI", [[1838, 1886, "哥斯达黎加共和国"]]);
put("COL PAN", [[1831, 1886, "哥伦比亚共和国"]]);
put("VEN", [[1830, 1886, "委内瑞拉共和国"]]);
put("ECU", [[1830, 1886, "厄瓜多尔共和国"]]);
put("PER", [[1821, 1886, "秘鲁共和国"]]);
put("BOL", [[1825, 1886, "玻利维亚共和国"]]);
put("CHL", [[1818, 1886, "智利共和国"]]);
put("ARG", [[1816, 1886, "阿根廷共和国"]]);
put("PRY", [[1811, 1886, "巴拉圭共和国"]]);
put("URY", [[1828, 1886, "乌拉圭东岸共和国"]]);
put("BRA", [[1822, 1886, "巴西帝国"]]);
put("HTI", [[1804, 1886, "海地共和国"]]);
put("DOM", [[1822, 1844, "海地共和国"], [1844, 1886, "多米尼加共和国"]]);
put("JAM", [[1655, 1886, UK]]);

// Southern Africa and French Algeria
put("ZA-WC ZA-EC ZA-NC", [[1806, 1886, UK]]);
put("ZA-NL", [[1843, 1886, UK]]);
put("ZA-GT ZA-LP ZA-MP ZA-NW", [[1852, 1886, "德兰士瓦共和国"]]);
put("ZA-FS", [[1854, 1886, "奥兰治自由邦"]]);
put("DZA", [[1848, 1852, "法兰西第二共和国"], [1852, 1870, "法兰西第二帝国"], [1870, 1886, "法兰西第三共和国"]]);
put("LBR", [[1847, 1886, "利比里亚共和国"]]);
put("MDG", [[1817, 1886, "马达加斯加王国"]]);

export const PRE1886 = T;
// Only the region pieces of these countries that lie in the matching area get the rows
export const PRE1886_SKIP_REGIONS = { DZA: new Set(["west_africa"]) };
