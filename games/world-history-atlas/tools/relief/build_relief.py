"""Build the faint terrain layer: Natural Earth 1:50m shaded relief (public domain) reprojected to the atlas map.

Input:  SR_50M.tif (10800 x 5400, plate carree, flat land and sea = 206) from naturalearthdata.com
Output: src/assets/relief.webp, RGBA at 2x the map viewBox. Shadows are black and highlights white, each with alpha;
        flat ground and sea are fully transparent, so the layer can sit over any fill without a blend mode.

Usage (from the atlas root, not from the data folder):
  python tools/relief/build_relief.py C:/Project/_work/atlas-units/data/sr50m/SR_50M.tif
"""
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
FLAT = 206           # value of flat ground and sea in SR_50M
SCALE_UP = 1.5       # output pixels per viewBox unit
SHADOW_ALPHA = 0.55  # alpha at the darkest shadow
LIGHT_ALPHA = 0.30   # alpha at the brightest highlight


def map_params():
    text = (ROOT / "src/data/map_units.js").read_text(encoding="utf-8")
    proj = json.loads(re.search(r'"proj":(\{[^}]*\})', text).group(1))
    vb = json.loads(re.search(r'"viewBox":(\[[^\]]*\])', text).group(1))
    return proj, vb


def natural_earth_invert(x, y):
    """Inverse of d3.geoNaturalEarth1Raw (radians), vectorised with Newton steps."""
    phi = y.copy()
    for _ in range(25):
        p2 = phi * phi
        p4 = p2 * p2
        f = phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))) - y
        df = 1.007226 + p2 * (0.015085 * 3 + p4 * (-0.044475 * 7 + 0.028874 * 9 * p2 - 0.005916 * 11 * p4))
        delta = f / df
        phi -= delta
        if np.nanmax(np.abs(delta)) < 1e-9:
            break
    p2 = phi * phi
    lam = x / (0.8707 + p2 * (-0.131979 + p2 * (-0.013791 + p2 * p2 * p2 * (0.003971 - 0.001529 * p2))))
    return lam, phi


def main(tif_path):
    proj, vb = map_params()
    W, H = int(vb[2] * SCALE_UP), int(vb[3] * SCALE_UP)
    Image.MAX_IMAGE_PIXELS = None
    src = Image.open(tif_path)
    # box-filter to half size first; the output is ~0.12 deg per pixel, the source 0.033 deg
    src = src.resize((src.width // 2, src.height // 2), Image.BOX)
    a = np.asarray(src, dtype=np.float32)
    sh, sw = a.shape

    xs = (np.arange(W) + 0.5) / SCALE_UP
    ys = (np.arange(H) + 0.5) / SCALE_UP
    X, Y = np.meshgrid(xs, ys)
    k = proj["scale"]
    lam, phi = natural_earth_invert((X - proj["tx"]) / k, -(Y - proj["ty"]) / k)
    inside = (np.abs(lam) <= math.pi) & (np.abs(phi) <= math.pi / 2)
    lon = np.degrees(lam) - proj["rotate"]          # d3 rotate([r]) projects lon + r
    lon = (lon + 180.0) % 360.0 - 180.0
    lat = np.degrees(phi)

    # bilinear sample in the plate carree source (pixel centres at -180+0.5*dx ...)
    fx = (lon + 180.0) / 360.0 * sw - 0.5
    fy = (90.0 - lat) / 180.0 * sh - 0.5
    x0 = np.clip(np.floor(fx).astype(int), 0, sw - 1)
    y0 = np.clip(np.floor(fy).astype(int), 0, sh - 1)
    x1 = (x0 + 1) % sw
    y1 = np.clip(y0 + 1, 0, sh - 1)
    tx = np.clip(fx - x0, 0, 1)
    ty = np.clip(fy - y0, 0, 1)
    v = (a[y0, x0] * (1 - tx) * (1 - ty) + a[y0, x1] * tx * (1 - ty)
         + a[y1, x0] * (1 - tx) * ty + a[y1, x1] * tx * ty)

    d = v - FLAT
    shadow = np.clip(-d / (FLAT - 52), 0, 1) ** 0.85 * SHADOW_ALPHA
    light = np.clip(d / (255 - FLAT), 0, 1) * LIGHT_ALPHA
    alpha = np.where(d < 0, shadow, light)
    alpha[~inside] = 0
    rgb = np.where(d[..., None] < 0, 0, 255).astype(np.uint8)
    rgba = np.dstack([np.repeat(rgb, 3, axis=2), (alpha * 255).round().astype(np.uint8)])

    out = ROOT / "src/assets/relief.webp"
    Image.fromarray(rgba, "RGBA").save(out, "WEBP", quality=60, alpha_quality=55, method=6)
    print(f"{out} {W}x{H} {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "C:/Project/_work/atlas-units/data/sr50m/SR_50M.tif")
