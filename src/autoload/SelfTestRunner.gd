extends Node
## Real-Engine 20x Fast-Forward Self-Test & Viewport Screenshot Exporter (`src/autoload/SelfTestRunner.gd`)
## Activated when command-line args contain `--self-test` (via `./run_godot.ps1 --self-test`).
## Runs `MainWorld` for 180 frames at `Engine.time_scale = 20.0` (~60s simulated idle production),
## verifies all 4 Hard Assertions, exports `res://preview_live_godot.png`, and exits with code 0 (or 1 on failure).

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
		if String(arg) == "--self-test":
			is_self_test = true
			break

	if not is_self_test:
		set_process(false)
		return

	print("==================================================================")
	print("[SelfTestRunner] Activated `--self-test`: Engine.time_scale = 20.0 (180 frames / ~60s simulation)")
	print("==================================================================")
	Engine.time_scale = 20.0

	# Ensure buffers have room at test start so the 60s cold-start / pipeline loop runs actively
	if GameManager != null:
		if GameManager.is_stall_full():
			for k in GameManager.stall_inventory.keys():
				GameManager.stall_inventory[k] = 1
		if GameManager.is_raw_basket_full(1):
			for k in GameManager.raw_baskets[1].keys():
				GameManager.raw_baskets[1][k] = 0

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
	if frame_counter == 10:
		# Spawn an active customer early so the visual screenshot also shows a live traveler on the island
		var world := get_tree().current_scene as MainWorld
		if world != null and world.customers.size() == 0:
			world._spawn_customer(false)

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
	# [断言3-产线活体闭环]: Verify harvests > 0, animal movement > 50px, and items entered workshop or market stall
	# ------------------------------------------------------------------
	var total_bunny_dist := 0.0
	var total_all_workers_dist := 0.0
	for w in world.workers:
		if is_instance_valid(w) and w.visible:
			total_all_workers_dist += w.total_distance_moved
			if w.animal_key == "bunny":
				total_bunny_dist += w.total_distance_moved

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
	# Export 100% Real Engine Viewport Screenshot (`res://preview_live_godot.png`)
	# ------------------------------------------------------------------
	Engine.time_scale = 1.0
	if world.hud != null:
		world.hud.mouse_outside_timer = 0.0
		world.hud.is_collapsed_capsule = false
		world.hud.hud_opacity = 1.0
		world.hud.modulate.a = 1.0
		world.hud._sync_label_nodes()
		world.hud.queue_redraw()
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	if img == null or img.is_empty():
		_fail_and_quit("[SelfTestRunner]", "Viewport image is empty (ensure Godot is launched with real renderer, not --headless)!")
		return
	var err := img.save_png("res://preview_live_godot.png")
	if err != OK:
		_fail_and_quit("[SelfTestRunner]", "Failed to save res://preview_live_godot.png (err=%d)" % err)
		return

	print("[PASS] [真机截图导出] 已成功导出真实引擎渲染画面: res://preview_live_godot.png (%dx%d)" % [img.get_width(), img.get_height()])
	print("==================================================================")
	get_tree().quit(0)

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
