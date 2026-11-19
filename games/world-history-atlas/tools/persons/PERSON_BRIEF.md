# Brief: historical figures for the World History Atlas (person view)

The atlas (C:\Project\idle-games\games\world-history-atlas) is a Chinese-language historical map. A new "person view"
lets a reader pick a figure, see their life, and follow where they were year by year on the map. You write the data for
the figures in your list. Write one JSON file per person in
`C:\Project\idle-games\games\world-history-atlas\tools\persons\data\<id>.json` and nothing else.

## Schema
```json
{
  "id": "zhang-qian",                      // lowercase ascii slug, unique
  "name": "张骞",
  "name_alt": "字子文",                     // other names / original-language name, may be ""
  "group": "中国",                          // "中国" or "世界"
  "born": -164, "born_approx": true,        // integers, BC negative, no year 0; approx flags when the year is uncertain
  "died": -114, "died_approx": false,
  "role": "西汉外交家、探险家",
  "polity": "大汉帝国",                      // main polity served, must be a name from the polity list below, or ""
  "summary": "2–3 sentences, neutral and factual.",
  "confidence": "史料确证",                  // 史料确证 / 学界推测 / 传说 for the figure as a whole
  "sources": "《史记·大宛列传》《汉书·张骞传》",
  "stops": [
    { "year": -139, "to": -129, "lon": 108.9, "lat": 34.3, "place": "长安（今陕西西安）",
      "event": "受汉武帝之命率百余人出陇西，出使大月氏。", "kind": "出使",
      "confidence": "史料确证", "source": "《史记·大宛列传》" }
  ]
}
```
- `stops`: 10–40 per person, sorted by `year`. `year` is the year the person was at that place; `to` (optional, inclusive)
  when they stayed several years. Precision is one year — do not split a single campaign or journey within a year into
  many points; one stop per year at most is a good default, except a decisive event worth its own point.
- `lon`/`lat`: decimal degrees, one decimal, of the actual place (modern location of the historic site).
- `place`: historic name with modern equivalent in parentheses, e.g. "撒马尔罕（今乌兹别克斯坦）".
- `kind`: one of 出生, 求学, 任职, 执政, 出使, 征战, 航行, 旅行, 传教, 流亡, 贬谪, 著述, 去世, 其他.
- Include birth and death places when known; when unknown, omit the stop rather than guess.
- Every stop needs `source` (primary text, chronicle or a standard modern biography) and `confidence`.

## Rules
- Zero fabrication. Only well-attested facts; when a date or place is reconstructed by scholars, mark the stop 学界推测;
  legendary material (e.g. later romances, hagiography) either 传说 or left out. Do not use novels, films or games
  (三国演义, 说岳 etc.).
- Simplified Chinese throughout (standard transliterations), neutral tone, no emoji, no HTML.
- `polity` must be an exact name from `C:\Project\idle-games\games\world-history-atlas\tools\units\out\r5\polities.tsv`
  (first column); use "" if none fits.
- Check each file parses: `node -e "JSON.parse(require('fs').readFileSync('<path>','utf8'))"`, and that stops lie within
  born..died.
- No stop may be later than 1949 (the atlas does not show contemporary figures); a life may end later, but stop the stops at 1949.
- Before writing, list `tools\persons\data\` and never overwrite an existing file or reuse an existing id.
- Do not run any command that reads hardware or sensor data.

Reply in one or two lines: files written, total stops, main uncertainties.
