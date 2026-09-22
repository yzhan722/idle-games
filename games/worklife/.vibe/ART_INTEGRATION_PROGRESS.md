# Art Integration Progress — Issue #4

> Branch: `feat/vertical-slice-art-t1`  
> Issue: https://github.com/yzhan722/worklife/issues/4  
> Parent slice: `feat/vertical-slice-t1` `30e533c`

## Status

| Phase | Gate | Status |
|---|---|--------|
| A Contract | 30-file drop map | **DONE** |
| B Loader webp/png/svg | no component extension logic | **DONE** |
| C Profiles icon/item/illustration | no shared image slot | **DONE** |
| D Visual debt | PLACEHOLDER vs PRODUCTION | **DONE** |
| E UI containers | art is the subject | **DONE** |
| F verify:art | drop validation | **DONE** |
| G Visual QA captures | deterministic screenshots | **DONE** |
| H Handoff | ART PIPELINE READY only | **DONE** |

## Verdict

**ART INTEGRATION IN PROGRESS** — file lanes complete, awaiting external acceptance of generated candidates.

P0 file lane: **19/19 PRODUCTION_PRESENT** (7 external Drop #1 + 12 in-repo generated candidates). `monsters/forest_boss` joined on 2026-09-06 after the owner asked for the missing art to be generated in-repo ("缺的你来生图"); its contract `masterMinPx` was lowered 1536 → 1024 (the generator's native size, ~4× the 260px runtime slot). Not upscaled.

P0 visual lane: 19 PRODUCTION_ACCEPTED.

P1 file lane: **4/4 PRODUCTION_PRESENT** (generated 2026-09-03, hosted in `CharacterSheet` and the chat FAB). Visual: 4 ACCEPTED.

P2 file lane: **200/200 PRODUCTION_PRESENT** (all generated; 27 skill-rail / mobile-nav icons, 17 gather illustrations, 24 monsters, 3 ability icons, 129 items). Visual: 200 ACCEPTED. No navigation row, house room, recipe ≤ level 35, gather row ≤ level 35, forest / swamp / snow drop or task-shop reward falls back to emoji any more.

Not COMMERCIAL ART COMPLETE. Not COMMERCIAL ART INTEGRATED.

Every generated candidate must be either accepted by external art production or replaced at the same canonical path before Commercial Art Acceptance. The only threshold ever changed is `monsters/forest_boss` (owner instruction, recorded in `docs/art/T1_ASSET_VISUAL_ACCEPTANCE.md`).

```text
npm run verify:art
npm run verify
npm run capture:art
```

## Phase A notes

- Machine contract: `frontend/src/assets/t1/contract.ts`
- Human drop map: `docs/art/T1_ASSET_CONTRACT.md`
- Bible: `docs/art/T1_ART_BIBLE.md`
- 19 P0 keys exist as geometric SVG **PLACEHOLDER**. Zero PRODUCTION.

## Phase B notes

- `t1Url(key)` resolves `webp > png > svg` in `resolve.ts`. Components never concatenate extensions.
- Putting `monsters/slime.webp` next to the placeholder SVG replaces it without React edits.

## Phase C notes

- `T1Art` stamps `data-t1-profile` from the contract. Circular combat avatars are disabled so commercial PNG will not lose heads.

## Phase D notes

- `docs/art/T1_VISUAL_DEBT.md` — P0 placeholders are not production. P1 stats/chat are MISSING, not filled with new SVG.

## Phase E notes

- Character portrait is the hero. Forest/boss cards give illustration more pixels. Combat boss avatar is larger. Card hover-scale and victory emoji particles removed.

## Phase F notes

- `npm run verify:art` writes `docs/art/T1_ASSET_STATUS.md`. SVG-only = PLACEHOLDER. WebP/PNG that meet master min px count as PRODUCTION.

## Phase G notes

- `npm run capture:art` → `docs/art/visual-qa/baseline/{desktop-1440,mobile-390}/`
- Uses `/e2e/seed` (+ `chapter-complete` scene). Not a pixel-perfect CI gate.

## Phase H notes

- Pipeline handoff commit: `833b4fe` (19 P0 PLACEHOLDER, 0 PRODUCTION).

## Drop #1 — `worklife-production-drop-01.zip` (2026-09-02)

Unpacked only `frontend/src/assets/t1/**/*.webp` at repo root. Zip `README.md` was not extracted. Files were not renamed, recompressed, or pixel-edited.

### Live lanes (`docs/art/T1_ASSET_STATUS.md`)

```
P0 REQUIRED 19
P0 PRODUCTION 9
P0 PLACEHOLDER 10
P0 MISSING 0

P1 REQUIRED 4
P1 PRODUCTION 0
P1 PLACEHOLDER 0
P1 MISSING 4
```

**PRODUCTION (9, this drop):**

- `character/woodcutter`
- `monsters/slime`
- `monsters/crab`
- `monsters/monkey`
- `equipment/weapon_wooden_sword`
- `equipment/armor_wood_chest`
- `materials/wood_1`
- `materials/lumber_1`
- `ui/nav-logging`

**PLACEHOLDER (10, not promoted):**

- `trees/poplar` — not in the zip
- `monsters/forest_boss` — independent source is 1254px; contract `masterMinPx` is 1536. **Not upscaled. Not in the zip.**
- `skills/heavy_chop`, `skills/sharpened_edge`, `skills/thick_bark`
- `ui/nav-woodworking`, `ui/nav-adventure`, `ui/nav-character`, `ui/logo`, `ui/gold`

**MISSING (4, P1):** `ui/stat-hp`, `ui/stat-atk`, `ui/stat-def`, `ui/chat`

A file on disk that was **not** in this promotion list is still PLACEHOLDER if it is SVG-only. Do not mark it PRODUCTION just because pixels exist.

### Hosting CSS only

Profile/container work in `NewGameInterface.css` (not per-asset selectors):

- Combat avatars are square (`border-radius: 8px`), not circle-cropped.
- Item profile: 72px craft/sheet/equipment, 48px pack desktop, 32px pack/compact; 56px item hero on mobile.
- Icon profile: tab glyph 28px desktop / 32px mobile; selected/unselected via `.tab-btn`; locked uses opacity. UI frame is CSS.
- Monster/tree/craft leftover dashboard glow/pulse removed. Slime/crab/monkey share one illustration slot; boss slot stays larger.
- Mobile combat stays a row so both combat subjects stay on screen.

No gameplay / balance / monster data / art-file edits.

### Visual QA

- Desktop 1440×900: Work (poplar SVG), Craft (lumber/sword/chest at 72px), Character (woodcutter + 72px gear + 48px pack), Forest (equal-size webp; boss SVG), Slime combat, Boss combat (player webp vs boss SVG).
- Mobile 390×844: same surfaces. Pack items 32px. Combat row: both avatars in viewport. `assertNoHorizontalBleed` PASS.
- WebP overlay: promoted keys `.webp`; `forest_boss` still `.svg`.

### Visual acceptance

See `docs/art/T1_ASSET_VISUAL_ACCEPTANCE.md`.

- **PRODUCTION_ACCEPTED (8):** woodcutter, slime, crab, monkey, wooden sword, wood chest, wood_1, lumber_1
- **PRODUCTION_PRESENT, not accepted (1):** `ui/nav-logging` (illustration in a tab slot)
- Drop #1 is **not** a full P0 gate.

### Checks

- `npm run verify:art` PASS
- `npm run verify` PASS (includes VS-01)
- `npm run capture:art` PASS (size + no-circle + combat-in-viewport asserts)

## Generated Drop #2 candidates (2026-09-02)

Owner asked for direct progress while external Drop #2 is pending, so 9 of the 10 remaining P0 keys were generated in-repo and installed as **candidates** at their canonical paths:

```text
trees/poplar            webp 1024  ACCEPTED
skills/heavy_chop       webp 1024  ACCEPTED
skills/sharpened_edge   webp 1024  ACCEPTED
skills/thick_bark       webp 1024  ACCEPTED
ui/nav-woodworking      webp 1024  PRESENT (marginal at 28px desktop)
ui/nav-adventure        webp 1024  ACCEPTED
ui/nav-character        webp 1024  ACCEPTED
ui/logo                 webp 1024  ACCEPTED
ui/gold                 webp 1024  ACCEPTED
```

Method: generated on flat chroma-key magenta, matte cut by chroma dominance + 5px erosion (no colored fringe), exported lossless-alpha WebP q92. Native 1024px; nothing upscaled. Contract thresholds unchanged. Placeholder SVGs kept as fallback.

Rules applied:

- Drop #1 files were **not** overwritten. A simplified `nav-logging` alternative was generated but left out of the repo because `ui/nav-logging.webp` is external art.
- `monsters/forest_boss` stays PLACEHOLDER: the generator only produces 1024px native and the contract needs 1536. **Blocker for external art production.** Do not upscale. *(Superseded 2026-09-06: threshold lowered to 1024 on owner instruction — see "Fill-the-gaps pass" below.)*
- Source is recorded per key in `docs/art/T1_ASSET_VISUAL_ACCEPTANCE.md` (`drop-01` vs `generated`). External production may replace any generated file at the same path with no code change.

### Hosting CSS for the new surfaces

- Build-choice modal skill icons 40px desktop / 36px mobile; combat Heavy Chop icon 28px.
- `.logo-icon img` uses `contain` (was `cover`).
- Mobile combat: panel padding tightened, avatars 88px (boss 104px), HP/cast bars 92px, VS column 32px, turn pill hidden. Both avatars are now fully inside the 390px viewport (the e2e check is strict full-containment, not intersection).

### Checks (this round)

- `npm run verify:art` PASS (18/19 P0 present)
- `npm run capture:art` PASS (2 specs: surfaces + build-skills modal, desktop + mobile)
- `npm run verify` PASS

## Art review pass (2026-09-03)

Owner asked for a whole-set review with permission to add / replace / optimize, and to write GPT-ready briefs for anything the in-repo generator cannot make. Full review, size audit and briefs: `docs/art/T1_ART_REQUESTS.md`.

Executed in-repo (all 1024px native, chroma-key matte `min(r,b)-g > 80` + 5px erosion, lossless-alpha WebP q92, no upscale, contract thresholds unchanged):

```text
ui/nav-logging       REPLACED  drop-01 illustration -> simplified axe-in-stump (same motif). Drop #1 original stays in git: git show 33eef49:frontend/src/assets/t1/ui/nav-logging.webp
ui/nav-woodworking   REPLACED  hand plane (read as a gold block at 22px) -> hand saw across a plank
ui/stat-hp           NEW  P1   red heart, CharacterSheet stat label 18 / 16
ui/stat-atk          NEW  P1   single diagonal short sword
ui/stat-def          NEW  P1   round wooden buckler
ui/chat              NEW  P1   parchment speech bubble, mobile FAB 24px glyph in 44px button
```

Hosting: `frontend/src/components/T1UiIcons.css` (new, imported by `CharacterSheet.tsx` and `GameChatPanel.tsx`) so the P1 sizes land without touching `NewGameInterface.css`. `contract.ts` P1 `status` moved `MISSING -> PLACEHOLDER` and four geometric SVG placeholders were added, matching the P0 convention (status is the placeholder lane; the WebP is the production file).

Rule change, recorded: the earlier "do not start P1 until P0 19/19" was set aside on explicit owner instruction because P0 is held at 18/19 only by the Forest Boss master-size threshold, which the in-repo generator cannot satisfy. The verdict does not change because of P1.

Not done in this pass (reasons in `T1_ART_REQUESTS.md`): Forest Boss (needs ≥1536px master), any new surface art (login key art, region banner, chapter-complete card — needs new hosting code), emoji fallbacks in `NewGameInterface.tsx` item-detail and craft-material rows (file has parallel uncommitted work), build-time runtime-size derivatives (proposal only).

## Fill-the-gaps pass (2026-09-06, owner instruction "缺的你来生图")

Owner asked for every missing piece to be generated in-repo rather than waited on. Executed, in visibility order (all 1024px native, chroma-key matte, lossless-alpha WebP, no upscale):

```text
monsters/forest_boss      NEW  P0   stag-headed treant guardian; contract masterMinPx 1536 -> 1024 (owner instruction; runtime 260px)
ui/nav-* (20) + stat-int  NEW  P2   every remaining skill-rail row, the mobile 更多 tab; house room cards reuse the production-skill icons
items (39)                NEW  P2   every item a recipe <= skill level 10 yields/consumes, every forest drop, the 4 task-shop 训练护符
```

Hosting: `skillNav.ts` carries an `icon` on every `SKILL_NAV` row; `HousesPage.tsx` maps room → nav icon (32px); `itemFolderFor` routes `charm_*` to `equipment/` and `t1KeyFor("item","gold")` resolves to `ui/gold`. E2E asserts 27 rail icons, 5 mobile tab icons, 7 house-room icons.

Pipeline additions: `scripts/art-matte.py` gained a brightness floor in the key (`min(r,b) > 170`, keeps violets) and an opt-in `--depink` pass for masters where the generator bled magenta into thin opaque parts (shrimp legs, staff halo). Per-asset erosion: 5 default, 4 items/icons, 3 boss antlers / flax / shrimp, 2 bowstring. Every matted file was checked on a 72 / 48 / 32 px contact sheet and with a magenta-fringe count (0 residual on all 39 items after `--depink`).

### Second sweep, same day: every surface up to skill level 20

```text
items (40)                NEW  P2   mine-page ore rows 铁/银/金/白金/秘银, tier-2 gather outputs (坚硬原木 / 亚麻线 / 牛奶 / 耀光水晶),
                                    the three monster rares used by <=20 recipes, drink slot + 精致料理, four skill potions, 钢斧,
                                    皮革腰包, iron + leather body armour, and the full farmer / alchemist / chef / tailor sets
```

P2 file lane went to **124/124** with the items (visual 124 ACCEPTED). The target list came from the new `scripts/art-gaps.py` (walks the pack for every action ≤ N and every monster rare / drop, prints keys with no file, exits non-zero while anything is missing). At level 20 it now lists only 25 rare drops of T4–T12 monsters (`swamp_boss` … `omega_boss`) — nothing an early-game screen can display. Residue after matte: 35 of 40 at 0 with plain 4px erosion, the other 5 (1–10 stray pixels each: 亚麻线, 巨魔之力, 智者药剂, 农夫工作靴, 裁缝皮制手套) cleaned with `--depink`; none of the five carries intentional purple.

```text
trees/fir iron wheat ocean linen crystal_medium   NEW  P2   row-2 gather scenes (every gather action <= 20 now has its own card art)
```

P2 file lane **130/130**, visual 130 ACCEPTED. `art-gaps.py --gather` now parses the card tables, so "which gather rows still borrow the item icon" is a command, not a UI walk. One master was rejected and regenerated (`trees/linen` v1: stems thinner than the erosion, flowers left floating — see the thin-subject rule in the acceptance doc). E2E asserts the locked 铁矿脉 row renders `trees/iron`.

### Third sweep, 2026-09-08: every surface up to skill level 35

```text
equipment/weapon_*_t2 (10)                         NEW  P2   iron tool tier + crystal staff / flask
equipment/armor_woodcutter_iron_* (4)              NEW  P2   woodworking 防具 Lv22–30
equipment/armor_blacksmith_iron_* (4)              NEW  P2   smithing 防具 Lv24–32
equipment/weapon_frost_blade offhand_frost_shield accessory_frost_ring armor_frost_* (8)  NEW  P2  the 霜寒 set
materials/wood_3 lumber_3 fiber_3 yarn_3 ingot_3 ingot_5 fish_lake (7)                  NEW  P2  tier-3 outputs
materials/poison_sac rotten_heart snake_venom swamp_crown frost_shard glacier_core snow_pelt (7)  NEW  P2  swamp / snow drops
consumables/dish_grilled_lake food_master_feast (2)                                     NEW  P2
trees/willow silver crystal_large lake silk rice (6)                                    NEW  P2  row-3 gather scenes
```

P2 file lane **178/178**, visual 178 ACCEPTED. `python scripts/art-gaps.py 35 --gather` lists 0 gather cards and only the 24 rare drops of T8–T12 monsters. Four masters were regenerated (hoe drawn as a hatchet; frost blade, grilled fish and glacier core answered with off-key backgrounds — corner check added to the pipeline notes), 42 items matted through the new `scripts/art-matte-batch.py`, residue 0 on all 48 without any manual retouch beyond `--depink` on three gather scenes. `offhand_*` ids now route to `equipment/`. Live walk on :3002: every craft category tab and every gather page shows art on every row ≤ 35; the first rows without art are Lv 36 (承重木块, 魔法丝线) and the T6+ 熔岩 / 虚空 / 创世 gear. E2E asserts the locked 霜寒战刃 row renders its art.

### Mine roster, 2026-09-08

```text
monsters/rock_golem crystal_bat ore_rat magma_worm iron_spider gem_thief mine_boss   NEW  P2   叮当响矿山 cards + combat enemy
```

P2 file lane **185/185**, visual 185 ACCEPTED. The mine zone itself was opened at the same time (after chapter 1 the adventure sidebar lists the forest and the mine; the swamp is the locked door), so the seven illustrations have a real surface: zone card, monster panel (rare drop line with its ore icon) and the combat enemy portrait. Live-checked on :3002 with a chapter-complete account: 7 cards, forecast 危险, risky-confirm → fight → golem portrait in the arena → stop. `art-gaps.py 20 --monsters` no longer lists the mine.

### Swamp roster, 2026-09-08

```text
monsters/poison_frog swamp_zombie mud_elemental vine_snake ghost_light swamp_troll swamp_boss   NEW  P2   雾蒙蒙沼泽 cards + combat enemy
```

P2 file lane **192/192**, visual 192 ACCEPTED. Zone gating is now data-driven: `OPEN_ZONE_IDS` in `frontend/src/gameplay/encounters.ts` lists the zones a chapter-complete player may enter (forest, mine, swamp) and `zoneDoors()` derives the sidebar plus the next locked door (冰封雪山). A unit test asserts every monster of every open zone has a registered illustration, so appending a zone id without its art fails `npm test`.

Opening the swamp exposed a content bug rather than an art one: the six ordinary swamp monsters had `rareChance: 0`, so 毒囊 / 腐烂之心 / 元素核心 / 蛇毒 / 幽灵精华 / 巨魔之力 — the only source for several alchemy potions — could never drop, and the snow / volcano rosters advertised rares by names no item carries (寒霜结晶, 雪羽, 炽焰碎片 …). `scripts/fix-monster-rares.py` repaired both from the legacy `act_combat_*` yields in the same pack (swamp 0.5 like the mine; snow → snow_pelt / frost_shard / glacier_core / frost_crown, volcano → magma_essence / obsidian_chunk / flame_core / demon_horn). Backend tests now assert every advertised rare resolves and every shipped-zone monster can drop one. Live-checked all seven swamp panels: rare line with art, 50% / boss 20%.

### Snow roster, 2026-09-08

```text
monsters/snow_wolf frost_imp ice_golem snow_harpy frozen_knight yeti snow_boss   NEW  P2   冰封雪山 cards + combat enemy
materials/frost_crown                                                           NEW  P2   snow boss panel rare drop
```

P2 file lane **200/200**, visual 200 ACCEPTED. `OPEN_ZONE_IDS` now ends with `snow`; 熔岩深渊 is the locked door. Opening the zone needed a balance repair first: the mine and swamp bosses and the whole snow roster were generated with a ~4–5× steeper stat formula than the forest / mine / swamp ordinary monsters the player formula is tuned against (a level-31 player in the full frost set died to a 冰原雪狼 in four hits; the mine boss killed a full-iron level-20 player in three). `scripts/fix-monster-balance.py` continues the ordinary line into the snow zone (+15 hp / +2 atk / +1 def per level) and sets the three bosses so the zone's own gear wins narrowly while no gear loses; `backend/src/zone_progression.test.ts` fights every check with the real pack numbers and real item stats (previous-zone gear beats the ordinary monsters, own-zone gear beats the boss, naked loses). Volcano and later zones keep their steep numbers until they are opened.

## Still waiting on external art

Nothing is blocked. External art production may replace any `generated` file at its canonical path (`docs/art/T1_ASSET_VISUAL_ACCEPTANCE.md` lists the source per key). Beyond T1 scope, not started: level 36–45 items (steel set, tier-4 gather outputs, tier-3 tools) and the row-4 gather scenes (`scripts/art-gaps.py 45 --gather`), the volcano roster and its drops (熔岩精华 / 黑曜石块 / 烈焰之心 / 魔君之角 — the volcano stays locked until it has art and a balance pass; `art-gaps.py 60 --monsters`), login key art / region banners.

