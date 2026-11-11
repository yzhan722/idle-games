extends Node2D
class_name FloatingText
## Native Label Floating Text & Parabolic Gold Coin Effect (`src/ui/FloatingText.gd`)
## Strictly enforces GEMINI.md Law 2.3 (`z_index = 50`) & Law 5 (`EconomyConfig.create_pixel_label`).

const MAX_POOL_SIZE := 24

var active_labels: Array[Dictionary] = []
var _label_pool: Array[Label] = []
var coin_arcs: Array[Dictionary] = []
var tex_icons: Texture2D

func _ready() -> void:
	z_index = EconomyConfig.Z_FLOATING_UI
	z_as_relative = false
	tex_icons = load("res://assets/pixel_art/ui/icons_ui.png")
	EventBus.spawn_floating_text.connect(_on_spawn_floating_text)
	EventBus.customer_paid.connect(_on_customer_paid)

func _acquire_pooled_label(text_str: String, final_col: Color, font_size: int = 14) -> Label:
	var lbl: Label = null
	while _label_pool.size() > 0 and lbl == null:
		var cand: Label = _label_pool.pop_back()
		if is_instance_valid(cand):
			lbl = cand
	if lbl == null:
		lbl = EconomyConfig.create_pixel_label(text_str, font_size, final_col, true)
		lbl.custom_minimum_size = Vector2(128.0, 24.0)
		lbl.z_index = EconomyConfig.Z_FLOATING_UI
		lbl.z_as_relative = false
		add_child(lbl)
	else:
		lbl.text = text_str
		lbl.label_settings = EconomyConfig.make_pixel_label_settings(font_size, final_col)
		lbl.visible = true
	lbl.modulate.a = 1.0
	return lbl

func _release_pooled_label(lbl: Label) -> void:
	if not is_instance_valid(lbl):
		return
	if _label_pool.size() < MAX_POOL_SIZE:
		lbl.visible = false
		_label_pool.append(lbl)
	else:
		lbl.queue_free()

func clear_all() -> void:
	for item in active_labels:
		var lbl: Label = item.get("node", null)
		if is_instance_valid(lbl):
			_release_pooled_label(lbl)
	active_labels.clear()
	coin_arcs.clear()
	queue_redraw()

func _on_spawn_floating_text(world_pos: Vector2, text_str: String, col: Color, font_size: int = 14, rise_speed: float = 16.0) -> void:
	var is_gold := text_str.begins_with("+") and text_str.ends_with("G")
	var final_col := col if is_gold else col
	if is_gold and col == Color.WHITE:
		final_col = Color("#FFE066")
	var lbl := _acquire_pooled_label(text_str, final_col, font_size)
	lbl.position = world_pos + Vector2(-64.0, 0.0)
	active_labels.append({
		"node": lbl,
		"ttl": 1.85,
		"vy": rise_speed
	})

func _on_customer_paid(_recipe_id: String, _qty: int, total_gold: int, world_pos: Vector2) -> void:
	var is_jackpot := total_gold >= 60
	var is_medium := total_gold >= 25
	var fsize := 17 if is_jackpot else (15 if is_medium else 14)
	var gcol := Color("#FFF3BF") if is_jackpot else (Color("#FFD43B") if is_medium else Color("#FFE066"))
	var rise := 24.0 if is_jackpot else (19.0 if is_medium else 16.0)
	var prefix := "★ +" if is_jackpot else "+"
	_on_spawn_floating_text(world_pos + Vector2(0.0, -58.0), prefix + str(total_gold) + "G", gcol, fsize, rise)
	var burst_cnt := 7 if is_jackpot else (5 if is_medium else 3)
	var spread := 44.0 if is_jackpot else 34.0
	for i in range(burst_cnt):
		coin_arcs.append({
			"x": world_pos.x,
			"y": world_pos.y - 24.0,
			"vx": randf_range(-spread, spread),
			"vy": randf_range(-92.0 if is_jackpot else -78.0, -48.0),
			"ttl": 1.02 if is_jackpot else 0.95
		})

func _process(delta: float) -> void:
	for i in range(active_labels.size() - 1, -1, -1):
		var item: Dictionary = active_labels[i]
		var lbl: Label = item["node"]
		var ttl := float(item["ttl"]) - delta
		item["ttl"] = ttl
		if is_instance_valid(lbl):
			var vy := float(item.get("vy", 16.0))
			lbl.position.y -= vy * delta
			item["vy"] = maxf(12.0, vy - 10.0 * delta)
			lbl.modulate.a = clampf(ttl / 0.6, 0.0, 1.0)
			if ttl <= 0.0:
				_release_pooled_label(lbl)
				active_labels.remove_at(i)
		else:
			active_labels.remove_at(i)

	var coins_dirty := false
	for i in range(coin_arcs.size() - 1, -1, -1):
		coin_arcs[i]["vy"] = float(coin_arcs[i]["vy"]) + 135.0 * delta
		coin_arcs[i]["x"] = float(coin_arcs[i]["x"]) + float(coin_arcs[i]["vx"]) * delta
		coin_arcs[i]["y"] = float(coin_arcs[i]["y"]) + float(coin_arcs[i]["vy"]) * delta
		coin_arcs[i]["ttl"] = float(coin_arcs[i]["ttl"]) - delta
		coins_dirty = true
		if float(coin_arcs[i]["ttl"]) <= 0.0:
			coin_arcs.remove_at(i)

	if coins_dirty:
		queue_redraw()

func _draw() -> void:
	if tex_icons != null:
		for c in coin_arcs:
			draw_texture_rect_region(tex_icons, Rect2(float(c["x"]) - 11.0, float(c["y"]) - 11.0, 22.0, 22.0), Rect2(0, 0, 48, 48))
