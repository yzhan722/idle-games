# T1 Asset Contract — drop map

Canonical key = path under `frontend/src/assets/t1/` **without** extension.

```text
frontend/src/assets/t1/<canonical-key>.webp
frontend/src/assets/t1/<canonical-key>.png
frontend/src/assets/t1/<canonical-key>.svg
```

Example: slime illustration → `frontend/src/assets/t1/monsters/slime.webp`

Resolver (no React change): **webp > png > svg**. Machine source: `frontend/src/assets/t1/contract.ts`.

If 30 files arrive, match the **key** column. Do not invent folders. Do not ask where it goes.

## P0 — first-hour, always visible

Every P0 row currently has a **PLACEHOLDER** SVG. That is not production.

| key | type | profile | format | alpha | master min | runtime D / M | object-fit | crop | mobile | fallback | status |
|---|---|---|---|---|---:|---|---|---|---|---|---|
| character/woodcutter | character | illustration | webp | yes | 1024 | 280 / 160 | contain | full figure | no circle | CardArt | PLACEHOLDER |
| trees/poplar | tree | illustration | webp | yes | 1024 | 180 / 140 | contain | full tree | full tree | CardArt | PLACEHOLDER |
| monsters/slime | monster | illustration | webp | yes | 1024 | 180 / 140 | contain | full body | full body | CardArt | PLACEHOLDER |
| monsters/crab | monster | illustration | webp | yes | 1024 | 180 / 140 | contain | claws in frame | full body | CardArt | PLACEHOLDER |
| monsters/monkey | monster | illustration | webp | yes | 1024 | 180 / 140 | contain | full body | full body | CardArt | PLACEHOLDER |
| monsters/forest_boss | monster | illustration | webp | yes | 1536 | 260 / 180 | contain | full figure | larger than trash | CardArt | PLACEHOLDER |
| equipment/weapon_wooden_sword | equipment | item | webp | yes | 512 | 72 / 56 | contain | square-safe | no plate | empty | PLACEHOLDER |
| equipment/armor_wood_chest | equipment | item | webp | yes | 512 | 72 / 56 | contain | square-safe | no plate | empty | PLACEHOLDER |
| materials/wood_1 | material | item | webp | yes | 512 | 48 / 32 | contain | square-safe | 32px readable | empty | PLACEHOLDER |
| materials/lumber_1 | material | item | webp | yes | 512 | 48 / 32 | contain | square-safe | 32px readable | empty | PLACEHOLDER |
| skills/heavy_chop | skill | icon | svg | yes | 256 | 28 / 28 | contain | no plate | 44px hit | empty | PLACEHOLDER |
| skills/sharpened_edge | skill | icon | svg | yes | 256 | 40 / 36 | contain | no plate | build card | empty | PLACEHOLDER |
| skills/thick_bark | skill | icon | svg | yes | 256 | 40 / 36 | contain | no plate | build card | empty | PLACEHOLDER |
| ui/nav-logging | ui | icon | svg | yes | 128 | 22 / 24 | contain | no plate | bottom tab | empty | PLACEHOLDER |
| ui/nav-woodworking | ui | icon | svg | yes | 128 | 22 / 24 | contain | no plate | bottom tab | empty | PLACEHOLDER |
| ui/nav-adventure | ui | icon | svg | yes | 128 | 22 / 24 | contain | no plate | bottom tab | empty | PLACEHOLDER |
| ui/nav-character | ui | icon | svg | yes | 128 | 22 / 24 | contain | no plate | bottom tab | empty | PLACEHOLDER |
| ui/logo | ui | icon | svg | yes | 256 | 32 / 28 | contain | no plate | header | empty | PLACEHOLDER |
| ui/gold | ui | icon | svg | yes | 128 | 16 / 16 | contain | no plate | header | empty | PLACEHOLDER |

P0 count: **19**. All PLACEHOLDER. **0 PRODUCTION.**

## P1 — contracted, not first-hour chrome

No files yet. Do **not** fill with emoji or new procedural SVG.

| key | type | profile | format | status | notes |
|---|---|---|---|---|---|
| ui/stat-hp | ui | icon | svg | MISSING | Character sheet uses the word 生命 |
| ui/stat-atk | ui | icon | svg | MISSING | 攻击 |
| ui/stat-def | ui | icon | svg | MISSING | 防御 |
| ui/chat | ui | icon | svg | MISSING | Mobile FAB is the character 聊 |

## P2 — not in this drop

Later trees, ores, other maps, other classes: still `CardArt` / emoji in secondary panels. Do not send production files for them until a later contract.

## How a drop lands

1. Copy files using the key as the relative path.
2. `npm run verify:art` (Phase F)
3. `npm run verify`
4. `npm run capture:art` and human-review `docs/art/visual-qa/baseline/`

No component edits. No `${key}.png` in React.
