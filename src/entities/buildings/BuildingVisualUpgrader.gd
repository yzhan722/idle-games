extends Node2D
class_name BuildingVisualUpgrader
## 4-Tier Building Visual Evolution, Outer-Edge Decor, Particles, Star Badge & Legendary Shader (`src/entities/buildings/BuildingVisualUpgrader.gd`)
## Strictly enforces PRD v2.2 Section 4 & GEMINI.md Laws 2.2, 2.3 & 3.2:
## - Upgrade feedback: Q-bouncy scale Tween (`1.22x -> 0.92x -> 1.0x/1.08x`) + `"LV UP!"` / `"★里程碑突破 Lv.XX!"` floating text.
## - 4-Tier Visual Evolution:
##   * Tier 1 (Lv.1~24): Standard pixel building.
##   * Tier 2 (Lv.25~49): Mounts outer-edge `+16px` (`DECOR_OUTER_OFFSET`) decor sprite (`decor_scarecrow.png` on SoilPlot,
##     `decor_signpost.png` + top steam/alchemy spark `CPUParticles2D` on Workshop, `decor_lamp.png` + warm streetlamp glow on MarketStall).
##   * Tier 3 (Lv.50~99): Elevates building scale to `1.08x`, renders a 5-pointed Silver Star Badge at base, and doubles (`2x`) particle emission.
##   * Tier 4 (Lv.100+): Mounts custom Golden Shimmer Outline `ShaderMaterial`, emits Golden Stardust `CPUParticles2D`, and upgrades base badge to Gold Star.

@export var building_kind: String = "soil" # "soil", "mortar", "cauldron", "orbis_linked", "stall"

var current_level: int = 1
var current_tier: int = 1
var target_parent: Node2D

var decor_sprite: Sprite2D
var particles: CPUParticles2D
var gold_particles: CPUParticles2D
var legendary_shader_mat: ShaderMaterial
var shimmer_time: float = 0.0

func setup_upgrader(p_parent: Node2D, p_kind: String, p_initial_level: int = 1) -> void:
	target_parent = p_parent
	building_kind = p_kind
	current_level = p_initial_level
	_init_child_nodes()
	apply_level_visuals(current_level, false)

func _init_child_nodes() -> void:
	decor_sprite = Sprite2D.new()
	decor_sprite.name = "Tier2DecorSprite"
	decor_sprite.visible = false
	decor_sprite.centered = true
	decor_sprite.z_index = EconomyConfig.Z_BUILDING
	decor_sprite.z_as_relative = false
	add_child(decor_sprite)

	# GEMINI.md Law 2.2 & 3.2: Bottom-Center Pivot (`offset = Vector2(0.0, -float(frame_h) * 0.5)`) + outer edge + 16px
	if building_kind == "soil":
		decor_sprite.texture = load("res://assets/pixel_art/buildings/decor_scarecrow.png")
		decor_sprite.offset = Vector2(0.0, -float(56) * 0.5)
		decor_sprite.scale = Vector2(0.65, 0.65)
		decor_sprite.position = Vector2(-(SoilPlot.VISUAL_WIDTH * 0.5 + EconomyConfig.DECOR_OUTER_OFFSET), 0.0)
	elif building_kind == "mortar" or building_kind == "cauldron" or building_kind == "orbis_linked":
		decor_sprite.texture = load("res://assets/pixel_art/buildings/decor_signpost.png")
		decor_sprite.offset = Vector2(0.0, -float(54) * 0.5)
		decor_sprite.scale = Vector2(0.65, 0.65)
		decor_sprite.position = Vector2(-(Workshop.VISUAL_WIDTH * 0.5 + EconomyConfig.DECOR_OUTER_OFFSET), 0.0)
	elif building_kind == "stall":
		decor_sprite.texture = load("res://assets/pixel_art/buildings/decor_lamp.png")
		decor_sprite.offset = Vector2(0.0, -float(66) * 0.5)
		decor_sprite.scale = Vector2(0.75, 0.75)
		decor_sprite.position = Vector2(MarketStall.VISUAL_WIDTH * 0.5 + EconomyConfig.DECOR_OUTER_OFFSET, 0.0)

	# Tier 2/3 Workshop Steam / Alchemy Spark CPUParticles2D
	particles = CPUParticles2D.new()
	particles.name = "TierParticles"
	particles.emitting = false
	particles.amount = 8
	particles.lifetime = 1.4
	particles.position = Vector2(0.0, -38.0)
	particles.direction = Vector2(0.0, -1.0)
	particles.spread = 28.0
	particles.gravity = Vector2(0.0, -12.0)
	particles.initial_velocity_min = 8.0
	particles.initial_velocity_max = 18.0
	particles.scale_amount_min = 2.0
	particles.scale_amount_max = 3.5
	if building_kind == "cauldron" or building_kind == "orbis_linked":
		particles.color = Color(0.55, 0.96, 1.0, 0.85)
	else:
		particles.color = Color(0.98, 0.96, 0.90, 0.75)
	add_child(particles)

	# Tier 4 (Lv.100+) Golden Stardust CPUParticles2D & Golden Shimmer Outline ShaderMaterial
	gold_particles = CPUParticles2D.new()
	gold_particles.name = "Tier4GoldParticles"
	gold_particles.emitting = false
	gold_particles.amount = 16
	gold_particles.lifetime = 1.6
	gold_particles.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	gold_particles.emission_sphere_radius = 24.0
	gold_particles.position = Vector2(0.0, -24.0)
	gold_particles.gravity = Vector2(0.0, -8.0)
	gold_particles.initial_velocity_min = 4.0
	gold_particles.initial_velocity_max = 10.0
	gold_particles.scale_amount_min = 2.0
	gold_particles.scale_amount_max = 3.5
	gold_particles.color = Color(1.0, 0.88, 0.25, 0.92)
	add_child(gold_particles)

	var sh := Shader.new()
	sh.code = """
shader_type canvas_item;
uniform float shimmer_speed : hint_range(0.5, 5.0) = 2.4;
uniform vec4 outline_gold : source_color = vec4(1.0, 0.88, 0.28, 1.0);
void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	float wave = 0.5 + 0.5 * sin(TIME * shimmer_speed + (UV.x + UV.y) * 9.0);
	vec2 ps = TEXTURE_PIXEL_SIZE;
	float edge_a = max(
		max(texture(TEXTURE, UV + vec2(ps.x, 0.0)).a, texture(TEXTURE, UV - vec2(ps.x, 0.0)).a),
		max(texture(TEXTURE, UV + vec2(0.0, ps.y)).a, texture(TEXTURE, UV - vec2(0.0, ps.y)).a)
	);
	vec3 gold_tint = mix(tex.rgb, outline_gold.rgb, wave * 0.30);
	if (tex.a < 0.1 && edge_a > 0.4) {
		COLOR = vec4(outline_gold.rgb, edge_a * (0.55 + 0.35 * wave));
	} else {
		COLOR = vec4(gold_tint, tex.a);
	}
}
"""
	legendary_shader_mat = ShaderMaterial.new()
	legendary_shader_mat.shader = sh

func get_tier_for_level(lv: int) -> int:
	if lv >= 100:
		return 4
	elif lv >= 50:
		return 3
	elif lv >= 25:
		return 2
	return 1

func get_base_scale_for_tier(tier: int) -> Vector2:
	return Vector2(1.08, 1.08) if tier >= 3 else Vector2.ONE

func apply_level_visuals(new_level: int, play_bounce: bool = true) -> void:
	var old_tier := current_tier
	current_level = new_level
	current_tier = get_tier_for_level(new_level)
	var base_sc := get_base_scale_for_tier(current_tier)

	if decor_sprite != null:
		decor_sprite.visible = (current_tier >= 2)

	if particles != null:
		var is_workshop := (building_kind == "mortar" or building_kind == "cauldron" or building_kind == "orbis_linked")
		particles.emitting = is_workshop and (current_tier >= 2)
		particles.amount = 16 if current_tier >= 3 else 8

	if gold_particles != null:
		gold_particles.emitting = (current_tier >= 4)

	if target_parent != null:
		if current_tier >= 4:
			target_parent.material = legendary_shader_mat
		else:
			target_parent.material = null

		if play_bounce and is_inside_tree():
			var tw := create_tween()
			tw.tween_property(target_parent, "scale", base_sc * 1.22, 0.08).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
			tw.tween_property(target_parent, "scale", base_sc * 0.92, 0.08).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
			tw.tween_property(target_parent, "scale", base_sc, 0.10).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

			var gpos := target_parent.global_position - Vector2(0, 36)
			if current_tier > old_tier or (new_level % 25 == 0):
				EventBus.spawn_floating_text.emit(gpos + Vector2(0, -54), "★里程碑突破 Lv." + str(new_level) + "!", Color("#FFE066"))
				if SoundManager != null:
					SoundManager.play_milestone_sfx()
			else:
				EventBus.spawn_floating_text.emit(gpos + Vector2(0, -48), "LV UP!", Color("#FFE066"))
				if SoundManager != null:
					SoundManager.play_upgrade_sfx()
		else:
			target_parent.scale = base_sc

	queue_redraw()

func _process(delta: float) -> void:
	if current_tier >= 2:
		shimmer_time += delta
		queue_redraw()

func _draw_five_pointed_star(center: Vector2, outer_r: float, inner_r: float, col: Color) -> void:
	var pts := PackedVector2Array()
	for i in range(10):
		var r := outer_r if (i % 2 == 0) else inner_r
		var ang := -PI * 0.5 + float(i) * PI / 5.0
		pts.append(center + Vector2(cos(ang) * r, sin(ang) * r))
	draw_colored_polygon(pts, col)

func _draw() -> void:
	# Tier 2+ MarketStall Streetlamp Warm Light Halo
	if current_tier >= 2 and building_kind == "stall" and decor_sprite != null:
		var pulse := 0.85 + 0.15 * sin(shimmer_time * 3.2)
		var lamp_top := decor_sprite.position + Vector2(0.0, -36.0)
		draw_circle(lamp_top, 18.0 * pulse, Color(1.0, 0.88, 0.42, 0.22 * pulse))
		draw_circle(lamp_top, 9.0 * pulse, Color(1.0, 0.95, 0.68, 0.34 * pulse))

	# Tier 3+ (Lv.50~99 Silver Star Badge / Lv.100+ Gold Star Badge) at Building Base
	if current_tier >= 3:
		var badge_center := Vector2(0.0, -4.0)
		var star_col := Color(1.0, 0.88, 0.24, 0.98) if current_tier >= 4 else Color(0.86, 0.94, 1.0, 0.96)
		draw_circle(badge_center, 7.0, Color(0.14, 0.08, 0.04, 0.88))
		draw_arc(badge_center, 7.0, 0.0, TAU, 16, star_col, 1.4)
		_draw_five_pointed_star(badge_center, 5.2, 2.3, star_col)
