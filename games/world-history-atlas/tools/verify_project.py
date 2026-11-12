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

REQUIRED_FILES = [
    "GEMINI.md",
    "PRD.md",
    "PROMPT_FOR_ANTIGRAVITY.md",
    "index.html",
    "src/main.js",
    "src/styles/main.css",
    "src/data/regions_geo.js",
    "src/data/empires_db.js",
    "src/data/timeline_keyframes.js",
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
    if len(empire_names) < 275:
        fail(f"Too few empires ({len(empire_names)} < 275). WH-3 requires 275+ pure sovereign polities.")
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

    # Check owners block pairs
    owner_blocks = re.findall(r'owners:\s*\{([^}]*)\}', tl_text, re.DOTALL)
    for block in owner_blocks:
        pairs = re.findall(r'([a-zA-Z0-9_]+)\s*:\s*(null|"[^"]+")', block)
        for reg_key, emp_val in pairs:
            if reg_key not in region_ids:
                fail(f"Dangling region ID in timeline_keyframes.js: '{reg_key}' not found in regions_geo.js")
            if emp_val != "null":
                emp_clean = emp_val.strip('"')
                if emp_clean not in empire_names:
                    fail(f"Undefined Empire in timeline_keyframes.js: '{emp_clean}' not found in empires_db.js")

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

    print("[PASS] ALL CHECKS PASSED! 100% Referential Integrity Verified.")
    sys.exit(0)

if __name__ == "__main__":
    main()
