"""Matte a list of item masters into frontend/src/assets/t1/<folder>/<id>.webp.

Usage: python scripts/art-matte-batch.py <ids.txt> [--erode N] [--depink] [--only id,id,...]

Each line of ids.txt is an item id; the master is expected at
$T1_MASTERS/gen-item-<id>.png (default C:/Users/alex/.cursor/projects/d-project/assets) and the
output folder follows the same prefix routing as itemFolderFor() in frontend/src/assets/t1/keys.ts.
Prints the art-contact.py residue audit at the end.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MASTERS = Path(os.environ.get("T1_MASTERS", r"C:\Users\alex\.cursor\projects\d-project\assets"))


def folder_for(item_id: str) -> str:
    if re.match(r"^(weapon|armor|tool|shield|offhand|accessory|ring|amulet|pendant|crown|charm)_", item_id):
        return "equipment"
    if re.match(r"^(food|potion|drink|elixir|dish)_", item_id):
        return "consumables"
    return "materials"


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    ids = [l.strip() for l in Path(args[0]).read_text(encoding="utf-8").splitlines() if l.strip()]
    erode = "4"
    if "--erode" in args:
        erode = args[args.index("--erode") + 1]
    only = None
    if "--only" in args:
        only = set(args[args.index("--only") + 1].split(","))
    extra = ["--depink"] if "--depink" in args else []
    outs = []
    for item_id in ids:
        if only and item_id not in only:
            continue
        src = MASTERS / f"gen-item-{item_id}.png"
        if not src.exists():
            print(f"MISSING master {src}")
            return 1
        out = ROOT / "frontend" / "src" / "assets" / "t1" / folder_for(item_id) / f"{item_id}.webp"
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([sys.executable, str(ROOT / "scripts" / "art-matte.py"), str(src), str(out), "--erode", erode, *extra], check=True)
        outs.append(str(out.relative_to(ROOT)))
    subprocess.run([sys.executable, str(ROOT / "scripts" / "art-contact.py"), "test-results/art-contact-batch.png", *outs], check=False, cwd=ROOT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
