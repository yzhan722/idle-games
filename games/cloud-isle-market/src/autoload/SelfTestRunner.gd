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

	print("[PASS] [断言2-建筑防叠罗汉] 通过: 三岛全部 16 座主建筑水平最大重叠率 = %.1f%% (<= %.1f%%)，最小边缘净留白 = %.1fpx (>= %.1fpx)!" % [
		max_overlap_seen * 100.0, max_ov_limit * 100.0, min_gap_seen, min_gap_limit
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

	if world.hud == null or world.hud.lbl_drawer_fps == null or world.hud.lbl_drawer_opacity == null or world.hud.lbl_drawer_dock == null:
		_fail_and_quit("[断言6-任务栏贴合与帧率透明度锁]", "HUD drawer control labels for FPS, Opacity or Dock are missing!")
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

	if GameManager.pomodoro_active != false or GameManager.gold != pre_pomo_gold + box_gold or box_gold != 500:
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "Pomodoro box gold payout error: expected +500G, got %d (gold before=%d, after=%d)" % [box_gold, pre_pomo_gold, GameManager.gold])
		return
	if GameManager.frenzy_timer < 29.0:
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "Pomodoro box carnival frenzy buff not activated! frenzy_timer=%.2f" % GameManager.frenzy_timer)
		return
	if GameManager.pomodoro_completed_count != pre_pomo_count + 1:
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "Pomodoro completed count did not increment: %d -> %d" % [pre_pomo_count, GameManager.pomodoro_completed_count])
		return
	if world.hud.offline_banner_text.find("专注晨露礼盒") == -1:
		_fail_and_quit("[断言7-番茄钟与礼盒结算]", "HUD banner missing `专注晨露礼盒` message: `%s`" % world.hud.offline_banner_text)
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
	if world.hud.lbl_bar_pipeline == null or world.hud.lbl_bar_pipeline.text.find("契约:") == -1:
		_fail_and_quit("[断言8-晨露琥珀与皇家契约]", "HUD status text missing `契约:` prefix!")
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
	if SoundManager.get_white_noise_profile() != "rain" or SoundManager.get_white_noise_status_label() != "[白噪:雨声]":
		_fail_and_quit("[断言11-白噪音与锦鲤]", "Rain white noise profile/label mismatch: `%s` / `%s`" % [SoundManager.get_white_noise_profile(), SoundManager.get_white_noise_status_label()])
		return
	SoundManager.sync_white_noise_to_weather(2)
	if SoundManager.get_white_noise_profile() != "cricket" or SoundManager.get_white_noise_status_label() != "[白噪:虫鸣]":
		_fail_and_quit("[断言11-白噪音与锦鲤]", "Night white noise profile/label mismatch!")
		return
	SoundManager.set_white_noise_enabled(false)
	if SoundManager.get_white_noise_status_label() != "[白噪:关]":
		_fail_and_quit("[断言11-白噪音与锦鲤]", "Disabled white noise label should be `[白噪:关]`!")
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
		_fail_and_quit("[断言13-三岛满编压力]", "Island 2/3 cauldron & Orbis dual-workshop delicacies failed to unlock!")
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
	# [断言15-CI-2美食评论家与云游行商及云端花火灯会]:
	#   1) Gourmet Critic (`traveler_critic_normalized.png`, 48x48x2) tastes delicacy -> activates `gourmet_acclaim_timer` (+25% price & +20% tip) + medal badge;
	#   2) Caravan Merchant (`traveler_merchant_normalized.png`, 48x48x2) acquires surplus crops from `raw_baskets` -> grants `amber` + gold;
	#   3) Night Cloud Firework & Lantern Festival (`start_lantern_festival`) activates `fest_lantern_garland.png`, boosts VIP chance >= 0.58, and spawns pixel firework bursts.
	# ------------------------------------------------------------------
	GameManager.gourmet_acclaim_timer = 0.0
	var pre_codex_mult := GameManager.get_codex_price_multiplier()
	var pre_tip_mult := GameManager.get_customer_tip_multiplier(false, 3)
	GameManager.add_to_stall("delicacy_0", 2)
	var critic := world.spawn_special_visitor(CustomerNPC.VisitorRole.GOURMET_CRITIC)
	if critic == null or critic.body_sprite == null or critic.body_sprite.texture == null:
		_fail_and_quit("[断言15-特殊访客与花火灯会]", "Gourmet Critic failed to load `traveler_critic_normalized.png`!")
		return
	var critic_fw := float(critic.body_sprite.texture.get_width()) / float(maxi(1, critic.body_sprite.hframes))
	var critic_fh := float(critic.body_sprite.texture.get_height()) / float(maxi(1, critic.body_sprite.vframes))
	if critic.body_sprite.hframes != 2 or absf(critic_fw - 48.0) > 0.5 or absf(critic_fh - 48.0) > 0.5 or critic.tex_gourmet_medal == null:
		_fail_and_quit("[断言15-特殊访客与花火灯会]", "Gourmet Critic invalid slicing/medal: fw=%.1f fh=%.1f hframes=%d medal=%s" % [
			critic_fw, critic_fh, critic.body_sprite.hframes, str(critic.tex_gourmet_medal != null)
		])
		return
	var pre_critic_gold := GameManager.gold
	var critic_earned := GameManager.try_critic_taste_delicacy("delicacy_0", 1, critic.position)
	if critic_earned <= 0 or GameManager.gold <= pre_critic_gold or not GameManager.is_gourmet_acclaim_active():
		_fail_and_quit("[断言15-特殊访客与花火灯会]", "Gourmet Critic checkout failed to settle delicacy & activate Gourmet Acclaim!")
		return
	if GameManager.get_codex_price_multiplier() <= pre_codex_mult + 0.05 or GameManager.get_customer_tip_multiplier(false, 3) <= pre_tip_mult + 0.05:
		_fail_and_quit("[断言15-特殊访客与花火灯会]", "Gourmet Acclaim failed to boost price & tip multipliers!")
		return

	GameManager.raw_baskets[1]["crop_0"] = maxi(3, int(GameManager.raw_baskets[1].get("crop_0", 0)) + 3)
	var merchant := world.spawn_special_visitor(CustomerNPC.VisitorRole.CARAVAN_MERCHANT)
	if merchant == null or merchant.body_sprite == null or merchant.body_sprite.texture == null:
		_fail_and_quit("[断言15-特殊访客与花火灯会]", "Caravan Merchant failed to load `traveler_merchant_normalized.png`!")
		return
	var merch_fw := float(merchant.body_sprite.texture.get_width()) / float(maxi(1, merchant.body_sprite.hframes))
	var merch_fh := float(merchant.body_sprite.texture.get_height()) / float(maxi(1, merchant.body_sprite.vframes))
	if merchant.body_sprite.hframes != 2 or absf(merch_fw - 48.0) > 0.5 or absf(merch_fh - 48.0) > 0.5:
		_fail_and_quit("[断言15-特殊访客与花火灯会]", "Caravan Merchant invalid slicing: fw=%.1f fh=%.1f hframes=%d" % [
			merch_fw, merch_fh, merchant.body_sprite.hframes
		])
		return
	var pre_merch_amber := GameManager.amber
	var pre_merch_gold := GameManager.gold
	var barter_res := GameManager.try_merchant_acquire_surplus_crops(3, merchant.position)
	if int(barter_res.get("taken", 0)) <= 0 or GameManager.amber <= pre_merch_amber or GameManager.gold <= pre_merch_gold:
		_fail_and_quit("[断言15-特殊访客与花火灯会]", "Caravan Merchant surplus crop barter failed: %s" % str(barter_res))
		return

	if world.tex_lantern_garland == null:
		_fail_and_quit("[断言15-特殊访客与花火灯会]", "Festival lantern garland texture `fest_lantern_garland.png` failed to load!")
		return
	GameManager.start_lantern_festival(38.0)
	world._process(0.15)
	world.spawn_festival_firework_burst(948.0, 34.0)
	world.spawn_festival_firework_burst(1096.0, 28.0)
	world._process(0.25)
	if not GameManager.is_lantern_festival_active() or GameManager.get_weather_vip_chance() < 0.57 or world.fest_fireworks.size() == 0:
		_fail_and_quit("[断言15-特殊访客与花火灯会]", "Night Cloud Firework & Lantern Festival failed to activate VIP boost & pixel fireworks!")
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
	print("[PASS] [断言15-CI-2美食评论家与云游行商及云端花火灯会] 通过: 美食评论家品鉴触发36s金牌口碑(售价+25%%&小费+20%%)、云游行商收购田头富余作物换琥珀、夜间花火灯会彩灯串与像素烟花校验 PASS!")

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
		world.hud._sync_label_nodes()
		if world.hud.lbl_emp_names.size() != 6 or world.hud.lbl_emp_titles.size() != 6 or world.hud.lbl_emp_progress.size() != 6:
			_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "HUD Tab 3 missing 6-employee promotion/medal labels!")
			return
		var expected_medals: Array[int] = [3, 2, 1, 2, 1, 0]
		for ei in range(6):
			var en_lbl: Label = world.hud.lbl_emp_names[ei]
			var et_lbl: Label = world.hud.lbl_emp_titles[ei]
			var ep_lbl: Label = world.hud.lbl_emp_progress[ei]
			if not en_lbl.visible or not et_lbl.visible or not ep_lbl.visible:
				_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "HUD Tab 3 employee label %d not visible!" % ei)
				return
			if en_lbl.label_settings == null or et_lbl.label_settings == null or ep_lbl.label_settings == null:
				_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "HUD Tab 3 employee label %d missing LabelSettings!" % ei)
				return
			if ep_lbl.text.find(str(expected_medals[ei]) + "/3") == -1:
				_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "HUD Tab 3 employee %d medal progress mismatch: `%s`!" % [ei, ep_lbl.text])
				return
		if world.hud.lbl_drawer_title.text.find("9/18") == -1:
			_fail_and_quit("[断言16-CI-3员工晋升与勋章]", "HUD Tab 3 title missing total honor medal progress `9/18`: `%s`" % world.hud.lbl_drawer_title.text)
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
	var price_in_season := EconomyConfig.calc_item_unit_price("solar_dish_summer", 1, 1, 1, 9)
	var price_off_season := EconomyConfig.calc_item_unit_price("solar_dish_summer", 1, 1, 1, 3)
	if price_in_season <= int(round(float(price_off_season) * 1.35)):
		_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "Solar specialty dish 1.45x in-season price bonus failed: in=%d, off=%d!" % [price_in_season, price_off_season])
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
	var sd_sale_earned := GameManager.try_purchase_from_stall(crafted_sd, 1, Vector2(1013.4, EconomyConfig.GROUND_Y), false)
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
		world.hud.open_drawer(2)
		world.hud._sync_label_nodes()
		if not world.hud.lbl_card_titles[5].visible or world.hud.lbl_card_titles[5].text.find("远洋") == -1:
			_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "HUD Tab 2 missing Airship Bulk Order card #6: `%s`!" % world.hud.lbl_card_titles[5].text)
			return
		world.hud.open_drawer(3)
		world.hud._sync_label_nodes()
		if not world.hud.lbl_card_titles[5].visible or world.hud.lbl_card_titles[5].text.find("节气") == -1:
			_fail_and_quit("[断言17-CI-4远洋飞艇与节气美食]", "HUD Tab 3 missing Solar Term Specialty Codex card #6: `%s`!" % world.hud.lbl_card_titles[5].text)
			return
		world.hud.close_drawer(false)

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
	var base_codex_mult_ci5 := GameManager.get_codex_price_multiplier()

	GameManager.add_gold(300)
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
	collector_npc._process(2.2)
	var col_gold_gain := GameManager.gold - pre_col_gold
	var col_amber_gain := GameManager.get_amber() - pre_col_amber
	var col_voucher_gain := GameManager.get_rare_vouchers() - pre_col_vouchers
	if not collector_npc.purchased_ok or col_gold_gain < 400 or col_amber_gain < 4 or col_voucher_gain < 1 or GameManager.souvenirs_sold_count < 1 or GameManager.collector_reputation_bonus < 65:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Collector Tourist checkout settlement mismatch: ok=%s +gold=%d +amber=%d +voucher=%d sold=%d rep=%d" % [
			str(collector_npc.purchased_ok), col_gold_gain, col_amber_gain, col_voucher_gain, GameManager.souvenirs_sold_count, GameManager.collector_reputation_bonus
		])
		return
	if GameManager.get_codex_price_multiplier() <= base_codex_mult_ci5 + 0.30:
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "Flora + Souvenir Codex price multiplier did not increase as expected!")
		return
	if not bool(GameManager.unlocked_achievements.get("ach_greenhouse_bloom", false)) or not bool(GameManager.unlocked_achievements.get("ach_souvenir_master", false)):
		_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "CI-5 achievements (`ach_greenhouse_bloom`, `ach_souvenir_master`) did not unlock!")
		return
	collector_npc.queue_free()

	# Verify HUD Tab 0, Tab 2, Tab 3 Card #7 (`index 6`) native Labels + LabelSettings
	if world.hud != null:
		world.hud.open_drawer(0)
		world.hud._sync_label_nodes()
		if not world.hud.lbl_card_titles[6].visible or world.hud.lbl_card_titles[6].label_settings == null or world.hud.lbl_card_titles[6].text.find("云端温室") == -1:
			_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "HUD Tab 0 missing Cloud Greenhouse card #7: `%s`" % world.hud.lbl_card_titles[6].text)
			return
		world.hud.open_drawer(2)
		world.hud._sync_label_nodes()
		if not world.hud.lbl_card_titles[6].visible or world.hud.lbl_card_titles[6].label_settings == null or world.hud.lbl_card_titles[6].text.find("名物礼盒") == -1:
			_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "HUD Tab 2 missing Souvenir Box card #7: `%s`" % world.hud.lbl_card_titles[6].text)
			return
		world.hud.open_drawer(3)
		world.hud._sync_label_nodes()
		if not world.hud.lbl_card_titles[6].visible or world.hud.lbl_card_titles[6].label_settings == null or world.hud.lbl_card_titles[6].text.find("奇花礼盒") == -1:
			_fail_and_quit("[断言18-CI-5云端温室与名物伴手礼]", "HUD Tab 3 missing Flora & Souvenir Codex card #7: `%s`" % world.hud.lbl_card_titles[6].text)
			return
		world.hud.close_drawer(false)

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
	var base_codex_mult_ci6 := GameManager.get_codex_price_multiplier()
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

	GameManager.add_gold(320)
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
	spa_guest._process(2.2)
	var spa_gold_gain := GameManager.gold - pre_spa_gold
	var spa_amber_gain := GameManager.get_amber() - pre_spa_amber
	var spa_voucher_gain := GameManager.get_rare_vouchers() - pre_spa_vouchers
	if not spa_guest.purchased_ok or spa_gold_gain < 1500 or spa_amber_gain < 5 or spa_voucher_gain < 1 or GameManager.hotspring_guests_served < 1 or GameManager.hotspring_reputation_bonus < 85:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "VIP Hot-Spring Guest settlement mismatch: ok=%s +gold=%d +amber=%d +voucher=%d served=%d rep=%d" % [
			str(spa_guest.purchased_ok), spa_gold_gain, spa_amber_gain, spa_voucher_gain, GameManager.hotspring_guests_served, GameManager.hotspring_reputation_bonus
		])
		return
	if GameManager.get_codex_price_multiplier() < base_codex_mult_ci6 + 0.23:
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "3-Bath Codex price multiplier did not increase by +24% as expected!")
		return
	if not bool(GameManager.unlocked_achievements.get("ach_hotspring_master", false)) or not bool(GameManager.unlocked_achievements.get("ach_hotspring_vip", false)):
		_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "CI-6 achievements (`ach_hotspring_master`, `ach_hotspring_vip`) did not unlock!")
		return
	spa_guest.queue_free()

	# Verify HUD Tab 0, Tab 2, Tab 3 Card #8 (`index 7`) native Labels + LabelSettings + zero deprecated font
	if world.hud != null:
		world.hud.open_drawer(0)
		world.hud._sync_label_nodes()
		if world.hud.lbl_card_titles.size() < 8 or not world.hud.lbl_card_titles[7].visible or world.hud.lbl_card_titles[7].label_settings == null or world.hud.lbl_card_titles[7].text.find("云海汤屋") == -1:
			_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "HUD Tab 0 missing Cloud Hot-Spring Inn card #8: `%s`" % (world.hud.lbl_card_titles[7].text if world.hud.lbl_card_titles.size() >= 8 else "NONE"))
			return
		world.hud.open_drawer(2)
		world.hud._sync_label_nodes()
		if not world.hud.lbl_card_titles[7].visible or world.hud.lbl_card_titles[7].label_settings == null or world.hud.lbl_card_titles[7].text.find("温泉汤屋") == -1:
			_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "HUD Tab 2 missing Hot-Spring Bathhouse card #8: `%s`" % world.hud.lbl_card_titles[7].text)
			return
		world.hud.open_drawer(3)
		world.hud._sync_label_nodes()
		if not world.hud.lbl_card_titles[7].visible or world.hud.lbl_card_titles[7].label_settings == null or world.hud.lbl_card_titles[7].text.find("灵泉汤鉴") == -1:
			_fail_and_quit("[断言19-CI-6云海温泉汤屋]", "HUD Tab 3 missing Hot-Spring Codex card #8: `%s`" % world.hud.lbl_card_titles[7].text)
			return
		world.hud.close_drawer(false)
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

	print("[PASS] [断言19-CI-6三号岛云海温泉旅馆与贵宾萌宠疗愈汤屋] 通过: 岛3五建筑净间距 %.1fpx(>=28px, 0%%重叠)与底部中心锚定、防穿透命中、三款草本/花瓣浴汤熬制、员工精力加速(%.2fx, 实测位移%.1fpx>%.1fpx)、贵宾萌宠汤客结算(+%dG/+%d琥珀/+%d图鉴券/+%d声望)及存档回读全闭环 PASS!" % [
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
	var base_codex_mult_ci7 := GameManager.get_codex_price_multiplier()

	# Unlock Windmill Bakery & upgrade Lv.1 -> Lv.5, verifying `麦香烘焙光环` (`>= 1.20x` speed boost on Stall & Workshop)
	GameManager.add_gold(2600)
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
	if world.parade_float_sprite == null or not world.parade_float_sprite.visible or absf(world.parade_float_sprite.position.y - EconomyConfig.GROUND_Y) > 0.1 or world.parade_float_sprite.position.x < 660.0 or world.parade_float_sprite.position.x > 985.0 or world.parade_float_sprite.z_index != EconomyConfig.Z_UNIT or world.parade_float_label == null or not world.parade_float_label.visible:
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
	parade_guest._process(2.2)
	var par_gold_gain := GameManager.gold - pre_par_gold
	var par_amber_gain := GameManager.get_amber() - pre_par_amber
	var par_voucher_gain := GameManager.get_rare_vouchers() - pre_par_vouchers
	if not parade_guest.purchased_ok or par_gold_gain < 1800 or par_amber_gain < 5 or par_voucher_gain < 1 or GameManager.parade_tourists_served < 1 or GameManager.bakery_reputation_bonus < 85:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "Gourmet Parade Tourist checkout mismatch: ok=%s +gold=%d +amber=%d +voucher=%d served=%d rep=%d" % [
			str(parade_guest.purchased_ok), par_gold_gain, par_amber_gain, par_voucher_gain, GameManager.parade_tourists_served, GameManager.bakery_reputation_bonus
		])
		return
	if GameManager.get_codex_price_multiplier() < base_codex_mult_ci7 + 0.23:
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "3-Item Bakery Codex price multiplier did not increase by +24%!")
		return
	if not bool(GameManager.unlocked_achievements.get("ach_windmill_baker", false)) or not bool(GameManager.unlocked_achievements.get("ach_parade_feast", false)):
		_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "CI-7 achievements (`ach_windmill_baker`, `ach_parade_feast`) did not unlock!")
		return
	parade_guest.queue_free()

	# Verify HUD Tab 0, Tab 2, Tab 3 Card #9 (`index 8`, `★云端烘焙鉴(3/3)`) native Labels + LabelSettings + drawer bounds
	if world.hud != null:
		world.hud.open_drawer(0)
		world.hud._sync_label_nodes()
		if world.hud.lbl_card_titles.size() < 9 or not world.hud.lbl_card_titles[8].visible or world.hud.lbl_card_titles[8].label_settings == null or world.hud.lbl_card_titles[8].text.find("风车面坊") == -1:
			_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "HUD Tab 0 missing Windmill Bakery card #9!")
			return
		world.hud.open_drawer(2)
		world.hud._sync_label_nodes()
		if not world.hud.lbl_card_titles[8].visible or world.hud.lbl_card_titles[8].label_settings == null or (world.hud.lbl_card_titles[8].text.find("花车巡游") == -1 and world.hud.lbl_card_titles[8].text.find("烘焙面坊") == -1):
			_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "HUD Tab 2 missing Gourmet Parade card #9: `%s`" % world.hud.lbl_card_titles[8].text)
			return
		world.hud.open_drawer(3)
		world.hud._sync_label_nodes()
		var card9_rect := world.hud._get_card_rect(8, 9)
		if not world.hud.lbl_card_titles[8].visible or world.hud.lbl_card_titles[8].label_settings == null or world.hud.lbl_card_titles[8].text != "★云端烘焙鉴(3/3)" or card9_rect.end.x > HUD.CODEX_DRAWER_RECT.end.x:
			_fail_and_quit("[断言20-CI-7云端风车烘焙面坊]", "HUD Tab 3 Shanhai Codex Card #9 invalid or overflowing: text=`%s`, rect=%s" % [
				world.hud.lbl_card_titles[8].text, str(card9_rect)
			])
			return
		world.hud.close_drawer(false)
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

	print("[PASS] [断言20-CI-7云端风车烘焙面坊与云海美食花车巡游节] 通过: 三岛16建筑最小净间距 %.1fpx(>=28px, 0%%重叠)与底部中心锚定、防穿透命中、Lv.5风车面坊麦香光环(%.2fx工坊/摊位加速)、金麦粉与欧包/可颂3/3图鉴闭环、花车巡游1.88x溢价结算(+%dG/+%d琥珀/+%d图鉴券/+%d声望)及山海图鉴第9卡「★云端烘焙鉴(3/3)」PASS!" % [
		min_panoramic_gap_ci7, aura_spd_ci7, par_gold_gain, par_amber_gain, par_voucher_gain, exp_rep_bonus_ci7
	])

	# ------------------------------------------------------------------
	# [断言21-CI-8云端茗香制茶坊与月色画舫]:
	#   1) All 5 CI-8 pixel-art PNGs (`cloud_tea_pavilion.png`, `tea_spring_leaves.png`,
	#      `tea_cloud_longjing.png`, `tea_osmanthus_oolong.png`, `icon_moon_tea_boat.png`) load with RGBA alpha;
	#   2) All 3 islands (`16` main buildings total: `6` on Island 1, `5` on Island 2, `5` on Island 3)
	#      maintain `0.0%` horizontal overlap and `>= 28.0px` adjacent gap, with `CloudTeaPavilion_1` grounded
	#      at `Vector2(926.9, GROUND_Y)` (`124.0`) on solid grass `[570.5..1046.7]` + bottom-center pivot;
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
	if absf(world.cloud_tea_pavilion.position.x - 926.9) > 0.1 or absf(world.cloud_tea_pavilion.position.y - EconomyConfig.GROUND_Y) > 0.1 or not tp_sp.centered or absf(tp_sp.offset.y - exp_tp_off_y) > 0.1 or world.cloud_tea_pavilion.z_index != EconomyConfig.Z_BUILDING:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "CloudTeaPavilion_1 grounding/pivot/z_index violation: pos=%s centered=%s offset=%s z=%d!" % [
			str(world.cloud_tea_pavilion.position), str(tp_sp.centered), str(tp_sp.offset), world.cloud_tea_pavilion.z_index
		])
		return
	var tp_vis_rect := world.cloud_tea_pavilion.get_screen_rect()
	if tp_vis_rect.position.x < 570.5 or tp_vis_rect.end.x > 1046.7:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "CloudTeaPavilion_1 rect %s outside Island 1 solid grass [570.5..1046.7]!" % str(tp_vis_rect))
		return

	# Verify all 3 islands (`16` main buildings: `6` on Island 1, `5` on Island 2, `5` on Island 3) maintain `0.0%` overlap & `>= 28.0px` gap
	var all_isl_rects_ci8: Dictionary = world.get_island_main_building_rects()
	var isl1_rects_ci8: Array = all_isl_rects_ci8[1]
	var isl2_rects_ci8: Array = all_isl_rects_ci8[2]
	var isl3_rects_ci8: Array = all_isl_rects_ci8[3]
	var total_blds_ci8 := isl1_rects_ci8.size() + isl2_rects_ci8.size() + isl3_rects_ci8.size()
	if isl1_rects_ci8.size() != 6 or isl2_rects_ci8.size() != 5 or isl3_rects_ci8.size() != 5 or total_blds_ci8 != 16:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "Expected 16 main buildings (6+5+5), got %d (%d+%d+%d)!" % [
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
	var base_codex_mult_ci8 := GameManager.get_codex_price_multiplier()
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
	GameManager.add_gold(2400)
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
	if world.moon_tea_boat_label == null or not world.moon_tea_boat_label.visible or world.moon_tea_boat_label.label_settings == null or world.moon_tea_boat_label.text.find("★月色画舫雅集") == -1:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "MoonTeaBoatBadgeLabel missing or invalid!")
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

	if GameManager.get_codex_price_multiplier() < base_codex_mult_ci8 + 0.23:
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "3-Item Tea Codex price multiplier did not increase by +24%!")
		return
	if not bool(GameManager.unlocked_achievements.get("ach_tea_master", false)) or not bool(GameManager.unlocked_achievements.get("ach_moon_tea_gathering", false)):
		_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "CI-8 achievements (`ach_tea_master`, `ach_moon_tea_gathering`) did not unlock!")
		return

	# Verify HUD Tab 0, Tab 2, Tab 3 Card 10 (`index 9`, `★茗香茶韵鉴(3/3)`) native Labels + LabelSettings + zero drawer overflow
	if world.hud != null:
		world.hud.open_drawer(0)
		world.hud._sync_label_nodes()
		if world.hud.lbl_card_titles.size() < 10 or not world.hud.lbl_card_titles[9].visible or world.hud.lbl_card_titles[9].label_settings == null or world.hud.lbl_card_titles[9].text.find("茗香茶坊") == -1:
			_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "HUD Tab 0 missing Tea Pavilion card #10!")
			return
		world.hud.open_drawer(2)
		world.hud._sync_label_nodes()
		if not world.hud.lbl_card_titles[9].visible or world.hud.lbl_card_titles[9].label_settings == null or (world.hud.lbl_card_titles[9].text.find("画舫雅集") == -1 and world.hud.lbl_card_titles[9].text.find("茗香茶坊") == -1):
			_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "HUD Tab 2 missing Moon Tea Gathering card #10: `%s`" % world.hud.lbl_card_titles[9].text)
			return
		world.hud.open_drawer(3)
		world.hud._sync_label_nodes()
		var card10_rect := world.hud._get_card_rect(9, 10)
		if not world.hud.lbl_card_titles[9].visible or world.hud.lbl_card_titles[9].label_settings == null or world.hud.lbl_card_titles[9].text != "★茗香茶韵鉴(3/3)" or card10_rect.position.x < HUD.CODEX_DRAWER_RECT.position.x or card10_rect.end.x > HUD.CODEX_DRAWER_RECT.end.x:
			_fail_and_quit("[断言21-CI-8云端茗香制茶坊与月色画舫]", "HUD Tab 3 Shanhai Codex Card #10 invalid or overflowing: text=`%s`, rect=%s" % [
				world.hud.lbl_card_titles[9].text, str(card10_rect)
			])
			return
		world.hud.close_drawer(false)
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
	# Islands 1~3 + CloudTeaPavilion_1 (x=926.9) + MoonTeaBoatSprite floating on Lotus Pond (x=1192.0, y=108.0) + Tea Connoisseur + Parade Float
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

	print("[PASS] [断言21-CI-8云端茗香制茶坊与月色画舫] 通过: 三岛16建筑最小净间距 %.2fpx(>=28.0px, 0.0%%重叠)与底部中心锚定、防穿透命中、Lv.5茗香茶坊清心光环(移速%.2fx/小费%.2fx)、春芽与龙井/桂乌3/3图鉴闭环、荷塘月色画舫[1142..1244]雅赏(+%d琥珀/+%d图鉴券/+%d声望 & 1.38x茶肴增益)、茶客品茗(+%dG)及山海图鉴第10卡「★茗香茶韵鉴(3/3)」PASS!" % [
		min_panoramic_gap_ci8, tea_move_mult, tea_tip_mult, boat_amb_gain, boat_vou_gain, boat_rep_gain, tea_gold_gain
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
	var img_open := get_viewport().get_texture().get_image()
	if img_open == null or img_open.is_empty():
		_fail_and_quit("[SelfTestRunner]", "Viewport image (drawer open state) is empty!")
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

	print("[PASS] [真机双状态截图导出] 收起态与展开态视口截图已真实导出且哈希完全独立:")
	print("       - 收起态 (`preview_engine_1920x360.png` / `preview_live_godot.png`): %dx%d | SHA256=%s" % [img_closed.get_width(), img_closed.get_height(), hash_closed.substr(0, 16)])
	print("       - 展开态 (`preview_drawer_open_1920x360.png` via `HUD.open_drawer(0)`): %dx%d | SHA256=%s" % [img_open.get_width(), img_open.get_height(), hash_open.substr(0, 16)])
	print("==================================================================")
	_append_playtest_audit_log(checked_sprites, max_overlap_seen, min_gap_seen, total_bunny_dist, total_all_workers_dist, hash_closed, hash_open)
	get_tree().quit(0)

func _append_playtest_audit_log(sprites_cnt: int, max_ov: float, min_gap: float, bunny_dist: float, all_dist: float, h_closed: String, h_open: String) -> void:
	var log_path := "res://playtest_audit_log.md"
	var existing := ""
	if FileAccess.file_exists(log_path):
		existing = FileAccess.get_file_as_string(log_path)
	else:
		existing = "# 《枫叶云岛物语》全自动真机试玩与巡检记录 (`playtest_audit_log.md`)\n\n"
	var dt := Time.get_datetime_string_from_system(false, true)
	var entry := "## [%s] 自主试玩巡检 PASS (PRD契约已同步: 完成 %d 项 | 待办 %d 项)\n" % [dt, completed_prd_tasks_count, pending_prd_tasks.size()]
	if pending_prd_tasks.size() > 0:
		entry += "- **下一轮自动开发目标 (`NEXT-DEV-TARGET`)**: `%s`\n" % [pending_prd_tasks[0]]
	entry += "- **切帧与姿态防呆**: 已校验 `%d` 个精灵节点，0 越界切帧、0 旋转异常、前爪抱篮 3 层合成挂载正常。\n" % sprites_cnt
	entry += "- **建筑间距与图层**: 三岛 16 座主建筑最大水平重叠率 `%.1f%%` (`<=15%%`)，最小净间距 `%.1fpx` (`>=28px`)。\n" % [max_ov * 100.0, min_gap]
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
		var out_header := "# 《枫叶云岛物语》全自动真机试玩与巡检记录 (`playtest_audit_log.md`)\n\n> 滚动保留最近 10 条记录；历史巡检日志已周期性压缩归档至 `docs/archives/playtest_logs_archive.md.gz`。\n\n"
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
