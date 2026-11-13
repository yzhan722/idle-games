## 界面回归截图：主菜单/二级菜单/对局内 HUD 与弹窗/章节卡与结局卡。
## 运行：renpy.py . test uiaudit --overwrite-screenshots   → tests/screenshots/ui_*.png
## （game/tests/** 已在 options.rpy 里排除出发行包）
init python:
    def _pc3_seed_test_bookmarks():
        return [
            {
                "id": "test_bm_1",
                "who": "墨墨（笔记）",
                "what": "发现真相不是为了证明你聪明。是为了让那个疼的人知道，有人看见了。",
                "color": "#b99ad8",
                "chapter": "第五章 · 重现的旧案",
                "label": "chapter5",
                "saved_at": "2026-11-13 21:00",
            },
            {
                "id": "test_bm_2",
                "who": "艾丽丝",
                "what": "既然收了万事屋的委托，哪怕是十年前的陈年旧账，本社长也会陪你查到底！",
                "color": "#f0c060",
                "chapter": "第一章 · 消失的包裹",
                "label": "chapter1",
                "saved_at": "2026-11-13 20:45",
            },
        ]

testsuite uiaudit:
    setup:
        $ _test.timeout = 180.0
        pause until screen "main_menu"
    teardown:
        exit

    testcase menus:
        pause 2.0
        screenshot "ui_00_main.png"
        run ShowMenu("load")
        pause until screen "load"
        pause 0.5
        screenshot "ui_01_load.png"
        run ShowMenu("preferences")
        pause until screen "preferences"
        pause 0.5
        screenshot "ui_02_prefs.png"
        run ShowMenu("help")
        pause until screen "help"
        pause 0.5
        screenshot "ui_03_help.png"
        run ShowMenu("about")
        pause until screen "about"
        pause 0.5
        screenshot "ui_04_about.png"
        run ShowMenu("chapter_select")
        pause until screen "chapter_select"
        pause 0.5
        screenshot "ui_05_chapters.png"
        run SetField(persistent, "extras_tab", "endings")
        run ShowMenu("extras")
        pause until screen "extras"
        pause 0.5
        screenshot "ui_06_endings.png"
        run SetField(persistent, "extras_tab", "cg")
        pause 0.5
        screenshot "ui_08_gallery.png"
        run Show("cg_view", None, "cg crane", "歪歪的千纸鹤", "序章 · 图书馆")
        pause 0.6
        screenshot "ui_09_cgview.png"
        run Hide("cg_view")
        run SetField(persistent, "extras_tab", "music")
        pause 0.5
        screenshot "ui_09b_music.png"
        run SetField(persistent, "extras_tab", "ach")
        pause 0.5
        screenshot "ui_09c_achievements.png"
        $ _saved_te_cleared = persistent.te_cleared
        $ _saved_truth_conf = persistent.truth_spoiler_confirmed
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "truth")
        pause 0.5
        assert eval (not truth_spoiler_unlocked())
        screenshot "ui_09d_truth_locked.png"
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (truth_spoiler_unlocked())
        screenshot "ui_09e_truth_unlocked.png"
        $ persistent.te_cleared = _saved_te_cleared
        $ persistent.truth_spoiler_confirmed = _saved_truth_conf
        $ _saved_bms = list(persistent.quote_bookmarks or [])
        $ persistent.quote_bookmarks = _pc3_seed_test_bookmarks()
        run SetField(persistent, "extras_tab", "bookmarks")
        pause 0.5
        assert eval (len(persistent.quote_bookmarks or []) == 2)
        screenshot "ui_09f_bookmarks.png"
        $ persistent.quote_bookmarks = _saved_bms
        run SetField(persistent, "extras_tab", "endings")
        run Return()
        pause until screen "main_menu"
        run Quit(confirm=True)
        pause until screen "confirm"
        pause 0.4
        screenshot "ui_07_confirm.png"
        click "取消"
        pause 0.5

    testcase ingame:
        $ persistent._autoplay_strategy = "best"
        if not screen "main_menu":
            run MainMenu(confirm=False)
        pause until screen "main_menu"
        run Start()
        pause 0.5
        advance until screen "input"
        pause 0.5
        screenshot "ui_10_input.png"
        run MainMenu(confirm=False)
        pause until screen "main_menu"
        run Start("chapter2")
        pause 0.5
        advance
        advance
        advance
        advance
        advance
        advance
        advance
        advance
        advance
        advance
        advance
        advance
        pause 0.8
        screenshot "ui_11_dialogue.png"
        $ _saved_ingame_bms = list(persistent.quote_bookmarks or [])
        $ persistent.quote_bookmarks = []
        click "书签"
        pause 0.3
        assert eval (len(persistent.quote_bookmarks or []) == 1)
        $ persistent.quote_bookmarks = _saved_ingame_bms
        run Show("bond_panel")
        pause 0.5
        screenshot "ui_12_bond.png"
        run Hide("bond_panel")
        run Show("evidence_list")
        pause 0.5
        screenshot "ui_13_evidence.png"
        run Hide("evidence_list")
        run ShowMenu("history")
        pause until screen "history"
        pause 0.5
        screenshot "ui_14_history.png"
        run ShowMenu("save")
        pause until screen "save"
        pause 0.5
        screenshot "ui_15_save.png"
        run FilePage("auto")
        pause 0.6
        screenshot "ui_15b_autosaves.png"
        run FilePage(1)
        run Return()
        pause 0.5
        run Notify("已保存到第 1 页第 1 位")
        pause 0.5
        screenshot "ui_16_notify.png"
        pause 3.0
        skip fast until screen "choice"
        pause 0.6
        screenshot "ui_17_choice.png"
        click expression autoplay.pick()
        pause 0.5

    testcase cards:
        if not screen "main_menu":
            run MainMenu(confirm=False)
        pause until screen "main_menu"
        run Start("interlude0")
        pause 2.6
        screenshot "ui_20_chapter_card.png"
        advance
        advance
        advance
        advance
        advance
        advance
        pause 0.8
        screenshot "ui_21_interlude_dialogue.png"
        run MainMenu(confirm=False)
        pause until screen "main_menu"
        run Start("ending_ne")
        pause 0.5
        advance until eval ("NORMAL END" in (_last_say_what or ""))
        pause 1.0
        screenshot "ui_22_ending_card.png"
        advance
        ## 下一句之后是 call credits（没有新台词），advance 会一直等；等逐字显示完后直接点一下
        pause 2.0
        click
        pause until screen "credits_roll"
        pause 6.0
        screenshot "ui_24_credits.png"
        run MainMenu(confirm=False)
        pause until screen "main_menu"
        run Start("prologue_meet_mo")
        pause 0.5
        advance
        advance
        advance
        advance
        advance
        advance
        advance
        advance
        pause 0.8
        screenshot "ui_23_meet_mo.png"
