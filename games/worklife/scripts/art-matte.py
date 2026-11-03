"""
Chroma-key matte for generated T1 art candidates.

Usage:  python scripts/art-matte.py <in.png> <out.webp> [--erode 5] [--min-px 1024] [--depink]

Rules (docs/art/T1_ASSET_STATUS.md):
- background is flat magenta (#FF00FF); a pixel is background when min(r, b) - g > 80 AND
  min(r, b) > 170 — the second clause keeps deep violets / purples inside the subject (the magic
  staff orb, purple gems) from being punched out; blended edge pixels are removed by the erosion
- alpha is eroded by N px so no magenta fringe survives
- --depink (opt-in, per asset): the generator sometimes bleeds the key colour into thin OPAQUE
  parts of the subject (shrimp legs, a glow halo). Those pixels keep their dominant hue — red stays
  red, blue stays blue — and only the other channel is pulled down to the green level. Off by
  default because it would also desaturate intentional purples.
- --deep-key (opt-in, per asset): the generator sometimes paints a "ground shadow" on the key
  itself — the same hue but darker, e.g. (160, 0, 140) — which the brightness floor keeps as an
  opaque blob. This lowers the floor to 90 so those shades are keyed too. Only for masters with no
  intentional purple, because saturated violets in that range would be punched out as well.
- exported as lossless-alpha WebP; never upscaled — the script refuses masters below --min-px
"""
import argparse
import sys

from PIL import Image, ImageChops, ImageFilter


def depink(im: Image.Image) -> int:
    """Neutralise key-colour bleed inside opaque pixels; returns how many pixels were touched."""
    px = im.load()
    w, h = im.size
    touched = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 40 and min(r, b) - g > 40 and min(r, b) > 120:
                if r >= b:
                    b = min(b, g + 20)
                else:
                    r = min(r, g + 20)
                px[x, y] = (r, g, b, a)
                touched += 1
    return touched


def matte(src: Image.Image, erode_px: int, deep_key: bool = False) -> Image.Image:
    rgba = src.convert("RGBA")
    r, g, b, _ = rgba.split()
    # chroma dominance: min(r, b) - g, plus a brightness floor so pure magenta is keyed but
    # saturated violets (min(r, b) well below 170) stay part of the subject
    floor = ImageChops.darker(r, b)
    dominance = ImageChops.subtract(floor, g)
    floor_min = 90 if deep_key else 170
    bright = floor.point(lambda v: 255 if v > floor_min else 0)
    dominant = dominance.point(lambda v: 255 if v > 80 else 0)
    alpha = ImageChops.invert(ImageChops.multiply(bright, dominant))
    if erode_px > 0:
        alpha = alpha.filter(ImageFilter.MinFilter(erode_px * 2 + 1))
    # soften the cut edge by one pixel so the silhouette does not alias at runtime sizes
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))
    out = rgba.copy()
    out.putalpha(alpha)
    # pull residual magenta out of semi-transparent edge pixels
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            pr, pg, pb, pa = px[x, y]
            if 0 < pa < 255 and min(pr, pb) - pg > 30:
                avg = (pr + pg + pb) // 3
                px[x, y] = (avg, avg, avg, pa)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--erode", type=int, default=5)
    ap.add_argument("--min-px", type=int, default=1024)
    ap.add_argument("--depink", action="store_true")
    ap.add_argument("--deep-key", action="store_true")
    args = ap.parse_args()
    im = Image.open(args.src)
    if min(im.size) < args.min_px:
        print(f"refusing: master {im.size} is below the {args.min_px}px contract minimum (no upscaling)", file=sys.stderr)
        return 2
    out = matte(im, args.erode, deep_key=args.deep_key)
    touched = depink(out) if args.depink else 0
    out.save(args.dst, format="WEBP", lossless=True, quality=92, method=6)
    bbox = out.getbbox()
    note = (f" depinked {touched} px" if args.depink else "") + (" deep-key" if args.deep_key else "")
    print(f"wrote {args.dst} {out.size} subject bbox {bbox}{note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
