# Phase 6 — Desktop information architecture

Desktop now has four primary domains: **工作 / 制作 / 冒险 / 角色**. Party, trading, enhance, and the other five professions are not first-hour tabs.

## Code

- `frontend/src/gameplay/ia.ts` — primary tabs, career groups, chapter-1 craft/monster allowlists.
- `GameActionNav` locks 制作 until first wood, 冒险 until the wooden sword is on.
- `CharacterSheet` shows HP / ATK / DEF from `combatSheetFromPack` (same formula as HP combat, pack item stats).
- Career menu: Settings only until chapter complete; afterwards grouped 进度 / 日常 / 远期 / 系统.
- Chapter 1 lists: one tree (小白杨), three crafts (木板 / 短剑 / 胸甲), four forest fights (史莱姆 / 蟹 / 猴 / 管家).
- Wooden sword craft card: `ATK 5 → 10 (+5)`.

## Tests

```
npx tsx --test frontend/src/gameplay/ia.test.ts
npx tsx --test frontend/src/gameplay/combatSheet.test.ts
npx tsx --test frontend/src/gameplay/craftPreview.test.ts
npx playwright test
```

Default Playwright: 6 passed. Capture: `VS_CAPTURE=1 npx playwright test e2e/captures/phase6-ia.spec.ts`

## Product

Evidence: `docs/vertical-slice/phase6/`

First screen lands on 伐木. 制作 and 冒险 are visible but locked. 生涯 does not dump achievements. Mobile still uses the left rail — Phase 7.

## Remaining for later phases

- Mobile is still a compressed desktop shell (Phase 7).
- CardArt / emoji still carry T1 art (Phase 8).
- Header activity bar still hides at 480px (Phase 7).
