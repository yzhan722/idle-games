#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unified Theater Subdivision CLI for World History Evolution Atlas.
==================================================================
Usage:
  python tools/regionsplit/apply.py <atlasRoot> china [europe] [mideast] [--dry-run]
  python tools/regionsplit/apply.py <atlasRoot> --inspect britain gaul italy

Features:
  - Declarative JSON per theater under `tools/regionsplit/theaters/<theater>.json`
  - Idempotent: running 2+ times on the same `<atlasRoot>` produces 0 byte changes
  - Zero third-party dependencies (Python 3 standard library only)
"""

from __future__ import annotations
import argparse
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from geometry import parse_svg_path, ring_area, svg_to_ll, visual_center
from migrator import REGION_ENTRY_RE, apply_theater


def load_theater_config(name_or_path: str) -> dict:
    cand = pathlib.Path(name_or_path)
    if not cand.exists():
        cand = HERE / "theaters" / (name_or_path if name_or_path.endswith(".json") else f"{name_or_path}.json")
    if not cand.exists():
        raise FileNotFoundError(f"Theater config not found: '{name_or_path}' (looked at {cand})")
    return json.loads(cand.read_text(encoding="utf-8"))


def run_inspect(atlas_root: pathlib.Path, region_ids: list[str]) -> int:
    rg_path = atlas_root / "src/data/regions_geo.js"
    rg_text = rg_path.read_text(encoding="utf-8")
    reg_sec = rg_text.split("window.HistoryAtlas.REGIONS", 1)[1]
    entries = {m.group(1): m.groups() for m in REGION_ENTRY_RE.finditer(reg_sec)}

    for rid in region_ids:
        if rid not in entries:
            print(f"[WARN] Region '{rid}' not found in {rg_path} (available: {len(entries)} regions)")
            continue
        _, name, cont, cx, cy, aw, path_s = entries[rid]
        rings = parse_svg_path(path_s)
        print(f"\n=== Region: {rid} | {name} ({cont}) | cx={cx}, cy={cy} | rings={len(rings)} ===")
        for idx, r in enumerate(rings):
            xs = [p[0] for p in r]
            ys = [p[1] for p in r]
            lon_w, lat_s = svg_to_ll(min(xs), max(ys))
            lon_e, lat_n = svg_to_ll(max(xs), min(ys))
            vc = visual_center(r)
            vc_ll = svg_to_ll(*vc)
            print(
                f"  [{rid}[{idx}]] verts={len(r):3d} area={ring_area(r):7.1f} "
                f"svg_bbox=({min(xs):.1f}..{max(xs):.1f}, {min(ys):.1f}..{max(ys):.1f}) "
                f"ll_bbox=({lon_w:.2f}..{lon_e:.2f}E, {lat_s:.2f}..{lat_n:.2f}N) "
                f"center_svg={vc} center_ll={vc_ll}"
            )
            # Print compass extremes on main ring to aid choosing start_ll / end_ll
            if idx == 0 or len(r) >= 8:
                n_pt = min(r, key=lambda p: p[1])
                s_pt = max(r, key=lambda p: p[1])
                w_pt = min(r, key=lambda p: p[0])
                e_pt = max(r, key=lambda p: p[0])
                print(
                    f"      extremes ll: N={svg_to_ll(*n_pt)} S={svg_to_ll(*s_pt)} "
                    f"W={svg_to_ll(*w_pt)} E={svg_to_ll(*e_pt)}"
                )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Apply declarative historical-geographic region subdivisions to an Atlas checkout."
    )
    ap.add_argument("atlas_root", help="Path to target World History Atlas root directory")
    ap.add_argument("theaters", nargs="*", help="Theater name(s) under tools/regionsplit/theaters/ (e.g. china europe mideast)")
    ap.add_argument("--dry-run", action="store_true", help="Validate geometry and simulate migration without writing files")
    ap.add_argument("--inspect", nargs="+", metavar="REGION_ID", help="Inspect parent region rings and [lon, lat] bounds")
    args = ap.parse_args()

    atlas_root = pathlib.Path(args.atlas_root).resolve()
    if not (atlas_root / "src/data/regions_geo.js").exists():
        print(f"[ERROR] Invalid atlasRoot '{atlas_root}': src/data/regions_geo.js not found.", file=sys.stderr)
        return 1

    if args.inspect:
        return run_inspect(atlas_root, args.inspect)

    if not args.theaters:
        ap.error("Provide at least one theater name (e.g. `china`) or use `--inspect <regionId...>`.")

    for th in args.theaters:
        cfg = load_theater_config(th)
        res = apply_theater(atlas_root, cfg, dry_run=args.dry_run)
        mode_tag = "[DRY-RUN]" if args.dry_run else "[APPLIED]"
        print(f"{mode_tag} Theater '{res['theater']}' (prior state: {res['state_before']})")
        print(f"  Child units verified : {res['child_count']} -> Global REGIONS count: {res['total_regions_after']}")
        print(
            f"  Keyframes scanned    : {res['kf_stats']['scanned']} "
            f"(owners updated: {res['kf_stats']['owners_updated']}, "
            f"manual overrides applied: {res['kf_stats']['overrides_applied']}, "
            f"landmarks rebound: {res['kf_stats']['landmarks_rebound']})"
        )
        print(f"  Stateless periods    : {res['stateless_periods']} across theater child regions")
        print(f"  Trade hubs rebound   : {sum(res['hub_stats'].values())}")
        for k, c in sorted(res["hub_stats"].items()):
            print(f"    - {k}: {c}")
        print(f"  City-states rebound  : {sum(res['city_state_counts'].values())}")
        for k, c in sorted(res["city_state_counts"].items()):
            print(f"    - {k}: {c}")
        print(f"  Chronicles rebound   : {sum(res['chronicle_counts'].values())}")
        for k, c in sorted(res["chronicle_counts"].items()):
            print(f"    - {k:28s}: {c:3d}")
        ann_map = res.get("china_annals_stats", {})
        if ann_map:
            tot_chg = sum(st["changed"] for st in ann_map.values())
            tot_eval = sum(st["evaluated"] for st in ann_map.values())
            print(f"  China annals rebound : {tot_chg} changed ({tot_eval} theater items across {len(ann_map)} file(s))")
            for fname, st in ann_map.items():
                m_cnt = st["by_method"]
                print(
                    f"    - {fname}: scanned={st['total_items']}, evaluated={st['evaluated']}, "
                    f"changed={st['changed']}, retained={st['retained_same_id']} "
                    f"(keyword={m_cnt.get('keyword', 0)}, single_child={m_cnt.get('single_child', 0)}, "
                    f"default={m_cnt.get('default', 0)}, override={m_cnt.get('override', 0)})"
                )
        print(f"  Files modified       : {res['files_changed'] or 'None (idempotent no-op)'}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
