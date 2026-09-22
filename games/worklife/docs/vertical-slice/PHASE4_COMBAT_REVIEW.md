# Phase 4 — Woodcutter combat

> Server-authoritative HP combat. Client cannot submit damage numbers.

## Code

- `backend/src/hp_combat.ts`: basic attack, 重劈 (8s CD, 2.2×), 开刃 / 厚树皮, Forest Boss 格挡@60% + 自然之怒@30%.
- GET `/player/state` ticks combat, including sub-second polls.
- POST `/combat/hp/start|skill|build|flee`. `damage` on skill is ignored.
- React no longer rolls combat damage locally.

## Tests

`npx tsx --test src/hp_combat.test.ts`

- Sword slime WIN, unarmed LOSS
- Heavy chop cooldown
- Boss guard then wrath
- Build choice locked

## Product

Capture: `VS_CAPTURE=1 npx playwright test e2e/captures/phase4-combat.spec.ts`

Still missing for later phases: Next Goal, 4-domain IA, mobile-first chrome, T1 art, sound.
