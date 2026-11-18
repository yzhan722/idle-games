"""Mob Control 3D autonomous playtest (serves dist/, drives it with Playwright at 2560x1278, 1440x900 and 390x844).

Run from games/mob-control-3d after `npm run build`:
  python scripts/auto_playtest.py                               full run (every milestone + CORE)
  PLAYTEST_ONLY=MC-17 python scripts/auto_playtest.py           only MC-17's sections on all three viewports
  PLAYTEST_ONLY=MC-16,MC-17 python scripts/auto_playtest.py     several milestones (CORE = the generic checks)
Env: BRAIN_DIR (report json under BRAIN_DIR/scratch), SCREENSHOT_DIR, PLAYTEST_LOG_MD (patrol log path),
     PLAYTEST_VERBOSE=1 (timed PASS / FAIL lines), PLAYTEST_RANDOM=lo|hi|seed:N (pin Math.random, flake hunting).
"""
import os
import sys
import json
import datetime
import threading
import http.server
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(BASE_DIR, "dist")
BRAIN_DIR = os.environ.get(
    "BRAIN_DIR",
    r"C:\Users\Administrator\.gemini\antigravity\brain\6d2279ce-1afd-4b76-9c2b-3b4e98e08859"
)
REPORT_JSON = os.path.join(BRAIN_DIR, "scratch", "last_playtest_report.json")
LOG_MD_BRAIN = os.path.join(BRAIN_DIR, "playtest_log.md")
# PLAYTEST_LOG_MD redirects the rolling patrol log (its .gz archive then sits next to it). A filtered run
# (PLAYTEST_ONLY, see below) is partial, so it only writes a patrol log when PLAYTEST_LOG_MD is given explicitly.
LOG_MD_OVERRIDE = os.environ.get("PLAYTEST_LOG_MD", "").strip()
LOG_MD_REPO = LOG_MD_OVERRIDE or os.path.join(BASE_DIR, "PLAYTEST_LOG.md")
LOG_ARCHIVE_GZ = (
    os.path.join(os.path.dirname(os.path.abspath(LOG_MD_OVERRIDE)), "playtest_logs_archive.md.gz")
    if LOG_MD_OVERRIDE
    else os.path.join(BASE_DIR, "docs", "archives", "playtest_logs_archive.md.gz")
)
WRITE_PATROL_LOG = True


# ----------------------------------------------------------------------------------------------------------------------
# PLAYTEST_ONLY: run only some milestones' checks, e.g. PLAYTEST_ONLY=MC-17 or PLAYTEST_ONLY=MC-16,MC-17 (also accepts
# mc17 / 17). CORE selects the generic checks (title, lobby, characters, skills, live battle and the overall
# 2560 / 1440 / 390 overflow sweeps). Unset or empty = the full run. The zero page-exception / console-error /
# failed-asset checks always run. A filtered run boots each page into the same save the full run has at that point
# (gold, talent points, skill nodes, race, a live battle on the 2560 page) and only writes a patrol log when
# PLAYTEST_LOG_MD is given.
# PLAYTEST_RANDOM=lo|hi|seed:N pins Math.random on every page before the game scripts run. Flake hunting only: a check
# that flips under lo / hi depends on luck and has to be made deterministic in the check itself.
# ----------------------------------------------------------------------------------------------------------------------
import re as _re


def _norm_tag(tok):
    t = tok.strip().upper().replace("_", "-").replace(" ", "")
    if not t:
        return ""
    if t == "CORE":
        return t
    m = _re.fullmatch(r"(?:MC-?)?(\d{1,2})", t)
    return f"MC-{int(m.group(1))}" if m else t


KNOWN_TAGS = {"CORE"} | {f"MC-{i}" for i in range(1, 18)}
PLAYTEST_ONLY = {t for t in (_norm_tag(x) for x in os.environ.get("PLAYTEST_ONLY", "").split(",")) if t}
_unknown_tags = PLAYTEST_ONLY - KNOWN_TAGS
if _unknown_tags:
    print(f"PLAYTEST_ONLY: unknown tag(s) {sorted(_unknown_tags)}; use CORE or MC-1 .. MC-17", flush=True)
    sys.exit(2)
FILTERED = bool(PLAYTEST_ONLY)
if FILTERED:
    WRITE_PATROL_LOG = bool(LOG_MD_OVERRIDE)
_ran_tags = set()


def want(*tags):
    """True if any of `tags` is selected (always on a full run); remembers which tags actually ran."""
    if not FILTERED:
        _ran_tags.update(tags)
        return True
    hit = [t for t in tags if t in PLAYTEST_ONLY]
    _ran_tags.update(hit)
    return bool(hit)


def ran(tag):
    return tag in _ran_tags


PLAYTEST_RANDOM = os.environ.get("PLAYTEST_RANDOM", "").strip().lower()


def random_init_script():
    if not PLAYTEST_RANDOM:
        return None
    if PLAYTEST_RANDOM == "lo":
        return "(() => { let i = 0; Math.random = () => ((i++ * 0.000137) % 0.002); })();"
    if PLAYTEST_RANDOM == "hi":
        return "(() => { let i = 0; Math.random = () => 0.998 + ((i++ * 0.000137) % 0.0019); })();"
    m = _re.fullmatch(r"seed:(\d+)", PLAYTEST_RANDOM)
    if m:
        return (
            "(() => { let a = %d >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; "
            "t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); "
            "return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();" % int(m.group(1))
        )
    print(f"PLAYTEST_RANDOM: expected lo | hi | seed:N, got {PLAYTEST_RANDOM!r}", flush=True)
    sys.exit(2)


def new_page_context(viewport, scale=1):
    ctx = browser.new_context(viewport=viewport, device_scale_factor=scale)
    js = random_init_script()
    if js:
        ctx.add_init_script(js)
    return ctx


# MC-17 page helpers (jungle temple vine swing): walk the run with the autopilot to a goal, read the run / HUD state, and
# list which reused-art copies are on screen next to their originals (they must never share a screen).
JUNGLE_WALK_JS = """(goal) => {
    const w = window.__mc3dWorld;
    const run = () => (w ? w.jungleRun : null);
    if (!run()) return { ok: false, steps: 0 };
    const done = () => {
        const s = run();
        if (!s || !s.active) return true;
        if (goal.kind === 'chasm') {
            const c = w.jungleChasms[goal.index || 0];
            return !c || s.distance + 0.9 >= c.cfg.d + (goal.into ?? 1.2);
        }
        if (goal.kind === 'boulder') {
            return w.jungleBoulders.some((b) => b.state === 'rolling' && !b.passed && s.courseGroup.position.z - b.du > (goal.wz ?? -4));
        }
        if (goal.kind === 'dist') return s.distance >= goal.value;
        if (goal.kind === 'exit') return s.distance >= s.courseLength - (goal.before ?? 18);
        return false;
    };
    let steps = 0;
    for (; steps < 1400 && !done(); steps++) {
        w.turretTargetX = w.getJungleAutopilotX();
        w.update(0.05);
    }
    return { ok: true, steps, dist: run() ? Math.round(run().distance) : -1 };
}"""

JUNGLE_INFO_JS = """() => {
    const w = window.__mc3dWorld;
    const s = w.jungleRun;
    const hud = document.getElementById('jungle-swing-hud');
    const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
    const thud = document.getElementById('tactic-deck-hud');
    const chips = thud ? Array.from(thud.querySelectorAll('.tactic-hud-chip')) : [];
    const inside = (el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight; };
    const label = document.querySelector('.jungle-swing-label');
    return {
        active: Boolean(s && s.active), dist: s ? Math.round(s.distance) : 0, len: s ? s.courseLength : 0, bobos: w.jungleBoboCount,
        lost: w.jungleBobosLost, state: s ? s.state : '',
        chasmVisible: w.jungleChasms.some((c) => c.group.visible),
        vineHeld: w.jungleChasms.some((c) => c.group.visible && c.locked && c.leadGrabbed && !c.passed),
        boulderRolling: w.jungleBoulders.some((b) => b.rock.visible && b.state === 'rolling'),
        laneVisible: w.jungleBoulders.some((b) => b.lane.visible),
        exitVisible: Boolean(w.jungleExitGroup && w.jungleExitGroup.visible),
        hudFit: Boolean(hud) && pills.length === 3 && !hud.classList.contains('hidden') && pills.every(inside),
        tacticFit: chips.length === 3 && chips.every(inside),
        labelShown: Boolean(label && label.style.display !== 'none'),
        hudTxt: pills.map((p) => (p.textContent || '').trim()),
        ov: document.documentElement.scrollWidth - window.innerWidth,
    };
}"""

ART_PAIR_JS = """() => {
    const pairs = [['ui_jungle_temple', 'decor_plant'], ['ui_emerald_idol_badge', 'skin_emerald'], ['vine_swing', 'env_tailwind_belt'], ['rolling_boulder', 'ui_barrel']];
    const shown = new Set();
    for (const img of document.querySelectorAll('img')) {
        const r = img.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        const cs = getComputedStyle(img);
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
        if (img.offsetParent === null && cs.position !== 'fixed') continue;
        const m = (img.getAttribute('src') || '').match(/\\/([a-z0-9_]+)\\.png/);
        if (m) shown.add(m[1]);
    }
    return {
        clashes: pairs.filter(([a, b]) => shown.has(a) && shown.has(b)).map((p) => p.join('+')),
        copies: pairs.filter(([a]) => shown.has(a)).map((p) => p[0]),
        originals: pairs.filter(([, b]) => shown.has(b)).map((p) => p[1]),
    };
}"""
# Screenshots land in BRAIN_DIR/scratch unless SCREENSHOT_DIR is set (an explicit SCREENSHOT_DIR is never auto-cleaned).
SHOT_DIR_ENV = os.environ.get("SCREENSHOT_DIR", "").strip()
SHOT_DIR = SHOT_DIR_ENV or os.path.join(BRAIN_DIR, "scratch")


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


try:
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 4211), QuietHandler)
except OSError:
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


_T0 = datetime.datetime.now()


def add_check(name, ok, detail=""):
    report["checks"].append({"name": name, "ok": bool(ok), "detail": str(detail)})
    if os.environ.get("PLAYTEST_VERBOSE") == "1":
        elapsed = (datetime.datetime.now() - _T0).total_seconds()
        print(f"[{elapsed:6.1f}s] {'PASS' if ok else 'FAIL'} {name[:90]}", flush=True)
    if not ok:
        report["status"] = "FAIL"
        report["issues_found"].append(f"[{name}] {detail}")


exit_code = 0
_pw_browser = None
aux_page_errors = []
try:
    with sync_playwright() as p:
        ms_pw = os.path.join(os.environ.get("LOCALAPPDATA", ""), "ms-playwright")
        exe_path = None
        if os.path.isdir(ms_pw):
            for root, _, files in os.walk(ms_pw):
                if "chrome.exe" in files:
                    exe_path = os.path.join(root, "chrome.exe")
                    break
        if exe_path:
            browser = p.chromium.launch(headless=True, executable_path=exe_path)
        else:
            try:
                browser = p.chromium.launch(headless=True)
            except Exception:
                browser = p.chromium.launch(headless=True, channel="msedge")
        _pw_browser = browser
        context = new_page_context({"width": 2560, "height": 1278}, 1)
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

        os.makedirs(SHOT_DIR, exist_ok=True)
        # Section results default to "not run" so the cross-section overflow sweeps work on a filtered run too
        max_desk_overflow = 0
        mc5_check = mc6_check = mc7_check = mc8_check = mc9_check = mc10_check = {}
        mc11_check = mc12_check = mc13_check = mc14_check = mc15_check = mc16_check = mc17_check = {}
        desk1440_lobby_ov = desk1440_meta_ov = desk1440_escort_ov = desk1440_train_ov = desk1440_pet_ov = 0
        desk1440_sub_ov = desk1440_hall_ov = desk1440_mc12_lobby_ov = desk1440_sled_ov = desk1440_gacha_ov = 0
        desk1440_mc13_lobby_ov = desk1440_lava_ov = desk1440_skin_battle_ov = desk1440_decor_ov = 0
        desk1440_mc14_lobby_ov = desk1440_ast_ov = desk1440_tactic_ov = desk1440_mc15_lobby_ov = 0
        desk1440_battle_tactic_ov = desk1440_pk_ov = desk1440_result_ov = desk1440_mc16_meta_ov = 0
        desk1440_mc16_lobby_ov = desk1440_mc16_camp_ov = desk1440_mc16_result_ov = desk1440_mc17_max_ov = 0
        desk1440_py_sand = desk1440_py_slab = desk1440_py_exit = desk1440_lava_info = {}
        RUN_1440 = want("CORE", "MC-9", "MC-10", "MC-11", "MC-12", "MC-13", "MC-14", "MC-15", "MC-16", "MC-17")
        RUN_390 = want("CORE", "MC-7", "MC-9", "MC-10", "MC-11", "MC-12", "MC-13", "MC-14", "MC-15", "MC-16", "MC-17")
        _ran_tags.clear()

        # 1. Load Title Screen
        page.goto(f"http://127.0.0.1:{port}/", wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(120)

        if want("CORE"):
            title_visible = page.evaluate(
                "Boolean(document.getElementById('title-screen')) && !document.getElementById('title-screen').classList.contains('hidden')"
            )
            add_check("Title Screen Visible", title_visible, f"visible={title_visible}")

        if want("CORE"):
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
                    list.push({ title, hasHq2d: src.includes('/assets/icons/race_') && src.includes('?v=33') });
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

            os.makedirs(SHOT_DIR, exist_ok=True)
            page.screenshot(
                path=os.path.join(SHOT_DIR, "verify_auto_playtest_lobby_2560.jpg"),
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

        else:
            # Filtered run: boot into the save the full run has here (gold, talent points, the allocated skill nodes,
            # the race picked by the free-switch check) and start the same live battle section 6 starts
            page.evaluate(
                """() => {
                const raw = localStorage.getItem('swarm_control_3d_save_v3');
                const parsed = raw ? JSON.parse(raw) : {};
                parsed.gold = 600000;
                parsed.bonusTalentPoints = 25;
                parsed.skillNodes = { swarm_t1: 2, gate_t2: 1, tycoon_t4: 1 };
                parsed.selectedRaceId = 'swarm';
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(parsed));
            }"""
            )
            page.reload(wait_until="domcontentloaded")
            page.wait_for_timeout(120)
            page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            page.wait_for_timeout(100)
            page.evaluate("document.getElementById('btn-home-next-race')?.click()")
            page.evaluate("document.getElementById('btn-start-battle')?.click()")
            page.wait_for_timeout(120)
        if want("MC-1"):
            mc1_result = page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc1SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc1SelfCheck' };
                }
                return w.runMc1SelfCheck();
            }"""
            )
            add_check(
                "MC-1 Dynamic Gate Charging (-6 -> +1 -> +3 -> +5) & Frame Color Transition",
                bool(mc1_result.get("frameColorChanged"))
                and "+1" in mc1_result.get("chargeProgression", [])
                and "+3" in mc1_result.get("chargeProgression", [])
                and "+5" in mc1_result.get("chargeProgression", []),
                f"prog={mc1_result.get('chargeProgression')}, colorChanged={mc1_result.get('frameColorChanged')}",
            )
            add_check(
                "MC-1 Jelly Giant Gate (2x HP/ATK) & Frosting Shield Gate (Gear/Barrel Immunity)",
                bool(mc1_result.get("hasJellyGate"))
                and bool(mc1_result.get("hasFrostGate"))
                and bool(mc1_result.get("jellyDoubled"))
                and bool(mc1_result.get("frostBlockedGear"))
                and bool(mc1_result.get("frostBlockedBarrel")),
                json.dumps(
                    {
                        "hasJelly": mc1_result.get("hasJellyGate"),
                        "hasFrost": mc1_result.get("hasFrostGate"),
                        "jelly2x": mc1_result.get("jellyDoubled"),
                        "blockGear": mc1_result.get("frostBlockedGear"),
                        "blockBarrel": mc1_result.get("frostBlockedBarrel"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-2"):
            mc2_result = page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc2SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc2SelfCheck' };
                }
                return w.runMc2SelfCheck();
            }"""
            )
            add_check(
                "MC-2 Dual Lateral Steam Shield Sub-Towers (0.24x -> 0.58x -> 1.0x & Overload Shatter)",
                bool(mc2_result.get("stage5SubTowers") == 2)
                and bool(mc2_result.get("stage10SubTowers") == 2)
                and bool(mc2_result.get("bossOverloadDamaged"))
                and abs(float(mc2_result.get("multTwoAlive", 0)) - 0.24) < 0.01
                and abs(float(mc2_result.get("multOneAlive", 0)) - 0.58) < 0.01
                and abs(float(mc2_result.get("multZeroAlive", 0)) - 1.0) < 0.01,
                json.dumps(
                    {
                        "s5": mc2_result.get("stage5SubTowers"),
                        "s10": mc2_result.get("stage10SubTowers"),
                        "mults": [
                            mc2_result.get("multTwoAlive"),
                            mc2_result.get("multOneAlive"),
                            mc2_result.get("multZeroAlive"),
                        ],
                        "overload": mc2_result.get("bossOverloadDamaged"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-2 Boss Ground Half-Bridge Telegraph & High-Pressure Steam Sweep Lane Isolation",
                bool(mc2_result.get("telegraphVisible"))
                and bool(mc2_result.get("sweptLaneHit"))
                and bool(mc2_result.get("safeLaneUnharmed")),
                json.dumps(
                    {
                        "telegraph": mc2_result.get("telegraphVisible"),
                        "sweptHit": mc2_result.get("sweptLaneHit"),
                        "safeLane": mc2_result.get("safeLaneUnharmed"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-3"):
            mc3_result = page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc3SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc3SelfCheck' };
                }
                const res = w.runMc3SelfCheck();
                const endlessBtn = document.getElementById('btn-start-endless');
                return { ...res, hasEndlessLobbyBtn: Boolean(endlessBtn) };
            }"""
            )
            add_check(
                "MC-3 25s Candy Vault Bonus Heist (Zero Red Enemies & Gold + Skin Shard Burst)",
                bool(mc3_result.get("bonusVaultCount", 0) >= 5)
                and bool(mc3_result.get("bonusDuration") == 25)
                and bool(mc3_result.get("bonusZeroRedSpawn"))
                and bool(mc3_result.get("vaultBroken"))
                and bool(mc3_result.get("bonusGoldDelta", 0) >= 400)
                and bool(mc3_result.get("bonusShardsEarned", 0) >= 1),
                json.dumps(
                    {
                        "vaults": mc3_result.get("bonusVaultCount"),
                        "dur": mc3_result.get("bonusDuration"),
                        "zeroRed": mc3_result.get("bonusZeroRedSpawn"),
                        "broken": mc3_result.get("vaultBroken"),
                        "goldDelta": mc3_result.get("bonusGoldDelta"),
                        "shards": mc3_result.get("bonusShardsEarned"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-3 Endless Workshop Defense (Lobby Entry, Wave Escalation, Mutant Giants & Best Medal)",
                bool(mc3_result.get("hasEndlessLobbyBtn"))
                and bool(mc3_result.get("endlessWaveReached", 0) >= 3)
                and bool(mc3_result.get("endlessBrutesSpawned", 0) >= 2)
                and bool(mc3_result.get("persistedBestWave", 0) >= 3)
                and bool(mc3_result.get("medalTitle")),
                json.dumps(
                    {
                        "lobbyBtn": mc3_result.get("hasEndlessLobbyBtn"),
                        "wave": mc3_result.get("endlessWaveReached"),
                        "brutes": mc3_result.get("endlessBrutesSpawned"),
                        "bestWave": mc3_result.get("persistedBestWave"),
                        "medal": mc3_result.get("medalTitle"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-4"):
            # MC-4 Verification: Scatter & Rainbow Weapons + Tactical Airdrop + 3 Buffs + Bonus Heist Skip
            mc4_hud = page.evaluate(
                """async () => {
                const btn = document.getElementById('btn-weapon-mode');
                const label = document.getElementById('weapon-mode-label');
                if (!btn || !label) return { ok: false, reason: 'missing weapon switcher' };
                const labels = [label.textContent.trim()];
                btn.click();
                labels.push(label.textContent.trim());
                const scatterImg = btn.querySelector('img');
                const scatterLoaded = Boolean(scatterImg && scatterImg.src.includes('icon_weapon_scatter.png?v=33'));
                btn.click();
                labels.push(label.textContent.trim());
                const rainbowImg = btn.querySelector('img');
                const rainbowLoaded = Boolean(rainbowImg && rainbowImg.src.includes('icon_weapon_rainbow.png?v=33'));
                const hasInlineSvg = Boolean(btn.querySelector('svg'));
                // Cycle back to default gatling
                btn.click(); btn.click(); btn.click();
                // Probe all 3 MC-4 RGBA PNGs
                const urls = [
                    '/assets/icon_weapon_scatter.png?v=33',
                    '/assets/icon_weapon_rainbow.png?v=33',
                    '/assets/icon_tactical_airdrop.png?v=33',
                ];
                const imgChecks = await Promise.all(urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));
                const w = window.__mc3dWorld;
                const sim = w && typeof w.runMc4SelfCheck === 'function' ? w.runMc4SelfCheck() : { ok: false };
                return { labels, scatterLoaded, rainbowLoaded, hasInlineSvg, imgChecks, sim };
            }"""
            )
            mc4_sim = mc4_hud.get("sim") or {}
            add_check(
                "MC-4 Scatter & Rainbow Weapons (HUD Cycle, Zero SVG/Emoji, RGBA PNGs, Bounce & Pierce)",
                bool(mc4_hud.get("scatterLoaded"))
                and bool(mc4_hud.get("rainbowLoaded"))
                and not bool(mc4_hud.get("hasInlineSvg"))
                and all(mc4_hud.get("imgChecks", [False]))
                and bool(mc4_sim.get("scatterFanCount", 0) >= 3)
                and bool(mc4_sim.get("scatterBounced"))
                and bool(mc4_sim.get("rainbowBeamHitRed")),
                json.dumps(
                    {
                        "labels": mc4_hud.get("labels"),
                        "imgs": mc4_hud.get("imgChecks"),
                        "fan": mc4_sim.get("scatterFanCount"),
                        "bounced": mc4_sim.get("scatterBounced"),
                        "rainbowHit": mc4_sim.get("rainbowBeamHitRed"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-4 Tactical Airdrop Crate (Drop, Collect, 3x 8s Frenzy Buffs, Clean Reset & Bonus Heist Skip)",
                bool(mc4_sim.get("airdropSpawned"))
                and bool(mc4_sim.get("airdropCollected"))
                and bool(mc4_sim.get("dualVolleyActiveAndDoubles"))
                and bool(mc4_sim.get("freezeRedsSlowed"))
                and bool(mc4_sim.get("frontlineGiantsPromoted"))
                and bool(mc4_sim.get("cleanResetOnLoad"))
                and bool(mc4_sim.get("bonusHeistSkippedAirdrop")),
                json.dumps(
                    {
                        "drop": mc4_sim.get("airdropSpawned"),
                        "collect": mc4_sim.get("airdropCollected"),
                        "dual": mc4_sim.get("dualVolleyActiveAndDoubles"),
                        "freeze": mc4_sim.get("freezeRedsSlowed"),
                        "giants": mc4_sim.get("frontlineGiantsPromoted"),
                        "reset": mc4_sim.get("cleanResetOnLoad"),
                        "skipBonus": mc4_sim.get("bonusHeistSkippedAirdrop"),
                    },
                    ensure_ascii=False,
                ),
            )

            page.screenshot(
                path=os.path.join(SHOT_DIR, "verify_auto_playtest_battle_2560.jpg"),
                type="jpeg",
                quality=90,
            )

        if want("MC-5"):
            # MC-5 Verification: Steam Armored Payload Escort Mode + Bobo Squad Paint & Material Workshop
            mc5_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc5SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc5SelfCheck' };
                }
                const sim = w.runMc5SelfCheck();

                // Verify 6x MC-5 256x256 RGBA PNG icons load cleanly & have transparent corner alpha (a === 0)
                const mc5Urls = [
                    '/assets/icons/ui_escort_cart.png?v=33',
                    '/assets/icons/ui_barricade.png?v=33',
                    '/assets/icons/finish_candy_gloss.png?v=33',
                    '/assets/icons/finish_brass_steam.png?v=33',
                    '/assets/icons/finish_crystal_jelly.png?v=33',
                    '/assets/icons/finish_starlight_prism.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc5Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 4; cv.height = 4;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const px = ctx2d.getImageData(0, 0, 1, 1).data;
                        resolve(px[3] === 0);
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                // Open Lobby -> Squad Paint Workshop Tab -> Unlock & Equip Finishes via real UI
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                const hasEscortLobbyBtn = Boolean(document.getElementById('btn-start-escort'));
                const desktopLobbyOverflow = document.documentElement.scrollWidth - window.innerWidth;

                document.querySelector('.menu-tab[data-tab="skins"]')?.click();
                const finishCards = Array.from(document.querySelectorAll('#squad-finish-grid .finish-card'));
                const beforeSnap = w.getAppliedLiverySnapshot();
                // Click Starlight Prism (unlocked via escort milestone from sim!) or Brass Steam
                const prismBtn = document.querySelector('#squad-finish-grid .finish-card[data-finish-id="starlight_prism"] .finish-action-btn');
                const brassBtn = document.querySelector('#squad-finish-grid .finish-card[data-finish-id="brass_steam"] .finish-action-btn');
                if (brassBtn && !brassBtn.disabled) brassBtn.click();
                if (prismBtn && !prismBtn.disabled) prismBtn.click();
                const afterSnap = w.getAppliedLiverySnapshot();
                const activePillText = document.getElementById('squad-livery-active-pill')?.textContent?.trim() || '';
                const skinCards = Array.from(document.querySelectorAll('#skins-shop-grid .skin-card'));
                const firstSkinCardH = Math.round(skinCards[0]?.getBoundingClientRect().height || 0);
                const desktopWorkshopOverflow = document.documentElement.scrollWidth - window.innerWidth;
                const workshopHasSvg = Boolean(document.getElementById('menu-panel-skins')?.querySelector('svg'));

                return {
                    sim,
                    rgbaChecks,
                    hasEscortLobbyBtn,
                    finishCardCount: finishCards.length,
                    skinCardCount: skinCards.length,
                    firstSkinCardH,
                    beforeFinish: beforeSnap.finishId,
                    afterFinish: afterSnap.finishId,
                    activePillText,
                    workshopHasSvg,
                    desktopLobbyOverflow,
                    desktopWorkshopOverflow,
                };
            }"""
            )
            page.wait_for_timeout(120)
            page.screenshot(
                path=os.path.join(SHOT_DIR, "verify_mc5_workshop_2560.jpg"),
                type="jpeg",
                quality=90,
            )

            # Launch Live Escort Battle via Lobby #btn-start-escort & inspect live HUD + 0px overflow
            escort_live = page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-escort')?.click();
                const w = window.__mc3dWorld;
                if (w && w.payloadCart) {
                    for (let k = 0; k < 6; k++) {
                        w.spawnUnit('blue', 'normal', (k - 2.5) * 0.5, w.payloadCart.z + 0.4, 0, -3.2);
                    }
                    for (let s = 0; s < 8; s++) w.update(0.05);
                }
                const stageTxt = document.getElementById('stage-badge')?.textContent?.trim() || '';
                const buffsTxt = document.getElementById('active-buffs-bar')?.textContent?.trim() || '';
                const escortOverflow = document.documentElement.scrollWidth - window.innerWidth;
                const hudHasSvg = Boolean(document.querySelector('.hud-top svg, #world-labels svg'));
                return { stageTxt, buffsTxt, escortOverflow, hudHasSvg };
            }"""
            )
            page.wait_for_timeout(100)
            page.screenshot(
                path=os.path.join(SHOT_DIR, "verify_mc5_escort_2560.jpg"),
                type="jpeg",
                quality=90,
            )

            mc5_sim = mc5_check.get("sim") or {}
            add_check(
                "MC-5 Steam Armored Payload Escort Mode (Lobby Entry, Charging, Overdrive, Barricade Ramming & Stronghold Persistence)",
                bool(mc5_check.get("hasEscortLobbyBtn"))
                and bool(mc5_sim.get("barricadeCount") == 4)
                and bool(mc5_sim.get("cartChargedAndMoved"))
                and bool(mc5_sim.get("overdriveReached"))
                and bool(mc5_sim.get("ramCount", 0) >= 1)
                and bool(mc5_sim.get("barricadeDemolished"))
                and bool(mc5_sim.get("escortCompleted"))
                and bool(mc5_sim.get("persistedBestPct") == 100)
                and bool(mc5_sim.get("persistedClears", 0) >= 1)
                and "护送" in escort_live.get("buffsTxt", "")
                and not bool(escort_live.get("hudHasSvg")),
                json.dumps(
                    {
                        "lobbyBtn": mc5_check.get("hasEscortLobbyBtn"),
                        "bars": mc5_sim.get("barricadeCount"),
                        "moved": mc5_sim.get("cartChargedAndMoved"),
                        "overdrive": mc5_sim.get("overdriveReached"),
                        "rams": mc5_sim.get("ramCount"),
                        "broken": mc5_sim.get("barricadeDemolished"),
                        "clear": mc5_sim.get("escortCompleted"),
                        "bestPct": mc5_sim.get("persistedBestPct"),
                        "hud": escort_live.get("stageTxt"),
                    },
                    ensure_ascii=False,
                ),
            )

            add_check(
                "MC-5 Bobo Squad Paint & Material Workshop (4 Finishes + 6 Colorways, Live 3D Materials & 6x 256px RGBA PNGs)",
                mc5_check.get("finishCardCount") == 4
                and mc5_check.get("skinCardCount") == 6
                and int(mc5_check.get("firstSkinCardH", 0)) >= 160
                and all(mc5_check.get("rgbaChecks", [False]))
                and not bool(mc5_check.get("workshopHasSvg"))
                and mc5_check.get("beforeFinish") != mc5_check.get("afterFinish")
                and bool(mc5_sim.get("cannonHexChanged"))
                and bool(mc5_sim.get("cartHexChanged"))
                and set([0, 1, 2, 3]).issubset(set(mc5_sim.get("finishModesApplied", []))),
                json.dumps(
                    {
                        "finishCards": mc5_check.get("finishCardCount"),
                        "skinCards": mc5_check.get("skinCardCount"),
                        "skinCardH": mc5_check.get("firstSkinCardH"),
                        "rgba": mc5_check.get("rgbaChecks"),
                        "switch": f"{mc5_check.get('beforeFinish')}->{mc5_check.get('afterFinish')}",
                        "modes": mc5_sim.get("finishModesApplied"),
                        "cannonChanged": mc5_sim.get("cannonHexChanged"),
                        "cartChanged": mc5_sim.get("cartHexChanged"),
                    },
                    ensure_ascii=False,
                ),
            )

            max_desk_overflow = max(
                max_desk_overflow,
                int(mc5_check.get("desktopLobbyOverflow", 0)),
                int(mc5_check.get("desktopWorkshopOverflow", 0)),
                int(escort_live.get("escortOverflow", 0)),
            )

        if want("MC-6"):
            # MC-6 Verification: Twin-Cannon Steam Mecha Overlord + Dynamic Weather & Bridge Hazard/Buff Zones
            mc6_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc6SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc6SelfCheck' };
                }
                const sim = w.runMc6SelfCheck();

                // Verify 5x MC-6 256x256 true-alpha RGBA PNG icons (?v=33) load cleanly with transparent corners (a === 0)
                const mc6Urls = [
                    '/assets/icons/ui_mecha_overlord.png?v=33',
                    '/assets/icons/meta_mecha_core.png?v=33',
                    '/assets/icons/env_tailwind_belt.png?v=33',
                    '/assets/icons/env_emp_zone.png?v=33',
                    '/assets/icons/env_frosting_pad.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc6Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 4; cv.height = 4;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const px = ctx2d.getImageData(0, 0, 1, 1).data;
                        resolve(px[3] === 0);
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                // Open Lobby -> Tab 3 Workshop (#menu-panel-meta) -> Verify Mecha Hangar Workbench & Upgrade Click
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                const hangarMods = document.querySelectorAll('#mecha-hangar-grid .mecha-mod-card').length;
                const metaHasSvg = Boolean(document.getElementById('menu-panel-meta')?.querySelector('svg'));
                const coreBtn = document.getElementById('btn-upg-mecha-core');
                if (coreBtn && !coreBtn.disabled) coreBtn.click();
                const cannonBtn = document.getElementById('btn-upg-mecha-cannon');
                if (cannonBtn && !cannonBtn.disabled) cannonBtn.click();
                const msBtn = document.getElementById('btn-claim-mecha-milestone');
                if (msBtn && !msBtn.disabled) msBtn.click();
                const hangarMkTxt = document.getElementById('mecha-hangar-mk-pill')?.textContent?.trim() || '';
                const savedAfter = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const metaOverflow = document.documentElement.scrollWidth - window.innerWidth;

                // Launch Battle -> Charge & Click #btn-mecha-overlord in live HUD -> Verify Mecha + Weather Badge
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-battle')?.click();
                w.state.mechaOverlordCharge = 100;
                for (let k = 0; k < 4; k++) {
                    w.spawnUnit('blue', 'normal', (k - 1.5) * 0.5, 15.6, 0, -3.0);
                }
                w.update(0.05);
                const overlordBtn = document.getElementById('btn-mecha-overlord');
                const hasOverlordHudBtn = Boolean(overlordBtn);
                overlordBtn?.removeAttribute('disabled');
                overlordBtn?.click();
                for (let s = 0; s < 6; s++) w.update(0.05);
                const liveMechaActive = Boolean(w.mechaOverlord && w.mechaOverlord.active);
                const buffsTxt = document.getElementById('active-buffs-bar')?.textContent?.trim() || '';
                const plaqueSubTxt = document.getElementById('stage-plaque-sub')?.textContent?.trim() || '';
                const tacticalHasSvg = Boolean(document.querySelector('.tactical-row svg'));
                const battleOverflow = document.documentElement.scrollWidth - window.innerWidth;

                return {
                    sim,
                    rgbaChecks,
                    hangarMods,
                    metaHasSvg,
                    hangarMkTxt,
                    persistedCoreLvl: savedAfter.mechaCoreLevel || 0,
                    persistedCannonLvl: savedAfter.mechaCannonLevel || 0,
                    persistedSummons: savedAfter.totalMechaSummons || 0,
                    hasOverlordHudBtn,
                    liveMechaActive,
                    buffsTxt,
                    plaqueSubTxt,
                    tacticalHasSvg,
                    metaOverflow,
                    battleOverflow,
                };
            }"""
            )

            mc6_sim = mc6_check.get("sim") or {}
            add_check(
                "MC-6 5x 256px True-Alpha RGBA Icons (?v=33) & Zero Inline SVG in Hangar/HUD",
                all(mc6_check.get("rgbaChecks", [False]))
                and len(mc6_check.get("rgbaChecks", [])) == 5
                and not bool(mc6_check.get("metaHasSvg"))
                and not bool(mc6_check.get("tacticalHasSvg")),
                json.dumps(
                    {
                        "rgba5": mc6_check.get("rgbaChecks"),
                        "metaSvg": mc6_check.get("metaHasSvg"),
                        "hudSvg": mc6_check.get("tacticalHasSvg"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-6 Twin-Cannon Steam Mecha Overlord (HUD Summon, Squad Fusion, Twin Volleys & Red/Barricade/Shield Smash)",
                bool(mc6_check.get("hasOverlordHudBtn"))
                and bool(mc6_check.get("liveMechaActive"))
                and bool(mc6_sim.get("mechaSummoned"))
                and int(mc6_sim.get("fusedSquadCount", 0)) >= 1
                and bool(mc6_sim.get("mechaMarchedForward"))
                and int(mc6_sim.get("volleysFired", 0)) >= 1
                and bool(mc6_sim.get("redUnitsSmashed"))
                and bool(mc6_sim.get("barricadeSmashed"))
                and bool(mc6_sim.get("shieldStripped")),
                json.dumps(
                    {
                        "hudBtn": mc6_check.get("hasOverlordHudBtn"),
                        "liveActive": mc6_check.get("liveMechaActive"),
                        "fused": mc6_sim.get("fusedSquadCount"),
                        "marched": mc6_sim.get("mechaMarchedForward"),
                        "volleys": mc6_sim.get("volleysFired"),
                        "redSmash": mc6_sim.get("redUnitsSmashed"),
                        "barSmash": mc6_sim.get("barricadeSmashed"),
                        "shieldBreak": mc6_sim.get("shieldStripped"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-6 Workshop Mecha Hangar Upgrades & Summon Milestone Persistence",
                int(mc6_check.get("hangarMods", 0)) == 3
                and bool(mc6_sim.get("hangarUpgradedAndPersisted"))
                and bool(mc6_sim.get("milestoneClaimed"))
                and int(mc6_check.get("persistedCoreLvl", 0)) >= 1
                and int(mc6_check.get("persistedCannonLvl", 0)) >= 1
                and int(mc6_check.get("persistedSummons", 0)) >= 1,
                json.dumps(
                    {
                        "mods": mc6_check.get("hangarMods"),
                        "mk": mc6_check.get("hangarMkTxt"),
                        "coreLv": mc6_check.get("persistedCoreLvl"),
                        "cannonLv": mc6_check.get("persistedCannonLvl"),
                        "summons": mc6_check.get("persistedSummons"),
                        "milestone": mc6_sim.get("milestoneClaimed"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-6 Dynamic Weather Affixes & Bridge Zones (Tailwind Belt, Telegraphed EMP, Frosting Bounce Pad & Bonus/Escort Compat)",
                len(mc6_sim.get("weatherAffixesSeen", [])) == 3
                and bool(mc6_sim.get("tailwindAccelerated"))
                and bool(mc6_sim.get("empTelegraphedAndPulsed"))
                and bool(mc6_sim.get("frostingVaultedBarricadeAndBuffed"))
                and bool(mc6_sim.get("bonusVaultCompatible"))
                and bool(mc6_sim.get("escortCompatible"))
                and "天气" in mc6_check.get("plaqueSubTxt", ""),
                json.dumps(
                    {
                        "weathers": mc6_sim.get("weatherAffixesSeen"),
                        "tailwind": mc6_sim.get("tailwindAccelerated"),
                        "emp": mc6_sim.get("empTelegraphedAndPulsed"),
                        "frostingVault": mc6_sim.get("frostingVaultedBarricadeAndBuffed"),
                        "bonusCompat": mc6_sim.get("bonusVaultCompatible"),
                        "escortCompat": mc6_sim.get("escortCompatible"),
                        "plaque": mc6_check.get("plaqueSubTxt"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-7"):
            # MC-7 Verification: Neon Gear Summit Tournament (3-Match Ladder + Streak Chest + Trophies) & Tactical Sub-Weapons
            mc7_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc7SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc7SelfCheck' };
                }
                const sim = w.runMc7SelfCheck();

                // Verify 5x MC-7 256x256 true-alpha RGBA PNG icons (?v=33) load cleanly with transparent corners (a === 0)
                const mc7Urls = [
                    '/assets/icons/ui_gear_tournament.png?v=33',
                    '/assets/icons/ui_tournament_chest.png?v=33',
                    '/assets/icons/subwpn_electro_net.png?v=33',
                    '/assets/icons/subwpn_syrup_bubble.png?v=33',
                    '/assets/icons/subwpn_rally_horn.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc7Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 4; cv.height = 4;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const px = ctx2d.getImageData(0, 0, 1, 1).data;
                        resolve(px[3] === 0);
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                // Open Lobby -> Verify #btn-start-tournament, #tournament-progress-badge, #lobby-tournament-chest-bar
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const hasTrnBtn = Boolean(document.getElementById('btn-start-tournament'));
                const trnProgressTxt = document.getElementById('tournament-progress-text')?.textContent?.trim() || '';
                const hasLobbyChestBar = Boolean(document.getElementById('lobby-tournament-chest-bar'));

                // Open Workshop (#menu-panel-meta) -> Verify #tactical-subweapon-workbench (3 cards, equip + upgrade)
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                const workbench = document.getElementById('tactical-subweapon-workbench');
                if (w.state.gold < 80000) {
                    w.state.gold = 80000;
                    document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                    document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                }
                const subCards = Array.from(document.querySelectorAll('#tactical-subweapon-grid .subweapon-mod-card'));
                const syrupUpgBtn = document.querySelector('#tactical-subweapon-grid [data-subwpn-upgrade="syrup_bubble"]');
                if (syrupUpgBtn && !syrupUpgBtn.disabled) syrupUpgBtn.click();
                const syrupEquipBtn = document.querySelector('#tactical-subweapon-grid [data-subwpn-equip="syrup_bubble"]');
                if (syrupEquipBtn && !syrupEquipBtn.disabled) syrupEquipBtn.click();
                const activePill = document.getElementById('subweapon-equipped-pill')?.textContent?.trim() || '';
                const equippedAfterClick = w.state.equippedSubWeapon;
                const syrupLvlAfterClick = w.state.getSubWeaponLevel('syrup_bubble');
                const metaOv = document.documentElement.scrollWidth - window.innerWidth;

                // Launch Gear Summit Tournament via #btn-start-tournament -> Test #btn-tactical-subweapon & KeyV
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-tournament')?.click();
                const inTournament = Boolean(w.currentLevel && w.currentLevel.isGearTournament);
                const hudStageTxt = document.getElementById('stage-badge')?.textContent?.trim() || '';
                const subHudBtn = document.getElementById('btn-tactical-subweapon');
                const hasSubHudBtn = Boolean(subHudBtn);
                const castsBefore = w.state.totalSubWeaponCasts;
                w.state.subWeaponCharge = 100;
                w.update(0.05);
                subHudBtn?.removeAttribute('disabled');
                subHudBtn?.click();
                for (let s = 0; s < 4; s++) w.update(0.05);
                const castsAfterClick = w.state.totalSubWeaponCasts;
                w.state.subWeaponCharge = 100;
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV', bubbles: true }));
                for (let s = 0; s < 4; s++) w.update(0.05);
                const castsAfterKeyV = w.state.totalSubWeaponCasts;

                // Check zero SVG & zero raw Emoji across MC-7 elements + 5-button bottom tactical bar fit
                const totalSvgCount = document.querySelectorAll('svg').length;
                const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
                const mc7TextSample = [
                    document.getElementById('btn-start-tournament')?.textContent || '',
                    document.getElementById('lobby-tournament-chest-bar')?.textContent || '',
                    workbench?.textContent || '',
                    subHudBtn?.textContent || '',
                    document.getElementById('tournament-chest-section')?.textContent || '',
                ].join(' ');
                const hasRawEmoji = emojiRe.test(mc7TextSample);
                const bottomBtns = [
                    document.getElementById('btn-weapon-mode'),
                    ...Array.from(document.querySelectorAll('.special-skills .skill-btn')),
                ].filter(Boolean);
                const skillBtnsFit = bottomBtns.length === 5 && bottomBtns.every((b) => {
                    const r = b.getBoundingClientRect();
                    return r.width >= 44 && r.left >= 0 && r.right <= window.innerWidth && b.scrollWidth <= b.clientWidth + 2;
                });
                const battleOv = document.documentElement.scrollWidth - window.innerWidth;

                return {
                    sim,
                    rgbaChecks,
                    hasTrnBtn,
                    trnProgressTxt,
                    hasLobbyChestBar,
                    hasWorkbench: Boolean(workbench),
                    subCardCount: subCards.length,
                    activePill,
                    equippedAfterClick,
                    syrupLvlAfterClick,
                    inTournament,
                    hudStageTxt,
                    hasSubHudBtn,
                    castsBefore,
                    castsAfterClick,
                    castsAfterKeyV,
                    totalSvgCount,
                    hasRawEmoji,
                    skillBtnsFit,
                    metaOv,
                    battleOv,
                };
            }"""
            )

            mc7_sim = mc7_check.get("sim") or {}
            add_check(
                "MC-7 5x 256px True-Alpha RGBA Icons (?v=33), Zero Inline SVG & Zero Raw Emoji",
                all(mc7_check.get("rgbaChecks", [False]))
                and len(mc7_check.get("rgbaChecks", [])) == 5
                and int(mc7_check.get("totalSvgCount", 1)) == 0
                and not bool(mc7_check.get("hasRawEmoji")),
                json.dumps(
                    {
                        "rgba5": mc7_check.get("rgbaChecks"),
                        "svgCount": mc7_check.get("totalSvgCount"),
                        "rawEmoji": mc7_check.get("hasRawEmoji"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-7 Gear Summit Tournament (3-Stage Escalating Ladder, 1.5x/2.2x/3.5x Streak Chests & Trophy Global Boosts)",
                bool(mc7_check.get("hasTrnBtn"))
                and bool(mc7_check.get("hasLobbyChestBar"))
                and bool(mc7_check.get("inTournament"))
                and bool(mc7_sim.get("ladderStagesDistinct"))
                and mc7_sim.get("streakMultipliers") == [1.5, 2.2, 3.5]
                and bool(mc7_sim.get("chestClaimedAll3"))
                and bool(mc7_sim.get("trophiesPersisted"))
                and bool(mc7_sim.get("globalFireRateBoosted"))
                and bool(mc7_sim.get("globalPowerBoosted")),
                json.dumps(
                    {
                        "lobbyBtn": mc7_check.get("hasTrnBtn"),
                        "progress": mc7_check.get("trnProgressTxt"),
                        "inTrn": mc7_check.get("inTournament"),
                        "hudStage": mc7_check.get("hudStageTxt"),
                        "distinct": mc7_sim.get("ladderStagesDistinct"),
                        "mults": mc7_sim.get("streakMultipliers"),
                        "all3Chests": mc7_sim.get("chestClaimedAll3"),
                        "persisted": mc7_sim.get("trophiesPersisted"),
                        "frBoost": mc7_sim.get("globalFireRateBoosted"),
                        "pwrBoost": mc7_sim.get("globalPowerBoosted"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-7 Leader Tactical Sub-Weapon Slot (Workbench Lv.1-5, Electro Net, Syrup Bubble, Rally Horn & HUD [V])",
                bool(mc7_check.get("hasWorkbench"))
                and int(mc7_check.get("subCardCount", 0)) == 3
                and mc7_check.get("equippedAfterClick") == "syrup_bubble"
                and int(mc7_check.get("syrupLvlAfterClick", 0)) >= 2
                and bool(mc7_check.get("hasSubHudBtn"))
                and int(mc7_check.get("castsAfterClick", 0)) > int(mc7_check.get("castsBefore", 0))
                and int(mc7_check.get("castsAfterKeyV", 0)) > int(mc7_check.get("castsAfterClick", 0))
                and bool(mc7_check.get("skillBtnsFit"))
                and bool(mc7_sim.get("workbenchUpgradedLv5"))
                and bool(mc7_sim.get("electroNetStunnedAndStrippedShield"))
                and bool(mc7_sim.get("syrupBubbleSlowedAndAmplifiedDamage"))
                and bool(mc7_sim.get("rallyHornBoostedMoveAndAttack")),
                json.dumps(
                    {
                        "cards": mc7_check.get("subCardCount"),
                        "equip": mc7_check.get("equippedAfterClick"),
                        "syrupLv": mc7_check.get("syrupLvlAfterClick"),
                        "casts": [
                            mc7_check.get("castsBefore"),
                            mc7_check.get("castsAfterClick"),
                            mc7_check.get("castsAfterKeyV"),
                        ],
                        "hudFit": mc7_check.get("skillBtnsFit"),
                        "lv5": mc7_sim.get("workbenchUpgradedLv5"),
                        "electro": mc7_sim.get("electroNetStunnedAndStrippedShield"),
                        "syrup": mc7_sim.get("syrupBubbleSlowedAndAmplifiedDamage"),
                        "rally": mc7_sim.get("rallyHornBoostedMoveAndAttack"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-8"):
            # MC-8 Verification: Giant Clockwork Toy Colossus Boss Raid & Bobo 3-Branch Specialization Tech Tree
            mc8_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc8SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc8SelfCheck' };
                }
                const sim = w.runMc8SelfCheck();

                // Verify 5x MC-8 256x256 true-alpha RGBA PNG icons (?v=33) load cleanly with transparent corners (a === 0)
                const mc8Urls = [
                    '/assets/icons/ui_clockwork_colossus.png?v=33',
                    '/assets/icons/ui_clockwork_core.png?v=33',
                    '/assets/icons/tech_vanguard_charge.png?v=33',
                    '/assets/icons/tech_heavy_siege.png?v=33',
                    '/assets/icons/tech_candy_bombard.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc8Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 4; cv.height = 4;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const px = ctx2d.getImageData(0, 0, 1, 1).data;
                        resolve(px[3] === 0);
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                // Open Lobby -> Verify #btn-start-colossus-raid
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const raidBtn = document.getElementById('btn-start-colossus-raid');
                const hasRaidBtn = Boolean(raidBtn);
                const raidBtnSubTxt = document.getElementById('colossus-raid-sub-text')?.textContent?.trim() || '';

                // Open Workshop (#menu-panel-meta) -> Verify #bobo-tech-tree-workbench (3 branches, Core + Gold upgrades, Doctrine select)
                w.state.gold = Math.max(w.state.gold, 90000);
                w.state.clockworkCores = Math.max(w.state.clockworkCores, 12);
                w.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
                w.state.activeBoboTechDoctrine = 'vanguard_charge';
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                const techWorkbench = document.getElementById('bobo-tech-tree-workbench');
                const techCards = Array.from(document.querySelectorAll('#bobo-tech-tree-grid .bobo-tech-card'));
                const goldUpgBtn = document.querySelector('#bobo-tech-tree-grid [data-tech-upgrade-gold="vanguard_charge"]');
                if (goldUpgBtn && !goldUpgBtn.disabled) goldUpgBtn.click();
                const coreUpgBtn = document.querySelector('#bobo-tech-tree-grid [data-tech-upgrade-core="heavy_siege"]');
                if (coreUpgBtn && !coreUpgBtn.disabled) coreUpgBtn.click();
                const candyDocBtn = document.querySelector('#bobo-tech-tree-grid [data-tech-doctrine="candy_bombard"]');
                if (candyDocBtn && !candyDocBtn.disabled) candyDocBtn.click();
                const techActivePillTxt = document.getElementById('bobo-tech-active-pill')?.textContent?.trim() || '';
                const vanguardLvAfter = w.state.getBoboTechLevel('vanguard_charge');
                const siegeLvAfter = w.state.getBoboTechLevel('heavy_siege');
                const doctrineAfter = w.state.activeBoboTechDoctrine;
                const metaOv = document.documentElement.scrollWidth - window.innerWidth;

                // Launch Colossus Raid via #btn-start-colossus-raid -> Break Left Shield -> Verify Paralysis 2.5x HUD
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-colossus-raid')?.click();
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                const inColossusRaid = Boolean(w.currentLevel && w.currentLevel.isColossusRaid && w.colossusBoss && w.colossusBoss.active);
                const raidHud = document.getElementById('colossus-raid-hud');
                const raidHudVisible = Boolean(raidHud && !raidHud.classList.contains('hidden'));
                w.damageColossusWeakpoint('left', 99999, true);
                w.update(0.08);
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                const hudCoreEl = document.getElementById('colossus-hud-core');
                const hudParalyzedClass = Boolean(hudCoreEl && hudCoreEl.classList.contains('is-paralyzed'));
                const hudCoreTxt = document.getElementById('colossus-hud-core-text')?.textContent?.trim() || '';
                const hudLeftBrokenClass = Boolean(document.getElementById('colossus-hud-left')?.classList.contains('is-broken'));
                const buffsBarTxt = document.getElementById('active-buffs-bar')?.textContent?.trim() || '';

                const totalSvgCount = document.querySelectorAll('svg').length;
                const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
                const mc8TextSample = [
                    raidBtn?.textContent || '',
                    techWorkbench?.textContent || '',
                    raidHud?.textContent || '',
                    buffsBarTxt,
                ].join(' ');
                const hasRawEmoji = emojiRe.test(mc8TextSample);
                const battleOv = document.documentElement.scrollWidth - window.innerWidth;

                return {
                    sim,
                    rgbaChecks,
                    hasRaidBtn,
                    raidBtnSubTxt,
                    hasTechWorkbench: Boolean(techWorkbench),
                    techCardCount: techCards.length,
                    techActivePillTxt,
                    vanguardLvAfter,
                    siegeLvAfter,
                    doctrineAfter,
                    inColossusRaid,
                    raidHudVisible,
                    hudParalyzedClass,
                    hudCoreTxt,
                    hudLeftBrokenClass,
                    buffsBarTxt,
                    totalSvgCount,
                    hasRawEmoji,
                    metaOv,
                    battleOv,
                };
            }"""
            )

            mc8_sim = mc8_check.get("sim") or {}
            add_check(
                "MC-8 5x 256px True-Alpha RGBA Icons (?v=33), Zero Inline SVG & Zero Raw Emoji",
                all(mc8_check.get("rgbaChecks", [False]))
                and len(mc8_check.get("rgbaChecks", [])) == 5
                and int(mc8_check.get("totalSvgCount", 1)) == 0
                and not bool(mc8_check.get("hasRawEmoji")),
                json.dumps(
                    {
                        "rgba5": mc8_check.get("rgbaChecks"),
                        "svgCount": mc8_check.get("totalSvgCount"),
                        "rawEmoji": mc8_check.get("hasRawEmoji"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-8 Giant Clockwork Toy Colossus Boss Raid (Lobby Entry, Left Shield & Right Cannon Weakpoints, 6s 2.5x Paralysis & Core Rewards)",
                bool(mc8_check.get("hasRaidBtn"))
                and bool(mc8_check.get("inColossusRaid"))
                and bool(mc8_check.get("raidHudVisible"))
                and bool(mc8_check.get("hudParalyzedClass"))
                and bool(mc8_check.get("hudLeftBrokenClass"))
                and ("2.5x" in str(mc8_check.get("hudCoreTxt", "")))
                and bool(mc8_sim.get("colossusSpawnedWithTwoWeakpoints"))
                and bool(mc8_sim.get("weakpointBreakTriggeredParalysis"))
                and bool(mc8_sim.get("paralysisCoreCritAmplified"))
                and bool(mc8_sim.get("rightCannonStoppedWhenBroken"))
                and bool(mc8_sim.get("raidVictoryAwardedCoresAndPersisted")),
                json.dumps(
                    {
                        "lobbyBtn": mc8_check.get("hasRaidBtn"),
                        "inRaid": mc8_check.get("inColossusRaid"),
                        "hudVisible": mc8_check.get("raidHudVisible"),
                        "paralyzed": mc8_check.get("hudParalyzedClass"),
                        "coreHud": mc8_check.get("hudCoreTxt"),
                        "twoArms": mc8_sim.get("colossusSpawnedWithTwoWeakpoints"),
                        "crit25x": mc8_sim.get("paralysisCoreCritAmplified"),
                        "cannonStop": mc8_sim.get("rightCannonStoppedWhenBroken"),
                        "coresReward": mc8_sim.get("raidVictoryAwardedCoresAndPersisted"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-8 Bobo 3-Branch Specialization Tech Tree (Workshop Lv.0-5 Core/Gold Upgrades, Active Doctrine & 3D Squad Flair)",
                bool(mc8_check.get("hasTechWorkbench"))
                and int(mc8_check.get("techCardCount", 0)) == 3
                and int(mc8_check.get("vanguardLvAfter", 0)) >= 1
                and int(mc8_check.get("siegeLvAfter", 0)) >= 1
                and mc8_check.get("doctrineAfter") == "candy_bombard"
                and ("爆裂糖弹营" in str(mc8_check.get("techActivePillTxt", "")))
                and bool(mc8_sim.get("techTreeUpgradedByGoldAndCores"))
                and bool(mc8_sim.get("vanguardBoostedGateSurgeSpeed"))
                and bool(mc8_sim.get("heavySiegeBoostedHpAndWeakpointBreak"))
                and bool(mc8_sim.get("candyBombardSplashedAndBoostedFireRate"))
                and bool(mc8_sim.get("doctrineFlairSwitchedIn3D")),
                json.dumps(
                    {
                        "cards": mc8_check.get("techCardCount"),
                        "vanguardLv": mc8_check.get("vanguardLvAfter"),
                        "siegeLv": mc8_check.get("siegeLvAfter"),
                        "doctrine": mc8_check.get("doctrineAfter"),
                        "pill": mc8_check.get("techActivePillTxt"),
                        "vanguardSim": mc8_sim.get("vanguardBoostedGateSurgeSpeed"),
                        "siegeSim": mc8_sim.get("heavySiegeBoostedHpAndWeakpointBreak"),
                        "candySim": mc8_sim.get("candyBombardSplashedAndBoostedFireRate"),
                        "flair3D": mc8_sim.get("doctrineFlairSwitchedIn3D"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-9"):
            # MC-9 Verification: Cloud Airship Mothership Escort & Steam Cannon Core Module Workbench
            mc9_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc9SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc9SelfCheck' };
                }
                const sim = w.runMc9SelfCheck();

                // Verify 5x MC-9 256x256 true-alpha RGBA PNG icons (?v=33) load cleanly with transparent corners (a === 0)
                const mc9Urls = [
                    '/assets/icons/ui_airship_escort.png?v=33',
                    '/assets/icons/ui_airship_wing_medal.png?v=33',
                    '/assets/icons/mod_overdrive_breech.png?v=33',
                    '/assets/icons/mod_prism_splitter.png?v=33',
                    '/assets/icons/mod_heavy_mortar.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc9Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 4; cv.height = 4;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const px = ctx2d.getImageData(0, 0, 1, 1).data;
                        resolve(px[3] === 0);
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                // Open Lobby -> Verify #btn-start-airship-escort & live medal counter
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const escortBtn = document.getElementById('btn-start-airship-escort');
                const hasEscortBtn = Boolean(escortBtn);
                const escortBtnImg = escortBtn?.querySelector('img');
                const escortBtnImgOk = Boolean(escortBtnImg && escortBtnImg.complete && escortBtnImg.naturalWidth > 0);
                const escortMedalTxt = document.getElementById('airship-escort-medal-text')?.textContent?.trim() || '';

                // Open Workshop (#menu-panel-meta) -> Verify #cannon-mod-workbench (unlock/upgrade/equip all 3 modules)
                w.state.gold = Math.max(w.state.gold, 150000);
                w.state.airshipWingMedals = Math.max(w.state.airshipWingMedals, 40);
                w.state.cannonModLevels = { overdrive_breech: 1, prism_splitter: 0, heavy_mortar: 0 };
                w.state.activeCannonMod = 'overdrive_breech';
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                const modWorkbench = document.getElementById('cannon-mod-workbench');
                const modCards = Array.from(document.querySelectorAll('#cannon-mod-grid .cannon-mod-card'));

                // Upgrade overdrive_breech via medal, unlock & upgrade prism_splitter via medal+gold, unlock & upgrade heavy_mortar via gold+medal
                document.querySelector('#cannon-mod-grid [data-cannon-mod-medal="overdrive_breech"]')?.click();
                document.querySelector('#cannon-mod-grid [data-cannon-mod-medal="prism_splitter"]')?.click();
                document.querySelector('#cannon-mod-grid [data-cannon-mod-gold="prism_splitter"]')?.click();
                document.querySelector('#cannon-mod-grid [data-cannon-mod-gold="heavy_mortar"]')?.click();
                document.querySelector('#cannon-mod-grid [data-cannon-mod-medal="heavy_mortar"]')?.click();

                // Equip all 3 modules sequentially through real UI buttons & verify 3D barrel visual switch
                document.querySelector('#cannon-mod-grid [data-cannon-mod-equip="overdrive_breech"]')?.click();
                const eqOverdriveOk = w.state.activeCannonMod === 'overdrive_breech' && Boolean(w.cannonModOverdriveGroup?.visible);
                document.querySelector('#cannon-mod-grid [data-cannon-mod-equip="prism_splitter"]')?.click();
                const eqPrismOk = w.state.activeCannonMod === 'prism_splitter' && Boolean(w.cannonModPrismGroup?.visible);
                document.querySelector('#cannon-mod-grid [data-cannon-mod-equip="heavy_mortar"]')?.click();
                const eqMortarOk = w.state.activeCannonMod === 'heavy_mortar' && Boolean(w.cannonModHeavyMortarGroup?.visible);
                await new Promise((r) => setTimeout(r, 80));

                const modActivePillTxt = document.getElementById('cannon-mod-active-pill')?.textContent?.trim() || '';
                const modImgsOk = Array.from(document.querySelectorAll('#cannon-mod-workbench img')).every(
                    (im) => im.complete && im.naturalWidth > 0
                );
                const levelsAfter = { ...w.state.cannonModLevels };
                const metaOv = document.documentElement.scrollWidth - window.innerWidth;

                // Launch Airship Mothership Escort via #btn-start-airship-escort -> Neutralize AA turret -> Deploy Drop Pod -> Verify HUD & Victory Medal Settlement
                const medalsBeforeVictory = w.state.airshipWingMedals;
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-airship-escort')?.click();
                await new Promise((r) => setTimeout(r, 60));
                const inAirshipEscort = Boolean(
                    w.currentLevel &&
                    w.currentLevel.isAirshipEscort &&
                    w.airshipMothership &&
                    w.airshipMothership.active &&
                    Array.isArray(w.antiAirTurrets) &&
                    w.antiAirTurrets.length === 4
                );
                const airHud = document.getElementById('airship-escort-hud');
                const airHudVisible = Boolean(airHud && !airHud.classList.contains('hidden'));
                const modHudBadge = document.getElementById('cannon-mod-hud-badge');
                const modHudRect = modHudBadge?.getBoundingClientRect();
                const modHudBadgeOk = Boolean(
                    modHudBadge &&
                    modHudRect &&
                    modHudRect.width > 20 &&
                    modHudRect.height > 12 &&
                    modHudBadge.textContent?.includes('蓄能重炮管') &&
                    modHudBadge.querySelector('img')?.naturalWidth > 0
                );

                // Destroy first anti-air sub-turret -> triggers Super Bobo Drop Pod -> land pod & fire module-enhanced cannon shots
                if (w.antiAirTurrets && w.antiAirTurrets[0]) {
                    w.damageAntiAirTurret(w.antiAirTurrets[0], 99999, true);
                }
                for (let s = 0; s < 5; s++) {
                    w.fireTurret();
                }
                for (let step = 0; step < 12; step++) {
                    w.update(0.06);
                }
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                const dropPodsDeployedLive = w.airshipDropPodsDeployed || 0;
                const aaClearedLive = w.antiAirTurretsCleared || 0;
                const hudDropTxt = document.getElementById('airship-hud-drop-text')?.textContent?.trim() || '';
                const hudAaTxt = document.getElementById('airship-hud-aa-text')?.textContent?.trim() || '';
                const battleOv = document.documentElement.scrollWidth - window.innerWidth;

                // Settle Escort Victory via real stage victory callback (breaching enemy stronghold)
                if (w.onStageEnd) {
                    w.isPaused = true;
                    w.onStageEnd(true);
                }
                const medalsAfterVictory = w.state.airshipWingMedals;
                const savedAfterVictory = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');

                const totalSvgCount = document.querySelectorAll('svg').length;
                const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
                const mc9TextSample = [
                    escortBtn?.textContent || '',
                    modWorkbench?.textContent || '',
                    airHud?.textContent || '',
                    modHudBadge?.textContent || '',
                ].join(' ');
                const hasRawEmoji = emojiRe.test(mc9TextSample);

                return {
                    sim,
                    rgbaChecks,
                    hasEscortBtn,
                    escortBtnImgOk,
                    escortMedalTxt,
                    hasModWorkbench: Boolean(modWorkbench),
                    modCardCount: modCards.length,
                    modImgsOk,
                    levelsAfter,
                    eqAllThreeOk: eqOverdriveOk && eqPrismOk && eqMortarOk,
                    modActivePillTxt,
                    inAirshipEscort,
                    airHudVisible,
                    modHudBadgeOk,
                    dropPodsDeployedLive,
                    aaClearedLive,
                    hudDropTxt,
                    hudAaTxt,
                    medalsAwardedOnVictory: medalsAfterVictory > medalsBeforeVictory && savedAfterVictory.airshipWingMedals === medalsAfterVictory,
                    totalSvgCount,
                    hasRawEmoji,
                    metaOv,
                    battleOv,
                };
            }"""
            )

            mc9_sim = mc9_check.get("sim") or {}
            add_check(
                "MC-9 5x 256px True-Alpha RGBA Icons (?v=33), Zero Inline SVG & Zero Raw Emoji",
                all(mc9_check.get("rgbaChecks", [False]))
                and len(mc9_check.get("rgbaChecks", [])) == 5
                and bool(mc9_check.get("escortBtnImgOk"))
                and bool(mc9_check.get("modImgsOk"))
                and int(mc9_check.get("totalSvgCount", 1)) == 0
                and not bool(mc9_check.get("hasRawEmoji")),
                json.dumps(
                    {
                        "rgba5": mc9_check.get("rgbaChecks"),
                        "btnImg": mc9_check.get("escortBtnImgOk"),
                        "modImgs": mc9_check.get("modImgsOk"),
                        "svgCount": mc9_check.get("totalSvgCount"),
                        "rawEmoji": mc9_check.get("hasRawEmoji"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-9 Cloud Airship Mothership Escort (Lobby Entry, 3D Airship + 4 Anti-Air Flak Sub-Turrets, Super Bobo Drop Pods & Persistent Wing Medals)",
                bool(mc9_check.get("hasEscortBtn"))
                and ("飞艇护航徽章" in str(mc9_check.get("escortMedalTxt", "")))
                and bool(mc9_check.get("inAirshipEscort"))
                and bool(mc9_check.get("airHudVisible"))
                and int(mc9_check.get("dropPodsDeployedLive", 0)) >= 1
                and int(mc9_check.get("aaClearedLive", 0)) >= 1
                and bool(mc9_check.get("medalsAwardedOnVictory"))
                and bool(mc9_sim.get("airshipSpawnedWithAntiAirTurrets"))
                and bool(mc9_sim.get("uncontestedFlakDamagedAirship"))
                and bool(mc9_sim.get("blueSquadNeutralizedAntiAirAndDroppedPod"))
                and bool(mc9_sim.get("dropPodSpawnedShockTroops"))
                and bool(mc9_sim.get("escortVictoryPersistedMedalsAndMilestones")),
                json.dumps(
                    {
                        "lobbyBtn": mc9_check.get("hasEscortBtn"),
                        "inEscort": mc9_check.get("inAirshipEscort"),
                        "hud": mc9_check.get("airHudVisible"),
                        "dropPods": mc9_check.get("dropPodsDeployedLive"),
                        "aaCleared": mc9_check.get("aaClearedLive"),
                        "victoryMedals": mc9_check.get("medalsAwardedOnVictory"),
                        "flakDmg": mc9_sim.get("uncontestedFlakDamagedAirship"),
                        "shockTroops": mc9_sim.get("dropPodSpawnedShockTroops"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-9 Steam Cannon Core Module Workbench (Unlock/Upgrade Lv.1..5, Equip All 3 Modules, 3D Barrel Visuals, HUD Badge & Module-Enhanced Firing)",
                bool(mc9_check.get("hasModWorkbench"))
                and int(mc9_check.get("modCardCount", 0)) == 3
                and bool(mc9_check.get("eqAllThreeOk"))
                and bool(mc9_check.get("modHudBadgeOk"))
                and ("蓄能重炮管" in str(mc9_check.get("modActivePillTxt", "")))
                and bool(mc9_sim.get("cannonModsUnlockedUpgradedAndPersisted"))
                and bool(mc9_sim.get("overdriveBoostedCadenceAndDoubleTapped"))
                and bool(mc9_sim.get("prismRefractedChargedBobos"))
                and bool(mc9_sim.get("heavyMortarLaunchedArmoredSiegeBobo"))
                and bool(mc9_sim.get("cannonBarrelModVisualsSwitched3D")),
                json.dumps(
                    {
                        "cards": mc9_check.get("modCardCount"),
                        "levels": mc9_check.get("levelsAfter"),
                        "eqAll3": mc9_check.get("eqAllThreeOk"),
                        "hudBadge": mc9_check.get("modHudBadgeOk"),
                        "overdrive": mc9_sim.get("overdriveBoostedCadenceAndDoubleTapped"),
                        "prism": mc9_sim.get("prismRefractedChargedBobos"),
                        "mortar": mc9_sim.get("heavyMortarLaunchedArmoredSiegeBobo"),
                        "barrel3D": mc9_sim.get("cannonBarrelModVisualsSwitched3D"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-10"):
            # MC-10 Verification: Rainbow Candy Train Raid & Bobo Squad Relic Banner Stand
            mc10_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc10SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc10SelfCheck' };
                }
                const sim = w.runMc10SelfCheck();

                // Verify 5x MC-10 256x256 true-alpha RGBA PNG icons (?v=33) load cleanly with transparent corners (a === 0)
                const mc10Urls = [
                    '/assets/icons/ui_candy_train_raid.png?v=33',
                    '/assets/icons/ui_train_gold_medal.png?v=33',
                    '/assets/icons/banner_gale_charge.png?v=33',
                    '/assets/icons/banner_holy_shield.png?v=33',
                    '/assets/icons/banner_star_carnival.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc10Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 4; cv.height = 4;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const px = ctx2d.getImageData(0, 0, 1, 1).data;
                        resolve(px[3] === 0);
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                // Open Lobby -> Verify #btn-start-candy-train-raid & live 列车金章 counter
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const trainBtn = document.getElementById('btn-start-candy-train-raid');
                const hasTrainBtn = Boolean(trainBtn);
                const trainBtnImg = trainBtn?.querySelector('img');
                const trainBtnImgOk = Boolean(trainBtnImg && trainBtnImg.complete && trainBtnImg.naturalWidth > 0 && trainBtnImg.src.includes('ui_candy_train_raid.png?v=33'));
                const trainMedalTxt = document.getElementById('candy-train-medal-text')?.textContent?.trim() || '';

                // Open Workshop (#menu-panel-meta) -> #relic-banner-stand: unlock / upgrade / equip all 3 banners via real UI buttons
                w.state.gold = Math.max(w.state.gold, 150000);
                w.state.trainGoldMedals = Math.max(w.state.trainGoldMedals, 40);
                w.state.relicBannerLevels = { gale_charge: 1, holy_shield: 0, star_carnival: 0 };
                w.state.activeRelicBanner = 'gale_charge';
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                const stand = document.getElementById('relic-banner-stand');
                const bannerCards = Array.from(document.querySelectorAll('#relic-banner-grid .relic-banner-card'));
                const standFirstInWorkshop = Boolean(
                    stand && document.querySelector('#menu-panel-meta .squad-finish-workbench') === stand
                );

                document.querySelector('#relic-banner-grid [data-relic-banner-medal="gale_charge"]')?.click();
                document.querySelector('#relic-banner-grid [data-relic-banner-gold="gale_charge"]')?.click();
                document.querySelector('#relic-banner-grid [data-relic-banner-medal="holy_shield"]')?.click();
                document.querySelector('#relic-banner-grid [data-relic-banner-gold="holy_shield"]')?.click();
                document.querySelector('#relic-banner-grid [data-relic-banner-gold="star_carnival"]')?.click();
                document.querySelector('#relic-banner-grid [data-relic-banner-medal="star_carnival"]')?.click();

                const rb = w.relicBanner;
                document.querySelector('#relic-banner-grid [data-relic-banner-equip="gale_charge"]')?.click();
                const eqGaleOk = w.state.activeRelicBanner === 'gale_charge' && rb.finials.gale_charge.visible && rb.emblems.gale_charge.visible;
                document.querySelector('#relic-banner-grid [data-relic-banner-equip="star_carnival"]')?.click();
                const eqStarOk = w.state.activeRelicBanner === 'star_carnival' && rb.finials.star_carnival.visible && rb.emblems.star_carnival.visible && !rb.emblems.gale_charge.visible;
                document.querySelector('#relic-banner-grid [data-relic-banner-equip="holy_shield"]')?.click();
                const eqShieldOk = w.state.activeRelicBanner === 'holy_shield' && rb.finials.holy_shield.visible && rb.emblems.holy_shield.visible && !rb.emblems.star_carnival.visible;
                await new Promise((r) => setTimeout(r, 80));
                const bannerPillTxt = document.getElementById('relic-banner-active-pill')?.textContent?.trim() || '';
                const bannerImgsOk = Array.from(document.querySelectorAll('#relic-banner-stand img')).every(
                    (im) => im.complete && im.naturalWidth > 0
                );
                const bannerLevelsAfter = { ...w.state.relicBannerLevels };
                const savedBannerState = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const bannerSaved =
                    savedBannerState.activeRelicBanner === 'holy_shield' &&
                    (savedBannerState.relicBannerLevels?.gale_charge || 0) >= 3 &&
                    (savedBannerState.relicBannerLevels?.holy_shield || 0) >= 2 &&
                    (savedBannerState.relicBannerLevels?.star_carnival || 0) >= 2;
                const metaOv = document.documentElement.scrollWidth - window.innerWidth;

                // Gameplay effect of the equipped Holy Shield banner: spawned Bobos gain HP vs. an un-bannered baseline
                const shieldLvl = w.state.relicBannerLevels.holy_shield;
                w.state.relicBannerLevels.holy_shield = 0;
                w.state.activeRelicBanner = 'gale_charge';
                const savedGaleLvl = w.state.relicBannerLevels.gale_charge;
                w.state.relicBannerLevels.gale_charge = 0;
                const baseSpec = w.state.getRelicBannerCombatSpec('holy_shield');
                w.state.relicBannerLevels.holy_shield = shieldLvl;
                w.state.relicBannerLevels.gale_charge = savedGaleLvl;
                w.state.activeRelicBanner = 'holy_shield';
                const shieldSpec = w.state.getRelicBannerCombatSpec('holy_shield');
                const bannerAffectsGameplay = shieldSpec.hpMult > baseSpec.hpMult && shieldSpec.auraDmgReduction > 0 && shieldSpec.shieldEveryNth > 0;

                // Launch Candy Train Raid via #btn-start-candy-train-raid -> crowd damages & breaks cars -> HUD -> victory medals
                const medalsBeforeVictory = w.state.trainGoldMedals;
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-candy-train-raid')?.click();
                await new Promise((r) => setTimeout(r, 60));
                const train = w.candyTrain;
                const inTrainRaid = Boolean(
                    w.currentLevel &&
                    w.currentLevel.isCandyTrainRaid &&
                    train &&
                    train.active &&
                    Array.isArray(train.cars) &&
                    train.cars.length === 6
                );
                const trainHud = document.getElementById('candy-train-hud');
                const trainHudVisible = Boolean(trainHud && !trainHud.classList.contains('hidden'));
                const bannerInScene = Boolean(rb.rootGroup.parent) && rb.equippedId === 'holy_shield';

                // Real crowd interception: drop a Bobo squad next to the trailing car and let the simulation run
                let crowdDamage = 0;
                let carsBrokenLive = 0;
                let armorShedLive = false;
                if (train) {
                    const target = train.cars[train.cars.length - 1];
                    const hp0 = target.hp;
                    for (let k = 0; k < 10; k++) {
                        w.spawnUnit('blue', 'charged', target.x + 1.0 + (k % 3) * 0.3, target.z + ((k % 5) - 2) * 0.3, 0, 0);
                    }
                    for (let step = 0; step < 16; step++) {
                        w.update(0.05);
                    }
                    crowdDamage = hp0 - target.hp;
                    const armoredCar = train.cars.find((c) => c.cfg.kind === 'armored' && c.alive);
                    if (armoredCar) {
                        w.damageCandyTrainCar(armoredCar, armoredCar.hp * 0.7 / Math.max(0.01, 1 - armoredCar.armor), true);
                        armorShedLive = armoredCar.armorShed;
                        w.damageCandyTrainCar(armoredCar, 999999, true);
                    }
                    for (let step = 0; step < 4; step++) {
                        w.update(0.05);
                    }
                    carsBrokenLive = w.candyTrainCarsBroken;
                }
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                const hudCarsTxt = document.getElementById('train-hud-cars-text')?.textContent?.trim() || '';
                const hudEscapeTxt = document.getElementById('train-hud-escape-text')?.textContent?.trim() || '';
                const bannerBuffPill = document.querySelector('#active-buffs-bar .relic-banner-pill');
                const bannerBuffPillOk = Boolean(
                    bannerBuffPill &&
                    bannerBuffPill.textContent?.includes('圣盾守护旗') &&
                    bannerBuffPill.querySelector('img')?.src.includes('banner_holy_shield.png?v=33')
                );
                const carLabelsShown = Array.from(document.querySelectorAll('.candy-train-car-label')).filter(
                    (el) => el.style.display !== 'none'
                ).length;
                const battleOv = document.documentElement.scrollWidth - window.innerWidth;

                // Settle the raid via the real stage-end callback
                if (w.onStageEnd) {
                    w.isPaused = true;
                    w.onStageEnd(true);
                }
                const medalsAfterVictory = w.state.trainGoldMedals;
                const savedAfterVictory = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const modalTxt = document.getElementById('modal-title')?.textContent || '';

                const totalSvgCount = document.querySelectorAll('svg').length;
                const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
                const mc10TextSample = [
                    trainBtn?.textContent || '',
                    stand?.textContent || '',
                    trainHud?.textContent || '',
                    bannerBuffPill?.textContent || '',
                ].join(' ');
                const hasRawEmoji = emojiRe.test(mc10TextSample);

                return {
                    sim,
                    rgbaChecks,
                    hasTrainBtn,
                    trainBtnImgOk,
                    trainMedalTxt,
                    hasStand: Boolean(stand),
                    standFirstInWorkshop,
                    bannerCardCount: bannerCards.length,
                    bannerImgsOk,
                    bannerLevelsAfter,
                    eqAllThreeOk: eqGaleOk && eqStarOk && eqShieldOk,
                    bannerPillTxt,
                    bannerSaved,
                    bannerAffectsGameplay,
                    inTrainRaid,
                    trainHudVisible,
                    bannerInScene,
                    crowdDamage,
                    carsBrokenLive,
                    armorShedLive,
                    hudCarsTxt,
                    hudEscapeTxt,
                    bannerBuffPillOk,
                    carLabelsShown,
                    medalsAwardedOnVictory: medalsAfterVictory > medalsBeforeVictory && savedAfterVictory.trainGoldMedals === medalsAfterVictory && (savedAfterVictory.candyTrainRaidClears || 0) >= 1,
                    modalTxt,
                    totalSvgCount,
                    hasRawEmoji,
                    metaOv,
                    battleOv,
                };
            }"""
            )

            mc10_sim = mc10_check.get("sim") or {}
            add_check(
                "MC-10 5x 256px True-Alpha RGBA Icons (?v=33), Zero Inline SVG & Zero Raw Emoji",
                all(mc10_check.get("rgbaChecks", [False]))
                and len(mc10_check.get("rgbaChecks", [])) == 5
                and bool(mc10_check.get("trainBtnImgOk"))
                and bool(mc10_check.get("bannerImgsOk"))
                and int(mc10_check.get("totalSvgCount", 1)) == 0
                and not bool(mc10_check.get("hasRawEmoji")),
                json.dumps(
                    {
                        "rgba5": mc10_check.get("rgbaChecks"),
                        "btnImg": mc10_check.get("trainBtnImgOk"),
                        "bannerImgs": mc10_check.get("bannerImgsOk"),
                        "svgCount": mc10_check.get("totalSvgCount"),
                        "rawEmoji": mc10_check.get("hasRawEmoji"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-10 Rainbow Candy Train Raid (Lobby Entry, 6-Car Armored 3D Train on Rainbow Loop, Crowd Breaks Cars, Locomotive Stall, Escape Timer & Persistent 列车金章 + Milestone)",
                bool(mc10_check.get("hasTrainBtn"))
                and ("列车金章" in str(mc10_check.get("trainMedalTxt", "")))
                and bool(mc10_check.get("inTrainRaid"))
                and bool(mc10_check.get("trainHudVisible"))
                and float(mc10_check.get("crowdDamage", 0)) > 0
                and int(mc10_check.get("carsBrokenLive", 0)) >= 1
                and bool(mc10_check.get("armorShedLive"))
                and int(mc10_check.get("carLabelsShown", 0)) >= 1
                and ("驶离" in str(mc10_check.get("hudEscapeTxt", "")))
                and bool(mc10_check.get("medalsAwardedOnVictory"))
                and bool(mc10_sim.get("trainSpawnedWithArmoredCars"))
                and bool(mc10_sim.get("trainMovesAlongLoop"))
                and bool(mc10_sim.get("armorMitigatesCarDamage"))
                and bool(mc10_sim.get("crowdDamagedAndBrokeCar"))
                and bool(mc10_sim.get("armorPlatesShedAtHalfHp"))
                and bool(mc10_sim.get("locomotiveBreakStallsTrain"))
                and bool(mc10_sim.get("treasureCarLootedMedals"))
                and bool(mc10_sim.get("trainEscapeEndsRaidInDefeat"))
                and bool(mc10_sim.get("raidVictoryPersistedMedalsAndMilestone")),
                json.dumps(
                    {
                        "lobbyBtn": mc10_check.get("hasTrainBtn"),
                        "inRaid": mc10_check.get("inTrainRaid"),
                        "hud": mc10_check.get("trainHudVisible"),
                        "crowdDmg": round(float(mc10_check.get("crowdDamage", 0)), 1),
                        "carsBroken": mc10_check.get("carsBrokenLive"),
                        "armorShed": mc10_check.get("armorShedLive"),
                        "labels": mc10_check.get("carLabelsShown"),
                        "victoryMedals": mc10_check.get("medalsAwardedOnVictory"),
                        "stall": mc10_sim.get("locomotiveBreakStallsTrain"),
                        "escape": mc10_sim.get("trainEscapeEndsRaidInDefeat"),
                        "milestone": mc10_sim.get("raidVictoryPersistedMedalsAndMilestone"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-10 Relic Banner Stand (Unlock/Upgrade Lv.1..5 via Medals+Gold, Equip All 3, 3D War Banner + Aura on Crowd, Banner Effects & Buff Pill)",
                bool(mc10_check.get("hasStand"))
                and bool(mc10_check.get("standFirstInWorkshop"))
                and int(mc10_check.get("bannerCardCount", 0)) == 3
                and bool(mc10_check.get("eqAllThreeOk"))
                and bool(mc10_check.get("bannerSaved"))
                and ("圣盾守护旗" in str(mc10_check.get("bannerPillTxt", "")))
                and bool(mc10_check.get("bannerAffectsGameplay"))
                and bool(mc10_check.get("bannerInScene"))
                and bool(mc10_check.get("bannerBuffPillOk"))
                and bool(mc10_sim.get("bannersUpgradedEquippedAndPersisted"))
                and bool(mc10_sim.get("galeBannerSpeedAndSurge"))
                and bool(mc10_sim.get("holyShieldBannerHpShieldAndReduction"))
                and bool(mc10_sim.get("starBannerGoldAndCrits"))
                and bool(mc10_sim.get("banner3DVisualSwitched"))
                and bool(mc10_sim.get("bannerFollowsCrowd")),
                json.dumps(
                    {
                        "cards": mc10_check.get("bannerCardCount"),
                        "levels": mc10_check.get("bannerLevelsAfter"),
                        "eqAll3": mc10_check.get("eqAllThreeOk"),
                        "saved": mc10_check.get("bannerSaved"),
                        "effect": mc10_check.get("bannerAffectsGameplay"),
                        "pill": mc10_check.get("bannerBuffPillOk"),
                        "gale": mc10_sim.get("galeBannerSpeedAndSurge"),
                        "shield": mc10_sim.get("holyShieldBannerHpShieldAndReduction"),
                        "star": mc10_sim.get("starBannerGoldAndCrits"),
                        "banner3D": mc10_sim.get("banner3DVisualSwitched"),
                        "follow": mc10_sim.get("bannerFollowsCrowd"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-11"):
            # MC-11 Verification: Deep-Sea Submarine Bubble Rescue & Bobo Squad Pet Companion Dock
            mc11_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc11SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc11SelfCheck' };
                }
                const sim = w.runMc11SelfCheck();

                // Verify 5x MC-11 256x256 true-alpha RGBA PNG icons (?v=33) load cleanly with all 4 corners transparent
                const mc11Urls = [
                    '/assets/icons/ui_submarine_rescue.png?v=33',
                    '/assets/icons/ui_deep_pearl.png?v=33',
                    '/assets/icons/pet_jelly_puff.png?v=33',
                    '/assets/icons/pet_shell_turtle.png?v=33',
                    '/assets/icons/pet_spark_seahorse.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc11Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 256; cv.height = 256;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const corners = [[0, 0], [255, 0], [0, 255], [255, 255]];
                        resolve(corners.every(([cx, cy]) => ctx2d.getImageData(cx, cy, 1, 1).data[3] === 0));
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                // Open Lobby -> Verify #btn-start-submarine-rescue & live 深海珍珠 counter
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const subBtn = document.getElementById('btn-start-submarine-rescue');
                const hasSubBtn = Boolean(subBtn);
                const subBtnImg = subBtn?.querySelector('img');
                const subBtnImgOk = Boolean(subBtnImg && subBtnImg.complete && subBtnImg.naturalWidth > 0 && subBtnImg.src.includes('ui_submarine_rescue.png?v=33'));
                const pearlTxt = document.getElementById('submarine-pearl-text')?.textContent?.trim() || '';

                // Open Workshop (#menu-panel-meta) -> #pet-companion-dock: adopt / upgrade / equip all 3 pets via real UI buttons
                w.state.gold = Math.max(w.state.gold, 150000);
                w.state.deepPearls = Math.max(w.state.deepPearls, 40);
                w.state.petLevels = { jelly_puff: 1, shell_turtle: 0, spark_seahorse: 0 };
                w.state.activePet = 'jelly_puff';
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                const dock = document.getElementById('pet-companion-dock');
                const relicStand = document.getElementById('relic-banner-stand');
                const petCards = Array.from(document.querySelectorAll('#pet-companion-grid .pet-companion-card'));
                const dockAfterRelic = Boolean(
                    dock && relicStand && (relicStand.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING)
                );
                const lockedTurtleEquipDisabled = Boolean(
                    document.querySelector('#pet-companion-grid [data-pet-equip="shell_turtle"]')?.disabled
                );

                document.querySelector('#pet-companion-grid [data-pet-pearl="jelly_puff"]')?.click();
                document.querySelector('#pet-companion-grid [data-pet-gold="shell_turtle"]')?.click();
                document.querySelector('#pet-companion-grid [data-pet-pearl="shell_turtle"]')?.click();
                document.querySelector('#pet-companion-grid [data-pet-pearl="spark_seahorse"]')?.click();
                document.querySelector('#pet-companion-grid [data-pet-gold="spark_seahorse"]')?.click();
                document.querySelector('#pet-companion-grid [data-pet-gold="jelly_puff"]')?.click();

                const pc = w.petCompanion;
                const onlyVisible = (id) =>
                    ['jelly_puff', 'shell_turtle', 'spark_seahorse'].every((pid) => pc.models[pid].visible === (pid === id));
                document.querySelector('#pet-companion-grid [data-pet-equip="jelly_puff"]')?.click();
                const eqJellyOk = w.state.activePet === 'jelly_puff' && onlyVisible('jelly_puff');
                document.querySelector('#pet-companion-grid [data-pet-equip="shell_turtle"]')?.click();
                const eqTurtleOk = w.state.activePet === 'shell_turtle' && onlyVisible('shell_turtle');
                document.querySelector('#pet-companion-grid [data-pet-equip="spark_seahorse"]')?.click();
                const eqSeahorseOk = w.state.activePet === 'spark_seahorse' && onlyVisible('spark_seahorse');
                await new Promise((r) => setTimeout(r, 80));
                const petPillTxt = document.getElementById('pet-companion-active-pill')?.textContent?.trim() || '';
                const dockImgsOk = Array.from(document.querySelectorAll('#pet-companion-dock img')).every(
                    (im) => im.complete && im.naturalWidth > 0
                );
                const petLevelsAfter = { ...w.state.petLevels };
                const savedPetState = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const petSaved =
                    savedPetState.activePet === 'spark_seahorse' &&
                    (savedPetState.petLevels?.jelly_puff || 0) >= 3 &&
                    (savedPetState.petLevels?.shell_turtle || 0) >= 2 &&
                    (savedPetState.petLevels?.spark_seahorse || 0) >= 2;
                const metaOv = document.documentElement.scrollWidth - window.innerWidth;

                // Real gameplay numbers of each adopted pet vs. an un-adopted baseline
                const specOf = (id) => {
                    const prev = w.state.activePet;
                    w.state.activePet = id;
                    const sp = w.state.getPetCompanionCombatSpec();
                    w.state.activePet = prev;
                    return sp;
                };
                const jellySpec = specOf('jelly_puff');
                const turtleSpec = specOf('shell_turtle');
                const seahorseSpec = specOf('spark_seahorse');
                const petAffectsGameplay =
                    jellySpec.goldMult > 1 && jellySpec.magnetRadius > 0 &&
                    turtleSpec.dmgTakenMult < 1 && turtleSpec.shellShieldCount > 0 &&
                    seahorseSpec.sparkDmg > 0 && seahorseSpec.sparkChainTargets >= 3;

                // Launch the Submarine Rescue via #btn-start-submarine-rescue
                const pearlsBeforeVictory = w.state.deepPearls;
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-submarine-rescue')?.click();
                await new Promise((r) => setTimeout(r, 60));
                const sub = w.submarine;
                const inSubRescue = Boolean(
                    w.currentLevel && w.currentLevel.isSubmarineRescue && sub && sub.active &&
                    w.coralBarriers.length === 3 && w.rescueBubbles.length === 7
                );
                const subHud = document.getElementById('submarine-rescue-hud');
                const subHudVisible = Boolean(subHud && !subHud.classList.contains('hidden'));
                const fogHex = w.scene && w.scene.fog ? w.scene.fog.color.getHex() : -1;
                const underwater = fogHex === 0x1b7fa8 && w.currentTheme.id === 'ocean';
                const petInScene = Boolean(pc.rootGroup.parent) && pc.equippedId === 'spark_seahorse';

                // Real crowd strikes the first coral wall through the live update loop
                let coralDmgLive = 0;
                let coralsBrokenLive = 0;
                let subMovedLive = 0;
                if (sub) {
                    const z0 = sub.z;
                    const coral = w.coralBarriers[0];
                    const hp0 = coral.hp;
                    for (let k = 0; k < 12; k++) {
                        const bu = w.spawnUnit('blue', 'charged', -3 + (k % 6) * 1.1, coral.cfg.z + 1.3 + Math.floor(k / 6) * 0.4, 0, -4);
                        if (bu) { bu.spawnHop = 0; bu.attackCooldown = 0; }
                    }
                    for (let step = 0; step < 16; step++) w.update(0.05);
                    coralDmgLive = hp0 - coral.hp;
                    w.damageCoralBarrier(coral, 9999999, true);
                    coralsBrokenLive = w.subCoralsBroken;
                    subMovedLive = z0 - sub.z;
                }

                // Rescue bubble popped by a live Bobo squad -> trapped Bobos join the army
                let bubbleRescuedLive = false;
                let rescuedDelta = 0;
                const bub = w.rescueBubbles.find((b) => b.alive && !b.cfg.isGrand && b.z > w.coralBarriers[1].cfg.z);
                if (bub) {
                    const rescuedBefore = w.subBobosRescued;
                    for (let k = 0; k < 4; k++) {
                        const bu = w.spawnUnit('blue', 'charged', bub.x + 1.4 + k * 0.2, bub.z + 0.2, 0, 0);
                        if (bu) { bu.spawnHop = 0; bu.attackCooldown = 0; }
                    }
                    for (let step = 0; step < 24 && bub.alive; step++) w.update(0.05);
                    rescuedDelta = w.subBobosRescued - rescuedBefore;
                    bubbleRescuedLive = !bub.alive && rescuedDelta >= bub.cfg.bobos;
                }

                // Jellyfish swarm stings & slows Bobos and the submarine hull
                let jellyLive = false;
                let hullLost = 0;
                if (sub) {
                    w.spawnJellyfishSwarm(2);
                    const j = w.jellyfish[w.jellyfish.length - 1];
                    if (j) {
                        j.x = sub.x + 0.8;
                        j.z = sub.z;
                        j.stingTimer = 0;
                        const victim = w.spawnUnit('blue', 'normal', j.x + 0.3, j.z + 0.2, 0, 0);
                        // frontlineShieldChance (Bobo tech) can randomly grant a frost shield on spawn,
                        // which would absorb this sting; this check is about the sting itself.
                        if (victim) { victim.spawnHop = 0; victim.frostShield = false; }
                        const hull0 = sub.hp;
                        const stings0 = w.subJellyStings;
                        w.update(0.05);
                        w.update(0.05);
                        hullLost = hull0 - sub.hp;
                        jellyLive = w.subJellyStings > stings0 && hullLost > 0 && sub.slowTimer > 0 &&
                            Boolean(victim && ((victim.jellySlowTimer || 0) > 0 || !victim.active));
                    }
                }

                // Spark Seahorse arcs through the live jellyfish swarm (pet hovering beside the submarine)
                if (sub) {
                    pc.x = sub.x + 1.0;
                    pc.z = sub.z - 1.5;
                }
                const sparkHitsLive = w.triggerPetChainSpark();

                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                const hudHullTxt = document.getElementById('sub-hud-hull-text')?.textContent?.trim() || '';
                const hudRescueTxt = document.getElementById('sub-hud-rescue-text')?.textContent?.trim() || '';
                const hudThreatTxt = document.getElementById('sub-hud-threat-text')?.textContent?.trim() || '';
                const petBuffPill = document.querySelector('#active-buffs-bar .pet-companion-pill');
                const petBuffPillOk = Boolean(
                    petBuffPill &&
                    petBuffPill.textContent?.includes('小海马') &&
                    petBuffPill.querySelector('img')?.src.includes('pet_spark_seahorse.png?v=33')
                );
                const worldLabelsShown = Array.from(
                    document.querySelectorAll('.coral-barrier-label, .rescue-bubble-label, .submarine-hull-label')
                ).filter((el) => el.style.display !== 'none').length;
                const battleOv = document.documentElement.scrollWidth - window.innerWidth;

                // Settle the rescue via the real stage-end callback
                if (w.onStageEnd) {
                    w.isPaused = true;
                    w.onStageEnd(true);
                }
                const pearlsAfterVictory = w.state.deepPearls;
                const savedAfterVictory = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const modalTxt = document.getElementById('modal-title')?.textContent || '';

                const totalSvgCount = document.querySelectorAll('svg').length;
                const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
                const mc11TextSample = [
                    subBtn?.textContent || '',
                    dock?.textContent || '',
                    subHud?.textContent || '',
                    petBuffPill?.textContent || '',
                    modalTxt,
                ].join(' ');
                const hasRawEmoji = emojiRe.test(mc11TextSample);

                return {
                    sim,
                    rgbaChecks,
                    hasSubBtn,
                    subBtnImgOk,
                    pearlTxt,
                    hasDock: Boolean(dock),
                    dockAfterRelic,
                    lockedTurtleEquipDisabled,
                    petCardCount: petCards.length,
                    dockImgsOk,
                    petLevelsAfter,
                    eqAllThreeOk: eqJellyOk && eqTurtleOk && eqSeahorseOk,
                    petPillTxt,
                    petSaved,
                    petAffectsGameplay,
                    inSubRescue,
                    subHudVisible,
                    underwater,
                    petInScene,
                    coralDmgLive,
                    coralsBrokenLive,
                    subMovedLive,
                    bubbleRescuedLive,
                    rescuedDelta,
                    jellyLive,
                    hullLost,
                    sparkHitsLive,
                    hudHullTxt,
                    hudRescueTxt,
                    hudThreatTxt,
                    petBuffPillOk,
                    worldLabelsShown,
                    pearlsAwardedOnVictory:
                        pearlsAfterVictory > pearlsBeforeVictory &&
                        savedAfterVictory.deepPearls === pearlsAfterVictory &&
                        (savedAfterVictory.submarineRescueClears || 0) >= 1,
                    modalTxt,
                    totalSvgCount,
                    hasRawEmoji,
                    metaOv,
                    battleOv,
                };
            }"""
            )

            mc11_sim = mc11_check.get("sim") or {}
            add_check(
                "MC-11 5x 256px True-Alpha RGBA Icons (?v=33), Zero Inline SVG & Zero Raw Emoji",
                all(mc11_check.get("rgbaChecks", [False]))
                and len(mc11_check.get("rgbaChecks", [])) == 5
                and bool(mc11_check.get("subBtnImgOk"))
                and bool(mc11_check.get("dockImgsOk"))
                and int(mc11_check.get("totalSvgCount", 1)) == 0
                and not bool(mc11_check.get("hasRawEmoji")),
                json.dumps(
                    {
                        "rgba5": mc11_check.get("rgbaChecks"),
                        "btnImg": mc11_check.get("subBtnImgOk"),
                        "dockImgs": mc11_check.get("dockImgsOk"),
                        "svgCount": mc11_check.get("totalSvgCount"),
                        "rawEmoji": mc11_check.get("hasRawEmoji"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-11 Deep-Sea Submarine Bubble Rescue (Lobby Entry, Underwater Lane, 3D Toy Sub Advances & Torpedoes, Coral Walls Break, Bubble Rescues Add Bobos, Jellyfish Sting/Slow, Dock Win / Hull & Oxygen Loss, Persistent 深海珍珠 + Milestone)",
                bool(mc11_check.get("hasSubBtn"))
                and ("深海珍珠" in str(mc11_check.get("pearlTxt", "")))
                and bool(mc11_check.get("inSubRescue"))
                and bool(mc11_check.get("subHudVisible"))
                and bool(mc11_check.get("underwater"))
                and float(mc11_check.get("coralDmgLive", 0)) > 0
                and int(mc11_check.get("coralsBrokenLive", 0)) >= 1
                and float(mc11_check.get("subMovedLive", 0)) > 0
                and bool(mc11_check.get("bubbleRescuedLive"))
                and bool(mc11_check.get("jellyLive"))
                and int(mc11_check.get("worldLabelsShown", 0)) >= 1
                and ("潜艇" in str(mc11_check.get("hudHullTxt", "")) and "氧气" in str(mc11_check.get("hudHullTxt", "")))
                and ("营救" in str(mc11_check.get("hudRescueTxt", "")))
                and ("深海营救站" in str(mc11_check.get("modalTxt", "")))
                and bool(mc11_check.get("pearlsAwardedOnVictory"))
                and bool(mc11_sim.get("subSpawnedUnderwater"))
                and bool(mc11_sim.get("subAdvancesAlongLane"))
                and bool(mc11_sim.get("coralBlocksSubAndCrowdBreaksIt"))
                and bool(mc11_sim.get("bubbleRescueAddsUnits"))
                and bool(mc11_sim.get("subContactPopsBubble"))
                and bool(mc11_sim.get("jellyfishStingDamagesAndSlows"))
                and bool(mc11_sim.get("torpedoHitsJellyfish"))
                and bool(mc11_sim.get("dockingWinsStage"))
                and bool(mc11_sim.get("hullBreachLosesStage"))
                and bool(mc11_sim.get("oxygenOutLosesStage"))
                and bool(mc11_sim.get("pearlsPersistedWithMilestone")),
                json.dumps(
                    {
                        "lobbyBtn": mc11_check.get("hasSubBtn"),
                        "inRescue": mc11_check.get("inSubRescue"),
                        "hud": mc11_check.get("subHudVisible"),
                        "underwater": mc11_check.get("underwater"),
                        "coralDmg": round(float(mc11_check.get("coralDmgLive", 0)), 1),
                        "coralsBroken": mc11_check.get("coralsBrokenLive"),
                        "rescued": mc11_check.get("rescuedDelta"),
                        "jelly": mc11_check.get("jellyLive"),
                        "hullLost": round(float(mc11_check.get("hullLost", 0)), 1),
                        "labels": mc11_check.get("worldLabelsShown"),
                        "victoryPearls": mc11_check.get("pearlsAwardedOnVictory"),
                        "torpedo": mc11_sim.get("torpedoHitsJellyfish"),
                        "dockWin": mc11_sim.get("dockingWinsStage"),
                        "hullLoss": mc11_sim.get("hullBreachLosesStage"),
                        "o2Loss": mc11_sim.get("oxygenOutLosesStage"),
                        "milestone": mc11_sim.get("pearlsPersistedWithMilestone"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-11 Pet Companion Dock (Adopt/Upgrade Lv.1..5 via Pearls+Gold, Equip All 3, 3D Pet Follows Crowd, Magnet / Shell / Chain-Spark Effects & Buff Pill)",
                bool(mc11_check.get("hasDock"))
                and bool(mc11_check.get("dockAfterRelic"))
                and bool(mc11_check.get("lockedTurtleEquipDisabled"))
                and int(mc11_check.get("petCardCount", 0)) == 3
                and bool(mc11_check.get("eqAllThreeOk"))
                and bool(mc11_check.get("petSaved"))
                and ("闪电小海马" in str(mc11_check.get("petPillTxt", "")))
                and bool(mc11_check.get("petAffectsGameplay"))
                and bool(mc11_check.get("petInScene"))
                and int(mc11_check.get("sparkHitsLive", 0)) >= 1
                and bool(mc11_check.get("petBuffPillOk"))
                and bool(mc11_sim.get("petsAdoptUpgradeEquipPersisted"))
                and bool(mc11_sim.get("jellyPetMagnetAndGold"))
                and bool(mc11_sim.get("turtlePetShellAndReduction"))
                and bool(mc11_sim.get("seahorsePetChainAndCombo"))
                and bool(mc11_sim.get("pet3DVisualSwitched"))
                and bool(mc11_sim.get("petFollowsCrowd")),
                json.dumps(
                    {
                        "cards": mc11_check.get("petCardCount"),
                        "levels": mc11_check.get("petLevelsAfter"),
                        "eqAll3": mc11_check.get("eqAllThreeOk"),
                        "saved": mc11_check.get("petSaved"),
                        "effect": mc11_check.get("petAffectsGameplay"),
                        "pill": mc11_check.get("petBuffPillOk"),
                        "sparkLive": mc11_check.get("sparkHitsLive"),
                        "jelly": mc11_sim.get("jellyPetMagnetAndGold"),
                        "turtle": mc11_sim.get("turtlePetShellAndReduction"),
                        "seahorse": mc11_sim.get("seahorsePetChainAndCombo"),
                        "pet3D": mc11_sim.get("pet3DVisualSwitched"),
                        "follow": mc11_sim.get("petFollowsCrowd"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-12"):
            # MC-12 Verification: Glacier Sled Race & Bobo Squad Honor Trophy Hall
            mc12_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc12SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc12SelfCheck' };
                }
                const sim = w.runMc12SelfCheck();

                // Verify 5x MC-12 256x256 true-alpha RGBA PNG icons (?v=33) load cleanly with all 4 corners transparent
                const mc12Urls = [
                    '/assets/icons/ui_glacier_sled.png?v=33',
                    '/assets/icons/ui_ice_medal.png?v=33',
                    '/assets/icons/trophy_hall.png?v=33',
                    '/assets/icons/trophy_gold_cup.png?v=33',
                    '/assets/icons/display_pedestal.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc12Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 256; cv.height = 256;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const corners = [[0, 0], [255, 0], [0, 255], [255, 255]];
                        resolve(corners.every(([cx, cy]) => ctx2d.getImageData(cx, cy, 1, 1).data[3] === 0));
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                // Seed the EXISTING MC-8..MC-11 / campaign counters the hall reads (no duplicated copies)
                const s = w.state;
                s.gold = Math.max(s.gold, 150000);
                s.bestStageCleared = Math.max(s.bestStageCleared, 16);
                s.colossusRaidClears = Math.max(s.colossusRaidClears, 3);
                s.lifetimeAirshipWingMedals = Math.max(s.lifetimeAirshipWingMedals, 9);
                s.lifetimeTrainGoldMedals = Math.max(s.lifetimeTrainGoldMedals, 17);
                s.lifetimeDeepPearls = Math.max(s.lifetimeDeepPearls, 4);
                s.iceMedals = 12;
                s.lifetimeIceMedals = Math.max(s.lifetimeIceMedals, 12);
                s.trophyHallSlots = 1;
                s.trophyDisplay = [null, null, null, null, null, null];
                s.save();

                // Open Lobby -> #btn-start-glacier-sled, 冰晶奖章 counter & the lobby 3D trophy pedestal
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const sledBtn = document.getElementById('btn-start-glacier-sled');
                const hasSledBtn = Boolean(sledBtn);
                const sledBtnImg = sledBtn?.querySelector('img');
                const sledBtnImgOk = Boolean(sledBtnImg && sledBtnImg.complete && sledBtnImg.naturalWidth > 0 && sledBtnImg.src.includes('ui_glacier_sled.png?v=33'));
                const iceTxt = document.getElementById('glacier-ice-medal-text')?.textContent?.trim() || '';
                const sledBtnBeforeSub = Boolean(
                    sledBtn && document.getElementById('btn-start-submarine-rescue') &&
                    (sledBtn.compareDocumentPosition(document.getElementById('btn-start-submarine-rescue')) & Node.DOCUMENT_POSITION_FOLLOWING)
                );
                const pedestalBtn = document.getElementById('lobby-trophy-pedestal');
                const pedestalCanvas = document.getElementById('trophy-pedestal-canvas');
                const pedestalMounted = Boolean(
                    pedestalBtn && pedestalCanvas && w.trophyPedestal && w.trophyPedestal.canvas === pedestalCanvas &&
                    pedestalCanvas.clientWidth > 40 && pedestalCanvas.clientHeight > 40
                );
                const cupsBefore = w.trophyPedestal ? w.trophyPedestal.cupsGroup.children.length : -1;

                // Open Workshop -> #trophy-hall: place / unlock (medal + gold) / auto-arrange via real UI buttons
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                const hall = document.getElementById('trophy-hall');
                const petDock = document.getElementById('pet-companion-dock');
                const relicStand = document.getElementById('relic-banner-stand');
                const hallAfterPetDock = Boolean(
                    hall && petDock && (petDock.compareDocumentPosition(hall) & Node.DOCUMENT_POSITION_FOLLOWING)
                );
                const relicStillFirst = document.querySelector('#menu-panel-meta .squad-finish-workbench') === relicStand;
                const cabinetCards = document.querySelectorAll('#trophy-hall-grid .trophy-cabinet-card').length;
                const slotCards = document.querySelectorAll('#trophy-hall-slots .trophy-slot').length;
                document.querySelector('#trophy-hall-grid [data-trophy-place="train_medal"]')?.click();
                const placedTrain = s.trophyDisplay[0] === 'train_medal';
                document.querySelector('#trophy-hall-slots [data-trophy-unlock="medal"]')?.click();
                const unlockedByMedal = s.getUnlockedTrophySlots() === 2 && s.iceMedals === 10;
                document.querySelector('#trophy-hall-grid [data-trophy-place="airship_medal"]')?.click();
                document.querySelector('#trophy-hall-slots [data-trophy-unlock="gold"]')?.click();
                const unlockedByGold = s.getUnlockedTrophySlots() === 3;
                document.querySelector('#trophy-hall-grid [data-trophy-place="clockwork_core"]')?.click();
                const threePlaced = s.getDisplayedTrophyCount() === 3;
                const placeBtnsWhenFull = Array.from(document.querySelectorAll('#trophy-hall-grid .trophy-place-btn'));
                const fullSlotsDisablePlace = placeBtnsWhenFull.length === cabinetCards - 3 && placeBtnsWhenFull.every((b) => b.disabled);
                document.querySelector('#trophy-hall-slots [data-trophy-remove="1"]')?.click();
                const removedOne = s.trophyDisplay[1] === null && s.getDisplayedTrophyCount() === 2;
                document.getElementById('btn-trophy-auto-arrange')?.click();
                const shownIds = s.getDisplayedTrophyIds();
                const hiddenEarned = ['campaign_star', 'clockwork_core', 'airship_medal', 'train_medal', 'deep_pearl', 'ice_medal', 'lava_core', 'stardust_badge', 'pumpkin_badge', 'scarab_badge', 'emerald_idol_badge']
                    .filter((id) => !shownIds.includes(id) && s.getHallTrophyTier(id) >= 1);
                const minShownTier = Math.min(...shownIds.map((id) => s.getHallTrophyTier(id)));
                const autoFilled = shownIds.length === 3 &&
                    hiddenEarned.every((id) => s.getHallTrophyTier(id) <= minShownTier);
                await new Promise((r) => setTimeout(r, 80));
                const hallImgsOk = Array.from(document.querySelectorAll('#trophy-hall img')).every(
                    (im) => im.complete && im.naturalWidth > 0
                );
                const hallPillTxt = document.getElementById('trophy-hall-active-pill')?.textContent?.trim() || '';
                const savedHall = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const hallSaved =
                    savedHall.trophyHallSlots === 3 &&
                    Array.isArray(savedHall.trophyDisplay) &&
                    savedHall.trophyDisplay.filter(Boolean).length === 3 &&
                    savedHall.iceMedals === s.iceMedals;
                const cupsAfter = w.trophyPedestal ? w.trophyPedestal.cupsGroup.children.length : -1;
                const pedestalMirrors = cupsAfter === s.getDisplayedTrophyIds().length && cupsAfter === 3;
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const lobbyCaption = document.getElementById('lobby-trophy-caption-text')?.textContent?.trim() || '';
                const metaOv = document.documentElement.scrollWidth - window.innerWidth;

                // Displayed trophies grant real global buffs (hall milestone gold + per-trophy fire / siege / attack)
                const keep = [...s.trophyDisplay];
                const getters = {
                    power: () => s.getPowerMultiplier(),
                    siege: () => s.getSiegeDamageMultiplier(),
                    fire: () => s.getFireRatePerSec(),
                    dmg: () => s.getHallTroopDmgMult(),
                    hp: () => s.getHallTroopHpMult(),
                    speed: () => s.getMoveSpeedMultiplier(),
                    gold: () => s.getLootMultiplier(),
                };
                const shownKinds = s.getDisplayedTrophyIds().map((id) => ({ power: 'power', siege: 'siege', fire: 'fire', dmg: 'dmg', hp: 'hp', speed: 'speed', gold: 'gold' })[
                    { campaign_star: 'power', clockwork_core: 'siege', airship_medal: 'fire', train_medal: 'dmg', deep_pearl: 'hp', ice_medal: 'speed', lava_core: 'gold', stardust_badge: 'fire', pumpkin_badge: 'dmg', scarab_badge: 'hp', emerald_idol_badge: 'speed' }[id]
                ]);
                const withHall = { loot: s.getLootMultiplier(), kinds: shownKinds.map((k) => getters[k]()) };
                s.trophyDisplay = [null, null, null, null, null, null];
                const noHall = { loot: s.getLootMultiplier(), kinds: shownKinds.map((k) => getters[k]()) };
                s.trophyDisplay = keep;
                const hallBuffs = shownKinds.length === 3 && withHall.loot > noHall.loot &&
                    withHall.kinds.every((v, i) => v > noHall.kinds[i]);

                // Launch the Glacier Sled Race via #btn-start-glacier-sled
                const medalsBefore = s.iceMedals;
                document.getElementById('btn-start-glacier-sled')?.click();
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                const sled = w.glacierSled;
                const inSled = Boolean(
                    w.currentLevel && w.currentLevel.isGlacierSled && sled && sled.active &&
                    w.sledGates.length >= 6 && w.sledIcicles.length >= 6 && w.sledAvalanches.length >= 2
                );
                const sledHud = document.getElementById('glacier-sled-hud');
                const sledHudVisible = Boolean(sledHud && !sledHud.classList.contains('hidden'));
                const glacier = w.currentTheme.id === 'glacier' && !w.turretGroup.visible;
                const hudBottom = document.querySelector('.hud-bottom');
                const bottomHidden = Boolean(hudBottom && getComputedStyle(hudBottom).display === 'none') &&
                    document.body.classList.contains('sled-mode-active');
                const startRiders = w.getSledRiderCount();

                // Live run: the sled slides downhill (autopilot steering through the real update loop)
                let distLive = 0;
                let scrolled = false;
                if (sled) {
                    const z0 = sled.courseGroup.position.z;
                    for (let step = 0; step < 60; step++) {
                        w.turretTargetX = w.getSledAutopilotX();
                        w.update(0.05);
                    }
                    distLive = sled.distance;
                    scrolled = sled.courseGroup.position.z > z0 + 15;
                }
                // Gate crossing through the live loop adds riders
                let gateLive = 0;
                const gate = w.sledGates.find((g) => !g.resolved && g.cfg.op === 'add');
                if (sled && gate) {
                    sled.x = gate.cfg.x;
                    w.turretX = gate.cfg.x;
                    w.turretTargetX = gate.cfg.x;
                    sled.distance = gate.cfg.d - 0.3;
                    const before = w.getSledRiderCount();
                    w.update(0.05);
                    gateLive = w.getSledRiderCount() - before;
                }
                // A landed ice spike in the lane knocks riders off through the live loop
                let icicleLive = 0;
                const ic = w.sledIcicles.find((i) => !i.shattered && i.cfg.d > sled.distance + 4);
                if (sled && ic) {
                    sled.x = ic.cfg.x;
                    w.turretX = ic.cfg.x;
                    w.turretTargetX = ic.cfg.x;
                    w.snapSledRidersToSlots();
                    for (const u of w.units) if (u.active && u.team === 'blue') u.frostShield = false;
                    ic.landed = true;
                    ic.spike.visible = true;
                    sled.distance = ic.cfg.d - 2.5;
                    const before = w.getSledRiderCount();
                    for (let step = 0; step < 14 && !ic.shattered; step++) w.update(0.03);
                    icicleLive = before - w.getSledRiderCount();
                }

                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                const hudTimeTxt = document.getElementById('sled-hud-time-text')?.textContent?.trim() || '';
                const hudRidersTxt = document.getElementById('sled-hud-riders-text')?.textContent?.trim() || '';
                const hudCourseTxt = document.getElementById('sled-hud-course-text')?.textContent?.trim() || '';
                const hallPill = document.querySelector('#active-buffs-bar .trophy-hall-pill');
                const hallPillOk = Boolean(
                    hallPill && hallPill.textContent?.includes('荣誉陈列') &&
                    hallPill.querySelector('img')?.src.includes('trophy_gold_cup.png?v=33')
                );
                const sledPill = document.querySelector('#active-buffs-bar .glacier-sled-pill');
                const sledLabelShown = Array.from(document.querySelectorAll('.glacier-sled-label')).filter(
                    (el) => el.style.display !== 'none'
                ).length;
                const battleOv = document.documentElement.scrollWidth - window.innerWidth;

                // Settle the race via the real stage-end callback
                if (w.onStageEnd) {
                    w.sledFinishSec = 27.5;
                    w.isPaused = true;
                    w.onStageEnd(true);
                }
                const medalsAfter = s.iceMedals;
                const savedAfter = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const modalTxt = document.getElementById('modal-title')?.textContent || '';
                const modalDescTxt = document.getElementById('modal-desc')?.textContent || '';

                const totalSvgCount = document.querySelectorAll('svg').length;
                const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
                const mc12TextSample = [
                    sledBtn?.textContent || '',
                    hall?.textContent || '',
                    sledHud?.textContent || '',
                    hallPill?.textContent || '',
                    sledPill?.textContent || '',
                    lobbyCaption,
                    modalTxt,
                    modalDescTxt,
                ].join(' ');
                const hasRawEmoji = emojiRe.test(mc12TextSample);

                return {
                    sim,
                    rgbaChecks,
                    hasSledBtn,
                    sledBtnImgOk,
                    sledBtnBeforeSub,
                    iceTxt,
                    pedestalMounted,
                    cupsBefore,
                    cupsAfter,
                    pedestalMirrors,
                    lobbyCaption,
                    hasHall: Boolean(hall),
                    hallAfterPetDock,
                    relicStillFirst,
                    cabinetCards,
                    slotCards,
                    fullSlotsDisablePlace,
                    placedTrain,
                    unlockedByMedal,
                    unlockedByGold,
                    threePlaced,
                    removedOne,
                    autoFilled,
                    hallImgsOk,
                    hallPillTxt,
                    hallSaved,
                    hallBuffs,
                    inSled,
                    sledHudVisible,
                    glacier,
                    bottomHidden,
                    startRiders,
                    distLive,
                    scrolled,
                    gateLive,
                    icicleLive,
                    hudTimeTxt,
                    hudRidersTxt,
                    hudCourseTxt,
                    hallPillOk,
                    sledPillOk: Boolean(sledPill && sledPill.textContent?.includes('雪橇')),
                    sledLabelShown,
                    medalsAwardedOnVictory:
                        medalsAfter > medalsBefore &&
                        savedAfter.iceMedals === medalsAfter &&
                        (savedAfter.glacierSledClears || 0) >= 1,
                    modalTxt,
                    totalSvgCount,
                    hasRawEmoji,
                    metaOv,
                    battleOv,
                };
            }"""
            )

            mc12_sim = mc12_check.get("sim") or {}
            add_check(
                "MC-12 5x 256px True-Alpha RGBA Icons (?v=33), Zero Inline SVG & Zero Raw Emoji",
                all(mc12_check.get("rgbaChecks", [False]))
                and len(mc12_check.get("rgbaChecks", [])) == 5
                and bool(mc12_check.get("sledBtnImgOk"))
                and bool(mc12_check.get("hallImgsOk"))
                and int(mc12_check.get("totalSvgCount", 1)) == 0
                and not bool(mc12_check.get("hasRawEmoji")),
                json.dumps(
                    {
                        "rgba5": mc12_check.get("rgbaChecks"),
                        "btnImg": mc12_check.get("sledBtnImgOk"),
                        "hallImgs": mc12_check.get("hallImgsOk"),
                        "svgCount": mc12_check.get("totalSvgCount"),
                        "rawEmoji": mc12_check.get("hasRawEmoji"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-12 Glacier Sled Race (Lobby Entry, Scrolling Glacier Course, 3D Toy Sled Steered by the Cannon, Gates Add Riders, Icicles / Avalanche Knock Riders Off, Boost, Finish Win / Timeout & Wipeout Loss, 冰晶奖章 by Time + Survivors + Milestone)",
                bool(mc12_check.get("hasSledBtn"))
                and bool(mc12_check.get("sledBtnBeforeSub"))
                and ("冰晶奖章" in str(mc12_check.get("iceTxt", "")))
                and bool(mc12_check.get("inSled"))
                and bool(mc12_check.get("sledHudVisible"))
                and bool(mc12_check.get("glacier"))
                and bool(mc12_check.get("bottomHidden"))
                and float(mc12_check.get("distLive", 0)) > 15
                and bool(mc12_check.get("scrolled"))
                and int(mc12_check.get("gateLive", 0)) >= 4
                and int(mc12_check.get("icicleLive", 0)) >= 1
                and int(mc12_check.get("sledLabelShown", 0)) >= 1
                and ("剩余" in str(mc12_check.get("hudTimeTxt", "")))
                and ("波波" in str(mc12_check.get("hudRidersTxt", "")))
                and ("赛道" in str(mc12_check.get("hudCourseTxt", "")))
                and bool(mc12_check.get("sledPillOk"))
                and ("冰川终点线" in str(mc12_check.get("modalTxt", "")))
                and bool(mc12_check.get("medalsAwardedOnVictory"))
                and bool(mc12_sim.get("sledSpawnedOnGlacier"))
                and bool(mc12_sim.get("sledSlidesAndCourseScrolls"))
                and bool(mc12_sim.get("sledSteersAndRidersFollow"))
                and bool(mc12_sim.get("gateAddsRiders"))
                and bool(mc12_sim.get("icicleKnocksRiders"))
                and bool(mc12_sim.get("avalancheKnocksOutsideGap"))
                and bool(mc12_sim.get("avalancheGapSafe"))
                and bool(mc12_sim.get("boostSpeedsUp"))
                and bool(mc12_sim.get("finishWinsStage"))
                and bool(mc12_sim.get("timeoutLosesStage"))
                and bool(mc12_sim.get("wipeoutLosesStage"))
                and bool(mc12_sim.get("medalsScaleWithTimeAndSurvivors"))
                and bool(mc12_sim.get("medalsPersistedWithMilestone")),
                json.dumps(
                    {
                        "lobbyBtn": mc12_check.get("hasSledBtn"),
                        "inSled": mc12_check.get("inSled"),
                        "hud": mc12_check.get("sledHudVisible"),
                        "bottomHidden": mc12_check.get("bottomHidden"),
                        "dist": round(float(mc12_check.get("distLive", 0)), 1),
                        "gate": mc12_check.get("gateLive"),
                        "icicle": mc12_check.get("icicleLive"),
                        "label": mc12_check.get("sledLabelShown"),
                        "victoryMedals": mc12_check.get("medalsAwardedOnVictory"),
                        "stats": mc12_sim.get("stats"),
                        "avalanche": mc12_sim.get("avalancheKnocksOutsideGap"),
                        "gapSafe": mc12_sim.get("avalancheGapSafe"),
                        "boost": mc12_sim.get("boostSpeedsUp"),
                        "finish": mc12_sim.get("finishWinsStage"),
                        "timeout": mc12_sim.get("timeoutLosesStage"),
                        "wipeout": mc12_sim.get("wipeoutLosesStage"),
                        "medalScale": mc12_sim.get("medalsScaleWithTimeAndSurvivors"),
                        "milestone": mc12_sim.get("medalsPersistedWithMilestone"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-12 Honor Trophy Hall (Reads MC-8..MC-12 + Campaign Counters, Unlock Slots via 冰晶奖章 / Gold, Place / Remove / Auto-Arrange, Global Buffs, Buff Pill & Lobby 3D Pedestal Mirror)",
                bool(mc12_check.get("hasHall"))
                and bool(mc12_check.get("hallAfterPetDock"))
                and bool(mc12_check.get("relicStillFirst"))
                and int(mc12_check.get("cabinetCards", 0)) >= 10
                and int(mc12_check.get("slotCards", 0)) == 6
                and bool(mc12_check.get("fullSlotsDisablePlace"))
                and bool(mc12_check.get("placedTrain"))
                and bool(mc12_check.get("unlockedByMedal"))
                and bool(mc12_check.get("unlockedByGold"))
                and bool(mc12_check.get("threePlaced"))
                and bool(mc12_check.get("removedOne"))
                and bool(mc12_check.get("autoFilled"))
                and bool(mc12_check.get("hallSaved"))
                and bool(mc12_check.get("hallBuffs"))
                and bool(mc12_check.get("pedestalMounted"))
                and bool(mc12_check.get("pedestalMirrors"))
                and ("荣誉陈列 3/6" in str(mc12_check.get("lobbyCaption", "")))
                and ("陈列 3/3" in str(mc12_check.get("hallPillTxt", "")))
                and bool(mc12_check.get("hallPillOk"))
                and bool(mc12_sim.get("hallReadsExistingCounters"))
                and bool(mc12_sim.get("hallSlotsUnlockPlacePersist"))
                and bool(mc12_sim.get("hallBuffsApplyGlobally"))
                and bool(mc12_sim.get("pedestalMirrorsDisplay")),
                json.dumps(
                    {
                        "cards": mc12_check.get("cabinetCards"),
                        "slots": mc12_check.get("slotCards"),
                        "placed": mc12_check.get("placedTrain"),
                        "unlockMedal": mc12_check.get("unlockedByMedal"),
                        "unlockGold": mc12_check.get("unlockedByGold"),
                        "auto": mc12_check.get("autoFilled"),
                        "saved": mc12_check.get("hallSaved"),
                        "buffs": mc12_check.get("hallBuffs"),
                        "pedestal": [mc12_check.get("cupsBefore"), mc12_check.get("cupsAfter")],
                        "caption": mc12_check.get("lobbyCaption"),
                        "pill": mc12_check.get("hallPillOk"),
                        "reads": mc12_sim.get("hallReadsExistingCounters"),
                        "persist": mc12_sim.get("hallSlotsUnlockPlacePersist"),
                        "global": mc12_sim.get("hallBuffsApplyGlobally"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-13"):
            # MC-13 Verification: Volcano Lava Jump Breakout & Bobo Squad Skin Gacha Machine
            mc13_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc13SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc13SelfCheck' };
                }
                const sim = w.runMc13SelfCheck();
                const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

                // Verify 5x MC-13 256x256 true-alpha RGBA PNG icons (?v=33) load cleanly with all 4 corners transparent
                const mc13Urls = [
                    '/assets/icons/ui_lava_jump.png?v=33',
                    '/assets/icons/ui_lava_core.png?v=33',
                    '/assets/icons/gacha_machine.png?v=33',
                    '/assets/icons/skin_capsule.png?v=33',
                    '/assets/icons/skin_crown.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc13Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 256; cv.height = 256;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const corners = [[0, 0], [255, 0], [0, 255], [255, 255]];
                        resolve(corners.every(([cx, cy]) => ctx2d.getImageData(cx, cy, 1, 1).data[3] === 0));
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                const s = w.state;
                s.gold = Math.max(s.gold, 60000);
                s.lavaCores = 40;
                s.lifetimeLavaCores = Math.max(s.lifetimeLavaCores, 40);
                s.ownedGachaSkins = [];
                s.equippedGachaSkin = null;
                s.gachaPity = 0;
                s.gachaSsrPity = 0;
                s.save();
                w.syncGachaSkin3D();

                // Lobby: #btn-start-lava-jump (above the glacier sled card) with the 熔岩晶核 counter
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const lavaBtn = document.getElementById('btn-start-lava-jump');
                const sledBtn = document.getElementById('btn-start-glacier-sled');
                const lavaBtnImg = lavaBtn?.querySelector('img');
                const lavaBtnImgOk = Boolean(lavaBtnImg && lavaBtnImg.complete && lavaBtnImg.naturalWidth > 0 && lavaBtnImg.src.includes('ui_lava_jump.png?v=33'));
                const coreTxt = document.getElementById('lava-core-text')?.textContent?.trim() || '';
                const lavaBtnBeforeSled = Boolean(
                    lavaBtn && sledBtn && (lavaBtn.compareDocumentPosition(sledBtn) & Node.DOCUMENT_POSITION_FOLLOWING)
                );

                // Workshop -> #gacha-machine: roll through the real buttons (熔岩晶核 / coins, single / ten)
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                const gacha = document.getElementById('gacha-machine');
                const hall = document.getElementById('trophy-hall');
                const relicStand = document.getElementById('relic-banner-stand');
                const gachaAfterHall = Boolean(hall && gacha && (hall.compareDocumentPosition(gacha) & Node.DOCUMENT_POSITION_FOLLOWING));
                const relicStillFirst = document.querySelector('#menu-panel-meta .squad-finish-workbench') === relicStand;
                const skinCards = document.querySelectorAll('#gacha-collection-grid .gacha-skin-card').length;
                const lockedBefore = document.querySelectorAll('#gacha-collection-grid .gacha-skin-card.is-locked').length;
                const rollsBefore = s.totalGachaRolls;
                // MC-17 deflake: the real buttons roll with Math.random, so pin it to a seeded sequence for these clicks
                // (the odds themselves are verified separately with the injected seeded RNG); the collection checks
                // below (>= 2 distinct skins, ten-roll dupes) are then the same on every run
                const realRandom = Math.random;
                let seedA = 1717;
                Math.random = () => {
                    seedA = (seedA + 0x6d2b79f5) >>> 0;
                    let t = seedA;
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
                document.getElementById('btn-gacha-single-core')?.click();
                const singleOk = s.lavaCores === 38 && s.totalGachaRolls === rollsBefore + 1 &&
                    document.querySelectorAll('#gacha-result-tray .gacha-result-chip').length === 1;
                const goldBeforeTen = s.gold;
                document.getElementById('btn-gacha-ten-gold')?.click();
                const chips = Array.from(document.querySelectorAll('#gacha-result-tray .gacha-result-chip'));
                const dupSum = chips.reduce((sum, c) => {
                    const t = c.querySelector('.gacha-chip-dup')?.textContent || '';
                    const m = t.match(/\\+(\\d+)/);
                    return sum + (m ? Number(m[1]) : 0);
                }, 0);
                const tenGoldOk = chips.length === 10 && s.gold === goldBeforeTen - 7200 + dupSum;
                const tenHasRare = chips.some((c) => c.classList.contains('rarity-SR') || c.classList.contains('rarity-SSR'));
                document.getElementById('btn-gacha-ten-core')?.click();
                Math.random = realRandom;
                const tenCoreOk = s.lavaCores === 20 && document.querySelectorAll('#gacha-result-tray .gacha-result-chip').length === 10;
                const ownedAfter = s.ownedGachaSkins.length;
                const lockedAfter = document.querySelectorAll('#gacha-collection-grid .gacha-skin-card.is-locked').length;
                const collectionSynced = lockedBefore === 8 && lockedAfter === 8 - ownedAfter && ownedAfter >= 2;
                const pityTxt = document.getElementById('gacha-pity-text')?.textContent?.trim() || '';
                const oddsTxt = document.getElementById('gacha-odds-banner')?.textContent || '';
                const oddsShown = ['传说 3%', '史诗 12%', '稀有 30%', '普通 55%', '每 10 抽必出史诗+'].every((k) => oddsTxt.includes(k));
                const eqBtn = document.querySelector('#gacha-collection-grid [data-gacha-equip]:not([disabled])');
                const eqId = eqBtn ? eqBtn.getAttribute('data-gacha-equip') : null;
                eqBtn?.click();
                const look = w.getGachaSkinLookSnapshot();
                const gachaPillTxt = document.getElementById('gacha-active-pill')?.textContent?.trim() || '';
                const equippedOk = Boolean(eqId) && s.equippedGachaSkin === eqId && look.skinId === eqId && look.accessoryVisible &&
                    gachaPillTxt.includes(document.querySelector(`#gacha-collection-grid [data-gacha-skin="${eqId}"] .gacha-skin-name`)?.textContent || '@@');
                const savedG = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const gachaSaved = savedG.equippedGachaSkin === eqId && Array.isArray(savedG.ownedGachaSkins) &&
                    savedG.ownedGachaSkins.length === ownedAfter && savedG.lavaCores === s.lavaCores &&
                    savedG.gachaPity === s.gachaPity && savedG.totalGachaRolls === s.totalGachaRolls;
                await new Promise((r) => setTimeout(r, 80));
                const gachaImgsOk = Array.from(document.querySelectorAll('#gacha-machine img')).every((im) => im.complete && im.naturalWidth > 0);
                const lavaTrophyCard = Boolean(document.querySelector('#trophy-hall-grid [data-hall-trophy="lava_core"]'));
                const hallCards = document.querySelectorAll('#trophy-hall-grid .trophy-cabinet-card').length;
                const lavaTrophyTier = s.getHallTrophyTier('lava_core');
                const metaOv = document.documentElement.scrollWidth - window.innerWidth;

                // Launch the Lava Jump via #btn-start-lava-jump (the equipped skin follows the squad into this mode)
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const coresBefore = s.lavaCores;
                document.getElementById('btn-start-lava-jump')?.click();
                await raf2();
                const lava = w.lavaRun;
                const inLava = Boolean(
                    w.currentLevel && w.currentLevel.isLavaJump && lava && lava.active &&
                    lava.rows.length >= 14 && w.lavaEruptions.length >= 2 && w.lavaRocks.length >= 2
                );
                const lavaHud = document.getElementById('lava-jump-hud');
                const lavaHudVisible = Boolean(lavaHud && !lavaHud.classList.contains('hidden'));
                const magma = w.currentTheme.id === 'magma' && !w.turretGroup.visible;
                const hudBottom = document.querySelector('.hud-bottom');
                const bottomHidden = Boolean(hudBottom && getComputedStyle(hudBottom).display === 'none') &&
                    document.body.classList.contains('lava-mode-active');
                const startBobos = w.getLavaBoboCount();
                let distLive = 0;
                let rowsLive = 0;
                let maxHop = 0;
                if (lava) {
                    for (let step = 0; step < 90 && lava.active; step++) {
                        w.turretTargetX = w.getLavaAutopilotX();
                        w.update(0.05);
                        for (const u of w.units) if (u.active && u.team === 'blue') maxHop = Math.max(maxHop, u.rideY || 0);
                    }
                    distLive = lava.distance;
                    rowsLive = w.getLavaRowProgress().reached;
                }
                await raf2();
                const bobosLive = w.lavaBoboCount;
                const accLive = w.lastGachaAccessoryCount;
                const hudTimeTxt = document.getElementById('lava-hud-time-text')?.textContent?.trim() || '';
                const hudBobosTxt = document.getElementById('lava-hud-bobos-text')?.textContent?.trim() || '';
                const hudCourseTxt = document.getElementById('lava-hud-course-text')?.textContent?.trim() || '';
                const lavaPill = document.querySelector('#active-buffs-bar .lava-jump-pill');
                const skinPill = document.querySelector('#active-buffs-bar .gacha-skin-pill');
                const lavaLabelShown = Array.from(document.querySelectorAll('.lava-jump-label')).filter(
                    (el) => el.style.display !== 'none'
                ).length;
                const reticleShown = Boolean(lava && lava.reticle.visible);
                const battleOv = document.documentElement.scrollWidth - window.innerWidth;

                // Settle the run via the real stage-end callback
                if (w.onStageEnd) {
                    w.lavaFinishSec = 28.4;
                    w.isPaused = true;
                    w.onStageEnd(true);
                }
                const coresAfter = s.lavaCores;
                const savedAfter = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const modalTxt = document.getElementById('modal-title')?.textContent || '';
                const modalDescTxt = document.getElementById('modal-desc')?.textContent || '';

                // The skin also re-skins the Bobos in a regular campaign battle (all modes)
                document.getElementById('btn-modal-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-battle')?.click();
                for (let step = 0; step < 40; step++) w.update(0.05);
                await raf2();
                const campaignTroopers = w.units.filter((u) => u.active && u.team === 'blue' && u.kind !== 'champion').length;
                const campaignAcc = w.lastGachaAccessoryCount;
                const campaignLook = w.getGachaSkinLookSnapshot();
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();

                const totalSvgCount = document.querySelectorAll('svg').length;
                const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
                const mc13TextSample = [
                    lavaBtn?.textContent || '',
                    gacha?.textContent || '',
                    lavaHud?.textContent || '',
                    lavaPill?.textContent || '',
                    skinPill?.textContent || '',
                    modalTxt,
                    modalDescTxt,
                ].join(' ');
                const hasRawEmoji = emojiRe.test(mc13TextSample);

                return {
                    sim,
                    rgbaChecks,
                    lavaBtnImgOk,
                    coreTxt,
                    lavaBtnBeforeSled,
                    hasGacha: Boolean(gacha),
                    gachaAfterHall,
                    relicStillFirst,
                    skinCards,
                    singleOk,
                    tenGoldOk,
                    tenHasRare,
                    tenCoreOk,
                    collectionSynced,
                    ownedAfter,
                    pityTxt,
                    oddsShown,
                    eqId,
                    equippedOk,
                    gachaSaved,
                    gachaImgsOk,
                    lavaTrophyCard,
                    hallCards,
                    lavaTrophyTier,
                    inLava,
                    lavaHudVisible,
                    magma,
                    bottomHidden,
                    startBobos,
                    distLive,
                    rowsLive,
                    maxHop,
                    bobosLive,
                    accLive,
                    hudTimeTxt,
                    hudBobosTxt,
                    hudCourseTxt,
                    lavaPillOk: Boolean(lavaPill && lavaPill.textContent?.includes('熔岩')),
                    skinPillOk: Boolean(skinPill && skinPill.textContent?.includes('装扮')),
                    lavaLabelShown,
                    reticleShown,
                    coresAwardedOnVictory:
                        coresAfter > coresBefore &&
                        savedAfter.lavaCores === coresAfter &&
                        (savedAfter.lavaJumpClears || 0) >= 1,
                    modalTxt,
                    campaignTroopers,
                    campaignAcc,
                    campaignSkin: campaignLook.skinId,
                    totalSvgCount,
                    hasRawEmoji,
                    metaOv,
                    battleOv,
                };
            }"""
            )

            mc13_sim = mc13_check.get("sim") or {}
            add_check(
                "MC-13 5x 256px True-Alpha RGBA Icons (?v=33), Zero Inline SVG & Zero Raw Emoji",
                all(mc13_check.get("rgbaChecks", [False]))
                and len(mc13_check.get("rgbaChecks", [])) == 5
                and bool(mc13_check.get("lavaBtnImgOk"))
                and bool(mc13_check.get("gachaImgsOk"))
                and int(mc13_check.get("totalSvgCount", 1)) == 0
                and not bool(mc13_check.get("hasRawEmoji")),
                json.dumps(
                    {
                        "rgba5": mc13_check.get("rgbaChecks"),
                        "btnImg": mc13_check.get("lavaBtnImgOk"),
                        "gachaImgs": mc13_check.get("gachaImgsOk"),
                        "svgCount": mc13_check.get("totalSvgCount"),
                        "rawEmoji": mc13_check.get("hasRawEmoji"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-13 Volcano Lava Jump Breakout (Lobby Entry, Scrolling Lava Lake, Squad Hops Floating Platforms Steered by the Cannon, Per-Bobo Landing / Lava Falls, Gates Add Bobos, Telegraphed Eruptions, Falling Rocks, Cooled-Rock Shield, Exit Win / Timeout & Wipeout Loss, Tier-1 ~30s Autopilot Clear, Tier Scaling, 熔岩晶核 by Time + Survivors + Milestone)",
                bool(mc13_check.get("lavaBtnBeforeSled"))
                and ("熔岩晶核" in str(mc13_check.get("coreTxt", "")))
                and bool(mc13_check.get("inLava"))
                and bool(mc13_check.get("lavaHudVisible"))
                and bool(mc13_check.get("magma"))
                and bool(mc13_check.get("bottomHidden"))
                and float(mc13_check.get("distLive", 0)) > 25
                and int(mc13_check.get("rowsLive", 0)) >= 2
                and float(mc13_check.get("maxHop", 0)) > 1.4
                and int(mc13_check.get("bobosLive", 0)) >= int(mc13_check.get("startBobos", 99))
                and int(mc13_check.get("lavaLabelShown", 0)) >= 1
                and bool(mc13_check.get("reticleShown"))
                and ("剩余" in str(mc13_check.get("hudTimeTxt", "")))
                and ("波波" in str(mc13_check.get("hudBobosTxt", "")))
                and ("火山口" in str(mc13_check.get("hudCourseTxt", "")))
                and bool(mc13_check.get("lavaPillOk"))
                and ("冲出火山口" in str(mc13_check.get("modalTxt", "")))
                and bool(mc13_check.get("coresAwardedOnVictory"))
                and all(
                    bool(mc13_sim.get(k))
                    for k in (
                        "lavaSpawnedOnMagma",
                        "crowdHopsAndCourseScrolls",
                        "crowdSteersAndBobosFollow",
                        "landingOnPlatformKeepsBobos",
                        "missingPlatformDropsBobos",
                        "wideSquadLosesEdgeBobos",
                        "gateAddsBobos",
                        "eruptionTelegraphedThenKnocks",
                        "cooledShieldBlocksHazards",
                        "rockKnocksBobos",
                        "exitWinsStage",
                        "timeoutLosesStage",
                        "wipeoutLosesStage",
                        "autopilotClearsTier1",
                        "tiersScale",
                        "coresScaleWithTimeAndSurvivors",
                        "coresPersistedWithMilestone",
                    )
                ),
                json.dumps(
                    {
                        "lobbyBtn": mc13_check.get("lavaBtnBeforeSled"),
                        "inLava": mc13_check.get("inLava"),
                        "hud": mc13_check.get("lavaHudVisible"),
                        "bottomHidden": mc13_check.get("bottomHidden"),
                        "dist": round(float(mc13_check.get("distLive", 0)), 1),
                        "rows": mc13_check.get("rowsLive"),
                        "hop": round(float(mc13_check.get("maxHop", 0)), 2),
                        "bobos": [mc13_check.get("startBobos"), mc13_check.get("bobosLive")],
                        "label": mc13_check.get("lavaLabelShown"),
                        "reticle": mc13_check.get("reticleShown"),
                        "victoryCores": mc13_check.get("coresAwardedOnVictory"),
                        "stats": mc13_sim.get("stats"),
                        "landing": mc13_sim.get("landingOnPlatformKeepsBobos"),
                        "lavaFall": mc13_sim.get("missingPlatformDropsBobos"),
                        "wideSquad": mc13_sim.get("wideSquadLosesEdgeBobos"),
                        "gate": mc13_sim.get("gateAddsBobos"),
                        "eruption": mc13_sim.get("eruptionTelegraphedThenKnocks"),
                        "cooled": mc13_sim.get("cooledShieldBlocksHazards"),
                        "rock": mc13_sim.get("rockKnocksBobos"),
                        "exit": mc13_sim.get("exitWinsStage"),
                        "timeout": mc13_sim.get("timeoutLosesStage"),
                        "wipeout": mc13_sim.get("wipeoutLosesStage"),
                        "autoClear": mc13_sim.get("autopilotClearsTier1"),
                        "tiers": mc13_sim.get("tiersScale"),
                        "coreScale": mc13_sim.get("coresScaleWithTimeAndSurvivors"),
                        "milestone": mc13_sim.get("coresPersistedWithMilestone"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-13 Bobo Squad Skin Gacha Machine (Workshop Panel after Trophy Hall, 8 Skins in 4 Rarities, 熔岩晶核 / Coin Single & Ten Rolls via Real Buttons, Odds 55/30/12/3 with Injected Seeded RNG, 10-Roll 史诗+ & 50-Roll 传说 Pity, Duplicates -> Coins, Equip / Unequip & Persist)",
                bool(mc13_check.get("hasGacha"))
                and bool(mc13_check.get("gachaAfterHall"))
                and bool(mc13_check.get("relicStillFirst"))
                and int(mc13_check.get("skinCards", 0)) == 8
                and bool(mc13_check.get("singleOk"))
                and bool(mc13_check.get("tenGoldOk"))
                and bool(mc13_check.get("tenHasRare"))
                and bool(mc13_check.get("tenCoreOk"))
                and bool(mc13_check.get("collectionSynced"))
                and bool(mc13_check.get("oddsShown"))
                and ("保底" in str(mc13_check.get("pityTxt", "")) or "必出" in str(mc13_check.get("pityTxt", "")))
                and bool(mc13_check.get("equippedOk"))
                and bool(mc13_check.get("gachaSaved"))
                and bool(mc13_sim.get("gachaOddsDeterministic"))
                and bool(mc13_sim.get("gachaPityGuaranteesRare"))
                and bool(mc13_sim.get("gachaDuplicatesConvertToCoins"))
                and bool(mc13_sim.get("gachaCostsAndPersist")),
                json.dumps(
                    {
                        "cards": mc13_check.get("skinCards"),
                        "single": mc13_check.get("singleOk"),
                        "tenGold": mc13_check.get("tenGoldOk"),
                        "tenRare": mc13_check.get("tenHasRare"),
                        "tenCore": mc13_check.get("tenCoreOk"),
                        "owned": mc13_check.get("ownedAfter"),
                        "equip": mc13_check.get("eqId"),
                        "equipped": mc13_check.get("equippedOk"),
                        "saved": mc13_check.get("gachaSaved"),
                        "pity": mc13_check.get("pityTxt"),
                        "odds": [
                            (mc13_sim.get("stats") or {}).get(k) for k in ("oddsN", "oddsR", "oddsSR", "oddsSSR")
                        ],
                        "seeded": mc13_sim.get("gachaOddsDeterministic"),
                        "pityGuarantee": mc13_sim.get("gachaPityGuaranteesRare"),
                        "dupCoins": mc13_sim.get("gachaDuplicatesConvertToCoins"),
                        "costs": mc13_sim.get("gachaCostsAndPersist"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-13 Skin Look in All Modes (Tint + Material + Head Accessory on Every Bobo Trooper in Lava Jump & Campaign) & 熔岩晶核奖杯 in the Trophy Hall (Reads the Existing Lifetime Counter, Gold Buff)",
                bool(mc13_sim.get("skinChangesBobo3D"))
                and bool(mc13_sim.get("lavaTrophyReadsCounter"))
                and int(mc13_check.get("accLive", -1)) == int(mc13_check.get("bobosLive", -2))
                and int(mc13_check.get("accLive", 0)) > 0
                and int(mc13_check.get("campaignAcc", -1)) == int(mc13_check.get("campaignTroopers", -2))
                and int(mc13_check.get("campaignTroopers", 0)) > 0
                and mc13_check.get("campaignSkin") == mc13_check.get("eqId")
                and bool(mc13_check.get("skinPillOk"))
                and bool(mc13_check.get("lavaTrophyCard"))
                and int(mc13_check.get("hallCards", 0)) >= 10
                and int(mc13_check.get("lavaTrophyTier", 0)) == 3,
                json.dumps(
                    {
                        "lavaAcc": [mc13_check.get("accLive"), mc13_check.get("bobosLive")],
                        "campaignAcc": [mc13_check.get("campaignAcc"), mc13_check.get("campaignTroopers")],
                        "skin": mc13_check.get("campaignSkin"),
                        "pill": mc13_check.get("skinPillOk"),
                        "look3D": mc13_sim.get("skinChangesBobo3D"),
                        "trophyCard": mc13_check.get("lavaTrophyCard"),
                        "hallCards": mc13_check.get("hallCards"),
                        "trophyTier": mc13_check.get("lavaTrophyTier"),
                        "trophyReads": mc13_sim.get("lavaTrophyReadsCounter"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-14"):
            # MC-14 Verification: Asteroid Belt Shield Breakout & Bobo Squad Themed Lobby Decoration Hall
            mc14_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc14SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc14SelfCheck' };
                }
                const sim = w.runMc14SelfCheck();
                const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

                // Verify 5x MC-14 256x256 true-alpha RGBA PNG icons (?v=33) load cleanly with all 4 corners transparent
                const mc14Urls = [
                    '/assets/icons/ui_asteroid_dash.png?v=33',
                    '/assets/icons/ui_stardust_badge.png?v=33',
                    '/assets/icons/lobby_theme.png?v=33',
                    '/assets/icons/decor_lamp.png?v=33',
                    '/assets/icons/decor_plant.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc14Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 256; cv.height = 256;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const corners = [[0, 0], [255, 0], [0, 255], [255, 255]];
                        resolve(corners.every(([cx, cy]) => ctx2d.getImageData(cx, cy, 1, 1).data[3] === 0));
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                const s = w.state;
                s.gold = Math.max(s.gold, 60000);
                s.stardustBadges = 12;
                s.lifetimeStardustBadges = Math.max(s.lifetimeStardustBadges, 12);
                s.lavaCores = Math.max(s.lavaCores, 6);
                s.lifetimeLavaCores = Math.max(s.lifetimeLavaCores, s.lavaCores);
                s.ownedDecorThemes = ['navy_classic'];
                s.activeDecorTheme = 'navy_classic';
                s.ownedDecorProps = [];
                s.decorSlots = [null, null, null, null];
                s.save();
                w.syncLobbyDecor3D(true);

                // Lobby: #btn-start-asteroid-dash (above the lava jump card) with the 星尘徽章 counter
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const astBtn = document.getElementById('btn-start-asteroid-dash');
                const lavaBtn = document.getElementById('btn-start-lava-jump');
                const astBtnImg = astBtn?.querySelector('img');
                const astBtnImgOk = Boolean(astBtnImg && astBtnImg.complete && astBtnImg.naturalWidth > 0 && astBtnImg.src.includes('ui_asteroid_dash.png?v=33'));
                const badgeTxt = document.getElementById('stardust-badge-text')?.textContent?.trim() || '';
                const astBtnBeforeLava = Boolean(
                    astBtn && lavaBtn && (astBtn.compareDocumentPosition(lavaBtn) & Node.DOCUMENT_POSITION_FOLLOWING)
                );

                // Workshop -> #decor-hall: buy / apply themes and buy / place / move / remove props via the real buttons
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                const decor = document.getElementById('decor-hall');
                const gacha = document.getElementById('gacha-machine');
                const relicStand = document.getElementById('relic-banner-stand');
                const decorAfterGacha = Boolean(gacha && decor && (gacha.compareDocumentPosition(decor) & Node.DOCUMENT_POSITION_FOLLOWING));
                const relicStillFirst = document.querySelector('#menu-panel-meta .squad-finish-workbench') === relicStand;
                const themeCards = document.querySelectorAll('#decor-theme-grid .decor-theme-card').length;
                const propCards = document.querySelectorAll('#decor-prop-grid .decor-prop-card').length;
                const slotEls = document.querySelectorAll('#decor-slot-row .decor-slot').length;
                const goldBefore = s.gold;
                document.querySelector('#decor-theme-grid [data-decor-theme-buy="candy_pink"]')?.click();
                const pillTxt1 = document.getElementById('decor-active-pill')?.textContent || '';
                const themeBuyOk = s.activeDecorTheme === 'candy_pink' && s.gold === goldBefore - 1500 && pillTxt1.includes('草莓糖霜厅');
                const badgesBefore = s.stardustBadges;
                document.querySelector('#decor-theme-grid [data-decor-theme-buy="starlight_dome"]')?.click();
                const starThemeOk = s.activeDecorTheme === 'starlight_dome' && s.stardustBadges === badgesBefore - 5 && s.lifetimeStardustBadges >= 12;
                document.querySelector('#decor-theme-grid [data-decor-theme-apply="candy_pink"]')?.click();
                const applyOk = s.activeDecorTheme === 'candy_pink' &&
                    Boolean(document.querySelector('#decor-theme-grid .decor-theme-card.is-active[data-decor-theme="candy_pink"]'));
                const shortGlacier = Boolean(document.querySelector('#decor-theme-grid [data-decor-theme-buy="glacier_aurora"][disabled]')) || s.iceMedals >= 5;
                for (const pid of ['star_lamp', 'jelly_plant', 'squad_banner', 'stardust_globe']) {
                    document.querySelector(`#decor-prop-grid [data-decor-prop-buy="${pid}"]`)?.click();
                }
                const propsBought = s.ownedDecorProps.length === 4 && s.decorSlots.every(Boolean) &&
                    document.querySelectorAll('#decor-slot-row .decor-slot.is-filled').length === 4;
                document.querySelector('#decor-slot-row [data-decor-slot-clear="0"]')?.click();
                const slotCleared = s.decorSlots[0] === null && document.querySelectorAll('#decor-slot-row .decor-slot.is-filled').length === 3;
                document.querySelector('#decor-prop-grid [data-decor-prop-place="star_lamp"]')?.click();
                const placedBack = s.decorSlots[0] === 'star_lamp';
                document.querySelector('#decor-prop-grid [data-decor-prop-remove="jelly_plant"]')?.click();
                const removed = s.getDecorPropSlot('jelly_plant') === -1;
                document.querySelector('#decor-prop-grid [data-decor-prop-place="jelly_plant"]')?.click();
                const reown = s.getDecorPropSlot('jelly_plant') >= 0;
                const snap3d = w.getLobbyDecorSnapshot();
                const decor3dOk = snap3d.mounted && snap3d.themeId === 'candy_pink' && snap3d.props.length === 4 &&
                    snap3d.wallHex === 'f472b6';
                const savedD = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const decorSaved = savedD.activeDecorTheme === 'candy_pink' && Array.isArray(savedD.ownedDecorThemes) &&
                    savedD.ownedDecorThemes.length === 3 && Array.isArray(savedD.ownedDecorProps) && savedD.ownedDecorProps.length === 4 &&
                    Array.isArray(savedD.decorSlots) && savedD.decorSlots.filter(Boolean).length === 4 &&
                    savedD.stardustBadges === s.stardustBadges;
                const bannerTxt = document.getElementById('decor-bonus-banner')?.textContent || '';
                const comfort = s.getDecorComfort();
                const bonusOk = bannerTxt.includes('上限 +3%') && bannerTxt.includes('金币 +3%') && comfort === 7 &&
                    Math.abs(s.getDecorGoldMult() - 1.03) < 1e-9;
                await new Promise((r) => setTimeout(r, 80));
                const decorImgsOk = Array.from(document.querySelectorAll('#decor-hall img')).every((im) => im.complete && im.naturalWidth > 0);
                const starTrophyCard = Boolean(document.querySelector('#trophy-hall-grid [data-hall-trophy="stardust_badge"]'));
                const hallCards = document.querySelectorAll('#trophy-hall-grid .trophy-cabinet-card').length;
                const starTrophyTier = s.getHallTrophyTier('stardust_badge');
                const metaOv = document.documentElement.scrollWidth - window.innerWidth;

                // Lobby pedestal frame / 3D room follow the decor theme
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                await raf2();
                const pedBtn = document.getElementById('lobby-trophy-pedestal');
                const pedestalTheme = Boolean(pedBtn && pedBtn.dataset.decorTheme === 'candy_pink' &&
                    getComputedStyle(pedBtn).getPropertyValue('--decor-wall').trim() === '#ec4899');

                // Launch the Asteroid Dash via #btn-start-asteroid-dash
                const badgesBeforeRun = s.stardustBadges;
                document.getElementById('btn-start-asteroid-dash')?.click();
                await raf2();
                const ast = w.asteroidRun;
                const inAst = Boolean(
                    w.currentLevel && w.currentLevel.isAsteroidDash && ast && ast.active &&
                    w.asteroidGates.length >= 6 && w.asteroidMeteors.length >= 3 && w.asteroidBelts.length >= 3
                );
                const astHud = document.getElementById('asteroid-dash-hud');
                const astHudVisible = Boolean(astHud && !astHud.classList.contains('hidden'));
                const space = w.currentTheme.id === 'cyberhive' && !w.turretGroup.visible && w.scene.background && w.scene.background.getHex() === 0x060818;
                const hudBottom = document.querySelector('.hud-bottom');
                const bottomHidden = Boolean(hudBottom && getComputedStyle(hudBottom).display === 'none') &&
                    document.body.classList.contains('asteroid-mode-active');
                const startBobos = w.getLavaBoboCount();
                let distLive = 0;
                let gatesLive = 0;
                let minRide = 99;
                let maxRide = 0;
                if (ast) {
                    for (let step = 0; step < 160 && ast.active; step++) {
                        w.turretTargetX = w.getAsteroidAutopilotX();
                        w.update(0.05);
                        for (const u of w.units) {
                            if (u.active && u.team === 'blue') {
                                maxRide = Math.max(maxRide, u.rideY || 0);
                                minRide = Math.min(minRide, u.rideY || 0);
                            }
                        }
                    }
                    distLive = ast.distance;
                    gatesLive = w.getAsteroidGateProgress().reached;
                }
                await raf2();
                const bobosLive = w.asteroidBoboCount;
                const hudTimeTxt = document.getElementById('ast-hud-time-text')?.textContent?.trim() || '';
                const hudBobosTxt = document.getElementById('ast-hud-bobos-text')?.textContent?.trim() || '';
                const hudCourseTxt = document.getElementById('ast-hud-course-text')?.textContent?.trim() || '';
                const astPill = document.querySelector('#active-buffs-bar .asteroid-dash-pill');
                const decorPill = document.querySelector('#active-buffs-bar .decor-hall-pill');
                const astLabelShown = Array.from(document.querySelectorAll('.asteroid-dash-label')).filter(
                    (el) => el.style.display !== 'none'
                ).length;
                const battleOv = document.documentElement.scrollWidth - window.innerWidth;

                // Settle the run via the real stage-end callback
                if (w.onStageEnd) {
                    w.asteroidFinishSec = 28.4;
                    w.isPaused = true;
                    w.onStageEnd(true);
                }
                const badgesAfter = s.stardustBadges;
                const savedAfter = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const modalTxt = document.getElementById('modal-title')?.textContent || '';
                const modalDescTxt = document.getElementById('modal-desc')?.textContent || '';
                document.getElementById('btn-modal-home')?.click();

                const totalSvgCount = document.querySelectorAll('svg').length;
                const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
                const mc14TextSample = [
                    astBtn?.textContent || '',
                    decor?.textContent || '',
                    astHud?.textContent || '',
                    astPill?.textContent || '',
                    decorPill?.textContent || '',
                    modalTxt,
                    modalDescTxt,
                ].join(' ');
                const hasRawEmoji = emojiRe.test(mc14TextSample);

                return {
                    sim,
                    rgbaChecks,
                    astBtnImgOk,
                    badgeTxt,
                    astBtnBeforeLava,
                    hasDecor: Boolean(decor),
                    decorAfterGacha,
                    relicStillFirst,
                    themeCards,
                    propCards,
                    slotEls,
                    themeBuyOk,
                    starThemeOk,
                    applyOk,
                    shortGlacier,
                    propsBought,
                    slotCleared,
                    placedBack,
                    removed,
                    reown,
                    decor3dOk,
                    decorSaved,
                    bonusOk,
                    comfort,
                    decorImgsOk,
                    starTrophyCard,
                    hallCards,
                    starTrophyTier,
                    pedestalTheme,
                    inAst,
                    astHudVisible,
                    space,
                    bottomHidden,
                    startBobos,
                    distLive,
                    gatesLive,
                    floatSpan: maxRide - minRide,
                    bobosLive,
                    hudTimeTxt,
                    hudBobosTxt,
                    hudCourseTxt,
                    astPillOk: Boolean(astPill && astPill.textContent?.includes('星轨')),
                    decorPillOk: Boolean(decorPill && decorPill.textContent?.includes('装修舒适')),
                    astLabelShown,
                    badgesAwardedOnVictory:
                        badgesAfter > badgesBeforeRun &&
                        savedAfter.stardustBadges === badgesAfter &&
                        (savedAfter.asteroidDashClears || 0) >= 1,
                    modalTxt,
                    totalSvgCount,
                    hasRawEmoji,
                    metaOv,
                    battleOv,
                };
            }"""
            )

            mc14_sim = mc14_check.get("sim") or {}
            add_check(
                "MC-14 5x 256px True-Alpha RGBA Icons (?v=33), Zero Inline SVG & Zero Raw Emoji",
                all(mc14_check.get("rgbaChecks", [False]))
                and len(mc14_check.get("rgbaChecks", [])) == 5
                and bool(mc14_check.get("astBtnImgOk"))
                and bool(mc14_check.get("decorImgsOk"))
                and int(mc14_check.get("totalSvgCount", 1)) == 0
                and not bool(mc14_check.get("hasRawEmoji")),
                json.dumps(
                    {
                        "rgba5": mc14_check.get("rgbaChecks"),
                        "btnImg": mc14_check.get("astBtnImgOk"),
                        "decorImgs": mc14_check.get("decorImgsOk"),
                        "svgCount": mc14_check.get("totalSvgCount"),
                        "rawEmoji": mc14_check.get("hasRawEmoji"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-14 Asteroid Belt Shield Breakout (Lobby Entry, Dark-Space Track + Stars, Low-Gravity Floating Squad Steered by the Cannon, Unit Gates, Shield-Charge Gates Absorb Hits, Telegraphed Asteroid Strikes, Belt Gaps, Warp Exit Win / Timeout & Wipeout Loss, Tier-1 ~30s Autopilot Clear, Tier Scaling, 星尘徽章 by Time + Survivors + Milestone)",
                bool(mc14_check.get("astBtnBeforeLava"))
                and ("星尘徽章" in str(mc14_check.get("badgeTxt", "")))
                and bool(mc14_check.get("inAst"))
                and bool(mc14_check.get("astHudVisible"))
                and bool(mc14_check.get("space"))
                and bool(mc14_check.get("bottomHidden"))
                and float(mc14_check.get("distLive", 0)) > 25
                and int(mc14_check.get("gatesLive", 0)) >= 2
                and float(mc14_check.get("floatSpan", 0)) > 0.3
                and int(mc14_check.get("bobosLive", 0)) >= int(mc14_check.get("startBobos", 99))
                and int(mc14_check.get("astLabelShown", 0)) >= 1
                and ("剩余" in str(mc14_check.get("hudTimeTxt", "")))
                and ("波波" in str(mc14_check.get("hudBobosTxt", "")))
                and ("跃迁门" in str(mc14_check.get("hudCourseTxt", "")))
                and bool(mc14_check.get("astPillOk"))
                and ("跃迁门" in str(mc14_check.get("modalTxt", "")))
                and bool(mc14_check.get("badgesAwardedOnVictory"))
                and all(
                    bool(mc14_sim.get(k))
                    for k in (
                        "asteroidSpawnedInSpace",
                        "crowdFloatsAndCourseScrolls",
                        "crowdSteersAndBobosFollow",
                        "unitGateAddsBobos",
                        "shieldGateChargesShield",
                        "meteorTelegraphedThenKnocks",
                        "shieldAbsorbsHits",
                        "beltKnocksOutsideGap",
                        "beltGapSafe",
                        "warpExitWinsStage",
                        "timeoutLosesStage",
                        "wipeoutLosesStage",
                        "autopilotClearsTier1",
                        "tiersScale",
                        "badgesScaleWithTimeAndSurvivors",
                        "badgesPersistedWithMilestone",
                    )
                ),
                json.dumps(
                    {
                        "lobbyBtn": mc14_check.get("astBtnBeforeLava"),
                        "inAst": mc14_check.get("inAst"),
                        "hud": mc14_check.get("astHudVisible"),
                        "space": mc14_check.get("space"),
                        "bottomHidden": mc14_check.get("bottomHidden"),
                        "dist": round(float(mc14_check.get("distLive", 0)), 1),
                        "gates": mc14_check.get("gatesLive"),
                        "float": round(float(mc14_check.get("floatSpan", 0)), 2),
                        "bobos": [mc14_check.get("startBobos"), mc14_check.get("bobosLive")],
                        "label": mc14_check.get("astLabelShown"),
                        "victoryBadges": mc14_check.get("badgesAwardedOnVictory"),
                        "stats": mc14_sim.get("stats"),
                        "unitGate": mc14_sim.get("unitGateAddsBobos"),
                        "shieldGate": mc14_sim.get("shieldGateChargesShield"),
                        "meteor": mc14_sim.get("meteorTelegraphedThenKnocks"),
                        "shieldAbsorb": mc14_sim.get("shieldAbsorbsHits"),
                        "beltOut": mc14_sim.get("beltKnocksOutsideGap"),
                        "beltGap": mc14_sim.get("beltGapSafe"),
                        "warp": mc14_sim.get("warpExitWinsStage"),
                        "timeout": mc14_sim.get("timeoutLosesStage"),
                        "wipeout": mc14_sim.get("wipeoutLosesStage"),
                        "autoClear": mc14_sim.get("autopilotClearsTier1"),
                        "tiers": mc14_sim.get("tiersScale"),
                        "badgeScale": mc14_sim.get("badgesScaleWithTimeAndSurvivors"),
                        "milestone": mc14_sim.get("badgesPersistedWithMilestone"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-14 Themed Lobby Decoration Hall (Workshop Panel after Gacha, 6 Themes for Coins / Mode Currencies, 4 Props Bought / Placed / Moved / Removed via Real Buttons, Comfort Bonus +0.5%/pt Capped +3%, Lobby 3D Room + Pedestal Tint, Persist) & 星尘徽章奖杯 Reads the Existing Counter",
                bool(mc14_check.get("hasDecor"))
                and bool(mc14_check.get("decorAfterGacha"))
                and bool(mc14_check.get("relicStillFirst"))
                and int(mc14_check.get("themeCards", 0)) == 6
                and int(mc14_check.get("propCards", 0)) == 4
                and int(mc14_check.get("slotEls", 0)) == 4
                and bool(mc14_check.get("themeBuyOk"))
                and bool(mc14_check.get("starThemeOk"))
                and bool(mc14_check.get("applyOk"))
                and bool(mc14_check.get("shortGlacier"))
                and bool(mc14_check.get("propsBought"))
                and bool(mc14_check.get("slotCleared"))
                and bool(mc14_check.get("placedBack"))
                and bool(mc14_check.get("removed"))
                and bool(mc14_check.get("reown"))
                and bool(mc14_check.get("decor3dOk"))
                and bool(mc14_check.get("decorSaved"))
                and bool(mc14_check.get("bonusOk"))
                and bool(mc14_check.get("pedestalTheme"))
                and bool(mc14_check.get("decorPillOk"))
                and bool(mc14_check.get("starTrophyCard"))
                and int(mc14_check.get("hallCards", 0)) >= 10
                and int(mc14_check.get("starTrophyTier", 0)) == 2
                and all(
                    bool(mc14_sim.get(k))
                    for k in (
                        "stardustTrophyReadsCounter",
                        "decorThemeBuyApplyPersist",
                        "decorPropBuyPlacePersist",
                        "decorBonusTinyCapped",
                        "decorTintsPedestal3D",
                    )
                ),
                json.dumps(
                    {
                        "cards": [mc14_check.get("themeCards"), mc14_check.get("propCards"), mc14_check.get("slotEls")],
                        "buyTheme": mc14_check.get("themeBuyOk"),
                        "starTheme": mc14_check.get("starThemeOk"),
                        "apply": mc14_check.get("applyOk"),
                        "props": mc14_check.get("propsBought"),
                        "slotOps": [mc14_check.get("slotCleared"), mc14_check.get("placedBack"), mc14_check.get("removed"), mc14_check.get("reown")],
                        "room3D": mc14_check.get("decor3dOk"),
                        "saved": mc14_check.get("decorSaved"),
                        "comfort": mc14_check.get("comfort"),
                        "bonus": mc14_check.get("bonusOk"),
                        "pedestalTint": mc14_check.get("pedestalTheme"),
                        "pill": mc14_check.get("decorPillOk"),
                        "trophyCard": mc14_check.get("starTrophyCard"),
                        "hallCards": mc14_check.get("hallCards"),
                        "trophyTier": mc14_check.get("starTrophyTier"),
                        "trophyReads": mc14_sim.get("stardustTrophyReadsCounter"),
                        "simTheme": mc14_sim.get("decorThemeBuyApplyPersist"),
                        "simProps": mc14_sim.get("decorPropBuyPlacePersist"),
                        "simBonus": mc14_sim.get("decorBonusTinyCapped"),
                        "simTint": mc14_sim.get("decorTintsPedestal3D"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-15"):
            # MC-15 Verification: Haunted Castle Pumpkin Night & Bobo Squad Tactic Deck
            mc15_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc15SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc15SelfCheck' };
                }
                const sim = w.runMc15SelfCheck();
                const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

                // Verify 7x MC-15 256x256 true-alpha RGBA PNG icons (?v=33) load cleanly with all 4 corners transparent
                const mc15Urls = [
                    '/assets/icons/ui_pumpkin_night.png?v=33',
                    '/assets/icons/ui_pumpkin_badge.png?v=33',
                    '/assets/icons/ghost.png?v=33',
                    '/assets/icons/ui_tactic_deck.png?v=33',
                    '/assets/icons/card_shield.png?v=33',
                    '/assets/icons/card_rush.png?v=33',
                    '/assets/icons/card_crowd.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc15Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 256; cv.height = 256;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const corners = [[0, 0], [255, 0], [0, 255], [255, 255]];
                        resolve(corners.every(([cx, cy]) => ctx2d.getImageData(cx, cy, 1, 1).data[3] === 0));
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                const s = w.state;
                s.gold = Math.max(s.gold, 60000);
                s.stardustBadges = Math.max(s.stardustBadges, 6);
                s.lifetimeStardustBadges = Math.max(s.lifetimeStardustBadges, s.stardustBadges);
                s.trainGoldMedals = Math.max(s.trainGoldMedals, 4);
                s.lifetimeTrainGoldMedals = Math.max(s.lifetimeTrainGoldMedals, s.trainGoldMedals);
                s.pumpkinBadges = 4;
                s.lifetimePumpkinBadges = Math.max(s.lifetimePumpkinBadges, 4);
                s.deepPearls = 0;
                s.ownedTacticCards = [];
                s.tacticDeck = [null, null, null];
                s.save();

                // Lobby: #btn-start-pumpkin-night (above the asteroid card) with the 南瓜灯徽章 counter; tactic strip under the battle button
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const pkBtn = document.getElementById('btn-start-pumpkin-night');
                const astBtn = document.getElementById('btn-start-asteroid-dash');
                const pkBtnImg = pkBtn?.querySelector('img');
                const pkBtnImgOk = Boolean(pkBtnImg && pkBtnImg.complete && pkBtnImg.naturalWidth > 0 && pkBtnImg.src.includes('ui_pumpkin_night.png?v=33'));
                const pkBadgeTxt = document.getElementById('pumpkin-badge-text')?.textContent?.trim() || '';
                const pkBtnBeforeAst = Boolean(pkBtn && astBtn && (pkBtn.compareDocumentPosition(astBtn) & Node.DOCUMENT_POSITION_FOLLOWING));
                const battleBtn = document.getElementById('btn-start-battle');
                const strip = document.getElementById('lobby-tactic-deck');
                const stripAfterBattle = Boolean(battleBtn && strip && (battleBtn.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING));
                const lobbyEmptySlots = document.querySelectorAll('#lobby-tactic-slots .lobby-tactic-slot.is-empty').length;

                // Lobby "编组" -> workshop #tactic-deck (after the decoration hall); unlock / slot / swap via the real buttons
                document.getElementById('btn-lobby-tactic-edit')?.click();
                const metaActive = Boolean(document.getElementById('menu-panel-meta')?.classList.contains('active'));
                const deckEl = document.getElementById('tactic-deck');
                const decorEl = document.getElementById('decor-hall');
                const deckAfterDecor = Boolean(decorEl && deckEl && (decorEl.compareDocumentPosition(deckEl) & Node.DOCUMENT_POSITION_FOLLOWING));
                const cardCount = document.querySelectorAll('#tactic-card-grid .tactic-card').length;
                const slotCount = document.querySelectorAll('#tactic-deck-slots .tactic-slot').length;
                const pearlShortDisabled = Boolean(document.querySelector('#tactic-card-grid [data-tactic-buy="shield_crisis"][disabled]'));
                const goldBefore = s.gold;
                document.querySelector('#tactic-card-grid [data-tactic-buy="shield_open"]')?.click();
                const goldBuyOk = s.gold === goldBefore - 1200 && s.tacticDeck[0] === 'shield_open';
                const starBefore = s.stardustBadges;
                const starLifeBefore = s.lifetimeStardustBadges;
                document.querySelector('#tactic-card-grid [data-tactic-buy="rush_half"]')?.click();
                const modeBuyOk = s.stardustBadges === starBefore - 3 && s.lifetimeStardustBadges === starLifeBefore && s.tacticDeck[1] === 'rush_half';
                document.querySelector('#tactic-card-grid [data-tactic-buy="crowd_crisis"]')?.click();
                document.querySelector('#tactic-card-grid [data-tactic-buy="crowd_final"]')?.click();
                const deckFull = s.tacticDeck.join(',') === 'shield_open,rush_half,crowd_crisis' && s.ownedTacticCards.includes('crowd_final');
                const equipDisabledWhenFull = Boolean(document.querySelector('#tactic-card-grid [data-tactic-equip="crowd_final"][disabled]'));
                document.querySelector('#tactic-deck-slots [data-tactic-slot-clear="1"]')?.click();
                const slotCleared = s.tacticDeck[1] === null && document.querySelectorAll('#tactic-deck-slots .tactic-slot.is-filled').length === 2;
                document.querySelector('#tactic-card-grid [data-tactic-equip="crowd_final"]')?.click();
                const swappedIn = s.tacticDeck[1] === 'crowd_final';
                document.querySelector('#tactic-card-grid [data-tactic-unequip="crowd_final"]')?.click();
                document.querySelector('#tactic-card-grid [data-tactic-equip="rush_half"]')?.click();
                const swappedBack = s.tacticDeck.join(',') === 'shield_open,rush_half,crowd_crisis';
                const savedT = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const tacticSaved = Array.isArray(savedT.ownedTacticCards) && savedT.ownedTacticCards.length === 4 &&
                    JSON.stringify(savedT.tacticDeck) === JSON.stringify(['shield_open', 'rush_half', 'crowd_crisis']) &&
                    savedT.stardustBadges === s.stardustBadges;
                const ruleTxt = document.getElementById('tactic-rule-banner')?.textContent || '';
                const ruleOk = ruleTxt.includes('≤24') && ruleTxt.includes('≤16') && ruleTxt.includes('+25%');
                await new Promise((r) => setTimeout(r, 80));
                const tacticImgsOk = Array.from(document.querySelectorAll('#tactic-deck img')).every((im) => im.complete && im.naturalWidth > 0);
                const pumpkinTrophyCard = Boolean(document.querySelector('#trophy-hall-grid [data-hall-trophy="pumpkin_badge"]'));
                const hallCards = document.querySelectorAll('#trophy-hall-grid .trophy-cabinet-card').length;
                const pumpkinTrophyTier = s.getHallTrophyTier('pumpkin_badge');
                const metaOv = document.documentElement.scrollWidth - window.innerWidth;

                // The lobby strip mirrors the deck
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                await raf2();
                await new Promise((r) => setTimeout(r, 60));
                const lobbyFilledEls = Array.from(document.querySelectorAll('#lobby-tactic-slots .lobby-tactic-slot.is-filled'));
                const lobbyFilled = lobbyFilledEls.length === 3 && lobbyFilledEls.every((el) => {
                    const im = el.querySelector('img');
                    return Boolean(im && im.complete && im.naturalWidth > 0);
                });
                const lobbySub = document.getElementById('lobby-tactic-sub')?.textContent || '';

                // Campaign battle: the battle HUD shows the 3 cards and the start card fires 1 s in
                document.getElementById('btn-start-battle')?.click();
                await raf2();
                const tHud = document.getElementById('tactic-deck-hud');
                const hudChipsAtStart = tHud ? tHud.querySelectorAll('.tactic-hud-chip').length : 0;
                const hudVisibleAtStart = Boolean(tHud && !tHud.classList.contains('hidden'));
                for (let i = 0; i < 30; i++) w.update(0.05);
                await raf2();
                const tr = w.tacticRun;
                const startFired = Boolean(tr && tr.cards[0] && tr.cards[0].id === 'shield_open' && tr.cards[0].fired && tr.shieldsGranted >= 1);
                const chip0 = tHud?.querySelector('.tactic-hud-chip[data-tactic-hud="shield_open"]');
                const chip0Fired = Boolean(chip0 && chip0.classList.contains('is-fired') && (chip0.textContent || '').includes('护盾'));
                const battleHudFit = Boolean(tHud) && Array.from(tHud.querySelectorAll('.tactic-hud-chip')).every((c) => {
                    const r = c.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth && r.width > 40;
                });
                const battleTacticOv = document.documentElement.scrollWidth - window.innerWidth;
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();

                // Launch the Haunted Castle Pumpkin Night via #btn-start-pumpkin-night
                const badgesBeforeRun = s.pumpkinBadges;
                document.getElementById('btn-start-pumpkin-night')?.click();
                await raf2();
                const pk = w.pumpkinRun;
                const inPk = Boolean(
                    w.currentLevel && w.currentLevel.isPumpkinNight && pk && pk.active &&
                    w.pumpkinGates.length >= 6 && w.pumpkinLamps.length >= 3 && w.pumpkinGhosts.length >= 4 && w.pumpkinWalls.length >= 3
                );
                const pkHud = document.getElementById('pumpkin-night-hud');
                const pkHudVisible = Boolean(pkHud && !pkHud.classList.contains('hidden'));
                const night = w.currentTheme.id === 'royal' && !w.turretGroup.visible && Boolean(w.scene.background) &&
                    w.scene.background.getHex() === 0x120c2c;
                const hudBottom = document.querySelector('.hud-bottom');
                const bottomHidden = Boolean(hudBottom && getComputedStyle(hudBottom).display === 'none') &&
                    document.body.classList.contains('pumpkin-mode-active');
                const startBobos = w.getLavaBoboCount();
                let distLive = 0;
                let gatesLive = 0;
                let ghostSeen = false;
                let minLight = 999;
                if (pk) {
                    for (let step = 0; step < 220 && pk.active; step++) {
                        w.turretTargetX = w.getPumpkinAutopilotX();
                        w.update(0.05);
                        minLight = Math.min(minLight, pk.light);
                        if (w.pumpkinGhosts.some((g) => g.emerged && g.group.visible)) ghostSeen = true;
                    }
                    distLive = pk.distance;
                    gatesLive = w.getPumpkinGateProgress().reached;
                }
                await raf2();
                const bobosLive = w.pumpkinBoboCount;
                const lampsLit = w.pumpkinLampsLit;
                const hudTimeTxt = document.getElementById('pk-hud-time-text')?.textContent?.trim() || '';
                const hudLightTxt = document.getElementById('pk-hud-light-text')?.textContent?.trim() || '';
                const hudCourseTxt = document.getElementById('pk-hud-course-text')?.textContent?.trim() || '';
                const pkLabelShown = Array.from(document.querySelectorAll('.pumpkin-night-label')).filter((el) => el.style.display !== 'none').length;
                const pkTactic = w.tacticRun;
                const pkTacticFired = Boolean(pkTactic && pkTactic.cards[0] && pkTactic.cards[0].fired);
                const pkTacticChips = document.querySelectorAll('#tactic-deck-hud .tactic-hud-chip').length;
                const pkPill = document.querySelector('#active-buffs-bar .pumpkin-night-pill');
                const tacticPill = document.querySelector('#active-buffs-bar .tactic-deck-pill');
                const battleOv = document.documentElement.scrollWidth - window.innerWidth;

                // Settle the run via the real stage-end callback
                if (w.onStageEnd) {
                    w.pumpkinFinishSec = 29.4;
                    w.isPaused = true;
                    w.onStageEnd(true);
                }
                const badgesAfter = s.pumpkinBadges;
                const savedAfter = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const modalTxt = document.getElementById('modal-title')?.textContent || '';
                const modalDescTxt = document.getElementById('modal-desc')?.textContent || '';
                const replayTxt = document.getElementById('btn-modal-replay')?.textContent || '';
                document.getElementById('btn-modal-home')?.click();

                const totalSvgCount = document.querySelectorAll('svg').length;
                const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
                const mc15TextSample = [
                    pkBtn?.textContent || '',
                    strip?.textContent || '',
                    deckEl?.textContent || '',
                    pkHud?.textContent || '',
                    tHud?.textContent || '',
                    pkPill?.textContent || '',
                    tacticPill?.textContent || '',
                    modalTxt,
                    modalDescTxt,
                ].join(' ');
                const hasRawEmoji = emojiRe.test(mc15TextSample);

                return {
                    sim,
                    rgbaChecks,
                    pkBtnImgOk,
                    pkBadgeTxt,
                    pkBtnBeforeAst,
                    stripAfterBattle,
                    lobbyEmptySlots,
                    metaActive,
                    deckAfterDecor,
                    cardCount,
                    slotCount,
                    pearlShortDisabled,
                    goldBuyOk,
                    modeBuyOk,
                    deckFull,
                    equipDisabledWhenFull,
                    slotCleared,
                    swappedIn,
                    swappedBack,
                    tacticSaved,
                    ruleOk,
                    tacticImgsOk,
                    pumpkinTrophyCard,
                    hallCards,
                    pumpkinTrophyTier,
                    lobbyFilled,
                    lobbySub,
                    hudChipsAtStart,
                    hudVisibleAtStart,
                    startFired,
                    chip0Fired,
                    battleHudFit,
                    battleTacticOv,
                    inPk,
                    pkHudVisible,
                    night,
                    bottomHidden,
                    startBobos,
                    distLive,
                    gatesLive,
                    ghostSeen,
                    minLight,
                    bobosLive,
                    lampsLit,
                    hudTimeTxt,
                    hudLightTxt,
                    hudCourseTxt,
                    pkLabelShown,
                    pkTacticFired,
                    pkTacticChips,
                    pkPillOk: Boolean(pkPill && pkPill.textContent?.includes('灯光')),
                    tacticPillOk: Boolean(tacticPill && tacticPill.textContent?.includes('战术卡')),
                    badgesAwardedOnVictory:
                        badgesAfter > badgesBeforeRun &&
                        savedAfter.pumpkinBadges === badgesAfter &&
                        (savedAfter.pumpkinNightClears || 0) >= 1,
                    modalTxt,
                    replayTxt,
                    totalSvgCount,
                    hasRawEmoji,
                    metaOv,
                    battleOv,
                };
            }"""
            )

            mc15_sim = mc15_check.get("sim") or {}
            add_check(
                "MC-15 7x 256px True-Alpha RGBA Icons (?v=33), Zero Inline SVG & Zero Raw Emoji",
                all(mc15_check.get("rgbaChecks", [False]))
                and len(mc15_check.get("rgbaChecks", [])) == 7
                and bool(mc15_check.get("pkBtnImgOk"))
                and bool(mc15_check.get("tacticImgsOk"))
                and bool(mc15_check.get("lobbyFilled"))
                and int(mc15_check.get("totalSvgCount", 1)) == 0
                and not bool(mc15_check.get("hasRawEmoji")),
                json.dumps(
                    {
                        "rgba7": mc15_check.get("rgbaChecks"),
                        "btnImg": mc15_check.get("pkBtnImgOk"),
                        "deckImgs": mc15_check.get("tacticImgsOk"),
                        "lobbyImgs": mc15_check.get("lobbyFilled"),
                        "svgCount": mc15_check.get("totalSvgCount"),
                        "rawEmoji": mc15_check.get("hasRawEmoji"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-15 Haunted Castle Pumpkin Night (Lobby Entry, Own Night-Castle Scene not the Carnival, Marching Squad Steered by the Cannon, Unit Gates, Lantern Light Drain + Lit-Zone Refill, Wall-Phasing Ghost Intercepts Dispelled by Lit Zone / Lantern or Scaring Bobos, Shields Absorb, Archway Walls, Darkness Slows, Castle-Gate Win / Timeout & Wipeout Loss, Tier-1 ~30s Autopilot Clear, Tier Scaling, 南瓜灯徽章 by Time + Survivors + Dispels + Milestone & Trophy)",
                bool(mc15_check.get("pkBtnBeforeAst"))
                and ("南瓜灯徽章" in str(mc15_check.get("pkBadgeTxt", "")))
                and bool(mc15_check.get("inPk"))
                and bool(mc15_check.get("pkHudVisible"))
                and bool(mc15_check.get("night"))
                and bool(mc15_check.get("bottomHidden"))
                and float(mc15_check.get("distLive", 0)) > 60
                and int(mc15_check.get("gatesLive", 0)) >= 1
                and bool(mc15_check.get("ghostSeen"))
                and float(mc15_check.get("minLight", 999)) < 100
                and int(mc15_check.get("bobosLive", 0)) >= int(mc15_check.get("startBobos", 99))
                and int(mc15_check.get("pkLabelShown", 0)) >= 1
                and ("剩余" in str(mc15_check.get("hudTimeTxt", "")))
                and ("灯光" in str(mc15_check.get("hudLightTxt", "")))
                and ("城门" in str(mc15_check.get("hudCourseTxt", "")))
                and bool(mc15_check.get("pkPillOk"))
                and ("古堡" in str(mc15_check.get("modalTxt", "")))
                and bool(mc15_check.get("badgesAwardedOnVictory"))
                and bool(mc15_check.get("pumpkinTrophyCard"))
                and int(mc15_check.get("hallCards", 0)) >= 10
                and all(
                    bool(mc15_sim.get(k))
                    for k in (
                        "pumpkinSpawnedAtNight",
                        "crowdMarchesAndCourseScrolls",
                        "crowdSteersAndBobosFollow",
                        "unitGateAddsBobos",
                        "lampZoneRefillsLight",
                        "ghostPhasesThroughWallThenScares",
                        "lanternDispelsGhost",
                        "lampZoneDispelsHauntGhost",
                        "shieldAbsorbsGhostTouch",
                        "wallKnocksOutsideArch",
                        "archDoorSafe",
                        "darknessSlowsPace",
                        "exitGateWinsStage",
                        "timeoutLosesStage",
                        "wipeoutLosesStage",
                        "autopilotClearsTier1",
                        "tiersScale",
                        "badgesScaleWithTimeSurvivorsAndDispels",
                        "badgesPersistedWithMilestone",
                        "pumpkinTrophyReadsCounter",
                    )
                ),
                json.dumps(
                    {
                        "lobbyBtn": mc15_check.get("pkBtnBeforeAst"),
                        "badge": mc15_check.get("pkBadgeTxt"),
                        "inPk": mc15_check.get("inPk"),
                        "hud": mc15_check.get("pkHudVisible"),
                        "night": mc15_check.get("night"),
                        "bottomHidden": mc15_check.get("bottomHidden"),
                        "dist": round(float(mc15_check.get("distLive", 0)), 1),
                        "gates": mc15_check.get("gatesLive"),
                        "ghostSeen": mc15_check.get("ghostSeen"),
                        "minLight": round(float(mc15_check.get("minLight", 0)), 1),
                        "lampsLit": mc15_check.get("lampsLit"),
                        "bobos": [mc15_check.get("startBobos"), mc15_check.get("bobosLive")],
                        "label": mc15_check.get("pkLabelShown"),
                        "victoryBadges": mc15_check.get("badgesAwardedOnVictory"),
                        "trophy": [mc15_check.get("pumpkinTrophyCard"), mc15_check.get("hallCards"), mc15_check.get("pumpkinTrophyTier")],
                        "stats": mc15_sim.get("stats"),
                        "sim": {k: v for k, v in mc15_sim.items() if k not in ("stats",) and not k.startswith("tactic")},
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-15 Bobo Squad Tactic Deck (Lobby Strip under the Battle Button + Workshop Panel after Decor Hall, 9 Cards Unlocked with Coins / Mode Currencies (Lifetime Kept), 3 Slots Equip / Clear / Swap / Full-Deck Lock via Real Buttons, Persist, Battle HUD Chips, Start / Half / Final / Crisis Triggers Fire Once, Shield ≤24 · Crowd ≤16 · Rush ≤+25% Caps, Rush Speeds Squad Runs)",
                bool(mc15_check.get("stripAfterBattle"))
                and int(mc15_check.get("lobbyEmptySlots", 0)) == 3
                and bool(mc15_check.get("metaActive"))
                and bool(mc15_check.get("deckAfterDecor"))
                and int(mc15_check.get("cardCount", 0)) == 9
                and int(mc15_check.get("slotCount", 0)) == 3
                and bool(mc15_check.get("pearlShortDisabled"))
                and bool(mc15_check.get("goldBuyOk"))
                and bool(mc15_check.get("modeBuyOk"))
                and bool(mc15_check.get("deckFull"))
                and bool(mc15_check.get("equipDisabledWhenFull"))
                and bool(mc15_check.get("slotCleared"))
                and bool(mc15_check.get("swappedIn"))
                and bool(mc15_check.get("swappedBack"))
                and bool(mc15_check.get("tacticSaved"))
                and bool(mc15_check.get("ruleOk"))
                and bool(mc15_check.get("lobbyFilled"))
                and ("3/3" in str(mc15_check.get("lobbySub", "")))
                and int(mc15_check.get("hudChipsAtStart", 0)) == 3
                and bool(mc15_check.get("hudVisibleAtStart"))
                and bool(mc15_check.get("startFired"))
                and bool(mc15_check.get("chip0Fired"))
                and bool(mc15_check.get("battleHudFit"))
                and bool(mc15_check.get("pkTacticFired"))
                and int(mc15_check.get("pkTacticChips", 0)) == 3
                and bool(mc15_check.get("tacticPillOk"))
                and ("战术卡组" in str(mc15_check.get("replayTxt", "")))
                and all(
                    bool(mc15_sim.get(k))
                    for k in (
                        "tacticBuyEquipPersist",
                        "tacticStartCardsFireInBattle",
                        "tacticConditionCardsFireOnce",
                        "tacticEffectsCapped",
                        "tacticRushSpeedsUpSquad",
                    )
                ),
                json.dumps(
                    {
                        "lobby": [mc15_check.get("stripAfterBattle"), mc15_check.get("lobbyEmptySlots"), mc15_check.get("lobbyFilled"), mc15_check.get("lobbySub")],
                        "panel": [mc15_check.get("metaActive"), mc15_check.get("deckAfterDecor"), mc15_check.get("cardCount"), mc15_check.get("slotCount")],
                        "buy": [mc15_check.get("pearlShortDisabled"), mc15_check.get("goldBuyOk"), mc15_check.get("modeBuyOk"), mc15_check.get("deckFull")],
                        "slots": [mc15_check.get("equipDisabledWhenFull"), mc15_check.get("slotCleared"), mc15_check.get("swappedIn"), mc15_check.get("swappedBack")],
                        "saved": mc15_check.get("tacticSaved"),
                        "rules": mc15_check.get("ruleOk"),
                        "battleHud": [mc15_check.get("hudChipsAtStart"), mc15_check.get("hudVisibleAtStart"), mc15_check.get("startFired"), mc15_check.get("chip0Fired"), mc15_check.get("battleHudFit")],
                        "pumpkinHud": [mc15_check.get("pkTacticFired"), mc15_check.get("pkTacticChips")],
                        "replay": mc15_check.get("replayTxt"),
                        "sim": {k: v for k, v in mc15_sim.items() if k.startswith("tactic")},
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-16"):
            # MC-16 Verification: Desert Pyramid Trap Run & Tactic Deck Balance (campaign coefficient / switch, mode cases)
            mc16_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc16SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc16SelfCheck' };
                }
                const sim = w.runMc16SelfCheck();
                const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

                // Verify 5x MC-16 256x256 true-alpha RGBA PNG icons (?v=33) load cleanly with all 4 corners transparent
                const mc16Urls = [
                    '/assets/icons/ui_pyramid_run.png?v=33',
                    '/assets/icons/ui_scarab_badge.png?v=33',
                    '/assets/icons/quicksand_trap.png?v=33',
                    '/assets/icons/flip_slab.png?v=33',
                    '/assets/icons/tactic_balance.png?v=33',
                ];
                const rgbaChecks = await Promise.all(mc16Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        if (img.naturalWidth !== 256 || img.naturalHeight !== 256) {
                            resolve(false);
                            return;
                        }
                        const cv = document.createElement('canvas');
                        cv.width = 256; cv.height = 256;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const corners = [[0, 0], [255, 0], [0, 255], [255, 255]];
                        resolve(corners.every(([cx, cy]) => ctx2d.getImageData(cx, cy, 1, 1).data[3] === 0));
                    };
                    img.onerror = () => resolve(false);
                    img.src = u;
                })));

                const s = w.state;
                s.gold = Math.max(s.gold, 60000);
                s.scarabBadges = 4;
                s.lifetimeScarabBadges = Math.max(s.lifetimeScarabBadges, 4);
                s.ownedTacticCards = ['shield_open', 'rush_open', 'crowd_open'];
                s.tacticDeck = ['shield_open', 'rush_open', 'crowd_open'];
                s.tacticCampaignEnabled = true;
                s.save();

                // Lobby: #btn-start-pyramid-run (above the pumpkin card) with the 圣甲虫徽章 counter; strip shows the coefficient
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                await raf2();
                const pyBtn = document.getElementById('btn-start-pyramid-run');
                const pkBtn = document.getElementById('btn-start-pumpkin-night');
                const pyBtnImg = pyBtn?.querySelector('img');
                const pyBtnImgOk = Boolean(pyBtnImg && pyBtnImg.complete && pyBtnImg.naturalWidth > 0 && pyBtnImg.src.includes('ui_pyramid_run.png?v=33'));
                const pyBadgeImg = document.querySelector('#pyramid-run-badge img');
                const pyBadgeImgOk = Boolean(pyBadgeImg && pyBadgeImg.complete && pyBadgeImg.naturalWidth > 0 && pyBadgeImg.src.includes('ui_scarab_badge.png?v=33'));
                const pyBadgeTxt = document.getElementById('scarab-badge-text')?.textContent?.trim() || '';
                const pyBtnBeforePk = Boolean(pyBtn && pkBtn && (pyBtn.compareDocumentPosition(pkBtn) & Node.DOCUMENT_POSITION_FOLLOWING));
                const lobbySubOn = document.getElementById('lobby-tactic-sub')?.textContent || '';

                // Workshop balance row: coefficient + scaled caps, the real toggle button switches the campaign deck off / on
                document.getElementById('btn-lobby-tactic-edit')?.click();
                await raf2();
                const balRow = document.getElementById('tactic-balance-row');
                const deckEl = document.getElementById('tactic-deck');
                const balInDeck = Boolean(balRow && deckEl && deckEl.contains(balRow));
                const balImg = balRow?.querySelector('img');
                const balImgOk = Boolean(balImg && balImg.complete && balImg.naturalWidth > 0 && balImg.src.includes('tactic_balance.png?v=33'));
                const balTitleOn = document.getElementById('tactic-balance-title')?.textContent || '';
                const balTextOn = document.getElementById('tactic-balance-text')?.textContent || '';
                const cardCampTags = Array.from(document.querySelectorAll('#tactic-card-grid .tactic-card-camp')).map((e) => e.textContent || '');
                const toggleBtn = document.getElementById('btn-tactic-campaign-toggle');
                toggleBtn?.click();
                await raf2();
                const savedOff = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const offOk = s.tacticCampaignEnabled === false && savedOff.tacticCampaignEnabled === false &&
                    (document.getElementById('tactic-balance-title')?.textContent || '').includes('关闭') &&
                    Boolean(toggleBtn?.classList.contains('is-off'));
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                const lobbySubOff = document.getElementById('lobby-tactic-sub')?.textContent || '';
                document.getElementById('btn-start-battle')?.click();
                await raf2();
                const campOffNoDeck = w.tacticRun === null && Boolean(document.getElementById('tactic-deck-hud')?.classList.contains('hidden'));
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.getElementById('btn-lobby-tactic-edit')?.click();
                document.getElementById('btn-tactic-campaign-toggle')?.click();
                const onAgain = s.tacticCampaignEnabled === true;
                const metaOv = document.documentElement.scrollWidth - window.innerWidth;

                // Campaign battle: the battle HUD carries the ×0.6 tag and the start cards deliver scaled values
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-battle')?.click();
                await raf2();
                for (let i = 0; i < 30; i++) w.update(0.05);
                await raf2();
                const trC = w.tacticRun;
                const campScaled = Boolean(trC && trC.isCampaign && trC.effectMult === 0.6 && trC.cards[0].fired && trC.shieldsGranted >= 1 && trC.shieldsGranted <= 6 && trC.bobosAdded === 4 && trC.cards[2].resultText.includes('+4'));
                const scaleTag = document.querySelector('#tactic-deck-hud .tactic-hud-scale');
                const scaleTagOk = Boolean(scaleTag && (scaleTag.textContent || '').includes('0.6'));
                const campPill = document.querySelector('#active-buffs-bar .tactic-deck-pill')?.textContent || '';
                const campHudFit = Array.from(document.querySelectorAll('#tactic-deck-hud > *')).every((c) => {
                    const r = c.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth;
                });
                const battleTacticOv = document.documentElement.scrollWidth - window.innerWidth;
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();

                // Launch the Desert Pyramid Trap Run via #btn-start-pyramid-run
                const badgesBeforeRun = s.scarabBadges;
                document.getElementById('btn-start-pyramid-run')?.click();
                await raf2();
                const py = w.pyramidRun;
                const inPy = Boolean(
                    w.currentLevel && w.currentLevel.isPyramidRun && py && py.active &&
                    w.pyramidGates.length >= 6 && w.pyramidSands.length >= 3 && w.pyramidSlabRows.length >= 3
                );
                const pyHud = document.getElementById('pyramid-run-hud');
                const pyHudVisible = Boolean(pyHud && !pyHud.classList.contains('hidden'));
                const sceneSnap = w.getDedicatedSceneSnapshot();
                const desert = sceneSnap.kind === 'desert' && sceneSnap.skyHex === 0xf2b46b && !sceneSnap.landmarks && !w.turretGroup.visible;
                const hudBottom = document.querySelector('.hud-bottom');
                const bottomHidden = Boolean(hudBottom && getComputedStyle(hudBottom).display === 'none') &&
                    document.body.classList.contains('pyramid-mode-active');
                const lobbyFullStrength = Boolean(w.tacticRun && !w.tacticRun.isCampaign && w.tacticRun.effectMult === 1);
                const startBobos = w.getLavaBoboCount();
                let distLive = 0;
                let gatesLive = 0;
                let sandSeen = false;
                let slabOpenSeen = false;
                for (let step = 0; step < 220 && py && py.active; step++) {
                    w.turretTargetX = w.getPyramidAutopilotX();
                    w.update(0.05);
                    if (w.pyramidSands.some((b) => b.group.visible)) sandSeen = true;
                    if (w.pyramidSlabRows.some((r) => r.group.visible && r.slabs.some((x) => x.state === 'open'))) slabOpenSeen = true;
                }
                if (py) {
                    distLive = py.distance;
                    gatesLive = w.getPyramidGateProgress().reached;
                }
                await raf2();
                const bobosLive = w.pyramidBoboCount;
                const trapsLive = w.getPyramidTrapProgress();
                const hudTimeTxt = document.getElementById('py-hud-time-text')?.textContent?.trim() || '';
                const hudSandTxt = document.getElementById('py-hud-sand-text')?.textContent?.trim() || '';
                const hudCourseTxt = document.getElementById('py-hud-course-text')?.textContent?.trim() || '';
                const pyHudImgsOk = Array.from(pyHud ? pyHud.querySelectorAll('img') : []).every((im) => im.complete && im.naturalWidth > 0);
                const pyLabelShown = Array.from(document.querySelectorAll('.pyramid-run-label')).filter((el) => el.style.display !== 'none').length;
                const pyPill = document.querySelector('#active-buffs-bar .pyramid-run-pill');
                const pyTacticChips = document.querySelectorAll('#tactic-deck-hud .tactic-hud-chip').length;
                const pyNoScaleTag = !document.querySelector('#tactic-deck-hud .tactic-hud-scale');
                const battleOv = document.documentElement.scrollWidth - window.innerWidth;

                // Settle the run via the real stage-end callback
                if (w.onStageEnd) {
                    w.pyramidFinishSec = 29.6;
                    w.isPaused = true;
                    w.onStageEnd(true);
                }
                const badgesAfter = s.scarabBadges;
                const savedAfter = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const modalTxt = document.getElementById('modal-title')?.textContent || '';
                const modalDescTxt = document.getElementById('modal-desc')?.textContent || '';
                const replayTxt = document.getElementById('btn-modal-replay')?.textContent || '';
                const nextTxt = document.getElementById('btn-modal-next')?.textContent || '';
                document.getElementById('btn-modal-home')?.click();
                await raf2();
                const scarabTrophyCard = Boolean(document.querySelector('#trophy-hall-grid [data-hall-trophy="scarab_badge"]'));
                const hallCards = document.querySelectorAll('#trophy-hall-grid .trophy-cabinet-card').length;

                const totalSvgCount = document.querySelectorAll('svg').length;
                const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
                const mc16TextSample = [
                    pyBtn?.textContent || '',
                    balRow?.textContent || '',
                    pyHud?.textContent || '',
                    pyPill?.textContent || '',
                    campPill,
                    modalTxt,
                    modalDescTxt,
                ].join(' ');
                const hasRawEmoji = emojiRe.test(mc16TextSample);

                return {
                    sim,
                    rgbaChecks,
                    pyBtnImgOk,
                    pyBadgeImgOk,
                    pyBadgeTxt,
                    pyBtnBeforePk,
                    lobbySubOn,
                    lobbySubOff,
                    balInDeck,
                    balImgOk,
                    balTitleOn,
                    balTextOn,
                    cardCampTags,
                    offOk,
                    campOffNoDeck,
                    onAgain,
                    campScaled,
                    scaleTagOk,
                    campPill,
                    campHudFit,
                    inPy,
                    pyHudVisible,
                    desert,
                    bottomHidden,
                    lobbyFullStrength,
                    startBobos,
                    distLive,
                    gatesLive,
                    sandSeen,
                    slabOpenSeen,
                    bobosLive,
                    trapsLive,
                    hudTimeTxt,
                    hudSandTxt,
                    hudCourseTxt,
                    pyHudImgsOk,
                    pyLabelShown,
                    pyPillOk: Boolean(pyPill && pyPill.textContent?.includes('墓道')),
                    pyTacticChips,
                    pyNoScaleTag,
                    badgesAwardedOnVictory:
                        badgesAfter > badgesBeforeRun &&
                        savedAfter.scarabBadges === badgesAfter &&
                        (savedAfter.pyramidRunClears || 0) >= 1,
                    modalTxt,
                    replayTxt,
                    nextTxt,
                    scarabTrophyCard,
                    hallCards,
                    totalSvgCount,
                    hasRawEmoji,
                    metaOv,
                    battleOv,
                    battleTacticOv,
                };
            }"""
            )

            mc16_sim = mc16_check.get("sim") or {}
            add_check(
                "MC-16 5x 256px True-Alpha RGBA Icons (?v=33) on Lobby Card / Badge / HUD / Balance Row, Zero Inline SVG & Zero Raw Emoji",
                all(mc16_check.get("rgbaChecks", [False]))
                and len(mc16_check.get("rgbaChecks", [])) == 5
                and bool(mc16_check.get("pyBtnImgOk"))
                and bool(mc16_check.get("pyBadgeImgOk"))
                and bool(mc16_check.get("pyHudImgsOk"))
                and bool(mc16_check.get("balImgOk"))
                and int(mc16_check.get("totalSvgCount", 1)) == 0
                and not bool(mc16_check.get("hasRawEmoji")),
                json.dumps(
                    {
                        "rgba5": mc16_check.get("rgbaChecks"),
                        "btnImg": mc16_check.get("pyBtnImgOk"),
                        "badgeImg": mc16_check.get("pyBadgeImgOk"),
                        "hudImgs": mc16_check.get("pyHudImgsOk"),
                        "balImg": mc16_check.get("balImgOk"),
                        "svgCount": mc16_check.get("totalSvgCount"),
                        "rawEmoji": mc16_check.get("hasRawEmoji"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-16 Desert Pyramid Trap Run (Lobby Entry, Own Desert-Pyramid Scene Restored Cleanly vs Night Castle / Daytime, Running Squad Steered by the Cannon, Unit Gates, Quicksand Drag + Swallow Lingerers + Shield Pull-Out, Stone Path Safe, Flip-Slab Warn / Open / Close Cycle Flinging Bobos, Shields Absorb, Tomb-Exit Win / Timeout & Wipeout Loss, Tier-1 ~30s Autopilot Clear, Tier Scaling, 圣甲虫徽章 by Time + Survivors + Traps + Milestone & 10th Trophy)",
                bool(mc16_check.get("pyBtnBeforePk"))
                and ("圣甲虫徽章" in str(mc16_check.get("pyBadgeTxt", "")))
                and bool(mc16_check.get("inPy"))
                and bool(mc16_check.get("pyHudVisible"))
                and bool(mc16_check.get("desert"))
                and bool(mc16_check.get("bottomHidden"))
                and float(mc16_check.get("distLive", 0)) > 60
                and int(mc16_check.get("gatesLive", 0)) >= 1
                and bool(mc16_check.get("sandSeen"))
                and bool(mc16_check.get("slabOpenSeen"))
                and int(mc16_check.get("bobosLive", 0)) >= int(mc16_check.get("startBobos", 99))
                and int(mc16_check.get("pyLabelShown", 0)) >= 1
                and ("剩余" in str(mc16_check.get("hudTimeTxt", "")))
                and ("波波" in str(mc16_check.get("hudSandTxt", "")))
                and ("机关" in str(mc16_check.get("hudCourseTxt", "")))
                and bool(mc16_check.get("pyPillOk"))
                and ("墓道" in str(mc16_check.get("modalTxt", "")))
                and ("奖杯馆" in str(mc16_check.get("replayTxt", "")))
                and ("第 2 阶" in str(mc16_check.get("nextTxt", "")))
                and bool(mc16_check.get("badgesAwardedOnVictory"))
                and bool(mc16_check.get("scarabTrophyCard"))
                and int(mc16_check.get("hallCards", 0)) >= 10
                and all(
                    bool(mc16_sim.get(k))
                    for k in (
                        "pyramidSpawnedInDesert",
                        "desertDecorRestoresAcrossModes",
                        "crowdRunsAndPassageScrolls",
                        "crowdSteersAndBobosFollow",
                        "unitGateAddsBobos",
                        "quicksandDragsPace",
                        "quicksandSwallowsLingeringBobos",
                        "shieldPullsBoboOutOfSand",
                        "stonePathCrossesSafely",
                        "slabCyclesWarnOpenClose",
                        "openSlabFlingsBobos",
                        "closedSlabCrossesSafely",
                        "shieldAbsorbsSlabFling",
                        "exitGateWinsStage",
                        "timeoutLosesStage",
                        "wipeoutLosesStage",
                        "autopilotClearsTier1",
                        "tiersScale",
                        "badgesScaleWithTimeSurvivorsAndTraps",
                        "badgesPersistedWithMilestone",
                        "scarabTrophyReadsCounter",
                    )
                ),
                json.dumps(
                    {
                        "lobbyBtn": mc16_check.get("pyBtnBeforePk"),
                        "badge": mc16_check.get("pyBadgeTxt"),
                        "inPy": mc16_check.get("inPy"),
                        "hud": mc16_check.get("pyHudVisible"),
                        "desert": mc16_check.get("desert"),
                        "bottomHidden": mc16_check.get("bottomHidden"),
                        "dist": round(float(mc16_check.get("distLive", 0)), 1),
                        "gates": mc16_check.get("gatesLive"),
                        "sandSeen": mc16_check.get("sandSeen"),
                        "slabOpenSeen": mc16_check.get("slabOpenSeen"),
                        "bobos": [mc16_check.get("startBobos"), mc16_check.get("bobosLive")],
                        "traps": mc16_check.get("trapsLive"),
                        "hudTxt": [mc16_check.get("hudTimeTxt"), mc16_check.get("hudSandTxt"), mc16_check.get("hudCourseTxt")],
                        "label": mc16_check.get("pyLabelShown"),
                        "modal": [mc16_check.get("modalTxt"), mc16_check.get("replayTxt"), mc16_check.get("nextTxt")],
                        "victoryBadges": mc16_check.get("badgesAwardedOnVictory"),
                        "trophy": [mc16_check.get("scarabTrophyCard"), mc16_check.get("hallCards")],
                        "stats": mc16_sim.get("stats"),
                        "sim": {k: v for k, v in mc16_sim.items() if k not in ("stats",) and not k.startswith("tactic")},
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-16 Tactic Deck Balance (Main-Campaign ×0.6 Coefficient on Card Values + Scaled Caps 14 / 10 / +15%, Visible on the Workshop Balance Row / Card Tags / Lobby Strip / Battle HUD Tag, Real Toggle Switches the Campaign Deck Off & On (Persisted), Lobby Modes Keep ×1.0; Crowd & Rush Card Cases in Lava / Sled / Asteroid incl. Lava Mid-Hop Reinforcement Seating Fix)",
                ("×0.6" in str(mc16_check.get("lobbySubOn", "")))
                and ("主线关闭" in str(mc16_check.get("lobbySubOff", "")))
                and bool(mc16_check.get("balInDeck"))
                and ("×0.6" in str(mc16_check.get("balTitleOn", "")))
                and ("≤14" in str(mc16_check.get("balTextOn", "")))
                and ("≤10" in str(mc16_check.get("balTextOn", "")))
                and ("+15%" in str(mc16_check.get("balTextOn", "")))
                and len(mc16_check.get("cardCampTags") or []) == 9
                and all("主线" in str(t) for t in (mc16_check.get("cardCampTags") or []))
                and bool(mc16_check.get("offOk"))
                and bool(mc16_check.get("campOffNoDeck"))
                and bool(mc16_check.get("onAgain"))
                and bool(mc16_check.get("campScaled"))
                and bool(mc16_check.get("scaleTagOk"))
                and ("×0.6" in str(mc16_check.get("campPill", "")))
                and bool(mc16_check.get("campHudFit"))
                and bool(mc16_check.get("lobbyFullStrength"))
                and int(mc16_check.get("pyTacticChips", 0)) == 3
                and bool(mc16_check.get("pyNoScaleTag"))
                and all(
                    bool(mc16_sim.get(k))
                    for k in (
                        "tacticCampaignCoefficientScales",
                        "tacticCampaignCapsScaled",
                        "tacticLobbyModesFullStrength",
                        "tacticCampaignSwitchPersists",
                        "tacticLavaCrowdAndRush",
                        "tacticLavaMidHopReinforcementsSeated",
                        "tacticSledCrowdAndRush",
                        "tacticAsteroidCrowdAndRush",
                    )
                ),
                json.dumps(
                    {
                        "lobbySub": [mc16_check.get("lobbySubOn"), mc16_check.get("lobbySubOff")],
                        "balance": [mc16_check.get("balInDeck"), mc16_check.get("balTitleOn"), mc16_check.get("balTextOn")],
                        "cardTags": mc16_check.get("cardCampTags"),
                        "switch": [mc16_check.get("offOk"), mc16_check.get("campOffNoDeck"), mc16_check.get("onAgain")],
                        "campaign": [mc16_check.get("campScaled"), mc16_check.get("scaleTagOk"), mc16_check.get("campPill"), mc16_check.get("campHudFit")],
                        "lobbyMode": [mc16_check.get("lobbyFullStrength"), mc16_check.get("pyTacticChips"), mc16_check.get("pyNoScaleTag")],
                        "sim": {k: v for k, v in mc16_sim.items() if k.startswith("tactic")},
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-17"):
            # MC-17 Verification: Jungle Temple Vine Swing, the lava regular-gate seating fix and the random-proof checks
            mc17_check = page.evaluate(
                """async () => {
                const w = window.__mc3dWorld;
                if (!w || typeof w.runMc17SelfCheck !== 'function') {
                    return { ok: false, reason: 'missing __mc3dWorld.runMc17SelfCheck' };
                }
                const sim = w.runMc17SelfCheck();
                const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                const artPairs = """
                + ART_PAIR_JS
                + """;
                const jungleInfo = """
                + JUNGLE_INFO_JS
                + """;

                // The 4 MC-17 icons (?v=33) reuse existing art (art debt) normalised to 256x256 true-alpha RGBA with all 4 corners transparent
                const mc17Urls = [
                    '/assets/icons/ui_jungle_temple.png?v=33',
                    '/assets/icons/ui_emerald_idol_badge.png?v=33',
                    '/assets/icons/vine_swing.png?v=33',
                    '/assets/icons/rolling_boulder.png?v=33',
                ];
                const iconInfo = await Promise.all(mc17Urls.map((u) => new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const W = img.naturalWidth;
                        const H = img.naturalHeight;
                        const cv = document.createElement('canvas');
                        cv.width = W; cv.height = H;
                        const ctx2d = cv.getContext('2d');
                        ctx2d.drawImage(img, 0, 0);
                        const corners = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].map(([cx, cy]) => ctx2d.getImageData(cx, cy, 1, 1).data[3]);
                        resolve({ w: W, h: H, cornerAlpha: corners, ok: W === 256 && H === 256 && corners.every((a) => a === 0) });
                    };
                    img.onerror = () => resolve({ w: 0, h: 0, ok: false });
                    img.src = u;
                })));

                const s = w.state;
                s.gold = Math.max(s.gold, 60000);
                s.emeraldIdolBadges = 4;
                s.lifetimeEmeraldIdolBadges = Math.max(s.lifetimeEmeraldIdolBadges, 4);
                for (const cid of ['shield_open', 'rush_open', 'crowd_open']) if (!s.ownedTacticCards.includes(cid)) s.ownedTacticCards.push(cid);
                s.tacticDeck = ['shield_open', 'rush_open', 'crowd_open'];
                s.tacticCampaignEnabled = true;
                s.save();

                // Lobby: #btn-start-jungle-swing above the pyramid card, with the 翡翠神像徽章 counter
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                await raf2();
                const jgBtn = document.getElementById('btn-start-jungle-swing');
                const pyBtn = document.getElementById('btn-start-pyramid-run');
                const jgBtnImg = jgBtn?.querySelector('img');
                const jgBtnImgOk = Boolean(jgBtnImg && jgBtnImg.complete && jgBtnImg.naturalWidth > 0 && jgBtnImg.src.includes('ui_jungle_temple.png?v=33'));
                const jgBadgeImg = document.querySelector('#jungle-swing-badge img');
                const jgBadgeImgOk = Boolean(jgBadgeImg && jgBadgeImg.complete && jgBadgeImg.naturalWidth > 0 && jgBadgeImg.src.includes('ui_emerald_idol_badge.png?v=33'));
                const jgBadgeTxt = document.getElementById('emerald-idol-text')?.textContent?.trim() || '';
                const jgBtnBeforePy = Boolean(jgBtn && pyBtn && (jgBtn.compareDocumentPosition(pyBtn) & Node.DOCUMENT_POSITION_FOLLOWING));
                const pairsLaunch = artPairs();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                await raf2();
                const pairsMeta = artPairs();
                const metaOv = document.documentElement.scrollWidth - window.innerWidth;
                document.querySelector('.menu-tab[data-tab="skins"]')?.click();
                await raf2();
                const pairsSkins = artPairs();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();

                // Launch the Jungle Temple Vine Swing via #btn-start-jungle-swing
                const badgesBeforeRun = s.emeraldIdolBadges;
                document.getElementById('btn-start-jungle-swing')?.click();
                await raf2();
                const jg = w.jungleRun;
                const inJg = Boolean(
                    w.currentLevel && w.currentLevel.isJungleSwing && jg && jg.active &&
                    w.jungleGates.length >= 6 && w.jungleChasms.length >= 3 && w.jungleBoulders.length >= 3
                );
                const jgHud = document.getElementById('jungle-swing-hud');
                const jgHudVisible = Boolean(jgHud && !jgHud.classList.contains('hidden'));
                const sceneSnap = w.getDedicatedSceneSnapshot();
                const jungle = sceneSnap.kind === 'jungle' && sceneSnap.skyHex === 0x8fd3b6 && !sceneSnap.landmarks && !w.turretGroup.visible;
                const hudBottom = document.querySelector('.hud-bottom');
                const bottomHidden = Boolean(hudBottom && getComputedStyle(hudBottom).display === 'none') &&
                    document.body.classList.contains('jungle-mode-active');
                const lobbyFullStrength = Boolean(w.tacticRun && !w.tacticRun.isCampaign && w.tacticRun.effectMult === 1);
                const startBobos = w.getLavaBoboCount();
                let vineHeldSeen = false;
                let swingSeen = false;
                let boulderSeen = false;
                let laneSeen = false;
                for (let step = 0; step < 240 && jg && jg.active; step++) {
                    w.turretTargetX = w.getJungleAutopilotX();
                    w.update(0.05);
                    if (w.jungleChasms.some((c) => c.locked && c.leadGrabbed)) vineHeldSeen = true;
                    if (jg.state === 'swinging') swingSeen = true;
                    if (w.jungleBoulders.some((b) => b.state === 'rolling' && b.rock.visible)) boulderSeen = true;
                    if (w.jungleBoulders.some((b) => b.lane.visible)) laneSeen = true;
                }
                await raf2();
                const live = jungleInfo();
                const gatesLive = w.getJungleGateProgress().reached;
                const trapsLive = w.getJungleTrapProgress();
                const jgHudImgsOk = Array.from(jgHud ? jgHud.querySelectorAll('img') : []).every((im) => im.complete && im.naturalWidth > 0);
                const jgPill = document.querySelector('#active-buffs-bar .jungle-swing-pill');
                const jgTacticChips = document.querySelectorAll('#tactic-deck-hud .tactic-hud-chip').length;
                const jgNoScaleTag = !document.querySelector('#tactic-deck-hud .tactic-hud-scale');
                const pairsRun = artPairs();
                const battleOv = document.documentElement.scrollWidth - window.innerWidth;

                // Settle the run via the real stage-end callback
                if (w.onStageEnd) {
                    w.jungleFinishSec = 29.6;
                    w.isPaused = true;
                    w.onStageEnd(true);
                }
                const badgesAfter = s.emeraldIdolBadges;
                const savedAfter = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                const modalTxt = document.getElementById('modal-title')?.textContent || '';
                const modalDescTxt = document.getElementById('modal-desc')?.textContent || '';
                const replayTxt = document.getElementById('btn-modal-replay')?.textContent || '';
                const nextTxt = document.getElementById('btn-modal-next')?.textContent || '';
                const pairsModal = artPairs();
                document.getElementById('btn-modal-home')?.click();
                await raf2();
                const idolTrophyCard = Boolean(document.querySelector('#trophy-hall-grid [data-hall-trophy="emerald_idol_badge"]'));
                const hallCards = document.querySelectorAll('#trophy-hall-grid .trophy-cabinet-card').length;

                const totalSvgCount = document.querySelectorAll('svg').length;
                const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
                const mc17TextSample = [jgBtn?.textContent || '', jgHud?.textContent || '', jgPill?.textContent || '', modalTxt, modalDescTxt].join(' ');
                const hasRawEmoji = emojiRe.test(mc17TextSample);
                const clashes = [...pairsLaunch.clashes, ...pairsMeta.clashes, ...pairsSkins.clashes, ...pairsRun.clashes, ...pairsModal.clashes];

                return {
                    sim, iconInfo, jgBtnImgOk, jgBadgeImgOk, jgBadgeTxt, jgBtnBeforePy,
                    pairs: { launch: pairsLaunch, meta: pairsMeta, skins: pairsSkins, run: pairsRun, modal: pairsModal }, clashes,
                    inJg, jgHudVisible, jungle, bottomHidden, lobbyFullStrength, startBobos,
                    vineHeldSeen, swingSeen, boulderSeen, laneSeen, live, gatesLive, trapsLive, jgHudImgsOk,
                    jgPillOk: Boolean(jgPill && jgPill.textContent?.includes('神庙')), jgTacticChips, jgNoScaleTag,
                    badgesAwardedOnVictory: badgesAfter > badgesBeforeRun && savedAfter.emeraldIdolBadges === badgesAfter && (savedAfter.jungleSwingClears || 0) >= 1,
                    modalTxt, replayTxt, nextTxt, idolTrophyCard, hallCards, totalSvgCount, hasRawEmoji, metaOv, battleOv,
                };
            }"""
            )

            mc17_sim = mc17_check.get("sim") or {}
            mc17_live = mc17_check.get("live") or {}
            add_check(
                "MC-17 4x Square Alpha PNG Icons (?v=33; Stand-in Copies of Existing Art, 2 of Them Not 256px) on Lobby Card / Badge / HUD, Never on One Screen with Their Originals, Zero Inline SVG & Zero Raw Emoji",
                all(bool(i.get("ok")) for i in (mc17_check.get("iconInfo") or [{}]))
                and len(mc17_check.get("iconInfo") or []) == 4
                and bool(mc17_check.get("jgBtnImgOk"))
                and bool(mc17_check.get("jgBadgeImgOk"))
                and bool(mc17_check.get("jgHudImgsOk"))
                and isinstance(mc17_check.get("clashes"), list)
                and len(mc17_check.get("clashes")) == 0
                and int(mc17_check.get("totalSvgCount", 1)) == 0
                and not bool(mc17_check.get("hasRawEmoji")),
                json.dumps(
                    {
                        "icons": mc17_check.get("iconInfo"),
                        "btnImg": mc17_check.get("jgBtnImgOk"),
                        "badgeImg": mc17_check.get("jgBadgeImgOk"),
                        "hudImgs": mc17_check.get("jgHudImgsOk"),
                        "artOnScreen": mc17_check.get("pairs"),
                        "svgCount": mc17_check.get("totalSvgCount"),
                        "rawEmoji": mc17_check.get("hasRawEmoji"),
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-17 Jungle Temple Vine Swing (Lobby Entry above the Pyramid Card, Own Jungle-Temple Scene via applyDedicatedSceneDecor Restored Cleanly vs Desert / Night Castle / Daytime, Squad Steered by the Cannon, Seated Unit Gates, Vines Sway on the Run Clock, Grab -> Swing Across / Miss -> Fall (Capped) / Shield Float, Boulders Wake -> Roll -> Flatten (Capped) / Side-Step / Shield / Drop into a Chasm in Their Way, Temple-Exit Win / Timeout & Wipeout Loss, Tier-1 ~30s Autopilot Clear, Tier Scaling, 翡翠神像徽章 by Time + Survivors + Traps + Milestone, 11th Trophy & Lobby-Strength Tactic Cards)",
                bool(mc17_check.get("jgBtnBeforePy"))
                and ("翡翠神像徽章" in str(mc17_check.get("jgBadgeTxt", "")))
                and bool(mc17_check.get("inJg"))
                and bool(mc17_check.get("jgHudVisible"))
                and bool(mc17_check.get("jungle"))
                and bool(mc17_check.get("bottomHidden"))
                and bool(mc17_check.get("lobbyFullStrength"))
                and float(mc17_live.get("dist", 0)) > 60
                and int(mc17_check.get("gatesLive", 0)) >= 1
                and bool(mc17_check.get("vineHeldSeen"))
                and bool(mc17_check.get("swingSeen"))
                and bool(mc17_check.get("boulderSeen"))
                and bool(mc17_check.get("laneSeen"))
                and int(mc17_live.get("bobos", 0)) >= int(mc17_check.get("startBobos", 99))
                and bool(mc17_live.get("labelShown"))
                and ("剩余" in " ".join(mc17_live.get("hudTxt") or []))
                and ("机关" in " ".join(mc17_live.get("hudTxt") or []))
                and bool(mc17_check.get("jgPillOk"))
                and int(mc17_check.get("jgTacticChips", 0)) == 3
                and bool(mc17_check.get("jgNoScaleTag"))
                and ("神庙" in str(mc17_check.get("modalTxt", "")))
                and ("奖杯馆" in str(mc17_check.get("replayTxt", "")))
                and ("第 2 阶" in str(mc17_check.get("nextTxt", "")))
                and bool(mc17_check.get("badgesAwardedOnVictory"))
                and bool(mc17_check.get("idolTrophyCard"))
                and int(mc17_check.get("hallCards", 0)) == 11
                and all(
                    bool(mc17_sim.get(k))
                    for k in (
                        "jungleSpawnedInTemple",
                        "jungleDecorRestoresAcrossModes",
                        "crowdRunsAndPathScrolls",
                        "crowdSteersAndBobosFollow",
                        "unitGateAddsSeatedBobos",
                        "vineSwaysOnRunClock",
                        "vineCarriesSquadAcrossChasm",
                        "missedVineDropsBobos",
                        "shieldFloatsBoboAcross",
                        "boulderWakesAndRolls",
                        "boulderFlattensBobosInLane",
                        "sideStepDodgesBoulder",
                        "shieldAbsorbsBoulder",
                        "boulderDropsIntoChasmInItsWay",
                        "templeExitWinsStage",
                        "timeoutLosesStage",
                        "wipeoutLosesStage",
                        "autopilotClearsTier1",
                        "tiersScale",
                        "badgesScaleWithTimeSurvivorsAndTraps",
                        "badgesPersistedWithMilestone",
                        "emeraldTrophyReadsCounter",
                        "tacticCardsAtLobbyStrength",
                    )
                ),
                json.dumps(
                    {
                        "lobbyBtn": mc17_check.get("jgBtnBeforePy"),
                        "badge": mc17_check.get("jgBadgeTxt"),
                        "inJg": mc17_check.get("inJg"),
                        "hud": mc17_check.get("jgHudVisible"),
                        "jungle": mc17_check.get("jungle"),
                        "bottomHidden": mc17_check.get("bottomHidden"),
                        "lobbyStrength": mc17_check.get("lobbyFullStrength"),
                        "seen": [mc17_check.get("vineHeldSeen"), mc17_check.get("swingSeen"), mc17_check.get("boulderSeen"), mc17_check.get("laneSeen")],
                        "live": mc17_live,
                        "gates": mc17_check.get("gatesLive"),
                        "traps": mc17_check.get("trapsLive"),
                        "chips": [mc17_check.get("jgTacticChips"), mc17_check.get("jgNoScaleTag")],
                        "modal": [mc17_check.get("modalTxt"), mc17_check.get("replayTxt"), mc17_check.get("nextTxt")],
                        "victoryBadges": mc17_check.get("badgesAwardedOnVictory"),
                        "trophy": [mc17_check.get("idolTrophyCard"), mc17_check.get("hallCards")],
                        "stats": mc17_sim.get("stats"),
                        "sim": {k: v for k, v in mc17_sim.items() if k not in ("stats", "lavaGateReinforcementsSeated", "checksStableUnderRandomExtremes")},
                    },
                    ensure_ascii=False,
                ),
            )
            add_check(
                "MC-17 Lava Regular-Gate Reinforcement Seating Fix (Fresh Gate Bobos Booked on the Row / Platform Their Own Slot Stands On, Tail Rows Behind the Gate Row Included) & Random-Proof Jungle Numbers (Identical with Math.random Pinned Low / High / Native)",
                bool(mc17_sim.get("lavaGateReinforcementsSeated")) and bool(mc17_sim.get("checksStableUnderRandomExtremes")),
                json.dumps(
                    {
                        "lavaGateReinforcementsSeated": mc17_sim.get("lavaGateReinforcementsSeated"),
                        "checksStableUnderRandomExtremes": mc17_sim.get("checksStableUnderRandomExtremes"),
                        "lavaGateRow": (mc17_sim.get("stats") or {}).get("lavaGateRow"),
                        "fresh": (mc17_sim.get("stats") or {}).get("lavaGateFresh"),
                        "freshBehindGateRow": (mc17_sim.get("stats") or {}).get("lavaGateFreshBehind"),
                    },
                    ensure_ascii=False,
                ),
            )

        if want("CORE"):
            max_desk_overflow = max(
                max_desk_overflow,
                int(mc6_check.get("metaOverflow", 0)),
                int(mc6_check.get("battleOverflow", 0)),
                int(mc7_check.get("metaOv", 0)),
                int(mc7_check.get("battleOv", 0)),
                int(mc8_check.get("metaOv", 0)),
                int(mc8_check.get("battleOv", 0)),
                int(mc9_check.get("metaOv", 0)),
                int(mc9_check.get("battleOv", 0)),
                int(mc10_check.get("metaOv", 0)),
                int(mc10_check.get("battleOv", 0)),
                int(mc11_check.get("metaOv", 0)),
                int(mc11_check.get("battleOv", 0)),
                int(mc12_check.get("metaOv", 0)),
                int(mc12_check.get("battleOv", 0)),
                int(mc13_check.get("metaOv", 0)),
                int(mc13_check.get("battleOv", 0)),
                int(mc14_check.get("metaOv", 0)),
                int(mc14_check.get("battleOv", 0)),
                int(mc15_check.get("metaOv", 0)),
                int(mc15_check.get("battleOv", 0)),
                int(mc15_check.get("battleTacticOv", 0)),
                int(mc16_check.get("metaOv", 0)),
                int(mc16_check.get("battleOv", 0)),
                int(mc16_check.get("battleTacticOv", 0)),
                int(mc17_check.get("metaOv", 0)),
                int(mc17_check.get("battleOv", 0)),
            )
            add_check(
                "Desktop 2560x1278 Zero Horizontal Overflow (Lobby, Workshop & Escort)",
                max_desk_overflow <= 0,
                f"max_overflow={max_desk_overflow}px",
            )

        if RUN_1440:
            # Desktop 1440x900 Viewport Check (Lobby, Workshop #cannon-mod-workbench, Reload Persistence & Live Airship Mothership Escort)
            os.makedirs(SHOT_DIR, exist_ok=True)
            desk1440_ctx = new_page_context({"width": 1440, "height": 900}, 1)
            desk1440_page = desk1440_ctx.new_page()
            desk1440_page.on("pageerror", lambda err: aux_page_errors.append(f"[1440] {err}"))
            desk1440_page.goto(f"http://127.0.0.1:{port}/", wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            desk1440_page.wait_for_timeout(80)
        if want("CORE", "MC-9", "MC-10", "MC-11", "MC-12"):
            desk1440_lobby_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc9_desktop_lobby_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                "document.getElementById('btn-start-submarine-rescue')?.scrollIntoView({ block: 'center' })"
            )
            desk1440_page.wait_for_timeout(80)
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc11_desktop_lobby_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    w.state.gold = 120000;
                    w.state.airshipWingMedals = 28;
                    w.state.clockworkCores = 16;
                    w.state.upgradeCannonMod('overdrive_breech', 'medal');
                    w.state.upgradeCannonMod('prism_splitter', 'medal');
                    w.state.upgradeCannonMod('prism_splitter', 'gold');
                    w.state.upgradeCannonMod('heavy_mortar', 'gold');
                    w.state.equipCannonMod('prism_splitter');
                    w.state.trainGoldMedals = 21;
                    w.state.relicBannerLevels = { gale_charge: 1, holy_shield: 0, star_carnival: 0 };
                    w.state.activeRelicBanner = 'gale_charge';
                    w.state.upgradeRelicBanner('gale_charge', 'medal');
                    w.state.upgradeRelicBanner('holy_shield', 'gold');
                    w.state.upgradeRelicBanner('star_carnival', 'medal');
                    w.state.upgradeRelicBanner('star_carnival', 'gold');
                    w.state.equipRelicBanner('star_carnival');
                    w.state.upgradeBoboTechBranch('vanguard_charge', 'gold');
                    w.state.upgradeBoboTechBranch('heavy_siege', 'core');
                    w.state.deepPearls = 19;
                    w.state.petLevels = { jelly_puff: 1, shell_turtle: 0, spark_seahorse: 0 };
                    w.state.activePet = 'jelly_puff';
                    w.state.upgradePetCompanion('jelly_puff', 'pearl');
                    w.state.upgradePetCompanion('shell_turtle', 'gold');
                    w.state.upgradePetCompanion('shell_turtle', 'pearl');
                    w.state.upgradePetCompanion('spark_seahorse', 'pearl');
                    w.state.equipPetCompanion('shell_turtle');
                    w.state.save();
                }
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
            }"""
            )
            desk1440_page.wait_for_timeout(100)
            desk1440_meta_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc9_desktop_workshop_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate("document.getElementById('pet-companion-dock')?.scrollIntoView({ block: 'start' })")
            desk1440_page.wait_for_timeout(80)
            desk1440_pet_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc11_desktop_pet_dock_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.bestStageCleared = Math.max(s.bestStageCleared, 16);
                    s.colossusRaidClears = Math.max(s.colossusRaidClears, 3);
                    s.iceMedals = 14;
                    s.lifetimeIceMedals = Math.max(s.lifetimeIceMedals, 14);
                    s.trophyHallSlots = 1;
                    s.trophyDisplay = [null, null, null, null, null, null];
                    s.unlockTrophySlot('medal');
                    s.unlockTrophySlot('medal');
                    s.unlockTrophySlot('gold');
                    s.unlockTrophySlot('gold');
                    s.autoArrangeTrophies();
                    s.save();
                }
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                document.getElementById('trophy-hall')?.scrollIntoView({ block: 'start' });
            }"""
            )
            desk1440_page.wait_for_timeout(120)
            desk1440_hall_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc12_desktop_trophy_hall_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            # Real page reload persistence verification for MC-9 Cannon Core Modules & Airship Wing Medals
            pre_reload_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return {
                    medals: s.airshipWingMedals,
                    activeMod: s.activeCannonMod,
                    levels: { ...s.cannonModLevels },
                    trainMedals: s.trainGoldMedals,
                    activeBanner: s.activeRelicBanner,
                    bannerLevels: { ...s.relicBannerLevels },
                    pearls: s.deepPearls,
                    activePet: s.activePet,
                    petLevels: { ...s.petLevels },
                    iceMedals: s.iceMedals,
                    hallSlots: s.trophyHallSlots,
                    hallDisplay: [...s.trophyDisplay],
                };
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            desk1440_page.wait_for_timeout(80)
            post_reload_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                const rb = window.__mc3dWorld.relicBanner;
                return {
                    medals: s.airshipWingMedals,
                    activeMod: s.activeCannonMod,
                    levels: { ...s.cannonModLevels },
                    trainMedals: s.trainGoldMedals,
                    activeBanner: s.activeRelicBanner,
                    bannerLevels: { ...s.relicBannerLevels },
                    banner3DId: rb ? rb.equippedId : null,
                    pearls: s.deepPearls,
                    activePet: s.activePet,
                    petLevels: { ...s.petLevels },
                    pet3DId: window.__mc3dWorld.petCompanion ? window.__mc3dWorld.petCompanion.equippedId : null,
                    iceMedals: s.iceMedals,
                    hallSlots: s.trophyHallSlots,
                    hallDisplay: [...s.trophyDisplay],
                    pedestalCups: window.__mc3dWorld.trophyPedestal ? window.__mc3dWorld.trophyPedestal.cupsGroup.children.length : -1,
                    hallDisplayed: s.getDisplayedTrophyCount(),
                };
            }"""
            )
            mc9_reload_persisted = (
                post_reload_snap.get("medals") == pre_reload_snap.get("medals")
                and post_reload_snap.get("activeMod") == "prism_splitter"
                and post_reload_snap.get("levels") == pre_reload_snap.get("levels")
                and int(post_reload_snap.get("levels", {}).get("overdrive_breech", 0)) >= 2
                and int(post_reload_snap.get("levels", {}).get("prism_splitter", 0)) >= 2
                and int(post_reload_snap.get("levels", {}).get("heavy_mortar", 0)) >= 1
            )
            add_check(
                "MC-9 Reload Persistence (Airship Wing Medals, Cannon Core Module Levels & Active Equipped Module)",
                mc9_reload_persisted,
                json.dumps({"before": pre_reload_snap, "after": post_reload_snap}, ensure_ascii=False),
            )
            mc10_reload_persisted = (
                post_reload_snap.get("trainMedals") == pre_reload_snap.get("trainMedals")
                and int(post_reload_snap.get("trainMedals", 0)) > 0
                and post_reload_snap.get("activeBanner") == "star_carnival"
                and post_reload_snap.get("banner3DId") == "star_carnival"
                and post_reload_snap.get("bannerLevels") == pre_reload_snap.get("bannerLevels")
                and int(post_reload_snap.get("bannerLevels", {}).get("gale_charge", 0)) >= 2
                and int(post_reload_snap.get("bannerLevels", {}).get("holy_shield", 0)) >= 1
                and int(post_reload_snap.get("bannerLevels", {}).get("star_carnival", 0)) >= 2
            )
            add_check(
                "MC-10 Reload Persistence (列车金章, Relic Banner Levels, Equipped Banner & 3D Banner Re-skin)",
                mc10_reload_persisted,
                json.dumps(
                    {
                        "before": {k: pre_reload_snap.get(k) for k in ("trainMedals", "activeBanner", "bannerLevels")},
                        "after": {k: post_reload_snap.get(k) for k in ("trainMedals", "activeBanner", "bannerLevels", "banner3DId")},
                    },
                    ensure_ascii=False,
                ),
            )

            mc11_reload_persisted = (
                post_reload_snap.get("pearls") == pre_reload_snap.get("pearls")
                and int(post_reload_snap.get("pearls", 0)) > 0
                and post_reload_snap.get("activePet") == "shell_turtle"
                and post_reload_snap.get("pet3DId") == "shell_turtle"
                and post_reload_snap.get("petLevels") == pre_reload_snap.get("petLevels")
                and int(post_reload_snap.get("petLevels", {}).get("jelly_puff", 0)) >= 2
                and int(post_reload_snap.get("petLevels", {}).get("shell_turtle", 0)) >= 2
                and int(post_reload_snap.get("petLevels", {}).get("spark_seahorse", 0)) >= 1
            )
            add_check(
                "MC-11 Reload Persistence (深海珍珠, Pet Levels, Active Pet & 3D Pet Re-skin)",
                mc11_reload_persisted,
                json.dumps(
                    {
                        "before": {k: pre_reload_snap.get(k) for k in ("pearls", "activePet", "petLevels")},
                        "after": {k: post_reload_snap.get(k) for k in ("pearls", "activePet", "petLevels", "pet3DId")},
                    },
                    ensure_ascii=False,
                ),
            )

            # MC-11 save compatibility: an old (pre-MC-11) save gets defaults; dirty values are clamped on load
            saved_raw = desk1440_page.evaluate("localStorage.getItem('swarm_control_3d_save_v3') || ''")
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                for (const k of ['deepPearls', 'lifetimeDeepPearls', 'submarineRescueClears', 'bestSubmarineRescuedBobos',
                    'bestSubmarineClearSec', 'totalBubblesPopped', 'totalJellyfishCleared', 'totalCoralBroken',
                    'petLevels', 'activePet', 'totalPetProcs']) delete s[k];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            old_save_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { pearls: s.deepPearls, clears: s.submarineRescueClears, activePet: s.activePet, petLevels: { ...s.petLevels },
                    trainMedals: s.trainGoldMedals };
            }"""
            )
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                s.deepPearls = -42;
                s.lifetimeDeepPearls = 'lots';
                s.submarineRescueClears = 3.9;
                s.bestSubmarineClearSec = -5;
                s.petLevels = { jelly_puff: 0, shell_turtle: 99, spark_seahorse: -3, dragon: 4 };
                s.activePet = 'dragon';
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            dirty_save_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { pearls: s.deepPearls, lifePearls: s.lifetimeDeepPearls, clears: s.submarineRescueClears,
                    bestSec: s.bestSubmarineClearSec, activePet: s.activePet, petLevels: { ...s.petLevels },
                    hasDragon: Object.prototype.hasOwnProperty.call(s.petLevels, 'dragon') };
            }"""
            )
            desk1440_page.evaluate(
                "(raw) => { if (raw) localStorage.setItem('swarm_control_3d_save_v3', raw); }", saved_raw
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            desk1440_page.wait_for_timeout(80)
            mc11_save_compat = (
                int(old_save_snap.get("pearls", -1)) == 0
                and int(old_save_snap.get("clears", -1)) == 0
                and old_save_snap.get("activePet") == "jelly_puff"
                and old_save_snap.get("petLevels") == {"jelly_puff": 1, "shell_turtle": 0, "spark_seahorse": 0}
                and int(old_save_snap.get("trainMedals", 0)) == int(pre_reload_snap.get("trainMedals", -1))
                and int(dirty_save_snap.get("pearls", -1)) == 0
                and int(dirty_save_snap.get("lifePearls", -1)) == 0
                and int(dirty_save_snap.get("clears", -1)) == 3
                and float(dirty_save_snap.get("bestSec", -1)) == 0
                and dirty_save_snap.get("petLevels") == {"jelly_puff": 0, "shell_turtle": 5, "spark_seahorse": 0}
                and dirty_save_snap.get("activePet") == "shell_turtle"
                and not bool(dirty_save_snap.get("hasDragon"))
            )
            add_check(
                "MC-11 Save Compat (Pre-MC-11 Save Loads Defaults, Dirty Pearls/Pet Levels/Active Pet Clamped)",
                mc11_save_compat,
                json.dumps({"oldSave": old_save_snap, "dirtySave": dirty_save_snap}, ensure_ascii=False),
            )

            mc12_reload_persisted = (
                post_reload_snap.get("iceMedals") == pre_reload_snap.get("iceMedals")
                and post_reload_snap.get("hallSlots") == pre_reload_snap.get("hallSlots") == 5
                and post_reload_snap.get("hallDisplay") == pre_reload_snap.get("hallDisplay")
                and int(post_reload_snap.get("hallDisplayed", 0)) == 5
                and int(post_reload_snap.get("pedestalCups", -1)) == 5
            )
            add_check(
                "MC-12 Reload Persistence (冰晶奖章, Trophy Hall Slots & Displayed Trophies, Lobby 3D Pedestal Rebuilt)",
                mc12_reload_persisted,
                json.dumps(
                    {
                        "before": {k: pre_reload_snap.get(k) for k in ("iceMedals", "hallSlots", "hallDisplay")},
                        "after": {k: post_reload_snap.get(k) for k in ("iceMedals", "hallSlots", "hallDisplay", "pedestalCups")},
                    },
                    ensure_ascii=False,
                ),
            )

            # MC-12 save compatibility: a pre-MC-12 save gets defaults; dirty values are clamped on load
            mc12_saved_raw = desk1440_page.evaluate("localStorage.getItem('swarm_control_3d_save_v3') || ''")
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                for (const k of ['iceMedals', 'lifetimeIceMedals', 'glacierSledClears', 'bestSledFinishSec', 'bestSledSurvivors',
                    'totalSledGatesPassed', 'totalSledRidersLost', 'trophyHallSlots', 'trophyDisplay']) delete s[k];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc12_old_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { ice: s.iceMedals, life: s.lifetimeIceMedals, clears: s.glacierSledClears, slots: s.trophyHallSlots,
                    display: [...s.trophyDisplay], pearls: s.deepPearls, trainTier: s.getHallTrophyTier('train_medal') };
            }"""
            )
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                s.iceMedals = -5;
                s.lifetimeIceMedals = 'lots';
                s.glacierSledClears = 2.7;
                s.bestSledFinishSec = -3;
                s.bestSledSurvivors = 9999;
                s.trophyHallSlots = 99;
                s.trophyDisplay = ['dragon', 'train_medal', 'train_medal', 7, null, 'ice_medal', 'campaign_star'];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc12_dirty_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { ice: s.iceMedals, life: s.lifetimeIceMedals, clears: s.glacierSledClears, bestSec: s.bestSledFinishSec,
                    bestSurv: s.bestSledSurvivors, slots: s.trophyHallSlots, display: [...s.trophyDisplay] };
            }"""
            )
            desk1440_page.evaluate(
                "(raw) => { if (raw) localStorage.setItem('swarm_control_3d_save_v3', raw); }", mc12_saved_raw
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            desk1440_page.wait_for_timeout(80)
            mc12_save_compat = (
                int(mc12_old_snap.get("ice", -1)) == 0
                and int(mc12_old_snap.get("life", -1)) == 0
                and int(mc12_old_snap.get("clears", -1)) == 0
                and int(mc12_old_snap.get("slots", -1)) == 1
                and mc12_old_snap.get("display") == [None, None, None, None, None, None]
                and int(mc12_old_snap.get("trainTier", 0)) >= 1
                and int(mc12_dirty_snap.get("ice", -1)) == 0
                and int(mc12_dirty_snap.get("life", -1)) == 0
                and int(mc12_dirty_snap.get("clears", -1)) == 2
                and float(mc12_dirty_snap.get("bestSec", -1)) == 0
                and int(mc12_dirty_snap.get("bestSurv", -1)) == 600
                and int(mc12_dirty_snap.get("slots", -1)) == 6
                and mc12_dirty_snap.get("display") == [None, "train_medal", None, None, None, None]
            )
            add_check(
                "MC-12 Save Compat (Pre-MC-12 Save Loads Defaults, Dirty Ice Medals / Slots / Duplicate & Unearned Trophies Clamped)",
                mc12_save_compat,
                json.dumps({"oldSave": mc12_old_snap, "dirtySave": mc12_dirty_snap}, ensure_ascii=False),
            )
            desk1440_page.evaluate("document.querySelector('.menu-tab[data-tab=\"launch\"]')?.click()")
            desk1440_page.wait_for_timeout(260)
            desk1440_mc12_lobby_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc12_desktop_lobby_1440.jpg"),
                type="jpeg",
                quality=90,
            )

            desk1440_page.evaluate("document.querySelector('.menu-tab[data-tab=\"launch\"]')?.click()")
            desk1440_page.wait_for_timeout(60)
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-start-airship-escort')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let i = 0; i < 8; i++) {
                        w.fireTurret();
                    }
                    if (w.antiAirTurrets && w.antiAirTurrets[0]) {
                        w.damageAntiAirTurret(w.antiAirTurrets[0], 99999, true);
                    }
                    for (let step = 0; step < 6; step++) {
                        w.update(0.06);
                    }
                }
            }"""
            )
            desk1440_page.wait_for_timeout(180)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_escort_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc9_desktop_airship_escort_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-candy-train-raid')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 60; step++) {
                        w.update(0.05);
                    }
                }
            }"""
            )
            desk1440_page.wait_for_timeout(180)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_train_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc10_desktop_candy_train_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-submarine-rescue')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 150; step++) {
                        w.update(0.05);
                    }
                }
            }"""
            )
            desk1440_page.wait_for_timeout(220)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_sub_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc11_desktop_submarine_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-glacier-sled')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 125; step++) {
                        w.turretTargetX = w.getSledAutopilotX();
                        w.update(0.05);
                    }
                }
            }"""
            )
            desk1440_page.wait_for_timeout(220)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_sled_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc12_desktop_sled_1440.jpg"),
                type="jpeg",
                quality=90,
            )

        if want("MC-13"):
            # MC-13 (1440x900): gacha machine + rolled result, reload persistence, save compat, lobby card & lava run with a skin
            desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.gold = Math.max(s.gold, 60000);
                    s.lavaCores = 26;
                    s.lifetimeLavaCores = Math.max(s.lifetimeLavaCores, 26);
                    s.ownedGachaSkins = [];
                    s.equippedGachaSkin = null;
                    s.gachaPity = 0;
                    s.gachaSsrPity = 0;
                    s.save();
                }
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                // MC-17 deflake: this ten-roll (real button) runs on a seeded Math.random, so the reload check below always
                // has the same >= 2 owned skins to persist
                const realRandom = Math.random;
                let seedB = 2929;
                Math.random = () => {
                    seedB = (seedB + 0x6d2b79f5) >>> 0;
                    let t = seedB;
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
                try {
                    document.getElementById('btn-gacha-ten-core')?.click();
                } finally {
                    Math.random = realRandom;
                }
                document.getElementById('gacha-machine')?.scrollIntoView({ block: 'start' });
            }"""
            )
            desk1440_page.wait_for_timeout(900)
            desk1440_gacha_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc13_desktop_gacha_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            # Equip the rarest owned skin via the real card button (crown if the roll gave it)
            desk1440_page.evaluate(
                """() => {
                const order = ['royal_crown', 'halo_angel', 'lava_horns', 'bunny_ears', 'pirate_hat', 'sprout_leaf', 'peach_bow', 'mint_cap'];
                const s = window.__mc3dWorld.state;
                const pickId = order.find((id) => s.ownedGachaSkins.includes(id));
                if (pickId) document.querySelector(`#gacha-collection-grid [data-gacha-equip="${pickId}"]`)?.click();
            }"""
            )
            desk1440_page.wait_for_timeout(80)
            mc13_pre_reload = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { cores: s.lavaCores, life: s.lifetimeLavaCores, owned: [...s.ownedGachaSkins], equipped: s.equippedGachaSkin,
                    pity: s.gachaPity, ssrPity: s.gachaSsrPity, rolls: s.totalGachaRolls };
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(150)
            mc13_post_reload = desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const s = w.state;
                const look = w.getGachaSkinLookSnapshot();
                return { cores: s.lavaCores, life: s.lifetimeLavaCores, owned: [...s.ownedGachaSkins], equipped: s.equippedGachaSkin,
                    pity: s.gachaPity, ssrPity: s.gachaSsrPity, rolls: s.totalGachaRolls, look3D: look.skinId, accVisible: look.accessoryVisible };
            }"""
            )
            mc13_reload_ok = (
                mc13_post_reload.get("cores") == mc13_pre_reload.get("cores") == 8
                and mc13_post_reload.get("life") == mc13_pre_reload.get("life")
                and mc13_post_reload.get("owned") == mc13_pre_reload.get("owned")
                and len(mc13_pre_reload.get("owned") or []) >= 2
                and mc13_post_reload.get("equipped") == mc13_pre_reload.get("equipped")
                and mc13_pre_reload.get("equipped") is not None
                and mc13_post_reload.get("pity") == mc13_pre_reload.get("pity")
                and mc13_post_reload.get("ssrPity") == mc13_pre_reload.get("ssrPity")
                and mc13_post_reload.get("rolls") == mc13_pre_reload.get("rolls")
                and mc13_post_reload.get("look3D") == mc13_pre_reload.get("equipped")
                and bool(mc13_post_reload.get("accVisible"))
            )
            add_check(
                "MC-13 Reload Persistence (熔岩晶核, Owned Gacha Skins, Equipped Skin, Pity Counters & 3D Skin Look Rebuilt)",
                mc13_reload_ok,
                json.dumps({"before": mc13_pre_reload, "after": mc13_post_reload}, ensure_ascii=False),
            )

            # MC-13 save compatibility: a pre-MC-13 save gets defaults; dirty values are clamped on load
            mc13_saved_raw = desk1440_page.evaluate("localStorage.getItem('swarm_control_3d_save_v3') || ''")
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                for (const k of ['lavaCores', 'lifetimeLavaCores', 'lavaJumpClears', 'bestLavaFinishSec', 'bestLavaSurvivors',
                    'totalLavaHops', 'totalLavaBobosLost', 'ownedGachaSkins', 'equippedGachaSkin', 'gachaPity', 'gachaSsrPity',
                    'totalGachaRolls']) delete s[k];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc13_old_snap = desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const s = w.state;
                return { cores: s.lavaCores, life: s.lifetimeLavaCores, clears: s.lavaJumpClears, owned: [...s.ownedGachaSkins],
                    equipped: s.equippedGachaSkin, pity: s.gachaPity, ssrPity: s.gachaSsrPity, rolls: s.totalGachaRolls,
                    look3D: w.getGachaSkinLookSnapshot().skinId, iceMedals: s.iceMedals, lavaTier: s.getLavaJumpSpec().lavaTier };
            }"""
            )
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                s.lavaCores = -7;
                s.lifetimeLavaCores = 'lots';
                s.lavaJumpClears = 3.6;
                s.bestLavaFinishSec = -2;
                s.bestLavaSurvivors = 99999;
                s.ownedGachaSkins = ['dragon', 'mint_cap', 'mint_cap', 7, 'royal_crown', null];
                s.equippedGachaSkin = 'halo_angel';
                s.gachaPity = 99;
                s.gachaSsrPity = -4;
                s.totalGachaRolls = 12.9;
                s.trophyHallSlots = 6;
                s.trophyDisplay = ['lava_core', null, null, null, null, null];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc13_dirty_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { cores: s.lavaCores, life: s.lifetimeLavaCores, clears: s.lavaJumpClears, bestSec: s.bestLavaFinishSec,
                    bestSurv: s.bestLavaSurvivors, owned: [...s.ownedGachaSkins], equipped: s.equippedGachaSkin, pity: s.gachaPity,
                    ssrPity: s.gachaSsrPity, rolls: s.totalGachaRolls, display0: s.trophyDisplay[0] };
            }"""
            )
            desk1440_page.evaluate(
                "(raw) => { if (raw) localStorage.setItem('swarm_control_3d_save_v3', raw); }", mc13_saved_raw
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            desk1440_page.wait_for_timeout(80)
            mc13_save_compat = (
                int(mc13_old_snap.get("cores", -1)) == 0
                and int(mc13_old_snap.get("life", -1)) == 0
                and int(mc13_old_snap.get("clears", -1)) == 0
                and mc13_old_snap.get("owned") == []
                and mc13_old_snap.get("equipped") is None
                and int(mc13_old_snap.get("pity", -1)) == 0
                and int(mc13_old_snap.get("ssrPity", -1)) == 0
                and int(mc13_old_snap.get("rolls", -1)) == 0
                and mc13_old_snap.get("look3D") is None
                and int(mc13_old_snap.get("lavaTier", 0)) == 1
                and int(mc13_dirty_snap.get("cores", -1)) == 0
                and int(mc13_dirty_snap.get("life", -1)) == 0
                and int(mc13_dirty_snap.get("clears", -1)) == 3
                and float(mc13_dirty_snap.get("bestSec", -1)) == 0
                and int(mc13_dirty_snap.get("bestSurv", -1)) == 600
                and mc13_dirty_snap.get("owned") == ["mint_cap", "royal_crown"]
                and mc13_dirty_snap.get("equipped") is None
                and int(mc13_dirty_snap.get("pity", -1)) == 9
                and int(mc13_dirty_snap.get("ssrPity", -1)) == 0
                and int(mc13_dirty_snap.get("rolls", -1)) == 12
                and mc13_dirty_snap.get("display0") is None
            )
            add_check(
                "MC-13 Save Compat (Pre-MC-13 Save Loads Defaults, Dirty Cores / Records / Unknown & Duplicate Skins / Unowned Equip / Pity Clamped, Unearned 熔岩晶核奖杯 Dropped)",
                mc13_save_compat,
                json.dumps({"oldSave": mc13_old_snap, "dirtySave": mc13_dirty_snap}, ensure_ascii=False),
            )
            desk1440_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-lava-jump')?.scrollIntoView({ block: 'center' });
            }"""
            )
            desk1440_page.wait_for_timeout(260)
            desk1440_mc13_lobby_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc13_desktop_lobby_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-start-lava-jump')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 105; step++) {
                        w.turretTargetX = w.getLavaAutopilotX();
                        w.update(0.05);
                    }
                }
            }"""
            )
            desk1440_page.wait_for_timeout(260)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_page.wait_for_timeout(60)
            desk1440_lava_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_lava_info = desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const hud = document.getElementById('lava-jump-hud');
                const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
                return { active: Boolean(w.lavaRun && w.lavaRun.active), dist: w.lavaRun ? Math.round(w.lavaRun.distance) : 0,
                    bobos: w.lavaBoboCount, acc: w.lastGachaAccessoryCount, skin: w.getGachaSkinLookSnapshot().skinId,
                    hudFit: pills.length === 3 && pills.every((p) => { const r = p.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }) };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc13_desktop_lava_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-battle')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 70; step++) w.update(0.05);
                }
            }"""
            )
            desk1440_page.wait_for_timeout(240)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_page.wait_for_timeout(60)
            desk1440_skin_battle_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc13_desktop_skin_battle_1440.jpg"),
                type="jpeg",
                quality=90,
            )

        if want("MC-14"):
            # MC-14 (1440x900): decoration hall panel, lobby 3D room with decor + pedestal, reload persistence, save compat
            # and an asteroid dash run mid-course (shield bubble + telegraphed strike)
            desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.gold = Math.max(s.gold, 60000);
                    s.stardustBadges = 14;
                    s.lifetimeStardustBadges = Math.max(s.lifetimeStardustBadges, 14);
                    s.lavaCores = Math.max(s.lavaCores, 6);
                    s.lifetimeLavaCores = Math.max(s.lifetimeLavaCores, s.lavaCores);
                    s.trophyHallSlots = Math.max(s.trophyHallSlots, 3);
                    s.trophyDisplay = [null, null, null, null, null, null];
                    s.save();
                }
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                document.querySelector('#decor-theme-grid [data-decor-theme-buy="starlight_dome"]')?.click();
                for (const pid of ['star_lamp', 'jelly_plant', 'squad_banner', 'stardust_globe']) {
                    document.querySelector(`#decor-prop-grid [data-decor-prop-buy="${pid}"]`)?.click();
                }
                document.querySelector('#trophy-hall-grid [data-trophy-place="stardust_badge"]')?.click();
                document.querySelector('#trophy-hall-grid [data-trophy-place="lava_core"]')?.click();
                document.getElementById('decor-hall')?.scrollIntoView({ block: 'start' });
            }"""
            )
            desk1440_page.wait_for_timeout(600)
            desk1440_decor_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc14_desktop_decor_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            mc14_pre_reload = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.stardustBadges, life: s.lifetimeStardustBadges, themes: [...s.ownedDecorThemes], theme: s.activeDecorTheme,
                    props: [...s.ownedDecorProps], slots: [...s.decorSlots], shown: s.getDisplayedTrophyIds() };
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(150)
            mc14_post_reload = desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const s = w.state;
                const room = w.getLobbyDecorSnapshot();
                return { badges: s.stardustBadges, life: s.lifetimeStardustBadges, themes: [...s.ownedDecorThemes], theme: s.activeDecorTheme,
                    props: [...s.ownedDecorProps], slots: [...s.decorSlots], shown: s.getDisplayedTrophyIds(),
                    roomTheme: room.themeId, roomProps: room.props.length, roomMounted: room.mounted };
            }"""
            )
            mc14_reload_ok = (
                mc14_post_reload.get("badges") == mc14_pre_reload.get("badges")
                and mc14_post_reload.get("life") == mc14_pre_reload.get("life")
                and mc14_post_reload.get("themes") == mc14_pre_reload.get("themes")
                and mc14_pre_reload.get("theme") == "starlight_dome"
                and mc14_post_reload.get("theme") == "starlight_dome"
                and mc14_post_reload.get("props") == mc14_pre_reload.get("props")
                and len(mc14_pre_reload.get("props") or []) == 4
                and mc14_post_reload.get("slots") == mc14_pre_reload.get("slots")
                and "stardust_badge" in (mc14_post_reload.get("shown") or [])
                and bool(mc14_post_reload.get("roomMounted"))
                and mc14_post_reload.get("roomTheme") == "starlight_dome"
                and int(mc14_post_reload.get("roomProps", 0)) == 4
            )
            add_check(
                "MC-14 Reload Persistence (星尘徽章, Owned / Active Decor Theme, Owned Props, Corner Slots, 星尘徽章奖杯 on Display & Lobby 3D Room Rebuilt)",
                mc14_reload_ok,
                json.dumps({"before": mc14_pre_reload, "after": mc14_post_reload}, ensure_ascii=False),
            )

            # MC-14 save compatibility: a pre-MC-14 save gets defaults; dirty values are clamped on load
            mc14_saved_raw = desk1440_page.evaluate("localStorage.getItem('swarm_control_3d_save_v3') || ''")
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                for (const k of ['stardustBadges', 'lifetimeStardustBadges', 'asteroidDashClears', 'bestAsteroidFinishSec',
                    'bestAsteroidSurvivors', 'totalAsteroidShieldBlocks', 'totalAsteroidBobosLost', 'ownedDecorThemes',
                    'activeDecorTheme', 'ownedDecorProps', 'decorSlots']) delete s[k];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc14_old_snap = desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const s = w.state;
                return { badges: s.stardustBadges, life: s.lifetimeStardustBadges, clears: s.asteroidDashClears, bestSec: s.bestAsteroidFinishSec,
                    themes: [...s.ownedDecorThemes], theme: s.activeDecorTheme, props: [...s.ownedDecorProps], slots: [...s.decorSlots],
                    astTier: s.getAsteroidDashSpec().asteroidTier, comfort: s.getDecorComfort(), roomTheme: w.getLobbyDecorSnapshot().themeId,
                    roomProps: w.getLobbyDecorSnapshot().props.length, lavaCores: s.lavaCores };
            }"""
            )
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                s.stardustBadges = -3;
                s.lifetimeStardustBadges = 'many';
                s.asteroidDashClears = 2.7;
                s.bestAsteroidFinishSec = -5;
                s.bestAsteroidSurvivors = 5000;
                s.totalAsteroidShieldBlocks = 'x';
                s.ownedDecorThemes = ['palace', 'candy_pink', 'candy_pink', 3, null];
                s.activeDecorTheme = 'lava_forge';
                s.ownedDecorProps = ['star_lamp', 'disco_ball', 'star_lamp', 'jelly_plant', 9];
                s.decorSlots = ['jelly_plant', 'squad_banner', 'jelly_plant', 'star_lamp', 'star_lamp'];
                s.trophyHallSlots = 6;
                s.trophyDisplay = ['stardust_badge', null, null, null, null, null];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc14_dirty_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.stardustBadges, life: s.lifetimeStardustBadges, clears: s.asteroidDashClears, bestSec: s.bestAsteroidFinishSec,
                    bestSurv: s.bestAsteroidSurvivors, blocks: s.totalAsteroidShieldBlocks, themes: [...s.ownedDecorThemes],
                    theme: s.activeDecorTheme, props: [...s.ownedDecorProps], slots: [...s.decorSlots], display0: s.trophyDisplay[0],
                    comfort: s.getDecorComfort() };
            }"""
            )
            desk1440_page.evaluate(
                "(raw) => { if (raw) localStorage.setItem('swarm_control_3d_save_v3', raw); }", mc14_saved_raw
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            desk1440_page.wait_for_timeout(80)
            mc14_save_compat = (
                int(mc14_old_snap.get("badges", -1)) == 0
                and int(mc14_old_snap.get("life", -1)) == 0
                and int(mc14_old_snap.get("clears", -1)) == 0
                and float(mc14_old_snap.get("bestSec", -1)) == 0
                and mc14_old_snap.get("themes") == ["navy_classic"]
                and mc14_old_snap.get("theme") == "navy_classic"
                and mc14_old_snap.get("props") == []
                and mc14_old_snap.get("slots") == [None, None, None, None]
                and int(mc14_old_snap.get("astTier", 0)) == 1
                and int(mc14_old_snap.get("comfort", -1)) == 0
                and mc14_old_snap.get("roomTheme") == "navy_classic"
                and int(mc14_old_snap.get("roomProps", -1)) == 0
                and int(mc14_dirty_snap.get("badges", -1)) == 0
                and int(mc14_dirty_snap.get("life", -1)) == 0
                and int(mc14_dirty_snap.get("clears", -1)) == 2
                and float(mc14_dirty_snap.get("bestSec", -1)) == 0
                and int(mc14_dirty_snap.get("bestSurv", -1)) == 600
                and int(mc14_dirty_snap.get("blocks", -1)) == 0
                and mc14_dirty_snap.get("themes") == ["navy_classic", "candy_pink"]
                and mc14_dirty_snap.get("theme") == "navy_classic"
                and mc14_dirty_snap.get("props") == ["star_lamp", "jelly_plant"]
                and mc14_dirty_snap.get("slots") == ["jelly_plant", None, None, "star_lamp"]
                and mc14_dirty_snap.get("display0") is None
                and int(mc14_dirty_snap.get("comfort", -1)) == 2
            )
            add_check(
                "MC-14 Save Compat (Pre-MC-14 Save Loads Defaults, Dirty Badges / Records / Unknown & Duplicate Themes / Props / Unowned Theme & Slot Props Clamped, Unearned 星尘徽章奖杯 Dropped)",
                mc14_save_compat,
                json.dumps({"oldSave": mc14_old_snap, "dirtySave": mc14_dirty_snap}, ensure_ascii=False),
            )
            desk1440_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                window.scrollTo(0, 0);
                document.querySelector('#menu-panel-launch')?.scrollTo?.(0, 0);
            }"""
            )
            desk1440_page.wait_for_timeout(500)
            desk1440_mc14_lobby_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_mc14_lobby = desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const ped = document.getElementById('lobby-trophy-pedestal');
                const r = ped ? ped.getBoundingClientRect() : null;
                const room = w.getLobbyDecorSnapshot();
                const ast = document.getElementById('btn-start-asteroid-dash');
                const ar = ast ? ast.getBoundingClientRect() : null;
                return { pedFit: Boolean(r && r.left >= 0 && r.right <= window.innerWidth && r.width > 150), roomTheme: room.themeId,
                    roomProps: room.props.length, cups: w.trophyPedestal ? w.trophyPedestal.cupsGroup.children.length : -1,
                    astFit: Boolean(ar && ar.left >= 0 && ar.right <= window.innerWidth) };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc14_desktop_lobby_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-start-asteroid-dash')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 392 && w.asteroidRun && w.asteroidRun.active; step++) {
                        w.turretTargetX = w.getAsteroidAutopilotX();
                        w.update(0.05);
                    }
                }
            }"""
            )
            desk1440_page.wait_for_timeout(260)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_page.wait_for_timeout(60)
            desk1440_ast_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_ast_info = desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const hud = document.getElementById('asteroid-dash-hud');
                const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
                const ast = w.asteroidRun;
                return { active: Boolean(ast && ast.active), dist: ast ? Math.round(ast.distance) : 0, bobos: w.asteroidBoboCount,
                    shield: Boolean(ast && ast.bubble.visible), strikeWarn: w.asteroidMeteors.some((m) => m.telegraphed && !m.impacted && m.group.visible),
                    hudFit: pills.length === 3 && pills.every((p) => { const r = p.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }) };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc14_desktop_asteroid_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            add_check(
                "MC-14 Desktop 1440x900 (Decoration Hall Panel, Lobby 3D Room with Starlight Theme + 4 Props + Pedestal Cups, Asteroid Run Mid-Course with Shield Bubble & Telegraphed Strike, HUD Fit, Zero Overflow)",
                max(desk1440_decor_ov, desk1440_mc14_lobby_ov, desk1440_ast_ov) <= 0
                and bool(desk1440_mc14_lobby.get("pedFit"))
                and bool(desk1440_mc14_lobby.get("astFit"))
                and desk1440_mc14_lobby.get("roomTheme") == "starlight_dome"
                and int(desk1440_mc14_lobby.get("roomProps", 0)) == 4
                and int(desk1440_mc14_lobby.get("cups", 0)) >= 2
                and bool(desk1440_ast_info.get("active"))
                and bool(desk1440_ast_info.get("hudFit"))
                and bool(desk1440_ast_info.get("shield"))
                and bool(desk1440_ast_info.get("strikeWarn")),
                json.dumps(
                    {
                        "ov": [desk1440_decor_ov, desk1440_mc14_lobby_ov, desk1440_ast_ov],
                        "lobby": desk1440_mc14_lobby,
                        "ast": desk1440_ast_info,
                    },
                    ensure_ascii=False,
                ),
            )

        if want("MC-15"):
            # MC-15 (1440x900): tactic deck workshop panel, lobby (pumpkin card + tactic strip), reload persistence, save compat,
            # a pumpkin night run mid-course (ghost + lit zone), the tactic HUD in a campaign battle and the victory modal
            desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.gold = Math.max(s.gold, 60000);
                    s.stardustBadges = Math.max(s.stardustBadges, 6);
                    s.lifetimeStardustBadges = Math.max(s.lifetimeStardustBadges, s.stardustBadges);
                    s.lavaCores = Math.max(s.lavaCores, 6);
                    s.lifetimeLavaCores = Math.max(s.lifetimeLavaCores, s.lavaCores);
                    s.pumpkinBadges = Math.max(s.pumpkinBadges, 9);
                    s.lifetimePumpkinBadges = Math.max(s.lifetimePumpkinBadges, s.pumpkinBadges);
                    s.trophyHallSlots = Math.max(s.trophyHallSlots, 3);
                    s.save();
                }
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                for (const cid of ['shield_open', 'rush_final', 'crowd_open', 'rush_half']) {
                    document.querySelector(`#tactic-card-grid [data-tactic-buy="${cid}"]`)?.click();
                }
                document.querySelector('#trophy-hall-grid [data-trophy-place="pumpkin_badge"]')?.click();
                document.getElementById('tactic-deck')?.scrollIntoView({ block: 'start' });
            }"""
            )
            desk1440_page.wait_for_timeout(500)
            desk1440_tactic_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_tactic = desk1440_page.evaluate(
                """() => {
                const fitAll = (sel) => Array.from(document.querySelectorAll(sel)).every((el) => {
                    const r = el.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth;
                });
                const s = window.__mc3dWorld.state;
                return { cards: document.querySelectorAll('#tactic-card-grid .tactic-card').length,
                    cardsFit: fitAll('#tactic-card-grid .tactic-card') && fitAll('#tactic-deck-slots .tactic-slot'),
                    btnsFit: fitAll('#tactic-deck .finish-action-btn'), deck: [...s.tacticDeck], owned: s.ownedTacticCards.length };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc15_desktop_tactic_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            mc15_pre_reload = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.pumpkinBadges, life: s.lifetimePumpkinBadges, owned: [...s.ownedTacticCards], deck: [...s.tacticDeck],
                    shown: s.getDisplayedTrophyIds() };
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(150)
            desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            desk1440_page.wait_for_timeout(80)
            mc15_post_reload = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.pumpkinBadges, life: s.lifetimePumpkinBadges, owned: [...s.ownedTacticCards], deck: [...s.tacticDeck],
                    shown: s.getDisplayedTrophyIds(), lobbySlots: document.querySelectorAll('#lobby-tactic-slots .lobby-tactic-slot.is-filled').length };
            }"""
            )
            mc15_reload_ok = (
                mc15_post_reload.get("badges") == mc15_pre_reload.get("badges")
                and mc15_post_reload.get("life") == mc15_pre_reload.get("life")
                and mc15_post_reload.get("owned") == mc15_pre_reload.get("owned")
                and len(mc15_pre_reload.get("owned") or []) == 4
                and mc15_pre_reload.get("deck") == ["shield_open", "rush_final", "crowd_open"]
                and mc15_post_reload.get("deck") == mc15_pre_reload.get("deck")
                and "pumpkin_badge" in (mc15_post_reload.get("shown") or [])
                and int(mc15_post_reload.get("lobbySlots", 0)) == 3
            )
            add_check(
                "MC-15 Reload Persistence (南瓜灯徽章, Unlocked Tactic Cards, 3-Card Deck, Lobby Strip & 南瓜灯徽章奖杯 on Display)",
                mc15_reload_ok,
                json.dumps({"before": mc15_pre_reload, "after": mc15_post_reload}, ensure_ascii=False),
            )

            # MC-15 save compatibility: a pre-MC-15 save gets defaults; dirty values are clamped on load
            mc15_saved_raw = desk1440_page.evaluate("localStorage.getItem('swarm_control_3d_save_v3') || ''")
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                for (const k of ['pumpkinBadges', 'lifetimePumpkinBadges', 'pumpkinNightClears', 'bestPumpkinFinishSec', 'bestPumpkinSurvivors',
                    'totalPumpkinGhostsDispelled', 'totalPumpkinBobosLost', 'ownedTacticCards', 'tacticDeck', 'totalTacticTriggers']) delete s[k];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc15_old_snap = desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const s = w.state;
                return { badges: s.pumpkinBadges, life: s.lifetimePumpkinBadges, clears: s.pumpkinNightClears, bestSec: s.bestPumpkinFinishSec,
                    owned: [...s.ownedTacticCards], deck: [...s.tacticDeck], equipped: s.getEquippedTacticCards().length,
                    pkTier: s.getPumpkinNightSpec().pumpkinTier, triggers: s.totalTacticTriggers };
            }"""
            )
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                s.pumpkinBadges = -4;
                s.lifetimePumpkinBadges = 'lots';
                s.pumpkinNightClears = 3.6;
                s.bestPumpkinFinishSec = -2;
                s.bestPumpkinSurvivors = 9000;
                s.totalPumpkinGhostsDispelled = 'x';
                s.ownedTacticCards = ['shield_open', 'mega_card', 'shield_open', 'rush_half', 7, null];
                s.tacticDeck = ['rush_half', 'rush_half', 'crowd_final', 'shield_open', 'shield_open'];
                s.totalTacticTriggers = -1;
                s.trophyHallSlots = 6;
                s.trophyDisplay = ['pumpkin_badge', null, null, null, null, null];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc15_dirty_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.pumpkinBadges, life: s.lifetimePumpkinBadges, clears: s.pumpkinNightClears, bestSec: s.bestPumpkinFinishSec,
                    bestSurv: s.bestPumpkinSurvivors, dispelled: s.totalPumpkinGhostsDispelled, owned: [...s.ownedTacticCards],
                    deck: [...s.tacticDeck], triggers: s.totalTacticTriggers, display0: s.trophyDisplay[0] };
            }"""
            )
            desk1440_page.evaluate(
                "(raw) => { if (raw) localStorage.setItem('swarm_control_3d_save_v3', raw); }", mc15_saved_raw
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            desk1440_page.wait_for_timeout(80)
            mc15_save_compat = (
                int(mc15_old_snap.get("badges", -1)) == 0
                and int(mc15_old_snap.get("life", -1)) == 0
                and int(mc15_old_snap.get("clears", -1)) == 0
                and float(mc15_old_snap.get("bestSec", -1)) == 0
                and mc15_old_snap.get("owned") == []
                and mc15_old_snap.get("deck") == [None, None, None]
                and int(mc15_old_snap.get("equipped", -1)) == 0
                and int(mc15_old_snap.get("pkTier", 0)) == 1
                and int(mc15_old_snap.get("triggers", -1)) == 0
                and int(mc15_dirty_snap.get("badges", -1)) == 0
                and int(mc15_dirty_snap.get("life", -1)) == 0
                and int(mc15_dirty_snap.get("clears", -1)) == 3
                and float(mc15_dirty_snap.get("bestSec", -1)) == 0
                and int(mc15_dirty_snap.get("bestSurv", -1)) == 600
                and int(mc15_dirty_snap.get("dispelled", -1)) == 0
                and mc15_dirty_snap.get("owned") == ["shield_open", "rush_half"]
                and mc15_dirty_snap.get("deck") == ["rush_half", None, None]
                and int(mc15_dirty_snap.get("triggers", -1)) == 0
                and mc15_dirty_snap.get("display0") is None
            )
            add_check(
                "MC-15 Save Compat (Pre-MC-15 Save Loads Defaults, Dirty Badges / Records / Unknown & Duplicate Cards / Unowned & Repeated Deck Slots Clamped, Unearned 南瓜灯徽章奖杯 Dropped)",
                mc15_save_compat,
                json.dumps({"oldSave": mc15_old_snap, "dirtySave": mc15_dirty_snap}, ensure_ascii=False),
            )
            desk1440_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                window.scrollTo(0, 0);
                document.getElementById('btn-start-pumpkin-night')?.scrollIntoView({ block: 'center' });
            }"""
            )
            desk1440_page.wait_for_timeout(500)
            desk1440_mc15_lobby_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_mc15_lobby = desk1440_page.evaluate(
                """() => {
                const fit = (el, minW) => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth && r.width > minW;
                };
                return { pkFit: fit(document.getElementById('btn-start-pumpkin-night'), 200),
                    stripFit: fit(document.getElementById('lobby-tactic-deck'), 200),
                    slots: document.querySelectorAll('#lobby-tactic-slots .lobby-tactic-slot.is-filled').length,
                    badge: document.getElementById('pumpkin-badge-text')?.textContent?.trim() || '' };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc15_desktop_lobby_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            # Campaign battle with the tactic deck HUD (start cards fired)
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-start-battle')?.click();
                const w = window.__mc3dWorld;
                if (w) for (let i = 0; i < 40; i++) w.update(0.05);
            }"""
            )
            desk1440_page.wait_for_timeout(300)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_page.wait_for_timeout(60)
            desk1440_battle_tactic_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_battle_tactic = desk1440_page.evaluate(
                """() => {
                const hud = document.getElementById('tactic-deck-hud');
                const chips = hud ? Array.from(hud.querySelectorAll('.tactic-hud-chip')) : [];
                return { chips: chips.length, fired: chips.filter((c) => c.classList.contains('is-fired')).length,
                    fit: chips.length === 3 && !hud.classList.contains('hidden') && chips.every((c) => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }) };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc15_desktop_battle_tactic_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.getElementById('btn-start-pumpkin-night')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    // March up to the first haunt row: a wall-phasing ghost converging on a lit zone is on screen
                    for (let step = 0; step < 400 && w.pumpkinRun && w.pumpkinRun.active && w.pumpkinRun.distance < 78; step++) {
                        w.turretTargetX = w.getPumpkinAutopilotX();
                        w.update(0.05);
                    }
                }
            }"""
            )
            desk1440_page.wait_for_timeout(260)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_page.wait_for_timeout(60)
            desk1440_pk_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_pk_info = desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const hud = document.getElementById('pumpkin-night-hud');
                const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
                const thud = document.getElementById('tactic-deck-hud');
                const chips = thud ? Array.from(thud.querySelectorAll('.tactic-hud-chip')) : [];
                const pk = w.pumpkinRun;
                const inView = (o) => o.group.visible;
                return { active: Boolean(pk && pk.active), dist: pk ? Math.round(pk.distance) : 0, bobos: w.pumpkinBoboCount,
                    light: pk ? Math.round(pk.light) : 0, ghostVisible: w.pumpkinGhosts.some((g) => g.emerged && inView(g)),
                    lampVisible: w.pumpkinLamps.some(inView), moon: Boolean(pk && pk.moon.visible),
                    hudFit: pills.length === 3 && pills.every((p) => { const r = p.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }),
                    tacticFit: chips.length === 3 && chips.every((c) => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }) };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc15_desktop_pumpkin_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 900 && w.pumpkinRun && w.pumpkinRun.active; step++) {
                        w.turretTargetX = w.getPumpkinAutopilotX();
                        w.update(0.05);
                    }
                }
            }"""
            )
            desk1440_page.wait_for_timeout(2600)
            desk1440_result = desk1440_page.evaluate(
                """() => {
                const m = document.getElementById('result-modal');
                const box = m ? m.querySelector('.modal-content, .modal-card, .result-card') || m : null;
                const r = box ? box.getBoundingClientRect() : null;
                return { shown: Boolean(m && !m.classList.contains('hidden')), title: document.getElementById('modal-title')?.textContent || '',
                    fit: Boolean(r && r.left >= 0 && r.right <= window.innerWidth) };
            }"""
            )
            desk1440_result_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc15_desktop_result_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            add_check(
                "MC-15 Desktop 1440x900 (Tactic Deck Panel, Lobby Pumpkin Card + Tactic Strip, Campaign Tactic HUD, Pumpkin Night Mid-Course with Ghost + Lit Zone + Moon, HUD Fit, Victory Modal, Zero Overflow)",
                max(desk1440_tactic_ov, desk1440_mc15_lobby_ov, desk1440_battle_tactic_ov, desk1440_pk_ov, desk1440_result_ov) <= 0
                and int(desk1440_tactic.get("cards", 0)) == 9
                and bool(desk1440_tactic.get("cardsFit"))
                and bool(desk1440_tactic.get("btnsFit"))
                and bool(desk1440_mc15_lobby.get("pkFit"))
                and bool(desk1440_mc15_lobby.get("stripFit"))
                and int(desk1440_mc15_lobby.get("slots", 0)) == 3
                and int(desk1440_battle_tactic.get("fired", 0)) >= 2
                and bool(desk1440_battle_tactic.get("fit"))
                and bool(desk1440_pk_info.get("active"))
                and bool(desk1440_pk_info.get("hudFit"))
                and bool(desk1440_pk_info.get("tacticFit"))
                and bool(desk1440_pk_info.get("ghostVisible"))
                and bool(desk1440_pk_info.get("moon"))
                and bool(desk1440_result.get("shown"))
                and ("古堡" in str(desk1440_result.get("title", ""))),
                json.dumps(
                    {
                        "ov": [desk1440_tactic_ov, desk1440_mc15_lobby_ov, desk1440_battle_tactic_ov, desk1440_pk_ov, desk1440_result_ov],
                        "tactic": desk1440_tactic,
                        "lobby": desk1440_mc15_lobby,
                        "battle": desk1440_battle_tactic,
                        "pk": desk1440_pk_info,
                        "result": desk1440_result,
                    },
                    ensure_ascii=False,
                ),
            )
        if want("MC-16"):
            # MC-16 (1440x900): tactic balance row + campaign switch, reload persistence, save compat, lobby pyramid card,
            # the pyramid run at a quicksand belt / a flip-slab row / the tomb gate, the campaign ×0.6 HUD and the victory modal
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-modal-home')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.gold = Math.max(s.gold, 60000);
                    s.lavaCores = Math.max(s.lavaCores, 6);
                    s.lifetimeLavaCores = Math.max(s.lifetimeLavaCores, s.lavaCores);
                    s.scarabBadges = Math.max(s.scarabBadges, 9);
                    s.lifetimeScarabBadges = Math.max(s.lifetimeScarabBadges, s.scarabBadges);
                    s.trophyHallSlots = Math.max(s.trophyHallSlots, 3);
                    s.tacticCampaignEnabled = true;
                    s.save();
                }
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                for (const cid of ['shield_open', 'rush_final', 'crowd_open']) {
                    document.querySelector(`#tactic-card-grid [data-tactic-buy="${cid}"]`)?.click();
                }
                const s = window.__mc3dWorld.state;
                s.tacticDeck = ['shield_open', 'rush_final', 'crowd_open'];
                s.save();
                document.querySelector('#trophy-hall-grid [data-trophy-place="scarab_badge"]')?.click();
                if (!s.getDisplayedTrophyIds().includes('scarab_badge')) {
                    const unlocked = s.getUnlockedTrophySlots();
                    let idx = s.trophyDisplay.findIndex((t, i) => i < unlocked && !t);
                    if (idx < 0) {
                        idx = 0;
                        s.trophyDisplay[0] = null;
                    }
                    s.placeTrophy(idx, 'scarab_badge');
                }
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                document.getElementById('tactic-balance-row')?.scrollIntoView({ block: 'center' });
            }"""
            )
            desk1440_page.wait_for_timeout(500)
            desk1440_mc16_meta_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_mc16_meta = desk1440_page.evaluate(
                """() => {
                const fit = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && r.width > 20; };
                const tags = Array.from(document.querySelectorAll('#tactic-card-grid .tactic-card-tag'));
                return { rowFit: fit(document.getElementById('tactic-balance-row')), toggleFit: fit(document.getElementById('btn-tactic-campaign-toggle')),
                    tagsFit: tags.length === 9 && tags.every((t) => fit(t)), title: document.getElementById('tactic-balance-title')?.textContent || '',
                    shown: window.__mc3dWorld.state.getDisplayedTrophyIds() };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_desktop_tactic_balance_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            # Switch the campaign deck off with the real toggle, then check persistence across a reload
            desk1440_page.evaluate("document.getElementById('btn-tactic-campaign-toggle')?.click()")
            desk1440_page.wait_for_timeout(120)
            mc16_pre_reload = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.scarabBadges, life: s.lifetimeScarabBadges, clears: s.pyramidRunClears, campaign: s.tacticCampaignEnabled,
                    deck: [...s.tacticDeck], shown: s.getDisplayedTrophyIds() };
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(150)
            desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            desk1440_page.wait_for_timeout(80)
            mc16_post_reload = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.scarabBadges, life: s.lifetimeScarabBadges, clears: s.pyramidRunClears, campaign: s.tacticCampaignEnabled,
                    deck: [...s.tacticDeck], shown: s.getDisplayedTrophyIds(), lobbySub: document.getElementById('lobby-tactic-sub')?.textContent || '',
                    toggleTxt: document.getElementById('btn-tactic-campaign-toggle')?.textContent || '' };
            }"""
            )
            mc16_reload_ok = (
                mc16_post_reload.get("badges") == mc16_pre_reload.get("badges")
                and int(mc16_pre_reload.get("badges", 0)) >= 9
                and mc16_post_reload.get("life") == mc16_pre_reload.get("life")
                and mc16_post_reload.get("clears") == mc16_pre_reload.get("clears")
                and mc16_pre_reload.get("campaign") is False
                and mc16_post_reload.get("campaign") is False
                and "主线关闭" in str(mc16_post_reload.get("lobbySub", ""))
                and "开启" in str(mc16_post_reload.get("toggleTxt", ""))
                and mc16_post_reload.get("deck") == mc16_pre_reload.get("deck")
                and "scarab_badge" in (mc16_post_reload.get("shown") or [])
            )
            add_check(
                "MC-16 Reload Persistence (圣甲虫徽章, Pyramid Clears, Campaign Tactic Switch Off, Deck & 圣甲虫徽章奖杯 on Display)",
                mc16_reload_ok,
                json.dumps({"before": mc16_pre_reload, "after": mc16_post_reload}, ensure_ascii=False),
            )
            # MC-16 save compatibility: a pre-MC-16 save gets defaults (campaign switch on); dirty values are clamped on load
            mc16_saved_raw = desk1440_page.evaluate("localStorage.getItem('swarm_control_3d_save_v3') || ''")
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                for (const k of ['scarabBadges', 'lifetimeScarabBadges', 'pyramidRunClears', 'bestPyramidFinishSec', 'bestPyramidSurvivors',
                    'totalPyramidTrapsDodged', 'totalPyramidBobosLost', 'tacticCampaignEnabled']) delete s[k];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc16_old_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.scarabBadges, life: s.lifetimeScarabBadges, clears: s.pyramidRunClears, bestSec: s.bestPyramidFinishSec,
                    campaign: s.tacticCampaignEnabled, pyTier: s.getPyramidRunSpec().pyramidTier, dodged: s.totalPyramidTrapsDodged,
                    shown: s.getDisplayedTrophyIds() };
            }"""
            )
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                s.scarabBadges = -3;
                s.lifetimeScarabBadges = 'heaps';
                s.pyramidRunClears = 2.7;
                s.bestPyramidFinishSec = -5;
                s.bestPyramidSurvivors = 9999;
                s.totalPyramidTrapsDodged = 'q';
                s.totalPyramidBobosLost = -1;
                s.tacticCampaignEnabled = 'nope';
                s.trophyHallSlots = 6;
                s.trophyDisplay = ['scarab_badge', null, null, null, null, null];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc16_dirty_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.scarabBadges, life: s.lifetimeScarabBadges, clears: s.pyramidRunClears, bestSec: s.bestPyramidFinishSec,
                    bestSurv: s.bestPyramidSurvivors, dodged: s.totalPyramidTrapsDodged, lost: s.totalPyramidBobosLost,
                    campaign: s.tacticCampaignEnabled, display0: s.trophyDisplay[0] };
            }"""
            )
            desk1440_page.evaluate(
                "(raw) => { if (raw) localStorage.setItem('swarm_control_3d_save_v3', raw); }", mc16_saved_raw
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-enter-workshop')?.click();
                const s = window.__mc3dWorld.state;
                s.setTacticCampaignEnabled(true);
            }"""
            )
            desk1440_page.wait_for_timeout(80)
            mc16_save_compat = (
                int(mc16_old_snap.get("badges", -1)) == 0
                and int(mc16_old_snap.get("life", -1)) == 0
                and int(mc16_old_snap.get("clears", -1)) == 0
                and float(mc16_old_snap.get("bestSec", -1)) == 0
                and mc16_old_snap.get("campaign") is True
                and int(mc16_old_snap.get("pyTier", 0)) == 1
                and int(mc16_old_snap.get("dodged", -1)) == 0
                and "scarab_badge" not in (mc16_old_snap.get("shown") or [])
                and int(mc16_dirty_snap.get("badges", -1)) == 0
                and int(mc16_dirty_snap.get("life", -1)) == 0
                and int(mc16_dirty_snap.get("clears", -1)) == 2
                and float(mc16_dirty_snap.get("bestSec", -1)) == 0
                and int(mc16_dirty_snap.get("bestSurv", -1)) == 600
                and int(mc16_dirty_snap.get("dodged", -1)) == 0
                and int(mc16_dirty_snap.get("lost", -1)) == 0
                and mc16_dirty_snap.get("campaign") is True
                and mc16_dirty_snap.get("display0") is None
            )
            add_check(
                "MC-16 Save Compat (Pre-MC-16 Save Loads Defaults with the Campaign Switch On, Dirty 圣甲虫徽章 / Records / Switch Clamped, Unearned 圣甲虫徽章奖杯 Dropped)",
                mc16_save_compat,
                json.dumps({"oldSave": mc16_old_snap, "dirtySave": mc16_dirty_snap}, ensure_ascii=False),
            )
            desk1440_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                window.scrollTo(0, 0);
                document.getElementById('btn-start-pyramid-run')?.scrollIntoView({ block: 'center' });
            }"""
            )
            desk1440_page.wait_for_timeout(500)
            desk1440_mc16_lobby_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_mc16_lobby = desk1440_page.evaluate(
                """() => {
                const fit = (el, minW) => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth && r.width > minW;
                };
                return { pyFit: fit(document.getElementById('btn-start-pyramid-run'), 200),
                    badgeFit: fit(document.getElementById('pyramid-run-badge'), 60),
                    badge: document.getElementById('scarab-badge-text')?.textContent?.trim() || '' };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_desktop_lobby_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            # Campaign battle: the ×0.6 tag in front of the tactic chips
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-start-battle')?.click();
                const w = window.__mc3dWorld;
                if (w) for (let i = 0; i < 40; i++) w.update(0.05);
            }"""
            )
            desk1440_page.wait_for_timeout(1700)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_page.wait_for_timeout(60)
            desk1440_mc16_camp_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_mc16_camp = desk1440_page.evaluate(
                """() => {
                const hud = document.getElementById('tactic-deck-hud');
                const els = hud ? Array.from(hud.children) : [];
                const tr = window.__mc3dWorld.tacticRun;
                return { tag: Boolean(hud && hud.querySelector('.tactic-hud-scale')), n: els.length, campaign: Boolean(tr && tr.isCampaign && tr.effectMult === 0.6),
                    fit: els.length === 4 && els.every((c) => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }) };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_desktop_campaign_tactic_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            pyramid_walk_js = """(target) => {
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 900 && w.pyramidRun && w.pyramidRun.active && w.pyramidRun.distance < target; step++) {
                        w.turretTargetX = w.getPyramidAutopilotX();
                        w.update(0.05);
                    }
                }
            }"""
            pyramid_info_js = """() => {
                const w = window.__mc3dWorld;
                const hud = document.getElementById('pyramid-run-hud');
                const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
                const thud = document.getElementById('tactic-deck-hud');
                const chips = thud ? Array.from(thud.querySelectorAll('.tactic-hud-chip')) : [];
                const py = w.pyramidRun;
                const inside = (el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; };
                return { active: Boolean(py && py.active), dist: py ? Math.round(py.distance) : 0, bobos: w.pyramidBoboCount, lost: w.pyramidBobosLost,
                    sandVisible: w.pyramidSands.some((b) => b.group.visible), slabVisible: w.pyramidSlabRows.some((r) => r.group.visible),
                    exitVisible: Boolean(w.pyramidExitGroup && w.pyramidExitGroup.visible), sun: Boolean(py && py.sun.visible),
                    hudFit: pills.length === 3 && !hud.classList.contains('hidden') && pills.every(inside),
                    tacticFit: chips.length === 3 && chips.every(inside),
                    ov: document.documentElement.scrollWidth - window.innerWidth };
            }"""
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.getElementById('btn-start-pyramid-run')?.click();
            }"""
            )
            desk1440_page.evaluate(pyramid_walk_js, 22)
            desk1440_page.wait_for_timeout(260)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_page.wait_for_timeout(60)
            desk1440_py_sand = desk1440_page.evaluate(pyramid_info_js)
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_desktop_pyramid_sand_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(pyramid_walk_js, 49)
            desk1440_page.wait_for_timeout(200)
            desk1440_py_slab = desk1440_page.evaluate(pyramid_info_js)
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_desktop_pyramid_slab_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(pyramid_walk_js, 207)
            desk1440_page.wait_for_timeout(200)
            desk1440_py_exit = desk1440_page.evaluate(pyramid_info_js)
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_desktop_pyramid_exit_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(pyramid_walk_js, 99999)
            desk1440_page.wait_for_timeout(2600)
            desk1440_mc16_result = desk1440_page.evaluate(
                """() => {
                const m = document.getElementById('result-modal');
                const box = m ? m.querySelector('.modal-content, .modal-card, .result-card') || m : null;
                const r = box ? box.getBoundingClientRect() : null;
                return { shown: Boolean(m && !m.classList.contains('hidden')), title: document.getElementById('modal-title')?.textContent || '',
                    fit: Boolean(r && r.left >= 0 && r.right <= window.innerWidth) };
            }"""
            )
            desk1440_mc16_result_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_desktop_result_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            add_check(
                "MC-16 Desktop 1440x900 (Tactic Balance Row + Card Tags Fit, Lobby Pyramid Card Fit, Campaign ×0.6 HUD Tag Fit, Pyramid Run at a Quicksand Belt / Flip-Slab Row / Tomb Gate with Sun, HUD + Tactic Chips Fit, Victory Modal, Zero Overflow)",
                max(
                    desk1440_mc16_meta_ov,
                    desk1440_mc16_lobby_ov,
                    desk1440_mc16_camp_ov,
                    int(desk1440_py_sand.get("ov", 0)),
                    int(desk1440_py_slab.get("ov", 0)),
                    int(desk1440_py_exit.get("ov", 0)),
                    desk1440_mc16_result_ov,
                )
                <= 0
                and bool(desk1440_mc16_meta.get("rowFit"))
                and bool(desk1440_mc16_meta.get("toggleFit"))
                and bool(desk1440_mc16_meta.get("tagsFit"))
                and bool(desk1440_mc16_lobby.get("pyFit"))
                and bool(desk1440_mc16_lobby.get("badgeFit"))
                and bool(desk1440_mc16_camp.get("tag"))
                and bool(desk1440_mc16_camp.get("campaign"))
                and bool(desk1440_mc16_camp.get("fit"))
                and bool(desk1440_py_sand.get("active"))
                and bool(desk1440_py_sand.get("sandVisible"))
                and bool(desk1440_py_sand.get("sun"))
                and bool(desk1440_py_sand.get("hudFit"))
                and bool(desk1440_py_sand.get("tacticFit"))
                and bool(desk1440_py_slab.get("slabVisible"))
                and bool(desk1440_py_slab.get("hudFit"))
                and bool(desk1440_py_exit.get("exitVisible"))
                and bool(desk1440_mc16_result.get("shown"))
                and bool(desk1440_mc16_result.get("fit"))
                and ("墓道" in str(desk1440_mc16_result.get("title", ""))),
                json.dumps(
                    {
                        "ov": [desk1440_mc16_meta_ov, desk1440_mc16_lobby_ov, desk1440_mc16_camp_ov, desk1440_mc16_result_ov],
                        "meta": desk1440_mc16_meta,
                        "lobby": desk1440_mc16_lobby,
                        "campaign": desk1440_mc16_camp,
                        "sand": desk1440_py_sand,
                        "slab": desk1440_py_slab,
                        "exit": desk1440_py_exit,
                        "result": desk1440_mc16_result,
                    },
                    ensure_ascii=False,
                ),
            )
        if want("MC-17"):
            # MC-17 (1440x900): trophy hall with the 翡翠神像徽章奖杯 on display, reload persistence, save compat, lobby jungle
            # card, the jungle run at a vine swing / a rolling boulder / the temple gate and the victory modal
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-modal-home')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.gold = Math.max(s.gold, 60000);
                    s.emeraldIdolBadges = Math.max(s.emeraldIdolBadges, 9);
                    s.lifetimeEmeraldIdolBadges = Math.max(s.lifetimeEmeraldIdolBadges, s.emeraldIdolBadges);
                    s.trophyHallSlots = Math.max(s.trophyHallSlots, 3);
                    for (const cid of ['shield_open', 'rush_open', 'crowd_open']) if (!s.ownedTacticCards.includes(cid)) s.ownedTacticCards.push(cid);
                    s.tacticDeck = ['shield_open', 'rush_open', 'crowd_open'];
                    s.save();
                }
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                const s = window.__mc3dWorld.state;
                document.querySelector('#trophy-hall-grid [data-trophy-place="emerald_idol_badge"]')?.click();
                if (!s.getDisplayedTrophyIds().includes('emerald_idol_badge')) {
                    const unlocked = s.getUnlockedTrophySlots();
                    let idx = s.trophyDisplay.findIndex((t, i) => i < unlocked && !t);
                    if (idx < 0) {
                        idx = 0;
                        s.trophyDisplay[0] = null;
                    }
                    s.placeTrophy(idx, 'emerald_idol_badge');
                }
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                document.querySelector('#trophy-hall-grid [data-hall-trophy="emerald_idol_badge"]')?.scrollIntoView({ block: 'center' });
            }"""
            )
            desk1440_page.wait_for_timeout(500)
            desk1440_mc17_hall = desk1440_page.evaluate(
                """() => {
                const fit = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && r.width > 20; };
                const card = document.querySelector('#trophy-hall-grid [data-hall-trophy="emerald_idol_badge"]');
                const img = card ? card.querySelector('img.trophy-cabinet-source') : null;
                return { ov: document.documentElement.scrollWidth - window.innerWidth, cardFit: fit(card),
                    shown: card ? card.classList.contains('is-displayed-trophy') : false,
                    img: Boolean(img && img.complete && img.naturalWidth > 0 && img.src.includes('ui_emerald_idol_badge.png?v=33')),
                    name: card?.querySelector('.finish-name')?.textContent || '', cards: document.querySelectorAll('#trophy-hall-grid .trophy-cabinet-card').length,
                    art: (""" + ART_PAIR_JS + """)() };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_desktop_trophy_hall_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            mc17_pre_reload = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.emeraldIdolBadges, life: s.lifetimeEmeraldIdolBadges, clears: s.jungleSwingClears, best: s.bestJungleFinishSec,
                    tier: s.getJungleSwingSpec().jungleTier, shown: s.getDisplayedTrophyIds() };
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(150)
            desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            desk1440_page.wait_for_timeout(80)
            mc17_post_reload = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.emeraldIdolBadges, life: s.lifetimeEmeraldIdolBadges, clears: s.jungleSwingClears, best: s.bestJungleFinishSec,
                    tier: s.getJungleSwingSpec().jungleTier, shown: s.getDisplayedTrophyIds(),
                    badgeTxt: document.getElementById('emerald-idol-text')?.textContent || '' };
            }"""
            )
            mc17_reload_ok = (
                int(mc17_pre_reload.get("badges", 0)) >= 9
                and mc17_post_reload.get("badges") == mc17_pre_reload.get("badges")
                and mc17_post_reload.get("life") == mc17_pre_reload.get("life")
                and mc17_post_reload.get("clears") == mc17_pre_reload.get("clears")
                and mc17_post_reload.get("best") == mc17_pre_reload.get("best")
                and mc17_post_reload.get("tier") == mc17_pre_reload.get("tier")
                and "emerald_idol_badge" in (mc17_post_reload.get("shown") or [])
                and str(mc17_post_reload.get("badges")) in str(mc17_post_reload.get("badgeTxt", ""))
            )
            add_check(
                "MC-17 Reload Persistence (翡翠神像徽章, Jungle Clears / Best Time / Tier & 翡翠神像徽章奖杯 on Display)",
                mc17_reload_ok,
                json.dumps({"before": mc17_pre_reload, "after": mc17_post_reload}, ensure_ascii=False),
            )
            # MC-17 save compatibility: a pre-MC-17 save gets defaults; dirty values are clamped on load
            mc17_saved_raw = desk1440_page.evaluate("localStorage.getItem('swarm_control_3d_save_v3') || ''")
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                for (const k of ['emeraldIdolBadges', 'lifetimeEmeraldIdolBadges', 'jungleSwingClears', 'bestJungleFinishSec', 'bestJungleSurvivors',
                    'totalJungleTrapsDodged', 'totalJungleBobosLost']) delete s[k];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc17_old_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.emeraldIdolBadges, life: s.lifetimeEmeraldIdolBadges, clears: s.jungleSwingClears, bestSec: s.bestJungleFinishSec,
                    tier: s.getJungleSwingSpec().jungleTier, dodged: s.totalJungleTrapsDodged, shown: s.getDisplayedTrophyIds() };
            }"""
            )
            desk1440_page.evaluate(
                """() => {
                const s = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
                s.emeraldIdolBadges = -3;
                s.lifetimeEmeraldIdolBadges = 'heaps';
                s.jungleSwingClears = 2.7;
                s.bestJungleFinishSec = -5;
                s.bestJungleSurvivors = 9999;
                s.totalJungleTrapsDodged = 'q';
                s.totalJungleBobosLost = -1;
                s.trophyHallSlots = 6;
                s.trophyDisplay = ['emerald_idol_badge', null, null, null, null, null];
                localStorage.setItem('swarm_control_3d_save_v3', JSON.stringify(s));
            }"""
            )
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            mc17_dirty_snap = desk1440_page.evaluate(
                """() => {
                const s = window.__mc3dWorld.state;
                return { badges: s.emeraldIdolBadges, life: s.lifetimeEmeraldIdolBadges, clears: s.jungleSwingClears, bestSec: s.bestJungleFinishSec,
                    bestSurv: s.bestJungleSurvivors, dodged: s.totalJungleTrapsDodged, lost: s.totalJungleBobosLost, display0: s.trophyDisplay[0] };
            }"""
            )
            desk1440_page.evaluate("(raw) => { if (raw) localStorage.setItem('swarm_control_3d_save_v3', raw); }", mc17_saved_raw)
            desk1440_page.reload(wait_until="domcontentloaded", timeout=10000)
            desk1440_page.wait_for_timeout(120)
            desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            desk1440_page.wait_for_timeout(80)
            mc17_save_compat = (
                int(mc17_old_snap.get("badges", -1)) == 0
                and int(mc17_old_snap.get("life", -1)) == 0
                and int(mc17_old_snap.get("clears", -1)) == 0
                and float(mc17_old_snap.get("bestSec", -1)) == 0
                and int(mc17_old_snap.get("tier", 0)) == 1
                and int(mc17_old_snap.get("dodged", -1)) == 0
                and "emerald_idol_badge" not in (mc17_old_snap.get("shown") or [])
                and int(mc17_dirty_snap.get("badges", -1)) == 0
                and int(mc17_dirty_snap.get("life", -1)) == 0
                and int(mc17_dirty_snap.get("clears", -1)) == 2
                and float(mc17_dirty_snap.get("bestSec", -1)) == 0
                and int(mc17_dirty_snap.get("bestSurv", -1)) == 600
                and int(mc17_dirty_snap.get("dodged", -1)) == 0
                and int(mc17_dirty_snap.get("lost", -1)) == 0
                and mc17_dirty_snap.get("display0") is None
            )
            add_check(
                "MC-17 Save Compat (Pre-MC-17 Save Loads Defaults, Dirty 翡翠神像徽章 / Clears / Records Clamped, Unearned 翡翠神像徽章奖杯 Dropped)",
                mc17_save_compat,
                json.dumps({"oldSave": mc17_old_snap, "dirtySave": mc17_dirty_snap}, ensure_ascii=False),
            )
            desk1440_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                window.scrollTo(0, 0);
                document.getElementById('btn-start-jungle-swing')?.scrollIntoView({ block: 'center' });
            }"""
            )
            desk1440_page.wait_for_timeout(500)
            desk1440_mc17_lobby = desk1440_page.evaluate(
                """() => {
                const fit = (el, minW) => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth && r.width > minW;
                };
                return { ov: document.documentElement.scrollWidth - window.innerWidth,
                    jgFit: fit(document.getElementById('btn-start-jungle-swing'), 200),
                    badgeFit: fit(document.getElementById('jungle-swing-badge'), 60),
                    badge: document.getElementById('emerald-idol-text')?.textContent?.trim() || '',
                    art: (""" + ART_PAIR_JS + """)() };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_desktop_lobby_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.getElementById('btn-start-jungle-swing')?.click();
            }"""
            )
            desk1440_page.evaluate(JUNGLE_WALK_JS, {"kind": "chasm", "index": 0, "into": 1.4})
            desk1440_page.wait_for_timeout(260)
            desk1440_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            desk1440_page.wait_for_timeout(60)
            desk1440_jg_vine = desk1440_page.evaluate(JUNGLE_INFO_JS)
            desk1440_jg_vine["art"] = desk1440_page.evaluate(ART_PAIR_JS)
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_desktop_jungle_vine_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(JUNGLE_WALK_JS, {"kind": "boulder", "wz": -2})
            desk1440_page.wait_for_timeout(200)
            desk1440_jg_boulder = desk1440_page.evaluate(JUNGLE_INFO_JS)
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_desktop_jungle_boulder_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(JUNGLE_WALK_JS, {"kind": "exit", "before": 18})
            desk1440_page.wait_for_timeout(200)
            desk1440_jg_exit = desk1440_page.evaluate(JUNGLE_INFO_JS)
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_desktop_jungle_exit_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_page.evaluate(JUNGLE_WALK_JS, {"kind": "end"})
            desk1440_page.wait_for_timeout(2600)
            desk1440_mc17_result = desk1440_page.evaluate(
                """() => {
                const m = document.getElementById('result-modal');
                const box = m ? m.querySelector('.modal-content, .modal-card, .result-card') || m : null;
                const r = box ? box.getBoundingClientRect() : null;
                return { ov: document.documentElement.scrollWidth - window.innerWidth, shown: Boolean(m && !m.classList.contains('hidden')),
                    title: document.getElementById('modal-title')?.textContent || '', fit: Boolean(r && r.left >= 0 && r.right <= window.innerWidth),
                    art: (""" + ART_PAIR_JS + """)() };
            }"""
            )
            desk1440_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_desktop_result_1440.jpg"),
                type="jpeg",
                quality=90,
            )
            desk1440_mc17_max_ov = max(
                int(desk1440_mc17_hall.get("ov", 0)),
                int(desk1440_mc17_lobby.get("ov", 0)),
                int(desk1440_jg_vine.get("ov", 0)),
                int(desk1440_jg_boulder.get("ov", 0)),
                int(desk1440_jg_exit.get("ov", 0)),
                int(desk1440_mc17_result.get("ov", 0)),
            )
            desk1440_mc17_clashes = (
                list((desk1440_mc17_hall.get("art") or {}).get("clashes", ["?"]))
                + list((desk1440_mc17_lobby.get("art") or {}).get("clashes", ["?"]))
                + list((desk1440_jg_vine.get("art") or {}).get("clashes", ["?"]))
                + list((desk1440_mc17_result.get("art") or {}).get("clashes", ["?"]))
            )
            add_check(
                "MC-17 Desktop 1440x900 (翡翠神像徽章奖杯 Card on Display Fits, Lobby Jungle Card + Badge Fit, Jungle Run Holding a Vine over a Chasm / Dodging a Rolling Boulder's Lane / at the Temple Gate with HUD + Tactic Chips Fit, Victory Modal, No Reused-Art Clash, Zero Overflow)",
                desk1440_mc17_max_ov <= 0
                and bool(desk1440_mc17_hall.get("cardFit"))
                and bool(desk1440_mc17_hall.get("shown"))
                and bool(desk1440_mc17_hall.get("img"))
                and int(desk1440_mc17_hall.get("cards", 0)) == 11
                and bool(desk1440_mc17_lobby.get("jgFit"))
                and bool(desk1440_mc17_lobby.get("badgeFit"))
                and bool(desk1440_jg_vine.get("active"))
                and bool(desk1440_jg_vine.get("chasmVisible"))
                and bool(desk1440_jg_vine.get("vineHeld"))
                and bool(desk1440_jg_vine.get("hudFit"))
                and bool(desk1440_jg_vine.get("tacticFit"))
                and bool(desk1440_jg_boulder.get("boulderRolling"))
                and bool(desk1440_jg_boulder.get("laneVisible"))
                and bool(desk1440_jg_boulder.get("hudFit"))
                and bool(desk1440_jg_exit.get("exitVisible"))
                and bool(desk1440_mc17_result.get("shown"))
                and bool(desk1440_mc17_result.get("fit"))
                and ("神庙" in str(desk1440_mc17_result.get("title", "")))
                and len(desk1440_mc17_clashes) == 0,
                json.dumps(
                    {
                        "ov": desk1440_mc17_max_ov,
                        "hall": desk1440_mc17_hall,
                        "lobby": desk1440_mc17_lobby,
                        "vine": desk1440_jg_vine,
                        "boulder": desk1440_jg_boulder,
                        "exit": desk1440_jg_exit,
                        "result": desk1440_mc17_result,
                    },
                    ensure_ascii=False,
                ),
            )
        if RUN_1440:
            desk1440_ctx.close()
        if want("CORE"):
            desk1440_max_ov = max(
                desk1440_lobby_ov,
                desk1440_meta_ov,
                desk1440_escort_ov,
                desk1440_train_ov,
                desk1440_pet_ov,
                desk1440_sub_ov,
                desk1440_hall_ov,
                desk1440_mc12_lobby_ov,
                desk1440_sled_ov,
                desk1440_gacha_ov,
                desk1440_mc13_lobby_ov,
                desk1440_lava_ov,
                desk1440_skin_battle_ov,
                desk1440_decor_ov,
                desk1440_mc14_lobby_ov,
                desk1440_ast_ov,
                desk1440_tactic_ov,
                desk1440_mc15_lobby_ov,
                desk1440_battle_tactic_ov,
                desk1440_pk_ov,
                desk1440_result_ov,
                desk1440_mc16_meta_ov,
                desk1440_mc16_lobby_ov,
                desk1440_mc16_camp_ov,
                int(desk1440_py_sand.get("ov", 0)),
                int(desk1440_py_slab.get("ov", 0)),
                int(desk1440_py_exit.get("ov", 0)),
                desk1440_mc16_result_ov,
                desk1440_mc17_max_ov,
            )
            add_check(
                "Desktop 1440x900 Zero Horizontal Overflow (Lobby + Decorated Trophy Room, Relic Banner Stand, Pet Dock, Trophy Hall, Gacha Machine, Decoration Hall, Airship Escort, Candy Train, Submarine, Glacier Sled, Lava Jump & Asteroid Dash HUD & Skinned Campaign)",
                desk1440_max_ov <= 0
                and (not ran("MC-13") or (bool(desk1440_lava_info.get("hudFit")) and bool(desk1440_lava_info.get("active")))),
                f"overflow={desk1440_max_ov}px (lobby={desk1440_lobby_ov}, meta={desk1440_meta_ov}, pet={desk1440_pet_ov}, hall={desk1440_hall_ov}, mc12Lobby={desk1440_mc12_lobby_ov}, escort={desk1440_escort_ov}, train={desk1440_train_ov}, sub={desk1440_sub_ov}, sled={desk1440_sled_ov}, gacha={desk1440_gacha_ov}, mc13Lobby={desk1440_mc13_lobby_ov}, lava={desk1440_lava_ov}, skinBattle={desk1440_skin_battle_ov}, decor={desk1440_decor_ov}, mc14Lobby={desk1440_mc14_lobby_ov}, asteroid={desk1440_ast_ov}, lavaInfo={json.dumps(desk1440_lava_info, ensure_ascii=False)})",
            )

        if RUN_390:
            # Mobile 390x844 Portrait Viewport Check (Zero Horizontal Overflow across Lobby, Workshop, Tournament & Airship Escort)
            mob_ctx = new_page_context({"width": 390, "height": 844}, 2)
            mob_page = mob_ctx.new_page()
            mob_page.on("pageerror", lambda err: aux_page_errors.append(f"[390] {err}"))
            mob_page.goto(f"http://127.0.0.1:{port}/", wait_until="domcontentloaded", timeout=10000)
            mob_page.wait_for_timeout(120)
            mob_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
            mob_page.wait_for_timeout(100)
        if want("CORE", "MC-7", "MC-9", "MC-10", "MC-11", "MC-12"):
            mob_lobby_ov = mob_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            mob_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    w.state.gold = 95000;
                    w.state.airshipWingMedals = 24;
                    w.state.clockworkCores = 16;
                    w.state.upgradeCannonMod('prism_splitter', 'medal');
                    w.state.upgradeCannonMod('heavy_mortar', 'gold');
                    w.state.equipCannonMod('heavy_mortar');
                    w.state.upgradeBoboTechBranch('vanguard_charge', 'gold');
                    w.state.upgradeBoboTechBranch('candy_bombard', 'core');
                }
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
            }"""
            )
            mob_page.wait_for_timeout(100)
            mob_meta_ov = mob_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc9_mobile_workshop_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate("document.querySelector('.menu-tab[data-tab=\"skins\"]')?.click()")
            mob_page.wait_for_timeout(100)
            mob_workshop_ov = mob_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "verify_mc5_mobile_workshop_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate("document.querySelector('.menu-tab[data-tab=\"launch\"]')?.click()")
            mob_page.wait_for_timeout(60)
            mob_page.evaluate("document.getElementById('btn-start-tournament')?.click()")
            mob_page.wait_for_timeout(220)
            mob_trn_hud = mob_page.evaluate(
                """() => {
                const ov = document.documentElement.scrollWidth - window.innerWidth;
                const btns = [
                    document.getElementById('btn-weapon-mode'),
                    ...Array.from(document.querySelectorAll('.special-skills .skill-btn')),
                ].filter(Boolean);
                const fit = btns.length === 5 && btns.every((b) => {
                    const r = b.getBoundingClientRect();
                    return r.width >= 40 && r.left >= 0 && r.right <= window.innerWidth && b.scrollWidth <= b.clientWidth + 2;
                });
                return { ov, fit, count: btns.length };
            }"""
            )
            mob_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-airship-escort')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let i = 0; i < 6; i++) {
                        w.fireTurret();
                    }
                    if (w.antiAirTurrets && w.antiAirTurrets[0]) {
                        w.damageAntiAirTurret(w.antiAirTurrets[0], 99999, true);
                    }
                    for (let step = 0; step < 6; step++) {
                        w.update(0.06);
                    }
                }
            }"""
            )
            mob_page.wait_for_timeout(180)
            mob_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            mob_escort_ov = mob_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc9_mobile_airship_escort_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-candy-train-raid')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 60; step++) {
                        w.update(0.05);
                    }
                }
            }"""
            )
            mob_page.wait_for_timeout(180)
            mob_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            mob_train = mob_page.evaluate(
                """() => {
                const hud = document.getElementById('candy-train-hud');
                const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
                const fit = pills.length === 3 && pills.every((p) => {
                    const r = p.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth;
                });
                return { ov: document.documentElement.scrollWidth - window.innerWidth, fit };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc10_mobile_candy_train_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-submarine-rescue')?.scrollIntoView({ block: 'center' });
            }"""
            )
            mob_page.wait_for_timeout(120)
            mob_sub_lobby_ov = mob_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc11_mobile_lobby_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                document.getElementById('pet-companion-dock')?.scrollIntoView({ block: 'start' });
            }"""
            )
            mob_page.wait_for_timeout(120)
            mob_pet_ov = mob_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc11_mobile_pet_dock_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-submarine-rescue')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 150; step++) {
                        w.update(0.05);
                    }
                }
            }"""
            )
            mob_page.wait_for_timeout(220)
            mob_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            mob_sub = mob_page.evaluate(
                """() => {
                const hud = document.getElementById('submarine-rescue-hud');
                const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
                const fit = pills.length === 3 && pills.every((p) => {
                    const r = p.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth;
                });
                return { ov: document.documentElement.scrollWidth - window.innerWidth, fit };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc11_mobile_submarine_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.bestStageCleared = Math.max(s.bestStageCleared, 16);
                    s.colossusRaidClears = Math.max(s.colossusRaidClears, 3);
                    s.lifetimeTrainGoldMedals = Math.max(s.lifetimeTrainGoldMedals, 9);
                    s.iceMedals = 9;
                    s.lifetimeIceMedals = Math.max(s.lifetimeIceMedals, 9);
                    s.trophyHallSlots = 1;
                    s.trophyDisplay = [null, null, null, null, null, null];
                    s.unlockTrophySlot('medal');
                    s.unlockTrophySlot('medal');
                    s.autoArrangeTrophies();
                    s.save();
                }
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                window.scrollTo(0, 0);
                document.getElementById('home-hero-stage')?.scrollIntoView({ block: 'start' });
            }"""
            )
            mob_page.wait_for_timeout(300)
            mob_mc12_lobby_ov = mob_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            mob_pedestal = mob_page.evaluate(
                """() => {
                const el = document.getElementById('lobby-trophy-pedestal');
                if (!el) return { fit: false };
                const r = el.getBoundingClientRect();
                const w = window.__mc3dWorld;
                return { fit: r.left >= 0 && r.right <= window.innerWidth && r.width > 60,
                    cups: w && w.trophyPedestal ? w.trophyPedestal.cupsGroup.children.length : -1 };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc12_mobile_lobby_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate("document.getElementById('btn-start-glacier-sled')?.scrollIntoView({ block: 'center' })")
            mob_page.wait_for_timeout(120)
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc12_mobile_lobby_sled_btn_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                document.getElementById('trophy-hall')?.scrollIntoView({ block: 'start' });
            }"""
            )
            mob_page.wait_for_timeout(150)
            mob_hall_ov = mob_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc12_mobile_trophy_hall_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-glacier-sled')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 125; step++) {
                        w.turretTargetX = w.getSledAutopilotX();
                        w.update(0.05);
                    }
                }
            }"""
            )
            mob_page.wait_for_timeout(220)
            mob_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            mob_sled = mob_page.evaluate(
                """() => {
                const hud = document.getElementById('glacier-sled-hud');
                const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
                const fit = pills.length === 3 && !hud.classList.contains('hidden') && pills.every((p) => {
                    const r = p.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth;
                });
                return { ov: document.documentElement.scrollWidth - window.innerWidth, fit };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc12_mobile_sled_390.jpg"),
                type="jpeg",
                quality=90,
            )
            add_check(
                "MC-12 Mobile 390x844 (Lobby 3D Trophy Pedestal Fits, Trophy Hall & Glacier Sled HUD Fit, Zero Overflow)",
                bool(mob_pedestal.get("fit"))
                and int(mob_pedestal.get("cups", -1)) == 3
                and bool(mob_sled.get("fit"))
                and max(mob_mc12_lobby_ov, mob_hall_ov, int(mob_sled.get("ov", 0))) <= 0,
                json.dumps(
                    {"pedestal": mob_pedestal, "lobbyOv": mob_mc12_lobby_ov, "hallOv": mob_hall_ov, "sled": mob_sled},
                    ensure_ascii=False,
                ),
            )
        if want("MC-13"):
            # MC-13 (390x844): lobby lava card, gacha machine + rolled result, lava run HUD with a skinned squad
            mob_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.gold = Math.max(s.gold, 30000);
                    s.lavaCores = 12;
                    s.lifetimeLavaCores = Math.max(s.lifetimeLavaCores, 12);
                    s.save();
                }
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-lava-jump')?.scrollIntoView({ block: 'center' });
            }"""
            )
            mob_page.wait_for_timeout(200)
            mob_mc13_lobby_ov = mob_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            mob_lava_btn = mob_page.evaluate(
                """() => {
                const el = document.getElementById('btn-start-lava-jump');
                if (!el) return { fit: false };
                const r = el.getBoundingClientRect();
                return { fit: r.left >= 0 && r.right <= window.innerWidth && r.width > 200 };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc13_mobile_lobby_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                document.getElementById('btn-gacha-single-gold')?.click();
                document.getElementById('btn-gacha-ten-gold')?.click();
                const s = window.__mc3dWorld.state;
                const order = ['royal_crown', 'halo_angel', 'lava_horns', 'bunny_ears', 'pirate_hat', 'sprout_leaf', 'peach_bow', 'mint_cap'];
                const pickId = order.find((id) => s.ownedGachaSkins.includes(id));
                if (pickId) document.querySelector(`#gacha-collection-grid [data-gacha-equip="${pickId}"]`)?.click();
                document.getElementById('gacha-machine')?.scrollIntoView({ block: 'start' });
            }"""
            )
            mob_page.wait_for_timeout(900)
            mob_gacha = mob_page.evaluate(
                """() => {
                const g = document.getElementById('gacha-machine');
                const r = g ? g.getBoundingClientRect() : null;
                const chips = Array.from(document.querySelectorAll('#gacha-result-tray .gacha-result-chip'));
                const btns = Array.from(document.querySelectorAll('#gacha-machine [data-gacha-count]'));
                return {
                    ov: document.documentElement.scrollWidth - window.innerWidth,
                    fit: Boolean(r && r.left >= 0 && r.right <= window.innerWidth),
                    chips: chips.length,
                    chipsFit: chips.every((c) => { const cr = c.getBoundingClientRect(); return cr.left >= 0 && cr.right <= window.innerWidth; }),
                    btnsFit: btns.length === 4 && btns.every((b) => { const br = b.getBoundingClientRect(); return br.left >= 0 && br.right <= window.innerWidth; }),
                    equipped: window.__mc3dWorld.state.equippedGachaSkin,
                };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc13_mobile_gacha_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.getElementById('btn-start-lava-jump')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 105; step++) {
                        w.turretTargetX = w.getLavaAutopilotX();
                        w.update(0.05);
                    }
                }
            }"""
            )
            mob_page.wait_for_timeout(240)
            mob_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            mob_page.wait_for_timeout(60)
            mob_lava = mob_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const hud = document.getElementById('lava-jump-hud');
                const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
                const fit = pills.length === 3 && !hud.classList.contains('hidden') && pills.every((p) => {
                    const r = p.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth;
                });
                return { ov: document.documentElement.scrollWidth - window.innerWidth, fit,
                    active: Boolean(w.lavaRun && w.lavaRun.active), bobos: w.lavaBoboCount, acc: w.lastGachaAccessoryCount };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc13_mobile_lava_390.jpg"),
                type="jpeg",
                quality=90,
            )
            add_check(
                "MC-13 Mobile 390x844 (Lobby Lava Card, Gacha Machine Rolls / Result Tray / Roll Buttons Fit, Lava Jump HUD Fit with a Skinned Squad, Zero Overflow)",
                bool(mob_lava_btn.get("fit"))
                and bool(mob_gacha.get("fit"))
                and int(mob_gacha.get("chips", 0)) == 10
                and bool(mob_gacha.get("chipsFit"))
                and bool(mob_gacha.get("btnsFit"))
                and mob_gacha.get("equipped") is not None
                and bool(mob_lava.get("fit"))
                and bool(mob_lava.get("active"))
                and int(mob_lava.get("acc", -1)) == int(mob_lava.get("bobos", -2))
                and max(mob_mc13_lobby_ov, int(mob_gacha.get("ov", 0)), int(mob_lava.get("ov", 0))) <= 0,
                json.dumps(
                    {"lobbyOv": mob_mc13_lobby_ov, "lavaBtn": mob_lava_btn, "gacha": mob_gacha, "lava": mob_lava},
                    ensure_ascii=False,
                ),
            )
        if want("MC-14"):
            # MC-14 (390x844): decoration hall panel, lobby 3D room with decor + asteroid card, asteroid run HUD fit
            mob_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.gold = Math.max(s.gold, 30000);
                    s.stardustBadges = 12;
                    s.lifetimeStardustBadges = Math.max(s.lifetimeStardustBadges, 12);
                    s.lavaCores = Math.max(s.lavaCores, 6);
                    s.lifetimeLavaCores = Math.max(s.lifetimeLavaCores, s.lavaCores);
                    s.save();
                }
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                document.querySelector('#decor-theme-grid [data-decor-theme-buy="starlight_dome"]')?.click();
                for (const pid of ['star_lamp', 'jelly_plant', 'squad_banner', 'stardust_globe']) {
                    document.querySelector(`#decor-prop-grid [data-decor-prop-buy="${pid}"]`)?.click();
                }
                document.getElementById('decor-hall')?.scrollIntoView({ block: 'start' });
            }"""
            )
            mob_page.wait_for_timeout(600)
            mob_decor = mob_page.evaluate(
                """() => {
                const d = document.getElementById('decor-hall');
                const r = d ? d.getBoundingClientRect() : null;
                const fitAll = (sel) => Array.from(document.querySelectorAll(sel)).every((el) => {
                    const er = el.getBoundingClientRect();
                    return er.left >= 0 && er.right <= window.innerWidth;
                });
                return {
                    ov: document.documentElement.scrollWidth - window.innerWidth,
                    fit: Boolean(r && r.left >= 0 && r.right <= window.innerWidth),
                    themeCards: document.querySelectorAll('#decor-theme-grid .decor-theme-card').length,
                    cardsFit: fitAll('#decor-theme-grid .decor-theme-card') && fitAll('#decor-prop-grid .decor-prop-card') && fitAll('#decor-slot-row .decor-slot'),
                    btnsFit: fitAll('#decor-hall .finish-action-btn'),
                    theme: window.__mc3dWorld.state.activeDecorTheme,
                    placed: window.__mc3dWorld.state.decorSlots.filter(Boolean).length,
                };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc14_mobile_decor_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                window.scrollTo(0, 0);
                document.getElementById('home-hero-stage')?.scrollIntoView({ block: 'start' });
            }"""
            )
            mob_page.wait_for_timeout(500)
            mob_mc14_lobby = mob_page.evaluate(
                """() => {
                const ped = document.getElementById('lobby-trophy-pedestal');
                const pr = ped ? ped.getBoundingClientRect() : null;
                const ast = document.getElementById('btn-start-asteroid-dash');
                const ar = ast ? ast.getBoundingClientRect() : null;
                const room = window.__mc3dWorld.getLobbyDecorSnapshot();
                return { ov: document.documentElement.scrollWidth - window.innerWidth,
                    pedFit: Boolean(pr && pr.left >= 0 && pr.right <= window.innerWidth && pr.width > 100),
                    astFit: Boolean(ar && ar.left >= 0 && ar.right <= window.innerWidth && ar.width > 200),
                    roomTheme: room.themeId, roomProps: room.props.length };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc14_mobile_lobby_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.getElementById('btn-start-asteroid-dash')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 392 && w.asteroidRun && w.asteroidRun.active; step++) {
                        w.turretTargetX = w.getAsteroidAutopilotX();
                        w.update(0.05);
                    }
                }
            }"""
            )
            mob_page.wait_for_timeout(240)
            mob_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            mob_page.wait_for_timeout(60)
            mob_ast = mob_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const hud = document.getElementById('asteroid-dash-hud');
                const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
                const fit = pills.length === 3 && !hud.classList.contains('hidden') && pills.every((p) => {
                    const r = p.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth;
                });
                return { ov: document.documentElement.scrollWidth - window.innerWidth, fit,
                    active: Boolean(w.asteroidRun && w.asteroidRun.active), bobos: w.asteroidBoboCount };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc14_mobile_asteroid_390.jpg"),
                type="jpeg",
                quality=90,
            )
            add_check(
                "MC-14 Mobile 390x844 (Decoration Hall Cards / Slots / Buttons Fit, Lobby 3D Room + Asteroid Card Fit, Asteroid Dash HUD Fit, Zero Overflow)",
                bool(mob_decor.get("fit"))
                and int(mob_decor.get("themeCards", 0)) == 6
                and bool(mob_decor.get("cardsFit"))
                and bool(mob_decor.get("btnsFit"))
                and mob_decor.get("theme") == "starlight_dome"
                and int(mob_decor.get("placed", 0)) == 4
                and bool(mob_mc14_lobby.get("pedFit"))
                and bool(mob_mc14_lobby.get("astFit"))
                and mob_mc14_lobby.get("roomTheme") == "starlight_dome"
                and int(mob_mc14_lobby.get("roomProps", 0)) == 4
                and bool(mob_ast.get("fit"))
                and bool(mob_ast.get("active"))
                and max(int(mob_decor.get("ov", 0)), int(mob_mc14_lobby.get("ov", 0)), int(mob_ast.get("ov", 0))) <= 0,
                json.dumps({"decor": mob_decor, "lobby": mob_mc14_lobby, "ast": mob_ast}, ensure_ascii=False),
            )
        if want("MC-15"):
            # MC-15 (390x844): tactic deck panel, lobby pumpkin card + tactic strip, pumpkin night HUD + tactic chips fit
            mob_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.gold = Math.max(s.gold, 30000);
                    s.stardustBadges = Math.max(s.stardustBadges, 6);
                    s.lifetimeStardustBadges = Math.max(s.lifetimeStardustBadges, s.stardustBadges);
                    s.pumpkinBadges = Math.max(s.pumpkinBadges, 4);
                    s.lifetimePumpkinBadges = Math.max(s.lifetimePumpkinBadges, s.pumpkinBadges);
                    s.save();
                }
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                for (const cid of ['shield_open', 'rush_half', 'crowd_final', 'crowd_open']) {
                    document.querySelector(`#tactic-card-grid [data-tactic-buy="${cid}"]`)?.click();
                }
                document.getElementById('tactic-deck')?.scrollIntoView({ block: 'start' });
            }"""
            )
            mob_page.wait_for_timeout(600)
            mob_tactic = mob_page.evaluate(
                """() => {
                const d = document.getElementById('tactic-deck');
                const r = d ? d.getBoundingClientRect() : null;
                const fitAll = (sel) => Array.from(document.querySelectorAll(sel)).every((el) => {
                    const er = el.getBoundingClientRect();
                    return er.left >= 0 && er.right <= window.innerWidth;
                });
                return {
                    ov: document.documentElement.scrollWidth - window.innerWidth,
                    fit: Boolean(r && r.left >= 0 && r.right <= window.innerWidth),
                    cards: document.querySelectorAll('#tactic-card-grid .tactic-card').length,
                    cardsFit: fitAll('#tactic-card-grid .tactic-card') && fitAll('#tactic-deck-slots .tactic-slot') && fitAll('.tactic-res-chip'),
                    btnsFit: fitAll('#tactic-deck .finish-action-btn'),
                    deck: [...window.__mc3dWorld.state.tacticDeck],
                };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc15_mobile_tactic_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                window.scrollTo(0, 0);
                document.getElementById('lobby-tactic-deck')?.scrollIntoView({ block: 'start' });
            }"""
            )
            mob_page.wait_for_timeout(500)
            mob_mc15_lobby = mob_page.evaluate(
                """() => {
                const fit = (el, minW) => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth && r.width > minW;
                };
                return { ov: document.documentElement.scrollWidth - window.innerWidth,
                    stripFit: fit(document.getElementById('lobby-tactic-deck'), 200),
                    editFit: fit(document.getElementById('btn-lobby-tactic-edit'), 30),
                    pkFit: fit(document.getElementById('btn-start-pumpkin-night'), 200),
                    slots: document.querySelectorAll('#lobby-tactic-slots .lobby-tactic-slot.is-filled').length };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc15_mobile_lobby_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.getElementById('btn-start-pumpkin-night')?.click();
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 400 && w.pumpkinRun && w.pumpkinRun.active && w.pumpkinRun.distance < 78; step++) {
                        w.turretTargetX = w.getPumpkinAutopilotX();
                        w.update(0.05);
                    }
                }
            }"""
            )
            mob_page.wait_for_timeout(240)
            mob_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            mob_page.wait_for_timeout(60)
            mob_pk = mob_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                const hud = document.getElementById('pumpkin-night-hud');
                const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
                const thud = document.getElementById('tactic-deck-hud');
                const chips = thud ? Array.from(thud.querySelectorAll('.tactic-hud-chip')) : [];
                const inside = (el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; };
                return { ov: document.documentElement.scrollWidth - window.innerWidth,
                    fit: pills.length === 3 && !hud.classList.contains('hidden') && pills.every(inside),
                    tacticFit: chips.length === 3 && chips.every(inside),
                    active: Boolean(w.pumpkinRun && w.pumpkinRun.active), bobos: w.pumpkinBoboCount };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc15_mobile_pumpkin_390.jpg"),
                type="jpeg",
                quality=90,
            )
            add_check(
                "MC-15 Mobile 390x844 (Tactic Deck Cards / Slots / Buttons / Currency Chips Fit, Lobby Tactic Strip + Pumpkin Card Fit, Pumpkin Night HUD + Tactic Chips Fit, Zero Overflow)",
                bool(mob_tactic.get("fit"))
                and int(mob_tactic.get("cards", 0)) == 9
                and bool(mob_tactic.get("cardsFit"))
                and bool(mob_tactic.get("btnsFit"))
                and mob_tactic.get("deck") == ["shield_open", "rush_half", "crowd_final"]
                and bool(mob_mc15_lobby.get("stripFit"))
                and bool(mob_mc15_lobby.get("editFit"))
                and bool(mob_mc15_lobby.get("pkFit"))
                and int(mob_mc15_lobby.get("slots", 0)) == 3
                and bool(mob_pk.get("fit"))
                and bool(mob_pk.get("tacticFit"))
                and bool(mob_pk.get("active"))
                and max(int(mob_tactic.get("ov", 0)), int(mob_mc15_lobby.get("ov", 0)), int(mob_pk.get("ov", 0))) <= 0,
                json.dumps({"tactic": mob_tactic, "lobby": mob_mc15_lobby, "pk": mob_pk}, ensure_ascii=False),
            )
        if want("MC-16"):
            # MC-16 (390x844): tactic balance row, lobby pyramid card, campaign ×0.6 HUD, pyramid run HUD / chips, tomb gate,
            # victory modal
            mob_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.gold = Math.max(s.gold, 30000);
                    s.scarabBadges = Math.max(s.scarabBadges, 4);
                    s.lifetimeScarabBadges = Math.max(s.lifetimeScarabBadges, s.scarabBadges);
                    s.tacticCampaignEnabled = true;
                    s.save();
                }
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                for (const cid of ['shield_open', 'rush_open', 'crowd_open']) {
                    document.querySelector(`#tactic-card-grid [data-tactic-buy="${cid}"]`)?.click();
                }
                const s = window.__mc3dWorld.state;
                s.tacticDeck = ['shield_open', 'rush_open', 'crowd_open'].filter((c) => s.ownedTacticCards.includes(c));
                while (s.tacticDeck.length < 3) s.tacticDeck.push(null);
                s.save();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                document.getElementById('tactic-deck')?.scrollIntoView({ block: 'start' });
            }"""
            )
            mob_page.wait_for_timeout(600)
            mob_mc16_meta = mob_page.evaluate(
                """() => {
                const fit = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && r.width > 20; };
                const tags = Array.from(document.querySelectorAll('#tactic-card-grid .tactic-card-tag'));
                return { ov: document.documentElement.scrollWidth - window.innerWidth,
                    rowFit: fit(document.getElementById('tactic-balance-row')), toggleFit: fit(document.getElementById('btn-tactic-campaign-toggle')),
                    tagsFit: tags.length === 9 && tags.every((t) => fit(t)), title: document.getElementById('tactic-balance-title')?.textContent || '' };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_mobile_tactic_balance_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                window.scrollTo(0, 0);
                document.getElementById('btn-start-pyramid-run')?.scrollIntoView({ block: 'center' });
            }"""
            )
            mob_page.wait_for_timeout(500)
            mob_mc16_lobby = mob_page.evaluate(
                """() => {
                const fit = (el, minW) => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth && r.width > minW;
                };
                return { ov: document.documentElement.scrollWidth - window.innerWidth,
                    pyFit: fit(document.getElementById('btn-start-pyramid-run'), 200),
                    badgeFit: fit(document.getElementById('pyramid-run-badge'), 100),
                    stripFit: fit(document.getElementById('lobby-tactic-deck'), 200) };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_mobile_lobby_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.getElementById('btn-start-battle')?.click();
                const w = window.__mc3dWorld;
                if (w) for (let i = 0; i < 40; i++) w.update(0.05);
            }"""
            )
            mob_page.wait_for_timeout(1700)
            mob_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            mob_page.wait_for_timeout(60)
            mob_mc16_camp = mob_page.evaluate(
                """() => {
                const hud = document.getElementById('tactic-deck-hud');
                const els = hud ? Array.from(hud.children) : [];
                return { ov: document.documentElement.scrollWidth - window.innerWidth, tag: Boolean(hud && hud.querySelector('.tactic-hud-scale')),
                    fit: els.length === 4 && els.every((c) => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && r.width > 28; }) };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_mobile_campaign_tactic_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_pyramid_walk_js = """(target) => {
                const w = window.__mc3dWorld;
                if (w) {
                    for (let step = 0; step < 900 && w.pyramidRun && w.pyramidRun.active && w.pyramidRun.distance < target; step++) {
                        w.turretTargetX = w.getPyramidAutopilotX();
                        w.update(0.05);
                    }
                }
            }"""
            mob_pyramid_info_js = """() => {
                const w = window.__mc3dWorld;
                const hud = document.getElementById('pyramid-run-hud');
                const pills = hud ? Array.from(hud.querySelectorAll('.colossus-hud-pill')) : [];
                const thud = document.getElementById('tactic-deck-hud');
                const chips = thud ? Array.from(thud.querySelectorAll('.tactic-hud-chip')) : [];
                const inside = (el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; };
                return { ov: document.documentElement.scrollWidth - window.innerWidth,
                    fit: pills.length === 3 && !hud.classList.contains('hidden') && pills.every(inside),
                    tacticFit: chips.length === 3 && chips.every(inside),
                    active: Boolean(w.pyramidRun && w.pyramidRun.active), bobos: w.pyramidBoboCount,
                    sandVisible: w.pyramidSands.some((b) => b.group.visible),
                    exitVisible: Boolean(w.pyramidExitGroup && w.pyramidExitGroup.visible) };
            }"""
            mob_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.getElementById('btn-start-pyramid-run')?.click();
            }"""
            )
            mob_page.evaluate(mob_pyramid_walk_js, 24)
            mob_page.wait_for_timeout(1600)
            mob_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            mob_page.wait_for_timeout(60)
            mob_py = mob_page.evaluate(mob_pyramid_info_js)
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_mobile_pyramid_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(mob_pyramid_walk_js, 207)
            mob_page.wait_for_timeout(200)
            mob_py_exit = mob_page.evaluate(mob_pyramid_info_js)
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_mobile_pyramid_exit_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(mob_pyramid_walk_js, 99999)
            mob_page.wait_for_timeout(2600)
            mob_mc16_result = mob_page.evaluate(
                """() => {
                const m = document.getElementById('result-modal');
                const box = m ? m.querySelector('.modal-content, .modal-card, .result-card') || m : null;
                const r = box ? box.getBoundingClientRect() : null;
                return { ov: document.documentElement.scrollWidth - window.innerWidth, shown: Boolean(m && !m.classList.contains('hidden')),
                    title: document.getElementById('modal-title')?.textContent || '', fit: Boolean(r && r.left >= 0 && r.right <= window.innerWidth) };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc16_mobile_result_390.jpg"),
                type="jpeg",
                quality=90,
            )
            add_check(
                "MC-16 Mobile 390x844 (Tactic Balance Row / Toggle / Card Tags Fit, Lobby Pyramid Card + Badge Fit, Campaign ×0.6 HUD Tag + Chips Fit, Pyramid Run HUD + Tactic Chips Fit, Tomb Gate, Victory Modal Fit, Zero Overflow)",
                bool(mob_mc16_meta.get("rowFit"))
                and bool(mob_mc16_meta.get("toggleFit"))
                and bool(mob_mc16_meta.get("tagsFit"))
                and bool(mob_mc16_lobby.get("pyFit"))
                and bool(mob_mc16_lobby.get("badgeFit"))
                and bool(mob_mc16_lobby.get("stripFit"))
                and bool(mob_mc16_camp.get("tag"))
                and bool(mob_mc16_camp.get("fit"))
                and bool(mob_py.get("fit"))
                and bool(mob_py.get("tacticFit"))
                and bool(mob_py.get("active"))
                and bool(mob_py.get("sandVisible"))
                and bool(mob_py_exit.get("exitVisible"))
                and bool(mob_mc16_result.get("shown"))
                and bool(mob_mc16_result.get("fit"))
                and ("墓道" in str(mob_mc16_result.get("title", "")))
                and max(
                    int(mob_mc16_meta.get("ov", 0)),
                    int(mob_mc16_lobby.get("ov", 0)),
                    int(mob_mc16_camp.get("ov", 0)),
                    int(mob_py.get("ov", 0)),
                    int(mob_py_exit.get("ov", 0)),
                    int(mob_mc16_result.get("ov", 0)),
                )
                <= 0,
                json.dumps(
                    {"meta": mob_mc16_meta, "lobby": mob_mc16_lobby, "campaign": mob_mc16_camp, "pyramid": mob_py, "exit": mob_py_exit, "result": mob_mc16_result},
                    ensure_ascii=False,
                ),
            )
        if want("MC-17"):
            # MC-17 (390x844): trophy hall card, lobby jungle card, the jungle run HUD / chips over a chasm, a rolling
            # boulder and the temple gate, victory modal
            mob_page.evaluate(
                """() => {
                const w = window.__mc3dWorld;
                if (w) {
                    const s = w.state;
                    s.gold = Math.max(s.gold, 30000);
                    s.emeraldIdolBadges = Math.max(s.emeraldIdolBadges, 4);
                    s.lifetimeEmeraldIdolBadges = Math.max(s.lifetimeEmeraldIdolBadges, s.emeraldIdolBadges);
                    for (const cid of ['shield_open', 'rush_open', 'crowd_open']) if (!s.ownedTacticCards.includes(cid)) s.ownedTacticCards.push(cid);
                    s.tacticDeck = ['shield_open', 'rush_open', 'crowd_open'];
                    s.save();
                }
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                document.querySelector('.menu-tab[data-tab="meta"]')?.click();
                document.querySelector('#trophy-hall-grid [data-hall-trophy="emerald_idol_badge"]')?.scrollIntoView({ block: 'center' });
            }"""
            )
            mob_page.wait_for_timeout(500)
            mob_mc17_hall = mob_page.evaluate(
                """() => {
                const fit = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && r.width > 20; };
                const card = document.querySelector('#trophy-hall-grid [data-hall-trophy="emerald_idol_badge"]');
                return { ov: document.documentElement.scrollWidth - window.innerWidth, cardFit: fit(card),
                    btnFit: fit(card ? card.querySelector('.finish-action-btn') : null), art: (""" + ART_PAIR_JS + """)() };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_mobile_trophy_hall_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.querySelector('.menu-tab[data-tab="launch"]')?.click();
                window.scrollTo(0, 0);
                document.getElementById('btn-start-jungle-swing')?.scrollIntoView({ block: 'center' });
            }"""
            )
            mob_page.wait_for_timeout(500)
            mob_mc17_lobby = mob_page.evaluate(
                """() => {
                const fit = (el, minW) => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.left >= 0 && r.right <= window.innerWidth && r.width > minW;
                };
                const btn = document.getElementById('btn-start-jungle-swing');
                const title = btn ? btn.querySelector('.jungle-swing-btn-title') : null;
                const desc = document.getElementById('jungle-swing-sub');
                return { ov: document.documentElement.scrollWidth - window.innerWidth,
                    jgFit: fit(btn, 200), badgeFit: fit(document.getElementById('jungle-swing-badge'), 100),
                    titleFit: fit(title, 40), descOk: Boolean(desc) && (getComputedStyle(desc).display === 'none' || fit(desc, 40)), art: (""" + ART_PAIR_JS + """)() };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_mobile_lobby_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(
                """() => {
                document.getElementById('btn-top-menu')?.click();
                document.getElementById('btn-home')?.click();
                document.getElementById('btn-start-jungle-swing')?.click();
            }"""
            )
            mob_page.evaluate(JUNGLE_WALK_JS, {"kind": "chasm", "index": 0, "into": 1.4})
            mob_page.wait_for_timeout(260)
            mob_page.evaluate("document.getElementById('center-banner')?.classList.add('hidden')")
            mob_page.wait_for_timeout(60)
            mob_jg = mob_page.evaluate(JUNGLE_INFO_JS)
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_mobile_jungle_vine_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(JUNGLE_WALK_JS, {"kind": "boulder", "wz": -2})
            mob_page.wait_for_timeout(200)
            mob_jg_boulder = mob_page.evaluate(JUNGLE_INFO_JS)
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_mobile_jungle_boulder_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(JUNGLE_WALK_JS, {"kind": "exit", "before": 18})
            mob_page.wait_for_timeout(200)
            mob_jg_exit = mob_page.evaluate(JUNGLE_INFO_JS)
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_mobile_jungle_exit_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_page.evaluate(JUNGLE_WALK_JS, {"kind": "end"})
            mob_page.wait_for_timeout(2600)
            mob_mc17_result = mob_page.evaluate(
                """() => {
                const m = document.getElementById('result-modal');
                const box = m ? m.querySelector('.modal-content, .modal-card, .result-card') || m : null;
                const r = box ? box.getBoundingClientRect() : null;
                return { ov: document.documentElement.scrollWidth - window.innerWidth, shown: Boolean(m && !m.classList.contains('hidden')),
                    title: document.getElementById('modal-title')?.textContent || '', fit: Boolean(r && r.left >= 0 && r.right <= window.innerWidth),
                    art: (""" + ART_PAIR_JS + """)() };
            }"""
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "mc17_mobile_result_390.jpg"),
                type="jpeg",
                quality=90,
            )
            mob_mc17_clashes = (
                list((mob_mc17_hall.get("art") or {}).get("clashes", ["?"]))
                + list((mob_mc17_lobby.get("art") or {}).get("clashes", ["?"]))
                + list((mob_mc17_result.get("art") or {}).get("clashes", ["?"]))
            )
            add_check(
                "MC-17 Mobile 390x844 (翡翠神像徽章奖杯 Card Fits, Lobby Jungle Card Title / Badge Fit, Jungle Run HUD + Tactic Chips + Squad Label Fit over a Chasm / at a Rolling Boulder / at the Temple Gate, Victory Modal Fit, No Reused-Art Clash, Zero Overflow)",
                bool(mob_mc17_hall.get("cardFit"))
                and bool(mob_mc17_hall.get("btnFit"))
                and bool(mob_mc17_lobby.get("jgFit"))
                and bool(mob_mc17_lobby.get("badgeFit"))
                and bool(mob_mc17_lobby.get("titleFit"))
                and bool(mob_mc17_lobby.get("descOk"))
                and bool(mob_jg.get("active"))
                and bool(mob_jg.get("hudFit"))
                and bool(mob_jg.get("tacticFit"))
                and bool(mob_jg.get("chasmVisible"))
                and bool(mob_jg_boulder.get("boulderRolling"))
                and bool(mob_jg_boulder.get("hudFit"))
                and bool(mob_jg_exit.get("exitVisible"))
                and bool(mob_mc17_result.get("shown"))
                and bool(mob_mc17_result.get("fit"))
                and ("神庙" in str(mob_mc17_result.get("title", "")))
                and len(mob_mc17_clashes) == 0
                and max(
                    int(mob_mc17_hall.get("ov", 0)),
                    int(mob_mc17_lobby.get("ov", 0)),
                    int(mob_jg.get("ov", 0)),
                    int(mob_jg_boulder.get("ov", 0)),
                    int(mob_jg_exit.get("ov", 0)),
                    int(mob_mc17_result.get("ov", 0)),
                )
                <= 0,
                json.dumps(
                    {"hall": mob_mc17_hall, "lobby": mob_mc17_lobby, "vine": mob_jg, "boulder": mob_jg_boulder, "exit": mob_jg_exit, "result": mob_mc17_result},
                    ensure_ascii=False,
                ),
            )
        if want("CORE"):
            mob_overflow = max(
                mob_lobby_ov,
                mob_meta_ov,
                mob_workshop_ov,
                int(mob_trn_hud.get("ov", 0)),
                mob_escort_ov,
                int(mob_train.get("ov", 0)),
                mob_sub_lobby_ov,
                mob_pet_ov,
                int(mob_sub.get("ov", 0)),
            )
            add_check(
                "Mobile 390x844 Zero Horizontal Overflow & 5-Button Tactical Skill Bar Fit",
                mob_overflow <= 0 and bool(mob_trn_hud.get("fit")) and bool(mob_train.get("fit")) and bool(mob_sub.get("fit")),
                f"overflow={mob_overflow}px (lobby={mob_lobby_ov}, meta={mob_meta_ov}, workshop={mob_workshop_ov}, escort={mob_escort_ov}, train={mob_train.get('ov')}, subLobby={mob_sub_lobby_ov}, pet={mob_pet_ov}, sub={mob_sub.get('ov')}, hudFit={mob_trn_hud.get('fit')}, trainHudFit={mob_train.get('fit')}, subHudFit={mob_sub.get('fit')})",
            )
            mob_page.screenshot(
                path=os.path.join(SHOT_DIR, "verify_auto_playtest_mobile_390.jpg"),
                type="jpeg",
                quality=90,
            )
        if RUN_390:
            mob_ctx.close()

        add_check("Zero Page Exceptions", len(report["page_errors"]) == 0, str(report["page_errors"]))
        add_check("Zero Page Exceptions on the 1440x900 & 390x844 Pages", len(aux_page_errors) == 0, str(aux_page_errors[:8]))
        add_check("Zero Console Errors", len(report["console_errors"]) == 0, str(report["console_errors"]))
        add_check("Zero Failed Asset Requests", len(report["failed_assets"]) == 0, str(report["failed_assets"]))

        context.close()
        browser.close()
        _pw_browser = None

    report["filter"] = sorted(PLAYTEST_ONLY) if FILTERED else "FULL"
    report["random"] = PLAYTEST_RANDOM or "native"
    report["elapsed_sec"] = round((datetime.datetime.now() - _T0).total_seconds(), 1)
    os.makedirs(os.path.dirname(REPORT_JSON), exist_ok=True)
    with open(REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    filter_tag = f"（筛选 {', '.join(sorted(PLAYTEST_ONLY, key=lambda t: (t != 'CORE', int(t[3:]) if t.startswith('MC-') else 0)))}）" if FILTERED else ""
    md_entry = f"### [{report['timestamp']}] 自主试玩巡检报告{filter_tag} — **{report['status']}** ({sum(1 for c in report['checks'] if c['ok'])}/{len(report['checks'])} 项通过)\n"
    for c in report["checks"]:
        icon = "✅" if c["ok"] else "❌"
        md_entry += f"- {icon} **{c['name']}**: `{c['detail']}`\n"
    md_entry += "\n"

    import gzip, re
    if WRITE_PATROL_LOG:
        existing = ""
        if os.path.exists(LOG_MD_REPO):
            with open(LOG_MD_REPO, "r", encoding="utf-8") as f:
                existing = f.read()
        blocks = [b.strip() for b in re.split(r"(?m)(?=^### \[)", existing) if b.strip().startswith("### [")]
        blocks = [b for b in blocks if "**FAIL**" not in b]
        blocks.append(md_entry.strip())
        if len(blocks) > 10:
            overflow = blocks[:-10]
            blocks = blocks[-10:]
            gz_path = os.path.abspath(LOG_ARCHIVE_GZ)
            os.makedirs(os.path.dirname(gz_path), exist_ok=True)
            old_gz = ""
            if os.path.exists(gz_path):
                with gzip.open(gz_path, "rt", encoding="utf-8", errors="replace") as gf:
                    old_gz = gf.read()
            chunk = f"# [games/mob-control-3d/PLAYTEST_LOG.md] Archived {len(overflow)} entries at {report['timestamp']}\n\n" + "\n\n".join(overflow) + "\n"
            with gzip.open(gz_path, "wt", encoding="utf-8", compresslevel=9) as gf:
                gf.write((old_gz.rstrip() + "\n\n" if old_gz.strip() else "") + chunk)
        header = "# 波波应援团 (Mob Control 3D) 自主试玩巡检日志\n\n> 滚动保留最近 10 条记录；历史巡检日志已周期性压缩归档至 `docs/archives/playtest_logs_archive.md.gz`。\n\n"
        with open(LOG_MD_REPO, "w", encoding="utf-8") as f:
            f.write(header + "\n\n".join(blocks) + "\n")

    print(
        f"PLAYTEST_STATUS={report['status']} checks={len(report['checks'])} issues={len(report['issues_found'])} "
        f"filter={','.join(sorted(PLAYTEST_ONLY)) if FILTERED else 'FULL'} random={PLAYTEST_RANDOM or 'native'} elapsed={report['elapsed_sec']}s",
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
finally:
    if _pw_browser is not None:
        try:
            _pw_browser.close()
        except Exception:
            pass
    try:
        httpd.shutdown()
        httpd.server_close()
    except Exception:
        pass
    if os.environ.get("KEEP_SCREENSHOTS") != "1" and not SHOT_DIR_ENV:
        scratch_dir = SHOT_DIR
        if os.path.isdir(scratch_dir):
            for fname in os.listdir(scratch_dir):
                if fname.endswith(".jpg") or fname.endswith(".png"):
                    try:
                        os.remove(os.path.join(scratch_dir, fname))
                    except Exception:
                        pass

sys.exit(exit_code)
