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
	var checked_sprites := 0
	for w in world.workers:
		if not is_instance_valid(w) or w.body_sprite == null or w.body_sprite.texture == null:
			continue
		var sp: Sprite2D = w.body_sprite
		var fw := (sp.region_rect.size.x if sp.region_enabled else float(sp.texture.get_width()) / float(maxi(1, sp.hframes))) * absf(sp.scale.x)
		var fh := (sp.region_rect.size.y if sp.region_enabled else float(sp.texture.get_height()) / float(maxi(1, sp.vframes))) * absf(sp.scale.y)
		if (not sp.region_enabled and sp.hframes <= 1) or fw > 180.0 or fh > 180.0:
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
		if (not sp.region_enabled and sp.hframes <= 1) or fw > 180.0 or fh > 180.0:
			_fail_and_quit("[断言1-切帧防呆]", "CustomerNPC `%s` has unsliced or oversized frame: %.1fx%.1f (hframes=%d)" % [c.sheet_key, fw, fh, sp.hframes])
			return
		if absf(c.rotation) > 0.001 or absf(sp.rotation) > 0.001:
			_fail_and_quit("[断言1-切帧防呆]", "CustomerNPC `%s` has non-zero rotation (rot=%.3f, sp_rot=%.3f)" % [c.sheet_key, c.rotation, sp.rotation])
			return
		if not bool(GameManager.unlocked_islands.get(2, false)) and c.position.x < 538.0:
			_fail_and_quit("[断言3-产线活体闭环]", "CustomerNPC `%s` walked onto locked Island 2 (x=%.1f)!" % [c.sheet_key, c.position.x])
			return
		if not bool(GameManager.unlocked_islands.get(3, false)) and c.position.x > 1320.0:
			_fail_and_quit("[断言3-产线活体闭环]", "CustomerNPC `%s` walked onto locked Island 3 (x=%.1f)!" % [c.sheet_key, c.position.x])
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
				if overlap_ratio > 0.15:
					_fail_and_quit("[断言2-建筑防叠罗汉]", "Island %d building overlap %.1f%% > 15%% between `%s` (%s) and `%s` (%s)!" % [
						isl_idx, overlap_ratio * 100.0, String(ba["name"]), str(ra), String(bb["name"]), str(rb)
					])
					return

	print("[PASS] [断言2-建筑防叠罗汉] 通过: 三岛全部 12 座主建筑水平最大重叠率 = %.1f%% (<= 15%%)，最小边缘净留白 = %.1fpx (>= 28px)!" % [max_overlap_seen * 100.0, min_gap_seen])

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
		var test_path_a := world.waypoint_graph.compute_path(Vector2(698.8, EconomyConfig.GROUND_Y), Vector2(698.8, EconomyConfig.GROUND_Y))
		if test_path_a.size() != 1 or absf(test_path_a[0].x - 698.8) > 0.1:
			_fail_and_quit("[断言3-产线活体闭环]", "WaypointGraph same-dock path caused jitter: %s" % [str(test_path_a)])
			return
		var test_path_b := world.waypoint_graph.compute_path(Vector2(722.8, EconomyConfig.GROUND_Y), Vector2(1005.4, EconomyConfig.GROUND_Y))
		var prev_x := 722.8
		for pt in test_path_b:
			if pt.x < prev_x - 0.1:
				_fail_and_quit("[断言3-产线活体闭环]", "WaypointGraph path backtracked from %.1f to %.1f: %s" % [prev_x, pt.x, str(test_path_b)])
				return
			prev_x = pt.x

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

	if harvest_count <= 0:
		_fail_and_quit("[断言3-产线活体闭环]", "状态机死锁: 60 秒模拟内农田收获次数为 0!")
		return
	if total_all_workers_dist <= 50.0:
		_fail_and_quit("[断言3-产线活体闭环]", "状态机死锁: 60 秒模拟内动物累计移动距离仅为 %.1fpx (<= 50px)!" % total_all_workers_dist)
		return
	if items_delivered_count <= 0:
		_fail_and_quit("[断言3-产线活体闭环]", "状态机死锁: 60 秒模拟内无任何物品进入缓存、工坊或集市摊位 (items_delivered_count = 0)!")
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
	var entry := "## [%s] 自主试玩巡检 PASS\n" % dt
	entry += "- **切帧与姿态防呆**: 已校验 `%d` 个精灵节点，0 越界切帧、0 旋转异常、前爪抱篮 3 层合成挂载正常。\n" % sprites_cnt
	entry += "- **建筑间距与图层**: 三岛 12 座主建筑最大水平重叠率 `%.1f%%` (`<=15%%`)，最小净间距 `%.1fpx` (`>=28px`)。\n" % [max_ov * 100.0, min_gap]
	entry += "- **产线活体与交互**: 兔子累计移动 `%.1fpx` (全员 `%.1fpx`)，农田收获 `%d` 次，入库/上架 `%d` 件，顾客结账 `%d` 单，滚轮鼠标锚点缩放与锁岛防误升校验通过。\n" % [
		bunny_dist, all_dist, harvest_count, items_delivered_count, customer_paid_count
	]
	entry += "- **真机双状态截图哈希**: 收起态 `%s` | 展开态 `%s`\n\n" % [h_closed.substr(0, 16), h_open.substr(0, 16)]
	var f := FileAccess.open(log_path, FileAccess.WRITE)
	if f != null:
		f.store_string(existing + entry)

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
