extends Node2D
class_name CustomerNPC
## Long-Cycle Island Customer & Crown VIP Tycoon (`src/entities/units/CustomerNPC.gd`)
## Strictly enforces GEMINI.md Laws 2, 3, 4, 5:
## - Root `position.y = GROUND_Y` (`z_index = 10`, `z_as_relative = false`).
## - `body_sprite`: `region_enabled = false`, `hframes = 2`, `vframes = 1`, `frame = frame_idx` (`48x48` per frame, aspect 1.0).
## - `body_sprite`: `centered = true`, `offset = Vector2(0.0, -float(48) * 0.5) = Vector2(0.0, -24.0)`.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` (`shadow_width = 40 * 0.55`, `shadow_height = shadow_width * 0.18`, `Color(0, 0, 0, 0.20)`).

const FRAME_W := 48
const FRAME_H := 48
const VISUAL_WIDTH := 40.0

enum State {
	SPAWN_AND_STROLL,
	QUEUE_AT_STALL,
	PURCHASE,
	LEAVE
}

enum VisitorRole {
	REGULAR = 0,
	VIP = 1,
	GOURMET_CRITIC = 2,
	CARAVAN_MERCHANT = 3,
	COLLECTOR_TOURIST = 4,
	HOTSPRING_VIP_GUEST = 5,
	PARADE_GOURMET_TOURIST = 6,
	TEA_CONNOISSEUR = 7
}

const TRAVELER_KEYS: Array[String] = [
	"travelers/traveler_slime.png",
	"travelers/traveler_mushroom.png",
	"travelers/traveler_pig.png"
]

const TRAVELER_NORMALIZED_PATHS: Array[String] = [
	"res://assets/pixel_art/travelers/traveler_slime_normalized.png",
	"res://assets/pixel_art/travelers/traveler_mushroom_normalized.png",
	"res://assets/pixel_art/travelers/traveler_pig_normalized.png"
]

const CRITIC_SHEET_KEY := "travelers/traveler_critic.png"
const CRITIC_NORMALIZED_PATH := "res://assets/pixel_art/travelers/traveler_critic_normalized.png"
const MERCHANT_SHEET_KEY := "travelers/traveler_merchant.png"
const MERCHANT_NORMALIZED_PATH := "res://assets/pixel_art/travelers/traveler_merchant_normalized.png"

var state: State = State.SPAWN_AND_STROLL
var visitor_role: int = VisitorRole.REGULAR
var is_vip: bool = false
var sheet_key: String = "travelers/traveler_slime.png"
var tex_sheet: Texture2D
var tex_parchment: Texture2D
var tex_delicacies: Texture2D
var tex_crops: Texture2D
var tex_heart: Texture2D
var tex_gourmet_medal: Texture2D

var body_sprite: Sprite2D = Sprite2D.new()
var bubble_label: Label

var waypoint_graph: WaypointGraph
var stall_ref: MarketStall
var spawn_pos: Vector2
var nav_path: Array[Vector2] = []

var desired_item_id: String = "crop_0"
var desired_qty: int = 1
var wait_timer: float = 0.0
var interact_timer: float = 0.0
var purchased_ok: bool = false
var disappointed: bool = false

var anim_time: float = 0.0
var facing_left: bool = false
var fade_alpha: float = 1.0

func _ready() -> void:
	z_index = EconomyConfig.Z_UNIT
	z_as_relative = false

	# GEMINI.md Law 2.2 & Law 4: Fixed grid slicing (`hframes = 2, vframes = 1, region_enabled = false`) + Bottom-Center Pivot
	body_sprite.name = "BodySprite"
	if tex_sheet != null:
		body_sprite.texture = tex_sheet
	body_sprite.region_enabled = false
	body_sprite.hframes = 2
	body_sprite.vframes = 1
	body_sprite.frame = 0
	body_sprite.centered = true
	body_sprite.offset = Vector2(0.0, -float(FRAME_H) * 0.5)
	body_sprite.z_index = EconomyConfig.Z_UNIT
	body_sprite.z_as_relative = false
	add_child(body_sprite)

	bubble_label = EconomyConfig.create_pixel_label("x1", 14, Color("#FFF4D6"), false)
	bubble_label.position = Vector2(2.0, -76.0)
	bubble_label.z_index = EconomyConfig.Z_CARRY_EMOTE
	bubble_label.z_as_relative = false
	add_child(bubble_label)

	tex_parchment = load("res://assets/pixel_art/ui/panel_parchment_9patch.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet_normalized.png")
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet_normalized.png")
	tex_heart = load("res://assets/pixel_art/ui/emote_heart.png")
	tex_gourmet_medal = EconomyConfig.load_pixel_texture("res://assets/pixel_art/ui/badge_gourmet_medal.png")

func setup_customer(p_spawn: Vector2, p_graph: WaypointGraph, p_stall: MarketStall, p_is_vip: bool = false, p_role: int = -1) -> void:
	waypoint_graph = p_graph
	stall_ref = p_stall
	if p_role < 0:
		visitor_role = VisitorRole.VIP if p_is_vip else VisitorRole.REGULAR
	else:
		visitor_role = p_role
	is_vip = (visitor_role == VisitorRole.VIP or visitor_role == VisitorRole.GOURMET_CRITIC or visitor_role == VisitorRole.COLLECTOR_TOURIST or visitor_role == VisitorRole.HOTSPRING_VIP_GUEST or visitor_role == VisitorRole.PARADE_GOURMET_TOURIST or visitor_role == VisitorRole.TEA_CONNOISSEUR)
	spawn_pos = Vector2(p_spawn.x, EconomyConfig.GROUND_Y)
	position = spawn_pos

	if visitor_role == VisitorRole.GOURMET_CRITIC:
		sheet_key = CRITIC_SHEET_KEY
		tex_sheet = EconomyConfig.load_pixel_texture(CRITIC_NORMALIZED_PATH)
	elif visitor_role == VisitorRole.CARAVAN_MERCHANT:
		sheet_key = MERCHANT_SHEET_KEY
		tex_sheet = EconomyConfig.load_pixel_texture(MERCHANT_NORMALIZED_PATH)
	elif visitor_role == VisitorRole.COLLECTOR_TOURIST:
		sheet_key = MERCHANT_SHEET_KEY
		tex_sheet = EconomyConfig.load_pixel_texture(EconomyConfig.COLLECTOR_TRAVELER_TEX)
	elif visitor_role == VisitorRole.HOTSPRING_VIP_GUEST:
		sheet_key = TRAVELER_KEYS[0]
		tex_sheet = EconomyConfig.load_pixel_texture(EconomyConfig.VIP_HOTSPRING_TRAVELER_TEX)
	elif visitor_role == VisitorRole.PARADE_GOURMET_TOURIST:
		sheet_key = TRAVELER_KEYS[2]
		tex_sheet = EconomyConfig.load_pixel_texture(EconomyConfig.PARADE_TOURIST_TRAVELER_TEX)
	elif visitor_role == VisitorRole.TEA_CONNOISSEUR:
		sheet_key = CRITIC_SHEET_KEY
		tex_sheet = EconomyConfig.load_pixel_texture(EconomyConfig.TEA_CONNOISSEUR_TRAVELER_TEX)
	else:
		var t_idx := 2 if visitor_role == VisitorRole.VIP else (randi() % TRAVELER_KEYS.size())
		sheet_key = TRAVELER_KEYS[t_idx]
		tex_sheet = load(TRAVELER_NORMALIZED_PATHS[t_idx])

	if body_sprite != null:
		body_sprite.texture = tex_sheet
		body_sprite.region_enabled = false
		body_sprite.hframes = 2
		body_sprite.vframes = 1
		body_sprite.frame = 0
		body_sprite.offset = Vector2(0.0, -float(FRAME_H) * 0.5)
		if visitor_role == VisitorRole.COLLECTOR_TOURIST:
			body_sprite.self_modulate = Color(0.90, 1.0, 0.95, 1.0)
		elif visitor_role == VisitorRole.HOTSPRING_VIP_GUEST:
			body_sprite.self_modulate = Color(1.0, 0.96, 0.90, 1.0)
		elif visitor_role == VisitorRole.PARADE_GOURMET_TOURIST:
			body_sprite.self_modulate = Color(1.0, 0.95, 0.86, 1.0)
		elif visitor_role == VisitorRole.TEA_CONNOISSEUR:
			body_sprite.self_modulate = Color(0.88, 1.0, 0.92, 1.0)
		else:
			body_sprite.self_modulate = Color.WHITE

	if visitor_role == VisitorRole.TEA_CONNOISSEUR:
		if GameManager != null and int(GameManager.tea_inventory.get("tea_osmanthus_oolong", 0)) > 0:
			desired_item_id = "tea_osmanthus_oolong"
		elif GameManager != null and int(GameManager.tea_inventory.get("tea_cloud_longjing", 0)) > 0:
			desired_item_id = "tea_cloud_longjing"
		elif GameManager != null and EconomyConfig.is_artisan_tea(GameManager.active_tea_recipe_id):
			desired_item_id = GameManager.active_tea_recipe_id
		else:
			desired_item_id = "tea_cloud_longjing"
		desired_qty = 1
	elif visitor_role == VisitorRole.PARADE_GOURMET_TOURIST:
		if GameManager != null and int(GameManager.bakery_inventory.get("bread_amber_croissant", 0)) > 0:
			desired_item_id = "bread_amber_croissant"
		elif GameManager != null and int(GameManager.bakery_inventory.get("bread_cloud_souffle", 0)) > 0:
			desired_item_id = "bread_cloud_souffle"
		elif GameManager != null and EconomyConfig.is_bakery_bread(GameManager.active_windmill_bread_id):
			desired_item_id = GameManager.active_windmill_bread_id
		else:
			desired_item_id = "bread_cloud_souffle"
		desired_qty = 1
	elif visitor_role == VisitorRole.HOTSPRING_VIP_GUEST:
		if GameManager != null and int(GameManager.bath_inventory.get("bath_star_amber", 0)) > 0:
			desired_item_id = "bath_star_amber"
		elif GameManager != null and int(GameManager.bath_inventory.get("bath_sakura_mist", 0)) > 0:
			desired_item_id = "bath_sakura_mist"
		elif GameManager != null and EconomyConfig.HOTSPRING_BATH_BLENDS.has(GameManager.active_hotspring_bath_id):
			desired_item_id = GameManager.active_hotspring_bath_id
		else:
			desired_item_id = "bath_mugwort_warm"
		desired_qty = 1
	elif visitor_role == VisitorRole.COLLECTOR_TOURIST:
		if GameManager != null and int(GameManager.souvenir_inventory.get("souvenir_box_royal", 0)) > 0:
			desired_item_id = "souvenir_box_royal"
		else:
			desired_item_id = "souvenir_box_floral"
		desired_qty = 1
	elif visitor_role == VisitorRole.GOURMET_CRITIC:
		var del_pool: Array[String] = []
		for dk in ["delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0"]:
			if bool(GameManager.unlocked_codex.get(dk, false)):
				del_pool.append(dk)
		if del_pool.is_empty():
			if GameManager.is_animal_hired("fox"):
				del_pool.append(EconomyConfig.get_evolved_delicacy_id("mortar", int(GameManager.building_levels.get("mortar", 1))))
			else:
				del_pool.append("delicacy_0")
		desired_item_id = del_pool[0]
		desired_qty = randi_range(1, 2)
	elif visitor_role == VisitorRole.CARAVAN_MERCHANT:
		var crop_pool: Array[String] = []
		for ck in ["crop_3", "crop_2", "crop_1", "crop_0"]:
			if bool(GameManager.unlocked_codex.get(ck, false)):
				crop_pool.append(ck)
		desired_item_id = crop_pool[0] if not crop_pool.is_empty() else "crop_0"
		desired_qty = randi_range(2, 4)
	elif visitor_role == VisitorRole.VIP:
		if bool(GameManager.unlocked_islands.get(3, false)) and (GameManager.get_island_recruited_count(3, "fox") >= 1 or GameManager.get_island_recruited_count(3, "penguin") >= 1):
			desired_item_id = "delicacy_3"
		elif bool(GameManager.unlocked_islands.get(2, false)) and GameManager.get_island_recruited_count(2, "penguin") >= 1:
			desired_item_id = "delicacy_2"
		elif GameManager.is_animal_hired("fox"):
			desired_item_id = EconomyConfig.get_evolved_delicacy_id("mortar", int(GameManager.building_levels.get("mortar", 1)))
		else:
			desired_item_id = EconomyConfig.get_evolved_crop_id(1, int(GameManager.building_levels.get("soil_1", 1)))
		desired_qty = randi_range(3, 5)
	else:
		var pool: Array[String] = []
		for item_k in ["crop_0", "crop_1", "crop_2", "crop_3", "delicacy_0", "delicacy_1", "delicacy_2", "delicacy_3"]:
			if bool(GameManager.unlocked_codex.get(item_k, false)):
				pool.append(item_k)
		var cur_solar_dish := GameManager.get_current_solar_dish_id()
		if bool(GameManager.unlocked_solar_dishes.get(cur_solar_dish, false)):
			pool.append(cur_solar_dish)
		if pool.is_empty():
			pool.append("crop_0")
		desired_item_id = pool[randi() % pool.size()]
		desired_qty = randi_range(1, 3)

	state = State.SPAWN_AND_STROLL
	var approach_dest := waypoint_graph.get_dock_pos("stall_checkout") if waypoint_graph != null else Vector2(1041.4, EconomyConfig.GROUND_Y)
	nav_path = waypoint_graph.compute_path(position, approach_dest) if waypoint_graph != null else [approach_dest]

func _exit_tree() -> void:
	if stall_ref != null:
		stall_ref.unregister_from_queue(self)

func _process(delta: float) -> void:
	anim_time += delta

	match state:
		State.SPAWN_AND_STROLL:
			if _follow_path(delta, 42.0):
				if stall_ref != null:
					stall_ref.register_in_queue(self)
				state = State.QUEUE_AT_STALL
				wait_timer = 0.0

		State.QUEUE_AT_STALL:
			if stall_ref != null:
				var slot_pos := stall_ref.get_queue_slot_pos(self)
				if absf(position.x - slot_pos.x) > 2.5:
					_move_directly_toward(slot_pos, delta, 38.0)
				else:
					facing_left = (position.x > stall_ref.position.x)
				if stall_ref.is_front_of_queue(self):
					state = State.PURCHASE
					interact_timer = 0.0
					wait_timer = 0.0
			else:
				state = State.PURCHASE

		State.PURCHASE:
			if stall_ref != null:
				var front_pos := stall_ref.get_queue_slot_pos(self)
				if absf(position.x - front_pos.x) > 2.5:
					_move_directly_toward(front_pos, delta, 38.0)
				else:
					facing_left = (position.x > stall_ref.position.x)

			if visitor_role == VisitorRole.TEA_CONNOISSEUR:
				var has_tea := GameManager != null and GameManager.has_tea_for_connoisseur()
				if has_tea:
					var frenzy_mult := 2.0 if (GameManager != null and GameManager.frenzy_timer > 0.0) else 1.0
					interact_timer += delta * frenzy_mult
					var req_time := stall_ref.get_checkout_duration() if stall_ref != null else 1.0
					if interact_timer >= req_time:
						var t_deal := GameManager.try_tea_connoisseur_checkout(desired_item_id, desired_qty, position)
						if int(t_deal.get("bought", 0)) > 0:
							purchased_ok = true
							var tv_seg := EconomyConfig.tr_fmt("bn_seg_voucher", [int(t_deal["vouchers"])]) if int(t_deal.get("vouchers", 0)) > 0 else ""
							EventBus.spawn_floating_text.emit(
								position + Vector2(0, -78),
								EconomyConfig.tr_key("ft_tea_guest") % [int(t_deal["gold"]), int(t_deal["amber"]), tv_seg],
								Color("#88FFD0")
							)
							_begin_leave()
				else:
					wait_timer += delta
					if wait_timer >= 12.0:
						disappointed = true
						EventBus.customer_left_unhappy.emit(position)
						EventBus.spawn_floating_text.emit(position + Vector2(0, -54), EconomyConfig.tr_key("ft_wait_tea"), Color("#FFF4D6"))
						_begin_leave()
			elif visitor_role == VisitorRole.PARADE_GOURMET_TOURIST:
				var has_bread := GameManager != null and GameManager.has_bread_for_parade_tourist()
				if has_bread:
					var frenzy_mult := 2.0 if (GameManager != null and GameManager.frenzy_timer > 0.0) else 1.0
					interact_timer += delta * frenzy_mult
					var req_time := stall_ref.get_checkout_duration() if stall_ref != null else 1.0
					if interact_timer >= req_time:
						var p_deal := GameManager.try_parade_tourist_purchase_bakery(desired_item_id, desired_qty, position)
						if int(p_deal.get("bought", 0)) > 0:
							purchased_ok = true
							var pv_seg := EconomyConfig.tr_fmt("bn_seg_voucher", [int(p_deal["vouchers"])]) if int(p_deal.get("vouchers", 0)) > 0 else ""
							EventBus.spawn_floating_text.emit(
								position + Vector2(0, -78),
								EconomyConfig.tr_key("ft_parade_guest") % [int(p_deal["gold"]), int(p_deal["amber"]), pv_seg],
								Color("#FFE066")
							)
							_begin_leave()
				else:
					wait_timer += delta
					if wait_timer >= 12.0:
						disappointed = true
						EventBus.customer_left_unhappy.emit(position)
						EventBus.spawn_floating_text.emit(position + Vector2(0, -54), EconomyConfig.tr_key("ft_wait_bread"), Color("#FFF4D6"))
						_begin_leave()
			elif visitor_role == VisitorRole.HOTSPRING_VIP_GUEST:
				var has_bath := GameManager != null and GameManager.has_bath_for_vip_guest()
				if has_bath:
					var frenzy_mult := 2.0 if (GameManager != null and GameManager.frenzy_timer > 0.0) else 1.0
					interact_timer += delta * frenzy_mult
					var req_time := stall_ref.get_checkout_duration() if stall_ref != null else 1.1
					if interact_timer >= req_time:
						var spa_deal := GameManager.try_vip_hotspring_guest_checkout(desired_item_id, desired_qty, position)
						if int(spa_deal.get("bought", 0)) > 0:
							purchased_ok = true
							var sv_seg := EconomyConfig.tr_fmt("bn_seg_voucher", [int(spa_deal["vouchers"])]) if int(spa_deal.get("vouchers", 0)) > 0 else ""
							EventBus.spawn_floating_text.emit(
								position + Vector2(0, -78),
								EconomyConfig.tr_key("ft_spa_guest") % [int(spa_deal["gold"]), int(spa_deal["amber"]), sv_seg],
								Color("#FFE066")
							)
							_begin_leave()
				else:
					wait_timer += delta
					if wait_timer >= 12.0:
						disappointed = true
						EventBus.customer_left_unhappy.emit(position)
						EventBus.spawn_floating_text.emit(position + Vector2(0, -54), EconomyConfig.tr_key("ft_wait_bath"), Color("#FFF4D6"))
						_begin_leave()
			elif visitor_role == VisitorRole.COLLECTOR_TOURIST:
				var has_souvenir := GameManager != null and (GameManager.has_souvenir_box_for_collector() or GameManager.get_total_flora_count() > 0)
				if has_souvenir:
					var frenzy_mult := 2.0 if (GameManager != null and GameManager.frenzy_timer > 0.0) else 1.0
					interact_timer += delta * frenzy_mult
					var req_time := stall_ref.get_checkout_duration() if stall_ref != null else 1.1
					if interact_timer >= req_time:
						var deal := GameManager.try_collector_purchase_souvenir(desired_item_id, desired_qty, position)
						if int(deal.get("bought", 0)) > 0:
							purchased_ok = true
							var v_seg := EconomyConfig.tr_fmt("bn_seg_voucher", [int(deal["vouchers"])]) if int(deal.get("vouchers", 0)) > 0 else ""
							EventBus.spawn_floating_text.emit(
								position + Vector2(0, -78),
								EconomyConfig.tr_key("ft_collector") % [int(deal["gold"]), int(deal["amber"]), v_seg],
								Color("#FFE066")
							)
							_begin_leave()
				else:
					wait_timer += delta
					if wait_timer >= 12.0:
						disappointed = true
						EventBus.customer_left_unhappy.emit(position)
						EventBus.spawn_floating_text.emit(position + Vector2(0, -54), EconomyConfig.tr_key("ft_wait_box"), Color("#FFF4D6"))
						_begin_leave()
			elif visitor_role == VisitorRole.CARAVAN_MERCHANT:
				var has_crops := GameManager != null and GameManager.has_surplus_crops_for_merchant()
				if has_crops:
					var frenzy_mult := 2.0 if (GameManager != null and GameManager.frenzy_timer > 0.0) else 1.0
					interact_timer += delta * frenzy_mult
					var req_time := stall_ref.get_checkout_duration() if stall_ref != null else 1.2
					if interact_timer >= req_time:
						var barter := GameManager.try_merchant_acquire_surplus_crops(desired_qty, position)
						if int(barter.get("taken", 0)) > 0:
							purchased_ok = true
							EventBus.spawn_floating_text.emit(
								position + Vector2(0, -76),
								EconomyConfig.tr_key("ft_trader") % [int(barter["taken"]), int(barter["amber"]), int(barter["gold"])],
								Color("#FFD43B")
							)
							_begin_leave()
				else:
					wait_timer += delta
					if wait_timer >= 12.0:
						disappointed = true
						EventBus.customer_left_unhappy.emit(position)
						EventBus.spawn_floating_text.emit(position + Vector2(0, -54), EconomyConfig.tr_key("ft_no_surplus"), Color("#FFF4D6"))
						_begin_leave()
			elif visitor_role == VisitorRole.GOURMET_CRITIC:
				var has_tasting_stock := GameManager != null and GameManager.has_delicacy_or_stall_stock_for_critic()
				if has_tasting_stock:
					var frenzy_mult := 2.0 if (GameManager != null and GameManager.frenzy_timer > 0.0) else 1.0
					interact_timer += delta * frenzy_mult
					var req_time := stall_ref.get_checkout_duration() if stall_ref != null else 1.2
					if interact_timer >= req_time:
						var earned := GameManager.try_critic_taste_delicacy(desired_item_id, desired_qty, position)
						if earned > 0:
							purchased_ok = true
							EventBus.spawn_floating_text.emit(
								position + Vector2(0, -78),
								EconomyConfig.tr_key("ft_critic"),
								Color("#FFE066")
							)
							_begin_leave()
				else:
					wait_timer += delta
					if wait_timer >= 12.0:
						disappointed = true
						EventBus.customer_left_unhappy.emit(position)
						EventBus.spawn_floating_text.emit(position + Vector2(0, -54), EconomyConfig.tr_key("ft_wait_dish"), Color("#FFF4D6"))
						_begin_leave()
			else:
				var has_stock := stall_ref.has_available_stock() if stall_ref != null else (GameManager.get_total_stall_count() > 0)
				if has_stock:
					var frenzy_mult := 2.0 if (GameManager != null and GameManager.frenzy_timer > 0.0) else 1.0
					interact_timer += delta * frenzy_mult
					var req_time := stall_ref.get_checkout_duration() if stall_ref != null else (1.0 if GameManager.is_animal_hired("shiba") else 1.8)
					if interact_timer >= req_time:
						var earned := stall_ref.execute_customer_checkout(desired_item_id, desired_qty, position, is_vip) if stall_ref != null else GameManager.try_purchase_from_stall(desired_item_id, desired_qty, position, is_vip)
						if earned > 0:
							purchased_ok = true
							if is_vip:
								EventBus.spawn_floating_text.emit(position + Vector2(0, -76), EconomyConfig.tr_key("ft_vip_tip"), Color("#FFE066"))
							_begin_leave()
				else:
					wait_timer += delta
					if wait_timer >= 12.0:
						disappointed = true
						EventBus.customer_left_unhappy.emit(position)
						EventBus.spawn_floating_text.emit(position + Vector2(0, -54), EconomyConfig.tr_key("ft_sold_out_leave"), Color("#FFF4D6"))
						_begin_leave()

		State.LEAVE:
			if _follow_path(delta, 42.0):
				fade_alpha -= delta * 1.8
				modulate.a = maxf(0.0, fade_alpha)
				if fade_alpha <= 0.02:
					queue_free()

	var is_walking := (state == State.SPAWN_AND_STROLL or state == State.LEAVE) and nav_path.size() > 0
	var frame_idx := (int(floor(anim_time * 6.0 / PI)) % 2) if is_walking else 0
	var hop_y := -absf(sin(anim_time * 6.0)) * 2.2 if is_walking else 0.0

	rotation = 0.0
	if body_sprite != null and tex_sheet != null:
		body_sprite.frame = clampi(frame_idx, 0, 1)
		body_sprite.flip_h = facing_left
		body_sprite.position = Vector2(0.0, hop_y)
		body_sprite.rotation = 0.0

	var q_stagger_y := 0.0
	if state == State.QUEUE_AT_STALL and stall_ref != null and not stall_ref.is_front_of_queue(self):
		q_stagger_y = -26.0

	if bubble_label != null:
		if state == State.SPAWN_AND_STROLL or state == State.QUEUE_AT_STALL or state == State.PURCHASE:
			bubble_label.visible = true
			bubble_label.text = "x" + str(desired_qty)
			bubble_label.position = Vector2(2.0, -78.0 + hop_y + q_stagger_y)
		elif state == State.LEAVE and disappointed:
			bubble_label.visible = true
			bubble_label.text = "..."
			bubble_label.position = Vector2(-8.0, -72.0 + hop_y)
		else:
			bubble_label.visible = false

	queue_redraw()

func _begin_leave() -> void:
	if stall_ref != null:
		stall_ref.unregister_from_queue(self)
	state = State.LEAVE
	nav_path = waypoint_graph.compute_path(position, spawn_pos) if waypoint_graph != null else [spawn_pos]

func _follow_path(delta: float, spd: float) -> bool:
	if nav_path.size() == 0:
		return true
	var rem_move := spd * delta
	while rem_move > 0.0 and nav_path.size() > 0:
		var wp := Vector2(nav_path[0].x, EconomyConfig.GROUND_Y)
		var diff_x := wp.x - position.x
		var dist := absf(diff_x)
		if absf(diff_x) > 0.2:
			facing_left = diff_x < 0.0
		if dist <= rem_move or dist <= 1.5:
			position = wp
			rem_move -= dist
			nav_path.remove_at(0)
		else:
			position = Vector2(position.x + signf(diff_x) * rem_move, EconomyConfig.GROUND_Y)
			rem_move = 0.0
	return nav_path.size() == 0

func _move_directly_toward(dest: Vector2, delta: float, spd: float) -> void:
	var diff_x := dest.x - position.x
	if absf(diff_x) > 1.5:
		facing_left = diff_x < 0.0
		position = Vector2(position.x + signf(diff_x) * minf(absf(diff_x), spd * delta), EconomyConfig.GROUND_Y)

func _draw_vip_crown(top_y: float) -> void:
	var cx := 0.0
	var cy := top_y
	draw_rect(Rect2(cx - 9, cy - 6, 18, 6), Color(1.0, 0.84, 0.16, 0.98), true)
	draw_colored_polygon(PackedVector2Array([
		Vector2(cx - 9, cy - 6), Vector2(cx - 9, cy - 12), Vector2(cx - 4, cy - 7),
		Vector2(cx, cy - 14), Vector2(cx + 4, cy - 7), Vector2(cx + 9, cy - 12), Vector2(cx + 9, cy - 6)
	]), Color(1.0, 0.90, 0.25, 0.98))
	draw_circle(Vector2(cx, cy - 4), 2.2, Color(0.96, 0.18, 0.28, 1.0))

func _draw() -> void:
	if tex_sheet == null:
		return
	var is_walking := (state == State.SPAWN_AND_STROLL or state == State.LEAVE) and nav_path.size() > 0
	var hop_y := -absf(sin(anim_time * 6.0)) * 2.2 if is_walking else 0.0

	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, VISUAL_WIDTH)

	if visitor_role == VisitorRole.GOURMET_CRITIC and tex_gourmet_medal != null:
		var medal_pos := Vector2(18.0, -86.0 + hop_y) if (state != State.LEAVE) else Vector2(-9.0, -66.0 + hop_y)
		draw_texture_rect(tex_gourmet_medal, Rect2(medal_pos.x, medal_pos.y, 18.0, 18.0), false)
	elif visitor_role == VisitorRole.COLLECTOR_TOURIST:
		var col_icon := EconomyConfig.load_pixel_texture(EconomyConfig.SOUVENIR_BOX_ROYAL_TEX)
		if col_icon != null and state != State.LEAVE:
			draw_texture_rect(col_icon, Rect2(18.0, -86.0 + hop_y, 16.0, 16.0), false)
	elif visitor_role == VisitorRole.HOTSPRING_VIP_GUEST:
		var spa_icon := EconomyConfig.load_pixel_texture(EconomyConfig.ICON_VIP_HOTSPRING_GUEST_TEX)
		if spa_icon != null and state != State.LEAVE:
			draw_texture_rect(spa_icon, Rect2(18.0, -86.0 + hop_y, 18.0, 18.0), false)
	elif visitor_role == VisitorRole.PARADE_GOURMET_TOURIST:
		var parade_icon := EconomyConfig.load_pixel_texture(EconomyConfig.ICON_PARADE_FLOAT_TEX)
		if parade_icon != null and state != State.LEAVE:
			draw_texture_rect(parade_icon, Rect2(18.0, -86.0 + hop_y, 18.0, 18.0), false)
	elif visitor_role == VisitorRole.TEA_CONNOISSEUR:
		var tea_icon := EconomyConfig.load_pixel_texture(EconomyConfig.ICON_MOON_TEA_BOAT_TEX)
		if tea_icon != null and state != State.LEAVE:
			draw_texture_rect(tea_icon, Rect2(18.0, -86.0 + hop_y, 18.0, 18.0), false)
	elif visitor_role == VisitorRole.VIP:
		_draw_vip_crown(-46.0 + hop_y)

	var q_stagger_y := 0.0
	if state == State.QUEUE_AT_STALL and stall_ref != null and not stall_ref.is_front_of_queue(self):
		q_stagger_y = -26.0

	if state == State.SPAWN_AND_STROLL or state == State.QUEUE_AT_STALL or state == State.PURCHASE:
		if tex_parchment != null:
			draw_texture_rect(tex_parchment, Rect2(-24, -78 + hop_y + q_stagger_y, 54, 26), false)
		if EconomyConfig.is_tea_item(desired_item_id):
			var ti_tex := EconomyConfig.load_pixel_texture(String(EconomyConfig.TEA_ITEMS[desired_item_id].get("icon_tex", "")))
			if ti_tex != null:
				draw_texture_rect(ti_tex, Rect2(-20, -75 + hop_y + q_stagger_y, 20, 20), false)
		elif EconomyConfig.is_bakery_item(desired_item_id):
			var bk_tex := EconomyConfig.load_pixel_texture(String(EconomyConfig.BAKERY_ITEMS[desired_item_id].get("icon_tex", "")))
			if bk_tex != null:
				draw_texture_rect(bk_tex, Rect2(-20, -75 + hop_y + q_stagger_y, 20, 20), false)
		elif EconomyConfig.is_hotspring_bath(desired_item_id):
			var hb_tex := EconomyConfig.load_pixel_texture(String(EconomyConfig.HOTSPRING_BATH_BLENDS[desired_item_id].get("icon_tex", "")))
			if hb_tex != null:
				draw_texture_rect(hb_tex, Rect2(-20, -75 + hop_y + q_stagger_y, 20, 20), false)
		elif EconomyConfig.is_souvenir_box(desired_item_id):
			var sb_tex := EconomyConfig.load_pixel_texture(String(EconomyConfig.SOUVENIR_BOXES[desired_item_id].get("icon_tex", "")))
			if sb_tex != null:
				draw_texture_rect(sb_tex, Rect2(-20, -75 + hop_y + q_stagger_y, 20, 20), false)
		elif EconomyConfig.is_solar_specialty_dish(desired_item_id):
			var sd_tex := EconomyConfig.load_pixel_texture(String(EconomyConfig.SOLAR_SPECIALTY_DISHES[desired_item_id].get("icon_tex", "")))
			if sd_tex != null:
				draw_texture_rect(sd_tex, Rect2(-20, -75 + hop_y + q_stagger_y, 20, 20), false)
			elif tex_delicacies != null:
				draw_texture_rect_region(tex_delicacies, Rect2(-20, -75 + hop_y + q_stagger_y, 20, 20), EconomyConfig.get_delicacy_region("delicacy_0"))
		elif desired_item_id.begins_with("delicacy_") and tex_delicacies != null:
			var d_reg := EconomyConfig.get_delicacy_region(desired_item_id)
			draw_texture_rect_region(tex_delicacies, Rect2(-20, -75 + hop_y + q_stagger_y, 20, 20), d_reg)
		elif tex_crops != null:
			var c_reg := EconomyConfig.get_crop_stage_region(desired_item_id, 3)
			draw_texture_rect_region(tex_crops, Rect2(-20, -75 + hop_y + q_stagger_y, 20, 20), c_reg)
	elif state == State.LEAVE:
		if purchased_ok and tex_heart != null:
			var heart_y := -80.0 if is_vip else -68.0
			draw_texture_rect(tex_heart, Rect2(-10, heart_y + hop_y, 20, 20), false)
		elif disappointed and tex_parchment != null:
			draw_texture_rect(tex_parchment, Rect2(-16, -72 + hop_y, 32, 22), false)
