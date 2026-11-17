#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated Self-Test & Data Integrity Harness for World History Evolution Atlas.
Ensures zero dangling region IDs, zero undefined empires, >=80 keyframes, and prevents AI stubbing.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Polity names are Chinese; keep them readable on Windows consoles that default to a legacy code page
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):
    pass

REQUIRED_FILES = [
    "GEMINI.md",
    "PRD.md",
    "PROMPT_FOR_ANTIGRAVITY.md",
    "index.html",
    "src/main.js",
    "src/styles/main.css",
    "src/data/regions_geo.js",
    "src/data/empires_db.js",
    "src/data/confidence.js",
    "src/data/timeline_keyframes.js",
    "src/data/stateless_cultures.js",
    "src/data/chronicle_annals_db.js",
    "docs/WORLD_HISTORY_CHRONICLE_DATABASE.md",
    "src/core/TimelineEngine.js",
    "src/ui/MapRenderer.js",
    "src/ui/AudioSynthesizer.js"
]

def fail(msg):
    print(f"[FAIL] {msg}")
    sys.exit(1)

def main():
    print("=== Running World History Evolution Atlas Self-Verification ===")
    for rel in REQUIRED_FILES:
        full = os.path.join(ROOT, rel)
        if not os.path.exists(full):
            fail(f"Missing required file: {rel}")
        size = os.path.getsize(full)
        if size < 500:
            fail(f"Stub file detected ({rel} is only {size} bytes)!")

    # Parse region IDs from regions_geo.js
    with open(os.path.join(ROOT, "src/data/regions_geo.js"), "r", encoding="utf-8") as f:
        reg_text = f.read()
    reg_section = reg_text.split("window.HistoryAtlas.REGIONS")[1]
    region_ids = set(re.findall(r'\{\s*id:\s*"([^"]+)"', reg_section))
    print(f"[OK] Loaded {len(region_ids)} macro-regions from regions_geo.js")
    if len(region_ids) < 42:
        fail(f"Too few regions ({len(region_ids)} < 42). Anti-stubbing rule triggered.")

    # Parse Empire names from empires_db.js
    with open(os.path.join(ROOT, "src/data/empires_db.js"), "r", encoding="utf-8") as f:
        emp_text = f.read()
    empire_names = set(re.findall(r'"([^"]+)"\s*:\s*\{', emp_text))
    print(f"[OK] Loaded {len(empire_names)} historical empires from empires_db.js")
    # The floor only guards against stubbing. It used to be 275, which pushed the data to invent "states"
    # for tribes and archaeological cultures; those were removed (see stateless_cultures.js), so it is 240.
    if len(empire_names) < 240:
        fail(f"Too few empires ({len(empire_names)} < 240). Anti-stubbing floor triggered.")
    for req_emp_field in ("capital_evol:", "institutions:", "fiscal_tax:", "peak_demography:", "treaties_campaigns:"):
        cnt = emp_text.count(req_emp_field)
        if cnt < len(empire_names):
            fail(f"Scholarly dossier field '{req_emp_field}' present on only {cnt}/{len(empire_names)} polities!")
    print(f"[OK] Verified 5-dimension scholarly institutional dossiers across all {len(empire_names)} polities")

    # Parse Timeline keyframes and check all region & empire references
    with open(os.path.join(ROOT, "src/data/timeline_keyframes.js"), "r", encoding="utf-8") as f:
        tl_text = f.read()

    years = [int(y) for y in re.findall(r'year:\s*(-?\d+)', tl_text)]
    print(f"[OK] Loaded {len(years)} timeline keyframes spanning {min(years)} to {max(years)}")
    if len(years) < 185:
        fail(f"Too few timeline keyframes ({len(years)} < 185). WH-3 requires 185+ high-density keyframes.")
    if years != sorted(years):
        fail("Timeline keyframes are NOT sorted in ascending chronological order!")
    if len(years) != len(set(years)):
        fail("Duplicate keyframe years detected in timeline_keyframes.js!")

    # era_span of every polity, for the chronology check below
    def parse_year(s):
        if s == "至今":
            return 9999
        return -int(s[1:]) if s.startswith("前") else int(s)
    spans = {}
    for name, span in re.findall(r'"([^"]+)"\s*:\s*\{[^{}]*?era_span:\s*"([^"]*)"', emp_text):
        m = re.match(r'^(前?\d+)\s*-\s*(前?\d+|至今)$', span)
        if not m:
            fail(f"Unparsable era_span on '{name}': '{span}' (expected e.g. '前221 - 前207' or '1949 - 至今')")
        spans[name] = (parse_year(m.group(1)), parse_year(m.group(2)))

    # Check owners block pairs, and that every polity is only placed on the map while it existed.
    # null means no state ruled the region (described in stateless_cultures.js) and is always allowed.
    # Grace: 10 years before the start for keyframe rounding, 15 after the end (the engine's own grace).
    frame_blocks = re.findall(r'year:\s*(-?\d+)(.*?)(?=\n\s*\{\s*\n\s*year:|\Z)', tl_text, re.DOTALL)
    chronology_errors = []
    for frame_year, frame_body in frame_blocks:
        frame_year = int(frame_year)
        om = re.search(r'owners:\s*\{([^}]*)\}', frame_body, re.DOTALL)
        if not om:
            continue
        pairs = re.findall(r'([a-zA-Z0-9_]+)\s*:\s*(null|"[^"]+")', om.group(1))
        for reg_key, emp_val in pairs:
            if reg_key not in region_ids:
                fail(f"Dangling region ID in timeline_keyframes.js: '{reg_key}' not found in regions_geo.js")
            if emp_val != "null":
                emp_clean = emp_val.strip('"')
                if emp_clean not in empire_names:
                    fail(f"Undefined Empire in timeline_keyframes.js: '{emp_clean}' not found in empires_db.js")
                start, end = spans.get(emp_clean, (None, None))
                if start is not None and (frame_year < start - 10 or frame_year > end + 15):
                    chronology_errors.append(f"{frame_year} {reg_key}: '{emp_clean}' ({start}..{end})")
    if chronology_errors:
        for e in chronology_errors[:20]:
            print(f"  - {e}")
        fail(f"{len(chronology_errors)} keyframe owner(s) placed outside their polity's era_span. "
             "Do not stretch era_span to fill the map: set the region to null and describe it in stateless_cultures.js.")
    print("[OK] Chronology verified: every keyframe owner existed in that year")

    # Stateless cultures: valid regions, kinds and non-overlapping [from, to) periods
    with open(os.path.join(ROOT, "src/data/stateless_cultures.js"), "r", encoding="utf-8") as f:
        cul_text = f.read()
    valid_kinds = {"部落社会", "城邦林立", "考古学文化", "诸国并立"}
    cul_count = 0
    for reg_key, body in re.findall(r'^\s{2}([a-zA-Z0-9_]+):\s*\[(.*?)^\s{2}\]', cul_text, re.DOTALL | re.MULTILINE):
        if reg_key not in region_ids:
            fail(f"Dangling region ID in stateless_cultures.js: '{reg_key}'")
        last_to = None
        for frm, to, kind, name, note in re.findall(
                r'\{\s*from:\s*(-?\d+),\s*to:\s*(-?\d+),\s*kind:\s*"([^"]*)",\s*name:\s*"([^"]*)",\s*note:\s*"([^"]*)"\s*\}', body):
            frm, to = int(frm), int(to)
            if frm >= to:
                fail(f"stateless_cultures.js {reg_key}: period {frm}..{to} is empty or reversed")
            if last_to is not None and frm < last_to:
                fail(f"stateless_cultures.js {reg_key}: period starting {frm} overlaps the previous one")
            if kind not in valid_kinds:
                fail(f"stateless_cultures.js {reg_key}: unknown kind '{kind}' (use one of {sorted(valid_kinds)})")
            if not name.strip() or len(note.strip()) < 6:
                fail(f"stateless_cultures.js {reg_key} {frm}: name and a real note are required")
            last_to = to
            cul_count += 1
    print(f"[OK] Loaded {cul_count} stateless-period descriptions from stateless_cultures.js")

    # Check trade-route references in timeline vs TRADE_ROUTES keys in regions_geo.js
    routes_block = reg_text.split("window.HistoryAtlas.TRADE_ROUTES")[1].split("window.HistoryAtlas.THEATERS")[0]
    route_keys = set(re.findall(r'^\s{2}([a-zA-Z0-9_]+):\s*\{', routes_block, re.MULTILINE))
    if len(route_keys) < 7:
        fail(f"Expected >= 7 historical trade routes in TRADE_ROUTES, got {len(route_keys)}: {sorted(route_keys)}")
    for req_field in ("active_span:", "commodities:", "historical_impact:", "hubs:"):
        if routes_block.count(req_field) < len(route_keys):
            fail(f"Some TRADE_ROUTES entries are missing scholarly metadata field '{req_field}'!")
    for hub_reg in re.findall(r'regionId:\s*"([^"]+)"', routes_block):
        if hub_reg not in region_ids:
            fail(f"Dangling hub regionId in TRADE_ROUTES: '{hub_reg}' not found in regions_geo.js!")
    print(f"[OK] Loaded {len(route_keys)} scholarly historical trade routes & verified all entrepot hub regionIds")
    route_refs = set()
    for arr in re.findall(r'routes:\s*\[([^\]]*)\]', tl_text):
        route_refs.update(re.findall(r'"([^"]+)"', arr))
    for rid in route_refs:
        if rid not in route_keys:
            fail(f"Dangling trade route in timeline_keyframes.js: '{rid}' not found in TRADE_ROUTES keys {sorted(route_keys)}")

    # Check era theme values whitelist
    valid_themes = {"era-ancient", "era-medieval", "era-victoria", "era-modern"}
    for th in set(re.findall(r'theme:\s*"([^"]+)"', tl_text)):
        if th not in valid_themes:
            fail(f"Unknown era theme in timeline_keyframes.js: '{th}'")

    # Check massive chronicle_annals_db.js integrity
    with open(os.path.join(ROOT, "src/data/chronicle_annals_db.js"), "r", encoding="utf-8") as f:
        chr_text = f.read()
    chr_years = [int(y) for y in re.findall(r'"year":\s*(-?\d+)', chr_text)]
    chr_regions = re.findall(r'"regionId":\s*"([^"]+)"', chr_text)
    print(f"[OK] Loaded {len(chr_years)} chronological historical events from chronicle_annals_db.js")
    if len(chr_years) < 800:
        fail(f"Too few chronological events ({len(chr_years)} < 800) in chronicle_annals_db.js! WH-3 requires 800+.")
    if chr_years != sorted(chr_years):
        fail("Chronicle events in chronicle_annals_db.js are NOT sorted in ascending chronological order!")
    for rid in chr_regions:
        if rid not in region_ids:
            fail(f"Dangling regionId '{rid}' in chronicle_annals_db.js!")

    # Check Empire names against Rule 7 (no umbrella/collective/multi-country labels)
    banned_substrings = ["欧盟", "欧洲联盟", "东盟", "非洲联盟", "诸国", "诸侯", "阿拉伯世界", "城邦同盟", " / "]
    for ename in empire_names:
        for bad in banned_substrings:
            if bad in ename:
                fail(f"Rule 7 violation in empires_db.js: '{ename}' contains banned umbrella/composite term '{bad}'!")
    print(f"[OK] Rule 7 verified: all {len(empire_names)} polities are pure sovereign states/dynasties/empires")

    # Check confidence.js (polities & levels) and optional chronicle event confidence tags
    valid_conf_levels = {"史料确证", "学界推测", "传说"}
    conf_path = os.path.join(ROOT, "src/data/confidence.js")
    if not os.path.exists(conf_path):
        fail("Missing src/data/confidence.js")
    with open(conf_path, "r", encoding="utf-8") as f:
        conf_raw = f.read()

    def _strip_js_comments(src):
        out = []
        i, n = 0, len(src)
        while i < n:
            ch = src[i]
            if ch in ('"', "'"):
                q = ch
                out.append(ch)
                i += 1
                while i < n:
                    out.append(src[i])
                    if src[i] == "\\" and i + 1 < n:
                        out.append(src[i + 1])
                        i += 2
                        continue
                    if src[i] == q:
                        i += 1
                        break
                    i += 1
            elif ch == "/" and i + 1 < n and src[i + 1] == "/":
                i += 2
                while i < n and src[i] != "\n":
                    i += 1
            elif ch == "/" and i + 1 < n and src[i + 1] == "*":
                ec = src.find("*/", i + 2)
                out.append(" ")
                i = n if ec == -1 else ec + 2
            else:
                out.append(ch)
                i += 1
        return "".join(out)

    def _find_matching_delim(src, open_idx, open_ch, close_ch):
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
            elif ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    return i
            i += 1
        return -1

    def _read_js_str(src, idx):
        q = src[idx]
        buf = []
        i, n = idx + 1, len(src)
        while i < n:
            ch = src[i]
            if ch == "\\" and i + 1 < n:
                buf.append(src[i + 1])
                i += 2
                continue
            if ch == q:
                return "".join(buf), i + 1
            buf.append(ch)
            i += 1
        return None, n

    def _parse_js_obj_props(body, ctx_label):
        props = {}
        i, n = 0, len(body)
        while i < n:
            while i < n and body[i] in " \t\r\n,":
                i += 1
            if i >= n:
                break
            if body[i] in ('"', "'"):
                key, i = _read_js_str(body, i)
                if key is None:
                    fail(f"Unterminated key string in {ctx_label}")
            else:
                m_id = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", body[i:])
                if not m_id:
                    fail(f"Unexpected token while parsing keys in {ctx_label}: {body[i:i+24]!r}")
                key = m_id.group(0)
                i += m_id.end()
            while i < n and body[i] in " \t\r\n":
                i += 1
            if i >= n or body[i] != ":":
                fail(f"Expected ':' after key '{key}' in {ctx_label}")
            i += 1
            while i < n and body[i] in " \t\r\n":
                i += 1
            if i >= n:
                fail(f"Missing value for key '{key}' in {ctx_label}")
            if key in props:
                fail(f"Duplicate key '{key}' in {ctx_label}")
            if body[i] in ('"', "'"):
                sval, i = _read_js_str(body, i)
                if sval is None:
                    fail(f"Unterminated string value for key '{key}' in {ctx_label}")
                props[key] = ("str", sval)
            elif body[i] == "{":
                end_b = _find_matching_delim(body, i, "{", "}")
                if end_b == -1:
                    fail(f"Unclosed '{{' for key '{key}' in {ctx_label}")
                props[key] = ("obj", body[i + 1:end_b])
                i = end_b + 1
            elif body[i] == "[":
                end_b = _find_matching_delim(body, i, "[", "]")
                if end_b == -1:
                    fail(f"Unclosed '[' for key '{key}' in {ctx_label}")
                props[key] = ("arr", body[i + 1:end_b])
                i = end_b + 1
            else:
                start_v = i
                while i < n and body[i] not in ",\r\n}":
                    i += 1
                props[key] = ("raw", body[start_v:i].strip())
        return props

    conf_text = _strip_js_comments(conf_raw)
    m_conf_root = re.search(r'CONFIDENCE\s*=\s*\{', conf_text)
    if not m_conf_root:
        fail("confidence.js missing window.HistoryAtlas.CONFIDENCE object")
    root_open = m_conf_root.end() - 1
    root_close = _find_matching_delim(conf_text, root_open, "{", "}")
    if root_close == -1:
        fail("Unclosed CONFIDENCE root object in confidence.js")
    root_props = _parse_js_obj_props(conf_text[root_open + 1:root_close], "confidence.js root")

    if "levels" not in root_props or root_props["levels"][0] != "obj":
        fail("confidence.js missing 'levels' object")
    levels_props = _parse_js_obj_props(root_props["levels"][1], "confidence.js levels")
    if set(levels_props.keys()) != valid_conf_levels:
        fail(f"confidence.js levels keys must be {sorted(valid_conf_levels)}, got {sorted(levels_props.keys())}")
    for lk, (lkind, lval) in levels_props.items():
        if lkind != "str" or not lval.strip():
            fail(f"confidence.js levels['{lk}'] explanation must be a non-empty string")

    if "polities" not in root_props or root_props["polities"][0] != "obj":
        fail("confidence.js missing 'polities' object")
    pol_entries = _parse_js_obj_props(root_props["polities"][1], "confidence.js polities")

    extra_pols = sorted(set(pol_entries.keys()) - empire_names)
    if extra_pols:
        fail(f"confidence.js has {len(extra_pols)} unknown polity key(s) not in empires_db.js: {extra_pols[:10]}")
    missing_pols = sorted(empire_names - set(pol_entries.keys()))
    if missing_pols:
        fail(f"confidence.js is missing {len(missing_pols)} polity key(s) from empires_db.js: {missing_pols[:10]}")

    for pkey, (pkind, ebody) in pol_entries.items():
        if pkind != "obj":
            fail(f"confidence.js polity '{pkey}' must map to an object")
        eprops = _parse_js_obj_props(ebody, f"confidence.js polities['{pkey}']")
        if "level" not in eprops or eprops["level"][0] != "str" or eprops["level"][1] not in valid_conf_levels:
            bad_val = eprops["level"][1] if "level" in eprops else "<missing>"
            fail(f"confidence.js polity '{pkey}' has invalid level {bad_val!r} (must be one of {sorted(valid_conf_levels)})")
        if "note" not in eprops or eprops["note"][0] != "str" or not eprops["note"][1].strip():
            fail(f"confidence.js polity '{pkey}' must have a non-empty string 'note'")

    # Optional "confidence" field on chronicle events in chronicle_annals_db.js
    chr_clean = _strip_js_comments(chr_text)
    m_chr_arr = re.search(r'CHRONICLE_ANNALS\s*=\s*\[', chr_clean)
    if not m_chr_arr:
        fail("chronicle_annals_db.js missing CHRONICLE_ANNALS array")
    arr_open = m_chr_arr.end() - 1
    arr_close = _find_matching_delim(chr_clean, arr_open, "[", "]")
    if arr_close == -1:
        fail("Unclosed CHRONICLE_ANNALS array in chronicle_annals_db.js")
    arr_body = chr_clean[arr_open + 1:arr_close]
    chr_conf_count = 0
    cpos = 0
    while cpos < len(arr_body):
        ob_open = arr_body.find("{", cpos)
        if ob_open == -1:
            break
        ob_close = _find_matching_delim(arr_body, ob_open, "{", "}")
        if ob_close == -1:
            fail("Unclosed event object in chronicle_annals_db.js")
        ev_body = arr_body[ob_open + 1:ob_close]
        ev_props = _parse_js_obj_props(ev_body, f"chronicle_annals_db.js@{ob_open}")
        if "confidence" in ev_props:
            ckind, cval = ev_props["confidence"]
            if ckind != "str" or cval not in valid_conf_levels:
                ev_id = ev_props["id"][1] if "id" in ev_props else f"offset@{ob_open}"
                fail(f"Invalid confidence {cval!r} on chronicle event '{ev_id}' (must be one of {sorted(valid_conf_levels)})")
            chr_conf_count += 1
        cpos = ob_close + 1
    print(f"[OK] Verified confidence.js across all {len(pol_entries)} polities (chronicle events with confidence: {chr_conf_count}/{len(chr_years)})")

    # Check city_states.js integrity: regionId exists, from < to, x/y are numbers
    cs_path = os.path.join(ROOT, "src/data/city_states.js")
    if not os.path.exists(cs_path):
        fail("Missing required file: src/data/city_states.js")
    with open(cs_path, "r", encoding="utf-8") as f:
        cs_text = f.read()
    if "window.HistoryAtlas.CITY_STATES" not in cs_text:
        fail("src/data/city_states.js does not define window.HistoryAtlas.CITY_STATES")
    cs_body = cs_text.split("window.HistoryAtlas.CITY_STATES", 1)[1]
    cs_objs = re.findall(r'\{([^{}]+)\}', cs_body)
    if not cs_objs:
        fail("src/data/city_states.js has 0 city-state entries!")
    seen_cs_ids = set()
    for idx, raw_obj in enumerate(cs_objs):
        id_m = re.search(r'(?:^|,)\s*"?id"?\s*:\s*"([^"]+)"', raw_obj)
        name_m = re.search(r'(?:^|,)\s*"?name"?\s*:\s*"([^"]+)"', raw_obj)
        reg_m = re.search(r'(?:^|,)\s*"?regionId"?\s*:\s*"([^"]+)"', raw_obj)
        x_m = re.search(r'(?:^|,)\s*"?x"?\s*:\s*(-?\d+(?:\.\d+)?)', raw_obj)
        y_m = re.search(r'(?:^|,)\s*"?y"?\s*:\s*(-?\d+(?:\.\d+)?)', raw_obj)
        frm_m = re.search(r'(?:^|,)\s*"?from"?\s*:\s*(-?\d+)', raw_obj)
        to_m = re.search(r'(?:^|,)\s*"?to"?\s*:\s*(-?\d+)', raw_obj)
        note_m = re.search(r'(?:^|,)\s*"?note"?\s*:\s*"([^"]+)"', raw_obj)
        label = id_m.group(1) if id_m else f"entry#{idx}"
        if not (id_m and name_m and reg_m and x_m and y_m and frm_m and to_m and note_m):
            fail(f"city_states.js '{label}': missing required field(s) or non-numeric x/y/from/to")
        cid = id_m.group(1)
        if cid in seen_cs_ids:
            fail(f"city_states.js duplicate id: '{cid}'")
        seen_cs_ids.add(cid)
        rid = reg_m.group(1)
        if rid not in region_ids:
            fail(f"city_states.js '{cid}': dangling regionId '{rid}' not found in regions_geo.js")
        try:
            cx_val = float(x_m.group(1))
            cy_val = float(y_m.group(1))
        except ValueError:
            fail(f"city_states.js '{cid}': x/y are not valid numbers")
        frm_val = int(frm_m.group(1))
        to_val = int(to_m.group(1))
        if frm_val >= to_val:
            fail(f"city_states.js '{cid}': invalid period {frm_val}..{to_val} (expected from < to)")
    print(f"[OK] Loaded {len(cs_objs)} city-states from city_states.js (all regionIds, spans, and x/y coordinates valid)")

    # ── WH-CN-1: Verify china_reign_eras.js & china_annals_v1.js ──
    reign_path = os.path.join(ROOT, "src/data/china_reign_eras.js")
    if not os.path.exists(reign_path):
        fail("Missing src/data/china_reign_eras.js!")
    with open(reign_path, "r", encoding="utf-8") as f:
        reign_text = f.read()
    reign_rows = re.findall(
        r'\[\s*(-?\d+),\s*(-?\d+),\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*(\d+),\s*"([^"]*)"\s*\]',
        reign_text
    )
    if len(reign_rows) < 250:
        fail(f"Too few reign era rows in china_reign_eras.js ({len(reign_rows)} < 250)!")
    expected_start = -841
    for s_str, e_str, dyn, mon, ep, snum_str, par in reign_rows:
        s_yr, e_yr, snum = int(s_str), int(e_str), int(snum_str)
        if s_yr == 0 or e_yr == 0:
            fail("Year 0 is illegal in china_reign_eras.js!")
        if s_yr != expected_start:
            fail(f"Chronology gap or overlap in china_reign_eras.js: expected {expected_start}, got {s_yr}")
        if s_yr > e_yr:
            fail(f"Reversed span in china_reign_eras.js: [{s_yr}, {e_yr}]")
        if snum < 1:
            fail(f"Invalid startYearNum {snum} on [{s_yr}, {e_yr}]")
        expected_start = 1 if e_yr == -1 else e_yr + 1
    if expected_start != 2027:
        fail(f"china_reign_eras.js must cover seamlessly up to 2026, ended at {expected_start - 1}")
    print(f"[OK] Verified china_reign_eras.js: {len(reign_rows)} exact contiguous reign/era spans (-841 to 2026, zero Year 0)")

    annals_path = os.path.join(ROOT, "src/data/china_annals_v1.js")
    if os.path.exists(annals_path):
        import json as _json
        import subprocess as _sp
        node_check = (
            'global.window={HistoryAtlas:{}}; '
            'require("./src/data/china_reign_eras.js"); '
            'require("./src/data/china_annals_v1.js"); '
            'const C=window.HistoryAtlas.Chronology, A=window.HistoryAtlas.CHINA_ANNALS_V1; '
            'if(!A||A.volume!==1) throw new Error("Missing CHINA_ANNALS_V1"); '
            'const out={preCount:(A.preGongheNodes||[]).length, yearCount:(A.years||[]).length, '
            'sample119:C.formatDualTrackLabel(-119), sample841:C.formatDualTrackLabel(-841), '
            'sample221:C.formatDualTrackLabel(-221), sample9:C.formatDualTrackLabel(9), '
            'sample184:C.formatDualTrackLabel(184), sample220:C.formatDualTrackLabel(220), '
            'pre:A.preGongheNodes, years:A.years}; '
            'process.stdout.write(JSON.stringify(out));'
        )
        proc = _sp.run(["node", "-e", node_check], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        if proc.returncode != 0:
            fail(f"Node evaluation of china_annals_v1.js failed: {proc.stderr.strip()}")
        adata = _json.loads(proc.stdout)
        if adata["sample119"] != "前119年 · 壬戌 · 汉武帝元狩四年":
            fail(f"Dual-track format mismatch on -119: got '{adata['sample119']}'")

        valid_conf = {"史料确证", "学界推测", "传说"}
        emoji_re = re.compile(r'[\U0001F300-\U0001FAFF\u2600-\u27BF]')
        with open(annals_path, "r", encoding="utf-8") as af:
            raw_annals = af.read()
        if emoji_re.search(raw_annals):
            fail("Emoji detected in china_annals_v1.js! Style rule forbids Emoji.")

        pre_nodes = adata["pre"] or []
        if len(pre_nodes) < 18:
            fail(f"Too few pre-841 archaeological/chronological nodes ({len(pre_nodes)} < 18)!")
        prev_py = -9999
        for pn in pre_nodes:
            py = pn.get("year")
            if not isinstance(py, int) or py < -3000 or py > -842:
                fail(f"Pre-Gonghe node year out of [-3000, -842]: {py}")
            if py < prev_py:
                fail(f"Pre-Gonghe nodes not sorted chronologically at {py}")
            prev_py = py
            if pn.get("confidence") not in valid_conf:
                fail(f"Invalid confidence on preGongheNode {py}: {pn.get('confidence')}")
            if not pn.get("source") or len(pn["source"].strip()) < 4:
                fail(f"Missing source on preGongheNode {py}")
            rid = pn.get("regionId")
            if rid and rid not in region_ids:
                fail(f"Invalid regionId '{rid}' on preGongheNode {py}")
            refs = pn.get("refs") or {}
            if not isinstance(refs, dict):
                fail(f"refs must be object on preGongheNode {py}")
            for ry in refs.get("years", []):
                if not isinstance(ry, int) or ry == 0 or ry < -3000 or ry > 2026:
                    fail(f"Invalid ref year {ry} on preGongheNode {py}")

        yr_list = adata["years"] or []
        expected_years = list(range(-841, 0)) + list(range(1, 221))
        actual_years = [row.get("year") for row in yr_list]
        if actual_years != expected_years:
            fail(f"china_annals_v1.js years must cover every year -841..220 (skipping 0, 1061 total); got {len(actual_years)} entries")

        # Verify GanZhi & Reign match china_reign_eras.js via node
        gz_check = (
            'global.window={HistoryAtlas:{}}; '
            'require("./src/data/china_reign_eras.js"); '
            'require("./src/data/china_annals_v1.js"); '
            'const C=window.HistoryAtlas.Chronology, A=window.HistoryAtlas.CHINA_ANNALS_V1; '
            'for(const row of A.years){ '
            '  const info=C.getChineseEraInfo(row.year); '
            '  if(row.ganzhi!==info.ganzhi) throw new Error(`GanZhi mismatch at ${row.year}: ${row.ganzhi} vs ${info.ganzhi}`); '
            '  if(row.reign!==info.reignLabel) throw new Error(`Reign mismatch at ${row.year}: ${row.reign} vs ${info.reignLabel}`); '
            '}'
        )
        proc2 = _sp.run(["node", "-e", gz_check], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        if proc2.returncode != 0:
            fail(f"Chronology cross-check failed: {proc2.stderr.strip()}")

        ev_total = 0
        for row in yr_list:
            y = row["year"]
            evs = row.get("events")
            if not isinstance(evs, list):
                fail(f"events must be a list at year {y}")
            for ev in evs:
                ev_total += 1
                if not ev.get("title") or not ev.get("detail"):
                    fail(f"Empty event title/detail at year {y}")
                if ev.get("confidence") not in valid_conf:
                    fail(f"Invalid confidence '{ev.get('confidence')}' at year {y} ({ev.get('title')})")
                src = ev.get("source", "")
                if not src or len(src.strip()) < 4:
                    fail(f"Missing primary source citation at year {y} ({ev.get('title')})")
                rid = ev.get("regionId")
                if rid and rid not in region_ids:
                    fail(f"Dangling regionId '{rid}' in china_annals_v1.js at year {y}")
                refs = ev.get("refs")
                if refs is not None:
                    if not isinstance(refs, dict):
                        fail(f"refs must be dict at year {y}")
                    allowed_ref_keys = {"persons", "institutions", "places", "years"}
                    extra_keys = set(refs.keys()) - allowed_ref_keys
                    if extra_keys:
                        fail(f"Unknown refs keys {extra_keys} at year {y}")
                    for k in ("persons", "institutions", "places"):
                        if k in refs and not isinstance(refs[k], list):
                            fail(f"refs.{k} must be list at year {y}")
                    for ry in refs.get("years", []):
                        if not isinstance(ry, int) or ry == 0 or ry < -3000 or ry > 2026:
                            fail(f"Invalid refs.years entry '{ry}' at year {y}")
        print(f"[OK] Verified china_annals_v1.js: {len(pre_nodes)} pre-841 nodes, {len(yr_list)} contiguous annual records (-841..220), {ev_total} sourced events")

        # ── WH-CN-2+: Verify china_annals_v2.js & china_annals_v4.js (required) & any additional loaded volumes v3..v6 ──
        v2_req_path = os.path.join(ROOT, "src/data/china_annals_v2.js")
        if not os.path.exists(v2_req_path):
            fail("Missing required Volume 2 file: src/data/china_annals_v2.js!")
        v4_req_path = os.path.join(ROOT, "src/data/china_annals_v4.js")
        if not os.path.exists(v4_req_path):
            fail("Missing required Volume 4 file: src/data/china_annals_v4.js!")

        expected_vol_spans = {
            2: (221, 588),
            3: (589, 959),
            4: (960, 1367),
            5: (1368, 1911),
            6: (1912, 2026),
        }
        novel_ban_terms = ["空城计", "草船借箭", "借东风", "三气周瑜", "关索", "六出祁山", "赔了夫人又折兵"]
        v4_novel_ban_terms = ["三打祝家庄", "智取生辰纲", "穆桂英", "佘太君", "八贤王", "大破天门阵", "双枪陆文龙", "气死金兀术"]
        v5_novel_ban_terms = ["韦小宝", "陈近南", "还珠格格", "夏雨荷", "陈家洛", "红花会", "香妃化蝶", "吕四娘", "血滴子暗杀", "孝庄下嫁", "九王夺嫡八王逼宫"]

        for vnum in range(2, 7):
            v_rel = f"src/data/china_annals_v{vnum}.js"
            v_path = os.path.join(ROOT, v_rel)
            if not os.path.exists(v_path):
                continue
            with open(v_path, "r", encoding="utf-8") as vf:
                raw_v = vf.read()
            if emoji_re.search(raw_v):
                fail(f"Emoji detected in {v_rel}! Style rule forbids Emoji.")
            if vnum == 2:
                for bt in novel_ban_terms:
                    if bt in raw_v:
                        fail(f"Fictional novel trope '{bt}' detected in {v_rel}!")
            if vnum == 4:
                for bt in v4_novel_ban_terms:
                    if bt in raw_v:
                        fail(f"Fictional novel trope '{bt}' detected in {v_rel}!")
            if vnum == 5:
                for bt in v5_novel_ban_terms:
                    if bt in raw_v:
                        fail(f"Fictional novel/drama trope '{bt}' detected in {v_rel}!")

            v_node_check = (
                'global.window={HistoryAtlas:{}}; '
                'require("./src/data/china_reign_eras.js"); '
                f'require("./{v_rel}"); '
                f'const C=window.HistoryAtlas.Chronology, V=window.HistoryAtlas.CHINA_ANNALS_V{vnum}; '
                f'if(!V||V.volume!=={vnum}) throw new Error("Missing or mismatched CHINA_ANNALS_V{vnum}"); '
                'for(const row of (V.years||[])){ '
                '  const info=C.getChineseEraInfo(row.year); '
                '  if(row.ganzhi!==info.ganzhi) throw new Error(`GanZhi mismatch at ${row.year}: ${row.ganzhi} vs ${info.ganzhi}`); '
                '  const nr=row.reign.replace(/载/g,"年"), lab=info.reignLabel.replace(/载/g,"年"), em=lab.match(/(..(?:元|[一二三四五六七八九十廿]+)年)$/), era=em?em[1]:lab; '
                '  if(nr!==lab && !nr.includes(era)) throw new Error(`Reign mismatch at ${row.year}: ${row.reign} vs ${info.reignLabel}`); '
                '} '
                'process.stdout.write(JSON.stringify({range:V.range, years:V.years}));'
            )
            pv = _sp.run(["node", "-e", v_node_check], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
            if pv.returncode != 0:
                fail(f"Node evaluation / chronology cross-check of {v_rel} failed: {pv.stderr.strip()}")
            vdata = _json.loads(pv.stdout)
            exp_s, exp_e = expected_vol_spans[vnum]
            if vdata.get("range") != [exp_s, exp_e]:
                fail(f"{v_rel} range must be [{exp_s}, {exp_e}], got {vdata.get('range')}")
            v_years = vdata.get("years") or []
            exp_yr_list = [y for y in range(exp_s, exp_e + 1) if y != 0]
            act_yr_list = [r.get("year") for r in v_years]
            if act_yr_list != exp_yr_list:
                fail(f"{v_rel} must cover every year {exp_s}..{exp_e} contiguously ({len(exp_yr_list)} years); got {len(act_yr_list)}")

            v_ev_total = 0
            for row in v_years:
                y = row["year"]
                if y == 0:
                    fail(f"Illegal Year 0 in {v_rel}")
                if not row.get("dynasty") or not row.get("reign"):
                    fail(f"Missing dynasty or reign at year {y} in {v_rel}")
                evs = row.get("events")
                if not isinstance(evs, list):
                    fail(f"events must be a list at year {y} in {v_rel}")
                for ev in evs:
                    v_ev_total += 1
                    if not ev.get("title") or not ev.get("detail"):
                        fail(f"Empty event title/detail at year {y} in {v_rel}")
                    if ev.get("confidence") not in valid_conf:
                        fail(f"Invalid confidence '{ev.get('confidence')}' at year {y} in {v_rel} ({ev.get('title')})")
                    src = ev.get("source", "")
                    if not src or len(src.strip()) < 4:
                        fail(f"Missing primary source citation at year {y} in {v_rel} ({ev.get('title')})")
                    rid = ev.get("regionId")
                    if rid and rid not in region_ids:
                        fail(f"Dangling regionId '{rid}' in {v_rel} at year {y}")
                    refs = ev.get("refs")
                    if refs is not None:
                        if not isinstance(refs, dict):
                            fail(f"refs must be dict at year {y} in {v_rel}")
                        allowed_ref_keys = {"persons", "institutions", "places", "years"}
                        extra_keys = set(refs.keys()) - allowed_ref_keys
                        if extra_keys:
                            fail(f"Unknown refs keys {extra_keys} at year {y} in {v_rel}")
                        for k in ("persons", "institutions", "places"):
                            if k in refs and not isinstance(refs[k], list):
                                fail(f"refs.{k} must be list at year {y} in {v_rel}")
                        for ry in refs.get("years", []):
                            if not isinstance(ry, int) or ry == 0 or ry < -3000 or ry > 2026:
                                fail(f"Invalid refs.years entry '{ry}' at year {y} in {v_rel}")
            print(f"[OK] Verified {v_rel}: {len(v_years)} contiguous annual records ({exp_s}..{exp_e}), {v_ev_total} sourced events")

        ui_path = os.path.join(ROOT, "src/ui/ChinaAnnals.js")
        if not os.path.exists(ui_path):
            fail("Missing src/ui/ChinaAnnals.js!")
        with open(ui_path, "r", encoding="utf-8") as uf:
            raw_ui = uf.read()
        if emoji_re.search(raw_ui):
            fail("Emoji detected in src/ui/ChinaAnnals.js! Style rule forbids Emoji.")
        if "<svg" in raw_ui.lower():
            fail("Inline <svg> detected in src/ui/ChinaAnnals.js!")
        proc_ui = _sp.run(["node", "--check", "src/ui/ChinaAnnals.js"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        if proc_ui.returncode != 0:
            fail(f"Syntax error in src/ui/ChinaAnnals.js: {proc_ui.stderr.strip()}")
        proc_main = _sp.run(["node", "--check", "src/main.js"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        if proc_main.returncode != 0:
            fail(f"Syntax error in src/main.js: {proc_main.stderr.strip()}")
        print("[OK] Verified ChinaAnnals.js & main.js: valid JS syntax, zero Emoji, zero inline SVG")

    verify_china_annals_v3(region_ids)
    verify_china_annals_v5(region_ids)
    verify_china_annals_v6(region_ids)

    verify_map_units()
    verify_persons()
    print("[PASS] ALL CHECKS PASSED! 100% Referential Integrity Verified.")
    sys.exit(0)


def verify_china_annals_v3(region_ids):
    """Independent verification for Volume 3 (589-959: Sui, Tang, Five Dynasties)."""
    import json
    import subprocess as _sp
    annals_v3_path = os.path.join(ROOT, "src/data/china_annals_v3.js")
    if not os.path.exists(annals_v3_path):
        fail("Missing src/data/china_annals_v3.js!")

    with open(annals_v3_path, "r", encoding="utf-8") as af:
        raw_v3 = af.read()

    emoji_re = re.compile(r'[\U0001F300-\U0001FAFF\u2600-\u27BF]')
    if emoji_re.search(raw_v3):
        fail("Emoji detected in src/data/china_annals_v3.js! Style rule forbids Emoji.")
    if "<svg" in raw_v3.lower():
        fail("Inline <svg> detected in src/data/china_annals_v3.js!")

    proc_chk = _sp.run(
        ["node", "--check", "src/data/china_annals_v3.js"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8"
    )
    if proc_chk.returncode != 0:
        fail(f"Syntax error in src/data/china_annals_v3.js: {proc_chk.stderr.strip()}")

    dump_js = (
        'global.window={HistoryAtlas:{}}; '
        'require("./src/data/china_reign_eras.js"); '
        'require("./src/data/china_annals_v3.js"); '
        'const C=window.HistoryAtlas.Chronology, A=window.HistoryAtlas.CHINA_ANNALS_V3; '
        'if(!A) throw new Error("CHINA_ANNALS_V3 not exported on window.HistoryAtlas"); '
        'for(const row of (A.years||[])){ '
        '  const gz=C.getGanZhi(row.year); '
        '  if(row.ganzhi!==gz) throw new Error(`GanZhi mismatch at ${row.year}: ${row.ganzhi} vs ${gz}`); '
        '} '
        'process.stdout.write(JSON.stringify(A));'
    )
    proc = _sp.run(["node", "-e", dump_js], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if proc.returncode != 0:
        fail(f"Failed to load/verify china_annals_v3.js via node: {proc.stderr.strip()}")

    adata = json.loads(proc.stdout)
    if adata.get("volume") != 3:
        fail(f"china_annals_v3.js volume must be 3, got {adata.get('volume')}")
    if adata.get("title") != "隋唐五代":
        fail(f"china_annals_v3.js title must be '隋唐五代', got {adata.get('title')}")
    if adata.get("range") != [589, 959]:
        fail(f"china_annals_v3.js range must be [589, 959], got {adata.get('range')}")

    yr_list = adata.get("years")
    if not isinstance(yr_list, list) or not yr_list:
        fail("china_annals_v3.js years must be a non-empty list")

    actual_years = [row.get("year") for row in yr_list]
    expected_years = list(range(589, 960))
    if actual_years != expected_years:
        fail(f"china_annals_v3.js years must cover every year 589..959 (371 total); got {len(actual_years)} entries")

    valid_conf = {"史料确证", "学界推测", "传说"}
    valid_cats = {
        "会盟外交", "典章制度", "军政征伐", "学术文化", "工程民生",
        "思想与文化", "政治与制度", "王朝更替", "科技与交通", "科技与文化", "科技与水利"
    }
    allowed_ref_keys = {"persons", "institutions", "places", "years"}

    ev_total = 0
    active_years = 0
    for row in yr_list:
        y = row["year"]
        if not row.get("dynasty") or not isinstance(row.get("dynasty"), str):
            fail(f"Missing dynasty at year {y} in china_annals_v3.js")
        if not row.get("reign") or not isinstance(row.get("reign"), str):
            fail(f"Missing reign at year {y} in china_annals_v3.js")
        if not isinstance(row.get("parallel"), str) or not row.get("parallel").strip():
            fail(f"Missing parallel polity/era info at year {y} in china_annals_v3.js")
        evs = row.get("events")
        if not isinstance(evs, list):
            fail(f"events must be a list at year {y} in china_annals_v3.js")
        if evs:
            active_years += 1
        seen_titles = set()
        for ev in evs:
            ev_total += 1
            t = (ev.get("title") or "").strip()
            d = (ev.get("detail") or "").strip()
            if not t or not d:
                fail(f"Empty event title/detail at year {y} in china_annals_v3.js")
            if t in seen_titles:
                fail(f"Duplicate event title '{t}' at year {y} in china_annals_v3.js")
            seen_titles.add(t)
            cat = ev.get("category")
            if cat not in valid_cats:
                fail(f"Invalid category '{cat}' at year {y} ({t}) in china_annals_v3.js")
            if ev.get("confidence") not in valid_conf:
                fail(f"Invalid confidence '{ev.get('confidence')}' at year {y} ({t}) in china_annals_v3.js")
            src = (ev.get("source") or "").strip()
            if len(src) < 4:
                fail(f"Missing primary source citation at year {y} ({t}) in china_annals_v3.js")
            rid = ev.get("regionId")
            if not rid or rid not in region_ids:
                fail(f"Invalid or missing regionId '{rid}' at year {y} ({t}) in china_annals_v3.js")
            refs = ev.get("refs")
            if not isinstance(refs, dict):
                fail(f"refs must be dict at year {y} ({t}) in china_annals_v3.js")
            extra_keys = set(refs.keys()) - allowed_ref_keys
            if extra_keys:
                fail(f"Unknown refs keys {extra_keys} at year {y} ({t}) in china_annals_v3.js")
            for k in ("persons", "institutions", "places"):
                if k not in refs or not isinstance(refs[k], list):
                    fail(f"refs.{k} must be list at year {y} ({t}) in china_annals_v3.js")
                for item in refs[k]:
                    if not isinstance(item, str) or not item.strip():
                        fail(f"Empty string in refs.{k} at year {y} ({t}) in china_annals_v3.js")
            if "years" not in refs or not isinstance(refs["years"], list):
                fail(f"refs.years must be list at year {y} ({t}) in china_annals_v3.js")
            for ry in refs["years"]:
                if not isinstance(ry, int) or isinstance(ry, bool) or ry == 0 or ry < -3000 or ry > 2026 or ry == y:
                    fail(f"Invalid or self-referencing refs.years entry '{ry}' at year {y} ({t}) in china_annals_v3.js")

    print(
        f"[OK] Verified china_annals_v3.js (589..959): "
        f"{len(yr_list)} contiguous annual records, {active_years} active years, {ev_total} sourced events"
    )


def verify_china_annals_v5(region_ids):
    """Independent verification for Volume 5 (1368-1911: Ming & Qing Dynasties)."""
    import json
    import subprocess as _sp
    annals_v5_path = os.path.join(ROOT, "src/data/china_annals_v5.js")
    if not os.path.exists(annals_v5_path):
        fail("Missing src/data/china_annals_v5.js!")

    with open(annals_v5_path, "r", encoding="utf-8") as af:
        raw_v5 = af.read()

    emoji_re = re.compile(r'[\U0001F300-\U0001FAFF\u2600-\u27BF]')
    if emoji_re.search(raw_v5):
        fail("Emoji detected in src/data/china_annals_v5.js! Style rule forbids Emoji.")
    if "<svg" in raw_v5.lower():
        fail("Inline <svg> detected in src/data/china_annals_v5.js!")

    v5_ban = ["韦小宝", "陈近南", "还珠格格", "夏雨荷", "陈家洛", "红花会", "香妃化蝶", "吕四娘", "血滴子暗杀", "孝庄下嫁", "九王夺嫡八王逼宫"]
    for bt in v5_ban:
        if bt in raw_v5:
            fail(f"Fictional novel/drama trope '{bt}' detected in src/data/china_annals_v5.js!")

    proc_chk = _sp.run(
        ["node", "--check", "src/data/china_annals_v5.js"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8"
    )
    if proc_chk.returncode != 0:
        fail(f"Syntax error in src/data/china_annals_v5.js: {proc_chk.stderr.strip()}")

    dump_js = (
        'global.window={HistoryAtlas:{}}; '
        'require("./src/data/china_reign_eras.js"); '
        'require("./src/data/china_annals_v5.js"); '
        'const C=window.HistoryAtlas.Chronology, A=window.HistoryAtlas.CHINA_ANNALS_V5; '
        'if(!A) throw new Error("CHINA_ANNALS_V5 not exported on window.HistoryAtlas"); '
        'for(const row of (A.years||[])){ '
        '  const info=C.getChineseEraInfo(row.year); '
        '  if(row.ganzhi!==info.ganzhi) throw new Error(`GanZhi mismatch at ${row.year}: ${row.ganzhi} vs ${info.ganzhi}`); '
        '  const nr=row.reign, lab=info.reignLabel, em=lab.match(/(..(?:元|[一二三四五六七八九十廿]+)年)$/), era=em?em[1]:lab; '
        '  if(nr!==lab && !nr.includes(era)) throw new Error(`Reign mismatch at ${row.year}: ${row.reign} vs ${info.reignLabel}`); '
        '} '
        'process.stdout.write(JSON.stringify(A));'
    )
    proc = _sp.run(["node", "-e", dump_js], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if proc.returncode != 0:
        fail(f"Failed to load/verify china_annals_v5.js via node: {proc.stderr.strip()}")

    adata = json.loads(proc.stdout)
    if adata.get("volume") != 5:
        fail(f"china_annals_v5.js volume must be 5, got {adata.get('volume')}")
    if adata.get("title") != "明清":
        fail(f"china_annals_v5.js title must be '明清', got {adata.get('title')}")
    if adata.get("range") != [1368, 1911]:
        fail(f"china_annals_v5.js range must be [1368, 1911], got {adata.get('range')}")

    yr_list = adata.get("years")
    if not isinstance(yr_list, list) or not yr_list:
        fail("china_annals_v5.js years must be a non-empty list")

    actual_years = [row.get("year") for row in yr_list]
    expected_years = list(range(1368, 1912))
    if actual_years != expected_years:
        fail(f"china_annals_v5.js years must cover every year 1368..1911 (544 total); got {len(actual_years)} entries")

    valid_conf = {"史料确证", "学界推测", "传说"}
    valid_cats = {
        "中外交流", "会盟外交", "典章制度", "军政征伐", "学术文化", "对外交流",
        "工程民生", "思想与文化", "思想宗教", "政治与制度", "政治变局", "民族交融",
        "王朝更替", "科技与交通", "科技与文化", "科技与水利", "科技文化", "经济民生"
    }
    allowed_ref_keys = {"persons", "institutions", "places", "years"}

    ev_total = 0
    active_years = 0
    for row in yr_list:
        y = row["year"]
        if not row.get("dynasty") or not isinstance(row.get("dynasty"), str):
            fail(f"Missing dynasty at year {y} in china_annals_v5.js")
        if not row.get("reign") or not isinstance(row.get("reign"), str):
            fail(f"Missing reign at year {y} in china_annals_v5.js")
        if not isinstance(row.get("parallel"), str) or not row.get("parallel").strip():
            fail(f"Missing parallel polity/era info at year {y} in china_annals_v5.js")
        evs = row.get("events")
        if not isinstance(evs, list):
            fail(f"events must be a list at year {y} in china_annals_v5.js")
        if evs:
            active_years += 1
        seen_titles = set()
        for ev in evs:
            ev_total += 1
            t = (ev.get("title") or "").strip()
            d = (ev.get("detail") or "").strip()
            if not t or not d:
                fail(f"Empty event title/detail at year {y} in china_annals_v5.js")
            if t in seen_titles:
                fail(f"Duplicate event title '{t}' at year {y} in china_annals_v5.js")
            seen_titles.add(t)
            cat = ev.get("category")
            if cat not in valid_cats:
                fail(f"Invalid category '{cat}' at year {y} ({t}) in china_annals_v5.js")
            if ev.get("confidence") not in valid_conf:
                fail(f"Invalid confidence '{ev.get('confidence')}' at year {y} ({t}) in china_annals_v5.js")
            src = (ev.get("source") or "").strip()
            if len(src) < 4:
                fail(f"Missing primary source citation at year {y} ({t}) in china_annals_v5.js")
            rid = ev.get("regionId")
            if not rid or rid not in region_ids:
                fail(f"Invalid or missing regionId '{rid}' at year {y} ({t}) in china_annals_v5.js")
            refs = ev.get("refs")
            if not isinstance(refs, dict):
                fail(f"refs must be dict at year {y} ({t}) in china_annals_v5.js")
            extra_keys = set(refs.keys()) - allowed_ref_keys
            if extra_keys:
                fail(f"Unknown refs keys {extra_keys} at year {y} ({t}) in china_annals_v5.js")
            for k in ("persons", "institutions", "places"):
                if k not in refs or not isinstance(refs[k], list):
                    fail(f"refs.{k} must be list at year {y} ({t}) in china_annals_v5.js")
                for item in refs[k]:
                    if not isinstance(item, str) or not item.strip():
                        fail(f"Empty string in refs.{k} at year {y} ({t}) in china_annals_v5.js")
            if "years" not in refs or not isinstance(refs["years"], list):
                fail(f"refs.years must be list at year {y} ({t}) in china_annals_v5.js")
            for ry in refs["years"]:
                if not isinstance(ry, int) or isinstance(ry, bool) or ry == 0 or ry < -3000 or ry > 2026 or ry == y:
                    fail(f"Invalid or self-referencing refs.years entry '{ry}' at year {y} ({t}) in china_annals_v5.js")

    print(
        f"[OK] Verified china_annals_v5.js (1368..1911): "
        f"{len(yr_list)} contiguous annual records, {active_years} active years, {ev_total} sourced events"
    )


def verify_china_annals_v6(region_ids):
    """Independent verification for Volume 6 (1912-2026: Republic of China & Contemporary China)."""
    import json
    import subprocess as _sp
    annals_v6_path = os.path.join(ROOT, "src/data/china_annals_v6.js")
    if not os.path.exists(annals_v6_path):
        fail("Missing src/data/china_annals_v6.js!")

    with open(annals_v6_path, "r", encoding="utf-8") as af:
        raw_v6 = af.read()

    emoji_re = re.compile(r'[\U0001F300-\U0001FAFF\u2600-\u27BF]')
    if emoji_re.search(raw_v6):
        fail("Emoji detected in src/data/china_annals_v6.js! Style rule forbids Emoji.")
    if "<svg" in raw_v6.lower():
        fail("Inline <svg> detected in src/data/china_annals_v6.js!")

    v6_ban_terms = ["手撕鬼子", "燕双鹰", "李云龙", "陈真", "霍元甲"]
    for bt in v6_ban_terms:
        if bt in raw_v6:
            fail(f"Banned fictional/drama term '{bt}' detected in src/data/china_annals_v6.js!")

    proc_chk = _sp.run(
        ["node", "--check", "src/data/china_annals_v6.js"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8"
    )
    if proc_chk.returncode != 0:
        fail(f"Syntax error in src/data/china_annals_v6.js: {proc_chk.stderr.strip()}")

    dump_js = (
        'global.window={HistoryAtlas:{}}; '
        'require("./src/data/china_reign_eras.js"); '
        'require("./src/data/china_annals_v6.js"); '
        'const C=window.HistoryAtlas.Chronology, A=window.HistoryAtlas.CHINA_ANNALS_V6; '
        'if(!A) throw new Error("CHINA_ANNALS_V6 not exported on window.HistoryAtlas"); '
        'for(const row of (A.years||[])){ '
        '  const info=C.getChineseEraInfo(row.year); '
        '  if(row.ganzhi!==info.ganzhi) throw new Error(`GanZhi mismatch at ${row.year}: ${row.ganzhi} vs ${info.ganzhi}`); '
        '  if(row.reign!==info.reignLabel) throw new Error(`Reign mismatch at ${row.year}: ${row.reign} vs ${info.reignLabel}`); '
        '  if(row.dynasty!==info.dynasty) throw new Error(`Dynasty mismatch at ${row.year}: ${row.dynasty} vs ${info.dynasty}`); '
        '} '
        'process.stdout.write(JSON.stringify(A));'
    )
    proc = _sp.run(["node", "-e", dump_js], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if proc.returncode != 0:
        fail(f"Failed to load/verify china_annals_v6.js via node: {proc.stderr.strip()}")

    adata = json.loads(proc.stdout)
    if adata.get("volume") != 6:
        fail(f"china_annals_v6.js volume must be 6, got {adata.get('volume')}")
    if adata.get("title") != "民国与当代":
        fail(f"china_annals_v6.js title must be '民国与当代', got {adata.get('title')}")
    if adata.get("range") != [1912, 2026]:
        fail(f"china_annals_v6.js range must be [1912, 2026], got {adata.get('range')}")

    yr_list = adata.get("years")
    if not isinstance(yr_list, list) or not yr_list:
        fail("china_annals_v6.js years must be a non-empty list")

    actual_years = [row.get("year") for row in yr_list]
    expected_years = list(range(1912, 2027))
    if actual_years != expected_years:
        fail(f"china_annals_v6.js years must cover every year 1912..2026 (115 total); got {len(actual_years)} entries")

    valid_conf = {"史料确证", "学界推测", "传说"}
    valid_cats = {
        "政权更替", "政治与制度", "典章制度", "军政征伐",
        "外交与条约", "经济与建设", "科技与教育", "社会与文化"
    }
    allowed_ref_keys = {"persons", "institutions", "places", "years"}

    ev_total = 0
    active_years = 0
    for row in yr_list:
        y = row["year"]
        par = row.get("parallel")
        if not isinstance(par, str) or not par.strip():
            fail(f"Missing parallel polity/era info at year {y} in china_annals_v6.js")
        if 1932 <= y <= 1945 and "伪满洲国" not in par:
            fail(f"Year {y} parallel must explicitly mark puppet Manchukuo as '伪满洲国', got: {par}")
        if 1940 <= y <= 1945 and "汪伪" not in par:
            fail(f"Year {y} parallel must explicitly mark Wang puppet regime as '汪伪', got: {par}")

        evs = row.get("events")
        if not isinstance(evs, list):
            fail(f"events must be a list at year {y} in china_annals_v6.js")
        if evs:
            active_years += 1
        seen_titles = set()
        for ev in evs:
            ev_total += 1
            t = (ev.get("title") or "").strip()
            d = (ev.get("detail") or "").strip()
            if not t or not d:
                fail(f"Empty event title/detail at year {y} in china_annals_v6.js")
            if t in seen_titles:
                fail(f"Duplicate event title '{t}' at year {y} in china_annals_v6.js")
            seen_titles.add(t)
            cat = ev.get("category")
            if cat not in valid_cats:
                fail(f"Invalid category '{cat}' at year {y} ({t}) in china_annals_v6.js")
            if ev.get("confidence") not in valid_conf:
                fail(f"Invalid confidence '{ev.get('confidence')}' at year {y} ({t}) in china_annals_v6.js")
            src = (ev.get("source") or "").strip()
            if len(src) < 4:
                fail(f"Missing primary source citation at year {y} ({t}) in china_annals_v6.js")
            rid = ev.get("regionId")
            if not rid or rid not in region_ids:
                fail(f"Invalid or missing regionId '{rid}' at year {y} ({t}) in china_annals_v6.js")
            refs = ev.get("refs")
            if not isinstance(refs, dict):
                fail(f"refs must be dict at year {y} ({t}) in china_annals_v6.js")
            extra_keys = set(refs.keys()) - allowed_ref_keys
            if extra_keys:
                fail(f"Unknown refs keys {extra_keys} at year {y} ({t}) in china_annals_v6.js")
            for k in ("persons", "institutions", "places"):
                if k not in refs or not isinstance(refs[k], list):
                    fail(f"refs.{k} must be list at year {y} ({t}) in china_annals_v6.js")
                for item in refs[k]:
                    if not isinstance(item, str) or not item.strip():
                        fail(f"Empty string in refs.{k} at year {y} ({t}) in china_annals_v6.js")
            if "years" not in refs or not isinstance(refs["years"], list):
                fail(f"refs.years must be list at year {y} ({t}) in china_annals_v6.js")
            for ry in refs["years"]:
                if not isinstance(ry, int) or isinstance(ry, bool) or ry == 0 or ry < -3000 or ry > 2026 or ry == y:
                    fail(f"Invalid or self-referencing refs.years entry '{ry}' at year {y} ({t}) in china_annals_v6.js")

    print(
        f"[OK] Verified china_annals_v6.js (1912..2026): "
        f"{len(yr_list)} contiguous annual records, {active_years} active years, {ev_total} sourced events"
    )



def verify_map_units():
    """Province/state map units: every unit belongs to a known historic region; every holder is a known polity."""
    import subprocess as _sp
    js = (
        'global.window={HistoryAtlas:{}}; '
        'for (const f of ["regions_geo","empires_db","map_units"]) require("./src/data/"+f+".js"); '
        'const H=window.HistoryAtlas, M=H.MAP_UNITS; if(!M) throw new Error("MAP_UNITS missing"); '
        'const R=new Set(H.REGIONS.map(r=>r.id)); const ids=new Set(); let bad=[]; '
        'for (const u of M.units){ if(!R.has(u.r)) bad.push("region "+u.r+" of "+u.id); if(ids.has(u.id)) bad.push("dup "+u.id); ids.add(u.id); if(!u.d) bad.push("no path "+u.id); } '
        'for (const [id,seq] of Object.entries(M.modern)){ if(!ids.has(id)) bad.push("modern for unknown unit "+id); '
        'const yr=t=>t==="至今"?9999:t.startsWith("前")?-parseInt(t.slice(1)):parseInt(t); '
        'const span=n=>{const m=(H.EMPIRES[n].era_span||"").match(/^(前?\\d+)\\s*-\\s*(前?\\d+|至今)$/); return m?[yr(m[1]),yr(m[2])]:null;}; '
        '  for (const [a,b,n] of seq){ if(!(a<b)) bad.push("bad span "+id); if(!n) continue; if(!H.EMPIRES[n]) { bad.push("unknown polity "+n); continue; } '
        '    const sp=span(n); if(sp && (a < sp[0]-10 || b-1 > sp[1]+15)) bad.push(id+" "+a+"-"+b+" "+n+" outside "+H.EMPIRES[n].era_span); } } '
        'for (const r of R) if(!M.regionCenters[r]) bad.push("no anchor for region "+r); '
        'if(bad.length) throw new Error(bad.slice(0,10).join("; ")); '
        'process.stdout.write(M.units.length+" units, "+Object.keys(M.modern).length+" with unit-level holders");'
    )
    pv = _sp.run(["node", "-e", js], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if pv.returncode != 0:
        fail(f"map_units.js check failed: {pv.stderr.strip()[-600:]}")
    print(f"[OK] Verified map_units.js: {pv.stdout.strip()}")


def verify_persons():
    """Person view: index entries have a data file; stops sorted, inside the life span, nothing after 1949."""
    import subprocess as _sp
    js = (
        'global.window={HistoryAtlas:{}}; require("./src/data/persons_index.js"); require("./src/data/empires_db.js"); '
        'const H=window.HistoryAtlas, fs=require("fs"); const bad=[]; let stops=0; '
        'for (const e of H.PERSONS_INDEX){ const f="./src/data/persons/"+e.id+".js"; if(!fs.existsSync(f)){ bad.push("missing "+f); continue; } require(f); '
        '  const p=H.PERSONS[e.id]; if(!p){ bad.push("not registered "+e.id); continue; } if(p.polity && !H.EMPIRES[p.polity]) bad.push(e.id+" unknown polity "+p.polity); '
        '  let last=-1e9; for (const s of p.stops){ stops++; if(s.year<last) bad.push(e.id+" unsorted "+s.year); last=s.year; '
        '    if(s.year<p.born-1||s.to>p.died+1) bad.push(e.id+" stop outside life "+s.year); if(s.to>1949) bad.push(e.id+" after 1949"); '
        '    if(typeof s.x!=="number"||typeof s.y!=="number") bad.push(e.id+" no xy "+s.year); } } '
        'if(bad.length) throw new Error(bad.slice(0,10).join("; ")); process.stdout.write(H.PERSONS_INDEX.length+" persons, "+stops+" stops");'
    )
    pv = _sp.run(["node", "-e", js], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if pv.returncode != 0:
        fail(f"persons check failed: {pv.stderr.strip()[-600:]}")
    print(f"[OK] Verified person view data: {pv.stdout.strip()}")

if __name__ == "__main__":
    main()
