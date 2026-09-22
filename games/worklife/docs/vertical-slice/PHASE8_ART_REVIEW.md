# Phase 8 — T1 art system

T1 surfaces now load real files from `frontend/src/assets/t1`. `CardArt` is only a fallback when a key has no file (ores, later recipes). Primary nav no longer uses the first character of the tab label.

## Code

- Manifest: `frontend/src/assets/t1/keys.ts` + `manifest.ts` (`import.meta.glob` URL map).
- `T1Art` / `T1ItemIcon` (`frontend/src/components/T1Art.tsx`).
- Wired: `GameActionNav`, `GameHeader` logo/gold, work/craft/adventure cards, combat portraits, 重劈, build choice, `CharacterSheet`, paperdoll, inventory T1 items.
- Tab icons stay visible on desktop and ≤768. No extra glow / pulse / gradient was added to “upgrade” them.

## Tests

- `npx tsx --test frontend/src/gameplay/t1Art.test.ts` — keys exist on disk for chapter 1 monsters, crafts, and four nav icons.
- Default `npx playwright test` UX-01/UX-02 assert four `.tab-icon img.t1-art`, poplar `img.t1-art`, forest `img.t1-art`, character portrait.

Capture: `VS_CAPTURE=1 npx playwright test e2e/captures/phase8-art.spec.ts`

Evidence: `docs/vertical-slice/phase8/desktop-1440/` (work, craft, forest, character, combat) and `mobile-390/` (work, craft, forest, character).

## Product / UX

- Language is one dusk-workshop plate (ink, amber stroke, moss). Icons are geometric, not unique illustrated characters.
- Combat still shows a fake 胜率预测 and can print `NaN` on “累计” — Phase 9.
- Chat / trading / later professions still use emoji. Out of T1 scope.

## Remaining

Phase 9 feedback/sound. Do not call this VERTICAL SLICE READY.
