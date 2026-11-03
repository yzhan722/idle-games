"""Sample the four corners of generated masters and report whether art-matte.py's key removes them.

Usage: python scripts/art-bgcheck.py <master.png> [more.png …]   (globs allowed)

The key is min(r,b) - g > 80 AND min(r,b) > 170. The model sometimes answers a blue or warm subject
with a hot-pink or dimmed background (e.g. (239, 5, 140), (188, 0, 136)); those masters must be
regenerated, not keyed with a looser threshold. Exit code 1 when any master is off-key.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def keyed(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return min(r, b) - g > 80 and min(r, b) > 170


def main() -> int:
    bad = 0
    for arg in sys.argv[1:]:
        p = Path(arg)
        files = sorted(p.parent.glob(p.name)) if any(ch in p.name for ch in "*?[") else [p]
        for f in files:
            im = Image.open(f).convert("RGB")
            w, h = im.size
            corners = [im.getpixel((8, 8)), im.getpixel((w - 9, 8)), im.getpixel((8, h - 9)), im.getpixel((w - 9, h - 9))]
            ok = all(keyed(c) for c in corners)
            bad += 0 if ok else 1
            print(f"{f.name:48s} {'OK ' if ok else 'BAD'} {corners}")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
