"""Paint the key-colour residue of matted assets in bright green over a dimmed copy, for eyeballing.

Usage: python scripts/art-residue-mask.py <asset.webp> [more …]  -> test-results/<stem>-mask.png

Residue = opaque-ish pixels (a > 40) that still read as key colour bleed: min(r,b) - g > 40 AND
min(r,b) > 120 (same test art-contact.py uses). Use it to tell edge bleed (fix with --depink)
from intentional purples / pinks (leave alone).
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

OUT = Path("test-results")


def main() -> int:
    OUT.mkdir(exist_ok=True)
    for arg in sys.argv[1:]:
        src = Path(arg)
        im = Image.open(src).convert("RGBA")
        px = im.load()
        w, h = im.size
        out = Image.new("RGB", (w, h), (24, 28, 40))
        op = out.load()
        n = 0
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a > 40:
                    if min(r, b) - g > 40 and min(r, b) > 120:
                        op[x, y] = (0, 255, 0)
                        n += 1
                    else:
                        op[x, y] = (r // 3 + 16, g // 3 + 18, b // 3 + 26)
        dest = OUT / f"{src.stem}-mask.png"
        out.save(dest)
        print(f"{src} {n} -> {dest.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
