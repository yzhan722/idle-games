# Brief: documented links between historical figures (World History Atlas person view)

The atlas (`C:\Project\idle-games\games\world-history-atlas`) has a person view of about 200 historical figures. Their
data is in `tools\persons\data\<id>.json`: id, name, life and dated stops. A panel will list each person's
"相关人物" (related people): other figures **in this set** whom they met or dealt with directly, with the year and one
line on what happened. The reader can then open that person, or put both routes on the map side by side.

Your job: find these links and write them all to one file:
`C:\Project\idle-games\games\world-history-atlas\tools\persons\links.json`.
Do not edit any other file.

## What counts as a link
- **Direct personal contact attested in sources.** Examples:
  - they met, served one another, fought each other in person, or negotiated;
  - teacher and student, or ruler and envoy;
  - a documented exchange of letters.
- Both people must be in the set. Read the file list and names first.
- One entry per pair and occasion. Put the year when the contact happened, which must fall within both lives.
  - A long relationship (e.g. 卫青 and 霍去病 campaigning together) gets one entry, at its first or most important year.
    Add a second entry only for a distinct later occasion.
- **Not links:**
  - influence across time (Plato reading Socrates is a link because they met; Napoleon admiring Caesar is not);
  - merely living at the same time, or being in the same city without evidence of meeting;
  - legend: famous but unattested meetings are out, or marked 传说 only if the tradition itself is the point.
- Precision over quantity. Expect roughly 100–250 links. Isolated figures with no links are fine.

## Format
A JSON array:
```json
[
  { "a": "zhang-qian", "b": "wei-qing", "year": -123, "note": "张骞以校尉从大将军卫青击匈奴，因知水草处，军得以不乏，封博望侯。",
    "confidence": "史料确证", "source": "《史记·卫将军骠骑列传》" }
]
```
- `a` and `b` are person ids. The year is an integer, BC negative, no year 0, and must not be after 1949.
- `note`: one neutral sentence in Simplified Chinese. No emoji, no HTML.
- `confidence`: 史料确证, 学界推测 or 传说.
- `source`: a primary text or standard biography.

## Checks
- The JSON parses.
- Every id exists.
- The year falls within both lives (born-1 .. died+1).
- There are no duplicates (same pair and same year).

Do not run any command that reads hardware or sensor data. Reply in two lines: how many links, and the main uncertainties.
