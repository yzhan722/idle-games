#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Planar Topology & Projection Engine for World History Atlas Region Subdivision.
===============================================================================
Zero third-party dependencies (Python 3 standard library only).

Provides:
  - Piecewise-affine Eurasian/North-African <-> SVG coordinate projection
  - Vertex-snapped and collinear-edge-projected ring splitting (`split_ring`)
  - Directed half-edge boundary cancellation (`merge_rings`)
  - Sub-ring / island extraction & assembly (`execute_geometry_ops`)
  - Strict topological verification: area conservation, 0 self-intersections,
    clockwise positive area orientation, and point-in-polygon capital checks.
"""

from __future__ import annotations
import math
import re
from collections import Counter, defaultdict
from typing import Any

Point = tuple[float, float]
Ring = list[Point]


# ---------------------------------------------------------------------------
# 1. Coordinate Projection (Natural Earth 50m Eurasian/Mediterranean Grid)
# ---------------------------------------------------------------------------

def ll_to_svg(lon: float, lat: float) -> Point:
    """Project [lon, lat] (degrees) to atlas SVG (x, y) user coordinates."""
    return (round(510.0 + 4.345 * float(lon), 1), round(347.9 - 5.1515 * float(lat), 1))


def svg_to_ll(x: float, y: float) -> tuple[float, float]:
    """Inverse-project atlas SVG (x, y) to approximate [lon, lat] (degrees)."""
    return (round((float(x) - 510.0) / 4.345, 3), round((347.9 - float(y)) / 5.1515, 3))


# ---------------------------------------------------------------------------
# 2. SVG Path Parsing, Ring Orientation, Area & Self-Intersection Audit
# ---------------------------------------------------------------------------

def parse_svg_path(path_str: str) -> list[Ring]:
    """Parse an SVG `M x,y L x,y ... Z` multi-ring path into a list of open vertex rings."""
    rings: list[Ring] = []
    for sub in path_str.split("Z"):
        sub = sub.strip()
        if not sub:
            continue
        pts: Ring = [
            (round(float(x), 1), round(float(y), 1))
            for x, y in re.findall(r"([-0-9.]+),([-0-9.]+)", sub)
        ]
        pts = clean_ring(pts)
        if len(pts) >= 3:
            rings.append(pts)
    return rings


def format_svg_path(rings: list[Ring]) -> str:
    """Serialize a list of vertex rings back to canonical `M ... L ... Z` format."""
    parts = []
    for r in rings:
        coords = [f"{x:.1f},{y:.1f}" for x, y in r]
        parts.append("M " + " L ".join(coords) + " Z")
    return " ".join(parts)


def ring_area(pts: Ring) -> float:
    """Signed shoelace area in SVG (+y down) coordinates. Outer rings are > 0."""
    n = len(pts)
    if n < 3:
        return 0.0
    return 0.5 * sum(
        pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1]
        for i in range(n)
    )


def clean_ring(pts: Ring) -> Ring:
    """Remove consecutive duplicate points and zero-area A-B-A hairpins."""
    out: Ring = []
    for p in pts:
        if not out or out[-1] != p:
            out.append(p)
    if len(out) >= 2 and out[0] == out[-1]:
        out.pop()
    changed = True
    while changed and len(out) >= 3:
        changed = False
        for i in range(len(out)):
            if out[(i - 1) % len(out)] == out[(i + 1) % len(out)]:
                del out[i]
                changed = True
                break
    return out


def _ccw(a: Point, b: Point, c: Point) -> float:
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _on_segment(a: Point, b: Point, p: Point, eps: float = 1e-7) -> bool:
    return (
        min(a[0], b[0]) - eps <= p[0] <= max(a[0], b[0]) + eps
        and min(a[1], b[1]) - eps <= p[1] <= max(a[1], b[1]) + eps
        and abs(_ccw(a, b, p)) <= eps
    )


def _segments_intersect(a: Point, b: Point, c: Point, d: Point) -> bool:
    d1 = _ccw(a, b, c)
    d2 = _ccw(a, b, d)
    d3 = _ccw(c, d, a)
    d4 = _ccw(c, d, b)
    if ((d1 > 1e-7 and d2 < -1e-7) or (d1 < -1e-7 and d2 > 1e-7)) and (
        (d3 > 1e-7 and d4 < -1e-7) or (d3 < -1e-7 and d4 > 1e-7)
    ):
        return True
    if _on_segment(a, b, c) or _on_segment(a, b, d) or _on_segment(c, d, a) or _on_segment(c, d, b):
        return True
    return False


def find_self_intersections(ring: Ring) -> list[tuple[int, int]]:
    """Return all pairs of non-adjacent segment indices that cross or touch."""
    n = len(ring)
    crossings: list[tuple[int, int]] = []
    # Also flag duplicate non-adjacent vertices (pinched figure-8)
    seen_verts: dict[Point, int] = {}
    for idx, pt in enumerate(ring):
        if pt in seen_verts:
            crossings.append((seen_verts[pt], idx))
        else:
            seen_verts[pt] = idx

    for i in range(n):
        a, b = ring[i], ring[(i + 1) % n]
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            c, d = ring[j], ring[(j + 1) % n]
            if _segments_intersect(a, b, c, d):
                crossings.append((i, j))
    return crossings


# ---------------------------------------------------------------------------
# 3. Point-in-Polygon, Boundary Distance & Pole-of-Inaccessibility Center
# ---------------------------------------------------------------------------

def point_in_ring(pt: Point, ring: Ring) -> bool:
    x, y = pt
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xint = (x2 - x1) * (y - y1) / (y2 - y1 + 1e-15) + x1
            if x < xint:
                inside = not inside
    return inside


def point_in_rings(pt: Point, rings: list[Ring]) -> bool:
    return any(point_in_ring(pt, r) for r in rings)


def dist_to_ring(pt: Point, ring: Ring) -> float:
    px, py = pt
    best = 1e9
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        l2 = dx * dx + dy * dy
        t = 0.0 if l2 == 0 else max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / l2))
        d = math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
        if d < best:
            best = d
    return best


def dist_to_rings(pt: Point, rings: list[Ring]) -> float:
    return min((dist_to_ring(pt, r) for r in rings), default=1e9)


def visual_center(ring: Ring) -> tuple[int, int]:
    """Compute an interior label anchor maximizing clearance from polygon edges."""
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    best_p = (int(round(sum(xs) / len(xs))), int(round(sum(ys) / len(ys))))
    best_d = -1.0
    for gx in range(int(min(xs)), int(max(xs)) + 1):
        for gy in range(int(min(ys)), int(max(ys)) + 1):
            p = (float(gx), float(gy))
            if point_in_ring(p, ring):
                d = dist_to_ring(p, ring)
                if d > best_d:
                    best_d = d
                    best_p = (gx, gy)
    return best_p


# ---------------------------------------------------------------------------
# 4. Boundary Snapping, Ring Splitting & Cross-Parent Merging
# ---------------------------------------------------------------------------

def snap_to_ring(
    target_xy: Point,
    ring: Ring,
    mode: str = "vertex",
    max_dist: float = 10.0,
    label: str = "",
) -> tuple[Point, Ring]:
    """
    Snap `target_xy` onto `ring`:
      - mode='vertex' (default): snap to nearest existing vertex on `ring` (preserves exact shared vertices).
      - mode='edge': snap to nearest vertex if within 1.2 SVG units, else project onto nearest edge segment
        and insert the projected vertex into a copy of `ring`.
    """
    tx, ty = target_xy
    ranked = sorted(
        ((math.hypot(tx - p[0], ty - p[1]), idx, p) for idx, p in enumerate(ring)),
        key=lambda item: item[0],
    )
    best_v_dist, _, best_v = ranked[0]

    if mode == "vertex" or best_v_dist <= 1.2:
        if best_v_dist > max_dist:
            near_hint = [
                {"svg": p, "ll": list(svg_to_ll(p[0], p[1])), "dist": round(d, 2)}
                for d, _, p in ranked[:5]
            ]
            raise ValueError(
                f"Cut endpoint {label} at SVG {target_xy} (ll={svg_to_ll(*target_xy)}) is {best_v_dist:.2f} "
                f"units away from nearest ring vertex (> max_snap_dist={max_dist}). "
                f"Nearest 5 vertices on ring: {near_hint}"
            )
        return best_v, ring

    if mode != "edge":
        raise ValueError(f"Unknown snap mode '{mode}' (expected 'vertex' or 'edge')")

    # Project onto closest segment
    best_seg_dist = 1e9
    best_seg_idx = -1
    best_proj: Point = best_v
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        l2 = dx * dx + dy * dy
        if l2 == 0:
            continue
        t = max(0.05, min(0.95, ((tx - x1) * dx + (ty - y1) * dy) / l2))
        proj = (round(x1 + t * dx, 1), round(y1 + t * dy, 1))
        d = math.hypot(tx - proj[0], ty - proj[1])
        if d < best_seg_dist:
            best_seg_dist = d
            best_seg_idx = i
            best_proj = proj

    if best_seg_dist > max_dist:
        raise ValueError(
            f"Edge-snap endpoint {label} at SVG {target_xy} is {best_seg_dist:.2f} units from ring (> {max_dist})"
        )
    if best_proj in ring:
        return best_proj, ring
    new_ring = list(ring[: best_seg_idx + 1]) + [best_proj] + list(ring[best_seg_idx + 1 :])
    return best_proj, new_ring


def split_ring(
    ring: Ring,
    v_start: Point,
    v_end: Point,
    interior_pts: list[Point],
    op_label: str = "",
) -> tuple[Ring, Ring]:
    """Split a simple clockwise ring into two watertight clockwise sub-rings."""
    if v_start == v_end:
        raise ValueError(f"Split '{op_label}': start and end snapped to the same vertex {v_start}!")
    i = ring.index(v_start)
    j = ring.index(v_end)
    chain1 = ring[i : j + 1] if i < j else ring[i:] + ring[: j + 1]
    chain2 = ring[j:] + ring[: i + 1] if i < j else ring[j : i + 1]
    r1 = clean_ring(chain1 + list(reversed(interior_pts)))
    r2 = clean_ring(chain2 + list(interior_pts))

    a_orig = ring_area(ring)
    a1, a2 = ring_area(r1), ring_area(r2)
    if a1 <= 0 or a2 <= 0:
        raise RuntimeError(
            f"Split '{op_label}' produced non-positive ring orientation (areas: {a1:.2f}, {a2:.2f}). "
            "Check that `via_ll` points stay strictly inside the source polygon and follow start->end."
        )
    if abs((a1 + a2) - a_orig) > 1e-3:
        raise RuntimeError(
            f"Split '{op_label}' violated area conservation: {a1:.4f} + {a2:.4f} != {a_orig:.4f}"
        )
    for tag, sub_r in (("part1", r1), ("part2", r2)):
        bad = find_self_intersections(sub_r)
        if bad:
            raise RuntimeError(
                f"Split '{op_label}' ({tag}) introduced {len(bad)} self-intersection(s) at segment pairs {bad[:5]}!"
            )
    return r1, r2


def _inject_collinear_shared_vertices(r1: Ring, r2: Ring, eps: float = 0.08) -> tuple[Ring, Ring]:
    """Ensure edge-snapped vertices lying on an opposite ring's straight segment are present on both rings."""
    def subdivide(ring: Ring, candidates: set[Point]) -> Ring:
        out: Ring = []
        n = len(ring)
        for i in range(n):
            a, b = ring[i], ring[(i + 1) % n]
            out.append(a)
            dx, dy = b[0] - a[0], b[1] - a[1]
            seg_len = math.hypot(dx, dy)
            if seg_len < 1e-6:
                continue
            on_seg = []
            for p in candidates:
                if p == a or p == b:
                    continue
                t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (seg_len * seg_len)
                if 0.0 < t < 1.0:
                    perp = abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / seg_len
                    if perp <= eps:
                        on_seg.append((t, p))
            on_seg.sort(key=lambda item: item[0])
            for _, p in on_seg:
                out.append(p)
        return clean_ring(out)

    s1, s2 = set(r1), set(r2)
    return subdivide(r1, s2), subdivide(r2, s1)


def merge_rings(rings_to_merge: list[Ring], op_label: str = "") -> list[Ring]:
    """Merge adjacent clockwise rings by cancelling shared opposite-direction boundary half-edges."""
    if not rings_to_merge:
        raise ValueError(f"Merge '{op_label}': empty ring list")
    work = [clean_ring(r) for r in rings_to_merge]
    for i in range(len(work)):
        for j in range(i + 1, len(work)):
            work[i], work[j] = _inject_collinear_shared_vertices(work[i], work[j])

    edges: Counter[tuple[Point, Point]] = Counter()
    for r in work:
        for k in range(len(r)):
            u, v = r[k], r[(k + 1) % len(r)]
            if u != v:
                edges[(u, v)] += 1

    adj: dict[Point, list[Point]] = defaultdict(list)
    for (u, v), c in list(edges.items()):
        net = c - edges.get((v, u), 0)
        for _ in range(max(0, net)):
            adj[u].append(v)

    loops: list[Ring] = []
    while adj:
        start = next(iter(adj))
        loop = [start]
        cur = start
        while True:
            if cur not in adj or not adj[cur]:
                raise RuntimeError(f"Merge '{op_label}': open topological boundary at {cur} (polygons not adjacent?)")
            nxt = adj[cur].pop()
            if not adj[cur]:
                del adj[cur]
            if nxt == start:
                break
            loop.append(nxt)
            cur = nxt
        loops.append(clean_ring(loop))

    loops.sort(key=lambda l: abs(ring_area(l)), reverse=True)
    orig_sum = sum(ring_area(r) for r in work)
    merged_sum = sum(ring_area(l) for l in loops)
    if abs(orig_sum - merged_sum) > 1e-3:
        raise RuntimeError(
            f"Merge '{op_label}' violated area conservation: orig={orig_sum:.4f}, merged={merged_sum:.4f}"
        )
    return loops


def _order_pair(r1: Ring, r2: Ring, selector: Any, op_label: str) -> tuple[Ring, Ring]:
    if selector == "west":
        return (r1, r2) if min(p[0] for p in r1) < min(p[0] for p in r2) else (r2, r1)
    if selector == "east":
        return (r1, r2) if max(p[0] for p in r1) > max(p[0] for p in r2) else (r2, r1)
    if selector == "north":
        return (r1, r2) if min(p[1] for p in r1) < min(p[1] for p in r2) else (r2, r1)
    if selector == "south":
        return (r1, r2) if max(p[1] for p in r1) > max(p[1] for p in r2) else (r2, r1)
    if selector == "larger":
        return (r1, r2) if ring_area(r1) >= ring_area(r2) else (r2, r1)
    if selector == "smaller":
        return (r1, r2) if ring_area(r1) <= ring_area(r2) else (r2, r1)
    if isinstance(selector, dict) and "contains_ll" in selector:
        pt = ll_to_svg(*selector["contains_ll"])
        in1, in2 = point_in_ring(pt, r1), point_in_ring(pt, r2)
        if in1 and not in2:
            return (r1, r2)
        if in2 and not in1:
            return (r2, r1)
        raise RuntimeError(f"Split '{op_label}': selector contains_ll={selector['contains_ll']} ambiguous ({in1}, {in2})")
    raise ValueError(f"Split '{op_label}': unsupported select_first={selector!r}")


# ---------------------------------------------------------------------------
# 5. Declarative Geometry Pipeline Executor
# ---------------------------------------------------------------------------

def resolve_ring_ref(ref: str, env: dict[str, list[Ring]]) -> list[Ring]:
    """Resolve references like 'north_china', 'manchuria[0]', 'manchuria[1:]', or '$temp'."""
    if ref in env:
        return env[ref]
    m = re.match(r"^([a-zA-Z0-9_$]+)\[(\d+)(:)?(\d*)?\]$", ref)
    if m:
        base, start_s, colon, end_s = m.groups()
        if base not in env:
            raise KeyError(f"Unknown base polygon '{base}' in ring reference '{ref}'")
        rings = env[base]
        start_i = int(start_s)
        if not colon:
            return [rings[start_i]]
        end_i = int(end_s) if end_s else None
        return rings[start_i:end_i]
    raise KeyError(f"Unknown polygon symbol '{ref}'")


def execute_geometry_ops(
    parent_rings: dict[str, list[Ring]],
    children_meta: list[dict[str, Any]],
    geometry_ops: list[dict[str, Any]],
    capital_checks: list[dict[str, Any]] | None = None,
) -> dict[str, dict[str, Any]]:
    """
    Execute declarative `geometry_ops` on `parent_rings` and build all child region geometries.
    Verifies strict area conservation, zero self-intersections, and optional capital city checks.
    """
    env: dict[str, list[Ring]] = {pid: [list(r) for r in rings] for pid, rings in parent_rings.items()}

    for idx, step in enumerate(geometry_ops):
        op = step["op"]
        label = step.get("comment") or f"op#{idx}:{op}"

        if op == "split":
            src_rings = resolve_ring_ref(step["source"], env)
            if len(src_rings) != 1:
                raise ValueError(
                    f"Split '{label}': source '{step['source']}' has {len(src_rings)} rings; "
                    f"index a single ring such as '{step['source']}[0]'."
                )
            ring = src_rings[0]
            snap_mode = step.get("snap", "vertex")
            max_dist = float(step.get("max_snap_dist", 10.0))
            start_xy = ll_to_svg(*step["start_ll"]) if "start_ll" in step else tuple(step["start_xy"])
            end_xy = ll_to_svg(*step["end_ll"]) if "end_ll" in step else tuple(step["end_xy"])
            v_start, ring = snap_to_ring(start_xy, ring, mode=snap_mode, max_dist=max_dist, label=f"{label}.start")
            v_end, ring = snap_to_ring(end_xy, ring, mode=snap_mode, max_dist=max_dist, label=f"{label}.end")
            via_pts = [ll_to_svg(*pt) for pt in step.get("via_ll", [])]
            r1, r2 = split_ring(ring, v_start, v_end, via_pts, op_label=label)
            first, second = _order_pair(r1, r2, step["select_first"], op_label=label)
            out_a, out_b = step["into"]
            env[out_a] = [first]
            env[out_b] = [second]

        elif op == "merge":
            rings_in: list[Ring] = []
            for sref in step["sources"]:
                rings_in.extend(resolve_ring_ref(sref, env))
            merged = merge_rings(rings_in, op_label=label)
            env[step["into"]] = merged

        elif op in ("assemble", "copy"):
            collected: list[Ring] = []
            for sref in step["rings"]:
                collected.extend(resolve_ring_ref(sref, env))
            env[step["into"]] = collected

        else:
            raise ValueError(f"Unknown geometry op '{op}' in step #{idx}")

    built: dict[str, dict[str, Any]] = {}
    for cmeta in children_meta:
        cid = cmeta["id"]
        if cid not in env:
            raise RuntimeError(f"Child region '{cid}' was not produced by geometry_ops!")
        rings = env[cid]
        for r_idx, r in enumerate(rings):
            bad = find_self_intersections(r)
            if bad:
                raise RuntimeError(f"Child '{cid}' ring[{r_idx}] has self-intersections: {bad[:5]}")
        auto_cx, auto_cy = visual_center(rings[0])
        cx = int(cmeta["cx"]) if cmeta.get("cx") is not None else auto_cx
        cy = int(cmeta["cy"]) if cmeta.get("cy") is not None else auto_cy
        built[cid] = {
            "id": cid,
            "name": cmeta["name"],
            "continent": cmeta["continent"],
            "cx": cx,
            "cy": cy,
            "area_weight": cmeta.get("area_weight", 1.0),
            "parent": cmeta["parent"],
            "rings": rings,
            "path": format_svg_path(rings),
        }

    # Global area conservation check across all parent -> child rings
    orig_area = sum(ring_area(r) for rs in parent_rings.values() for r in rs)
    new_area = sum(ring_area(r) for info in built.values() for r in info["rings"])
    if abs(orig_area - new_area) > 1e-3:
        raise RuntimeError(
            f"Total area conservation failed: parents={orig_area:.6f} vs children={new_area:.6f} "
            f"(diff={new_area - orig_area:+.6f})"
        )

    # Verify historical capital / landmark city coordinates fall in expected child polygons
    # (for coastal ports slightly seaward of simplified SVG shorelines, allow nearest-coast match within tol)
    for chk in capital_checks or []:
        pt = ll_to_svg(*chk["ll"]) if "ll" in chk else tuple(chk["xy"])
        exp = chk["expect"]
        if exp not in built:
            raise RuntimeError(f"Capital check FAILED for '{chk['name']}': unknown expected child '{exp}'")
        if not point_in_rings(pt, built[exp]["rings"]):
            actual = [k for k, v in built.items() if point_in_rings(pt, v["rings"])]
            coastal_tol = float(chk.get("coastal_tol_svg", 4.0))
            d_exp = dist_to_rings(pt, built[exp]["rings"])
            nearest_cid = min(built.keys(), key=lambda k: dist_to_rings(pt, built[k]["rings"]))
            if not (not actual and nearest_cid == exp and d_exp <= coastal_tol):
                raise RuntimeError(
                    f"Capital check FAILED for '{chk['name']}' ({chk.get('ll') or pt}): "
                    f"expected '{exp}', actually landed in {actual} "
                    f"(nearest='{nearest_cid}', dist_to_exp={d_exp:.2f}px)"
                )

    return built
