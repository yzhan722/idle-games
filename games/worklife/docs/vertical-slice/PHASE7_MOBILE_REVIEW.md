# Phase 7 — Mobile-first navigation

390 / 430 is no longer a squeezed three-column desktop. Primary actions sit on a **bottom 4-tab bar**. Character is a page. Chat is a 44px FAB, not a 48px rail.

## Code

- `GameHeader` always shows an activity strip (`空闲` or current gather/battle + 停止).
- CSS at the end of `NewGameInterface.css` (`max-width: 768px`): bottom tabs, visible `.header-center`, collapsed chat/right rails removed, expanded inventory as a full sheet.
- `GameChatPanel` FAB `聊` / `展开聊天` (44px).
- CTA minimum 44px on tabs, Next Goal, sheet slots, stop.

## Tests

`npx playwright test` — UX-02 asserts the 工作 tab sits in the lower 30% of a 375×812 viewport and `.activity-status-center` is visible.

Capture: `VS_CAPTURE=1 npx playwright test e2e/captures/phase7-mobile.spec.ts`

Evidence: `docs/vertical-slice/phase7/mobile-390/` and `mobile-430/` (Work, Craft, Adventure, Character, Boss combat).

## Remaining

- Combat still shows a fake 胜率预测 (level formula). Phase 9/10 should drop it or drive it from the combat sheet.
- T1 art is still CardArt / emoji (Phase 8).
