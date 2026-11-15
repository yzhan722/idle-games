extends Node2D
class_name WaypointGraph
## Complete 3-Island Road, Dual Wooden Bridge & Building Dock Waypoint Graph (`src/world/WaypointGraph.gd`)
## Strictly enforces GEMINI.md Law 2.1 (`GROUND_Y = 124.0`) & Law 3.1 (1D Slot Coordinates):
## - Models all 3 islands' main roads (`island_2`, `island_1`, `island_3`),
## - Models both wooden bridges' (`bridge_wood`) west/arch/east endpoints and the Lotus Pond twin bridges,
## - Models dedicated loading/unloading dock nodes for every building (`soil_*_load`, `basket_*`, `mortar_in/out`, `cauldron_in/out`, `orbis_in/out`, `stall_drop`, `stall_queue_*`),
## - Provides weighted adjacency list & Dijkstra shortest-path queries for cross-island and intra-island navigation.

const GROUND_Y := 124.0

## Master Waypoint Coordinates along unified `GROUND_Y = 124.0`
const WAYPOINTS: Array[Vector2] = [
	Vector2(96.2, GROUND_Y),    # 0: Island 2 Left Hut (Ellinia West Spawn)
	Vector2(186.0, GROUND_Y),   # 1: Island 2 SoilPlot & Basket Dock
	Vector2(275.6, GROUND_Y),   # 2: Island 2 Cauldron Workshop Dock
	Vector2(365.7, GROUND_Y),   # 3: Island 2 Cloud Greenhouse Dock
	Vector2(459.4, GROUND_Y),   # 4: Island 2 Cloud Windmill Bakery Dock
	Vector2(492.0, GROUND_Y),   # 5: Bridge 1 West Endpoint (Ellinia -> Henesys)
	Vector2(542.0, GROUND_Y),   # 6: Bridge 1 Center Arch
	Vector2(586.0, GROUND_Y),   # 7: Bridge 1 East Endpoint
	Vector2(596.9, GROUND_Y),   # 8: Island 1 Apple Tree
	Vector2(683.4, GROUND_Y),   # 9: Island 1 SoilPlot & Basket Dock
	Vector2(770.7, GROUND_Y),   # 10: Island 1 Mushroom Cottage
	Vector2(849.8, GROUND_Y),   # 11: Island 1 Mortar Workshop Dock
	Vector2(926.9, GROUND_Y),   # 12: Island 1 Cloud Tea Pavilion Dock
	Vector2(1013.4, GROUND_Y),  # 13: Island 1 Market Stall Main Counter
	Vector2(1082.0, GROUND_Y),  # 14: Lotus Pond Bridge West
	Vector2(1192.0, GROUND_Y),  # 15: Lotus Pond Bridge Center Pier
	Vector2(1302.0, GROUND_Y),  # 16: Lotus Pond Bridge East
	Vector2(1358.0, GROUND_Y),  # 17: Bridge 2 Center Arch (Henesys -> Orbis Coast)
	Vector2(1414.0, GROUND_Y),  # 18: Bridge 2 East Endpoint (Orbis West Landing)
	Vector2(1445.5, GROUND_Y),  # 19: Island 3 Apple Tree
	Vector2(1535.2, GROUND_Y),  # 20: Island 3 SoilPlot & Basket Dock
	Vector2(1624.7, GROUND_Y),  # 21: Island 3 Dual Linked Workshop Dock
	Vector2(1714.7, GROUND_Y),  # 22: Island 3 Cloud-Sea Hot-Spring Inn Dock
	Vector2(1805.9, GROUND_Y)   # 23: Island 3 Right Tiki Landmark (VIP East Spawn)
]

## Named Waypoint Node Index Lookup
const NAMED_WAYPOINTS: Dictionary = {
	"spawn_left": 0,
	"left_hut": 0,
	"soil_2": 1,
	"basket_2": 1,
	"cauldron": 2,
	"greenhouse": 3,
	"windmill_bakery": 4,
	"bridge_1_west": 5,
	"bridge_1_arch": 6,
	"bridge_1_east": 7,
	"apple_tree": 8,
	"soil_1": 9,
	"basket_1": 9,
	"cottage": 10,
	"mortar": 11,
	"tea_pavilion": 12,
	"market_stall": 13,
	"pond_west": 14,
	"pond_center": 15,
	"pond_east": 16,
	"bridge_2_arch": 17,
	"bridge_2_east": 18,
	"apple_tree_3": 19,
	"soil_3": 20,
	"basket_3": 20,
	"orbis_linked": 21,
	"hotspring_inn": 22,
	"spawn_right": 23,
	"right_tiki": 23
}

## Independent Building Loading / Unloading Dock Offsets (`x` offset relative to building waypoint)
const BUILDING_DOCKS: Dictionary = {
	"soil_1_slot_0": {"wp": 9, "dx": -12.0},
	"soil_1_slot_1": {"wp": 9, "dx": 12.0},
	"basket_1_pickup": {"wp": 9, "dx": 42.0},
	"mortar_input": {"wp": 11, "dx": -38.0},
	"mortar_chef": {"wp": 11, "dx": -18.0},
	"mortar_output": {"wp": 11, "dx": 24.0},
	"tea_pavilion_dock": {"wp": 12, "dx": 0.0},
	"stall_restock": {"wp": 13, "dx": -16.0},
	"stall_manager": {"wp": 13, "dx": 4.0},
	"stall_checkout": {"wp": 13, "dx": 28.0},
	"soil_2_slot_0": {"wp": 1, "dx": -10.0},
	"soil_2_slot_1": {"wp": 1, "dx": 10.0},
	"basket_2_pickup": {"wp": 1, "dx": 36.0},
	"cauldron_input": {"wp": 2, "dx": -42.0},
	"cauldron_chef": {"wp": 2, "dx": -18.0},
	"cauldron_output": {"wp": 2, "dx": 24.0},
	"greenhouse_dock": {"wp": 3, "dx": 0.0},
	"windmill_bakery_dock": {"wp": 4, "dx": 0.0},
	"soil_3_slot_0": {"wp": 20, "dx": -10.0},
	"soil_3_slot_1": {"wp": 20, "dx": 10.0},
	"basket_3_pickup": {"wp": 20, "dx": 38.0},
	"orbis_input": {"wp": 21, "dx": -42.0},
	"orbis_chef": {"wp": 21, "dx": -18.0},
	"orbis_chef_fox": {"wp": 21, "dx": -18.0},
	"orbis_chef_penguin": {"wp": 21, "dx": 18.0},
	"orbis_output": {"wp": 21, "dx": 36.0},
	"hotspring_dock": {"wp": 22, "dx": 0.0}
}

## Weighted Graph Adjacency List (`node_idx -> Array[{to: int, cost: float, bridge_id: int}]`)
var _adjacency: Dictionary = {}

func _ready() -> void:
	_build_graph_topology()

func _init() -> void:
	_build_graph_topology()

func _build_graph_topology() -> void:
	_adjacency.clear()
	for i in range(WAYPOINTS.size()):
		_adjacency[i] = []

	for i in range(WAYPOINTS.size() - 1):
		var a := WAYPOINTS[i]
		var b := WAYPOINTS[i + 1]
		var dist := absf(b.x - a.x)
		var bridge_id := 0
		if i >= 4 and i <= 7:
			bridge_id = 1 # Wooden Bridge 1 (Island 2 <-> Island 1)
		elif i >= 16 and i <= 18:
			bridge_id = 2 # Wooden Bridge 2 (Island 1 <-> Island 3)
		_adjacency[i].append({"to": i + 1, "cost": dist, "bridge_id": bridge_id})
		_adjacency[i + 1].append({"to": i, "cost": dist, "bridge_id": bridge_id})

func get_named_pos(key: String) -> Vector2:
	var idx: int = int(NAMED_WAYPOINTS.get(key, 10))
	return WAYPOINTS[clampi(idx, 0, WAYPOINTS.size() - 1)]

func get_dock_pos(dock_key: String) -> Vector2:
	if BUILDING_DOCKS.has(dock_key):
		var d: Dictionary = BUILDING_DOCKS[dock_key]
		var wp_idx := clampi(int(d.get("wp", 10)), 0, WAYPOINTS.size() - 1)
		var dx := float(d.get("dx", 0.0))
		return Vector2(WAYPOINTS[wp_idx].x + dx, GROUND_Y)
	return get_named_pos(dock_key)

func get_island_for_x(x_coord: float) -> int:
	if x_coord < 538.0:
		return 2
	elif x_coord > 1358.0:
		return 3
	return 1

func is_on_wooden_bridge(x_coord: float) -> bool:
	return (x_coord >= 486.0 and x_coord <= 594.0) or (x_coord >= 1082.0 and x_coord <= 1416.0)

func get_nearest_waypoint_index(pos: Vector2) -> int:
	var best_idx := 0
	var best_d := 1e9
	for i in range(WAYPOINTS.size()):
		var d := absf(pos.x - WAYPOINTS[i].x)
		if d < best_d:
			best_d = d
			best_idx = i
	return best_idx

## Dijkstra Shortest-Path Solver across the 3-Island & Dual-Bridge Graph
func find_shortest_node_path(start_idx: int, end_idx: int) -> Array[int]:
	var n := WAYPOINTS.size()
	var s := clampi(start_idx, 0, n - 1)
	var e := clampi(end_idx, 0, n - 1)
	if s == e:
		return [s]

	if _adjacency.is_empty():
		_build_graph_topology()

	var dist: Array[float] = []
	var prev: Array[int] = []
	var visited: Array[bool] = []
	for _i in range(n):
		dist.append(1e12)
		prev.append(-1)
		visited.append(false)
	dist[s] = 0.0

	for _step in range(n):
		var u := -1
		var best := 1e12
		for i in range(n):
			if not visited[i] and dist[i] < best:
				best = dist[i]
				u = i
		if u == -1 or u == e:
			break
		visited[u] = true
		var edges: Array = _adjacency.get(u, [])
		for edge in edges:
			var v := int(edge["to"])
			var w := float(edge["cost"])
			if not visited[v] and dist[u] + w < dist[v]:
				dist[v] = dist[u] + w
				prev[v] = u

	var node_seq: Array[int] = []
	var cur := e
	while cur != -1:
		node_seq.push_front(cur)
		if cur == s:
			break
		cur = prev[cur]
	if node_seq.is_empty():
		node_seq.append(e)
	return node_seq

func compute_path(from_pos: Vector2, to_pos: Vector2) -> Array[Vector2]:
	var start_pt := constrain_to_walkable_surface(from_pos)
	var final_pt := constrain_to_walkable_surface(to_pos)
	if absf(final_pt.x - start_pt.x) <= 1.5:
		return [final_pt]
	var min_x := minf(start_pt.x, final_pt.x) + 1.0
	var max_x := maxf(start_pt.x, final_pt.x) - 1.0
	var s_idx := get_nearest_waypoint_index(start_pt)
	var e_idx := get_nearest_waypoint_index(final_pt)
	var node_indices := find_shortest_node_path(s_idx, e_idx)
	var path: Array[Vector2] = []
	for idx in node_indices:
		var wp := WAYPOINTS[idx]
		# Strictly filter to intermediate waypoints between start_pt.x and final_pt.x to eliminate dock overshoot/backtracking
		if wp.x >= min_x and wp.x <= max_x:
			if path.is_empty() or absf(path[path.size() - 1].x - wp.x) > 1.0:
				path.append(wp)
	if path.is_empty() or absf(path[path.size() - 1].x - final_pt.x) > 1.0:
		path.append(final_pt)
	else:
		path[path.size() - 1] = final_pt
	return path

func compute_dock_to_dock_path(from_pos: Vector2, target_dock_key: String) -> Array[Vector2]:
	return compute_path(from_pos, get_dock_pos(target_dock_key))

func get_path_total_length(path: Array[Vector2]) -> float:
	if path.size() <= 1:
		return 0.0
	var total := 0.0
	for i in range(path.size() - 1):
		total += path[i].distance_to(path[i + 1])
	return total

func constrain_to_walkable_surface(pos: Vector2) -> Vector2:
	return Vector2(clampf(pos.x, 90.0, 1812.0), GROUND_Y)
