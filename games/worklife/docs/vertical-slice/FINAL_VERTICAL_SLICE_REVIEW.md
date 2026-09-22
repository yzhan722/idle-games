# Final Vertical Slice Review — Issue #2

> Branch: `feat/vertical-slice-t1`  
> Phase 10: `0e8fb51` `test: verify the complete T1 vertical-slice journey`  
> Scored: 2026-09-02  
> Scores are not all 10/10. Floors are Issue #2 Phase 11. No dimension is below its floor.

## Scorecard

| Dimension | Score | Floor | Why not 10 |
|---|---:|---:|---|
| First 10 min clarity | **8.5** | 8 | Guest lands on 伐木 with one tree and a Next Goal. Craft stays locked until first wood. Still no spoken “you are a woodcutter in another world” beat beyond copy on the goal bar. |
| Core loop | **8.5** | 8 | 伐木 → 木板 → 短剑 → 穿上 → 森林 is closed. Busy-idle first sword is ~1.2 min, not a 15-minute craft fantasy; that was a documented Phase 3 choice, not padding with identical chops. |
| Progression feedback | **8.5** | 8 | Ten chapter goals, unlock sounds, level-up cue. Career / T2 stay behind 生涯 until chapter complete. Goal bar copy is the main teacher; there is no celebration unique to “第一章完成” beyond the goal swap. |
| Crafting meaning | **8.0** | 8 | Sword preview is ATK 5 → 10. Chest is DEF 0 → 8. Board card says it is for the sword. Quantity-1 craft still only runs one cycle (players must use 最大 or wait). |
| Combat depth | **7.5** | 7 | Woodcutter only: auto-attack, 重劈 (8s CD, server-checked), one binary build. Not a six-class RPG. No positional play. |
| Boss distinction | **8.0** | 8 | Guard @60% (`格挡中` + 重劈) and Nature Wrath @30%. Not a HP sponge. Unique guaranteed item is still only XP/gold (100 / 200); rare `创世水晶` is 10% and T2-named. |
| Desktop IA | **8.5** | 8 | Four domains. After boss: four forest cards + locked 矿山 door, not eleven maps. `NewGameInterface.tsx` is still the composition god-object. |
| Mobile UX | **7.5** | 7.5 | Bottom four tabs, always-visible activity bar, character is a page, inventory is a sheet, 390px no horizontal bleed in VS-01. Chat is still a “聊” FAB, not a T1 icon. |
| Visual coherence | **7.0** | 7 | One dusk-workshop plate (ink / amber / moss geometric SVG). Same game with text covered. Not unique illustrated characters. `CardArt` remains fallback for ores / later recipes. Chat / career still use leftover emoji. |
| Technical stability | **9.0** | 9 | `npm run verify` PASS (backend 49, frontend unit 15, frontend build, Playwright 7 including VS-01 ~59s). Docker CLI is missing on this host (environment, same as Issue #1). Gather trees/ores/crops presentation tables still live in React. |

## Release Gate checklist

### Gameplay

- [x] New guest can finish chapter 1 without README (VS-01, no seed).
- [x] Five growth beats: first wood, first board, first sword + ATK change, first kill + build, chest + boss.
- [x] First equipment changes ATK 5 → 10; unarmed slime LOSS, sword slime WIN (`scripts/simulate-first-hour.ts`).
- [x] Build choice: 开刃 vs 厚树皮, locked once (`hp_combat.test.ts`).
- [x] Forest Boss two mechanics (`guard_60`, `nature_wrath_30`) server-authoritative.
- [x] Chapter complete: `data-goal-id=complete`, 矿山（下一章） door only.

### UX

- [x] Desktop primary nav = 工作 / 制作 / 冒险 / 角色.
- [x] Reputation / bounties / prestige / party / trading are not first-hour primary.
- [x] Next Goal always on screen (`data-goal-id`).
- [x] Mobile bottom tabs + activity bar (not desktop-crushed).
- [x] 390×844: `assertNoHorizontalBleed` in VS-01.

### Visual

- [x] Primary nav: four `img.t1-art`, no system emoji.
- [x] Woodcutter / forest / wooden gear / poplar use `frontend/src/assets/t1`.
- [x] `CardArt` is fallback in `T1Art.tsx` when the key has no file.
- [x] T1 screenshots share one plate. Identity is indie geometric, not AAA.

### Engineering

- [x] Forest monster stats from content pack (`gameplay_encounters.ts` / GET `/content`).
- [x] `NewGameInterface.tsx` has no `monstersByMap`.
- [x] Issue #1 quality gate still in `npm run verify`.
- [x] VS-01 PASS without forging chapter-complete.
- [x] No product-direction blocker remaining for T1.
- [ ] Clean working tree — **after this review commit**.

## Evidence

- Desktop / mobile chapter-complete: `docs/vertical-slice/phase10/05-chapter-complete-desktop.png`, `06-chapter-complete-mobile.png`
- First action / wood / sword / slime: `docs/vertical-slice/phase10/01`–`04`
- Earlier phases: `docs/vertical-slice/phase6`–`phase9`
- Balance: `docs/vertical-slice/FIRST_HOUR_BALANCE.md`
- Last `npm run verify`: backend **49**, frontend unit **15**, Playwright **7**, VS-01 **59.0s**

## Remaining (not T1 blockers)

### Major

- `NewGameInterface.tsx` was not split into Work / Forest / combat controllers.
- `trees` / `ores` / `crops` presentation tables (duration, XP copy) still sit in the React file. Combat/equipment numbers do not.

### Minor

- Boss has no guaranteed unique trophy item (gold/XP spike + chapter flag instead).
- Mobile chat FAB is the character “聊”.
- Geometric SVGs, not painted characters.
- This host has no Docker CLI.
- `origin/main` was still the Issue #1 import; branch is cut from RC `feat/progress-hardening` `270c5b1`.

## Verdict

All scored dimensions meet Issue #2 floors. Release gates that can be proven in this repo are met.

**VERTICAL SLICE READY** after the Phase 11 commit lands on a clean tree.

Do not start T2 (guild / PVP / pets / new class / new map / payments).
