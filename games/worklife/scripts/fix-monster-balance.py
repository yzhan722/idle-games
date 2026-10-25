"""SUPERSEDED (2026-10): do not run. Monster atk is now solved by scripts/audit/calibrate.ts against the
ratio damage formula; the STATS below are stale and would overwrite those values.

Content repair (2026-09-08): monster stats that two different formulas left unwinnable.

The ordinary monsters of the forest, mine and swamp follow one gentle line (hp +15, atk +2, def +1
per level), and the player formula (hp 50 + 10/level, atk 5 + level + gear, damage = atk -
floor(def / 2)) is tuned against it. The mine and swamp bosses and everything from the snow zone on
were generated with a different, ~4-5x steeper formula: with the zone's own best gear a level-20
player dies to 矿山霸主 in four hits and a level-31 player dies to a 冰原雪狼 in four hits.

This script continues the gentle line into the snow zone and sets the three bosses so that the
zone's own gear tier at the zone's level wins narrowly (abilities and food make it comfortable)
while an ungeared player of the same level loses. Volcano and later zones are untouched — they are
not open and their gear tiers need one pass together. backend/src/zone_progression.test.ts guards
the result. xp / gold are unchanged. Idempotent.
"""
from __future__ import annotations

import json
from pathlib import Path

PACK = Path(__file__).resolve().parents[1] / "shared" / "enhanced_content_pack_chinese.json"

STATS = {
    # bosses: ~2.5x hp, ~1.5x atk / def of the zone's last ordinary monster
    "mine_boss": {"hp": 500, "atk": 42, "def": 30},
    "swamp_boss": {"hp": 800, "atk": 62, "def": 45},
    # snow zone: continue the mine -> swamp line (+15 hp, +2 atk, +1 def per level from 285/42/28 @26)
    "snow_wolf": {"hp": 360, "atk": 52, "def": 33},
    "frost_imp": {"hp": 390, "atk": 56, "def": 35},
    "ice_golem": {"hp": 420, "atk": 60, "def": 37},
    "snow_harpy": {"hp": 450, "atk": 64, "def": 39},
    "frozen_knight": {"hp": 480, "atk": 68, "def": 41},
    "yeti": {"hp": 525, "atk": 74, "def": 44},
    "snow_boss": {"hp": 1400, "atk": 95, "def": 65},
}


def main() -> int:
    raw = PACK.read_text(encoding="utf-8")
    pack = json.loads(raw)
    changes = 0
    for m in pack["monsters"]:
        target = STATS.get(m["id"])
        if not target:
            continue
        for k, v in target.items():
            if m.get(k) != v:
                m[k] = v
                changes += 1
    if not changes:
        print("no changes")
        return 0
    import re

    text = json.dumps(pack, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else "")
    text = re.sub(r'\{\n\s+("itemId": "[^"]+"),\n\s+("chance": [0-9.]+)\n\s+\}', r"{ \1, \2 }", text)
    PACK.write_text(text, encoding="utf-8")
    print(f"applied {changes} change(s) to {PACK.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
