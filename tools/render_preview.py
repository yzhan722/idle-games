#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Composes the MapleStory Online (Hi-Bit Volumetric Sprite Style) scene preview
at 1280x240 native -> 1920x360 desktop strip resolution.
"""

import os
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(BASE_DIR, "assets", "pixel_art")


def load_art(sub, name):
    return Image.open(os.path.join(ART_DIR, sub, name)).convert("RGBA")


def blit(canvas, sprite, x, y, src_box=None):
    part = sprite.crop(src_box) if src_box else sprite
    canvas.alpha_composite(part, (int(x), int(y)))


def tile_9patch(canvas, tex, dst_x, dst_y, dst_w, dst_h):
    tw, th = tex.size
    out = Image.new("RGBA", (dst_w, dst_h), (0, 0, 0, 0))
    for y in range(dst_h):
        for x in range(dst_w):
            sx = x if x < 6 else (tw - (dst_w - x) if x >= dst_w - 6 else 6 + (x % (tw - 12)))
            sy = y if y < 6 else (th - (dst_h - y) if y >= dst_h - 6 else 6 + (y % (th - 12)))
            out.putpixel((x, y), tex.getpixel((sx, sy)))
    canvas.alpha_composite(out, (int(dst_x), int(dst_y)))


def draw_pixel_text(canvas, font_tex, x, y, text_str):
    glyph_map = {
        "0": 0, "1": 1, "2": 2, "3": 3, "4": 4,
        "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
        "+": 10, "-": 11, "G": 12, "/": 13, "x": 14, "!": 15
    }
    for i, ch in enumerate(text_str):
        if ch in glyph_map:
            idx = glyph_map[ch]
            blit(canvas, font_tex, x + i * 13, y, (idx * 16, 0, idx * 16 + 16, 24))


def render_scene(out_path):
    # 1280 x 240 native Hi-Bit MapleStory canvas
    canvas = Image.new("RGBA", (1280, 240), (26, 36, 56, 255))
    # Subtle sky gradient in background to represent desktop wallpaper behind transparent area
    for y in range(240):
        for x in range(1280):
            if y < 64:
                canvas.putpixel((x, y), (34, 48, 74, 255))

    henesys = load_art("islands", "island_henesys.png")
    ellinia = load_art("islands", "island_ellinia.png")
    orbis = load_art("islands", "island_orbis_coast.png")
    bridge = load_art("islands", "bridge_wood.png")
    soil = load_art("islands", "soil_plot.png")
    crops = load_art("crops", "crops_sheet.png")
    stall = load_art("buildings", "market_stall.png")
    tree = load_art("buildings", "apple_tree.png")
    cottage = load_art("buildings", "cottage_mushroom.png")

    bunny = load_art("animals", "bunny_sheet.png")
    otter = load_art("animals", "otter_sheet.png")
    shiba = load_art("animals", "shiba_sheet.png")
    penguin = load_art("animals", "penguin_sheet.png")

    slime = load_art("travelers", "traveler_slime.png")
    mush = load_art("travelers", "traveler_mushroom.png")
    pig = load_art("travelers", "traveler_pig.png")

    panel = load_art("ui", "panel_wood_9patch.png")
    parch = load_art("ui", "panel_parchment_9patch.png")
    btn_n = load_art("ui", "btn_normal.png")
    btn_h = load_art("ui", "btn_hover.png")
    icons = load_art("ui", "icons_ui.png")
    font = load_art("ui", "pixel_font_atlas.png")

    # 1. Three MapleStory Floating Islands + Rope Bridges
    blit(canvas, ellinia, 44, 72)
    blit(canvas, bridge, 356, 94)
    blit(canvas, henesys, 416, 68)
    blit(canvas, bridge, 852, 94)
    blit(canvas, orbis, 912, 72)

    # 2. MapleStory Buildings (Lush Henesys Tree, Spotted Mushroom House, Market Stall)
    blit(canvas, tree, 424, 16)
    blit(canvas, cottage, 636, 30)
    blit(canvas, stall, 736, 18)

    # Harvested goods inside Market Stall bins
    for c in range(4):
        blit(canvas, crops, 750 + c * 18, 52, (c * 32, 128, c * 32 + 32, 160))

    # 3. 1.5D Farm Plots & Multi-stage Crops
    for col in range(4):
        px, py = 124 + col * 36, 90 + (col % 2) * 12
        blit(canvas, soil, px, py, (64, 0, 96, 32))
        st = (col + 1) % 4
        blit(canvas, crops, px, py - 10, (st * 32, 64, st * 32 + 32, 96))

    for row in range(2):
        for col in range(4):
            px, py = 486 + col * 36, 84 + row * 18
            st_soil = 2 if (col + row) % 2 == 0 else 1
            blit(canvas, soil, px, py, (st_soil * 32, 0, st_soil * 32 + 32, 32))
            cid = row
            st = (col + row + 1) % 4
            blit(canvas, crops, px, py - 10, (st * 32, cid * 32, st * 32 + 32, cid * 32 + 32))

    for col in range(4):
        px, py = 944 + col * 36, 90 + (col % 2) * 12
        blit(canvas, soil, px, py, (96, 0, 128, 32))
        st = (col + 2) % 4
        blit(canvas, crops, px, py - 10, (st * 32, 96, st * 32 + 32, 128))

    # 4. Iconic MapleStory Animals & Monster Travelers
    blit(canvas, shiba, 448, 62, (144, 0, 192, 48))     # Carpenter Shiba
    blit(canvas, bunny, 536, 70, (144, 0, 192, 48))     # Henesys Moon Bunny (月妙)
    blit(canvas, otter, 682, 74, (96, 0, 144, 48))      # Lotus Otter splashing water
    blit(canvas, penguin, 722, 86, (144, 0, 192, 48))   # Angler Penguin by waterfall

    blit(canvas, slime, 268, 70, (0, 0, 48, 48))        # Green Slime (绿水灵)
    blit(canvas, mush, 804, 72, (48, 0, 96, 48))        # Orange Mushroom (花蘑菇)
    blit(canvas, pig, 1094, 74, (0, 0, 48, 48))        # Ribbon Pig (漂漂猪)

    # MapleStory Chat Balloon & Puffy Gradient Damage/Meso Numbers
    tile_9patch(canvas, parch, 812, 36, 38, 36)
    blit(canvas, icons, 815, 38, (0, 0, 32, 32))
    draw_pixel_text(canvas, font, 764, 4, "+36G")
    draw_pixel_text(canvas, font, 538, 46, "+1")

    # 5. Classic MapleStory Metallic Gold/Blue Beveled Status Bar + Glossy Jelly Pill Buttons
    tile_9patch(canvas, panel, 340, 194, 600, 42)
    blit(canvas, icons, 352, 199, (0, 0, 32, 32))
    draw_pixel_text(canvas, font, 388, 203, "580G")
    blit(canvas, icons, 486, 199, (32, 0, 64, 32))
    draw_pixel_text(canvas, font, 522, 203, "24")
    draw_pixel_text(canvas, font, 576, 203, "8/12")

    icon_indices = [2, 3, 4, 5, 7]
    for i, ic in enumerate(icon_indices):
        bx = 668 + i * 52
        btex = btn_h if i == 1 else btn_n
        blit(canvas, btex, bx, 201)
        blit(canvas, icons, bx + 2, 199, (ic * 32, 0, ic * 32 + 32, 32))

    canvas.save(out_path)
    print("Saved MapleStory Hi-Bit preview to:", out_path)


if __name__ == "__main__":
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE_DIR, "preview_3x.png")
    render_scene(target)
