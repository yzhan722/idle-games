extends Node2D
class_name WaypointGraph
## Pre-configured 1D Main Road + Building Branch Waypoint Graph (`src/world/WaypointGraph.gd`) — PRD v2.0 Section 3.2
## Left-to-Right Panoramic Layout:
## [Left Hut] -> [Island 1: Henesys (Market, Mortar, Soil1, Basket1, Pond Footbridge)]
##   ===(Bridge 1)===> [Island 2: Ellinia (Cauldron, Soil2, Basket2)]
##   ===(Bridge 2)===> [Island 3: Orbis Coast (Soil3, Basket3, Right Tiki)]

var named_points: Dictionary = {
	"spawn_left": Vector2(115.0, 134.0),
	"basket_1": Vector2(675.0, 136.0),
	"soil_1_center": Vector2(738.0, 126.0),
	"apple_tree": Vector2(636.0, 124.0),
	"mortar": Vector2(936.0, 132.0),
	"market_stall": Vector2(1022.0, 136.0),
	"stall_queue_0": Vector2(1008.0, 140.0),
	"stall_queue_1": Vector2(982.0, 141.0),
	"stall_queue_2": Vector2(956.0, 141.0),
	"stall_queue_3": Vector2(930.0, 141.0),
	"basket_2": Vector2(355.0, 132.0),
	"soil_2_center": Vector2(262.0, 124.0),
	"cauldron": Vector2(602.0, 132.0),
	"basket_3": Vector2(1455.0, 118.0),
	"soil_3_center": Vector2(1520.0, 112.0),
	"spawn_right": Vector2(1760.0, 118.0)
}

## Ordered Highway Gates (ensuring every character steps onto bridgeheads, bridge crowns,
## the Lotus Pond Wooden Footbridge, and the dry golden sand of Island 3 — zero water walking!)
const HIGHWAY_GATES: Array[Vector2] = [
	Vector2(130.0, 134.0),   # Left Landmark Hut Gate
	Vector2(355.0, 132.0),   # Island 2 (Ellinia) Basket / Clearing Gate
	Vector2(486.0, 136.0),   # Bridge 1 Left Bridgehead
	Vector2(540.0, 131.5),   # Bridge 1 Arch Crown
	Vector2(594.0, 138.0),   # Bridge 1 Right Bridgehead
	Vector2(675.0, 136.0),   # Island 1 (Henesys) Farm Gate
	Vector2(936.0, 134.0),   # Island 1 Mortar Workshop Gate
	Vector2(1022.0, 138.0),  # Island 1 Market Stall Gate
	Vector2(1082.0, 139.0),  # Lotus Pond Wooden Footbridge West Pier
	Vector2(1192.0, 134.5),  # Lotus Pond Wooden Footbridge Arch Crown
	Vector2(1302.0, 139.0),  # Lotus Pond Wooden Footbridge East Pier
	Vector2(1358.0, 125.0),  # Bridge 2 Arch Crown
	Vector2(1416.0, 120.0),  # Bridge 2 Right Bridgehead (Orbis Dry Sand)
	Vector2(1520.0, 116.0),  # Island 3 (Orbis) Farm Gate
	Vector2(1750.0, 118.0)   # Right Tiki Landmark Gate
]

func _ready() -> void:
	# Spawn Marker2D nodes for each named waypoint as required by PRD Section 3.2
	for k in named_points.keys():
		var m := Marker2D.new()
		m.name = "WP_" + String(k)
		m.position = named_points[k]
		add_child(m)

func get_named_pos(key: String) -> Vector2:
	return named_points.get(key, Vector2(1022.0, 136.0))

func compute_path(from_pos: Vector2, to_pos: Vector2) -> Array[Vector2]:
	var clean_target := constrain_to_walkable_surface(to_pos)
	var path: Array[Vector2] = []
	if clean_target.x > from_pos.x + 10.0:
		for g in HIGHWAY_GATES:
			if g.x > from_pos.x + 8.0 and g.x < clean_target.x - 8.0:
				path.append(g)
	elif clean_target.x < from_pos.x - 10.0:
		for i in range(HIGHWAY_GATES.size() - 1, -1, -1):
			var g := HIGHWAY_GATES[i]
			if g.x < from_pos.x - 8.0 and g.x > clean_target.x + 8.0:
				path.append(g)
	path.append(clean_target)
	return path

func constrain_to_walkable_surface(pos: Vector2) -> Vector2:
	var x := clampf(pos.x, 96.0, 1824.0)
	var y := pos.y
	if x < 486.0:
		y = clampf(y, 112.0, 136.0)
	elif x <= 594.0:
		var t := clampf((x - 486.0) / 108.0, 0.0, 1.0)
		y = lerpf(136.0, 138.0, t) - 5.0 * sin(t * PI)
	elif x < 1082.0:
		y = clampf(y, 112.0, 142.0)
	elif x <= 1302.0:
		var t := clampf((x - 1082.0) / 220.0, 0.0, 1.0)
		y = 139.0 - 4.5 * sin(t * PI)
	elif x <= 1416.0:
		var t := clampf((x - 1302.0) / 114.0, 0.0, 1.0)
		y = lerpf(139.0, 120.0, t) - 4.5 * sin(t * PI)
	else:
		y = clampf(y, 100.0, 122.0)
	return Vector2(x, y)
