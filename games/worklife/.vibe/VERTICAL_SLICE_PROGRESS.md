# Vertical Slice Progress — Issue #2

> Branch: `feat/vertical-slice-t1`  
> Parent RC: `feat/progress-hardening` `270c5b1`  
> Issue: https://github.com/yzhan722/worklife/issues/2

## Status

| Phase | Gate | Status |
|-------|------|--------|
| 0 Baseline | screenshots + BASELINE_REVIEW | **DONE** (`f43050b`) |
| 1 First-hour design | FIRST_HOUR_DESIGN.md | **DONE** (`6a8b317`) |
| 2 SSOT gameplay data | no React monster/equip numbers | **DONE** (`ad017ea`) |
| 3 Economy + simulation | simulate-first-hour.ts | **DONE** (`c9b1be2`) |
| 4 Woodcutter combat + boss | Heavy Chop, build, 2 boss mechanics | **DONE** (`fb26d57`) |
| 5 Onboarding / Next Goal | chapter objectives | **DONE** (`3a529c8`) |
| 6 Desktop IA ≤ 4 domains | Work/Craft/Adventure/Character | **DONE** |
| 7 Mobile-first nav | 390 bottom tabs | **DONE** |
| 8 T1 art system | assets, CardArt fallback only | **DONE** |
| 9 Feedback / sound | event sounds | **DONE** |
| 10 VS E2E + screenshots | accelerated chapter | **DONE** (`0e8fb51`) |
| 11 Scored review | FINAL_VERTICAL_SLICE_REVIEW.md | **DONE** |

## Phase 0 notes

- Re-ran Issue #1 `npm run verify` + integration **before** branching. RC READY held.
- Did not branch from `main` (stale import). See BASELINE_REVIEW.
- Capture command: `VS_CAPTURE=1 npx playwright test e2e/vertical-slice-baseline.spec.ts` (ignored in default `verify`).

## Phase 2 notes

- Deleted `monstersByMap` / hardcoded `maps` from `NewGameInterface.tsx`.
- Adventure list is projected from `contentPack.monsters` + `contentPack.stages` (`encounterStages`).
- Forest T1 archetypes live on the pack: slime ordinary, crab tank, monkey fast, forest_boss boss (`guard_60` / `nature_wrath_30` data only until Phase 4).
- GET `/content` now also returns `encounterStages`.
- Capture: `VS_CAPTURE=1 npx playwright test e2e/captures/phase2-ssot.spec.ts`

## Phase 3 notes

- Starter pack no longer gives lumber/wood. First chop is the first resource.
- `npx tsx scripts/simulate-first-hour.ts` — unarmed slime LOSS, sword slime WIN.
- Forest T1 HP/ATK retuned from that sim (see `docs/vertical-slice/FIRST_HOUR_BALANCE.md`).
- Capture: `VS_CAPTURE=1 npx playwright test e2e/captures/phase3-economy.spec.ts`

## Phase 4 notes

- Server HP combat + 重劈 CD + 开刃/厚树皮 + Forest Boss 格挡/自然之怒.
- Frontend no longer forges damage. `/player/state` is not GET-cached.

## Phase 5 notes

- Next Goal bar always visible. Default tab is 伐木.
- `npx tsx --test frontend/src/gameplay/chapter1.test.ts`

## Phase 6 notes

- Primary nav is 工作 / 制作 / 冒险 / 角色. Career is Settings until chapter 1 is done.
- Character sheet uses pack-backed combat numbers (ATK 10 with sword, DEF 8 with chest).
- Chapter 1 no longer dumps every tree, lumber recipe, or forest filler mob.
- Capture: `VS_CAPTURE=1 npx playwright test e2e/captures/phase6-ia.spec.ts`

## Phase 7 notes

- Bottom 4 tabs at ≤768px. Activity bar always visible (空闲 / 采集 / 战斗).
- Character is the main page; inventory opens as a full sheet. Chat is a FAB.
- Capture: `VS_CAPTURE=1 npx playwright test e2e/captures/phase7-mobile.spec.ts`

## Phase 8 notes

- T1Art loads files from `frontend/src/assets/t1`. CardArt is fallback only.
- Primary nav is SVG on desktop and mobile (`img.t1-art`).
- Capture: `VS_CAPTURE=1 npx playwright test e2e/captures/phase8-art.spec.ts`
- `npx tsx --test frontend/src/gameplay/t1Art.test.ts`

## Phase 9 notes

- `playGameSound` covers gather/craft/equip/level/unlock/hit/skill/boss-phase/victory/boss-win.
- Fake 胜率预测 removed. Idle activity bar does not pulse.
- Capture: `VS_CAPTURE=1 npx playwright test e2e/captures/phase9-feedback.spec.ts`

## Phase 10 notes

- `e2e/vertical-slice.spec.ts` is in default `playwright test` (not ignored).
- `E2E_FAST=1` compresses time only. VS-01 ~60s, 7/7 default E2E passed.
- After chapter complete, adventure stays forest T1 four + locked 矿山 door (does not dump the rest of the forest or 11 maps).
- Capture: `docs/vertical-slice/phase10/` (always written by VS-01).

## Phase 11 notes

- Scored review: `docs/vertical-slice/FINAL_VERTICAL_SLICE_REVIEW.md`
- No dimension below Issue #2 floors. Verdict: VERTICAL SLICE READY.
- Do not start T2.

## MWI replication pass (2026-09-04 → 09-06)

Direction changed from "vertical slice, hide the world" to "replicate Milky Way Idle": every skill,
recipe and page visible from minute one, chapter 1 guides with 推荐 tags + goal bar instead of hiding.
Research: `docs/design/MWI_RESEARCH_AND_GAP.md` (sections 1–5; §2 alignment table lists every commit).

- Nav: 17→27 rows (6 professions, 6 gathering, 5 production, 7 combat skills, 6 system pages); mobile
  five-group bottom bar with sheets (`4177ba7`).
- Combat: 7 MWI skills, 30/70 XP, derived 战斗等级, mana, ability books + trigger auto-cast, respawn
  loop (`cabbc5e` `faa9644` `9f37805`). Frontend preview is parity-tested against the server
  (`scripts/fight-preview-parity.test.ts`, 46 loadouts incl. bow / staff).
- Pages: 背包 (`faa9644`), 任务板 + 代币商店 (`934096b`), 房屋 (`d6f8df3`), 交易行 grid + 我的挂单
  (`6c102ab`), full paperdoll + hands slot (`5c2535c`).
- Fixes found by playing: recipes hidden on 5/6 production pages (`6bc6781`), bodiless DELETE → 500
  (`6c102ab`), enrage evaluated at poll granularity (`cabbc5e`).
- Phase 6/10 notes above about "does not dump every tree / recipe / forest mob" are superseded:
  trees and recipes are always listed (locked rows show the level), the full forest appears after
  chapter 1 (VS-01 asserts 7 cards, boss last).
- Enhancing rebuilt as MWI: own skill, exact +1…+20 tables, item-level modifier, reset-on-fail with
  保护镜, timed action with target level (offline), enhancer tool (`857278e` `7871bf1` `164052c`).
- Charms focus the 70% combat XP (`50827fe`). Task badge on the nav (`857278e`).
- Art: forest roster complete except the boss (1536px contract), ability / book / mirror / enhancer
  icons; `scripts/art-matte.py` is the matte step; `art-image-meta` reads VP8L (`ff0492a` `66bade6`).
- Art fill pass on owner instruction ("缺的你来生图"): forest boss generated in-repo (contract
  1536 → 1024, runtime 260px), all 27 rail / 5 mobile / 7 house-room icons, 39 tier-1 item icons
  (every recipe ≤ level 10, every forest drop, task-shop charms). P0 19/19, P1 4/4, P2 84/84
  present + accepted. `art-matte.py --depink` for key bleed in opaque pixels; `art-contact.py`
  prints the 72/48/32 contact sheet + residue count (`2d48541`).
- Second art sweep to skill level 20: 40 more item icons (mine ores, tier-2 gather outputs, drink /
  fine food, four skill potions, iron + leather body armour, farmer / alchemist / chef / tailor
  sets). P2 124/124. `scripts/art-gaps.py <level> [--monsters] [--gather]` is the gap checklist;
  at level 20 it lists only late-zone (T4–T12) monster rares (`3a1bce8`).
- Row-2 gather scenes (fir / iron vein / two flax fields / ocean shore / glow-crystal mound): every
  gather action ≤ 20 has its own card art. P2 130/130. E2E checks the locked 铁矿脉 row renders
  `trees/iron` (`ef9aa17`).
- Third art sweep to skill level 35: 42 item icons (iron tools, woodcutter / blacksmith iron sets,
  the frost set, tier-3 outputs, swamp / snow drops, lake dishes) + 6 row-3 gather scenes. P2
  178/178; `art-gaps.py 35 --gather` lists only T8–T12 monster rares. `scripts/art-matte-batch.py`
  mattes a whole id list; `offhand_*` routes to `equipment/`. E2E checks the locked 霜寒战刃 row.
- Mine zone opened (MWI lists every zone by level): after chapter 1 the adventure sidebar shows
  呼呼大睡森林 + 叮当响矿山, with 雾蒙蒙沼泽 as the next locked door. The 7 mine monsters
  (碎石傀儡 Lv11 … 矿山霸主 Lv20) got illustrations; the fight forecast marks them 危险 for a
  chapter-1 build and the risky-confirm flow guards the start. P2 185/185. VS-01 asserts the mine
  lists 7 cards with art, boss last. Phase 10/11 notes "locked 矿山 door" / "Do not start T2" are
  superseded by the owner's replicate-MWI direction — the swamp stays locked until its roster has art.
- Swamp zone opened the same way (7 illustrations; 冰封雪山 is the locked door now). Zone gating is
  the `OPEN_ZONE_IDS` list + `zoneDoors()` in `gameplay/encounters.ts`, guarded by a unit test that
  every open zone's roster has art. Content repair found on the way (`scripts/fix-monster-rares.py`):
  swamp monsters had `rareChance: 0` (their materials feed alchemy) and the snow / volcano rosters
  named rares that no item carries; both fixed from the pack's own legacy `act_combat_*` yields,
  with backend tests asserting every advertised rare resolves and every shipped-zone monster drops.
- Snow zone opened (7 illustrations + the 霜冠 drop icon; 熔岩深渊 is the locked door). Before opening
  it the stat curve had to be repaired: the mine / swamp bosses and the whole snow roster used a
  ~4–5× steeper formula than the ordinary monsters the player formula is tuned against, so even the
  zone's own gear died in three or four hits. `scripts/fix-monster-balance.py` continues the
  ordinary line into the snow zone and sets the three bosses to "own-zone gear wins narrowly, no gear
  loses"; `backend/src/zone_progression.test.ts` fights every check with real pack numbers and real
  item stats. Volcano and later keep their numbers until they open.
- E2E ports moved to 43100 / 43101 (`E2E_WEB_PORT` / `E2E_API_PORT`): Windows handed 3100 to a
  proxy's outbound socket and `--strictPort` failed at random.
- `npm run verify`: backend 124, frontend 98, E2E 7/7.
