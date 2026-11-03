# T1 Visual Debt

Having an SVG on disk is **not** finished art. Every current T1 file is **PLACEHOLDER** (geometric dusk-workshop glyph). None are **PRODUCTION**.

Machine checklist: `frontend/src/assets/t1/contract.ts` (`priority`, `status`).

## P0 — first-hour, on screen the whole time

| ID | Kind | Where | Status |
|---|---|---|---|
| character/woodcutter | PLACEHOLDER SVG | Character sheet, combat player, paperdoll | PLACEHOLDER |
| trees/poplar | PLACEHOLDER SVG | Work | PLACEHOLDER |
| monsters/slime, crab, monkey, forest_boss | PLACEHOLDER SVG | Forest + combat | PLACEHOLDER |
| equipment/weapon_wooden_sword, armor_wood_chest | PLACEHOLDER SVG | Craft, character, inventory | PLACEHOLDER |
| materials/wood_1, lumber_1 | PLACEHOLDER SVG | Pack, craft, inventory | PLACEHOLDER |
| skills/heavy_chop, sharpened_edge, thick_bark | PLACEHOLDER SVG | Combat / build | PLACEHOLDER |
| ui/nav-* , ui/logo, ui/gold | PLACEHOLDER SVG | Header + 4-tab nav | PLACEHOLDER |
| CardArt | procedural SVG plate | Fallback if a T1 file is missing | P0 fallback only |
| trees[].icon `🌱` | emoji | Data fallback for T1Art | P0 fallback, not shown when file exists |
| pack `monster.icon` (e.g. 🦌) | emoji | T1Art fallback | P0 fallback |
| Victory `✨` particles | emoji / CSS | Combat win overlay | P0 noise |
| `.card-image` radial-gradient + inset glow | CSS fake plate | Work / craft / forest cards | P0 container debt (Phase E) |
| Combat `.entity-avatar` historically `border-radius: 50%` | CSS crop | Combat | mitigated in Phase C |

**P0 PRODUCTION count: 0. P0 PLACEHOLDER: 19. P0 MISSING: 0 files (all have placeholders).**

## P1 — secondary, still in chapter 1 chrome

| ID | Kind | Where |
|---|---|---|
| ui/stat-hp, ui/stat-atk, ui/stat-def | MISSING | Character sheet uses the words 生命/攻击/防御 |
| ui/chat | MISSING | Mobile FAB is the character 「聊」 |
| `getItemIcon()` emoji map | emoji | Inventory fallback for non-T1 ids; T1 items still pass emoji as `fallback` |
| Equipment slot icons `⚔️` `🛡️` | emoji | Equip selector headers |
| `PlayerRightPanel` `💰` `⚔️` | emoji | Legacy right sheet |
| Career / stats / shop / check-in | emoji | Behind 生涯 |
| Chat emoji picker | emoji | Chat drawer |

Do **not** replace these with new emoji. Wait for contracted keys or leave as legacy.

## P2 — after chapter 1 / T2 panels

| ID | Kind |
|---|---|
| `trees` / `ores` / `crops` tables past poplar | emoji + CardArt |
| Trading house, party, prestige, bounties | emoji |
| Other forest filler monsters (not in CHAPTER1_MONSTERS) | CardArt if a player somehow opens them (T1 filters them out) |

## Rules for later drops

1. A new file at the canonical path does not change this document until `verify:art` marks it PRODUCTION (non-placeholder raster or flagged production SVG).
2. Placeholder SVGs stay until the drop is verified. Do not delete fallbacks first.
3. Do not add procedural SVG to “fill” P1 MISSING keys.
