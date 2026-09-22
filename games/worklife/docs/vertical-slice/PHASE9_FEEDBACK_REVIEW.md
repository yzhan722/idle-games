# Phase 9 — Feedback and sound

High-value first-hour events now have distinct Web Audio cues through `playGameSound(...)`. Decorative infinite loops on the T1 chrome are off. Combat no longer shows a fake 胜率预测.

## Code

- `frontend/src/gameplay/sound.ts` — gather/craft/equip/level-up/unlock/hit/crit/skill/boss-phase/victory/boss-win.
- Respects `settings.soundEnabled` (load on enter + Settings toggle).
- `prefers-reduced-motion` already existed; Settings `animationsEnabled` still sets `body.no-animations`.
- Header activity does not pulse while idle. Cycle complete still flashes once.
- XP shine / avatar glow loops removed on T1 surfaces.
- Battle header shows pack XP/gold instead of `NaN` “累计”.

## Tests

`npx tsx --test frontend/src/gameplay/sound.test.ts`

Default UX-01 starts a slime fight and asserts 胜率预测 is absent.

Capture: `VS_CAPTURE=1 npx playwright test e2e/captures/phase9-feedback.spec.ts`

Evidence: `docs/vertical-slice/phase9/desktop-1440/` and `mobile-390/`.

## Remaining

Phase 10 must run a real UI+backend chapter 1 path in default `verify`. Sounds are short oscillators, not recorded SFX.
