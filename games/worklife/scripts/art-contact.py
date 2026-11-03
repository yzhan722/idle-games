"""
Contact sheet + key-colour residue audit for matted T1 item art.

Usage:  python scripts/art-contact.py [out.png] [path-or-glob ...]

With no paths it scans frontend/src/assets/t1/{equipment,consumables,materials}/*.webp.
Each asset is drawn at 72 / 48 / 32 px over the game's dark panel colour (the sizes the item
profile actually runs at), and any opaque pixel that still leans toward the #FF00FF key
(min(r, b) - g > 40 AND min(r, b) > 120) is counted — a non-zero count on an asset without
intentional purples means the master needs `art-matte.py --depink` or a tighter erosion.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
T1 = ROOT / "frontend" / "src" / "assets" / "t1"
SIZES = (72, 48, 32)
PANEL = (30, 34, 44, 255)


def residue(im: Image.Image) -> tuple[int, int]:
    px = im.load()
    w, h = im.size
    n = worst = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 40:
                d = min(r, b) - g
                if d > 40 and min(r, b) > 120:
                    n += 1
                    worst = max(worst, d)
    return n, worst


def main() -> int:
    args = sys.argv[1:]
    out = Path(args[0]) if args and args[0].lower().endswith(".png") else ROOT / "test-results" / "art-contact.png"
    paths = args[1:] if args and args[0].lower().endswith(".png") else args
    files: list[Path] = []
    if paths:
        for p in paths:
            pp = Path(p)
            files.extend(sorted(pp.parent.glob(pp.name)) if any(c in p for c in "*?[") else [pp])
    else:
        for folder in ("equipment", "consumables", "materials"):
            files.extend(sorted((T1 / folder).glob("*.webp")))
    if not files:
        print("nothing to audit", file=sys.stderr)
        return 1

    cols = 8
    cell_w, cell_h = 4 + sum(s + 4 for s in SIZES), 72 + 24
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h + 8), PANEL)
    draw = ImageDraw.Draw(sheet)
    flagged = 0
    print(f"{'asset':44s} {'residue px':>10s} {'worst':>6s}")
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGBA")
        n, worst = residue(im)
        key = f"{f.parent.name}/{f.stem}"
        flag = "  <-- check" if n > 0 else ""
        flagged += 1 if n > 0 else 0
        print(f"{key:44s} {n:>10d} {worst:>6d}{flag}")
        bbox = im.getbbox()
        crop = im.crop(bbox) if bbox else im
        cx, cy = (i % cols) * cell_w, (i // cols) * cell_h + 4
        x = cx + 4
        for s in SIZES:
            th = crop.copy()
            th.thumbnail((s, s), Image.LANCZOS)
            sheet.alpha_composite(th, (x + (s - th.width) // 2, cy + (72 - th.height) // 2))
            x += s + 4
        draw.text((cx + 4, cy + 76), f.stem[:24], fill=(200, 205, 215, 255))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"wrote {out}  ({len(files)} assets, {flagged} with key-colour residue)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
