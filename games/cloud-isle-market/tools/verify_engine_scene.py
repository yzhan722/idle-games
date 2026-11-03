#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Renders an exact 1920x260 verification preview of the Phase 4 Masterpiece Polish Cloud Isle Market:
- 3 Masterpiece 1.5D Diorama Floating Islands (built-in wooden picket fence, cobblestone garden path,
  wildflowers, lotus pond, mossy roots, glowing forest mushrooms, sandy beach ripples & starfish)
- 6 Masterpiece Village Buildings (Half-Timbered Windmill Farmhouse, Market Stall with lantern & stacked shelf,
  Orchard Apple Tree, Hollow-Tree Alchemy Cottage, Coconut Tiki Bar with fairy lights, Stone Mortar)
- Artisan Pixel UI Kit (Zero raw draw_rect boxes: recessed dark-wood & brass resource pills,
  brass-cornered upgrade cards in open drawer preview, beveled wood & brass-stud buttons, bold YouYuan typography)
"""

import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(BASE_DIR, "assets", "pixel_art")


def load_art(sub, name):
    return Image.open(os.path.join(ART_DIR, sub, name)).convert("RGBA")


def blit(canvas, sprite, x, y, src_box=None, dst_size=None):
    part = sprite.crop(src_box) if src_box else sprite
    if dst_size:
        part = part.resize(dst_size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(part, (int(x), int(y)))


def draw_pixel_text(canvas, font_tex, x, y, text_str, scale_f=0.78):
    glyph_map = {
        "0": 0, "1": 1, "2": 2, "3": 3, "4": 4,
        "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
        "+": 10, "-": 11, "G": 12, "/": 13, "x": 14, "!": 15
    }
    step_w = int(round(18 * scale_f))
    cw = int(round(24 * scale_f))
    ch_h = int(round(32 * scale_f))
    for i, ch in enumerate(text_str):
        if ch in glyph_map:
            idx = glyph_map[ch]
            blit(canvas, font_tex, x + i * step_w, y, (idx * 24, 0, idx * 24 + 24, 32), (cw, ch_h))


def draw_cn(draw_obj, x, y, txt, fnt, fill=(255, 245, 214, 255), outline=(42, 16, 4, 252)):
    draw_obj.text((x + 1, y + 2), txt, font=fnt, fill=(26, 8, 2, 230))
    for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)):
        draw_obj.text((x + ox, y + oy), txt, font=fnt, fill=outline)
    draw_obj.text((x, y), txt, font=fnt, fill=fill)


def verify_render(out_path):
    world_layer = Image.new("RGBA", (1920, 260), (0, 0, 0, 0))
    canvas = Image.new("RGBA", (1920, 300), (22, 28, 42, 255))

    henesys = load_art("islands", "island_henesys.png")
    ellinia = load_art("islands", "island_ellinia.png")
    orbis = load_art("islands", "island_orbis_coast.png")
    bridge = load_art("islands", "bridge_wood.png")
    soil = load_art("islands", "soil_plot.png")
    crops = load_art("crops", "crops_sheet.png")
    delicacies = load_art("buildings", "delicacies_sheet.png")
    stall = load_art("buildings", "market_stall.png")
    tree = load_art("buildings", "apple_tree.png")
    cottage = load_art("buildings", "cottage_mushroom.png")
    left_hut = load_art("buildings", "landmark_left_hut.png")
    right_tiki = load_art("buildings", "landmark_right_tiki.png")
    mortar = load_art("buildings", "workshop_mortar.png")
    cauldron = load_art("buildings", "workshop_cauldron.png")
    signpost = load_art("buildings", "decor_signpost.png")
    lamp = load_art("buildings", "decor_lamp.png")
    scarecrow = load_art("buildings", "decor_scarecrow.png")

    bunny = load_art("animals", "bunny_sheet.png")
    otter = load_art("animals", "otter_sheet.png")
    shiba = load_art("animals", "shiba_sheet.png")
    penguin = load_art("animals", "penguin_sheet.png")
    fox = load_art("animals", "fox_sheet.png")
    toucan = load_art("animals", "toucan_sheet.png")

    hedgehog = load_art("travelers", "traveler_slime.png")
    tabby_cat = load_art("travelers", "traveler_mushroom.png")
    raccoon = load_art("travelers", "traveler_pig.png")

    panel = load_art("ui", "panel_wood_9patch.png")
    pill = load_art("ui", "ui_resource_pill.png")
    parch = load_art("ui", "panel_parchment_9patch.png")
    icons = load_art("ui", "icons_ui.png")
    heart = load_art("ui", "emote_heart.png")
    font = load_art("ui", "pixel_font_atlas.png")

    cn_font = None
    for fpath in ["C:/Windows/Fonts/SIMYOU.TTF", "C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/simsun.ttc"]:
        if os.path.exists(fpath):
            cn_font = ImageFont.truetype(fpath, 13)
            break
    if cn_font is None:
        cn_font = ImageFont.load_default()

    # 1. Three Masterpiece 1.5D Diorama Island Decks + Suspension Bridges + Lotus Pond Wooden Footbridge
    blit(canvas, ellinia, 64, 74)
    blit(canvas, bridge, 492, 124)
    blit(canvas, henesys, 560, 70)
    blit(canvas, bridge, 1312, 118)
    blit(canvas, orbis, 1396, 74)

    # 1.5 Lotus Pond Wooden Plank Footbridge (荷花池木栈桥) with Cedar Pilings & Water Ripples
    d_pond = ImageDraw.Draw(canvas)
    for px in (1096, 1188, 1284):
        d_pond.ellipse((px - 8, 143, px + 8, 149), outline=(224, 252, 255, 180), width=1)
        d_pond.rectangle((px - 3, 134, px + 3, 147), fill=(92, 54, 28, 245))
    blit(canvas, bridge, 1082, 118, None, (114, 38))
    blit(canvas, bridge, 1188, 118, None, (114, 38))

    ysort_items = []

    # 6 Masterpiece Village Buildings + Workshops + Decorations
    ysort_items.append((112, lambda: blit(canvas, cottage, 842 - 58, 112 - 108)))
    ysort_items.append((114, lambda: blit(canvas, tree, 632 - 56, 114 - 112)))
    ysort_items.append((120, lambda: blit(canvas, left_hut, 138 - 56, 120 - 104)))
    ysort_items.append((120, lambda: blit(canvas, right_tiki, 1748 - 58, 120 - 104)))

    def draw_stall_with_stacked_shelf():
        ox, oy = 1022 - 64, 116 - 98
        blit(canvas, stall, ox, oy)
        for c_i in range(5):
            blit(canvas, crops, ox + 24 + c_i * 13, oy + 44, (120, (c_i % 4) * 40, 160, ((c_i % 4) + 1) * 40), (16, 16))
        for s_idx in range(6):
            r_id = s_idx % 4
            blit(canvas, delicacies, ox + 20 + int(s_idx * 12.5), oy + 56 - (s_idx % 2) * 3, (r_id * 36, 0, (r_id + 1) * 36, 36), (18, 18))

    ysort_items.append((116, draw_stall_with_stacked_shelf))
    ysort_items.append((120, lambda: blit(canvas, lamp, 978 - 22, 120 - 62)))
    ysort_items.append((108, lambda: blit(canvas, scarecrow, 746 - 24, 108 - 52)))
    ysort_items.append((126, lambda: (
        blit(canvas, mortar, 942 - 34, 126 - 52),
        blit(canvas, delicacies, 942 - 12, 126 - 68, (0, 0, 36, 36), (24, 24))
    )))
    ysort_items.append((130, lambda: (
        blit(canvas, cauldron, 602 - 34, 130 - 56),
        blit(canvas, delicacies, 602 - 12, 130 - 72, (72, 0, 108, 36), (24, 24))
    )))
    ysort_items.append((144, lambda: blit(canvas, signpost, 648 - 22, 144 - 50)))

    # Glowwood Left Island plots (on flat emerald moss clearing: y = 114, 131)
    for row in range(2):
        for col in range(3):
            px, py = 218 + col * 42 + row * 6, 114 + row * 17
            st = (col + row + 1) % 4
            s_idx = 2 if (col % 2 == 0) else 1
            ysort_items.append((py, lambda x=px, y=py, ss=s_idx, s=st: (
                blit(canvas, soil, x - 20, y - 9, (ss * 40, 0, ss * 40 + 40, 18)),
                blit(canvas, crops, x - 15, y - 26, (s * 40, 80, s * 40 + 40, 120), (30, 30))
            )))

    # Cloudbrook Center Island plots (on flat green meadow lawn: y = 115, 132, above cobblestone path!)
    for row in range(2):
        for col in range(4):
            px, py = 686 + col * 38 + row * 6, 115 + row * 17
            st_soil = (col + row * 2) % 4
            cid = row % 2
            st = (col + row + 1) % 4
            ysort_items.append((py, lambda x=px, y=py, ss=st_soil, c=cid, s=st: (
                blit(canvas, soil, x - 20, y - 9, (ss * 40, 0, ss * 40 + 40, 18)),
                blit(canvas, crops, x - 15, y - 26, (s * 40, c * 40, s * 40 + 40, c * 40 + 40), (30, 30)) if ss > 0 else None
            )))

    # Coral Beach Right Island plots (on flat golden beach plateau: y = 102, 119, above ocean surf!)
    for row in range(2):
        for col in range(3):
            px, py = 1476 + col * 42 + row * 6, 102 + row * 17
            st = (col + row + 2) % 4
            s_idx = 2 if (col % 2 == 0) else 3
            ysort_items.append((py, lambda x=px, y=py, ss=s_idx, s=st: (
                blit(canvas, soil, x - 20, y - 9, (ss * 40, 0, ss * 40 + 40, 18)),
                blit(canvas, crops, x - 15, y - 26, (s * 40, 120, s * 40 + 40, 160), (30, 30))
            )))

    # 6 True Multi-Pose Animal Companions (all standing squarely on flat lawn, bridge planks, or dry sand!)
    ysort_items.append((128, lambda: blit(canvas, fox, 195 - 30, 128 - 56, (120, 0, 180, 60))))
    ysort_items.append((124, lambda: blit(canvas, shiba, 646 - 30, 124 - 56, (120, 0, 180, 60))))
    ysort_items.append((134, lambda: (
        blit(canvas, bunny, 908 - 30, 134 - 56, (120, 0, 180, 60)),
        blit(canvas, heart, 908 + 8, 134 - 66, None, (22, 22))
    )))
    ysort_items.append((136, lambda: blit(canvas, otter, 838 - 30, 136 - 56, (120, 0, 180, 60))))
    ysort_items.append((138, lambda: blit(canvas, penguin, 1076 - 30, 138 - 56, (120, 0, 180, 60))))
    ysort_items.append((118, lambda: blit(canvas, toucan, 1650 - 30, 118 - 56, (120, 0, 180, 60))))

    # 3 Original Non-IP Woodland Travelers walking on the Left Bridge Arch, Market Stall Path, & Lotus Pond Wooden Footbridge!
    ysort_items.append((140, lambda: blit(canvas, tabby_cat, 1022 - 24, 140 - 44, (0, 0, 48, 48))))
    ysort_items.append((132, lambda: blit(canvas, hedgehog, 540 - 24, 132 - 44, (0, 0, 48, 48))))
    ysort_items.append((135, lambda: blit(canvas, raccoon, 1192 - 24, 135 - 44, (0, 0, 48, 48))))

    ysort_items.sort(key=lambda item: item[0])
    for _, draw_fn in ysort_items:
        draw_fn()

    # Speech bubble with Caramel Apple-Strawberry Pie icon at Market Stall
    blit(canvas, parch, 1000, 94, None, (42, 34))
    blit(canvas, delicacies, 1008, 98, (36, 0, 72, 36), (26, 26))
    draw_pixel_text(canvas, font, 985, 64, "+290G", 0.85)

    # Flush-Bottom Artisan Carved Walnut & Brass HUD Bar (y=238..296 in 1920x300 viewport)
    full_canvas = Image.new("RGBA", (1920, 300), (22, 28, 42, 255))
    full_canvas.alpha_composite(canvas, (0, 36))
    canvas = full_canvas
    # Overwrite bottom strip where old y=202..260 would be if needed (canvas was only islands/props before HUD)
    blit(canvas, panel, 480, 238)
    blit(canvas, pill, 496, 247, None, (144, 36))
    blit(canvas, pill, 644, 247, None, (134, 36))
    blit(canvas, pill, 782, 247, None, (136, 36))
    blit(canvas, pill, 922, 247, None, (114, 36))

    blit(canvas, icons, 502, 250, (0, 0, 48, 48), (28, 28))
    draw_pixel_text(canvas, font, 532, 254, "216393G", 0.64)

    blit(canvas, icons, 649, 251, (48, 0, 96, 48), (26, 26))
    blit(canvas, delicacies, 787, 251, (0, 0, 36, 36), (26, 26))

    d_obj = ImageDraw.Draw(canvas)
    draw_cn(d_obj, 677, 258, "露3660 果4", cn_font, (214, 245, 255, 255))
    draw_cn(d_obj, 817, 258, "货架 18/18", cn_font, (255, 240, 184, 255))
    draw_cn(d_obj, 938, 258, "★晨风晴天", cn_font, (255, 245, 204, 255))

    short_tags = ["种子", "工坊", "伙伴", "扩建", "食谱", "设置"]
    icon_indices = [2, 6, 3, 4, 5, 7]
    for i in range(6):
        bx = 1048 + i * 61
        ic_idx = icon_indices[i]
        blit(canvas, icons, bx + 2, 240, (ic_idx * 48, 0, ic_idx * 48 + 48, 48), (42, 42))
        draw_cn(d_obj, bx + 10, 276, short_tags[i], cn_font)

    canvas.save(out_path)
    print("Saved Phase 4 Masterpiece Polish Cloud Isle Market verification scene to:", out_path)


def verify_render_drawer_open(base_closed_path, out_open_path):
    canvas = Image.open(base_closed_path).convert("RGBA")
    drawer = load_art("ui", "panel_drawer_parchment.png")
    card = load_art("ui", "ui_drawer_card.png")
    card_h = load_art("ui", "ui_drawer_card_hover.png")
    pill = load_art("ui", "ui_resource_pill.png")
    blit(canvas, drawer, 520, 132, None, (880, 104))
    blit(canvas, pill, 1318, 142, None, (56, 22))

    cn_font = None
    cn_sub = None
    for fpath in ["C:/Windows/Fonts/SIMYOU.TTF", "C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/simsun.ttc"]:
        if os.path.exists(fpath):
            cn_font = ImageFont.truetype(fpath, 13)
            cn_sub = ImageFont.truetype(fpath, 12)
            break

    d = ImageDraw.Draw(canvas)
    draw_cn(d, 552, 142, "【工坊与良田扩建】固定点位自动摆放 · 集市摊位实时可视化货架堆叠", cn_font, (255, 242, 184, 255))
    draw_cn(d, 1328, 145, "×收起", cn_sub, (255, 224, 200, 255))

    cards_data = [
        ("桂花石臼坊 Lv.2", "锤打桂花糕 & 苹果草莓派", "165G", False),
        ("森之炼金釜 Lv.1", "荧光菇+晨露→星露甘露饮", "210G", True),
        ("晨风良田 Lv.2", "固定点位扩建+2块菜地", "140G", False),
        ("云端集市摊位 Lv.2", "可视化货架容量+12", "190G", False),
    ]
    for i, (t, s, c, hov) in enumerate(cards_data):
        cx = 548 + i * 208
        cy = 166
        blit(canvas, card_h if hov else card, cx, cy, None, (196, 58))
        draw_cn(d, cx + 12, cy + 7, t, cn_font, (255, 245, 210, 255))
        draw_cn(d, cx + 12, cy + 24, s, cn_sub, (220, 250, 204, 255))
        draw_cn(d, cx + 146, cy + 38, c, cn_sub, (255, 224, 86, 255))

    canvas.save(out_open_path)
    print("Saved open-drawer verification scene to:", out_open_path)


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE_DIR, "preview_engine_1920x360.png")
    verify_render(out)
    if len(sys.argv) > 2:
        verify_render_drawer_open(out, sys.argv[2])
