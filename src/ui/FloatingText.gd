extends Node2D
class_name FloatingText
## Parabolic Gold Coin & Floating Text Effect (`src/ui/FloatingText.gd`) — PRD v2.0 Section 6

var entries: Array[Dictionary] = []
var coin_arcs: Array[Dictionary] = []
var tex_icons: Texture2D

func _ready() -> void:
	tex_icons = load("res://assets/pixel_art/ui/icons_ui.png")
	EventBus.spawn_floating_text.connect(_on_spawn_floating_text)
	EventBus.customer_paid.connect(_on_customer_paid)

func _on_spawn_floating_text(world_pos: Vector2, text_str: String, col: Color) -> void:
	entries.append({
		"x": world_pos.x,
		"y": world_pos.y,
		"txt": text_str,
		"col": col,
		"is_gold": text_str.begins_with("+") and text_str.ends_with("G"),
		"ttl": 2.0
	})

func _on_customer_paid(_recipe_id: String, _qty: int, total_gold: int, world_pos: Vector2) -> void:
	_on_spawn_floating_text(world_pos + Vector2(-18, -58), "+" + str(total_gold) + "G", Color(1.0, 0.92, 0.32))
	for i in range(3):
		coin_arcs.append({
			"x": world_pos.x,
			"y": world_pos.y - 24.0,
			"vx": randf_range(-32.0, 32.0),
			"vy": randf_range(-78.0, -48.0),
			"ttl": 0.95
		})

func _process(delta: float) -> void:
	var dirty := false
	for i in range(entries.size() - 1, -1, -1):
		entries[i]["y"] = float(entries[i]["y"]) - 14.0 * delta
		entries[i]["ttl"] = float(entries[i]["ttl"]) - delta
		dirty = true
		if float(entries[i]["ttl"]) <= 0.0:
			entries.remove_at(i)

	for i in range(coin_arcs.size() - 1, -1, -1):
		coin_arcs[i]["vy"] = float(coin_arcs[i]["vy"]) + 135.0 * delta
		coin_arcs[i]["x"] = float(coin_arcs[i]["x"]) + float(coin_arcs[i]["vx"]) * delta
		coin_arcs[i]["y"] = float(coin_arcs[i]["y"]) + float(coin_arcs[i]["vy"]) * delta
		coin_arcs[i]["ttl"] = float(coin_arcs[i]["ttl"]) - delta
		dirty = true
		if float(coin_arcs[i]["ttl"]) <= 0.0:
			coin_arcs.remove_at(i)

	if dirty:
		queue_redraw()

func _draw() -> void:
	if tex_icons != null:
		for c in coin_arcs:
			draw_texture_rect_region(tex_icons, Rect2(float(c["x"]) - 11, float(c["y"]) - 11, 22, 22), Rect2(0, 0, 48, 48))

	for e in entries:
		var pos := Vector2(float(e["x"]), float(e["y"]))
		if bool(e["is_gold"]):
			PixelFontRenderer.draw_pixel_string(self, pos, String(e["txt"]), Color.WHITE, true, 0.82)
		else:
			PixelFontRenderer.draw_pixel_cn(self, pos, String(e["txt"]), 13, e["col"], Color(0.14, 0.06, 0.02, 0.96), true)
