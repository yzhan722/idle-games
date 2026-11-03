#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Maple Isle Idle - Authentic MapleStory Online (Wizet 2D Hi-Bit Sprite Style) Asset Generator
Generates rich, multi-shade volumetric 2D sprites with smooth radial/directional pillow shading,
colored dark outlines, glossy highlights, Henesys log-stake & organic boulder soil platforms,
spotted Henesys Mushroom Houses, iconic Moon Bunny / Orange Mushroom / Green Slime / Ribbon Pig
sprites, and Classic MapleStory glossy beveled UI & puffy gradient numbers.
"""

import os
import math
from PIL import Image, ImageDraw

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "assets", "pixel_art")


def ensure_dirs():
    for sub in ["islands", "animals", "travelers", "crops", "buildings", "ui"]:
        os.makedirs(os.path.join(OUT_DIR, sub), exist_ok=True)


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(round(v))))


def lerp_color(c1, c2, t):
    t = max(0.0, min(1.0, float(t)))
    return (
        clamp(c1[0] + (c2[0] - c1[0]) * t),
        clamp(c1[1] + (c2[1] - c1[1]) * t),
        clamp(c1[2] + (c2[2] - c1[2]) * t),
        clamp(c1[3] + (c2[3] - c1[3]) * t),
    )


def palette_quantize_channel(val, steps=16):
    """Quantizes smooth gradients into crisp Hi-Bit MapleStory pixel steps."""
    q = round(val / (255.0 / steps)) * (255.0 / steps)
    return clamp(q)


def quantize_col(col, steps=20):
    return (
        palette_quantize_channel(col[0], steps),
        palette_quantize_channel(col[1], steps),
        palette_quantize_channel(col[2], steps),
        col[3],
    )


def put(img, x, y, col):
    w, h = img.size
    if 0 <= x < w and 0 <= y < h:
        img.putpixel((int(x), int(y)), col)


def draw_shaded_sphere(img, cx, cy, rx, ry, col_hi, col_mid, col_low, col_outline, light_dx=-0.32, light_dy=-0.38, spec_strength=0.0):
    """
    Draws a MapleStory-style volumetric shaded ellipsoid with smooth quantized lighting,
    colored dark outline, and optional glossy specular highlight.
    """
    w, h = img.size
    px = img.load()
    for y in range(max(0, int(cy - ry - 2)), min(h, int(cy + ry + 3))):
        for x in range(max(0, int(cx - rx - 2)), min(w, int(cx + rx + 3))):
            nx = (x - cx) / max(0.5, rx)
            ny = (y - cy) / max(0.5, ry)
            dist = math.sqrt(nx * nx + ny * ny)
            if dist <= 1.0:
                if dist >= 0.89:
                    px[x, y] = col_outline
                else:
                    # Directional light from top-left
                    ldist = math.sqrt((nx - light_dx) ** 2 + (ny - light_dy) ** 2)
                    t = min(1.0, ldist / 1.35)
                    if t < 0.45:
                        c = lerp_color(col_hi, col_mid, t / 0.45)
                    else:
                        c = lerp_color(col_mid, col_low, (t - 0.45) / 0.55)
                    # Glossy specular highlight (for Slime, apples, eyes, UI gems)
                    if spec_strength > 0.0 and ldist < 0.28:
                        spec_t = (1.0 - ldist / 0.28) * spec_strength
                        c = lerp_color(c, (255, 255, 255, 255), spec_t)
                    px[x, y] = quantize_col(c, 18)


def add_colored_outline(img, outline_col=(42, 24, 16, 255)):
    """Adds a crisp 1px dark colored outline around opaque sprite regions."""
    w, h = img.size
    src = img.load()
    out = img.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] == 0:
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 180:
                        dst[x, y] = outline_col
                        break
    return out


# ============================================================================
# 1. MAPLESTORY FLOATING ISLANDS (Henesys, Ellinia, Orbis Gold Beach)
# ============================================================================
def generate_islands():
    # --- A. Henesys Cloud Meadow (Main Island: 440 x 136) ---
    w, h = 440, 136
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    # 1) Orbis-style voluminous cumulus cloud cushion at bottom (y: 86..132)
    cloud_puffs = [
        (68, 106, 44, 18), (132, 110, 52, 20), (218, 112, 64, 21),
        (304, 110, 54, 20), (372, 105, 44, 18),
        (98, 100, 38, 15), (175, 102, 46, 17), (264, 102, 46, 17), (340, 100, 38, 15)
    ]
    for cx, cy, rx, ry in cloud_puffs:
        draw_shaded_sphere(
            img, cx, cy, rx, ry,
            (255, 255, 255, 255), (232, 244, 255, 255), (176, 206, 238, 255),
            (72, 102, 146, 255), -0.25, -0.45
        )

    # 2) Organic Henesys earthen cliff with embedded boulders & strata (y: 42..102)
    px = img.load()
    for y in range(42, 102):
        taper = int(max(0, (y - 44) * 0.72))
        lx = 24 + taper
        rx = w - 24 - taper
        for x in range(lx, rx):
            bottom_wave = 96 + int(4.5 * math.sin(x * 0.06) + 2.5 * math.cos(x * 0.13))
            if y > bottom_wave:
                continue
            if x in (lx, lx + 1, rx - 1, rx - 2) or y >= bottom_wave - 1:
                px[x, y] = (48, 24, 12, 255)
            else:
                # Warm ochre-sienna soil strata with smooth organic rock modulation
                depth_t = (y - 42) / 56.0
                wave = math.sin(x * 0.045 + math.sin(y * 0.18) * 1.5) * 0.12
                c = lerp_color((226, 152, 88, 255), (118, 56, 26, 255), min(1.0, max(0.0, depth_t + wave)))
                px[x, y] = quantize_col(c, 16)

    # Embedded Henesys rounded soil pebbles/boulders inside cliff
    boulders = [(66, 72, 16, 10), (118, 80, 20, 11), (186, 74, 18, 10), (254, 82, 22, 12), (312, 74, 17, 10), (368, 70, 15, 9)]
    for bx, by, brx, bry in boulders:
        draw_shaded_sphere(
            img, bx, by, brx, bry,
            (238, 172, 112, 255), (188, 114, 62, 255), (132, 68, 34, 255),
            (76, 36, 16, 255), -0.3, -0.35
        )

    # 3) Iconic Henesys Wooden Log Stakes along cliff upper rim (y: 40..64)
    for lx in range(30, w - 34, 14):
        log_h = 18 + ((lx * 7) % 7)
        for y in range(42, 42 + log_h):
            for dx in range(12):
                x = lx + dx
                if dx in (0, 11) or y == 41 + log_h:
                    put(img, x, y, (54, 26, 12, 255))
                else:
                    # Cylindrical wood shading across the 12px log width
                    cyl = abs((dx - 4.0) / 7.0)
                    v_shade = (y - 42) / float(log_h) * 0.35
                    c = lerp_color((236, 174, 108, 255), (134, 72, 34, 255), min(1.0, cyl * 0.75 + v_shade))
                    # Horizontal rope tie across logs
                    if y in (49, 50):
                        c = (245, 212, 142, 255) if y == 49 else (168, 122, 64, 255)
                    put(img, x, y, quantize_col(c, 16))

    # 4) Lush, billowy Henesys yellow-green to emerald turf top + overhanging scallops (y: 16..48)
    for x in range(16, w - 16):
        top_y = 18 + int(1.5 * math.sin(x * 0.03))
        overhang_y = 44 + int(4.0 * math.sin(x * 0.18) + 2.0 * math.cos(x * 0.37))
        for y in range(top_y, overhang_y + 1):
            if y == top_y or x in (16, 17, w - 17, w - 18):
                put(img, x, y, (24, 62, 14, 255))
            elif y >= overhang_y - 1:
                put(img, x, y, (22, 56, 12, 255) if y == overhang_y else (44, 108, 22, 255))
            else:
                # Lush MapleStory chartreuse-to-emerald gradient with organic blade clusters
                ty = (y - top_y) / max(1.0, float(overhang_y - top_y))
                blade_mod = math.sin(x * 0.45 + y * 0.25) * 0.08
                t = min(1.0, max(0.0, ty + blade_mod))
                if t < 0.38:
                    c = lerp_color((208, 252, 78, 255), (132, 226, 44, 255), t / 0.38)
                elif t < 0.78:
                    c = lerp_color((132, 226, 44, 255), (68, 174, 28, 255), (t - 0.38) / 0.40)
                else:
                    c = lerp_color((68, 174, 28, 255), (38, 118, 18, 255), (t - 0.78) / 0.22)
                put(img, x, y, quantize_col(c, 18))

    # Individual grass blade tufts & Henesys daisies on lawn
    for gx in range(28, w - 28, 18):
        gy = 22 + (gx % 7)
        put(img, gx, gy, (224, 255, 108, 255))
        put(img, gx + 1, gy - 1, (224, 255, 108, 255))
        put(img, gx + 2, gy, (168, 242, 64, 255))
    for fx, fy, petal in [(54, 26, (255, 255, 255, 255)), (128, 24, (255, 182, 212, 255)),
                          (292, 25, (255, 255, 255, 255)), (386, 27, (255, 232, 96, 255))]:
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            put(img, fx + dx, fy + dy, petal)
        put(img, fx, fy, (255, 204, 36, 255))

    # 5) Sparkling Henesys Waterfall Stream on right side (x: 326..354, y: 22..118)
    for y in range(22, 118):
        for x in range(326, 354):
            if x in (326, 353):
                put(img, x, y, (28, 88, 148, 255))
            else:
                wx = (x - 326) / 27.0
                streak = math.sin(x * 0.7 - y * 0.35)
                if streak > 0.65 or y > 110:
                    c = (245, 255, 255, 255)
                elif streak > 0.15:
                    c = (132, 238, 255, 255)
                else:
                    c = lerp_color((64, 196, 252, 255), (36, 142, 224, 255), wx)
                put(img, x, y, quantize_col(c, 16))

    img.save(os.path.join(OUT_DIR, "islands", "island_henesys.png"))

    # --- B. Ellinia Mystic Forest Island (Left Island: 310 x 136) ---
    el = Image.new("RGBA", (310, 136), (0, 0, 0, 0))
    for cx, cy, rx, ry in [(64, 108, 44, 18), (155, 112, 58, 20), (246, 108, 44, 18)]:
        draw_shaded_sphere(
            el, cx, cy, rx, ry,
            (228, 238, 255, 255), (176, 198, 244, 255), (118, 142, 206, 255),
            (48, 64, 118, 255), -0.25, -0.4
        )
    # Ancient gnarled giant tree bark cliff
    for y in range(42, 100):
        taper = int(max(0, (y - 44) * 0.68))
        for x in range(20 + taper, 290 - taper):
            if x in (20 + taper, 289 - taper) or y >= 98:
                put(el, x, y, (28, 16, 14, 255))
            else:
                groove = math.sin(x * 0.22 + math.sin(y * 0.12) * 2.0) * 0.25
                c = lerp_color((124, 78, 58, 255), (58, 32, 26, 255), min(1.0, max(0.0, (y - 42) / 58.0 + groove)))
                put(el, x, y, quantize_col(c, 16))
    # Glowing emerald-teal Ellinia moss canopy top
    for x in range(14, 296):
        overhang_y = 44 + int(3.5 * math.sin(x * 0.2))
        for y in range(18, overhang_y + 1):
            if y in (18, overhang_y) or x in (14, 295):
                put(el, x, y, (14, 48, 44, 255))
            else:
                t = (y - 18) / float(overhang_y - 18)
                c = lerp_color((118, 255, 214, 255), (24, 128, 118, 255), t)
                put(el, x, y, quantize_col(c, 16))
    # Giant Glowing Ellinia Magic Mushrooms on left side
    fill_rect_shaded(el, 40, 14, 12, 18, (255, 244, 222, 255), (196, 174, 148, 255))
    draw_shaded_sphere(
        el, 46, 12, 22, 11,
        (214, 162, 255, 255), (138, 78, 242, 255), (74, 34, 164, 255),
        (32, 14, 78, 255), -0.3, -0.4, 0.35
    )
    draw_shaded_sphere(el, 38, 10, 4, 3, (255, 252, 178, 255), (244, 218, 104, 255), (214, 178, 68, 255), (112, 68, 164, 255))
    draw_shaded_sphere(el, 54, 13, 3.5, 2.5, (255, 252, 178, 255), (244, 218, 104, 255), (214, 178, 68, 255), (112, 68, 164, 255))
    el.save(os.path.join(OUT_DIR, "islands", "island_ellinia.png"))

    # --- C. Orbis / Gold Beach Island (Right Island: 310 x 136) ---
    orb = Image.new("RGBA", (310, 136), (0, 0, 0, 0))
    for cx, cy, rx, ry in [(64, 108, 44, 18), (155, 112, 58, 20), (246, 108, 44, 18)]:
        draw_shaded_sphere(
            orb, cx, cy, rx, ry,
            (255, 255, 255, 255), (236, 246, 255, 255), (184, 214, 244, 255),
            (78, 108, 152, 255), -0.25, -0.4
        )
    # Orbis marble cloud-stone cliff base
    for y in range(42, 98):
        taper = int(max(0, (y - 44) * 0.68))
        for x in range(20 + taper, 290 - taper):
            if x in (20 + taper, 289 - taper) or y >= 96:
                put(orb, x, y, (68, 62, 58, 255))
            else:
                flute = math.sin(x * 0.35) * 0.12
                c = lerp_color((248, 242, 232, 255), (186, 176, 164, 255), min(1.0, max(0.0, (y - 42) / 56.0 + flute)))
                put(orb, x, y, quantize_col(c, 16))
    # Golden Beach sand + sparkling turquoise shoreline
    for x in range(14, 296):
        overhang_y = 44 + int(3.0 * math.cos(x * 0.18))
        for y in range(18, overhang_y + 1):
            if y in (18, overhang_y) or x in (14, 295):
                put(orb, x, y, (96, 68, 24, 255))
            elif y < 34:
                t = (y - 18) / 16.0
                c = lerp_color((255, 248, 196, 255), (242, 204, 112, 255), t)
                put(orb, x, y, quantize_col(c, 16))
            else:
                c = (240, 255, 255, 255) if y == 34 else lerp_color((112, 238, 255, 255), (42, 176, 236, 255), (y - 34) / 12.0)
                put(orb, x, y, quantize_col(c, 16))
    orb.save(os.path.join(OUT_DIR, "islands", "island_orbis_coast.png"))

    # --- D. MapleStory Wooden Rope Bridge (64 x 36) ---
    br = Image.new("RGBA", (64, 36), (0, 0, 0, 0))
    for x in range(64):
        sag = int(3.5 * math.sin((x / 63.0) * math.pi))
        put(br, x, 6 + sag, (64, 34, 14, 255))
        put(br, x, 7 + sag, (238, 196, 128, 255))
        put(br, x, 8 + sag, (178, 126, 68, 255))
    for px_x in range(4, 60, 9):
        sag = int(3.5 * math.sin((px_x / 63.0) * math.pi))
        fill_rect_shaded(br, px_x, 6 + sag, 5, 18, (226, 158, 92, 255), (138, 76, 36, 255), True)
    for px_x in range(0, 64, 6):
        sag = int(2.5 * math.sin((px_x / 63.0) * math.pi))
        fill_rect_shaded(br, px_x, 20 + sag, 6, 8, (238, 172, 104, 255), (148, 84, 40, 255), True)
    br.save(os.path.join(OUT_DIR, "islands", "bridge_wood.png"))

    # --- E. 1.5D Farm Soil Plots (128 x 32: 4 states of 32x32) ---
    plots = Image.new("RGBA", (128, 32), (0, 0, 0, 0))
    for idx in range(4):
        ox = idx * 32
        for y in range(8, 27):
            skew = (26 - y) // 4
            for x in range(3 + skew, 29 - skew):
                border = x in (3 + skew, 28 - skew) or y in (8, 26)
                if border:
                    put(plots, ox + x, y, (52, 26, 12, 255))
                else:
                    furrow = math.sin((y - 8) * 1.1) * 0.18
                    if idx == 0:
                        c = lerp_color((168, 236, 68, 255), (96, 184, 38, 255), 0.5 + furrow)
                    elif idx == 1:
                        c = lerp_color((226, 154, 92, 255), (164, 96, 48, 255), 0.5 + furrow)
                    elif idx == 2:
                        c = lerp_color((156, 92, 48, 255), (98, 52, 24, 255), 0.5 + furrow)
                        if (x + y * 3) % 19 == 0:
                            c = (136, 238, 255, 255)
                    else:
                        c = lerp_color((186, 114, 58, 255), (128, 68, 30, 255), 0.5 + furrow)
                        if (x + y * 2) % 15 == 0:
                            c = (255, 232, 92, 255)
                    put(plots, ox + x, y, quantize_col(c, 16))
    plots.save(os.path.join(OUT_DIR, "islands", "soil_plot.png"))


def fill_rect_shaded(img, x0, y0, w, h, col_hi, col_low, outline=True):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            if outline and (x in (x0, x0 + w - 1) or y in (y0, y0 + h - 1)):
                put(img, x, y, (46, 24, 12, 255))
            else:
                t = ((x - x0) / max(1.0, float(w)) * 0.55) + ((y - y0) / max(1.0, float(h)) * 0.45)
                put(img, x, y, quantize_col(lerp_color(col_hi, col_low, t), 16))


# ============================================================================
# 2. MAPLESTORY BUILDINGS (Spotted Mushroom House, Lush Tree, Market Stall)
# ============================================================================
def generate_buildings():
    # --- A. Iconic Henesys Spotted Mushroom Cottage (72 x 72) ---
    cot = Image.new("RGBA", (72, 72), (0, 0, 0, 0))
    # Plump cream plaster house body (y: 34..68)
    draw_shaded_sphere(
        cot, 36, 50, 22, 18,
        (255, 250, 232, 255), (242, 224, 192, 255), (198, 172, 136, 255),
        (58, 32, 16, 255), -0.3, -0.3
    )
    # Rounded wooden door + brass knob
    draw_shaded_sphere(
        cot, 36, 58, 7, 10,
        (218, 146, 82, 255), (168, 98, 46, 255), (118, 62, 26, 255),
        (48, 22, 10, 255), -0.2, -0.3
    )
    draw_shaded_sphere(cot, 40, 58, 2, 2, (255, 248, 168, 255), (246, 192, 48, 255), (184, 118, 18, 255), (68, 36, 12, 255))
    # Bulbous Henesys Orange-Red Mushroom Roof Cap (y: 6..40)
    draw_shaded_sphere(
        cot, 36, 25, 31, 17,
        (255, 162, 96, 255), (242, 84, 48, 255), (168, 36, 24, 255),
        (56, 16, 12, 255), -0.35, -0.45, 0.25
    )
    # Iconic Cream-Yellow Recessed Spots on Mushroom Roof
    for sx, sy, srx, sry in [(20, 22, 6, 4.5), (36, 16, 7, 5), (52, 23, 6, 4.5), (27, 31, 5, 3.5), (46, 31, 5, 3.5)]:
        draw_shaded_sphere(
            cot, sx, sy, srx, sry,
            (255, 252, 212, 255), (246, 222, 148, 255), (212, 174, 96, 255),
            (138, 42, 24, 255), -0.2, -0.2
        )
    cot.save(os.path.join(OUT_DIR, "buildings", "cottage_mushroom.png"))

    # --- B. Lush Henesys Apple/Oak Tree (80 x 88) ---
    tree = Image.new("RGBA", (80, 88), (0, 0, 0, 0))
    # Sturdy gnarled trunk with roots
    fill_rect_shaded(tree, 31, 44, 18, 38, (214, 144, 84, 255), (112, 58, 26, 255), True)
    # Multi-puff volumetric foliage clusters (MapleStory layered leaf puffs)
    puffs = [
        (24, 40, 18, 15), (56, 40, 18, 15),
        (20, 28, 17, 14), (60, 28, 17, 14),
        (40, 34, 24, 18), (40, 20, 22, 16)
    ]
    for cx, cy, rx, ry in puffs:
        draw_shaded_sphere(
            tree, cx, cy, rx, ry,
            (212, 255, 84, 255), (118, 218, 42, 255), (46, 134, 22, 255),
            (20, 56, 12, 255), -0.35, -0.45
        )
    # Glossy MapleStory Red Apples
    for ax, ay in [(24, 28), (46, 18), (56, 32), (33, 38), (48, 40)]:
        draw_shaded_sphere(
            tree, ax, ay, 4.5, 4.5,
            (255, 148, 148, 255), (242, 46, 58, 255), (156, 18, 28, 255),
            (58, 12, 14, 255), -0.35, -0.35, 0.55
        )
    tree.save(os.path.join(OUT_DIR, "buildings", "apple_tree.png"))

    # --- C. MapleStory Forest Market Stall (108 x 84) ---
    stall = Image.new("RGBA", (108, 84), (0, 0, 0, 0))
    # Wooden support pillars
    fill_rect_shaded(stall, 12, 28, 8, 52, (226, 156, 92, 255), (124, 68, 32, 255), True)
    fill_rect_shaded(stall, 88, 28, 8, 52, (226, 156, 92, 255), (124, 68, 32, 255), True)
    # Counter base with warm wood planks (y: 50..80)
    fill_rect_shaded(stall, 8, 50, 92, 30, (236, 168, 102, 255), (138, 76, 36, 255), True)
    fill_rect_shaded(stall, 12, 56, 84, 20, (196, 124, 66, 255), (112, 58, 26, 255), True)
    # Display wooden bins on counter top
    for bx in range(16, 86, 18):
        fill_rect_shaded(stall, bx, 46, 16, 10, (168, 98, 48, 255), (96, 48, 20, 255), True)
    # Iconic MapleStory Red & Cream Striped Scalloped Awning (y: 8..36)
    for y in range(8, 36):
        inset = max(0, (24 - y) // 2)
        for x in range(4 + inset, 104 - inset):
            stripe = ((x - 4) // 11) % 2
            scallop = int(2.5 * math.sin((x % 11) / 11.0 * math.pi))
            if y > 31 + scallop:
                continue
            if y in (8, 31 + scallop) or x in (4 + inset, 103 - inset):
                put(stall, x, y, (58, 20, 16, 255))
            else:
                ty = (y - 8) / 24.0
                if stripe == 0:
                    c = lerp_color((255, 118, 108, 255), (196, 34, 34, 255), ty)
                else:
                    c = lerp_color((255, 252, 236, 255), (228, 206, 168, 255), ty)
                put(stall, x, y, quantize_col(c, 16))
    # Hanging Gold Meso Signboard on right pillar
    fill_rect_shaded(stall, 74, 28, 22, 20, (255, 246, 214, 255), (218, 188, 138, 255), True)
    draw_shaded_sphere(
        stall, 85, 38, 7, 7,
        (255, 252, 188, 255), (255, 208, 46, 255), (196, 118, 14, 255),
        (78, 42, 8, 255), -0.3, -0.3, 0.5
    )
    stall.save(os.path.join(OUT_DIR, "buildings", "market_stall.png"))


# ============================================================================
# 3. AUTHENTIC MAPLESTORY CHARACTERS & MONSTERS (48x48 per frame!)
# ============================================================================
def draw_maple_eyes_and_blush(img, cx, cy, look_dir=1):
    """Draws expressive MapleStory dark glossy eyes with white specular shine & pink cheeks."""
    for ex in (cx - 6 + look_dir, cx + 5 + look_dir):
        fill_rect_shaded(img, ex - 1, cy - 2, 3, 5, (42, 26, 22, 255), (18, 10, 8, 255), False)
        put(img, ex - 1, cy - 2, (255, 255, 255, 255))
        put(img, ex, cy - 1, (255, 255, 255, 255))
    # Soft rosy blush
    draw_shaded_sphere(img, cx - 10 + look_dir, cy + 2, 3.2, 2.0, (255, 168, 188, 255), (255, 132, 162, 255), (238, 108, 138, 255), (238, 108, 138, 255))
    draw_shaded_sphere(img, cx + 10 + look_dir, cy + 2, 3.2, 2.0, (255, 168, 188, 255), (255, 132, 162, 255), (238, 108, 138, 255), (238, 108, 138, 255))
    # Cute 'w' smile
    put(img, cx - 1 + look_dir, cy + 2, (64, 28, 22, 255))
    put(img, cx + look_dir, cy + 3, (64, 28, 22, 255))
    put(img, cx + 1 + look_dir, cy + 2, (64, 28, 22, 255))


def generate_animals():
    # Each animal sheet is 192 x 48 (4 frames of 48x48!)
    # --- 1. Henesys Moon Bunny (月妙: 192 x 48) ---
    bunny = Image.new("RGBA", (192, 48), (0, 0, 0, 0))
    for f in range(4):
        ox = f * 48
        by = 2 if f in (1, 3) else 0
        # Long plump Moon Bunny ears with pink inner ear
        for ex, tilt in [(ox + 17, -1), (ox + 29, 1)]:
            draw_shaded_sphere(
                bunny, ex + tilt, 10 - by, 4.5, 9.5,
                (255, 255, 255, 255), (242, 246, 255, 255), (198, 210, 234, 255),
                (54, 42, 68, 255)
            )
            draw_shaded_sphere(
                bunny, ex + tilt, 11 - by, 2.2, 6.0,
                (255, 198, 218, 255), (255, 148, 182, 255), (224, 108, 146, 255),
                (224, 108, 146, 255)
            )
        # Chubby body with iconic red/pink Moon Bunny vest
        draw_shaded_sphere(
            bunny, ox + 24, 36 - by, 10, 8.5,
            (255, 128, 148, 255), (232, 58, 88, 255), (164, 28, 52, 255),
            (58, 18, 28, 255)
        )
        # Snowy-white plump belly
        draw_shaded_sphere(
            bunny, ox + 25, 37 - by, 6, 6,
            (255, 255, 255, 255), (242, 246, 255, 255), (206, 216, 238, 255),
            (184, 196, 224, 255)
        )
        # Big round Moon Bunny head
        draw_shaded_sphere(
            bunny, ox + 24, 23 - by, 13.5, 11.0,
            (255, 255, 255, 255), (244, 248, 255, 255), (198, 212, 236, 255),
            (52, 42, 66, 255)
        )
        # Golden Crescent Moon emblem on forehead
        draw_shaded_sphere(
            bunny, ox + 24, 17 - by, 3.5, 3.0,
            (255, 252, 184, 255), (255, 214, 48, 255), (214, 138, 18, 255),
            (128, 68, 12, 255), -0.3, -0.3, 0.5
        )
        draw_maple_eyes_and_blush(bunny, ox + 24, 24 - by, 1)
        # Paws + carrot/pestle prop in action frames
        draw_shaded_sphere(bunny, ox + 18, 43 - by, 4, 3, (255, 255, 255, 255), (236, 242, 255, 255), (192, 204, 228, 255), (52, 42, 66, 255))
        draw_shaded_sphere(bunny, ox + 30, 43 - by, 4, 3, (255, 255, 255, 255), (236, 242, 255, 255), (192, 204, 228, 255), (52, 42, 66, 255))
        if f >= 2:
            draw_shaded_sphere(
                bunny, ox + 38, 32 - by, 5, 7,
                (255, 178, 96, 255), (248, 112, 32, 255), (186, 62, 14, 255),
                (68, 24, 8, 255)
            )
    bunny.save(os.path.join(OUT_DIR, "animals", "bunny_sheet.png"))

    # --- 2. Lotus Otter (荷叶水獭: 192 x 48) ---
    otter = Image.new("RGBA", (192, 48), (0, 0, 0, 0))
    for f in range(4):
        ox = f * 48
        by = 2 if f in (1, 3) else 0
        draw_shaded_sphere(
            otter, ox + 24, 36 - by, 10.5, 8.5,
            (218, 156, 108, 255), (168, 104, 62, 255), (112, 62, 34, 255),
            (48, 24, 12, 255)
        )
        draw_shaded_sphere(
            otter, ox + 25, 37 - by, 6.5, 6.0,
            (255, 244, 218, 255), (242, 218, 178, 255), (212, 182, 138, 255),
            (168, 104, 62, 255)
        )
        draw_shaded_sphere(
            otter, ox + 24, 23 - by, 13.0, 10.5,
            (224, 162, 114, 255), (174, 108, 66, 255), (118, 66, 36, 255),
            (48, 24, 12, 255)
        )
        # Lush Lotus Leaf Hat on head + sparkling dewdrop
        draw_shaded_sphere(
            otter, ox + 24, 12 - by, 14.0, 4.5,
            (204, 255, 82, 255), (108, 214, 42, 255), (44, 132, 22, 255),
            (20, 56, 12, 255)
        )
        draw_shaded_sphere(
            otter, ox + 29, 9 - by, 3.0, 3.0,
            (255, 255, 255, 255), (132, 238, 255, 255), (48, 172, 236, 255),
            (24, 82, 138, 255), -0.3, -0.3, 0.7
        )
        draw_maple_eyes_and_blush(otter, ox + 24, 24 - by, 1)
        # Wooden water bucket + water splash droplets
        fill_rect_shaded(otter, ox + 34, 30 - by, 10, 10, (232, 168, 104, 255), (142, 82, 38, 255), True)
        if f >= 2:
            for wx, wy in [(ox + 42, 24), (ox + 45, 28), (ox + 39, 21)]:
                draw_shaded_sphere(otter, wx, wy, 2.5, 2.5, (255, 255, 255, 255), (118, 236, 255, 255), (42, 168, 236, 255), (22, 86, 148, 255))
    otter.save(os.path.join(OUT_DIR, "animals", "otter_sheet.png"))

    # --- 3. Carpenter Shiba (木匠小柴犬: 192 x 48) ---
    shiba = Image.new("RGBA", (192, 48), (0, 0, 0, 0))
    for f in range(4):
        ox = f * 48
        by = 2 if f in (1, 3) else 0
        # Pointed Shiba ears
        for ex in (ox + 15, ox + 32):
            draw_shaded_sphere(shiba, ex, 11 - by, 4.5, 6.0, (255, 204, 112, 255), (238, 148, 48, 255), (178, 92, 22, 255), (58, 28, 10, 255))
        draw_shaded_sphere(shiba, ox + 24, 36 - by, 10.5, 8.5, (255, 202, 108, 255), (238, 148, 48, 255), (178, 92, 22, 255), (58, 28, 10, 255))
        draw_shaded_sphere(shiba, ox + 25, 37 - by, 6.5, 6.0, (255, 252, 236, 255), (248, 234, 204, 255), (218, 198, 162, 255), (218, 198, 162, 255))
        draw_shaded_sphere(shiba, ox + 24, 23 - by, 13.5, 11.0, (255, 206, 112, 255), (242, 152, 52, 255), (182, 96, 24, 255), (58, 28, 10, 255))
        # Cream lower cheeks & eyebrow Shiba dots
        draw_shaded_sphere(shiba, ox + 24, 27 - by, 10.0, 5.5, (255, 252, 236, 255), (248, 236, 208, 255), (224, 204, 168, 255), (224, 204, 168, 255))
        draw_maple_eyes_and_blush(shiba, ox + 24, 24 - by, 1)
        # Wooden carpenter mallet
        my = 20 if f == 2 else (28 if f == 3 else 24)
        fill_rect_shaded(shiba, ox + 36, my, 4, 12, (218, 148, 84, 255), (128, 68, 30, 255), True)
        draw_shaded_sphere(shiba, ox + 38, my - 2, 6.5, 4.5, (242, 178, 112, 255), (186, 114, 56, 255), (124, 64, 28, 255), (48, 22, 10, 255))
    shiba.save(os.path.join(OUT_DIR, "animals", "shiba_sheet.png"))

    # --- 4. Angler Penguin (企鹅王/垂钓小企鹅: 192 x 48) ---
    penguin = Image.new("RGBA", (192, 48), (0, 0, 0, 0))
    for f in range(4):
        ox = f * 48
        by = 2 if f == 3 else 0
        draw_shaded_sphere(penguin, ox + 24, 36 - by, 11.0, 8.5, (118, 178, 248, 255), (58, 112, 198, 255), (28, 62, 132, 255), (16, 32, 72, 255))
        draw_shaded_sphere(penguin, ox + 25, 37 - by, 7.0, 6.5, (255, 255, 255, 255), (242, 248, 255, 255), (204, 218, 242, 255), (204, 218, 242, 255))
        draw_shaded_sphere(penguin, ox + 24, 23 - by, 13.0, 10.5, (124, 184, 252, 255), (62, 118, 204, 255), (32, 66, 138, 255), (16, 32, 72, 255))
        draw_shaded_sphere(penguin, ox + 25, 25 - by, 9.5, 7.5, (255, 255, 255, 255), (244, 248, 255, 255), (212, 224, 244, 255), (212, 224, 244, 255))
        draw_maple_eyes_and_blush(penguin, ox + 24, 24 - by, 1)
        # Golden beak
        draw_shaded_sphere(penguin, ox + 25, 26 - by, 4.0, 2.5, (255, 246, 152, 255), (255, 196, 38, 255), (204, 124, 14, 255), (78, 42, 8, 255))
        # Straw sun hat with red ribbon
        draw_shaded_sphere(penguin, ox + 24, 12 - by, 14.0, 4.0, (255, 242, 176, 255), (238, 196, 104, 255), (186, 138, 56, 255), (68, 42, 14, 255))
        # Fishing rod + gleaming golden fish in Frame 3
        for i in range(11):
            put(penguin, ox + 34 + i, 28 - i - by, (198, 142, 68, 255))
            put(penguin, ox + 34 + i, 29 - i - by, (92, 52, 20, 255))
        if f == 3:
            draw_shaded_sphere(penguin, ox + 42, 30, 5.0, 3.5, (255, 252, 184, 255), (255, 204, 42, 255), (198, 118, 14, 255), (78, 42, 8, 255), -0.3, -0.3, 0.6)
    penguin.save(os.path.join(OUT_DIR, "animals", "penguin_sheet.png"))


# ============================================================================
# 4. ICONIC MAPLESTORY MONSTERS AS TRAVELERS (Slime, Orange Mushroom, Ribbon Pig: 96x48)
# ============================================================================
def generate_travelers():
    # --- A. Green Slime (绿水灵: 96 x 48, 2 frames of 48x48) ---
    slime = Image.new("RGBA", (96, 48), (0, 0, 0, 0))
    for f in range(2):
        ox = f * 48
        rx = 16.0 if f == 0 else 18.0
        ry = 13.5 if f == 0 else 11.5
        cy = 32 if f == 0 else 34
        # Translucent lime-green jelly body with glossy bean specular highlight
        draw_shaded_sphere(
            slime, ox + 24, cy, rx, ry,
            (226, 255, 124, 255), (124, 236, 48, 255), (42, 148, 18, 255),
            (18, 68, 10, 255), -0.35, -0.42, 0.75
        )
        # Curving Slime antenna + glowing tip droplet
        for i in range(8):
            ax = ox + 22 + int(i * 0.8)
            ay = cy - int(ry) - i
            draw_shaded_sphere(slime, ax, ay, 2.2, 2.2, (204, 255, 108, 255), (112, 224, 42, 255), (46, 148, 18, 255), (18, 68, 10, 255))
        draw_shaded_sphere(
            slime, ox + 30, cy - int(ry) - 7, 4.5, 3.8,
            (238, 255, 148, 255), (138, 242, 58, 255), (54, 162, 24, 255),
            (18, 68, 10, 255), -0.3, -0.3, 0.6
        )
        draw_maple_eyes_and_blush(slime, ox + 24, cy + 2, 1)
    slime.save(os.path.join(OUT_DIR, "travelers", "traveler_slime.png"))

    # --- B. Orange Mushroom (花蘑菇: 96 x 48, 2 frames of 48x48) ---
    mush = Image.new("RGBA", (96, 48), (0, 0, 0, 0))
    for f in range(2):
        ox = f * 48
        by = 2 if f == 1 else 0
        # Plump cream-tan stem body (y: 26..45)
        draw_shaded_sphere(
            mush, ox + 24, 35 - by, 12.5, 10.0,
            (255, 248, 226, 255), (242, 218, 178, 255), (194, 158, 114, 255),
            (62, 34, 16, 255)
        )
        # Big bouncy MapleStory Orange Mushroom Cap (y: 6..30)
        draw_shaded_sphere(
            mush, ox + 24, 19 - by, 18.5, 12.0,
            (255, 214, 112, 255), (252, 138, 38, 255), (186, 72, 14, 255),
            (68, 24, 8, 255), -0.35, -0.45, 0.35
        )
        # Recessed orange-gold circular spots on cap
        for sx, sy, srx, sry in [(ox + 14, 17 - by, 4.5, 3.5), (ox + 26, 13 - by, 5.0, 3.8), (ox + 35, 19 - by, 4.2, 3.2)]:
            draw_shaded_sphere(
                mush, sx, sy, srx, sry,
                (218, 92, 22, 255), (244, 132, 38, 255), (255, 196, 92, 255),
                (148, 54, 12, 255), 0.3, 0.3
            )
        draw_maple_eyes_and_blush(mush, ox + 24, 36 - by, 1)
    mush.save(os.path.join(OUT_DIR, "travelers", "traveler_mushroom.png"))

    # --- C. Ribbon Pig (漂漂猪: 96 x 48, 2 frames of 48x48) ---
    pig = Image.new("RGBA", (96, 48), (0, 0, 0, 0))
    for f in range(2):
        ox = f * 48
        by = 2 if f == 1 else 0
        # Plump pink pig body
        draw_shaded_sphere(
            pig, ox + 24, 31 - by, 16.0, 12.0,
            (255, 222, 234, 255), (255, 164, 192, 255), (214, 102, 136, 255),
            (68, 24, 38, 255)
        )
        # Iconic Big Red Ribbon on back
        draw_shaded_sphere(pig, ox + 18, 17 - by, 6.0, 4.0, (255, 132, 142, 255), (238, 42, 58, 255), (162, 18, 32, 255), (62, 12, 18, 255))
        draw_shaded_sphere(pig, ox + 28, 17 - by, 6.0, 4.0, (255, 132, 142, 255), (238, 42, 58, 255), (162, 18, 32, 255), (62, 12, 18, 255))
        draw_shaded_sphere(pig, ox + 23, 18 - by, 3.0, 3.0, (255, 244, 156, 255), (248, 192, 38, 255), (188, 114, 14, 255), (62, 12, 18, 255))
        # Cute pig snout on right
        draw_shaded_sphere(
            pig, ox + 35, 31 - by, 5.5, 4.2,
            (255, 192, 212, 255), (248, 128, 162, 255), (198, 78, 112, 255),
            (68, 24, 38, 255)
        )
        put(pig, ox + 34, 31 - by, (68, 24, 38, 255))
        put(pig, ox + 37, 31 - by, (68, 24, 38, 255))
        draw_maple_eyes_and_blush(pig, ox + 26, 28 - by, 1)
    pig.save(os.path.join(OUT_DIR, "travelers", "traveler_pig.png"))


# ============================================================================
# 5. HIGH-DETAIL CROPS & GOODS (128 x 160: 4 stages x 32x32 for 4 crops + icons)
# ============================================================================
def generate_crops():
    crops = Image.new("RGBA", (128, 160), (0, 0, 0, 0))
    defs = [
        ((255, 192, 112, 255), (248, 118, 32, 255), (178, 62, 12, 255)),  # Carrot
        ((255, 156, 172, 255), (242, 48, 76, 255), (164, 18, 38, 255)),   # Strawberry
        ((212, 182, 255, 255), (124, 82, 248, 255), (58, 28, 158, 255)),  # Ellinia Shroom
        ((255, 248, 156, 255), (252, 198, 38, 255), (188, 118, 14, 255)), # Orbis Pineapple
    ]
    for row, (c_hi, c_mid, c_low) in enumerate(defs):
        ry = row * 32
        # Stage 0: Seeds
        for sx, sy in [(11, 22), (16, 20), (20, 23)]:
            draw_shaded_sphere(crops, sx, ry + sy, 2.8, 2.2, (255, 242, 188, 255), (228, 184, 108, 255), (168, 118, 54, 255), (58, 32, 14, 255))
        # Stage 1: Lush Sprout
        draw_shaded_sphere(crops, 32 + 13, ry + 19, 4.5, 3.0, (212, 255, 88, 255), (112, 214, 42, 255), (42, 128, 20, 255), (20, 56, 12, 255))
        draw_shaded_sphere(crops, 32 + 19, ry + 18, 4.5, 3.0, (212, 255, 88, 255), (112, 214, 42, 255), (42, 128, 20, 255), (20, 56, 12, 255))
        # Stage 2: Blooming Bush
        draw_shaded_sphere(crops, 64 + 16, ry + 19, 8.5, 6.5, (204, 252, 82, 255), (104, 208, 38, 255), (38, 124, 18, 255), (20, 56, 12, 255))
        draw_shaded_sphere(crops, 64 + 13, ry + 15, 2.8, 2.8, (255, 255, 255, 255), (255, 238, 128, 255), (228, 182, 54, 255), (78, 48, 14, 255))
        # Stage 3: Glossy Ripe Fruit
        draw_shaded_sphere(crops, 96 + 16, ry + 10, 6.0, 3.5, (208, 255, 84, 255), (108, 214, 42, 255), (42, 128, 20, 255), (20, 56, 12, 255))
        draw_shaded_sphere(crops, 96 + 16, ry + 19, 8.0, 7.5, c_hi, c_mid, c_low, (54, 20, 12, 255), -0.35, -0.35, 0.55)
        # Row 4 (y=128..159): Harvested Icon
        ox = row * 32
        draw_shaded_sphere(crops, ox + 16, 128 + 10, 5.5, 3.0, (208, 255, 84, 255), (108, 214, 42, 255), (42, 128, 20, 255), (20, 56, 12, 255))
        draw_shaded_sphere(crops, ox + 16, 128 + 18, 7.5, 7.0, c_hi, c_mid, c_low, (54, 20, 12, 255), -0.35, -0.35, 0.55)
    crops.save(os.path.join(OUT_DIR, "crops", "crops_sheet.png"))


# ============================================================================
# 6. CLASSIC MAPLESTORY UI (Metallic Gold/Blue Bevel Bar, Glossy Jelly Buttons, Puffy Gradient Numbers)
# ============================================================================
def generate_ui_kit():
    # --- A. Classic MapleStory Status/Shop Frame NinePatch (36 x 36) ---
    panel = Image.new("RGBA", (36, 36), (0, 0, 0, 0))
    for y in range(36):
        for x in range(36):
            # Rounded 2px corners
            if (x < 2 and y < 2) or (x >= 34 and y < 2) or (x < 2 and y >= 34) or (x >= 34 and y >= 34):
                continue
            dist_edge = min(x, y, 35 - x, 35 - y)
            if dist_edge == 0:
                put(panel, x, y, (22, 30, 48, 255))  # Deep navy outer border
            elif dist_edge == 1:
                put(panel, x, y, (255, 232, 128, 255) if (x + y < 36) else (186, 132, 38, 255))  # Gold metallic rim
            elif dist_edge == 2:
                put(panel, x, y, (142, 92, 24, 255))
            elif dist_edge == 3:
                put(panel, x, y, (255, 250, 228, 255))
            else:
                # Classic MapleStory warm cream/slate inner window gradient with subtle scanline
                ty = (y - 4) / 28.0
                c = lerp_color((62, 82, 118, 245), (36, 48, 74, 248), ty)
                if y % 2 == 0:
                    c = lerp_color(c, (82, 108, 152, 245), 0.15)
                put(panel, x, y, quantize_col(c, 20))
    panel.save(os.path.join(OUT_DIR, "ui", "panel_wood_9patch.png"))

    # --- B. MapleStory Chat / Shop Balloon NinePatch (32 x 32) ---
    parch = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    for y in range(32):
        for x in range(32):
            if (x in (0, 31) and y in (0, 31)):
                continue
            dist_edge = min(x, y, 31 - x, 31 - y)
            if dist_edge == 0:
                put(parch, x, y, (42, 58, 92, 255))
            elif dist_edge == 1:
                put(parch, x, y, (168, 198, 238, 255))
            else:
                put(parch, x, y, (255, 255, 255, 245))
    parch.save(os.path.join(OUT_DIR, "ui", "panel_parchment_9patch.png"))

    # --- C. Classic MapleStory Glossy 3D Jelly Pill Buttons (36 x 28) ---
    btn_configs = [
        ("btn_normal.png", 0, (255, 212, 72, 255), (238, 132, 24, 255), (32, 22, 12, 255)),
        ("btn_hover.png", 0, (168, 255, 92, 255), (68, 196, 28, 255), (255, 248, 148, 255)),
        ("btn_pressed.png", 1, (218, 152, 38, 255), (158, 86, 16, 255), (32, 22, 12, 255)),
    ]
    for fname, y_off, c_top, c_bot, border_c in btn_configs:
        btn = Image.new("RGBA", (36, 28), (0, 0, 0, 0))
        for y in range(2 + y_off, 26 + y_off):
            for x in range(2, 34):
                if (x in (2, 33) and y in (2 + y_off, 25 + y_off)):
                    continue
                if x in (2, 33) or y in (2 + y_off, 25 + y_off):
                    put(btn, x, y, border_c)
                else:
                    ty = (y - (3 + y_off)) / 21.0
                    c = lerp_color(c_top, c_bot, ty)
                    # Classic MapleStory top white glass reflection strip!
                    if ty < 0.36 and 5 <= x <= 30:
                        c = lerp_color(c, (255, 255, 255, 255), 0.58 * (1.0 - ty / 0.36))
                    put(btn, x, y, quantize_col(c, 20))
        btn.save(os.path.join(OUT_DIR, "ui", fname))

    # --- D. High-Detail MapleStory UI Icons (256 x 32: 8 icons of 32x32) ---
    icons = Image.new("RGBA", (256, 32), (0, 0, 0, 0))
    # [0] Iconic MapleStory Gold Meso Coin Sack / Coin
    draw_shaded_sphere(icons, 16, 16, 11, 11, (255, 255, 198, 255), (255, 204, 42, 255), (192, 108, 12, 255), (64, 32, 6, 255), -0.35, -0.35, 0.65)
    fill_rect_shaded(icons, 14, 10, 4, 12, (218, 132, 18, 255), (148, 76, 8, 255), False)
    # [1] Star Dew Mana Crystal
    draw_shaded_sphere(icons, 32 + 16, 16, 9.5, 11.5, (238, 255, 255, 255), (82, 224, 255, 255), (24, 124, 218, 255), (14, 52, 112, 255), -0.35, -0.35, 0.75)
    # [2] Seed / Strawberry Icon
    draw_shaded_sphere(icons, 64 + 16, 18, 9.5, 9.0, (255, 168, 182, 255), (242, 48, 76, 255), (164, 18, 38, 255), (58, 12, 20, 255), -0.3, -0.3, 0.5)
    draw_shaded_sphere(icons, 64 + 16, 9, 6.5, 3.5, (212, 255, 88, 255), (108, 214, 42, 255), (38, 124, 18, 255), (18, 52, 10, 255))
    # [3] Animal Companion Paw / Moon Bunny Icon
    draw_shaded_sphere(icons, 96 + 16, 19, 8.5, 7.0, (255, 228, 238, 255), (255, 156, 188, 255), (218, 96, 136, 255), (68, 22, 38, 255))
    for px_x, py_y in [(96 + 9, 10), (96 + 16, 8), (96 + 23, 10)]:
        draw_shaded_sphere(icons, px_x, py_y, 3.5, 3.5, (255, 228, 238, 255), (255, 156, 188, 255), (218, 96, 136, 255), (68, 22, 38, 255))
    # [4] Expand Left Ellinia Arrow
    draw_shaded_sphere(icons, 128 + 16, 16, 10, 10, (168, 255, 228, 255), (46, 198, 168, 255), (18, 112, 98, 255), (12, 48, 42, 255), -0.3, -0.3, 0.5)
    # [5] Expand Right Orbis Arrow
    draw_shaded_sphere(icons, 160 + 16, 16, 10, 10, (255, 248, 176, 255), (248, 196, 48, 255), (188, 118, 16, 255), (68, 38, 8, 255), -0.3, -0.3, 0.5)
    # [6] Market Star Icon
    draw_shaded_sphere(icons, 192 + 16, 16, 10, 10, (255, 184, 184, 255), (238, 58, 68, 255), (162, 22, 32, 255), (58, 12, 16, 255), -0.3, -0.3, 0.5)
    # [7] Window Dock Toggle Icon
    fill_rect_shaded(icons, 224 + 7, 7, 18, 18, (228, 244, 255, 255), (138, 178, 226, 255), True)
    fill_rect_shaded(icons, 224 + 7, 7, 18, 6, (92, 184, 252, 255), (38, 112, 198, 255), True)
    icons.save(os.path.join(OUT_DIR, "ui", "icons_ui.png"))

    # --- E. MapleStory Puffy Gradient Damage/Meso Number Atlas (256 x 24: 16 glyphs x 16x24) ---
    glyph_patterns = [
        ["011110", "110011", "110011", "110111", "111011", "110011", "110011", "011110"],  # 0
        ["001100", "011100", "001100", "001100", "001100", "001100", "001100", "011110"],  # 1
        ["011110", "110011", "000011", "000110", "001100", "011000", "110000", "111111"],  # 2
        ["011110", "110011", "000011", "001110", "000011", "000011", "110011", "011110"],  # 3
        ["000110", "001110", "011110", "110110", "111111", "000110", "000110", "000110"],  # 4
        ["111111", "110000", "111110", "000011", "000011", "000011", "110011", "011110"],  # 5
        ["011110", "110000", "111110", "110011", "110011", "110011", "110011", "011110"],  # 6
        ["111111", "000011", "000110", "001100", "001100", "011000", "011000", "011000"],  # 7
        ["011110", "110011", "110011", "011110", "110011", "110011", "110011", "011110"],  # 8
        ["011110", "110011", "110011", "011111", "000011", "000011", "110011", "011110"],  # 9
        ["000000", "001100", "001100", "111111", "111111", "001100", "001100", "000000"],  # +
        ["000000", "000000", "000000", "111111", "111111", "000000", "000000", "000000"],  # -
        ["011110", "110011", "110000", "110111", "110011", "110011", "110011", "011110"],  # G
        ["000011", "000011", "000110", "001100", "011000", "110000", "110000", "000000"],  # /
        ["000000", "110011", "011110", "001100", "011110", "110011", "000000", "000000"],  # x
        ["001100", "001100", "001100", "001100", "001100", "000000", "001100", "001100"],  # !
    ]
    font_img = Image.new("RGBA", (256, 24), (0, 0, 0, 0))
    for idx, pat in enumerate(glyph_patterns):
        ox = idx * 16
        # Draw 2x scaled puffy glyph with MapleStory white->yellow->orange gradient
        for r, row_str in enumerate(pat):
            for c, ch in enumerate(row_str):
                if ch == "1":
                    for dy in range(2):
                        for dx in range(2):
                            py = 4 + r * 2 + dy
                            px = ox + 2 + c * 2 + dx
                            t = (r * 2 + dy) / 15.0
                            if t < 0.25:
                                col = (255, 255, 236, 255)
                            elif t < 0.65:
                                col = lerp_color((255, 242, 82, 255), (255, 178, 28, 255), (t - 0.25) / 0.40)
                            else:
                                col = lerp_color((255, 178, 28, 255), (224, 96, 12, 255), (t - 0.65) / 0.35)
                            put(font_img, px, py, quantize_col(col, 20))
    # Thick 2px dark burgundy/brown MapleStory outline + drop shadow
    font_img = add_colored_outline(font_img, (72, 24, 8, 255))
    font_img = add_colored_outline(font_img, (38, 12, 4, 255))
    font_img.save(os.path.join(OUT_DIR, "ui", "pixel_font_atlas.png"))


if __name__ == "__main__":
    ensure_dirs()
    generate_islands()
    generate_buildings()
    generate_animals()
    generate_travelers()
    generate_crops()
    generate_ui_kit()
    print("Authentic MapleStory Online (Hi-Bit Volumetric) assets generated in:", OUT_DIR)
