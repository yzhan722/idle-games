# Brief: write modern polity entries for the World History Atlas

The atlas (C:\Project\idle-games\games\world-history-atlas) is a Chinese-language historical map. Its polity database is
`src/data/empires_db.js` (read-only for you). We are adding modern countries that the map now needs. Your job: write one entry per
polity in your chunk file and save them as a single JSON object to the output path you are given. Do not edit any file in the repo.

## Format (one key per polity name, exactly the name given in your chunk file)
```json
{
  "南非共和国": {
    "color": "#ffb703",
    "capital": "比勒陀利亚 / 开普敦",
    "era_span": "1910 - 至今",
    "peak_area": "122.1 万 km²",
    "regime": "单一制议会共和国（三都分设）",
    "desc": "1910年开普、纳塔尔、德兰士瓦与奥兰治合并成立英属南非联邦自治领，1961年退出英联邦改称南非共和国；长期实行白人少数统治与种族隔离制度，1994年首次全种族大选纳尔逊·曼德拉当选总统，实现民主转型。",
    "capital_evol": "比勒陀利亚（行政首都） / 开普敦（立法首都） / 布隆方丹（司法首都，1910年三都体制沿用至今）",
    "institutions": "1910—1994年仅白人享有完整参政权；1996年民主宪法确立九省准联邦化单一制，国民议会选举产生总统统领内阁，设宪法法院",
    "fiscal_tax": "南非兰特储备银行体系，早期依托威特沃特斯兰德黄金与金伯利钻石矿业税，现代以个人与企业所得税、增值税及矿业金融服务为主",
    "peak_demography": "现代人口约 6200 万；现行本土面积 122.1 万 km²（1915—1990年间曾委任统治西南非洲即今纳米比亚）",
    "treaties_campaigns": "《南非法案》生效成立南非联邦(1910) · 国民党全面推行种族隔离法制(1948) · 宣告成立南非共和国(1961) · 废除种族隔离、曼德拉当选首任黑人总统(1994)",
    "confidence": { "level": "史料确证", "note": "1909年《南非法案》、1961年共和国宪法、1996年南非宪法及现代国家档案直接证实。" }
  }
}
```
Look at 3–4 neighbouring entries in `src/data/empires_db.js` (e.g. 荷兰王国, 阿尔及利亚共和国, 大韩民国) and `src/data/confidence.js` to match tone and length.

## Rules
- Simplified Chinese throughout; proper names in standard Chinese transliteration (新华社/外交部 usage).
- `era_span` must be exactly the span in your chunk file, written as `"YYYY - YYYY"` or `"YYYY - 至今"` (spaces around the hyphen).
- Zero fabrication: only well-established facts. Areas and populations: use current official figures (state the year for population, e.g. “2023年人口约 1120 万”). For a defunct state give its area and population at a stated year. If something is genuinely unknown, say so plainly.
- `desc`: 1–3 sentences, neutral and factual. For contested or sensitive cases state the facts and the dispute neutrally (e.g. 科索沃: declared independence 2008, recognised by some states and not others, including China and Serbia; 罗得西亚: unilateral 1965 declaration not recognised internationally; 朝鲜, 也门, 南斯拉夫 etc.: neutral).
- `treaties_campaigns`: 3–5 key events, each “事件(年份)”, separated by “ · ”.
- `color`: a mid-bright hex colour readable on a dark map (avoid near-black and near-white), different across your entries.
- `confidence.level`: one of 史料确证 / 学界推测 / 传说 (modern states are normally 史料确证); `note`: the documentary basis (constitution, independence act, treaty, UN admission, etc.).
- No emoji, no HTML, no “/” inside the polity name keys, no “诸国” in names.
- When done, check the file parses: `node -e "JSON.parse(require('fs').readFileSync('<your output path>','utf8'))"`.
- Do not run any command that reads hardware or sensor data.

Reply with one line: how many entries you wrote and anything you were unsure about.
