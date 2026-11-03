#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Slices all Phase 4 Masterpiece Polish Cloud Isle Market pixel art assets
into d:/project/maple-isle-idle/assets/pixel_art/:
- 3 Masterpiece 1.5D Diorama Floating Islands (with built-in picket fence, cobblestone path,
  wildflowers, lotus pond, mossy roots, glowing forest mushrooms, sandy beach ripples & starfish)
- 6 Masterpiece Village Buildings & Landmarks (Windmill Farmhouse, Market Stall with lantern,
  Orchard Apple Tree, Hollow-Tree Alchemy Cottage, Coconut Tiki Bar with fairy lights, Stone Mortar)
- Artisan Pixel UI Kit (Zero Raw draw_rect Boxes):
  * panel_wood_9patch.png (Carved Walnut & Brass Maple-Vine HUD Bar)
  * panel_drawer_parchment.png (Ornate Wooden & Parchment Collapsible Drawer Frame)
  * ui_resource_pill.png (Recessed Dark-Wood & Gold Resource Pill Slot)
  * ui_drawer_card.png + ui_drawer_card_hover.png (Brass-Cornered Upgrade Card Frame)
  * btn_normal.png / btn_hover.png / btn_pressed.png (Chunky Beveled Wood & Brass Studs Button)
  * panel_parchment_9patch.png (Curled Wooden Scroll Tooltip Banner)
"""

import os
from collections import deque
from PIL import Image, ImageEnhance, ImageDraw

ARTIFACT_DIR = r"C:\Users\alex\.gemini\antigravity\brain\a72c73f1-0330-4cef-bec9-04d1547f5603"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "assets", "pixel_art")

RAW_ISLANDS_POLISH = os.path.join(ARTIFACT_DIR, "polish_islands_diorama_sheet_1793640477461.jpg")
RAW_BUILDINGS_POLISH = os.path.join(ARTIFACT_DIR, "polish_buildings_masterpiece_sheet_notext_1793640584870.jpg")
RAW_UI_POLISH = os.path.join(ARTIFACT_DIR, "polish_artisan_ui_kit_sheet_1793640485660.jpg")
RAW_SOIL_POLISH = os.path.join(ARTIFACT_DIR, "garden_soil_plots_spritesheet_1793684418089.jpg")

RAW_ISLANDS_OLD = os.path.join(ARTIFACT_DIR, "islands_atlas_raw_png_1793630727252.jpg")
RAW_CHARS_PHASE2 = os.path.join(ARTIFACT_DIR, "phase2_character_poses_spritesheet_1793638125496.jpg")
RAW_WORKSHOPS_PHASE2 = os.path.join(ARTIFACT_DIR, "phase2_workshops_and_decor_spritesheet_clean_1793638158535.jpg")
RAW_CHARS_PHASE3 = os.path.join(ARTIFACT_DIR, "phase3_fox_toucan_and_travelers_sheet_png_1793639551523.jpg")
RAW_LANDMARKS_PHASE3 = os.path.join(ARTIFACT_DIR, "phase3_landmarks_and_recipes_sheet_clean_1793639469428.jpg")
RAW_UI_CLEAN = os.path.join(ARTIFACT_DIR, "maplestory_ui_spritesheet_1793636634061.jpg")
RAW_UI_OLD = os.path.join(ARTIFACT_DIR, "maple_ui_kit_raw_1793630702978.jpg")
RAW_CROPS = os.path.join(ARTIFACT_DIR, "maplestory_crops_spritesheet_1793631852962.jpg")


def ensure_dirs():
    for sub in ["islands", "animals", "travelers", "crops", "buildings", "ui", "raw_sheets"]:
        os.makedirs(os.path.join(OUT_DIR, sub), exist_ok=True)


def remove_white_bg_floodfill(img, threshold=236, clear_enclosed_white=False):
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    if clear_enclosed_white:
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if r >= threshold and g >= threshold and b >= threshold:
                    px[x, y] = (0, 0, 0, 0)
    else:
        visited = [[False] * w for _ in range(h)]
        q = deque()

        def is_bg(x, y):
            r, g, b, a = px[x, y]
            return r >= threshold and g >= threshold and b >= threshold

        for x in range(w):
            if is_bg(x, 0):
                q.append((x, 0))
                visited[0][x] = True
            if is_bg(x, h - 1):
                q.append((x, h - 1))
                visited[h - 1][x] = True
        for y in range(h):
            if is_bg(0, y) and not visited[y][0]:
                q.append((0, y))
                visited[y][0] = True
            if is_bg(w - 1, y) and not visited[y][w - 1]:
                q.append((w - 1, y))
                visited[y][w - 1] = True

        while q:
            cx, cy = q.popleft()
            px[cx, cy] = (0, 0, 0, 0)
            for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                    if is_bg(nx, ny):
                        visited[ny][nx] = True
                        q.append((nx, ny))

    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = px[x, y]
            if a > 0 and r > 218 and g > 218 and b > 218:
                if any(px[nx, ny][3] == 0 for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))):
                    px[x, y] = (0, 0, 0, 0)

    bbox = rgba.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    return rgba


def crop_normalized(img, x0_f, y0_f, x1_f, y1_f, threshold=236, clear_enclosed_white=False):
    w, h = img.size
    box = (int(w * x0_f), int(h * y0_f), int(w * x1_f), int(h * y1_f))
    sub = img.crop(box)
    return remove_white_bg_floodfill(sub, threshold, clear_enclosed_white)


def crisp_resize(img, size):
    resized = img.resize(size, Image.Resampling.LANCZOS)
    return ImageEnhance.Sharpness(resized).enhance(1.42)


def fit_into_canvas(sprite, target_w, target_h, align_bottom=True):
    tw, th = sprite.size
    scale = min(target_w / max(1, tw), target_h / max(1, th))
    nw = max(1, int(round(tw * scale)))
    nh = max(1, int(round(th * scale)))
    resized = crisp_resize(sprite, (nw, nh))
    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    ox = (target_w - nw) // 2
    oy = (target_h - nh) if align_bottom else (target_h - nh) // 2
    canvas.alpha_composite(resized, (ox, oy))
    return canvas


def build_true_4pose_sheet(poses_img, y0_f, y1_f, frame_w=60, frame_h=60):
    sheet = Image.new("RGBA", (frame_w * 4, frame_h), (0, 0, 0, 0))
    for col in range(4):
        x0_f = col * 0.25 + 0.01
        x1_f = (col + 1) * 0.25 - 0.01
        sp = crop_normalized(poses_img, x0_f, y0_f, x1_f, y1_f, 238, False)
        fitted = fit_into_canvas(sp, frame_w - 4, frame_h - 4, align_bottom=True)
        sheet.alpha_composite(fitted, (col * frame_w + 2, 2))
    return sheet


def build_true_2frame_traveler(img, x0_a, x1_a, x0_b, x1_b, y0_f, y1_f, frame_w=48, frame_h=48):
    sp_a = crop_normalized(img, x0_a, y0_f, x1_a, y1_f, 238, False)
    sp_b = crop_normalized(img, x0_b, y0_f, x1_b, y1_f, 238, False)
    sheet = Image.new("RGBA", (frame_w * 2, frame_h), (0, 0, 0, 0))
    sheet.alpha_composite(fit_into_canvas(sp_a, frame_w - 4, frame_h - 4, True), (2, 2))
    sheet.alpha_composite(fit_into_canvas(sp_b, frame_w - 4, frame_h - 4, True), (frame_w + 2, 2))
    return sheet


def draw_puffy_slash():
    img = Image.new("RGBA", (24, 32), (0, 0, 0, 0))
    px = img.load()
    for y in range(4, 28):
        t = (y - 4) / 23.0
        cx = int(round(17 - t * 10))
        for dx in range(-4, 5):
            x = cx + dx
            if 0 <= x < 24:
                if abs(dx) >= 3 or y in (4, 5, 26, 27):
                    px[x, y] = (54, 18, 8, 255)
                else:
                    r = 255
                    g = int(248 - t * 110)
                    b = int(120 - t * 95)
                    px[x, y] = (r, g, b, 255)
    return img


def tint_interior_for_legibility(img, margin_x_f=0.07, margin_y_f=0.14, target_rgb=(64, 38, 20), blend=0.72):
    out = img.copy().convert("RGBA")
    w, h = out.size
    px = out.load()
    x0, x1 = int(w * margin_x_f), int(w * (1.0 - margin_x_f))
    y0, y1 = int(h * margin_y_f), int(h * (1.0 - margin_y_f))
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            if a > 120 and (r + g + b) > 360:
                nr = int(r * (1.0 - blend) + target_rgb[0] * blend)
                ng = int(g * (1.0 - blend) + target_rgb[1] * blend)
                nb = int(b * (1.0 - blend) + target_rgb[2] * blend)
                px[x, y] = (nr, ng, nb, a)
    return out


def slice_all_assets():
    ensure_dirs()

    # 1. Slice 3 Masterpiece 1.5D Diorama Floating Islands
    isl_polish = Image.open(RAW_ISLANDS_POLISH)
    henesys_15d = crop_normalized(isl_polish, 0.02, 0.02, 0.98, 0.34, 240, False)
    ellinia_15d = crop_normalized(isl_polish, 0.06, 0.35, 0.94, 0.67, 240, False)
    orbis_15d = crop_normalized(isl_polish, 0.12, 0.68, 0.88, 0.98, 240, False)

    crisp_resize(henesys_15d, (800, 140)).save(os.path.join(OUT_DIR, "islands", "island_henesys.png"))
    crisp_resize(ellinia_15d, (460, 132)).save(os.path.join(OUT_DIR, "islands", "island_ellinia.png"))
    crisp_resize(orbis_15d, (460, 132)).save(os.path.join(OUT_DIR, "islands", "island_orbis_coast.png"))

    isl_old = Image.open(RAW_ISLANDS_OLD)
    bridge = crop_normalized(isl_old, 0.03, 0.71, 0.49, 0.96, 232, True)
    fit_into_canvas(bridge, 104, 48, False).save(os.path.join(OUT_DIR, "islands", "bridge_wood.png"))

    # 1.5D Oblique Diorama Recessed Soil Furrows (160 x 18: 4 states of 40x18)
    # Extract ONLY the inner 3D sculpted soil ridges (no boxy outer grass frame or corner posts!)
    # and apply an elliptical feathered recessed rim so the furrows sit directly inside the island's own ground!
    soil_raw = Image.open(RAW_SOIL_POLISH)
    soil_beds = Image.new("RGBA", (160, 18), (0, 0, 0, 0))
    for col in range(4):
        cx_f = col * 0.25 + 0.125
        # Crop inner sculpted soil ridges only (excluding outer grass frame & corner pegs)
        inner_box = (
            int(soil_raw.width * (cx_f - 0.065)),
            int(soil_raw.height * 0.31),
            int(soil_raw.width * (cx_f + 0.065)),
            int(soil_raw.height * 0.69),
        )
        sp_inner = soil_raw.crop(inner_box).convert("RGBA")
        # Rotate 90 degrees so the 3 sculpted furrows run horizontally along the 1.5D island lawn
        sp_horiz = sp_inner.rotate(90, expand=True)
        furrow_patch = crisp_resize(sp_horiz, (38, 16))
        # Apply soft elliptical recessed shadow + feathered alpha edge so it blends 100% into any ground surface
        px_f = furrow_patch.load()
        for fy in range(16):
            for fx in range(38):
                dx = (fx - 18.5) / 18.5
                dy = (fy - 7.5) / 7.5
                dist_sq = dx * dx + dy * dy
                if dist_sq > 1.0:
                    px_f[fx, fy] = (0, 0, 0, 0)
                elif dist_sq > 0.72:
                    r, g, b, a = px_f[fx, fy]
                    fade = (1.0 - dist_sq) / 0.28
                    # Darken outer 1.5px rim slightly to look dug into the turf
                    px_f[fx, fy] = (int(r * 0.72), int(g * 0.70), int(b * 0.68), int(235 * fade))
                else:
                    r, g, b, a = px_f[fx, fy]
                    px_f[fx, fy] = (r, g, b, 242)
        soil_beds.alpha_composite(furrow_patch, (col * 40 + 1, 1))
    soil_beds.save(os.path.join(OUT_DIR, "islands", "soil_plot.png"))

    # 2. Slice 4x4 Crops Growth Sheet -> 160x160 (4 cols x 4 rows of 40x40)
    crops_img = Image.open(RAW_CROPS)
    crops_sheet = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    for row in range(4):
        for col in range(4):
            x0 = col * 0.25 + 0.01
            x1 = (col + 1) * 0.25 - 0.01
            y0 = row * 0.25 + 0.01
            y1 = (row + 1) * 0.25 - 0.01
            c_sp = crop_normalized(crops_img, x0, y0, x1, y1)
            c_fit = fit_into_canvas(c_sp, 38, 38, True)
            crops_sheet.alpha_composite(c_fit, (col * 40 + 1, row * 40 + 1))
    crops_sheet.save(os.path.join(OUT_DIR, "crops", "crops_sheet.png"))

    # 3. Slice 6 True 4-Pose Hand-Drawn Animal Companions
    poses_p2 = Image.open(RAW_CHARS_PHASE2)
    for fname, y0_f, y1_f in [
        ("bunny_sheet.png", 0.005, 0.255),
        ("otter_sheet.png", 0.255, 0.505),
        ("shiba_sheet.png", 0.505, 0.745),
        ("penguin_sheet.png", 0.745, 0.995),
    ]:
        build_true_4pose_sheet(poses_p2, y0_f, y1_f, 60, 60).save(os.path.join(OUT_DIR, "animals", fname))

    poses_p3 = Image.open(RAW_CHARS_PHASE3)
    build_true_4pose_sheet(poses_p3, 0.005, 0.255, 60, 60).save(os.path.join(OUT_DIR, "animals", "fox_sheet.png"))
    build_true_4pose_sheet(poses_p3, 0.255, 0.505, 60, 60).save(os.path.join(OUT_DIR, "animals", "toucan_sheet.png"))

    # 4. Slice 3 Original Non-IP Woodland Travelers + Red Heart Bubble
    build_true_2frame_traveler(poses_p3, 0.01, 0.245, 0.255, 0.495, 0.505, 0.745, 48, 48).save(
        os.path.join(OUT_DIR, "travelers", "traveler_slime.png")
    )
    build_true_2frame_traveler(poses_p3, 0.505, 0.745, 0.755, 0.995, 0.505, 0.745, 48, 48).save(
        os.path.join(OUT_DIR, "travelers", "traveler_mushroom.png")
    )
    build_true_2frame_traveler(poses_p3, 0.01, 0.245, 0.255, 0.495, 0.750, 0.995, 48, 48).save(
        os.path.join(OUT_DIR, "travelers", "traveler_pig.png")
    )

    heart_sp = crop_normalized(poses_p3, 0.51, 0.76, 0.74, 0.99, 238, False)
    fit_into_canvas(heart_sp, 32, 32, False).save(os.path.join(OUT_DIR, "ui", "emote_heart.png"))

    # 5. Slice 6 Masterpiece Village Buildings from polish_buildings_masterpiece_sheet_notext
    bld_polish = Image.open(RAW_BUILDINGS_POLISH)
    windmill_cot = crop_normalized(bld_polish, 0.02, 0.01, 0.36, 0.48, 240, False)
    stall_clean = crop_normalized(bld_polish, 0.37, 0.02, 0.67, 0.48, 242, True)
    tree_sp = crop_normalized(bld_polish, 0.69, 0.02, 0.98, 0.48, 240, False)
    left_hut = crop_normalized(bld_polish, 0.02, 0.50, 0.34, 0.98, 240, False)
    right_tiki = crop_normalized(bld_polish, 0.36, 0.50, 0.66, 0.98, 240, False)
    mortar_sp = crop_normalized(bld_polish, 0.68, 0.54, 0.98, 0.96, 240, False)

    fit_into_canvas(windmill_cot, 118, 114, True).save(os.path.join(OUT_DIR, "buildings", "cottage_mushroom.png"))
    fit_into_canvas(stall_clean, 128, 104, True).save(os.path.join(OUT_DIR, "buildings", "market_stall.png"))
    fit_into_canvas(tree_sp, 112, 120, True).save(os.path.join(OUT_DIR, "buildings", "apple_tree.png"))
    fit_into_canvas(left_hut, 112, 108, True).save(os.path.join(OUT_DIR, "buildings", "landmark_left_hut.png"))
    fit_into_canvas(right_tiki, 116, 108, True).save(os.path.join(OUT_DIR, "buildings", "landmark_right_tiki.png"))
    fit_into_canvas(mortar_sp, 68, 58, True).save(os.path.join(OUT_DIR, "buildings", "workshop_mortar.png"))

    # 6. Slice Cauldron, 4 Two-Stage Recipe Delicacies (144x36) & Meadow Decorations
    wk_img = Image.open(RAW_WORKSHOPS_PHASE2)
    cauldron_sp = crop_normalized(wk_img, 0.30, 0.03, 0.52, 0.46, 238, False)
    fit_into_canvas(cauldron_sp, 68, 62, True).save(os.path.join(OUT_DIR, "buildings", "workshop_cauldron.png"))

    lm_img = Image.open(RAW_LANDMARKS_PHASE3)
    delicacies_sheet = Image.new("RGBA", (144, 36), (0, 0, 0, 0))
    d4_boxes = [
        (0.02, 0.58, 0.26, 0.855),
        (0.28, 0.58, 0.49, 0.855),
        (0.54, 0.58, 0.72, 0.865),
        (0.77, 0.58, 0.96, 0.865),
    ]
    for idx_d, (dx0, dy0, dx1, dy1) in enumerate(d4_boxes):
        d_sp = crop_normalized(lm_img, dx0, dy0, dx1, dy1, 238, False)
        delicacies_sheet.alpha_composite(fit_into_canvas(d_sp, 34, 34, False), (idx_d * 36 + 1, 1))
    delicacies_sheet.save(os.path.join(OUT_DIR, "buildings", "delicacies_sheet.png"))

    signpost_sp = crop_normalized(wk_img, 0.02, 0.52, 0.21, 0.96, 236, False)
    lamp_sp = crop_normalized(wk_img, 0.23, 0.48, 0.38, 0.96, 240, False)
    scarecrow_sp = crop_normalized(wk_img, 0.40, 0.54, 0.57, 0.96, 236, False)
    fit_into_canvas(signpost_sp, 44, 54, True).save(os.path.join(OUT_DIR, "buildings", "decor_signpost.png"))
    fit_into_canvas(lamp_sp, 44, 66, True).save(os.path.join(OUT_DIR, "buildings", "decor_lamp.png"))
    fit_into_canvas(scarecrow_sp, 48, 56, True).save(os.path.join(OUT_DIR, "buildings", "decor_scarecrow.png"))

    # 7. Slice Artisan Pixel UI Kit from polish_artisan_ui_kit_sheet_1793640485660.jpg
    ui_polish = Image.open(RAW_UI_POLISH)
    ui_clean = Image.open(RAW_UI_CLEAN)
    ui_old = Image.open(RAW_UI_OLD)

    hud_bar = crop_normalized(ui_polish, 0.02, 0.03, 0.98, 0.31, 240, False)
    crisp_resize(hud_bar, (960, 58)).save(os.path.join(OUT_DIR, "ui", "panel_wood_9patch.png"))

    drawer_sp = crop_normalized(ui_polish, 0.03, 0.34, 0.97, 0.66, 240, False)
    drawer_toned = tint_interior_for_legibility(crisp_resize(drawer_sp, (880, 104)), 0.04, 0.14, (58, 34, 18), 0.58)
    drawer_toned.save(os.path.join(OUT_DIR, "ui", "panel_drawer_parchment.png"))

    pill_sp = crop_normalized(ui_polish, 0.03, 0.74, 0.27, 0.91, 240, False)
    crisp_resize(pill_sp, (134, 36)).save(os.path.join(OUT_DIR, "ui", "ui_resource_pill.png"))

    card_sp = crop_normalized(ui_polish, 0.29, 0.70, 0.50, 0.95, 240, False)
    card_normal = tint_interior_for_legibility(crisp_resize(card_sp, (196, 58)), 0.06, 0.12, (64, 38, 20), 0.76)
    card_hover = ImageEnhance.Brightness(card_normal).enhance(1.18)
    card_normal.save(os.path.join(OUT_DIR, "ui", "ui_drawer_card.png"))
    card_hover.save(os.path.join(OUT_DIR, "ui", "ui_drawer_card_hover.png"))

    btn_frame = crisp_resize(crop_normalized(ui_polish, 0.52, 0.69, 0.68, 0.96, 240, False), (48, 48))
    btn_h = ImageEnhance.Brightness(btn_frame).enhance(1.20)
    btn_p = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    btn_p.alpha_composite(ImageEnhance.Brightness(btn_frame).enhance(0.88), (0, 2))
    btn_frame.save(os.path.join(OUT_DIR, "ui", "btn_normal.png"))
    btn_h.save(os.path.join(OUT_DIR, "ui", "btn_hover.png"))
    btn_p.save(os.path.join(OUT_DIR, "ui", "btn_pressed.png"))

    scroll_sp = crop_normalized(ui_polish, 0.70, 0.69, 0.97, 0.96, 240, False)
    scroll_toned = tint_interior_for_legibility(crisp_resize(scroll_sp, (220, 52)), 0.08, 0.14, (58, 34, 18), 0.76)
    scroll_toned.save(os.path.join(OUT_DIR, "ui", "panel_parchment_9patch.png"))

    # Build icons_ui.png with the new artisan beveled brass-studded wood button frame behind each of the 6 action icons
    icons_strip = Image.new("RGBA", (384, 48), (0, 0, 0, 0))
    ic_meso = crop_normalized(ui_old, 0.03, 0.35, 0.15, 0.49)
    ic_dew = crop_normalized(ui_old, 0.19, 0.35, 0.32, 0.49)
    icons_strip.alpha_composite(fit_into_canvas(ic_meso, 44, 44, False), (2, 2))
    icons_strip.alpha_composite(fit_into_canvas(ic_dew, 44, 44, False), (50, 2))

    clean_btn_x = [
        (0.04, 0.175), (0.20, 0.335), (0.355, 0.490),
        (0.510, 0.645), (0.668, 0.802), (0.822, 0.958)
    ]
    for idx_offset, (bx0, bx1) in enumerate(clean_btn_x):
        cell_canvas = btn_frame.copy()
        emblem = crop_normalized(ui_clean, bx0 + 0.022, 0.735, bx1 - 0.022, 0.905)
        cell_canvas.alpha_composite(fit_into_canvas(emblem, 30, 30, False), (9, 9))
        icons_strip.alpha_composite(cell_canvas, ((idx_offset + 2) * 48, 0))
    icons_strip.save(os.path.join(OUT_DIR, "ui", "icons_ui.png"))

    font_atlas = Image.new("RGBA", (384, 32), (0, 0, 0, 0))
    r1_boxes = [
        (0.385, 0.480), (0.485, 0.568), (0.575, 0.678),
        (0.680, 0.778), (0.780, 0.882), (0.884, 0.985)
    ]
    for i, (gx0, gx1) in enumerate(r1_boxes):
        g_sp = crop_normalized(ui_old, gx0, 0.64, gx1, 0.795)
        font_atlas.alpha_composite(fit_into_canvas(g_sp, 22, 30, False), (i * 24 + 1, 1))
    r2_boxes = [
        (0.385, 0.482), (0.485, 0.580), (0.582, 0.682),
        (0.684, 0.782), (0.784, 0.875), (0.878, 0.990)
    ]
    for idx_pos, (gx0, gx1) in zip([6, 7, 8, 9, 10, 12], r2_boxes):
        g_sp = crop_normalized(ui_old, gx0, 0.795, gx1, 0.945)
        font_atlas.alpha_composite(fit_into_canvas(g_sp, 22, 30, False), (idx_pos * 24 + 1, 1))
    plus_sp = crop_normalized(ui_old, 0.784, 0.795, 0.875, 0.945)
    x_sp = plus_sp.rotate(45, expand=True)
    font_atlas.alpha_composite(draw_puffy_slash(), (13 * 24, 0))
    font_atlas.alpha_composite(fit_into_canvas(x_sp, 20, 26, False), (14 * 24 + 2, 3))
    font_atlas.save(os.path.join(OUT_DIR, "ui", "pixel_font_atlas.png"))

    print("Successfully sliced all Phase 4 Masterpiece Polish Cloud Isle Market assets into:", OUT_DIR)


if __name__ == "__main__":
    slice_all_assets()
