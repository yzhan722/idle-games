"""
List content-pack items that still fall back to emoji at a given skill-level ceiling.

Usage:  python scripts/art-gaps.py [max-skill-level=10] [--monsters] [--gather]

Walks every action whose requirements.skillLevel <= N (yields + consumes), every monster's
rare drop and drops[] (all zones), and reports the item ids that have no WebP/PNG under
frontend/src/assets/t1/<folder>/ — <folder> follows itemFolderFor() in frontend/src/assets/t1/keys.ts.
--monsters also lists monsters without monsters/<id> art; --gather lists gather actions <= N whose
card id (trees/<cardId>) has no illustration (falls back to the output item icon).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "shared" / "enhanced_content_pack_chinese.json"
T1 = ROOT / "frontend" / "src" / "assets" / "t1"


def folder_for(item_id: str) -> str:
    if (
        re.match(r"^(weapon|armor|tool|shield|offhand|accessory|ring|amulet|pendant|crown|charm)_", item_id)
        or re.search(r"_(ring|amulet|pendant)$", item_id)
        or re.match(r"^(sovereign|omega)_crown$", item_id)
    ):
        return "equipment"
    if re.match(r"^(food|potion|drink|elixir|dish)_", item_id):
        return "consumables"
    return "materials"


def has_art(key: str) -> bool:
    return any((T1 / f"{key}.{ext}").exists() for ext in ("webp", "png"))


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    max_level = int(args[0]) if args else 10
    pack = json.loads(PACK.read_text(encoding="utf-8"))
    items = {i["id"]: i for i in pack.get("items", [])}
    by_name = {i.get("name"): i["id"] for i in pack.get("items", [])}

    wanted: dict[str, set[str]] = {}

    def want(item_id: str, source: str) -> None:
        if item_id == "gold":
            return  # rendered through ui/gold
        wanted.setdefault(item_id, set()).add(source)

    for a in pack.get("actions", []):
        lvl = int((a.get("requirements") or {}).get("skillLevel") or 1)
        if lvl > max_level:
            continue
        for y in a.get("yields") or []:
            want(y["itemId"], f"{a['id']}@{lvl}")
        for c in a.get("consumes") or []:
            want(c["itemId"], f"{a['id']}@{lvl}")
    for m in pack.get("monsters", []):
        rare = m.get("rare")
        if rare and float(m.get("rareChance") or 0) > 0:
            rid = rare if rare in items else by_name.get(rare)
            if rid:
                want(rid, f"{m['id']} rare")
        for d in m.get("drops") or []:
            want(d["itemId"], f"{m['id']} drop")

    missing = []
    for item_id, sources in sorted(wanted.items()):
        key = f"{folder_for(item_id)}/{item_id}"
        if not has_art(key):
            it = items.get(item_id, {})
            missing.append((key, it.get("name", "?"), it.get("type", "?"), it.get("tier"), sorted(sources)))
    print(f"{len(missing)} item(s) without art on surfaces up to skill level {max_level} "
          f"({len(wanted)} referenced)")
    for key, name, typ, tier, sources in missing:
        print(f"  {key:44s} {name:14s} {typ:10s} T{tier}  <- {', '.join(sources[:3])}{' …' if len(sources) > 3 else ''}")

    if "--monsters" in flags:
        gone = [m for m in pack.get("monsters", []) if not has_art(f"monsters/{m['id']}")]
        print(f"\n{len(gone)} monster(s) without illustration")
        for m in gone:
            print(f"  monsters/{m['id']:28s} {m.get('name', '?'):14s} lv{m.get('level')}")

    if "--gather" in flags:
        # The gather pages read levels from the pack but take the card id (= trees/<cardId> art key)
        # from the local flavour tables in gameConstants.ts / NewGameInterface.tsx; the row shape is fixed enough to regex.
        tsx = (ROOT / "frontend" / "src" / "components" / "NewGameInterface.tsx").read_text(encoding="utf-8")
        constants_path = ROOT / "frontend" / "src" / "gameplay" / "gameConstants.ts"
        if constants_path.exists():
            tsx += "\n" + constants_path.read_text(encoding="utf-8")
        cards = re.findall(r"\{\s*id:\s*'([\w-]+)',\s*actionId:\s*'(\w+)',\s*name:\s*'([^']*)'", tsx)
        actions = {a["id"]: a for a in pack.get("actions", [])}
        gone = []
        for card_id, action_id, title in cards:
            a = actions.get(action_id)
            if not a:
                continue
            lvl = int((a.get("requirements") or {}).get("skillLevel") or 1)
            if lvl <= max_level and not has_art(f"trees/{card_id}"):
                gone.append((lvl, card_id, action_id, title))
        gone.sort()
        print(f"\n{len(gone)} gather card(s) up to skill level {max_level} without their own illustration "
              f"(the row shows the output item instead)")
        for lvl, card_id, action_id, title in gone:
            print(f"  trees/{card_id:24s} {title:14s} lv{lvl:<4d} {action_id}")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
