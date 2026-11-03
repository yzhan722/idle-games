extends Node2D
class_name BuildingVisualUpgrader
## 4-Tier Building Visual Evolution & Bouncy Upgrade Animator (`src/entities/buildings/BuildingVisualUpgrader.gd`) — Visual Polish Patch
## - Places Streetlamp (`decor_lamp.png`) at the side-rear of the Market Stall (`z_index = -1`, `Vector2(54, -8)`)
##   so it NEVER overlaps the Mortar Workshop or blocks the Market Stall front!

@export var building_kind: String = "soil" # "soil", "mortar", "cauldron", "stall"

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
	decor_sprite.centered = false
	decor_sprite.z_index = -1
	add_child(decor_sprite)

	if building_kind == "soil":
		decor_sprite.texture = load("res://assets/pixel_art/buildings/decor_scarecrow.png")
		decor_sprite.position = Vector2(-36.0, -8.0)
		decor_sprite.offset = Vector2(-18.0, -42.0)
		decor_sprite.scale = Vector2(0.75, 0.75)
	elif building_kind == "mortar" or building_kind == "cauldron" or building_kind == "orbis_linked":
		decor_sprite.texture = load("res://assets/pixel_art/buildings/decor_signpost.png")
		decor_sprite.position = Vector2(-38.0, -4.0)
		decor_sprite.offset = Vector2(-18.0, -44.0)
		decor_sprite.scale = Vector2(0.78, 0.78)
	elif building_kind == "stall":
		# Visual Polish Patch Rule 3: Place Streetlamp at the side-rear of Market Stall (z_index = -1), never blocking the front or Mortar!
		decor_sprite.texture = load("res://assets/pixel_art/buildings/decor_lamp.png")
		decor_sprite.position = Vector2(54.0, -8.0)
		decor_sprite.offset = Vector2(-22.0, -62.0)

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

	# Tier 4 (Lv.100+) Golden Stardust CPUParticles2D & Golden Shimmer ShaderMaterial
	gold_particles = CPUParticles2D.new()
	gold_particles.name = "Tier4GoldParticles"
	gold_particles.emitting = false
	gold_particles.amount = 14
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
uniform float shimmer_speed : hint_range(0.5, 5.0) = 2.2;
void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	float wave = 0.5 + 0.5 * sin(TIME * shimmer_speed + (UV.x + UV.y) * 8.0);
	vec3 gold_tint = mix(tex.rgb, vec3(1.0, 0.90, 0.38), wave * 0.28);
	COLOR = vec4(gold_tint, tex.a);
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

func _draw() -> void:
	# Tier 3 (Lv. 50 ~ 99+): Pixel Silver Star Pedestal Badge at the base of the building
	if current_tier >= 3:
		var badge_col := Color(1.0, 0.86, 0.24, 0.95) if current_tier >= 4 else Color(0.84, 0.92, 1.0, 0.92)
		draw_circle(Vector2(0.0, 6.0), 8.0, Color(0.14, 0.08, 0.04, 0.85))
		draw_arc(Vector2(0.0, 6.0), 8.0, 0.0, TAU, 16, badge_col, 1.5)
		draw_circle(Vector2(0.0, 6.0), 3.0, badge_col)
