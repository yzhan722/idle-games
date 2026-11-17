# Brief: fact-check modern polity entries (World History Atlas)

`C:\Project\idle-games\games\world-history-atlas\src\data\empires_db.js` (read-only for you) received 150 new modern
country entries written quickly; some numbers were written from memory. `src/data/confidence.js` holds their
confidence notes. Your list of polity names is in the file given in your task (tab-separated: name, era_span, code).

For each polity in your list, check every field: capital, era_span (only flag, do not change the span itself),
peak_area, regime, desc, capital_evol, institutions, fiscal_tax, peak_demography, treaties_campaigns, and the
confidence note. Verify facts against reliable sources (use web search / fetch where available: official statistics,
UN data, Britannica, Wikipedia with its citations). Pay special attention to: population figures and their years,
areas, dates of independence/coups/constitutions, events dated 2024–2026, and anything stated as fact that is uncertain.

## Output: JSON at the path given in your task
```json
{
  "fixes": { "<polity name>": { "<field>": "corrected full text of that field" } },
  "confidence_fixes": { "<polity name>": "corrected full confidence note" },
  "checked": ["every polity name you checked"],
  "notes": "what you changed and why, one line per polity; and anything you could not verify"
}
```
- Give the full replacement text of a field, in the same style and language (Simplified Chinese), not a diff.
- Change only what is wrong or unsupported; keep correct text as it is. If a claim cannot be verified, soften or remove it.
- No emoji; neutral tone. Do not edit any repo file. Check the JSON parses with node.
- Do not run any command that reads hardware or sensor data.

Reply in one or two lines: how many polities checked, how many fields fixed, main issues.
