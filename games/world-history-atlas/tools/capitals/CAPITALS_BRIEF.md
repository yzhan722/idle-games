# Brief: capitals of every state (World History Atlas)

The atlas (`C:\Project\idle-games\games\world-history-atlas`) is a Chinese-language historical map. It will mark each
state's capital with a small dot while that state is on the map. Your job: for each polity in your chunk file, list where
its capital was over its lifetime, with coordinates.

Do not edit any repo file. Write only your output file.

## Input
Your chunk file has one polity per line, with `name`, `era_span` ("前" = BC; "至今" = to the present), `capital` (a short
text) and `capital_evol` (how the capital changed over time, as free text). Use these as hints, but correct them where they
are wrong.

## Output: one JSON object (path given in your task)
```json
{
  "大唐帝国": [[618, 904, "长安", 108.9, 34.3], [904, 907, "洛阳", 112.4, 34.6]],
  "罗马帝国": [[-27, 330, "罗马", 12.5, 41.9], [330, 395, "君士坦丁堡", 29.0, 41.0]]
}
```
- Each row is `[fromYear, toYearExclusive, capitalName, lon, lat]`.
  - Years are integers. BC years are negative. There is no year 0.
  - Rows are sorted, do not overlap, and stay inside the polity's era_span. "至今" means 2027.
- **One capital at a time.** For dual or seasonal capitals (e.g. 元 上都/大都, 辽 五京, Mughal court moving), give the
  main seat of government in that period.
- **Names:** use the historical name of the time in Simplified Chinese, e.g. "长安", "君士坦丁堡", "特诺奇蒂特兰".
- **Coordinates:** decimal degrees with one or two decimals, for the actual historic site (modern location).
- **Leave a polity out** (do not list it) if:
  - it had no fixed capital;
  - its capital is unknown;
  - it is an umbrella or label entry rather than a state.
  Never guess a location.
- **Covering the polity's life:** cover its whole span where the capital is known. Short gaps are fine.
- Precision: a capital move dated to the year, from standard histories. Do not chase contested months.

Check that the JSON parses (`node -e "JSON.parse(require('fs').readFileSync('<path>','utf8'))"`). Also check that the
rows are sorted and inside the era_span. Do not run any command that reads hardware or sensor data. Reply in one or two
lines: polities covered, polities left out, and the main uncertainties.
