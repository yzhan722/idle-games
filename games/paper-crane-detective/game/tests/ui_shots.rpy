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
        $ _saved_dos_char = persistent.dossier_selected_char
        $ _saved_dos_case = persistent.dossier_case_filter
        $ _saved_dos_te = persistent.te_cleared
        $ _saved_dos_conf = persistent.truth_spoiler_confirmed
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        $ persistent.dossier_case_filter = "all"
        $ persistent.dossier_selected_char = "zhouke"
        run SetField(persistent, "extras_tab", "dossier")
        pause 0.5
        assert eval (not truth_spoiler_unlocked() and persistent.dossier_selected_char == "zhouke")
        screenshot "ui_09g_dossier_locked.png"
        $ persistent.te_cleared = True
        $ persistent.dossier_case_filter = "oldcase"
        $ persistent.dossier_selected_char = "mo"
        pause 0.5
        assert eval (truth_spoiler_unlocked() and len(dossier_visible_links("oldcase")) >= 3)
        screenshot "ui_09h_dossier_unlocked.png"
        run Show("dossier_fullboard")
        pause 0.5
        screenshot "ui_09i_dossier_fullboard.png"
        run Hide("dossier_fullboard")
        $ persistent.te_cleared = _saved_dos_te
        $ persistent.truth_spoiler_confirmed = _saved_dos_conf
        $ persistent.dossier_selected_char = _saved_dos_char
        $ persistent.dossier_case_filter = _saved_dos_case
        $ _saved_studio_state = snapshot_studio_state()
        $ persistent.studio_bg = "sunset"
        $ persistent.studio_light = "sunset"
        $ persistent.studio_slot1_char = "mo"
        $ persistent.studio_slot1_expr = "smile"
        $ persistent.studio_slot1_outfit = "warm_afterschool"
        $ persistent.studio_slot2_char = "alice"
        $ persistent.studio_slot2_expr = "happy"
        $ persistent.studio_slot2_outfit = "standard"
        $ persistent.studio_speaker = "slot1_note"
        $ persistent.studio_show_textbox = True
        $ persistent.studio_hide_hud = False
        run SetField(persistent, "extras_tab", "studio")
        pause 0.5
        assert eval (persistent.studio_bg == "sunset" and persistent.studio_light == "sunset")
        screenshot "ui_09j_studio_panel.png"
        run Show("free_theater_stage")
        pause 0.5
        screenshot "ui_09k_studio_stage.png"
        $ persistent.studio_hide_hud = True
        $ persistent.studio_show_textbox = False
        pause 0.4
        screenshot "ui_09l_studio_clean.png"
        run Hide("free_theater_stage")
        $ restore_studio_state(_saved_studio_state)
        $ _saved_gram_preset = persistent.gramophone_preset
        $ _saved_gram_rain = persistent.gramophone_rain_pct
        $ _saved_gram_study = persistent.gramophone_study_pct
        $ _saved_gram_bgm = persistent.gramophone_bgm_pct
        $ apply_gramophone_preset("rainy_bookstore")
        run SetField(persistent, "extras_tab", "music")
        pause 0.5
        assert eval (persistent.gramophone_preset == "rainy_bookstore" and persistent.gramophone_rain_pct == 65)
        screenshot "ui_09m_gramophone_mixer.png"
        $ stop_all_gramophone_ambience(reset_music_vol=True)
        $ persistent.gramophone_preset = _saved_gram_preset
        $ persistent.gramophone_rain_pct = _saved_gram_rain
        $ persistent.gramophone_study_pct = _saved_gram_study
        $ persistent.gramophone_bgm_pct = _saved_gram_bgm
        $ _saved_mb_cases = dict(persistent.mailbox_cases or {})
        $ _saved_mb_sel = persistent.mailbox_selected_case
        $ persistent.mailbox_cases = {}
        $ persistent.mailbox_selected_case = "m1"
        run SetField(persistent, "extras_tab", "mailbox")
        pause 0.5
        assert eval (mailbox_solved_count() == 0)
        screenshot "ui_09n_mailbox_fresh.png"
        $ mailbox_record_case_clear("m1", 0)
        $ mailbox_record_case_clear("m2", 1)
        $ persistent.mailbox_selected_case = "m2"
        pause 0.5
        assert eval (mailbox_solved_count() == 2 and mailbox_perfect_count() == 1)
        screenshot "ui_09o_mailbox_solved.png"
        $ persistent.mailbox_cases = _saved_mb_cases
        $ persistent.mailbox_selected_case = _saved_mb_sel
        $ _saved_tp_recs = dict(persistent.tea_party_records or {})
        $ _saved_tp_sel = persistent.tea_party_selected
        $ persistent.tea_party_records = {}
        $ persistent.tea_party_selected = "t1"
        run SetField(persistent, "extras_tab", "teaparty")
        pause 0.5
        assert eval (tea_party_cleared_count() == 0)
        screenshot "ui_09p_teaparty_fresh.png"
        $ tea_party_record_clear("t1", 0)
        $ tea_party_record_clear("t2", 1)
        $ persistent.tea_party_selected = "t1"
        pause 0.5
        assert eval (tea_party_cleared_count() == 2 and tea_party_gold_count() == 1)
        screenshot "ui_09q_teaparty_gold.png"
        $ persistent.tea_party_records = _saved_tp_recs
        $ persistent.tea_party_selected = _saved_tp_sel
        $ _saved_lex_read = list(persistent.lexicon_read or [])
        $ _saved_lex_cat = persistent.lexicon_cat_filter
        $ _saved_lex_q = persistent.lexicon_search_query
        $ _saved_lex_sel = persistent.lexicon_selected_id
        $ _saved_lex_te = persistent.te_cleared
        $ _saved_lex_conf = persistent.truth_spoiler_confirmed
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        $ persistent.lexicon_cat_filter = "foreshadow"
        $ persistent.lexicon_search_query = ""
        $ persistent.lexicon_selected_id = "lex_s04"
        run SetField(persistent, "extras_tab", "lexicon")
        pause 0.5
        assert eval (not truth_spoiler_unlocked() and not lexicon_render_entry_view("lex_s04")["unlocked"])
        screenshot "ui_09r_lexicon_locked.png"
        $ persistent.te_cleared = True
        $ lexicon_select_entry("lex_s04")
        pause 0.5
        assert eval (truth_spoiler_unlocked() and lexicon_render_entry_view("lex_s04")["unlocked"] and lexicon_is_read("lex_s04"))
        screenshot "ui_09s_lexicon_unlocked.png"
        $ persistent.lexicon_read = _saved_lex_read
        $ persistent.lexicon_cat_filter = _saved_lex_cat
        $ persistent.lexicon_search_query = _saved_lex_q
        $ persistent.lexicon_selected_id = _saved_lex_sel
        $ persistent.te_cleared = _saved_lex_te
        $ persistent.truth_spoiler_confirmed = _saved_lex_conf
        $ _saved_rest_recs = dict(persistent.book_restoration_records or {})
        $ _saved_rest_sel = persistent.restoration_selected_tome
        $ _saved_pc7_te = persistent.te_cleared
        $ _saved_pc7_conf = persistent.truth_spoiler_confirmed
        $ persistent.book_restoration_records = {}
        $ persistent.restoration_selected_tome = "r1"
        $ restoration_reset_workbench_session()
        run SetField(persistent, "extras_tab", "restoration")
        pause 0.5
        assert eval (restoration_completed_count() == 0)
        screenshot "ui_09t_restoration_workbench.png"
        $ restoration_complete_tome("r1", 0)
        $ restoration_complete_tome("r3", 0)
        $ persistent.restoration_selected_tome = "r3"
        $ persistent.te_cleared = True
        $ restoration_reset_workbench_session()
        pause 0.5
        assert eval (restoration_completed_count() == 2 and restoration_render_marginalia_view("r3")["unlocked"])
        screenshot "ui_09u_restoration_exlibris.png"
        $ _saved_sl_recs = dict(persistent.seasonal_letter_records or {})
        $ _saved_sl_sel = persistent.letterbox_selected_season
        $ persistent.seasonal_letter_records = {}
        $ persistent.letterbox_selected_season = "winter"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "letterbox")
        pause 0.5
        assert eval (not truth_spoiler_unlocked() and not letterbox_render_letter_view("winter")["unlocked"])
        screenshot "ui_09v_letterbox_locked.png"
        $ letterbox_record_clear("spring", 0)
        $ letterbox_record_clear("winter", 0)
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (letterbox_seal_count() == 2 and letterbox_render_letter_view("winter")["unlocked"])
        screenshot "ui_09w_letterbox_sealed.png"
        $ persistent.book_restoration_records = _saved_rest_recs
        $ persistent.restoration_selected_tome = _saved_rest_sel
        $ restoration_reset_workbench_session()
        $ persistent.seasonal_letter_records = _saved_sl_recs
        $ persistent.letterbox_selected_season = _saved_sl_sel
        $ persistent.te_cleared = _saved_pc7_te
        $ persistent.truth_spoiler_confirmed = _saved_pc7_conf
        $ _saved_rb_recs = dict(persistent.radio_booth_records or {})
        $ _saved_rb_sel = persistent.radio_selected_broadcast
        $ _saved_oc_recs = dict(persistent.origami_cabinet_records or {})
        $ _saved_oc_sel = persistent.origami_selected_crane
        $ _saved_oc_cat = persistent.origami_cat_filter
        $ _saved_pc8_te = persistent.te_cleared
        $ _saved_pc8_conf = persistent.truth_spoiler_confirmed
        $ persistent.radio_booth_records = {}
        $ persistent.radio_selected_broadcast = "b3"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "radio")
        pause 0.5
        assert eval (not truth_spoiler_unlocked() and not radio_render_postcard_view("b3")["unlocked"])
        screenshot "ui_09x_radio_booth_locked.png"
        $ radio_record_clear("b1", 0)
        $ radio_record_clear("b3", 0)
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (radio_solved_count() == 2 and radio_render_postcard_view("b3")["unlocked"])
        screenshot "ui_09y_radio_booth_onair.png"
        $ persistent.origami_cabinet_records = {}
        $ persistent.origami_cat_filter = "all"
        $ persistent.origami_selected_crane = "c12"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "origami")
        pause 0.5
        assert eval (not truth_spoiler_unlocked() and not origami_render_crane_view("c12")["unlocked"])
        screenshot "ui_09z_origami_cabinet_locked.png"
        $ origami_fold_and_inspect("c01", False)
        $ origami_fold_and_inspect("c12", False)
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (origami_inspected_count() == 2 and origami_render_crane_view("c12")["unlocked"])
        screenshot "ui_09za_origami_cabinet_vow.png"
        run Show("origami_vow_modal", crane_id="c12")
        pause 0.5
        screenshot "ui_09zb_origami_vow_modal.png"
        run Hide("origami_vow_modal")
        $ persistent.radio_booth_records = _saved_rb_recs
        $ persistent.radio_selected_broadcast = _saved_rb_sel
        $ persistent.origami_cabinet_records = _saved_oc_recs
        $ persistent.origami_selected_crane = _saved_oc_sel
        $ persistent.origami_cat_filter = _saved_oc_cat
        $ persistent.te_cleared = _saved_pc8_te
        $ persistent.truth_spoiler_confirmed = _saved_pc8_conf
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
