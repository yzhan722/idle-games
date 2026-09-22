# Phase 10 — First-hour automated product check

Default `npx playwright test` now includes **VS-01**: a real guest walks the chapter 1 path on live UI + backend. `E2E_FAST=1` only shortens T1 gather/craft durations and combat intervals. It does not write chapter-complete into the save.

## Path (UI clicks)

guest → 砍小白杨 → 木板（最大数量）→ 木头短剑 → 装备主手 → 果冻史莱姆 → 厚树皮 → 蟹 / 猴 → 再伐木 → 木甲 → 装备上衣 → 森林管家（重劈）→ `data-goal-id=complete`

## Fixture

- `backend/src/e2e_fast.ts` — `act_chop_wood_t1` / lumber / sword / chest = 400ms when `E2E_FAST=1`.
- Combat intervals ×0.12, 重劈 CD 400ms. Unit tests do not set `E2E_FAST`.

## Evidence

`docs/vertical-slice/phase10/`

- 01 guest work
- 02 first wood
- 03 sword on
- 04 slime + build
- 05 chapter complete desktop 1440
- 06 chapter complete mobile 390

Last run: **7 passed** including VS-01 in **~60s**.

## Post-chapter lock (product, not a dump)

VS-01 asserts after `data-goal-id=complete`:

- `.monster-card` count is **4**
- `雾蒙蒙沼泽` is absent
- `叮当响矿山（下一章）` is visible and disabled

Chapter complete does not reveal the rest of the forest roster or later maps. Gathering still shows only 路边的小白杨.
