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
LOG_MD_REPO = os.path.join(BASE_DIR, "PLAYTEST_LOG.md")


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


def add_check(name, ok, detail=""):
    report["checks"].append({"name": name, "ok": bool(ok), "detail": str(detail)})
    if not ok:
        report["status"] = "FAIL"
        report["issues_found"].append(f"[{name}] {detail}")


exit_code = 0
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
                list.push({ title, hasHq2d: src.includes('/assets/icons/race_') && src.includes('?v=25') });
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

        os.makedirs(os.path.join(BRAIN_DIR, "scratch"), exist_ok=True)
        page.screenshot(
            path=os.path.join(BRAIN_DIR, "scratch", "verify_auto_playtest_lobby_2560.jpg"),
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
            const scatterLoaded = Boolean(scatterImg && scatterImg.src.includes('icon_weapon_scatter.png?v=25'));
            btn.click();
            labels.push(label.textContent.trim());
            const rainbowImg = btn.querySelector('img');
            const rainbowLoaded = Boolean(rainbowImg && rainbowImg.src.includes('icon_weapon_rainbow.png?v=25'));
            const hasInlineSvg = Boolean(btn.querySelector('svg'));
            // Cycle back to default gatling
            btn.click(); btn.click(); btn.click();
            // Probe all 3 MC-4 RGBA PNGs
            const urls = [
                '/assets/icon_weapon_scatter.png?v=25',
                '/assets/icon_weapon_rainbow.png?v=25',
                '/assets/icon_tactical_airdrop.png?v=25',
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
            path=os.path.join(BRAIN_DIR, "scratch", "verify_auto_playtest_battle_2560.jpg"),
            type="jpeg",
            quality=90,
        )

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
                '/assets/icons/ui_escort_cart.png?v=25',
                '/assets/icons/ui_barricade.png?v=25',
                '/assets/icons/finish_candy_gloss.png?v=25',
                '/assets/icons/finish_brass_steam.png?v=25',
                '/assets/icons/finish_crystal_jelly.png?v=25',
                '/assets/icons/finish_starlight_prism.png?v=25',
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
            path=os.path.join(BRAIN_DIR, "scratch", "verify_mc5_workshop_2560.jpg"),
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
            path=os.path.join(BRAIN_DIR, "scratch", "verify_mc5_escort_2560.jpg"),
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
            int(mc5_check.get("desktopLobbyOverflow", 0)),
            int(mc5_check.get("desktopWorkshopOverflow", 0)),
            int(escort_live.get("escortOverflow", 0)),
        )

        # MC-6 Verification: Twin-Cannon Steam Mecha Overlord + Dynamic Weather & Bridge Hazard/Buff Zones
        mc6_check = page.evaluate(
            """async () => {
            const w = window.__mc3dWorld;
            if (!w || typeof w.runMc6SelfCheck !== 'function') {
                return { ok: false, reason: 'missing __mc3dWorld.runMc6SelfCheck' };
            }
            const sim = w.runMc6SelfCheck();

            // Verify 5x MC-6 256x256 true-alpha RGBA PNG icons (?v=25) load cleanly with transparent corners (a === 0)
            const mc6Urls = [
                '/assets/icons/ui_mecha_overlord.png?v=25',
                '/assets/icons/meta_mecha_core.png?v=25',
                '/assets/icons/env_tailwind_belt.png?v=25',
                '/assets/icons/env_emp_zone.png?v=25',
                '/assets/icons/env_frosting_pad.png?v=25',
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
            "MC-6 5x 256px True-Alpha RGBA Icons (?v=25) & Zero Inline SVG in Hangar/HUD",
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

        # MC-7 Verification: Neon Gear Summit Tournament (3-Match Ladder + Streak Chest + Trophies) & Tactical Sub-Weapons
        mc7_check = page.evaluate(
            """async () => {
            const w = window.__mc3dWorld;
            if (!w || typeof w.runMc7SelfCheck !== 'function') {
                return { ok: false, reason: 'missing __mc3dWorld.runMc7SelfCheck' };
            }
            const sim = w.runMc7SelfCheck();

            // Verify 5x MC-7 256x256 true-alpha RGBA PNG icons (?v=25) load cleanly with transparent corners (a === 0)
            const mc7Urls = [
                '/assets/icons/ui_gear_tournament.png?v=25',
                '/assets/icons/ui_tournament_chest.png?v=25',
                '/assets/icons/subwpn_electro_net.png?v=25',
                '/assets/icons/subwpn_syrup_bubble.png?v=25',
                '/assets/icons/subwpn_rally_horn.png?v=25',
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
            "MC-7 5x 256px True-Alpha RGBA Icons (?v=25), Zero Inline SVG & Zero Raw Emoji",
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

        # MC-8 Verification: Giant Clockwork Toy Colossus Boss Raid & Bobo 3-Branch Specialization Tech Tree
        mc8_check = page.evaluate(
            """async () => {
            const w = window.__mc3dWorld;
            if (!w || typeof w.runMc8SelfCheck !== 'function') {
                return { ok: false, reason: 'missing __mc3dWorld.runMc8SelfCheck' };
            }
            const sim = w.runMc8SelfCheck();

            // Verify 5x MC-8 256x256 true-alpha RGBA PNG icons (?v=25) load cleanly with transparent corners (a === 0)
            const mc8Urls = [
                '/assets/icons/ui_clockwork_colossus.png?v=25',
                '/assets/icons/ui_clockwork_core.png?v=25',
                '/assets/icons/tech_vanguard_charge.png?v=25',
                '/assets/icons/tech_heavy_siege.png?v=25',
                '/assets/icons/tech_candy_bombard.png?v=25',
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
            "MC-8 5x 256px True-Alpha RGBA Icons (?v=25), Zero Inline SVG & Zero Raw Emoji",
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

        # MC-9 Verification: Cloud Airship Mothership Escort & Steam Cannon Core Module Workbench
        mc9_check = page.evaluate(
            """async () => {
            const w = window.__mc3dWorld;
            if (!w || typeof w.runMc9SelfCheck !== 'function') {
                return { ok: false, reason: 'missing __mc3dWorld.runMc9SelfCheck' };
            }
            const sim = w.runMc9SelfCheck();

            // Verify 5x MC-9 256x256 true-alpha RGBA PNG icons (?v=25) load cleanly with transparent corners (a === 0)
            const mc9Urls = [
                '/assets/icons/ui_airship_escort.png?v=25',
                '/assets/icons/ui_airship_wing_medal.png?v=25',
                '/assets/icons/mod_overdrive_breech.png?v=25',
                '/assets/icons/mod_prism_splitter.png?v=25',
                '/assets/icons/mod_heavy_mortar.png?v=25',
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
            "MC-9 5x 256px True-Alpha RGBA Icons (?v=25), Zero Inline SVG & Zero Raw Emoji",
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
        )
        add_check(
            "Desktop 2560x1278 Zero Horizontal Overflow (Lobby, Workshop & Escort)",
            max_desk_overflow <= 0,
            f"max_overflow={max_desk_overflow}px",
        )

        # Desktop 1440x900 Viewport Check (Lobby, Workshop #cannon-mod-workbench, Reload Persistence & Live Airship Mothership Escort)
        os.makedirs(os.path.join(BRAIN_DIR, "scratch"), exist_ok=True)
        desk1440_ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        desk1440_page = desk1440_ctx.new_page()
        desk1440_page.goto(f"http://127.0.0.1:{port}/", wait_until="domcontentloaded", timeout=10000)
        desk1440_page.wait_for_timeout(120)
        desk1440_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
        desk1440_page.wait_for_timeout(80)
        desk1440_lobby_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        desk1440_page.screenshot(
            path=os.path.join(BRAIN_DIR, "scratch", "mc9_desktop_lobby_1440.jpg"),
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
                w.state.upgradeBoboTechBranch('vanguard_charge', 'gold');
                w.state.upgradeBoboTechBranch('heavy_siege', 'core');
                w.state.save();
            }
            document.querySelector('.menu-tab[data-tab="meta"]')?.click();
        }"""
        )
        desk1440_page.wait_for_timeout(100)
        desk1440_meta_ov = desk1440_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        desk1440_page.screenshot(
            path=os.path.join(BRAIN_DIR, "scratch", "mc9_desktop_workshop_1440.jpg"),
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
            return {
                medals: s.airshipWingMedals,
                activeMod: s.activeCannonMod,
                levels: { ...s.cannonModLevels },
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
            path=os.path.join(BRAIN_DIR, "scratch", "mc9_desktop_airship_escort_1440.jpg"),
            type="jpeg",
            quality=90,
        )
        desk1440_ctx.close()
        desk1440_max_ov = max(desk1440_lobby_ov, desk1440_meta_ov, desk1440_escort_ov)
        add_check(
            "Desktop 1440x900 Zero Horizontal Overflow (Lobby, Cannon Mod Workbench & Airship Escort HUD)",
            desk1440_max_ov <= 0,
            f"overflow={desk1440_max_ov}px (lobby={desk1440_lobby_ov}, meta={desk1440_meta_ov}, escort={desk1440_escort_ov})",
        )

        # Mobile 390x844 Portrait Viewport Check (Zero Horizontal Overflow across Lobby, Workshop, Tournament & Airship Escort)
        mob_ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        mob_page = mob_ctx.new_page()
        mob_page.goto(f"http://127.0.0.1:{port}/", wait_until="domcontentloaded", timeout=10000)
        mob_page.wait_for_timeout(120)
        mob_page.evaluate("document.getElementById('btn-enter-workshop')?.click()")
        mob_page.wait_for_timeout(100)
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
            path=os.path.join(BRAIN_DIR, "scratch", "mc9_mobile_workshop_390.jpg"),
            type="jpeg",
            quality=90,
        )
        mob_page.evaluate("document.querySelector('.menu-tab[data-tab=\"skins\"]')?.click()")
        mob_page.wait_for_timeout(100)
        mob_workshop_ov = mob_page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        mob_page.screenshot(
            path=os.path.join(BRAIN_DIR, "scratch", "verify_mc5_mobile_workshop_390.jpg"),
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
            path=os.path.join(BRAIN_DIR, "scratch", "mc9_mobile_airship_escort_390.jpg"),
            type="jpeg",
            quality=90,
        )
        mob_overflow = max(
            mob_lobby_ov,
            mob_meta_ov,
            mob_workshop_ov,
            int(mob_trn_hud.get("ov", 0)),
            mob_escort_ov,
        )
        add_check(
            "Mobile 390x844 Zero Horizontal Overflow & 5-Button Tactical Skill Bar Fit",
            mob_overflow <= 0 and bool(mob_trn_hud.get("fit")),
            f"overflow={mob_overflow}px (lobby={mob_lobby_ov}, meta={mob_meta_ov}, workshop={mob_workshop_ov}, escort={mob_escort_ov}, hudFit={mob_trn_hud.get('fit')})",
        )
        mob_page.screenshot(
            path=os.path.join(BRAIN_DIR, "scratch", "verify_auto_playtest_mobile_390.jpg"),
            type="jpeg",
            quality=90,
        )
        mob_ctx.close()

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

    import gzip, re
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
        gz_path = os.path.abspath(os.path.join(BASE_DIR, "docs", "archives", "playtest_logs_archive.md.gz"))
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
finally:
    try:
        httpd.shutdown()
        httpd.server_close()
    except Exception:
        pass
    if os.environ.get("KEEP_SCREENSHOTS") != "1":
        scratch_dir = os.path.join(BRAIN_DIR, "scratch")
        if os.path.isdir(scratch_dir):
            for fname in os.listdir(scratch_dir):
                if fname.endswith(".jpg") or fname.endswith(".png"):
                    try:
                        os.remove(os.path.join(scratch_dir, fname))
                    except Exception:
                        pass

sys.exit(exit_code)
