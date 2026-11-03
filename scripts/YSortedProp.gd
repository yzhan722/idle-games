extends Node2D
class_name YSortedProp
## Generic Y-Sorted Node2D for:
## - STATIC_SPRITE (Windmill Farmhouse, Hollow-Tree Alchemy Hut, Coconut Tiki Bar, Apple Tree, Signpost, Scarecrow)
## - MARKET_STALL (Cloud Isle Market Stall with live Visual Shelf Stacking of stocked delicacies & crops!)
## - FARM_PLOT (True 1.5D Oblique Diorama Recessed Garden Bed + 4-stage crop nestled into soil furrows)
## - WORKSHOP_STATION (Osmanthus Rice Cake Mortar & Forest Alchemy Cauldron with animated steam/magic bubbles)
## - STREETLAMP (Vintage Warm Streetlamp that lights up automatically at Sunset & Starlight Night)

enum Kind { STATIC_SPRITE, MARKET_STALL, FARM_PLOT, WORKSHOP_STATION, STREETLAMP }

var kind: Kind = Kind.STATIC_SPRITE
var tex: Texture2D
var offset_pos: Vector2 = Vector2.ZERO
var prop_title: String = ""

# For FARM_PLOT & MARKET_STALL
var soil_tex: Texture2D
var crops_tex: Texture2D
var plot_index: int = -1
var world_ref: Node2D

# For WORKSHOP_STATION & MARKET_STALL
var delicacies_tex: Texture2D
var delicacy_icon_idx: int = 0
var anim_phase: float = 0.0

func setup_static(p_tex: Texture2D, p_foot_pos: Vector2, p_draw_offset: Vector2, p_title: String = "") -> void:
	kind = Kind.STATIC_SPRITE
	tex = p_tex
	position = p_foot_pos
	offset_pos = p_draw_offset
	prop_title = p_title

func setup_market_stall(p_tex: Texture2D, p_crops: Texture2D, p_delicacies: Texture2D, p_foot_pos: Vector2, p_draw_offset: Vector2, p_world: Node2D) -> void:
	kind = Kind.MARKET_STALL
	tex = p_tex
	crops_tex = p_crops
	delicacies_tex = p_delicacies
	position = p_foot_pos
	offset_pos = p_draw_offset
	world_ref = p_world
	prop_title = "云端森林集市摊位 (可视化货架)"

func setup_plot(p_idx: int, p_pos: Vector2, p_soil: Texture2D, p_crops: Texture2D, p_world: Node2D) -> void:
	kind = Kind.FARM_PLOT
	plot_index = p_idx
	position = p_pos
	soil_tex = p_soil
	crops_tex = p_crops
	world_ref = p_world

func setup_workshop(p_tex: Texture2D, p_delicacies: Texture2D, p_icon_idx: int, p_foot_pos: Vector2, p_draw_offset: Vector2, p_world: Node2D, p_title: String) -> void:
	kind = Kind.WORKSHOP_STATION
	tex = p_tex
	delicacies_tex = p_delicacies
	delicacy_icon_idx = p_icon_idx
	position = p_foot_pos
	offset_pos = p_draw_offset
	world_ref = p_world
	prop_title = p_title
	anim_phase = randf() * 6.28

func setup_streetlamp(p_tex: Texture2D, p_foot_pos: Vector2, p_draw_offset: Vector2, p_world: Node2D) -> void:
	kind = Kind.STREETLAMP
	tex = p_tex
	position = p_foot_pos
	offset_pos = p_draw_offset
	world_ref = p_world
	prop_title = "晨风暖光玻璃路灯"

func _process(delta: float) -> void:
	if kind in [Kind.WORKSHOP_STATION, Kind.STREETLAMP, Kind.MARKET_STALL]:
		anim_phase += delta * 2.4
		queue_redraw()

func _draw() -> void:
	match kind:
		Kind.STATIC_SPRITE:
			if tex != null:
				draw_texture(tex, offset_pos)

		Kind.MARKET_STALL:
			if tex != null:
				draw_texture(tex, offset_pos)
			if world_ref != null and world_ref.game_manager != null:
				var gm: GameManager = world_ref.game_manager
				var slot_idx := 0
				if delicacies_tex != null:
					for r_id in range(4):
						var cnt: int = int(gm.recipe_stocks[r_id])
						for _k in range(cnt):
							if slot_idx >= 7:
								break
							var sx := offset_pos.x + 20.0 + float(slot_idx) * 12.5
							var sy := offset_pos.y + 56.0 - float(slot_idx % 2) * 3.0
							draw_texture_rect_region(delicacies_tex, Rect2(sx, sy, 18, 18), Rect2(r_id * 36, 0, 36, 36))
							slot_idx += 1
				if crops_tex != null:
					var raw_cnt := mini(6, gm.market_stock + gm.apple_stock)
					for c_i in range(raw_cnt):
						var cx := offset_pos.x + 24.0 + float(c_i) * 13.0
						var cy := offset_pos.y + 43.0
						var cid := (gm.selected_crop_id + c_i) % 4
						draw_texture_rect_region(crops_tex, Rect2(cx, cy, 16, 16), Rect2(3 * 40, cid * 40, 40, 40))

		Kind.FARM_PLOT:
			if world_ref != null and plot_index >= 0 and plot_index < world_ref.plots.size():
				var p: Dictionary = world_ref.plots[plot_index]
				var is_sown: bool = bool(p.get("sown", true))
				var is_watered: bool = bool(p.get("watered", false))
				var growth_val: float = float(p.get("growth", 0.0))
				# 4 1.5D soil states in soil_plot.png (each 52x30 -> 208x30 strip):
				# 0: Dry Tilled Furrows, 1: Newly Sown Seeds, 2: Moist Dark Watered Loam, 3: Lush Harvest-Ready Loam
				var soil_idx := 0
				if not is_sown:
					soil_idx = 0
				elif growth_val >= 0.95:
					soil_idx = 3
				elif is_watered:
					soil_idx = 2
				else:
					soil_idx = 1

				if soil_tex != null:
					var cell_w := float(soil_tex.get_width()) / 4.0
					var cell_h := float(soil_tex.get_height())
					var isl_id: int = int(p.get("island", 0))
					var biome_tint := Color.WHITE
					if isl_id == 1:
						biome_tint = Color(0.76, 0.94, 0.90, 0.92)
					elif isl_id == 2:
						biome_tint = Color(1.12, 0.98, 0.82, 0.88)
					draw_texture_rect_region(
						soil_tex,
						Rect2(-20, -9, 40, 18),
						Rect2(soil_idx * cell_w, 0, cell_w, cell_h),
						biome_tint
					)

				var cid: int = int(p["crop_id"])
				if is_sown and cid >= 0 and crops_tex != null:
					var stage := mini(3, int(floor(growth_val * 3.99)))
					# Soft 1.5D root contact shadow nestled inside the soil furrow
					draw_rect(Rect2(-9, -2, 18, 4), Color(0.12, 0.06, 0.02, 0.36), true)
					var crop_src := Rect2(stage * 40, (cid % 4) * 40, 40, 40)
					# Grounded 1.5D crop proportions (30x30) nestled cleanly inside the 40x18 furrow
					draw_texture_rect_region(crops_tex, Rect2(-15, -26, 30, 30), crop_src)
					var lip_col := Color(0.28, 0.16, 0.08, 0.62) if is_watered else Color(0.46, 0.28, 0.14, 0.56)
					draw_rect(Rect2(-6, 1, 12, 2), lip_col, true)

		Kind.WORKSHOP_STATION:
			if tex != null:
				draw_texture(tex, offset_pos)
			var bob := roundf(sin(anim_phase) * 2.5)
			var puff_col := Color(1.0, 0.98, 0.92, 0.65) if delicacy_icon_idx == 0 else Color(0.55, 0.88, 1.0, 0.75)
			draw_circle(Vector2(-6, offset_pos.y + 8 + bob), 3.0, puff_col)
			draw_circle(Vector2(6, offset_pos.y + 2 - bob), 2.5, puff_col)
			if delicacies_tex != null:
				var src := Rect2((delicacy_icon_idx % 4) * 36, 0, 36, 36)
				draw_texture_rect_region(delicacies_tex, Rect2(-12, offset_pos.y - 16 + bob, 24, 24), src)

		Kind.STREETLAMP:
			if tex != null:
				draw_texture(tex, offset_pos)
			if world_ref != null and world_ref.game_manager != null:
				var phase_idx: int = world_ref.game_manager.get_phase_index()
				if phase_idx >= 1:
					var pulse := 0.28 + 0.08 * sin(anim_phase * 1.5)
					draw_circle(Vector2(0, offset_pos.y + 18), 26.0, Color(1.0, 0.85, 0.38, pulse))
					draw_circle(Vector2(0, offset_pos.y + 18), 12.0, Color(1.0, 0.95, 0.65, pulse * 1.4))
