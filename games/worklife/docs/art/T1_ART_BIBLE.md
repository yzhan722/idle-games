# T1 Art Bible — commercial drop, not a style pitch

WorkLife does **not** pick a final commercial look in this repo. External art production owns style, silhouette, and finish. This bible only freezes **how art enters the game** so a drop of ~30 files can be copied in without a second design meeting.

## What the game is

First-hour fantasy: a woodcutter in a dusk workshop, then the sleeping forest. UI is a dark timber frame. **Art is the subject. UI is the frame.**

Do not bake:

- rarity glow
- card plates
- circular portraits
- HP bars
- Chinese labels

into the files. Those belong to CSS.

## Three presentation profiles

| Profile | Use | Fit | Frame |
|---|---|---|---|
| `icon` | nav, gold, logo, skills | contain, small | no plate, no glow |
| `item` | materials, equipment, drops | contain, square-safe | rarity frame is UI |
| `illustration` | character, tree, monsters, boss | contain, full figure | no circle crop, no CardArt plate |

`scene` is out of scope until a real background pipeline exists.

## Character compatibility

There is **one** canonical character key: `character/woodcutter`.

It is used as:

1. Character-sheet hero illustration
2. Combat player avatar
3. Paperdoll center (same file, smaller slot, still `contain`)

Do not ship a separate chibi / paperdoll file unless production later adds a new key to the contract. Until then, one full-figure transparent illustration must read at 280px and at 80px.

## Palette (placeholder only)

Current on-disk SVGs are **PLACEHOLDER**, not production. Their ink / amber / moss geometry is a stand-in so the pipeline has files. Final art may ignore that palette.

## Crop and safe area

- Illustrations: entire body + weapon inside the canvas. 8% padding. No bleed-off of axe heads or antlers.
- Items: centered, ~80% of canvas, transparent around.
- Icons: optically centered, 1–2px padding, transparent.

## Formats

Runtime resolver (manifest, not components):

`webp > png > svg`

- Illustrations / items: deliver **transparent WebP** (master PNG also fine).
- UI / skill icons: official SVG is welcome; a production WebP still wins if both exist.
- Never ask engineering to change a React `src` or file extension.

## What not to send

- Emoji atlases
- Files named `slime.png.png` or `monsters_slime_final_v3`
- Baked dashboard chrome
- Assets for T2 maps, other classes, pets, PVP

## Status words (do not mix)

| Word | Meaning |
|---|---|
| `PLACEHOLDER` | File exists. Geometric / prototype. **Not** commercial art. |
| `PRODUCTION` | Raster file in the canonical path that passes verify:art (`PRODUCTION_PRESENT`). Source is tracked separately: `drop-NN` = external final art, `generated` = in-repo AI candidate awaiting external replacement or sign-off. |
| `MISSING` | Contracted key, no file yet (P1 stats / chat). |

Visual acceptance (`PRODUCTION_ACCEPTED`) lives in `docs/art/T1_ASSET_VISUAL_ACCEPTANCE.md`, never in `contract.ts`.
