#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Idempotent Surgical Data Migrator for World History Atlas Region Subdivision.
=============================================================================
Applies a declarative theater configuration (`theaters/<name>.json`) to an
atlas checkout (`<atlasRoot>`) without full-file reserialization, preserving
comments, formatting, and concurrent edits from other windows (confidence tags,
city-states, reign eras, polity splits).

Targets updated in-place:
  1. `src/data/regions_geo.js`          (REGIONS polygons + TRADE_ROUTES hub regionIds)
  2. `src/data/timeline_keyframes.js`   (owners inheritance/guards/overrides + landmark regionIds)
  3. `src/data/stateless_cultures.js`   (child region stateless periods)
  4. `src/data/chronicle_annals_db.js`  (keyword + spatial point-in-polygon regionId/region_name)
  5. `src/data/city_states.js`          (spatial point-in-polygon + coastal distance regionId)
  6. `src/data/china_annals_v*.js`      (preGongheNodes + years[].events surgical regionId rebinding)
"""

from __future__ import annotations
import json
import math
import pathlib
import re
from collections import Counter
from typing import Any

from geometry import (
    Point,
    dist_to_rings,
    execute_geometry_ops,
    find_self_intersections,
    ll_to_svg,
    parse_svg_path,
    point_in_rings,
    visual_center,
)


# ---------------------------------------------------------------------------
# 1. JS String-Aware Balanced Delimiter Scanner
# ---------------------------------------------------------------------------

def find_matching_delim(src: str, open_idx: int, open_ch: str, close_ch: str) -> int:
    depth = 0
    i, n = open_idx, len(src)
    while i < n:
        ch = src[i]
        if ch in ('"', "'"):
            q = ch
            i += 1
            while i < n:
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == q:
                    break
                i += 1
        elif ch == "/" and i + 1 < n and src[i + 1] == "/":
            i += 2
            while i < n and src[i] != "\n":
                i += 1
            continue
        elif ch == "/" and i + 1 < n and src[i + 1] == "*":
            end_c = src.find("*/", i + 2)
            i = n if end_c == -1 else end_c + 2
            continue
        elif ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def locate_point_in_children(
    pt: Point,
    candidate_ids: list[str],
    built: dict[str, dict[str, Any]],
) -> str:
    """Exact point-in-polygon check first; minimum distance to polygon boundary fallback (for coastal ports)."""
    for cid in candidate_ids:
        if point_in_rings(pt, built[cid]["rings"]):
            return cid
    return min(candidate_ids, key=lambda cid: dist_to_rings(pt, built[cid]["rings"]))


# ---------------------------------------------------------------------------
# 2. Theater State Detection & `regions_geo.js` Migration
# ---------------------------------------------------------------------------

REGION_ENTRY_RE = re.compile(
    r'  \{\s*\n\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*continent:\s*"([^"]+)",\s*'
    r'cx:\s*([-0-9.]+),\s*cy:\s*([-0-9.]+),(?:\s*area_weight:\s*([-0-9.]+),)?\s*\n\s*path:\s*"([^"]+)"\s*\n\s*\}'
)


def format_region_entry(info: dict[str, Any]) -> str:
    weight_str = f", area_weight: {info['area_weight']}" if info.get("area_weight") is not None else ""
    return (
        "  {\n"
        f'    id: "{info["id"]}", name: "{info["name"]}", continent: "{info["continent"]}", '
        f'cx: {info["cx"]}, cy: {info["cy"]}{weight_str},\n'
        f'    path: "{info["path"]}"\n'
        "  }"
    )


def detect_theater_state(rg_text: str, cfg: dict[str, Any]) -> tuple[str, dict[str, dict[str, Any]]]:
    """
    Detect whether `cfg` is 'UNSPLIT' or 'ALREADY_SPLIT' in `regions_geo.js`.
    Returns `(state, parsed_entries_by_id)`.
    """
    reg_split = rg_text.split("window.HistoryAtlas.REGIONS", 1)
    if len(reg_split) < 2:
        raise RuntimeError("regions_geo.js missing window.HistoryAtlas.REGIONS")
    entries: dict[str, dict[str, Any]] = {}
    for m in REGION_ENTRY_RE.finditer(reg_split[1]):
        rid, name, cont, cx, cy, aw, path_s = m.groups()
        entries[rid] = {
            "id": rid,
            "name": name,
            "continent": cont,
            "cx": float(cx),
            "cy": float(cy),
            "area_weight": float(aw) if aw else None,
            "rings": parse_svg_path(path_s),
            "path": path_s,
        }

    parent_ids = set(cfg["parent_to_children"].keys())
    child_ids = {c["id"] for c in cfg["children"]}
    exclusive_new = child_ids - parent_ids
    retired_parents = parent_ids - child_ids
    existing = set(entries.keys())

    if parent_ids.issubset(existing) and not (exclusive_new & existing):
        return "UNSPLIT", entries
    if child_ids.issubset(existing) and not (retired_parents & existing):
        return "ALREADY_SPLIT", entries
    raise RuntimeError(
        f"Theater '{cfg['theater']}' is in an inconsistent partial state in regions_geo.js! "
        f"Missing parents={sorted(parent_ids - existing)}, "
        f"present exclusive children={sorted(exclusive_new & existing)}"
    )


def migrate_regions_geo(
    rg_text: str,
    cfg: dict[str, Any],
    state: str,
    parsed_entries: dict[str, dict[str, Any]],
) -> tuple[str, dict[str, dict[str, Any]], Counter]:
    """Build or validate child geometries, update REGIONS and rebind TRADE_ROUTES hubs."""
    parent_ids = set(cfg["parent_to_children"].keys())
    children_by_id = {c["id"]: c for c in cfg["children"]}
    child_ids = list(children_by_id.keys())

    if state == "UNSPLIT":
        parent_rings = {pid: parsed_entries[pid]["rings"] for pid in parent_ids}
        built = execute_geometry_ops(
            parent_rings=parent_rings,
            children_meta=cfg["children"],
            geometry_ops=cfg["geometry_ops"],
            capital_checks=cfg.get("capital_checks"),
        )
    else:
        # Re-hydrate `built` from existing split polygons & verify topological health
        built = {}
        for cid, cmeta in children_by_id.items():
            ent = parsed_entries[cid]
            for r_idx, r in enumerate(ent["rings"]):
                bad = find_self_intersections(r)
                if bad:
                    raise RuntimeError(f"Existing child '{cid}' ring[{r_idx}] has self-intersections: {bad[:5]}")
            auto_cx, auto_cy = visual_center(ent["rings"][0])
            cx = int(cmeta["cx"]) if cmeta.get("cx") is not None else int(round(ent["cx"] or auto_cx))
            cy = int(cmeta["cy"]) if cmeta.get("cy") is not None else int(round(ent["cy"] or auto_cy))
            built[cid] = {
                "id": cid,
                "name": cmeta["name"],
                "continent": cmeta["continent"],
                "cx": cx,
                "cy": cy,
                "area_weight": cmeta.get("area_weight", 1.0),
                "parent": cmeta["parent"],
                "rings": ent["rings"],
                "path": ent["path"],
            }
        for chk in cfg.get("capital_checks", []):
            pt = ll_to_svg(*chk["ll"]) if "ll" in chk else tuple(chk["xy"])
            exp = chk["expect"]
            if not point_in_rings(pt, built[exp]["rings"]):
                actual = [k for k, v in built.items() if point_in_rings(pt, v["rings"])]
                coastal_tol = float(chk.get("coastal_tol_svg", 4.0))
                d_exp = dist_to_rings(pt, built[exp]["rings"])
                nearest_cid = min(built.keys(), key=lambda k: dist_to_rings(pt, built[k]["rings"]))
                if not (not actual and nearest_cid == exp and d_exp <= coastal_tol):
                    raise RuntimeError(f"Capital check failed on ALREADY_SPLIT workspace for '{chk['name']}' -> '{exp}'")

    # 1. Update REGIONS section
    hdr = "window.HistoryAtlas.REGIONS"
    hdr_idx = rg_text.index(hdr)
    before_reg = rg_text[:hdr_idx]
    reg_part = rg_text[hdr_idx:]

    if state == "UNSPLIT":
        expansion_order = cfg.get("expansion_order", cfg["parent_to_children"])

        def repl_parent(m: re.Match) -> str:
            rid = m.group(1)
            if rid not in expansion_order:
                return m.group(0)
            return ",\n".join(format_region_entry(built[cid]) for cid in expansion_order[rid])

        reg_part = REGION_ENTRY_RE.sub(repl_parent, reg_part)
    else:
        def repl_child_meta(m: re.Match) -> str:
            rid = m.group(1)
            if rid not in built:
                return m.group(0)
            formatted = format_region_entry(built[rid])
            return formatted if formatted != m.group(0) else m.group(0)

        reg_part = REGION_ENTRY_RE.sub(repl_child_meta, reg_part)

    out = before_reg + reg_part

    # 2. Rebind TRADE_ROUTES hubs in-place
    hub_stats: Counter[str] = Counter()
    hub_overrides: dict[str, str] = cfg.get("trade_hub_overrides", {})
    retired_parents = parent_ids - set(child_ids)
    all_scope_ids = parent_ids | set(child_ids)

    r_start = out.find("window.HistoryAtlas.TRADE_ROUTES")
    t_start = out.find("window.HistoryAtlas.THEATERS")
    if r_start != -1 and t_start != -1 and r_start < t_start:
        routes_sub = out[r_start:t_start]
        hub_re = re.compile(r"\{[^{}\n]*\bregionId:\s*\"([^\"]+)\"[^{}\n]*\}")

        def repl_hub(hm: re.Match) -> str:
            htxt = hm.group(0)
            old_rid = hm.group(1)
            if old_rid not in all_scope_ids:
                return htxt
            nm = re.search(r'name:\s*"([^"]+)"', htxt)
            xm = re.search(r'\bx:\s*([-0-9.]+)', htxt)
            ym = re.search(r'\by:\s*([-0-9.]+)', htxt)
            hname = nm.group(1) if nm else ""
            if hname in hub_overrides:
                new_rid = hub_overrides[hname]
            elif old_rid in cfg["parent_to_children"] and (state == "UNSPLIT" or old_rid in retired_parents):
                cands = list(cfg["parent_to_children"][old_rid])
                for extra in cfg.get("cross_parent_candidates", {}).get(old_rid, []):
                    if extra not in cands:
                        cands.append(extra)
                pt = (float(xm.group(1)), float(ym.group(1))) if (xm and ym) else (built[cands[0]]["cx"], built[cands[0]]["cy"])
                new_rid = locate_point_in_children(pt, cands, built)
            else:
                new_rid = old_rid

            if new_rid != old_rid:
                hub_stats[f"{hname} ({old_rid} -> {new_rid})"] += 1
                htxt = re.sub(r'regionId:\s*"[^"]+"', f'regionId: "{new_rid}"', htxt, count=1)
            return htxt

        routes_sub = hub_re.sub(repl_hub, routes_sub)
        out = out[:r_start] + routes_sub + out[t_start:]

    return out, built, hub_stats


# ---------------------------------------------------------------------------
# 3. `timeline_keyframes.js` Migration (Guards + Overrides + Landmarks)
# ---------------------------------------------------------------------------

def apply_polity_guards(
    year: int,
    parent_id: str,
    owner: str | None,
    cfg: dict[str, Any],
) -> dict[str, str | None]:
    children = cfg["parent_to_children"][parent_id]
    if owner is None:
        return {c: None for c in children}

    for rule in cfg.get("polity_guards", []):
        if rule["parent"] != parent_id:
            continue
        if "owners" in rule and owner not in rule["owners"]:
            continue
        if "year_min" in rule and year < rule["year_min"]:
            continue
        if "year_max" in rule and year > rule["year_max"]:
            continue
        out_map: dict[str, str | None] = {}
        spec_map = rule["map"]
        for c in children:
            val = spec_map.get(c, "$owner")
            out_map[c] = owner if val == "$owner" else val
        return out_map

    return {c: owner for c in children}


def _parse_owners_pairs(inner: str) -> list[tuple[str, str | None]]:
    pairs: list[tuple[str, str | None]] = []
    for m in re.finditer(r'([a-zA-Z0-9_]+)\s*:\s*(null|"[^"]+")', inner):
        k, raw_v = m.groups()
        pairs.append((k, None if raw_v == "null" else raw_v[1:-1]))
    return pairs


def _serialize_owners_pairs(mapping: dict[str, str | None]) -> str:
    parts = [f"{k}: null" if v is None else f'{k}: "{v}"' for k, v in mapping.items()]
    return " " + ", ".join(parts) + " "


def migrate_keyframes(
    kf_text: str,
    cfg: dict[str, Any],
    state: str,
    built: dict[str, dict[str, Any]],
) -> tuple[str, dict[str, Any]]:
    parent_to_children: dict[str, list[str]] = cfg["parent_to_children"]
    retired_parents = set(parent_to_children.keys()) - {c["id"] for c in cfg["children"]}
    raw_overrides = cfg.get("keyframe_overrides", {})
    overrides_by_year: dict[int, dict[str, str | None]] = {int(y): dict(ov) for y, ov in raw_overrides.items()}

    existing_years = {int(y) for y in re.findall(r"\byear:\s*(-?\d+)\b", kf_text)}
    unknown_years = sorted(set(overrides_by_year.keys()) - existing_years)
    if unknown_years:
        raise ValueError(
            f"Theater '{cfg['theater']}' has keyframe_overrides for non-existent keyframe year(s): {unknown_years}! "
            "Only existing keyframe years in timeline_keyframes.js may be overridden."
        )

    stats = {"scanned": 0, "owners_updated": 0, "overrides_applied": 0, "landmarks_rebound": 0}
    block_re = re.compile(r"(\{\s*\n\s*year:\s*(-?\d+)\b.*?\n  \},?)", re.DOTALL)

    def repl_block(bm: re.Match) -> str:
        block, yr_s = bm.group(1), bm.group(2)
        year = int(yr_s)
        stats["scanned"] += 1

        def repl_owners(om: re.Match) -> str:
            inner = om.group(1)
            orig_pairs = _parse_owners_pairs(inner)
            orig_dict = dict(orig_pairs)

            has_retired = any(k in retired_parents for k, _ in orig_pairs)
            should_expand = (state == "UNSPLIT") or has_retired

            new_map: dict[str, str | None] = {}
            changed = False

            if should_expand:
                for k, v in orig_pairs:
                    if k in parent_to_children:
                        changed = True
                        new_map.update(apply_polity_guards(year, k, v, cfg))
                    else:
                        new_map[k] = v
            else:
                new_map.update(orig_dict)

            if year in overrides_by_year:
                ov = overrides_by_year[year]
                ov_diff = any(k not in new_map or new_map[k] != v for k, v in ov.items())
                if ov_diff or changed:
                    stats["overrides_applied"] += 1
                    for ok, ov_val in ov.items():
                        new_map[ok] = ov_val
                    changed = True

            if not changed:
                return om.group(0)
            stats["owners_updated"] += 1
            return "owners: {" + _serialize_owners_pairs(new_map) + "}"

        block = re.sub(r"owners:\s*\{([^{}]*)\}", repl_owners, block, count=1)

        # Optional landmark regionId rebinding (if any landmark carries `regionId`)
        if "landmarks:" in block and "regionId" in block:
            lm_re = re.compile(r"\{[^{}\n]*\bregionId:\s*\"([^\"]+)\"[^{}\n]*\}")

            def repl_lm(lm: re.Match) -> str:
                ltxt = lm.group(0)
                old_rid = lm.group(1)
                if old_rid not in parent_to_children:
                    return ltxt
                if state == "ALREADY_SPLIT" and old_rid not in retired_parents:
                    return ltxt
                xm = re.search(r"\bx:\s*([-0-9.]+)", ltxt)
                ym = re.search(r"\by:\s*([-0-9.]+)", ltxt)
                cands = list(parent_to_children[old_rid])
                for extra in cfg.get("cross_parent_candidates", {}).get(old_rid, []):
                    if extra not in cands:
                        cands.append(extra)
                if xm and ym:
                    new_rid = locate_point_in_children((float(xm.group(1)), float(ym.group(1))), cands, built)
                else:
                    new_rid = cands[0]
                if new_rid != old_rid:
                    stats["landmarks_rebound"] += 1
                    ltxt = re.sub(r'regionId:\s*"[^"]+"', f'regionId: "{new_rid}"', ltxt, count=1)
                return ltxt

            block = lm_re.sub(repl_lm, block)

        return block

    return block_re.sub(repl_block, kf_text), stats


# ---------------------------------------------------------------------------
# 4. `stateless_cultures.js` Migration
# ---------------------------------------------------------------------------

def _format_stateless_block(rid: str, items: list[dict[str, Any]]) -> str:
    lines = [f"  {rid}: ["]
    for it in items:
        lines.append(
            f'    {{ from: {it["from"]}, to: {it["to"]}, kind: "{it["kind"]}", '
            f'name: "{it["name"]}", note: "{it["note"]}" }},'
        )
    lines.append("  ],")
    return "\n".join(lines)


def migrate_stateless(sc_text: str, cfg: dict[str, Any]) -> tuple[str, int]:
    """Idempotently replace parent or existing child stateless blocks with canonical theater child blocks."""
    parent_ids = list(cfg["parent_to_children"].keys())
    child_ids = [c["id"] for c in cfg["children"]]
    sc_map: dict[str, list[dict[str, Any]]] = cfg.get("stateless_cultures", {})

    # Remove all parent_ids and child_ids of this theater, leaving a single slot at the first match
    keys_to_replace = list(dict.fromkeys(parent_ids + child_ids))
    slot_token = f"  __REGIONSPLIT_SLOT_{cfg['theater'].upper()}__\n"
    slot_placed = False
    out = sc_text

    for k in keys_to_replace:
        pat = re.compile(rf"^  {re.escape(k)}:\s*\[.*?\n  \],?\n?", re.M | re.S)
        if pat.search(out):
            if not slot_placed:
                out = pat.sub(slot_token, out, count=1)
                slot_placed = True
            else:
                out = pat.sub("", out, count=1)

    formatted_blocks = [
        _format_stateless_block(cid, sc_map[cid])
        for cid in child_ids
        if cid in sc_map and len(sc_map[cid]) > 0
    ]
    replacement = "\n".join(formatted_blocks) + ("\n" if formatted_blocks else "")
    if slot_placed:
        out = out.replace(slot_token, replacement, 1)
    elif replacement:
        # Insert right before closing `};`
        close_idx = out.rfind("};")
        if close_idx == -1:
            raise RuntimeError("stateless_cultures.js missing closing '};'")
        out = out[:close_idx] + replacement + out[close_idx:]

    # Optional idempotent patches for adjacent non-split regions (e.g., steppe/borderland gaps)
    for adj_rid, extra_items in cfg.get("adjacent_stateless_patches", {}).items():
        adj_pat = re.compile(rf"(  {re.escape(adj_rid)}:\s*\[)(.*?)(\n  \],?)", re.S)
        m = adj_pat.search(out)
        if m:
            body = m.group(2)
            added = []
            for it in extra_items:
                if f"from: {it['from']}" not in body:
                    added.append(
                        f'\n    {{ from: {it["from"]}, to: {it["to"]}, kind: "{it["kind"]}", '
                        f'name: "{it["name"]}", note: "{it["note"]}" }},'
                    )
            if added:
                clean_body = body.rstrip()
                if clean_body and not clean_body.endswith(","):
                    clean_body += ","
                out = out[: m.start()] + m.group(1) + clean_body + "".join(added) + m.group(3) + out[m.end() :]

    total_periods = sum(len(sc_map.get(cid, [])) for cid in child_ids)
    return out, total_periods


# ---------------------------------------------------------------------------
# 5. `chronicle_annals_db.js` Surgical Rebinding
# ---------------------------------------------------------------------------

def _choose_chronicle_child(
    old_rid: str,
    ev_id: str,
    year: int,
    x: float,
    y: float,
    text_blob: str,
    cfg: dict[str, Any],
    built: dict[str, dict[str, Any]],
    parent_centroids: dict[str, Point],
) -> tuple[str, bool]:
    """Return `(new_region_id, was_generic_centroid)`."""
    id_overrides = cfg.get("chronicle_id_overrides", {})
    if ev_id and ev_id in id_overrides:
        # Forced child: keep the event's own point only if it already lies inside that child
        tgt = id_overrides[ev_id]
        return tgt, not point_in_rings((x, y), built[tgt]["rings"])

    cands = list(cfg["parent_to_children"][old_rid])
    for extra in cfg.get("cross_parent_candidates", {}).get(old_rid, []):
        if extra not in cands:
            cands.append(extra)

    px, py = parent_centroids.get(old_rid, (-999.0, -999.0))
    is_generic_centroid = math.hypot(x - px, y - py) <= 6.5

    # 1. If event has a genuine custom (x, y) coordinate (not a copied parent centroid), honor spatial polygon first
    if not is_generic_centroid:
        for cid in cands:
            if point_in_rings((x, y), built[cid]["rings"]):
                return cid, False

    # 2. Match ordered city / toponym / polity keywords restricted to valid candidates
    #    (`text_blob` may be a tuple/list of priority tiers like `(title, detail_and_polity)` or a single `str`)
    text_tiers = (text_blob,) if isinstance(text_blob, str) else tuple(text_blob)
    for tier_txt in text_tiers:
        if not tier_txt:
            continue
        for rule in cfg.get("chronicle_keywords", []):
            target = rule["region"]
            if target in cands and any(kw in tier_txt for kw in rule["keywords"]):
                return target, is_generic_centroid

    # 3. Era-aware parent default fallback (for generic macro-events without specific city names)
    for d_rule in cfg.get("chronicle_defaults", []):
        if d_rule["parent"] != old_rid:
            continue
        if "year_min" in d_rule and year < d_rule["year_min"]:
            continue
        if "year_max" in d_rule and year > d_rule["year_max"]:
            continue
        return d_rule["region"], is_generic_centroid

    # 4. Spatial point-in-polygon / nearest boundary fallback
    return locate_point_in_children((x, y), cands, built), is_generic_centroid


def migrate_chronicles(
    chr_text: str,
    cfg: dict[str, Any],
    state: str,
    built: dict[str, dict[str, Any]],
    parsed_entries: dict[str, dict[str, Any]],
) -> tuple[str, Counter]:
    parent_to_children = cfg["parent_to_children"]
    parent_ids = set(parent_to_children.keys())
    child_ids = {c["id"] for c in cfg["children"]}
    retired_parents = parent_ids - child_ids
    id_overrides = cfg.get("chronicle_id_overrides", {})

    parent_centroids: dict[str, Point] = {}
    for pid, xy in cfg.get("legacy_parent_centroids", {}).items():
        parent_centroids[pid] = (float(xy[0]), float(xy[1]))
    for pid in parent_ids:
        if pid in parsed_entries and pid not in parent_centroids:
            parent_centroids[pid] = (parsed_entries[pid]["cx"], parsed_entries[pid]["cy"])

    m_arr = re.search(r"CHRONICLE_ANNALS\s*=\s*\[", chr_text)
    if not m_arr:
        raise RuntimeError("chronicle_annals_db.js missing CHRONICLE_ANNALS array")
    arr_open = m_arr.end() - 1
    arr_close = find_matching_delim(chr_text, arr_open, "[", "]")
    if arr_close == -1:
        raise RuntimeError("Unclosed CHRONICLE_ANNALS array in chronicle_annals_db.js")

    counts: Counter[str] = Counter()
    pieces: list[str] = [chr_text[: arr_open + 1]]
    pos = arr_open + 1

    while pos < arr_close:
        ob_open = chr_text.find("{", pos)
        if ob_open == -1 or ob_open >= arr_close:
            pieces.append(chr_text[pos:arr_close])
            break
        pieces.append(chr_text[pos:ob_open])
        ob_close = find_matching_delim(chr_text, ob_open, "{", "}")
        if ob_close == -1 or ob_close > arr_close:
            raise RuntimeError(f"Unclosed event object in chronicle_annals_db.js at offset {ob_open}")

        ev_txt = chr_text[ob_open : ob_close + 1]
        rm = re.search(r'"regionId":\s*"([^"]+)"', ev_txt)
        idm = re.search(r'"id":\s*"([^"]+)"', ev_txt)
        ev_id = idm.group(1) if idm else ""

        if rm:
            old_rid = rm.group(1)
            needs_remap = (
                (state == "UNSPLIT" and old_rid in parent_ids)
                or (state == "ALREADY_SPLIT" and old_rid in retired_parents)
                or (ev_id in id_overrides and id_overrides[ev_id] != old_rid)
            )
            if needs_remap:
                yrm = re.search(r'"year":\s*(-?\d+)', ev_txt)
                xm = re.search(r'"x":\s*([-0-9.]+)', ev_txt)
                ym = re.search(r'"y":\s*([-0-9.]+)', ev_txt)
                tm = re.search(r'"title":\s*"((?:\\.|[^"\\])*)"', ev_txt)
                dm = re.search(r'"detail":\s*"((?:\\.|[^"\\])*)"', ev_txt)
                pm = re.search(r'"polity":\s*"((?:\\.|[^"\\])*)"', ev_txt)

                year = int(yrm.group(1)) if yrm else 0
                x = float(xm.group(1)) if xm else 0.0
                y = float(ym.group(1)) if ym else 0.0
                title_txt = tm.group(1) if tm else ""
                rest_txt = " ".join(g.group(1) for g in (dm, pm) if g)

                if old_rid in parent_to_children or old_rid not in built:
                    src_parent = old_rid  # a split parent, or an untouched region named by chronicle_id_overrides
                else:
                    src_parent = built[old_rid]["parent"]
                new_rid, is_generic = _choose_chronicle_child(
                    src_parent, ev_id, year, x, y, (title_txt, rest_txt), cfg, built, parent_centroids
                )
                new_name = built[new_rid]["name"]
                counts[f"{old_rid} -> {new_rid}"] += 1

                ev_txt = re.sub(r'"regionId":\s*"[^"]+"', f'"regionId": "{new_rid}"', ev_txt, count=1)
                ev_txt = re.sub(r'"region_name":\s*"[^"]+"', f'"region_name": "{new_name}"', ev_txt, count=1)
                if is_generic and xm and ym:
                    nx, ny = built[new_rid]["cx"], built[new_rid]["cy"]
                    ev_txt = re.sub(r'"x":\s*[-0-9.]+', f'"x": {nx}', ev_txt, count=1)
                    ev_txt = re.sub(r'"y":\s*[-0-9.]+', f'"y": {ny}', ev_txt, count=1)

        pieces.append(ev_txt)
        pos = ob_close + 1

    pieces.append(chr_text[arr_close:])
    return "".join(pieces), counts


# ---------------------------------------------------------------------------
# 6. `city_states.js` Surgical Rebinding
# ---------------------------------------------------------------------------

def migrate_city_states(
    cs_text: str,
    cfg: dict[str, Any],
    state: str,
    built: dict[str, dict[str, Any]],
) -> tuple[str, Counter]:
    parent_to_children = cfg["parent_to_children"]
    parent_ids = set(parent_to_children.keys())
    child_ids = {c["id"] for c in cfg["children"]}
    retired_parents = parent_ids - child_ids
    cs_overrides: dict[str, str] = cfg.get("city_state_overrides", {})

    counts: Counter[str] = Counter()
    obj_re = re.compile(r"\{[^{}]+\}")

    def repl_cs(m: re.Match) -> str:
        otxt = m.group(0)
        idm = re.search(r'\bid:\s*"([^"]+)"', otxt) or re.search(r'"id":\s*"([^"]+)"', otxt)
        rgm = re.search(r'\bregionId:\s*"([^"]+)"', otxt) or re.search(r'"regionId":\s*"([^"]+)"', otxt)
        if not rgm:
            return otxt
        cs_id = idm.group(1) if idm else ""
        old_rid = rgm.group(1)

        needs_remap = (
            (state == "UNSPLIT" and old_rid in parent_ids)
            or (state == "ALREADY_SPLIT" and old_rid in retired_parents)
            or (cs_id in cs_overrides and cs_overrides[cs_id] != old_rid)
        )
        if not needs_remap:
            return otxt

        if cs_id in cs_overrides:
            new_rid = cs_overrides[cs_id]
        else:
            cands = list(parent_to_children[old_rid])
            for extra in cfg.get("cross_parent_candidates", {}).get(old_rid, []):
                if extra not in cands:
                    cands.append(extra)
            xm = re.search(r'\bx:\s*([-0-9.]+)', otxt) or re.search(r'"x":\s*([-0-9.]+)', otxt)
            ym = re.search(r'\by:\s*([-0-9.]+)', otxt) or re.search(r'"y":\s*([-0-9.]+)', otxt)
            pt = (float(xm.group(1)), float(ym.group(1))) if (xm and ym) else (built[cands[0]]["cx"], built[cands[0]]["cy"])
            new_rid = locate_point_in_children(pt, cands, built)

        if new_rid != old_rid:
            counts[f"{cs_id}: {old_rid} -> {new_rid}"] += 1
            otxt = re.sub(r'(\bregionId:\s*|"regionId":\s*)"[^"]+"', rf'\1"{new_rid}"', otxt, count=1)
        return otxt

    hdr = "window.HistoryAtlas.CITY_STATES"
    if hdr not in cs_text:
        return cs_text, counts
    idx = cs_text.index(hdr)
    return cs_text[:idx] + obj_re.sub(repl_cs, cs_text[idx:]), counts


# ---------------------------------------------------------------------------
# 7. `china_annals_v*.js` Surgical Rebinding (`preGongheNodes` + `years[].events`)
# ---------------------------------------------------------------------------

def _decode_js_str(raw_inner: str) -> str:
    try:
        return json.loads(f'"{raw_inner}"')
    except Exception:
        return raw_inner


def _extract_annals_places(item_txt: str) -> list[str]:
    refs_m = re.search(r'"refs"\s*:\s*\{', item_txt)
    if not refs_m:
        return []
    refs_open = refs_m.end() - 1
    refs_close = find_matching_delim(item_txt, refs_open, "{", "}")
    if refs_close == -1:
        return []
    refs_sub = item_txt[refs_open : refs_close + 1]
    pl_m = re.search(r'"places"\s*:\s*\[', refs_sub)
    if not pl_m:
        return []
    pl_open = pl_m.end() - 1
    pl_close = find_matching_delim(refs_sub, pl_open, "[", "]")
    if pl_close == -1:
        return []
    arr_str = refs_sub[pl_open : pl_close + 1]
    try:
        parsed = json.loads(arr_str)
        if isinstance(parsed, list):
            return [str(x) for x in parsed]
    except Exception:
        pass
    return [_decode_js_str(m.group(1)) for m in re.finditer(r'"((?:\\.|[^"\\])*)"', arr_str)]


def _match_keywords_in_cands(text: str, cands: list[str], kw_rules: list[dict[str, Any]]) -> str | None:
    if not text:
        return None
    for rule in kw_rules:
        target = rule["region"]
        if target in cands and any(kw in text for kw in rule["keywords"]):
            return target
    return None


def _choose_annals_child(
    src_parent: str,
    year: int,
    places: list[str],
    title: str,
    detail: str,
    cfg: dict[str, Any],
) -> tuple[str, str]:
    """
    Choose target child regionId for an item in `china_annals_v*.js`.
    Returns `(new_region_id, method)` where `method` is one of:
    `'override'`, `'single_child'`, `'keyword'`, or `'default'`.
    """
    ann_overrides: dict[str, str] = cfg.get("annals_overrides", {})
    if ann_overrides:
        exact_key = f"{year}:{title}"
        if exact_key in ann_overrides:
            return ann_overrides[exact_key], "override"
        if title in ann_overrides:
            return ann_overrides[title], "override"

    cands = list(cfg["parent_to_children"][src_parent])
    for extra in cfg.get("cross_parent_candidates", {}).get(src_parent, []):
        if extra not in cands:
            cands.append(extra)

    if len(cands) == 1:
        return cands[0], "single_child"

    kw_rules = cfg.get("chronicle_keywords", [])

    # Tier 1: Explicit `refs.places` in order; check modern `（今...）` disambiguation first if present
    for place_str in places:
        mod_m = re.search(r"[（(]今([^）)]+)[）)]", place_str)
        if mod_m:
            hit = _match_keywords_in_cands(mod_m.group(1), cands, kw_rules)
            if hit:
                return hit, "keyword"
        hit = _match_keywords_in_cands(place_str, cands, kw_rules)
        if hit:
            return hit, "keyword"

    # Tier 2: Event `title`
    hit = _match_keywords_in_cands(title, cands, kw_rules)
    if hit:
        return hit, "keyword"

    # Tier 3: Event `detail`
    hit = _match_keywords_in_cands(detail, cands, kw_rules)
    if hit:
        return hit, "keyword"

    # Tier 4: Era-aware `chronicle_defaults` fallback
    for d_rule in cfg.get("chronicle_defaults", []):
        if d_rule["parent"] != src_parent:
            continue
        if "year_min" in d_rule and year < d_rule["year_min"]:
            continue
        if "year_max" in d_rule and year > d_rule["year_max"]:
            continue
        return d_rule["region"], "default"

    return cands[0], "default"


def migrate_china_annals(
    ann_text: str,
    cfg: dict[str, Any],
    state: str,
    built: dict[str, dict[str, Any]],
) -> tuple[str, dict[str, Any]]:
    """
    Surgically rebind `"regionId"` inside `preGongheNodes[]` and `years[].events[]`
    of a `china_annals_v*.js` file without reserializing or reformatting any other text.
    """
    parent_to_children = cfg["parent_to_children"]
    parent_ids = set(parent_to_children.keys())
    child_ids = {c["id"] for c in cfg["children"]}
    retired_parents = parent_ids - child_ids
    ann_overrides: dict[str, str] = cfg.get("annals_overrides", {})

    stats: dict[str, Any] = {
        "total_items": 0,
        "evaluated": 0,
        "changed": 0,
        "retained_same_id": 0,
        "by_method": Counter(),
        "by_child": Counter(),
        "transitions": Counter(),
    }

    def patch_item_obj(item_txt: str, fallback_year: int | None = None) -> str:
        rm = re.search(r'"regionId"\s*:\s*"([^"]+)"', item_txt)
        if not rm:
            return item_txt
        stats["total_items"] += 1
        old_rid = rm.group(1)

        tm = re.search(r'"title"\s*:\s*"((?:\\.|[^"\\])*)"', item_txt)
        title = _decode_js_str(tm.group(1)) if tm else ""
        if fallback_year is not None:
            year = fallback_year
        else:
            yrm = re.search(r'"year"\s*:\s*(-?\d+)', item_txt)
            year = int(yrm.group(1)) if yrm else 0

        ov_target = ann_overrides.get(f"{year}:{title}") or ann_overrides.get(title)
        needs_remap = (
            (state == "UNSPLIT" and old_rid in parent_ids)
            or (state == "ALREADY_SPLIT" and old_rid in retired_parents)
            or (ov_target is not None and ov_target != old_rid)
        )
        if not needs_remap:
            return item_txt

        dm = re.search(r'"detail"\s*:\s*"((?:\\.|[^"\\])*)"', item_txt)
        detail = _decode_js_str(dm.group(1)) if dm else ""
        places = _extract_annals_places(item_txt)

        src_parent = old_rid if old_rid in parent_to_children else built[old_rid]["parent"]
        new_rid, method = _choose_annals_child(src_parent, year, places, title, detail, cfg)

        stats["evaluated"] += 1
        stats["by_method"][method] += 1
        stats["by_child"][new_rid] += 1

        if new_rid != old_rid:
            stats["changed"] += 1
            stats["transitions"][f"{old_rid} -> {new_rid}"] += 1
            item_txt = re.sub(r'("regionId"\s*:\s*)"[^"]+"', rf'\1"{new_rid}"', item_txt, count=1)
        else:
            stats["retained_same_id"] += 1
        return item_txt

    def patch_object_array(src: str, arr_open: int, arr_close: int, item_fn) -> str:
        pieces: list[str] = [src[: arr_open + 1]]
        pos = arr_open + 1
        while pos < arr_close:
            ob_open = src.find("{", pos)
            if ob_open == -1 or ob_open >= arr_close:
                pieces.append(src[pos:arr_close])
                break
            pieces.append(src[pos:ob_open])
            ob_close = find_matching_delim(src, ob_open, "{", "}")
            if ob_close == -1 or ob_close > arr_close:
                raise RuntimeError(f"Unclosed object in china_annals file at offset {ob_open}")
            pieces.append(item_fn(src[ob_open : ob_close + 1]))
            pos = ob_close + 1
        pieces.append(src[arr_close:])
        return "".join(pieces)

    out = ann_text

    # 1. Migrate top-level `"preGongheNodes": [ ... ]` (if present)
    m_pre = re.search(r'"preGongheNodes"\s*:\s*\[', out)
    if m_pre:
        pre_open = m_pre.end() - 1
        pre_close = find_matching_delim(out, pre_open, "[", "]")
        if pre_close == -1:
            raise RuntimeError("Unclosed preGongheNodes array in china_annals file")
        out = patch_object_array(out, pre_open, pre_close, lambda s: patch_item_obj(s, None))

    # 2. Migrate top-level `"years": [ { "year": ..., "events": [ ... ] }, ... ]`
    #    Note: `"refs"` inside events also has `"years": [-845, -828]`; anchor to 2-space top-level key!
    m_yrs = re.search(r'(?:^|\n)\s{1,4}"years"\s*:\s*\[', out)
    if m_yrs:
        yrs_open = m_yrs.end() - 1
        yrs_close = find_matching_delim(out, yrs_open, "[", "]")
        if yrs_close == -1:
            raise RuntimeError("Unclosed years array in china_annals file")

        def patch_year_record(yr_txt: str) -> str:
            ev_m = re.search(r'"events"\s*:\s*\[', yr_txt)
            if not ev_m:
                return yr_txt
            # Match `"year"` before `"events"` so we never confuse `refs.years`
            yr_m = re.search(r'"year"\s*:\s*(-?\d+)', yr_txt[: ev_m.start()]) or re.search(
                r'"year"\s*:\s*(-?\d+)', yr_txt
            )
            yr_val = int(yr_m.group(1)) if yr_m else 0
            ev_open = ev_m.end() - 1
            ev_close = find_matching_delim(yr_txt, ev_open, "[", "]")
            if ev_close == -1:
                raise RuntimeError(f"Unclosed events array for year {yr_val} in china_annals file")
            return patch_object_array(yr_txt, ev_open, ev_close, lambda s: patch_item_obj(s, yr_val))

        out = patch_object_array(out, yrs_open, yrs_close, patch_year_record)

    return out, stats


# ---------------------------------------------------------------------------
# 8. High-Level Single-Theater Runner
# ---------------------------------------------------------------------------

def apply_theater(atlas_root: pathlib.Path, cfg: dict[str, Any], dry_run: bool = False) -> dict[str, Any]:
    rg_path = atlas_root / "src/data/regions_geo.js"
    kf_path = atlas_root / "src/data/timeline_keyframes.js"
    sc_path = atlas_root / "src/data/stateless_cultures.js"
    ch_path = atlas_root / "src/data/chronicle_annals_db.js"
    cs_path = atlas_root / "src/data/city_states.js"
    annals_paths = sorted((atlas_root / "src/data").glob("china_annals_v*.js"))

    rg_orig = rg_path.read_text(encoding="utf-8")
    kf_orig = kf_path.read_text(encoding="utf-8")
    sc_orig = sc_path.read_text(encoding="utf-8")
    ch_orig = ch_path.read_text(encoding="utf-8")
    cs_orig = cs_path.read_text(encoding="utf-8") if cs_path.exists() else ""

    state, parsed_entries = detect_theater_state(rg_orig, cfg)

    rg_new, built, hub_stats = migrate_regions_geo(rg_orig, cfg, state, parsed_entries)
    kf_new, kf_stats = migrate_keyframes(kf_orig, cfg, state, built)
    sc_new, sc_count = migrate_stateless(sc_orig, cfg)
    ch_new, ch_counts = migrate_chronicles(ch_orig, cfg, state, built, parsed_entries)
    cs_new, cs_counts = migrate_city_states(cs_orig, cfg, state, built) if cs_orig else ("", Counter())

    pending_writes: list[tuple[str, str, str, pathlib.Path]] = [
        ("src/data/regions_geo.js", rg_orig, rg_new, rg_path),
        ("src/data/timeline_keyframes.js", kf_orig, kf_new, kf_path),
        ("src/data/stateless_cultures.js", sc_orig, sc_new, sc_path),
        ("src/data/chronicle_annals_db.js", ch_orig, ch_new, ch_path),
        ("src/data/city_states.js", cs_orig, cs_new, cs_path),
    ]

    china_annals_stats: dict[str, dict[str, Any]] = {}
    for ann_path in annals_paths:
        ann_orig = ann_path.read_text(encoding="utf-8")
        ann_new, ann_st = migrate_china_annals(ann_orig, cfg, state, built)
        china_annals_stats[ann_path.name] = ann_st
        pending_writes.append((f"src/data/{ann_path.name}", ann_orig, ann_new, ann_path))

    files_changed = []
    for rel, old_s, new_s, path in pending_writes:
        if new_s and new_s != old_s:
            files_changed.append(rel)
            if not dry_run:
                orig_eol = "\r\n" if (path.exists() and b"\r\n" in path.read_bytes()) else "\n"
                path.write_text(new_s, encoding="utf-8", newline=orig_eol)

    total_regions = len(REGION_ENTRY_RE.findall(rg_new.split("window.HistoryAtlas.REGIONS", 1)[1]))
    return {
        "theater": cfg["theater"],
        "state_before": state,
        "total_regions_after": total_regions,
        "child_count": len(built),
        "hub_stats": hub_stats,
        "kf_stats": kf_stats,
        "stateless_periods": sc_count,
        "chronicle_counts": ch_counts,
        "city_state_counts": cs_counts,
        "china_annals_stats": china_annals_stats,
        "files_changed": files_changed,
    }
