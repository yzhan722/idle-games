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
        $ _saved_pl_recs = dict(persistent.planetarium_records or {})
        $ _saved_pl_sel = persistent.planetarium_selected_cipher
        $ _saved_bj_recs = dict(persistent.badge_journal_records or {})
        $ _saved_bj_sel = persistent.badge_selected_id
        $ _saved_pc9_te = persistent.te_cleared
        $ _saved_pc9_conf = persistent.truth_spoiler_confirmed
        $ persistent.planetarium_records = {}
        $ persistent.planetarium_selected_cipher = "s3"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "planetarium")
        pause 0.5
        assert eval (not truth_spoiler_unlocked() and not planetarium_render_view("s3")["unlocked"])
        screenshot "ui_09zc_planetarium_locked.png"
        $ persistent.planetarium_records = {"s1": {"solved": True, "first_try": True, "best_badge": "北辰首席解码", "replays": 1}, "s3": {"solved": True, "best_badge": "守夜观星学徒", "replays": 1}}
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (planetarium_solved_count() == 2 and planetarium_render_view("s3")["unlocked"])
        screenshot "ui_09zd_planetarium_annotated.png"
        run Show("planetarium_annotation_modal", cipher_id="s3")
        pause 0.5
        screenshot "ui_09ze_planetarium_modal.png"
        run Hide("planetarium_annotation_modal")
        $ persistent.badge_journal_records = {}
        $ persistent.badge_selected_id = "bd08"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "badges")
        pause 0.5
        assert eval (not truth_spoiler_unlocked() and not badge_render_view("bd08")["unlocked"])
        screenshot "ui_09zf_badge_journal_locked.png"
        $ persistent.planetarium_records = {"s1": {"solved": True}, "s2": {"solved": True}, "s3": {"solved": True}}
        $ persistent.badge_journal_records = {"bd08": {"stamped": True, "stamp_count": 1, "page_viewed": True}}
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (badge_get_record("bd08")["stamped"] and badge_render_view("bd08")["unlocked"])
        screenshot "ui_09zg_badge_journal_stamped.png"
        run Show("badge_journal_page_modal", badge_id="bd08")
        pause 0.5
        screenshot "ui_09zh_badge_journal_page.png"
        run Hide("badge_journal_page_modal")
        $ persistent.planetarium_records = _saved_pl_recs
        $ persistent.planetarium_selected_cipher = _saved_pl_sel
        $ persistent.badge_journal_records = _saved_bj_recs
        $ persistent.badge_selected_id = _saved_bj_sel
        $ persistent.te_cleared = _saved_pc9_te
        $ persistent.truth_spoiler_confirmed = _saved_pc9_conf
        $ _saved_lb_rec = dict(persistent.closed_library_record or {})
        $ _saved_lb_sel = persistent.library_selected_hotspot
        $ _saved_al_recs = dict(persistent.photo_album_records or {})
        $ _saved_al_sel = persistent.album_selected_photo
        $ _saved_al_pl = dict(persistent.planetarium_records or {})
        $ _saved_salon_grp = persistent.extras_salon_group
        $ _saved_pc10_te = persistent.te_cleared
        $ _saved_pc10_conf = persistent.truth_spoiler_confirmed
        $ persistent.closed_library_record = {}
        $ persistent.library_selected_hotspot = "h5"
        run SetField(persistent, "extras_tab", "library")
        pause 0.5
        assert eval (library_case_solved_count() == 0 and salon_open_group("library") == "closedlib")
        screenshot "ui_10a_library_unsolved.png"
        $ persistent.closed_library_record = {"solved": True, "replays": 3, "best_tier": "gold", "last_tier": "silver", "best_mistakes": 0, "last_mistakes": 1, "inspected": ["h1", "h2", "h3", "h4", "h5", "h6"]}
        pause 0.5
        assert eval (library_render_view()["solved"] and library_best_short() == "金书签")
        screenshot "ui_10b_library_gold.png"
        run Show("library_report_modal")
        pause 0.5
        screenshot "ui_10c_library_report.png"
        run Hide("library_report_modal")
        run Show("library_chain_banner", links_done=2, prompt_line="第三环 · 动机：漏点、红水桶、盖好的塑料布——为什么偏偏只搬走 E-7？")
        pause 0.5
        screenshot "ui_10d_library_chain_banner.png"
        run Hide("library_chain_banner")
        run Show("library_result_card", cur_tier="silver", best_tier="gold", mistakes=1, best_mistakes=0, replays=3, new_record=False, is_first=False)
        pause 0.5
        screenshot "ui_10e_library_result_card.png"
        run Hide("library_result_card")
        $ persistent.photo_album_records = {"ph01": {"developed": True, "develop_count": 1, "viewed": True}, "ph08": {"developed": True, "develop_count": 1, "viewed": True}}
        $ persistent.planetarium_records = {"s1": {"solved": True}}
        $ persistent.album_selected_photo = "ph08"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "album")
        pause 0.5
        assert eval (not truth_spoiler_unlocked() and album_render_view("ph08")["display_mo_secret"] == "" and album_render_view("ph08")["display_masked_notice"] != "")
        screenshot "ui_10f_album_masked.png"
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (album_render_view("ph08")["unlocked"] and album_render_view("ph08")["display_mo_secret"] != "")
        screenshot "ui_10g_album_unmasked.png"
        run Show("album_photo_modal", photo_id="ph08")
        pause 0.5
        screenshot "ui_10h_album_photo_modal.png"
        run Hide("album_photo_modal")
        $ persistent.closed_library_record = _saved_lb_rec
        $ persistent.library_selected_hotspot = _saved_lb_sel
        $ persistent.photo_album_records = _saved_al_recs
        $ persistent.album_selected_photo = _saved_al_sel
        $ persistent.planetarium_records = _saved_al_pl
        $ persistent.extras_salon_group = _saved_salon_grp
        $ persistent.te_cleared = _saved_pc10_te
        $ persistent.truth_spoiler_confirmed = _saved_pc10_conf
        $ _saved_th_rec = dict(persistent.theater_script_record or {})
        $ _saved_th_sel = persistent.theater_selected_hotspot
        $ _saved_tc_rec = dict(persistent.time_capsule_record or {})
        $ _saved_tc_sel = persistent.capsule_selected_item
        $ _saved_tc_pl = dict(persistent.planetarium_records or {})
        $ _saved_pc11_grp = persistent.extras_salon_group
        $ _saved_pc11_te = persistent.te_cleared
        $ _saved_pc11_conf = persistent.truth_spoiler_confirmed
        $ persistent.theater_script_record = {}
        $ persistent.theater_selected_hotspot = "h4"
        run SetField(persistent, "extras_tab", "theater")
        pause 0.5
        assert eval (theater_case_solved_count() == 0 and salon_open_group("theater") == "closedlib")
        screenshot "ui_11a_theater_unsolved.png"
        $ persistent.theater_script_record = {"solved": True, "replays": 2, "best_tier": "gold", "last_tier": "silver", "best_mistakes": 0, "last_mistakes": 2, "inspected": ["h1", "h2", "h3", "h4", "h5", "h6"]}
        pause 0.5
        assert eval (theater_render_view()["solved"] and theater_best_short() == "金票根")
        screenshot "ui_11b_theater_gold.png"
        run Show("theater_report_modal")
        pause 0.5
        screenshot "ui_11c_theater_report.png"
        run Hide("theater_report_modal")
        run Show("theater_act_banner", acts_done=2, prompt_line="第三幕 · 动机：擦过的桌子、消失的吹风机、跳闸的熨斗——为什么要拿走导演本？")
        pause 0.5
        screenshot "ui_11d_theater_act_banner.png"
        run Hide("theater_act_banner")
        run Show("theater_result_card", cur_tier="silver", best_tier="gold", mistakes=2, best_mistakes=0, replays=2, new_record=False, is_first=False)
        pause 0.5
        screenshot "ui_11e_theater_result_card.png"
        run Hide("theater_result_card")
        $ persistent.planetarium_records = {"s1": {"solved": True}}
        $ persistent.time_capsule_record = {"placed": ["c08", "c10", "c11", "c12"], "sealed": False, "seal_count": 0, "letters_read": []}
        $ persistent.capsule_selected_item = "c08"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "capsule")
        pause 0.5
        assert eval (not truth_spoiler_unlocked() and capsule_render_item("c08")["display_mo_secret"] == "" and capsule_render_item("c08")["display_masked_notice"] != "" and capsule_render_letter("lt_alice")["readable"])
        screenshot "ui_11f_capsule_masked.png"
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (capsule_render_item("c08")["unlocked"] and capsule_render_item("c08")["display_mo_secret"] != "")
        screenshot "ui_11g_capsule_unmasked.png"
        run Show("capsule_letter_modal", letter_id="lt_alice")
        pause 0.5
        screenshot "ui_11h_capsule_letter_modal.png"
        run Hide("capsule_letter_modal")
        $ persistent.theater_script_record = _saved_th_rec
        $ persistent.theater_selected_hotspot = _saved_th_sel
        $ persistent.time_capsule_record = _saved_tc_rec
        $ persistent.capsule_selected_item = _saved_tc_sel
        $ persistent.planetarium_records = _saved_tc_pl
        $ persistent.extras_salon_group = _saved_pc11_grp
        $ persistent.te_cleared = _saved_pc11_te
        $ persistent.truth_spoiler_confirmed = _saved_pc11_conf
        $ _saved_at_rec = dict(persistent.atelier_painting_record or {})
        $ _saved_at_sel = persistent.atelier_selected_hotspot
        $ _saved_mw_rec = dict(persistent.message_wall_record or {})
        $ _saved_mw_sel = persistent.wall_selected_card
        $ _saved_mw_al = dict(persistent.photo_album_records or {})
        $ _saved_mw_tc = dict(persistent.time_capsule_record or {})
        $ _saved_mw_pl = dict(persistent.planetarium_records or {})
        $ _saved_pc12_grp = persistent.extras_salon_group
        $ _saved_pc12_te = persistent.te_cleared
        $ _saved_pc12_conf = persistent.truth_spoiler_confirmed
        $ persistent.atelier_painting_record = {}
        $ persistent.atelier_selected_hotspot = "h2"
        run SetField(persistent, "extras_tab", "atelier")
        pause 0.5
        assert eval (atelier_case_solved_count() == 0 and salon_open_group("atelier") == "closedlib")
        screenshot "ui_12a_atelier_unsolved.png"
        $ persistent.atelier_painting_record = {"solved": True, "replays": 2, "best_tier": "gold", "last_tier": "silver", "best_mistakes": 0, "last_mistakes": 1, "inspected": ["h1", "h2", "h3", "h4", "h5", "h6"]}
        pause 0.5
        assert eval (atelier_render_view()["solved"] and atelier_best_short() == "金画框")
        screenshot "ui_12b_atelier_gold.png"
        run Show("atelier_report_modal")
        pause 0.5
        screenshot "ui_12c_atelier_report.png"
        run Hide("atelier_report_modal")
        run Show("atelier_stroke_banner", strokes_done=2, prompt_line="第三笔 · 动机：七支金色油漆笔、七副白手套、开展倒计时——为什么要把画翻过来？")
        pause 0.5
        screenshot "ui_12d_atelier_stroke_banner.png"
        run Hide("atelier_stroke_banner")
        run Show("atelier_result_card", cur_tier="silver", best_tier="gold", mistakes=1, best_mistakes=0, replays=2, new_record=False, is_first=False)
        pause 0.5
        screenshot "ui_12e_atelier_result_card.png"
        run Hide("atelier_result_card")
        $ persistent.photo_album_records = {"ph01": {"developed": True, "develop_count": 1, "viewed": True}, "ph08": {"developed": True, "develop_count": 1, "viewed": True}}
        $ persistent.time_capsule_record = {"placed": ["c01", "c08"], "sealed": False, "seal_count": 0, "letters_read": []}
        $ persistent.planetarium_records = {"s1": {"solved": True}}
        $ persistent.message_wall_record = {"pinned": ["w01", "w02"], "read": ["w01"]}
        $ persistent.wall_selected_card = "w01"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "wall")
        pause 0.5
        assert eval (not truth_spoiler_unlocked() and salon_open_group("wall") == "keepsake" and wall_render_card("w01")["display_secret"] == "" and wall_render_card("w01")["display_masked_notice"] != "" and wall_render_photo_label("pl4")["display_label"] != "" and wall_render_photo_label("pl4")["display_secret"] == "")
        screenshot "ui_12f_wall_masked.png"
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (wall_render_card("w01")["unlocked"] and wall_render_card("w01")["display_secret"] != "" and wall_render_photo_label("pl4")["display_secret"] != "")
        screenshot "ui_12g_wall_unmasked.png"
        run Show("wall_card_modal", card_id="w01")
        pause 0.5
        screenshot "ui_12h_wall_card_modal.png"
        run Hide("wall_card_modal")
        $ persistent.atelier_painting_record = _saved_at_rec
        $ persistent.atelier_selected_hotspot = _saved_at_sel
        $ persistent.message_wall_record = _saved_mw_rec
        $ persistent.wall_selected_card = _saved_mw_sel
        $ persistent.photo_album_records = _saved_mw_al
        $ persistent.time_capsule_record = _saved_mw_tc
        $ persistent.planetarium_records = _saved_mw_pl
        $ persistent.extras_salon_group = _saved_pc12_grp
        $ persistent.te_cleared = _saved_pc12_te
        $ persistent.truth_spoiler_confirmed = _saved_pc12_conf
        $ _saved_sd_rec = dict(persistent.sports_lostfound_record or {})
        $ _saved_sd_sel = persistent.sports_selected_item
        $ _saved_nb_rec = dict(persistent.case_notebook_record or {})
        $ _saved_nb_sel = persistent.notebook_selected_case
        $ _saved_nb_lib = dict(persistent.closed_library_record or {})
        $ _saved_nb_th = dict(persistent.theater_script_record or {})
        $ _saved_nb_at = dict(persistent.atelier_painting_record or {})
        $ _saved_pc13_grp = persistent.extras_salon_group
        $ _saved_pc13_te = persistent.te_cleared
        $ _saved_pc13_conf = persistent.truth_spoiler_confirmed
        $ persistent.sports_lostfound_record = {}
        $ persistent.sports_selected_item = "h3"
        run SetField(persistent, "extras_tab", "sportsday")
        pause 0.5
        assert eval (sports_case_solved_count() == 0 and salon_open_group("sportsday") == "closedlib")
        screenshot "ui_13a_sports_unsolved.png"
        $ persistent.sports_lostfound_record = {"solved": True, "replays": 2, "best_tier": "gold", "last_tier": "silver", "best_mistakes": 0, "last_mistakes": 1, "inspected": ["h1", "h2", "h3", "h4", "h5", "h6"]}
        pause 0.5
        assert eval (sports_render_view()["solved"] and sports_best_short() == "金秒表")
        screenshot "ui_13b_sports_gold.png"
        run Show("sports_report_modal")
        pause 0.5
        screenshot "ui_13c_sports_report.png"
        run Hide("sports_report_modal")
        run Show("sports_relay_banner", legs_done=2, prompt_line="第三棒 · 起点：系成蝴蝶结的钉鞋、挨在一起的兔子发卡、只有小孩能站进去的看台——从哪里开始？")
        pause 0.5
        screenshot "ui_13d_sports_relay_banner.png"
        run Hide("sports_relay_banner")
        run Show("sports_result_card", cur_tier="silver", best_tier="gold", mistakes=1, best_mistakes=0, replays=2, new_record=False, is_first=False)
        pause 0.5
        screenshot "ui_13e_sports_result_card.png"
        run Hide("sports_result_card")
        $ persistent.closed_library_record = {"solved": True, "replays": 1, "best_tier": "silver", "last_tier": "silver", "best_mistakes": 1, "last_mistakes": 1, "inspected": ["h1", "h2", "h3", "h4", "h5", "h6"]}
        $ persistent.theater_script_record = {"inspected": ["h1", "h3"]}
        $ persistent.atelier_painting_record = {}
        $ persistent.case_notebook_record = {"stamped": ["library"], "read": []}
        $ persistent.notebook_selected_case = "library"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "notebook")
        pause 0.5
        assert eval (not truth_spoiler_unlocked() and salon_open_group("notebook") == "keepsake" and notebook_render_page("library")["display_secret"] == "" and notebook_render_page("library")["display_masked_notice"] != "" and notebook_render_page("library")["stamped"])
        screenshot "ui_13f_notebook_masked.png"
        $ persistent.notebook_selected_case = "theater"
        pause 0.5
        assert eval (notebook_render_page("theater")["inspected_count"] == 2 and not notebook_render_page("theater")["solved"])
        screenshot "ui_13g_notebook_partial.png"
        $ persistent.notebook_selected_case = "library"
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (notebook_render_page("library")["unlocked"] and notebook_render_page("library")["display_secret"] != "")
        screenshot "ui_13h_notebook_unmasked.png"
        run Show("notebook_page_modal", case_key="library")
        pause 0.5
        screenshot "ui_13i_notebook_page_modal.png"
        run Hide("notebook_page_modal")
        $ persistent.sports_lostfound_record = _saved_sd_rec
        $ persistent.sports_selected_item = _saved_sd_sel
        $ persistent.case_notebook_record = _saved_nb_rec
        $ persistent.notebook_selected_case = _saved_nb_sel
        $ persistent.closed_library_record = _saved_nb_lib
        $ persistent.theater_script_record = _saved_nb_th
        $ persistent.atelier_painting_record = _saved_nb_at
        $ persistent.extras_salon_group = _saved_pc13_grp
        $ persistent.te_cleared = _saved_pc13_te
        $ persistent.truth_spoiler_confirmed = _saved_pc13_conf
        $ _saved_hh_rec = dict(persistent.haunted_house_record or {})
        $ _saved_hh_sel = persistent.haunted_selected_spot
        $ _saved_pc14_grp = persistent.extras_salon_group
        $ _saved_pc14_te = persistent.te_cleared
        $ _saved_pc14_conf = persistent.truth_spoiler_confirmed
        $ _saved_pc14_chap = persistent.chapter_reached
        $ persistent.haunted_house_record = {}
        $ persistent.haunted_selected_spot = "h3"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "haunted")
        pause 0.5
        assert eval (haunted_case_solved_count() == 0 and salon_open_group("haunted") == "closedlib" and haunted_render_view()["display_masked_notice"] != "")
        screenshot "ui_14a_haunted_unsolved.png"
        $ persistent.haunted_house_record = {"solved": True, "replays": 2, "best_tier": "gold", "last_tier": "silver", "best_mistakes": 0, "last_mistakes": 1, "inspected": ["h1", "h2", "h3", "h4", "h5", "h6"]}
        pause 0.5
        assert eval (haunted_render_view()["solved"] and haunted_best_short() == "金灯笼" and haunted_render_view()["display_secret"] == "")
        screenshot "ui_14b_haunted_gold_masked.png"
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (haunted_render_view()["unlocked"] and haunted_render_view()["display_secret"] != "")
        screenshot "ui_14c_haunted_unmasked.png"
        run Show("haunted_report_modal")
        pause 0.5
        screenshot "ui_14d_haunted_report.png"
        run Hide("haunted_report_modal")
        run Show("haunted_lamp_banner", lamps_done=2, prompt_line="第三盏 · 时机：四沓夹着粉色儿童票的票根、四张蜡笔画——它什么时候才会出现？")
        pause 0.5
        screenshot "ui_14e_haunted_lamp_banner.png"
        run Hide("haunted_lamp_banner")
        run Show("haunted_result_card", cur_tier="silver", best_tier="gold", mistakes=1, best_mistakes=0, replays=2, new_record=False, is_first=False)
        pause 0.5
        screenshot "ui_14f_haunted_result_card.png"
        run Hide("haunted_result_card")
        run Show("extras_folio_modal", from_extras=True)
        pause 0.5
        screenshot "ui_14g_folio_from_extras.png"
        run Hide("extras_folio_modal")
        $ persistent.haunted_house_record = _saved_hh_rec
        $ persistent.haunted_selected_spot = _saved_hh_sel
        $ persistent.extras_salon_group = _saved_pc14_grp
        $ persistent.te_cleared = _saved_pc14_te
        $ persistent.truth_spoiler_confirmed = _saved_pc14_conf
        $ _saved_mn_rec = dict(persistent.astro_telescope_record or {})
        $ _saved_mn_sel = persistent.astro_selected_spot
        $ _saved_pc15_nb = dict(persistent.case_notebook_record or {})
        $ _saved_pc15_nbsel = persistent.notebook_selected_case
        $ _saved_pc15_hh = dict(persistent.haunted_house_record or {})
        $ _saved_pc15_grp = persistent.extras_salon_group
        $ _saved_pc15_te = persistent.te_cleared
        $ _saved_pc15_conf = persistent.truth_spoiler_confirmed
        $ _saved_pc15_chap = persistent.chapter_reached
        $ persistent.astro_telescope_record = {}
        $ persistent.astro_selected_spot = "s2"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "astro")
        pause 0.5
        assert eval (astro_case_solved_count() == 0 and salon_open_group("astro") == "starlit" and astro_render_view()["display_masked_notice"] != "")
        screenshot "ui_15a_astro_unsolved.png"
        $ persistent.astro_telescope_record = {"solved": True, "replays": 3, "best_tier": "gold", "last_tier": "silver", "best_mistakes": 0, "last_mistakes": 2, "inspected": ["s1", "s2", "s3", "s4", "s5", "s6"]}
        pause 0.5
        assert eval (astro_render_view()["solved"] and astro_best_short() == "一等星" and astro_render_view()["display_secret"] == "")
        screenshot "ui_15b_astro_gold_masked.png"
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (astro_render_view()["unlocked"] and astro_render_view()["display_secret"] != "")
        screenshot "ui_15c_astro_unmasked.png"
        run Show("astro_report_modal")
        pause 0.5
        screenshot "ui_15d_astro_report.png"
        run Hide("astro_report_modal")
        run Show("astro_star_banner", stars_done=2, prompt_line="第三颗星 · 时机：20:48 还有人排队看木星，21:20 镜筒已经不见——它是什么时候下楼的？")
        pause 0.5
        screenshot "ui_15e_astro_star_banner.png"
        run Hide("astro_star_banner")
        run Show("astro_result_card", cur_tier="silver", best_tier="gold", mistakes=2, best_mistakes=0, replays=3, new_record=False, is_first=False)
        pause 0.5
        screenshot "ui_15f_astro_result_card.png"
        run Hide("astro_result_card")
        $ persistent.te_cleared = False
        $ persistent.haunted_house_record = {"solved": True, "replays": 1, "best_tier": "silver", "last_tier": "silver", "best_mistakes": 1, "last_mistakes": 1, "inspected": ["h1", "h2", "h3", "h4", "h5", "h6"]}
        $ persistent.case_notebook_record = {"stamped": ["library"], "read": []}
        $ persistent.notebook_selected_case = "astro"
        run SetField(persistent, "extras_tab", "notebook")
        pause 0.5
        assert eval (len(NOTEBOOK_CASES) == 7 and notebook_render_page("astro")["solved"] and notebook_render_page("astro")["display_secret"] == "" and notebook_render_page("haunted")["status"] == "ready")
        screenshot "ui_15g_casebook_expanded_masked.png"
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (notebook_render_page("astro")["unlocked"] and notebook_render_page("astro")["display_secret"] != "")
        screenshot "ui_15h_casebook_expanded_unmasked.png"
        run Show("notebook_page_modal", case_key="astro")
        pause 0.5
        screenshot "ui_15i_casebook_astro_page.png"
        run Hide("notebook_page_modal")
        run Show("extras_folio_modal", from_extras=True)
        pause 0.5
        assert eval (folio_total_count() == 10 and astro_case_solved_count() == 1)
        screenshot "ui_15j_folio_six_cases.png"
        run Hide("extras_folio_modal")
        $ persistent.astro_telescope_record = _saved_mn_rec
        $ persistent.astro_selected_spot = _saved_mn_sel
        $ persistent.case_notebook_record = _saved_pc15_nb
        $ persistent.notebook_selected_case = _saved_pc15_nbsel
        $ persistent.haunted_house_record = _saved_pc15_hh
        $ persistent.extras_salon_group = _saved_pc15_grp
        $ persistent.te_cleared = _saved_pc15_te
        $ persistent.truth_spoiler_confirmed = _saved_pc15_conf
        $ _saved_sw_rec = dict(persistent.pool_locker_record or {})
        $ _saved_sw_sel = persistent.pool_selected_spot
        $ _saved_pc16_nb = dict(persistent.case_notebook_record or {})
        $ _saved_pc16_nbsel = persistent.notebook_selected_case
        $ _saved_pc16_grp = persistent.extras_salon_group
        $ _saved_pc16_te = persistent.te_cleared
        $ _saved_pc16_conf = persistent.truth_spoiler_confirmed
        $ persistent.pool_locker_record = {}
        $ persistent.pool_selected_spot = "s1"
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run SetField(persistent, "extras_tab", "pool")
        pause 0.5
        assert eval (pool_case_solved_count() == 0 and salon_open_group("pool") == "closedlib" and pool_render_view()["display_masked_notice"] != "")
        screenshot "ui_16a_pool_unsolved.png"
        $ persistent.pool_locker_record = {"solved": True, "replays": 2, "best_tier": "gold", "last_tier": "silver", "best_mistakes": 0, "last_mistakes": 1, "inspected": ["s1", "s2", "s3", "s4", "s5", "s6"]}
        pause 0.5
        assert eval (pool_render_view()["solved"] and pool_best_short() == "金浪花" and pool_render_view()["display_secret"] == "")
        screenshot "ui_16b_pool_gold_masked.png"
        $ persistent.te_cleared = True
        pause 0.5
        assert eval (pool_render_view()["unlocked"] and pool_render_view()["display_secret"] != "")
        screenshot "ui_16c_pool_unmasked.png"
        run Show("pool_report_modal")
        pause 0.5
        screenshot "ui_16d_pool_report.png"
        run Hide("pool_report_modal")
        run Show("pool_lap_banner", laps_done=2, prompt_line="蛙泳段 · 去向：剪齐的旧线头、看台上的深蓝线、一顶也没借出的备用泳帽——队帽此刻在哪里？")
        pause 0.5
        screenshot "ui_16e_pool_lap_banner.png"
        run Hide("pool_lap_banner")
        run Show("pool_result_card", cur_tier="silver", best_tier="gold", mistakes=1, best_mistakes=0, replays=2, new_record=False, is_first=False)
        pause 0.5
        screenshot "ui_16f_pool_result_card.png"
        run Hide("pool_result_card")
        run SetField(persistent, "extras_tab", "astro")
        pause 0.5
        assert eval (salon_open_group("astro") == "starlit" and salon_open_group("pool") == "closedlib")
        screenshot "ui_16g_subbar_starlit_astro.png"
        $ persistent.te_cleared = False
        $ persistent.case_notebook_record = {"stamped": ["library"], "read": []}
        $ persistent.notebook_selected_case = "pool"
        run SetField(persistent, "extras_tab", "notebook")
        pause 0.5
        assert eval (len(NOTEBOOK_CASES) == 7 and casebook_index_rows() == 3 and notebook_render_page("pool")["solved"] and notebook_render_page("pool")["display_secret"] == "" and not renpy.has_screen("extras_case_notebook"))
        screenshot "ui_16h_casebook_seven_pages.png"
        run Show("notebook_page_modal", case_key="pool")
        pause 0.5
        screenshot "ui_16i_casebook_pool_page.png"
        run Hide("notebook_page_modal")
        run Show("extras_folio_modal", from_extras=True)
        pause 0.5
        assert eval (folio_total_count() == 10 and pool_case_solved_count() == 1)
        screenshot "ui_16j_folio_seven_cases.png"
        run Hide("extras_folio_modal")
        $ persistent.pool_locker_record = _saved_sw_rec
        $ persistent.pool_selected_spot = _saved_sw_sel
        $ persistent.case_notebook_record = _saved_pc16_nb
        $ persistent.notebook_selected_case = _saved_pc16_nbsel
        $ persistent.extras_salon_group = _saved_pc16_grp
        $ persistent.te_cleared = _saved_pc16_te
        $ persistent.truth_spoiler_confirmed = _saved_pc16_conf
        run SetField(persistent, "extras_tab", "endings")
        run Return()
        pause until screen "main_menu"
        $ persistent.chapter_reached = 0
        $ persistent.te_cleared = False
        $ persistent.truth_spoiler_confirmed = False
        run Show("extras_folio_modal")
        pause 0.5
        assert eval (not folio_chapter_select_open() and folio_dlc_view("dlc_mo_bookstreet")["masked"])
        screenshot "ui_14h_folio_main_locked.png"
        run Hide("extras_folio_modal")
        $ persistent.chapter_reached = 6
        $ persistent.te_cleared = True
        run Show("extras_folio_modal")
        pause 0.5
        assert eval (folio_chapter_select_open() and not folio_dlc_view("dlc_mo_bookstreet")["masked"])
        screenshot "ui_14i_folio_main_open.png"
        run Hide("extras_folio_modal")
        $ persistent.chapter_reached = _saved_pc14_chap
        $ persistent.te_cleared = _saved_pc14_te
        $ persistent.truth_spoiler_confirmed = _saved_pc14_conf
        $ persistent.chapter_reached = 6
        $ persistent.te_cleared = True
        pause 0.8
        assert eval (folio_chapter_select_open() and folio_total_count() == 10)
        screenshot "ui_15k_main_menu_reflowed.png"
        assert eval (folio_total_count() == 10 and folio_chapter_select_open())
        screenshot "ui_16k_main_menu_no_new_chip.png"
        $ persistent.chapter_reached = _saved_pc15_chap
        $ persistent.te_cleared = _saved_pc15_te
        $ persistent.truth_spoiler_confirmed = _saved_pc15_conf
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
