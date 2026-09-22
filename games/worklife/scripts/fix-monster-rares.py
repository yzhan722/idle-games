"""One-off content repair (2026-09-08): monster rare drops that could never be granted.

- The six ordinary swamp monsters had rareChance 0, so 毒囊 / 腐烂之心 / 元素核心 / 蛇毒 / 幽灵精华 /
  巨魔之力 — the only source for several alchemy recipes — never dropped. They now use the same
  0.5 the mine roster uses (the legacy act_combat_* yields had them 10x more common than mine ores).
- Snow and volcano monsters advertised rares by display names that no item carries (寒霜结晶, 雪羽,
  炽焰碎片 …). The legacy act_combat_* yields in the same pack name the intended items, so `rare`
  is set to those ids (hp_combat.rareDropFor resolves ids and names alike).

Idempotent; re-run prints "no changes" once applied.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

PACK = Path(__file__).resolve().parents[1] / "shared" / "enhanced_content_pack_chinese.json"

SWAMP_ORDINARY = ["poison_frog", "swamp_zombie", "mud_elemental", "vine_snake", "ghost_light", "swamp_troll"]
RARE_BY_MONSTER = {
    "snow_wolf": "snow_pelt",
    "frost_imp": "frost_shard",
    "ice_golem": "frost_shard",
    "snow_harpy": "snow_pelt",
    "frozen_knight": "glacier_core",
    "yeti": "glacier_core",
    "snow_boss": "frost_crown",
    "lava_slug": "magma_essence",
    "fire_bat": "magma_essence",
    "cinder_hound": "obsidian_chunk",
    "magma_titan": "obsidian_chunk",
    "flame_wraith": "flame_core",
    "inferno_drake": "flame_core",
    "volcano_boss": "demon_horn",
}


def main() -> int:
    raw = PACK.read_text(encoding="utf-8")
    pack = json.loads(raw)
    items = {i["id"] for i in pack["items"]}
    changes = 0
    for m in pack["monsters"]:
        if m["id"] in SWAMP_ORDINARY and not (float(m.get("rareChance") or 0) > 0):
            m["rareChance"] = 0.5
            changes += 1
        target = RARE_BY_MONSTER.get(m["id"])
        if target and m.get("rare") != target:
            assert target in items, target
            m["rare"] = target
            changes += 1
    if not changes:
        print("no changes")
        return 0
    text = json.dumps(pack, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else "")
    # the pack keeps its drop-table entries on one line; json.dumps expands them — fold them back
    text = re.sub(r'\{\n\s+("itemId": "[^"]+"),\n\s+("chance": [0-9.]+)\n\s+\}', r"{ \1, \2 }", text)
    PACK.write_text(text, encoding="utf-8")
    print(f"applied {changes} change(s) to {PACK.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
