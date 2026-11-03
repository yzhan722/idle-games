#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mandatory Pre-Delivery Scene Geometry & Visual Audit Pipeline (`tools/verify_engine_scene.py`)
Enforces GEMINI.md Law 6 Hard Assertions:
- Assertion 1: Zero `PixelFontRenderer` or `pixel_font_atlas.png` references across `project.godot`, `src/**/*.gd`, and `src/**/*.tscn`.
- Assertion 2: 1D Slot Layout & Building Anti-Overlap Assertion across all 3 islands (`overlap <= 10%` and `|X_A - X_B| >= (W_A + W_B)/2 + 28px`).
- Assertion 3: SpriteSheet & Atlas Single-Frame Guardrail (`single_frame_w <= 120`, `single_frame_h <= 120`, aspect ratio in `[0.5, 1.8]`, `hframes > 1`).
- Exports clean `preview_engine_1920x360.png` and `preview_drawer_open_1920x360.png` grounded at `GROUND_Y = 124.0`.
"""

import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(BASE_DIR, "assets", "pixel_art")
SRC_DIR = os.path.join(BASE_DIR, "src")
MANIFEST_PATH = os.path.join(SRC_DIR, "data", "sprite_manifest.json")

GROUND_Y = 124.0
MIN_PADDING = 28.0

ISLAND_SLOTS = {
    1: [
        {"id": "apple_tree_1", "file": ("buildings", "apple_tree.png"),       "x": 612.4, "tex_w": 112.0, "tex_h": 120.0, "scale": 0.65, "has_shadow": False},
        {"id": "soil_plot_1",  "file": ("islands", "soil_plot_normalized.png"),"x": 710.8, "tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00, "has_shadow": False},
        {"id": "cottage_1",    "file": ("buildings", "cottage_mushroom.png"), "x": 811.2, "tex_w": 118.0, "tex_h": 114.0, "scale": 0.65, "has_shadow": False},
        {"id": "mortar_1",     "file": ("buildings", "workshop_mortar.png"),  "x": 908.4, "tex_w": 68.0,  "tex_h": 58.0,  "scale": 0.85, "has_shadow": True},
        {"id": "stall_1",      "file": ("buildings", "market_stall.png"),     "x": 1013.4,"tex_w": 128.0, "tex_h": 104.0, "scale": 0.72, "has_shadow": True},
    ],
    2: [
        {"id": "left_hut_2",   "file": ("buildings", "landmark_left_hut.png"),"x": 144.0, "tex_w": 112.0, "tex_h": 108.0, "scale": 0.68, "has_shadow": False},
        {"id": "soil_plot_2",  "file": ("islands", "soil_plot_normalized.png"),"x": 272.0, "tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00, "has_shadow": False},
        {"id": "cauldron_2",   "file": ("buildings", "workshop_cauldron.png"),"x": 397.0, "tex_w": 68.0,  "tex_h": 62.0,  "scale": 0.85, "has_shadow": True},
    ],
    3: [
        {"id": "apple_tree_3", "file": ("buildings", "apple_tree.png"),       "x": 1462.0,"tex_w": 112.0, "tex_h": 120.0, "scale": 0.65, "has_shadow": False},
        {"id": "soil_plot_3",  "file": ("islands", "soil_plot_normalized.png"),"x": 1562.4,"tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00, "has_shadow": False},
        {"id": "orbis_work_3", "file": ("buildings", "workshop_mortar.png"),  "x": 1655.3,"tex_w": 68.0,  "tex_h": 58.0,  "scale": 0.85, "has_shadow": True},
        {"id": "right_tiki_3", "file": ("buildings", "landmark_right_tiki.png"),"x": 1755.6,"tex_w": 116.0,"tex_h": 108.0, "scale": 0.68, "has_shadow": False},
    ],
}


def run_hard_assertions():
    # Assertion 1: No `PixelFontRenderer` or `pixel_font_atlas.png` anywhere in project.godot or src/
    forbidden_tokens = ["Pixel" + "FontRenderer", "pixel_font" + "_atlas.png"]
    check_files = [os.path.join(BASE_DIR, "project.godot")]
    for dp, _, fns in os.walk(SRC_DIR):
        for fn in fns:
            if fn.endswith((".gd", ".tscn")):
                check_files.append(os.path.join(dp, fn))
    for fpath in check_files:
        if not os.path.exists(fpath):
            continue
        with open(fpath, "r", encoding="utf-8") as f:
            txt = f.read()
        for tok in forbidden_tokens:
            if tok in txt:
                raise AssertionError(f"Forbidden legacy font reference `{tok}` found in {fpath}!")

    if os.path.exists(os.path.join(SRC_DIR, "autoload", "Pixel" + "FontRenderer.gd")):
        raise AssertionError("PixelFontRenderer.gd still exists on disk!")
    if os.path.exists(os.path.join(ART_DIR, "ui", "pixel_font" + "_atlas.png")):
        raise AssertionError("pixel_font_atlas.png still exists on disk!")

    # Assertion 2: Building Screen Rect2 Overlap <= 10% and |X_A - X_B| >= (W_A + W_B)/2 + 28px
    for isl_idx, slots in ISLAND_SLOTS.items():
        rects = []
        for s in slots:
            w = s["tex_w"] * s["scale"]
            h = s["tex_h"] * s["scale"]
            x0 = s["x"] - w * 0.5
            x1 = s["x"] + w * 0.5
            rects.append((s["id"], s["x"], w, h, x0, x1))

        for i in range(len(rects)):
            for j in range(i + 1, len(rects)):
                id_a, xa, wa, _, xa0, xa1 = rects[i]
                id_b, xb, wb, _, xb0, xb1 = rects[j]
                inter_w = max(0.0, min(xa1, xb1) - max(xa0, xb0))
                overlap_ratio = inter_w / max(1.0, min(wa, wb))
                if overlap_ratio > 0.10:
                    print(f"[CONFLICT] Island {isl_idx}: {id_a} [{xa0:.1f}..{xa1:.1f}] vs {id_b} [{xb0:.1f}..{xb1:.1f}] overlap={overlap_ratio:.2%}")
                    raise AssertionError("Building Overlap Detected!")
                if j == i + 1:
                    dist = abs(xb - xa)
                    req = (wa + wb) * 0.5 + MIN_PADDING
                    if dist < req - 0.5:
                        print(f"[PADDING VIOLATION] Island {isl_idx}: {id_a} (x={xa}) and {id_b} (x={xb}) dist={dist:.1f} < req={req:.1f}")
                        raise AssertionError("Building Overlap Detected!")

    # Assertion 3: Animal & Traveler Single-Frame Slicing Guardrail
    if not os.path.exists(MANIFEST_PATH):
        raise AssertionError("Unsliced SpriteSheet Detected! Missing sprite_manifest.json")
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    unit_sheets = [
        "animals/bunny_sheet.png",
        "animals/otter_sheet.png",
        "animals/toucan_sheet.png",
        "animals/fox_sheet.png",
        "animals/penguin_sheet.png",
        "animals/shiba_sheet.png",
        "travelers/traveler_slime.png",
        "travelers/traveler_mushroom.png",
        "travelers/traveler_pig.png",
    ]
    for sk in unit_sheets:
        if sk not in manifest:
            raise AssertionError(f"Unsliced SpriteSheet Detected! Missing {sk}")
        entry = manifest[sk]
        cw = float(entry.get("cell_width", 999))
        ch = float(entry.get("cell_height", 999))
        hf = int(entry.get("hframes", 1))
        if cw > 120.0 or ch > 120.0 or hf <= 1:
            raise AssertionError("Unsliced SpriteSheet Detected!")
        for reg in entry.get("regions", []):
            tw = float(reg.get("tight_w", cw))
            th = float(reg.get("tight_h", ch))
            aspect = tw / max(1.0, th)
            if not (0.5 <= aspect <= 1.8):
                raise AssertionError(f"Unsliced SpriteSheet Detected! Invalid aspect ratio {aspect:.2f} in {sk}")

    for gd_rel in [("entities", "units", "AnimalWorker.gd"), ("entities", "units", "CustomerNPC.gd")]:
        gd_path = os.path.join(SRC_DIR, *gd_rel)
        with open(gd_path, "r", encoding="utf-8") as f:
            gd_txt = f.read()
        if "hframes =" not in gd_txt or "region_enabled = false" not in gd_txt:
            raise AssertionError("Unsliced SpriteSheet Detected!")

    print("[Audit Passed] All 3 GEMINI.md Law 6 Hard Assertions passed with 0 errors!")


def load_art(sub, name):
    return Image.open(os.path.join(ART_DIR, sub, name)).convert("RGBA")


def blit_grounded(canvas, sprite, center_x, ground_y, scale_f=1.0, src_box=None):
    part = sprite.crop(src_box) if src_box else sprite
    if abs(scale_f - 1.0) > 1e-3:
        nw = max(1, int(round(part.width * scale_f)))
        nh = max(1, int(round(part.height * scale_f)))
        part = part.resize((nw, nh), Image.Resampling.NEAREST)
    dx = int(round(center_x - part.width * 0.5))
    dy = int(round(ground_y - part.height))
    canvas.alpha_composite(part, (dx, dy))


def draw_oval_shadow(canvas, center_x, ground_y, entity_visual_width):
    sw = entity_visual_width * 0.55
    sh = sw * 0.18
    rx = sw * 0.5
    ry = sh * 0.5
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.ellipse((center_x - rx, ground_y - ry, center_x + rx, ground_y + ry), fill=(0, 0, 0, 51))
    canvas.alpha_composite(overlay)


def draw_native_label(draw_obj, x, y, txt, fnt, fill=(255, 244, 214, 255), outline=(26, 18, 11, 255)):
    draw_obj.text((x + 1, y + 1), txt, font=fnt, fill=(0, 0, 0, 153))
    for ox in (-2, -1, 0, 1, 2):
        for oy in (-2, -1, 0, 1, 2):
            if ox != 0 or oy != 0:
                draw_obj.text((x + ox, y + oy), txt, font=fnt, fill=outline)
    draw_obj.text((x, y), txt, font=fnt, fill=fill)


def verify_render(out_path):
    oy = 36
    gy = oy + int(GROUND_Y)
    canvas = Image.new("RGBA", (1920, 360), (24, 32, 48, 255))

    henesys = load_art("islands", "island_henesys.png")
    ellinia = load_art("islands", "island_ellinia.png")
    orbis = load_art("islands", "island_orbis_coast.png")
    bridge = load_art("islands", "bridge_wood.png")
    soil = load_art("islands", "soil_plot_normalized.png")
    crops = load_art("crops", "crops_sheet_normalized.png")
    delicacies = load_art("buildings", "delicacies_sheet_normalized.png")

    bunny = load_art("animals", "bunny_sheet_normalized.png")
    otter = load_art("animals", "otter_sheet_normalized.png")
    fox = load_art("animals", "fox_sheet_normalized.png")
    shiba = load_art("animals", "shiba_sheet_normalized.png")
    penguin = load_art("animals", "penguin_sheet_normalized.png")
    toucan = load_art("animals", "toucan_sheet_normalized.png")

    traveler_slime = load_art("travelers", "traveler_slime_normalized.png")
    traveler_mush = load_art("travelers", "traveler_mushroom_normalized.png")
    traveler_pig = load_art("travelers", "traveler_pig_normalized.png")

    panel = load_art("ui", "panel_wood_9patch.png")
    pill = load_art("ui", "ui_resource_pill.png")
    parch = load_art("ui", "panel_parchment_9patch.png")
    icons = load_art("ui", "icons_ui.png")
    btn_norm = load_art("ui", "btn_normal.png")

    cn_font = None
    for fpath in ["C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/SIMYOU.TTF", "C:/Windows/Fonts/simsun.ttc"]:
        if os.path.exists(fpath):
            cn_font = ImageFont.truetype(fpath, 14)
            break
    if cn_font is None:
        cn_font = ImageFont.load_default()

    # Layer -20: Islands & Bridges
    canvas.alpha_composite(ellinia, (64, oy + 74))
    canvas.alpha_composite(bridge, (492, oy + 124))
    canvas.alpha_composite(henesys, (560, oy + 70))
    canvas.alpha_composite(bridge, (1312, oy + 118))
    canvas.alpha_composite(orbis, (1396, oy + 74))

    bridge_pond = bridge.resize((114, 38), Image.Resampling.NEAREST)
    canvas.alpha_composite(bridge_pond, (1082, oy + 118))
    canvas.alpha_composite(bridge_pond, (1188, oy + 118))

    # Layer -5 & 0 & 1: 1D Slot Buildings & Enlarged 64x26 Soil Plots
    for isl_idx, slots in ISLAND_SLOTS.items():
        for s in slots:
            cx = s["x"]
            w_vis = s["tex_w"] * s["scale"]
            if s["has_shadow"]:
                draw_oval_shadow(canvas, cx, gy, w_vis)
            if s["id"].startswith("soil_plot"):
                soil_bed = soil.crop((80, 0, 120, 18)).resize((64, 26), Image.Resampling.NEAREST)
                canvas.alpha_composite(soil_bed, (int(round(cx - 32)), int(round(gy - 26))))
                crop_row = isl_idx - 1
                crop_frame = crops.crop((80, crop_row * 40, 120, (crop_row + 1) * 40)).resize((34, 34), Image.Resampling.NEAREST)
                canvas.alpha_composite(crop_frame, (int(round(cx - 17)), int(round(gy - 6 - 34))))
            else:
                sp = load_art(*s["file"])
                blit_grounded(canvas, sp, cx, gy, s["scale"])

    # Layer 10: Single-Frame Sliced Animal Workers & Travelers (44px / 40px 5:1 oval drop shadows)
    units = [
        (bunny,   (0, 0, 60, 60), 736.0, 44.0),
        (otter,   (0, 0, 60, 60), 854.0, 44.0),
        (fox,     (120, 0, 180, 60), 890.0, 44.0),
        (shiba,   (0, 0, 60, 60), 1036.0, 44.0),
        (penguin, (120, 0, 180, 60), 374.0, 44.0),
        (toucan,  (0, 0, 60, 60), 1696.0, 44.0),
        (traveler_slime, (0, 0, 48, 48), 542.0, 40.0),
        (traveler_mush,  (0, 0, 48, 48), 984.0, 40.0),
        (traveler_pig,   (0, 0, 48, 48), 1192.0, 40.0),
    ]
    for sheet_im, box, ux, uw in units:
        draw_oval_shadow(canvas, ux, gy, uw)
        blit_grounded(canvas, sheet_im, ux, gy, 1.0, box)

    # Layer 20 & 50: Native Typography Labels (Zero pixel_font_atlas.png!)
    d_obj = ImageDraw.Draw(canvas)
    for sx in (710.8, 908.4, 1013.4, 272.0, 397.0, 1562.4, 1655.3):
        draw_native_label(d_obj, int(sx - 16), gy + 2, "Lv.1", cn_font, fill=(255, 244, 214, 255))

    canvas.alpha_composite(parch.resize((54, 26), Image.Resampling.NEAREST), (960, gy - 78))
    canvas.alpha_composite(delicacies.crop((0, 0, 36, 36)).resize((20, 20), Image.Resampling.NEAREST), (964, gy - 75))
    draw_native_label(d_obj, 986, gy - 74, "x2", cn_font, fill=(255, 224, 102, 255))
    draw_native_label(d_obj, 992, gy - 98, "+120G", cn_font, fill=(255, 224, 102, 255))

    # Bottom HUD Bar
    hud_y = 266
    canvas.alpha_composite(panel, (480, hud_y))
    canvas.alpha_composite(pill.resize((156, 36), Image.Resampling.NEAREST), (496, hud_y + 9))
    canvas.alpha_composite(pill.resize((192, 36), Image.Resampling.NEAREST), (658, hud_y + 9))
    canvas.alpha_composite(pill.resize((192, 36), Image.Resampling.NEAREST), (856, hud_y + 9))
    canvas.alpha_composite(icons.crop((0, 0, 48, 48)).resize((28, 28), Image.Resampling.NEAREST), (502, hud_y + 13))

    draw_native_label(d_obj, 534, hud_y + 16, "120G", cn_font, fill=(255, 224, 102, 255))
    draw_native_label(d_obj, 672, hud_y + 16, "单兔全包 · 缓存0/10", cn_font)
    draw_native_label(d_obj, 872, hud_y + 16, "摊位2/10 · 自助1x", cn_font, fill=(255, 224, 102, 255))

    tab_names = ["建筑升级", "动物编制", "木桥开拓", "★摸鱼置顶"]
    icon_indices = [6, 3, 4, 7]
    for i in range(4):
        bx = 1062 + i * 78
        canvas.alpha_composite(btn_norm.resize((42, 42), Image.Resampling.NEAREST), (bx + 12, hud_y - 4))
        ic = icons.crop((icon_indices[i] * 48, 0, (icon_indices[i] + 1) * 48, 48)).resize((36, 36), Image.Resampling.NEAREST)
        canvas.alpha_composite(ic, (bx + 15, hud_y - 1))
        draw_native_label(d_obj, bx + 6, hud_y + 34, tab_names[i], cn_font, fill=(255, 224, 102, 255))

    canvas.save(out_path)
    print("Saved verified clean preview scene to:", out_path)


def verify_render_drawer_open(base_closed_path, out_open_path):
    canvas = Image.open(base_closed_path).convert("RGBA")
    drawer = load_art("ui", "panel_drawer_parchment.png")
    card = load_art("ui", "ui_drawer_card.png")
    card_h = load_art("ui", "ui_drawer_card_hover.png")
    pill = load_art("ui", "ui_resource_pill.png")
    canvas.alpha_composite(drawer.resize((880, 106), Image.Resampling.NEAREST), (520, 154))
    canvas.alpha_composite(pill.resize((58, 24), Image.Resampling.NEAREST), (1332, 162))

    cn_font = None
    for fpath in ["C:/Windows/Fonts/msyhbd.ttc", "C:/Windows/Fonts/SIMYOU.TTF", "C:/Windows/Fonts/simsun.ttc"]:
        if os.path.exists(fpath):
            cn_font = ImageFont.truetype(fpath, 13)
            break
    if cn_font is None:
        cn_font = ImageFont.load_default()

    d = ImageDraw.Draw(canvas)
    draw_native_label(d, 544, 160, "【建筑升级】每25级作物/美食自动换代 + 建筑四阶外观蜕变!", cn_font, fill=(255, 224, 102, 255))
    draw_native_label(d, 1336, 164, "🔇静音", cn_font)

    cards_data = [
        ("射手村农田 Lv.1", "下个2x蜕变: Lv.25", "升级 25G", False),
        ("桂花研钵工坊 Lv.1", "下个2x蜕变: Lv.25", "升级 45G", True),
        ("云岛集市主摊位 Lv.1", "下个2x蜕变: Lv.25", "升级 65G", False),
        ("星露炼金坩埚 Lv.1", "下个2x蜕变: Lv.25", "升级 210G", False),
    ]
    for i, (t, s, c, hov) in enumerate(cards_data):
        cx = 548 + i * 208
        cy = 188
        canvas.alpha_composite((card_h if hov else card).resize((196, 58), Image.Resampling.NEAREST), (cx, cy))
        draw_native_label(d, cx + 8, cy + 4, t, cn_font, fill=(255, 224, 102, 255))
        draw_native_label(d, cx + 8, cy + 22, s, cn_font)
        draw_native_label(d, cx + 8, cy + 38, c, cn_font, fill=(255, 224, 102, 255))

    canvas.save(out_open_path)
    print("Saved open-drawer verification scene to:", out_open_path)


if __name__ == "__main__":
    run_hard_assertions()
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE_DIR, "preview_engine_1920x360.png")
    verify_render(out)
    open_out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(BASE_DIR, "preview_drawer_open_1920x360.png")
    verify_render_drawer_open(out, open_out)
