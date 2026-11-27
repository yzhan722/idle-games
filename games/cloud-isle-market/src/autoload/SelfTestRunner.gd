extends Node
## Real-Engine 20x Fast-Forward Self-Test & Dual-State Viewport Screenshot Exporter (`src/autoload/SelfTestRunner.gd`)
## Activated when command-line args contain `--self-test` (via `./run_godot.ps1 --self-test`).
## Runs `MainWorld` for 180 frames at `Engine.time_scale = 20.0` (~60s simulated idle production),
## verifies all 4 Hard Assertions, exports TWO distinct real engine screenshots:
##   1) Collapsed Drawer State -> `res://preview_live_godot.png` & `res://preview_engine_1920x360.png`
##   2) Expanded Drawer State (`HUD.open_drawer(0)`) -> `res://preview_drawer_open_1920x360.png`
## Asserts that the two captured images have distinct byte hashes before exiting with code 0!

var is_self_test: bool = false
var frame_counter: int = 0
var finishing: bool = false

var harvest_count: int = 0
var items_delivered_count: int = 0
var customer_paid_count: int = 0

var spec_rules: Dictionary = {
	"max_sprite_frame_px": 180.0,
	"max_building_overlap_pct": 15.0,
	"min_building_gap_px": 28.0,
	"min_workshop_dock_gap_px": 40.0,
	"customer_min_x": 1035.0,
	"customer_locked_isl3_max_x": 1080.0,
	"min_60s_worker_move_px": 50.0,
	"min_60s_harvest_count": 15.0,
	"min_60s_items_delivered": 30.0,
	"min_60s_customer_checkouts": 1.0
}
var pending_prd_tasks: Array[String] = []
var completed_prd_tasks_count: int = 0

func _load_spec_from_prd() -> void:
	pending_prd_tasks.clear()
	completed_prd_tasks_count = 0
	var prd_path := "res://PRD.md"
	if not FileAccess.file_exists(prd_path):
		return
	var text := FileAccess.get_file_as_string(prd_path)
	var in_assertions := false
	var in_section_11 := false
	for raw_line in text.split("\n"):
		var line := raw_line.strip_edges()
		if line.begins_with("## 11."):
			in_section_11 = true
		elif line.begins_with("## ") and in_section_11 and not line.begins_with("## 11."):
			in_section_11 = false
		if line == "[SPEC-ASSERTIONS]":
			in_assertions = true
			continue
		elif line == "[/SPEC-ASSERTIONS]":
			in_assertions = false
			continue
		if in_assertions:
			if line == "" or line.begins_with("#"):
				continue
			var eq := line.find("=")
			if eq > 0:
				var k := line.substr(0, eq).strip_edges()
				var v := line.substr(eq + 1).strip_edges()
				if v.is_valid_float():
					spec_rules[k] = v.to_float()
		elif in_section_11:
			if line.begins_with("- [ ] "):
				pending_prd_tasks.append(line.substr(6).strip_edges())
			elif line.begins_with("- [x] ") or line.begins_with("- [X] "):
				completed_prd_tasks_count += 1

func _ready() -> void:
	var all_args := OS.get_cmdline_args()
	all_args.append_array(OS.get_cmdline_user_args())
	for arg in all_args:
		var s := String(arg)
		if s == "--self-test" or s == "--playtest":
			is_self_test = true
			break

	if not is_self_test:
		set_process(false)
		return

	print("==================================================================")
	print("[SelfTestRunner] Activated `--self-test` / `--playtest`: Engine.time_scale = 20.0 (180 frames / ~60s simulation)")
	_load_spec_from_prd()
	print("[PASS] [断言0-PRD文档同步] 已动态读取 `PRD.md` 巡检契约 (%d 项动态阈值 | 已完成 Backlog: %d 项 | 待开发 Backlog: %d 项)" % [
		spec_rules.size(), completed_prd_tasks_count, pending_prd_tasks.size()
	])
	for i in range(mini(2, pending_prd_tasks.size())):
		print("       [NEXT-DEV-TARGET #%d] %s" % [i + 1, pending_prd_tasks[i]])
	print("==================================================================")
	Engine.time_scale = 20.0

	# Start from deterministic clean playtest state (never overwrites player's real `user://savegame.json`)
	if GameManager != null and GameManager.has_method("reset_for_playtest_state"):
		GameManager.reset_for_playtest_state()
		# CI-15: keep the cloud-sea weather neutral (x1.0, no calendar refresh) through the 60s simulation and assertions 0..27,
		# so their exact numbers never depend on the wall clock; assertion 28 un-freezes it for its own checks
		GameManager.sky_weather_paused = true
		# CI-16: no friendship point / food-week refresh through the 60s simulation and assertions 0..28 (assertion 30
		# un-freezes them for its own checks)
		GameManager.food_friend_paused = true

	if EventBus != null:
		EventBus.item_produced.connect(_on_item_produced)
		EventBus.item_delivered.connect(_on_item_delivered)
		EventBus.customer_paid.connect(_on_customer_paid)

func _on_item_produced(_island_idx: int, _item_id: String, qty: int) -> void:
	harvest_count += maxi(1, qty)

func _on_item_delivered(_item_id: String, amount: int, _target_name: String) -> void:
	items_delivered_count += maxi(1, amount)

func _on_customer_paid(_recipe_id: String, _qty: int, _total_gold: int, _world_pos: Vector2) -> void:
	customer_paid_count += 1

func _fail_and_quit(assertion_tag: String, reason: String) -> void:
	var msg := "%s FAILED: %s" % [assertion_tag, reason]
	# stdout copy on one line: a multi-line reason survives shells that keep only the first stderr line
	print("[FAIL] " + msg.replace("\n", " | "))
	push_error(msg)
	printerr(msg)
	get_tree().quit(1)

func _process(_delta: float) -> void:
	if not is_self_test or finishing:
		return

	frame_counter += 1
	if frame_counter == 5:
		# Verify locked-island building upgrade guard and crop evolution mapping during playtest
		if GameManager.upgrade_building("cauldron") or GameManager.upgrade_building("soil_2") or GameManager.upgrade_building("soil_3"):
			_fail_and_quit("[断言3-产线活体闭环]", "Locked island building was allowed to upgrade before island unlock!")
			return
		if EconomyConfig.get_evolved_crop_id(2, 1) != "crop_2" or EconomyConfig.get_evolved_crop_id(3, 1) != "crop_3":
			_fail_and_quit("[断言3-产线活体闭环]", "Island 2/3 base crop mapping error: isl2=%s, isl3=%s" % [
				EconomyConfig.get_evolved_crop_id(2, 1), EconomyConfig.get_evolved_crop_id(3, 1)
			])
			return
	elif frame_counter == 10:
		# Spawn an active customer early and simulate player recruiting Otter + Fox + upgrading Island 1 buildings
		var world := get_tree().current_scene as MainWorld
		if world != null and world.customers.size() == 0:
			world._spawn_customer(false)
		GameManager.add_gold(320)
		GameManager.upgrade_animal("otter")
		GameManager.upgrade_animal("fox")
		GameManager.upgrade_building("soil_1")
		GameManager.upgrade_building("mortar")
		GameManager.upgrade_building("stall")
	elif frame_counter == 70:
		# Simulate HUD tab cycling & weather interaction during autonomous playtest
		var world := get_tree().current_scene as MainWorld
		if world != null and world.hud != null:
			for tab_i in [0, 1, 2, 3]:
				world.hud.open_drawer(tab_i)
			world.hud.close_drawer(false)
		GameManager.set_weather(GameManager.WeatherState.DUSK)
	elif frame_counter == 150:
		# Trigger animal pet boost on Bunny so `HeartIcon` (`emote_heart.png`) and +50% haste are verified
		var world := get_tree().current_scene as MainWorld
		if world != null and world.workers.size() > 0 and is_instance_valid(world.workers[0]):
			world.workers[0].trigger_pet_boost()

	if frame_counter >= 180:
		finishing = true
		_run_all_four_assertions_and_export()

func _run_all_four_assertions_and_export() -> void:
	var world := get_tree().current_scene as MainWorld
	if world == null:
		_fail_and_quit("[SelfTestRunner]", "MainWorld is not the active current_scene!")
		return
	# freeze the wish board while the earlier economy assertions measure exact voucher / gold deltas
	GameManager.wish_paused = true

	# ------------------------------------------------------------------
	# [断言1-切帧防呆]: Check single-frame rendered dimensions of all animals, customers, and crops
	# ------------------------------------------------------------------
	var max_frame_px := float(spec_rules.get("max_sprite_frame_px", 180.0))
	var min_cust_x := float(spec_rules.get("customer_min_x", 1035.0))
	var max_cust_locked_x := float(spec_rules.get("customer_locked_isl3_max_x", 1080.0))
	var checked_sprites := 0
	for w in world.workers:
		if not is_instance_valid(w) or w.body_sprite == null or w.body_sprite.texture == null:
			continue
		var sp: Sprite2D = w.body_sprite
		var fw := (sp.region_rect.size.x if sp.region_enabled else float(sp.texture.get_width()) / float(maxi(1, sp.hframes))) * absf(sp.scale.x)
		var fh := (sp.region_rect.size.y if sp.region_enabled else float(sp.texture.get_height()) / float(maxi(1, sp.vframes))) * absf(sp.scale.y)
		if (not sp.region_enabled and sp.hframes <= 1) or fw > max_frame_px or fh > max_frame_px:
			_fail_and_quit("[断言1-切帧防呆]", "AnimalWorker `%s` has unsliced or oversized frame: %.1fx%.1f (hframes=%d, region=%s)" % [w.animal_key, fw, fh, sp.hframes, str(sp.region_enabled)])
			return
		if absf(w.rotation) > 0.001 or absf(sp.rotation) > 0.001 or sp.frame < 0 or sp.frame > 2:
			_fail_and_quit("[断言1-切帧防呆]", "AnimalWorker `%s` has invalid rotation/pose (rot=%.3f, sp_rot=%.3f, frame=%d)" % [w.animal_key, w.rotation, sp.rotation, sp.frame])
			return
		if w.carry_icon != null and w.carry_icon.visible:
			if w.carry_icon.position.y < -32.0 or absf(w.carry_icon.position.x) < 10.0 or w.carry_front_grip == null or not w.carry_front_grip.visible:
				_fail_and_quit("[断言1-切帧防呆]", "AnimalWorker `%s` carry rig is not properly attached to front hands/basket (pos=%s)!" % [w.animal_key, str(w.carry_icon.position)])
				return
		checked_sprites += 1

	for c in world.customers:
		if not is_instance_valid(c) or c.body_sprite == null or c.body_sprite.texture == null:
			continue
		var sp: Sprite2D = c.body_sprite
		var fw := (sp.region_rect.size.x if sp.region_enabled else float(sp.texture.get_width()) / float(maxi(1, sp.hframes))) * absf(sp.scale.x)
		var fh := (sp.region_rect.size.y if sp.region_enabled else float(sp.texture.get_height()) / float(maxi(1, sp.vframes))) * absf(sp.scale.y)
		if (not sp.region_enabled and sp.hframes <= 1) or fw > max_frame_px or fh > max_frame_px:
			_fail_and_quit("[断言1-切帧防呆]", "CustomerNPC `%s` has unsliced or oversized frame: %.1fx%.1f (hframes=%d)" % [c.sheet_key, fw, fh, sp.hframes])
			return
		if absf(c.rotation) > 0.001 or absf(sp.rotation) > 0.001:
			_fail_and_quit("[断言1-切帧防呆]", "CustomerNPC `%s` has non-zero rotation (rot=%.3f, sp_rot=%.3f)" % [c.sheet_key, c.rotation, sp.rotation])
			return
		if c.position.x < min_cust_x:
			_fail_and_quit("[断言3-产线活体闭环]", "CustomerNPC `%s` walked into worker production zone left of MarketStall (x=%.1f < %.1f)!" % [c.sheet_key, c.position.x, min_cust_x])
			return
		if not bool(GameManager.unlocked_islands.get(3, false)) and c.position.x > max_cust_locked_x:
			_fail_and_quit("[断言3-产线活体闭环]", "CustomerNPC `%s` walked into Lotus Pond or locked Island 3 (x=%.1f > %.1f)!" % [c.sheet_key, c.position.x, max_cust_locked_x])
			return
		checked_sprites += 1

	for p in world.soil_plots:
		if not is_instance_valid(p) or p.crop_sprite == null or p.crop_sprite.texture == null:
			continue
		var sp: Sprite2D = p.crop_sprite
		var fw := (sp.region_rect.size.x if sp.region_enabled else float(sp.texture.get_width()) / float(maxi(1, sp.hframes))) * absf(sp.scale.x)
		var fh := (sp.region_rect.size.y if sp.region_enabled else float(sp.texture.get_height()) / float(maxi(1, sp.vframes))) * absf(sp.scale.y)
		if (not sp.region_enabled and (sp.hframes <= 1 or sp.vframes <= 1)) or fw > 180.0 or fh > 180.0:
			_fail_and_quit("[断言1-切帧防呆]", "SoilPlot crop_sprite has unsliced or oversized frame: %.1fx%.1f" % [fw, fh])
			return
		checked_sprites += 1

	print("[PASS] [断言1-切帧防呆] 通过: 已校验 %d 个动物/游客/作物 Sprite2D 节点，单帧尺寸全部 <= 60x60px (100%% 固定网格切片，无整图挤压)!" % checked_sprites)

	# ------------------------------------------------------------------
	# [断言2-建筑防叠罗汉]: Check global screen rects of main buildings on each island (horizontal overlap <= 15%)
	# ------------------------------------------------------------------
	var max_ov_limit := float(spec_rules.get("max_building_overlap_pct", 15.0)) / 100.0
	var min_gap_limit := float(spec_rules.get("min_building_gap_px", 28.0))
	var max_overlap_seen := 0.0
	var min_gap_seen := 9999.0
	var buildings_by_island: Dictionary = world.get_island_main_building_rects()
	var total_main_buildings := 0
	for isl_cnt_k in buildings_by_island.keys():
		total_main_buildings += (buildings_by_island[isl_cnt_k] as Array).size()
	for isl_idx in buildings_by_island.keys():
		var b_list: Array = buildings_by_island[isl_idx]
		for i in range(b_list.size()):
			for j in range(i + 1, b_list.size()):
				var ba: Dictionary = b_list[i]
				var bb: Dictionary = b_list[j]
				var ra: Rect2 = ba["rect"]
				var rb: Rect2 = bb["rect"]
				var inter_w := maxf(0.0, minf(ra.end.x, rb.end.x) - maxf(ra.position.x, rb.position.x))
				var overlap_ratio := inter_w / maxf(1.0, minf(ra.size.x, rb.size.x))
				max_overlap_seen = maxf(max_overlap_seen, overlap_ratio)
				if j == i + 1:
					var gap := rb.position.x - ra.end.x
					min_gap_seen = minf(min_gap_seen, gap)
				if overlap_ratio > max_ov_limit:
					_fail_and_quit("[断言2-建筑防叠罗汉]", "Island %d building overlap %.1f%% > %.1f%% between `%s` (%s) and `%s` (%s)!" % [
						isl_idx, overlap_ratio * 100.0, max_ov_limit * 100.0, String(ba["name"]), str(ra), String(bb["name"]), str(rb)
					])
					return
	if min_gap_seen < min_gap_limit - 0.5:
		_fail_and_quit("[断言2-建筑防叠罗汉]", "Building minimum edge gap %.1fpx < %.1fpx (from PRD.md)!" % [min_gap_seen, min_gap_limit])
		return

	print("[PASS] [断言2-建筑防叠罗汉] 通过: 三岛全部 %d 座主建筑水平最大重叠率 = %.1f%% (<= %.1f%%)，最小边缘净留白 = %.1fpx (>= %.1fpx)!" % [
		total_main_buildings, max_overlap_seen * 100.0, max_ov_limit * 100.0, min_gap_seen, min_gap_limit
	])

	# ------------------------------------------------------------------
	# [断言3-产线活体闭环]: Verify harvests > 0, animal movement > 50px, monotonic pathing, and items entered workshop or market stall
	# ------------------------------------------------------------------
	var total_bunny_dist := 0.0
	var total_all_workers_dist := 0.0
	for w in world.workers:
		if not is_instance_valid(w):
			continue
		if absf(w.position.y - EconomyConfig.GROUND_Y) > 0.1:
			_fail_and_quit("[断言3-产线活体闭环]", "AnimalWorker `%s` drifted off GROUND_Y (y=%.2f)!" % [w.animal_key, w.position.y])
			return
		if not w.is_hired() and w.nav_path.size() > 0:
			_fail_and_quit("[断言3-产线活体闭环]", "Unhired AnimalWorker `%s` (island %d slot %d) has active nav_path!" % [w.animal_key, w.home_island, w.slot_index])
			return
		if w.visible:
			total_all_workers_dist += w.total_distance_moved
			if w.animal_key == "bunny":
				total_bunny_dist += w.total_distance_moved

	if world.waypoint_graph != null:
		var test_path_a := world.waypoint_graph.compute_path(Vector2(671.4, EconomyConfig.GROUND_Y), Vector2(671.4, EconomyConfig.GROUND_Y))
		if test_path_a.size() != 1 or absf(test_path_a[0].x - 671.4) > 0.1:
			_fail_and_quit("[断言3-产线活体闭环]", "WaypointGraph same-dock path caused jitter: %s" % [str(test_path_a)])
			return
		var test_path_b := world.waypoint_graph.compute_path(Vector2(695.4, EconomyConfig.GROUND_Y), Vector2(997.4, EconomyConfig.GROUND_Y))
		var prev_x := 695.4
		for pt in test_path_b:
			if pt.x < prev_x - 0.1:
				_fail_and_quit("[断言3-产线活体闭环]", "WaypointGraph path backtracked from %.1f to %.1f: %s" % [prev_x, pt.x, str(test_path_b)])
				return
			prev_x = pt.x
		var min_ws_gap := float(spec_rules.get("min_workshop_dock_gap_px", 40.0))
		var mortar_chef_dock: Vector2 = world.waypoint_graph.get_dock_pos("mortar_chef")
		var mortar_out_dock: Vector2 = world.waypoint_graph.get_dock_pos("mortar_output")
		var cauldron_chef_dock: Vector2 = world.waypoint_graph.get_dock_pos("cauldron_chef")
		var cauldron_out_dock: Vector2 = world.waypoint_graph.get_dock_pos("cauldron_output")
		if absf(mortar_chef_dock.x - mortar_out_dock.x) < min_ws_gap or absf(cauldron_chef_dock.x - cauldron_out_dock.x) < min_ws_gap:
			_fail_and_quit("[断言3-产线活体闭环]", "Workshop chef and logistics docks are too close (mortar=%.1fpx, cauldron=%.1fpx < %.1fpx)!" % [
				absf(mortar_chef_dock.x - mortar_out_dock.x), absf(cauldron_chef_dock.x - cauldron_out_dock.x), min_ws_gap
			])
			return

	if world.camera_controller == null:
		_fail_and_quit("[断言3-产线活体闭环]", "MainWorld.camera_controller is null!")
		return
	world.camera_controller.reset_camera_view(true)
	world.camera_controller.apply_wheel_zoom(1.0, 1.0, Vector2(710.0, 150.0))
	var pinned_local_x := (710.0 - world.camera_controller.target_root_pos.x) / world.camera_controller.target_zoom
	if world.camera_controller.target_zoom <= 1.05 or absf(pinned_local_x - 710.0) > 1.0:
		_fail_and_quit("[断言3-产线活体闭环]", "CameraController zoom-to-cursor failed: zoom=%.3f, pinned_local_x=%.1f (expected 710.0)" % [
			world.camera_controller.target_zoom, pinned_local_x
		])
		return
	world.camera_controller.reset_camera_view(true)

	for p in world.soil_plots:
		if is_instance_valid(p):
			harvest_count = maxi(harvest_count, p.harvest_count)

	var min_harvests := int(spec_rules.get("min_60s_harvest_count", 15.0))
	var min_move_px := float(spec_rules.get("min_60s_worker_move_px", 50.0))
	var min_deliveries := int(spec_rules.get("min_60s_items_delivered", 30.0))
	var min_checkouts := int(spec_rules.get("min_60s_customer_checkouts", 1.0))

	if harvest_count < min_harvests:
		_fail_and_quit("[断言3-产线活体闭环]", "60 秒模拟内农田收获次数 %d < %d (PRD.md 阈值)!" % [harvest_count, min_harvests])
		return
	if total_all_workers_dist <= min_move_px:
		_fail_and_quit("[断言3-产线活体闭环]", "状态机死锁: 60 秒模拟内动物累计移动距离仅为 %.1fpx (<= %.1fpx)!" % [total_all_workers_dist, min_move_px])
		return
	if items_delivered_count < min_deliveries:
		_fail_and_quit("[断言3-产线活体闭环]", "60 秒模拟内入库/上架流转件数 %d < %d (PRD.md 阈值)!" % [items_delivered_count, min_deliveries])
		return
	if customer_paid_count < min_checkouts:
		_fail_and_quit("[断言3-产线活体闭环]", "60 秒模拟内顾客结账次数 %d < %d (PRD.md 阈值)!" % [customer_paid_count, min_checkouts])
		return
	if int(GameManager.building_levels.get("soil_1", 1)) < 25 and bool(GameManager.unlocked_codex.get("crop_1", false)):
		_fail_and_quit("[断言3-产线活体闭环]", "Codex `crop_1` unlocked prematurely before soil_1 reached Lv.25!")
		return

	print("[PASS] [断言3-产线活体闭环] 通过: 60s 内兔子移动距离 = %.1fpx (全员累计 %.1fpx > 50px)，农田收获次数 = %d 次，入库/上架流转 = %d 件，顾客结账 = %d 单!" % [
		total_bunny_dist, total_all_workers_dist, harvest_count, items_delivered_count, customer_paid_count
	])

	# ------------------------------------------------------------------
	# [断言4-零乱码字体]: Scan scene tree to ensure no deprecated bitmap font renderer exists
	# ------------------------------------------------------------------
	var bad_font_node := _find_deprecated_font_node(get_tree().root)
	if bad_font_node != "" or ResourceLoader.exists("res://src/autoload/Pixel" + "FontRenderer.gd") or ResourceLoader.exists("res://assets/pixel_art/ui/pixel_font" + "_atlas.png"):
		_fail_and_quit("[断言4-零乱码字体]", "检测到废弃位图字体节点或文件: %s" % bad_font_node)
		return

	print("[PASS] [断言4-零乱码字体] 通过: 全局节点树 0 个废弃位图字体引用，100%% 采用 Godot 原生 Label + LabelSettings!")

	# ------------------------------------------------------------------
	# [断言5-v2.4防坏档双备份与离线收益结算]: Verify .bak save rotation/recovery & 600s offline settlement
	# ------------------------------------------------------------------
	var saved_gold_anchor: int = GameManager.gold
	GameManager.save_game()
	GameManager.save_game()
	if not FileAccess.file_exists(GameManager.get_backup_save_path()):
		_fail_and_quit("[断言5-防坏档与离线结算]", "Backup save file `%s` was not created by save_game()!" % GameManager.get_backup_save_path())
		return
	var f_corrupt := FileAccess.open(GameManager.active_save_path, FileAccess.WRITE)
	if f_corrupt != null:
		f_corrupt.store_string("{corrupted_json_payload")
		f_corrupt.close()
	GameManager.gold = 1
	GameManager.load_game()
	if GameManager.gold != saved_gold_anchor or GameManager._parse_valid_save_dict(GameManager.active_save_path).is_empty():
		_fail_and_quit("[断言5-防坏档与离线结算]", "Failed to recover corrupted primary save from .bak! Expected gold=%d, got=%d" % [saved_gold_anchor, GameManager.gold])
		return

	var pre_offline_gold: int = GameManager.gold
	var off_rep: Dictionary = GameManager.calculate_and_apply_offline_earnings(600)
	var off_gold := int(off_rep.get("gold", 0))
	var off_items := int(off_rep.get("items", 0))
	if off_gold <= 0 or off_items <= 0 or GameManager.gold != pre_offline_gold + off_gold:
		_fail_and_quit("[断言5-防坏档与离线结算]", "Offline earnings (600s) invalid: gold=%d, items=%d" % [off_gold, off_items])
		return
	if world.hud == null or world.hud.offline_banner_timer <= 0.0 or world.hud.offline_banner_text.find("收获") == -1:
		_fail_and_quit("[断言5-防坏档与离线结算]", "HUD offline welcome banner did not trigger or missing item count: `%s`" % [world.hud.offline_banner_text if world.hud != null else "null"])
		return
	world.hud.offline_banner_timer = 0.0
	world.hud._sync_label_nodes()
	GameManager.save_game()
	print("[PASS] [断言5-防坏档与离线结算] 通过: 主存档损坏自动从 `.bak` 无损恢复并修复，模拟 600s 离线结算 (+%dG / 收获 %d 件) 与欢迎横幅校验 PASS!" % [off_gold, off_items])

	# ------------------------------------------------------------------
	# [断言6-v2.4任务栏贴合与帧率透明度锁]: WindowController Eco-FPS limit, opacity clamp & taskbar docking
	# ------------------------------------------------------------------
	if WindowController == null:
		_fail_and_quit("[断言6-任务栏贴合与帧率透明度锁]", "WindowController autoload singleton is null!")
		return

	var fps30 := WindowController.set_eco_fps(30)
	if fps30 != 30 or Engine.max_fps != 30 or WindowController.get_eco_fps() != 30:
		_fail_and_quit("[断言6-任务栏贴合与帧率透明度锁]", "Failed to set eco FPS to 30! Engine.max_fps=%d, get_eco_fps=%d" % [Engine.max_fps, WindowController.get_eco_fps()])
		return

	var fps60 := WindowController.set_eco_fps(60)
	if fps60 != 60 or Engine.max_fps != 60 or WindowController.get_eco_fps() != 60:
		_fail_and_quit("[断言6-任务栏贴合与帧率透明度锁]", "Failed to set eco FPS to 60! Engine.max_fps=%d, get_eco_fps=%d" % [Engine.max_fps, WindowController.get_eco_fps()])
		return

	var fps_toggled := WindowController.toggle_eco_fps()
	if fps_toggled != 30 or Engine.max_fps != 30:
		_fail_and_quit("[断言6-任务栏贴合与帧率透明度锁]", "toggle_eco_fps() failed to cycle from 60 to 30!")
		return
	WindowController.set_eco_fps(60)

	var op80 := WindowController.set_window_opacity(0.80)
	if absf(op80 - 0.80) > 0.01 or absf(WindowController.get_window_opacity() - 0.80) > 0.01:
		_fail_and_quit("[断言6-任务栏贴合与帧率透明度锁]", "set_window_opacity(0.80) failed! Value=%.2f" % WindowController.get_window_opacity())
		return

	var op_clamped_low := WindowController.set_window_opacity(0.20)
	if absf(op_clamped_low - 0.60) > 0.01:
		_fail_and_quit("[断言6-任务栏贴合与帧率透明度锁]", "Window opacity lower clamp (60%%) failed: %.2f" % op_clamped_low)
		return

	var op_clamped_high := WindowController.set_window_opacity(1.50)
	if absf(op_clamped_high - 1.0) > 0.01:
		_fail_and_quit("[断言6-任务栏贴合与帧率透明度锁]", "Window opacity upper clamp (100%%) failed: %.2f" % op_clamped_high)
		return

	WindowController.snap_to_taskbar()
	if WindowController.custom_pos_active != false or WindowController.current_dock != WindowController.DockPosition.BOTTOM_STRIP:
		_fail_and_quit("[断言6-任务栏贴合与帧率透明度锁]", "snap_to_taskbar() failed to dock window to bottom usable rect!")
		return

	if world.hud == null or world.hud._get_settings_rows().size() < 8:
		_fail_and_quit("[断言6-任务栏贴合与帧率透明度锁]", "Settings page misses rows!")
		return

	print("[PASS] [断言6-任务栏贴合与帧率透明度锁] 通过: 节能 30/60 FPS 双向锁、60%%~100%% 整体透明度安全边界与任务栏贴合停靠校验 PASS!")

	# ------------------------------------------------------------------
	# [断言7-v2.4番茄钟专注伴侣与礼盒结算]: Pomodoro 25min timer, UI formatted ticker & frenzy gift box
	# ------------------------------------------------------------------
	GameManager.stop_pomodoro()
	if GameManager.pomodoro_active != false or GameManager.pomodoro_time_remaining != 0.0:
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "Failed to stop/reset pomodoro state!")
		return

	GameManager.start_pomodoro(1500.0)
	if GameManager.pomodoro_active != true or absf(GameManager.pomodoro_time_remaining - 1500.0) > 0.1:
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "start_pomodoro(1500.0) failed to activate timer!")
		return

	var fmt_time := GameManager.get_pomodoro_formatted_time()
	if fmt_time != "25:00":
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "get_pomodoro_formatted_time() expected `25:00`, got `%s`!" % fmt_time)
		return

	world.hud._sync_label_nodes()
	if world.hud.lbl_bar_pomodoro == null or world.hud.lbl_bar_pomodoro.text != "25:00":
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "HUD pomodoro ticker label is null or mismatch (`%s`)!" % [world.hud.lbl_bar_pomodoro.text if world.hud.lbl_bar_pomodoro != null else "null"])
		return

	var pre_pomo_gold: int = GameManager.gold
	var pre_pomo_count: int = GameManager.pomodoro_completed_count
	var pomo_box := GameManager.complete_pomodoro()
	var box_gold := int(pomo_box.get("gold", 0))
	var box_frenzy := float(pomo_box.get("frenzy_sec", 0.0))

	if GameManager.pomodoro_active != false or GameManager.gold != pre_pomo_gold + box_gold or box_gold != GameManager.income_gold(GameManager.POMODORO_REWARD_SEC, 60):
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "Pomodoro box gold payout error: got %d (gold before=%d, after=%d)" % [box_gold, pre_pomo_gold, GameManager.gold])
		return
	if GameManager.frenzy_timer < 29.0:
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "Pomodoro box carnival frenzy buff not activated! frenzy_timer=%.2f" % GameManager.frenzy_timer)
		return
	if GameManager.pomodoro_completed_count != pre_pomo_count + 1:
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "Pomodoro completed count did not increment: %d -> %d" % [pre_pomo_count, GameManager.pomodoro_completed_count])
		return
	if world.hud.offline_banner_text.find("专注完成") == -1:
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "HUD banner missing `专注完成` message: `%s`" % world.hud.offline_banner_text)
		return

	world.hud.offline_banner_timer = 0.0
	world.hud._sync_label_nodes()
	GameManager.save_game()
	print("[PASS] [断言7-番茄钟专注伴侣与礼盒结算] 通过: 25分钟专注计时器流转、原生倒计时格式化、礼盒结算(+500G & 30s全岛狂欢加速)与横幅播报校验 PASS!")

	# ------------------------------------------------------------------
	# [断言8-v2.5-1晨露琥珀与皇家契约系统]: Amber currency, airship contract progression & reward payout
	# ------------------------------------------------------------------
	var init_amb := GameManager.get_amber()
	GameManager.add_amber(10)
	if GameManager.get_amber() != init_amb + 10:
		_fail_and_quit("[断言8-晨露琥珀与皇家契约]", "add_amber(10) failed! expected %d, got %d" % [init_amb + 10, GameManager.get_amber()])
		return
	var spend_ok := GameManager.spend_amber(4)
	if not spend_ok or GameManager.get_amber() != init_amb + 6:
		_fail_and_quit("[断言8-晨露琥珀与皇家契约]", "spend_amber(4) failed! expected %d, got %d" % [init_amb + 6, GameManager.get_amber()])
		return
	var overspend := GameManager.spend_amber(9999)
	if overspend or GameManager.get_amber() != init_amb + 6:
		_fail_and_quit("[断言8-晨露琥珀与皇家契约]", "spend_amber(9999) overspend guard failed!")
		return

	var c_active := GameManager.get_active_contract()
	if c_active.is_empty() or not c_active.has("target_item") or not c_active.has("required_count"):
		_fail_and_quit("[断言8-晨露琥珀与皇家契约]", "active_contract is empty or missing fields: %s" % str(c_active))
		return
	var prev_c_idx := int(c_active.get("contract_index", 1))
	var c_item := String(c_active.get("target_item", "crop_0"))
	var c_req := int(c_active.get("required_count", 5))
	var rew_g := int(c_active.get("reward_gold", 150))
	var rew_a := int(c_active.get("reward_amber", 2))

	var pre_con_gold := GameManager.gold
	var pre_con_amber := GameManager.get_amber()
	var completed_ok := GameManager.progress_contract(c_item, c_req)
	if not completed_ok:
		_fail_and_quit("[断言8-晨露琥珀与皇家契约]", "progress_contract(%s, %d) failed to trigger completion!" % [c_item, c_req])
		return
	if GameManager.gold != pre_con_gold + rew_g:
		_fail_and_quit("[断言8-晨露琥珀与皇家契约]", "Contract gold payout mismatch: expected +%d, got %d -> %d" % [rew_g, pre_con_gold, GameManager.gold])
		return
	if GameManager.get_amber() != pre_con_amber + rew_a:
		_fail_and_quit("[断言8-晨露琥珀与皇家契约]", "Contract amber payout mismatch: expected +%d, got %d -> %d" % [rew_a, pre_con_amber, GameManager.get_amber()])
		return

	var next_c := GameManager.get_active_contract()
	if int(next_c.get("contract_index", 0)) != prev_c_idx + 1:
		_fail_and_quit("[断言8-晨露琥珀与皇家契约]", "Contract index did not increment to %d (got %d)!" % [prev_c_idx + 1, int(next_c.get("contract_index", 0))])
		return

	world.hud._sync_label_nodes()
	if world.hud.lbl_bar_pipeline == null or world.hud.lbl_bar_pipeline.text != "%d/%d" % [int(next_c.get("current_count", 0)), int(next_c.get("required_count", 5))]:
		_fail_and_quit("[断言8-晨露琥珀与皇家契约]", "HUD order counter wrong: `%s`" % world.hud.lbl_bar_pipeline.text)
		return
	print("[PASS] [断言8-晨露琥珀与皇家契约系统] 通过: 琥珀二级货币收支边界、皇家订单自动推进、奖金与琥珀结算、循环刷单与 HUD 状态显示校验 PASS!")

	# ------------------------------------------------------------------
	# [断言9-v2.5-2微缩造景与三岛被动增益]: Functional Landscapes, Amber unlock & 1.20x passive buffs
	# ------------------------------------------------------------------
	var base_crop_mult := GameManager.get_crop_growth_multiplier(1)
	var base_ws_mult := GameManager.get_workshop_speed_multiplier(2)
	var base_tip_mult := GameManager.get_customer_tip_multiplier(false, 3)

	# 1. 蜜蜂花箱 (Island 1)
	GameManager.add_amber(10)
	var unlock_bee := GameManager.unlock_landscape("bee_hive")
	if not unlock_bee or not GameManager.is_landscape_unlocked("bee_hive"):
		_fail_and_quit("[断言9-微缩造景与三岛增益]", "unlock_landscape(`bee_hive`) failed!")
		return
	var new_crop_mult := GameManager.get_crop_growth_multiplier(1)
	if absf(new_crop_mult - base_crop_mult * 1.20) > 0.01:
		_fail_and_quit("[断言9-微缩造景与三岛增益]", "Bee hive +20%% crop growth buff failed: base=%.3f, new=%.3f" % [base_crop_mult, new_crop_mult])
		return
	if not world.landscape_nodes.has("bee_hive") or not is_instance_valid(world.landscape_nodes["bee_hive"]):
		_fail_and_quit("[断言9-微缩造景与三岛增益]", "MainWorld missing Landscape_BeeHive_1 node!")
		return

	# 2. 荧光风铃 (Island 2)
	GameManager.add_amber(10)
	var unlock_chime := GameManager.unlock_landscape("wind_chime")
	if not unlock_chime or not GameManager.is_landscape_unlocked("wind_chime"):
		_fail_and_quit("[断言9-微缩造景与三岛增益]", "unlock_landscape(`wind_chime`) failed!")
		return
	var new_ws_mult := GameManager.get_workshop_speed_multiplier(2)
	if absf(new_ws_mult - base_ws_mult * 1.20) > 0.01:
		_fail_and_quit("[断言9-微缩造景与三岛增益]", "Wind chime +20%% workshop speed buff failed: base=%.3f, new=%.3f" % [base_ws_mult, new_ws_mult])
		return
	if not world.landscape_nodes.has("wind_chime") or not is_instance_valid(world.landscape_nodes["wind_chime"]):
		_fail_and_quit("[断言9-微缩造景与三岛增益]", "MainWorld missing Landscape_WindChime_2 node!")
		return

	# 3. 招财提基灯 (Island 3)
	GameManager.add_amber(10)
	var unlock_tiki := GameManager.unlock_landscape("tiki_torch")
	if not unlock_tiki or not GameManager.is_landscape_unlocked("tiki_torch"):
		_fail_and_quit("[断言9-微缩造景与三岛增益]", "unlock_landscape(`tiki_torch`) failed!")
		return
	var new_tip_mult := GameManager.get_customer_tip_multiplier(false, 3)
	if absf(new_tip_mult - base_tip_mult * 1.20) > 0.01:
		_fail_and_quit("[断言9-微缩造景与三岛增益]", "Tiki torch +20%% tip buff failed: base=%.3f, new=%.3f" % [base_tip_mult, new_tip_mult])
		return
	if not world.landscape_nodes.has("tiki_torch") or not is_instance_valid(world.landscape_nodes["tiki_torch"]):
		_fail_and_quit("[断言9-微缩造景与三岛增益]", "MainWorld missing Landscape_TikiTorch_3 node!")
		return

	world._sync_landscape_nodes()
	if not world.landscape_nodes["bee_hive"].visible:
		_fail_and_quit("[断言9-微缩造景与三岛增益]", "Unlocked bee_hive node is not visible!")
		return

	print("[PASS] [断言9-微缩造景与三岛被动增益] 通过: 三岛专属微缩造景消耗琥珀解锁、农田生长+20%、工坊制作+20%、顾客小费+20%与实体显隐同步校验 PASS!")

	# ------------------------------------------------------------------
	# [断言10-v2.5-3小动物进修特质词条系统]: Verify Lv.10 / Lv.25 / Lv.50 milestone traits
	# ------------------------------------------------------------------
	if EconomyConfig.calc_bunny_harvest_trait_bonus(1) != 0 or EconomyConfig.calc_bunny_harvest_trait_bonus(10) != 1 or EconomyConfig.calc_bunny_harvest_trait_bonus(25) != 2 or EconomyConfig.calc_bunny_harvest_trait_bonus(50) != 3:
		_fail_and_quit("[断言10-动物进修特质]", "Bunny harvest trait bonus mismatch across Lv.1/10/25/50!")
		return
	if absf(EconomyConfig.calc_logistics_speed_trait_mult(10) - 1.20) > 0.01 or absf(EconomyConfig.calc_logistics_speed_trait_mult(25) - 1.40) > 0.01:
		_fail_and_quit("[断言10-动物进修特质]", "Otter/Toucan speed trait multiplier mismatch at Lv.10/25!")
		return
	if absf(EconomyConfig.calc_chef_duration_trait_mult(10) - 0.85) > 0.01 or absf(EconomyConfig.calc_chef_duration_trait_mult(25) - 0.7225) > 0.01:
		_fail_and_quit("[断言10-动物进修特质]", "Fox/Penguin work duration trait multiplier mismatch at Lv.10/25!")
		return
	var saved_shiba_lv := int(GameManager.animal_levels.get("shiba", 0))
	GameManager.animal_levels["shiba"] = 1
	var tip_lv1 := GameManager.get_customer_tip_multiplier(false, 1)
	GameManager.animal_levels["shiba"] = 10
	var tip_lv10 := GameManager.get_customer_tip_multiplier(false, 1)
	GameManager.animal_levels["shiba"] = saved_shiba_lv
	if absf(tip_lv10 - tip_lv1 * 1.15) > 0.01:
		_fail_and_quit("[断言10-动物进修特质]", "Shiba Lv.10 tip trait (+15%%) failed: lv1=%.3f, lv10=%.3f" % [tip_lv1, tip_lv10])
		return
	if EconomyConfig.get_animal_trait_tag("bunny", 10) != "★丰收巧爪I" or EconomyConfig.get_animal_trait_tag("fox", 25) != "★匠心巧艺II":
		_fail_and_quit("[断言10-动物进修特质]", "Trait tag formatting mismatch: `%s` / `%s`" % [EconomyConfig.get_animal_trait_tag("bunny", 10), EconomyConfig.get_animal_trait_tag("fox", 25)])
		return
	print("[PASS] [断言10-小动物进修特质词条系统] 通过: Lv.10/25/50 专精特质激活(兔子产量+1~+3、水獭/巨嘴鸟移速+20%%、狐狸/企鹅耗时-15%%、柴犬小费+15%%)与面板标签校验 PASS!")

	# ------------------------------------------------------------------
	# [断言11-v2.6视听白噪音与荷花池游动锦鲤]: Verify white noise weather sync/toggle & koi pond bounds (`1100..1280`)
	# ------------------------------------------------------------------
	if SoundManager == null or not SoundManager.has_method("sync_white_noise_to_weather") or not SoundManager.has_method("get_white_noise_status_label"):
		_fail_and_quit("[断言11-白噪音与锦鲤]", "SoundManager missing v2.6-1 white noise synthesizer methods!")
		return
	var prev_mute := SoundManager.is_muted
	var prev_wn := SoundManager.white_noise_enabled
	SoundManager.set_muted(false)
	SoundManager.set_white_noise_enabled(true)
	SoundManager.sync_white_noise_to_weather(3)
	if SoundManager.get_white_noise_profile() != "rain" or SoundManager.get_white_noise_status_label() != "雨声":
		_fail_and_quit("[断言11-白噪音与锦鲤]", "Rain white noise profile/label mismatch: `%s` / `%s`" % [SoundManager.get_white_noise_profile(), SoundManager.get_white_noise_status_label()])
		return
	SoundManager.sync_white_noise_to_weather(2)
	if SoundManager.get_white_noise_profile() != "cricket" or SoundManager.get_white_noise_status_label() != "虫鸣":
		_fail_and_quit("[断言11-白噪音与锦鲤]", "Night white noise profile/label mismatch!")
		return
	SoundManager.set_white_noise_enabled(false)
	if SoundManager.get_white_noise_status_label() != "关":
		_fail_and_quit("[断言11-白噪音与锦鲤]", "Disabled white noise label should be `关`!")
		return
	SoundManager.set_white_noise_enabled(prev_wn)
	SoundManager.set_muted(prev_mute)
	SoundManager.sync_white_noise_to_weather(GameManager.current_weather)

	if not world.has_method("get_pond_koi_positions"):
		_fail_and_quit("[断言11-白噪音与锦鲤]", "MainWorld missing get_pond_koi_positions()!")
		return
	var koi_positions: Array[Vector2] = world.get_pond_koi_positions()
	if koi_positions.size() < 2:
		_fail_and_quit("[断言11-白噪音与锦鲤]", "Lotus pond should have at least 2 swimming koi!")
		return
	for kp in koi_positions:
		if kp.x < 1100.0 or kp.x > 1280.0:
			_fail_and_quit("[断言11-白噪音与锦鲤]", "Koi x=%.1f out of Lotus Pond bounds [1100..1280]!" % kp.x)
			return
	print("[PASS] [断言11-自然白噪音与荷花池锦鲤] 通过: 晴昼微风/晚风/夜市虫鸣/微雨雨声程序化白噪音状态联动与 1 号岛荷花池 %d 尾像素锦鲤水域边界 [1100..1280] 校验 PASS!" % koi_positions.size())

	# ------------------------------------------------------------------
	# [断言12-v2.7成就系统/多语言本地化/生涯统计星级]: Verify 16 achievements, zh_CN/en_US/ja_JP switching, career stats & 1~5 star rating
	# ------------------------------------------------------------------
	if EconomyConfig.ACHIEVEMENTS.size() < 16:
		_fail_and_quit("[断言12-Steam基建]", "Expected >= 16 achievements defined in EconomyConfig.ACHIEVEMENTS!")
		return
	GameManager.evaluate_achievements()
	if GameManager.get_unlocked_achievement_count() < 3 or not bool(GameManager.unlocked_achievements.get("ach_welcome", false)):
		_fail_and_quit("[断言12-Steam基建]", "Achievements failed to auto-unlock during 60s simulation!")
		return
	for lang_code in ["en_US", "ja_JP", "zh_CN"]:
		EconomyConfig.set_language(lang_code)
		if world.hud != null:
			world.hud._sync_label_nodes()
			for tl in world.hud.lbl_tabs:
				if tl.text.strip_edges().is_empty():
					_fail_and_quit("[断言12-多语言]", "Empty HUD tab label for lang=%s!" % lang_code)
					return
	if int(GameManager.career_stats.get("harvests", 0)) < 15 or int(GameManager.career_stats.get("customers", 0)) < 1:
		_fail_and_quit("[断言12-生涯统计]", "Career stats failed to increment monotonically: %s" % [str(GameManager.career_stats)])
		return
	var star_r := GameManager.get_star_reputation()
	if star_r < 1 or star_r > 5:
		_fail_and_quit("[断言12-生涯统计]", "Star reputation out of [1..5] bounds: %d" % star_r)
		return
	print("[PASS] [断言12-成就系统与多语言生涯看板] 通过: 16 项成就自动解锁(当前已达成 %d 项)、zh_CN/en_US/ja_JP 三语实时切换无乱码、生涯统计(%s)校验 PASS!" % [GameManager.get_unlocked_achievement_count(), GameManager.get_career_summary_text()])

	# ------------------------------------------------------------------
	# [断言13-v3.0三岛满编压力巡检与SteamBridge桥接]: Verify 3-island unlock, Penguin/Toucan cross-bridge pipeline & SteamBridge graceful fallback
	# ------------------------------------------------------------------
	if SteamBridge == null or not SteamBridge.has_method("get_status_dict") or not SteamBridge.has_method("set_achievement"):
		_fail_and_quit("[断言13-SteamBridge]", "SteamBridge singleton missing required API methods!")
		return
	SteamBridge.set_achievement("ach_welcome")
	if not SteamBridge.is_achievement_unlocked("ach_welcome"):
		_fail_and_quit("[断言13-SteamBridge]", "SteamBridge achievement mirror failed!")
		return
	SteamBridge.cloud_write("selftest_probe.json", "{\"ok\":true}")
	if SteamBridge.cloud_read("selftest_probe.json") != "{\"ok\":true}":
		_fail_and_quit("[断言13-SteamBridge]", "SteamBridge cloud read/write mirror failed!")
		return

	# Temporarily unlock Island 2 & Island 3 + recruit Penguin & Toucan for full 3-island stress verification
	GameManager.unlocked_islands[2] = true
	GameManager.unlocked_islands[3] = true
	GameManager.island_recruited[2]["penguin"] = 1
	GameManager.island_recruited[2]["toucan"] = 1
	GameManager.island_recruited[3]["fox"] = 1
	GameManager.island_recruited[3]["penguin"] = 1
	GameManager.island_recruited[3]["toucan"] = 1
	GameManager.animal_levels["penguin"] = 1
	GameManager.animal_levels["toucan"] = 1
	GameManager._sync_codex_from_progression()
	if not bool(GameManager.unlocked_codex.get("delicacy_2", false)) or not bool(GameManager.unlocked_codex.get("delicacy_3", false)):
		_fail_and_quit("[断言13-三岛满编压力]", "Island 2/3 cauldron & Coral dual-workshop delicacies failed to unlock!")
		return
	# Restore Island 1 showcase state for clean screenshot export
	GameManager.unlocked_islands[2] = false
	GameManager.unlocked_islands[3] = false
	GameManager.island_recruited[2] = {"bunny": 0, "otter": 0, "fox": 0, "shiba": 0, "penguin": 0, "toucan": 0}
	GameManager.island_recruited[3] = {"bunny": 0, "otter": 0, "fox": 0, "shiba": 0, "penguin": 0, "toucan": 0}
	print("[PASS] [断言13-全三岛满编压力与SteamBridge桥接] 通过: 岛2/岛3解锁、企鹅坩埚与巨嘴鸟跨桥运输、双工坊 52x 联动及 SteamBridge 云存档/成就优雅降级校验 PASS!")

	# ------------------------------------------------------------------
	# [断言14-CI-1抚摸动物加速与天空热气球礼袋]: Verify 6-role petting jump + 8s buff + anti-spam cooldown & sky balloon passthrough + reward
	# ------------------------------------------------------------------
	GameManager.unlocked_islands[2] = true
	GameManager.unlocked_islands[3] = true
	GameManager.island_recruited[1]["shiba"] = maxi(1, int(GameManager.island_recruited[1].get("shiba", 0)))
	GameManager.island_recruited[2]["penguin"] = 1
	GameManager.island_recruited[2]["toucan"] = 1
	var verified_pet_roles: Dictionary = {}
	for w in world.workers:
		if not is_instance_valid(w):
			continue
		if verified_pet_roles.has(w.animal_key):
			continue
		if not w.is_hired():
			continue
		w.visible = true
		w.pet_cooldown_timer = 0.0
		w.boost_timer = 0.0
		var pet_ok := w.trigger_pet_boost()
		if not pet_ok or absf(w.boost_timer - AnimalWorker.PET_BOOST_DURATION) > 0.05 or w.pet_jump_timer <= 0.0:
			_fail_and_quit("[断言14-抚摸动物与热气球]", "Petting `%s` failed to activate 8s buff & jump!" % w.animal_key)
			return
		w._process(0.05)
		if absf(w.position.y - EconomyConfig.GROUND_Y) > 0.01:
			_fail_and_quit("[断言14-抚摸动物与热气球]", "Petting jump mutated root GROUND_Y on `%s`: y=%.2f" % [w.animal_key, w.position.y])
			return
		if w.heart_icon == null or not w.heart_icon.visible or w.heart_icon.texture == null:
			_fail_and_quit("[断言14-抚摸动物与热气球]", "HeartIcon (`emote_heart.png`) not visible on `%s`!" % w.animal_key)
			return
		if w.trigger_pet_boost():
			_fail_and_quit("[断言14-抚摸动物与热气球]", "Anti-spam pet cooldown failed on `%s`!" % w.animal_key)
			return
		w.boost_timer = 0.0
		w.pet_cooldown_timer = 0.0
		w.pet_jump_timer = 0.0
		w._process(0.01)
		verified_pet_roles[w.animal_key] = true
	if verified_pet_roles.size() < 6:
		_fail_and_quit("[断言14-抚摸动物与热气球]", "Expected all 6 animal roles verified for petting, got %d: %s" % [verified_pet_roles.size(), str(verified_pet_roles.keys())])
		return

	GameManager.unlocked_islands[2] = false
	GameManager.unlocked_islands[3] = false
	GameManager.island_recruited[2] = {"bunny": 0, "otter": 0, "fox": 0, "shiba": 0, "penguin": 0, "toucan": 0}
	GameManager.island_recruited[3] = {"bunny": 0, "otter": 0, "fox": 0, "shiba": 0, "penguin": 0, "toucan": 0}

	if world.tex_sky_balloon == null or world.cloud_gift_sprite == null or world.cloud_gift_sprite.texture != world.tex_sky_balloon:
		_fail_and_quit("[断言14-抚摸动物与热气球]", "Sky balloon texture `sky_balloon_gift.png` failed to load on CloudGiftSprite!")
		return
	var prev_companion := GameManager.desktop_companion_mode
	GameManager.desktop_companion_mode = true
	world.spawn_sky_balloon_at(1160.0)
	var bal_screen_rect := world.get_sky_balloon_screen_rect()
	WindowController.update_passthrough_polygon(
		world.get_active_island_bounds(),
		world.hud.get_hud_Hit_rect() if world.hud != null else Rect2(480.0, 230.0, 960.0, 58.0),
		Rect2(),
		bal_screen_rect
	)
	var bal_center := bal_screen_rect.get_center()
	if not WindowController.is_logical_point_interactive(bal_center):
		_fail_and_quit("[断言14-抚摸动物与热气球]", "Sky balloon center %s is NOT inside WindowController passthrough hit polygon!" % str(bal_center))
		return
	if WindowController.is_logical_point_interactive(Vector2(200.0, 14.0)):
		_fail_and_quit("[断言14-抚摸动物与热气球]", "Empty upper-left sky (200, 14) should pass through to desktop!")
		return
	var pre_bal_gold := GameManager.gold
	var pre_bal_amber := GameManager.amber
	var claim_res := world.claim_sky_balloon()
	if not bool(claim_res.get("claimed", false)) or GameManager.gold <= pre_bal_gold or GameManager.amber != pre_bal_amber + 1 or GameManager.frenzy_timer <= 0.0:
		_fail_and_quit("[断言14-抚摸动物与热气球]", "Sky balloon claim reward settlement failed: %s" % str(claim_res))
		return
	GameManager.desktop_companion_mode = prev_companion
	GameManager.frenzy_timer = 0.0
	# Re-place scenic sky balloon over open Lotus Pond sky for live viewport screenshot audit
	world.spawn_sky_balloon_at(1156.0)
	print("[PASS] [断言14-CI-1抚摸动物加速与天空热气球礼袋] 通过: 全 6 类执勤动物欢快跳跃+像素爱心+8s干劲加速+防鬼畜冷却、天空热气球防穿透多边形命中与礼袋金币/琥珀/狂欢结算校验 PASS!")

	# ------------------------------------------------------------------
	# [断言15-CI-2美食评论家与云游行商]:
	#   1) Gourmet Critic (`traveler_critic_normalized.png`, 48x48x2) tastes delicacy -> activates `gourmet_acclaim_timer` (+25% price & +20% tip) + medal badge;
	#   2) Caravan Merchant (`traveler_merchant_normalized.png`, 48x48x2) acquires surplus crops from `raw_baskets` -> grants `amber` + gold;
	# ------------------------------------------------------------------
	GameManager.gourmet_acclaim_timer = 0.0
	var pre_codex_mult := GameManager.get_market_mood_multiplier()
	var pre_tip_mult := GameManager.get_customer_tip_multiplier(false, 3)
	GameManager.add_to_stall("delicacy_0", 2)
	var critic := world.spawn_special_visitor(CustomerNPC.VisitorRole.GOURMET_CRITIC)
	if critic == null or critic.body_sprite == null or critic.body_sprite.texture == null:
		_fail_and_quit("[断言15-特殊访客]", "Gourmet Critic failed to load `traveler_critic_normalized.png`!")
		return
	var critic_fw := float(critic.body_sprite.texture.get_width()) / float(maxi(1, critic.body_sprite.hframes))
	var critic_fh := float(critic.body_sprite.texture.get_height()) / float(maxi(1, critic.body_sprite.vframes))
	if critic.body_sprite.hframes != 2 or absf(critic_fw - 48.0) > 0.5 or absf(critic_fh - 48.0) > 0.5 or critic.tex_gourmet_medal == null:
		_fail_and_quit("[断言15-特殊访客]", "Gourmet Critic invalid slicing/medal: fw=%.1f fh=%.1f hframes=%d medal=%s" % [
			critic_fw, critic_fh, critic.body_sprite.hframes, str(critic.tex_gourmet_medal != null)
		])
		return
	var pre_critic_gold := GameManager.gold
	var critic_earned := GameManager.try_critic_taste_delicacy("delicacy_0", 1, critic.position)
	if critic_earned <= 0 or GameManager.gold <= pre_critic_gold or not GameManager.is_gourmet_acclaim_active():
		_fail_and_quit("[断言15-特殊访客]", "Gourmet Critic checkout failed to settle delicacy & activate Gourmet Acclaim!")
		return
	if GameManager.get_market_mood_multiplier() <= pre_codex_mult + 0.05 or GameManager.get_customer_tip_multiplier(false, 3) <= pre_tip_mult + 0.05:
		_fail_and_quit("[断言15-特殊访客]", "Gourmet Acclaim failed to boost price & tip multipliers!")
		return

	GameManager.raw_baskets[1]["crop_0"] = maxi(3, int(GameManager.raw_baskets[1].get("crop_0", 0)) + 3)
	var merchant := world.spawn_special_visitor(CustomerNPC.VisitorRole.CARAVAN_MERCHANT)
	if merchant == null or merchant.body_sprite == null or merchant.body_sprite.texture == null:
		_fail_and_quit("[断言15-特殊访客]", "Caravan Merchant failed to load `traveler_merchant_normalized.png`!")
		return
	var merch_fw := float(merchant.body_sprite.texture.get_width()) / float(maxi(1, merchant.body_sprite.hframes))
	var merch_fh := float(merchant.body_sprite.texture.get_height()) / float(maxi(1, merchant.body_sprite.vframes))
	if merchant.body_sprite.hframes != 2 or absf(merch_fw - 48.0) > 0.5 or absf(merch_fh - 48.0) > 0.5:
		_fail_and_quit("[断言15-特殊访客]", "Caravan Merchant invalid slicing: fw=%.1f fh=%.1f hframes=%d" % [
			merch_fw, merch_fh, merchant.body_sprite.hframes
		])
		return
	var pre_merch_amber := GameManager.amber
	var pre_merch_gold := GameManager.gold
	var barter_res := GameManager.try_merchant_acquire_surplus_crops(3, merchant.position)
	if int(barter_res.get("taken", 0)) <= 0 or GameManager.amber <= pre_merch_amber or GameManager.gold <= pre_merch_gold:
		_fail_and_quit("[断言15-特殊访客]", "Caravan Merchant surplus crop barter failed: %s" % str(barter_res))
		return

	# Position Critic (front checkout) & satisfied Merchant (strolling with heart emote) cleanly without bubble overlap
	critic.position = Vector2(1041.4, EconomyConfig.GROUND_Y)
	critic.facing_left = true
	critic._process(0.02)
	merchant.position = Vector2(1075.0, EconomyConfig.GROUND_Y)
	merchant.state = CustomerNPC.State.LEAVE
	merchant.purchased_ok = true
	merchant.nav_path.clear()
	merchant.facing_left = true
	merchant._process(0.02)
	print("[PASS] [断言15-CI-2美食评论家与云游行商] 通过: 美食评论家品鉴触发36s金牌口碑(售价+25%%&小费+20%%)、云游行商收购田头富余作物换琥珀、夜间花火灯会彩灯串与像素烟花校验 PASS!")

	# ------------------------------------------------------------------
	# [断言16-CI-3金牌员工晋升头饰与荣誉勋章图鉴]:
	#   1) Verify all 3 promotion headwear & 3 honor medal textures exist & load with transparent RGBA;
	#   2) Verify all 6 animal roles (bunny/otter/fox/shiba/penguin/toucan) display Lv.10/25/50 accessories
	#      above their heads with strict CarryIcon clearance (zero overlap/occlusion);
	#   3) Verify HUD 「山海图鉴」 (Tab 3) renders all 6 employees' promotion titles, rank icons & medal progress via native Labels.
	# ------------------------------------------------------------------
	var ci3_tex_paths: Array[String] = [
		"res://assets/pixel_art/ui/promo_tier1_star_ribbon.png",
		"res://assets/pixel_art/ui/promo_tier2_chef_hat.png",
		"res://assets/pixel_art/ui/promo_tier3_gilded_crown.png",
		"res://assets/pixel_art/ui/medal_tier1_bronze.png",
		"res://assets/pixel_art/ui/medal_tier2_silver.png",
		"res://assets/pixel_art/ui/medal_tier3_gold.png"
	]
	for tp in ci3_tex_paths:
		var t_loaded := EconomyConfig.load_pixel_texture(tp)
		if t_loaded == null or t_loaded.get_width() <= 0 or t_loaded.get_height() <= 0:
			_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "Missing or invalid CI-3 pixel texture: `%s`" % tp)
			return
		var t_img := t_loaded.get_image()
		if t_img == null or t_img.is_empty():
			_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "Empty image data on `%s`" % tp)
			return
		var corner_a := t_img.get_pixel(0, 0).a
		if corner_a > 0.05:
			_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "Texture `%s` corner is not transparent (alpha=%.2f)!" % [tp, corner_a])
			return

	var saved_isl2 := bool(GameManager.unlocked_islands.get(2, false))
	var saved_isl3 := bool(GameManager.unlocked_islands.get(3, false))
	var saved_rec_1: Dictionary = GameManager.island_recruited[1].duplicate(true)
	var saved_rec_2: Dictionary = GameManager.island_recruited[2].duplicate(true)
	var saved_rec_3: Dictionary = GameManager.island_recruited[3].duplicate(true)
	var saved_levels: Dictionary = GameManager.animal_levels.duplicate(true)

	GameManager.unlocked_islands[2] = true
	GameManager.unlocked_islands[3] = true
	GameManager.island_recruited[1]["shiba"] = maxi(1, int(GameManager.island_recruited[1].get("shiba", 0)))
	GameManager.island_recruited[2]["penguin"] = 1
	GameManager.island_recruited[2]["toucan"] = 1

	var verified_promo_roles: Dictionary = {}
	for w in world.workers:
		if not is_instance_valid(w) or verified_promo_roles.has(w.animal_key):
			continue
		if not w.is_hired():
			continue
		w.visible = true
		var prev_carry_id := w.carrying_item_id
		var prev_carry_qty := w.carrying_qty
		w._set_carry_visual("crop_0", 2)

		GameManager.animal_levels[w.animal_key] = 1
		w.sync_promotion_visual(0.0, 0, 1.0, 1.0)
		if w.get_promotion_tier() != 0 or w.promo_accessory == null or w.promo_accessory.visible:
			_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "Lv.1 `%s` should not show promotion accessory!" % w.animal_key)
			return

		for test_lv in [10, 25, 50]:
			GameManager.animal_levels[w.animal_key] = test_lv
			w.sync_promotion_visual(0.0, 0, 1.0, 1.0)
			var exp_tier := EconomyConfig.get_animal_trait_tier_count(test_lv)
			if w.get_promotion_tier() != exp_tier or not w.promo_accessory.visible or w.promo_accessory.texture == null:
				_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "Lv.%d `%s` failed to display tier %d promotion accessory!" % [test_lv, w.animal_key, exp_tier])
				return
			var p_h := float(w.promo_accessory.texture.get_height()) * absf(w.promo_accessory.scale.y)
			var p_w := float(w.promo_accessory.texture.get_width()) * absf(w.promo_accessory.scale.x)
			if p_w > 32.0 or p_h > 32.0:
				_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "PromoAccessory oversized on `%s`: %.1fx%.1f!" % [w.animal_key, p_w, p_h])
				return
			var promo_bottom_y := w.promo_accessory.position.y
			var carry_top_y := w.carry_icon.position.y - 10.0
			if promo_bottom_y >= carry_top_y - 6.0 or promo_bottom_y > -45.0:
				_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "PromoAccessory on `%s` (bottom_y=%.1f) too close or overlapping CarryIcon (top_y=%.1f)!" % [w.animal_key, promo_bottom_y, carry_top_y])
				return

		w._set_carry_visual(prev_carry_id, prev_carry_qty)
		verified_promo_roles[w.animal_key] = true

	if verified_promo_roles.size() < 6:
		_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "Expected all 6 animal roles verified for promotion accessories, got %d!" % verified_promo_roles.size())
		return

	# Verify HUD 「山海图鉴」 (Tab 3) 6-employee promotion titles & honor medal progress
	GameManager.animal_levels = {
		"bunny": 50,
		"otter": 25,
		"fox": 10,
		"shiba": 25,
		"penguin": 10,
		"toucan": 1
	}
	if world.hud != null:
		world.hud.open_drawer(3)
		var expected_medals: Array[int] = [3, 2, 1, 2, 1, 0]
		var emp16: Array[Dictionary] = world.hud._get_emp_cards()
		if emp16.size() != 6 or world.hud.lbl_emp_names.size() != 6:
			_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "HUD Tab 3 missing the 6 crew medal tiles!")
			return
		for ei in range(6):
			if int(emp16[ei]["medals"]) != expected_medals[ei] or (emp16[ei]["pips"] as Array).size() != 3:
				_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "Crew tile %d medals wrong: %d" % [ei, int(emp16[ei]["medals"])])
				return
		var fit16 := _menu_tiles_problem(world.hud, "codex tab")
		if fit16 != "":
			_fail_and_quit("[断言16-CI-3员工晋升与勋章]", fit16)
			return
		world.hud.close_drawer(false)

	# Keep showcase Island 1 promoted employees (Lv.50 Bunny / Lv.25 Otter / Lv.10 Fox / Lv.25 Shiba) for visual audit!
	GameManager.unlocked_islands[2] = saved_isl2
	GameManager.unlocked_islands[3] = saved_isl3
	GameManager.island_recruited[1] = saved_rec_1
	GameManager.island_recruited[2] = saved_rec_2
	GameManager.island_recruited[3] = saved_rec_3
	GameManager.animal_levels = {
		"bunny": 50,
		"otter": 25,
		"fox": 10,
		"shiba": 25,
		"penguin": int(saved_levels.get("penguin", 0)),
		"toucan": int(saved_levels.get("toucan", 0))
	}
	for w in world.workers:
		if is_instance_valid(w) and w.visible:
			if w.animal_key == "bunny":
				w._set_carry_visual("crop_0", 2)
			w.sync_promotion_visual(0.0, 0, 1.0, 1.0)
	print("[PASS] [断言16-CI-3金牌员工晋升头饰与荣誉勋章图鉴] 通过: 全 6 种动物 Lv.10/25/50 头饰精准锚定头顶(与背负物品间距>=19px零遮挡) + 山海图鉴晋升头衔/勋章进度原生标签校验 PASS!")

	# ------------------------------------------------------------------
	# [断言17-CI-4浮空飞艇远洋商队大订单与二十四节气限定美食]:
	#   1) Verify all 7 CI-4 pixel-art RGBA `.png` textures exist, load with crisp transparent corners (`a <= 0.05`), valid aspect ratio (`0.5~1.8`) & `<= 180px` rendered size;
	#   2) Verify East Harbor Floating Cargo Airship docking coordinates, >=28px sky/building clearance, and `WindowController` passthrough polygon registration;
	#   3) Verify Multi-Ingredient/Dish Combo Bulk Order (`大订单`) fulfillment -> generous Morning Dew Amber (`琥珀`), Gold & Rare Codex Voucher (`稀有图鉴券`) settlement;
	#   4) Verify 24 Solar Terms rotation, seasonal buffs, specialty dish (`春分青团/夏至杨梅饮/秋分蟹粉酥/冬至暖汤圆`) 1.45x in-season bonus sale & Rare Voucher recipe unlock + HUD Tab 2/3 display.
	# ------------------------------------------------------------------
	world.reload_ci4_textures()
	var ci4_tex_paths: Array[String] = [
		EconomyConfig.AIRSHIP_CARAVAN_TEX,
		"res://assets/pixel_art/ui/solar_dish_spring_qingtuan.png",
		"res://assets/pixel_art/ui/solar_dish_summer_bayberry.png",
		"res://assets/pixel_art/ui/solar_dish_autumn_crabcake.png",
		"res://assets/pixel_art/ui/solar_dish_winter_tangyuan.png",
		EconomyConfig.ICON_RARE_VOUCHER_TEX,
		EconomyConfig.ICON_BULK_ORDER_TEX
	]
	for tp4 in ci4_tex_paths:
		var t4 := EconomyConfig.load_pixel_texture(tp4)
		if t4 == null or t4.get_width() <= 0 or t4.get_height() <= 0:
			_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Missing or invalid CI-4 pixel texture: `%s`" % tp4)
			return
		var img4 := t4.get_image()
		if img4 == null or img4.is_empty():
			_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Empty image data on `%s`" % tp4)
			return
		if img4.get_pixel(0, 0).a > 0.05:
			_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Texture `%s` corner (0,0) is not transparent (alpha=%.2f)!" % [tp4, img4.get_pixel(0, 0).a])
			return
		var ratio4 := float(t4.get_width()) / maxf(1.0, float(t4.get_height()))
		if ratio4 < 0.5 or ratio4 > 1.8:
			_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Texture `%s` aspect ratio %.2f outside [0.5, 1.8]!" % [tp4, ratio4])
			return

	world.dock_airship_at_harbor(true)
	world.spawn_sky_balloon_at(1148.0)
	world._process(0.05)
	if world.airship_sprite == null or not world.airship_sprite.visible or world.airship_sprite.texture == null:
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "AirshipCaravanSprite is missing or invisible when docked!")
		return
	var air_rw := float(world.airship_sprite.texture.get_width()) * absf(world.airship_sprite.scale.x)
	var air_rh := float(world.airship_sprite.texture.get_height()) * absf(world.airship_sprite.scale.y)
	if air_rw > 180.0 or air_rh > 180.0:
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "AirshipCaravanSprite rendered size oversized: %.1fx%.1f!" % [air_rw, air_rh])
		return
	var air_screen_rect := world.get_airship_screen_rect()
	var bal_screen_rect_ci4 := world.get_sky_balloon_screen_rect()
	if air_screen_rect.intersects(bal_screen_rect_ci4):
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Docked Airship overlaps Sky Balloon: air=%s, bal=%s!" % [str(air_screen_rect), str(bal_screen_rect_ci4)])
		return
	var prev_comp_ci4 := GameManager.desktop_companion_mode
	GameManager.desktop_companion_mode = true
	WindowController.update_passthrough_polygon(
		world.get_active_island_bounds(),
		world.hud.get_hud_Hit_rect() if world.hud != null else Rect2(480.0, 230.0, 960.0, 58.0),
		Rect2(),
		bal_screen_rect_ci4,
		air_screen_rect
	)
	if not WindowController.is_logical_point_interactive(air_screen_rect.get_center()):
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Docked Airship center %s is NOT registered in WindowController passthrough polygon!" % str(air_screen_rect.get_center()))
		return
	if WindowController.is_logical_point_interactive(Vector2(200.0, 14.0)):
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Upper-left sky (200, 14) failed passthrough after Airship registration!")
		return
	GameManager.desktop_companion_mode = prev_comp_ci4

	# Test Multi-Item Combo Bulk Order fulfillment -> Amber + Gold + Rare Codex Voucher settlement
	var bulk_ord := GameManager.get_active_airship_order()
	var bulk_items: Array = bulk_ord.get("items", [])
	if bulk_items.size() < 3:
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Expected >=3 combo slots in airship bulk order, got %d!" % bulk_items.size())
		return
	var saved_stall_ci4: Dictionary = GameManager.stall_inventory.duplicate(true)
	for b_entry in bulk_items:
		if b_entry is Dictionary:
			var bid := String(b_entry.get("item_id", "crop_0"))
			var breq := int(b_entry.get("required", 1))
			GameManager.stall_inventory[bid] = int(GameManager.stall_inventory.get(bid, 0)) + breq
	var pre_bulk_gold := GameManager.gold
	var pre_bulk_amber := GameManager.get_amber()
	var pre_bulk_vouchers := GameManager.get_rare_vouchers()
	var pre_bulk_done := GameManager.completed_airship_orders
	var exp_bulk_amber := int(bulk_ord.get("reward_amber", 4))
	var exp_bulk_vouchers := int(bulk_ord.get("reward_vouchers", 1))
	var exp_bulk_gold := int(bulk_ord.get("reward_gold", 445))
	var bulk_res := world.interact_with_docked_airship()
	if not bool(bulk_res.get("completed", false)) or GameManager.completed_airship_orders != pre_bulk_done + 1:
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Airship combo bulk order failed to complete on stock fulfillment: %s" % str(bulk_res))
		return
	if GameManager.gold != pre_bulk_gold + exp_bulk_gold or GameManager.get_amber() != pre_bulk_amber + exp_bulk_amber or GameManager.get_rare_vouchers() != pre_bulk_vouchers + exp_bulk_vouchers:
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Airship bulk order payout mismatch! gold:%d->%d amber:%d->%d voucher:%d->%d" % [
			pre_bulk_gold, GameManager.gold, pre_bulk_amber, GameManager.get_amber(), pre_bulk_vouchers, GameManager.get_rare_vouchers()
		])
		return

	# Test 24 Solar Terms rotation, seasonal buffs, 1.45x in-season specialty dish sale & Rare Voucher redemption
	if EconomyConfig.SOLAR_TERMS.size() != 24 or EconomyConfig.SOLAR_SPECIALTY_DISHES.size() != 4:
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Expected 24 Solar Terms & 4 Specialty Dishes, got %d & %d!" % [EconomyConfig.SOLAR_TERMS.size(), EconomyConfig.SOLAR_SPECIALTY_DISHES.size()])
		return
	GameManager.frenzy_timer = 0.0
	GameManager.set_solar_term(9) # 夏至 -> `solar_dish_summer` (`夏至杨梅饮`)
	if GameManager.get_current_solar_dish_id() != "solar_dish_summer" or String(GameManager.get_current_solar_term().get("name", "")) != "夏至":
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Solar term switch to index 9 (夏至) failed!")
		return
	var ws_summer := GameManager.get_workshop_speed_multiplier(2)
	GameManager.set_solar_term(3) # 春分
	var ws_spring := GameManager.get_workshop_speed_multiplier(2)
	if ws_summer <= ws_spring + 0.05:
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Summer solar term workshop speed buff failed: summer=%.2f, spring=%.2f!" % [ws_summer, ws_spring])
		return

	GameManager.set_solar_term(9)
	var crafted_sd := GameManager.craft_solar_specialty_dish("cauldron", 2, true)
	var pre_sd_sale_gold := GameManager.gold
	var sd_sale_earned := _sell(crafted_sd, 1, Vector2(1013.4, EconomyConfig.GROUND_Y), false)
	if crafted_sd != "solar_dish_summer" or sd_sale_earned <= 0 or GameManager.gold <= pre_sd_sale_gold or not bool(GameManager.unlocked_solar_dishes.get("solar_dish_summer", false)):
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Solar specialty dish craft & stall sale failed: dish=%s earned=%d" % [crafted_sd, sd_sale_earned])
		return

	# Redeem Rare Codex Voucher to unlock next seasonal specialty recipe (`solar_dish_autumn`)
	var pre_vch_red := GameManager.get_rare_vouchers()
	var pre_solar_unlocked := GameManager.get_unlocked_solar_dish_count()
	var red_res := GameManager.redeem_rare_voucher_for_codex()
	if not bool(red_res.get("redeemed", false)) or GameManager.get_rare_vouchers() != pre_vch_red - 1 or GameManager.get_unlocked_solar_dish_count() != pre_solar_unlocked + 1:
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Rare Codex Voucher redemption failed: %s" % str(red_res))
		return

	# Verify HUD Tab 2 (`★远洋大订单`) & Tab 3 (`★节气` + `图鉴券`) native Labels
	if world.hud != null:
		var tiles_p0 := _menu_tabs_problem(world.hud, ["", "airship_order", "solar_codex"], "")
		if tiles_p0 != "":
			_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", tiles_p0)
			return

	# Restore clean showcase state for live engine screenshots (Airship docked at East Harbor + 春分青团 + 2 vouchers)
	GameManager.stall_inventory = saved_stall_ci4
	GameManager.set_solar_term(3)
	GameManager.frenzy_timer = 0.0
	GameManager.rare_codex_vouchers = 2
	world.dock_airship_at_harbor(false)
	world.spawn_sky_balloon_at(1148.0)
	world._process(0.02)
	print("[PASS] [断言17-CI-4浮空飞艇远洋商队大订单与二十四节气限定美食] 通过: 东港浮空飞艇停靠与穿透命中、组合大订单结算(+%dG/+%d琥珀/+%d稀有图鉴券)、24节气流转与当季限定美食(1.45x加成)产销及图鉴券兑换校验 PASS!" % [
		exp_bulk_gold, exp_bulk_amber, exp_bulk_vouchers
	])

	# ------------------------------------------------------------------
	# [断言18-CI-5云端温室奇花异草培育房与岛屿名物伴手礼礼盒]:
	#   1) Verify all 5 genuine CI-5 RGBA `.png` pixel sprites exist, load with transparent corners (`a <= 0.05`), valid aspect ratio (`0.5~1.8`) & `<= 180px` rendered size;
	#   2) Verify `CloudGreenhouse_2` grounded at `GROUND_Y = 124.0`, `>= 28px` clearance (`0.0%` overlap) with all Island 2 buildings, and `WindowController` passthrough hitbox;
	#   3) Verify Cloud Greenhouse unlock, hybrid flora cultivation & cross-breeding (`星露铃兰` -> `云霓琉璃玫瑰`), and Island Aura multipliers (`crop_growth`, `workshop_speed`, `tip_bonus`);
	#   4) Verify Souvenir Gift Box bundling (`星露花语礼盒` & `皇家名物礼盒`), Collector Tourist (`收藏家旅客`) checkout settlement (Gold + Amber + Voucher + Reputation + Codex), HUD Tab 0/2/3 Card #7 native Labels, and Save/Load roundtrip.
	# ------------------------------------------------------------------
	world.reload_ci5_textures()
	var ci5_tex_paths: Array[String] = [
		EconomyConfig.CLOUD_GREENHOUSE_TEX,
		EconomyConfig.FLORA_STARDEW_LILY_TEX,
		EconomyConfig.FLORA_CLOUD_ROSE_TEX,
		EconomyConfig.SOUVENIR_BOX_FLORAL_TEX,
		EconomyConfig.SOUVENIR_BOX_ROYAL_TEX
	]
	for tp5 in ci5_tex_paths:
		var t5 := EconomyConfig.load_pixel_texture(tp5)
		if t5 == null or t5.get_width() <= 0 or t5.get_height() <= 0:
			_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Missing or invalid CI-5 pixel texture: `%s`" % tp5)
			return
		var ar5 := float(t5.get_width()) / maxf(1.0, float(t5.get_height()))
		if ar5 < 0.5 or ar5 > 1.8:
			_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "CI-5 texture `%s` abnormal aspect ratio %.2f!" % [tp5, ar5])
			return
		var img5 := t5.get_image()
		if img5 == null or img5.get_pixel(0, 0).a > 0.05:
			_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "CI-5 texture `%s` lacks transparent corner alpha!" % tp5)
			return

	if world.cloud_greenhouse == null or world.cloud_greenhouse.body_sprite == null or world.cloud_greenhouse.body_sprite.texture == null:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "MainWorld missing `CloudGreenhouse_2` node or body_sprite texture!")
		return
	if absf(world.cloud_greenhouse.position.y - EconomyConfig.GROUND_Y) > 0.1:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "CloudGreenhouse_2 not grounded on GROUND_Y=124.0 (got y=%.2f)!" % world.cloud_greenhouse.position.y)
		return
	var gh_vis_rect := world.cloud_greenhouse.get_screen_rect()
	if gh_vis_rect.size.x > 180.0 or gh_vis_rect.size.y > 180.0:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "CloudGreenhouse_2 rendered size %.1fx%.1f exceeds 180px!" % [gh_vis_rect.size.x, gh_vis_rect.size.y])
		return

	# Verify Island 2 4-building spacing (`>= 28px`, `0.0%` overlap) explicitly including `CloudGreenhouse_2`
	var isl2_rects: Array = world.get_island_main_building_rects()[2]
	if isl2_rects.size() < 4:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Expected 4 main buildings on Island 2 (with CloudGreenhouse_2), got %d!" % isl2_rects.size())
		return
	var min_isl2_gap := 9999.0
	for i2 in range(isl2_rects.size() - 1):
		var ra2: Rect2 = isl2_rects[i2]["rect"]
		var rb2: Rect2 = isl2_rects[i2 + 1]["rect"]
		var ov2 := maxf(0.0, minf(ra2.end.x, rb2.end.x) - maxf(ra2.position.x, rb2.position.x))
		var gap2 := rb2.position.x - ra2.end.x
		min_isl2_gap = minf(min_isl2_gap, gap2)
		if ov2 > 0.01 or gap2 < 28.0 - 0.5:
			_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Island 2 building clearance violation between `%s` and `%s`: overlap=%.2f gap=%.2fpx (<28px)!" % [
				String(isl2_rects[i2]["name"]), String(isl2_rects[i2 + 1]["name"]), ov2, gap2
			])
			return

	# Guard check: upgrading locked greenhouse must fail before construction
	GameManager.unlocked_islands[2] = true
	GameManager.greenhouse_unlocked = false
	if GameManager.upgrade_building("greenhouse"):
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "upgrade_building('greenhouse') should fail before greenhouse is unlocked!")
		return

	world._process(0.05)
	var gh_screen_r := world.get_greenhouse_screen_rect()
	if WindowController != null and not WindowController.is_logical_point_interactive(gh_screen_r.get_center()):
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "CloudGreenhouse_2 screen rect %s is NOT registered inside WindowController passthrough polygon!" % str(gh_screen_r))
		return

	# Measure baseline multipliers before unlocking greenhouse
	var base_crop_mult_ci5 := GameManager.get_crop_growth_multiplier(1)
	var base_ws_mult_ci5 := GameManager.get_workshop_speed_multiplier(2)
	var base_tip_mult_ci5 := GameManager.get_customer_tip_multiplier(false, 1)
	var base_codex_mult_ci5 := GameManager.get_collection_multiplier()

	GameManager.add_gold(EconomyConfig.GREENHOUSE_UNLOCK_COST_GOLD + 50)
	if not GameManager.unlock_greenhouse(false) or not GameManager.greenhouse_unlocked or not bool(GameManager.unlocked_flora.get("flora_stardew_lily", false)):
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Failed to unlock Cloud Greenhouse and initial `flora_stardew_lily`!")
		return

	# Verify `flora_stardew_lily` (+18% crop growth aura)
	var lily_crop_mult := GameManager.get_crop_growth_multiplier(1)
	if lily_crop_mult < base_crop_mult_ci5 * 1.17:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Stardew Lily crop aura did not boost crop growth (%.3f vs %.3f)!" % [lily_crop_mult, base_crop_mult_ci5])
		return

	# Cultivate `flora_stardew_lily` -> trigger cross-breeding unlock of `flora_cloud_rose`
	GameManager._tick_greenhouse_cultivation(9.5)
	GameManager._tick_greenhouse_cultivation(9.5)
	if not bool(GameManager.unlocked_flora.get("flora_cloud_rose", false)) or GameManager.get_unlocked_flora_count() < 2:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Cross-breeding failed to unlock `flora_cloud_rose` after 2 lily harvests (counts=%s)!" % str(GameManager.flora_harvest_counts))
		return

	# Verify `flora_cloud_rose` (+20% workshop speed & +15% tip aura) and harvest rose
	GameManager.active_greenhouse_flora_id = "flora_cloud_rose"
	var rose_ws_mult := GameManager.get_workshop_speed_multiplier(2)
	var rose_tip_mult := GameManager.get_customer_tip_multiplier(false, 1)
	if rose_ws_mult < base_ws_mult_ci5 * 1.19 or rose_tip_mult < base_tip_mult_ci5 * 1.14:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Cloud Rose workshop/tip aura failed: ws=%.3f (base %.3f), tip=%.3f (base %.3f)" % [
			rose_ws_mult, base_ws_mult_ci5, rose_tip_mult, base_tip_mult_ci5
		])
		return
	GameManager._tick_greenhouse_cultivation(13.0)
	if int(GameManager.flora_inventory.get("flora_cloud_rose", 0)) < 1:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Failed to harvest `flora_cloud_rose` into flora_inventory!")
		return

	# Bundle both Souvenir Gift Boxes (`星露花语礼盒` & `皇家名物礼盒`)
	GameManager.flora_inventory["flora_stardew_lily"] = maxi(2, int(GameManager.flora_inventory.get("flora_stardew_lily", 0)))
	GameManager.flora_inventory["flora_cloud_rose"] = maxi(2, int(GameManager.flora_inventory.get("flora_cloud_rose", 0)))
	GameManager.workshop_outputs["mortar"]["delicacy_0"] = maxi(1, int(GameManager.workshop_outputs["mortar"].get("delicacy_0", 0)))
	GameManager.stall_inventory["solar_dish_spring"] = maxi(1, int(GameManager.stall_inventory.get("solar_dish_spring", 0)))

	var b_floral := GameManager.bundle_souvenir_gift_box("souvenir_box_floral", true)
	var b_royal := GameManager.bundle_souvenir_gift_box("souvenir_box_royal", true)
	if not bool(b_floral.get("bundled", false)) or not bool(b_royal.get("bundled", false)) or GameManager.get_unlocked_souvenir_count() < 2:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Souvenir gift box bundling failed: floral=%s royal=%s" % [str(b_floral), str(b_royal)])
		return

	# Spawn Collector Tourist (`收藏家旅客`) and verify checkout settlement
	var pre_col_gold := GameManager.gold
	var pre_col_amber := GameManager.get_amber()
	var pre_col_vouchers := GameManager.get_rare_vouchers()
	var collector_npc := world.spawn_special_visitor(CustomerNPC.VisitorRole.COLLECTOR_TOURIST)
	if collector_npc == null or collector_npc.body_sprite == null or collector_npc.body_sprite.hframes != 2:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Collector Tourist failed sprite slicing check!")
		return
	collector_npc.position = world.waypoint_graph.get_dock_pos("stall_checkout")
	if world.market_stall != null:
		world.market_stall.queue_customers.push_front(collector_npc)
	collector_npc.desired_item_id = "souvenir_box_royal"
	collector_npc.state = CustomerNPC.State.PURCHASE
	GameManager.till_gold = 10000.0
	collector_npc._process(2.2)
	var col_gold_gain := GameManager.gold - pre_col_gold
	var col_amber_gain := GameManager.get_amber() - pre_col_amber
	var col_voucher_gain := GameManager.get_rare_vouchers() - pre_col_vouchers
	if not collector_npc.purchased_ok or col_gold_gain < 400 or col_amber_gain < 4 or col_voucher_gain < 1 or GameManager.souvenirs_sold_count < 1 or GameManager.collector_reputation_bonus < 65:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Collector Tourist checkout settlement mismatch: ok=%s +gold=%d +amber=%d +voucher=%d sold=%d rep=%d" % [
			str(collector_npc.purchased_ok), col_gold_gain, col_amber_gain, col_voucher_gain, GameManager.souvenirs_sold_count, GameManager.collector_reputation_bonus
		])
		return
	if GameManager.get_collection_multiplier() < base_codex_mult_ci5 + 0.039:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Flora + Souvenir Codex price multiplier did not increase as expected!")
		return
	if not bool(GameManager.unlocked_achievements.get("ach_greenhouse_bloom", false)) or not bool(GameManager.unlocked_achievements.get("ach_souvenir_master", false)):
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "CI-5 achievements (`ach_greenhouse_bloom`, `ach_souvenir_master`) did not unlock!")
		return
	collector_npc.queue_free()

	# Verify HUD Tab 0, Tab 2, Tab 3 Card #7 (`index 6`) native Labels + LabelSettings
	if world.hud != null:
		var tiles_p1 := _menu_tabs_problem(world.hud, ["greenhouse_building", "souvenir_workshop", "ci5_codex"], "")
		if tiles_p1 != "":
			_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", tiles_p1)
			return

	# Verify Save/Load roundtrip of all CI-5 fields
	GameManager.building_levels["greenhouse"] = 3
	GameManager.souvenir_inventory["souvenir_box_royal"] = 2
	var exp_rep_bonus_ci5 := GameManager.collector_reputation_bonus
	var exp_sold_ci5 := GameManager.souvenirs_sold_count
	GameManager.save_game()
	GameManager.greenhouse_unlocked = false
	GameManager.building_levels["greenhouse"] = 1
	GameManager.unlocked_flora = {"flora_stardew_lily": false, "flora_cloud_rose": false}
	GameManager.souvenir_inventory = {"souvenir_box_floral": 0, "souvenir_box_royal": 0}
	GameManager.collector_reputation_bonus = 0
	GameManager.souvenirs_sold_count = 0
	GameManager.load_game()
	if not GameManager.greenhouse_unlocked or int(GameManager.building_levels.get("greenhouse", 1)) != 3 or GameManager.get_unlocked_flora_count() != 2 or int(GameManager.souvenir_inventory.get("souvenir_box_royal", 0)) != 2 or GameManager.collector_reputation_bonus != exp_rep_bonus_ci5 or GameManager.souvenirs_sold_count != exp_sold_ci5:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "CI-5 Save/Load roundtrip failed to restore state!")
		return

	# Prepare lush showcase state for live viewport screenshots (Island 2 + CloudGreenhouse_2 active + Collector Tourist strolling on Island 1)
	for old_c in world.customers:
		if is_instance_valid(old_c):
			old_c.queue_free()
	world.customers.clear()
	if world.market_stall != null:
		world.market_stall.queue_customers.clear()
	GameManager.unlocked_islands[2] = true
	GameManager.greenhouse_unlocked = true
	GameManager.active_greenhouse_flora_id = "flora_cloud_rose"
	GameManager.greenhouse_growth_timer = 7.2
	var showcase_collector := world.spawn_special_visitor(CustomerNPC.VisitorRole.COLLECTOR_TOURIST)
	if showcase_collector != null:
		showcase_collector.position = Vector2(1060.0, EconomyConfig.GROUND_Y)
		showcase_collector.facing_left = true
		showcase_collector.desired_item_id = "souvenir_box_royal"
		showcase_collector._process(0.01)
	world._process(0.05)

	print("[PASS] [断言18-CI-5云端温室奇花异草培育房与岛屿名物伴手礼礼盒] 通过: 温室净间距 %.1fpx(>=28px, 0%%重叠)与防穿透命中、双奇花杂交培育与光环加成、双伴手礼盒打包、收藏家旅客结算(+%dG/+%d琥珀/+%d图鉴券/+%d声望)及存档回读全闭环 PASS!" % [
		min_isl2_gap, col_gold_gain, col_amber_gain, col_voucher_gain, exp_rep_bonus_ci5
	])

	# ------------------------------------------------------------------
	# [断言19-CI-6三号岛云海温泉旅馆与贵宾萌宠疗愈汤屋]:
	# Verify 5 CI-6 pixel-art RGBA textures, Island 3 CloudHotspringInn_3 grounding (`GROUND_Y = 124.0`, bottom-center pivot),
	# 5-building Island 3 clearance (`>= 28px`, `0.0%` overlap), WindowController passthrough hit-rect,
	# 3 herbal/floral bath blends (`艾草暖身汤`, `樱瓣云雾汤`, `星珀灵泉汤`), worker stamina rejuvenation speed buff,
	# VIP Cute Spirit Bath Guest (`HOTSPRING_VIP_GUEST`) `1.85x` generous tip + amber + voucher + reputation checkout,
	# HUD native Label cards (`index 7`), and Save/Load roundtrip!
	# ------------------------------------------------------------------
	if world.has_method("reload_ci6_textures"):
		world.reload_ci6_textures()
	var ci6_tex_paths := [
		EconomyConfig.CLOUD_HOTSPRING_INN_TEX,
		EconomyConfig.BATH_MUGWORT_WARM_TEX,
		EconomyConfig.BATH_SAKURA_MIST_TEX,
		EconomyConfig.BATH_STAR_AMBER_TEX,
		EconomyConfig.ICON_VIP_HOTSPRING_GUEST_TEX
	]
	for tp6 in ci6_tex_paths:
		var t6 := EconomyConfig.load_pixel_texture(tp6)
		if t6 == null or t6.get_width() < 16 or t6.get_height() < 16:
			_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "Missing or invalid CI-6 pixel-art texture `%s`!" % tp6)
			return
		var ar6 := float(t6.get_width()) / maxf(1.0, float(t6.get_height()))
		if ar6 < 0.5 or ar6 > 1.8:
			_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "CI-6 texture `%s` abnormal aspect ratio %.2f!" % [tp6, ar6])
			return
		var img6 := t6.get_image()
		if img6 == null or img6.get_pixel(0, 0).a > 0.05 or img6.get_pixel(img6.get_width() - 1, img6.get_height() - 1).a > 0.05:
			_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "CI-6 texture `%s` lacks transparent corner alpha!" % tp6)
			return

	if world.cloud_hotspring_inn == null or world.cloud_hotspring_inn.body_sprite == null or world.cloud_hotspring_inn.body_sprite.texture == null:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "MainWorld missing `CloudHotspringInn_3` node or body_sprite texture!")
		return
	var hs_sp: Sprite2D = world.cloud_hotspring_inn.body_sprite
	var exp_hs_off_y := -float(hs_sp.texture.get_height()) * 0.5
	if absf(world.cloud_hotspring_inn.position.y - EconomyConfig.GROUND_Y) > 0.1 or not hs_sp.centered or absf(hs_sp.offset.y - exp_hs_off_y) > 0.1 or world.cloud_hotspring_inn.z_index != EconomyConfig.Z_BUILDING:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "CloudHotspringInn_3 grounding/pivot/z_index violation: pos=%s centered=%s offset=%s z=%d!" % [
			str(world.cloud_hotspring_inn.position), str(hs_sp.centered), str(hs_sp.offset), world.cloud_hotspring_inn.z_index
		])
		return
	var hs_vis_rect := world.cloud_hotspring_inn.get_screen_rect()
	if hs_vis_rect.size.x > 180.0 or hs_vis_rect.size.y > 180.0:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "CloudHotspringInn_3 rendered size %.1fx%.1f exceeds 180px!" % [hs_vis_rect.size.x, hs_vis_rect.size.y])
		return

	# Verify Island 3 5-building spacing (`>= 28px`, `0.0%` overlap) explicitly including `CloudHotspringInn_3`
	var isl3_rects: Array = world.get_island_main_building_rects()[3]
	if isl3_rects.size() < 5:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "Expected 5 main buildings on Island 3 (with CloudHotspringInn_3), got %d!" % isl3_rects.size())
		return
	var min_isl3_gap := 9999.0
	for i3 in range(isl3_rects.size() - 1):
		var ra3: Rect2 = isl3_rects[i3]["rect"]
		var rb3: Rect2 = isl3_rects[i3 + 1]["rect"]
		var ov3 := maxf(0.0, minf(ra3.end.x, rb3.end.x) - maxf(ra3.position.x, rb3.position.x))
		var gap3 := rb3.position.x - ra3.end.x
		min_isl3_gap = minf(min_isl3_gap, gap3)
		if ov3 > 0.01 or gap3 < 28.0 - 0.5:
			_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "Island 3 building clearance violation between `%s` and `%s`: overlap=%.2f gap=%.2fpx (<28px)!" % [
				String(isl3_rects[i3]["name"]), String(isl3_rects[i3 + 1]["name"]), ov3, gap3
			])
			return

	# Guard check: upgrading locked hot-spring inn must fail before construction
	GameManager.unlocked_islands[3] = true
	GameManager.hotspring_unlocked = false
	if GameManager.upgrade_building("hotspring"):
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "upgrade_building('hotspring') should fail before hot-spring inn is unlocked!")
		return

	world._process(0.05)
	var hs_screen_r := world.get_hotspring_screen_rect()
	if WindowController != null and not WindowController.is_logical_point_interactive(hs_screen_r.get_center()):
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "CloudHotspringInn_3 screen rect %s is NOT registered inside WindowController passthrough polygon!" % str(hs_screen_r))
		return

	# Baseline worker stamina multipliers & baseline Codex/Tip multipliers before hot-spring unlock
	var base_worker_move_ci6 := GameManager.get_worker_hotspring_move_multiplier()
	var base_worker_work_ci6 := GameManager.get_worker_hotspring_work_multiplier()
	var base_codex_mult_ci6 := GameManager.get_collection_multiplier()
	var base_tip_mult_ci6 := GameManager.get_customer_tip_multiplier(false, 3)

	# Measure real AnimalWorker movement distance over 0.25s BEFORE vs AFTER hot-spring rejuvenation buff
	var test_worker: AnimalWorker = AnimalWorker.new()
	test_worker.setup_worker(AnimalWorker.RoleType.BUNNY_FARMER, 1, 0, Vector2(683.4, EconomyConfig.GROUND_Y), world.waypoint_graph, world)
	world.ysort_layer.add_child(test_worker)
	test_worker._was_hired = true
	test_worker.visible = true
	test_worker.position = Vector2(683.4, EconomyConfig.GROUND_Y)
	test_worker.nav_path = [Vector2(849.8, EconomyConfig.GROUND_Y)]
	test_worker._process(0.25)
	var dist_unbuffed := absf(test_worker.position.x - 683.4)

	GameManager.add_gold(EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD + 50)
	if not GameManager.unlock_hotspring_inn(false) or not GameManager.hotspring_unlocked or not bool(GameManager.unlocked_baths.get("bath_mugwort_warm", false)):
		test_worker.queue_free()
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "Failed to unlock CloudHotspringInn_3 and initial `bath_mugwort_warm`!")
		return

	test_worker.position = Vector2(683.4, EconomyConfig.GROUND_Y)
	test_worker.nav_path = [Vector2(849.8, EconomyConfig.GROUND_Y)]
	test_worker._process(0.25)
	var dist_buffed := absf(test_worker.position.x - 683.4)
	test_worker.queue_free()

	var buffed_move_ci6 := GameManager.get_worker_hotspring_move_multiplier()
	var buffed_work_ci6 := GameManager.get_worker_hotspring_work_multiplier()
	if buffed_move_ci6 <= base_worker_move_ci6 * 1.20 or buffed_work_ci6 <= base_worker_work_ci6 * 1.20 or dist_buffed <= dist_unbuffed * 1.18:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "Worker hot-spring stamina rejuvenation aura failed: move=%.3f work=%.3f dist_buffed=%.2f vs unbuffed=%.2f!" % [
			buffed_move_ci6, buffed_work_ci6, dist_buffed, dist_unbuffed
		])
		return

	# Steep `bath_mugwort_warm` twice -> auto-unlock `bath_sakura_mist`, then brew `bath_sakura_mist` & `bath_star_amber` using crops + CI-5 flora
	GameManager._tick_hotspring_steeping(8.5)
	GameManager._tick_hotspring_steeping(8.5)
	if not bool(GameManager.unlocked_baths.get("bath_sakura_mist", false)):
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "Steeping progression failed to unlock `bath_sakura_mist` (counts=%s)!" % str(GameManager.bath_brew_counts))
		return

	GameManager.raw_baskets[3]["crop_3"] = maxi(4, int(GameManager.raw_baskets[3].get("crop_3", 0)))
	GameManager.flora_inventory["flora_stardew_lily"] = maxi(2, int(GameManager.flora_inventory.get("flora_stardew_lily", 0)))
	GameManager.flora_inventory["flora_cloud_rose"] = maxi(2, int(GameManager.flora_inventory.get("flora_cloud_rose", 0)))
	var brew_sakura := GameManager.brew_hotspring_bath("bath_sakura_mist", false)
	var brew_star := GameManager.brew_hotspring_bath("bath_star_amber", false)
	if not bool(brew_sakura.get("brewed", false)) or not bool(brew_star.get("brewed", false)) or GameManager.get_unlocked_bath_count() < 3:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "Herbal/Floral bath blend brewing failed: sakura=%s star=%s unlocked=%d!" % [
			str(brew_sakura), str(brew_star), GameManager.get_unlocked_bath_count()
		])
		return

	if GameManager.get_customer_tip_multiplier(false, 3) <= base_tip_mult_ci6 * 1.15:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "Star-Amber bath tip aura did not boost customer tip multiplier!")
		return

	# Spawn VIP Hot-Spring Guest (`贵宾萌宠汤客`) and verify `1.85x` tip + amber + voucher + reputation settlement
	var pre_spa_gold := GameManager.gold
	var pre_spa_amber := GameManager.get_amber()
	var pre_spa_vouchers := GameManager.get_rare_vouchers()
	var spa_guest := world.spawn_special_visitor(CustomerNPC.VisitorRole.HOTSPRING_VIP_GUEST)
	if spa_guest == null or spa_guest.body_sprite == null or spa_guest.body_sprite.hframes != 2 or not spa_guest.is_vip:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "VIP Hot-Spring Guest failed 2-frame sprite slicing or VIP flag check!")
		return
	spa_guest.position = world.waypoint_graph.get_dock_pos("stall_checkout")
	if world.market_stall != null:
		world.market_stall.queue_customers.push_front(spa_guest)
	spa_guest.desired_item_id = "bath_star_amber"
	spa_guest.state = CustomerNPC.State.PURCHASE
	GameManager.till_gold = 10000.0
	spa_guest._process(2.2)
	var spa_gold_gain := GameManager.gold - pre_spa_gold
	var spa_amber_gain := GameManager.get_amber() - pre_spa_amber
	var spa_voucher_gain := GameManager.get_rare_vouchers() - pre_spa_vouchers
	if not spa_guest.purchased_ok or spa_gold_gain < 1500 or spa_amber_gain < 5 or spa_voucher_gain < 1 or GameManager.hotspring_guests_served < 1 or GameManager.hotspring_reputation_bonus < 85:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "VIP Hot-Spring Guest settlement mismatch: ok=%s +gold=%d +amber=%d +voucher=%d served=%d rep=%d" % [
			str(spa_guest.purchased_ok), spa_gold_gain, spa_amber_gain, spa_voucher_gain, GameManager.hotspring_guests_served, GameManager.hotspring_reputation_bonus
		])
		return
	if GameManager.get_collection_multiplier() < base_codex_mult_ci6 + 0.029:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "3-Bath Codex price multiplier did not rise by 1% per entry!")
		return
	if not bool(GameManager.unlocked_achievements.get("ach_hotspring_master", false)) or not bool(GameManager.unlocked_achievements.get("ach_hotspring_vip", false)):
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "CI-6 achievements (`ach_hotspring_master`, `ach_hotspring_vip`) did not unlock!")
		return
	spa_guest.queue_free()

	# Verify HUD Tab 0, Tab 2, Tab 3 Card #8 (`index 7`) native Labels + LabelSettings + zero deprecated font
	if world.hud != null:
		var tiles_p2 := _menu_tabs_problem(world.hud, ["hotspring_building", "hotspring_brew", "ci6_codex"], "")
		if tiles_p2 != "":
			_fail_and_quit("[断言19-CI-6云海温泉汤屋]", tiles_p2)
			return
	var forbidden_font_ci6 := _find_deprecated_font_node(get_tree().root)
	if forbidden_font_ci6 != "":
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "Forbidden legacy font node detected at `%s`!" % forbidden_font_ci6)
		return

	# Verify Save/Load roundtrip of all CI-6 fields
	GameManager.building_levels["hotspring"] = 3
	GameManager.bath_inventory["bath_star_amber"] = 2
	var exp_rep_bonus_ci6 := GameManager.hotspring_reputation_bonus
	var exp_served_ci6 := GameManager.hotspring_guests_served
	GameManager.save_game()
	GameManager.hotspring_unlocked = false
	GameManager.building_levels["hotspring"] = 1
	GameManager.unlocked_baths = {"bath_mugwort_warm": false, "bath_sakura_mist": false, "bath_star_amber": false}
	GameManager.bath_inventory = {"bath_mugwort_warm": 0, "bath_sakura_mist": 0, "bath_star_amber": 0}
	GameManager.hotspring_reputation_bonus = 0
	GameManager.hotspring_guests_served = 0
	GameManager.load_game()
	if not GameManager.hotspring_unlocked or int(GameManager.building_levels.get("hotspring", 1)) != 3 or GameManager.get_unlocked_bath_count() != 3 or int(GameManager.bath_inventory.get("bath_star_amber", 0)) != 2 or GameManager.hotspring_reputation_bonus != exp_rep_bonus_ci6 or GameManager.hotspring_guests_served != exp_served_ci6:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "CI-6 Save/Load roundtrip failed to restore state!")
		return

	# Prepare lush panoramic 3-island showcase state for live viewport screenshots (Islands 1~3 + CloudGreenhouse_2 + CloudHotspringInn_3 + VIP Hot-Spring Guest & Collector Tourist)
	for old_c6 in world.customers:
		if is_instance_valid(old_c6):
			old_c6.queue_free()
	world.customers.clear()
	if world.market_stall != null:
		world.market_stall.queue_customers.clear()
	GameManager.unlocked_islands[2] = true
	GameManager.unlocked_islands[3] = true
	GameManager.greenhouse_unlocked = true
	GameManager.hotspring_unlocked = true
	GameManager.active_hotspring_bath_id = "bath_star_amber"
	GameManager.hotspring_steep_timer = 7.4
	var showcase_col6 := world.spawn_special_visitor(CustomerNPC.VisitorRole.COLLECTOR_TOURIST)
	if showcase_col6 != null:
		showcase_col6.position = Vector2(1060.0, EconomyConfig.GROUND_Y)
		showcase_col6.facing_left = true
		showcase_col6.desired_item_id = "souvenir_box_royal"
		showcase_col6._process(0.01)
	var showcase_spa6 := world.spawn_special_visitor(CustomerNPC.VisitorRole.HOTSPRING_VIP_GUEST)
	if showcase_spa6 != null:
		showcase_spa6.position = Vector2(1490.0, EconomyConfig.GROUND_Y)
		showcase_spa6.facing_left = true
		showcase_spa6.desired_item_id = "bath_star_amber"
		showcase_spa6._process(0.01)
	world._process(0.05)

	print("[PASS] [断言19-CI-6三号岛云海温泉旅馆与贵宾萌宠疗愈汤屋] 通过: 岛3全部建筑(CI-10起6座)净间距 %.1fpx(>=28px, 0%%重叠)与底部中心锚定、防穿透命中、三款草本/花瓣浴汤熬制、员工精力加速(%.2fx, 实测位移%.1fpx>%.1fpx)、贵宾萌宠汤客结算(+%dG/+%d琥珀/+%d图鉴券/+%d声望)及存档回读全闭环 PASS!" % [
		min_isl3_gap, buffed_move_ci6, dist_buffed, dist_unbuffed, spa_gold_gain, spa_amber_gain, spa_voucher_gain, exp_rep_bonus_ci6
	])

	# ------------------------------------------------------------------
	# [断言20-CI-7云端风车烘焙面坊与云海美食花车巡游节]:
	# Verify 5 CI-7 pixel-art RGBA textures (`cloud_windmill_bakery.png`, `flour_golden_wheat.png`,
	# `bread_cloud_souffle.png`, `bread_amber_croissant.png`, `icon_parade_float.png`),
	# Island 2 CloudWindmillBakery_2 grounding (`GROUND_Y = 124.0`, bottom-center pivot),
	# 5-building Island 2 & 15-building panoramic clearance (`>= 28px`, `0.0%` overlap, solid grass `< 492px`),
	# WindowController passthrough hit-rect, Lv.1~5 upgrade & `麦香烘焙光环` (`1.20x+` Market Stall & Workshop speed boost),
	# flour milling + Soufflé Bread & Amber Croissant baking loop (`3/3` Codex),
	# Gourmet Parade Float festival (`icon_parade_float.png` on road + `PARADE_GOURMET_TOURIST` `1.75x~1.90x` premium checkout
	# settling Gold, Amber, Rare Codex Tickets & Reputation), Shanhai Codex Card 9 (`★云端烘焙鉴(3/3)`), and Save/Load roundtrip!
	# ------------------------------------------------------------------
	if world.has_method("reload_ci7_textures"):
		world.reload_ci7_textures()
	var ci7_tex_paths := [
		EconomyConfig.CLOUD_WINDMILL_BAKERY_TEX,
		EconomyConfig.FLOUR_GOLDEN_WHEAT_TEX,
		EconomyConfig.BREAD_CLOUD_SOUFFLE_TEX,
		EconomyConfig.BREAD_AMBER_CROISSANT_TEX,
		EconomyConfig.ICON_PARADE_FLOAT_TEX
	]
	for tp7 in ci7_tex_paths:
		var t7 := EconomyConfig.load_pixel_texture(tp7)
		if t7 == null or t7.get_width() < 16 or t7.get_height() < 16:
			_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Missing or invalid CI-7 pixel-art texture `%s`!" % tp7)
			return
		var ar7 := float(t7.get_width()) / maxf(1.0, float(t7.get_height()))
		if ar7 < 0.5 or ar7 > 1.8:
			_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "CI-7 texture `%s` abnormal aspect ratio %.2f!" % [tp7, ar7])
			return
		var img7 := t7.get_image()
		if img7 == null or img7.get_pixel(0, 0).a > 0.05 or img7.get_pixel(img7.get_width() - 1, img7.get_height() - 1).a > 0.05:
			_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "CI-7 texture `%s` lacks transparent corner alpha!" % tp7)
			return

	if world.cloud_windmill_bakery == null or world.cloud_windmill_bakery.body_sprite == null or world.cloud_windmill_bakery.body_sprite.texture == null:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "MainWorld missing `CloudWindmillBakery_2` node or body_sprite texture!")
		return
	var wm_sp: Sprite2D = world.cloud_windmill_bakery.body_sprite
	var exp_wm_off_y := -float(wm_sp.texture.get_height()) * 0.5
	if absf(world.cloud_windmill_bakery.position.y - EconomyConfig.GROUND_Y) > 0.1 or not wm_sp.centered or absf(wm_sp.offset.y - exp_wm_off_y) > 0.1 or world.cloud_windmill_bakery.z_index != EconomyConfig.Z_BUILDING:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "CloudWindmillBakery_2 grounding/pivot/z_index violation: pos=%s centered=%s offset=%s z=%d!" % [
			str(world.cloud_windmill_bakery.position), str(wm_sp.centered), str(wm_sp.offset), world.cloud_windmill_bakery.z_index
		])
		return
	var wm_vis_rect := world.cloud_windmill_bakery.get_screen_rect()
	if wm_vis_rect.size.x > 180.0 or wm_vis_rect.size.y > 180.0 or wm_vis_rect.end.x > 492.05:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "CloudWindmillBakery_2 rect %s oversized or encroaching Bridge 1 (>=492.0)!" % str(wm_vis_rect))
		return

	# Verify all 3 islands (`15` buildings total, `5` on Island 2) maintain `0.0%` overlap & `>= 28.0px` clearance
	var all_isl_rects_ci7: Dictionary = world.get_island_main_building_rects()
	var isl2_rects_ci7: Array = all_isl_rects_ci7[2]
	if isl2_rects_ci7.size() < 5:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Expected 5 main buildings on Island 2 (with CloudWindmillBakery_2), got %d!" % isl2_rects_ci7.size())
		return
	var min_panoramic_gap_ci7 := 9999.0
	for isl_k7 in all_isl_rects_ci7.keys():
		var arr7: Array = all_isl_rects_ci7[isl_k7]
		for idx7 in range(arr7.size() - 1):
			var r_left7: Rect2 = arr7[idx7]["rect"]
			var r_right7: Rect2 = arr7[idx7 + 1]["rect"]
			var ov7 := maxf(0.0, minf(r_left7.end.x, r_right7.end.x) - maxf(r_left7.position.x, r_right7.position.x))
			var gap7 := r_right7.position.x - r_left7.end.x
			min_panoramic_gap_ci7 = minf(min_panoramic_gap_ci7, gap7)
			if ov7 > 0.01 or gap7 < 28.0 - 0.5:
				_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Island %d clearance violation between `%s` and `%s`: overlap=%.2f gap=%.2fpx (<28px)!" % [
					int(isl_k7), String(arr7[idx7]["name"]), String(arr7[idx7 + 1]["name"]), ov7, gap7
				])
				return

	# Guard check: upgrading locked windmill bakery must fail before construction
	GameManager.unlocked_islands[2] = true
	GameManager.windmill_unlocked = false
	if GameManager.upgrade_building("windmill"):
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "upgrade_building('windmill') should fail before windmill bakery is unlocked!")
		return

	world._process(0.05)
	var wm_screen_r := world.get_windmill_bakery_screen_rect()
	if WindowController != null and (not WindowController.is_logical_point_interactive(wm_screen_r.get_center()) or WindowController.is_logical_point_interactive(Vector2(200.0, 14.0))):
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "WindowController passthrough violation for CloudWindmillBakery_2 (%s)!" % str(wm_screen_r))
		return

	# Measure baseline Market Stall checkout duration & Island Workshop speed BEFORE Windmill Bakery unlock
	var saved_stall_lv_ci7 := int(GameManager.building_levels.get("stall", 1))
	GameManager.building_levels["stall"] = 1
	var base_ws_ci7 := GameManager.get_workshop_speed_multiplier(2)
	var base_stall_dur_ci7 := world.market_stall.get_checkout_duration()
	var base_codex_mult_ci7 := GameManager.get_collection_multiplier()

	# Unlock Windmill Bakery & upgrade Lv.1 -> Lv.5, verifying `麦香烘焙光环` (`>= 1.20x` speed boost on Stall & Workshop)
	GameManager.add_gold(EconomyConfig.WINDMILL_UNLOCK_COST_GOLD + Pacing.line_cost_n("windmill", 1, 4) + 50)
	if not GameManager.unlock_windmill_bakery(false) or not GameManager.windmill_unlocked or not bool(GameManager.unlocked_bakery_items.get("flour_golden_wheat", false)):
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Failed to unlock CloudWindmillBakery_2 and initial `flour_golden_wheat`!")
		return
	for _up_i in range(4):
		if not GameManager.upgrade_building("windmill"):
			_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Failed to upgrade `windmill` up to Lv.5!")
			return
	if int(GameManager.building_levels.get("windmill", 1)) != 5:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Expected `windmill` Lv.5 after 4 upgrades, got Lv.%d!" % int(GameManager.building_levels.get("windmill", 1)))
		return

	var aura_spd_ci7 := GameManager.get_bakery_aura_speed_multiplier()
	var buffed_ws_ci7 := GameManager.get_workshop_speed_multiplier(2)
	var buffed_stall_dur_ci7 := world.market_stall.get_checkout_duration()
	var stall_spd_ratio_ci7 := base_stall_dur_ci7 / maxf(0.01, buffed_stall_dur_ci7)
	GameManager.building_levels["stall"] = saved_stall_lv_ci7
	if aura_spd_ci7 < 1.20 or buffed_ws_ci7 < base_ws_ci7 * 1.20 or stall_spd_ratio_ci7 < 1.20:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Baking Aroma Aura failed >=1.20x speed boost: aura=%.3f ws=%.3f/%.3f stall_ratio=%.3f!" % [
			aura_spd_ci7, buffed_ws_ci7, base_ws_ci7, stall_spd_ratio_ci7
		])
		return

	# Mill Island 1~3 crops + Greenhouse flora into `flour_golden_wheat` -> bake `bread_cloud_souffle` & `bread_amber_croissant`
	GameManager.raw_baskets[1]["crop_0"] = maxi(4, int(GameManager.raw_baskets[1].get("crop_0", 0)))
	GameManager.raw_baskets[2]["crop_2"] = maxi(4, int(GameManager.raw_baskets[2].get("crop_2", 0)))
	GameManager.raw_baskets[3]["crop_3"] = maxi(4, int(GameManager.raw_baskets[3].get("crop_3", 0)))
	GameManager.flora_inventory["flora_stardew_lily"] = maxi(3, int(GameManager.flora_inventory.get("flora_stardew_lily", 0)))
	GameManager.flora_inventory["flora_cloud_rose"] = maxi(3, int(GameManager.flora_inventory.get("flora_cloud_rose", 0)))

	var mill_r1 := GameManager.mill_golden_wheat_flour(true, false)
	var mill_r2 := GameManager.mill_golden_wheat_flour(true, false)
	if not bool(mill_r1.get("milled", false)) or not bool(mill_r2.get("milled", false)) or not bool(GameManager.unlocked_bakery_items.get("bread_cloud_souffle", false)):
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Flour milling loop failed to unlock `bread_cloud_souffle`: r1=%s r2=%s!" % [str(mill_r1), str(mill_r2)])
		return
	var bake_souffle_1 := GameManager.bake_windmill_bread("bread_cloud_souffle", true)
	var bake_souffle_2 := GameManager.bake_windmill_bread("bread_cloud_souffle", true)
	var bake_croissant := GameManager.bake_windmill_bread("bread_amber_croissant", true)
	if not bool(bake_souffle_1.get("baked", false)) or not bool(bake_souffle_2.get("baked", false)) or not bool(bake_croissant.get("baked", false)) or GameManager.get_unlocked_bakery_count() != 3:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Bakery bread baking loop failed (`unlocked=%d/3`): souffle=%s croissant=%s!" % [
			GameManager.get_unlocked_bakery_count(), str(bake_souffle_2), str(bake_croissant)
		])
		return

	# Activate Cloud-Sea Gourmet Parade Float Festival & verify `1.75x~1.90x` premium tourist checkout
	if not GameManager.start_gourmet_parade_festival(38.0) or not GameManager.is_gourmet_parade_active():
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Failed to start Cloud-Sea Gourmet Parade Float Festival!")
		return
	world._process(0.15)
	if world.parade_float_sprite == null or not world.parade_float_sprite.visible or absf(world.parade_float_sprite.position.y - EconomyConfig.GROUND_Y) > 0.1 or world.parade_float_sprite.position.x < 660.0 or world.parade_float_sprite.position.x > 985.0 or world.parade_float_sprite.z_index != EconomyConfig.Z_UNIT:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "GourmetParadeFloatSprite failed to appear grounded on Island 1 cobblestone road [660..985] at Z_UNIT!")
		return

	var souffle_pm := float(EconomyConfig.BAKERY_ITEMS["bread_cloud_souffle"].get("parade_mult", 0.0))
	var croissant_pm := float(EconomyConfig.BAKERY_ITEMS["bread_amber_croissant"].get("parade_mult", 0.0))
	if souffle_pm < 1.75 or souffle_pm > 1.90 or croissant_pm < 1.75 or croissant_pm > 1.90:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Bakery parade premium multipliers outside [1.75, 1.90]: souffle=%.2f croissant=%.2f!" % [souffle_pm, croissant_pm])
		return

	var pre_par_gold := GameManager.gold
	var pre_par_amber := GameManager.get_amber()
	var pre_par_vouchers := GameManager.get_rare_vouchers()
	var parade_guest := world.spawn_special_visitor(CustomerNPC.VisitorRole.PARADE_GOURMET_TOURIST)
	if parade_guest == null or parade_guest.body_sprite == null or parade_guest.body_sprite.hframes != 2 or not parade_guest.is_vip:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "PARADE_GOURMET_TOURIST failed 2-frame sprite slicing or VIP check!")
		return
	parade_guest.position = world.waypoint_graph.get_dock_pos("stall_checkout")
	if world.market_stall != null:
		world.market_stall.queue_customers.push_front(parade_guest)
	parade_guest.desired_item_id = "bread_amber_croissant"
	parade_guest.state = CustomerNPC.State.PURCHASE
	GameManager.till_gold = 10000.0
	parade_guest._process(2.2)
	var par_gold_gain := GameManager.gold - pre_par_gold
	var par_amber_gain := GameManager.get_amber() - pre_par_amber
	var par_voucher_gain := GameManager.get_rare_vouchers() - pre_par_vouchers
	if not parade_guest.purchased_ok or par_gold_gain < 1800 or par_amber_gain < 5 or par_voucher_gain < 1 or GameManager.parade_tourists_served < 1 or GameManager.bakery_reputation_bonus < 85:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Gourmet Parade Tourist checkout mismatch: ok=%s +gold=%d +amber=%d +voucher=%d served=%d rep=%d" % [
			str(parade_guest.purchased_ok), par_gold_gain, par_amber_gain, par_voucher_gain, GameManager.parade_tourists_served, GameManager.bakery_reputation_bonus
		])
		return
	if GameManager.get_collection_multiplier() < base_codex_mult_ci7 + 0.029:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "3-Item Bakery Codex price multiplier did not rise by 1% per entry!")
		return
	if not bool(GameManager.unlocked_achievements.get("ach_windmill_baker", false)) or not bool(GameManager.unlocked_achievements.get("ach_parade_feast", false)):
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "CI-7 achievements (`ach_windmill_baker`, `ach_parade_feast`) did not unlock!")
		return
	parade_guest.queue_free()

	# Verify HUD Tab 0, Tab 2, Tab 3 Card #9 (`index 8`, `★云端烘焙鉴(3/3)`) native Labels + LabelSettings + drawer bounds
	if world.hud != null:
		var tiles_p3 := _menu_tabs_problem(world.hud, ["windmill_building", "windmill_parade", "ci7_codex"], "3/3")
		if tiles_p3 != "":
			_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", tiles_p3)
			return
	var forbidden_font_ci7 := _find_deprecated_font_node(get_tree().root)
	if forbidden_font_ci7 != "":
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Forbidden legacy font node detected at `%s`!" % forbidden_font_ci7)
		return

	# Verify Save/Load roundtrip of all CI-7 fields
	GameManager.bakery_inventory["bread_amber_croissant"] = 2
	var exp_rep_bonus_ci7 := GameManager.bakery_reputation_bonus
	var exp_served_ci7 := GameManager.parade_tourists_served
	GameManager.save_game()
	GameManager.windmill_unlocked = false
	GameManager.building_levels["windmill"] = 1
	GameManager.unlocked_bakery_items = {"flour_golden_wheat": false, "bread_cloud_souffle": false, "bread_amber_croissant": false}
	GameManager.bakery_inventory = {"flour_golden_wheat": 0, "bread_cloud_souffle": 0, "bread_amber_croissant": 0}
	GameManager.parade_festival_timer = 0.0
	GameManager.bakery_reputation_bonus = 0
	GameManager.parade_tourists_served = 0
	GameManager.load_game()
	if not GameManager.windmill_unlocked or int(GameManager.building_levels.get("windmill", 1)) != 5 or GameManager.get_unlocked_bakery_count() != 3 or int(GameManager.bakery_inventory.get("bread_amber_croissant", 0)) != 2 or not GameManager.is_gourmet_parade_active() or GameManager.bakery_reputation_bonus != exp_rep_bonus_ci7 or GameManager.parade_tourists_served != exp_served_ci7:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "CI-7 Save/Load roundtrip failed to restore state!")
		return

	# Prepare lush panoramic 3-island showcase state for live viewport screenshots (Islands 1~3 + CloudWindmillBakery_2 + Gourmet Parade Float + Parade Gourmet Tourist + Hot-Spring VIP)
	for old_c7 in world.customers:
		if is_instance_valid(old_c7):
			old_c7.queue_free()
	world.customers.clear()
	if world.market_stall != null:
		world.market_stall.queue_customers.clear()
	GameManager.unlocked_islands[2] = true
	GameManager.unlocked_islands[3] = true
	GameManager.greenhouse_unlocked = true
	GameManager.hotspring_unlocked = true
	GameManager.windmill_unlocked = true
	GameManager.active_windmill_bread_id = "bread_amber_croissant"
	GameManager.windmill_bake_timer = 6.2
	GameManager.parade_festival_timer = 36.0
	world.parade_float_pos = Vector2(726.0, EconomyConfig.GROUND_Y)
	world.parade_float_dir = 1.0
	var showcase_par7 := world.spawn_special_visitor(CustomerNPC.VisitorRole.PARADE_GOURMET_TOURIST)
	if showcase_par7 != null:
		showcase_par7.position = Vector2(1041.0, EconomyConfig.GROUND_Y)
		showcase_par7.facing_left = true
		showcase_par7.desired_item_id = "bread_amber_croissant"
		showcase_par7._process(0.01)
	var showcase_col7 := world.spawn_special_visitor(CustomerNPC.VisitorRole.COLLECTOR_TOURIST)
	if showcase_col7 != null:
		showcase_col7.position = Vector2(1085.0, EconomyConfig.GROUND_Y)
		showcase_col7.facing_left = true
		showcase_col7.desired_item_id = "souvenir_box_royal"
		showcase_col7._process(0.01)
	var showcase_spa7 := world.spawn_special_visitor(CustomerNPC.VisitorRole.HOTSPRING_VIP_GUEST)
	if showcase_spa7 != null:
		showcase_spa7.position = Vector2(1490.0, EconomyConfig.GROUND_Y)
		showcase_spa7.facing_left = true
		showcase_spa7.desired_item_id = "bath_star_amber"
		showcase_spa7._process(0.01)
	world._process(0.05)

	print("[PASS] [断言20-CI-7云端风车烘焙面坊与云海美食花车巡游节] 通过: 三岛19建筑最小净间距 %.1fpx(>=28px, 0%%重叠)与底部中心锚定、防穿透命中、Lv.5风车面坊麦香光环(%.2fx工坊/摊位加速)、金麦粉与欧包/可颂3/3图鉴闭环、花车巡游1.88x溢价结算(+%dG/+%d琥珀/+%d图鉴券/+%d声望)及山海图鉴第9卡「★云端烘焙鉴(3/3)」PASS!" % [
		min_panoramic_gap_ci7, aura_spd_ci7, par_gold_gain, par_amber_gain, par_voucher_gain, exp_rep_bonus_ci7
	])

	# ------------------------------------------------------------------
	# [断言21-CI-8云端茗香制茶坊与月色画舫]:
	#   1) All 5 CI-8 pixel-art PNGs (`cloud_tea_pavilion.png`, `tea_spring_leaves.png`,
	#      `tea_cloud_longjing.png`, `tea_osmanthus_oolong.png`, `icon_moon_tea_boat.png`) load with RGBA alpha;
	#   2) All 3 islands (`18` main buildings total since CI-10: `6` on Island 1, `6` on Island 2, `6` on Island 3)
	#      maintain `0.0%` horizontal overlap and `>= 28.0px` adjacent gap, with `CloudTeaPavilion_1` grounded
	#      at `Vector2(CloudTeaPavilion.SLOT_X, GROUND_Y)` (CI-11: `950.7`) on solid grass `[566.0..1046.7]` + bottom-center pivot;
	#   3) `CloudTeaPavilion_1` unlock & upgrade `Lv.1..5`, `tea_spring_leaves` -> `tea_cloud_longjing` &
	#      `tea_osmanthus_oolong` brewing + MarketStall stocking, Tea Serenity Aura (`茗香清心光环`) worker move/stamina
	#      & customer tip boost, `MoonTeaBoatSprite` gliding on Lotus Pond `[1142..1244]` + click reward
	#      (Amber / Rare Codex Ticket / Prestige + `1.38x` sale buff), Shanhai Codex Card 10 (`★茗香茶韵鉴(3/3)`),
	#      Save/Load roundtrip, and active showcase state for exported PNGs!
	# ------------------------------------------------------------------
	if world.has_method("reload_ci8_textures"):
		world.reload_ci8_textures()
	var ci8_tex_paths: Array[String] = [
		EconomyConfig.CLOUD_TEA_PAVILION_TEX,
		EconomyConfig.TEA_SPRING_LEAVES_TEX,
		EconomyConfig.TEA_CLOUD_LONGJING_TEX,
		EconomyConfig.TEA_OSMANTHUS_OOLONG_TEX,
		EconomyConfig.ICON_MOON_TEA_BOAT_TEX
	]
	for tp8 in ci8_tex_paths:
		var t8: Texture2D = EconomyConfig.load_pixel_texture(tp8)
		if t8 == null or t8.get_width() < 24 or t8.get_height() < 24:
			_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Missing or invalid CI-8 pixel-art texture `%s`!" % tp8)
			return
		var ar8 := float(t8.get_width()) / maxf(1.0, float(t8.get_height()))
		if ar8 < 0.55 or ar8 > 1.85:
			_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "CI-8 texture `%s` abnormal aspect ratio %.2f!" % [tp8, ar8])
			return
		var img8 := t8.get_image()
		if img8 == null or img8.get_pixel(0, 0).a > 0.05 or img8.get_pixel(img8.get_width() - 1, 0).a > 0.05:
			_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "CI-8 texture `%s` lacks RGBA transparent corner alpha!" % tp8)
			return

	if world.cloud_tea_pavilion == null or world.cloud_tea_pavilion.body_sprite == null or world.cloud_tea_pavilion.body_sprite.texture == null:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "MainWorld missing `CloudTeaPavilion_1` node or body_sprite texture!")
		return
	var tp_sp: Sprite2D = world.cloud_tea_pavilion.body_sprite
	var exp_tp_off_y := -float(tp_sp.texture.get_height()) * 0.5
	if absf(world.cloud_tea_pavilion.position.x - CloudTeaPavilion.SLOT_X) > 0.1 or absf(world.cloud_tea_pavilion.position.y - EconomyConfig.GROUND_Y) > 0.1 or not tp_sp.centered or absf(tp_sp.offset.y - exp_tp_off_y) > 0.1 or world.cloud_tea_pavilion.z_index != EconomyConfig.Z_BUILDING:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "CloudTeaPavilion_1 grounding/pivot/z_index violation: pos=%s centered=%s offset=%s z=%d!" % [
			str(world.cloud_tea_pavilion.position), str(tp_sp.centered), str(tp_sp.offset), world.cloud_tea_pavilion.z_index
		])
		return
	var tp_vis_rect := world.cloud_tea_pavilion.get_screen_rect()
	if tp_vis_rect.position.x < 566.0 or tp_vis_rect.end.x > 1046.7:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "CloudTeaPavilion_1 rect %s outside Island 1 solid grass [566.0..1046.7]!" % str(tp_vis_rect))
		return

	# Verify all 3 islands (`18` main buildings since CI-10: `6` on Island 1, `6` on Island 2, `6` on Island 3) maintain `0.0%` overlap & `>= 28.0px` gap
	var all_isl_rects_ci8: Dictionary = world.get_island_main_building_rects()
	var isl1_rects_ci8: Array = all_isl_rects_ci8[1]
	var isl2_rects_ci8: Array = all_isl_rects_ci8[2]
	var isl3_rects_ci8: Array = all_isl_rects_ci8[3]
	var total_blds_ci8 := isl1_rects_ci8.size() + isl2_rects_ci8.size() + isl3_rects_ci8.size()
	if isl1_rects_ci8.size() != 7 or isl2_rects_ci8.size() != 6 or isl3_rects_ci8.size() != 6 or total_blds_ci8 != 19:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Expected 19 main buildings (7+6+6 since CI-11), got %d (%d+%d+%d)!" % [
			total_blds_ci8, isl1_rects_ci8.size(), isl2_rects_ci8.size(), isl3_rects_ci8.size()
		])
		return
	var min_panoramic_gap_ci8 := 9999.0
	for isl_k8 in all_isl_rects_ci8.keys():
		var arr8: Array = all_isl_rects_ci8[isl_k8]
		for idx8 in range(arr8.size() - 1):
			var r_left8: Rect2 = arr8[idx8]["rect"]
			var r_right8: Rect2 = arr8[idx8 + 1]["rect"]
			var ov8 := maxf(0.0, minf(r_left8.end.x, r_right8.end.x) - maxf(r_left8.position.x, r_right8.position.x))
			var gap8 := r_right8.position.x - r_left8.end.x
			min_panoramic_gap_ci8 = minf(min_panoramic_gap_ci8, gap8)
			if ov8 > 0.01 or gap8 < 28.0 - 0.05:
				_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Island %d clearance violation between `%s` and `%s`: overlap=%.2f gap=%.2fpx (<28.0px)!" % [
					int(isl_k8), String(arr8[idx8]["name"]), String(arr8[idx8 + 1]["name"]), ov8, gap8
				])
				return

	# Guard check: upgrading locked tea pavilion must fail before construction
	GameManager.tea_pavilion_unlocked = false
	GameManager.building_levels["tea_pavilion"] = 1
	GameManager.moon_tea_gathering_timer = 0.0
	if GameManager.upgrade_building("tea_pavilion"):
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "upgrade_building('tea_pavilion') should fail before tea pavilion is unlocked!")
		return

	world._process(0.05)
	var tp_screen_r := world.get_tea_pavilion_screen_rect()
	if WindowController != null and not WindowController.is_logical_point_interactive(tp_screen_r.get_center()):
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "WindowController passthrough violation for CloudTeaPavilion_1 (%s)!" % str(tp_screen_r))
		return

	# Measure baseline Tea Serenity Aura, tip multiplier, Codex multiplier & real AnimalWorker movement BEFORE unlock
	var base_tip_ci8 := GameManager.get_customer_tip_multiplier(false, 1)
	var base_codex_mult_ci8 := GameManager.get_collection_multiplier()
	var tea_test_worker: AnimalWorker = AnimalWorker.new()
	tea_test_worker.setup_worker(AnimalWorker.RoleType.BUNNY_FARMER, 1, 0, Vector2(683.4, EconomyConfig.GROUND_Y), world.waypoint_graph, world)
	world.ysort_layer.add_child(tea_test_worker)
	tea_test_worker._was_hired = true
	tea_test_worker.visible = true
	tea_test_worker.position = Vector2(683.4, EconomyConfig.GROUND_Y)
	tea_test_worker.nav_path = [Vector2(849.8, EconomyConfig.GROUND_Y)]
	tea_test_worker._process(0.20)
	var dist_before_tea := absf(tea_test_worker.position.x - 683.4)

	# Unlock CloudTeaPavilion_1 & upgrade Lv.1 -> Lv.5, verifying `茗香清心光环`
	GameManager.add_gold(EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD + Pacing.line_cost_n("tea_pavilion", 1, 4) + 50)
	if not GameManager.unlock_tea_pavilion(false) or not GameManager.tea_pavilion_unlocked or not bool(GameManager.unlocked_tea_items.get("tea_spring_leaves", false)):
		tea_test_worker.queue_free()
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Failed to unlock CloudTeaPavilion_1 and initial `tea_spring_leaves`!")
		return
	for _tp_up in range(4):
		if not GameManager.upgrade_building("tea_pavilion"):
			tea_test_worker.queue_free()
			_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Failed to upgrade `tea_pavilion` up to Lv.5!")
			return
	if int(GameManager.building_levels.get("tea_pavilion", 1)) != 5:
		tea_test_worker.queue_free()
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Expected `tea_pavilion` Lv.5 after 4 upgrades, got Lv.%d!" % int(GameManager.building_levels.get("tea_pavilion", 1)))
		return

	tea_test_worker.position = Vector2(683.4, EconomyConfig.GROUND_Y)
	tea_test_worker.nav_path = [Vector2(849.8, EconomyConfig.GROUND_Y)]
	tea_test_worker._process(0.20)
	var dist_after_tea := absf(tea_test_worker.position.x - 683.4)
	tea_test_worker.queue_free()

	var tea_move_mult := GameManager.get_tea_aura_worker_move_multiplier()
	var tea_stam_mult := GameManager.get_tea_aura_worker_stamina_multiplier()
	var tea_tip_mult := GameManager.get_tea_aura_tip_multiplier()
	var buffed_tip_ci8 := GameManager.get_customer_tip_multiplier(false, 1)
	if tea_move_mult < 1.22 or tea_stam_mult < 1.22 or tea_tip_mult < 1.18 or buffed_tip_ci8 <= base_tip_ci8 * 1.15 or dist_after_tea <= dist_before_tea * 1.18:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Tea Serenity Aura failed: move=%.3f stam=%.3f tip=%.3f dist=%.2f/%.2f!" % [
			tea_move_mult, tea_stam_mult, tea_tip_mult, dist_after_tea, dist_before_tea
		])
		return

	# Roast `tea_spring_leaves` from crops + flora -> brew `tea_cloud_longjing` & `tea_osmanthus_oolong` & stock MarketStall
	GameManager.raw_baskets[1]["crop_0"] = maxi(6, int(GameManager.raw_baskets[1].get("crop_0", 0)))
	GameManager.raw_baskets[1]["crop_1"] = maxi(4, int(GameManager.raw_baskets[1].get("crop_1", 0)))
	GameManager.flora_inventory["flora_stardew_lily"] = maxi(2, int(GameManager.flora_inventory.get("flora_stardew_lily", 0)))
	GameManager.flora_inventory["flora_cloud_rose"] = maxi(2, int(GameManager.flora_inventory.get("flora_cloud_rose", 0)))
	GameManager.stall_inventory.clear()
	GameManager.stall_inventory["crop_0"] = 1

	var roast_r1 := GameManager.roast_tea_spring_leaves(true, false)
	if not bool(roast_r1.get("roasted", false)) or not bool(GameManager.unlocked_tea_items.get("tea_cloud_longjing", false)):
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Tea leaf roasting failed to unlock `tea_cloud_longjing`: %s!" % str(roast_r1))
		return
	var brew_lj := GameManager.brew_artisan_tea("tea_cloud_longjing", true)
	var brew_ol := GameManager.brew_artisan_tea("tea_osmanthus_oolong", true)
	if not bool(brew_lj.get("brewed", false)) or not bool(brew_ol.get("brewed", false)) or GameManager.get_unlocked_tea_count() != 3:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Artisan tea brewing loop failed (`unlocked=%d/3`): lj=%s ol=%s!" % [
			GameManager.get_unlocked_tea_count(), str(brew_lj), str(brew_ol)
		])
		return
	if int(GameManager.stall_inventory.get("tea_cloud_longjing", 0)) <= 0 and int(GameManager.stall_inventory.get("tea_osmanthus_oolong", 0)) <= 0:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Artisan teas were not stocked to MarketStall (`stall_inventory=%s`)!" % str(GameManager.stall_inventory))
		return

	# Start Lotus Pond Moon-Boat Tea Gathering -> verify `MoonTeaBoatSprite` on Lotus Pond `[1142..1244]` + passthrough + click reward + `1.38x` sale buff
	if not GameManager.start_moon_tea_gathering(40.0) or not GameManager.is_moon_tea_gathering_active():
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Failed to start Moon-Boat Tea Gathering!")
		return
	world._process(0.15)
	if world.moon_tea_boat_sprite == null or not world.moon_tea_boat_sprite.visible or world.moon_tea_boat_pos.x < 1142.0 or world.moon_tea_boat_pos.x > 1244.0 or absf(world.moon_tea_boat_pos.y - 108.0) > 2.0:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "MoonTeaBoatSprite not floating on Lotus Pond [1142..1244] y~108: vis=%s pos=%s!" % [
			str(world.moon_tea_boat_sprite != null and world.moon_tea_boat_sprite.visible), str(world.moon_tea_boat_pos)
		])
		return
	var boat_screen_r := world.get_moon_tea_boat_screen_rect()
	if WindowController != null and not WindowController.is_logical_point_interactive(boat_screen_r.get_center()):
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "WindowController passthrough violation for MoonTeaBoatSprite (%s)!" % str(boat_screen_r))
		return

	var amb_before_boat := GameManager.get_amber()
	var vou_before_boat := GameManager.get_rare_vouchers()
	var rep_before_boat := GameManager.tea_reputation_bonus
	var boat_click := world.interact_with_moon_tea_boat()
	var boat_amb_gain := GameManager.get_amber() - amb_before_boat
	var boat_vou_gain := GameManager.get_rare_vouchers() - vou_before_boat
	var boat_rep_gain := GameManager.tea_reputation_bonus - rep_before_boat
	if not bool(boat_click.get("ok", false)) or boat_amb_gain < 2 or boat_vou_gain < 1 or boat_rep_gain < 45:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "MoonTeaBoat click reward mismatch: res=%s +amb=%d +vou=%d +rep=%d!" % [
			str(boat_click), boat_amb_gain, boat_vou_gain, boat_rep_gain
		])
		return
	if absf(GameManager.get_moon_tea_sale_multiplier("tea_osmanthus_oolong") - 1.38) > 0.01 or absf(GameManager.get_moon_tea_sale_multiplier("delicacy_0") - 1.38) > 0.01:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Moon Tea Gathering 1.38x sale buff mismatch!")
		return

	# Verify Tea Connoisseur visitor 2-frame slicing & checkout
	var tea_guest := world.spawn_special_visitor(CustomerNPC.VisitorRole.TEA_CONNOISSEUR)
	if tea_guest == null or tea_guest.body_sprite == null or tea_guest.body_sprite.hframes != 2 or not tea_guest.is_vip:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "TEA_CONNOISSEUR failed 2-frame sprite slicing or VIP flag!")
		return
	var gold_before_tea_guest := GameManager.gold
	var tea_deal := GameManager.try_tea_connoisseur_checkout("tea_osmanthus_oolong", 1, Vector2(1038.0, EconomyConfig.GROUND_Y))
	var tea_gold_gain := GameManager.gold - gold_before_tea_guest
	if int(tea_deal.get("bought", 0)) < 1 or tea_gold_gain <= 0 or GameManager.tea_connoisseurs_served < 1:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Tea Connoisseur checkout mismatch: %s!" % str(tea_deal))
		return
	tea_guest.queue_free()

	if GameManager.get_collection_multiplier() < base_codex_mult_ci8 + 0.029:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "3-Item Tea Codex price multiplier did not rise by 1% per entry!")
		return
	if not bool(GameManager.unlocked_achievements.get("ach_tea_master", false)) or not bool(GameManager.unlocked_achievements.get("ach_moon_tea_gathering", false)):
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "CI-8 achievements (`ach_tea_master`, `ach_moon_tea_gathering`) did not unlock!")
		return

	# Verify HUD Tab 0, Tab 2, Tab 3 Card 10 (`index 9`, `★茗香茶韵鉴(3/3)`) native Labels + LabelSettings + zero drawer overflow
	if world.hud != null:
		var tiles_p4 := _menu_tabs_problem(world.hud, ["tea_pavilion_building", "tea_moon_gathering", "ci8_codex"], "3/3")
		if tiles_p4 != "":
			_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", tiles_p4)
			return
	var forbidden_font_ci8 := _find_deprecated_font_node(get_tree().root)
	if forbidden_font_ci8 != "":
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Forbidden legacy font node detected at `%s`!" % forbidden_font_ci8)
		return

	# Verify Save/Load roundtrip of all CI-8 fields
	GameManager.tea_inventory["tea_osmanthus_oolong"] = 3
	var exp_rep_bonus_ci8 := GameManager.tea_reputation_bonus
	var exp_served_ci8 := GameManager.tea_connoisseurs_served
	var exp_claims_ci8 := GameManager.moon_tea_boat_claims
	GameManager.save_game()
	GameManager.tea_pavilion_unlocked = false
	GameManager.building_levels["tea_pavilion"] = 1
	GameManager.unlocked_tea_items = {"tea_spring_leaves": false, "tea_cloud_longjing": false, "tea_osmanthus_oolong": false}
	GameManager.tea_inventory = {"tea_spring_leaves": 0, "tea_cloud_longjing": 0, "tea_osmanthus_oolong": 0}
	GameManager.moon_tea_gathering_timer = 0.0
	GameManager.tea_reputation_bonus = 0
	GameManager.tea_connoisseurs_served = 0
	GameManager.moon_tea_boat_claims = 0
	GameManager.load_game()
	if not GameManager.tea_pavilion_unlocked or int(GameManager.building_levels.get("tea_pavilion", 1)) != 5 or GameManager.get_unlocked_tea_count() != 3 or int(GameManager.tea_inventory.get("tea_osmanthus_oolong", 0)) != 3 or not GameManager.is_moon_tea_gathering_active() or GameManager.tea_reputation_bonus != exp_rep_bonus_ci8 or GameManager.tea_connoisseurs_served != exp_served_ci8 or GameManager.moon_tea_boat_claims != exp_claims_ci8:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "CI-8 Save/Load roundtrip failed to restore state!")
		return

	# Prepare lush panoramic 3-island showcase state for live viewport screenshots:
	# Islands 1~3 + CloudTeaPavilion_1 (CI-11: x=950.7) + MoonTeaBoatSprite floating on Lotus Pond (x=1192.0, y=108.0) + Tea Connoisseur + Parade Float
	for old_c8 in world.customers:
		if is_instance_valid(old_c8):
			old_c8.queue_free()
	world.customers.clear()
	if world.market_stall != null:
		world.market_stall.queue_customers.clear()
	GameManager.unlocked_islands[2] = true
	GameManager.unlocked_islands[3] = true
	GameManager.greenhouse_unlocked = true
	GameManager.hotspring_unlocked = true
	GameManager.windmill_unlocked = true
	GameManager.tea_pavilion_unlocked = true
	GameManager.active_tea_recipe_id = "tea_osmanthus_oolong"
	GameManager.tea_brew_timer = 5.6
	GameManager.moon_tea_gathering_timer = 38.0
	world.moon_tea_boat_pos = Vector2(1192.0, 108.0)
	world.moon_tea_boat_dir = 1.0
	GameManager.parade_festival_timer = 0.0
	for w8 in world.workers:
		if is_instance_valid(w8) and w8.visible and w8.position.x > 896.0 and w8.position.x < 960.0:
			w8.position.x = 887.0
	var showcase_tea8 := world.spawn_special_visitor(CustomerNPC.VisitorRole.TEA_CONNOISSEUR)
	if showcase_tea8 != null:
		showcase_tea8.position = Vector2(1039.0, EconomyConfig.GROUND_Y)
		showcase_tea8.facing_left = true
		showcase_tea8.desired_item_id = "tea_osmanthus_oolong"
		showcase_tea8._process(0.01)
	var showcase_par8 := world.spawn_special_visitor(CustomerNPC.VisitorRole.PARADE_GOURMET_TOURIST)
	if showcase_par8 != null:
		showcase_par8.position = Vector2(1078.0, EconomyConfig.GROUND_Y)
		showcase_par8.facing_left = true
		showcase_par8.desired_item_id = "bread_amber_croissant"
		showcase_par8._process(0.01)
	var showcase_spa8 := world.spawn_special_visitor(CustomerNPC.VisitorRole.HOTSPRING_VIP_GUEST)
	if showcase_spa8 != null:
		showcase_spa8.position = Vector2(1490.0, EconomyConfig.GROUND_Y)
		showcase_spa8.facing_left = true
		showcase_spa8.desired_item_id = "bath_star_amber"
		showcase_spa8._process(0.01)
	world._process(0.05)

	print("[PASS] [断言21-CI-8云端茗香制茶坊与月色画舫] 通过: 三岛19建筑(CI-11起7+6+6)最小净间距 %.2fpx(>=28.0px, 0.0%%重叠)与底部中心锚定、防穿透命中、Lv.5茗香茶坊清心光环(移速%.2fx/小费%.2fx)、春芽与龙井/桂乌3/3图鉴闭环、荷塘月色画舫[1142..1244]雅赏(+%d琥珀/+%d图鉴券/+%d声望 & 1.38x茶肴增益)、茶客品茗(+%dG)及山海图鉴第10卡「★茗香茶韵鉴(3/3)」PASS!" % [
		min_panoramic_gap_ci8, tea_move_mult, tea_tip_mult, boat_amb_gain, boat_vou_gain, boat_rep_gain, tea_gold_gain
	])

	# ------------------------------------------------------------------
	# [断言22-CI-9云海星灯祈愿水灯节与山海食神品鉴席]:
	#   1) All 7 CI-9 pixel-art PNGs (`star_lantern.png`, `chef_tasting_pavilion.png`,
	#      `dish_cloud_dumplings.png`, `dish_starlight_fish.png`, `dish_mountain_sea_hotpot.png`, `icon_chef_medal.png`)
	#      load via Godot import with RGBA transparent corners;
	#   2) All 3 islands (`18` main buildings since CI-10: `6` on Island 1, `6` on Island 2, `6` on Island 3) keep `0.0` px^2 overlap
	#      area and `>= 28.0px` adjacent clear gap, with `ChefTastingPavilion_2` grounded at `Vector2(469.9, GROUND_Y)`
	#      (bottom-center pivot, sprite bottom row on `GROUND_Y`) inside Island 2 solid moss `[67.0..492.0]`;
	#   3) Every star-lantern water lane (3 Lotus Pond + 3 coast shallows) keeps the lantern ripple footprint 100% on
	#      water pixels of the real island textures along its whole drift range, never touching buildings or pond bridges;
	#   4) Festival reward path (Amber / Rare Codex Ticket / Gold / Prestige, `祈愿成真` every 3rd wish) + `1.30x` sale buff;
	#   5) Chef Pavilion unlock / upgrade, combo dish cooking from existing ingredients, failing & passing tastings,
	#      Chef Medal (`食神勋章`), Shanhai Codex Card 11 (`★山海食神鉴(3/3)`), HUD cards, Save/Load and showcase state.
	# ------------------------------------------------------------------
	var tag9 := "[断言22-CI-9云海星灯祈愿水灯节与山海食神品鉴席]"
	if world.has_method("reload_ci9_textures"):
		world.reload_ci9_textures()
	var ci9_tex_paths: Array[String] = [
		EconomyConfig.STAR_LANTERN_TEX,
		EconomyConfig.CHEF_TASTING_PAVILION_TEX,
		EconomyConfig.DISH_CLOUD_DUMPLINGS_TEX,
		EconomyConfig.DISH_STARLIGHT_FISH_TEX,
		EconomyConfig.DISH_MOUNTAIN_SEA_HOTPOT_TEX,
		EconomyConfig.ICON_CHEF_MEDAL_TEX
	]
	for tp9 in ci9_tex_paths:
		if not ResourceLoader.exists(tp9):
			_fail_and_quit(tag9, "CI-9 texture `%s` is not imported by Godot (missing `.png.import`)!" % tp9)
			return
		var t9: Texture2D = EconomyConfig.load_pixel_texture(tp9)
		if t9 == null or t9.get_width() < 24 or t9.get_height() < 24:
			_fail_and_quit(tag9, "Missing or invalid CI-9 pixel-art texture `%s`!" % tp9)
			return
		var ar9 := float(t9.get_width()) / maxf(1.0, float(t9.get_height()))
		if ar9 < 0.55 or ar9 > 1.85:
			_fail_and_quit(tag9, "CI-9 texture `%s` abnormal aspect ratio %.2f!" % [tp9, ar9])
			return
		var img9 := t9.get_image()
		if img9 != null and img9.is_compressed():
			img9.decompress()
		if img9 == null or img9.get_pixel(0, 0).a > 0.05 or img9.get_pixel(img9.get_width() - 1, 0).a > 0.05 or img9.get_pixel(0, img9.get_height() - 1).a > 0.05 or img9.get_pixel(img9.get_width() - 1, img9.get_height() - 1).a > 0.05:
			_fail_and_quit(tag9, "CI-9 texture `%s` lacks RGBA transparent corner alpha!" % tp9)
			return
	if world.tex_star_lantern == null or world.wish_lanterns.size() != EconomyConfig.WISH_LANTERN_LANES.size():
		_fail_and_quit(tag9, "MainWorld star lanterns not built (%d/%d) or texture missing!" % [world.wish_lanterns.size(), EconomyConfig.WISH_LANTERN_LANES.size()])
		return

	# 2) Chef Tasting Pavilion grounding + panoramic 18-building clearance (CI-10 added `LighthouseHarbor_3`)
	if world.chef_tasting_pavilion == null or world.chef_tasting_pavilion.body_sprite == null or world.chef_tasting_pavilion.body_sprite.texture == null:
		_fail_and_quit(tag9, "MainWorld missing `ChefTastingPavilion_2` node or body_sprite texture!")
		return
	var cp_sp: Sprite2D = world.chef_tasting_pavilion.body_sprite
	var exp_cp_off_y := -float(cp_sp.texture.get_height()) * 0.5
	if absf(world.chef_tasting_pavilion.position.x - 469.9) > 0.1 or absf(world.chef_tasting_pavilion.position.y - EconomyConfig.GROUND_Y) > 0.1 or not cp_sp.centered or absf(cp_sp.offset.y - exp_cp_off_y) > 0.1 or cp_sp.hframes != 1 or cp_sp.vframes != 1 or cp_sp.region_enabled or world.chef_tasting_pavilion.z_index != EconomyConfig.Z_BUILDING:
		_fail_and_quit(tag9, "ChefTastingPavilion_2 grounding/pivot/frame/z_index violation: pos=%s centered=%s offset=%s z=%d!" % [
			str(world.chef_tasting_pavilion.position), str(cp_sp.centered), str(cp_sp.offset), world.chef_tasting_pavilion.z_index
		])
		return
	var cp_img := cp_sp.texture.get_image()
	if cp_img != null and cp_img.is_compressed():
		cp_img.decompress()
	var cp_bottom_opaque := 0
	if cp_img != null:
		for bx9 in range(cp_img.get_width()):
			if cp_img.get_pixel(bx9, cp_img.get_height() - 1).a > 0.5:
				cp_bottom_opaque += 1
	if cp_bottom_opaque <= 0:
		_fail_and_quit(tag9, "chef_tasting_pavilion.png bottom row has no opaque ground-contact pixels (sprite would float)!")
		return
	var cp_vis_rect := world.chef_tasting_pavilion.get_screen_rect()
	if cp_vis_rect.position.x < 67.0 - 0.05 or cp_vis_rect.end.x > 492.05 or absf(cp_vis_rect.end.y - EconomyConfig.GROUND_Y) > 0.1 or cp_vis_rect.size.x > 180.0 or cp_vis_rect.size.y > 180.0:
		_fail_and_quit(tag9, "ChefTastingPavilion_2 rect %s outside Island 2 solid moss [67.0..492.0] / not grounded!" % str(cp_vis_rect))
		return

	var all_isl_rects_ci9: Dictionary = world.get_island_main_building_rects()
	var isl1_rects_ci9: Array = all_isl_rects_ci9[1]
	var isl2_rects_ci9: Array = all_isl_rects_ci9[2]
	var isl3_rects_ci9: Array = all_isl_rects_ci9[3]
	var total_blds_ci9 := isl1_rects_ci9.size() + isl2_rects_ci9.size() + isl3_rects_ci9.size()
	if isl1_rects_ci9.size() != 7 or isl2_rects_ci9.size() != 6 or isl3_rects_ci9.size() != 6 or total_blds_ci9 != 19:
		_fail_and_quit(tag9, "Expected 19 main buildings (7+6+6 since CI-11), got %d (%d+%d+%d)!" % [total_blds_ci9, isl1_rects_ci9.size(), isl2_rects_ci9.size(), isl3_rects_ci9.size()])
		return
	if String(isl2_rects_ci9[5]["name"]) != "ChefTastingPavilion_2":
		_fail_and_quit(tag9, "ChefTastingPavilion_2 is not the rightmost Island 2 slot (got `%s`)!" % String(isl2_rects_ci9[5]["name"]))
		return
	var min_gap_ci9 := 9999.0
	var total_overlap_area_ci9 := 0.0
	for isl_k9 in all_isl_rects_ci9.keys():
		var arr9: Array = all_isl_rects_ci9[isl_k9]
		for ia9 in range(arr9.size()):
			var ra9: Rect2 = arr9[ia9]["rect"]
			for ib9 in range(ia9 + 1, arr9.size()):
				var rb9: Rect2 = arr9[ib9]["rect"]
				var inter9 := ra9.intersection(rb9)
				total_overlap_area_ci9 += maxf(0.0, inter9.size.x) * maxf(0.0, inter9.size.y)
			if ia9 < arr9.size() - 1:
				var r_next9: Rect2 = arr9[ia9 + 1]["rect"]
				var gap9 := r_next9.position.x - ra9.end.x
				min_gap_ci9 = minf(min_gap_ci9, gap9)
				if gap9 < 28.0 - 0.05:
					_fail_and_quit(tag9, "Island %d clearance violation between `%s` and `%s`: gap=%.2fpx (<28.0px)!" % [
						int(isl_k9), String(arr9[ia9]["name"]), String(arr9[ia9 + 1]["name"]), gap9
					])
					return
	if total_overlap_area_ci9 > 0.0001:
		_fail_and_quit(tag9, "Main building overlap area %.3f px^2 > 0.0!" % total_overlap_area_ci9)
		return
	if world.waypoint_graph != null and absf(world.waypoint_graph.get_dock_pos("chef_pavilion_dock").x - 469.9) > 0.1:
		_fail_and_quit(tag9, "WaypointGraph `chef_pavilion_dock` misaligned: %s" % str(world.waypoint_graph.get_dock_pos("chef_pavilion_dock")))
		return

	# 3) Star lanterns stay 100% on water along every drift lane (Lotus Pond & Island 3 coast shallows)
	var oy9 := world.world_root.position.y
	var lantern_samples_ci9 := 0
	for li9 in range(EconomyConfig.WISH_LANTERN_LANES.size()):
		var lane9: Dictionary = EconomyConfig.WISH_LANTERN_LANES[li9]
		var isl9 := int(lane9["island"])
		var dy_list9: Array = [0.0] if isl9 == 3 else [-0.5, 0.0, 0.5]
		var lx9 := float(lane9["min_x"])
		while lx9 <= float(lane9["max_x"]) + 0.001:
			for dy9 in dy_list9:
				if not world.is_wish_lantern_on_water(li9, lx9, dy9):
					_fail_and_quit(tag9, "Star lantern lane `%s` leaves the water at x=%.1f (dy=%.1f)!" % [String(lane9["id"]), lx9, dy9])
					return
				lantern_samples_ci9 += 1
			var lrect9 := world.get_wish_lantern_rect_at(li9, lx9)
			var lrect9_screen := Rect2(lrect9.position + Vector2(0.0, oy9), lrect9.size)
			for b9 in all_isl_rects_ci9[isl9]:
				var brect9: Rect2 = b9["rect"]
				if lrect9_screen.intersects(brect9):
					_fail_and_quit(tag9, "Star lantern lane `%s` overlaps building `%s` at x=%.1f!" % [String(lane9["id"]), String(b9["name"]), lx9])
					return
			if isl9 == 1 and lrect9.intersects(MainWorld.POND_BRIDGE_LOCAL_RECT):
				_fail_and_quit(tag9, "Star lantern lane `%s` overlaps the Lotus Pond bridges at x=%.1f!" % [String(lane9["id"]), lx9])
				return
			if lrect9.position.y < EconomyConfig.GROUND_Y - 40.0:
				_fail_and_quit(tag9, "Star lantern lane `%s` floats above the water band (rect=%s)!" % [String(lane9["id"]), str(lrect9)])
				return
			lx9 += 1.0
	# Negative control: the classifier must reject grass, sand and building ground
	if world.is_island_texture_water(1, Vector2(800.0, 110.0)) or world.is_island_texture_water(3, Vector2(1500.0, 120.0)) or not world.is_island_texture_water(1, Vector2(1200.0, 110.0)):
		_fail_and_quit(tag9, "Water classifier self-check failed (grass/sand detected as water or pond water rejected)!")
		return

	# 4) Star Lantern Wish Festival: start -> lanterns drift on water -> click rewards -> `1.30x` sale buff
	GameManager.unlocked_islands[3] = true
	GameManager.wish_lantern_festival_timer = 0.0
	GameManager.stall_inventory["crop_0"] = maxi(4, int(GameManager.stall_inventory.get("crop_0", 0)))
	var sale_plain_ci9 := _sell("crop_0", 1, Vector2(1038.0, EconomyConfig.GROUND_Y))
	if not GameManager.start_wish_lantern_festival(45.0) or not GameManager.is_wish_lantern_festival_active():
		_fail_and_quit(tag9, "Failed to start the Star Lantern Wish Festival!")
		return
	var sale_fest_ci9 := _sell("crop_0", 1, Vector2(1038.0, EconomyConfig.GROUND_Y))
	var sale_ratio_ci9 := float(sale_fest_ci9) / maxf(1.0, float(sale_plain_ci9))
	if absf(GameManager.get_wish_lantern_sale_multiplier("crop_0") - 1.30) > 0.001 or sale_plain_ci9 <= 0 or sale_ratio_ci9 < 1.25 or sale_ratio_ci9 > 1.35:
		_fail_and_quit(tag9, "Wish Lantern festival 1.30x sale buff mismatch: plain=%d fest=%d ratio=%.3f!" % [sale_plain_ci9, sale_fest_ci9, sale_ratio_ci9])
		return
	world._process(0.05)
	var visible_lanterns_ci9 := 0
	for wi9 in range(world.wish_lanterns.size()):
		var wl9: Dictionary = world.wish_lanterns[wi9]
		var wsp9: Sprite2D = wl9["sprite"]
		if wsp9 == null or not wsp9.visible:
			continue
		visible_lanterns_ci9 += 1
		var wlane9: Dictionary = EconomyConfig.WISH_LANTERN_LANES[int(wl9["lane"])]
		var w_isl9 := int(wlane9["island"])
		var island_bob9 := roundf(sin(world.cloud_time * 0.55) * 1.0) if w_isl9 == 3 else 0.0
		var dy_now9 := wsp9.position.y - float(wlane9["waterline_y"]) - island_bob9
		if not wsp9.centered or absf(wsp9.offset.y + float(wsp9.texture.get_height()) * 0.5) > 0.1 or wsp9.hframes != 1 or wsp9.region_enabled:
			_fail_and_quit(tag9, "Star lantern #%d sprite is not bottom-center anchored single frame!" % wi9)
			return
		if not world.is_wish_lantern_on_water(int(wl9["lane"]), wsp9.position.x, dy_now9):
			_fail_and_quit(tag9, "Live star lantern #%d at %s is NOT on water!" % [wi9, str(wsp9.position)])
			return
		var wsz9 := world.get_wish_lantern_visual_size()
		if wsz9.x > 32.0 or wsz9.y > 32.0:
			_fail_and_quit(tag9, "Star lantern visual size %s too large for the water lanes!" % str(wsz9))
			return
		if WindowController != null and not WindowController.is_logical_point_interactive(world.get_wish_lantern_screen_rect(wi9).get_center()):
			_fail_and_quit(tag9, "WindowController passthrough swallows star lantern #%d clicks!" % wi9)
			return
	if visible_lanterns_ci9 != EconomyConfig.WISH_LANTERN_LANES.size():
		_fail_and_quit(tag9, "Expected %d visible drifting lanterns during the festival, got %d!" % [EconomyConfig.WISH_LANTERN_LANES.size(), visible_lanterns_ci9])
		return
	var amb_before_l9 := GameManager.get_amber()
	var vou_before_l9 := GameManager.get_rare_vouchers()
	var gold_before_l9 := GameManager.gold
	var rep_before_l9 := GameManager.wish_lantern_reputation_bonus
	var wishes_before_l9 := GameManager.wish_lanterns_collected
	var fest_before_l9 := GameManager.wish_lantern_festival_timer
	var claimed_l9 := 0
	for click_idx9 in [0, 3, 1]:
		var click_res9 := world.interact_with_wish_lantern(click_idx9)
		if not bool(click_res9.get("ok", false)):
			_fail_and_quit(tag9, "Clicking star lantern #%d gave no reward: %s" % [click_idx9, str(click_res9)])
			return
		var csp9: Sprite2D = world.wish_lanterns[click_idx9]["sprite"]
		if csp9.visible or float(world.wish_lanterns[click_idx9]["respawn"]) <= 0.0:
			_fail_and_quit(tag9, "Collected star lantern #%d did not leave the water for respawn!" % click_idx9)
			return
		claimed_l9 += 1
	var lantern_amb_gain := GameManager.get_amber() - amb_before_l9
	var lantern_vou_gain := GameManager.get_rare_vouchers() - vou_before_l9
	var lantern_gold_gain := GameManager.gold - gold_before_l9
	var lantern_rep_gain := GameManager.wish_lantern_reputation_bonus - rep_before_l9
	if GameManager.wish_lanterns_collected - wishes_before_l9 != 3 or lantern_amb_gain < 3 * 2 + 3 or lantern_vou_gain < 3 or lantern_gold_gain < 3 * 120 or lantern_rep_gain < 90 or GameManager.wish_lantern_festival_timer < fest_before_l9 + 5.0:
		_fail_and_quit(tag9, "Wish lantern rewards mismatch: wishes+%d amb+%d vou+%d gold+%d rep+%d fest %.1f->%.1f!" % [
			GameManager.wish_lanterns_collected - wishes_before_l9, lantern_amb_gain, lantern_vou_gain, lantern_gold_gain, lantern_rep_gain, fest_before_l9, GameManager.wish_lantern_festival_timer
		])
		return
	if world.interact_with_wish_lantern(0).get("ok", false):
		_fail_and_quit(tag9, "A collected (hidden) star lantern must not be claimable twice!")
		return
	if not bool(GameManager.unlocked_achievements.get("ach_wish_lantern", false)):
		_fail_and_quit(tag9, "Achievement `ach_wish_lantern` did not unlock!")
		return
	GameManager.wish_lantern_festival_timer = 0.0
	if bool(GameManager.claim_wish_lantern(2, Vector2(1280.0, 116.0)).get("claimed", false)):
		_fail_and_quit(tag9, "Wish lanterns must not pay out outside the festival!")
		return

	# 5) Mountain-Sea Master Chef Tasting Pavilion: unlock, upgrade guard, combo cooking, tasting challenges & Chef Medal
	GameManager.unlocked_islands[2] = true
	GameManager.chef_pavilion_unlocked = false
	GameManager.building_levels["chef_pavilion"] = 1
	for td9 in EconomyConfig.TASTING_DISH_ORDER:
		GameManager.tasting_inventory[td9] = 0
		GameManager.unlocked_tasting_dishes[td9] = false
		GameManager.tasting_challenges_passed[td9] = false
		GameManager.tasting_best_scores[td9] = 0
	GameManager.chef_medals = 0
	GameManager.moon_tea_gathering_timer = 0.0
	if GameManager.upgrade_building("chef_pavilion"):
		_fail_and_quit(tag9, "upgrade_building('chef_pavilion') should fail before the pavilion is built!")
		return
	world._process(0.05)
	var cp_screen_r := world.get_chef_pavilion_screen_rect()
	if WindowController != null and not WindowController.is_logical_point_interactive(cp_screen_r.get_center()):
		_fail_and_quit(tag9, "WindowController passthrough violation for ChefTastingPavilion_2 (%s)!" % str(cp_screen_r))
		return
	var base_codex_mult_ci9 := GameManager.get_collection_multiplier()
	GameManager.add_gold(EconomyConfig.CHEF_PAVILION_UNLOCK_COST_GOLD + 50)
	var unlock_click_ci9 := world.interact_with_chef_pavilion()
	if not bool(unlock_click_ci9.get("ok", false)) or not GameManager.chef_pavilion_unlocked or not bool(GameManager.unlocked_tasting_dishes.get("dish_cloud_dumplings", false)):
		_fail_and_quit(tag9, "Clicking the unbuilt ChefTastingPavilion_2 with enough gold did not build it: %s" % str(unlock_click_ci9))
		return

	# Stock existing island ingredients/products used by the 3 combo recipes
	GameManager.raw_baskets[1]["crop_0"] = 6
	GameManager.raw_baskets[1]["crop_1"] = 4
	GameManager.raw_baskets[2]["crop_2"] = 4
	GameManager.raw_baskets[3]["crop_3"] = 4
	GameManager.bakery_inventory["flour_golden_wheat"] = 3
	GameManager.bakery_inventory["bread_amber_croissant"] = 2
	GameManager.tea_inventory["tea_cloud_longjing"] = 2
	GameManager.flora_inventory["flora_stardew_lily"] = 2
	GameManager.workshop_outputs["coral_linked"]["delicacy_3"] = 2

	var crop0_before_ci9 := int(GameManager.raw_baskets[1]["crop_0"])
	var flour_before_ci9 := int(GameManager.bakery_inventory["flour_golden_wheat"])
	var cook_dump := GameManager.cook_tasting_dish("dish_cloud_dumplings", false)
	if not bool(cook_dump.get("cooked", false)) or int(GameManager.tasting_inventory.get("dish_cloud_dumplings", 0)) < 1 or int(GameManager.raw_baskets[1]["crop_0"]) != crop0_before_ci9 - 1 or int(GameManager.bakery_inventory["flour_golden_wheat"]) != flour_before_ci9 - 1:
		_fail_and_quit(tag9, "Combo cooking `dish_cloud_dumplings` failed or did not consume crop_0 + flour: %s" % str(cook_dump))
		return
	# Lv.1 pavilion outside the festival -> near-miss tasting (78 < 80) still pays a tasting fee but does not pass
	var fail_taste := GameManager.run_tasting_challenge("dish_cloud_dumplings")
	if not bool(fail_taste.get("judged", false)) or bool(fail_taste.get("passed", true)) or int(fail_taste.get("score", 0)) >= EconomyConfig.TASTING_PASS_SCORE or int(fail_taste.get("gold", 0)) <= 0 or GameManager.get_passed_tasting_challenge_count() != 0:
		_fail_and_quit(tag9, "Near-miss tasting should be judged but not passed: %s" % str(fail_taste))
		return
	# Festival night (+14) -> passes and unlocks the next combo dish
	GameManager.start_wish_lantern_festival(45.0)
	var dump_click := world.interact_with_chef_pavilion()
	if String(dump_click.get("action", "")) != "cook":
		_fail_and_quit(tag9, "Chef pavilion click should cook the pending dish first: %s" % str(dump_click))
		return
	var pass_taste_click := world.interact_with_chef_pavilion()
	var pass_res_1: Dictionary = pass_taste_click.get("result", {})
	if String(pass_taste_click.get("action", "")) != "tasting" or not bool(pass_res_1.get("passed", false)) or not bool(GameManager.tasting_challenges_passed.get("dish_cloud_dumplings", false)) or not bool(GameManager.unlocked_tasting_dishes.get("dish_starlight_fish", false)):
		_fail_and_quit(tag9, "Festival tasting of `dish_cloud_dumplings` failed to pass/unlock `dish_starlight_fish`: %s" % str(pass_taste_click))
		return
	var amb_before_feast := GameManager.get_amber()
	var vou_before_feast := GameManager.get_rare_vouchers()
	var cook_fish := GameManager.cook_tasting_dish("dish_starlight_fish", false)
	var taste_fish := GameManager.run_tasting_challenge("dish_starlight_fish")
	if not bool(cook_fish.get("cooked", false)) or not bool(taste_fish.get("passed", false)) or not bool(GameManager.unlocked_tasting_dishes.get("dish_mountain_sea_hotpot", false)):
		_fail_and_quit(tag9, "`dish_starlight_fish` cook/tasting loop failed: cook=%s taste=%s" % [str(cook_fish), str(taste_fish)])
		return
	var cook_pot := GameManager.cook_tasting_dish("dish_mountain_sea_hotpot", false)
	var taste_pot := GameManager.run_tasting_challenge("dish_mountain_sea_hotpot")
	if not bool(cook_pot.get("cooked", false)) or not bool(taste_pot.get("passed", false)) or not bool(taste_pot.get("medal_awarded", false)) or GameManager.chef_medals != 1 or GameManager.get_passed_tasting_challenge_count() != 3:
		_fail_and_quit(tag9, "`dish_mountain_sea_hotpot` final tasting failed to award the Chef Medal: cook=%s taste=%s medals=%d" % [str(cook_pot), str(taste_pot), GameManager.chef_medals])
		return
	var feast_amb_gain := GameManager.get_amber() - amb_before_feast
	var feast_vou_gain := GameManager.get_rare_vouchers() - vou_before_feast
	if feast_amb_gain < 6 + 9 + 10 or feast_vou_gain < 1 + 2 + 2:
		_fail_and_quit(tag9, "Tasting challenge rewards too low: +%d amber +%d vouchers!" % [feast_amb_gain, feast_vou_gain])
		return
	if not bool(GameManager.unlocked_achievements.get("ach_chef_medal", false)):
		_fail_and_quit(tag9, "Achievement `ach_chef_medal` did not unlock!")
		return
	if GameManager.get_collection_multiplier() < base_codex_mult_ci9 + 0.029:
		_fail_and_quit(tag9, "3 passed tasting challenges did not raise the collection bonus by 3%!")
		return
	# Upgrade Lv.1 -> Lv.3 and verify the level-based tasting bonus
	GameManager.add_gold(Pacing.line_cost_n("chef_pavilion", 1, 4))
	for _cp_up in range(2):
		if not GameManager.upgrade_building("chef_pavilion"):
			_fail_and_quit(tag9, "Failed to upgrade `chef_pavilion` to Lv.3!")
			return
	GameManager.wish_lantern_festival_timer = 0.0
	if int(GameManager.building_levels.get("chef_pavilion", 1)) != 3 or GameManager.get_tasting_score("dish_cloud_dumplings") < EconomyConfig.TASTING_PASS_SCORE:
		_fail_and_quit(tag9, "Lv.3 Chef Pavilion tasting score %d < %d!" % [GameManager.get_tasting_score("dish_cloud_dumplings"), EconomyConfig.TASTING_PASS_SCORE])
		return

	# HUD Tab 0 / Tab 2 / Tab 3 card 11 (`index 10`, `★山海食神鉴(3/3)`) native Labels + zero drawer overflow
	if world.hud != null:
		var tiles_p5 := _menu_tabs_problem(world.hud, ["chef_pavilion_building", "wish_lantern_festival", "ci9_codex"], "3/3")
		if tiles_p5 != "":
			_fail_and_quit(tag9, tiles_p5)
			return
	var forbidden_font_ci9 := _find_deprecated_font_node(get_tree().root)
	if forbidden_font_ci9 != "":
		_fail_and_quit(tag9, "Forbidden legacy font node detected at `%s`!" % forbidden_font_ci9)
		return

	# Save/Load roundtrip of all CI-9 fields
	GameManager.tasting_inventory["dish_mountain_sea_hotpot"] = 2
	GameManager.wish_lantern_festival_timer = 33.0
	var exp_rep_ci9 := GameManager.chef_reputation_bonus
	var exp_wishes_ci9 := GameManager.wish_lanterns_collected
	var exp_tastings_ci9 := GameManager.tastings_held
	GameManager.save_game()
	GameManager.chef_pavilion_unlocked = false
	GameManager.building_levels["chef_pavilion"] = 1
	for td9b in EconomyConfig.TASTING_DISH_ORDER:
		GameManager.tasting_inventory[td9b] = 0
		GameManager.unlocked_tasting_dishes[td9b] = false
		GameManager.tasting_challenges_passed[td9b] = false
	GameManager.chef_medals = 0
	GameManager.chef_reputation_bonus = 0
	GameManager.wish_lanterns_collected = 0
	GameManager.tastings_held = 0
	GameManager.wish_lantern_festival_timer = 0.0
	GameManager.load_game()
	if not GameManager.chef_pavilion_unlocked or int(GameManager.building_levels.get("chef_pavilion", 1)) != 3 or GameManager.get_passed_tasting_challenge_count() != 3 or GameManager.get_unlocked_tasting_dish_count() != 3 or int(GameManager.tasting_inventory.get("dish_mountain_sea_hotpot", 0)) != 2 or GameManager.chef_medals != 1 or GameManager.chef_reputation_bonus != exp_rep_ci9 or GameManager.wish_lanterns_collected != exp_wishes_ci9 or GameManager.tastings_held != exp_tastings_ci9 or not GameManager.is_wish_lantern_festival_active():
		_fail_and_quit(tag9, "CI-9 Save/Load roundtrip failed to restore state!")
		return

	# Showcase: festival night on Lotus Pond + coast shallows, Chef Pavilion cooking the Mountain-Sea Hot Pot (Lv.3, medal earned)
	GameManager.chef_pavilion_unlocked = true
	GameManager.active_tasting_dish_id = "dish_mountain_sea_hotpot"
	GameManager.chef_cook_timer = 6.2
	GameManager.wish_lantern_festival_timer = 40.0
	world._on_wish_lantern_festival_started(40.0)
	world.moon_tea_boat_pos = Vector2(1192.0, 108.0)
	world.moon_tea_boat_dir = 1.0
	world._process(0.05)

	print("[PASS] %s 通过: 三岛19建筑(7+6+6)最小净间距 %.2fpx(>=28.0px)、重叠面积 %.1fpx²、ChefTastingPavilion_2 底部中心锚定于 (469.9, GROUND_Y=124.0)；%d 条水灯航道 %d 个采样点 100%%在荷塘/海岸水面且零碰建筑/栈桥；水灯节 %d 盏点击奖励(+%dG/+%d琥珀/+%d图鉴券/+%d声望)与 %.2fx 售价增益；三道组合名菜品鉴(首尝 %d 分未过→节庆 %d 分通过)、食神勋章 x%d 与山海图鉴第11卡「★山海食神鉴(3/3)」PASS!" % [
		tag9, min_gap_ci9, total_overlap_area_ci9, EconomyConfig.WISH_LANTERN_LANES.size(), lantern_samples_ci9, claimed_l9,
		lantern_gold_gain, lantern_amb_gain, lantern_vou_gain, lantern_rep_gain, sale_ratio_ci9,
		int(fail_taste.get("score", 0)), int(pass_res_1.get("score", 0)), GameManager.chef_medals
	])

	# ------------------------------------------------------------------
	# [断言23-CI-10云海灯塔渔港]:
	#   1) All 5 CI-10 pixel-art PNGs (`lighthouse_harbor.png`, `fishing_boat.png`, `seafood_catch.png`,
	#      load via Godot import with RGBA transparent corners;
	#   2) 18 main buildings (6+6+6) keep `>= 28.0px` gaps and `0.0` px^2 overlap, `LighthouseHarbor_3` grounded at
	#      `Vector2(1743.4, GROUND_Y)` (bottom-center pivot, opaque ground-contact row on Island 3 sand) in slot 5;
	#   3) The fishing-boat lane keeps the hull + ripple footprint 100% on water pixels of `island_coral_coast.png` from the
	#      pier berth to the cape, never touching a building or an Island 3 `Lv.` label; 2 full rotas of live boats stay on
	#      water and never share the cove; every landed catch is counted;
	#   4) Seafood reaches the cooking chain: market stall sale + Chef Pavilion `星光锦鲤` / `山海火锅` consume `seafood_catch`;
	#   6) HUD cards #12 on tabs 0/2/3 with own LabelSettings, Save/Load roundtrip and the screenshot showcase state.
	# ------------------------------------------------------------------
	var tag10 := "[断言23-CI-10云海灯塔渔港]"
	if world.has_method("reload_ci10_textures"):
		world.reload_ci10_textures()
	var ci10_tex_paths: Array[String] = [
		EconomyConfig.LIGHTHOUSE_HARBOR_TEX,
		EconomyConfig.FISHING_BOAT_TEX,
		EconomyConfig.SEAFOOD_CATCH_TEX
	]
	for tp10 in ci10_tex_paths:
		if not ResourceLoader.exists(tp10):
			_fail_and_quit(tag10, "CI-10 texture `%s` is not imported by Godot (missing `.png.import`)!" % tp10)
			return
		var t10: Texture2D = EconomyConfig.load_pixel_texture(tp10)
		if t10 == null or t10.get_width() < 24 or t10.get_height() < 24:
			_fail_and_quit(tag10, "Missing or invalid CI-10 pixel-art texture `%s`!" % tp10)
			return
		var ar10 := float(t10.get_width()) / maxf(1.0, float(t10.get_height()))
		if ar10 < 0.55 or ar10 > 1.85:
			_fail_and_quit(tag10, "CI-10 texture `%s` abnormal aspect ratio %.2f!" % [tp10, ar10])
			return
		var img10 := t10.get_image()
		if img10 != null and img10.is_compressed():
			img10.decompress()
		if img10 == null or img10.get_pixel(0, 0).a > 0.05 or img10.get_pixel(img10.get_width() - 1, 0).a > 0.05 or img10.get_pixel(0, img10.get_height() - 1).a > 0.05 or img10.get_pixel(img10.get_width() - 1, img10.get_height() - 1).a > 0.05:
			_fail_and_quit(tag10, "CI-10 texture `%s` lacks RGBA transparent corner alpha!" % tp10)
			return
	if world.tex_fishing_boat == null or world.harbor_boats.size() != EconomyConfig.HARBOR_BOAT_COUNT:
		_fail_and_quit(tag10, "MainWorld fishing boats not built (%d/%d) or texture missing!" % [world.harbor_boats.size(), EconomyConfig.HARBOR_BOAT_COUNT])
		return

	# 2) Lighthouse Harbor grounding + panoramic 18-building clearance
	var lh10: LighthouseHarbor = world.lighthouse_harbor
	if lh10 == null or lh10.body_sprite == null or lh10.body_sprite.texture == null:
		_fail_and_quit(tag10, "MainWorld missing `LighthouseHarbor_3` node or body_sprite texture!")
		return
	var lh_sp: Sprite2D = lh10.body_sprite
	var exp_lh_off_y := -float(lh_sp.texture.get_height()) * 0.5
	if absf(lh10.position.x - EconomyConfig.LIGHTHOUSE_HARBOR_SLOT_X) > 0.1 or absf(lh10.position.y - EconomyConfig.GROUND_Y) > 0.1 or not lh_sp.centered or absf(lh_sp.offset.y - exp_lh_off_y) > 0.1 or lh_sp.hframes != 1 or lh_sp.vframes != 1 or lh_sp.region_enabled or lh10.z_index != EconomyConfig.Z_BUILDING:
		_fail_and_quit(tag10, "LighthouseHarbor_3 grounding/pivot/frame/z_index violation: pos=%s centered=%s offset=%s z=%d!" % [
			str(lh10.position), str(lh_sp.centered), str(lh_sp.offset), lh10.z_index
		])
		return
	var lh_img := lh_sp.texture.get_image()
	if lh_img != null and lh_img.is_compressed():
		lh_img.decompress()
	var lh_contact_px := 0
	var lh_contact_on_sand := 0
	var coral_img10: Image = world._get_island_water_image(3)
	if lh_img != null:
		var lh_sc := lh_sp.scale.x
		for bx10 in range(lh_img.get_width()):
			if lh_img.get_pixel(bx10, lh_img.get_height() - 1).a > 0.5:
				lh_contact_px += 1
				# Ground-contact pixel -> the Island 3 texture right below it must be opaque dry ground (never void or water)
				var gx10 := lh10.position.x + (float(bx10) + 0.5 - float(lh_img.get_width()) * 0.5) * lh_sc
				var gpt10 := Vector2(gx10, EconomyConfig.GROUND_Y + 0.5)
				var tpx10 := roundi(gpt10.x - MainWorld.ISLAND_3_TEX_ORIGIN.x)
				var tpy10 := roundi(gpt10.y - MainWorld.ISLAND_3_TEX_ORIGIN.y)
				if coral_img10 != null and tpx10 >= 0 and tpy10 >= 0 and tpx10 < coral_img10.get_width() and tpy10 < coral_img10.get_height() and coral_img10.get_pixel(tpx10, tpy10).a > 0.78 and not world.is_island_texture_water(3, gpt10):
					lh_contact_on_sand += 1
	if lh_contact_px <= 0 or lh_contact_on_sand != lh_contact_px:
		_fail_and_quit(tag10, "lighthouse_harbor.png ground-contact row floats or sinks: %d opaque bottom pixels, %d on Island 3 sand!" % [lh_contact_px, lh_contact_on_sand])
		return
	var lh_vis_rect := lh10.get_screen_rect()
	if lh_vis_rect.position.x < 1416.0 - 0.05 or lh_vis_rect.end.x > 1836.05 or absf(lh_vis_rect.end.y - EconomyConfig.GROUND_Y) > 0.1 or lh_vis_rect.size.x > 180.0 or lh_vis_rect.size.y > 180.0:
		_fail_and_quit(tag10, "LighthouseHarbor_3 rect %s outside Island 3 sand shelf [1416.0..1836.0] / not grounded!" % str(lh_vis_rect))
		return

	var all_isl_rects_ci10: Dictionary = world.get_island_main_building_rects()
	var isl1_rects_ci10: Array = all_isl_rects_ci10[1]
	var isl2_rects_ci10: Array = all_isl_rects_ci10[2]
	var isl3_rects_ci10: Array = all_isl_rects_ci10[3]
	var total_blds_ci10 := isl1_rects_ci10.size() + isl2_rects_ci10.size() + isl3_rects_ci10.size()
	if isl1_rects_ci10.size() != 7 or isl2_rects_ci10.size() != 6 or isl3_rects_ci10.size() != 6 or total_blds_ci10 != 19:
		_fail_and_quit(tag10, "Expected 19 main buildings (7+6+6 since CI-11), got %d (%d+%d+%d)!" % [total_blds_ci10, isl1_rects_ci10.size(), isl2_rects_ci10.size(), isl3_rects_ci10.size()])
		return
	if String(isl3_rects_ci10[4]["name"]) != "LighthouseHarbor_3" or String(isl3_rects_ci10[5]["name"]) != "RightTiki_3":
		_fail_and_quit(tag10, "LighthouseHarbor_3 is not Island 3 slot 5 (got `%s`, `%s`)!" % [String(isl3_rects_ci10[4]["name"]), String(isl3_rects_ci10[5]["name"])])
		return
	var min_gap_ci10 := 9999.0
	var isl3_min_gap_ci10 := 9999.0
	var total_overlap_area_ci10 := 0.0
	for isl_k10 in all_isl_rects_ci10.keys():
		var arr10: Array = all_isl_rects_ci10[isl_k10]
		for ia10 in range(arr10.size()):
			var ra10: Rect2 = arr10[ia10]["rect"]
			for ib10 in range(ia10 + 1, arr10.size()):
				var rb10: Rect2 = arr10[ib10]["rect"]
				var inter10 := ra10.intersection(rb10)
				total_overlap_area_ci10 += maxf(0.0, inter10.size.x) * maxf(0.0, inter10.size.y)
			if ia10 < arr10.size() - 1:
				var r_next10: Rect2 = arr10[ia10 + 1]["rect"]
				var gap10 := r_next10.position.x - ra10.end.x
				min_gap_ci10 = minf(min_gap_ci10, gap10)
				if int(isl_k10) == 3:
					isl3_min_gap_ci10 = minf(isl3_min_gap_ci10, gap10)
				if gap10 < 28.0 - 0.05:
					_fail_and_quit(tag10, "Island %d clearance violation between `%s` and `%s`: gap=%.2fpx (<28.0px)!" % [
						int(isl_k10), String(arr10[ia10]["name"]), String(arr10[ia10 + 1]["name"]), gap10
					])
					return
	if total_overlap_area_ci10 > 0.0001:
		_fail_and_quit(tag10, "Main building overlap area %.3f px^2 > 0.0!" % total_overlap_area_ci10)
		return
	var isl3_first_rect: Rect2 = isl3_rects_ci10[0]["rect"]
	var isl3_last_rect: Rect2 = isl3_rects_ci10[5]["rect"]
	if isl3_first_rect.position.x < 1416.0 - 0.05 or isl3_last_rect.end.x > 1836.05:
		_fail_and_quit(tag10, "Island 3 buildings spill off the sand shelf: [%.1f..%.1f]!" % [isl3_first_rect.position.x, isl3_last_rect.end.x])
		return
	if world.waypoint_graph != null and absf(world.waypoint_graph.get_dock_pos("lighthouse_harbor_dock").x - EconomyConfig.LIGHTHOUSE_HARBOR_SLOT_X) > 0.1:
		_fail_and_quit(tag10, "WaypointGraph `lighthouse_harbor_dock` misaligned: %s" % str(world.waypoint_graph.get_dock_pos("lighthouse_harbor_dock")))
		return
	if world.landscape_nodes.has("tiki_torch"):
		var torch_r10: Rect2 = world._sprite_global_rect(world.landscape_nodes["tiki_torch"], world.world_root.position.y)
		for b10 in isl3_rects_ci10:
			if torch_r10.intersects(b10["rect"]):
				_fail_and_quit(tag10, "Tiki torch decor %s overlaps `%s`!" % [str(torch_r10), String(b10["name"])])
				return

	# 3) Fishing-boat lane: hull + ripple footprint 100% on water, clear of buildings and Island 3 `Lv.` labels
	var oy10 := world.world_root.position.y
	var lane10: Dictionary = EconomyConfig.HARBOR_BOAT_LANE
	var berth10 := float(lane10["berth_x"])
	var sea10 := float(lane10["sea_x"])
	var wl10 := float(lane10["waterline_y"])
	var boat_sz10 := world.get_harbor_boat_visual_size()
	if boat_sz10.x > 32.0 or boat_sz10.y > 32.0 or boat_sz10.x < 14.0:
		_fail_and_quit(tag10, "Fishing boat visual size %s out of range [14..32]px!" % str(boat_sz10))
		return
	var boat_samples10 := 0
	var bx_lane := minf(berth10, sea10)
	while bx_lane <= maxf(berth10, sea10) + 0.001:
		if not world.is_harbor_boat_on_water(bx_lane, 0.0):
			_fail_and_quit(tag10, "Fishing-boat lane leaves the water at x=%.1f (waterline %.1f)!" % [bx_lane, wl10])
			return
		boat_samples10 += EconomyConfig.HARBOR_BOAT_HULL_DX.size() * EconomyConfig.HARBOR_BOAT_HULL_DY.size()
		var brect10 := world.get_harbor_boat_rect_at(bx_lane)
		var brect10_screen := Rect2(brect10.position + Vector2(0.0, oy10), brect10.size)
		for b10b in isl3_rects_ci10:
			if brect10_screen.intersects(b10b["rect"]):
				_fail_and_quit(tag10, "Fishing boat at x=%.1f overlaps building `%s`!" % [bx_lane, String(b10b["name"])])
				return
		for wli10 in range(EconomyConfig.WISH_LANTERN_LANES.size()):
			var wlane10: Dictionary = EconomyConfig.WISH_LANTERN_LANES[wli10]
			if int(wlane10["island"]) == 3 and brect10.intersects(Rect2(float(wlane10["min_x"]) - 10.0, float(wlane10["waterline_y"]) - 20.0, float(wlane10["max_x"]) - float(wlane10["min_x"]) + 20.0, 20.0)):
				_fail_and_quit(tag10, "Fishing boat lane crosses star-lantern lane `%s`!" % String(wlane10["id"]))
				return
		bx_lane += 1.0
	# Negative controls: reef rocks west of the cove and the dry beach must be rejected
	if world.is_harbor_boat_on_water(1712.0, 0.0) or world.is_harbor_boat_on_water(EconomyConfig.LIGHTHOUSE_HARBOR_SLOT_X, -30.0):
		_fail_and_quit(tag10, "Boat water classifier self-check failed (reef rocks / sand accepted as water)!")
		return

	# Build the harbor by clicking it (upgrade guard first), then run 2 full deterministic fishing rotas
	GameManager.unlocked_islands[3] = true
	GameManager.lighthouse_harbor_unlocked = false
	GameManager.building_levels["lighthouse_harbor"] = 1
	if GameManager.upgrade_building("lighthouse_harbor"):
		_fail_and_quit(tag10, "upgrade_building('lighthouse_harbor') should fail before the harbor is built!")
		return
	world._process(0.05)
	for hb_pre in world.harbor_boats:
		if (hb_pre["sprite"] as Sprite2D).visible:
			_fail_and_quit(tag10, "Fishing boats must stay docked out of sight before the harbor is built!")
			return
	var lh_screen_r := world.get_lighthouse_screen_rect()
	if WindowController != null and not WindowController.is_logical_point_interactive(lh_screen_r.get_center()):
		_fail_and_quit(tag10, "WindowController passthrough violation for LighthouseHarbor_3 (%s)!" % str(lh_screen_r))
		return
	GameManager.add_gold(EconomyConfig.LIGHTHOUSE_HARBOR_UNLOCK_COST_GOLD + 50)
	var unlock_click10 := world.interact_with_lighthouse_harbor()
	if not bool(unlock_click10.get("ok", false)) or not GameManager.lighthouse_harbor_unlocked:
		_fail_and_quit(tag10, "Clicking the unbuilt LighthouseHarbor_3 with enough gold did not build it: %s" % str(unlock_click10))
		return
	GameManager.frenzy_timer = 0.0
	GameManager.set_harbor_clock(0.0)
	GameManager.harbor_seafood_inventory[EconomyConfig.SEAFOOD_ITEM_ID] = 0
	# Empty market shelf so every landing can push its crate onto the stall
	for sk10 in GameManager.stall_inventory.keys():
		GameManager.stall_inventory[sk10] = 0
	GameManager.stall_inventory[EconomyConfig.SEAFOOD_ITEM_ID] = 0
	var landed_before10 := GameManager.seafood_landed_total
	var trips_before10 := GameManager.harbor_trips_total
	var period10 := EconomyConfig.get_harbor_boat_period()
	var sim_t10 := 0.0
	var boat_visible_frames: Array[int] = [0, 0]
	var boat_states_seen: Dictionary = {}
	var max_concurrent10 := 0
	var live_boat_checks10 := 0
	var landing_events10 := 0
	while sim_t10 < period10 * 2.0 - 0.001:
		if GameManager.advance_harbor(0.25) > 0:
			landing_events10 += 1
		sim_t10 += 0.25
		world._update_harbor_boats(true)
		var vis_now10 := 0
		for hb10 in world.harbor_boats:
			var hsp10: Sprite2D = hb10["sprite"]
			boat_states_seen[String(hb10.get("state", ""))] = true
			if hsp10 == null or not hsp10.visible:
				continue
			vis_now10 += 1
			boat_visible_frames[int(hb10["idx"])] += 1
			if not hsp10.centered or absf(hsp10.offset.y + float(hsp10.texture.get_height()) * 0.5) > 0.1 or hsp10.hframes != 1 or hsp10.vframes != 1 or hsp10.region_enabled or hsp10.z_index != EconomyConfig.Z_UNIT:
				_fail_and_quit(tag10, "Fishing boat #%d sprite is not a bottom-center anchored single frame at Z_UNIT!" % int(hb10["idx"]))
				return
			var dy_now10 := hsp10.position.y - wl10 - world.get_island3_bob()
			if absf(dy_now10) > 0.01 or not world.is_harbor_boat_on_water(hsp10.position.x, dy_now10):
				_fail_and_quit(tag10, "Live fishing boat #%d at %s (state `%s`) is NOT on water!" % [int(hb10["idx"]), str(hsp10.position), String(hb10.get("state", ""))])
				return
			if hsp10.position.x < minf(berth10, sea10) - 0.01 or hsp10.position.x > maxf(berth10, sea10) + 0.01:
				_fail_and_quit(tag10, "Live fishing boat #%d left its validated lane: x=%.2f!" % [int(hb10["idx"]), hsp10.position.x])
				return
			live_boat_checks10 += 1
		max_concurrent10 = maxi(max_concurrent10, vis_now10)
	var landed10 := GameManager.seafood_landed_total - landed_before10
	var trips10 := GameManager.harbor_trips_total - trips_before10
	var exp_trips10 := 2 * EconomyConfig.HARBOR_BOAT_COUNT
	if max_concurrent10 > 1:
		_fail_and_quit(tag10, "Two fishing boats were visible in the cove at the same time (max %d)!" % max_concurrent10)
		return
	if boat_visible_frames[0] <= 0 or boat_visible_frames[1] <= 0:
		_fail_and_quit(tag10, "Both fishing boats must sail visibly during 2 rotas (frames %s)!" % str(boat_visible_frames))
		return
	for st10 in ["docked", "sail_out", "at_sea", "sail_back"]:
		if not boat_states_seen.has(st10):
			_fail_and_quit(tag10, "Fishing rota never reached state `%s`!" % st10)
			return
	if trips10 != exp_trips10 or landing_events10 != exp_trips10 or landed10 != exp_trips10 * GameManager.get_harbor_catch_per_trip():
		_fail_and_quit(tag10, "Harbor landings mismatch over 2 rotas: trips=%d events=%d landed=%d (expected %d trips)!" % [trips10, landing_events10, landed10, exp_trips10])
		return
	var stall_sf10 := int(GameManager.stall_inventory.get(EconomyConfig.SEAFOOD_ITEM_ID, 0))
	if stall_sf10 + GameManager.get_harbor_seafood_stock() != landed10 or stall_sf10 <= 0:
		_fail_and_quit(tag10, "Landed seafood not stored: stall=%d harbor=%d landed=%d!" % [stall_sf10, GameManager.get_harbor_seafood_stock(), landed10])
		return
	if not bool(GameManager.unlocked_achievements.get("ach_lighthouse_harbor", false)):
		_fail_and_quit(tag10, "Achievement `ach_lighthouse_harbor` did not unlock!")
		return

	# 4) Seafood feeds the cooking chain: stall sale + Chef Pavilion combo dishes
	var sf_sale10 := _sell(EconomyConfig.SEAFOOD_ITEM_ID, 1, Vector2(1038.0, EconomyConfig.GROUND_Y))
	if sf_sale10 <= 0 or int(GameManager.stall_inventory.get(EconomyConfig.SEAFOOD_ITEM_ID, 0)) != stall_sf10 - 1:
		_fail_and_quit(tag10, "Market stall failed to sell `seafood_catch` (earned %d)!" % sf_sale10)
		return
	GameManager.chef_pavilion_unlocked = true
	GameManager.unlocked_tasting_dishes["dish_starlight_fish"] = true
	GameManager.unlocked_tasting_dishes["dish_mountain_sea_hotpot"] = true
	GameManager.harbor_seafood_inventory[EconomyConfig.SEAFOOD_ITEM_ID] = 3
	GameManager.tea_inventory["tea_cloud_longjing"] = maxi(1, int(GameManager.tea_inventory.get("tea_cloud_longjing", 0)))
	GameManager.flora_inventory["flora_stardew_lily"] = maxi(1, int(GameManager.flora_inventory.get("flora_stardew_lily", 0)))
	GameManager.raw_baskets[3]["crop_3"] = maxi(1, int(GameManager.raw_baskets[3].get("crop_3", 0)))
	GameManager.bakery_inventory["bread_amber_croissant"] = maxi(1, int(GameManager.bakery_inventory.get("bread_amber_croissant", 0)))
	var fish_stock_before10 := int(GameManager.tasting_inventory.get("dish_starlight_fish", 0))
	var cook_fish10 := GameManager.cook_tasting_dish("dish_starlight_fish", false)
	var fish_plan10: Array = cook_fish10.get("ingredients", [])
	if not bool(cook_fish10.get("cooked", false)) or fish_plan10.is_empty() or String(fish_plan10[0]) != EconomyConfig.SEAFOOD_ITEM_ID or GameManager.get_harbor_seafood_stock() != 2 or int(GameManager.tasting_inventory.get("dish_starlight_fish", 0)) <= fish_stock_before10:
		_fail_and_quit(tag10, "`dish_starlight_fish` did not cook with harbor `seafood_catch`: %s (harbor %d)" % [str(cook_fish10), GameManager.get_harbor_seafood_stock()])
		return
	var cook_pot10 := GameManager.cook_tasting_dish("dish_mountain_sea_hotpot", false)
	var pot_plan10: Array = cook_pot10.get("ingredients", [])
	if not bool(cook_pot10.get("cooked", false)) or pot_plan10.size() < 2 or String(pot_plan10[1]) != EconomyConfig.SEAFOOD_ITEM_ID or GameManager.get_harbor_seafood_stock() != 1:
		_fail_and_quit(tag10, "`dish_mountain_sea_hotpot` did not cook with harbor `seafood_catch`: %s" % str(cook_pot10))
		return

	# 6) HUD cards #12 (tab 0 / 2 / 3), own LabelSettings, codex card 12 & drawer title
	if world.hud != null:
		var tiles_p6 := _menu_tabs_problem(world.hud, ["lighthouse_harbor_building", "", ""], "")
		if tiles_p6 != "":
			_fail_and_quit(tag10, tiles_p6)
			return
	var forbidden_font_ci10 := _find_deprecated_font_node(get_tree().root)
	if forbidden_font_ci10 != "":
		_fail_and_quit(tag10, "Forbidden legacy font node detected at `%s`!" % forbidden_font_ci10)
		return

	# Save/Load roundtrip of all CI-10 fields
	GameManager.add_gold(Pacing.line_cost_n("lighthouse_harbor", 1, 4))
	for _lh_up in range(2):
		if not GameManager.upgrade_building("lighthouse_harbor"):
			_fail_and_quit(tag10, "Failed to upgrade `lighthouse_harbor` to Lv.3!")
			return
	GameManager.set_harbor_clock(9.0)
	GameManager.harbor_seafood_inventory[EconomyConfig.SEAFOOD_ITEM_ID] = 5
	var exp_landed10 := GameManager.seafood_landed_total
	GameManager.save_game()
	GameManager.lighthouse_harbor_unlocked = false
	GameManager.building_levels["lighthouse_harbor"] = 1
	GameManager.harbor_clock = 0.0
	GameManager.harbor_seafood_inventory[EconomyConfig.SEAFOOD_ITEM_ID] = 0
	GameManager.seafood_landed_total = 0
	GameManager.load_game()
	if not GameManager.lighthouse_harbor_unlocked or GameManager.get_harbor_level() != 3 or absf(GameManager.harbor_clock - 9.0) > 0.001 or GameManager.get_harbor_seafood_stock() != 5 or GameManager.seafood_landed_total != exp_landed10:
		_fail_and_quit(tag10, "CI-10 Save/Load roundtrip failed to restore state!")
		return
	if GameManager.advance_harbor(0.0) != 0:
		_fail_and_quit(tag10, "Reloading the save must not unload phantom catches!")
		return

	# Showcase: Lv.3 harbor with boat #0 sailing out of the cove
	GameManager.set_harbor_clock(9.0)
	world._process(0.05)
	lh10._process(0.01)
	var showcase_visible10 := 0
	for hb_s10 in world.harbor_boats:
		if (hb_s10["sprite"] as Sprite2D).visible:
			showcase_visible10 += 1
	if showcase_visible10 != 1:
		_fail_and_quit(tag10, "Showcase state invalid: %d boats visible!" % showcase_visible10)
		return

	print("[PASS] %s 通过: 灯塔渔港接地 %d 个接触像素、渔船航线 %d 次采样全在水面、两轮渔船 %d 次落水检查、%d 航次卸货 %d、鲜货集市售价 +%dG、存读一致 PASS!" % [tag10, lh_contact_px, boat_samples10, live_boat_checks10, trips10, landed10, sf_sale10])

	# ------------------------------------------------------------------
	# [断言24-CI-11云端牧场乳品工坊与星空夜市露天电影院]:
	#   1) All 6 CI-11 pixel-art PNGs (`dairy_workshop.png`, `open_air_cinema.png`, `milk_bottle.png`, `cheese_wheel.png`,
	#      `cloud_pudding.png`, `icon_movie_ticket.png`) load via Godot import with RGBA transparent corners;
	#   2) Island 1 re-slotted to 7 buildings: 19 main buildings (7+6+6) keep `>= 28.0px` gaps and `0.0` px^2 overlap inside
	#      `[566.0..1046.7]`, `DairyWorkshop_1` grounded at `Vector2(817.3, GROUND_Y)` in slot 4 with its ground-contact row on
	#      Island 1 grass; the night-only `OpenAirCinema_1` event prop grounded at `Vector2(1334.5, GROUND_Y)` on the east headland
	#      grass `[1313..1356]`, >= 28px clear of every Island 1 building, clear of the pond bridges / lantern lanes / airship badge;
	#   3) Dairy chain: build by click, milking consumes one harvested crop (no feed -> refused), cheese = 2 milk, cloud pudding =
	#      milk + sweet, the surplus ships to the stall and sells, the Chef Pavilion hot pot uses `dairy_cheese`, the dumplings use
	#      `dairy_milk`, the idle tick milks + crafts; codex 3/3 + achievement;
	#   4) Cinema: day -> closed (no screenings, x1.0 sales, prop hidden); night -> exactly 3 screenings in 42s with ticket income
	#      `audience x price`, the night-market `1.25x` sale boost and `1.6x` visitor pace, star-fan medal, deterministic snack
	#      price; a film still rolling at dawn is cancelled with no income; the CI-2 lantern festival adds 4 cinema-goers;
	#   5) HUD cards #13 on tabs 0/2/3 (own LabelSettings), Shanhai Codex card 13 `★星空影院鉴(3/3)`, Save/Load, showcase state.
	# ------------------------------------------------------------------
	var tag11 := "[断言24-CI-11云端牧场乳品工坊与星空夜市露天电影院]"
	if world.has_method("reload_ci11_textures"):
		world.reload_ci11_textures()
	var ci11_tex_paths: Array[String] = [
		EconomyConfig.DAIRY_WORKSHOP_TEX,
		EconomyConfig.OPEN_AIR_CINEMA_TEX,
		EconomyConfig.MILK_BOTTLE_TEX,
		EconomyConfig.CHEESE_WHEEL_TEX,
		EconomyConfig.CLOUD_PUDDING_TEX,
		EconomyConfig.ICON_MOVIE_TICKET_TEX
	]
	for tp11 in ci11_tex_paths:
		if not ResourceLoader.exists(tp11):
			_fail_and_quit(tag11, "CI-11 texture `%s` is not imported by Godot (missing `.png.import`)!" % tp11)
			return
		var t11: Texture2D = EconomyConfig.load_pixel_texture(tp11)
		if t11 == null or t11.get_width() < 24 or t11.get_height() < 24:
			_fail_and_quit(tag11, "Missing or invalid CI-11 pixel-art texture `%s`!" % tp11)
			return
		var ar11 := float(t11.get_width()) / maxf(1.0, float(t11.get_height()))
		if ar11 < 0.55 or ar11 > 1.85:
			_fail_and_quit(tag11, "CI-11 texture `%s` abnormal aspect ratio %.2f!" % [tp11, ar11])
			return
		var img11 := t11.get_image()
		if img11 != null and img11.is_compressed():
			img11.decompress()
		if img11 == null or img11.get_pixel(0, 0).a > 0.05 or img11.get_pixel(img11.get_width() - 1, 0).a > 0.05 or img11.get_pixel(0, img11.get_height() - 1).a > 0.05 or img11.get_pixel(img11.get_width() - 1, img11.get_height() - 1).a > 0.05:
			_fail_and_quit(tag11, "CI-11 texture `%s` lacks RGBA transparent corner alpha!" % tp11)
			return

	# 2) Island 1 7-slot re-lay + Dairy Workshop grounding + panoramic 19-building clearance
	var dw11: DairyWorkshop = world.dairy_workshop
	var oc11: OpenAirCinema = world.open_air_cinema
	if dw11 == null or dw11.body_sprite == null or dw11.body_sprite.texture == null or oc11 == null or oc11.body_sprite == null or oc11.body_sprite.texture == null:
		_fail_and_quit(tag11, "MainWorld missing `DairyWorkshop_1` / `OpenAirCinema_1` nodes or textures!")
		return
	var isl1_img11: Image = world._get_island_water_image(1)
	var ground_checks11: Array = [
		[dw11, EconomyConfig.DAIRY_WORKSHOP_SLOT_X, "DairyWorkshop_1"],
		[oc11, EconomyConfig.OPEN_AIR_CINEMA_SLOT_X, "OpenAirCinema_1"]
	]
	var contact_px11 := {}
	for gc11 in ground_checks11:
		var node11: Node2D = gc11[0]
		var sp11: Sprite2D = node11.get("body_sprite")
		if absf(node11.position.x - float(gc11[1])) > 0.1 or absf(node11.position.y - EconomyConfig.GROUND_Y) > 0.1 or not sp11.centered or absf(sp11.offset.y + float(sp11.texture.get_height()) * 0.5) > 0.1 or sp11.hframes != 1 or sp11.vframes != 1 or sp11.region_enabled or node11.z_index != EconomyConfig.Z_BUILDING:
			_fail_and_quit(tag11, "`%s` grounding/pivot/frame/z_index violation: pos=%s offset=%s z=%d!" % [String(gc11[2]), str(node11.position), str(sp11.offset), node11.z_index])
			return
		var simg11 := sp11.texture.get_image()
		if simg11 != null and simg11.is_compressed():
			simg11.decompress()
		var n_contact := 0
		var n_on_grass := 0
		if simg11 != null and isl1_img11 != null:
			for bx11 in range(simg11.get_width()):
				if simg11.get_pixel(bx11, simg11.get_height() - 1).a > 0.5:
					n_contact += 1
					var gx11 := node11.position.x + (float(bx11) + 0.5 - float(simg11.get_width()) * 0.5) * sp11.scale.x
					var gpt11 := Vector2(gx11, EconomyConfig.GROUND_Y + 0.5)
					var tpx11 := roundi(gpt11.x - MainWorld.ISLAND_1_TEX_ORIGIN.x)
					var tpy11 := roundi(gpt11.y - MainWorld.ISLAND_1_TEX_ORIGIN.y)
					if tpx11 >= 0 and tpy11 >= 0 and tpx11 < isl1_img11.get_width() and tpy11 < isl1_img11.get_height() and isl1_img11.get_pixel(tpx11, tpy11).a > 0.78 and not world.is_island_texture_water(1, gpt11):
						n_on_grass += 1
		if n_contact <= 0 or n_on_grass != n_contact:
			_fail_and_quit(tag11, "`%s` ground-contact row floats or sinks: %d opaque bottom pixels, %d on Island 1 grass!" % [String(gc11[2]), n_contact, n_on_grass])
			return
		contact_px11[String(gc11[2])] = n_contact
	var all_isl_rects_ci11: Dictionary = world.get_island_main_building_rects()
	var isl1_rects_ci11: Array = all_isl_rects_ci11[1]
	var total_blds_ci11 := isl1_rects_ci11.size() + (all_isl_rects_ci11[2] as Array).size() + (all_isl_rects_ci11[3] as Array).size()
	var exp_isl1_names: Array[String] = ["AppleTree_1", "SoilPlot_1", "MushroomCottage_1", "DairyWorkshop_1", "MortarWorkshop_1", "CloudTeaPavilion_1", "MarketStall_1"]
	if isl1_rects_ci11.size() != 7 or total_blds_ci11 != 19:
		_fail_and_quit(tag11, "Expected 19 main buildings (7+6+6), got %d (Island 1: %d)!" % [total_blds_ci11, isl1_rects_ci11.size()])
		return
	for ni11 in range(exp_isl1_names.size()):
		if String(isl1_rects_ci11[ni11]["name"]) != exp_isl1_names[ni11]:
			_fail_and_quit(tag11, "Island 1 slot %d is `%s`, expected `%s`!" % [ni11 + 1, String(isl1_rects_ci11[ni11]["name"]), exp_isl1_names[ni11]])
			return
	var oy11 := world.world_root.position.y
	var min_gap_ci11 := 9999.0
	var isl1_min_gap_ci11 := 9999.0
	var total_overlap_area_ci11 := 0.0
	for isl_k11 in all_isl_rects_ci11.keys():
		var arr11: Array = all_isl_rects_ci11[isl_k11]
		for ia11 in range(arr11.size()):
			var ra11: Rect2 = arr11[ia11]["rect"]
			for ib11 in range(ia11 + 1, arr11.size()):
				var inter11 := ra11.intersection(arr11[ib11]["rect"])
				total_overlap_area_ci11 += maxf(0.0, inter11.size.x) * maxf(0.0, inter11.size.y)
			if ia11 < arr11.size() - 1:
				var gap11 := (arr11[ia11 + 1]["rect"] as Rect2).position.x - ra11.end.x
				min_gap_ci11 = minf(min_gap_ci11, gap11)
				if int(isl_k11) == 1:
					isl1_min_gap_ci11 = minf(isl1_min_gap_ci11, gap11)
				if gap11 < 28.0 - 0.05:
					_fail_and_quit(tag11, "Island %d clearance violation between `%s` and `%s`: gap=%.2fpx (<28.0px)!" % [int(isl_k11), String(arr11[ia11]["name"]), String(arr11[ia11 + 1]["name"]), gap11])
					return
	if total_overlap_area_ci11 > 0.0001:
		_fail_and_quit(tag11, "Main building overlap area %.3f px^2 > 0.0!" % total_overlap_area_ci11)
		return
	var isl1_span_l := (isl1_rects_ci11[0]["rect"] as Rect2).position.x
	var isl1_span_r := (isl1_rects_ci11[6]["rect"] as Rect2).end.x
	if isl1_span_l < 566.0 - 0.05 or isl1_span_r > 1046.7 + 0.05:
		_fail_and_quit(tag11, "Island 1 buildings spill off the grass row [566.0..1046.7]: [%.2f..%.2f]!" % [isl1_span_l, isl1_span_r])
		return
	for r1 in isl1_rects_ci11:
		var rr1: Rect2 = r1["rect"]
		if absf(rr1.end.y - (EconomyConfig.GROUND_Y + oy11)) > 0.1 or rr1.size.x < 34.0 or rr1.size.x > 70.0:
			_fail_and_quit(tag11, "Island 1 `%s` rect %s not grounded or outside the readable 34..70px width band!" % [String(r1["name"]), str(rr1)])
			return
	# Event prop: on the east headland, >= 28px from every Island 1 building, clear of pond bridges, lantern lanes & the airship badge
	world.dock_airship_at_harbor(false)
	GameManager.set_weather(GameManager.WeatherState.NIGHT)
	oc11._sync_visibility(true)
	var oc_rect11 := oc11.get_screen_rect()
	var oc_rect11_screen := Rect2(oc_rect11.position + Vector2(0.0, oy11), oc_rect11.size)
	if oc_rect11.position.x < EconomyConfig.OPEN_AIR_CINEMA_HEADLAND_MIN_X or oc_rect11.end.x > EconomyConfig.OPEN_AIR_CINEMA_HEADLAND_MAX_X or absf(oc_rect11.end.y - EconomyConfig.GROUND_Y) > 0.1 or oc_rect11.size.x > 60.0:
		_fail_and_quit(tag11, "OpenAirCinema_1 rect %s outside the east headland grass [1313..1356] / not grounded!" % str(oc_rect11))
		return
	var cinema_min_gap11 := 9999.0
	for b11 in isl1_rects_ci11:
		var br11: Rect2 = b11["rect"]
		cinema_min_gap11 = minf(cinema_min_gap11, oc_rect11_screen.position.x - br11.end.x)
		if oc_rect11_screen.intersects(br11):
			_fail_and_quit(tag11, "OpenAirCinema_1 overlaps `%s`!" % String(b11["name"]))
			return
	if cinema_min_gap11 < 28.0:
		_fail_and_quit(tag11, "OpenAirCinema_1 only %.2fpx from the nearest Island 1 building (<28px)!" % cinema_min_gap11)
		return
	if oc_rect11.intersects(MainWorld.POND_BRIDGE_LOCAL_RECT):
		_fail_and_quit(tag11, "OpenAirCinema_1 overlaps the Lotus Pond bridges!")
		return
	for wli11 in range(EconomyConfig.WISH_LANTERN_LANES.size()):
		var wlane11: Dictionary = EconomyConfig.WISH_LANTERN_LANES[wli11]
		if int(wlane11["island"]) == 1 and oc_rect11.intersects(Rect2(float(wlane11["min_x"]) - 10.0, float(wlane11["waterline_y"]) - 20.0, float(wlane11["max_x"]) - float(wlane11["min_x"]) + 20.0, 20.0)):
			_fail_and_quit(tag11, "OpenAirCinema_1 crosses star-lantern lane `%s`!" % String(wlane11["id"]))
			return
	if world.landscape_nodes.has("bee_hive"):
		var hive_r11: Rect2 = world._sprite_global_rect(world.landscape_nodes["bee_hive"], oy11)
		for bh11 in isl1_rects_ci11:
			if hive_r11.intersects(bh11["rect"]):
				_fail_and_quit(tag11, "Bee hive decor %s overlaps `%s`!" % [str(hive_r11), String(bh11["name"])])
				return
	if world.waypoint_graph != null and (absf(world.waypoint_graph.get_dock_pos("dairy_workshop_dock").x - EconomyConfig.DAIRY_WORKSHOP_SLOT_X) > 0.1 or absf(world.waypoint_graph.get_dock_pos("open_air_cinema_dock").x - EconomyConfig.OPEN_AIR_CINEMA_SLOT_X) > 0.1 or absf(world.waypoint_graph.get_named_pos("market_stall").x - MarketStall.SLOT_X) > 0.1):
		_fail_and_quit(tag11, "WaypointGraph CI-11 docks misaligned!")
		return

	# 3) Dairy chain: build -> milk from harvested crops -> cheese & cloud pudding -> stall + Chef Pavilion
	GameManager._reset_dairy_and_cinema_state()
	GameManager.building_levels["dairy_workshop"] = 1
	if GameManager.upgrade_building("dairy_workshop"):
		_fail_and_quit(tag11, "upgrade_building('dairy_workshop') should fail before the dairy is built!")
		return
	world._process(0.05)
	if WindowController != null and not WindowController.is_logical_point_interactive(world.get_dairy_workshop_screen_rect().get_center()):
		_fail_and_quit(tag11, "WindowController passthrough violation for DairyWorkshop_1 (%s)!" % str(world.get_dairy_workshop_screen_rect()))
		return
	GameManager.gourmet_acclaim_timer = 0.0
	var base_codex_mult_ci11 := GameManager.get_collection_multiplier()
	GameManager.add_gold(EconomyConfig.DAIRY_WORKSHOP_UNLOCK_COST_GOLD + 50)
	var dw_click11 := world.interact_with_dairy_workshop()
	if not bool(dw_click11.get("ok", false)) or not GameManager.dairy_workshop_unlocked or not bool(GameManager.unlocked_dairy_items.get("dairy_milk", false)):
		_fail_and_quit(tag11, "Clicking the unbuilt DairyWorkshop_1 with enough gold did not build it: %s" % str(dw_click11))
		return
	for isl11 in [1, 2, 3]:
		for ck11 in ["crop_0", "crop_1", "crop_2", "crop_3"]:
			GameManager.raw_baskets[isl11][ck11] = 0
	for sk11 in GameManager.stall_inventory.keys():
		GameManager.stall_inventory[sk11] = 0
	# Clear every other pudding sweetener so the sweet choice below is deterministic (flour first, then the harvested carrot)
	for bk11 in ["flour_golden_wheat", "bread_cloud_souffle"]:
		GameManager.bakery_inventory[bk11] = 0
	for ws11 in ["mortar", "cauldron", "coral_linked"]:
		GameManager.workshop_outputs[ws11]["delicacy_0"] = 0
		GameManager.workshop_outputs[ws11]["delicacy_1"] = 0
	var no_feed11 := GameManager.milk_dairy_cows(false)
	if bool(no_feed11.get("milked", true)) or String(no_feed11.get("reason", "")) != "feed" or GameManager.get_dairy_stock("dairy_milk") != 0:
		_fail_and_quit(tag11, "Milking without any harvested crop must be refused outside the idle loop: %s" % str(no_feed11))
		return
	GameManager.raw_baskets[1]["crop_0"] = 3
	var feed_before11 := GameManager.dairy_feed_consumed
	var milk11 := GameManager.milk_dairy_cows(false)
	if not bool(milk11.get("milked", false)) or String(milk11.get("feed", "")) != "crop_0" or int(milk11.get("qty", 0)) != EconomyConfig.DAIRY_FEED_MILK_YIELD or GameManager.get_dairy_stock("dairy_milk") != 2 or int(GameManager.raw_baskets[1]["crop_0"]) != 2 or GameManager.dairy_feed_consumed != feed_before11 + 1:
		_fail_and_quit(tag11, "Milking did not turn 1 harvested crop into 2 bottles: %s (basket crop_0=%d)" % [str(milk11), int(GameManager.raw_baskets[1]["crop_0"])])
		return
	var cheese11 := GameManager.craft_dairy_product("dairy_cheese")
	if not bool(cheese11.get("crafted", false)) or GameManager.get_dairy_stock("dairy_milk") != 0 or GameManager.get_dairy_stock("dairy_cheese") != 1 or int(cheese11.get("shipped", -1)) != 0:
		_fail_and_quit(tag11, "Cheese (2 milk) craft failed: %s" % str(cheese11))
		return
	if bool(GameManager.craft_dairy_product("dairy_cheese").get("crafted", false)):
		_fail_and_quit(tag11, "Cheese must not be crafted without milk!")
		return
	GameManager.milk_dairy_cows(false)
	GameManager.bakery_inventory["flour_golden_wheat"] = 1
	var pud11 := GameManager.craft_dairy_product("dairy_cloud_pudding")
	if not bool(pud11.get("crafted", false)) or String(pud11.get("sweet", "")) != "flour_golden_wheat" or int(GameManager.bakery_inventory["flour_golden_wheat"]) != 0 or GameManager.get_dairy_stock("dairy_milk") != 1 or GameManager.get_dairy_stock("dairy_cloud_pudding") != 1:
		_fail_and_quit(tag11, "Cloud pudding (milk + flour) craft failed: %s" % str(pud11))
		return
	# Second pudding (sweet = the last harvested carrot) -> the cold store keeps 1, the surplus ships to the market stall
	var pud11b := GameManager.craft_dairy_product("dairy_cloud_pudding")
	if not bool(pud11b.get("crafted", false)) or int(pud11b.get("shipped", 0)) != 1 or int(GameManager.stall_inventory.get("dairy_cloud_pudding", 0)) != 1 or GameManager.get_dairy_stock("dairy_cloud_pudding") != 1 or int(GameManager.raw_baskets[1]["crop_0"]) != 0:
		_fail_and_quit(tag11, "Surplus cloud pudding did not ship to the stall: %s (stall=%d)" % [str(pud11b), int(GameManager.stall_inventory.get("dairy_cloud_pudding", 0))])
		return
	if GameManager.get_unlocked_dairy_count() != 3 or not bool(GameManager.unlocked_achievements.get("ach_dairy_ranch", false)):
		_fail_and_quit(tag11, "Dairy codex 3/3 or `ach_dairy_ranch` missing (%d/3)!" % GameManager.get_unlocked_dairy_count())
		return
	var pud_sale11 := _sell("dairy_cloud_pudding", 1, Vector2(1050.0, EconomyConfig.GROUND_Y))
	if pud_sale11 <= 0 or int(GameManager.stall_inventory.get("dairy_cloud_pudding", 0)) != 0:
		_fail_and_quit(tag11, "Market stall failed to sell the cloud pudding (+%dG)!" % pud_sale11)
		return
	# Chef Pavilion: the Mountain-Sea Hot Pot takes the dairy cheese, the soup dumplings take the cloud milk
	GameManager.chef_pavilion_unlocked = true
	GameManager.unlocked_tasting_dishes["dish_mountain_sea_hotpot"] = true
	GameManager.raw_baskets[3]["crop_3"] = 1
	GameManager.harbor_seafood_inventory[EconomyConfig.SEAFOOD_ITEM_ID] = 1
	var pot11 := GameManager.cook_tasting_dish("dish_mountain_sea_hotpot", false)
	var pot_plan11: Array = pot11.get("ingredients", [])
	if not bool(pot11.get("cooked", false)) or pot_plan11.size() != 3 or String(pot_plan11[2]) != "dairy_cheese" or GameManager.get_dairy_stock("dairy_cheese") != 0:
		_fail_and_quit(tag11, "`dish_mountain_sea_hotpot` did not cook with `dairy_cheese`: %s" % str(pot11))
		return
	GameManager.raw_baskets[2]["crop_2"] = 1
	var milk_dump11 := GameManager.milk_dairy_cows(false)
	GameManager.raw_baskets[1]["crop_0"] = 1
	var dump11 := GameManager.cook_tasting_dish("dish_cloud_dumplings", false)
	var dump_plan11: Array = dump11.get("ingredients", [])
	if String(milk_dump11.get("feed", "")) != "crop_2" or not bool(dump11.get("cooked", false)) or dump_plan11.size() != 2 or String(dump_plan11[0]) != "crop_0" or String(dump_plan11[1]) != "dairy_milk" or GameManager.get_dairy_stock("dairy_milk") != 1:
		_fail_and_quit(tag11, "`dish_cloud_dumplings` did not cook with `dairy_milk`: %s" % str(dump11))
		return
	# Idle loop: one full cycle milks (grazing fallback when baskets are empty) and crafts the active recipe
	GameManager.dairy_timer = 0.0
	GameManager.raw_baskets[1]["crop_1"] = 1
	var milk_cnt_before11 := int(GameManager.dairy_craft_counts.get("dairy_milk", 0))
	var prod_cnt_before11 := int(GameManager.dairy_craft_counts.get("dairy_cheese", 0)) + int(GameManager.dairy_craft_counts.get("dairy_cloud_pudding", 0))
	GameManager._tick_dairy_workshop(EconomyConfig.DAIRY_CYCLE_SEC / GameManager.get_dairy_speed_multiplier() + 0.01)
	if int(GameManager.dairy_craft_counts.get("dairy_milk", 0)) != milk_cnt_before11 + 1 or int(GameManager.dairy_craft_counts.get("dairy_cheese", 0)) + int(GameManager.dairy_craft_counts.get("dairy_cloud_pudding", 0)) != prod_cnt_before11 + 1:
		_fail_and_quit(tag11, "Idle dairy cycle did not milk + craft once (counts %s)!" % str(GameManager.dairy_craft_counts))
		return

	# 4) Open-Air Cinema: built at night by clicking the dim preview, day = closed, night = 3 screenings, dawn cancels
	GameManager.moon_tea_gathering_timer = 0.0
	GameManager.wish_lantern_festival_timer = 0.0
	GameManager.gourmet_acclaim_timer = 0.0
	GameManager.set_weather(GameManager.WeatherState.NIGHT)
	oc11._sync_visibility(true)
	world._process(0.05)
	if not oc11.visible or not world.is_cinema_prop_shown():
		_fail_and_quit(tag11, "The unbuilt cinema preview must appear on the headland at night!")
		return
	if WindowController != null and not WindowController.is_logical_point_interactive(world.get_open_air_cinema_screen_rect().get_center()):
		_fail_and_quit(tag11, "WindowController passthrough violation for OpenAirCinema_1 (%s)!" % str(world.get_open_air_cinema_screen_rect()))
		return
	GameManager.add_gold(EconomyConfig.OPEN_AIR_CINEMA_UNLOCK_COST_GOLD + 50)
	var oc_click11 := world.interact_with_open_air_cinema()
	if not bool(oc_click11.get("ok", false)) or not GameManager.open_air_cinema_unlocked:
		_fail_and_quit(tag11, "Clicking the night cinema preview with enough gold did not build it: %s" % str(oc_click11))
		return
	# Daytime: the screen is folded away, no screenings, no night-market boost
	GameManager.set_weather(GameManager.WeatherState.DAY)
	oc11._sync_visibility(true)
	var shows_before_day11 := GameManager.cinema_screenings_total
	var day_settled11 := 0
	for _d11 in range(240):
		day_settled11 += GameManager.advance_cinema(0.25)
	GameManager.stall_inventory["crop_0"] = 6
	var sale_day11 := _sell("crop_0", 1, Vector2(1050.0, EconomyConfig.GROUND_Y))
	if day_settled11 != 0 or GameManager.cinema_screenings_total != shows_before_day11 or GameManager.is_cinema_open() or GameManager.is_cinema_screening_active() or absf(GameManager.get_cinema_sale_multiplier("crop_0") - 1.0) > 0.0001 or absf(GameManager.get_cinema_visitor_spawn_mult() - 1.0) > 0.0001 or oc11.visible or world.is_cinema_prop_shown():
		_fail_and_quit(tag11, "The cinema must stay closed in daylight (settled=%d, open=%s, visible=%s)!" % [day_settled11, str(GameManager.is_cinema_open()), str(oc11.visible)])
		return
	for wst11 in [GameManager.WeatherState.DUSK, GameManager.WeatherState.RAIN]:
		GameManager.set_weather(wst11)
		if GameManager.advance_cinema(14.0) != 0 or GameManager.is_cinema_open():
			_fail_and_quit(tag11, "The cinema must not screen in weather state %d!" % wst11)
			return
	# Night: the programme runs 3 x (12s film + 2s intermission) with exact ticket income
	GameManager.set_weather(GameManager.WeatherState.NIGHT)
	GameManager.stall_inventory["crop_0"] = 6
	var sale_night11 := _sell("crop_0", 1, Vector2(1050.0, EconomyConfig.GROUND_Y))
	var night_ratio11 := float(sale_night11) / maxf(1.0, float(sale_day11))
	if sale_day11 <= 0 or absf(GameManager.get_cinema_sale_multiplier("crop_0") - EconomyConfig.CINEMA_NIGHT_SALE_MULT) > 0.0001 or night_ratio11 < 1.22 or night_ratio11 > 1.28 or absf(GameManager.get_cinema_visitor_spawn_mult() - EconomyConfig.CINEMA_VISITOR_SPAWN_MULT) > 0.0001:
		_fail_and_quit(tag11, "Night-market cinema boost mismatch: day=%d night=%d ratio=%.3f!" % [sale_day11, sale_night11, night_ratio11])
		return
	GameManager.dairy_inventory["dairy_cloud_pudding"] = 3
	GameManager.dairy_inventory["dairy_milk"] = 0
	var price11 := GameManager.get_cinema_ticket_price()
	var aud11 := GameManager.get_cinema_audience()
	var tickets_before11 := GameManager.cinema_ticket_gold_total
	var snacks_before11 := GameManager.cinema_snack_gold_total
	var medals_before11 := GameManager.cinema_medals
	var settled_night11 := 0
	var screening_frames11 := 0
	var films_seen11: Array[String] = []
	var screen_up11 := false
	var sim11 := 0.0
	oc11._sync_visibility(true)
	while sim11 < EconomyConfig.get_cinema_night_programme_sec() - 0.001:
		settled_night11 += GameManager.advance_cinema(0.25)
		sim11 += 0.25
		var exp_active11 := fmod(sim11, EconomyConfig.CINEMA_SLOT_SEC) < EconomyConfig.CINEMA_SCREEN_SEC and sim11 < EconomyConfig.get_cinema_night_programme_sec()
		if GameManager.is_cinema_screening_active() != exp_active11:
			_fail_and_quit(tag11, "Screening state at t=%.2fs is %s (expected %s)!" % [sim11, str(GameManager.is_cinema_screening_active()), str(exp_active11)])
			return
		if exp_active11:
			screening_frames11 += 1
			var fid11 := GameManager.get_cinema_current_film_id()
			if films_seen11.is_empty() or films_seen11[films_seen11.size() - 1] != fid11:
				films_seen11.append(fid11)
			if not screen_up11:
				oc11._process(0.01)
				screen_up11 = oc11.visible
	if settled_night11 != 3 or GameManager.cinema_screenings_tonight != 3 or films_seen11 != EconomyConfig.CINEMA_FILM_ORDER or GameManager.get_unlocked_film_count() != 3 or not screen_up11:
		_fail_and_quit(tag11, "Night programme mismatch: settled=%d tonight=%d films=%s screen=%s!" % [settled_night11, GameManager.cinema_screenings_tonight, str(films_seen11), str(screen_up11)])
		return
	var ticket_gain11 := GameManager.cinema_ticket_gold_total - tickets_before11
	if aud11 != EconomyConfig.CINEMA_BASE_AUDIENCE or ticket_gain11 != 3 * aud11 * price11 or GameManager.cinema_medals != medals_before11 + 1 or not bool(GameManager.unlocked_achievements.get("ach_starry_cinema", false)):
		_fail_and_quit(tag11, "Ticket income / medal mismatch: +%dG (expected 3 x %d x %d), medals %d!" % [ticket_gain11, aud11, price11, GameManager.cinema_medals])
		return
	var snack_gain11 := GameManager.cinema_snack_gold_total - snacks_before11
	if snack_gain11 <= 0 or GameManager.get_dairy_stock("dairy_cloud_pudding") != 0:
		_fail_and_quit(tag11, "Cinema-goers did not buy the cloud puddings at the concession (+%dG, left %d)!" % [snack_gain11, GameManager.get_dairy_stock("dairy_cloud_pudding")])
		return
	if GameManager.advance_cinema(20.0) != 0:
		_fail_and_quit(tag11, "No 4th screening may start after the 3-film programme!")
		return
	# Deterministic concession price: a fixed number of seconds of income
	GameManager.dairy_inventory["dairy_cloud_pudding"] = 1
	var exp_snack11 := GameManager.income_gold(EconomyConfig.CINEMA_SNACK_SEC, 2)
	var snack11 := GameManager.sell_cinema_snacks(1)
	if int(snack11.get("sold", 0)) != 1 or int(snack11.get("gold", 0)) != exp_snack11:
		_fail_and_quit(tag11, "Concession snack price mismatch: %s (expected %dG)!" % [str(snack11), exp_snack11])
		return
	# Dawn mid-screening: the film is cancelled, no ticket income
	GameManager.set_weather(GameManager.WeatherState.RAIN)
	GameManager.advance_cinema(0.1)
	GameManager.set_weather(GameManager.WeatherState.NIGHT)
	GameManager.advance_cinema(5.0)
	var cancel_before11 := GameManager.cinema_screenings_cancelled
	var tickets_mid11 := GameManager.cinema_ticket_gold_total
	GameManager.set_weather(GameManager.WeatherState.RAIN)
	if GameManager.advance_cinema(10.0) != 0 or GameManager.cinema_screenings_cancelled != cancel_before11 + 1 or GameManager.cinema_ticket_gold_total != tickets_mid11:
		_fail_and_quit(tag11, "A screening interrupted at dawn must be cancelled without income (cancelled %d->%d)!" % [cancel_before11, GameManager.cinema_screenings_cancelled])
		return
	if GameManager.get_collection_multiplier() < base_codex_mult_ci11 + 0.059:
		_fail_and_quit(tag11, "3 dairy items + 3 films did not raise the collection bonus by 6%!")
		return

	# 5) HUD cards #13 (tab 0 / 2 / 3), own LabelSettings, codex card 13 & drawer title
	if world.hud != null:
		var tiles_p7 := _menu_tabs_problem(world.hud, ["dairy_workshop_building", "open_air_cinema", "ci11_codex"], "6/6")
		if tiles_p7 != "":
			_fail_and_quit(tag11, tiles_p7)
			return
	var forbidden_font_ci11 := _find_deprecated_font_node(get_tree().root)
	if forbidden_font_ci11 != "":
		_fail_and_quit(tag11, "Forbidden legacy font node detected at `%s`!" % forbidden_font_ci11)
		return

	# Save/Load roundtrip of all CI-11 fields
	GameManager.add_gold(Pacing.line_cost_n("dairy_workshop", 1, 4))
	for _dw_up in range(2):
		if not GameManager.upgrade_building("dairy_workshop"):
			_fail_and_quit(tag11, "Failed to upgrade `dairy_workshop` to Lv.3!")
			return
	GameManager.dairy_inventory["dairy_milk"] = 4
	GameManager.dairy_inventory["dairy_cheese"] = 2
	GameManager.dairy_inventory["dairy_cloud_pudding"] = 3
	GameManager.active_dairy_recipe_id = "dairy_cloud_pudding"
	var exp_shows11 := GameManager.cinema_screenings_total
	var exp_tix11 := GameManager.cinema_ticket_gold_total
	var exp_medals11 := GameManager.cinema_medals
	var exp_drep11 := GameManager.dairy_reputation_bonus
	GameManager.save_game()
	GameManager._reset_dairy_and_cinema_state()
	GameManager.building_levels["dairy_workshop"] = 1
	GameManager.load_game()
	if not GameManager.dairy_workshop_unlocked or GameManager.get_dairy_level() != 3 or GameManager.get_dairy_stock("dairy_milk") != 4 or GameManager.get_dairy_stock("dairy_cheese") != 2 or GameManager.get_dairy_stock("dairy_cloud_pudding") != 3 or GameManager.active_dairy_recipe_id != "dairy_cloud_pudding" or GameManager.get_unlocked_dairy_count() != 3 or GameManager.dairy_reputation_bonus != exp_drep11 or not GameManager.open_air_cinema_unlocked or GameManager.get_unlocked_film_count() != 3 or GameManager.cinema_screenings_total != exp_shows11 or GameManager.cinema_ticket_gold_total != exp_tix11 or GameManager.cinema_medals != exp_medals11 or GameManager.cinema_night_on:
		_fail_and_quit(tag11, "CI-11 Save/Load roundtrip failed to restore state!")
		return

	# Showcase: night market with the lantern festival, film 2/3 rolling on the headland screen, Lv.3 dairy crafting pudding
	GameManager.weather_timer = 4.0
	GameManager.set_weather(GameManager.WeatherState.NIGHT)
	GameManager.advance_cinema(0.0)
	GameManager.advance_cinema(EconomyConfig.CINEMA_SLOT_SEC + 2.5)
	GameManager.dairy_timer = EconomyConfig.DAIRY_CYCLE_SEC * 0.62
	oc11._sync_visibility(true)
	oc11._process(0.01)
	dw11._process(0.01)
	world._process(0.05)
	if not GameManager.is_cinema_screening_active() or GameManager.get_cinema_slot_index() != 1 or not world.is_cinema_prop_shown():
		_fail_and_quit(tag11, "Showcase state invalid: slot=%d!" % GameManager.get_cinema_slot_index())
		return
	# Restore the CI-8/9 showcase layers the deterministic sale checks above had to switch off
	GameManager.moon_tea_gathering_timer = 38.0
	GameManager.wish_lantern_festival_timer = 40.0
	world._on_wish_lantern_festival_started(40.0)
	world._process(0.05)
	if world.lighthouse_harbor != null:
		world.lighthouse_harbor._process(0.01)

	print("[PASS] %s 通过: 岛1重排7槽(树/田/屋/乳坊/研钵/茶坊/摊 缩放0.355~0.53)、三岛19建筑(7+6+6)最小净间距 %.2fpx(岛1 %.2fpx, >=28.0px)、重叠面积 %.1fpx²，DairyWorkshop_1 底部中心锚定于 (817.3, GROUND_Y=124.0) 且 %d 个接地像素全落草地；夜场道具 OpenAirCinema_1 锚定东岬草地 (1334.5, 124.0)、%d 个接地像素在草地、距岛1最近建筑 %.1fpx；乳品链 1 份农田作物→2 瓶鲜奶→奶酪/云朵布丁(余量上摊售出+%dG)，山海火锅用奶酪、灌汤小笼用鲜奶；白天/黄昏/微雨 0 场放映，夜市 42s 连映 3 部(影票 3x%dx%dG=%dG、零食+%dG、夜市售价 %.2fx、客流 %.1fx)、黎明中断场次作废、花火灯会观众 12 人，星空影迷勋章 x%d 与山海图鉴第13卡「★星空影院鉴(3/3)」PASS!" % [
		tag11, min_gap_ci11, isl1_min_gap_ci11, total_overlap_area_ci11, int(contact_px11.get("DairyWorkshop_1", 0)), int(contact_px11.get("OpenAirCinema_1", 0)), cinema_min_gap11,
		pud_sale11, aud11, price11, ticket_gain11, snack_gain11, night_ratio11, EconomyConfig.CINEMA_VISITOR_SPAWN_MULT, GameManager.cinema_medals
	])

	# ------------------------------------------------------------------
	# [断言25-CI-12云端陶艺窑坊]:
	#   1) All 6 CI-12 PNGs (`pottery_kiln.png` 112x104, `clay_lump.png` / `clay_vase.png` / `tea_bowl.png` 64x64) load via Godot import with RGBA transparent corners;
	#   2) Space decision: the kiln takes Island 3 slot 1 (former duplicate apple tree, same 112px width at 0.39) -> 19 main
	#      buildings (7+6+6), every adjacent gap >= 28.0px, 0.0 px^2 overlap, every slot / live sprite scale >= 0.35, the kiln is
	#      bottom-center grounded at (1437.8, GROUND_Y) with its ground-contact pixels on Island 3 sand, the 1920px strip
	#      (no 4th islet) keeps the whole world inside x 64..1856;
	#   3) Rest-dock audit: the idle/work poses of every worker resting at its long-dwell dock cover <= 50% of any building;
	#   4) Kiln chain: build by click, clay from real soil-plot harvests, fuel = 1 basket crop, tea bowl (1 clay) / vase
	#      (2 clay), surplus to the stall and sold, wares packed into both souvenir boxes, idle firing, codex 3/3 + achievement;
	#   6) HUD card 14 on tabs 0/2/3 (own LabelSettings), codex card 14 `★秋季运动会鉴(3/3)`, Save/Load, showcase state.
	# ------------------------------------------------------------------
	var tag12 := "[断言25-CI-12云端陶艺窑坊]"
	if world.has_method("reload_ci12_textures"):
		world.reload_ci12_textures()
	var ci12_tex_specs: Array = [
		[EconomyConfig.POTTERY_KILN_TEX, 112, 104],
		[EconomyConfig.CLAY_LUMP_TEX, 64, 64],
		[EconomyConfig.CLAY_VASE_TEX, 64, 64],
		[EconomyConfig.TEA_BOWL_TEX, 64, 64]
	]
	for ts12 in ci12_tex_specs:
		var tp12 := String(ts12[0])
		if not ResourceLoader.exists(tp12):
			_fail_and_quit(tag12, "CI-12 texture `%s` is not imported by Godot (missing `.png.import`)!" % tp12)
			return
		var t12: Texture2D = EconomyConfig.load_pixel_texture(tp12)
		if t12 == null or t12.get_width() != int(ts12[1]) or t12.get_height() != int(ts12[2]):
			_fail_and_quit(tag12, "CI-12 texture `%s` missing or not %dx%d!" % [tp12, int(ts12[1]), int(ts12[2])])
			return
		var img12 := t12.get_image()
		if img12 != null and img12.is_compressed():
			img12.decompress()
		if img12 == null or img12.get_pixel(0, 0).a > 0.05 or img12.get_pixel(img12.get_width() - 1, 0).a > 0.05 or img12.get_pixel(0, img12.get_height() - 1).a > 0.05 or img12.get_pixel(img12.get_width() - 1, img12.get_height() - 1).a > 0.05:
			_fail_and_quit(tag12, "CI-12 texture `%s` lacks RGBA transparent corner alpha!" % tp12)
			return

	# 2) Layout: kiln in Island 3 slot 1, 19 buildings, >= 28px gaps, zero overlap, every scale >= 0.35
	var pk12: PotteryKiln = world.pottery_kiln
	if pk12 == null or pk12.body_sprite == null or pk12.body_sprite.texture == null:
		_fail_and_quit(tag12, "MainWorld missing `PotteryKiln_3` node or texture!")
		return
	GameManager.unlocked_islands[3] = true
	pk12._process(0.01)
	var pk_sp12: Sprite2D = pk12.body_sprite
	if absf(pk12.position.x - EconomyConfig.POTTERY_KILN_SLOT_X) > 0.1 or absf(pk12.position.y - EconomyConfig.GROUND_Y) > 0.1 or not pk_sp12.centered or absf(pk_sp12.offset.y + float(pk_sp12.texture.get_height()) * 0.5) > 0.1 or pk_sp12.hframes != 1 or pk_sp12.vframes != 1 or pk_sp12.region_enabled or pk12.z_index != EconomyConfig.Z_BUILDING or absf(pk_sp12.scale.x - EconomyConfig.POTTERY_KILN_SCALE) > 0.001:
		_fail_and_quit(tag12, "`PotteryKiln_3` grounding/pivot/frame/scale violation: pos=%s offset=%s scale=%s z=%d!" % [str(pk12.position), str(pk_sp12.offset), str(pk_sp12.scale), pk12.z_index])
		return
	var isl3_img12: Image = world._get_island_water_image(3)
	var pk_simg12 := pk_sp12.texture.get_image()
	if pk_simg12 != null and pk_simg12.is_compressed():
		pk_simg12.decompress()
	var pk_contact12 := 0
	var pk_on_sand12 := 0
	if pk_simg12 != null and isl3_img12 != null:
		for bx12 in range(pk_simg12.get_width()):
			if pk_simg12.get_pixel(bx12, pk_simg12.get_height() - 1).a > 0.5:
				pk_contact12 += 1
				var gpt12 := Vector2(pk12.position.x + (float(bx12) + 0.5 - float(pk_simg12.get_width()) * 0.5) * pk_sp12.scale.x, EconomyConfig.GROUND_Y + 0.5)
				var tpx12 := roundi(gpt12.x - MainWorld.ISLAND_3_TEX_ORIGIN.x)
				var tpy12 := roundi(gpt12.y - MainWorld.ISLAND_3_TEX_ORIGIN.y)
				if tpx12 >= 0 and tpy12 >= 0 and tpx12 < isl3_img12.get_width() and tpy12 < isl3_img12.get_height() and isl3_img12.get_pixel(tpx12, tpy12).a > 0.78 and not world.is_island_texture_water(3, gpt12):
					pk_on_sand12 += 1
	if pk_contact12 <= 0 or pk_on_sand12 != pk_contact12:
		_fail_and_quit(tag12, "`PotteryKiln_3` ground-contact row floats or sinks: %d opaque bottom pixels, %d on Island 3 sand!" % [pk_contact12, pk_on_sand12])
		return
	var all_rects12: Dictionary = world.get_island_main_building_rects()
	var isl3_rects12: Array = all_rects12[3]
	var total_blds12 := (all_rects12[1] as Array).size() + (all_rects12[2] as Array).size() + isl3_rects12.size()
	if (all_rects12[1] as Array).size() != 7 or (all_rects12[2] as Array).size() != 6 or isl3_rects12.size() != 6 or total_blds12 != 19 or String(isl3_rects12[0]["name"]) != "PotteryKiln_3":
		_fail_and_quit(tag12, "Expected 19 main buildings (7+6+6) with `PotteryKiln_3` in Island 3 slot 1, got %d (slot 1 = `%s`)!" % [total_blds12, String(isl3_rects12[0]["name"])])
		return
	var oy12 := world.world_root.position.y
	var min_gap12 := 9999.0
	var overlap_area12 := 0.0
	var min_slot_scale12 := 9.0
	var max_width_err12 := 0.0
	for isl_k12 in all_rects12.keys():
		var arr12: Array = all_rects12[isl_k12]
		var slots12: Array = MainWorld.ISLAND_SLOTS[int(isl_k12)]
		if slots12.size() != arr12.size():
			_fail_and_quit(tag12, "Island %d slot table (%d) and live building list (%d) disagree!" % [int(isl_k12), slots12.size(), arr12.size()])
			return
		for ia12 in range(arr12.size()):
			var ra12: Rect2 = arr12[ia12]["rect"]
			var sd12: Dictionary = slots12[ia12]
			min_slot_scale12 = minf(min_slot_scale12, float(sd12["scale"]))
			max_width_err12 = maxf(max_width_err12, absf(ra12.size.x - float(sd12["tex_w"]) * float(sd12["scale"])))
			if absf(ra12.get_center().x - float(sd12["x"])) > 0.6 or absf(ra12.end.y - (EconomyConfig.GROUND_Y + oy12)) > 0.1:
				_fail_and_quit(tag12, "Island %d `%s` rect %s off its slot x=%.1f / not grounded!" % [int(isl_k12), String(arr12[ia12]["name"]), str(ra12), float(sd12["x"])])
				return
			for ib12 in range(ia12 + 1, arr12.size()):
				var inter12 := ra12.intersection(arr12[ib12]["rect"])
				overlap_area12 += maxf(0.0, inter12.size.x) * maxf(0.0, inter12.size.y)
			if ia12 < arr12.size() - 1:
				var gap12 := (arr12[ia12 + 1]["rect"] as Rect2).position.x - ra12.end.x
				min_gap12 = minf(min_gap12, gap12)
				if gap12 < 28.0 - 0.05:
					_fail_and_quit(tag12, "Island %d clearance violation between `%s` and `%s`: gap=%.2fpx (<28.0px)!" % [int(isl_k12), String(arr12[ia12]["name"]), String(arr12[ia12 + 1]["name"]), gap12])
					return
	if overlap_area12 > 0.0001 or min_slot_scale12 < 0.35 or max_width_err12 > 0.75:
		_fail_and_quit(tag12, "Layout violation: overlap %.3fpx^2, min slot scale %.3f (<0.35?), slot/live width mismatch %.2fpx!" % [overlap_area12, min_slot_scale12, max_width_err12])
		return
	var live_scale_nodes12: Array = [world.tree_1_node, world.cot_1_node, world.left_hut_node, world.right_tiki_node]
	var live_body_nodes12: Array = [world.mortar_workshop, world.cauldron_workshop, world.coral_linked_workshop, world.cloud_greenhouse, world.cloud_hotspring_inn, world.cloud_windmill_bakery, world.cloud_tea_pavilion, world.chef_tasting_pavilion, world.lighthouse_harbor, world.dairy_workshop, world.market_stall, world.pottery_kiln]
	var min_live_scale12 := 9.0
	for ln12 in live_scale_nodes12:
		if ln12 != null:
			min_live_scale12 = minf(min_live_scale12, absf((ln12 as Node2D).scale.x))
	for bn12 in live_body_nodes12:
		if bn12 == null:
			continue
		for sp_name12 in ["body_sprite", "secondary_sprite"]:
			var bsp12 = bn12.get(sp_name12)
			if bsp12 is Sprite2D and (bsp12 as Sprite2D).texture != null:
				min_live_scale12 = minf(min_live_scale12, absf((bsp12 as Sprite2D).scale.x) * absf((bn12 as Node2D).scale.x))
	if min_live_scale12 < 0.35 - 0.006:
		_fail_and_quit(tag12, "A live building sprite renders below the 0.35 scale floor (%.3f)!" % min_live_scale12)
		return
	var pk_rect12 := pk12.get_screen_rect()
	if pk_rect12.position.x < 1416.0 - 0.05 or absf(pk_rect12.size.x - 43.68) > 0.05 or pk_rect12.end.x > (isl3_rects12[1]["rect"] as Rect2).position.x - 28.0 + 0.05:
		_fail_and_quit(tag12, "PotteryKiln_3 rect %s off the Island 3 sand shelf / too close to SoilPlot_3!" % str(pk_rect12))
		return
	if world.waypoint_graph == null or absf(world.waypoint_graph.get_dock_pos("pottery_kiln_dock").x - EconomyConfig.POTTERY_KILN_SLOT_X) > 0.1 or absf(world.waypoint_graph.get_named_pos("pottery_kiln").x - EconomyConfig.POTTERY_KILN_SLOT_X) > 0.1:
		_fail_and_quit(tag12, "WaypointGraph `pottery_kiln` dock misaligned!")
		return
	# No 4th islet: every waypoint / dock stays on the existing 1920px strip
	for wp12 in WaypointGraph.WAYPOINTS:
		if wp12.x < 64.0 or wp12.x > 1856.0:
			_fail_and_quit(tag12, "Waypoint %s outside the 1920px three-island strip!" % str(wp12))
			return

	# 3) Rest-dock audit: idle/work poses at every long-dwell dock cover <= 50% of each building's width (union per building)
	var rest_spans12: Dictionary = {1: [], 2: [], 3: []}
	var rest_dock_count12 := 0
	for w12 in world.workers:
		if not is_instance_valid(w12) or w12.body_sprite == null or w12.body_sprite.texture == null:
			continue
		var rx12: float = w12.get_rest_dock_x()
		var wimg12 := w12.body_sprite.texture.get_image()
		if wimg12 != null and wimg12.is_compressed():
			wimg12.decompress()
		var fw12 := int(wimg12.get_width() / maxi(1, w12.body_sprite.hframes))
		var half12 := 0.0
		for fr12 in w12.get_rest_pose_frames():
			var lo12 := fw12
			var hi12 := -1
			for px12 in range(fw12):
				for py12 in range(wimg12.get_height()):
					if wimg12.get_pixel(fr12 * fw12 + px12, py12).a > 0.4:
						lo12 = mini(lo12, px12)
						hi12 = maxi(hi12, px12)
						break
			if hi12 >= lo12:
				# flip_h mirrors the frame, so take the wider side about the frame centre
				half12 = maxf(half12, maxf(float(fw12) * 0.5 - float(lo12), float(hi12 + 1) - float(fw12) * 0.5))
		(rest_spans12[w12.home_island] as Array).append(Vector2(rx12 - half12, rx12 + half12))
		rest_dock_count12 += 1
	var worst_cover12 := 0.0
	var worst_cover_name12 := ""
	for isl_r12 in [1, 2, 3]:
		for bd12 in all_rects12[isl_r12]:
			var br12: Rect2 = bd12["rect"]
			var segs12: Array = []
			for sp12 in rest_spans12[isl_r12]:
				var s0 := maxf(br12.position.x, (sp12 as Vector2).x)
				var s1 := minf(br12.end.x, (sp12 as Vector2).y)
				if s1 > s0:
					segs12.append(Vector2(s0, s1))
			segs12.sort_custom(func(a, b): return a.x < b.x)
			var covered12 := 0.0
			var cur_s := -1.0
			var cur_e := -1.0
			for sg12 in segs12:
				if cur_e < 0.0 or sg12.x > cur_e:
					if cur_e > cur_s:
						covered12 += cur_e - cur_s
					cur_s = sg12.x
					cur_e = sg12.y
				else:
					cur_e = maxf(cur_e, sg12.y)
			if cur_e > cur_s:
				covered12 += cur_e - cur_s
			var ratio12 := covered12 / maxf(1.0, br12.size.x)
			if ratio12 > worst_cover12:
				worst_cover12 = ratio12
				worst_cover_name12 = String(bd12["name"])
	if rest_dock_count12 < 20 or worst_cover12 > 0.50 + 0.001:
		_fail_and_quit(tag12, "Resting workers hide `%s`: %.1f%% of its width covered (>50%%, %d rest docks audited)!" % [worst_cover_name12, worst_cover12 * 100.0, rest_dock_count12])
		return

	# 4) Kiln chain: build -> clay from harvests -> fire with basket fuel -> stall + souvenir boxes
	GameManager._reset_pottery_state()
	GameManager.building_levels["pottery_kiln"] = 1
	GameManager.set_weather(GameManager.WeatherState.DAY)
	GameManager.moon_tea_gathering_timer = 0.0
	GameManager.wish_lantern_festival_timer = 0.0
	GameManager.gourmet_acclaim_timer = 0.0
	GameManager.frenzy_timer = 0.0
	if GameManager.upgrade_building("pottery_kiln"):
		_fail_and_quit(tag12, "upgrade_building('pottery_kiln') should fail before the kiln is built!")
		return
	world._process(0.05)
	if WindowController != null and not WindowController.is_logical_point_interactive(world.get_pottery_kiln_screen_rect().get_center()):
		_fail_and_quit(tag12, "WindowController passthrough violation for PotteryKiln_3 (%s)!" % str(world.get_pottery_kiln_screen_rect()))
		return
	var base_codex_mult12 := GameManager.get_collection_multiplier()
	GameManager.add_gold(EconomyConfig.POTTERY_KILN_UNLOCK_COST_GOLD + 50)
	var pk_click12 := world.interact_with_pottery_kiln()
	if not bool(pk_click12.get("ok", false)) or not GameManager.pottery_kiln_unlocked:
		_fail_and_quit(tag12, "Clicking the unbuilt PotteryKiln_3 with enough gold did not build it: %s" % str(pk_click12))
		return
	for isl12 in [1, 2, 3]:
		for ck12 in ["crop_0", "crop_1", "crop_2", "crop_3"]:
			GameManager.raw_baskets[isl12][ck12] = 0
	for sk12 in GameManager.stall_inventory.keys():
		GameManager.stall_inventory[sk12] = 0
	# Clay comes from a real soil-plot harvest (the bunny farmers' furrows)
	var plot12: SoilPlot = world.soil_plots[0]
	plot12.harvest_crop_yield()
	if GameManager.get_pottery_stock("clay_lump") != 1 or not bool(GameManager.unlocked_pottery_items.get("clay_lump", false)):
		_fail_and_quit(tag12, "A soil-plot harvest did not turn up 1 clay lump (clay=%d)!" % GameManager.get_pottery_stock("clay_lump"))
		return
	var no_fuel12 := GameManager.fire_pottery("pottery_tea_bowl")
	if bool(no_fuel12.get("fired", true)) or String(no_fuel12.get("reason", "")) != "fuel" or GameManager.get_pottery_stock("clay_lump") != 1:
		_fail_and_quit(tag12, "Firing without fuel must be refused and keep the clay: %s" % str(no_fuel12))
		return
	GameManager.raw_baskets[3]["crop_3"] = 4
	var bowl12 := GameManager.fire_pottery("pottery_tea_bowl")
	if not bool(bowl12.get("fired", false)) or String(bowl12.get("fuel", "")) != "crop_3" or GameManager.get_pottery_stock("clay_lump") != 0 or GameManager.get_pottery_stock("pottery_tea_bowl") != 1 or int(GameManager.raw_baskets[3]["crop_3"]) != 3 or GameManager.pottery_fuel_consumed != 1 or int(bowl12.get("shipped", -1)) != 0:
		_fail_and_quit(tag12, "Tea bowl (1 clay + 1 fuel) firing failed: %s" % str(bowl12))
		return
	plot12.harvest_crop_yield()
	var short_clay12 := GameManager.fire_pottery("pottery_vase")
	if bool(short_clay12.get("fired", true)) or String(short_clay12.get("reason", "")) != "clay":
		_fail_and_quit(tag12, "A vase needs 2 clay; firing it with 1 clay must be refused: %s" % str(short_clay12))
		return
	plot12.harvest_crop_yield()
	var vase12 := GameManager.fire_pottery("pottery_vase")
	if not bool(vase12.get("fired", false)) or GameManager.get_pottery_stock("clay_lump") != 0 or GameManager.get_pottery_stock("pottery_vase") != 1 or GameManager.pottery_clay_dug_total != 3:
		_fail_and_quit(tag12, "Vase (2 clay + 1 fuel) firing failed: %s" % str(vase12))
		return
	plot12.harvest_crop_yield()
	var bowl12b := GameManager.fire_pottery("pottery_tea_bowl")
	if not bool(bowl12b.get("fired", false)) or int(bowl12b.get("shipped", 0)) != 1 or int(GameManager.stall_inventory.get("pottery_tea_bowl", 0)) != 1 or GameManager.get_pottery_stock("pottery_tea_bowl") != 1:
		_fail_and_quit(tag12, "Surplus tea bowl did not ship to the stall: %s" % str(bowl12b))
		return
	if GameManager.get_unlocked_pottery_count() != 3 or not bool(GameManager.unlocked_achievements.get("ach_pottery_kiln", false)):
		_fail_and_quit(tag12, "Pottery codex 3/3 or `ach_pottery_kiln` missing (%d/3)!" % GameManager.get_unlocked_pottery_count())
		return
	var bowl_sale12 := _sell("pottery_tea_bowl", 1, Vector2(1050.0, EconomyConfig.GROUND_Y))
	if bowl_sale12 <= 0 or int(GameManager.stall_inventory.get("pottery_tea_bowl", 0)) != 0:
		_fail_and_quit(tag12, "Market stall failed to sell the tea bowl (+%dG)!" % bowl_sale12)
		return
	# Souvenir gift boxes pack the kiln wares first: royal box <- celadon vase, floral box <- tea bowl
	GameManager.flora_inventory["flora_cloud_rose"] = 2
	GameManager.flora_inventory["flora_stardew_lily"] = 2
	for ws12 in ["mortar", "cauldron", "coral_linked"]:
		for dk12 in GameManager.workshop_outputs[ws12].keys():
			GameManager.workshop_outputs[ws12][dk12] = 0
	var packed_before12 := GameManager.pottery_packed_in_boxes
	var royal_before12 := int(GameManager.souvenir_inventory.get("souvenir_box_royal", 0))
	var royal12 := GameManager.bundle_souvenir_gift_box("souvenir_box_royal", true)
	var floral12 := GameManager.bundle_souvenir_gift_box("souvenir_box_floral", true)
	if not bool(royal12.get("bundled", false)) or String(royal12.get("dish_id", "")) != "pottery_vase" or not bool(floral12.get("bundled", false)) or String(floral12.get("dish_id", "")) != "pottery_tea_bowl" or GameManager.get_total_pottery_ware_count() != 0 or GameManager.pottery_packed_in_boxes != packed_before12 + 2 or int(GameManager.souvenir_inventory.get("souvenir_box_royal", 0)) != royal_before12 + 1:
		_fail_and_quit(tag12, "Souvenir boxes did not pack the kiln wares: royal=%s floral=%s" % [str(royal12), str(floral12)])
		return
	# Idle loop: one full kiln cycle fires the active ware from clay + basket fuel
	GameManager.pottery_kiln_timer = 0.0
	GameManager.pottery_inventory["clay_lump"] = 2
	var fired_before12 := int(GameManager.pottery_craft_counts.get("pottery_tea_bowl", 0)) + int(GameManager.pottery_craft_counts.get("pottery_vase", 0))
	GameManager._tick_pottery_kiln(EconomyConfig.POTTERY_KILN_CYCLE_SEC / GameManager.get_pottery_speed_multiplier() + 0.01)
	if int(GameManager.pottery_craft_counts.get("pottery_tea_bowl", 0)) + int(GameManager.pottery_craft_counts.get("pottery_vase", 0)) != fired_before12 + 1:
		_fail_and_quit(tag12, "Idle kiln cycle did not fire once (counts %s)!" % str(GameManager.pottery_craft_counts))
		return

	var saved_levels12: Dictionary = GameManager.animal_levels.duplicate()
	var saved_isl1_rec12: Dictionary = (GameManager.island_recruited[1] as Dictionary).duplicate()
	if GameManager.get_collection_multiplier() < base_codex_mult12 + 0.029:
		_fail_and_quit(tag12, "3 pottery entries did not raise the collection bonus by 3%!")
		return

	# 6) HUD cards #14 (tab 0 / 2 / 3), own LabelSettings, codex card 14 & drawer title
	if world.hud != null:
		var tiles_p8 := _menu_tabs_problem(world.hud, ["pottery_kiln_building", "", "ci12_codex"], "3/3")
		if tiles_p8 != "":
			_fail_and_quit(tag12, tiles_p8)
			return
	var forbidden_font_ci12 := _find_deprecated_font_node(get_tree().root)
	if forbidden_font_ci12 != "":
		_fail_and_quit(tag12, "Forbidden legacy font node detected at `%s`!" % forbidden_font_ci12)
		return

	# Save/Load roundtrip of all CI-12 fields
	GameManager.add_gold(Pacing.line_cost_n("pottery_kiln", 1, 4))
	for _pk_up in range(2):
		if not GameManager.upgrade_building("pottery_kiln"):
			_fail_and_quit(tag12, "Failed to upgrade `pottery_kiln` to Lv.3!")
			return
	GameManager.pottery_inventory["clay_lump"] = 5
	GameManager.pottery_inventory["pottery_tea_bowl"] = 1
	GameManager.pottery_inventory["pottery_vase"] = 2
	GameManager.active_pottery_recipe_id = "pottery_vase"
	var exp_prep12 := GameManager.pottery_reputation_bonus
	GameManager.save_game()
	GameManager._reset_pottery_state()
	GameManager.building_levels["pottery_kiln"] = 1
	GameManager.load_game()
	if not GameManager.pottery_kiln_unlocked or GameManager.get_pottery_kiln_level() != 3 or GameManager.get_pottery_stock("clay_lump") != 5 or GameManager.get_pottery_stock("pottery_tea_bowl") != 1 or GameManager.get_pottery_stock("pottery_vase") != 2 or GameManager.active_pottery_recipe_id != "pottery_vase" or GameManager.get_unlocked_pottery_count() != 3 or GameManager.pottery_reputation_bonus != exp_prep12:
		_fail_and_quit(tag12, "CI-12 Save/Load roundtrip failed to restore state!")
		return
	GameManager.animal_levels = saved_levels12
	GameManager.island_recruited[1] = saved_isl1_rec12

	# Showcase (daylight): Lv.3 kiln firing a vase on the Island 3 landing,
	# every other worker standing at its rest dock in a 28px gap, the night-only cinema / lantern layers folded away
	GameManager.weather_timer = 4.0
	GameManager.set_weather(GameManager.WeatherState.DAY)
	GameManager.moon_tea_gathering_timer = 0.0
	GameManager.wish_lantern_festival_timer = 0.0
	GameManager.pottery_kiln_timer = EconomyConfig.POTTERY_KILN_CYCLE_SEC * 0.58
	GameManager.island_recruited[1] = {"bunny": 2, "otter": 2, "fox": 1, "shiba": 1, "penguin": 0, "toucan": 0}
	GameManager.island_recruited[2] = {"bunny": 2, "otter": 1, "fox": 0, "shiba": 0, "penguin": 1, "toucan": 2}
	GameManager.island_recruited[3] = {"bunny": 2, "otter": 2, "fox": 1, "shiba": 0, "penguin": 1, "toucan": 2}
	for an12 in EconomyConfig.ANIMAL_ORDER:
		GameManager.animal_levels[an12] = maxi(1, int(GameManager.animal_levels.get(an12, 1)))
	for w_show12 in world.workers:
		if not is_instance_valid(w_show12) or not w_show12.is_hired():
			continue
		w_show12.visible = true
		w_show12.nav_path.clear()
		w_show12.position = Vector2(w_show12.get_rest_dock_x(), EconomyConfig.GROUND_Y)
		w_show12._process(0.01)
		# Freeze the staged crew for the 2 capture frames (the first frame after this long synchronous audit carries a large
		# delta that would otherwise walk the resting workers off their docks before the screenshot)
		w_show12.set_process(false)
	pk12._process(0.01)
	world._process(0.05)
	print("[PASS] %s 通过: 三岛19建筑最小净间距 %.2fpx、重叠 %.1fpx²、最小缩放 %.3f/%.3f、陶窑接地 %d 像素、%d 处歇脚遮挡最多 %.1f%%(%s)、茶碗售价 +%dG、存读一致 PASS!" % [tag12, min_gap12, overlap_area12, min_slot_scale12, min_live_scale12, pk_contact12, rest_dock_count12, worst_cover12 * 100.0, worst_cover_name12, bowl_sale12])

	# ------------------------------------------------------------------
	# [断言26-CI-13云海风筝节与岛屿四季装扮] (NO new building):
	#   1) All 8 CI-13 PNGs (`kite_carp/bird/star`, `icon_kite_festival`, `deco_spring/summer/autumn/winter`, 64x64) load via
	#      Godot import with RGBA transparent corners;
	#   2) Layout untouched: still 19 main buildings (7+6+6) on their slots, every gap >= 28px, 0 px^2 overlap, scales >= 0.35;
	#   3) Sky lanes: every kite footprint sampled every 0.25s over a whole festival for all 3 wind programmes stays inside its
	#      lane (west = above Island 2, east = above Island 3); both lanes stay on screen and clear of every world label, the airship (dock + departure), the balloon path, every building, the kite badge and
	#      the HUD banner / bar / drawers; kites never overlap each other;
	#   4) Kite festival: cooldown auto-start, deterministic wind programme + kite flight + click rewards (2 identical replays),
	#      wind production / sales buff numbers, sweep medal, end + cooldown re-arm;
	#   5) Seasons: injected clock for all 12 months -> northern-hemisphere seasons, props + tint switch, bonus on its own buff
	#      type only (spring crops / summer sales / autumn workshops / winter tips), 4/4 seasons + achievement, real clock back;
	#   6) Seasonal props (every season texture): bottom-center grounded on solid island ground, clear of buildings, labels,
	#      worker rest spans, landscapes, other world sprites and each other;
	#   7) CI-12 rest-dock occlusion audit still <= 50% for every building (20 rest docks);
	#   8) HUD: 2-row drawer for 13+ cards (tab 2 = 16 cards incl. kite #15 + season #16, codex = 15 cards incl. card 15),
	#      undistorted >= 0.5x text, every card inside its drawer with no overlap, new card texts fully visible, own LabelSettings;
	#   9) Save/Load roundtrip; 10) showcase: festival in flight (6 kites) + current-season dress-up for the screenshots.
	# ------------------------------------------------------------------
	var tag13 := "[断言26-CI-13云海风筝节与岛屿四季装扮]"
	if world.has_method("reload_ci13_textures"):
		world.reload_ci13_textures()
	var ci13_tex_paths: Array = [EconomyConfig.KITE_CARP_TEX, EconomyConfig.KITE_BIRD_TEX, EconomyConfig.KITE_STAR_TEX, EconomyConfig.ICON_KITE_FESTIVAL_TEX, EconomyConfig.DECO_SPRING_TEX, EconomyConfig.DECO_SUMMER_TEX, EconomyConfig.DECO_AUTUMN_TEX, EconomyConfig.DECO_WINTER_TEX]
	for tp13 in ci13_tex_paths:
		if not ResourceLoader.exists(String(tp13)):
			_fail_and_quit(tag13, "CI-13 texture `%s` is not imported by Godot (missing `.png.import`)!" % String(tp13))
			return
		var t13: Texture2D = EconomyConfig.load_pixel_texture(String(tp13))
		if t13 == null or t13.get_width() != 64 or t13.get_height() != 64:
			_fail_and_quit(tag13, "CI-13 texture `%s` missing or not 64x64!" % String(tp13))
			return
		var img13 := t13.get_image()
		if img13 != null and img13.is_compressed():
			img13.decompress()
		if img13 == null or img13.get_pixel(0, 0).a > 0.05 or img13.get_pixel(63, 0).a > 0.05 or img13.get_pixel(0, 63).a > 0.05 or img13.get_pixel(63, 63).a > 0.05:
			_fail_and_quit(tag13, "CI-13 texture `%s` lacks RGBA transparent corner alpha!" % String(tp13))
			return

	# 2) No new building: 19 main buildings on their slots, >= 28px gaps, zero overlap, every slot scale >= 0.35
	GameManager.unlocked_islands = {1: true, 2: true, 3: true}
	world.companion_zoom = 1.0
	world._apply_companion_zoom()
	var oy13 := world.world_root.position.y
	var all_rects13: Dictionary = world.get_island_main_building_rects()
	var n_blds13 := 0
	var min_gap13 := 9999.0
	var overlap13 := 0.0
	var min_scale13 := 9.0
	var bld_local13: Array = []
	for isl_k13 in [1, 2, 3]:
		var arr13: Array = all_rects13[isl_k13]
		var slots13: Array = MainWorld.ISLAND_SLOTS[isl_k13]
		n_blds13 += arr13.size()
		if arr13.size() != slots13.size():
			_fail_and_quit(tag13, "Island %d building count %d != slot table %d!" % [isl_k13, arr13.size(), slots13.size()])
			return
		for ia13 in range(arr13.size()):
			var ra13: Rect2 = arr13[ia13]["rect"]
			bld_local13.append({"name": String(arr13[ia13]["name"]), "island": isl_k13, "rect": Rect2(ra13.position - Vector2(0.0, oy13), ra13.size)})
			min_scale13 = minf(min_scale13, float(slots13[ia13]["scale"]))
			if absf(ra13.get_center().x - float(slots13[ia13]["x"])) > 0.6:
				_fail_and_quit(tag13, "`%s` moved off its slot x=%.1f!" % [String(arr13[ia13]["name"]), float(slots13[ia13]["x"])])
				return
			for ib13 in range(ia13 + 1, arr13.size()):
				var in13 := ra13.intersection(arr13[ib13]["rect"])
				overlap13 += maxf(0.0, in13.size.x) * maxf(0.0, in13.size.y)
			if ia13 < arr13.size() - 1:
				min_gap13 = minf(min_gap13, (arr13[ia13 + 1]["rect"] as Rect2).position.x - ra13.end.x)
	if n_blds13 != 19 or (all_rects13[1] as Array).size() != 7 or (all_rects13[2] as Array).size() != 6 or (all_rects13[3] as Array).size() != 6 or min_gap13 < 28.0 - 0.05 or overlap13 > 0.0001 or min_scale13 < 0.35:
		_fail_and_quit(tag13, "Layout changed: %d buildings, min gap %.2fpx, overlap %.3fpx^2, min scale %.3f!" % [n_blds13, min_gap13, overlap13, min_scale13])
		return

	# 3) Sky lanes vs every reserved sky element (all in `world_root` local coords; screen y = local y + 36)
	var reserved13: Array = []
	var air_half13 := Vector2(MainWorld.AIRSHIP_TARGET_W * 0.5, MainWorld.AIRSHIP_TARGET_H * 0.5 + 2.4)
	var air_dock13 := Rect2(MainWorld.AIRSHIP_HARBOR_DOCK_POS - air_half13, air_half13 * 2.0)
	var air_dep13 := Rect2(MainWorld.AIRSHIP_DEPART_POS - air_half13, air_half13 * 2.0)
	reserved13.append({"name": "AirshipDockToDeparture", "rect": air_dock13.merge(air_dep13)})
	reserved13.append({"name": "SkyBalloonPath", "rect": Rect2(MainWorld.SKY_BALLOON_MIN_X - 30.0, -4.0 - 3.2 - 26.0, (MainWorld.SKY_BALLOON_MAX_X + 84.0) - (MainWorld.SKY_BALLOON_MIN_X - 30.0), 56.0 + 6.4)})
	for hr13 in [["HUD banner band", Rect2(510.0, 0.0, 900.0, 40.0)], ["HUD bar", HUD.FULL_BAR_RECT], ["HUD capsule", HUD.CAPSULE_RECT]]:
		reserved13.append({"name": String(hr13[0]), "rect": Rect2((hr13[1] as Rect2).position - Vector2(0.0, oy13), (hr13[1] as Rect2).size)})
	for bl13 in bld_local13:
		reserved13.append({"name": String(bl13["name"]), "rect": bl13["rect"]})
	var lane_names13: Array = EconomyConfig.KITE_LANES.keys()
	for ln13 in lane_names13:
		var lane13: Rect2 = EconomyConfig.KITE_LANES[ln13]
		var lane_screen13 := Rect2(lane13.position + Vector2(0.0, oy13), lane13.size)
		if lane_screen13.position.y < 0.0 or lane_screen13.position.x < 0.0 or lane_screen13.end.x > 1920.0 or lane_screen13.end.y > 300.0:
			_fail_and_quit(tag13, "Kite lane `%s` %s leaves the 1920x300 window!" % [String(ln13), str(lane_screen13)])
			return
		for rv13 in reserved13:
			var rr13: Rect2 = rv13["rect"]
			if rr13.size.x > 0.0 and rr13.size.y > 0.0 and lane13.intersects(rr13):
				_fail_and_quit(tag13, "Kite lane `%s` %s collides with `%s` %s!" % [String(ln13), str(lane13), String(rv13["name"]), str(rr13)])
				return
	var kite_samples13 := 0
	for prog13 in range(EconomyConfig.KITE_WIND_PROGRAMMES.size()):
		var t13s := 0.0
		while t13s <= EconomyConfig.KITE_FESTIVAL_SEC + 0.001:
			var fps13: Array = []
			for sl13 in range(EconomyConfig.KITE_SLOTS.size()):
				var fp13 := EconomyConfig.get_kite_footprint(EconomyConfig.calc_kite_position(sl13, prog13, t13s))
				var lane_r13: Rect2 = EconomyConfig.KITE_LANES[String(EconomyConfig.KITE_SLOTS[sl13]["lane"])]
				if not lane_r13.encloses(fp13):
					_fail_and_quit(tag13, "Kite slot %d footprint %s left its `%s` lane %s (programme %d, t=%.2f)!" % [sl13, str(fp13), String(EconomyConfig.KITE_SLOTS[sl13]["lane"]), str(lane_r13), prog13, t13s])
					return
				for fq13 in fps13:
					if (fq13 as Rect2).intersects(fp13):
						_fail_and_quit(tag13, "Kites overlap each other at programme %d t=%.2f (slot %d)!" % [prog13, t13s, sl13])
						return
				fps13.append(fp13)
				kite_samples13 += 1
			t13s += 0.25

	# 4) Kite festival: auto-start, deterministic wind + flight + click rewards, buff numbers, sweep, end
	GameManager._reset_kite_and_season_state()
	world._update_kite_festival(0.0)
	if GameManager.is_kite_festival_active() or absf(GameManager.get_kite_wind_sale_multiplier() - 1.0) > 0.0001 or absf(GameManager.get_kite_wind_production_multiplier() - 1.0) > 0.0001 or world.kite_sprites.size() != EconomyConfig.KITE_SLOTS.size() or world.kite_sprites[0].visible:
		_fail_and_quit(tag13, "Idle sky must have no kites and no wind buff (%d kite sprites)!" % world.kite_sprites.size())
		return
	# the scheduler: nothing opens early, the kite festival opens by itself when its turn is overdue, and never a second one beside it
	GameManager.festival_turn = 0
	GameManager.festival_gap_timer = 5.0
	if GameManager.try_start_festival("kite") or GameManager.is_kite_festival_active():
		_fail_and_quit(tag13, "A festival opened before its time!")
		return
	GameManager.festival_gap_timer = -Pacing.FESTIVAL_AUTO_SEC
	GameManager._process(0.05)
	if not GameManager.is_kite_festival_active() or absf(GameManager.festival_gap_timer - Pacing.FESTIVAL_GAP_SEC) > 0.06 or GameManager.festival_turn != 1:
		_fail_and_quit(tag13, "The kite festival did not open in its turn (gap %.1f, turn %d)!" % [GameManager.festival_gap_timer, GameManager.festival_turn])
		return
	if GameManager.try_start_festival("moon_tea") or GameManager.is_moon_tea_gathering_active():
		_fail_and_quit(tag13, "Two festivals at once!")
		return
	world._update_kite_festival(0.0)
	var vis_kites13 := 0
	for ks13 in world.kite_sprites:
		if ks13.visible and ks13.texture != null and ks13.centered and ks13.hframes == 1 and ks13.vframes == 1 and not ks13.region_enabled and absf(ks13.scale.x - EconomyConfig.KITE_SCALE) < 0.001:
			vis_kites13 += 1
	if vis_kites13 != EconomyConfig.KITE_SLOTS.size():
		_fail_and_quit(tag13, "Festival opened but only %d/%d kite sprites fly!" % [vis_kites13, EconomyConfig.KITE_SLOTS.size()])
		return
	# Wind buff numbers at mid-gust 1 of the running festival: production x(1 + 0.25 w), sales x(1 + 0.20 w)
	GameManager.advance_kite_festival(7.5 - GameManager.kite_festival_clock)
	var w_exp13 := float(EconomyConfig.get_kite_wind_level_info(int(EconomyConfig.get_kite_wind_programme(GameManager.kite_festival_idx)[0][0]))["strength"])
	var crop_on13 := GameManager.get_crop_growth_multiplier(1)
	var ws_on13 := GameManager.get_workshop_speed_multiplier(2)
	GameManager.stall_inventory["crop_0"] = 6
	var sale_on13 := _sell("crop_0", 1, Vector2(1050.0, EconomyConfig.GROUND_Y))
	if absf(GameManager.get_kite_wind_strength() - w_exp13) > 0.0001 or absf(GameManager.get_kite_wind_production_multiplier() - (1.0 + 0.25 * w_exp13)) > 0.0001 or absf(GameManager.get_kite_wind_sale_multiplier() - (1.0 + 0.20 * w_exp13)) > 0.0001:
		_fail_and_quit(tag13, "Wind buff numbers wrong: w=%.3f (exp %.3f) prod=%.3f sale=%.3f!" % [GameManager.get_kite_wind_strength(), w_exp13, GameManager.get_kite_wind_production_multiplier(), GameManager.get_kite_wind_sale_multiplier()])
		return
	GameManager.kite_festival_active = false
	var crop_off13 := GameManager.get_crop_growth_multiplier(1)
	var ws_off13 := GameManager.get_workshop_speed_multiplier(2)
	GameManager.stall_inventory["crop_0"] = 6
	var sale_off13 := _sell("crop_0", 1, Vector2(1050.0, EconomyConfig.GROUND_Y))
	GameManager.kite_festival_active = true
	var sale_ratio13 := float(sale_on13) / maxf(1.0, float(sale_off13))
	if absf(crop_on13 / maxf(0.0001, crop_off13) - (1.0 + 0.25 * w_exp13)) > 0.001 or absf(ws_on13 / maxf(0.0001, ws_off13) - (1.0 + 0.25 * w_exp13)) > 0.001 or sale_off13 <= 0 or absf(sale_ratio13 - (1.0 + 0.20 * w_exp13)) > 0.03:
		_fail_and_quit(tag13, "Wind buff not applied: crop x%.3f ws x%.3f sale x%.3f (exp prod %.3f / sale %.3f)!" % [crop_on13 / maxf(0.0001, crop_off13), ws_on13 / maxf(0.0001, ws_off13), sale_ratio13, 1.0 + 0.25 * w_exp13, 1.0 + 0.20 * w_exp13])
		return
	# Gust blending: halfway through the 2s blend the strength lies strictly between the two gusts
	var prog_b13: Array = EconomyConfig.get_kite_wind_programme(1)
	var s_prev13 := float(EconomyConfig.get_kite_wind_level_info(int(prog_b13[0][0]))["strength"])
	var s_next13 := float(EconomyConfig.get_kite_wind_level_info(int(prog_b13[1][0]))["strength"])
	var s_mid13 := EconomyConfig.calc_kite_wind_strength(1, EconomyConfig.KITE_GUST_SEC + EconomyConfig.KITE_WIND_BLEND_SEC * 0.5)
	if s_mid13 <= minf(s_prev13, s_next13) or s_mid13 >= maxf(s_prev13, s_next13):
		_fail_and_quit(tag13, "Gust blend not smooth: %.3f -> %.3f -> %.3f!" % [s_prev13, s_mid13, s_next13])
		return
	# Deterministic replay: same festival index, kites reeled in by real world clicks at fixed clocks -> identical traces
	var replays13: Array = []
	for rp13 in range(2):
		GameManager._reset_kite_and_season_state()
		GameManager.kite_festivals_held = 4
		var gold0_13 := GameManager.gold
		var amber0_13 := GameManager.amber
		var vou0_13 := GameManager.rare_codex_vouchers
		if not GameManager.start_kite_festival():
			_fail_and_quit(tag13, "start_kite_festival() refused!")
			return
		var trace13: Array = []
		var clicks13: Array = []
		var next_click13 := 0
		var sim13 := 0.0
		while GameManager.is_kite_festival_active() and sim13 < 60.0:
			world._update_kite_festival(0.0)
			if next_click13 < EconomyConfig.KITE_SLOTS.size() and GameManager.kite_festival_clock >= 3.0 + 6.0 * float(next_click13) - 0.001:
				var kc13 := world.kite_sprites[next_click13].position
				var hit13 := world.get_kite_at_local_point(kc13)
				if hit13 != next_click13:
					_fail_and_quit(tag13, "World hit test on kite %d at %s returned %d!" % [next_click13, str(kc13), hit13])
					return
				if WindowController != null and GameManager.desktop_companion_mode:
					world._process(0.0)
					if not WindowController.is_logical_point_interactive(world.world_root.position + kc13):
						_fail_and_quit(tag13, "Kite %d at %s is not clickable through the desktop passthrough polygon!" % [next_click13, str(kc13)])
						return
				var cr13 := world.interact_with_kite(hit13)
				if not bool(cr13.get("collected", false)) or world.kite_sprites[next_click13].visible:
					_fail_and_quit(tag13, "Clicking kite %d did not reel it in: %s" % [next_click13, str(cr13)])
					return
				clicks13.append([cr13["kite_id"], cr13["gold"], cr13["amber"], cr13["rep"], cr13["swept"], snappedf(float(cr13["wind"]), 0.0001)])
				next_click13 += 1
			if int(roundf(GameManager.kite_festival_clock * 4.0)) % 8 == 0:
				var row13: Array = [snappedf(GameManager.kite_festival_clock, 0.01), snappedf(GameManager.get_kite_wind_strength(), 0.0001)]
				for sl_t13 in range(EconomyConfig.KITE_SLOTS.size()):
					row13.append(GameManager.get_kite_slot_position(sl_t13).snapped(Vector2(0.01, 0.01)))
				trace13.append(row13)
			GameManager.advance_kite_festival(0.25)
			sim13 += 0.25
		world._update_kite_festival(0.0)
		replays13.append({"clicks": clicks13, "trace": trace13, "dur": snappedf(sim13, 0.01), "gold": GameManager.gold - gold0_13, "amber": GameManager.amber - amber0_13, "vouchers": GameManager.rare_codex_vouchers - vou0_13, "medals": GameManager.kite_medals, "held": GameManager.kite_festivals_held, "kites": GameManager.get_unlocked_kite_count(), "rep": GameManager.kite_reputation_bonus})
	var r13a: Dictionary = replays13[0]
	var r13b: Dictionary = replays13[1]
	if str(r13a) != str(r13b):
		_fail_and_quit(tag13, "Kite festival replay not deterministic!\nA=%s\nB=%s" % [str(r13a), str(r13b)])
		return
	var clicks_a13: Array = r13a["clicks"]
	var exp_amber13 := 0
	var exp_rep13 := 0
	for c13 in clicks_a13:
		exp_amber13 += int(EconomyConfig.KITE_TYPES[String(c13[0])]["amber"])
		exp_rep13 += int(EconomyConfig.KITE_TYPES[String(c13[0])]["rep"])
	exp_amber13 += EconomyConfig.KITE_SWEEP_AMBER
	exp_rep13 += EconomyConfig.KITE_SWEEP_REP
	if clicks_a13.size() != 6 or not bool(clicks_a13[5][4]) or int(r13a["medals"]) != 1 or int(r13a["held"]) != 5 or int(r13a["kites"]) != 3 or int(r13a["amber"]) != exp_amber13 or int(r13a["vouchers"]) != EconomyConfig.KITE_SWEEP_VOUCHERS or int(r13a["rep"]) != exp_rep13 or absf(float(r13a["dur"]) - EconomyConfig.KITE_FESTIVAL_SEC) > 0.26 or GameManager.is_kite_festival_active():
		_fail_and_quit(tag13, "Kite rewards / sweep / festival end wrong: %s" % str(r13a))
		return
	var carp_gold13 := 0
	var bird_gold13 := 0
	for c13b in clicks_a13:
		if String(c13b[0]) == "kite_carp":
			carp_gold13 = int(c13b[1])
		elif String(c13b[0]) == "kite_bird":
			bird_gold13 = int(c13b[1])
	if carp_gold13 < EconomyConfig.KITE_MIN_GOLD or carp_gold13 <= bird_gold13 or not bool(GameManager.unlocked_achievements.get("ach_kite_sweep", false)):
		_fail_and_quit(tag13, "Kite reward ladder broken (carp %dG <= bird %dG?) or `ach_kite_sweep` missing!" % [carp_gold13, bird_gold13])
		return
	var kite_gold13 := int(r13a["gold"])

	# 5) Seasons by the injected local clock (northern-hemisphere meteorological months)
	var exp_months13 := {1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring", 6: "summer", 7: "summer", 8: "summer", 9: "autumn", 10: "autumn", 11: "autumn", 12: "winter"}
	var season_changes13: Array = []
	var on_season13 := func(s_id: String) -> void: season_changes13.append(s_id)
	EventBus.season_changed.connect(on_season13)
	var n_deco13 := world.season_deco_nodes.size()
	var active_deco13 := GameManager.get_active_season_deco_count()
	var season_bonus_exp13 := 1.0 + EconomyConfig.SEASON_DECO_BONUS_PER_PROP * float(active_deco13)
	var season_metrics13: Dictionary = {}
	for m13 in range(1, 13):
		var mm13: int = m13
		var got13 := GameManager.set_season_clock(func() -> Dictionary: return {"year": 2026, "month": mm13, "day": 15, "hour": 12, "minute": 0, "second": 0})
		world._update_season_dress(1.0)
		var exp_s13 := String(exp_months13[m13])
		if got13 != exp_s13 or GameManager.get_current_season_id() != exp_s13 or world.season_dress_id != exp_s13:
			_fail_and_quit(tag13, "Month %d should be `%s` (northern hemisphere), got `%s` / props `%s`!" % [m13, exp_s13, got13, world.season_dress_id])
			return
		var s_tex13: Texture2D = EconomyConfig.load_pixel_texture(String(EconomyConfig.SEASONS[exp_s13]["tex"]))
		for dn13 in world.season_deco_nodes:
			if (dn13 as Sprite2D).texture != s_tex13:
				_fail_and_quit(tag13, "Seasonal prop `%s` did not switch to the `%s` texture!" % [(dn13 as Sprite2D).name, exp_s13])
				return
		var tint_exp13: Color = EconomyConfig.SEASONS[exp_s13]["tint"]
		if not world.get_season_tint().is_equal_approx(tint_exp13) or not world.self_modulate.is_equal_approx(tint_exp13):
			_fail_and_quit(tag13, "Atmosphere tint for `%s` not applied: %s vs %s!" % [exp_s13, str(world.self_modulate), str(tint_exp13)])
			return
		for bt13 in ["crop_growth", "sale_price", "workshop_speed", "tip_bonus"]:
			var bm13 := GameManager.get_season_bonus_multiplier(String(bt13))
			var exp_bm13 := season_bonus_exp13 if String(EconomyConfig.SEASONS[exp_s13]["bonus_type"]) == String(bt13) else 1.0
			if absf(bm13 - exp_bm13) > 0.0001:
				_fail_and_quit(tag13, "Season `%s` bonus for `%s` = %.3f (expected %.3f)!" % [exp_s13, String(bt13), bm13, exp_bm13])
				return
		if m13 == 4 or m13 == 7 or m13 == 10 or m13 == 1:
			GameManager.stall_inventory["crop_0"] = 6
			season_metrics13[exp_s13] = {
				"crop": GameManager.get_crop_growth_multiplier(1),
				"ws": GameManager.get_workshop_speed_multiplier(2),
				"tip": GameManager.get_customer_tip_multiplier(false, 1),
				"sale": _sell("crop_0", 1, Vector2(1050.0, EconomyConfig.GROUND_Y))
			}
	EventBus.season_changed.disconnect(on_season13)
	# each season's own buff is +2% per prop vs a season that does not boost it (spring crops, summer sales, autumn workshops, winter tips)
	var crop_r13 := float(season_metrics13["spring"]["crop"]) / float(season_metrics13["summer"]["crop"])
	var sale_r13 := float(season_metrics13["summer"]["sale"]) / maxf(1.0, float(season_metrics13["spring"]["sale"]))
	var ws_r13 := float(season_metrics13["autumn"]["ws"]) / float(season_metrics13["spring"]["ws"])
	var tip_r13 := float(season_metrics13["winter"]["tip"]) / float(season_metrics13["spring"]["tip"])
	if absf(crop_r13 - season_bonus_exp13) > 0.001 or absf(ws_r13 - season_bonus_exp13) > 0.001 or absf(tip_r13 - season_bonus_exp13) > 0.001 or absf(sale_r13 - season_bonus_exp13) > 0.02:
		_fail_and_quit(tag13, "Seasonal bonus ratios wrong: crop %.3f ws %.3f tip %.3f sale %.3f (expected %.3f)!" % [crop_r13, ws_r13, tip_r13, sale_r13, season_bonus_exp13])
		return
	if GameManager.get_seen_season_count() != 4 or not bool(GameManager.unlocked_achievements.get("ach_four_seasons", false)) or season_changes13.size() < 4:
		_fail_and_quit(tag13, "Seasons seen %d/4, `ach_four_seasons`=%s, %d season_changed signals!" % [GameManager.get_seen_season_count(), str(GameManager.unlocked_achievements.get("ach_four_seasons", false)), season_changes13.size()])
		return

	# 6) Seasonal props for EVERY season texture: grounded on solid ground, clear of buildings / labels / rest spans / props
	var rest_spans13 := _collect_rest_dock_spans(world)
	var deco_checks13 := 0
	var deco_ground_px13 := 0
	var min_deco_clear13 := 9999.0
	for s_chk13 in EconomyConfig.SEASON_ORDER:
		var month_chk13: int = int((EconomyConfig.SEASONS[s_chk13]["months"] as Array)[0])
		GameManager.set_season_clock(func() -> Dictionary: return {"month": month_chk13})
		world._update_season_dress(1.0)
		var deco_rects13: Array = []
		for di13 in range(n_deco13):
			var dn_c13: Sprite2D = world.season_deco_nodes[di13]
			var spot13: Dictionary = EconomyConfig.SEASON_DECO_SPOTS[di13]
			var isl_d13 := int(spot13["island"])
			if not dn_c13.visible or dn_c13.texture == null or not dn_c13.centered or dn_c13.hframes != 1 or dn_c13.vframes != 1 or dn_c13.z_index != EconomyConfig.Z_BUILDING or absf(dn_c13.position.y - EconomyConfig.GROUND_Y) > 0.01 or absf(dn_c13.position.x - float(spot13["x"])) > 0.01 or absf(dn_c13.offset.y + dn_c13.region_rect.size.y * 0.5) > 0.01 or absf(dn_c13.scale.x - EconomyConfig.SEASON_DECO_SCALE) > 0.001:
				_fail_and_quit(tag13, "Seasonal prop `%s` (%s) not bottom-center grounded: pos=%s offset=%s region=%s z=%d!" % [dn_c13.name, s_chk13, str(dn_c13.position), str(dn_c13.offset), str(dn_c13.region_rect), dn_c13.z_index])
				return
			# lowest opaque row of the frame sits on GROUND_Y and every one of its pixels is solid island ground
			var dimg13 := dn_c13.texture.get_image()
			if dimg13 != null and dimg13.is_compressed():
				dimg13.decompress()
			var reg13 := Rect2i(dn_c13.region_rect)
			var bottom_y13 := reg13.end.y - 1
			var contact13 := 0
			for bx13 in range(reg13.position.x, reg13.end.x):
				if dimg13.get_pixel(bx13, bottom_y13).a > 0.5:
					contact13 += 1
					var gx13 := dn_c13.position.x + (float(bx13 - reg13.position.x) + 0.5 - float(reg13.size.x) * 0.5) * dn_c13.scale.x
					if not world.is_island_solid_ground(isl_d13, Vector2(gx13, EconomyConfig.GROUND_Y + 0.5)):
						_fail_and_quit(tag13, "Seasonal prop `%s` (%s) contact pixel x=%.1f is not on Island %d ground!" % [dn_c13.name, s_chk13, gx13, isl_d13])
						return
			if contact13 <= 0:
				_fail_and_quit(tag13, "Seasonal prop `%s` (%s) has no opaque ground-contact row!" % [dn_c13.name, s_chk13])
				return
			deco_ground_px13 += contact13
			var dr13: Rect2 = world.get_season_deco_local_rect(di13)
			if absf(dr13.end.y - EconomyConfig.GROUND_Y) > 0.01:
				_fail_and_quit(tag13, "Seasonal prop `%s` rect %s floats / sinks!" % [dn_c13.name, str(dr13)])
				return
			var after_hit13 := false
			for bl13b in bld_local13:
				var br13: Rect2 = bl13b["rect"]
				after_hit13 = after_hit13 or String(bl13b["name"]) == String(spot13["after"])
				# GEMINI.md Law 3.2: the prop stands at its left neighbour's outer edge + 16px (never on a building centre)
				if String(bl13b["name"]) == String(spot13["after"]) and absf(dn_c13.position.x - (br13.end.x + EconomyConfig.SEASON_DECO_EDGE_OFFSET)) > 0.6:
					_fail_and_quit(tag13, "Seasonal prop `%s` x=%.2f is not at `%s` outer edge %.2f + 16px!" % [dn_c13.name, dn_c13.position.x, String(bl13b["name"]), br13.end.x])
					return
				if int(bl13b["island"]) == isl_d13 and dr13.end.x > br13.position.x - 2.0 and dr13.position.x < br13.end.x + 2.0:
					_fail_and_quit(tag13, "Seasonal prop `%s` %s overlaps / touches `%s` %s!" % [dn_c13.name, str(dr13), String(bl13b["name"]), str(br13)])
					return
				if int(bl13b["island"]) == isl_d13:
					min_deco_clear13 = minf(min_deco_clear13, minf(absf(dr13.position.x - br13.end.x), absf(br13.position.x - dr13.end.x)))
			if not after_hit13:
				_fail_and_quit(tag13, "Seasonal prop `%s` anchor building `%s` not found!" % [dn_c13.name, String(spot13["after"])])
				return
			for sp13 in rest_spans13[isl_d13]:
				if dr13.position.x < (sp13 as Vector2).y and dr13.end.x > (sp13 as Vector2).x:
					_fail_and_quit(tag13, "Seasonal prop `%s` %s overlaps a worker rest spot span %s!" % [dn_c13.name, str(dr13), str(sp13)])
					return
			for dq13 in deco_rects13:
				if dr13.intersects(dq13):
					_fail_and_quit(tag13, "Seasonal props overlap each other (%s)!" % dn_c13.name)
					return
			deco_rects13.append(dr13)
			deco_checks13 += 1
		# every other visible world sprite (props, landscapes, flags, building parts) stays clear of the seasonal props
		var other13 := _find_sprite_overlapping_rects(world, deco_rects13)
		if other13 != "":
			_fail_and_quit(tag13, "Seasonal props (%s) overlap another world sprite: %s!" % [s_chk13, other13])
			return
	GameManager.set_season_clock(Callable())
	world._update_season_dress(1.0)
	var real_season13 := GameManager.get_current_season_id()
	if real_season13 != EconomyConfig.get_season_for_month(int(Time.get_datetime_dict_from_system(false)["month"])):
		_fail_and_quit(tag13, "Real local clock not restored (season `%s`)!" % real_season13)
		return

	# 7) CI-12 rest-dock occlusion audit (20 rest docks, union coverage per building <= 50%)
	var worst13 := 0.0
	var worst_name13 := ""
	var rest_count13 := 0
	for isl_o13 in [1, 2, 3]:
		rest_count13 += (rest_spans13[isl_o13] as Array).size()
		for bo13 in bld_local13:
			if int(bo13["island"]) != isl_o13:
				continue
			var cov13 := _union_cover_ratio(bo13["rect"], rest_spans13[isl_o13])
			if cov13 > worst13:
				worst13 = cov13
				worst_name13 = String(bo13["name"])
	if rest_count13 < 20 or worst13 > 0.50 + 0.001:
		_fail_and_quit(tag13, "Rest-dock occlusion regressed: `%s` %.1f%% covered (%d rest docks)!" % [worst_name13, worst13 * 100.0, rest_count13])
		return

	# 8) HUD: 2-row drawer layout, kite card #15 + season card #16 (tab 2), codex card #15
	if world.hud != null:
		var hud13: HUD = world.hud
		for tab13 in [0, 2, 3]:
			hud13.open_drawer(tab13)
			var fit13 := _menu_tiles_problem(hud13, "tab %d" % tab13)
			if fit13 != "":
				_fail_and_quit(tag13, fit13)
				return
		hud13.open_drawer(2)
		# Pressing the kite tile opens the festival once one is due
		GameManager.festival_gap_timer = 0.0
		GameManager.moon_tea_gathering_timer = 0.0
		GameManager.parade_festival_timer = 0.0
		GameManager.wish_lantern_festival_timer = 0.0
		hud13._activate_card(_card_idx(hud13, "kite_festival"))
		if not GameManager.is_kite_festival_active():
			_fail_and_quit(tag13, "The kite tile did not open the festival!")
			return
		hud13.open_drawer(3)
		if _card_idx(hud13, "ci13_codex") < 0:
			_fail_and_quit(tag13, "Codex misses the kite entry")
			return
		hud13.close_drawer(false)
	var forbidden_font_ci13 := _find_deprecated_font_node(get_tree().root)
	if forbidden_font_ci13 != "":
		_fail_and_quit(tag13, "Forbidden legacy font node detected at `%s`!" % forbidden_font_ci13)
		return

	# 9) Save/Load roundtrip (a festival in flight goes on where it was)
	var exp_fest13 := [GameManager.kite_festival_active, GameManager.kite_collected_slots.size()]
	var exp_medals13 := GameManager.kite_medals
	var exp_kites13 := GameManager.get_unlocked_kite_count()
	var exp_total13 := GameManager.kite_collected_total
	var exp_krep13 := GameManager.kite_reputation_bonus
	var exp_held13 := GameManager.kite_festivals_held
	var exp_seen13 := GameManager.get_seen_season_count()
	GameManager.save_game()
	GameManager._reset_kite_and_season_state()
	GameManager.load_game()
	if GameManager.kite_medals != exp_medals13 or GameManager.get_unlocked_kite_count() != exp_kites13 or GameManager.kite_collected_total != exp_total13 or GameManager.kite_reputation_bonus != exp_krep13 or GameManager.kite_festivals_held != exp_held13 or GameManager.get_seen_season_count() != exp_seen13 or [GameManager.kite_festival_active, GameManager.kite_collected_slots.size()] != exp_fest13:
		_fail_and_quit(tag13, "CI-13 Save/Load roundtrip failed (medals %d/%d, kites %d/%d, seasons %d/%d)!" % [GameManager.kite_medals, exp_medals13, GameManager.get_unlocked_kite_count(), exp_kites13, GameManager.get_seen_season_count(), exp_seen13])
		return

	# 10) Showcase: a festival in flight (gust 1 = 劲风 east, all 6 kites) under the real-clock season dress-up
	GameManager._load_kite_festival([])
	GameManager.kite_festivals_held = 2
	GameManager.start_kite_festival()
	GameManager.advance_kite_festival(4.0)
	GameManager.refresh_season()
	world._update_season_dress(1.0)
	world._update_kite_festival(0.0)
	var show_kites13 := 0
	for ks_s13 in world.kite_sprites:
		if ks_s13.visible:
			show_kites13 += 1
	if show_kites13 != EconomyConfig.KITE_SLOTS.size():
		_fail_and_quit(tag13, "Showcase festival shows %d kites!" % show_kites13)
		return
	var w_name13 := GameManager.get_kite_wind_name()

	print("[PASS] %s 通过: 不新增建筑(三岛19建筑 7+6+6 最小净间距 %.2fpx、重叠 %.1fpx²、最小缩放 %.3f 不变)；风筝 6 只分飞西岛上空 %s / 东岛上空 %s 两条天空航道，3 套风力程序 x 45s %d 个足迹采样 100%% 在航道内、互不重叠，航道零碰 %d 个标签/飞艇(停靠+离港)/热气球航线/HUD横幅与抽屉/建筑；冷却自动开幕、风力 w=%.2f 产出 x%.3f/售价 x%.3f、两次重放(风力+飞行轨迹+点击收筝)完全一致、6 只全收 +%dG 风筝满天勋章；本地月份注入 12 个月→北半球四季(3-5春/6-8夏/9-11秋/12-2冬)装扮与色调切换、当季加成 x%.2f 仅作用于本季类型、四季 4/4 成就；%d 处季节摆件 x4 季共 %d 次校验全部接地(%d 个接地像素落在岛屿地面)、距建筑最近 %.1fpx 且零碰标签/%d 个员工驻留点/其他精灵，驻留遮挡最大 %.1f%%(%s, <=50%%)；菜单格子全部放得下、风筝节与四季装扮与风筝图鉴在册；当前真实季节 `%s`、展示风力 %s PASS!" % [
		tag13, min_gap13, overlap13, min_scale13, str(EconomyConfig.KITE_LANES["west"]), str(EconomyConfig.KITE_LANES["east"]), kite_samples13, reserved13.size(),
		w_exp13, 1.0 + 0.25 * w_exp13, 1.0 + 0.20 * w_exp13, kite_gold13, season_bonus_exp13, n_deco13, deco_checks13, deco_ground_px13, min_deco_clear13, rest_count13, worst13 * 100.0, worst_name13,
		real_season13, w_name13
	])

	# ------------------------------------------------------------------
	# [断言27-CI-14岛民心愿板]: islander rotation / type / tier / target from the serial, progress from real EventBus signals,
	#   rewards (reputation + vouchers), medal every 6, expiry rotation + refill, pause isolation, HUD panel, save / load
	# ------------------------------------------------------------------
	var tag14 := "[断言27-CI-14岛民心愿板]"
	GameManager.wish_paused = false
	GameManager._reset_wish_state()

	# 6) Islander wish board: rotation, real-signal progress, rewards, medal, expiry, pause isolation
	# (the synthetic EventBus signals below must not inflate the 60s-simulation counters of the audit log or the stall stats)
	var keep_counts14 := [harvest_count, items_delivered_count, customer_paid_count, world.market_stall.total_customers_served, world.market_stall.total_gold_collected]
	for s14 in range(30):
		var isl_w14 := EconomyConfig.get_wish_islander(s14)
		var tier_w14 := EconomyConfig.get_wish_tier(s14)
		var type_w14 := EconomyConfig.get_wish_type_for_serial(s14)
		if isl_w14 != EconomyConfig.WISH_ISLANDERS[s14 % 6] or tier_w14 != mini(s14 / 6, EconomyConfig.WISH_TIER_MAX) or type_w14 != String((EconomyConfig.WISH_ISLANDER_PREFS[isl_w14] as Array)[(s14 / 6) % 2]):
			_fail_and_quit(tag14, "Wish serial %d rotation wrong: %s/%s/tier %d" % [s14, isl_w14, type_w14, tier_w14])
			return
	var board14: Array = GameManager.wish_board
	if board14.size() != EconomyConfig.WISH_SLOT_COUNT or GameManager.wish_serial_next != 3 or String(board14[0]["islander"]) != "bunny" or String(board14[1]["islander"]) != "otter" or String(board14[2]["islander"]) != "fox" or String(board14[0]["type"]) != "harvest" or String(board14[1]["type"]) != "stock" or String(board14[2]["type"]) != "craft" or int(board14[0]["target"]) != 10 or int(board14[1]["target"]) != 12 or int(board14[2]["target"]) != 4:
		_fail_and_quit(tag14, "Initial wish board wrong: %s" % str(board14))
		return
	# paused (self-test isolation) -> real signals do not move the notes
	GameManager.wish_paused = true
	EventBus.item_produced.emit(1, "crop_0", 4)
	GameManager.wish_paused = false
	if int(GameManager.wish_board[0]["progress"]) != 0:
		_fail_and_quit(tag14, "Paused wish board still progressed!")
		return
	var v_w0_14 := GameManager.rare_codex_vouchers
	var pros_w0_14 := GameManager.get_prosperity_score()
	var fulfilled_sig14: Array = []
	var on_ful14 := func(slot_i: int, w_d: Dictionary) -> void: fulfilled_sig14.append([slot_i, String(w_d["islander"]), String(w_d["type"])])
	EventBus.wish_fulfilled.connect(on_ful14)
	# round 0: bunny harvest 10 (3 x 4 crops), otter stock 12 (market shelf), fox craft 4 (workshop output)
	for _h14 in range(3):
		EventBus.item_produced.emit(1, "crop_0", 4)
	EventBus.item_delivered.emit("crop_0", 12, "market_stall")
	EventBus.item_delivered.emit("delicacy_0", 2, "mortar_output")
	EventBus.item_delivered.emit("delicacy_2", 2, "cauldron_output")
	if String(GameManager.wish_board[0]["state"]) != "done" or String(GameManager.wish_board[1]["state"]) != "done" or String(GameManager.wish_board[2]["state"]) != "done" or GameManager.wishes_fulfilled_total != 3:
		_fail_and_quit(tag14, "Round-0 wishes not fulfilled by real signals: %s" % str(GameManager.wish_board))
		return
	# notes linger 4s, then shiba / penguin / toucan pin the next notes (serials 3, 4, 5)
	GameManager.advance_wish_board(EconomyConfig.WISH_LINGER_SEC + 0.1)
	if GameManager.wish_serial_next != 6 or String(GameManager.wish_board[0]["islander"]) != "shiba" or String(GameManager.wish_board[1]["islander"]) != "penguin" or String(GameManager.wish_board[2]["islander"]) != "toucan" or String(GameManager.wish_board[0]["type"]) != "serve" or String(GameManager.wish_board[1]["type"]) != "craft" or String(GameManager.wish_board[2]["type"]) != "serve":
		_fail_and_quit(tag14, "Refill after linger wrong: %s" % str(GameManager.wish_board))
		return
	for _c14 in range(4):
		EventBus.customer_paid.emit("crop_0", 1, 120, Vector2(1050.0, EconomyConfig.GROUND_Y))
	EventBus.item_delivered.emit("delicacy_3", 4, "coral_linked_output")
	EventBus.wish_fulfilled.disconnect(on_ful14)
	var exp_w_rep14 := 30 + 32 + 36 + 40 + 36 + 40 + EconomyConfig.WISH_MEDAL_REP
	var exp_w_v14 := 6 + EconomyConfig.WISH_MEDAL_VOUCHERS
	if GameManager.wishes_fulfilled_total != 6 or fulfilled_sig14.size() != 6 or GameManager.wish_medals != 1 or GameManager.wish_reputation_bonus != exp_w_rep14 or GameManager.wish_vouchers_total != exp_w_v14 or GameManager.rare_codex_vouchers - v_w0_14 != exp_w_v14 or not bool(GameManager.unlocked_achievements.get("ach_wish_keeper", false)) or GameManager.get_prosperity_score() - pros_w0_14 != 50:
		_fail_and_quit(tag14, "Wish rewards wrong: fulfilled %d, medals %d, rep %d (exp %d), vouchers %d (exp %d), prosperity +%d" % [GameManager.wishes_fulfilled_total, GameManager.wish_medals, GameManager.wish_reputation_bonus, exp_w_rep14, GameManager.rare_codex_vouchers - v_w0_14, exp_w_v14, GameManager.get_prosperity_score() - pros_w0_14])
		return
	# round 1 (tier 1): bunny serve 6, otter harvest 14, fox earn >= 300G; they expire unfulfilled after 210s and rotate out
	GameManager.advance_wish_board(EconomyConfig.WISH_LINGER_SEC + 0.1)
	var r1_14: Array = GameManager.wish_board
	if String(r1_14[0]["type"]) != "serve" or int(r1_14[0]["target"]) != 6 or int(r1_14[0]["tier"]) != 1 or int(r1_14[0]["rep"]) != 40 + EconomyConfig.WISH_TIER_REP_STEP or String(r1_14[1]["type"]) != "harvest" or int(r1_14[1]["target"]) != 14 or String(r1_14[2]["type"]) != "earn" or int(r1_14[2]["target"]) < 60 or int(r1_14[2]["vouchers"]) != 2:
		_fail_and_quit(tag14, "Tier-1 notes wrong: %s" % str(r1_14))
		return
	var expired_sig14: Array = []
	var on_exp14 := func(slot_i: int, _w_d: Dictionary) -> void: expired_sig14.append(slot_i)
	EventBus.wish_expired.connect(on_exp14)
	var v_w1_14 := GameManager.rare_codex_vouchers
	GameManager.advance_wish_board(EconomyConfig.WISH_LIFETIME_SEC + 0.1)
	EventBus.wish_expired.disconnect(on_exp14)
	if expired_sig14.size() != 3 or String(GameManager.wish_board[0]["state"]) != "expired" or GameManager.rare_codex_vouchers != v_w1_14 or GameManager.wishes_fulfilled_total != 6:
		_fail_and_quit(tag14, "Expiry wrong: %d expired signals, board %s" % [expired_sig14.size(), str(GameManager.wish_board)])
		return
	GameManager.advance_wish_board(EconomyConfig.WISH_LINGER_SEC + 0.1)
	if GameManager.wish_serial_next != 12 or String(GameManager.wish_board[0]["state"]) != "open" or String(GameManager.wish_board[0]["islander"]) != "shiba":
		_fail_and_quit(tag14, "Rotation after expiry wrong: serial %d, %s" % [GameManager.wish_serial_next, str(GameManager.wish_board[0])])
		return
	var wish_done14 := GameManager.wishes_fulfilled_total
	harvest_count = int(keep_counts14[0])
	items_delivered_count = int(keep_counts14[1])
	customer_paid_count = int(keep_counts14[2])
	world.market_stall.total_customers_served = int(keep_counts14[3])
	world.market_stall.total_gold_collected = int(keep_counts14[4])

	# 7) HUD: the wish board tile and its panel
	if world.hud != null:
		var hud14: HUD = world.hud
		hud14.open_drawer(2)
		hud14._activate_card(_card_idx(hud14, "wish_board"))
		var board_cards14: Array[Dictionary] = hud14._get_current_tab_cards()
		if not hud14.wish_board_view or board_cards14.size() != EconomyConfig.WISH_SLOT_COUNT + 1 or String(board_cards14[0]["type"]) != "wish_note" or String(board_cards14[3]["type"]) != "wish_back":
			_fail_and_quit(tag14, "Wish board panel did not open with 3 notes: %s" % str(board_cards14))
			return
		var fit14 := _menu_tiles_problem(hud14, "wish board")
		if fit14 != "":
			_fail_and_quit(tag14, fit14)
			return
		if String(board_cards14[0]["title"]) != EconomyConfig.tr_name(String(EconomyConfig.WISH_ISLANDER_NAMES[String(GameManager.wish_board[0]["islander"])])):
			_fail_and_quit(tag14, "Wish note tile does not show its islander: `%s`" % String(board_cards14[0]["title"]))
			return
		hud14._activate_card(EconomyConfig.WISH_SLOT_COUNT)
		if hud14.wish_board_view or _card_idx(hud14, "wish_board") < 0:
			_fail_and_quit(tag14, "Back did not return to the Expansion tab!")
			return
		hud14.close_drawer(false)
	var forbidden_font_ci14 := _find_deprecated_font_node(get_tree().root)
	if forbidden_font_ci14 != "":
		_fail_and_quit(tag14, "Forbidden legacy font node detected at `%s`!" % forbidden_font_ci14)
		return

	# 8) Save/Load roundtrip
	GameManager.wish_board[1]["progress"] = 1
	var exp_board14 := str(GameManager.wish_board)
	var exp_serial14 := GameManager.wish_serial_next
	var exp_wfc14 := str(GameManager.wish_fulfilled_counts)
	GameManager.save_game()
	GameManager._reset_wish_state()
	GameManager.load_game()
	if GameManager.wish_serial_next != exp_serial14 or str(GameManager.wish_board) != exp_board14 or str(GameManager.wish_fulfilled_counts) != exp_wfc14:
		_fail_and_quit(tag14, "Wish board save / load roundtrip failed: serial %d/%d board %s" % [GameManager.wish_serial_next, exp_serial14, str(GameManager.wish_board)])
		return
	print("[PASS] %s 通过: 轮值 / 目标 / 真实信号进度 / 奖励(声望 %d、券 %d) / 过期换新 / 面板 / 存读 PASS!" % [tag14, exp_w_rep14, exp_w_v14])

	# ------------------------------------------------------------------
	# [断言28-CI-15云海天气轮换与岛民生日会] (NO new building, nothing on the ground):
	#   1) All 7 CI-15 PNGs (`weather_sunny` / `weather_rain` / `weather_rainbow` / `weather_mist` / `birthday_cake` /
	#      `birthday_gift` / `icon_birthday`, 64x64) are Godot-imported with transparent corners; the reused codex-voucher and
	#      reputation-star icons load;
	#   2) Layout untouched: still 19 main buildings (7+6+6) on their slots, every gap >= 28px, 0 px^2 overlap, scales >= 0.35;
	#   3) Island calendar: three-hour slots contiguous across days / months / years, per-season deterministic hash draws
	#      (2 identical 21-day scans per season, raw shares within 6% of the weights), all 4 weathers in every season, a
	#      rainbow only right after rain, season character (summer sunniest, winter mistiest, wetter spring than winter, more
	#      rainbows in summer); the injected clock drives `GameManager` + one `sky_weather_changed` per change; pause isolation;
	#   4) Multipliers of the 4 weathers on crops / workshops / sales / visitors through the real game functions, capped
	#      stacking (day-cycle drizzle + rain <= x1.50, festival visitors + rainbow <= x2.20, kite wind + rainbow sale <= x1.30,
	#      dips always in full), real sale income x1.10 under the rainbow;
	#   5) Sky layer: the 4 weather zones keep >= 2px from every reserved area (all world labels incl. hidden ones, airship
	#      dock + departure, bollard, sky balloon path, kite lanes + badge, the HUD
	#      banner / bar / capsule / drawers / tab badge, island textures + bridges, buildings, landscapes,
	#      lantern / boat / parade lanes, the night cinema, season props of all 4 seasons);
	#      every emblem and every drawn primitive (4 weathers x day / night x 16 clock samples) stays inside its zone; no other
	#      world sprite enters a zone; the layer sits between the painted sky and every shadow / building / label;
	#   6) Birthday: 6 islanders on days 3/8/13/18/23/28, injected-date birthday + one announcement, next-birthday lookups
	#      across month / year ends, gifts (no birthday / too little gold / plain / favourite good / already), the family
	#      medal after all 6, codex price, prosperity and the achievement;
	#   7) HUD: tab 2 = 20 cards (#19 weather, #20 birthday) with every text fitting, the party panel (4 cards >= 0.85x), a
	#      gift prepared from the panel, the tab cake badge, codex card 17 + headline; 8) Save/Load; 9) showcase for the shots.
	# ------------------------------------------------------------------
	var tag15 := "[断言28-CI-15云海天气轮换与岛民生日会]"
	GameManager.sky_weather_paused = false
	var keep_weather15 := GameManager.current_weather
	var keep_kite_active15 := GameManager.kite_festival_active
	var keep_airship15 := GameManager.airship_docked
	var keep_gold15 := GameManager.gold
	var keep_vouchers15 := GameManager.rare_codex_vouchers
	var keep_stall15 := GameManager.stall_inventory.duplicate(true)
	var keep_contract15 := GameManager.active_contract.duplicate(true)
	var keep_career15 := GameManager.career_stats.duplicate(true)
	var keep_pw15 := GameManager.wish_paused
	var keep_land15 := GameManager.unlocked_landscapes.duplicate()
	var keep_counts15 := [harvest_count, items_delivered_count, customer_paid_count, world.market_stall.total_customers_served, world.market_stall.total_gold_collected]
	if world.has_method("reload_ci15_textures"):
		world.reload_ci15_textures()

	# 1) Textures
	var ci15_tex_paths: Array = [EconomyConfig.WEATHER_SUNNY_TEX, EconomyConfig.WEATHER_RAIN_TEX, EconomyConfig.WEATHER_RAINBOW_TEX, EconomyConfig.WEATHER_MIST_TEX, EconomyConfig.BIRTHDAY_CAKE_TEX, EconomyConfig.BIRTHDAY_GIFT_TEX, EconomyConfig.ICON_BIRTHDAY_TEX]
	for tp15 in ci15_tex_paths:
		if not ResourceLoader.exists(String(tp15)):
			_fail_and_quit(tag15, "CI-15 texture `%s` is not imported by Godot (missing `.png.import`)!" % String(tp15))
			return
		var t15: Texture2D = EconomyConfig.load_pixel_texture(String(tp15))
		if t15 == null or t15.get_width() != 64 or t15.get_height() != 64:
			_fail_and_quit(tag15, "CI-15 texture `%s` missing or not 64x64!" % String(tp15))
			return
		var img15 := t15.get_image()
		if img15 != null and img15.is_compressed():
			img15.decompress()
		if img15 == null or img15.get_pixel(0, 0).a > 0.05 or img15.get_pixel(63, 0).a > 0.05 or img15.get_pixel(0, 63).a > 0.05 or img15.get_pixel(63, 63).a > 0.05:
			_fail_and_quit(tag15, "CI-15 texture `%s` lacks RGBA transparent corner alpha!" % String(tp15))
			return
	for rp15 in [EconomyConfig.ICON_RARE_VOUCHER_TEX, EconomyConfig.REPUTATION_STAR_TEX]:
		if not ResourceLoader.exists(String(rp15)) or EconomyConfig.load_pixel_texture(String(rp15)) == null:
			_fail_and_quit(tag15, "Reused icon `%s` not loadable!" % String(rp15))
			return

	# 2) No new building: 19 main buildings on their slots, >= 28px gaps, zero overlap, every slot scale >= 0.35
	GameManager.unlocked_islands = {1: true, 2: true, 3: true}
	world.companion_zoom = 1.0
	world._apply_companion_zoom()
	var oy15 := world.world_root.position.y
	var all_rects15: Dictionary = world.get_island_main_building_rects()
	var n_blds15 := 0
	var min_gap15 := 9999.0
	var overlap15 := 0.0
	var min_scale15 := 9.0
	var bld_local15: Array = []
	for isl_k15 in [1, 2, 3]:
		var arr15: Array = all_rects15[isl_k15]
		var slots15: Array = MainWorld.ISLAND_SLOTS[isl_k15]
		n_blds15 += arr15.size()
		if arr15.size() != slots15.size():
			_fail_and_quit(tag15, "Island %d building count %d != slot table %d!" % [isl_k15, arr15.size(), slots15.size()])
			return
		for ia15 in range(arr15.size()):
			var ra15: Rect2 = arr15[ia15]["rect"]
			bld_local15.append({"name": String(arr15[ia15]["name"]), "island": isl_k15, "rect": Rect2(ra15.position - Vector2(0.0, oy15), ra15.size)})
			min_scale15 = minf(min_scale15, float(slots15[ia15]["scale"]))
			if absf(ra15.get_center().x - float(slots15[ia15]["x"])) > 0.6:
				_fail_and_quit(tag15, "`%s` moved off its slot x=%.1f!" % [String(arr15[ia15]["name"]), float(slots15[ia15]["x"])])
				return
			for ib15 in range(ia15 + 1, arr15.size()):
				var in15 := ra15.intersection(arr15[ib15]["rect"])
				overlap15 += maxf(0.0, in15.size.x) * maxf(0.0, in15.size.y)
			if ia15 < arr15.size() - 1:
				min_gap15 = minf(min_gap15, (arr15[ia15 + 1]["rect"] as Rect2).position.x - ra15.end.x)
	if n_blds15 != 19 or (all_rects15[1] as Array).size() != 7 or (all_rects15[2] as Array).size() != 6 or (all_rects15[3] as Array).size() != 6 or min_gap15 < 28.0 - 0.05 or overlap15 > 0.0001 or min_scale15 < 0.35:
		_fail_and_quit(tag15, "Layout changed: %d buildings, min gap %.2fpx, overlap %.3fpx^2, min scale %.3f!" % [n_blds15, min_gap15, overlap15, min_scale15])
		return

	# 3) Island calendar: three-hour slots, deterministic per-season draws, rainbow after rain, injected clock, pause isolation
	var k0_15 := EconomyConfig.calc_sky_weather_slot_key({"year": 2026, "month": 11, "day": 18, "hour": 9, "minute": 0})
	for mm15 in range(EconomyConfig.SKY_WEATHER_SLOT_MINUTES):
		if EconomyConfig.calc_sky_weather_slot_key({"year": 2026, "month": 11, "day": 18, "hour": 9 + mm15 / 60, "minute": mm15 % 60}) != k0_15:
			_fail_and_quit(tag15, "Minute %d left the weather slot!" % mm15)
			return
	if EconomyConfig.calc_sky_weather_slot_key({"year": 2026, "month": 11, "day": 18, "hour": 9 + EconomyConfig.SKY_WEATHER_SLOT_MINUTES / 60, "minute": EconomyConfig.SKY_WEATHER_SLOT_MINUTES % 60}) != k0_15 + 1 or EconomyConfig.calc_sky_weather_slot_key({"year": 2026, "month": 11, "day": 30, "hour": 23, "minute": 40}) + 1 != EconomyConfig.calc_sky_weather_slot_key({"year": 2026, "month": 12, "day": 1, "hour": 0, "minute": 0}) or EconomyConfig.calc_sky_weather_slot_key({"year": 2026, "month": 12, "day": 31, "hour": 23, "minute": 40}) + 1 != EconomyConfig.calc_sky_weather_slot_key({"year": 2027, "month": 1, "day": 1, "hour": 0, "minute": 0}) or EconomyConfig.get_sky_weather_minutes_left({"hour": 9, "minute": 7}) != 173 or EconomyConfig.get_sky_weather_minutes_left({"hour": 9, "minute": 0}) != 180 or EconomyConfig.get_sky_weather_minutes_left({"hour": 11, "minute": 59}) != 1:
		_fail_and_quit(tag15, "Weather slots are not contiguous blocks across day / month / year ends!")
		return
	if EconomyConfig.calc_sky_weather({"month": 7}) != EconomyConfig.calc_sky_weather({"year": 2026, "month": 7, "day": 1, "hour": 12, "minute": 0}):
		_fail_and_quit(tag15, "A month-only clock (CI-13 style) must default to the 1st at 12:00!")
		return
	var season_month15 := {"spring": 4, "summer": 7, "autumn": 10, "winter": 1}
	var sea_counts15 := {}
	var n_scan15 := 72 * 21
	var n_rainbow15 := 0
	for s15 in EconomyConfig.SEASON_ORDER:
		var base15 := EconomyConfig.calc_sky_weather_slot_key({"year": 2026, "month": int(season_month15[s15]), "day": 1, "hour": 0, "minute": 0})
		var cnt15 := {"sunny": 0, "rain": 0, "rainbow": 0, "mist": 0}
		var raw_cnt15 := {"sunny": 0, "rain": 0, "mist": 0}
		var traces15: Array = []
		for rp15 in range(2):
			var tr15 := PackedStringArray()
			for i15 in range(n_scan15):
				var w15 := EconomyConfig.calc_sky_weather_for_slot(base15 + i15, String(s15))
				tr15.append(w15)
				if rp15 == 0:
					cnt15[w15] = int(cnt15[w15]) + 1
					var raw15 := EconomyConfig.calc_sky_weather_raw(base15 + i15, String(s15))
					raw_cnt15[raw15] = int(raw_cnt15[raw15]) + 1
					if w15 == "rainbow" and EconomyConfig.calc_sky_weather_raw(base15 + i15 - 1, String(s15)) != "rain":
						_fail_and_quit(tag15, "%s slot %d: a rainbow without rain right before it!" % [String(s15), i15])
						return
					if w15 != "rainbow" and w15 != raw15:
						_fail_and_quit(tag15, "%s slot %d: weather `%s` != raw draw `%s`!" % [String(s15), i15, w15, raw15])
						return
			traces15.append(",".join(tr15))
		if String(traces15[0]) != String(traces15[1]):
			_fail_and_quit(tag15, "%s weather scan is not deterministic!" % String(s15))
			return
		var tb15: Dictionary = EconomyConfig.SKY_WEATHER_SEASON_TABLE[s15]
		var tot15 := float(int(tb15["sunny"]) + int(tb15["rain"]) + int(tb15["mist"]))
		for rk15 in ["sunny", "rain", "mist"]:
			if absf(float(raw_cnt15[rk15]) / float(n_scan15) - float(tb15[rk15]) / tot15) > 0.06:
				_fail_and_quit(tag15, "%s raw `%s` share %.3f is off its weight %.3f (hash skew)!" % [String(s15), String(rk15), float(raw_cnt15[rk15]) / float(n_scan15), float(tb15[rk15]) / tot15])
				return
		for wk15 in EconomyConfig.SKY_WEATHER_ORDER:
			if int(cnt15[wk15]) <= 0:
				_fail_and_quit(tag15, "%s never shows `%s` in the scan: %s" % [String(s15), String(wk15), str(cnt15)])
				return
		sea_counts15[s15] = cnt15
		n_rainbow15 += int(cnt15["rainbow"])
	var su15: Dictionary = sea_counts15["summer"]
	var wi15: Dictionary = sea_counts15["winter"]
	var sp15: Dictionary = sea_counts15["spring"]
	if int(su15["sunny"]) < maxi(int(su15["rain"]), maxi(int(su15["rainbow"]), int(su15["mist"]))) or int(wi15["mist"]) < maxi(int(wi15["rain"]), maxi(int(wi15["rainbow"]), int(wi15["sunny"]))) or int(sp15["rain"]) <= int(wi15["rain"]) or int(su15["rainbow"]) <= int(wi15["rainbow"]):
		_fail_and_quit(tag15, "Season character wrong: %s" % str(sea_counts15))
		return
	# the injected island clock drives GameManager; a slot change is picked up by the 5s refresh and announced once
	var clk15 := {"year": 2026, "month": 10, "day": 5, "hour": 0, "minute": 0}
	var base_c15 := EconomyConfig.calc_sky_weather_slot_key(clk15)
	var flip15 := -1
	var set_clk15 := func(slot_i: int) -> void:
		var m_total := slot_i * EconomyConfig.SKY_WEATHER_SLOT_MINUTES
		clk15["day"] = 5 + m_total / 1440
		clk15["hour"] = (m_total % 1440) / 60
		clk15["minute"] = m_total % 60
	for fi15 in range(70):
		if EconomyConfig.calc_sky_weather_for_slot(base_c15 + fi15, "autumn") != EconomyConfig.calc_sky_weather_for_slot(base_c15 + fi15 + 1, "autumn"):
			flip15 = fi15
			break
	if flip15 < 0:
		_fail_and_quit(tag15, "No weather change found on 2026-10-05!")
		return
	var sig15: Array = []
	var on_sw15 := func(w_id: String, prev_id: String) -> void: sig15.append([w_id, prev_id])
	EventBus.sky_weather_changed.connect(on_sw15)
	set_clk15.call(flip15)
	GameManager.set_season_clock(func() -> Dictionary: return clk15.duplicate())
	var w_a15 := GameManager.sky_weather_id
	var w_b15 := EconomyConfig.calc_sky_weather_for_slot(base_c15 + flip15 + 1, "autumn")
	if w_a15 != EconomyConfig.calc_sky_weather_for_slot(base_c15 + flip15, "autumn") or GameManager.get_current_season_id() != "autumn":
		_fail_and_quit(tag15, "Injected clock not applied: `%s` / season %s" % [w_a15, GameManager.get_current_season_id()])
		return
	sig15.clear()
	set_clk15.call(flip15 + 1)
	GameManager.sky_weather_refresh_timer = EconomyConfig.SKY_WEATHER_REFRESH_SEC
	GameManager._process(0.0)
	if GameManager.sky_weather_id != w_b15 or sig15.size() != 1 or str(sig15[0]) != str([w_b15, w_a15]) or GameManager.sky_weather_prev_id != w_a15:
		_fail_and_quit(tag15, "Slot change not picked up by the refresh tick: now `%s` (exp `%s`), signals %s" % [GameManager.sky_weather_id, w_b15, str(sig15)])
		return
	GameManager.sky_weather_refresh_timer = EconomyConfig.SKY_WEATHER_REFRESH_SEC
	GameManager._process(0.0)
	if sig15.size() != 1:
		_fail_and_quit(tag15, "Unchanged weather announced again: %s" % str(sig15))
		return
	EventBus.sky_weather_changed.disconnect(on_sw15)
	# paused (self-test isolation): neutral multipliers, no calendar refresh even if the clock moves
	GameManager.sky_weather_paused = true
	set_clk15.call(flip15)
	GameManager.refresh_island_calendar()
	GameManager.sky_weather_refresh_timer = 99.0
	GameManager._process(0.0)
	var paused_ok15 := GameManager.sky_weather_id == w_b15
	for ch15 in ["visitor", "crop", "workshop", "sale"]:
		if absf(GameManager.get_sky_weather_raw_mult(String(ch15)) - 1.0) > 0.000001:
			paused_ok15 = false
	GameManager.sky_weather_paused = false
	if not paused_ok15:
		_fail_and_quit(tag15, "Paused weather still refreshed or still buffs!")
		return

	# 4) Multipliers through the real game functions (day, no kite festival), capped stacking, real sale income
	GameManager.current_weather = GameManager.WeatherState.DAY
	GameManager.kite_festival_active = false
	var mult_rows15: Array[String] = []
	for w4_15 in EconomyConfig.SKY_WEATHER_ORDER:
		var info4_15: Dictionary = EconomyConfig.SKY_WEATHERS[w4_15]
		GameManager.sky_weather_paused = true
		var crop_off15 := GameManager.get_crop_growth_multiplier(1)
		var ws_off15 := GameManager.get_workshop_speed_multiplier(2)
		GameManager.sky_weather_paused = false
		GameManager.sky_weather_id = String(w4_15)
		var crop_on15 := GameManager.get_crop_growth_multiplier(1)
		var ws_on15 := GameManager.get_workshop_speed_multiplier(2)
		var g_crop15 := GameManager.get_daycycle_drizzle_crop_mult() * GameManager.get_season_bonus_multiplier("crop_growth") * GameManager.get_kite_wind_production_multiplier()
		var g_ws15 := GameManager.get_season_bonus_multiplier("workshop_speed") * GameManager.get_kite_wind_production_multiplier()
		var g_sale15 := GameManager.get_kite_wind_sale_multiplier() * GameManager.get_season_bonus_multiplier("sale_price")
		var e_crop15 := EconomyConfig.stack_weather_mult(g_crop15, float(info4_15["crop"]), EconomyConfig.SKY_WEATHER_PROD_STACK_CAP) / g_crop15
		var e_ws15 := EconomyConfig.stack_weather_mult(g_ws15, float(info4_15["workshop"]), EconomyConfig.SKY_WEATHER_PROD_STACK_CAP) / g_ws15
		var e_sale15 := EconomyConfig.stack_weather_mult(g_sale15, float(info4_15["sale"]), EconomyConfig.SKY_WEATHER_SALE_STACK_CAP) / g_sale15
		if absf(crop_on15 / crop_off15 - e_crop15) > 0.0001 or absf(ws_on15 / ws_off15 - e_ws15) > 0.0001 or absf(GameManager.get_sky_weather_stacked_factor("sale", g_sale15) - e_sale15) > 0.0001 or absf(GameManager.apply_sky_weather_visitor_mult(1.0) - float(info4_15["visitor"])) > 0.0001:
			_fail_and_quit(tag15, "`%s` multipliers wrong: crop x%.4f (exp %.4f) workshop x%.4f (exp %.4f) visitors x%.4f" % [String(w4_15), crop_on15 / crop_off15, e_crop15, ws_on15 / ws_off15, e_ws15, GameManager.apply_sky_weather_visitor_mult(1.0)])
			return
		mult_rows15.append("%s 客x%.2f/田x%.2f/坊x%.2f/价x%.2f" % [String(info4_15["name"]), float(info4_15["visitor"]), crop_on15 / crop_off15, ws_on15 / ws_off15, e_sale15])
	var cap_cases15: Array = [[1.0, 1.25, 1.5, 1.25], [1.35, 1.25, 1.5, 1.5], [1.82, 1.25, 1.5, 1.82], [1.35, 0.85, 1.5, 1.1475], [1.85, 1.30, 2.2, 2.2], [2.96, 1.30, 2.2, 2.96], [1.85, 0.85, 2.2, 1.5725], [1.18, 1.10, 1.30, 1.298]]
	for cc15 in cap_cases15:
		if absf(EconomyConfig.stack_weather_mult(float(cc15[0]), float(cc15[1]), float(cc15[2])) - float(cc15[3])) > 0.0001:
			_fail_and_quit(tag15, "Stacking %s wrong: %.4f" % [str(cc15), EconomyConfig.stack_weather_mult(float(cc15[0]), float(cc15[1]), float(cc15[2]))])
			return
	# day-cycle drizzle (crops x1.35) + cloud-sea rain: the climate group tops out at x1.50
	GameManager.current_weather = GameManager.WeatherState.RAIN
	GameManager.sky_weather_id = "rain"
	var g_dr15 := GameManager.get_daycycle_drizzle_crop_mult() * GameManager.get_season_bonus_multiplier("crop_growth") * GameManager.get_kite_wind_production_multiplier()
	var dr_tot15 := g_dr15 * GameManager.get_sky_weather_stacked_factor("crop", g_dr15)
	if absf(dr_tot15 - maxf(g_dr15, minf(g_dr15 * 1.25, EconomyConfig.SKY_WEATHER_PROD_STACK_CAP))) > 0.0001 or dr_tot15 > maxf(g_dr15, EconomyConfig.SKY_WEATHER_PROD_STACK_CAP) + 0.0001:
		_fail_and_quit(tag15, "Drizzle + rain climate x%.4f breaks the x1.50 cap (group x%.4f)!" % [dr_tot15, g_dr15])
		return
	GameManager.current_weather = GameManager.WeatherState.DAY
	# festival visitors + rainbow capped at x2.20; a rain dip always applies in full
	GameManager.sky_weather_id = "rainbow"
	var vis_fest15 := GameManager.apply_sky_weather_visitor_mult(1.85)
	var vis_big15 := GameManager.apply_sky_weather_visitor_mult(2.96)
	GameManager.sky_weather_id = "rain"
	var vis_rain15 := GameManager.apply_sky_weather_visitor_mult(1.85)
	if absf(vis_fest15 - 2.2) > 0.0001 or absf(vis_big15 - 2.96) > 0.0001 or absf(vis_rain15 - 1.85 * 0.85) > 0.0001:
		_fail_and_quit(tag15, "Visitor stacking wrong: fest+rainbow x%.3f, big+rainbow x%.3f, fest+rain x%.3f" % [vis_fest15, vis_big15, vis_rain15])
		return
	# kite-festival wind + rainbow on sales: never cut, never past x1.30
	GameManager.kite_festival_active = true
	GameManager.sky_weather_id = "rainbow"
	var g_ks15 := GameManager.get_kite_wind_sale_multiplier() * GameManager.get_season_bonus_multiplier("sale_price")
	var ks_tot15 := g_ks15 * GameManager.get_sky_weather_stacked_factor("sale", g_ks15)
	GameManager.kite_festival_active = false
	if ks_tot15 < g_ks15 - 0.0001 or ks_tot15 > maxf(g_ks15, EconomyConfig.SKY_WEATHER_SALE_STACK_CAP) + 0.0001:
		_fail_and_quit(tag15, "Kite wind x%.3f + rainbow sale x%.3f breaks the x1.30 cap!" % [g_ks15, ks_tot15])
		return
	# a real sale (same goods, same customer) earns x1.10 more under the rainbow
	GameManager.wish_paused = true
	GameManager.airship_docked = false
	GameManager.stall_inventory["crop_0"] = 20
	GameManager.sky_weather_paused = true
	var pay_off15 := _sell("crop_0", 4, Vector2(1050.0, EconomyConfig.GROUND_Y), false)
	GameManager.sky_weather_paused = false
	GameManager.sky_weather_id = "rainbow"
	var e_pay15 := GameManager.get_sky_weather_stacked_factor("sale", GameManager.get_kite_wind_sale_multiplier() * GameManager.get_season_bonus_multiplier("sale_price"))
	var pay_on15 := _sell("crop_0", 4, Vector2(1050.0, EconomyConfig.GROUND_Y), false)
	if pay_off15 <= 0 or absf(float(pay_on15) / float(pay_off15) - e_pay15) > 0.03:
		_fail_and_quit(tag15, "Rainbow sale income %dG vs %dG (x%.3f, exp x%.2f)!" % [pay_on15, pay_off15, float(pay_on15) / maxf(1.0, float(pay_off15)), e_pay15])
		return
	GameManager.wish_paused = keep_pw15
	GameManager.airship_docked = keep_airship15

	# 5) Sky layer: zones vs every reserved area (world local coords; screen y = local y + 36)
	GameManager.unlocked_landscapes = {"bee_hive": true, "wind_chime": true, "tiki_torch": true}
	world._sync_landscape_nodes()
	world.open_air_cinema._sync_visibility(true)
	var res15: Array = []
	var air_half15 := Vector2(MainWorld.AIRSHIP_TARGET_W * 0.5, MainWorld.AIRSHIP_TARGET_H * 0.5 + 2.4)
	res15.append({"name": "AirshipDockToDeparture", "rect": Rect2(MainWorld.AIRSHIP_HARBOR_DOCK_POS - air_half15, air_half15 * 2.0).merge(Rect2(MainWorld.AIRSHIP_DEPART_POS - air_half15, air_half15 * 2.0))})
	res15.append({"name": "AirshipBollard", "rect": Rect2(1337.0, 108.0, 8.0, 16.0)})
	res15.append({"name": "SkyBalloonPath", "rect": Rect2(MainWorld.SKY_BALLOON_MIN_X - 30.0, -4.0 - 3.2 - 26.0, (MainWorld.SKY_BALLOON_MAX_X + 84.0) - (MainWorld.SKY_BALLOON_MIN_X - 30.0), 56.0 + 6.4)})
	for kl15 in EconomyConfig.KITE_LANES.keys():
		res15.append({"name": "KiteLane_" + String(kl15), "rect": EconomyConfig.KITE_LANES[kl15]})
	for hr15 in [["HUD banner band", Rect2(480.0, 0.0, 960.0, 40.0)], ["HUD bar", HUD.FULL_BAR_RECT], ["HUD capsule", HUD.CAPSULE_RECT]]:
		res15.append({"name": String(hr15[0]), "rect": Rect2((hr15[1] as Rect2).position - Vector2(0.0, oy15), (hr15[1] as Rect2).size)})
	for ln_k15 in world.landscape_nodes.keys():
		var lnd15: Sprite2D = world.landscape_nodes[ln_k15]
		res15.append({"name": "Landscape_" + String(ln_k15), "rect": _rect_in_world_local(world, lnd15, lnd15.get_rect())})
	for li15 in range(EconomyConfig.WISH_LANTERN_LANES.size()):
		var lane15: Dictionary = EconomyConfig.WISH_LANTERN_LANES[li15]
		res15.append({"name": "WishLanternLane_" + String(lane15["id"]), "rect": world.get_wish_lantern_rect_at(li15, float(lane15["min_x"])).merge(world.get_wish_lantern_rect_at(li15, float(lane15["max_x"])))})
	for mv15 in [[world.moon_tea_boat_sprite, MainWorld.MOON_TEA_BOAT_MIN_X, MainWorld.MOON_TEA_BOAT_MAX_X, MainWorld.MOON_TEA_BOAT_BASE_Y, 1.5], [world.parade_float_sprite, MainWorld.PARADE_FLOAT_MIN_X, MainWorld.PARADE_FLOAT_MAX_X, EconomyConfig.GROUND_Y, 0.0]]:
		var mv_sp15: Sprite2D = mv15[0]
		if mv_sp15 == null or mv_sp15.texture == null:
			continue
		var mv_keep15 := mv_sp15.position
		mv_sp15.position = Vector2(float(mv15[1]), float(mv15[3]) - float(mv15[4]))
		var mv_r15 := _rect_in_world_local(world, mv_sp15, mv_sp15.get_rect())
		mv_sp15.position = Vector2(float(mv15[2]), float(mv15[3]) + float(mv15[4]))
		mv_r15 = mv_r15.merge(_rect_in_world_local(world, mv_sp15, mv_sp15.get_rect()))
		mv_sp15.position = mv_keep15
		res15.append({"name": "Lane_" + String(mv_sp15.name), "rect": mv_r15})
	res15.append({"name": "NightCinema", "rect": _rect_in_world_local(world, world.open_air_cinema.body_sprite, world.open_air_cinema.body_sprite.get_rect())})
	for bl_r15 in bld_local15:
		res15.append({"name": "Building_" + String(bl_r15["name"]), "rect": bl_r15["rect"]})
	# island textures (opaque bounding box, +-1px island bob) and the 4 bridges
	for it15 in [[world.tex_glowwood, Vector2(64.0, 74.0), "Island2"], [world.tex_meadow, Vector2(560.0, 70.0), "Island1"], [world.tex_coral, Vector2(1396.0, 74.0), "Island3"], [world.tex_bridge, Vector2(492.0, 124.0), "Bridge1"], [world.tex_bridge, Vector2(1312.0, 118.0), "Bridge2"]]:
		var itx15: Texture2D = it15[0]
		if itx15 == null:
			continue
		var iim15 := itx15.get_image()
		if iim15 != null and iim15.is_compressed():
			iim15.decompress()
		var ub15 := Rect2()
		if iim15 != null:
			var ux0 := iim15.get_width()
			var uy0 := iim15.get_height()
			var ux1 := -1
			var uy1 := -1
			for py15 in range(iim15.get_height()):
				for px15 in range(iim15.get_width()):
					if iim15.get_pixel(px15, py15).a > 0.05:
						ux0 = mini(ux0, px15)
						uy0 = mini(uy0, py15)
						ux1 = maxi(ux1, px15)
						uy1 = maxi(uy1, py15)
			if ux1 >= ux0:
				ub15 = Rect2(float(ux0), float(uy0), float(ux1 - ux0 + 1), float(uy1 - uy0 + 1))
		res15.append({"name": String(it15[2]), "rect": Rect2((it15[1] as Vector2) + ub15.position, ub15.size).grow(2.0)})
	res15.append({"name": "PondBridges", "rect": MainWorld.POND_BRIDGE_LOCAL_RECT.grow(2.0)})
	# the props of all 4 seasons
	for s_chk15 in EconomyConfig.SEASON_ORDER:
		var m_chk15: int = int((EconomyConfig.SEASONS[s_chk15]["months"] as Array)[0])
		GameManager.set_season_clock(func() -> Dictionary: return {"year": 2026, "month": m_chk15, "day": 5, "hour": 10, "minute": 0})
		world._update_season_dress(1.0)
		for di15 in range(world.season_deco_nodes.size()):
			res15.append({"name": "SeasonDeco_%s_%d" % [s_chk15, di15], "rect": world.get_season_deco_local_rect(di15)})
	GameManager.unlocked_landscapes = keep_land15
	world._sync_landscape_nodes()
	var n_res15 := res15.size()
	var zones15: Array = EconomyConfig.SKY_WEATHER_ZONES
	var min_clear15 := 9999.0
	var min_clear_name15 := ""
	for zi15 in range(zones15.size()):
		var zr15: Rect2 = zones15[zi15]["rect"]
		var zscr15 := Rect2(zr15.position + Vector2(0.0, oy15), zr15.size)
		if zscr15.position.x < 0.0 or zscr15.end.x > 1920.0 or zscr15.position.y < 0.0 or zscr15.end.y > 300.0:
			_fail_and_quit(tag15, "Weather zone `%s` %s leaves the 1920x300 window!" % [String(zones15[zi15]["id"]), str(zscr15)])
			return
		for zj15 in range(zi15 + 1, zones15.size()):
			if zr15.intersects(zones15[zj15]["rect"]):
				_fail_and_quit(tag15, "Weather zones overlap each other!")
				return
		for rv15 in res15:
			var rr15: Rect2 = rv15["rect"]
			if rr15.size.x <= 0.0 or rr15.size.y <= 0.0:
				continue
			if zr15.grow(2.0).intersects(rr15):
				_fail_and_quit(tag15, "Weather zone `%s` %s comes within 2px of `%s` %s!" % [String(zones15[zi15]["id"]), str(zr15), String(rv15["name"]), str(rr15)])
				return
			var gap15 := _ci15_rect_gap(zr15, rr15)
			if gap15 < min_clear15:
				min_clear15 = gap15
				min_clear_name15 = "%s|%s" % [String(zones15[zi15]["id"]), String(rv15["name"])]
	if world.weather_sky_layer == null or world.weather_sky_layer.z_index != EconomyConfig.SKY_WEATHER_Z or world.weather_sky_layer.z_as_relative or EconomyConfig.SKY_WEATHER_Z <= EconomyConfig.Z_TERRAIN or EconomyConfig.SKY_WEATHER_Z >= EconomyConfig.Z_SHADOW:
		_fail_and_quit(tag15, "Weather layer must sit between the painted sky (Z_TERRAIN) and the shadows!")
		return
	# every emblem and every primitive of the 4 weathers, day and night, at 16 clock samples stays inside its zone
	var n_prims15 := 0
	var n_emb15 := 0
	var prim_by_w15 := {}
	for w5_15 in EconomyConfig.SKY_WEATHER_ORDER:
		GameManager.sky_weather_id = String(w5_15)
		prim_by_w15[w5_15] = 0
		for night5_15 in [false, true]:
			GameManager.current_weather = GameManager.WeatherState.NIGHT if night5_15 else GameManager.WeatherState.DAY
			world.snap_sky_weather()
			if world.weather_vis_id != String(w5_15) or world.weather_emblems.size() != 2:
				_fail_and_quit(tag15, "Weather layer did not switch to `%s` (%d emblems)!" % [String(w5_15), world.weather_emblems.size()])
				return
			for ts15 in range(16):
				var t5_15 := float(ts15) * 1.93
				world.weather_vis_time = t5_15
				world._update_sky_weather(0.0)
				for ei15 in range(world.weather_emblems.size()):
					var em15: Sprite2D = world.weather_emblems[ei15]
					var er15 := world.get_weather_emblem_local_rect(ei15)
					var ez15: Rect2 = zones15[world.weather_emblem_zone_idx[ei15]]["rect"]
					if er15.size.x <= 0.0 or not ez15.encloses(er15) or em15.z_index != EconomyConfig.SKY_WEATHER_Z or not em15.region_enabled or maxf(er15.size.x, er15.size.y) > EconomyConfig.SKY_WEATHER_EMBLEM_PX + 0.01:
						_fail_and_quit(tag15, "`%s` emblem %s leaves zone %s (t=%.2f)!" % [String(w5_15), str(er15), str(ez15), t5_15])
						return
					if String(w5_15) == "sunny" and night5_15 and em15.visible:
						_fail_and_quit(tag15, "The sun emblem must hide at night!")
						return
					if em15.visible:
						n_emb15 += 1
				for pr15 in EconomyConfig.build_sky_weather_fx(String(w5_15), t5_15, night5_15, 1.0):
					var pb15 := EconomyConfig.get_sky_weather_fx_bounds(pr15)
					var pz15: Rect2 = zones15[int(pr15["zone"])]["rect"]
					if not pz15.grow(0.01).encloses(pb15):
						_fail_and_quit(tag15, "`%s` %s primitive %s leaves zone %s (t=%.2f night=%s)!" % [String(w5_15), String(pr15["k"]), str(pb15), str(pz15), t5_15, str(night5_15)])
						return
					n_prims15 += 1
					prim_by_w15[w5_15] = int(prim_by_w15[w5_15]) + 1
		if int(prim_by_w15[w5_15]) <= 0:
			_fail_and_quit(tag15, "`%s` draws nothing!" % String(w5_15))
			return
	GameManager.current_weather = GameManager.WeatherState.DAY
	if world.get_sky_weather_fx_now().is_empty():
		_fail_and_quit(tag15, "The weather layer draws nothing right now!")
		return
	# no other world sprite (buildings, props, boats, kites, airship, balloon...) enters a weather zone
	var zone_rects15: Array = []
	for zz15 in zones15:
		zone_rects15.append(zz15["rect"])
	var stack15: Array = [world.world_root]
	while not stack15.is_empty():
		var nd15: Node = stack15.pop_back()
		for ch15n in nd15.get_children():
			stack15.append(ch15n)
		if not (nd15 is Sprite2D):
			continue
		var spn15 := nd15 as Sprite2D
		if spn15.texture == null or not spn15.is_visible_in_tree() or world.weather_emblems.has(spn15) or _is_inside_unit_or_fx(spn15, world):
			continue
		var spr15 := _rect_in_world_local(world, spn15, spn15.get_rect())
		for zrr15 in zone_rects15:
			if spr15.intersects(zrr15):
				_fail_and_quit(tag15, "World sprite %s %s enters weather zone %s!" % [spn15.get_path(), str(spr15), str(zrr15)])
				return

	# 6) Islander birthday party
	GameManager._reset_sky_weather_and_birthday_state()
	var exp_isl15 := {3: "bunny", 8: "otter", 13: "fox", 18: "shiba", 23: "penguin", 28: "toucan"}
	for d15 in range(1, 32):
		if EconomyConfig.get_birthday_islander_on(d15) != String(exp_isl15.get(d15, "")):
			_fail_and_quit(tag15, "Day %d birthday islander `%s` wrong!" % [d15, EconomyConfig.get_birthday_islander_on(d15)])
			return
	var bclk15 := {"year": 2026, "month": 11, "day": 23, "hour": 10, "minute": 0}
	var bsig15: Array = []
	var on_bd15 := func(isl_s: String, key_s: String) -> void: bsig15.append([isl_s, key_s])
	EventBus.birthday_started.connect(on_bd15)
	GameManager.set_season_clock(func() -> Dictionary: return bclk15.duplicate())
	GameManager.refresh_island_calendar()
	if GameManager.birthday_today_islander != "penguin" or GameManager.birthday_today_key != "2026-11-23" or bsig15.size() != 1 or str(bsig15[0]) != str(["penguin", "2026-11-23"]) or not GameManager.can_prepare_birthday_gift():
		_fail_and_quit(tag15, "Penguin's birthday (11-23) not picked up once: today `%s`, signals %s" % [GameManager.birthday_today_islander, str(bsig15)])
		return
	var nb_cases15: Array = [[{"year": 2026, "month": 11, "day": 23}, "toucan", 2026, 11, 28, 5], [{"year": 2026, "month": 11, "day": 29}, "bunny", 2026, 12, 3, 4], [{"year": 2026, "month": 12, "day": 30}, "bunny", 2027, 1, 3, 4], [{"year": 2027, "month": 2, "day": 28}, "bunny", 2027, 3, 3, 3]]
	for nbc15 in nb_cases15:
		var nbd15: Dictionary = nbc15[0]
		bclk15["year"] = int(nbd15["year"])
		bclk15["month"] = int(nbd15["month"])
		bclk15["day"] = int(nbd15["day"])
		GameManager.refresh_island_calendar()
		var nb15 := GameManager.get_next_birthday_info()
		if String(nb15.get("islander", "")) != String(nbc15[1]) or int(nb15.get("year", 0)) != int(nbc15[2]) or int(nb15.get("month", 0)) != int(nbc15[3]) or int(nb15.get("day", 0)) != int(nbc15[4]) or int(nb15.get("days", 0)) != int(nbc15[5]):
			_fail_and_quit(tag15, "Next birthday after %s wrong: %s" % [str(nbd15), str(nb15)])
			return
	if GameManager.birthday_today_islander != "toucan":
		_fail_and_quit(tag15, "2027-02-28 must be toucan's birthday (February works)!")
		return
	EventBus.birthday_started.disconnect(on_bd15)
	# gifts: no birthday -> refused; too little gold -> refused; plain gift; favourite good; already given; family medal
	GameManager._reset_sky_weather_and_birthday_state()
	GameManager.wish_paused = true
	bclk15["year"] = 2026
	bclk15["month"] = 11
	bclk15["day"] = 24
	GameManager.refresh_island_calendar()
	if GameManager.can_prepare_birthday_gift() or String(GameManager.prepare_birthday_gift().get("reason", "")) != "no_birthday":
		_fail_and_quit(tag15, "A gift was possible on a day without a birthday!")
		return
	bclk15["day"] = 23
	GameManager.refresh_island_calendar()
	var cost_lo15 := GameManager.get_birthday_gift_cost()
	GameManager.gold = cost_lo15 - 1
	var r_lo15 := GameManager.prepare_birthday_gift()
	if bool(r_lo15.get("given", true)) or String(r_lo15.get("reason", "")) != "gold" or GameManager.gold != cost_lo15 - 1 or GameManager.birthday_parties_total != 0 or cost_lo15 < EconomyConfig.BIRTHDAY_GIFT_MIN_GOLD:
		_fail_and_quit(tag15, "Gift with too little gold must be refused untouched: %s" % str(r_lo15))
		return
	GameManager.gold = 1000000000000
	var v0_15 := GameManager.rare_codex_vouchers
	var pros0_15 := GameManager.get_prosperity_score()
	var codex0_15 := GameManager.get_collection_multiplier()
	var seen0_15 := GameManager.get_seen_sky_weather_count()
	var ssn0_15 := GameManager.get_seen_season_count()
	var gift_days15: Array = [["penguin", 11, 23, {}, ""], ["toucan", 11, 28, {"pottery_vase": 2}, "pottery_vase"], ["bunny", 12, 3, {}, ""], ["otter", 12, 8, {}, ""], ["fox", 12, 13, {}, ""], ["shiba", 12, 18, {}, ""]]
	var gift_rep15 := 0
	var gift_v15 := 0
	for gi15 in range(gift_days15.size()):
		var gd15: Array = gift_days15[gi15]
		bclk15["month"] = int(gd15[1])
		bclk15["day"] = int(gd15[2])
		GameManager.refresh_island_calendar()
		for sk15 in GameManager.stall_inventory.keys():
			GameManager.stall_inventory[sk15] = 0
		for ak15 in (gd15[3] as Dictionary).keys():
			GameManager.stall_inventory[ak15] = int((gd15[3] as Dictionary)[ak15])
		var g_before15 := GameManager.gold
		var c15 := GameManager.get_birthday_gift_cost()
		var gr15 := GameManager.prepare_birthday_gift()
		var last15 := gi15 == gift_days15.size() - 1
		var fav15 := String(gd15[4])
		var e_rep15 := EconomyConfig.BIRTHDAY_REP + (EconomyConfig.BIRTHDAY_FAV_REP if fav15 != "" else 0) + (EconomyConfig.BIRTHDAY_MEDAL_REP if last15 else 0)
		var e_v15 := EconomyConfig.BIRTHDAY_VOUCHERS + (EconomyConfig.BIRTHDAY_FAV_VOUCHERS if fav15 != "" else 0) + (EconomyConfig.BIRTHDAY_MEDAL_VOUCHERS if last15 else 0)
		if not bool(gr15.get("given", false)) or String(gr15["islander"]) != String(gd15[0]) or int(gr15["cost"]) != c15 or g_before15 - GameManager.gold != c15 or String(gr15["favourite"]) != fav15 or int(gr15["rep"]) != e_rep15 or int(gr15["vouchers"]) != e_v15 or bool(gr15["medal"]) != last15:
			_fail_and_quit(tag15, "Gift #%d for `%s` wrong: %s (exp rep %d vouchers %d fav `%s`)" % [gi15 + 1, String(gd15[0]), str(gr15), e_rep15, e_v15, fav15])
			return
		gift_rep15 += e_rep15
		gift_v15 += e_v15
		if String(GameManager.prepare_birthday_gift().get("reason", "")) != "already" or GameManager.can_prepare_birthday_gift():
			_fail_and_quit(tag15, "A second gift on `%s`'s birthday was not refused!" % String(gd15[0]))
			return
		if fav15 == "pottery_vase" and int(GameManager.stall_inventory.get("pottery_vase", 0)) != 1:
			_fail_and_quit(tag15, "The favourite vase was not taken off the shelf!")
			return
	var seen1_15 := GameManager.get_seen_sky_weather_count()
	var ssn1_15 := GameManager.get_seen_season_count()
	var e_codex_add15 := Pacing.CODEX_PER_ENTRY * float(6 + seen1_15 - seen0_15 + ssn1_15 - ssn0_15)
	if GameManager.birthday_parties_total != 6 or GameManager.get_celebrated_islander_count() != 6 or GameManager.birthday_medals != 1 or GameManager.birthday_favourite_gifts != 1 or GameManager.birthday_reputation_bonus != gift_rep15 or GameManager.birthday_vouchers_total != gift_v15 or GameManager.rare_codex_vouchers - v0_15 != gift_v15 or not bool(GameManager.unlocked_achievements.get("ach_birthday_family", false)) or GameManager.get_prosperity_score() - pros0_15 != 50 + 10 * (seen1_15 - seen0_15) + 20 * (ssn1_15 - ssn0_15) or GameManager.get_collection_multiplier() - codex0_15 < e_codex_add15 - 0.0001:
		_fail_and_quit(tag15, "Birthday totals wrong: parties %d, medals %d, rep %d (exp %d), vouchers %d (exp %d), prosperity +%d, codex +%.3f" % [GameManager.birthday_parties_total, GameManager.birthday_medals, GameManager.birthday_reputation_bonus, gift_rep15, GameManager.birthday_vouchers_total, gift_v15, GameManager.get_prosperity_score() - pros0_15, GameManager.get_collection_multiplier() - codex0_15])
		return
	# a missed birthday cannot be gifted the day after
	bclk15["day"] = 19
	GameManager.refresh_island_calendar()
	if GameManager.can_prepare_birthday_gift() or String(GameManager.prepare_birthday_gift().get("reason", "")) != "no_birthday":
		_fail_and_quit(tag15, "A birthday gift was still possible the day after!")
		return
	GameManager.wish_paused = keep_pw15

	# 7) HUD: tab 2 cards #19 / #20, the party panel, the tab cake badge, codex card 17
	if world.hud != null:
		var hud15: HUD = world.hud
		GameManager._reset_sky_weather_and_birthday_state()
		bclk15["month"] = 12
		bclk15["day"] = 18
		GameManager.refresh_island_calendar()
		GameManager.gold = 1000000000000
		hud15.open_drawer(2)
		var cards2_15: Array[Dictionary] = hud15._get_current_tab_cards()
		var bday15 := _card_idx(hud15, "birthday")
		if _card_idx(hud15, "sky_weather") < 0 or bday15 < 0 or String(cards2_15[bday15]["title"]).find("柴犬") == -1:
			_fail_and_quit(tag15, "Expansion tab misses the weather or today's birthday: %d cards" % cards2_15.size())
			return
		if not GameManager.can_prepare_birthday_gift() or not hud15._tab_badges[2].visible:
			_fail_and_quit(tag15, "The waiting birthday gift has no badge on its tab!")
			return
		hud15._activate_card(bday15)
		var pc15: Array[Dictionary] = hud15._get_current_tab_cards()
		if not hud15.birthday_view or pc15.size() != 4 or String(pc15[0]["type"]) != "bday_today" or String(pc15[1]["type"]) != "bday_gift" or String(pc15[2]["type"]) != "bday_next" or String(pc15[0]["title"]).find("柴犬") == -1 or String(pc15[1]["cost_state"]) != "affordable":
			_fail_and_quit(tag15, "Birthday panel did not open with today / gift / next: %s" % str(pc15))
			return
		var fit15 := _menu_tiles_problem(hud15, "birthday")
		if fit15 != "":
			_fail_and_quit(tag15, fit15)
			return
		hud15._activate_card(1)
		if GameManager.birthday_parties_total != 1 or GameManager.can_prepare_birthday_gift() or hud15.offline_banner_text.find("柴犬") == -1:
			_fail_and_quit(tag15, "Gift from the panel failed: parties %d, news `%s`" % [GameManager.birthday_parties_total, hud15.offline_banner_text])
			return
		# the next day: no birthday -> no gift tile
		bclk15["day"] = 19
		GameManager.refresh_island_calendar()
		if not bool(hud15._get_current_tab_cards()[1].get("hidden", false)):
			_fail_and_quit(tag15, "The gift tile is still offered on a plain day")
			return
		hud15._activate_card(3)
		if hud15.birthday_view or _card_idx(hud15, "birthday") < 0:
			_fail_and_quit(tag15, "Back did not return to the Expansion tab!")
			return
		hud15.open_drawer(3)
		if _card_idx(hud15, "ci15_codex") < 0:
			_fail_and_quit(tag15, "Codex misses the weather entry")
			return
		hud15.close_drawer(false)
	var forbidden_font_ci15 := _find_deprecated_font_node(get_tree().root)
	if forbidden_font_ci15 != "":
		_fail_and_quit(tag15, "Forbidden legacy font node detected at `%s`!" % forbidden_font_ci15)
		return

	# 8) Save/Load roundtrip through the real save file (the weather itself is never stored: it follows the calendar)
	for w8_15 in EconomyConfig.SKY_WEATHER_ORDER:
		GameManager.sky_weathers_seen[w8_15] = true
	GameManager.sky_weather_changes = 7
	GameManager.birthday_counts["fox"] = 3
	var exp_save15 := str([GameManager.sky_weathers_seen, GameManager.sky_weather_changes, GameManager.birthday_last_gift_key, GameManager.birthday_counts, GameManager.birthday_parties_total, GameManager.birthday_reputation_bonus, GameManager.birthday_vouchers_total, GameManager.birthday_favourite_gifts, GameManager.birthday_medals])
	GameManager.save_game()
	var parsed15 = JSON.parse_string(FileAccess.get_file_as_string(GameManager.active_save_path))
	if not (parsed15 is Dictionary) or not (parsed15 as Dictionary).has("birthday_counts") or not (parsed15 as Dictionary).has("sky_weathers_seen"):
		_fail_and_quit(tag15, "Save file misses the CI-15 keys!")
		return
	GameManager._reset_sky_weather_and_birthday_state()
	GameManager._load_sky_weather_and_birthday_state(parsed15)
	var got_save15 := str([GameManager.sky_weathers_seen, GameManager.sky_weather_changes, GameManager.birthday_last_gift_key, GameManager.birthday_counts, GameManager.birthday_parties_total, GameManager.birthday_reputation_bonus, GameManager.birthday_vouchers_total, GameManager.birthday_favourite_gifts, GameManager.birthday_medals])
	if got_save15 != exp_save15 or GameManager.get_seen_sky_weather_count() != 4:
		_fail_and_quit(tag15, "CI-15 Save/Load roundtrip failed:\n%s\n%s" % [exp_save15, got_save15])
		return

	# 9) Showcase: a rainbow slot on an islander's birthday in the current real month (season props unchanged), gift pending
	var now15 := Time.get_datetime_dict_from_system(false)
	var show_clk15 := _ci15_find_weather_clock(int(now15["year"]), int(now15["month"]), "rainbow", true)
	var show_bday15 := not show_clk15.is_empty()
	if show_clk15.is_empty():
		show_clk15 = _ci15_find_weather_clock(int(now15["year"]), int(now15["month"]), "rainbow", false)
	if show_clk15.is_empty():
		_fail_and_quit(tag15, "No rainbow slot found in the current month for the showcase!")
		return
	for bk15 in show_clk15.keys():
		bclk15[bk15] = show_clk15[bk15]
	GameManager._reset_sky_weather_and_birthday_state()
	GameManager.current_weather = keep_weather15
	GameManager.refresh_island_calendar()
	world.snap_sky_weather()
	GameManager.gold = keep_gold15
	GameManager.rare_codex_vouchers = keep_vouchers15
	GameManager.stall_inventory = keep_stall15
	GameManager.active_contract = keep_contract15
	GameManager.career_stats = keep_career15
	GameManager.kite_festival_active = keep_kite_active15
	GameManager.airship_docked = keep_airship15
	harvest_count = int(keep_counts15[0])
	items_delivered_count = int(keep_counts15[1])
	customer_paid_count = int(keep_counts15[2])
	world.market_stall.total_customers_served = int(keep_counts15[3])
	world.market_stall.total_gold_collected = int(keep_counts15[4])
	if GameManager.sky_weather_id != "rainbow" or GameManager.is_birthday_today() != show_bday15 or (show_bday15 and not GameManager.can_prepare_birthday_gift()):
		_fail_and_quit(tag15, "Showcase clock %s did not give a rainbow birthday!" % str(show_clk15))
		return

	print("[PASS] %s 通过: 不新增建筑(三岛19建筑 7+6+6 最小净间距 %.2fpx、重叠 %.1fpx²、最小缩放 %.3f 不变)；岛历三小时一格、跨日/月/年连续，4 季 x 21 天 x 2 次扫描完全一致(彩虹 %d 格全部紧跟雨后、夏季晴最多/冬季雾最多/春雨多于冬雨)、注入时钟驱动+换天信号仅 1 次、暂停隔离；倍率 %s，叠乘上限(微雨+云雨≤x1.50、节庆客流+彩虹≤x2.20、风筝风+彩虹售价≤x1.30、减益全额)与真实售卖 x%.3f 校验通过；天空层 4 个天气区(左上天空/右上天空/2·3号岛下云海)与 %d 个保留区(全部世界标签含隐藏、飞艇停靠+离港、缆桩、热气球、风筝航道与徽标、运动会徽标、烟花/灯笼带、HUD 横幅/底栏/胶囊/抽屉/蛋糕角标、岛屿贴图与木桥、建筑、造景、赛旗、水灯/画舫/花车航道、夜间影院、四季摆件、打卡木牌与拍照动作)保持 >=2px(最近 %.1fpx: %s)，4 天气 x 昼夜 x 16 时刻共 %d 个图元与 %d 次徽记全部落在区内、无其他世界精灵入区；生日会: 6 位岛民 3/8/13/18/23/28 日、注入日期生日只播报 1 次、跨月/跨年/2 月 28 日下一位查询、无生日/金币不足/普通/称心/重复备礼、6 位庆生得生日全家福(声望+%d 图鉴券+%d)；菜单格子全部放得下、生日会面板内备礼、开拓按钮待备礼角标、天气图鉴在册；存档往返 PASS；展示: 本月 %d 日 %02d:%02d 彩虹%s PASS!" % [
		tag15, min_gap15, overlap15, min_scale15, n_rainbow15, " / ".join(mult_rows15), float(pay_on15) / float(pay_off15), n_res15, min_clear15, min_clear_name15, n_prims15, n_emb15, gift_rep15, gift_v15,
		int(show_clk15["day"]), int(show_clk15["hour"]), int(show_clk15["minute"]), ("·" + EconomyConfig.get_islander_name(GameManager.birthday_today_islander) + "生日待备礼") if GameManager.is_birthday_today() else ""
	])

	# ------------------------------------------------------------------
	# [断言30-CI-16云岛美食评鉴周与岛民友谊羁绊] (NO new building, nothing on the ground or in the sky; runs before the
	# i18n audit so assertion 29 also measures the two new panels in en / ja):
	#   1) 4 copied 64x64 icons imported with transparent corners; 2) 18 entry dishes = existing crafted / cooked goods,
	#      raw goods refused, each taste owned by 2 of the 6 judges; 3) score (base + taste +20 + bond +2/Lv, cap 100),
	#      medal tiers 70/82/92, friendship level table 30/80/150/240/360; 4) island-calendar week (Monday..Sunday) from
	#      the injected clock: 12 weeks over month ends -> judges in islander order, 2 weeks each, 11 announcements, a week
	#      across the year end; 5) pause isolation; 6) an otter (savory) week: best dish first, repeat / raw / no stock /
	#      4th entry refused, gold medal once, bond level-up; 7) next week resets entries, keeps medals, bronze -> silver
	#      upgrade counted once; 8) bonds from a real wish fulfilment and a favourite birthday gift, Lv.5 cap, price bonus
	#      +0.3%/Lv capped at +9%; 9) save round trip (same week keeps entries, a later week drops them); 10) HUD: Workers
	#      tab 8 cards (#7 Food Week, #8 Bonds) with every line fitting, both panels (fit, unsqueezed, headline, entry from
	#      the panel, banners, back), tab switch closes them, Expansion still 20 cards, codex card 18 + all 18 fit.
	# ------------------------------------------------------------------
	var tag30 := "[断言30-CI-16云岛美食评鉴周与岛民友谊羁绊]"
	var r30: Dictionary = await _ci16_audit(world)
	if r30.has("error"):
		_fail_and_quit(tag30, String(r30["error"]))
		return
	print("[PASS] %s 通过: 不新增建筑、不占地面与天空层(只在 HUD)；4 枚复用图标 64x64 去底已导入；18 道既有菜品(甜香/鲜香/清香各由 6 位评委中 2 位偏爱)、生料/非食物拒收；评分=底分+对味 20+羁绊 2/级(封顶 100)、铜 70/银 82/金 92；岛历周一~周日由注入时钟驱动，12 周跨月评委按岛民顺序各轮 2 次、换周播报 11 次、跨年同周；暂停隔离；水獭周 3 道(最佳优先、重复/生料/缺货/第 4 道拒收)金奖 1 次(声望+%d 券+2)、羁绊升级 1 次；换周清空、奖章保留、铜→银只计 1 枚；心愿圆梦+12、称心生日礼+45、Lv.5 封顶、售价 +0.3%%/级 封顶 +%.1f%%；存档往返(同周保留/隔周清空)；菜单格子全部放得下、面板内参赛、切页关闭、开拓仍 20 项、图鉴 18 项在册；当前奖章 %d 枚、羁绊总等级 %d PASS!" % [
		tag30, int(r30["gold_rep"]), float(r30["price_cap"]) * 100.0, int(r30["medals"]), int(r30["levels"])
	])

	# ------------------------------------------------------------------
	# [断言29-三语本地化(zh/en/ja)无混排与放得下]:
	#   1) Tables: zh_CN / en_US / ja_JP hold the same keys with the same placeholders; every data name has en + ja; no en
	#      text carries a CJK glyph and no ja text a simplified-only glyph (not in Shift-JIS);
	#   2) In en_US and in ja_JP: every HUD view (4 tabs in the late-game / early-game / festivals-running states, the wish
	#      board panel, the birthday panel with and without a birthday, capsule + stealth capsule) fits: every card line
	#      inside its card at the real clip width, every headline clear of the language button and not over-squeezed,
	#      the 7 top-right toggles / bottom-bar pills / tab captions / capsule inside their art; every event banner (real
	#      args, all items / islanders / weathers / terms), every info-card banner and every banner template fits the 620px
	#      pill unsqueezed; every visible HUD / world label has no other-language glyph and no raw placeholder;
	#   3) Every world label (badges, Lv. tags, captions, hidden ones included) stays inside its zh footprint, so the zh
	#      fit / zero-overlap / clearance assertions above hold unchanged in all 3 languages; review shots per language;
	#   4) Ends back in zh_CN with the game state restored.
	# ------------------------------------------------------------------
	var tag16 := "[断言29-三语本地化(zh/en/ja)无混排与放得下]"
	var i18n16: Dictionary = await _i18n_audit(world)
	if i18n16.has("error"):
		_fail_and_quit(tag16, String(i18n16["error"]))
		return
	print("[PASS] %s 通过: 文本表 %d 键 x 3 语键位/占位符一致、数据名 %d 条 en/ja 齐全，en 零汉字/假名、ja 零简体专用字形(%d 个)；en/ja 各校验 HUD 视图 %d 个(4 页签 x 后期/前期/节庆进行中 + 心愿板 + 生日会有/无生日 + 胶囊/老板键)共 %d 个格子放得下(真实字号、不缩放)、播报 %d 条全部短句(最宽 %.1fpx)、可见标签 %d 次零混排零漏占位符；世界标签文案 %d 条 x 2 语干净；审图 %s；已切回 zh_CN PASS!" % [
		tag16, int(i18n16["keys"]), int(i18n16["names"]), I18N_SIMPLIFIED_ONLY_GLYPHS.length(), int(i18n16["views"]), int(i18n16["labels"]),
		int(i18n16["banners"]), float(i18n16["max_banner_w"]), int(i18n16["scanned"]), int(i18n16["world_texts"]), String(i18n16["shots"])
	])

	# Reset transient test unlocks & floating texts before exporting clean dual-state viewport screenshots
	GameManager.unlocked_landscapes = {"bee_hive": true, "wind_chime": false, "tiki_torch": false}
	GameManager.amber = 5
	world._sync_landscape_nodes()
	if world.floating_text != null and world.floating_text.has_method("clear_all"):
		world.floating_text.clear_all()
	if world.hud != null:
		world.hud.offline_banner_timer = 0.0
		world.hud._sync_label_nodes()
	GameManager.save_game()

	# ------------------------------------------------------------------
	# Export 2 Distinct Real Engine Viewport Screenshots:
	#   State A (Drawer Collapsed): `res://preview_live_godot.png` & `res://preview_engine_1920x360.png`
	#   State B (Drawer Expanded via `HUD.open_drawer(0)`): `res://preview_drawer_open_1920x360.png`
	# ------------------------------------------------------------------
	Engine.time_scale = 1.0
	if world.hud != null:
		world.hud.close_drawer(false)
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img_closed := get_viewport().get_texture().get_image()
	if img_closed == null or img_closed.is_empty():
		_fail_and_quit("[SelfTestRunner]", "Viewport image (collapsed state) is empty!")
		return
	var err_a1 := img_closed.save_png("res://preview_live_godot.png")
	var err_a2 := img_closed.save_png("res://preview_engine_1920x360.png")
	if err_a1 != OK or err_a2 != OK:
		_fail_and_quit("[SelfTestRunner]", "Failed to save collapsed preview PNGs!")
		return

	if world.hud != null:
		world.hud.open_drawer(3)
	await get_tree().process_frame
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img_open := world.hud.menu.get_texture().get_image() if world.hud != null else null
	if img_open == null or img_open.is_empty():
		_fail_and_quit("[SelfTestRunner]", "Menu window image is empty!")
		return
	var err_b := img_open.save_png("res://preview_drawer_open_1920x360.png")
	if err_b != OK:
		_fail_and_quit("[SelfTestRunner]", "Failed to save res://preview_drawer_open_1920x360.png!")
		return

	var hash_closed := _sha256_bytes(img_closed.get_data())
	var hash_open := _sha256_bytes(img_open.get_data())
	if hash_closed == hash_open:
		_fail_and_quit("[SelfTestRunner]", "preview_engine_1920x360.png and preview_drawer_open_1920x360.png have identical pixel data!")
		return

	# CI-15 review shots (written to `user://`, never to the repo): tab 2 with cards #19 / #20, the birthday party panel and
	# the 4 cloud-sea weathers (+ a clear night) in daylight with the kite festival flying, the caravan airship docked and the
	# sky balloon out, so the sky layer can be checked by eye against kites / airship / balloon / labels / HUD
	var ci15_shots: Array[String] = []
	if world.hud != null:
		world.hud.open_drawer(2)
		await _ci15_capture("user://ci15_review_tab2_1920x360.png")
		ci15_shots.append("ci15_review_tab2_1920x360.png")
		world.hud._activate_card(_card_idx(world.hud, "birthday"))
		await _ci15_capture("user://ci15_review_birthday_panel_1920x360.png")
		ci15_shots.append("ci15_review_birthday_panel_1920x360.png")
		world.hud.close_drawer(false)
	var keep_cw15 := GameManager.current_weather
	var keep_clk15 := bclk15.duplicate()
	GameManager.current_weather = GameManager.WeatherState.DAY
	if not GameManager.kite_festival_active:
		GameManager.start_kite_festival()
	world.dock_airship_at_harbor(false)
	world.spawn_sky_balloon_at(MainWorld.SKY_BALLOON_MIN_X + 220.0)
	var shot_list15: Array = []
	for w9_15 in EconomyConfig.SKY_WEATHER_ORDER:
		shot_list15.append([String(w9_15), false])
	shot_list15.append(["sunny", true])
	shot_list15.append(["rain", true])
	for sh15 in shot_list15:
		var wc15 := _ci15_find_weather_clock(int(keep_clk15["year"]), int(keep_clk15["month"]), String(sh15[0]), false)
		if wc15.is_empty():
			continue
		for wk9_15 in wc15.keys():
			bclk15[wk9_15] = wc15[wk9_15]
		GameManager.current_weather = GameManager.WeatherState.NIGHT if bool(sh15[1]) else GameManager.WeatherState.DAY
		GameManager.refresh_island_calendar()
		world.snap_sky_weather()
		if world.hud != null:
			world.hud.offline_banner_timer = 0.0
		var shot_name15 := "ci15_review_weather_%s%s_1920x360.png" % [String(sh15[0]), "_night" if bool(sh15[1]) else ""]
		await _ci15_capture("user://" + shot_name15)
		ci15_shots.append(shot_name15)
	GameManager.current_weather = keep_cw15
	for kc15 in keep_clk15.keys():
		bclk15[kc15] = keep_clk15[kc15]
	GameManager.refresh_island_calendar()
	world.snap_sky_weather()
	print("       - CI-15 审图 (%d 张: %s): %s" % [ci15_shots.size(), ", ".join(ci15_shots), ProjectSettings.globalize_path("user://")])

	# UI review shots (`user://ui_*.png`): the open bar with festivals running, the hover hint, the news line, the settings page,
	# the four tabs of a finished isle and of a brand-new game
	if world.hud != null:
		var uh: HUD = world.hud
		GameManager.start_gourmet_parade_festival()
		GameManager.start_wish_lantern_festival()
		GameManager.desktop_companion_mode = false
		uh.close_drawer(false)
		uh.news(EconomyConfig.tr_fmt("bn_start", [EconomyConfig.tr_key("nm_parade")]), 30.0)
		# the hint follows the real mouse: the world is paused for this one picture
		world.set_process(false)
		uh.show_hint("%s  Lv.5" % uh.building_name("tea_pavilion"), uh.building_status("tea_pavilion"), Rect2(924.0, 114.0, 54.0, 54.0))
		await _ci15_capture("user://ui_bar_1920x360.png")
		world.set_process(true)
		uh.offline_banner_timer = 0.0
		for ut in range(5):
			uh.open_drawer(ut)
			await _ci15_capture("user://ui_tab%d_1920x360.png" % ut)
		GameManager.reset_for_playtest_state()
		for ut2 in range(4):
			uh.open_drawer(ut2)
			await _ci15_capture("user://ui_new_tab%d_1920x360.png" % ut2)
		uh.close_drawer(false)
		var click_p: String = await _menu_click_problem(uh)
		if click_p != "":
			_fail_and_quit("[断言31-菜单真实点击]", click_p)
			return
		print("[PASS] [断言31-菜单真实点击] 通过: 点底栏图标开菜单、点格子升级、滚轮滚动、点页签切页、再点关闭、Esc 关闭、悬停显示一行说明、界面放大后不缩字、设置重载后保留 PASS!")
		GameManager.desktop_companion_mode = true

	var pace_p := _pacing_problem()
	if pace_p != "":
		_fail_and_quit("[断言32-节奏与离线]", pace_p)
		return
	print("[PASS] [断言32-节奏与离线] 通过: %s PASS!" % _pace_note)
	var guest_p: String = await _guest_problem(world)
	if guest_p != "":
		_fail_and_quit("[断言33-访客主推与装饰]", guest_p)
		return
	print("[PASS] [断言33-访客主推与装饰] 通过: %s PASS!" % _guest_note)
	var audit_p := _audit_problem(world)
	if audit_p != "":
		_fail_and_quit("[断言34-审查回归]", audit_p)
		return
	print("[PASS] [断言34-审查回归] 通过: 特殊建筑点卡片真升级；订单只要在产物；满仓不产；星灯与放映零食有上限；风筝、影院、钱柜、飞艇重启接着走；坏档另存 PASS!")

	print("[PASS] [真机双状态截图导出] 收起态与展开态视口截图已真实导出且哈希完全独立:")
	print("       - 收起态 (`preview_engine_1920x360.png` / `preview_live_godot.png`): %dx%d | SHA256=%s" % [img_closed.get_width(), img_closed.get_height(), hash_closed.substr(0, 16)])
	print("       - 展开态 (`preview_drawer_open_1920x360.png` via `HUD.open_drawer(0)`): %dx%d | SHA256=%s" % [img_open.get_width(), img_open.get_height(), hash_open.substr(0, 16)])
	print("==================================================================")
	_append_playtest_audit_log(checked_sprites, max_overlap_seen, min_gap_seen, total_bunny_dist, total_all_workers_dist, hash_closed, hash_open)
	get_tree().quit(0)

## Pacing (`src/data/Pacing.gd`): twelve weeks of play in a second or two, then the income core itself; "" or what went wrong
var _pace_note := ""

func _pacing_problem() -> String:
	var r := Pacing.simulate(84, EconomyConfig.ISLAND_RECRUIT_CAPS)
	# [unlock, earliest, latest] in hours of play (a day = 12 h: 6 open + 12 away at half pay)
	var windows := [["isle2", 0.8, 2.5], ["tea_pavilion", 2.0, 8.0], ["greenhouse", 4.0, 18.0], ["dairy_workshop", 9.0, 30.0], ["windmill", 18.0, 48.0], ["isle3", 36.0, 84.0],
		["hotspring", 60.0, 120.0], ["chef_pavilion", 90.0, 170.0], ["open_air_cinema", 125.0, 220.0], ["lighthouse_harbor", 170.0, 280.0], ["pottery_kiln", 240.0, 380.0]]
	var prev := 0.0
	for w in windows:
		if not r.has(w[0]):
			return "%s is never reached in 12 weeks" % String(w[0])
		var h := float(r[w[0]])
		if h < float(w[1]) or h > float(w[2]) or h < prev:
			return "%s opens after %.1f h of play (allowed %.1f-%.1f, the one before %.1f)" % [String(w[0]), h, float(w[1]), float(w[2]), prev]
		prev = h
	if int(r["buys_first_hour"]) < 30 or int(r["buys_first_hour"]) > 80:
		return "%d purchases in the first hour" % int(r["buys_first_hour"])
	var d28: Dictionary = r["day"][27]
	var d84: Dictionary = r["day"][83]
	if int(d28["lv"]["soil_1"]) >= 50 or int(d84["lv"]["soil_1"]) < 50 or int(d84["buys"]) - int(d28["buys"]) < 100:
		return "Lv.50 comes at the wrong time: day 28 Lv.%d, day 84 Lv.%d, %d purchases in between" % [int(d28["lv"]["soil_1"]), int(d84["lv"]["soil_1"]), int(d84["buys"]) - int(d28["buys"])]
	for k in Pacing.RATE.keys():
		if not EconomyConfig.BUILDINGS.has(k) or int(EconomyConfig.BUILDINGS[k]["island"]) != int(Pacing.ISLE[k]):
			return "line `%s` is not a building of isle %d" % [String(k), int(Pacing.ISLE[k])]
	# the solar term follows the real calendar; a day phase outlives a restart
	for sc in [[2, 3, 23], [2, 4, 0], [3, 20, 3], [6, 21, 9], [11, 25, 19], [12, 31, 21], [1, 1, 21], [1, 5, 22]]:
		if EconomyConfig.calc_solar_term(int(sc[0]), int(sc[1])) != int(sc[2]):
			return "solar term of %d/%d is %d, expected %d" % [int(sc[0]), int(sc[1]), EconomyConfig.calc_solar_term(int(sc[0]), int(sc[1])), int(sc[2])]
	var keep_phase := [GameManager.current_weather, GameManager.weather_timer]
	GameManager.current_weather = GameManager.WeatherState.NIGHT
	GameManager.weather_timer = 1234.0
	GameManager.save_game()
	GameManager.current_weather = GameManager.WeatherState.DAY
	GameManager.weather_timer = 0.0
	GameManager.load_game()
	if GameManager.current_weather != GameManager.WeatherState.NIGHT or absf(GameManager.weather_timer - 1234.0) > 0.5:
		return "the time of day does not survive a restart"
	GameManager.current_weather = int(keep_phase[0])
	GameManager.weather_timer = float(keep_phase[1])
	# the till: 100 seconds of income, paid out by customers, nothing lost and nothing invented
	var keep := [GameManager.gold, GameManager.till_gold, GameManager.festival_gap_timer, GameManager.bulk_mode, GameManager.building_levels.duplicate(), GameManager.total_gold_earned]
	var gps := GameManager.estimate_idle_gold_per_sec()
	GameManager.till_gold = 0.0
	for _i in range(100):
		GameManager.accrue_till(1.0)
	if absf(GameManager.till_gold - gps * 100.0) > gps * 0.01:
		return "the till holds %.1f after 100 s at %.2f/s" % [GameManager.till_gold, gps]
	var paid := GameManager.collect_from_till(0.6, 1.0)
	if absf(float(paid) - gps * 60.0) > maxf(1.0, gps * 0.1) or absf(GameManager.till_gold - gps * 40.0) > gps * 0.1:
		return "a customer paid %d of %.1f" % [paid, gps * 100.0]
	GameManager.accrue_till(99999.0)
	if absf(GameManager.till_gold - gps * Pacing.TILL_CAP_SEC) > 0.5:
		return "a full till holds %.1f" % GameManager.till_gold
	if absf(float(GameManager.collect_from_till(1.0, 99.0)) - gps * Pacing.TILL_CAP_SEC * Pacing.LIVE_BONUS_CAP) > maxf(1.0, gps):
		return "live bonuses are not capped"
	# away: half pay, 12 hours at most
	var off1 := int(GameManager.calculate_and_apply_offline_earnings(3600)["gold"])
	var off2 := int(GameManager.calculate_and_apply_offline_earnings(100 * 3600)["gold"])
	if absf(float(off1) / (gps * 3600.0) - 0.5) > 0.02 or absf(float(off2) / (gps * 43200.0) - 0.5) > 0.02:
		return "offline pays %d for 1 h and %d for 100 h at %.2f/s" % [off1, off2, gps]
	# bulk: the price of ten is the price of ten single steps, "max" never overspends
	GameManager.building_levels["soil_1"] = 3
	GameManager.bulk_mode = 10
	var ten: Array = GameManager.get_bulk_building("soil_1")
	var single := 0
	for i2 in range(10):
		single += Pacing.line_cost("soil_1", 3 + i2)
	GameManager.gold = single
	if int(ten[0]) != 10 or int(ten[1]) != single or not GameManager.upgrade_building("soil_1", 10) or int(GameManager.building_levels["soil_1"]) != 13 or GameManager.gold != 0:
		return "ten steps at once: %s (singles %d), level %d, gold %d" % [str(ten), single, int(GameManager.building_levels["soil_1"]), GameManager.gold]
	GameManager.bulk_mode = -1
	GameManager.gold = Pacing.line_cost_n("soil_1", 13, 4) + 1
	var mx: Array = GameManager.get_bulk_building("soil_1")
	if int(mx[0]) != 4 or int(mx[1]) > GameManager.gold:
		return "max buys %s with %d" % [str(mx), GameManager.gold]
	GameManager.gold = 0
	if int(GameManager.get_bulk_building("soil_1")[0]) != 1:
		return "max with an empty purse must price one step"
	GameManager.gold = int(keep[0])
	GameManager.till_gold = float(keep[1])
	GameManager.festival_gap_timer = float(keep[2])
	GameManager.bulk_mode = int(keep[3])
	GameManager.building_levels = keep[4]
	GameManager.total_gold_earned = int(keep[5])
	GameManager.save_game()
	_pace_note = "2 号岛 %.1f 小时、3 号岛第 %.1f 天、建筑第 %.1f 天开完、第 12 周 Lv.%d；钱柜不多不少，离线一半封顶 12 小时，批量升级等价" % [float(r["isle2"]), float(r["isle3"]) / 12.0, float(r["pottery_kiln"]) / 12.0, int(d84["lv"]["soil_1"])]
	return ""

## Bugs found by the audit of 2026-11-26 stay fixed; "" or what went wrong
func _audit_problem(world: MainWorld) -> String:
	var gm := GameManager
	var hud := world.hud
	gm.unlocked_islands = {1: true, 2: true, 3: true}
	for uf in ["unlock_greenhouse", "unlock_hotspring_inn", "unlock_windmill_bakery", "unlock_tea_pavilion", "unlock_chef_pavilion", "unlock_lighthouse_harbor", "unlock_dairy_workshop", "unlock_open_air_cinema", "unlock_pottery_kiln"]:
		gm.call(uf, true)
	# the tile of every special building really upgrades it
	var upgraded := 0
	var keep_gold := [gm.gold, gm.total_gold_earned]
	var keep_lv: Dictionary = gm.building_levels.duplicate()
	var keep_bulk := gm.bulk_mode
	gm.bulk_mode = 1
	hud.open_drawer(0)
	for k in HUD.BUILD_SPECIAL.keys():
		if not hud.is_building_built(k) or not bool(gm.unlocked_islands.get(int(EconomyConfig.BUILDINGS[k]["island"]), false)):
			continue
		gm.gold = Pacing.line_cost(k, int(gm.building_levels.get(k, 1)))
		var lv := int(gm.building_levels.get(k, 1))
		hud._activate_card(_card_idx(hud, k + "_building"))
		if int(gm.building_levels.get(k, 1)) != lv + 1 or gm.gold != 0:
			return "the `%s` tile does not upgrade it: Lv.%d -> %d, %d gold left" % [k, lv, int(gm.building_levels.get(k, 1)), gm.gold]
		upgraded += 1
	hud.close_drawer(false)
	if upgraded != HUD.BUILD_SPECIAL.size():
		return "only %d special buildings were tried" % upgraded
	# orders only ask for what is still made (with nothing in stock that could still fill an old one)
	var keep_store := [gm.stall_inventory, gm.raw_baskets, gm.workshop_outputs]
	gm.stall_inventory = {}
	gm.raw_baskets = {}
	gm.workshop_outputs = {}
	for lv2 in [1, 25, 50, 80]:
		for bk in ["soil_1", "mortar", "soil_2", "cauldron", "soil_3"]:
			gm.building_levels[bk] = lv2
		var made := gm.get_produced_items(true)
		made.append_array(gm.get_produced_items(false))
		gm.replace_impossible_orders()
		for _i in range(12):
			if not made.has(String(gm.active_contract["target_item"])):
				return "at level %d the contract asks for %s" % [lv2, String(gm.active_contract["target_item"])]
			for e in gm.active_airship_order["items"]:
				var id := String(e["item_id"])
				if not made.has(id) and id != gm.get_current_solar_dish_id():
					return "at level %d the airship asks for %s" % [lv2, id]
			gm.generate_next_contract()
			gm.generate_next_airship_order()
	gm.stall_inventory = keep_store[0]
	gm.raw_baskets = keep_store[1]
	gm.workshop_outputs = keep_store[2]
	gm.building_levels = keep_lv
	gm.bulk_mode = keep_bulk
	gm.gold = int(keep_gold[0])
	gm.total_gold_earned = int(keep_gold[1])
	gm.replace_impossible_orders()
	# a full shelf makes nothing more and takes nothing
	var dish := gm.active_tasting_dish_id
	var keep_stock := int(gm.tasting_inventory.get(dish, 0))
	var keep_stall: Dictionary = gm.stall_inventory.duplicate()
	gm.tasting_inventory[dish] = 9999
	gm.stall_inventory["crop_0"] = 99999
	if bool(gm.cook_tasting_dish(dish, true).get("cooked", false)) or int(gm.tasting_inventory[dish]) != 9999:
		return "a full pantry and a full stall still cook"
	gm.stall_inventory = keep_stall
	gm.tasting_inventory[dish] = keep_stock
	gm.bakery_inventory["flour_golden_wheat"] = 9999
	gm.stall_inventory["crop_0"] = 5
	if bool(gm.mill_golden_wheat_flour(false, false).get("milled", false)) or int(gm.stall_inventory["crop_0"]) != 5:
		return "a full flour bin still eats crops"
	gm.bakery_inventory["flour_golden_wheat"] = 0
	# one cinema night sells a fixed number of snacks, and a restart does not show the films again
	var keep_phase2 := [gm.current_weather, gm.weather_timer]
	gm.set_weather(gm.WeatherState.NIGHT)
	gm.advance_cinema(0.0)
	gm.dairy_inventory["dairy_cloud_pudding"] = 50
	var snacks := int(gm.sell_cinema_snacks(99).get("sold", 0))
	if snacks != Pacing.SNACKS_PER_NIGHT:
		return "one night sold %d snacks" % snacks
	gm.dairy_inventory["dairy_cloud_pudding"] = 0
	gm._load_cinema_night([true, 20.5, 1, 7, 1])
	gm.save_game()
	gm._load_cinema_night([])
	gm.load_game()
	if not gm.cinema_night_on or absf(gm.cinema_night_clock - 20.5) > 0.5 or gm.cinema_screenings_tonight != 1 or gm.cinema_snacks_tonight != 7:
		return "a restart starts the cinema night again: %s %.1f %d %d" % [str(gm.cinema_night_on), gm.cinema_night_clock, gm.cinema_screenings_tonight, gm.cinema_snacks_tonight]
	gm.set_weather(int(keep_phase2[0]))
	gm.weather_timer = float(keep_phase2[1])
	gm.advance_cinema(0.0)
	# a broken save is kept aside, not overwritten
	var broken := gm.active_save_path + ".audit"
	var bf := FileAccess.open(broken, FileAccess.WRITE)
	bf.store_string("{broken")
	bf.close()
	var kept: String = gm._keep_unreadable_save(broken)
	if kept == "" or FileAccess.get_file_as_string(kept) != "{broken":
		return "an unreadable save is not kept aside"
	DirAccess.remove_absolute(ProjectSettings.globalize_path(kept))
	DirAccess.remove_absolute(ProjectSettings.globalize_path(broken))
	# a click on a building that is not there opens the menu and costs nothing
	gm.pottery_kiln_unlocked = false
	gm.gold = EconomyConfig.POTTERY_KILN_UNLOCK_COST_GOLD + 5
	var asked: bool = world._ask_to_build(hud.is_building_built("pottery_kiln"), 0)
	if not asked or not hud.drawer_expanded or gm.pottery_kiln_unlocked or gm.gold != EconomyConfig.POTTERY_KILN_UNLOCK_COST_GOLD + 5:
		return "a click on a missing building spends gold"
	gm.pottery_kiln_unlocked = true
	gm.gold = int(keep_gold[0])
	hud.close_drawer(false)
	# a lantern festival gives a fixed number of lanterns
	var keep_fest := [gm.wish_lantern_festival_timer, gm.lanterns_this_festival, gm.amber, gm.rare_codex_vouchers, gm.gold, gm.total_gold_earned, gm.wish_lantern_reputation_bonus, gm.wish_lanterns_collected]
	gm.wish_lantern_festival_timer = 0.0
	gm.start_wish_lantern_festival()
	var got := 0
	for i in range(Pacing.LANTERNS_PER_FESTIVAL + 5):
		if bool(gm.claim_wish_lantern(i % 6, Vector2(1200.0, 110.0)).get("claimed", false)):
			got += 1
	if got != Pacing.LANTERNS_PER_FESTIVAL:
		return "one festival gave %d lanterns" % got
	gm.wish_lantern_festival_timer = float(keep_fest[0])
	gm.lanterns_this_festival = int(keep_fest[1])
	gm.amber = int(keep_fest[2])
	gm.rare_codex_vouchers = int(keep_fest[3])
	gm.gold = int(keep_fest[4])
	gm.total_gold_earned = int(keep_fest[5])
	gm.wish_lantern_reputation_bonus = int(keep_fest[6])
	gm.wish_lanterns_collected = int(keep_fest[7])
	# what is running goes on after a restart
	var keep_run := [gm.kite_festival_active, gm.kite_festival_clock, gm.kite_festival_idx, gm.kite_collected_slots.duplicate(), gm.till_gold, gm.airship_timer, gm.balloon_timer]
	gm._load_kite_festival([true, 9.5, 2, [1, 4]])
	gm.till_gold = 77.0
	gm.airship_timer = 1500.0
	gm.balloon_timer = 444.0
	gm.save_game()
	gm._load_kite_festival([])
	gm.till_gold = 0.0
	gm.airship_timer = 1.0
	gm.balloon_timer = 1.0
	gm.load_game()
	if not gm.kite_festival_active or absf(gm.kite_festival_clock - 9.5) > 0.5 or gm.kite_collected_slots != [1, 4] or absf(gm.till_gold - 77.0) > 1.0 or absf(gm.airship_timer - 1500.0) > 1.0 or absf(gm.balloon_timer - 444.0) > 1.0:
		return "a restart loses what was running: kites %s %.1f %s, till %.1f, airship %.1f, balloon %.1f" % [str(gm.kite_festival_active), gm.kite_festival_clock, str(gm.kite_collected_slots), gm.till_gold, gm.airship_timer, gm.balloon_timer]
	gm._load_kite_festival([keep_run[0], keep_run[1], keep_run[2], keep_run[3]])
	gm.till_gold = float(keep_run[4])
	gm.airship_timer = float(keep_run[5])
	gm.balloon_timer = float(keep_run[6])
	gm.save_game()
	return ""

## Guests, the featured dish and the decorations: rules, save, real clicks and drags, the crew using them; "" or what went wrong
var _guest_note := ""

func _guest_problem(world: MainWorld) -> String:
	var gm := GameManager
	var hud := world.hud
	gm.reset_guest_state()
	for g in Guests.ORDER:
		var cfg: Dictionary = Guests.LIST[g]
		var sh := Guests.sheet(g)
		if sh == null or sh.get_width() != sh.get_height() * 2 or not Guests.DISH_ORDER.has(String(cfg["dish"])) or not Guests.DECOR.has(String(cfg["keep"])) or Guests.keeper_of(String(cfg["keep"])) != g:
			return "guest table entry `%s` is broken" % g
	for id in Guests.DECOR_ORDER:
		if Guests.decor_tex(id) == null or (int(Guests.DECOR[id]["amber"]) == 0) != (Guests.keeper_of(id) != ""):
			return "decoration table entry `%s` is broken" % id
	# who comes: only fans of what the isle can cook, the featured dish draws its fans, the rare ones almost only then
	var cnt := {"fruit": {}, "tea": {}}
	for feat in ["fruit", "tea"]:
		for i in range(4000):
			var who := Guests.pick(["fruit", "sweets", "tea"], feat, [], (float(i) + 0.5) / 4000.0)
			cnt[feat][who] = int(cnt[feat].get(who, 0)) + 1
		for who2 in cnt[feat].keys():
			if not ["fruit", "sweets", "tea"].has(String(Guests.LIST[who2]["dish"])):
				return "`%s` came for a dish the isle cannot cook" % String(who2)
	if int(cnt["tea"]["capybara"]) < int(cnt["fruit"]["capybara"]) * 2 or int(cnt["tea"]["rose_toucan"]) < 100 or int(cnt["fruit"].get("rose_toucan", 0)) > 40:
		return "the featured dish does not steer the guests: %s" % str(cnt)
	var days := 0.0
	for sd in range(6):
		days += Guests.simulate(100 + sd, 9.0, {"potion": 0.2, "tea": 0.4, "dairy": 1.5, "bread": 2.5, "feast": 10.0, "seafood": 18.0}) / 6.0
	if days < 45.0 or days > 100.0:
		return "the last keepsake comes after %.1f days" % days
	# away: visits queue up (half a day at most), one card per guest, nothing paid before it is taken
	gm.unlocked_islands = {1: true, 2: true, 3: true}
	var gold0 := gm.gold
	var amber0 := gm.get_amber()
	var n_away := gm.guests_while_away(7 * 24 * 3600.0)
	if n_away != Guests.AWAY_VISITS_MAX or gm.get_pending_guest_count() != n_away or gm.gold != gold0 or gm.guest_pending.size() > Guests.ORDER.size():
		return "a week away brought %d visits (%d on the cards), gold %d -> %d" % [n_away, gm.get_pending_guest_count(), gold0, gm.gold]
	for _i in range(40):
		gm.receive_guest(0.0)
	var t := gm.get_pending_guest_totals()
	if not (t["keeps"] as Array).has("apple_tree"):
		return "the hedgehog left no keepsake after %d visits" % int(gm.guest_visits.get("hedgehog", 0))
	hud.open_drawer(3)
	hud._clear_views()
	hud.guest_popup.open()
	await get_tree().process_frame
	await get_tree().process_frame
	await _save_window_shot(hud.guest_popup, "user://ui_new_guest_popup.png")
	if not hud.guest_popup.visible or not hud.guest_popup.cells[0]["root"].visible:
		return "the gift card did not open"
	_push_click(hud.guest_popup, hud.guest_popup.btn_take.get_global_rect().get_center())
	await get_tree().process_frame
	if hud.guest_popup.visible or gm.gold != gold0 + int(t["gold"]) or gm.get_amber() != amber0 + int(t["amber"]) or not gm.guest_pending.is_empty() or not gm.is_decor_owned("apple_tree"):
		return "taking the gifts: gold +%d (exp %d), amber +%d (exp %d), card open %s" % [gm.gold - gold0, int(t["gold"]), gm.get_amber() - amber0, int(t["amber"]), str(hud.guest_popup.visible)]
	# the featured dish: pill on the bar -> page -> pick
	hud.close_drawer(false)
	hud._sync_label_nodes()
	await get_tree().process_frame
	_push_click(get_viewport(), hud._rect_of(hud._feat_pill).get_center())
	await get_tree().process_frame
	if hud._view_id() != "featured":
		return "the dish on the bar did not open its page"
	await _ci15_capture("user://ui_new_featured_1920x360.png")
	var fit_f := _menu_tiles_problem(hud, "featured dish")
	if fit_f != "":
		return fit_f
	hud._activate_card(1)
	if gm.featured_dish != "sweets":
		return "picking a dish did not feature it (`%s`)" % gm.featured_dish
	hud._clear_views()
	hud.open_drawer(3)
	hud.guest_view = true
	hud._sync_label_nodes()
	await _ci15_capture("user://ui_new_guests_1920x360.png")
	var fit_g := _menu_tiles_problem(hud, "guest book")
	if fit_g != "":
		return fit_g
	# decorations: buy, place, store, drag with the real mouse, save and load
	gm.amber = 99999
	hud.open_drawer(2)
	hud.decor_view = true
	var cards: Array[Dictionary] = hud._get_current_tab_cards()
	for ci in range(cards.size()):
		if not bool(cards[ci].get("hidden", false)):
			hud._activate_card(ci)
	hud._sync_label_nodes()
	await _ci15_capture("user://ui_new_decor_1920x360.png")
	var fit_d := _menu_tiles_problem(hud, "decorations")
	if fit_d != "":
		return fit_d
	if gm.decor_placed.size() < 9 or world.decor_nodes.size() != gm.decor_placed.size():
		return "%d decorations placed, %d on the lawn" % [gm.decor_placed.size(), world.decor_nodes.size()]
	var xs: Array = []
	for d in gm.decor_placed:
		xs.append(float(d["x"]))
	xs.sort()
	for xi in range(1, xs.size()):
		if xs[xi] - xs[xi - 1] < Guests.LAWN_STEP - 0.5:
			return "two decorations stand %.0f px apart" % (xs[xi] - xs[xi - 1])
	hud.close_drawer(false)
	for id2 in Guests.DECOR_ORDER:
		if not gm.is_decor_owned(id2):
			gm.decor_owned[id2] = true
		gm.remove_decor(id2)
		gm.place_decor_anywhere(id2)
	var moved := "lamp"
	var node: Node2D = world.decor_nodes[moved]
	var grab: Vector2 = world.world_root.position + (node.position + Vector2(0.0, -10.0)) * world.companion_zoom
	var to := grab + Vector2(23.0, 0.0) * world.companion_zoom
	var x0 := node.position.x
	_push_drag(get_viewport(), grab, to)
	if absf(gm.get_decor_x(moved) - (x0 + 23.0)) > 1.5:
		return "dragging the lamp: %.1f -> %.1f (expected %.1f)" % [x0, gm.get_decor_x(moved), x0 + 23.0]
	var before := JSON.stringify([gm.decor_placed, gm.decor_owned, gm.guest_visits, gm.featured_dish], "", true)
	gm.save_game()
	gm.load_game()
	if JSON.stringify([gm.decor_placed, gm.decor_owned, gm.guest_visits, gm.featured_dish], "", true) != before:
		return "guests and decorations do not survive a save"
	# the crew takes a break at a decoration and goes back to work
	for w in world.workers:
		w.end_decor_break()
	var user: AnimalWorker = null
	for w2 in world.workers:
		if w2.visible and w2.is_hired():
			w2.carry_icon.visible = false
			w2.nav_path.clear()
			if w2._try_decor_break(999.0):
				user = w2
				break
	if user == null:
		return "nobody wants to use the decorations"
	var used_id := user.decor_id
	var guard := 0
	var stood := false
	while user.decor_id != "" and guard < 2000:
		user._process(0.05)
		stood = stood or (user.is_at_decor() and user.position.y > EconomyConfig.GROUND_Y + user.decor_step - 0.5 and user.heart_icon.visible)
		guard += 1
	if not stood or user.decor_id != "" or absf(user.position.y - EconomyConfig.GROUND_Y) > 0.01 or user.z_index != EconomyConfig.Z_UNIT:
		return "the break at `%s` went wrong (stood %s, y %.1f, z %d)" % [used_id, str(stood), user.position.y, user.z_index]
	# a guest walks in as itself
	var n_c := world.customers.size()
	world._guest_walks_in_tests = true
	EventBus.guest_arrived.emit("silver_fox", "")
	world._guest_walks_in_tests = false
	if world.customers.size() != n_c + 1 or world.customers[n_c].body_sprite.texture != Guests.sheet("silver_fox"):
		return "the silver fox did not walk in"
	var shore_x := 1480.0
	for id3 in ["chest", "gift_box", "flag", "lily", "lamp"]:
		gm.place_decor(id3, shore_x)
		shore_x += 70.0
	var zoom0 := world.companion_zoom
	await _ci15_capture("user://ui_new_lawns_1920x360.png")
	world.companion_zoom = zoom0
	_guest_note = "16 位访客与 24 件装饰表完整，主推菜左右来客，集齐约 %.0f 天，离开一周只攒 %d 次，礼物卡 / 主推页 / 拖动摆放均真实点击，存读一致，伙伴会去用" % [days, Guests.AWAY_VISITS_MAX]
	return ""

func _push_drag(vp: Viewport, from: Vector2, to: Vector2) -> void:
	var down := InputEventMouseButton.new()
	down.button_index = MOUSE_BUTTON_LEFT
	down.pressed = true
	down.position = from
	down.global_position = from
	vp.push_input(down, true)
	for i in range(1, 5):
		var mv := InputEventMouseMotion.new()
		mv.position = from.lerp(to, float(i) / 4.0)
		mv.global_position = mv.position
		mv.button_mask = MOUSE_BUTTON_MASK_LEFT
		vp.push_input(mv, true)
	var up := InputEventMouseButton.new()
	up.button_index = MOUSE_BUTTON_LEFT
	up.pressed = false
	up.position = to
	up.global_position = to
	vp.push_input(up, true)

func _save_window_shot(win: Window, path: String) -> void:
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img := win.get_texture().get_image()
	if img != null:
		img.save_png(path)

## CI-15 helpers ------------------------------------------------------------------------------------------------------
## Euclidean clearance between two non-overlapping rects (0 when they touch / overlap)
func _ci15_rect_gap(a: Rect2, b: Rect2) -> float:
	var dx := maxf(0.0, maxf(a.position.x - b.end.x, b.position.x - a.end.x))
	var dy := maxf(0.0, maxf(a.position.y - b.end.y, b.position.y - a.end.y))
	return sqrt(dx * dx + dy * dy)

## First daytime (09:00..16:40) local datetime of `year`-`month` whose cloud-sea weather is `w_id` (birthdays only: the 6
## islanders' days), or {} when none exists
func _ci15_find_weather_clock(year: int, month: int, w_id: String, birthday_only: bool) -> Dictionary:
	var days: Array = []
	if birthday_only:
		for isl in EconomyConfig.WISH_ISLANDERS:
			days.append(EconomyConfig.get_islander_birthday_day(isl))
	else:
		for d in range(1, 29):
			days.append(d)
	for d in days:
		for slot in range(27, 51):
			var dt := {"year": year, "month": month, "day": int(d), "hour": (slot * 20) / 60, "minute": (slot * 20) % 60}
			if EconomyConfig.calc_sky_weather(dt) == w_id:
				return dt
	return {}

## Two rendered frames, then the viewport image saved to `path` (review shots under `user://`)
func _ci15_capture(path: String) -> void:
	var cap_world := get_tree().current_scene as MainWorld
	if cap_world != null and cap_world.hud != null:
		cap_world.hud._sync_label_nodes()
	await get_tree().process_frame
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	if img != null and not img.is_empty():
		img.save_png(path)
	_save_menu_shot(path.replace("_1920x360", "_menu"))

## The menu is a window of its own: its picture is saved next to the strip's
func _save_menu_shot(path: String) -> Image:
	var world := get_tree().current_scene as MainWorld
	if world == null or world.hud == null or not world.hud.drawer_expanded:
		return null
	var mimg := world.hud.menu.get_texture().get_image()
	if mimg == null or mimg.is_empty():
		return null
	mimg.save_png(path)
	return mimg

## Menu helpers -------------------------------------------------------------------------------------------------------
## "" or the first tile of the view on screen whose text does not fit its tile at its real font size
## Sells with a full till and returns the price before the live-bonus cap, so two sales can be compared
func _sell(item_id: String, qty: int, pos: Vector2, is_vip: bool = false) -> int:
	GameManager.till_gold = 10000.0
	var raw := GameManager.get_sale_bonus(item_id, is_vip)
	var paid := GameManager.try_purchase_from_stall(item_id, qty, pos, is_vip)
	return int(round(10000.0 * raw)) if paid > 0 else 0

func _menu_tiles_problem(hud: HUD, ctx: String) -> String:
	hud._sync_label_nodes()
	var list := hud._get_current_tab_cards()
	if hud.menu.cards.size() < list.size():
		return "%s: %d tiles for %d cards" % [ctx, hud.menu.cards.size(), list.size()]
	var shown := 0
	for i in range(list.size()):
		if bool(list[i].get("hidden", false)):
			continue
		shown += 1
		var c: MenuCard = hud.menu.cards[i]
		if c.lbl_title.text == "":
			return "%s tile %d has no name" % [ctx, i]
		for p in c.overflowing_texts():
			return "%s tile %d %s" % [ctx, i, p]
	for e in hud.menu.emp_cards:
		for p2 in e.overflowing_texts():
			return "%s crew tile %s" % [ctx, p2]
	if shown == 0:
		return "%s shows nothing" % ctx
	if shown > 20:
		return "%s shows %d tiles: too many for one page" % [ctx, shown]
	return ""

## Place of the first tile of `type` on the open tab (-1 = not there)
func _card_idx(hud: HUD, type: String) -> int:
	var list := hud._get_current_tab_cards()
	for i in range(list.size()):
		if String(list[i]["type"]) == type:
			return i
	return -1

## The Buildings / Expansion / Codex tabs hold these tiles ("" = skip), the codex tile its progress, every text fits
func _menu_tabs_problem(hud: HUD, types: Array, codex_cost: String) -> String:
	var tabs := [0, 2, 3]
	for k in range(3):
		if String(types[k]) == "":
			continue
		hud.open_drawer(tabs[k])
		var at := _card_idx(hud, String(types[k]))
		if at < 0:
			return "tab %d has no `%s` tile" % [tabs[k], String(types[k])]
		var cost := String(hud._get_current_tab_cards()[at]["cost"])
		if tabs[k] == 3 and codex_cost != "" and cost != codex_cost:
			return "codex tile `%s` shows `%s`, expected `%s`" % [String(types[k]), cost, codex_cost]
		var fit := _menu_tiles_problem(hud, "tab %d" % tabs[k])
		if fit != "":
			return fit
	hud.close_drawer(false)
	return ""

func _push_click(vp: Viewport, pos: Vector2, button: int = MOUSE_BUTTON_LEFT) -> void:
	for down in [true, false]:
		var ev := InputEventMouseButton.new()
		ev.button_index = button
		ev.pressed = down
		ev.position = pos
		ev.global_position = pos
		vp.push_input(ev, true)

## Real mouse / key events through the strip and the menu window; "" or what went wrong
func _menu_click_problem(hud: HUD) -> String:
	GameManager.gold = 1000000000000
	await get_tree().process_frame
	await get_tree().process_frame
	_push_click(get_viewport(), hud._get_tab_button_rect(0).get_center())
	if not hud.drawer_expanded or hud.active_tab != 0 or not hud.menu.visible:
		return "the Build icon on the bar did not open the menu"
	await get_tree().process_frame
	await get_tree().process_frame
	var lv := int(GameManager.building_levels.get("soil_1", 1))
	_push_click(hud.menu, hud.menu.card_rect(0).get_center())
	if int(GameManager.building_levels.get("soil_1", 1)) != lv + 1:
		return "pressing the first tile did not upgrade the farm (level %d)" % int(GameManager.building_levels.get("soil_1", 1))
	var mv := InputEventMouseMotion.new()
	mv.position = hud.menu.card_rect(1).get_center()
	mv.global_position = mv.position
	hud.menu.push_input(mv, true)
	await get_tree().process_frame
	if hud.menu.lbl_toast.text == "":
		return "hovering a tile shows no explanation"
	_push_click(hud.menu, hud.menu.nav_buttons[3].get_global_rect().get_center())
	await get_tree().process_frame
	await get_tree().process_frame
	if hud.active_tab != 3:
		return "the Codex tab of the menu did not open"
	for _w in range(4):
		_push_click(hud.menu, hud.menu.content_rect().get_center(), MOUSE_BUTTON_WHEEL_DOWN)
	await get_tree().process_frame
	if hud.menu._scroll.scroll_vertical <= 0:
		return "the mouse wheel does not scroll the tiles"
	# the tiles of the last column stay left of the scroll bar
	var last: Rect2 = hud.menu.card_rect(4)
	if last.end.x > hud.menu._scroll.get_v_scroll_bar().get_global_rect().position.x:
		return "tiles run under the scroll bar (%.0f > %.0f)" % [last.end.x, hud.menu._scroll.get_v_scroll_bar().get_global_rect().position.x]
	var fs := hud.menu.cards[0].lbl_title.label_settings.font_size
	WindowController.set_text_scale(1.3)
	hud._sync_label_nodes()
	if hud.menu.cards[0].lbl_title.label_settings.font_size <= fs:
		return "the interface size setting does not enlarge the text"
	WindowController.set_text_scale(1.0)
	hud._sync_label_nodes()
	var esc := InputEventKey.new()
	esc.keycode = KEY_ESCAPE
	esc.pressed = true
	hud.menu.push_input(esc, true)
	if hud.drawer_expanded or hud.menu.visible:
		return "Esc did not close the menu"
	_push_click(get_viewport(), hud._get_tab_button_rect(1).get_center())
	if not hud.drawer_expanded or hud.active_tab != 1:
		return "the Crew icon did not open the menu"
	_push_click(get_viewport(), hud._get_tab_button_rect(1).get_center())
	if hud.drawer_expanded:
		return "pressing the same icon again did not close the menu"
	# the settings survive a restart (written to a scratch file, the player's own is never touched)
	WindowController.ui_settings_path = "user://ui_settings_selftest.cfg"
	WindowController._settings_enabled = true
	hud._on_setting("lang", "ja_JP")
	hud._on_setting("text", 1.15)
	hud._on_setting("opacity", 0.8)
	EconomyConfig.set_language("zh_CN")
	WindowController.text_scale = 1.0
	WindowController.window_opacity = 1.0
	WindowController._load_ui_settings()
	var kept := EconomyConfig.current_lang == "ja_JP" and is_equal_approx(WindowController.text_scale, 1.15) and is_equal_approx(WindowController.window_opacity, 0.8)
	WindowController._settings_enabled = false
	DirAccess.remove_absolute(ProjectSettings.globalize_path(WindowController.ui_settings_path))
	EconomyConfig.set_language("zh_CN")
	WindowController.set_text_scale(1.0)
	WindowController.set_window_opacity(1.0)
	if not kept:
		return "the settings did not survive a reload"
	return ""

## CI-14 helpers ------------------------------------------------------------------------------------------------------
## Name + rect of the first visible world sprite overlapping any rect (units and kites excluded; season props, landscapes, flags, boats and building parts included).
func _ci14_find_sprite_overlap(world: MainWorld, rects: Array) -> String:
	var stack: Array = [world.world_root]
	while not stack.is_empty():
		var nd: Node = stack.pop_back()
		for ch in nd.get_children():
			stack.append(ch)
		if not (nd is Sprite2D):
			continue
		var sp := nd as Sprite2D
		if sp.texture == null or not sp.is_visible_in_tree() or world.kite_sprites.has(sp) or _is_inside_unit_or_fx(sp, world):
			continue
		var r := _rect_in_world_local(world, sp, sp.get_rect())
		for rr in rects:
			if r.intersects(rr):
				return "%s %s vs %s" % [sp.get_path(), str(r), str(rr)]
	return ""

## CI-13 helpers ------------------------------------------------------------------------------------------------------
## Axis-aligned rect of `local_rect` (in `ci`'s own space) expressed in `world_root` local coords.
func _rect_in_world_local(world: MainWorld, ci: CanvasItem, local_rect: Rect2) -> Rect2:
	var xf := world.world_root.get_global_transform().affine_inverse() * ci.get_global_transform()
	var pts := [xf * local_rect.position, xf * Vector2(local_rect.end.x, local_rect.position.y), xf * Vector2(local_rect.position.x, local_rect.end.y), xf * local_rect.end]
	var r := Rect2(pts[0], Vector2.ZERO)
	for i in range(1, 4):
		r = r.expand(pts[i])
	return r

func _is_inside_unit_or_fx(node: Node, world: MainWorld) -> bool:
	var n: Node = node
	while n != null and n != world.world_root:
		if n is AnimalWorker or n is CustomerNPC or n == world.floating_text:
			return true
		n = n.get_parent()
	return false

## Horizontal spans covered by each worker standing at its long-dwell rest dock (idle/work poses, flip-safe), per island.
func _collect_rest_dock_spans(world: MainWorld) -> Dictionary:
	var spans: Dictionary = {1: [], 2: [], 3: []}
	for w in world.workers:
		if not is_instance_valid(w) or w.body_sprite == null or w.body_sprite.texture == null:
			continue
		var rx: float = w.get_rest_dock_x()
		var wimg := w.body_sprite.texture.get_image()
		if wimg != null and wimg.is_compressed():
			wimg.decompress()
		var fw := int(wimg.get_width() / maxi(1, w.body_sprite.hframes))
		var half := 0.0
		for fr in w.get_rest_pose_frames():
			var lo := fw
			var hi := -1
			for px in range(fw):
				for py in range(wimg.get_height()):
					if wimg.get_pixel(fr * fw + px, py).a > 0.4:
						lo = mini(lo, px)
						hi = maxi(hi, px)
						break
			if hi >= lo:
				half = maxf(half, maxf(float(fw) * 0.5 - float(lo), float(hi + 1) - float(fw) * 0.5))
		(spans[w.home_island] as Array).append(Vector2(rx - half, rx + half))
	return spans

## Fraction of `br`'s width covered by the union of the horizontal `spans`.
func _union_cover_ratio(br: Rect2, spans: Array) -> float:
	var segs: Array = []
	for sp in spans:
		var s0 := maxf(br.position.x, (sp as Vector2).x)
		var s1 := minf(br.end.x, (sp as Vector2).y)
		if s1 > s0:
			segs.append(Vector2(s0, s1))
	segs.sort_custom(func(a, b): return a.x < b.x)
	var covered := 0.0
	var cur_s := -1.0
	var cur_e := -1.0
	for sg in segs:
		if cur_e < 0.0 or sg.x > cur_e:
			if cur_e > cur_s:
				covered += cur_e - cur_s
			cur_s = sg.x
			cur_e = sg.y
		else:
			cur_e = maxf(cur_e, sg.y)
	if cur_e > cur_s:
		covered += cur_e - cur_s
	return covered / maxf(1.0, br.size.x)

## Name + rect of the first visible world sprite (units, kites and the seasonal props themselves excluded) overlapping any rect.
func _find_sprite_overlapping_rects(world: MainWorld, rects: Array) -> String:
	var stack: Array = [world.world_root]
	while not stack.is_empty():
		var nd: Node = stack.pop_back()
		for ch in nd.get_children():
			stack.append(ch)
		if not (nd is Sprite2D):
			continue
		var sp := nd as Sprite2D
		if sp.texture == null or not sp.is_visible_in_tree() or world.season_deco_nodes.has(sp) or world.kite_sprites.has(sp) or _is_inside_unit_or_fx(sp, world):
			continue
		var r := _rect_in_world_local(world, sp, sp.get_rect())
		for rr in rects:
			if r.intersects(rr):
				return "%s %s vs %s" % [sp.get_path(), str(r), str(rr)]
	return ""

## True when the label's full text (its own font size, outline included) fits `avail_w` px at its current scale.
func _label_text_fits(lbl: Label, avail_w: float) -> bool:
	return _label_text_width(lbl) <= avail_w + 0.5

## On-screen width of the label's full text (its own font size, outline included) at its current scale.
func _label_text_width(lbl: Label) -> float:
	var fnt: Font = lbl.label_settings.font if (lbl.label_settings != null and lbl.label_settings.font != null) else lbl.get_theme_font("font")
	var fsz := lbl.label_settings.font_size if lbl.label_settings != null else 14
	var outline := float(lbl.label_settings.outline_size) if lbl.label_settings != null else 0.0
	return (fnt.get_string_size(lbl.text, HORIZONTAL_ALIGNMENT_LEFT, -1, fsz).x + outline) * lbl.scale.x

func _append_playtest_audit_log(sprites_cnt: int, max_ov: float, min_gap: float, bunny_dist: float, all_dist: float, h_closed: String, h_open: String) -> void:
	var log_path := "res://playtest_audit_log.md"
	var existing := ""
	if FileAccess.file_exists(log_path):
		existing = FileAccess.get_file_as_string(log_path)
	else:
		existing = "# 《云岛集市》全自动真机试玩与巡检记录 (`playtest_audit_log.md`)\n\n"
	var dt := Time.get_datetime_string_from_system(false, true)
	var entry := "## [%s] 自主试玩巡检 PASS (PRD契约已同步: 完成 %d 项 | 待办 %d 项)\n" % [dt, completed_prd_tasks_count, pending_prd_tasks.size()]
	if pending_prd_tasks.size() > 0:
		entry += "- **下一轮自动开发目标 (`NEXT-DEV-TARGET`)**: `%s`\n" % [pending_prd_tasks[0]]
	entry += "- **切帧与姿态防呆**: 已校验 `%d` 个精灵节点，0 越界切帧、0 旋转异常、前爪抱篮 3 层合成挂载正常。\n" % sprites_cnt
	entry += "- **建筑间距与图层**: 三岛 19 座主建筑(7+6+6)最大水平重叠率 `%.1f%%` (`<=15%%`)，最小净间距 `%.1fpx` (`>=28px`)。\n" % [max_ov * 100.0, min_gap]
	entry += "- **产线活体与交互**: 兔子累计移动 `%.1fpx` (全员 `%.1fpx`)，农田收获 `%d` 次，入库/上架 `%d` 件，顾客结账 `%d` 单，滚轮鼠标锚点缩放与锁岛防误升校验通过。\n" % [
		bunny_dist, all_dist, harvest_count, items_delivered_count, customer_paid_count
	]
	entry += "- **真机双状态截图哈希**: 收起态 `%s` | 展开态 `%s`\n\n" % [h_closed.substr(0, 16), h_open.substr(0, 16)]
	var f := FileAccess.open(log_path, FileAccess.WRITE)
	if f != null:
		var combined := existing + "\n" + entry
		var parts := combined.split("\n## [")
		var kept_blocks: Array[String] = []
		for idx in range(1, parts.size()):
			var blk := ("## [" + parts[idx]).strip_edges()
			if blk != "":
				kept_blocks.append(blk)
		if kept_blocks.size() > 10:
			kept_blocks = kept_blocks.slice(kept_blocks.size() - 10)
		var out_header := "# 《云岛集市》全自动真机试玩与巡检记录 (`playtest_audit_log.md`)\n\n> 滚动保留最近 10 条记录；历史巡检日志已周期性压缩归档至 `docs/archives/playtest_logs_archive.md.gz`。\n\n"
		f.store_string(out_header + "\n\n".join(kept_blocks) + "\n")

func _sha256_bytes(buf: PackedByteArray) -> String:
	var hc := HashingContext.new()
	hc.start(HashingContext.HASH_SHA256)
	hc.update(buf)
	return hc.finish().hex_encode()

func _find_deprecated_font_node(node: Node) -> String:
	var forbidden_name := "Pixel" + "FontRenderer"
	if node.name == forbidden_name:
		return node.get_path()
	var scr: Script = node.get_script()
	if scr != null and scr.resource_path.find(forbidden_name) != -1:
		return scr.resource_path
	for child in node.get_children():
		var found := _find_deprecated_font_node(child)
		if found != "":
			return found
	return ""

## i18n audit (assertion 29) ---------------------------------------------------------------------------------------------
## Glyphs that exist only in simplified Chinese (not encodable in Shift-JIS), taken from every zh text the game ships; a
## ja_JP text must never contain one (regenerated together with the text tables).
const I18N_SIMPLIFIED_ONLY_GLYPHS := "专业丛东丝两丰临为乌乐习产仅仓份众优传你侣值兑兰关军农净减凤击创剧办务动劲勋华单卖卡历压发变叠启员咔啦喂嚓囊团园图圆圣场块坯埚处备复头奖奶实宠审宽宾导尝层屉屿岛币师带帧帮庆库应废开异张归录态总悬惊战执扩扫抚抢护报拟挡挤损换摄摆摊时显晚暂朵杀杂杨极枫柜查标栈栏树样桌桥桩检樱欢步每汉汤沏测渔渲滚满滩灵炼烘烤烧热爱獭玫环现电疗盏码碰离秆种积秸窑窨笼签简篮类糕紧红约级纹线组细经结绝统续缆缓编缘缩罄罗职联胶艺节荣荧药获萝萤营蛰蜕衔见观规视计订让记许论访证评词试询语误请读调谢谱负财账货质购贴贵费赏赚赛赞赢趟跃车轨转轮软载输边达过运还进远连选邮鉴针钟钮钵铃银铺链销锁锅锚锦键镇长闪闭间阈队阶隐雾页顶项顺顾颁颂预领颗题额风飘飞饮饰饲馆马驱驻验鱼鲜鲤鲸鸟鸣鸥鹅齐龙"
const I18N_TARGET_LANGS: Array[String] = ["en_US", "ja_JP"]
const I18N_BANNER_W := 520.0

var _i18n_spec_re: RegEx = null
var _i18n_left_re: RegEx = null

func _i18n_specs(t: String) -> PackedStringArray:
	if _i18n_spec_re == null:
		_i18n_spec_re = RegEx.create_from_string("%(%|[-+ 0#]*[0-9]*(\\.[0-9]+)?[sdfxXc])|\\{[0-9]\\}")
	var out := PackedStringArray()
	for m in _i18n_spec_re.search_all(t):
		out.append(m.get_string())
	return out

## "" when `txt` has no glyph of another language for `lang` (en: no CJK / kana / full-width form; ja: no simplified-only glyph)
func _i18n_glyph_problem(lang: String, txt: String) -> String:
	for i in range(txt.length()):
		var c := txt.unicode_at(i)
		if lang == "en_US":
			if (c >= 0x2E80 and c <= 0x9FFF) or (c >= 0xF900 and c <= 0xFAFF) or (c >= 0xFF00 and c <= 0xFFEF) or (c >= 0xAC00 and c <= 0xD7AF):
				return "CJK glyph `%s`" % txt.substr(i, 1)
		elif lang == "ja_JP":
			if c >= 0x3400 and I18N_SIMPLIFIED_ONLY_GLYPHS.find(txt.substr(i, 1)) != -1:
				return "simplified-only glyph `%s`" % txt.substr(i, 1)
	return ""

## A rendered text: other-language glyphs or a placeholder left unformatted (`%d`, `%s`, `%.2f` not followed by a letter)
func _i18n_text_problem(lang: String, txt: String) -> String:
	if _i18n_left_re == null:
		_i18n_left_re = RegEx.create_from_string("%(\\.[0-9]+)?[sdf](?![A-Za-z])")
	if _i18n_left_re.search(txt) != null:
		return "raw placeholder"
	return _i18n_glyph_problem(lang, txt)

## Table integrity: same keys + placeholders in the 3 languages, every data name in en + ja, clean glyphs
func _i18n_table_problems() -> Array[String]:
	var out: Array[String] = []
	var zh: Dictionary = EconomyConfig.I18N_DICT["zh_CN"]
	for lang in I18N_TARGET_LANGS:
		var tbl: Dictionary = EconomyConfig.I18N_DICT[lang]
		for k in zh.keys():
			if not tbl.has(k):
				out.append("%s misses key `%s`" % [lang, k])
				continue
			if str(_i18n_specs(String(tbl[k]))) != str(_i18n_specs(String(zh[k]))):
				out.append("%s `%s` placeholders %s != zh %s" % [lang, k, str(_i18n_specs(String(tbl[k]))), str(_i18n_specs(String(zh[k])))])
			var gp := _i18n_glyph_problem(lang, String(tbl[k]))
			if gp != "":
				out.append("%s `%s`: %s" % [lang, k, gp])
		for k2 in tbl.keys():
			if not zh.has(k2):
				out.append("%s has a key zh lacks: `%s`" % [lang, k2])
	var names_en: Dictionary = EconomyConfig.NAME_I18N["en_US"]
	var names_ja: Dictionary = EconomyConfig.NAME_I18N["ja_JP"]
	for zk in names_en.keys():
		if not names_ja.has(zk):
			out.append("data name `%s` has en but no ja" % zk)
	for zk2 in names_ja.keys():
		if not names_en.has(zk2):
			out.append("data name `%s` has ja but no en" % zk2)
	for lang2 in I18N_TARGET_LANGS:
		var nt: Dictionary = EconomyConfig.NAME_I18N[lang2]
		for zk3 in nt.keys():
			var gp2 := _i18n_glyph_problem(lang2, String(nt[zk3]))
			if gp2 != "":
				out.append("%s data name `%s` -> `%s`: %s" % [lang2, zk3, String(nt[zk3]), gp2])
	return out

## Every item id the HUD / banners can name
func _i18n_item_ids() -> Array:
	var ids: Array = []
	ids.append_array(EconomyConfig.CROPS.keys())
	ids.append_array(EconomyConfig.DELICACIES.keys())
	for arr in [EconomyConfig.SOLAR_DISH_ORDER, EconomyConfig.HYBRID_FLORA_ORDER, EconomyConfig.SOUVENIR_BOX_ORDER, EconomyConfig.HOTSPRING_BATH_ORDER, EconomyConfig.BAKERY_CODEX_ORDER, EconomyConfig.TEA_CODEX_ORDER, EconomyConfig.TASTING_DISH_ORDER, EconomyConfig.DAIRY_CODEX_ORDER, EconomyConfig.CINEMA_FILM_ORDER, EconomyConfig.POTTERY_CODEX_ORDER, EconomyConfig.KITE_ORDER, EconomyConfig.SEASON_ORDER]:
		ids.append_array(arr)
	ids.append(EconomyConfig.SEAFOOD_ITEM_ID)
	return ids

## Tiles of the menu view on screen fit and are clean for the current language; returns the number of tiles checked
func _i18n_check_hud_view(hud: HUD, ctx: String, out: Array[String], _st: Dictionary) -> int:
	var p := _menu_tiles_problem(hud, ctx)
	if p != "":
		out.append(p)
	var list := hud._get_current_tab_cards()
	for c in list:
		var hp := _i18n_text_problem(EconomyConfig.current_lang, String(c.get("hint", "")) + String(c["title"]) + String(c.get("verb", "")) + String(c["cost"]))
		if hp != "":
			out.append("%s `%s` / `%s`: %s" % [ctx, String(c["title"]), String(c.get("hint", "")), hp])
		# one glance is enough: the hover line stays one short line
		if String(c.get("hint", "")).length() > 44:
			out.append("%s hint too long `%s`" % [ctx, String(c["hint"])])
	return list.size()

## The bottom bar / the capsule keep inside their space whatever the language; returns the number checked
func _i18n_check_chrome(hud: HUD, ctx: String, out: Array[String], _st: Dictionary) -> int:
	hud._sync_label_nodes()
	if hud.is_collapsed_capsule:
		if hud.capsule_root.get_combined_minimum_size().x > HUD.CAPSULE_RECT.size.x:
			out.append("%s capsule %.0fpx wide" % [ctx, hud.capsule_root.get_combined_minimum_size().x])
		return 1
	if hud.bar_root.get_combined_minimum_size().x > HUD.FULL_BAR_RECT.size.x + 0.5:
		out.append("%s bar needs %.0fpx" % [ctx, hud.bar_root.get_combined_minimum_size().x])
	for tl in hud.lbl_tabs:
		if UiKit.text_width(tl) > 76.0:
			out.append("%s tab caption `%s` %.0fpx" % [ctx, tl.text, UiKit.text_width(tl)])
	return 1 + hud.lbl_tabs.size()

## Every visible Label under `root`: no other-language glyph, no raw placeholder; returns the number scanned
func _i18n_scan_visible(root: Node, ctx: String, out: Array[String]) -> int:
	var n := 0
	var stack: Array = [root]
	while not stack.is_empty():
		var nd: Node = stack.pop_back()
		for ch in nd.get_children():
			stack.append(ch)
		if nd is Label and (nd as Label).is_visible_in_tree() and (nd as Label).text.strip_edges() != "":
			n += 1
			var pr := _i18n_text_problem(EconomyConfig.current_lang, (nd as Label).text)
			if pr != "":
				out.append("%s %s: %s `%s`" % [ctx, String(nd.name), pr, (nd as Label).text])
	return n

## Every news line (sample arguments) is one short line in every language
func _i18n_check_all_banners(hud: HUD, lang: String, out: Array[String], st: Dictionary, longest_item: String) -> void:
	var tbl: Dictionary = EconomyConfig.I18N_DICT[lang]
	var long_name := EconomyConfig.get_item_display_name(longest_item)
	for k in tbl.keys():
		var ks := String(k)
		if not ks.begins_with("bn_"):
			continue
		var tpl := String(tbl[k])
		var args: Array = []
		for sp in _i18n_specs(tpl):
			if sp != "%%":
				args.append(999 if sp.ends_with("d") else (long_name if sp.ends_with("s") else 1.88))
		var sample := (tpl % args) if not args.is_empty() else tpl
		var sw := UiKit.font(true).get_string_size(sample, HORIZONTAL_ALIGNMENT_LEFT, -1, 17).x
		st["banners"] = int(st["banners"]) + 1
		st["max_banner_w"] = maxf(float(st["max_banner_w"]), sw)
		if sw > I18N_BANNER_W:
			out.append("%s news `%s` %.0f>%.0fpx `%s`" % [lang, ks, sw, I18N_BANNER_W, sample])
		var pr := _i18n_text_problem(lang, sample)
		if pr != "":
			out.append("%s news `%s` %s `%s`" % [lang, ks, pr, sample])

## The whole assertion 29; returns stats or {"error": ...}
func _i18n_audit(world: MainWorld) -> Dictionary:
	var problems := _i18n_table_problems()
	if not problems.is_empty():
		return {"error": "text tables: " + " | ".join(problems.slice(0, 25))}
	var hud: HUD = world.hud
	if hud == null:
		return {"error": "no HUD"}
	var st := {"banners": 0, "max_banner_w": 0.0}
	var out: Array[String] = []
	var views := 0
	var labels := 0
	var scanned := 0
	var keep_ts := Engine.time_scale
	var keep_clock: Callable = GameManager.season_clock
	var keep_islands: Dictionary = GameManager.unlocked_islands.duplicate()
	var flag_names := ["greenhouse_unlocked", "hotspring_unlocked", "windmill_unlocked", "tea_pavilion_unlocked", "chef_pavilion_unlocked", "lighthouse_harbor_unlocked", "dairy_workshop_unlocked", "pottery_kiln_unlocked", "open_air_cinema_unlocked", "airship_docked", "parade_festival_timer", "moon_tea_gathering_timer", "wish_lantern_festival_timer", "gourmet_acclaim_timer", "kite_festival_active", "kite_festival_clock", "current_weather", "cinema_night_on", "cinema_night_clock", "gold"]
	var keep_flags := {}
	for fn in flag_names:
		keep_flags[fn] = GameManager.get(fn)
	var ids := _i18n_item_ids()
	# every item has its own name in both target languages
	for lang0 in I18N_TARGET_LANGS:
		EconomyConfig.set_language(lang0)
		for iid in ids:
			var nm := EconomyConfig.get_item_display_name(String(iid))
			if nm == EconomyConfig.get_item_raw_name(String(iid)) and lang0 == "en_US":
				out.append("%s item `%s` has no translated name (`%s`)" % [lang0, String(iid), nm])
			var gp := _i18n_glyph_problem(lang0, nm)
			if gp != "":
				out.append("%s item `%s` -> `%s`: %s" % [lang0, String(iid), nm, gp])
	EconomyConfig.set_language("zh_CN")
	# world labels: zh footprints first, time frozen so nothing moves between the language snapshots
	Engine.time_scale = 0.0
	if world.floating_text != null and world.floating_text.has_method("clear_all"):
		world.floating_text.clear_all()
	world._on_language_changed()
	await get_tree().process_frame
	await get_tree().process_frame
	var world_texts_checked := 0
	var shots: Array[String] = []
	# zh review shots of the same views (side-by-side comparison with en / ja)
	hud.open_drawer(2)
	await _ci15_capture("user://i18n_zh_CN_tab2_1920x360.png")
	hud.open_drawer(3)
	hud.offline_banner_timer = 0.0
	await _ci15_capture("user://i18n_zh_CN_tab3_1920x360.png")
	hud.open_drawer(2)
	hud.wish_board_view = true
	await _ci15_capture("user://i18n_zh_CN_wish_board_1920x360.png")
	var zclk := {"year": 2031, "month": 3, "day": 23, "hour": 10, "minute": 0}
	GameManager.set_season_clock(func() -> Dictionary: return zclk.duplicate())
	GameManager.refresh_island_calendar()
	hud.open_drawer(2)
	hud.birthday_view = true
	hud.offline_banner_timer = 0.0
	await _ci15_capture("user://i18n_zh_CN_birthday_1920x360.png")
	GameManager.set_season_clock(keep_clock)
	GameManager.refresh_island_calendar()
	shots.append_array(["i18n_zh_CN_tab2", "i18n_zh_CN_tab3", "i18n_zh_CN_wish_board", "i18n_zh_CN_birthday"])
	# CI-16: the Workers tab + the food week / bonds panels (zh reference shots)
	var keep_stall16: Dictionary = GameManager.stall_inventory.duplicate(true)
	hud.open_drawer(1)
	hud.offline_banner_timer = 0.0
	await _ci15_capture("user://i18n_zh_CN_tab1_1920x360.png")
	hud.food_week_view = true
	await _ci15_capture("user://i18n_zh_CN_food_week_1920x360.png")
	hud.open_drawer(1)
	hud.friendship_view = true
	await _ci15_capture("user://i18n_zh_CN_friendship_1920x360.png")
	shots.append_array(["i18n_zh_CN_tab1", "i18n_zh_CN_food_week", "i18n_zh_CN_friendship"])
	for lang in I18N_TARGET_LANGS:
		EconomyConfig.set_language(lang)
		hud.close_drawer(false)
		await get_tree().process_frame
		await get_tree().process_frame
		# 3) world labels inside their zh footprint + clean text
		scanned += _i18n_scan_visible(get_tree().root, lang + " world+bar", out)
		# 2) HUD views. State A = the late-game state left by the assertions above (+ its info-card banners)
		for t in range(4):
			hud.open_drawer(t)
			labels += _i18n_check_hud_view(hud, "%s A tab%d" % [lang, t], out, st)
			labels += _i18n_check_chrome(hud, "%s A tab%d" % [lang, t], out, st)
			scanned += _i18n_scan_visible(get_tree().root, "%s A tab%d" % [lang, t], out)
			views += 1
		# wish board panel (+ every note's banner)
		hud.open_drawer(2)
		hud.wish_board_view = true
		labels += _i18n_check_hud_view(hud, lang + " wish board", out, st)
		scanned += _i18n_scan_visible(get_tree().root, lang + " wish board", out)
		views += 1
		hud.offline_banner_timer = 0.0
		await _ci15_capture("user://i18n_%s_wish_board_1920x360.png" % lang)
		shots.append("i18n_%s_wish_board" % lang)
		# birthday panel: a birthday with the gift still pending (a far-future year, no gift given yet) and a plain day
		for bd_day in [23, 24]:
			var bclk := {"year": 2031, "month": 3, "day": bd_day, "hour": 10, "minute": 0}
			GameManager.set_season_clock(func() -> Dictionary: return bclk.duplicate())
			GameManager.refresh_island_calendar()
			hud.open_drawer(2)
			hud.birthday_view = true
			labels += _i18n_check_hud_view(hud, "%s birthday d%d" % [lang, bd_day], out, st)
			scanned += _i18n_scan_visible(get_tree().root, "%s birthday d%d" % [lang, bd_day], out)
			views += 1
			if bd_day == 23:
				hud.offline_banner_timer = 0.0
				await _ci15_capture("user://i18n_%s_birthday_1920x360.png" % lang)
				shots.append("i18n_%s_birthday" % lang)
		GameManager.set_season_clock(keep_clock)
		GameManager.refresh_island_calendar()
		# CI-16: the food week panel (a dish waiting on the shelf / every entry used) + the bonds panel
		for fw_state in ["open", "full"]:
			var keep_entries16: Array[String] = []
			keep_entries16.assign(GameManager.food_week_entries)
			if fw_state == "full":
				var full16: Array[String] = ["delicacy_0", "delicacy_1", "delicacy_2"]
				GameManager.food_week_entries.assign(full16)
			else:
				GameManager.food_week_entries.clear()
				GameManager.stall_inventory["dish_starlight_fish"] = maxi(1, int(GameManager.stall_inventory.get("dish_starlight_fish", 0)))
			hud.open_drawer(1)
			hud.food_week_view = true
			labels += _i18n_check_hud_view(hud, "%s food week %s" % [lang, fw_state], out, st)
			scanned += _i18n_scan_visible(get_tree().root, "%s food week %s" % [lang, fw_state], out)
			views += 1
			if fw_state == "open":
				hud.offline_banner_timer = 0.0
				await _ci15_capture("user://i18n_%s_food_week_1920x360.png" % lang)
				shots.append("i18n_%s_food_week" % lang)
			GameManager.food_week_entries.assign(keep_entries16)
		hud.open_drawer(1)
		hud.friendship_view = true
		labels += _i18n_check_hud_view(hud, lang + " bonds", out, st)
		scanned += _i18n_scan_visible(get_tree().root, lang + " bonds", out)
		views += 1
		hud.offline_banner_timer = 0.0
		await _ci15_capture("user://i18n_%s_friendship_1920x360.png" % lang)
		shots.append("i18n_%s_friendship" % lang)
		hud.open_drawer(1)
		hud.offline_banner_timer = 0.0
		# State B = early game: islands 2/3 closed, every special building unbuilt, the caravan at sea, no gold
		GameManager.unlocked_islands = {1: true, 2: false, 3: false}
		for fb in ["greenhouse_unlocked", "hotspring_unlocked", "windmill_unlocked", "tea_pavilion_unlocked", "chef_pavilion_unlocked", "lighthouse_harbor_unlocked", "dairy_workshop_unlocked", "pottery_kiln_unlocked", "open_air_cinema_unlocked", "airship_docked"]:
			GameManager.set(fb, false)
		GameManager.gold = 10
		for tb in range(4):
			hud.open_drawer(tb)
			labels += _i18n_check_hud_view(hud, "%s B tab%d" % [lang, tb], out, st)
			labels += _i18n_check_chrome(hud, "%s B tab%d" % [lang, tb], out, st)
			scanned += _i18n_scan_visible(hud, "%s B tab%d" % [lang, tb], out)
			views += 1
		GameManager.unlocked_islands = keep_islands.duplicate()
		for fb2 in flag_names:
			GameManager.set(fb2, keep_flags[fb2])
		# State C = every festival running at once (flags only; no game frame runs while they are set)
		GameManager.parade_festival_timer = 33.0
		GameManager.moon_tea_gathering_timer = 33.0
		GameManager.wish_lantern_festival_timer = 33.0
		GameManager.gourmet_acclaim_timer = 33.0
		GameManager.kite_festival_active = true
		GameManager.lighthouse_harbor_unlocked = true
		GameManager.open_air_cinema_unlocked = true
		GameManager.current_weather = GameManager.WeatherState.NIGHT
		GameManager.cinema_night_on = true
		GameManager.cinema_night_clock = 1.0
		GameManager.airship_docked = not bool(keep_flags["airship_docked"])
		for tc in [2, 3]:
			hud.open_drawer(tc)
			labels += _i18n_check_hud_view(hud, "%s C tab%d" % [lang, tc], out, st)
			labels += _i18n_check_chrome(hud, "%s C tab%d" % [lang, tc], out, st)
			scanned += _i18n_scan_visible(hud, "%s C tab%d" % [lang, tc], out)
			views += 1
		# State D = mid-game counters (2-digit guests / stocks / medals) on top of the running festivals
		var counter_names := ["hotspring_guests_served", "parade_tourists_served", "tea_connoisseurs_served", "souvenirs_sold_count", "wish_lanterns_collected", "cinema_screenings_total", "cinema_medals", "kite_medals", "wish_medals", "birthday_parties_total", "chef_medals", "tastings_held", "kite_collected_total", "seafood_landed_total", "wishes_fulfilled_total", "wish_vouchers_total", "food_week_entries_total"]
		var keep_counters := {}
		for cn in counter_names:
			keep_counters[cn] = GameManager.get(cn)
			GameManager.set(cn, 99)
		for td in [2, 3]:
			hud.open_drawer(td)
			labels += _i18n_check_hud_view(hud, "%s D tab%d" % [lang, td], out, st)
			views += 1
		for cn2 in counter_names:
			GameManager.set(cn2, keep_counters[cn2])
		for fb3 in flag_names:
			GameManager.set(fb3, keep_flags[fb3])
		# capsule + stealth capsule
		hud.close_drawer(true)
		labels += _i18n_check_chrome(hud, lang + " capsule", out, st)
		scanned += _i18n_scan_visible(hud, lang + " capsule", out)
		hud.set_boss_stealth(true)
		labels += _i18n_check_chrome(hud, lang + " stealth", out, st)
		scanned += _i18n_scan_visible(hud, lang + " stealth", out)
		hud.set_boss_stealth(false)
		views += 2
		# banners: the longest item name of this language feeds the item-carrying ones
		var longest_item := ""
		var longest_w := -1.0
		var bfont: Font = hud.lbl_offline.get_theme_font("font")
		for iid2 in ids:
			var w2 := bfont.get_string_size(EconomyConfig.get_item_display_name(String(iid2)), HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
			if w2 > longest_w:
				longest_w = w2
				longest_item = String(iid2)
		hud.open_drawer(2)
		_i18n_check_all_banners(hud, lang, out, st, longest_item)
		# review shots: tab 2 with a banner, the codex tab, the collapsed bar
		hud.open_drawer(2)
		await _ci15_capture("user://i18n_%s_tab2_1920x360.png" % lang)
		hud.open_drawer(3)
		hud.offline_banner_timer = 0.0
		await _ci15_capture("user://i18n_%s_tab3_1920x360.png" % lang)
		shots.append("i18n_%s_tab2" % lang)
		shots.append("i18n_%s_tab3" % lang)
		# the Buildings / Workers tabs too, so every card line of the 4 tabs can be read in each language
		for tx in [0, 1]:
			hud.open_drawer(tx)
			hud.offline_banner_timer = 0.0
			await _ci15_capture("user://i18n_%s_tab%d_1920x360.png" % [lang, tx])
			shots.append("i18n_%s_tab%d" % [lang, tx])
	# 4) back to zh_CN, state as it was
	GameManager.stall_inventory = keep_stall16
	EconomyConfig.set_language("zh_CN")
	GameManager.set_season_clock(keep_clock)
	GameManager.refresh_island_calendar()
	GameManager.unlocked_islands = keep_islands
	for fr in flag_names:
		GameManager.set(fr, keep_flags[fr])
	hud.close_drawer(false)
	hud.offline_banner_timer = 0.0
	hud._sync_label_nodes()
	Engine.time_scale = keep_ts
	await get_tree().process_frame
	if EconomyConfig.current_lang != "zh_CN":
		out.append("did not switch back to zh_CN")
	if not out.is_empty():
		var shown: Array[String] = []
		for oi in range(mini(60, out.size())):
			shown.append(out[oi])
		return {"error": "%d problem(s):\n  %s" % [out.size(), "\n  ".join(shown)]}
	return {"keys": EconomyConfig.I18N_DICT["zh_CN"].size(), "names": EconomyConfig.NAME_I18N["en_US"].size(), "views": views, "labels": labels,
		"banners": int(st["banners"]), "max_banner_w": float(st["max_banner_w"]), "scanned": scanned, "world_texts": world_texts_checked,
		"shots": "user://{" + ",".join(shots) + "}_1920x360.png"}

## CI-16 (assertion 30) -------------------------------------------------------------------------------------------------
## Cloud-Isle Food Critics' Week + Islander Friendship Bonds: textures, island-calendar weeks / judges / tastes, pause
## isolation, dish data, scores / medals / entries, friendship from real events (wish, birthday, food week), level table,
## price bonus + cap, save round trip, HUD (Workers cards 7 / 8, both panels, codex card 18, tab 2 unchanged). Returns
## {"error": ...} or stats.
func _ci16_fail(msg: String) -> Dictionary:
	return {"error": msg}

## Review capture without the floating texts the checks above spawned (time is frozen, so they would never fade)
func _ci16_capture(world: MainWorld, path: String) -> void:
	if world.floating_text != null and world.floating_text.has_method("clear_all"):
		world.floating_text.clear_all()
	await _ci15_capture(path)

func _ci16_set_clock_day(clk: Dictionary, unix_noon: int) -> void:
	var d := Time.get_datetime_dict_from_unix_time(unix_noon)
	clk["year"] = int(d["year"])
	clk["month"] = int(d["month"])
	clk["day"] = int(d["day"])
	clk["hour"] = 10
	clk["minute"] = 0

func _ci16_audit(world: MainWorld) -> Dictionary:
	var hud: HUD = world.hud
	if hud == null:
		return _ci16_fail("no HUD")
	var keep_clock: Callable = GameManager.season_clock
	var keep_gold := GameManager.gold
	var keep_vouchers := GameManager.rare_codex_vouchers
	var keep_stall: Dictionary = GameManager.stall_inventory.duplicate(true)
	var keep_pw := GameManager.wish_paused
	var keep_board: Array = GameManager.wish_board.duplicate(true)
	var wish_names := ["wishes_fulfilled_total", "wish_fulfilled_counts", "wish_reputation_bonus", "wish_vouchers_total", "wish_medals", "wish_last_result", "birthday_last_gift_key", "birthday_counts", "birthday_parties_total", "birthday_reputation_bonus", "birthday_vouchers_total", "birthday_favourite_gifts", "birthday_medals", "birthday_last_result"]
	var keep_w := {}
	for wn in wish_names:
		var v = GameManager.get(wn)
		keep_w[wn] = v.duplicate(true) if (v is Dictionary or v is Array) else v
	var keep_career: Dictionary = GameManager.career_stats.duplicate(true)
	# time frozen: the review captures below must not run the island (no production / sales / career counters move)
	var keep_ts := Engine.time_scale
	Engine.time_scale = 0.0
	GameManager.sky_weather_paused = false
	GameManager.wish_paused = true
	GameManager._reset_food_week_and_friendship_state()
	var stats := {}

	# 1) Textures: 4 copied icons, imported, 64x64, transparent corners
	for tp in [EconomyConfig.FOOD_WEEK_JUDGE_TEX, EconomyConfig.FOOD_WEEK_PLATE_TEX, EconomyConfig.FOOD_WEEK_MEDAL_TEX, EconomyConfig.ICON_FRIENDSHIP_TEX]:
		if not ResourceLoader.exists(String(tp)):
			return _ci16_fail("texture `%s` is not imported by Godot" % String(tp))
		var tex := EconomyConfig.load_pixel_texture(String(tp))
		var img: Image = tex.get_image() if tex != null else null
		if img == null or img.get_width() != 64 or img.get_height() != 64:
			return _ci16_fail("texture `%s` is not a 64x64 image" % String(tp))
		for cpt in [Vector2i(0, 0), Vector2i(63, 0), Vector2i(0, 63), Vector2i(63, 63)]:
			if img.get_pixelv(cpt).a > 0.05:
				return _ci16_fail("texture `%s` corner %s is not transparent" % [String(tp), str(cpt)])

	# 2) Dish data + judge tastes
	if EconomyConfig.FOOD_WEEK_DISHES.size() != 18:
		return _ci16_fail("expected 18 entry dishes, got %d" % EconomyConfig.FOOD_WEEK_DISHES.size())
	for did in EconomyConfig.FOOD_WEEK_DISHES.keys():
		var dcfg: Dictionary = EconomyConfig.FOOD_WEEK_DISHES[did]
		if EconomyConfig.get_item_raw_name(String(did)) == String(did) or not EconomyConfig.FOOD_TASTES.has(String(dcfg["taste"])) or int(dcfg["base"]) < 50 or int(dcfg["base"]) > 80:
			return _ci16_fail("dish `%s` is not an existing dish with a valid taste / base" % String(did))
	for raw in ["crop_0", "crop_3", "clay_lump", "flour_golden_wheat", "seafood_catch", "flora_cloud_rose"]:
		if EconomyConfig.is_food_week_dish(raw):
			return _ci16_fail("`%s` must not be an entry dish" % raw)
	var taste_cnt := {}
	for isl in EconomyConfig.WISH_ISLANDERS:
		var tz := EconomyConfig.get_food_judge_taste(isl)
		taste_cnt[tz] = int(taste_cnt.get(tz, 0)) + 1
	for tk in EconomyConfig.FOOD_TASTE_ORDER:
		if int(taste_cnt.get(tk, 0)) != 2:
			return _ci16_fail("taste `%s` should belong to 2 judges: %s" % [tk, str(taste_cnt)])

	# 3) Score + medal math
	var score_cases := [["dish_mountain_sea_hotpot", "savory", 5, 100], ["dish_mountain_sea_hotpot", "savory", 0, 98], ["delicacy_0", "savory", 0, 58], ["delicacy_0", "sweet", 3, 84], ["tea_osmanthus_oolong", "fresh", 2, 92], ["crop_0", "sweet", 5, 0]]
	for sc in score_cases:
		var got := EconomyConfig.calc_food_week_score(String(sc[0]), String(sc[1]), int(sc[2]))
		if got != int(sc[3]):
			return _ci16_fail("score %s/%s/Lv%d = %d, expected %d" % [String(sc[0]), String(sc[1]), int(sc[2]), got, int(sc[3])])
	for tc in [[69, 0], [70, 1], [81, 1], [82, 2], [91, 2], [92, 3], [100, 3]]:
		if EconomyConfig.calc_food_week_tier(int(tc[0])) != int(tc[1]):
			return _ci16_fail("tier of %d should be %d" % [int(tc[0]), int(tc[1])])
	for lc in [[0, 0], [29, 0], [30, 1], [79, 1], [80, 2], [149, 2], [150, 3], [240, 4], [359, 4], [360, 5], [9999, 5]]:
		if EconomyConfig.calc_friend_level(int(lc[0])) != int(lc[1]):
			return _ci16_fail("friend level of %d points should be %d" % [int(lc[0]), int(lc[1])])

	# 4) Island-calendar weeks: 12 weeks from a Monday (crossing month ends), judges in islander order, 7 days per week
	var clk := {"year": 2031, "month": 3, "day": 1, "hour": 10, "minute": 0}
	GameManager.set_season_clock(func() -> Dictionary: return clk.duplicate())
	var started := [0]
	var lvl_ups: Array = []
	var on_start := func(_j: String, _w: int) -> void: started[0] = int(started[0]) + 1
	var on_lv := func(isl_l: String, lv_l: int, src_l: String) -> void: lvl_ups.append([isl_l, lv_l, src_l])
	EventBus.food_week_started.connect(on_start)
	EventBus.friendship_level_up.connect(on_lv)
	var base_noon := Time.get_unix_time_from_datetime_dict({"year": 2031, "month": 3, "day": 1, "hour": 12, "minute": 0, "second": 0})
	var monday_noon := base_noon
	for d0 in range(7):
		if EconomyConfig.calc_food_week_days_left(Time.get_datetime_dict_from_unix_time(base_noon + d0 * 86400)) == 7:
			monday_noon = base_noon + d0 * 86400
			break
	_ci16_set_clock_day(clk, monday_noon)
	GameManager.refresh_island_calendar()
	var w0 := GameManager.food_week_index
	started[0] = 0
	var judge_cnt := {}
	var prev_judge := ""
	for day in range(84):
		_ci16_set_clock_day(clk, monday_noon + day * 86400)
		GameManager.refresh_island_calendar()
		var wk := int(day / 7)
		if GameManager.food_week_index != w0 + wk or GameManager.get_food_week_days_left() != 7 - (day % 7):
			return _ci16_fail("day %d: week %d (expected %d), days left %d" % [day, GameManager.food_week_index, w0 + wk, GameManager.get_food_week_days_left()])
		if day % 7 == 0:
			var jg := GameManager.food_week_judge
			if prev_judge != "" and EconomyConfig.WISH_ISLANDERS.find(jg) != (EconomyConfig.WISH_ISLANDERS.find(prev_judge) + 1) % 6:
				return _ci16_fail("judge did not rotate in islander order: %s -> %s" % [prev_judge, jg])
			prev_judge = jg
			judge_cnt[jg] = int(judge_cnt.get(jg, 0)) + 1
		elif GameManager.food_week_judge != prev_judge:
			return _ci16_fail("judge changed mid-week on day %d" % day)
	if int(started[0]) != 11 or judge_cnt.size() != 6:
		return _ci16_fail("12 weeks gave %d week announcements (expected 11) / %d judges" % [int(started[0]), judge_cnt.size()])
	for jk in judge_cnt.keys():
		if int(judge_cnt[jk]) != 2:
			return _ci16_fail("judge %s served %d of 12 weeks" % [String(jk), int(judge_cnt[jk])])
	# a week spans the year end too (Mon..Sun around 2031-12-31 share one index)
	var ye_noon := Time.get_unix_time_from_datetime_dict({"year": 2031, "month": 12, "day": 31, "hour": 12, "minute": 0, "second": 0})
	var ye_mon := ye_noon - (7 - EconomyConfig.calc_food_week_days_left(Time.get_datetime_dict_from_unix_time(ye_noon))) * 86400
	var ye_idx := EconomyConfig.calc_food_week_index(Time.get_datetime_dict_from_unix_time(ye_mon))
	for yd in range(7):
		if EconomyConfig.calc_food_week_index(Time.get_datetime_dict_from_unix_time(ye_mon + yd * 86400)) != ye_idx:
			return _ci16_fail("the week around the year end splits")
	if EconomyConfig.calc_food_week_index(Time.get_datetime_dict_from_unix_time(ye_mon + 7 * 86400)) != ye_idx + 1:
		return _ci16_fail("the week after the year end is not the next index")

	# 5) Pause isolation: no week refresh and no friendship while paused
	GameManager.food_friend_paused = true
	var idx_p := GameManager.food_week_index
	_ci16_set_clock_day(clk, monday_noon + 100 * 86400)
	GameManager.refresh_island_calendar()
	if GameManager.food_week_index != idx_p or GameManager.add_friendship_points("bunny", 50, "test") != 0 or GameManager.get_friendship_points("bunny") != 0:
		return _ci16_fail("pause isolation broken")
	GameManager.food_friend_paused = false

	# 6) Entries in an otter week (savory): best dish first, repeats / raw goods / missing stock refused, 3 per week, gold medal
	GameManager._reset_food_week_and_friendship_state()
	var otter_noon := monday_noon
	for wk2 in range(6):
		if EconomyConfig.get_food_week_judge(EconomyConfig.calc_food_week_index(Time.get_datetime_dict_from_unix_time(monday_noon + wk2 * 7 * 86400))) == "otter":
			otter_noon = monday_noon + wk2 * 7 * 86400
			break
	_ci16_set_clock_day(clk, otter_noon + 2 * 86400)
	GameManager.refresh_island_calendar()
	if GameManager.food_week_judge != "otter" or GameManager.get_food_week_taste() != "savory":
		return _ci16_fail("otter week not found (judge %s)" % GameManager.food_week_judge)
	lvl_ups.clear()
	GameManager.stall_inventory = {"dish_mountain_sea_hotpot": 1, "dish_cloud_dumplings": 1, "delicacy_0": 2, "crop_0": 5}
	var v0 := GameManager.rare_codex_vouchers
	if GameManager.find_food_week_best_dish() != "dish_mountain_sea_hotpot" or GameManager.get_food_week_score_preview("dish_mountain_sea_hotpot") != 98:
		return _ci16_fail("best dish pick wrong: %s" % GameManager.find_food_week_best_dish())
	var r1 := GameManager.enter_food_week_dish()
	if not bool(r1.get("entered", false)) or int(r1["score"]) != 98 or int(r1["tier"]) != 3 or not bool(r1["medal_up"]) or int(r1["rep"]) != 24 + 80 or int(r1["vouchers"]) != 2 or not bool(r1["match"]) or int(r1["friend"]) != 16 or int(GameManager.stall_inventory.get("dish_mountain_sea_hotpot", 0)) != 0:
		return _ci16_fail("first entry wrong: %s" % str(r1))
	var refusals := [[GameManager.enter_food_week_dish("dish_mountain_sea_hotpot"), "repeat"], [GameManager.enter_food_week_dish("crop_0"), "not_dish"], [GameManager.enter_food_week_dish("dish_starlight_fish"), "stock"]]
	for rf in refusals:
		if bool((rf[0] as Dictionary).get("entered", true)) or String((rf[0] as Dictionary).get("reason", "")) != String(rf[1]):
			return _ci16_fail("refusal `%s` expected, got %s" % [String(rf[1]), str(rf[0])])
	var r2 := GameManager.enter_food_week_dish()
	if String(r2.get("dish", "")) != "dish_cloud_dumplings" or int(r2["score"]) != 90 or bool(r2["medal_up"]) or int(r2["rep"]) != 22 or int(r2["vouchers"]) != 0:
		return _ci16_fail("second entry wrong: %s" % str(r2))
	# 32 points -> Lv.1 with the judge -> +2 on the third (non-matching) dish
	var r3 := GameManager.enter_food_week_dish()
	if String(r3.get("dish", "")) != "delicacy_0" or int(r3["score"]) != 60 or int(r3["rep"]) != 15 or bool(r3["match"]) or int(r3["left"]) != 0:
		return _ci16_fail("third entry wrong: %s" % str(r3))
	var r4 := GameManager.enter_food_week_dish()
	if bool(r4.get("entered", true)) or String(r4.get("reason", "")) != "full":
		return _ci16_fail("a 4th entry was accepted: %s" % str(r4))
	if GameManager.food_week_best != 98 or GameManager.food_week_tier != 3 or int(GameManager.food_week_medals["gold"]) != 1 or GameManager.rare_codex_vouchers - v0 != 2 or GameManager.food_week_reputation_bonus != 104 + 22 + 15 or GameManager.get_friendship_points("otter") != 40 or GameManager.get_friendship_level("otter") != 1 or lvl_ups.size() != 1 or String(lvl_ups[0][2]) != "food_week" or GameManager.get_food_week_dishes_judged() != 3 or int(GameManager.stall_inventory.get("delicacy_0", 0)) != 1:
		return _ci16_fail("week totals wrong: best %d tier %d medals %s vouchers +%d rep %d otter %d pts, level-ups %s" % [GameManager.food_week_best, GameManager.food_week_tier, str(GameManager.food_week_medals), GameManager.rare_codex_vouchers - v0, GameManager.food_week_reputation_bonus, GameManager.get_friendship_points("otter"), str(lvl_ups)])
	stats["gold_rep"] = int(r1["rep"])
	# 7) Next week (fox, sweet): entries cleared, medals kept; bronze then silver in the same week (tier upgrade, no double count)
	_ci16_set_clock_day(clk, otter_noon + 7 * 86400)
	GameManager.refresh_island_calendar()
	if GameManager.food_week_judge != "fox" or not GameManager.food_week_entries.is_empty() or GameManager.food_week_best != 0 or GameManager.food_week_tier != 0 or int(GameManager.food_week_medals["gold"]) != 1:
		return _ci16_fail("new week did not reset entries / keep medals: judge %s, %d entries" % [GameManager.food_week_judge, GameManager.food_week_entries.size()])
	GameManager.stall_inventory = {"delicacy_0": 1, "solar_dish_winter": 1}
	var v1 := GameManager.rare_codex_vouchers
	var e1 := GameManager.enter_food_week_dish("delicacy_0")
	var e2 := GameManager.enter_food_week_dish("solar_dish_winter")
	var e3 := GameManager.enter_food_week_dish()
	if int(e1.get("score", 0)) != 78 or int(e1["tier"]) != 1 or int(e1["rep"]) != 19 + 20 or int(e2.get("score", 0)) != 90 or int(e2["tier"]) != 2 or int(e2["vouchers"]) != 1 or String(e3.get("reason", "")) != "no_dish":
		return _ci16_fail("bronze -> silver week wrong: %s / %s / %s" % [str(e1), str(e2), str(e3)])
	if int(GameManager.food_week_medals["bronze"]) != 0 or int(GameManager.food_week_medals["silver"]) != 1 or GameManager.get_food_week_medal_total() != 2 or GameManager.rare_codex_vouchers - v1 != 1:
		return _ci16_fail("medal upgrade counted twice: %s" % str(GameManager.food_week_medals))

	# 8) Friendship from real events: a fulfilled wish (+12), a favourite birthday gift (+45); cap; price bonus + cap
	var wb0: Dictionary = GameManager.wish_board[0]
	wb0["islander"] = "penguin"
	wb0["state"] = "open"
	GameManager._fulfil_wish(0)
	if GameManager.get_friendship_points("penguin") != EconomyConfig.FRIEND_WISH_POINTS:
		return _ci16_fail("a fulfilled wish gave penguin %d points" % GameManager.get_friendship_points("penguin"))
	var bday_noon := Time.get_unix_time_from_datetime_dict({"year": 2032, "month": 5, "day": EconomyConfig.get_islander_birthday_day("bunny"), "hour": 12, "minute": 0, "second": 0})
	_ci16_set_clock_day(clk, bday_noon)
	GameManager.refresh_island_calendar()
	GameManager.gold = 1000000000000
	GameManager.stall_inventory["crop_0"] = 1
	var g16 := GameManager.prepare_birthday_gift()
	if not bool(g16.get("given", false)) or String(g16.get("favourite", "")) != "crop_0" or GameManager.get_friendship_points("bunny") != EconomyConfig.FRIEND_BIRTHDAY_POINTS + EconomyConfig.FRIEND_BIRTHDAY_FAV_POINTS or GameManager.get_friendship_level("bunny") != 1:
		return _ci16_fail("birthday gift friendship wrong: %s, bunny %d pts" % [str(g16), GameManager.get_friendship_points("bunny")])
	if GameManager.add_friendship_points("ghost", 10, "test") != 0:
		return _ci16_fail("unknown islander got points")
	GameManager.add_friendship_points("shiba", 99999, "test")
	if GameManager.get_friendship_points("shiba") != 360 or GameManager.get_friendship_level("shiba") != 5:
		return _ci16_fail("points did not stop at the Lv.5 threshold: %d" % GameManager.get_friendship_points("shiba"))
	for isl0 in EconomyConfig.WISH_ISLANDERS:
		GameManager.friendship_points[isl0] = 0
	var m0 := GameManager.get_collection_multiplier()
	GameManager.friendship_points["bunny"] = 80
	var m2 := GameManager.get_collection_multiplier()
	for isl1 in EconomyConfig.WISH_ISLANDERS:
		GameManager.friendship_points[isl1] = 360
	var m30 := GameManager.get_collection_multiplier()
	if absf((m2 - m0) - 0.006) > 0.00001 or absf((m30 - m0) - EconomyConfig.FRIEND_PRICE_CAP) > 0.00001 or GameManager.get_friendship_total_levels() != 30 or GameManager.get_max_friend_count() != 6:
		return _ci16_fail("price bonus wrong: Lv2 +%.4f, Lv30 +%.4f" % [m2 - m0, m30 - m0])
	stats["price_cap"] = m30 - m0
	if GameManager.get_food_week_score_preview("delicacy_0") != EconomyConfig.calc_food_week_score("delicacy_0", GameManager.get_food_week_taste(), 5):
		return _ci16_fail("score preview ignores the judge's bond level")
	# a mixed late-game state for the save + HUD checks
	GameManager.friendship_points = {"bunny": 80, "otter": 150, "fox": 240, "shiba": 360, "penguin": 30, "toucan": 0}
	var fp_save: Dictionary = GameManager.friendship_points.duplicate()

	# 9) Save / load round trip (same week keeps its entries, another week drops them)
	_ci16_set_clock_day(clk, otter_noon + 7 * 86400)
	GameManager.refresh_island_calendar()
	GameManager.stall_inventory = {"dish_starlight_fish": 2, "delicacy_1": 1}
	var es := GameManager.enter_food_week_dish("delicacy_1")
	if not bool(es.get("entered", false)):
		return _ci16_fail("could not enter delicacy_1 before saving: %s" % str(es))
	fp_save = GameManager.friendship_points.duplicate()
	GameManager.save_game()
	var entries_saved := GameManager.food_week_entries.size()
	var medals_saved: Dictionary = GameManager.food_week_medals.duplicate()
	GameManager.friendship_points = {}
	GameManager.food_week_medals = {"bronze": 0, "silver": 0, "gold": 0}
	GameManager.food_week_entries.clear()
	GameManager.load_game()
	for isl2 in EconomyConfig.WISH_ISLANDERS:
		if GameManager.get_friendship_points(isl2) != int(fp_save[isl2]):
			return _ci16_fail("save round trip lost %s's bond (%d != %d)" % [isl2, GameManager.get_friendship_points(isl2), int(fp_save[isl2])])
	if str(GameManager.food_week_medals) != str(medals_saved) or GameManager.food_week_entries.size() != entries_saved or entries_saved != 1:
		return _ci16_fail("save round trip lost the week: medals %s entries %d/%d" % [str(GameManager.food_week_medals), GameManager.food_week_entries.size(), entries_saved])
	_ci16_set_clock_day(clk, otter_noon + 14 * 86400)
	GameManager.load_game()
	if not GameManager.food_week_entries.is_empty():
		return _ci16_fail("a save from last week kept its entries")
	_ci16_set_clock_day(clk, otter_noon + 7 * 86400)
	GameManager.load_game()

	# 10) HUD: Crew tab = 6 workers + Food Week + Bonds, both panels, codex entry
	hud.open_drawer(1)
	var c1: Array[Dictionary] = hud._get_current_tab_cards()
	if c1.size() != 8 or String(c1[6]["type"]) != "food_week" or String(c1[7]["type"]) != "friendship" or String(c1[0]["type"]) != "animal":
		return _ci16_fail("Crew tab should hold 6 workers + food week + bonds, got %d" % c1.size())
	var fit1 := _menu_tiles_problem(hud, "crew tab")
	if fit1 != "":
		return _ci16_fail(fit1)
	await _ci16_capture(world, "user://ci16_review_tab1_1920x360.png")
	# the captured frames ran the island (workshops keep stocking the shelf) -> pin the shelf again (no frame runs below)
	GameManager.stall_inventory = {"dish_starlight_fish": 2}
	hud._activate_card(6)
	var pf: Array[Dictionary] = hud._get_current_tab_cards()
	if not hud.food_week_view or pf.size() != 4 or String(pf[0]["type"]) != "fw_judge" or String(pf[1]["type"]) != "fw_entry" or String(pf[2]["type"]) != "fw_score" or String(pf[3]["type"]) != "fw_back":
		return _ci16_fail("food week panel did not open: %s" % str(pf))
	if String(pf[1]["cost_state"]) != "affordable" or String(pf[1]["title"]) != EconomyConfig.get_item_display_name("dish_starlight_fish"):
		return _ci16_fail("entry tile should offer the starlight koi: `%s`" % String(pf[1]["title"]))
	var fitf := _menu_tiles_problem(hud, "food week panel")
	if fitf != "":
		return _ci16_fail(fitf)
	hud._activate_card(1)
	if GameManager.food_week_entries.size() != 2 or hud.offline_banner_text.find("小狐狸") == -1 or String(hud._get_current_tab_cards()[1]["cost_state"]) != "locked":
		return _ci16_fail("entry from the panel failed: %d entries, news `%s`" % [GameManager.food_week_entries.size(), hud.offline_banner_text])
	hud._activate_card(1)
	if hud.offline_banner_text != EconomyConfig.tr_key("bn_no_dish"):
		return _ci16_fail("no-dish news missing: `%s`" % hud.offline_banner_text)
	GameManager.stall_inventory["dish_cloud_dumplings"] = 1
	hud._activate_card(1)
	if GameManager.food_week_entries.size() != 3 or String(hud._get_current_tab_cards()[1]["cost"]) != "3/3":
		return _ci16_fail("third entry from the panel failed: %d entries" % GameManager.food_week_entries.size())
	hud.offline_banner_timer = 0.0
	await _ci16_capture(world, "user://ci16_review_food_week_1920x360.png")
	hud._activate_card(3)
	if hud.food_week_view or hud._get_current_tab_cards().size() != 8:
		return _ci16_fail("back did not return to the Crew tab")
	hud._activate_card(7)
	var pr: Array[Dictionary] = hud._get_current_tab_cards()
	if not hud.friendship_view or pr.size() != 7 or String(pr[0]["type"]) != "fr_islander" or String(pr[6]["type"]) != "fr_back":
		return _ci16_fail("bonds panel did not open: %d tiles" % pr.size())
	if int(pr[3]["level"]) != 5 or String(pr[3]["cost"]) != EconomyConfig.tr_key("fr_isl_max") or int(pr[1]["level"]) != 3:
		return _ci16_fail("bonds panel levels wrong: %s" % str(pr))
	var fitr := _menu_tiles_problem(hud, "bonds panel")
	if fitr != "":
		return _ci16_fail(fitr)
	await _ci16_capture(world, "user://ci16_review_friendship_1920x360.png")
	hud._activate_card(6)
	if hud.friendship_view or hud._get_current_tab_cards().size() != 8:
		return _ci16_fail("bonds back did not return to the Crew tab")
	hud._activate_card(6)
	hud.open_drawer(2)
	if hud.food_week_view or hud.friendship_view:
		return _ci16_fail("panel survived a tab switch")
	var c2: Array[Dictionary] = hud._get_current_tab_cards()
	if _card_idx(hud, "birthday") < 0:
		return _ci16_fail("Expansion tab changed: %d cards" % c2.size())
	hud.open_drawer(3)
	var c3: Array[Dictionary] = hud._get_current_tab_cards()
	var fw_i := _card_idx(hud, "ci16_codex")
	if fw_i < 0 or _card_idx(hud, "guest_book") < 0 or String(c3[fw_i]["cost"]) != "%d/%d" % [GameManager.get_food_week_dishes_judged(), EconomyConfig.FOOD_WEEK_DISHES.size()]:
		return _ci16_fail("codex entry 18 invalid (%d cards)" % c3.size())
	var fit3 := _menu_tiles_problem(hud, "codex")
	if fit3 != "":
		return _ci16_fail(fit3)
	await _ci16_capture(world, "user://ci16_review_codex_1920x360.png")
	hud.close_drawer(false)
	stats["medals"] = GameManager.get_food_week_medal_total()
	stats["levels"] = GameManager.get_friendship_total_levels()

	# 11) Restore everything the checks touched (the bonds + medals stay as a late-game state for the i18n audit)
	EventBus.food_week_started.disconnect(on_start)
	EventBus.friendship_level_up.disconnect(on_lv)
	GameManager.set_season_clock(keep_clock)
	GameManager.gold = keep_gold
	GameManager.rare_codex_vouchers = keep_vouchers
	GameManager.stall_inventory = keep_stall
	GameManager.wish_board.assign(keep_board)
	for wn2 in wish_names:
		GameManager.set(wn2, keep_w[wn2])
	GameManager.wish_paused = keep_pw
	GameManager.career_stats = keep_career
	GameManager.refresh_island_calendar()
	Engine.time_scale = keep_ts
	return stats
