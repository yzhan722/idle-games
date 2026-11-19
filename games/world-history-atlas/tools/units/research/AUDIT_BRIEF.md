# Brief: fact-check the historic regions before 1886 (World History Atlas)

The atlas (`C:\Project\idle-games\games\world-history-atlas`) is a Chinese-language historical map. The map is drawn as 569
units: provinces or states in 9 big countries, whole countries elsewhere. Every unit belongs to one of 105 coarse **historic
regions**. Before 1886, a unit shows its region's hand-entered holder, unless an override row says otherwise. From 1886 a
separate dataset is used and is out of scope.

That hand data has errors. Here are known examples from the Egypt region:
- Lower Egypt shows the Assyrian Empire for 700–612 BC. The Kushite 25th Dynasty actually ruled Egypt c. 715–664 BC; Assyria
  only held it c. 671–656 BC.
- Egypt shows "(无国家) 伊赫什德王朝" for 936–978 and "(无国家) 法蒂玛王朝" for 979–1186. These are real states, but
  they are drawn as stateless because no polity entry exists for them. The Fatimid conquest of Egypt was also in 969, not 979.

Your job: audit every region in your area from 3000 BC to 1885, and write override rows that fix real errors. Do not edit
any repo file. Write only your output file.

## Inputs (read them first)
All under `C:\Project\idle-games\games\world-history-atlas\tools\units\`:
- `out\r4\region_timeline.tsv`: what each region shows now, as from / to (inclusive) / holder.
  "(无国家) X" means no state is drawn, with culture label X. These are already the engine's final values; existing unit
  override rows are not included.
- `out\r4\units.tsv`: every unit, with unit_id, name, admin_code and region_id. A country split by region boundaries has ids
  like `EGY~lower_egypt`.
- `out\r4\polities.tsv`: every polity in the database, with its era_span ("前" = BC).
- `pre1886.mjs` and `research\pre_africa.json`, `research\pre_americas.json`, `research\pre_asia.json`: override rows that
  already exist. They are mostly early-modern. Don't repeat them. They beat your region-wide rows for their own units,
  because a more specific key wins. If one is wrong, say so in notes, or override it with a unit-id key.
- `out\POLITY_BRIEF.md`: the format and tone for new polity entries.

## What counts as an error (fix these)
1. **A real state drawn as stateless.** A dynasty or kingdom that actually governed the area (Fatimids, Almoravids,
   Idrisids, Kingdom of Georgia, Shirvanshahs, Bagratid Armenia, ...) but shows as "(无国家) ...".
   - Add the polity. If it is missing from polities.tsv, define it in `new_polities`.
   - Leave genuine patchworks as stateless: city-state mosaics, tribal confederations without a state, "诸国并立".
2. **A wrong holder.** For example, an empire shown in a region it never controlled, or the wrong dynasty.
3. **Wrong dates.** A transfer of power off by more than about 5 years for a well-dated event (a conquest, a founding, a
   fall).
4. **A region too coarse for its pieces.** The region shows one state, but the country pieces inside it had different
   holders. For example, south_caucasus covers Georgia, Armenia and Azerbaijan. Use country or unit keys for these.

Do not chase small border nuances or contested years where scholars disagree. Fix what a well-read historian would call
plainly wrong.

## Output: one JSON file (path given in your task)
```json
{
  "rows": {
    "@lower_egypt": [[-715, -671, "库施麦罗埃王国"], [-671, -656, "亚述帝国"], [969, 1171, "法蒂玛王朝"]],
    "GEO": [[1008, 1241, "格鲁吉亚王国"]]
  },
  "new_polities": { "法蒂玛王朝": { "color": "...", "capital": "...", "era_span": "909 - 1171", "...": "...", "confidence": {"level": "史料确证", "note": "..."} } },
  "notes": "uncertainties, and problems you saw but did not fix"
}
```

**Keys**
- `@<region_id>`: every unit of that region (the lowest precedence).
- An ISO3 or admin code (`EGY`, `IN-UP`): all pieces of that country or province.
- A `unit_id` (`EGY~lower_egypt`): that piece only.
- More specific keys win, year by year.

**Rows**
- Each row is `[fromYear, toYearExclusive, holder]`.
- Years are integers. BC years are negative. There is no year 0. `toYearExclusive` must be ≤ 1886.
- Rows under one key must be sorted and must not overlap.
- Years that no row covers keep the region's current holder. You therefore only write the stretches that change.

**Holders**
- `"#none"` means no state, drawn as stateless. Use it where the region shows an empire that never ruled that area.
- A holder must exist in polities.tsv or be defined in `new_polities`.
- A row's years must fall inside the polity's era_span, allowing 10 years early or 15 years late. Extend the era_span in
  your new polity entry if needed. To flag an existing polity's wrong era_span, say so in notes.
- Use the same polity name the database already uses. Do not invent a near-duplicate, such as a second name for the
  Abbasids.

## Rules
- Polity names are standard Simplified Chinese. Each is a single state, dynasty or empire: no "诸国", no "/", no umbrella
  labels.
- New polity entries have the full fields from POLITY_BRIEF.md plus `era_span` and `confidence` ({level: 史料确证 | 学界推测 |
  传说, note}). They are neutral and factual, with a color readable on a dark map.
- Taiwan (`taiwan`, `TWN`) is out of scope: never write rows for it.
- Check your JSON parses: `node -e "JSON.parse(require('fs').readFileSync('<path>','utf8'))"`.
- Do not run any command that reads hardware or sensor data.

Reply in two or three lines: the keys, rows and new polities you wrote, the most important fixes, and the main
uncertainties.
