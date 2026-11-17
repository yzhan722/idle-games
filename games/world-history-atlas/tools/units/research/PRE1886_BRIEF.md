# Brief: unit-level holders before 1886 (World History Atlas)

The atlas (C:\Project\idle-games\games\world-history-atlas, Chinese-language historical map) now draws 569 map units
(provinces/states for 9 big countries, whole countries elsewhere). Each unit belongs to one coarse **historic region**
whose hand-checked owner is shown for the unit before 1886 (from 1886 a separate dataset is used). In your area the
historic regions are too coarse, so many units show the wrong state for long periods (for example every unit of a
region shows the same empire even where that empire never ruled). Your job: research and write per-unit override rows
for years before 1886. Do not edit any repo file; write only your output file.

## Inputs (read them first)
- `C:\Project\idle-games\games\world-history-atlas\tools\units\out\r3\units.tsv` — every unit: unit_id, name, admin_code, historic_region, region name, continent.
- `...\out\r3\region_timeline.tsv` — what each historic region currently shows, year by year (from, to inclusive; "(无国家) X" = no state, culture label X).
- `...\out\r3\polities.tsv` — every polity that exists in the database, with its era_span ("前" = BC).
- `...\out\r3\pre1886_current.mjs` — override rows that already exist (US states, Canada, Latin American independence, Boer republics, Algeria...). Do not repeat them; if one is wrong, say so in notes.
- For tone/format of new polity entries see `...\out\POLITY_BRIEF.md` (same fields + confidence).

## Output: one JSON file (path given in your task)
```json
{
  "rows": {
    "<unit_id | admin_code | ISO3>": [[fromYear, toYearExclusive, "polity name or #none"], ...]
  },
  "new_polities": { "<name>": { "color": "...", "capital": "...", "era_span": "1600 - 1902", "...": "...", "confidence": {"level": "史料确证", "note": "..."} } },
  "notes": "anything uncertain, and any problem you saw in the existing data"
}
```
- Key by `unit_id` when a country is split into several pieces and only some pieces should get the row; key by ISO3 or admin_code (e.g. `IN-UP`, `RU-IRK`) to cover all pieces of that area.
- Years are integers, BC negative, no year 0; `toYearExclusive` ≤ 1886. Rows of one key must be sorted and must not overlap.
- `"#none"`: no state controlled the unit (it is drawn as stateless). Use it where the region shows an empire that did not actually reach this unit.
- The polity must exist in polities.tsv or be defined in `new_polities`. The row's years must fall inside the polity's era_span (the checker allows starting at most 10 years early and ending at most 15 years late).
- Only override where the current region data is wrong or too coarse for that unit; where the region timeline is right, add nothing.

## Rules
- Zero fabrication: only well-established states and dates (standard references such as Cambridge histories, Encyclopaedia Britannica, standard national histories). Prefer fewer, solid rows over many shaky ones. Do not invent precise dates for vague frontiers — round to the nearest well-attested event.
- Real territorial control only: a trading fort or a nominal claim is not control of a whole province/country unit. Assign a unit to the polity that controlled most of its area.
- Polity names: standard Simplified Chinese; pure single states/dynasties/empires (no “诸国”, no “/”, no umbrella labels).
- New polity entries: full fields as in POLITY_BRIEF.md, neutral, factual, colour readable on a dark map.
- Check your JSON parses: `node -e "JSON.parse(require('fs').readFileSync('<path>','utf8'))"`.
- Do not run any command that reads hardware or sensor data.

Reply in one or two lines: how many keys/rows/new polities you wrote and the main uncertainties.
