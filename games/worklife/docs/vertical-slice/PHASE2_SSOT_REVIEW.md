# Phase 2 — Gameplay data SSOT

> Branch: `feat/vertical-slice-t1`  
> Evidence: `docs/vertical-slice/phase2/`

## Code check

- `NewGameInterface.tsx` no longer contains `monstersByMap` or a hardcoded map table.
- Adventure list is `encounterStages(contentPack)` from pack `monsters[]` + `stages[]`.
- GET `/content` also returns precomputed `encounterStages`.
- Forest T1 archetypes are on the pack: slime `ordinary`, crab `tank`, monkey `fast`, forest_boss `boss` with `mechanics: ["guard_60","nature_wrath_30"]` (data only until Phase 4).

## Tests

- Backend: slime HP/ATK from pack, mushroom name `生气蘑菇精`, archetypes distinct, frontend file has no second combat table.
- Playwright capture `e2e/captures/phase2-ssot.spec.ts` (VS_CAPTURE=1): pack name + slime HP 100 / ATK 8 / type ordinary.

## Product / screenshots

| Viewport | File | What it shows |
|----------|------|----------------|
| 1440 | `desktop-1440/01-forest-pack-names.png` | Forest grid uses pack names (`生气蘑菇精`) |
| 1440 | `desktop-1440/02-slime-pack-stats.png` | Modal HP/ATK/DEF/type from pack |
| 390 | `mobile-390/01-forest.png` | Same data; layout is still squeezed desktop (Phase 7) |

## Not done here (later phases)

- Combat is still a client HP bar + 12s life-action.
- 11 maps still visible; default tab still 冒险.
- Trees still hardcoded in React (gather presentation, not combat numbers).
