#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 0: Automated Asset Background Removal & Smart Atlas Slicing Pipeline (`tools/process_assets.py`)
1. Flood-fill background removal on `assets/pixel_art/raw_sheets/*.jpg` (sampling 4 corners, tolerance=25,
   with soft edge alpha feathering) -> exports transparent PNGs to `assets/pixel_art/ui/raw_*_transparent.png`.
2. Connected-component & alpha projection analysis on `animals/*_sheet.png`, `travelers/traveler_*.png`,
   `crops/crops_sheet.png`, and `buildings/delicacies_sheet.png`.
3. Generates normalized grid sheets `*_normalized.png` (even-pixel cell dimensions, bottom-center aligned)
   and outputs `src/data/sprite_manifest.json` (`res://src/data/sprite_manifest.json`).
"""

import json
import math
import os
from collections import deque
import numpy as np
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(BASE_DIR, "assets", "pixel_art")
DATA_DIR = os.path.join(BASE_DIR, "src", "data")


def flood_fill_remove_bg(img: Image.Image, tolerance: float = 25.0) -> Image.Image:
    """
    Samples the 4 corners of an image to determine the background baseline RGB (R0, G0, B0),
    runs border flood-fill with `tolerance`, sets background Alpha=0, and feathers edge pixels.
    """
    rgba = np.array(img.convert("RGBA"), dtype=np.float32)
    h, w, _ = rgba.shape
    corners = np.array([
        rgba[0, 0, :3],
        rgba[0, w - 1, :3],
        rgba[h - 1, 0, :3],
        rgba[h - 1, w - 1, :3]
    ])
    bg_color = np.mean(corners, axis=0)

    diff = np.linalg.norm(rgba[:, :, :3] - bg_color, axis=2)
    within_tol = diff <= (tolerance * math.sqrt(3.0))

    visited = np.zeros((h, w), dtype=bool)
    bg_mask = np.zeros((h, w), dtype=bool)
    queue = deque()

    for x in range(w):
        if within_tol[0, x]:
            queue.append((0, x))
            visited[0, x] = True
        if within_tol[h - 1, x] and not visited[h - 1, x]:
            queue.append((h - 1, x))
            visited[h - 1, x] = True
    for y in range(h):
        if within_tol[y, 0] and not visited[y, 0]:
            queue.append((y, 0))
            visited[y, 0] = True
        if within_tol[y, w - 1] and not visited[y, w - 1]:
            queue.append((y, w - 1))
            visited[y, w - 1] = True

    while queue:
        cy, cx = queue.popleft()
        bg_mask[cy, cx] = True
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and within_tol[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    out = rgba.copy()
    out[bg_mask, 3] = 0.0

    # Soft edge de-haloing on 1px boundary next to flood-filled background
    padded = np.pad(bg_mask, 1, mode="constant", constant_values=True)
    neighbor_bg = (
        padded[:-2, 1:-1] | padded[2:, 1:-1] |
        padded[1:-1, :-2] | padded[1:-1, 2:]
    )
    edge_mask = (~bg_mask) & neighbor_bg & (diff <= tolerance * 2.4)
    edge_alpha = np.clip((diff[edge_mask] - tolerance * 0.6) / (tolerance * 1.8), 0.15, 0.92) * 255.0
    out[edge_mask, 3] = np.minimum(out[edge_mask, 3], edge_alpha)

    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def find_1d_segments(proj: np.ndarray, min_len: int = 4) -> list:
    segments = []
    in_seg = False
    start = 0
    for i, val in enumerate(proj):
        if val > 0 and not in_seg:
            in_seg = True
            start = i
        elif val == 0 and in_seg:
            in_seg = False
            if i - start >= min_len:
                segments.append((start, i))
    if in_seg and len(proj) - start >= min_len:
        segments.append((start, len(proj)))
    return segments


def analyze_and_normalize_sheet(rel_path: str, expected_cols: int = 0, expected_rows: int = 0) -> dict:
    full_path = os.path.join(ART_DIR, *rel_path.split("/"))
    img = Image.open(full_path).convert("RGBA")
    arr = np.array(img)
    h, w, _ = arr.shape

    # If corners are opaque, run flood-fill background removal first
    if arr[0, 0, 3] > 240 and arr[0, w - 1, 3] > 240 and arr[h - 1, 0, 3] > 240:
        img = flood_fill_remove_bg(img, tolerance=25.0)
        arr = np.array(img)

    alpha = arr[:, :, 3]
    row_proj = np.sum(alpha > 16, axis=1)
    col_proj = np.sum(alpha > 16, axis=0)

    row_segs = find_1d_segments(row_proj, min_len=6)
    col_segs = find_1d_segments(col_proj, min_len=6)

    regions = []
    if expected_cols > 0 and expected_rows > 0:
        cw = w // expected_cols
        ch = h // expected_rows
        for r in range(expected_rows):
            for c in range(expected_cols):
                sub_a = alpha[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]
                ys, xs = np.where(sub_a > 16)
                if len(xs) > 0:
                    bx0, bx1 = int(xs.min()), int(xs.max()) + 1
                    by0, by1 = int(ys.min()), int(ys.max()) + 1
                    regions.append({
                        "grid_col": c,
                        "grid_row": r,
                        "cell_x": c * cw,
                        "cell_y": r * ch,
                        "cell_w": cw,
                        "cell_h": ch,
                        "x": c * cw + bx0,
                        "y": r * ch + by0,
                        "w": bx1 - bx0,
                        "h": by1 - by0
                    })
                else:
                    regions.append({
                        "grid_col": c,
                        "grid_row": r,
                        "cell_x": c * cw,
                        "cell_y": r * ch,
                        "cell_w": cw,
                        "cell_h": ch,
                        "x": c * cw,
                        "y": r * ch,
                        "w": cw,
                        "h": ch
                    })
        hframes = expected_cols
        vframes = expected_rows
        cell_w = cw
        cell_h = ch
    else:
        if not row_segs:
            row_segs = [(0, h)]
        if not col_segs:
            col_segs = [(0, w)]
        hframes = len(col_segs)
        vframes = len(row_segs)
        max_w = max(x1 - x0 for x0, x1 in col_segs)
        max_h = max(y1 - y0 for y0, y1 in row_segs)
        cell_w = max_w + (max_w % 2)
        cell_h = max_h + (max_h % 2)
        for r_idx, (y0, y1) in enumerate(row_segs):
            for c_idx, (x0, x1) in enumerate(col_segs):
                regions.append({
                    "grid_col": c_idx,
                    "grid_row": r_idx,
                    "x": int(x0),
                    "y": int(y0),
                    "w": int(x1 - x0),
                    "h": int(y1 - y0)
                })

    # Build normalized grid sheet (*_normalized.png) with bottom-center alignment
    norm_w = cell_w * hframes
    norm_h = cell_h * vframes
    norm_img = Image.new("RGBA", (norm_w, norm_h), (0, 0, 0, 0))
    norm_regions = []
    for reg in regions:
        c = reg["grid_col"]
        r = reg["grid_row"]
        crop_box = (reg["x"], reg["y"], reg["x"] + reg["w"], reg["y"] + reg["h"])
        part = img.crop(crop_box)
        dst_x = c * cell_w + (cell_w - reg["w"]) // 2
        dst_y = (r + 1) * cell_h - reg["h"]
        norm_img.alpha_composite(part, (dst_x, dst_y))
        norm_regions.append({
            "x": c * cell_w,
            "y": r * cell_h,
            "w": cell_w,
            "h": cell_h,
            "tight_x": reg["x"],
            "tight_y": reg["y"],
            "tight_w": reg["w"],
            "tight_h": reg["h"]
        })

    base_no_ext = os.path.splitext(full_path)[0]
    norm_full_path = base_no_ext + "_normalized.png"
    norm_img.save(norm_full_path)

    return {
        "cell_width": int(cell_w),
        "cell_height": int(cell_h),
        "hframes": int(hframes),
        "vframes": int(vframes),
        "total_frames": int(len(norm_regions)),
        "normalized_sheet": "res://assets/pixel_art/" + os.path.splitext(rel_path)[0] + "_normalized.png",
        "regions": norm_regions
    }


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    raw_dir = os.path.join(ART_DIR, "raw_sheets")
    ui_dir = os.path.join(ART_DIR, "ui")
    os.makedirs(ui_dir, exist_ok=True)

    # 1. Process raw_sheets/*.jpg with flood-fill background removal
    processed_raw = []
    if os.path.exists(raw_dir):
        for fname in sorted(os.listdir(raw_dir)):
            if fname.lower().endswith(".jpg"):
                in_path = os.path.join(raw_dir, fname)
                stem = os.path.splitext(fname)[0]
                out_path = os.path.join(ui_dir, f"raw_{stem}_transparent.png")
                clean_im = flood_fill_remove_bg(Image.open(in_path), tolerance=25.0)
                clean_im.save(out_path)
                processed_raw.append(out_path)

    manifest = {}

    # 2. Analyze animal sheets (5 poses x 1 row = 300x60 -> 60x60 cells)
    animal_files = [
        "animals/bunny_sheet.png",
        "animals/otter_sheet.png",
        "animals/toucan_sheet.png",
        "animals/fox_sheet.png",
        "animals/penguin_sheet.png",
        "animals/shiba_sheet.png",
    ]
    for af in animal_files:
        if os.path.exists(os.path.join(ART_DIR, *af.split("/"))):
            manifest[af] = analyze_and_normalize_sheet(af, expected_cols=5, expected_rows=1)

    # 3. Analyze traveler sheets (2 frames x 1 row = 96x48 -> 48x48 cells)
    traveler_files = [
        "travelers/traveler_slime.png",
        "travelers/traveler_mushroom.png",
        "travelers/traveler_pig.png",
    ]
    for tf in traveler_files:
        if os.path.exists(os.path.join(ART_DIR, *tf.split("/"))):
            manifest[tf] = analyze_and_normalize_sheet(tf, expected_cols=2, expected_rows=1)

    # 4. Analyze crops/crops_sheet.png (4 stages x 4 crop rows = 160x160 -> 40x40 cells)
    crops_rel = "crops/crops_sheet.png"
    if os.path.exists(os.path.join(ART_DIR, "crops", "crops_sheet.png")):
        c_info = analyze_and_normalize_sheet(crops_rel, expected_cols=4, expected_rows=4)
        crop_names = [" strawberry_osmanthus", "sweet_berry", "glow_mushroom", "sun_pineapple"]
        items = []
        for row_idx in range(4):
            stages = []
            for col_idx in range(4):
                stages.append({
                    "x": col_idx * 40,
                    "y": row_idx * 40,
                    "w": 40,
                    "h": 40
                })
            items.append({
                "id": f"crop_{row_idx}",
                "name": crop_names[row_idx].strip(),
                "stages": stages
            })
        c_info["items"] = items
        manifest[crops_rel] = c_info

    # 5. Analyze buildings/delicacies_sheet.png (4 recipes x 1 row = 144x36 -> 36x36 cells)
    delic_rel = "buildings/delicacies_sheet.png"
    if os.path.exists(os.path.join(ART_DIR, "buildings", "delicacies_sheet.png")):
        d_info = analyze_and_normalize_sheet(delic_rel, expected_cols=4, expected_rows=1)
        d_info["items"] = [
            {"id": "delicacy_0", "name": "桂花糯米糕", "tier": 1, "region": {"x": 0, "y": 0, "w": 36, "h": 36}},
            {"id": "delicacy_1", "name": "焦糖苹果草莓派", "tier": 1, "region": {"x": 36, "y": 0, "w": 36, "h": 36}},
            {"id": "delicacy_2", "name": "星露荧光甘露饮", "tier": 2, "region": {"x": 72, "y": 0, "w": 36, "h": 36}},
            {"id": "delicacy_3", "name": "海岛凤梨椰奶冻", "tier": 2, "region": {"x": 108, "y": 0, "w": 36, "h": 36}},
        ]
        manifest[delic_rel] = d_info

    # 6. Analyze islands/soil_plot.png (4 states x 1 row = 160x18 -> 40x18 cells)
    soil_rel = "islands/soil_plot.png"
    if os.path.exists(os.path.join(ART_DIR, "islands", "soil_plot.png")):
        manifest[soil_rel] = analyze_and_normalize_sheet(soil_rel, expected_cols=4, expected_rows=1)

    manifest_path = os.path.join(DATA_DIR, "sprite_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"[Phase 0 Complete] Processed {len(processed_raw)} raw JPG sheets and wrote {len(manifest)} entries to {manifest_path}")


if __name__ == "__main__":
    main()
