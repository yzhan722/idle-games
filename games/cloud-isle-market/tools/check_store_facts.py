#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Static check: the privacy / AI paragraphs of docs/store/steam_store.md match the code and assets. Never starts Godot.

    python tools/check_store_facts.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NETWORK = re.compile(r"HTTPRequest|HTTPClient|WebSocketPeer|StreamPeerTCP|PacketPeerUDP|ENet|MultiplayerAPI|OS\.shell_open|https?://")


def main():
    store = (ROOT / "docs/store/steam_store.md").read_text(encoding="utf-8")
    src = {p.relative_to(ROOT).as_posix(): p.read_text(encoding="utf-8") for p in sorted((ROOT / "src").rglob("*")) if p.suffix in (".gd", ".tscn")}
    game = {f: t for f, t in src.items() if not f.endswith("SelfTestRunner.gd")}
    problems = []

    def need(text):
        if text not in store:
            problems.append(f"steam_store.md 没有写：{text}")

    for f, t in game.items():
        if NETWORK.search(t):
            problems.append(f"{f} 有联网调用，隐私段要改")
        if "SteamBridge.gd" not in f and 'get_singleton("Steam")' in t:
            problems.append(f"{f} 直接调用 Steam")
    need("游戏自己不联网、不收集数据")
    if "fileWrite" in game["src/autoload/SteamBridge.gd"]:
        need("整份存档会交给 Steam")
    # everything the game writes itself: the save and the window settings
    paths = sorted(set(re.findall(r'"user://([\w.]+)"', "\n".join(game.values()))))
    if paths != ["savegame.json", "savegame_selftest.json", "ui_settings.cfg"]:
        problems.append(f"本机写了新的文件：{paths}")
    need("存档、界面设置和引擎运行日志只写在本机用户目录")
    if "file_logging" in (ROOT / "project.godot").read_text(encoding="utf-8"):
        problems.append("project.godot 改了引擎日志设置，隐私段要核对")
    has_steam = any("godotsteam" in p.name.lower() for d in ("addons", "bin") for p in (ROOT / d).rglob("*") if (ROOT / d).exists())
    if not has_steam:
        need("现在的包里没有 Steam 组件")

    need(f"{len(list((ROOT / 'assets/pixel_art/guests').glob('*.png')))} 张访客图由这些图改色得到")
    need(f"音效 {len(list((ROOT / 'assets/sfx').glob('*.wav')))} 个由脚本")
    need("实时生成内容：无")

    if problems:
        print("\n".join(problems))
        sys.exit(1)
    print("store facts: OK")


if __name__ == "__main__":
    main()
