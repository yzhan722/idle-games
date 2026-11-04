import os
import sys
import json
import datetime
import threading
import http.server
from playwright.sync_api import sync_playwright

DIST_DIR = r"d:\project\idle-games\games\mob-control-3d\dist"
BRAIN_DIR = r"C:\Users\alex\.gemini\antigravity\brain\d0bebaac-7659-47fb-8c43-831d624e0096"
REPORT_JSON = os.path.join(BRAIN_DIR, "scratch", "last_playtest_report.json")
LOG_MD_BRAIN = os.path.join(BRAIN_DIR, "playtest_log.md")
LOG_MD_REPO = r"d:\project\idle-games\games\mob-control-3d\PLAYTEST_LOG.md"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/leaderboard"):
            payload = b'{"top10":[],"activeTop10":[],"realPlayerCount":1}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/leaderboard"):
            content_len = int(self.headers.get("Content-Length", 0))
            if content_len > 0:
                self.rfile.read(content_len)
            payload = b'{"top10":[],"activeTop10":[],"realPlayerCount":1}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        pass


httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
port = httpd.server_address[1]
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()

report = {
    "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "status": "PASS",
    "page_errors": [],
    "console_errors": [],
    "failed_assets": [],
    "checks": [],
    "issues_found": [],
}


def add_check(name, ok, detail=""):
    report["checks"].append({"name": name, "ok": bool(ok), "detail": str(detail)})
    if not ok:
        report["status"] = "FAIL"
        report["issues_found"].append(f"[{name}] {detail}")


exit_code = 0
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 2560, "height": 1278}, device_scale_factor=1)
        page = context.new_page()

        page.on("pageerror", lambda err: report["page_errors"].append(str(err)))
        page.on(
            "console",
            lambda msg: report["console_errors"].append(msg.text)
            if msg.type == "error"
            else None,
        )
        page.on(
            "response",
            lambda res: report["failed_assets"].append(f"{res.status} {res.url}")
            if res.status >= 400 and not res.url.endswith("favicon.ico")
            else None,
        )

        # 1. Load Title Screen
        page.goto(f"http://127.0.0.1:{port}/", wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(120)

        title_visible = page.evaluate(
            "Boolean(document.getElementById('title-screen')) && !document.getElementById('title-screen').classList.contains('hidden')"
        )
        add_check("Title Screen Visible", title_visible, f"visible={title_visible}")

        # 2. Enter Lobby & Verify Character Click No-Jump + Scene Selection Removed
        page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
        page.wait_for_timeout(100)
        page.evaluate(
            "document.getElementById('btn-home-pedestal')?.click(); document.getElementById('home-mascot-art')?.click();"
        )
        launch_active = page.evaluate(
            "document.getElementById('menu-panel-launch')?.classList.contains('active') && !document.getElementById('menu-panel-skills')?.classList.contains('active')"
        )
        add_check("Character Click No Jump", launch_active, f"launch_active={launch_active}")

        no_theme_btns = page.evaluate(
            "!document.getElementById('btn-home-theme') && !document.getElementById('btn-theme')"
        )
        add_check("Scene Selection Buttons Removed", no_theme_btns, f"no_theme_btns={no_theme_btns}")

        # 3. Verify Weekly Leaderboard & 100,000 Gold Rename Requirement
        lb_status = page.evaluate("document.getElementById('leaderboard-self-status')?.textContent || ''")
        add_check("Weekly Leaderboard Refresh Text", "每周一刷新" in lb_status, lb_status)
        page.evaluate("document.getElementById('btn-edit-name')?.click()")
        toast_low_gold = page.evaluate("document.getElementById('global-toast')?.textContent || ''")
        add_check("Rename Blocks <100k Gold", "100,000" in toast_low_gold, toast_low_gold)

        # 4. Cycle All 7 Characters & Verify HQ 2D Mascot Sprites
        seen_races = page.evaluate(
            """() => {
            const list = [];
            for (let i = 0; i < 7; i++) {
                const title = document.getElementById('home-race-title')?.textContent?.trim() || '';
                const img = document.querySelector('#home-mascot-art img');
                const src = img ? img.getAttribute('src') || '' : '';
                list.push({ title, hasHq2d: src.includes('/assets/icons/race_') && src.includes('?v=18') });
                document.getElementById('btn-home-next-race')?.click();
            }
            return list;
        }"""
        )
        unique_races = len(set(r["title"] for r in seen_races if r["title"]))
        all_hq2d = all(r["hasHq2d"] for r in seen_races)
        add_check(
            "All 7 Characters Cycle & HQ 2D Sprites",
            unique_races == 7 and all_hq2d,
            f"unique_races={unique_races}, all_hq2d={all_hq2d}",
        )

        # 5. Multi-Branch Free Skill Allocation + Active-Character-Only Effect + Meta & Skins Tabs
        page.evaluate(
            """() => {
            const raw = localStorage.getItem('swarm_control_3d_save_v3');
            const parsed = raw ? JSON.parse(raw) : {};
            parsed.gold = 600000;
            parsed.bonusTalentPoints = 25;
            parsed.skillNodes = {};
            parsed.selectedRaceId = 'swarm';
            localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(parsed));
        }"""
        )
        page.reload(wait_until="domcontentloaded")
        page.wait_for_timeout(120)
        page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
        page.wait_for_timeout(100)

        multi_branch_result = page.evaluate(
            """() => {
            document.querySelector('.menu-tab[data-tab="skills"]')?.click();
            const cols = Array.from(document.querySelectorAll('.kr-branch-col'));
            if (cols.length !== 7) return { ok: false, reason: 'cols=' + cols.length };
            const n0 = cols[0].querySelectorAll('.tree-node')[3];
            n0?.click(); n0?.click();
            const n2 = cols[2].querySelectorAll('.tree-node')[2];
            n2?.click(); n2?.click();
            const n6 = cols[6].querySelectorAll('.tree-node')[0];
            n6?.click(); n6?.click();
            const saved = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}').skillNodes || {};
            document.querySelector('.menu-tab[data-tab="meta"]')?.click();
            const metaCount = document.querySelectorAll('.meta-buy-btn').length;
            document.querySelector('.menu-tab[data-tab="skins"]')?.click();
            const skinCount = document.querySelectorAll('.skin-card').length;
            document.querySelector('.menu-tab[data-tab="launch"]')?.click();
            const beforeRace = document.getElementById('home-race-title')?.textContent || '';
            document.getElementById('btn-home-next-race')?.click();
            const afterRace = document.getElementById('home-race-title')?.textContent || '';
            return {
                ok: Object.keys(saved).length >= 3 && metaCount >= 6 && skinCount >= 6 && beforeRace !== afterRace,
                saved,
                metaCount,
                skinCount,
                raceSwitch: beforeRace.trim() + ' -> ' + afterRace.trim()
            };
        }"""
        )
        add_check(
            "Multi-Branch Skill Allocation & Free Character Switch & Meta/Skins Tabs",
            multi_branch_result.get("ok"),
            json.dumps(multi_branch_result, ensure_ascii=False),
        )

        page.screenshot(
            path=os.path.join(BRAIN_DIR, "verify_auto_playtest_lobby_2560.jpg"),
            type="jpeg",
            quality=90,
        )

        # 6. Enter Live Battle & Autonomously Play (Aim, Shoot, Trigger Ultimates & In-Run Upgrades)
        page.evaluate("document.getElementById('btn-start-battle')?.click()")
        page.wait_for_timeout(120)

        page.evaluate(
            """() => {
            const canvas = document.querySelector('#canvas-container canvas') || document.getElementById('canvas-container');
            if (canvas) {
                canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 1280, clientY: 960, bubbles: true }));
            }
        }"""
        )
        for step in range(6):
            target_x = 920 + (step % 3) * 320
            page.evaluate(
                f"""() => {{
                window.dispatchEvent(new PointerEvent('pointermove', {{ clientX: {target_x}, clientY: 960, bubbles: true }}));
                ['upg-firerate', 'upg-power', 'upg-champion', 'upg-loot', 'btn-champion', 'btn-orbital'].forEach(id => {{
                    const el = document.getElementById(id);
                    if (el && !el.disabled) el.click();
                }});
            }}"""
            )
            page.wait_for_timeout(120)

        battle_state = page.evaluate(
            """() => ({
            stage: document.getElementById('stage-num')?.textContent || '',
            buffs: document.getElementById('active-buffs-bar')?.textContent || '',
            frLvl: document.getElementById('lvl-firerate')?.textContent || '',
            pwrLvl: document.getElementById('lvl-power')?.textContent || '',
            champLvl: document.getElementById('lvl-champion')?.textContent || '',
            lootLvl: document.getElementById('lvl-loot')?.textContent || '',
            frCost: document.getElementById('cost-firerate')?.textContent || '',
            pwrCost: document.getElementById('cost-power')?.textContent || '',
            champCost: document.getElementById('cost-champion')?.textContent || '',
            lootCost: document.getElementById('cost-loot')?.textContent || '',
            bodyText: document.body.innerText
        })"""
        )

        has_inrun_labels = (
            "秒" in battle_state["frCost"]
            and "击杀" in battle_state["pwrCost"]
            and "出兵" in battle_state["champCost"]
            and "攻城" in battle_state["lootCost"]
        )
        add_check(
            "In-Run Parameter Upgrade Labels Active",
            has_inrun_labels,
            f"costs={battle_state['frCost']} / {battle_state['pwrCost']} / {battle_state['champCost']} / {battle_state['lootCost']}",
        )

        add_check(
            "Scene Special Effect & Active-Character-Only Talent Badge in Battle HUD",
            "蒸汽超压" in battle_state["buffs"] and "天赋×7" not in battle_state["buffs"],
            f"buffs={battle_state['buffs'].strip()}",
        )

        bad_tokens = [
            tok
            for tok in ["NaN", "undefined", "[object Object]", "链式爆破 -0"]
            if tok in battle_state["bodyText"]
        ]
        add_check("Zero NaN/Undefined in DOM Text", len(bad_tokens) == 0, f"bad_tokens={bad_tokens}")

        page.screenshot(
            path=os.path.join(BRAIN_DIR, "verify_auto_playtest_battle_2560.jpg"),
            type="jpeg",
            quality=90,
        )

        add_check("Zero Page Exceptions", len(report["page_errors"]) == 0, str(report["page_errors"]))
        add_check("Zero Console Errors", len(report["console_errors"]) == 0, str(report["console_errors"]))
        add_check("Zero Failed Asset Requests", len(report["failed_assets"]) == 0, str(report["failed_assets"]))

        context.close()
        browser.close()

    os.makedirs(os.path.dirname(REPORT_JSON), exist_ok=True)
    with open(REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    md_entry = f"### [{report['timestamp']}] 自主试玩巡检报告 — **{report['status']}** ({sum(1 for c in report['checks'] if c['ok'])}/{len(report['checks'])} 项通过)\n"
    for c in report["checks"]:
        icon = "✅" if c["ok"] else "❌"
        md_entry += f"- {icon} **{c['name']}**: `{c['detail']}`\n"
    md_entry += "\n"

    for md_path in [LOG_MD_BRAIN, LOG_MD_REPO]:
        header = "# 波波应援团 (Mob Control 3D) 每2小时自主试玩与自动修复巡检日志\n\n"
        existing = ""
        if os.path.exists(md_path):
            with open(md_path, "r", encoding="utf-8") as f:
                existing = f.read()
        if not existing.startswith("# "):
            existing = header + existing
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(existing + md_entry)

    print(
        f"PLAYTEST_STATUS={report['status']} checks={len(report['checks'])} issues={len(report['issues_found'])}",
        flush=True,
    )
    if report["issues_found"]:
        for iss in report["issues_found"]:
            print(f"ISSUE: {iss}", flush=True)
        exit_code = 1
except Exception as e:
    import traceback

    traceback.print_exc()
    exit_code = 1

sys.exit(exit_code)
