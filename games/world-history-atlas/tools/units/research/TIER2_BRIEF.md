# Brief: holders before 1886 for newly split units, and missing polities (World History Atlas)

The atlas (`C:\Project\idle-games\games\world-history-atlas`) is a Chinese-language historical map drawn as map units.
Eight countries that used to be a single unit are now split, so states that co-existed inside them can finally be drawn.
- Turkey: 12 NUTS-1 regions, `TR-TR1` … `TR-TRC`. TR-TR1 is Istanbul.
- Romania: 6 historic lands, `RO-DOB RO-MOL RO-MUN RO-OLT RO-TRS RO-BAN`.
- Iran, Mexico, Nigeria, DR Congo (the 11 pre-2015 provinces), Ethiopia and Mongolia: their first-level divisions.

From 1886 a separate dataset is used, so it is out of scope. Before 1886 each new unit inherits whatever its country or
historic region showed before the split, which is still too coarse. For example, every Nigerian state shows the same
holder, although Oyo, Benin, Bornu and the Sokoto Caliphate ruled different parts.

Do not edit any repo file. Write only your output file.

## Inputs
All under `C:\Project\idle-games\games\world-history-atlas\tools\units\`:
- `out\r5\unit_timeline.tsv`: for every unit of the 8 countries, what it shows now, year by year. It has unit_id, admin
  code, name, region, from, to (inclusive) and holder. "—" means stateless.
- `out\r5\units.tsv`: every unit of the whole map, with unit_id, name, admin_code and region_id.
- `out\r5\polities.tsv`: every polity in the database, with its era_span ("前" = BC).
- `out\r4\region_timeline.tsv`: what each historic region shows. It tells you the context and the neighbours.
- The existing override files `research\pre_*.json` and `pre1886.mjs`. Your rows win over them for the same key and year.
  Rows keyed by ISO3 (e.g. `NGA`) still apply to all the new pieces unless you override them.
- `out\POLITY_BRIEF.md`: the format and tone for new polity entries.

## Output: one JSON file (path given in your task)
```json
{
  "rows": { "<unit_id | admin_code | ISO3 | @region_id>": [[fromYear, toYearExclusive, "polity or #none"], ...] },
  "new_polities": { "<name>": { "color": "...", "capital": "...", "era_span": "1600 - 1902", "peak_area": "...", "regime": "...", "desc": "...", "capital_evol": "...", "institutions": "...", "fiscal_tax": "...", "peak_demography": "...", "treaties_campaigns": "...", "confidence": {"level": "史料确证 | 学界推测 | 传说", "note": "..."} } },
  "notes": "uncertainties, and problems you saw but did not fix"
}
```

**Keys and precedence**
- More specific keys win, year by year: `@region` < ISO3 < admin code < unit_id.
- A province cut by a historic-region boundary has several pieces (unit ids like `IR-07~fars`). Its admin code (`IR-07`)
  covers all of its pieces.

**Rows**
- Each row is `[fromYear, toYearExclusive, holder]`.
- Years are integers. BC years are negative. There is no year 0. `toYearExclusive` must be ≤ 1886.
- Rows under one key must be sorted and must not overlap.
- Years that no row covers keep the current value. You therefore only write the stretches that change.

**Holders**
- `"#none"` means no state, drawn as stateless. Use it for areas no state controlled.
- A holder must exist in polities.tsv or be defined in your `new_polities`.
- A row's years must fall inside the polity's era_span, allowing 10 years early or 15 years late.
- Use the database's existing names exactly. Never create a near-duplicate of an existing polity. Before adding one, search
  polities.tsv for the same state under another name.
- Polity names are standard Simplified Chinese. Each is a single state, dynasty or empire: no "诸国", no "/", no umbrella
  labels.
- New entries are neutral and factual, with a color readable on a dark map.

## Standard
- Fix what a well-read historian would call plainly wrong, at the level of a province over decades.
- Where several states shared one unit, give the unit to the one that held most of its area. If no state held a clear
  majority, use `#none`.
- Vassals and tributaries: if the vassal fills the unit and governed itself (e.g. Wallachia under the Ottomans), draw the
  vassal. Draw the overlord only where it governed directly.
- Do not chase contested years. Do not write rows for Taiwan (`taiwan`, `TWN`).
- Check your JSON parses: `node -e "JSON.parse(require('fs').readFileSync('<path>','utf8'))"`.
- Also check with a short script that keys exist, rows are sorted and non-overlapping, holders exist, and years fit the
  era_span.
- Do not run any command that reads hardware or sensor data.

Reply in two or three lines: the keys, rows and new polities you wrote, the most important changes, and the main
uncertainties.
